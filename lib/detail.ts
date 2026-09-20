/**
 * Build-time data access. Server components only.
 *
 * data/detail.json is read during the static export and baked into HTML. It
 * is never served to the browser and never imported from a client component.
 */

import fs from "node:fs";
import path from "node:path";

export type Appearance = {
  show: string;
  season: number | null;
  episode: number | null;
  episodeTitle: string | null;
  airDate: string | null;
  /** How we know the episode. 'matched' is true by the show's format;
   *  'inferred' is city-level attribution that is usually right. */
  episodeSource: "matched" | "inferred" | null;
  ate: string | null;
  note: string | null;
  folder: string | null;
};

export type PlaceDetail = {
  id: string;
  slug: string;
  name: string;
  status: string;
  statusNote: string | null;
  kind: string;
  city: string | null;
  citySlug: string | null;
  cc: string | null;
  lon: number;
  lat: number;
  appearances: Appearance[];
};

export type CityEpisode = {
  show: string;
  season: number | null;
  episode: number | null;
  title: string;
  airDate: string | null;
  match: string;
  /** Official clip id when the source data has one. Never invented. */
  youtubeId?: string | null;
};

export type CityDetail = {
  id: string;
  slug: string;
  name: string;
  cc: string | null;
  lon: number;
  lat: number;
  videoUrl: string | null;
  videoTitle: string | null;
  videoSource: string | null;
  episodes: CityEpisode[];
  places: {
    slug: string | null;
    name: string;
    status: string;
    kind: string;
    ate: string | null;
    note: string | null;
    shows: string[];
  }[];
};

type Detail = { places: PlaceDetail[]; cities: CityDetail[] };

let cached: Detail | null = null;

function load(): Detail {
  if (cached) return cached;
  const p = path.join(process.cwd(), "data", "detail.json");
  if (!fs.existsSync(p)) {
    // A missing artifact must fail loudly at build, not render an empty site.
    throw new Error(
      "data/detail.json is missing. Run: node scripts/build_detail.mjs"
    );
  }
  cached = JSON.parse(fs.readFileSync(p, "utf-8")) as Detail;
  return cached;
}

export const allPlaces = () => load().places;
export const allCities = () => load().cities;
export const placeBySlug = (slug: string) =>
  load().places.find((p) => p.slug === slug) ?? null;
export const cityBySlug = (slug: string) =>
  load().cities.find((c) => c.slug === slug) ?? null;

export const SHOW_NAMES: Record<string, string> = {
  a_cooks_tour: "A Cook's Tour",
  no_reservations: "No Reservations",
  parts_unknown: "Parts Unknown",
  the_layover: "The Layover",
  book: "Book",
  other: "Other",
};
