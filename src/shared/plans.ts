/** Plan catalog shared by the worker (checkout/webhooks) and the app (UI). */

export type PlanId = "standard" | "plus" | "metal";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  priceMonthly: number; // USD
  /** FILL-ME: map to your real Stripe Price ids (see HANDOFF.md). */
  stripePriceIdEnvKey: string;
  features: string[];
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "standard",
    name: "Standard",
    tagline: "Everyday money, done properly",
    priceMonthly: 0,
    stripePriceIdEnvKey: "STRIPE_PRICE_STANDARD",
    features: [
      "Free checking & instant transfers",
      "Round-up savings vaults",
      "Virtual card in seconds",
      "2-day early paycheck",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    tagline: "For money that works while you sleep",
    priceMonthly: 9,
    stripePriceIdEnvKey: "STRIPE_PRICE_PLUS",
    highlight: true,
    features: [
      "Everything in Standard",
      "4.60% APY on savings",
      "1.5% cashback on all cards",
      "Priority support, 24/7 humans",
      "Fee-free withdrawals worldwide",
    ],
  },
  {
    id: "metal",
    name: "Metal",
    tagline: "The full private-banking treatment",
    priceMonthly: 19,
    stripePriceIdEnvKey: "STRIPE_PRICE_METAL",
    features: [
      "Everything in Plus",
      "18g brushed-steel card",
      "Dedicated account concierge",
      "Airport lounge access",
      "Custom vault yields & tax reports",
    ],
  },
];

export const planById = (id: string | null | undefined): Plan | undefined =>
  PLANS.find((p) => p.id === id);
