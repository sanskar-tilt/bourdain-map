-- Add a match tier for "the name matched but nothing corroborated the
-- country".
--
-- Matching on city name alone produces exactly the false positive that
-- matters here: the No Reservations "Naples" episode against Naples,
-- Florida. Where the episode's own wikilinks carry a country and it agrees
-- with ours, the match is 'exact'. Where the episode names a bare city and
-- offers nothing to corroborate it, the match is real but unproven, and that
-- has to be visible rather than laundered into 'exact'.
--
-- Only 'exact' is allowed to backfill an appearance.

alter type episode_match add value if not exists 'name_only' after 'exact';
