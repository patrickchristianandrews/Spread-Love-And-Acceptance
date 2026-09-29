/* pals-cam-music.js — gentle music for the pal cam, made fresh as it plays (the same soft, warm style as
   the Frequency Buddies movies). Every scene has its own style: key, pace, instruments and brightness.
   It keeps writing new chord changes and little melodies, so it never loops the same way twice, and it
   plays through the pal cam's one audio channel, so it starts reliably on phones too. Softer at night.
   On unless the viewer turns it off with the 🎵 Music button (remembered on this device only), or turns on
   Quiet mode. Nothing is sent anywhere. */
(function () {
  'use strict';
  // scale shapes (semitones from the root)
  var MODES = { major: [0, 2, 4, 5, 7, 9, 11], lydian: [0, 2, 4, 6, 7, 9, 11], mixo: [0, 2, 4, 5, 7, 9, 10], dorian: [0, 2, 3, 5, 7, 9, 10], minor: [0, 2, 3, 5, 7, 8, 10], penta: [0, 2, 4, 7, 9, 12, 14] };
  // each scene: root note, mode, beats per minute, lead and accent voices, how busy, filter brightness, echo
  var STYLES = {
    backyard: { root: 60, mode: 'major', bpm: 76, lead: 'flute', accent: 'pluck', busy: 0.55, bright: 2600, wet: 0.28 },
    beach: { root: 57, mode: 'major', bpm: 62, lead: 'marimba', accent: 'pluck', busy: 0.4, bright: 2200, wet: 0.4 },
    snow: { root: 64, mode: 'lydian', bpm: 58, lead: 'bell', accent: 'bell', busy: 0.35, bright: 3200, wet: 0.45 },
    pond: { root: 62, mode: 'major', bpm: 66, lead: 'marimba', accent: 'pluck', busy: 0.45, bright: 2400, wet: 0.35 },
    forest: { root: 55, mode: 'dorian', bpm: 64, lead: 'flute', accent: 'pluck', busy: 0.45, bright: 2000, wet: 0.38 },
    rooftop: { root: 58, mode: 'mixo', bpm: 80, lead: 'piano', accent: 'pluck', busy: 0.55, bright: 2600, wet: 0.3 },
    meadow: { root: 60, mode: 'lydian', bpm: 70, lead: 'flute', accent: 'bell', busy: 0.5, bright: 2800, wet: 0.32 },
    dock: { root: 57, mode: 'mixo', bpm: 60, lead: 'piano', accent: 'marimba', busy: 0.38, bright: 2000, wet: 0.4 },
    citypark: { root: 62, mode: 'major', bpm: 84, lead: 'piano', accent: 'pluck', busy: 0.6, bright: 2800, wet: 0.26 },
    pumpkins: { root: 57, mode: 'dorian', bpm: 68, lead: 'marimba', accent: 'pluck', busy: 0.5, bright: 2100, wet: 0.32 },
    cabin: { root: 55, mode: 'major', bpm: 60, lead: 'piano', accent: 'bell', busy: 0.4, bright: 1900, wet: 0.35 },
    rainy: { root: 57, mode: 'minor', bpm: 58, lead: 'piano', accent: 'bell', busy: 0.35, bright: 1800, wet: 0.45 },
    carnival: { root: 60, mode: 'major', bpm: 92, lead: 'marimba', accent: 'bell', busy: 0.65, bright: 3000, wet: 0.25 },
    library: { root: 62, mode: 'major', bpm: 60, lead: 'piano', accent: 'pluck', busy: 0.32, bright: 1900, wet: 0.3 },
    bakery: { root: 60, mode: 'mixo', bpm: 78, lead: 'piano', accent: 'marimba', busy: 0.55, bright: 2500, wet: 0.28 },
    gardenparty: { root: 65, mode: 'major', bpm: 80, lead: 'flute', accent: 'bell', busy: 0.6, bright: 3000, wet: 0.3 },
    campsite: { root: 55, mode: 'mixo', bpm: 64, lead: 'pluck', accent: 'flute', busy: 0.45, bright: 2000, wet: 0.36 },
    lighthouse: { root: 57, mode: 'dorian', bpm: 56, lead: 'bell', accent: 'marimba', busy: 0.35, bright: 2200, wet: 0.48 },
    underwater: { root: 53, mode: 'lydian', bpm: 52, lead: 'bell', accent: 'marimba', busy: 0.3, bright: 1500, wet: 0.55 },
    space: { root: 52, mode: 'lydian', bpm: 50, lead: 'bell', accent: 'bell', busy: 0.28, bright: 2600, wet: 0.6 },
    farm: { root: 62, mode: 'major', bpm: 82, lead: 'flute', accent: 'pluck', busy: 0.55, bright: 2600, wet: 0.28 },
    orchard: { root: 57, mode: 'major', bpm: 70, lead: 'marimba', accent: 'flute', busy: 0.5, bright: 2300, wet: 0.32 },
    festival: { root: 60, mode: 'major', bpm: 88, lead: 'bell', accent: 'marimba', busy: 0.62, bright: 3000, wet: 0.35 },
    aquarium: { root: 55, mode: 'lydian', bpm: 56, lead: 'marimba', accent: 'bell', busy: 0.35, bright: 1700, wet: 0.5 },
    studio: { root: 62, mode: 'mixo', bpm: 84, lead: 'piano', accent: 'marimba', busy: 0.6, bright: 2700, wet: 0.24 },
    bonfire: { root: 55, mode: 'mixo', bpm: 62, lead: 'pluck', accent: 'flute', busy: 0.4, bright: 1900, wet: 0.38 },
    treehouse: { root: 62, mode: 'major', bpm: 74, lead: 'flute', accent: 'marimba', busy: 0.55, bright: 2600, wet: 0.3 },
    theater: { root: 60, mode: 'major', bpm: 58, lead: 'piano', accent: 'bell', busy: 0.28, bright: 1700, wet: 0.35, soft: 0.6 }
  };
  var DEFAULT_STYLE = STYLES.backyard;
  // which chord (scale degree) tends to follow which: a gentle, never-quite-the-same walk
  var NEXT = { 0: [3, 4, 5, 1, 3], 1: [4, 4, 3, 6], 2: [5, 3, 0], 3: [0, 4, 1, 5, 0], 4: [0, 5, 3, 0, 2], 5: [3, 1, 4, 0], 6: [0, 4] };
  var LEVEL = 1.15, FADE = 2.2;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function quietNow() { try { return !!(window.TOLQuiet && window.TOLQuiet.on && window.TOLQuiet.on()); } catch (e) { return false; } }
  var enabled = lsGet('tol-pc-music') !== 'off' && !quietNow();
  var scene = null, hour = 12, running = false, timer = 0;
  var A = null; // the audio graph, built once on the shared pal cam audio context
  var M = { next: 0, beat: 0, deg: 0, bars: 0, phrase: [], pi: 0, style: DEFAULT_STYLE };

  function ctx() { return window.__pcAudio || null; }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
  function night() { return hour < 6 || hour >= 20.5; }

  function build() {
    var c = ctx(); if (!c) return null;
    if (A && A.c === c) return A;
    var out = c.createGain(); out.gain.value = 0.0001;
    var comp = c.createDynamicsCompressor(); comp.threshold.value = -24; comp.knee.value = 18; comp.ratio.value = 3; comp.attack.value = 0.02; comp.release.value = 0.4;
    var tone = c.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2400; tone.Q.value = 0.3;
    var dry = c.createGain(), wet = c.createGain(), verb = c.createConvolver();
    // a soft room: a few seconds of fading noise makes a warm, gentle echo
    var len = Math.floor(c.sampleRate * 3.2), ir = c.createBuffer(2, len, c.sampleRate);
    for (var ch = 0; ch < 2; ch++) { var d = ir.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    verb.buffer = ir;
    var bus = c.createGain(); bus.gain.value = 1;
    bus.connect(tone); tone.connect(dry); tone.connect(verb); verb.connect(wet); dry.connect(comp); wet.connect(comp); comp.connect(out); out.connect(c.destination);
    A = { c: c, out: out, bus: bus, tone: tone, dry: dry, wet: wet };
    return A;
  }
  function env(g, t, a, peak, hold, rel) {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  }
  // ---------- the instruments ----------
  function osc(type, f, t, stop) { var o = A.c.createOscillator(); o.type = type; o.frequency.value = f; o.start(t); o.stop(stop); return o; }
  function pad(f, t, len, vol) {
    [[-6, 'triangle', 0.55], [5, 'sine', 0.7], [0, 'sine', 0.35]].forEach(function (v, k) {
      var o = osc(v[1], k === 2 ? f * 2 : f, t, t + len + 2.4), g = A.c.createGain(); o.detune.value = v[0];
      env(g, t, Math.min(2.2, len * 0.4), vol * v[2], len * 0.5, 2); o.connect(g); g.connect(A.bus);
    });
  }
  function bass(f, t, len, vol) { var o = osc('sine', f, t, t + len + 1), g = A.c.createGain(); env(g, t, 0.08, vol, len * 0.5, len * 0.45); o.connect(g); g.connect(A.bus); }
  function pluck(f, t, vol) { var o = osc('triangle', f, t, t + 1.4), g = A.c.createGain(); env(g, t, 0.008, vol, 0.02, 1.1); o.connect(g); g.connect(A.bus); }
  function marimba(f, t, vol) {
    [[1, 1], [4, 0.18], [10, 0.05]].forEach(function (p) { var o = osc('sine', f * p[0], t, t + 1.2), g = A.c.createGain(); env(g, t, 0.004, vol * p[1], 0.01, p[0] > 1 ? 0.25 : 0.9); o.connect(g); g.connect(A.bus); });
  }
  function bell(f, t, vol) {
    [[1, 1, 2.4], [2.76, 0.28, 1.4], [5.4, 0.1, 0.7]].forEach(function (p) { var o = osc('sine', f * p[0], t, t + p[2] + 0.2), g = A.c.createGain(); env(g, t, 0.005, vol * p[1], 0.02, p[2]); o.connect(g); g.connect(A.bus); });
  }
  function flute(f, t, len, vol) {
    var o = osc('sine', f, t, t + len + 0.8), g = A.c.createGain(), lfo = osc('sine', 5.2, t, t + len + 0.8), lg = A.c.createGain();
    lg.gain.value = f * 0.006; lfo.connect(lg); lg.connect(o.frequency); // a little vibrato
    env(g, t, 0.12, vol, Math.max(0.05, len - 0.2), 0.5); o.connect(g); g.connect(A.bus);
  }
  function piano(f, t, vol) {
    [[1, 1, 'triangle'], [2, 0.3, 'sine'], [3, 0.1, 'sine']].forEach(function (p) { var o = osc(p[2], f * p[0], t, t + 2.6), g = A.c.createGain(); env(g, t, 0.006, vol * p[1], 0.05, 2.2 / p[0]); o.connect(g); g.connect(A.bus); });
  }
  function play(voice, f, t, len, vol) {
    if (voice === 'flute') flute(f, t, len, vol * 0.8); else if (voice === 'marimba') marimba(f, t, vol); else if (voice === 'bell') bell(f, t, vol * 0.7);
    else if (voice === 'piano') piano(f, t, vol * 0.9); else pluck(f, t, vol);
  }
  // ---------- the composer ----------
  function scale(st) { return MODES[st.mode] || MODES.major; }
  function note(st, deg, oct) { var sc = scale(st), n = sc.length, d = ((deg % n) + n) % n, o = Math.floor(deg / n); return st.root + sc[d] + 12 * (o + (oct || 0)); }
  function chordOf(st, deg) { return [note(st, deg, -1), note(st, deg + 2, -1), note(st, deg + 4, -1), note(st, deg + 6, -1)]; }
  function newPhrase(st) {
    // a short tune: steps and small leaps on the scale, with rests; sometimes a variation of the last one
    var len = 4 + Math.floor(Math.random() * 5), p = [], pos = Math.floor(Math.random() * 5);
    if (M.phrase.length && Math.random() < 0.35) { // echo the last tune, moved a step, so it feels composed
      var sh = rnd([-2, -1, 1, 2]); return M.phrase.map(function (x) { return x ? { d: x.d + sh, b: x.b } : null; });
    }
    for (var i = 0; i < len; i++) {
      if (Math.random() < 0.22) { p.push(null); continue; }
      pos += rnd([-2, -1, -1, 0, 1, 1, 2, 3, -3]); pos = Math.max(-2, Math.min(9, pos));
      p.push({ d: pos, b: rnd([1, 1, 2, 2, 0.5, 1.5]) });
    }
    return p;
  }
  function schedule() {
    var c = ctx(); if (!running || !A || !c || c.state !== 'running') return;
    var st = M.style, beat = 60 / (st.bpm * (night() ? 0.88 : 1)), soft = (st.soft || 1) * (night() ? 0.75 : 1);
    if (M.next < c.currentTime) M.next = c.currentTime + 0.1;
    while (M.next < c.currentTime + 0.8) {
      var t = M.next;
      if (M.beat % 4 === 0) { // a new bar: sometimes a new chord (a walk that never loops exactly)
        if (M.bars % 2 === 0) M.deg = rnd(NEXT[M.deg] || [0]);
        M.bars++;
        var ch = chordOf(st, M.deg);
        ch.forEach(function (n, i) { pad(hz(n), t, beat * 4 * (M.bars % 2 ? 1 : 2) * 0.95, (i ? 0.012 : 0.016) * soft); });
        if (Math.random() < 0.85) bass(hz(ch[0] - 12), t, beat * 2, 0.03 * soft);
        if (!M.phrase.length || M.pi >= M.phrase.length) { M.phrase = Math.random() < st.busy + 0.2 ? newPhrase(st) : []; M.pi = 0; }
      }
      // the tune, one note at a time
      if (M.phrase.length && M.pi < M.phrase.length && M.beat % (M.hold || 1) === 0) {
        var x = M.phrase[M.pi++];
        if (x) { play(st.lead, hz(note(st, x.d, 0)), t + (Math.random() - 0.5) * 0.02, beat * x.b, 0.03 * soft); M.hold = Math.max(1, Math.round(x.b)); }
        else M.hold = 1;
      }
      // little sparkles in between
      if (Math.random() < st.busy * 0.35) play(st.accent, hz(note(st, M.deg + rnd([0, 2, 4, 7]), 1)), t + beat * rnd([0.5, 0.25, 0.75]), beat, 0.016 * soft);
      M.beat++; M.next = t + beat;
    }
  }
  function applyStyle(id) {
    var st = STYLES[id] || DEFAULT_STYLE; M.style = st;
    if (!A) return;
    var c = A.c, now = c.currentTime;
    A.tone.frequency.setTargetAtTime(st.bright * (night() ? 0.7 : 1), now, 1.5);
    A.wet.gain.setTargetAtTime(st.wet, now, 1.5); A.dry.gain.setTargetAtTime(1 - st.wet * 0.5, now, 1.5);
  }
  function start() {
    var c = ctx();
    if (!enabled || !scene || document.hidden || quietNow()) { stopNow(); return; }
    if (!c) return;
    if (c.state === 'suspended' && c.resume) { try { var pr = c.resume(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} }
    build(); applyStyle(scene);
    A.out.gain.cancelScheduledValues(c.currentTime); A.out.gain.setTargetAtTime(LEVEL, c.currentTime, FADE / 3);
    if (!running) { M.next = c.currentTime + 0.15; M.beat = 0; M.bars = 0; M.phrase = []; M.pi = 0; M.deg = 0; }
    running = true;
    if (!timer) timer = setInterval(schedule, 200);
    schedule();
  }
  function stopNow(secs) {
    running = false;
    if (A) { var c = A.c; try { A.out.gain.cancelScheduledValues(c.currentTime); A.out.gain.setTargetAtTime(0.0001, c.currentTime, (secs || FADE) / 3); } catch (e) {} }
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) stopNow(0.6); else if (scene) start(); });
  window.addEventListener('tol-quiet', function () { if (quietNow()) stopNow(0.8); else if (scene && enabled) start(); });

  window.TOLPalsCamMusic = {
    scene: function (id, h) { scene = id; if (h != null) hour = +h; start(); },   // a scene opened
    stop: function () { scene = null; stopNow(); },                               // the cam closed
    pause: function () { stopNow(0.6); },
    resume: function () { if (scene && enabled) start(); },
    on: function () { return enabled && !quietNow(); },
    has: function (id) { return true; },                                          // every scene has music now
    set: function (v) { enabled = !!v; lsSet('tol-pc-music', enabled ? 'on' : 'off'); if (enabled) start(); else stopNow(); return enabled; },
    toggle: function () { return this.set(!enabled); },
    tracks: function () { return Object.keys(STYLES); },
    playing: function () { return running; },
    _graph: function () { return A; }
  };
})();
