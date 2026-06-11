import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Check, ShieldCheck, Sparkles, Vault, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark, DemoTag } from "@/components/brand";
import { HeroVisual } from "@/components/landing/hero-visual";
import { PLANS } from "../../shared/plans";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Landing,
});

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
});

const STATS = [
  "4.60% APY on every dollar saved",
  "2.1M members and counting",
  "$4.8B moved last quarter",
  "Zero monthly fees on Standard",
  "FDIC-style demo coverage*",
  "Cards shipped to 41 countries",
];

const FEATURES = [
  {
    n: "01",
    icon: Vault,
    title: "Vaults that fill themselves",
    body: "Round up every card swipe, skim a slice off payday, and watch named vaults — Tokyo, a ring, a rainy day — quietly fund themselves at 4.60% APY.",
  },
  {
    n: "02",
    icon: Zap,
    title: "Money that moves at your speed",
    body: "Instant transfers between members, paychecks landing up to two days early, and a virtual card live before the kettle boils.",
  },
  {
    n: "03",
    icon: ShieldCheck,
    title: "Guarded like a vault, not a feed",
    body: "Hardware-key sign-in, per-merchant card locks, and human support that picks up in under a minute. Your money never funds your data profile.",
  },
];

function Landing() {
  return (
    <div className="halo relative overflow-x-clip">
      {/* ---------- Nav ---------- */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-ink-950/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <Wordmark />
            <DemoTag className="hidden sm:inline-block" />
          </div>
          <nav className="hidden items-center gap-7 text-sm text-ivory-dim md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Product
            </a>
            <a href="#pricing" className="transition-colors hover:text-foreground">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup">Open account</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative mx-auto grid max-w-6xl gap-14 px-4 pb-20 pt-32 md:grid-cols-[1.05fr_0.95fr] md:items-center md:gap-8 md:px-8 md:pb-28 md:pt-44">
        <div>
          <motion.p
            {...fadeUp(0)}
            className="inline-flex items-center gap-2 rounded-full border border-gold-500/25 bg-gold-500/8 px-3.5 py-1.5 text-xs tracking-wide text-gold-300"
          >
            <Sparkles className="size-3.5" />
            Now earning 4.60% APY on savings
          </motion.p>

          <motion.h1
            {...fadeUp(0.08)}
            className="font-display mt-6 text-[44px] leading-[1.02] sm:text-6xl md:text-[72px]"
          >
            Money, kept{" "}
            <em className="font-display-wonk italic text-gold-400">beautifully</em>.
          </motion.h1>

          <motion.p {...fadeUp(0.18)} className="mt-6 max-w-md text-base leading-relaxed text-ivory-dim md:text-lg">
            Vellum is the account your money deserves — high-yield savings, a card
            worth holding, and onboarding that takes minutes, not appointments.
          </motion.p>

          <motion.div {...fadeUp(0.28)} className="mt-9 flex flex-wrap items-center gap-4">
            <Button size="lg" asChild>
              <Link to="/signup">
                Open your account <ArrowRight />
              </Link>
            </Button>
            <Button variant="ghost" size="lg" asChild>
              <a href="#pricing">See pricing</a>
            </Button>
          </motion.div>

          <motion.p {...fadeUp(0.38)} className="mt-7 text-xs text-ivory-faint">
            No credit check · No minimums · Cancel anytime
          </motion.p>
        </div>

        <HeroVisual />
      </section>

      {/* ---------- Stats marquee ---------- */}
      <div className="relative border-y border-border bg-ink-900/50 py-4">
        <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
          <div className="flex w-max animate-marquee gap-12 pr-12">
            {[...STATS, ...STATS].map((s, i) => (
              <span key={i} className="flex items-center gap-3 whitespace-nowrap text-sm text-ivory-dim">
                <span className="size-1 rounded-full bg-gold-500" />
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- Features ---------- */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-24 md:px-8 md:py-32">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="font-display max-w-xl text-3xl leading-tight md:text-5xl"
        >
          Built like a private bank.
          <br />
          <span className="text-ivory-faint">Priced like an app.</span>
        </motion.h2>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {FEATURES.map(({ n, icon: Icon, title, body }, i) => (
            <motion.article
              key={n}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.65, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "group relative rounded-lg border border-border bg-ink-900/60 p-7 transition-colors duration-300 hover:border-gold-500/35",
                i === 1 && "md:-translate-y-4",
              )}
            >
              <span className="figure text-xs text-gold-500/70">{n}</span>
              <span className="mt-6 grid size-11 place-items-center rounded-full border border-gold-500/25 bg-gold-500/10 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
                <Icon className="size-5 text-gold-400" />
              </span>
              <h3 className="font-display mt-5 text-xl">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ivory-dim">{body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* ---------- Pricing ---------- */}
      <section id="pricing" className="relative border-t border-border bg-ink-900/30 px-4 py-24 md:px-8 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <h2 className="font-display text-3xl leading-tight md:text-5xl">
              Three tiers.
              <br />
              <span className="text-ivory-faint">Zero fine print.</span>
            </h2>
            <p className="max-w-xs text-sm text-ivory-dim">
              Start free, upgrade when your money outgrows it. Switch or cancel in two taps.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.65, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "relative flex flex-col rounded-lg border p-7",
                  plan.highlight
                    ? "border-gold-500/50 bg-[linear-gradient(180deg,rgba(229,180,91,0.10),rgba(229,180,91,0.02))] shadow-[0_0_60px_-20px_rgba(229,180,91,0.35)]"
                    : "border-border bg-ink-900/60",
                )}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-7 rounded-full bg-gold-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-950">
                    Most loved
                  </span>
                )}
                <h3 className="font-display text-2xl">{plan.name}</h3>
                <p className="mt-1.5 text-xs text-ivory-faint">{plan.tagline}</p>
                <p className="mt-6 flex items-baseline gap-1.5">
                  <span className="figure text-4xl font-medium">${plan.priceMonthly}</span>
                  <span className="text-sm text-ivory-faint">/ month</span>
                </p>
                <ul className="mt-7 flex flex-col gap-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-ivory-dim">
                      <Check className="mt-0.5 size-4 shrink-0 text-gold-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.highlight ? "default" : "secondary"}
                  className="mt-8"
                  asChild
                >
                  <Link to="/signup" search={{ plan: plan.id }}>
                    {plan.priceMonthly === 0 ? "Start free" : `Get ${plan.name}`}
                  </Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="relative overflow-hidden px-4 py-24 text-center md:py-36">
        <div className="halo pointer-events-none absolute inset-0" />
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="font-display relative mx-auto max-w-2xl text-4xl leading-tight md:text-6xl"
        >
          Your money has been waiting for{" "}
          <em className="font-display-wonk italic text-gold-400">this</em>.
        </motion.h2>
        <div className="relative mt-10">
          <Button size="lg" asChild>
            <Link to="/signup">
              Open your account <ArrowRight />
            </Link>
          </Button>
        </div>
        <p className="relative mt-6 text-xs text-ivory-faint">Takes about 90 seconds. We timed it.</p>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-border px-4 py-10 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <Wordmark />
            <DemoTag />
          </div>
          <p className="max-w-md text-xs leading-relaxed text-ivory-faint">
            *Vellum is a portfolio demo, not a bank. Figures are illustrative. Built with React,
            TanStack, Hono, better-auth, Drizzle &amp; Stripe on Cloudflare Workers.
          </p>
        </div>
      </footer>
    </div>
  );
}
