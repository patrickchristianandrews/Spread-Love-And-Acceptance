/* app-ad.js — the "Get the app" ad: Tidbit and Sugarfoot, tilted sideways and bouncing, moonwalking and break dancing.
   It sits under the opening block of the home page and Start here, links to /install.html, and offers a choice at the
   top: Android (install now) or iPhone (App Store, coming soon). It can be hidden (remembered on this device only,
   key 'tol-appad-off'), is skipped inside the installed app and on the install page, and is a still picture with
   reduced motion. Uses the pups from pups.js. TOLAppAd.drawScene(ctx, W, H, t, opts) draws just the dancing,
   so the share image (assets/img/get-the-app.png) is made from the very same drawing. */
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function ease(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function mix(a, b, k) { return a + (b - a) * k; }

  // ---------------------------------------------------------------- the dancing (a stage 190 wide, 120 tall)
  var VW = 190, VH = 120, FLOOR = 102, CYCLE = 9000;
  var SAYS = [['Moonwalk!', 'Smooth…'], ['Spin!', 'Whoa!'], ['Get the app!', 'Woof!']];
  function pup(c, P, who, x, y, s, o) {
    var L = who === 'tidbit' ? P.looks.collar : P.looks.drop, face = o.face === undefined ? 1 : o.face;
    c.save(); c.translate(x, y - (o.lift || 0)); c.scale(face * s, (o.sy || 1) * s);
    if (o.rot) { c.translate(0, -12); c.rotate(o.rot); c.translate(0, 12); }
    P.draw(c, L, o.pose || 'run', o.ph || 0, o.wag || 0, !!o.blink, o.t || 0, o.tilt || 0);
    c.restore();
  }
  function shadow(c, x, w, k) { c.fillStyle = 'rgba(60,40,90,' + (0.18 * k).toFixed(3) + ')'; c.beginPath(); c.ellipse(x, FLOOR + 2, w, 3.2, 0, 0, TAU); c.fill(); }
  function note(c, x, y, a, ch) { c.save(); c.globalAlpha = a; c.fillStyle = '#7A4FB5'; c.font = '700 13px Georgia, serif'; c.textAlign = 'center'; c.fillText(ch, x, y); c.restore(); }
  // which act, and how far into it, at time t (ms)
  function actAt(t) { t = Math.max(0, t); var m = t % CYCLE, a = Math.floor(m / 3000); return { a: a, u: (m - a * 3000) / 3000, said: SAYS[a] }; }
  function drawScene(c, W, H, t, opts) {
    var P = window.TOLPups; if (!P) return;
    opts = opts || {}; var still = !!opts.still, k = Math.min(W / VW, H / VH);
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    if (!opts.transparent) {
      var bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#FFE9F1'); bg.addColorStop(1, '#E9E2FB'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
    }
    c.translate((W - VW * k) / 2, (H - VH * k) / 2); c.scale(k, k);
    // the dance floor: a little disco circle of light
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(VW / 2, FLOOR + 3, 86, 11, 0, 0, TAU); c.fill();
    var cols = ['#F7A8C2', '#F8D76A', '#7FE0D7', '#B296F0']; for (var i = 0; i < 4; i++) { c.fillStyle = cols[i]; c.globalAlpha = 0.5; c.beginPath(); c.ellipse(VW / 2 - 60 + i * 40 + (still ? 0 : Math.sin(t / 300 + i) * 4), FLOOR + 3, 13, 3.4, 0, 0, TAU); c.fill(); } c.globalAlpha = 1;
    var A = actAt(still ? 0 : t), u = A.u, T = { x: 60 }, S = { x: 130 }, ph = t / 95;
    var tp = { who: 'tidbit', x: 62, lift: 0, pose: 'sit', face: 1, ph: 0, t: t, wag: Math.sin(t / 140) * 0.5 }, sp = { who: 'sugarfoot', x: 128, lift: 0, pose: 'sit', face: -1, ph: 0, t: t, wag: Math.sin(t / 150) * 0.5 };
    if (still) { tp.x = 70; sp.x = 120; tp.pose = 'bow'; sp.pose = 'sit'; }
    else if (A.a === 0) {
      // the moonwalk: they face one way and glide the other, legs going, with a little hop on the beat
      var glide = ease(u);
      tp.pose = sp.pose = 'run'; tp.face = sp.face = 1; tp.ph = sp.ph = ph;
      tp.x = mix(130, 46, glide); sp.x = mix(200, 120, glide);
      tp.lift = Math.abs(Math.sin(t / 150)) * 2.5; sp.lift = Math.abs(Math.sin(t / 150 + 1)) * 2.5; tp.tilt = Math.sin(t / 120) * 0.14; sp.tilt = Math.sin(t / 120 + 1) * 0.14;
      if (u > 0.9) { tp.pose = sp.pose = 'sit'; }
    } else if (A.a === 1) {
      // Tidbit spins on her back (the windmill); Sugarfoot does the worm
      var sp1 = ease(clamp((u - 0.1) / 0.75, 0, 1));
      tp.x = 56; tp.face = 1;
      if (u < 0.1) { tp.pose = 'sit'; }
      else if (u < 0.85) { tp.pose = 'lie'; tp.rot = TAU * 3 * sp1; tp.lift = 7 + 5 * Math.abs(Math.sin(t / 110)); }
      else { tp.pose = 'bow'; }
      sp.pose = 'wiggle'; sp.x = 134 + Math.sin(t / 130) * 14; sp.sy = 1 - 0.1 * Math.abs(Math.sin(t / 130)); sp.wag = 3; sp.ph = ph; sp.face = -1;
    } else {
      // Tidbit freezes; Sugarfoot flips; then both wiggle
      tp.x = 54; tp.pose = u < 0.7 ? 'bow' : 'wiggle'; tp.wag = 3;
      if (u > 0.25 && u < 0.6) { var f = (u - 0.25) / 0.35; sp.rot = -TAU * f; sp.lift = Math.sin(f * Math.PI) * 28; sp.pose = 'run'; sp.ph = ph; sp.x = 138 - 12 * f; }
      else if (u >= 0.6) { sp.pose = 'wiggle'; sp.x = 126 + Math.sin(t / 120) * 5; sp.wag = 3; sp.ph = ph; }
      else sp.pose = 'sit';
      if (u >= 0.7) { tp.x = 54 + Math.sin(t / 120) * 5; tp.ph = ph; }
    }
    shadow(c, tp.x, 17, 1 - clamp((tp.lift || 0) / 24, 0, 0.6)); shadow(c, sp.x, 17, 1 - clamp((sp.lift || 0) / 36, 0, 0.6));
    var sc = 1.3; pup(c, P, 'tidbit', tp.x, FLOOR, sc, tp); pup(c, P, 'sugarfoot', sp.x, FLOOR, sc, sp);
    // music notes drifting up
    if (!still) for (var n = 0; n < 4; n++) { var q = ((t / 2400) + n / 4) % 1; note(c, 30 + n * 42 + Math.sin(q * 6 + n) * 8, 70 - q * 62, Math.sin(q * Math.PI), n % 2 ? '♪' : '♫'); }
    c.restore();
    return A;
  }

  // ---------------------------------------------------------------- the card
  var CSS =
    '.appad{ position:relative; display:grid; grid-template-columns:minmax(0,230px) 1fr; gap:1rem; align-items:center; margin:1.2rem 0; padding:1rem 1.2rem 1rem 1rem; border-radius:26px; overflow:hidden;' +
    ' background:linear-gradient(135deg,#FFF1F6,#F1EAFD 55%,#E4F4F6); border:2px solid #E4CCEE; box-shadow:0 14px 34px -16px rgba(90,50,130,.4); }' +
    '.appad *{ box-sizing:border-box; }' +
    '.appad .aa-stage{ position:relative; display:block; min-height:150px; }' +
    '.appad .aa-tilt{ display:block; transform-origin:50% 90%; will-change:transform; }' +
    '.appad canvas{ display:block; width:100%; height:auto; aspect-ratio:190/120; border-radius:20px; }' +
    '.appad .aa-say{ position:absolute; left:50%; top:-2px; transform:translateX(-50%); background:#fff; color:#3B2A55; font:700 .9rem/1 "Fraunces",Georgia,serif; padding:.35rem .7rem; border-radius:14px; box-shadow:0 4px 10px rgba(0,0,0,.12); pointer-events:none; white-space:nowrap; }' +
    '.appad .aa-say::after{ content:""; position:absolute; left:50%; bottom:-5px; width:10px; height:10px; background:#fff; transform:translateX(-50%) rotate(45deg); }' +
    '.appad .aa-k{ margin:0 0 .15rem !important; font:600 .72rem "IBM Plex Mono",monospace; letter-spacing:.1em; text-transform:uppercase; color:#8A4FA8 !important; background:none !important; box-shadow:none !important; border:0 !important; padding:0 !important; }' +
    '.appad .aa-h{ margin:0 !important; font:800 clamp(1.7rem,6vw,2.5rem)/1 "Fraunces",Georgia,serif !important; color:#3B2A55 !important; background:none !important; box-shadow:none !important; border:0 !important; padding:0 !important; letter-spacing:-.01em; }' +
    '.appad .aa-h em{ font-style:normal; color:#E4566E; }' +
    '.appad .aa-p{ margin:.4rem 0 .7rem !important; color:#4B3D63 !important; line-height:1.45; background:none !important; box-shadow:none !important; border:0 !important; padding:0 !important; max-width:none !important; }' +
    '.appad .aa-pick{ display:flex; flex-wrap:wrap; gap:.5rem; margin:0 0 .6rem; }' +
    '.appad .aa-chip{ display:inline-flex; flex-direction:column; justify-content:center; min-height:48px; padding:.4rem .9rem; border-radius:16px; text-decoration:none !important; font:700 .98rem/1.15 "Lora",Georgia,serif; color:#fff !important; background:#2F7A5A; border:2px solid #2F7A5A; }' +
    '.appad .aa-chip small{ font:600 .72rem "IBM Plex Mono",monospace; letter-spacing:.04em; opacity:.92; }' +
    '.appad .aa-chip.is-soon{ background:#fff; color:#4B3D63 !important; border:2px dashed #B79AD0; }' +
    '.appad .aa-chip:hover{ transform:translateY(-2px); }' +
    '.appad .aa-chip:focus-visible, .appad .aa-go:focus-visible, .appad .aa-x:focus-visible{ outline:3px solid #3B2A55; outline-offset:2px; }' +
    '.appad .aa-go{ display:inline-block; min-height:44px; padding:.55rem 1.1rem; border-radius:999px; background:#E4566E; color:#fff !important; text-decoration:none !important; font:800 1rem/1.2 "Lora",Georgia,serif; box-shadow:0 6px 0 #B8384F; transform:translateY(-3px); transition:transform .1s, box-shadow .1s; }' +
    '.appad .aa-go:hover{ transform:translateY(0); box-shadow:0 3px 0 #B8384F; }' +
    '.appad .aa-x{ position:absolute; top:.45rem; right:.5rem; width:44px; height:44px; border-radius:50%; border:0; background:transparent; color:#6B4F8A; font-size:1.3rem; cursor:pointer; }' +
    '@media (max-width:620px){ .appad{ grid-template-columns:1fr; padding:1rem; } .appad .aa-stage{ max-width:260px; margin:0 auto; } }';
  function css() { if (document.getElementById('appad-css')) return; var s = document.createElement('style'); s.id = 'appad-css'; s.textContent = CSS; document.head.appendChild(s); }

  function mount() {
    if (lsGet('tol-appad-off') === '1') return;
    if ((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true) return;
    var path = location.pathname.replace(/\/index\.html$/, '/'); if (/install\.html$/.test(path)) return;
    var host = document.querySelector('[data-app-ad]'); if (!host) return;
    css();
    var RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    host.innerHTML =
      '<aside class="appad no-bubble" aria-labelledby="aa-h">' +
        '<span class="aa-stage"><span class="aa-tilt"><canvas width="380" height="240" aria-hidden="true"></canvas></span><span class="aa-say" aria-hidden="true"></span></span>' +
        '<div><p class="aa-k no-bubble">Free app</p>' +
        '<h2 class="aa-h no-bubble" id="aa-h">Get the <em>app!</em></h2>' +
        '<p class="aa-p no-bubble">Tidbit and Sugarfoot are moonwalking onto your home screen. Pick your phone:</p>' +
        '<div class="aa-pick" role="group" aria-label="Choose your phone">' +
          '<a class="aa-chip" href="/install.html#android"><span>Android</span><small>Install now</small></a>' +
          '<a class="aa-chip is-soon" href="/install.html#apple"><span>iPhone &amp; iPad</span><small>App Store: coming soon</small></a>' +
        '</div>' +
        '<a class="aa-go" href="/install.html">Get the app &rarr;</a></div>' +
        '<button type="button" class="aa-x" aria-label="Hide this for now">&times;</button>' +
      '</aside>';
    var card = host.firstChild, cv = card.querySelector('canvas'), tilt = card.querySelector('.aa-tilt'), say = card.querySelector('.aa-say'), g = cv.getContext('2d');
    card.querySelector('.aa-x').addEventListener('click', function () { lsSet('tol-appad-off', '1'); stopLoop(); host.innerHTML = ''; });
    var raf = 0, vis = true, t0 = performance.now(), lastSay = '';
    function frame(now) {
      raf = 0; if (!vis || document.hidden) return;
      var t = Math.max(0, now - t0), A = drawScene(g, cv.width, cv.height, t);
      // the whole picture leans sideways and bounces to the beat
      var bounce = Math.abs(Math.sin(t / 260)) * -7, lean = -9 + Math.sin(t / 520) * 3;
      tilt.style.transform = 'translateY(' + bounce.toFixed(1) + 'px) rotate(' + lean.toFixed(1) + 'deg)';
      if (A) { var s = A.u < 0.5 ? A.said[0] : A.said[1]; if (s !== lastSay) { lastSay = s; say.textContent = s; } }
      raf = requestAnimationFrame(frame);
    }
    function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    function startLoop() { if (!raf && !RM) raf = requestAnimationFrame(frame); }
    function still() { drawScene(g, cv.width, cv.height, 0, { still: true }); tilt.style.transform = 'rotate(-8deg)'; say.textContent = 'Get the app!'; }
    function go() {
      if (!window.TOLPups) { setTimeout(go, 150); return; }
      if (RM) { still(); return; }
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) startLoop(); else stopLoop(); }, { threshold: 0.05 }).observe(card); else startLoop();
      document.addEventListener('visibilitychange', function () { if (!document.hidden) startLoop(); });
      startLoop();
    }
    go();
  }
  window.TOLAppAd = { drawScene: drawScene, actAt: actAt };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
