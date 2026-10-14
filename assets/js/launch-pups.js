/* launch-pups.js — when the site opens as the installed app, Tidbit and Sugarfoot run up and down the
   sides of the screen while the first page loads, then the cover fades away.
   site.js loads this (and launch-pups.css) only in the installed app, once per app launch: it sets the
   sessionStorage key 'tol-launch-seen' before loading it, so a second page in the same launch never shows it.
   Every page's head also has a tiny inline cover (tools/seo/build_seo.py, class "lp-boot" on <html>), a plain
   background that shows at once, before the page paints; this file takes over from it.
   Rules: it fades out as soon as the page is ready (and after a short run, so the pups are seen), it is always
   gone 2.5 seconds after the app opened, a tap anywhere (or any key) skips it, and if anything goes wrong it
   simply doesn't show. With reduced motion, Quiet mode or "Keep the page still" switched on, the pups sit still
   and the cover only fades. The cover is aria-hidden and never takes focus: screen readers get the page as usual.
   The pups are drawn by pups.js (Tidbit is looks.collar, Sugarfoot is looks.drop).
   The iPhone and iPad start-up pictures (assets/icons/splash/) are this cover's first frame, so the run looks
   continuous: TOLLaunchPups.build() with window.TOLLaunchPupsManual set draws it without timers. */
