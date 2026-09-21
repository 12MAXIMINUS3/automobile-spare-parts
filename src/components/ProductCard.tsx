import { motion } from "framer-motion";
import { BadgeCheck, Heart, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { discountPct, isCompatible, money } from "../lib/compat";
import type { Product } from "../types";
import ProductImage from "./ProductImage";
import Stars from "./Stars";

export default function ProductCard({ product: p, compact = false }: { product: Product; compact?: boolean }) {
  const { vehicle, addToCart, wishlist, toggleWishlist } = useStore();
  const fits = isCompatible(p, vehicle);
  const saved = wishlist.includes(p.id);
  const pct = discountPct(p);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="group relative flex flex-col rounded-2xl border border-zinc-200 bg-white p-3 transition-shadow hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
    >
      <Link to={`/product/${p.id}`} className="block overflow-hidden rounded-xl">
        <ProductImage src={p.images[0]} alt={p.alt ?? p.name} category={p.category} className="aspect-square w-full transition-transform duration-500 group-hover:scale-105" />
      </Link>

      <div className="pointer-events-none absolute left-5 top-5 flex flex-col items-start gap-1">
        {pct > 0 && <span className="rounded-md bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">-{pct}%</span>}
        {fits && (
          <span className="flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
            <BadgeCheck className="h-3 w-3" /> Fits your car
          </span>
        )}
      </div>

      <button
        onClick={() => toggleWishlist(p.id)}
        aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
        className="absolute right-5 top-5 rounded-full bg-white/90 p-1.5 shadow transition hover:scale-110 dark:bg-zinc-800/90"
      >
        <motion.span key={String(saved)} initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 12 }} className="block">
          <Heart className={`h-4 w-4 ${saved ? "fill-rose-500 text-rose-500" : "text-zinc-500"}`} />
        </motion.span>
      </button>

      <div className="mt-3 flex flex-1 flex-col">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{p.brand}</span>
        <Link to={`/product/${p.id}`} className={`mt-0.5 font-semibold leading-snug hover:text-orange-500 ${compact ? "line-clamp-2 text-sm" : "line-clamp-2 text-[15px]"}`}>
          {p.name}
        </Link>
        <div className="mt-1.5"><Stars value={p.rating} count={p.reviews.length} /></div>
        <div className="mt-auto pt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-extrabold">{money(p.price)}</span>
            {p.oldPrice && <span className="text-sm text-zinc-400 line-through">{money(p.oldPrice)}</span>}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            disabled={!p.inStock}
            onClick={() => addToCart(p.id)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-orange-500 dark:hover:text-white dark:disabled:bg-zinc-800"
          >
            <ShoppingCart className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            {p.inStock ? "Add to cart" : "Out of stock"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
