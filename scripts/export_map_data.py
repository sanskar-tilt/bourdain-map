#!/usr/bin/env python3
"""Export the map's data as static files.

2,095 places is small enough that the whole map — pins, search index,
city list — ships as static JSON. No query on first paint, no network
round trip when someone types, nothing to rate-limit. A server-side
search over this many rows would feel dead by comparison.

Reads from the local Supabase Postgres (psql inside the container), which
is where the seed, the geocode backfill and the city join have all landed.

    python3 scripts/export_map_data.py

Writes:
    public/data/places.geojson   pin geometry + the properties the map paints
    public/data/search.json      the client-side index: places and cities
"""

import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'data')
CONTAINER = os.environ.get('SUPABASE_DB_CONTAINER', 'supabase_db_bourdain-map')


def query(sql):
    """Run SQL in the local Supabase container and parse a single JSON value."""
    proc = subprocess.run(
        ['docker', 'exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres',
         '-t', '-A', '-c', sql],
        capture_output=True, text=True)
    if proc.returncode != 0:
        sys.exit(f'psql failed:\n{proc.stderr}')
    out = proc.stdout.strip()
    return json.loads(out) if out and out != '' else None


PLACES_SQL = """
select json_agg(f)
from (
  select json_build_object(
    'type','Feature',
    'geometry', json_build_object(
      'type','Point',
      'coordinates', json_build_array(
        round(extensions.st_x(p.geog::extensions.geometry)::numeric, 5),
        round(extensions.st_y(p.geog::extensions.geometry)::numeric, 5))),
    'properties', json_build_object(
      'id', p.id,
      'slug', p.slug,
      'name', p.name,
      'city', c.name,
      'citySlug', c.slug,
      'cc', p.country_code,
      'kind', p.kind,
      'status', p.status,
      -- how many times he went; drives the repeat-visit marker
      'visits', (select count(*) from appearances a where a.place_id = p.id),
      -- a meal with people whose names nobody wrote down is not a missing
      -- name, and the map needs to know the difference
      'unnamed', (p.name ilike 'meal with%')
    )
  ) as f
  from places p
  left join cities c on c.id = p.city_id
  order by p.name
) t;
"""

SEARCH_SQL = """
select json_build_object(
  'places', (
    select coalesce(json_agg(json_build_object(
      'id', p.id, 'slug', p.slug, 'name', p.name,
      'city', c.name, 'citySlug', c.slug, 'cc', p.country_code,
      'status', p.status, 'kind', p.kind,
      'lon', round(extensions.st_x(p.geog::extensions.geometry)::numeric, 5),
      'lat', round(extensions.st_y(p.geog::extensions.geometry)::numeric, 5)
    ) order by p.name), '[]'::json)
    from places p left join cities c on c.id = p.city_id
  ),
  'cities', (
    select coalesce(json_agg(json_build_object(
      'slug', c.slug, 'name', c.name, 'cc', c.country_code, 'region', c.region,
      'places', (select count(*) from places p where p.city_id = c.id),
      'lon', round(extensions.st_x(c.centroid::extensions.geometry)::numeric, 5),
      'lat', round(extensions.st_y(c.centroid::extensions.geometry)::numeric, 5)
    ) order by (select count(*) from places p where p.city_id = c.id) desc, c.name), '[]'::json)
    from cities c
  )
);
"""


