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

---

## Step 6 — the trail set-piece  ✅

TrailMap gains a `setPiece` mode: 200vh wrapper, sticky 100vh stage, and the
trail draws **linearly against scroll** — progress measured at 0.013 / 0.505 /
1.0 across 0 / 0.5 / 1 of the travel. The scrollbar is the pen; no easing
touches it. Reads the shared Lenis frame, writes straight to canvas, exposes
`data-progress` for the tests. Below 992px or under reduced motion it renders
in normal flow (timer draw / drawn-complete respectively). The plain mode is
kept for the map page.

Asserted: exactly one `[data-pin]` on the homepage with a real
`position:sticky` child, zero below 992px, zero surviving inline `--p`.

One more test-vs-code incident, same pattern as every other one this run: the
scrub test used `el.offsetTop`, which is relative to the nearest positioned
ancestor, and scrolled to y≈589 instead of y≈2388 — reading progress 0 against
a mechanism a standalone probe showed working at 0.517. Document-relative now.

---

# Final summary — blunt, as instructed

## What changed

1. Pull-back deleted, cleanly — no `--p`, no orphan subscribers, tests replaced
   not just removed.
2. Fluid hero: BOURDAIN over a real stable-fluids sim revealing a build-time
   PNG of all 2,095 pins. Specified constants, hard gates, static fallback
   that is a finished frame. Worst frame under load beat the idle baseline.
3. Duration sweep: everything banded, two curves plus the one sanctioned
   cursor exception, and **three transitions that had been silently dead for
   days** (map panel slide included) found and restored.
4. SIT DOWN pill: lerp 0.09 on the shared loop, 68.9px of measured lag,
   photographs untouched under it.
5. **Blocked** — no card grid renders without content. Logged, not faked.
6. Trail set-piece: the one pin, linear against the scrollbar, gated.

## What I could not verify

- The fluid sim on a real GPU/trackpad. Headless numbers are honest but the
  *feel* of ink — dissipation rates, splat radius, edge softness — is tuned
  blind. Look at it before believing it.
- Real 60fps on battery-throttled hardware or mobile Safari. Same caveat as
  the map: needs a device.
- The literal "no frame over 16ms": unmeasurable — the idle compositor alone
  jitters to 17.6ms. I asserted "no missed vsync" instead and said so.
- `opening.webm` predates the 1600ms curtain; stale by 400ms of tail.

## What I think is wrong with the result

- **The hero reveal is too subtle.** 2,095 pins across a whole world means
  the ink mostly reveals empty ground; you have to sweep through Europe or
  the US seaboard to feel it. Options if you agree: brighten pins in the
  hero PNG, or crop it to a denser region. One-line regeneration either way.
- **The homepage is type and simulation with zero photographs** — every pool
  is empty. The fluid hero carries it for now, but the pairing section is a
  labelled gap and the loader cycles an empty O. It reads as a beautiful
  skeleton. Content is the bottleneck now, not build.
- **1.2s on the map panel slide may be too slow in practice.** It obeys the
  entrance band, but a panel you open twenty times in a session earns the
  right to be quicker. Doctrine and usability may collide there; a device
  session will tell.
- The cue idle loop (2600ms) and the loader choreography sit outside the
  duration bands by documented exemption. If the bands are meant as law with
  no exemptions, say so and I'll fold them in.
- Step 4's overshoot curve breaking step 3's two-curve rule is resolved by
  tokenised exception, but it is still three curves on the site. The gate
  greps would not catch a fourth being added the same way.

## Pattern worth keeping

Six steps produced five harness bugs and three product bugs. Every single
"failure" that contradicted a standalone probe was the test. Every silent
green that felt too easy hid something (stale out/, skipped photo check).
The stale-build guard fired on its first opportunity. Keep the rule: proofs
on their own pages, and when a test disagrees with a probe, suspect the test.

---

## Post-run: the pull-back restored (user request)

Back from git (`02ce8b7~1`), placed below the hero-quote section. Two changes
from the original: the scroll cue stayed with the fluid hero rather than
returning (two "scroll" cues would be absurd), and `data-pin` is now toggled
with the gate so the pin census stays truthful below 992px.

**The one-pin rule forced a trade:** the trail yielded its set-piece mode and
draws on entry again (plain mode kept in the component, dormant, for the map
page). The pull-back scrubs linearly — measured 0 / 0.4998 / 0.9998 across its
travel. The one-pin acceptance now names the pull-back and permits inline
`--p` on the pin element only.

