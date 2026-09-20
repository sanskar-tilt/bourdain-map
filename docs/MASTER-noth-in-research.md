# MASTER — noth.in research reference (union)

**Purpose:** Single reconstruction-grade reference that unions every useful fact from four agent dumps (plus optional TECHNICAL cross-check). Not a bake-off — unique facts from any source are kept. Prefer exact JS/HTML constants over eyeball estimates; when both are useful, keep both with source tags.

**Target site:** https://www.noth.in/ (also styled **Nothin'** / **noth.in**)  
**Master assembled:** 2026-09-20 (Europe/London)  
**Use:** Build the most beautiful *similar* site later. Do not treat as license to copy assets, fonts, or shaders verbatim.

---

## 1. Source inventory

| Tag | Path | Size | Role |
|-----|------|------|------|
| `(agent-2)` | `/workspace/noth-research-sources/research-agent-2.md` | ~23KB | Classes, timings, URLs, JS constants; full class/URL inventories |
| `(website-research)` | `/workspace/noth-research-sources/nothin-website-research.md` | ~36KB | Deep system teardown: loader timeline, shaders, copy, Taxi, blueprint |
| `(forensic)` | `/workspace/noth-research-sources/noth-in-forensic-teardown.txt` | ~19KB | Frame-by-frame UX, menu, works Flip/grid, museum zoom, micro-interactions |
| `(pdf)` | `/workspace/noth-research-sources/Nothin-Page-Analysis.pdf` (+ extracted `.txt`) | ~1.6MB | Measured geometry, scroll map, exact pill CSS, Flip/museum/sound numbers |
| *(optional)* | `/workspace/noth-in-teardown/TECHNICAL.md`, `/workspace/artifacts/research-agent-2.md` | — | Cross-check only; same agent-2 content mirrored in artifacts |

**Conflict policy applied:** Canonical **(code)** when a value is quoted from `main.js` / HTML. Visual/eyeball values kept alongside with source tags. Variants listed, never silently dropped.

---

## 2. One-paragraph site summary (merged)

Noth.in is a Paris creative-studio portfolio: black/white, type-led, object-led, built in Webflow with a large custom Vite bundle on Netlify. The signature move is **not** a custom cursor sprite — the default OS cursor stays. On the hero, mouse movement drives a Three.js Navier–Stokes fluid whose dye buffer masks a liquid tear through the white page + giant SVG wordmark, revealing a looping video underneath. A black session-gated loader builds the name first (N + photographed object in the O-slot + 000 counter), then Lenis + GSAP ScrollTrigger run a long cinematic scroll: letters drop in, showreel shrinks from full-bleed to a small tile, work stills take over with Flip letter rail + explore pill, objects flee the pointer, type glitches with scroll velocity, and a pinned “museum” film zooms out into a gallery room. Awwwards Site of the Day (10 Aug 2026, score **7.45** per `(website-research)`); highlighted elements: hero shaders, IA video background, footer, works page, attractive 3D.

---

## 3. Stack / hosting / credits

| Layer | Value | Sources |
|-------|-------|---------|
| CMS / markup | Webflow (`nothin-preprod`); `w-dyn-*`, `data-wf-*` | all |
| Site ID | `6a0c501c42b9751b78a9d1a7` | `(agent-2)`, `(website-research)` |
| Works collection CDN id | `6a2679b9acc91890e34df140` | `(agent-2)` |
| HTML host | Webflow + Cloudflare | `(agent-2)`, TECHNICAL |
| Custom JS | `https://nothinv1.netlify.app/main.js` (~752 317 bytes, Vite IIFE/module) | `(agent-2)`, `(website-research)` |
| Dev workflow | `?dev` / `__dev` → `http://localhost:3000/src/main.js` | TECHNICAL |
| Motion | GSAP **3.13.0** `(pdf)` + ScrollTrigger + SplitText (`lo`) + Flip | all |
| Smooth scroll | Lenis (`html` gets class `lenis`) | all |
| Page transitions | Taxi.js (`default`, `flip`); header `X-Requested-With: Taxi` | all |
| WebGL | Three.js fluid / dye / splat → mask reveal (`gA`, factory `dA`/`mA`/`pA`) | all |
| jQuery | Webflow 3.5.1 | `(agent-2)` |
| Webflow bundler | rspack 1.3.9 | TECHNICAL |
| Analytics | GTM `GTM-TXXTT3WJ`, GA4 `G-HHTL91GJ73`, Metricool | `(website-research)` *(TECHNICAL conflates GTM with GA4 id — see §21)* |
| Video CDN | `https://noth-in.b-cdn.net/` | all |
| Image CDN | `https://cdn.prod.website-files.com/` | all |
| Fonts | PP Neue Montreal (woff2 Webflow CDN); IBM Plex Mono 400 (Google WebFont 1.6.26) | all |
| Not used | Next/Nuxt/Framer Motion/Locomotive/Barba/Swup/Pixi/regl; no React signal required | `(forensic)`, TECHNICAL |

### Credits

**Console (canonical):**
```
Dev by Thomas Carré
Design by Pierre Patrault
Visuals by Guillaume Perrette
```
`(agent-2)`, `(website-research)`, TECHNICAL

Agency framing: Carré Studio (Marseille) for client Nothin' Studio (Paris) `(website-research)`. Also publicly: Sara Guedj, Clément Merouani (awards posts) TECHNICAL. PDF OCR misspells names (Patrault/Carre/Perrette) — prefer console spellings `(pdf)` vs `(code)`.

### Positioning

- “Not a style, a perspective. Because Nothin’ is Everythin’.”
- “A protean augmented-creative studio in Paris.”
- Branding, editorial, art direction and AI; fashion / luxury / tech.
- Tag: “Creative studio in Paris”

### People on page

| Group | Names |
|-------|-------|
| Founders & management | Sara Guedj, Anne-Sophie Do, Gabriel Guedj, Guillaume Fayolle |
| Creative partners | Pierre Patrault, Thomas Carré, Guillaume Perrette |

### Awards

- Awwwards SOTD — https://www.awwwards.com/sites/nothin — score 7.45, 10 Aug 2026 `(website-research)`
- Elements: Hero Shaders, Works Page, etc.
- GSAP Showcase / The FWA / Portfolio Honors (mentioned) TECHNICAL / `(website-research)`

---

## 4. Loader / first paint

### Session key

| Key | Value | Behaviour |
|-----|-------|-----------|
| `sessionStorage["nothin:loader-played"]` | `"1"` | Skip full loader on same-tab revisit; jump to hero letter reveal |

- Bundle symbol: `F_` = `"nothin:loader-played"` `(website-research)`
- When set: PDF says when loader **begins**; website-research says **after** play — see §21

### Markup pieces

- `.loader` full-screen black
- `.loader-c` inner
- `.fake-top-loader` (Webflow dummy: “This is some text inside of a div block.”)
- `.loader-anim`
- `svg.n-load` — giant N, viewBox `0 0 99 120`
- `.apos-load` — apostrophe
- `.loader-img-w` — width `1rem → 20rem` desktop / `10rem` max-width 991px
- `.loader-img` — stacked cutout photos
- `.loader-nbr-w` — 3-digit counter

### Loader images (union — same objects reappear as formes)

`coeur-bulle-nb`, `papier-froisse`, `asterix`, `smiley`, `bonbon`, `chwing`, `sac-plastic`, `chien`, `piniata`, `ballon`, `cube`, `bouee` `(website-research)`  
PDF counts **12 loader images** among 29 homepage `<img>` elements `(pdf)`.

### Timeline (functions `vM`, `_M`, `O_`, `mM`, `gM`, `tf`) — `(website-research)` + `(forensic)` + `(pdf)`

Skip path: if session key set → hide loader, run `tf()` immediately.

First-play path:

