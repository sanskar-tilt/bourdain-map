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

export type { Rendition, PhotoMeta } from "./photo";
export { usable, srcsetAttr, largest } from "./photo";
import type { PhotoMeta } from "./photo";

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

