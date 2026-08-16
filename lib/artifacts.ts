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
  status: string;
  kind: string;
  lon: number;
  lat: number;
};

export type SearchCity = {
  slug: string;
  name: string;
  cc: string | null;
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

/** Accent- and case-insensitive fold, so "acaraje" finds "Acarajé da Dinha". */
export function fold(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