1. Lock scroll (`lenis.stop()`, `scrollTo(0,0)`).
2. Pre-hide hero SVG letter paths + apostrophe (`autoAlpha: 0`).
3. Wrap `.n-load` in overflow-hidden flex; N starts `yPercent: 100, opacity: 0`.
4. N → `yPercent: 0` in **1.0s**, `power4.inOut`. Apostrophe scales `0→1` in parallel.
5. `_M`: wrapper width `1rem → 20rem` (**1.2s**, `power4.inOut`). First `.loader-img`: `scale 0→1`, `rotate: 15`, `back.out(0.9)`, **0.8s**, delay **0.5s**.
6. Counter `.loader-nbr-w`: padded 3 digits, numeric **100 → 0**, `power2.inOut`. Duration **`ef/750`** → **6.667s** configured `(pdf)` / `(website-research)`. Ends on `"000"`. Visual budget often described as ~5s object-cycle window `(forensic)`.
7. `O_`: while time remains, every `hM(elapsed)` ms cycle images. Swap interval ~**500→100→500ms** sine profile `(pdf)`. Next from `{opacity:0, scale:.8}` → `{opacity:1, scale:1}` in **0.32s** `back.out(1.2)`.
8. `gM` exit: image `scale 0` in **0.6s** `power4.inOut` delay 0.5s; wrapper → `1rem` (**0.8s**, delay 0.6s); counter `autoAlpha 0` **0.5s**; loader `height: 0` in **1.8s** `power4.inOut`, then `display:none`.
9. `tf()` hero reveal; set session flag.
10. Custom events: `loader:hero-reveal-start`, `loader:hero-revealed` `(website-research)`.

**Canonical (code):** durations/eases above from bundle. Perceived total ~11s through completed hero reveal `(pdf)`.

Scroll locked during loader; Lenis starts after hero reveal completes.

---

## 5. Name / wordmark / typography / colours

### Wordmark (SVG, not live type)

