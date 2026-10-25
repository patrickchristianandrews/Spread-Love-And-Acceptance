/* sleepcam-sounds.js: the sound side of the fur babies and the overlay mixer for the Sleeping Pals Cam.
   Everything here is made with Web Audio, in the same gentle way as the pups' snores (pals-cam-sleep.js):
   filtered noise shaped by slow, rounded envelopes, no recordings, no loops short enough to hear. Every bus
   goes into A.master and then through the cam's fade (the sleep timer), the mute, the low-cut, the high-cut,
   the gentle compressor and the soft clipper, so nothing here can be startling.
   1. Fur-baby voices. Each pet gets its own quiet voice at its own pitch and place in the stereo field:
      dog: a soft snore. cat: a slow, low, rounded purr. rabbit: tiny chuffs and, rarely, a faint tooth purr.
      guinea pig: hushed breathing and, very rarely, a quiet wheek. hamster: tiny paws and a wheel hush.
      bird: a sleepy soft chirp now and then. ferret: soft snuffles and a rare quiet "dook". lizard: a very
      slow shallow breath. horse: slow deep snuffles and a soft huff. other: a gentle breath and a faint hum.
      Each pet's sound can be switched on or off by itself. None is louder than a pup's snore.
   2. Overlays: soft rain, rain on a window, ocean waves, wind in the trees, fan, brown noise, pink noise, a soft
      hush, gentle humming, a music-box lullaby, soft piano, a slow heartbeat pulse, fireplace crackle, a train on
      the tracks, very rare distant thunder, crickets. Each has its own on/off and volume. A soft ceiling keeps
      many overlays together from getting louder than a single bed.
   3. A pet-safe default: animals hear higher pitches than people, so overlays with energy above 2 kHz (crickets,
      for one) start off when pets are in the room, and a pet marked "sound sensitive" pauses every overlay whose
      share of energy above 2 kHz is over a small threshold (HF table below, measured offline).
   4. Presets and a short picker that suggests a starter mix; "Try it for tonight" and a thumbs up or down the next
      day. Stored on this device only: localStorage 'tol-sleepcam-mixes-v1'.
   A personal preference tool, not medical advice. window.TOLSleepMix is the API used by sleepcam-ui.js. */
