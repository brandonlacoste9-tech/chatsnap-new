-- Allow senders to erase snaps; recipients to dismiss inbox items

drop policy if exists "snaps_delete_own" on public.snaps;
create policy "snaps_delete_own" on public.snaps
  for delete to authenticated
  using (sender_id = auth.uid());

drop policy if exists "snap_recipients_delete" on public.snap_recipients;
create policy "snap_recipients_delete" on public.snap_recipients
  for delete to authenticated
  using (
    recipient_id = auth.uid()
    or public.is_snap_sender(snap_id)
  );

grant delete on public.snaps to authenticated;
grant delete on public.snap_recipients to authenticated;
