/* ============================================================================
   STUDIO SITE — video hero
   timeline.js · deterministic scroll choreography
   ----------------------------------------------------------------------------
   Much smaller than on the other branches, and deliberately so. The hero is a
   video that plays on its own clock, so scroll has only one job here: crossing
   the copy over the top of it. There is no frame sequence, no camera, and no
   phase readout — js/sequence.js is not even loaded.
   ========================================================================= */
(function (global) {
  'use strict';

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

  const PHASES = [{ at: 0, label: '' }];
  const phaseAt = () => '';

  /* a breath of lens softness as the copy hands over */
  const dof = Track([
    [0.000, 0], [0.420, 0], [0.470, .12], [0.520, 0], [1.000, 0]
  ]);

  /* unused here — the clip carries its own light */
  const studio = Track([[0, 0], [1, 0]]);

  function captionOpacity(p, inP, outP) {
    const fade = Math.min(0.045, (outP - inP) * 0.30);
    const up   = inP  <= 0 ? 1 : ramp(p, inP, inP + fade);
    const down = outP >= 1 ? 1 : 1 - ramp(p, outP - fade, outP);
    return Ease.sine(clamp(Math.min(up, down)));
  }

  global.TL = {
    clamp, lerp, ramp, Ease, Track,
    dof, studio, PHASES, phaseAt, captionOpacity
  };
})(window);
