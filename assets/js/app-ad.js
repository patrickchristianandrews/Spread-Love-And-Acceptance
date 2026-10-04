/* app-ad.js — the "Get the app" ad: Tidbit and Sugarfoot on a straight stage, each keeping to their own side of a little boombox, moonwalking, spinning, flipping and hopping.
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
  var VW = 190, VH = 120, FLOOR = 102, ACT = 3000, NACT = 4, CYCLE = ACT * NACT;
  var SAYS = [['Moonwalk!', 'Smooth…'], ['Windmill!', 'The worm!'], ['Freeze!', 'Flip!'], ['Get the app!', 'Woof!']];
  function pup(c, P, who, x, y, s, o) {
    var L = who === 'tidbit' ? P.looks.collar : P.looks.drop, face = o.face === undefined ? 1 : o.face;
    c.save(); c.translate(x, y - (o.lift || 0)); c.scale(face * s, (o.sy || 1) * s);
    if (o.rot) { c.translate(0, -12); c.rotate(o.rot); c.translate(0, 12); }
    P.draw(c, L, o.pose || 'run', o.ph || 0, o.wag || 0, !!o.blink, o.t || 0, o.tilt || 0);
    c.restore();
  }
  function shadow(c, x, w, k) { c.fillStyle = 'rgba(60,40,90,' + (0.18 * k).toFixed(3) + ')'; c.beginPath(); c.ellipse(x, FLOOR + 2, w, 3.2, 0, 0, TAU); c.fill(); }
  function note(c, x, y, a, ch) { c.save(); c.globalAlpha = a; c.fillStyle = '#7A4FB5'; c.font = '700 13px Georgia, serif'; c.textAlign = 'center'; c.fillText(ch, x, y); c.restore(); }
  // a little boombox in the middle keeps the two apart, and pulses to the beat
  function boombox(c, t) {
    var pulse = Math.max(0, Math.sin(t / 250 * TAU / 2)), x = VW / 2, y = FLOOR + 3;
    c.fillStyle = '#4B4E6D'; c.beginPath(); c.roundRect ? c.roundRect(x - 15, y - 21, 30, 19, 3) : c.rect(x - 15, y - 21, 30, 19); c.fill();
    c.fillStyle = '#3C3350'; c.fillRect(x - 5, y - 25, 10, 4);
    for (var k = -1; k <= 1; k += 2) { c.fillStyle = '#2C2638'; c.beginPath(); c.arc(x + k * 8, y - 11, 5.6 + pulse * 1.2, 0, TAU); c.fill(); c.fillStyle = '#7FB8F0'; c.beginPath(); c.arc(x + k * 8, y - 11, 2.6 + pulse * 0.8, 0, TAU); c.fill(); }
    c.fillStyle = '#F7C948'; c.fillRect(x - 3.5, y - 7, 7, 2.5);
  }
  // which act, and how far into it, at time t (ms)
  function actAt(t) { t = Math.max(0, t); var m = t % CYCLE, a = Math.floor(m / ACT); return { a: a, u: (m - a * ACT) / ACT, said: SAYS[a] }; }
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
    boombox(c, still ? 0 : t);
    var A = actAt(still ? 0 : t), u = A.u, ph = t / 95, TX = 44, SX = 148;   // Tidbit keeps the left side, Sugarfoot the right
    var tp = { x: TX, lift: 0, pose: 'sit', face: 1, ph: 0, t: t, wag: Math.sin(t / 140) * 0.5 }, sp = { x: SX, lift: 0, pose: 'sit', face: -1, ph: 0, t: t, wag: Math.sin(t / 150) * 0.5 };
    var beat = Math.abs(Math.sin(t / 300));
    if (still) { tp.pose = 'bow'; sp.pose = 'sit'; }
    else if (A.a === 0) {
      // Sugarfoot moonwalks: she faces the music and glides away from it, legs going; Tidbit bops on the beat
      var glide = ease(u); sp.pose = 'run'; sp.face = -1; sp.ph = ph; sp.x = mix(130, 154, glide); sp.lift = beat * 2.2; sp.tilt = Math.sin(t / 120) * 0.12;
      tp.pose = 'wiggle'; tp.ph = ph; tp.wag = 3; tp.lift = beat * 5; tp.x = TX + Math.sin(t / 380) * 6;
      if (u > 0.88) sp.pose = 'sit';
    } else if (A.a === 1) {
      // Tidbit spins on her back, the windmill; Sugarfoot does the worm
      var sp1 = ease(clamp((u - 0.08) / 0.77, 0, 1));
      if (u < 0.08) tp.pose = 'sit'; else if (u < 0.85) { tp.pose = 'lie'; tp.rot = TAU * 3 * sp1; tp.lift = 7 + 5 * Math.abs(Math.sin(t / 110)); } else tp.pose = 'bow';
      sp.pose = 'wiggle'; sp.x = SX + Math.sin(t / 130) * 9; sp.sy = 1 - 0.1 * Math.abs(Math.sin(t / 130)); sp.wag = 3; sp.ph = ph;
    } else if (A.a === 2) {
      // Tidbit freezes with her tail up; Sugarfoot does a backflip, then they bow to each other
      tp.pose = 'bow'; tp.wag = 2.5; tp.x = 32; sp.x = 158;
      if (u > 0.2 && u < 0.62) { var f = (u - 0.2) / 0.42; sp.rot = -TAU * f; sp.lift = Math.sin(f * Math.PI) * 30; sp.pose = 'run'; sp.ph = ph; }
      else if (u >= 0.62) { sp.pose = 'bow'; sp.wag = 2.5; }
    } else {
      // both hop to the beat, one after the other, each on their own side
      tp.pose = sp.pose = 'wiggle'; tp.ph = sp.ph = ph; tp.wag = sp.wag = 3.5;
      tp.lift = Math.abs(Math.sin(t / 240)) * 9; sp.lift = Math.abs(Math.sin(t / 240 + 1.57)) * 9;
    }
    shadow(c, tp.x, 17, 1 - clamp((tp.lift || 0) / 24, 0, 0.6)); shadow(c, sp.x, 17, 1 - clamp((sp.lift || 0) / 36, 0, 0.6));
    var sc = 1.0; pup(c, P, 'tidbit', tp.x, FLOOR, sc, tp); pup(c, P, 'sugarfoot', sp.x, FLOOR, sc, sp);
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
    '.appad .aa-h{ margin:0 0 .6rem !important; font:800 clamp(1.7rem,6vw,2.5rem)/1 "Fraunces",Georgia,serif !important; color:#3B2A55 !important; background:none !important; box-shadow:none !important; border:0 !important; padding:0 !important; letter-spacing:-.01em; }' +
    '.appad .aa-h em{ font-style:normal; color:#E4566E; }' +
    '.appad .aa-p{ margin:.4rem 0 .7rem !important; color:#4B3D63 !important; line-height:1.45; background:none !important; box-shadow:none !important; border:0 !important; padding:0 !important; max-width:none !important; }' +
    '.appad .aa-pick{ display:flex; flex-wrap:wrap; gap:.5rem; margin:0 0 .6rem; }' +
    '.appad .aa-chip{ display:inline-flex; align-items:center; gap:.55rem; min-height:54px; padding:.4rem 1rem .4rem .5rem; border-radius:20px; text-decoration:none !important; color:#24523D !important; background:linear-gradient(160deg,#E6F8EE,#C9EFD9); border:2px solid #8FD3AE; box-shadow:0 4px 0 #8FD3AE; transition:transform .15s, box-shadow .15s; }' +
    '.appad .aa-chip .aa-ic{ flex:none; display:grid; place-items:center; width:2.4rem; height:2.4rem; border-radius:50%; background:#fff; font-size:1.35rem; line-height:1; box-shadow:inset 0 -2px 0 rgba(0,0,0,.08); }' +
    '.appad .aa-chip b{ display:block; font:800 1rem/1.15 "Lora",Georgia,serif; }' +
    '.appad .aa-chip small{ display:block; font:600 .72rem/1.3 "IBM Plex Mono",monospace; letter-spacing:.03em; opacity:.9; }' +
    '.appad .aa-chip.is-win{ color:#1F4468 !important; background:linear-gradient(160deg,#E7F2FD,#CBE3F8); border-color:#8DBDE8; box-shadow:0 4px 0 #8DBDE8; }' +
    '.appad .aa-chip.is-soon{ color:#5B3F73 !important; background:linear-gradient(160deg,#FFF1F6,#F6E3F5); border:2px dashed #C9A4DC; box-shadow:0 4px 0 #E1CCEC; }' +
    '.appad .aa-chip:hover{ transform:translateY(2px) rotate(-1.5deg); box-shadow:0 2px 0 rgba(0,0,0,.12); }' +
    '.appad .aa-chip:hover .aa-ic{ animation:aa-wig .5s ease-in-out; }' +
    '@keyframes aa-wig{ 0%,100%{ transform:rotate(0); } 25%{ transform:rotate(-14deg) scale(1.1); } 75%{ transform:rotate(14deg) scale(1.1); } }' +
    '@media (prefers-reduced-motion: reduce){ .appad .aa-chip:hover .aa-ic{ animation:none; } .appad .aa-chip:hover{ transform:none; } }' +
    '.appad .aa-chip:focus-visible, .appad .aa-go:focus-visible, .appad .aa-x:focus-visible{ outline:3px solid #3B2A55; outline-offset:2px; }' +
    '.appad .aa-go{ display:inline-flex; align-items:center; gap:.45rem; min-height:48px; padding:.55rem 1.3rem; border-radius:999px; background:linear-gradient(180deg,#FF7C93,#E4566E); color:#fff !important; text-decoration:none !important; font:800 1.05rem/1.2 "Lora",Georgia,serif; box-shadow:0 6px 0 #B8384F; transform:translateY(-3px); transition:transform .1s, box-shadow .1s; }' +
    '.appad .aa-go::before{ content:"\\1F43E"; font-size:1.1rem; }' +
    '.appad .aa-go::after{ content:"\\2728"; font-size:.95rem; }' +
    '.appad .aa-go:hover{ transform:translateY(0); box-shadow:0 3px 0 #B8384F; }' +
    '.appad .aa-x{ position:absolute; top:.45rem; right:.5rem; width:44px; height:44px; border-radius:50%; border:0; background:transparent; color:#6B4F8A; font-size:1.3rem; cursor:pointer; }' +
    '@media (max-width:620px){ .appad{ grid-template-columns:1fr; padding:1rem; } .appad .aa-stage{ max-width:260px; margin:0 auto; } }';
  function css() { if (document.getElementById('appad-css')) return; var s = document.createElement('style'); s.id = 'appad-css'; s.textContent = CSS; document.head.appendChild(s); }

  // has this phone installed the app? Remembered once seen: opened as the app, installed from the browser, or reported by Chrome
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  function noteInstalled() { lsSet('tol-app-installed', '1'); }
  if (standalone()) noteInstalled();
  window.addEventListener('appinstalled', function () { noteInstalled(); var h = document.querySelector('[data-app-ad]'); if (h) h.innerHTML = ''; });
  function mount() {
    if (lsGet('tol-appad-off') === '1') return;
    if (standalone() || lsGet('tol-app-installed') === '1') return;
    // Chrome on Android can say whether this site's app is already installed (the manifest lists it as related)
    if (navigator.getInstalledRelatedApps) {
      try { navigator.getInstalledRelatedApps().then(function (apps) { if (apps && apps.length) { noteInstalled(); var h = document.querySelector('[data-app-ad]'); if (h) h.innerHTML = ''; } }).catch(function () {}); } catch (e) {}
    }
    var path = location.pathname.replace(/\/index\.html$/, '/'); if (/install\.html$/.test(path)) return;
    var host = document.querySelector('[data-app-ad]'); if (!host) return;
    css();
    var RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    host.innerHTML =
      '<aside class="appad no-bubble" aria-labelledby="aa-h">' +
        '<span class="aa-stage"><span class="aa-tilt"><canvas width="380" height="240" aria-hidden="true"></canvas></span><span class="aa-say" aria-hidden="true"></span></span>' +
        '<div><p class="aa-k no-bubble">Free app</p>' +
        '<h2 class="aa-h no-bubble" id="aa-h">Get the <em>app!</em></h2>' +
        '<div class="aa-pick" role="group" aria-label="Choose your device">' +
          '<a class="aa-chip" href="/install.html#android"><span class="aa-ic" aria-hidden="true">\u{1F916}</span><span><b>Android</b><small>Install now</small></span></a>' +
          '<a class="aa-chip is-win" href="/install.html#windows"><span class="aa-ic" aria-hidden="true">\u{1FA9F}</span><span><b>Windows</b><small>Install now</small></span></a>' +
          '<a class="aa-chip is-soon" href="/install.html#apple"><span class="aa-ic" aria-hidden="true">\u{1F34E}</span><span><b>iPhone &amp; iPad</b><small>App Store: coming soon</small></span></a>' +
        '</div>' +
        '<a class="aa-go" href="/install.html">Get the app</a></div>' +
        '<button type="button" class="aa-x" aria-label="Hide this for now">&times;</button>' +
      '</aside>';
    var card = host.firstChild, cv = card.querySelector('canvas'), tilt = card.querySelector('.aa-tilt'), say = card.querySelector('.aa-say'), g = cv.getContext('2d');
    card.querySelector('.aa-x').addEventListener('click', function () { lsSet('tol-appad-off', '1'); stopLoop(); host.innerHTML = ''; });
    var raf = 0, vis = true, t0 = performance.now(), lastSay = '';
    function frame(now) {
      raf = 0; if (!vis || document.hidden) return;
      var t = Math.max(0, now - t0), A = drawScene(g, cv.width, cv.height, t);
      // the picture stays straight and bounces a little to the beat
      var bounce = Math.abs(Math.sin(t / 300)) * -4;
      tilt.style.transform = 'translateY(' + bounce.toFixed(1) + 'px)';
      if (A) { var s = A.u < 0.5 ? A.said[0] : A.said[1]; if (s !== lastSay) { lastSay = s; say.textContent = s; } }
      raf = requestAnimationFrame(frame);
    }
    function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    function startLoop() { if (!raf && !RM) raf = requestAnimationFrame(frame); }
    function still() { drawScene(g, cv.width, cv.height, 0, { still: true }); tilt.style.transform = 'none'; say.textContent = 'Get the app!'; }
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
