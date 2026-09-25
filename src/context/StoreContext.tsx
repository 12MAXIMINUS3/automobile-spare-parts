import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CartItem, Product, Vehicle } from "../types";
import { PRODUCTS } from "../lib/data";
import { fetchProducts } from "../lib/catalog";
import { isSupabaseEnabled, supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

export interface Toast { id: number; message: string; tone: "success" | "info" | "error" }

interface Store {
  products: Product[];
  productsLoading: boolean;
  vehicle: Vehicle | null;
  setVehicle: (v: Vehicle | null) => void;
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  dark: boolean;
  toggleDark: () => void;
  toasts: Toast[];
  toast: (message: string, tone?: Toast["tone"]) => void;
  addProduct: (newProd: Omit<Product, "id"> & { id?: string }) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  updateProductInStore: (id: string, patch: Partial<Product>) => void;
}

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside <StoreProvider>");
  return s;
};

/** localStorage-backed state; every access is guarded (private mode etc.). */
function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  }, [key, value]);
  return [value, setValue] as const;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const [vehicle, setVehicle] = usePersisted<Vehicle | null>("ap.vehicle", null);
  const [cart, setCart] = usePersisted<CartItem[]>("ap.cart", []);
  const [wishlist, setWishlist] = usePersisted<string[]>("ap.wishlist", []);
  const [dark, setDark] = usePersisted<boolean>("ap.dark", false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [customProducts, setCustomProducts] = usePersisted<Product[]>("ap.custom_products", []);
  const [products, setProducts] = useState<Product[]>(() => [...customProducts, ...PRODUCTS]);
  const [productsLoading, setProductsLoading] = useState(isSupabaseEnabled);
  const synced = useRef(false); // guards the one-time local -> remote migration

  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);

  const toast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  // Catalogue: Supabase when configured, bundled JSON + custom uploaded products otherwise.
  useEffect(() => {
    let cancelled = false;
    fetchProducts().then((p) => {
      if (!cancelled) {
        const existingIds = new Set(p.map((x) => x.id));
        const uniqueCustoms = customProducts.filter((c) => !existingIds.has(c.id));
        setProducts([...uniqueCustoms, ...p]);
        setProductsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [customProducts]);

  /**
   * Cart/wishlist sync. On first authenticated load the remote rows win, except
   * when the visitor already had local items and the remote side is empty - then
   * the local cart is pushed up, so nothing is lost on first sign-in.
   */
  useEffect(() => {
    if (!ready || !user || !supabase || synced.current) return;
    synced.current = true;
    (async () => {
      const [{ data: rc }, { data: rw }] = await Promise.all([
        supabase.from("cart_items").select("product_id, qty"),
        supabase.from("wishlist_items").select("product_id"),
      ]);
      const remoteCart = (rc ?? []).map((r) => ({ id: r.product_id, qty: r.qty }));
      const remoteWish = (rw ?? []).map((r) => r.product_id);

      if (remoteCart.length === 0 && cart.length > 0) {
        await supabase.from("cart_items").upsert(cart.map((c) => ({ user_id: user.id, product_id: c.id, qty: c.qty })));
      } else setCart(remoteCart);

      if (remoteWish.length === 0 && wishlist.length > 0) {
        await supabase.from("wishlist_items").upsert(wishlist.map((id) => ({ user_id: user.id, product_id: id })));
      } else setWishlist(remoteWish);
    })();
  }, [ready, user, cart, wishlist, setCart, setWishlist]);

  const addProduct = useCallback(async (newProd: Omit<Product, "id"> & { id?: string }): Promise<Product> => {
    const id = newProd.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const created: Product = {
      ...newProd,
      id,
      rating: newProd.rating ?? 5.0,
      reviews: newProd.reviews ?? [],
      reviewCount: newProd.reviewCount ?? 1,
      inStock: newProd.inStock ?? true,
      specs: newProd.specs ?? {},
      compatibility: newProd.compatibility ?? [],
      images: newProd.images?.length ? newProd.images : ["https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80"]
    };

    setCustomProducts((prev) => [created, ...prev]);
    setProducts((prev) => [created, ...prev.filter((p) => p.id !== id)]);

    if (supabase) {
      try {
        const brandSlug = created.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "generic";
        // 1. Ensure brand exists in public.brands
        await supabase.from("brands").upsert({ id: brandSlug, name: created.brand });

        // 2. Insert main product row
        await supabase.from("products").upsert({
          id,
          name: created.name,
          brand_id: brandSlug,
          category_id: created.category,
          price: created.price,
          old_price: created.oldPrice ?? null,
          description: created.description,
          specs: created.specs,
          rating: created.rating,
          in_stock: created.inStock,
          deal_of_day: Boolean(created.dealOfDay),
          universal: Boolean(created.universal)
        });

        // 3. Insert product images into public.product_images
        if (created.images && created.images.length > 0) {
          const imageRows = created.images.map((url, i) => ({
            product_id: id,
            url,
            alt: i === 0 ? created.name : null,
            position: i
          }));
          await supabase.from("product_images").upsert(imageRows);
        }

        // 4. Insert compatibility entries into public.product_compatibility
        if (created.compatibility && created.compatibility.length > 0) {
          const compatRows = created.compatibility.map((c) => ({
            product_id: id,
            make: c.make,
            model: c.model,
            year_from: c.yearFrom,
            year_to: c.yearTo
          }));
          await supabase.from("product_compatibility").upsert(compatRows);
        }
      } catch (err) {
        console.warn("Supabase online insert error:", err);
      }
    }

    toast(`Product "${created.name}" uploaded successfully!`);
    return created;
  }, [setCustomProducts, toast]);

  const deleteProduct = useCallback(async (id: string) => {
    setCustomProducts((prev) => prev.filter((p) => p.id !== id));
    setProducts((prev) => prev.filter((p) => p.id !== id));
    if (supabase) {
      try {
        await supabase.from("product_compatibility").delete().eq("product_id", id);
        await supabase.from("product_images").delete().eq("product_id", id);
        await supabase.from("reviews").delete().eq("product_id", id);
        await supabase.from("products").delete().eq("id", id);
      } catch (err) {
        console.warn("Supabase delete error:", err);
      }
    }
    toast("Product deleted", "info");
  }, [setCustomProducts, toast]);

  const updateProductInStore = useCallback((id: string, patch: Partial<Product>) => {
    setCustomProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, [setCustomProducts]);

  const value = useMemo<Store>(() => {
    const priceOf = (id: string) => products.find((p) => p.id === id)?.price ?? 0;
    const uid = user?.id;
    const push = (op: PromiseLike<{ error: { message: string } | null }> | null) => {
      if (!op) return;
      Promise.resolve(op).then(({ error }) => error && toast("Could not save to your account", "error"));
    };

    return {
      products, productsLoading,
      vehicle, setVehicle,
      cart,
      cartCount: cart.reduce((n, i) => n + i.qty, 0),
      cartTotal: cart.reduce((n, i) => n + priceOf(i.id) * i.qty, 0),
      addToCart: (id, qty = 1) => {
        const existing = cart.find((i) => i.id === id);
        const next = Math.min(99, (existing?.qty ?? 0) + qty);
        setCart(existing ? cart.map((i) => (i.id === id ? { ...i, qty: next } : i)) : [...cart, { id, qty }]);
        if (supabase && uid) push(supabase.from("cart_items").upsert({ user_id: uid, product_id: id, qty: next }));
        toast("Added to cart");
      },
      setQty: (id, qty) => {
        const clamped = Math.max(1, Math.min(99, qty));
        setCart(cart.map((i) => (i.id === id ? { ...i, qty: clamped } : i)));
        if (supabase && uid) push(supabase.from("cart_items").upsert({ user_id: uid, product_id: id, qty: clamped }));
      },
      removeFromCart: (id) => {
        setCart(cart.filter((i) => i.id !== id));
        if (supabase && uid) push(supabase.from("cart_items").delete().eq("product_id", id));
        toast("Removed from cart", "info");
      },
      clearCart: () => {
        setCart([]);
        if (supabase && uid) push(supabase.from("cart_items").delete().eq("user_id", uid));
      },
      wishlist,
      toggleWishlist: (id) => {
        const has = wishlist.includes(id);
        setWishlist(has ? wishlist.filter((w) => w !== id) : [...wishlist, id]);
        if (supabase && uid) {
          push(has
            ? supabase.from("wishlist_items").delete().eq("product_id", id)
            : supabase.from("wishlist_items").upsert({ user_id: uid, product_id: id }));
        }
        toast(has ? "Removed from wishlist" : "Saved to wishlist", has ? "info" : "success");
      },
      dark, toggleDark: () => setDark((d) => !d),
      toasts, toast,
      addProduct,
      deleteProduct,
      updateProductInStore
    };
  }, [products, productsLoading, vehicle, cart, wishlist, dark, toasts, toast, user, setVehicle, setCart, setWishlist, setDark, addProduct, deleteProduct, updateProductInStore]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
