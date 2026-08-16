"use client";

import { useEffect } from "react";

/* Entrances, once.

   Fires when an element's top passes 95% of the viewport, adds .is-in, and
   unobserves. Nothing re-animates on the way back up — that is what keeps
   the page feeling like a document rather than a toy.

   IntersectionObserver, no scroll listener, no library. rootMargin's bottom
   value of -5% is the "top 95%" trigger. */

export default function Reveal() {
  useEffect(() => {
    document.documentElement.classList.remove("no-js");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -5% 0px", threshold: 0 }
    );

    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
