/* sleepcam-pets.js: fur babies for the Sleeping Pals Cam (sleeping-pals-cam.html).
   Each visitor can add up to four of their own animals to the sleeping room: a dog, cat, rabbit, guinea pig,
   hamster, bird, ferret, lizard or reptile, horse, or "other". They are drawn here by code (flat shapes and
   closed eyes, the same style as Tidbit and Sugarfoot) on a patchwork quilt in front of the rug, each on a little
   pillow that carries the name. Each one breathes slowly, twitches a whisker, an ear or a tail now and then,
   floats a few z's, has a rare tiny dream bubble, and about every few minutes does one funny thing that fits the
   animal (the cat stretches and kneads, the rabbit does a sleepy flop, the bird fluffs and tucks its head, the
   hamster runs in its wheel in its sleep, and so on).
   A pet can also be kept close with a soft star and halo (a gentle touch for a pet who has passed). That pet
   just sleeps; no funny moments, and its sound starts off.
   Saved on this device only, in localStorage 'tol-sleepcam-pets-v1'. Nothing is sent anywhere.
   Calm motion (reduce motion, Quiet mode): smaller breaths and twitches, rarer and slower moments.
   The sounds live in sleepcam-sounds.js (TOLSleepMix); the panels in sleepcam-ui.js.
   window.TOLSleepPets: list / add / update / remove / clear / kinds / colors / drawPreview / describe / onChange. */
