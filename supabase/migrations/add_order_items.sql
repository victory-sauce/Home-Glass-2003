create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  width numeric not null,
  height numeric not null,
  quantity integer not null default 1,
  thickness numeric not null,
  glass_type text not null,
  allow_rotation boolean not null default true,
  notes text,
  created_at timestamptz default now()
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_material_idx on public.order_items(glass_type, thickness);

alter table public.order_items enable row level security;

-- Temporary anon testing policies (mirrors current testing posture in this app).
drop policy if exists "order_items_anon_select" on public.order_items;
create policy "order_items_anon_select" on public.order_items
for select to anon using (true);

drop policy if exists "order_items_anon_insert" on public.order_items;
create policy "order_items_anon_insert" on public.order_items
for insert to anon with check (true);

drop policy if exists "order_items_anon_update" on public.order_items;
create policy "order_items_anon_update" on public.order_items
for update to anon using (true) with check (true);

drop policy if exists "order_items_anon_delete" on public.order_items;
create policy "order_items_anon_delete" on public.order_items
for delete to anon using (true);

-- Authenticated app policies.
drop policy if exists "order_items_auth_select" on public.order_items;
create policy "order_items_auth_select" on public.order_items
for select to authenticated using (true);

drop policy if exists "order_items_auth_insert" on public.order_items;
create policy "order_items_auth_insert" on public.order_items
for insert to authenticated with check (true);

drop policy if exists "order_items_auth_update" on public.order_items;
create policy "order_items_auth_update" on public.order_items
for update to authenticated using (true) with check (true);

drop policy if exists "order_items_auth_delete" on public.order_items;
create policy "order_items_auth_delete" on public.order_items
for delete to authenticated using (true);
