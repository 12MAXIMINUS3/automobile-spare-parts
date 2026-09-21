import type { Brand, Category, Product, VehicleMake } from "../types";
import products from "../data/products.json";
import categories from "../data/categories.json";
import brands from "../data/brands.json";
import vehicles from "../data/vehicles.json";

export const PRODUCTS = products as unknown as Product[];
export const CATEGORIES = categories as Category[];
export const BRANDS = brands as Brand[];
export const VEHICLES = vehicles as VehicleMake[];

/** Simulated network latency so skeleton loaders are visible. */
export const fakeFetch = <T,>(value: T, ms = 600) =>
  new Promise<T>((res) => setTimeout(() => res(value), ms));
