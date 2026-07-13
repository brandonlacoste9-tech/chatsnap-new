-- Captions on snaps + friendship streaks

alter table public.snaps
  add column if not exists caption text;

-- Pair key: lower uuid first so A↔B is one row
create table if not exists public.friendship_streaks (
  user_low uuid not null references public.profiles (id) on delete cascade,
  user_high uuid not null references public.profiles (id) on delete cascade,
  streak_count int not null default 0 check (streak_count >= 0),
  last_active_date date not null default (timezone('utc', now()))::date,
  updated_at timestamptz not null default now(),
  primary key (user_low, user_high),
  check (user_low < user_high)
);

create index if not exists friendship_streaks_user_low_idx
  on public.friendship_streaks (user_low);
create index if not exists friendship_streaks_user_high_idx
  on public.friendship_streaks (user_high);

alter table public.friendship_streaks enable row level security;

drop policy if exists "streaks_select" on public.friendship_streaks;
create policy "streaks_select" on public.friendship_streaks
  for select to authenticated
  using (auth.uid() = user_low or auth.uid() = user_high);

drop policy if exists "streaks_upsert" on public.friendship_streaks;
create policy "streaks_insert" on public.friendship_streaks
  for insert to authenticated
  with check (auth.uid() = user_low or auth.uid() = user_high);

drop policy if exists "streaks_update" on public.friendship_streaks;
create policy "streaks_update" on public.friendship_streaks
  for update to authenticated
  using (auth.uid() = user_low or auth.uid() = user_high);

grant select, insert, update on public.friendship_streaks to authenticated;
