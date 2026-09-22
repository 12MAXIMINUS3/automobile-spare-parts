import { useEffect, useRef, useState } from "react";
import type { RevenuePoint } from "../lib/admin";

/**
 * Revenue over time: one series, so the title carries identity and no legend box
 * is needed. Series colour is the validated orange step (#eb6834 light /
 * #d95926 dark) applied via `currentColor`, so the line, the area gradient and
 * the hover dot all follow the same token in both modes. Text stays in ink
 * tokens - never the series colour.
 *
 * Orders/day is deliberately NOT plotted here: a second measure on its own
 * y-scale would be a dual-axis chart. It appears in the tooltip instead.
 */
const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const H = 220, PAD_L = 44, PAD_R = 12, PAD_T = 14, PAD_B = 26;

export default function RevenueChart({ data, days }: { data: RevenuePoint[]; days: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(720);

  // track container width so the SVG scales without a resize library
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(320, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const max = Math.max(...data.map((d) => d.revenue), 0);
  const niceMax = max <= 0 ? 100 : Math.ceil(max / 50) * 50;
  const innerW = w - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const x = (i: number) => PAD_L + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD_T + innerH - (v / niceMax) * innerH;

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.revenue).toFixed(1)}`).join(" ");
  const area = data.length
    ? `${line} L${x(data.length - 1).toFixed(1)},${(PAD_T + innerH).toFixed(1)} L${x(0).toFixed(1)},${(PAD_T + innerH).toFixed(1)} Z`
    : "";

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => niceMax * f);
  const hasRevenue = max > 0;
  const peak = data.reduce((best, d, i) => (d.revenue > (data[best]?.revenue ?? -1) ? i : best), 0);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * w;
    if (px < PAD_L - 12 || px > w - PAD_R + 12 || !data.length) return setHover(null);
    const frac = (px - PAD_L) / innerW;
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(frac * (data.length - 1)))));
  };

  const fmtDay = (s: string) => new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const h = hover != null ? data[hover] : null;

  return (
    <div ref={wrapRef} className="relative">
      <svg
        viewBox={`0 0 ${w} ${H}`} width="100%" height={H} role="img"
        aria-label={`Daily revenue for the last ${days} days`}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}
        className="text-[#eb6834] dark:text-[#d95926]"
      >
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* recessive grid + y labels in ink tokens */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD_L} x2={w - PAD_R} y1={y(t)} y2={y(t)}
              className="stroke-zinc-200 dark:stroke-zinc-800" strokeWidth="1" />
            <text x={PAD_L - 8} y={y(t) + 4} textAnchor="end"
              className="fill-zinc-400 text-[10px] dark:fill-zinc-500">{money(t)}</text>
          </g>
        ))}

        {hasRevenue && <>
          <path d={area} fill="url(#revFill)" />
          <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {/* selective direct label: the peak only, never every point */}
          <circle cx={x(peak)} cy={y(data[peak].revenue)} r="4" fill="currentColor"
            className="stroke-white dark:stroke-zinc-900" strokeWidth="2" />
        </>}

        {/* x labels: ends and midpoint only, so they never collide */}
        {data.length > 1 && [0, Math.floor(data.length / 2), data.length - 1].map((i) => (
          <text key={i} x={x(i)} y={H - 8}
            textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
            className="fill-zinc-400 text-[10px] dark:fill-zinc-500">{fmtDay(data[i].day)}</text>
        ))}

        {/* hover crosshair */}
        {h && (
          <g>
            <line x1={x(hover!)} x2={x(hover!)} y1={PAD_T} y2={PAD_T + innerH}
              className="stroke-zinc-300 dark:stroke-zinc-600" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={x(hover!)} cy={y(h.revenue)} r="5" fill="currentColor"
              className="stroke-white dark:stroke-zinc-900" strokeWidth="2" />
          </g>
        )}
      </svg>

      {!hasRevenue && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
          No revenue in this period yet
        </p>
      )}

      {h && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg bg-zinc-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
          style={{ left: `${(x(hover!) / w) * 100}%`, top: 0 }}
        >
          <div className="font-semibold">{fmtDay(h.day)}</div>
          <div>{money(h.revenue)} · {h.orders} {h.orders === 1 ? "order" : "orders"}</div>
        </div>
      )}
    </div>
  );
}
