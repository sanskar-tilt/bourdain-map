-- A host can see who is coming to their own table.
--
-- "own rsvp" (auth.uid() = user_id) means you only ever see your own row, so
-- a host looking at their own dinner saw one guest: themselves. Seat counts
-- still come from gathering_seats, so this exposes the guest list to the host
-- and to nobody else.

create policy "host sees guests" on public.rsvps
  for select using (
    exists (
      select 1 from public.gatherings g
      where g.id = rsvps.gathering_id and g.host_id = auth.uid()
    )
  );
