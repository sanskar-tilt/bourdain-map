-- Say how we know an appearance's episode.
--
-- Backfill works at city level: we establish that a city appears in exactly
-- one episode of a show, then give that episode to every place in the city
-- from that show. Whether that is a fact or an inference depends entirely on
-- the show's format.
--
--   matched   The Layover names every episode after a single city, so if the
--             show covered this city once, every Layover place here is from
--             that episode. True by format, not by luck.
--
--   inferred  No Reservations, Parts Unknown and A Cook's Tour also name
--             episodes after countries and regions -- "Louisiana", "Mexico",
--             "Far West Texas". A New Orleans place could belong to a
--             Louisiana episode we never matched on the city name. Usually
--             right, which is not the same as right.
--
-- Presenting both with the same confidence is the thing to avoid. NULL means
-- no episode at all.

create type episode_source as enum ('matched', 'inferred');

alter table appearances add column episode_source episode_source;

comment on column appearances.episode_source is
  'How the episode was established. matched = true by the show''s format; inferred = city-level attribution that is usually but not always right; null = no episode.';

alter table appearances add constraint appearances_episode_source_needs_episode
  check (episode_source is null or episode is not null);
