/**
 * The About page's content. Build-time only — server components read this
 * during the static export and bake the result into HTML.
 *
 * content/about.json is hand-edited; content/about.generated.json is written
 * by scripts/optimise_photos.mjs and holds each photo's renditions and
 * intrinsic size.
 */

import fs from "node:fs";
import path from "node:path";

export type Rendition = { width: number; src: string };
export type PhotoMeta = {
  width: number | null;
  height: number | null;
  ratio: number | null;
  srcset: Rendition[];
};

export type AboutManifest = {
  intro?: { photo?: string; alt?: string; text?: string };
  places?: { photo?: string; alt?: string; caption?: string; placeSlug?: string }[];
  tattoo?: { photo?: string; alt?: string; caption?: string };
  essay?: { paragraphs?: string[] };
};

function readJson<T>(p: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function aboutManifest(): AboutManifest {
  return readJson<AboutManifest>(
    path.join(process.cwd(), "content", "about.json"),
    {}
  );
}

export function photoMeta(): Record<string, PhotoMeta> {
  return readJson<Record<string, PhotoMeta>>(
    path.join(process.cwd(), "content", "about.generated.json"),
    {}
  );
}

/** A photo is only usable if it was found on disk and actually resized. */
export function usable(meta: PhotoMeta | undefined): meta is PhotoMeta {
  return Boolean(meta && meta.srcset && meta.srcset.length > 0);
}

export function srcsetAttr(meta: PhotoMeta): string {
  return meta.srcset.map((r) => `${r.src} ${r.width}w`).join(", ");
}

/** Largest rendition, used as the plain src fallback. */
export function largest(meta: PhotoMeta): string {
  return meta.srcset[meta.srcset.length - 1].src;
}
