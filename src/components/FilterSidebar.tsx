import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";
import { BRANDS, CATEGORIES } from "../lib/data";

export interface Filters {
  categories: string[];
  brands: string[];
  maxPrice: number;
  minRating: number;
  inStock: boolean;
  fitsOnly: boolean;
}
export const MAX_PRICE = 250;
export const DEFAULT_FILTERS: Filters = { categories: [], brands: [], maxPrice: MAX_PRICE, minRating: 0, inStock: false, fitsOnly: false };

const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-zinc-200 py-4 last:border-0 dark:border-zinc-800">
      <h4 className="mb-2.5 text-sm font-bold">{title}</h4>
      {children}
    </div>
  );
}

const Check = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
  <label className="flex cursor-pointer items-center gap-2 py-1 text-sm text-zinc-700 transition hover:text-orange-500 dark:text-zinc-300">
    <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-orange-500" /> {label}
  </label>
);

function Panel({ f, set, hasVehicle }: { f: Filters; set: (f: Filters) => void; hasVehicle: boolean }) {
  return (
    <div>
      {hasVehicle && (
        <Group title="Vehicle">
          <Check label="Only parts that fit my car" checked={f.fitsOnly} onChange={() => set({ ...f, fitsOnly: !f.fitsOnly })} />
        </Group>
      )}
      <Group title="Category">
        {CATEGORIES.map((c) => <Check key={c.id} label={c.name} checked={f.categories.includes(c.id)} onChange={() => set({ ...f, categories: toggle(f.categories, c.id) })} />)}
      </Group>
      <Group title={`Max price: $${f.maxPrice}`}>
        <input type="range" min={10} max={MAX_PRICE} step={5} value={f.maxPrice} onChange={(e) => set({ ...f, maxPrice: Number(e.target.value) })} className="w-full accent-orange-500" />
      </Group>
      <Group title="Brand">
        <div className="max-h-44 overflow-y-auto">
          {BRANDS.map((b) => <Check key={b.id} label={b.name} checked={f.brands.includes(b.name)} onChange={() => set({ ...f, brands: toggle(f.brands, b.name) })} />)}
        </div>
      </Group>
      <Group title="Rating">
        {[4.5, 4, 3].map((r) => (
          <label key={r} className="flex cursor-pointer items-center gap-2 py-1 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="radio" name="rating" checked={f.minRating === r} onChange={() => set({ ...f, minRating: r })} className="accent-orange-500" /> {r}★ &amp; up
          </label>
        ))}
        <button onClick={() => set({ ...f, minRating: 0 })} className="mt-1 text-xs text-zinc-500 underline">Any rating</button>
      </Group>
      <Group title="Availability">
        <label className="flex cursor-pointer items-center justify-between text-sm">
          In stock only
          <button role="switch" aria-checked={f.inStock} onClick={() => set({ ...f, inStock: !f.inStock })}
            className={`relative h-6 w-11 rounded-full transition-colors ${f.inStock ? "bg-orange-500" : "bg-zinc-300 dark:bg-zinc-700"}`}>
            <motion.span layout transition={{ type: "spring", stiffness: 500, damping: 30 }} className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${f.inStock ? "right-0.5" : "left-0.5"}`} />
          </button>
        </label>
      </Group>
      <button onClick={() => set({ ...DEFAULT_FILTERS })} className="mt-3 w-full rounded-lg border border-zinc-300 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">Reset filters</button>
    </div>
  );
}

/** Desktop: static sticky sidebar. Mobile: toggle button that animates the panel open/closed. */
export default function FilterSidebar(props: { filters: Filters; onChange: (f: Filters) => void; hasVehicle: boolean }) {
  const [open, setOpen] = useState(false);
  const panel = <Panel f={props.filters} set={props.onChange} hasVehicle={props.hasVehicle} />;
  return (
    <>
      <div className="lg:hidden">
        <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 py-2.5 text-sm font-semibold dark:border-zinc-700">
          <SlidersHorizontal className="h-4 w-4" /> {open ? "Hide filters" : "Show filters"}
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28 }} className="overflow-hidden">
              <div className="px-1 pt-2">{panel}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <aside className="sticky top-40 hidden self-start rounded-2xl border border-zinc-200 px-4 dark:border-zinc-800 lg:block">{panel}</aside>
    </>
  );
}