(function () {
  'use strict';
  var TAU = Math.PI * 2, D = document, DE = D.documentElement;
  // times are in ms since the app started loading this page (performance.now() counts from there)
  var GONE_BY = 2500, FADE = 320, SKIP_FADE = 200, MIN_RUN = 900, MIN_STILL = 600, GIVE_UP = 1700;
  var LAP = 1150;                        // ms for one run from one end of the screen to the other
  var PHI = Math.acos(0.55);             // where the run starts: Tidbit low going up, Sugarfoot high going down
  var PRE = 360;                         // the dust they have already kicked up when the first frame shows

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function mm(q) { try { return !!(window.matchMedia && window.matchMedia(q).matches); } catch (e) { return false; } }
  function stillWanted() {
    // the device asks for less motion, or Quiet mode or "Keep the page still" was switched on here
    // (the still switch is on by itself on phones; only a choice made on purpose counts for this)
    return mm('(prefers-reduced-motion: reduce)') || lsGet('tol-quiet') === '1' || lsGet('tol-still') === '1';
  }
  function darkWanted() {
    var t = lsGet('tol-theme');
    if (t === 'dark' || t === 'light') return t === 'dark';
    return mm('(prefers-color-scheme: dark)');
  }
  function dropBoot(soft) {
    if (!DE.classList.contains('lp-boot')) return;
    if (!soft) { DE.classList.remove('lp-boot', 'lp-boot-out'); return; }
    DE.classList.add('lp-boot-out');
    setTimeout(function () { DE.classList.remove('lp-boot', 'lp-boot-out'); }, 260);
  }

  // a small seeded random, so the first frame (and the start-up pictures) always look the same
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  // ---------------------------------------------------------------- the cover and the drawing
  function build(opts) {
    opts = opts || {};
    var still = !!opts.still, dark = !!opts.dark;
    var el = D.createElement('div');
    el.className = 'lp' + (dark ? ' is-dark' : '') + (still ? ' is-still' : '');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<canvas></canvas><div class="lp-mid"><span class="lp-tile"><img src="/assets/img/logo-mark.svg" alt="" width="128" height="128" decoding="sync"></span>' +
      '<span class="lp-name">Spread Love<br>&amp; Acceptance</span></div>';
    var cv = el.querySelector('canvas'), g = cv.getContext('2d');
    var W = 0, H = 0, R = 1, s = 1, laneL = 0, laneR = 0, mid = 0, A = 0;
    var pups = [
      { look: 'collar', side: -1, sign: 1, ph: 0, y: 0, v: 0, dir: -1, nextPuff: 0 },   // Tidbit, the left side
      { look: 'drop', side: 1, sign: -1, ph: 2.1, y: 0, v: 0, dir: 1, nextPuff: 30 }     // Sugarfoot, the right side
    ];
    var puffs = [], simT = -PRE;
    function size() {
      W = Math.max(1, el.clientWidth || innerWidth); H = Math.max(1, el.clientHeight || innerHeight);
      R = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
      cv.width = Math.round(W * R); cv.height = Math.round(H * R);
      s = Math.max(1.3, Math.min(2.6, Math.min(W, H) / 240));
      laneL = Math.max(6, W / 2 - Math.min(W / 2 - 6, 330)); laneR = W - laneL;
      var m = Math.max(22, H * 0.05) + 42 * s;
      mid = H / 2; A = Math.max(10, H / 2 - m);
    }
    function place(p, t) {
      var th = Math.PI * t / LAP + PHI, c = Math.cos(th);
      p.y = mid + p.sign * A * c;
      p.v = -p.sign * A * Math.sin(th) * Math.PI / LAP;   // px per ms
      p.turn = Math.pow(1 - Math.abs(Math.sin(th)), 3);   // 1 at the very end of a run, where they push off
    }
    function puff(x, y, vx, vy, big) {
      puffs.push({ x: x, y: y, vx: vx, vy: vy, r: (big ? 4.5 : 3) * s * (0.8 + rnd() * 0.4), age: 0, life: (big ? 620 : 480) + rnd() * 160 });
    }
    // move everything on by dt ms (the run itself is worked out from the time, the dust is stepped)
    function step(t, dt) {
      pups.forEach(function (p) {
        var oldDir = p.dir;
        place(p, t);
        p.ph += Math.abs(p.v) * dt / (5.2 * s);
        if (Math.abs(p.v) > 0.02) p.dir = p.v < 0 ? -1 : 1;
        var lane = p.side < 0 ? laneL : laneR, inward = -p.side;
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
    function advance(t) { while (simT < t) { var dt = Math.min(16, t - simT); simT += dt; step(simT, dt); } }
    function drawPup(P, p, t) {
      var lane = p.side < 0 ? laneL : laneR, inward = -p.side;
      var hop = p.turn * 14 * s + Math.abs(Math.sin(p.ph)) * 1.4 * s;
      g.save();
      g.translate(lane + inward * hop, p.y);
      // feet on the side of the screen, back towards the middle, nose the way they're running
      g.rotate(p.side < 0 ? Math.PI / 2 : -Math.PI / 2);
      if ((p.side < 0 && p.dir < 0) || (p.side > 0 && p.dir > 0)) g.scale(-1, 1);
      g.scale(s, s);
      if (dark) { g.fillStyle = 'rgba(255,240,225,.07)'; g.beginPath(); g.ellipse(2, -20, 44, 26, 0, 0, TAU); g.fill(); }
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
      var P = window.TOLPups;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
      if (!P) return;
      g.setTransform(R, 0, 0, R, 0, 0);
      if (still) { drawStill(P); return; }
      advance(t);
      // the two "floors" they run along: a soft line down each side
      [laneL, laneR].forEach(function (x) {
        var gr = g.createLinearGradient(0, 0, 0, H), c = dark ? '255,240,225' : '120,90,60';
        gr.addColorStop(0, 'rgba(' + c + ',0)'); gr.addColorStop(0.2, 'rgba(' + c + ',.16)'); gr.addColorStop(0.8, 'rgba(' + c + ',.16)'); gr.addColorStop(1, 'rgba(' + c + ',0)');
        g.fillStyle = gr; g.fillRect(x - 1, 0, 2, H);
      });
      puffs.forEach(function (q) {
        var k = q.age / q.life, a = (1 - k) * (1 - k) * 0.55;
        g.fillStyle = dark ? 'rgba(235,222,208,' + (a * 0.6).toFixed(3) + ')' : 'rgba(196,164,124,' + a.toFixed(3) + ')';
        g.beginPath(); g.arc(q.x, q.y, q.r * (1 + k * 1.6), 0, TAU); g.fill();
      });
      pups.forEach(function (p) { drawPup(P, p, t); });
    }
    return { el: el, size: size, draw: draw };
  }

  // ---------------------------------------------------------------- showing it at launch
  function run() {
    var ov = null, raf = 0, t0 = 0, shownAt = 0, out = false, still = stillWanted(), dark = darkWanted();
    var fadeTimer = 0, cssOk = false, pupsOk = !!window.TOLPups, shown = false;
    function now() { return performance.now(); }
    function cleanup() {
      if (raf) cancelAnimationFrame(raf); raf = 0;
      if (ov && ov.el.parentNode) ov.el.parentNode.removeChild(ov.el);
      D.removeEventListener('keydown', onKey, true);
      dropBoot(false);
    }
    function fade(ms) {
      if (out) return; out = true; clearTimeout(fadeTimer);
      if (!ov) { dropBoot(true); return; }
      ov.el.style.transitionDuration = ms + 'ms';
      ov.el.classList.add('is-out');
      setTimeout(cleanup, ms + 40);
    }
    function onKey() { fade(SKIP_FADE); }
    function frame(ts) {
      raf = 0; if (out && !ov.el.parentNode) return;
      try { ov.draw(Math.max(0, ts - t0)); } catch (e) { fade(SKIP_FADE); return; }
      if (!still) raf = requestAnimationFrame(frame);
    }
    function ready() {
      // the page is ready: its HTML is in, and its fonts (as long as they don't take too long)
      var domReady = new Promise(function (res) { if (D.readyState !== 'loading') res(); else D.addEventListener('DOMContentLoaded', res); });
      var fonts = D.fonts && D.fonts.ready ? D.fonts.ready.catch(function () {}) : Promise.resolve();
      return domReady.then(function () { return fonts; });
    }
    function scheduleFade() {
      var latest = GONE_BY - FADE;
      // never later than 2.5 s after the app opened, whatever happens
      fadeTimer = setTimeout(function () { fade(FADE); }, Math.max(0, latest - now()));
      ready().then(function () {
        if (out) return;
        var minEnd = shownAt + (still ? MIN_STILL : MIN_RUN), at = Math.min(Math.max(now(), minEnd), latest);
        clearTimeout(fadeTimer); fadeTimer = setTimeout(function () { fade(FADE); }, Math.max(0, at - now()));
      });
    }
    function show() {
      if (shown || out) return;
      if (!cssOk) return;
      if (now() > GIVE_UP || D.hidden || !D.body) { out = true; dropBoot(true); return; }
      shown = true;
      try {
        ov = build({ still: still, dark: dark });
        D.body.appendChild(ov.el);
        ov.size();
        ov.el.addEventListener('click', function () { fade(SKIP_FADE); });
        D.addEventListener('keydown', onKey, true);
        window.addEventListener('resize', function () { if (ov && !out) { ov.size(); if (still) ov.draw(0); } });
        shownAt = now(); t0 = shownAt;
        ov.draw(0);
        if (still) ov.el.classList.add('is-in');
        // the plain cover underneath can go now that this one is showing
        requestAnimationFrame(function () { DE.classList.remove('lp-boot', 'lp-boot-out'); });
        if (!still) raf = requestAnimationFrame(frame);
        scheduleFade();
      } catch (e) { ov = null; out = true; cleanup(); }
    }
    function pupsArrived() { pupsOk = true; if (shown && ov && !out) { try { ov.draw(Math.max(0, now() - t0)); if (!still && !raf) raf = requestAnimationFrame(frame); } catch (e) {} } }
    // the styles first (a cover without them would be a mess); the pups can arrive a moment later
    var link = D.querySelector('link[href="/assets/css/launch-pups.css"]');
    if (!link) { link = D.createElement('link'); link.rel = 'stylesheet'; link.href = '/assets/css/launch-pups.css'; D.head.appendChild(link); }
    function cssLoaded() { cssOk = true; show(); }
    if (link.sheet) cssLoaded(); else { link.addEventListener('load', cssLoaded); link.addEventListener('error', function () { out = true; dropBoot(true); }); }
    if (!pupsOk) {
      // site.js has usually asked for pups.js already
      var sc = D.querySelector('script[src="/assets/js/pups.js"]');
      if (!sc) { sc = D.createElement('script'); sc.src = '/assets/js/pups.js'; D.head.appendChild(sc); }
      sc.addEventListener('load', pupsArrived);
      var poll = setInterval(function () { if (window.TOLPups) { clearInterval(poll); if (!pupsOk) pupsArrived(); } else if (out) clearInterval(poll); }, 60);
    }
    // nothing came in time: let the page show
    setTimeout(function () { if (!shown && !out) { out = true; dropBoot(true); } }, Math.max(0, GIVE_UP - now()));
  }

  window.TOLLaunchPups = { build: build, still: stillWanted, dark: darkWanted };
  if (!window.TOLLaunchPupsManual) { try { run(); } catch (e) { dropBoot(false); } }
})();
