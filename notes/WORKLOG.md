# Worklog — six-step run

Blunt by instruction. One entry per step; blockers and disagreements recorded
here rather than worked around.

---

## Step 1 — remove the pull-back  ✅

Deleted `HeroPullback.tsx`, its section in `page.tsx`, all `.pullback` /
`.pullStage` / `.pullWorld` / `.pullPhoto` / `.pullCredit` CSS, the leftover
`pinWrap`/`pinSticky`/`heroMedia` CSS from the *earlier* pinned hero (also
dead, also reading `--p`), and both pull-back tests. New acceptance check:
zero `[data-pin]`, zero inline `--p` on the homepage — passes.

Judgement calls, stated rather than hidden:

- **The scroll cue died with the component.** It lived inside HeroPullback, so
  for exactly this commit the arrival's "cue" phase advances but animates no
  element. It returns with the fluid hero in step 2. The phase-order test
  still passes because it reads the `data-opening` attribute, not the cue.
- **`.arrival-photo` CSS in globals is now orphaned** (the hero photo it
  targeted is gone). Left in place: step 2's hero wants the same entrance.
- **Kept the `[data-pin]` skip in the opacity audit.** It is dormant until
  step 6 reintroduces exactly one pinned element, which will need it.
- **`world.json` (26KB) still exports and still ships.** Nothing fetches it
  right now; step 2's build-time map image will be generated from it, so the
  export stays.

---

## Step 2 — the fluid hero  ✅

BOURDAIN at `clamp(3rem, 17.5vw, 21rem)`, one line, plain text — not the
photo-O mark, which would have split the word. `pointer-events: none` and
z-indexed above the canvas; nothing touches it.

The map layer is `public/data/world-map.png` — 2,095 pins rasterised from
`world.json` via sharp at build time (55KB, chained into prebuild). Never a
live map.

The sim is stable fluids in ~370 lines of WebGL2: advect → divergence →
20 Jacobi iterations → gradient subtract → advect dye, splat on pointer move.
Constants as specified: vel 0.962, dye 0.988, curl 0, edge soft 0.5. Sim grid
160-wide, dye 640-wide, upscaled. Display pass mixes ground → map by
smoothstepped dye. Driven from the shared Lenis rAF loop; pauses off-screen
via IntersectionObserver; skips all sim work when the ink has fully healed.

Gates verified by test, not by reading: reduced motion → zero canvas, word
visible. WebGL nulled via getContext override → same, ground colour intact.
900px viewport → zero canvas. Context loss → torn down to static.

**Budget, measured honestly:** the compositor is vsync-locked at 16.7ms and
shows **17.6ms worst-case jitter with the sim completely idle** — so the
brief's literal "no frame over 16ms" is unmeasurable as rAF intervals; even
an empty page fails it. The assertion is "no missed vsync" (< 25ms, where a
real miss is ~33ms). Under 60 synthetic moves: median 16.7ms, worst 17.5ms —
*below* the idle baseline's worst. The sim fits inside the frame with room.
Did not need to cut pressure iterations or resolution.

Disagreements, done-then-logged:
- "The type does not move": the hero has **no** arrival animation at all now
  — the earlier opening spec had the hero photo settling in during the
  curtain, but the photo is gone and I did not transfer that settle to the
  word, reading "does not move" strictly. The `.arrival-photo` CSS in globals
  is now genuinely orphaned; removing it belongs to step 3's sweep.
- The word intercepts no pointers, so stirring works *through* the letters.
  The alternative (word as an obstacle in the velocity field) would have been
  "distorting the field around the type" — closer to a violation than this.

---

## Step 3 — duration sweep  ✅

Every duration, before → after:

