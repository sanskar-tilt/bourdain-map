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

  // the pull-back, at known scroll fractions
  await p.goto(`${BASE}/?loader=skip`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  const stops = [["03-hero-fullbleed", 0], ["04-hero-half", 0.5], ["05-hero-landed", 1]];
  for (const [name, frac] of stops) {
    await p.evaluate((f) => {
      const el = document.querySelector("[data-pin]");
      if (!el) return;
      const travel = el.getBoundingClientRect().height - window.innerHeight;
      window.scrollTo(0, Math.max(0, el.offsetTop + travel * f));
    }, frac);
    await new Promise((r) => setTimeout(r, 700));
    await p.screenshot({ path: `${OUT}/${tag}${name}.png` });
  }

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

  // does anything still move?
  const moved = await p.evaluate(async () => {
    const el = document.querySelector("[data-pin]");
    const before = el ? getComputedStyle(el).getPropertyValue("--p") : "";
    window.scrollTo(0, 400);
    await new Promise((r) => setTimeout(r, 400));
    const after = el ? getComputedStyle(el).getPropertyValue("--p") : "";
    return before !== after;
  });
  await p.close();
  return moved;
}

const movedNormal = await pass(false);
const movedReduced = await pass(true);
console.log(`normal pass: pin ${movedNormal ? "moves" : "static"}`);
console.log(`reduced-motion pass: pin ${movedReduced ? "MOVES — should not" : "static, correct"}`);
console.log("shots:", fs.readdirSync(OUT).length);
await b.close();
process.exit(movedReduced ? 1 : 0);
