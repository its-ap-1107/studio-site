# Studio site — working notes

One-page studio site for an architecture / development / plotting / real estate
practice. Static: **no build step, no dependencies, no framework.** Open
`index.html` directly. Do not introduce a bundler, npm, or a framework without
asking — the whole point is that it stays openable.

## Layout

```
index.html          structure + all copy
css/base.css        tokens, typography, chrome, the pinned stage
css/sections.css    what we do · projects · about · numbers · cta · contact
js/timeline.js      the choreography — every value as f(scroll)
js/sequence.js      canvas renderer: the renders + the camera
js/scene.js         stage typography, grade, readout, rail
js/main.js          scroll loop, in-page navigation
js/site.js          menu, reveal, gallery, counters, form
assets/             the five renders that ship
uploads/            originals, gitignored
```

Page order: **residence stage (dark) → what we do → projects → about →
numbers + CTA (dark) → contact (light)**. Palette is light; `.on-dark`
re-points `--ink/--bg/--mute/--line` so components work on either ground.

## How the opening sequence works

`#stageWrap` is 470vh with a sticky stage. Scroll maps to one value
`p ∈ [0,1]`; everything on screen is a pure function of `p`. Nothing
autoplays, and scrolling up runs the whole thing backwards.

**The explosion is real motion, not a cross-fade.** `assets/04-exploded.jpg`
is cut along the dark gaps it already contains — roof cap, roof slab, slatted
soffit, linear light, upper floor, balcony plates, ground floor, landscape —
and each layer is drawn separately and travels. Rows tile the image exactly,
so at full separation every offset is zero and it reconstructs the original
render pixel for pixel.

Renders either side of it (`01-assembled`, `05-reassembled`) cross-dissolve in
and out **while the layers are fully closed up**, so both halves of every
dissolve show a complete building. This is deliberate: earlier versions
dissolved through mid-explosion renders and the roof visibly sank before it
rose. `02-lifting` and `03-separating` are in `FRAMES` but out of `KEYS` for
that reason, and are not downloaded.

## Where the numbers live — all in `js/timeline.js`

| Knob | What it controls |
|---|---|
| `BANDS` `y0,y1` | where each layer is cut out of the exploded render |
| `BANDS` `dy` | how far that layer travels to assemble (+ is down) |
| `BANDS` `lead` | when it starts moving, so the roof leaves first |
| `explode` | how much scroll the separation and recomposition get |
| `FRAMES` `k` | per-render scale trim — keep at or above `1.00` |
| `FRAMES` `u,v` | where the building sits in that render (0–1) |
| `KEYS` | which render is on screen at which scroll position |
| `Camera.zoom/tu/tv` | the camera, in image space — including the 4 close-ups |

Rows must stay contiguous and end at `1.000`. A `k` below `1.00` stops the
render covering the stage (`sequence.js` clamps it, but don't rely on that).

**If a layer drags a neighbour with it, the cut is wrong — move `y0`/`y1`,
not `dy`.**

## Known issue — not yet fixed

The exploded render and the final assembled render are shot from **different
camera angles**, so the transition back to the finished building is not
accurate. Flagged by the owner as "we will need to revamp this later." Don't
quietly paper over it; it needs new renders or a reworked exit.

## Swapping in a different building

New renders means re-reading every coordinate above off the new images —
`BANDS` cut lines especially. There's a standing offer to build a tuning
overlay (draw the cut lines over the render, drag handles, print the `BANDS`
array) so this stops being guess-edit-reload. Not built yet.

## Before this goes live

- **The enquiry form does not send anything.** `js/site.js` validates and
  shows a thank-you; nothing is transmitted. Needs an endpoint.
- **The counters are invented** (15+ years, 50+ projects, 2M+ sq ft, 1000+
  clients) and sit near a RERA disclosures link. Need verified figures.
- Studio name, phone, email, address are placeholders.
- Projects 02–04 are abstract SVG placeholders; only 01 is a real building.
  Don't reuse the residence renders across all four — it's one building, and
  presenting it as four projects would be a false claim.
- Footer legal links go nowhere.

## Deploying

Site is at the repo root, so GitHub Pages serves the branch directly — no
workflow file. Settings → Pages → Deploy from a branch → `main` → `/ (root)`.
Push to `main` republishes. `.nojekyll` stops Jekyll touching the files.
