/**
 * Acceptance for /reels. Three builds, assertions on each:
 *
 *   1. empty manifest        — builds, page shows the marked gap
 *   2. test manifest         — 3 live reels + 1 deliberately dead one:
 *        - the bottom entry stays uninjected until scrolled (lazy, per entry)
 *        - no instagram/tiktok request before any entry nears the viewport
 *        - live Instagram + TikTok embeds hydrate after scroll
 *        - the dead reel degrades to the marked "no longer available" state
 *   3. the real manifest     — restored and rebuilt, count + nav asserted
 *
 * Run from the repo root:  node scripts/reels_acceptance.mjs
 * Uses `npx next build` directly — the prebuild photo/map scripts are
 * orthogonal to this page and their artifacts are already in content/.
 */

import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const MANIFEST = "content/reels.json";
const BASE = "http://127.0.0.1:8900";

let failures = 0;
const ok = (name, pass, detail = "") => {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
  if (!pass) failures++;
};

const build = () => {
  console.log("  building…");
  execSync("npx next build", { stdio: ["ignore", "ignore", "inherit"] });
};

const real = fs.readFileSync(MANIFEST, "utf-8");

const testManifest = {
  _readme: ["acceptance fixture — restored automatically"],
  reels: [
    ...JSON.parse(real).reels,
    {
      url: "https://www.instagram.com/reel/AAAAAAAAAAA/",
      platform: "instagram",
      caption: "This one is deliberately dead.",
      added: "2026-08-19",
    },
  ],
};

let server;
try {
  process.on("uncaughtExceptionMonitor", () => {
    // Whatever happens, the real manifest goes back.
    fs.writeFileSync(MANIFEST, real);
  });
  /* ------------------------------------------------ 1. empty manifest */
  console.log("\n1. empty manifest");
  fs.writeFileSync(MANIFEST, JSON.stringify({ _readme: [], reels: [] }));
  build();
  const emptyHtml = fs.readFileSync("out/reels/index.html", "utf-8");
  ok("builds with an empty manifest", true);
  ok(
    "empty state is a marked gap",
    emptyHtml.includes("reels go in content/reels.json")
  );
  ok("0-count label", emptyHtml.includes("0 reels"));

  /* ---------------------------------------- 2. three live + one dead */
  console.log("\n2. three live entries + one dead URL");
  fs.writeFileSync(MANIFEST, JSON.stringify(testManifest, null, 2));
  build();

  server = spawn("python3", ["scripts/gzserve.py"], { stdio: "ignore" });
  // gzserve binds 8900 or dies (a stale one from an old session once sat on
  // the port resetting connections) — so prove it serves before testing.
  let up = false;
  for (let i = 0; i < 20 && !up; i++) {
    await new Promise((r) => setTimeout(r, 500));
    up = await fetch(`${BASE}/reels/`).then((r) => r.ok).catch(() => false);
  }
  if (!up) throw new Error("gzserve never came up on :8900 — is the port taken?");

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 700 });
  // TikTok's embed player refuses the headless UA.
  await page.setUserAgent((await browser.userAgent()).replace("HeadlessChrome", "Chrome"));

  const platformReqs = [];
  page.on("request", (r) => {
    if (/instagram\.com|cdninstagram|fbcdn|tiktok|ttwstatic/.test(r.url())) {
      platformReqs.push(r.url());
    }
  });

  // Freeze scrolling at the top so "near the viewport" is unambiguous.
  await page.goto(`${BASE}/reels/`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2500));

  const slots = await page.$$eval("[data-reel-slot]", (els) =>
    els.map((el) => ({
      top: el.getBoundingClientRect().top,
      injected: !!el.querySelector("blockquote, iframe"),
    }))
  );
  ok("4 reel frames render", slots.length === 4, `got ${slots.length}`);
  // The lazy assertion layout shift can't game: the bottom entry sits
  // ~1950px down at load, and no shift that actually happens (the font swap
  // is ~-106px) brings it inside the observer's 700+800px boundary, so it
  // must not inject on page open. Entries near the boundary legitimately go
  // either way, and their position at measurement time proves nothing about
  // their position when the observer fired — embeds hydrating above them
  // move them by hundreds of pixels.
  const last = slots[slots.length - 1];
  ok(
    "bottom entry stays uninjected until scrolled",
    !last.injected,
    slots
      .map((s, i) => `#${i + 1} top:${Math.round(s.top)} ${s.injected ? "injected" : "waiting"}`)
      .join(", ")
  );
  ok(
    "near-viewport entries did inject (lazy, not inert)",
    slots[0].injected && platformReqs.length > 0,
    `${platformReqs.length} platform requests`
  );

  // Walk down the page so every entry crosses the viewport.
  await page.evaluate(async () => {
    const step = 600;
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 250));
    }
    window.scrollTo(0, document.body.scrollHeight);
  });

  // Hydration: IG marks its blockquote; TikTok swaps in an iframe. The dead
  // reel needs the 15s deadline to pass before it degrades.
  await new Promise((r) => setTimeout(r, 20000));

  const igLive = await page.$(".instagram-media-rendered");
  ok("live Instagram embed hydrates", !!igLive);

  const ttFrames = await page.$$eval("[data-reel-slot] iframe", (els) =>
    els.map((el) => el.src)
  );
  ok(
    "both TikTok embeds hydrate to iframes",
    ttFrames.filter((s) => /tiktok\.com\/embed/.test(s)).length === 2,
    ttFrames.join(" | ")
  );

  // Look inside the TikTok frames: an embed-disabled video still hydrates,
  // but to TikTok's "unavailable" card — that would mean a bad manifest entry.
  let ttPlayable = 0;
  for (const f of page.frames()) {
    if (!/tiktok\.com\/embed/.test(f.url())) continue;
    const text = await f
      .evaluate(() => document.body?.innerText ?? "")
      .catch(() => "");
    if (text && !text.includes("Video currently unavailable")) ttPlayable++;
  }
  ok("both TikTok entries actually play (not embed-disabled)", ttPlayable === 2,
    `${ttPlayable}/2 playable`);

  const gone = await page.evaluate(() => {
    const el = [...document.querySelectorAll("figure")].find((f) =>
      f.textContent.includes("No longer available")
    );
    return el ? el.textContent : null;
  });
  ok("dead reel degrades to the marked state", !!gone);
  ok(
    "dead reel keeps its caption",
    !!gone && gone.includes("This one is deliberately dead."),
    gone ? "" : "no gone state found"
  );
  const brokenIframes = await page.$$eval("iframe", (els) =>
    els.filter((el) => el.src.includes("/reel/AAAAAAAAAAA")).length
  );
  ok("dead reel leaves no iframe behind", brokenIframes === 0);

  await browser.close();

  /* ------------------------------------------------- 3. real manifest */
  console.log("\n3. real manifest restored");
  fs.writeFileSync(MANIFEST, real);
  build();
  const html = fs.readFileSync("out/reels/index.html", "utf-8");
  ok("3-count label", html.includes("3 reels"));
  ok("colophon present", html.includes("This site hosts nothing"));
  ok("nav has Reels", fs.readFileSync("out/index.html", "utf-8").includes("/reels/"));
} finally {
  fs.writeFileSync(MANIFEST, real);
  if (server) server.kill();
}

console.log(failures ? `\n${failures} FAILED` : "\nall green");
process.exit(failures ? 1 : 0);
