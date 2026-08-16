# Performance budget

The map is the product. If it feels like sludge, nothing else matters. These
are limits, not aspirations — a change that breaks one is a bug.

| Metric | Budget | How to check |
|---|---|---|
| JS, first load | < 150KB gz | `npm run build`, read the route table |
| Pin payload | < 400KB gz, one request | `ls -l public/data/places.geojson`, check gz size |
| Time to interactive map | < 1.5s on 4G | DevTools, Network → Fast 4G, Performance panel |
| Pan / zoom | 60fps with all pins, mobile Safari | DevTools FPS meter; real device for Safari |
| Search keystroke → results | < 16ms | `performance.now()` around the filter |

## Measuring

```bash
npm run build                              # route JS table
gzip -c public/data/places.geojson | wc -c # pin payload, gzipped
python3 scripts/export_map_data.py         # regenerate artifacts
```

Mobile Safari has to be a real device or the simulator. Chrome's mobile
emulation does not reproduce the compositor behaviour that kills map
performance on iOS, which is the whole reason it's called out separately.

## What keeps us inside these

- **No DOM markers.** 2,095 pins are one GeoJSON source rendered as GPU circle
  layers. DOM markers are the single most common cause of a map that feels
  like sludge, and they get worse linearly with pin count.
- **Style by expression, never by re-rendering data.** Selection, closed state
  and kind are all `case` expressions over feature properties. Selecting a pin
  changes a filter, not the source data, so nothing re-tessellates.
- **Clustering below z7.** Above it every pin stands alone; below it a
  continent collapses to a constellation.
- **Static artifacts, no database at runtime.** No cold start, no query
  latency, nothing to rate-limit. The read path is a CDN file.
- **Search is a linear scan over pre-folded strings.** ~3,000 of them, folded
  once on load. No index build, no debounce, no library — and no network,
  which is what would actually make it feel dead.
- **Fonts self-hosted via `next/font`.** No CDN request, no FOIT, no silent
  fallback to Times.

## Known costs

- MapLibre GL is ~230KB gz on its own, which blows the 150KB JS budget on any
  route that mounts the map. The budget is therefore **150KB gz excluding
  MapLibre**, and MapLibre is loaded once for the whole session because the
  map lives above the router and never unmounts. Worth revisiting if that
  becomes the thing that misses the 1.5s target.
- `places.geojson` is 590KB raw. It needs to be under 400KB gzipped — check
  this after every importer change, because the pin payload grows silently
  when properties are added.
