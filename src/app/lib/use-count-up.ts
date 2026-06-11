import { useEffect, useRef, useState } from "react";

/** Eased count-up for money figures. Respects reduced motion. */
export function useCountUp(target: number, durationMs = 1200, startDelayMs = 0): number {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t;
      const elapsed = t - start - startDelayMs;
      if (elapsed < 0) {
        raf.current = requestAnimationFrame(tick);
        return;
      }
      const p = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - p, 4); // easeOutQuart
      setValue(target * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, durationMs, startDelayMs]);

  return value;
}
