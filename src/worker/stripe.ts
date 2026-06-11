import Stripe from "stripe";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema";
import type { Env } from "./env";
import type { PlanId } from "../shared/plans";

type SubStatus = (typeof schema.subscription.$inferInsert)["status"];

export function createStripe(env: Env): Stripe {
  return new Stripe(env.STRIPE_SECRET_KEY!, {
    // @ts-ignore - Using the latest version from June 2026
    apiVersion: "2026-05-27.dahlia",
    // Workers runtime: fetch-based HTTP client + WebCrypto for signatures.
    httpClient: Stripe.createFetchHttpClient(),
  });
}

const priceIdFor = (env: Env, plan: PlanId): string | undefined => {
  if (plan === "plus") return env.STRIPE_PRICE_PLUS;
  if (plan === "metal") return env.STRIPE_PRICE_METAL;
  return undefined; // standard is free — no Stripe price
};

/** Create a Stripe Checkout Session for a paid plan. */
export async function createCheckoutSession(
  env: Env,
  user: { id: string; email: string },
  plan: PlanId,
): Promise<{ url: string }> {
  const stripe = createStripe(env);
  const price = priceIdFor(env, plan);
  if (!price) throw new Error(`No Stripe price configured for plan "${plan}"`);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: { userId: user.id, plan },
    subscription_data: { metadata: { userId: user.id, plan } },
    success_url: `${env.APP_URL}/dashboard?checkout=success`,
    cancel_url: `${env.APP_URL}/onboarding?checkout=canceled`,
  }).catch((err) => {
    if (err.message?.includes("No such price") && price.startsWith("prod_")) {
      throw new Error(
        `Configuration Error: You provided a Product ID ('${price}') instead of a Price ID. ` +
        `Please go to your Stripe Dashboard, open the product, and copy the 'price_...' ID (e.g., price_123) into your .dev.vars.`
      );
    }
    throw err;
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url };
}

/** Create a Stripe Checkout Session for a one-time top-up. */
export async function createTopupSession(
  env: Env,
  user: { id: string; email: string },
  amountCents: number,
): Promise<{ url: string }> {
  const stripe = createStripe(env);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Vellum Top-up",
            description: "Funding your Vellum account",
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: { userId: user.id, type: "topup", amount: String(amountCents) },
    success_url: `${env.APP_URL}/dashboard?checkout=success`,
    cancel_url: `${env.APP_URL}/dashboard?checkout=canceled`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url };
}

/** Stripe-hosted billing portal for managing/canceling the subscription. */
export async function createPortalSession(env: Env, stripeCustomerId: string): Promise<{ url: string }> {
  const stripe = createStripe(env);
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${env.APP_URL}/billing`,
  });
  return { url: session.url };
}

/* ------------------------------------------------------------------ */
/* Webhook                                                             */
/* ------------------------------------------------------------------ */

/**
 * Verify + process a Stripe webhook.
 *
 * Signature: `constructEventAsync` with the SubtleCrypto provider — the sync
 * `constructEvent` relies on Node crypto and fails on Workers.
 *
 * Idempotency: every event id is inserted into `stripe_event` first; a
 * conflict means we already processed it (Stripe retries + at-least-once
 * delivery), so we ack with 200 and skip side effects.
 */
export async function handleStripeWebhook(env: Env, request: Request): Promise<Response> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing stripe-signature", { status: 400 });

  const payload = await request.text();
  const stripe = createStripe(env);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET!,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const db = drizzle(env.DB, { schema });

  // Idempotency guard — first writer wins, replays no-op.
  const inserted = await db
    .insert(schema.stripeEvent)
    .values({ id: event.id, type: event.type, processedAt: new Date() })
    .onConflictDoNothing()
    .returning({ id: schema.stripeEvent.id });
  if (inserted.length === 0) {
    return Response.json({ received: true, duplicate: true });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.userId ?? session.client_reference_id;
      if (!userId) break;

      if (session.mode === "subscription") {
        const plan = (session.metadata?.plan ?? "plus") as PlanId;
        await upsertSubscription(db, {
          userId,
          plan,
          status: "active",
          stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
          stripeSubscriptionId:
            typeof session.subscription === "string" ? session.subscription : null,
        });
      } else if (session.mode === "payment" && session.metadata?.type === "topup") {
        const amount = parseInt(session.metadata.amount ?? "0", 10);
        await db.insert(schema.transaction).values({
          id: crypto.randomUUID(),
          userId,
          merchant: "Stripe Top-up",
          category: "income",
          amount,
          currency: "USD",
          date: new Date(),
          status: "posted",
          createdAt: new Date(),
        });
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const userId = sub.metadata?.userId;
      if (userId) {
        const status: SubStatus =
          event.type === "customer.subscription.deleted"
            ? "canceled"
            : sub.status === "active"
              ? "active"
              : sub.status === "trialing"
                ? "trialing"
                : sub.status === "past_due"
                  ? "past_due"
                  : "incomplete";
        const periodEnd = sub.items.data[0]?.current_period_end;
        await db
          .update(schema.subscription)
          .set({
            status,
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
            updatedAt: new Date(),
          })
          .where(eq(schema.subscription.userId, userId));
      }
      break;
    }
    default:
      // Acknowledge unhandled event types so Stripe stops retrying them.
      break;
  }

  return Response.json({ received: true });
}

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

export async function upsertSubscription(
  db: DrizzleDb,
  values: {
    userId: string;
    plan: PlanId;
    status: SubStatus;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    currentPeriodEnd?: Date | null;
  },
) {
  const now = new Date();
  await db
    .insert(schema.subscription)
    .values({
      id: crypto.randomUUID(),
      userId: values.userId,
      plan: values.plan,
      status: values.status,
      stripeCustomerId: values.stripeCustomerId ?? null,
      stripeSubscriptionId: values.stripeSubscriptionId ?? null,
      currentPeriodEnd: values.currentPeriodEnd ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.subscription.userId,
      set: {
        plan: values.plan,
        status: values.status,
        ...(values.stripeCustomerId !== undefined && { stripeCustomerId: values.stripeCustomerId }),
        ...(values.stripeSubscriptionId !== undefined && {
          stripeSubscriptionId: values.stripeSubscriptionId,
        }),
        ...(values.currentPeriodEnd !== undefined && { currentPeriodEnd: values.currentPeriodEnd }),
        updatedAt: now,
      },
    });
}
