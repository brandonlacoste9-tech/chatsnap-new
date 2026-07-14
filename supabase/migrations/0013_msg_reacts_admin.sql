-- Message emoji reactions + admin reports queue

-- ——— Chat message reactions ———
create table if not exists public.message_reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 8),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists message_reactions_msg_idx
  on public.message_reactions (message_id);

alter table public.message_reactions enable row level security;

-- Participants of the message thread can see reactions
create policy "msg_react_select" on public.message_reactions
  for select to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_reactions.message_id
        and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
    )
  );

create policy "msg_react_insert" on public.message_reactions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.id = message_reactions.message_id
        and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
    )
  );

create policy "msg_react_update" on public.message_reactions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "msg_react_delete" on public.message_reactions
  for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.message_reactions to authenticated;

-- ——— Admin + report workflow ———
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

alter table public.reports
  add column if not exists status text not null default 'open'
    check (status in ('open', 'resolved', 'dismissed'));

alter table public.reports
  add column if not exists admin_note text;

alter table public.reports
  add column if not exists resolved_at timestamptz;

alter table public.reports
  add column if not exists resolved_by uuid references public.profiles (id);

create index if not exists reports_status_idx
  on public.reports (status, created_at desc);

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

-- Admins can read all reports
drop policy if exists "reports_select_admin" on public.reports;
create policy "reports_select_admin" on public.reports
  for select to authenticated
  using (public.is_app_admin() or reporter_id = auth.uid());

drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin" on public.reports
  for update to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

-- Admins can block via inserting blocks as themselves... use existing block flow from UI

grant update on public.reports to authenticated;

-- Bootstrap note: promote yourself once:
--   update public.profiles set is_admin = true where username = 'your_handle';
