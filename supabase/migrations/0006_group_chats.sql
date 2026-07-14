-- Group chats (friends only as members)

create table if not exists public.chat_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_group_members (
  group_id uuid not null references public.chat_groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.chat_groups (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text,
  media_path text,
  media_type text not null default 'text'
    check (media_type in ('text', 'audio', 'image')),
  created_at timestamptz not null default now()
);

create index if not exists group_messages_group_created_idx
  on public.group_messages (group_id, created_at desc);

create index if not exists chat_group_members_user_idx
  on public.chat_group_members (user_id);

alter table public.chat_groups enable row level security;
alter table public.chat_group_members enable row level security;
alter table public.group_messages enable row level security;

create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.chat_group_members m
    where m.group_id = gid and m.user_id = auth.uid()
  );
$$;

-- Groups: members can see; creator inserts
drop policy if exists "chat_groups_select" on public.chat_groups;
create policy "chat_groups_select" on public.chat_groups
  for select to authenticated
  using (public.is_group_member(id) or created_by = auth.uid());

drop policy if exists "chat_groups_insert" on public.chat_groups;
create policy "chat_groups_insert" on public.chat_groups
  for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists "chat_groups_delete" on public.chat_groups;
create policy "chat_groups_delete" on public.chat_groups
  for delete to authenticated
  using (created_by = auth.uid());

-- Members
drop policy if exists "group_members_select" on public.chat_group_members;
create policy "group_members_select" on public.chat_group_members
  for select to authenticated
  using (public.is_group_member(group_id) or user_id = auth.uid());

drop policy if exists "group_members_insert" on public.chat_group_members;
create policy "group_members_insert" on public.chat_group_members
  for insert to authenticated
  with check (
    -- creator adds self or friends when creating
    auth.uid() = user_id
    or exists (
      select 1 from public.chat_groups g
      where g.id = group_id and g.created_by = auth.uid()
    )
  );

drop policy if exists "group_members_delete" on public.chat_group_members;
create policy "group_members_delete" on public.chat_group_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.chat_groups g
      where g.id = group_id and g.created_by = auth.uid()
    )
  );

-- Messages
drop policy if exists "group_messages_select" on public.group_messages;
create policy "group_messages_select" on public.group_messages
  for select to authenticated
  using (public.is_group_member(group_id));

drop policy if exists "group_messages_insert" on public.group_messages;
create policy "group_messages_insert" on public.group_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_group_member(group_id)
  );

grant select, insert, delete on public.chat_groups to authenticated;
grant select, insert, delete on public.chat_group_members to authenticated;
grant select, insert on public.group_messages to authenticated;

-- Storage: group members can read voice notes
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
      or exists (
        select 1 from public.group_messages gm
        where gm.media_path = name
          and public.is_group_member(gm.group_id)
      )
    )
  );

-- Realtime
do $$
begin
  begin
    alter publication supabase_realtime add table public.group_messages;
  exception when duplicate_object then null;
  end;
end
$$;
