-- Custom stickers, reports, restricted mode (safety)

create table if not exists public.user_stickers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  media_path text not null,
  label text,
  created_at timestamptz not null default now()
);

create index if not exists user_stickers_user_idx
  on public.user_stickers (user_id, created_at desc);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  context text,
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

create index if not exists reports_reported_idx on public.reports (reported_id);

alter table public.profiles
  add column if not exists restricted_mode boolean not null default false;

alter table public.user_stickers enable row level security;
alter table public.reports enable row level security;

create policy "stickers_select_own" on public.user_stickers
  for select to authenticated using (user_id = auth.uid());
create policy "stickers_insert_own" on public.user_stickers
  for insert to authenticated with check (user_id = auth.uid());
create policy "stickers_delete_own" on public.user_stickers
  for delete to authenticated using (user_id = auth.uid());

create policy "reports_insert" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());
create policy "reports_select_own" on public.reports
  for select to authenticated using (reporter_id = auth.uid());

grant select, insert, delete on public.user_stickers to authenticated;
grant select, insert on public.reports to authenticated;

-- Storage already allows own user folder (stickers under {uid}/stickers/)
