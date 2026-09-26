/* ============================================================================
   SVARA ATELIER — Residence No. 07
   timeline.js · deterministic scroll choreography
   ----------------------------------------------------------------------------
   Nothing here autoplays. Every value is a pure function of scroll progress
   p in [0,1], so the visitor drives the presentation in both directions.
   ========================================================================= */
(function (global) {
  'use strict';

  /* ── maths ────────────────────────────────────────────────────────────── */
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp  = (a, b, t) => a + (b - a) * t;
  const ramp  = (p, a, b) => (b <= a ? (p >= b ? 1 : 0) : clamp((p - a) / (b - a)));

  /* ── easing — long, architectural curves. No overshoot, no bounce. ──── */
  const Ease = {
    linear:  t => t,
    sine:    t => 0.5 - Math.cos(Math.PI * t) / 2,
    out:     t => 1 - Math.pow(1 - t, 3),
    outSlow: t => 1 - Math.pow(1 - t, 4),
    in:      t => t * t * t,
    /* the signature curve: slow to leave, unhurried, soft to arrive */
    cinema:  t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    settle:  t => 1 - Math.pow(1 - t, 5)
  };

  /* ── track ────────────────────────────────────────────────────────────
     keys: [[p, value, easeOfIncomingSegment?], …], p-ascending.
     ------------------------------------------------------------------- */
  function Track(keys) {
    const K = keys.slice().sort((a, b) => a[0] - b[0]);
    return function at(p) {
      if (p <= K[0][0]) return K[0][1];
      const last = K[K.length - 1];
      if (p >= last[0]) return last[1];
      let i = 1;
      while (i < K.length && p > K[i][0]) i++;
      const a = K[i - 1], b = K[i];
      const t = (p - a[0]) / (b[0] - a[0]);
      return lerp(a[1], b[1], (Ease[b[2]] || Ease.cinema)(t));
    };
  }

  /* ══════════════════════════════════════════════════════════════════════
     PHASES
     ═══════════════════════════════════════════════════════════════════════ */
  const PHASES = [
    { at: 0.000, label: 'Complete residence' },
    { at: 0.150, label: 'Architectural reveal' },
    { at: 0.300, label: 'Layer separation' },
    { at: 0.660, label: 'Exploded composition' },
    { at: 0.720, label: 'Material & detail' },
    { at: 0.800, label: 'Spatial reveal' },
    { at: 0.845, label: 'Recomposition' },
    { at: 0.960, label: 'Complete residence' }
  ];

  function phaseAt(p) {
    let out = PHASES[0].label;
    for (const ph of PHASES) { if (p < ph.at) break; out = ph.label; }
    return out;
  }

  /* ══════════════════════════════════════════════════════════════════════
     THE RENDERS
     ═══════════════════════════════════════════════════════════════════════
     Named for what each one holds, ordered by how far the building has
     opened — which is not the order the files were produced in. 02 detaches
     the landscape while the building stays largely intact; 03 opens the
     upper floor itself. 01, 02 and 05 share the hero's eye-level
     three-quarter angle, 03 and 04 the elevated frontal one, so the angle
     rises once on the way in and returns once on the way out.

     Only `exploded` is animated. It is cut into horizontal layers (BANDS)
     that travel, so the disassembly is real motion rather than a dissolve.
     The other four are camera positions around that animation.

     k    — scale trim, so the building holds its size across a dissolve
     u, v — where the building sits in that render (0–1, image space)
     ═══════════════════════════════════════════════════════════════════════ */
  const FRAMES = {
    assembled:  { src: 'assets/01-assembled.jpg',   k: 1.02, u: 0.492, v: 0.478 },
    lifting:    { src: 'assets/02-lifting.jpg',     k: 1.04, u: 0.482, v: 0.470 },
    separating: { src: 'assets/03-separating.jpg',  k: 1.00, u: 0.480, v: 0.478 },
    exploded:   { src: 'assets/04-exploded.jpg',    k: 1.02, u: 0.486, v: 0.480, bands: true },
    reassembled:{ src: 'assets/05-reassembled.jpg', k: 1.06, u: 0.530, v: 0.470 }
  };

  /* ══════════════════════════════════════════════════════════════════════
     BANDS — the residence, cut along the gaps the render already contains
     ═══════════════════════════════════════════════════════════════════════
     Rows tile the render exactly, so at full separation the reconstruction is
     the original image, pixel for pixel. Each row travels straight down onto
     the ground floor to assemble, and straight back up to come apart: no
     rotation, no spin, no drift.

     y0,y1 — the row, in image space
     dy    — how far it travels to assemble (image heights, + is down)
     lead  — where it starts inside the separation, so the roof canopy leaves
             first and the landscape last, as an architect would present it
     ═══════════════════════════════════════════════════════════════════════ */
  const BANDS = [
    { y0: 0.000, y1: 0.056, dy:  0.210, lead: 0.00 },  /* grey cap slab      */
    { y0: 0.056, y1: 0.140, dy:  0.180, lead: 0.04 },  /* roof slab          */
    { y0: 0.140, y1: 0.233, dy:  0.146, lead: 0.08 },  /* slatted soffit     */
    { y0: 0.233, y1: 0.322, dy:  0.096, lead: 0.13 },  /* linear light + chandelier */
    { y0: 0.322, y1: 0.540, dy:  0.028, lead: 0.19 },  /* upper floor volume */
    { y0: 0.540, y1: 0.640, dy:  0.008, lead: 0.25 },  /* balcony + plates   */
    { y0: 0.640, y1: 0.790, dy:  0.000, lead: 0.00 },  /* ground floor — the anchor */
    { y0: 0.790, y1: 1.000, dy: -0.034, lead: 0.31 }   /* landscape + paving */
  ];

  /* how far one row has travelled at separation t — 0 assembled, 1 apart */
  function bandAmount(band, t) {
    return Ease.cinema(ramp(t, band.lead, 1));
  }

  /* Separation never returns fully to 0: the layers in this render are drawn
     with their own sides showing, so the last of the travel is handed to a
     dissolve into a real assembled render rather than to a compressed fake.

     The floor is 0.14, where every layer has closed up and the render reads
     as a complete building — which is what the two assembled renders either
     side dissolve into and out of. Because both ends of each dissolve show a
     closed building, the only thing that changes across them is the camera
     angle, and the entire opening and closing is real motion: 36% of the
     page taking the layers apart, 9% putting them back.

     Linear, deliberately. The shaping lives in bandAmount, which eases each
     layer individually; easing here as well would stack two curves and bunch
     the whole separation into the middle of its scroll. */
  const explode = Track([
    [0.000, 0.14, 'linear'], [0.300, 0.14, 'linear'], [0.660, 1.00, 'linear'],
    [0.845, 1.00, 'linear'], [0.935, 0.14, 'linear'], [1.000, 0.14, 'linear']
  ]);

  /* ══════════════════════════════════════════════════════════════════════
     WHICH RENDER IS ON SCREEN
     ═══════════════════════════════════════════════════════════════════════
     Two entries sharing a source are a hold. Two entries with different
     sources cross-dissolve across the whole span between them. The angle
     change of angle is deliberately placed where the building is already
     opening, so it reads as the camera rising rather than as a cut.
     ═══════════════════════════════════════════════════════════════════════ */
  const KEYS = [
    [0.000, 'assembled'], [0.150, 'assembled'],   /* hero, eye-level      */
    [0.300, 'exploded'],  [0.935, 'exploded'],    /* the animated master   */
    [1.000, 'reassembled']                        /* hero angle, complete  */
  ];

  /* `lifting` and `separating` are deliberately not in the sequence above.

     Both are mid-explosion, so dissolving through them forces the animated
     master to enter already half open — which hands most of the roof's
     travel to a dissolve instead of showing it. Worse, neither one's roof
     height matches the master's at the crossing point, so the roof visibly
     sinks before it rises. Cutting them makes the opening and closing one
     continuous move.

     To put one back, insert a hold before `exploded` and raise the floor of
     `explode` to match how far that render has already opened:
         [0.220, 'lifting'], [0.260, 'lifting'],
     with the `exploded` entry near 0.340 and the floor near 0.35.       */

  function frameAt(p) {
    if (p <= KEYS[0][0]) return { a: KEYS[0][1], b: KEYS[0][1], t: 0 };
    const last = KEYS[KEYS.length - 1];
    if (p >= last[0]) return { a: last[1], b: last[1], t: 0 };
    let i = 1;
    while (i < KEYS.length && p > KEYS[i][0]) i++;
    const A = KEYS[i - 1], B = KEYS[i];
    if (A[1] === B[1]) return { a: A[1], b: A[1], t: 0 };
    return { a: A[1], b: B[1], t: Ease.sine((p - A[0]) / (B[0] - A[0])) };
  }

  /* ══════════════════════════════════════════════════════════════════════
     CAMERA — one continuous move, in image space.
     zoom is a scale above cover-fit; tu/tv name the point held at centre,
     so every detail pass lands on its subject at any viewport size.
     The detail targets below are read off 04-exploded.jpg, where the layers
     are at their native positions.
     ═══════════════════════════════════════════════════════════════════════ */
  const Camera = {
    zoom: Track([
      [0.000, 1.16], [0.100, 1.22, 'sine'], [0.150, 1.26], [0.230, 1.22],
      [0.300, 1.18], [0.450, 1.13], [0.660, 1.06],
      [0.700, 1.12], [0.722, 1.52],
      [0.742, 1.95],   /* 01 timber       */
      [0.765, 1.82],   /* 02 plaster      */
      [0.788, 1.88],   /* 03 glazing      */
      [0.800, 1.78],   /* 04 linear light */
      [0.830, 1.66],   /* the interior    */
      [0.845, 1.36],
      [0.900, 1.10], [0.935, 1.10], [0.975, 1.16], [1.000, 1.14, 'outSlow']
    ]),
    tu: Track([
      [0.000, 0.500], [0.300, 0.500], [0.720, 0.500],
      [0.742, 0.257],   /* the detached timber panel, left  */
      [0.765, 0.500],   /* textured plaster, main volume    */
      [0.788, 0.500],   /* black-framed glazing, ground     */
      [0.800, 0.508],   /* the linear light and chandelier  */
      [0.830, 0.500],   /* the interior, through the glass  */
      [0.845, 0.500], [1.000, 0.500]
    ]),
    tv: Track([
      [0.000, 0.500], [0.150, 0.486], [0.300, 0.482], [0.660, 0.492],
      [0.720, 0.492],
      [0.742, 0.423],
      [0.765, 0.430],
      [0.788, 0.690],
      [0.800, 0.275],
      [0.830, 0.700],
      [0.845, 0.560], [0.900, 0.500], [1.000, 0.500]
    ])
  };

  /* ══════════════════════════════════════════════════════════════════════
     ATMOSPHERE
     ═══════════════════════════════════════════════════════════════════════ */

  /* depth of field: a hint of a real lens, during the close passes only */
  const dof = Track([
    [0.000, .10], [0.150, .04], [0.300, 0], [0.700, 0],
    [0.742, .26], [0.800, .26], [0.830, .16], [0.900, 0], [1.000, .08]
  ]);

  /* a faint cool lift while the layers are apart, so the frontal render sits
     in the same room as the night renders on either side of it */
  const studio = Track([
    [0.000, 0], [0.200, 0], [0.400, .45], [0.660, .70],
    [0.800, .55], [0.845, .30], [0.935, .05], [1.000, 0]
  ]);

  /* ══════════════════════════════════════════════════════════════════════
     CAPTION VISIBILITY — a slow cross-dissolve, never a pop
     ═══════════════════════════════════════════════════════════════════════ */
  function captionOpacity(p, inP, outP) {
    const fade = Math.min(0.030, (outP - inP) * 0.34);
    /* copy that opens the page, or closes it, is already fully present */
    const up   = inP  <= 0 ? 1 : ramp(p, inP, inP + fade);
    const down = outP >= 1 ? 1 : 1 - ramp(p, outP - fade, outP);
    return Ease.sine(clamp(Math.min(up, down)));
  }

  global.TL = {
    clamp, lerp, ramp, Ease, Track,
    FRAMES, KEYS, frameAt,
    BANDS, bandAmount, explode,
    Camera, dof, studio,
    phaseAt, captionOpacity, PHASES
  };
})(window);
