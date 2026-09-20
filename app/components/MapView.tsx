"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  NavigationControl,
  Popup,
  addProtocol,
  removeProtocol,
  type GeoJSONSource,
  type MapGeoJSONFeature,
  type MapMouseEvent,
} from "maplibre-gl";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";
import { initialMapStyle } from "../../lib/basemap";
import type { SearchCity } from "../../lib/artifacts";
import styles from "./MapView.module.css";

/* Colours are duplicated from app/tokens.css because MapLibre resolves style
   JSON outside the CSS cascade. Single source of truth stays the token file;
   these must be changed together. */
const ACCENT = "#B8342A";                        /* the one accent: pins only */
const PAPER_RING = "#6A6E74";                    /* the ring on a place that is gone */
const PAPER = "#1A1C20";   /* dark ground fill for a closed pin */
const INK = "#E8E6E1";     /* labels on the dark basemap */

/* Above this zoom every pin stands alone. Below it they gather. 7 keeps a
   dense city legible while still collapsing a continent to a constellation. */
const CLUSTER_MAX_ZOOM = 6;

export type PinProps = {
  id: string;
  slug: string | null;
  name: string;
  city: string | null;
  citySlug: string | null;
  kind: string;
  status: string;
  visits: number;
  unnamed: boolean;
};

type Props = {
  onSelect: (p: PinProps, lngLat: [number, number]) => void;
  onSelectCity?: (slug: string, lngLat: [number, number]) => void;
  selectedId?: string | null;
  selectedCitySlug?: string | null;
  cities?: SearchCity[] | null;
  /** Set by the search palette and by routing; the map flies here. */
  flyTo?: { lon: number; lat: number; zoom?: number; id?: string } | null;
};

