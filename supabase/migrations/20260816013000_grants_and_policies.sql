-- Make the RLS in 20260816004034_schema.sql actually reachable.
--
-- Supabase grants role postgres only Dxtm (TRUNCATE / REFERENCES / TRIGGER /
-- MAINTAIN) to anon and authenticated on new tables in public — deliberately
-- not arwd. So without explicit grants every policy in the first migration is
-- dead code: `places readable ... using (true)` grants nothing, and the map
-- renders zero pins for a logged-out visitor. Policies gate access; grants
-- are what create it in the first place.

-- ---------------------------------------------------------------
-- 1. Reads
-- ---------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on public.places, public.appearances, public.profiles, public.gatherings
  to anon, authenticated;

-- stories was not on the list, but `published stories` is a select policy and
-- the whole point of a writeup is that strangers read it. Without this grant
-- that policy stays dead and no story is ever visible to anyone but its
-- author. Added deliberately.
grant select on public.stories to anon, authenticated;

-- Note what is NOT granted: select on rsvps to anon. Seat counts come from
-- the gathering_seats view below, so the map can show empty chairs without
-- publishing who is sitting in the full ones.

-- ---------------------------------------------------------------
-- 2. Writes — authenticated only
-- ---------------------------------------------------------------

grant insert, update on public.profiles   to authenticated;
grant insert, update on public.gatherings to authenticated;
grant insert, update on public.stories    to authenticated;
grant insert          on public.corrections to authenticated;
grant select, insert, update, delete on public.rsvps to authenticated;

-- No delete on gatherings or stories: a host cancels by setting
-- status = 'cancelled', which the existing update policy already allows.
-- Nothing that has been shown to other people gets to vanish silently.

-- Server-side code reaches Postgres as service_role. It bypasses RLS but
-- still needs table privileges — without these the importer and any admin
-- task fail through PostgREST with the same "permission denied" this
-- migration exists to fix.
grant all on all tables in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;

-- ---------------------------------------------------------------
-- 3. A signed-up user needs a profile row
-- ---------------------------------------------------------------
-- profiles.id references auth.users, and gatherings.host_id, rsvps.user_id
-- and stories.author_id all reference profiles. With no way to create the row
-- signup dead-ends at the first thing a user tries to do.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'someone'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Belt and braces: the trigger covers new signups, this covers anyone who
-- predates it and lets a client upsert its own row. Scoped so you can only
-- ever create a profile that is yours.
create policy "create own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- ---------------------------------------------------------------
-- 4. An author needs to be able to publish
-- ---------------------------------------------------------------
-- stories.published defaults false and there was no update policy, so a
-- story could be written and never published — and stories_place_idx is
-- `where published`, so it would never appear anywhere.
-- with check as well as using, so an author cannot hand their story to
-- someone else on the way through.

create policy "edit own story" on public.stories
  for update using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

-- ---------------------------------------------------------------
-- 5. Empty seats without publishing the guest list
-- ---------------------------------------------------------------
-- The signature idea is the map as a picture of how many meals are waiting
-- for someone, which needs a per-gathering count. Granting select on rsvps
-- would also expose who is going, and turning a dinner with strangers into a
-- browsable list of who is meeting whom is a different, worse product.
--
-- security_invoker = false is the point, not an oversight: the view runs as
-- its owner and so sees past RLS on rsvps. It returns three integers and no
-- identities.

create view public.gathering_seats
  with (security_invoker = false)
  as
select g.id                                                   as gathering_id,
       g.seats,
       count(r.user_id) filter (where r.status = 'going')::int as seats_taken
from public.gatherings g
left join public.rsvps r on r.gathering_id = g.id
group by g.id, g.seats;

comment on view public.gathering_seats is
  'Seat counts for the empty-chair display. Deliberately bypasses RLS on rsvps to count them; exposes no user identity.';

grant select on public.gathering_seats to anon, authenticated;
