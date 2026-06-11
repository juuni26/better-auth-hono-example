import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Laptop, LogOut, Smartphone } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { initialsOf } from "@/lib/utils";

export const Route = createFileRoute("/_app/account")({
  component: AccountPage,
});

function AccountPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [name, setName] = useState(user.name);

  const sessions = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data, error } = await authClient.listSessions();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const currentToken = useQuery({
    queryKey: ["session"],
    queryFn: async () => (await authClient.getSession()).data,
    staleTime: 60_000,
    select: (d) => d?.session.token,
  });

  const saveName = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Name can't be empty.");
      const { error } = await authClient.updateUser({ name: trimmed });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      toast.success("Name updated.");
    },
    onError: (e) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async (token: string) => {
      const { error } = await authClient.revokeSession({ token });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session revoked.");
    },
    onError: (e) => toast.error(e.message),
  });

  const revokeOthers = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.revokeOtherSessions();
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Signed out everywhere else.");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-6"
    >
      <header>
        <h1 className="font-display text-3xl">Account</h1>
        <p className="mt-1.5 text-sm text-ivory-faint">Who you are, and where you're signed in.</p>
      </header>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>This is how Vellum addresses you.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarFallback className="text-base">{initialsOf(user.name) || "V"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{user.name}</p>
              <p className="truncate text-sm text-ivory-faint">{user.email}</p>
            </div>
          </div>

          <Separator />

          <form
            className="flex flex-col gap-5 sm:max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              saveName.mutate();
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="account-name">Full name</Label>
              <Input
                id="account-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="account-email">Email</Label>
              <Input id="account-email" value={user.email} disabled />
              <p className="text-xs text-ivory-faint">
                Email changes require verification — wired up when your mail provider lands.
              </p>
            </div>
            <Button
              type="submit"
              loading={saveName.isPending}
              disabled={name.trim() === user.name}
              className="self-start"
            >
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Active sessions</CardTitle>
            <CardDescription>Every device currently holding a key to your account.</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => revokeOthers.mutate()}
            loading={revokeOthers.isPending}
          >
            <LogOut /> Sign out others
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {sessions.isPending &&
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          {sessions.data?.map((s) => {
            const isCurrent = s.token === currentToken.data;
            const ua = s.userAgent ?? "";
            const isMobile = /mobile|iphone|android/i.test(ua);
            const DeviceIcon = isMobile ? Smartphone : Laptop;
            const browser =
              ua.match(/(Firefox|Edg|Chrome|Safari)/)?.[1]?.replace("Edg", "Edge") ?? "Unknown browser";
            return (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-ink-850/70 p-4"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-ink-800">
                    <DeviceIcon className="size-4 text-ivory-dim" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {browser}
                      {isCurrent && <Badge variant="positive">this device</Badge>}
                    </p>
                    <p className="truncate text-xs text-ivory-faint">
                      {s.ipAddress || "unknown IP"} · since{" "}
                      {new Date(s.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                {!isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revoke.mutate(s.token)}
                    disabled={revoke.isPending}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}
