import { useEffect, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Check, Lock, ShieldCheck } from "lucide-react";
import { sessionQuery } from "@/lib/session";
import { meQuery, postJson } from "@/lib/api";
import { Wordmark, DemoTag } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PLANS, planById, type PlanId } from "../../shared/plans";

interface OnboardingSearch {
  plan?: PlanId;
  checkout?: string;
}

export const Route = createFileRoute("/onboarding")({
  validateSearch: (search: Record<string, unknown>): OnboardingSearch => ({
    plan: planById(typeof search.plan === "string" ? search.plan : undefined)?.id,
    checkout: typeof search.checkout === "string" ? search.checkout : undefined,
  }),
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery);
    if (!session?.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (me.subscription && me.subscription.status !== "canceled") {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: OnboardingPage,
});

const STEPS = ["Account", "Plan", "Activate"] as const;

const PAY_STAGES = [
  "Securing checkout…",
  "Confirming with Stripe…",
  "Funding your account…",
] as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const [selected, setSelected] = useState<PlanId>(search.plan ?? "plus");
  const [paying, setPaying] = useState(false);
  const [stage, setStage] = useState(0); // index into PAY_STAGES; PAY_STAGES.length = done

  useEffect(() => {
    if (search.checkout === "canceled") {
      toast("Checkout canceled — your plan is still waiting for you.");
    }
  }, [search.checkout]);

  async function activate() {
    const plan = planById(selected)!;

    try {
      if (plan.priceMonthly === 0) {
        await postJson("/api/checkout", { plan: plan.id });
        // staleTime: 0 forces a real network fetch — fetchQuery would otherwise
        // return the still-fresh "no subscription" snapshot the route guard
        // cached moments ago, and the dashboard guard would bounce us back.
        await queryClient.fetchQuery({ ...meQuery, staleTime: 0 });
        toast.success("You're in. Welcome to Vellum.");
        navigate({ to: "/dashboard" });
        return;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Activation failed. Try again.");
      return;
    }

    setPaying(true);
    setStage(0);
    try {
      const res = await postJson<{ url?: string; activated?: boolean; demo?: boolean }>(
        "/api/checkout",
        { plan: plan.id },
      );

      if (res.url) {
        // Live mode → hosted Stripe Checkout takes over.
        window.location.href = res.url;
        return;
      }

      // Demo mode: the subscription is already active server-side; give the
      // payment its moment anyway. Money deserves ceremony.
      for (let i = 0; i < PAY_STAGES.length; i++) {
        setStage(i);
        await sleep(i === 0 ? 700 : 850);
      }
      setStage(PAY_STAGES.length);
      await queryClient.fetchQuery({ ...meQuery, staleTime: 0 });
      await sleep(1100);
      navigate({ to: "/dashboard", search: { checkout: "success" } });
    } catch (err) {
      setPaying(false);
      toast.error(err instanceof Error ? err.message : "Payment failed. Try again.");
    }
  }

  const plan = planById(selected)!;

  return (
    <div className="halo min-h-dvh">
      <header className="mx-auto flex h-20 max-w-3xl items-center justify-between px-5">
        <Wordmark />
        <DemoTag />
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24">
        {/* Stepper */}
        <ol className="flex items-center gap-2 text-xs">
          {STEPS.map((s, i) => {
            const done = i === 0;
            const current = i === 1 || (i === 2 && paying);
            return (
              <li key={s} className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full border text-[10px] font-semibold",
                    done && "border-moss/50 bg-moss/15 text-moss",
                    current && !done && "border-gold-500/60 bg-gold-500/15 text-gold-300",
                    !done && !current && "border-border text-ivory-faint",
                  )}
                >
                  {done ? <Check className="size-3" /> : i + 1}
                </span>
                <span className={cn("text-ivory-faint", current && "text-foreground")}>{s}</span>
                {i < STEPS.length - 1 && <span className="mx-1 h-px w-8 bg-border" />}
              </li>
            );
          })}
        </ol>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="font-display mt-8 text-3xl sm:text-4xl"
        >
          Choose your tier
        </motion.h1>
        <p className="mt-2 text-sm text-ivory-dim">
          Every tier includes the account, the card, and the app. The rest is altitude.
        </p>

        {/* Plan cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {PLANS.map((p, i) => {
            const active = selected === p.id;
            return (
              <motion.button
                key={p.id}
                type="button"
                onClick={() => setSelected(p.id)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "relative rounded-lg border p-5 text-left transition-all duration-200",
                  active
                    ? "border-gold-500/60 bg-gold-500/8 shadow-[0_0_40px_-16px_rgba(229,180,91,0.4)]"
                    : "border-border bg-ink-900/60 hover:border-gold-500/30",
                )}
                aria-pressed={active}
              >
                <span
                  className={cn(
                    "absolute right-4 top-4 grid size-5 place-items-center rounded-full border transition-all",
                    active ? "border-gold-500 bg-gold-500 text-ink-950" : "border-ink-600",
                  )}
                >
                  {active && <Check className="size-3" />}
                </span>
                <span className="font-display block text-lg">{p.name}</span>
                <span className="figure mt-3 block text-2xl font-medium">
                  ${p.priceMonthly}
                  <span className="ml-1 text-xs font-normal text-ivory-faint">/mo</span>
                </span>
                <span className="mt-2 block text-xs leading-relaxed text-ivory-faint">
                  {p.tagline}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Feature recap for the selected plan */}
        <AnimatePresence mode="wait">
          <motion.ul
            key={plan.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="mt-6 grid gap-2 rounded-lg border border-border bg-ink-900/50 p-5 sm:grid-cols-2"
          >
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-ivory-dim">
                <Check className="mt-0.5 size-4 shrink-0 text-gold-400" />
                {f}
              </li>
            ))}
          </motion.ul>
        </AnimatePresence>

        <div className="mt-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-xs text-ivory-faint">
            <Lock className="size-3.5" />
            Payments handled by Stripe. Card details never touch our servers.
          </p>
          <Button size="lg" onClick={activate} loading={paying} className="sm:min-w-56">
            {plan.priceMonthly === 0
              ? "Start with Standard"
              : `Activate ${plan.name} — $${plan.priceMonthly}/mo`}
          </Button>
        </div>
      </main>

      {/* Payment ceremony */}
      <Dialog open={paying} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogTitle className="sr-only">Processing payment</DialogTitle>
          <div className="flex flex-col items-center py-4 text-center">
            <AnimatePresence mode="wait">
              {stage < PAY_STAGES.length ? (
                <motion.div
                  key="processing"
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center"
                >
                  <div className="relative grid size-16 place-items-center">
                    <span className="absolute inset-0 animate-spin rounded-full border-2 border-gold-500/20 border-t-gold-500 [animation-duration:1.1s]" />
                    <ShieldCheck className="size-6 text-gold-400" />
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={stage}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25 }}
                      className="mt-6 text-sm text-ivory-dim"
                    >
                      {PAY_STAGES[stage]}
                    </motion.p>
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="flex flex-col items-center"
                >
                  <span className="grid size-16 place-items-center rounded-full border border-moss/40 bg-moss/15">
                    <Check className="size-7 text-moss" />
                  </span>
                  <p className="font-display mt-6 text-xl">{plan.name} is live</p>
                  <p className="mt-1.5 text-sm text-ivory-faint">Taking you to your money…</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
