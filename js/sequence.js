/* ============================================================================
   STUDIO SITE
   sequence.js · the residence, drawn to canvas under scroll control
   ----------------------------------------------------------------------------
   At any scroll position the canvas holds at most two renders — the outgoing
   one and the incoming one — sharing a single camera. The four studio renders
   are shot from one camera with one lighting setup, so a dissolve between them
   reads as the building continuing to open rather than as one picture
   replacing another.

   Framing: wide viewports crop the render to fill the stage. Narrow ones fit
   it instead, so the exploded composition is never cut off at the sides, and
   the space around it is filled with a gradient taken from that render's own
   top and bottom edges. Both renders in a dissolve always use the same mode,
   so the fit never jumps mid-transition.
   ========================================================================= */
(function (global) {
  'use strict';

  const TLx = global.TL;

  const SEQ = {
    canvas: null,
    ctx: null,
    images: {},          /* key → { img, ok } */
    ready: false,
    dpr: 1,
    contain: false,      /* true when the stage fits rather than crops */
    grads: {},           /* key → cached backdrop gradient */
    last: ''
  };

  /* ── loading ──────────────────────────────────────────────────────────
     Only what the sequence actually shows. FRAMES may describe renders that
     are documented but not in KEYS; those are not fetched.
     ------------------------------------------------------------------- */
  function loadAll() {
    const used = Object.keys(TLx.FRAMES).filter(k => TLx.KEYS.some(e => e[1] === k));
    return Promise.all(used.map(key => new Promise(resolve => {
      const rec = { ok: false, img: new Image() };
      SEQ.images[key] = rec;
      rec.img.decoding = 'async';
      rec.img.onload = () => {
        /* decode before the first paint so the opening frame never pops */
        const done = () => { rec.ok = true; resolve(); };
        if (rec.img.decode) rec.img.decode().then(done, done);
        else done();
      };
      rec.img.onerror = () => resolve();
      rec.img.src = TLx.FRAMES[key].src;
    })));
  }

  /* ── sizing ───────────────────────────────────────────────────────────── */
  function resize() {
    if (!SEQ.canvas) return;
    const r = SEQ.canvas.parentElement.getBoundingClientRect();
    SEQ.dpr = Math.min(global.devicePixelRatio || 1, 1.75);
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    SEQ.canvas.width  = Math.round(w * SEQ.dpr);
    SEQ.canvas.height = Math.round(h * SEQ.dpr);
    SEQ.canvas.style.width  = w + 'px';
    SEQ.canvas.style.height = h + 'px';

    /* the widest render is 2:1. Below that the stage would crop into the
       exploded model, so it fits the render and extends the backdrop */
    SEQ.contain = (w / h) < 1.45;

    if (SEQ.ctx) {
      SEQ.ctx.imageSmoothingQuality = 'high';
      SEQ.grads = {};
      for (const key in TLx.FRAMES) {
        const f = TLx.FRAMES[key];
        const g = SEQ.ctx.createLinearGradient(0, 0, 0, SEQ.canvas.height);
        g.addColorStop(0, f.top || '#0B0F13');
        g.addColorStop(1, f.bottom || '#0B0F13');
        SEQ.grads[key] = g;
      }
    }
    SEQ.last = '';
  }

  /* ── one render, placed under the shared camera ──────────────────────────
     fit × the camera zoom × this render's scale trim, then offset so the
     requested point sits at the centre. The offset is clamped so an edge of
     the render can never come into frame when cropping.
     ------------------------------------------------------------------- */
  function place(img, frame, zoom, tu, tv) {
    const cw = SEQ.canvas.width, ch = SEQ.canvas.height;
    const fit = SEQ.contain
      ? Math.min(cw / img.naturalWidth, ch / img.naturalHeight)
      : Math.max(cw / img.naturalWidth, ch / img.naturalHeight);

    /* the fit is a floor, never a target */
    const s = fit * Math.max(zoom * frame.k, 1);

    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;

    /* hold (tu,tv) at centre, corrected for where the building sits in this
       particular render — this is what keeps two renders aligned */
    let dx = cw / 2 - (tu + (frame.u - 0.5)) * w;
    let dy = ch / 2 - (tv + (frame.v - 0.5)) * h;

    const maxX = Math.max(0, (w - cw) / 2);
    const maxY = Math.max(0, (h - ch) / 2);
    dx = Math.min(Math.max(dx, cw / 2 - w / 2 - maxX), cw / 2 - w / 2 + maxX);
    dy = Math.min(Math.max(dy, ch / 2 - h / 2 - maxY), ch / 2 - h / 2 + maxY);

    return { x: dx, y: dy, w: w, h: h };
  }

  function drawFrame(key, zoom, tu, tv) {
    const rec = SEQ.images[key];
    if (!rec || !rec.ok) return;
    const r = place(rec.img, TLx.FRAMES[key], zoom, tu, tv);
    SEQ.ctx.drawImage(rec.img, r.x, r.y, r.w, r.h);
  }

  /* ══════════════════════════════════════════════════════════════════════
     DRAW
     ═══════════════════════════════════════════════════════════════════════ */
  function draw(p) {
    if (!SEQ.ready) return;

    const C = TLx.Camera;
    const zoom = C.zoom(p);
    const tu = C.tu(p);
    const tv = C.tv(p);
    const f = TLx.frameAt(p);

    /* skip the draw when nothing visible has changed */
    const sig = f.a + '|' + f.b + '|' + f.t.toFixed(3) + '|' +
                zoom.toFixed(4) + '|' + tu.toFixed(4) + '|' + tv.toFixed(4) +
                '|' + SEQ.canvas.width;
    if (sig === SEQ.last) return;
    SEQ.last = sig;

    const ctx = SEQ.ctx;
    const cw = SEQ.canvas.width, ch = SEQ.canvas.height;

    /* the backdrop crosses over underneath the renders, so on narrow screens
       the space beside the model shifts from sunset to studio with them */
    ctx.globalAlpha = 1;
    ctx.fillStyle = SEQ.grads[f.a] || '#0B0F13';
    ctx.fillRect(0, 0, cw, ch);
    if (f.t > 0.001 && f.b !== f.a && SEQ.grads[f.b]) {
      ctx.globalAlpha = f.t;
      ctx.fillStyle = SEQ.grads[f.b];
      ctx.fillRect(0, 0, cw, ch);
      ctx.globalAlpha = 1;
    }

    drawFrame(f.a, zoom, tu, tv);

    if (f.t > 0.001 && f.b !== f.a) {
      ctx.globalAlpha = f.t;
      drawFrame(f.b, zoom, tu, tv);
      ctx.globalAlpha = 1;
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     INITIALISE
     ═══════════════════════════════════════════════════════════════════════ */
  function init() {
    const stage = document.getElementById('stage');
    SEQ.canvas = document.getElementById('sequence');
    SEQ.ctx = SEQ.canvas.getContext('2d', { alpha: false });
    resize();
    global.addEventListener('resize', resize, { passive: true });

    return loadAll().then(() => {
      SEQ.ready = true;
      stage.dataset.render = 'ready';
      return true;
    });
  }

  global.SEQUENCE = { init, draw, resize, state: SEQ };
})(window);
