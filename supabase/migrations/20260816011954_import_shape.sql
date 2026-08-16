-- Reshape for the deannd import. Three changes, all forced by what the
-- source data actually contains — see the KML inspection notes.

-- ---------------------------------------------------------------
-- 1. Geography is not in the source. Backfill it, don't require it.
-- ---------------------------------------------------------------
-- The KMLs carry <name>, <coordinates> and a prose <description>. No
-- address, no city, no country — 2,135 placemarks, zero of either. So
-- import runs offline from the files alone, and a second pass reverse-
-- geocodes from the coordinates.

alter table places alter column city         drop not null;
alter table places alter column country_code drop not null;

-- slug is generated from name + city, so it can't exist until city does.
-- The unique constraint stays: Postgres permits many NULLs under it, so
-- slugs get written once, after the backfill, and no live URL ever changes.
alter table places alter column slug drop not null;

-- ---------------------------------------------------------------
-- 2. Keep the source layer. It means something different per file.
-- ---------------------------------------------------------------
-- Google My Maps folders encode season for Parts Unknown and The Layover,
-- DVD disc for A Cook's Tour, and venue category for No Reservations.
-- season/episode columns capture only the first of those, and re-deriving
-- the rest later means re-parsing the KMLs.

alter table appearances add column source_folder text;

comment on column appearances.source_folder is
  'Verbatim KML folder name. Season for parts_unknown/the_layover, DVD disc for a_cooks_tour, venue category for no_reservations.';

-- ---------------------------------------------------------------
-- 3. He didn't only eat.
-- ---------------------------------------------------------------
-- 239 No Reservations pins are markets, spas, hot springs, hotels and
-- sights. They belong on the trail. The map defaults to food and toggles
-- the rest on, so the distinction has to be queryable.
--
-- Derived from source_folder, so only No Reservations supplies it
-- directly; the other four files have no category axis and land on
-- 'unknown'. 'unknown' is mostly-but-not-only food — A Cook's Tour and
-- Parts Unknown both include sights — so it groups with food by default
-- rather than being hidden.

create type place_kind as enum ('food', 'market', 'sight', 'activity', 'lodging', 'unknown');

alter table places add column kind place_kind not null default 'unknown';

comment on column places.kind is
  'Derived from appearances.source_folder. Where a place has several appearances, the most food-forward wins: food > market > sight > activity > lodging, and any known category beats unknown.';
