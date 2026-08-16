# Decisions

Things settled, and why. Newest at the bottom. If a decision is reversed,
strike it and add the replacement rather than deleting the history.

---

## Data

**City, country and slug are backfilled, not imported.**
The five KMLs carry name, coordinates and a prose description. No address, no
city, no country — 2,135 placemarks, zero of either. So `city` and
`country_code` are nullable, the import runs offline from the files, and
`scripts/geocode.py` resolves them afterwards from coordinates.
`slug` is generated from name + city in that same pass, so it stays NULL
through the import. Nothing consumes slugs yet, and generating them once
after city lands means no live URL ever has to change.

**Dedupe is normalised name AND proximity. Never one alone.**
Name-only merges the 41 pins called "Meal with locals" across four
continents — 816 same-name pairs sit more than 50km apart. Proximity-only
merges Piroshky Piroshky into Pike Place Market, 38m apart and genuinely
different places. Names that describe an occasion rather than a venue are
blocklisted from merging at any distance.
Result: 2,135 placemarks → 2,095 places, 40 merges, 38 places with more than
one appearance.

**The places/appearances split is correct but minor.**
It buys 38 clusters out of 2,095. Worth keeping — it is right and cheap — but
it was oversold in the original brief as the central modelling decision. The
thing that actually needed care was the generic-name blocklist.

**Status comes from the name suffix, never from the description.**
`(Closed)` on the KML `<name>` is reliable — 53 of them, plus 4 `(Closed?)`
which become `unknown`. The word "closed" in a description usually refers to
a *different* restaurant that this pin replaced: "Tony visited Mitchell's BBQ
which is now closed. This is the newer spot." Acting on those greys out
somewhere that is serving today. All 24 go to `notes/import-skips.log` for a
human.

**There are no episode numbers.** Zero `SxxExx`, zero "episode N", no air
dates, anywhere in the corpus. `episode`, `episode_title` and `air_date`
import NULL and stay NULL. Season survives only where the KML folder encodes
it — Parts Unknown and The Layover, 1,149 of 2,135. Don't promise an episode
trail in the UI.

**Descriptions split into `what_he_ate` or `note`, never both.**
The registers are sharp: The Layover's median description is 27 characters
("Steak frites"), Parts Unknown's is 157 and 90% of them say "Tony". Rule is
≤60 chars and no narrative pronoun → dish, else note.

---

## Schema

**PostGIS lives in `extensions`, not `public`.**
It installs ~1,000 functions and PostgREST exposes `public`.

> **This was edited into an already-applied migration, and that stops being
> safe the moment this deploys anywhere.** PostGIS hard-refuses
> `ALTER EXTENSION postgis SET SCHEMA` (`ERROR: extension "postgis" does not
> support SET SCHEMA`), so the only alternatives were editing migration one or
> `drop extension ... cascade`, which would take `places.geog` with it.
> Editing worked only because nothing was deployed and the local DB is
> replayed from scratch. Once there is a hosted database, a migration that has
> run is immutable — fix forward or not at all.

**Grants are explicit, per table.**
Supabase grants `anon`/`authenticated` only `Dxtm` on new tables in `public`,
deliberately not `arwd`. Without explicit grants every RLS policy is
unreachable code — `places readable ... using (true)` grants nothing and the
map renders zero pins. Policies gate access; grants create it.
No blanket default-privileges rule for `anon`/`authenticated`: that is the
insecure old default and we are not reinstating it.

**Three additions beyond the original grant list, all kept:**
- `select on stories` to anon — `published stories` is a select policy and a
  writeup nobody can read isn't a writeup. Omitting it recreated the bug the
  migration existed to fix.
- `grant all ... to service_role` plus default privileges — service_role
  bypasses RLS but still needs privileges. Without it every server-side call
  fails through PostgREST.
- PostGIS edit-in-place, above.

**Seat counts come from `gathering_seats`, a count-only view.**
Granting select on `rsvps` would expose who is going. Turning a dinner with
strangers into a browsable list of who is meeting whom is a different, worse
product. The view is `security_invoker = false` on purpose: it sees past RLS
to count rows and returns three integers and no identities.

