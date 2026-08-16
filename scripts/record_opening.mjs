/**
 * Record the first 7 seconds of the opening to notes/refs/home/opening.webm.
 *
 * Also samples every 100ms and reports the longest stretch in which nothing
 * changed, so "there is no dead moment except the deliberate hold" is a
 * measurement rather than an impression.
 */
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] ?? "http://127.0.0.1:8900";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "notes/refs/home";
fs.mkdirSync(OUT, { recursive: true });

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--window-size=1440,900"],
});
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });

await p.goto(`${BASE}/?loader=1`, { waitUntil: "domcontentloaded" });

const rec = await p.screencast({ path: `${OUT}/opening.webm`, fps: 60 });

// What is moving, sampled while it records.
const samples = [];
const t0 = Date.now();
while (Date.now() - t0 < 7000) {
  samples.push({
    t: Date.now() - t0,
    ...(await p.evaluate(() => {
      const count = document.querySelector("[data-loader-count]");
      const obj = document.querySelector("[data-loader-object]");
      const curtain = document.querySelector("[data-phase]");
      const line = document.querySelector("[data-arrival-text] span > span");
      const photo = document.querySelector(".arrival-photo");
      return {
        n: count?.textContent?.trim() ?? null,
        src: obj?.getAttribute("src") ?? obj?.className ?? null,
        curtain: curtain ? getComputedStyle(curtain).transform : null,
        line: line ? getComputedStyle(line).transform : null,
        photo: photo ? getComputedStyle(photo).transform + getComputedStyle(photo).opacity : null,
      };
    })),
  });
  await new Promise((r) => setTimeout(r, 100));
}
await rec.stop();

// Longest run of identical frames.
let worst = { ms: 0, at: 0, what: "" };
let runStart = 0;
for (let i = 1; i < samples.length; i++) {
  const a = JSON.stringify({ ...samples[i - 1], t: 0 });
  const c = JSON.stringify({ ...samples[i], t: 0 });
  if (a === c) continue;
  const ms = samples[i].t - samples[runStart].t;
  if (ms > worst.ms) worst = { ms, at: samples[runStart].t, what: samples[runStart].n ?? "" };
  runStart = i;
}
const size = fs.statSync(`${OUT}/opening.webm`).size;
console.log(`recorded ${OUT}/opening.webm  ${(size / 1024).toFixed(0)} KB`);
console.log(`longest still stretch: ${worst.ms}ms starting at ${worst.at}ms (count "${worst.what}")`);
console.log(worst.ms <= 1400
  ? "  within the deliberate hold on his photograph"
  : "  LONGER than the hold — there is a dead moment");
await b.close();