DETAIL_SQL = """
select json_build_object(
  'places', (
    select coalesce(json_agg(json_build_object(
      'id', p.id, 'slug', p.slug, 'name', p.name, 'status', p.status,
      'statusNote', p.status_note, 'kind', p.kind,
      'city', c.name, 'citySlug', c.slug, 'cc', p.country_code,
      'lon', round(extensions.st_x(p.geog::extensions.geometry)::numeric, 5),
      'lat', round(extensions.st_y(p.geog::extensions.geometry)::numeric, 5),
      'appearances', (
        select coalesce(json_agg(json_build_object(
          'show', a.show, 'season', a.season, 'episode', a.episode,
          'episodeTitle', a.episode_title, 'airDate', a.air_date,
          'episodeSource', a.episode_source,
          'ate', a.what_he_ate, 'note', a.note, 'folder', a.source_folder
        ) order by a.show, a.season nulls first), '[]'::json)
        from appearances a where a.place_id = p.id)
    ) order by p.slug), '[]'::json)
    from places p left join cities c on c.id = p.city_id
    where p.slug is not null
  ),
  'cities', (
    select coalesce(json_agg(json_build_object(
      'id', c.id, 'slug', c.slug, 'name', c.name, 'cc', c.country_code,
      'lon', round(extensions.st_x(c.centroid::extensions.geometry)::numeric, 5),
      'lat', round(extensions.st_y(c.centroid::extensions.geometry)::numeric, 5),
      'videoUrl', c.video_url, 'videoTitle', c.video_title,
      'videoSource', c.video_source,
      'episodes', (
        select coalesce(json_agg(json_build_object(
          'show', e.show, 'season', e.season, 'episode', e.episode,
          'title', e.title, 'airDate', e.air_date, 'match', ce.match_kind
        ) order by e.show, e.season, e.episode), '[]'::json)
        from city_episodes ce join episodes e on e.id = ce.episode_id
        where ce.city_id = c.id),
      'places', (
        select coalesce(json_agg(json_build_object(
          'slug', p.slug, 'name', p.name, 'status', p.status, 'kind', p.kind,
          'ate', (select a.what_he_ate from appearances a
                  where a.place_id = p.id and a.what_he_ate is not null limit 1),
          'note', (select a.note from appearances a
                   where a.place_id = p.id and a.note is not null limit 1),
          'shows', (select coalesce(json_agg(distinct a.show), '[]'::json)
                    from appearances a where a.place_id = p.id)
        ) order by (p.status = 'closed'), p.name), '[]'::json)
        from places p where p.city_id = c.id)
    ) order by c.slug), '[]'::json)
    from cities c
  )
);
"""


def main():
    os.makedirs(OUT, exist_ok=True)

    features = query(PLACES_SQL) or []
    geojson = {'type': 'FeatureCollection', 'features': features}
    with open(os.path.join(OUT, 'places.geojson'), 'w', encoding='utf-8') as f:
        json.dump(geojson, f, ensure_ascii=False, separators=(',', ':'))

    search = query(SEARCH_SQL) or {'places': [], 'cities': []}
    with open(os.path.join(OUT, 'search.json'), 'w', encoding='utf-8') as f:
        json.dump(search, f, ensure_ascii=False, separators=(',', ':'))

    # Build-time only. This never ships to the browser: the route components
    # read it during the static export and bake the result into HTML, so a
    # place page costs zero requests beyond the page itself.
    detail = query(DETAIL_SQL) or {'places': [], 'cities': []}
    with open(os.path.join(ROOT, 'data', 'detail.json'), 'w', encoding='utf-8') as f:
        json.dump(detail, f, ensure_ascii=False, separators=(',', ':'))
    print(f'detail.json     {len(detail["places"])} places, '
          f'{len(detail["cities"])} cities   (build-time only, not served)')

    kinds, statuses = {}, {}
    for feat in features:
        p = feat['properties']
        kinds[p['kind']] = kinds.get(p['kind'], 0) + 1
        statuses[p['status']] = statuses.get(p['status'], 0) + 1

    gsize = os.path.getsize(os.path.join(OUT, 'places.geojson')) / 1024
    ssize = os.path.getsize(OUT + '/search.json') / 1024
    print(f'places.geojson  {len(features):5d} features   {gsize:7.1f} KB')
    print(f'search.json     {len(search["places"]):5d} places, '
          f'{len(search["cities"])} cities   {ssize:7.1f} KB')
    print(f'  kind    {dict(sorted(kinds.items()))}')
    print(f'  status  {dict(sorted(statuses.items()))}')
    print(f'  unnamed {sum(1 for f in features if f["properties"]["unnamed"])}')


if __name__ == '__main__':
    main()