**Seat overbooking is knowingly unguarded.** A 4-seat table accepts unlimited
RSVPs. The trigger belongs with the gatherings UI, which is out of scope.

---

## Product

**No food-default filter. Show everything.**
`kind` is only derivable for the 852 No Reservations pins; the other 1,243 are
`unknown` because their KMLs group by season or DVD disc, which says nothing
about what kind of place something is. A filter that cannot classify 59% of
the map is not a filter.
He didn't only eat, and the trail is more interesting for including the
Kremlin and the Sahara.

**Where `kind` is known, it varies the marker.** A market or a hot spring
reads differently from a restaurant. Where it is unknown the marker is just
the default. No classification pass, no LLM guessing over 1,243 descriptions.

**deannd's prose is quoted material, visibly hers.**
Her descriptions ship as-is and display credited. They are not the site's
voice. Site copy comes from `notes/why.md`.

---

## Schema — cities, episodes, video

Proposed before migrating, per instruction. Four additions.

**`cities`** — city pages need a stable URL and a flyTo target, and
`places.city` is raw geocoder output with all its inconsistency ("Yangon
City", "San Francisco", "City of Westminster"). Keep that text column as
provenance and add a normalised table beside it.

    cities(id, slug unique, name, country_code, centroid geography,
           video_url, video_title, video_source, created_at)
    places.city_id -> cities(id)

Centroid is computed from the places in the city, so flying to a city needs
one row rather than an aggregate over 2,095.

**`episodes`** — canonical, independent of our places. 302 rows.

    episodes(id, show, season, episode, overall_episode, title, air_date,
             source_locations text[], unique(show, season, episode))

`source_locations` keeps the raw Wikipedia location strings so a bad match
can be re-derived later without refetching.

**`city_episodes`** — many-to-many, because the join genuinely is. Some
cities appear in several episodes across several shows; some episodes cover a
country and therefore several of our cities.

    city_episodes(city_id, episode_id, match_kind, primary key(city_id, episode_id))

`match_kind` records *how* we matched — `exact` (city name), `country`,
`region`, `manual` — so a weak match is visibly weak rather than
indistinguishable from a strong one.

**Backfill rule for `appearances`.** Only where the existing season matches
or is NULL. A season the KML folders gave us is never overwritten. Conflicts
are written to `notes/episode-conflicts.log` and left alone.

**Video is a column, not yet a value.** The rule is official uploads only —
CNN and Zero Point Zero's own channels. I can't determine official-versus-rip
for 302 episodes without a YouTube Data API key, and guessing risks linking
exactly the pirated uploads the brief rules out. Columns ship empty; see
`questions.md`.

---

## Episode backfill is a city-level inference, and it needed a second guard

Backfilling `appearances.episode` from a city match asserts something stronger
than what was matched. What we know is *this city appears in this episode*.
What the place panel then says is *this place appears in this episode*. That
holds only if the show visited the city exactly once.

The first version checked whether more than one episode **matched**, which is
not the same as whether more than one episode **exists**. No Reservations has
both "New York City" (S3E8) and "New York Outer Boroughs" (S5E19). Only the
first folds to our city name, so all 60 New York No Reservations appearances
were stamped S3E8 — outer-borough ones included. That is exactly the false
precision that looks like data.

Now the matcher also scans every episode of the same show for a
word-boundary mention of the city, and refuses to pick when more than one
exists. Word-boundary matters: plain substring made the city of Man collide
with "Manila" and "Oman".

Backfills dropped from 760 appearances to **690**. The 70 lost are the ones
that were wrong.

Four cities are now deliberately refused — New York/No Reservations, Mexico
City on two shows, and Angeles in the Philippines colliding with Los Angeles.
They keep their `city_episodes` links, so the city page can still list the
candidate episodes; only the place-level claim is withheld.

Residual known weakness: where a show visited a city exactly once, all of that
city's places for that show get the episode. For The Layover that is sound —
it is one city per episode by format. For the others it is an inference that
happens to be right most of the time. It is not marked as inferred in the UI
yet; if that matters, the honest fix is a flag on the appearance rather than
dropping the data.

---

## Architecture — the database is a compiler

The read path never touches a database. Postgres is the build-time workbench;
the site is `places.geojson`, `search.json` and a build-time `detail.json`,
baked into static HTML.

**Static export is safe for everything that comes later. Verified, not
assumed:**

- *Magic-link auth works.* supabase-js 2.112.3 defaults to the implicit flow,
  which puts the token in the URL fragment and resolves entirely in the
  browser. PKCE also works — `?code=` exchanged client-side via
  `exchangeCodeForSession`. Neither needs a server route. The thing that would
  force SSR is `@supabase/ssr`'s cookie-based session, so **don't reach for
  that package**.
- *Live RSVP counts work.* A static page client-fetches the `gathering_seats`
  view with the anon key. Already confirmed against the running instance by
  curl, before any of this was built.

So gatherings and auth do not force a rebuild as SSR later. That was the
question worth answering before committing, and the answer is no.

**The map is mounted once, above the router.** It lives in `app/layout.tsx`
via `MapShell`, so navigating to `/place/x` changes what is selected and where
the camera is, and nothing else. No unmount, no white flash, no tile refetch.

**Payload:** `places.geojson` is 114KB gzipped against a 400KB budget. See
`notes/performance-budget.md` — the budgets are in the repo and are limits,
not aspirations.

### First load: not zoomed all the way out

Landing at z1.45 centred on [10, 26] rather than a Mercator default. Three
reasons:

1. It crops Antarctica and most of the empty Pacific, so the opening frame is
   a composition rather than a rectangle with the data in the middle third.
2. Clustering is on below z7, so the world view is ~40 warm points, not 2,095
   dots. A wall of dots is what you get from *not* clustering; clustered, the
   same data reads as a constellation and the eye goes to the dense places.
3. The search palette is one keystroke away and opens on the cities with the
   most places, so the empty state is an invitation rather than a blank box.

A "Whole world" control returns you there, so the framing is a starting point
rather than a cage.

### How the awkward pins read

- **Closed (53).** Paper-coloured ring, nothing filled in, no glow. Absence,
  not a status badge — and legible at pin size without a label. Deliberately
  not a second bright colour.
- **Unnamed (42, "Meal with locals").** A ring in the accent, lit but not
  filled. Present and unmistakably a place he ate, with nothing written in the
  middle because nobody wrote down whose table it was. The place page says so
  in as many words. They are not null-name bugs and must never render as one.
- **Repeat visits (38).** A second, fainter ring. He came back.
- **Kind, where known.** Varies radius only, never hue. Colour means state; if
  it also meant category the map would need a legend, and a map that needs a
  legend has already lost.

---

## Design

Three directions built as static mockups in `notes/refs/`. All three stay on
disk; the pick is reversible because palette and type live in tokens.

- `direction-1-dupe.html` — kitchen ticket. Cool thermal paper, carbon ink,
  one printer red. Condensed grotesque + mono. Signature: the place panel is
  a printed order dupe, one line item per visit.
- `direction-2-arrivals.html` — departure board at 3am. Blue-black, amber
  phosphor, Futura. Signature: the empty seat as a split-flap counter.
- `direction-3-stamp.html` — passport page. Cool document stock, four inks
  one per show, Superclarendon slab. Signature: every visit is an entry
  stamp, rotated and overlapping.

**Picked: direction 2, Night Arrivals.** Reasons, in the order that decided it:

1. **The map is the product, and this is the only one that makes the map
   easy.** 2,095 pins have to read as foreground with the world receding
   behind them. A dark, desaturated basemap gets that for free — luminous
   points on a dim ground. The two light directions have to fight their own
   basemap to keep pins dominant, and low-contrast light basemaps are much
   harder to keep legible.
2. **It answers the first-two-seconds problem by itself.** At world zoom,
   clustered warm points on a dark ground look like a night flight map. That
   is worth looking at before you have interacted with anything.
3. **The signature scales past one place.** A split-flap counter works on a
   place panel and site-wide — "14 meals currently waiting for someone" is
   the same component. The dupe's ticket and the stamp page are both panel-
   only ideas.
4. **Closed reads at pin size with no label.** A lamp that has gone out is
   immediately legible and quietly sad, which is the brief. Struck-through
   marks (1) and cancelled stamps (3) both need to be large enough to see the
   strike.
5. **Colour stays free for state.** Shows are distinguished by label, kind by
   marker shape, so amber/green/unlit can mean *there / seats free / gone*
   rather than being spent on categories. Direction 3 spends its whole colour
   system on which show it was.
6. **Subject-true without the homage.** Airports and red-eyes are where he
   actually spent his life. It avoids both the warm-cream-and-serif default
   CLAUDE.md warns about and the food-blog register.

What I'd have kept from the others, and didn't: direction 3's stamps are the
best answer to "almost no text per place" — three overlapping stamps tell you
he came back, before you read a word. If Night Arrivals turns out thin on the
panel, that is the idea to port over as a repeat-visit indicator.

Known risk: dark ground plus a single warm accent is close to a generic
dashboard look. Managed by Futura rather than a neutral UI grotesque, tabular
figures everywhere, one accent only, and no gradients.

---

## Process

**Work on `main`.** Solo project, no reviewers, branches are overhead.

**Design tokens live in one place.** Palette, type and spacing are CSS custom
properties in a single tokens file, never literals in components. Changing
direction later is a restyle, not a rebuild.

---

## Ship-everything pass

One line each, as agreed — width over depth.

- **Tiles: Protomaps hosted API for launch**, `NEXT_PUBLIC_PROTOMAPS_KEY`. The
  3.7GB self-hosted z0–z10 extract is built and verified rendering; R2 is a
  swap of one env var later.
- **Auth is magic-link only.** No passwords, no OAuth. Profile row is created
  by the existing trigger; the only editable field is display name.
- **Gatherings are open/join/see.** No waitlist, no cancellation flow, no
  email. Seat counts come from `gathering_seats`; the base table stays private.
- **Added a `host sees guests` policy.** Found by testing rather than reading:
  `own rsvp` meant a host looking at their own dinner saw one guest, themselves.
- **Stories publish themselves.** The author flips `published` immediately
  after insert. No moderation queue.
- **Corrections are signed-in only.** Anonymous submission would get more
  corrections and more spam; login is the cheaper default to start with.
- **The first table is seeded by SQL, not config.** `supabase/first-table.sql`
  — it needs an `auth.users` row, so it can only run after the host has signed
  in once. Idempotent.
- **London is three cities** — "Greater London", "City of Westminster", "City
  of London" — because that is what Nominatim returns. 26 places between them.
  Not merged; merging would be guessing at boundaries.
- **Clusters with tiles under them:** they sit on geography now and read far
  less like a dashboard than they did on black. Left alone.

---

## Light direction

**Ported direction 1 (Dupe), not 3.** Direction 1 already has exactly one
accent on cool paper; direction 3 spends its whole colour system on four
per-show inks, which breaks the rule that the pins are the only saturated
thing. Colour values ported; the Instrument Serif / Inter Tight pairing stays.
Ground is grey-green #E6E6E1 and the accent is a printer red #B8342A —
deliberately not the warm-cream-and-terracotta default CLAUDE.md warns about.

**Closed places on light are filled paper with a thin ring.** A hollow pin is
invisible against paper, so absence had to invert: the disc is the ground
colour, the ring is what you see.

**Clusters are dots, not counting-discs.** One small dot per cluster, radius
on sqrt(count) so it barely scales, count on hover only. Cluster radius
dropped 46 → 20 and max zoom 7 → 6 so there are more, tighter dots. The world
should read as him everywhere, not as aggregation.

**`cities.region` exists because Tokyo didn't.** Nominatim returns Tokyo as
its wards — Minato, Shinjuku, Chuo, Chiyoda — so there was no city called
Tokyo and searching for it silently flew to Toronto. The metro name comes from
the state/province where present, and otherwise from the last component of the
display name before the country. 702 of 746 cities have one, and search
matches it.

---

## Homepage + retoken

- **Tokens follow noth.in's arithmetic, not their look.** Eleven sizes in two
  regimes (display steps ~1.28–1.38×, text steps ~1.10–1.25×), three weights,
  exactly two tracking values: −0.01em on display, +0.03em on 12px uppercase
  mono. 1.5625rem/25px kept as the deliberate odd step.
- **Two easing curves for the whole site**, as cubic-beziers in tokens:
  `--ease-out` (0.16, 1, 0.30, 1) for entrances, `--ease-in-out`
  (0.76, 0, 0.24, 1) for symmetric moves. Nothing else is permitted.
- **Asymmetric hover everywhere: 400ms in, 800ms out.** The link underline is
  anchored right while idle so it wipes in from the left and leaves out the
  right, never reversing. One `a` rule; there is no second link treatment.
- **Parenthetical mono labels** are the section-label pattern site-wide, via a
  global `.label` class with `::before`/`::after` parens.
- **No GSAP, no Lenis, no three.js, no transition library.** CSS transitions,
  one IntersectionObserver for entrances, one rAF scroll read for the pin, one
  rAF loop for the trail canvas. Their 752KB stays theirs.
- **Map moved to `/map`; the homepage takes `/`.** The map only mounts on map
  routes — the homepage should not pay for MapLibre. Within map routes it still
  never unmounts.
- **Loader counts 000 → 2,095 in 3s on a cubic in-out**, so it dwells at the
  ends and sprints through the middle; place names flicker behind it every
  110ms. Exit is a 1.2s full-height wipe up. Once per session via
  sessionStorage, with an inline head script hiding it before paint on repeat
  visits. Reduced-motion gets no loader at all.
- **The pinned hero is the only pin on the page.** Two viewports, photo scales
  1.3 → 0.5 on one custom property written by a throttled scroll read.
- **The trail fits its own bounds** rather than sitting on a world projection —
  60 cities with a dated exact-match episode, in broadcast order, Las Vegas
  2005 → Newfoundland 2018. Built as a reusable component for the map page.
- **Every photo entry carries a `credit` field**, rendered beside the image and
  again in the colophon. A photo without one still renders but the build prints
  a loud warning and the page shows the gap in accent colour.
- **Internal links are `next/link`, external stay `<a>`.** Verifying prefetch
  turned up a worse bug: the place panel's city link was a plain anchor, so
  clicking it did a full page load and rebuilt the map. Now client-side, and
  the map survives the navigation. Prefetch was never the problem — App Router
  already fetches every in-viewport link's payload on load, so hover adds
  nothing because there is nothing left to fetch.

---

## Pass two — section 0, five defects

- **The underline really does exit right now, and it is CSS-only.** The brief
  specified an `.is-exiting` class driven by JS. I built that, and it failed
  its own test: the listener worked under a synthetic event but the class
  never stuck under a real pointer move. The pure-CSS form is simpler and
  provably identical — idle and exit anchor the gradient at `100%`, hover
  anchors at `0%`, and only `background-size` transitions, so the anchor flips
  instantly and the line always travels one way. Fewer moving parts, works
  without JS, and passes the specified assertion: **200ms after mouseleave the
  computed background-position is 100%, not 0%.**
- **body line-height is `--lh-body` (1.55).** `--lh-tight` is headings only.
- **The accent is map pins and the loader count. Nothing else.** Sixteen other
  uses stripped — buttons, focus rings, chairs, hovers, episode numbers — all
  now ink. Verified by grep as part of the acceptance run.
- **No count is hardcoded anywhere.** `SITE_STATS` is derived at build time
  into `content/stats.generated.json` and read through `lib/stats.ts`.
  Comments that contained figures were genericised too, since a number in a
  comment is a number waiting to be pasted into markup.
- **`--paper` renamed to `--ink`.** It was the text colour named after the
  background, which was going to cause a wrong edit.

### SITE_STATS, derived 2026-08-16

```
places        2,095
cities          746
episodes        302
appearances   2,135
closed           53
broadcast     2005-07-25 → 2018-11-11
undated       a_cooks_tour
```

- **The date range was wrong and is now derived.** The stat line said
  1999–2018; the data cannot support it. See `questions.md` — the line now
  reads from `broadcastLine()` and says what is true.

---

## Pass two — section 1, the loader

- **The mark is BOURDAIN with the O as a circular photo window**, one
  `BourdainMark` component used at two sizes so the loader and the nav logo
  cannot drift apart. "Where he ate" stays a plain sentence beside it — the
  mark can be a flex, the sentence saying what the site is cannot.
- **It resolves.** Food cycles through the O on `90 + 420·(1 − sin(πt))` ms —
  slow at both ends, fastest mid-count. When the count lands the cycling stops
  and the O becomes the one photograph of him, held 1s, then the curtain. He
  is never a frame in the shuffle: arriving at him once is a sentence, and it
  spends one licensed photo instead of a dozen.
- **Counter is 000 → SITE_STATS.places over 4000ms**, easeInOutQuad,
  zero-padded, thousands separator only once there is a thousand. Asserted
  against the derived stat, not a literal.
- **`?loader=hold`** freezes it at the resolved frame for deterministic
  screenshots. Reduced motion renders no loader at all.
- **Pure photo helpers moved to `lib/photo.ts`.** `lib/about.ts` imports
  `node:fs`, so a client component importing its helpers dragged fs into the
  browser bundle and the build failed outright — which is the good failure
  mode, but the split is the fix.
- **Only the loader's mark carries the test hooks.** The nav wears the same
  component, and without a `probe` flag both answered the same
  `querySelector` — which made a passing loader look broken for three runs.

---

## Pass two — section 2, the hero pull-back

- **One plate, then the whole life.** 250vh wrapper, one sticky stage, the
  photograph scaling 1 → 0.04 until it is one pin among 2,095 on a world
  scatter. No copy explains it.
- **Linear in scroll, deliberately.** Easing belongs to entrances; anything
  tied to the scrollbar has to track the finger. One passive listener,
  rAF-throttled, a single `getBoundingClientRect`, writing one custom property.
- **Gated at 992px and under reduced motion**, where `data-pinned="false"`
  turns the whole thing into a settled photograph — no travel, no transform,
  and the credit reappears.
- **`public/data/world.json`** is a 26KB scatter of all 2,095 coordinates at
  one decimal, so the homepage does not load the 561KB search index to draw a
  background.
- **The pin lands on real coordinates** looked up from the photo's `placeSlug`.
  No slug or an unknown one logs a build warning and the world renders without
  a highlighted pin — it does not drop one somewhere plausible.
- **Screenshots are deterministic**: `?loader=hold` freezes the resolved frame,
  and the shot script drives the pull-back to exact scroll fractions. The whole
  pass runs twice, the second time with reduced motion forced, and asserts the
  pin does not move.

---

## Feel pass — items 1 and 3 only

- **Lenis, driven from one shared rAF loop.** lerp 0.1, wheelMultiplier 1,
  easing `1.001 − 2^(−10t)`, `syncTouch: false` (the platform's own momentum
  is better than Lenis on top of it), `autoRaf: false`. Measured: one wheel
  flick gives 451 → 648 → 759 → 821 → 856 → 876 → 887 → 893 → 896 → 898 → 900
  and settles. It coasts.
- **Everything scroll-linked reads the shared frame, not `window.scrollY`.** A
  native scroll listener fires against the real position while Lenis is still
  interpolating toward it, so the hero would judder against its own smoothing.
  `lib/scroll.ts` owns the instance, the loop and the subscriptions; the
  cursor will ride the same loop when it lands.
- **No smoothing on map routes.** MapLibre owns the wheel there; two things
  interpreting the same gesture is worse than one.
- **Text arrives from behind a mask edge.** `MaskedText` measures the *rendered*
  line breaks rather than guessing, wraps each line in `overflow: hidden`, and
  translates the inner span from 100% over 1.2s, 70ms apart. No opacity
  anywhere in that path. It re-splits on resize and keeps the full string as
  the element's accessible name — verified: a masked "2,095" still reports
  `aria-label="2,095"`.
- **`.reveal` keeps opacity** and is now for non-text blocks only (figures,
  grids). Anything that reads as language goes through `MaskedText`.
- **`?loader=1` forces a replay** ignoring sessionStorage; `?loader=hold`
  freezes the resolved frame.
