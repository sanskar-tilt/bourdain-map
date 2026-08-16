"use client";

import { onFrame, stopScroll, resumeScroll } from "./scroll";

/**
 * The opening, as one timeline from black to settled.
 *
 * Phases are stamped onto <html data-opening> and the CSS keys off them, so
 * the hero's pre-animation state exists in the markup before any JS runs and
 * there is never a frame of settled content behind the curtain.
 *
 * Driven from the same rAF loop as Lenis — one clock for the whole site.
 *
 * The overlap is the point: the hero starts while the curtain is still
 * travelling. A gap between them reads as two separate events; an overlap
 * reads as one motion.
 */

export type OpeningMode = "full" | "arrival" | "none";

/** Offsets in ms from the start of the run. */
const FULL = {
  curtain: 5100,   // count (4000) + hold (1000) + one beat before it starts
  photo:   5500,   // 400ms into a 1600ms curtain — still moving
  text:    5700,
  nav:     6300,
  cue:     6500,
  done:    8400,   // comfortably after the curtain lands at 6700
};

/** Repeat visit: no loader, but the site still never simply appears. */
const ARRIVAL = { curtain: 0, photo: 400, text: 600, nav: 1200, cue: 1400, done: 3200 };

const STEPS = ["curtain", "photo", "text", "nav", "cue", "done"] as const;
type Step = (typeof STEPS)[number];

export function runOpening(mode: OpeningMode): () => void {
  const root = document.documentElement;

  if (mode === "none") {
    root.dataset.opening = "settled";
    document.querySelectorAll("[data-arrival-text]").forEach((el) => el.classList.add("is-in"));
    return () => {};
  }

  const at = mode === "full" ? FULL : ARRIVAL;
  root.dataset.opening = "pending";

  // Locked until the curtain *starts* — released as it begins moving, not
  // when it finishes, so the page is already yours while it lifts.
  stopScroll();
  root.classList.add("is-locked");

  const start = performance.now();
  let reached = -1;

  const stop = onFrame(() => {
    const t = performance.now() - start;
    for (let i = STEPS.length - 1; i > reached; i--) {
      const step: Step = STEPS[i];
      if (t < at[step]) continue;
      for (let j = reached + 1; j <= i; j++) apply(STEPS[j]);
      reached = i;
      break;
    }
    if (reached === STEPS.length - 1) stop();
  });

  function apply(step: Step) {
    if (step === "curtain") {
      root.dataset.opening = "curtain";
      root.classList.remove("is-locked");
      resumeScroll();
      return;
    }
    if (step === "text") {
      root.dataset.opening = "text";
      document.querySelectorAll("[data-arrival-text]").forEach((el) => el.classList.add("is-in"));
      return;
    }
    root.dataset.opening = step;
  }

  return () => {
    stop();
    root.classList.remove("is-locked");
    resumeScroll();
  };
}
