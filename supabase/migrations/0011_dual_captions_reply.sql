-- Dual-language captions (EN + FR on one snap) + reply-to-snap chat context

alter table public.snaps
  add column if not exists caption_2 text;

alter table public.stories
  add column if not exists caption_2 text;

alter table public.spotlight_posts
  add column if not exists caption_2 text;

-- Optional vault dual caption
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'memories'
  ) then
    alter table public.memories add column if not exists caption_2 text;
  end if;
end $$;

-- Chat: soft reply context when responding to a snap (snap media may already be gone)
alter table public.messages
  add column if not exists reply_snippet text;

alter table public.messages
  add column if not exists reply_to_snap_id uuid;