**The portrait.** A supplied photo of Bourdain is wired into
`loader.portrait` as `bourdain-portrait.jpg` — the frame the loader resolves
on, which is the slot specced for the one photograph of him. The image
arrived as a paste, which exists nowhere on disk I can reach, so the manifest
points at a file that does not exist yet and the build says so out loud. The
credit field is empty and stays empty until a real one is supplied — not mine
to invent, least of all for a professional portrait.

Note: the stale-build guard blocked the acceptance run against an old out/
for the second time (missing import broke tsc). Both times it fired, it was
right.

## /reels — a feed of embedded clips, manifest-driven (user request)

Additive only: `content/reels.json` in, `/reels/` out, "Reels" in the nav.
Paste a URL, rebuild, done — `lib/reels.ts` validates entries at build time
(host allowlist, TikTok video id) and skips bad ones with a warning, never a
broken frame.

**Verified before building, as briefed.** A spike in headless Chrome proved
both platforms' official blockquote + embed.js patterns hydrate markup
injected client-side — the static-export situation — and that nothing is
fetched until an entry nears the viewport. Findings that shaped the page:

- Instagram signals a dead reel cleanly (no `.instagram-media-rendered`,
  iframe stays 2px), so the page swaps in its own marked "no longer
  available" state after a 15s deadline. TikTok hydrates dead videos into
  its own compact unavailable card — cross-origin, undetectable, but
  contained in our frame with our caption. Nuance logged in questions.md.
- Some accounts disable embedding entirely (a live People-magazine TikTok
  renders the same card). The acceptance script looks inside the iframes so
  a bad manifest entry fails at acceptance time, not in front of readers.
- TikTok's player refuses the headless UA; tests strip "Headless" from it.

**Two real bugs the acceptance run caught.** React reused the frame div when
swapping to the gone state, carrying the dead iframe with it — distinct keys
force the remount. And the frame's min-height reservation used to drop at
hydration while TikTok's iframe was still 310px, so the page shrank for an
instant and yanked entries below into the lazy-load margin — the
reservation is now unconditional; embeds only grow it.

`scripts/reels_acceptance.mjs` builds three ways (empty manifest, live
entries, a deliberately dead URL) and asserts the lot, including that the
bottom entry stays uninjected until scrolled. The embeds are the one place
the type rules don't reach inside; the frame, caption, labels and the
colophon ("this site hosts nothing") are the site's.

## The pull-back takes a video (user request)

Status check first, as asked: the set-piece exists — `HeroPullback`, below
the hero quote, 250vh with a sticky stage, content scaling 1 → 0.04 linearly
against `--p`. Built homepage: zero `data-pin` in the static HTML (the
attribute is toggled client-side so the census stays truthful), exactly one
at runtime ≥992px, zero below. Pin count unchanged by this work, so the
one-pin acceptance stands as written.

The swap: the frame's content slot is now a YouTube video via the IFrame
API — the API and not a bare iframe because the point is mute control.
Manifest-driven: `content/home.json → pullback { videoId, start?,
background }`, marked gaps until supplied, official uploads only per the
readme. Autoplays muted while the section is on screen, pauses off it, and
**muted is re-asserted on every re-entry** — autoplay with sound is blocked
by every browser, so the default has to be muted every time, not just the
first. The SOUND pill (mono label + 300ms knob) lives in the stage, one
layer out from the scaled frame, so it never shrinks with it. Behind, the
room photograph scales 1.05 → 1 against the same scroll — the dolly-out.
Reduced motion and below 992px: no pin, no autoplay, no player until the
labelled frame's play button is pressed.

The hero photo pool no longer renders in the frame; its placeSlug still
chooses where the pin lands. The pull-back background photo rides the same
sharp pipeline and credit rules as everything else (colophon included).

One spec gap, logged in questions.md: the brief pointed at
`notes/refs/nothin-motion.md` for the SOUND pill and that file contains no
such passage — built to the inline spec instead.

