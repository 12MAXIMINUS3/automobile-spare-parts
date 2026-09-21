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
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [productsLoading, setProductsLoading] = useState(isSupabaseEnabled);
  const synced = useRef(false); // guards the one-time local -> remote migration

  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);

  const toast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  // Catalogue: Supabase when configured, bundled JSON otherwise.
  useEffect(() => {
    let cancelled = false;
    fetchProducts().then((p) => { if (!cancelled) { setProducts(p); setProductsLoading(false); } });
    return () => { cancelled = true; };
  }, []);

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

  const value = useMemo<Store>(() => {
    const priceOf = (id: string) => products.find((p) => p.id === id)?.price ?? 0;
    const uid = user?.id;
    // Remote writes are best-effort: the UI already updated, so a failure only
    // costs persistence, and we say so rather than silently dropping it.
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
    };
  }, [products, productsLoading, vehicle, cart, wishlist, dark, toasts, toast, user, setVehicle, setCart, setWishlist, setDark]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
