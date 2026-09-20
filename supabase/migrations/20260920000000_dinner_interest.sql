-- In-site London dinner list. Anyone can leave a name. The client never
-- reads the table — confirmation lives on the device.

create table dinner_interest (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  note        text,
  city        text not null default 'London',
  created_at  timestamptz not null default now()
);

alter table dinner_interest enable row level security;

create policy "anyone can join the london list"
  on dinner_interest for insert
  to anon, authenticated
  with check (
    char_length(name) between 1 and 120
    and char_length(email) between 3 and 254
    and char_length(coalesce(note, '')) <= 200
  );

grant insert on public.dinner_interest to anon, authenticated;
grant all on public.dinner_interest to service_role;
