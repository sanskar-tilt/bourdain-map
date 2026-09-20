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
  const caption = typeof raw.caption === "string" ? raw.caption : undefined;
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
  let raw: Raw[] = [];
  try {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "content", "reels.json"), "utf-8")
    ) as { reels?: Raw[] };
    raw = manifest.reels ?? [];
  } catch {
    raw = [];
  }
  return raw.map(parse).filter((e): e is ReelEntry => e !== null);
}
