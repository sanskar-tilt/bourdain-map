#!/usr/bin/env python3
"""Turn deannd's five KML exports into supabase/seed.sql.

Runs entirely offline from the files in data/. No network, no dependencies
beyond the standard library. Output is a deterministic SQL seed that
`supabase db reset` applies automatically, so the whole import is
reproducible and reviewable as a diff.

City and country are not in the source data at all, so they are left NULL
here and backfilled by scripts/geocode.py. Slug depends on city, so it waits
for the same pass.

    python3 scripts/import_kml.py

Writes:
    supabase/seed.sql          places + appearances
    data/places.json           manifest for the geocoding pass
    notes/import-skips.log     everything dropped or needing a human
"""

import json
import math
import os
import re
import sys
import unicodedata
import uuid
import xml.etree.ElementTree as ET
from collections import defaultdict

NS = {'k': 'http://www.opengis.net/kml/2.2'}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')

# Stable namespace so re-running the importer produces the same place ids and
# the geocoding pass can address rows it has already seen.
NAMESPACE = uuid.UUID('6f9619ff-8b86-d011-b42d-00c04fc964ff')

# One KML per show. Parts Unknown is split across two files by season range.
SHOW_BY_FILE = {
    'cooks_tour.kml':          'a_cooks_tour',
    'no_reservations.kml':     'no_reservations',
    'parts_unknown_s1_6.kml':  'parts_unknown',
    'parts_unknown_s7_12.kml': 'parts_unknown',
    'the_layover.kml':         'the_layover',
}

# Only No Reservations groups by venue type. The other four group by season or
# DVD disc, which says nothing about what kind of place it is.
KIND_BY_FOLDER = {
    'Restaurants and Bars': 'food',
    'Food markets':         'market',
    'Sightseeing':          'sight',
    'Other Activities':     'activity',
    'Lodging':              'lodging',
}
KIND_RANK = ['food', 'market', 'sight', 'activity', 'lodging', 'unknown']

SEASON_RE = re.compile(r'^Season\s+(\d+)$', re.I)

# Status lives in the name as a suffix. 57 pins carry it and it is reliable.
STATUS_SUFFIX = [
    (re.compile(r'\s*\(closed\)\s*$',  re.I), 'closed',  None),
    (re.compile(r'\s*\(closed\?\)\s*$', re.I), 'unknown', 'source marks this closed, unconfirmed'),
    (re.compile(r'\s*\(moved\)\s*$',   re.I), 'moved',   'source marks this moved'),
]

# "closed" in a description usually refers to a DIFFERENT restaurant that this
# pin replaced -- "Tony visited Mitchell's BBQ which is now closed. This is the
# newer spot." Acting on it would grey out somewhere that is serving today, so
# these go to a human instead.
DESC_CLOSED_RE = re.compile(
    r'\b(closed|shut|no longer|defunct|out of business|torn down|demolished|'
    r'burned down|used to be|was here before)\b', re.I)

# Names that describe an occasion rather than a venue. 41 pins are called
# "Meal with locals", scattered across four continents. Merging on name would
# collapse Manila into Montreal, so these never merge with anything.
GENERIC_NAME_RE = re.compile(
    r'^(meals?\s+with\s+(a\s+)?locals?|lunch|dinner|breakfast|street\s+food|'
    r'food\s+stall|market|unnamed|unknown|home\s+cook(ing)?)$', re.I)

# A description is treated as a dish if it is short and does not narrate. The
# split is sharp in practice: The Layover's median description is 27
# characters ("Steak frites"), Parts Unknown's is 157 and 90% say "Tony".
DISH_MAX_CHARS = 60
NARRATIVE_RE = re.compile(r'\bTony\b|\bhe\b|\bthey\b', re.I)

MERGE_EXACT_M = 25    # same name this close is the same place
MERGE_NEAR_M = 250    # same name this close is a regeocode of one place
                      # beyond it, same name means branches --
                      # Joe's Kansas City Bar-B-Que appears twice, 14km apart


def clean(s):
    """Normalise whitespace. The source is littered with non-breaking spaces."""
    if not s:
        return None
    s = s.replace('\xa0', ' ').replace('​', '')
    s = re.sub(r'\s+', ' ', s).strip()
    return s or None


