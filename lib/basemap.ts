/**
 * Basemap. Visitors never see an "API key required" canvas.
 *
 * Default, no key: OpenFreeMap vector styles (Positron paper, Dark night).
 * Carto's public raster CDN watermarks every tile with "API KEY REQUIRED",
 * so it is never the fallback.
 *
 * Protomaps / PMTiles, when a real key or URL is set, replace that
 * with a sparse paper or night vector style. MapTiler is never the default.
 */

import type { StyleSpecification } from "maplibre-gl";

export type MapTheme = "light" | "dark";
export const MAP_THEME_KEY = "wha:map-theme";

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

/** Positron paper — the default. No key, no watermark. */
export const OPENFREEMAP_LIGHT = "https://tiles.openfreemap.org/styles/positron";
export const OPENFREEMAP_DARK = "https://tiles.openfreemap.org/styles/dark";

export function maptilerDarkUrl(): string | null {
  if (!usableKey(MAPTILER_KEY)) return null;
  return `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`;
}

export function readMapTheme(): MapTheme {
  try {
    const v = localStorage.getItem(MAP_THEME_KEY);
    if (v === "dark" || v === "light") return v;
  } catch { /* private mode */ }
  return "light";
}

export function writeMapTheme(theme: MapTheme) {
  try { localStorage.setItem(MAP_THEME_KEY, theme); } catch { /* private mode */ }
}

/** Warmer rust than the site accent — reads as a pin, not a measles outbreak. */
export function pinColors(theme: MapTheme) {
  if (theme === "light") {
    return {
      pin: "#A24B35",
      glow: "#A24B35",
      glowOpacity: 0.2,
      closed: "#E4E2DB",
      closedRing: "#8A8680",
      selected: "#1C1A18",
      selectedRing: "#A24B35",
      ink: "#2C2A28",
      halo: "#EDEBE4",
      paper: "#EDEBE4",
      cluster: "#A24B35",
    };
  }
  return {
    pin: "#C46248",
    glow: "#C46248",
    glowOpacity: 0.22,
    closed: "#1A1C20",
    closedRing: "#6A6E74",
    selected: "#E8E6E1",
    selectedRing: "#C46248",
    ink: "#E8E6E1",
    halo: "#0B0D10",
    paper: "#1A1C20",
    cluster: "#C46248",
  };
}

function cartoRaster(
  path: string,
  ground: string,
  paint: {
    "raster-saturation"?: number;
    "raster-contrast"?: number;
    "raster-brightness-min"?: number;
    "raster-brightness-max"?: number;
  }
): StyleSpecification {
  return {
    version: 8,
    glyphs: GLYPHS,
    sources: {
      carto: {
        type: "raster",
        tiles: ["a", "b", "c"].map(
          (s) => `https://${s}.basemaps.cartocdn.com/${path}/{z}/{x}/{y}@2x.png`
        ),
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
        paint: { "background-color": ground },
      },
      {
        id: "carto",
        type: "raster",
        source: "carto",
        paint,
      },
    ],
  };
}

/** Unused. Carto's public raster CDN watermarks "API KEY REQUIRED". */
export function rasterLight(): StyleSpecification {
  return cartoRaster("light_all", "#E6E6E1", {
    "raster-saturation": -0.42,
    "raster-contrast": -0.06,
    "raster-brightness-min": 0.06,
    "raster-brightness-max": 0.97,
  });
}

/** Cinematic Dark Matter. */
export function rasterDark(): StyleSpecification {
  return cartoRaster("dark_all", "#0B0D10", {
    "raster-saturation": -0.18,
    "raster-contrast": 0.04,
    "raster-brightness-min": 0,
    "raster-brightness-max": 0.82,
  });
}

const PM_DARK = {
  land: "#14161A",
  water: "#0B0D10",
  line: "#2A2E34",
  lineStrong: "#3A4048",
  road: "#1E2228",
  label: "#8A9098",
  labelBright: "#C4C8CE",
  halo: "#0B0D10",
} as const;

const PM_LIGHT = {
  land: "#E6E6E1",
  water: "#D2D4D0",
  line: "#C2C2BA",
  lineStrong: "#A8A89E",
  road: "#D8D8D0",
  label: "#5C6058",
  labelBright: "#3A3C38",
  halo: "#E6E6E1",
} as const;

export function initialMapStyle(theme: MapTheme = "light"): string | StyleSpecification {
  if (hasBasemap) return buildBasemapStyle(theme);
  return theme === "dark" ? OPENFREEMAP_DARK : OPENFREEMAP_LIGHT;
}

export function buildBasemapStyle(theme: MapTheme = "light"): StyleSpecification {
  if (!hasBasemap) {
    // Unreachable from initialMapStyle; keep a typed style for tests.
    return theme === "dark" ? rasterDark() : rasterLight();
  }

  const T = theme === "dark" ? PM_DARK : PM_LIGHT;
  const sources = tileSource();
  const layers: StyleSpecification["layers"] = [
    {
      id: "background",
      type: "background",
      paint: { "background-color": T.water },
    },
    {
      id: "earth",
      type: "fill",
      source: "protomaps",
      "source-layer": "earth",
      paint: { "fill-color": T.land },
    },
    {
      id: "water",
      type: "fill",
      source: "protomaps",
      "source-layer": "water",
      paint: { "fill-color": T.water },
    },
    {
      id: "coastline",
      type: "line",
      source: "protomaps",
      "source-layer": "water",
      paint: {
        "line-color": T.line,
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
        "line-color": T.lineStrong,
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
        "line-color": T.road,
        "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.25, 16, 1.1],
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
        "line-color": T.road,
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.35, 16, 1.8],
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
        "text-color": T.label,
        "text-halo-color": T.halo,
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
        "text-color": T.labelBright,
        "text-halo-color": T.halo,
        "text-halo-width": 1.2,
        "text-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.5, 8, 0.85],
      },
    },
  ];

  return { version: 8, glyphs: GLYPHS, sources, layers };
}
