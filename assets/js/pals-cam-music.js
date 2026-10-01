/* pals-cam-music.js — gentle music for the pal cam, made fresh as it plays, in the same style as the
   Frequency Buddies movies: warm chords, little plucked sparkles and a soft tune that comes back like a
   chorus. Every place has a mood to match it (sunny for the backyard, cozy by the fire, dreamy under the
   sea or the stars, a bit of adventure in the woods, playful at the carnival), its own key and its own
   instrument for the tune. Softer and calmer at night. It plays through the pal cam's one audio channel, so
   it starts reliably on phones too. On unless the viewer turns it off with the 🎵 Music button (remembered
   on this device only), or turns on Quiet mode. Nothing is sent anywhere. */
(function () {
  'use strict';
  // The same kind of music as the Frequency Buddies movies: warm pads walking through a real chord
  // progression, little plucked sparkles on top of each chord, and a soft tune that comes back like a chorus.
  // Each mood is a song form: an A part (heard twice), a B part, then A again, so it feels written, not random.
  var MOODS = {
    sunny: { p: 3.4, scale: 'major', arp: 0.85, A: [[48, 55, 64, 67], [43, 50, 59, 67], [45, 52, 60, 64], [41, 48, 57, 65]], B: [[41, 48, 57, 64], [43, 50, 59, 62], [40, 47, 55, 64], [45, 52, 60, 64]] },
    gentle: { p: 4.8, scale: 'major', arp: 0.35, A: [[48, 55, 64, 71], [45, 52, 60, 67], [41, 48, 57, 64], [43, 50, 59, 62]], B: [[41, 48, 57, 64], [40, 47, 55, 62], [45, 52, 60, 67], [43, 50, 59, 65]] },
    cozy: { p: 5.2, scale: 'major', arp: 0.3, A: [[48, 55, 64, 71], [40, 47, 55, 64], [41, 48, 57, 64], [48, 55, 64, 67]], B: [[45, 52, 60, 64], [41, 48, 57, 60], [43, 50, 55, 62], [43, 50, 59, 65]] },
    dreamy: { p: 5.6, scale: 'lydian', arp: 0.25, A: [[48, 55, 64, 71], [50, 57, 62, 66], [48, 55, 64, 71], [45, 52, 59, 64]], B: [[41, 48, 57, 64], [43, 50, 57, 62], [40, 47, 55, 59], [50, 57, 62, 66]] },
    adventure: { p: 3.8, scale: 'dmajor', arp: 0.7, pulse: 0.6, A: [[50, 57, 62, 66], [45, 52, 61, 64], [47, 54, 62, 66], [43, 50, 59, 62]], B: [[43, 50, 59, 62], [45, 52, 61, 64], [47, 54, 62, 66], [50, 57, 62, 66]] },
    playful: { p: 3.0, scale: 'major', arp: 1, pulse: 0.45, A: [[48, 55, 64, 67], [45, 52, 60, 64], [41, 48, 57, 65], [43, 50, 59, 67]], B: [[41, 48, 57, 65], [43, 50, 59, 67], [40, 47, 55, 64], [45, 52, 60, 64]] },
    mellow: { p: 5.4, scale: 'major', arp: 0.2, A: [[45, 52, 60, 64], [41, 48, 57, 60], [48, 55, 60, 64], [43, 50, 55, 59]], B: [[41, 48, 57, 64], [43, 50, 59, 62], [45, 52, 60, 64], [45, 52, 60, 64]] }
  };
  var SCALES = { major: [0, 2, 4, 5, 7, 9, 11], lydian: [0, 2, 4, 6, 7, 9, 11], dmajor: [1, 2, 4, 6, 7, 9, 11] };
  // each place: its mood, key (semitones from C), the instrument that sings the tune, tone brightness, echo
  function S(mood, key, lead, bright, wet, soft) { return { mood: mood, key: key, lead: lead, bright: bright, wet: wet, soft: soft || 1 }; }
  var STYLES = {
    backyard: S('sunny', 0, 'flute', 2600, 0.28), meadow: S('sunny', 0, 'flute', 2800, 0.32), gardenparty: S('sunny', 5, 'flute', 3000, 0.3),
    farm: S('sunny', 2, 'flute', 2600, 0.28), orchard: S('sunny', -3, 'marimba', 2300, 0.32),
    beach: S('gentle', -3, 'marimba', 2200, 0.4), pond: S('gentle', 2, 'marimba', 2400, 0.35), dock: S('gentle', -3, 'piano', 2000, 0.4),
    library: S('gentle', 2, 'piano', 1900, 0.3, 0.8), theater: S('gentle', 0, 'piano', 1700, 0.35, 0.6),
    cabin: S('cozy', -5, 'piano', 1900, 0.35), cabinin: S('cozy', -7, 'piano', 1700, 0.3), pumpkins: S('cozy', -3, 'marimba', 2100, 0.32),
    bakery: S('cozy', 0, 'piano', 2400, 0.28), bonfire: S('cozy', -5, 'pluck', 1900, 0.38),
    snow: S('dreamy', 4, 'bell', 3000, 0.45), lighthouse: S('dreamy', -3, 'bell', 2200, 0.48), underwater: S('dreamy', -7, 'bell', 1500, 0.55),
    space: S('dreamy', -8, 'bell', 2600, 0.6), aquarium: S('dreamy', -5, 'marimba', 1700, 0.5),
    forest: S('adventure', -2, 'flute', 2100, 0.38), campsite: S('adventure', -7, 'flute', 2000, 0.36), treehouse: S('adventure', 0, 'flute', 2500, 0.3),
    rooftop: S('playful', -2, 'piano', 2600, 0.3), citypark: S('playful', 2, 'piano', 2800, 0.26), carnival: S('playful', 0, 'marimba', 3000, 0.25),
    festival: S('playful', 0, 'bell', 3000, 0.35), studio: S('playful', 2, 'piano', 2700, 0.24),
    rainy: S('mellow', -3, 'piano', 1800, 0.45)
  };
  var DEFAULT_STYLE = STYLES.backyard;
  var FORM = ['A', 'A', 'B', 'A'];
  // after dark, bright moods turn gentle and the adventure ones turn dreamy, a little slower and softer
  var NIGHT_MOOD = { sunny: 'gentle', playful: 'gentle', adventure: 'dreamy' };
  var LEVEL = 1.15, FADE = 2.2;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function quietNow() { try { return !!(window.TOLQuiet && window.TOLQuiet.on && window.TOLQuiet.on()); } catch (e) { return false; } }
  var enabled = lsGet('tol-pc-music') !== 'off' && !quietNow();
  var scene = null, hour = 12, running = false, timer = 0;
  var A = null; // the audio graph, built once on the shared pal cam audio context
  var M = { next: 0, chord: 0, part: 0, motif: null, motifB: null, last: 76, style: DEFAULT_STYLE, mood: null };

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
  // the movies' sparkle: a soft, round plucked note
  function spark(f, t, vol) { var o = osc('sine', f, t, t + 1), g = A.c.createGain(); env(g, t, 0.02, vol, 0.01, 0.85); o.connect(g); g.connect(A.bus); }
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
  function moodOf(st) { var m = st.mood; if (night() && NIGHT_MOOD[m]) m = NIGHT_MOOD[m]; return MOODS[m] ? m : 'gentle'; }
  // a tune for one part of the song: for each of its four chords, a few notes on eighth-note slots;
  // each note is a step up or down the scale from the chord tone nearest the last note, so it moves smoothly
  function newMotif(busy) {
    var out = [];
    for (var c = 0; c < 4; c++) {
      var notes = [], slot = rnd([0, 0, 1, 2]), n = c === 3 ? rnd([1, 2]) : rnd([2, 3, 3, 4]);
      if (Math.random() > busy) n = Math.max(1, n - 2);
      for (var i = 0; i < n && slot < 8; i++) {
        var len = rnd(i === n - 1 ? [3, 4, 4] : [1, 2, 2, 3]);
        notes.push({ s: slot, step: i === 0 ? 0 : rnd([-2, -1, 1, 1, 2]), len: len });
        slot += len;
      }
      out.push(notes);
    }
    return out;
  }
  function inScale(scl, m) { var pc = ((m % 12) + 12) % 12; return scl.indexOf(pc) >= 0; }
  function stepScale(scl, m, steps) { var d = steps > 0 ? 1 : -1; for (var k = Math.abs(steps); k > 0;) { m += d; if (inScale(scl, m)) k--; } return m; }
  function nearestTone(chord, last) {
    var best = 76, bd = 99;
    chord.forEach(function (n) { for (var o = 12; o <= 48; o += 12) { var m = n + o; if (m < 67 || m > 86) continue; var d = Math.abs(m - last); if (d < bd) { bd = d; best = m; } } });
    return best;
  }
  function schedule() {
    var c = ctx(); if (!running || !A || !c || c.state !== 'running') return;
    var st = M.style, mid = moodOf(st), md = MOODS[mid], slow = night() ? 1.12 : 1, p = md.p * slow, soft = st.soft * (night() ? 0.75 : 1), key = st.key;
    var scl = SCALES[md.scale].map(function (x) { return (x + key + 12) % 12; });
    if (M.mood !== mid) { M.mood = mid; M.chord = 0; M.part = 0; M.motif = null; M.motifB = null; }
    if (M.next < c.currentTime) M.next = c.currentTime + 0.1;
    while (M.next < c.currentTime + (window.__pcLite ? 2.5 : 1.5)) { // planned well ahead, so a busy moment (or a small TV stick) never leaves a gap
      var t = M.next, part = FORM[M.part % FORM.length], prog = md[part], ci = M.chord % 4;
      var chord = prog[ci].map(function (n) { return n + key; });
      // the pads: the whole chord, held and swelling gently into the next
      chord.forEach(function (n, i) { pad(hz(n), t, p * 0.95, (i ? 0.014 : 0.019) * soft); });
      if (Math.random() < 0.9) bass(hz(chord[0] - 12), t, p * 0.6, 0.026 * soft);
      // the sparkles: eight little plucked chord notes across the chord, like the movies
      var e = p / 8;
      for (var k = 0; k < 8; k++) if (Math.random() < md.arp * (night() ? 0.6 : 1)) spark(hz(chord[(k * 3 + M.chord) % 4] + 12), t + k * e + (Math.random() - 0.5) * 0.012, 0.013 * soft);
      if (md.pulse) for (var q = 0; q < 4; q++) if (Math.random() < md.pulse) spark(hz(chord[0] - 12), t + q * p / 4, 0.022 * soft);
      // the tune: the A part's tune comes back each time (a little chorus); the B part has its own
      if (part === 'A' && !M.motif) M.motif = newMotif(0.6);
      if (part === 'B' && !M.motifB) M.motifB = newMotif(0.5);
      var mot = part === 'A' ? M.motif : M.motifB;
      // the last time round, the tune rests now and then, so it breathes
      if (!(M.part % 4 === 3 && ci % 2 === 1 && Math.random() < 0.5)) {
        var m = nearestTone(chord, M.last);
        mot[ci].forEach(function (x) {
          m = x.step ? stepScale(scl, m, x.step) : m; if (m > 88) m -= 12; if (m < 64) m += 12;
          play(st.lead, hz(m), t + x.s * e + (Math.random() - 0.5) * 0.015, e * x.len, 0.026 * soft);
        });
        M.last = m;
      }
      M.chord++; M.next = t + p;
      if (M.chord % 4 === 0) {
        M.part++;
        // after the whole song, a fresh tune now and then, so it never wears thin
        if (M.part % FORM.length === 0) { if (Math.random() < 0.6) M.motif = null; M.motifB = null; }
      }
    }
  }
  function applyStyle(id) {
    var st = STYLES[id] || DEFAULT_STYLE; if (st !== M.style) { M.style = st; M.mood = null; }
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
    if (!running) { M.next = c.currentTime + 0.15; M.chord = 0; M.part = 0; M.motif = null; M.motifB = null; M.mood = null; }
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
