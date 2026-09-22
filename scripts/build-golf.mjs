/**
 * Generates the golf cart accessory catalogue: writes src/data/golf-products.json
 * and downloads a photo set per product into public/images/golf/.
 *
 * Imagery note: there is no free stock library of golf-cart-specific accessory
 * photography (Unsplash and Openverse return golfers and fairways, not parts), so
 * each category borrows the closest real automotive subject - a light bar for
 * lighting, upholstery for seats, and so on. Swapping in supplier photos is a
 * data change: replace the files and re-run; no component code depends on them.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const DIR = "public/images/golf";
fs.mkdirSync(DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// [id, name, brand, category, price, oldPrice, rating, inStock, specs, deal?]
const ROWS = [
  ["gc-led-bar", 'LED Light Bar Kit 24"', "GreenLine", "golf-lighting", 129.0, 159.0, 4.8, 1, { Length: '24 in', Output: "7200 lm", Voltage: "12-48 V", Rating: "IP67" }, 1],
  ["gc-headlight-kit", "Halo Headlight & Tail Light Kit", "Fairway Pro", "golf-lighting", 94.5, null, 4.6, 1, { Includes: "2 front, 2 rear", Voltage: "12 V", Type: "LED halo" }],
  ["gc-underglow", "Underglow Strip Set - RGB", "LinksGear", "golf-lighting", 59.9, 74.9, 4.4, 1, { Length: "4 x 900 mm", Control: "App + remote", Colours: "16M" }],
  ["gc-light-bezel", "Chrome Headlight Bezel Pair", "CaddyTech", "golf-lighting", 32.0, null, 4.2, 1, { Finish: "Chrome ABS", Fitment: "Universal" }],

  ["gc-canopy-80", 'Extended Canopy Top 80"', "Fairway Pro", "golf-tops", 239.0, 289.0, 4.7, 1, { Length: "80 in", Material: "Fibreglass", Colour: "Sandstone" }, 1],
  ["gc-windshield-fold", "Folding Acrylic Windshield", "GreenLine", "golf-tops", 149.0, null, 4.5, 1, { Material: "4 mm acrylic", Style: "Fold-down", Tint: "Clear" }],
  ["gc-rain-enclosure", "4-Passenger Rain Enclosure", "LinksGear", "golf-tops", 179.9, 219.0, 4.3, 1, { Fits: "80 in tops", Material: "PVC / mesh", Zips: "Heavy duty" }],
  ["gc-top-struts", "Canopy Support Strut Set", "CaddyTech", "golf-tops", 48.0, null, 4.1, 0, { Pieces: "4", Material: "Powder-coated steel" }],

  ["gc-seat-covers", "Premium Seat Cover Set", "GreenLine", "golf-seats", 89.0, 109.0, 4.8, 1, { Material: "Marine vinyl", Fits: "Front bench", Colours: "Two-tone" }],
  ["gc-rear-seat", "Flip-Down Rear Seat Kit", "Fairway Pro", "golf-seats", 349.0, null, 4.6, 1, { Capacity: "2 passengers", Includes: "Grab bar, footrest" }],
  ["gc-cargo-box", "Lockable Cargo Box 60L", "LinksGear", "golf-seats", 74.5, 92.0, 4.4, 1, { Volume: "60 L", Lock: "Keyed", Mount: "Rear rack" }],
  ["gc-cooler-mount", "Cooler Bracket & Bag", "CaddyTech", "golf-seats", 42.9, null, 4.3, 1, { Capacity: "12 cans", Mount: "Bolt-on" }],

  ["gc-dash-kit", "Carbon-Look Dash Trim Kit", "GreenLine", "golf-dash", 68.0, 82.0, 4.5, 1, { Finish: "Carbon weave", Pieces: "6", Adhesive: "3M" }],
  ["gc-phone-mount", "Locking Phone & GPS Mount", "CaddyTech", "golf-dash", 27.9, null, 4.7, 1, { Fits: "Up to 7 in", Rotation: "360 deg" }],
  ["gc-usb-panel", "Dual USB-C Charge Panel", "Fairway Pro", "golf-dash", 39.0, 49.0, 4.6, 1, { Output: "45 W total", Ports: "2 x USB-C", Cutout: "Round 28 mm" }],
  ["gc-floor-mat", "All-Weather Floor Mat", "LinksGear", "golf-dash", 54.0, null, 4.4, 1, { Material: "Diamond-plate rubber", Trim: "Cut to fit" }],

  ["gc-mirror-wide", "Wide-Angle Rear View Mirror", "CaddyTech", "golf-exterior", 34.9, 44.0, 4.6, 1, { Width: "16.5 in", Mount: "Clamp-on", Glass: "Convex" }],
  ["gc-side-mirrors", "Folding Side Mirror Pair", "GreenLine", "golf-exterior", 49.9, null, 4.5, 1, { Pieces: "2", Adjust: "Folding arm" }],
  ["gc-fender-flares", "Fender Flare Set", "Fairway Pro", "golf-exterior", 79.0, 95.0, 4.2, 1, { Pieces: "4", Material: "Textured ABS" }],
  ["gc-diamond-plate", "Diamond Plate Rocker Panels", "LinksGear", "golf-exterior", 64.0, null, 4.3, 0, { Finish: "Polished aluminium", Pieces: "2" }],
];

// Closest photographable subject per category (see imagery note above).
const QUERIES = {
  "golf-lighting": ["led light bar", "car led headlight", "light strip glow", "vehicle auxiliary light"],
  "golf-tops": ["windshield glass car", "canvas canopy roof", "car windscreen rain", "awning fabric"],
  "golf-seats": ["car seat upholstery", "leather vehicle seat", "storage crate box", "cargo organiser"],
  "golf-dash": ["car dashboard closeup", "car phone mount", "usb charger port", "rubber floor mat car"],
  "golf-exterior": ["car side mirror", "rear view mirror", "chrome car trim", "vehicle body panel"],
};

const names = ["Dana P.", "Mo K.", "Ruth A.", "Sean D.", "Ivy L."];
const texts = [
  "Fitted my cart in twenty minutes.",
  "Looks far better than the stock part.",
  "Solid build, no rattles on rough paths.",
  "Exactly as pictured.",
  "Great value for the money.",
];

const search = async (q) => {
  const r = await fetch(
    `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(q)}&per_page=8&orientation=squarish`,
    { headers: { Accept: "application/json" } },
  );
  if (!r.ok) throw new Error("HTTP " + r.status);
  const j = await r.json();
  return (j.results ?? []).filter((p) => p.urls?.raw).map((p) => ({
    id: p.id, raw: p.urls.raw, alt: p.alt_description ?? q,
    author: p.user?.name ?? "Unknown", link: p.links?.html,
  }));
};

const pools = {};
const seen = new Set();
for (const [cat, qs] of Object.entries(QUERIES)) {
  pools[cat] = [];
  for (const q of qs) {
    try {
      for (const p of await search(q)) if (!seen.has(p.id)) { seen.add(p.id); pools[cat].push(p); }
    } catch (e) { console.error("  search failed", q, e.message); }
    await sleep(800);
  }
  console.log(`${cat}: ${pools[cat].length} candidates`);
}

const grab = async (url, tries = 3) => {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) { if (i === tries - 1) throw e; await sleep(2000 * (i + 1)); }
  }
};

const cursor = {};
const credits = [];
const products = [];
let dl = 0, failed = 0;

for (const [id, name, brand, category, price, oldPrice, rating, inStock, specs, deal] of ROWS) {
  const pool = pools[category] ?? [];
  const start = cursor[category] ?? 0;
  const picks = Array.from({ length: 3 }, (_, k) => pool[(start + k) % Math.max(pool.length, 1)]).filter(Boolean);
  cursor[category] = start + 3;

  const images = [];
  for (let i = 0; i < picks.length; i++) {
    const file = `${id}-${i + 1}.jpg`;
    const dest = path.join(DIR, file);
    try {
      const buf = await grab(`${picks[i].raw}&w=800&h=800&fit=crop&crop=entropy&q=72&fm=jpg`);
      await sharp(buf).resize(800, 800, { fit: "cover" }).jpeg({ quality: 72, mozjpeg: true }).toFile(dest);
      await sharp(buf).resize(400, 400, { fit: "cover" }).jpeg({ quality: 70, mozjpeg: true }).toFile(dest.replace(".jpg", "@400.jpg"));
      dl++;
      credits.push({ file, alt: picks[i].alt, author: picks[i].author, link: picks[i].link });
      images.push(`/images/golf/${file}`);
      await sleep(400);
    } catch (e) { failed++; console.error("FAIL", file, e.message); }
  }

  products.push({
    id, name, brand, category, price,
    ...(oldPrice ? { oldPrice } : {}),
    images,
    alt: picks[0]?.alt ?? name,
    description: `${name} from ${brand}. Built for golf carts and low-speed vehicles, with a bolt-on fit, weatherproof materials and all mounting hardware included.`,
    specs,
    compatibility: [],
    universal: false,
    rating,
    inStock: Boolean(inStock),
    ...(deal ? { dealOfDay: true } : {}),
    reviews: [0, 1, 2].map((j) => ({
      author: names[(products.length + j) % 5],
      rating: Math.max(3, Math.round(rating) - (j === 2 ? 1 : 0)),
      text: texts[(products.length + j) % 5],
    })),
  });
}

fs.writeFileSync("src/data/golf-products.json", JSON.stringify(products, null, 1));
fs.writeFileSync(path.join(DIR, "CREDITS.json"), JSON.stringify(credits, null, 1));
console.log(`\nproducts=${products.length} images=${dl} failed=${failed}`);
console.log("without images:", products.filter((p) => !p.images.length).map((p) => p.id));
