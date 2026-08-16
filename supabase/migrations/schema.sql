-- Bourdain map — initial schema
-- Postgres / Supabase. Requires postgis.
-- Data seeded from deannd's compilation (r/AnthonyBourdain), used with permission.
-- Non-commercial: no affiliate links, no bookings, no ads.

create extension if not exists postgis;

-- ---------------------------------------------------------------
-- 1. THE CANON — places he went. Read-only to users; you seed these.
-- ---------------------------------------------------------------

create type place_status as enum ('open', 'closed', 'moved', 'unknown');

create table places (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,          -- 'swan-oyster-depot-sf'
  name          text not null,
  city          text not null,
  country_code  char(2) not null,              -- ISO 3166-1 alpha-2
  address       text,
  geog          geography(point, 4326) not null,
  status        place_status not null default 'unknown',
  status_note   text,                          -- 'closed 2019, owner retired'
  google_place_id text,                        -- for later enrichment / dedupe
  source        text,                          -- 'deannd', 'submitted', etc.
  created_at    timestamptz not null default now()
);

create index places_geog_idx on places using gist (geog);
create index places_city_idx on places (country_code, city);

-- One place can appear in several shows/episodes. deannd's data has
-- duplicates for exactly this reason — split them out instead of
-- collapsing, or you lose the episode trail.

create type show_name as enum ('a_cooks_tour', 'no_reservations', 'the_layover', 'parts_unknown', 'book', 'other');

create table appearances (
  id            uuid primary key default gen_random_uuid(),
  place_id      uuid not null references places(id) on delete cascade,
  show          show_name not null,
  season        smallint,
  episode       smallint,
  episode_title text,
  air_date      date,
  what_he_ate   text,                          -- keep short, your words not the script's
  note          text,
  created_at    timestamptz not null default now()
);

create index appearances_place_idx on appearances (place_id);

-- ---------------------------------------------------------------
-- 2. TABLES — the point of the whole thing. Someone opens a seat.
-- ---------------------------------------------------------------

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null,
  bio           text,
  city          text,
  created_at    timestamptz not null default now()
);

create type gathering_status as enum ('open', 'full', 'happened', 'cancelled');

create table gatherings (
  id            uuid primary key default gen_random_uuid(),
  place_id      uuid not null references places(id) on delete restrict,
  host_id       uuid not null references profiles(id) on delete cascade,
  starts_at     timestamptz not null,
  seats         smallint not null check (seats between 2 and 20),
  blurb         text,                          -- "showing up hungry, no plan"
  status        gathering_status not null default 'open',
  created_at    timestamptz not null default now()
);

create index gatherings_place_idx on gatherings (place_id);
create index gatherings_upcoming_idx on gatherings (starts_at) where status = 'open';

create type rsvp_status as enum ('going', 'waitlist', 'withdrawn', 'attended', 'no_show');

create table rsvps (
  gathering_id  uuid not null references gatherings(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  status        rsvp_status not null default 'going',
  created_at    timestamptz not null default now(),
  primary key (gathering_id, user_id)
);

-- ---------------------------------------------------------------
-- 3. STORIES — what happened. Not reviews. No stars, deliberately.
-- ---------------------------------------------------------------

create table stories (
  id            uuid primary key default gen_random_uuid(),
  place_id      uuid not null references places(id) on delete cascade,
  gathering_id  uuid references gatherings(id) on delete set null,
  author_id     uuid not null references profiles(id) on delete cascade,
  visited_on    date not null,
  body          text not null check (char_length(body) between 100 and 2000),
  published     boolean not null default false,
  created_at    timestamptz not null default now()
);

create index stories_place_idx on stories (place_id) where published;

-- ---------------------------------------------------------------
-- 4. CORRECTIONS — fans will know more than your seed data does.
-- ---------------------------------------------------------------

create table corrections (
  id            uuid primary key default gen_random_uuid(),
  place_id      uuid references places(id) on delete cascade,
  submitter_id  uuid references profiles(id) on delete set null,
  kind          text not null,                 -- 'closed', 'wrong_coords', 'missing_place', 'episode'
  body          text not null,
  resolved      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------

alter table places      enable row level security;
alter table appearances enable row level security;
alter table profiles    enable row level security;
alter table gatherings  enable row level security;
alter table rsvps       enable row level security;
alter table stories     enable row level security;
alter table corrections enable row level security;

create policy "places readable"      on places      for select using (true);
create policy "appearances readable" on appearances for select using (true);
create policy "profiles readable"    on profiles    for select using (true);
create policy "gatherings readable"  on gatherings  for select using (true);

create policy "own profile"      on profiles   for update using (auth.uid() = id);
create policy "host gathering"   on gatherings for insert with check (auth.uid() = host_id);
create policy "edit own gathering" on gatherings for update using (auth.uid() = host_id);
create policy "own rsvp"         on rsvps      for all    using (auth.uid() = user_id);
create policy "published stories" on stories    for select using (published or auth.uid() = author_id);
create policy "write own story"  on stories    for insert with check (auth.uid() = author_id);
create policy "submit correction" on corrections for insert with check (true);
