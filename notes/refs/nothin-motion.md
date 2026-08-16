# noth.in — browser-agent motion pass (Viktor)

> Saved verbatim as received. This is a runtime observation pass; the
> static extraction in `nothin-analysis.md` is a separate reading of the
> shipped CSS and bundle. **Where the two disagree on timings, the
> extracted CSS wins** — see the reconciliation appended at the end,
> which is mine and is clearly marked as such.

---

## Viktor's browser pass on noth.in — verbatim, save to notes/refs/nothin-motion.md

Ran it in a real browser and read the actual 752KB bundle (nothinv1.netlify.app/main.js). Headlines: loader is a 5s object-swap with a 100→000 counter, only one section pins (the hero, scale 1.4→0.35), the cursor is custom but only inside work cards, Taxi does a plain 0.5s crossfade except case pages which fly the title with a FLIP clone, and there is zero prefers-reduced-motion handling in the whole bundle.

### 1. The first 3 seconds, in order

Black screen. Centre: the wordmark reads N [object] ' — a 3D object literally standing in for the O. Bottom centre, mono, a counter starting at 100.

- The counter runs 100 → 000 over ~6.7s (ease: power2.inOut), zero-padded to 3 digits. It counts down, not up.
- Meanwhile the O-slot cycles through the object library on a timer: shot 1 bubble-wrap heart, then a black foil candy, then a pink inflatable ring. Each swap kills the previous tween and hard-resets it. The dwell time is not fixed — it's 100 + 400 * (1 - sin(t/5000 * pi)) ms, i.e. slow swaps at the start, fastest in the middle, slowing again at the end. Cute, and the thing that makes it feel alive rather than a spinner.
- Total loader budget: 5000ms, then it exits early regardless of the counter.
- Exit sequence: current object scales to 0 (0.6s power4.inOut, 0.5s delay) → counter fades (0.5s) → the whole loader panel collapses its height to 0 over 1.8s power4.inOut (a wipe up, not a fade) → hero reveal fires.
- Hero reveal: the NOTHIN' SVG paths are shuffled randomly (sort(() => Math.random() - .5)), then fly in yPercent 120 → 0, 1.8s power4.inOut, stagger 0.07 — so letters land in a different order every visit. The apostrophe arrives last: scale 0→1, 0.6s, back.out(0.9), delay 1.5.
- It's stored in sessionStorage as nothin:loader-played — second visit in the session skips straight to the site.

So: 3 seconds in you are still in the loader, watching objects swap and a number fall. That's the confidence move — they spend 5 full seconds before showing you anything.

### 2. Pin vs free scroll

Only one real pin in the whole page: the hero. pin: t, pinSpacing: true, scrub: 1, start: "top top", end: "bottom top", refreshPriority: 1 — the hero wrapper is 2700px (3 viewports) and the content scales 1.4 → 0.35 while pinned. A nested layer scales 1.8 → 1 on the same scrub. That's the whole trick: you scroll, the hero shrinks away from you into the page. Everything after it scrolls free.

What the scrub numbers feel like:
- scrub: 1 = ~1s of catch-up lag. Perceptible weight, still tracks your finger.
- scrub: 1.5 (work-item parallax, glitch image drift) = clearly floaty, keeps moving after you stop.
- scrub: 2–3 (glitch section opacity, the -800px drift layer) = it detaches from the scroll. Reads as "expensive" precisely because it disobeys you slightly.

Entrances are the opposite discipline: start: "top 95%" (cards top 88%, some top 85%), duration 1, power4.inOut, no scrub, no replay. Once and settled.

Text reveal is masked-line/char: SplitText-style with mask: "chars", yPercent 100 → 0, 1s power4.inOut, stagger 0.05.

### 3. Hover states — all four, exact

They deliberately anticipate fast, release slow (asymmetric in/out), which is the single cheapest thing to steal.

| Element | In | Out |
|---|---|---|
| Primary btn (arrow line) | width x 1.45, 0.4s power4.inOut | back to base, 0.8s power4.out |
| "View all" btn | arrow shaft draws + scaleX: 2, 0.45s power2.inOut | same timeline reversed |
| Text links | underline wipes in L→R, 0.6s power4.inOut | continues out the right (width 100%→0%, left 0→100%) — never reverses |
| Email btn @ | scale 1.2, 0.2s power2.in | scale 1, 0.2s |

That link underline is the detail worth copying: it never retreats, it exits the way it came in. Costs nothing, feels designed.

### 4. Cursor

Yes, custom — but scoped. Site-wide it's the native cursor. Inside .work-link they set cursor: none and drive a .cursor-work element:
- position absolute, centred with xPercent/yPercent: -50, pointerEvents: none, zIndex: 10
- follows via manual rAF lerp at 0.09 — heavy trailing, roughly 10 frames behind
- appears with scale 0→1, autoAlpha 0→1, 0.6s, back.out(1.8) — the overshoot is what makes it feel physical
- rAF stops when it settles (they kill the loop, not just idle it)

### 5. Taxi.js transitions — what you actually see

