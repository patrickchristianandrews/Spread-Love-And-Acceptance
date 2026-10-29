/* coin-pusher-sfx.js — every sound in the Kindness Coin Pusher (/coin-pusher.html), made with WebAudio. No files, nothing sent.
   The same rules as game-sfx.js: the audio context is made (or woken) only after the player's own tap or key press, nothing
   plays while the page is hidden, Quiet mode (window.TOLQuiet.sound()) keeps it silent unless the player turns sound on here,
   and everything stops on pagehide. A soft limiter and a warm top cut keep it gentle, and at most 26 voices sound at once.
   window.TOLCoinSfx = { config({on, vol, amb, music}), gesture(), play(name, arg), hum(level), pitch(mult), suspend(), resume(), ready(), names }
   Names: drop, clink(v), land(v), thud(v), tray(i), collect(i), jackpot, prize(rarity), tip, nap, zoom, goal, gift, set, finale, ui, step, back */
(function () {
  'use strict';
  if (window.TOLCoinSfx) return;
  var doc = document;
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, bus = null, ambBus = null, musBus = null, humO = null, humG = null, noiseBuf = null;
  var cfg = { on: false, vol: 0.7, amb: true, music: false }, gestured = false, hidden = !!doc.hidden, suspended = false, active = 0, pm = 1;
  var lastClink = 0, clinkBurst = 0, musTimer = 0, musNext = 0, musStep = 0, humTarget = 0;
  function allowed() { try { if (window.TOLQuiet && typeof window.TOLQuiet.sound === 'function') return !!window.TOLQuiet.sound(); } catch (e) {} return !doc.documentElement.classList.contains('tol-quiet'); }
  // sound plays when the player has it on, and when the site's Quiet mode does not forbid it (or the player turned it on here on purpose)
  function wants() { return !!cfg.on && gestured && !hidden && !suspended; }

  function make() {
    if (ctx || !AC) return ctx;
    try {
      ctx = new AC();
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.knee.value = 16; comp.ratio.value = 3.2; comp.attack.value = 0.004; comp.release.value = 0.2;
      var soft = ctx.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 6200; soft.Q.value = 0.5;
      master = ctx.createGain(); master.gain.value = vol();
      bus = ctx.createGain(); bus.gain.value = 0.9; ambBus = ctx.createGain(); ambBus.gain.value = cfg.amb ? 1 : 0; musBus = ctx.createGain(); musBus.gain.value = 0.34;
      bus.connect(soft); ambBus.connect(soft); musBus.connect(soft); soft.connect(comp); comp.connect(master); master.connect(ctx.destination);
      // the machine's hum: a low, slow pair of tones, louder when the shelf is moving
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; lp.Q.value = 0.4;
      humG = ctx.createGain(); humG.gain.value = 0;
      humO = [55, 55.6, 110.4].map(function (f, i) { var o = ctx.createOscillator(); o.type = i === 2 ? 'sine' : 'triangle'; o.frequency.value = f; var g = ctx.createGain(); g.gain.value = i === 2 ? 0.25 : 1; o.connect(g); g.connect(lp); o.start(); return o; });
      lp.connect(humG); humG.connect(ambBus);
      var lfo = ctx.createOscillator(); lfo.frequency.value = 0.18; var lg = ctx.createGain(); lg.gain.value = 0.004; lfo.connect(lg); lg.connect(humG.gain); lfo.start();
    } catch (e) { ctx = null; }
    return ctx;
  }
  function vol() { return Math.max(0, Math.min(1, cfg.vol)) * 0.9; }
  function wake() {
    if (!wants() || !make()) return null;
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }
  function noise() {
    if (noiseBuf) return noiseBuf;
    var n = Math.floor(ctx.sampleRate * 0.8), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), last = 0;
    for (var i = 0; i < n; i++) { last = last * 0.5 + (Math.random() * 2 - 1) * 0.5; d[i] = last; }
    noiseBuf = b; return b;
  }
  function jit(v, a) { return v * (1 + (Math.random() * 2 - 1) * (a == null ? 0.04 : a)); }
  // one soft voice: frequency, start offset, attack, total length, peak, wave, optional glide target
  function voice(f, at, att, len, peak, type, f2, dest) {
    if (active > 26) return;
    var t = ctx.currentTime + 0.005 + (at || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f * pm, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2 * pm), t + len * 0.85);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(dest || bus); o.start(t); o.stop(t + len + 0.04); active++; o.onended = function () { active--; };
  }
  function hiss(at, len, peak, freq, q, f2, type) {
    if (active > 26) return;
    var t = ctx.currentTime + 0.005 + (at || 0), s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise(); bp.type = type || 'bandpass'; bp.frequency.setValueAtTime(freq, t); bp.Q.value = q || 1; if (f2) bp.frequency.exponentialRampToValueAtTime(f2, t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + len * 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(bp); bp.connect(g); g.connect(bus); s.start(t, Math.random() * 0.3); s.stop(t + len + 0.03); active++; s.onended = function () { active--; };
  }
  function bell(f, at, len, peak) { voice(f, at, 0.006, len, peak, 'sine'); voice(f * 2.0, at, 0.004, len * 0.5, peak * 0.22, 'sine'); voice(f * 3.01, at, 0.003, len * 0.28, peak * 0.07, 'sine'); }
  var PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093];
  function pn(i) { return PENTA[Math.max(0, Math.min(PENTA.length - 1, i | 0))]; }
  var TIMBRES = [2350, 2780, 3150, 3620];   // four different coins, so a rattle never repeats one note

  var SND = {
    // the coin leaves the slot
    drop: function () { hiss(0, 0.07, 0.07, 1500, 1.2, 2800); voice(jit(640), 0, 0.003, 0.05, 0.05, 'sine', 420); },
    // coin on coin: a short metallic clink, a little different every time; v 0-1 is how hard
    clink: function (v) {
      v = Math.max(0.12, Math.min(1, v || 0.5)); var f = jit(TIMBRES[(Math.random() * 4) | 0], 0.07), p = 0.05 + 0.1 * v;
      voice(f, 0, 0.001, 0.05 + 0.1 * v, p, 'sine'); voice(f * 2.76, 0, 0.001, 0.035 + 0.05 * v, p * 0.5, 'sine'); voice(f * 5.4, 0, 0.001, 0.02, p * 0.2, 'sine');
    },
    // a coin settling onto the felt: a soft tick and a very small thud
    land: function (v) { v = Math.max(0.15, Math.min(1, v || 0.5)); var f = jit(1700 + Math.random() * 900); voice(f, 0, 0.001, 0.05, 0.045 * v + 0.02, 'sine'); voice(f * 1.5, 0, 0.001, 0.03, 0.02 * v, 'triangle'); voice(jit(150), 0, 0.002, 0.07, 0.05 * v, 'sine', 90); },
    thud: function (v) { v = Math.max(0.2, Math.min(1, v || 0.6)); voice(jit(128), 0, 0.003, 0.2, 0.2 * v, 'sine', 62); hiss(0, 0.09, 0.1 * v, 420, 0.8, 200, 'lowpass'); },
    // a coin or a prize over the edge into the tray: a little rattle that falls in pitch
    tray: function (i) { var b = 1 + ((i | 0) % 3) * 0.06; [0, 0.05, 0.1].forEach(function (d, k) { var f = jit(TIMBRES[(Math.random() * 4) | 0] * (1 - k * 0.12) * b, 0.05); voice(f, d, 0.001, 0.09, 0.07 - k * 0.015, 'sine'); voice(f * 2.76, d, 0.001, 0.05, 0.03, 'sine'); }); voice(jit(170), 0.1, 0.002, 0.09, 0.07, 'sine', 100); },
    // the rising chime: one more note up the scale for every coin in the same cascade
    collect: function (i) { i = Math.max(0, i | 0); bell(pn(i % 10 + (i >= 10 ? 1 : 0)), 0, 0.55 + Math.min(0.4, i * 0.03), 0.085 + Math.min(0.03, i * 0.004)); },
    // a short, bright fanfare and a little shower of clinks
    jackpot: function () {
      [0, 2, 4, 5].forEach(function (n, k) { bell(pn(n + 2), k * 0.11, 0.55, 0.12); voice(pn(n) , k * 0.11, 0.01, 0.4, 0.05, 'triangle'); });
      [0, 2, 4].forEach(function (n) { voice(pn(n + 5), 0.5, 0.02, 0.9, 0.05, 'sine'); }); bell(pn(9), 0.52, 0.9, 0.1);
      hiss(0.45, 0.5, 0.06, 4200, 1.4, 6500);
      for (var k = 0; k < 7; k++) (function (k) { setTimeout(function () { if (ctx && wants()) SND.clink(0.5 + Math.random() * 0.4); }, 150 + k * 95); })(k);
    },
    prize: function (r) { r = Math.max(1, Math.min(4, r | 0)); for (var k = 0; k < 2 + r; k++) bell(pn(k * 1 + 2), k * 0.085, 0.5, 0.1); if (r >= 3) bell(pn(9), 0.4, 0.8, 0.07); },
    tip: function () { bell(659.25, 0, 0.5, 0.1); bell(987.77, 0.11, 0.7, 0.09); },
    nap: function () { [392, 329.63, 261.63, 329.63, 392, 261.63].forEach(function (f, k) { voice(f * 0.5, k * 0.42, 0.04, 1.1, 0.07, 'sine'); voice(f * 1.003, k * 0.42, 0.05, 1.0, 0.03, 'triangle'); }); },
    zoom: function () { [0, 2, 4, 5, 7, 9].forEach(function (n, k) { voice(pn(n), k * 0.065, 0.004, 0.2, 0.07, 'triangle'); voice(pn(n) * 2, k * 0.065, 0.003, 0.12, 0.02, 'sine'); }); },
    goal: function () { bell(pn(4), 0, 0.5, 0.1); bell(pn(7), 0.1, 0.7, 0.1); },
    gift: function () { [0, 2, 4, 6].forEach(function (n, k) { bell(pn(n + 1), k * 0.08, 0.7, 0.1); }); hiss(0, 0.45, 0.05, 3800, 1.4, 6000); },
    set: function () { [0, 2, 4, 5, 7].forEach(function (n, k) { bell(pn(n + 1), k * 0.12, 0.8, 0.11); }); bell(pn(9), 0.7, 1.2, 0.1); voice(261.63, 0.7, 0.05, 1.6, 0.05, 'triangle'); },
    finale: function () { SND.set(); setTimeout(function () { if (ctx && wants()) SND.jackpot(); }, 900); },
    ui: function () { voice(jit(720), 0, 0.003, 0.07, 0.07, 'sine'); },
    step: function () { voice(jit(1250), 0, 0.002, 0.03, 0.025, 'sine'); },   // aiming
    back: function () { voice(jit(520), 0, 0.003, 0.1, 0.05, 'sine', 380); }
  };

  function play(name, arg) {
    var fn = SND[name]; if (!fn) return false;
    if (!wake() || !master) return false;
    if (name === 'clink' || name === 'land') {   // a rattle is many clinks: keep it musical, not a wall of noise
      var now = ctx.currentTime; if (now - lastClink > 0.25) clinkBurst = 0; if (now - lastClink < 0.028 || clinkBurst > 10) return false; lastClink = now; clinkBurst++;
    }
    try { fn(arg); return true; } catch (e) { return false; }
  }
  // the hum follows how fast the shelf is moving (0-1)
  function hum(level) {
    humTarget = level;
    if (!ctx || !humG) return;
    var on = wants() && cfg.amb, v = on ? 0.012 + 0.03 * Math.max(0, Math.min(1, level)) : 0;
    try { humG.gain.setTargetAtTime(v, ctx.currentTime, 0.25); } catch (e) {}
  }
  function startMusic() {
    if (musTimer || !ctx) return; musNext = ctx.currentTime + 0.15; musStep = 0;
    musTimer = setInterval(musTick, 80);
  }
  function stopMusic() { if (musTimer) { clearInterval(musTimer); musTimer = 0; } }
  // a slow music-box tune over soft chords
  var CH = [[174.61, 220, 261.63, 329.63], [146.83, 174.61, 220, 261.63], [196, 233.08, 293.66, 349.23], [130.81, 164.81, 233.08, 293.66]];
  var TUNE = [880, 0, 1046.5, 880, 783.99, 0, 698.46, 0, 659.25, 698.46, 0, 880, 783.99, 0, 0, 0, 587.33, 0, 698.46, 880, 932.33, 0, 880, 0, 783.99, 0, 659.25, 0, 698.46, 0, 0, 0];
  function musTick() {
    if (!ctx || hidden || suspended || !cfg.music || !wants()) { musNext = ctx ? ctx.currentTime + 0.2 : 0; return; }
    var beat = 60 / 72;
    while (musNext < ctx.currentTime + 0.3) {
      var bar = Math.floor(musStep / 8) % 4, s8 = musStep % 8, at = musNext - ctx.currentTime;
      if (s8 === 0 || s8 === 5) CH[bar].forEach(function (f) { voice(f, at, 0.04, s8 === 0 ? 2.0 : 1.1, 0.03, 'sine', 0, musBus); });
      var n = TUNE[musStep % 32]; if (n) { voice(n * 2, at, 0.003, 0.7, 0.028, 'sine', 0, musBus); voice(n * 4.02, at, 0.002, 0.25, 0.006, 'sine', 0, musBus); }
      musNext += beat / 2; musStep++;
    }
  }

  function apply() {
    if (!ctx) { if (cfg.on && gestured) wake(); return; }
    try {
      master.gain.setTargetAtTime(cfg.on ? vol() : 0, ctx.currentTime, 0.05); ambBus.gain.setTargetAtTime(cfg.amb ? 1 : 0, ctx.currentTime, 0.2);
      if (!cfg.on || !cfg.amb) humG.gain.setTargetAtTime(0, ctx.currentTime, 0.1); else hum(humTarget);
    } catch (e) {}
    if (cfg.music && cfg.on) startMusic(); else stopMusic();
  }
  function onGesture() { gestured = true; if (cfg.on) { wake(); apply(); } }
  ['pointerdown', 'touchend', 'keydown', 'click'].forEach(function (ev) { doc.addEventListener(ev, onGesture, { capture: true, passive: true }); });
  doc.addEventListener('visibilitychange', function () {
    hidden = !!doc.hidden; if (!ctx) return;
    try { if (hidden) ctx.suspend(); else if (cfg.on && !suspended) ctx.resume(); } catch (e) {}
  });
  window.addEventListener('pagehide', function () { hidden = true; stopMusic(); if (ctx) { try { ctx.close(); } catch (e) {} } ctx = null; master = null; bus = null; humG = null; noiseBuf = null; active = 0; });
  window.addEventListener('pageshow', function () { hidden = !!doc.hidden; });

  window.TOLCoinSfx = {
    config: function (o) { if (o) { for (var k in o) cfg[k] = o[k]; } apply(); },
    gesture: onGesture,
    play: play,
    hum: hum,
    pitch: function (m) { pm = m || 1; },
    suspend: function () { suspended = true; if (ctx) { try { ctx.suspend(); } catch (e) {} } },
    resume: function () { suspended = false; if (ctx && cfg.on && !hidden) { try { ctx.resume(); } catch (e) {} } },
    ready: function () { return !!ctx && wants(); },
    allowed: allowed,
    names: Object.keys(SND)
  };
})();
