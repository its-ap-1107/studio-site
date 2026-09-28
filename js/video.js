/* ============================================================================
   STUDIO SITE — video hero
   video.js · the hero clip: autoplay, loop, and the controls that owes you
   ----------------------------------------------------------------------------
   The clip is NOT scrubbed by scroll. It is a directed camera move — a slow
   dolly from the full elevation in to the entrance lobby — with its own
   pacing, and seeking a compressed video to an arbitrary frame is unreliable
   anyway: only keyframes are cheap to land on, so scrubbing stutters badly on
   Safari and on most phones. Scroll drives the copy over the top of it and
   nothing else.
   ========================================================================= */
(function () {
  'use strict';

  const video  = document.getElementById('heroVideo');
  const toggle = document.getElementById('videoToggle');
  const stage  = document.getElementById('stage');
  if (!video) return;

  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let wanted = !reduceQuery.matches;   /* what the visitor has asked for */
  let onScreen = true;

  /* ── the loop seam ────────────────────────────────────────────────────
     The clip ends deep in the lobby and restarts on the wide elevation, so
     the wrap is a hard cut. Dipping the last and first moments hides it —
     it reads as a breath rather than a jump.
     ------------------------------------------------------------------- */
  const DIP = 0.45;                    /* seconds of fade at each end */

  function seam() {
    const d = video.duration;
    if (!d || !isFinite(d)) return;
    const t = video.currentTime;
    const into = Math.min(t, DIP) / DIP;
    const outOf = Math.min(Math.max(d - t, 0), DIP) / DIP;
    video.style.opacity = Math.max(0.12, Math.min(into, outOf)).toFixed(3);
  }

  /* ── playback ─────────────────────────────────────────────────────────── */
  function apply() {
    const shouldPlay = wanted && onScreen;
    if (shouldPlay) {
      const r = video.play();
      /* a rejected play() is normal — some browsers refuse until the visitor
         interacts. The poster stays up and the control says Play. */
      if (r && r.catch) r.catch(() => { wanted = false; paint(); });
    } else {
      video.pause();
    }
    paint();
  }

  function paint() {
    if (!toggle) return;
    const playing = !video.paused;
    toggle.setAttribute('aria-label', playing ? 'Pause the background video' : 'Play the background video');
    toggle.dataset.state = playing ? 'playing' : 'paused';
    const label = toggle.querySelector('.video-toggle-text');
    if (label) label.textContent = playing ? 'Pause' : 'Play';
  }

  if (toggle) {
    toggle.addEventListener('click', () => { wanted = !wanted; apply(); });
  }

  video.addEventListener('timeupdate', seam);
  video.addEventListener('play', paint);
  video.addEventListener('pause', paint);

  /* if the clip cannot load at all, the poster is already in place — just
     retire the control so it is not offering something that will not happen */
  video.addEventListener('error', () => {
    if (toggle) toggle.hidden = true;
    video.style.opacity = 1;
    if (stage) stage.dataset.video = 'failed';
  });

  video.addEventListener('loadeddata', () => {
    if (stage) stage.dataset.video = 'ready';
    seam();
    apply();
  });

  /* nothing plays while it is off screen — it saves battery on phones and
     costs the visitor nothing, since they cannot see it */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      onScreen = entries[0].isIntersecting;
      apply();
    }, { threshold: 0.05 }).observe(video);
  }

  /* respect a change of mind about motion, mid-visit */
  const onMotionPref = e => { wanted = !e.matches; apply(); };
  if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', onMotionPref);
  else if (reduceQuery.addListener) reduceQuery.addListener(onMotionPref);

  apply();
})();
