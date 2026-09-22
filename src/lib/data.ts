import type { Brand, Category, Product, VehicleMake } from "../types";
import products from "../data/products.json";
import categories from "../data/categories.json";
import brands from "../data/brands.json";
import vehicles from "../data/vehicles.json";
import golfProducts from "../data/golf-products.json";
import golfCategories from "../data/golf-categories.json";

// Mock fallback carries the same department tag the database supplies.
export const PRODUCTS = (products as unknown as Product[]).map((p) => ({ ...p, department: "auto" as const }));
export const GOLF_PRODUCTS = (golfProducts as unknown as Product[]).map((p) => ({ ...p, department: "golf" as const }));
export const GOLF_CATEGORIES = golfCategories as Category[];
export const ALL_PRODUCTS = [...PRODUCTS, ...GOLF_PRODUCTS];
export const CATEGORIES = categories as Category[];
export const BRANDS = brands as Brand[];
export const VEHICLES = vehicles as VehicleMake[];

/** Simulated network latency so skeleton loaders are visible. */
export const fakeFetch = <T,>(value: T, ms = 600) =>
  new Promise<T>((res) => setTimeout(() => res(value), ms));
