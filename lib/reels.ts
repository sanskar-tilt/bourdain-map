/**
 * Reels manifest. URLs stay as official embeds; local files play natively.
 * The player shell is ours — this file only parses the list.
 */

import fs from "node:fs";
import path from "node:path";

export type ReelPlatform = "instagram" | "tiktok" | "local";

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

const HOSTS: Record<"instagram" | "tiktok", string[]> = {
  instagram: ["www.instagram.com", "instagram.com"],
  tiktok: ["www.tiktok.com", "tiktok.com"],
};

function parse(raw: Raw, i: number): ReelEntry | null {
  const file = typeof raw.file === "string" ? raw.file.trim() : "";
  const photo = typeof raw.photo === "string" ? raw.photo.trim() : "";
  const caption = typeof raw.caption === "string"
    ? raw.caption
    : typeof raw.line === "string" ? raw.line : undefined;
  const credit = typeof raw.credit === "string" ? raw.credit : undefined;
  const poster = typeof raw.poster === "string" ? raw.poster.trim() : undefined;

  if (file || photo) {
    return {
      id: `local-${file || photo}-${i}`,
      platform: "local",
      file: file || undefined,
      photo: photo || undefined,
      poster,
      caption,
      credit,
    };
  }

  if (typeof raw.url !== "string" || !raw.url.trim()) return null;
  let u: URL;
  try { u = new URL(raw.url); }
  catch { return null; }

  const fromHost = (Object.keys(HOSTS) as Array<"instagram" | "tiktok">).find((p) =>
    HOSTS[p].includes(u.hostname)
  );
  if (!fromHost) return null;

  const entry: ReelEntry = {
    id: `${fromHost}-${u.pathname}-${i}`,
    platform: fromHost,
    url: `https://${u.hostname}${u.pathname}`,
    caption,
    credit,
  };
  if (fromHost === "tiktok") {
    const id = u.pathname.match(/\/video\/(\d+)/)?.[1];
    if (!id) return null;
    entry.videoId = id;
  }
  return entry;
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
        const key = e.file || e.photo || e.url || e.id;
        if (seen.has(key)) return;
        seen.add(key);
        if (e.platform === "local") local.push(e);
        else remote.push(e);
      });
    } catch { /* optional */ }
  });
  // The snap deck is ours. Outbound embeds stay off it when we have film.
  return local.length ? local : remote;
}
