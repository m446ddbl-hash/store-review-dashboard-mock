-- No.5 mock dashboard: shared demo-state table
-- The published mock uses the public publishable key and anonymous access.
-- Keep real or confidential data out of this project.

create table if not exists public.store_review_state (
  id smallint primary key default 1 check (id = 1),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.store_review_state enable row level security;

grant select, insert, update on public.store_review_state to anon;

drop policy if exists "Public can read demo state" on public.store_review_state;
create policy "Public can read demo state"
  on public.store_review_state for select to anon using (true);

drop policy if exists "Public can create demo state" on public.store_review_state;
create policy "Public can create demo state"
  on public.store_review_state for insert to anon with check (id = 1);

drop policy if exists "Public can update demo state" on public.store_review_state;
create policy "Public can update demo state"
  on public.store_review_state for update to anon using (id = 1) with check (id = 1);
