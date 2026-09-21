import { useCallback, useState } from "react";
import { CATEGORIES } from "../lib/data";
import { CATEGORY_ICONS } from "../lib/icons";

/** "/images/products/x-1.jpg" -> "/images/products/x-1@400.jpg 400w, /images/products/x-1.jpg 800w" */
const srcSetFor = (src: string) => `${src.replace(/\.jpg$/, "@400.jpg")} 400w, ${src} 800w`;

/**
 * Product photo that fades in once decoded, falling back to a category icon if the
 * file is missing. Two sizes are shipped per photo (400px for grid cards, 800px for
 * the detail gallery); `sizes` tells the browser which to pull.
 */
export default function ProductImage({
  src,
  alt,
  category,
  className = "",
  sizes = "(max-width: 640px) 50vw, 300px",
  priority = false,
}: {
  src?: string;
  alt?: string;
  category: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const Icon = CATEGORY_ICONS[CATEGORIES.find((c) => c.id === category)?.icon ?? "cog"];

  // A cached image can finish loading before React attaches onLoad, which would
  // otherwise leave it stuck at opacity 0. Catch that case on mount.
  const ref = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete) node.naturalWidth > 0 ? setLoaded(true) : setFailed(true);
  }, []);

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 ${className}`} role="img" aria-label={alt || "Product image unavailable"}>
        <Icon className="h-1/3 w-1/3 text-zinc-400" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-zinc-100 dark:bg-zinc-800 ${className}`}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-zinc-200 dark:bg-zinc-800" />}
      <img
        key={src} // remount on src change so the mount-time cache check re-runs
        ref={ref}
        src={src}
        srcSet={srcSetFor(src)}
        sizes={sizes}
        alt={alt ?? ""}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`relative h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
