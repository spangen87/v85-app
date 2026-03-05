-- ============================================================
-- MIGRATION v3: Grupper och häst-anteckningar
-- Kör detta i Supabase Dashboard → SQL Editor
-- ============================================================

-- profiles — visningsnamn per användare
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz default now()
);
alter table profiles enable row level security;

create policy "Inloggade kan läsa profiler"
  on profiles for select using (auth.role() = 'authenticated');

create policy "Användare kan uppdatera sin profil"
  on profiles for update using (auth.uid() = id);

create policy "Användare kan skapa sin profil"
  on profiles for insert with check (auth.uid() = id);

-- Trigger: skapa profil automatiskt vid ny användare
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- groups — sällskap (betting-grupper)
create table if not exists groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  invite_code text not null unique,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table groups enable row level security;

create policy "Inloggade kan skapa grupper"
  on groups for insert with check (auth.role() = 'authenticated');

create policy "Skapare kan uppdatera grupp"
  on groups for update using (created_by = auth.uid());


-- group_members — grupptillhörighet
create table if not exists group_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  unique(group_id, user_id)
);
alter table group_members enable row level security;

create policy "Användare ser sina egna medlemskap"
  on group_members for select using (user_id = auth.uid());

create policy "Användare kan gå med i grupper"
  on group_members for insert with check (user_id = auth.uid());

create policy "Användare kan lämna grupper"
  on group_members for delete using (user_id = auth.uid());

-- Lägg till groups-policyn nu när group_members finns
create policy "Medlemmar kan läsa sina grupper"
  on groups for select
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = groups.id
        and group_members.user_id = auth.uid()
    )
  );


-- horse_notes — anteckningar kopplade till häst-ID (persisterar över lopp)
create table if not exists horse_notes (
  id uuid primary key default uuid_generate_v4(),
  horse_id text not null references horses(id),
  group_id uuid not null references groups(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  content text not null,
  label text check (label in ('red','orange','yellow','green','blue','purple')) default null,
  parent_id uuid references horse_notes(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table horse_notes enable row level security;

create policy "Gruppmedlemmar kan läsa anteckningar"
  on horse_notes for select
  using (
    exists (
      select 1 from group_members
      where group_members.group_id = horse_notes.group_id
        and group_members.user_id = auth.uid()
    )
  );

create policy "Gruppmedlemmar kan skapa anteckningar"
  on horse_notes for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from group_members
      where group_members.group_id = horse_notes.group_id
        and group_members.user_id = auth.uid()
    )
  );

create policy "Författare kan ta bort sina anteckningar"
  on horse_notes for delete using (author_id = auth.uid());

create policy "Författare kan redigera sina anteckningar"
  on horse_notes for update using (author_id = auth.uid());


-- Index för vanliga queries
create index if not exists horse_notes_horse_id_idx on horse_notes(horse_id);
create index if not exists horse_notes_group_id_idx on horse_notes(group_id);
create index if not exists group_members_user_id_idx on group_members(user_id);

-- ============================================================
-- Skapa profiler för befintliga användare (kör en gång)
-- ============================================================
insert into profiles (id, display_name)
select id, split_part(email, '@', 1)
from auth.users
where id not in (select id from profiles)
on conflict (id) do nothing;
