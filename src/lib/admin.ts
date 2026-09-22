/**
 * Admin data access.
 *
 * Nothing here is trusted by the client: every call goes through RLS or a
 * SECURITY DEFINER function that re-checks is_admin() server-side. The
 * `useIsAdmin` flag only decides what UI to render - it is not what protects
 * the data.
 */
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "../context/AuthContext";

export interface AdminStats {
  products: number; out_of_stock: number; orders: number;
  revenue: number; avg_order: number; customers: number;
  visitors: number; open_carts: number; reviews: number;
}
export interface RevenuePoint { day: string; revenue: number; orders: number }
export interface TopProduct { product_id: string; name: string; units: number; revenue: number }

export interface AdminOrder {
  id: string; status: string; subtotal: number; shipping: number; total: number;
  ship_to: { name?: string; email?: string; city?: string; address?: string; zip?: string };
  created_at: string;
  order_items?: { name: string; qty: number; unit_price: number }[];
}

/** Resolves the caller's admin flag via the DB, not from any client-held value. */
export function useIsAdmin() {
  const { user, ready } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!supabase || !user) { setIsAdmin(false); setChecking(false); return; }
    let cancelled = false;
    supabase.rpc("is_admin").then(({ data, error }) => {
      if (cancelled) return;
      setIsAdmin(!error && data === true);
      setChecking(false);
    });
    return () => { cancelled = true; };
  }, [user, ready]);

  return { isAdmin, checking };
}

const need = () => {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
};

export async function fetchStats(): Promise<AdminStats | null> {
  const { data, error } = await need().rpc("admin_stats");
  if (error) { console.warn("admin_stats:", error.message); return null; }
  return data as AdminStats;
}

export async function fetchRevenue(days = 30): Promise<RevenuePoint[]> {
  const { data, error } = await need().rpc("admin_revenue_daily", { p_days: days });
  if (error) { console.warn("admin_revenue_daily:", error.message); return []; }
  return (data as RevenuePoint[]).map((r) => ({ ...r, revenue: Number(r.revenue), orders: Number(r.orders) }));
}

export async function fetchTopProducts(limit = 5): Promise<TopProduct[]> {
  const { data, error } = await need().rpc("admin_top_products", { p_limit: limit });
  if (error) return [];
  return (data as TopProduct[]).map((r) => ({ ...r, units: Number(r.units), revenue: Number(r.revenue) }));
}

export async function fetchOrders(): Promise<AdminOrder[]> {
  const { data, error } = await need()
    .from("orders")
    .select("id, status, subtotal, shipping, total, ship_to, created_at, order_items(name, qty, unit_price)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) { console.warn("orders:", error.message); return []; }
  return data as unknown as AdminOrder[];
}

export async function setOrderStatus(id: string, status: string) {
  const { error } = await need().from("orders").update({ status }).eq("id", id);
  return error?.message ?? null;
}

/** Catalogue edits. RLS rejects these unless the caller is in public.admins. */
export async function updateProduct(
  id: string,
  patch: Partial<{ price: number; old_price: number | null; in_stock: boolean; deal_of_day: boolean; name: string }>,
) {
  const { error } = await need().from("products").update(patch).eq("id", id);
  return error?.message ?? null;
}

export const ORDER_STATUSES = ["placed", "paid", "shipped", "delivered", "cancelled"] as const;