Two registered:
- Default: outgoing fades to 0 (0.5s power2.inOut); incoming is set position: fixed, top 0, opacity 0, zIndex 10 and fades to 1 (0.5s), then the old view is removed. A plain crossfade, no wipe.
- Case-study transition (shared element): on leave it grabs .h1-case-next and .nbr-project-next, clones them, pins the clones position: fixed at their measured rect with zIndex: 99999, and flies them to the next page's title position while the page underneath fades. Classic FLIP. Timings in that block: 0.45s / 1.2s, power4.inOut. That's the "how did the title survive the page change" moment.

Also: prefetch on hover is on (mouseenter focus → fetch), full page cache in a Map. So navigation feels instant because the HTML is already there before you click.

### 6. Subjective read

Stack is Webflow + a custom Vite bundle: GSAP 3.13 + ScrollTrigger + SplitText, Lenis smooth scroll (lerp 0.1, easing 1.001 - 2^(-10t)), Taxi.js, and three.js — the floating objects in the services section are real WebGL, not sprites.

Where it feels expensive, ranked:
1. The 5s loader. Making you wait, on purpose, with something to watch. Nothing else on the page buys as much perceived quality per line of code.
2. The pinned hero shrinking 1.4→0.35 on scrub. Scroll becomes zoom. One ScrollTrigger.
3. The random letter order on hero reveal. Different every load — you can't screenshot it the same way twice.
4. Restraint in the easing set. Two curves, power4.inOut and power4.out, plus none for anything scrub-linked. Everything on the site therefore moves like one object.

Single most memorable interaction: the loader counting down 100 → 000 while the O keeps becoming a different physical object, ending on a full-height wipe. That's the site's whole thesis in five seconds.

One warning: prefers-reduced-motion appears zero times in their bundle. They just don't handle it. Don't copy that part.

---

# Reconciliation — mine, not Viktor's

Where the runtime pass and the static extraction disagree. The standing rule
was that extracted CSS wins on timings; on stack facts the browser pass won
twice, and both of my errors came from the same mistake.

## He was right, I was wrong — twice

**three.js is fully bundled.** I recorded "a trace of three.js (1)". Wrong:
`WebGLRenderer` ×35, `isMesh` ×56, `Quaternion` ×23, `ShaderMaterial` ×16,
`BufferGeometry` ×14, plus the literal `data-engine three.js r…` string. My
count of 1 was a grep for the lowercase word "three", which barely appears in
three.js's own source because it is all class names. His "the floating objects
are real WebGL, not sprites" is correct.

**SplitText is the real plugin.** I concluded they hand-rolled a splitter
because `SplitText` returned zero hits. It returns zero hits because the import
is minified to a two-letter identifier. The registered config is in the bundle:
`{type:"chars", charsClass:"letter-child", mask:"chars", autoSplit:false,
aria:"auto"}` — `mask`, `autoSplit` and `aria` are all GSAP 3.13 SplitText
options.

**The methodological lesson, which is the useful part:** counting identifier
strings in a *minified* bundle measures what survived minification, not what is
present. Absence of a name is not absence of a library. Anything imported and
renamed is invisible to that method; only its runtime fingerprints (class
names, option keys, emitted attributes) survive. A browser pass sees behaviour
and catches exactly what a grep cannot.

Both errors are now corrected in `nothin-analysis.md` with the correction
visible rather than the text quietly edited.

## Where the CSS still wins

**Loader duration.** He measured a ~6.7s countdown inside a 5000ms budget. The
extracted CSS has no loader timing at all — it is entirely JS — so there is
nothing to overrule him with, and his number stands as the observation. Our
build deliberately retunes it: **3s, counting up 000 → 2,095**, per the brief.
Different on purpose, not by accident.

**Hero pin.** He measured scale 1.4 → 0.35 across 2700px (three viewports). We
build 1.3 → 0.5 across two. Retuned per the brief.

**Link underline.** He measured 0.6s in. The brief specified ~0.4s in / ~0.8s
out and that is what shipped. His observation of the *mechanism* — that it
exits out the right and never reverses — is the part worth having, and it is
what our single `a` rule implements.

**Text stagger.** He reports 0.05; extraction found 0.03 / 0.05 / 0.07 / 0.08
across different elements. Both true — he measured one instance, the bundle
holds four. We use 50ms.

**Lenis.** He reports `lerp 0.1`; I extracted `duration: 1.2` with a custom
easing. `lerp` appears 34 times in the bundle, so both configurations are
present — Lenis accepts either mode. No conflict, and moot for us: we ship no
smooth-scroll library.

## What we took, and what we refused

Taken: asymmetric hover, the underline that exits rather than reverses, two
easing curves for everything, entrances that fire once and settle, masked-line
reveals, parenthetical mono labels, the counting loader with a wipe-up exit,
one pinned hero.

Refused: GSAP, SplitText, Lenis, Taxi, three.js, the custom cursor, and the
752KB. We have 2,845 pages and a map that must hold 60fps; they have perhaps
twenty screens.

And the one he flagged: **`prefers-reduced-motion` appears zero times in their
bundle.** We handle it in tokens, in globals, in the loader, in the pin, in the
trail canvas and in the reveal observer — every animated thing resolves to its
settled state.
