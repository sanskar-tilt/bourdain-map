#!/usr/bin/env python3
"""Pull episode lists for all four shows from Wikipedia.

The KMLs contain no episode numbers, no titles and no air dates — season
survives only where a Google My Maps folder happened to encode it. This
fetches the missing half from Wikipedia and caches the raw wikitext, so
parsing can be re-run and corrected without hitting the network again.

Two table formats in play:
  - {{Episode list}} templates      Parts Unknown, No Reservations, The Layover
  - a plain wikitable               A Cook's Tour, which uniquely carries an
                                    explicit "Place Visited" column

    python3 scripts/fetch_episodes.py            # fetch (cached) then parse
    python3 scripts/fetch_episodes.py --reparse  # parse from cache, no network

Writes:
    data/wikitext-cache.json   raw wikitext per page
    data/episodes.json         season / episode / title / air_date / locations
"""

import json
import os
import re
import sys
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
CACHE = os.path.join(DATA, 'wikitext-cache.json')

USER_AGENT = 'bourdain-map/0.1 (sanskardugar2001@gmail.com)'
API = 'https://en.wikipedia.org/w/api.php'

PAGES = {
    'parts_unknown':   'Anthony Bourdain: Parts Unknown',
    'no_reservations': 'Anthony Bourdain: No Reservations',
    'a_cooks_tour':    "A Cook's Tour (TV series)",
    'the_layover':     'The Layover (TV series)',
}

SEASON_HEAD = re.compile(r'^==+\s*Season\s+(\d+).*?==+\s*$', re.M | re.I)


def fetch(page):
    url = API + '?' + urllib.parse.urlencode({
        'action': 'parse', 'page': page, 'prop': 'wikitext',
        'format': 'json', 'redirects': 1,
    })
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    with urllib.request.urlopen(req, timeout=45) as r:
        payload = json.loads(r.read().decode('utf-8'))
    if 'error' in payload:
        raise RuntimeError(f'{page}: {payload["error"].get("info")}')
    return payload['parse']['wikitext']['*']


def strip_markup(s):
    """Wikitext to plain text, keeping the visible half of piped links."""
    if not s:
        return ''
    s = re.sub(r'<ref[^>]*/>', '', s)
    s = re.sub(r'<ref[^>]*>.*?</ref>', '', s, flags=re.S)
    s = re.sub(r'\{\{\s*(?:ref|efn|sfn|refn)[^{}]*\}\}', '', s, flags=re.I)
    s = re.sub(r'\[\[(?:[^\]|]*\|)?([^\]|]+)\]\]', r'\1', s)
    s = re.sub(r"'''?", '', s)
    s = re.sub(r'<[^>]+>', '', s)
    s = re.sub(r'\{\{[^{}]*\}\}', '', s)
    return re.sub(r'\s+', ' ', s).strip()


def links_in(s):
    """Every [[wikilink]] target, de-piped and de-anchored. These are the
    location candidates -- far more reliable than parsing prose."""
    out = []
    for m in re.findall(r'\[\[([^\]]+)\]\]', s or ''):
        target = m.split('|')[0].split('#')[0].strip()
        # "Pailin Province|Pailin, Cambodia" -> keep the readable half too
        label = m.split('|')[-1].split('#')[0].strip()
        for cand in (target, label):
            cand = re.sub(r'\s*\(.*?\)\s*$', '', cand).strip()
            if cand and cand not in out:
                out.append(cand)
    return out


def parse_airdate(raw):
    """{{Start date|2013|4|14}} or a plain date string -> ISO, or None."""
    m = re.search(r'\{\{\s*(?:start date|date)\s*\|\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})',
                  raw or '', re.I)
    if m:
        return f'{int(m.group(1)):04d}-{int(m.group(2)):02d}-{int(m.group(3)):02d}'
    txt = strip_markup(raw)
    m = re.search(r'(\d{1,2})\s+(\w+)\s+(\d{4})', txt) or \
        re.search(r'(\w+)\s+(\d{1,2}),\s*(\d{4})', txt)
    if not m:
        return None
    months = {m_: i + 1 for i, m_ in enumerate(
        ['january', 'february', 'march', 'april', 'may', 'june', 'july',
         'august', 'september', 'october', 'november', 'december'])}
    a, b, c = m.groups()
    if a.isdigit():
        day, mon, year = int(a), months.get(b.lower()), int(c)
    else:
        day, mon, year = int(b), months.get(a.lower()), int(c)
    if not mon:
        return None
    return f'{year:04d}-{mon:02d}-{day:02d}'


def split_template_args(body):
    """Split a template body on top-level pipes, ignoring nested {{ }} [[ ]]."""
    args, depth_c, depth_b, cur = [], 0, 0, ''
    i = 0
    while i < len(body):
        two = body[i:i + 2]
        if two == '{{':
            depth_c += 1; cur += two; i += 2; continue
        if two == '}}':
            depth_c -= 1; cur += two; i += 2; continue
        if two == '[[':
            depth_b += 1; cur += two; i += 2; continue
        if two == ']]':
            depth_b -= 1; cur += two; i += 2; continue
        ch = body[i]
        if ch == '|' and depth_c == 0 and depth_b == 0:
            args.append(cur); cur = ''
        else:
            cur += ch
        i += 1
    args.append(cur)
    return args