(function () {
  'use strict';
  if (typeof window === 'undefined' || !window.TOLSleepCam || !window.TOLSleepCam.core) return;
  var K = window.TOLSleepCam.core(), S = K.S, G = K.G, TAU = K.TAU, clamp = K.clamp, mix = K.mix, sio = K.sio, seg = K.seg, rand = K.rand;
  var KEY = 'tol-sleepcam-pets-v1', MAX = 4, g = null, PSC = 1.22; // PSC: the pets' size in the room, next to the pups

  // ------------------------------------------------------------------ what can be added
  var KINDS = [
    { id: 'dog', label: 'Dog', w: 54, sc: 1, per: 4.3 }, { id: 'cat', label: 'Cat', w: 46, sc: 1, per: 3.3 },
    { id: 'rabbit', label: 'Rabbit', w: 42, sc: 1, per: 2.2 }, { id: 'guinea', label: 'Guinea pig', w: 40, sc: 1, per: 1.7 },
    { id: 'hamster', label: 'Hamster', w: 36, sc: 1.2, per: 1.5, wheel: 30 }, { id: 'bird', label: 'Bird', w: 32, sc: 0.98, per: 2.6 },
    { id: 'ferret', label: 'Ferret', w: 64, sc: 1, per: 2.9 }, { id: 'lizard', label: 'Lizard or reptile', w: 76, sc: 1, per: 6.5 },
    { id: 'horse', label: 'Horse', w: 88, sc: 0.8, per: 6.8 }, { id: 'other', label: 'Other', w: 40, sc: 1, per: 3.5 }
  ];
  var COLORS = [
    { id: 'cream', label: 'Cream', main: '#E9D3A8', dark: '#C4A474', light: '#F8EDD3' },
    { id: 'honey', label: 'Honey', main: '#DBA652', dark: '#AD7A2E', light: '#F2CF8C' },
    { id: 'ginger', label: 'Ginger', main: '#DB7A33', dark: '#A8521A', light: '#F4B681' },
    { id: 'caramel', label: 'Caramel', main: '#BC7C48', dark: '#87522A', light: '#E0B287' },
    { id: 'cocoa', label: 'Cocoa', main: '#80533D', dark: '#52311F', light: '#B08467' },
    { id: 'charcoal', label: 'Charcoal', main: '#55505C', dark: '#34303A', light: '#7D7787' },
    { id: 'silver', label: 'Silver', main: '#B2B0BC', dark: '#85828F', light: '#DAD8E2' },
    { id: 'snow', label: 'Snow', main: '#F1EEF2', dark: '#CBC5D0', light: '#FFFFFF' },
    { id: 'sky', label: 'Sky blue', main: '#84B6DB', dark: '#5388B2', light: '#BCD9EE' },
    { id: 'sage', label: 'Sage green', main: '#92B680', dark: '#638854', light: '#BFD7AE' }
  ];
  var SIZES = [{ id: 's', label: 'Small', k: 0.82 }, { id: 'm', label: 'Medium', k: 1 }, { id: 'l', label: 'Large', k: 1.2 }];
  var PILLOWS = ['#6B4C74', '#4C6A78', '#78564E', '#56704F'];
  function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function kindOf(p) { return find(KINDS, p.kind) || KINDS[9]; }
  function colorOf(p) { return find(COLORS, p.color) || COLORS[1]; }
  function sizeOf(p) { return find(SIZES, p.size) || SIZES[1]; }
  function hexA(h, a) { var n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function hashOf(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }

  // ------------------------------------------------------------------ the saved list
  var PETS = [], RT = {}, listeners = [];
  function cleanName(n) { return String(n == null ? '' : n).replace(/[\u0000-\u001F<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 14); }
  function normalize(o) {
    if (!o || typeof o !== 'object') return null;
    var kind = find(KINDS, o.kind) ? o.kind : 'other', name = cleanName(o.name) || find(KINDS, kind).label;
    return { id: typeof o.id === 'string' && /^[a-z0-9]{2,12}$/.test(o.id) ? o.id : 'p' + Math.random().toString(36).slice(2, 8), kind: kind, name: name,
      color: find(COLORS, o.color) ? o.color : 'honey', size: find(SIZES, o.size) ? o.size : 'm', memory: !!o.memory, snd: o.snd == null ? !o.memory : !!o.snd, sens: !!o.sens };
  }
  function load() {
    var o = null; try { o = JSON.parse(K.lsGet(KEY) || 'null'); } catch (e) {}
    PETS = [];
    if (o && Array.isArray(o.pets)) o.pets.slice(0, MAX).forEach(function (p) { var n = normalize(p); if (n) PETS.push(n); });
  }
  function save() { K.lsSet(KEY, JSON.stringify({ v: 1, pets: PETS })); }
  function changed(why) { save(); listeners.forEach(function (f) { try { f(why); } catch (e) {} }); }
  function list() { return PETS.map(function (p) { return Object.assign({}, p); }); }
  function add(o) {
    if (PETS.length >= MAX) return null;
    var n = normalize(o); if (!n) return null; n.id = 'p' + Math.random().toString(36).slice(2, 8);
    PETS.push(n); changed('add'); return Object.assign({}, n);
  }
  function update(id, patch) {
    var p = byId(id); if (!p) return false;
    var n = normalize(Object.assign({}, p, patch, { id: p.id }));
    n.id = p.id; Object.keys(n).forEach(function (k) { p[k] = n[k]; });
    if (patch && patch.memory != null && patch.snd == null) p.snd = !p.memory;
    delete RT[id]; changed('update'); return true;
  }
  function remove(id) { var i = -1; PETS.forEach(function (p, j) { if (p.id === id) i = j; }); if (i < 0) return null; var gone = PETS.splice(i, 1)[0]; delete RT[id]; changed('remove'); return gone; }
  function restore(p, at) { if (PETS.length >= MAX) return false; var n = normalize(p); n.id = p.id; PETS.splice(clamp(at == null ? PETS.length : at, 0, PETS.length), 0, n); changed('add'); return true; }
  function clear() { PETS = []; RT = {}; changed('clear'); }
  function byId(id) { for (var i = 0; i < PETS.length; i++) if (PETS[i].id === id) return PETS[i]; return null; }
  function describe() {
    return PETS.map(function (p) { return p.name + ' the ' + kindOf(p).label.toLowerCase() + (p.memory ? ', kept close with a star' : ''); });
  }

  // ------------------------------------------------------------------ per-pet runtime (not saved)
  function rt(p) {
    var R = RT[p.id];
    if (!R) {
      var kd = kindOf(p), sd = hashOf(p.name + p.kind + p.id);
      R = RT[p.id] = { breaths: [], nextB: 0, per: 0, mood: 0.8, base: kd.per * (0.93 + sd * 0.14) * (p.size === 'l' ? 1.1 : p.size === 's' ? 0.92 : 1) * (p.memory ? 1.2 : 1), ev: null, nextEv: 0, tw: {}, zs: [], zn: 0, dream: null, nextDream: 0, wa: 0, seed: sd, x: 0 };
    }
    return R;
  }
  function expo(mean) { return -Math.log(1 - Math.random()) * mean; }
  // a twitch channel: a short pulse (0..1) at random moments, never on a schedule
  function twv(R, ch, T, gap, dur) {
    var t = R.tw[ch]; if (!t) t = R.tw[ch] = { next: T + expo(gap) * 0.6 + 1, t0: -9, dur: dur };
    if (T >= t.next) { t.t0 = T; t.dur = dur * rand(0.8, 1.3); t.next = T + t.dur + expo(gap) + 1.5; }
    var u = (T - t.t0) / t.dur; return u >= 0 && u <= 1 ? Math.sin(Math.PI * u) : 0;
  }
  function breathAt(R, T) { for (var i = R.breaths.length - 1; i >= 0; i--) { var b = R.breaths[i]; if (T >= b.t) { var u = (T - b.t) / b.dur; return u < 0.42 ? sio(u / 0.42) : 1 - sio((u - 0.42) / 0.58); } } return 0; }
  // breaths are planned a little ahead (the sound reads the same plan), a slow drift of pace and depth like the pups
  function plan(T) {
    var horizon = T + 12;
    PETS.forEach(function (p) {
      var R = rt(p), kd = kindOf(p);
      if (!R.nextB) { R.nextB = T + rand(0.2, 2.5); R.per = R.base; R.mood = 0.8; }
      while (R.nextB < horizon) {
        R.per = clamp(R.per + rand(-0.06, 0.06) * R.base, R.base * 0.8, R.base * 1.24);
        R.mood = clamp(R.mood + rand(-0.1, 0.1) + (0.78 - R.mood) * 0.08, 0.5, 1);
        var deep = Math.random() < 0.06, dur = R.per * rand(0.93, 1.07) * (deep ? 1.25 : 1) + (Math.random() < 0.08 ? rand(0.3, 1.4) * kd.per / 4 : 0);
        var b = { t: R.nextB, dur: dur, vol: R.mood * rand(0.85, 1) * (deep ? 1.12 : 1), snore: R.mood > 0.58 && Math.random() < 0.72 ? rand(0.45, 1) : 0, exh: rand(0.3, 0.45), pitch: rand(0.94, 1.06), form: rand(0.92, 1.08), sent: false };
        R.breaths.push(b); if (R.breaths.length > 14) R.breaths.shift();
        R.nextB += dur;
      }
    });
  }

  // ------------------------------------------------------------------ the funny moments
  var MOMENT = { cat: ['stretch', 13], dog: ['dream', 8.5], rabbit: ['flop', 11.5], guinea: ['popcorn', 6.5], hamster: ['wheel', 15.5], bird: ['fluff', 10], ferret: ['dance', 7.5], lizard: ['tongue', 8.5], horse: ['huff', 8.5], other: ['wiggle', 6.5] };
  var curPet = null;
  function snd(p, name, arg) { var M = window.TOLSleepMix; if (M && M.petSfx) { try { M.petSfx(p.id, name, arg); } catch (e) {} } }
  function once(ev, key) { if (ev.fired[key]) return false; ev.fired[key] = 1; return true; }
  function startMoment(p, T) {
    var R = rt(p), m = MOMENT[p.kind] || MOMENT.other, k = S.calm ? 1.5 : 1;
    R.ev = { name: m[0], t0: T, dur: m[1] * k, k: k, fired: {} }; curPet = p.id;
  }
  // the numbers each drawing needs for the moment in progress
  function momentOf(p, R, T) {
    var ev = R.ev; if (!ev) return {};
    var s = (T - ev.t0) / ev.k, m = { name: ev.name, s: s };
    switch (ev.name) {
      case 'stretch':
        m.ext = sio(seg(s, 0.8, 3)) * (1 - sio(seg(s, 10, 12.4))); m.kn = sio(seg(s, 3.6, 4.6)) * (1 - sio(seg(s, 9, 10))); m.ph = s * 5.4;
        if (s > 0.9 && once(ev, 'a')) snd(p, 'mrrp'); if (s > 3.8 && once(ev, 'b')) snd(p, 'knead', 5.2 * ev.k);
        break;
      case 'dream':
        m.on = sio(seg(s, 0.3, 1)) * (1 - sio(seg(s, 6.4, 7.6))); m.ph = s * (S.calm ? 7 : 12);
        m.puff = Math.sin(Math.PI * seg(s, 2.5, 3.3)) + Math.sin(Math.PI * seg(s, 4.5, 5.2)) * 0.8;
        if (s > 0.8 && s < 6.2 && once(ev, 'st' + Math.floor(s * 2.4))) snd(p, 'paws');
        if (s > 2.6 && once(ev, 'b1')) snd(p, 'boof'); if (s > 4.6 && Math.random() < 0.5 && once(ev, 'b2')) snd(p, 'boof');
        break;
      case 'flop':
        m.fl = sio(seg(s, 0.4, 1.1)) * (1 - sio(seg(s, 8.8, 10.4))); m.hop = Math.sin(Math.PI * seg(s, 0.15, 0.55)) * 3;
        if (s > 0.9 && once(ev, 'a')) snd(p, 'thump'); if (s > 1.7 && once(ev, 'b')) snd(p, 'sigh'); if (s > 10.1 && once(ev, 'c')) snd(p, 'chuff');
        break;
      case 'popcorn': {
        var hs = [0.7, 1.45, 2.3], hop = 0;
        hs.forEach(function (h0, i) { var q = seg(s, h0, h0 + 0.5); if (q > 0 && q < 1) hop = Math.max(hop, Math.sin(Math.PI * q) * (i === 2 ? 4 : 7)); if (s > h0 + 0.5 && once(ev, 'h' + i)) snd(p, 'pip'); });
        m.hop = hop; m.sq = hop > 0 ? 1 : 0; if (s > 3.2 && Math.random() < 0.35 && once(ev, 'w')) snd(p, 'wheek');
        break; }
      case 'wheel':
        m.to = sio(seg(s, 0.6, 3.2)) * (1 - sio(seg(s, 11.4, 14)));
        m.run = (s > 3.2 && s < 11.4) ? 1 : 0; m.ph = R.wa;
        if (s > 0.6 && s < 3.2 && once(ev, 'w' + Math.floor(s * 3))) snd(p, 'patter');
        if (s > 3.4 && once(ev, 'r')) snd(p, 'wheel', 7.6 * ev.k);
        if (s > 11.6 && s < 14 && once(ev, 'q' + Math.floor(s * 3))) snd(p, 'patter');
        break;
      case 'fluff':
        m.fl = sio(seg(s, 0.4, 1.6)) * (1 - sio(seg(s, 7.4, 8.8))); m.head = sio(seg(s, 1.9, 2.7)) * (1 - sio(seg(s, 5.9, 7)));
        m.yawn = Math.sin(Math.PI * seg(s, 3.4, 4.8));
        if (s > 0.5 && once(ev, 'a')) snd(p, 'rustle'); if (s > 2.8 && once(ev, 'b')) snd(p, 'chirp'); if (s > 6.4 && once(ev, 'c')) snd(p, 'rustle');
        break;
      case 'dance': {
        var env = sio(seg(s, 0.3, 0.9)) * (1 - sio(seg(s, 5.4, 6.6)));
        m.env = env; m.hx = Math.sin(s * 8.5) * 3.2 * env; m.hop = Math.abs(Math.sin(s * 8.5)) * 3.2 * env; m.whip = Math.sin(s * 11) * env;
        if (s > 1.0 && once(ev, 'a')) snd(p, 'dook'); if (s > 1.55 && once(ev, 'b')) snd(p, 'dook'); if (s > 2.4 && Math.random() < 0.6 && once(ev, 'c')) snd(p, 'dook');
        break; }
      case 'tongue':
        m.lift = sio(seg(s, 0.4, 1.4)) * (1 - sio(seg(s, 5.2, 6.6)));
        m.tongue = Math.max(Math.sin(Math.PI * seg(s, 1.6, 2.1)), Math.sin(Math.PI * seg(s, 3.2, 3.7)));
        m.leg = sio(seg(s, 4, 5.2)) * (1 - sio(seg(s, 5.8, 7.2)));
        if (s > 1.7 && once(ev, 'a')) snd(p, 'tsk'); if (s > 3.3 && once(ev, 'b')) snd(p, 'tsk'); if (s > 6.8 && once(ev, 'c')) snd(p, 'sigh');
        break;
      case 'huff':
        m.lift = sio(seg(s, 0.5, 1.6)) * (1 - sio(seg(s, 5.2, 6.8))); m.nose = Math.sin(Math.PI * seg(s, 2.2, 3.3)); m.hoof = Math.sin(Math.PI * seg(s, 4.2, 5)) * 0.8;
        m.ear = Math.sin(Math.PI * seg(s, 1.6, 2.2));
        if (s > 2.3 && once(ev, 'a')) snd(p, 'huff'); if (s > 4.4 && Math.random() < 0.6 && once(ev, 'b')) snd(p, 'huff');
        break;
      default:
        m.env = sio(seg(s, 0.3, 0.8)) * (1 - sio(seg(s, 5, 6)));
        if (s > 1 && once(ev, 'a')) snd(p, 'mm');
    }
    return m;
  }
  function tickMoments(T) {
    if (!PETS.length) return;
    PETS.forEach(function (p) {
      var R = rt(p);
      if (!R.nextEv) { R.nextEv = T + rand(45, 130) * (S.calm ? 1.6 : 1); R.nextDream = T + rand(25, 80); }
      if (R.ev) {
        if (p.kind === 'hamster') R.wa += 0.033 * (S.calm ? 5 : 8) * ((R.ev && (T - R.ev.t0) / R.ev.k > 3.2 && (T - R.ev.t0) / R.ev.k < 11.4) ? 1 : 0);
        momentOf(p, R, T);
        if (T - R.ev.t0 >= R.ev.dur) { R.ev = null; R.nextEv = T + clamp(expo(S.calm ? 420 : 210), 70, 900); if (curPet === p.id) curPet = null; }
      } else if (!curPet && !S.ev && !S.ending && !p.memory && T >= R.nextEv) startMoment(p, T);
      // a tiny dream bubble, now and then, on its own
      if (!R.dream && T >= R.nextDream) { R.dream = { t0: T, dur: S.calm ? 9 : 7 }; R.nextDream = T + clamp(expo(S.calm ? 220 : 130), 50, 600); }
      if (R.dream && T - R.dream.t0 > R.dream.dur) R.dream = null;
    });
  }

  // ------------------------------------------------------------------ drawing helpers
  function e(x, y, rx, ry, col, rot) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); g.fill(); }
  function c(x, y, r, col) { e(x, y, r, r, col, 0); }
  function rim(x, y, rx, ry, rot) { g.strokeStyle = 'rgba(255,236,205,.16)'; g.lineWidth = 1.1; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  function eye(x, y, r) { g.strokeStyle = '#2B1E1E'; g.lineWidth = 1.2; g.lineCap = 'round'; g.beginPath(); g.arc(x, y - 0.7, r, Math.PI * 0.16, Math.PI * 0.84); g.stroke(); }
  function line(x1, y1, x2, y2, col, w) { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  function tri(x1, y1, x2, y2, x3, y3, col) { g.fillStyle = col; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x3, y3); g.closePath(); g.fill(); }
  function whiskers(x, y, w, dir, tw) {
    g.strokeStyle = 'rgba(255,245,230,.5)'; g.lineWidth = 0.6; g.lineCap = 'round';
    for (var i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(x, y + i * 1.3); g.lineTo(x + dir * w, y + i * 2.6 + tw * 1.6 - 0.6); g.stroke(); }
  }
  var BL = 'rgba(255,150,165,.34)', NOSE = '#6A4048', PINK = '#E8A0A6';

  // ------------------------------------------------------------------ the animals (drawn at the feet, facing right, about 40 to 60 units long)
  var D = {};
  D.dog = function (P) {
    var C = P.C, tw = P.tw, m = P.m, on = m.on || 0, ph = m.ph || 0;
    g.strokeStyle = C.main; g.lineWidth = 5.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(-19, -9); g.quadraticCurveTo(-28, -8 + tw.tail * 4, -28 - tw.tail * 2, -17 + tw.tail * 5); g.stroke();
    e(-1, -9, 21, 9, C.main); e(-10, -8, 10, 8, hexA(C.dark, 0.45)); rim(-1, -9, 21, 9);
    e(2, -3.5, 15, 4, C.light);
    e(-18, -3 + Math.sin(ph) * 1.6 * on, 5.4, 3, C.light); e(-12, -3 - Math.sin(ph + 2) * 1.6 * on, 5, 2.8, C.light);
    e(14, -3.2 + Math.sin(ph + 1) * 2 * on, 9, 3.2, C.main); e(22, -3.2 + Math.sin(ph + 1) * 2 * on, 4.2, 3, C.light);
    var hy = -10; c(19, hy, 9.6, C.main); rim(19, hy, 9.6, 9.6);
    e(26.5, hy + 2.4, 6.5 + (m.puff || 0) * 0.8, 4.6 + (m.puff || 0) * 1.2, C.light); e(31, hy + 0.6, 2.3, 1.7, '#3A2A2C');
    e(13.5, hy - 1.5 + tw.ear * 1.2, 4.3, 8, C.dark, 0.3 + tw.ear * 0.18); // the floppy ear
    eye(22, hy - 2.2, 2.1); e(25, hy + 3.4, 2.4, 1.2, BL);
    g.strokeStyle = 'rgba(60,35,35,.55)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(28.5, hy + 3.4); g.quadraticCurveTo(26, hy + 6, 23, hy + 5); g.stroke();
  };
  D.cat = function (P) {
    var C = P.C, tw = P.tw, m = P.m, ext = m.ext || 0, kn = m.kn || 0, ph = m.ph || 0;
    g.save(); g.scale(1 + 0.15 * ext, 1 - 0.05 * ext);
    g.strokeStyle = C.main; g.lineWidth = 6.4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-16, -6); g.bezierCurveTo(-26, 1, -4, 3, 8 + tw.tail * 1.5, -1.5 - tw.tail * 3.5); g.stroke();
    g.strokeStyle = C.dark; g.beginPath(); g.moveTo(5, -0.4 - tw.tail); g.lineTo(8.6 + tw.tail * 1.5, -1.5 - tw.tail * 3.5); g.stroke();
    e(-1, -11, 19, 11.5, C.main); rim(-1, -11, 19, 11.5);
    g.strokeStyle = hexA(C.dark, 0.42); g.lineWidth = 2; g.lineCap = 'round';
    [-10, -4, 2, 8].forEach(function (x) { var y0 = -11 - 11.2 * Math.sqrt(Math.max(0, 1 - Math.pow((x + 1) / 19, 2))); g.beginPath(); g.moveTo(x, y0 + 1); g.quadraticCurveTo(x + 2, y0 + 5, x, y0 + 9); g.stroke(); });
    e(-9, -4.5, 8, 4, C.light);
    var hx = 15 + 8 * ext, hy = -9.4 + ext * 1.4;
    var pawX = 19 + 15 * ext;
    e(pawX, -2.8 - Math.max(0, Math.sin(ph)) * 3.4 * kn, 6.4 + ext * 2, 2.9, C.light);
    e(pawX - 7 - ext * 3, -2.8 - Math.max(0, Math.sin(ph + Math.PI)) * 3.4 * kn, 5.6, 2.7, C.main);
    c(hx, hy, 9.4, C.main); rim(hx, hy, 9.4, 9.4);
    var ea = tw.ear * 0.25;
    g.save(); g.translate(hx - 5, hy - 7); g.rotate(-0.25 - ea); tri(-4.4, 4, 0, -7.5, 4.4, 4, C.main); tri(-2.1, 3, 0, -4.2, 2.1, 3, '#E6A0A2'); g.restore();
    g.save(); g.translate(hx + 4, hy - 8); g.rotate(0.2); tri(-4.4, 4, 0, -7.5, 4.4, 4, C.main); tri(-2.1, 3, 0, -4.2, 2.1, 3, '#E6A0A2'); g.restore();
    e(hx + 6, hy + 3, 5, 3.6, C.light); e(hx + 9.6, hy + 1.8, 1.5, 1.1, PINK);
    eye(hx + 4.5, hy - 1.6, 2); eye(hx - 2.5, hy - 1.4, 1.8); e(hx + 2, hy + 3.4, 2.2, 1.1, BL);
    whiskers(hx + 8, hy + 3, 8, 1, tw.whisk);
    g.restore();
  };
  D.rabbit = function (P) {
    var C = P.C, tw = P.tw, m = P.m, fl = m.fl || 0;
    var by = -10 + fl * 3.4;
    if (fl > 0.02) { e(-17 - 8 * fl, -4 - fl * 1.5, 9 * fl + 2, 3.4, C.dark, 0.1); e(-24 * fl - 8, -2.8, 4 * fl + 1, 2.2, C.light); }
    c(-18, by - 1, 4.8, C.light); // cotton tail
    e(0, by, 16.5, 11 - fl * 3.2, C.main); rim(0, by, 16.5, 11 - fl * 3.2);
    e(-8, by + 2, 9, 7 - fl * 2, hexA(C.dark, 0.4));
    e(3, by + 4.5, 11, 4.2 - fl, C.light);
    var hx = 15, hy = by - 0.2 + fl * 1.5;
    e(hx + 3, -2.6, 6, 2.6, C.light);
    var sag = fl * 0.35;
    g.save(); g.translate(hx - 5, hy - 7); g.rotate(-1.0 + sag + tw.ear * 0.1); e(-6, 0, 8.6, 2.8, C.dark); e(-6, 0, 6.6, 1.5, '#E8A9AB'); g.restore(); // the far ear, laid back
    c(hx, hy, 9, C.main); rim(hx, hy, 9, 9);
    g.save(); g.translate(hx - 2, hy - 7.5); g.rotate(-1.15 + sag - tw.ear * 0.14); e(-6.4, 0, 9.4, 3.1, C.main); e(-6.4, 0, 7.2, 1.7, '#E8A9AB'); g.restore(); // the near ear, laid back along the neck
    e(hx + 5.5, hy + 3, 5.6, 4.4, C.light); e(hx + 10 + tw.whisk * 0.6, hy + 1.2 + tw.whisk * 0.3, 1.5, 1.1, PINK);
    eye(hx + 4.2, hy - 1.8, 2); e(hx + 1.5, hy + 3.4, 2.4, 1.2, BL);
    whiskers(hx + 8.6, hy + 2.6, 7.5, 1, tw.whisk);
  };
  D.guinea = function (P) {
    var C = P.C, tw = P.tw, m = P.m, sq = m.sq ? 0.92 : 1;
    g.save(); g.scale(1, sq);
    e(-2, -9.5, 19.5, 10.4, C.main); rim(-2, -9.5, 19.5, 10.4);
    e(-8, -12, 8.5, 6.4, hexA(C.dark, 0.6)); e(-6, -6, 6, 4, hexA(C.light, 0.75)); e(4, -4.6, 12, 4.2, C.light);
    e(-13, -1.8, 4.6, 2.2, '#E6B3B0'); e(9, -1.8, 4, 2, '#E6B3B0');
    var hx = 15.5, hy = -8.6;
    e(hx, hy, 9.6, 9, C.main); rim(hx, hy, 9.6, 9);
    e(hx + 1, hy - 5.4, 2, 4, C.light, 0.2); // a pale blaze
    e(hx + 7, hy + 2.6, 3.8, 3.6, C.light); e(hx + 10, hy + 1.8, 1.4, 1.1, '#5A3A3E');
    e(hx - 4.4, hy - 5.8 + tw.ear * 0.5, 3.8, 2.8, '#C9877F', -0.55); e(hx - 4.2, hy - 5.8 + tw.ear * 0.5, 2.2, 1.5, '#E4B0AA', -0.55);
    eye(hx + 4, hy - 1.4, 1.9); e(hx + 1, hy + 3.4, 2.3, 1.1, BL);
    whiskers(hx + 9.2, hy + 2.2, 5.5, 1, tw.whisk);
    g.restore();
  };
  D.hamster = function (P) {
    var C = P.C, tw = P.tw, m = P.m, to = m.to || 0, run = m.run || 0, ph = m.ph || 0;
    // the wheel stands to the right
    var wx = 31, wy = -13.5, wr = 13.5;
    g.strokeStyle = '#7C748C'; g.lineWidth = 1.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(wx - 8, -1.5); g.lineTo(wx, wy); g.lineTo(wx + 8, -1.5); g.stroke();
    g.strokeStyle = 'rgba(200,190,225,.55)'; g.lineWidth = 1.7; g.beginPath(); g.arc(wx, wy, wr, 0, TAU); g.stroke();
    g.lineWidth = 0.9; g.strokeStyle = 'rgba(200,190,225,.4)'; for (var i = 0; i < 6; i++) { var a = ph * 0.9 + i * Math.PI / 3; g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr); g.stroke(); }
    c(wx, wy, 1.6, '#9A92AC');
    var off = to * (wx - 4 - 0), bob = run ? Math.abs(Math.sin(ph * 2)) * 1.2 : 0;
    g.save(); g.translate(off, -bob);
    c(-9, -6.2, 1.8, '#E8B8B2'); // tiny tail
    c(0, -9.4, 9.8, C.main); rim(0, -9.4, 9.8, 9.8);
    e(1.5, -6, 6.8, 5.6, C.light);
    var hx = 9, hy = -11;
    c(hx, hy, 6.8, C.main); e(hx + 1.5, hy + 3, 6.4, 5, C.light);
    c(hx - 3.5, hy - 6, 2.5 + tw.ear * 0.3, '#E8B0A8'); c(hx + 3.5, hy - 6.4, 2.4, '#E8B0A8');
    e(hx + 6.6, hy + 1.6, 1.3, 1, '#D9778A'); eye(hx + 3.4, hy - 1.2, 1.5); e(hx - 0.5, hy + 2.8, 2, 1, BL);
    e(hx + 3 + (run ? Math.sin(ph * 2) * 2 : 0), -3, 2.8, 1.8, '#EAB9B2'); e(-4 + (run ? Math.sin(ph * 2 + 3) * 2 : 0), -2, 3, 1.8, '#EAB9B2');
    g.restore();
  };
  D.bird = function (P) {
    var C = P.C, tw = P.tw, m = P.m, fl = m.fl || 0, hd = m.head || 0, yw = m.yawn || 0;
    g.strokeStyle = '#7C5A3C'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(-15, -9); g.lineTo(15, -9.4); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.moveTo(0, -9); g.lineTo(0, -1.5); g.stroke(); e(0, -1, 9, 1.8, '#5E4A3A');
    var R = 11.5 * (1 + 0.12 * fl);
    tri(-9, -17, -21, -8 + tw.tail * 2, -12, -12, C.dark); // tail feathers
    e(0, -9 - R, R, R * 1.04, C.main); rim(0, -9 - R, R, R * 1.04);
    e(2, -9 - R * 0.55, R * 0.7, R * 0.55, C.light);
    e(-2, -19, 8, 5.2, C.dark, 0.35 + fl * 0.2);
    if (fl > 0.05) { g.strokeStyle = hexA(C.light, 0.7); g.lineWidth = 1; for (var i = 0; i < 5; i++) { var a = -2.6 + i * 0.42; g.beginPath(); g.moveTo(Math.cos(a) * R * 0.95, -9 - R + Math.sin(a) * R); g.lineTo(Math.cos(a) * (R + 2.6 * fl), -9 - R + Math.sin(a) * (R + 2.6 * fl)); g.stroke(); } }
    var hy = -9 - R - 5.2 - hd * 5, hx = 5 + hd * 1.5;
    c(hx, hy, 5.8, C.main); rim(hx, hy, 5.8, 5.8);
    eye(hx + 2, hy - 0.4, 1.4); e(hx - 0.8, hy + 2, 1.5, 0.9, BL);
    tri(hx + 4.6, hy - 1.4 - yw * 1.2, hx + 9.4, hy + 0.8, hx + 4.6, hy + 1.4, '#E9A64A');
    if (yw > 0.1) tri(hx + 4.6, hy + 1.4, hx + 8.6, hy + 1.2 + yw * 2.6, hx + 4.2, hy + 3, '#D98A3A');
    g.strokeStyle = '#B58A58'; g.lineWidth = 1; g.beginPath(); g.moveTo(-2, -9.6); g.lineTo(-2, -8.6); g.moveTo(3, -9.6); g.lineTo(3, -8.6); g.stroke();
  };
  D.ferret = function (P) {
    var C = P.C, tw = P.tw, m = P.m, hx0 = m.hx || 0, hop = m.hop || 0, wh = m.whip || 0;
    g.save(); g.translate(hx0, -hop);
    g.strokeStyle = C.dark; g.lineWidth = 5.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-22, -7); g.bezierCurveTo(-31, -8, -34, -14 + wh * 3, -31, -19 + wh * 4); g.stroke();
    e(-3, -8, 22, 7.6, C.main); rim(-3, -8, 22, 7.6);
    e(-1, -3.6, 18, 3.4, C.light); e(-14, -3.5, 5, 2.6, C.dark); e(6, -2.8, 4.2, 2.3, C.dark);
    var hx = 17, hy = -8.4;
    c(hx, hy, 7.6, C.main); rim(hx, hy, 7.6, 7.6);
    e(hx + 6, hy + 1.8, 4.6, 3.8, C.light); e(hx + 9.8, hy + 0.7, 1.6, 1.2, PINK);
    e(hx + 1.5, hy - 1.4, 6, 2.8, hexA(C.dark, 0.85), 0.05); // the bandit mask
    g.strokeStyle = 'rgba(245,235,225,.85)'; g.lineWidth = 1; g.lineCap = 'round'; g.beginPath(); g.arc(hx + 3.6, hy - 2, 1.5, Math.PI * 0.16, Math.PI * 0.84); g.stroke();
    c(hx - 4.4, hy - 6.6 + tw.ear * 0.8, 2.4, C.main); c(hx - 4.4, hy - 6.4, 1.2, '#E6A6A8');
    e(hx + 1.6, hy + 3.6, 2, 1, BL);
    whiskers(hx + 9, hy + 2.4, 5.5, 1, tw.whisk);
    g.restore();
  };
  D.lizard = function (P) {
    var C = P.C, tw = P.tw, m = P.m, lift = m.lift || 0, tg = m.tongue || 0, lg = m.leg || 0;
    e(2, -1.2, 36, 4.2, '#5E4C5A'); e(2, -2.6, 33, 3.4, '#75606A'); // a warm basking stone
    g.strokeStyle = C.main; g.lineWidth = 5.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(-18, -7); g.bezierCurveTo(-30, -6, -38, -8, -36, -14 + tw.tail * 2); g.stroke();
    g.lineWidth = 2.6; g.beginPath(); g.moveTo(-36, -14 + tw.tail * 2); g.quadraticCurveTo(-34, -19, -30, -18); g.stroke();
    e(-2, -7, 20, 5.4, C.main); rim(-2, -7, 20, 5.4);
    e(0, -4.6, 17, 2.6, C.light);
    for (var i = 0; i < 7; i++) { var sx = -14 + i * 4.3; tri(sx - 1.4, -11.2, sx, -14.2, sx + 1.4, -11.2, C.dark); }
    e(-12, -2.8, 6, 2.4, C.dark); e(8 + lg * 4, -2.8, 5.6, 2.3, C.dark);
    var hx = 18, hy = -7 - lift * 2;
    e(hx, hy, 9, 5.4, C.main, -0.05 - lift * 0.1); rim(hx, hy, 9, 5.4);
    e(hx - 1, hy + 4, 5.8, 2.6, C.light);
    eye(hx + 2.6, hy - 1.6, 1.6); c(hx + 8, hy - 0.8, 0.6, '#3A2A2C');
    g.strokeStyle = 'rgba(60,35,35,.5)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(hx + 8, hy + 1.6); g.quadraticCurveTo(hx + 4, hy + 3.4, hx, hy + 2.4); g.stroke();
    if (tg > 0.05) { g.strokeStyle = '#E58A98'; g.lineWidth = 1; g.beginPath(); g.moveTo(hx + 8.6, hy + 1.2); g.lineTo(hx + 8.6 + tg * 6, hy + 1.2 - tg * 0.6); g.stroke(); }
  };
  D.horse = function (P) {
    var C = P.C, tw = P.tw, m = P.m, lift = m.lift || 0, nose = m.nose || 0, hoof = m.hoof || 0, ear = m.ear || 0;
    var MANE = hexA(C.dark, 0.95);
    g.strokeStyle = MANE; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(-28, -18); g.bezierCurveTo(-40, -15 + tw.tail * 2, -43, -8, -39, -2); g.stroke(); // tail
    e(-1, -15, 30, 14, C.main); rim(-1, -15, 30, 14);
    e(-6, -6, 22, 5, C.light);
    e(-15, -4, 13, 4.4, C.dark); e(-27, -3 - hoof * 3, 3.8, 2.6, '#3A3038');   // hind legs folded under
    e(12, -4, 13, 3.8, C.dark); e(27.5, -3.4 - hoof * 0.5, 3.6, 2.6, '#3A3038'); // front legs folded, one reaching forward
    var hl = lift * 5;
    g.strokeStyle = C.main; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(19, -22); g.quadraticCurveTo(28, -26, 32 + lift, -34 + hl * 0.4); g.stroke(); // neck, raised a little
    g.strokeStyle = MANE; g.lineWidth = 4; g.beginPath(); g.moveTo(18, -29); g.quadraticCurveTo(25, -35, 29 + lift, -40 + hl * 0.4); g.stroke();
    var hx = 38 + lift, hy = -33 + hl * 0.4;
    e(hx, hy, 12.5, 7, C.main, 0.8); rim(hx, hy, 12.5, 7, 0.8);
    e(hx + 7, hy + 6.6, 6, 5, C.light, 0.8); e(hx + 10, hy + 9.6 + nose * 0.5, 1.7 + nose * 0.6, 1.2, '#3A2A2C');
    g.save(); g.translate(hx - 7, hy - 6); g.rotate(-0.35 + ear * 0.35); tri(-2.8, 2.4, 0, -7.4, 2.8, 2.4, C.main); tri(-1.3, 1.6, 0, -4.6, 1.3, 1.6, '#E6A6A8'); g.restore();
    tri(hx - 3, hy - 5.6, hx + 3, hy - 4, hx + 1, hy + 2, MANE);   // a forelock
    eye(hx + 2.4, hy - 0.6, 1.9);
  };
  D.other = function (P) {
    var C = P.C, tw = P.tw, m = P.m, env = m.env || 0, rot = Math.sin((m.s || 0) * 5) * 0.1 * env;
    g.save(); g.translate(0, -10); g.rotate(rot); g.translate(0, 10);
    g.strokeStyle = C.dark; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-13, -6); g.quadraticCurveTo(-20, -8 + tw.tail * 3, -18, -15 + tw.tail * 3); g.stroke();
    e(0, -11.5, 15.5, 11.5, C.main); rim(0, -11.5, 15.5, 11.5);
    e(2, -6, 11, 6, C.light);
    c(-6.5, -22 + tw.ear, 4, C.main); c(6.5, -22.4, 4, C.main); c(-6.5, -22 + tw.ear, 2, '#E6A6A8'); c(6.5, -22.4, 2, '#E6A6A8');
    eye(-5, -13, 2); eye(5.4, -13, 2); e(0, -9.4, 1.6, 1.1, PINK); e(-9, -8.6, 2.6, 1.3, BL); e(9.6, -8.6, 2.6, 1.3, BL);
    g.fillStyle = 'rgba(255,240,200,.85)'; g.beginPath(); var sx = 0, sy = -3.5, r = 2.4; for (var i = 0; i < 8; i++) { var rr2 = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + i * Math.PI / 4; g.lineTo(sx + Math.cos(a) * rr2, sy + Math.sin(a) * rr2); } g.closePath(); g.fill();
    g.restore();
  };

  // ------------------------------------------------------------------ the quilt, the pillows, the names, the dreams
  var HEAD = { dog: [26, -22], cat: [20, -22], rabbit: [16, -22], guinea: [17, -18], hamster: [9, -20], bird: [6, -40], ferret: [17, -17], lizard: [20, -15], horse: [42, -17], other: [0, -28] };
  function slots(LW) {
    var tot = 0, ws = PETS.map(function (p) { var w = (kindOf(p).w + (kindOf(p).wheel || 0)) * sizeOf(p).k * kindOf(p).sc * PSC + 26; tot += w; return w; });
    var f = Math.min(1, (LW - 36) / Math.max(1, tot)), x = S.cx - tot * f / 2;
    return PETS.map(function (p, i) { var cx = x + ws[i] * f / 2; x += ws[i] * f; return { x: cx, w: ws[i] * f, f: f }; });
  }
  function quilt(sl) {
    var x0 = sl[0].x - sl[0].w / 2 - 12, x1 = sl[sl.length - 1].x + sl[sl.length - 1].w / 2 + 12, y = G + 28, h = 42;
    K.rr(g, x0, y, x1 - x0, h, 14, '#3A2D4C'); K.rr(g, x0 + 3, y + 3, x1 - x0 - 6, h - 6, 11, '#47395B');
    g.fillStyle = 'rgba(255,225,200,.06)'; var n = Math.max(2, Math.round((x1 - x0) / 34)), cw = (x1 - x0 - 6) / n;
    for (var i = 0; i < n; i++) for (var j = 0; j < 2; j++) if ((i + j) % 2 === 0) g.fillRect(x0 + 3 + i * cw, y + 3 + j * (h - 6) / 2, cw, (h - 6) / 2);
    g.strokeStyle = 'rgba(255,225,200,.14)'; g.lineWidth = 0.8; g.setLineDash([2.5, 2.5]); g.beginPath(); g.roundRect ? g.roundRect(x0 + 6, y + 6, x1 - x0 - 12, h - 12, 8) : g.rect(x0 + 6, y + 6, x1 - x0 - 12, h - 12); g.stroke(); g.setLineDash([]);
  }
  function fit(txt, maxW) { if (g.measureText(txt).width <= maxW) return txt; while (txt.length > 2 && g.measureText(txt + '…').width > maxW) txt = txt.slice(0, -1); return txt + '…'; }
  function dreamIcon(kind, x, y, T) {
    g.save(); g.translate(x, y);
    switch (kind) {
      case 'dog': g.rotate(-0.3); K.rr(g, -4.5, -1.2, 9, 2.4, 1.2, '#F3E7CF'); c(-4.5, -1.4, 1.6, '#F3E7CF'); c(-4.5, 1.4, 1.6, '#F3E7CF'); c(4.5, -1.4, 1.6, '#F3E7CF'); c(4.5, 1.4, 1.6, '#F3E7CF'); break;
      case 'cat': e(-1, 0, 4.4, 2.6, '#8FB4D8'); tri(2.5, 0, 6, -2.6, 6, 2.6, '#8FB4D8'); c(-3.2, -0.4, 0.6, '#1B2030'); break;
      case 'rabbit': tri(-4, -2, 4.5, 0, -4, 2, '#E58A3C'); e(-5, 0, 1.6, 2.4, '#7FB070', 0.2); break;
      case 'guinea': e(0, 0, 5, 2.8, '#7FB070', 0.4); line(-3, 2, 4, -2, '#5C8A52', 0.7); break;
      case 'hamster': e(-1.5, 0, 1.7, 2.7, '#C9A06A', 0.5); e(2, 1, 1.7, 2.7, '#C9A06A', -0.5); break;
      case 'bird': e(-1, 0, 2.2, 3, '#C9A06A', 0.6); e(2.4, 0.4, 2.2, 3, '#C9A06A', -0.5); break;
      case 'ferret': K.rr(g, -3, -3.4, 6, 6.4, 1.6, '#C47E8E'); K.rr(g, -3, -3.4, 6, 2, 1, '#EBD7DE'); break;
      case 'lizard': e(0, 0, 3.4, 1.9, '#8A6A3E'); line(-3, 0, -6, -2, '#8A6A3E', 0.7); line(3, 0, 6, -2, '#8A6A3E', 0.7); break;
      case 'horse': c(0, 0.6, 3.6, '#D9657A'); line(0, -2.8, 1.2, -5, '#5C8A52', 0.9); break;
      default: g.fillStyle = '#F6E7B0'; g.beginPath(); for (var i = 0; i < 8; i++) { var rr2 = i % 2 ? 1.8 : 4.4, a = -Math.PI / 2 + i * Math.PI / 4; g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } g.closePath(); g.fill();
    }
    g.restore();
  }
  function drawOne(p, sl, idx, T, dt) {
    var R = rt(p), kd = kindOf(p), C = colorOf(p), sc = PSC * kd.sc * sizeOf(p).k * sl.f, br = breathAt(R, T);
    var calm = S.calm, amp = (calm ? 0.022 : 0.042) * (p.memory ? 0.7 : 1);
    var y = G + 51 + (idx % 2 ? 2 : -1), x = sl.x;
    R.x = x;
    var face = (idx % 2) ? -1 : 1;
    // the pillow with the name on it
    var pw = Math.max(50, (kd.w * kd.sc * sizeOf(p).k * PSC) * sl.f + 14), pc = PILLOWS[idx % PILLOWS.length];
    g.save(); g.translate(x, y);
    e(0, 14, pw * 0.5 + 3, 3.4, 'rgba(0,0,0,.28)');
    K.rr(g, -pw / 2, -3, pw, 17, 8, pc); K.rr(g, -pw / 2 + 2, -2, pw - 4, 5, 3, 'rgba(255,240,230,.12)');
    // the pet
    var tw = { ear: twv(R, 'ear', T, 18, 0.32), whisk: twv(R, 'whisk', T, 9, 0.5), tail: twv(R, 'tail', T, 14, 1.1), paw: twv(R, 'paw', T, 30, 0.7) };
    if (calm || p.memory) { tw.ear *= 0.5; tw.whisk *= 0.5; tw.tail *= 0.5; tw.paw *= 0.5; }
    var m = momentOf(p, R, T), P = { C: C, tw: tw, m: m, br: br };
    g.save(); g.translate(0, -2 - (m.hop || 0)); g.scale(sc * face, sc * (1 + amp * br));
    if (kd.id === 'hamster') g.translate(-17, 0); // the wheel makes it wide: center the pair
    (D[kd.id] || D.other)(P);
    g.restore();
    // the name on the pillow
    g.font = '600 9.5px Lora, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,243,230,.92)';
    g.fillText(fit(p.name, pw - 12), 0, 7);
    // kept close: a soft halo and one little star
    if (p.memory) {
      var hh = HEAD[kd.id], hxx = hh[0] * sc * face * 0.6, hyy = -(Math.abs(hh[1]) * sc) - 12;
      K.glow(g, hxx, hyy + 4, 26, '255,226,160', 0.1 + 0.03 * Math.sin(T * 0.6));
      g.strokeStyle = 'rgba(255,230,165,.62)'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(hxx, hyy, 9, 2.6, 0, 0, TAU); g.stroke();
      var tw2 = calm ? 0.8 : 0.7 + 0.3 * Math.sin(T * 0.9 + idx);
      g.fillStyle = 'rgba(255,238,180,' + tw2.toFixed(2) + ')'; g.beginPath(); var sx = hxx + 15, sy = hyy - 9;
      for (var i = 0; i < 8; i++) { var r2 = i % 2 ? 1.6 : 4.2, a2 = -Math.PI / 2 + i * Math.PI / 4; g.lineTo(sx + Math.cos(a2) * r2, sy + Math.sin(a2) * r2); } g.closePath(); g.fill();
    }
    g.restore();
    // z's (a few, at the start of each breath out), in the pet's own color
    var h = HEAD[kd.id] || HEAD.other, hx2 = x + h[0] * sc * face * 0.85, hy2 = y - 2 + h[1] * sc;
    R.breaths.forEach(function (b) {
      var out = b.t + b.dur * 0.42; if (b.z || T < out) return; b.z = 1;
      if (T - out > 1.5) return; R.zn++;
      if (R.zn % (kd.per < 2 ? 4 : 2) !== 0) return;
      R.zs.push({ x: hx2, y: hy2, t0: T, size: 6.5 + sc * 2.5, dir: face });
    });
    var life = calm ? 6 : 4.4;
    R.zs = R.zs.filter(function (z) { return T - z.t0 < life; });
    g.textAlign = 'center'; g.textBaseline = 'middle';
    R.zs.forEach(function (z, i) {
      var u = (T - z.t0) / life; if (u < 0) return; var a = Math.sin(Math.PI * clamp(u, 0, 1)) * 0.8;
      g.font = 'italic 600 ' + (z.size * (0.75 + u * 0.55)).toFixed(1) + 'px Fraunces, Georgia, serif';
      g.fillStyle = hexA(C.light, a.toFixed(3)); g.fillText('z', z.x + z.dir * (u * 14 + Math.sin(u * 5) * 2), z.y - u * (calm ? 22 : 30));
    });
    // a tiny dream bubble, with what this animal dreams about
    if (R.dream) {
      var du = (T - R.dream.t0) / R.dream.dur, da = Math.sin(Math.PI * clamp(du, 0, 1)) * 0.9, bx = hx2 + face * 14, by = hy2 - 22 - du * 6;
      g.globalAlpha = da; c(hx2 + face * 4, hy2 - 6, 1.6, '#E9E2FB'); c(hx2 + face * 8, hy2 - 12, 2.4, '#E9E2FB');
      e(bx, by, 13, 9, '#E9E2FB'); c(bx - 7, by - 2, 5, '#E9E2FB'); c(bx + 6, by - 3, 5.4, '#E9E2FB');
      dreamIcon(kd.id, bx, by - 0.5 + Math.sin(T * (calm ? 1 : 1.8)) * 0.8, T); g.globalAlpha = 1;
    }
  }
  var lastN = 0;
  function drawBack(gg, T) {
    if (!PETS.length) return; g = gg; var sl = slots(S.LW); quilt(sl);
  }
  function draw(gg, T) {
    if (!PETS.length) return; g = gg; var sl = slots(S.LW);
    PETS.forEach(function (p, i) { drawOne(p, sl[i], i, T, 0); });
    if (lastN !== PETS.length) { lastN = PETS.length; }
  }
  // a still picture for the panels: the animal alone, centered, on its pillow
  function drawPreview(cv, spec, opts) {
    var ctx = cv.getContext('2d'); if (!ctx) return; opts = opts || {};
    var W = cv.clientWidth || cv.width, H = cv.clientHeight || cv.height, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    var p = normalize(spec), kd = kindOf(p), sc = Math.min((W - 8) / ((kd.w + (kd.wheel || 0)) * 1.1), (H - 14) / 40) * sizeOf(p).k * 0.9 * (opts.zoom || 1);
    sc = Math.min(sc, Math.min((W - 8) / ((kd.w + (kd.wheel || 0)) * 1.1), (H - 14) / 44) * 1.0 * (opts.zoom || 1));
    g = ctx; ctx.save(); ctx.translate(W / 2, H - 15);
    e(0, 6, kd.w * sc * 0.5 + 4, 3, 'rgba(0,0,0,.25)');
    K.rr(g, -(kd.w * sc * 0.5 + 6), -2, kd.w * sc + 12, 10, 5, PILLOWS[0]);
    ctx.translate(0, -1); ctx.scale(sc * kd.sc, sc * kd.sc);
    if (kd.id === 'hamster') ctx.translate(-15, 0);
    (D[kd.id] || D.other)({ C: colorOf(p), tw: { ear: 0, whisk: 0, tail: 0, paw: 0 }, m: kd.id === 'hamster' ? { to: 0, run: 0, ph: 0 } : {}, br: 0 });
    ctx.restore();
    if (p.memory) { ctx.strokeStyle = 'rgba(255,230,165,.7)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(W / 2, 7, 9, 2.6, 0, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(255,238,180,.9)'; ctx.beginPath(); for (var i = 0; i < 8; i++) { var r2 = i % 2 ? 1.5 : 3.8, a2 = -Math.PI / 2 + i * Math.PI / 4; ctx.lineTo(W / 2 + 18 + Math.cos(a2) * r2, 9 + Math.sin(a2) * r2); } ctx.closePath(); ctx.fill(); }
  }

  load();
  var HKS = window.TOLSleepCam.hook;
  HKS('start', function () { RT = {}; curPet = null; }); HKS('plan', plan); HKS('update', tickMoments); HKS('drawBack', drawBack); HKS('draw', draw);
  window.TOLSleepPets = {
    max: MAX, kinds: KINDS, colors: COLORS, sizes: SIZES, list: list, add: add, update: update, remove: remove, restore: restore, clear: clear, describe: describe,
    drawPreview: drawPreview, onChange: function (f) { listeners.push(f); }, reload: function () { load(); RT = {}; changed('reload'); },
    _breaths: function (id) { var R = RT[id]; return R ? R.breaths : []; }, _runtime: function (id) { return RT[id]; },
    _moment: function (id, T) { var p = byId(id); if (!p) return false; var R = rt(p); if (R.ev) return false; startMoment(p, T == null ? S.T : T); return true; },
    kindOf: kindOf, sizeOf: sizeOf, colorOf: colorOf, hash: hashOf
  };
})();
