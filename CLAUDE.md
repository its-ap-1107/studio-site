# Studio site — working notes  (branch: `hero-video`)

**The hero is a video clip that plays on its own clock.** A slow dolly from
the full elevation in to the entrance lobby, 7s, looping. Everything below the
hero is inherited from `hero-0-to-100`, including the real Work section.

Branched from `hero-0-to-100`. `main` carries the exploded-model hero;
`hero-0-to-100` the 12-frame construction sequence. Three heroes, one site —
pick one before merging anything.

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

## How the hero works

`#stageWrap` is 220vh with a sticky stage. The clip **autoplays, muted, and
loops**; it is *not* scrubbed by scroll. Scroll has one job here: crossing the
copy over the top of it.

### Why not scroll-scrubbed

Two reasons, and the first is the one that matters:

1. **It is a directed camera move.** The dolly-in was composed with a pace.
   Handing that pace to the scroll wheel throws away the thing that makes it
   good.
2. **Scrubbing compressed video is unreliable.** Seeking only lands cheaply on
   keyframes; between them the decoder has to run forward from the last one.
   On Safari and most phones this stutters visibly. It is exactly why Apple
   uses image sequences, not video, for scroll-driven heroes — and why
   `hero-0-to-100` exists as the scroll-driven option.

The two techniques are complementary, not competing. If you want scroll
control, use that branch; this one is for a clip that plays itself.

### The loop seam

The clip ends deep in the lobby and restarts on the wide elevation, so the wrap
is a hard cut. `js/video.js` dips opacity over the last and first 0.45s, which
reads as a breath rather than a jump. Change `DIP` there to taste.

### The pause control

Auto-playing motion that runs over five seconds needs a way to stop it, and
this loops indefinitely, so **it is not optional** — don't remove it. It also
doubles as the Play control when a browser refuses autoplay, which some do
until the visitor interacts.

The clip is paused while off screen, and never autoplays under
`prefers-reduced-motion` — the poster stands in and the control offers Play.

### Files

`assets/video/hero.mp4` 1.5MB · `hero-alt.mp4` 1.2MB is a second take, not
referenced; swap the `<source>` to try it. `hero-poster.jpg` carries the first
paint so the stage is never blank.

Source clips were 13.8MB and 10.4MB for seven seconds — around 16 Mbps, which
is unusable on mobile data. They were re-encoded with VLC's CLI
(`--sout "#transcode{vcodec=h264,vb=1500,...}"`), which is the only encoder on
this machine; there is no ffmpeg. VLC's `scene` filter only works inside a
transcode pipeline, not with `--vout=dummy`, if you ever need frames again.

`js/sequence.js` and the frame assets from the other heroes are removed on
this branch — they belong to the branches that use them.

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
- **The hero clip carries a "KlingAI 3.0" watermark**, bottom right,
  throughout. It cannot ship like that. Re-render without it, crop it out
  (it costs ~8% of the height), or cover it.
- **The counters are invented** (15+ years, 50+ projects, 2M+ sq ft, 1000+
  clients) and sit near a RERA disclosures link. Need verified figures.
- Studio name, phone, email, address are placeholders.
- ~~Projects 02–04 are abstract SVG placeholders~~ **Done on this branch.**
  The Work section now carries seven real completed projects supplied by the
  client. The SVG placeholders are gone. `main` still has them.
- Footer legal links go nowhere.

## The Work section

Seven completed projects from the client, in `assets/work/`. Raw files are in
`work/` and gitignored.

The captions state only what is visible in each image — discipline, unit count,
and the figures printed on the layout drawings (1,477 sq.mt open space;
1,795 sq.mt amenity). **No locations, client names, dates or values have been
invented.** Keep it that way: this section sits a short scroll from a RERA
disclosures link.

They come in every shape, 2.16:1 down to 0.56:1. Rather than crop them to a
common card ratio — which would cut the plot numbers off the aerial layouts —
every card is the **same height** and takes whatever width its image needs, so
the row reads as a contact sheet and nothing is lost. On mobile the gallery is
a vertical list, so cards go full width and images show whole.

## Deploying

Site is at the repo root, so GitHub Pages serves the branch directly — no
workflow file. Settings → Pages → Deploy from a branch → `main` → `/ (root)`.
Push to `main` republishes. `.nojekyll` stops Jekyll touching the files.
