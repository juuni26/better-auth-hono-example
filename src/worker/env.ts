export interface Env {
  DB: D1Database;
  /** Public origin of the app, e.g. https://vellum.example.com */
  APP_URL: string;
  /** Secret — openssl rand -base64 32. Set in .dev.vars / wrangler secret. */
  BETTER_AUTH_SECRET: string;
  /** Optional — when absent the app runs in payment "demo mode". */
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_PLUS?: string;
  STRIPE_PRICE_METAL?: string;
}

export const stripeConfigured = (env: Env): boolean =>
  Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
