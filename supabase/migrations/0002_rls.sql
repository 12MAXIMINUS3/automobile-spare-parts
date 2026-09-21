-- Row Level Security.
--
-- The anon key is public by design (it ships inside the browser bundle), so RLS
-- is the only thing standing between a stranger with that key and the data.
-- Enabling RLS without a matching policy denies everything, which is the
-- behaviour we want for every table by default.
--
-- Shape of the rules:
--   * catalogue tables  -> world readable, writable only by service_role
--     (service_role bypasses RLS entirely, so it needs no policy of its own)
--   * per-user tables   -> a row is visible and writable only by its owner
--
-- Note: the owner policies key off auth.uid(), so a signed-out visitor has no
-- cart, wishlist or orders. Enable "Anonymous sign-ins" in Auth settings (or add
-- real sign-in) so every visitor gets a uid and these policies apply cleanly.

-- ------------------------------------------------------- catalogue: read-only

alter table public.categories            enable row level security;
alter table public.brands                enable row level security;
alter table public.products              enable row level security;
alter table public.product_images        enable row level security;
alter table public.product_compatibility enable row level security;
alter table public.vehicle_makes         enable row level security;
alter table public.vehicle_models        enable row level security;
alter table public.reviews               enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'categories','brands','products','product_images',
    'product_compatibility','vehicle_makes','vehicle_models','reviews'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_public_read', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t || '_public_read', t
    );
  end loop;
end $$;

-- Signed-in users may post a review as themselves, and edit or delete only their own.
drop policy if exists reviews_insert_own on public.reviews;
create policy reviews_insert_own on public.reviews
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists reviews_update_own on public.reviews;
create policy reviews_update_own on public.reviews
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists reviews_delete_own on public.reviews;
create policy reviews_delete_own on public.reviews
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------- profiles

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ------------------------------------------------- cart & wishlist (owner only)

alter table public.cart_items     enable row level security;
alter table public.wishlist_items enable row level security;

do $$
declare t text;
begin
  foreach t in array array['cart_items','wishlist_items'] loop
    execute format('drop policy if exists %I on public.%I', t || '_own', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t || '_own', t
    );
  end loop;
end $$;

-- --------------------------------------------------------------- orders

alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

drop policy if exists orders_select_own on public.orders;
create policy orders_select_own on public.orders
  for select to authenticated using (user_id = auth.uid());

drop policy if exists orders_insert_own on public.orders;
create policy orders_insert_own on public.orders
  for insert to authenticated with check (user_id = auth.uid());

-- Order lines inherit their parent order's ownership.
drop policy if exists order_items_select_own on public.order_items;
create policy order_items_select_own on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

drop policy if exists order_items_insert_own on public.order_items;
create policy order_items_insert_own on public.order_items
  for insert to authenticated with check (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- Orders are deliberately not updatable or deletable from the client; status
-- changes belong to server-side code holding the service_role key.
