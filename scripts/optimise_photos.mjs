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
/* Two manifests, one pipeline. Each writes its renditions into its own
   opt/ folder and its own generated.json. */
const SETS = [
  { dir: "about", manifest: "about.json", generated: "about.generated.json" },
  { dir: "home",  manifest: "home.json",  generated: "home.generated.json"  },
];

const WIDTHS = [800, 1600];
const QUALITY = 78;

/** Pull every photo filename out of a manifest, whatever its shape. */
function photosIn(node, acc = [], credits = []) {
  if (!node || typeof node !== "object") return { acc, credits };
  if (Array.isArray(node)) {
    node.forEach((n) => photosIn(n, acc, credits));
    return { acc, credits };
  }
  if (typeof node.photo === "string" && node.photo.trim()) {
    acc.push(node.photo.trim());
    if (!node.credit || !String(node.credit).trim()) credits.push(node.photo.trim());
  }
  Object.values(node).forEach((v) => {
    if (v && typeof v === "object") photosIn(v, acc, credits);
  });
  return { acc, credits };
}

for (const set of SETS) {
  await run(set);
}

async function run(set) {
const SRC = path.join(ROOT, "public", set.dir);
const OUT = path.join(SRC, "opt");
const MANIFEST = path.join(ROOT, "content", set.manifest);
const GENERATED = path.join(ROOT, "content", set.generated);

if (!fs.existsSync(MANIFEST)) {
  console.log(`content/${set.manifest} not found — skipping.`);
  return;
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf-8"));
const { acc: wanted, credits: uncredited } = photosIn(manifest);

fs.mkdirSync(SRC, { recursive: true });
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

console.log(`${set.dir} photos: ${Object.keys(generated).length} processed, ${built} renditions`);
if (missing.length) {
  console.log(
    `  referenced but not found in public/${set.dir}/: ${missing.join(", ")}\n` +
    "  (the page will show a placeholder for these)"
  );
}
if (uncredited.length) {
  // Shipping someone's photograph uncredited is the one thing this project
  // cannot do, so it is a loud warning rather than a silent omission.
  console.log(`  !! NO CREDIT SET for: ${uncredited.join(", ")}`);
}
if (!wanted.length) {
  console.log(`  no photos referenced yet — edit content/${set.manifest}`);
}
}
