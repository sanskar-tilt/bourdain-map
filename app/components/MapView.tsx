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
  type StyleSpecification,
} from "maplibre-gl";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";
import { buildBasemapStyle, hasBasemap, MAP_TOKENS } from "../../lib/basemap";
import styles from "./MapView.module.css";

/* Colours are duplicated from app/tokens.css because MapLibre resolves style
   JSON outside the CSS cascade. Single source of truth stays the token file;
   these must be changed together. */
const ACCENT = "#B8342A";                        /* the one accent: pins only */
const PAPER_RING = "#9DA0A5";                    /* the ring on a place that is gone */
const PAPER = "#E6E6E1";   /* the ground; closed pins are filled with it */
const INK = "#16181B";

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
  selectedId?: string | null;
  /** Set by the search palette and by routing; the map flies here. */
  flyTo?: { lon: number; lat: number; zoom?: number; id?: string } | null;
};

export default function MapView({ onSelect, selectedId, flyTo }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
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

    const m = new MapLibreMap({
      container: holder.current,
      style: buildBasemapStyle(),
      // Framed rather than zoomed all the way out: this crops the poles and
      // centres the landmass, so the opening frame is a composition instead
      // of a Mercator default. See notes/decisions.md.
      center: [10, 26],
      zoom: 1.45,
      minZoom: 1.1,
      maxZoom: 18,
      attributionControl: { compact: true },
      // Cheaper compositing on a map whose basemap never tilts.
      pitchWithRotate: false,
      dragRotate: false,
      renderWorldCopies: true,
    });
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
      /* ---- interaction -------------------------------------------------- */
      const hit = ["pins", "pin-repeat"];
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

      m.on("click", "pins", (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
        const f = e.features?.[0] as MapGeoJSONFeature | undefined;
        if (!f) return;
        const props = f.properties as unknown as PinProps;
        const [lon, lat] = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        onSelect({ ...props, unnamed: Boolean(props.unnamed) }, [lon, lat]);
      });

      // Expanding a cluster goes to the zoom that actually breaks it apart,
      // rather than a fixed jump that either overshoots or does nothing.
      m.on("click", "clusters", async (e: MapMouseEvent) => {
        const f = m.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
        if (!f) return;
        const src = m.getSource("places") as GeoJSONSource;
        const zoom = await src.getClusterExpansionZoom(f.properties.cluster_id as number);
        m.easeTo({
          center: (f.geometry as GeoJSON.Point).coordinates as [number, number],
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
  }, [onSelect]);

  /* ---------------------------------------------------------- selection */
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !m.getLayer("pin-selected")) return;
    m.setFilter("pin-selected", ["==", ["get", "id"], selectedId ?? "__none__"]);
  }, [selectedId, ready]);

  /* ------------------------------------------------------------- flyTo */
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !flyTo) return;
    m.flyTo({
      center: [flyTo.lon, flyTo.lat],
      zoom: flyTo.zoom ?? 15,
      duration: reduced.current ? 0 : 1400,
      curve: 1.42,
      speed: 1.1,
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
        {!hasBasemap && (
          <p className={styles.noTiles}>
            No basemap yet — pins only.
          </p>
        )}
        <p className={styles.status} aria-live="polite">
          {loaded === 0 ? "Finding the places…"
            : loaded < 0 ? "The places didn't load. Reload and they should."
            : `${loaded.toLocaleString()} places`}
        </p>
      </div>
    </div>
  );
}
