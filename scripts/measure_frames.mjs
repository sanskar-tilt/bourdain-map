/**
 * Frame timings under a scripted pan/zoom, in headless Chrome.
 *
 * "60fps" is a claim, not a vibe, so this drives the real map with all pins
 * loaded and counts the frames the compositor actually produced. It reports
 * the p50 and p95 frame interval and the count of frames that took longer
 * than 16.7ms, which is the number that decides whether panning feels good.
 *
 * Desktop Chrome only. Mobile Safari has a different compositor and cannot be
 * measured from here — that one needs a device.
 *
 *   node scripts/measure_frames.mjs [url]
 */

import puppeteer from "puppeteer-core";

const URL_ = process.argv[2] ?? "http://127.0.0.1:8900/";
const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--enable-gpu", "--window-size=1440,900"],
  defaultViewport: { width: 1440, height: 900 },
});

const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(URL_, { waitUntil: "networkidle0", timeout: 60000 });

// Wait until the MAP has the pins, not until a label says so. The label is
// written from our own fetch and was happily reporting 2,095 while the map
// source held zero features -- which made an earlier version of this script
// measure an empty map at a confident 60fps.
const pins = await page.waitForFunction(
  () => {
    const m = window.__map;
    if (!m || !m.getSource("places") || !m.isSourceLoaded("places")) return false;
    const n = m.querySourceFeatures("places").length;
    return n > 0 ? n : false;
  },
  { timeout: 60000, polling: 250 }
).then((h) => h.jsonValue());

const rendered = await page.evaluate(() =>
  window.__map.queryRenderedFeatures({ layers: ["clusters", "pins"] }).length
);
if (!rendered) throw new Error("nothing is rendered on screen - refusing to report a frame rate");

// Record frame intervals while the map is driven through a pan and a zoom.
const result = await page.evaluate(async () => {
  const frames = [];
  let last = performance.now();
  let running = true;
  (function tick() {
    const now = performance.now();
    frames.push(now - last);
    last = now;
    if (running) requestAnimationFrame(tick);
  })();

  const canvas = document.querySelector("canvas");
  const rect = canvas.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  function drag(fromX, fromY, dx, dy, steps) {
    const opts = { bubbles: true, cancelable: true, pointerType: "mouse", isPrimary: true };
    canvas.dispatchEvent(new PointerEvent("pointerdown", { ...opts, clientX: fromX, clientY: fromY, button: 0 }));
    return new Promise((res) => {
      let i = 0;
      (function step() {
        i++;
        canvas.dispatchEvent(new PointerEvent("pointermove", {
          ...opts, clientX: fromX + (dx * i) / steps, clientY: fromY + (dy * i) / steps,
        }));
        if (i < steps) requestAnimationFrame(step);
        else {
          canvas.dispatchEvent(new PointerEvent("pointerup", { ...opts, clientX: fromX + dx, clientY: fromY + dy, button: 0 }));
          res();
        }
      })();
    });
  }

  function wheelZoom(times, deltaY) {
    return new Promise((res) => {
      let i = 0;
      (function step() {
        canvas.dispatchEvent(new WheelEvent("wheel", {
          bubbles: true, cancelable: true, clientX: cx, clientY: cy, deltaY,
        }));
        if (++i < times) requestAnimationFrame(step);
        else res();
      })();
    });
  }

  const settle = (ms) => new Promise((r) => setTimeout(r, ms));

  await settle(300);
  frames.length = 0;                       // discard warm-up

  await drag(cx, cy, -420, 160, 60);       // pan across a dense region
  await settle(200);
  await wheelZoom(40, -120);               // zoom in through the cluster break
  await settle(400);
  await drag(cx, cy, 300, -120, 60);       // pan again, unclustered
  await settle(200);
  await wheelZoom(30, 120);                // back out
  await settle(400);

  running = false;

  const f = frames.filter((x) => x > 0).sort((a, b) => a - b);
  const q = (p) => f[Math.min(f.length - 1, Math.floor(f.length * p))];
  return {
    frames: f.length,
    p50: +q(0.5).toFixed(2),
    p95: +q(0.95).toFixed(2),
    worst: +f[f.length - 1].toFixed(2),
    over16: f.filter((x) => x > 16.7).length,
    over33: f.filter((x) => x > 33).length,
  };
});

const pct = (n) => ((n / result.frames) * 100).toFixed(1);
console.log(`source features        ${pins}`);
console.log(`rendered on screen     ${rendered}`);
console.log(`frames sampled         ${result.frames}`);
console.log(`frame interval p50     ${result.p50} ms   (${(1000 / result.p50).toFixed(0)} fps)`);
console.log(`frame interval p95     ${result.p95} ms   (${(1000 / result.p95).toFixed(0)} fps)`);
console.log(`worst frame            ${result.worst} ms`);
console.log(`frames over 16.7ms     ${result.over16}  (${pct(result.over16)}%)`);
console.log(`frames over 33ms       ${result.over33}  (${pct(result.over33)}%)`);
if (errors.length) {
  console.log(`\nconsole errors (${errors.length}):`);
  errors.slice(0, 5).forEach((e) => console.log("  " + e.slice(0, 160)));
}

await browser.close();
