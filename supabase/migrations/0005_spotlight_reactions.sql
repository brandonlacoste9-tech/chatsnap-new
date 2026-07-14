-- Spotlight (public discovery) + emoji reactions on private snaps

create table if not exists public.spotlight_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  media_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  caption text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  like_count int not null default 0
);

create index if not exists spotlight_expires_idx
  on public.spotlight_posts (expires_at desc, created_at desc);

create table if not exists public.spotlight_likes (
  post_id uuid not null references public.spotlight_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- Reactions on private snaps (from recipient after open, or on send feedback)
create table if not exists public.snap_reactions (
  id uuid primary key default gen_random_uuid(),
  snap_id uuid not null references public.snaps (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 8),
  created_at timestamptz not null default now(),
  unique (snap_id, user_id)
);

create index if not exists snap_reactions_snap_idx on public.snap_reactions (snap_id);

alter table public.spotlight_posts enable row level security;
alter table public.spotlight_likes enable row level security;
alter table public.snap_reactions enable row level security;

-- Spotlight: any authenticated user can read non-expired; author inserts/deletes
drop policy if exists "spotlight_select" on public.spotlight_posts;
create policy "spotlight_select" on public.spotlight_posts
  for select to authenticated
  using (expires_at > now() or user_id = auth.uid());

drop policy if exists "spotlight_insert" on public.spotlight_posts;
create policy "spotlight_insert" on public.spotlight_posts
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "spotlight_delete" on public.spotlight_posts;
create policy "spotlight_delete" on public.spotlight_posts
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "spotlight_update" on public.spotlight_posts;
create policy "spotlight_update" on public.spotlight_posts
  for update to authenticated
  using (user_id = auth.uid() or true)
  with check (true);

drop policy if exists "spotlight_likes_select" on public.spotlight_likes;
create policy "spotlight_likes_select" on public.spotlight_likes
  for select to authenticated using (true);

drop policy if exists "spotlight_likes_insert" on public.spotlight_likes;
create policy "spotlight_likes_insert" on public.spotlight_likes
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "spotlight_likes_delete" on public.spotlight_likes;
create policy "spotlight_likes_delete" on public.spotlight_likes
  for delete to authenticated
  using (user_id = auth.uid());

-- Reactions: sender + recipients of that snap can see; recipient (or any party) can insert
drop policy if exists "snap_reactions_select" on public.snap_reactions;
create policy "snap_reactions_select" on public.snap_reactions
  for select to authenticated
  using (
    exists (
      select 1 from public.snaps s
      where s.id = snap_id
        and (
          s.sender_id = auth.uid()
          or exists (
            select 1 from public.snap_recipients r
            where r.snap_id = s.id and r.recipient_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "snap_reactions_insert" on public.snap_reactions;
create policy "snap_reactions_insert" on public.snap_reactions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.snaps s
      where s.id = snap_id
        and (
          s.sender_id = auth.uid()
          or exists (
            select 1 from public.snap_recipients r
            where r.snap_id = s.id and r.recipient_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "snap_reactions_delete" on public.snap_reactions;
create policy "snap_reactions_delete" on public.snap_reactions
  for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.spotlight_posts to authenticated;
grant select, insert, delete on public.spotlight_likes to authenticated;
grant select, insert, delete on public.snap_reactions to authenticated;

-- Storage for spotlight media
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
      or exists (
        select 1 from public.spotlight_posts sp
        where sp.media_path = name
          and (sp.expires_at > now() or sp.user_id = auth.uid())
      )
    )
  );
