# Basemap: what I need from you

The style is written (`lib/basemap.ts`) and the tile source is already a
configurable URL. Everything below is about getting a `.pmtiles` file onto R2
and telling the app where it is.

## What I've done

Extracting `basemap-z10.pmtiles` from the Protomaps planet build
(`20260810`, planetiler 0.10.2, OSM data 2026-08-10) over HTTP range requests.
No download of the full 110GB planet — `pmtiles extract` pulls only the tiles
it needs.

## Why z0–z10 and not z0–z12

Measured with `pmtiles extract --dry-run`, so these are real numbers:

| Extract | Size | Complete world? |
|---|---|---|
| global z0–z8 | 551 MB | yes |
| global z0–z9 | 1.6 GB | yes |
| **global z0–z10** | **3.7 GB** | **yes** ← building this |
| global z0–z12 | 18 GB | yes |
| region-limited z0–z13 (10km around every place) | 872 MB | **no** |

Two findings changed the plan:

1. **z0–z12 is 18GB.** That breaks R2's 10GB free tier and CLAUDE.md's "keep it
   on free tiers". At R2 pricing it's roughly $0.12/month, so it's affordable —
   but it's a decision, not a default.
2. **The region-limited extract is not viable, and I checked rather than
   assuming.** Buffering ~10km around all 2,095 places gives 883 cells and a
   tidy 872MB, but at z0–z6 it captures only **442 of the 3,398** world tiles.
   The world view — the first thing anyone sees — would be full of holes over
   every region he never visited. `pmtiles` has no merge command, so "global
   low zoom + regional high zoom" cannot be combined into one archive.

**What z0–z10 costs:** at display zoom 11+ MapLibre overzooms the z10 tiles.
Protomaps z10 tiles carry coastlines, water, boundaries and major roads, but
not residential streets. Since the style draws no POI labels, no road labels,
and roads only as the faintest structure, the visible loss is minor streets at
maximum zoom. Given the design intent — the basemap recedes, the pins are the
only bright thing — that seems an acceptable trade. Say the word and I'll run
the 18GB z0–z12 instead.

## What I need from you

1. **Create the R2 bucket.** Any name; `bourdain-basemap` would do.
2. **Enable public access** and give me the public URL. Either the r2.dev
   development URL (fine for now) or a custom domain like
   `tiles.yourdomain.com` — better, since Cloudflare rate-limits r2.dev and
   says not to use it in production.
3. **Set CORS on the bucket.** PMTiles works by issuing HTTP Range requests
   from the browser; without this the map fails with opaque CORS errors and no
   other symptom. This exact policy:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://YOUR-PRODUCTION-DOMAIN"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["range", "if-match"],
    "ExposeHeaders": ["etag", "content-range", "content-length"],
    "MaxAgeSeconds": 3600
  }
]
```

   `ExposeHeaders` matters as much as `AllowedHeaders`: pmtiles reads
   `content-range` off the response, and if it is not exposed the range
   requests fail in a way that looks like a corrupt archive.

4. **Send me the URL** and I'll set `NEXT_PUBLIC_PMTILES_URL` and verify.

## Uploading

Once the bucket exists, either you upload it, or give me R2 credentials
(`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) and I'll run:

```bash
pmtiles upload ~/pmtiles/basemap-z10.pmtiles basemap-z10.pmtiles \
  --bucket='s3://bourdain-basemap?endpoint=https://ACCOUNT.r2.cloudflarestorage.com&region=auto'
```

I would rather you did the upload than hold your R2 keys, unless you would
prefer otherwise.

## Until then

`hasBasemap` is false and the map renders pins on a flat ground with a one-line
note in the corner. Degraded but legible, and deliberately not a crash. Nothing
else in the app depends on tiles.

## After it is wired

I will screenshot z0, z4, z8 and z12 into `notes/refs/basemap/` so you can check
the style reads as intended — desaturated, no POI or road labels, pins the only
bright thing — without running the site.
