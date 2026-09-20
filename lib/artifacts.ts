/**
 * The read path. Static artifacts only — no database, ever.
 *
 * These files are produced by scripts/export_map_data.py from the build-time
 * Postgres and served from the CDN. They change when an importer runs, not
 * when a user clicks, so they are fetched once and held for the session.
 */

export type SearchPlace = {
  id: string;
  slug: string | null;
  name: string;
  city: string | null;
  citySlug: string | null;
  cc: string | null;
  status: string;
  kind: string;
  lon: number;
  lat: number;
};

export type SearchCity = {
  slug: string;
  name: string;
  cc: string | null;
  /** Metro/state alias — "Tokyo" for its wards. */
  region: string | null;
  places: number;
  lon: number;
  lat: number;
};

export type SearchIndex = { places: SearchPlace[]; cities: SearchCity[] };

let cache: Promise<SearchIndex> | null = null;

/** One request, memoised for the life of the page. */
export function loadSearchIndex(): Promise<SearchIndex> {
  if (!cache) {
    cache = fetch("/data/search.json")
      .then((r) => {
        if (!r.ok) throw new Error(`search.json ${r.status}`);
        return r.json() as Promise<SearchIndex>;
      })
      .catch((e) => {
        cache = null;
        throw e;
      });
  }
  return cache;
}

/** A country name for the handful of places that legitimately have no city —
 *  McMurdo Station, the South Pole, Mount Erebus. */
export function regionName(cc: string | null): string | null {
  if (!cc) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(cc) ?? cc;
  } catch {
    return cc;
  }
}

/** Accent- and case-insensitive fold, so "acaraje" finds "Acarajé da Dinha". */
export function fold(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** "hanoi" hits "Hà Nội". Pass already-folded strings. */
export function compact(s: string): string {
  return s.replace(/\s+/g, "");
}

export function foldedHits(foldedName: string, foldedQuery: string): boolean {
  if (!foldedQuery) return false;
  if (foldedName.includes(foldedQuery)) return true;
  const n = compact(foldedQuery);
  return n.length >= 3 && compact(foldedName).includes(n);
}

export function foldedRank(foldedName: string, foldedQuery: string): number {
  const n = compact(foldedQuery);
  const f = compact(foldedName);
  if (foldedName === foldedQuery || f === n) return 0;
  if (foldedName.startsWith(foldedQuery) || f.startsWith(n)) return 1;
  return 2;
}
