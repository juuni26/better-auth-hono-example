import { queryOptions } from "@tanstack/react-query";
import type { Transaction } from "@worker/transactions";
import type { PlanId } from "../../shared/plans";

export type { Transaction };

export interface Me {
  subscription: {
    plan: PlanId;
    status: "active" | "trialing" | "past_due" | "canceled" | "incomplete";
    stripeCustomerId: string | null;
    currentPeriodEnd: string | null;
  } | null;
  paymentsMode: "live" | "demo";
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

export async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `${url} → ${res.status}`);
  return data;
}

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: () => getJson<Me>("/api/me"),
  staleTime: 30_000,
});

export const transactionsQuery = queryOptions({
  queryKey: ["transactions"],
  queryFn: () => getJson<{ transactions: Transaction[] }>("/api/transactions"),
  staleTime: 60_000,
  select: (d) => d.transactions,
});

export const balanceSeriesQuery = queryOptions({
  queryKey: ["balance-series"],
  queryFn: () => getJson<{ points: { date: string; balance: number }[] }>("/api/balance-series"),
  staleTime: 60_000,
  select: (d) => d.points,
});

export interface Vault {
  id: string;
  name: string;
  balance: number;
  createdAt: string;
}

export const vaultsQuery = queryOptions({
  queryKey: ["vaults"],
  queryFn: () => getJson<{ vaults: Vault[] }>("/api/vaults"),
  staleTime: 60_000,
  select: (d) => d.vaults,
});
