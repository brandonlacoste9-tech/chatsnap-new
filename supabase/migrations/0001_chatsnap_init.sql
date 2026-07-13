-- ChatSnap v1 schema: profiles, friendships, snaps, storage RLS

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  locale text default 'en',
  created_at timestamptz not null default now(),
  constraint username_format check (
    username is null or username ~ '^[a-z0-9_]{3,20}$'
  )
);

create index if not exists profiles_username_idx on public.profiles (username);

-- Friendships
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create index if not exists friendships_requester_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

-- Snaps
create table if not exists public.snaps (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  media_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  duration_sec int not null check (duration_sec between 1 and 10),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists snaps_sender_idx on public.snaps (sender_id);

-- Recipients
create table if not exists public.snap_recipients (
  id uuid primary key default gen_random_uuid(),
  snap_id uuid not null references public.snaps (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'opened', 'consumed')),
  opened_at timestamptz,
  unique (snap_id, recipient_id)
);

create index if not exists snap_recipients_recipient_idx
  on public.snap_recipients (recipient_id, status);

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'locale', 'en')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helpers
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a)
      )
  );
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.snaps enable row level security;
alter table public.snap_recipients enable row level security;

-- Profiles policies
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

-- Friendships
drop policy if exists "friendships_select" on public.friendships;
create policy "friendships_select" on public.friendships
  for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "friendships_insert" on public.friendships;
create policy "friendships_insert" on public.friendships
  for insert to authenticated
  with check (auth.uid() = requester_id);

drop policy if exists "friendships_update" on public.friendships;
create policy "friendships_update" on public.friendships
  for update to authenticated
  using (auth.uid() = addressee_id or auth.uid() = requester_id);

-- Snaps
drop policy if exists "snaps_select" on public.snaps;
create policy "snaps_select" on public.snaps
  for select to authenticated
  using (
    sender_id = auth.uid()
    or exists (
      select 1 from public.snap_recipients r
      where r.snap_id = snaps.id and r.recipient_id = auth.uid()
    )
  );

drop policy if exists "snaps_insert" on public.snaps;
create policy "snaps_insert" on public.snaps
  for insert to authenticated
  with check (sender_id = auth.uid());

-- Recipients
drop policy if exists "snap_recipients_select" on public.snap_recipients;
create policy "snap_recipients_select" on public.snap_recipients
  for select to authenticated
  using (
    recipient_id = auth.uid()
    or exists (
      select 1 from public.snaps s
      where s.id = snap_recipients.snap_id and s.sender_id = auth.uid()
    )
  );

drop policy if exists "snap_recipients_insert" on public.snap_recipients;
create policy "snap_recipients_insert" on public.snap_recipients
  for insert to authenticated
  with check (
    exists (
      select 1 from public.snaps s
      where s.id = snap_id and s.sender_id = auth.uid()
    )
    and public.are_friends(auth.uid(), recipient_id)
  );

drop policy if exists "snap_recipients_update" on public.snap_recipients;
create policy "snap_recipients_update" on public.snap_recipients
  for update to authenticated
  using (recipient_id = auth.uid());

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('snaps', 'snaps', false)
on conflict (id) do nothing;

drop policy if exists "snaps_storage_upload" on storage.objects;
create policy "snaps_storage_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'snaps'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "snaps_storage_select" on storage.objects;
create policy "snaps_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'snaps'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.snaps s
        join public.snap_recipients r on r.snap_id = s.id
        where s.media_path = name
          and r.recipient_id = auth.uid()
          and r.status in ('pending', 'opened')
          and s.expires_at > now()
      )
    )
  );

drop policy if exists "snaps_storage_delete" on storage.objects;
create policy "snaps_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'snaps'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
