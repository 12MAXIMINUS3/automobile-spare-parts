import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, RotateCcw, ShieldCheck, Timer, Truck, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import Reveal from "../components/Reveal";
import VehicleSelector from "../components/VehicleSelector";
import { useStore } from "../context/StoreContext";
import { BRANDS, CATEGORIES } from "../lib/data";
import { CATEGORY_ICONS } from "../lib/icons";
import { discountPct, money } from "../lib/compat";
import ProductImage from "../components/ProductImage";

function Hero() {
  const ref = useRef<HTMLElement>(null);
  // Parallax: background layers drift at different speeds relative to page scroll.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-zinc-950 text-white">
      <motion.div style={{ y: y1 }} className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-orange-500/30 blur-3xl" />
      <motion.div style={{ y: y2 }} className="absolute -bottom-40 -left-24 h-[24rem] w-[24rem] rounded-full bg-sky-500/20 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:28px_28px]" />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:py-28">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }} className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-orange-300">
            <ShieldCheck className="h-3.5 w-3.5" /> 100% exact-fit guarantee
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Find the <span className="text-orange-500">exact parts</span> for your car.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-zinc-300">
            Tell us what you drive and we only show what fits. Over 30 brands, verified compatibility and fast, tracked shipping worldwide.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => document.getElementById("finder")?.scrollIntoView({ behavior: "smooth", block: "center" })}
              className="group inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600 hover:shadow-orange-500/50"
            >
              Find parts for my car <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <Link to="/products" className="rounded-xl border border-white/20 px-6 py-3.5 font-semibold transition hover:bg-white/10">Browse all parts</Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Finder() {
  const { vehicle } = useStore();
  return (
    <section id="finder" className="mx-auto -mt-10 max-w-7xl px-4 sm:-mt-14">
      <Reveal>
        <div className="mx-auto max-w-4xl">
          <VehicleSelector variant="wizard" />
          {!vehicle && <p className="mt-3 text-center text-sm text-zinc-500">Pick your vehicle to see compatible parts.</p>}
        </div>
      </Reveal>
    </section>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
      {sub && <p className="mt-1 text-zinc-500">{sub}</p>}
    </div>
  );
}

function Categories() {
  return (
    <section className="mx-auto mt-20 max-w-7xl px-4">
      <SectionTitle title="Shop by category" sub="Everything from consumables to complete repairs." />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {CATEGORIES.map((c, i) => {
          const Icon = CATEGORY_ICONS[c.icon];
          return (
            <Reveal key={c.id} delay={i * 0.05}>
              <Link to={`/products?category=${c.id}`}
                className="group block rounded-2xl border border-zinc-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:border-orange-500/50 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 transition duration-300 group-hover:rotate-12 group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-bold">{c.name}</h3>
                <p className="text-sm text-zinc-500">{c.blurb}</p>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function Deals() {
  const { addToCart, products } = useStore();
  const deals = products.filter((p) => p.dealOfDay).slice(0, 3);
  return (
    <section className="mx-auto mt-20 max-w-7xl px-4">
      <SectionTitle title="Deal of the day" sub="Limited-time prices on customer favourites." />
      <div className="grid gap-5 md:grid-cols-3">
        {deals.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.1}>
            <div className="relative overflow-hidden rounded-3xl bg-zinc-900 text-white">
              <ProductImage src={p.images[0]} alt={p.alt ?? p.name} category={p.category} className="aspect-[16/10] w-full" sizes="(max-width: 768px) 100vw, 33vw" />
              {/* scrim keeps the overlaid badges legible whatever the photo behind them */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/55 to-transparent" />
              <span className="absolute left-4 top-4 rounded-full bg-orange-500 px-3 py-1 text-sm font-extrabold">-{discountPct(p)}%</span>
              <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs backdrop-blur"><Timer className="h-3.5 w-3.5" /> Today only</span>
              <div className="p-5">
                <p className="text-xs uppercase tracking-wide text-zinc-400">{p.brand}</p>
                <Link to={`/product/${p.id}`} className="mt-1 block text-lg font-bold hover:text-orange-400">{p.name}</Link>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <span className="text-2xl font-extrabold">{money(p.price)}</span>
                    {p.oldPrice && <span className="ml-2 text-sm text-zinc-500 line-through">{money(p.oldPrice)}</span>}
                  </div>
                  <button onClick={() => addToCart(p.id)} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold transition hover:bg-orange-600 active:scale-95">Add to cart</button>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Brands() {
  const row = [...BRANDS, ...BRANDS]; // duplicated so translateX(-50%) loops seamlessly
  return (
    <section className="mt-20 overflow-hidden border-y border-zinc-200 py-8 dark:border-zinc-800">
      <p className="mb-5 text-center text-xs font-semibold uppercase tracking-widest text-zinc-500">Trusted brands</p>
      <div className="flex w-max animate-marquee gap-12 hover:[animation-play-state:paused]">
        {row.map((b, i) => (
          <Link key={i} to={`/products?brand=${b.name}`} className="text-2xl font-black tracking-tight text-zinc-300 transition hover:text-orange-500 dark:text-zinc-700 dark:hover:text-orange-500">
            {b.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

function Benefits() {
  const items = [
    { icon: ShieldCheck, title: "Exact fit guarantee", text: "Not the right part? We replace it, free." },
    { icon: Truck, title: "Fast worldwide shipping", text: "Tracked delivery from local warehouses." },
    { icon: Lock, title: "Secure payments", text: "Encrypted checkout with all major cards." },
    { icon: RotateCcw, title: "Easy returns", text: "30 days, no questions asked." },
  ];
  return (
    <section className="mx-auto mt-20 max-w-7xl px-4">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, text }, i) => (
          <motion.div key={title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            className="rounded-2xl bg-zinc-100 p-6 dark:bg-zinc-900">
            <motion.span
              initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 260, damping: 12, delay: i * 0.1 + 0.15 }}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white"
            >
              <Icon className="h-6 w-6" />
            </motion.span>
            <h3 className="mt-4 font-bold">{title}</h3>
            <p className="mt-1 text-sm text-zinc-500">{text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { products } = useStore();
  const popular = products.filter((p) => p.rating >= 4.7).slice(0, 4);
  return (
    <>
      <Hero />
      <Finder />
      <Categories />
      <Deals />
      <section className="mx-auto mt-20 max-w-7xl px-4">
        <SectionTitle title="Popular right now" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {popular.map((p, i) => <Reveal key={p.id} delay={i * 0.06}><ProductCard product={p} /></Reveal>)}
        </div>
      </section>
      <Brands />
      <Benefits />
    </>
  );
}
