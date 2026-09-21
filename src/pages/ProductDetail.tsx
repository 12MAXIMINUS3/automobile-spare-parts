import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Heart, Minus, Plus, ShoppingCart, TriangleAlert } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import ProductGallery from "../components/ProductGallery";
import { Skeleton } from "../components/Skeleton";
import Stars from "../components/Stars";
import { useStore } from "../context/StoreContext";
import { discountPct, isCompatible, money } from "../lib/compat";
import { CATEGORIES } from "../lib/data";
import { fetchProduct } from "../lib/catalog";
import type { Product } from "../types";

const TABS = ["Description", "Specifications", "Compatibility", "Reviews"] as const;

function PdpSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:grid-cols-2">
      <Skeleton className="aspect-square w-full" />
      <div className="space-y-4"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-3/4" /><Skeleton className="h-5 w-40" /><Skeleton className="h-10 w-48" /><Skeleton className="h-24 w-full" /><Skeleton className="h-12 w-full" /></div>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const { vehicle, addToCart, wishlist, toggleWishlist, products } = useStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Description");
  const [pulse, setPulse] = useState(0);

  // Loads the product (with its reviews) from Supabase, falling back to mock data.
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setQty(1); setTab("Description"); window.scrollTo({ top: 0 });
    fetchProduct(id!).then((p) => {
      if (cancelled) return;
      setProduct(p); setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <PdpSkeleton />;
  if (!product) {
    return <div className="py-32 text-center"><p className="text-lg font-semibold">Product not found.</p><Link to="/products" className="text-orange-500 underline">Back to parts</Link></div>;
  }

  const p = product;
  const fits = isCompatible(p, vehicle);
  const saved = wishlist.includes(p.id);
  const pct = discountPct(p);
  const category = CATEGORIES.find((c) => c.id === p.category);
  const related = products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
  const fitsSummary = p.universal ? "Universal — fits all vehicles" : p.compatibility.map((c) => `${c.yearFrom}–${c.yearTo} ${c.make} ${c.model}${c.fuels ? ` (${c.fuels.join(", ")})` : ""}`);

  const add = () => { addToCart(p.id, qty); setPulse((n) => n + 1); };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-6 text-sm text-zinc-500">
        <Link to="/" className="hover:text-orange-500">Home</Link> / <Link to={`/products?category=${p.category}`} className="hover:text-orange-500">{category?.name}</Link> / <span className="text-zinc-900 dark:text-zinc-100">{p.name}</span>
      </nav>

      <div className="grid gap-10 md:grid-cols-2">
        <ProductGallery product={p} />

        <div>
          <Link to={`/products?brand=${p.brand}`} className="text-sm font-semibold uppercase tracking-wide text-orange-500">{p.brand}</Link>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">{p.name}</h1>
          <div className="mt-2"><Stars value={p.rating} count={p.reviews.length} /></div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-4xl font-extrabold">{money(p.price)}</span>
            {p.oldPrice && <>
              <span className="text-lg text-zinc-400 line-through">{money(p.oldPrice)}</span>
              <span className="rounded-md bg-orange-500 px-2 py-0.5 text-sm font-bold text-white">-{pct}%</span>
            </>}
          </div>
          <p className={`mt-1 text-sm font-medium ${p.inStock ? "text-emerald-600" : "text-rose-500"}`}>{p.inStock ? "In stock — ships within 24h" : "Currently out of stock"}</p>

          <p className="mt-4 text-zinc-600 dark:text-zinc-300">{p.description}</p>

          {/* Compatibility banner reflects the globally selected vehicle */}
          <div className={`mt-5 flex items-start gap-3 rounded-xl p-4 text-sm ${!vehicle ? "bg-zinc-100 dark:bg-zinc-900" : fits ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>
            {vehicle ? (fits ? <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" /> : <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />) : null}
            <div>
              {!vehicle ? <p>Select your vehicle in the header to check if this part fits.</p>
                : fits ? <p className="font-semibold">Fits your {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.fuel})</p>
                : <p className="font-semibold">This part does not fit your {vehicle.year} {vehicle.make} {vehicle.model}.</p>}
              <p className="mt-1 opacity-80">Fits: {Array.isArray(fitsSummary) ? fitsSummary.slice(0, 2).join("; ") + (fitsSummary.length > 2 ? ` +${fitsSummary.length - 2} more` : "") : fitsSummary}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-xl border border-zinc-300 dark:border-zinc-700">
              <button aria-label="Decrease" onClick={() => setQty(Math.max(1, qty - 1))} className="p-3 hover:text-orange-500"><Minus className="h-4 w-4" /></button>
              <motion.span key={qty} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-8 text-center font-semibold">{qty}</motion.span>
              <button aria-label="Increase" onClick={() => setQty(Math.min(99, qty + 1))} className="p-3 hover:text-orange-500"><Plus className="h-4 w-4" /></button>
            </div>
            <motion.button
              key={pulse} // re-mount to replay the pulse on each add
              initial={pulse ? { scale: 0.94 } : false} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}
              disabled={!p.inStock} onClick={add}
              className="flex min-w-48 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none dark:disabled:bg-zinc-800"
            >
              <ShoppingCart className="h-5 w-5" /> Add to cart
            </motion.button>
            <button onClick={() => toggleWishlist(p.id)} aria-label="Toggle wishlist" className="rounded-xl border border-zinc-300 p-3.5 transition hover:border-rose-400 dark:border-zinc-700">
              <motion.span key={String(saved)} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 10 }} className="block">
                <Heart className={`h-5 w-5 ${saved ? "fill-rose-500 text-rose-500" : ""}`} />
              </motion.span>
            </button>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {Object.entries(p.specs).slice(0, 4).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-zinc-100 py-1.5 dark:border-zinc-800"><dt className="text-zinc-500">{k}</dt><dd className="font-medium">{v}</dd></div>
            ))}
          </dl>
        </div>
      </div>

      {/* Tabs — animated underline via shared layoutId, content cross-fades */}
      <section className="mt-14">
        <div className="flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`relative whitespace-nowrap px-4 py-3 text-sm font-semibold transition ${tab === t ? "text-orange-500" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"}`}>
              {t}{t === "Reviews" && ` (${p.reviews.length})`}
              {tab === t && <motion.span layoutId="tab-underline" className="absolute inset-x-0 -bottom-px h-0.5 bg-orange-500" />}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="py-6">
            {tab === "Description" && <p className="max-w-3xl leading-relaxed text-zinc-600 dark:text-zinc-300">{p.description} Manufactured to strict quality standards and tested for durability. Installation instructions are included in the box.</p>}
            {tab === "Specifications" && (
              <table className="w-full max-w-2xl text-sm"><tbody>
                {Object.entries(p.specs).map(([k, v]) => <tr key={k} className="border-b border-zinc-100 dark:border-zinc-800"><th className="w-1/3 py-2.5 text-left font-medium text-zinc-500">{k}</th><td className="py-2.5">{v}</td></tr>)}
                <tr><th className="py-2.5 text-left font-medium text-zinc-500">Brand</th><td>{p.brand}</td></tr>
              </tbody></table>
            )}
            {tab === "Compatibility" && (
              <ul className="max-w-2xl space-y-2 text-sm">
                {p.universal ? <li>Universal — fits all vehicles.</li> : p.compatibility.map((c, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 dark:bg-zinc-900"><BadgeCheck className="h-4 w-4 text-emerald-500" /> {c.yearFrom}–{c.yearTo} {c.make} {c.model} {c.fuels ? `· ${c.fuels.join(", ")}` : "· all engines"}</li>
                ))}
              </ul>
            )}
            {tab === "Reviews" && (
              <div className="max-w-2xl space-y-4">
                {p.reviews.map((r, i) => (
                  <div key={i} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="flex items-center justify-between"><span className="font-semibold">{r.author}</span><Stars value={r.rating} /></div>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{r.text}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-5 text-xl font-extrabold">You may also need</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{related.map((r) => <ProductCard key={r.id} product={r} />)}</div>
        </section>
      )}
    </div>
  );
}
