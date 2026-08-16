# Launch checklist

Everything you need to click, paste, or write. In order. Nothing here needs me.

---

## 1. Supabase — the hosted project (~15 min)

1. **supabase.com → New project.** Free tier. Region: London (`eu-west-2`) —
   closest to you and to the first table. Save the database password it gives
   you; you need it in step 3.
2. **Project Settings → Data API** → copy the **Project URL**.
3. **Project Settings → API Keys** → copy the **`anon` / publishable** key.
   Not the `service_role` one — that never leaves your machine.
4. **Push the schema and the data.** From the repo:

   ```bash
   supabase link --project-ref YOUR_PROJECT_REF     # from the project URL
   supabase db push                                  # 7 migrations

   # connection string: Project Settings → Database → Connection string → URI
   export DB_URL='postgresql://postgres:PASSWORD@db.YOUR_REF.supabase.co:5432/postgres'
   psql "$DB_URL" -f supabase/seed.sql          # 2,095 places, 2,135 appearances
   psql "$DB_URL" -f supabase/seed_geocode.sql  # cities, countries, slugs
   psql "$DB_URL" -f supabase/seed_cities.sql   # 746 cities, 302 episodes
   ```

   Roughly a minute. `seed.sql` is 865KB — too big for the browser SQL editor,
   so it has to be `psql`.

5. **Authentication → URL Configuration.** Set **Site URL** to your Vercel URL
   once you have it (step 3), and add it to **Redirect URLs** too. Magic links
   break silently without this — the email arrives and the link goes nowhere.
6. **Authentication → Email.** The built-in sender is rate-limited to a few
   emails an hour. Fine for you and a handful of people; if the first table
   fills up, add a real SMTP provider (Resend's free tier is 3,000/month).

---

## 2. Map tiles (~5 min)

Cheapest thing that works today: **Protomaps hosted API**.

1. **protomaps.com → sign up → create an API key.** Free tier covers a project
   this size comfortably.
2. Set `NEXT_PUBLIC_PROTOMAPS_KEY` in Vercel.
3. Lock the key to your domain in the Protomaps dashboard — it ships in the
   browser bundle, as every web map key does.

**Later, when you want to stop depending on them:** `~/pmtiles/basemap-z10.pmtiles`
is already built — a 3.7GB global z0–z10 extract, verified rendering. Put it on
Cloudflare R2, set `NEXT_PUBLIC_PMTILES_URL` to its public URL instead, and drop
the Protomaps key. The CORS policy R2 needs is in `notes/basemap-setup.md` —
note `ExposeHeaders` for `content-range`, without which pmtiles fails in a way
that looks like a corrupt file rather than a CORS problem.

---

## 3. Vercel (~10 min)

1. **vercel.com → Add New → Project → import this repo.** Personal account,
   Hobby plan, `sanskardugar2001@gmail.com`.
2. Framework preset **Next.js**. Leave the build command alone — `npm run build`
   already runs the photo optimiser and produces the static export.
3. **Environment Variables**, all environments:

   ```
   NEXT_PUBLIC_SUPABASE_URL       https://YOUR_REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY  eyJ... (or sb_publishable_...)
   NEXT_PUBLIC_PROTOMAPS_KEY      your protomaps key
   ```

4. Deploy. Copy the `*.vercel.app` URL.
5. **Go back to Supabase → Authentication → URL Configuration** and put that URL
   in Site URL and Redirect URLs. Easy to forget; sign-in is broken until you do.

One-command redeploy after that:

```bash
npm run build && vercel --prod
```

---

## 4. The first table (~5 min, after you've signed in once)

1. Open the live site, **sign in with your email**. That creates your profile.
2. Open `supabase/first-table.sql` and edit the three values at the top: your
   email, the place slug, the date.
   Suggested London places, all real pins:
   `saint-john-restaurant-greater-london`, `e-pellicci-greater-london`,
   `rochelle-canteen-greater-london`, `borough-market-greater-london`,
   `f-cooke-greater-london`.
3. Paste the whole file into the Supabase **SQL editor** and run it. It's
   idempotent — running it twice won't create two tables.
4. Check `/tables/` on the live site.

---

## 5. What you paste in, in your own words

| Where | What |
|---|---|
| `content/about.json` → `intro.text` | A short introduction. Who you are, why this exists. |
| `content/about.json` → `essay.paragraphs` | **What he means to you.** Deliberately left empty — this is the one part of the site that has to sound like a person. |
| `content/about.json` → `places[]` | Photos of you at his places: filename, caption, and the pin's slug. |
| `content/about.json` → `tattoo` | The photo and what it is. |
| `public/about/` | The image files themselves. Any size; the build resizes them. |
| `app/city/[slug]/page.tsx` → `DEANND_MAPS_URL` | deannd's original My Maps URL. The slot is there and empty. |
| Luma | If you want RSVPs off-site too, put the Luma URL wherever you're sharing it. The site's own tables don't need it. |

Everything above except the Luma link is content, not code. Commit and redeploy.

---

## 6. Before you tell anyone — the checks that matter

- [ ] **deannd's credit is visible.** It's on `/about/` as its own section and at
      the bottom of every place panel. Confirm it survived any edits you made.
      This is a condition of using the data, not a courtesy.
- [ ] **"Sells nothing" and "not affiliated with the Bourdain estate, CNN, or
      Zero Point Zero"** both appear on `/about/`. Read them once on the live
      site.
- [ ] **No ads, no affiliate links, no bookings anywhere.** There aren't any;
      keep it that way.
- [ ] Sign in from a different browser and confirm the magic link works
      end-to-end. This is the single most likely thing to be broken, and the
      failure is silent.
- [ ] Take a seat at your own table from that second account, then check the
      seat count drops on `/tables/`.
- [ ] Open a place panel and confirm quotes are attributed to deannd.
- [ ] Check a closed place looks present-but-gone rather than broken —
      e.g. `/place/brasserie-les-halles-new-york/`.
- [ ] Load it on your phone once.

---

## 7. Known and deliberate

Not bugs. Don't let anyone tell you they are.

- **1,243 of 2,095 places have `kind = 'unknown'`.** Only No Reservations'
  KML had a category axis. There's no food filter for exactly this reason.
- **No episode numbers for 1,445 appearances.** The KMLs contain none; what's
  there came from Wikipedia and only where a city matched unambiguously.
  Inferred ones are marked as inferred in the panel.
- **Eight places have no city** — McMurdo Station, the South Pole, Mount
  Erebus and neighbours. Antarctica has no administrative city. They still
  have pages.
- **London is split** across "Greater London", "City of Westminster" and
  "City of London" because that's what the geocoder returns. 26 places between
  them.
- **No video links.** Official uploads only was the rule, and telling official
  from rip across 302 episodes needs a YouTube API key. Columns are there,
  empty.
- **Two performance budgets are missed** — see `notes/perf.md`. Both are
  MapLibre's weight, and it isn't worth chasing.
