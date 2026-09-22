import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Menu, Moon, Search, ShoppingCart, Sun, Wrench, X } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { BRANDS, CATEGORIES } from "../lib/data";
import AccountMenu from "./AccountMenu";
import VehicleSelector from "./VehicleSelector";

/** Search box with a mock autocomplete: matches product names, brands and categories. */
function SearchBox() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { products } = useStore();

  const suggestions = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    const prods = products.filter((p) => p.name.toLowerCase().includes(t) || p.brand.toLowerCase().includes(t)).slice(0, 5)
      .map((p) => ({ label: p.name, sub: p.brand, to: `/product/${p.id}` }));
    const cats = CATEGORIES.filter((c) => c.name.toLowerCase().includes(t))
      .map((c) => ({ label: c.name, sub: "Category", to: `/products?category=${c.id}` }));
    const brands = BRANDS.filter((b) => b.name.toLowerCase().includes(t))
      .map((b) => ({ label: b.name, sub: "Brand", to: `/products?brand=${b.name}` }));
    return [...cats, ...brands, ...prods].slice(0, 7);
  }, [q, products]);

  const go = (to: string) => { setOpen(false); setQ(""); navigate(to); };

  return (
    <form
      className="relative w-full"
      onSubmit={(e) => { e.preventDefault(); if (q.trim()) go(`/products?q=${encodeURIComponent(q.trim())}`); }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)} // delay so a suggestion click registers first
        placeholder="Search part, brand or category…"
        className="w-full rounded-full border border-zinc-300 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/30 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <AnimatePresence>
        {open && suggestions.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
          >
            {suggestions.map((s) => (
              <li key={s.to + s.label}>
                <button type="button" onMouseDown={() => go(s.to)} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-orange-500/10">
                  <span className="truncate">{s.label}</span>
                  <span className="shrink-0 text-xs text-zinc-500">{s.sub}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </form>
  );
}

const iconBtn = "relative rounded-full p-2 text-zinc-700 transition hover:bg-zinc-100 hover:text-orange-500 dark:text-zinc-200 dark:hover:bg-zinc-800";

function Badge({ n }: { n: number }) {
  if (!n) return null;
  // key={n} re-mounts the badge so it "pops" every time the count changes
  return (
    <motion.span key={n} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 12 }}
      className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
      {n}
    </motion.span>
  );
}

export default function Header() {
  const { cartCount, wishlist, dark, toggleDark } = useStore();
  const [menu, setMenu] = useState(false);
  const navLinks = [
    { to: "/products", label: "All parts" },
    ...CATEGORIES.slice(0, 4).map((c) => ({ to: `/products?category=${c.id}`, label: c.name })),
    { to: "/golf-carts", label: "Golf carts" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/85 backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-950/85">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <button className={`${iconBtn} lg:hidden`} onClick={() => setMenu(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
        <Link to="/" className="flex shrink-0 items-center gap-2 text-lg font-extrabold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white"><Wrench className="h-4 w-4" /></span>
          <span className="hidden sm:inline">AutoParts<span className="text-orange-500"> Hub</span></span>
        </Link>
        <div className="mx-2 hidden flex-1 md:block"><SearchBox /></div>
        <div className="ml-auto flex items-center gap-0.5">
          <button onClick={toggleDark} className={iconBtn} aria-label="Toggle dark mode">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={String(dark)} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }} className="block">
                {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </motion.span>
            </AnimatePresence>
          </button>
          <Link to="/products?wishlist=1" className={iconBtn} aria-label="Wishlist"><Heart className="h-5 w-5" /><Badge n={wishlist.length} /></Link>
          <AccountMenu className="hidden sm:block" />
          <Link to="/cart" className={iconBtn} aria-label="Cart"><ShoppingCart className="h-5 w-5" /><Badge n={cartCount} /></Link>
        </div>
      </div>

      <div className="px-4 pb-3 md:hidden"><SearchBox /></div>

      {/* Desktop vehicle bar + category nav */}
      <div className="hidden border-t border-zinc-100 bg-zinc-50/80 lg:block dark:border-zinc-800/70 dark:bg-zinc-900/50">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-2">
          <div className="w-[560px] shrink-0"><VehicleSelector variant="bar" /></div>
          <nav className="ml-auto flex items-center gap-5 text-sm font-medium">
            {navLinks.map((l) => (
              <NavLink key={l.label} to={l.to} className="text-zinc-600 transition hover:text-orange-500 dark:text-zinc-300">{l.label}</NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile slide-in menu */}
      <AnimatePresence>
        {menu && (
          <>
            <motion.div className="fixed inset-0 z-50 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenu(false)} />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-[85%] max-w-sm flex-col gap-5 overflow-y-auto bg-white p-5 shadow-2xl dark:bg-zinc-950"
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "tween", duration: 0.28 }}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-extrabold">AutoParts<span className="text-orange-500"> Hub</span></span>
                <button onClick={() => setMenu(false)} aria-label="Close menu" className={iconBtn}><X className="h-5 w-5" /></button>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Your vehicle</p>
                <VehicleSelector variant="bar" />
              </div>
              <nav className="flex flex-col">
                {navLinks.map((l) => (
                  <Link key={l.label} to={l.to} onClick={() => setMenu(false)} className="border-b border-zinc-100 py-3 font-medium dark:border-zinc-800">{l.label}</Link>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
