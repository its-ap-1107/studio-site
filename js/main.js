/* ============================================================================
   SVARA ATELIER — Residence No. 07
   main.js · scroll binding, chrome, navigation
   ----------------------------------------------------------------------------
   A single rAF loop. Scroll position is the only input; the easing toward it
   is critically damped, so the presentation feels weighted but always settles
   exactly on the value the scroll position asks for — in both directions.
   ========================================================================= */
(function () {
  'use strict';

  const TLx = window.TL;
  const clamp = TLx.clamp;

  const wrap    = document.getElementById('stageWrap');
  const nav     = document.getElementById('nav');
  const hint    = document.getElementById('scrollHint');
  const readout = document.getElementById('readout');

  let current = 0, target = 0, running = false, settled = false;
  let reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── scroll → progress ────────────────────────────────────────────────── */
  function readTarget() {
    const span = wrap.offsetHeight - window.innerHeight;
    if (span <= 0) return 0;
    return clamp(-wrap.getBoundingClientRect().top / span);
  }

  /* ── the loop ─────────────────────────────────────────────────────────── */
  function frame() {
    const d = target - current;
    const abs = Math.abs(d);

    if (abs < 0.00012) {
      current = target;
      settled = true;
    } else {
      /* weighted approach — slower for long throws, so fast scrolling still
         reads as a camera move rather than a jump cut                     */
      current += d * (reduced ? 1 : (abs > 0.08 ? 0.085 : 0.115));
      settled = false;
    }

    if (window.SEQUENCE) window.SEQUENCE.draw(current);
    window.SCENE.render(current);

    if (!settled) requestAnimationFrame(frame);
    else running = false;
  }

  function kick() {
    if (!running) { running = true; requestAnimationFrame(frame); }
  }

  function onScroll() {
    target = readTarget();

    nav.classList.toggle('scrolled', (window.scrollY || window.pageYOffset) > 40);

    hint.style.opacity = target > 0.025 ? '0' : '1';
    if (readout) readout.classList.toggle('on', target > 0.004 && target < 0.998);

    kick();
  }

  /* ── deliberate navigation: an eased move, never a jump ──────────────── */
  let animId = 0;

  function scrollToY(destination, duration) {
    const start = window.scrollY || window.pageYOffset;
    const delta = destination - start;
    if (Math.abs(delta) < 2) return;
    if (reduced) { window.scrollTo(0, destination); return; }

    const dur = duration || clamp(Math.abs(delta) / 3.2, 700, 2100);
    const t0 = performance.now();
    const id = ++animId;

    (function step(now) {
      if (id !== animId) return;
      const t = clamp((now - t0) / dur);
      window.scrollTo(0, start + delta * TLx.Ease.cinema(t));
      if (t < 1) requestAnimationFrame(step);
    })(performance.now());
  }

  function gotoProgress(p) {
    const span = wrap.offsetHeight - window.innerHeight;
    scrollToY(wrap.offsetTop + span * clamp(p));
  }

  /* any real scroll input abandons a programmatic move */
  ['wheel', 'touchstart', 'keydown'].forEach(ev =>
    window.addEventListener(ev, () => { animId++; }, { passive: true }));

  /* ── navigation ──────────────────────────────────────────────────────
     `data-goto` drives the stage to a scroll position; anything else that
     points at an id is an ordinary eased jump. Both work on a link or a
     button, so the stage rail needs no handler of its own.
     ------------------------------------------------------------------- */
  document.addEventListener('click', e => {
    const target = e.target.closest('[data-goto], a[href^="#"]');
    if (!target) return;

    if (target.dataset.goto !== undefined) {
      e.preventDefault();
      gotoProgress(parseFloat(target.dataset.goto));
      return;
    }

    const id = target.getAttribute('href').slice(1);
    const el = id && document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    scrollToY(el.getBoundingClientRect().top + (window.scrollY || window.pageYOffset));
  });

  /* ── keyboard: the presentation should be navigable without a mouse ──── */
  window.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const marks = [0, 0.140, 0.390, 0.630, 0.800, 0.970, 1];
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const p = readTarget();
      let next = dir > 0
        ? marks.find(m => m > p + 0.004)
        : marks.slice().reverse().find(m => m < p - 0.004);
      if (next === undefined) return;
      e.preventDefault();
      gotoProgress(next);
    }
  });

  /* ── boot ─────────────────────────────────────────────────────────────── */
  function boot() {
    document.getElementById('year').textContent = new Date().getFullYear();

    window.SCENE.init();

    target = current = readTarget();
    window.SCENE.render(current);
    onScroll();

    /* the curtain lifts only once every render has decoded, so the opening
       frame is already on the canvas — no flash of an empty stage          */
    window.SEQUENCE.init().then(() => {
      if (window.SEQUENCE) window.SEQUENCE.draw(current);
      requestAnimationFrame(() => document.body.classList.add('ready'));
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { target = readTarget(); kick(); }, { passive: true });
    window.matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener('change', e => { reduced = e.matches; kick(); });

    /* never leave the visitor behind a curtain if a render fails to load */
    setTimeout(() => document.body.classList.add('ready'), 4000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
