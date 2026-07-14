-- Timed map share (ghost) + web push subscriptions

alter table public.user_locations
  add column if not exists share_until timestamptz;

-- Coarse mode: friends only see rounded coords (city-ish)
alter table public.user_locations
  add column if not exists coarse boolean not null default false;

comment on column public.user_locations.share_until is
  'When set, pin auto-hides after this time (ghost share). Null = while map sharing is on.';

-- Push subscriptions (one user can have multiple devices)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subs_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_select_own" on public.push_subscriptions
  for select to authenticated
  using (user_id = auth.uid());

create policy "push_insert_own" on public.push_subscriptions
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "push_update_own" on public.push_subscriptions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "push_delete_own" on public.push_subscriptions
  for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- Caller may fetch push endpoints only for self or friends (for notify after snap)
create or replace function public.push_subs_for_notify(p_ids uuid[])
returns table (id uuid, endpoint text, p256dh text, auth text)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.endpoint, s.p256dh, s.auth
  from public.push_subscriptions s
  where s.user_id = any (p_ids)
    and (
      s.user_id = auth.uid()
      or public.are_friends(auth.uid(), s.user_id)
    );
$$;

revoke all on function public.push_subs_for_notify(uuid[]) from public;
grant execute on function public.push_subs_for_notify(uuid[]) to authenticated;
