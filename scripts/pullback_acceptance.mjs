/**
 * Acceptance for the pull-back's video. Two builds:
 *
 *   1. the real manifest (videoId empty) — builds, frame is the marked gap
 *   2. a fixture with a known official upload (CNN's Parts Unknown trailer,
 *      hF2V-5lBWoo, verified via YouTube oEmbed) — never shipped:
 *        - mid-pin: playing AND muted, muted asserted via the player's own
 *          isMuted(), not our mirror of it
 *        - SOUND pill toggles unMute/mute, isMuted() asserted both ways
 *        - scrolled past the section: paused
 *        - reduced motion: no autoplay, no player — a static labelled frame
 *          with a play button
 *
 * The real manifest is restored and rebuilt at the end, whatever happens.
 * Run from the repo root:  node scripts/pullback_acceptance.mjs
 */

import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const MANIFEST = "content/home.json";
const BASE = "http://127.0.0.1:8900";
const TEST_VIDEO = "hF2V-5lBWoo";

let failures = 0;
const ok = (name, pass, detail = "") => {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!pass) failures++;
};

const build = () => {
  console.log("  building…");
  execSync("npx next build", { stdio: ["ignore", "ignore", "inherit"] });
};

/* Poll an in-page condition until true or timeout. */
const until = async (page, fn, ms = 25000, step = 500) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await page.evaluate(fn)) return true;
    await new Promise((r) => setTimeout(r, step));
  }
  return false;
};

const real = fs.readFileSync(MANIFEST, "utf-8");
let server;
try {
  process.on("uncaughtExceptionMonitor", () => fs.writeFileSync(MANIFEST, real));

  /* -------------------------------------------- 1. empty videoId (real) */
  console.log("\n1. real manifest — videoId empty");
  build();
  const html = fs.readFileSync("out/index.html", "utf-8");
  ok("builds with an empty videoId", true);
  ok("frame is the marked gap", html.includes("pullback.videoId"));
  ok(
    "background gap is marked too",
    html.includes("pullback.background")
  );

  /* ------------------------------------------------------- 2. fixture */
  console.log("\n2. fixture videoId (official upload, test-only)");
  const fixture = JSON.parse(real);
  fixture.pullback = { ...fixture.pullback, videoId: TEST_VIDEO, start: 0 };
  fs.writeFileSync(MANIFEST, JSON.stringify(fixture, null, 1));
  build();

  server = spawn("python3", ["scripts/gzserve.py"], { stdio: "ignore" });
  let up = false;
  for (let i = 0; i < 20 && !up; i++) {
    await new Promise((r) => setTimeout(r, 500));
    up = await fetch(`${BASE}/`).then((r) => r.ok).catch(() => false);
  }
  if (!up) throw new Error("gzserve never came up on :8900 — is the port taken?");

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
  });

  /* ---- desktop: the pinned experience ---- */
  {
    const p = await browser.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    await p.goto(`${BASE}/?loader=off`, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1500));

    // Mid-pin, same scrub the homepage acceptance uses.
    const scrub = (frac) =>
      p.evaluate(async (f) => {
        const el = document.querySelector("[data-pin]");
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const travel = r.height - window.innerHeight;
        const y = r.top + window.scrollY + travel * f;
        for (let i = 0; i < 30; i++) {
          const l = window.__lenis;
          if (l) l.scrollTo(y, { immediate: true, force: true });
          else window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
          if (Math.abs(window.scrollY - y) < 4) break;
        }
        return true;
      }, frac);

    ok("pin exists on desktop", await scrub(0.5));

    const playing = await until(
      p,
      () => document.querySelector("[data-video-state]")?.dataset.videoState === "playing"
    );
    ok("mid-pin: video is playing", playing);

    const isMuted = () => p.evaluate(() => window.__whaPlayer?.isMuted?.() ?? null);
    ok("mid-pin: muted, per the player's own isMuted()", (await isMuted()) === true);
    ok(
      "the DOM mirror agrees",
      await p.evaluate(
        () => document.querySelector("[data-video-state]")?.dataset.videoMuted === "true"
      )
    );

    // The SOUND pill, both directions, asserted via isMuted().
    const pillVisible = await p.evaluate(() => {
      const pill = document.querySelector("[data-sound-pill]");
      return pill && parseFloat(getComputedStyle(pill).opacity) > 0.5;
    });
    ok("SOUND pill is visible with the section", !!pillVisible);
    await p.click("[data-sound-pill]");
    await new Promise((r) => setTimeout(r, 600));
    ok("pill unmutes — isMuted() false", (await isMuted()) === false);
    await p.click("[data-sound-pill]");
    await new Promise((r) => setTimeout(r, 600));
    ok("pill mutes again — isMuted() true", (await isMuted()) === true);

    // Past the pin: paused.
    await p.evaluate(async () => {
      const el = document.querySelector("[data-pin]");
      const r = el.getBoundingClientRect();
      const y = r.top + window.scrollY + r.height + window.innerHeight;
      const l = window.__lenis;
      if (l) l.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
    });
    const paused = await until(
      p,
      () => document.querySelector("[data-video-state]")?.dataset.videoState === "paused",
      10000
    );
    ok("past the pin: video paused", paused);

    // And back in: playing again, re-muted by default.
    await scrub(0.5);
    const replay = await until(
      p,
      () => document.querySelector("[data-video-state]")?.dataset.videoState === "playing",
      10000
    );
    ok("back mid-pin: playing again", replay);
    ok("re-entry re-muted — muted is always the default", (await isMuted()) === true);
    await p.close();
  }

  /* ---- reduced motion: static frame, no autoplay, no player ---- */
  {
    const p = await browser.newPage();
    await p.setViewport({ width: 1440, height: 900 });
    await p.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ]);
    await p.goto(`${BASE}/?loader=off`, { waitUntil: "networkidle2" });
    await p.evaluate(() =>
      document.querySelector("[data-video-static]")?.scrollIntoView()
    );
    await new Promise((r) => setTimeout(r, 3000));
    const state = await p.evaluate(() => ({
      staticFrame: !!document.querySelector("[data-video-static]"),
      playButton: !!document.querySelector("[data-video-play]"),
      ytIframe: [...document.querySelectorAll("iframe")].some((f) =>
        f.src.includes("youtube")
      ),
      autoLayer: !!document.querySelector("[data-video-state]"),
    }));
    ok(
      "reduced motion: static labelled frame with a play button, nothing loaded",
      state.staticFrame && state.playButton && !state.ytIframe && !state.autoLayer,
      JSON.stringify(state)
    );
    await p.close();
  }

  await browser.close();

  /* ------------------------------------------------- 3. restore + rebuild */
  console.log("\n3. real manifest restored");
  fs.writeFileSync(MANIFEST, real);
  build();
  ok(
    "shipped homepage carries the marked gap",
    fs.readFileSync("out/index.html", "utf-8").includes("pullback.videoId")
  );
} finally {
  fs.writeFileSync(MANIFEST, real);
  if (server) server.kill();
}

console.log(failures ? `\n${failures} FAILED` : "\nall green");
process.exit(failures ? 1 : 0);
