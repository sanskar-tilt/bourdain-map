"use client";

import { useEffect, useRef, useState } from "react";
import type { ReelEntry } from "../../lib/reels";
import styles from "./reels.module.css";

/* One reel, lazily. Nothing platform-owned — no blockquote, no script, no
   request — exists until the frame is within 800px of the viewport. Then the
   official embed markup is injected and the platform's own embed.js turns it
   into an iframe. Verified against the static export before this page was
   built: both platforms hydrate client-injected blockquotes.

   Death is graceful by construction. The fallback link, the caption and the
   platform label are ours and always render. Instagram signals a dead reel
   by never marking the blockquote processed (.instagram-media-rendered), so
   after a timeout the frame swaps to the site's own "no longer available"
   state. TikTok always renders an iframe and puts its own compact
   "Video currently unavailable" card inside it for dead videos — their
   chrome, contained in our frame, never a broken one. */

/* ---- script managers, one per platform, module-level singletons ---- */

declare global {
  interface Window {
    instgrm?: { Embeds?: { process?: () => void } };
  }
}

let igLoading = false;
function kickInstagram(onError: () => void) {
  if (window.instgrm?.Embeds?.process) {
    window.instgrm.Embeds.process();
    return;
  }
  if (igLoading) return;
  igLoading = true;
  const s = document.createElement("script");
  s.src = "https://www.instagram.com/embed.js";
  s.async = true;
  s.onload = () => window.instgrm?.Embeds?.process?.();
  s.onerror = () => {
    igLoading = false; // a later reel may retry
    onError();
  };
  document.body.appendChild(s);
}

/* TikTok's embed.js scans once on execution and exposes no process() —
   re-appending the script (same URL, so it comes from HTTP cache) re-runs the
   scan over any new blockquotes. Batched in a microtask-ish timeout so ten
   reels arriving together cost one scan, not ten. */
let ttQueued = false;
function kickTikTok(onError: () => void) {
  if (ttQueued) return;
  ttQueued = true;
  setTimeout(() => {
    ttQueued = false;
    document
      .querySelectorAll('script[src="https://www.tiktok.com/embed.js"]')
      .forEach((old) => old.remove());
    const s = document.createElement("script");
    s.src = "https://www.tiktok.com/embed.js";
    s.async = true;
    s.onerror = onError;
    document.body.appendChild(s);
  }, 0);
}

/* ---- official embed markup, built as DOM rather than HTML strings ---- */

function igBlockquote(url: string): HTMLQuoteElement {
  const b = document.createElement("blockquote");
  b.className = "instagram-media";
  b.setAttribute("data-instgrm-permalink", url);
  b.setAttribute("data-instgrm-version", "14");
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  a.target = "_blank";
  a.textContent = "View on Instagram";
  b.appendChild(a);
  return b;
}

function ttBlockquote(url: string, videoId: string): HTMLQuoteElement {
  const b = document.createElement("blockquote");
  b.className = "tiktok-embed";
  b.setAttribute("cite", url);
  b.setAttribute("data-video-id", videoId);
  const section = document.createElement("section");
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  a.target = "_blank";
  a.textContent = "View on TikTok";
  section.appendChild(a);
  b.appendChild(section);
  return b;
}

/* How long a processed-but-silent Instagram blockquote gets before the frame
   calls it dead. Generous, because a slow connection is not a dead reel. */
const IG_DEAD_MS = 15000;

type Phase = "waiting" | "loading" | "ready" | "gone";

export default function ReelEmbed({ reel }: { reel: ReelEntry }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("waiting");

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;

    let timer: ReturnType<typeof setInterval> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const fail = () => setPhase("gone");

    const inject = () => {
      setPhase("loading");
      if (reel.platform === "instagram") {
        slot.appendChild(igBlockquote(reel.url));
        kickInstagram(fail);
        // Processed embeds get .instagram-media-rendered; dead reels never do.
        timer = setInterval(() => {
          if (slot.querySelector(".instagram-media-rendered")) {
            clearInterval(timer);
            clearTimeout(deadline);
            setPhase("ready");
          }
        }, 400);
        deadline = setTimeout(() => {
          clearInterval(timer);
          fail();
        }, IG_DEAD_MS);
      } else {
        slot.appendChild(ttBlockquote(reel.url, reel.videoId ?? ""));
        kickTikTok(fail);
        // embed.js swaps the blockquote for an iframe; dead videos still get
        // one (TikTok's own unavailable card), so an iframe means settled.
        timer = setInterval(() => {
          if (slot.querySelector("iframe")) {
            clearInterval(timer);
            clearTimeout(deadline);
            setPhase("ready");
          }
        }, 400);
        deadline = setTimeout(() => {
          clearInterval(timer);
          fail();
        }, IG_DEAD_MS);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        inject();
      },
      { rootMargin: "800px 0px" }
    );
    io.observe(slot);

    return () => {
      io.disconnect();
      if (timer) clearInterval(timer);
      if (deadline) clearTimeout(deadline);
    };
    // A reel entry is immutable content baked at build time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <figure className={`${styles.reel} reveal`}>
      <p className="label">{reel.platform}</p>
      {phase === "gone" ? (
        /* Distinct keys force a remount, not a reuse: the frame div holds
           foreign children (the platform's blockquote/iframe), and reusing
           the node would carry a dead iframe into the gone state. */
        <div key="gone" className={styles.goneFrame}>
          <span className={styles.goneTag}>No longer available</span>
          <span className={styles.goneNote}>
            The clip has left {reel.platform === "instagram" ? "Instagram" : "TikTok"},
            or wouldn&rsquo;t load.{" "}
            <a href={reel.url} rel="noopener" target="_blank">
              Where it was
            </a>
          </span>
        </div>
      ) : (
        <div
          key="frame"
          ref={slotRef}
          className={styles.frame}
          data-phase={phase}
          data-reel-slot
        >
          {phase !== "ready" && (
            <span className={styles.holding} aria-hidden="true">
              {phase === "waiting" ? "reel" : "loading"}
            </span>
          )}
          {/* Embedding needs JS twice over (ours and the platform's), so
              without it the frame is just the way out. */}
          <noscript>
            <a className={styles.noscriptLink} href={reel.url} rel="noopener">
              Watch on {reel.platform === "instagram" ? "Instagram" : "TikTok"}
            </a>
          </noscript>
        </div>
      )}
      {reel.caption && (
        <figcaption className={styles.caption}>{reel.caption}</figcaption>
      )}
    </figure>
  );
}
