import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Trash2, UploadCloud, Image as ImageIcon, CheckCircle2,
  DollarSign, Tag, Layers, Wrench, Shield, Sparkles, ArrowLeft
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../../context/StoreContext";
import { BRANDS, CATEGORIES } from "../../lib/data";
import type { CompatEntry, Product } from "../../types";

const PRESET_IMAGES = [
  { label: "Brake Discs", url: "https://images.unsplash.com/photo-1600706432522-67520e50d6f4?auto=format&fit=crop&w=800&q=80" },
  { label: "Spark Plugs", url: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80" },
  { label: "Engine Oil", url: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80" },
  { label: "Shock Absorber", url: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80" },
  { label: "Headlight", url: "https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=800&q=80" },
  { label: "Battery / Auto Part", url: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80" },
];

export default function AdminAddProduct() {
  const { addProduct } = useStore();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [brand, setBrand] = useState(BRANDS[0]?.name || "Brembo");
  const [customBrand, setCustomBrand] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]?.id || "brakes");
  const [department, setDepartment] = useState<"auto" | "golf">("auto");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [description, setDescription] = useState("");
  const [inStock, setInStock] = useState(true);
  const [dealOfDay, setDealOfDay] = useState(false);
  const [universal, setUniversal] = useState(false);

  // Images state
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [images, setImages] = useState<string[]>([]);

  // Specs state
  const [specKey, setSpecKey] = useState("");
  const [specVal, setSpecVal] = useState("");
  const [specs, setSpecs] = useState<Record<string, string>>({
    Warranty: "2 Years",
    Condition: "Brand New OEM Equivalent"
  });

  // Compatibility state
  const [compatList, setCompatList] = useState<CompatEntry[]>([
    { make: "BMW", model: "3 Series", yearFrom: 2012, yearTo: 2024 }
  ]);
  const [cMake, setCMake] = useState("Toyota");
  const [cModel, setCModel] = useState("Camry");
  const [cFrom, setCFrom] = useState("2015");
  const [cTo, setCTo] = useState("2024");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // File upload handler (converts uploaded image file to Data URL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const addImageUrl = () => {
    const trimmed = imageUrlInput.trim();
    if (trimmed && !images.includes(trimmed)) {
      setImages((prev) => [...prev, trimmed]);
      setImageUrlInput("");
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const addSpec = () => {
    if (specKey.trim() && specVal.trim()) {
      setSpecs((prev) => ({ ...prev, [specKey.trim()]: specVal.trim() }));
      setSpecKey("");
      setSpecVal("");
    }
  };

  const removeSpec = (key: string) => {
    setSpecs((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const addCompat = () => {
    if (cMake.trim() && cModel.trim()) {
      setCompatList((prev) => [
        ...prev,
        {
          make: cMake.trim(),
          model: cModel.trim(),
          yearFrom: parseInt(cFrom) || 2010,
          yearTo: parseInt(cTo) || 2024
        }
      ]);
      setCMake("");
      setCModel("");
    }
  };

  const removeCompat = (idx: number) => {
    setCompatList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pVal = parseFloat(price);
    if (!name.trim()) return alert("Please enter a product title.");
    if (isNaN(pVal) || pVal <= 0) return alert("Please enter a valid product price.");

    setIsSubmitting(true);

    const finalBrand = brand === "Other" ? customBrand || "Generic OEM" : brand;
    const finalImages = images.length > 0 ? images : [PRESET_IMAGES[0].url];

    const newProductData: Omit<Product, "id"> = {
      name: name.trim(),
      brand: finalBrand,
      category,
      department,
      price: pVal,
      oldPrice: oldPrice ? parseFloat(oldPrice) : undefined,
      description: description.trim() || `High quality ${name.trim()} built for long-lasting durability and peak vehicle performance.`,
      images: finalImages,
      specs,
      compatibility: universal ? [] : compatList,
      universal,
      rating: 5.0,
      reviews: [],
      reviewCount: 0,
      inStock,
      dealOfDay
    };

    await addProduct(newProductData);
    setIsSubmitting(false);
    navigate("/admin/products");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <div>
          <Link to="/admin/products" className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-orange-500">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Products List
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Upload New Product</h1>
          <p className="text-sm text-zinc-500">Add automobile or golf cart spare parts directly to your live shop catalog.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Basic Product Information */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Tag className="h-5 w-5 text-orange-500" /> Basic Details
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Product Title *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Brembo Ceramic High Performance Brake Pads"
                className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Brand</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-950"
              >
                {BRANDS.map((b) => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
                <option value="Other">Other / Custom Brand</option>
              </select>
              {brand === "Other" && (
                <input
                  type="text"
                  placeholder="Enter brand name"
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-950"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-950"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Department</label>
              <div className="mt-1.5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setDepartment("auto")}
                  className={`flex-1 rounded-xl border py-2.5 text-xs font-bold transition ${
                    department === "auto"
                      ? "border-orange-500 bg-orange-500/10 text-orange-500"
                      : "border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                  }`}
                >
                  🚘 Car Spare Parts
                </button>
                <button
                  type="button"
                  onClick={() => setDepartment("golf")}
                  className={`flex-1 rounded-xl border py-2.5 text-xs font-bold transition ${
                    department === "golf"
                      ? "border-orange-500 bg-orange-500/10 text-orange-500"
                      : "border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                  }`}
                >
                  🛺 Golf Carts & Accessories
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Price ($) *</label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="199.99"
                    className="w-full rounded-xl border border-zinc-300 bg-white pl-8 pr-3 py-2.5 text-sm font-bold outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-950"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Old Price (Discount)</label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={oldPrice}
                    onChange={(e) => setOldPrice(e.target.value)}
                    placeholder="249.99"
                    className="w-full rounded-xl border border-zinc-300 bg-white pl-8 pr-3 py-2.5 text-sm outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-950"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Product Images & File Upload */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ImageIcon className="h-5 w-5 text-orange-500" /> Product Media & Images
          </h2>
          <p className="mt-1 text-xs text-zinc-500">Upload your own product images or enter image URLs.</p>

          <div className="mt-5 space-y-4">
            {/* File Upload Box */}
            <div className="relative rounded-2xl border-2 border-dashed border-zinc-300 p-6 text-center transition hover:border-orange-500 dark:border-zinc-700">
              <UploadCloud className="mx-auto h-10 w-10 text-orange-500" />
              <p className="mt-2 text-sm font-semibold">Click to upload image file from device</p>
              <p className="text-xs text-zinc-400">Supports PNG, JPG, WEBP</p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </div>

            {/* URL Input */}
            <div className="flex gap-2">
              <input
                type="url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="Or paste image URL (e.g. https://...)"
                className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-950"
              />
              <button
                type="button"
                onClick={addImageUrl}
                className="rounded-xl bg-zinc-900 px-5 py-2 text-xs font-semibold text-white hover:bg-orange-500 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-orange-500 dark:hover:text-white"
              >
                Add Image URL
              </button>
            </div>

            {/* Preset Stock Images for Quick Testing */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Quick Select Stock Sample Photo</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_IMAGES.map((img) => (
                  <button
                    key={img.label}
                    type="button"
                    onClick={() => {
                      if (!images.includes(img.url)) setImages((prev) => [...prev, img.url]);
                    }}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium transition hover:border-orange-500 hover:bg-orange-500/10 dark:border-zinc-800 dark:bg-zinc-800"
                  >
                    + {img.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Preview Grid */}
            {images.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {images.map((src, i) => (
                  <div key={i} className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950">
                    <img src={src} alt={`Product view ${i + 1}`} className="aspect-square w-full object-cover" />
                    {i === 0 && (
                      <span className="absolute left-1 top-1 rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        Main
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute right-1 top-1 rounded-full bg-rose-500 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Description & Technical Specs */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Layers className="h-5 w-5 text-orange-500" /> Description & Specifications
          </h2>

          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter detailed description of the auto part, engineering highlights, and features..."
                className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white p-4 text-sm outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Key Specifications</label>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="Spec Name (e.g. Material)"
                  value={specKey}
                  onChange={(e) => setSpecKey(e.target.value)}
                  className="w-1/3 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-950"
                />
                <input
                  type="text"
                  placeholder="Value (e.g. Ceramic Composite)"
                  value={specVal}
                  onChange={(e) => setSpecVal(e.target.value)}
                  className="flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-950"
                />
                <button
                  type="button"
                  onClick={addSpec}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600"
                >
                  Add Spec
                </button>
              </div>

              {Object.keys(specs).length > 0 && (
                <div className="mt-3 divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-zinc-50 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
                  {Object.entries(specs).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between px-4 py-2.5 text-xs">
                      <span className="font-semibold text-zinc-600 dark:text-zinc-400">{k}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{v}</span>
                        <button type="button" onClick={() => removeSpec(k)} className="text-zinc-400 hover:text-rose-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 4: Compatibility & Flags */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Wrench className="h-5 w-5 text-orange-500" /> Vehicle Compatibility & Status
          </h2>

          <div className="mt-5 space-y-5">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={universal}
                onChange={(e) => setUniversal(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-orange-500 focus:ring-orange-500"
              />
              <div>
                <span className="text-sm font-bold">Universal Fitment</span>
                <p className="text-xs text-zinc-500">Fits all vehicle makes and models (e.g. oils, fluids, universal tools).</p>
              </div>
            </label>

            {!universal && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Add Specific Compatible Vehicles</p>
                <div className="grid gap-2 sm:grid-cols-4">
                  <input
                    type="text"
                    placeholder="Make (e.g. BMW)"
                    value={cMake}
                    onChange={(e) => setCMake(e.target.value)}
                    className="rounded-xl border border-zinc-300 px-3 py-2 text-xs outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-950"
                  />
                  <input
                    type="text"
                    placeholder="Model (e.g. 3 Series)"
                    value={cModel}
                    onChange={(e) => setCModel(e.target.value)}
                    className="rounded-xl border border-zinc-300 px-3 py-2 text-xs outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-950"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      placeholder="From (2012)"
                      value={cFrom}
                      onChange={(e) => setCFrom(e.target.value)}
                      className="w-1/2 rounded-xl border border-zinc-300 px-2 py-2 text-xs outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-950"
                    />
                    <span className="text-xs text-zinc-400">-</span>
                    <input
                      type="number"
                      placeholder="To (2024)"
                      value={cTo}
                      onChange={(e) => setCTo(e.target.value)}
                      className="w-1/2 rounded-xl border border-zinc-300 px-2 py-2 text-xs outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-950"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addCompat}
                    className="rounded-xl bg-zinc-900 py-2 text-xs font-bold text-white hover:bg-orange-500 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-orange-500 dark:hover:text-white"
                  >
                    + Add Fitment
                  </button>
                </div>

                {compatList.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {compatList.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
                        {c.make} {c.model} ({c.yearFrom}-{c.yearTo})
                        <button type="button" onClick={() => removeCompat(i)} className="hover:text-rose-500">
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-6 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => setInStock(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm font-semibold">In Stock</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={dealOfDay}
                  onChange={(e) => setDealOfDay(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm font-semibold">Featured in "Deal of the Day"</span>
              </label>
            </div>
          </div>
        </section>

        {/* Submit Actions Bar */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <Link
            to="/admin/products"
            className="rounded-xl border border-zinc-300 px-6 py-3 text-sm font-semibold transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-3 font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] hover:shadow-orange-500/40 active:scale-[0.98] disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" /> {isSubmitting ? "Uploading…" : "Upload Product to Store"}
          </button>
        </div>
      </form>
    </div>
  );
}
