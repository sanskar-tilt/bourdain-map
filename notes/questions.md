# Open questions

Things I need a human answer for, or that are parked deliberately. Delete an
entry when it's answered and move the answer to `decisions.md`.

---

## Needs your call

**The 24 flagged closures.** `notes/import-skips.log` lists every place whose
description mentions a closure but whose name doesn't. They split two ways and
only a human can tell which is which:

- *Genuinely gone* — `wd~50`, `Vincent A Restaurant`, `Gus's Beach Bar`,
  `129 E 60th St`, `No. 16, Lane 38 Section 3 Zhinan Road`. These should be
  `status = 'closed'`.
- *Still open, replaced something that closed* — `The Milling Room` (Veritas
  closed), `The Pit Authentic Barbecue` (Mitchell's closed), `Le Swan` (Black
  Hoof closed), `The Atlantic Restaurant` (Ondine closed). These are correctly
  `unknown` and should stay that way.

Twenty-four rows. Fastest path is you reading the log and marking them; I'll
turn your answers into a migration.

**Should anonymous visitors be able to submit corrections?**
Right now `insert on corrections` is granted to `authenticated` only, per
spec. But the RLS policy is `with check (true)`, which was clearly written
with anonymous submission in mind, and `submitter_id` is nullable with
`on delete set null`. Requiring a login to report a closed restaurant will cost
you most of the corrections you'd otherwise get. Say the word and I'll grant it
to `anon` — the tradeoff is spam, against a table nobody but you reads.

**`notes/why.md` has speech-to-text artifacts.** "bullying fans" for Bourdain
fans, "boarding dead" for Bourdain ate, and one "Putin" that is almost
certainly "Bourdain" — *"how [Bourdain] used to document ordinary folks doing
ordinary things"*. It's your voice note and the source of the site's tone, so I
haven't touched it. Want it cleaned, or left raw?

**Committed generated artifacts.** `supabase/seed.sql` (865KB),
`data/places.json` (269KB) and `data/geocode-cache.json` are all committed. The
seed means a fresh clone can `db reset` into a working database without running
the importer, and the cache means nobody ever repeats the 35-minute Nominatim
run. Both defensible, both regenerable — say if you'd rather gitignore them.

---

## Parked

**A Cook's Tour has no season data.** Its folders are DVD discs grouped by
region, and the show ran two seasons. Recoverable later by matching against an
episode list — same enrichment pass that would supply episode numbers for
everything. 986 appearances currently have no season.

**Protomaps tiles need a source.** Self-hosted `.pmtiles` on object storage, or
the hosted API with a key. Free-tier either way. Not blocking until the real
map goes in.

**`kind` covers 5 values from one show.** `food, market, sight, activity,
lodging` — derived only from No Reservations' folders. If the marker vocabulary
needs finer distinctions (a bar is not a restaurant; a hot spring is not a
museum) that needs data we don't have.
