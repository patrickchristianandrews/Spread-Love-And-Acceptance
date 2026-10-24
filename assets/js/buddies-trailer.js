/* buddies-trailer.js — the Frequency Buddies Season 1 trailer, at the top of frequency-buddies.html.
   About a minute and a quarter: the theme song's "Tune in, turn it up, here we go!", a title card with the
   narrator, then a quick moment from each of the five Season 1 episodes, each with its episode name and a
   one-line lesson, a bouncy music bed under it all, and the chorus over a "Watch Season 1" card at the end.
   The moments are the real episodes, drawn by the real player (buddies-player.js, TOLBuddiesPlayer.excerpt)
   with the real Season 1 recorded voices, so everyone looks and sounds exactly as they do in the show.
   Captions are always on (under the picture, and in the downloadable video). Calm motion (the device's
   reduce-motion setting or "Keep the page still") swaps the wipes for soft fades and keeps the titles still.
   Light never flashes. Nothing is saved or sent anywhere.
   window.TOLTrailer exposes play/pause/seek/state/renderAt/renderAudio for tests and the video render. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  var TAU = Math.PI * 2, VW = 640, VH = 360;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mix(a, b, p) { return a + (b - a) * p; }
  function eout(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
  function sio(p) { p = clamp(p, 0, 1); return 0.5 - 0.5 * Math.cos(Math.PI * p); }
  function backOut(p) { p = clamp(p, 0, 1); var c = 1.70158; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); }
  function seg(u, a, b) { return clamp((u - a) / (b - a), 0, 1); }
  function rnd(i) { var x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
  function calmNow() {
    try { if (window.TOLStill && window.TOLStill.chosen) return !!window.TOLStill.chosen(); } catch (e) {}
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  // ------------------------------------------------------------------ what's in it
  var EPS = [
    { id: 's1e1', n: 1, title: 'The Storm Over the Treehouse', from: 40, to: 44, pre: 0.5, lesson: 'When things fall apart, take a pause, then build it back together.' },
    { id: 's1e2', n: 2, title: 'Out of Tune', from: 234, to: 238, pre: 1.5, lesson: 'Say what you mean, then check how it landed.' },
    { id: 's1e3', n: 3, title: 'The Heavy Basket', from: 89, to: 92, pre: 4, lesson: 'Lay the jobs out where both pals can see them, and share the load.' },
    { id: 's1e4', n: 4, title: 'Who Broke the Kite?', from: 32, to: 36, pre: 3, lesson: 'Before you blame someone, look at how things were set up.' },
    { id: 's1e5', n: 5, title: 'The Longest Night', from: 206, to: 209, pre: 4, lesson: 'Notice your habits, then choose a new way, together.' }
  ];
  var NAMES = { tidbit: 'Tidbit', sugarfoot: 'Sugarfoot', narrator: 'Narrator', owl: 'Ollie', snail: 'Dot', ducklings: 'The ducklings', robot: 'Beep', frog: 'Hopper', squirrel: 'Nutmeg', moon: 'The Moon', puddles: 'Professor Puddles' };
  var AB = '/assets/audio/buddies/';
  var TITLE_LEN = 8.4, CARD_LEN = 4.9, LEAD = 0.45, HOLD = 0.75, END_LEN = 9.2;
  var NARR = { ep: 's1e1', key: '9cd70ae7', text: 'Two pals. One big heart each. Every frequency an adventure.', dur: 3.93 };

  // ------------------------------------------------------------------ building the timeline
  var TL = null, building = null;
  function API() { return window.TOLBuddiesPlayer; }
  function build() {
    if (building) return building;
    var P = API();
    if (!P || !P.excerpt) return Promise.reject(new Error('player'));
    building = Promise.all(EPS.map(function (e) {
      return Promise.all([P.loadEpisode(e.id), fetch(AB + e.id + '/index.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })])
        .then(function (r) { e.ep = r[0]; e.map = r[1] || {}; });
    })).then(function () {
      var t = 0, segs = [], ev = [], caps = [], voice = [];
      segs.push({ kind: 'title', t0: 0, t1: TITLE_LEN }); t = TITLE_LEN;
      ev.push({ t: 0, k: 'sample', id: 'theme', off: 0, len: TITLE_LEN + 0.1, vol: 0.85, fin: 0.05, fout: 0.6 });
      caps.push([4.0, TITLE_LEN - 0.1, '♪', 'Tune in, turn it up, here we go!']);
      segs.push({ kind: 'card', t0: t, t1: t + CARD_LEN });
      ev.push({ t: t, k: 'hit' });
      ev.push({ t: t + 0.4, k: 'sample', id: NARR.ep + '/' + NARR.key, off: 0, len: NARR.dur, vol: 1 }); voice.push([t + 0.4, t + 0.4 + NARR.dur]);
      caps.push([t + 0.4, t + 0.4 + NARR.dur + 0.3, 'Narrator', NARR.text]);
      var bedFrom = t; t += CARD_LEN;
      EPS.forEach(function (e) {
        if (!e.ep) return;
        var lines = [], acts = [];
        var dur = function (b) { var m = e.map[P.clipKey(b.say, b.text)]; return m ? m[0] : Math.max(1.2, String(b.text).length / 15); };
        var x = P.excerpt(e.ep, e.from, e.to, { dur: dur, onLine: function (b, lt, d) { lines.push({ lt: lt, d: d, b: b }); }, onAct: function (b, lt) { acts.push({ lt: lt, b: b }); } });
        var guard = 0; while (!x.ended() && guard++ < 60 * 40) x.step(1 / 60);
        var len = LEAD + x.time() + HOLD, t0 = t;
        segs.push({ kind: 'ep', t0: t0, t1: t0 + len, e: e });
        ev.push({ t: t0 - 0.12, k: 'whoosh' });
        lines.forEach(function (L) {
          var at = t0 + LEAD + L.lt, key = P.clipKey(L.b.say, L.b.text), has = !!e.map[key];
          if (has) { ev.push({ t: at, k: 'sample', id: e.id + '/' + key, off: 0, len: L.d, vol: 1 }); voice.push([at, at + L.d]); }
          caps.push([at, at + L.d + 0.35, NAMES[L.b.say] || L.b.say, L.b.text]);
        });
        acts.forEach(function (A) {
          if (A.b.act !== 'laugh') return; var at = t0 + LEAD + A.lt;
          var who = A.b.who === 'both' ? ['tidbit', 'sugarfoot'] : [A.b.who];
          who.forEach(function (w, i) { if (w === 'tidbit' || w === 'sugarfoot') { ev.push({ t: at + 0.05 + i * 0.35, k: 'sample', id: 'fx/' + w + '-laugh-' + (1 + (e.n + i) % 3), off: 0, len: 1.6, vol: i ? 0.75 : 0.85 }); voice.push([at, at + 1.4 + i * 0.35]); } });
        });
        t += len;
      });
      var endT = t;
      segs.push({ kind: 'end', t0: endT, t1: endT + END_LEN });
      ev.push({ t: endT - 0.12, k: 'whoosh' });
      ev.push({ t: endT, k: 'sample', id: 'theme', off: 30.0, len: END_LEN - 0.3, vol: 0.85, fin: 0.25, fout: 1.2 });
      ev.push({ t: endT + 0.2, k: 'shimmer' });
      caps.push([endT + 0.5, endT + 4.0, '♪', 'Frequency Buddies! (Ooh-ooh!)']);
      caps.push([endT + 4.05, endT + END_LEN - 0.4, '♪', 'Two pals, one big heart each!']);
      // the bouncy bed, from the title card to the last episode moment, a beat at a time
      var BPM = 116, beat = 60 / BPM, PROG = [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]];
      for (var bt = bedFrom, n = 0; bt < endT - 0.05; bt += beat, n++) {
        var bar = Math.floor(n / 4) % 4, inBar = n % 4, ch = PROG[bar];
        if (inBar === 0 || inBar === 2) ev.push({ t: bt, k: 'kick' });
        if (inBar === 1 || inBar === 3) ev.push({ t: bt, k: 'clap' });
        ev.push({ t: bt, k: 'hat', v: 0.7 }); ev.push({ t: bt + beat / 2, k: 'hat', v: 0.45 });
        if (inBar !== 3) ev.push({ t: bt, k: 'bass', f: ch[0] - 12, len: beat * 0.8 });
        if (inBar === 1 || inBar === 3) ev.push({ t: bt + beat / 2, k: 'stab', ch: ch, len: beat * 0.45 });
      }
      // the bed dips under every voice and comes back up after
      voice.sort(function (a, b) { return a[0] - b[0]; });
      var duck = []; voice.forEach(function (v) { var last = duck[duck.length - 1]; if (last && v[0] - 0.4 <= last[1]) last[1] = Math.max(last[1], v[1]); else duck.push([v[0], v[1]]); });
      ev.sort(function (a, b) { return a.t - b.t; });
      caps.sort(function (a, b) { return a[0] - b[0]; });
      TL = { segs: segs, ev: ev, caps: caps, duck: duck, dur: endT + END_LEN, endT: endT, bedFrom: bedFrom };
      return TL;
    });
    return building;
  }

  // ------------------------------------------------------------------ sound
  var AU = { c: null, master: null, bufs: {}, live: null, loading: null, on: true };
  function actx() {
    if (AU.c) return AU.c;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { AU.c = new AC(); } catch (e) { return null; }
    AU.master = AU.c.createGain(); AU.master.gain.value = 1; AU.master.connect(AU.c.destination);
    return AU.c;
  }
  function sampleIds() { var ids = {}; TL.ev.forEach(function (e) { if (e.k === 'sample') ids[e.id] = 1; }); return Object.keys(ids); }
  function urlOf(id) { return id === 'theme' ? AB + 'theme-open.mp3' : AB + id + '.mp3'; }
  function loadSamples(c) {
    var ids = sampleIds();
    return Promise.all(ids.map(function (id) {
      if (AU.bufs[id]) return AU.bufs[id];
      return fetch(urlOf(id)).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (ab) {
        if (!ab) return null; return new Promise(function (ok) { try { var pr = c.decodeAudioData(ab, function (b) { AU.bufs[id] = b; ok(b); }, function () { ok(null); }); if (pr && pr.catch) pr.catch(function () { ok(null); }); } catch (e) { ok(null); } });
      }).catch(function () { return null; });
    }));
  }
  function noiseBuf(c) {
    if (c.__noise) return c.__noise;
    var n = c.sampleRate, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return (c.__noise = b);
  }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  // every sound starts and ends on a smooth envelope (no clicks)
  function env(p, t, peak, a, d) { p.value = 0.0001; p.setValueAtTime(0.0001, t); p.linearRampToValueAtTime(peak, t + a); p.exponentialRampToValueAtTime(0.0001, t + a + d); }
  // schedule the whole trailer from time `from` (seconds into it) onto context c, at context time `at`
  function schedule(c, out, from, at, bufs) {
    var bed = c.createGain(), vox = c.createGain(); bed.gain.value = 0.0001; vox.gain.value = 1; bed.connect(out); vox.connect(out);
    var BED = 0.24, NOW = function (t) { return at + (t - from); };
    // the bed's level: up from the title card on, down under the voices
    bed.gain.setValueAtTime(0.0001, at);
    var lv = function (t) { if (t < TL.bedFrom || t > TL.endT + 0.1) return 0.0001; for (var i = 0; i < TL.duck.length; i++) if (t >= TL.duck[i][0] - 0.1 && t <= TL.duck[i][1] + 0.2) return BED * 0.36; return BED; };
    bed.gain.linearRampToValueAtTime(lv(from), at + 0.05);
    var pts = [TL.bedFrom, TL.endT + 0.1]; TL.duck.forEach(function (d) { pts.push(d[0] - 0.1, d[1] + 0.2); }); pts.sort(function (a, b) { return a - b; });
    pts.forEach(function (p) { if (p <= from) return; var tt = NOW(p); bed.gain.setValueAtTime(Math.max(0.0001, lv(p - 0.001)), tt - 0.12); bed.gain.linearRampToValueAtTime(Math.max(0.0001, lv(p + 0.001)), tt + 0.12); });
    var nb = noiseBuf(c);
    TL.ev.forEach(function (e) {
      if (e.k === 'sample') {
        var b = bufs[e.id]; if (!b) return;
        var end = e.t + Math.min(e.len, b.duration - e.off); if (end <= from) return;
        var into = Math.max(0, from - e.t), t = NOW(e.t + into), s = c.createBufferSource(), g = c.createGain(); s.buffer = b;
        var fin = into > 0 ? 0.12 : (e.fin || 0.01), fout = e.fout || 0.04, len = end - (e.t + into);
        g.gain.value = 0.0001; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(e.vol, t + fin); g.gain.setValueAtTime(e.vol, t + Math.max(fin, len - fout)); g.gain.linearRampToValueAtTime(0.0001, t + len);
        s.connect(g); g.connect(vox); s.start(t, e.off + into); s.stop(t + len + 0.05);
        return;
      }
      if (e.t < from - 0.01) return;
      var tt = NOW(e.t), o, g2, f;
      switch (e.k) {
        case 'kick': o = c.createOscillator(); g2 = c.createGain(); o.frequency.setValueAtTime(140, tt); o.frequency.exponentialRampToValueAtTime(48, tt + 0.16); env(g2.gain, tt, 0.9, 0.004, 0.22); o.connect(g2); g2.connect(bed); o.start(tt); o.stop(tt + 0.3); break;
        case 'clap': o = c.createBufferSource(); o.buffer = nb; f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = 0.8; g2 = c.createGain(); env(g2.gain, tt, 0.42, 0.005, 0.14); o.connect(f); f.connect(g2); g2.connect(bed); o.start(tt, Math.random() * 0.5); o.stop(tt + 0.2); break;
        case 'hat': o = c.createBufferSource(); o.buffer = nb; f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; g2 = c.createGain(); env(g2.gain, tt, 0.13 * (e.v || 1), 0.003, 0.05); o.connect(f); f.connect(g2); g2.connect(bed); o.start(tt, Math.random() * 0.5); o.stop(tt + 0.09); break;
        case 'bass': o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(e.f); g2 = c.createGain(); env(g2.gain, tt, 0.5, 0.01, e.len); o.connect(g2); g2.connect(bed); o.start(tt); o.stop(tt + e.len + 0.05); break;
        case 'stab': e.ch.forEach(function (m, i) { var oo = c.createOscillator(), gg = c.createGain(); oo.type = i ? 'sine' : 'triangle'; oo.frequency.value = hz(m + 12); env(gg.gain, tt, 0.16, 0.006, e.len); oo.connect(gg); gg.connect(bed); oo.start(tt); oo.stop(tt + e.len + 0.05); }); break;
        case 'whoosh': o = c.createBufferSource(); o.buffer = nb; f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.1; f.frequency.setValueAtTime(350, tt); f.frequency.exponentialRampToValueAtTime(3200, tt + 0.42); g2 = c.createGain(); g2.gain.value = 0.0001; g2.gain.setValueAtTime(0.0001, tt); g2.gain.linearRampToValueAtTime(0.16, tt + 0.22); g2.gain.linearRampToValueAtTime(0.0001, tt + 0.5); o.connect(f); f.connect(g2); g2.connect(out); o.start(tt, Math.random() * 0.4); o.stop(tt + 0.55); break;
        case 'hit': o = c.createOscillator(); g2 = c.createGain(); o.frequency.setValueAtTime(90, tt); o.frequency.exponentialRampToValueAtTime(40, tt + 0.5); env(g2.gain, tt, 0.5, 0.006, 0.7); o.connect(g2); g2.connect(out); o.start(tt); o.stop(tt + 0.8); break;
        case 'shimmer': [72, 76, 79, 84, 88].forEach(function (m, i) { var oo = c.createOscillator(), gg = c.createGain(), t2 = tt + i * 0.11; oo.frequency.value = hz(m); env(gg.gain, t2, 0.05, 0.005, 1.1); oo.connect(gg); gg.connect(out); oo.start(t2); oo.stop(t2 + 1.2); }); break;
      }
    });
    return { bed: bed, vox: vox };
  }
  function soundStart(from) {
    soundStop();
    if (!AU.on) return;
    var c = actx(); if (!c || !TL) return;
    if (c.state === 'suspended') { try { var pr = c.resume(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} }
    var bus = c.createGain(); bus.gain.value = 1; bus.connect(AU.master);
    var at = c.currentTime + 0.06;
    schedule(c, bus, from, at, AU.bufs);
    AU.live = { bus: bus, at: at, from: from };
  }
  function soundStop() {
    var L = AU.live; AU.live = null; if (!L || !AU.c) return;
    var t = AU.c.currentTime; try { L.bus.gain.cancelScheduledValues(t); L.bus.gain.setValueAtTime(Math.max(0.0001, L.bus.gain.value), t); L.bus.gain.linearRampToValueAtTime(0.0001, t + 0.08); } catch (e) {}
    setTimeout(function () { try { L.bus.disconnect(); } catch (e) {} }, 400);
  }
  // the whole soundtrack, rendered offline (for the downloadable video): base64 WAV
  function renderAudio() {
    return build().then(function () {
      var sr = 48000, n = Math.ceil(TL.dur * sr), O = window.OfflineAudioContext || window.webkitOfflineAudioContext, c = new O(2, n, sr), bufs = {};
      var ids = sampleIds();
      return Promise.all(ids.map(function (id) { return fetch(urlOf(id)).then(function (r) { return r.arrayBuffer(); }).then(function (ab) { return c.decodeAudioData(ab); }).then(function (b) { bufs[id] = b; }).catch(function () {}); }))
        .then(function () { var out = c.createGain(); out.gain.value = 0.95; out.connect(c.destination); schedule(c, out, 0, 0.02, bufs); return c.startRendering(); })
        .then(function (ab) {
          var L = ab.getChannelData(0), R = ab.getChannelData(1), len = L.length, buf = new ArrayBuffer(44 + len * 4), dv = new DataView(buf);
          function w(o, s) { for (var i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); }
          w(0, 'RIFF'); dv.setUint32(4, 36 + len * 4, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, len * 4, true);
          for (var i = 0, o = 44; i < len; i++, o += 4) { dv.setInt16(o, clamp(L[i], -1, 1) * 32767, true); dv.setInt16(o + 2, clamp(R[i], -1, 1) * 32767, true); }
          var bytes = new Uint8Array(buf), s = '', CH = 0x8000; for (var j = 0; j < bytes.length; j += CH) s += String.fromCharCode.apply(null, bytes.subarray(j, j + CH));
          return btoa(s);
        });
    });
  }

  // ------------------------------------------------------------------ pictures
  function rr(g, x, y, w, h, r, col) { g.fillStyle = col; g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); }
  function circ(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, Math.max(0.01, r), 0, TAU); g.fill(); }
  function heart(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.moveTo(x, y + r * 0.9); g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.5, x, y - r * 0.5); g.bezierCurveTo(x + r * 0.7, y - r * 1.5, x + r * 1.6, y - r * 0.2, x, y + r * 0.9); g.fill(); }
  function star(g, x, y, r, col, rot) { g.fillStyle = col; g.beginPath(); for (var i = 0; i < 10; i++) { var a = (rot || 0) - Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); g.fill(); }
  function note(g, x, y, s, col) { g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 1.8 * s; g.beginPath(); g.ellipse(x, y, 4 * s, 3 * s, -0.4, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x + 3.6 * s, y - 1); g.lineTo(x + 3.6 * s, y - 15 * s); g.quadraticCurveTo(x + 8 * s, y - 11 * s, x + 9 * s, y - 7 * s); g.stroke(); }
  function font(g, w, size, fam) { g.font = w + ' ' + size + 'px ' + (fam || 'Fraunces, Georgia, serif'); }
  function pup(g, who, x, y, s, o) {
    var P = window.TOLPups; if (!P) return; o = o || {};
    var L = P.looks[who === 'tidbit' ? 'collar' : 'drop'];
    g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); g.scale(s * (o.face || 1), s);
    P.draw(g, L, o.pose || 'sit', o.ph || 0, o.wag || 0, !!o.blink, (o.t || 0) * 1000, o.tilt || 0, {});
    g.restore();
  }
  function sky(g, a, b) { var gr = g.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(-40, -40, VW + 80, VH + 80); }
  function drawTitle(g, u, calm) {
    sky(g, '#2B2350', '#7A5C9E');
    for (var i = 0; i < 40; i++) { var tw = calm ? 0.7 : 0.5 + 0.4 * Math.sin(u * 2 + i); circ(g, rnd(i) * VW, rnd(i + 50) * VH * 0.7, 0.6 + rnd(i + 90) * 1.3, 'rgba(255,248,230,' + (tw * 0.8).toFixed(3) + ')'); }
    // a warm glow rises behind the title
    var gl = g.createRadialGradient(VW / 2, VH * 0.52, 10, VW / 2, VH * 0.52, 260); gl.addColorStop(0, 'rgba(255,214,170,' + (0.45 * sio(seg(u, 0.2, 2.2))).toFixed(3) + ')'); gl.addColorStop(1, 'rgba(255,214,170,0)'); g.fillStyle = gl; g.fillRect(0, 0, VW, VH);
    // the hill and the pals
    g.fillStyle = '#4E3E73'; g.beginPath(); g.ellipse(VW / 2, VH + 70, 420, 150, 0, 0, TAU); g.fill();
    var hop = function (k, d) { if (calm) return 0; var p = seg(u, k, k + 0.6); return -Math.sin(Math.PI * p) * 36 * (1 - p * 0.3) + (u > k + 0.6 ? -Math.abs(Math.sin((u - k) * 5.2)) * 4 : 0) * d; };
    var tIn = calm ? sio(seg(u, 2.2, 3.4)) : eout(seg(u, 2.3, 3.0)), sIn = calm ? sio(seg(u, 2.5, 3.7)) : eout(seg(u, 2.6, 3.3));
    g.globalAlpha = calm ? tIn : 1; pup(g, 'tidbit', mix(-60, VW / 2 - 80, tIn), 300 + (calm ? 0 : hop(2.3, 1)), 1.7, { pose: 'sit', wag: Math.sin(u * 9) * 0.5, t: u, face: 1 });
    g.globalAlpha = calm ? sIn : 1; pup(g, 'sugarfoot', mix(VW + 60, VW / 2 + 80, sIn), 300 + (calm ? 0 : hop(2.6, 1)), 1.7, { pose: 'sit', wag: Math.sin(u * 8 + 2) * 0.5, t: u, face: -1 });
    g.globalAlpha = 1;
    // the title, a letter at a time
    var title = 'FREQUENCY BUDDIES'; font(g, '600', 46); g.textAlign = 'left'; g.textBaseline = 'middle';
    var wTot = g.measureText(title).width, x = VW / 2 - wTot / 2;
    for (var k = 0; k < title.length; k++) {
      var ch = title[k], cw = g.measureText(ch).width, p0 = 0.6 + k * 0.06, p = calm ? sio(seg(u, p0, p0 + 0.8)) : seg(u, p0, p0 + 0.45), sc = calm ? 1 : backOut(p);
      if (p > 0) {
        g.save(); g.translate(x + cw / 2, 118 + (calm ? 0 : Math.sin(u * 3 + k * 0.5) * 2 * seg(u, 2, 3))); g.scale(sc, sc); g.globalAlpha = calm ? p : clamp(p * 3, 0, 1);
        g.fillStyle = 'rgba(40,20,60,.45)'; g.fillText(ch, -cw / 2 + 2, 3); g.fillStyle = k < 9 ? '#FFE7B8' : '#FFD2E0'; g.fillText(ch, -cw / 2, 0); g.restore();
      }
      x += cw;
    }
    font(g, 'italic 500', 18); g.textAlign = 'center'; g.fillStyle = 'rgba(255,246,232,' + sio(seg(u, 3.4, 4.4)).toFixed(3) + ')'; g.fillText('Season 1 · The First Adventures', VW / 2, 162);
    // little notes float up with the song
    for (var j = 0; j < 6; j++) { var nu = ((u * (calm ? 0.25 : 0.45)) + j / 6) % 1; if (u < 3.8) break; g.globalAlpha = Math.sin(Math.PI * nu) * 0.8; note(g, 70 + j * 100 + Math.sin(nu * 6 + j) * 10, VH - 40 - nu * 160, 1.2, j % 2 ? '#FFD2E0' : '#FFE7B8'); }
    g.globalAlpha = 1;
  }
  function drawCard(g, u, calm) {
    sky(g, '#F7E6D2', '#F1C9D5');
    for (var i = 0; i < 18; i++) { var a = 0.25 + 0.2 * Math.sin(u * 1.5 + i); heart(g, rnd(i + 7) * VW, (rnd(i + 30) * VH + (calm ? 0 : u * 12)) % VH, 4 + rnd(i) * 5, 'rgba(232,120,150,' + a.toFixed(3) + ')'); }
    var s = calm ? 1 : backOut(seg(u, 0.05, 0.5));
    g.save(); g.translate(VW / 2, 122); g.scale(s, s); font(g, '600', 64); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#5B3F86'; g.fillText('Season 1', 0, 0); g.restore();
    font(g, 'italic 500', 24); g.textAlign = 'center'; g.fillStyle = 'rgba(91,63,134,' + sio(seg(u, 0.4, 1.0)).toFixed(3) + ')'; g.fillText('The First Adventures', VW / 2, 178);
    // five numbered badges, one per episode
    for (var k = 0; k < 5; k++) {
      var p = calm ? sio(seg(u, 1 + k * 0.25, 1.6 + k * 0.25)) : backOut(seg(u, 1 + k * 0.22, 1.4 + k * 0.22)), x = VW / 2 + (k - 2) * 62, y = 252;
      if (p <= 0) continue; g.save(); g.translate(x, y); g.scale(calm ? 1 : p, calm ? 1 : p); g.globalAlpha = calm ? p : 1;
      circ(g, 0, 0, 23, ['#8BC6E8', '#F2B35E', '#9CCB8A', '#F28AA8', '#B39DDB'][k]); circ(g, 0, 0, 18, 'rgba(255,255,255,.35)');
      font(g, '600', 22); g.fillStyle = '#3C2C5C'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(k + 1), 0, 1); g.restore();
    }
    font(g, '500', 15, 'Lora, Georgia, serif'); g.fillStyle = 'rgba(91,63,134,' + sio(seg(u, 2.4, 3.2)).toFixed(3) + ')'; g.textAlign = 'center'; g.fillText('Five big little adventures', VW / 2, 306);
  }
  function drawEnd(g, u, calm) {
    sky(g, '#2E2552', '#8C6BB0');
    for (var i = 0; i < 30; i++) { var tw = calm ? 0.7 : 0.5 + 0.4 * Math.sin(u * 2 + i); star(g, rnd(i + 3) * VW, rnd(i + 70) * VH * 0.55, 1.2 + rnd(i + 5) * 2, 'rgba(255,240,200,' + (tw * 0.8).toFixed(3) + ')', i); }
    g.fillStyle = '#4E3E73'; g.beginPath(); g.ellipse(VW / 2, VH + 60, 420, 140, 0, 0, TAU); g.fill();
    var b = calm ? 0 : Math.abs(Math.sin(u * 4.1)) * 3;
    pup(g, 'tidbit', VW / 2 - 70, 292 - b, 1.6, { pose: 'sit', wag: Math.sin(u * 9) * 0.6, t: u, face: 1 });
    pup(g, 'sugarfoot', VW / 2 + 70, 292 - (calm ? 0 : Math.abs(Math.sin(u * 4.1 + 1)) * 3), 1.6, { pose: 'sit', wag: Math.sin(u * 8 + 2) * 0.6, t: u, face: -1 });
    for (var h = 0; h < 5; h++) { var hu = ((u * (calm ? 0.2 : 0.35)) + h / 5) % 1; g.globalAlpha = Math.sin(Math.PI * hu) * 0.9; heart(g, VW / 2 + Math.sin(hu * 5 + h) * 16, 240 - hu * 90, 5 + h % 2 * 2, '#F48FB1'); }
    g.globalAlpha = 1;
    var s = calm ? 1 : backOut(seg(u, 0.1, 0.6));
    g.save(); g.translate(VW / 2, 74); g.scale(s, s); font(g, '600', 42); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#FFE7B8'; g.fillText('Frequency Buddies', 0, 0); g.restore();
    var p = calm ? sio(seg(u, 1, 1.8)) : backOut(seg(u, 1, 1.5));
    g.save(); g.translate(VW / 2, 140); g.scale(calm ? 1 : p, calm ? 1 : p); g.globalAlpha = calm ? p : clamp(p * 2, 0, 1);
    rr(g, -128, -26, 256, 52, 26, '#FFF6EA'); font(g, '600', 26); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#4A3A70'; g.fillText('▶  Watch Season 1', 0, 1); g.restore();
    font(g, '500', 14, 'Lora, Georgia, serif'); g.fillStyle = 'rgba(255,246,232,' + sio(seg(u, 2, 2.8)).toFixed(3) + ')'; g.textAlign = 'center'; g.fillText('5 episodes · captions always on · free to watch', VW / 2, 190);
  }
  // the episode name and its lesson, over the picture
  function drawBanner(g, s, u, calm) {
    var e = s.e, p = calm ? sio(seg(u, 0.1, 0.7)) : eout(seg(u, 0.1, 0.55)), out = 1 - sio(seg(u, s.t1 - s.t0 - 0.35, s.t1 - s.t0));
    g.save(); g.globalAlpha = (calm ? p : 1) * out;
    var x = calm ? 14 : mix(-260, 14, p);
    font(g, '600', 11, 'Lora, Georgia, serif'); var t1 = 'EPISODE ' + e.n; font(g, '600', 16); var w = Math.max(g.measureText(e.title).width + 28, 120);
    rr(g, x, 12, w, 44, 14, 'rgba(255,248,238,.93)');
    font(g, '600', 10.5, 'Lora, Georgia, serif'); g.fillStyle = '#8A6D8F'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(t1, x + 14, 25);
    font(g, '600', 16); g.fillStyle = '#3C2C5C'; g.fillText(e.title, x + 14, 43);
    // the lesson, as a lower third
    // the lesson, just under the name (the bottom of the picture stays clear for the captions)
    var q = calm ? sio(seg(u, 0.6, 1.2)) : eout(seg(u, 0.6, 1.1));
    font(g, 'italic 500', 13.5); var lw = Math.min(VW - 28, g.measureText(e.lesson).width + 26), lx = calm ? 14 : mix(-lw - 20, 14, q);
    g.globalAlpha = (calm ? q : 1) * out;
    rr(g, lx, 62, lw, 30, 15, 'rgba(60,44,92,.88)'); g.fillStyle = '#FFF4E4'; g.textAlign = 'left'; g.fillText(e.lesson, lx + 13, 78, VW - 54);
    g.restore();
  }
  // a soft wipe (or, in calm motion, a gentle dip) between parts; never a flash
  function drawWipe(g, u, calm) {
    if (u < 0 || u > 0.5) return;
    if (calm) { g.fillStyle = 'rgba(44,32,70,' + (0.85 * (1 - sio(u / 0.5))).toFixed(3) + ')'; g.fillRect(0, 0, VW, VH); return; }
    var p = eout(u / 0.5), x = mix(0, VW + 160, p);
    g.fillStyle = '#B39DDB'; g.beginPath(); g.moveTo(x - 160, 0); g.lineTo(x + 40, 0); g.lineTo(x - 40, VH); g.lineTo(x - 240, VH); g.closePath(); g.fill();
    g.fillStyle = '#F2C2D2'; g.beginPath(); g.moveTo(x - 40, 0); g.lineTo(x + 40, 0); g.lineTo(x - 40, VH); g.lineTo(x - 120, VH); g.closePath(); g.fill();
  }
  function capAt(t) { if (!TL) return null; var c = null; TL.caps.forEach(function (k) { if (t >= k[0] && t < k[1]) c = k; }); return c; }
  function drawCaption(g, t, scale) {
    var c = capAt(t); if (!c) return;
    var txt = (c[2] === '♪' ? '♪ ' + c[3] + ' ♪' : c[2] + ': ' + c[3]);
    font(g, '600', 15, 'Lora, Georgia, serif'); var w = Math.min(VW - 30, g.measureText(txt).width + 30);
    rr(g, VW / 2 - w / 2, VH - 44, w, 30, 15, 'rgba(20,14,34,.82)'); g.fillStyle = '#FFF8EE'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, VW / 2, VH - 29, VW - 44);
  }

  // ------------------------------------------------------------------ the excerpt cache: the real stage, stepped to time
  var X = { si: -1, ctrl: null, lt: 0, cv: null };
  function excerptAt(s, si, lt, W, H, calm, dpr) {
    if (!X.cv) X.cv = document.createElement('canvas');
    if (X.cv.width !== W || X.cv.height !== H) { X.cv.width = W; X.cv.height = H; X.si = -1; }
    var P = API(), e = s.e;
    if (X.si !== si || !X.ctrl || lt < X.lt - 1e-6 || lt - X.lt > 3) {
      var dur = function (b) { var m = e.map[P.clipKey(b.say, b.text)]; return m ? m[0] : Math.max(1.2, String(b.text).length / 15); };
      X.ctrl = P.excerpt(e.ep, e.from, e.to, { dur: dur, reduced: calm, pre: e.pre, canvas: X.cv }); X.si = si; X.lt = 0;
    }
    var dtSum = 0;
    while (X.lt < lt - 1e-6) { var d = Math.min(1 / 30, lt - X.lt); X.ctrl.step(d); X.lt += d; dtSum += d; }
    var g = X.cv.getContext('2d'); X.ctrl.render(g, W, H, dpr || 1, Math.min(0.1, dtSum));
    return X.cv;
  }

  // ------------------------------------------------------------------ one frame at time t
  function renderAt(cv, t, o) {
    o = o || {};
    var g = cv.getContext('2d'), W = cv.width, H = cv.height, calm = o.calm != null ? o.calm : calmNow();
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#2B2350'; g.fillRect(0, 0, W, H);
    var k = Math.min(W / VW, H / VH), ox = (W - VW * k) / 2, oy = (H - VH * k) / 2;
    var setV = function () { g.setTransform(k, 0, 0, k, ox, oy); };
    setV();
    if (!TL) { drawTitle(g, 3.6, true); return; }
    t = clamp(t, 0, TL.dur);
    var si = 0; for (var i = 0; i < TL.segs.length; i++) if (t >= TL.segs[i].t0) si = i;
    var s = TL.segs[si], u = t - s.t0;
    if (s.kind === 'title') drawTitle(g, u, calm);
    else if (s.kind === 'card') drawCard(g, u, calm);
    else if (s.kind === 'end') drawEnd(g, u, calm);
    else {
      var ex = excerptAt(s, si, Math.max(0, u - LEAD), Math.round(VW * k), Math.round(VH * k), calm, o.dpr || 1);
      g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(ex, ox, oy); setV();
      drawBanner(g, s, u, calm);
    }
    if (si > 0) drawWipe(g, u, calm);
    // the very end: a slow fade
    if (t > TL.dur - 0.8) { g.fillStyle = 'rgba(20,14,34,' + (sio((t - (TL.dur - 0.8)) / 0.8) * 0.6).toFixed(3) + ')'; g.fillRect(0, 0, VW, VH); }
    if (o.captions) drawCaption(g, t);
  }

  // ------------------------------------------------------------------ the on-page player
  var UI = null;
  function fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function mount(host) {
    host.innerHTML =
      '<div class="fbt-stage"><canvas class="fbt-cv" role="img" aria-label="The Season 1 trailer: Tidbit and Sugarfoot in a quick moment from each of the five episodes, with each episode’s lesson"></canvas>' +
      '<button type="button" class="fbt-big" aria-label="Play the Season 1 trailer">▶ <span>Play the trailer</span></button>' +
      '<div class="fbt-endb" hidden><a class="fbt-watch" href="/frequency-buddies.html?ep=s1e1#episode-player">▶ Watch Season 1</a><button type="button" class="fbt-again">↺ Play the trailer again</button></div></div>' +
      '<p class="fbt-cap"><span class="fbt-who"></span><span class="fbt-line">Captions show here.</span></p>' +
      '<div class="fbt-prog"><div class="fbt-track" role="slider" tabindex="0" aria-label="Where you are in the trailer" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="fbt-fill"></div></div><span class="fbt-time">0:00</span></div>' +
      '<div class="fbt-ctrl"><button type="button" class="fbt-b fbt-play is-main" aria-label="Play">▶ Play</button>' +
      '<button type="button" class="fbt-b fbt-re" aria-label="Restart the trailer">↺ Restart</button>' +
      '<button type="button" class="fbt-b fbt-skip">Skip trailer ⏭</button>' +
      '<button type="button" class="fbt-b fbt-snd" aria-pressed="true">🔊 Sound on</button>' +
      '<button type="button" class="fbt-b fbt-full" aria-label="Full screen">⛶<span class="fbt-lbl"> Full screen</span></button>' +
      '<a class="fbt-b fbt-dl" href="/assets/video/frequency-buddies-season-1-trailer.mp4" download>⬇ Download (MP4)</a></div>';
    var $ = function (q) { return host.querySelector(q); };
    UI = { host: host, cv: $('.fbt-cv'), stage: $('.fbt-stage'), big: $('.fbt-big'), endb: $('.fbt-endb'), who: $('.fbt-who'), line: $('.fbt-line'), fill: $('.fbt-fill'), track: $('.fbt-track'), time: $('.fbt-time'), play: $('.fbt-play'), snd: $('.fbt-snd'), dl: $('.fbt-dl'),
      T: 0, playing: false, raf: 0, last: 0, wall0: 0, from: 0, ready: false };
    function resize() { var r = UI.stage.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1); UI.dpr = d; var w = Math.max(160, Math.round(r.width * d)), h = Math.max(90, Math.round(r.height * d)); if (UI.cv.width !== w || UI.cv.height !== h) { UI.cv.width = w; UI.cv.height = h; } paint(); }
    function paint() { try { renderAt(UI.cv, UI.T, { dpr: UI.dpr || 1 }); } catch (e) { if (window.console) console.error('trailer', e); } }
    function caption() {
      var c = capAt(UI.T), who = c ? (c[2] === '♪' ? '♪ ' : c[2] + ': ') : '', line = c ? c[3] + (c[2] === '♪' ? ' ♪' : '') : '';
      if (UI.line.textContent !== line) { UI.who.textContent = who; UI.line.textContent = line; }
    }
    function progress() {
      var d = TL ? TL.dur : 75, p = clamp(UI.T / d, 0, 1); UI.fill.style.width = (p * 100).toFixed(2) + '%'; UI.track.setAttribute('aria-valuenow', String(Math.round(p * 100))); UI.track.setAttribute('aria-valuetext', fmt(UI.T) + ' of ' + fmt(d));
      UI.time.textContent = fmt(UI.T) + ' / ' + fmt(d);
    }
    function clock() { if (AU.live && AU.c && AU.c.state === 'running') return AU.live.from + Math.max(0, AU.c.currentTime - AU.live.at); return UI.from + (performance.now() - UI.wall0) / 1000; }
    function frame() {
      UI.raf = 0; if (!UI.playing) return;
      UI.T = clock();
      if (UI.T >= TL.dur) { UI.T = TL.dur; pause(); UI.endb.hidden = false; }
      paint(); caption(); progress();
      if (UI.playing) UI.raf = requestAnimationFrame(frame);
    }
    function sync() {
      UI.play.textContent = UI.playing ? '❚❚ Pause' : '▶ Play'; UI.play.setAttribute('aria-label', UI.playing ? 'Pause' : 'Play');
      UI.big.hidden = UI.playing || UI.T > 0.05;
      UI.host.classList.toggle('is-playing', UI.playing);
      UI.snd.textContent = AU.on ? '🔊 Sound on' : '🔇 Sound off'; UI.snd.setAttribute('aria-pressed', String(AU.on));
    }
    function ready() {
      if (UI.ready) return Promise.resolve();
      UI.big.querySelector('span').textContent = 'Loading…';
      return build().then(function () { var c = actx(); return c ? loadSamples(c) : null; }).then(function () { UI.ready = true; UI.big.querySelector('span').textContent = 'Play the trailer'; });
    }
    function play() {
      var c = actx(); if (c && c.state === 'suspended') { try { var pr = c.resume(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} } // inside the tap, so phones allow sound
      ready().then(function () {
        if (UI.T >= TL.dur - 0.05) UI.T = 0;
        UI.endb.hidden = true; UI.playing = true; UI.from = UI.T; UI.wall0 = performance.now();
        soundStart(UI.T); sync(); if (!UI.raf) UI.raf = requestAnimationFrame(frame);
      }).catch(function () { UI.big.querySelector('span').textContent = 'The trailer couldn’t load. Try again?'; });
    }
    function pause() { UI.playing = false; soundStop(); if (UI.raf) cancelAnimationFrame(UI.raf); UI.raf = 0; sync(); }
    function seek(t) { var was = UI.playing; if (was) pause(); UI.T = clamp(t, 0, TL ? TL.dur : 0); UI.endb.hidden = !(TL && UI.T >= TL.dur - 0.05); paint(); caption(); progress(); sync(); if (was) play(); }
    UI.big.addEventListener('click', play);
    UI.play.addEventListener('click', function () { if (UI.playing) pause(); else play(); });
    $('.fbt-re').addEventListener('click', function () { seek(0); if (!UI.playing) play(); });
    $('.fbt-again').addEventListener('click', function () { seek(0); play(); });
    $('.fbt-skip').addEventListener('click', function () {
      pause(); var to = document.getElementById('episode-player');
      if (to) { to.scrollIntoView({ behavior: calmNow() ? 'auto' : 'smooth', block: 'start' }); var b = to.querySelector('.fb-play, button'); if (b) setTimeout(function () { try { b.focus({ preventScroll: true }); } catch (e) {} }, 400); }
    });
    UI.snd.addEventListener('click', function () { AU.on = !AU.on; if (UI.playing) { if (AU.on) soundStart(UI.T); else soundStop(); } sync(); });
    $('.fbt-full').addEventListener('click', function () {
      var el = host, d = document;
      if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
      var f = el.requestFullscreen || el.webkitRequestFullscreen; if (f) { try { var pr = f.call(el); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} }
    });
    UI.cv.addEventListener('click', function () { if (UI.playing) pause(); else play(); });
    function trackSeek(ev) { if (!TL) return; var r = UI.track.getBoundingClientRect(); seek(clamp((ev.clientX - r.left) / r.width, 0, 1) * TL.dur); }
    UI.track.addEventListener('click', trackSeek);
    UI.track.addEventListener('keydown', function (e) {
      if (!TL) return; var step = e.key === 'ArrowRight' ? 5 : e.key === 'ArrowLeft' ? -5 : e.key === 'Home' ? -1e9 : e.key === 'End' ? 1e9 : 0;
      if (step) { e.preventDefault(); seek(UI.T + step); }
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden && UI.playing) pause(); });
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (n) { document.addEventListener(n, function () { setTimeout(resize, 60); }); });
    window.addEventListener('resize', resize);
    // a poster: the title card, with the pals and the name
    var poster = function () { resize(); if (!TL) { var g = UI.cv.getContext('2d'), k = Math.min(UI.cv.width / VW, UI.cv.height / VH); g.setTransform(k, 0, 0, k, (UI.cv.width - VW * k) / 2, (UI.cv.height - VH * k) / 2); drawTitle(g, 4.6, true); } };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(poster, poster); else poster();
    progress(); sync();
    // the length, as soon as it's known (without loading any sound)
    build().then(function () { progress(); paint(); UI.big.setAttribute('aria-label', 'Play the Season 1 trailer, ' + fmt(TL.dur)); }).catch(function () {});
    UI.api = { play: play, pause: pause, seek: seek };
  }
  function auto() {
    var el = document.querySelector('[data-buddies-trailer]');
    if (!el || el.__fbt) return; el.__fbt = 1;
    var go = function () { if (API() && API().excerpt) mount(el); else setTimeout(go, 100); };
    go();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();

  window.TOLTrailer = {
    build: build, renderAt: renderAt, renderAudio: renderAudio,
    get duration() { return TL ? TL.dur : 0; },
    timeline: function () { return TL; },
    play: function () { if (UI && UI.api) UI.api.play(); }, pause: function () { if (UI && UI.api) UI.api.pause(); }, seek: function (t) { if (UI && UI.api) UI.api.seek(t); },
    state: function () { return UI ? { t: UI.T, playing: UI.playing, ready: UI.ready, dur: TL ? TL.dur : 0, cap: capAt(UI.T), audio: AU.c ? AU.c.state : 'none', live: !!AU.live } : null; }
  };
})();
