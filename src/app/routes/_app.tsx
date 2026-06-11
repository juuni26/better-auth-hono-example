import { Suspense } from "react";
import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  LayoutGrid,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";
import { sessionQuery } from "@/lib/session";
import { meQuery } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { Wordmark, DemoTag, VellumMark } from "@/components/brand";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, initialsOf } from "@/lib/utils";
import { planById } from "../../shared/plans";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery);
    if (!session?.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    // First-run users go pick a plan before they see the app.
    let me = await context.queryClient.ensureQueryData(meQuery);
    // Returning from hosted Stripe Checkout the redirect can outrun the
    // webhook by a few seconds — poll briefly before concluding "no plan".
    const checkoutSuccess =
      (location.search as { checkout?: string }).checkout === "success";
    if (!me.subscription && checkoutSuccess) {
      for (let i = 0; i < 5 && !me.subscription; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        me = await context.queryClient.fetchQuery({ ...meQuery, staleTime: 0 });
      }
    }
    if (!me.subscription && location.pathname !== "/onboarding") {
      throw redirect({ to: "/onboarding" });
    }
    return { user: session.user };
  },
  component: AppShell,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/account", label: "Account", icon: UserRound },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function AppShell() {
  const { user } = Route.useRouteContext();
  const { data: me } = useQuery(meQuery);
  const plan = planById(me?.subscription?.plan);

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 flex-col border-r border-border bg-ink-900/40 px-4 py-6 md:flex">
        <div className="flex items-center justify-between pl-1">
          <Wordmark to="/dashboard" />
        </div>
        <nav className="mt-10 flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-ivory-dim transition-colors hover:bg-ink-800/70 hover:text-foreground"
              activeProps={{ className: "bg-ink-800/90 !text-gold-300" }}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gold-500 transition-all duration-300",
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-40",
                    )}
                  />
                  <Icon className="size-[18px]" />
                  {label}
                </>
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-4">
          {plan && (
            <div className="rounded-md border border-border bg-ink-850 p-3.5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-ivory-faint">Your plan</p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="font-display text-base text-gold-300">{plan.name}</span>
                <Badge variant={me?.subscription?.status === "active" ? "positive" : "destructive"}>
                  {me?.subscription?.status}
                </Badge>
              </div>
            </div>
          )}
          <UserMenu name={user.name} email={user.email} side="right" />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-ink-950/85 px-4 backdrop-blur-md md:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <VellumMark className="size-6" />
          <span className="font-display text-lg">Vellum</span>
        </Link>
        <div className="flex items-center gap-3">
          <DemoTag />
          <UserMenu name={user.name} email={user.email} side="bottom" compact />
        </div>
      </header>

      {/* Content */}
      <main className="min-w-0 flex-1 px-4 pb-28 pt-20 md:px-10 md:pb-16 md:pt-10">
        <div className="mx-auto w-full max-w-5xl">
          <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      {/* Mobile bottom tabs */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-ink-950/90 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-4">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium tracking-wide text-ivory-faint transition-colors"
              activeProps={{ className: "!text-gold-300" }}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "grid place-items-center rounded-full px-4 py-1 transition-colors duration-300",
                      isActive && "bg-gold-500/15",
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  {label}
                </>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

function UserMenu({
  name,
  email,
  side,
  compact,
}: {
  name: string;
  email: string;
  side: "right" | "bottom";
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  void pathname; // re-render on nav so dropdown closes naturally

  async function handleSignOut() {
    await authClient.signOut();
    navigate({ to: "/" });
    queryClient.clear();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid="user-menu"
        className={cn(
          "flex items-center gap-3 rounded-full text-left outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/60",
          !compact && "rounded-md border border-border bg-ink-850 p-2.5",
        )}
      >
        <Avatar className={compact ? "size-8" : undefined}>
          <AvatarFallback>{initialsOf(name) || "V"}</AvatarFallback>
        </Avatar>
        {!compact && (
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{name}</span>
            <span className="block truncate text-xs text-ivory-faint">{email}</span>
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side === "right" ? "top" : "bottom"} align="end">
        <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: "/account" })}>
          <UserRound /> Account
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
          <Settings /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate({ to: "/billing" })}>
          <CreditCard /> Billing
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut} className="text-ember focus:bg-ember/10">
          <LogOut className="!text-ember" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
