/**
 * Build data/detail.json from static artifacts when Postgres isn't around.
 * Place pages and city panels read this at export time.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "detail.json");

const fold = (s) =>
  String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const search = JSON.parse(
  fs.readFileSync(path.join(ROOT, "public", "data", "search.json"), "utf-8")
);
const episodes = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "episodes.json"), "utf-8")
);
const geo = JSON.parse(
  fs.readFileSync(path.join(ROOT, "public", "data", "places.geojson"), "utf-8")
);

let media = { quotes: {}, youtube: {}, aliases: {}, groups: [] };
try {
  media = JSON.parse(
    fs.readFileSync(path.join(ROOT, "content", "city-media.json"), "utf-8")
  );
} catch { /* optional */ }

const youtubeBySlug = { ...(media.youtube ?? {}) };
for (const g of media.groups ?? []) {
  for (const slug of g.slugs ?? []) {
    if (g.youtube) youtubeBySlug[slug] = g.youtube;
  }
}
const aliases = media.aliases ?? {};

const geoById = new Map();
for (const f of geo.features ?? []) {
  if (f.properties?.id) geoById.set(f.properties.id, f);
}

function derivedKeys(city) {
  const n = fold(city.name);
  const keys = new Set([n]);
  let t = n
    .replace(/^greater /, "")
    .replace(/^city of /, "")
    .replace(/ ward \d+$/, "")
    .replace(/ city municipality$/, "")
    .replace(/ district$/, "")
    .replace(/ capital$/, "")
    .replace(/ city$/, "")
    .trim();
  if (t) keys.add(t);
  if (t) keys.add(t.replace(/ /g, ""));
  if (city.region) keys.add(fold(city.region));
  const extra = aliases[city.slug];
  for (const k of extra?.exact ?? []) {
    const f = fold(k);
    if (f) keys.add(f);
  }
  return keys;
}

const CC_LOOSE = {
  FR: ["france"], GB: ["england", "scotland", "united kingdom"],
  IT: ["italy", "sicily"], ES: ["spain"], NL: ["netherlands"],
  DE: ["germany"], PT: ["portugal"], IE: ["ireland"], DK: ["denmark"],
  SE: ["sweden"], CZ: ["czech"], HU: ["hungary"], AT: ["austria"],
  IS: ["iceland"], UA: ["ukraine"], FI: ["finland"], JP: ["japan"],
  SG: ["singapore"], TH: ["thailand"], VN: ["vietnam"], KR: ["korea"],
  TW: ["taiwan"], IN: ["india"], LB: ["lebanon"], TR: ["turkey"],
  AE: ["dubai", "uae"], IR: ["iran"], MM: ["myanmar"], KH: ["cambodia"],
  PH: ["philippines"], ID: ["indonesia", "bali"], LA: ["laos"],
  LK: ["sri lanka"], MY: ["malaysia"], GE: ["georgia"], AM: ["armenia"],
  CN: ["china"], RU: ["russia"], EG: ["egypt"], NG: ["nigeria"],
  KE: ["kenya"], ZA: ["south africa"], SN: ["senegal"], MA: ["morocco"],
  GH: ["ghana"], MG: ["madagascar"], MZ: ["mozambique"], LR: ["liberia"],
  NA: ["namibia"], LY: ["libya"], CD: ["congo"], TZ: ["tanzania"],
  BR: ["brazil"], AR: ["argentina"], PE: ["peru"], CO: ["colombia"],
  CL: ["chile"], EC: ["ecuador"], UY: ["uruguay"], PY: ["paraguay"],
  MX: ["mexico"], CU: ["cuba"], NI: ["nicaragua"], DO: ["dominican"],
  AU: ["australia"],
};

function looseKeys(city) {
  const extra = aliases[city.slug];
  const keys = new Set((extra?.loose ?? []).map(fold).filter(Boolean));
  for (const k of CC_LOOSE[city.cc] ?? []) {
    const f = fold(k);
    if (f) keys.add(f);
  }
  return keys;
}

