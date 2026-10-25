/* pals-cam-sleep.js: the Sleeping Pals Cam (sleeping-pals-cam.html): Tidbit and Sugarfoot fast asleep in a
   dim, warm room at night, something to go to bed to.
   - Each pup breathes and lightly snores in her own rhythm (Tidbit a little quicker and higher, Sugarfoot
     slower and deeper), and little z's float up as she breathes out.
   - Now and then, never on a schedule (every few minutes on average, picked at random), one of them does
     something: pads to the refrigerator for a bone, has a drink of water, rolls onto her back, turns around
     and settles again, kicks in a dream, scoots closer, or sleepwalks a little circle and bumps into the couch.
   - Optional soft sound bed (rain, a fan or brown noise), a sleep timer that fades everything out slowly, a dimmer
     that brings the room close to black, and the screen kept awake while it runs (where the browser allows).
   - Calm motion (the device's reduce-motion setting, or the site's "Keep the page still" / Quiet mode):
     fewer, slower happenings and slower z's. Nothing ever flashes.
   THE SOUND (rebuilt to be soothing): all of it is made right here with Web Audio from filtered noise shaped by
   slow, rounded envelopes. There are no raw oscillators and no recordings, and nothing is a short loop.
   - Snores: a breath of soft air through two warm resonances, plus (on some breaths) a faint low purr and a
     shallow, random flutter. Breath length, pitch, strength and "snore or plain breath" all vary breath to
     breath and drift over a minute or so, so it never repeats. Tidbit sits a little higher, Sugarfoot lower.
   - The funny moments (paws, a lap of water, a fridge hum, a muffled boof, a little sigh) are quiet and rounded,
     each measured to stay below the loudest snore.
   - Beds are synthesized (long noise loops that also drift in speed), balanced to sit a little under the snores.
   - Safety: low-pass, a gentle compressor and a soft clipper at the end; every volume change is a setTarget
     fade, so nothing jumps or zippers. It fades in over about 9 s and the sleep timer fades out over 90 s.
   - It respects the site's Quiet mode and sound switch (starts silent; a Sound button turns it on for this page).
   What it remembers: the timer, sound and dimmer choices (localStorage 'tol-sleepcam-v1'), on this device only.
   Nothing is sent anywhere. Draws the pals with pups.js (window.TOLPups).
   window.TOLSleepCam exposes start/stop/state/trigger for tests. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  var KEY = 'tol-sleepcam-v1', TAU = Math.PI * 2, LH = 360, G = 282;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mix(a, b, p) { return a + (b - a) * p; }
  function sio(p) { p = clamp(p, 0, 1); return 0.5 - 0.5 * Math.cos(Math.PI * p); }
  function seg(u, a, b) { return clamp((u - a) / (b - a), 0, 1); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function prefs() { try { return JSON.parse(lsGet(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function savePrefs(p) { lsSet(KEY, JSON.stringify(p)); }
  function calmNow() {
    var mq = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var st = lsGet('tol-still'), qu = lsGet('tol-quiet') === '1';
    return qu || st === '1' || (st !== '0' && mq);
  }
  function rand(a, b) { return a + Math.random() * (b - a); }

  // ------------------------------------------------------------------ drawing helpers
  function rr(g, x, y, w, h, r, col) { g.fillStyle = col; g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); }
  function circ(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, Math.max(0.01, r), 0, TAU); g.fill(); }
  function ell(g, x, y, rx, ry, col, rot) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); g.fill(); }
  function glow(g, x, y, r, rgb, a) { if (a <= 0.002) return; var gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(' + rgb + ',' + a.toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  function bone(g, x, y, s, rot, col) {
    g.save(); g.translate(x, y); g.rotate(rot || 0); g.scale(s, s); col = col || '#F3E7CF';
    rr(g, -7, -1.8, 14, 3.6, 1.8, col); circ(g, -7, -2, 2.4, col); circ(g, -7, 2, 2.4, col); circ(g, 7, -2, 2.4, col); circ(g, 7, 2, 2.4, col);
    g.restore();
  }

  // ------------------------------------------------------------------ the pals
  var PS = 1.3; // the pals' size in the room
  var HOME = { tidbit: { dx: -52, face: 1 }, sugarfoot: { dx: 52, face: -1 } };
  function newPal(id) { return { id: id, look: id === 'tidbit' ? 'collar' : 'drop', homeDx: HOME[id].dx, face: HOME[id].face, x: 0, y: 0, pose: 'lie', rot: 0, lift: 0, ph: 0, tilt: 0, blink: true, carry: false, side: false, sy: 1, asleep: true, breaths: [], nextB: 0, period: id === 'tidbit' ? 3.9 : 4.9, eyeOpen: 0, star: 0 }; }
  var PALS = { tidbit: newPal('tidbit'), sugarfoot: newPal('sugarfoot') };

  // ------------------------------------------------------------------ state
  var S = { on: false, t0: 0, T: 0, last: 0, raf: 0, calm: calmNow(), ev: null, nextEv: 0, lastType: '', zs: [], cx: 320, LW: 640,
    timerMin: 0, timerEnd: 0, ending: 0, ended: false, dim: true, bed: 'off', snore: true, soundOn: true, wake: true, lock: null, fps: 30, sinceDraw: 0,
    fridge: 0, fridgeLight: 0, boneFloor: 0, boneLeft: 0, bubble: null, bump: null, lay: { couch: -232, fridge: 186, bowl: 140, light: 100, shift: 0 } };
  var cv = null, g = null, W = 0, H = 0, DPR = 1, geo = null;

  // ------------------------------------------------------------------ audio
  // Everything is made here from filtered noise shaped by slow, rounded envelopes (no raw oscillators, no
  // recordings, nothing that repeats). Signal path:
  //   voices -> snore / bed / sfx buses -> fade -> mute -> rumble filter -> low-pass -> gentle compressor
  //   -> soft clipper (a safety net that only matters if something ever got loud) -> speakers.
  // Fades only ever use setTargetAtTime, so no volume change can jump or zipper.
  var A = { c: null, fade: null, mute: null, snore: null, bed: null, sfx: null, bufs: null, voices: {}, bedNodes: null, sched: 0, off: 0 };
  var HORIZON = 12;      // seconds of breathing scheduled ahead of now (so a slow timer or a busy tab can't starve the sound)
  var TRIM = 1.6;        // overall level after the compressor (sets how loud everything is, together; the sounds are balanced against each other below)
  var FADE_TC = 2.4;     // fade-in time constant (about 9 s to be fully in)
  var FADE_OUT = 90;     // sleep timer: seconds from the first fade to the dark room
  var END_TC = 16;       // sleep timer: time constant of the fade-out (down 49 dB after 90 s)
  function noop() {}
  function hann(p) { return 0.5 - 0.5 * Math.cos(Math.PI * clamp(p, 0, 1)); }
  // a rounded swell: rise over a, hold h, fall over r, peak pk. Starts and ends at exactly 0, with a zero slope at both ends.
  function swell(a, h, r, pk) {
    var dur = a + h + r, n = Math.max(24, Math.min(900, Math.round(dur * 160))), cv = new Float32Array(n), i, tt;
    for (i = 0; i < n; i++) { tt = i / (n - 1) * dur; cv[i] = pk * (tt < a ? hann(tt / a) : tt < a + h ? 1 : hann(1 - (tt - a - h) / r)); }
    return cv;
  }
  // one breath: a soft swell in, a short rest, a quieter swell out
  function breathCurve(D, pin, pout) {
    var len = D * 0.9, n = Math.max(48, Math.min(900, Math.round(len * 120))), cv = new Float32Array(n), i, u, x;
    for (i = 0; i < n; i++) {
      u = i / (n - 1) * 0.9; x = 0;
      if (u < 0.42) { x = u / 0.42; cv[i] = pin * Math.pow(Math.sin(Math.PI * Math.pow(x, 0.88)), 1.25); }
      else if (u >= 0.5 && u < 0.88) { x = (u - 0.5) / 0.38; cv[i] = pout * Math.pow(Math.sin(Math.PI * x), 1.5); }
      else cv[i] = 0;
    }
    cv[0] = 0; cv[n - 1] = 0;
    return cv;
  }
  function play(param, curve, t, dur) { try { param.setValueCurveAtTime(curve, t, dur); } catch (e) {} }
  // seamless looping noise (equal-power crossfade of the tail into the head), so no loop point can be heard
  function makeNoise(c, kind, secs, rms) {
    var sr = c.sampleRate, n = Math.round(secs * sr), x = Math.round(Math.min(1.2, secs * 0.15) * sr), tot = n + x, d = new Float32Array(tot), i, w, p;
    if (kind === 'pink') { var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0; for (i = 0; i < tot; i++) { w = Math.random() * 2 - 1; b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; d[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926; } }
    else if (kind === 'brown') { var y = 0; for (i = 0; i < tot; i++) { y = 0.997 * y + 0.045 * (Math.random() * 2 - 1); d[i] = y; } }
    else { var a = 1 - Math.exp(-TAU * 30 / sr), l1 = 0, l2 = 0; for (i = 0; i < tot; i++) { l1 += a * ((Math.random() * 2 - 1) - l1); l2 += a * (l1 - l2); d[i] = l2; } } // "flutter": random wobble below about 30 Hz
    var s2 = 0; for (i = 0; i < tot; i++) s2 += d[i] * d[i]; var k = rms / Math.sqrt(s2 / tot);
    var buf = c.createBuffer(1, n, sr), o = buf.getChannelData(0);
    for (i = 0; i < x; i++) { p = (i + 0.5) / x; o[i] = (d[i] * Math.sin(p * Math.PI / 2) + d[n + i] * Math.cos(p * Math.PI / 2)) * k; }
    for (i = x; i < n; i++) o[i] = d[i] * k;
    return buf;
  }
  // soft raindrops: a loop of round-edged, low-passed little ticks at random places (wrapping around, so it is seamless), peak 1
  function makeDrops(c, secs, perSec) {
    var sr = c.sampleRate, n = Math.round(secs * sr), o = new Float32Array(n), cnt = Math.round(secs * perSec), i, j, at, len, a, lp, k, e, pk = 0;
    for (i = 0; i < cnt; i++) {
      at = Math.floor(Math.random() * n); len = Math.round(sr * rand(0.02, 0.06)); a = Math.exp(rand(-1.4, 0.3)); lp = 0; k = 1 - Math.exp(-TAU * rand(800, 2000) / sr);
      for (j = 0; j < len; j++) { lp += k * ((Math.random() * 2 - 1) - lp); e = (j < sr * 0.005 ? hann(j / (sr * 0.005)) : 1) * Math.exp(-j / (len * 0.28)); o[(at + j) % n] += lp * e * a; }
    }
    for (i = 0; i < n; i++) pk = Math.max(pk, Math.abs(o[i]));
    var buf = c.createBuffer(1, n, sr), d = buf.getChannelData(0); for (i = 0; i < n; i++) d[i] = o[i] / (pk || 1);
    return buf;
  }
  function softCurve() { var n = 2049, cv = new Float32Array(n), i, v; for (i = 0; i < n; i++) { v = (i / (n - 1)) * 2 - 1; cv[i] = Math.tanh(v * 2.2) / 2.2; } return cv; }
  function siteSoundOK() { return lsGet('tol-quiet') !== '1' && lsGet('tol-sound-off') !== '1'; }
  function gainNode(v) { var gn = A.c.createGain(); gn.gain.value = v; return gn; }
  function filt(type, f, q) { var fl = A.c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; if (q != null) fl.Q.value = q; return fl; }
  function loopSrc(buf, rate) { var s = A.c.createBufferSource(); s.buffer = buf; s.loop = true; if (rate) s.playbackRate.value = rate; else if (A.rateMod) A.rateMod.connect(s.playbackRate); s.start(A.c.currentTime, Math.random() * buf.duration); return s; }
  function chain() { for (var i = 0; i < arguments.length - 1; i++) arguments[i].connect(arguments[i + 1]); return arguments[arguments.length - 1]; }
  function panner(v) { var pn = A.c.createStereoPanner ? A.c.createStereoPanner() : A.c.createGain(); if (pn.pan) pn.pan.value = v; return pn; }
  function actx() {
    if (A.c) return A.c;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { A.c = new AC(); } catch (e) { return null; }
    var c = A.c;
    A.fade = gainNode(0); A.mute = gainNode(S.soundOn ? 1 : 0);
    var trim = gainNode(TRIM), rumble = filt('highpass', 32, 0.5), tone = filt('lowpass', 3600, 0.5);
    var comp = c.createDynamicsCompressor(); comp.threshold.value = -34; comp.knee.value = 12; comp.ratio.value = 2.5; comp.attack.value = 0.1; comp.release.value = 0.8;
    var clip = c.createWaveShaper(); clip.curve = softCurve(); try { clip.oversample = '2x'; } catch (e) {}
    chain(A.fade, A.mute, rumble, tone, comp, trim, clip, c.destination);
    A.snore = gainNode(S.snore ? 1 : 0); A.bed = gainNode(1); A.sfx = gainNode(1);
    A.snore.connect(A.fade); A.bed.connect(A.fade); A.sfx.connect(A.fade);
    A.bufs = { pinkA: makeNoise(c, 'pink', 23.1, 0.25), pinkB: makeNoise(c, 'pink', 31.7, 0.25), brownA: makeNoise(c, 'brown', 29.3, 0.25), brownB: makeNoise(c, 'brown', 41.9, 0.25), flut: makeNoise(c, 'flut', 23.3, 1), dropsA: makeDrops(c, 19.3, 3.2), dropsB: makeDrops(c, 27.1, 2.6) };
    // every noise loop also drifts in speed by a fraction of a percent, at random, so even the loop length never shows up as a repeat
    A.rateMod = gainNode(0.003); var rs = c.createBufferSource(); rs.buffer = A.bufs.flut; rs.loop = true; rs.playbackRate.value = 0.02; rs.start(c.currentTime, Math.random() * 20); rs.connect(A.rateMod);
    buildSnorers();
    // a barely-there floor of room air, so the sound never drops to digital silence between breaths (some speakers cut out and then pop when it does)
    var fl = gainNode(0.004); chain(loopSrc(A.bufs.pinkB), filt('lowpass', 500, 0.5), fl, A.bed);
    return c;
  }
  // each pup's voice: a breath of air through two soft resonances, plus a faint low "purr" (a narrow band of
  // noise, so it wanders a little like a real voice), shaken by a shallow, random flutter. Tidbit is a little
  // higher and quicker, Sugarfoot lower and slower. Both envelopes sit at zero until a breath opens them.
  var VOICE = {
    tidbit:    { f0: 172, a1: 380, a2: 1050, lp: 1500, pan: -0.3, air: 0.030, tone: 0.022 },
    sugarfoot: { f0: 110, a1: 270, a2: 760, lp: 1050, pan: 0.3, air: 0.034, tone: 0.030 }
  };
  function buildSnorers() {
    var B = A.bufs;
    ['tidbit', 'sugarfoot'].forEach(function (id) {
      var V = VOICE[id], v = { gate: gainNode(1), lastGate: 1 };
      var airEnv = gainNode(0), a1 = gainNode(0.8), a2 = gainNode(0.5);
      var air = loopSrc(id === 'tidbit' ? B.pinkA : B.pinkB); v.f1 = filt('bandpass', V.a1, 1.1); v.f2 = filt('bandpass', V.a2, 1.4);
      chain(air, filt('highpass', 70, 0.5), v.f1, a1, airEnv); chain(air, v.f2, a2, airEnv);
      var toneEnv = gainNode(0), flut = gainNode(0.88), dep = gainNode(0.1);
      v.bpT = filt('bandpass', V.f0, 7);
      chain(loopSrc(id === 'tidbit' ? B.brownA : B.brownB), v.bpT, flut, toneEnv);
      chain(loopSrc(B.flut), dep, flut.gain);
      var mix = gainNode(1), pan = panner(V.pan);
      airEnv.connect(mix); toneEnv.connect(mix); chain(mix, filt('lowpass', V.lp, 0.5), pan, v.gate, A.snore);
      v.airEnv = airEnv; v.toneEnv = toneEnv; v.dep = dep;
      A.voices[id] = v;
    });
  }
  // the visual breath: 0 (out) .. 1 (full); it follows the same planned breaths as the sound
  function breathAt(p, T) { for (var i = p.breaths.length - 1; i >= 0; i--) { var b = p.breaths[i]; if (T >= b.t) { var u = (T - b.t) / b.dur; return u < 0.42 ? sio(u / 0.42) : 1 - sio((u - 0.42) / 0.58); } } return 0; }
  function aT(T) { return T + A.off; } // the page clock (T) to the audio clock
  function syncClock() { if (A.c) A.off = A.c.currentTime - S.T; }
  // one breath, from its planned numbers: air always, the purr and flutter only on a snoring breath
  function breathSound(pal, b) {
    var c = A.c, v = A.voices[pal.id]; if (!c || !v || S.ended) return;
    var t = aT(b.t), D = b.dur, V = VOICE[pal.id], sn = b.snore, vol = b.vol;
    if (t < c.currentTime + 0.1) return;
    var pin = V.air * vol * (0.72 + 0.28 * sn), pout = pin * b.exh;
    var pre = Math.max(t - 0.4, c.currentTime + 0.01); // while her voice is still closed
    v.f1.frequency.setValueAtTime(V.a1 * b.form, pre); v.f2.frequency.setValueAtTime(V.a2 * b.form, pre);
    play(v.airEnv.gain, breathCurve(D, pin, pout), t, D * 0.9);
    if (sn > 0.05) {
      v.dep.gain.setValueAtTime(0.05 + 0.08 * sn, pre);
      v.bpT.frequency.setValueAtTime(V.f0 * b.pitch * 0.97, pre); v.bpT.frequency.linearRampToValueAtTime(V.f0 * b.pitch * 1.03, t + D * 0.42);
      play(v.toneEnv.gain, breathCurve(D, V.tone * vol * sn, V.tone * vol * sn * 0.25), t, D * 0.9);
    }
  }
  // plan breaths for both pups a little way ahead. The pace drifts slowly, each breath is a little different,
  // some are plain breaths and some are soft snores, and the sleep deepens and lightens over a minute or so.
  function planBreaths() {
    var horizon = S.T + HORIZON;
    ['tidbit', 'sugarfoot'].forEach(function (id) {
      var p = PALS[id], base = id === 'tidbit' ? 3.9 : 4.9;
      if (!p.nextB) { p.nextB = S.T + (id === 'tidbit' ? 0.4 : 1.9); p.per = base; p.mood = 0.8; }
      while (p.nextB < horizon) {
        p.per = clamp(p.per + rand(-0.22, 0.22), base * 0.8, base * 1.24);
        p.mood = clamp(p.mood + rand(-0.1, 0.1) + (0.78 - p.mood) * 0.08, 0.5, 1);
        var deep = Math.random() < 0.06, dur = p.per * rand(0.93, 1.07) * (deep ? 1.25 : 1) + (Math.random() < 0.1 ? rand(0.5, 2.2) : 0), snoring = p.mood > 0.58 && Math.random() < 0.72;
        var b = { t: p.nextB, dur: dur, vol: p.mood * rand(0.85, 1) * (deep ? 1.12 : 1), snore: snoring ? rand(0.45, 1) : 0, exh: rand(0.3, 0.45), pitch: rand(0.94, 1.06), form: rand(0.92, 1.08), sent: false };
        p.breaths.push(b); if (p.breaths.length > 14) p.breaths.shift();
        p.nextB += dur;
      }
    });
  }
  function sendBreaths() {
    if (!A.c || !S.soundOn) return;
    ['tidbit', 'sugarfoot'].forEach(function (id) { var p = PALS[id]; p.breaths.forEach(function (b) { if (!b.sent && b.t - S.T < HORIZON) { b.sent = true; breathSound(p, b); } }); });
  }
  // a pup who is up and about isn't snoring: close her voice smoothly
  function updateGates() {
    if (!A.c) return;
    ['tidbit', 'sugarfoot'].forEach(function (id) {
      var v = A.voices[id], want = PALS[id].asleep ? 1 : 0;
      if (v && v.lastGate !== want) { v.lastGate = want; v.gate.gain.setTargetAtTime(want, A.c.currentTime, 0.5); }
    });
  }
  function audioTick() {
    if (!S.on) return;
    S.T = (performance.now() - S.t0) / 1000;
    planBreaths();
    if (A.c && !S.ended) { syncClock(); sendBreaths(); }
  }
  // ---- the sound bed (synthesized; a pair of different-length noise loops per layer, so it never repeats)
  function setBed(kind) {
    S.bed = kind; var pr = prefs(); pr.bed = kind; savePrefs(pr);
    var c = A.c; if (!c) return;
    var now = c.currentTime;
    if (A.bedNodes) { var old = A.bedNodes; old.g.gain.setTargetAtTime(0, now, 0.9); setTimeout(function () { try { old.stop(); } catch (e) {} }, 7000); A.bedNodes = null; }
    if (kind === 'off') return;
    var B = A.bufs, gn = gainNode(0), srcs = [], lv = 0.3, drift = gainNode(0.9), dd = gainNode(0.06);
    chain(gn, A.bed);
    function add(buf, rate) { var s = loopSrc(buf, rate); srcs.push(s); return s; }
    function layer(buf, filters, level, pan) { var s = add(buf); var out = gainNode(level); filters.unshift(s); filters.push(out); chain.apply(null, filters); var pn = panner(pan || 0); out.connect(pn); pn.connect(drift); }
    if (kind === 'rain') {
      layer(B.pinkA, [filt('highpass', 450, 0.5), filt('lowpass', 2000, 0.5)], 0.55, -0.5);
      layer(B.pinkB, [filt('highpass', 450, 0.5), filt('lowpass', 2000, 0.5)], 0.55, 0.5);
      layer(B.pinkB, [filt('bandpass', 900, 0.5), filt('lowpass', 1800, 0.5)], 0.45, -0.2);
      layer(B.brownA, [filt('bandpass', 170, 0.6)], 0.35, 0.2);
      layer(B.dropsA, [], 0.9, -0.6); layer(B.dropsB, [], 0.9, 0.6);
      lv = 0.0082; dd.gain.value = 0.1;
    } else if (kind === 'fan') {
      layer(B.brownA, [filt('lowpass', 520, 0.5)], 0.6, -0.3);
      layer(B.brownB, [filt('lowpass', 520, 0.5)], 0.6, 0.3);
      layer(B.pinkA, [filt('bandpass', 380, 0.5), filt('lowpass', 900, 0.5)], 0.32, 0);
      layer(B.brownB, [filt('bandpass', 118, 9)], 0.9, 0);
      lv = 0.011; dd.gain.value = 0.03;
    } else {
      layer(B.brownA, [filt('lowpass', 560, 0.5), filt('highpass', 40, 0.5)], 0.7, -0.45);
      layer(B.brownB, [filt('lowpass', 560, 0.5), filt('highpass', 40, 0.5)], 0.7, 0.45);
      layer(B.brownA, [filt('lowpass', 300, 0.5)], 0.4, 0);
      lv = 0.0105; dd.gain.value = 0.02;
    }
    // a slow, random swell in the bed (never periodic)
    var sw = add(B.flut, 0.012); chain(sw, dd, drift.gain); drift.connect(gn);
    gn.gain.setTargetAtTime(lv * (S.bedGain || 1), now, 1.4);
    A.bedNodes = { g: gn, kind: kind, level: lv, stop: function () { srcs.forEach(function (s) { try { s.stop(); } catch (e) {} }); try { gn.disconnect(); } catch (e) {} } };
  }
  // one little shaped puff of filtered noise: the building block of every event sound
  function voice(o) {
    var c = A.c; if (!c || !A.sfx || S.ended || !S.soundOn) return;
    var t = Math.max(o.t || 0, c.currentTime + 0.03), buf = o.buf || A.bufs.pinkA, h = o.h || 0, dur = o.a + h + o.r;
    var s = c.createBufferSource(), gn = c.createGain(), prev = s, i, fd, fl;
    s.buffer = buf; s.loop = true;
    for (i = 0; i < (o.f || []).length; i++) {
      fd = o.f[i]; fl = c.createBiquadFilter(); fl.type = fd[0]; fl.Q.value = fd[2] != null ? fd[2] : 0.7;
      if (fd[3]) { fl.frequency.setValueAtTime(fd[1], t); fl.frequency.exponentialRampToValueAtTime(fd[3], t + dur); } else fl.frequency.value = fd[1];
      prev.connect(fl); prev = fl;
    }
    gn.gain.value = 0; prev.connect(gn);
    var out = gn; if (o.pan) { var pn = panner(o.pan); gn.connect(pn); out = pn; }
    out.connect(o.to || A.sfx);
    play(gn.gain, swell(o.a, h, o.r, o.pk), t, dur);
    s.start(t, Math.random() * Math.max(0.1, buf.duration - 0.2)); s.stop(t + dur + 0.1);
  }
  // ---- the funny little moments: all soft, all rounded, none louder than a snore
  function B_() { return A.bufs; }
  var SFX = {
    step: function () { if (!A.c) return; voice({ buf: B_().brownB, f: [['lowpass', rand(190, 260), 0.5]], a: 0.014, r: 0.1, pk: 0.038 * rand(0.7, 1.1), pan: rand(-0.15, 0.15) }); },
    rustle: function () { if (!A.c) return; var t = A.c.currentTime; for (var i = 0; i < 3; i++) voice({ t: t + i * rand(0.35, 0.55), buf: B_().pinkB, f: [['bandpass', rand(600, 900), 0.6], ['lowpass', 1400, 0.5]], a: 0.22, h: 0.1, r: 0.4, pk: 0.017 * rand(0.6, 1), pan: rand(-0.3, 0.3) }); },
    fridge: function () { if (!A.c) return; var t = A.c.currentTime; voice({ t: t, buf: B_().brownA, f: [['lowpass', 170, 0.5]], a: 0.03, r: 0.25, pk: 0.021, pan: 0.5 }); voice({ t: t + 0.02, buf: B_().pinkA, f: [['bandpass', 520, 0.7], ['lowpass', 1000, 0.5]], a: 0.04, r: 0.12, pk: 0.003, pan: 0.5 }); },
    hum: function (len) { if (!A.c) return; var t = A.c.currentTime; len = Math.max(3.5, len); voice({ t: t, buf: B_().brownA, f: [['bandpass', 100, 6]], a: 1.2, h: len - 2.4, r: 1.2, pk: 0.047, pan: 0.5 }); voice({ t: t, buf: B_().brownB, f: [['bandpass', 200, 9]], a: 1.4, h: len - 2.8, r: 1.4, pk: 0.013, pan: 0.5 }); },
    crunch: function () { if (!A.c) return; var t = A.c.currentTime, n = 2 + Math.floor(Math.random() * 2); for (var i = 0; i < n; i++) voice({ t: t + i * rand(0.12, 0.2), buf: B_().pinkA, f: [['bandpass', rand(800, 1300), 1], ['lowpass', 1700, 0.5]], a: 0.012, r: rand(0.06, 0.1), pk: 0.047 * rand(0.6, 1), pan: -0.2 }); },
    lap: function () { if (!A.c) return; voice({ buf: B_().pinkB, f: [['bandpass', 560, 3.2, 980], ['lowpass', 1600, 0.5]], a: 0.03, r: rand(0.07, 0.11), pk: 0.055 * rand(0.7, 1), pan: 0.2 }); },
    bump: function () { if (!A.c) return; voice({ buf: B_().brownA, f: [['lowpass', 150, 0.5]], a: 0.015, r: 0.26, pk: 0.026, pan: -0.5 }); },
    sigh: function (id) { if (!A.c) return; var pan = id === 'sugarfoot' ? 0.3 : -0.3; voice({ buf: B_().pinkA, f: [['bandpass', 820, 1.3, 470], ['lowpass', 1300, 0.5]], a: 0.45, h: 0.1, r: 0.95, pk: 0.017, pan: pan }); voice({ buf: B_().brownB, f: [['bandpass', id === 'sugarfoot' ? 190 : 250, 8, id === 'sugarfoot' ? 150 : 190]], a: 0.45, h: 0.1, r: 0.95, pk: 0.05, pan: pan }); },
    woof: function (id) { if (!A.c) return; var pan = id === 'sugarfoot' ? 0.3 : -0.3, f = id === 'sugarfoot' ? 170 : 240; voice({ buf: B_().brownA, f: [['bandpass', f, 9, f * 0.72]], a: 0.07, h: 0.06, r: 0.28, pk: 0.115, pan: pan }); voice({ buf: B_().pinkB, f: [['bandpass', f * 3, 1.2], ['lowpass', 900, 0.5]], a: 0.07, h: 0.04, r: 0.2, pk: 0.012, pan: pan }); }
  };

  // ------------------------------------------------------------------ the happenings
  // Each happening moves one pup for a while and then puts her back to sleep. They never overlap, and the
  // wait before the next one is random (exponential), so they can't be guessed.
  var WEIGHTS = [['roll', 2], ['turn', 2], ['kick', 2], ['water', 1.4], ['fridge', 1.2], ['sleepwalk', 1.1], ['snuggle', 0.9]];
  function pickType() {
    var tot = 0, list = WEIGHTS.filter(function (w) { return w[0] !== S.lastType; });
    list.forEach(function (w) { tot += w[1]; }); var r = Math.random() * tot;
    for (var i = 0; i < list.length; i++) { r -= list[i][1]; if (r <= 0) return list[i][0]; }
    return list[0][0];
  }
  function scheduleNext(first) {
    var mean = S.calm ? 330 : 160, wait = -Math.log(1 - Math.random()) * mean;
    S.nextEv = S.T + clamp(wait, first ? 45 : 35, first ? 180 : 540);
  }
  function homeX(p) { return S.cx + p.homeDx; }
  function startEvent(type, who) {
    if (S.ev || S.ended) return false;
    type = type || pickType();
    who = who || (type === 'sleepwalk' ? (Math.random() < 0.7 ? 'tidbit' : 'sugarfoot') : Math.random() < 0.5 ? 'tidbit' : 'sugarfoot');
    var k = S.calm ? 1.5 : 1, D = { roll: 12, turn: 6.5, kick: 6, water: 18, fridge: 25, sleepwalk: 27, snuggle: 6 }[type];
    S.ev = { type: type, who: who, t0: S.T, dur: D * k, k: k, fired: {}, x0: homeX(PALS[who]) };
    S.lastType = type;
    return true;
  }
  function once(ev, key) { if (ev.fired[key]) return false; ev.fired[key] = 1; return true; }
  // walking from a to b over [t0,t1] (in event seconds), with paw steps you can (softly) hear
  function walk(p, ev, u, t0, t1, xa, xb, stepKey) {
    if (u < t0 || u > t1) return false;
    var q = sio(seg(u, t0, t1)); p.x = mix(xa, xb, q); p.pose = 'run'; p.face = xb >= xa ? 1 : -1; p.ph = (u - t0) * 6.5 / ev.k; p.lift = Math.abs(Math.sin(p.ph)) * 1.2;
    p.y = -7 * Math.sin(Math.PI * q); // she goes round behind her sleeping pal, not through her
    var step = Math.floor((u - t0) * 2.1 / ev.k); if (once(ev, stepKey + step)) SFX.step();
    return true;
  }
  function runEvent(dt) {
    var ev = S.ev; if (!ev) return;
    var p = PALS[ev.who], o = PALS[ev.who === 'tidbit' ? 'sugarfoot' : 'tidbit'], u = (S.T - ev.t0) / ev.k, hx = homeX(p);
    p.asleep = true; p.pose = 'lie'; p.rot = 0; p.lift = 0; p.side = false; p.tilt = 0; p.carry = false; p.x = hx; p.y = 0; p.sy = 1; p.blink = true;
    var fridgeX = S.cx + S.lay.fridge - 8, bowlX = S.cx + S.lay.bowl, couchX = S.cx + S.lay.couch + 96;
    switch (ev.type) {
      case 'fridge': {
        p.asleep = u < 1 || u > 21;
        var stand = fridgeX - 40;
        if (u >= 0.6 && u < 1.8) { p.pose = 'sit'; p.blink = u < 1.3; if (once(ev, 'ru')) SFX.rustle(); }
        walk(p, ev, u, 1.8, 6.5, hx, stand, 'a');
        if (u >= 6.5 && u < 12.5) { p.x = stand; p.face = 1; p.pose = 'sit'; p.blink = false; p.tilt = -0.12; }
        S.fridge = sio(seg(u, 6.8, 8)) * (1 - sio(seg(u, 11, 12.2)));
        S.fridgeLight = S.fridge;
        if (u >= 6.8 && once(ev, 'open')) { SFX.fridge(); SFX.hum(4.8 * ev.k); }
        if (u >= 9.6) p.carry = u < 21;
        if (u >= 11.4 && once(ev, 'close')) SFX.fridge();
        walk(p, ev, u, 12.5, 17.5, stand, hx, 'b');
        if (u >= 17.5 && u < 18.6) { p.pose = 'sit'; p.face = HOME[p.id].face; p.blink = false; }
        if (u >= 18.6) { p.face = HOME[p.id].face; p.carry = false; S.boneFloor = 1; S.boneOwner = p.id; S.boneLeft = 1 - seg(u, 19, 24); p.blink = u > 20; p.tilt = u < 24 ? Math.sin(u * 7) * 0.05 : 0;
          if (u > 19 && u < 23.5) { var bite = Math.floor((u - 19) * 1.3); if (once(ev, 'c' + bite)) SFX.crunch(); }
          if (u > 23.6 && once(ev, 'sigh')) SFX.sigh(p.id); }
        break;
      }
      case 'water': {
        p.asleep = u < 1 || u > 15;
        var at = bowlX - 30;
        if (u >= 0.6 && u < 1.6) { p.pose = 'sit'; p.blink = u < 1.2; if (once(ev, 'ru')) SFX.rustle(); }
        walk(p, ev, u, 1.6, 5.4, hx, at, 'a');
        if (u >= 5.4 && u < 10.6) { p.x = at; p.face = 1; p.pose = 'bow'; p.blink = true; p.tilt = Math.sin(u * 10) * 0.06; var lp = Math.floor((u - 5.8) * 4.5); if (u > 5.8 && u < 10.2 && once(ev, 'l' + lp)) SFX.lap(); }
        walk(p, ev, u, 10.6, 14.4, at, hx, 'b');
        if (u >= 14.4) { p.face = HOME[p.id].face; p.pose = u < 15.2 ? 'sit' : 'lie'; }
        break;
      }
      case 'roll': {
        // over onto her back (paws up), a long contented wiggle, then the rest of the way over, facing the other way
        var r1 = sio(seg(u, 0.4, 1.8)), r2 = sio(seg(u, 8.6, 10)), dir = HOME[p.id].face > 0 ? -1 : 1, up = Math.PI * 0.92;
        if (u < 8.6) { p.rot = r1 * up * dir; p.face = HOME[p.id].face; }
        else if (r2 < 0.5) { p.rot = (1 - r2) * up * dir; p.face = HOME[p.id].face; }
        else { p.rot = -(1 - r2) * up * dir; p.face = -HOME[p.id].face; } // past halfway: she comes down on her other side
        p.lift = Math.sin(Math.PI * seg(u, 0.4, 1.8)) * 7 + Math.sin(Math.PI * seg(u, 8.6, 10)) * 7 + 5 * r1 * (1 - r2);
        if (u > 2.2 && u < 8.4) p.rot += Math.sin(u * 2.2) * (S.calm ? 0.03 : 0.07); // a happy belly-up wiggle
        if (once(ev, 'ru')) SFX.rustle(); if (u > 8.6 && once(ev, 'ru2')) SFX.rustle();
        if (u > 10.4 && once(ev, 'sigh')) SFX.sigh(p.id);
        break;
      }
      case 'turn': {
        // sits up, turns around twice the way dogs do, and flops back down
        p.asleep = u < 0.6 || u > 5.4;
        if (u < 0.8) { p.pose = 'sit'; }
        else if (u < 4.6) { var turns = (u - 0.8) / 1.9; p.pose = 'run'; p.ph = u * 5; p.face = Math.floor(turns * 2) % 2 ? -HOME[p.id].face : HOME[p.id].face; p.x = hx + Math.sin(turns * TAU) * 7; p.lift = 0.6; var st = Math.floor(u * 2); if (once(ev, 's' + st)) SFX.step(); }
        else { p.pose = u < 5.2 ? 'sit' : 'lie'; p.sy = u < 5.6 ? 1 - Math.sin(Math.PI * seg(u, 5.2, 5.6)) * 0.08 : 1; }
        if (once(ev, 'ru')) SFX.rustle();
        if (u > 5.3 && once(ev, 'sigh')) SFX.sigh(p.id);
        break;
      }
      case 'kick': {
        // a dream: on her side, paws paddling, a muffled little "boof", and a dream bubble with a ball in it
        var on = sio(seg(u, 0.2, 0.9)) * (1 - sio(seg(u, 5, 5.8)));
        // still lying down, but her legs run in place (squashed low, nose down) while she dreams
        p.side = on > 0.5; p.pose = on > 0.5 ? 'run' : 'lie'; p.ph = u * (S.calm ? 8 : 13); p.sy = on > 0.5 ? 0.74 : 1; p.rot = on > 0.5 ? 0.08 * p.face : 0; p.lift = on > 0.5 ? -3 : 0;
        S.bubble = on > 0.3 ? { who: p.id, a: on, t: u } : null;
        if (u > 2.2 && once(ev, 'w')) SFX.woof(p.id);
        if (u > 3.6 && Math.random() < 0.5 && once(ev, 'w2')) SFX.woof(p.id);
        break;
      }
      case 'snuggle': {
        // scoots in closer to her pal (or back out a little, if they're already close)
        if (!ev.to) { var gap = Math.abs(homeX(o) - hx); ev.to = gap > 96 ? p.homeDx + (p.homeDx < 0 ? 9 : -9) : HOME[p.id].dx; ev.from = p.homeDx; }
        var q = sio(seg(u, 0.8, 4.2)); p.homeDx = mix(ev.from, ev.to, q); p.x = homeX(p); p.lift = Math.sin(q * Math.PI * 4) * 1.2;
        if (once(ev, 'ru')) SFX.rustle();
        if (u > 4.4 && once(ev, 'sigh')) SFX.sigh(p.id);
        break;
      }
      case 'sleepwalk': {
        // stands up still asleep, wanders a little circle with her nose in the air, bumps gently into the couch,
        // turns, and comes back around the front of the rug to curl up again; her pal opens one eye at the bump
        p.asleep = true; p.blink = true;
        var stop = couchX + 48; // her nose just meets the couch
        if (u >= 0.5 && u < 2) { p.pose = 'sit'; p.tilt = -0.15; }
        if (walk(p, ev, u, 2, 9, hx, stop, 'a')) { p.tilt = -0.2; p.ph = (u - 2) * 4.2; }
        if (u >= 9 && u < 12) {
          p.x = stop - Math.sin(Math.PI * seg(u, 9, 9.5)) * 3 + seg(u, 9.3, 10) * 5; p.face = -1; p.pose = 'run'; p.ph = 0; p.tilt = -0.2; p.sy = u < 9.5 ? 1 - Math.sin(Math.PI * seg(u, 9, 9.5)) * 0.07 : 1;
          if (once(ev, 'bump')) { SFX.bump(); S.bump = { x: stop - 50, t: S.T }; }
          o.eyeOpen = u < 11.6 ? 1 : 0;
        }
        if (u >= 12 && u < 13) { p.x = stop + 5; p.face = 1; p.pose = 'run'; p.tilt = -0.2; }
        // the way back is in front of the rug: a little lower and a little bigger, so it reads as a circle
        if (u >= 13 && u < 21.5) { var q2 = sio(seg(u, 13, 21.5)); walk(p, ev, u, 13, 21.5, stop + 5, hx, 'b'); p.y = Math.sin(Math.PI * q2) * 13; p.tilt = -0.2; p.ph = (u - 13) * 4.2; }
        if (u >= 21.5) { p.face = HOME[p.id].face; p.pose = u < 22.6 ? 'sit' : 'lie'; }
        if (u >= 11.6) o.eyeOpen = 0;
        break;
      }
    }
    if (S.T - ev.t0 >= ev.dur) {
      if (ev.type === 'roll') HOME[p.id].face = -HOME[p.id].face; // she stays facing the new way
      p.face = HOME[p.id].face; p.x = homeX(p); p.y = 0; p.pose = 'lie'; p.rot = 0; p.lift = 0; p.tilt = 0; p.carry = false; p.asleep = true; p.sy = 1; o.eyeOpen = 0;
      S.fridge = 0; S.fridgeLight = 0; S.bubble = null; if (S.boneLeft <= 0.01) S.boneFloor = 0;
      S.ev = null; scheduleNext(false);
    }
  }

  // ------------------------------------------------------------------ painting the room
  function geoFor(w, h) {
    var lw = clamp(w / h * LH, 380, 640), k = Math.min(w / lw, h / LH), ox = (w - lw * k) / 2, oy = (h - LH * k) * 0.55;
    return { LW: lw, k: k, ox: ox, oy: oy, x0: -ox / k, x1: (w - ox) / k, y0: -oy / k, y1: (h - oy) / k };
  }
  // where things stand, from the middle of the room: roomy on a wide screen, closer together on a phone held upright
  function layout(lw) {
    var half = lw / 2;
    return { couch: -Math.min(232, half + 40), fridge: Math.min(186, half - 56), bowl: Math.min(140, half - 74), light: Math.min(100, half - 92), shift: half < 230 ? 14 : 0 };
  }
  var MOON = null;
  function moonSprite() {
    if (MOON) return MOON;
    var c = document.createElement('canvas'); c.width = c.height = 48; var m = c.getContext('2d');
    m.fillStyle = '#F4E9C8'; m.beginPath(); m.arc(24, 24, 18, 0, TAU); m.fill();
    m.globalCompositeOperation = 'destination-out'; m.beginPath(); m.arc(32, 17, 16, 0, TAU); m.fill();
    return (MOON = c);
  }
  function drawRoom(T) {
    var cx = S.cx, x0 = geo.x0, x1 = geo.x1, y0 = geo.y0, y1 = geo.y1;
    // wall
    var wg = g.createLinearGradient(0, y0, 0, G); wg.addColorStop(0, '#141228'); wg.addColorStop(1, '#221D3A'); g.fillStyle = wg; g.fillRect(x0, y0, x1 - x0, G - y0 + 1);
    // floor
    var fg = g.createLinearGradient(0, G, 0, y1); fg.addColorStop(0, '#2B2232'); fg.addColorStop(1, '#1A1520'); g.fillStyle = fg; g.fillRect(x0, G, x1 - x0, y1 - G);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x0, G - 6, x1 - x0, 6); // baseboard
    // the window: a quiet moon and a few stars that barely twinkle
    var wx = cx - 72 - S.lay.shift, wy = 58, ww = 92, wh = 84;
    rr(g, wx - 5, wy - 5, ww + 10, wh + 10, 6, '#3A3150');
    var sk = g.createLinearGradient(0, wy, 0, wy + wh); sk.addColorStop(0, '#0B1030'); sk.addColorStop(1, '#1C2350'); rr(g, wx, wy, ww, wh, 3, sk);
    g.save(); g.beginPath(); g.rect(wx, wy, ww, wh); g.clip();
    glow(g, wx + 62, wy + 26, 40, '250,236,200', 0.18);
    g.drawImage(moonSprite(), wx + 62 - 13, wy + 26 - 13, 26, 26); // a crescent moon
    [[12, 14], [30, 40], [20, 64], [44, 18], [78, 58], [84, 12], [56, 70]].forEach(function (s, i) {
      var tw = S.calm ? 0.75 : 0.6 + 0.3 * Math.sin(T * 0.35 + i * 1.9); circ(g, wx + s[0], wy + s[1], i % 3 ? 0.8 : 1.15, 'rgba(255,250,235,' + tw.toFixed(2) + ')');
    });
    g.restore();
    g.fillStyle = '#3A3150'; g.fillRect(wx + ww / 2 - 1.5, wy, 3, wh); g.fillRect(wx, wy + wh / 2 - 1.5, ww, 3);
    // curtains
    ell(g, wx - 6, wy + 40, 9, 52, '#3B2E4D'); ell(g, wx + ww + 6, wy + 40, 9, 52, '#3B2E4D');
    // moonlight on the floor (very soft)
    g.fillStyle = 'rgba(190,200,255,0.025)'; g.beginPath(); g.moveTo(wx + 8, G); g.lineTo(wx + ww + 30, G); g.lineTo(wx + ww + 70, y1); g.lineTo(wx + 10, y1); g.closePath(); g.fill();
    // a framed picture of a bone (of course)
    var px = cx + 38 - S.lay.shift; rr(g, px, 84, 40, 30, 3, '#4A3C5C'); rr(g, px + 3, 87, 34, 24, 2, '#2E2742'); bone(g, px + 20, 99, 1.1, -0.2, '#CDBFA6');
    // the couch, on the left
    var cxl = cx + S.lay.couch;
    rr(g, cxl, 214, 96, 44, 12, '#3E3558'); rr(g, cxl - 6, 232, 20, 44, 9, '#463C63'); rr(g, cxl + 82, 232, 20, 44, 9, '#463C63');
    rr(g, cxl + 8, 242, 80, 24, 7, '#4C4169'); rr(g, cxl + 4, 266, 88, 12, 5, '#3A3152');
    ell(g, cxl + 30, 236, 14, 10, '#6A5A8A', -0.2); // a cushion
    g.fillStyle = '#2A2238'; g.fillRect(cxl + 4, 276, 6, 6); g.fillRect(cxl + 86, 276, 6, 6);
    // the refrigerator, on the right (its door opens when someone wants a bone)
    var fx = cx + S.lay.fridge, fy = 150, fw = 52, fh = G - fy;
    var open = S.fridge;
    if (open > 0.01) {
      rr(g, fx, fy, fw, fh, 5, '#4A4256');
      glow(g, fx + fw / 2, fy + fh * 0.45, 70, '255,214,150', 0.22 * S.fridgeLight);
      rr(g, fx + 4, fy + 6, fw - 8, fh - 12, 3, 'rgba(255,228,180,' + (0.35 * S.fridgeLight + 0.1).toFixed(3) + ')');
      g.fillStyle = 'rgba(120,96,80,.5)'; [0.3, 0.55, 0.78].forEach(function (s) { g.fillRect(fx + 6, fy + fh * s, fw - 12, 2); });
      bone(g, fx + 20, fy + fh * 0.55 - 5, 0.8, 0.1); bone(g, fx + 34, fy + fh * 0.55 - 5, 0.8, -0.15); ell(g, fx + 26, fy + fh * 0.3 - 6, 7, 5, '#9BC48A');
      // the door swings toward us
      var dw = fw * (1 - open * 0.75);
      rr(g, fx - (fw - dw) * 0.15 - open * 6, fy - open * 3, dw, fh + open * 6, 5, '#6C6480');
    } else {
      rr(g, fx, fy, fw, fh, 5, '#5F5872'); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(fx, fy + fh * 0.36, fw, 2);
      rr(g, fx + 6, fy + 14, 3, 24, 1.5, '#8F88A3'); rr(g, fx + 6, fy + fh * 0.36 + 12, 3, 30, 1.5, '#8F88A3');
    }
    // the water bowl
    var bx = cx + S.lay.bowl; ell(g, bx, G + 6, 14, 4, 'rgba(0,0,0,.25)'); rr(g, bx - 13, G - 3, 26, 9, 4, '#6B8FB6'); ell(g, bx, G - 3, 12, 2.6, '#9CC3E6');
    // the plug-in night-light by the floor: a warm, steady glow (never flickers)
    var nx = cx + S.lay.light; glow(g, nx, G - 22, 62, '255,190,120', 0.16); rr(g, nx - 5, G - 30, 10, 14, 4, '#FFD9A0'); glow(g, nx, G - 23, 14, '255,230,180', 0.5);
    // the rug the pals sleep on
    ell(g, cx, G + 9, 108, 15, '#5C3F58'); ell(g, cx, G + 9, 97, 12, '#6E4C69'); g.strokeStyle = 'rgba(255,220,240,.12)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(cx, G + 9, 86, 9.5, 0, 0, TAU); g.stroke();
    // a ball and a blanket corner, for a lived-in look
    var ballX = cx - 118; circ(g, ballX, G + 4, 6, '#B85C6B'); g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1; g.beginPath(); g.arc(ballX, G + 4, 6, -1, 1); g.stroke();
  }
  function drawPal(p, T) {
    var P = window.TOLPups; if (!P) return;
    var L = P.looks[p.look], s = PS, br = p.pose === 'lie' && !p.side ? breathAt(p, T) : 0;
    var x = p.x, y = G + 8 + p.y;
    ell(g, x + 2 * p.face, y + 1, 24 * s * (1 + p.y / 60), 4 * s, 'rgba(0,0,0,.28)');
    g.save(); g.translate(x, y - p.lift);
    var big = 1 + p.y / 110;
    if (p.rot) { g.translate(0, -12 * s); g.rotate(p.rot); g.translate(0, 12 * s); }
    g.scale(s * big * p.face, s * big * p.sy * (1 + (S.calm ? 0.012 : 0.022) * br));
    var blink = p.blink && !p.eyeOpen;
    P.draw(g, L, p.pose, p.ph, p.pose === 'run' ? Math.sin(p.ph) * 0.2 : -0.05, blink, T * 1000 * (p.asleep ? 0.25 : 1), p.tilt, {});
    if (p.carry) bone(g, 31, p.pose === 'sit' ? -31 : p.pose === 'run' ? -27 : -14, 1, 0.15);
    g.restore();
  }
  // where her head is, for the z's and the dream bubble
  function headOf(p) { var s = PS; return { x: p.x + 19 * s * p.face, y: G + 8 + p.y - p.lift - 21 * s }; }
  function drawZs(T, dt) {
    var calm = S.calm;
    ['tidbit', 'sugarfoot'].forEach(function (id) {
      var p = PALS[id];
      var sleepy = !S.ev || S.ev.who !== id || S.ev.type === 'sleepwalk' || S.ev.type === 'roll' || S.ev.type === 'kick' || S.ev.type === 'snuggle';
      // at the start of each breath out, a few z's (the breaths are planned a little ahead, so look at every one that is due)
      p.breaths.forEach(function (b) {
        var out = b.t + b.dur * 0.42;
        if (b.z || T < out) return;
        b.z = 1; if (!sleepy || T - out > 1.5) return;
        var h = headOf(p), n = calm ? 1 : 3;
        for (var i = 0; i < n; i++) S.zs.push({ x: h.x + p.face * 6, y: h.y - 4, t0: T + i * (calm ? 0 : 0.55), size: 9 + i * 3.5, dir: p.face, big: i === n - 1 });
      });
    });
    var life = calm ? 6 : 4.2;
    S.zs = S.zs.filter(function (z) { return T - z.t0 < life; });
    g.textAlign = 'center'; g.textBaseline = 'middle';
    S.zs.forEach(function (z) {
      var u = (T - z.t0) / life; if (u < 0) return;
      var a = Math.sin(Math.PI * clamp(u, 0, 1)) * 0.85;
      var x = z.x + z.dir * (u * 22 + Math.sin(u * 5) * 3), y = z.y - u * (calm ? 30 : 42);
      g.font = 'italic 600 ' + (z.size * (0.7 + u * 0.6)).toFixed(1) + 'px Fraunces, Georgia, serif';
      g.fillStyle = 'rgba(205,195,255,' + a.toFixed(3) + ')'; g.fillText(z.big ? 'Z' : 'z', x, y);
    });
  }
  function drawExtras(T) {
    // the bone she brought back, slowly nibbled away
    if (S.boneFloor && S.boneLeft > 0.02) { var bp = PALS[S.boneOwner || 'tidbit']; bone(g, bp.x + bp.face * 34, G + 6, S.boneLeft * 1.1, 0.1); }
    if (S.bubble) {
      var p = PALS[S.bubble.who], h = headOf(p), a = S.bubble.a, bx = h.x + p.face * 30, by = h.y - 34;
      g.globalAlpha = a * 0.9;
      circ(g, h.x + p.face * 10, h.y - 8, 2.4, '#E9E2FB'); circ(g, h.x + p.face * 17, h.y - 17, 3.6, '#E9E2FB');
      ell(g, bx, by, 24, 16, '#E9E2FB'); circ(g, bx - 14, by - 6, 9, '#E9E2FB'); circ(g, bx + 12, by - 8, 10, '#E9E2FB');
      // the ball she's dreaming about, bouncing gently
      var bob = Math.abs(Math.sin(S.bubble.t * (S.calm ? 2 : 3.2))) * 6;
      circ(g, bx, by + 3 - bob, 6.5, '#D9657A'); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.2; g.beginPath(); g.arc(bx, by + 3 - bob, 6.5, -1.2, 0.6); g.stroke();
      g.globalAlpha = 1;
    }
    if (S.bump) {
      var u = (T - S.bump.t) / 1.6; if (u > 1) S.bump = null;
      else { g.globalAlpha = Math.sin(Math.PI * u) * 0.8; g.fillStyle = '#F6E7B0'; g.font = '600 11px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.fillText('boop', S.bump.x, G - 52 - u * 8); g.globalAlpha = 1; }
    }
  }
  function brightness(T) {
    var b = 1;
    if (S.dim) b = mix(1, 0.5, sio(seg(T, 60, 240)));
    if (S.ending) b *= 1 - sio(seg(T, S.ending, S.ending + FADE_OUT)) * 0.96;
    return b;
  }
  function render(T, dt) {
    if (!g || !W) return;
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#0D0B16'; g.fillRect(0, 0, W, H);
    g.setTransform(geo.k * DPR, 0, 0, geo.k * DPR, geo.ox * DPR, geo.oy * DPR);
    drawRoom(T);
    // the pal further from the rug's middle is drawn first, so a sleepwalker in front of the rug is on top
    var order = ['tidbit', 'sugarfoot'].sort(function (a, b) { return PALS[a].y - PALS[b].y; });
    order.forEach(function (id) { drawPal(PALS[id], T); });
    drawExtras(T);
    drawZs(T, dt);
    // the dimmer: the whole room fades toward black
    var br = brightness(T);
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (br < 0.999) { g.fillStyle = 'rgba(4,3,8,' + (1 - br).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
  }
  function resize() {
    if (!cv) return;
    var r = cv.getBoundingClientRect(); DPR = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.max(200, Math.round(r.width)), h = Math.max(150, Math.round(r.height));
    W = Math.round(w * DPR); H = Math.round(h * DPR); cv.width = W; cv.height = H;
    geo = geoFor(w, h); S.LW = geo.LW; S.cx = geo.LW / 2; S.lay = layout(geo.LW);
    ['tidbit', 'sugarfoot'].forEach(function (id) { var p = PALS[id]; if (!S.ev || S.ev.who !== id) p.x = homeX(p); });
    render(S.T, 0);
  }

  // ------------------------------------------------------------------ the loop
  function frame(now) {
    S.raf = 0; if (!S.on) return;
    var dt = S.last ? Math.min(0.1, (now - S.last) / 1000) : 0; S.last = now;
    S.T = (now - S.t0) / 1000;
    S.sinceDraw += dt;
    if (!document.hidden) {
      if (!S.ev && !S.ending && S.T >= S.nextEv) startEvent();
      runEvent(dt);
      // a pal in the middle of a happening isn't snoring (unless she's sleepwalking, dreaming or rolling over)
      ['tidbit', 'sugarfoot'].forEach(function (id) { if (!S.ev || S.ev.who !== id) PALS[id].asleep = true; });
      if (S.sinceDraw >= 1 / S.fps - 0.004) { render(S.T, S.sinceDraw); S.sinceDraw = 0; }
    }
    timerTick();
    if (S.ended) { render(S.T, 0); return; }
    S.raf = requestAnimationFrame(frame);
  }
  function timerTick() {
    if (S.timerEnd && !S.ending && S.T >= S.timerEnd) beginEnding();
    if (S.ending && !S.ended && S.T >= S.ending + FADE_OUT + 2) finish();
    if (UI.timerBtn) updateTimerBtn();
  }
  function beginEnding() {
    S.ending = S.T;
    if (A.c) A.fade.gain.setTargetAtTime(0, A.c.currentTime, END_TC); // a long, even fade (down 49 dB after 90 s)
  }
  function finish() {
    S.ended = true; clearInterval(A.sched); A.sched = 0; stopBed();
    if (A.c && A.c.state === 'running') { try { A.c.suspend(); } catch (e) {} }
    releaseWake();
    if (UI.root) UI.root.classList.add('is-done');
    say('Sweet dreams. Tap the screen to wake the cam.');
  }
  // ------------------------------------------------------------------ screen wake lock
  function requestWake() {
    if (!S.wake || !S.on || S.ended || S.lock || !('wakeLock' in navigator) || document.hidden) return;
    try { navigator.wakeLock.request('screen').then(function (l) { S.lock = l; l.addEventListener('release', function () { S.lock = null; }); }).catch(function () {}); } catch (e) {}
  }
  function releaseWake() { if (S.lock) { try { S.lock.release(); } catch (e) {} S.lock = null; } }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && S.on) { requestWake(); S.last = 0; } });

  // ------------------------------------------------------------------ start / stop
  function start(opts) {
    opts = opts || {};
    var pr = prefs();
    S.calm = calmNow();
    S.timerMin = opts.timer != null ? +opts.timer : (pr.timer || 0);
    S.bed = opts.bed || pr.bed || 'off';
    S.snore = opts.snore != null ? !!opts.snore : pr.snore !== false;
    S.soundOn = opts.sound != null ? !!opts.sound : siteSoundOK();
    S.dim = opts.dim != null ? !!opts.dim : pr.dim !== false;
    S.wake = pr.wake !== false;
    S.on = true; S.ended = false; S.ending = 0; S.ev = null; S.zs = []; S.T = 0; S.t0 = performance.now(); S.last = 0;
    S.timerEnd = S.timerMin ? S.timerMin * 60 : 0;
    ['tidbit', 'sugarfoot'].forEach(function (id) { var p = PALS[id]; p.breaths = []; p.nextB = 0; p.asleep = true; p.homeDx = HOME[id].dx; p.x = homeX(p); });
    scheduleNext(true);
    clearInterval(A.sched); A.sched = setInterval(audioTick, 250); audioTick();
    if (S.soundOn) audioOn(true);
    requestWake();
    if (!S.raf) S.raf = requestAnimationFrame(frame);
    savePrefs({ timer: S.timerMin, bed: S.bed, snore: S.snore, dim: S.dim, wake: S.wake });
  }
  // sound on: build the audio the first time, fade in slowly (about 9 s), and bring the bed in. Sound off: a smooth fade, then the audio sleeps.
  function audioOn(fresh) {
    var c = actx(); if (!c) return;
    if (c.state === 'suspended') { try { var r = c.resume(); if (r && r.catch) r.catch(noop); } catch (e) {} }
    var t = c.currentTime;
    A.mute.gain.setTargetAtTime(1, t, 0.3);
    if (fresh) A.fade.gain.setTargetAtTime(1, t, FADE_TC);
    A.snore.gain.setTargetAtTime(S.snore ? 1 : 0, t, 0.4);
    updateGates(); syncClock(); if (!A.bedNodes || A.bedNodes.kind !== S.bed) setBed(S.bed);
  }
  function audioOff() {
    if (!A.c) return;
    A.mute.gain.setTargetAtTime(0, A.c.currentTime, 0.3);
  }
  function stopBed() { if (A.bedNodes) { var old = A.bedNodes; A.bedNodes = null; try { old.g.gain.setTargetAtTime(0, A.c.currentTime, 0.4); } catch (e) {} setTimeout(function () { try { old.stop(); } catch (e) {} }, 3000); } }
  function setSound(on) {
    S.soundOn = !!on;
    if (!S.on) return;
    if (S.soundOn) { audioOn(!A.c || A.c.state === 'suspended'); if (!S.ending) A.fade.gain.setTargetAtTime(1, A.c.currentTime, 1.2); } else audioOff();
  }
  function stop() {
    S.on = false; if (S.raf) cancelAnimationFrame(S.raf); S.raf = 0; clearInterval(A.sched); A.sched = 0;
    if (A.c) {
      var c = A.c; A.fade.gain.setTargetAtTime(0, c.currentTime, 0.25); stopBed();
      setTimeout(function () { if (!S.on && c.state === 'running') { try { c.suspend(); } catch (e) {} } }, 1800);
    }
    releaseWake();
  }

  // ------------------------------------------------------------------ the page's controls
  var UI = {};
  function say(t) { if (!UI.hint) return; UI.hint.textContent = t; UI.hint.classList.add('is-on'); clearTimeout(UI.hintT); UI.hintT = setTimeout(function () { UI.hint.classList.remove('is-on'); }, 4000); }
  var BEDS = [['off', 'No sound bed'], ['rain', 'Soft rain'], ['fan', 'Fan'], ['brown', 'Brown noise']], TIMERS = [0, 15, 30, 60];
  function fmtLeft() { if (!S.timerEnd) return 'Timer off'; if (S.ending) return 'Fading out'; var m = Math.max(1, Math.ceil((S.timerEnd - S.T) / 60)); return m + ' min left'; }
  function updateTimerBtn() { var t = '⏲ ' + fmtLeft(); if (UI.timerBtn.textContent !== t) UI.timerBtn.textContent = t; }
  function syncButtons() {
    if (!UI.root) return;
    updateTimerBtn();
    var bn = BEDS.filter(function (b) { return b[0] === S.bed; })[0] || BEDS[0];
    UI.bedBtn.textContent = '🌧 ' + bn[1]; UI.bedBtn.setAttribute('aria-label', 'Sound bed: ' + bn[1] + '. Change it');
    if (UI.soundBtn) { UI.soundBtn.textContent = (S.soundOn ? '🔈 Sound on' : '🔇 Sound off'); UI.soundBtn.setAttribute('aria-pressed', String(S.soundOn)); }
    UI.snoreBtn.textContent = (S.snore ? '💤 Snores on' : '💤 Snores off'); UI.snoreBtn.setAttribute('aria-pressed', String(S.snore));
    UI.dimBtn.textContent = (S.dim ? '🌙 Dimmer on' : '🌙 Dimmer off'); UI.dimBtn.setAttribute('aria-pressed', String(S.dim));
  }
  function showControls() {
    if (!UI.root) return; UI.root.classList.remove('is-quiet'); clearTimeout(UI.quietT);
    UI.quietT = setTimeout(function () {
      var a = document.activeElement, kb = false; try { kb = !!(a && UI.root.contains(a) && a.matches(':focus-visible')); } catch (e) {}
      if (!kb) UI.root.classList.add('is-quiet');
    }, 4500);
  }
  function mountPage() {
    var root = document.getElementById('spc-cam'), startBtn = document.getElementById('spc-go'), intro = document.getElementById('spc-start');
    if (!root || !startBtn) return;
    UI.root = root; cv = root.querySelector('canvas'); g = cv.getContext('2d'); UI.cv = cv;
    UI.hint = root.querySelector('.spc-hint');
    UI.timerBtn = root.querySelector('.spc-timer'); UI.bedBtn = root.querySelector('.spc-bed'); UI.snoreBtn = root.querySelector('.spc-snore'); UI.soundBtn = root.querySelector('.spc-sound'); UI.dimBtn = root.querySelector('.spc-dim');
    var pr = prefs();
    // the start screen's choices, remembered from last time
    function setRadio(name, v) { var el = document.querySelector('input[name="' + name + '"][value="' + v + '"]'); if (el) el.checked = true; }
    setRadio('spc-timer', String(pr.timer || 0)); setRadio('spc-bed', pr.bed || 'off');
    var sn = document.getElementById('spc-snore-opt'); if (sn) sn.checked = pr.snore !== false;
    // the site's sound setting (and Quiet mode) keep sound off by default here too; the person can still choose to hear the pups
    var snd = document.getElementById('spc-sound-opt'), sndNote = document.getElementById('spc-sound-note');
    function syncSoundOpt() { var ok = siteSoundOK(); if (snd) snd.checked = ok; if (sndNote) sndNote.hidden = ok; }
    syncSoundOpt(); window.addEventListener('pageshow', syncSoundOpt);
    function radio(name, d) { var el = document.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : d; }
    startBtn.addEventListener('click', function () {
      intro.hidden = true; root.hidden = false; document.documentElement.classList.add('spc-running');
      if (root.requestFullscreen && !document.fullscreenElement && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) { try { var f = root.requestFullscreen(); if (f && f.catch) f.catch(function () {}); } catch (e) {} }
      resize();
      start({ timer: +radio('spc-timer', '0'), bed: radio('spc-bed', 'off'), snore: sn ? sn.checked : true, sound: snd ? snd.checked : siteSoundOK() });
      syncButtons(); showControls();
      say(!S.soundOn ? 'Sound is off. Tap Sound to hear the pups.' : S.timerMin ? 'Goodnight. Everything fades out in ' + S.timerMin + ' minutes.' : 'Goodnight. Tap Exit when you want to stop.');
      setTimeout(function () { var b = root.querySelector('.spc-exit'); if (b) b.focus({ preventScroll: true }); }, 50);
    });
    UI.timerBtn.addEventListener('click', function () {
      var i = TIMERS.indexOf(S.timerMin); S.timerMin = TIMERS[(i + 1) % TIMERS.length]; S.timerEnd = S.timerMin ? S.T + S.timerMin * 60 : 0;
      if (S.ending && !S.ended) { S.ending = 0; if (A.c) A.fade.gain.setTargetAtTime(1, A.c.currentTime, 1.5); }
      var p = prefs(); p.timer = S.timerMin; savePrefs(p); syncButtons(); say(S.timerMin ? 'Sleep timer: ' + S.timerMin + ' minutes' : 'Sleep timer off'); showControls();
    });
    UI.bedBtn.addEventListener('click', function () {
      var i = BEDS.map(function (b) { return b[0]; }).indexOf(S.bed); setBed(BEDS[(i + 1) % BEDS.length][0]); syncButtons(); say(BEDS.filter(function (b) { return b[0] === S.bed; })[0][1]); showControls();
    });
    UI.snoreBtn.addEventListener('click', function () { S.snore = !S.snore; var p = prefs(); p.snore = S.snore; savePrefs(p); if (A.c) A.snore.gain.setTargetAtTime(S.snore ? 1 : 0, A.c.currentTime, 0.4); syncButtons(); say(S.snore ? 'Soft snores on' : 'Snores off (the z’s stay)'); showControls(); });
    if (UI.soundBtn) UI.soundBtn.addEventListener('click', function () { setSound(!S.soundOn); syncButtons(); say(S.soundOn ? 'Sound on' : 'Sound off'); showControls(); });
    // Quiet mode (or the site's sound switch) turned on while the cam is running: the sound fades away and the motion goes gentle
    function onQuiet() { S.calm = calmNow(); if (S.on && S.soundOn && !siteSoundOK()) { setSound(false); syncButtons(); say('Quiet mode is on, so the sound is off.'); } }
    document.addEventListener('tol-quiet', onQuiet); window.addEventListener('storage', function (e) { if (!e.key || /^tol-(quiet|still|sound-off)$/.test(e.key)) onQuiet(); });
    try { var mq = window.matchMedia('(prefers-reduced-motion: reduce)'); if (mq.addEventListener) mq.addEventListener('change', function () { S.calm = calmNow(); }); } catch (e) {}
    UI.dimBtn.addEventListener('click', function () { S.dim = !S.dim; var p = prefs(); p.dim = S.dim; savePrefs(p); syncButtons(); say(S.dim ? 'The room dims slowly' : 'The room stays as it is'); showControls(); });
    root.querySelector('.spc-exit').addEventListener('click', exitCam);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !root.hidden) { exitCam(); } });
    function wakeUp() {
      showControls();
      if (S.ended) { root.classList.remove('is-done'); var keep = { timer: 0, bed: S.bed, snore: S.snore, dim: S.dim, sound: S.soundOn }; start(keep); syncButtons(); say('The cam is back. Sleep timer off.'); }
    }
    ['pointerdown', 'pointermove', 'keydown', 'focusin'].forEach(function (ev) { root.addEventListener(ev, function (e) { if (ev === 'pointermove' && e.pointerType === 'touch') return; wakeUp(); }); });
    window.addEventListener('resize', function () { if (!root.hidden) resize(); });
    function exitCam() {
      stop(); root.hidden = true; intro.hidden = false; root.classList.remove('is-done'); document.documentElement.classList.remove('spc-running');
      if (document.fullscreenElement && document.exitFullscreen) { try { document.exitFullscreen(); } catch (e) {} }
      startBtn.focus();
    }
    // a still preview on the start screen
    var pv = document.getElementById('spc-preview');
    if (pv) {
      var drawPv = function () {
        if (S.on) return;
        var keepCv = cv, keepG = g, keepDim = S.dim;
        cv = pv; g = pv.getContext('2d'); S.dim = false;
        ['tidbit', 'sugarfoot'].forEach(function (id) { PALS[id].breaths = [{ t: -10, dur: 4, z: 1 }]; });
        resize();
        var ht = headOf(PALS.tidbit), hs = headOf(PALS.sugarfoot);
        S.zs = [{ x: ht.x + 6, y: ht.y - 4, t0: -1.4, size: 10, dir: 1 }, { x: ht.x + 6, y: ht.y - 4, t0: -2.6, size: 14, dir: 1, big: true }, { x: hs.x - 6, y: hs.y - 4, t0: -1.1, size: 11, dir: -1 }];
        render(0, 0); S.zs = [];
        cv = keepCv; g = keepG; S.dim = keepDim;
      };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawPv, drawPv); else drawPv();
      window.addEventListener('resize', function () { if (root.hidden) drawPv(); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountPage); else mountPage();

  window.TOLSleepCam = {
    start: start, stop: stop,
    trigger: function (type, who) { if (S.ev) { S.ev.t0 = S.T - S.ev.dur - 1; runEvent(0); } return startEvent(type, who); },
    state: function () { return { on: S.on, T: S.T, ev: S.ev ? S.ev.type : null, who: S.ev ? S.ev.who : null, next: S.nextEv, calm: S.calm, bed: S.bed, snore: S.snore, dim: S.dim, timer: S.timerMin, ending: !!S.ending, ended: S.ended, zs: S.zs.length,
      pals: ['tidbit', 'sugarfoot'].map(function (id) { var p = PALS[id]; return { id: id, x: p.x, pose: p.pose, face: p.face, asleep: p.asleep, rot: p.rot }; }), audio: A.c ? A.c.state : 'none' }; },
    sound: function (on) { setSound(on); syncButtons(); },
    _skip: function (secs) { S.t0 -= secs * 1000; },
    _hold: function () { S.nextEv = 1e9; }, // tests: no random happenings
    _sfx: function (name, arg) { return SFX[name] && SFX[name](arg); },
    _audio: function () { return A; }
  };
})();
