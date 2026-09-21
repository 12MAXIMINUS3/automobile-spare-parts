import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import ProductImage from "../components/ProductImage";
import { useStore } from "../context/StoreContext";
import { money } from "../lib/compat";
import { shippingFor } from "../lib/pricing";

export function OrderSummary({ cta }: { cta?: React.ReactNode }) {
  const { cartTotal } = useStore();
  const ship = shippingFor(cartTotal);
  const rows: [string, string][] = [["Subtotal", money(cartTotal)], ["Shipping estimate", ship === 0 ? "Free" : money(ship)]];
  return (
    <aside className="h-fit rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="mb-4 text-lg font-bold">Order summary</h2>
      {rows.map(([k, v]) => <div key={k} className="flex justify-between py-1 text-sm"><span className="text-zinc-500">{k}</span><span>{v}</span></div>)}
      {ship > 0 && <p className="mt-1 text-xs text-zinc-500">Add {money(100 - cartTotal)} more for free shipping.</p>}
      <div className="mt-3 flex items-baseline justify-between border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <span className="font-semibold">Total</span>
        {/* key on the value => remounts and animates whenever the total changes */}
        <motion.span key={cartTotal + ship} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-2xl font-extrabold">{money(cartTotal + ship)}</motion.span>
      </div>
      {cta}
    </aside>
  );
}

export default function Cart() {
  const { cart, setQty, removeFromCart, products } = useStore();
  const items = cart.map((c) => ({ ...c, p: products.find((p) => p.id === c.id)! })).filter((i) => i.p);

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-28 text-center">
        <ShoppingBag className="mb-4 h-14 w-14 text-zinc-300" />
        <h1 className="text-2xl font-extrabold">Your cart is empty</h1>
        <p className="mt-1 text-zinc-500">Find the right parts for your car and they’ll show up here.</p>
        <Link to="/products" className="mt-6 rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600">Browse parts</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-extrabold sm:text-3xl">Shopping cart</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {items.map(({ p, qty }) => (
              <motion.li key={p.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40, height: 0, marginTop: 0 }}
                className="flex gap-4 overflow-hidden rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
                <Link to={`/product/${p.id}`} className="w-24 shrink-0 overflow-hidden rounded-xl sm:w-28"><ProductImage src={p.images[0]} alt={p.alt ?? p.name} category={p.category} className="aspect-square w-full" sizes="112px" /></Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-xs font-semibold uppercase text-zinc-500">{p.brand}</span>
                  <Link to={`/product/${p.id}`} className="font-semibold leading-snug hover:text-orange-500">{p.name}</Link>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                    <div className="flex items-center rounded-lg border border-zinc-300 dark:border-zinc-700">
                      <button aria-label="Decrease" onClick={() => setQty(p.id, qty - 1)} className="p-2 hover:text-orange-500"><Minus className="h-3.5 w-3.5" /></button>
                      <motion.span key={qty} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="w-7 text-center text-sm font-semibold">{qty}</motion.span>
                      <button aria-label="Increase" onClick={() => setQty(p.id, qty + 1)} className="p-2 hover:text-orange-500"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <motion.span key={p.price * qty} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="font-extrabold">{money(p.price * qty)}</motion.span>
                    <button onClick={() => removeFromCart(p.id)} aria-label="Remove" className="rounded-lg p-2 text-zinc-400 transition hover:bg-rose-500/10 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <OrderSummary cta={<Link to="/checkout" className="mt-5 block rounded-xl bg-orange-500 py-3.5 text-center font-semibold text-white transition hover:bg-orange-600">Proceed to checkout</Link>} />
      </div>
    </div>
  );
}
