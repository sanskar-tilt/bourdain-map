"use client";

import { useEffect, useRef, useState } from "react";
import s from "./home.module.css";

/* Counts up to the real place count, with food photographs cycling in the O
   of BOURDAIN behind it. Non-linear: quick through the middle, slow at both
   ends, so the last few hundred are readable rather than a blur.

   Plays once per session. On a repeat visit an inline script in the page
   head has already hidden it before paint, so there is no flash.
   Reduced-motion skips it entirely — no loader at all, not a fast one. */

const DURATION = 4000;   // 4s, or the object cycle cannot register
const WIPE = 1200;

/* Ease-in-out on the count itself: dwell at the ends, sprint through the
   middle. A linear counter reads as a progress bar; this reads as someone
   totting something up. */
const dwell = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export default function Loader({ flicker, total }: { flicker: string[]; total: number }) {
  const [n, setN] = useState(0);
  const [word, setWord] = useState(flicker[0] ?? "");
  const [phase, setPhase] = useState<"idle" | "run" | "wipe" | "done">("idle");
  const raf = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try { seen = sessionStorage.getItem("wha:loader") === "1"; } catch {}
    if (reduced || seen) { setPhase("done"); return; }

    try { sessionStorage.setItem("wha:loader", "1"); } catch {}
    setPhase("run");
    document.documentElement.style.overflow = "hidden";

    const start = performance.now();
    let lastWord = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      setN(Math.round(dwell(t) * total));

      // The names cycle faster than the eye can settle on them, which is
      // the point: it should read as a lot of places, not as a list.
      if (now - lastWord > 110 && flicker.length) {
        lastWord = now;
        setWord(flicker[Math.floor(Math.random() * flicker.length)]);
      }

      if (t < 1) raf.current = requestAnimationFrame(tick);
      else {
        setPhase("wipe");
        window.setTimeout(() => {
          setPhase("done");
          document.documentElement.style.overflow = "";
        }, WIPE);
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf.current);
      document.documentElement.style.overflow = "";
    };
  }, [flicker, total]);

  if (phase === "done" || phase === "idle") return null;

  return (
    <div className={s.loader} data-phase={phase} aria-hidden="true">
      <div className={s.loaderInner}>
        <span className={s.loaderWord}>{word}</span>
        <span className={s.loaderCount}>
          {/* Four digits throughout so the width never jumps; the thousands
              comma only appears once there is a thousand. */}
          {n < 1000 ? String(n).padStart(4, "0") : n.toLocaleString("en-GB")}
        </span>
      </div>
    </div>
  );
}
