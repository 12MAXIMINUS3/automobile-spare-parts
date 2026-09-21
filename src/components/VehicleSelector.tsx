import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Car, Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { VEHICLES } from "../lib/data";
import { isCompatible } from "../lib/compat";
import ProductCard from "./ProductCard";
import type { Vehicle } from "../types";

const YEARS = Array.from({ length: 2022 - 2012 + 1 }, (_, i) => 2022 - i);
type Draft = { year?: number; make?: string; model?: string; fuel?: string };
const ORDER: (keyof Draft)[] = ["year", "make", "model", "fuel"];

/**
 * Vehicle selection flow: Year -> Make -> Model -> Fuel.
 * Each later list is derived from earlier picks (makes/models must cover the year),
 * and changing an earlier field resets the fields after it. Only when all four are
 * chosen is the vehicle committed to the global store.
 */
function useVehicleDraft() {
  const { vehicle, setVehicle } = useStore();
  const [d, setD] = useState<Draft>(vehicle ?? {});

  // Keep the draft in sync when the vehicle is changed/cleared elsewhere.
  useEffect(() => { if (vehicle) setD(vehicle); }, [vehicle]);

  const makes = useMemo(
    () => VEHICLES.filter((m) => d.year && m.models.some((x) => d.year! >= x.yearFrom && d.year! <= x.yearTo)),
    [d.year],
  );
  const models = useMemo(
    () => makes.find((m) => m.name === d.make)?.models.filter((x) => d.year! >= x.yearFrom && d.year! <= x.yearTo) ?? [],
    [makes, d.make, d.year],
  );
  const fuels = useMemo(() => models.find((m) => m.name === d.model)?.fuels ?? [], [models, d.model]);

  /** Apply `patch`, then wipe every field after `field`. */
  const set = (patch: Draft, field: keyof Draft) => {
    const next: Draft = { ...d, ...patch };
    ORDER.slice(ORDER.indexOf(field) + 1).forEach((k) => delete next[k]);
    setD(next);
    if (next.year && next.make && next.model && next.fuel) setVehicle(next as Vehicle);
    else if (vehicle) setVehicle(null); // a partial edit invalidates the committed vehicle
  };
  const clear = () => { setD({}); setVehicle(null); };
  return { d, set, clear, makes, models, fuels, vehicle };
}

const selectCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900";

/** Compact 4-dropdown bar used in the header. */
function Bar() {
  const { d, set, clear, makes, models, fuels, vehicle } = useVehicleDraft();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Car className="hidden h-5 w-5 shrink-0 text-orange-500 sm:block" />
      <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
        <select aria-label="Year" className={selectCls} value={d.year ?? ""} onChange={(e) => set({ year: Number(e.target.value) || undefined }, "year")}>
          <option value="">Year</option>{YEARS.map((y) => <option key={y}>{y}</option>)}
        </select>
        <select aria-label="Make" className={selectCls} disabled={!d.year} value={d.make ?? ""} onChange={(e) => set({ make: e.target.value || undefined }, "make")}>
          <option value="">Make</option>{makes.map((m) => <option key={m.name}>{m.name}</option>)}
        </select>
        <select aria-label="Model" className={selectCls} disabled={!d.make} value={d.model ?? ""} onChange={(e) => set({ model: e.target.value || undefined }, "model")}>
          <option value="">Model</option>{models.map((m) => <option key={m.name}>{m.name}</option>)}
        </select>
        <select aria-label="Fuel" className={selectCls} disabled={!d.model} value={d.fuel ?? ""} onChange={(e) => set({ fuel: e.target.value || undefined }, "fuel")}>
          <option value="">Fuel / engine</option>{fuels.map((f) => <option key={f}>{f}</option>)}
        </select>
      </div>
      {vehicle && (
        <button onClick={clear} className="flex items-center gap-1 self-start rounded-full bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-600 transition hover:bg-orange-500/20 dark:text-orange-400">
          <Check className="h-3.5 w-3.5" /> {vehicle.year} {vehicle.make} {vehicle.model} <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/** Step-by-step finder used on the home page. */
function Wizard() {
  const { d, set, clear, makes, models, fuels, vehicle } = useVehicleDraft();
  const { products } = useStore();
  const steps = [
    { key: "year" as const, label: "Select year", options: YEARS.map(String) },
    { key: "make" as const, label: "Select make", options: makes.map((m) => m.name) },
    { key: "model" as const, label: "Select model", options: models.map((m) => m.name) },
    { key: "fuel" as const, label: "Select fuel / engine", options: fuels },
  ];
  // Current step = first field not yet chosen; 4 means "done".
  const found = steps.findIndex((s) => d[s.key] === undefined);
  const idx = found === -1 ? 4 : found;
  // Back = clear the last chosen field (field before the current step) and everything after it.
  const back = () => set({ [steps[idx - 1].key]: undefined }, steps[idx - 1].key);
  const recommended = useMemo(
    () => (vehicle ? products.filter((p) => isCompatible(p, vehicle) && !p.universal).slice(0, 4) : []),
    [vehicle, products],
  );

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 text-zinc-900 shadow-xl sm:p-7 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
      <div className="mb-5 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.key} className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <motion.div className="h-full bg-orange-500" initial={false} animate={{ width: i < idx ? "100%" : "0%" }} transition={{ duration: 0.35 }} />
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {idx < 4 ? (
          <motion.div key={idx} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-bold">{steps[idx].label}</h3>
              {idx > 0 && (
                <button onClick={back} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-orange-500">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              )}
            </div>
            <p className="mb-3 text-xs text-zinc-500">
              {[d.year, d.make, d.model].filter(Boolean).join(" · ") || "Step 1 of 4"}
            </p>
            <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
              {steps[idx].options.map((o) => (
                <button
                  key={o}
                  onClick={() => set({ [steps[idx].key]: steps[idx].key === "year" ? Number(o) : o }, steps[idx].key)}
                  className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-medium transition hover:-translate-y-0.5 hover:border-orange-500 hover:bg-orange-500/5 hover:text-orange-600 dark:border-zinc-700"
                >
                  {o}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="done" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">Your vehicle</p>
                <h3 className="text-lg font-bold">{d.year} {d.make} {d.model} · {d.fuel}</h3>
              </div>
              <div className="flex gap-2">
                <button onClick={clear} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">Change</button>
                <Link to="/products" className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600">Shop all compatible</Link>
              </div>
            </div>
            <p className="mb-3 text-sm text-zinc-500">Recommended parts for your car:</p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {recommended.map((p) => <ProductCard key={p.id} product={p} compact />)}
              {recommended.length === 0 && <p className="col-span-full text-sm text-zinc-500">No exact-fit parts yet — browse universal parts instead.</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function VehicleSelector({ variant }: { variant: "bar" | "wizard" }) {
  return variant === "bar" ? <Bar /> : <Wizard />;
}
