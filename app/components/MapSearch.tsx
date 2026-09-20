"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fold, foldedHits, foldedRank, regionName, type SearchIndex } from "../../lib/artifacts";
import styles from "./MapSearch.module.css";

type Row =
  | { type: "city"; slug: string; label: string; sub: string; lon: number; lat: number; zoom: number }
  | { type: "place"; slug: string; label: string; sub: string; lon: number; lat: number; zoom: number; gone: boolean };

export default function MapSearch({
  index,
  onChoose,
  onPreview,
}: {
  index: SearchIndex;
  onChoose: (href: string) => void;
  onPreview: (lon: number, lat: number, zoom: number) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const folded = useMemo(() => ({
    cities: index.cities.map((c) => ({
      c,
      f: fold(c.name),
      fr: fold(c.region ?? ""),
      fs: fold(c.slug.replace(/-[a-z]{2}$/i, "").replace(/-/g, " ")),
    })),
    places: index.places
      .filter((p) => p.slug)
      .map((p) => ({
        p,
        f: fold(p.name),
        fc: fold(p.city ?? regionName(p.cc) ?? ""),
      })),
  }), [index]);

  const results = useMemo<Row[]>(() => {
    const needle = fold(q);
    if (!needle) {
      return folded.cities.slice(0, 6).map(({ c }) => ({
        type: "city" as const,
        slug: c.slug,
        label: c.name,
        sub: `${c.places} place${c.places === 1 ? "" : "s"}`,
        lon: c.lon, lat: c.lat, zoom: 12,
      }));
    }
    const cities: Row[] = [];
    for (const { c, f, fr, fs } of folded.cities) {
      if (!foldedHits(f, needle) && !(fr && foldedHits(fr, needle)) && !foldedHits(fs, needle)) continue;
      cities.push({
        type: "city", slug: c.slug, label: c.name,
        sub: c.region && fold(c.region) !== fold(c.name)
          ? `${c.region} · ${c.places}`
          : `${c.places} places`,
        lon: c.lon, lat: c.lat, zoom: 12,
      });
      if (cities.length > 8) break;
    }
    const places: Row[] = [];
    for (const { p, f, fc } of folded.places) {
      if (!foldedHits(f, needle) && !foldedHits(fc, needle)) continue;
      places.push({
        type: "place", slug: p.slug as string, label: p.name,
        sub: p.city ?? regionName(p.cc) ?? "Unmapped",
        lon: p.lon, lat: p.lat, zoom: 15.5,
        gone: p.status === "closed",
      });
      if (places.length > 16) break;
    }
    const rank = (r: Row) => foldedRank(fold(r.label), needle);
    cities.sort((a, b) => rank(a) - rank(b));
    places.sort((a, b) => rank(a) - rank(b));
    return [...cities.slice(0, 5), ...places.slice(0, 12)];
  }, [q, folded]);

  useEffect(() => { setCursor(0); }, [q]);

  useEffect(() => {
    if (!open) return;
    const r = results[cursor];
    if (!r) return;
    const t = window.setTimeout(() => onPreview(r.lon, r.lat, r.zoom), 180);
    return () => window.clearTimeout(t);
  }, [cursor, results, open, onPreview]);

  useEffect(() => {
    const onDoc = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, []);

  function href(r: Row) {
    return r.type === "city"
      ? `/city/${encodeURIComponent(r.slug)}/`
      : `/place/${encodeURIComponent(r.slug)}/`;
  }

  function choose(r: Row) {
    setOpen(false);
    onChoose(href(r));
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setCursor((c) => Math.min(c + 1, results.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    }
    if (e.key === "Enter" && results[cursor]) {
      e.preventDefault();
      choose(results[cursor]);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      input.current?.blur();
    }
  }

  return (
    <div ref={box} className={styles.wrap} data-open={open ? "true" : "false"}>
      <label className={styles.field}>
        <span className={styles.mark} aria-hidden="true">⌕</span>
        <input
          ref={input}
          className={styles.input}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="A city, a kitchen…"
          aria-label="Search cities and places"
          autoComplete="off"
          spellCheck={false}
        />
        {q && (
          <button
            type="button"
            className={styles.clear}
            onClick={() => { setQ(""); input.current?.focus(); }}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </label>
      {open && (
        <ul className={styles.list} role="listbox">
          {results.length === 0 ? (
            <li className={styles.empty}>Nothing by that name.</li>
          ) : (
            results.map((r, i) => (
              <li key={`${r.type}-${r.slug}`}>
                <button
                  type="button"
                  className={styles.row}
                  data-active={i === cursor}
                  data-gone={r.type === "place" && r.gone}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => choose(r)}
                >
                  <span className={styles.kind}>{r.type === "city" ? "City" : "Place"}</span>
                  <span className={styles.label}>{r.label}</span>
                  <span className={styles.sub}>
                    {r.type === "place" && r.gone ? `${r.sub} · gone` : r.sub}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
