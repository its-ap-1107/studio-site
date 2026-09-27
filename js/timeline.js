/* ============================================================================
   STUDIO SITE — hero: 0 to 100
   timeline.js · deterministic scroll choreography
   ----------------------------------------------------------------------------
   Twelve frames of one project from bare ground to handover, shot from a fixed
   camera. Scroll maps to one value p in [0,1]; everything on screen is a pure
   function of p. Nothing autoplays, and scrolling up takes the building back
   down again.

   Why a cross-dissolve is the right tool here, when it was wrong for the
   exploded sequence: nothing moves between these frames. The camera is locked,
   the road, hedge and flanking trees are identical throughout, and what
   changes is material being ADDED. A dissolve between "eight floors" and "ten
   floors" reads as two more floors appearing — which is what happened. There
   is nothing to ghost because nothing travelled.
   ========================================================================= */
(function (global) {
  'use strict';

  /* ── maths ────────────────────────────────────────────────────────────── */
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp  = (a, b, t) => a + (b - a) * t;
  const ramp  = (p, a, b) => (b <= a ? (p >= b ? 1 : 0) : clamp((p - a) / (b - a)));

  const Ease = {
    linear:  t => t,
    sine:    t => 0.5 - Math.cos(Math.PI * t) / 2,
    out:     t => 1 - Math.pow(1 - t, 3),
    outSlow: t => 1 - Math.pow(1 - t, 4),
    in:      t => t * t * t,
    cinema:  t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    settle:  t => 1 - Math.pow(1 - t, 5)
  };

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
     PHASES — the milestones a site actually passes
     ═══════════════════════════════════════════════════════════════════════ */
  const PHASES = [
    { at: 0.000, label: 'Site' },
    { at: 0.120, label: 'Foundation' },
    { at: 0.368, label: 'Structure' },
    { at: 0.615, label: 'Façade' },
    { at: 0.780, label: 'Finishing' },
    { at: 0.945, label: 'Complete' }
  ];

  function phaseAt(p) {
    let out = PHASES[0].label;
    for (const ph of PHASES) { if (p < ph.at) break; out = ph.label; }
    return out;
  }

  /* ══════════════════════════════════════════════════════════════════════
     THE FRAMES — named for the work actually complete in each
     ═══════════════════════════════════════════════════════════════════════
     pct   — work complete; this is what the readout reports
     u, v  — where the subject sits in the frame (0–1). The camera is locked
             across all twelve, so these are identical by definition.
     k     — scale trim; at or above 1.00 or the frame stops covering
     top/bottom — edge colours, for narrow screens where the stage fits the
             frame rather than cropping it

     Frames are about 2.33:1. A wide stage crops the sides, which costs a
     sliver of the end bays and nothing else; the building is centred.
     ═══════════════════════════════════════════════════════════════════════ */
  const FRAMES = {
    p000: { pct:   0, src: 'assets/build/build-000.jpg', k: 1.00, u: 0.5, v: 0.5, top: '#66A2DE', bottom: '#1F190B' },
    p010: { pct:  10, src: 'assets/build/build-010.jpg', k: 1.00, u: 0.5, v: 0.5, top: '#569BE6', bottom: '#2E2500' },
    p020: { pct:  20, src: 'assets/build/build-020.jpg', k: 1.00, u: 0.5, v: 0.5, top: '#5A9DE4', bottom: '#060000' },
    p030: { pct:  30, src: 'assets/build/build-030.jpg', k: 1.00, u: 0.5, v: 0.5, top: '#619EE1', bottom: '#362F1F' },
    p040: { pct:  40, src: 'assets/build/build-040.jpg', k: 1.00, u: 0.5, v: 0.5, top: '#5BA1E7', bottom: '#2B2C1A' },
    p050: { pct:  50, src: 'assets/build/build-050.jpg', k: 1.00, u: 0.5, v: 0.5, top: '#529DE1', bottom: '#0D1103' },
    p060: { pct:  60, src: 'assets/build/build-060.jpg', k: 1.00, u: 0.5, v: 0.5, top: '#58A2EB', bottom: '#050C00' },
    p070: { pct:  70, src: 'assets/build/build-070.jpg', k: 1.00, u: 0.5, v: 0.5, top: '#5B99E4', bottom: '#353211' },
    p080: { pct:  80, src: 'assets/build/build-080.jpg', k: 1.00, u: 0.5, v: 0.5, top: '#5593DC', bottom: '#26290C' },
    p090: { pct:  90, src: 'assets/build/build-090.jpg', k: 1.00, u: 0.5, v: 0.5, top: '#529AE4', bottom: '#8F923B' },
    p095: { pct:  95, src: 'assets/build/build-095.jpg', k: 1.00, u: 0.5, v: 0.5, top: '#5A9EDB', bottom: '#3F440E' },
    p100: { pct: 100, src: 'assets/build/build-100.jpg', k: 1.00, u: 0.5, v: 0.5, top: '#65A5E2', bottom: '#595C19' }
  };

  /* Eleven dissolves of 0.065 with holds of 0.018 between them, and a longer
     hold at each end for the opening and closing copy. Evenly paced, because
     a building does not stop and start. */
  const KEYS = [
    [0.000, 'p000'], [0.055, 'p000'],
    [0.120, 'p010'], [0.138, 'p010'],
    [0.203, 'p020'], [0.220, 'p020'],
    [0.285, 'p030'], [0.303, 'p030'],
    [0.368, 'p040'], [0.385, 'p040'],
    [0.450, 'p050'], [0.468, 'p050'],
    [0.533, 'p060'], [0.550, 'p060'],
    [0.615, 'p070'], [0.633, 'p070'],
    [0.698, 'p080'], [0.715, 'p080'],
    [0.780, 'p090'], [0.798, 'p090'],
    [0.863, 'p095'], [0.880, 'p095'],
    [0.945, 'p100'], [1.000, 'p100']
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

  /* Work complete at this scroll position. Interpolated from the frames
     rather than from the scroll, so the readout never claims progress the
     image is not actually showing. */
  function percent(p) {
    const f = frameAt(p);
    const a = FRAMES[f.a].pct, b = FRAMES[f.b].pct;
    return a + (b - a) * f.t;
  }

  /* ══════════════════════════════════════════════════════════════════════
     CAMERA — one unbroken move, in image space.
     Tight and low on the bare site, pulling back and lifting as the building
     gains height so it never outgrows the frame. tu stays centred because the
     elevation is symmetrical.
     ═══════════════════════════════════════════════════════════════════════ */
  const Camera = {
    zoom: Track([
      [0.000, 1.24], [0.055, 1.24], [0.203, 1.20], [0.368, 1.14],
      [0.533, 1.08], [0.698, 1.04], [0.863, 1.02], [0.945, 1.02],
      [1.000, 1.07, 'outSlow']
    ]),
    tu: Track([ [0.000, 0.500], [1.000, 0.500] ]),
    tv: Track([
      [0.000, 0.640], [0.120, 0.625], [0.285, 0.590], [0.450, 0.545],
      [0.615, 0.515], [0.780, 0.500], [0.945, 0.495], [1.000, 0.500]
    ])
  };

  /* ══════════════════════════════════════════════════════════════════════
     ATMOSPHERE
     ═══════════════════════════════════════════════════════════════════════ */

  /* a breath of lens softness at either end of the move */
  const dof = Track([
    [0.000, .08], [0.120, 0], [0.880, 0], [1.000, .06]
  ]);

  /* unused on this hero — the frames carry their own daylight */
  const studio = Track([ [0.000, 0], [1.000, 0] ]);

  /* ══════════════════════════════════════════════════════════════════════
     CAPTION VISIBILITY — a slow cross-dissolve, never a pop
     ═══════════════════════════════════════════════════════════════════════ */
  function captionOpacity(p, inP, outP) {
    const fade = Math.min(0.030, (outP - inP) * 0.34);
    const up   = inP  <= 0 ? 1 : ramp(p, inP, inP + fade);
    const down = outP >= 1 ? 1 : 1 - ramp(p, outP - fade, outP);
    return Ease.sine(clamp(Math.min(up, down)));
  }

  global.TL = {
    clamp, lerp, ramp, Ease, Track,
    FRAMES, KEYS, frameAt, percent,
    Camera, dof, studio,
    phaseAt, captionOpacity, PHASES
  };
})(window);
