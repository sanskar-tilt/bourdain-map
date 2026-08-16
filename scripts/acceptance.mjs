/**
 * Acceptance checks. Assertions, not screenshots.
 *
 * Uses puppeteer-core against the installed Chrome rather than Playwright —
 * same assertions, one fewer browser download. Run against a built site:
 *
 *   npm run build && python3 scripts/gzserve.py &
 *   node scripts/acceptance.mjs
 *
 * Exits non-zero on failure so it can gate a commit.
 */

import fs from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] ?? "http://127.0.0.1:8900";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const stats = JSON.parse(fs.readFileSync("content/stats.generated.json", "utf-8"));
let failures = 0;

const ok = (name, pass, detail = "") => {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!pass) failures++;
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});

/* ------------------------------------------------------------------ 1 */
/* The underline must leave by the right, not retreat to where it came
   from. Sampling background-position 200ms after mouseleave is the whole
   test: a reversal keeps it pinned at 0%. */
{
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(`${BASE}/city/new-orleans-us/`, { waitUntil: "networkidle0" });
  await p.waitForSelector("a");

  // A link away from the corners, so moving the pointer to the far side of
  // the viewport genuinely leaves it. Hovering the wordmark at 0,0 and then
  // "moving away" to 5,5 does not leave it, which is a test bug that looks
  // exactly like a product bug.
  const all = await p.$$("a");
  let link = null, box = null;
  for (const a of all) {
    const b0 = await a.boundingBox();
    if (!b0 || b0.width < 20 || b0.height < 8) continue;
    // Must be scrolled into view before hovering: a boundingBox below the
    // fold is a real coordinate the pointer can never reach.
    await a.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await new Promise((r) => setTimeout(r, 250));
    const b = await a.boundingBox();
    if (b && b.y > 160 && b.y < 700) { link = a; box = b; break; }
  }
  if (!link) throw new Error("no suitably-placed link to test");
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  await new Promise((r) => setTimeout(r, 600));           // let it wipe in

  const during = await p.evaluate((el) => ({
    pos: getComputedStyle(el).backgroundPositionX,
    size: getComputedStyle(el).backgroundSize,
  }), link);

  // move the pointer away
  // Must stay inside the viewport: moving the pointer to an off-screen
  // coordinate fires no mouseout at all, which looks identical to a broken
  // handler.
  await p.mouse.move(20, 860, { steps: 8 });
  await new Promise((r) => setTimeout(r, 200));

  const after = await p.evaluate((el) => ({
    cls: el.className,
    pos: getComputedStyle(el).backgroundPositionX,
    size: getComputedStyle(el).backgroundSize,
  }), link);

  const pct = parseFloat(after.pos);
  ok("underline background-position > 0% (leaves right, does not reverse)",
     Number.isFinite(pct) && pct > 0,
     `hover ${during.pos} / ${during.size} → 200ms after ${after.pos} / ${after.size}`);

  await p.close();
}

/* ------------------------------------------------------------------ 2 */
/* The loader resolves: the count lands on the real total, the cycling
   stops, and the final frame holds. */
{
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  const frames = [];
  await p.goto(`${BASE}/?loader=hold`, { waitUntil: "domcontentloaded" });

  const t0 = Date.now();
  while (Date.now() - t0 < 9000) {
    const snap = await p.evaluate(() => {
      const el = document.querySelector("[data-loader-count]");
      const img = document.querySelector("[data-loader-object]");
      return el
        ? {
            n: el.textContent.trim(),
            src: img?.getAttribute("src") ?? null,
            final: img?.getAttribute("data-final") === "true",
          }
        : null;
    });
    if (snap) frames.push({ t: Date.now() - t0, ...snap });
    else if (frames.length) break;
    await new Promise((r) => setTimeout(r, 100));
  }

  if (!frames.length) {
    ok("loader rendered", false, "no [data-loader-count] seen");
  } else {
    const last = frames[frames.length - 1];
    const digits = (s) => Number(String(s).replace(/[^0-9]/g, ""));
    ok("counter's last value === SITE_STATS.places",
       digits(last.n) === stats.places, `${last.n} vs ${stats.places}`);

    const finals = frames.filter((f) => f.final);
    const held = finals.length ? finals[finals.length - 1].t - finals[0].t : 0;
    ok("final frame is the marked final image", finals.length > 0,
       `${finals.length} frames`);
    ok("final frame holds ≥ 800ms", held >= 800, `${held}ms`);
  }
  await p.close();
}

/* ------------------------------------------------------------------ 3 */
/* The overlap. The hero must begin while the curtain is still travelling —
   a gap between them reads as two events. Proving it means catching one
   frame where the curtain is mid-move AND the hero text is mid-rise. */
{
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(`${BASE}/?loader=1`, { waitUntil: "domcontentloaded" });

  const samples = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 9000) {
    samples.push(await p.evaluate(() => {
      const curtain = document.querySelector('[data-phase]');
      const inner = document.querySelector('[data-arrival-text] span > span');
      const cs = curtain ? getComputedStyle(curtain) : null;
      return {
        phase: document.documentElement.dataset.opening ?? null,
        curtainPresent: Boolean(curtain),
        curtainT: cs ? cs.transform : null,
        textT: inner ? getComputedStyle(inner).transform : null,
      };
    }));
    await new Promise((r) => setTimeout(r, 60));
  }

  // Curtain is "still moving" when it exists and is partly translated:
  // not at its resting place (identity) and not fully gone.
  const ty = (m) => {
    if (!m || m === "none") return 0;
    const n = m.match(/matrix\(([^)]+)\)/);
    return n ? parseFloat(n[1].split(",")[5]) : 0;
  };
  const overlap = samples.find(
    (x) => x.curtainPresent && ty(x.curtainT) < -1 && x.textT && x.textT !== "none" && ty(x.textT) !== 0
  );

  ok("hero text is mid-rise while the curtain is still moving",
     Boolean(overlap),
     overlap
       ? `curtain y=${ty(overlap.curtainT).toFixed(0)}px, text y=${ty(overlap.textT).toFixed(1)}px`
       : "no frame had both in motion");

  const phases = [...new Set(samples.map((x) => x.phase))].filter(Boolean);
  ok("timeline advances through its phases", phases.length >= 4, phases.join(" → "));
  await p.close();
}

/* ------------------------------------------------------------------ 4 */
/* Reduced motion: no loader at all, and the pin does not engage. */
{
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  await p.goto(`${BASE}/?loader=hold`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1500));
  const loader = await p.$("[data-loader-count]");
  ok("reduced motion renders no loader", loader === null);

  const p0 = await p.evaluate(() => {
    const el = document.querySelector("[data-pin]");
    return el ? getComputedStyle(el).getPropertyValue("--p").trim() : "none";
  });
  await p.evaluate(() => window.scrollTo(0, window.innerHeight));
  await new Promise((r) => setTimeout(r, 500));
  const p1 = await p.evaluate(() => {
    const el = document.querySelector("[data-pin]");
    return el ? getComputedStyle(el).getPropertyValue("--p").trim() : "none";
  });
  ok("reduced motion does not drive the pin", p0 === p1, `${p0} → ${p1}`);
  await p.close();
}

await browser.close();
console.log(failures ? `\n${failures} failing` : "\nall acceptance checks pass");
process.exit(failures ? 1 : 0);
