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

### The sequence

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
one picture replacing another. The opening dissolves run 8–9 % of the page
each, so it is visibly coming apart the whole way down; recomposition replays
them in reverse over the last 14 %.

About half the page is spent actively moving between states. The rest is
deliberate holds: the hero at each end, and the exploded model while the
camera works over its details.

### The eight phases

| Scroll | Phase | On screen |
|---|---|---|
| 0 – 14 % | Complete residence | `01-hero`, slow push in |
| 14 – 30 % | Architectural reveal | into `02-detaching` |
| 30 – 64 % | Layer separation | `03` → `04` → `05` → `06` |
| 64 – 70 % | Exploded composition | held |
| 70 – 79 % | Material & detail | four close passes |
| 79 – 86 % | Spatial reveal | into the lit interior |
| 86 – 97 % | Recomposition | the same renders, reversed |
| 97 – 100 % | Complete residence | back to `01-hero` |

### Framing

`01` and `02` are 3:2. The four studio renders were padded to **2:1** by
clamping their edge columns outward — a 3:2 render cover-fitted on a 16:9
stage loses ~18 % of its height, which on the exploded model is exactly where
the roof slabs and the landscape ring are.

Below a 1.45 viewport aspect the stage fits the render instead of cropping,
and fills the space around it with a gradient built from each render's sampled
`top` / `bottom` edge colours. Both renders in a dissolve always use the same
mode, so the framing never jumps mid-transition.

### The camera

One continuous move in image space. `Camera.zoom` is a scale above the fit;
`Camera.tu/tv` name the point held at centre, so each detail pass lands on its
subject at any viewport size.

## Editing

| Change                        | Where                                      |
|-------------------------------|--------------------------------------------|
| Studio / project name         | `index.html` (`.mark-name`, `<title>`)     |
| All copy                      | `index.html` — captions carry `data-in`/`data-out` |
| **Which render appears when** | `js/timeline.js` → `KEYS`                  |
| **How long a dissolve runs**  | the gap between two `KEYS` entries         |
| **A hold**                    | two `KEYS` entries sharing a source        |
| Camera moves                  | `js/timeline.js` → `Camera`                |
| Detail close-ups              | `js/timeline.js` → `Camera.tu` / `Camera.tv` |
| Phase labels and timings      | `js/timeline.js` → `PHASES`                |
| Palette                       | `css/base.css` → `:root`                   |

Caption windows live in the markup, so retiming copy is an HTML edit:

```html
<article class="cap cap--left" data-in="0.175" data-out="0.345">
```

### Swapping the building

What matters is the **renders**, not the code. The sequence works because
03–06 are one camera, one light, progressively more separated. Given that:

1. Drop the files in `assets/`.
2. Re-read `u,v` off each — where the building's centre sits in that frame,
   0–1. This is what keeps two renders aligned through a dissolve.
3. Sample each render's top and bottom edge colours into `top`/`bottom`.
4. Re-aim `Camera.tu/tv` at the new details.
5. Pad any render narrower than about 1.8:1 out to 2:1, or the stage will
   crop into it.

`k` is a scale trim; keep it at or above `1.00` or the render stops covering.

## Performance

- Six renders, ~1.8 MB, all decoded before the curtain lifts, so the opening
  frame is never a pop. Renders listed in `FRAMES` but absent from `KEYS` are
  never fetched.
- At most two `drawImage` calls per frame, and the draw is skipped entirely
  when nothing visible has changed.
- Canvas backing store capped at 1.75× DPR.
- One rAF loop that stops itself when the scroll has settled.
- `prefers-reduced-motion` quantises progress and skips the scroll easing.

## Keyboard

`→` / `←` step forward and back through the eight phases.
