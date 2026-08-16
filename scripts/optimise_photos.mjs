/**
 * Resize the About page's photos at build time.
 *
 * The site is a static export with no image service, so optimisation has to
 * happen here rather than on request. Every photo referenced in
 * content/about.json is emitted at two widths as WebP, and its intrinsic
 * dimensions are recorded so the page can reserve the right space and never
 * shift as images load.
 *
 * Safe to run with no photos: it reports what's missing and exits 0, because
 * a half-filled About page should still build.
 *
 *   node scripts/optimise_photos.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "public", "about");
const OUT = path.join(SRC, "opt");
const MANIFEST = path.join(ROOT, "content", "about.json");
const GENERATED = path.join(ROOT, "content", "about.generated.json");

const WIDTHS = [800, 1600];
const QUALITY = 78;

if (!fs.existsSync(MANIFEST)) {
  console.log("content/about.json not found — nothing to do.");
  process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf-8"));

/** Every photo filename the manifest points at, deduplicated. */
const wanted = [
  manifest.intro?.photo,
  manifest.tattoo?.photo,
  ...(manifest.places ?? []).map((p) => p?.photo),
].filter((f) => typeof f === "string" && f.trim().length > 0);

fs.mkdirSync(OUT, { recursive: true });

const generated = {};
const missing = [];
let built = 0;

for (const file of [...new Set(wanted)]) {
  const from = path.join(SRC, file);
  if (!fs.existsSync(from)) {
    missing.push(file);
    continue;
  }

  const base = path.parse(file).name.replace(/[^a-zA-Z0-9-_]/g, "-");
  const image = sharp(from, { failOn: "none" }).rotate(); // honour EXIF orientation
  const meta = await image.metadata();

  const srcset = [];
  for (const w of WIDTHS) {
    // Never upscale: a 900px original gets one 800px rendition, not a fake
    // 1600px one.
    if (meta.width && meta.width < w && srcset.length > 0) continue;
    const target = meta.width ? Math.min(w, meta.width) : w;
    const outName = `${base}-${target}.webp`;
    const to = path.join(OUT, outName);
    await sharp(from, { failOn: "none" })
      .rotate()
      .resize({ width: target, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(to);
    srcset.push({ width: target, src: `/about/opt/${outName}` });
    built++;
  }

  generated[file] = {
    width: meta.width ?? null,
    height: meta.height ?? null,
    // Aspect ratio is what the page actually needs to reserve space.
    ratio: meta.width && meta.height ? +(meta.width / meta.height).toFixed(4) : null,
    srcset,
  };
}

fs.writeFileSync(GENERATED, JSON.stringify(generated, null, 1) + "\n");

console.log(`about photos: ${Object.keys(generated).length} processed, ${built} renditions`);
if (missing.length) {
  console.log(
    `  referenced but not found in public/about/: ${missing.join(", ")}\n` +
    "  (the page will show a placeholder for these)"
  );
}
if (!wanted.length) {
  console.log("  no photos referenced yet — edit content/about.json");
}
