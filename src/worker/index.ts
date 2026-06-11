import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, desc } from "drizzle-orm";
import { createAuth } from "./auth";
import { stripeConfigured, type Env } from "./env";
import * as schema from "./db/schema";
import {
  createCheckoutSession,
  createPortalSession,
  createTopupSession,
  handleStripeWebhook,
  upsertSubscription,
} from "./stripe";
import { getBalanceSeries, getTransactions } from "./transactions";
import { planById, type PlanId } from "../shared/plans";

type SessionUser = { id: string; email: string; name: string };

const app = new Hono<{
  Bindings: Env;
  Variables: { user: SessionUser };
}>();

/* better-auth owns everything under /api/auth/* */
app.on(["GET", "POST"], "/api/auth/*", (c) => createAuth(c.env).handler(c.req.raw));

/* Stripe webhook — raw body required, no auth (verified by signature). */
app.post("/api/stripe/webhook", (c) => {
  if (!stripeConfigured(c.env)) return c.json({ error: "Stripe not configured" }, 501);
  return handleStripeWebhook(c.env, c.req.raw);
});

/* Everything below requires a session. */
app.use("/api/*", async (c, next) => {
  const session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  c.set("user", session.user as SessionUser);
  await next();
});

/** Bootstrap payload: subscription + payment mode. */
app.get("/api/me", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const sub = await db.query.subscription.findFirst({
    where: eq(schema.subscription.userId, c.get("user").id),
  });
  return c.json({
    subscription: sub ?? null,
    paymentsMode: stripeConfigured(c.env) ? ("live" as const) : ("demo" as const),
  });
});

/**
 * Start a subscription.
 * - Free plan → activate immediately.
 * - Paid plan + Stripe configured → Checkout Session redirect URL.
 * - Paid plan, no Stripe keys → demo mode: simulate success server-side.
 */
app.post("/api/checkout", async (c) => {
  const body = await c.req.json<{ plan?: string }>().catch(() => ({ plan: undefined }));
  const plan = planById(body.plan);
  if (!plan) return c.json({ error: "Unknown plan" }, 400);
  const user = c.get("user");
  const db = drizzle(c.env.DB, { schema });

  if (plan.priceMonthly === 0) {
    await upsertSubscription(db, { userId: user.id, plan: plan.id, status: "active" });
    return c.json({ activated: true as const });
  }

  if (stripeConfigured(c.env)) {
    const { url } = await createCheckoutSession(c.env, user, plan.id as PlanId);
    return c.json({ url });
  }

  // Demo mode — no keys present. Mirrors what the webhook would write.
  await upsertSubscription(db, {
    userId: user.id,
    plan: plan.id,
    status: "active",
    stripeCustomerId: `cus_demo_${user.id.slice(0, 8)}`,
    stripeSubscriptionId: `sub_demo_${user.id.slice(0, 8)}`,
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  return c.json({ activated: true as const, demo: true as const });
});

/** Stripe billing portal (live mode) or demo cancel/downgrade. */
app.post("/api/billing/portal", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const sub = await db.query.subscription.findFirst({
    where: eq(schema.subscription.userId, c.get("user").id),
  });
  if (!sub?.stripeCustomerId || !stripeConfigured(c.env)) {
    return c.json({ error: "No Stripe customer for this account" }, 400);
  }
  const { url } = await createPortalSession(c.env, sub.stripeCustomerId);
  return c.json({ url });
});

app.post("/api/billing/cancel", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const user = c.get("user");
  const sub = await db.query.subscription.findFirst({
    where: eq(schema.subscription.userId, user.id),
  });
  if (!sub) return c.json({ error: "No subscription" }, 400);
  if (stripeConfigured(c.env) && sub.stripeSubscriptionId?.startsWith("sub_") && !sub.stripeSubscriptionId.includes("demo")) {
    // Live mode: cancellation flows through the portal / webhook instead.
    return c.json({ error: "Use the billing portal to cancel" }, 400);
  }
  await db
    .update(schema.subscription)
    .set({ status: "canceled", updatedAt: new Date() })
    .where(eq(schema.subscription.userId, user.id));
  return c.json({ canceled: true });
});

app.get("/api/transactions", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const txs = await getTransactions(db, c.get("user").id);
  return c.json({ transactions: txs });
});

app.get("/api/balance-series", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const points = await getBalanceSeries(db, c.get("user").id);
  return c.json({ points });
});

/** Clamp-and-validate a cents amount from the client. */
const parseCents = (value: unknown, max: number): number | null => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const cents = Math.round(Math.abs(n));
  if (cents <= 0 || cents > max) return null;
  return cents;
};

app.post("/api/transactions/send", async (c) => {
  const body = await c.req.json<{ recipient?: unknown; amount?: unknown }>().catch(() => ({}) as never);
  const recipient = typeof body.recipient === "string" ? body.recipient.trim().slice(0, 60) : "";
  const cents = parseCents(body.amount, 2_500_000); // $25k per-transfer cap
  if (!recipient) return c.json({ error: "Recipient is required" }, 400);
  if (cents === null) return c.json({ error: "Enter a valid amount" }, 400);

  const db = drizzle(c.env.DB, { schema });
  const user = c.get("user");

  await db.insert(schema.transaction).values({
    id: crypto.randomUUID(),
    userId: user.id,
    merchant: recipient,
    category: "transfer",
    amount: -cents,
    currency: "USD",
    date: new Date(),
    status: "posted",
    createdAt: new Date(),
  });

  return c.json({ success: true });
});

app.post("/api/transactions/topup", async (c) => {
  const body = await c.req.json<{ amount?: unknown }>().catch(() => ({}) as never);
  const cents = parseCents(body.amount, 10_000_000); // $100k cap
  if (cents === null) return c.json({ error: "Enter a valid amount" }, 400);
  const db = drizzle(c.env.DB, { schema });
  const user = c.get("user");

  if (stripeConfigured(c.env)) {
    const { url } = await createTopupSession(c.env, user, cents);
    return c.json({ url });
  }

  // Demo mode
  await db.insert(schema.transaction).values({
    id: crypto.randomUUID(),
    userId: user.id,
    merchant: "Stripe Top-up",
    category: "income",
    amount: cents,
    currency: "USD",
    date: new Date(),
    status: "posted",
    createdAt: new Date(),
  });

  return c.json({ success: true });
});

app.get("/api/vaults", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const vaults = await db.query.vault.findMany({
    where: eq(schema.vault.userId, c.get("user").id),
    orderBy: [desc(schema.vault.createdAt)],
  });
  return c.json({ vaults });
});

app.post("/api/vaults", async (c) => {
  const body = await c.req.json<{ name?: unknown }>().catch(() => ({}) as never);
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";
  if (!name) return c.json({ error: "Give your vault a name" }, 400);
  const db = drizzle(c.env.DB, { schema });
  const user = c.get("user");

  const newVault = {
    id: crypto.randomUUID(),
    userId: user.id,
    name,
    balance: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(schema.vault).values(newVault);
  return c.json(newVault);
});

export default app;
