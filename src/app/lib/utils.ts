import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(cents: number, opts: { sign?: boolean } = {}): string {
  const abs = Math.abs(cents) / 100;
  const formatted = abs.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
  if (!opts.sign) return formatted;
  return `${cents < 0 ? "−" : "+"}${formatted}`;
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