- Node: `svg.nothin-hero-svg` in `.nothin-hero-w`
- viewBox: **`0 0 1408 294`**
- 6 letter `<path>` + `path.nothin-apos`
- Path starts (ID only): N `M226.68…`, O `M330.643…`, T `M704.685…`, H `M952.793…`, I `M1043.58…`, N `M1293.78…`, apos `M1404.6…`
- Intentionally **crops** on desktop (OTHI / NOTHIN' cut by edges)
- Rendered letter height ~270–280px at 1363px viewport `(pdf)`
- Outer gutters **1.25rem** (~17px at 1363); wordmark ~1329px wide `(pdf)`

### Hero reveal `tf()` — Canonical (code)

1. Dispatch `loader:hero-reveal-start`
2. Loader N `yPercent: 100` 1.0s `power4.inOut` → opacity 0; loader apos `scale: 0` same
3. Hero paths shuffled `sort(() => Math.random() - 0.5)`
4. `fromTo` `{ autoAlpha:1, yPercent:120 }` → `{ yPercent:0 }`, duration **1.8**, ease **power4.inOut**, stagger **0.07**, delay **0.2**
5. On complete: `loader:hero-revealed`
6. Apostrophe `{ scale:0 }` → `{ scale:1 }`, **0.6s**, `back.out(0.9)`, delay **1.5**, origin centre

Supporting chrome delays `(pdf)`: proposition/location line-masked delay **1.5s**; nav/social opacity delay **1.5s**; primary CTA opacity delay **2s**.

### Nav clip-path letter geometry (reuse / masked slices)

```js
{
  "nav-o":      { x: 241,  w: 285 },
  "nav-t":      { x: 520,  w: 183 },
  "nav-h":      { x: 722,  w: 228 },
  "nav-i":      { x: 968,  w: 72  },
  "nav-n-last": { x: 1058, w: 230 }
}
// clip rect height: 291; bA wraps path in <g clip-path="url(#clip-…)">
```
`(website-research)`

Sticky **`N'`** after scroll past hero; nav top-right. Colour: `mix-blend-mode: difference` with white elements `(forensic)`, `(pdf)` — also described as inverting black↔white by section `(website-research)` (see §21).

### Typography

| Role | Face | Notes |
|------|------|-------|
| Display / UI / body | **PP Neue Montreal** (Thin→Bold / Book / Medium / Regular) | Webflow `@font-face` woff2; family token `Ppneuemontreal` |
| Meta / counters / explore pill / glitch tech | **IBM Plex Mono 400** | Google WebFont loader 1.6.26 |
| Wordmark | Custom SVG paths | Not body typeface |

Fluid root: `html { font-size: calc(0rem + 1vw); }` desktop (= **1vw** / rem = 1% vw); `1rem` below **991px** `(agent-2)`, `(pdf)` (992px+ enables desktop choreography).

Measured at 1363×936 `(pdf)`:

| Use | Size |
|-----|------|
| Top-left proposition | 1.5625rem ≈ 21.30px; line-height 1.0 |
| Main large text | 5rem = 68.15px; lh 1; weight 500; tracking −0.01em |
| Primary pill text | ~10.22px uppercase; pill ~139×43px |
| Body default ~14px `(forensic)` | Utility nav ~9.6px bold uppercase +.288px tracking |
| Loader counter | 12.8px bold uppercase +.64px tracking `(forensic)` |
| Large statement | 68.15 / 68.15px |
| Portfolio statement | 34.075 / 37.483px |
| Project description | 21.297px (studio intro leading 25.556px) |
| Small paragraph | 15.334 / 18.401px |
| Project/team labels | 10.223px uppercase mono gray |
| Team / footer credit | ~11.926 / 14.312px |
| Mobile large statement | 2.5rem; portfolio statement 1.5625rem `<992px` `(pdf)` |
| Glitch type | 0.75rem below 767px `(pdf)` |

### Colour

| Token | Use |
|-------|-----|
| `#000000` | Primary black |
| `#FFFFFF` | Primary white |
| `#0a0a0a` | Fluid fallback clear / near-black `(website-research)` |
| `#8e8e8e` | Muted label gray `(pdf)` |

Awwwards lists black/white only. Colour lives in photography/3D. Project image corner radius **0.25rem** ≈ 3.4px `(pdf)`.

### Spatial rules (art direction)

Huge cropping type; large empty fields; full-bleed photos; chrome in corners; cut-out objects as characters; 12-column desktop / 6-column mobile grids `(forensic)`, `(pdf)`.

---

## 6. Cursor systems (three — do not merge)

**There is NO global custom cursor.** `getComputedStyle(document.body).cursor === "auto"`. Blue OS/capture glow in screenshots is **not** site UI `(pdf)`.

### 6.1 Hero = WebGL fluid dye mask (signature “trail”)

Not a DOM follower. See **§13** for full param block + shaders.

### 6.2 Work-card EXPLORE pill — `.work-link` → `.cursor-work`

```js
el.style.cursor = "none"
gsap.set(cursor, {
  position: "absolute",
  xPercent: -50, yPercent: -50,
  left: 0, top: 0,
  scale: 0, autoAlpha: 0,
  pointerEvents: "none",
  zIndex: 10
})
lerp = 0.09  // current += (target - current) * 0.09
// show: scale 1, autoAlpha 1, duration 0.6, ease "back.out(1.8)"
// hide: scale 0, autoAlpha 0, duration 0.38, ease "power3.in"
```
**Canonical (code):** `(agent-2)`, `(website-research)`

Pill CSS `(pdf)`:
- Label: **`explore`** (sources also write `EXPLORE →` / “explore” + arrow SVG — see §21)
- IBM Plex Mono **12px**, tracking **0.03em**, uppercase
- `border-radius: 100px`; padding **0.75rem** × **0.125rem**; gap **0.375rem**
- Measured sizes: ~**97×17** `(website-research)` / ~**91×16** `(forensic)` — both eyeball; prefer CSS + content
- Activates on actual mousemove (not mouseenter alone); first move snaps so it doesn’t fly from 0,0
- Idle stop when `delta < 0.05`
- ~0.41s to close 90% of gap at 60fps (frame-dependent) `(pdf)`
- Arrow SVG ~14×10 `(forensic)`

### 6.3 Magnetic letter formes — decorative, NOT the pointer

Classes: `.n-cursor` `.t-cursor` `.h-cursor` `.i-cursor` `.apos-cursor` inside `.formes-w` — see **§9**.

### 6.4 Other pointer languages (keep separate)

| System | Behaviour | Source |
|--------|-----------|--------|
| `[hoverme]` / letter repel `Kh` | Chars nudge within **200–300px**; glide back **0.5s** | `(forensic)`, `(website-research)` |
| Footer SVG paths | Scale → **0.05** then elastic return (see §14 footer) | `(forensic)`, `(pdf)` |
| Buttons `.btn` / `.line-arrow` | Shaft → **1.45×** width, 0.4s `power4.inOut` in; 0.8s `power4.out` out | all |
| View all | SVG arrow horizontal **2×**, 0.45s `power2.inOut` `(pdf)` / stretch `(forensic)` | |
| Link underline | 1px draws L→R 0.6s, exits R 0.6s | `(forensic)`, `(pdf)` |
| Email `@` | Scale **1.2** in 0.2s | `(forensic)`, `(pdf)` |
| Capsule arrow (PDF) | Shaft **1.45×**, 0.4s `power4.inOut` / return 0.8s `power4.out` | `(pdf)` |

---

## 7. Scroll (Lenis + ScrollTrigger)

### Lenis init — Canonical (code)

```js
new Lenis({
  duration: 1.2,
  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  direction: "vertical",
  gestureDirection: "vertical",
  smooth: true,
  smoothTouch: false,
  touchMultiplier: 2
})
```

Library defaults also in bundle: `lerp: 0.1`, `syncTouchLerp: 0.075`. RAF → `lenis.raf`. Helpers stop/start + lock `html/body` overflow during loader/overlays. Native scrollbar hidden; overscroll disabled `(pdf)`. No CSS scroll-snap; no horizontal page scroll.

### Scroll map (measured 1363×936) `(pdf)`

Page ~**11 320px** tall; max scroll ~**10 384px**.

| Scene | Y range / height | Role |
|-------|------------------|------|
| Opening overlay | Fixed | Loader |
| Hero | 0–936 / 936px | White SVG + fluid |
| Showreel + intro | 936–2132 / 1196px | Video contracts lower-right |
| Selected projects | 2132–5115 / 2983px | Works Flip + cards |
| Studio film / gallery | 5115–6987 / 1872px | Pinned museum zoom (= 2×936) |
| Studio / services / team | 6987–9020 / 2033px | Copy + formes |
| Glitch | 9020–10384 / 1363px | Velocity scramble |
| Footer | 10384–11320 / 936px | Contact + wordmark |

Other measured notes: showreel ~1.56 vh at 1280×720 `(forensic)`; works ~2802px; blur separator ~160px `(website-research)`; desktop screenshot page height also cited ~20844px at larger viewports `(website-research)`.

### Key ScrollTrigger patterns

| Pattern | Config | Source |
|---------|--------|--------|
| Text reveals | `start:"top 95%"`, `toggleActions:"play none none none"` | code |
| Formes / glitch velocity | `top bottom` → `bottom top`, `onUpdate` | code |
| Showreel shrink | `start:"top top"`, `end:"bottom bottom"`, `scrub:3`, `power4.inOut`; **disabled &lt;992px** | code |
| Works Flip letters | section top/top→bottom/bottom, `scrub:3` | `(pdf)` |
| Works image reveal | item top **88%** viewport; play once | `(pdf)`, `(forensic)` |
| Works card drift | `scrub:1.5`; inner image `scrub:3` | `(pdf)` |
| Museum pin | pin when top→top; release bottom→top; `pinSpacing:true`; `scrub:1`, `ease:none` | `(pdf)` |
| After Taxi | `ScrollTrigger.refresh()` debounced | code |
| Media settle | Force images eager; refresh after images/fonts/video metadata | `(forensic)`, `(pdf)` |

### Showreel shrink `Ev()` — Canonical (code)

```js
gsap.fromTo(".section.showreel .video-showreel-full-w",
  { width: "100%", height: "100%" },
  {
    width: "33.3%",
    height: "35%",
    ease: "power4.inOut",
    immediateRender: false,
    scrollTrigger: {
      trigger: ".section.showreel",
      start: "top top",
      end: "bottom bottom",
      scrub: 3,
      invalidateOnRefresh: true
    }
  }
)
```

Wrapper CSS notes `(pdf)`: 100% width; **58rem** height/min-height (~790px at 1363); align bottom/right → strong rightward retreat. Copy paragraph max-width **21.625rem**.

### Hero → sticky N'

`.section-fake-hero` same-height spacer. Small logo appears after ~**10%** of one viewport scrolled; fade in **0.4s** / out **0.3s** `(pdf)`.

### `.section-w` geometry (important for fluid)

Canvas spans `.section-w`: **300vh** tall with **−100vh** top margin on desktop; 100vh hero centred; showreel has own negative top margin — overlap is intentional `(pdf)`.

---

## 8. Text reveal attribute system

Injected CSS (start of `main.js`) — Canonical (code):

```css
* { margin:0; padding:0; box-sizing:border-box }
html { height:auto; scroll-behavior:auto }
a { color:inherit; text-decoration:none; transition:opacity .3s ease }
img { max-width:100%; height:auto; display:block }
[line],[letter],[opacity] { opacity:0 }
[scale] { transform:scale(0); transform-origin:50% 50% }
.line-child,.letter-child { padding-bottom:.15em }
.line-mask-child-mask,.letter-mask-child-mask { margin-bottom:-.15em }
.section-w { position:relative; overflow:hidden }
.section-w .video-hero-bg {
  position:absolute; top:50%; left:0;
  transform:translateY(-50%);
  width:100%; height:auto; z-index:0
}
.section-w .mask-reveal-canvas {
  position:absolute; inset:0; z-index:1; pointer-events:none
}
.section-w .section.hero-home {
  background-color:#fff; position:relative; z-index:0
}
.footer-svg-w,.footer-nothin-svg { overflow:visible }
.footer-nothin-svg path { will-change:transform }
```

Mask spacing note `(pdf)`: children **0.15em** bottom padding balanced by **−0.15em** on masks (descenders). Init after `document.fonts.ready` with **1000ms** fallback; may resplit + refresh `(pdf)`. Nodes inside `[data-taxi-view]` skipped by `nr()` to avoid double-split.

| Attr | Behaviour | Canonical notes |
|------|-----------|-----------------|
| `[line]` | SplitText `type:"lines"`, class `line-child`, `mask:"lines"`; `yPercent:100→0`; duration **1**; `power4.inOut`; stagger **0.05**; ST `top 95%` | code |
| `[letter]` | SplitText chars, `letter-child`, `mask:"chars"`; `yPercent:100→0`; duration **1.2** `power4.inOut` on scroll path `(pdf)`/`(website-research)`; also **1** / `power4.out` on manual play `(agent-2)`; stagger **0.03–0.1** | variants §21 |
| `[opacity]` | `0→1`; duration **1**; `power3.out` | code |
| `[scale]` | `0→1`; origin 50% 50%; duration **1**; `power3.out` `(pdf)` | code |
| `delay` / `data-delay` | `parseFloat` seconds | code |
| `[no-scroll]` | Plays on page enter / after Taxi — **not** ScrollTrigger | code |
| `[parallax]` + `parallax-scrub` (default **1.5**) | `y/x` from `data-y`/`data-x`; ease none; `top bottom`→`bottom top` | `(website-research)` |
| `hoverme` | Per-letter mouse-repel | `(forensic)` |

---

## 9. Formes / magnetism

Function `Kv()`. Collect `img, svg, [class*="-cursor"]`. Store base rotation in `data-formes-base-rot`.

| | Desktop | Mobile ≤767 |
|--|---------|-------------|
| influenceRadius | **460** | **260** |
| maxDistance | **380** | **110** |
| rotForce | **30** | **12** |
| scaleForce | **0.2** | **0.1** |

```
falloff = pow((R - d) / R, 1.6)
x = -cos(angle) * falloff * maxDistance
y = -sin(angle) * falloff * maxDistance
rotation = baseRot - cos(angle) * falloff * rotForce
scale = 1 + falloff * scaleForce
// approach: duration 0.45, ease power4.out, overwrite auto
// return: duration 1.2, ease elastic.out(1, 0.35)
```
**Canonical (code):** all sources agree.

ScrollTrigger on wrapper (`top bottom`→`bottom top`) reapplies pointer (or last / viewport centre) while visible — scroll alone nudges objects. Outside field, viewport centre becomes influence point `(pdf)`.

Field geometry `(pdf)`: absolutely positioned in **55rem**-tall desktop field (~749.6px); five raster objects + six SVG letter/apostrophe shapes. At **479px** and below: field `pointer-events:none` `(pdf)`.

Objects (union): metallic foil, black balloon asterisk, bubble-wrap heart, pink cream, wrapped candy, letter shapes; CDN names include `beton-plastic`, `boule-chelou-coline`, `saussice`, `ballon-bureau`, plus loader cutouts.

---

## 10. Glitch section

On `.section.glitch`:

- Split `.text-block-6` into spans (`ax`); hidden `.finaltext` resolves by scroll
- Velocity: `f = min(|velocity|/3400, 0.45)`; `u += (f - u) * 0.14`; decay `f *= 0.9`
- **22-character** moving window; custom alphabet letters/numbers/symbols; update every **8** animation frames `(forensic)`, `(pdf)`
- ScrollTrigger A: `top bottom`→`bottom top` onUpdate velocity
- ScrollTrigger B: `start top top`, `end center 30%`, `scrub:2`; spans get random `y 40–160`, `x ±10`, `rotation ±20`, `opacity 0`, duration **0.25–0.7**, `power2.in` `(pdf)`; group offsets **0.06** + random delays
- Images: `.glitch-img-w` opacity → **0.3**, scrub 2; `.img-glitch-w` children y `100→-300` scrub 1.5 and `100→-800` scrub 3; `.merguez` yPercent `0→-8`, `.ballon` `0→10`, overflow hidden, image height 110%, scrub 3 from `20% top`→`bottom top`
- Foreground sizes `(pdf)`: first wrapper **28.25×23.125rem**; second **13.4375×18.9375rem**
- Base photo opacity starts **0.8**; wrapper fades to **0.3** `(pdf)`
- Exit: black-to-transparent gradient into footer
- Final resolved line `(forensic)`: *“We create brand experiences for those ready to go beyond the ordinary.”*
- Repeated overlay copy: `we are nothin’` `(forensic)`
- Sticky text composition spans scene `(pdf)`

---

## 11. Works grid / Flip / hover

### Cases (home)

| Name | Line |
|------|------|
| Utopia | Where taste meets meaning. |
| Aurbse | A living instrument for reading territory. |
| In_Cognita | Seize the unexpected: the invisible, made visible. |
| Lgm | Swiss clarity for French engineering. |
| Haptify | Branding the forgotten sense. |

Extra on `/works`: Mova — *The movement, made conscious.*; France Chimie — *From toxic to tomorrow: chemistry, reframed.*

Count: `.nbr-works-w` from `.w-dyn-item` → zero-padded (live **07**; static HTML had **08**) `(pdf)`.

### Grid (desktop 12-col) `(pdf)` + `(forensic)`

| Project | Grid lines | Image height | Card drift y |
|---------|------------|--------------|--------------|
| Utopia | 1/7 | 43.125rem ≈ 587.8px | 0 → +80px |
| Aurbse | 9/13; bottom-aligned | 26.875rem ≈ 366.3px | 0 → −150px |
| In_Cognita | 3/11; next row | 42.25rem ≈ 575.9px | 0 → −100px |
| Lgm | 1/5; bottom-aligned | 26.875rem | 0 → −160px |
| Haptify | 7/13 | 43.125rem | 0 → +100px |

Column gap **1rem**; row gap **14.375rem**. Alternating ~4/6/8-column widths `(forensic)`. Mobile: 6-col; pattern full-width square / 4-col alternating / full-width portrait **343:550** `(pdf)`, `(forensic)`.

### Clip-path reveal constants — Canonical (code) `(website-research)`

```
ZA = inset(100% 0% 0% 0%)      // from bottom
jA = inset(100% 100% 0% 0%)    // corner
JA = inset(100% 0% 0% 100%)    // other corner
QA = inset(0% 0% 0% 0%)        // open
```

Open over **1s** `power4.inOut` when item hits ~**88%** viewport; `toggleActions: play none none none`.

### Layered parallax

- Whole project: `y` 0 → project offset; trigger top bottom→bottom top; `ease:none`; `scrub:1.5`
- Image inside: `yPercent -5 → -20`; trigger top bottom→bottom center; `scrub:3`
- Wrapper `overflow:hidden`; image `width:100%`, `object-fit:cover`

### WORKS Flip letter rail `(pdf)`, `(forensic)`

Five characters of “works” start grouped left; Flip records layout → move into destination wrappers (`.works-word-block-state1` / `state2`). Sticky rail, `top:3rem`, difference blending.

Flip timeline: `power4.inOut`, duration **1.4**, reverse-order stagger **0.2**, `repeat:1`, `yoyo:true`. Letter scale → **0.2** and back to 1 over **0.8** each. ST: works section top/top→bottom/bottom, `scrub:3`.

### CMS video-in-image

Alt metadata can encode MP4 URL + flags (`full`, `portrait`); when video can play, image hides and video crossfades **0.4s**. Full items span 12 cols, others 6; portrait 3:4 `(forensic)`, TECHNICAL.

Intro lines: *Good brands communicate. Great brands surprise.* / *Most brands produce content. We prefer ideas.* / *( The step aside )*

---

## 12. Video / media / CDN URLs (union)

### Videos (Bunny)

| URL | Class | Autoplay | Loop | Muted | Meta | Role |
|-----|-------|----------|------|-------|------|------|
| `https://noth-in.b-cdn.net/nothin-sharp-high.mp4` | `video-hero-bg` | yes | yes | yes | 1890×1080 | Fluid reveal under hero |
| `https://noth-in.b-cdn.net/showreel-nothin_DEF.mp4` | `showreel-light` | yes | yes | yes | 1728×1080 | Showreel shrink |
| `https://noth-in.b-cdn.net/NOTHIN_MANIFESTE_CLEAN.mp4` | `video-sticky` | no* | yes | yes* | 1920×1080 | Studio manifesto (*script-controlled*) |
| `https://noth-in.b-cdn.net/NOTHIN_MANIFESTE_REFLECT_H265.mp4` | `video-reflet` | no* | yes | yes* | (H.265) | Reflection / gloss |
| `https://noth-in.b-cdn.net/freepik__photography-frontal-shot-of-a-huge-large-169-white__495122.webp` | — | — | — | — | still | Bunny still |

Flags commonly: `autoplay loop muted playsinline crossorigin`. SOUND: `.btn-sound` / `.toggle-sound` / `.tick-sound`.

### Studio / museum behaviour `(pdf)` + `(forensic)`

| Part | Motion |
|------|--------|
| Room (`.musee-bg` still) | scale **1.8 → 1.0** |
| Video group | scale **1.4 → 0.35** (100vw base) |
| Frame (`test-cadre-transparent`) | scale **1.01**, `pointer-events:none` |
| Reflection | opacity **0.65**, `blur(80px)` desktop; blur →20px then 10px at narrow breakpoints `(pdf)` |
| Pin | 100vh museum wrapper; `pinSpacing:true`; both scales `ease:none` `scrub:1` |
| Sync | If `|t1−t2| > 0.08s`, secondary corrected to main `(pdf)`; forensic ~0.08s |
| Start | Autoplay removed; pause near **0.001s**; play when gallery top reaches **85%** vh `(pdf)` / near top 85% `(forensic)` |
| Sound UI | Black capsule; fades in **0.5s**; thumb **0.3s**; volume ramp **0.35s**; leave: fade after **1.4s** over **1.6s**; re-entry restores if enabled `(pdf)`. Forensic shorthand: toggle **0.35s**, contextual **1.6s** |
| IO | Non-manifesto videos pause off-screen via IntersectionObserver |

### Work vignettes (collection `6a2679b9acc91890e34df140`)

`work-vignette-utopia-V2`, `aurbse-V2`, `in-cognita-V3`, `lgm-V2`, `haptify-V2` (+ srcset 500/800/1080/1600).

### Other notable stills

`test-cadre-transparent`, `beton-plastic-V2`, `boule-chelou-coline-V2`, `saussice-V2`, `ballon-bureau-V2`, `NOTHIN_KV08_1X1`, loader cutouts (papier, asterix, coeur, bonbon, chwing, sac-plastic, chien, piniata, ballon, cube, bouee, smiley), favicons, `open-graph-3.jpg`.

PDF image tally: 12 loader + 5 portfolio + 2 gallery/frame + 2 studio + 5 object-field + 3 glitch/collage = **29** img elements.

Work imagery portrait-heavy ~1800×2150–2284; occasional ~1800×1500 landscape `(forensic)`.

---

## 13. WebGL fluid / mask-reveal

### Layer order inside `.section-w`

```
z-index 0  video.video-hero-bg   ← reveal media
z-index 1  canvas.mask-reveal-canvas  ← pointer-events:none; inset 0
z-index 2  section.hero-home (#fff) + SVG + UI
```

Factory: `dA({ containerSelector: ".section-w", base, reveal, settings })`. Class `gA`. Settings object `fA`.

### Param block — Canonical (code)

```js
{
  simResolution: 256,
  dyeResolution: 512,
  velocityDissipation: 0.962,
  dyeDissipation: 0.988,       // PDF: falls toward 0.970 with scroll
  pressureIterations: 20,
  curlStrength: 0,             // vorticity idle
  splatRadius: 6e-5,           // = 0.00006
  splatForce: 5900,
  revealSize: 3.9,
  edgeSoftness: 0.5,
  edgeWidth: 0.01
}
```

### Renderer

Three.js WebGLRenderer: `antialias: false`, `alpha: true`, `premultipliedAlpha: false`, `powerPreference: "high-performance"`, DPR `min(devicePixelRatio, 2)`, clear 0, `autoClear: false`.

FBOs: velocity (simRes), pressure (simRes), dye (dyeRes), curlRT, divergenceRT (double-buffered except curl/divergence).

### Shader passes (bundle symbols)

| Symbol | Pass |
|--------|------|
| `nA` | vertex UV quad |
| `sA` | splat |
| `rA` | advection |
| `oA` | curl |
| `aA` | vorticity |
| `lA` | divergence |
| `cA` | Jacobi pressure |
| `uA` | gradient subtract |
| `hA` | final composite |

### Composite fragment (look)

```glsl
uniform sampler2D uBaseTexture;
uniform sampler2D uRevealTexture;
uniform sampler2D uDye;
uniform float uRevealSize;
uniform float uEdgeSoftness;
uniform float uEdgeWidth;
uniform float uBaseImageAspect;
uniform float uRevealImageAspect;
uniform float uPlaneAspect;

vec2 coverUv(vec2 uv, float imageAspect, float planeAspect) { /* object-fit: cover */ }

void main() {
  float dye = texture2D(uDye, vUv).r;
  vec4 baseColor   = texture2D(uBaseTexture,   coverUv(vUv, uBaseImageAspect, uPlaneAspect));
  vec4 revealColor = texture2D(uRevealTexture, coverUv(vUv, uRevealImageAspect, uPlaneAspect));
  float raw  = dye * uRevealSize;
  float mask = smoothstep(uEdgeSoftness, uEdgeSoftness + uEdgeWidth, raw);
  gl_FragColor = mix(baseColor, revealColor, clamp(mask, 0.0, 1.0));
}
```

Equivalent: `raw = dye * 3.9`; `mask = smoothstep(0.5, 0.51, raw)`; `mix(base, reveal/transparent, mask)`.

**Read of look:** tiny radius + huge force → thin violent slit; high dye dissipation → wound stays/creeps then heals; narrow edge → torn liquid/mercury; curl 0 → smear+pressure not ink flourishes. Reference: Pavel Dobryakov WebGL fluid + swap visualiser for this compositor.

### Per-frame `_step`

1. `scrollFade = clamp(-canvasRect.top / canvasRect.height, 0, 1)`
2. `s = 1 - scrollFade²` — force dies as hero scrolls away
3. If mouse moved && `s > 0.001`: splat velocity `(dx,dy)*splatForce*s` + dye
4. Advect velocity; divergence → 20 pressure → gradient subtract; advect dye
5. Bind dye → render

When showreel width &lt; **99%**: `_clearFluid()` + `_renderClean()`, skip sim. SVG rebake on resize debounced **120ms** (`yA`/`MA` XMLSerializer → data URL → Image). Touch-move supported; phone perf not fully tested `(pdf)`.

**Calibration caveat `(pdf)`:** SVG-to-texture compositing failed in one inspection browser — architecture/params confirmed in source; exact brush contour needs GPU recording.

---

## 14. Page structure / sections / routes / nav

### DOM skeleton (home)

```
html.w-mod-js.wf-ibmplexmono-n4-active.wf-active.lenis
  nav.nav-boiler
  .loader (+ .loader-img, .loader-nbr-w, .loader-anim, .loader-c)
  [data-taxi].main-wrapper
    [data-taxi-view].page_view / .page-wrapper
      .section-w
        canvas.mask-reveal-canvas
        video.video-hero-bg
        .section-fake-hero
        section.section.hero-home
          .nothin-hero-w > svg.nothin-hero-svg
      section.section.showreel
        .video-showreel-full-w > video.showreel-light
      section#works.section.works
        .works-word-w / Flip letter blocks
        .work_item.w-dyn-item → a.work-link > .cursor-work
        .formes-w (also appears in studio)
      section#studio-video.section.video
        .musee-w > .musee-bg + video.video-sticky + video.video-reflet
      .section-separator-blur   ← linear gradient despite “blur” name (pdf)
      section#studio.section.info-img
        copy + team + .formes-w
      section.section.glitch
        .glitch-img-w, .text-block-6, .finaltext, .merguez, .ballon
      footer#footer.section-footer
        .footer-nothin-svg …
```

### Routes

- `/` home
- `/works`
- `/works/{utopia,aurbse,in-cognita,lgm,haptify,france-chimie,mova}`
- Anchors: `#works`, `#studio-video`, `#studio`, `#footer`
- Book: `https://calendly.com/sara-noth/30min`
- Hash `#studio-video` special-cased: Lenis-scroll on home, or navigate home then scroll 1.2s `(website-research)`

### Nav behaviour `(forensic)` + `(pdf)`

- Fixed; z-index **1001**; `mix-blend-mode: difference`; wrapper `pointer-events:none` except logo/menu
- Desktop: MENU + four-square icon; hover rotates icon **45°** / **0.5s**; squares shift; links rise `power4.out` **0.6s** stagger **0.08**; **60ms** delayed close
- Mobile &lt;992: click toggle; full wrapper fade **0.5s**; scroll lock; logo fade swap; close reverse; WORKS→HOME off-home; STUDIO hidden off-home
- Logo expansion: viewBox width **338→1398** over **0.7s**; apostrophe translate **−1060→0**; middle letters from SVG y-offset **320**, shuffled, **0.6s** each `(pdf)`
- Menu destinations homepage: works / studio-video / footer; studio jump Lenis duration **1.2**
- Overlay labels: `menu / works / STUDIO / contact / Let’s chat / drop us an email`
- Event `menu:close`

### Footer

- Min-height 1vh; headline *(forensic)*: **Let’s start from nothin’**
- Outlined pills: BOOK A CALL / DROP US AN EMAIL
- Social column; credits baseline; `© 24 . 26`; language EN
- Wordmark entrance `(pdf)`: paths `yPercent:120→0`, shuffled, **1.2s** `power4.inOut`, stagger **0.03**, delay **0.2**; ST wrapper top/95% once; apostrophe scale 0→1 **0.6s** `back.out(0.9)` delay **1.0**
- Path hover: scale **0.05** over **0.6s** `power2.inOut` → back to 1 over **1.8s** `elastic.out(1, 0.8)`; per-path retrigger flag; overflow visible after entry

### Studio copy highlights

Services: Brand identities, Campaigns, Digital experiences, Events, Visual systems.  
*We called it Nothin’ because it started as a paradox…* / *Forms follow perspective.* / *Perspective is where strategy meets visual culture.* / *Nothin’ without people :*

Studio photo motion `(pdf)`: small group **13.5rem** square, wrapper y 0→−100 scrub 1.5; large **43.125×26.25rem**, y 0→−60 scrub 1.5; inner 110% height, small 0→−8% / large 0→+10% scrub 2.5. Top **10rem** gradient separator.

---

## 15. Taxi transitions

```js
new Taxi({
  transitions: { default: Uy, flip: Ny },
  links: 'a:not([target]):not([href^="#"]):not([data-taxi-ignore])',
  removeOldContent: false
})
```

- Fetch `{ headers: { "X-Requested-With": "Taxi" }, credentials: "same-origin" }`
- Fade opacity ~**0.5s** `power2.inOut` (PDF: 0.5s out + 0.5s in)
- Incoming view `position:fixed` then `clearAttrs`/`clearProps`
- `NAVIGATE_END` → `scrollTo(0,0)`; optional hash Lenis 1.2s
- Work links may carry flip transition; next-project can FLIP project imagery
- Attrs: `data-taxi`, `data-taxi-view`, `data-taxi-link`, `data-taxi-ignore`, `data-taxi-nocache`
- Tear down / reinit animations; remasure fonts/media; prevent handler accumulation

---

## 16. Complete class inventory (union, sorted)

_Source: live HTML ↔ `(agent-2)` exact match, **199** tokens. Never drop any._

```
._1 ._2 ._3 ._4 ._6
.apos-cursor .apos-load .arobase .arrow .arrow-head .arrow-icon .arrow-shaft .arrow-w
.balance .ballon .ballon-img .black-blend .bonbon .bonbon-copy .btn .btn-sound .btn__text .btn__text-p
.cadre-video .chewing-gum .chewinggum .code-embed-2 .code-embed-css .coeur .coeur-copy .container .cursor-work
.div-block .div-block-10 .div-block-2 .div-block-3 .div-block-4 .div-block-5 .div-block-6 .div-block-7
.email .etoile .fake-el-menu .fake-img .fake-top-loader .finaltext .footer .footer-c .footer-info .footer-info-w
.footer-nothin-svg .footer-svg-w .formes-w .glitch .glitch-img-w .glitch-text-sticky-w .glitch-text-w
.h-cursor .h1-home .h3-style .hero-home .hide-desk .hide-landscape .hide-tablet .i-cursor .image
.img-ascenseur .img-block-grid .img-block-left .img-block-left-w .img-block-right-w .img-glitch-w .img-work .img-work-w
.info-grid-left .info-grid-right .info-img .info-team .info-w .infobusiness-grid .k .lang-footer .line-arrow
.link .link-boiler .link-btn-menu .link-hero-bottom-w .link-hero-lang-w .link-hero-w .link-lang .link-menu .link-mob
.list .list-dot .list-item .loader .loader-anim .loader-c .loader-img .loader-img-w .loader-nbr-w
.main-wrapper .marg-40 .menu-btn .menu-btn-text .menu-links-w .menu-svg .menu-w .menu_wrapper
.merguez .merguez-img .mob .mob-100 .mob-50 .mob-menu .musee-bg .musee-w
.n-cursor .n-load .nav-apos .nav-boiler .nav-h .nav-i .nav-logo .nav-logo-wrap .nav-n-first .nav-n-last .nav-o .nav-t
.nbr-projects .nbr-works-w .none .nothin-apos .nothin-hero-svg .nothin-hero-w .o
.p-l .p-m .p-s .page-wrapper .page_view .papier .papier-form .pointer-none .r .second .section
.section-fake-hero .section-footer .section-separator-blur .section-w .shape-arrow .short-p-work .showreel .showreel-light
.social-links-w .space-12 .space-150 .space-24 .space-65 .space-87 .star .t-cursor
.text-block-10 .text-block-2 .text-block-3 .text-block-4 .text-block-6 .text-block-7 .tick-sound
.titile-section-work .title-work .toggle-sound .video .video-hero-bg .video-reflet .video-showreel-flip
.video-showreel-full-w .video-showreel-w .video-sticky .video-w .view-all-btn
.w--current .w-dyn-item .w-dyn-items .w-dyn-list .w-embed .w-inline-block .white
.work-link .work-view-all-w .work_item .work_list .work_list_w .works .works-word
.works-word-block-state1 .works-word-block-state2 .works-word-w
```

**Injected / runtime (not all in static HTML class list):** `.mask-reveal-canvas`, `.line-child`, `.letter-child`, `.line-mask-child-mask`, `.letter-mask-child-mask`, `html.lenis`, Webflow `w-mod-js`, `wf-active`, `wf-ibmplexmono-n4-active`.

**Mentioned in teardowns as Flip/CMS helpers:** `.work-list-img`, `.work-item-img`, `.work-img`, `title-work-flip` (TECHNICAL) — verify in bundle if rebuilding Flip grid.

---

## 17. IDs + data-* attrs (union)

### IDs

```
#footer
#studio
#studio-video
#works
#w-node-_01baddd9-d465-59de-ee3e-5a9211c9095b-78a9d1a3
#w-node-_3bffa28f-e2c9-e1ae-1640-a1877cc8ebf8-78a9d1a3
#w-node-_4052a9ed-bc85-74d6-2f8d-4f251e3cf60d-78a9d1a3
#w-node-_5df3fb26-e0d9-a608-cc8d-469d5b5a1816-78a9d1a3
#w-node-_5df3fb26-e0d9-a608-cc8d-469d5b5a1817-78a9d1a3
#w-node-_6684bafa-bc0c-93bc-385e-a867f46e25c6-78a9d1a3
#w-node-_873b8711-445d-2907-3f1f-fca36caf4d24-78a9d1a3
#w-node-_873b8711-445d-2907-3f1f-fca36caf4d25-78a9d1a3
#w-node-_8c8bfc91-8576-abe0-d854-49082250bec5-78a9d1a3
#w-node-_92fe2b40-7a92-f80a-554b-04fcd6a444e3-d6a444d6
```

### data-* / attributes (HTML + JS systems)

| Attr | Role |
|------|------|
| `data-taxi` | Taxi root |
| `data-taxi-view` | View container |
| `data-taxi-link` | Soft-nav link |
| `data-taxi-ignore` | Exclude from Taxi |
| `data-taxi-nocache` | No cache `(agent-2)` |
| `data-wf-domain` / `data-wf-page` / `data-wf-site` | Webflow |
| `data-delay` / `delay` | Reveal delay seconds |
| `data-formes-base-rot` | Formes base rotation |
| `data-y` / `data-x` | Parallax targets |
| `line` / `letter` / `opacity` / `scale` / `no-scroll` / `parallax` / `parallax-scrub` | Reveal system |
| `hoverme` | Letter mouse-repel `(forensic)` |

### Custom events

`loader:hero-reveal-start`, `loader:hero-revealed`, `menu:close`, Taxi `NAVIGATE_END`

### Session / storage

`sessionStorage["nothin:loader-played"] = "1"`

---

## 18. Full URL inventory (union, deduped)

### App / site / fonts / analytics / social / booking

- `https://www.noth.in` / `https://noth.in`
- `https://nothinv1.netlify.app/main.js`
- `https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js`
- `https://fonts.googleapis.com`
- `https://calendly.com/sara-noth/30min`
- `https://www.awwwards.com/sites/nothin`
- `https://www.behance.net/nothintoshow`
- `https://www.linkedin.com/company/nothin/`
- `https://www.linkedin.com/in/thomas-carre/`
- `https://www.linkedin.com/in/guillaume-perrette-02168474/`
- `https://fr.linkedin.com/in/pierre-patrault-7070a536`
- Instagram linked in UI (exact profile URL not captured in dumps — keep as open item §21)
- GTM `GTM-TXXTT3WJ` / GA4 `G-HHTL91GJ73` / Metricool

### Bunny video/still

- `https://noth-in.b-cdn.net/nothin-sharp-high.mp4`
- `https://noth-in.b-cdn.net/showreel-nothin_DEF.mp4`
- `https://noth-in.b-cdn.net/NOTHIN_MANIFESTE_CLEAN.mp4`
- `https://noth-in.b-cdn.net/NOTHIN_MANIFESTE_REFLECT_H265.mp4`
- `https://noth-in.b-cdn.net/freepik__photography-frontal-shot-of-a-huge-large-169-white__495122.webp`

### Webflow CSS/JS

- `https://cdn.prod.website-files.com/6a0c501c42b9751b78a9d1a7/css/nothin-preprod.webflow.6a0c501c42b9751b78a9d1a3.b01624eef.opt.min.css`
- `https://cdn.prod.website-files.com/6a0c501c42b9751b78a9d1a7/css/nothin-preprod.webflow.shared.5cfd77a08.min.css`
- `https://cdn.prod.website-files.com/6a0c501c42b9751b78a9d1a7/js/webflow.751e0867.148dc658e77a3916.js`
- `https://cdn.prod.website-files.com/6a0c501c42b9751b78a9d1a7/js/webflow.schunk.7321a5097fb66f41.js`

### Site assets (`6a0c501c42b9751b78a9d1a7/…`) — keep all variants

- `…/6a101bf3288a762026817436_papier-froisse.webp` (+ `-p-500/800/1080`)
- `…/6a101bf33377567d8f2bd507_asterix.webp` (+ `-p-500/800/1080/1600`)
- `…/6a101bf4026551468ed05521_coeur-bulle-nb.webp` (+ `-p-500/800/1080/1600/2000`)
- `…/6a101bf4d60716b3d6959657_bonbon.webp` (+ `-p-500/800/1080/1600/2000`)
- `…/6a101c34913dd6111b16324e_chwing.webp` (+ `-p-500/800/1080`)
- `…/6a281a4f86f15756a04aa88e_test-cadre-transparent.webp` (+ `-p-500/800/1080/1600`)
- Favicons: `6a2ec8bc…`, `6a2ec8c30b…`, `6a2ec8c318…`, `6a2ec8cf56…`, `6a2ec8cf62…`, `6a2ec8cfdd…`
- `…/6a2ecb5b635d5e15f3be5005_open-graph-3.jpg`
- `…/6a3171d9fb2a39d8054e9252_beton-plastic-V2.webp`
- `…/6a317205d7b275b2d2985000_boule-chelou-coline-V2.webp` (+ `-p-500/800`)
- `…/6a31722974b25426299f5e83_saussice-V2.webp` (+ `-p-500`)
- `…/6a3172364e89f407c6f0469a_ballon-bureau-V2.webp`
- `…/6a32453603101dc16b515779_…_260407_NOTHIN_KV08_1X1.webp` (+ `-p-500/800/1080/1600`)
- `…/6a3a70843445399a04fbee92_bouee.webp` (+ `-p-500`)
- `…/6a3a70847eeb828c7456d387_cube.webp`
- `…/6a3a708485f3984771b5bfc0_sac-plastic.webp`
- `…/6a3a708485f3984771b5bfd6_chien.webp`
- `…/6a3a7084cbb4dfa4268c289f_smiley.webp`
- `…/6a3a7084cd10902f9b8c60cb_ballon.webp`
- `…/6a3a7084f7d5b72a2a90fb9f_piniata.webp`

### Works collection assets (`6a2679b9acc91890e34df140/…`)

- utopia-V2 / aurbse-V2 / in-cognita-V3 / haptify-V2 / lgm-V2 — each with `-p-500/800/1080` (+ 1600 where listed for in-cognita)

Base host: `https://cdn.prod.website-files.com/`

---

## 19. Timing / easing / duration cheat-sheet (union)

### Eases seen

`power1.in/out`, `power2.in/out`, `power3.in/out`, `power4.in/out`, `back.out(0.9)`, `back.out(1.2)`, `back.out(1.8)`, `elastic.out(1, 0.35)`, `elastic.out(1, 0.8)`, `ease:none` (scrubs)

### Durations / key constants

| Constant | Value | Context |
|----------|-------|---------|
| Lenis duration | **1.2** | Smooth scroll |
| Lenis touchMultiplier | **2** | |
| Loader N / apos | **1.0s** `power4.inOut` | |
| Loader gap open | **1.2s** | 1→20rem |
| First object | **0.8s** delay 0.5, `back.out(0.9)`, rot 15° | |
| Object swap | **0.32s** `back.out(1.2)` | interval sine 500↔100ms |
| Counter | **6.667s** `power2.inOut` 100→000 | code `ef/750` |
| Loader collapse height | **1.8s** `power4.inOut` | |
| Hero letters | **1.8s** stagger **0.07** delay 0.2 | |
| Hero apos | **0.6s** `back.out(0.9)` delay 1.5 | |
| Work pill show/hide | **0.6** / **0.38** | lerp **0.09** |
| Formes move/return | **0.45** `power4.out` / **1.2** `elastic.out(1,0.35)` | |
| Line reveal | **1s** stagger 0.05 | |
| Letter reveal | **1.2s** (scroll) / **1s** (manual path) | stagger 0.03–0.1 |
| Opacity/scale reveal | **1s** | |
| Showreel scrub | **3** | 100%→33.3%/35% |
| Works Flip | **1.4s**, stagger 0.2 rev, yoyo | letter scale 0.8s to 0.2 |
| Works clip reveal | **1s** at 88% | |
| Works drifts | scrub **1.5** / inner **3** | |
| Museum scales | scrub **1** | 1.4→0.35 / 1.8→1.0 |
| Sound | in 0.5; thumb 0.3; vol 0.35; leave delay 1.4 then 1.6 | |
| Taxi fade | **0.5s** `power2.inOut` | |
| Button arrow | in 0.4 / out 0.8; factor **1.45** | view-all **2×** ~0.45 |
| Nav menu | 0.6 stagger 0.08; close delay **60ms**; icon 0.5 | |
| Logo expand | viewBox **0.7s** | letters 0.6 from y 320 |
| Footer paths | **1.2s** stagger 0.03; apos 0.6 delay 1.0 | hover 0.6→1.8 elastic |
| Glitch fall | 0.25–0.7; scrub 2; velocity/3400 cap 0.45; lerp 0.14 | every 8 frames |
| Fluid | splatRadius **6e-5**, force **5900**, reveal **3.9**, edge 0.5/0.01 | dye 0.988→~0.970 |
| Resize rebake | debounce **120ms** | |
| Fonts fallback | **1000ms** | |
| Video sync slop | **0.08s** | start near 0.001s |
| Link underline | 0.6 + 0.6 | |
| `@` hover | 0.2 / 0.2 scale 1.2 | |
| Small logo show | after 10% vh; 0.4 / 0.3 | |
| Breakpoints | **991/992**, **767**, **479** (+ min 768) | |

Durations also seen in bundle: `0, .2, .3, .32, .38, .4, .45, .5, .6, .7, .8, 1, 1.2, 1.4, 1.8, 2` `(agent-2)`

---

## 20. Rebuild blueprint / priority (merged, practical)

Do **not** start with a global custom cursor library.

### Phase A — static art direction
Black/white only; PP Neue Montreal (or legal stand-in) + IBM Plex Mono; SVG wordmark ~1408×294 that clips; sticky N'; corner UI; cut-out objects; 12-col / 6-col grids.

### Phase B — loader ritual
Session-gated ~5–7s theatrical loader: N + object-in-O + 100→000 mono counter + object cycle + height→0 curtain 1.8s.

### Phase C — name drop
Shuffle paths; yPercent 120→0, 1.8s, stagger 0.07; apos back.out(0.9).

### Phase D — fluid hero
Three.js ping-pong fluid with exact `fA` constants; `mix(base,reveal,smoothstep(dye))`; kill when showreel &lt;99%; DPR cap 2. Reference Dobryakov fluid.

### Phase E — scroll machine
Lenis 1.2 `smoothTouch:false`; showreel 100→33.3/35 scrub 3 (desktop); SplitText at top 95%; works Flip + clip + explore pill; museum pin dual-scale; magnetic formes; velocity glitch.

### Phase F — routes (optional)
Taxi or simpler view-swap; flip transition is flavour.

### Component split `(pdf)`
Loader, HeroReveal, Navigation, Showreel, WorksGrid, MuseumFilm, StudioEditorial, ObjectField, GlitchScene, Footer — each owns timelines + cleanup.

### Suggested stack
GSAP + ScrollTrigger + SplitText (or SplitType) + Flip; Lenis; Three.js; Vite; own CDN H.264 (+ optional H.265); CMS optional. Webflow not required — magic is in `main.js`.

### Fidelity tiers

| Effect | Full | Approx |
|--------|------|--------|
| Hero fluid | Port multipass | Single dissolve / CSS mask |
| Glitch | Velocity scramble | Enter-only scramble |
| Flip works | GSAP Flip + CMS alts | CSS grid + hover video |
| Taxi | Soft multi-page | Full reload / View Transitions |

### Steal vs ignore `(website-research)`
**Steal:** loader-as-identity; wordmark-as-layout; fluid dye *mask*; heavy Lenis + long scrubs; masked type slides; local cursor only on work cards; objects as characters; two-colour discipline.  
**Ignore:** Webflow dummy nodes; Metricool/GTM; exact case content; Taxi unless needed; curl/vorticity (zeroed); no `prefers-reduced-motion` in original — **add** it in a new build `(pdf)`.

### Priority constants (copy-friendly) `(agent-2)` + `(pdf)`
1. Lenis 1.2 + expo easing + smoothTouch false  
2. Reveal attrs + delays  
3. Work cursor lerp 0.09, show 0.6/back.out(1.8), hide 0.38/power3.in  
4. Formes 460/380/30/0.2, falloff ^1.6, elastic return  
5. Fluid `fA` block  
6. Fonts PP + IBM Plex Mono (license PP)  
7. Showreel shrink ≠ museum zoom (two systems)  
8. Taxi if multi-page matters  

### Production checks `(pdf)`
Compare settled hero / project pairs / museum pin midpoints / formes / glitch / footer at reference viewport; test slow/fast/reverse scroll, resize after fonts, return from case study; WebGL fallback; reduced motion; keyboard focus; video codec fallbacks.

### Content inputs needed later
Name/wordmark letter for loader object-slot; proposition + CTA; 5 featured projects; motion media set; studio imagery/objects; contact/social destinations.

### Legal
Do not ship their assets, PP files, or shaders verbatim without licenses. Architecture reference for a **similar** experience.

### Bundle symbols (for reading `main.js`)

| Symbol | Meaning |
|--------|---------|
| `F` | GSAP |
| `Oe` | ScrollTrigger |
| `lo` | SplitText |
| `ly`/`cy()` | Lenis |
| `wy`/`Fy()` | Taxi |
| `gA`/`dA`/`mA`/`pA`/`fA` | Fluid class / create / layers / destroy / settings |
| `vM` `_M` `O_` `mM` `gM` `tf` | Loader + hero |
| `F_` | session key string |
| `Ev` | showreel |
| `Kv` | formes |
| `$A` | explore cursor |
| `L_` | button arrow |
| `a_`/`Gy` | reveal attrs |
| `hA`/`sA`/`rA`/`lA`/`cA`/`uA` | shaders |

### Local artifacts

`/workspace/noth-in-teardown/` — `TECHNICAL.md`, `index.html`, `js/app/main.js`, `shader-reveal-excerpt.glsl.txt`, CSS, awards scrape.  
Forensic screenshots under `/downloads/cloud-browser-20260919-*.png`.

---

## 21. Open questions / contradictions log

| # | Topic | Variants | Resolution |
|---|-------|----------|------------|
| 1 | Explore pill label | `EXPLORE →` `(agent-2)` vs lowercase `explore` + arrow `(website-research)` `(forensic)` `(pdf)` | Prefer live DOM/CSS: monospace **explore** + SVG arrow; agent-2 may be stylised |
| 2 | Explore pill size | ~97×17 `(website-research)` vs ~91×16 `(forensic)` | Both eyeball; **Canonical:** padding/type from `(pdf)` |
| 3 | `[letter]` duration/ease | 1s `power4.out` `(agent-2)` vs 1.2s `power4.inOut` scroll `(pdf)`/`(website-research)` | Keep both paths; scroll path 1.2 / manual play may differ |
| 4 | Letter stagger | `.1` `(agent-2)` vs `.03–.1` range | **Canonical:** range 0.03–0.1 in bundle |
| 5 | Counter duration | 6.667s configured `(pdf)` vs ~5s object budget `(forensic)` vs `ef/750` `(website-research)` | Same choreography; 6.667s is tween length; ~5s is perceived object window |
| 6 | Session flag when set | On begin `(pdf)` vs after play `(website-research)` | Verify in `main.js`; behaviour = skip on revisit |
| 7 | Nav colour strategy | `mix-blend difference` `(forensic)` `(pdf)` vs section flip `(website-research)` | Likely both: difference blend *is* the flip mechanism |
| 8 | Showreel disable breakpoint | &lt;992 `(website-research)` vs ≤991 `(pdf)` | Same CSS boundary (`max-width:991px`) |
| 9 | Sound timings | forensic 0.35/1.6 vs pdf 0.5/0.3/0.35/1.4+1.6 | Prefer **(pdf)** finer breakdown; forensic is summary |
| 10 | Project count | Live 07 vs HTML 08 | JS counts CMS; not decorative |
| 11 | Splat radius | `6e-5` vs `0.00006` | Identical |
| 12 | GTM vs GA4 | TECHNICAL lists `G-HHTL91GJ73` as GTM; website-research separates `GTM-TXXTT3WJ` + GA4 | Prefer `(website-research)` |
| 13 | Credits OCR | PDF “Patrault/Carre/Perrette” | Prefer console **Carré / Patrault / Perrette** |
| 14 | Awwwards date/score | 10 Aug 2026 / 7.45 | Only in `(website-research)` — retain |
| 15 | Instagram URL | Mentioned, not captured as absolute URL | Open: fetch from live footer if needed |
| 16 | Fluid visual contour | Params confirmed; brush look not visually verified in one session `(pdf)` | Recalibrate on GPU browser |
| 17 | `prefers-reduced-motion` | Absent in original | Add in rebuild; don’t copy omission |
| 18 | InertiaPlugin | GSAP marketing lists Inertia; string absent in bundle TECHNICAL | Likely Lenis feel, not plugin |
| 19 | Footer headline | “Let’s start from nothin’” `(forensic)` not in website-research copy dump | Keep; forensic live observation |
| 20 | Formes at 479px | `pointer-events:none` `(pdf)` only | Keep as responsive rule |
| 21 | Dye dissipation scroll | Base 0.988; PDF says falls toward 0.970 | Keep both — scroll-modulated |
| 22 | Mobile testing | Source-derived; phone viewport often untested | Treat mobile numbers as code-true, UX-unverified |
| 23 | Case-study pages | Homepage-complete; not full case-study audit `(pdf)` | Scope boundary |

### Open build questions (from agents — for later user context)

- Which letter gets the loader object slot for the new brand?
- Own objects / videos inventory?
- Hero reveal = showreel / product / stills?
- Single long page vs works/studio/contact routes?
- PP Neue Montreal license vs substitute?
- Desktop-first only (showreel shrink already off &lt;992) or full mobile parity?
- Fluid on touch / mobile at all?

---

## Appendix A — Full home copy extract `(website-research)`

```
Not a style, a perspective.
Because Nothin’ is Everythin’.
book a call
Creative studio in Paris
LKDN / Linkedin
Instagram / insta
EN

Most brands produce content.
We prefer ideas.
( The step aside )
In a world of infinite images, the rare thing is
clarity. Images defend ideas, experiences
shift perception, and brands change how
people see the world.

Good brands communicate.
Great brands surprise.

Utopia / Where taste meets meaning. / explore
Aurbse / A living instrument for reading territory. / explore
In_Cognita / Seize the unexpected: the invisible, made visible. / explore
Lgm / Swiss clarity for French engineering. / explore
Haptify / Branding the forgotten sense. / explore

View all / 07 / © 24 . 26
Sound / ( The Studio )

We called it Nothin’ because it started as a
paradox, an empty space open enough to
become anything: a campaign, a space, an
event, a system... or something unexpected.

Forms follow perspective.
We design : Brand identities / Campaigns /
Digital experiences / Events / Visual systems

Perspective is where strategy meets visual culture.
Nothin’ without people :
founders & management — Sara Guedj, Anne-Sophie Do,
Gabriel Guedj, Guillaume Fayolle
creative partners — Pierre Patrault, Thomas Carré, Guillaume Perrette
```

Plus forensic footer line: *Let’s start from nothin’* · glitch resolve: *We create brand experiences for those ready to go beyond the ordinary.*

---

## Appendix B — Interaction model cheat-sheet

| Surface | Pointer | Scroll | Notes |
|---------|---------|--------|-------|
| Loader | none | locked | session-once |
| Hero | OS arrow + fluid splat | letters in; sim fades | dye hole → video |
| Hero CTA | arrow ×1.45 | — | pill |
| Showreel | default | 100%→33.3×35% scrub 3 | desktop ≥992 |
| Works | cursor none, explore pill | Flip + clip + parallax | lerp 0.09 |
| Museum | sound toggle | pin dual-scale | sync 0.08s |
| Studio objects | flee + elastic | ST keeps influence | r=460 |
| Studio type | letter repel | masked reveals | |
| Glitch | — | velocity scramble + fall | /3400 |
| Footer | path squash springs | oversized mark | |
| Menu | overlay / hover rows | Lenis stop when open | difference blend |
| Route | — | Taxi default/flip | |

---

*End of MASTER union. Sources read in full; PDF text extracted via pdftotext. Optional TECHNICAL used for cross-check only.*
