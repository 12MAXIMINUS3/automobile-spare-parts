-- Server-side mirror of the client's compatibility rule (src/lib/compat.ts):
-- a part fits when it is universal, or when one of its compatibility rows matches
-- the make and model, the year falls inside the range, and — if that row limits
-- engines — the chosen fuel is among them.
--
-- All functions are SECURITY INVOKER (the default) so Row Level Security still
-- applies to whoever calls them. search_path is pinned so a caller cannot shadow
-- `public` with their own schema.

create or replace function public.product_fits_vehicle(
  p_product_id text,
  p_year       int,
  p_make       text,
  p_model      text,
  p_fuel       text default null
) returns boolean
language sql stable
set search_path = public, pg_temp
as $$
  select coalesce(
    (select p.universal from public.products p where p.id = p_product_id),
    false
  )
  or exists (
    select 1
    from public.product_compatibility c
    where c.product_id = p_product_id
      and c.make  = p_make
      and c.model = p_model
      and p_year between c.year_from and c.year_to
      and (c.fuels is null or p_fuel is null or p_fuel = any (c.fuels))
  );
$$;

-- Every part that fits the given vehicle, universal parts included.
create or replace function public.products_for_vehicle(
  p_year  int,
  p_make  text,
  p_model text,
  p_fuel  text default null
) returns setof public.products
language sql stable
set search_path = public, pg_temp
as $$
  select p.*
  from public.products p
  where p.universal
     or exists (
       select 1
       from public.product_compatibility c
       where c.product_id = p.id
         and c.make  = p_make
         and c.model = p_model
         and p_year between c.year_from and c.year_to
         and (c.fuels is null or p_fuel is null or p_fuel = any (c.fuels))
     )
  order by p.universal asc, p.rating desc;
$$;

-- Header autocomplete: matches product name, brand or category, best match first.
create or replace function public.search_products(p_query text, p_limit int default 8)
returns table (
  id text, name text, brand text, category text, price numeric, image text, score real
)
language sql stable
set search_path = public, pg_temp
as $$
  select p.id, p.name, b.name, c.name, p.price,
         (select i.url from public.product_images i
           where i.product_id = p.id order by i.position limit 1),
         greatest(
           similarity(p.name, p_query),
           similarity(b.name, p_query),
           similarity(c.name, p_query)
         ) as score
  from public.products p
  join public.brands     b on b.id = p.brand_id
  join public.categories c on c.id = p.category_id
  where p.name  ilike '%' || p_query || '%'
     or b.name  ilike '%' || p_query || '%'
     or c.name  ilike '%' || p_query || '%'
  order by score desc, p.rating desc
  limit p_limit;
$$;

-- Denormalised read model: one row per product with its images, compatibility and
-- human-readable brand/category folded in, so the client can hydrate a card or a
-- detail page in a single request. security_invoker keeps RLS in force.
create or replace view public.products_full
with (security_invoker = true) as
select
  p.id, p.name, p.price, p.old_price, p.description, p.specs, p.rating,
  p.in_stock, p.deal_of_day, p.universal, p.alt,
  p.brand_id, b.name as brand,
  p.category_id, c.name as category,
  coalesce(
    (select array_agg(i.url order by i.position)
       from public.product_images i where i.product_id = p.id),
    '{}'
  ) as images,
  coalesce(
    (select jsonb_agg(jsonb_build_object(
       'make', k.make, 'model', k.model,
       'yearFrom', k.year_from, 'yearTo', k.year_to, 'fuels', k.fuels)
       order by k.make, k.model)
       from public.product_compatibility k where k.product_id = p.id),
    '[]'::jsonb
  ) as compatibility,
  (select count(*) from public.reviews r where r.product_id = p.id) as review_count
from public.products p
join public.brands     b on b.id = p.brand_id
join public.categories c on c.id = p.category_id;
