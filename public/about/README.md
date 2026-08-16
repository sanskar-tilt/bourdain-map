Put your photos here, at whatever size the camera made them.

`npm run build` resizes them into `opt/` as WebP at 800px and 1600px and
records each one's dimensions, so the page reserves the right space and
nothing shifts as they load. Run `node scripts/optimise_photos.mjs` on its own
if you just want to process images without a full build.

Reference the *original* filename in `content/about.json` — never anything in
`opt/`, which is generated and gitignored.
