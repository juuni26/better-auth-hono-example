import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/schema";
import type { Env } from "./env";

/**
 * better-auth must be created per-request on Workers because the D1 binding
 * only exists on the request's `env`. Construction is cheap (no I/O).
 */
export function createAuth(env: Env) {
  const db = drizzle(env.DB, { schema });

  return betterAuth({
    baseURL: env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    trustedOrigins: [env.APP_URL, "http://localhost:5173","http://localhost:5174", "http://localhost:8787"],
    user: {
      deleteUser: { enabled: true },
      changeEmail: { enabled: true },
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
    advanced: {
      database: {
        // D1 has no RETURNING-dependent id generation; let better-auth make ids.
        generateId: () => crypto.randomUUID(),
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
