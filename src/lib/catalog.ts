/**
 * Catalogue reads.
 *
 * Every function talks to Supabase when credentials are configured and falls
 * back to the bundled mock JSON otherwise, returning the same `Product` shape
 * either way so callers never branch on the source.
 */
import type { Product, Vehicle } from "../types";
import { ALL_PRODUCTS, PRODUCTS } from "./data";
import { isCompatible } from "./compat";
import { isSupabaseEnabled, supabase } from "./supabase";

/** Row shape of the public.products_full view. */
interface ProductRow {
  id: string; name: string; price: number; old_price: number | null;
  description: string; specs: Record<string, string>; rating: number;
  in_stock: boolean; deal_of_day: boolean; universal: boolean; alt: string | null;
  brand: string; category_id: string; department: "auto" | "golf"; images: string[];
  compatibility: { make: string; model: string; yearFrom: number; yearTo: number; fuels: string[] | null }[];
  review_count: number;
}

const toProduct = (r: ProductRow): Product => ({
  id: r.id,
  name: r.name,
  brand: r.brand,
  category: r.category_id,
  department: r.department ?? "auto",
  price: Number(r.price),
  ...(r.old_price != null ? { oldPrice: Number(r.old_price) } : {}),
  images: r.images ?? [],
  alt: r.alt ?? undefined,
  description: r.description,
  specs: r.specs ?? {},
  compatibility: (r.compatibility ?? []).map((c) => ({
    make: c.make, model: c.model, yearFrom: c.yearFrom, yearTo: c.yearTo,
    ...(c.fuels ? { fuels: c.fuels } : {}),
  })),
  universal: r.universal,
  rating: Number(r.rating),
  reviews: [], // bodies are loaded separately by the detail page
  reviewCount: Number(r.review_count ?? 0),
  inStock: r.in_stock,
  ...(r.deal_of_day ? { dealOfDay: true } : {}),
});

export async function fetchProducts(): Promise<Product[]> {
  if (!isSupabaseEnabled || !supabase) return ALL_PRODUCTS;
  const { data, error } = await supabase.from("products_full").select("*");
  if (error) { console.warn("Supabase unavailable, using mock data:", error.message); return ALL_PRODUCTS; }
  return (data as ProductRow[]).map(toProduct);
}

export async function fetchProduct(id: string): Promise<Product | null> {
  if (!isSupabaseEnabled || !supabase) return ALL_PRODUCTS.find((p) => p.id === id) ?? null;
  const { data, error } = await supabase.from("products_full").select("*").eq("id", id).maybeSingle();
  if (error || !data) return ALL_PRODUCTS.find((p) => p.id === id) ?? null;
  const product = toProduct(data as ProductRow);
  const { data: reviews } = await supabase
    .from("reviews").select("author, rating, body").eq("product_id", id)
    .order("created_at", { ascending: false });
  if (reviews) product.reviews = reviews.map((r) => ({ author: r.author, rating: r.rating, text: r.body }));
  return product;
}

/**
 * Parts that fit a vehicle. The rule lives in the database as
 * products_for_vehicle(), so server and client cannot drift apart; the mock path
 * reuses the identical predicate from compat.ts.
 */
export async function fetchCompatible(v: Vehicle): Promise<Product[]> {
  if (!isSupabaseEnabled || !supabase) return PRODUCTS.filter((p) => isCompatible(p, v));
  const { data, error } = await supabase.rpc("products_for_vehicle", {
    p_year: v.year, p_make: v.make, p_model: v.model, p_fuel: v.fuel,
  });
  if (error || !data) return PRODUCTS.filter((p) => isCompatible(p, v));
  const ids = new Set((data as { id: string }[]).map((r) => r.id));
  return (await fetchProducts()).filter((p) => ids.has(p.id));
}

/** Header autocomplete, backed by the trigram-ranked search_products(). */
export async function searchProducts(q: string, limit = 8) {
  if (!isSupabaseEnabled || !supabase) {
    const t = q.toLowerCase();
    return PRODUCTS.filter((p) => `${p.name} ${p.brand}`.toLowerCase().includes(t))
      .slice(0, limit)
      .map((p) => ({ id: p.id, name: p.name, brand: p.brand, price: p.price, image: p.images[0] }));
  }
  const { data, error } = await supabase.rpc("search_products", { p_query: q, p_limit: limit });
  if (error || !data) return [];
  return data as { id: string; name: string; brand: string; price: number; image: string }[];
}
