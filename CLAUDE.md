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
`p in [0,1]`; everything on screen is a pure function of `p`. Nothing
autoplays, and scrolling up runs the whole thing backwards.

Six renders of one residence, ordered by how far it has come apart:

| | Render | What it is |
|---|---|---|
| 01 | `01-hero` | sunset exterior, complete |
| 02 | `02-detaching` | same camera and light, panels begin to lift away |
| 03 | `03-separating` | dark studio, mildly apart |
| 04 | `04-apart` | facade panels floating out |
| 05 | `05-opening` | floor plates separate, interior exposed |
| 06 | `06-exploded` | fully apart, structure and landscape ring separated |

**03 to 06 share one camera and one lighting setup.** That is what makes the
dissolves between them read as the building continuing to open rather than as
one picture replacing another, and it is why this does not need the image cut
into moving layers. The previous building's explosion was vertically layered,
so band cuts worked; **this one throws parts outward in every direction, and
horizontal cuts would shear it.** Don't reintroduce the band system here.

The opening dissolves run 8–9% of the page each, so the building is visibly
coming apart the whole way down. Recomposition replays the same renders in
reverse, a little brisker, over the last 14%.

`01` and `02` are 3:2; the four studio renders were padded to **2:1** by
clamping their edge columns outward, so a wide stage crops almost nothing off
the exploded model. Below a 1.45 viewport aspect the stage fits the render
instead of cropping and extends the backdrop using each render's sampled
`top`/`bottom` edge colours, so nothing is ever cut off the sides.

## Where the numbers live — all in `js/timeline.js`

| Knob | What it controls |
|---|---|
| `KEYS` | which render is on screen at which scroll position; two entries sharing a source are a hold, two different ones cross-dissolve across the whole span |
| `FRAMES` `k` | per-render scale trim — keep at or above `1.00` |
| `FRAMES` `u,v` | where the building sits in that render (0–1) |
| `FRAMES` `top,bottom` | edge colours for the narrow-screen backdrop |
| `Camera.zoom` | scale above the fit |
| `Camera.tu/tv` | the point held at centre — including the four close-ups, read off `06-exploded.jpg` |
| `PHASES` | the eight labels and their boundaries |
| `studio` | how far into the dark studio the grade has gone |

Caption windows live in `index.html` as `data-in` / `data-out`, and the stage
rail's stops are `data-goto` on its buttons. All three sets have to move
together when the timing changes.

## Known issue — not yet fixed

The exploded render and the final assembled render are shot from **different
camera angles**, so the transition back to the finished building is not
accurate. Flagged by the owner as "we will need to revamp this later." Don't
quietly paper over it; it needs new renders or a reworked exit.

## Swapping in a different building

What matters most is the **source renders**, not the code. The sequence works
because 03–06 are one camera, one light, progressively more separated. Given
that, swapping buildings is mostly: drop in the files, re-read `u,v` off each,
re-aim `Camera.tu/tv` at the new details.

If a new set only has one exploded render, the old band-cutting technique is
in git history (before this building) — but only use it where the explosion is
layered vertically.

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
