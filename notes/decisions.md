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

## Process

**Work on `main`.** Solo project, no reviewers, branches are overhead.
