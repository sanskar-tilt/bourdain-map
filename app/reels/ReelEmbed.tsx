"use client";

import { useEffect, useRef, useState } from "react";
import type { ReelEntry } from "../../lib/reels";
import styles from "./reels.module.css";

/* One reel, lazily. Nothing platform-owned — no markup, no script, no
   request — exists until the frame is within 800px of the viewport.

   Two official embeds, chosen for the least chrome each platform permits:

   Instagram — the blockquote + embed.js pattern. There is no chromeless
   Instagram embed: the header, like/comment row and caption live inside
   their iframe and no official option removes them. This is their minimal
   form (data-instgrm-captioned would add MORE).

   TikTok — the official Embed Player (player/v1), a plain iframe with
   description and music rows switched off. What remains inside (creator
   name, TikTok mark, and their cookie banner for first-time visitors) is
   their player chrome, not removable from outside.

   Death is graceful by construction. The fallback link and the caption are
   ours and always render. Instagram signals a dead reel by never marking
   the blockquote processed (.instagram-media-rendered); TikTok's player
   loads either way and shows its own compact "unavailable" card for dead
   videos — contained in our frame, never broken. A load that produces
   nothing within the deadline degrades to the site's marked state. */

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

/* Official embed markup, built as DOM rather than HTML strings. */
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

/* How long a silent embed gets before the frame calls it dead. Generous,
   because a slow connection is not a dead reel. */
const DEAD_MS = 15000;

type Phase = "waiting" | "loading" | "ready" | "gone";

export default function ReelEmbed({ reel }: { reel: ReelEntry }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const deadlineRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [phase, setPhase] = useState<Phase>("waiting");

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;

    let timer: ReturnType<typeof setInterval> | undefined;
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
            clearTimeout(deadlineRef.current);
            setPhase("ready");
          }
        }, 400);
        deadlineRef.current = setTimeout(() => {
          clearInterval(timer);
          fail();
        }, DEAD_MS);
      } else {
        // TikTok: React renders the player iframe once phase leaves
        // "waiting"; its onLoad settles the frame, this deadline catches a
        // player that never arrives at all.
        deadlineRef.current = setTimeout(fail, DEAD_MS);
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
      clearTimeout(deadlineRef.current);
    };
    // A reel entry is immutable content baked at build time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <figure className={`${styles.reel} reveal`}>
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
          {reel.platform === "tiktok" && phase !== "waiting" && (
            <iframe
              className={styles.ttPlayer}
              src={`https://www.tiktok.com/player/v1/${reel.videoId}?music_info=0&description=0&rel=0`}
              allow="fullscreen"
              title={reel.caption ?? "TikTok video"}
              onLoad={() => {
                clearTimeout(deadlineRef.current);
                setPhase("ready");
              }}
            />
          )}
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
