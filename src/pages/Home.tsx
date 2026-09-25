import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import {
  ArrowRight, RotateCcw, ShieldCheck, Timer, Truck, Lock,
  Zap, Award, Headphones, Star, ChevronLeft, ChevronRight,
  Package, Users, MapPin, Clock
} from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import Reveal from "../components/Reveal";
import VehicleSelector from "../components/VehicleSelector";
import { useStore } from "../context/StoreContext";
import { BRANDS, CATEGORIES } from "../lib/data";
import { CATEGORY_ICONS } from "../lib/icons";
import { discountPct, money } from "../lib/compat";
import ProductImage from "../components/ProductImage";

/* ───────────────────── Animated Counter Hook ───────────────────── */

function useCounter(end: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end, duration]);

  return { count, ref };
}

/* ───────────────────── Hero Background Video URLs ───────────────────── */

/**
 * Free stock video sources — auto-plays muted behind the hero.
 * The browser tries each source in order and uses the first that loads.
 *
 * Option 1 (recommended): Download a video and place it at /public/videos/hero-bg.mp4
 * Option 2: Stream from a free stock video CDN (Pexels — no API key needed for direct links)
 *
 * Suggested free videos (car engine / spare parts):
 *   https://www.pexels.com/video/close-up-of-car-engine-3173312/
 *   https://www.pexels.com/video/mechanic-fixing-car-3214438/
 *   https://www.pexels.com/video/a-person-using-a-wrench-on-an-engine-5089165/
 */
const HERO_VIDEOS = [
  "/videos/hero-bg.mp4",                                                               // local file (preferred)
  "https://videos.pexels.com/video-files/3173312/3173312-hd_1920_1080_30fps.mp4",      // Pexels CDN fallback 1
  "https://videos.pexels.com/video-files/5089165/5089165-hd_1920_1080_30fps.mp4",      // Pexels CDN fallback 2
];

/* ───────────────────── Hero ───────────────────── */

