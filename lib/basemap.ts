/**
 * Basemap. Visitors never see an "API key required" canvas.
 *
 * Order:
 *   1. Self-hosted PMTiles or a real Protomaps key, if one is actually set.
 *   2. OpenFreeMap dark — free vector, no key, cinematic.
 *   3. CARTO Dark Matter raster — no key, always works.
 *
 * MapTiler is optional (`NEXT_PUBLIC_MAPTILER_KEY`) and never used as a
 * fallback without a key — that's the watermark the last preview showed.
 */

import type { StyleSpecification } from "maplibre-gl";

const MAP_TOKENS = {
  land: "#14161A",
  water: "#0B0D10",
  line: "#2A2E34",
  lineStrong: "#3A4048",
  road: "#1E2228",
  label: "#8A9098",
  labelBright: "#C4C8CE",
  halo: "#0B0D10",
} as const;

const PMTILES_URL = (process.env.NEXT_PUBLIC_PMTILES_URL ?? "").trim();
const PROTOMAPS_KEY = (process.env.NEXT_PUBLIC_PROTOMAPS_KEY ?? "").trim();
const MAPTILER_KEY = (process.env.NEXT_PUBLIC_MAPTILER_KEY ?? "").trim();

const GLYPHS = "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf";
const FONT = ["Noto Sans Regular"];
const FONT_MED = ["Noto Sans Medium"];

function usableKey(k: string): boolean {
  return k.length >= 12 && !/^(your|xxx|changeme|todo|replace|placeholder)/i.test(k);
}

function tileSource(): StyleSpecification["sources"] {
  if (PMTILES_URL) {
    return {
      protomaps: {
        type: "vector",
        url: `pmtiles://${PMTILES_URL}`,
        attribution:
          '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>',
      },
    };
  }
  if (usableKey(PROTOMAPS_KEY)) {
    return {
      protomaps: {
        type: "vector",
        tiles: [`https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt?key=${PROTOMAPS_KEY}`],
        maxzoom: 15,
        attribution:
          '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>',
      },
    };
  }
  return {};
}

/** True when we have our own vector tiles (not a missing/placeholder key). */
export const hasBasemap = Boolean(PMTILES_URL || usableKey(PROTOMAPS_KEY));

/** Free public dark style. No key. CORS open. */
export const OPENFREEMAP_DARK = "https://tiles.openfreemap.org/styles/dark";

/** Optional MapTiler dark — only when a real key is present. */
export function maptilerDarkUrl(): string | null {
  if (!usableKey(MAPTILER_KEY)) return null;
  return `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`;
}

/** CARTO Dark Matter — no key, raster, never watermarks. */
export function rasterDark(): StyleSpecification {
  return {
    version: 8,
    glyphs: GLYPHS,
    sources: {
      carto: {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
          "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
          "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        ],
        tileSize: 256,
        maxzoom: 20,
        attribution:
          '© <a href="https://www.openstreetmap.org">OpenStreetMap</a> © <a href="https://carto.com">CARTO</a>',
      },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "#0B0D10" },
      },
      {
        id: "carto",
        type: "raster",
        source: "carto",
        paint: {
          "raster-saturation": -0.12,
          "raster-contrast": 0.1,
          "raster-brightness-min": 0,
          "raster-brightness-max": 0.86,
        },
      },
    ],
  };
}

export function initialMapStyle(): string | StyleSpecification {
  if (hasBasemap) return buildBasemapStyle();
  return maptilerDarkUrl() ?? OPENFREEMAP_DARK;
}

export function buildBasemapStyle(): StyleSpecification {
  if (!hasBasemap) return rasterDark();

  const sources = tileSource();
  const layers: StyleSpecification["layers"] = [
    {
      id: "background",
      type: "background",
      paint: { "background-color": MAP_TOKENS.water },
    },
  ];

  layers.push(
    {
      id: "earth",
      type: "fill",
      source: "protomaps",
      "source-layer": "earth",
      paint: { "fill-color": MAP_TOKENS.land },
    },
    {
      id: "water",
      type: "fill",
      source: "protomaps",
      "source-layer": "water",
      paint: { "fill-color": MAP_TOKENS.water },
    },
    {
      id: "coastline",
      type: "line",
      source: "protomaps",
      "source-layer": "water",
      paint: {
        "line-color": MAP_TOKENS.line,
        "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.4, 8, 0.8, 14, 1.2],
      },
    },
    {
      id: "boundary-country",
      type: "line",
      source: "protomaps",
      "source-layer": "boundaries",
      filter: ["<=", ["get", "kind_detail"], 2],
      paint: {
        "line-color": MAP_TOKENS.lineStrong,
        "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.4, 6, 0.7, 12, 1],
        "line-dasharray": [3, 2],
      },
    },
    {
      id: "roads-minor",
      type: "line",
      source: "protomaps",
      "source-layer": "roads",
      minzoom: 12,
      filter: ["!=", ["get", "kind"], "highway"],
      paint: {
        "line-color": MAP_TOKENS.road,
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.3, 16, 1.4],
      },
    },
    {
      id: "roads-major",
      type: "line",
      source: "protomaps",
      "source-layer": "roads",
      minzoom: 8,
      filter: ["==", ["get", "kind"], "highway"],
      paint: {
        "line-color": MAP_TOKENS.road,
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.4, 16, 2.2],
      },
    },
    {
      id: "label-country",
      type: "symbol",
      source: "protomaps",
      "source-layer": "places",
      filter: ["==", ["get", "kind"], "country"],
      maxzoom: 7,
      layout: {
        "text-field": ["get", "name"],
        "text-font": FONT_MED,
        "text-size": ["interpolate", ["linear"], ["zoom"], 2, 9, 6, 12],
        "text-letter-spacing": 0.18,
        "text-transform": "uppercase",
        "text-max-width": 7,
        "text-padding": 24,
      },
      paint: {
        "text-color": MAP_TOKENS.label,
        "text-halo-color": MAP_TOKENS.halo,
        "text-halo-width": 1.1,
      },
    },
    {
      id: "label-city",
      type: "symbol",
      source: "protomaps",
      "source-layer": "places",
      filter: ["in", ["get", "kind"], ["literal", ["locality", "city"]]],
      minzoom: 4,
      layout: {
        "text-field": ["get", "name"],
        "text-font": FONT,
        "text-size": ["interpolate", ["linear"], ["zoom"], 4, 9.5, 10, 12, 14, 13],
        "text-letter-spacing": 0.06,
        "text-max-width": 8,
        "text-padding": 14,
        "symbol-sort-key": ["coalesce", ["get", "min_zoom"], 10],
      },
      paint: {
        "text-color": MAP_TOKENS.labelBright,
        "text-halo-color": MAP_TOKENS.halo,
        "text-halo-width": 1.2,
        "text-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.5, 8, 0.85],
      },
    }
  );

  return {
    version: 8,
    glyphs: GLYPHS,
    sources,
    layers,
  };
}
