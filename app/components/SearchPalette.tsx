"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fold, regionName, type SearchIndex } from "../../lib/artifacts";
import styles from "./SearchPalette.module.css";

/* 2,095 places and ~875 cities is small enough to fold once, up front, and
   then scan on every keystroke. No library, no network, no debounce — a
   linear pass over 3,000 pre-folded strings lands well inside a frame. */

type Row =
  | { type: "city"; slug: string; label: string; sub: string; lon: number; lat: number; zoom: number }
  | { type: "place"; slug: string; label: string; sub: string; lon: number; lat: number; zoom: number; gone: boolean };

export default function SearchPalette({
  index,
  onClose,
  onChoose,
  onPreview,
}: {
  index: SearchIndex;
  onClose: () => void;
  onChoose: (href: string) => void;
  onPreview: (lon: number, lat: number, zoom: number) => void;
}) {
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const folded = useMemo(() => ({
    cities: index.cities.map((c) => ({ c, f: fold(c.name) })),
    places: index.places
      .filter((p) => p.slug)
      .map((p) => ({
        p,
        f: fold(p.name),
        // Cityless places match on their country instead, so searching
        // "antarctica" finds McMurdo Station.
        fc: fold(p.city ?? regionName(p.cc) ?? ""),
      })),
  }), [index]);

  const results = useMemo<Row[]>(() => {
    const needle = fold(q);
    if (!needle) {
      // Empty state is an invitation, not a blank box: the cities he went
      // to most, which is a genuinely good place to start.
      return folded.cities.slice(0, 8).map(({ c }) => ({
        type: "city" as const, slug: c.slug, label: c.name,
        sub: `${c.places} place${c.places === 1 ? "" : "s"}`,
        lon: c.lon, lat: c.lat, zoom: 12,
      }));
    }
    const cities: Row[] = [];
    for (const { c, f } of folded.cities) {
      const i = f.indexOf(needle);
      if (i < 0) continue;
      cities.push({
        type: "city", slug: c.slug, label: c.name,
        sub: `${c.places} place${c.places === 1 ? "" : "s"}`,
        lon: c.lon, lat: c.lat, zoom: 12,
      });
      if (cities.length > 40) break;
    }
    const places: Row[] = [];
    for (const { p, f, fc } of folded.places) {
      if (!f.includes(needle) && !fc.includes(needle)) continue;
      places.push({
        type: "place", slug: p.slug as string, label: p.name,
        sub: p.city ?? regionName(p.cc) ?? "Unmapped",
        lon: p.lon, lat: p.lat, zoom: 15.5,
        gone: p.status === "closed",
      });
      if (places.length > 60) break;
    }
    // Cities rank above venues: the city is the unit people navigate by.
    const rank = (r: Row) => {
      const f = fold(r.label);
      return f === needle ? 0 : f.startsWith(needle) ? 1 : 2;
    };
    cities.sort((a, b) => rank(a) - rank(b));
    places.sort((a, b) => rank(a) - rank(b));
    return [...cities.slice(0, 6), ...places.slice(0, 24)];
  }, [q, folded]);

  useEffect(() => { setCursor(0); }, [q]);

  // Moving through results flies the map, so you see where you are going
  // before you commit to it.
  useEffect(() => {
    const r = results[cursor];
    if (r) onPreview(r.lon, r.lat, r.zoom);
  }, [cursor, results, onPreview]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  function href(r: Row) {
    return r.type === "city"
      ? `/city/${encodeURIComponent(r.slug)}/`
      : `/place/${encodeURIComponent(r.slug)}/`;
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    if (e.key === "Enter" && results[cursor]) { e.preventDefault(); onChoose(href(results[cursor])); }
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
  }

  return (
    <div className={styles.scrim} onMouseDown={onClose}>
      <div
        className={styles.palette}
        role="dialog"
        aria-label="Search"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className={styles.input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="A city, or somewhere he ate"
          aria-label="Search places and cities"
          autoComplete="off"
          spellCheck={false}
        />
        {results.length === 0 ? (
          <p className={styles.empty}>Nothing by that name. He didn&rsquo;t get everywhere.</p>
        ) : (
          <ul className={styles.list} ref={listRef}>
            {results.map((r, i) => (
              <li key={`${r.type}-${r.slug}`}>
                <button
                  type="button"
                  data-active={i === cursor}
                  data-gone={r.type === "place" && r.gone}
                  className={styles.row}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => onChoose(href(r))}
                >
                  <span className={styles.kind}>{r.type === "city" ? "City" : "Place"}</span>
                  <span className={styles.label}>{r.label}</span>
                  <span className={styles.sub}>
                    {r.type === "place" && r.gone ? `${r.sub} · gone` : r.sub}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <footer className={styles.hint}>
          <span>↑↓ move</span><span>↵ open</span><span>esc close</span>
        </footer>
      </div>
    </div>
  );
}
