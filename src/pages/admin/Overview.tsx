import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, DollarSign, Package, ShoppingBag, Users } from "lucide-react";
import RevenueChart from "../../components/RevenueChart";
import { Skeleton } from "../../components/Skeleton";
import { fetchRevenue, fetchStats, fetchTopProducts, type AdminStats, type RevenuePoint, type TopProduct } from "../../lib/admin";

const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Stat tile: a hero number needs no plot, so none is drawn. */
function Tile({ label, value, sub, icon: Icon, tone }: {
  label: string; value: string; sub?: string;
  icon: typeof Package; tone?: "warn";
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
        <Icon className={`h-4 w-4 ${tone === "warn" ? "text-amber-500" : "text-zinc-400"}`} />
      </div>
      <p className="mt-2 text-3xl font-extrabold tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </motion.div>
  );
}

const RANGES = [7, 30, 90];

export default function Overview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [top, setTop] = useState<TopProduct[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchStats(), fetchTopProducts()]).then(([s, t]) => {
      setStats(s); setTop(t); setLoading(false);
    });
  }, []);

  useEffect(() => { fetchRevenue(days).then(setRevenue); }, [days]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const maxUnits = Math.max(...top.map((t) => t.units), 1);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Revenue" value={money(stats?.revenue ?? 0)} sub={`${stats?.orders ?? 0} orders all time`} icon={DollarSign} />
        <Tile label="Avg order" value={money(stats?.avg_order ?? 0)} sub="across all orders" icon={ShoppingBag} />
        <Tile label="Products" value={String(stats?.products ?? 0)}
          sub={stats?.out_of_stock ? `${stats.out_of_stock} out of stock` : "all in stock"}
          icon={stats?.out_of_stock ? AlertTriangle : Package} tone={stats?.out_of_stock ? "warn" : undefined} />
        <Tile label="Customers" value={String(stats?.customers ?? 0)} sub={`${stats?.visitors ?? 0} anonymous visitors`} icon={Users} />
      </div>

      <section className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
        {/* filters sit in one row above the chart */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">Revenue per day</h2>
            <p className="text-xs text-zinc-500">Hover for the daily figure and order count</p>
          </div>
          <div className="flex gap-1 rounded-lg bg-zinc-100 p-0.5 text-sm dark:bg-zinc-800">
            {RANGES.map((d) => (
              <button key={d} onClick={() => setDays(d)}
                className={`rounded-md px-3 py-1 font-medium transition ${days === d ? "bg-white shadow dark:bg-zinc-900" : "text-zinc-500"}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        <RevenueChart data={revenue} days={days} />
      </section>

      <section className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="mb-4 font-bold">Best sellers</h2>
        {top.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-400">No orders yet — best sellers appear once items sell.</p>
        ) : (
          <ul className="space-y-3">
            {top.map((t) => (
              <li key={t.product_id} className="flex items-center gap-3">
                <span className="w-1/3 truncate text-sm font-medium">{t.name}</span>
                {/* magnitude is bar length; every bar shares one hue (colour never encodes rank) */}
                <span className="h-5 flex-1 overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800">
                  <motion.span initial={{ width: 0 }} animate={{ width: `${(t.units / maxUnits) * 100}%` }}
                    transition={{ duration: 0.5 }}
                    className="block h-full rounded-sm bg-[#eb6834] dark:bg-[#d95926]" />
                </span>
                <span className="w-24 text-right text-sm tabular-nums text-zinc-500">{t.units} sold</span>
                <span className="w-24 text-right text-sm font-semibold tabular-nums">{money(t.revenue)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