def fold(name):
    """Aggressive fold for matching only. Never stored."""
    s = unicodedata.normalize('NFKD', name or '')
    s = ''.join(c for c in s if not unicodedata.combining(c))
    for rx, _, _ in STATUS_SUFFIX:
        s = rx.sub('', s)
    s = s.lower().replace('&', ' and ')
    s = re.sub(r"[^a-z0-9]+", ' ', s)
    s = re.sub(r'\b(the|a|an|restaurant|cafe|bar|de|la|le|el)\b', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def haversine(lon1, lat1, lon2, lat2):
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    h = (math.sin((p2 - p1) / 2) ** 2
         + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2)
    return 2 * r * math.asin(math.sqrt(h))


def sql(v):
    """Quote a value for SQL. None becomes NULL."""
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


def parse_files(skips):
    """Read every placemark out of every KML. One row per placemark."""
    rows = []
    for filename in sorted(SHOW_BY_FILE):
        path = os.path.join(DATA, filename)
        if not os.path.exists(path):
            sys.exit(f'missing source file: {path}')
        root = ET.parse(path).getroot()
        show = SHOW_BY_FILE[filename]

        for folder in root.findall('.//k:Folder', NS):
            fname = clean(folder.findtext('k:name', namespaces=NS)) or ''
            season_m = SEASON_RE.match(fname)
            season = int(season_m.group(1)) if season_m else None

            for pm in folder.findall('./k:Placemark', NS):
                raw_name = clean(pm.findtext('k:name', namespaces=NS))
                desc = clean(pm.findtext('k:description', namespaces=NS))
                coords = pm.findtext('.//k:coordinates', namespaces=NS)

                if not raw_name:
                    skips.append(f'NO_NAME       {filename} / {fname} :: coords={coords!r}')
                    continue
                if not coords or not coords.strip():
                    skips.append(f'NO_COORDS     {filename} / {fname} :: {raw_name!r}')
                    continue
                parts = coords.strip().split(',')
                try:
                    lon, lat = float(parts[0]), float(parts[1])
                except (ValueError, IndexError):
                    skips.append(f'BAD_COORDS    {filename} / {fname} :: {raw_name!r} :: {coords!r}')
                    continue
                if not (-180 <= lon <= 180 and -90 <= lat <= 90):
                    skips.append(f'COORDS_RANGE  {filename} / {fname} :: {raw_name!r} :: {lon},{lat}')
                    continue
                if lon == 0 and lat == 0:
                    skips.append(f'NULL_ISLAND   {filename} / {fname} :: {raw_name!r}')
                    continue

                # Status from the name suffix, then strip it off the name.
                name, status, status_note = raw_name, 'unknown', None
                for rx, st, note in STATUS_SUFFIX:
                    if rx.search(name):
                        name = rx.sub('', name).strip()
                        status, status_note = st, note
                        break

                # Flag description-only closure claims for review, don't act.
                if status == 'unknown' and desc and DESC_CLOSED_RE.search(desc):
                    skips.append(
                        f'REVIEW_CLOSED {filename} / {fname} :: {name!r} :: {desc[:140]!r}')

                # Dish or narrative -- exactly one of the two fields.
                what, note = None, None
                if desc:
                    if len(desc) <= DISH_MAX_CHARS and not NARRATIVE_RE.search(desc):
                        what = desc
                    else:
                        note = desc

                rows.append({
                    'file': filename, 'show': show, 'folder': fname,
                    'season': season, 'name': name, 'lon': lon, 'lat': lat,
                    'status': status, 'status_note': status_note,
                    'kind': KIND_BY_FOLDER.get(fname, 'unknown'),
                    'what_he_ate': what, 'note': note,
                    'fold': fold(name),
                    'generic': bool(GENERIC_NAME_RE.match(name.strip())),
                })
    return rows


def cluster(rows, skips):
    """Union-find over name+proximity. Generic names never merge."""
    parent = list(range(len(rows)))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[max(ra, rb)] = min(ra, rb)

    # Bucket by ~100m cell and compare against the 8 neighbours, so this stays
    # linear instead of comparing all 2,135 rows against each other.
    cells = defaultdict(list)
    for i, r in enumerate(rows):
        cells[(round(r['lat'], 3), round(r['lon'], 3))].append(i)

    merged = 0
    for (clat, clon), idxs in list(cells.items()):
        near = []
        for dla in (-1, 0, 1):
            for dlo in (-1, 0, 1):
                near.extend(cells.get((round(clat + dla * 0.001, 3),
                                       round(clon + dlo * 0.001, 3)), []))
        for i in idxs:
            for j in near:
                if j <= i:
                    continue
                a, b = rows[i], rows[j]
                if a['generic'] or b['generic']:
                    continue
                if not a['fold'] or a['fold'] != b['fold']:
                    continue
                d = haversine(a['lon'], a['lat'], b['lon'], b['lat'])
                if d <= MERGE_NEAR_M:
                    if find(i) != find(j):
                        merged += 1
                        if MERGE_EXACT_M < d <= MERGE_NEAR_M:
                            skips.append(
                                f'MERGED_NEAR   {d:6.0f}m  {a["name"]!r} '
                                f'[{a["file"]}] + [{b["file"]}]')
                    union(i, j)

    groups = defaultdict(list)
    for i in range(len(rows)):
        groups[find(i)].append(i)
    return groups, merged


def build(rows, groups):
    """Collapse each cluster into one place; every row stays an appearance."""
    places, appearances = [], []
    for _, members in sorted(groups.items()):
        # Deterministic representative so ids are stable across runs.
        members = sorted(members, key=lambda i: (rows[i]['file'], rows[i]['folder'],
                                                 rows[i]['name'], rows[i]['lon'], rows[i]['lat']))
        rep = rows[members[0]]

        # Most food-forward kind wins; any known category beats unknown.
        kind = min((rows[i]['kind'] for i in members), key=KIND_RANK.index)

        # A confirmed closure anywhere in the cluster wins -- if one show
        # recorded it shut, it shut.
        status, status_note = rep['status'], rep['status_note']
        for i in members:
            if rows[i]['status'] == 'closed':
                status, status_note = 'closed', rows[i]['status_note']
                break

        pid = str(uuid.uuid5(NAMESPACE, f'{rep["fold"]}|{rep["lon"]:.5f}|{rep["lat"]:.5f}'))
        places.append({
            'id': pid, 'name': rep['name'], 'lon': rep['lon'], 'lat': rep['lat'],
            'status': status, 'status_note': status_note, 'kind': kind,
        })
        for i in members:
            r = rows[i]
            appearances.append({
                'place_id': pid, 'show': r['show'], 'season': r['season'],
                'what_he_ate': r['what_he_ate'], 'note': r['note'],
                'source_folder': r['folder'],
            })
    places.sort(key=lambda p: (p['name'], p['id']))
    appearances.sort(key=lambda a: (a['place_id'], a['show'], a['season'] or 0))
    return places, appearances


def write_seed(places, appearances, path):
    out = ["-- Generated by scripts/import_kml.py. Do not edit by hand.",
           "-- Source: deannd's KML compilation (r/AnthonyBourdain), used with permission.",
           "-- city, country_code and slug are filled by scripts/geocode.py.",
           "",
           "truncate table public.appearances, public.places restart identity cascade;",
           ""]

    out.append('insert into public.places (id, name, geog, status, status_note, kind, source) values')
    chunk = []
    for p in places:
        chunk.append(
            f"  ({sql(p['id'])}::uuid, {sql(p['name'])}, "
            f"extensions.st_point({p['lon']!r}, {p['lat']!r})::extensions.geography, "
            f"{sql(p['status'])}::place_status, {sql(p['status_note'])}, "
            f"{sql(p['kind'])}::place_kind, 'deannd')")
    out.append(',\n'.join(chunk) + ';')
    out.append('')

    out.append('insert into public.appearances '
               '(place_id, show, season, what_he_ate, note, source_folder) values')
    chunk = []
    for a in appearances:
        chunk.append(
            f"  ({sql(a['place_id'])}::uuid, {sql(a['show'])}::show_name, "
            f"{sql(a['season'])}, {sql(a['what_he_ate'])}, {sql(a['note'])}, "
            f"{sql(a['source_folder'])})")
    out.append(',\n'.join(chunk) + ';')
    out.append('')

    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out))


