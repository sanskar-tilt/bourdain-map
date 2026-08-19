/**
 * The Reels page's content. Build-time only — the server component reads
 * content/reels.json during the static export and bakes the list into HTML.
 *
 * The manifest is hand-edited: paste a reel URL in, rebuild, done. Entries
 * that can't be embedded (wrong host, short link, no video id) are skipped
 * with a build warning rather than shipped as a broken frame.
 */

import fs from "node:fs";
import path from "node:path";

export type ReelPlatform = "instagram" | "tiktok";

export type ReelEntry = {
  url: string;
  platform: ReelPlatform;
  caption?: string;
  added?: string;
  /** TikTok only — the numeric id embed.js needs, parsed from the URL. */
  videoId?: string;
};

type RawEntry = {
  url?: unknown;
  platform?: unknown;
  caption?: unknown;
  added?: unknown;
};

type Manifest = { _readme?: string[]; reels?: RawEntry[] };

/* The blockquote markup puts these URLs straight into the page, so only the
   two platforms' canonical hosts are ever accepted. Short links (vm.tiktok.com,
   instagr.am) redirect server-side, which a static page can't follow — the
   warning tells the editor to paste the resolved URL instead. */
const HOSTS: Record<ReelPlatform, string[]> = {
  instagram: ["www.instagram.com", "instagram.com"],
  tiktok: ["www.tiktok.com", "tiktok.com"],
};

function parseEntry(raw: RawEntry, i: number): ReelEntry | null {
  const where = `[reels] content/reels.json entry ${i + 1}`;
  if (typeof raw?.url !== "string" || !raw.url.trim()) {
    console.warn(`${where}: no url — skipped.`);
    return null;
  }
  let u: URL;
  try {
    u = new URL(raw.url);
  } catch {
    console.warn(`${where}: "${raw.url}" is not a URL — skipped.`);
    return null;
  }

  // Platform comes from the manifest but the URL has the final say: an
  // instagram.com URL marked "tiktok" would inject the wrong markup.
  const fromHost = (Object.keys(HOSTS) as ReelPlatform[]).find((p) =>
    HOSTS[p].includes(u.hostname)
  );
  if (!fromHost) {
    console.warn(
      `${where}: host "${u.hostname}" isn't instagram.com or tiktok.com — ` +
        `skipped. Short links (vm.tiktok.com) need the full URL they resolve to.`
    );
    return null;
  }
  if (typeof raw.platform === "string" && raw.platform !== fromHost) {
    console.warn(
      `${where}: platform says "${raw.platform}" but the URL is ${fromHost} — ` +
        `going with the URL.`
    );
  }

  const entry: ReelEntry = {
    // https only, and no query string or fragment — the path is the identity.
    url: `https://${u.hostname}${u.pathname}`,
    platform: fromHost,
    caption: typeof raw.caption === "string" ? raw.caption : undefined,
    added: typeof raw.added === "string" ? raw.added : undefined,
  };

  if (fromHost === "tiktok") {
    const id = u.pathname.match(/\/video\/(\d+)/)?.[1];
    if (!id) {
      console.warn(
        `${where}: TikTok URL has no /video/<id> — skipped. ` +
          `Expected https://www.tiktok.com/@user/video/1234567890.`
      );
      return null;
    }
    entry.videoId = id;
  }
  return entry;
}

export function reelEntries(): ReelEntry[] {
  let manifest: Manifest;
  try {
    manifest = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "content", "reels.json"), "utf-8")
    ) as Manifest;
  } catch {
    return [];
  }
  if (!Array.isArray(manifest.reels)) return [];
  return manifest.reels
    .map((raw, i) => parseEntry(raw, i))
    .filter((e): e is ReelEntry => e !== null);
}
