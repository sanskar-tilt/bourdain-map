# Bourdain Map homepage — noth.in craft → your three layers

**Sites:** https://bourdain-map.vercel.app (also referenced as bourdain-map.vercel.app)  
**Reference master:** `Desktop/Noth.in Research/MASTER-noth-in-research.md`  
**Success test:** Do strangers show up to a London table? The homepage is only the front door.

---

## 0. What you already have (keep)

- Editorial B/W + red accent art direction
- Huge **BOURDAIN** wordmark
- Pinned video chapter (kitchen plate, monochrome clip, sound toggle, scale-down) — this is your closest “noth.in showreel” moment
- Red trail / Newfoundland data beat
- Closing line energy: *Pick a city. Open a table. Eat with a stranger.*

## 0b. What’s broken / blocking the spell

- Native scroll, almost no Lenis/GSAP chapter scrubbing outside the video pin
- Placeholder seams: “yours to supply”, literal “photo”, `content/home.json` / `video.url` instructions visible
- “Eat with a stranger” reads as copy, not an action
- Trail feels like a sketch, not a destination
- No loader ritual, no type masks, no magnetic objects, no hover craft on works-like cards

---

## 1. Steal from noth.in (feel), remap to Bourdain (meaning)

| noth.in system | Canonical constants (from MASTER) | Bourdain remapping |
|----------------|-----------------------------------|--------------------|
| Session loader | `nothin:loader-played`, black cold open, name build | **Ritual loader:** black → builds one idea (“sit with a stranger”) or the wordmark letter-by-letter; session-once |
| Hero fluid mask | Three.js dye splat, `simResolution:256`, `splatForce:5900`, etc. | **Hero tear:** mouse paints a liquid hole through white field + BOURDAIN mark → reveals kitchen still or loop clip underneath. Budget option: simpler WebGL dissolve / canvas mask if full fluid is too heavy |
| Lenis | `duration:1.2`, expo easing, `smoothTouch:false` | Same feel, same numbers |
| `[line]/[letter]` reveals | SplitText, `power4`, stagger `.05` / `.1` | Manifesto + trail + club copy enters this way — never cheap fades |
| Showreel shrink | Full-bleed → small tile scrub | **Your existing pinned video** becomes the formal chapter: scrub scale/margins like noth.in (`scrub:3` energy from pdf notes) |
| Works + EXPLORE pill | lerp `0.09`, `back.out(1.8)` / `power3.in` | **Place cards** or “open a table” cards with **SIT WITH →** / **OPEN TABLE →** pill |
| Formes magnetism | influence 460 / falloff `^1.6` | Optional: passport stamps, chopsticks, boarding passes, pepper mill — flee the pointer in the club chapter |
| Glitch velocity text | `/3400` chaos | Scroll-velocity scramble that settles into: *everyone has a story worth hearing* or a real diner story excerpt |
| Taxi transitions | soft fade / flip | Soft route into `/map`, `/dinner`, `/stories` |

**Do not build:** a site-wide custom cursor blob. noth.in doesn’t; neither should you. Signature = fluid/mask + table pill.

---

## 2. Homepage scroll screenplay (chapters)

1. **Loader (once)** — black; short; earns the white field.
2. **Hero / Homage** — BOURDAIN + fluid/mask reveal of place or clip; micro line: *Where he ate.* Count `2,095` as typographic flex, not a dashboard.
3. **Manifesto pin** — 2–3 masked lines: people are mostly kind; a table is enough. No essay.
4. **Showreel chapter** — keep/improve current pinned video; remove config seams; sound toggle stays.
5. **The trail** — one cinematic data moment (red path) that ends on a real place name + episode; CTA chip → map.
6. **Places strip** — 3–5 destination stills with **OPEN TABLE →** hover pill (noth.in works pattern).
7. **The club climax** — pinned full-viewport: *Eat with a stranger.* Primary button to London dinner interest / waitlist. This is the scroll’s destination.
8. **Stories aftertaste** — one short first-person blurb (even placeholder written as if real) + “after the meal, you write who you met.”
9. **Footer** — map · dinner · stories · credit deannd / Manifesto clip.

Every chapter: Lenis + ScrollTrigger pin or scrub. No large dead whitespace without motion.

---

## 3. Content debt (must clear or the craft looks fake)

- Replace all `content/home.json` instructional strings with real copy
- One real hero still + one licensed/owned loop (or keep Manifesto clip with clear permission line, no “credit required” debug text)
- One real quote (Bourdain, cited) instead of “yours to supply”
- London dinner: date window, city, form or waitlist link — CTA must go somewhere
- Photo block: real image or remove

---

## 4. Implementation order (ship the spell, then the club)

### Phase A — Spell (homepage feel)
1. Lenis `1.2` + GSAP ScrollTrigger sync  
2. Attribute reveals `[line]/[letter]`/`[opacity]`  
3. Loader session gate  
4. Hero mask (full fluid or budget dissolve)  
5. Tighten video chapter scrub; kill placeholders  
6. Works-style hover pills on place cards  

### Phase B — Front door to the table
7. Club climax section (pin + real CTA)  
8. Stories teaser  
9. Soft page transitions into map / dinner  

### Phase C — Polish
10. Formes (optional objects)  
11. Glitch line  
12. Mobile pass (`smoothTouch:false`; simplify WebGL on small screens)

---

## 5. Out of scope for this homepage pass

- Rebuilding the full map UX
- Payment / full booking stack
- Pixel-perfect clone of noth.in assets/fonts (use licensed equivalents: e.g. Neue Montreal → similar grotesque; keep your serif if it already signals “archive”)

---

## 6. Definition of done

Someone lands cold, scrolls without thinking, hits **Eat with a stranger**, and either joins the London list or opens the map — without seeing a placeholder. You feel the same “can’t leave” pull you felt on noth.in’s video.
