/* ============================================================================
   SVARA ATELIER — Residence No. 07
   scene.js · binds scroll progress to the typography and the grade
   ----------------------------------------------------------------------------
   The residence itself is drawn by sequence.js. This is everything laid over
   it: the copy, the grading, the phase readout, the navigation state.
   One pure function, render(p).
   ========================================================================= */
(function (global) {
  'use strict';

  const TLx = global.TL;

  const Scene = {
    root: null,
    caps: [],
    reduced: false,
    _last: -1,
    _activeNav: -1
  };

  /* ══════════════════════════════════════════════════════════════════════
     INITIALISE
     ═══════════════════════════════════════════════════════════════════════ */
  function init() {
    Scene.root = document.documentElement;
    Scene.reduced = global.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* captions declare their own scroll window in the markup */
    Scene.caps = [].map.call(
      document.querySelectorAll('#captions [data-in]'),
      n => ({
        el: n,
        in:  parseFloat(n.dataset.in),
        out: parseFloat(n.dataset.out),
        shift0: n.classList.contains('cap--right') ? 26
              : n.classList.contains('cap--left')  ? -26 : 0,
        shift: 0,
        /* each kind of caption keeps the centring its own CSS relies on */
        base: n.classList.contains('annot') ? 'translateX(-50%) ' : '',
        mid:  n.classList.contains('cap--left') || n.classList.contains('cap--right'),
        last: -1
      })
    );

    Scene.readoutPhase = document.getElementById('readoutPhase');
    Scene.readoutFill  = document.getElementById('readoutFill');
    Scene.readoutPct   = document.getElementById('readoutPct');
    Scene.rail         = [].slice.call(document.querySelectorAll('#railNav button'));

    reflow();
    global.addEventListener('resize', reflow, { passive: true });
  }

  /* on narrow screens the captions stack, so the horizontal drift is dropped */
  function reflow() {
    const compact = global.innerWidth <= 760;
    Scene.caps.forEach(c => {
      c.shift = compact ? 0 : c.shift0;
      c.last = -1;
    });
    Scene._last = -1;
  }

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */
  function render(p) {
    if (Scene.reduced) p = Math.round(p * 20) / 20;
    if (Math.abs(p - Scene._last) < 0.00018) return;
    Scene._last = p;

    const s = Scene.root.style;
    s.setProperty('--dof', TLx.dof(p).toFixed(4));
    s.setProperty('--studio', TLx.studio(p).toFixed(4));

    /* ── typography ──────────────────────────────────────────────────── */
    for (let i = 0; i < Scene.caps.length; i++) {
      const c = Scene.caps[i];
      const o = TLx.captionOpacity(p, c.in, c.out);
      if (Math.abs(o - c.last) < 0.004) continue;
      c.last = o;
      c.el.style.opacity = o.toFixed(3);
      c.el.style.visibility = o < 0.004 ? 'hidden' : 'visible';

      const centre = c.mid && c.shift ? 'translateY(-50%) ' : '';
      c.el.style.transform = c.shift
        ? `${c.base}${centre}translate3d(${((1 - o) * c.shift).toFixed(1)}px, 0, 0)`
        : `${c.base}translate3d(0, ${((1 - o) * 16).toFixed(1)}px, 0)`;
    }

    /* ── readout — absent on the video hero, which has no phases ─────── */
    if (Scene.readoutPhase) {
      const label = TLx.phaseAt(p);
      if (Scene.readoutPhase.textContent !== label) Scene.readoutPhase.textContent = label;
      const done = TLx.percent ? TLx.percent(p) : p * 100;
      Scene.readoutFill.style.width = done.toFixed(1) + '%';
      const shown = Math.round(done) + '% complete';
      if (Scene.readoutPct.textContent !== shown) Scene.readoutPct.textContent = shown;
    }

    /* ── the stage rail follows the narrative, phase for phase ───────── */
    let active = 0;
    for (let i = 0; i < TLx.PHASES.length; i++) if (p >= TLx.PHASES[i].at) active = i;
    if (active !== Scene._activeNav) {
      Scene._activeNav = active;
      Scene.rail.forEach((b, i) => {
        b.classList.toggle('active', i === active);
        if (i === active) b.setAttribute('aria-current', 'true');
        else b.removeAttribute('aria-current');
      });
    }
  }

  global.SCENE = { init, render, reflow, state: Scene };
})(window);
