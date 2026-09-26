# Studio Name — Architecture, Development, Plotting & Real Estate

A one-page studio site. The residence sequence is the opening chapter; the
editorial sections below it carry the rest. No build step, no dependencies, no
framework. Open `index.html`.

```
index.html          structure + all copy
css/base.css        tokens, typography, chrome, and the pinned stage
css/sections.css    what we do · projects · about · numbers · cta · contact
js/timeline.js      the stage choreography — every value as f(scroll)
js/sequence.js      canvas renderer: the renders + the camera
js/scene.js         stage typography, grade, readout, rail
js/main.js          scroll loop, in-page navigation
js/site.js          menu, reveal, gallery, counters, form
assets/             the five renders that ship
uploads/            the originals — kept locally, gitignored
.nojekyll           stops GitHub Pages running the files through Jekyll
```

## Deploying

The site is static and sits at the repo root, so GitHub Pages can serve the
branch directly — no build, no workflow file.

**Settings → Pages → Source → "Deploy from a branch" → `main` → `/ (root)`.**

Every push to `main` republishes. Vercel works too: import the repo, framework
preset **Other**, leave the build and install commands empty.

## Page order

| # | Section          | Ground |
|---|------------------|--------|
| 1 | The residence    | dark   |
| 2 | What we do       | light  |
| 3 | Projects         | light  |
| 4 | About            | light  |
| 5 | By the numbers   | dark   |
| 6 | Final CTA        | dark   |
| 7 | Contact + footer | light  |

The palette is light; the stage and the numbers/CTA chapter carry `.on-dark`,
which re-points `--ink`, `--bg`, `--mute` and `--line` so every component works
on either ground without a second set of rules. The nav watches which one it is
sitting over and flips its own colour to match.

## Before launch

- **Studio Name, phone, email, address** are placeholders — `index.html`.
- **The counters** (15+ years, 50+ projects, 2M+ sq ft, 1000+ clients) are
  placeholders. Replace with verified figures; they sit next to RERA
  disclosures, so they need to be right.
- **Projects 02–04** are the abstract SVG placeholders from the reference
  design. Project 01 is the real residence. Swap the rest for real work.
- **The enquiry form does not send anything.** `js/site.js` validates and shows
  a confirmation, nothing more. Point it at an endpoint before launch.
- **Legal links** in the footer go nowhere.

## How it works

`#stageWrap` is 470 vh tall (400 vh on mobile) with a `position: sticky` stage
pinned inside it. Scroll position maps to a single progress value `p in [0,1]`,
and **everything** on screen is a pure function of `p`.

Nothing autoplays. Scroll up and the whole presentation runs backwards.

### The explosion is animated, not cross-faded

`04-exploded.jpg` is never shown as a picture. It is cut along the gaps the
render already contains — the dark bands between the roof cap, the roof slab,
the slatted soffit, the linear light and the floors — and each layer is drawn
separately, travelling straight down to assemble and straight back up to come
apart. No rotation, no spin, no drift.

The layers are defined in `js/timeline.js` -> `BANDS`:

| Layer                     | Image rows    | Travel | Starts at |
|---------------------------|---------------|--------|-----------|
| Grey cap slab             | 0.000 – 0.056 | +0.210 | 0.00      |
| Roof slab                 | 0.056 – 0.140 | +0.180 | 0.04      |
| Slatted soffit            | 0.140 – 0.233 | +0.146 | 0.08      |
| Linear light + chandelier | 0.233 – 0.322 | +0.096 | 0.13      |
| Upper floor volume        | 0.322 – 0.540 | +0.028 | 0.19      |
| Balcony + floor plates    | 0.540 – 0.640 | +0.008 | 0.25      |
| Ground floor              | 0.640 – 0.790 |  0     | anchor    |
| Landscape + paving        | 0.790 – 1.000 | −0.034 | 0.31      |

The rows tile the render exactly, so at full separation every offset is zero
and the reconstruction is the original image pixel for pixel. Each layer has
its own start point, so the roof canopy leaves first and the landscape last —
the order an architect would present it in — and the exact reverse coming back.

About 44 % of the page is layer motion; about 21 % is cross-dissolve.

### The eight phases

| Scroll      | Phase                   | What is on screen                     |
|-------------|-------------------------|---------------------------------------|
| 0 – 15 %    | Complete residence      | `01-assembled`, slow push in          |
| 15 – 30 %   | Architectural reveal    | dissolve into the animated master     |
| 30 – 66 %   | Layer separation        | the layers travel apart               |
| 66 – 72 %   | Exploded composition    | held apart                            |
| 72 – 80 %   | Material & detail       | four close passes                     |
| 80 – 84 %   | Spatial reveal          | into the ground-floor glazing         |
| 84 – 93 %   | Recomposition           | the layers travel back                |
| 93 – 100 %  | Complete residence      | dissolve to `05-reassembled`          |

