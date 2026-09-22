import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, SearchX } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import FilterSidebar, { DEFAULT_FILTERS, type Filters } from "../components/FilterSidebar";
import ProductCard from "../components/ProductCard";
import { ProductCardSkeleton } from "../components/Skeleton";
import { useStore } from "../context/StoreContext";
import { isCompatible } from "../lib/compat";
import { fakeFetch } from "../lib/data";

const PAGE = 8;
type Sort = "match" | "price-asc" | "price-desc" | "rating";

export default function Products() {
  const { vehicle, wishlist, products, productsLoading } = useStore();
  const [params] = useSearchParams();
  const [settling, setSettling] = useState(true);
  const loading = settling || productsLoading; // brief skeleton + real catalogue fetch
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<Sort>("match");
  const [shown, setShown] = useState(PAGE);
  const [loadingMore, setLoadingMore] = useState(false);

  const q = params.get("q")?.toLowerCase() ?? "";
  const onlyWishlist = params.get("wishlist") === "1";

  // Seed filters from the URL (?category=…&brand=…) whenever it changes, e.g. via header links.
  useEffect(() => {
    const c = params.get("category"), b = params.get("brand");
    setFilters({ ...DEFAULT_FILTERS, categories: c ? [c] : [], brands: b ? [b] : [] });
    setShown(PAGE);
  }, [params]);

  useEffect(() => { fakeFetch(null, 400).then(() => setSettling(false)); }, []);

  const results = useMemo(() => {
    const list = products.filter((p) =>
      p.department !== "golf" && // golf accessories have their own page
      (!q || `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(q)) &&
      (!onlyWishlist || wishlist.includes(p.id)) &&
      (!filters.categories.length || filters.categories.includes(p.category)) &&
      (!filters.brands.length || filters.brands.includes(p.brand)) &&
      p.price <= filters.maxPrice &&
      p.rating >= filters.minRating &&
      (!filters.inStock || p.inStock) &&
      (!filters.fitsOnly || isCompatible(p, vehicle)),
    );
    const by: Record<Sort, (a: typeof list[0], b: typeof list[0]) => number> = {
      // "Best match": vehicle-compatible first, then rating
      match: (a, b) => Number(isCompatible(b, vehicle)) - Number(isCompatible(a, vehicle)) || b.rating - a.rating,
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating,
    };
    return [...list].sort(by[sort]);
  }, [filters, sort, q, vehicle, onlyWishlist, wishlist, products]);

  const update = (f: Filters) => { setFilters(f); setShown(PAGE); };
  const loadMore = async () => {
    setLoadingMore(true);
    await fakeFetch(null, 600);
    setShown((s) => s + PAGE);
    setLoadingMore(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{onlyWishlist ? "Your wishlist" : q ? `Results for “${q}”` : "All parts"}</h1>
          <p className="text-sm text-zinc-500">
            {loading ? "Loading…" : `${results.length} products`}
            {vehicle && ` · matching your ${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          </p>
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          <option value="match">Best match</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="rating">Top rated</option>
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <FilterSidebar filters={filters} onChange={update} hasVehicle={!!vehicle} />

        <div>
          {loading ? (
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <ProductCardSkeleton key={i} />)}</div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center py-24 text-center text-zinc-500">
              <SearchX className="mb-3 h-10 w-10" />
              <p className="font-semibold">No parts match your filters.</p>
              <button onClick={() => update(DEFAULT_FILTERS)} className="mt-3 text-sm text-orange-500 underline">Reset filters</button>
            </div>
          ) : (
            <>
              <motion.div layout className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {results.slice(0, shown).map((p) => (
                    <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }}>
                      <ProductCard product={p} />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {loadingMore && Array.from({ length: 3 }, (_, i) => <ProductCardSkeleton key={`s${i}`} />)}
              </motion.div>
              {shown < results.length && (
                <div className="mt-8 text-center">
                  <button onClick={loadMore} disabled={loadingMore}
                    className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-8 py-3 font-semibold text-white transition hover:bg-orange-500 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-orange-500 dark:hover:text-white">
                    {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />} Load more ({results.length - shown} left)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
