-- Admin role.
--
-- The dashboard runs in the browser with the public anon key, so "admin" cannot
-- be a client-side flag - it has to be enforced by RLS. Membership lives in
-- public.admins and is checked by is_admin().
--
-- is_admin() is SECURITY DEFINER on purpose: it reads public.admins, which is
-- itself RLS-protected. A plain function would need a policy on admins to read
-- admins, which recurses. Running as the definer reads the table directly and
-- breaks that cycle. search_path is pinned so the body cannot be hijacked.

create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  note       text
);

alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Admins may see the roster; no client may modify it (service_role only, which
-- bypasses RLS). Granting admin is therefore a deliberate server-side act.
drop policy if exists admins_read on public.admins;
create policy admins_read on public.admins
  for select to authenticated using (public.is_admin());

-- ------------------------------------------------- catalogue write access

do $$
declare t text;
begin
  foreach t in array array[
    'products','product_images','product_compatibility','categories','brands',
    'vehicle_makes','vehicle_models'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_write', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (public.is_admin()) with check (public.is_admin())',
      t || '_admin_write', t
    );
  end loop;
end $$;

-- Admins moderate reviews too.
drop policy if exists reviews_admin_write on public.reviews;
create policy reviews_admin_write on public.reviews
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------- orders

-- Customers keep seeing only their own orders (orders_select_own); this adds a
-- second permissive policy so admins see every order.
drop policy if exists orders_admin_read on public.orders;
create policy orders_admin_read on public.orders
  for select to authenticated using (public.is_admin());

drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists order_items_admin_read on public.order_items;
create policy order_items_admin_read on public.order_items
  for select to authenticated using (public.is_admin());

-- ------------------------------------------------------ dashboard reads

-- Headline numbers. Guarded explicitly so a non-admin calling the RPC directly
-- gets an error rather than aggregate data leaking past RLS.
create or replace function public.admin_stats()
returns json
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare result json;
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  select json_build_object(
    'products',      (select count(*) from public.products),
    'out_of_stock',  (select count(*) from public.products where not in_stock),
    'orders',        (select count(*) from public.orders),
    'revenue',       (select coalesce(sum(total), 0) from public.orders),
    'avg_order',     (select coalesce(avg(total), 0) from public.orders),
    'customers',     (select count(*) from auth.users where not is_anonymous),
    'visitors',      (select count(*) from auth.users where is_anonymous),
    'open_carts',    (select count(distinct user_id) from public.cart_items),
    'reviews',       (select count(*) from public.reviews)
  ) into result;

  return result;
end $$;

revoke all on function public.admin_stats() from public;
grant execute on function public.admin_stats() to authenticated;

-- Daily revenue for the dashboard chart, zero-filled so gaps render as gaps.
create or replace function public.admin_revenue_daily(p_days int default 30)
returns table (day date, revenue numeric, orders bigint)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  return query
  select d::date,
         coalesce(sum(o.total), 0)::numeric,
         count(o.id)
  from generate_series(
         current_date - (p_days - 1) * interval '1 day',
         current_date,
         interval '1 day'
       ) d
  left join public.orders o on o.created_at::date = d::date
  group by d
  order by d;
end $$;

revoke all on function public.admin_revenue_daily(int) from public;
grant execute on function public.admin_revenue_daily(int) to authenticated;

-- Best sellers by units shipped.
create or replace function public.admin_top_products(p_limit int default 5)
returns table (product_id text, name text, units bigint, revenue numeric)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  return query
  select i.product_id, i.name, sum(i.qty)::bigint, sum(i.qty * i.unit_price)::numeric
  from public.order_items i
  group by i.product_id, i.name
  order by 3 desc
  limit p_limit;
end $$;

revoke all on function public.admin_top_products(int) from public;
grant execute on function public.admin_top_products(int) to authenticated;
