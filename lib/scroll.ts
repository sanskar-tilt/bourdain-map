"use client";

import Lenis from "lenis";

/**
 * One Lenis instance and one rAF loop for the whole site.
 *
 * Everything scroll-linked subscribes here rather than listening to `scroll`
 * itself. Two reasons: a native scroll listener fires against the real scroll
 * position while Lenis is interpolating toward it, so anything driven that way
 * judders against the smoothing; and one loop is cheaper than several.
 *
 * Disabled entirely under prefers-reduced-motion — no instance, no loop, and
 * subscribers still get called once so they can settle.
 */

type Sub = (scroll: number) => void;

let lenis: Lenis | null = null;
let raf = 0;
const subs = new Set<Sub>();
let reduced = false;

function frame(time: number) {
  lenis?.raf(time);
  const y = lenis ? lenis.scroll : window.scrollY;
  for (const s of subs) s(y);
  raf = requestAnimationFrame(frame);
}

export function startScroll(): () => void {
  if (typeof window === "undefined") return () => {};
  reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!reduced) {
    lenis = new Lenis({
      // Their measured config. lerp 0.1 is the whole feel: a flick keeps
      // travelling and coasts to a stop instead of ending when your finger does.
      lerp: 0.1,
      wheelMultiplier: 1,
      easing: (t: number) => 1.001 - Math.pow(2, -10 * t),
      smoothWheel: true,
      // Touch keeps the platform's own momentum; Lenis on top of it fights
      // the OS and feels worse, not better.
      syncTouch: false,
      // We drive the loop ourselves so the cursor and any scroll-linked work
      // share one frame.
      autoRaf: false,
    });
    document.documentElement.classList.add("lenis");
  }

  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    lenis?.destroy();
    lenis = null;
    document.documentElement.classList.remove("lenis");
  };
}

/** Subscribe to the shared frame. Called immediately so callers can settle. */
export function onScroll(fn: Sub): () => void {
  subs.add(fn);
  fn(lenis ? lenis.scroll : (typeof window === "undefined" ? 0 : window.scrollY));
  return () => subs.delete(fn);
}

/** Add work to the shared frame that isn't scroll-driven (the cursor). */
export function onFrame(fn: Sub): () => void {
  return onScroll(fn);
}

export const isSmooth = () => Boolean(lenis);
export const stopScroll = () => lenis?.stop();
export const resumeScroll = () => lenis?.start();
