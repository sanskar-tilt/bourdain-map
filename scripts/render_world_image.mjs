/**
 * Render the world scatter to a static PNG, once, at build time.
 *
 * The fluid hero reveals a map through the ink. That map must never be a live
 * canvas texture — it is one image, generated here from world.json (itself
 * exported from the database), so the hero costs one texture upload and zero
 * map work at runtime.
 *
 * Same equirectangular crop the trail uses: full longitude, latitudes 78 to
 * -56, which drops the empty poles and lets the pins fill the frame.
 *
 *   node scripts/render_world_image.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "public", "data", "world.json");
const OUT = path.join(ROOT, "public", "data", "world-map.png");

const W = 2400;
const H = 1200;
const LAT_N = 78;
const LAT_S = -56;

// Duplicated from tokens.css: sharp renders outside the CSS cascade.
const GROUND = "#E6E6E1";
const ACCENT = "#B8342A";

if (!fs.existsSync(SRC)) {
  console.error("world.json missing — run scripts/export_map_data.py first");
  process.exit(1);
}

const pts = JSON.parse(fs.readFileSync(SRC, "utf-8"));

const circles = pts
  .map(([lon, lat]) => {
    const x = ((lon + 180) / 360) * W;
    const y = ((LAT_N - lat) / (LAT_N - LAT_S)) * H;
    if (y < 0 || y > H) return "";
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.4" />`;
  })
  .join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${GROUND}"/>
  <g fill="${ACCENT}" fill-opacity="0.6">${circles}</g>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(OUT);

const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`world-map.png   ${pts.length} pins   ${W}x${H}   ${kb} KB`);
