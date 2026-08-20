# Project brief

A world map of every place Anthony Bourdain ate, and a way for strangers to
meet at those places and eat together. Fan-made, non-commercial, personal.

The map is the browsing surface. The **table** is the point: someone picks a
place, sets a date, opens N seats, strangers take them. After the meal, whoever
went writes a short piece about who they met. Not a review — a story.

This exists because of one idea of his: people everywhere are broadly the same,
mostly kind, and everyone has a story worth hearing. The site should make that
structural rather than say it in an About page.

## Non-negotiables

- **Non-commercial.** No affiliate links, no bookable tours, no ads, no
  sponsored placement, ever. This is a condition of the data licence.
- **Attribution.** The seed dataset was compiled by deannd (r/AnthonyBourdain)
  over two years and used with permission. Credit visibly and permanently, not
  in a footer nobody reads. Her descriptions ship as-is and display credited —
  but they are quoted material on a place panel, visibly hers. They are not the
  site's voice. Site copy comes from `notes/why.md`.
- **No ratings.** No stars, no scores, no "top 10". A rating field turns this
  into TripAdvisor within a month.
- **Copyright.** Facts are fine — he ate here, S5E12, this dish. His prose,
  the episode scripts, and photographs of him are not ours. Short attributed
  quotes only, no scraped stills, no transcript dumps.
- **Not a memorial.** He'd have hated a shrine. Warm, funny, a bit blunt.

## Verification policy

No acceptance suites, no test runs, no verification passes during
iteration. Ever. While working: typecheck and build only. Content-only
changes: not even that. The full suite runs exactly once, immediately
before a commit, and never mid-flight. If something feels risky enough to
check mid-work, ask me instead of running anything.

## Stack

Next.js (App Router) · MapLibre GL · Supabase (Postgres + PostGIS + auth) ·
Protomaps tiles · Vercel. Same shape as the london.rent build — reuse the map
and submission patterns from there where they fit.

Keep it on free tiers. There's no revenue and that's deliberate.

## Data model

See `supabase/migrations/`. The decisions that matter:

- `places` and `appearances` are separate, because the same restaurant appears
  across multiple shows. One pin, visits listed underneath. Worth knowing how
  little this buys: 38 places out of 2,095 have more than one appearance. The
  split is right and cheap, but it is not the hard part of the import.
- **There are no episode numbers.** The source KMLs contain zero `SxxExx`
  strings, zero "episode N", and no air dates. `appearances.episode`,
  `episode_title` and `air_date` import as null and stay null until someone
  does a separate enrichment pass against an episode list. Season survives
  only for Parts Unknown and The Layover, where the KML folders encode it —
  1,149 of 2,135 placemarks. Don't promise an episode trail in the UI.
- The hard part of the import is **name collisions**. 41 placemarks are
  literally named "Meal with locals", spread across four continents, and 816
  same-name pairs sit more than 50km apart. Dedupe matches on normalised name
  AND proximity (≤250m), with a blocklist of generic names that never merge at
  any distance. Name-only matching merges Manila into Montreal.
- `places.status` treats `closed` as first-class. Many of these are gone.
  Render them present-but-greyed — it's the most affecting thing the map does,
  and it stops people turning up to a shuttered address.
  Status comes from the `(Closed)` suffix on the KML `<name>` — 57 of them,
  clean and reliable. It does **not** come from the word "closed" in a
  description: those usually mean a *different*, older restaurant closed and
  this pin is its replacement ("Tony visited Mitchell's BBQ which is now
  closed. This is the newer spot."). Trusting the description greys out a
  restaurant that's serving today. Send those 42 to the skip log for a human.
- `stories.body` has a 100-char minimum and no rating. Makes people write a
  sentence rather than "great vibes".

## Build order

1. **Import.** Seed `places` + `appearances` from deannd's five KMLs. Dedupe
   on normalised name + proximity, with a generic-name blocklist. Runs offline
   from the files — no network. Expect messy rows; log what you skip rather
   than silently dropping it.
   **Pass 2: reverse-geocode.** Nothing in the KMLs carries city, country or
   address, so `city` and `country_code` are nullable and backfilled from the
   coordinates afterwards. `slug` is generated from name + city and stays null
   until that lands, so no live URL ever has to change.
2. **Map.** World view, ~2,095 pins, clustered. Click a pin → place panel:
   what he ate, which show and season where known, current status.
   He didn't only eat — 239 pins are markets, bars, spas, hot springs and
   hotels. `places.kind` carries the distinction; default to food, toggle the
   rest on. Don't drop them.
3. **Tables.** "Open a table here" → date, seats, blurb. RSVP. Auth via
   Supabase magic link.
4. **Stories.** Post-meal writeup, attached to place and gathering.
5. **Corrections.** Fans will know more than the seed data. Give them a box.

Ship 1–2 before building 3. A map with nothing to do on it still teaches you
whether anyone cares.

## Design direction

The subject's world is airports, receipts, chalkboards, hand-painted market
signage, kitchen dupes, customs stamps, cheap paper menus. Pull from that.

Be aware that "Bourdain homage" pattern-matches hard onto a specific look —
warm cream background, high-contrast serif, terracotta accent. That is the
default answer, not a chosen one, and it will read as generic. Go elsewhere and
justify where you land.

Spend the boldness in one place. Candidate signature: the empty seat — every
open table shows its unfilled chairs, and the map is quietly a picture of how
many meals are currently waiting for someone.

Copy is sentence case, plain verbs, no filler. Empty states are invitations.
Nothing announces how much it cares.

## Don't

- Don't add a chat feature. It becomes moderation work immediately.
- Don't build event infrastructure before the first dinner actually happens.
- Don't put his face on the landing page.
- Don't write copy that eulogises. Show the places, let them do it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