| What | Before | After | Band |
|---|---|---|---|
| Link underline in | 400ms `--ease-out` | unchanged | hover in |
| Link underline out | 800ms `--ease-in-out` | unchanged | hover out |
| Masked-line entrance | 1200ms `--ease-out` | unchanged | entrance |
| `.reveal` entrance | 1200ms `--ease-out` | unchanged | entrance |
| Line stagger | 70ms delay | unchanged | (delay, not a duration) |
| Curtain wipe | 1200ms `--t-slow` | **1600ms `--t-signature`** | signature 1.4–1.8s |
| Loader `WIPE` (JS, must match curtain) | 1200 | **1600** | signature |
| Arrival nav fade | **800ms literal** | `var(--t-move)` (800ms) | opening beat |
| Arrival cue fade | **800ms literal** | `var(--t-move)` (800ms) | opening beat |
| `.arrival-photo` (opacity 1200 / transform **1800ms literal**) | existed, orphaned | **deleted** | — |
| Map panel slide | `var(--slow) var(--ease)` — **both undefined, transition silently dead** | 1200ms `--t-enter` `--ease-in-out` | entrance |
| Search trigger hover | `var(--fast) var(--ease)` — **dead** | 400/800 asymmetric | hover |
| Map reset-button hover | `var(--fast) var(--ease)` — **dead** | 400/800 asymmetric | hover |
| Cue idle drift | 2600ms loop | unchanged | exempt: idle loop, like the cursor |
| Loader count / hold | 4000 / 1000 | unchanged | loader choreography, spec'd |
| Loader swap interval | 90–510ms formula | unchanged | spec'd formula |
| TrailMap draw | 5200ms time-based | unchanged | becomes scroll-linked in step 6 |

The real finding: **three transitions referenced tokens deleted in the
retoken** (`--fast`, `--slow`, `--ease`) and had been silently doing nothing —
including the map panel slide, which has been snapping open for days. Invalid
`var()` in a transition doesn't error; it just drops the transition. These are
map *chrome* CSS fixes; no map behaviour, layers, or page structure touched,
which I read as within the do-not-touch line. Say if not.

MapLibre's paint transitions (240/300ms in MapView) and `["linear"]`
interpolations are map-page styling — excluded by the run's rules, listed here
so the exemption is visible rather than silent.

Gates: zero easing literals outside tokens (two grep hits are a JS variable
named `ease` and a prose comment). Zero raw durations in CSS transitions
outside tokens except the documented 2600ms idle loop. `opening.webm` predates
the 1600ms curtain — stale by 400ms of tail, not re-recorded in width mode.

---

## Step 4 — the cursor  ✅

The SIT DOWN pill: fixed-position, rides the shared rAF loop at lerp 0.09,
snaps under the hand on first contact then trails it — measured 68.9px behind
mid-sweep, updating 24/24 frames. Scale in 600ms on the overshoot curve, out
380ms. Native cursor hidden only over targets, only when the pill can exist
(one html class set by the component behind the same gates the pill uses, so
the two cannot disagree). Off under reduced motion, off below 992px, off on
coarse pointers. Does zero work per frame once settled and inactive.

Targets: photographs (the Shot figure, its placeholder gap — the zone exists
before the photo does — About's cards and tattoo figure) and map links (nav
Map, the invitation CTA).

**Disagreement, done as told:** the in-curve `cubic-bezier(.34,1.56,.64,1)`
is a third easing curve, which step 3 forbids. Step 4 spec wins; it lives in
tokens as `--ease-cursor-in/out` with a comment naming it the one sanctioned
exception, so the no-literals-outside-tokens gate still holds.

Three test bugs found while proving it, all mine:
- The first test hovered 120px *beside* the target and asserted after leaving.
- A JSX-comment-in-expression-position broke the build — and the suite ran
  **green against the stale `out/`**. The suite now stats every source file
  and refuses to run against an out/ older than the newest one. That guard
  fired correctly on the very next run.
- The lag read happened after the sampler resolved (~400ms late), by which
  time the lerp had caught up and "lag" read 1.5px against working code.
- The photo-hover check could skip silently when its selector missed; a
  missing photograph is now a FAIL, not a skip.

Remaining instant hovers on form buttons (ui.module.css brightness flip) —
not photographs, not homepage, logged not fixed.

---

## Step 5 — nested parallax  ⛔ BLOCKED

There is no card grid on the site that renders. The only one in the codebase
is About's places grid, and it renders exclusively from `content/about.json`
entries — which are empty templates, filtered out on build. The homepage has
one photo+quote pairing (a single figure, not a grid), and the colophon's
columns are text, not cards.

The acceptance requires observing real cards at three scroll positions with
alternating-sign offsets. That is impossible without content, and the run's
rules are explicit twice over: placeholders are not mine to fill, and a
blocked step gets logged, not worked around. Injecting fixture cards from the
test would verify a mechanism against DOM the site never ships — the exact
class of green-on-fiction this run exists to kill.

**Unblocks with:** one real entry in `about.json`'s `places[]` (or a future
homepage card grid). The offsets are specified and waiting:
cards `[80, -150, -100, -160, 100, -90]px`, inner images −5% to −20%, both
off the shared Lenis frame, linear. I have deliberately not committed a
half-mechanism that nothing mounts — the wiring audit exists to catch exactly
that shape of dead code.
