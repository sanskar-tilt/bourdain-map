# noth.in — what their minimum bar of craft costs, in numbers

Fetched 2026-08-16: `index.html`, both Webflow stylesheets, `webflow.js`, and
the real payload — a 752KB ES module served from `nothinv1.netlify.app/main.js`.

Credited in their own console log: dev Thomas Carré, design Pierre Patrault,
visuals Guillaume Perrette.

For reference only. Nothing here is to be copied — the point is to know what
the numbers actually are, so "polished" stops being a feeling and becomes a
spec.

---

## 0. The structural finding, which changes how you read everything else

**There are zero `data-w-id` attributes on the page and no IX2 interaction
data anywhere.** Webflow is being used as an HTML/CSS shell and nothing else.
Every piece of motion is hand-written and shipped separately:

```
Webflow page  →  loads  →  https://nothinv1.netlify.app/main.js   (752 KB, ESM)
                            built with Vite (a dev branch points at
                            localhost:3000/@vite/client)
```

So the comparison isn't "our hand-built site vs. their no-code site". It's a
custom GSAP application wearing a Webflow shell. The craft is bought with a
dedicated developer and 752KB of JavaScript, not with a tool.

**Stack, by occurrence count in the bundle:** GSAP 3.13.0 (65), Observer (16),
Lenis (14), Flip (10), ScrollTrigger (4), ScrollSmoother (3), a trace of three.js
(1). Page transitions via Taxi.js (`data-taxi`, `data-taxi-view`,
`data-taxi-link` on the page).

---

## 1. Type

**Two families, plus a mono for labels only.**

| Role | Face | Loaded via |
|---|---|---|
| Display + UI | PP Neue Montreal | self-hosted `@font-face` |
| Body alternate | PP Neue Montreal **Book** | self-hosted `@font-face` |
| Micro-labels only | IBM Plex Mono 400 | Google, `WebFont.load` |

PP Neue Montreal is a commercial face (Pangram Pangram). IBM Plex Mono is
free. Three weights in use across the whole site: **400, 500, 700**. Nothing
else.

### The scale

Everything is `rem` at a 16px root. Sorted, with the role each size carries:

| rem | px | Used for | line-height | tracking |
|---|---|---|---|---|
| 5 | 80 | `h1`, `.h1-home` | **1** | −0.01em |
| 3.75 | 60 | `h2` | **1** | −0.01em |
| 3.25 | 52 | case-study titles, project numbers | — | — |
| 2.5 | 40 | `h3`, big buttons, `.h1-home` (mobile) | 1 / 1.1 | −0.01em |
| 1.875 | 30 | `.works-word` | — | −0.03em |
| 1.5625 | 25 | `h4`, `.p-l`, footer links | 1 / 1.2 | 0 |
| 1.25 | 20 | `h5`, descriptions, dates | 1.2 | — |
| 1.125 | 18 | `.p-m`, body blocks | 1 / 1.2 | — |
| 1 | 16 | `p`, loader | 1.4 | 0.05em (loader) |
| 0.875 | 14 | `.p-s`, `.footer-info`, body default | 1.1 / 1.2 | 0 |
| 0.75 | 12 | every uppercase micro-label | **1** | **0.03em** |
| 0.625 | 10 | smallest label | — | — |

**The ratios that matter:**

- Display steps run roughly **×1.33** (80 → 60 → 40), then the text range
  tightens to **×1.11–1.25** (25 → 20 → 18 → 16 → 14 → 12). Big jumps at the
  top, fine gradations at the bottom. That is the whole trick of a scale that
  feels designed rather than picked.
- **`1.5625rem` = 25px** is the giveaway. Nobody arrives at 25px from a
  formula; it is a decision, and it recurs five times. A scale with one odd,
  deliberate number in it reads as authored.
- **Line-height is 1 on everything display-sized.** Not 1.1, not 1.2. Set
  solid. Body is 1.4, mid-sizes 1.2.
