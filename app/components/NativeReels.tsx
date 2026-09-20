"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ReelEntry } from "../../lib/reels";
import styles from "./NativeReels.module.css";

declare global {
  interface Window {
    instgrm?: { Embeds?: { process?: () => void } };
  }
}

let igLoading = false;
function kickInstagram() {
  if (window.instgrm?.Embeds?.process) {
    window.instgrm.Embeds.process();
    return;
  }
  if (igLoading) return;
  igLoading = true;
  const s = document.createElement("script");
  s.src = "https://www.instagram.com/embed.js";
  s.async = true;
  s.onload = () => window.instgrm?.Embeds?.process?.();
  s.onerror = () => { igLoading = false; };
  document.body.appendChild(s);
}

function LocalSlide({ reel, active }: { reel: ReelEntry; active: boolean }) {
  const vid = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = vid.current;
    if (!el) return;
    el.muted = true;
    setMuted(true);
    if (active) void el.play().catch(() => {});
    else el.pause();
  }, [active]);

  const src = reel.file ? `/home/${reel.file}` : undefined;
  const still = reel.photo
    ? `/home/${reel.photo}`
    : reel.poster
      ? `/home/${reel.poster}`
      : undefined;

  return (
    <>
      {src ? (
        <video
          ref={vid}
          className={styles.media}
          src={src}
          poster={still}
          muted
          playsInline
          loop
          preload={active ? "auto" : "metadata"}
          onEnded={(e) => {
            const el = e.currentTarget;
            el.currentTime = 0;
            if (active) void el.play().catch(() => {});
          }}
          onClick={() => {
            const el = vid.current;
            if (!el) return;
            el.muted = !el.muted;
            setMuted(el.muted);
          }}
        />
      ) : still ? (
        <img className={styles.media} src={still} alt="" />
      ) : (
        <div className={styles.media} />
      )}
      {src && (
        <button
          type="button"
          className={styles.sound}
          data-on={muted ? "false" : "true"}
          aria-pressed={!muted}
          onClick={() => {
            const el = vid.current;
            if (!el) return;
            el.muted = !el.muted;
            setMuted(el.muted);
          }}
        >
          {muted ? "sound off" : "sound on"}
        </button>
      )}
    </>
  );
}

function EmbedSlide({ reel, near }: { reel: ReelEntry; near: boolean }) {
  const slot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!near || reel.platform !== "instagram" || !slot.current || !reel.url) return;
    if (slot.current.querySelector("blockquote")) {
      kickInstagram();
      return;
    }
    const b = document.createElement("blockquote");
    b.className = "instagram-media";
    b.setAttribute("data-instgrm-permalink", reel.url);
    b.setAttribute("data-instgrm-version", "14");
    slot.current.appendChild(b);
    kickInstagram();
  }, [near, reel.platform, reel.url]);

  if (reel.platform === "tiktok" && reel.videoId && near) {
    return (
      <iframe
        className={styles.embed}
        src={`https://www.tiktok.com/player/v1/${reel.videoId}?music_info=0&description=0&rel=0&autoplay=1&loop=1`}
        allow="autoplay; fullscreen"
        title={reel.caption ?? "Reel"}
      />
    );
  }
  if (reel.platform === "instagram") {
    return <div ref={slot} className={styles.igSlot} />;
  }
  return <div className={styles.media} />;
}

function Slide({
  reel, active, near, index, total,
}: {
  reel: ReelEntry; active: boolean; near: boolean; index: number; total: number;
}) {
  return (
    <section className={styles.slide} data-reel-slide>
      <div className={styles.stage}>
        {reel.platform === "local"
          ? <LocalSlide reel={reel} active={active} />
          : <EmbedSlide reel={reel} near={near} />}
        <div className={styles.shade} />
        {reel.caption && <p className={styles.caption}>{reel.caption}</p>}
        {reel.credit && <p className={styles.credit}>{reel.credit}</p>}
        <p className={styles.index} aria-hidden="true">{index + 1}/{total}</p>
        {index === 0 && active && <p className={styles.swipe} aria-hidden="true">Swipe</p>}
      </div>
    </section>
  );
}

export default function NativeReels({
  reels,
  fullPage,
}: {
  reels: ReelEntry[];
  fullPage?: boolean;
}) {
  const deck = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  activeRef.current = active;

  useEffect(() => {
    const root = deck.current;
    if (!root) return;
    const slides = [...root.querySelectorAll("[data-reel-slide]")];
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!hit) return;
        const i = slides.indexOf(hit.target);
        if (i >= 0) setActive(i);
      },
      { root, threshold: 0.65 }
    );
    slides.forEach((el) => io.observe(el));

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== " ") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      const dir = e.key === "ArrowUp" ? -1 : 1;
      const next = Math.min(slides.length - 1, Math.max(0, activeRef.current + dir));
      slides[next]?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener("keydown", onKey);

    return () => {
      io.disconnect();
      window.removeEventListener("keydown", onKey);
    };
  }, [reels.length]);

  if (!reels.length) return null;

  return (
    <div ref={deck} className={`${styles.deck} ${fullPage ? styles.full : ""}`} data-reels>
      {fullPage && (
        <Link href="/" className={styles.home}>Home</Link>
      )}
      {reels.map((reel, i) => (
        <Slide
          key={reel.id}
          reel={reel}
          active={i === active}
          near={Math.abs(i - active) <= 1}
          index={i}
          total={reels.length}
        />
      ))}
    </div>
  );
}