Both dissolves happen while the layers are fully closed up, so each one runs
between two complete buildings and only the camera angle changes. The building
never appears to close before it opens.

### The renders

Ordered by how far the building has opened, which is *not* the order the files
were produced in:

| File                | Angle       | State                                   |
|---------------------|-------------|-----------------------------------------|
| `01-assembled`      | eye-level   | complete — the hero                     |
| `02-lifting`        | eye-level   | landscape detached, building intact     |
| `03-separating`     | elevated    | upper floor opened up                   |
| `04-exploded`       | elevated    | fully apart — **the animated master**   |
| `05-reassembled`    | eye-level   | complete — the close                    |

`02` and `03` are **not in the sequence**, and are not downloaded. Both are
mid-explosion, so dissolving through them forces the master to enter already
half open, handing most of the roof's travel to a dissolve instead of showing
it — and neither one's roof height matches the master's at the crossing point,
so the roof visibly sinks before it rises. `js/timeline.js` -> `KEYS` carries
the two-line change to put one back if you want a longer lead-in.

### The camera

One continuous move in image space. `Camera.zoom` is a scale above cover-fit;
`Camera.tu/tv` name the point held at centre, so each detail pass lands on its
subject at any viewport size. `cover` is enforced as a floor, so a render can
be cropped but can never letterbox.

## Editing

| Change                        | Where                                      |
|-------------------------------|--------------------------------------------|
| Studio / project name         | `index.html` (`.mark-name`, `<title>`)     |
| All copy                      | `index.html` — captions carry `data-in`/`data-out` |
| **Where the cuts fall**       | `js/timeline.js` → `BANDS` (`y0`,`y1`)     |
| **How far a layer travels**   | `js/timeline.js` → `BANDS` (`dy`)          |
| **The order layers separate** | `js/timeline.js` → `BANDS` (`lead`)        |
| How long the explosion takes  | `js/timeline.js` → `explode`               |
| Which render appears when     | `js/timeline.js` → `KEYS`                  |
| Camera moves                  | `js/timeline.js` → `Camera`                |
| Detail close-ups              | `js/timeline.js` → `Camera.tu` / `Camera.tv` |
| Phase labels and timings      | `js/timeline.js` → `PHASES`                |
| Palette                       | `css/base.css` → `:root`                   |

Caption windows live in the markup, so retiming copy is an HTML edit:

```html
<article class="cap cap--left" data-in="0.175" data-out="0.345">
```

### Tuning the explosion

Everything about the motion lives in `BANDS`. Each row is one layer:

```js
{ y0: 0.056, y1: 0.140, dy: 0.180, lead: 0.04 }   // the roof slab
```

- `y0, y1` — where the layer sits in `04-exploded.jpg`, top to bottom, 0–1.
  Rows must stay contiguous and end at `1.000`, or the render will not
  reconstruct exactly at full separation.
- `dy` — how far it travels to assemble, in image heights. Positive is down.
  Read it off the render: the distance from where the layer sits to where it
  belongs on the building.
- `lead` — where inside the separation this layer starts moving, 0–1. Lower
  leaves first.

If a layer looks like it takes the wrong piece with it, the cut is in the
wrong place — adjust `y0`/`y1`, not `dy`.

### Adding a render

Drop it in `assets/`, add an entry to `FRAMES`, and place it in `KEYS`:

```js
lifting: { src: 'assets/02-lifting.jpg', k: 1.04, u: 0.482, v: 0.470 }
```

- `k` — scale trim. Keep it at or just above `1.00`; below that the render
  stops covering the stage.
- `u, v` — where the building's centre sits in that render, 0–1. This is what
  aligns it with its neighbours during a dissolve.
- `bands: true` marks a render as the animated master. Only one should carry
  it, and `BANDS` must be read off that render.

Renders listed in `FRAMES` but absent from `KEYS` are not downloaded.

## Performance

- Three images, ~500 KB, all decoded before the curtain lifts, so the opening
  frame is never a pop. The two unused renders are never fetched.
- Eight `drawImage` calls per frame while the layers are moving, one when they
  are fully apart, and the draw is skipped entirely when nothing visible has
  changed.
- Canvas backing store capped at 1.75× DPR.
- One rAF loop that stops itself when the scroll has settled.
- `prefers-reduced-motion` quantises progress and skips the scroll easing.

## Keyboard

`→` / `←` step forward and back through the eight phases.
