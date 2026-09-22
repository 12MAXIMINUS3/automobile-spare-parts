-- Golf cart accessories as a second department.
--
-- Car parts and golf cart accessories share the same products table but must
-- never mix in listings, so departments are modelled on the category: a product
-- belongs to whichever department its category does. Existing categories become
-- 'auto' so nothing about the car-parts storefront changes.

alter table public.categories
  add column if not exists department text not null default 'auto'
  check (department in ('auto', 'golf'));

create index if not exists categories_department_idx on public.categories(department);

insert into public.categories (id, name, icon, blurb, sort, department) values
  ('golf-lighting',    'Lighting',            'lightbulb', 'Light bars, headlights & underglow', 1, 'golf'),
  ('golf-tops',        'Tops & Windshields',  'umbrella',  'Canopies, roofs & folding screens',  2, 'golf'),
  ('golf-seats',       'Seats & Storage',     'armchair',  'Covers, rear seats & cargo boxes',   3, 'golf'),
  ('golf-dash',        'Dash & Interior',     'gauge',     'Dash kits, holders & floor mats',    4, 'golf'),
  ('golf-exterior',    'Mirrors & Exterior',  'car-front', 'Mirrors, trim & body accents',       5, 'golf')
on conflict (id) do update set
  name = excluded.name, icon = excluded.icon, blurb = excluded.blurb,
  sort = excluded.sort, department = excluded.department;

-- Surface the department on the read model so the client can filter in one query.
-- The column lands mid-list, so the view is dropped rather than replaced.
drop view if exists public.products_full;
create view public.products_full
with (security_invoker = true) as
select
  p.id, p.name, p.price, p.old_price, p.description, p.specs, p.rating,
  p.in_stock, p.deal_of_day, p.universal, p.alt,
  p.brand_id, b.name as brand,
  p.category_id, c.name as category, c.department,
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

-- Vehicle matching is a car-parts concept. Restricting it to the auto department
-- stops a universal golf accessory being reported as fitting someone's Corolla.
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
  join public.categories c on c.id = p.category_id and c.department = 'auto'
  where p.universal
     or exists (
       select 1
       from public.product_compatibility k
       where k.product_id = p.id
         and k.make  = p_make
         and k.model = p_model
         and p_year between k.year_from and k.year_to
         and (k.fuels is null or p_fuel is null or p_fuel = any (k.fuels))
     )
  order by p.universal asc, p.rating desc;
$$;

-- Brands specific to the golf cart aisle.
insert into public.brands (id, name) values
  ('greenline', 'GreenLine'), ('fairway-pro', 'Fairway Pro'),
  ('linksgear', 'LinksGear'), ('caddytech', 'CaddyTech')
on conflict (id) do update set name = excluded.name;
