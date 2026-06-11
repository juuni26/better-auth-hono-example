import { useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { formatMoney } from "@/lib/utils";

interface Point {
  date: string;
  balance: number;
}

/** Catmull-Rom → cubic bézier for a calm, banker-ly curve. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

const W = 720;
const H = 220;
const PAD = 8;

export function BalanceChart({ points }: { points: Point[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; p: Point } | null>(null);

  const { path, area, coords } = useMemo(() => {
    if (points.length < 2) return { path: "", area: "", coords: [] as { x: number; y: number; p: Point }[] };
    const values = points.map((p) => p.balance);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const coords = points.map((p, i) => ({
      x: PAD + (i / (points.length - 1)) * (W - PAD * 2),
      y: PAD + (1 - (p.balance - min) / range) * (H - PAD * 2 - 16),
      p,
    }));
    const path = smoothPath(coords);
    const area = `${path} L${coords[coords.length - 1].x},${H} L${coords[0].x},${H} Z`;
    return { path, area, coords };
  }, [points]);

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!svgRef.current || coords.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = coords[0];
    for (const c of coords) if (Math.abs(c.x - x) < Math.abs(nearest.x - x)) nearest = c;
    setHover(nearest);
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-44 w-full touch-none sm:h-56"
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="Balance over time"
      >
        <defs>
          <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(229,180,91,0.28)" />
            <stop offset="100%" stopColor="rgba(229,180,91,0)" />
          </linearGradient>
        </defs>

        {/* horizontal guides */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={PAD}
            x2={W - PAD}
            y1={H * f}
            y2={H * f}
            stroke="rgba(242,234,217,0.05)"
            strokeDasharray="3 6"
          />
        ))}

        <motion.path
          d={area}
          fill="url(#chartFill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        />
        <motion.path
          d={path}
          fill="none"
          stroke="#e5b45b"
          strokeWidth="2.25"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.3, ease: "easeOut" }}
        />

        {hover && (
          <g>
            <line
              x1={hover.x}
              x2={hover.x}
              y1={PAD}
              y2={H - PAD}
              stroke="rgba(229,180,91,0.35)"
              strokeWidth="1"
            />
            <circle cx={hover.x} cy={hover.y} r="4.5" fill="#0e0c09" stroke="#e5b45b" strokeWidth="2" />
          </g>
        )}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 rounded-md border border-border bg-popover px-3 py-1.5 text-center shadow-xl"
          style={{ left: `${(hover.x / W) * 100}%` }}
        >
          <p className="figure text-sm font-medium">{formatMoney(hover.p.balance)}</p>
          <p className="text-[10px] text-ivory-faint">
            {new Date(hover.p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
      )}
    </div>
  );
}
