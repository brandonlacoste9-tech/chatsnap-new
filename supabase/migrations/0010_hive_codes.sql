-- Hive invite codes: private groups for growth without open spam
-- Join a hive → see members → one-tap friend request

create table if not exists public.hives (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null check (char_length(name) between 2 and 48),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  max_members int not null default 100 check (max_members between 5 and 500)
);

create index if not exists hives_code_idx on public.hives (code);
create index if not exists hives_created_by_idx on public.hives (created_by);

create table if not exists public.hive_members (
  hive_id uuid not null references public.hives (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (hive_id, user_id)
);

create index if not exists hive_members_user_idx
  on public.hive_members (user_id, joined_at desc);

alter table public.hives enable row level security;
alter table public.hive_members enable row level security;

-- Avoid RLS recursion when checking co-membership
create or replace function public.is_hive_member(p_hive uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hive_members
    where hive_id = p_hive and user_id = auth.uid()
  );
$$;

revoke all on function public.is_hive_member(uuid) from public;
grant execute on function public.is_hive_member(uuid) to authenticated;

-- Members + creator can read hive rows
create policy "hives_select_member_or_creator" on public.hives
  for select to authenticated
  using (
    created_by = auth.uid()
    or public.is_hive_member(id)
  );

create policy "hives_insert" on public.hives
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "hives_update_owner" on public.hives
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "hives_delete_owner" on public.hives
  for delete to authenticated
  using (created_by = auth.uid());

-- Own row always; co-members via definer helper (no recursion)
create policy "hive_members_select" on public.hive_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_hive_member(hive_id)
  );

create policy "hive_members_insert_self" on public.hive_members
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "hive_members_delete_self_or_owner" on public.hive_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.hives h
      where h.id = hive_members.hive_id and h.created_by = auth.uid()
    )
  );

-- Join by code without exposing the full hives table
create or replace function public.join_hive_by_code(p_code text)
returns public.hives
language plpgsql
security definer
set search_path = public
as $$
declare
  h public.hives;
  cnt int;
  clean text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  clean := upper(regexp_replace(trim(p_code), '[^A-Z0-9]', '', 'g'));
  if char_length(clean) < 4 then
    raise exception 'invalid_code';
  end if;

  select * into h from public.hives where code = clean;
  if h.id is null then
    raise exception 'not_found';
  end if;

  select count(*)::int into cnt from public.hive_members where hive_id = h.id;
  if cnt >= h.max_members then
    raise exception 'full';
  end if;

  insert into public.hive_members (hive_id, user_id)
  values (h.id, auth.uid())
  on conflict do nothing;

  return h;
end;
$$;

revoke all on function public.join_hive_by_code(text) from public;
grant execute on function public.join_hive_by_code(text) to authenticated;
