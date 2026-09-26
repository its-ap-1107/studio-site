/* ============================================================================
   SVARA ATELIER — Residence No. 07
   sequence.js · the residence, drawn to canvas under scroll control
   ----------------------------------------------------------------------------
   The exploded render is not shown as a picture. It is cut along the gaps it
   already contains and each layer is drawn separately, so the roof canopy,
   the slatted soffit, the linear light and the floors travel apart and back
   together as one continuous move. At full separation every layer is at zero
   offset, so the reconstruction is the original render, pixel for pixel.

   Either side of it sits a real assembled render. Those dissolves happen
   while the animated layers are fully closed up, so both halves of every
   dissolve show a complete building and only the camera angle changes.
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
    sky: null,           /* cached backdrop for the space layers vacate */
    last: ''
  };

  /* ── loading ──────────────────────────────────────────────────────────
     Only what the sequence actually shows. FRAMES may describe renders that
     are documented but not in KEYS; those are not fetched, so they cost the
     visitor nothing while staying a one-line change away.
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
    /* capped: a handful of draws per frame stays comfortably inside budget */
    SEQ.dpr = Math.min(global.devicePixelRatio || 1, 1.75);
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    SEQ.canvas.width  = Math.round(w * SEQ.dpr);
    SEQ.canvas.height = Math.round(h * SEQ.dpr);
    SEQ.canvas.style.width  = w + 'px';
    SEQ.canvas.style.height = h + 'px';

    if (SEQ.ctx) {
      SEQ.ctx.imageSmoothingQuality = 'high';
      /* matched to the exploded render's own backdrop, so the space a layer
         vacates reads as the room it sits in rather than as a hole */
      const g = SEQ.ctx.createLinearGradient(0, 0, 0, SEQ.canvas.height);
      g.addColorStop(0,   '#141A21');
      g.addColorStop(0.55,'#10151B');
      g.addColorStop(1,   '#0B0F13');
      SEQ.sky = g;
    }
    SEQ.last = '';
  }

  /* ── one render, placed under the shared camera ──────────────────────────
     cover-fit × the camera zoom × this render's scale trim, then offset so
     the requested point sits at the centre. The offset is clamped so an edge
     of the render can never come into frame.
     ------------------------------------------------------------------- */
  function place(img, frame, zoom, tu, tv) {
    const cw = SEQ.canvas.width, ch = SEQ.canvas.height;
    const cover = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    /* cover is a floor, never a target: whatever the camera and the trim ask
       for, the render always reaches every edge of the stage */
    const s = cover * Math.max(zoom * frame.k, 1);

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

  /* ── one render, layer by layer ──────────────────────────────────────────
     Rows are drawn bottom-first so a descending layer settles on top of what
     it belongs on: the roof lands over the floor below it, not behind it.
     ------------------------------------------------------------------- */
  function drawFrame(key, zoom, tu, tv, t) {
    const rec = SEQ.images[key];
    if (!rec || !rec.ok) return;

    const frame = TLx.FRAMES[key];
    const img = rec.img;
    const r = place(img, frame, zoom, tu, tv);
    const ctx = SEQ.ctx;

    /* not an animated render, or fully apart: one draw, pixel for pixel */
    if (!frame.bands || t >= 0.9995) {
      ctx.drawImage(img, r.x, r.y, r.w, r.h);
      return;
    }

    const B = TLx.BANDS;
    const ih = img.naturalHeight;
    /* a hairline of bleed, so neighbouring rows never show a seam between
       them once they have closed up */
    const bleed = Math.ceil(SEQ.dpr);

    for (let i = B.length - 1; i >= 0; i--) {
      const b = B[i];
      const travelled = TLx.bandAmount(b, t);
      const off = b.dy * (1 - travelled) * r.h;

      const sy = b.y0 * ih;
      const sh = (b.y1 - b.y0) * ih;

      ctx.drawImage(
        img,
        0, sy, img.naturalWidth, sh,
        r.x, r.y + b.y0 * r.h + off, r.w, (b.y1 - b.y0) * r.h + bleed
      );
    }
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
    const t = TLx.explode(p);
    const f = TLx.frameAt(p);

    /* skip the draw when nothing visible has changed */
    const sig = f.a + '|' + f.b + '|' + f.t.toFixed(3) + '|' + t.toFixed(4) +
                '|' + zoom.toFixed(4) + '|' + tu.toFixed(4) + '|' + tv.toFixed(4) +
                '|' + SEQ.canvas.width;
    if (sig === SEQ.last) return;
    SEQ.last = sig;

    const ctx = SEQ.ctx;
    ctx.globalAlpha = 1;
    ctx.fillStyle = SEQ.sky || '#0B0F13';
    ctx.fillRect(0, 0, SEQ.canvas.width, SEQ.canvas.height);

    drawFrame(f.a, zoom, tu, tv, t);

    if (f.t > 0.001 && f.b !== f.a) {
      ctx.globalAlpha = f.t;
      drawFrame(f.b, zoom, tu, tv, t);
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
