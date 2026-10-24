/* pals-cam-sleep.js — the Sleeping Pals Cam (sleeping-pals-cam.html): Tidbit and Sugarfoot fast asleep in a
   dim, warm room at night, something to go to bed to.
   - Each pup breathes and lightly snores in her own rhythm (Tidbit a little quicker and higher, Sugarfoot
     slower and deeper), and little z's float up as she breathes out.
   - Now and then, never on a schedule (every few minutes on average, picked at random), one of them does
     something: pads to the refrigerator for a bone, has a drink of water, rolls onto her back, turns around
     and settles again, kicks in a dream, scoots closer, or sleepwalks a little circle and bumps into the couch.
   - Optional soft sound bed (rain, a fan or brown noise), a sleep timer that fades everything out, a dimmer
     that brings the room close to black, and the screen kept awake while it runs (where the browser allows).
   - Calm motion (the device's reduce-motion setting, or the site's "Keep the page still" / Quiet mode):
     fewer, slower happenings and slower z's. Nothing ever flashes.
   All the sound is made right here with Web Audio (plus the site's own rain recording and, in a dream, a
   muffled bark), with smooth fades on every sound, so nothing clicks.
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
    timerMin: 0, timerEnd: 0, ending: 0, ended: false, dim: true, bed: 'off', snore: true, wake: true, lock: null, fps: 30, sinceDraw: 0,
    fridge: 0, fridgeLight: 0, boneFloor: 0, boneLeft: 0, bubble: null, bump: null, lay: { couch: -232, fridge: 186, bowl: 140, light: 100, shift: 0 } };
  var cv = null, g = null, W = 0, H = 0, DPR = 1, geo = null;

  // ------------------------------------------------------------------ audio
  var A = { c: null, master: null, snore: null, bed: null, sfx: null, noise: null, brown: null, rain: null, bedNodes: null, barks: {}, sched: 0, off: 0 };
  function actx() {
    if (A.c) return A.c;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { A.c = new AC(); } catch (e) { return null; }
    var c = A.c;
    A.master = c.createGain(); A.master.gain.value = 0.0001; A.master.connect(c.destination);
    A.snore = c.createGain(); A.snore.gain.value = 1; A.snore.connect(A.master);
    A.bed = c.createGain(); A.bed.gain.value = 1; A.bed.connect(A.master);
    A.sfx = c.createGain(); A.sfx.gain.value = 1; A.sfx.connect(A.master);
    // white noise (any loop point in white noise is just another random sample: no click) and brown noise
    var n = c.sampleRate * 3, wb = c.createBuffer(1, n, c.sampleRate), wd = wb.getChannelData(0);
    for (var i = 0; i < n; i++) wd[i] = Math.random() * 2 - 1;
    A.noise = wb;
    var bb = c.createBuffer(1, n, c.sampleRate), bd = bb.getChannelData(0), last = 0;
    for (var j = 0; j < n; j++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; bd[j] = last * 3.5; }
    // brown noise drifts, so blend its end into its start for a seamless loop
    var xf = Math.round(c.sampleRate * 0.5); for (var k = 0; k < xf; k++) { var p = k / xf; bd[k] = bd[k] * Math.sin(p * Math.PI / 2) + bd[n - xf + k] * Math.cos(p * Math.PI / 2); }
    A.brown = c.createBuffer(1, n - xf, c.sampleRate); A.brown.getChannelData(0).set(bd.subarray(0, n - xf));
    buildSnorers();
    return c;
  }
  function noiseSrc(buf) { var s = A.c.createBufferSource(); s.buffer = buf || A.noise; s.loop = true; s.start(A.c.currentTime, Math.random() * 2); return s; }
  // each pup's snore voice: noise through a low filter, given a soft flutter (the "snore" rattle), and a separate
  // faint breath-out puff; both sit at zero until a breath opens them with a smooth envelope
  function buildSnorers() {
    var c = A.c;
    ['tidbit', 'sugarfoot'].forEach(function (id) {
      var tid = id === 'tidbit', s = noiseSrc(), lp = c.createBiquadFilter(), lp2 = c.createBiquadFilter(), mod = c.createGain(), env = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : c.createGain();
      lp.type = 'lowpass'; lp.frequency.value = tid ? 560 : 400; lp.Q.value = 2.2; lp2.type = 'lowpass'; lp2.frequency.value = tid ? 900 : 700;
      mod.gain.value = 0.55; env.gain.value = 0.0001; if (pan.pan) pan.pan.value = tid ? -0.28 : 0.28;
      var lfo = c.createOscillator(), dep = c.createGain(); lfo.frequency.value = tid ? 31 : 24; dep.gain.value = 0.45; lfo.connect(dep); dep.connect(mod.gain); lfo.start();
      s.connect(lp); lp.connect(lp2); lp2.connect(mod); mod.connect(env); env.connect(pan); pan.connect(A.snore);
      var ps = noiseSrc(), bp = c.createBiquadFilter(), penv = c.createGain();
      bp.type = 'bandpass'; bp.frequency.value = tid ? 1500 : 1100; bp.Q.value = 0.9; penv.gain.value = 0.0001; ps.connect(bp); bp.connect(penv); penv.connect(pan);
      PALS[id].au = { env: env, penv: penv, lfo: lfo };
    });
  }
  function aT(T) { return T + A.off; } // the page clock (T) to the audio clock
  function syncClock() { if (A.c) A.off = A.c.currentTime - S.T; }
  function ramp(p, t, peak, a, hold, r) { p.value = 0.0001; p.setValueAtTime(0.0001, t); p.linearRampToValueAtTime(peak, t + a); p.setValueAtTime(peak, t + a + hold); p.linearRampToValueAtTime(0.0001, t + a + hold + r); }
  // one breath: the snore on the way in, a faint puff on the way out
  function breathSound(pal, b) {
    if (!A.c || !pal.au || !S.snore || S.ended) return;
    var t = aT(b.t), tid = pal.id === 'tidbit', inh = b.dur * 0.42, pk = (tid ? 0.11 : 0.13) * b.vol;
    if (t < A.c.currentTime + 0.02) return;
    pal.au.lfo.frequency.setValueAtTime((tid ? 31 : 24) * rand(0.94, 1.06), t);
    ramp(pal.au.env.gain, t, pk, inh * 0.45, inh * 0.2, inh * 0.35);
    ramp(pal.au.penv.gain, t + inh + 0.05, (tid ? 0.022 : 0.026) * b.vol, b.dur * 0.15, b.dur * 0.08, b.dur * 0.22);
  }
  function scheduleBreaths() {
    if (!S.on) return;
    syncClock();
    var horizon = S.T + 2.2;
    ['tidbit', 'sugarfoot'].forEach(function (id) {
      var p = PALS[id];
      if (!p.nextB) p.nextB = S.T + (id === 'tidbit' ? 0.4 : 1.9);
      while (p.nextB < horizon) {
        var dur = p.period * rand(0.92, 1.08), b = { t: p.nextB, dur: dur, vol: rand(0.75, 1) };
        p.breaths.push(b); if (p.breaths.length > 8) p.breaths.shift();
        if (p.asleep) breathSound(p, b);
        p.nextB += dur;
      }
    });
  }
  // the visual breath: 0 (out) .. 1 (full), and whether this is the moment to breathe out a z
  function breathAt(p, T) { for (var i = p.breaths.length - 1; i >= 0; i--) { var b = p.breaths[i]; if (T >= b.t) { var u = (T - b.t) / b.dur; return u < 0.42 ? sio(u / 0.42) : 1 - sio((u - 0.42) / 0.58); } } return 0; }
  function setBed(kind) {
    S.bed = kind; var p = prefs(); p.bed = kind; savePrefs(p);
    var c = A.c; if (!c) return;
    var now = c.currentTime;
    if (A.bedNodes) { var old = A.bedNodes; old.g.gain.cancelScheduledValues(now); old.g.gain.setValueAtTime(Math.max(0.0001, old.g.gain.value), now); old.g.gain.linearRampToValueAtTime(0.0001, now + 1.5); setTimeout(function () { try { old.s.stop(); } catch (e) {} }, 1800); A.bedNodes = null; }
    if (kind === 'off') return;
    var gn = c.createGain(); gn.gain.value = 0.0001; gn.gain.setValueAtTime(0.0001, now); gn.connect(A.bed);
    var lv = 0.3, src;
    if (kind === 'rain') {
      if (!A.rain) { loadRain(); }
      if (!A.rain) { A.bedNodes = { s: { stop: function () {} }, g: gn, pending: true }; return; }
      src = c.createBufferSource(); src.buffer = A.rain; src.loop = true; src.start(now, Math.random() * A.rain.duration); src.connect(gn); lv = 0.42;
    } else if (kind === 'fan') {
      src = noiseSrc(); var lp = c.createBiquadFilter(), hp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 0.4; hp.type = 'highpass'; hp.frequency.value = 90;
      src.connect(hp); hp.connect(lp); lp.connect(gn); lv = 0.16;
    } else {
      src = noiseSrc(A.brown); var lb = c.createBiquadFilter(); lb.type = 'lowpass'; lb.frequency.value = 600; src.connect(lb); lb.connect(gn); lv = 0.5;
    }
    gn.gain.linearRampToValueAtTime(lv, now + 2.5);
    A.bedNodes = { s: src, g: gn };
  }
  function seamless(c, buf) {
    try {
      var sr = buf.sampleRate, pad = Math.min(Math.round(0.06 * sr), Math.floor(buf.length / 8)), n = buf.length - pad * 2, x = Math.min(Math.round(1.5 * sr), Math.floor(n / 3));
      if (n < sr * 2 || x < 64) return buf;
      var out = c.createBuffer(buf.numberOfChannels, n - x, sr);
      for (var ch = 0; ch < buf.numberOfChannels; ch++) {
        var a = buf.getChannelData(ch).subarray(pad, pad + n), o = out.getChannelData(ch);
        for (var i = 0; i < x; i++) { var p = (i + 0.5) / x; o[i] = a[i] * Math.sin(p * Math.PI / 2) + a[n - x + i] * Math.cos(p * Math.PI / 2); }
        o.set(a.subarray(x, n - x), x);
      }
      return out;
    } catch (e) { return buf; }
  }
  var rainLoading = false;
  function loadRain() {
    if (rainLoading || !A.c) return; rainLoading = true;
    fetch('/assets/audio/ambience/rain.mp3').then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (ab) {
      if (!ab) return null; return new Promise(function (ok) { try { var pr = A.c.decodeAudioData(ab, ok, function () { ok(null); }); if (pr && pr.catch) pr.catch(function () { ok(null); }); } catch (e) { ok(null); } });
    }).then(function (b) { if (b) { A.rain = seamless(A.c, b); if (S.bed === 'rain' && S.on) setBed('rain'); } }).catch(function () {});
  }
  function loadBark(id) {
    if (A.barks[id] || !A.c) return; A.barks[id] = 'loading';
    fetch('/assets/audio/palcam/' + id + '-bark-' + (id === 'tidbit' ? 2 : 3) + '.wav').then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (ab) {
      if (!ab) return; A.c.decodeAudioData(ab, function (b) { A.barks[id] = b; }, function () {});
    }).catch(function () {});
  }
  // little event sounds, every one with a soft envelope
  function sfxNoise(t, len, type, f, q, peak) {
    var c = A.c; if (!c || S.ended) return; t = Math.max(t, c.currentTime + 0.01);
    var s = c.createBufferSource(), fl = c.createBiquadFilter(), gn = c.createGain();
    s.buffer = A.noise; fl.type = type; fl.frequency.value = f; fl.Q.value = q; s.connect(fl); fl.connect(gn); gn.connect(A.sfx);
    ramp(gn.gain, t, peak, Math.min(0.15, len * 0.3), len * 0.2, len * 0.5); s.start(t, Math.random() * 2); s.stop(t + len + 0.1);
  }
  function sfxTone(t, f0, f1, len, peak, type) {
    var c = A.c; if (!c || S.ended) return; t = Math.max(t, c.currentTime + 0.01);
    var o = c.createOscillator(), gn = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + len); o.connect(gn); gn.connect(A.sfx);
    ramp(gn.gain, t, peak, 0.015, len * 0.2, len * 0.75); o.start(t); o.stop(t + len + 0.1);
  }
  var SFX = {
    step: function () { if (A.c) sfxNoise(A.c.currentTime, 0.07, 'lowpass', 260, 0.7, 0.07); },
    fridge: function () { if (!A.c) return; var t = A.c.currentTime; sfxTone(t, 80, 60, 0.18, 0.07); sfxNoise(t + 0.02, 0.25, 'lowpass', 500, 0.5, 0.025); },
    hum: function (len) { if (!A.c) return; var c = A.c, t = c.currentTime, o = c.createOscillator(), gn = c.createGain(); o.frequency.value = 118; o.connect(gn); gn.connect(A.sfx); ramp(gn.gain, t, 0.008, 0.6, Math.max(0.1, len - 1.4), 0.8); o.start(t); o.stop(t + len + 0.2); },
    crunch: function () { if (A.c) sfxNoise(A.c.currentTime, 0.1, 'bandpass', 1300, 1.4, 0.035); },
    lap: function () { if (A.c) sfxNoise(A.c.currentTime, 0.06, 'bandpass', 1250, 2.5, 0.035); },
    bump: function () { if (!A.c) return; var t = A.c.currentTime; sfxTone(t, 110, 55, 0.22, 0.12); sfxNoise(t, 0.12, 'lowpass', 300, 0.6, 0.05); },
    rustle: function () { if (A.c) sfxNoise(A.c.currentTime, 0.8, 'bandpass', 1500, 0.7, 0.02); },
    woof: function (id) {
      var c = A.c, b = A.barks[id]; if (!c || !b || b === 'loading' || S.ended) return;
      var s = c.createBufferSource(), lp = c.createBiquadFilter(), gn = c.createGain(), t = c.currentTime + 0.02; s.buffer = b; s.playbackRate.value = 0.9;
      lp.type = 'lowpass'; lp.frequency.value = 650; s.connect(lp); lp.connect(gn); gn.connect(A.sfx); gn.gain.value = 0.0001; gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(0.16, t + 0.02); s.start(t);
    }
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
    if (type === 'kick') loadBark(who);
    return true;
  }
  function once(ev, key) { if (ev.fired[key]) return false; ev.fired[key] = 1; return true; }
  // walking from a to b over [t0,t1] (in event seconds), with paw steps you can (softly) hear
  function walk(p, ev, u, t0, t1, xa, xb, stepKey) {
    if (u < t0 || u > t1) return false;
    var q = sio(seg(u, t0, t1)); p.x = mix(xa, xb, q); p.pose = 'run'; p.face = xb >= xa ? 1 : -1; p.ph = (u - t0) * 6.5 / ev.k; p.lift = Math.abs(Math.sin(p.ph)) * 1.2;
    var step = Math.floor((u - t0) * 2.1 / ev.k); if (once(ev, stepKey + step)) SFX.step();
    return true;
  }
  function runEvent(dt) {
    var ev = S.ev; if (!ev) return;
    var p = PALS[ev.who], o = PALS[ev.who === 'tidbit' ? 'sugarfoot' : 'tidbit'], u = (S.T - ev.t0) / ev.k, hx = homeX(p);
    p.asleep = true; p.pose = 'lie'; p.rot = 0; p.lift = 0; p.side = false; p.tilt = 0; p.carry = false; p.x = hx; p.sy = 1; p.blink = true;
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
          if (u > 19 && u < 23.5) { var bite = Math.floor((u - 19) * 1.3); if (once(ev, 'c' + bite)) SFX.crunch(); } }
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
        break;
      }
      case 'turn': {
        // sits up, turns around twice the way dogs do, and flops back down
        p.asleep = u < 0.6 || u > 5.4;
        if (u < 0.8) { p.pose = 'sit'; }
        else if (u < 4.6) { var turns = (u - 0.8) / 1.9; p.pose = 'run'; p.ph = u * 5; p.face = Math.floor(turns * 2) % 2 ? -HOME[p.id].face : HOME[p.id].face; p.x = hx + Math.sin(turns * TAU) * 7; p.lift = 0.6; var st = Math.floor(u * 2); if (once(ev, 's' + st)) SFX.step(); }
        else { p.pose = u < 5.2 ? 'sit' : 'lie'; p.sy = u < 5.6 ? 1 - Math.sin(Math.PI * seg(u, 5.2, 5.6)) * 0.08 : 1; }
        if (once(ev, 'ru')) SFX.rustle();
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
      var p = PALS[id], b = p.breaths.length ? p.breaths[p.breaths.length - 1] : null;
      var sleepy = !S.ev || S.ev.who !== id || S.ev.type === 'sleepwalk' || S.ev.type === 'roll' || S.ev.type === 'kick' || S.ev.type === 'snuggle';
      if (!b || !sleepy) return;
      // at the start of each breath out, a few z's
      var out = b.t + b.dur * 0.42;
      if (!b.z && T >= out) {
        b.z = 1; var h = headOf(p), n = calm ? 1 : 3;
        for (var i = 0; i < n; i++) S.zs.push({ x: h.x + p.face * 6, y: h.y - 4, t0: T + i * (calm ? 0 : 0.55), size: 9 + i * 3.5, dir: p.face, big: i === n - 1 });
      }
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
    if (S.ending) b *= 1 - sio(seg(T, S.ending, S.ending + 60)) * 0.96;
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
    if (S.ending && !S.ended && S.T >= S.ending + 62) finish();
    if (UI.timerBtn) updateTimerBtn();
  }
  function beginEnding() {
    S.ending = S.T;
    if (A.c) { var t = A.c.currentTime; A.master.gain.cancelScheduledValues(t); A.master.gain.setValueAtTime(Math.max(0.0001, A.master.gain.value), t); A.master.gain.linearRampToValueAtTime(0.0001, t + 60); }
  }
  function finish() {
    S.ended = true; clearInterval(A.sched); A.sched = 0;
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
    S.dim = opts.dim != null ? !!opts.dim : pr.dim !== false;
    S.wake = pr.wake !== false;
    S.on = true; S.ended = false; S.ending = 0; S.ev = null; S.zs = []; S.T = 0; S.t0 = performance.now(); S.last = 0;
    S.timerEnd = S.timerMin ? S.timerMin * 60 : 0;
    ['tidbit', 'sugarfoot'].forEach(function (id) { var p = PALS[id]; p.breaths = []; p.nextB = 0; p.asleep = true; p.homeDx = HOME[id].dx; p.x = homeX(p); });
    scheduleNext(true);
    var c = actx();
    if (c) {
      if (c.state === 'suspended') { try { var r = c.resume(); if (r && r.catch) r.catch(function () {}); } catch (e) {} }
      var t = c.currentTime; A.master.gain.cancelScheduledValues(t); A.master.gain.setValueAtTime(0.0001, t); A.master.gain.linearRampToValueAtTime(0.8, t + 3);
      syncClock(); setBed(S.bed); scheduleBreaths();
      clearInterval(A.sched); A.sched = setInterval(function () { S.T = (performance.now() - S.t0) / 1000; scheduleBreaths(); }, 250);
    }
    requestWake();
    if (!S.raf) S.raf = requestAnimationFrame(frame);
    savePrefs({ timer: S.timerMin, bed: S.bed, snore: S.snore, dim: S.dim, wake: S.wake });
  }
  function stop() {
    S.on = false; if (S.raf) cancelAnimationFrame(S.raf); S.raf = 0; clearInterval(A.sched); A.sched = 0;
    if (A.c) {
      var c = A.c, t = c.currentTime; A.master.gain.cancelScheduledValues(t); A.master.gain.setValueAtTime(Math.max(0.0001, A.master.gain.value), t); A.master.gain.linearRampToValueAtTime(0.0001, t + 0.6);
      setTimeout(function () { if (!S.on && c.state === 'running') { try { c.suspend(); } catch (e) {} } }, 900);
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
    UI.timerBtn = root.querySelector('.spc-timer'); UI.bedBtn = root.querySelector('.spc-bed'); UI.snoreBtn = root.querySelector('.spc-snore'); UI.dimBtn = root.querySelector('.spc-dim');
    var pr = prefs();
    // the start screen's choices, remembered from last time
    function setRadio(name, v) { var el = document.querySelector('input[name="' + name + '"][value="' + v + '"]'); if (el) el.checked = true; }
    setRadio('spc-timer', String(pr.timer || 0)); setRadio('spc-bed', pr.bed || 'off');
    var sn = document.getElementById('spc-snore-opt'); if (sn) sn.checked = pr.snore !== false;
    function radio(name, d) { var el = document.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : d; }
    startBtn.addEventListener('click', function () {
      intro.hidden = true; root.hidden = false; document.documentElement.classList.add('spc-running');
      if (root.requestFullscreen && !document.fullscreenElement && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) { try { var f = root.requestFullscreen(); if (f && f.catch) f.catch(function () {}); } catch (e) {} }
      resize();
      start({ timer: +radio('spc-timer', '0'), bed: radio('spc-bed', 'off'), snore: sn ? sn.checked : true });
      syncButtons(); showControls();
      say(S.timerMin ? 'Goodnight. Everything fades out in ' + S.timerMin + ' minutes.' : 'Goodnight. Tap Exit when you want to stop.');
      setTimeout(function () { var b = root.querySelector('.spc-exit'); if (b) b.focus({ preventScroll: true }); }, 50);
    });
    UI.timerBtn.addEventListener('click', function () {
      var i = TIMERS.indexOf(S.timerMin); S.timerMin = TIMERS[(i + 1) % TIMERS.length]; S.timerEnd = S.timerMin ? S.T + S.timerMin * 60 : 0;
      if (S.ending && !S.ended) { S.ending = 0; if (A.c) { var t = A.c.currentTime; A.master.gain.cancelScheduledValues(t); A.master.gain.setValueAtTime(Math.max(0.0001, A.master.gain.value), t); A.master.gain.linearRampToValueAtTime(0.8, t + 2); } }
      var p = prefs(); p.timer = S.timerMin; savePrefs(p); syncButtons(); say(S.timerMin ? 'Sleep timer: ' + S.timerMin + ' minutes' : 'Sleep timer off'); showControls();
    });
    UI.bedBtn.addEventListener('click', function () {
      var i = BEDS.map(function (b) { return b[0]; }).indexOf(S.bed); setBed(BEDS[(i + 1) % BEDS.length][0]); syncButtons(); say(BEDS.filter(function (b) { return b[0] === S.bed; })[0][1]); showControls();
    });
    UI.snoreBtn.addEventListener('click', function () { S.snore = !S.snore; var p = prefs(); p.snore = S.snore; savePrefs(p); syncButtons(); say(S.snore ? 'Soft snores on' : 'Snores off (the z’s stay)'); showControls(); });
    UI.dimBtn.addEventListener('click', function () { S.dim = !S.dim; var p = prefs(); p.dim = S.dim; savePrefs(p); syncButtons(); say(S.dim ? 'The room dims slowly' : 'The room stays as it is'); showControls(); });
    root.querySelector('.spc-exit').addEventListener('click', exitCam);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !root.hidden) { exitCam(); } });
    function wakeUp() {
      showControls();
      if (S.ended) { root.classList.remove('is-done'); var keep = { timer: 0, bed: S.bed, snore: S.snore, dim: S.dim }; start(keep); syncButtons(); say('The cam is back. Sleep timer off.'); }
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
    _skip: function (secs) { S.t0 -= secs * 1000; },
    _audio: function () { return A; }
  };
})();
