"use client";

import { useEffect, useRef, useState } from "react";
import { onScroll } from "../../lib/scroll";
import s from "./home.module.css";

/* The route drawing itself across a small world, in broadcast order.
 *
 * Two modes:
 *
 * setPiece — the homepage's one sticky moment besides the hero. The section
 * pins for two viewport heights and the trail draws LINEARLY against scroll:
 * the scrollbar is the pen, so there is no easing anywhere near it. 992px+
 * and fine motion only; below the gate it renders in normal flow and draws
 * on a timer like before. Exactly one of these may exist per page.
 *
 * plain — enters the viewport, draws once over ~5s, settles. Kept for reuse
 * on the map page.
 *
 * Reduced motion draws the finished route immediately in both modes.
 */

type Stop = { slug: string; name: string; first_air: string; lon: number; lat: number };

const DRAW_MS = 5200;

export default function TrailMap({
  height = 320,
  setPiece = false,
}: {
  height?: number;
  setPiece?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [last, setLast] = useState<Stop | null>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    fetch("/data/trail.json").then((r) => r.json()).then((d: Stop[]) => {
      setStops(d);
      setLast(d[d.length - 1] ?? null);
    }).catch(() => {});
  }, []);

  /* The pin gate, evaluated client-side so SSR renders unpinned. */
  useEffect(() => {
    if (!setPiece) return;
    const wide = window.matchMedia("(min-width: 992px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPinned(wide.matches && !reduced.matches);
    sync();
    wide.addEventListener("change", sync);
    reduced.addEventListener("change", sync);
    return () => {
      wide.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
    };
  }, [setPiece]);

  useEffect(() => {
    const el = holder.current, canvas = cv.current;
    if (!el || !canvas || stops.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const style = getComputedStyle(document.documentElement);
    const accent = style.getPropertyValue("--accent").trim() || "#B8342A";

    let raf = 0;
    let started = 0;
    let lastP = -1;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const size = () => {
      const r = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = r.width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: r.width, h: height };
    };

    // Equirectangular, fitted to the route's own bounds with padding, so it
    // fills the frame instead of floating in a mostly-empty world. Aspect is
    // preserved: the shape of the journey stays true.
    const lons = stops.map((s2) => s2.lon), lats = stops.map((s2) => s2.lat);
    const b0 = { w: Math.min(...lons), e: Math.max(...lons), s: Math.min(...lats), n: Math.max(...lats) };
    const project = (lon: number, lat: number, w: number, h: number) => {
      const pad = 24;
      const iw = w - pad * 2, ih = h - pad * 2;
      const sx = iw / Math.max(1e-6, b0.e - b0.w);
      const sy = ih / Math.max(1e-6, b0.n - b0.s);
      const k = Math.min(sx, sy);
      const ox = pad + (iw - (b0.e - b0.w) * k) / 2;
      const oy = pad + (ih - (b0.n - b0.s) * k) / 2;
      return [ox + (lon - b0.w) * k, oy + (b0.n - lat) * k];
    };

    const draw = (progress: number) => {
      const { w, h } = size();
      ctx.clearRect(0, 0, w, h);

      const pts = stops.map((st) => project(st.lon, st.lat, w, h));
      const shown = progress * (pts.length - 1);
      const whole = Math.floor(shown);
      const frac = shown - whole;

      // the route
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i <= whole; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      if (whole < pts.length - 1) {
        const a = pts[whole], b = pts[whole + 1];
        ctx.lineTo(a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac);
      }
      ctx.stroke();

      // the stops
      ctx.globalAlpha = 1;
      ctx.fillStyle = accent;
      for (let i = 0; i <= whole && i < pts.length; i++) {
        ctx.beginPath();
        ctx.arc(pts[i][0], pts[i][1], 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // where it ends
      if (progress >= 1) {
        const e = pts[pts.length - 1];
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(e[0], e[1], 5.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    if (reduced) { draw(1); return; }

    /* ---- set-piece: the scrollbar is the pen. Linear, no easing. ---- */
    if (pinned && wrap.current) {
      const pinEl = wrap.current;
      const read = () => {
        const r = pinEl.getBoundingClientRect();
        const travel = r.height - window.innerHeight;
        const p = travel > 0 ? Math.min(1, Math.max(0, -r.top / travel)) : 1;
        if (Math.abs(p - lastP) < 0.0005) return;
        lastP = p;
        pinEl.dataset.progress = p.toFixed(3);
        draw(p);
      };
      const stop = onScroll(read);
      const onResize = () => { lastP = -1; read(); };
      window.addEventListener("resize", onResize);
      return () => { stop(); window.removeEventListener("resize", onResize); };
    }

    /* ---- plain: enter the viewport, draw once over time, settle. ---- */
    const run = (now: number) => {
      if (!started) started = now;
      const t = Math.min(1, (now - started) / DRAW_MS);
      draw(t);
      if (t < 1) raf = requestAnimationFrame(run);
    };
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        raf = requestAnimationFrame(run);
      }
    }, { rootMargin: "0px 0px -5% 0px" });
    io.observe(el);

    draw(0);
    const onResize = () => draw(started ? 1 : 0);
    window.addEventListener("resize", onResize);
    return () => { io.disconnect(); cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, [stops, height, pinned]);

  const inner = (
    <div ref={holder} className={s.trail}>
      <canvas ref={cv} />
      {last && (
        <p className={s.trailEnd}>
          <span className="label">{stops.length} cities, in broadcast order</span>
          <span className={s.trailLast}>{last.name}, {last.first_air.slice(0, 4)}</span>
        </p>
      )}
    </div>
  );

  if (!setPiece || !pinned) return inner;

  return (
    <div ref={wrap} className={s.trailPin} data-pin data-progress="0">
      <div className={s.trailStage}>{inner}</div>
    </div>
  );
}
