# Studio site — working notes  (branch: `hero-0-to-100`)

**The hero is a 0-to-100 construction sequence.** Twelve frames of one project
from bare ground to handover. Everything below the stage is unchanged from
`main` — deliberately; changes there come later.

`main` still carries the exploded-model hero. Don't merge the two stages
together without deciding which one the site is for.

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

`#stageWrap` is 560vh with a sticky stage. Scroll maps to one value
`p in [0,1]`; everything on screen is a pure function of `p`. Scrolling up
takes the building back down again.

Twelve frames, named for the work complete in each:

`build-000` bare site · `010` excavation and footings · `020` foundation walls
· `030` podium slab, columns rising · `040` five floors · `050` eight floors ·
`060` topped out · `070` cladding going on · `080` façade closed, jaali
complete · `090` canopy and landscaping · `095` snagging · `100` handover.

### Why a cross-dissolve is right here

It was wrong for the exploded sequence and right for this one, for a specific
reason: **nothing moves between these frames.** The camera is locked — same
road, same hedge, same flanking trees throughout — and what changes is material
being *added*. A dissolve between eight floors and ten floors reads as two
more floors appearing, which is what happened. There is nothing to ghost
because nothing travelled.

Eleven dissolves of 0.065 with holds of 0.018 between them; the building is
visibly growing across 72% of the stage. Work complete rises monotonically,
largest single step 0.12%.

### The readout

`TL.percent(p)` interpolates work complete **from the frames**, not from the
scroll position, so it never claims progress the image is not showing. The bar
and the number both track it.

### Framing and loading

Frames are ~2.33:1, with the black letterbox strip the generator left on
trimmed off. A wide stage crops the sides, costing a sliver of the end bays;
the building is centred, so this is safe. **Don't try to pad them to 16:9** —
extending the sky upward was tried and produced banding and a hard seam.

The opening frame gates the curtain and the other eleven stream in behind it
in sequence order. Twelve frames is ~2.6MB, far too much to hold a visitor
behind a blank screen for, and unnecessary: `drawFrame` skips any frame not
yet decoded and the previous one stays up until it arrives.

## Where the numbers live — all in `js/timeline.js`

| Knob | What it controls |
|---|---|
| `FRAMES` `pct` | work complete in that frame; drives the readout |
| `KEYS` | which frame is on screen when; two entries sharing a source are a hold |
| `Camera.zoom` | tight on the bare site, pulling back as the building gains height |
| `Camera.tv` | the point held at centre, lifting from the ground to the middle |
| `PHASES` | the six milestone labels |

Caption windows are `data-in`/`data-out` in `index.html`; the rail stops are
`data-goto`. Both move with `PHASES`.

### Assets

`assets_0_to_100/` holds the raw PNGs and is gitignored; `assets/build/` holds
the working copies. Ten files under `assets/` are inherited from `main`'s hero
and unused here — left in place deliberately, since the rest of the site is
meant to stay identical to `main`.

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
