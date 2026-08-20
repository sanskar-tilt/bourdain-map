# Open questions

Things I need a human answer for, or that are parked deliberately. Delete an
entry when it's answered and move the answer to `decisions.md`.

---

## Needs your call

**I need the URL of deannd's original My Maps.** City pages link out to
eatlikebourdain.com and an r/AnthonyBourdain search, but the third link you
asked for — her original maps — needs a real URL and I won't invent one. It
belongs on every city page and on the About page, since the whole dataset is
hers. Send the link (or links, if it's one per show) and I'll wire it into
`elsewhere()` in `app/city/[slug]/page.tsx`.

**The basemap decision, if you want to overrule it.** Extracting global z0–z10
(3.7GB, fits R2's free tier) rather than the z0–z12 you asked for, because
z0–z12 measures 18GB and breaks the free-tier constraint. Full reasoning and
the R2 setup you need to do is in `notes/basemap-setup.md`.

**There is no second geocode to reconcile.** Step 0 asked me to reconcile my
Nominatim run against an offline reverse-geocode "done separately". That
dataset is not on this machine — `data/` contains only the KMLs, the Wikipedia
cache, and my Nominatim cache. Nothing was committed to git either.

Your reasoning about it is right and I'd apply it as stated: nearest-populated-
place always resolves, so 100% coverage with zero failures is guaranteed by
construction rather than earned, and Nominatim is the truth. If you ran that
elsewhere, drop the file into `data/` and I'll build the reconciliation exactly
as specified — Nominatim wins, offline fills nulls, disagreements go to
`notes/geocode-conflicts.md` with the distance to each candidate, nothing
auto-resolved.

One clarification on my own run's "0 failed": that counts HTTP failures, not
resolution. Places that come back without a usable city are counted separately
and reported as unresolved, so the final number is a real resolution rate.

**Your figures don't match mine, and I don't know where yours came from.** You
cited 875 cities, ~70% episode coverage and 163 multi-candidate cities. My run
gives different numbers, and my episode matcher now enforces country agreement
so its coverage is deliberately lower than a crude title match. Worth
reconciling when you're back — if those came from a parallel run, it's a
different pipeline and we should pick one.

**Official video links need a YouTube Data API key.** The rule is official
uploads only, and I can't tell official from rip for 302 episodes without one.
Guessing would risk linking exactly the pirated uploads the brief rules out, so
`cities.video_url` ships empty and the city page says plainly that there's no
clip rather than showing a dead link. Give me a key, or a channel list, and I'll
populate it.

**Self-hosted .pmtiles needs a file.** The style is written and the tile source
is a configurable `NEXT_PUBLIC_PMTILES_URL`, but a planet basemap build is
~100GB, which is neither a free tier nor a download I should start unasked. The
realistic options are a z0–z12 extract (a few GB, hostable on R2/B2 free tiers)
or the hosted Protomaps API with a key. Until one exists the map renders pins on
a flat ground — a legible degraded state, not a broken one.

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

---

## Batched from the ship-everything pass

- **deannd's My Maps URL** — still the one missing link. Slot is ready in
  `app/city/[slug]/page.tsx` (`DEANND_MAPS_URL`).
- **Luma** — the site's own tables work without it. If you want off-site RSVPs
  too, that's a link you paste wherever you're sharing, not a code change.
- **Supabase's built-in email sender is rate-limited** to a few an hour. Fine
  for the first table; add SMTP (Resend free tier) if it fills.
- **Anonymous corrections?** Currently signed-in only. Say the word and it's a
  one-line grant.
- **Should London's three cities be merged into one page?** Currently three.
- **Searching "Tokyo" lands on a ward** (`/city/minato-jp/`, 5 places) rather
  than on all ~20 Tokyo places. The city unit is whatever the geocoder returned,
  and merging wards into metros is a judgement call per city. Same for London's
  three. Worth a metro-level page eventually.

---

## Blocked

**Viktor's motion report was never pasted.** The prompt ended with
`[PASTE VIKTOR'S FULL MOTION REPORT BELOW THIS LINE BEFORE SENDING` and what
followed was terminal scrollback — a fragment of my own previous reply and a
repeat of the brief. There is no browser-agent analysis in it.

`notes/refs/nothin-motion.md` is therefore **not created**. I'm not writing a
file called "Viktor's motion analysis" out of my own inference and committing it
verbatim-labelled; that would put invented observations into the record as
someone else's measurements, and the instruction was explicitly that where his
timings disagree with the extracted CSS, the CSS wins — which only means
anything if his numbers are actually his.

Paste it and it takes one commit. Everything else in that brief proceeded.

---

## The broadcast date range — what the data actually supports

The stat line claimed **1999–2018**. Nothing in the dataset supports 1999, and
nothing supports 2002 either. What is there:

| Show | Episodes | Dated | Range |
|---|---|---|---|
| A Cook's Tour | 35 | **0** | — |
| No Reservations | 144 | 144 | 2005-07-25 → 2012-11-05 |
| The Layover | 20 | 20 | 2011-11-21 → 2013-02-04 |
| Parts Unknown | 103 | 103 | 2013-04-14 → 2018-11-11 |

**A Cook's Tour carries no air dates at all** — its Wikipedia episode table has
no date column, which is the same gap noted when the episodes were fetched. So
the earliest date in our data is No Reservations' first episode, not the
earliest broadcast. A Cook's Tour aired before it and we cannot prove when from
what we hold.

Rather than pick a year, the stat line now derives from the data and says:
**"2,095 places, 2005–2018, and A Cook's Tour before that."** True, and it
declines to invent the bit we don't know.

**To fix it properly** we need air dates for A Cook's Tour's 35 episodes. They
are not on the Wikipedia page we parse. If you want the real range on the front
door, that is the missing input — otherwise the current line stands.

---

## Not a bug: the loader on repeat visits

Confirmed — the opening was never dropped. It is once per session via
`sessionStorage["wha:loader"]`, so every reload after the first correctly
skips it. `?loader=1` now forces a replay without clearing storage by hand,
and `?loader=hold` freezes the resolved frame.

The real gap is the one identified in review: **there is no arrival after the
curtain.** The hero is fully rendered underneath and simply gets revealed, so
the opening stops halfway. That sequence is specified and queued — it is not
built in this pass, which was scoped to smooth scroll and masked text.

---

## Reels — both platforms verified under the static export; one nuance

The brief said to verify Instagram and TikTok embeds hydrate under
`output: 'export'` before building the page around them. Verified, in a real
headless Chrome against a static page doing exactly what the built page does
(inject the official blockquote client-side when the entry nears the
viewport, then load the platform's embed.js):

- **Instagram**: hydrates. A live reel renders fully; a dead one never gets
  `.instagram-media-rendered` and its iframe stays 2px tall — a clean signal,
  so the page detects it (15s deadline) and swaps in the site's own marked
  "no longer available" state. Fully to spec.
- **TikTok**: hydrates. embed.js exposes no `process()` API, so each new
  batch of blockquotes is picked up by re-appending the script (HTTP-cached,
  one scan per batch). One quirk: their embed player refuses the headless
  Chrome user agent — affects tests only, never readers.

**The nuance needing your eyes**: a dead TikTok still hydrates — into
TikTok's own compact "Video currently unavailable" card inside the iframe.
Cross-origin, so the page can't see that text to replace it with our marked
state; the card sits inside our frame with our caption below, which is
contained, not broken — but it's their wording, not ours. Detection would
need TikTok's oEmbed endpoint, which rejected every request I sent it
(400 even for live videos). If their card offends, that's the missing input.

Related discovery: **some accounts disable embedding entirely** — a live
`@people` (People magazine) TikTok renders the same "unavailable" card.
`scripts/reels_acceptance.mjs` looks inside the iframes and fails if a
manifest entry is embed-disabled, so you find out at acceptance time, not
from readers.

---

## The SOUND pill spec isn't where the brief said it is

The instruction was "add the SOUND pill per notes/refs/nothin-motion.md" —
but that file (Viktor's motion pass plus my reconciliation) contains no
mention of a sound pill, audio, mute, or any video control. Nothing matching
in `nothin-analysis.md` either. The pill was built to the inline spec in the
same instruction — appears with the section, knob slides 0.3s on click,
toggles the player's mute/unMute, muted always the default — which was
sufficient. If there's a fuller passage somewhere (dimensions, placement,
copy), paste it and I'll reconcile; the current pill is mono "SOUND" +
sliding knob, bottom-left of the stage, and it never shrinks with the frame.

**The pull-back video you supplied cannot be embedded — a new ID is needed.**
5ElntjskhaE ("Don't Be Afraid - Anthony Bourdain") returns YouTube error 150:
its owner forbids playback in embedded players, on any site. Verified twice
in a real browser (clean UA both times) against a control video that plays
fine in the identical harness. No architecture works around this — it's the
uploader's setting. The manifest is back to the marked gap, and the player
now degrades any future error-150 video to a marked card instead of a black
erroring frame.

Two things while choosing a replacement: it must allow embedding (paste the
ID and `node scripts/pullback_acceptance.mjs` will tell you), and note this
one was also not an official upload — MANIFESTO (@bymnfsto) is a
motivational-clips channel, which sits against your own official-uploads
rule. The CNN Parts Unknown trailer (hF2V-5lBWoo) is verified working and
official, if you want something in the frame today. Vertical Shorts are
supported either way (`pullback.vertical: true`).
