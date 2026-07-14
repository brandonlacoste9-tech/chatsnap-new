-- Soft rate limits + read receipt preference

alter table public.profiles
  add column if not exists hide_read_receipts boolean not null default false;

-- Simple action log for abuse resistance (client + RLS own rows only)
create table if not exists public.rate_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  action text not null check (char_length(action) between 2 and 40),
  created_at timestamptz not null default now()
);

create index if not exists rate_events_user_action_idx
  on public.rate_events (user_id, action, created_at desc);

alter table public.rate_events enable row level security;

create policy "rate_insert_own" on public.rate_events
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "rate_select_own" on public.rate_events
  for select to authenticated
  using (user_id = auth.uid());

grant select, insert on public.rate_events to authenticated;

-- Count recent actions for caller (security definer avoids client abuse of limits)
create or replace function public.count_recent_actions(p_action text, p_seconds int)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.rate_events
  where user_id = auth.uid()
    and action = p_action
    and created_at > now() - make_interval(secs => greatest(p_seconds, 1));
$$;

revoke all on function public.count_recent_actions(text, int) from public;
grant execute on function public.count_recent_actions(text, int) to authenticated;

create or replace function public.log_action(p_action text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.rate_events (user_id, action)
  values (auth.uid(), left(p_action, 40));
$$;

revoke all on function public.log_action(text) from public;
grant execute on function public.log_action(text) to authenticated;

-- Group rename by creator
drop policy if exists "chat_groups_update_owner" on public.chat_groups;
create policy "chat_groups_update_owner" on public.chat_groups
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

grant update on public.chat_groups to authenticated;
