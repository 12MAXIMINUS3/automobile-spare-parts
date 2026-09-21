import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "../types";
import ProductImage from "./ProductImage";

/** Big image with cross-fade + thumbnails and prev/next arrows. */
export default function ProductGallery({ product: p }: { product: Product }) {
  const [i, setI] = useState(0);
  const n = p.images.length;
  const go = (d: number) => setI((i + d + n) % n);

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <ProductImage src={p.images[i]} alt={p.alt ?? p.name} category={p.category} className="aspect-square w-full" sizes="(max-width: 768px) 100vw, 50vw" priority />
          </motion.div>
        </AnimatePresence>
        {[-1, 1].map((d) => (
          <button key={d} onClick={() => go(d)} aria-label={d < 0 ? "Previous image" : "Next image"}
            className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow transition hover:scale-110 dark:bg-zinc-900/90 ${d < 0 ? "left-3" : "right-3"}`}>
            {d < 0 ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-3">
        {p.images.map((img, idx) => (
          <button key={idx} onClick={() => setI(idx)} aria-label={`Image ${idx + 1}`}
            className={`w-20 overflow-hidden rounded-xl border-2 transition ${idx === i ? "border-orange-500" : "border-transparent opacity-60 hover:opacity-100"}`}>
            <ProductImage src={img} alt="" category={p.category} className="aspect-square w-full" sizes="80px" />
          </button>
        ))}
      </div>
    </div>
  );
}
