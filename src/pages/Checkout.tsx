import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import CheckoutSteps from "../components/CheckoutSteps";
import { useAuth } from "../context/AuthContext";
import { useStore } from "../context/StoreContext";
import { money } from "../lib/compat";
import { shippingFor } from "../lib/pricing";
import { supabase } from "../lib/supabase";
import { OrderSummary } from "./Cart";

const STEPS = ["Shipping", "Payment", "Review"];
type Form = Record<"name" | "email" | "address" | "city" | "zip" | "cardName" | "card" | "expiry" | "cvc", string>;
const EMPTY: Form = { name: "", email: "", address: "", city: "", zip: "", cardName: "", card: "", expiry: "", cvc: "" };

/** Per-step validators return {field: message}; an empty object means the step is valid. */
const VALIDATE: Record<number, (f: Form) => Partial<Form>> = {
  0: (f) => ({
    ...(f.name.trim().length < 2 && { name: "Enter your full name." }),
    ...(!/^\S+@\S+\.\S+$/.test(f.email) && { email: "Enter a valid email address." }),
    ...(f.address.trim().length < 5 && { address: "Enter your street address." }),
    ...(!f.city.trim() && { city: "Enter your city." }),
    ...(f.zip.trim().length < 3 && { zip: "Enter a valid postal code." }),
  }),
  1: (f) => ({
    ...(!f.cardName.trim() && { cardName: "Enter the name on the card." }),
    ...(f.card.replace(/\s/g, "").length !== 16 && { card: "Card number must be 16 digits." }),
    ...(!/^(0[1-9]|1[0-2])\/\d{2}$/.test(f.expiry) && { expiry: "Use MM/YY." }),
    ...(!/^\d{3,4}$/.test(f.cvc) && { cvc: "3–4 digits." }),
  }),
  2: () => ({}),
};

