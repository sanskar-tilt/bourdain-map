/** Build-time content for the homepage. Server components only. */

import fs from "node:fs";
import path from "node:path";
import type { PhotoMeta } from "./about";

export type HomePhoto = {
  photo?: string;
  alt?: string;
  credit?: string;
  quote?: string;
};

export type HomeManifest = {
  loader?: { flicker?: string[] };
  hero?: HomePhoto;
  pairing?: HomePhoto;
  video?: { url?: string; title?: string; source?: string };
  colophon?: { copyright?: string };
};

function readJson<T>(p: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(p, "utf-8")) as T; }
  catch { return fallback; }
}

export const homeManifest = () =>
  readJson<HomeManifest>(path.join(process.cwd(), "content", "home.json"), {});

export const homePhotos = () =>
  readJson<Record<string, PhotoMeta>>(
    path.join(process.cwd(), "content", "home.generated.json"), {});

/** Every credit line on the page, for the colophon. */
export function allCredits(m: HomeManifest): { photo: string; credit: string }[] {
  const out: { photo: string; credit: string }[] = [];
  for (const node of [m.hero, m.pairing]) {
    if (node?.photo && node.credit?.trim()) {
      out.push({ photo: node.photo, credit: node.credit.trim() });
    }
  }
  return out;
}
