/* frequency-journey.js — The Frequency Journey: two pals, seven calm worlds, one Perfect Frequency.
   Levels, content and rules live in journey-levels.js (window.TOLJourney). Every level is a different
   kind of challenge (riddles, puzzles, breathing, sorting, a little singing…), and they grow a little
   harder as the pals climb. Progress is kept in this browser only (localStorage 'tol-journey-v1').
   No timers, no way to lose, no fail sounds: a "not yet" just gets a gentle why and another try. */
(function () {
  'use strict';
  var J = window.TOLJourney, root = document.getElementById('fj');
  if (!J || !root) return;
  var WORLDS = J.WORLDS, KEY = 'tol-journey-v1';
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DPR = Math.min(2, window.devicePixelRatio || 1);
  // the two pals, in the order of PAL: Sugarfoot, the leaner one with the collar, and Tidbit, the stocky one with long drop ears and the big smile
  var PAL = ['Sugarfoot', 'Tidbit'];
  var DIRWORD = ['up', 'right', 'down', 'left'];

  function $(s) { return root.querySelector(s); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hash(a, b) { var h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function now() { return performance.now(); }

  /* ------------------------------------------------------------------ saved progress */
  var save = (function () {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    if (!s || typeof s !== 'object') s = {};
    if (!s.done || typeof s.done !== 'object') s.done = {};
    s.sound = s.sound !== false; s.drone = s.drone !== false; s.intro = !!s.intro;
    if (!s.worldIntro || typeof s.worldIntro !== 'object') s.worldIntro = {};
    // version 2: every level became a different kind of challenge. Anything already finished stays finished.
    if (s.v !== 2) { Object.keys(s.done).forEach(function (k) { if (!/^[1-6]-[1-3]$/.test(k)) delete s.done[k]; else s.done[k] = 1; }); s.v = 2; }
    if (!Array.isArray(s.harmony) || s.harmony.length !== 3) s.harmony = null;
    // what this player has already seen, per pool (so every play brings a new set); older saves simply start empty
    if (!s.seen || typeof s.seen !== 'object' || Array.isArray(s.seen)) s.seen = {};
    Object.keys(s.seen).forEach(function (k) {
      if (!Array.isArray(s.seen[k])) { delete s.seen[k]; return; }
      s.seen[k] = s.seen[k].filter(function (x) { return typeof x === 'string'; }).slice(-400);
    });
    return s;
  })();
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode: fine */ } }
  function isDone(w, l) { return save.done[w + '-' + l] != null; }
  function worldDone(w) { var W = WORLDS[w - 1]; if (!W.levels.length) return !!save.skySeen; for (var l = 1; l <= W.levels.length; l++) if (!isDone(w, l)) return false; return true; }
  function worldOpen(w) { return w === 1 || worldDone(w - 1); }
  function levelOpen(w, l) { return worldOpen(w) && (l === 1 || isDone(w, l - 1)); }
  function countDone() { var n = 0; WORLDS.forEach(function (W) { W.levels.forEach(function (_, i) { if (isDone(W.n, i + 1)) n++; }); }); return n; }
  function nextUp() {
    for (var w = 1; w <= 6; w++) for (var l = 1; l <= 3; l++) if (!isDone(w, l)) return [w, l];
    return [7, 1];
  }

  /* ------------------------------------------------------------------ looks, per world */
  var THEME = {
    1: { sky: ['#2A3446', '#3B4B55'], g1: '#6F8A77', g2: '#7D977F', edge: '#3E5548', wall: ['#1F3530', '#2B4A40', '#3C6152'], dark: true, glow: '#FFD99A', orb: '#FFE3AE' },
    2: { sky: ['#EAF4FB', '#D3E8F4'], g1: '#F8FBFE', g2: '#EDF4FA', edge: '#C6DCEB', wall: ['#AFC4D6', '#C9D8E6', '#FFFFFF'], glow: '#6FB4E0', orb: '#CFEBFF' },
    3: { sky: ['#FFF4D4', '#F8E6AE'], g1: '#CFE7A8', g2: '#C2DF98', edge: '#9FC57E', wall: ['#86B874', '#9CCB85', '#B4DB9A'], glow: '#FFE28A', orb: '#FFF2B8' },
    4: { sky: ['#FBE3D3', '#F2C7B8'], g1: '#F0D0AE', g2: '#E8C39E', edge: '#CC9B78', wall: ['#C98B6E', '#DDA285', '#EDBFA2'], glow: '#F7B6C4', orb: '#FFE0E8', chasm: ['#B58FA8', '#6F547E'] },
    5: { sky: ['#EEEAF9', '#DFF1EB'], g1: '#E3F2EA', g2: '#D6EBE2', edge: '#B3D5C6', wall: ['#A993DA', '#C5B4EC', '#E6DDFA'], glow: '#CDB9F0', orb: '#EFE6FF' },
    6: { sky: ['#1B1E3E', '#2F2B5E'], g1: '#3D4380', g2: '#474E90', edge: '#5B63A8', wall: ['#252850', '#34386A', '#4A4F86'], dark: true, glow: '#F8E7AE', orb: '#FFF6D6' },
    7: { sky: ['#FDE6EE', '#DCEAFB'] }
  };
  var NOTE_COL = ['#F4A3B6', '#F6CB7A', '#9ED6AE', '#94C3EE', '#C3A8F0'];
  var PLATE_COL = { p: '#EE8FA6', q: '#7FB6DA', r: '#E6B94A' };
  var SCALE = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2, 3, 10 / 3];

  /* ------------------------------------------------------------------ sound */
  var AC = null, master = null, fxIn = null, droneNodes = null, audioReady = false;
  function audio() {
    if (AC) return AC;
    var C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    try { AC = new C(); } catch (e) { return null; }
    master = AC.createGain(); master.gain.value = 0.9; master.connect(AC.destination);
    // a soft echo, like a little reverb
    var dl = AC.createDelay(2), fb = AC.createGain(), lp = AC.createBiquadFilter(), wet = AC.createGain();
    dl.delayTime.value = 0.31; fb.gain.value = 0.42; lp.type = 'lowpass'; lp.frequency.value = 1900; wet.gain.value = 0.55;
    dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(wet); wet.connect(master);
    var dl2 = AC.createDelay(2), fb2 = AC.createGain(); dl2.delayTime.value = 0.47; fb2.gain.value = 0.3; dl2.connect(fb2); fb2.connect(dl2); fb2.connect(lp);
    fxIn = AC.createGain(); fxIn.connect(master); fxIn.connect(dl); fxIn.connect(dl2);
    return AC;
  }
  function wake() {
    if (!save.sound) return;
    var a = audio(); if (!a) return;
    if (a.state === 'suspended') a.resume();
    if (!audioReady) { audioReady = true; drone(); }
  }
  function tone(f, when, dur, vol, type) {
    if (!save.sound || !AC || !audioReady) return;
    var t = AC.currentTime + (when || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(fxIn); o.start(t); o.stop(t + dur + 0.05);
  }
  function soft(f) { while (f > 700) f /= 2; return f; } // the tone, eased into a gentle register
  function pad(hz, vol) {
    if (!save.sound || !AC || !audioReady) return;
    var f = soft(hz), t = AC.currentTime;
    [[f, 'sine', 1], [f * 1.5, 'sine', 0.35], [f * 2, 'triangle', 0.12], [f / 2, 'sine', 0.5]].forEach(function (p, k) {
      var o = AC.createOscillator(), g = AC.createGain(), v = (vol || 0.07) * p[2];
      o.type = p[1]; o.frequency.value = p[0]; o.detune.value = (k - 1.5) * 3;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.5 + k * 0.08); g.gain.setValueAtTime(v, t + 1.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 4.2);
      o.connect(g); g.connect(fxIn); o.start(t); o.stop(t + 4.4);
    });
  }
  function note(hz, n, vol, when) { var f = soft(hz) * SCALE[clamp(n, 0, SCALE.length - 1)]; if (f < 260) f *= 2; tone(f, when, 1.6, vol || 0.05, 'sine'); tone(f * 2, when, 0.9, (vol || 0.05) * 0.18, 'triangle'); }
  function drone() {
    stopDrone();
    if (!save.sound || !save.drone || !AC || !audioReady || mode === 'map') return;
    var f = soft(WORLDS[G.w - 1].hz) / 2, t = AC.currentTime, out = AC.createGain(), lfo = AC.createOscillator(), lg = AC.createGain();
    out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(0.03, t + 2.5);
    lfo.frequency.value = 0.07; lg.gain.value = 0.012; lfo.connect(lg); lg.connect(out.gain);
    var lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(out); out.connect(master);
    var oscs = [[f, 0.9], [f * 1.004, 0.6], [f * 1.5, 0.25], [f / 2, 0.5]].map(function (p) {
      var o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.value = p[0]; g.gain.value = p[1]; o.connect(g); g.connect(lp); o.start(t); return o;
    });
    lfo.start(t);
    droneNodes = { out: out, oscs: oscs.concat([lfo]) };
  }
  function stopDrone() {
    if (!droneNodes || !AC) return;
    var d = droneNodes, t = AC.currentTime; droneNodes = null;
    try { d.out.gain.cancelScheduledValues(t); d.out.gain.setValueAtTime(d.out.gain.value, t); d.out.gain.exponentialRampToValueAtTime(0.0001, t + 1.2); } catch (e) { }
    setTimeout(function () { d.oscs.forEach(function (o) { try { o.stop(); } catch (e) { } }); }, 1400);
  }

  /* ------------------------------------------------------------------ the two pals (drawn like the garden's pair) */
  var PUPS = [
    { build: 'lean', ear: 'fold', legUp: '#262220', legLow: '#C98A4F', paw: '#D99E62', chest: 'tan', muzzle: 'rottie', collar: true, tail: 'short' },
    { build: 'stocky', ear: 'drop', legUp: '#A45C2E', legLow: '#B97847', paw: '#F1EADF', nails: true, tan: '#C9965F', chest: 'white', muzzle: 'cream', collar: false, tail: 'plume' }
  ];
  function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  function drawPup(c, L, pose, ph, wag, blink, t, tilt) {
    var BLACK = '#252120', TAN = L.tan || '#C4834A', WHITE = '#F4EFE6', PINK = '#EE8FA6';
    var lean = L.build === 'lean', LL = lean ? 15 : 12.5, BRX = lean ? 18.5 : 18, BRY = lean ? 8.8 : 10.2, BY = lean ? -21 : -18.5;
    function leg(x0, y0, ang, len, back) {
      c.save(); c.translate(x0, y0); c.rotate(ang);
      var up = len * 0.5;
      c.fillStyle = L.legUp; rr(c, -2.8, -2, 5.6, up + 3, 2.8); c.fill();
      c.fillStyle = L.legLow; rr(c, -2.5, up, 5, len - up, 2.5); c.fill();
      c.fillStyle = L.paw; c.beginPath(); c.ellipse(1, len, 3.9, 2.5, 0, 0, Math.PI * 2); c.fill();
      if (L.nails) {
        c.strokeStyle = 'rgba(0,0,0,0.16)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(1.2, len - 1.6); c.lineTo(1.2, len + 1.2); c.moveTo(3.2, len - 1.3); c.lineTo(3.2, len + 1.3); c.stroke();
      }
      if (back) { c.fillStyle = 'rgba(10,8,8,0.22)'; c.fillRect(-4, -2, 9, len + 4); }
      c.restore();
    }
    var lie = pose === 'lie', sit = pose === 'sit', moving = pose === 'run';
    var bodyTilt = sit ? -0.42 : 0;
    var tlen = L.tail === 'plume' ? 15 : 10;
    c.save(); c.translate(lie ? -18 : -16, lie ? -9 : sit ? -6 : BY - 2); c.rotate(-0.9 + wag);
    c.strokeStyle = BLACK; c.lineWidth = L.tail === 'plume' ? 5.5 : 4.2; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-6, -tlen * 0.45, -5, -tlen); c.stroke();
    c.strokeStyle = TAN; c.lineWidth = 1.5; c.beginPath(); c.moveTo(1, 1); c.quadraticCurveTo(-4, -tlen * 0.35, -3.6, -tlen * 0.75); c.stroke(); c.lineCap = 'butt';
    c.restore();
    var a = Math.sin(ph) * 0.7, b = Math.sin(ph + Math.PI) * 0.7;
    if (moving) { leg(-10, BY + 5, b * 0.8, LL, true); leg(10, BY + 5, a * 0.8, LL, true); }
    else if (sit) leg(9, -16, 0.05, LL + 2, true);
    else if (!lie) { leg(-10, BY + 5, 0.1, LL, true); leg(10, BY + 5, -0.1, LL, true); }
    c.save(); c.rotate(bodyTilt);
    if (lie) {
      c.fillStyle = BLACK; c.beginPath(); c.ellipse(-2, -9, 19, 8.5, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = L.legLow; c.beginPath(); c.ellipse(-12, -4, 7, 4, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = L.legLow; c.beginPath(); c.ellipse(18, -2.5, 8, 2.8, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = L.paw; c.beginPath(); c.ellipse(26, -2.5, 3.8, 2.7, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(23, -0.3, 3.8, 2.5, 0, 0, Math.PI * 2); c.fill();
      if (L.chest === 'white') { c.fillStyle = '#F2ECE3'; c.beginPath(); c.ellipse(12.5, -7, 1.4, 2.6, 0, 0, Math.PI * 2); c.fill(); }
      else { c.fillStyle = TAN; c.beginPath(); c.ellipse(12, -7, 3.6, 3.4, 0, 0, Math.PI * 2); c.fill(); }
    } else {
      c.fillStyle = BLACK; c.beginPath(); c.ellipse(0, BY, BRX, BRY, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(12, BY - 5, 7, 8, -0.5, 0, Math.PI * 2); c.fill();
      if (L.chest === 'white') {
        c.fillStyle = TAN; c.beginPath(); c.ellipse(16, BY - 4, 4, 6.5, -0.45, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#F2ECE3'; c.beginPath(); c.ellipse(15.6, BY + 1.5, 1.5, 3.4, -0.3, 0, Math.PI * 2); c.fill();
        c.fillStyle = TAN; c.beginPath(); c.ellipse(12, BY + 7.5, 4.5, 2.2, 0, 0, Math.PI * 2); c.fill();
      } else {
        c.fillStyle = TAN; c.beginPath(); c.ellipse(14, BY + 0.5, 4.2, 3.4, -0.3, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(15, BY + 5.5, 3.6, 2.8, -0.2, 0, Math.PI * 2); c.fill();
        c.fillStyle = WHITE; c.beginPath(); c.arc(15.8, BY + 3, 1.1, 0, Math.PI * 2); c.fill();
      }
      if (L.collar) {
        c.strokeStyle = '#141111'; c.lineWidth = 2.8; c.beginPath(); c.moveTo(9, BY - 11); c.quadraticCurveTo(14, BY - 3, 18, BY - 5); c.stroke();
        c.fillStyle = '#D5D9E0'; c.fillRect(13.6, BY - 7.4, 2.8, 2.4); c.fillStyle = '#141111'; c.fillRect(14.4, BY - 6.8, 1.2, 1.2);
      }
    }
    c.restore();
    if (moving) { leg(-12, BY + 4, a, LL); leg(12, BY + 4, b, LL); }
    else if (sit) {
      leg(12, -17, -0.05, LL + 3);
      c.fillStyle = BLACK; c.beginPath(); c.ellipse(-9, -6, 8.5, 5.5, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = L.legLow; c.beginPath(); c.ellipse(-4, -2.5, 5, 2.5, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = L.paw; c.beginPath(); c.ellipse(-0.5, -1, 4, 2.4, 0, 0, Math.PI * 2); c.fill();
    } else if (!lie) { leg(-12, BY + 4, -0.05, LL); leg(12, BY + 4, 0.05, LL); }
    // head
    var hx = lie ? 19 : sit ? 18 : 21, hy = lie ? -19 : sit ? -38 : BY - 12;
    c.save(); c.translate(hx, hy); c.rotate((moving ? Math.sin(ph) * 0.05 : lie ? 0.05 : 0) + (tilt || 0));
    var R = 11;
    if (L.ear === 'drop') { c.fillStyle = '#1B1817'; c.beginPath(); c.ellipse(-4, 2, 4, 6.5, 0.35, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = BLACK; c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(8, 2.5, 8.5, 6.2, 0.08, 0, Math.PI * 2); c.fill();
    if (L.muzzle === 'cream') {
      c.fillStyle = TAN; c.beginPath(); c.ellipse(5, 2.6, 9.4, 7.8, 0.12, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(10.8, 2.6, 6.6, 3.9, 0.06, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(7.5, 8.6, 7, 3.2, 0.12, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(2.5, 9.5, 4.5, 3.5, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = BLACK; c.beginPath(); c.ellipse(4.3, -1.8, 3, 2.5, -0.1, 0, Math.PI * 2); c.fill();
      c.fillStyle = TAN; c.beginPath(); c.ellipse(3.4, -5.9, 3.6, 2.1, -0.25, 0, Math.PI * 2); c.fill();
    } else {
      c.fillStyle = TAN; c.beginPath(); c.ellipse(8.5, 4.5, 8, 4.8, 0.1, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(4, 2.5, 3.8, 3.6, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = BLACK; c.beginPath(); c.ellipse(10, 0.6, 7.5, 2.4, 0.08, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(210,200,186,0.85)'; c.beginPath(); c.ellipse(8.5, 8.4, 3.2, 1.5, 0.15, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#D69B5F'; c.beginPath(); c.arc(3.4, -5.6, 2.5, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = '#121010'; c.beginPath(); c.ellipse(16, 1.4, 2.9, 2.3, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.arc(15.3, 0.6, 0.8, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3A1E22'; c.beginPath(); c.moveTo(15, 4.6); c.quadraticCurveTo(11, 10.5, 6, 6); c.quadraticCurveTo(11, 7.6, 15, 4.6); c.fill();
    var pant = REDUCED ? 0 : Math.sin(t / (moving ? 120 : 260)) * 0.8;
    c.fillStyle = PINK; c.beginPath(); c.ellipse(10.5, 8.6 + pant, 2.5, 3.2 + pant * 0.6, 0.2, 0, Math.PI * 2); c.fill();
    if (blink) { c.strokeStyle = '#121010'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(2.2, -1.6); c.lineTo(6.2, -1.6); c.stroke(); }
    else { c.fillStyle = '#3A2418'; c.beginPath(); c.arc(4.2, -1.6, 2.1, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(4.9, -2.4, 0.75, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = 'rgba(247,165,185,0.5)'; c.beginPath(); c.ellipse(7, 4.5, 2.2, 1.2, 0, 0, Math.PI * 2); c.fill();
    var flap = moving && !REDUCED ? Math.sin(ph * 1.1) * 0.35 : 0;
    if (L.ear === 'drop') {
      c.save(); c.translate(-3, -6.5); c.rotate(0.35 + flap);
      c.fillStyle = BLACK; c.beginPath(); c.ellipse(-1.5, 5.5, 4.8, 7.2, 0.15, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(214,160,150,0.5)'; c.beginPath(); c.ellipse(0.2, 1.8, 1.6, 3.2, 0.15, 0, Math.PI * 2); c.fill();
      c.restore();
    } else {
      c.save(); c.translate(-1.5, -8.5); c.rotate(0.35 + flap * 0.4);
      c.fillStyle = BLACK; c.beginPath(); c.moveTo(-4, -1); c.quadraticCurveTo(1, -6, 6, 0); c.quadraticCurveTo(2, 4, -3, 3); c.closePath(); c.fill();
      c.strokeStyle = '#B97A43'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(-3, 2.6); c.quadraticCurveTo(2, 3.6, 5.6, 0.4); c.stroke();
      c.restore();
    }
    c.restore();
  }
  function heart(c, x, y, s, col, alpha) {
    c.save(); c.globalAlpha = alpha == null ? 1 : alpha; c.translate(x, y); c.scale(s, s); c.fillStyle = col || '#EE8FA6';
    c.beginPath(); c.moveTo(0, 3.5); c.bezierCurveTo(-6, -1, -3.5, -6.5, 0, -2.6); c.bezierCurveTo(3.5, -6.5, 6, -1, 0, 3.5); c.fill(); c.restore();
  }
  function star(c, x, y, r, col, rot) {
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.fillStyle = col; c.beginPath();
    for (var k = 0; k < 10; k++) { var rad = k % 2 ? r * 0.45 : r, a = -Math.PI / 2 + k * Math.PI / 5; c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); }
    c.closePath(); c.fill(); c.restore();
  }

  /* ------------------------------------------------------------------ DOM */
  var cv = $('.fj-canvas'), ctx = cv.getContext('2d');
  var stage = $('.fj-stage'), statusEl = $('.fj-status'), movesEl = $('.fj-moves'), liveEl = $('.fj-live');
  var mapEl = $('.fj-map'), playEl = $('.fj-play'), cardEl = $('.fj-card'), panel = $('.fj-panel');
  var titleK = $('.fj-k'), titleH = $('.fj-title'), titleSub = $('.fj-sub');
  var btnMap = $('.fj-mapbtn'), btnSnd = $('.fj-snd'), btnDrone = $('.fj-drone');
  var btnTog = $('.fj-together'), btnSpecial = $('.fj-special'), btnHint = $('.fj-hint');
  var controls = $('.fj-controls'), skybar = $('.fj-skybar'), breathEl = $('.fj-breath');
  var chalEl = $('.fj-chal'), callsEl = $('.fj-calls'), sideEl = $('.fj-side'), myStarsEl = $('.fj-mystars');
  var bg = document.createElement('canvas'), bctx = bg.getContext('2d');
  var fog = document.createElement('canvas'), fctx = fog.getContext('2d');
  var mode = 'map', raf = 0;

  /* ------------------------------------------------------------------ game state */
  var G = { w: 1, l: 1, L: null, S: null, view: null, hist: [], sel: 0, together: false, moves: 0, won: false, T: 40,
    pv: null, block: null, viewAt: 0, lit: null, mem: null, visited: null, revealed: null, lookUntil: 0, lookReadyAt: 0,
    hint: null, glow: {}, lifts: {}, murkFade: 0, parts: [], toldApart: false, tipShown: false, fx: [] };

  function palView(i, face) { return { i: i, path: null, t0: 0, seg: 150, face: face, blinkAt: now() + 1500 + Math.random() * 3000, bounce: null, happy: 0, bump: null }; }

  // the level being played right now: a fresh set drawn for this play (journey-levels.js drawLevel)
  function curLevel() {
    if (G.lv && G.lv.id === G.w + '-' + G.l) return G.lv;
    var W = WORLDS[G.w - 1]; return W && W.levels[G.l - 1];
  }
  // keepSet: "Restart" and "Start again" keep the same set; everything else (a new visit, Next, Play again) draws a new one
  function startLevel(w, l, keepHist, keepSet) {
    var W = WORLDS[w - 1], base = W.levels[l - 1];
    if (!base) return;
    if (!(keepSet && G.lv && G.lv.id === w + '-' + l)) {
      var drawn = null;
      try { drawn = J.drawLevel ? J.drawLevel(w, l, save.seen, { again: isDone(w, l) }) : null; } catch (e) { drawn = null; }
      G.lv = drawn || base; if (!G.lv.id) G.lv = Object.assign({}, base, { id: w + '-' + l, set: [], pillars: [] });
    }
    var lv = G.lv;
    clearTimers(); C = null; G.maze = false; G.won = false;
    G.w = w; G.l = l;
    save.last = w + '-' + l; persist();
    root.setAttribute('data-world', w);
    titleK.textContent = 'World ' + w + ' · ' + W.hz + ' Hz · ' + W.theme;
    titleH.textContent = W.name;
    titleSub.innerHTML = 'Level ' + l + ' of ' + W.levels.length + ' · ' + esc(lv.kind) + ' ' + leaves(lv.d) + (isDone(w, l) ? ' <span class="fj-again">· finished before</span>' : '');
    if (lv.type === 'walk' || lv.type === 'maze') startGrid(w, l, keepHist); else startChal(w, l);
    drone();
    bringIntoView();
    if (!save.worldIntro[w] && l === 1) showWorldIntro(w);
  }
  // the grid levels: walking the pals (and "Calls in the dark", which plans a walk)
  function startGrid(w, l, keepHist) {
    var lv = G.lv;
    G.maze = lv.type === 'maze';
    G.L = G.maze ? J.mazeParse(lv) : J.parse(lv, w); G.S = J.init(G.L); G.view = J.clone(G.S);
    if (!keepHist) G.hist = [];
    G.sel = G.maze ? 1 : 0; G.together = false; G.moves = 0; G.won = false; G.block = null; G.hint = null; G.glow = {}; G.lifts = {}; G.murkFade = 0; G.parts = [];
    G.pv = [palView(G.L.a, 1), palView(G.L.b, 1)];
    var n = G.L.W * G.L.H; G.lit = new Float32Array(n); G.mem = new Uint8Array(n); G.visited = {}; G.revealed = {};
    // from the lookout, the calling pal sees everything as it really is
    if (G.maze) G.L.g.forEach(function (c, i) { if (c === 'x' || c === 'h') G.revealed[i] = true; });
    G.visited[G.L.a] = now() - 2000; G.visited[G.L.b] = now() - 2000;
    G.lookUntil = 0; G.lookReadyAt = 0; G.toldApart = false;
    setMode('play');
    // a level's own button, if it has singing crystals or illusions
    var hasLook = !G.maze && G.L.g.some(function (c) { return c === 'x' || c === 'h'; });
    btnSpecial.hidden = !(G.L.melody.length || hasLook);
    if (G.L.melody.length) btnSpecial.innerHTML = icon('listen') + 'Listen to the melody';
    else if (hasLook) btnSpecial.innerHTML = icon('eye') + 'Look closely';
    btnSpecial.disabled = false;
    updateTogether();
    if (G.maze) mazeUI();
    resize(); paintStatic(); updateMoves(); describe();
    say(lv.tip || lv.ask);
    if (G.L.melody.length) setTimeout(playMelody, 900);
  }
  function bringIntoView() {
    var r = root.getBoundingClientRect();
    if (r.top < 40 || r.top > window.innerHeight * 0.4) {
      var y = window.pageYOffset + r.top - (window.innerWidth < 760 ? 64 : 80);
      try { window.scrollTo({ top: Math.max(0, y), behavior: REDUCED ? 'auto' : 'smooth' }); } catch (e) { window.scrollTo(0, Math.max(0, y)); }
    }
  }
  function snapshot() { return { S: J.clone(G.S), moves: G.moves, sel: G.sel, revealed: Object.assign({}, G.revealed), visited: Object.assign({}, G.visited) }; }

  /* ------------------------------------------------------------------ moving */
  var SEG = REDUCED ? 60 : 150, SLIDE = REDUCED ? 40 : 85;
  function animating() { var t = now(); return G.pv && (G.pv.some(function (p) { return p.path && t < p.t0 + p.seg * (p.path.length - 1); }) || (G.block && t < G.block.t1)); }
  function finishAnims() { G.pv.forEach(function (p) { p.path = null; }); G.block = null; G.view = J.clone(G.S); G.viewAt = 0; paintStatic(); }

  function move(d, whoOverride) {
    if (mode !== 'play' || G.won || G.maze || !cardEl.hidden) return;
    wake();
    if (animating()) finishAnims();
    var who = whoOverride != null ? whoOverride : (G.together ? 2 : G.sel);
    var before = snapshot();
    var r = J.step(G.L, G.S, who, d), t = now(), longest = 0;
    G.hint = null;
    r.ev.forEach(function (e) {
      if (e.t === 'bounce') { var p = G.pv[e.who]; p.bounce = { t0: t, d: d }; G.revealed[e.i] = true; }
      if (e.t === 'bump' && !REDUCED) { G.pv[e.who].bump = { t0: t, d: d }; }
    });
    if (!r.moved) { narrate(r.ev, false); if (r.ev.some(function (e) { return e.t === 'bounce'; })) { paintStatic(); tone(soft(WORLDS[G.w - 1].hz) * 1.5, 0, 0.5, 0.03); } return; }
    G.hist.push(before); if (G.hist.length > 400) G.hist.shift();
    G.moves++;
    [0, 1].forEach(function (w) {
      var path = r.paths[w]; if (!path) return;
      var p = G.pv[w], slide = path.length > 2;
      p.path = path; p.t0 = t; p.seg = slide ? SLIDE : SEG; p.i = path[path.length - 1];
      var dx = DIRS(d)[0]; if (dx) p.face = dx;
      longest = Math.max(longest, p.seg * (path.length - 1));
      path.forEach(function (i, k) { if (G.visited[i] == null) G.visited[i] = t + p.seg * k; });
    });
    r.ev.forEach(function (e) {
      if (e.t === 'push' || e.t === 'melt') { G.block = { from: e.from, to: e.i, t0: t, t1: t + SEG, melt: e.t === 'melt' }; }
      if (e.t === 'hidden') G.revealed[e.i] = true;
    });
    G.S = r.s; G.viewAt = t + longest;
    // effects that land when the pals arrive
    var delay = Math.max(0, longest - 40);
    setTimeout(function () { effects(r.ev); }, delay);
    narrate(r.ev, true);
    stepSound(r.ev);
    updateMoves();
    if (J.won(G.L, G.S)) { G.won = true; setTimeout(winLevel, longest + (REDUCED ? 150 : 420)); }
  }
  function DIRS(d) { return J.DIRS[d]; }

  function effects(ev) {
    var t = now(), L = G.L, hz = WORLDS[G.w - 1].hz;
    ev.forEach(function (e) {
      var c = cellCenter(e.i != null ? e.i : 0);
      if (e.t === 'lift') { G.lifts[e.i] = t; burst(c[0], c[1], 14, ['#F7C9D4', '#FFE3AE', '#D9C8F0'], 'petal'); pad(hz, 0.035); }
      if (e.t === 'frag') { burst(c[0], c[1], 12, ['#FFE28A', '#FFF6D0', '#F6C24A'], 'spark'); note(hz, 2 + (popcount(G.S.fm) % 5), 0.05); if (e.all) setTimeout(function () { pad(hz, 0.04); }, 250); }
      if (e.t === 'melt') { var m = cellCenter(e.i); burst(m[0], m[1], 12, ['#D8F0FF', '#9FD0EE', '#FFFFFF'], 'drop'); tone(soft(hz) * 0.75, 0, 0.9, 0.04); tone(soft(hz) * 1.125, 0.08, 0.9, 0.03); }
      if (e.t === 'note') { G.glow[e.i] = t; note(hz, e.n - 1, 0.07); burst(c[0], c[1] - G.T * 0.3, 5, [NOTE_COL[e.n - 1]], 'note'); }
      if (e.t === 'clear') { G.murkFade = t + 200; setTimeout(function () { [0, 1, 2, 3, 4].forEach(function (k) { note(hz, k, 0.04, k * 0.12); }); }, 300); }
      if (e.t === 'hidden') { burst(c[0], c[1], 8, ['#F8E7AE', '#FFFFFF'], 'spark'); }
    });
    G.view = J.clone(G.S); paintStatic(); describe();
  }
  function popcount(x) { var n = 0; while (x) { n += x & 1; x >>= 1; } return n; }
  function stepSound(ev) {
    if (ev.some(function (e) { return e.t === 'note' || e.t === 'frag' || e.t === 'melt'; })) return;
    var hz = WORLDS[G.w - 1].hz;
    tone(soft(hz) * SCALE[(G.moves * 2) % 5] * (G.w === 6 ? 2 : 1), 0, 0.35, 0.018, 'sine');
  }

  function narrate(ev, moved) {
    var msg = '', L = G.L, W = WORLDS[G.w - 1];
    ev.forEach(function (e) {
      if (e.t === 'lift') msg = 'Together, the shadow lifts.';
      else if (e.t === 'melt') msg = 'The ice block melts into a little stepping-stone crossing.';
      else if (e.t === 'push' && !msg) msg = '';
      else if (e.t === 'frag') {
        var got = popcount(G.S.fm), all = L.frags.length;
        msg = e.all ? 'All the light is gathered. The tone is open.' : 'A light fragment! ' + got + ' of ' + all + '.';
      }
      else if (e.t === 'note') {
        if (e.free) msg = 'The crystal hums softly.';
        else if (e.ok && G.S.mc) msg = '';
        else if (e.ok) msg = '♪ ' + e.pr + ' of ' + L.melody.length + '. Lovely.';
        else msg = 'That crystal sings a different note. The tune simply starts again' + (e.pr ? ' from here.' : '.');
      }
      else if (e.t === 'clear') msg = 'The melody rings out and the grey murk clears.';
      else if (e.t === 'hidden') msg = 'Hidden ground! It was there all along.';
      else if (e.t === 'bounce') msg = 'That star was an illusion. The pal hops gently back.';
      else if (e.t === 'bump' && !moved && !msg) {
        msg = e.why === 'thorn' ? 'A thorny shadow. Stand beside it together, both at once, and it lifts.'
          : e.why === 'water' ? 'Cold water. Push an ice block in to make a crossing.'
          : e.why === 'murk' ? 'Grey murk. Sing the melody on the crystals to clear it.'
          : e.why === 'bridge' ? 'The bridge piece rests low. A pal on the matching plate will raise it.'
          : e.why === 'block' ? 'The ice block won’t budge that way.'
          : e.why === 'gap' ? (G.w === 6 ? 'Nothing there but sky. Look closely for the real stars.' : 'Too far to jump. There’s another way.')
          : '';
      }
    });
    if (moved && !msg && G.w === 1 && !G.toldApart && J.cheb(L, G.S.a, G.S.b) > 2) { G.toldApart = true; msg = 'The lantern light is smaller when the pals are apart. Stay close and more of the path stays lit.'; }
    var onA = L.goal.indexOf(G.S.a) >= 0, onB = L.goal.indexOf(G.S.b) >= 0;
    if (moved && !msg && onA !== onB && J.allFrags(L, G.S)) msg = 'One pal is at the tone, waiting for the other.';
    if (moved && !msg && L.frags.length && !J.allFrags(L, G.S) && (L.goal.indexOf(G.S.a) >= 0 || L.goal.indexOf(G.S.b) >= 0)) msg = 'The tone is waiting for the rest of the light.';
    if (msg) say(msg);
  }
  function say(m) { statusEl.textContent = m; }

  function undo() {
    wake();
    if (!G.hist.length || !cardEl.hidden) { if (!G.hist.length) say('Nothing to undo yet. You’re at the start.'); return; }
    var h = G.hist.pop(); G.S = h.S; G.moves = h.moves; G.sel = h.sel; G.revealed = h.revealed; G.visited = h.visited; G.won = false;
    G.pv[0].i = G.S.a; G.pv[1].i = G.S.b; G.pv.forEach(function (p) { p.path = null; p.bounce = null; });
    G.block = null; G.view = J.clone(G.S); G.hint = null; G.murkFade = G.S.mc ? G.murkFade : 0;
    paintStatic(); updateMoves(); describe(); say('One step back.');
  }
  function restart() {
    wake();
    if (!cardEl.hidden) return;
    if (G.moves) G.hist.push(snapshot());
    var keep = G.hist; startLevel(G.w, G.l, true, true); G.hist = keep;
    say('A fresh start. (Undo brings back where you were.)');
  }
  function switchPal(to) {
    wake();
    if (G.together) { G.together = false; updateTogether(); }
    G.sel = to != null ? to : 1 - G.sel;
    G.pv[G.sel].happy = now(); updateTogether();
    say('Now guiding ' + PAL[G.sel] + '.');
  }
  function updateTogether() {
    btnTog.setAttribute('aria-pressed', G.together ? 'true' : 'false');
    // the switch buttons name who you'd switch to
    var sw = $('.fj-switch'), other = PAL[1 - G.sel];
    if (sw.lastChild && sw.lastChild.nodeType === 3) sw.lastChild.nodeValue = other; else sw.appendChild(document.createTextNode(other));
    sw.setAttribute('aria-label', 'Switch to ' + other); $('.fj-switch2').setAttribute('aria-label', 'Switch to ' + other);
  }
  function updateMoves() {
    if (G.maze) return;
    movesEl.textContent = G.moves ? G.moves + (G.moves === 1 ? ' step' : ' steps') : '';
  }

  /* ------------------------------------------------------------------ hints (a quick search from where you are) */
  function hint() {
    wake();
    if (mode !== 'play' || G.won) return;
    if (G.maze) { mazeHint(); return; }
    if (animating()) finishAnims();
    say('Having a little think…');
    setTimeout(function () {
      var sol = J.solve(G.L, G.S, 160000);
      if (sol === null) sol = nearHint();
      if (!sol || !sol.length) { say(sol === null ? 'Take your time. Try the nearest thing that glows first, and keep the pals close.' : 'Hmm, this spot is a bit stuck. Undo a few steps, or restart. Nothing is lost.'); return; }
      var m = sol[0]; G.hint = { who: m[0], d: m[1], t0: now() };
      if (m[0] !== 2) { if (G.together) { G.together = false; updateTogether(); } G.sel = m[0]; }
      else { G.together = true; updateTogether(); }
      say('Try moving ' + (m[0] === 2 ? 'both pals together' : PAL[m[0]]) + ' ' + DIRWORD[m[1]] + '.' + (sol.length > 1 ? ' (About ' + sol.length + ' steps to go.)' : ''));
    }, 30);
  }

  // when the whole puzzle is too big to think through quickly: one pal, toward the nearest light or the tone
  function nearHint() {
    var L = G.L, S0 = G.S, seen = {}, q = [[S0, null]], head = 0, got0 = popcount(S0.fm);
    seen[J.key(S0)] = 1;
    while (head < q.length && head < 40000) {
      var cur = q[head++];
      for (var w = 0; w < 2; w++) for (var d = 0; d < 4; d++) {
        var r = J.step(L, cur[0], w, d); if (!r.moved) continue;
        var k = J.key(r.s); if (seen[k]) continue; seen[k] = 1;
        var first = cur[1] || [w, d], p = w ? r.s.b : r.s.a;
        if (popcount(r.s.fm) > got0 || (J.allFrags(L, r.s) && L.goal.indexOf(p) >= 0)) return [first];
        q.push([r.s, first]);
      }
    }
    return null;
  }

  /* ------------------------------------------------------------------ world buttons */
  function playMelody() {
    if (mode !== 'play' || !G.L || !G.L.melody.length) return;
    wake();
    var hz = WORLDS[G.w - 1].hz, t = now();
    G.L.melody.forEach(function (n, k) {
      note(hz, n - 1, 0.07, k * 0.6);
      var cells = []; G.L.g.forEach(function (c, i) { if (c === String(n)) cells.push(i); });
      cells.forEach(function (i) { G.glow[i] = t + k * 600; });
    });
    say('Listen: ' + G.L.melody.map(function (n) { return ['rose', 'amber', 'green', 'blue', 'violet'][n - 1]; }).join(', then ') + '.');
  }
  function lookClosely() {
    wake();
    var t = now();
    if (t < G.lookReadyAt) return;
    G.lookUntil = t + 2800; G.lookReadyAt = t + 4300;
    btnSpecial.disabled = true;
    tone(soft(852) * 2, 0, 1.4, 0.03); tone(soft(852) * 3, 0.15, 1.2, 0.02);
    say('Looking closely… real stars glow; illusions fade.');
    setTimeout(function () { btnSpecial.disabled = false; }, 4300);
  }

  /* ------------------------------------------------------------------ the celebration */
  function winLevel() {
    var W = WORLDS[G.w - 1], lv = curLevel(), id = G.w + '-' + G.l, grid = lv.type === 'walk' || lv.type === 'maze';
    save.done[id] = lv.type === 'walk' ? G.moves : 1; persist();
    if (grid) {
      var t = now(); G.pv.forEach(function (p) { p.happy = t; });
      var o = orbCenter(); burst(o[0], o[1], REDUCED ? 8 : 26, ['#FFE3AE', '#F7C9D4', '#D9C8F0', '#C7EBD6', '#FFFFFF'], 'spark');
    }
    pad(W.hz, 0.075);
    if (window.TOLRewards && typeof window.TOLRewards.earn === 'function') {
      try { window.TOLRewards.earn(8, 'journey', 'World ' + G.w + ' · level ' + G.l); } catch (e) { }
    }
    var last = G.l === W.levels.length, min = lv.min, nc = G.calls ? G.calls.length : 0;
    var steps = lv.type === 'walk' ? G.moves + ' steps' + (min ? (G.moves <= min ? ' · a beautifully neat path' : ' · the neatest path is ' + min) : '')
      : lv.type === 'maze' ? nc + (nc === 1 ? ' call' : ' calls') + (nc <= lv.minCalls ? ' · beautifully clear' : ' · it can be done in ' + lv.minCalls) : '';
    var wl = G.w, ll = G.l;
    setTimeout(function () {
      showCard({
        k: 'World ' + wl + ' · ' + W.hz + ' Hz · Level ' + ll,
        h: lv.done || 'You arrived together',
        meta: lv,
        lesson: lv.lesson,
        p: lv.why,
        steps: steps,
        more: lv.more,
        pillars: lv.pillars,
        btns: last ? [['World complete →', function () { worldCard(wl); }, true], ['Play again: a new set', function () { hideCard(); startLevel(wl, ll); }]]
          : [['Next level →', function () { hideCard(); startLevel(wl, ll + 1); }, true], ['Journey map', function () { hideCard(); showMap(wl); }], ['Play again: a new set', function () { hideCard(); startLevel(wl, ll); }]]
      });
    }, grid ? (REDUCED ? 300 : 1100) : 0);
  }
  function worldCard(w) {
    var W = WORLDS[w - 1], nx = WORLDS[w];
    pad(W.hz, 0.06);
    showCard({
      k: 'World ' + w + ' complete · ' + W.hz + ' Hz',
      h: W.name,
      lesson: W.summary,
      p: nx ? 'Next: ' + nx.name + ', at ' + nx.hz + ' Hz. ' + (nx.n === 7 ? 'The very top.' : '') : '',
      btns: [[nx ? (nx.n === 7 ? 'Up into the sky →' : 'Onward to World ' + nx.n + ' →') : 'Journey map', function () { hideCard(); if (nx) { if (nx.n === 7) startSky(); else startLevel(nx.n, 1); } else showMap(); }, true],
        ['Journey map', function () { hideCard(); showMap(w + 1 <= 7 ? w + 1 : w); }]]
    });
  }
  function showWorldIntro(w) {
    var W = WORLDS[w - 1];
    save.worldIntro[w] = 1; persist();
    showCard({ k: 'World ' + w + ' · ' + W.hz + ' Hz', h: W.name, lesson: W.theme, p: W.intro,
      btns: [['Begin', function () { hideCard(); }, true]] });
  }
  var cardReturn = null;
  function showCard(o) {
    cardReturn = document.activeElement;
    cardEl.querySelector('.fj-card-k').textContent = o.k || '';
    cardEl.querySelector('h2').textContent = o.h || '';
    var me = cardEl.querySelector('.fj-card-meta'); me.innerHTML = o.meta ? esc(o.meta.kind) + ' ' + leaves(o.meta.d) : ''; me.hidden = !o.meta;
    var le = cardEl.querySelector('.fj-card-lesson'); le.textContent = o.lesson || ''; le.hidden = !o.lesson;
    var pe = cardEl.querySelector('.fj-card-p'); pe.textContent = o.p || ''; pe.hidden = !o.p;
    var se = cardEl.querySelector('.fj-card-steps'); se.textContent = o.steps || ''; se.hidden = !o.steps;
    var mo = cardEl.querySelector('.fj-card-more'), ma = mo.querySelector('a');
    if (o.more) { ma.href = o.more[0]; ma.textContent = 'Read more: ' + o.more[1] + ' →'; }
    mo.hidden = !o.more;
    // which of the Five Pillars this set practised, in plain words, with a link to where they're explained
    var pe2 = cardEl.querySelector('.fj-card-pillars');
    if (!pe2) { pe2 = el('p', 'fj-card-pillars'); mo.parentNode.insertBefore(pe2, mo); }
    var PP = window.TOLJourneyPools, ps = (o.pillars || []).filter(function (n) { return PP && PP.pillars && PP.pillars[n]; });
    pe2.innerHTML = '';
    if (ps.length) {
      var pa = el('a'); pa.href = PP.pillarPage + (ps.length === 1 && PP.pillars[ps[0]].id ? '#' + PP.pillars[ps[0]].id : ''); pa.textContent = ps.length === 1 ? 'Five Pillars' : 'the Five Pillars';
      pe2.appendChild(document.createTextNode(ps.length === 1 ? 'This is Pillar ' + PP.pillars[ps[0]].roman + ', ' + PP.pillars[ps[0]].name + ', one of the ' : 'This set practised '));
      if (ps.length === 1) { pe2.appendChild(pa); pe2.appendChild(document.createTextNode('.')); }
      else {
        pe2.appendChild(document.createTextNode(ps.map(function (n) { return PP.pillars[n].roman + ' ' + PP.pillars[n].name; }).join(' · ') + ', from '));
        pe2.appendChild(pa); pe2.appendChild(document.createTextNode('.'));
      }
    }
    pe2.hidden = !ps.length;
    var bx = cardEl.querySelector('.fj-card-btns'); bx.innerHTML = '';
    (o.btns || []).forEach(function (b) { var x = el('button', b[2] ? 'fj-go' : ''); x.type = 'button'; x.textContent = b[0]; x.addEventListener('click', b[1]); bx.appendChild(x); });
    cardEl.hidden = false;
    var first = bx.querySelector('button'); if (first) setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); } }, 60);
  }
  function hideCard() { cardEl.hidden = true; if (cardReturn && cardReturn.focus && document.contains(cardReturn) && !cardReturn.closest('.fj-card')) { try { cardReturn.focus({ preventScroll: true }); } catch (e) { } } }

  function levelMin(w, l) { var lv = G.lv && G.lv.id === w + '-' + l ? G.lv : WORLDS[w - 1].levels[l - 1]; return lv && lv.min; }

  /* ------------------------------------------------------------------ layout */
  function resize() {
    if (mode === 'map') return;
    var sw = stage.clientWidth || 320, vh = window.innerHeight || 700;
    if (mode === 'chal') {
      var cw = Math.min(sw, 640), chh = C && C.type === 'breath' ? clamp(Math.round(cw * 0.5), 180, 250) : clamp(Math.round(cw * 0.3), 116, 156);
      setCanvas(cw, chh); G.T = chh * 0.4;
      return;
    }
    var maxH = clamp(vh * (window.innerWidth >= 760 ? 0.68 : 0.56), 250, 620);
    if (mode === 'sky') {
      var w = Math.min(sw, 620), h = clamp(Math.round(w * 1.05), 260, Math.max(300, vh * (window.innerWidth >= 760 ? 0.56 : 0.62)));
      setCanvas(w, Math.min(h, w * 1.25));
      return;
    }
    var L = G.L, T = Math.floor(Math.min(sw / L.W, maxH / L.H, 72));
    G.T = Math.max(26, T);
    setCanvas(L.W * G.T, L.H * G.T);
  }
  function setCanvas(w, h) {
    w = Math.round(w); h = Math.round(h);
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    if (cv.width !== Math.round(w * DPR) || cv.height !== Math.round(h * DPR)) { cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR); }
    cv._w = w; cv._h = h;
  }
  function cellXY(i) { return [(i % G.L.W) * G.T, (i / G.L.W | 0) * G.T]; }
  function cellCenter(i) { var p = cellXY(i); return [p[0] + G.T / 2, p[1] + G.T / 2]; }
  function orbCenter() { var a = cellCenter(G.L.goal[0]), b = cellCenter(G.L.goal[1]); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }

  /* ------------------------------------------------------------------ painting the board (the still parts) */
  var grain = null;
  function paper() {
    if (grain) return grain;
    var g = document.createElement('canvas'); g.width = g.height = 96; var c = g.getContext('2d'), d = c.createImageData(96, 96);
    for (var k = 0; k < d.data.length; k += 4) { var v = 150 + Math.random() * 105 | 0; d.data[k] = d.data[k + 1] = d.data[k + 2] = v; d.data[k + 3] = 255; }
    c.putImageData(d, 0, 0); grain = g; return g;
  }
  function blob(c, x, y, r, col, a) { c.globalAlpha = a; c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
  function kindAt(i) {
    var c = G.L.g[i], S = G.view;
    if (c === '#') return 'wall';
    if (c === '_') return 'gap';
    if (c === 'x') return G.revealed[i] ? 'ghost' : 'star-floor';
    if (c === 'h') return G.revealed[i] ? 'floor' : 'gap';
    return 'floor';
  }
  function isGroundish(i) { if (i < 0) return false; var k = kindAt(i); return k === 'floor' || k === 'star-floor' || k === 'wall'; }

  function paintStatic() {
    if (!G.L || mode !== 'play') return;
    var L = G.L, T = G.T, th = THEME[G.w], S = G.view, c = bctx, W = L.W * T, H = L.H * T;
    bg.width = Math.round(W * DPR); bg.height = Math.round(H * DPR); c.setTransform(DPR, 0, 0, DPR, 0, 0);
    var gr = c.createLinearGradient(0, 0, W * 0.3, H); gr.addColorStop(0, th.sky[0]); gr.addColorStop(1, th.sky[1]); c.fillStyle = gr; c.fillRect(0, 0, W, H);
    // the world's backdrop
    if (G.w === 6) for (var s = 0; s < L.W * L.H * 2; s++) { var sx = hash(s, 3) * W, sy = hash(s, 5) * H; blob(c, sx, sy, 0.5 + hash(s, 7) * 1.2, '#FFFFFF', 0.25 + hash(s, 9) * 0.5); }
    if (G.w === 1) for (s = 0; s < 14; s++) blob(c, hash(s, 11) * W, hash(s, 12) * H, T * (0.8 + hash(s, 13)), '#1C2533', 0.25);
    var i, x, y;
    // ground
    for (i = 0; i < L.W * L.H; i++) {
      x = (i % L.W) * T; y = (i / L.W | 0) * T;
      var k = kindAt(i), ch = L.g[i];
      if (k === 'gap' || k === 'ghost') { paintGap(c, i, x, y, T, k); continue; }
      if (ch === '~' && !J.melted(L, S, i)) { paintGround(c, i, x, y, T, th); paintWater(c, i, x, y, T, false); continue; }
      if ((ch === 'P' || ch === 'Q' || ch === 'R')) { paintGap(c, i, x, y, T, 'gap'); paintBridge(c, i, x, y, T, bridgeUp(i)); continue; }
      paintGround(c, i, x, y, T, th);
      if (ch === 'i') paintIce(c, i, x, y, T);
      if (ch === '~') paintWater(c, i, x, y, T, true);
      if (ch === 'O') { var gg = c.createRadialGradient(x + T / 2, y + T / 2, 2, x + T / 2, y + T / 2, T * 0.7); gg.addColorStop(0, th.orb); gg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gg; c.globalAlpha = 0.7; c.fillRect(x - T * 0.2, y - T * 0.2, T * 1.4, T * 1.4); c.globalAlpha = 1; }
      if (ch === 'p' || ch === 'q' || ch === 'r') paintPlate(c, x, y, T, ch, J.pressed(L, S, ch));
      if (ch >= '1' && ch <= '5') paintCrystal(c, x, y, T, +ch, 1);
      if (ch === 'T' && (S.tm >> L.thorns.indexOf(i) & 1)) paintPetals(c, i, x, y, T);
    }
    // soft edges where ground meets sky or canyon
    for (i = 0; i < L.W * L.H; i++) {
      if (kindAt(i) !== 'floor' && kindAt(i) !== 'star-floor') continue;
      var below = J.nb(L, i, 2);
      if (below >= 0 && (kindAt(below) === 'gap' || L.g[below] === 'P' || L.g[below] === 'Q' || L.g[below] === 'R') && G.w !== 6) {
        x = (i % L.W) * T; y = (i / L.W | 0) * T;
        c.fillStyle = G.w === 4 ? 'rgba(150,95,80,0.55)' : 'rgba(0,0,0,0.18)'; rr(c, x + 1, y + T - 2, T - 2, T * 0.16, 3); c.fill();
      }
    }
    // things that stand up: walls, thorns, blocks are drawn live
    for (i = 0; i < L.W * L.H; i++) {
      x = (i % L.W) * T; y = (i / L.W | 0) * T;
      if (L.g[i] === '#') paintWall(c, i, x, y, T, th);
    }
    // paper grain, for a watercolour feel
    c.save(); c.globalAlpha = th.dark ? 0.05 : 0.08; c.globalCompositeOperation = 'multiply'; c.fillStyle = c.createPattern(paper(), 'repeat'); c.fillRect(0, 0, W, H); c.restore();
  }
  function bridgeUp(i) {
    var L = G.L, S = G.view, ch = L.g[i];
    return J.pressed(L, S, ch.toLowerCase()) || S.a === i || S.b === i;
  }
  function paintGround(c, i, x, y, T, th) {
    var h = hash(i, 1), inset = G.w === 6 ? T * 0.06 : T * 0.02;
    c.fillStyle = h < 0.5 ? th.g1 : th.g2; rr(c, x + inset, y + inset, T - inset * 2, T - inset * 2, T * 0.22); c.fill();
    // watercolour: pooled pigment and lighter washes
    for (var k = 0; k < 3; k++) blob(c, x + T * (0.2 + hash(i, 20 + k) * 0.6), y + T * (0.2 + hash(i, 30 + k) * 0.6), T * (0.18 + hash(i, 40 + k) * 0.22), k ? th.g2 : '#FFFFFF', k ? 0.35 : 0.14);
    c.strokeStyle = th.edge; c.globalAlpha = 0.18; c.lineWidth = 1; rr(c, x + inset + 0.5, y + inset + 0.5, T - inset * 2 - 1, T - inset * 2 - 1, T * 0.22); c.stroke(); c.globalAlpha = 1;
    if (G.w === 1 && hash(i, 2) > 0.7) { c.fillStyle = 'rgba(40,70,55,0.35)'; for (k = 0; k < 3; k++) { c.beginPath(); c.ellipse(x + T * (0.25 + k * 0.2), y + T * (0.72 - hash(i, k) * 0.1), T * 0.02, T * 0.08, -0.3 + k * 0.3, 0, Math.PI * 2); c.fill(); } }
    if (G.w === 2 && hash(i, 2) > 0.75) { c.strokeStyle = 'rgba(160,195,220,0.5)'; c.lineWidth = 1; c.beginPath(); c.arc(x + T * 0.3, y + T * 0.7, T * 0.08, Math.PI, 0); c.arc(x + T * 0.46, y + T * 0.7, T * 0.08, Math.PI, 0); c.stroke(); }
    if (G.w === 3) { c.strokeStyle = 'rgba(120,170,90,0.55)'; c.lineWidth = 1.1; for (k = 0; k < 3; k++) { var gx = x + T * (0.2 + hash(i, 50 + k) * 0.6), gy = y + T * (0.3 + hash(i, 60 + k) * 0.55); c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx - 1.5, gy - T * 0.1); c.moveTo(gx + 2, gy); c.lineTo(gx + 3, gy - T * 0.09); c.stroke(); } }
    if (G.w === 4) { c.strokeStyle = 'rgba(190,130,100,0.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + T * 0.1, y + T * (0.35 + hash(i, 4) * 0.3)); c.quadraticCurveTo(x + T * 0.5, y + T * 0.45, x + T * 0.9, y + T * (0.35 + hash(i, 5) * 0.3)); c.stroke(); }
    if (G.w === 5 && hash(i, 2) > 0.8) { c.fillStyle = 'rgba(200,180,240,0.5)'; c.beginPath(); c.moveTo(x + T * 0.7, y + T * 0.75); c.lineTo(x + T * 0.74, y + T * 0.6); c.lineTo(x + T * 0.78, y + T * 0.75); c.fill(); }
    if (G.w === 6) paintConstellation(c, i, x, y, T);
  }
  function starPt(i) { var T = G.T; return [(i % G.L.W) * T + T * (0.3 + hash(i, 70) * 0.4), (i / G.L.W | 0) * T + T * (0.3 + hash(i, 71) * 0.4)]; }
  function paintConstellation(c, i, x, y, T) {
    var p = starPt(i);
    c.strokeStyle = 'rgba(220,215,255,0.35)'; c.lineWidth = 1;
    [1, 2].forEach(function (d) { var j = J.nb(G.L, i, d); if (j >= 0 && (kindAt(j) === 'floor' || kindAt(j) === 'star-floor') && G.L.g[j] !== '#') { var q = starPt(j); c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); } });
    star(c, p[0], p[1], T * 0.07, '#FFF6D6', hash(i, 72));
    blob(c, p[0], p[1], T * 0.16, '#FFF6D6', 0.12);
    for (var k = 0; k < 2; k++) blob(c, x + hash(i, 80 + k) * T, y + hash(i, 90 + k) * T, 0.9, '#FFFFFF', 0.6);
  }
  function paintGap(c, i, x, y, T, k) {
    if (G.w === 4) {
      var g = c.createLinearGradient(0, y, 0, y + T); g.addColorStop(0, THEME[4].chasm[0]); g.addColorStop(1, THEME[4].chasm[1]);
      c.fillStyle = g; c.fillRect(x, y, T, T);
      c.strokeStyle = 'rgba(255,220,230,0.18)'; c.lineWidth = 1; for (var s = 1; s < 4; s++) { c.beginPath(); c.moveTo(x, y + T * s / 4 + hash(i, s) * 3); c.lineTo(x + T, y + T * s / 4 + hash(i, s + 9) * 3); c.stroke(); }
      blob(c, x + T * hash(i, 3), y + T * 0.8, T * 0.3, '#4F3A5E', 0.25);
    } else if (G.w === 6) {
      if (k === 'ghost') { c.setLineDash([3, 4]); c.strokeStyle = 'rgba(220,215,255,0.35)'; c.lineWidth = 1.2; rr(c, x + T * 0.12, y + T * 0.12, T * 0.76, T * 0.76, T * 0.2); c.stroke(); c.setLineDash([]); }
      if (G.L.g[i] === 'h') blob(c, x + T / 2, y + T / 2, 1.1, '#FFFFFF', 0.35); // the faintest hint
    } else if (G.w === 7) {
    } else {
      c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(x, y, T, T);
    }
  }
  function paintIce(c, i, x, y, T) {
    c.fillStyle = '#CFE7F5'; rr(c, x + 1, y + 1, T - 2, T - 2, T * 0.14); c.fill();
    blob(c, x + T * 0.35, y + T * 0.35, T * 0.3, '#FFFFFF', 0.25);
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x + T * 0.22, y + T * 0.62); c.lineTo(x + T * 0.5, y + T * 0.3); c.moveTo(x + T * 0.42, y + T * 0.74); c.lineTo(x + T * 0.62, y + T * 0.52); c.stroke(); c.lineCap = 'butt';
    c.strokeStyle = 'rgba(120,170,205,0.35)'; c.lineWidth = 1; rr(c, x + 1.5, y + 1.5, T - 3, T - 3, T * 0.14); c.stroke();
  }
  function paintWater(c, i, x, y, T, melted) {
    c.fillStyle = '#9CCAE6'; c.fillRect(x, y, T, T);
    blob(c, x + T * hash(i, 1), y + T * hash(i, 2), T * 0.35, '#B7DCF0', 0.6);
    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1.2;
    for (var k = 0; k < 2; k++) { var yy = y + T * (0.3 + k * 0.38); c.beginPath(); c.moveTo(x + T * 0.12, yy); c.quadraticCurveTo(x + T * 0.3, yy - 3, x + T * 0.5, yy); c.quadraticCurveTo(x + T * 0.7, yy + 3, x + T * 0.88, yy); c.stroke(); }
    if (melted) { // a stepping-stone crossing
      [[0.3, 0.35, 0.2], [0.66, 0.42, 0.18], [0.45, 0.72, 0.2]].forEach(function (s) {
        c.fillStyle = 'rgba(60,90,110,0.25)'; c.beginPath(); c.ellipse(x + T * s[0], y + T * s[1] + 2, T * s[2], T * s[2] * 0.7, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#EEF4F2'; c.beginPath(); c.ellipse(x + T * s[0], y + T * s[1], T * s[2], T * s[2] * 0.7, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.ellipse(x + T * (s[0] - 0.05), y + T * (s[1] - 0.04), T * s[2] * 0.4, T * s[2] * 0.22, 0, 0, Math.PI * 2); c.fill();
      });
    }
  }
  function paintPlate(c, x, y, T, ch, on) {
    var cx = x + T / 2, cy = y + T / 2;
    c.fillStyle = 'rgba(90,60,50,0.2)'; c.beginPath(); c.ellipse(cx, cy + 2, T * 0.34, T * 0.26, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = on ? '#FFF6EE' : '#E9DCCB'; c.beginPath(); c.ellipse(cx, cy, T * 0.34, T * 0.26, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = PLATE_COL[ch]; c.lineWidth = Math.max(2, T * 0.06); c.beginPath(); c.ellipse(cx, cy, T * 0.26, T * 0.18, 0, 0, Math.PI * 2); c.stroke();
    heart(c, cx, cy, T / 44, PLATE_COL[ch], 0.9);
  }
  function paintBridge(c, i, x, y, T, up) {
    var L = G.L, col = PLATE_COL[L.g[i].toLowerCase()];
    var l = J.nb(L, i, 3), r = J.nb(L, i, 1);
    var horiz = (l >= 0 && L.g[l] !== '_') || (r >= 0 && L.g[r] !== '_');
    c.save();
    if (!horiz) { c.translate(x + T / 2, y + T / 2); c.rotate(Math.PI / 2); c.translate(-(x + T / 2), -(y + T / 2)); }
    if (up) {
      c.fillStyle = 'rgba(60,40,50,0.3)'; c.fillRect(x, y + T * 0.26, T, T * 0.56);
      for (var k = 0; k < 4; k++) { c.fillStyle = k % 2 ? '#C79B6D' : '#D4AB7C'; rr(c, x + k * T / 4 + 1, y + T * 0.2, T / 4 - 2, T * 0.56, 2); c.fill(); }
      c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y + T * 0.2); c.lineTo(x + T, y + T * 0.2); c.moveTo(x, y + T * 0.76); c.lineTo(x + T, y + T * 0.76); c.stroke();
    } else {
      c.setLineDash([3, 4]); c.strokeStyle = 'rgba(255,240,240,0.55)'; c.lineWidth = 1.4; rr(c, x + 2, y + T * 0.22, T - 4, T * 0.52, 3); c.stroke(); c.setLineDash([]);
      blob(c, x + T / 2, y + T / 2, T * 0.09, col, 0.9);
    }
    c.restore();
  }
  function paintCrystal(c, x, y, T, n, a) {
    var cx = x + T / 2, cy = y + T * 0.62, col = NOTE_COL[n - 1];
    c.fillStyle = 'rgba(80,70,110,0.18)'; c.beginPath(); c.ellipse(cx, cy + T * 0.1, T * 0.3, T * 0.09, 0, 0, Math.PI * 2); c.fill();
    [[-0.16, 0.5, -0.25], [0.15, 0.42, 0.28], [0, 0.66, 0]].forEach(function (s) {
      c.save(); c.translate(cx + s[0] * T, cy + T * 0.08); c.rotate(s[2]);
      var h = s[1] * T, w = T * 0.11;
      c.fillStyle = col; c.beginPath(); c.moveTo(-w, 0); c.lineTo(-w, -h * 0.75); c.lineTo(0, -h); c.lineTo(w, -h * 0.75); c.lineTo(w, 0); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.moveTo(-w * 0.6, -2); c.lineTo(-w * 0.6, -h * 0.72); c.lineTo(0, -h * 0.93); c.lineTo(0, -2); c.closePath(); c.fill();
      c.restore();
    });
    // the note number, small, for anyone who'd rather read than listen
    c.fillStyle = 'rgba(60,51,80,0.75)'; c.font = '600 ' + Math.round(T * 0.2) + 'px "IBM Plex Mono", monospace'; c.textAlign = 'center'; c.fillText(String(n), x + T * 0.84, y + T * 0.28);
  }
  function paintPetals(c, i, x, y, T) {
    ['#F7C9D4', '#D9C8F0', '#FFE3AE'].forEach(function (col, k) { blob(c, x + T * (0.25 + hash(i, 100 + k) * 0.5), y + T * (0.3 + hash(i, 110 + k) * 0.45), T * 0.06, col, 0.9); });
  }
  function paintWall(c, i, x, y, T, th) {
    var h = hash(i, 7), cx = x + T / 2, by = y + T * 0.92;
    c.fillStyle = 'rgba(0,0,0,0.14)'; c.beginPath(); c.ellipse(cx, by, T * 0.4, T * 0.11, 0, 0, Math.PI * 2); c.fill();
    if (G.w === 1) { // a soft round forest tree
      c.fillStyle = '#3A2E2A'; rr(c, cx - T * 0.06, y + T * 0.55, T * 0.12, T * 0.36, 2); c.fill();
      blob(c, cx - T * 0.14, y + T * 0.45, T * 0.3, th.wall[0], 1); blob(c, cx + T * 0.16, y + T * 0.4, T * 0.28, th.wall[1], 1); blob(c, cx, y + T * 0.2, T * 0.3, th.wall[1], 1);
      blob(c, cx - T * 0.06, y + T * 0.14, T * 0.14, th.wall[2], 0.7); blob(c, cx + T * 0.2, y + T * 0.34, T * 0.09, th.wall[2], 0.5);
    } else if (G.w === 2) {
      if (h < 0.5) { // snowy pine
        c.fillStyle = '#6E5A4E'; c.fillRect(cx - T * 0.04, y + T * 0.72, T * 0.08, T * 0.2);
        [[0.78, 0.4], [0.56, 0.32], [0.34, 0.22]].forEach(function (s, k) { c.fillStyle = k % 2 ? '#7FA7B8' : '#6C97AA'; c.beginPath(); c.moveTo(cx - T * s[1], y + T * s[0]); c.lineTo(cx, y + T * (s[0] - 0.36)); c.lineTo(cx + T * s[1], y + T * s[0]); c.closePath(); c.fill();
          c.fillStyle = '#FFFFFF'; c.beginPath(); c.moveTo(cx - T * s[1] * 0.5, y + T * (s[0] - 0.18)); c.lineTo(cx, y + T * (s[0] - 0.36)); c.lineTo(cx + T * s[1] * 0.5, y + T * (s[0] - 0.18)); c.closePath(); c.fill(); });
      } else { // a snow-capped boulder
        c.fillStyle = th.wall[0]; c.beginPath(); c.ellipse(cx, y + T * 0.6, T * 0.44, T * 0.34, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#FFFFFF'; c.beginPath(); c.ellipse(cx - T * 0.04, y + T * 0.4, T * 0.34, T * 0.16, -0.1, 0, Math.PI * 2); c.fill();
        blob(c, cx + T * 0.16, y + T * 0.66, T * 0.12, '#9AB0C4', 0.6);
      }
    } else if (G.w === 3) { // a round flowering hedge
      blob(c, cx - T * 0.16, y + T * 0.55, T * 0.3, th.wall[0], 1); blob(c, cx + T * 0.16, y + T * 0.55, T * 0.3, th.wall[0], 1); blob(c, cx, y + T * 0.36, T * 0.33, th.wall[1], 1);
      blob(c, cx - T * 0.08, y + T * 0.28, T * 0.14, th.wall[2], 0.8);
      ['#F7A8C0', '#FFFFFF', '#FFD86E', '#C9B0F0'].forEach(function (col, k) { blob(c, x + T * (0.2 + hash(i, 120 + k) * 0.6), y + T * (0.25 + hash(i, 130 + k) * 0.45), T * 0.055, col, 1); });
    } else if (G.w === 4) { // a sandstone rock with stripes
      c.fillStyle = th.wall[0]; rr(c, x + T * 0.08, y + T * 0.18, T * 0.84, T * 0.74, T * 0.18); c.fill();
      c.fillStyle = th.wall[1]; rr(c, x + T * 0.08, y + T * 0.18, T * 0.84, T * 0.3, T * 0.16); c.fill();
      c.strokeStyle = th.wall[2]; c.lineWidth = 1.4; for (var s = 0; s < 2; s++) { c.beginPath(); c.moveTo(x + T * 0.12, y + T * (0.56 + s * 0.16)); c.lineTo(x + T * 0.88, y + T * (0.54 + s * 0.16)); c.stroke(); }
    } else if (G.w === 5) { // giant crystals
      [[-0.2, 0.62, -0.2, 0], [0.18, 0.55, 0.22, 1], [0, 0.82, 0, 2]].forEach(function (s) {
        c.save(); c.translate(cx + s[0] * T, by); c.rotate(s[2]);
        var hh = s[1] * T, w = T * 0.15;
        c.fillStyle = th.wall[s[3] === 2 ? 0 : 1]; c.beginPath(); c.moveTo(-w, 0); c.lineTo(-w, -hh * 0.78); c.lineTo(0, -hh); c.lineTo(w, -hh * 0.78); c.lineTo(w, 0); c.closePath(); c.fill();
        c.fillStyle = th.wall[2]; c.globalAlpha = 0.7; c.beginPath(); c.moveTo(-w * 0.55, -2); c.lineTo(-w * 0.55, -hh * 0.74); c.lineTo(0, -hh * 0.94); c.lineTo(0, -2); c.closePath(); c.fill(); c.globalAlpha = 1;
        c.restore();
      });
      if (h > 0.6) { // a little wind chime
        c.strokeStyle = 'rgba(90,80,120,0.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + T * 0.7, y + T * 0.05); c.lineTo(x + T * 0.7, y + T * 0.2); c.stroke();
        c.fillStyle = '#D8C06A'; c.fillRect(x + T * 0.58, y + T * 0.2, T * 0.24, 2);
        [0.6, 0.7, 0.8].forEach(function (q, k) { c.fillStyle = '#E8D8A0'; c.fillRect(x + T * q - 1, y + T * 0.22, 2, T * (0.12 + k * 0.04)); });
      }
    } else if (G.w === 6) { // a dark peak with a snowy cap
      c.fillStyle = th.wall[1]; c.beginPath(); c.moveTo(x + T * 0.04, by); c.lineTo(cx, y + T * 0.12); c.lineTo(x + T * 0.96, by); c.closePath(); c.fill();
      c.fillStyle = '#E8E6FA'; c.beginPath(); c.moveTo(cx - T * 0.14, y + T * 0.34); c.lineTo(cx, y + T * 0.12); c.lineTo(cx + T * 0.14, y + T * 0.34); c.closePath(); c.fill();
    }
  }

  /* ------------------------------------------------------------------ drawing each frame */
  function frame() {
    raf = 0;
    if (mode === 'map' || document.hidden) return;
    var t = now();
    if (mode === 'play') drawPlay(t); else if (mode === 'sky') drawSky(t); else if (mode === 'chal') drawScene(t);
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && mode !== 'map') raf = requestAnimationFrame(frame); }

  function palPos(p, t) {
    var L = G.L, T = G.T;
    function xy(i) { return [(i % L.W) * T + T / 2, (i / L.W | 0) * T + T / 2]; }
    if (!p.path) return { x: xy(p.i)[0], y: xy(p.i)[1], hop: 0, moving: false };
    var n = p.path.length - 1, q = (t - p.t0) / p.seg;
    if (q >= n) { p.path = null; return { x: xy(p.i)[0], y: xy(p.i)[1], hop: 0, moving: false }; }
    if (q < 0) { var s0 = xy(p.path[0]); return { x: s0[0], y: s0[1], hop: 0, moving: false }; }
    var k = Math.floor(q), f = q - k, A = xy(p.path[k]), B = xy(p.path[k + 1]);
    var sl = n > 1 && !p.walk, e = sl ? f : f * f * (3 - 2 * f);
    return { x: A[0] + (B[0] - A[0]) * e, y: A[1] + (B[1] - A[1]) * e, hop: sl || REDUCED ? 0 : Math.sin(f * Math.PI), moving: true, slide: sl };
  }

  function drawPlay(t) {
    var L = G.L, T = G.T, c = ctx, S = G.view, th = THEME[G.w];
    if (G.viewAt && t >= G.viewAt) { G.viewAt = 0; }
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.clearRect(0, 0, cv._w, cv._h);
    c.drawImage(bg, 0, 0, L.W * T, L.H * T);
    var i, x, y, ch;
    // things that live and breathe on the ground
    for (i = 0; i < L.W * L.H; i++) {
      ch = L.g[i]; x = (i % L.W) * T; y = (i / L.W | 0) * T;
      if (G.w === 3 && G.visited[i] != null && t >= G.visited[i]) drawFlowers(c, i, x, y, T, Math.min(1, (t - G.visited[i]) / 500));
      if (ch === '*' && !(S.fm >> L.frags.indexOf(i) & 1)) drawFrag(c, x, y, T, t, i);
      if (ch >= '1' && ch <= '5' && G.glow[i] && t >= G.glow[i] && t - G.glow[i] < 900) { var a = 1 - (t - G.glow[i]) / 900; blob(c, x + T / 2, y + T * 0.45, T * 0.55, NOTE_COL[+ch - 1], 0.45 * a); blob(c, x + T / 2, y + T * 0.45, T * 0.3, '#FFFFFF', 0.4 * a); }
      if (ch === 'T') drawThorn(c, i, x, y, T, t, !!(S.tm >> L.thorns.indexOf(i) & 1));
      if (ch === 'm') drawMurk(c, i, x, y, T, t, S.mc);
      if (G.w === 6 && t < G.lookUntil) drawLook(c, i, x, y, T, t);
    }
    // melody progress, shown as little notes along the top
    if (L.melody.length && !S.mc) drawMelodyBar(c, t);
    drawOrb(c, t);
    // ice blocks
    L.blocks.length && drawBlocks(c, t);
    // the hint arrow
    if (G.hint) drawHint(c, t);
    if (G.maze) drawRoute(c, t);
    // pals (the lower one drawn last)
    var P = G.pv.map(function (p, k) { var q = palPos(p, t); q.k = k; return q; });
    if (P[0].y > P[1].y) P.reverse();
    // selection glows under the feet
    P.forEach(function (q) { if (G.together || q.k === G.sel) { var g = c.createRadialGradient(q.x, q.y + T * 0.3, 1, q.x, q.y + T * 0.3, T * 0.55); g.addColorStop(0, th.dark ? 'rgba(255,230,170,0.55)' : 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(q.x, q.y + T * 0.3, T * 0.55, T * 0.26, 0, 0, Math.PI * 2); c.fill(); } });
    P.forEach(function (q) { drawPal(c, q, t); });
    drawTogetherHeart(c, t);
    if (G.w === 1) drawFog(c, t);
    drawParts(c, t);
  }
  function drawFlowers(c, i, x, y, T, g) {
    var cols = ['#F7A8C0', '#FFFFFF', '#FFD86E', '#C9B0F0', '#F9B98F'];
    for (var k = 0; k < 3; k++) {
      var fx = x + T * (0.2 + hash(i, 200 + k) * 0.6), fy = y + T * (0.25 + hash(i, 210 + k) * 0.55), r = T * 0.06 * g * (0.8 + hash(i, 220 + k) * 0.5);
      c.fillStyle = cols[(hash(i, 230 + k) * 5) | 0];
      for (var p = 0; p < 5; p++) { var a = p * Math.PI * 2 / 5; c.beginPath(); c.arc(fx + Math.cos(a) * r, fy + Math.sin(a) * r, r * 0.75, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#F6C24A'; c.beginPath(); c.arc(fx, fy, r * 0.6, 0, Math.PI * 2); c.fill();
    }
  }
  function drawFrag(c, x, y, T, t, i) {
    var b = REDUCED ? 0 : Math.sin(t / 500 + i) * T * 0.05, cx = x + T / 2, cy = y + T / 2 + b;
    var g = c.createRadialGradient(cx, cy, 1, cx, cy, T * 0.5); g.addColorStop(0, 'rgba(255,236,160,0.9)'); g.addColorStop(1, 'rgba(255,236,160,0)'); c.fillStyle = g; c.fillRect(x, y - T * 0.1, T, T * 1.2);
    c.fillStyle = '#FFF3C4'; c.beginPath(); c.moveTo(cx, cy - T * 0.22); c.lineTo(cx + T * 0.13, cy); c.lineTo(cx, cy + T * 0.22); c.lineTo(cx - T * 0.13, cy); c.closePath(); c.fill();
    c.fillStyle = '#F6C24A'; c.beginPath(); c.moveTo(cx, cy - T * 0.22); c.lineTo(cx + T * 0.13, cy); c.lineTo(cx, cy); c.closePath(); c.fill();
    if (!REDUCED) star(c, cx + T * 0.2, cy - T * 0.18, T * 0.05 * (0.6 + 0.4 * Math.sin(t / 300 + i)), '#FFFFFF', 0);
  }
  function drawThorn(c, i, x, y, T, t, lifted) {
    var la = G.lifts[i], a = 1;
    if (lifted) { if (!la || t - la > 1200) return; a = 1 - (t - la) / 1200; }
    var cx = x + T / 2, cy = y + T / 2, sway = REDUCED ? 0 : Math.sin(t / 900 + i) * 0.06;
    c.save(); c.globalAlpha = a;
    var g = c.createRadialGradient(cx, cy, 2, cx, cy, T * 0.65); g.addColorStop(0, 'rgba(40,30,60,0.75)'); g.addColorStop(1, 'rgba(40,30,60,0)'); c.fillStyle = g; c.fillRect(x - T * 0.15, y - T * 0.15, T * 1.3, T * 1.3);
    blob(c, cx, cy, T * 0.3, '#2E2440', 0.8);
    c.strokeStyle = '#4A3A5C'; c.lineWidth = Math.max(2.5, T * 0.085); c.lineCap = 'round';
    for (var k = 0; k < 6; k++) {
      var a0 = k * Math.PI / 3 + hash(i, k) + sway;
      c.beginPath(); c.moveTo(cx, cy); c.quadraticCurveTo(cx + Math.cos(a0) * T * 0.4, cy + Math.sin(a0) * T * 0.15, cx + Math.cos(a0 + 0.8) * T * 0.44, cy + Math.sin(a0 + 0.8) * T * 0.42); c.stroke();
      c.fillStyle = '#7C6890'; var tx = cx + Math.cos(a0 + 0.4) * T * 0.28, ty = cy + Math.sin(a0 + 0.4) * T * 0.24; c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx + 3, ty - 5); c.lineTo(tx + 5, ty); c.fill();
    }
    c.lineCap = 'butt';
    // two soft eyes: it's only a shy shadow
    blob(c, cx - T * 0.08, cy - T * 0.04, T * 0.035, '#FFE9C0', 0.85); blob(c, cx + T * 0.08, cy - T * 0.04, T * 0.035, '#FFE9C0', 0.85);
    c.restore();
  }
  function drawMurk(c, i, x, y, T, t, cleared) {
    var a = 1;
    if (cleared) { if (!G.murkFade || t - G.murkFade > 1400) return; a = 1 - Math.max(0, t - G.murkFade) / 1400; }
    c.save(); c.globalAlpha = a;
    for (var k = 0; k < 4; k++) {
      var dx = REDUCED ? 0 : Math.sin(t / 1400 + k + i) * T * 0.06;
      blob(c, x + T * (0.25 + (k % 2) * 0.5) + dx, y + T * (0.3 + (k >> 1) * 0.4), T * 0.34, k % 2 ? '#A6A3AE' : '#8F8C99', 0.85);
    }
    blob(c, x + T * 0.5, y + T * 0.5, T * 0.3, '#B7B4BE', 0.7);
    c.restore();
  }
  function drawLook(c, i, x, y, T, t) {
    var ch = G.L.g[i], a = Math.min(1, (G.lookUntil - t) / 400, (t - (G.lookUntil - 2800)) / 300);
    c.save(); c.globalAlpha = clamp(a, 0, 1);
    if (ch === 'x') { c.fillStyle = 'rgba(20,22,50,0.8)'; rr(c, x + 2, y + 2, T - 4, T - 4, T * 0.2); c.fill(); c.setLineDash([3, 4]); c.strokeStyle = '#C9C3F2'; c.lineWidth = 1.5; rr(c, x + T * 0.12, y + T * 0.12, T * 0.76, T * 0.76, T * 0.2); c.stroke(); c.setLineDash([]); }
    if (ch === 'h' && !G.revealed[i]) { blob(c, x + T / 2, y + T / 2, T * 0.55, '#FFE9A8', 0.25); c.fillStyle = '#6B6FB8'; rr(c, x + T * 0.08, y + T * 0.08, T * 0.84, T * 0.84, T * 0.2); c.fill(); c.strokeStyle = '#FFE9A8'; c.lineWidth = 2; c.stroke(); star(c, x + T / 2, y + T / 2, T * 0.14, '#FFF3C4', 0); }
    c.restore();
  }
  function drawMelodyBar(c, t) {
    var L = G.L, T = G.T, n = L.melody.length, w = T * 0.42, x0 = L.W * T / 2 - (n * w) / 2, y0 = T * 0.1;
    c.fillStyle = 'rgba(255,253,249,0.82)'; rr(c, x0 - 6, y0 - 4, n * w + 12, w + 8, w / 2 + 4); c.fill();
    L.melody.forEach(function (m, k) {
      var cx = x0 + k * w + w / 2, cy = y0 + w / 2, done = k < G.view.pr;
      c.fillStyle = done ? NOTE_COL[m - 1] : 'rgba(255,255,255,0.9)'; c.strokeStyle = NOTE_COL[m - 1]; c.lineWidth = 2;
      c.beginPath(); c.arc(cx, cy, w * 0.34, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = done ? '#FFFFFF' : 'rgba(60,51,80,0.7)'; c.font = '600 ' + Math.round(w * 0.42) + 'px "IBM Plex Mono", monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(m), cx, cy + 1);
    });
    c.textBaseline = 'alphabetic';
  }
  function drawOrb(c, t) {
    var o = orbCenter(), T = G.T, open = J.allFrags(G.L, G.view), th = THEME[G.w];
    var pulse = REDUCED ? 1 : 1 + Math.sin(t / 900) * 0.08, r = T * 0.42 * pulse;
    c.save(); c.globalAlpha = open ? 1 : 0.45;
    var g = c.createRadialGradient(o[0], o[1], 1, o[0], o[1], r * 2.4); g.addColorStop(0, th.orb); g.addColorStop(0.4, th.glow); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.globalAlpha *= 0.55; c.beginPath(); c.arc(o[0], o[1], r * 2.4, 0, Math.PI * 2); c.fill();
    c.globalAlpha = open ? 0.95 : 0.5;
    var g2 = c.createRadialGradient(o[0] - r * 0.3, o[1] - r * 0.3, 1, o[0], o[1], r); g2.addColorStop(0, '#FFFFFF'); g2.addColorStop(0.6, th.orb); g2.addColorStop(1, th.glow);
    c.fillStyle = g2; c.beginPath(); c.arc(o[0], o[1] - T * 0.05, r * 0.62, 0, Math.PI * 2); c.fill();
    // soft rings, like sound
    if (!REDUCED && open) for (var k = 0; k < 2; k++) { var q = ((t / 2600) + k / 2) % 1; c.globalAlpha = (1 - q) * 0.4; c.strokeStyle = th.glow; c.lineWidth = 1.5; c.beginPath(); c.arc(o[0], o[1] - T * 0.05, r * (0.7 + q * 1.4), 0, Math.PI * 2); c.stroke(); }
    c.restore();
  }
  function drawBlocks(c, t) {
    var T = G.T, S = G.view, list = G.S.k.slice(), b = G.block, moving = b && t < b.t1;
    // during a push, draw the block sliding from where it was
    list.forEach(function (i) {
      if (moving && i === b.to && !b.melt) return;
      drawBlock(c, cellXY(i)[0], cellXY(i)[1], T, 1);
    });
    if (moving) {
      var q = clamp((t - b.t0) / (b.t1 - b.t0), 0, 1), A = cellXY(b.from), B = cellXY(b.to);
      drawBlock(c, A[0] + (B[0] - A[0]) * q, A[1] + (B[1] - A[1]) * q, T, b.melt ? 1 - q * 0.6 : 1);
    }
  }
  function drawBlock(c, x, y, T, a) {
    c.save(); c.globalAlpha = a;
    c.fillStyle = 'rgba(40,80,110,0.2)'; rr(c, x + T * 0.1, y + T * 0.2, T * 0.84, T * 0.78, T * 0.14); c.fill();
    c.fillStyle = '#BEE0F3'; rr(c, x + T * 0.08, y + T * 0.08, T * 0.84, T * 0.8, T * 0.14); c.fill();
    c.fillStyle = '#E4F4FC'; rr(c, x + T * 0.08, y + T * 0.08, T * 0.84, T * 0.3, T * 0.14); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + T * 0.22, y + T * 0.55); c.lineTo(x + T * 0.4, y + T * 0.42); c.stroke(); c.lineCap = 'butt';
    c.strokeStyle = 'rgba(100,160,200,0.6)'; c.lineWidth = 1; rr(c, x + T * 0.08, y + T * 0.08, T * 0.84, T * 0.8, T * 0.14); c.stroke();
    c.restore();
  }
  function drawHint(c, t) {
    var h = G.hint, T = G.T, whos = h.who === 2 ? [0, 1] : [h.who], d = J.DIRS[h.d], a = 0.6 + (REDUCED ? 0 : Math.sin((t - h.t0) / 250) * 0.3);
    whos.forEach(function (w) {
      var p = cellCenter(G.S[w ? 'b' : 'a']), x = p[0] + d[0] * T * 0.62, y = p[1] + d[1] * T * 0.62;
      c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(Math.atan2(d[1], d[0]));
      c.fillStyle = '#FFFDF9'; c.strokeStyle = '#7C6BB0'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(T * 0.2, 0); c.lineTo(-T * 0.12, -T * 0.17); c.lineTo(-T * 0.12, T * 0.17); c.closePath(); c.fill(); c.stroke();
      c.restore();
    });
  }
  function drawPal(c, q, t) {
    var p = G.pv[q.k], T = G.T, other = G.pv[1 - q.k], s = T / 56;
    // idle: look at the other pal
    if (!q.moving) { var ox = (other.i % G.L.W) - (p.i % G.L.W); if (ox) p.face = ox > 0 ? 1 : -1; }
    if (t > p.blinkAt + 140) p.blinkAt = t + 2200 + Math.random() * 3500;
    var blink = t > p.blinkAt && t < p.blinkAt + 140;
    var near = J.cheb(G.L, G.view.a, G.view.b) <= 1, happy = p.happy && t - p.happy < 1500;
    var wag = REDUCED ? 0.1 : Math.sin(t / (near || happy ? 90 : 180) + q.k) * (near || happy ? 0.55 : 0.3);
    var x = q.x, y = q.y + T * 0.36, hop = q.hop * T * 0.22;
    if (happy && !REDUCED) hop += Math.abs(Math.sin((t - p.happy) / 160)) * T * 0.16 * (1 - (t - p.happy) / 1500);
    // a gentle bounce back from an illusion, or a little nudge against a wall
    var off = [0, 0];
    if (p.bounce) { var bq = (t - p.bounce.t0) / 420; if (bq >= 1) p.bounce = null; else { var m = Math.sin(bq * Math.PI) * 0.38 * T; off = [J.DIRS[p.bounce.d][0] * m, J.DIRS[p.bounce.d][1] * m]; hop += Math.sin(bq * Math.PI) * T * 0.2; } }
    if (p.bump) { var uq = (t - p.bump.t0) / 200; if (uq >= 1) p.bump = null; else { var n = Math.sin(uq * Math.PI) * 0.08 * T; off = [J.DIRS[p.bump.d][0] * n, J.DIRS[p.bump.d][1] * n]; } }
    // a soft shadow
    c.fillStyle = THEME[G.w].dark ? 'rgba(0,0,0,0.3)' : 'rgba(60,40,70,0.18)';
    c.beginPath(); c.ellipse(x + off[0], y + off[1] + 1, T * 0.3 * (1 - hop / T * 0.8), T * 0.08, 0, 0, Math.PI * 2); c.fill();
    var ex = x - p.face * T * 0.11, lo = p.face > 0 ? T * 0.46 : T * 0.68, hi = G.L.W * T - (p.face > 0 ? T * 0.68 : T * 0.46), edge = clamp(ex, lo, hi);
    c.save(); c.translate(edge + off[0], y + off[1] - hop); c.scale(p.face * s * (q.k ? 0.96 : 1), s * (q.k ? 1.02 : 0.98));
    var pose = q.moving && !q.slide ? 'run' : q.slide ? 'stand' : 'sit';
    drawPup(c, PUPS[q.k], pose, q.moving ? (t / 70) : 0, wag, blink, t, q.slide ? -0.1 : (!q.moving && near ? 0.12 : 0));
    c.restore();
    // a tiny marker for the pal you're guiding
    if (!G.together && q.k === G.sel && !G.won) {
      var my = q.y - T * 0.62 - hop + (REDUCED ? 0 : Math.sin(t / 400) * 2);
      c.fillStyle = THEME[G.w].dark ? '#FFE3AE' : '#7C6BB0'; c.beginPath(); c.moveTo(x - 5, my - 5); c.lineTo(x + 5, my - 5); c.lineTo(x, my + 1); c.closePath(); c.fill();
    }
  }
  function drawTogetherHeart(c, t) {
    var L = G.L, S = G.view; if (J.cheb(L, S.a, S.b) > 1 || animating()) return;
    var a = cellCenter(S.a), b = cellCenter(S.b), T = G.T, bob = REDUCED ? 0 : Math.sin(t / 500) * 3;
    heart(c, (a[0] + b[0]) / 2, Math.min(a[1], b[1]) - T * 0.5 + bob, T / 34, '#EE8FA6', 0.9);
  }
  function drawFog(c, t) {
    var L = G.L, S = G.view, n = L.W * L.H, close = J.cheb(L, S.a, S.b) <= 2, r = close ? 2.7 : 1.5;
    var pa = palPos(G.pv[0], t), pb = palPos(G.pv[1], t), T = G.T;
    var ax = pa.x / T - 0.5, ay = pa.y / T - 0.5, bx = pb.x / T - 0.5, by = pb.y / T - 0.5;
    if (fog.width !== L.W) { fog.width = L.W; fog.height = L.H; }
    var img = fctx.createImageData(L.W, L.H), k = REDUCED ? 1 : 0.14;
    for (var i = 0; i < n; i++) {
      var x = i % L.W, y = i / L.W | 0;
      var d = Math.min(Math.hypot(x - ax, y - ay), Math.hypot(x - bx, y - by));
      var want = clamp((r + 0.6 - d) / 1.2, 0, 1);
      if (close && want > 0.6) G.mem[i] = 1;
      if (G.mem[i]) want = Math.max(want, 0.62);
      if (L.goal.indexOf(i) >= 0) want = Math.max(want, 0.5);
      G.lit[i] += (want - G.lit[i]) * k;
      img.data[i * 4] = 18; img.data[i * 4 + 1] = 22; img.data[i * 4 + 2] = 38; img.data[i * 4 + 3] = Math.round((1 - G.lit[i]) * 225);
    }
    fctx.putImageData(img, 0, 0);
    c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(fog, 0, 0, L.W, L.H, 0, 0, L.W * T, L.H * T);
    c.restore();
    // lantern glow around each pal
    c.save(); c.globalCompositeOperation = 'lighter';
    [pa, pb].forEach(function (q) { var g = c.createRadialGradient(q.x, q.y, 2, q.x, q.y, T * (close ? 1.9 : 1.2)); g.addColorStop(0, 'rgba(255,210,140,0.22)'); g.addColorStop(1, 'rgba(255,210,140,0)'); c.fillStyle = g; c.fillRect(q.x - T * 2, q.y - T * 2, T * 4, T * 4); });
    c.restore();
    // a soft drizzle
    if (!REDUCED) {
      c.strokeStyle = 'rgba(200,215,235,0.16)'; c.lineWidth = 1; c.beginPath();
      for (var s = 0; s < 40; s++) { var sx = (hash(s, 1) * L.W * T + t * 0.05) % (L.W * T), sy = (hash(s, 2) * L.H * T + t * 0.22) % (L.H * T); c.moveTo(sx, sy); c.lineTo(sx - 3, sy + 9); }
      c.stroke();
    }
  }

  /* ------------------------------------------------------------------ little particles */
  function burst(x, y, n, cols, kind) {
    if (REDUCED) n = Math.min(n, 5);
    for (var k = 0; k < n; k++) {
      var a = Math.random() * Math.PI * 2, v = REDUCED ? 0 : (0.3 + Math.random() * 1.2);
      G.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (kind === 'note' ? 0.8 : 0.4), t0: now(), life: 900 + Math.random() * 700, col: cols[k % cols.length], kind: kind, r: 2 + Math.random() * 3, rot: Math.random() * 6 });
    }
  }
  function drawParts(c, t) {
    var T = G.T;
    G.parts = G.parts.filter(function (p) {
      var q = (t - p.t0) / p.life; if (q >= 1) return false;
      var x = p.x + p.vx * (t - p.t0) / 16, y = p.y + p.vy * (t - p.t0) / 16 + (p.kind === 'drop' ? q * q * 30 : 0);
      c.save(); c.globalAlpha = 1 - q;
      if (p.kind === 'spark') star(c, x, y, p.r * 1.3, p.col, p.rot + q * 2);
      else if (p.kind === 'petal') { c.fillStyle = p.col; c.translate(x, y); c.rotate(p.rot + q * 3); c.beginPath(); c.ellipse(0, 0, p.r * 1.2, p.r * 0.6, 0, 0, Math.PI * 2); c.fill(); }
      else if (p.kind === 'note') { c.fillStyle = p.col; c.font = Math.round(T * 0.32) + 'px serif'; c.textAlign = 'center'; c.fillText('♪', x, y); }
      else { c.fillStyle = p.col; c.beginPath(); c.arc(x, y, p.r * 0.7, 0, Math.PI * 2); c.fill(); }
      c.restore();
      return true;
    });
  }

  /* ------------------------------------------------------------------ describing the board for screen readers */
  function rc(i) { return 'row ' + ((i / G.L.W | 0) + 1) + ', column ' + (i % G.L.W + 1); }
  function describe() {
    if (!G.L) return;
    var L = G.L, S = G.S, bits = [];
    bits.push('World ' + G.w + ', level ' + G.l + '. A ' + L.W + ' by ' + L.H + ' board.');
    bits.push(PAL[0] + ' is at ' + rc(S.a) + '. ' + PAL[1] + ' is at ' + rc(S.b) + '.');
    bits.push('The glowing tone is at ' + rc(L.goal[0]) + ' and ' + rc(L.goal[1]) + '.');
    if (G.maze) { var open = []; L.g.forEach(function (c, i) { if ('.hBO'.indexOf(c) >= 0 && i !== S.a) open.push(rc(i)); }); bits.push('Real ground at: ' + open.join('; ') + '.'); }
    if (L.frags.length) bits.push(popcount(S.fm) + ' of ' + L.frags.length + ' light fragments gathered.');
    if (L.melody.length) bits.push(S.mc ? 'The murk is clear.' : 'Melody: ' + L.melody.join(', ') + '. ' + S.pr + ' notes sung so far.');
    if (G.maze) bits.push(PAL[0] + ' waits on the lookout, beside the tone, and ' + PAL[1] + ' walks where she is called. ' + (G.calls && G.calls.length ? 'Calls planned: ' + G.calls.map(callWords).join(', ') + '.' : 'No calls planned yet.'));
    cv.setAttribute('aria-label', bits.join(' '));
  }

  /* ------------------------------------------------------------------ the challenges: every level a different kind
     The pals sit in a little scene above each challenge (drawScene) and react: a hop for a good answer,
     a curious head tilt and a nuzzle for a "not yet", and a hug when the level is done. */
  var C = null;
  var LEAF = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 13.5C2.5 7 7 2.5 13.5 2.5c0 6.5-4.5 11-11 11z"/><path class="v" d="M3 13 10 6"/></svg>';
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function leaves(d) {
    var h = '<span class="fj-leaves" role="img" aria-label="Difficulty ' + d + ' of 5">';
    for (var k = 1; k <= 5; k++) h += '<i class="' + (k <= d ? 'on' : '') + '">' + LEAF + '</i>';
    return h + '</span>';
  }
  function txt(tag, cls, t) { var e = el(tag, cls); e.textContent = t; return e; }
  function btn(cls, label, fn, aria) { var b = txt('button', cls, label); b.type = 'button'; if (aria) b.setAttribute('aria-label', aria); b.addEventListener('click', function (e) { wake(); fn(e); }); return b; }
  function shuffled(arr, seed) {
    var a = arr.map(function (x, i) { return { x: x, k: hash(i + 7, seed) }; });
    a.sort(function (p, q) { return p.k - q.k; });
    var out = a.map(function (p) { return p.x; });
    if (out.every(function (x, i) { return x === arr[i]; })) out.push(out.shift());
    return out;
  }
  function focusFirst(box, sel) { var f = box.querySelector(sel || 'button:not([disabled])'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } } }

  // gentle sounds
  function chime(n) { note(WORLDS[G.w - 1].hz, n == null ? 4 : n, 0.06); }
  function hmmTone() { var hz = WORLDS[G.w - 1].hz; tone(soft(hz) * 0.75, 0, 0.5, 0.022); tone(soft(hz) * 0.9, 0.12, 0.5, 0.016); }

  // the pals react
  function react(k, who) {
    var t = now(); G.react = { k: k, t0: t, who: who };
    var w = cv._w || 300, h = cv._h || 140;
    if (k === 'yay') burst(w / 2, h * 0.42, REDUCED ? 5 : 12, ['#FFE3AE', '#F7C9D4', '#D9C8F0', '#FFFFFF'], 'spark');
    if (k === 'hug') { burst(w / 2, h * 0.4, REDUCED ? 6 : 22, ['#FFE3AE', '#F7C9D4', '#D9C8F0', '#C7EBD6', '#FFFFFF'], 'spark'); }
    kick();
  }

  function startChal(w, l) {
    var lv = G.lv;
    C = { type: lv.type, lv: lv, hearts: 3, useHearts: lv.d >= 4 && ['echo', 'sort', 'spot', 'choose'].indexOf(lv.type) >= 0, done: false, timers: [] };
    G.react = null; G.parts = [];
    setMode('chal'); resize(); paintScene();
    chalEl.innerHTML = '';
    C.askEl = txt('p', 'fj-ask', lv.ask); chalEl.appendChild(C.askEl);
    C.body = el('div', 'fj-cbody'); chalEl.appendChild(C.body);
    C.fb = el('p', 'fj-fb'); C.fb.setAttribute('aria-live', 'polite'); C.fb.setAttribute('role', 'status'); chalEl.appendChild(C.fb);
    var bar = el('div', 'fj-cbar');
    C.heartsEl = el('span', 'fj-hearts'); C.heartsEl.hidden = !C.useHearts; bar.appendChild(C.heartsEl);
    var tools = el('span', 'fj-cbar-tools');
    tools.appendChild(btn('fj-soft fj-chint', 'Hint', function () { if (C && !C.done && C.hint) C.hint(); }, 'A gentle hint'));
    tools.appendChild(btn('fj-soft', 'Start again', function () { startLevel(G.w, G.l, false, true); }));
    bar.appendChild(tools); chalEl.appendChild(bar);
    renderHearts();
    (BUILD[lv.type] || function () {})();
    cv.setAttribute('aria-label', PAL[0] + ' and ' + PAL[1] + ', sitting together and watching the challenge.');
  }
  function clearTimers() { if (C) C.timers.forEach(clearTimeout); }
  function later(fn, ms) { var id = setTimeout(fn, ms); if (C) C.timers.push(id); return id; }
  function fb(msg, kind) { C.fb.textContent = msg || ''; C.fb.className = 'fj-fb' + (kind ? ' is-' + kind : ''); }
  function renderHearts() {
    if (!C || !C.useHearts) return;
    var h = '';
    for (var k = 0; k < 3; k++) h += '<svg viewBox="0 0 24 24" class="' + (k < C.hearts ? 'on' : '') + '" aria-hidden="true"><path d="M12 20s-7-4.4-7-9.5A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.5C19 15.6 12 20 12 20z"/></svg>';
    C.heartsEl.innerHTML = h; C.heartsEl.setAttribute('role', 'img'); C.heartsEl.setAttribute('aria-label', 'Gentle tries: ' + C.hearts + ' of 3');
  }
  // a "not yet": one heart rests; when they're all resting they simply fill up again
  function useHeart(msg) {
    hmmTone(); react('hmm');
    if (!C.useHearts) { fb(msg, 'soft'); return false; }
    C.hearts--; renderHearts();
    if (C.hearts <= 0) {
      C.hearts = 3; later(renderHearts, 700);
      fb(msg + ' The pals sit close for a moment, and your hearts fill up again.', 'soft');
      return true;
    }
    fb(msg, 'soft');
    return false;
  }
  function finish() {
    if (C.done) return; C.done = true;
    react('hug'); pad(WORLDS[G.w - 1].hz, 0.05);
    setTimeout(function () { if (mode === 'chal') winLevel(); }, REDUCED ? 500 : 1500);
  }
  function nextBtn(label, fn) {
    var b = btn('fj-primary fj-next', label, fn);
    C.body.appendChild(b);
    setTimeout(function () { try { b.focus({ preventScroll: true }); } catch (e) { } }, 40);
    return b;
  }

  // one question with options: used by riddles, kinder words, "what would help most?" and the bid reply
  function choiceQ(o) {
    C.body.innerHTML = ''; fb('');
    if (o.k) C.body.appendChild(txt('p', 'fj-ck', o.k));
    if (o.pre) C.body.appendChild(o.pre);
    var q = txt('p', 'fj-q', o.q); q.id = 'fj-q-' + (++qid); C.body.appendChild(q);
    var box = el('div', 'fj-opts'); box.setAttribute('role', 'group'); box.setAttribute('aria-labelledby', q.id);
    C.opts = [];
    o.options.forEach(function (op, i) {
      var b = btn('fj-opt', op.t, function () {
        if (b.disabled || C.answered) return;
        if (op.ok) {
          C.answered = true; b.classList.add('is-yes');
          C.opts.forEach(function (x) { x.disabled = true; });
          fb(op.why, 'good'); react('yay'); chime(2 + (o.idx || 0) % 4);
          if (o.showAll) {
            var dl = el('div', 'fj-whys'); dl.appendChild(txt('p', 'fj-ck', 'Why each one'));
            o.options.forEach(function (x) { var p = el('p', x.ok ? 'is-yes' : ''); p.appendChild(txt('b', '', x.ok ? '✓ ' : '· ')); p.appendChild(document.createTextNode(x.t + ' ')); p.appendChild(txt('span', '', x.why)); dl.appendChild(p); });
            C.body.appendChild(dl);
          }
          nextBtn(o.nextLabel || 'Next →', o.onRight);
        } else {
          b.classList.add('is-no'); b.disabled = true;
          var refilled = useHeart(op.why + ' ' + (o.again || 'Try another.'));
          if (refilled && o.hintText) fb(C.fb.textContent + ' Hint: ' + o.hintText, 'soft');
        }
      });
      b.setAttribute('data-i', i); C.opts.push(b); box.appendChild(b);
    });
    C.body.appendChild(box);
    C.answered = false;
    C.hint = function () {
      if (o.hintText && !C.saidHint) { C.saidHint = true; fb('Hint: ' + o.hintText, 'hint'); return; }
      var wrong = o.options.map(function (x, i) { return x.ok || C.opts[i].disabled ? -1 : i; }).filter(function (i) { return i >= 0; });
      if (!wrong.length) { fb('Only one left. You’ve got this.', 'hint'); return; }
      var i = wrong[0]; C.opts[i].classList.add('is-no'); C.opts[i].disabled = true;
      fb('Hint: not “' + o.options[i].t + '”. ' + o.options[i].why, 'hint');
    };
    C.saidHint = false;
  }
  var qid = 0;

  var BUILD = {};

  /* ---- riddles */
  BUILD.riddle = function () { C.i = 0; riddleStep(); };
  function riddleStep() {
    var R = C.lv.riddles, r = R[C.i], last = C.i === R.length - 1;
    choiceQ({ k: 'Riddle ' + (C.i + 1) + ' of ' + R.length + (r.w && WORLDS[r.w - 1] ? ' · from the ' + WORLDS[r.w - 1].short : ''), q: r.q, options: r.options, hintText: r.hint, idx: C.i,
      nextLabel: last ? 'Light the lantern →' : 'Next riddle →',
      onRight: function () { if (last) finish(); else { C.i++; riddleStep(); focusFirst(C.body, '.fj-opt'); } } });
    G.lanterns = C.i;
  }

  /* ---- kinder, truer words */
  BUILD.reframe = function () { C.i = 0; reframeStep(); };
  function reframeStep() {
    var I = C.lv.items, it = I[C.i], last = C.i === I.length - 1;
    var pre = el('div', 'fj-harsh'); pre.appendChild(txt('span', 'fj-ck', 'A harsh thought')); pre.appendChild(txt('p', '', '“' + it.harsh + '”'));
    choiceQ({ k: 'Thought ' + (C.i + 1) + ' of ' + I.length, pre: pre, q: 'Which is kinder, and still true?', options: it.options, idx: C.i,
      nextLabel: last ? 'Finish →' : 'Next thought →',
      onRight: function () { if (last) finish(); else { C.i++; reframeStep(); focusFirst(C.body, '.fj-opt'); } } });
  }

  /* ---- what would help most? (with a why for every option) */
  BUILD.choose = function () { C.i = 0; chooseStep(); };
  function chooseStep() {
    var I = C.lv.items, it = I[C.i], last = C.i === I.length - 1;
    choiceQ({ k: 'Moment ' + (C.i + 1) + ' of ' + I.length, q: it.q, options: it.options, idx: C.i, showAll: true,
      nextLabel: last ? 'Finish →' : 'Next moment →',
      onRight: function () { if (last) finish(); else { C.i++; chooseStep(); focusFirst(C.body, '.fj-opt'); } } });
  }

  /* ---- the slow lantern: a breathing rhythm, tapped in time (very forgiving) */
  BUILD.breath = function () {
    var lv = C.lv; C.hits = 0; C.t0 = 0; C.last = ''; C.miss = 0; C.cue = '';
    C.body.innerHTML = '';
    C.cueEl = txt('p', 'fj-breathcue', 'When you’re ready, tap Begin and breathe along.'); C.cueEl.setAttribute('aria-hidden', 'true'); C.body.appendChild(C.cueEl);
    C.dots = el('div', 'fj-dots'); C.dots.setAttribute('role', 'img'); C.body.appendChild(C.dots); breathDots();
    C.tapBtn = btn('fj-primary fj-breathbtn', 'Begin', breathTap); C.body.appendChild(C.tapBtn);
    C.hint = function () { C.showNow = true; fb('Hint: watch the words under the lantern. Tap right as they say “full” or “empty”. Space or Enter works too.', 'hint'); };
    C.key = function (e) { if ((e.key === ' ' || e.key === 'Enter') && document.activeElement !== C.tapBtn) { e.preventDefault(); breathTap(); return true; } };
  };
  function breathDots() {
    var h = ''; for (var k = 0; k < C.lv.need; k++) h += '<i class="' + (k < C.hits ? 'on' : '') + '"></i>';
    C.dots.innerHTML = h; C.dots.setAttribute('aria-label', C.hits + ' of ' + C.lv.need + ' lanterns lit');
  }
  // where are we in the breath? e = 0 (empty) to 1 (full)
  function breathAt(t) {
    var lv = C.lv, cyc = lv.inhale + lv.exhale, s = (t - C.t0) / 1000, p = ((s % cyc) + cyc) % cyc, inh = p < lv.inhale;
    var e = inh ? p / lv.inhale : 1 - (p - lv.inhale) / lv.exhale;
    if (REDUCED) e = Math.round(e * 6) / 6;
    return { s: s, p: p, inh: inh, e: 0.5 - Math.cos(e * Math.PI) / 2, count: inh ? Math.floor(p) + 1 : Math.floor(p - lv.inhale) + 1 };
  }
  function breathTarget(s) {
    var lv = C.lv, cyc = lv.inhale + lv.exhale;
    var kt = Math.round((s - lv.inhale) / cyc), top = lv.inhale + kt * cyc, kb = Math.round(s / cyc), bot = kb * cyc;
    var dt = s - top, db = s - bot;
    if (bot <= 0) db = 99;
    return Math.abs(dt) <= Math.abs(db) ? { id: 'T' + kt, d: dt, top: true } : { id: 'B' + kb, d: db, top: false };
  }
  function breathTap() {
    if (C.done) return;
    if (!C.t0) { C.t0 = now(); C.tapBtn.textContent = 'Tap with the lantern'; fb('Breathe in as the lantern grows, and out as it softens. Tap at the fullest and the smallest.'); return; }
    var s = (now() - C.t0) / 1000, tg = breathTarget(s), win = C.lv.window;
    if (Math.abs(tg.d) <= win) {
      if (C.last === tg.id) { fb('That turn is already counted. Wait for the next one.', 'soft'); return; }
      C.last = tg.id; C.hits++; breathDots(); chime(C.hits); react('yay');
      if (C.hits >= C.lv.need) { fb(cap1(NUMW[C.lv.need] || String(C.lv.need)) + ' slow breaths, and every lantern is lit.', 'good'); C.tapBtn.disabled = true; finish(); return; }
      fb(tg.top ? 'Full. Lovely. Now breathe out, slowly.' : 'Empty. Lovely. Now breathe in.', 'good');
    } else {
      C.miss++; react('hmm');
      var b = breathAt(now());
      fb(tg.d < 0 && Math.abs(tg.d) < 2.2 ? 'A touch early. Let the breath finish; there’s no rush.' : tg.d > 0 && Math.abs(tg.d) < 2.2 ? 'A touch late. Catch the next turn.' : b.inh ? 'Still breathing in… tap when the lantern is fullest.' : 'Breathing out, slowly… tap when it’s smallest.', 'soft');
      if (C.miss >= 3) C.showNow = true;
    }
  }
  function breathCue(t) {
    if (!C || C.type !== 'breath' || !C.t0 || !C.cueEl) return;
    var b = breathAt(t), tg = breathTarget(b.s), near = Math.abs(tg.d) <= C.lv.window * 0.8, s;
    if (C.done) s = 'All lit.';
    else if (near) s = tg.top ? (C.showNow ? 'Full. Tap now.' : 'Full…') : (C.showNow ? 'Empty. Tap now.' : 'Empty…');
    else s = (b.inh ? 'Breathe in… ' : 'and out… ') + b.count;
    if (s !== C.cue) { C.cue = s; C.cueEl.textContent = s; }
  }

  var NUMW = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

  /* ---- thawing words */
  BUILD.unscramble = function () { C.i = 0; wordStep(); };
  function wordStep() {
    var W = C.lv.words, wd = W[C.i];
    C.ans = []; C.lock = 0; C.solved = false;
    C.body.innerHTML = ''; fb('');
    C.body.appendChild(txt('p', 'fj-ck', 'Word ' + (C.i + 1) + ' of ' + W.length));
    C.body.appendChild(txt('p', 'fj-q', wd.clue));
    C.slots = el('div', 'fj-slots'); C.slots.setAttribute('role', 'group'); C.slots.setAttribute('aria-label', 'Your word'); C.body.appendChild(C.slots);
    C.tiles = el('div', 'fj-tiles'); C.tiles.setAttribute('role', 'group'); C.tiles.setAttribute('aria-label', 'Frozen letters'); C.body.appendChild(C.tiles);
    wd.mix.split('').forEach(function (ch, i) {
      var b = btn('fj-tile', ch, function () { placeLetter(i); }, 'Letter ' + ch); b.setAttribute('data-i', i); C.tiles.appendChild(b);
    });
    wordRender();
    C.hint = function () {
      if (C.solved) return;
      var w = C.lv.words[C.i].w, mix = C.lv.words[C.i].mix, k = 0;
      while (k < C.ans.length && mix[C.ans[k]] === w[k]) k++;
      C.ans = C.ans.slice(0, k);
      if (k >= w.length) return;
      for (var i = 0; i < mix.length; i++) if (mix[i] === w[k] && C.ans.indexOf(i) < 0) { C.ans.push(i); break; }
      C.lock = Math.max(C.lock, C.ans.length);
      fb('Hint: the word begins “' + w.slice(0, C.ans.length) + '”.', 'hint');
      wordRender(); wordCheck();
    };
    C.key = function (e) {
      if (C.solved) return;
      if (/^[a-z]$/i.test(e.key)) {
        var mix = C.lv.words[C.i].mix, up = e.key.toUpperCase();
        for (var i = 0; i < mix.length; i++) if (mix[i] === up && C.ans.indexOf(i) < 0) { placeLetter(i); return true; }
        return true;
      }
      if (e.key === 'Backspace' && C.ans.length > C.lock) { e.preventDefault(); C.ans.pop(); wordRender(); return true; }
    };
  }
  function placeLetter(i) {
    if (C.solved || C.ans.indexOf(i) >= 0) return;
    C.ans.push(i); tone(soft(WORLDS[G.w - 1].hz) * SCALE[C.ans.length % 6], 0, 0.3, 0.02); wordRender(); wordCheck();
  }
  function wordRender() {
    var wd = C.lv.words[C.i];
    C.slots.innerHTML = '';
    for (var k = 0; k < wd.w.length; k++) {
      var has = k < C.ans.length, ch = has ? wd.mix[C.ans[k]] : '';
      (function (k) {
        var b = btn('fj-slot' + (has ? ' is-full' : '') + (k < C.lock ? ' is-lock' : '') + (C.solved ? ' is-yes' : ''), ch || ' ', function () {
          if (C.solved || k >= C.ans.length || k < C.lock) return;
          C.ans.splice(k, 1); wordRender();
        }, has ? 'Letter ' + ch + ', place ' + (k + 1) + (k < C.lock ? '' : '. Tap to send it back.') : 'Empty place ' + (k + 1));
        if (!has || C.solved) b.tabIndex = -1;
        C.slots.appendChild(b);
      })(k);
    }
    Array.prototype.forEach.call(C.tiles.children, function (b, i) { var used = C.ans.indexOf(i) >= 0; b.disabled = used || C.solved; b.classList.toggle('is-used', used); });
  }
  function wordCheck() {
    var wd = C.lv.words[C.i];
    if (C.ans.length < wd.w.length) return;
    var got = C.ans.map(function (i) { return wd.mix[i]; }).join('');
    if (got === wd.w) {
      C.solved = true; wordRender(); react('yay'); chime(C.i + 2);
      fb(wd.w.charAt(0) + wd.w.slice(1).toLowerCase() + '. ' + wd.clue, 'good');
      var last = C.i === C.lv.words.length - 1;
      nextBtn(last ? 'Finish →' : 'Next word →', function () { if (last) finish(); else { C.i++; wordStep(); focusFirst(C.tiles); } });
    } else {
      react('hmm'); hmmTone();
      fb('“' + got + '” isn’t quite it. Tap a letter in your word to send it back, or ask for a hint.', 'soft');
    }
  }

  /* ---- find your footing: put the steps in order */
  BUILD.sequence = function () {
    var n = C.lv.steps.length;
    C.slotv = []; for (var k = 0; k < n; k++) C.slotv.push(-1);
    C.locked = []; C.pool = shuffled(C.lv.steps.map(function (_, i) { return i; }), 1 + Math.floor(Math.random() * 1e6));
    seqRender();
    C.hint = function () {
      var j = C.slotv.findIndex(function (v, k) { return !C.locked[k]; }); if (j < 0) return;
      var at = C.slotv.indexOf(j); if (at >= 0) C.slotv[at] = -1;
      if (C.slotv[j] >= 0 && C.slotv[j] !== j) C.slotv[j] = -1;
      C.slotv[j] = j; C.locked[j] = true;
      fb('Hint: step ' + (j + 1) + ' is “' + C.lv.steps[j].t + '” ' + C.lv.steps[j].why, 'hint');
      seqRender(); seqMaybeWin();
    };
  };
  function seqRender() {
    var S = C.lv.steps, n = S.length;
    C.body.innerHTML = '';
    C.body.appendChild(txt('p', 'fj-ck', (C.lv.seqTitle ? C.lv.seqTitle + ' · ' : '') + 'your order'));
    var ol = el('ol', 'fj-seq');
    C.slotv.forEach(function (v, k) {
      var li = el('li');
      if (v < 0) { li.appendChild(txt('span', 'fj-seq-empty', 'Step ' + (k + 1))); }
      else {
        var b = btn('fj-seq-item' + (C.locked[k] ? ' is-yes' : ''), (C.locked[k] ? '✓ ' : '') + S[v].t, function () {
          if (C.locked[k]) return; C.slotv[k] = -1; seqRender();
        }, (C.locked[k] ? 'Step ' + (k + 1) + ', in place: ' : 'Step ' + (k + 1) + ': ') + S[v].t + (C.locked[k] ? '' : '. Tap to take it back.'));
        if (C.locked[k]) b.setAttribute('aria-disabled', 'true');
        li.appendChild(b);
      }
      ol.appendChild(li);
    });
    C.body.appendChild(ol);
    var left = C.pool.filter(function (i) { return C.slotv.indexOf(i) < 0; });
    if (left.length) {
      C.body.appendChild(txt('p', 'fj-ck', 'Tap the step that comes next'));
      var pool = el('div', 'fj-pool');
      left.forEach(function (i) {
        pool.appendChild(btn('fj-opt', S[i].t, function () {
          var j = C.slotv.indexOf(-1); if (j < 0) return; C.slotv[j] = i; tone(soft(WORLDS[G.w - 1].hz) * SCALE[j + 1], 0, 0.3, 0.02); seqRender();
          var nx = C.body.querySelector('.fj-pool .fj-opt') || C.body.querySelector('.fj-check'); if (nx) try { nx.focus({ preventScroll: true }); } catch (e) { }
        }));
      });
      C.body.appendChild(pool);
    } else if (!C.done) {
      C.body.appendChild(btn('fj-primary fj-check', 'Check the order', seqCheck));
    }
  }
  function seqCheck() {
    var S = C.lv.steps, wrong = -1, right = 0;
    C.slotv.forEach(function (v, k) { if (v === k) { C.locked[k] = true; right++; } else if (wrong < 0) wrong = v; });
    if (right === S.length) { seqRender(); seqMaybeWin(); return; }
    var msg = (right ? right + ' of ' + S.length + (right === 1 ? ' is' : ' are') + ' in the right place (marked ✓). ' : 'None are in place yet, and that’s fine. ') + 'Not yet: “' + S[wrong].t + '” ' + S[wrong].why;
    C.slotv = C.slotv.map(function (v, k) { return C.locked[k] ? v : -1; });
    seqRender(); useHeart(msg); focusFirst(C.body, '.fj-pool .fj-opt');
  }
  function seqMaybeWin() {
    if (C.locked.filter(Boolean).length === C.lv.steps.length) { fb('That’s the order. ' + (C.lv.win || 'Notice, name it, check yourself, slow down, then back to the topic.'), 'good'); react('yay'); chime(4); finish(); }
  }

  /* ---- what would help? a memory match of feelings and what helps */
  BUILD.match = function () {
    var cards = [];
    C.lv.pairs.forEach(function (p, i) { cards.push({ p: i, s: 'a' }); cards.push({ p: i, s: 'b' }); });
    C.cards = shuffled(cards, 1 + Math.floor(Math.random() * 1e6)); C.up = []; C.got = {}; C.found = 0;
    C.body.innerHTML = '';
    C.grid = el('div', 'fj-mem'); C.grid.setAttribute('role', 'group'); C.grid.setAttribute('aria-label', (NUMW[cards.length] ? cap1(NUMW[cards.length]) : cards.length) + ' cards');
    C.cards.forEach(function (cd, i) {
      var b = el('button', 'fj-card-m'); b.type = 'button'; b.setAttribute('data-i', i); b.setAttribute('data-pair', cd.p);
      b.innerHTML = '<span class="fj-mb" aria-hidden="true"></span><span class="fj-mf"><small>' + esc(memSide(cd)) + '</small>' + esc(cd.s === 'a' ? C.lv.pairs[cd.p].a : C.lv.pairs[cd.p].b) + '</span>';
      b.classList.add(cd.s === 'a' ? 'is-feel' : 'is-help');
      b.addEventListener('click', function () { wake(); flip(i); });
      C.grid.appendChild(b);
    });
    C.body.appendChild(C.grid); memLabels();
    C.hint = function () {
      var one = C.up.length === 1 ? C.up[0] : -1, p;
      if (one >= 0) {
        p = C.cards[one].p;
        C.cards.forEach(function (cd, i) { if (i !== one && cd.p === p) { var b = C.grid.children[i]; b.classList.add('is-hint'); later(function () { b.classList.remove('is-hint'); }, 1800); } });
        fb('Hint: its partner is glowing.', 'hint');
        return;
      }
      p = C.lv.pairs.findIndex(function (_, i) { return !C.got[i]; }); if (p < 0) return;
      C.cards.forEach(function (cd, i) { if (cd.p === p) { var b = C.grid.children[i]; b.classList.add('is-peek'); later(function () { b.classList.remove('is-peek'); }, 1500); } });
      fb('Hint: a quick peek at one pair.', 'hint');
    };
  };
  // each card says what kind of card it is: "Feeling" and "What helps", "Need" and "How to ask", …
  function memSide(cd) {
    var P = C.lv.pairs[cd.p], K = C.lv.kinds && P.c && C.lv.kinds[P.c];
    return K ? K[cd.s === 'a' ? 0 : 1] : cd.s === 'a' ? 'Feeling' : 'What helps';
  }
  function memLabels() {
    C.cards.forEach(function (cd, i) {
      var b = C.grid.children[i], open = C.up.indexOf(i) >= 0 || C.got[cd.p];
      b.classList.toggle('is-up', !!open); b.classList.toggle('is-got', !!C.got[cd.p]);
      b.setAttribute('aria-label', 'Card ' + (i + 1) + (open ? ': ' + memSide(cd).toLowerCase() + ', ' + (cd.s === 'a' ? C.lv.pairs[cd.p].a : C.lv.pairs[cd.p].b) + (C.got[cd.p] ? ', matched' : '') : ', face down'));
      b.setAttribute('aria-pressed', open ? 'true' : 'false');
    });
  }
  function flip(i) {
    if (C.done) return;
    var cd = C.cards[i];
    if (C.got[cd.p] || C.up.indexOf(i) >= 0) return;
    if (C.up.length === 2) { clearTimeout(C.wait); C.up = []; }
    C.up.push(i); tone(soft(WORLDS[G.w - 1].hz) * SCALE[1 + C.up.length], 0, 0.25, 0.02);
    if (C.up.length === 2) {
      var a = C.cards[C.up[0]], b = C.cards[C.up[1]];
      if (a.p === b.p && a.s !== b.s) {
        C.got[a.p] = true; C.found++; C.up = [];
        var P = C.lv.pairs[a.p];
        fb(P.a + ' → ' + P.b + '. ' + P.why, 'good'); react('yay'); chime(C.found);
        if (C.found === C.lv.pairs.length) { memLabels(); finish(); return; }
      } else {
        fb('Not a pair this time. They’ll turn back over; you’ll remember where they are.', 'soft');
        C.wait = later(function () { C.up = []; memLabels(); }, 1300);
        if (C.found < 2) react('hmm');
      }
    }
    memLabels();
  }

  /* ---- let the meadow bloom (a small lights-out puzzle; any tap can be undone by tapping it again) */
  BUILD.bloom = function () {
    C.n = C.lv.n || 3; C.N = C.n * C.n;
    C.bits = J.bloomBits(C.lv.start); C.taps = 0;
    C.body.innerHTML = '';
    C.grid = el('div', 'fj-bloom'); C.grid.setAttribute('role', 'group'); C.grid.setAttribute('aria-label', cap1(NUMW[C.N] || C.N + '') + ' flowers');
    if (C.n !== 3) { C.grid.style.gridTemplateColumns = 'repeat(' + C.n + ', 1fr)'; C.grid.style.maxWidth = (C.n * 5.4) + 'rem'; C.grid.classList.add('is-big'); }
    for (var i = 0; i < C.N; i++) (function (i) {
      var b = el('button', 'fj-flower'); b.type = 'button';
      b.innerHTML = '<svg viewBox="0 0 40 40" aria-hidden="true"><g class="pet"><circle cx="20" cy="10" r="7"/><circle cx="29.5" cy="17" r="7"/><circle cx="26" cy="28" r="7"/><circle cx="14" cy="28" r="7"/><circle cx="10.5" cy="17" r="7"/></g><circle class="mid" cx="20" cy="20" r="5.5"/><path class="bud" d="M20 32c-6-3-7-11 0-18 7 7 6 15 0 18z"/><path class="stem" d="M20 32v6"/></svg>';
      b.addEventListener('click', function () { wake(); bloomTap(i); });
      C.grid.appendChild(b);
    })(i);
    C.body.appendChild(C.grid);
    C.body.appendChild(C.tapsEl = txt('p', 'fj-ck fj-taps', ''));
    bloomRender();
    C.hint = function () {
      var sol = J.bloomSolve(C.bits, C.n); if (!sol || !sol.length) return;
      var i = sol[0], b = C.grid.children[i]; b.classList.add('is-hint'); later(function () { b.classList.remove('is-hint'); }, 2200);
      fb('Hint: try the flower in row ' + ((i / C.n | 0) + 1) + ', column ' + (i % C.n + 1) + '. (About ' + sol.length + ' taps to go.)', 'hint');
    };
  };
  function bloomTap(i) {
    if (C.done) return;
    C.bits = J.bloomTap(C.bits, i, C.n); C.taps++;
    var open = C.bits.filter(Boolean).length;
    tone(soft(WORLDS[G.w - 1].hz) * SCALE[open % 8], 0, 0.5, 0.03);
    bloomRender();
    if (open === C.N) { fb('Every flower is open. The whole meadow blooms.', 'good'); react('yay'); finish(); }
    else if (open >= C.N - 2) fb(open + ' of ' + C.N + ' open. So close.');
    else fb('');
  }
  function bloomRender() {
    Array.prototype.forEach.call(C.grid.children, function (b, i) {
      var on = !!C.bits[i]; b.classList.toggle('is-open', on);
      b.setAttribute('aria-label', 'Flower, row ' + ((i / C.n | 0) + 1) + ', column ' + (i % C.n + 1) + (on ? ': open' : ': a closed bud'));
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    C.tapsEl.textContent = (C.taps ? C.taps + (C.taps === 1 ? ' tap' : ' taps') + ' · ' : '') + C.bits.filter(Boolean).length + ' of ' + C.N + ' open';
  }

  /* ---- small reaches: notice the bids, then turn toward one */
  BUILD.bids = function () {
    C.mark = C.lv.scene.map(function () { return false; }); C.ok = C.lv.scene.map(function () { return false; });
    bidsRender();
    C.hint = function () {
      var i = C.lv.scene.findIndex(function (s, k) { return s.bid && !C.ok[k] && !C.mark[k]; });
      if (i < 0) i = C.lv.scene.findIndex(function (s, k) { return !s.bid && C.mark[k]; });
      if (i < 0) { fb('Hint: everything looks right. Tap Check.', 'hint'); return; }
      var b = C.body.querySelectorAll('.fj-bid')[i]; b.classList.add('is-hint'); later(function () { b.classList.remove('is-hint'); }, 2200);
      fb('Hint: look again at “' + C.lv.scene[i].t + '”', 'hint');
    };
  };
  function bidsRender() {
    C.body.innerHTML = '';
    C.body.appendChild(txt('p', 'fj-ck', C.lv.sceneTitle || 'A Tuesday evening'));
    var box = el('div', 'fj-scene-list'); box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Moments in the evening');
    C.lv.scene.forEach(function (s, i) {
      var b = btn('fj-bid' + (C.ok[i] ? ' is-yes' : C.mark[i] ? ' is-on' : ''), s.t, function () {
        if (C.ok[i] || C.phase2) return; C.mark[i] = !C.mark[i]; b.classList.toggle('is-on', C.mark[i]); b.setAttribute('aria-pressed', C.mark[i] ? 'true' : 'false');
        tone(soft(WORLDS[G.w - 1].hz) * SCALE[C.mark[i] ? 3 : 1], 0, 0.25, 0.02);
      });
      b.setAttribute('aria-pressed', C.mark[i] || C.ok[i] ? 'true' : 'false');
      if (C.ok[i]) b.setAttribute('aria-disabled', 'true');
      box.appendChild(b);
    });
    C.body.appendChild(box);
    C.body.appendChild(btn('fj-primary fj-check', 'Check', bidsCheck));
  }
  function bidsCheck() {
    var S = C.lv.scene, wrong = -1, missed = 0, total = 0;
    S.forEach(function (s, i) {
      if (s.bid) { total++; if (C.mark[i] || C.ok[i]) C.ok[i] = true; else missed++; }
      else if (C.mark[i]) { if (wrong < 0) wrong = i; C.mark[i] = false; }
    });
    var found = total - missed;
    bidsRender();
    if (wrong < 0 && !missed) {
      fb('You found all ' + total + ' small reaches.', 'good'); react('yay'); chime(4);
      C.body.querySelector('.fj-check').remove();
      nextBtn('Now answer one →', bidsReply);
      return;
    }
    var msg = wrong >= 0 ? '“' + S[wrong].t + '” ' + S[wrong].why + (missed ? ' And ' + (missed === 1 ? 'one reach is' : missed + ' reaches are') + ' still waiting to be noticed.' : '')
      : 'You’ve found ' + found + ' of ' + total + '. Look again for the quiet ones: a touch, an offer, a sigh.';
    useHeart(msg);
  }
  function bidsReply() {
    C.phase2 = true;
    var r = C.lv.reply;
    choiceQ({ k: 'Turning toward', q: r.q, options: r.options, showAll: true, nextLabel: 'Finish →', onRight: finish });
    focusFirst(C.body, '.fj-opt');
  }

  /* ---- fair shares: give every job one owner, so each load fits that pal's battery */
  BUILD.balance = function () {
    C.own = C.lv.jobs.map(function () { return -1; });
    C.body.innerHTML = '';
    if (C.lv.fairTitle) C.body.appendChild(txt('p', 'fj-ck', C.lv.fairTitle));
    C.meters = el('div', 'fj-meters'); C.body.appendChild(C.meters);
    var list = el('ul', 'fj-jobs'); C.list = list;
    C.lv.jobs.forEach(function (j, i) {
      var li = el('li', 'fj-job' + (j.hidden ? ' is-hidden' : ''));
      var lab = el('div', 'fj-job-l');
      lab.appendChild(txt('b', '', j.t));
      var meta = el('small'); meta.innerHTML = '<span class="fj-w" aria-label="effort ' + j.w + '">' + new Array(j.w + 1).join('●') + '</span> ' + j.w + (j.hidden ? ' · <span class="fj-inv"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>invisible work</span>' : '');
      lab.appendChild(meta); li.appendChild(lab);
      var bx = el('div', 'fj-own'); bx.setAttribute('role', 'group'); bx.setAttribute('aria-label', 'Who owns: ' + j.t);
      PAL.forEach(function (nm, who) {
        var b = btn('fj-ownb', nm, function () { C.own[i] = C.own[i] === who ? -1 : who; tone(soft(WORLDS[G.w - 1].hz) * SCALE[who ? 3 : 1], 0, 0.3, 0.025); balRender(true); }, j.t + ': ' + PAL[who]);
        b.setAttribute('data-who', who); bx.appendChild(b);
      });
      li.appendChild(bx); list.appendChild(li);
    });
    C.body.appendChild(list);
    balRender(false);
    C.hint = function () {
      var best = null, bd = 99, J2 = C.lv.jobs, n = J2.length;
      for (var m = 0; m < 1 << n; m++) {
        var ld = [0, 0], d = 0;
        for (var i = 0; i < n; i++) { var w = m >> i & 1; ld[w] += J2[i].w; if (C.own[i] >= 0 && C.own[i] !== w) d++; }
        if (ld[0] === C.lv.cap[0] && ld[1] === C.lv.cap[1] && d < bd) { bd = d; best = m; }
      }
      if (best == null) return;
      for (var k = 0; k < n; k++) { var want = best >> k & 1; if (C.own[k] !== want) { fb('Hint: try giving “' + J2[k].t + '” to ' + PAL[want] + '.', 'hint'); var li = C.list.children[k]; li.classList.add('is-hint'); later(function () { li.classList.remove('is-hint'); }, 2200); return; } }
    };
  };
  function balRender(changed) {
    var ld = [0, 0], left = 0;
    C.lv.jobs.forEach(function (j, i) { if (C.own[i] >= 0) ld[C.own[i]] += j.w; else left++; });
    C.meters.innerHTML = '';
    [0, 1].forEach(function (who) {
      var cap = C.lv.cap[who], m = el('div', 'fj-meter' + (ld[who] > cap ? ' is-over' : ld[who] === cap ? ' is-full' : ''));
      m.appendChild(txt('b', '', PAL[who]));
      m.appendChild(txt('small', '', C.lv.capNote[who] + ' · battery fits ' + cap));
      var bar = el('span', 'fj-bar'); bar.setAttribute('role', 'img'); bar.setAttribute('aria-label', ld[who] + ' of ' + cap);
      for (var k = 0; k < Math.max(cap, ld[who]); k++) bar.appendChild(el('i', k < ld[who] ? (k < cap ? 'on' : 'over') : ''));
      m.appendChild(bar);
      m.appendChild(txt('span', 'fj-meter-n', ld[who] + ' / ' + cap));
      C.meters.appendChild(m);
    });
    Array.prototype.forEach.call(C.list.children, function (li, i) {
      li.querySelectorAll('.fj-ownb').forEach(function (b) { b.setAttribute('aria-pressed', C.own[i] === +b.getAttribute('data-who') ? 'true' : 'false'); });
      li.classList.toggle('is-set', C.own[i] >= 0);
    });
    if (!changed || C.done) return;
    var over = ld[0] > C.lv.cap[0] ? 0 : ld[1] > C.lv.cap[1] ? 1 : -1;
    if (!left && over < 0) { fb('Every job has one owner, and each load fits. That’s fair for this week.', 'good'); react('yay'); chime(4); finish(); return; }
    if (over >= 0) { fb(PAL[over] + ' is carrying ' + ld[over] + ', and her battery fits ' + C.lv.cap[over] + ' this week. Could a job move across?', 'soft'); if (!left) react('hmm'); return; }
    fb(left ? left + (left === 1 ? ' job still needs' : ' jobs still need') + ' an owner.' : '');
  }
  function cap1(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ---- echo the valley: listen, then sing it back (a growing tune) */
  var CRYSTAL = ['rose', 'amber', 'green', 'blue', 'violet'];
  BUILD.echo = function () {
    C.len = C.lv.first; C.pos = 0; C.playing = false; C.slow = false;
    C.body.innerHTML = '';
    C.roundEl = txt('p', 'fj-ck', ''); C.body.appendChild(C.roundEl);
    C.row = el('div', 'fj-crystals'); C.row.setAttribute('role', 'group'); C.row.setAttribute('aria-label', 'Five singing crystals');
    CRYSTAL.forEach(function (nm, i) {
      var b = el('button', 'fj-crys'); b.type = 'button'; b.setAttribute('data-n', i + 1); b.style.setProperty('--c', NOTE_COL[i]);
      b.innerHTML = '<span class="gem" aria-hidden="true"></span><span class="nm">' + (i + 1) + ' ' + nm + '</span>';
      b.setAttribute('aria-label', cap1(nm) + ' crystal, note ' + (i + 1));
      b.addEventListener('click', function () { wake(); sing(i + 1); });
      C.row.appendChild(b);
    });
    C.body.appendChild(C.row);
    C.body.appendChild(btn('fj-soft fj-listen', 'Listen again', function () { if (!C.playing) playTune(); }));
    echoRound();
    // wait for any card (like the world's welcome) to close before the first tune
    later(function first() { if (!cardEl.hidden) { later(first, 400); return; } playTune(); }, 800);
    C.hint = function () { if (C.playing) return; fb('Hint: the next note is the ' + CRYSTAL[C.lv.song[C.pos] - 1] + ' crystal (' + C.lv.song[C.pos] + ').', 'hint'); flash(C.lv.song[C.pos], 900); };
    C.key = function (e) { if (/^[1-5]$/.test(e.key)) { sing(+e.key); return true; } if (e.key === 'l' || e.key === 'L') { if (!C.playing) playTune(); return true; } };
  };
  function echoRound() { C.roundEl.textContent = 'Round ' + (C.len - C.lv.first + 1) + ' of ' + (C.lv.song.length - C.lv.first + 1) + ' · ' + C.len + ' notes'; }
  function flash(n, ms) { var b = C.row.children[n - 1]; b.classList.add('is-lit'); later(function () { b.classList.remove('is-lit'); }, ms || 420); }
  function playTune() {
    if (C.done) return;
    C.playing = true; C.pos = 0; C.row.classList.add('is-busy');
    var gap = C.slow ? 900 : 640, seq = C.lv.song.slice(0, C.len), said = [];
    fb('Listen…');
    seq.forEach(function (n, k) {
      later(function () {
        flash(n, gap * 0.7); chime(n - 1); G.react = { k: 'note', t0: now(), who: k % 2 };
        said.push(CRYSTAL[n - 1]); fb('Listen: ' + said.join(', ') + '…');
      }, k * gap);
    });
    later(function () { C.playing = false; C.row.classList.remove('is-busy'); fb('Your turn. Sing it back.'); }, seq.length * gap + 150);
  }
  function sing(n) {
    if (C.done) return;
    if (C.playing) { fb('Listening first… your turn is coming.', 'soft'); return; }
    flash(n); chime(n - 1); G.react = { k: 'note', t0: now(), who: C.pos % 2 };
    if (C.lv.song[C.pos] === n) {
      C.pos++;
      if (C.pos === C.len) {
        if (C.len === C.lv.song.length) { fb('The whole tune, sung back. The valley echoes.', 'good'); react('yay'); finish(); return; }
        C.len++; echoRound(); react('yay');
        fb('Lovely. One more note this time… listen.', 'good');
        later(playTune, 1300);
      } else fb('♪ ' + C.pos + ' of ' + C.len);
    } else {
      var refill = useHeart('That crystal sings a different note. Listen once more.');
      if (refill) C.slow = true;
      C.pos = 0; later(playTune, 1500);
    }
  }

  /* ---- fact, feeling, ask (or a verdict): sort one sentence at a time */
  var NOTFIT = {
    fact: 'A fact is something anyone could see or count, with no judgment in it.',
    feeling: 'A feeling is how it landed for me, usually starting with “I”.',
    ask: 'An ask requests something for next time.',
    verdict: 'A verdict judges the person, not the event.'
  };
  BUILD.sort = function () {
    C.i = 0; C.count = {}; C.lv.buckets.forEach(function (b) { C.count[b.k] = 0; });
    C.body.innerHTML = '';
    C.cardEl = el('div', 'fj-sortcard'); C.cardEl.setAttribute('aria-live', 'off'); C.body.appendChild(C.cardEl);
    C.bk = el('div', 'fj-buckets'); C.bk.setAttribute('role', 'group'); C.bk.setAttribute('aria-label', 'Where does it go?');
    C.lv.buckets.forEach(function (b) {
      var x = el('button', 'fj-bucket'); x.type = 'button'; x.setAttribute('data-k', b.k);
      x.innerHTML = '<b>' + esc(b.t) + '</b><small>' + esc(b.d) + '</small><span class="n">0</span>';
      x.addEventListener('click', function () { wake(); sortPick(b.k, x); });
      C.bk.appendChild(x);
    });
    C.body.appendChild(C.bk);
    sortCard();
    C.hint = function () {
      var k = C.lv.items[C.i].k, x = C.bk.querySelector('[data-k="' + k + '"]');
      x.classList.add('is-hint'); later(function () { x.classList.remove('is-hint'); }, 2000);
      fb('Hint: ask yourself: ' + { fact: 'could anyone see or count this?', feeling: 'is this how it landed for me?', ask: 'is it asking for something next?', verdict: 'does it judge who the person is?' }[k], 'hint');
    };
  };
  function sortCard() {
    var it = C.lv.items[C.i];
    C.cardEl.innerHTML = '<small>Sentence ' + (C.i + 1) + ' of ' + C.lv.items.length + '</small><p>“' + esc(it.t) + '”</p>';
    C.cardEl.classList.remove('is-away'); void C.cardEl.offsetWidth; C.cardEl.classList.add('is-in');
    C.bk.setAttribute('aria-label', 'Where does “' + it.t + '” go?');
  }
  function sortPick(k, x) {
    if (C.done || C.busy) return;
    var it = C.lv.items[C.i];
    if (k === it.k) {
      C.count[k]++; x.querySelector('.n').textContent = C.count[k];
      x.classList.add('is-yes'); later(function () { x.classList.remove('is-yes'); }, 500);
      var B = C.lv.buckets.filter(function (b) { return b.k === k; })[0];
      fb('✓ ' + B.t + '. ' + it.why, 'good'); chime(C.i % 5); if (C.i % 3 === 2) react('yay'); else G.react = { k: 'note', t0: now(), who: C.i % 2 };
      C.i++;
      if (C.i >= C.lv.items.length) { C.cardEl.classList.add('is-away'); react('yay'); finish(); return; }
      C.busy = true; C.cardEl.classList.add('is-away');
      later(function () { C.busy = false; sortCard(); }, REDUCED ? 60 : 260);
    } else {
      useHeart('Not quite. ' + NOTFIT[k]);
    }
  }

  /* ---- finish the line: type the missing word (forgiving), with a clue and then a word bank */
  BUILD.fill = function () { C.i = 0; fillStep(); };
  function fillStep() {
    var ln = C.lv.lines[C.i], last = C.i === C.lv.lines.length - 1;
    C.tries = 0; C.hintLvl = 0; C.solved = false;
    C.body.innerHTML = ''; fb('');
    C.body.appendChild(txt('p', 'fj-ck', 'Line ' + (C.i + 1) + ' of ' + C.lv.lines.length));
    var p = el('p', 'fj-line'); p.appendChild(document.createTextNode(ln.before));
    var inp = el('input', 'fj-in'); inp.type = 'text'; inp.setAttribute('autocomplete', 'off'); inp.setAttribute('autocapitalize', 'off'); inp.setAttribute('spellcheck', 'false'); inp.setAttribute('enterkeyhint', 'done');
    inp.setAttribute('aria-label', 'Missing word: ' + ln.before + ' blank ' + ln.after);
    inp.size = 9; C.inp = inp;
    // keep the quote marks and punctuation hugging the gap, so they never wrap away from it
    var pre = (ln.before.match(/[“"‘(]$/) || [''])[0], post = (ln.after.match(/^[”"’.,!?)]+/) || [''])[0];
    p.firstChild.nodeValue = ln.before.slice(0, ln.before.length - pre.length);
    var gap = el('span', 'fj-gap'); gap.appendChild(document.createTextNode(pre)); gap.appendChild(inp); gap.appendChild(document.createTextNode(post));
    p.appendChild(gap); p.appendChild(document.createTextNode(ln.after.slice(post.length)));
    C.body.appendChild(p);
    C.bank = el('div', 'fj-bank'); C.bank.hidden = true; C.body.appendChild(C.bank);
    var go = btn('fj-primary fj-check', 'Check', fillCheck); C.body.appendChild(go);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); fillCheck(); } });
    C.hint = function () {
      if (C.solved) return;
      C.hintLvl++;
      if (C.hintLvl === 1) fb('Hint: ' + ln.hint + ' It starts with “' + ln.a[0].charAt(0) + '”.', 'hint');
      else { fbBank(); fb('Hint: choose from these three.', 'hint'); }
    };
    C.onRight = function () { if (last) finish(); else { C.i++; fillStep(); try { C.inp.focus({ preventScroll: true }); } catch (e) { } } };
  }
  function fbBank() {
    var ln = C.lv.lines[C.i];
    C.bank.innerHTML = ''; C.bank.hidden = false;
    ln.choices.forEach(function (ch) { C.bank.appendChild(btn('fj-soft fj-chip', ch, function () { if (C.solved) return; C.inp.value = ch; fillCheck(); })); });
  }
  function fillCheck() {
    if (C.solved) return;
    var ln = C.lv.lines[C.i], v = C.inp.value;
    if (!J.norm(v)) { fb('Type the missing word, then Check. A hint is always there.', 'soft'); try { C.inp.focus({ preventScroll: true }); } catch (e) { } return; }
    if (J.fillMatch(ln, v)) {
      C.solved = true; C.inp.value = ln.a[0]; C.inp.readOnly = true; C.inp.classList.add('is-yes'); C.bank.hidden = true;
      var c = C.body.querySelector('.fj-check'); if (c) c.remove();
      fb('Yes: “' + ln.a[0] + '”. ' + ln.why, 'good'); react('yay'); chime(C.i % 5);
      nextBtn(C.i === C.lv.lines.length - 1 ? 'Finish →' : 'Next line →', C.onRight);
    } else {
      C.tries++;
      useHeart('Not quite. “' + v.trim() + '” doesn’t fit this line.' + (C.tries >= 2 && C.hintLvl < 2 ? '' : ' Try another word, or tap Hint.'));
      if (C.tries >= 2 && C.hintLvl < 1) { C.hintLvl = 1; fb(C.fb.textContent + ' Clue: ' + ln.hint, 'soft'); }
      else if (C.tries >= 3 && C.hintLvl < 2) { C.hintLvl = 2; fbBank(); }
      try { C.inp.select(); } catch (e) { }
    }
  }

  /* ---- seen, or assumed? tap the parts that are stories */
  BUILD.spot = function () { C.j = 0; spotStep(); };
  function spotStep() {
    var sc = C.lv.scenes[C.j], last = C.j === C.lv.scenes.length - 1;
    C.mark = sc.bits.map(function () { return false; }); C.ok = sc.bits.map(function () { return false; });
    C.body.innerHTML = ''; fb('');
    C.body.appendChild(txt('p', 'fj-ck', 'Scene ' + (C.j + 1) + ' of ' + C.lv.scenes.length + ' · ' + sc.title));
    C.chips = el('p', 'fj-spot'); C.chips.setAttribute('role', 'group'); C.chips.setAttribute('aria-label', 'Tap the stories');
    sc.bits.forEach(function (b, i) {
      var x = btn('fj-bit', b.t, function () {
        if (C.ok[i] || C.solved) return; C.mark[i] = !C.mark[i]; spotRender();
        tone(soft(WORLDS[G.w - 1].hz) * SCALE[C.mark[i] ? 4 : 2], 0, 0.25, 0.02);
      });
      C.chips.appendChild(x); C.chips.appendChild(document.createTextNode(' '));
    });
    C.body.appendChild(C.chips);
    C.body.appendChild(btn('fj-primary fj-check', 'Check', spotCheck));
    C.solved = false; spotRender();
    C.hint = function () {
      var i = sc.bits.findIndex(function (b, k) { return b.story && !C.ok[k]; });
      if (i < 0) { fb('Hint: every story is found. Anything else you marked is something you saw. Tap Check.', 'hint'); return; }
      C.ok[i] = true; C.mark[i] = true; spotRender();
      fb('Hint: “' + sc.bits[i].t + '” ' + sc.bits[i].why, 'hint');
    };
    C.next = function () { if (last) finish(); else { C.j++; spotStep(); focusFirst(C.chips); } };
  }
  function spotRender() {
    var bits = C.chips.querySelectorAll('.fj-bit');
    C.lv.scenes[C.j].bits.forEach(function (b, i) {
      var x = bits[i]; x.classList.toggle('is-on', !!(C.mark[i] && !C.ok[i])); x.classList.toggle('is-story', !!C.ok[i]);
      x.setAttribute('aria-pressed', C.mark[i] || C.ok[i] ? 'true' : 'false');
      x.setAttribute('aria-label', b.t + (C.ok[i] ? ' (a story, found)' : C.mark[i] ? ' (marked as a story)' : ''));
    });
  }
  function spotCheck() {
    var sc = C.lv.scenes[C.j], wrong = -1, missed = 0, total = 0;
    sc.bits.forEach(function (b, i) {
      if (b.story) { total++; if (C.mark[i]) C.ok[i] = true; else missed++; }
      else if (C.mark[i]) { if (wrong < 0) wrong = i; C.mark[i] = false; }
    });
    spotRender();
    if (wrong < 0 && !missed) {
      C.solved = true; fb('All ' + total + ' stories found. The rest is what you actually saw and heard.', 'good'); react('yay'); chime(C.j + 3);
      var c = C.body.querySelector('.fj-check'); if (c) c.remove();
      nextBtn(C.j === C.lv.scenes.length - 1 ? 'Finish →' : 'Next scene →', C.next);
      return;
    }
    useHeart(wrong >= 0 ? 'That one really happened: “' + sc.bits[wrong].t + '” ' + sc.bits[wrong].why + (missed ? ' ' + (total - missed) + ' of ' + total + ' stories found so far.' : '')
      : (total - missed) + ' of ' + total + ' stories found. Look for words that guess at why, or at what’s inside someone.');
  }

  /* ---- the Harmony moment: choose the three lessons that meant most; they become stars in the sky */
  function allStars() {
    var out = [];
    WORLDS.forEach(function (W) { W.levels.forEach(function (lv, i) { out.push({ id: W.n + '-' + (i + 1), w: W.n, t: lv.star, lesson: lv.lesson }); }); });
    return out;
  }
  function starById(id) { return allStars().filter(function (s) { return s.id === id; })[0]; }
  function startHarmony() {
    clearTimers();
    G.w = 7; root.setAttribute('data-world', 7);
    C = { type: 'harmony', picks: (save.harmony || []).filter(starById), timers: [], done: false };
    G.react = null; G.parts = [];
    setMode('chal'); resize(); paintScene();
    titleK.textContent = 'World 7 · 963 Hz · Harmony';
    titleH.textContent = 'Before you rest';
    titleSub.textContent = PAL[0] + ' and ' + PAL[1] + ' made it. One gentle last step.';
    chalEl.innerHTML = '';
    chalEl.appendChild(txt('p', 'fj-ask', 'Look back along the path. Which three lessons meant the most to you? Choose three, and they’ll become stars in the sky.'));
    C.body = el('div', 'fj-cbody'); chalEl.appendChild(C.body);
    C.fb = el('p', 'fj-fb'); C.fb.setAttribute('aria-live', 'polite'); C.fb.setAttribute('role', 'status'); chalEl.appendChild(C.fb);
    var list = el('div', 'fj-harm'); list.setAttribute('role', 'group'); list.setAttribute('aria-label', 'Eighteen lessons');
    var lastW = 0;
    allStars().forEach(function (s) {
      if (s.w !== lastW) { lastW = s.w; list.appendChild(txt('p', 'fj-ck fj-harm-w', WORLDS[s.w - 1].short + ' · ' + WORLDS[s.w - 1].hz + ' Hz')); }
      var b = btn('fj-harm-b', s.t, function () {
        var k = C.picks.indexOf(s.id);
        if (k >= 0) C.picks.splice(k, 1);
        else if (C.picks.length < 3) { C.picks.push(s.id); note(963, C.picks.length + 2, 0.05); }
        else { fb('Three stars are chosen. Tap one of them to let it go first.', 'soft'); return; }
        harmRender();
      }, null);
      b.setAttribute('data-id', s.id); b.title = s.lesson;
      list.appendChild(b);
    });
    C.body.appendChild(list);
    var bar = el('div', 'fj-cbar');
    C.count = txt('span', 'fj-ck', ''); bar.appendChild(C.count);
    var tools = el('span', 'fj-cbar-tools');
    tools.appendChild(btn('fj-soft', 'Not now', function () { startSky(true); }));
    C.go = btn('fj-primary', 'Place them in the sky', function () {
      if (C.picks.length !== 3) return;
      save.harmony = C.picks.slice(); persist();
      if (SKY) SKY.special = null;
      react('hug'); pad(963, 0.06);
      setTimeout(function () { startSky(true); say('Your three stars are shining. Tap one to hear it again, or tap anywhere to add more.'); }, REDUCED ? 300 : 1300);
    });
    tools.appendChild(C.go); bar.appendChild(tools); chalEl.appendChild(bar);
    C.hint = null;
    harmRender();
    cv.setAttribute('aria-label', PAL[0] + ' and ' + PAL[1] + ', sitting together under the evening sky.');
    bringIntoView();
  }
  function harmRender() {
    C.body.querySelectorAll('.fj-harm-b').forEach(function (b) {
      var k = C.picks.indexOf(b.getAttribute('data-id'));
      b.setAttribute('aria-pressed', k >= 0 ? 'true' : 'false');
      b.classList.toggle('is-on', k >= 0);
    });
    C.count.textContent = C.picks.length + ' of 3 chosen';
    C.go.disabled = C.picks.length !== 3;
    fb(C.picks.length === 3 ? 'Three stars, ready to shine.' : '');
  }

  /* ---- the pals' little scene, above every challenge */
  function paintScene() {
    if (mode !== 'chal') return;
    var w = cv._w, h = cv._h, th = THEME[G.w], c = bctx;
    bg.width = Math.round(w * DPR); bg.height = Math.round(h * DPR); c.setTransform(DPR, 0, 0, DPR, 0, 0);
    var gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, th.sky[0]); gr.addColorStop(1, th.sky[1]); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    var s;
    if (G.w === 6 || G.w === 1) for (s = 0; s < 60; s++) blob(c, hash(s, 3) * w, hash(s, 5) * h * 0.7, 0.4 + hash(s, 7) * 1.1, '#FFFFFF', G.w === 6 ? 0.25 + hash(s, 9) * 0.55 : 0.08);
    if (G.w === 7) for (s = 0; s < 5; s++) cloud(c, hash(s, 21) * w, h * (0.12 + hash(s, 22) * 0.35), w * 0.06 * (0.6 + hash(s, 23)), 0.7);
    var gy = h * 0.74, T = Math.min(h * 0.44, 64);
    // soft hills
    c.fillStyle = G.w === 7 ? 'rgba(255,255,255,0.9)' : th.g2; c.beginPath(); c.moveTo(0, gy + 4); c.quadraticCurveTo(w * 0.25, gy - h * 0.1, w * 0.55, gy - 2); c.quadraticCurveTo(w * 0.8, gy + 4, w, gy - h * 0.06); c.lineTo(w, h); c.lineTo(0, h); c.fill();
    c.fillStyle = G.w === 7 ? '#FFFFFF' : th.g1; c.beginPath(); c.moveTo(0, gy + h * 0.06); c.quadraticCurveTo(w * 0.5, gy - h * 0.04, w, gy + h * 0.07); c.lineTo(w, h); c.lineTo(0, h); c.fill();
    for (s = 0; s < 18; s++) blob(c, hash(s, 31) * w, gy + h * 0.08 + hash(s, 32) * h * 0.16, 3 + hash(s, 33) * 8, G.w === 7 ? '#F4ECFA' : th.g2, 0.5);
    if (G.w === 3) for (s = 0; s < 22; s++) { var fx = hash(s, 41) * w, fy = gy + h * 0.06 + hash(s, 42) * h * 0.2; blob(c, fx, fy, 2.4, ['#F7A8C0', '#FFFFFF', '#FFD86E', '#C9B0F0'][s % 4], 0.95); blob(c, fx, fy, 0.9, '#F6C24A', 1); }
    // the world's own things, at both edges
    if (G.w <= 6) {
      var spots = w > 460 ? [0.02, 0.12, 0.8, 0.9] : [-0.02, 0.1, 0.78, 0.9];
      spots.forEach(function (fx, k) { var sc = k === 1 || k === 2 ? 0.8 : 1; paintWall(c, 40 + k * 7, fx * w, gy - T * sc * 0.86, T * sc, th); });
    }
    if (G.w === 4) { // a little bridge in the distance
      c.strokeStyle = 'rgba(160,110,90,0.45)'; c.lineWidth = 2; c.beginPath(); c.moveTo(w * 0.62, gy - h * 0.1); c.quadraticCurveTo(w * 0.7, gy - h * 0.04, w * 0.78, gy - h * 0.1); c.stroke();
    }
    c.save(); c.globalAlpha = th.dark ? 0.05 : 0.08; c.globalCompositeOperation = 'multiply'; c.fillStyle = c.createPattern(paper(), 'repeat'); c.fillRect(0, 0, w, h); c.restore();
  }
  var sceneBlink = [0, 0];
  function drawScene(t) {
    var c = ctx, w = cv._w, h = cv._h; if (!w) return;
    c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, w, h);
    c.drawImage(bg, 0, 0, w, h);
    var R = G.react, age = R ? t - R.t0 : 1e9, s = clamp(h / 132, 0.85, 1.15), base = h * 0.9;
    var hug = R && R.k === 'hug' && age < 3200, yay = R && R.k === 'yay' && age < 1300, hmm = R && R.k === 'hmm' && age < 1700, sing = R && R.k === 'note' && age < 600;
    var breath = C && C.type === 'breath' && C.t0 ? breathAt(t) : null;
    // a warm light behind the pals in the dark worlds
    if (THEME[G.w].dark) { var lg = c.createRadialGradient(w / 2, base - 26 * s, 4, w / 2, base - 26 * s, 90 * s); lg.addColorStop(0, 'rgba(255,220,160,0.42)'); lg.addColorStop(1, 'rgba(255,220,160,0)'); c.fillStyle = lg; c.fillRect(0, 0, w, h); }
    // the slow lantern
    if (C && C.type === 'breath') {
      var e = breath ? breath.e : 0.35, cx = w / 2, cy = h * 0.3, rMin = h * 0.07, rMax = h * 0.2, r = rMin + (rMax - rMin) * e;
      var lg2 = c.createRadialGradient(cx, cy, 2, cx, cy, r * 2.2); lg2.addColorStop(0, 'rgba(255,230,170,0.75)'); lg2.addColorStop(1, 'rgba(255,230,170,0)'); c.fillStyle = lg2; c.fillRect(cx - r * 2.3, cy - r * 2.3, r * 4.6, r * 4.6);
      c.setLineDash([3, 5]); c.strokeStyle = 'rgba(255,236,190,0.5)'; c.lineWidth = 1.4;
      c.beginPath(); c.arc(cx, cy, rMax, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(cx, cy, rMin, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      var g3 = c.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r); g3.addColorStop(0, '#FFFDF4'); g3.addColorStop(0.55, '#FFE3AE'); g3.addColorStop(1, '#F2C06A');
      c.fillStyle = g3; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
      if (C.hits) for (var k = 0; k < C.hits; k++) { var a = -Math.PI / 2 + k * Math.PI * 2 / C.lv.need; blob(c, cx + Math.cos(a) * (rMax + 10), cy + Math.sin(a) * (rMax + 10), 4, '#FFE3AE', 0.95); }
    }
    // the harmony sky: three stars rising
    if (C && C.type === 'harmony') {
      C.picks.forEach(function (id, k) { var px = w * [0.3, 0.5, 0.7][k], py = h * [0.28, 0.16, 0.28][k], tw = REDUCED ? 1 : 0.85 + 0.15 * Math.sin(t / 400 + k); blob(c, px, py, 12, '#FFF3C4', 0.4); star(c, px, py, 8 * tw, ['#F7C9D4', '#FFE3AE', '#D9C8F0'][k], 0.2); });
    }
    var gap = (hug ? 17 : 34) * s, ease = hug ? Math.min(1, age / 500) : 0;
    gap = 34 * s - (34 - 17) * s * (hug ? (0.5 - Math.cos(ease * Math.PI) / 2) : 0);
    for (var who = 0; who < 2; who++) {
      var face = who ? -1 : 1, x = w / 2 + (who ? gap : -gap), hop = 0, tilt = 0.08, rear = 0;
      if (yay && !REDUCED) hop = Math.abs(Math.sin(age / 150 + who * 0.6)) * 12 * s * (1 - age / 1300);
      if (sing && R.who === who && !REDUCED) hop = Math.sin(age / 600 * Math.PI) * 6 * s;
      if (hmm) tilt = 0.08 + 0.28 * Math.sin(Math.min(1, age / 350) * Math.PI / 2) * (age > 1300 ? (1700 - age) / 400 : 1);
      if (hug) rear = Math.sin(Math.min(1, age / 450) * Math.PI / 2) * 0.32 * (age > 2800 ? (3200 - age) / 400 : 1);
      if (breath && !REDUCED) hop += breath.e * 2.5 * s;
      if (t > sceneBlink[who] + 150) sceneBlink[who] = t + 2000 + Math.random() * 3500;
      var blink = t > sceneBlink[who] && t < sceneBlink[who] + 140;
      var wag = REDUCED ? 0.1 : Math.sin(t / (yay || hug ? 80 : 190) + who) * (yay || hug ? 0.6 : 0.3);
      c.fillStyle = THEME[G.w].dark ? 'rgba(0,0,0,0.3)' : 'rgba(60,40,70,0.16)';
      c.beginPath(); c.ellipse(x, base + 1, 20 * s * (1 - hop / 60), 4 * s, 0, 0, Math.PI * 2); c.fill();
      c.save(); c.translate(x - face * 6 * s, base - hop); c.scale(face * s * (who ? 0.96 : 1), s * (who ? 1.02 : 0.98)); c.rotate(-rear);
      drawPup(c, PUPS[who], 'sit', 0, wag, blink, t, tilt);
      c.restore();
    }
    if (hug && !REDUCED) { var q = (age % 1400) / 1400; heart(c, w / 2, base - 70 * s - q * 26 * s, 1.5 * s, '#EE8FA6', 0.95 * (1 - q)); }
    else if (hug) heart(c, w / 2, base - 72 * s, 1.5 * s, '#EE8FA6', 0.95);
    if (hmm) { var q2 = Math.min(1, age / 1200); heart(c, w / 2 + gap * (1 - q2 * 1.4), base - 56 * s - q2 * 10 * s, 0.9 * s, '#EE8FA6', 0.9 * (1 - q2 * 0.6)); }
    if (!hug && !hmm && !yay && Math.abs(gap) < 40 * s) { var bob = REDUCED ? 0 : Math.sin(t / 700) * 2; heart(c, w / 2, base - 64 * s + bob, 0.75 * s, '#EE8FA6', 0.55); }
    drawParts(c, t);
    breathCue(t);
  }

  /* ---- calls in the dark: plan clear calls from the lookout, then call them out */
  var ARW = ['↑', '→', '↓', '←'];
  function callWords(cl) { return DIRWORD[cl[0]] + ' ' + cl[1]; }
  function mazeUI() {
    G.calls = []; G.walking = false; G.badCall = -1;
    callsEl.innerHTML = '';
    callsEl.appendChild(txt('p', 'fj-ck', 'Your calls, from the lookout'));
    G.callList = el('ol', 'fj-calllist'); G.callList.setAttribute('aria-label', 'Your planned calls'); callsEl.appendChild(G.callList);
    var padx = el('div', 'fj-callpad'); padx.setAttribute('role', 'group'); padx.setAttribute('aria-label', 'Add a call');
    [3, 0, 2, 1].forEach(function (d) { padx.appendChild(btn('fj-cd', ARW[d], function () { addCall(d); }, 'Add a call: ' + DIRWORD[d])); });
    callsEl.appendChild(padx);
    var acts = el('div', 'fj-callacts');
    acts.appendChild(btn('fj-soft', 'Remove last', removeCall));
    acts.appendChild(btn('fj-soft fj-clearcalls', 'Clear', function () { if (G.walking) return; G.calls = []; G.badCall = -1; callsRender(); }));
    acts.appendChild(btn('fj-soft', 'Hint', mazeHint, 'A gentle hint'));
    callsEl.appendChild(acts);
    G.goBtn = btn('fj-primary fj-callgo', 'Call them out', mazeGo); callsEl.appendChild(G.goBtn);
    callsRender();
  }
  function addCall(d) {
    if (G.walking || G.won) return;
    wake();
    var lv = curLevel(), last = G.calls[G.calls.length - 1];
    if (last && last[0] === d) { if (last[1] < lv.maxRun) last[1]++; else { say('Six steps is the longest single call. Add another call after it.'); return; } }
    else if (G.calls.length < lv.maxCalls) G.calls.push([d, 1]);
    else { say('That’s ' + lv.maxCalls + ' calls, as many as ' + PAL[1] + ' can hold in mind at once. Try fewer, longer calls.'); return; }
    G.badCall = -1; tone(soft(852) * SCALE[G.calls.length % 6], 0, 0.25, 0.02); callsRender();
  }
  function removeCall() {
    if (G.walking || !G.calls.length) return;
    var last = G.calls[G.calls.length - 1]; if (last[1] > 1) last[1]--; else G.calls.pop();
    G.badCall = -1; callsRender();
  }
  function callsRender() {
    var lv = curLevel();
    G.callList.innerHTML = '';
    G.calls.forEach(function (cl, i) {
      var li = el('li');
      li.appendChild(btn('fj-callchip' + (i === G.badCall ? ' is-bad' : ''), ARW[cl[0]] + ' ' + cl[1], function () {
        if (G.walking) return; cl[1] = cl[1] % lv.maxRun + 1; G.badCall = -1; callsRender();
      }, 'Call ' + (i + 1) + ': ' + DIRWORD[cl[0]] + ' ' + cl[1] + (cl[1] === 1 ? ' step' : ' steps') + '. Tap for one more step.'));
      G.callList.appendChild(li);
    });
    if (!G.calls.length) G.callList.appendChild(txt('li', 'fj-callnone', 'No calls yet. Tap an arrow: tap it again for more steps.'));
    movesEl.textContent = G.calls.length + ' of ' + lv.maxCalls + ' calls';
    G.goBtn.disabled = !G.calls.length || G.walking;
    describe();
  }
  function mazeGo() {
    if (G.walking || G.won || !G.calls.length || mode !== 'play') return;
    wake();
    var res = J.mazeWalk(G.L, G.calls), p = G.pv[1], t = now(), seg = REDUCED ? 80 : 190, lead = REDUCED ? 100 : 450;
    G.walking = true; G.badCall = -1; callsRender();
    G.pv[0].happy = t;
    say('“' + G.calls.map(callWords).map(cap1).join('. ') + '!”');
    tone(soft(852) * 1.5, 0, 0.6, 0.03);
    p.walk = true; p.t0 = t + lead; p.seg = seg; p.path = res.path.length > 1 ? res.path : null; p.i = res.path[res.path.length - 1];
    res.path.forEach(function (_, k) { if (k) setTimeout(function () { tone(soft(852) * SCALE[k % 6], 0, 0.22, 0.014); }, lead + seg * k); });
    setTimeout(function () {
      if (mode !== 'play' || !G.maze) return;
      p.walk = false;
      if (res.won) { G.S = res.s; G.view = J.clone(G.S); G.won = true; G.walking = false; winLevel(); return; }
      var bounce = res.ev.some(function (e) { return e.t === 'bounce'; });
      if (res.stop >= 0) {
        var d = G.calls[res.stop][0];
        if (bounce) p.bounce = { t0: now(), d: d }; else if (!REDUCED) p.bump = { t0: now(), d: d };
        G.badCall = res.stop;
        say('Call ' + (res.stop + 1) + ' (' + callWords(G.calls[res.stop]) + ') led ' + (bounce ? 'onto a star that isn’t really there' : 'off the path') + '. ' + PAL[1] + ' hops safely back to the start. Change that call and try again.');
      } else say('The calls ran out before the tone. Add a few more; ' + PAL[1] + ' hops back to the start to listen again.');
      hmmTone();
      setTimeout(function () {
        if (mode !== 'play' || !G.maze) return;
        G.S = J.init(G.L); G.view = J.clone(G.S); p.path = null; p.i = G.S.b; p.bounce = null; p.bump = null;
        G.walking = false; callsRender(); paintStatic();
      }, REDUCED ? 500 : 1300);
    }, lead + seg * (res.path.length - 1) + 80);
  }
  function mazeHint() {
    if (G.walking || G.won) return;
    wake();
    var lv = curLevel(), res = J.mazeWalk(G.L, G.calls), upto = res.stop >= 0 ? res.stop : G.calls.length;
    if (res.won) { say('Those calls will do it. Tap “Call them out”.'); return; }
    var pre = J.mazeWalk(G.L, G.calls.slice(0, upto)), sol = J.mazeSolve(G.L, lv.maxRun, pre.s);
    if (!sol || !sol.length) { sol = J.mazeSolve(G.L, lv.maxRun); upto = 0; }
    if (!sol || !sol.length) return;
    if (res.stop >= 0) { G.badCall = res.stop; say('Hint: call ' + (res.stop + 1) + ' could be “' + callWords(sol[0]) + '”. Dashed stars aren’t really there.'); }
    else if (!G.calls.length) say('Hint: start with “' + callWords(sol[0]) + '”. About ' + sol.length + ' calls in all.');
    else say('Hint: after your calls, try “' + callWords(sol[0]) + '”.');
    callsRender();
  }
  // the planned route, drawn as the calling pal imagines it
  function drawRoute(c, t) {
    if (!G.calls || !G.calls.length || G.walking) return;
    var L = G.L, T = G.T, x = L.b % L.W, y = L.b / L.W | 0, pts = [[x, y]];
    G.calls.forEach(function (cl) { for (var k = 0; k < cl[1]; k++) { x = clamp(x + J.DIRS[cl[0]][0], 0, L.W - 1); y = clamp(y + J.DIRS[cl[0]][1], 0, L.H - 1); pts.push([x, y]); } });
    c.save(); c.strokeStyle = 'rgba(255,236,170,0.8)'; c.lineWidth = Math.max(2, T * 0.06); c.setLineDash([T * 0.1, T * 0.12]); c.lineCap = 'round'; c.lineJoin = 'round';
    c.lineDashOffset = REDUCED ? 0 : -t / 60;
    c.beginPath(); pts.forEach(function (p, k) { var px = p[0] * T + T / 2, py = p[1] * T + T / 2; if (k) c.lineTo(px, py); else c.moveTo(px, py); }); c.stroke();
    c.setLineDash([]); var e = pts[pts.length - 1]; blob(c, e[0] * T + T / 2, e[1] * T + T / 2, T * 0.14, '#FFE9A8', 0.9);
    c.restore();
  }

  /* ------------------------------------------------------------------ the Infinite Sky */
  var SKY = null;
  function startSky(force) {
    if (!force && !save.harmony) { startHarmony(); return; }
    save.skySeen = 1; persist();
    G.w = 7; root.setAttribute('data-world', 7);
    setMode('sky');
    var W = WORLDS[6];
    titleK.textContent = 'World 7 · ' + W.hz + ' Hz · ' + W.theme;
    titleH.textContent = W.name; titleSub.textContent = 'No goal here. Just be.';
    SKY = SKY || { stars: [], pals: [{ x: 0.36, y: 0.6, vx: 0, vy: 0, tx: 0.36, ty: 0.6, face: 1 }, { x: 0.62, y: 0.62, vx: 0, vy: 0, tx: 0.62, ty: 0.62, face: -1 }], turn: 0, rest: false, restT0: 0, hugAt: 0, calmSince: now(), clouds: [] , t0: now() };
    if (!SKY.clouds.length) for (var k = 0; k < 9; k++) SKY.clouds.push({ x: Math.random(), y: 0.12 + Math.random() * 0.8, s: 0.6 + Math.random() * 0.9, v: 0.000004 + Math.random() * 0.000008, a: 0.5 + Math.random() * 0.4 });
    resize(); drone();
    myStars(); bringIntoView();
    say('Tap anywhere in the sky to place a star that chimes. The pals will float over to play.');
    cv.setAttribute('aria-label', 'The Infinite Sky: soft clouds, and Sugarfoot and Tidbit floating together. Tap to place chiming stars.');
    if (!save.worldIntro[7]) { save.worldIntro[7] = 1; persist(); showCard({ k: 'World 7 · 963 Hz', h: 'The Infinite Sky', lesson: W.lessons[0], p: W.intro, btns: [['Float up', function () { hideCard(); }, true]] }); }
  }
  var SPECIAL = [[0.2, 0.13], [0.8, 0.15], [0.5, 0.37]];
  function skyTap(fx, fy) {
    wake();
    var S = SKY; if (!S) return;
    var mine = (save.harmony || []).map(starById);
    for (var k = 0; k < mine.length; k++) {
      if (mine[k] && Math.hypot((fx - SPECIAL[k][0]) * cv._w, (fy - SPECIAL[k][1]) * cv._h) < 26) {
        note(963, 4 + k, 0.07); S.glowAt = now(); S.glowK = k;
        say('★ ' + mine[k].t + '. A star from ' + WORLDS[mine[k].w - 1].name + '.'); return;
      }
    }
    var n = Math.round((1 - fy) * 9);
    S.stars.push({ x: fx, y: fy, t0: now(), n: n, rot: Math.random() }); if (S.stars.length > 28) S.stars.shift();
    note(963, clamp(n, 0, 9), 0.06);
    var who = S.turn; S.turn = 1 - S.turn;
    var p = S.pals[who], o = S.pals[1 - who];
    p.tx = clamp(fx, 0.1, 0.9); p.ty = clamp(fy + 0.06, 0.15, 0.9);
    setTimeout(function () { var side = o.x < p.tx ? -1 : 1; o.tx = clamp(p.tx + side * 0.13, 0.08, 0.92); o.ty = clamp(p.ty + 0.02, 0.15, 0.9); }, REDUCED ? 0 : 500);
    S.calmSince = now();
    if (S.rest) { /* in rest, stars still twinkle; the pals stay snuggled */ p.tx = p.x; p.ty = p.y; }
  }
  function myStars() {
    var mine = (save.harmony || []).map(starById).filter(Boolean);
    myStarsEl.innerHTML = '';
    if (!mine.length) { myStarsEl.hidden = true; return; }
    myStarsEl.appendChild(txt('p', 'fj-ck', 'Your three stars'));
    var ul = el('ul');
    mine.forEach(function (s) { ul.appendChild(txt('li', '', s.t)); });
    myStarsEl.appendChild(ul);
    myStarsEl.hidden = mode !== 'sky';
  }
  function setRest(on) {
    var S = SKY; if (!S) return;
    S.rest = on; S.restT0 = now();
    $('.fj-rest').setAttribute('aria-pressed', on ? 'true' : 'false');
    $('.fj-rest').textContent = on ? 'Back to play' : 'Rest here';
    breathEl.hidden = !on;
    if (on) { S.pals[0].tx = 0.42; S.pals[0].ty = 0.74; S.pals[1].tx = 0.58; S.pals[1].ty = 0.74; say('Resting together. Breathe in slowly as the circle grows, and out as it softens.'); }
    else say('Tap the sky to place chiming stars.');
  }
  function drawSky(t) {
    var c = ctx, W = cv._w, H = cv._h, S = SKY; if (!S) return;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, S.rest ? '#E9DDF4' : '#FCE3EC'); g.addColorStop(0.5, '#EDE3F8'); g.addColorStop(1, '#D8E9FB');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // the Perfect Frequency: a big gentle sun
    var sx = W * 0.5, sy = H * 0.2, pr = REDUCED ? 1 : 1 + Math.sin(t / 1800) * 0.05;
    var sg = c.createRadialGradient(sx, sy, 2, sx, sy, W * 0.32 * pr); sg.addColorStop(0, 'rgba(255,250,235,1)'); sg.addColorStop(0.25, 'rgba(255,236,200,0.8)'); sg.addColorStop(1, 'rgba(255,236,200,0)');
    c.fillStyle = sg; c.fillRect(0, 0, W, H * 0.6);
    if (!REDUCED) for (var k = 0; k < 3; k++) { var q = ((t / 5200) + k / 3) % 1; c.strokeStyle = 'rgba(255,220,190,' + (0.45 * (1 - q)) + ')'; c.lineWidth = 1.5; c.beginPath(); c.arc(sx, sy, W * (0.08 + q * 0.3), 0, Math.PI * 2); c.stroke(); }
    // clouds
    S.clouds.forEach(function (cl) {
      var x = ((cl.x + (REDUCED ? 0 : (t - S.t0) * cl.v)) % 1.3) - 0.15;
      cloud(c, x * W, cl.y * H, W * 0.12 * cl.s, cl.a);
    });
    // breathing circle while resting
    if (S.rest) {
      var cyc = 10000, q2 = ((t - S.restT0) % cyc) / cyc, inhale = q2 < 0.4, e = inhale ? q2 / 0.4 : 1 - (q2 - 0.4) / 0.6;
      e = 0.5 - Math.cos(e * Math.PI) / 2;
      var br = W * (0.14 + e * 0.12);
      c.fillStyle = 'rgba(255,255,255,0.28)'; c.beginPath(); c.arc(W / 2, H * 0.48, br, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(160,140,200,0.5)'; c.lineWidth = 2; c.stroke();
      var txt = inhale ? 'Breathe in…' : 'and slowly out…';
      if (breathEl.textContent !== txt) breathEl.textContent = txt;
    }
    // stars and the lines between them
    c.strokeStyle = 'rgba(190,160,220,0.35)'; c.lineWidth = 1; c.beginPath();
    S.stars.forEach(function (s, k) { if (k) { c.moveTo(S.stars[k - 1].x * W, S.stars[k - 1].y * H); c.lineTo(s.x * W, s.y * H); } }); c.stroke();
    S.stars.forEach(function (s) {
      var age = t - s.t0, grow = Math.min(1, age / 300), tw = REDUCED ? 1 : 0.8 + 0.2 * Math.sin(t / 400 + s.rot * 9);
      blob(c, s.x * W, s.y * H, 14 * grow, '#FFF3C4', 0.35);
      star(c, s.x * W, s.y * H, 7 * grow * tw, ['#F7C9D4', '#FFE3AE', '#D9C8F0', '#C7EBD6', '#C6DFF4'][s.n % 5], s.rot);
      star(c, s.x * W, s.y * H, 3 * grow, '#FFFFFF', s.rot);
    });
    // the three stars chosen in the Harmony moment
    var mine = (save.harmony || []).map(starById).filter(Boolean);
    if (mine.length) {
      c.strokeStyle = 'rgba(214,176,120,0.45)'; c.lineWidth = 1.2; c.setLineDash([2, 4]); c.beginPath();
      mine.forEach(function (_, k) { var p = SPECIAL[k]; if (k) c.lineTo(p[0] * W, p[1] * H); else c.moveTo(p[0] * W, p[1] * H); });
      if (mine.length === 3) c.closePath(); c.stroke(); c.setLineDash([]);
      mine.forEach(function (_, k) {
        var p = SPECIAL[k], x = p[0] * W, y = p[1] * H, tw = REDUCED ? 1 : 0.88 + 0.12 * Math.sin(t / 600 + k * 2), gl = S.glowK === k && t - S.glowAt < 1200 ? 1 - (t - S.glowAt) / 1200 : 0;
        blob(c, x, y, 20 + gl * 14, '#FFF3C4', 0.45 + gl * 0.3);
        star(c, x, y, 11 * tw + gl * 4, ['#F7B7C8', '#F6CB7A', '#C3A8F0'][k], 0.15);
        star(c, x, y, 4.5, '#FFFFFF', 0.15);
      });
    }
    // the pals
    var A = S.pals[0], B = S.pals[1], dt = 1;
    S.pals.forEach(function (p) {
      var ax = (p.tx - p.x) * 0.0016, ay = (p.ty - p.y) * 0.0016;
      p.vx = (p.vx + ax * 16) * 0.9; p.vy = (p.vy + ay * 16) * 0.9;
      if (REDUCED) { p.x += (p.tx - p.x) * 0.08; p.y += (p.ty - p.y) * 0.08; } else { p.x += p.vx; p.y += p.vy; }
    });
    var dist = Math.hypot((A.x - B.x) * W, (A.y - B.y) * H), still = Math.hypot(A.vx, A.vy) + Math.hypot(B.vx, B.vy) < 0.0006;
    if (still && dist < W * 0.2 && !S.rest && t - S.hugAt > 9000 && t - S.calmSince > 1500) S.hugAt = t;
    var hug = t - S.hugAt < 2600;
    var s = W / 360 * 1.05;
    [A, B].map(function (p, k) { return { p: p, k: k }; }).sort(function (a, b) { return a.p.y - b.p.y; }).forEach(function (o) {
      var p = o.p, k = o.k, other = S.pals[1 - k];
      var moving = Math.hypot(p.vx, p.vy) > 0.0009;
      if (moving && Math.abs(p.vx) > 0.0004) p.face = p.vx > 0 ? 1 : -1;
      else if (!moving) p.face = other.x > p.x ? 1 : -1;
      var bob = REDUCED ? 0 : Math.sin(t / 900 + k * 2) * 5, x = p.x * W, y = p.y * H + bob;
      // their little cloud
      cloud(c, x, y + 10 * s, 34 * s, 0.95);
      c.save(); c.translate(x - p.face * 6 * s, y); c.scale(p.face * s * (k ? 0.96 : 1), s * (k ? 1.02 : 0.98));
      var pose = S.rest ? 'lie' : moving ? 'run' : 'sit', rear = hug ? Math.sin(Math.min(1, (t - S.hugAt) / 400) * Math.PI / 2) * 0.35 : 0;
      c.rotate(-rear);
      drawPup(c, PUPS[k], pose, t / 110, REDUCED ? 0.1 : Math.sin(t / (hug ? 80 : 160) + k) * 0.5, false, t, S.rest ? 0.1 : 0);
      c.restore();
    });
    if (hug || S.rest) { var hx = (A.x + B.x) / 2 * W, hy = Math.min(A.y, B.y) * H - 58 * s, rise = REDUCED ? 0 : ((t / 30) % 30); heart(c, hx, hy - rise, 1.6 * s, '#EE8FA6', 0.9 - rise / 40); }
  }
  function cloud(c, x, y, r, a) {
    c.save(); c.globalAlpha = a * 0.35; c.fillStyle = '#E4D8F2'; c.beginPath(); c.ellipse(x, y + r * 0.5, r * 1.05, r * 0.16, 0, 0, Math.PI * 2); c.fill();
    c.globalAlpha = a; c.fillStyle = '#FFFFFF'; c.beginPath(); // one path, so overlaps don't show
    c.moveTo(x - r * 0.05, y); c.arc(x - r * 0.6, y, r * 0.55, 0, Math.PI * 2);
    c.moveTo(x + r * 0.7, y - r * 0.25); c.arc(x, y - r * 0.25, r * 0.7, 0, Math.PI * 2);
    c.moveTo(x + r * 1.12, y); c.arc(x + r * 0.62, y, r * 0.5, 0, Math.PI * 2);
    c.moveTo(x - r * 0.6, y); c.rect(x - r * 0.6, y - r * 0.05, r * 1.22, r * 0.55);
    c.fill('nonzero');
    c.restore();
  }

  /* ------------------------------------------------------------------ the journey map */
  var NODES = [[28, 124], [70, 106], [30, 88], [69, 70], [30, 52], [68, 34], [50, 13]];
  var ICONS = {
    1: '<svg viewBox="0 0 32 32"><circle cx="11" cy="15" r="7" fill="#2B4A40"/><circle cx="21" cy="13" r="7" fill="#3C6152"/><rect x="15" y="18" width="3" height="9" rx="1.5" fill="#5A4636"/><circle cx="24" cy="23" r="3" fill="#FFD99A"/></svg>',
    2: '<svg viewBox="0 0 32 32" fill="none" stroke="#6CA6CC" stroke-width="2.2" stroke-linecap="round"><path d="M16 4v24M5.6 10l20.8 12M5.6 22 26.4 10"/><path d="m13 6 3 3 3-3M13 26l3-3 3 3"/></svg>',
    3: '<svg viewBox="0 0 32 32"><g fill="#F7A8C0"><circle cx="16" cy="9" r="5"/><circle cx="23" cy="14" r="5"/><circle cx="20" cy="22" r="5"/><circle cx="12" cy="22" r="5"/><circle cx="9" cy="14" r="5"/></g><circle cx="16" cy="16" r="4.5" fill="#F6C24A"/></svg>',
    4: '<svg viewBox="0 0 32 32"><path d="M3 20c6-7 20-7 26 0" fill="none" stroke="#C98B6E" stroke-width="2.5"/><g fill="#D4AB7C"><rect x="5" y="18" width="4" height="7" rx="1"/><rect x="11" y="15" width="4" height="8" rx="1"/><rect x="17" y="15" width="4" height="8" rx="1"/><rect x="23" y="18" width="4" height="7" rx="1"/></g></svg>',
    5: '<svg viewBox="0 0 32 32"><path d="M10 28V12l4-5 4 5v16z" fill="#A993DA"/><path d="M18 28V16l3-4 3 4v12z" fill="#C5B4EC"/><path d="M5 28V18l2.5-3 2.5 3v10z" fill="#9ED6AE"/></svg>',
    6: '<svg viewBox="0 0 32 32"><path d="M2 28 12 12l5 7 4-5 9 14z" fill="#34386A"/><path d="m12 12-2.5 4h5z" fill="#E8E6FA"/><path d="m24 4 1.2 2.6 2.8.4-2 2 .5 2.8L24 10.5 21.5 11.8l.5-2.8-2-2 2.8-.4z" fill="#F8E7AE"/></svg>',
    7: '<svg viewBox="0 0 32 32"><circle cx="16" cy="13" r="6" fill="#FFE3AE"/><path d="M6 25a5 5 0 0 1 5-5 6 6 0 0 1 11 1 4 4 0 0 1 4 4z" fill="#fff" stroke="#E4D8F2"/></svg>'
  };
  var mapPalsC = null;
  function buildMap() {
    var trail = $('.fj-trail'), svg = trail.querySelector('svg');
    var stops = [['0', '#FDE6EE'], ['0.14', '#E6EAFB'], ['0.2', '#3A3A70'], ['0.3', '#4B4E88'], ['0.36', '#E9E1F8'], ['0.48', '#E3F2EC'], ['0.54', '#F6D6C6'], ['0.64', '#F4CDB8'], ['0.7', '#FBEFC0'], ['0.78', '#F4E6A8'], ['0.83', '#E3F1FA'], ['0.9', '#D3E6F2'], ['0.94', '#4A5C66'], ['1', '#34485A']];
    var d = 'M' + NODES[0][0] + ' 140 L' + NODES[0][0] + ' ' + NODES[0][1];
    for (var k = 1; k < NODES.length; k++) { var a = NODES[k - 1], b = NODES[k], my = (a[1] + b[1]) / 2; d += ' C' + a[0] + ' ' + my + ' ' + b[0] + ' ' + my + ' ' + b[0] + ' ' + b[1]; }
    var done = 0; for (k = 1; k <= 7; k++) if (worldDone(k)) done = k;
    var dd = 'M' + NODES[0][0] + ' 140 L' + NODES[0][0] + ' ' + NODES[0][1];
    for (k = 1; k <= Math.min(done, 6); k++) { var a2 = NODES[k - 1], b2 = NODES[k], m2 = (a2[1] + b2[1]) / 2; dd += ' C' + a2[0] + ' ' + m2 + ' ' + b2[0] + ' ' + m2 + ' ' + b2[0] + ' ' + b2[1]; }
    var deco = '';
    for (k = 0; k < 26; k++) { var sx = hash(k, 1) * 100, sy = 26 + hash(k, 2) * 20; deco += '<circle cx="' + sx.toFixed(1) + '" cy="' + sy.toFixed(1) + '" r="' + (0.25 + hash(k, 3) * 0.4).toFixed(2) + '" fill="#fff" opacity="' + (0.4 + hash(k, 4) * 0.5).toFixed(2) + '"/>'; }
    for (k = 0; k < 9; k++) { var tx = hash(k, 5) * 100, ty = 128 + hash(k, 6) * 12; deco += '<ellipse cx="' + tx.toFixed(1) + '" cy="' + ty.toFixed(1) + '" rx="5" ry="4" fill="#2B4A40" opacity=".55"/>'; }
    deco += '<ellipse cx="22" cy="10" rx="9" ry="2.6" fill="#fff" opacity=".8"/><ellipse cx="80" cy="18" rx="10" ry="2.8" fill="#fff" opacity=".7"/><circle cx="50" cy="13" r="12" fill="#FFF2D8" opacity=".55"/>';
    svg.innerHTML = '<defs><linearGradient id="fjg" x1="0" y1="0" x2="0" y2="1">' + stops.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"/>'; }).join('') + '</linearGradient></defs>' +
      '<rect width="100" height="140" fill="url(#fjg)"/>' + deco +
      '<path d="' + d + '" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="1.6" stroke-dasharray="1.6 2.4" stroke-linecap="round" vector-effect="non-scaling-stroke" style="stroke-width:4px"/>' +
      '<path d="' + dd + '" fill="none" stroke="#F6D77A" stroke-linecap="round" vector-effect="non-scaling-stroke" style="stroke-width:5px"/>';
    trail.querySelectorAll('.fj-node, .fj-mappals').forEach(function (n) { n.remove(); });
    var here = nextUp()[0];
    WORLDS.forEach(function (W, k) {
      var b = el('button', 'fj-node' + (NODES[k][0] > 50 ? ' is-right' : '') + (worldDone(W.n) ? ' is-done' : '') + (!worldOpen(W.n) ? ' is-locked' : '') + (W.n === here ? ' is-here' : ''));
      b.type = 'button'; b.style.left = NODES[k][0] + '%'; b.style.top = (NODES[k][1] / 140 * 100) + '%';
      var dots = W.levels.length ? W.levels.map(function (_, l) { return isDone(W.n, l + 1) ? '●' : '○'; }).join('') : (save.skySeen ? '★' : '☆');
      b.innerHTML = '<span class="fj-node-dot">' + ICONS[W.n] + '</span><span class="fj-node-l"><b>' + W.short + '</b><small>' + W.hz + ' Hz <i>' + dots + '</i></small></span>';
      b.setAttribute('aria-label', 'World ' + W.n + ', ' + W.name + ', ' + W.hz + ' hertz. ' + (worldDone(W.n) ? 'Finished.' : worldOpen(W.n) ? 'Open.' : 'Not reached yet.'));
      b.addEventListener('click', function () { wake(); showPanel(W.n); });
      // keep the label inside the trail on narrow screens
      if (NODES[k][0] > 50) b.style.transform = 'translate(calc(-100% + 26px), -50%)'; else b.style.transform = 'translate(-26px, -50%)';
      if (W.n === 7) b.style.transform = 'translate(-26px, -50%)';
      trail.appendChild(b);
    });
    // the two pals, waiting at the next world
    var pos = NODES[here - 1];
    mapPalsC = el('canvas', 'fj-mappals'); mapPalsC.setAttribute('aria-hidden', 'true');
    var pw = 76, ph = 44; mapPalsC.width = pw * DPR; mapPalsC.height = ph * DPR; mapPalsC.style.width = pw + 'px'; mapPalsC.style.height = ph + 'px';
    var right = pos[0] > 50;
    mapPalsC.style.left = (pos[0] + (right ? -2 : 2)) + '%'; mapPalsC.style.top = 'calc(' + (pos[1] / 140 * 100) + '% - 22px)';
    if (here === 7) { mapPalsC.style.left = '50%'; mapPalsC.style.top = 'calc(' + (pos[1] / 140 * 100) + '% + 66px)'; }
    var c = mapPalsC.getContext('2d'); c.setTransform(DPR, 0, 0, DPR, 0, 0);
    [[0, 22, 1], [1, 54, -1]].forEach(function (d) { c.save(); c.translate(d[1], 41); c.scale(d[2] * 0.62, 0.62); drawPup(c, PUPS[d[0]], 'sit', 0, 0.3, false, 0, 0.1); c.restore(); });
    heart(c, 38, 8, 0.9, '#EE8FA6', 0.95);
    trail.appendChild(mapPalsC);
    var n = countDone();
    $('.fj-progress').textContent = n ? n + ' of 18 levels found' + (worldDone(6) ? ' · the sky is open' : '') : 'Seven worlds, from a stormy forest up to the open sky.';
    var nx = nextUp();
    $('.fj-continue').textContent = !n ? 'Begin the journey' : nx[0] === 7 ? 'Float up to the Infinite Sky' : 'Continue: World ' + nx[0] + ', level ' + nx[1];
  }
  function showPanel(w) {
    var W = WORLDS[w - 1];
    panel.innerHTML = '';
    panel.appendChild(el('p', 'fj-k', 'World ' + w + ' · ' + W.hz + ' Hz · ' + W.theme));
    panel.appendChild(el('h3', '', W.name));
    if (!worldOpen(w)) {
      panel.appendChild(el('p', '', 'The pals haven’t reached this world yet. Finish ' + WORLDS[w - 2].name + ' to walk on.'));
    } else {
      panel.appendChild(el('p', '', W.intro));
      if (worldDone(w)) panel.appendChild(el('p', 'fj-panel-sum', W.summary));
      var box = el('div', 'fj-lv');
      if (!W.levels.length) {
        var sb = el('button', 'fj-go', 'Enter the sky'); sb.type = 'button'; sb.addEventListener('click', function () { startSky(); }); box.appendChild(sb);
        if (save.harmony) { var hb = el('button', '', 'Choose your three stars again'); hb.type = 'button'; hb.addEventListener('click', function () { wake(); startHarmony(); }); box.appendChild(hb); }
      }
      W.levels.forEach(function (lv, l) {
        var dn = isDone(w, l + 1), open = levelOpen(w, l + 1), b = el('button', 'fj-lvb' + (dn ? ' is-done' : ''));
        b.type = 'button';
        b.innerHTML = '<span class="fj-lvn">' + (dn ? '✓ ' : '') + 'Level ' + (l + 1) + '</span><span class="fj-lvk">' + esc(lv.kind) + '</span>' + leaves(lv.d);
        b.disabled = !open;
        b.setAttribute('aria-label', 'Level ' + (l + 1) + ': ' + lv.kind + ', difficulty ' + lv.d + ' of 5' + (dn ? ', finished, play again' : open ? '' : ', not open yet'));
        b.addEventListener('click', function () { wake(); startLevel(w, l + 1); });
        box.appendChild(b);
      });
      panel.appendChild(box);
    }
    if (worldOpen(w) && W.levels.length) panel.appendChild(el('p', 'fj-fresh', '<b>New set each time you play.</b> Fresh riddles, puzzles and boards on every visit, spread across the Five Pillars. Replay a level you’ve finished and it leans a little more thoughtful.'));
    panel.appendChild(el('p', 'fj-note', 'The tones are used here as calm themes for each world, not as a treatment.'));
    panel.hidden = false;
  }
  function showMap(focusWorld) {
    setMode('map');
    root.setAttribute('data-world', focusWorld || nextUp()[0]);
    titleK.textContent = 'The Frequency Journey';
    titleH.textContent = 'Journey map'; titleSub.textContent = 'Sugarfoot and Tidbit: seven worlds, one Perfect Frequency.';
    buildMap();
    showPanel(focusWorld || nextUp()[0]);
    if (!save.intro) {
      save.intro = true; persist();
      showCard({ k: 'The Frequency Journey', h: 'Two pals set out together',
        lesson: 'Somewhere above the clouds is the Perfect Frequency.',
        p: 'Sugarfoot and Tidbit are going to find it: through a stormy forest, over melting glaciers, across a golden meadow, a canyon, a singing valley and a starry summit. Every level is a different small challenge, from riddles to breathing to sorting out a tricky moment, and with each one they grow a little wiser. They’ll get there as themselves, and as pals, side by side.',
        btns: [['Begin', function () { hideCard(); startLevel(1, 1); }, true], ['Look at the map first', hideCard]] });
    }
  }

  function setMode(m) {
    if (m !== 'chal' && C) { clearTimers(); C = null; }
    mode = m;
    mapEl.hidden = m !== 'map'; playEl.hidden = m === 'map';
    btnMap.hidden = m === 'map';
    controls.hidden = !(m === 'play' && !G.maze); callsEl.hidden = !(m === 'play' && G.maze);
    movesEl.hidden = m !== 'play'; skybar.hidden = m !== 'sky';
    chalEl.hidden = m !== 'chal'; statusEl.hidden = m === 'chal'; sideEl.hidden = m === 'chal';
    myStarsEl.hidden = !(m === 'sky' && save.harmony);
    playEl.classList.toggle('is-sky', m === 'sky'); playEl.classList.toggle('is-chal', m === 'chal');
    breathEl.hidden = !(m === 'sky' && SKY && SKY.rest);
    if (m === 'map') stopDrone();
    kick();
  }

  function icon(n) {
    if (n === 'listen') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  }

  /* ------------------------------------------------------------------ input */
  var down = null;
  cv.addEventListener('pointerdown', function (e) {
    wake();
    down = { x: e.clientX, y: e.clientY, id: e.pointerId, t: now() };
    try { cv.setPointerCapture(e.pointerId); } catch (er) { }
  });
  cv.addEventListener('pointerup', function (e) {
    if (!down || down.id !== e.pointerId) return;
    var dx = e.clientX - down.x, dy = e.clientY - down.y, r = cv.getBoundingClientRect(); down = null;
    if (mode === 'sky') { skyTap((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); return; }
    if (mode === 'chal') { G.react = { k: 'note', t0: now(), who: (e.clientX - r.left) / r.width < 0.5 ? 0 : 1 }; return; }
    if (mode !== 'play' || G.maze) return;
    if (Math.hypot(dx, dy) >= 22) { move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)); return; }
    // a tap: on a pal selects it; elsewhere, one step toward the tap
    var px = (e.clientX - r.left) / r.width * G.L.W, py = (e.clientY - r.top) / r.height * G.L.H;
    var ti = Math.floor(py) * G.L.W + Math.floor(px);
    if (ti === G.S.a || ti === G.S.b) { var k = ti === G.S.a ? 0 : 1; if (G.together || k !== G.sel) switchPal(k); else { G.pv[k].happy = now(); } return; }
    var mine = G.together ? G.S[G.sel ? 'b' : 'a'] : G.S[G.sel ? 'b' : 'a'], mx = mine % G.L.W + 0.5, my = (mine / G.L.W | 0) + 0.5;
    var ddx = px - mx, ddy = py - my; if (Math.hypot(ddx, ddy) < 0.5) return;
    move(Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 1 : 3) : (ddy > 0 ? 2 : 0));
  });
  cv.addEventListener('pointercancel', function () { down = null; });
  root.querySelectorAll('.fj-pad [data-dir]').forEach(function (b) { b.addEventListener('click', function () { move(+b.getAttribute('data-dir')); }); });
  $('.fj-switch').addEventListener('click', function () { switchPal(); });
  $('.fj-switch2').addEventListener('click', function () { switchPal(); });
  btnTog.addEventListener('click', function () { wake(); G.together = !G.together; updateTogether(); say(G.together ? 'Together: both pals move the same way at once.' : 'Now guiding ' + PAL[G.sel] + '.'); });
  $('.fj-undo').addEventListener('click', undo);
  $('.fj-restart').addEventListener('click', restart);
  btnHint.addEventListener('click', hint);
  btnSpecial.addEventListener('click', function () { if (G.L && G.L.melody.length) playMelody(); else lookClosely(); });
  btnMap.addEventListener('click', function () { hideCard(); showMap(G.w); });
  $('.fj-continue').addEventListener('click', function () { wake(); var nx = nextUp(); if (nx[0] === 7) startSky(); else startLevel(nx[0], nx[1]); });
  $('.fj-rest').addEventListener('click', function () { wake(); setRest(!(SKY && SKY.rest)); });
  $('.fj-clear').addEventListener('click', function () { if (SKY) SKY.stars = []; say('A clear sky again.'); });
  $('.fj-tomap').addEventListener('click', function () { showMap(7); });
  $('.fj-stars3').addEventListener('click', function () { wake(); startHarmony(); });
  function setToggle(b, on) { b.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  setToggle(btnSnd, save.sound); setToggle(btnDrone, save.drone);
  btnSnd.addEventListener('click', function () {
    save.sound = !save.sound; persist(); setToggle(btnSnd, save.sound);
    if (save.sound) { wake(); drone(); } else stopDrone();
  });
  btnDrone.addEventListener('click', function () {
    save.drone = !save.drone; persist(); setToggle(btnDrone, save.drone);
    if (save.drone) { wake(); drone(); } else stopDrone();
  });
  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var tg = e.target, tag = tg && tg.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (tg && tg.isContentEditable)) return;
    if (!cardEl.hidden) { if (e.key === 'Escape') { var bb = cardEl.querySelectorAll('.fj-card-btns button'); if (bb.length) bb[bb.length - 1].click(); } return; }
    var r = root.getBoundingClientRect(); if (r.bottom < 0 || r.top > window.innerHeight) return;
    if (mode === 'chal') { if (C && C.key && !C.done && C.key(e)) e.preventDefault(); return; }
    if (mode !== 'play') return;
    var k = e.key, map = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3 };
    if (G.maze) {
      if (k in map) { e.preventDefault(); addCall(map[k]); return; }
      if (k === 'Enter' && tag !== 'BUTTON') { e.preventDefault(); mazeGo(); return; }
      if (k === 'Backspace' || k === 'z' || k === 'Z') { e.preventDefault(); removeCall(); return; }
      if (k === 'h' || k === 'H') mazeHint();
      return;
    }
    if (k in map) { e.preventDefault(); move(map[k]); return; }
    if (k === 'e' || k === 'E' || k === 'q' || k === 'Q') { switchPal(); return; }
    if (k === 't' || k === 'T') { btnTog.click(); return; }
    if (k === 'z' || k === 'Z' || k === 'u' || k === 'U' || k === 'Backspace') { e.preventDefault(); undo(); return; }
    if (k === 'r' || k === 'R') { restart(); return; }
    if (k === 'h' || k === 'H') { hint(); return; }
    if (k === 'l' || k === 'L') { if (!btnSpecial.hidden) btnSpecial.click(); }
  });
  var rt = 0;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (mode === 'play') { resize(); paintStatic(); } else if (mode === 'sky') resize(); else if (mode === 'chal') { resize(); paintScene(); } }, 120); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); else if (AC && AC.state === 'running') { /* the browser quiets it */ } });

  // A small hook for testing and for curious people: nothing is sent anywhere.
  window.TOLJourneyGame = {
    state: function () {
      var lv = G.w <= 6 ? curLevel() : null;
      return { mode: mode, w: G.w, l: G.l, type: lv && lv.type, kind: lv && lv.kind, d: lv && lv.d, a: G.S && G.S.a, b: G.S && G.S.b, moves: G.moves, won: G.won,
        together: G.together, sel: G.sel, card: !cardEl.hidden, hist: G.hist.length, calls: G.maze && G.calls ? G.calls.map(function (c) { return c.slice(); }) : null, walking: !!G.walking,
        chal: C ? { type: C.type, done: C.done, hearts: C.hearts, i: C.i, j: C.j, len: C.len, pos: C.pos, playing: !!C.playing, hits: C.hits, picks: C.picks } : null,
        harmony: save.harmony, done: Object.keys(save.done).length, set: G.lv && G.lv.id === G.w + '-' + G.l ? G.lv.set.slice() : null };
    },
    // the set drawn for this play (a copy), and what this browser has seen so far
    level: function () { return G.lv ? JSON.parse(JSON.stringify(G.lv)) : null; },
    seen: function () { return JSON.parse(JSON.stringify(save.seen || {})); },
    act: function (who, d) { if (animating()) finishAnims(); move(d, who); },
    start: startLevel, map: showMap, sky: function (force) { startSky(force); }, harmony: function () { startHarmony(); },
    finish: function () { if (animating()) finishAnims(); },
    // ms until the next "full" or "empty" moment of the slow lantern
    breathNext: function () {
      if (!C || C.type !== 'breath' || !C.t0) return null;
      var lv = C.lv, cyc = lv.inhale + lv.exhale, s = (now() - C.t0) / 1000, p = ((s % cyc) + cyc) % cyc;
      return Math.min(p <= lv.inhale ? lv.inhale - p : cyc - p + lv.inhale, cyc - p) * 1000;
    }
  };

  /* ------------------------------------------------------------------ begin */
  root.hidden = false;
  // ?world=N opens straight at that world (its next unfinished level), if the pals have reached it
  var qw = parseInt((location.search.match(/[?&]world=(\d+)/) || [])[1], 10);
  if (qw >= 1 && qw <= 7 && save.intro && worldOpen(qw)) {
    if (qw === 7) startSky();
    else { var ql = 1; while (ql <= 3 && isDone(qw, ql)) ql++; startLevel(qw, ql > 3 ? 1 : ql); }
  } else showMap(qw >= 1 && qw <= 7 ? qw : undefined);
})();
