-- Memories vault, block list, opt-in map locations

-- Saved personal media (yours forever — better than FOMO-only snaps)
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  media_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  caption text,
  source text not null default 'snap'
    check (source in ('snap', 'story', 'spotlight', 'upload')),
  created_at timestamptz not null default now()
);

create index if not exists memories_user_created_idx
  on public.memories (user_id, created_at desc);

-- Block: neither side can friend/message/snap
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists blocks_blocked_idx on public.blocks (blocked_id);

-- Opt-in live location for friends map
alter table public.profiles
  add column if not exists show_on_map boolean not null default false;

create table if not exists public.user_locations (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy_m double precision,
  updated_at timestamptz not null default now()
);

alter table public.memories enable row level security;
alter table public.blocks enable row level security;
alter table public.user_locations enable row level security;

drop policy if exists "memories_all_own" on public.memories;
create policy "memories_select" on public.memories
  for select to authenticated using (user_id = auth.uid());
create policy "memories_insert" on public.memories
  for insert to authenticated with check (user_id = auth.uid());
create policy "memories_delete" on public.memories
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "blocks_select" on public.blocks;
create policy "blocks_select" on public.blocks
  for select to authenticated
  using (blocker_id = auth.uid() or blocked_id = auth.uid());

create policy "blocks_insert" on public.blocks
  for insert to authenticated
  with check (blocker_id = auth.uid());

create policy "blocks_delete" on public.blocks
  for delete to authenticated
  using (blocker_id = auth.uid());

-- Locations: only friends who opted in, or self
create or replace function public.not_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

drop policy if exists "locations_select" on public.user_locations;
create policy "locations_select" on public.user_locations
  for select to authenticated
  using (
    user_id = auth.uid()
    or (
      exists (
        select 1 from public.profiles p
        where p.id = user_locations.user_id and p.show_on_map = true
      )
      and public.are_friends(auth.uid(), user_id)
      and public.not_blocked(auth.uid(), user_id)
    )
  );

create policy "locations_upsert" on public.user_locations
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "locations_update" on public.user_locations
  for update to authenticated
  using (user_id = auth.uid());

create policy "locations_delete" on public.user_locations
  for delete to authenticated
  using (user_id = auth.uid());

-- profiles: allow update show_on_map (already have update own)

grant select, insert, delete on public.memories to authenticated;
grant select, insert, delete on public.blocks to authenticated;
grant select, insert, update, delete on public.user_locations to authenticated;

-- Allow unfriend / block cleanup
drop policy if exists "friendships_delete" on public.friendships;
create policy "friendships_delete" on public.friendships
  for delete to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Storage: own memories paths already under user folder
