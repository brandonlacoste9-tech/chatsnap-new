-- Direct messages + voice notes between friends

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text,
  media_path text,
  media_type text not null default 'text'
    check (media_type in ('text', 'audio', 'image')),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);

create index if not exists messages_pair_created_idx
  on public.messages (sender_id, recipient_id, created_at desc);

create index if not exists messages_recipient_unread_idx
  on public.messages (recipient_id, created_at desc)
  where read_at is null;

alter table public.messages enable row level security;

drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (
    auth.uid() = sender_id
    and public.are_friends(auth.uid(), recipient_id)
  );

drop policy if exists "messages_update" on public.messages;
create policy "messages_update" on public.messages
  for update to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

grant select, insert, update on public.messages to authenticated;

-- Storage: parties to a message can read its media_path
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
    )
  );
