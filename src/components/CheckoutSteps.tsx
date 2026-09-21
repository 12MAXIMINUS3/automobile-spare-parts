import { motion } from "framer-motion";
import { Check } from "lucide-react";

/** Horizontal stepper; the connector line fills as steps complete. */
export default function CheckoutSteps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="mb-8 flex items-center">
      {steps.map((s, i) => (
        <li key={s} className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`}>
          <div className="flex items-center gap-2">
            <motion.span
              animate={{ backgroundColor: i <= current ? "#f97316" : "#a1a1aa", scale: i === current ? 1.1 : 1 }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
            >
              {i < current ? <Check className="h-4 w-4" /> : i + 1}
            </motion.span>
            <span className={`hidden text-sm font-semibold sm:inline ${i <= current ? "" : "text-zinc-400"}`}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div className="mx-3 h-0.5 flex-1 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
              <motion.div className="h-full bg-orange-500" initial={false} animate={{ width: i < current ? "100%" : "0%" }} transition={{ duration: 0.4 }} />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