export default function MapView({
  onSelect, onSelectCity, selectedId, selectedCitySlug, cities, flyTo,
}: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const onSelectRef = useRef(onSelect);
  const onSelectCityRef = useRef(onSelectCity);
  onSelectRef.current = onSelect;
  onSelectCityRef.current = onSelectCity;
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  /* ---------------------------------------------------------------- init */
  useEffect(() => {
    if (!holder.current || map.current) return;

    const protocol = new Protocol();
    addProtocol("pmtiles", protocol.tile);

    let m: MapLibreMap;
    try {
      m = new MapLibreMap({
        container: holder.current,
        style: initialMapStyle(),
        center: [10, 26],
        zoom: 1.45,
        minZoom: 1.1,
        maxZoom: 18,
        attributionControl: { compact: true },
        pitchWithRotate: false,
        dragRotate: false,
        dragPan: { linearity: 0.28, deceleration: 2600, maxSpeed: 1400 },
        renderWorldCopies: true,
        fadeDuration: 220,
        maxTileCacheSize: 160,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        cancelPendingTileRequestsWhileZooming: true,
      });
    } catch (err) {
      console.warn("[map] WebGL failed — search and the panel still work.", err);
      setLoaded(-1);
      removeProtocol("pmtiles");
      return;
    }
    map.current = m;
    // Exposed so the map can be inspected from the console and from the
    // headless perf/diagnostic scripts. Read-only in practice.
    (window as unknown as { __map?: unknown }).__map = m;

    // Top-right, under the masthead. The bottom edge belongs to the status
    // line and the attribution, and stacking three things into one corner is
    // how they end up on top of each other.
    m.addControl(new NavigationControl({ showCompass: false }), "top-right");

    m.on("load", () => {
      // Empty source first, so layers exist and the first frame paints before
      // the data has finished arriving.
      m.addSource("places", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
        clusterRadius: 20,
        // Carried up into the cluster so a group containing somewhere that is
        // gone can say so without us re-querying the leaves.
        clusterProperties: {
          gone: ["+", ["case", ["==", ["get", "status"], "closed"], 1, 0]],
        },
      });
      m.addSource("cities", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      /* ---- the lamp glow under every lit pin -------------------------- */
      m.addLayer({
        id: "pin-glow",
        type: "circle",
        source: "places",
        filter: ["all", ["!", ["has", "point_count"]], ["!=", ["get", "status"], "closed"]],
        paint: {
          "circle-color": ACCENT,
          "circle-blur": 1,
          "circle-opacity": 0.14,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 4, 12, 10, 16, 16],
        },
      });

      /* ---- pins -------------------------------------------------------
         One layer, data-driven. Colour carries state and only state:
         lit = he was here, unlit = gone. Kind varies the size and the
         ring, never the hue, so the map never turns into a legend.      */
      m.addLayer({
        id: "pins",
        type: "circle",
        source: "places",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "case",
            // On a light ground absence is a filled paper disc with a thin
            // ring, not a hole — a hole is invisible against the paper.
            ["==", ["get", "status"], "closed"], PAPER,
            // A meal with people whose names nobody wrote down: a ring with
            // nothing filled in. Present, lit, unlabelled.
            ["get", "unnamed"], "rgba(0,0,0,0)",
            ACCENT,
          ],
          "circle-stroke-color": [
            "case",
            ["==", ["get", "status"], "closed"], PAPER_RING,
            ["get", "unnamed"], ACCENT,
            "rgba(0,0,0,0)",
          ],
          "circle-stroke-width": [
            "case",
            ["==", ["get", "status"], "closed"], 1.2,
            ["get", "unnamed"], 1.5,
            0,
          ],
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            5, ["match", ["get", "kind"], "market", 3.4, "food", 3.2, 2.6],
            10, ["match", ["get", "kind"], "market", 6.5, "food", 6, 5],
            16, ["match", ["get", "kind"], "market", 11, "food", 10, 8.5],
          ],
          "circle-opacity": ["case", ["==", ["get", "status"], "closed"], 0.9, 1],
          "circle-radius-transition": { duration: 240 },
          "circle-opacity-transition": { duration: 240 },
        },
      });

      /* ---- he came back more than once -------------------------------- */
      m.addLayer({
        id: "pin-repeat",
        type: "circle",
        source: "places",
        filter: ["all", ["!", ["has", "point_count"]], [">", ["get", "visits"], 1]],
        paint: {
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": ACCENT,
          "circle-stroke-width": 1,
          "circle-stroke-opacity": 0.55,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 6, 10, 11, 16, 17],
          "circle-radius-transition": { duration: 240 },
        },
      });

      /* ---- selected ---------------------------------------------------- */
      m.addLayer({
        id: "pin-selected",
        type: "circle",
        source: "places",
        filter: ["==", ["get", "id"], "__none__"],
        paint: {
          "circle-color": INK,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 5, 12, 8, 16, 11],
          "circle-stroke-color": ACCENT,
          "circle-stroke-width": 3,
          "circle-stroke-opacity": 0.5,
        },
      });

      /* ---- clusters ---------------------------------------------------- */
      // Not counting-discs. A cluster is one small dot, barely scaled by how
      // many places it stands for, so the world reads as him everywhere
      // rather than as data aggregation. The number is on hover.
      m.addLayer({
        id: "clusters",
        type: "circle",
        source: "places",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ACCENT,
          "circle-opacity": 0.9,
          "circle-stroke-color": PAPER,
          "circle-stroke-width": 0.6,
          "circle-stroke-opacity": 0.5,
          "circle-radius": [
            "interpolate", ["linear"], ["sqrt", ["get", "point_count"]],
            1.4, 2.6, 4.5, 4.2, 11, 6.4, 25, 9,
          ],
          // Radius and opacity ease rather than snapping as clusters merge
          // and split. MapLibre re-clusters per zoom level; the transition is
          // what keeps that from reading as a pop.
          "circle-radius-transition": { duration: 300 },
          "circle-opacity-transition": { duration: 300 },
        },
      });
      m.addLayer({
        id: "pin-labels",
        type: "symbol",
        source: "places",
        filter: ["!", ["has", "point_count"]],
        minzoom: 11,
        layout: {
          "text-field": ["get", "name"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 11, 10, 15, 12],
          "text-font": ["Noto Sans Regular"],
          "text-offset": [0, 1.15],
          "text-anchor": "top",
          "text-optional": true,
          "text-padding": 4,
        },
        paint: {
          "text-color": INK,
          "text-halo-color": "#0B0D10",
          "text-halo-width": 1.3,
        },
      });

      /* ---- cities ------------------------------------------------------
         Quiet marks, never the accent (that's for pins). They fade as you
         drop into a city so a click at world scale is a city, and a click
         at street scale is a kitchen. */
      m.addLayer({
        id: "cities",
        type: "circle",
        source: "cities",
        maxzoom: 10,
        paint: {
          "circle-color": INK,
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.28, 6, 0.4, 10, 0],
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            1, ["min", ["+", 1.6, ["*", ["sqrt", ["get", "places"]], 0.22]], 4],
            8, ["min", ["+", 3, ["*", ["sqrt", ["get", "places"]], 0.35]], 7],
          ],
          "circle-radius-transition": { duration: 240 },
          "circle-opacity-transition": { duration: 240 },
        },
      });
      m.addLayer({
        id: "city-selected",
        type: "circle",
        source: "cities",
        maxzoom: 11,
        filter: ["==", ["get", "slug"], "__none__"],
        paint: {
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": INK,
          "circle-stroke-width": 1.4,
          "circle-stroke-opacity": 0.55,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 6, 8, 10],
        },
      });
      m.addLayer({
        id: "city-labels",
        type: "symbol",
        source: "cities",
        minzoom: 3,
        maxzoom: 10,
        filter: [">=", ["get", "places"], 4],
        layout: {
          "text-field": ["get", "name"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 3, 10, 8, 12],
          "text-font": ["Noto Sans Regular"],
          "text-offset": [0, 1.1],
          "text-anchor": "top",
          "text-optional": true,
          "text-padding": 8,
        },
        paint: {
          "text-color": INK,
          "text-halo-color": "#0B0D10",
          "text-halo-width": 1.2,
          "text-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.55, 7, 0.85, 10, 0],
        },
      });

      /* ---- interaction -------------------------------------------------- */
      const hit = ["pins", "pin-repeat", "cities", "city-labels"];
      hit.forEach((id) => {
        m.on("mouseenter", id, () => { m.getCanvas().style.cursor = "pointer"; });
        m.on("mouseleave", id, () => { m.getCanvas().style.cursor = ""; });
      });
      const countPopup = new Popup({
        closeButton: false, closeOnClick: false, offset: 10, className: "count-popup",
      });
      m.on("mousemove", "clusters", (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
        m.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f) return;
        const n = f.properties?.point_count as number;
        countPopup
          .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
          .setText(`${n} place${n === 1 ? "" : "s"}`)
          .addTo(m);
      });
      m.on("mouseleave", "clusters", () => {
        m.getCanvas().style.cursor = "";
        countPopup.remove();
      });
      m.on("mousemove", "cities", (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
        m.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f) return;
        const n = f.properties?.places as number;
        const name = f.properties?.name as string;
        countPopup
          .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
          .setText(`${name} · ${n} place${n === 1 ? "" : "s"}`)
          .addTo(m);
      });
      m.on("mouseleave", "cities", () => {
        m.getCanvas().style.cursor = "";
        countPopup.remove();
      });

      const pickCity = (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
        const f = e.features?.[0];
        const slug = f?.properties?.slug as string | undefined;
        if (!f || !slug) return;
        const [lon, lat] = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        onSelectCityRef.current?.(slug, [lon, lat]);
      };
      m.on("click", "cities", pickCity);
      m.on("click", "city-labels", pickCity);

      m.on("click", "pins", (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
        const f = e.features?.[0] as MapGeoJSONFeature | undefined;
        if (!f) return;
        const props = f.properties as unknown as PinProps;
        const [lon, lat] = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        onSelectRef.current({ ...props, unnamed: Boolean(props.unnamed) }, [lon, lat]);
      });

      // A cluster that is one city opens that city. Mixed clusters expand.
      m.on("click", "clusters", async (e: MapMouseEvent) => {
        const f = m.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
        if (!f) return;
        const src = m.getSource("places") as GeoJSONSource;
        const id = f.properties.cluster_id as number;
        const [lon, lat] = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        try {
          const leaves = await src.getClusterLeaves(id, 80, 0);
          const tally = new Map<string, number>();
          for (const leaf of leaves) {
            const slug = (leaf.properties as { citySlug?: string } | null)?.citySlug;
            if (slug) tally.set(slug, (tally.get(slug) ?? 0) + 1);
          }
          const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
          if (top && top[1] >= Math.max(3, leaves.length * 0.6) && onSelectCityRef.current) {
            onSelectCityRef.current(top[0], [lon, lat]);
            return;
          }
        } catch { /* expand instead */ }
        const zoom = await src.getClusterExpansionZoom(id);
        m.easeTo({
          center: [lon, lat],
          zoom: Math.min(zoom + 0.35, 17),
          duration: reduced.current ? 0 : 620,
          easing: (t: number) => 1 - Math.pow(1 - t, 3),
        });
      });

      setReady(true);

      /* ---- data, after the first frame ---------------------------------
         The map is interactive before this resolves. On a slow connection
         you get a basemap you can pan, then pins, rather than a blank
         rectangle until everything is in. */
      fetch("/data/places.geojson")
        .then((r) => r.json())
        .then((fc: GeoJSON.FeatureCollection) => {
          const src = m.getSource("places") as GeoJSONSource | undefined;
          if (!src) return;
          src.setData(fc);
          setLoaded(fc.features.length);
        })
        .catch(() => setLoaded(-1));
    });

    return () => {
      removeProtocol("pmtiles");
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const src = m.getSource("cities") as GeoJSONSource | undefined;
    if (!src || !cities) return;
    src.setData({
      type: "FeatureCollection",
      features: cities.map((c) => ({
        type: "Feature" as const,
        properties: { slug: c.slug, name: c.name, places: c.places },
        geometry: { type: "Point" as const, coordinates: [c.lon, c.lat] },
      })),
    });
  }, [cities, ready]);

  /* ---------------------------------------------------------- selection */
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !m.getLayer("pin-selected")) return;
    m.setFilter("pin-selected", ["==", ["get", "id"], selectedId ?? "__none__"]);
  }, [selectedId, ready]);

  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !m.getLayer("city-selected")) return;
    m.setFilter("city-selected", ["==", ["get", "slug"], selectedCitySlug ?? "__none__"]);
  }, [selectedCitySlug, ready]);

  /* ------------------------------------------------------------- flyTo */
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !flyTo) return;
    const dest: [number, number] = [flyTo.lon, flyTo.lat];
    const here = m.getCenter();
    const hop = Math.hypot(here.lng - dest[0], here.lat - dest[1]);
    const zoom = flyTo.zoom ?? 15;
    if (reduced.current) {
      m.jumpTo({ center: dest, zoom });
      return;
    }
    if (hop < 8) {
      m.easeTo({
        center: dest,
        zoom,
        duration: 720,
        easing: (t: number) => 1 - Math.pow(1 - t, 3),
        essential: true,
      });
      return;
    }
    m.flyTo({
      center: dest,
      zoom,
      duration: 1100,
      curve: 1.28,
      speed: 1.25,
      essential: true,
    });
  }, [flyTo, ready]);

  const resetView = useCallback(() => {
    map.current?.flyTo({
      center: [10, 26], zoom: 1.45,
      duration: reduced.current ? 0 : 1200, essential: true,
    });
  }, []);

  return (
    <div className={styles.wrap}>
      <div ref={holder} className={styles.map} />
      <div className={styles.corner}>
        <button className={styles.reset} onClick={resetView} type="button">
          Whole world
        </button>
        <p className={styles.status} aria-live="polite">
          {loaded === 0 ? "Finding the places…"
            : loaded < 0 ? "The places didn't load. Reload and they should."
            : `${loaded.toLocaleString()} places`}
        </p>
      </div>
    </div>
  );
}
