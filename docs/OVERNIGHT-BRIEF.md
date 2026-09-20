# Overnight finish brief — Bourdain Map × noth.in feel

**Repo:** https://github.com/sanskardugar2001-tech/bourdain-map  
**Live:** https://bourdain-map.vercel.app (Vercel project `bourdain-map`)  
**Deadline:** usable “finished” feel by tomorrow (user local time Europe/London).  
**Success:** strangers can be hooked by the homepage and reach a real London-table CTA; map is a proper zoomable map; no placeholder seams.

## Product (do not lose this)

Three layers:
1. Homage map of where he ate
2. Club — strangers share a meal at those places (start: one London dinner)
3. Stories — after the meal, write who you met

Homepage is the front door. Dinner show-up is the real KPI.

## References in repo

- `docs/MASTER-noth-in-research.md` — union of noth.in craft (Lenis, loader, fluid/mask, pills, reveals, etc.)
- `docs/HOMEPAGE-REBUILD-PLAN.md` — mapped plan
- `CLAUDE.md` — non-negotiables (non-commercial, credit photos, no ratings, verification policy)

## Already done before agent start

- Content placeholders in `content/home.json` filled with CC food + Wikimedia Bourdain photos + short attributed quotes
- Images copied into `public/home/` (+ SOURCES.txt)
- Stack already has `lenis`, `maplibre-gl`, routes: `/`, `/map`, `/tables`, `/stories`, `/about`, `/place/[slug]`, `/city/[slug]`, `/reels`, `/account`

## Must ship

### A. Homepage feel (noth.in)
- Lenis ~1.2 + GSAP ScrollTrigger chapter pins/scrubs (add gsap dependency)
- Session-once loader ritual (food-in-O already designed — make it cinematic)
- Masked/staggered type reveals; kill any remaining “yours to supply” / gap markers
- Tighten pullback video chapter (keep Manifesto clip + permission credit)
- Place / chapter hover pills (OPEN TABLE → / SIT WITH →) lerp ~0.09
- Pin a **club climax** section: Eat with a stranger → real London waitlist/interest action (can be mailto or simple form /tables deep link — must not be dead text)
- Optional budget hero mouse-reveal (full fluid if time; simpler dissolve OK)

### B. Map
- `/map` must feel like a real interactive map: zoom, pan, clustering or density, place click → panel, search if present
- Use existing MapLibre + data in `public/data/`
- Mobile usable

### C. Subpages polish
- `/tables` — open a table / join London dinner clear UX
- `/stories` — read + submit path clear
- `/about` — philosophy short, deannd credit visible
- Nav + Taxi-like soft transitions if cheap; otherwise solid Next links

### D. Deploy
- `npm run build` must pass
- Push to `main` (or PR if safer) so Vercel updates
- Do not commit `.env.local`

## Constraints
- Respect CLAUDE.md verification policy (no mid-flight test suites)
- Credit every photo
- No affiliate/ads
- Short Bourdain quotes only, attributed
- Don’t need pixel-identical noth.in assets/fonts — match *feel*

## Definition of done
Cold visit → hooked scroll → no placeholders → map zoom works → “Eat with a stranger” goes somewhere real → Vercel live updated.