def find_templates(text, name):
    """Yield the body of every {{name ...}} occurrence, brace-balanced."""
    pat = re.compile(r'\{\{\s*' + name + r'\s*\|', re.I)
    for m in pat.finditer(text):
        i = m.end()
        depth = 1
        start = i
        while i < len(text) and depth:
            if text[i:i + 2] == '{{':
                depth += 1; i += 2; continue
            if text[i:i + 2] == '}}':
                depth -= 1
                if depth == 0:
                    break
                i += 2; continue
            i += 1
        yield text[start:i]


def season_at(text, pos, fallback):
    """Which '== Season N ==' heading precedes this offset."""
    season = fallback
    for m in SEASON_HEAD.finditer(text):
        if m.start() > pos:
            break
        season = int(m.group(1))
    return season


def parse_episode_list(show, text):
    """{{Episode list}} format."""
    rows = []
    for m in re.finditer(r'\{\{\s*Episode list\s*\|', text, re.I):
        body = None
        for b in find_templates(text[m.start():m.start() + 6000], 'Episode list'):
            body = b
            break
        if body is None:
            continue
        fields = {}
        for arg in split_template_args(body):
            if '=' not in arg:
                continue
            k, v = arg.split('=', 1)
            fields[k.strip().lower()] = v.strip()
        title_raw = fields.get('title') or fields.get('rtitle') or ''
        rows.append({
            'show': show,
            'season': season_at(text, m.start(), None),
            'episode': _int(fields.get('episodenumber2') or fields.get('episodenumber')),
            'overall': _int(fields.get('episodenumber')),
            'title': strip_markup(title_raw),
            'air_date': parse_airdate(fields.get('originalairdate', '')),
            'locations': links_in(title_raw) or [strip_markup(title_raw)],
        })
    return rows


def parse_wikitable(show, text):
    """A Cook's Tour: a plain wikitable with an explicit Place Visited column."""
    rows = []
    for tm in re.finditer(r'\{\|\s*class="wikitable".*?\n\|\}', text, re.S):
        table = tm.group(0)
        season = season_at(text, tm.start(), None)
        headers = [strip_markup(h).lower()
                   for h in re.findall(r'^!\s*(.+?)\s*$', table, re.M)]
        try:
            i_title = next(i for i, h in enumerate(headers) if 'title' in h)
            i_place = next(i for i, h in enumerate(headers) if 'place' in h or 'location' in h)
            i_num = next(i for i, h in enumerate(headers) if h.strip() in ('#', 'no.', 'no'))
        except StopIteration:
            continue
        # Rows are separated by |- ; cells start with a leading pipe on a line.
        for chunk in re.split(r'\n\|-', table)[1:]:
            cells = re.findall(r'^\|\s*(.*?)\s*$', chunk, re.M)
            if len(cells) <= max(i_title, i_place, i_num):
                continue
            place_raw = cells[i_place]
            rows.append({
                'show': show,
                'season': season,
                'episode': _int(strip_markup(cells[i_num])),
                'overall': None,
                'title': strip_markup(cells[i_title]),
                'air_date': None,
                'locations': links_in(place_raw) or [strip_markup(place_raw)],
            })
    return rows


def renumber_within_season(rows):
    """Some pages only carry an overall episode number -- The Layover numbers
    its second season 11-20. Normalise `episode` to within-season and keep the
    overall figure separately, so S2E1 means the first episode of season 2 on
    every show."""
    by_season = {}
    for r in rows:
        by_season.setdefault(r['season'], []).append(r)
    for season, group in by_season.items():
        nums = [r['episode'] for r in group if r['episode'] is not None]
        if not nums or min(nums) == 1:
            continue
        group.sort(key=lambda r: (r['episode'] is None, r['episode']))
        for i, r in enumerate(group, 1):
            if r['overall'] is None:
                r['overall'] = r['episode']
            r['episode'] = i


def _int(v):
    try:
        return int(re.sub(r'\D', '', str(v)))
    except (TypeError, ValueError):
        return None


def main():
    reparse = '--reparse' in sys.argv
    cache = {}
    if os.path.exists(CACHE):
        with open(CACHE, encoding='utf-8') as f:
            cache = json.load(f)

    for show, page in PAGES.items():
        if show in cache and (reparse or cache.get(show)):
            continue
        print(f'fetching {page} ...')
        cache[show] = fetch(page)
    with open(CACHE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False)

    episodes = []
    for show, text in cache.items():
        rows = (parse_wikitable(show, text) if show == 'a_cooks_tour'
                else parse_episode_list(show, text))
        rows = [r for r in rows if r['title']]
        renumber_within_season(rows)
        episodes.extend(rows)
        seasons = sorted({r['season'] for r in rows if r['season']})
        dated = sum(1 for r in rows if r['air_date'])
        print(f'  {show:16s} {len(rows):4d} episodes  seasons {seasons}  '
              f'{dated} with an air date')

    with open(os.path.join(DATA, 'episodes.json'), 'w', encoding='utf-8') as f:
        json.dump(episodes, f, ensure_ascii=False, indent=1)
    print(f'\n{len(episodes)} episodes -> data/episodes.json')
    for r in episodes[:3] + episodes[-3:]:
        print(f'   {r["show"]:16s} S{r["season"]}E{r["episode"]}  {r["title"][:44]!r:46s} '
              f'{r["air_date"]}  {r["locations"][:3]}')


if __name__ == '__main__':
    main()
