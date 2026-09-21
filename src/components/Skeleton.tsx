export const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800 ${className}`} />
);

export const ProductCardSkeleton = () => (
  <div className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
    <Skeleton className="aspect-square w-full" />
    <Skeleton className="mt-3 h-3 w-1/3" />
    <Skeleton className="mt-2 h-4 w-5/6" />
    <Skeleton className="mt-3 h-5 w-1/2" />
    <Skeleton className="mt-3 h-9 w-full" />
  </div>
);
