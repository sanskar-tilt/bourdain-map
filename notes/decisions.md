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
