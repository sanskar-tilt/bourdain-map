/**
 * Reels manifest. URLs stay as official embeds; local files play natively.
 * TikTok and YouTube Shorts only — Instagram is dropped.
 */

import fs from "node:fs";
import path from "node:path";
import { youtubeId } from "./youtube";

export type ReelPlatform = "tiktok" | "youtube" | "local";

export type ReelEntry = {
  id: string;
  platform: ReelPlatform;
  url?: string;
  videoId?: string;
  file?: string;
  photo?: string;
  poster?: string;
  caption?: string;
  credit?: string;
};

type Raw = {
  url?: unknown;
  platform?: unknown;
  caption?: unknown;
  line?: unknown;
  credit?: unknown;
  file?: unknown;
  photo?: unknown;
  poster?: unknown;
};

const TIKTOK = ["www.tiktok.com", "tiktok.com"];
const YOUTUBE = [
  "www.youtube.com", "youtube.com", "m.youtube.com",
  "youtu.be", "www.youtube-nocookie.com", "youtube-nocookie.com",
];

function parse(raw: Raw, i: number): ReelEntry | null {
  const file = typeof raw.file === "string" ? raw.file.trim() : "";
  const caption = typeof raw.caption === "string"
    ? raw.caption
    : typeof raw.line === "string" ? raw.line : undefined;
  const credit = typeof raw.credit === "string" ? raw.credit : undefined;
  const poster = typeof raw.poster === "string" ? raw.poster.trim() : undefined;

  if (file) {
    return {
      id: `local-${file}-${i}`,
      platform: "local",
      file,
      poster,
      caption,
      credit,
    };
  }

  if (typeof raw.url !== "string" || !raw.url.trim()) return null;
  let u: URL;
  try { u = new URL(raw.url); }
  catch { return null; }

  const host = u.hostname.replace(/^www\./, "");
  if (host === "instagram.com") return null;

  if (TIKTOK.includes(u.hostname) || TIKTOK.includes(host)) {
    const id = u.pathname.match(/\/video\/(\d+)/)?.[1];
    if (!id) return null;
    return {
      id: `tiktok-${id}-${i}`,
      platform: "tiktok",
      url: `https://www.tiktok.com${u.pathname}`,
      videoId: id,
      caption,
      credit,
    };
  }

  if (YOUTUBE.includes(u.hostname) || YOUTUBE.includes(host)) {
    const id = youtubeId(raw.url);
    if (!id) return null;
    return {
      id: `youtube-${id}-${i}`,
      platform: "youtube",
      url: `https://www.youtube.com/shorts/${id}`,
      videoId: id,
      caption,
      credit,
    };
  }

  return null;
}

export function reelEntries(): ReelEntry[] {
  const files = ["content/home.json", "content/reels.json"];
  const seen = new Set<string>();
  const local: ReelEntry[] = [];
  const remote: ReelEntry[] = [];
  files.forEach((rel) => {
    try {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), rel), "utf-8")
      ) as { reels?: Raw[] };
      (manifest.reels ?? []).forEach((raw, i) => {
        const e = parse(raw, i);
        if (!e) return;
        const key = e.file || e.videoId || e.url || e.id;
        if (seen.has(key)) return;
        seen.add(key);
        if (e.platform === "local") local.push(e);
        else remote.push(e);
      });
    } catch { /* optional */ }
  });
  return [...local, ...remote];
}