(function () {
  'use strict';
  if (typeof window === 'undefined' || !window.TOLSleepCam || !window.TOLSleepCam.core) return;
  var K = window.TOLSleepCam.core(), S = K.S, A = K.A, clamp = K.clamp, rand = K.rand, TAU = K.TAU, play = K.play;
  var KEY = 'tol-sleepcam-mixes-v1', HORIZON = 12;
  var PETLV = 0.9;       // overall level of the fur babies' breathing, against the pups (each is quieter than a pup)
  var CAP = 1.5;         // soft ceiling for many overlays together, in units of one overlay at 100%
  var SENS_HF = 0.01;    // a sensitive pet pauses overlays with more than this share of their energy above 2 kHz

  function pets() { return window.TOLSleepPets ? window.TOLSleepPets.list() : []; }
  function hexN(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
  function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function expo(mean) { return -Math.log(1 - Math.random()) * mean; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  // ------------------------------------------------------------------ the saved mixer state, presets and notes
  var DEF = { master: 100, petVol: 100, pets: true, ovl: {} };
  var ST = { cur: JSON.parse(JSON.stringify(DEF)), presets: [], tonight: null, log: [], ans: { sit: [], worked: [] } };
  function loadState() {
    var o = null; try { o = JSON.parse(K.lsGet(KEY) || 'null'); } catch (e) {}
    if (o && typeof o === 'object') {
      var c = o.cur || {};
      ST.cur = { master: clamp(+c.master || 100, 0, 100), petVol: c.petVol == null ? 100 : clamp(+c.petVol, 0, 100), pets: c.pets !== false, ovl: {} };
      Object.keys(c.ovl || {}).forEach(function (k) { if (OV[k]) ST.cur.ovl[k] = { on: !!c.ovl[k].on, vol: clamp(Math.round(+c.ovl[k].vol || 70), 0, 100) }; });
      ST.presets = (Array.isArray(o.presets) ? o.presets : []).slice(0, 12).map(function (p) {
        var ov = {}; Object.keys(p.ovl || {}).forEach(function (k) { if (OV[k]) ov[k] = clamp(Math.round(+p.ovl[k] || 0), 0, 100); });
        return { id: String(p.id || 'm' + Math.random().toString(36).slice(2, 7)).slice(0, 12), name: String(p.name || 'My mix').replace(/[\u0000-\u001F<>]/g, ' ').trim().slice(0, 28) || 'My mix', ovl: ov, master: clamp(+p.master || 100, 0, 100) };
      });
      var t = o.tonight; ST.tonight = t && t.d && t.ovl ? { d: String(t.d).slice(0, 10), id: t.id || null, name: String(t.name || 'Tonight’s mix').slice(0, 28), ovl: t.ovl, rated: !!t.rated } : null;
      ST.log = (Array.isArray(o.log) ? o.log : []).slice(-100).filter(function (x) { return x && (x.r === 1 || x.r === -1); }).map(function (x) { return { d: String(x.d).slice(0, 10), id: x.id || null, name: String(x.name || '').slice(0, 28), r: x.r }; });
      var an = o.ans || {}; ST.ans = { sit: Array.isArray(an.sit) ? an.sit.slice(0, 10) : [], worked: Array.isArray(an.worked) ? an.worked.slice(0, 10) : [] };
    } else {
      // the older single sound bed (rain, fan or brown) from the first version of the cam
      var old = {}; try { old = JSON.parse(K.lsGet('tol-sleepcam-v1') || '{}') || {}; } catch (e) {}
      if (old.bed === 'rain' || old.bed === 'fan' || old.bed === 'brown') ST.cur.ovl[old.bed] = { on: true, vol: 100 };
    }
  }
  var saveT = 0;
  function saveSoon() { clearTimeout(saveT); saveT = setTimeout(saveNow, 350); }
  function saveNow() { clearTimeout(saveT); K.lsSet(KEY, JSON.stringify({ v: 1, cur: ST.cur, presets: ST.presets, tonight: ST.tonight, log: ST.log, ans: ST.ans })); }
  window.addEventListener('pagehide', saveNow);
  var listeners = [];
  function changed(what) { saveSoon(); listeners.forEach(function (f) { try { f(what); } catch (e) {} }); }

  // ------------------------------------------------------------------ fur-baby voices
  // air: the level of each breath. a1/a2: the two warm resonances of the breath. lp: high-cut. tone/f0/q: a faint low voice
  // on snoring breaths (dog, ferret, horse, other). ex: rare extras, as [name, [shortest wait, longest wait] in seconds].
  var RECIPE = {
    dog: { air: 0.021, a1: 320, a2: 900, lp: 1300, tone: 0.016, f0: 135, q: 7 },
    cat: { air: 0.008, a1: 520, a2: 1250, lp: 1000, purr: { f: 118, pk: 0.035, lp: 420 } },
    rabbit: { air: 0.018, a1: 650, a2: 1500, lp: 1100, ex: [['chuff', [4, 12]], ['tooth', [50, 130]]] },
    guinea: { air: 0.0165, a1: 700, a2: 1600, lp: 1200, ex: [['wheek', [110, 280]]] },
    hamster: { air: 0.012, a1: 800, a2: 1700, lp: 1200, ex: [['patter', [14, 45]]] },
    bird: { air: 0.0135, a1: 900, a2: 1800, lp: 1400, ex: [['chirp', [40, 110]]] },
    ferret: { air: 0.028, a1: 430, a2: 1050, lp: 1100, tone: 0.018, f0: 190, q: 6, ex: [['dook', [70, 200]]] },
    lizard: { air: 0.016, a1: 380, a2: 900, lp: 800 },
    horse: { air: 0.018, a1: 150, a2: 420, lp: 600, tone: 0.012, f0: 70, q: 4, ex: [['huff', [50, 150]]] },
    other: { air: 0.03, a1: 420, a2: 1000, lp: 1200, tone: 0.018, f0: 240, q: 6, ex: [['mm', [50, 140]]] }
  };
  var VO = {};       // pet id -> voice
  var petsBus = null, ovlBus = null, lastPetLv = -1;
  function sizeMul(p) { return p.size === 's' ? 1.14 : p.size === 'l' ? 0.86 : 1; }
  function petPan(p) { var R = window.TOLSleepPets && window.TOLSleepPets._runtime(p.id); var x = R && R.x ? R.x : S.cx; return clamp((x - S.cx) / Math.max(120, S.LW / 2) * 0.85, -0.85, 0.85); }
  function buildVoice(p, idx) {
    var c = A.c, B = A.bufs, rc = RECIPE[p.kind] || RECIPE.other, v = { id: p.id, kind: p.kind, rc: rc, pm: sizeMul(p) * (0.94 + 0.12 * hexN(p.name + p.id)), on: -1, nx: {}, purrEnd: 0, srcs: [] };
    function src(buf) { var s = K.loopSrc(buf); v.srcs.push(s); return s; }
    var air = src(idx % 2 ? B.pinkB : B.pinkA);
    v.f1 = K.filt('bandpass', rc.a1 * v.pm, 1.1); v.f2 = K.filt('bandpass', rc.a2 * v.pm, 1.4);
    var airEnv = K.gainNode(0), a1 = K.gainNode(0.8), a2 = K.gainNode(0.5);
    K.chain(air, K.filt('highpass', 60, 0.5), v.f1, a1, airEnv); K.chain(air, v.f2, a2, airEnv);
    var toneEnv = K.gainNode(0), flut = K.gainNode(0.88), dep = K.gainNode(0.1);
    v.bpT = K.filt('bandpass', (rc.f0 || (rc.purr && rc.purr.f) || 150) * v.pm, rc.purr ? 3 : rc.q || 7);
    K.chain(src(idx % 2 ? B.brownA : B.brownB), v.bpT, flut, toneEnv);
    K.chain(src(B.flut), dep, flut.gain);
    var mixN = K.gainNode(1), pan = K.panner(petPan(p)); v.pan = pan; v.panVal = petPan(p);
    v.gate = K.gainNode(0);
    airEnv.connect(mixN); toneEnv.connect(mixN); K.chain(mixN, K.filt('lowpass', rc.purr ? rc.purr.lp * 2.4 : rc.lp, 0.5), pan, v.gate, petsBus);
    v.airEnv = airEnv; v.toneEnv = toneEnv; v.dep = dep;
    v.stop = function () { v.srcs.forEach(function (s) { try { s.stop(); } catch (e) {} }); try { v.gate.disconnect(); } catch (e) {} };
    return v;
  }
  function petOn(p, M) { return !!(ST.cur.pets && p.snd); }
  function petNorm(n) { return 1 / Math.sqrt(1 + 0.5 * n); }
  function syncPets() {
    var c = A.c; if (!c || !petsBus) return;
    var list = pets(), ids = {}, now = c.currentTime;
    list.forEach(function (p, i) {
      ids[p.id] = 1;
      var v = VO[p.id];
      if (!v) v = VO[p.id] = buildVoice(p, i);
      var want = petOn(p) ? 1 : 0;
      if (v.on !== want) { v.on = want; v.gate.gain.setTargetAtTime(want, now, 0.5); }
      var pv = petPan(p); if (Math.abs(pv - v.panVal) > 0.02 && v.pan.pan) { v.panVal = pv; v.pan.pan.setTargetAtTime(pv, now, 0.3); }
    });
    Object.keys(VO).forEach(function (id) { if (!ids[id]) { var v = VO[id]; delete VO[id]; v.gate.gain.setTargetAtTime(0, now, 0.4); setTimeout(function () { v.stop(); }, 3500); } });
    var lv = Math.pow(ST.cur.petVol / 100, 1.5) * petNorm(list.length) * PETLV;
    if (Math.abs(lv - lastPetLv) > 1e-5) { lastPetLv = lv; petsBus.gain.setTargetAtTime(lv, now, 0.35); } // only when it changes
  }
  function sendPetBreaths() {
    var c = A.c; if (!c) return;
    pets().forEach(function (p) {
      var v = VO[p.id]; if (!v || !v.on) return;
      var bs = window.TOLSleepPets._breaths(p.id), rc = v.rc;
      bs.forEach(function (b) {
        if (b.sent || b.t - S.T >= HORIZON) return; b.sent = true;
        var t = K.aT(b.t), D = b.dur, sn = b.snore; if (t < c.currentTime + 0.1) return;
        var pin = rc.air * b.vol * (0.72 + 0.28 * sn), pout = pin * b.exh, pre = Math.max(t - 0.4, c.currentTime + 0.01);
        v.f1.frequency.setValueAtTime(rc.a1 * v.pm * b.form, pre); v.f2.frequency.setValueAtTime(rc.a2 * v.pm * b.form, pre);
        play(v.airEnv.gain, K.breathCurve(D, pin, pout), t, D * 0.9);
        if (rc.tone && sn > 0.05) {
          v.dep.gain.setValueAtTime(0.05 + 0.08 * sn, pre);
          v.bpT.frequency.setValueAtTime(rc.f0 * v.pm * b.pitch * 0.97, pre); v.bpT.frequency.linearRampToValueAtTime(rc.f0 * v.pm * b.pitch * 1.03, t + D * 0.42);
          play(v.toneEnv.gain, K.breathCurve(D, rc.tone * b.vol * sn, rc.tone * b.vol * sn * 0.25), t, D * 0.9);
        }
      });
    });
  }
  // a soft, low, rounded purr: a narrow band of low noise with a shallow random flutter, swelling in and out
  function purrRun(v, t, len, gain) {
    var rc = v.rc; if (!rc.purr) return; t = Math.max(t, A.c.currentTime + 0.05, v.purrEnd + 0.4);
    v.dep.gain.setValueAtTime(0.14, t - 0.04);
    v.bpT.frequency.setValueAtTime(rc.purr.f * v.pm * 0.97, t); v.bpT.frequency.linearRampToValueAtTime(rc.purr.f * v.pm * 1.04, t + len);
    play(v.toneEnv.gain, K.swell(1.5, Math.max(0.3, len - 3.3), 1.8, rc.purr.pk * (gain || 1) * rand(0.8, 1)), t, len);
    v.purrEnd = t + len;
  }
  function puff(v, o) { o.to = v.gate; o.pan = o.pan != null ? o.pan : v.panVal * 0.6; K.voice(o); }
  var B_ = function () { return A.bufs; };
  var SF = {
    mrrp: function (v) { var pm = v.pm; puff(v, { buf: B_().brownA, f: [['bandpass', 240 * pm, 6, 330 * pm], ['lowpass', 700, 0.5]], a: 0.06, h: 0.05, r: 0.24, pk: 0.05 }); },
    knead: function (v, arg) { purrRun(v, A.c.currentTime + 0.3, arg || 5, 1.3); },
    paws: function (v) { puff(v, { buf: B_().brownB, f: [['lowpass', rand(190, 250) * v.pm, 0.5]], a: 0.014, r: 0.1, pk: 0.026 * rand(0.7, 1.1) }); },
    boof: function (v) { var f = 200 * v.pm; puff(v, { buf: B_().brownA, f: [['bandpass', f, 9, f * 0.72]], a: 0.07, h: 0.06, r: 0.28, pk: 0.03 }); puff(v, { buf: B_().pinkB, f: [['bandpass', f * 3, 1.2], ['lowpass', 900, 0.5]], a: 0.07, h: 0.04, r: 0.2, pk: 0.005 }); },
    thump: function (v) { puff(v, { buf: B_().brownA, f: [['lowpass', 150, 0.5]], a: 0.02, r: 0.24, pk: 0.012 }); },
    sigh: function (v) { var pm = v.pm; puff(v, { buf: B_().pinkA, f: [['bandpass', 760 * pm, 1.3, 440 * pm], ['lowpass', 1200, 0.5]], a: 0.45, h: 0.1, r: 0.95, pk: 0.01 }); puff(v, { buf: B_().brownB, f: [['bandpass', 220 * pm, 8, 170 * pm]], a: 0.45, h: 0.1, r: 0.95, pk: 0.026 }); },
    chuff: function (v) { puff(v, { buf: B_().pinkB, f: [['bandpass', rand(600, 850) * v.pm, 1.2], ['lowpass', 1300, 0.5]], a: 0.02, r: 0.08, pk: 0.014 * rand(0.7, 1) }); },
    tooth: function (v) { var t = A.c.currentTime + 0.05, n = 7 + Math.floor(Math.random() * 4); for (var i = 0; i < n; i++) puff(v, { t: t + i * rand(0.055, 0.075), buf: B_().pinkA, f: [['bandpass', rand(750, 950) * v.pm, 1.1], ['lowpass', 1300, 0.5]], a: 0.012, r: 0.045, pk: 0.007 * (0.6 + 0.4 * Math.sin(Math.PI * i / n)) }); },
    pip: function (v) { puff(v, { buf: B_().pinkA, f: [['bandpass', 900 * v.pm, 1.5], ['lowpass', 1300, 0.5]], a: 0.012, r: 0.06, pk: 0.008 }); },
    wheek: function (v) { var pm = v.pm, t = A.c.currentTime + 0.05; puff(v, { t: t, buf: B_().pinkA, f: [['bandpass', 650 * pm, 7, 1000 * pm], ['lowpass', 1500, 0.5]], a: 0.05, h: 0.02, r: 0.2, pk: 0.016 }); puff(v, { t: t + 0.3, buf: B_().pinkB, f: [['bandpass', 640 * pm, 7, 940 * pm], ['lowpass', 1500, 0.5]], a: 0.05, h: 0.02, r: 0.2, pk: 0.011 }); },
    patter: function (v) { var t = A.c.currentTime + 0.05, n = 3 + Math.floor(Math.random() * 3); for (var i = 0; i < n; i++) puff(v, { t: t + i * rand(0.07, 0.12), buf: B_().pinkB, f: [['bandpass', rand(850, 1100), 1.2], ['lowpass', 1400, 0.5]], a: 0.01, r: 0.04, pk: 0.005 }); },
    wheel: function (v, len) {
      var t = A.c.currentTime + 0.05; len = Math.max(2, len || 7);
      puff(v, { t: t, buf: B_().pinkB, f: [['bandpass', 420, 1.2], ['lowpass', 800, 0.5]], a: 0.9, h: Math.max(0.2, len - 1.8), r: 0.9, pk: 0.006 });
      for (var i = 0, n = Math.floor(len / 0.19); i < n; i++) puff(v, { t: t + 0.4 + i * 0.19 * rand(0.97, 1.03), buf: B_().pinkA, f: [['bandpass', 650, 1.1], ['lowpass', 1100, 0.5]], a: 0.012, r: 0.05, pk: 0.0055 * rand(0.75, 1) });
    },
    rustle: function (v) { var t = A.c.currentTime; for (var i = 0; i < 3; i++) puff(v, { t: t + i * rand(0.2, 0.4), buf: B_().pinkB, f: [['bandpass', rand(900, 1400), 0.6], ['lowpass', 1700, 0.5]], a: 0.16, h: 0.08, r: 0.3, pk: 0.009 * rand(0.6, 1) }); },
    chirp: function (v) {
      var pm = v.pm, t = A.c.currentTime + 0.05, f = rand(1000, 1200) * pm;
      puff(v, { t: t, buf: B_().pinkA, f: [['bandpass', f, 14, f * 1.3], ['lowpass', 2200, 0.5]], a: 0.025, h: 0.03, r: 0.13, pk: 0.03 });
      puff(v, { t: t + 0.21, buf: B_().pinkB, f: [['bandpass', f * 1.1, 14, f * 0.95], ['lowpass', 2200, 0.5]], a: 0.025, h: 0.02, r: 0.12, pk: 0.022 });
    },
    dook: function (v) { var pm = v.pm; puff(v, { buf: B_().brownA, f: [['bandpass', 380 * pm, 5, 300 * pm]], a: 0.03, h: 0.02, r: 0.13, pk: 0.06 }); },
    tsk: function (v) { puff(v, { buf: B_().pinkB, f: [['bandpass', 1300, 2.5], ['lowpass', 1900, 0.5]], a: 0.009, r: 0.04, pk: 0.006 }); },
    huff: function (v) { puff(v, { buf: B_().pinkB, f: [['bandpass', 260 * v.pm, 0.8], ['lowpass', 520, 0.5]], a: 0.3, h: 0.2, r: 0.9, pk: 0.024 }); },
    mm: function (v) { puff(v, { buf: B_().brownA, f: [['bandpass', 320 * v.pm, 8, 270 * v.pm]], a: 0.5, h: 0.4, r: 0.8, pk: 0.05 }); }
  };
  function petSfx(id, name, arg) {
    var v = VO[id]; if (!A.c || !v || !v.on || S.ended || !S.soundOn || !SF[name]) return;
    SF[name](v, arg);
  }
  function petExtras(now) {
    Object.keys(VO).forEach(function (id) {
      var v = VO[id], rc = v.rc, until = now + HORIZON;
      if (!v.on) return;
      if (rc.purr) {
        if (!v.nx.purr) v.nx.purr = now + rand(2, 8);
        if (v.nx.purr < until) { var len = rand(4.5, 10); purrRun(v, v.nx.purr, len, 1); v.nx.purr = v.purrEnd + rand(1.5, 7); }
      }
      (rc.ex || []).forEach(function (ex) {
        var nm = ex[0], w = ex[1];
        if (!v.nx[nm]) v.nx[nm] = now + rand(w[0] * 0.3, w[1] * 0.7);
        if (v.nx[nm] < now - 1) v.nx[nm] = now + rand(w[0], w[1]);
        if (v.nx[nm] < now + 0.5) { if (!(S.ev && S.ev.type === 'fridge')) SF[nm](v); v.nx[nm] = now + clamp(expo((w[0] + w[1]) / 2), w[0], w[1] * 1.6); }
      });
    });
  }

  // ------------------------------------------------------------------ control signals for the overlays (made once, when first needed)
  var CB = {};
  // random swells (slow waves, gusts, soft hush breaths): 0..1 control curves that start and end at the same level, so they loop without a seam
  function makeSwells(c, secs, minP, maxP, floor, crest) {
    var sr = 8000, n = Math.round(secs * sr), o = new Float32Array(n), t = 0, i, P, q, a, x, v, sw = [];
    while (t < secs) { P = rand(minP, maxP); sw.push([t, P, rand(0.55, 1)]); t += P; }
    var k = secs / t; sw.forEach(function (s) { s[0] *= k; s[1] *= k; });
    for (i = 0; i < n; i++) o[i] = floor;
    sw.forEach(function (s) {
      var i0 = Math.floor(s[0] * sr), i1 = Math.min(n, Math.floor((s[0] + s[1]) * sr));
      for (i = i0; i < i1; i++) { x = (i - i0) / (i1 - i0); v = x < crest ? 0.5 - 0.5 * Math.cos(Math.PI * x / crest) : 0.5 + 0.5 * Math.cos(Math.PI * (x - crest) / (1 - crest)); o[i] = Math.max(o[i], floor + (1 - floor) * s[2] * v); }
    });
    var buf = c.createBuffer(1, n, sr); buf.getChannelData(0).set(o); return buf;
  }
  function powBuf(c, buf, pw) { var n = buf.length, b2 = c.createBuffer(1, n, buf.sampleRate), a = buf.getChannelData(0), d = b2.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.pow(a[i], pw); return b2; }
  function ctl(key) {
    var c = A.c; if (CB[key]) return CB[key];
    var b;
    switch (key) {
      case 'waveA': b = makeSwells(c, 47.3, 6.5, 12, 0.1, 0.42); break;
      case 'waveB': b = makeSwells(c, 61.1, 6, 11, 0.1, 0.42); break;
      case 'gustA': b = makeSwells(c, 38.9, 6, 18, 0.2, 0.5); break;
      case 'gustB': b = makeSwells(c, 53.3, 8, 22, 0.15, 0.5); break;
      case 'hush': b = makeSwells(c, 31.7, 4.2, 7.5, 0.08, 0.45); break;
      case 'hushB': b = makeSwells(c, 41.3, 4.6, 8, 0.08, 0.45); break;
      case 'crackA': b = makeCrackle(c, 29.7, 6); break;
      case 'crackB': b = makeCrackle(c, 41.3, 4.4); break;
      case 'tapsA': b = K.makeDrops(c, 17.7, 7.5); break;
      case 'tapsB': b = K.makeDrops(c, 23.9, 2.2); break;
      default:
        if (/Cube$/.test(key)) b = powBuf(c, ctl(key.slice(0, -4)), 3);
    }
    return (CB[key] = b);
  }
  // soft fireplace pops: rounded, low-passed little ticks of very different sizes, some in small clusters
  function makeCrackle(c, secs, perSec) {
    var sr = c.sampleRate, n = Math.round(secs * sr), o = new Float32Array(n), cnt = Math.round(secs * perSec), i, j, at, len, a, lp, k, e, pk = 0, f;
    function pop(at, a) {
      len = Math.round(sr * rand(0.012, 0.06)); lp = 0; k = 1 - Math.exp(-TAU * rand(380, 1100) / sr);
      for (j = 0; j < len; j++) { lp += k * ((Math.random() * 2 - 1) - lp); e = (j < sr * 0.007 ? K.hann(j / (sr * 0.007)) : 1) * Math.exp(-j / (len * 0.3)); o[(at + j) % n] += lp * e * a; }
    }
    for (i = 0; i < cnt; i++) {
      at = Math.floor(Math.random() * n); a = Math.pow(Math.random(), 2.4) + 0.02; pop(at, a);
      if (Math.random() < 0.3) { var m = 1 + Math.floor(Math.random() * 3); for (f = 1; f <= m; f++) pop((at + Math.round(sr * rand(0.012, 0.05) * f)) % n, a * rand(0.3, 0.8)); }
    }
    for (i = 0; i < n; i++) pk = Math.max(pk, Math.abs(o[i]));
    var buf = c.createBuffer(1, n, sr), d = buf.getChannelData(0); for (i = 0; i < n; i++) d[i] = o[i] / (pk || 1); return buf;
  }

  // ------------------------------------------------------------------ the overlays
  // unit: how loud the overlay is at 100% (set from offline renders so each one alone sits near the old soft beds, about -43.5 LUFS, with every peak at or under -26 dBFS, softer than the loudest snore).
  // hf: the share of its energy above 2 kHz (measured offline on the 10-minute renders; see the fix notes).
  var OV = {
    rain:     { label: 'Soft rain', group: 0, unit: 0.0082, hf: 0.055, why: 'a steady, soft hiss and a few round drops' },
    rainwin:  { label: 'Rain on a window', group: 0, unit: 0.0114, hf: 0.0036, why: 'duller taps on glass with a soft hush behind them' },
    ocean:    { label: 'Ocean waves', group: 0, unit: 0.0093, hf: 0.0024, why: 'slow waves that rise and fall about every ten seconds' },
    wind:     { label: 'Wind in the trees', group: 0, unit: 0.0149, hf: 0.0006, why: 'a low, airy breeze with slow gusts' },
    fan:      { label: 'Fan', group: 0, unit: 0.0118, hf: 0.0001, why: 'a low, even rumble with a faint motor note' },
    brown:    { label: 'Brown noise', group: 0, unit: 0.0105, hf: 0.0001, why: 'deep, warm, even noise' },
    pink:     { label: 'Pink noise', group: 0, unit: 0.0068, hf: 0.0284, why: 'even noise with a little more air than brown' },
    hush:     { label: 'Soft hush', group: 1, unit: 0.0139, hf: 0.0031, why: 'a slow, breath-like "shhh" that swells and fades' },
    hum:      { label: 'Gentle humming', group: 1, unit: 0.26, hf: 0.0002, why: 'long, low hummed notes with plenty of space between them' },
    box:      { label: 'Music-box lullaby', group: 1, unit: 0.0126, hf: 0.0001, why: 'a slow, never-repeating tune in a warm middle register' },
    piano:    { label: 'Soft piano', group: 1, unit: 0.0116, hf: 0.0001, why: 'slow, gentle notes in a quiet room' },
    pulse:    { label: 'Slow heartbeat pulse', group: 1, unit: 0.0077, hf: 0, why: 'a low, slow lub-dub, a little under one beat a second' },
    fire:     { label: 'Fireplace crackle', group: 2, unit: 0.0195, hf: 0.0009, why: 'a warm glow with soft, rounded pops' },
    train:    { label: 'Train on the tracks', group: 2, unit: 0.0092, hf: 0.0001, why: 'a soft, far-off rhythm and a low rumble' },
    thunder:  { label: 'Distant thunder', group: 2, unit: 0.45, hf: 0, why: 'very soft, very rare, far-off rumbles' },
    crickets: { label: 'Crickets', group: 2, unit: 0.113, hf: 0.9, bright: true, why: 'a night chorus of soft chirps (higher pitched)' }
  };
  var ORDER = ['rain', 'rainwin', 'ocean', 'wind', 'fan', 'brown', 'pink', 'hush', 'hum', 'box', 'piano', 'pulse', 'fire', 'train', 'thunder', 'crickets'];
  var GROUPS = ['Steady sounds', 'Gentle voices and music', 'Cozy and far away'];
  var INST = {}, ERR = [], FAST = false;
  var ovBuilders = {};
  function mkInst(key) {
    var c = A.c, I = { key: key, srcs: [], out: K.gainNode(0), drift: K.gainNode(0.9), tick: null, dead: false, kill: [] };
    I.out.connect(ovlBus);
    var dd = K.gainNode(0.05); I.dd = dd;
    return I;
  }
  function L(I, buf, filters, level, pan, rate) {
    var s = K.loopSrc(buf, rate); I.srcs.push(s); var out = K.gainNode(level), nodes = [s].concat(filters, [out]); K.chain.apply(null, nodes);
    var pn = K.panner(pan || 0); out.connect(pn); pn.connect(I.drift); return out;
  }
  function fin(I, dd) { // a slow, random swell of the whole layer (never periodic), then out
    var sw = K.loopSrc(A.bufs.flut, 0.012); I.srcs.push(sw); K.chain(sw, K.gainNode(dd), I.drift.gain); I.drift.connect(I.out);
  }
  function ctlSrc(key, scale, dest) { var s = K.loopSrc(ctl(key)); var g = K.gainNode(scale); s.connect(g); g.connect(dest); return s; }
  function V(f) { return K.filt.apply(null, f); }
  ovBuilders.rain = function (I) {
    var B = A.bufs, F = K.filt;
    L(I, B.pinkA, [F('highpass', 450, 0.5), F('lowpass', 2000, 0.5)], 0.55, -0.5); L(I, B.pinkB, [F('highpass', 450, 0.5), F('lowpass', 2000, 0.5)], 0.55, 0.5);
    L(I, B.pinkB, [F('bandpass', 900, 0.5), F('lowpass', 1800, 0.5)], 0.45, -0.2); L(I, B.brownA, [F('bandpass', 170, 0.6)], 0.35, 0.2);
    L(I, B.dropsA, [], 0.9, -0.6); L(I, B.dropsB, [], 0.9, 0.6); fin(I, 0.1);
  };
  ovBuilders.fan = function (I) {
    var B = A.bufs, F = K.filt;
    L(I, B.brownA, [F('lowpass', 520, 0.5)], 0.6, -0.3); L(I, B.brownB, [F('lowpass', 520, 0.5)], 0.6, 0.3);
    L(I, B.pinkA, [F('bandpass', 380, 0.5), F('lowpass', 900, 0.5)], 0.32, 0); L(I, B.brownB, [F('bandpass', 118, 9)], 0.9, 0); fin(I, 0.03);
  };
  ovBuilders.brown = function (I) {
    var B = A.bufs, F = K.filt;
    L(I, B.brownA, [F('lowpass', 560, 0.5), F('highpass', 40, 0.5)], 0.7, -0.45); L(I, B.brownB, [F('lowpass', 560, 0.5), F('highpass', 40, 0.5)], 0.7, 0.45); L(I, B.brownA, [F('lowpass', 300, 0.5)], 0.4, 0); fin(I, 0.02);
  };
  ovBuilders.pink = function (I) {
    var B = A.bufs, F = K.filt;
    L(I, B.pinkA, [F('highpass', 60, 0.5), F('lowpass', 1800, 0.5)], 0.7, -0.4); L(I, B.pinkB, [F('highpass', 60, 0.5), F('lowpass', 1800, 0.5)], 0.7, 0.4); L(I, B.brownB, [F('lowpass', 250, 0.5)], 0.25, 0); fin(I, 0.03);
  };
  ovBuilders.rainwin = function (I) {
    var B = A.bufs, F = K.filt;
    L(I, ctl('tapsA'), [F('bandpass', 1100, 0.8), F('lowpass', 1600, 0.5)], 1.0, -0.5); L(I, ctl('tapsB'), [F('bandpass', 480, 2), F('lowpass', 1000, 0.5)], 1.1, 0.45);
    L(I, B.pinkB, [F('bandpass', 650, 0.5), F('lowpass', 1300, 0.5)], 0.32, 0.2); L(I, B.brownA, [F('lowpass', 220, 0.5)], 0.3, -0.2); fin(I, 0.06);
  };
  ovBuilders.ocean = function (I) {
    var B = A.bufs, F = K.filt;
    [0, 1].forEach(function (i) {
      var pn = K.panner(i ? 0.55 : -0.55); pn.connect(I.drift);
      var s = K.loopSrc(i ? B.pinkB : B.pinkA); I.srcs.push(s); var lp = F('lowpass', 320, 0.5), env = K.gainNode(0.12); K.chain(s, F('highpass', 90, 0.5), lp, env, pn);
      I.srcs.push(ctlSrc(i ? 'waveB' : 'waveA', 0.9, env.gain)); I.srcs.push(ctlSrc(i ? 'waveB' : 'waveA', 1000, lp.frequency));
      var s2 = K.loopSrc(i ? B.pinkA : B.pinkB); I.srcs.push(s2); var env2 = K.gainNode(0); K.chain(s2, F('bandpass', 900, 0.6), F('lowpass', 1700, 0.5), env2, pn);
      I.srcs.push(ctlSrc(i ? 'waveBCube' : 'waveACube', 0.42, env2.gain));
      var s3 = K.loopSrc(i ? B.brownA : B.brownB); I.srcs.push(s3); var env3 = K.gainNode(0.05); K.chain(s3, F('lowpass', 160, 0.5), env3, pn); I.srcs.push(ctlSrc(i ? 'waveB' : 'waveA', 0.5, env3.gain));
    });
    I.drift.connect(I.out);
  };
  ovBuilders.wind = function (I) {
    var B = A.bufs, F = K.filt;
    [0, 1].forEach(function (i) {
      var pn = K.panner(i ? 0.5 : -0.5); pn.connect(I.drift);
      var s = K.loopSrc(i ? B.pinkB : B.pinkA); I.srcs.push(s); var bp = F('bandpass', 380 + i * 90, 0.8), env = K.gainNode(0.05); K.chain(s, bp, F('lowpass', 1000, 0.5), env, pn);
      I.srcs.push(ctlSrc(i ? 'gustB' : 'gustA', 0.7, env.gain)); I.srcs.push(ctlSrc(i ? 'gustB' : 'gustA', 260, bp.frequency));
      var s2 = K.loopSrc(i ? B.brownA : B.brownB); I.srcs.push(s2); var env2 = K.gainNode(0.2); K.chain(s2, F('bandpass', 210, 0.7), env2, pn); I.srcs.push(ctlSrc(i ? 'gustA' : 'gustB', 0.5, env2.gain));
      var s3 = K.loopSrc(i ? B.pinkA : B.pinkB); I.srcs.push(s3); var env3 = K.gainNode(0); K.chain(s3, F('bandpass', 1050, 0.7), F('lowpass', 1600, 0.5), env3, pn); I.srcs.push(ctlSrc(i ? 'gustBCube' : 'gustACube', 0.16, env3.gain));
    });
    I.drift.connect(I.out);
  };
  ovBuilders.hush = function (I) {
    var B = A.bufs, F = K.filt;
    [0, 1].forEach(function (i) {
      var pn = K.panner(i ? 0.3 : -0.3); pn.connect(I.drift);
      var s = K.loopSrc(i ? B.pinkB : B.pinkA); I.srcs.push(s); var env = K.gainNode(0.03); K.chain(s, F('bandpass', 800 + i * 100, 0.7), F('lowpass', 1150, 0.5), env, pn);
      I.srcs.push(ctlSrc(i ? 'hushB' : 'hush', 0.95, env.gain));
    });
    I.drift.connect(I.out);
  };
  ovBuilders.fire = function (I) {
    var B = A.bufs, F = K.filt;
    L(I, ctl('crackA'), [F('bandpass', 620, 0.5), F('lowpass', 1200, 0.5)], 0.9, -0.3); L(I, ctl('crackB'), [F('bandpass', 560, 0.5), F('lowpass', 1100, 0.5)], 0.75, 0.3);
    var warm = L(I, B.brownA, [F('bandpass', 150, 0.7), F('lowpass', 330, 0.5)], 0.35, 0); var fs = K.loopSrc(B.flut, 0.05); I.srcs.push(fs); K.chain(fs, K.gainNode(0.18), warm.gain);
    fin(I, 0.03);
  };
  // ---- the scheduled overlays: each has a tick(now, until) that books its sounds a few seconds ahead, on the audio clock
  ovBuilders.crickets = function (I) {
    var B = A.bufs, F = K.filt; I.cr = [];
    [[2250, -0.5], [2640, 0.05], [3050, 0.5]].forEach(function (d, i) {
      var s = K.loopSrc(i % 2 ? B.pinkB : B.pinkA); I.srcs.push(s); var env = K.gainNode(0), pn = K.panner(d[1]);
      K.chain(s, F('bandpass', d[0] * rand(0.97, 1.03), 22), env, pn, I.out);
      I.cr.push({ env: env, next: 0, left: 0, iv: rand(0.8, 1.3), end: 0 });
    });
    I.tick = function (now, until) {
      I.cr.forEach(function (v) {
        if (!v.next) v.next = now + (FAST ? rand(0.5, 2) : rand(0.5, 12));
        while (v.next < until) {
          if (v.next < now + 0.05) v.next = now + 0.05;
          if (v.left <= 0) { v.left = 3 + Math.floor(Math.random() * 9); v.iv = rand(0.8, 1.35); v.next += rand(3, 22); if (v.next >= until) break; }
          var pulses = 3 + Math.floor(Math.random() * 3), gap = rand(0.052, 0.07), pw = 0.02, dur = pulses * gap + pw + 0.02, n = Math.ceil(dur * 3000), cv = new Float32Array(n), amp = rand(0.5, 1), i, j, x;
          for (i = 0; i < n; i++) { x = i / 3000; var val = 0; for (j = 0; j < pulses; j++) { var q = (x - j * gap) / pw; if (q > 0 && q < 1) val = Math.max(val, K.hann(Math.sin(Math.PI * q))); } cv[i] = val * amp; }
          cv[0] = 0; cv[n - 1] = 0; play(v.env.gain, cv, v.next, dur);
          v.next += v.iv * rand(0.9, 1.1); v.left--;
        }
      });
    };
  };
  ovBuilders.thunder = function (I) {
    var B = A.bufs; I.nx = 0;
    I.tick = function (now, until) {
      if (!I.nx) I.nx = now + (FAST ? rand(2, 4) : rand(25, 70));
      if (I.nx < until) {
        var t = Math.max(I.nx, now + 0.05), n = 2 + Math.floor(Math.random() * 2), i, f = rand(110, 150), pn = rand(-0.4, 0.4);
        for (i = 0; i < n; i++) K.voice({ t: t + i * rand(1.4, 2.4), buf: i % 2 ? B.brownA : B.brownB, f: [['lowpass', f * (1 - i * 0.15), 0.5, f * 0.5]], a: rand(1.2, 2), h: rand(0.6, 2), r: rand(3.5, 6), pk: (i === 0 ? 0.045 : 0.03) * rand(0.7, 1), pan: pn, to: I.out });
        K.voice({ t: t + 0.3, buf: B.brownB, f: [['bandpass', 190, 0.9, 110]], a: 1.5, h: 1, r: 4.5, pk: 0.008, pan: pn, to: I.out });
        I.nx = t + (FAST ? rand(14, 22) : rand(55, 200));
      }
    };
  };
  // short rhythmic sounds (a heartbeat, a train's clacks) are written once into small buffers (a few variations of each) and
  // played one buffer per beat, so a night of them is a handful of nodes a minute instead of dozens
  function biq(type, f, q, sr) {
    var w = TAU * f / sr, al = Math.sin(w) / (2 * q), cs = Math.cos(w), b0, b1, b2, a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al;
    if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; } else { b0 = al; b1 = 0; b2 = -al; }
    var x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    return function (x) { var y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
  }
  // one soft thump into arr at time t (seconds): noise through band and low-pass filters, a rounded rise and fall
  function thump(arr, sr, t, band, q, lp, a, r, amp) {
    var n = Math.round((a + r) * 1.2 * sr), i0 = Math.round(t * sr), f1 = biq('bp', band, q, sr), f2 = biq('lp', lp, 0.6, sr), i, x, e, tt;
    for (i = 0; i < n && i0 + i < arr.length; i++) { tt = i / sr; e = tt < a ? K.hann(tt / a) : K.hann(1 - (tt - a) / r); x = f2(f1(Math.random() * 2 - 1)); arr[i0 + i] += x * e * amp; }
  }
  function normBuf(c, arr, peak) {
    var pk = 0, i; for (i = 0; i < arr.length; i++) pk = Math.max(pk, Math.abs(arr[i]));
    var buf = c.createBuffer(1, arr.length, c.sampleRate), d = buf.getChannelData(0), k = peak / (pk || 1); for (i = 0; i < arr.length; i++) d[i] = arr[i] * k; return buf;
  }
  function beatBufs(c) {
    if (CB.beats) return CB.beats; var sr = c.sampleRate, out = [];
    for (var v = 0; v < 3; v++) {
      var arr = new Float32Array(Math.round(0.9 * sr)), j = rand(0.92, 1.08);
      thump(arr, sr, 0, 66 * j, 3.5, 170, 0.045, 0.17, 1); thump(arr, sr, 0, 118 * j, 2.2, 260, 0.045, 0.14, 0.45);
      thump(arr, sr, 0.3, 60 * j, 3.5, 160, 0.045, 0.15, 0.66); thump(arr, sr, 0.3, 105 * j, 2.2, 240, 0.045, 0.12, 0.3);
      out.push(normBuf(c, arr, 1));
    }
    return (CB.beats = out);
  }
  function clackBufs(c) {
    if (CB.clacks) return CB.clacks; var sr = c.sampleRate, out = [];
    for (var v = 0; v < 4; v++) {
      var arr = new Float32Array(Math.round(0.95 * sr)), pat = [0, 0.15, 0.55, 0.7], i;
      for (i = 0; i < 4; i++) { var tt = pat[i] + rand(-0.004, 0.004), g = rand(0.8, 1); thump(arr, sr, tt, (i % 2 ? 235 : 205) * rand(0.95, 1.05), 1.2, 700, 0.008, 0.075, 0.9 * g); thump(arr, sr, tt, 70, 0.7, 130, 0.012, 0.12, 1.0 * g); }
      out.push(normBuf(c, arr, 1));
    }
    return (CB.clacks = out);
  }
  function playBuf(I, buf, t, g, rate, to) {
    var s = A.c.createBufferSource(), gn = K.gainNode(g); s.buffer = buf; if (rate) s.playbackRate.value = rate; s.connect(gn); gn.connect(to || I.out); s.start(t); s.stop(t + buf.duration / (rate || 1) + 0.05);
  }
  ovBuilders.pulse = function (I) {
    I.nx = 0; I.bpm = rand(54, 60); var bufs = beatBufs(A.c), k = 0;
    I.tick = function (now, until) {
      if (!I.nx) I.nx = now + 0.5;
      while (I.nx < until) {
        if (I.nx < now + 0.05) I.nx = now + 0.05;
        var t = I.nx, per = 60 / I.bpm;
        playBuf(I, bufs[k++ % bufs.length], t, rand(0.92, 1.05));
        I.bpm = clamp(I.bpm + rand(-0.6, 0.6), 52, 62); I.nx = t + per * rand(0.985, 1.015);
      }
    };
  };
  ovBuilders.train = function (I) {
    var B = A.bufs, F = K.filt; I.nx = 0; I.sp = 1; var bufs = clackBufs(A.c), k = 0, pn = K.panner(0); pn.connect(I.out); I.pn = pn;
    L(I, B.brownA, [F('lowpass', 170, 0.5)], 0.5, 0); L(I, B.pinkB, [F('bandpass', 120, 1), F('lowpass', 320, 0.5)], 0.22, 0.1); fin(I, 0.04);
    I.tick = function (now, until) {
      if (!I.nx) I.nx = now + 0.4;
      while (I.nx < until) {
        if (I.nx < now + 0.05) I.nx = now + 0.05;
        var t = I.nx, sp = I.sp;
        if (pn.pan) pn.pan.setValueAtTime(Math.sin(t * 0.05) * 0.3, t);
        playBuf(I, bufs[(k++ + Math.floor(Math.random() * 2)) % bufs.length], t, rand(0.85, 1), sp, pn);
        I.sp = clamp(sp + rand(-0.025, 0.025), 0.82, 1.15); I.nx = t + 1.12 / sp;
      }
    };
  };
  // the music-box and piano lullabies share one writer: a slow random walk on a pentatonic scale (so every note is consonant
  // with every other), short phrases with space between them, a low note under some, and different every time
  var SCALE = [55, 57, 60, 62, 64, 67, 69, 72, 74, 76, 79], BASS = [48, 43, 45, 41];
  var TIMBRE = {
    box: { p: [[1, 1], [2, 0.2], [3.01, 0.06]], a: 0.02, d: 2.8, lp: 3000, pk: 0.5 },
    piano: { p: [[1, 1], [2, 0.5], [3, 0.2], [4, 0.08]], a: 0.035, d: 4.2, lp: 1500, pk: 0.46, det: 3 }
  };
  function noteEnv(a, d, pk) {
    var n = Math.floor((a + d) * 220) + 2, cv = new Float32Array(n), i, t, v;
    for (i = 0; i < n; i++) { t = i / (n - 1) * (a + d); v = t < a ? K.hann(t / a) : Math.exp(-(t - a) / (d / 5.5)); if (t > a + d * 0.72) v *= K.hann(1 - (t - a - d * 0.72) / (d * 0.28)); cv[i] = v * pk; }
    cv[0] = 0; cv[n - 1] = 0; return cv;
  }
  function lullNote(I, tm, t, midi, vel, long) {
    var c = A.c, hz = midiHz(midi), d = tm.d * (long ? 1.2 : 1) * clamp(1.5 - hz / 900, 0.6, 1.3), out = K.gainNode(0), lp = K.filt('lowpass', tm.lp * (0.7 + 0.5 * vel), 0.5), pn = K.panner(rand(-0.25, 0.25));
    out.connect(lp); lp.connect(pn); pn.connect(I.out);
    tm.p.forEach(function (pt) {
      var copies = tm.det ? [-tm.det, tm.det] : [0];
      copies.forEach(function (dt) {
        var o = c.createOscillator(), pg = K.gainNode(pt[1] * (hz * pt[0] > 2000 ? 0.25 : 1) / copies.length); o.type = 'sine'; o.frequency.value = hz * pt[0]; o.detune.value = dt + rand(-1, 1);
        o.connect(pg); pg.connect(out); o.start(t); o.stop(t + tm.a + d + 0.1);
      });
    });
    play(out.gain, noteEnv(tm.a, d, tm.pk * vel), t, tm.a + d);
  }
  function lullaby(variant) {
    return function (I) {
      var tm = TIMBRE[variant]; I.nx = 0; I.pos = 5; I.q = []; I.beat = rand(1.1, 1.3); I.last = -1;
      function phrase(t) {
        var len = 4 + Math.floor(Math.random() * 4), seq = [], pos = clamp(I.pos + Math.floor(rand(-2, 3)), 1, SCALE.length - 2), i, steps = [-2, -1, -1, 0, 1, 1, 2];
        for (i = 0; i < len; i++) {
          if (i) { var st = steps[Math.floor(Math.random() * steps.length)]; if (pos > 8) st = -Math.abs(st) - (Math.random() < 0.4 ? 1 : 0); if (pos < 2) st = Math.abs(st); pos = clamp(pos + st, 0, SCALE.length - 1); }
          if (i === len - 1) { var tonic = [2, 5, 8], best = tonic[0]; tonic.forEach(function (x) { if (Math.abs(x - pos) < Math.abs(best - pos)) best = x; }); pos = best; }
          seq.push({ pos: pos, beats: i === len - 1 ? rand(2, 3.2) : [1, 1, 1.5, 2][Math.floor(Math.random() * 4)], vel: rand(0.55, 1) * (i === len - 1 ? 0.8 : 1) });
        }
        I.pos = pos;
        if (Math.random() < 0.7) lullNote(I, tm, t, BASS[Math.floor(Math.random() * BASS.length)], rand(0.5, 0.8), true);
        var tt = t + rand(0.1, 0.4); seq.forEach(function (n) {
          lullNote(I, tm, tt, SCALE[n.pos], n.vel, n.beats > 1.8);
          if (n.beats > 1.8 && Math.random() < 0.3) lullNote(I, tm, tt + 0.03, SCALE[Math.min(SCALE.length - 1, n.pos + 2)], n.vel * 0.5, true);
          tt += n.beats * I.beat * rand(0.96, 1.05);
        });
        return tt + I.beat * rand(1.5, 4.5);
      }
      I.tick = function (now, until) {
        if (!I.nx) I.nx = now + rand(1.5, 4);
        while (I.nx < until) { if (I.nx < now + 0.05) I.nx = now + 0.05; I.nx = phrase(I.nx); I.beat = clamp(I.beat + rand(-0.03, 0.03), 1.05, 1.4); }
      };
    };
  }
  ovBuilders.box = lullaby('box'); ovBuilders.piano = lullaby('piano');
  ovBuilders.hum = function (I) {
    var c = A.c, F = K.filt; I.nx = 0; I.f = 130.8;
    var o1 = c.createOscillator(), o2 = c.createOscillator(), lfo = c.createOscillator(), lg = K.gainNode(0), mixN = K.gainNode(0.5), env = K.gainNode(0), pn = K.panner(0);
    o1.type = 'sawtooth'; o2.type = 'sawtooth'; o1.frequency.value = o2.frequency.value = I.f; o2.detune.value = 6; lfo.frequency.value = 5.1;
    lfo.connect(lg); lg.connect(o1.detune); lg.connect(o2.detune); o1.connect(mixN); o2.connect(mixN);
    var f1 = K.gainNode(0.7), f2 = K.gainNode(0.32); K.chain(mixN, F('bandpass', 450, 3), f1); K.chain(mixN, F('bandpass', 1000, 4), f2);
    var sum = K.gainNode(1); f1.connect(sum); f2.connect(sum); K.chain(sum, F('lowpass', 1100, 0.5), env, pn, I.out);
    o1.start(); o2.start(); lfo.start(); I.srcs.push(o1, o2, lfo);
    var NOTES = [98, 110, 123.5, 130.8, 146.8, 164.8];
    I.tick = function (now, until) {
      if (!I.nx) I.nx = now + rand(2, 6);
      while (I.nx < until) {
        if (I.nx < now + 0.05) I.nx = now + 0.05;
        var t = I.nx, len = rand(2.8, 6), f = NOTES[Math.floor(Math.random() * NOTES.length)];
        o1.frequency.setTargetAtTime(f, t, 0.25); o2.frequency.setTargetAtTime(f, t, 0.25);
        lg.gain.setTargetAtTime(7, t + 0.8, 0.6); lg.gain.setTargetAtTime(0, t + len - 1.2, 0.5);
        play(env.gain, K.swell(0.9, Math.max(0.3, len - 2.2), 1.3, 0.1 * rand(0.7, 1)), t, len);
        I.nx = t + len + rand(2.5, 9);
      }
    };
  };
  var ENGINE = {};
  function build(key) {
    var I = mkInst(key); ovBuilders[key](I);
    if (I.srcs.length && !I.tick && !/^(crickets|thunder)$/.test(key)) { /* noise layers are already wired through fin() */ }
    I.stop = function () { I.srcs.forEach(function (s) { try { s.stop(); } catch (e) {} }); try { I.out.disconnect(); } catch (e) {} };
    return I;
  }
  function blocked(key) { return sensitive() && OV[key].hf > SENS_HF; }
  function sensitive() { return pets().some(function (p) { return p.sens; }); }
  function level(key) { var m = ST.cur.ovl[key]; return m && m.on && !blocked(key) ? Math.pow(m.vol / 100, 1.5) : 0; }
  // apply every overlay's level (smoothly); a soft ceiling keeps many together from getting louder than one at 100%
  function recompute(tc) {
    var c = A.c; if (!c || !ovlBus) return;
    var now = c.currentTime, P = 0, trim = 1;
    ORDER.forEach(function (k) { var l = level(k); P += l * l; });
    if (P > CAP) trim = Math.sqrt(CAP / P);
    ORDER.forEach(function (k) {
      var l = level(k), I = INST[k];
      if (l > 0 && !I && S.soundOn) { I = INST[k] = build(k); tc = 1.6; }
      if (I) I.out.gain.setTargetAtTime(l * trim * OV[k].unit, now, tc || 0.35);
      if (I && l === 0) { delete INST[k]; I.dead = true; I.out.gain.setTargetAtTime(0, now, 1.1); (function (J) { setTimeout(function () { J.stop(); }, 7000); })(I); }
    });
    ovlBus.gain.setTargetAtTime(1, now, 0.1);
    A.master.gain.setTargetAtTime(Math.pow(ST.cur.master / 100, 2), now, 0.3);
  }
  function tickOverlays(now) {
    var until = now + HORIZON;
    Object.keys(INST).forEach(function (k) { var I = INST[k]; if (I.tick) { try { I.tick(now, until); } catch (e) { ERR.push(k + ': ' + e.message); if (ERR.length > 20) ERR.shift(); } } });
  }
  function derivedBed() {
    var on = ['rain', 'fan', 'brown'].filter(function (k) { return ST.cur.ovl[k] && ST.cur.ovl[k].on; });
    return on.length ? on[0] : 'off';
  }

  // ------------------------------------------------------------------ the hooks into the cam
  function ensureBuses() {
    if (!A.c || petsBus) return;
    petsBus = K.gainNode(0); petsBus.connect(A.master); ovlBus = K.gainNode(1); ovlBus.connect(A.master);
  }
  function mixOn() {
    ensureBuses(); if (!A.c) return;
    A.master.gain.setTargetAtTime(Math.pow(ST.cur.master / 100, 2), A.c.currentTime, 0.1);
    syncPets(); recompute(1.6); K.noteBed(derivedBed());
  }
  function mixStop() {
    var c = A.c; if (!c) return; var now = c.currentTime;
    Object.keys(INST).forEach(function (k) { var I = INST[k]; delete INST[k]; I.dead = true; I.out.gain.setTargetAtTime(0, now, 0.4); setTimeout(function () { I.stop(); }, 3000); });
  }
  function tick() {
    var c = A.c; if (!c || !petsBus || !S.soundOn || S.ended) return;
    var now = c.currentTime;
    syncPets(); sendPetBreaths(); petExtras(now); tickOverlays(now);
  }
  var HKS = window.TOLSleepCam.hook;
  HKS('audioBuilt', function () { ensureBuses(); syncPets(); });
  HKS('tick', tick); HKS('mixOn', mixOn); HKS('mixStop', mixStop);
  HKS('bed', function (kind) {
    ['rain', 'fan', 'brown'].forEach(function (k) { var m = ST.cur.ovl[k] || (ST.cur.ovl[k] = { on: false, vol: 100 }); m.on = k === kind; if (m.on && !m.vol) m.vol = 100; });
    changed('overlay'); recompute(0.6);
  });
  HKS('start', function () { });

  // ------------------------------------------------------------------ the public API (used by sleepcam-ui.js)
  function setOverlay(key, o) {
    if (!OV[key]) return; var m = ST.cur.ovl[key] || (ST.cur.ovl[key] = { on: false, vol: 70 });
    if (o.on != null) m.on = !!o.on; if (o.vol != null) m.vol = clamp(Math.round(+o.vol), 0, 100);
    changed('overlay'); recompute(); K.noteBed(derivedBed());
  }
  function setMaster(v) { ST.cur.master = clamp(Math.round(+v), 0, 100); changed('master'); recompute(); }
  function setPetVol(v) { ST.cur.petVol = clamp(Math.round(+v), 0, 100); changed('petvol'); syncPets(); }
  function setPetsOn(b) { ST.cur.pets = !!b; changed('pets'); syncPets(); }
  function loadMix(ovl, master) {
    ORDER.forEach(function (k) {
      var vol = ovl && ovl[k], m = ST.cur.ovl[k] || (ST.cur.ovl[k] = { on: false, vol: 70 });
      if (vol != null && vol > 0) { m.on = true; m.vol = clamp(Math.round(vol), 0, 100); } else m.on = false;
    });
    if (master != null) ST.cur.master = clamp(Math.round(+master), 0, 100);
    changed('mix'); recompute(1.2); K.noteBed(derivedBed());
  }
  function currentOvl() { var o = {}; ORDER.forEach(function (k) { var m = ST.cur.ovl[k]; if (m && m.on) o[k] = m.vol; }); return o; }
  function mixSummary(ovl) { return ORDER.filter(function (k) { return ovl[k]; }).map(function (k) { return OV[k].label; }); }
  // presets
  function savePreset(name) {
    name = String(name || '').replace(/[\u0000-\u001F<>]/g, ' ').trim().slice(0, 28); var ov = currentOvl();
    if (!name || !Object.keys(ov).length) return null;
    var ex = null; ST.presets.forEach(function (p) { if (p.name.toLowerCase() === name.toLowerCase()) ex = p; });
    if (ex) { ex.ovl = ov; ex.master = ST.cur.master; changed('presets'); return ex; }
    if (ST.presets.length >= 12) return 'full';
    var p = { id: 'm' + Math.random().toString(36).slice(2, 7), name: name, ovl: ov, master: ST.cur.master }; ST.presets.push(p); changed('presets'); return p;
  }
  function deletePreset(id) { var n = ST.presets.length; ST.presets = ST.presets.filter(function (p) { return p.id !== id; }); if (ST.tonight && ST.tonight.id === id) ST.tonight.id = null; if (ST.presets.length !== n) changed('presets'); return ST.presets.length !== n; }
  function renamePreset(id, name) { name = String(name || '').replace(/[\u0000-\u001F<>]/g, ' ').trim().slice(0, 28); ST.presets.forEach(function (p) { if (p.id === id && name) p.name = name; }); changed('presets'); }
  function loadPreset(id) { var p = null; ST.presets.forEach(function (x) { if (x.id === id) p = x; }); if (!p) return false; loadMix(p.ovl, p.master); return true; }
  // "Try it for tonight" and the thumbs the next day
  function tryTonight(name, id) {
    var ov = currentOvl(); if (!Object.keys(ov).length) return false;
    ST.tonight = { d: today(), id: id || null, name: String(name || 'Tonight’s mix').slice(0, 28), ovl: ov, rated: false }; changed('tonight'); return true;
  }
  function pendingRating() { var t = ST.tonight; return t && !t.rated && t.d < today() ? t : null; }
  function rate(r, force) {
    var t = ST.tonight; if (!t || t.rated || (!force && t.d >= today())) return false;
    ST.log.push({ d: t.d, id: t.id, name: t.name, r: r > 0 ? 1 : -1 }); ST.log = ST.log.slice(-100); t.rated = r > 0 ? 1 : -1; changed('rated'); return true;
  }
  function skipRating() { if (ST.tonight) { ST.tonight.rated = 0; changed('tonight'); } }
  function tallies() {
    var m = {};
    ST.log.forEach(function (x) { var k = x.id || x.name; var o = m[k] || (m[k] = { id: x.id, name: x.name, up: 0, down: 0 }); if (x.r > 0) o.up++; else o.down++; });
    ST.presets.forEach(function (p) { if (m[p.id]) m[p.id].name = p.name; });
    return Object.keys(m).map(function (k) { return m[k]; });
  }
  function bestSoFar() {
    var best = null; tallies().forEach(function (t) { var sc = t.up - t.down; if (t.up > 0 && sc > 0 && (!best || sc > best.up - best.down || (sc === best.up - best.down && t.up > best.up))) best = t; });
    return best;
  }
  // ------------------------------------------------------------------ the "what helps you sleep best?" picker
  var SIT = [
    ['noisy', 'A noisy home or street'], ['racing', 'A racing mind'], ['light', 'I am a light sleeper'], ['warm', 'I get too warm'],
    ['safe', 'I need to feel safe'], ['wake', 'I wake in the night'], ['easy', 'Kids or pets who wake easily']
  ];
  var WORKED = [['rain', 'Rain'], ['fan', 'A fan'], ['ocean', 'Ocean waves'], ['wind', 'Wind'], ['fire', 'A fire'], ['train', 'A train'], ['music', 'Soft music'], ['quiet', 'Near silence']];
  var WEIGHT = {
    noisy: { brown: 0.62, fan: 0.55, rain: 0.3 }, racing: { ocean: 0.5, rain: 0.4, hush: 0.28, box: 0.25 }, light: { fan: 0.55, pink: 0.45, brown: 0.35 },
    warm: { fan: 0.6, wind: 0.5, rainwin: 0.38 }, safe: { pulse: 0.4, fire: 0.38, hum: 0.3, rain: 0.3 }, wake: { brown: 0.45, ocean: 0.4, rain: 0.35 },
    easy: { brown: 0.5, fan: 0.45, ocean: 0.3 }
  };
  var WORKW = { rain: { rain: 0.6 }, fan: { fan: 0.6 }, ocean: { ocean: 0.6 }, wind: { wind: 0.6 }, fire: { fire: 0.5 }, train: { train: 0.5 }, music: { box: 0.35, piano: 0.3 }, quiet: {} };
  var NOTE = {
    noisy: 'A steady, broad sound can soften sudden noises outside.', racing: 'Slow, predictable sounds with space in them give attention somewhere gentle to rest.',
    light: 'Many light sleepers prefer even sounds with nothing sudden in them, so thunder, crackle and trains stay out of this mix.',
    warm: 'Moving-air sounds can feel cooler.', safe: 'A slow pulse and a warm crackle can feel like company in the room.',
    wake: 'A low, steady sound at a low volume all night may suit you better than a timer that ends. You can set the timer to Off.',
    easy: 'Only low, even sounds are used, with nothing sudden or high-pitched.'
  };
  function recommend(sit, worked) {
    sit = sit || []; worked = worked || [];
    var sc = {}, why = [], hasPets = pets().length > 0, calmOnly = sit.indexOf('light') >= 0 || sit.indexOf('easy') >= 0;
    function add(k, v) { sc[k] = Math.min(0.85, (sc[k] || 0) + v); }
    sit.forEach(function (s) { var w = WEIGHT[s]; if (w) { Object.keys(w).forEach(function (k) { add(k, w[k]); }); if (NOTE[s]) why.push(NOTE[s]); } });
    worked.forEach(function (s) { var w = WORKW[s]; if (w) Object.keys(w).forEach(function (k) { add(k, w[k]); }); });
    if (!Object.keys(sc).length && worked.indexOf('quiet') < 0) { add('brown', 0.5); add('rain', 0.4); }
    if (worked.indexOf('quiet') >= 0) { Object.keys(sc).forEach(function (k) { sc[k] *= 0.6; }); why.push('You said near silence works, so everything here is kept low.'); }
    var keys = Object.keys(sc).filter(function (k) {
      if (calmOnly && /^(thunder|train|fire|crickets)$/.test(k)) return false;
      if (hasPets && OV[k].hf > SENS_HF && OV[k].bright) return false;
      if (sensitive() && OV[k].hf > SENS_HF) return false;
      return true;
    }).sort(function (a, b) { return sc[b] - sc[a]; }).slice(0, 4);
    var out = {}; keys.forEach(function (k) { out[k] = Math.round(clamp(sc[k], 0.2, 0.85) * 100 / 5) * 5; });
    var notes = [];
    if (hasPets) notes.push('Pets are in the room, so higher-pitched sounds were left out.');
    return { ovl: out, why: why.slice(0, 3), notes: notes };
  }

  loadState();
  window.TOLSleepMix = {
    overlays: OV, order: ORDER, groups: GROUPS, sit: SIT, worked: WORKED, sensHF: SENS_HF, cap: CAP,
    get: function () { return JSON.parse(JSON.stringify(ST)); }, cur: function () { return ST.cur; },
    setOverlay: setOverlay, setMaster: setMaster, setPetVol: setPetVol, setPetsOn: setPetsOn, loadMix: loadMix, currentOvl: currentOvl, mixSummary: mixSummary,
    savePreset: savePreset, deletePreset: deletePreset, renamePreset: renamePreset, loadPreset: loadPreset, presets: function () { return ST.presets.slice(); },
    tryTonight: tryTonight, tonight: function () { return ST.tonight; }, pendingRating: pendingRating, rate: rate, skipRating: skipRating, tallies: tallies, best: bestSoFar, log: function () { return ST.log.slice(); },
    recommend: recommend, answers: function () { return ST.ans; }, setAnswers: function (a) { ST.ans = { sit: (a.sit || []).slice(0, 10), worked: (a.worked || []).slice(0, 10) }; changed('answers'); },
    blocked: blocked, sensitive: sensitive, level: level, refresh: function () { recompute(); syncPets(); },
    petSfx: petSfx, onChange: function (f) { listeners.push(f); }, today: today,
    _inst: function () { return Object.keys(INST); }, _errors: function () { return ERR; }, _fast: function (b) { FAST = !!b; }, _voices: function () { return Object.keys(VO); }, _state: function () { return ST; }, _sf: SF, _save: saveNow
  };
  if (window.TOLSleepPets) window.TOLSleepPets.onChange(function () { var c = A.c; if (c && petsBus) { syncPets(); recompute(); } listeners.forEach(function (f) { try { f('pets'); } catch (e) {} }); });
})();