`scripts/pullback_acceptance.mjs`: 15 assertions, all green — playing+muted
mid-pin asserted via the player's own `isMuted()`, pill toggles both ways,
paused past the pin, re-muted on return, reduced motion loads nothing. The
fixture video (CNN's Parts Unknown trailer, verified official via oEmbed)
exists only inside the test run; the shipped manifest keeps the marked gap.

## The supplied video refuses to embed; the player learns to say so (user request)

The requested pull-back video (5ElntjskhaE, a vertical Short) returns
YouTube error 150 — its owner forbids playback in embedded players, on any
site. Proven in isolation against a control video that plays in the same
harness, twice, clean UA both times. Not our code, not fixable by
architecture. The manifest is back to the marked gap and the choice is back
with the owner, evidence in questions.md (it was also a fan-edit channel,
against the official-uploads rule).

What the attempt bought anyway: `pullback.vertical` for Shorts — a
full-height 9:16 frame over the room instead of a 16:9 cover that would
pillarbox or slice them — and an onError degrade: any video that errors
(150s most commonly arrive later, when music gets claimed) becomes a marked
"this clip won't embed" card with the YouTube link, never a black erroring
player, pill hidden. Acceptance grew a blocked-video phase pinned to the
exact Short that taught us, and the phase-3 assertion now reads a rendered
marker rather than the RSC payload (unused gap JSX used to leak
"pullback.videoId" into the flight data — children are no longer passed
when a video ships).

Also, by request: the /reels colophon paragraph ("this site hosts nothing")
is removed, with its acceptance assertion flipped to keep it removed.

## Reels lose their labels; TikTok loses its chrome (user request)

The "( instagram )/( tiktok )" mono labels are gone from /reels. TikTok
moves from the blockquote + embed.js card (caption, like counts, comment
row) to the official Embed Player — player/v1, a plain iframe, description
and music rows switched off. What remains inside (creator name, TikTok
mark, and a cookie banner for first-time visitors) is their player chrome
and not removable from outside. No script needed any more for TikTok; the
iframe src loads lazily exactly as before, and a dead video still shows
their compact card in our frame.

Instagram is the honest no: there is no chromeless Instagram embed. The
header, like/comment row and caption live inside their iframe, no official
option removes them, and cropping their player is both against their terms
and brittle. What ships is already their minimal form.

**Known-red at commit time, by instruction:** the blocked-video degrade
phase of `scripts/pullback_acceptance.mjs` (3 assertions). In the full page
YouTube emits a momentary PLAYING before instantly ENDING a restricted
video, which defeats the ended-before-ever-playing rule. The likely fix is
one line — on ENDED, `getDuration() === 0` means blocked — unverified,
because verification now happens once per batch, not mid-flight. Committed
with the owner's knowledge. Everything else in both suites was green on
their last runs.

## The clip comes home: pullback.file, hosted with permission (user request)

The embed path was a dead end — the chosen Short forbids embedded playback
(error 150) — and the owner came back with permission from its creator to
host the file. So the pull-back gains a second source: `pullback.file`, a
self-hosted clip in public/home/ played by a native <video>, which makes
the mute problem trivial (it's a property, not an API). File wins over
videoId. Same contract as the YouTube path: muted autoplay only while the
section is on screen, paused off it, re-muted on every re-entry, the SOUND
pill the one control, static labelled frame with a play button where the
pin doesn't run. window.__whaPlayer is now either the YT player or a
same-shaped shim over the element, so the acceptance asserts one interface.

Credit is required like every photograph — on the frame, in the colophon —
and the readme confines pullback.file to clips with the creator's written
permission. The grant (MANIFESTO, 2026-08-20, reported by the owner) and
its two caveats are recorded in decisions.md. dont-be-afraid.mp4 is 2.3MB,
inside free-tier comfort.

**Pill redesign + the room slot (user request).** The SOUND pill moves to
the noth.in reference: top-centre of the video frame, dark rounded ground,
riding the shrinking frame's top edge (top = 50vh·0.96·p) without shrinking
with it, visible whenever the section is on screen rather than only once
playing. The suite had caught the visibility gap honestly — a local file
reaches "playing" faster than the pill's 800ms fade, so the assertion now
polls. The shipped file-mode path is fully green (12/12).
pullback.background points at pullback-kitchen.jpg — the supplied photo
arrived as a paste that exists nowhere on disk (portrait precedent), so the
manifest names it, the build warns, and the frame keeps its marked gap
until the file lands in public/home/. Credit empty, not mine to invent.
Still known-red, unverified by the once-per-commit rule: the YT blocked
fixture (2b) — YouTube reports a real duration even for refused videos, so
detection now keys on getCurrentTime() at ENDED (~0 = refusal); next run
will tell.
