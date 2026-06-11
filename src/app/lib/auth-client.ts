import { createAuthClient } from "better-auth/react";

/** Same-origin: the Hono worker serves /api/auth/* next to the SPA. */
export const authClient = createAuthClient();

export const { useSession, signIn, signUp, signOut } = authClient;
