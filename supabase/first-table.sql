-- The first table. Run this against the hosted database AFTER you have
-- signed in to the live site at least once, because it needs your user to
-- exist. Signing in creates your profile automatically (the trigger in
-- 20260816013000_grants_and_policies.sql does it).
--
-- Edit the three values in the CONFIG block, then paste the whole file into
-- the Supabase SQL editor and run it.

begin;

with config as (
  select
    -- 1. YOUR EMAIL, the one you signed in with.
    'sanskardugar2001@gmail.com'::text          as host_email,

    -- 2. WHERE. The slug from the pin's URL — open it on the map and copy the
    --    bit after /place/. These are all London places he actually went:
    --      saint-john-restaurant-greater-london   St. John, Smithfield
    --      e-pellicci-greater-london              E. Pellicci, Bethnal Green
    --      rochelle-canteen-greater-london        Rochelle Canteen
    --      borough-market-greater-london          Borough Market
    --      f-cooke-greater-london                 F. Cooke, pie and mash
    --    Run the SELECT at the bottom of this file to list the rest.
    'saint-john-restaurant-greater-london'::text as place_slug,

    -- 3. WHEN. Local time, 24h. Leave it in the future.
    '2026-09-04 19:00:00+01'::timestamptz        as starts_at
)
insert into public.gatherings (place_id, host_id, starts_at, seats, blurb, status)
select
  p.id,
  u.id,
  c.starts_at,
  6,
  'The first one. I have no plan beyond turning up hungry.',
  'open'
from config c
join public.places p on p.slug = c.place_slug
join auth.users u on u.email = c.host_email
-- Idempotent: running this twice will not create two tables.
where not exists (
  select 1 from public.gatherings g
  where g.place_id = p.id and g.host_id = u.id and g.starts_at = c.starts_at
);

commit;

-- Did it work?
select g.id, p.name, p.city, g.starts_at, g.seats, g.status
from public.gatherings g join public.places p on p.id = g.place_id
order by g.created_at desc limit 5;

-- Every London place, to pick from. Note the geocoder splits London across
-- 'Greater London', 'City of Westminster' and 'City of London', so match on
-- the country and a bounding box rather than on one city name:
--   select p.slug, p.name, c.name as city
--   from public.places p join public.cities c on c.id = p.city_id
--   where c.country_code = 'GB'
--     and c.name in ('Greater London','City of Westminster','City of London')
--   order by c.name, p.name;
