/**
 * A custom Protomaps basemap style.
 *
 * Deliberately not `namedFlavor()` from @protomaps/basemaps. Every generic
 * Bourdain map on the internet fails in the same place: a stock basemap with
 * markers dropped on top, so the map is louder than the data. The rule here
 * is that the pins are the only bright thing on the screen.
 *
 * What survives: coastlines, water, country outlines, and city labels that
 * appear as you zoom in. What is deliberately gone: every POI, every road
 * label, every building, all landuse tinting. Roads exist only as the
 * faintest structure at close zoom so a street feels like a street.
 *
 * Values come from app/tokens.css. They are duplicated here as literals
 * because MapLibre resolves style JSON outside the CSS cascade and cannot
 * read custom properties.
 */

import type { StyleSpecification } from "maplibre-gl";

export const MAP_TOKENS = {
  land: "#E6E6E1",
  water: "#D8DAD6",
  line: "#C2C2B9",
  lineStrong: "#B0B0A6",
  road: "#D2D2CA",
  label: "#8A8D93",
  labelBright: "#6E7178",
  halo: "#E6E6E1",
} as const;

/** Where the tiles come from. A self-hosted .pmtiles file is the goal: no
 *  key, no per-load billing, and the style is ours rather than rented. */
export const PMTILES_URL = process.env.NEXT_PUBLIC_PMTILES_URL ?? "";
const PROTOMAPS_KEY = process.env.NEXT_PUBLIC_PROTOMAPS_KEY ?? "";

const GLYPHS = "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf";
const FONT = ["Noto Sans Regular"];
const FONT_MED = ["Noto Sans Medium"];

function tileSource(): StyleSpecification["sources"] {
  if (PMTILES_URL) {
    // pmtiles:// is resolved by the Protocol registered in MapView.
    return {
      protomaps: {
        type: "vector",
        url: `pmtiles://${PMTILES_URL}`,
        attribution:
          '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>',
      },
    };
  }
  if (PROTOMAPS_KEY) {
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

/** True when we have no tiles at all — the map still runs, showing pins on a
 *  flat ground, which is a legible degraded state rather than a broken one. */
export const hasBasemap = Boolean(PMTILES_URL || PROTOMAPS_KEY);

export function buildBasemapStyle(): StyleSpecification {
  const sources = tileSource();
  const layers: StyleSpecification["layers"] = [
    {
      id: "background",
      type: "background",
      paint: { "background-color": MAP_TOKENS.water },
    },
  ];

  if (hasBasemap) {
    layers.push(
      // ---- land ------------------------------------------------------
      {
        id: "earth",
        type: "fill",
        source: "protomaps",
        "source-layer": "earth",
        paint: { "fill-color": MAP_TOKENS.land },
      },

      // ---- water -----------------------------------------------------
      // Slightly darker and cooler than the paper, so the coast reads as an
      // edge rather than needing a heavy stroke.
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

      // ---- borders ---------------------------------------------------
      // Country outlines only. Nothing below national level: subdividing
      // the world into administrative units is noise here.
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

      // ---- roads -----------------------------------------------------
      // Structure, not information. No labels, no classification colour,
      // and nothing at all until you are close enough for it to mean
      // something.
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

      // ---- labels ----------------------------------------------------
      // Countries first, then cities as you descend. Sparse by design:
      // the label layer is there to orient you, not to be read.
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
          // Bigger places win the collision at low zoom, so the world
          // thins out sensibly rather than arbitrarily.
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
  }

  return {
    version: 8,
    glyphs: GLYPHS,
    sources,
    layers,
  };
}
