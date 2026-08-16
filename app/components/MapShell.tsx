"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import MapView, { type PinProps } from "./MapView";
import SearchPalette from "./SearchPalette";
import { loadSearchIndex, type SearchIndex } from "../../lib/artifacts";
import styles from "./MapShell.module.css";

/** The URL is the state. Everything here derives from the path. */
function parsePath(path: string): { kind: "place" | "city" | null; slug: string | null } {
  const m = /^\/(place|city)\/([^/]+)\/?$/.exec(path);
  if (!m) return { kind: null, slug: null };
  return { kind: m[1] as "place" | "city", slug: decodeURIComponent(m[2]) };
}

export default function MapShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { kind, slug } = useMemo(() => parsePath(path ?? "/"), [path]);

  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [camera, setCamera] = useState<
    { lon: number; lat: number; zoom?: number } | null
  >(null);

  useEffect(() => {
    loadSearchIndex().then(setIndex).catch(() => setIndex(null));
  }, []);

  /* Route change -> move the camera. The map itself is never rebuilt. */
  useEffect(() => {
    if (!index || !slug) return;
    if (kind === "place") {
      const p = index.places.find((x) => x.slug === slug);
      if (p) setCamera({ lon: p.lon, lat: p.lat, zoom: 15.5 });
    } else if (kind === "city") {
      const c = index.cities.find((x) => x.slug === slug);
      if (c) setCamera({ lon: c.lon, lat: c.lat, zoom: 12 });
    }
  }, [index, kind, slug]);

  const selectedId = useMemo(() => {
    if (kind !== "place" || !index || !slug) return null;
    return index.places.find((x) => x.slug === slug)?.id ?? null;
  }, [index, kind, slug]);

  /* Clicking a pin is a navigation, so back works and the link is shareable. */
  const onSelect = useCallback(
    (p: PinProps) => {
      if (p.slug) router.push(`/place/${encodeURIComponent(p.slug)}/`);
    },
    [router]
  );

  /* Cmd-K, Ctrl-K, or / — the palette is the primary way in, not a filter
     box in a corner. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing =
        e.target instanceof HTMLElement &&
        /^(input|textarea)$/i.test(e.target.tagName);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Any route other than the map itself renders into the panel — places,
     cities, and the static pages like /about. */
  const panelOpen = (path ?? "/") !== "/";

  return (
    <div className={styles.shell} data-panel={panelOpen ? "open" : "closed"}>
      <MapView onSelect={onSelect} selectedId={selectedId} flyTo={camera} />

      <header className={styles.masthead}>
        <a href="/" className={styles.wordmark}>Where he ate</a>
        <button
          type="button"
          className={styles.searchTrigger}
          onClick={() => setPaletteOpen(true)}
        >
          <span>Search places and cities</span>
          <kbd>⌘K</kbd>
        </button>
      </header>

      {/* Panel, never modal. The map stays visible and interactive behind it. */}
      <aside className={styles.panel} aria-hidden={!panelOpen}>
        {panelOpen && (
          <>
            <button
              type="button"
              className={styles.close}
              onClick={() => router.push("/")}
              aria-label="Close"
            >
              ×
            </button>
            <div className={styles.panelBody}>{children}</div>
          </>
        )}
      </aside>

      {paletteOpen && index && (
        <SearchPalette
          index={index}
          onClose={() => setPaletteOpen(false)}
          onPreview={(lon, lat, zoom) => setCamera({ lon, lat, zoom })}
          onChoose={(href) => {
            setPaletteOpen(false);
            router.push(href);
          }}
        />
      )}
    </div>
  );
}
