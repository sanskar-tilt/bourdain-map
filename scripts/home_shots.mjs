/**
 * Deterministic homepage screenshots.
 *
 * ?loader=hold freezes the loader on its resolved frame; ?scroll=<0-1>
 * positions the pull-back at a known point. Runs twice — normal, then with
 * reduced motion forced — and reports whether anything moved in the second
 * pass.
 */
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] ?? "http://127.0.0.1:8900";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "notes/refs/home";
fs.mkdirSync(OUT, { recursive: true });

const b = await puppeteer.launch({
  executablePath: CHROME, headless: "new", args: ["--no-sandbox"],
});

async function pass(reduced) {
  const tag = reduced ? "rm-" : "";
  const p = await b.newPage();
  await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  if (reduced) {
    await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  }

  // loader, mid-cycle and resolved
  await p.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 1600));
  await p.screenshot({ path: `${OUT}/${tag}01-loader-midcycle.png` });
  await new Promise((r) => setTimeout(r, 2900));
  await p.screenshot({ path: `${OUT}/${tag}02-loader-final.png` });

  // the hero, settled
  await p.goto(`${BASE}/?loader=off`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  await p.screenshot({ path: `${OUT}/${tag}03-hero.png` });

  // each section, settled
  const names = ["06-quote", "07-counter", "08-pairing", "09-trail", "10-invitation"];
  for (let i = 0; i < names.length; i++) {
    const ok = await p.evaluate((idx) => {
      const secs = [...document.querySelectorAll("section")].slice(1);
      const el = secs[idx];
      if (!el) return false;
      el.scrollIntoView({ block: "center" });
      return true;
    }, i);
    if (!ok) continue;
    await new Promise((r) => setTimeout(r, 900));
    await p.screenshot({ path: `${OUT}/${tag}${names[i]}.png` });
  }
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((r) => setTimeout(r, 900));
  await p.screenshot({ path: `${OUT}/${tag}11-colophon.png` });

  // Under reduced motion, nothing on the page may still be mid-transition:
  // sample every masked inner and reveal twice, 400ms apart.
  const moved = await p.evaluate(async () => {
    const read = () =>
      [...document.querySelectorAll('[class*="lineMask"] > span, .reveal')]
        .map((el) => getComputedStyle(el).transform + getComputedStyle(el).opacity)
        .join("|");
    const before = read();
    window.scrollTo(0, 400);
    await new Promise((r) => setTimeout(r, 400));
    return before !== read();
  });
  await p.close();
  return moved;
}

const movedNormal = await pass(false);
const movedReduced = await pass(true);
console.log(`normal pass: page ${movedNormal ? "animates" : "static"}`);
console.log(`reduced-motion pass: page ${movedReduced ? "MOVES — should not" : "static, correct"}`);
console.log("shots:", fs.readdirSync(OUT).length);
await b.close();
process.exit(movedReduced ? 1 : 0);
