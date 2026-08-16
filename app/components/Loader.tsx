"use client";

import { useEffect, useRef, useState } from "react";
import BourdainMark from "./BourdainMark";
import type { PhotoMeta } from "../../lib/photo";
import s from "./home.module.css";

/* The loader.
 *
 * BOURDAIN with the O as a photo window. Through the count, overhead shots of
 * food cycle through the O on a non-linear interval — slow at both ends,
 * fastest mid-count. That breathing is the effect; a constant interval is a
 * spinner.
 *
 * Then it resolves. When the count lands the cycling stops and the last image
 * in the O is the one photograph of the man. Hold, then the curtain lifts.
 * All of this, and then him. He is never one frame in the shuffle — arriving
 * at him once is a sentence; flickering his face a dozen times is a gimmick,
 * and it spends one licensed photograph instead of a dozen.
 *
 * Rendered server-side. Every dismissal read — sessionStorage, matchMedia,
 * the query string — happens in an effect, so first paint is identical on
 * server and client and there is no hydration mismatch.
 */

export type LoaderPhoto = { photo?: string; alt?: string; meta?: PhotoMeta };

const DURATION = 4000;   // 4s, or the object cycle cannot register
const HOLD = 1000;       // the man, alone, before the curtain
const WIPE = 1200;

/* easeInOutQuad — dwell at the ends, sprint through the middle. */
const ease = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/* Slow swaps at the start, fastest mid-count, slowing again at the end. */
const interval = (t: number) => 90 + 420 * (1 - Math.sin(Math.PI * t));

export default function Loader({
  objects, portrait, total,
}: {
  objects: LoaderPhoto[];
  portrait: LoaderPhoto | null;
  total: number;
}) {
  const [n, setN] = useState(0);
  const [idx, setIdx] = useState(0);
  const [resolved, setResolved] = useState(false);
  const [phase, setPhase] = useState<"idle" | "run" | "wipe" | "done">("idle");
  const raf = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hold = params.get("loader") === "hold";   // deterministic screenshots
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try { seen = sessionStorage.getItem("wha:loader") === "1"; } catch {}

    // No loader at all under reduced motion, and never on a repeat visit.
    if (reduced || (seen && !hold)) { setPhase("done"); return; }
    if (!hold) { try { sessionStorage.setItem("wha:loader", "1"); } catch {} }

    setPhase("run");
    document.documentElement.style.overflow = "hidden";

    const start = performance.now();
    let nextSwap = start + interval(0);
    let i = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      setN(Math.round(ease(t) * total));

      if (t < 1) {
        if (now >= nextSwap && objects.length > 1) {
          i = (i + 1) % objects.length;
          setIdx(i);
          nextSwap = now + interval(t);
        }
        raf.current = requestAnimationFrame(tick);
        return;
      }

      // Landed. Cycling stops; the O becomes the one photograph of him.
      setN(total);
      setResolved(true);
      if (hold) return;                       // freeze for screenshots
      window.setTimeout(() => {
        setPhase("wipe");
        window.setTimeout(() => {
          setPhase("done");
          document.documentElement.style.overflow = "";
        }, WIPE);
      }, HOLD);
    };

    raf.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf.current);
      document.documentElement.style.overflow = "";
    };
  }, [objects, portrait, total]);

  if (phase === "done" || phase === "idle") return null;

  const shown = resolved && portrait ? portrait : objects[idx] ?? objects[0];

  return (
    <div className={s.loader} data-phase={phase} data-resolved={resolved ? "true" : "false"} role="presentation">
      <div className={s.loaderInner}>
        <BourdainMark
          photo={shown?.photo}
          meta={shown?.meta}
          alt={shown?.alt}
          isFinal={resolved}
          probe
          sizes="clamp(64px, 9vw, 132px)"
        />
        <span className={s.loaderCount} data-loader-count="">
          {n < 1000 ? String(n).padStart(4, "0") : n.toLocaleString("en-GB")}
        </span>
      </div>
    </div>
  );
}
