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
    trail: null,         /* half-res copy of the last frame, for motion blur */
    tctx: null,
    hasTrail: false,
    lastP: null,
    last: ''
  };

  /* How far a render keeps travelling through a dissolve, as a fraction of
     its size. The explosion is radial, so scaling about the building's centre
     is a fair approximation of the parts' actual movement — which means the
     outgoing render can carry on outward while the incoming one arrives from
     where the outgoing one had things. Without this the two simply cross-fade,
     and a cross-fade reads as a double exposure, not as motion. */
  const DRIFT = 0.085;

  /* ── loading ──────────────────────────────────────────────────────────
     Only what the sequence actually shows. FRAMES may describe renders that
     are documented but not in KEYS; those are not fetched.
     ------------------------------------------------------------------- */
  function loadOne(key) {
    return new Promise(resolve => {
      if (SEQ.images[key]) return resolve();
      const rec = { ok: false, img: new Image() };
      SEQ.images[key] = rec;
      rec.img.decoding = 'async';
      rec.img.onload = () => {
        const done = () => { rec.ok = true; resolve(); };
        if (rec.img.decode) rec.img.decode().then(done, done);
        else done();
      };
      rec.img.onerror = () => resolve();
      rec.img.src = TLx.FRAMES[key].src;
    });
  }

  /* The opening frame gates the curtain; the other eleven stream in behind it,
     in sequence order, so the ones needed soonest arrive first. Twelve frames
     is about 2.6MB — far too much to hold a visitor behind a blank screen for,
     and unnecessary, since drawFrame simply skips any frame not yet decoded
     and the one before it stays on screen until it is. */
  function loadAll() {
    const used = [];
    TLx.KEYS.forEach(e => { if (used.indexOf(e[1]) < 0) used.push(e[1]); });
    if (!used.length) return Promise.resolve();

    return loadOne(used[0]).then(() => {
      let i = 1;
      const next = () => {
        if (i >= used.length) return;
        loadOne(used[i++]).then(() => {
          SEQ.last = '';           /* a newly arrived frame may change the draw */
          next();
        });
      };
      next();
    });
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

    /* the motion-blur buffer is half resolution: four times cheaper to blit,
       and the softness from scaling it back up is exactly what is wanted */
    if (!SEQ.trail) {
      SEQ.trail = document.createElement('canvas');
      SEQ.tctx = SEQ.trail.getContext('2d', { alpha: false });
    }
    SEQ.trail.width  = Math.max(1, SEQ.canvas.width  >> 1);
    SEQ.trail.height = Math.max(1, SEQ.canvas.height >> 1);
    SEQ.hasTrail = false;

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

  function drawFrame(key, zoom, tu, tv, bias) {
    const rec = SEQ.images[key];
    if (!rec || !rec.ok) return;
    const r = place(rec.img, TLx.FRAMES[key], zoom * (bias || 1), tu, tv);
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

    /* how fast the visitor is moving, in progress per frame */
    const vel = SEQ.lastP === null ? 0 : Math.abs(p - SEQ.lastP);
    SEQ.lastP = p;
    const smear = SEQ.reduced ? 0 : Math.min(0.5, vel * 55);

    /* skip the draw when nothing visible has changed — but keep drawing while
       a motion trail is still decaying, or it would freeze mid-smear */
    const sig = f.a + '|' + f.b + '|' + f.t.toFixed(3) + '|' +
                zoom.toFixed(4) + '|' + tu.toFixed(4) + '|' + tv.toFixed(4) +
                '|' + SEQ.canvas.width;
    if (sig === SEQ.last && smear < 0.02 && !SEQ.hasTrail) return;
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

    /* the parts are travelling one way or the other; both renders move with
       them so the swap happens underneath a continuous motion */
    let biasA = 1, biasB = 1;
    if (f.t > 0.001 && f.b !== f.a) {
      const A = TLx.FRAMES[f.a], B = TLx.FRAMES[f.b];
      const dir = Math.sign((B.order || 0) - (A.order || 0)) * DRIFT;
      biasA = 1 + dir * f.t;
      biasB = 1 - dir * (1 - f.t);
    }

    drawFrame(f.a, zoom, tu, tv, biasA);

    if (f.t > 0.001 && f.b !== f.a) {
      ctx.globalAlpha = f.t;
      drawFrame(f.b, zoom, tu, tv, biasB);
      ctx.globalAlpha = 1;
    }

    /* motion blur, proportional to scroll speed: fast scrubbing smears into
       the previous frame instead of flickering between two of them */
    if (smear > 0.02 && SEQ.hasTrail) {
      ctx.globalAlpha = smear;
      ctx.drawImage(SEQ.trail, 0, 0, SEQ.trail.width, SEQ.trail.height, 0, 0, cw, ch);
      ctx.globalAlpha = 1;
    }
    if (smear > 0.02 || SEQ.hasTrail) {
      SEQ.tctx.drawImage(SEQ.canvas, 0, 0, cw, ch,
                         0, 0, SEQ.trail.width, SEQ.trail.height);
      SEQ.hasTrail = smear > 0.02;
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     INITIALISE
     ═══════════════════════════════════════════════════════════════════════ */
  function init() {
    const stage = document.getElementById('stage');
    SEQ.canvas = document.getElementById('sequence');
    SEQ.ctx = SEQ.canvas.getContext('2d', { alpha: false });
    SEQ.reduced = global.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