function Field({ label, name, form, errors, onChange, placeholder, className = "" }: {
  label: string; name: keyof Form; form: Form; errors: Partial<Form>; onChange: (k: keyof Form, v: string) => void; placeholder?: string; className?: string;
}) {
  const err = errors[name];
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1 block text-sm font-medium">{label}</label>
      <input id={name} value={form[name]} placeholder={placeholder} onChange={(e) => onChange(name, e.target.value)} aria-invalid={!!err}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 dark:bg-zinc-900 ${err ? "border-rose-500 focus:ring-rose-500/30" : "border-zinc-300 focus:border-orange-500 focus:ring-orange-500/30 dark:border-zinc-700"}`} />
      <AnimatePresence>
        {err && <motion.p initial={{ opacity: 0, height: 0, y: -4 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0 }} className="mt-1 text-xs text-rose-500">{err}</motion.p>}
      </AnimatePresence>
    </div>
  );
}

/** Success screen: SVG checkmark that "draws" itself + a burst of confetti pieces. */
function Success({ order }: { order: { id: string; total: number; email: string } }) {
  const colors = ["#f97316", "#0ea5e9", "#22c55e", "#eab308", "#ec4899"];
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    x: Math.cos((i / 28) * Math.PI * 2) * (90 + (i % 5) * 30),
    y: Math.sin((i / 28) * Math.PI * 2) * (90 + (i % 4) * 30) + 60,
    r: (i * 47) % 360, c: colors[i % colors.length],
  }));
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
        {pieces.map((p, i) => (
          <motion.span key={i} className="absolute h-2 w-2 rounded-sm" style={{ backgroundColor: p.c }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }} animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.r, scale: 0.6 }} transition={{ duration: 1.3, ease: "easeOut", delay: 0.2 }} />
        ))}
        <motion.svg viewBox="0 0 52 52" className="h-24 w-24" initial="hidden" animate="visible">
          <motion.circle cx="26" cy="26" r="24" fill="#22c55e" variants={{ hidden: { scale: 0 }, visible: { scale: 1 } }} transition={{ type: "spring", stiffness: 200, damping: 14 }} />
          <motion.path d="M14 27 l8 8 l16 -17" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
            variants={{ hidden: { pathLength: 0 }, visible: { pathLength: 1 } }} transition={{ duration: 0.5, delay: 0.35 }} />
        </motion.svg>
      </div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <h1 className="text-3xl font-extrabold">Order placed!</h1>
        <p className="mt-2 text-zinc-500">Order <b className="text-zinc-900 dark:text-zinc-100">#{order.id}</b> · {money(order.total)}<br />A confirmation was “sent” to {order.email}.</p>
        <Link to="/" className="mt-8 inline-block rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600">Continue shopping</Link>
      </motion.div>
    </div>
  );
}

export default function Checkout() {
  const { cart, cartTotal, clearCart, products, toast } = useStore();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Form>>({});
  const [order, setOrder] = useState<{ id: string; total: number; email: string } | null>(null);
  const [placing, setPlacing] = useState(false);

  const onChange = (k: keyof Form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined })); // clear a field's error as the user fixes it
  };
  const next = () => {
    const e = VALIDATE[step](form);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep(step + 1);
  };
  /**
   * Writes the order and its lines, then clears the cart. Line items carry a copy
   * of the name and price so the record stays accurate if the catalogue changes.
   * If the write fails the order still completes locally - this is a demo store,
   * and losing the confirmation screen would be worse than losing the row.
   */
  const place = async () => {
    setPlacing(true);
    const shipping = shippingFor(cartTotal);
    const total = cartTotal + shipping;
    let id = String(Math.floor(100000 + Math.random() * 900000));

    if (supabase && user) {
      const { data, error } = await supabase.from("orders").insert({
        user_id: user.id,
        subtotal: cartTotal,
        shipping,
        total,
        ship_to: { name: form.name, email: form.email, address: form.address, city: form.city, zip: form.zip },
      }).select("id").single();

      if (error || !data) toast("Order saved locally only", "error");
      else {
        id = data.id.slice(0, 8).toUpperCase();
        const lines = cart.map((c) => {
          const p = products.find((x) => x.id === c.id);
          return { order_id: data.id, product_id: c.id, name: p?.name ?? c.id, unit_price: p?.price ?? 0, qty: c.qty };
        });
        const { error: lineErr } = await supabase.from("order_items").insert(lines);
        if (lineErr) toast("Some order lines were not saved", "error");
      }
    }

    setOrder({ id, total, email: form.email });
    clearCart();
  };

  if (order) return <Success order={order} />;
  if (cart.length === 0) {
    return <div className="py-32 text-center"><p className="text-lg font-semibold">Your cart is empty.</p><Link to="/products" className="text-orange-500 underline">Browse parts</Link></div>;
  }

  const fp = { form, errors, onChange };
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-extrabold sm:text-3xl">Checkout</h1>
      <CheckoutSteps steps={STEPS} current={step} />
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="rounded-2xl border border-zinc-200 p-5 sm:p-7 dark:border-zinc-800">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
              {step === 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field {...fp} name="name" label="Full name" className="sm:col-span-2" />
                  <Field {...fp} name="email" label="Email" className="sm:col-span-2" />
                  <Field {...fp} name="address" label="Street address" className="sm:col-span-2" />
                  <Field {...fp} name="city" label="City" />
                  <Field {...fp} name="zip" label="Postal code" />
                </div>
              )}
              {step === 1 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <p className="text-xs text-zinc-500 sm:col-span-2">Demo only — do not enter a real card. Any 16 digits work.</p>
                  <Field {...fp} name="cardName" label="Name on card" className="sm:col-span-2" />
                  <Field {...fp} name="card" label="Card number" placeholder="4242 4242 4242 4242" className="sm:col-span-2" />
                  <Field {...fp} name="expiry" label="Expiry" placeholder="MM/YY" />
                  <Field {...fp} name="cvc" label="CVC" />
                </div>
              )}
              {step === 2 && (
                <div className="space-y-4 text-sm">
                  <div><h3 className="font-bold">Ship to</h3><p className="text-zinc-500">{form.name}<br />{form.address}, {form.city} {form.zip}<br />{form.email}</p></div>
                  <div><h3 className="font-bold">Payment</h3><p className="text-zinc-500">Card ending in {form.card.replace(/\s/g, "").slice(-4)}</p></div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-7 flex justify-between">
            <button onClick={() => setStep(step - 1)} disabled={step === 0 || placing} className="rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-500 transition hover:text-orange-500 disabled:invisible">Back</button>
            {step < 2
              ? <button onClick={next} className="rounded-xl bg-orange-500 px-7 py-3 font-semibold text-white transition hover:bg-orange-600 active:scale-95">Continue</button>
              : <button onClick={place} disabled={placing} className="rounded-xl bg-orange-500 px-7 py-3 font-semibold text-white transition hover:bg-orange-600 active:scale-95 disabled:opacity-60">{placing ? "Placing order…" : "Place order"}</button>}
          </div>
        </div>
        <OrderSummary />
      </div>
    </div>
  );
}
