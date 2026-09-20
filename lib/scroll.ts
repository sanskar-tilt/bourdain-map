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
  // Each subscriber is isolated. The loop reschedules *after* running them,
  // so one throwing subscriber used to kill the frame permanently — smooth
  // scrolling, the pull-back and every sweep would stop together, silently,
  // and the page would look merely "stuck" rather than broken.
  for (const s of subs) {
    try {
      s(y);
    } catch (err) {
      subs.delete(s);
      console.error("[scroll] subscriber threw and was removed", err);
    }
  }
  raf = requestAnimationFrame(frame);
}

export function scrollToId(id: string): boolean {
  if (typeof document === "undefined" || !id) return false;
  const el = document.getElementById(id);
  if (!el) return false;
  if (lenis) {
    lenis.scrollTo(el, { offset: -24, duration: reduced ? 0 : 1.15 });
  } else {
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }
  return true;
}

export function startScroll(): () => void {
  if (typeof window === "undefined") return () => {};
  reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!reduced) {
    lenis = new Lenis({
      // noth.in measured feel: duration ~1.2, expo settle. Touch stays native.
      duration: 1.2,
      wheelMultiplier: 1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
      autoRaf: false,
    });
    document.documentElement.classList.add("lenis");
    // Exposed for tests and console poking, same as window.__map. A
    // programmatic window.scrollTo is smoothed like any other scroll, so a
    // harness that needs to be *somewhere* has to ask Lenis directly.
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
  }

  function onClick(e: MouseEvent) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.("a[href]");
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href?.startsWith("#") || href === "#") return;
    const id = decodeURIComponent(href.slice(1));
    if (!document.getElementById(id)) return;
    e.preventDefault();
    history.pushState(null, "", href);
    scrollToId(id);
  }
  document.addEventListener("click", onClick);

  const bootHash = () => {
    const id = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (id) scrollToId(id);
  };
  requestAnimationFrame(() => requestAnimationFrame(bootHash));

  raf = requestAnimationFrame(frame);

  return () => {
    document.removeEventListener("click", onClick);
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

export const stopScroll = () => lenis?.stop();
export const resumeScroll = () => lenis?.start();