function locParts(loc) {
  return fold(loc)
    .split(/[/,()-]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function matchKind(city, ep) {
  const keys = derivedKeys(city);
  const loose = looseKeys(city);
  let hit = null;
  const title = fold(ep.title);
  const fields = [
    ...(ep.locations ?? []).map((loc) => ({ whole: fold(loc), parts: locParts(loc) })),
    { whole: title, parts: title.split(" ").filter(Boolean) },
  ];
  for (const { whole, parts } of fields) {
    for (const k of keys) {
      if (!k || k.length < 3) continue;
      if (whole === k || parts.includes(k)) return "exact";
      if (k.length >= 5 && (whole.includes(k) || parts.some((p) => p.includes(k)))) {
        return "exact";
      }
    }
    for (const k of loose) {
      if (!k || k.length < 3) continue;
      if (whole === k || parts.includes(k) || (k.length >= 5 && whole.includes(k))) {
        hit = "loose";
      }
    }
  }
  return hit;
}

const cityEpisodes = new Map();
for (const city of search.cities) {
  const list = [];
  for (const e of episodes) {
    const match = matchKind(city, e);
    if (!match) continue;
    list.push({
      show: e.show,
      season: e.season ?? null,
      episode: e.episode ?? null,
      title: e.title,
      airDate: e.air_date ?? null,
      match,
    });
  }
  cityEpisodes.set(city.slug, list);
}

const placesByCity = new Map();
for (const p of search.places) {
  if (!p.citySlug) continue;
  const arr = placesByCity.get(p.citySlug) ?? [];
  arr.push(p);
  placesByCity.set(p.citySlug, arr);
}

const places = search.places
  .filter((p) => p.slug)
  .map((p) => {
    const g = geoById.get(p.id);
    const visits = g?.properties?.visits ?? 1;
    const cityEps = p.citySlug ? cityEpisodes.get(p.citySlug) ?? [] : [];
    const exact = cityEps.filter((e) => e.match === "exact");
    const pool = exact.length ? exact : cityEps;
    const appearances = pool.slice(0, Math.max(1, visits)).map((e) => ({
      show: e.show,
      season: e.season,
      episode: e.episode,
      episodeTitle: e.title,
      airDate: e.airDate,
      episodeSource: e.match === "exact" ? "inferred" : "inferred",
      ate: null,
      note: null,
      folder: null,
    }));
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      status: p.status,
      statusNote: null,
      kind: p.kind,
      city: p.city,
      citySlug: p.citySlug,
      cc: p.cc,
      lon: p.lon,
      lat: p.lat,
      appearances: appearances.length
        ? appearances
        : [
            {
              show: "other",
              season: null,
              episode: null,
              episodeTitle: null,
              airDate: null,
              episodeSource: null,
              ate: null,
              note: null,
              folder: null,
            },
          ],
    };
  });

const cities = search.cities.map((c) => {
  const clip = youtubeBySlug[c.slug];
  const eps = cityEpisodes.get(c.slug) ?? [];
  const shows = [...new Set(eps.map((e) => e.show))];
  return {
    id: c.slug,
    slug: c.slug,
    name: c.name,
    cc: c.cc,
    lon: c.lon,
    lat: c.lat,
    videoUrl: clip?.id ? `https://www.youtube.com/watch?v=${clip.id}` : null,
    videoTitle: clip?.title ?? null,
    videoSource: clip?.id ? "Official clip" : null,
    episodes: eps,
    places: (placesByCity.get(c.slug) ?? []).map((p) => ({
      slug: p.slug,
      name: p.name,
      status: p.status,
      kind: p.kind,
      ate: null,
      note: null,
      shows,
    })),
  };
});

fs.writeFileSync(OUT, JSON.stringify({ places, cities }));
const withClip = cities.filter((c) => c.videoUrl).length;
console.log(
  `detail.json  ${places.length} places, ${cities.length} cities, ${withClip} clips`
);
