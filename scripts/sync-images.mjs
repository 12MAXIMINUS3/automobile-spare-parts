/**
 * Reconciles the product photos on disk with the best-scoring picks from the
 * cached Unsplash pools. Keeps a manifest of which photo landed in which file so
 * repeat runs only fetch what actually changed - Unsplash rate-limits hard.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const DIR = "public/images/products";
const MANIFEST = path.join(DIR, "manifest.json");
const pools = JSON.parse(fs.readFileSync(path.join(process.env.TEMP, "pools.json"), "utf8"));
const products = JSON.parse(fs.readFileSync("src/data/products.json", "utf8"));
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const RULES = {
  brakes:      { good: ["brake", "caliper", "rotor", "disc", "disk"], bad: ["bicycle", "bike", "spoke", "vine", "toy", "motorcycle", "motorbike"] },
  engine:      { good: ["engine", "piston", "crankshaft", "cylinder", "spark plug", "valve", "motor"], bad: ["race", "mud", "toy", "robot", "truck", "pickup", "hood open", "sports car", "tools"] },
  suspension:  { good: ["coil", "spring", "spiral", "shock", "absorber", "suspension", "strut"], bad: ["vine", "tendril", "parked", "structure", "road", "toy", "person"] },
  lighting:    { good: ["headlight", "headlamp", "led", "light", "beam", "lamp"], bad: ["christmas", "license", "parked", "logo", "street", "city"] },
  filters:     { good: ["filter", "pleated", "cartridge"], bad: ["jet", "grill", "grate", "logo", "emblem", "dashboard", "steering", "textile"] },
  oils:        { good: ["oil", "bottle", "lubricant", "pouring", "can", "grease"], bad: ["olive", "food", "cooking", "salad", "perfume", "essential"] },
  electrical:  { good: ["battery", "terminal", "alternator", "fuse", "wiring", "cable", "voltage"], bad: ["phone", "laptop", "remote", "toy"] },
  accessories: { good: ["wiper", "windshield", "windscreen", "mat", "cleaning", "polish", "brush", "wash", "tool"], bad: ["portrait", "woman", "man ", "crowd"] },
};

const score = (alt, cat) => {
  const t = (alt || "").toLowerCase();
  const { good, bad } = RULES[cat];
  let s = good.reduce((n, w) => n + (t.includes(w) ? 3 : 0), 0) - bad.reduce((n, w) => n + (t.includes(w) ? 5 : 0), 0);
  if (t.includes("close")) s += 2;
  if (/\b(a|the) (car|vehicle)\b/.test(t) && s <= 0) s -= 2;
  return s;
};

const ranked = Object.fromEntries(Object.entries(pools).map(([cat, arr]) => [
  cat, arr.map((p) => ({ ...p, s: score(p.alt, cat) })).filter((p) => p.s > 0).sort((a, b) => b.s - a.s),
]));

async function grab(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.status === 429 || r.status >= 500) throw new Error("HTTP " + r.status);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(2500 * (i + 1)); // back off before retrying
    }
  }
}

const cursor = {};
const credits = [];
let fetched = 0, kept = 0, failed = 0;

for (const p of products) {
  const pool = ranked[p.category] ?? [];
  if (!pool.length) { console.error("no pool for", p.category); continue; }
  const start = cursor[p.category] ?? 0;
  const picks = Array.from({ length: 3 }, (_, k) => pool[(start + k) % pool.length]);
  cursor[p.category] = start + 3;

  const paths = [];
  for (let i = 0; i < 3; i++) {
    const pick = picks[i];
    const file = `${p.id}-${i + 1}.jpg`;
    const dest = path.join(DIR, file);
    const thumb = dest.replace(".jpg", "@400.jpg");
    const current = manifest[file];
    const upToDate = current === pick.id && fs.existsSync(dest) && fs.existsSync(thumb);

    if (upToDate) { kept++; }
    else {
      try {
        const buf = await grab(`${pick.raw}&w=800&h=800&fit=crop&crop=entropy&q=72&fm=jpg`);
        await sharp(buf).resize(800, 800, { fit: "cover" }).jpeg({ quality: 72, mozjpeg: true }).toFile(dest);
        await sharp(buf).resize(400, 400, { fit: "cover" }).jpeg({ quality: 70, mozjpeg: true }).toFile(thumb);
        manifest[file] = pick.id;
        fetched++;
        fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1)); // checkpoint so a crash keeps progress
        await sleep(1400); // gentle pacing to stay under the rate limit
      } catch (e) {
        failed++;
        console.error("FAIL", file, e.message);
        if (!fs.existsSync(dest)) continue; // nothing usable -> skip this slot
      }
    }
    paths.push(`/images/products/${file}`);
    credits.push({ file, alt: pick.alt, author: pick.author, link: pick.link });
  }
  if (paths.length) { p.images = paths; p.alt = picks[0]?.alt ?? p.name; }
}

fs.writeFileSync("src/data/products.json", JSON.stringify(products, null, 1));
fs.writeFileSync(path.join(DIR, "CREDITS.json"), JSON.stringify(credits, null, 1));
console.log(`\nfetched=${fetched} kept=${kept} failed=${failed}`);
console.log("products without images:", products.filter((x) => !x.images?.length).map((x) => x.id));