- **Tracking is a two-value system.** Negative (−0.01em, occasionally −0.03em)
  on anything large; **+0.03em on every uppercase micro-label**, always at
  12px, always with line-height 1. Six of each. Nothing in between.

So: three weights, two tracking values, three line-heights, eleven sizes. The
restraint is the craft — not the quantity of decisions but how few distinct
values are reused everywhere.

---

## 2. Motion

Almost nothing is CSS. The whole stylesheet contains **one** `@keyframes`
(a spinner), **four** transitions (`.1s`, `.3s`, `.4s`, `.8s`), and **zero**
`cubic-bezier()` declarations. Every considered movement is GSAP.

### Easing vocabulary, by frequency

| Ease | Count | What it's for |
|---|---|---|
| `none` | 53 | scrub-linked — position follows scroll exactly, no smoothing on the tween itself |
| **`power4.inOut`** | **33** | the house curve: big, slow-in-slow-out reveals |
| `power4.out` | 16 | entrances — fast start, long settle |
| `power2.inOut` | 9 | smaller state changes |
| `power2.out` | 6 | small entrances |
| `power3.out` | 4 | — |
| `power2.in` | 4 | exits |

Two curves do 49 of ~120 eased tweens. `power4` is aggressive —
`power4.out` is roughly `cubic-bezier(0.16, 1, 0.3, 1)`, that long luxurious
deceleration. Everything scroll-driven uses `none`, because the scroll
position *is* the easing.

### Durations, by frequency

```
0.6s ×13    0.5s ×11    1.0s ×9    1.2s ×7    0.4s ×7
0.8s ×5     0.7s ×4     1.8s ×3    0.45s ×3   2.0s ×2
```

Median **0.6s** — considerably slower than the 200–300ms typical of UI work.
This is editorial pacing, not interface pacing. Note the near-absence of
anything under 0.3s: they have essentially no "snappy" register.

### Staggers

`0.03` · `0.05` · `0.07` · `0.08` · and one `{each: 0.2, from: "end"}`.

Character-level staggers sit at 30–80ms. The `from: "end"` variant animates a
group backwards — a detail that costs nothing and is instantly legible.

### What triggers what

| Trigger config | Count | Meaning |
|---|---|---|
| `once: true` | 16 | **most entrances play exactly once** and never replay |
| `toggleActions: "play none none none"` | 6 | same intent, stated the other way |
| `start: "top 95%"` | 5 | fire just before the element is fully on screen |
| `start: "top 88%"` | 2 | slightly later variant |
| `start: "top top"` | 9 | pinned sections |
| `end: "bottom top"` | 11 | run until fully scrolled past |
| `scrub: 3` | 5 | very heavy smoothing |
| `scrub: 2` / `1.5` | 4 | moderate |

Two clear categories:

1. **Entrances** — `start: "top 95%"`, `once: true`, `power4.out`, 0.6–1.2s.
   They happen once and are then permanent. Nothing re-animates when you
   scroll back up, which is what makes the page feel like a document rather
   than a toy.
2. **Scroll-linked** — `scrub: 1.5–3`, ease `none`, `start: "top top"`,
   `end: "bottom top"`. `scrub: 3` means the animation lags scroll by three
   seconds of catch-up. That is a very high value and is where the "expensive"
   feeling comes from.

### Smooth scroll

Lenis, `duration: 1.2` with a custom easing function, `wheelMultiplier: 1`,
`smoothWheel` and `syncTouch` both configurable. 1.2s is long — the page keeps
gliding well after the wheel stops.

---

## 3. The marquee — there isn't one

No `marquee` class exists in the HTML, the CSS, or the bundle. The infinite
horizontal text is the standard GSAP loop:

- `xPercent` for transforms (percentage-based, so it survives resize)
- `repeat: -1`
- `modifiers` with a wrap function, so the value cycles within a range instead
  of growing forever
- ease `none`

The wrap-in-a-modifier is the whole technique: one tween runs forever, and the
modifier folds its output back into range each frame. No cloning nodes, no
scroll listener, no drift.

