# Worklog — six-step run

Blunt by instruction. One entry per step; blockers and disagreements recorded
here rather than worked around.

---

## Step 1 — remove the pull-back  ✅

Deleted `HeroPullback.tsx`, its section in `page.tsx`, all `.pullback` /
`.pullStage` / `.pullWorld` / `.pullPhoto` / `.pullCredit` CSS, the leftover
`pinWrap`/`pinSticky`/`heroMedia` CSS from the *earlier* pinned hero (also
dead, also reading `--p`), and both pull-back tests. New acceptance check:
zero `[data-pin]`, zero inline `--p` on the homepage — passes.

Judgement calls, stated rather than hidden:

- **The scroll cue died with the component.** It lived inside HeroPullback, so
  for exactly this commit the arrival's "cue" phase advances but animates no
  element. It returns with the fluid hero in step 2. The phase-order test
  still passes because it reads the `data-opening` attribute, not the cue.
- **`.arrival-photo` CSS in globals is now orphaned** (the hero photo it
  targeted is gone). Left in place: step 2's hero wants the same entrance.
- **Kept the `[data-pin]` skip in the opacity audit.** It is dormant until
  step 6 reintroduces exactly one pinned element, which will need it.
- **`world.json` (26KB) still exports and still ships.** Nothing fetches it
  right now; step 2's build-time map image will be generated from it, so the
  export stays.
