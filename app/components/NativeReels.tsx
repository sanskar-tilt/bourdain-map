"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ReelEntry } from "../../lib/reels";
import styles from "./NativeReels.module.css";

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
  const still = reel.poster
    ? `/home/${reel.poster}`
    : reel.photo
      ? `/home/${reel.photo}`
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
  if (!near || !reel.videoId) return <div className={styles.media} />;

  if (reel.platform === "tiktok") {
    return (
      <iframe
        className={styles.embed}
        src={`https://www.tiktok.com/player/v1/${reel.videoId}?music_info=0&description=0&rel=0&autoplay=1&loop=1`}
        allow="autoplay; fullscreen"
        title={reel.caption ?? "Reel"}
      />
    );
  }

  if (reel.platform === "youtube") {
    const id = reel.videoId;
    return (
      <iframe
        className={styles.embed}
        src={`https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${id}&rel=0&modestbranding=1&controls=0`}
        allow="autoplay; fullscreen; encrypted-media"
        allowFullScreen
        title={reel.caption ?? "Reel"}
      />
    );
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

function realIndexOf(i: number, n: number) {
  if (n <= 1) return 0;
  if (i === 0) return n - 1;
  if (i === n + 1) return 0;
  return i - 1;
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
  const n = reels.length;
  const looped = n > 1 ? [reels[n - 1], ...reels, reels[0]] : reels;

  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    const root = deck.current;
    if (!root) return;
    const slides = [...root.querySelectorAll<HTMLElement>("[data-reel-slide]")];
    const jump = (i: number) => {
      slides[i]?.scrollIntoView({ behavior: "auto", block: "start" });
    };
    if (n > 1) jump(1);

    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!hit) return;
        const i = slides.indexOf(hit.target as HTMLElement);
        if (i < 0) return;
        if (n > 1 && i === 0) {
          jump(n);
          setActive(n - 1);
          activeRef.current = n - 1;
          return;
        }
        if (n > 1 && i === n + 1) {
          jump(1);
          setActive(0);
          activeRef.current = 0;
          return;
        }
        const r = realIndexOf(i, n);
        setActive(r);
        activeRef.current = r;
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
      let next = activeRef.current + dir;
      if (n > 1) {
        if (next < 0) next = n - 1;
        if (next >= n) next = 0;
        jump(next + 1);
      } else {
        next = Math.min(slides.length - 1, Math.max(0, next));
        slides[next]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      io.disconnect();
      window.removeEventListener("keydown", onKey);
    };
  }, [n]);

  if (!reels.length) return null;

  return (
    <div ref={deck} className={`${styles.deck} ${fullPage ? styles.full : ""}`} data-reels>
      {fullPage && (
        <Link href="/" className={styles.home}>Home</Link>
      )}
      {looped.map((reel, i) => {
        const r = realIndexOf(i, n);
        return (
          <Slide
            key={`${reel.id}-loop-${i}`}
            reel={reel}
            active={r === active}
            near={Math.abs(r - active) <= 1 || (n > 1 && ((r === 0 && active === n - 1) || (r === n - 1 && active === 0)))}
            index={r}
            total={n}
          />
        );
      })}
    </div>
  );
}