function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12 } },
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
  };

  return (
    <section ref={sectionRef} className="relative min-h-[90vh] overflow-hidden bg-zinc-950 text-white">
      {/* ── Background Video ── */}
      {!videoError && (
        <motion.div style={{ scale: videoScale }} className="absolute inset-0">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onCanPlay={() => setVideoLoaded(true)}
            onError={() => setVideoError(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${videoLoaded ? "opacity-100" : "opacity-0"}`}
          >
            {HERO_VIDEOS.map((src) => (
              <source key={src} src={src} type="video/mp4" />
            ))}
          </video>
        </motion.div>
      )}

      {/* ── Dark gradient overlay — keeps text legible over any video frame ── */}
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/80 to-zinc-950/60" />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />

      {/* ── Animated decorative orbs (visible whether video loads or not) ── */}
      <motion.div style={{ y: y1 }} className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-orange-500/20 blur-3xl" />
      <motion.div style={{ y: y2 }} className="absolute -bottom-40 -left-24 h-[24rem] w-[24rem] rounded-full bg-sky-500/15 blur-3xl" />
      <motion.div style={{ y: y3 }} className="absolute right-1/4 top-1/3 h-[18rem] w-[18rem] rounded-full bg-amber-500/10 blur-3xl" />

      {/* Dot grid texture */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:28px_28px]" />

      {/* ── Hero Content ── */}
      <div className="relative mx-auto max-w-7xl px-4 py-28 sm:py-36 lg:py-44">
        <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-3xl">
          <motion.span variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-orange-300 backdrop-blur-md">
            <ShieldCheck className="h-3.5 w-3.5" /> 100% exact-fit guarantee
          </motion.span>
          <motion.h1 variants={fadeUp} className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
            Find the{" "}
            <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 bg-clip-text text-transparent">
              exact parts
            </span>{" "}
            for your car.
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-300">
            Tell us what you drive and we only show what fits. Over 30 brands, verified compatibility and fast, tracked shipping worldwide.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-3">
            <button
              onClick={() => document.getElementById("finder")?.scrollIntoView({ behavior: "smooth", block: "center" })}
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-7 py-4 font-semibold text-white shadow-lg shadow-orange-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              Find parts for my car <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <Link to="/products" className="rounded-xl border border-white/20 px-7 py-4 font-semibold backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/30">
              Browse all parts
            </Link>
          </motion.div>
        </motion.div>

        {/* Hero stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-16 flex flex-wrap gap-8 border-t border-white/10 pt-8"
        >
          {[
            { label: "Auto Parts", value: "50K+" },
            { label: "Trusted Brands", value: "30+" },
            { label: "Happy Customers", value: "120K+" },
            { label: "Countries Shipped", value: "45+" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col">
              <span className="text-2xl font-extrabold text-orange-400">{s.value}</span>
              <span className="text-sm text-zinc-400">{s.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Bottom fade to page body ── */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white dark:from-zinc-950" />
    </section>
  );
}

/* ───────────────────── Vehicle Finder ───────────────────── */

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

/* ───────────────────── Section Title ───────────────────── */

function SectionTitle({ title, sub, align = "left" }: { title: string; sub?: string; align?: "left" | "center" }) {
  return (
    <div className={`mb-10 ${align === "center" ? "text-center" : ""}`}>
      <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">{title}</h2>
      {sub && <p className="mt-2 text-zinc-500 max-w-2xl mx-auto">{sub}</p>}
    </div>
  );
}

/* ───────────────────── Stats Bar ───────────────────── */

function StatsBar() {
  const stats = [
    { icon: Package, end: 50000, suffix: "+", label: "Parts in Stock" },
    { icon: Users, end: 120000, suffix: "+", label: "Happy Customers" },
    { icon: MapPin, end: 45, suffix: "+", label: "Countries Shipped" },
    { icon: Clock, end: 24, suffix: "/7", label: "Customer Support" },
  ];

  return (
    <section className="mx-auto mt-20 max-w-7xl px-4">
      <Reveal>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map(({ icon: Icon, end, suffix, label }, i) => {
            const { count, ref } = useCounter(end);
            return (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 text-center transition-all duration-300 hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 transition-all duration-300 group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span ref={ref} className="mt-4 block text-3xl font-extrabold tracking-tight">
                    {count.toLocaleString()}{suffix}
                  </span>
                  <span className="mt-1 block text-sm text-zinc-500">{label}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

/* ───────────────────── Categories ───────────────────── */

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
                className="group relative block overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/40 hover:shadow-xl hover:shadow-orange-500/10 dark:border-zinc-800 dark:bg-zinc-900">
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 transition-all duration-300 group-hover:rotate-6 group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-orange-500/30">
                    <Icon className="h-7 w-7" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{c.name}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{c.blurb}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-orange-500 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1">
                    Shop now <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* ───────────────────── Deals ───────────────────── */

function Deals() {
  const { addToCart, products } = useStore();
  const deals = products.filter((p) => p.dealOfDay && p.department !== "golf").slice(0, 3);
  return (
    <section className="mx-auto mt-20 max-w-7xl px-4">
      <SectionTitle title="Deal of the day" sub="Limited-time prices on customer favourites." />
      <div className="grid gap-5 md:grid-cols-3">
        {deals.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.1}>
            <div className="group relative overflow-hidden rounded-3xl bg-zinc-900 text-white transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10">
              <ProductImage src={p.images[0]} alt={p.alt ?? p.name} category={p.category} className="aspect-[16/10] w-full transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 33vw" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/55 to-transparent" />
              <span className="absolute left-4 top-4 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1 text-sm font-extrabold shadow-lg">-{discountPct(p)}%</span>
              <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs backdrop-blur"><Timer className="h-3.5 w-3.5" /> Today only</span>
              <div className="p-5">
                <p className="text-xs uppercase tracking-wide text-zinc-400">{p.brand}</p>
                <Link to={`/product/${p.id}`} className="mt-1 block text-lg font-bold transition-colors hover:text-orange-400">{p.name}</Link>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <span className="text-2xl font-extrabold">{money(p.price)}</span>
                    {p.oldPrice && <span className="ml-2 text-sm text-zinc-500 line-through">{money(p.oldPrice)}</span>}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => addToCart(p.id)}
                    className="rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold shadow-lg shadow-orange-500/20 transition hover:shadow-orange-500/40"
                  >
                    Add to cart
                  </motion.button>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────── Testimonials ───────────────────── */

const TESTIMONIALS = [
  { name: "James M.", role: "BMW 3 Series Owner", text: "Found exact brake pads for my E90 in minutes. Shipping was incredibly fast — 3 days to my door. Will definitely be back!", rating: 5 },
  { name: "Sarah L.", role: "Toyota Camry Owner", text: "The vehicle selector is genius. I used to spend hours checking compatibility. Now I just pick my car and everything shown fits perfectly.", rating: 5 },
  { name: "Michael R.", role: "Ford F-150 Owner", text: "Best prices I've found online for OEM-quality parts. The Brembo brake kit saved me over $200 compared to the dealer.", rating: 5 },
  { name: "Emily K.", role: "Honda Civic Owner", text: "Customer support helped me find a rare suspension part for my 2006 Civic. Responsive, knowledgeable, and genuinely helpful.", rating: 5 },
  { name: "David P.", role: "Mercedes C-Class Owner", text: "Ordered filters and oil for my service. Everything arrived well-packaged with clear labelling. Quality you can trust.", rating: 4 },
  { name: "Lisa T.", role: "VW Golf Owner", text: "The deal-of-the-day section is addictive! Snagged a Valeo alternator at 40% off. Excellent quality, zero issues.", rating: 5 },
];

function Testimonials() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const visibleCount = typeof window !== "undefined" && window.innerWidth >= 768 ? 3 : 1;
  const maxIndex = TESTIMONIALS.length - visibleCount;

  const next = () => { setDirection(1); setCurrent((prev) => Math.min(prev + 1, maxIndex)); };
  const prev = () => { setDirection(-1); setCurrent((prev) => Math.max(prev - 1, 0)); };

  // Auto-advance
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => {
        setDirection(1);
        return prev >= maxIndex ? 0 : prev + 1;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [maxIndex]);

  const visible = TESTIMONIALS.slice(current, current + visibleCount);

  return (
    <section className="mx-auto mt-24 max-w-7xl px-4">
      <div className="flex items-end justify-between mb-10">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">What our customers say</h2>
          <p className="mt-2 text-zinc-500">Trusted by 120,000+ car enthusiasts worldwide.</p>
        </div>
        <div className="hidden sm:flex gap-2">
          <button onClick={prev} disabled={current === 0} className="rounded-full border border-zinc-300 p-2.5 transition-all hover:border-orange-500 hover:bg-orange-500 hover:text-white disabled:opacity-30 disabled:hover:border-zinc-300 disabled:hover:bg-transparent disabled:hover:text-current dark:border-zinc-700">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={next} disabled={current >= maxIndex} className="rounded-full border border-zinc-300 p-2.5 transition-all hover:border-orange-500 hover:bg-orange-500 hover:text-white disabled:opacity-30 disabled:hover:border-zinc-300 disabled:hover:bg-transparent disabled:hover:text-current dark:border-zinc-700">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden">
        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            initial={{ opacity: 0, x: direction >= 0 ? 100 : -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction >= 0 ? -100 : 100 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="grid gap-5 md:grid-cols-3"
          >
            {visible.map((t) => (
              <div key={t.name} className="group relative rounded-2xl border border-zinc-200 bg-white p-6 transition-all duration-300 hover:border-orange-500/30 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < t.rating ? "fill-orange-400 text-orange-400" : "text-zinc-300 dark:text-zinc-600"}`} />
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">"{t.text}"</p>
                  <div className="mt-5 flex items-center gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-sm font-bold text-white">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-zinc-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots indicator */}
      <div className="mt-6 flex justify-center gap-2">
        {Array.from({ length: maxIndex + 1 }).map((_, i) => (
          <button
            key={i}
            onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
            className={`h-2 rounded-full transition-all duration-300 ${i === current ? "w-8 bg-orange-500" : "w-2 bg-zinc-300 dark:bg-zinc-700 hover:bg-orange-300"}`}
          />
        ))}
      </div>
    </section>
  );
}

/* ───────────────────── Brands Marquee ───────────────────── */

function Brands() {
  const row = [...BRANDS, ...BRANDS];
  return (
    <section className="mt-20 overflow-hidden border-y border-zinc-200 py-10 dark:border-zinc-800">
      <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-zinc-500">Trusted by the world's best brands</p>
      <div className="flex w-max animate-marquee gap-16 hover:[animation-play-state:paused]">
        {row.map((b, i) => (
          <Link key={i} to={`/products?brand=${b.name}`} className="text-3xl font-black tracking-tight text-zinc-300 transition-all duration-300 hover:text-orange-500 hover:scale-110 dark:text-zinc-700 dark:hover:text-orange-500">
            {b.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────── Why Choose Us ───────────────────── */

function WhyChooseUs() {
  const features = [
    { icon: ShieldCheck, title: "Exact Fit Guarantee", text: "Every part is verified for your specific vehicle. Not the right fit? We replace it free of charge, no questions asked.", color: "from-emerald-500 to-teal-500" },
    { icon: Zap, title: "Lightning Fast Delivery", text: "Same-day dispatch from local warehouses. Tracked shipping with real-time updates straight to your door.", color: "from-orange-500 to-amber-500" },
    { icon: Award, title: "Premium Quality Parts", text: "Only OEM and OEM-equivalent parts from trusted manufacturers. Every product passes rigorous quality checks.", color: "from-violet-500 to-purple-500" },
    { icon: Headphones, title: "Expert Support 24/7", text: "Our team of certified mechanics is always ready to help you find the right part or answer technical questions.", color: "from-sky-500 to-blue-500" },
  ];

  return (
    <section className="mx-auto mt-24 max-w-7xl px-4">
      <SectionTitle title="Why choose AutoParts Hub" sub="We go beyond selling parts — we deliver peace of mind." align="center" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, text, color }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
          >
            {/* Subtle gradient on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 transition-opacity duration-500 group-hover:opacity-[0.06]`} />
            <div className="relative">
              <motion.span
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 260, damping: 12, delay: i * 0.1 + 0.15 }}
                className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
              >
                <Icon className="h-7 w-7" />
              </motion.span>
              <h3 className="mt-5 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{text}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────── Benefits Strip ───────────────────── */

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

/* ───────────────────── Newsletter CTA ───────────────────── */

function NewsletterCTA() {
  const { toast } = useStore();
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    toast("Thanks for subscribing! Check your inbox for exclusive deals.");
    setEmail("");
  };

  return (
    <section className="mx-auto mt-24 max-w-7xl px-4">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-10 sm:p-14 lg:p-20">
          {/* Decorative orbs */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)] [background-size:24px_24px]" />

          <div className="relative mx-auto max-w-2xl text-center">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold text-orange-400"
            >
              <Zap className="h-3.5 w-3.5" /> Exclusive Offers
            </motion.span>
            <h2 className="mt-5 text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
              Get <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">20% off</span> your first order
            </h2>
            <p className="mt-4 text-zinc-400">
              Subscribe to our newsletter and get exclusive deals, early access to sales, and expert maintenance tips delivered to your inbox.
            </p>
            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="rounded-xl border border-zinc-700 bg-zinc-800/50 px-5 py-3.5 text-sm text-white outline-none backdrop-blur transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 sm:w-80"
              />
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                className="rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-3.5 font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:shadow-xl hover:shadow-orange-500/30"
              >
                Subscribe
              </motion.button>
            </form>
            <p className="mt-4 text-xs text-zinc-500">No spam, ever. Unsubscribe anytime.</p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ───────────────────── Home Page ───────────────────── */

export default function Home() {
  const { products } = useStore();
  const popular = products.filter((p) => p.rating >= 4.7 && p.department !== "golf").slice(0, 4);
  return (
    <>
      <Hero />
      <Finder />
      <StatsBar />
      <Categories />
      <Deals />
      <section className="mx-auto mt-20 max-w-7xl px-4">
        <SectionTitle title="Popular right now" sub="Top-rated parts loved by our customers." />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {popular.map((p, i) => <Reveal key={p.id} delay={i * 0.06}><ProductCard product={p} /></Reveal>)}
        </div>
      </section>
      <Testimonials />
      <Brands />
      <WhyChooseUs />
      <Benefits />
      <NewsletterCTA />
    </>
  );
}
