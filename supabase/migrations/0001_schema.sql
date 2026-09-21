-- AutoParts Hub — core catalogue schema
-- Product ids stay human-readable slugs ('brake-pads-front') so they can be used
-- directly in URLs, matching the existing client routes.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- catalogue

create table if not exists public.categories (
  id    text primary key,
  name  text not null,
  icon  text not null,
  blurb text,
  sort  int  not null default 0
);

create table if not exists public.brands (
  id   text primary key,
  name text not null unique
);

create table if not exists public.products (
  id           text primary key,
  name         text not null,
  brand_id     text not null references public.brands(id)     on update cascade,
  category_id  text not null references public.categories(id) on update cascade,
  price        numeric(10,2) not null check (price >= 0),
  old_price    numeric(10,2) check (old_price is null or old_price >= price),
  description  text not null default '',
  specs        jsonb not null default '{}'::jsonb,
  rating       numeric(2,1) not null default 0 check (rating between 0 and 5),
  in_stock     boolean not null default true,
  deal_of_day  boolean not null default false,
  -- universal parts fit every vehicle and carry no compatibility rows
  universal    boolean not null default false,
  alt          text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_brand_idx    on public.products(brand_id);
create index if not exists products_price_idx    on public.products(price);
-- trigram index powers the fuzzy name/brand search used by the header autocomplete
create extension if not exists "pg_trgm";
create index if not exists products_name_trgm_idx on public.products using gin (name gin_trgm_ops);

create table if not exists public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  url        text not null,
  alt        text,
  position   int  not null default 0,
  unique (product_id, position)
);
create index if not exists product_images_product_idx on public.product_images(product_id);

-- One row per vehicle range a part fits. NULL fuels means "every engine".
create table if not exists public.product_compatibility (
  id         uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  make       text not null,
  model      text not null,
  year_from  int  not null check (year_from between 1950 and 2100),
  year_to    int  not null check (year_to   between 1950 and 2100),
  fuels      text[],
  constraint year_range_valid check (year_to >= year_from)
);
create index if not exists compat_product_idx on public.product_compatibility(product_id);
create index if not exists compat_lookup_idx  on public.product_compatibility(make, model, year_from, year_to);

create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  author     text not null,
  rating     int  not null check (rating between 1 and 5),
  body       text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists reviews_product_idx on public.reviews(product_id);

-- ------------------------------------------------------------ vehicle tree

create table if not exists public.vehicle_makes (
  id   text primary key,
  name text not null unique
);

create table if not exists public.vehicle_models (
  id        text primary key,
  make_id   text not null references public.vehicle_makes(id) on delete cascade,
  name      text not null,
  year_from int not null,
  year_to   int not null,
  fuels     text[] not null default '{}',
  constraint model_year_range_valid check (year_to >= year_from),
  unique (make_id, name)
);
create index if not exists vehicle_models_make_idx on public.vehicle_models(make_id);

-- ------------------------------------------------------- per-user shopping

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  created_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  qty        int  not null default 1 check (qty between 1 and 99),
  added_at   timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.wishlist_items (
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.orders (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  status       text not null default 'placed'
               check (status in ('placed','paid','shipped','delivered','cancelled')),
  subtotal     numeric(10,2) not null check (subtotal >= 0),
  shipping     numeric(10,2) not null default 0 check (shipping >= 0),
  total        numeric(10,2) not null check (total >= 0),
  ship_to      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders(user_id, created_at desc);

create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  -- name/price are copied so a past order still reads correctly if the
  -- catalogue entry is later renamed, repriced or removed
  name       text not null,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  qty        int not null check (qty > 0)
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- --------------------------------------------------------------- touch row

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
