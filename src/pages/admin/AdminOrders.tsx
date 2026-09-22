import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, PackageOpen } from "lucide-react";
import { Skeleton } from "../../components/Skeleton";
import { useStore } from "../../context/StoreContext";
import { fetchOrders, ORDER_STATUSES, setOrderStatus, type AdminOrder } from "../../lib/admin";
import { money } from "../../lib/compat";

// Status colours are the reserved status palette, and each ships with its label -
// never colour alone.
const STATUS_STYLE: Record<string, string> = {
  placed:    "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  paid:      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  shipped:   "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  delivered: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
  cancelled: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

export default function AdminOrders() {
  const { toast } = useStore();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => { fetchOrders().then((o) => { setOrders(o); setLoading(false); }); }, []);

  const change = async (id: string, status: string) => {
    const prev = orders;
    setOrders((o) => o.map((x) => (x.id === id ? { ...x, status } : x))); // optimistic
    const err = await setOrderStatus(id, status);
    if (err) { setOrders(prev); toast(err, "error"); }
    else toast(`Order marked ${status}`);
  };

  if (loading) return <div className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>;

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center py-24 text-center text-zinc-500">
        <PackageOpen className="mb-3 h-10 w-10" />
        <p className="font-semibold">No orders yet</p>
        <p className="text-sm">Orders placed in the storefront appear here.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {orders.map((o) => (
        <li key={o.id} className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-3 p-4">
            <button onClick={() => setOpen(open === o.id ? null : o.id)} className="flex flex-1 items-center gap-3 text-left">
              <motion.span animate={{ rotate: open === o.id ? 180 : 0 }}><ChevronDown className="h-4 w-4 text-zinc-400" /></motion.span>
              <div className="min-w-0">
                <p className="font-semibold">#{o.id.slice(0, 8).toUpperCase()}</p>
                <p className="truncate text-xs text-zinc-500">
                  {o.ship_to?.name ?? "—"} · {o.ship_to?.city ?? "—"} · {new Date(o.created_at).toLocaleDateString()}
                </p>
              </div>
            </button>

            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[o.status] ?? ""}`}>{o.status}</span>
            <span className="w-24 text-right font-extrabold tabular-nums">{money(Number(o.total))}</span>

            <select value={o.status} onChange={(e) => change(o.id, e.target.value)} aria-label="Change status"
              className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900">
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <AnimatePresence initial={false}>
            {open === o.id && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="grid gap-4 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Ship to</h4>
                    <p className="text-zinc-600 dark:text-zinc-300">
                      {o.ship_to?.name}<br />{o.ship_to?.address}<br />{o.ship_to?.city} {o.ship_to?.zip}<br />{o.ship_to?.email}
                    </p>
                  </div>
                  <div>
                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Items</h4>
                    <ul className="space-y-1">
                      {(o.order_items ?? []).map((i, k) => (
                        <li key={k} className="flex justify-between gap-3">
                          <span className="truncate text-zinc-600 dark:text-zinc-300">{i.qty}× {i.name}</span>
                          <span className="tabular-nums">{money(Number(i.unit_price) * i.qty)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 border-t border-zinc-200 pt-2 text-xs text-zinc-500 dark:border-zinc-700">
                      Subtotal {money(Number(o.subtotal))} · Shipping {Number(o.shipping) === 0 ? "free" : money(Number(o.shipping))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </li>
      ))}
    </ul>
  );
}
