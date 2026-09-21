import { Star } from "lucide-react";

export default function Stars({ value, count }: { value: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400" aria-label={`${value} out of 5`}>
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={`h-3.5 w-3.5 ${i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-zinc-300 dark:text-zinc-600"}`} />
        ))}
      </span>
      {value.toFixed(1)}{count !== undefined && ` (${count})`}
    </span>
  );
}
