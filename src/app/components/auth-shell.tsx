import { motion } from "motion/react";
import { Wordmark, DemoTag } from "@/components/brand";

/**
 * Split auth layout: form on the left, a quiet brand panel on the right.
 * Collapses to a single centered column on mobile.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_0.9fr]">
      <div className="relative flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center gap-3">
          <Wordmark />
          <DemoTag />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12"
        >
          {children}
        </motion.div>
      </div>

      <aside className="halo relative hidden overflow-hidden border-l border-border bg-ink-900/50 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="rule-gold mt-6" />
        <blockquote className="relative">
          <p className="font-display text-4xl leading-snug">
            “The first bank app I've used that feels like it was{" "}
            <em className="font-display-wonk italic text-gold-400">designed on purpose</em>.”
          </p>
          <footer className="mt-6 text-sm text-ivory-faint">
            — Maya R., member since 2024
          </footer>
        </blockquote>
        <div className="flex items-center justify-between text-xs text-ivory-faint">
          <span>4.60% APY · No fees · Cancel anytime</span>
          <span className="figure">est. 2024</span>
        </div>
      </aside>
    </div>
  );
}
