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


# Characters NFKD does not decompose, so they survive into slugs as gaps:
# Garðabær became "gar-ab-r". Handled before the accent strip.
XLIT = str.maketrans({
    'ð': 'd', 'Ð': 'd', 'þ': 'th', 'Þ': 'th', 'æ': 'ae', 'Æ': 'ae',
    'ø': 'o', 'Ø': 'o', 'œ': 'oe', 'Œ': 'oe', 'ł': 'l', 'Ł': 'l',
    'đ': 'd', 'Đ': 'd', 'ı': 'i', 'İ': 'i', 'ß': 'ss', 'ħ': 'h',
    'ŋ': 'n', 'ə': 'e', 'Ə': 'e', 'ʻ': '', 'ʼ': '', '‘': '', '’': '',
})


def slugify(s):
    s = (s or '').translate(XLIT)
    s = unicodedata.normalize('NFKD', s)
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
            # Kept only as a slug fallback for names in non-Latin scripts.
            # The displayed name always stays the local one.
            'county': addr.get('county'), 'state': addr.get('state'),
            'display': (entry or {}).get('display_name') or '',
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
        if not base:
            # A name written in a non-Latin script slugifies to nothing, which
            # would give five cities the URL "/city/-cn". Fall back through the
            # Latin administrative names Nominatim returns alongside it —
            # ບ້ານຄອຍ becomes luang-prabang-district, not a hash. The city is
            # still displayed under its own name.
            for alt in (c.get('county'), c.get('state')):
                base = slugify(alt or '')
                if base:
                    break
        if not base:
            # Last resort: the first Latin run in the full display name.
            for part in (c.get('display') or '').split(','):
                base = slugify(part)
                if base:
                    break
        if not base:
            base = 'place'
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

    # Every country and state name our own data knows about. An episode's
    # wikilinks are matched against these to find what it corroborates.
    known_countries = {fold(c['country']) for c in cities.values() if c['country']}
    known_states = set(by_state)
    country_by_fold = defaultdict(set)
    for c in cities.values():
        if c['country']:
            country_by_fold[fold(c['country'])].add(fold(c['country']))

    links = {}           # (ck, epi_index) -> match_kind
    matched_eps = set()
    unmatched_eps = []
    rejected = []        # name matched but the country actively disagreed

    ORDER = {'exact': 0, 'name_only': 1, 'region': 2, 'country': 3, 'manual': 4}

    for idx, ep in enumerate(episodes):
        # Every location token the episode offers, including the halves of
        # "Koreatown, Los Angeles" and "Pailin, Cambodia".
        tokens = set()
        for loc in ep.get('locations') or []:
            if not loc:
                continue
            tokens.add(fold(loc))
            for part in loc.split(','):
                tokens.add(fold(part))
        tokens.discard('')

        # What does this episode say about where it is? A bare "Naples" says
        # nothing; "Naples" alongside [[Italy]] says a great deal.
        ep_countries = tokens & known_countries
        ep_states = tokens & known_states

        hits = {}
        for tok in tokens:
            for ck in by_city_name.get(tok, []):
                c = cities[ck]
                cfold = fold(c['country']) if c['country'] else None
                if ep_countries:
                    if cfold in ep_countries:
                        hits[ck] = min(hits.get(ck, 'exact'), 'exact', key=ORDER.get)
                    else:
                        # Naples the episode vs Naples, Florida. Actively wrong.
                        rejected.append(
                            f'REJECTED   {c["name"]}, {c["country"]} '
                            f'!= {ep["show"]} S{ep["season"]}E{ep["episode"]} '
                            f'{ep["title"]!r} (episode country: {sorted(ep_countries)})')
                        continue
                elif ep_states and c['states'] and {fold(s) for s in c['states']} & ep_states:
                    hits[ck] = min(hits.get(ck, 'exact'), 'exact', key=ORDER.get)
                elif len(by_city_name.get(tok, [])) == 1:
                    # The episode names a bare city and we hold exactly one
                    # city by that name. "Amsterdam" can only mean Amsterdam.
                    # The Naples-versus-Naples-Florida risk only exists when
                    # our own data holds two, which is the branch below.
                    hits[ck] = min(hits.get(ck, 'exact'), 'exact', key=ORDER.get)
                else:
                    # Several of our cities share this name and nothing in the
                    # episode says which. Real match, genuinely unproven.
                    hits[ck] = min(hits.get(ck, 'name_only'), 'name_only', key=ORDER.get)
            for ck in by_state.get(tok, []):
                hits.setdefault(ck, 'region')
            for ck in by_country.get(tok, []):
                hits.setdefault(ck, 'country')

        if not hits:
            unmatched_eps.append(ep)
            continue
        matched_eps.add(idx)
        for ck, kind in hits.items():
            prev = links.get((ck, idx))
            if prev is None or ORDER[kind] < ORDER[prev]:
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

        # One matched episode is not the same as one existing episode. No
        # Reservations has both "New York City" and "New York Outer Boroughs";
        # only the first folds to our city name, so without this every New
        # York place would be stamped with S3E8, outer-borough ones included.
        # Look for any other episode of the same show that *mentions* the city
        # at all, and if one exists, refuse to pick.
        # Word-boundary, not substring: otherwise the city of Man matches
        # "Manila" and "Oman", and Mexico City matches "New Mexico".
        needle = fold(cities[ck]['name'])
        rx = re.compile(r'\b' + re.escape(needle) + r'\b') if needle else None
        mentions = [
            i for i, e2 in enumerate(episodes)
            if e2['show'] == show and rx and (
                rx.search(fold(e2['title']))
                or any(rx.search(fold(l or '')) for l in (e2.get('locations') or []))
            )
        ]
        if len(mentions) > 1:
            ambiguous.append(
                f'CITY_IN_MANY  {cities[ck]["name"]} / {show}: {len(mentions)} episodes '
                f'mention it ({", ".join("S%sE%s %s" % (episodes[i]["season"], episodes[i]["episode"], episodes[i]["title"]) for i in mentions[:4])}) '
                f'— only one matched by name, so nothing is backfilled')
            continue

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
    multi_candidate = sum(1 for (ck, show), eps in per_city_show.items() if len(eps) > 1)
    exact_cities = {ck for (ck, _), k in links.items() if k == 'exact'}
    log.append(f'cities derived            {len(cities)}')
    log.append(f'places with no city       {len(no_city)}')
    log.append(f'episodes                  {len(episodes)}')
    log.append(f'episodes matched to >=1 city  {len(matched_eps)} '
               f'({100 * len(matched_eps) / len(episodes):.0f}%)')
    log.append(f'city-episode links        {len(links)}  {dict(kinds)}')
    log.append(f'cities with any episode   {len({ck for ck, _ in links})}')
    log.append(f'  of those, with an EXACT link  {len(exact_cities)}')
    log.append(f'(city, show) pairs with >1 candidate  {multi_candidate}  (stored, never picked)')
    log.append(f'name matched but country disagreed    {len(rejected)}  (dropped)')
    log.append(f'appearance backfills      {n_backfill} (exact only, season never overwritten)')
    log.append('')
    log.append('--- least confident: name matched, nothing corroborated the country ---')
    weak = [(ck, idx) for (ck, idx), k in links.items() if k == 'name_only']
    for ck, idx in sorted(weak, key=lambda t: cities[t[0]]['name'])[:25]:
        ep = episodes[idx]
        log.append(f'  {cities[ck]["name"]}, {cities[ck]["country"]} <- '
                   f'{ep["show"]} S{ep["season"]}E{ep["episode"]} {ep["title"]!r}')
    if len(weak) > 25:
        log.append(f'  ... and {len(weak) - 25} more')
    log.append('')
    log.append('--- rejected on country disagreement ---')
    log.extend('  ' + r for r in sorted(set(rejected))[:40])
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
