import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Check, ExternalLink, ReceiptText } from "lucide-react";
import { meQuery, postJson } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PLANS, planById, type PlanId } from "../../../shared/plans";

export const Route = createFileRoute("/_app/billing")({
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  component: BillingPage,
});

function BillingPage() {
  const { data: me } = useSuspenseQuery(meQuery);
  const queryClient = useQueryClient();
  const sub = me.subscription;
  const currentPlan = planById(sub?.plan);
  const isDemo = me.paymentsMode === "demo";

  const switchPlan = useMutation({
    mutationFn: (plan: PlanId) =>
      postJson<{ url?: string; activated?: boolean }>("/api/checkout", { plan }),
    onSuccess: async (res, plan) => {
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success(`You're on ${planById(plan)?.name} now.`);
    },
    onError: (e) => toast.error(e.message),
  });

  const openPortal = useMutation({
    mutationFn: () => postJson<{ url: string }>("/api/billing/portal"),
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: (e) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: () => postJson("/api/billing/cancel"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      toast("Subscription canceled. The door's always open.");
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
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Billing</h1>
          <p className="mt-1.5 text-sm text-ivory-faint">Your plan, your renewal, your call.</p>
        </div>
        <Badge variant={isDemo ? "secondary" : "positive"}>
          {isDemo ? "Stripe demo mode — no keys configured" : "Stripe live"}
        </Badge>
      </header>

      {/* Current plan */}
      <Card
        className={cn(
          sub?.status === "active" || sub?.status === "trialing"
            ? "border-gold-500/40 bg-[linear-gradient(180deg,rgba(229,180,91,0.08),rgba(229,180,91,0.01))]"
            : "border-ember/30",
        )}
      >
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div className="flex flex-col gap-1.5">
            <CardDescription>Current plan</CardDescription>
            <CardTitle className="text-3xl">
              {currentPlan?.name ?? "None"}
              <span className="figure ml-3 text-base text-ivory-faint">
                ${currentPlan?.priceMonthly ?? 0}/mo
              </span>
            </CardTitle>
          </div>
          <Badge variant={sub?.status === "active" || sub?.status === "trialing" ? "positive" : "destructive"}>
            {sub?.status ?? "none"}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {sub?.currentPeriodEnd && sub.status !== "canceled" && (
            <p className="flex items-center gap-2 text-sm text-ivory-dim">
              <ReceiptText className="size-4 text-ivory-faint" />
              Renews{" "}
              {new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {!isDemo && sub?.stripeCustomerId && (
              <Button
                variant="secondary"
                onClick={() => openPortal.mutate()}
                loading={openPortal.isPending}
              >
                Manage in Stripe portal <ExternalLink />
              </Button>
            )}
            {sub && sub.status !== "canceled" && currentPlan && currentPlan.priceMonthly > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="text-ember hover:bg-ember/10 hover:text-ember">
                    Cancel subscription
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cancel {currentPlan.name}?</DialogTitle>
                    <DialogDescription>
                      You'll keep your account and balance — just lose the {currentPlan.name} perks.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="destructive"
                      onClick={() => cancel.mutate()}
                      loading={cancel.isPending}
                    >
                      Yes, cancel it
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Switch plans */}
      <section>
        <h2 className="font-display text-xl">Switch tiers</h2>
        <p className="mt-1 text-sm text-ivory-faint">
          Upgrades apply instantly{isDemo ? " (demo mode simulates checkout)" : " via Stripe Checkout"}.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = sub?.plan === plan.id && sub.status !== "canceled";
            return (
              <div
                key={plan.id}
                className={cn(
                  "flex flex-col rounded-lg border p-6",
                  isCurrent
                    ? "border-gold-500/50 bg-gold-500/8"
                    : "border-border bg-ink-900/60",
                )}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg">{plan.name}</h3>
                  {isCurrent && <Badge>current</Badge>}
                </div>
                <p className="figure mt-3 text-3xl font-medium">
                  ${plan.priceMonthly}
                  <span className="ml-1 text-xs font-normal text-ivory-faint">/mo</span>
                </p>
                <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                  {plan.features.slice(0, 3).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-ivory-dim">
                      <Check className="mt-0.5 size-4 shrink-0 text-gold-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6"
                  variant={isCurrent ? "secondary" : "default"}
                  disabled={isCurrent || switchPlan.isPending}
                  loading={switchPlan.isPending && switchPlan.variables === plan.id}
                  onClick={() => switchPlan.mutate(plan.id)}
                >
                  {isCurrent ? "Your plan" : `Switch to ${plan.name}`}
                </Button>
              </div>
            );
          })}
        </div>
      </section>
    </motion.div>
  );
}
