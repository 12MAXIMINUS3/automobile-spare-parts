/**
 * Re-picks golf accessory photos, scoring candidates by their description so the
 * obviously wrong ones (a lawn chair for seat covers, a portrait for a canopy,
 * neon tubes for a headlight kit) never reach a product card.
 *
 * These remain approximations: no free library carries golf-cart-specific
 * accessory photography. Replace public/images/golf/* with supplier shots and
 * nothing in the app needs to change.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const DIR = "public/images/golf";
const FILE = "src/data/golf-products.json";
const products = JSON.parse(fs.readFileSync(FILE, "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const QUERIES = {
  "golf-lighting": ["car led light bar", "vehicle headlight closeup", "automotive light assembly", "truck light bar roof"],
  "golf-tops": ["car windshield glass", "vehicle windscreen wiper", "canvas awning canopy", "car roof rack"],
  "golf-seats": ["car seat leather closeup", "vehicle upholstery stitching", "car boot cargo", "plastic storage box"],
  "golf-dash": ["car dashboard closeup", "car interior console", "car phone holder mount", "car floor mat rubber"],
  "golf-exterior": ["car wing mirror", "car side mirror closeup", "chrome car bumper", "car fender panel"],
};

// Words that mean the photo is about a subject we are not selling.
const BAD = ["woman", "man ", "person", "people", "portrait", "girl", "boy", "smiling", "face",
  "chair", "lawn", "neon", "sign", "letter", "alphabet", "building", "sky", "landscape",
  "beach", "food", "dog", "cat", "ceiling", "lamp post", "street light", "toy"];
const GOOD = {
  "golf-lighting": ["light", "led", "headlight", "lamp", "beam", "bulb"],
  "golf-tops": ["windshield", "windscreen", "glass", "canopy", "awning", "roof", "canvas"],
  "golf-seats": ["seat", "upholstery", "leather", "cushion", "storage", "box", "cargo", "trunk"],
  "golf-dash": ["dashboard", "dash", "console", "interior", "steering", "mount", "mat", "cockpit"],
  "golf-exterior": ["mirror", "chrome", "fender", "bumper", "panel", "trim", "door"],
};

const score = (alt, cat) => {
  const t = (alt || "").toLowerCase();
  let s = (GOOD[cat] ?? []).reduce((n, w) => n + (t.includes(w) ? 4 : 0), 0);
  s -= BAD.reduce((n, w) => n + (t.includes(w) ? 8 : 0), 0);
  if (t.includes("car") || t.includes("vehicle")) s += 1;
  if (t.includes("close")) s += 2;
  return s;
};

async function search(q, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(
      `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(q)}&per_page=10&orientation=squarish`,
      { headers: { Accept: "application/json" } },
    );
    if (r.status === 429) { await sleep(9000 * (i + 1)); continue; }
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    return (j.results ?? []).filter((p) => p.urls?.raw).map((p) => ({
      id: p.id, raw: p.urls.raw, alt: p.alt_description ?? q,
      author: p.user?.name ?? "Unknown", link: p.links?.html,
    }));
  }
  throw new Error("rate limited");
}

const credits = [];
const seen = new Set();
let replaced = 0, kept = 0;

for (const [cat, queries] of Object.entries(QUERIES)) {
  const list = products.filter((p) => p.category === cat);
  if (!list.length) continue;

  const pool = [];
  for (const q of queries) {
    try {
      for (const c of await search(q)) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        const s = score(c.alt, cat);
        if (s > 0) pool.push({ ...c, s });
      }
    } catch (e) { console.error("  search failed", q, e.message); }
    await sleep(2200);
  }
  pool.sort((a, b) => b.s - a.s);
  console.log(`${cat}: ${pool.length} relevant candidates for ${list.length} products`);
  if (pool.length < 3) { console.log("  too few - keeping existing images"); kept += list.length; continue; }

  let cursor = 0;
  for (const p of list) {
    const images = [];
    for (let i = 0; i < 3; i++) {
      const pick = pool[cursor++ % pool.length];
      const file = `${p.id}-${i + 1}.jpg`;
      const dest = path.join(DIR, file);
      try {
        const r = await fetch(`${pick.raw}&w=800&h=800&fit=crop&crop=entropy&q=72&fm=jpg`);
        if (!r.ok) throw new Error("HTTP " + r.status);
        const buf = Buffer.from(await r.arrayBuffer());
        await sharp(buf).resize(800, 800, { fit: "cover" }).jpeg({ quality: 72, mozjpeg: true }).toFile(dest);
        await sharp(buf).resize(400, 400, { fit: "cover" }).jpeg({ quality: 70, mozjpeg: true }).toFile(dest.replace(".jpg", "@400.jpg"));
        images.push(`/images/golf/${file}`);
        credits.push({ file, alt: pick.alt, author: pick.author, link: pick.link });
        await sleep(500);
      } catch (e) { console.error("  FAIL", file, e.message); }
    }
    if (images.length === 3) { p.images = images; p.alt = pick0Alt(p, images, credits); replaced++; }
  }
}

function pick0Alt(p, images, credits) {
  const first = images[0].split("/").pop();
  return credits.find((c) => c.file === first)?.alt ?? p.name;
}

fs.writeFileSync(FILE, JSON.stringify(products, null, 1));
if (credits.length) fs.writeFileSync(path.join(DIR, "CREDITS.json"), JSON.stringify(credits, null, 1));
console.log(`\nreplaced=${replaced} kept=${kept}`);
console.log("short:", products.filter((p) => (p.images?.length ?? 0) < 3).map((p) => p.id).join(", ") || "none");
