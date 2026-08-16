-- Cities and episodes.
--
-- The KMLs carry no episode data at all, and `places.city` is raw reverse-
-- geocoder output — inconsistent by nature ("Yangon City", "City of
-- Westminster", "San Francisco"). Both of those get a proper home here.

-- ---------------------------------------------------------------
-- cities
-- ---------------------------------------------------------------
-- places.city stays as it is: provenance, exactly what Nominatim returned.
-- This is the normalised thing that has a URL and a page.

create table cities (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,        -- 'san-francisco-us'
  name          text not null,
  country_code  char(2),
  centroid      geography(point, 4326),      -- flyTo target, computed from members
  -- Official uploads only — CNN and Zero Point Zero's own channels. A dead
  -- link is worse than no link, and a pirated one sits badly against how this
  -- project treats everyone else's work.
  video_url     text,
  video_title   text,
  video_source  text,
  created_at    timestamptz not null default now(),
  constraint cities_video_needs_source check (video_url is null or video_source is not null)
);

create index cities_centroid_idx on cities using gist (centroid);
create index cities_country_idx on cities (country_code);

alter table places add column city_id uuid references cities(id) on delete set null;
create index places_city_id_idx on places (city_id);

comment on column places.city is
  'Raw reverse-geocoder output, kept as provenance. Join through city_id for anything user-facing.';

-- ---------------------------------------------------------------
-- episodes
-- ---------------------------------------------------------------
-- Canonical and independent of our places: 302 rows from Wikipedia, true
-- whether or not we hold a single restaurant from them.

create table episodes (
  id               uuid primary key default gen_random_uuid(),
  show             show_name not null,
  season           smallint,
  episode          smallint,                 -- within-season, normalised
  overall_episode  smallint,                 -- where the source numbered that way
  title            text not null,
  air_date         date,
  -- The raw location strings the episode list gave us, so a bad match can be
  -- re-derived later without refetching Wikipedia.
  source_locations text[] not null default '{}',
  created_at       timestamptz not null default now(),
  unique (show, season, episode)
);

create index episodes_show_idx on episodes (show, season, episode);

-- ---------------------------------------------------------------
-- city_episodes
-- ---------------------------------------------------------------
-- Genuinely many-to-many. A city can appear in several episodes across
-- several shows; one episode named for a country covers several of our
-- cities.

create type episode_match as enum ('exact', 'country', 'region', 'manual');

create table city_episodes (
  city_id     uuid not null references cities(id) on delete cascade,
  episode_id  uuid not null references episodes(id) on delete cascade,
  -- How we matched, so a weak match stays visibly weak rather than looking
  -- identical to a strong one in the UI.
  match_kind  episode_match not null,
  created_at  timestamptz not null default now(),
  primary key (city_id, episode_id)
);

create index city_episodes_episode_idx on city_episodes (episode_id);

-- ---------------------------------------------------------------
-- Reads
-- ---------------------------------------------------------------
-- Explicit, because Supabase grants anon/authenticated nothing usable on new
-- tables and an RLS policy without a grant is dead code. Same trap as the
-- first migration; not falling into it twice.

alter table cities        enable row level security;
alter table episodes      enable row level security;
alter table city_episodes enable row level security;

create policy "cities readable"        on cities        for select using (true);
create policy "episodes readable"      on episodes      for select using (true);
create policy "city episodes readable" on city_episodes for select using (true);

grant select on public.cities, public.episodes, public.city_episodes
  to anon, authenticated;
grant all on public.cities, public.episodes, public.city_episodes to service_role;
