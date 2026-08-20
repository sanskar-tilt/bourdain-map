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

export type LoaderEntry = { photo?: string; alt?: string; credit?: string };

export type HomeManifest = {
  loader?: { objects?: LoaderEntry[]; portrait?: LoaderEntry };
  /** Pools — one is chosen at random per visit, so no two loads match. */
  hero?: { photos?: (HomePhoto & { placeSlug?: string })[]; quotes?: string[] };
  /** The pull-back set-piece: a YouTube video (official uploads only) in the
   *  shrinking frame, a full-bleed photograph of the room behind it. */
  pullback?: {
    videoId?: string;
    start?: number;
    /** True for Shorts and other 9:16 video — the frame becomes a
     *  full-height vertical panel instead of a 16:9 cover crop. */
    vertical?: boolean;
    background?: HomePhoto;
  };
  pairing?: { photos?: HomePhoto[]; quotes?: string[] };
  video?: { url?: string; title?: string; source?: string };
  colophon?: { copyright?: string };
};

/** Deterministic per render, random per visit. */
export const pick = <T,>(pool: T[] | undefined): T | undefined =>
  pool && pool.length ? pool[Math.floor(Math.random() * pool.length)] : undefined;

function readJson<T>(p: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(p, "utf-8")) as T; }
  catch { return fallback; }
}

export const homeManifest = () =>
  readJson<HomeManifest>(path.join(process.cwd(), "content", "home.json"), {});

export const homePhotos = () =>
  readJson<Record<string, PhotoMeta>>(
    path.join(process.cwd(), "content", "home.generated.json"), {});

/** Every credit line the manifest carries, for the colophon. Everything that
 *  ships gets credited, whether or not this visit happened to show it. */
export function allCredits(m: HomeManifest): { photo: string; credit: string }[] {
  const out: { photo: string; credit: string }[] = [];
  const add = (e?: { photo?: string; credit?: string }) => {
    if (e?.photo && e.credit?.trim()) out.push({ photo: e.photo, credit: e.credit.trim() });
  };
  (m.loader?.objects ?? []).forEach(add);
  add(m.loader?.portrait);
  (m.hero?.photos ?? []).forEach(add);
  add(m.pullback?.background);
  (m.pairing?.photos ?? []).forEach(add);
  return out.filter((c, i, a) => a.findIndex((x) => x.photo === c.photo) === i);
}