def main():
    skips = []
    rows = parse_files(skips)
    groups, merged = cluster(rows, skips)
    places, appearances = build(rows, groups)

    os.makedirs(os.path.join(ROOT, 'notes'), exist_ok=True)
    write_seed(places, appearances, os.path.join(ROOT, 'supabase', 'seed.sql'))

    # Manifest for the geocoding pass: id and coordinates, nothing else.
    with open(os.path.join(DATA, 'places.json'), 'w', encoding='utf-8') as f:
        json.dump([{'id': p['id'], 'name': p['name'], 'lon': p['lon'], 'lat': p['lat']}
                   for p in places], f, ensure_ascii=False, indent=1)

    with open(os.path.join(ROOT, 'notes', 'import-skips.log'), 'w', encoding='utf-8') as f:
        f.write(f'{len(skips)} entries. REVIEW_ lines need a human; the rest were dropped.\n\n')
        f.write('\n'.join(sorted(skips)) + '\n')

    by_kind = defaultdict(int)
    for p in places:
        by_kind[p['kind']] += 1
    by_show = defaultdict(int)
    seasoned = 0
    for a in appearances:
        by_show[a['show']] += 1
        if a['season'] is not None:
            seasoned += 1
    multi = sum(1 for g in groups.values() if len(g) > 1)

    print(f'placemarks read     {len(rows)}')
    print(f'places written      {len(places)}   ({merged} merges, {multi} with >1 appearance)')
    print(f'appearances written {len(appearances)}   ({seasoned} with a season)')
    print(f'  by kind   {dict(sorted(by_kind.items()))}')
    print(f'  by show   {dict(sorted(by_show.items()))}')
    print(f'  closed    {sum(1 for p in places if p["status"] == "closed")}')
    print(f'skips/flags         {len(skips)}  -> notes/import-skips.log')
    print(f'seed                supabase/seed.sql')


if __name__ == '__main__':
    main()
