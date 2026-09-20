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
};

let cached: Packed | null = null;

function load(): Packed {
  if (cached) return cached;
  const files = ["city-media.json", "city-quotes.json"];
  const out: Packed = { quotes: {}, youtube: {}, aliases: {} };
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
  cached = out;
  return out;
}

export function cityQuote(slug: string | null | undefined): CityQuote | null {
  if (!slug) return null;
  return load().quotes[slug] ?? null;
}

export function cityClip(slug: string | null | undefined): CityClip | null {
  if (!slug) return null;
  return load().youtube[slug] ?? null;
}

export function cityAlias(slug: string | null | undefined): CityAlias {
  if (!slug) return {};
  return load().aliases[slug] ?? {};
}

export function allCityMedia() {
  return load();
}
