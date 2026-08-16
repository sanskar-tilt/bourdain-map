-- The metro name people actually search for.
--
-- Nominatim returns Tokyo as its wards -- Minato, Shinjuku, Chuo, Chiyoda --
-- so there is no city called "Tokyo" in our data and searching for it finds
-- nothing. The state it returns alongside each ward *is* "Tokyo", which is
-- the name a person types. Same shape for London's boroughs and elsewhere.

alter table cities add column region text;

comment on column cities.region is
  'State/province from the geocoder. Searchable alias so "Tokyo" finds its wards.';
