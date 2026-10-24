/* game-sfx.js — small, soft sound effects shared by the games (window.TOLSfx).
   Every sound is made right here with WebAudio: no files to download, nothing sent anywhere.
   - One audio context for the page, made (or woken) only after the player's own tap or key press,
     so nothing ever plays before the first touch (the autoplay rules on phones).
   - The "Sounds: on/off" switch is shared by every game and remembered on this device (tol-sfx).
     Sounds start on, except with the site's Quiet mode or "site sounds off" (window.TOLQuiet.sound()):
     then they stay off unless the player turns them on in a game.
   - Nothing plays while the page is hidden, and everything stops on pagehide.
   - Calm games (TOLSfx.calm(true)) get a softer, lower set.
   Use: TOLSfx.play('correct'), TOLSfx.play('letter', { step: 3 }), TOLSfx.button({ className: 'x' }) */
(function () {
  'use strict';
  if (window.TOLSfx) return;
  var KEY = 'tol-sfx', doc = document;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  // the site's own switch: false with Quiet mode or "site sounds off" in Settings
  function siteAllows() {
    try { if (window.TOLQuiet && typeof window.TOLQuiet.sound === 'function') return !!window.TOLQuiet.sound(); } catch (e) {}
    try { return lsGet('tol-quiet') !== '1' && lsGet('tol-sound-off') !== '1' && !doc.documentElement.classList.contains('tol-quiet'); } catch (e) { return true; }
  }
  // 'off', 'on', or 'quiet-on' (turned on in a game while Quiet mode was on)
  function pref() { return lsGet(KEY); }
  function enabled() { var v = pref(); if (v === 'off') return false; return siteAllows() ? true : v === 'quiet-on'; }
  if (pref() === 'quiet-on' && siteAllows()) lsSet(KEY, 'on');

  var ctx = null, master = null, soft = null, gestured = false, calm = false, hidden = !!doc.hidden;
  var AC = window.AudioContext || window.webkitAudioContext;
  function make() {
    if (ctx || !AC) return ctx;
    try {
      ctx = new AC();
      // a soft limiter and a gentle top cut keep every sound warm and never sharp
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.knee.value = 18; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.2;
      soft = ctx.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = calm ? 3200 : 5200; soft.Q.value = 0.5;
      master = ctx.createGain(); master.gain.value = level();
      master.connect(soft); soft.connect(comp); comp.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }
  function level() { return calm ? 0.16 : 0.26; }
  function wake() {
    if (!enabled()) return null;
    if (!make()) return null;
    if (ctx.state === 'suspended' && !hidden) { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }
  // the first tap or key press (capture phase, so it runs before the game's own handler)
  function onGesture() { gestured = true; if (enabled()) wake(); }
  ['pointerdown', 'touchend', 'keydown', 'click'].forEach(function (ev) { doc.addEventListener(ev, onGesture, { capture: true, passive: true }); });
  doc.addEventListener('visibilitychange', function () {
    hidden = !!doc.hidden; if (!ctx) return;
    try { if (hidden) ctx.suspend(); else if (enabled()) ctx.resume(); } catch (e) {}
  });
  window.addEventListener('pagehide', function () {
    hidden = true;
    if (ctx) { try { ctx.close(); } catch (e) {} } ctx = null; master = null; soft = null;
  });
  window.addEventListener('pageshow', function () { hidden = !!doc.hidden; });

  // ---------- building blocks ----------
  var noiseBuf = null;
  function noise() {
    if (noiseBuf) return noiseBuf;
    var n = Math.floor(ctx.sampleRate * 0.6), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), last = 0;
    for (var i = 0; i < n; i++) { last = last * 0.55 + (Math.random() * 2 - 1) * 0.45; d[i] = last; } // a soft, slightly pink hiss
    noiseBuf = b; return b;
  }
  function jit(v) { return v * (1 + (Math.random() * 2 - 1) * 0.03); } // a little pitch variation, so repeats don't grate
  // one soft voice: f (Hz), start delay, attack, length, peak, wave, optional glide to f2
  function voice(f, at, att, len, peak, type, f2) {
    var t = ctx.currentTime + 0.01 + (at || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + len * 0.8);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + len + 0.05);
  }
  // a warm bell: a round fundamental, a quiet octave and a breath of a higher partial
  function bell(f, at, len, peak) {
    voice(f, at, 0.008, len, peak, 'sine');
    voice(f * 2.0, at, 0.006, len * 0.55, peak * 0.22, 'sine');
    voice(f * 3.01, at, 0.004, len * 0.3, peak * 0.06, 'sine');
  }
  function pluck(f, at, len, peak) { voice(f, at, 0.006, len, peak, 'triangle'); voice(f * 2, at, 0.004, len * 0.4, peak * 0.15, 'sine'); }
  function hiss(at, len, peak, freq, q, f2) {
    var t = ctx.currentTime + 0.01 + (at || 0), s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(freq, t); bp.Q.value = q || 1;
    if (f2) bp.frequency.exponentialRampToValueAtTime(f2, t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + len * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(bp); bp.connect(g); g.connect(master); s.start(t); s.stop(t + len + 0.05);
  }
  // a major pentatonic from C5: every pair of notes sits well together
  var PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];
  function pn(i) { i = Math.max(0, Math.min(PENTA.length - 1, i | 0)); return PENTA[i]; }

  var SOUNDS = {
    tap: function () { voice(jit(720), 0, 0.004, 0.07, 0.18, 'sine'); },
    tick: function () { voice(jit(1250), 0, 0.002, 0.035, 0.07, 'sine'); },
    pick: function () { bell(jit(880), 0, 0.16, 0.2); },
    place: function () { voice(jit(240), 0, 0.004, 0.13, 0.32, 'triangle', 170); voice(jit(980), 0, 0.002, 0.04, 0.05, 'sine'); },
    flip: function () { hiss(0, 0.11, 0.22, jit(1800), 1.4, 3200); voice(jit(520), 0.02, 0.004, 0.06, 0.06, 'sine'); },
    letter: function (o) { var s = (o && o.step) || 0; pluck(jit(pn(s)), 0, 0.22, 0.2); },
    correct: function () { bell(jit(659.25), 0, 0.3, 0.2); bell(jit(987.77), 0.09, 0.38, 0.18); },
    // a soft "not quite": two low notes that settle, never a buzzer
    wrong: function () { voice(jit(392), 0, 0.02, 0.2, 0.16, 'sine'); voice(jit(329.63), 0.12, 0.02, 0.3, 0.14, 'sine'); },
    word: function () { [0, 2, 4].forEach(function (n, i) { bell(jit(pn(n)), i * 0.08, 0.36, 0.17); }); },
    'level-up': function () { [0, 2, 4, 5].forEach(function (n, i) { bell(pn(n), i * 0.1, 0.42, 0.17); }); },
    win: function () {
      [0, 2, 4, 5, 7].forEach(function (n, i) { bell(pn(n), i * 0.12, 0.5, 0.16); });
      bell(pn(5), 0.7, 0.8, 0.14); bell(pn(7), 0.7, 0.8, 0.1); bell(pn(9), 0.74, 0.7, 0.06);
    },
    coin: function () { bell(jit(987.77), 0, 0.12, 0.17); bell(jit(1318.51), 0.07, 0.32, 0.17); },
    pop: function () { voice(jit(700), 0, 0.003, 0.1, 0.22, 'sine', 260); hiss(0, 0.06, 0.08, 1500, 2); },
    whoosh: function () { hiss(0, 0.38, 0.28, jit(500), 0.8, 2400); },
    bounce: function () { voice(jit(330), 0, 0.004, 0.16, 0.26, 'sine', 180); },
    hit: function () { voice(jit(130), 0, 0.003, 0.18, 0.4, 'sine', 70); hiss(0, 0.08, 0.16, 900, 1); },
    cheer: function () {
      hiss(0, 0.85, 0.16, 1100, 0.6, 1500); hiss(0.08, 0.7, 0.1, 2200, 0.8, 1800);
      [0, 2, 4].forEach(function (n, i) { bell(pn(n + 2), 0.12 + i * 0.1, 0.4, 0.09); });
    },
    star: function () { [7, 8, 9].forEach(function (n, i) { bell(jit(pn(n)), i * 0.07, 0.35, 0.09); }); },
    unlock: function () { bell(pn(2), 0, 0.6, 0.15); bell(pn(4), 0.05, 0.6, 0.12); bell(pn(6), 0.12, 0.55, 0.1); }
  };
  SOUNDS.levelup = SOUNDS['level-up'];

  // play a sound. opts: { step } for 'letter', { vol } to scale it down (0..1)
  function play(name, opts) {
    var fn = SOUNDS[name]; if (!fn) return false;
    if (!gestured || hidden || doc.hidden || !enabled()) return false;
    if (!wake() || !master) return false;
    try {
      var v = opts && opts.vol != null ? Math.max(0, Math.min(1, opts.vol)) : 1;
      if (v !== 1) { var keep = master, g = ctx.createGain(); g.gain.value = v; g.connect(keep); master = g; try { fn(opts); } finally { master = keep; } }
      else fn(opts);
      return true;
    } catch (e) { return false; }
  }

  // ---------- the switch ----------
  var buttons = [];
  function paint(b) {
    var on = enabled();
    b.setAttribute('aria-pressed', String(on));
    b.innerHTML = '<span aria-hidden="true">' + (on ? '&#128276;' : '&#128277;') + '</span> ' + (b.getAttribute('data-sfx-label') || 'Sounds') + ': ' + (on ? 'on' : 'off');
    b.title = on ? 'Tap to turn the game sounds off' : (!siteAllows() ? 'Quiet mode is on for this site. Tap to hear the game sounds anyway' : 'Tap to turn the game sounds on');
  }
  function paintAll() { buttons.forEach(paint); }
  function set(on) {
    lsSet(KEY, on ? (siteAllows() ? 'on' : 'quiet-on') : 'off');
    if (on) { gestured = true; wake(); } else if (ctx) { try { ctx.suspend(); } catch (e) {} }
    paintAll();
    try { doc.dispatchEvent(new CustomEvent('tol-sfx', { detail: { on: enabled() } })); } catch (e) {}
  }
  // wire a button (or make one): { className, label, parent, before }
  function button(opts) {
    opts = opts || {};
    var b = opts.el || doc.createElement('button');
    if (!opts.el) { b.type = 'button'; }
    b.className = ((b.className ? b.className + ' ' : '') + 'tol-sfx-btn ' + (opts.className || '')).trim();
    if (opts.label) b.setAttribute('data-sfx-label', opts.label);
    b.addEventListener('click', function () { set(!enabled()); if (enabled()) play('tap'); });
    buttons.push(b); paint(b);
    if (opts.parent) { if (opts.before && opts.before.parentNode === opts.parent) opts.parent.insertBefore(b, opts.before); else opts.parent.appendChild(b); }
    return b;
  }
  // Quiet mode switched on (here or in another tab): fall silent, unless the player turns sounds on again here
  function onQuiet() {
    if (!siteAllows() && pref() === 'quiet-on') lsSet(KEY, 'off');
    if (!enabled() && ctx) { try { ctx.suspend(); } catch (e) {} }
    paintAll();
  }
  doc.addEventListener('tol-quiet', onQuiet); window.addEventListener('tol-quiet', onQuiet);
  window.addEventListener('storage', function (e) { if (!e || !e.key || e.key === KEY || e.key === 'tol-quiet' || e.key === 'tol-sound-off') paintAll(); });

  // the switch needs a 44px target wherever it sits
  try {
    var st = doc.createElement('style');
    st.textContent = '.tol-sfx-btn{min-height:44px;min-width:44px;}';
    (doc.head || doc.documentElement).appendChild(st);
  } catch (e) {}

  window.TOLSfx = {
    play: play,
    on: enabled,
    set: set,
    button: button,
    calm: function (v) { calm = !!v; if (master && ctx) { master.gain.value = level(); soft.frequency.value = calm ? 3200 : 5200; } },
    names: Object.keys(SOUNDS),
    get ctx() { return ctx; }
  };
})();
