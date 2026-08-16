/**
 * Photo helpers with no filesystem access, so client components can use them.
 *
 * lib/about.ts and lib/home.ts read manifests with node:fs and are therefore
 * server-only. Anything a "use client" component needs has to live here or it
 * drags fs into the browser bundle — which fails the build rather than
 * shipping, at least.
 */

export type Rendition = { width: number; src: string };
export type PhotoMeta = {
  width: number | null;
  height: number | null;
  ratio: number | null;
  srcset: Rendition[];
};

/** A photo is only usable if it was found on disk and actually resized. */
export function usable(meta: PhotoMeta | undefined): meta is PhotoMeta {
  return Boolean(meta && meta.srcset && meta.srcset.length > 0);
}

export const srcsetAttr = (meta: PhotoMeta): string =>
  meta.srcset.map((r) => `${r.src} ${r.width}w`).join(", ");

/** Largest rendition, used as the plain src fallback. */
export const largest = (meta: PhotoMeta): string =>
  meta.srcset[meta.srcset.length - 1].src;
