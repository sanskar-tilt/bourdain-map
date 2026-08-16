#!/usr/bin/env python3
"""Derive cities from the geocode cache, then match episodes to them.

Runs offline from data/geocode-cache.json and data/episodes.json. Emits SQL
rather than writing to a database, so it works against local and hosted
alike and the whole join is reviewable as a diff.

Matching is three-tier and records which tier it used, because a city named
in an episode title is a much stronger claim than a city that happens to sit
in a country an episode was named after:

    exact    episode location == our city name          "Tokyo"
    region   episode location == the state/province     "Punjab"
    country  episode location == the country            "Madagascar"

Appearance backfill is deliberately timid. It only fires when a (city, show)
pair matches exactly one episode, and never overwrites a season the KML
folders already gave us. Everything else is logged.

    python3 scripts/build_cities.py

Writes:
    supabase/seed_cities.sql       cities, episodes, city_episodes, backfills
    notes/episode-matching.log     match rate, conflicts, what didn't match
"""

import json
import os
import re
import unicodedata
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')

CITY_KEYS = ['city', 'town', 'village', 'municipality', 'borough',
             'suburb', 'city_district', 'county', 'state_district', 'state']


def fold(s):
    """Accent- and case-insensitive key. 'Acarajé' -> 'acaraje'."""
    s = unicodedata.normalize('NFKD', s or '')
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r'\b(city|prefecture|province|governorate|municipality|'
               r'metropolitan|district|region|county|state of|the)\b', ' ', s)
    s = re.sub(r'[^a-z0-9]+', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def slugify(s):
    s = unicodedata.normalize('NFKD', s or '')
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = s.lower().replace('&', ' and ')
    s = re.sub(r"['’]", '', s)
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return re.sub(r'-+', '-', s).strip('-')


def sql(v):
    if v is None:
        return 'NULL'
    if isinstance(v, int):
        return str(v)
    if isinstance(v, list):
        if not v:
            return "'{}'"
        inner = ','.join('"' + str(x).replace('\\', '\\\\').replace('"', '\\"') + '"'
                         for x in v)
        return "'{" + inner.replace("'", "''") + "}'"
    return "'" + str(v).replace("'", "''") + "'"


def key_for(lon, lat):
    return f'{lat:.5f},{lon:.5f}'


def main():
    places = json.load(open(os.path.join(DATA, 'places.json'), encoding='utf-8'))
    cache = json.load(open(os.path.join(DATA, 'geocode-cache.json'), encoding='utf-8'))
    episodes = json.load(open(os.path.join(DATA, 'episodes.json'), encoding='utf-8'))

    log = []

    # ---- 1. derive cities from the geocoder's own address components -------
    cities = {}          # fold(name)+cc -> city dict
    place_city = {}      # place id -> city key
    no_city = []

    for p in places:
        entry = cache.get(key_for(p['lon'], p['lat']))
        addr = (entry or {}).get('address') or {}
        name = next((addr[k] for k in CITY_KEYS if addr.get(k)), None)
        cc = (addr.get('country_code') or '').upper() or None
        if not name:
            no_city.append(p['name'])
            continue
        ck = f'{fold(name)}|{cc or "??"}'
        c = cities.setdefault(ck, {
            'name': name, 'country_code': cc, 'lons': [], 'lats': [],
            'country': addr.get('country'), 'states': set(), 'places': [],
        })
        c['lons'].append(p['lon'])
        c['lats'].append(p['lat'])
        c['places'].append(p['id'])
        if addr.get('state'):
            c['states'].add(addr['state'])
        place_city[p['id']] = ck

    # stable slugs
    taken = defaultdict(int)
    for ck in sorted(cities):
        c = cities[ck]
        base = slugify(c['name'])
        cand = f'{base}-{(c["country_code"] or "xx").lower()}'
        taken[cand] += 1
        if taken[cand] > 1:
            cand = f'{cand}-{taken[cand]}'
        c['slug'] = cand
        c['centroid'] = (sum(c['lons']) / len(c['lons']), sum(c['lats']) / len(c['lats']))

    # ---- 2. match episodes to cities --------------------------------------
    by_city_name = defaultdict(list)
    by_country = defaultdict(list)
    by_state = defaultdict(list)
    for ck, c in cities.items():
        by_city_name[fold(c['name'])].append(ck)
        if c['country']:
            by_country[fold(c['country'])].append(ck)
        for st in c['states']:
            by_state[fold(st)].append(ck)

    links = {}           # (ck, epi_index) -> match_kind
    matched_eps = set()
    unmatched_eps = []

    for idx, ep in enumerate(episodes):
        hits = {}
        for loc in ep.get('locations') or []:
            f = fold(loc)
            if not f:
                continue
            for ck in by_city_name.get(f, []):
                hits.setdefault(ck, 'exact')
            for ck in by_state.get(f, []):
                hits.setdefault(ck, 'region')
            for ck in by_country.get(f, []):
                hits.setdefault(ck, 'country')
            # "Koreatown, Los Angeles" — try the trailing component too
            if ',' in loc:
                tail = fold(loc.split(',')[-1])
                for ck in by_city_name.get(tail, []):
                    hits.setdefault(ck, 'exact')
        if not hits:
            unmatched_eps.append(ep)
            continue
        matched_eps.add(idx)
        for ck, kind in hits.items():
            prev = links.get((ck, idx))
            order = {'exact': 0, 'region': 1, 'country': 2, 'manual': 3}
            if prev is None or order[kind] < order[prev]:
                links[(ck, idx)] = kind

    # ---- 3. appearance backfill, only where it is unambiguous -------------
    # (city, show) -> the episodes matched. One is backfillable; more is not.
    per_city_show = defaultdict(list)
    for (ck, idx), kind in links.items():
        per_city_show[(ck, episodes[idx]['show'])].append((idx, kind))

    backfills = []       # (place_ids, show, season, episode, title, air_date)
    ambiguous = []
    for (ck, show), eps in sorted(per_city_show.items()):
        if len(eps) > 1:
            ambiguous.append(
                f'AMBIGUOUS  {cities[ck]["name"]} / {show}: {len(eps)} episodes '
                f'({", ".join("S%sE%s %s" % (episodes[i]["season"], episodes[i]["episode"], episodes[i]["title"]) for i, _ in eps[:4])})')
            continue
        idx, kind = eps[0]
        ep = episodes[idx]
        if kind != 'exact':
            ambiguous.append(
                f'WEAK_ONLY  {cities[ck]["name"]} / {show}: only a {kind} match '
                f'(S{ep["season"]}E{ep["episode"]} {ep["title"]}) — not backfilled')
            continue
        backfills.append((cities[ck]['places'], show, ep))

    # ---- 4. emit -----------------------------------------------------------
    out = ['-- Generated by scripts/build_cities.py. Do not edit by hand.',
           '-- Cities derived from the Nominatim geocode cache.',
           '-- Episodes from Wikipedia; see scripts/fetch_episodes.py.',
           '',
           'truncate table public.city_episodes, public.episodes cascade;',
           'update public.places set city_id = null;',
           'delete from public.cities;',
           '']

    out.append('insert into public.cities (slug, name, country_code, centroid) values')
    rows = []
    for ck in sorted(cities):
        c = cities[ck]
        rows.append(f"  ({sql(c['slug'])}, {sql(c['name'])}, {sql(c['country_code'])}, "
                    f"extensions.st_point({c['centroid'][0]!r}, {c['centroid'][1]!r})::extensions.geography)")
    out.append(',\n'.join(rows) + ';\n')

    out.append('insert into public.episodes '
               '(show, season, episode, overall_episode, title, air_date, source_locations) values')
    rows = []
    for ep in episodes:
        rows.append(f"  ({sql(ep['show'])}::show_name, {sql(ep['season'])}, {sql(ep['episode'])}, "
                    f"{sql(ep['overall'])}, {sql(ep['title'])}, {sql(ep['air_date'])}, "
                    f"{sql(ep.get('locations') or [])})")
    out.append(',\n'.join(rows) + ';\n')

    # link places to their city
    for ck in sorted(cities):
        c = cities[ck]
        ids = ','.join(f"'{i}'::uuid" for i in c['places'])
        out.append(f"update public.places set city_id = (select id from public.cities "
                   f"where slug = {sql(c['slug'])}) where id in ({ids});")
    out.append('')

    # link cities to episodes
    rows = []
    for (ck, idx), kind in sorted(links.items(), key=lambda kv: (cities[kv[0][0]]['slug'], kv[0][1])):
        ep = episodes[idx]
        rows.append(
            f"  ((select id from public.cities where slug = {sql(cities[ck]['slug'])}), "
            f"(select id from public.episodes where show = {sql(ep['show'])}::show_name "
            f"and season = {sql(ep['season'])} and episode = {sql(ep['episode'])}), "
            f"{sql(kind)}::episode_match)")
    if rows:
        out.append('insert into public.city_episodes (city_id, episode_id, match_kind) values')
        out.append(',\n'.join(rows) + '\non conflict do nothing;\n')

    # backfill appearances -- never overwriting a season we already had
    n_backfill = 0
    for place_ids, show, ep in backfills:
        ids = ','.join(f"'{i}'::uuid" for i in place_ids)
        out.append(
            f"update public.appearances set season = {sql(ep['season'])}, "
            f"episode = {sql(ep['episode'])}, episode_title = {sql(ep['title'])}, "
            f"air_date = {sql(ep['air_date'])} "
            f"where show = {sql(show)}::show_name and place_id in ({ids}) "
            f"and (season is null or season = {sql(ep['season'])});")
        n_backfill += 1
    out.append('')

    with open(os.path.join(ROOT, 'supabase', 'seed_cities.sql'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(out))

    # ---- 5. report ---------------------------------------------------------
    kinds = defaultdict(int)
    for k in links.values():
        kinds[k] += 1
    log.append(f'cities derived            {len(cities)}')
    log.append(f'places with no city       {len(no_city)}')
    log.append(f'episodes                  {len(episodes)}')
    log.append(f'episodes matched to >=1 city  {len(matched_eps)} '
               f'({100 * len(matched_eps) / len(episodes):.0f}%)')
    log.append(f'city-episode links        {len(links)}  {dict(kinds)}')
    log.append(f'cities with any episode   {len({ck for ck, _ in links})}')
    log.append(f'appearance backfills      {n_backfill} (exact matches only)')
    log.append('')
    log.append('--- episodes that matched nothing ---')
    for ep in unmatched_eps:
        log.append(f'  {ep["show"]:16s} S{ep["season"]}E{ep["episode"]:<3} '
                   f'{ep["title"][:52]!r}  locations={ep.get("locations")}')
    log.append('')
    log.append('--- not backfilled (ambiguous or weak) ---')
    log.extend('  ' + a for a in sorted(ambiguous))
    log.append('')
    log.append('--- places the geocoder gave no city ---')
    log.extend('  ' + n for n in sorted(no_city))

    with open(os.path.join(ROOT, 'notes', 'episode-matching.log'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(log) + '\n')

    print('\n'.join(log[:8]))
    print(f'\n-> supabase/seed_cities.sql, notes/episode-matching.log')


if __name__ == '__main__':
    main()
