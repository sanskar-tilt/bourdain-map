/**
 * City-tied extras for the map panel.
 * Quotes and YouTube IDs only when sourced. Never invent.
 */
import fs from "node:fs";
import path from "node:path";

export type CityQuote = { text: string; attr: string };
export type CityClip = { id: string; title?: string };
export type CityAlias = { exact?: string[]; loose?: string[] };

type Group = {
  slugs?: string[];
  quote?: CityQuote;
  youtube?: CityClip;
};

type File = {
  quotes?: Record<string, CityQuote>;
  youtube?: Record<string, CityClip>;
  groups?: Group[];
  aliases?: Record<string, CityAlias>;
};

type Packed = {
  quotes: Record<string, CityQuote>;
  youtube: Record<string, CityClip>;
  aliases: Record<string, CityAlias>;
  siblings: Record<string, string[]>;
};

let cached: Packed | null = null;

function load(): Packed {
  if (cached) return cached;
  const files = ["city-media.json", "city-quotes.json"];
  const out: Packed = { quotes: {}, youtube: {}, aliases: {}, siblings: {} };
  for (const name of files) {
    try {
      const raw = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), "content", name), "utf-8")
      ) as File;
      Object.assign(out.quotes, raw.quotes ?? {});
      Object.assign(out.youtube, raw.youtube ?? {});
      Object.assign(out.aliases, raw.aliases ?? {});
      for (const g of raw.groups ?? []) {
        for (const slug of g.slugs ?? []) {
          if (g.quote) out.quotes[slug] = g.quote;
          if (g.youtube) out.youtube[slug] = g.youtube;
        }
      }
    } catch { /* optional */ }
  }
  const buckets = new Map<string, string[]>();
  for (const [slug, a] of Object.entries(out.aliases)) {
    for (const k of a.exact ?? []) {
      const key = k.toLowerCase();
      const arr = buckets.get(key) ?? [];
      arr.push(slug);
      buckets.set(key, arr);
    }
  }
  for (const arr of buckets.values()) {
    for (const s of arr) {
      const rest = arr.filter((x) => x !== s);
      out.siblings[s] = [...new Set([...(out.siblings[s] ?? []), ...rest])];
    }
  }
  cached = out;
  return out;
}

export function cityQuote(slug: string | null | undefined): CityQuote | null {
  if (!slug) return null;
  return load().quotes[slug] ?? null;
}

/** Sourced quote for this slug, or one already attached to an alias sibling. Never invent. */
export function cityQuoteBest(slug: string | null | undefined): CityQuote | null {
  if (!slug) return null;
  const pack = load();
  if (pack.quotes[slug]) return pack.quotes[slug];
  for (const other of pack.siblings[slug] ?? []) {
    if (pack.quotes[other]) return pack.quotes[other];
  }
  return null;
}

export function cityClip(slug: string | null | undefined): CityClip | null {
  if (!slug) return null;
  return load().youtube[slug] ?? null;
}

/** Sourced clip for this slug, or one already attached to an alias sibling. Never invent. */
export function cityClipBest(slug: string | null | undefined): CityClip | null {
  if (!slug) return null;
  const pack = load();
  if (pack.youtube[slug]) return pack.youtube[slug];
  for (const other of pack.siblings[slug] ?? []) {
    if (pack.youtube[other]) return pack.youtube[other];
  }
  return null;
}

const CLIP_STOP = new Set([
  "with", "from", "after", "that", "this", "into", "over", "under",
  "parts", "unknown", "official", "clip", "city", "talking", "dinner",
]);

function foldLite(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** True only when the clip title and episode title share a real word. Never guess. */
export function clipFitsEpisode(title: string, clip: CityClip | null): boolean {
  if (!clip?.id) return false;
  const et = foldLite(title);
  const ct = foldLite(clip.title ?? "");
  if (!et || !ct) return false;
  const words = (s: string) =>
    s.split(" ").filter((w) => w.length >= 4 && !CLIP_STOP.has(w));
  if (words(et).some((w) => ct.includes(w))) return true;
  if (words(ct).some((w) => et.includes(w))) return true;
  return false;
}

export function cityAlias(slug: string | null | undefined): CityAlias {
  if (!slug) return {};
  return load().aliases[slug] ?? {};
}

export function allCityMedia() {
  return load();
}
