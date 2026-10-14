/* launch-pups.js — when the site opens as the installed app, Tidbit and Sugarfoot run up and down the
   sides of the screen while the first page loads, then the cover fades away.
   How it starts: every page's head has a tiny inline script (tools/seo/build_seo.py) that, only in the installed
   app and only once per app launch (sessionStorage 'tol-launch-seen'), shows a plain cover in the app's colour
   at once (class "lp-boot" on <html>) and asks for this file and launch-pups.css. A page without that head
   script gets the same from site.js. This file then puts the real cover on top and takes the plain one away.
   Rules: it fades out as soon as the page is ready (after a short run, so the pups are seen), it is always gone
   2.5 seconds after the app opened (a CSS animation keeps that deadline, so a busy page can't hold it up), a tap
   anywhere (or any key) skips it, and if anything goes wrong it simply doesn't show. With reduced motion, Quiet
   mode or "Keep the page still" switched on, the pups sit still and the cover only fades. The cover is aria-hidden
   and never takes focus: screen readers get the page as usual.
   The running is drawn in a worker (this same file, on an OffscreenCanvas) where the browser allows it, so the
   pups keep running smoothly while the page is busy getting ready; otherwise it is drawn here.
   The pups are drawn by pups.js (Tidbit is looks.collar, Sugarfoot is looks.drop).
   The iPhone and iPad start-up pictures (assets/icons/splash/) are this cover's first frame, so the run looks
   continuous: with window.TOLLaunchPupsManual set, TOLLaunchPups.build() draws it without timers. */
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  var LAP = 1150;                        // ms for one run from one end of the screen to the other
  var PHI = Math.acos(0.55);             // where the run starts: Tidbit low going up, Sugarfoot high going down
  var PRE = 360;                         // the dust they have already kicked up when the first frame shows

  // ---------------------------------------------------------------- the drawing (here or in the worker)
  function makeScene(g, o) {
    var still = !!o.still, dark = !!o.dark;
    var W = 1, H = 1, R = 1, s = 1, laneL = 0, laneR = 0, mid = 0, A = 0;
    var seed = 7;   // a small seeded random, so the first frame (and the start-up pictures) always look the same
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    var pups, puffs, simT;
    function reset() {
      seed = 7; puffs = []; simT = -PRE;
      pups = [
        { look: 'collar', side: -1, sign: 1, ph: 0, y: 0, v: 0, dir: -1, turn: 0, nextPuff: -PRE },     // Tidbit, the left side
        { look: 'drop', side: 1, sign: -1, ph: 2.1, y: 0, v: 0, dir: 1, turn: 0, nextPuff: 30 - PRE }   // Sugarfoot, the right side
      ];
    }
    function resize(w, h, r) {
      W = Math.max(1, w); H = Math.max(1, h); R = r;
      g.canvas.width = Math.round(W * R); g.canvas.height = Math.round(H * R);
      s = Math.max(1.3, Math.min(2.6, Math.min(W, H) / 240));
      laneL = Math.max(6, W / 2 - Math.min(W / 2 - 6, 330)); laneR = W - laneL;
      mid = H / 2; A = Math.max(10, H / 2 - Math.max(22, H * 0.05) - 42 * s);
      reset();
    }
    function place(p, t) {
      var th = Math.PI * t / LAP + PHI;
      p.y = mid + p.sign * A * Math.cos(th);
      p.v = -p.sign * A * Math.sin(th) * Math.PI / LAP;   // px per ms
      p.turn = Math.pow(1 - Math.abs(Math.sin(th)), 3);   // 1 at the very end of a run, where they push off
    }
    function puff(x, y, vx, vy, big) {
      puffs.push({ x: x, y: y, vx: vx, vy: vy, r: (big ? 4.5 : 3) * s * (0.8 + rnd() * 0.4), age: 0, life: (big ? 620 : 480) + rnd() * 160 });
    }
    function step(t, dt) {
      pups.forEach(function (p) {
        var oldDir = p.dir, lane = p.side < 0 ? laneL : laneR, inward = -p.side;
        place(p, t);
        p.ph += Math.abs(p.v) * dt / (5.2 * s);
        if (Math.abs(p.v) > 0.02) p.dir = p.v < 0 ? -1 : 1;
        // a little cloud where they turn round, and dust kicked up behind them as they run
        if (p.dir !== oldDir) for (var k = 0; k < 4; k++) puff(lane + inward * 4 * s, p.y + (rnd() - 0.5) * 30 * s, inward * (0.03 + rnd() * 0.05), (rnd() - 0.5) * 0.08, true);
        if (t >= p.nextPuff && Math.abs(p.v) > 0.25) {
          p.nextPuff = t + 62 + rnd() * 30;
          puff(lane + inward * 3 * s, p.y - p.dir * 24 * s, inward * (0.015 + rnd() * 0.03), -p.dir * (0.02 + rnd() * 0.03), false);
        }
      });
      for (var i = puffs.length - 1; i >= 0; i--) {
        var q = puffs[i]; q.age += dt; q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.age >= q.life) puffs.splice(i, 1);
      }
    }
    function advance(t) {
      if (t < simT - 50) reset();
      while (simT < t) { var dt = Math.min(16, t - simT); simT += dt; step(simT, dt); }
    }
    function drawPup(P, p, t) {
      var lane = p.side < 0 ? laneL : laneR, inward = -p.side;
      var hop = p.turn * 14 * s + Math.abs(Math.sin(p.ph)) * 1.4 * s;
      g.save();
      g.translate(lane + inward * hop, p.y);
      // feet on the side of the screen, back towards the middle, nose the way they're running
      g.rotate(p.side < 0 ? Math.PI / 2 : -Math.PI / 2);
      if ((p.side < 0 && p.dir < 0) || (p.side > 0 && p.dir > 0)) g.scale(-1, 1);
      g.scale(s, s);
      if (dark) {   // a soft glow, so the dark pups show up on the dark background
        var gl = g.createRadialGradient(2, -20, 4, 2, -20, 46);
        gl.addColorStop(0, 'rgba(255,240,225,.13)'); gl.addColorStop(1, 'rgba(255,240,225,0)');
        g.fillStyle = gl; g.beginPath(); g.arc(2, -20, 46, 0, TAU); g.fill();
      }
      var blink = ((t + (p.side > 0 ? 900 : 0)) % 2600) < 110;
      P.draw(g, P.looks[p.look], 'run', p.ph, Math.sin(t / 85 + p.side) * 0.9, blink, t, Math.sin(p.ph * 0.5) * 0.05);
      g.restore();
    }
    function drawStill(P) {
      var y = Math.min(H - 26 * s, H * 0.8), gap = 46 * s;
      [{ look: 'collar', x: W / 2 - gap, face: 1 }, { look: 'drop', x: W / 2 + gap, face: -1 }].forEach(function (q) {
        g.save(); g.translate(q.x, y);
        g.fillStyle = dark ? 'rgba(255,240,225,.08)' : 'rgba(110,80,50,.12)'; g.beginPath(); g.ellipse(0, 2 * s, 30 * s, 4 * s, 0, 0, TAU); g.fill();
        g.scale(q.face * s, s);
        P.draw(g, P.looks[q.look], 'sit', 0, 0, false, 0, 0);
        g.restore();
      });
    }
    function draw(t) {
      var P = self.TOLPups;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, g.canvas.width, g.canvas.height);
      if (!P) return false;
      g.setTransform(R, 0, 0, R, 0, 0);
      if (still) { drawStill(P); return true; }
      advance(t);
      // the two "floors" they run along: a soft line down each side
      var c = dark ? '255,240,225' : '120,90,60';
      [laneL, laneR].forEach(function (x) {
        var gr = g.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, 'rgba(' + c + ',0)'); gr.addColorStop(0.2, 'rgba(' + c + ',.16)'); gr.addColorStop(0.8, 'rgba(' + c + ',.16)'); gr.addColorStop(1, 'rgba(' + c + ',0)');
        g.fillStyle = gr; g.fillRect(x - 1, 0, 2, H);
      });
      puffs.forEach(function (q) {
        var k = q.age / q.life, a = (1 - k) * (1 - k) * 0.55;
        g.fillStyle = dark ? 'rgba(235,222,208,' + (a * 0.6).toFixed(3) + ')' : 'rgba(196,164,124,' + a.toFixed(3) + ')';
        g.beginPath(); g.arc(q.x, q.y, q.r * (1 + k * 1.6), 0, TAU); g.fill();
      });
      pups.forEach(function (p) { drawPup(P, p, t); });
      return true;
    }
    return { resize: resize, draw: draw };
  }

  // ---------------------------------------------------------------- in the worker
  if (typeof document === 'undefined') {
    if (typeof importScripts !== 'function') return;
    self.window = self;                       // pups.js hangs TOLPups on window
    var scene = null, still = false, base = 0, timer = 0, stopped = false;
    var later = self.requestAnimationFrame ? function (f) { return self.requestAnimationFrame(f); } : function (f) { return setTimeout(f, 16); };
    function tick() {
      timer = 0; if (stopped || !scene) return;
      scene.draw(performance.now() - base);
      if (!still) timer = later(tick);
    }
    var havePups = false;
    function pupsIn() { if (!havePups) { try { importScripts('/assets/js/pups.js'); havePups = true; } catch (err) {} } return havePups; }
    self.onmessage = function (e) {
      var m = e.data || {};
      if (m.type === 'warm') pupsIn();              // fetch the pups while the page sets up the cover
      else if (m.type === 'start') {
        if (!pupsIn()) return;
        still = !!m.still; base = performance.now() - (m.t || 0);
        scene = makeScene(m.canvas.getContext('2d'), m); scene.resize(m.W, m.H, m.R);
        tick(); self.postMessage({ type: 'drawn' });
      } else if (m.type === 'size' && scene) { scene.resize(m.W, m.H, m.R); if (still) scene.draw(0); }
      else if (m.type === 'stop') { stopped = true; self.close(); }
    };
    return;
  }

  // ---------------------------------------------------------------- on the page
  var D = document, DE = D.documentElement;
  // times are in ms since the app started loading this page (performance.now() counts from there)
  var GONE_BY = 2500, FADE = 320, SKIP_FADE = 200, MIN_RUN = 900, MIN_STILL = 600, GIVE_UP = 1700;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function mm(q) { try { return !!(window.matchMedia && window.matchMedia(q).matches); } catch (e) { return false; } }
  function stillWanted() {
    // the device asks for less motion, or Quiet mode or "Keep the page still" was switched on here
    // (that switch starts on by itself on phones; only a choice made on purpose counts for this)
    return mm('(prefers-reduced-motion: reduce)') || lsGet('tol-quiet') === '1' || lsGet('tol-still') === '1';
  }
  function darkWanted() {
    var t = lsGet('tol-theme');
    if (t === 'dark' || t === 'light') return t === 'dark';
    return mm('(prefers-color-scheme: dark)');
  }
  function dropBoot(soft) {
    if (!DE.classList.contains('lp-boot')) { DE.classList.remove('lp-dark'); return; }
    if (!soft) { DE.classList.remove('lp-boot', 'lp-boot-out', 'lp-dark'); return; }
    DE.classList.add('lp-boot-out');
    setTimeout(function () { DE.classList.remove('lp-boot', 'lp-boot-out', 'lp-dark'); }, 260);
  }
  function loadPups(cb) {
    if (window.TOLPups) { cb(); return; }
    var sc = D.querySelector('script[src="/assets/js/pups.js"]');
    if (!sc) { sc = D.createElement('script'); sc.src = '/assets/js/pups.js'; D.head.appendChild(sc); }
    var done = false, poll = setInterval(check, 50);
    function check() { if (!done && window.TOLPups) { done = true; clearInterval(poll); cb(); } }
    sc.addEventListener('load', check);
    setTimeout(function () { clearInterval(poll); }, GONE_BY);
  }

  // a worker to draw in, started as early as possible so it is warm by the time the cover shows
  function makeWorker() {
    try {
      if (!window.Worker || !window.HTMLCanvasElement || !HTMLCanvasElement.prototype.transferControlToOffscreen) return null;
      var w = new Worker('/assets/js/launch-pups.js');
      w.onerror = function () {};
      w.postMessage({ type: 'warm' });
      return w;
    } catch (e) { return null; }
  }

  // the cover: the logo and name in the middle, two canvases behind them: one drawn here, straight away, and
  // one drawn in the worker, which takes over (smoothly, whatever the page is busy with) once it has a frame.
  // opts: still, dark, worker (from makeWorker), onDrawn (the pups are on screen)
  function build(opts) {
    opts = opts || {};
    var el = D.createElement('div');
    el.className = 'lp' + (opts.dark ? ' is-dark' : '') + (opts.still ? ' is-still' : '');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<canvas></canvas>' + (opts.worker && !opts.still ? '<canvas class="lp-w"></canvas>' : '') +
      '<div class="lp-mid"><span class="lp-tile"><img src="/assets/img/logo-mark.svg" alt="" width="128" height="128"></span>' +
      '<span class="lp-name">Spread Love<br>&amp; Acceptance</span></div>';
    var cv = el.querySelector('canvas'), cw = el.querySelector('canvas.lp-w'), worker = cw ? opts.worker : null;
    var scene = null, raf = 0, t0 = 0, stopped = false, handed = false;
    function dims() {
      return { W: el.clientWidth || innerWidth, H: el.clientHeight || innerHeight, R: Math.min(3, Math.max(1, window.devicePixelRatio || 1)) };
    }
    function drawn() { if (opts.onDrawn) { var f = opts.onDrawn; opts.onDrawn = null; f(); } }
    function frame(ts) {
      raf = 0; if (stopped || handed) return;
      if (scene.draw(Math.max(0, ts - t0))) drawn();
      if (!opts.still) raf = requestAnimationFrame(frame);
    }
    if (opts.worker && !worker) { try { opts.worker.terminate(); } catch (e) {} }
    return {
      el: el,
      // call once the cover is in the page
      start: function () {
        var d = dims();
        t0 = performance.now();
        scene = makeScene(cv.getContext('2d'), opts); scene.resize(d.W, d.H, d.R);
        if (worker) {
          try {
            var off = cw.transferControlToOffscreen();
            worker.onmessage = function (e) {
              if (!e.data || e.data.type !== 'drawn' || stopped) return;
              // the worker has a frame up: it carries on from here
              handed = true; if (raf) cancelAnimationFrame(raf); raf = 0;
              el.classList.add('is-w'); drawn();
            };
            worker.postMessage({ type: 'start', canvas: off, W: d.W, H: d.H, R: d.R, still: false, dark: !!opts.dark, t: performance.now() - t0 }, [off]);
          } catch (e) { try { worker.terminate(); } catch (e2) {} worker = null; }
        }
        loadPups(function () { if (!stopped && !handed && !raf) raf = requestAnimationFrame(frame); });
        if (window.TOLPups) frame(performance.now());
      },
      resize: function () {
        var d = dims();
        if (worker) worker.postMessage({ type: 'size', W: d.W, H: d.H, R: d.R });
        if (scene) { scene.resize(d.W, d.H, d.R); if (opts.still || !handed) scene.draw(Math.max(0, performance.now() - t0)); }
      },
      // for the start-up pictures: draw one frame at time t (needs TOLPups loaded)
      drawAt: function (t) { if (!scene) { scene = makeScene(cv.getContext('2d'), opts); var d = dims(); scene.resize(d.W, d.H, d.R); } return scene.draw(t); },
      stop: function () { stopped = true; if (raf) cancelAnimationFrame(raf); raf = 0; if (worker) { try { worker.postMessage({ type: 'stop' }); } catch (e) {} worker = null; } }
    };
  }

  // ---------------------------------------------------------------- showing it at launch
  function run() {
    var ov = null, shownAt = 0, out = false, shown = false, cssOk = false, fadeTimer = 0;
    var still = stillWanted(), dark = darkWanted(), worker = still ? null : makeWorker();
    function now() { return performance.now(); }
    function cleanup() {
      if (ov) { ov.stop(); if (ov.el.parentNode) ov.el.parentNode.removeChild(ov.el); }
      else if (worker) { try { worker.terminate(); } catch (e) {} }
      D.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onResize);
      dropBoot(false);
    }
    function fade(ms) {
      if (out) return; out = true; clearTimeout(fadeTimer);
      if (!ov) { cleanup(); return; }
      ov.el.style.transitionDuration = ms + 'ms';
      ov.el.classList.add('is-out');
      setTimeout(cleanup, ms + 40);
    }
    function giveUp() { if (!out) { out = true; if (worker) { try { worker.terminate(); } catch (e) {} } dropBoot(true); } }
    function onKey() { fade(SKIP_FADE); }
    function onResize() { if (ov && !out) ov.resize(); }
    function ready() {
      // the page is ready: its HTML is in, and its fonts (as long as they don't take too long)
      var domReady = new Promise(function (res) { if (D.readyState !== 'loading') res(); else D.addEventListener('DOMContentLoaded', function () { res(); }); });
      var fonts = D.fonts && D.fonts.ready ? D.fonts.ready.catch(function () {}) : Promise.resolve();
      return domReady.then(function () { return fonts; });
    }
    function scheduleFade() {
      var latest = GONE_BY - FADE;
      fadeTimer = setTimeout(function () { fade(FADE); }, Math.max(0, latest - now()));
      ready().then(function () {
        if (out) return;
        var at = Math.min(Math.max(now(), shownAt + (still ? MIN_STILL : MIN_RUN)), latest);
        clearTimeout(fadeTimer); fadeTimer = setTimeout(function () { fade(FADE); }, Math.max(0, at - now()));
      });
    }
    function show() {
      if (shown || out || !cssOk) return;
      if (now() > GIVE_UP || D.hidden) { giveUp(); return; }
      shown = true;
      try {
        ov = build({ still: still, dark: dark, worker: worker, onDrawn: function () { if (still && ov) ov.el.classList.add('is-in'); } });
        // the page may still be arriving: before <body> exists the cover goes straight into <html>
        (D.body || DE).appendChild(ov.el);
        shownAt = now();
        // the deadline is kept by the browser itself (an animation pinned to the moment the page started loading),
        // so a busy page can't hold the cover up
        try {
          var dl = ov.el.animate([{ opacity: 0, visibility: 'hidden' }], { duration: FADE, delay: GONE_BY - FADE, fill: 'forwards', easing: 'ease' });
          dl.startTime = 0;
        } catch (e) { ov.el.style.animation = 'lp-gone ' + FADE + 'ms ease ' + Math.max(0, Math.round(GONE_BY - FADE - shownAt)) + 'ms forwards'; }
        ov.start();
        ov.el.addEventListener('click', function () { fade(SKIP_FADE); });
        D.addEventListener('keydown', onKey, true);
        window.addEventListener('resize', onResize);
        // the plain cover underneath can go once this one is on screen
        requestAnimationFrame(function () { requestAnimationFrame(function () { DE.classList.remove('lp-boot', 'lp-boot-out', 'lp-dark'); }); });
        scheduleFade();
      } catch (e) { out = true; cleanup(); }
    }
    // the styles first (a cover without them would be a mess)
    var link = D.querySelector('link[href="/assets/css/launch-pups.css"]');
    if (!link) { link = D.createElement('link'); link.rel = 'stylesheet'; link.href = '/assets/css/launch-pups.css'; D.head.appendChild(link); }
    function cssLoaded() { cssOk = true; show(); }
    if (link.sheet) cssLoaded(); else { link.addEventListener('load', cssLoaded); link.addEventListener('error', function () { if (!shown) giveUp(); }); }
    // the pups for the first frames drawn here (most pages have them already)
    loadPups(function () {});
    // nothing came in time: let the page show
    setTimeout(function () { if (!shown) giveUp(); }, Math.max(0, GIVE_UP - now()));
  }

  window.TOLLaunchPups = { build: build, still: stillWanted, dark: darkWanted };
  if (!window.TOLLaunchPupsManual) { try { run(); } catch (e) { dropBoot(false); } }
})();
