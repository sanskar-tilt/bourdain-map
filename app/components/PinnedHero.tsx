"use client";

import { useEffect, useRef } from "react";
import s from "./home.module.css";

/* The only pinned section on the page.

   Sticks for two viewports while the photo scales 1.3 → 0.5, so scrolling
   past it reads as departure rather than as a slide changing. Driven by one
   rAF-throttled scroll read writing a single custom property — no library,
   no per-frame layout thrash.

   Reduced-motion pins nothing and shows the settled state. */

export default function PinnedHero({ children }: { children: React.ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--p", "0");
      return;
    }

    let queued = false;
    const read = () => {
      queued = false;
      const r = el.getBoundingClientRect();
      const travel = r.height - window.innerHeight;
      // 0 while the top is in view, 1 by the time the section is spent.
      const p = travel > 0 ? Math.min(1, Math.max(0, -r.top / travel)) : 0;
      el.style.setProperty("--p", p.toFixed(4));
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section ref={wrap} className={s.pinWrap}>
      <div className={s.pinSticky}>{children}</div>
    </section>
  );
}
