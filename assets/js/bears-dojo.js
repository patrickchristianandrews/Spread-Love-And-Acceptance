/* bears-dojo.js — The Bears Dojo (core): helpers, soft sound, "your bear" (builder + SVG), the room inside,
   and the shuffle bag that brings one calm offering at a time. The garden and the pups are in bears-dojo-scene.js,
   the offerings in bears-dojo-offerings*.js. Everything happens in the browser; the only thing ever stored is on
   this device (the bear you build, and anything you choose to keep). Nothing is sent anywhere. */
(function () {
  'use strict';
  var BD = window.BearsDojo = window.BearsDojo || {};
  var doc = document, root = doc.documentElement;

  // ---------- small helpers ----------
  function $(s, r) { return (r || doc).querySelector(s); }
  function el(tag, attrs, html) {
    var n = doc.createElement(tag);
    if (attrs) for (var k in attrs) { if (k === 'class') n.className = attrs[k]; else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k]); }
    if (html != null) n.innerHTML = html;
    return n;
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function rand(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rand(a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rand(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  var reducedMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function still() { return root.classList.contains('tol-still') || !!reducedMQ.matches; }
  var stillFns = [];
  function onStill(fn) { stillFns.push(fn); return function () { var i = stillFns.indexOf(fn); if (i > -1) stillFns.splice(i, 1); }; }
  function fireStill() { var s = still(); syncStillBtn(); stillFns.slice().forEach(function (f) { try { f(s); } catch (e) {} }); }
  doc.addEventListener('tol-still', fireStill);
  try { reducedMQ.addEventListener('change', fireStill); } catch (e) { try { reducedMQ.addListener(fireStill); } catch (e2) {} }
  BD.util = { $: $, el: el, lsGet: lsGet, lsSet: lsSet, lsDel: lsDel, rand: rand, pick: pick, shuffle: shuffle, esc: esc, clamp: clamp, still: still, onStill: onStill };

  // pointer dragging that also stays out of the way of keyboards: cb.start(ev), cb.move(dx, dy, ev), cb.end(ev, moved)
  BD.drag = function (node, cb) {
    var sx = 0, sy = 0, on = false, moved = false, id = null;
    function down(e) {
      if (e.button != null && e.button > 0) return;
      on = true; moved = false; sx = e.clientX; sy = e.clientY; id = e.pointerId;
      try { node.setPointerCapture(id); } catch (x) {}
      if (cb.start) cb.start(e);
    }
    function move(e) {
      if (!on) return; var dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 5) return; moved = true;
      if (cb.move) cb.move(dx, dy, e); e.preventDefault();
    }
    function up(e) { if (!on) return; on = false; try { node.releasePointerCapture(id); } catch (x) {} if (cb.end) cb.end(e, moved); }
    node.addEventListener('pointerdown', down); node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', up); node.addEventListener('pointercancel', up);
    return function () { node.removeEventListener('pointerdown', down); node.removeEventListener('pointermove', move); node.removeEventListener('pointerup', up); node.removeEventListener('pointercancel', up); };
  };

  // ---------- soft sound: WebAudio tones only, never until the visitor turns it on ----------
  var A = BD.audio = { on: false, ctx: null, master: null, amb: null, mode: 'outside' };
  function hz(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  A.scale = [60, 62, 64, 67, 69, 72, 74, 76, 79]; // a pentatonic: any two notes sit well together
  A.note = function (i) { return hz(A.scale[i % A.scale.length]); };
  function ensure() {
    if (A.ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    try {
      A.ctx = new AC(); var comp = A.ctx.createDynamicsCompressor(); comp.threshold.value = -24; comp.ratio.value = 3;
      A.master = A.ctx.createGain(); A.master.gain.value = 0; A.master.connect(comp); comp.connect(A.ctx.destination);
      // a little air around every tone
      var len = Math.floor(A.ctx.sampleRate * 3), ir = A.ctx.createBuffer(2, len, A.ctx.sampleRate);
      for (var c = 0; c < 2; c++) { var d = ir.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
      A.verb = A.ctx.createConvolver(); A.verb.buffer = ir; var wet = A.ctx.createGain(); wet.gain.value = 0.35; A.verb.connect(wet); wet.connect(A.master);
      buildAmbient();
      return true;
    } catch (e) { A.ctx = null; return false; }
  }
  function buildAmbient() {
    var c = A.ctx, t = c.currentTime;
    // water: soft filtered noise (outside)
    var nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), nd = nb.getChannelData(0), last = 0;
    for (var i = 0; i < nd.length; i++) { last = last * 0.96 + (Math.random() * 2 - 1) * 0.04; nd[i] = last * 6; }
    var ns = c.createBufferSource(); ns.buffer = nb; ns.loop = true;
    var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.5;
    var lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 220; lfo.connect(lg); lg.connect(bp.frequency);
    var water = c.createGain(); water.gain.value = 0; ns.connect(bp); bp.connect(water); water.connect(A.master);
    // the room: a low, warm hum (two soft sines a fifth apart)
    var room = c.createGain(); room.gain.value = 0;
    [110, 165.4, 220.6].forEach(function (f, i) { var o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.value = [0.5, 0.3, 0.12][i]; o.connect(g); g.connect(room); o.start(t); });
    room.connect(A.master);
    ns.start(t); lfo.start(t);
    A.amb = { water: water, room: room };
  }
  function ambient() {
    if (!A.amb || !A.on) return; var t = A.ctx.currentTime;
    A.amb.water.gain.setTargetAtTime(A.mode === 'outside' ? 0.03 : 0.004, t, 1.2);
    A.amb.room.gain.setTargetAtTime(A.mode === 'inside' ? 0.028 : 0, t, 1.5);
  }
  A.setMode = function (m) { A.mode = m; ambient(); };
  A.toggle = function (force) {
    var want = force == null ? !A.on : !!force;
    if (want) {
      if (!ensure()) { A.on = false; syncSound(); return false; }
      try { A.ctx.resume(); } catch (e) {}
      A.on = true; A.master.gain.setTargetAtTime(0.9, A.ctx.currentTime, 0.4); ambient();
      A.pluck(A.note(4), 0.5); // one soft note so you know it is on
    } else {
      A.on = false;
      if (A.ctx) { A.master.gain.setTargetAtTime(0, A.ctx.currentTime, 0.15); setTimeout(function () { if (!A.on && A.ctx) try { A.ctx.suspend(); } catch (e) {} }, 700); }
    }
    syncSound(); return A.on;
  };
  function partial(f, vol, dec, type, when, out) {
    var c = A.ctx, t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    o.connect(g); g.connect(out || A.master); if (A.verb) g.connect(A.verb); o.start(t); o.stop(t + dec + 0.1);
  }
  // each returns true when it actually sounded (so a page can offer "turn sound on to hear this")
  A.bowl = function (f, vol) { if (!A.on || !A.ctx) return false; vol = (vol || 0.22); [[1, 1, 7], [2.74, 0.42, 4.2], [5.3, 0.16, 2.2], [1.004, 0.7, 7.5]].forEach(function (p) { partial(f * p[0], vol * p[1], p[2], 'sine'); }); return true; };
  A.chime = function (f, vol) { if (!A.on || !A.ctx) return false; vol = vol || 0.16; partial(f, vol, 3.2); partial(f * 2.01, vol * 0.35, 2); partial(f * 3.02, vol * 0.12, 1.2); return true; };
  A.pluck = function (f, vol) { if (!A.on || !A.ctx) return false; vol = vol || 0.2; partial(f, vol, 1.6, 'triangle'); partial(f * 2, vol * 0.18, 0.7); return true; };
  A.plop = function () {
    if (!A.on || !A.ctx) return false; var c = A.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(620, t); o.frequency.exponentialRampToValueAtTime(190, t + 0.14); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(A.master); o.start(t); o.stop(t + 0.3); return true;
  };
  A.tone = function (f, dur, vol) { if (!A.on || !A.ctx) return false; partial(f, vol || 0.07, dur || 1.5); return true; };
  doc.addEventListener('visibilitychange', function () { if (!A.ctx) return; try { if (doc.hidden) A.ctx.suspend(); else if (A.on) A.ctx.resume(); } catch (e) {} });
  function syncSound() { var b = $('#bd-sound'); if (!b) return; b.setAttribute('aria-pressed', String(A.on)); $('b', b).textContent = A.on ? 'on' : 'off'; b.setAttribute('aria-label', 'Sound: ' + (A.on ? 'on. Press to turn off.' : 'off. Press to turn on.')); }
  function syncStillBtn() { var b = $('#bd-still'); if (!b) return; var s = still(); b.setAttribute('aria-pressed', String(s)); $('b', b).textContent = s ? 'on' : 'off'; }

  // ---------- your bear ----------
  var FUR = [['Chestnut', '#7A4E2D'], ['Honey brown', '#9A6A3F'], ['Caramel', '#C58F57'], ['Sand', '#E0B27A'], ['Cream', '#F0D3A6'], ['Cocoa', '#5A3A26'], ['Espresso', '#3E2A21'], ['Charcoal', '#2F2B2B'], ['Stone gray', '#6F6A66'], ['Silver', '#A8A29E'],
    ['Snow', '#F4EFE6'], ['Peach', '#D8A47F'], ['Cinnamon', '#B86B4B'], ['Clay', '#8C5A44'], ['Lavender', '#CFC1EC'], ['Mint', '#BFE3CF'], ['Rose', '#F4B9C8'], ['Sky', '#BBD8F1'], ['Butter', '#F2D77E'], ['Sage', '#9FC5A8']];
  var ROBE = [['Indigo', '#3F4B8C'], ['Plum', '#7B4A7D'], ['Persimmon', '#D2623F'], ['Saffron', '#E0A030'], ['Moss', '#6C8F5A'], ['Teal', '#3F8A86'], ['Sky blue', '#7FB0D8'], ['Rose', '#E58FA3'], ['Charcoal', '#44464E'], ['Cream', '#F1E6CC'], ['Terracotta', '#B5654A'], ['Sage', '#9DB89A'], ['Lavender', '#B7A3DE'], ['Sand', '#D4B98C']];
  var OPTS = {
    ears: [['round', 'Round'], ['small', 'Small'], ['big', 'Big'], ['floppy', 'Floppy']],
    shape: [['soft', 'Soft'], ['round', 'Round'], ['tall', 'Tall']],
    style: [['wrap', 'Wrap robe'], ['long', 'Long robe'], ['vest', 'Vest'], ['poncho', 'Poncho']],
    acc: [['none', 'None'], ['scarf', 'Scarf'], ['hat', 'Straw hat'], ['glasses', 'Glasses'], ['flower', 'Flower'], ['headband', 'Headband'], ['bell', 'Little bell']],
    face: [['calm', 'Calm'], ['smile', 'Gentle smile'], ['sleepy', 'Sleepy'], ['curious', 'Curious'], ['joy', 'Joyful']]
  };
  var DEFAULT_BEAR = { fur: '#9A6A3F', ears: 'round', shape: 'soft', robe: '#3F4B8C', style: 'wrap', acc: 'none', face: 'calm', name: '' };
  var BEAR_KEY = 'bears-dojo-bear';
  function hex(h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function toHex(r) { return '#' + r.map(function (v) { v = clamp(Math.round(v), 0, 255); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function mix(a, b, t) { var x = hex(a), y = hex(b); return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]); }
  function darker(c, t) { return mix(c, '#000000', t); }
  function lighter(c, t) { return mix(c, '#ffffff', t); }
  function lum(c) { var x = hex(c); return (0.299 * x[0] + 0.587 * x[1] + 0.114 * x[2]) / 255; }
  function validBear(o) {
    var b = {}; for (var k in DEFAULT_BEAR) b[k] = DEFAULT_BEAR[k];
    if (!o || typeof o !== 'object') return b;
    if (/^#[0-9a-f]{6}$/i.test(o.fur || '')) b.fur = o.fur; if (/^#[0-9a-f]{6}$/i.test(o.robe || '')) b.robe = o.robe;
    ['ears', 'shape', 'style', 'acc', 'face'].forEach(function (k) { if (OPTS[k].some(function (p) { return p[0] === o[k]; })) b[k] = o[k]; });
    if (typeof o.name === 'string') b.name = o.name.replace(/[<>]/g, '').slice(0, 20);
    return b;
  }
  var bear = (function () { try { return validBear(JSON.parse(lsGet(BEAR_KEY))); } catch (e) { return validBear(null); } })();
  var hadBear = !!lsGet(BEAR_KEY);
  BD.bear = function () { return bear; };
  BD.hasBear = function () { return hadBear; };
  BD.bearName = function () { return bear.name || ''; };

  // The bear is drawn on a 120 x 150 sheet: head near the top, feet at the bottom. pose: 'stand' or 'sit'.
  BD.bearSVG = function (b, pose, cls) {
    b = b || bear; var sit = pose === 'sit';
    var fur = b.fur, fd = darker(fur, 0.18), fl = lum(fur) < 0.3 ? lighter(fur, 0.35) : lighter(fur, 0.55), inner = mix(fur, '#E9A0A8', 0.5);
    var robe = b.robe, rd = darker(robe, 0.22), rl = lighter(robe, 0.38), sash = lum(robe) > 0.55 ? darker(robe, 0.45) : lighter(robe, 0.6);
    var ac = (function () { var x = hex(robe); return (x[0] > 170 && x[1] < 130) ? '#3E8E8A' : '#C9553F'; })();
    var ink = '#3B2A26', sx = b.shape === 'round' ? 1.17 : b.shape === 'tall' ? 0.92 : 1, sy = b.shape === 'tall' ? 1.06 : 1;
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150" class="' + (cls || '') + '" focusable="false">';
    // ears
    var ears = '';
    if (b.ears === 'round') ears = '<circle cx="38" cy="26" r="11" fill="' + fur + '"/><circle cx="38" cy="27" r="6" fill="' + inner + '"/><circle cx="82" cy="26" r="11" fill="' + fur + '"/><circle cx="82" cy="27" r="6" fill="' + inner + '"/>';
    else if (b.ears === 'small') ears = '<circle cx="39" cy="28" r="8" fill="' + fur + '"/><circle cx="39" cy="29" r="4.4" fill="' + inner + '"/><circle cx="81" cy="28" r="8" fill="' + fur + '"/><circle cx="81" cy="29" r="4.4" fill="' + inner + '"/>';
    else if (b.ears === 'big') ears = '<circle cx="36" cy="24" r="15" fill="' + fur + '"/><circle cx="36" cy="25" r="9" fill="' + inner + '"/><circle cx="84" cy="24" r="15" fill="' + fur + '"/><circle cx="84" cy="25" r="9" fill="' + inner + '"/>';
    else ears = '<ellipse cx="33" cy="40" rx="9" ry="17" fill="' + fd + '" transform="rotate(28 33 40)"/><ellipse cx="87" cy="40" rx="9" ry="17" fill="' + fd + '" transform="rotate(-28 87 40)"/>';
    s += ears;
    // body
    var body = '';
    var tx = 'translate(60 138) scale(' + sx + ' ' + sy + ') translate(-60 -138)';
    if (sit) body += '<ellipse cx="60" cy="130" rx="44" ry="11" fill="' + rd + '"/>';
    else body += '<ellipse cx="46" cy="141" rx="10" ry="5" fill="' + fd + '"/><ellipse cx="74" cy="141" rx="10" ry="5" fill="' + fd + '"/>';
    var st = b.style;
    if (st === 'vest') {
      var tee = lighter(robe, 0.7);
      body += '<path d="M38 72 Q60 66 82 72 L88 126 Q60 131 32 126Z" fill="' + tee + '"/>';
      if (!sit) body += '<path d="M34 120 L86 120 L88 136 L66 136 L60 128 L54 136 L32 136Z" fill="' + rd + '"/>';
      body += '<path d="M38 72 L53 70 L51 128 L32 126Z" fill="' + robe + '"/><path d="M82 72 L67 70 L69 128 L88 126Z" fill="' + robe + '"/><path d="M53 70 L51 128 M67 70 L69 128" stroke="' + rd + '" stroke-width="1.5" fill="none"/>';
    } else if (st === 'poncho') {
      body += '<path d="M60 64 Q34 70 22 128 Q60 140 98 128 Q86 70 60 64Z" fill="' + robe + '"/><path d="M24 118 Q60 130 96 118" stroke="' + rl + '" stroke-width="4" fill="none"/><path d="M25 124 Q60 136 95 124" stroke="' + sash + '" stroke-width="2" fill="none" opacity=".8"/><ellipse cx="60" cy="68" rx="12" ry="5" fill="' + fur + '"/>';
    } else {
      var hem = st === 'long' ? 'M36 72 Q60 64 84 72 L98 141 Q60 148 22 141Z' : 'M36 72 Q60 64 84 72 L92 130 Q60 138 28 130Z';
      body += '<path d="' + hem + '" fill="' + robe + '"/><path d="' + (st === 'long' ? 'M23 136 Q60 143 97 136' : 'M29 126 Q60 134 91 126') + '" stroke="' + rd + '" stroke-width="2" fill="none" opacity=".5"/>';
      body += '<path d="M50 66 L60 92 L70 66Z" fill="' + fur + '"/><path d="M47 67 L66 103 M73 67 L60 91" stroke="' + rl + '" stroke-width="4.5" stroke-linecap="round" fill="none"/>';
      body += '<rect x="33" y="104" width="54" height="10" rx="3" fill="' + sash + '"/><rect x="57" y="104" width="12" height="19" rx="3" fill="' + sash + '"/><path d="M57 114 h12" stroke="' + rd + '" stroke-width="1.2" opacity=".5"/>';
    }
    s += '<g class="bd-breathe" transform="' + tx + '">' + body;
    // arms
    var wide = st === 'wrap' || st === 'long';
    if (sit) {
      if (wide) s += '<path d="M36 74 Q16 90 34 106 L52 110 L46 90Z" fill="' + robe + '"/><path d="M84 74 Q104 90 86 106 L68 110 L74 90Z" fill="' + robe + '"/><path d="M34 106 L52 110 M86 106 L68 110" stroke="' + rd + '" stroke-width="2.4" stroke-linecap="round"/>';
      else s += '<path d="M38 76 Q24 92 40 106 L50 102 L46 88Z" fill="' + fur + '"/><path d="M82 76 Q96 92 80 106 L70 102 L74 88Z" fill="' + fur + '"/>';
      s += '<ellipse cx="53" cy="109" rx="7" ry="5.5" fill="' + fur + '"/><ellipse cx="67" cy="109" rx="7" ry="5.5" fill="' + fur + '"/>';
    } else if (st === 'poncho') {
      s += '<ellipse cx="33" cy="125" rx="6" ry="5" fill="' + fur + '"/><ellipse cx="87" cy="125" rx="6" ry="5" fill="' + fur + '"/>';
    } else if (wide) {
      s += '<path d="M36 74 Q15 82 17 114 Q26 120 35 114 L41 84Z" fill="' + robe + '"/><path d="M84 74 Q105 82 103 114 Q94 120 85 114 L79 84Z" fill="' + robe + '"/><path d="M18 111 Q26 117 34 111 M102 111 Q94 117 86 111" stroke="' + rd + '" stroke-width="2" fill="none" opacity=".6"/><ellipse cx="26" cy="116" rx="5.5" ry="5" fill="' + fur + '"/><ellipse cx="94" cy="116" rx="5.5" ry="5" fill="' + fur + '"/>';
    } else {
      s += '<path d="M36 74 Q20 84 22 112 Q27 118 33 112 L40 84Z" fill="' + fur + '"/><path d="M84 74 Q100 84 98 112 Q93 118 87 112 L80 84Z" fill="' + fur + '"/><path d="M36 74 Q27 76 24 90 L38 92Z" fill="' + lighter(robe, 0.7) + '"/><path d="M84 74 Q93 76 96 90 L82 92Z" fill="' + lighter(robe, 0.7) + '"/>';
    }
    s += '</g>';
    // neck things sit on the body, under the chin
    if (b.acc === 'scarf') s += '<path d="M34 70 Q60 84 86 70 L88 80 Q60 94 32 80Z" fill="' + ac + '"/><path d="M76 82 L84 108 L94 104 L88 80Z" fill="' + ac + '"/><path d="M80 98 L90 95 M82 104 L92 101" stroke="' + lighter(ac, 0.5) + '" stroke-width="1.5"/>';
    if (b.acc === 'bell') s += '<path d="M44 68 Q60 80 76 68" stroke="' + ac + '" stroke-width="3" fill="none"/><circle cx="60" cy="78" r="5" fill="#E9C46A"/><path d="M55 79 h10" stroke="#B88A2A" stroke-width="1"/><circle cx="60" cy="81" r="1.2" fill="#8A6414"/>';
    // head
    s += '<ellipse cx="60" cy="47" rx="27" ry="24" fill="' + fur + '"/><ellipse cx="60" cy="57" rx="14" ry="10.5" fill="' + fl + '"/>';
    s += '<ellipse cx="42" cy="55" rx="5" ry="3.4" fill="#F28DA0" opacity=".32"/><ellipse cx="78" cy="55" rx="5" ry="3.4" fill="#F28DA0" opacity=".32"/>';
    s += '<ellipse cx="60" cy="51.5" rx="4.8" ry="3.3" fill="' + ink + '"/><ellipse cx="58.6" cy="50.6" rx="1.3" ry=".8" fill="#fff" opacity=".6"/>';
    var f = b.face, fc = 'stroke="' + ink + '" stroke-width="2.3" stroke-linecap="round" fill="none"';
    if (f === 'calm') s += '<path d="M44 44 q5 4 10 0 M66 44 q5 4 10 0" ' + fc + '/><path d="M54 59 q6 4 12 0" ' + fc + '/><path d="M60 54.6 v3" ' + fc + '/>';
    else if (f === 'smile') s += '<circle cx="48" cy="44" r="3" fill="' + ink + '"/><circle cx="72" cy="44" r="3" fill="' + ink + '"/><circle cx="49" cy="43" r="1" fill="#fff"/><circle cx="73" cy="43" r="1" fill="#fff"/><path d="M60 54.6 v2.6 M52 58 q8 7 16 0" ' + fc + '/>';
    else if (f === 'sleepy') s += '<path d="M43.5 45 q5 2.4 11 0 M65.5 45 q5 2.4 11 0" ' + fc + '/><path d="M44 41 l-2 -1.5 M76 41 l2 -1.5" stroke="' + ink + '" stroke-width="1.4" stroke-linecap="round"/><path d="M60 54.6 v2.6 M55 59 q5 2.2 10 0" ' + fc + '/>';
    else if (f === 'curious') s += '<circle cx="48" cy="45" r="3" fill="' + ink + '"/><circle cx="72" cy="45" r="3" fill="' + ink + '"/><circle cx="49" cy="44" r="1" fill="#fff"/><circle cx="73" cy="44" r="1" fill="#fff"/><path d="M43 37 q5 -4 11 -1.5 M66 38.5 q5 -1.5 11 0.5" ' + fc + '/><path d="M60 54.6 v2.6 M54 59.5 q5 3 11 -1" ' + fc + '/>';
    else s += '<path d="M43.5 46.5 q5 -7 11 0 M65.5 46.5 q5 -7 11 0" ' + fc + '/><path d="M60 54.6 v2.2 M51 57.5 q9 9 18 0 z" stroke="' + ink + '" stroke-width="2" stroke-linejoin="round" fill="#8A3F45"/>';
    // things worn on the head
    if (b.acc === 'headband') s += '<path d="M33 36 Q60 20 87 36" stroke="' + ac + '" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M33 36 Q60 20 87 36" stroke="' + lighter(ac, 0.5) + '" stroke-width="1.2" fill="none" stroke-dasharray="3 4"/>';
    if (b.acc === 'flower') s += '<g transform="translate(40 22)"><g fill="#F6B8C8"><circle cx="0" cy="-6" r="5"/><circle cx="5.7" cy="-1.8" r="5"/><circle cx="3.5" cy="4.8" r="5"/><circle cx="-3.5" cy="4.8" r="5"/><circle cx="-5.7" cy="-1.8" r="5"/></g><circle r="3.6" fill="#F4D35E"/></g>';
    if (b.acc === 'glasses') s += '<g fill="rgba(255,255,255,.22)" stroke="' + ink + '" stroke-width="2"><circle cx="48" cy="44" r="9.5"/><circle cx="72" cy="44" r="9.5"/></g><path d="M57.5 44 q2.5 -2.2 5 0 M38.5 43 l-5 -2 M81.5 43 l5 -2" stroke="' + ink + '" stroke-width="2" fill="none" stroke-linecap="round"/>';
    if (b.acc === 'hat') s += '<ellipse cx="60" cy="27" rx="38" ry="7" fill="#C9A15A"/><path d="M28 27 Q60 -8 92 27 Q60 22 28 27Z" fill="#E0BC72"/><path d="M40 14 L36 26 M52 8 L50 24 M68 8 L70 24 M80 14 L84 26" stroke="#B88F46" stroke-width="1.2" fill="none"/><path d="M33 29 Q60 36 87 29" stroke="' + ac + '" stroke-width="2.4" fill="none"/>';
    return s + '</svg>';
  };

  var bearListeners = [];
  BD.onBear = function (fn) { bearListeners.push(fn); };
  function saveBear() { hadBear = true; lsSet(BEAR_KEY, JSON.stringify(bear)); bearListeners.forEach(function (f) { try { f(bear); } catch (e) {} }); paintPreview(); }
  function paintPreview() {
    var p = $('#bd-bear-preview'); if (p) p.innerHTML = BD.bearSVG(bear, 'stand');
    var n = $('#bd-bear-name-out'); if (n) n.textContent = bear.name || 'Your bear';
  }
  function radioGroup(key, label, list, swatch) {
    var fs = el('fieldset', { class: 'bd-fs' }), lg = el('legend', null, label); fs.appendChild(lg);
    var box = el('div', { class: swatch ? 'bd-sw' : 'bd-ch' });
    list.forEach(function (p) {
      var val = swatch ? p[1] : p[0], nm = swatch ? p[0] : p[1], id = 'bd-' + key + '-' + (swatch ? p[1].slice(1) : p[0]);
      var lab = el('label', { class: 'bd-opt' + (swatch ? ' sw' : ''), for: id });
      var inp = el('input', { type: 'radio', name: 'bd-' + key, id: id, value: val });
      if (bear[key] === val) inp.checked = true;
      var sp = el('span', null, swatch ? '' : esc(nm));
      if (swatch) { sp.style.setProperty('--c', val); sp.style.setProperty('--tick', lum(val) > 0.6 ? '#2B2620' : '#fff'); inp.setAttribute('aria-label', nm); }
      lab.appendChild(inp); lab.appendChild(sp); box.appendChild(lab);
      inp.addEventListener('change', function () { if (inp.checked) { bear[key] = val; saveBear(); } });
    });
    fs.appendChild(box); return fs;
  }
  function buildBuilder() {
    var c = $('#bd-controls'); if (!c) return; c.innerHTML = '';
    var nrow = el('div', { class: 'bd-fs' });
    nrow.innerHTML = '<div class="bd-name-row"><label for="bd-bear-name">Your bear’s name</label><input class="bd-text" id="bd-bear-name" type="text" maxlength="20" autocomplete="off" spellcheck="false" placeholder="Anything you like (or leave blank)"></div>';
    c.appendChild(nrow);
    var ni = $('input', nrow); ni.value = bear.name;
    ni.addEventListener('input', function () { bear.name = ni.value.replace(/[<>]/g, '').slice(0, 20); saveBear(); });
    c.appendChild(radioGroup('fur', 'Fur or skin tone', FUR, true));
    c.appendChild(radioGroup('face', 'Expression', OPTS.face));
    c.appendChild(radioGroup('ears', 'Ears', OPTS.ears));
    c.appendChild(radioGroup('shape', 'Shape', OPTS.shape));
    c.appendChild(radioGroup('robe', 'Robe color', ROBE, true));
    c.appendChild(radioGroup('style', 'Robe style', OPTS.style));
    c.appendChild(radioGroup('acc', 'Accessory', OPTS.acc));
    var row = el('div', { class: 'bd-row' });
    var sur = el('button', { type: 'button', class: 'bd-pill' }, 'Surprise me'), rs = el('button', { type: 'button', class: 'bd-pill' }, 'Start over');
    var msg = el('p', { class: 'bd-note', role: 'status', 'aria-live': 'polite' }, 'Saved on this device as you go.');
    row.appendChild(sur); row.appendChild(rs); c.appendChild(row); c.appendChild(msg);
    function setAll(b) { for (var k in b) bear[k] = b[k]; saveBear(); buildBuilder(); }
    sur.addEventListener('click', function () { setAll({ fur: pick(FUR)[1], robe: pick(ROBE)[1], ears: pick(OPTS.ears)[0], shape: pick(OPTS.shape)[0], style: pick(OPTS.style)[0], acc: pick(OPTS.acc)[0], face: pick(OPTS.face)[0], name: bear.name }); var m = $('#bd-controls .bd-note'); if (m) m.textContent = 'A new look, saved on this device.'; });
    rs.addEventListener('click', function () { lsDel(BEAR_KEY); hadBear = false; var d = validBear(null); for (var k in d) bear[k] = d[k]; bearListeners.forEach(function (f) { try { f(bear); } catch (e) {} }); paintPreview(); buildBuilder(); var m = $('#bd-controls .bd-note'); if (m) m.textContent = 'Back to the beginning. Nothing is kept now.'; });
  }

  // ---------- the room inside ----------
  function roomSVG() {
    var i, s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 400" preserveAspectRatio="xMidYMax slice" focusable="false">';
    s += '<defs><radialGradient id="rm-g1" cx="50%" cy="55%" r="70%"><stop offset="0" stop-color="#FFF9E6"/><stop offset="1" stop-color="#F3DDAE"/></radialGradient>' +
      '<radialGradient id="rm-g2" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFD58A" stop-opacity=".9"/><stop offset="1" stop-color="#FFD58A" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="rm-g3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#2A1608" stop-opacity=".45"/></linearGradient>' +
      '<linearGradient id="rm-g4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A1A10"/><stop offset="1" stop-color="#6E4528"/></linearGradient></defs>';
    s += '<rect width="1000" height="400" class="rm-wood"/>';
    // paper screens
    s += '<rect x="90" y="62" width="820" height="204" fill="url(#rm-g1)"/>';
    // the shapes of bamboo outside, seen through the paper
    s += '<g opacity=".16" stroke="#2E5A34" stroke-linecap="round" fill="none">';
    [[250, 6], [300, 5], [690, 6], [748, 5], [820, 4]].forEach(function (b, k) { s += '<g class="rm-leaf" style="animation-delay:-' + k * 2 + 's"><path d="M' + b[0] + ' 262 V70" stroke-width="' + b[1] + '"/><path d="M' + b[0] + ' 150 q26 -14 44 -4 M' + b[0] + ' 110 q-26 -12 -44 -2 M' + b[0] + ' 188 q-28 -10 -46 0" stroke-width="3"/></g>'; });
    s += '</g>';
    s += '<g class="rm-lat" stroke-width="3" fill="none">';
    for (i = 0; i <= 12; i++) s += '<path d="M' + (90 + i * 68.33) + ' 62 V266"/>';
    for (i = 0; i <= 4; i++) s += '<path d="M90 ' + (62 + i * 51) + ' H910"/>';
    s += '</g><g class="rm-lat" stroke-width="6" fill="none">';
    for (i = 0; i <= 4; i++) s += '<path d="M' + (90 + i * 205) + ' 62 V266"/>';
    s += '</g><rect x="90" y="262" width="820" height="8" class="rm-wood2"/><rect x="90" y="56" width="820" height="9" class="rm-wood2"/>';
    // ceiling, beams and two paper lanterns
    s += '<rect width="1000" height="56" fill="url(#rm-g4)"/><rect y="40" width="1000" height="10" class="rm-wood2"/><rect x="0" y="18" width="1000" height="6" class="rm-wood2" opacity=".7"/>';
    [215, 785].forEach(function (x, k) { s += '<path d="M' + x + ' 50 V78" stroke="#2A1A10" stroke-width="2"/><circle cx="' + x + '" cy="104" r="64" fill="url(#rm-g2)" class="bd-glow flick f' + (k + 2) + '" style="opacity:1"/><ellipse cx="' + x + '" cy="104" rx="19" ry="26" fill="#FFE2A6" stroke="#A8693A" stroke-width="2"/><path d="M' + (x - 14) + ' 96 H' + (x + 14) + ' M' + (x - 17) + ' 106 H' + (x + 17) + ' M' + (x - 14) + ' 116 H' + (x + 14) + '" stroke="#C48A4E" stroke-width="1.4"/>'; });
    // side walls: a hanging scroll with a brush circle, and a low shelf with a small vase
    s += '<rect x="34" y="82" width="42" height="108" fill="#F2E6C8" stroke="#3E2616" stroke-width="3"/><circle cx="55" cy="136" r="14" fill="none" stroke="#2A2220" stroke-width="3.4" stroke-dasharray="78 12" transform="rotate(-70 55 136)" stroke-linecap="round"/>';
    s += '<rect x="22" y="222" width="68" height="8" class="rm-wood2"/><path d="M44 222 q-6 -22 4 -26 h8 q10 4 4 26z" fill="#6E8F98"/><path d="M52 196 Q48 168 58 150 M52 196 Q64 176 80 172" stroke="#4E3A28" stroke-width="2.6" fill="none"/><circle cx="58" cy="150" r="5" fill="#F3B6C4"/><circle cx="80" cy="172" r="4.4" fill="#F3B6C4"/>';
    // the floor: tatami mats in soft perspective, a wooden edge at the front
    s += '<polygon points="0,266 1000,266 1000,400 0,400" class="rm-floor"/>';
    s += '<g class="rm-edge" stroke-width="3" fill="none">';
    for (i = -4; i <= 4; i++) s += '<path d="M' + (500 + i * 135) + ' 266 L' + (500 + i * 250) + ' 400"/>';
    s += '<path d="M0 300 H1000 M0 346 H1000" opacity=".7"/></g>';
    s += '<g stroke="#9B9068" stroke-width="1" opacity=".5">';
    for (i = 0; i < 60; i++) { var yy = 270 + (i * 37) % 128; s += '<path d="M' + ((i * 97) % 1000) + ' ' + yy + ' h' + (14 + (i % 5) * 6) + '"/>'; }
    s += '</g><rect x="0" y="378" width="1000" height="22" fill="#7C5030"/><rect x="0" y="378" width="1000" height="3" fill="#A1703F"/>';
    s += '<rect width="1000" height="400" fill="url(#rm-g3)"/>';
    // warm light pooling on the floor
    s += '<ellipse cx="500" cy="330" rx="330" ry="62" fill="url(#rm-g2)" class="rm-warm"/>';
    // cushions
    [[270, 350, 54, '#8A9F7B'], [700, 352, 58, '#C8704F'], [470, 350, 74, '#B5483A']].forEach(function (c) { s += '<ellipse cx="' + c[0] + '" cy="' + (c[1] + 8) + '" rx="' + c[2] + '" ry="15" fill="rgba(0,0,0,.2)"/><ellipse cx="' + c[0] + '" cy="' + c[1] + '" rx="' + c[2] + '" ry="15" fill="' + c[3] + '"/><ellipse cx="' + c[0] + '" cy="' + (c[1] - 3) + '" rx="' + (c[2] - 10) + '" ry="10" fill="rgba(255,255,255,.14)"/>'; });
    // you, sitting on the middle cushion
    s += '<svg id="bd-room-bear" x="400" y="186" width="140" height="175" viewBox="0 0 120 150">' + BD.bearSVG(bear, 'sit').replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') + '</svg>';
    // incense: a small burner and three slow puffs of smoke
    s += '<g transform="translate(835 340)"><ellipse cx="0" cy="8" rx="22" ry="6" fill="rgba(0,0,0,.2)"/><path d="M-16 0 h32 l-5 10 h-22z" fill="#5A4A3E"/><ellipse cx="0" cy="0" rx="16" ry="4.5" fill="#9B8B7D"/><path d="M0 0 L5 -34" stroke="#7A4B2A" stroke-width="2.2"/><circle cx="5" cy="-35" r="2" fill="#FF9A4D"/>';
    for (i = 0; i < 3; i++) s += '<ellipse class="bd-puff p' + (i + 1) + '" cx="' + (5 + i * 2) + '" cy="-40" rx="9" ry="12" fill="#fff" opacity="0" style="animation-delay:-' + i * 3 + 's"/>';
    s += '</g>';
    return s + '</svg>';
  }
  var roomBuilt = false;
  function buildRoom() { var a = $('#bd-room-art'); if (!a) return; a.innerHTML = roomSVG(); roomBuilt = true; }
  BD.onBear(function () { var n = $('#bd-room-bear'); if (n) n.innerHTML = BD.bearSVG(bear, 'sit').replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''); });

  // ---------- offerings: a shuffle bag, one at a time ----------
  var offers = [], byId = {}, bag = [], lastId = null, current = null, lastAct = Date.now(), inside = false, busy = false;
  var SEEN_KEY = 'bears-dojo-last';
  BD.offer = function (o) { if (!byId[o.id]) { offers.push(o); byId[o.id] = o; } };
  BD.offerings = function () { return offers.map(function (o) { return o.id; }); };
  function nextId() {
    if (!bag.length) {
      bag = shuffle(offers.map(function (o) { return o.id; }));
      if (bag.length > 1 && bag[0] === lastId) { var t = bag[0]; bag[0] = bag[bag.length - 1]; bag[bag.length - 1] = t; } // never the same one twice in a row
    }
    return bag.shift();
  }
  function makeApi(o, host) {
    var cleaners = [], dead = false;
    var api = {
      host: host, audio: A, util: BD.util, bear: function () { return bear; }, bearSVG: BD.bearSVG, bearName: BD.bearName, still: still, onStill: function (f) { cleaners.push(onStill(f)); },
      say: function (t) { var l = $('#bd-say'); if (l) { l.textContent = ''; setTimeout(function () { l.textContent = t; }, 40); } },
      on: function (t, ev, fn, opt) { t.addEventListener(ev, fn, opt); cleaners.push(function () { t.removeEventListener(ev, fn, opt); }); },
      later: function (fn, ms) { var id = setTimeout(function () { if (!dead) fn(); }, ms); cleaners.push(function () { clearTimeout(id); }); return id; },
      every: function (fn, ms) { var id = setInterval(function () { if (!dead && !doc.hidden) fn(); }, ms); cleaners.push(function () { clearInterval(id); }); return id; },
      // a frame loop that sleeps when the tab is hidden and stops when you move on; fn(dt ms, now)
      frames: function (fn) { var id = 0, last = 0; function tick(t) { if (dead) return; id = requestAnimationFrame(tick); if (doc.hidden) { last = 0; return; } var dt = last ? Math.min(60, t - last) : 16; last = t; fn(dt, t); } id = requestAnimationFrame(tick); cleaners.push(function () { cancelAnimationFrame(id); }); },
      busy: function (v) { busy = !!v; },
      cleanup: function (fn) { cleaners.push(fn); },
      drag: function (n, cb) { cleaners.push(BD.drag(n, cb)); },
      store: { get: function (k) { return lsGet('bears-dojo-' + k); }, set: function (k, v) { return lsSet('bears-dojo-' + k, v); }, del: function (k) { lsDel('bears-dojo-' + k); } },
      soundHint: function (el2) { if (!A.on && el2) el2.textContent = 'Turn Sound on (top of the page) to hear it.'; }
    };
    api.destroy = function () { dead = true; busy = false; cleaners.splice(0).forEach(function (f) { try { f(); } catch (e) {} }); };
    return api;
  }
  var curApi = null;
  function show(id, quiet) {
    var o = byId[id]; if (!o) return;
    var card = $('#bd-offering'), body = $('#bd-off-body');
    function swap() {
      if (curApi) { curApi.destroy(); curApi = null; }
      body.innerHTML = ''; busy = false; lastId = id; current = id; lsSet(SEEN_KEY, id);
      $('#bd-off-k').textContent = o.kind || 'An offering'; $('#bd-off-t').textContent = o.title;
      curApi = makeApi(o, body);
      try { o.mount(body, curApi); } catch (e) { if (window.console) console.warn('bears-dojo offering failed', id, e); body.innerHTML = '<p>This one is resting. Try another.</p>'; }
      card.classList.remove('is-out'); lastAct = Date.now();
      if (!quiet) curApi.say('Now: ' + o.title);
    }
    if (still() || quiet === 'now') swap(); else { card.classList.add('is-out'); setTimeout(swap, 420); }
  }
  BD.next = function (quiet) { show(nextId(), quiet); };
  BD.current = function () { return current; };
  BD.show = show;
  BD.isInside = function () { return inside; };

  // drifting: a new offering arrives after a quiet while, and never while someone is in the middle of something
  var driftOn = false, driftTimer = 0;
  function interacting() {
    var a = doc.activeElement, card = $('#bd-offering');
    var typing = a && /^(input|textarea|select)$/i.test(a.tagName) && card && card.contains(a);
    return busy || typing || (Date.now() - lastAct < 45000);
  }
  function setDrift(on) {
    driftOn = on; var b = $('#bd-drift'); b.setAttribute('aria-pressed', String(on)); $('b', b).textContent = on ? 'on' : 'off';
    clearInterval(driftTimer);
    if (on) driftTimer = setInterval(function () { if (inside && !doc.hidden && !interacting()) BD.next(); }, 5000);
  }
  ['pointerdown', 'keydown', 'input', 'touchstart'].forEach(function (ev) { doc.addEventListener(ev, function () { lastAct = Date.now(); }, { passive: true }); });

  // ---------- going in and out ----------
  var moving = false;
  function enter() {
    if (inside || moving) return; moving = true;
    var stage = $('#bd-stage'), out = $('#bd-outside'), inn = $('#bd-inside'), fast = still();
    function done() {
      out.hidden = true; inn.hidden = false; inside = true; moving = false;
      if (!roomBuilt) buildRoom();
      if (BD.scene) BD.scene.pause(); if (BD.roomPups) BD.roomPups.start();
      A.setMode('inside'); if (pendingId && byId[pendingId]) show(pendingId, 'now'); else BD.next('now'); pendingId = null;
      var h = $('#bd-in-h'); try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); }
      var r = h.getBoundingClientRect(); if (r.top < 60 || r.top > innerHeight * 0.6) window.scrollTo({ top: window.scrollY + r.top - 80, behavior: 'auto' });
      curApi && curApi.say('You are inside the dojo. A new offering is ready.');
    }
    stage.classList.add('is-entering');
    if (fast) done(); else setTimeout(done, 2700);
  }
  function leave() {
    if (!inside || moving) return; moving = true;
    var stage = $('#bd-stage'), out = $('#bd-outside'), inn = $('#bd-inside');
    if (curApi) { curApi.destroy(); curApi = null; } setDrift(false);
    if (BD.roomPups) BD.roomPups.stop();
    inn.hidden = true; out.hidden = false; inside = false; moving = false;
    A.setMode('outside'); if (BD.scene) BD.scene.resume();
    $('#bd-offering').classList.remove('is-out');
    // let the doors close again once the grounds are back
    requestAnimationFrame(function () { requestAnimationFrame(function () { stage.classList.remove('is-entering'); }); });
    var b = $('#bd-enter'); try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); }
    var r = b.getBoundingClientRect(); if (r.top < 60 || r.bottom > innerHeight) b.scrollIntoView({ block: 'center', behavior: 'auto' });
    var l = $('#bd-say'); if (l) l.textContent = 'You are back on the grounds.';
  }
  // go straight to one offering (the buttons on the grounds: splash, fish, the zen garden)
  var pendingId = null;
  BD.enterTo = function (id) { if (inside) { show(id); return; } pendingId = id; enter(); };
  BD.enter = enter; BD.leave = leave;

  // ---------- start ----------
  function boot() {
    var live = el('div', { id: 'bd-say', class: 'sr-only', 'aria-live': 'polite', role: 'status' }); $('#bd').appendChild(live);
    buildBuilder(); paintPreview(); syncSound(); syncStillBtn();
    lastId = lsGet(SEEN_KEY);
    $('#bd-sound').addEventListener('click', function () { A.toggle(); });
    $('#bd-still').addEventListener('click', function () {
      var s = !still();
      if (window.TOLStill && window.TOLStill.set) window.TOLStill.set(s);
      else { root.classList.toggle('tol-still', s); fireStill(); }
    });
    $('#bd-enter').addEventListener('click', enter);
    $('#bd-leave').addEventListener('click', leave);
    $('#bd-next').addEventListener('click', function () { BD.next(); });
    $('#bd-drift').addEventListener('click', function () { setDrift(!driftOn); });
    $('#bd-bear-go').addEventListener('click', BD.gotoBuilder = function () { var h = $('#bd-bear-h'); h.scrollIntoView({ block: 'start', behavior: still() ? 'auto' : 'smooth' }); try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } });
    doc.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !inside || moving || e.defaultPrevented) return;
      var a = doc.activeElement; if (a && /^(input|textarea|select)$/i.test(a.tagName)) { a.blur(); return; }
      leave();
    });
    if (BD.scene) BD.scene.mount();
    if (!hadBear) { var n = $('#bd-bear-preview'); if (n) n.setAttribute('data-new', '1'); }
    BD.ready = true; doc.dispatchEvent(new CustomEvent('bears-dojo-ready'));
  }
  // deferred scripts run while readyState is 'interactive', before DOMContentLoaded: wait for all of them
  if (doc.readyState === 'complete') setTimeout(boot, 0); else doc.addEventListener('DOMContentLoaded', boot);
})();
