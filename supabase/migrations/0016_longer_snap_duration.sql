-- Allow longer snap view times (and 0 = open until viewer closes)
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.snaps'::regclass
    and pg_get_constraintdef(oid) ilike '%duration_sec%';
  if cname is not null then
    execute format('alter table public.snaps drop constraint %I', cname);
  end if;
end $$;

alter table public.snaps
  add constraint snaps_duration_sec_check
  check (duration_sec = 0 or (duration_sec between 1 and 60));

-- Stories: allow up to 30s as well if constrained
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.stories'::regclass
    and pg_get_constraintdef(oid) ilike '%duration_sec%';
  if cname is not null then
    execute format('alter table public.stories drop constraint %I', cname);
    alter table public.stories
      add constraint stories_duration_sec_check
      check (duration_sec between 1 and 60);
  end if;
end $$;
