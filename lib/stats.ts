/**
 * SITE_STATS — every count on the site, derived from the dataset at build
 * time. Server components only.
 *
 * Nothing anywhere else may hardcode a place, city, episode or closed count.
 * The numbers move whenever the importer runs, and a stale figure on the
 * front door is exactly the kind of thing this project cannot afford.
 */

import fs from "node:fs";
import path from "node:path";

export type SiteStats = {
  places: number;
  cities: number;
  episodes: number;
  closed: number;
  appearances: number;
  broadcastFirst: string | null;
  broadcastLast: string | null;
  /** Shows with no air dates at all — the real range starts earlier. */
  undatedShows: string[];
};

const FALLBACK: SiteStats = {
  places: 0, cities: 0, episodes: 0, closed: 0, appearances: 0,
  broadcastFirst: null, broadcastLast: null, undatedShows: [],
};

let cached: SiteStats | null = null;

export function siteStats(): SiteStats {
  if (cached) return cached;
  const p = path.join(process.cwd(), "content", "stats.generated.json");
  if (!fs.existsSync(p)) {
    throw new Error(
      "content/stats.generated.json is missing. Run: python3 scripts/export_map_data.py"
    );
  }
  const loaded: SiteStats = { ...FALLBACK, ...JSON.parse(fs.readFileSync(p, "utf-8")) };
  cached = loaded;
  return loaded;
}

/** Formatted for display, in the site's one locale. */
export const n = (v: number) => v.toLocaleString("en-GB");

/**
 * The broadcast range we can actually prove.
 *
 * A Cook's Tour carries no air dates — its episode table has no date column —
 * so the earliest date in the data is No Reservations, not the earliest
 * broadcast. Rather than pick a start year, the line says what is true: the
 * dated range, and that one show sits outside it.
 */
export function broadcastLine(s: SiteStats): string | null {
  if (!s.broadcastFirst || !s.broadcastLast) return null;
  const from = s.broadcastFirst.slice(0, 4);
  const to = s.broadcastLast.slice(0, 4);
  return s.undatedShows.length
    ? `${from}–${to}, and A Cook's Tour before that`
    : `${from}–${to}`;
}
