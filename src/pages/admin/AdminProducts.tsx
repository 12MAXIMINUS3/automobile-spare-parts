import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, PlusCircle, Search, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import ProductImage from "../../components/ProductImage";
import { useStore } from "../../context/StoreContext";
import { updateProduct } from "../../lib/admin";
import { money } from "../../lib/compat";
import type { Product } from "../../types";

/** Inline editor for one product. Saves only the fields that actually changed. */
function Row({ p, onSaved }: { p: Product; onSaved: (patch: Partial<Product>) => void }) {
  const { toast, deleteProduct, updateProductInStore } = useStore();
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(String(p.price));
  const [inStock, setInStock] = useState(p.inStock);
  const [deal, setDeal] = useState(Boolean(p.dealOfDay));
  const [busy, setBusy] = useState(false);

  const dirty = Number(price) !== p.price || inStock !== p.inStock || deal !== Boolean(p.dealOfDay);

  const save = async () => {
    const n = Number(price);
    if (!Number.isFinite(n) || n < 0) return toast("Enter a valid price", "error");
    setBusy(true);
    const err = await updateProduct(p.id, { price: n, in_stock: inStock, deal_of_day: deal });
    setBusy(false);
    if (err) return toast(err, "error");
    onSaved({ price: n, inStock, dealOfDay: deal });
    updateProductInStore(p.id, { price: n, inStock, dealOfDay: deal });
    setEditing(false);
    toast("Product updated");
  };

  const cancel = () => {
    setPrice(String(p.price)); setInStock(p.inStock); setDeal(Boolean(p.dealOfDay)); setEditing(false);
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${p.name}"?`)) {
      deleteProduct(p.id);
    }
  };

  return (
    <tr className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
      <td className="py-2 pr-3">
        <div className="flex items-center gap-3">
          <ProductImage src={p.images[0]} alt="" category={p.category} className="h-10 w-10 shrink-0 rounded-lg" sizes="40px" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{p.name}</p>
            <p className="text-xs text-zinc-500">{p.brand} · {p.category}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2 text-right tabular-nums">
        {editing
          ? <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal"
              className="w-24 rounded-lg border border-zinc-300 px-2 py-1 text-right text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          : <span className="text-sm font-semibold">{money(p.price)}</span>}
      </td>
      <td className="px-3 py-2 text-center">
        <button disabled={!editing} onClick={() => setInStock(!inStock)}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
            inStock ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
          } ${editing ? "cursor-pointer hover:brightness-95" : "cursor-default"}`}>
          {inStock ? "In stock" : "Out of stock"}
        </button>
      </td>
      <td className="px-3 py-2 text-center">
        <button disabled={!editing} onClick={() => setDeal(!deal)}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
            deal ? "bg-orange-500/15 text-orange-600 dark:text-orange-400" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
          } ${editing ? "cursor-pointer hover:brightness-95" : "cursor-default"}`}>
          {deal ? "Deal" : "—"}
        </button>
      </td>
      <td className="py-2 pl-3 text-right">
        <AnimatePresence mode="wait" initial={false}>
          {editing ? (
            <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-end gap-1">
              <button onClick={save} disabled={busy || !dirty}
                className="rounded-lg bg-orange-500 p-1.5 text-white disabled:opacity-40" aria-label="Save">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </button>
              <button onClick={cancel} className="rounded-lg border border-zinc-300 p-1.5 dark:border-zinc-700" aria-label="Cancel">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ) : (
            <div className="flex justify-end items-center gap-1.5">
              <motion.button key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setEditing(true)}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                Edit
              </motion.button>
              <button onClick={handleDelete} className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-600" title="Delete Product">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </AnimatePresence>
      </td>
    </tr>
  );
}

export default function AdminProducts() {
  const { products } = useStore();
  const [q, setQ] = useState("");
  const [patches, setPatches] = useState<Record<string, Partial<Product>>>({});

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products
      .map((p) => ({ ...p, ...patches[p.id] }))
      .filter((p) => !t || `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(t));
  }, [products, q, patches]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-500">{rows.length} of {products.length} products</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter products…"
              className="w-64 rounded-xl border border-zinc-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900" />
          </div>
          <Link
            to="/admin/add-product"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:scale-[1.02] hover:shadow-lg hover:shadow-orange-500/25"
          >
            <PlusCircle className="h-4 w-4" /> Upload New Product
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 px-4 dark:border-zinc-800">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
              <th className="py-3 text-left font-semibold">Product</th>
              <th className="px-3 py-3 text-right font-semibold">Price</th>
              <th className="px-3 py-3 text-center font-semibold">Stock</th>
              <th className="px-3 py-3 text-center font-semibold">Deal</th>
              <th className="py-3 pl-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <Row key={p.id} p={p} onSaved={(patch) => setPatches((s) => ({ ...s, [p.id]: { ...s[p.id], ...patch } }))} />
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="py-10 text-center text-sm text-zinc-400">No products match that filter.</p>}
      </div>
    </div>
  );
}
