-- Further RLS hardening for viewing snaps (storage + reactions)
-- Avoid joins that re-enter snaps ↔ snap_recipients under invoker RLS.

create or replace function public.can_read_snap_media(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- Own uploads (folder or media_path)
    (storage.foldername(object_name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.snaps s
      where s.media_path = object_name
        and s.sender_id = auth.uid()
    )
    or exists (
      select 1
      from public.snaps s
      join public.snap_recipients r on r.snap_id = s.id
      where s.media_path = object_name
        and r.recipient_id = auth.uid()
        and r.status in ('pending', 'opened')
        and s.expires_at > now()
    );
$$;

revoke all on function public.can_read_snap_media(text) from public;
grant execute on function public.can_read_snap_media(text) to authenticated;

-- Rebuild storage select for snaps bucket piece using helper for private snaps;
-- keep other media types (messages, stories, spotlight, groups) as before.
drop policy if exists "snaps_storage_select" on storage.objects;
create policy "snaps_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'snaps'
    and (
      public.can_read_snap_media(name)
      or exists (
        select 1 from public.messages m
        where m.media_path = name
          and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
      )
      or exists (
        select 1 from public.stories st
        where st.media_path = name
          and st.expires_at > now()
          and (
            st.user_id = auth.uid()
            or public.are_friends(auth.uid(), st.user_id)
          )
      )
      or exists (
        select 1 from public.spotlight_posts sp
        where sp.media_path = name
          and (sp.expires_at > now() or sp.user_id = auth.uid())
      )
      or exists (
        select 1 from public.group_messages gm
        where gm.media_path = name
          and public.is_group_member(gm.group_id)
      )
      or exists (
        select 1 from public.memories mem
        where mem.media_path = name
          and mem.user_id = auth.uid()
      )
      or exists (
        select 1 from public.user_stickers us
        where us.media_path = name
          and us.user_id = auth.uid()
      )
    )
  );

-- snap_reactions: no nested join on recipients under RLS
drop policy if exists "snap_reactions_select" on public.snap_reactions;
create policy "snap_reactions_select" on public.snap_reactions
  for select to authenticated
  using (
    public.is_snap_sender(snap_id)
    or public.is_snap_recipient(snap_id)
  );

drop policy if exists "snap_reactions_insert" on public.snap_reactions;
create policy "snap_reactions_insert" on public.snap_reactions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      public.is_snap_sender(snap_id)
      or public.is_snap_recipient(snap_id)
    )
  );
