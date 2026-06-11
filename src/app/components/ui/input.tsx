import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md border border-input bg-ink-900/80 px-3.5 py-2 text-sm text-foreground transition-colors",
        "placeholder:text-ivory-faint/70",
        "focus-visible:outline-none focus-visible:border-gold-500/60 focus-visible:ring-2 focus-visible:ring-gold-500/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "autofill:shadow-[inset_0_0_0_1000px_#14110d]",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
