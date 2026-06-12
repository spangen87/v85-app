-- v11: group_last_seen — spårar när en användare senast besökte ett sällskap.
-- Används för aktivitetssignaler (badge i navigeringen + "Nytt i dina sällskap"
-- på startsidan): innehåll skapat efter seen_at av andra medlemmar räknas som nytt.

create table if not exists group_last_seen (
  user_id  uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  seen_at  timestamptz not null default now(),
  primary key (user_id, group_id)
);

alter table group_last_seen enable row level security;

create policy "Användare hanterar sin egen last_seen"
  on group_last_seen for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
