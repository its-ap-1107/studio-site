/* ============================================================================
   STUDIO NAME
   site.js · behaviour for the editorial sections below the stage
   ----------------------------------------------------------------------------
   Mobile menu, reveal-on-scroll, the project gallery, the counters, and the
   enquiry form. Nothing here touches the pinned stage — that lives in
   main.js / scene.js / sequence.js.
   ========================================================================= */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = id => document.getElementById(id);
  const $$ = sel => [].slice.call(document.querySelectorAll(sel));

  /* ══════════════════════════════════════════════════════════════════════
     MOBILE MENU
     ═══════════════════════════════════════════════════════════════════════ */
  const navToggle = $('navToggle');
  const mobileMenu = $('mobileMenu');

  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    mobileMenu.setAttribute('aria-hidden', String(!open));
  }
  navToggle.addEventListener('click', () =>
    setMenu(!document.body.classList.contains('menu-open')));
  mobileMenu.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => setMenu(false)));
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false);
  });

  /* ══════════════════════════════════════════════════════════════════════
     NAVIGATION COLOUR — the bar reads whatever it is sitting over
     ═══════════════════════════════════════════════════════════════════════ */
  const nav = $('nav');
  const darkZones = [$('stage'), $('darkChapter')].filter(Boolean);

  function navTone() {
    const y = 40;   /* the bar's own centre line */
    const over = darkZones.some(el => {
      const r = el.getBoundingClientRect();
      return r.top <= y && r.bottom >= y;
    });
    nav.classList.toggle('over-dark', over);
  }
  window.addEventListener('scroll', navTone, { passive: true });
  window.addEventListener('resize', navTone, { passive: true });
  navTone();

  /* ══════════════════════════════════════════════════════════════════════
     REVEAL
     ═══════════════════════════════════════════════════════════════════════ */
  const revealables = $$('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    revealables.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        /* siblings stagger, so a row of cards arrives as a row */
        const siblings = [].slice.call(entry.target.parentElement.children)
          .filter(n => n.classList.contains('reveal'));
        const i = Math.max(0, siblings.indexOf(entry.target));
        entry.target.style.transitionDelay = (i * 90) + 'ms';
        entry.target.classList.add('in');
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    revealables.forEach(el => io.observe(el));
  }

  /* the drawn silhouette behind the closing call to action */
  const cta = $('cta');
  if (cta) {
    if (reduce || !('IntersectionObserver' in window)) {
      cta.classList.add('in');
    } else {
      const io2 = new IntersectionObserver((e, obs) => {
        if (e[0].isIntersecting) { cta.classList.add('in'); obs.disconnect(); }
      }, { threshold: 0.25 });
      io2.observe(cta);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     PROJECT GALLERY — drag to scrub, arrows to step, a hairline for position
     ═══════════════════════════════════════════════════════════════════════ */
  const gallery = $('gallery');
  const gThumb = $('gThumb');
  const gPrev = $('gPrev');
  const gNext = $('gNext');

  if (gallery) {
    const cards = () => [].slice.call(gallery.children);

    function sync() {
      const max = gallery.scrollWidth - gallery.clientWidth;
      const ratio = gallery.clientWidth / gallery.scrollWidth;
      if (gThumb) {
        gThumb.style.width = Math.max(8, ratio * 100) + '%';
        gThumb.style.transform =
          'translateX(' + (max > 0 ? (gallery.scrollLeft / max) * (100 / ratio - 100) : 0) + '%)';
      }
      if (gPrev) gPrev.disabled = gallery.scrollLeft <= 2;
      if (gNext) gNext.disabled = gallery.scrollLeft >= max - 2;
    }

    function step(dir) {
      const list = cards();
      if (!list.length) return;
      const gap = parseFloat(getComputedStyle(gallery).columnGap || '0') || 0;
      const w = list[0].getBoundingClientRect().width + gap;
      gallery.scrollBy({ left: dir * w, behavior: reduce ? 'auto' : 'smooth' });
    }

    if (gPrev) gPrev.addEventListener('click', () => step(-1));
    if (gNext) gNext.addEventListener('click', () => step(1));
    gallery.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync, { passive: true });
    sync();

    /* pointer drag — only counts as a drag once it has actually moved, so a
       click straight through to a project still works */
    let down = false, startX = 0, startScroll = 0, moved = false;

    gallery.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') return;      /* native touch scrolling */
      down = true; moved = false;
      startX = e.clientX;
      startScroll = gallery.scrollLeft;
    });
    gallery.addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 4) {
        moved = true;
        gallery.classList.add('dragging');
        gallery.setPointerCapture(e.pointerId);
      }
      if (moved) gallery.scrollLeft = startScroll - dx;
    });
    const release = () => {
      if (!down) return;
      down = false;
      gallery.classList.remove('dragging');
    };
    gallery.addEventListener('pointerup', release);
    gallery.addEventListener('pointercancel', release);
    gallery.addEventListener('click', e => { if (moved) e.preventDefault(); }, true);
  }

  /* ══════════════════════════════════════════════════════════════════════
     COUNTERS — placeholder figures until the real ones are supplied
     ═══════════════════════════════════════════════════════════════════════ */
  const grid = $('numbersGrid');
  if (grid) {
    const vals = $$('#numbersGrid .val');
    const write = (el, n) => {
      el.textContent = Math.round(n).toLocaleString('en-IN') + (el.dataset.suffix || '');
    };

    function run() {
      vals.forEach(el => {
        const to = parseFloat(el.dataset.count) || 0;
        if (reduce) { write(el, to); return; }
        const dur = 1600, t0 = performance.now();
        (function tick(now) {
          const t = Math.min(1, (now - t0) / dur);
          write(el, to * (1 - Math.pow(1 - t, 3)));
          if (t < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }

    if (!('IntersectionObserver' in window)) run();
    else {
      const io3 = new IntersectionObserver((e, obs) => {
        if (e[0].isIntersecting) { run(); obs.disconnect(); }
      }, { threshold: 0.4 });
      io3.observe(grid);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     ENQUIRY FORM
     ═══════════════════════════════════════════════════════════════════════ */
  const form = $('enquiryForm');
  const status = $('formStatus');
  const interest = $('fInterest');

  /* a service card carries its own subject into the form */
  $$('.service[data-interest]').forEach(card => {
    card.addEventListener('click', () => {
      if (interest) interest.value = card.dataset.interest;
    });
  });

  if (form) {
    const required = () => $$('#enquiryForm [required]');

    required().forEach(f => {
      f.addEventListener('input', () => f.closest('.field').classList.remove('invalid'));
    });

    form.addEventListener('submit', e => {
      e.preventDefault();

      let ok = true, first = null;
      required().forEach(f => {
        const bad = !f.value.trim();
        f.closest('.field').classList.toggle('invalid', bad);
        if (bad && !first) first = f;
        if (bad) ok = false;
      });

      const email = $('fEmail');
      if (email && email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        email.closest('.field').classList.add('invalid');
        if (!first) first = email;
        ok = false;
      }

      if (!ok) {
        status.textContent = 'Please complete the highlighted fields.';
        if (first) first.focus();
        return;
      }

      /* NO BACKEND YET — this does not send anything anywhere.
         Point it at the studio's endpoint (or a form service) before launch. */
      status.textContent = 'Thank you — we will be in touch within one working day.';
      form.reset();
      $$('#enquiryForm .field').forEach(f => f.classList.remove('invalid'));
    });
  }
})();
