-- Fix infinite recursion: snaps_select ↔ snap_recipients_select
-- Use SECURITY DEFINER helpers so policies don't cross-check each other under RLS.

create or replace function public.is_snap_sender(p_snap_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.snaps s
    where s.id = p_snap_id
      and s.sender_id = auth.uid()
  );
$$;

create or replace function public.is_snap_recipient(p_snap_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.snap_recipients r
    where r.snap_id = p_snap_id
      and r.recipient_id = auth.uid()
  );
$$;

revoke all on function public.is_snap_sender(uuid) from public;
revoke all on function public.is_snap_recipient(uuid) from public;
grant execute on function public.is_snap_sender(uuid) to authenticated;
grant execute on function public.is_snap_recipient(uuid) to authenticated;

-- Snaps: sender OR recipient (no direct join that re-enters snap_recipients RLS)
drop policy if exists "snaps_select" on public.snaps;
create policy "snaps_select" on public.snaps
  for select to authenticated
  using (
    sender_id = auth.uid()
    or public.is_snap_recipient(id)
  );

-- Recipients: self OR sender of parent snap
drop policy if exists "snap_recipients_select" on public.snap_recipients;
create policy "snap_recipients_select" on public.snap_recipients
  for select to authenticated
  using (
    recipient_id = auth.uid()
    or public.is_snap_sender(snap_id)
  );

-- Insert: must own the snap + be friends with recipient
drop policy if exists "snap_recipients_insert" on public.snap_recipients;
create policy "snap_recipients_insert" on public.snap_recipients
  for insert to authenticated
  with check (
    public.is_snap_sender(snap_id)
    and public.are_friends(auth.uid(), recipient_id)
  );
