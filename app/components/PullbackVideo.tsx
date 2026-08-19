"use client";

import { useEffect, useRef, useState } from "react";
import s from "./home.module.css";

/* The pull-back's content: a YouTube video where the photograph was.
 *
 * The IFrame API rather than a bare iframe, because the whole point is mute
 * control: autoplay with sound is blocked by every browser, so the video
 * arrives muted, plays only while the section is in the viewport, pauses the
 * moment it leaves, and the SOUND pill is the one way to hear it. Muted is
 * always the default — re-asserted on every re-entry, so autoplay never
 * fires with sound no matter what the visitor did last pass.
 *
 * Two modes, decided by the same gates as the pin (992px, reduced motion):
 *   auto   — chrome-less player scaling with the pull-back, sound pill in
 *            the stage corner. The pill does not shrink with the frame.
 *   static — no pin anywhere near this: a labelled frame with a play button,
 *            and YouTube's own controls once started. Nothing autoplays.
 *
 * The wrapper carries data-video-state / data-video-muted for acceptance,
 * and the player is exposed as window.__whaPlayer so isMuted() itself can
 * be asserted rather than our mirror of it. */

type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  destroy(): void;
};

type YTNamespace = {
  Player: new (
    el: Element,
    opts: {
      videoId: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
      };
    }
  ) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
    __whaPlayer?: YTPlayer;
  }
}

let ytLoading: Promise<void> | null = null;
function loadYT(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (!ytLoading) {
    ytLoading = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve();
      };
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      document.body.appendChild(tag);
    });
  }
  return ytLoading;
}

type Props = { videoId: string; start?: number };

export default function PullbackVideo({ videoId, start }: Props) {
  // SSR renders the static frame; the effect below promotes to auto where
  // the pin is real. Same shape as the pin's own data-pinned flip.
  const [auto, setAuto] = useState(false);
  const [started, setStarted] = useState(false); // static mode, after click
  const [state, setState] = useState<"none" | "ready" | "playing" | "paused">("none");
  const [muted, setMuted] = useState(true);
  const [live, setLive] = useState(false); // section in view, pill showable

  const host = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const inView = useRef(false);

  /* Mode: mirrors HeroPullback's gate exactly. */
  useEffect(() => {
    const gate = window.matchMedia("(min-width: 992px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAuto(gate.matches && !reduced.matches);
    sync();
    gate.addEventListener("change", sync);
    reduced.addEventListener("change", sync);
    return () => {
      gate.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
    };
  }, []);

  const create = (el: Element, controls: 0 | 1) => {
    const YT = window.YT!;
    const p = new YT.Player(el, {
      videoId,
      playerVars: {
        autoplay: 0,
        controls,
        start: Math.max(0, Math.floor(start ?? 0)),
        playsinline: 1,
        rel: 0,
        mute: 1,
        disablekb: controls ? 0 : 1,
      },
      events: {
        onReady: () => {
          p.mute();
          setMuted(true);
          setState("ready");
          if (controls === 0 && inView.current) p.playVideo();
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.PLAYING) setState("playing");
          else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED)
            setState("paused");
        },
      },
    });
    player.current = p;
    window.__whaPlayer = p;
    return p;
  };

  /* Auto mode: player + in-view driving. */
  useEffect(() => {
    if (!auto) return;
    const el = layer.current;
    if (!el) return;

    let cancelled = false;
    loadYT().then(() => {
      if (cancelled || player.current || !host.current) return;
      create(host.current, 0);
    });

    const io = new IntersectionObserver(
      (entries) => {
        const on = entries.some((e) => e.isIntersecting);
        inView.current = on;
        setLive(on);
        const p = player.current;
        if (!p) return;
        if (on) {
          // Muted is the default on every arrival, not just the first.
          p.mute();
          setMuted(true);
          p.playVideo();
        } else {
          p.pauseVideo();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);

    return () => {
      cancelled = true;
      io.disconnect();
      player.current?.destroy();
      player.current = null;
      delete window.__whaPlayer;
    };
    // videoId/start are baked at build time; auto is the only live input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  const toggle = () => {
    const p = player.current;
    if (!p) return;
    if (p.isMuted()) {
      p.unMute();
      setMuted(false);
    } else {
      p.mute();
      setMuted(true);
    }
  };

  /* Static mode: nothing loads until asked. */
  const play = () => {
    setStarted(true);
    loadYT().then(() => {
      if (player.current || !host.current) return;
      create(host.current, 1);
    });
  };

  if (!auto) {
    return (
      <div className={s.videoStatic} data-video-static>
        <p className="label">watch</p>
        {started ? (
          <div className={s.videoBox}>
            <div ref={host} />
          </div>
        ) : (
          <button type="button" className={s.videoPlay} onClick={play} data-video-play>
            <span className={s.playTri} aria-hidden="true" />
            <span className="label">play</span>
          </button>
        )}
        <noscript>
          <a href={`https://www.youtube.com/watch?v=${videoId}`} rel="noopener">
            Watch on YouTube
          </a>
        </noscript>
      </div>
    );
  }

  return (
    <div
      ref={layer}
      className={s.videoLayer}
      data-video-state={state}
      data-video-muted={muted ? "true" : "false"}
      data-live={live && state !== "none" ? "true" : "false"}
    >
      <div className={s.videoScaled}>
        <div className={s.videoCover}>
          <div ref={host} />
        </div>
      </div>
      <button
        type="button"
        className={s.soundPill}
        data-sound-pill
        data-on={muted ? "false" : "true"}
        aria-pressed={!muted}
        onClick={toggle}
      >
        <span className={s.pillWord}>sound</span>
        <span className={s.pillTrack} aria-hidden="true">
          <span className={s.pillKnob} />
        </span>
      </button>
    </div>
  );
}
