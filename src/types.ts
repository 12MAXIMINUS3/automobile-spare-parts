export interface Category { id: string; name: string; icon: string; blurb: string }
export interface Brand { id: string; name: string }

export interface CompatEntry {
  make: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  fuels?: string[]; // omitted = fits every fuel type
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  oldPrice?: number;
  images: string[]; // paths under /public/images/products
  alt?: string; // describes the first image, for screen readers
  description: string;
  specs: Record<string, string>;
  compatibility: CompatEntry[]; // empty + universal=true => fits everything
  universal?: boolean;
  rating: number;
  reviews: { author: string; rating: number; text: string }[];
  inStock: boolean;
  dealOfDay?: boolean;
}

export interface VehicleModel { name: string; yearFrom: number; yearTo: number; fuels: string[] }
export interface VehicleMake { name: string; models: VehicleModel[] }

export interface Vehicle { year: number; make: string; model: string; fuel: string }
export interface CartItem { id: string; qty: number }
