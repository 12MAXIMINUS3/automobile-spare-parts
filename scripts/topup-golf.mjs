/**
 * Fills in golf products that ended up without images (Unsplash rate-limits hard
 * during a long run). Only touches products with fewer than 3 photos, so it is
 * safe to re-run until the count comes out clean.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const DIR = "public/images/golf";
const FILE = "src/data/golf-products.json";
const products = JSON.parse(fs.readFileSync(FILE, "utf8"));
const creditsPath = path.join(DIR, "CREDITS.json");
const credits = fs.existsSync(creditsPath) ? JSON.parse(fs.readFileSync(creditsPath, "utf8")) : [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const QUERIES = {
  "golf-lighting": ["led light bar", "car led headlight", "light strip glow"],
  "golf-tops": ["windshield glass car", "canvas canopy roof", "awning fabric"],
  "golf-seats": ["car seat upholstery", "leather vehicle seat", "storage crate box"],
  "golf-dash": ["car dashboard closeup", "car phone mount", "rubber floor mat car", "usb charger cable"],
  "golf-exterior": ["car side mirror", "rear view mirror", "chrome car trim", "car door handle"],
};

async function search(q, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(
      `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(q)}&per_page=8&orientation=squarish`,
      { headers: { Accept: "application/json" } },
    );
    if (r.status === 429) { await sleep(8000 * (i + 1)); continue; } // back off and retry
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    return (j.results ?? []).filter((p) => p.urls?.raw).map((p) => ({
      id: p.id, raw: p.urls.raw, alt: p.alt_description ?? q,
      author: p.user?.name ?? "Unknown", link: p.links?.html,
    }));
  }
  throw new Error("rate limited after retries");
}

const needy = products.filter((p) => (p.images?.length ?? 0) < 3);
if (needy.length === 0) { console.log("nothing to top up"); process.exit(0); }
console.log(`topping up ${needy.length} products: ${needy.map((p) => p.id).join(", ")}\n`);

// photo ids already used anywhere, so top-ups do not duplicate existing art
const used = new Set(credits.map((c) => c.link).filter(Boolean));

const byCat = {};
for (const p of needy) (byCat[p.category] ??= []).push(p);

for (const [cat, list] of Object.entries(byCat)) {
  const pool = [];
  for (const q of QUERIES[cat] ?? []) {
    try {
      for (const c of await search(q)) if (!used.has(c.link)) { used.add(c.link); pool.push(c); }
    } catch (e) { console.error("  search failed", q, e.message); }
    await sleep(2500);
  }
  console.log(`${cat}: ${pool.length} candidates for ${list.length} products`);
  if (!pool.length) continue;

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
        await sleep(600);
      } catch (e) { console.error("  FAIL", file, e.message); }
    }
    if (images.length) { p.images = images; p.alt = pool[0]?.alt ?? p.name; console.log(`  ${p.id}: ${images.length} images`); }
  }
}

fs.writeFileSync(FILE, JSON.stringify(products, null, 1));
fs.writeFileSync(creditsPath, JSON.stringify(credits, null, 1));
const short = products.filter((p) => (p.images?.length ?? 0) < 3);
console.log(`\nstill short: ${short.length ? short.map((p) => p.id + ":" + p.images.length).join(", ") : "none"}`);
