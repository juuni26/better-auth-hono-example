import { drizzle } from "drizzle-orm/d1";
import { eq, desc, asc } from "drizzle-orm";
import * as schema from "./db/schema";

/**
 * Real-time ledger. Demo data is seeded on first run so the dashboard is
 * populated, but subsequent "Send" or "Top-up" actions persist to D1.
 */

export interface Transaction {
  id: string;
  merchant: string;
  category: TxCategory;
  amount: number; // cents; negative = spend
  currency: string;
  date: string; // ISO
  status: "posted" | "pending";
}

export type TxCategory =
  | "groceries"
  | "dining"
  | "transport"
  | "subscriptions"
  | "shopping"
  | "travel"
  | "income"
  | "transfer"
  | "utilities";

const MERCHANTS: Array<[string, TxCategory, number, number]> = [
  ["Trader Joe's", "groceries", 18, 140],
  ["Whole Foods Market", "groceries", 25, 190],
  ["Blue Bottle Coffee", "dining", 5, 18],
  ["Sweetgreen", "dining", 12, 26],
  ["Tartine Bakery", "dining", 8, 34],
  ["Uber", "transport", 9, 48],
  ["Lyft", "transport", 8, 42],
  ["Clipper BART", "transport", 3, 12],
  ["Netflix", "subscriptions", 15, 23],
  ["Spotify", "subscriptions", 11, 12],
  ["Notion", "subscriptions", 10, 10],
  ["iCloud+", "subscriptions", 3, 10],
  ["Amazon", "shopping", 14, 220],
  ["Uniqlo", "shopping", 30, 160],
  ["REI Co-op", "shopping", 45, 320],
  ["United Airlines", "travel", 180, 720],
  ["Airbnb", "travel", 140, 560],
  ["PG&E", "utilities", 60, 180],
  ["Verizon", "utilities", 65, 95],
];

const INCOME: Array<[string, number, number]> = [
  ["Acme Corp — Payroll", 2400, 3400],
  ["Side project payout", 120, 900],
  ["Interest earned", 8, 42],
];

/** Mulberry32 — tiny seeded PRNG, stable across runs. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

/** Fetch transactions from DB, seeding with demo data if empty. */
export async function getTransactions(db: DrizzleDb, userId: string): Promise<Transaction[]> {
  const existing = await db.query.transaction.findMany({
    where: eq(schema.transaction.userId, userId),
    orderBy: [desc(schema.transaction.date)],
  });

  if (existing.length > 0) {
    return existing.map((t) => ({
      ...t,
      date: t.date.toISOString(),
      status: t.status as "posted" | "pending",
      category: t.category as TxCategory,
    }));
  }

  // Seed with 120 days of demo data
  const rand = mulberry32(hashSeed(userId));
  const inserts: (typeof schema.transaction.$inferInsert)[] = [];
  let cursor = Date.now() - 1000 * 60 * 60 * 4;

  for (let i = 0; i < 60; i++) {
    const isPayroll = i % 18 === 8;
    const isIncome = isPayroll || rand() < 0.035;
    let merchant: string;
    let category: TxCategory;
    let dollars: number;

    if (isPayroll) {
      const [name, min, max] = INCOME[0];
      merchant = name;
      category = "income";
      dollars = min + rand() * (max - min);
    } else if (isIncome) {
      const [name, min, max] = INCOME[1 + Math.floor(rand() * (INCOME.length - 1))];
      merchant = name;
      category = "income";
      dollars = min + rand() * (max - min);
    } else {
      const [name, cat, min, max] = MERCHANTS[Math.floor(rand() * MERCHANTS.length)];
      merchant = name;
      category = cat;
      dollars = min + rand() * (max - min);
    }

    const amount = Math.round(dollars * 100) * (isIncome ? 1 : -1);
    const date = new Date(cursor);
    inserts.push({
      id: crypto.randomUUID(),
      userId,
      merchant,
      category,
      amount,
      currency: "USD",
      date,
      status: i < 3 ? "pending" : "posted",
      createdAt: new Date(),
    });
    cursor -= (2 + rand() * 48) * 60 * 60 * 1000;
  }

  // Opening deposit anchors the ledger so the running balance never dips
  // below zero — an overdrawn chart is a terrible first impression.
  inserts.push({
    id: crypto.randomUUID(),
    userId,
    merchant: "Opening deposit",
    category: "transfer",
    amount: 1_842_000, // $18,420.00
    currency: "USD",
    date: new Date(cursor - 12 * 60 * 60 * 1000),
    status: "posted",
    createdAt: new Date(),
  });

  // Batch insert — D1 has a 100 bound-parameter limit (9 columns × 10 = 90, safe)
  for (let i = 0; i < inserts.length; i += 10) {
    await db.insert(schema.transaction).values(inserts.slice(i, i + 10));
  }

  return inserts.map((t) => ({
    ...t,
    currency: t.currency ?? "USD",
    date: t.date.toISOString(),
    status: t.status as "posted" | "pending",
    category: t.category as TxCategory,
  }));
}

/** Daily balance series derived from the real DB ledger. */
export async function getBalanceSeries(
  db: DrizzleDb,
  userId: string,
): Promise<{ date: string; balance: number }[]> {
  const txs = await db.query.transaction.findMany({
    where: eq(schema.transaction.userId, userId),
    orderBy: [asc(schema.transaction.date)],
  });

  if (txs.length === 0) {
    // If empty, trigger a seed by calling getTransactions
    await getTransactions(db, userId);
    return getBalanceSeries(db, userId);
  }

  const start = 0; 
  let running = start;
  const points: { date: string; balance: number }[] = [];
  for (const tx of txs) {
    running += tx.amount;
    points.push({ date: tx.date.toISOString(), balance: running });
  }
  return points;
}
