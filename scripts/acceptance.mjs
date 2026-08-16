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
  // A static pre-state also has a non-zero transform, so "non-zero" is not
  // evidence of motion. Require the value to be *changing* between frames
  // while the curtain is mid-travel.
  let overlap = null;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], c = samples[i];
    if (!c.curtainPresent || ty(c.curtainT) >= -1) continue;
    if (!c.textT || c.textT === "none") continue;
    if (ty(a.textT) === ty(c.textT)) continue;   // not moving
    overlap = c;
    break;
  }

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
/* Masked lines must arrive. Measuring mid-transition proves only that a
   transform exists; the end state is the thing that matters, and a line
   stuck at translateY(100%) inside overflow:hidden is invisible. */
{
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(`${BASE}/?loader=off`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 2500));
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((r) => setTimeout(r, 2000));

  const lines = await p.evaluate(() =>
    [...document.querySelectorAll('[class*="lineMask"] > span')]
      .map((el) => getComputedStyle(el).transform)
  );
  const unsettled = lines.filter((t) => t !== "none");
  ok("every masked line has settled to transform:none",
     lines.length > 0 && unsettled.length === 0,
     `${lines.length} lines, ${unsettled.length} stuck${unsettled.length ? " — " + unsettled[0] : ""}`);
  await p.close();
}

/* ------------------------------------------------------------------ 5 */
/* Nothing ships hidden. After a full scroll, anything rendered and visible
   must have settled — no orphaned pre-animation states. */
{
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900 });

  for (const route of ["/?loader=off", "/about/", "/tables/"]) {
    await p.goto(`${BASE}${route}`, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 2200));
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((r) => setTimeout(r, 2200));

    const bad = await p.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;      // not rendered
        // Scroll-linked transforms are state, not a failed entrance.
        if (el.closest("[data-pin]")) continue;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        if (parseFloat(cs.opacity) < 0.01) {
          out.push(`opacity 0: ${el.tagName.toLowerCase()}.${el.className}`.slice(0, 90));
        }
      }
      return out.slice(0, 4);
    });

    ok(`nothing hidden after settle on ${route}`, bad.length === 0,
       bad.join(" | ") || "clean");
  }
  await p.close();
}

/* ------------------------------------------------------------------ 6 */
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
  await p.close();
}

/* ------------------------------------------------------------------ */
/* The pull-back is gone. Nothing may still write --p or carry data-pin
   until the trail set-piece reintroduces exactly one pin, deliberately. */
{
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(`${BASE}/?loader=off`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  await p.evaluate(() => window.scrollTo(0, 600));
  await new Promise((r) => setTimeout(r, 600));
  const left = await p.evaluate(() => ({
    pins: document.querySelectorAll("[data-pin]").length,
    withP: [...document.querySelectorAll("body *")].filter(
      (el) => el.style.getPropertyValue("--p") !== ""
    ).length,
  }));
  ok("no pull-back remnants: zero [data-pin], zero inline --p",
     left.pins === 0 && left.withP === 0, JSON.stringify(left));
  await p.close();
}

/* ==================================================================
   WIRING PROOFS

   One observable per shipped pass — the single thing the browser can
   measure that is true only if that code actually runs. Reading the
   source proved nothing twice this session; these are what replace it.
   ================================================================== */
{
  const p = await browser.newPage();
  await p.setViewport({ width: 1440, height: 900 });

  /* -- Lenis: the page keeps moving after the wheel event ends. ------ */
  await p.goto(`${BASE}/?loader=off`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  await p.mouse.move(700, 500);
  await p.mouse.wheel({ deltaY: 900 });
  await new Promise((r) => setTimeout(r, 80));
  const early = await p.evaluate(() => window.scrollY);
  await new Promise((r) => setTimeout(r, 700));
  const late = await p.evaluate(() => window.scrollY);
  ok("Lenis: page coasts after the wheel stops",
     late - early > 50, `${Math.round(early)}px → ${Math.round(late)}px`);

  /* -- MaskedText: line wrappers exist that no server HTML contained. */
  const built = await p.evaluate(() =>
    document.querySelectorAll('[class*="lineMask"]').length);
  ok("MaskedText: splitter built line wrappers at runtime", built > 0, `${built}`);

  await p.close();

  /* -- Loader: the count strictly increases. ------------------------- */
  const q = await browser.newPage();
  await q.setViewport({ width: 1440, height: 900 });
  await q.goto(`${BASE}/?loader=1`, { waitUntil: "domcontentloaded" });
  const seen = [];
  for (let i = 0; i < 20; i++) {
    const v = await q.evaluate(() => {
      const el = document.querySelector("[data-loader-count]");
      return el ? Number(el.textContent.replace(/[^0-9]/g, "")) : null;
    });
    if (v !== null) seen.push(v);
    await new Promise((r) => setTimeout(r, 120));
  }
  const rising = seen.length > 3 && seen[seen.length - 1] > seen[0];
  ok("Loader: the count climbs", rising,
     seen.length ? `${seen[0]} → ${seen[seen.length - 1]} over ${seen.length} samples` : "never rendered");

  /* -- Arrival: <html data-opening> advances past its pre-state. ----- */
  const phases = new Set();
  for (let i = 0; i < 70; i++) {
    phases.add(await q.evaluate(() => document.documentElement.dataset.opening ?? "(unset)"));
    await new Promise((r) => setTimeout(r, 120));
  }
  ok("Arrival: the timeline leaves its pre-state",
     phases.has("curtain") && phases.has("done"), [...phases].join(" "));
  await q.close();
}

await browser.close();
console.log(failures ? `\n${failures} failing` : "\nall acceptance checks pass");
process.exit(failures ? 1 : 0);
