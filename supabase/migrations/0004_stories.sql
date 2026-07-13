-- My Story: 24h posts visible to accepted friends

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  media_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  caption text,
  duration_sec int not null default 5 check (duration_sec between 1 and 15),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists stories_user_expires_idx
  on public.stories (user_id, expires_at desc);

create table if not exists public.story_views (
  story_id uuid not null references public.stories (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

alter table public.stories enable row level security;
alter table public.story_views enable row level security;

-- Author full access; friends can read non-expired
drop policy if exists "stories_select" on public.stories;
create policy "stories_select" on public.stories
  for select to authenticated
  using (
    user_id = auth.uid()
    or (
      expires_at > now()
      and public.are_friends(auth.uid(), user_id)
    )
  );

drop policy if exists "stories_insert" on public.stories;
create policy "stories_insert" on public.stories
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "stories_delete" on public.stories;
create policy "stories_delete" on public.stories
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "story_views_select" on public.story_views;
create policy "story_views_select" on public.story_views
  for select to authenticated
  using (
    viewer_id = auth.uid()
    or exists (
      select 1 from public.stories s
      where s.id = story_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "story_views_insert" on public.story_views;
create policy "story_views_insert" on public.story_views
  for insert to authenticated
  with check (viewer_id = auth.uid());

grant select, insert, delete on public.stories to authenticated;
grant select, insert on public.story_views to authenticated;

-- Storage: friends can sign URLs for active story media
drop policy if exists "snaps_storage_select" on storage.objects;
create policy "snaps_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'snaps'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.snaps s
        join public.snap_recipients r on r.snap_id = s.id
        where s.media_path = name
          and r.recipient_id = auth.uid()
          and r.status in ('pending', 'opened')
          and s.expires_at > now()
      )
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
    )
  );

-- Realtime publication
do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.snap_recipients;
  exception when duplicate_object then null;
  end;
end
$$;
