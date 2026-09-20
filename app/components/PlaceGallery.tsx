"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { onScroll } from "../../lib/scroll";
import { usable, srcsetAttr, largest, type PhotoMeta } from "../../lib/photo";
import s from "./home.module.css";

export type GalleryItem = {
  photo?: string;
  alt?: string;
  credit?: string;
  placeSlug?: string;
  href?: string;
  line?: string;
  city?: string | null;
  meta?: PhotoMeta;
};

export default function PlaceGallery({ items }: { items: GalleryItem[] }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const cards = [...el.querySelectorAll<HTMLElement>("[data-card]")];
    return onScroll(() => {
      const vh = window.innerHeight;
      for (const card of cards) {
        const r = card.getBoundingClientRect();
        const mid = r.top + r.height / 2;
        const p = (mid - vh * 0.5) / vh;
        const drift = Number(card.dataset.drift ?? 0);
        card.style.setProperty("--drift", `${(p * drift).toFixed(1)}px`);
        const img = card.querySelector<HTMLElement>("[data-img]");
        if (img) img.style.setProperty("--shift", `${(p * -6).toFixed(2)}%`);
      }
    });
  }, []);

  const shown = items.filter((it) => it.placeSlug && (usable(it.meta) || it.photo));
  if (!shown.length) return null;

  return (
    <section className={`${s.section} ${s.gallery} reveal`} ref={root}>
      <p className="label">places</p>
      <div className={s.galleryGrid}>
        {shown.map((it, i) => (
          <Link
            key={it.placeSlug}
            href={it.href ?? `/place/${it.placeSlug}/`}
            className={s.galleryCard}
            data-card
            data-drift={40 + (i % 3) * 28}
            data-cursor="explore"
          >
            <div className={s.galleryClip}>
              <img
                data-img
                src={usable(it.meta) ? largest(it.meta) : `/home/${it.photo}`}
                srcSet={usable(it.meta) ? srcsetAttr(it.meta) : undefined}
                sizes="(max-width: 860px) 100vw, 42vw"
                alt={it.alt ?? it.line ?? ""}
              />
            </div>
            <span className={s.galleryName}>{it.line ?? it.placeSlug}</span>
            {it.city && <span className={s.galleryCity}>{it.city}</span>}
            {it.credit && <span className={s.credit}>{it.credit}</span>}
          </Link>
        ))}
      </div>
    </section>
  );
}
