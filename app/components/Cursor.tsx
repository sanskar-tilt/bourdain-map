"use client";

import { useEffect, useRef } from "react";
import { onFrame } from "../../lib/scroll";
import s from "./Cursor.module.css";

/* The pill. SIT DOWN, following the pointer on its own lerp.
 *
 * Scoped to photographs and map links — anything carrying [data-cursor] —
 * and to nothing else. Inside those the native cursor is hidden and the
 * pill trails the hand at lerp 0.09: never 1:1, the lag IS the effect. The
 * pill is the entire hover state; the photograph underneath is never
 * scaled, tilted or filtered.
 *
 * Desktop and pointer:fine only. Disabled under reduced motion. Rides the
 * shared rAF loop and does no work at all once settled and hidden.
 */

const LERP = 0.09;
const SETTLED = 0.3; // px — under this, stop writing transforms

export default function Cursor() {
  const pill = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = pill.current;
    if (!el) return;

    const fine = window.matchMedia("(pointer: fine)");
    const wide = window.matchMedia("(min-width: 992px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    let enabled = false;
    let active = false;          // pointer currently over a target
    let x = -100, y = -100;      // pill position
    let tx = -100, ty = -100;    // pointer position
    let resting = true;

    const syncGate = () => {
      enabled = fine.matches && wide.matches && !reduced.matches;
      document.documentElement.classList.toggle("cursor-on", enabled);
      if (!enabled) {
        active = false;
        el.dataset.active = "false";
      }
    };
    syncGate();
    for (const m of [fine, wide, reduced]) m.addEventListener("change", syncGate);

    const over = (e: Event) => {
      if (!enabled) return;
      const hit = (e.target as HTMLElement | null)?.closest?.("[data-cursor]");
      if (!hit) return;
      active = true;
      el.dataset.active = "true";
    };
    const out = (e: Event) => {
      if (!active) return;
      const to = (e as PointerEvent).relatedTarget as HTMLElement | null;
      if (to?.closest?.("[data-cursor]")) return;   // moved within the target
      active = false;
      el.dataset.active = "false";
    };
    const move = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      // First contact snaps the pill under the hand instead of gliding in
      // from wherever it last died.
      if (resting) { x = tx; y = ty; }
      resting = false;
    };

    document.addEventListener("pointerover", over, true);
    document.addEventListener("pointerout", out, true);
    document.addEventListener("pointermove", move, { passive: true });

    const stop = onFrame(() => {
      if (!enabled || (resting && !active)) return;
      const dx = tx - x, dy = ty - y;
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist < SETTLED && !active) { resting = true; return; }
      if (dist >= SETTLED) {
        x += dx * LERP;
        y += dy * LERP;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      }
    });

    return () => {
      stop();
      for (const m of [fine, wide, reduced]) m.removeEventListener("change", syncGate);
      document.removeEventListener("pointerover", over, true);
      document.removeEventListener("pointerout", out, true);
      document.removeEventListener("pointermove", move);
      document.documentElement.classList.remove("cursor-on");
    };
  }, []);

  return (
    <div ref={pill} className={s.pill} data-active="false" data-cursor-pill="" aria-hidden="true">
      SIT DOWN
    </div>
  );
}
