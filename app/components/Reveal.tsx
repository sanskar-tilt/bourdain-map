"use client";

import { useEffect } from "react";
import { onScroll } from "../../lib/scroll";

/* Entrances, once.

   Fires when an element's top passes 95% of the viewport, adds .is-in, and
   unobserves. Nothing re-animates on the way back up — that is what keeps
   the page feeling like a document rather than a toy.

   IntersectionObserver, no library. But an observer alone is not enough: it
   only delivers a callback when the intersection *changes*, and a jump
   straight down the page — Cmd+End, a deep anchor, a restored scroll
   position — takes a section from not-intersecting-below to
   not-intersecting-above without ever intersecting. Those sections would sit
   invisible above the reader forever. So a cheap sweep runs alongside, on the
   shared scroll frame, settling anything that has been passed.
*/

const settle = (el: Element) => el.classList.add("is-in");

export default function Reveal() {
  useEffect(() => {
    document.documentElement.classList.remove("no-js");

    const pending = new Set<Element>(document.querySelectorAll(".reveal"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      pending.forEach(settle);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          settle(e.target);
          pending.delete(e.target);
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -5% 0px", threshold: 0 }
    );
    pending.forEach((el) => io.observe(el));

    // The sweep. Only after a jump worth caring about, so this costs nothing
    // during ordinary scrolling.
    let last = -1e9;
    const stop = onScroll((y) => {
      if (Math.abs(y - last) < 200 || pending.size === 0) return;
      last = y;
      for (const el of [...pending]) {
        if (el.getBoundingClientRect().bottom >= 0) continue;
        settle(el);
        pending.delete(el);
        io.unobserve(el);
      }
    });

    return () => { io.disconnect(); stop(); };
  }, []);

  return null;
}