---

## 4. The letter split — hand-rolled, not SplitText

GSAP's SplitText plugin is **not** in the bundle. They wrote their own:

- `textContent.split("")` for characters
- `split(" ")` for words (15 occurrences)
- `createElement("span")` to wrap each fragment
- results exposed as `.chars`, `.words`, `.lines` — the same API shape as
  SplitText, so the animation code reads identically

Then `.chars` is staggered at 0.03–0.08s with `power4.out`.

Worth noting what that buys and costs: SplitText is a paid GSAP plugin, so
this is maybe 40 lines to avoid a licence. The line-splitting is the hard part
(it needs measurement and re-splitting on resize) — and they have
`ResizeObserver` in the bundle four times, which is where that goes.

---

## 5. Layout

Webflow's default breakpoints, untouched:

```
@media (max-width: 991px)   tablet
@media (max-width: 767px)   landscape phone
@media (max-width: 479px)   portrait phone
```

**Grid.** A 12-column grid is defined (`1fr` ×12) but barely used. The actual
page is built from:

| Template | Count |
|---|---|
| `1fr 1fr` | 8 |
| `1fr` | 4 |
| `.75fr 1fr` | 3 |
| `1fr ×12` | 2 |
| `1fr ×6` | 1 |
| `1fr 1fr 1fr` | 1 |

The interesting one is **`.75fr 1fr`** — a deliberately asymmetric two-column
split, used three times. Not 1:1, not a 12-col span. That asymmetry is doing
more for the page's character than the 12-column grid is.

**Gaps** cluster on three values: `1rem` (16), `2.5rem` (40), `6.25rem` (100).
Again — 6.25rem is a chosen number, not a formula.

---

## 6. Small things that add up

- **The loader plays once per session.** A `sessionStorage` key
  (`nothin:loader-played`) injects a style tag hiding the loader on repeat
  visits — before the bundle even loads, so there is no flash. Cheap, and it
  is the difference between an intro that is charming and one that is a tax.
- **Credits in the console**, styled with `%c`.
- Body default is 14px / line-height 1.1 with PP Neue Montreal at weight 500.
  Small, tight, medium — a deliberately "designed" default rather than 16px
  regular.

---

## 7. What the bar actually consists of

Stripped of taste, the measurable parts:

1. **Eleven type sizes, three weights, two tracking values, three
   line-heights.** Reused relentlessly. At least one number in the scale is
   odd and deliberate (25px, 100px gap).
2. **Line-height 1 on everything display-sized.** Solid setting.
3. **+0.03em on every uppercase micro-label**, always at 12px. Negative
   tracking on everything large.
4. **Two easing curves carry the whole site** (`power4.inOut`, `power4.out`),
   plus `none` for anything scroll-linked.
5. **Median duration 0.6s.** Nothing under 0.3s. Editorial pacing.
6. **Entrances fire once at `top 95%` and never replay.**
7. **Scrub values of 1.5–3** on the slow scroll-linked pieces.
8. **Staggers of 30–80ms** at character level.
9. **An asymmetric column split** (.75fr 1fr) doing the compositional work.
10. **752KB of custom JavaScript** and a named developer.

### What of this is transferable to us, honestly

Points 1–8 are free — they are numbers in a token file and arguments to a
tween. We already have a tokens file; our scale is currently seven sizes with
one tracking value, and our motion is one curve at 140–300ms.

Point 10 is not free, and we should not pretend otherwise. A 752KB GSAP
application is the opposite of our 422KB budget miss being a problem — they
spent nearly twice that on motion alone, on a site with perhaps twenty
screens. We have 2,844 pages and a map that must hold 60fps. Their bar is
reachable in type and timing; it is not reachable in motion volume, and
copying the volume would wreck the thing that actually matters here.

The one idea worth stealing outright is **`once: true`**: things settle and
stay settled. A map that re-animates every time you pan would be intolerable,
and that principle is free.
