import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { ArrowDownLeft, ArrowUpRight, Landmark } from "lucide-react";
import { VellumMark } from "@/components/brand";
import { useCountUp } from "@/lib/use-count-up";
import { formatMoney } from "@/lib/utils";

const SPARK = [38, 42, 40, 47, 45, 52, 50, 58, 56, 63, 68, 66, 74, 79, 84, 92];

function sparkPath(values: number[], w: number, h: number): string {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/**
 * The hero's floating account panel + metal card. Tilts gently toward the
 * pointer on desktop; settles flat on touch devices.
 */
export function HeroVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [7, -7]), { stiffness: 140, damping: 18 });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-9, 9]), { stiffness: 140, damping: 18 });

  const balance = useCountUp(2484317, 1600, 350); // cents

  function onPointerMove(e: React.PointerEvent) {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  }

  function onPointerLeave() {
    mx.set(0.5);
    my.set(0.5);
  }

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative mx-auto w-full max-w-[420px] [perspective:1200px]"
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        initial={{ opacity: 0, y: 36, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        {/* Account panel */}
        <div className="relative overflow-hidden rounded-2xl border border-gold-500/20 bg-ink-900/90 p-6 shadow-[0_40px_80px_-32px_rgba(0,0,0,0.9),0_0_60px_-20px_rgba(229,180,91,0.18)] backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-ivory-faint">
              <Landmark className="size-4" />
              <span className="text-xs uppercase tracking-[0.16em]">Main account</span>
            </div>
            <span className="rounded-full border border-moss/30 bg-moss/10 px-2 py-0.5 text-[10px] font-medium text-moss">
              +4.60% APY
            </span>
          </div>

          <p className="figure mt-5 text-[40px] font-medium leading-none text-foreground">
            {formatMoney(Math.round(balance))}
          </p>
          <p className="mt-2 text-xs text-ivory-faint">
            <span className="text-moss">+$1,284.02</span> this month
          </p>

          <svg viewBox="0 0 280 64" className="mt-5 h-16 w-full" aria-hidden>
            <defs>
              <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgba(229,180,91,0.35)" />
                <stop offset="100%" stopColor="rgba(229,180,91,0)" />
              </linearGradient>
            </defs>
            <path d={`${sparkPath(SPARK, 280, 56)} L280,64 L0,64 Z`} fill="url(#sparkFill)" />
            <motion.path
              d={sparkPath(SPARK, 280, 56)}
              fill="none"
              stroke="#e5b45b"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.4, delay: 0.7, ease: "easeOut" }}
            />
          </svg>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {[
              { icon: ArrowDownLeft, label: "Payroll · Acme", amount: "+$3,120.00", tone: "text-moss" },
              { icon: ArrowUpRight, label: "Vault transfer", amount: "−$500.00", tone: "text-ivory-dim" },
            ].map(({ icon: Icon, label, amount, tone }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + i * 0.15, duration: 0.5 }}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-ink-850/80 px-3 py-2.5"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink-700">
                  <Icon className="size-3.5 text-gold-400" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] text-ivory-faint">{label}</span>
                  <span className={`figure block text-xs font-medium ${tone}`}>{amount}</span>
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Metal card peeking from behind */}
        <motion.div
          initial={{ opacity: 0, y: 24, rotate: 0 }}
          animate={{ opacity: 1, y: 0, rotate: -6 }}
          transition={{ duration: 0.9, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ transform: "translateZ(40px)" }}
          className="absolute -right-3 -top-14 -z-10 h-40 w-64 rounded-xl border border-gold-500/30 bg-[linear-gradient(135deg,#2b251c_0%,#1a1610_55%,#332a1d_100%)] p-4 shadow-[0_24px_48px_-20px_rgba(0,0,0,0.9)] sm:-right-10"
        >
          <div className="flex items-start justify-between">
            <VellumMark className="size-6" />
            <span className="font-display text-xs italic text-gold-400">Metal</span>
          </div>
          <div className="figure absolute bottom-4 left-4 text-[13px] tracking-[0.18em] text-ivory-dim">
            ···· 4417
          </div>
          {/* brushed-steel sheen */}
          <div className="pointer-events-none absolute inset-0 rounded-xl bg-[linear-gradient(105deg,transparent_42%,rgba(243,214,149,0.12)_50%,transparent_58%)]" />
        </motion.div>
      </motion.div>

      {/* floor glow */}
      <div className="absolute -bottom-10 left-1/2 h-16 w-3/4 -translate-x-1/2 rounded-[100%] bg-gold-500/10 blur-2xl" />
    </div>
  );
}
