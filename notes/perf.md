# Measured performance

Numbers, not claims. Everything here was measured against the static export
in `out/`, served with gzip, on this machine. Reproduce with the commands at
the bottom.

Last measured: 2026-08-16. Basemap tiles were **not** configured, so the map
was rendering pins on a flat ground. Tile fetching will move the network
numbers; it will not move the frame timings much, because tiles are decoded
off the main thread.

## Against the budgets

| Metric | Budget | Measured | |
|---|---|---|---|
| JS, first load | < 150KB gz | **422KB gz** (253KB is MapLibre) | ✗ over |
| Pin payload | < 400KB gz, one request | **150KB gz**, one request | ✓ |
| Time to interactive | < 1.5s on 4G | **3.2s** (4G + 4× CPU throttle) | ✗ over |
| Pan/zoom | 60fps, all pins | **p50 60fps, p95 54fps, no frame over 33ms** | ✓ |
| Search keystroke → results | < 16ms | not instrumented yet | — |
| Mobile Safari | 60fps | **untested — needs a device** | — |

## Lighthouse

Desktop preset, no throttling:

```
Performance                80
First Contentful Paint     0.3 s
Largest Contentful Paint   2.1 s
Total Blocking Time        260 ms
Cumulative Layout Shift    0
Speed Index                0.8 s
Time to Interactive        2.1 s
```

Mobile preset, slow 4G + 4× CPU slowdown, **gzip on**:

```
Performance                98
First Contentful Paint     0.8 s
Largest Contentful Paint   2.3 s
Total Blocking Time        20 ms
Cumulative Layout Shift    0
Speed Index                1.2 s
Time to Interactive        3.2 s
```

> The first mobile run scored 75 with a 12.3s TTI. That was an artifact of the
> test harness: `python3 -m http.server` does not compress, so Chrome was
> pulling 959KB of JavaScript and 660KB of GeoJSON uncompressed over throttled
> 4G. Any real CDN gzips or brotlis both. The 98 above is the honest number;
> the 75 measured my web server. Worth remembering before trusting any future
> figure from an uncompressed harness.

## Frame timings

Headless Chrome, 1440×900, driven through a scripted pan across a dense region
→ zoom in through the cluster-break threshold → pan again unclustered → zoom
back out. 258 frames sampled.

```
source features        56  (clusters at world zoom)
rendered on screen     36
frame interval p50     16.7 ms   (60 fps)
frame interval p95     17.4 ms   (57 fps)
worst frame            17.7 ms
frames over 16.7ms     127  (49.2%)
frames over 33ms       0    (0.0%)
```

> **An earlier version of this file reported these numbers from an empty map.**
> The harness waited on the "2,095 places" label, which is written from our own
> `fetch` and says nothing about the map. MapLibre v6's module worker never
> instantiated under Turbopack, so the GeoJSON source held zero features while
> the label cheerfully claimed 2,095 — and the script reported a confident
> 60fps for rendering nothing. It now asserts `isSourceLoaded`, counts
> `querySourceFeatures`, and throws if `queryRenderedFeatures` is empty rather
> than reporting a frame rate for a blank canvas. Fixed by pinning MapLibre to
> v5. The numbers above are from a map with pins actually on it.

The 48.4% figure looks alarming and isn't: 16.7ms *is* the vsync interval, so
roughly half of a steady 60fps stream lands microseconds either side of it.
The number that matters is the worst frame — 18.7ms, with nothing over 33ms.
Nothing in that run dropped a frame.

## Where the JS goes

```
253 KB gz   MapLibre GL
 70 KB gz   React + Next runtime
 44 KB gz   framework chunk
 39 KB gz   app chunk
 16 KB gz   everything else
---------
422 KB gz   first load
```

**The JS budget is missed and I don't think it should be met by removing
MapLibre.** 253KB is the cost of a GPU-rendered vector map, and the whole
product is the map. The honest options are: restate the budget as "150KB
excluding MapLibre" (currently 169KB, so still 19KB over), or lazy-load the
map below the fold — which makes no sense when the map *is* the fold.

The 3.2s mobile TTI has the same root cause. FCP is 0.8s and Speed Index
1.2s, so the page is on screen and readable quickly; TTI waits for MapLibre to
parse and the GeoJSON to land. Whether 3.2s on 4× throttled CPU is acceptable
is a judgement call, not a bug.

## Not yet measured

- **Mobile Safari.** Cannot be done from here. Chrome's mobile emulation does
  not reproduce the iOS compositor, which is precisely where map performance
  dies. Needs a real device.
- **Search keystroke latency.** The scan is a linear pass over ~3,000
  pre-folded strings and should be well inside a frame, but "should be" is not
  a measurement. Needs a `performance.now()` instrument around the filter.
- **With basemap tiles.** Every number above was taken with no tile source.

## Reproduce

```bash
npm run build
python3 /tmp/gzserve.py &                 # a static server that gzips
npx lighthouse http://127.0.0.1:8900/ --preset=desktop --only-categories=performance
npx lighthouse http://127.0.0.1:8900/ --only-categories=performance   # mobile
node scripts/measure_frames.mjs
```
