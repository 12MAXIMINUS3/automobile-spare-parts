/**
 * Seeds the Supabase catalogue from the local mock JSON.
 *
 * Rows are shipped as one JSON document per table and expanded server-side with
 * jsonb_to_recordset, so no value is ever string-concatenated into SQL. Every
 * insert is an upsert on the primary key, making the script safe to re-run.
 *
 * Needs SB_REF and SB_PAT in the environment (a Supabase personal access token).
 */
import fs from "fs";

const REF = process.env.SB_REF;
const PAT = process.env.SB_PAT;
if (!REF || !PAT) { console.error("Set SB_REF and SB_PAT first."); process.exit(1); }

const read = (f) => JSON.parse(fs.readFileSync(new URL(`../src/data/${f}`, import.meta.url), "utf8"));
const categories = read("categories.json");
const brands = read("brands.json");
const vehicles = read("vehicles.json");
const products = read("products.json");

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ---- shape the rows -------------------------------------------------------
const makeRows = vehicles.map((m) => ({ id: slug(m.name), name: m.name }));
const modelRows = vehicles.flatMap((m) =>
  m.models.map((x) => ({
    id: `${slug(m.name)}-${slug(x.name)}`,
    make_id: slug(m.name),
    name: x.name,
    year_from: x.yearFrom,
    year_to: x.yearTo,
    fuels: x.fuels,
  })),
);
const productRows = products.map((p) => ({
  id: p.id, name: p.name, brand_id: slug(p.brand), category_id: p.category,
  price: p.price, old_price: p.oldPrice ?? null, description: p.description,
  specs: p.specs, rating: p.rating, in_stock: p.inStock,
  deal_of_day: !!p.dealOfDay, universal: !!p.universal, alt: p.alt ?? null,
}));
const imageRows = products.flatMap((p) =>
  p.images.map((url, i) => ({ product_id: p.id, url, alt: i === 0 ? p.alt ?? p.name : null, position: i })));
const compatRows = products.flatMap((p) =>
  (p.compatibility ?? []).map((c) => ({
    product_id: p.id, make: c.make, model: c.model,
    year_from: c.yearFrom, year_to: c.yearTo, fuels: c.fuels ?? null,
  })));
const reviewRows = products.flatMap((p) =>
  (p.reviews ?? []).map((r) => ({ product_id: p.id, author: r.author, rating: r.rating, body: r.text })));

// brand ids in products must exist in brands
const brandRows = brands.map((b) => ({ id: slug(b.name), name: b.name }));
const missing = [...new Set(productRows.map((p) => p.brand_id))].filter((id) => !brandRows.some((b) => b.id === id));
if (missing.length) { console.error("products reference unknown brands:", missing); process.exit(1); }

// ---- build the statements -------------------------------------------------
// $seed$ dollar-quoting keeps the JSON literal intact without escaping.
// `pre` runs as its own statement *before* the CTE, because a WITH clause binds
// only to the single statement that follows it.
const load = (rows, sql, pre = "") =>
  `${pre}\nwith src as (select $seed$${JSON.stringify(rows)}$seed$::jsonb as d)\n${sql}`;

const statements = [
  ["categories", load(categories.map((c, i) => ({ ...c, sort: i })), `
insert into public.categories (id, name, icon, blurb, sort)
select id, name, icon, blurb, sort
from src, jsonb_to_recordset(src.d) as x(id text, name text, icon text, blurb text, sort int)
on conflict (id) do update set name = excluded.name, icon = excluded.icon,
  blurb = excluded.blurb, sort = excluded.sort;`)],

  ["brands", load(brandRows, `
insert into public.brands (id, name)
select id, name from src, jsonb_to_recordset(src.d) as x(id text, name text)
on conflict (id) do update set name = excluded.name;`)],

  ["vehicle_makes", load(makeRows, `
insert into public.vehicle_makes (id, name)
select id, name from src, jsonb_to_recordset(src.d) as x(id text, name text)
on conflict (id) do update set name = excluded.name;`)],

  ["vehicle_models", load(modelRows, `
insert into public.vehicle_models (id, make_id, name, year_from, year_to, fuels)
select id, make_id, name, year_from, year_to, fuels
from src, jsonb_to_recordset(src.d)
  as x(id text, make_id text, name text, year_from int, year_to int, fuels text[])
on conflict (id) do update set make_id = excluded.make_id, name = excluded.name,
  year_from = excluded.year_from, year_to = excluded.year_to, fuels = excluded.fuels;`)],

  ["products", load(productRows, `
insert into public.products
  (id, name, brand_id, category_id, price, old_price, description, specs,
   rating, in_stock, deal_of_day, universal, alt)
select id, name, brand_id, category_id, price, old_price, description, specs,
       rating, in_stock, deal_of_day, universal, alt
from src, jsonb_to_recordset(src.d)
  as x(id text, name text, brand_id text, category_id text, price numeric,
       old_price numeric, description text, specs jsonb, rating numeric,
       in_stock boolean, deal_of_day boolean, universal boolean, alt text)
on conflict (id) do update set
  name = excluded.name, brand_id = excluded.brand_id, category_id = excluded.category_id,
  price = excluded.price, old_price = excluded.old_price, description = excluded.description,
  specs = excluded.specs, rating = excluded.rating, in_stock = excluded.in_stock,
  deal_of_day = excluded.deal_of_day, universal = excluded.universal, alt = excluded.alt;`)],

  // child rows are fully replaced so re-runs cannot accumulate duplicates
  ["product_images", load(imageRows, `
insert into public.product_images (product_id, url, alt, position)
select product_id, url, alt, position
from src, jsonb_to_recordset(src.d) as x(product_id text, url text, alt text, position int);`,
    "delete from public.product_images;")],

  ["product_compatibility", load(compatRows, `
insert into public.product_compatibility (product_id, make, model, year_from, year_to, fuels)
select product_id, make, model, year_from, year_to, fuels
from src, jsonb_to_recordset(src.d)
  as x(product_id text, make text, model text, year_from int, year_to int, fuels text[]);`,
    "delete from public.product_compatibility;")],

  ["reviews", load(reviewRows, `
insert into public.reviews (product_id, author, rating, body)
select product_id, author, rating, body
from src, jsonb_to_recordset(src.d) as x(product_id text, author text, rating int, body text);`,
    "delete from public.reviews where user_id is null;")],
];

const exec = async (sql) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 500)}`);
};

for (const [label, sql] of statements) {
  await exec(sql);
  console.log(`seeded ${label}`);
}
console.log(`\ncounts sent: categories=${categories.length} brands=${brandRows.length} makes=${makeRows.length} models=${modelRows.length} products=${productRows.length} images=${imageRows.length} compat=${compatRows.length} reviews=${reviewRows.length}`);
