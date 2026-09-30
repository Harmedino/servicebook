import { useEffect, useMemo, useRef, useState } from "react";
import { animate, motion } from "motion/react";
import { Banknote, CalendarCheck, TrendingDown, TrendingUp, UserPlus, UserX } from "lucide-react";
import type { DashboardInsights } from "@servicebook/types";
import { formatPrice, formatPriceCompact } from "../lib/format";

function percentChange(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, { duration: 0.9, ease: "easeOut", onUpdate: (v) => setDisplay(v) });
    return () => controls.stop();
  }, [value]);
  return <>{format(display)}</>;
}

interface KpiProps {
  label: string;
  value: number;
  previous: number;
  format: (n: number) => string;
  icon: typeof Banknote;
  tone: string;
  /** For metrics where lower is better (no-shows), a drop is good news. */
  lowerIsBetter?: boolean;
  index: number;
  /** Shorter formatter for the big number, e.g. ₦4.3M. */
  compact?: (n: number) => string;
}

function Kpi({ label, value, previous, format, icon: Icon, tone, lowerIsBetter, index, compact }: KpiProps) {
  const change = percentChange(value, previous);
  const good = change === null || change === 0 ? null : lowerIsBetter ? change < 0 : change > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="rounded-2xl border border-stone-200 bg-surface p-4 sm:p-5"
    >
      <div className="flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        {change === null ? (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">New</span>
        ) : change !== 0 ? (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              good ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}
          >
            {change > 0 ? <TrendingUp className="h-3 w-3" aria-hidden="true" /> : <TrendingDown className="h-3 w-3" aria-hidden="true" />}
            {Math.abs(change)}%
          </span>
        ) : null}
      </div>
      <p className="mt-3 truncate font-display text-xl font-bold text-stone-900 sm:text-2xl" title={format(value)}>
        <CountUp value={value} format={compact ?? format} />
      </p>
      <p className="mt-0.5 text-xs text-stone-500 sm:text-sm">{label}</p>
    </motion.div>
  );
}

function RevenueChart({ series }: { series: DashboardInsights["revenueSeries"] }) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 200;

  const { points, line, area, max } = useMemo(() => {
    const max = Math.max(1, ...series.map((p) => p.revenue));
    const step = series.length > 1 ? W / (series.length - 1) : 0;
    const points = series.map((p, i) => ({ ...p, x: i * step, y: H - 12 - (p.revenue / max) * (H - 36) }));
    const line = points.reduce((d, p, i, all) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = all[i - 1];
      const cx = (prev.x + p.x) / 2;
      return `${d} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
    }, "");
    const area = points.length ? `${line} L ${W} ${H} L 0 ${H} Z` : "";
    return { points, line, area, max };
  }, [series]);

  function onMove(clientX: number) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || !points.length) return;
    const x = ((clientX - rect.left) / rect.width) * W;
    const index = Math.round(x / (W / (points.length - 1)));
    setHover(Math.max(0, Math.min(points.length - 1, index)));
  }

  const hp = hover !== null ? points[hover] : null;
  const total = series.reduce((sum, p) => sum + p.revenue, 0);
  const dateLabel = (key: string) =>
    new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <div className="rounded-2xl border border-stone-200 bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-stone-500">Revenue · last 30 days</p>
          <p className="font-display text-2xl font-bold text-stone-900">{formatPrice(total)}</p>
        </div>
        <p className="text-xs text-stone-400">Best day {formatPrice(max === 1 ? 0 : max)}</p>
      </div>
      <div className="relative mt-4">
        <svg
          ref={ref}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-44 w-full touch-pan-y sm:h-52"
          onMouseMove={(e) => onMove(e.clientX)}
          onMouseLeave={() => setHover(null)}
          onTouchMove={(e) => onMove(e.touches[0].clientX)}
          onTouchEnd={() => setHover(null)}
          role="img"
          aria-label={`Revenue for the last 30 days, total ${formatPrice(total)}`}
        >
          <defs>
            <clipPath id="revenue-reveal">
              <motion.rect x="0" y="0" height={H} initial={{ width: 0 }} animate={{ width: W }} transition={{ duration: 1.1, ease: "easeOut" }} />
            </clipPath>
            <linearGradient id="revenue-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="var(--color-stone-200)" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
          ))}
          {/* Revealed left-to-right with a clip: pathLength mis-measures non-scaling strokes. */}
          <g clipPath="url(#revenue-reveal)">
            <path d={area} fill="url(#revenue-fill)" />
            <path d={line} fill="none" stroke="var(--color-brand-500)" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </g>
          {hp && <line x1={hp.x} x2={hp.x} y1="0" y2={H} stroke="var(--color-stone-400)" strokeOpacity="0.5" vectorEffect="non-scaling-stroke" />}
        </svg>
        {hp && (
          <>
            <span
              className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-brand-500"
              style={{ left: `${(hp.x / W) * 100}%`, top: `${(hp.y / H) * 100}%` }}
            />
            <div
              className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-xl border border-stone-200 bg-surface px-3 py-2 text-xs shadow-[var(--shadow-elevated)]"
              style={{ left: `${Math.min(85, Math.max(15, (hp.x / W) * 100))}%` }}
            >
              <p className="font-semibold text-stone-900">{formatPrice(hp.revenue)}</p>
              <p className="text-stone-500">
                {dateLabel(hp.date)} · {hp.bookings} booking{hp.bookings === 1 ? "" : "s"}
              </p>
            </div>
          </>
        )}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-stone-400">
        <span>{series[0] && dateLabel(series[0].date)}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

export function InsightsSection({ insights }: { insights: DashboardInsights }) {
  const count = (n: number) => Math.round(n).toLocaleString("en-US");
  const money = (n: number) => formatPrice(Math.round(n));
  const pct = (n: number) => `${n.toFixed(1)}%`;

  return (
    <section className="mt-6 space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi index={0} label="Revenue this month" value={insights.revenueThisMonth} previous={insights.revenueLastMonth} format={money} compact={(n) => formatPriceCompact(n)} icon={Banknote} tone="bg-emerald-50 text-emerald-700" />
        <Kpi index={1} label="Bookings this month" value={insights.bookingsThisMonth} previous={insights.bookingsLastMonth} format={count} icon={CalendarCheck} tone="bg-brand-50 text-brand-700" />
        <Kpi index={2} label="New clients" value={insights.newCustomersThisMonth} previous={insights.newCustomersLastMonth} format={count} icon={UserPlus} tone="bg-sky-50 text-sky-700" />
        <Kpi index={3} label="No-show rate" value={insights.noShowRateThisMonth} previous={insights.noShowRateLastMonth} format={pct} icon={UserX} tone="bg-amber-50 text-amber-700" lowerIsBetter />
      </div>
      <RevenueChart series={insights.revenueSeries} />
    </section>
  );
}
