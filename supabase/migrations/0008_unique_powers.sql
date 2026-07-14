-- ChatSnap unique powers: ephemeral DMs, vibe status, streak freeze

alter table public.messages
  add column if not exists ephemeral boolean not null default false;

alter table public.messages
  add column if not exists expires_at timestamptz;

alter table public.profiles
  add column if not exists vibe_status text;

alter table public.profiles
  add column if not exists vibe_updated_at timestamptz;

-- One free streak freeze per pair per week (anti-FOMO)
alter table public.friendship_streaks
  add column if not exists freeze_until date;

alter table public.friendship_streaks
  add column if not exists last_freeze_at timestamptz;

-- Cleanup helper: hide expired ephemeral from selects via app filter
-- (RLS still allows select for parties until client deletes)

create or replace function public.purge_ephemeral_message(mid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.messages
  where id = mid
    and ephemeral = true
    and (recipient_id = auth.uid() or sender_id = auth.uid());
end;
$$;

grant execute on function public.purge_ephemeral_message(uuid) to authenticated;
