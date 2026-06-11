import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

export function VellumMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-ink-800" />
      <rect width="32" height="32" rx="8" className="stroke-gold-500/40" strokeWidth="1" fill="none" />
      <path
        d="M9 9l7 14 7-14"
        className="stroke-gold-500"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ to = "/", className }: { to?: string; className?: string }) {
  return (
    <Link to={to} className={cn("group inline-flex items-center gap-2.5", className)}>
      <VellumMark className="transition-transform duration-300 group-hover:-rotate-6" />
      <span className="font-display text-[22px] leading-none tracking-tight text-foreground">
        Vellum
      </span>
    </Link>
  );
}

/** Tiny “demo build” tag so nobody mistakes this for a chartered bank. */
export function DemoTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full border border-border bg-ink-900/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-ivory-faint",
        className,
      )}
    >
      demo build
    </span>
  );
}
