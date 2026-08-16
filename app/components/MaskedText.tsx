"use client";

import { useEffect, useRef } from "react";
import s from "./home.module.css";

/* Text arrives. It does not fade.
 *
 * The string is split into its *rendered* lines — measured, not guessed —
 * each line wrapped in an overflow-hidden box with an inner span that starts
 * translated fully below its own edge. The words rise out of a hard edge,
 * 70ms apart. That mask edge is the whole effect; a fade is what makes a page
 * feel like a template.
 *
 * The full string stays in the DOM as the element's accessible name, so a
 * screen reader gets a sentence rather than a pile of fragments.
 *
 * Re-splits on resize because line breaks move. Settled immediately under
 * reduced motion.
 */

export default function MaskedText({
  as: Tag = "p",
  text,
  className,
  arrival,
}: {
  as?: "h1" | "h2" | "p" | "blockquote";
  text: string;
  className?: string;
  /** Driven by the opening timeline rather than by scrolling into view. */
  arrival?: boolean;
}) {
  const host = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const split = () => {
      // Lay the words out first so their positions can be measured.
      el.textContent = "";
      const words = text.split(/\s+/).filter(Boolean);
      const spans = words.map((w, i) => {
        const sp = document.createElement("span");
        sp.className = s.word;
        sp.textContent = i === words.length - 1 ? w : w + " ";
        el.appendChild(sp);
        return sp;
      });

      // Group by vertical position — that is the actual line break.
      const lines: string[][] = [];
      let top: number | null = null;
      for (let i = 0; i < spans.length; i++) {
        const t = spans[i].offsetTop;
        if (top === null || Math.abs(t - top) > 2) { lines.push([]); top = t; }
        lines[lines.length - 1].push(words[i]);
      }

      el.textContent = "";
      lines.forEach((line, i) => {
        const mask = document.createElement("span");
        mask.className = s.lineMask;
        const inner = document.createElement("span");
        inner.textContent = line.join(" ");
        inner.style.transitionDelay = `calc(${i} * var(--stagger))`;
        mask.appendChild(inner);
        el.appendChild(mask);
      });
    };

    split();
    if (reduced) { el.classList.add("is-in"); return; }

    // The hero's lines belong to the opening; the observer would fire them
    // early, because they are already in view.
    if (arrival) {
      const t0 = window.setTimeout(() => {}, 0);
      window.clearTimeout(t0);
      let r = 0;
      const onResizeArrival = () => {
        window.clearTimeout(r);
        r = window.setTimeout(() => {
          const wasIn = el.classList.contains("is-in");
          split();
          if (wasIn) el.classList.add("is-in");
        }, 150);
      };
      window.addEventListener("resize", onResizeArrival);
      return () => { window.removeEventListener("resize", onResizeArrival); window.clearTimeout(r); };
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -5% 0px" }
    );
    io.observe(el);

    let t = 0;
    const onResize = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        const wasIn = el.classList.contains("is-in");
        split();
        if (wasIn) el.classList.add("is-in");
      }, 150);
    };
    window.addEventListener("resize", onResize);
    return () => { io.disconnect(); window.removeEventListener("resize", onResize); window.clearTimeout(t); };
  }, [text, arrival]);

  return (
    <Tag
      ref={host as never}
      className={`${s.masked} ${className ?? ""}`}
      aria-label={text}
      {...(arrival ? { "data-arrival-text": "" } : {})}
    >
      {/* Server-rendered as the plain string: correct without JS, and the
          splitter replaces it on mount. */}
      {text}
    </Tag>
  );
}
