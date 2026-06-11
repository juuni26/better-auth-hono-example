import { queryOptions } from "@tanstack/react-query";
import { authClient } from "./auth-client";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  createdAt: string | Date;
}

/**
 * Session as a query so route guards (`beforeLoad`) and components share one
 * cached fetch instead of hitting /api/auth/get-session per navigation.
 */
export const sessionQuery = queryOptions({
  queryKey: ["session"],
  queryFn: async () => {
    const { data } = await authClient.getSession();
    return data; // null when signed out
  },
  staleTime: 60_000,
});
