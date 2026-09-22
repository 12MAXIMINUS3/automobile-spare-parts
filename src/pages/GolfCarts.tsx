import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, SearchX, ShieldCheck, Truck, Wrench } from "lucide-react";
import ProductCard from "../components/ProductCard";
import Reveal from "../components/Reveal";
import { ProductCardSkeleton } from "../components/Skeleton";
import { useStore } from "../context/StoreContext";
import { GOLF_CATEGORIES } from "../lib/data";
import { CATEGORY_ICONS } from "../lib/icons";

type Sort = "featured" | "price-asc" | "price-desc" | "rating";

function Hero({ onShop }: { onShop: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 90]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-emerald-950 text-white">
      <motion.div style={{ y }} className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-emerald-400/25 blur-3xl" />
      <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-lime-400/15 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:28px_28px]" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-24">
        <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-emerald-300">
            <Wrench className="h-3.5 w-3.5" /> Bolt-on fit, no drilling
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Golf cart <span className="text-emerald-400">accessories</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-emerald-100/80">
            Light it up, cover it, kit out the cabin. Everything here fits standard golf carts and
            low-speed vehicles, and ships with the hardware you need.
          </p>
          <button onClick={onShop}
            className="group mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600">
            Shop accessories <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}

export default function GolfCarts() {
  const { products, productsLoading } = useStore();
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("featured");
  const gridRef = useRef<HTMLDivElement>(null);

  // Only this department's products ever appear here; car parts live elsewhere.
  const golf = useMemo(() => products.filter((p) => p.department === "golf"), [products]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of golf) m[p.category] = (m[p.category] ?? 0) + 1;
    return m;
  }, [golf]);

  const shown = useMemo(() => {
    const list = category ? golf.filter((p) => p.category === category) : golf;
    const by: Record<Sort, (a: typeof list[0], b: typeof list[0]) => number> = {
      featured: (a, b) => Number(b.dealOfDay ?? false) - Number(a.dealOfDay ?? false) || b.rating - a.rating,
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating,
    };
    return [...list].sort(by[sort]);
  }, [golf, category, sort]);

  const scrollToGrid = () => gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <Hero onShop={scrollToGrid} />

      {/* category tiles double as the filter */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-6 text-2xl font-extrabold tracking-tight">Shop by category</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {GOLF_CATEGORIES.map((c, i) => {
            const Icon = CATEGORY_ICONS[c.icon] ?? Wrench;
            const active = category === c.id;
            return (
              <Reveal key={c.id} delay={i * 0.05}>
                <button
                  onClick={() => { setCategory(active ? null : c.id); scrollToGrid(); }}
                  aria-pressed={active}
                  className={`group h-full w-full rounded-2xl border p-5 text-left transition duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    active
                      ? "border-emerald-500 bg-emerald-500/5 shadow-lg"
                      : "border-zinc-200 bg-white hover:border-emerald-500/50 dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <span className={`flex h-12 w-12 items-center justify-center rounded-xl transition duration-300 group-hover:rotate-6 group-hover:scale-110 ${
                    active ? "bg-emerald-500 text-white" : "bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white dark:text-emerald-400"
                  }`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 font-bold leading-snug">{c.name}</h3>
                  <p className="mt-0.5 text-sm text-zinc-500">{c.blurb}</p>
                  <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {counts[c.id] ?? 0} {counts[c.id] === 1 ? "product" : "products"}
                  </p>
                </button>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section ref={gridRef} className="mx-auto max-w-7xl scroll-mt-40 px-4 pb-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              {category ? GOLF_CATEGORIES.find((c) => c.id === category)?.name : "All accessories"}
            </h2>
            <p className="text-sm text-zinc-500">
              {productsLoading ? "Loading…" : `${shown.length} ${shown.length === 1 ? "product" : "products"}`}
              {category && " · "}
              {category && (
                <button onClick={() => setCategory(null)} className="text-emerald-600 underline dark:text-emerald-400">
                  show all
                </button>
              )}
            </p>
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="rating">Top rated</option>
          </select>
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center text-zinc-500">
            <SearchX className="mb-3 h-10 w-10" />
            <p className="font-semibold">Nothing in this category yet.</p>
            <button onClick={() => setCategory(null)} className="mt-3 text-sm text-emerald-600 underline">Show all accessories</button>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {shown.map((p) => (
                <motion.div key={p.id} layout
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.22 }}>
                  <ProductCard product={p} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Wrench, title: "Bolt-on fitting", text: "Hardware and instructions in every box." },
            { icon: ShieldCheck, title: "Built for the weather", text: "UV-stable materials and sealed electronics." },
            { icon: Truck, title: "Fast dispatch", text: "In-stock accessories ship within 24 hours." },
          ].map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 0.08}>
              <div className="rounded-2xl bg-zinc-100 p-6 dark:bg-zinc-900">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-1 text-sm text-zinc-500">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
