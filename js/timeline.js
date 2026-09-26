/* ============================================================================
   STUDIO SITE
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
    { at: 0.140, label: 'Architectural reveal' },
    { at: 0.300, label: 'Layer separation' },
    { at: 0.640, label: 'Exploded composition' },
    { at: 0.700, label: 'Material & detail' },
    { at: 0.790, label: 'Spatial reveal' },
    { at: 0.860, label: 'Recomposition' },
    { at: 0.970, label: 'Complete residence' }
  ];

  function phaseAt(p) {
    let out = PHASES[0].label;
    for (const ph of PHASES) { if (p < ph.at) break; out = ph.label; }
    return out;
  }

  /* ══════════════════════════════════════════════════════════════════════
     THE RENDERS
     ═══════════════════════════════════════════════════════════════════════
     Six states of one residence, ordered by how far it has come apart:

       01-hero        sunset exterior, complete
       02-detaching   same camera, same light — panels begin to lift away
       03-separating  dark studio, the model mildly apart
       04-apart       further out, facade panels floating
       05-opening     floor plates separate, the interior is exposed
       06-exploded    fully apart, structure and landscape ring separated

     03 to 06 share one camera and one lighting setup, so dissolving between
     them reads as the building continuing to open rather than as a cut. That
     is the whole reason this works without cutting the image into layers —
     unlike the previous building, this explosion throws parts outward in
     every direction, so horizontal band cuts would shear it.

     k    — scale trim; at or above 1.00, or the render stops covering
     u, v — where the building sits in that render (0–1, image space)
     top, bottom — edge colours, used to extend the backdrop on narrow
                   screens where the render is fitted rather than cropped
     ═══════════════════════════════════════════════════════════════════════ */
  const FRAMES = {
    hero:       { src: 'assets/01-hero.jpg',       k: 1.04, u: 0.470, v: 0.462,
                  top: '#5E7DAC', bottom: '#533223' },
    detaching:  { src: 'assets/02-detaching.jpg',  k: 1.04, u: 0.470, v: 0.462,
                  top: '#6A87C1', bottom: '#8B7367' },
    separating: { src: 'assets/03-separating.jpg', k: 1.02, u: 0.487, v: 0.474,
                  top: '#2C2C34', bottom: '#463B37' },
    apart:      { src: 'assets/04-apart.jpg',      k: 1.00, u: 0.486, v: 0.476,
                  top: '#1E1F23', bottom: '#272121' },
    opening:    { src: 'assets/05-opening.jpg',    k: 1.00, u: 0.484, v: 0.478,
                  top: '#17181C', bottom: '#322A27' },
    exploded:   { src: 'assets/06-exploded.jpg',   k: 1.00, u: 0.483, v: 0.478,
                  top: '#111214', bottom: '#271F1C' }
  };

  /* ══════════════════════════════════════════════════════════════════════
     WHICH RENDER IS ON SCREEN
     ═══════════════════════════════════════════════════════════════════════
     Two entries sharing a source are a hold. Two entries with different
     sources cross-dissolve across the whole span between them — the opening
     dissolves run 8–9% of the page each, so the building is visibly, slowly
     coming apart the entire way down. Recomposition replays them in reverse,
     a little brisker, as the brief asks.
     ═══════════════════════════════════════════════════════════════════════ */
  const KEYS = [
    [0.000, 'hero'],       [0.140, 'hero'],        /* complete, sunset      */
    [0.230, 'detaching'],  [0.275, 'detaching'],   /* same camera, lifting  */
    [0.350, 'separating'], [0.390, 'separating'],  /* into the studio       */
    [0.455, 'apart'],      [0.490, 'apart'],
    [0.550, 'opening'],    [0.580, 'opening'],
    [0.640, 'exploded'],   [0.860, 'exploded'],    /* hold · detail · section */
    [0.895, 'opening'],
    [0.922, 'apart'],
    [0.948, 'separating'],
    [0.974, 'detaching'],
    [1.000, 'hero']                                /* complete again        */
  ];

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
     zoom is a scale above the fit; tu/tv name the point held at centre, so
     each detail pass lands on its subject at any viewport size. The detail
     targets are read off 06-exploded.jpg.
     ═══════════════════════════════════════════════════════════════════════ */
  const Camera = {
    zoom: Track([
      [0.000, 1.18], [0.100, 1.24, 'sine'], [0.140, 1.26], [0.230, 1.20],
      [0.350, 1.10], [0.455, 1.04], [0.550, 1.01], [0.640, 1.00],
      [0.700, 1.00],
      [0.722, 1.85],   /* 01 fluted cladding  */
      [0.745, 1.80],   /* 02 stone + plaster  */
      [0.765, 1.85],   /* 03 glazing          */
      [0.785, 1.70],   /* 04 structure        */
      [0.805, 1.58],   /* the interior        */
      [0.845, 1.30],
      [0.895, 1.05], [0.922, 1.02], [0.948, 1.05],
      [0.974, 1.12], [1.000, 1.18, 'outSlow']
    ]),
    tu: Track([
      [0.000, 0.500], [0.300, 0.500], [0.640, 0.500], [0.700, 0.500],
      [0.722, 0.665],   /* the fluted tower panel, right of centre */
      [0.745, 0.330],   /* stone piers and plaster, left          */
      [0.765, 0.470],   /* black-framed glazing and the balcony   */
      [0.785, 0.455],   /* the column grid under the slabs        */
      [0.805, 0.450],   /* the lit interior                       */
      [0.845, 0.500], [1.000, 0.500]
    ]),
    tv: Track([
      [0.000, 0.500], [0.140, 0.478], [0.300, 0.478], [0.640, 0.500],
      [0.700, 0.500],
      [0.722, 0.390],
      [0.745, 0.420],
      [0.765, 0.432],
      [0.785, 0.700],
      [0.805, 0.588],
      [0.845, 0.520], [0.922, 0.500], [1.000, 0.500]
    ])
  };

  /* ══════════════════════════════════════════════════════════════════════
     ATMOSPHERE
     ═══════════════════════════════════════════════════════════════════════ */

  /* depth of field: a hint of a real lens, during the close passes only */
  const dof = Track([
    [0.000, .10], [0.140, .04], [0.300, 0], [0.700, 0],
    [0.722, .24], [0.785, .24], [0.805, .16], [0.895, 0], [1.000, .08]
  ]);

  /* how far into the dark studio we are — drives the key light and grade */
  const studio = Track([
    [0.000, 0], [0.230, 0], [0.350, .50], [0.640, .85],
    [0.785, .70], [0.895, .40], [0.974, .05], [1.000, 0]
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
    Camera, dof, studio,
    phaseAt, captionOpacity, PHASES
  };
})(window);
