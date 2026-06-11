import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "border-gold-500/30 bg-gold-500/10 text-gold-300",
        secondary: "border-border bg-ink-800 text-ivory-dim",
        positive: "border-moss/30 bg-moss/10 text-moss",
        destructive: "border-ember/30 bg-ember/10 text-ember",
        outline: "border-border text-ivory-dim",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/** Renders a <span> so badges can sit inside <p> without invalid nesting. */
function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
