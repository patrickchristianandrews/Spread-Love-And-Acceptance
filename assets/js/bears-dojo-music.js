/* bears-dojo-music.js — The music corner inside the Bears Dojo room.
   Eight instruments drawn in the room's style (wind chimes, a singing bowl, a handpan, a kalimba, a wooden flute,
   a soft gong, a rain stick and a shruti box drone). Every sound is made here with WebAudio, through the dojo's own
   sound (BearsDojo.audio): nothing plays until the visitor turns Sound on, nothing plays while the page is hidden,
   and it all stops on pagehide or when you leave the room. Every note comes from one scale (C major pentatonic, the
   same one the rest of the dojo uses; over the room's low A hum it feels like A minor pentatonic), so anything
   played together sits well. Every note has a soft attack and release, so nothing clicks.
   Songs to sit with: longer pieces (5, 10 or 20 minutes, or no end) that play themselves with slow, changing
   patterns that never leave the key, a soft start and a soft ending, a timer and a pause.
   Your own mix: each instrument's part on or off, its volume, a slow or slower pace, "Surprise me", and mixes saved
   on this device (localStorage "bears-dojo-music"). Nothing is sent anywhere. */
(function () {
  'use strict';
  var BD = window.BearsDojo; if (!BD) return;
  var doc = document, U = null, A = null;
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function rnd() { return Math.random(); }
  function ri(n) { return Math.floor(Math.random() * n); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ---------- the one scale ----------
  var PCS = [0, 2, 4, 7, 9], NAME = { 0: 'C', 2: 'D', 4: 'E', 7: 'G', 9: 'A' };
  var PENT = []; for (var m = 31; m <= 100; m++) if (PCS.indexOf(m % 12) > -1) PENT.push(m);
  function hz(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function idxAt(midi) { for (var i = 0; i < PENT.length; i++) if (PENT[i] >= midi) return i; return PENT.length - 1; }
  function notesFrom(lo, n) { var i = idxAt(lo), out = []; for (var k = 0; k < n; k++) out.push(PENT[i + k]); return out; }
  // the nearest note in a list to a pitch class, at or above a midi floor
  function nearest(list, pc) { for (var i = 0; i < list.length; i++) if (list[i] % 12 === pc) return i; return 0; }

  // ---------- the instruments ----------
  // pads: eight notes, low to high, in each instrument's own register. The rain stick's "notes" are tilts, short to long.
  var INST = [
    { id: 'chimes', name: 'Wind chimes', pads: notesFrom(79, 8), about: 'bright and airy' },
    { id: 'bowl', name: 'Singing bowl', pads: notesFrom(48, 8), about: 'long and humming' },
    { id: 'handpan', name: 'Handpan', pads: notesFrom(57, 8), about: 'round and warm' },
    { id: 'kalimba', name: 'Kalimba', pads: notesFrom(72, 8), about: 'small plucked tines' },
    { id: 'flute', name: 'Wooden flute', pads: notesFrom(67, 8), about: 'soft and breathy' },
    { id: 'gong', name: 'Soft gong', pads: notesFrom(45, 8), about: 'a slow, deep bloom' },
    { id: 'rain', name: 'Rain stick', pads: [1, 2, 3, 4, 5, 6, 7, 8], about: 'seeds falling like rain' },
    { id: 'drone', name: 'Shruti box', pads: [43, 45, 48, 50, 55, 57, 60, 62], about: 'a steady, breathing drone' }
  ];
  var byId = {}; INST.forEach(function (d, i) { d.i = i; byId[d.id] = d; });

  // the drawings, in the room's colors (wood, brass, paper, steel)
  var ART = {
    chimes: '<rect x="14" y="6" width="52" height="6" rx="3" fill="#8A5233"/><path d="M40 2v4" stroke="#6E4528" stroke-width="2"/>' +
      '<g class="mu-sw"><path d="M22 12v6M31 12v4M40 12v6M49 12v4M58 12v6" stroke="#8A5233" stroke-width="1.2"/>' +
      '<rect x="19.5" y="18" width="5" height="34" rx="2.5" fill="url(#mu-steel)"/><rect x="28.5" y="16" width="5" height="28" rx="2.5" fill="url(#mu-steel)"/><rect x="37.5" y="18" width="5" height="38" rx="2.5" fill="url(#mu-steel)"/><rect x="46.5" y="16" width="5" height="24" rx="2.5" fill="url(#mu-steel)"/><rect x="55.5" y="18" width="5" height="30" rx="2.5" fill="url(#mu-steel)"/>' +
      '<path d="M40 12v38" stroke="#8A5233" stroke-width=".8" opacity=".5"/><circle cx="40" cy="58" r="3.4" fill="#C79A52"/></g>',
    bowl: '<ellipse cx="40" cy="55" rx="27" ry="6" fill="#B5483A"/><ellipse cx="40" cy="53" rx="23" ry="4" fill="#C8704F"/>' +
      '<path d="M14 26 C14 46 26 52 40 52 C54 52 66 46 66 26Z" fill="#C79A52"/><ellipse cx="40" cy="26" rx="26" ry="6" fill="#E7C987"/><ellipse cx="40" cy="27" rx="21" ry="4.2" fill="#A97C36"/>' +
      '<path d="M22 34 C26 44 32 47 40 48" stroke="#FFF1C9" stroke-width="1.8" fill="none" opacity=".55" stroke-linecap="round"/><path d="M60 12 L70 4" stroke="#6E4528" stroke-width="3.4" stroke-linecap="round"/>',
    handpan: '<ellipse cx="40" cy="40" rx="32" ry="15" fill="#4D5A62"/><ellipse cx="40" cy="36" rx="32" ry="14" fill="#6A7A83"/><ellipse cx="40" cy="34" rx="12" ry="5.5" fill="#56656D"/><ellipse cx="40" cy="33" rx="5" ry="2.4" fill="#7E8E97"/>' +
      '<g fill="#56656D"><ellipse cx="18" cy="35" rx="5" ry="2.6"/><ellipse cx="62" cy="35" rx="5" ry="2.6"/><ellipse cx="25" cy="28" rx="4.6" ry="2.2"/><ellipse cx="55" cy="28" rx="4.6" ry="2.2"/><ellipse cx="25" cy="42" rx="4.6" ry="2.2"/><ellipse cx="55" cy="42" rx="4.6" ry="2.2"/><ellipse cx="40" cy="45" rx="5" ry="2.2"/></g>' +
      '<path d="M14 30 Q40 18 66 30" stroke="#C9D3D8" stroke-width="1.2" fill="none" opacity=".5"/>',
    kalimba: '<rect x="16" y="10" width="48" height="46" rx="9" fill="#B07A45"/><rect x="16" y="10" width="48" height="46" rx="9" fill="url(#mu-wood)" opacity=".4"/><circle cx="40" cy="44" r="5.4" fill="#4A2E1B"/>' +
      '<rect x="20" y="20" width="40" height="3.4" rx="1.7" fill="#6E4528"/><g stroke="url(#mu-steel)" stroke-width="2.6" stroke-linecap="round"><path d="M25 14v18M30 14v22M35 14v26M40 14v28M45 14v26M50 14v22M55 14v18"/></g>',
    flute: '<g transform="rotate(-24 40 32)"><rect x="4" y="27" width="72" height="10" rx="5" fill="#B9874E"/><rect x="4" y="27" width="72" height="10" rx="5" fill="url(#mu-wood)" opacity=".35"/>' +
      '<rect x="14" y="26" width="3" height="12" fill="#6E4528"/><rect x="64" y="26" width="3" height="12" fill="#6E4528"/><ellipse cx="22" cy="32" rx="2.6" ry="2" fill="#3E2616"/>' +
      '<g fill="#3E2616"><circle cx="34" cy="32" r="1.9"/><circle cx="41" cy="32" r="1.9"/><circle cx="48" cy="32" r="1.9"/><circle cx="55" cy="32" r="1.9"/></g></g>',
    gong: '<rect x="8" y="8" width="64" height="5" rx="2" fill="#8A5233"/><rect x="10" y="10" width="4.5" height="50" fill="#B5483A"/><rect x="65.5" y="10" width="4.5" height="50" fill="#B5483A"/>' +
      '<path d="M32 13l2 6M48 13l-2 6" stroke="#6E4528" stroke-width="1.2"/><g class="mu-sw2"><circle cx="40" cy="36" r="18" fill="#C79A52"/><circle cx="40" cy="36" r="14" fill="none" stroke="#A97C36" stroke-width="1.5"/><circle cx="40" cy="36" r="5.5" fill="#E7C987"/><path d="M28 28 Q32 22 38 21" stroke="#FFF1C9" stroke-width="1.6" fill="none" opacity=".5" stroke-linecap="round"/></g>' +
      '<ellipse cx="40" cy="62" rx="26" ry="2.2" fill="rgba(0,0,0,.18)"/>',
    rain: '<g transform="rotate(-30 40 32)"><rect x="2" y="26" width="76" height="12" rx="6" fill="#8FA36B"/><rect x="2" y="26" width="76" height="12" rx="6" fill="url(#mu-wood)" opacity=".25"/>' +
      '<rect x="2" y="26" width="7" height="12" rx="3" fill="#8A5233"/><rect x="71" y="26" width="7" height="12" rx="3" fill="#8A5233"/>' +
      '<g fill="#5E7046"><circle cx="16" cy="30" r="1.2"/><circle cx="23" cy="34" r="1.2"/><circle cx="30" cy="30" r="1.2"/><circle cx="37" cy="34" r="1.2"/><circle cx="44" cy="30" r="1.2"/><circle cx="51" cy="34" r="1.2"/><circle cx="58" cy="30" r="1.2"/><circle cx="65" cy="34" r="1.2"/></g>' +
      '<path d="M12 32 h56" stroke="#D9C47E" stroke-width="1" opacity=".6" stroke-dasharray="3 4"/></g>',
    drone: '<rect x="12" y="14" width="56" height="40" rx="5" fill="#9A6A3F"/><rect x="12" y="14" width="56" height="40" rx="5" fill="url(#mu-wood)" opacity=".35"/>' +
      '<g class="mu-bel"><path d="M16 22 h48 M16 28 h48 M16 34 h48" stroke="#5A3A26" stroke-width="1.6"/></g><rect x="16" y="40" width="48" height="10" rx="2" fill="#7A4E2D"/>' +
      '<g fill="#E7C987"><rect x="21" y="43" width="6" height="4" rx="1"/><rect x="31" y="43" width="6" height="4" rx="1"/><rect x="43" y="43" width="6" height="4" rx="1"/><rect x="53" y="43" width="6" height="4" rx="1"/></g><path d="M30 14 Q40 4 50 14" stroke="#5A3A26" stroke-width="2" fill="none"/>'
  };
  var DEFS = '<defs><linearGradient id="mu-steel" x1="0" x2="1"><stop offset="0" stop-color="#A9B4B8"/><stop offset=".45" stop-color="#EEF2F3"/><stop offset="1" stop-color="#8E9A9F"/></linearGradient>' +
    '<linearGradient id="mu-wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient></defs>';

  // ---------- sound ----------
  var ctx = null, bus = null, tapBus = null, partG = {}, noiseBuf = null;
  function ready() {
    if (!A || !A.on || !A.ctx || A.ctx.state === 'closed') return false;
    if (ctx !== A.ctx) build();
    return true;
  }
  function build() {
    ctx = A.ctx; noiseBuf = null; partG = {};
    // the song bus: every part has its own gain (on/off and volume), then one fader for the song's soft start and end
    bus = ctx.createGain(); bus.gain.value = 0.0001; bus.connect(A.master);
    var bs = ctx.createGain(); bs.gain.value = 0.55; bus.connect(bs); if (A.verb) bs.connect(A.verb);
    tapBus = ctx.createGain(); tapBus.gain.value = 1; tapBus.connect(A.master);
    var ts = ctx.createGain(); ts.gain.value = 0.5; tapBus.connect(ts); if (A.verb) ts.connect(A.verb);
    INST.forEach(function (d) { var g = ctx.createGain(); var p = mix.parts[d.id]; g.gain.value = p.on ? p.vol : 0; g.connect(bus); partG[d.id] = g; });
  }
  function noise() {
    if (noiseBuf) return noiseBuf;
    var n = Math.floor(ctx.sampleRate * 2), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    noiseBuf = b; return b;
  }
  // a soft envelope on every voice: up from silence, back down to silence (no clicks)
  function partial(f, t, att, peak, dec, out, type, detune) {
    var g = ctx.createGain(), o = ctx.createOscillator();
    o.type = type || 'sine'; o.frequency.value = f; if (detune) o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dec + 0.05);
    return g;
  }
  function filt(type, f, q) { var b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q == null ? 0.7 : q; return b; }
  // each voice: (frequency or tilt, start time, loudness, output, length) and returns how long it glows
  var VOICE = {
    chimes: function (f, t, v, out) {
      partial(f, t, 0.004, v, 3.6, out); partial(f * 2.01, t, 0.003, v * 0.28, 2, out); partial(f * 3.02, t, 0.003, v * 0.09, 1.1, out); partial(f * 5.43, t, 0.002, v * 0.025, 0.35, out);
      return 1.6;
    },
    bowl: function (f, t, v, out) {
      partial(f, t, 0.03, v, 8, out); partial(f * 1.0035, t, 0.04, v * 0.6, 8.5, out); partial(f * 2.71, t, 0.02, v * 0.24, 5, out); partial(f * 5.18, t, 0.012, v * 0.07, 2.4, out);
      return 3;
    },
    handpan: function (f, t, v, out) {
      var lp = filt('lowpass', 2600, 0.5); lp.connect(out);
      partial(f, t, 0.006, v, 2.8, lp); partial(f * 2, t, 0.005, v * 0.32, 1.6, lp); partial(f * 3, t, 0.004, v * 0.1, 0.8, lp); partial(f * 0.5, t, 0.01, v * 0.12, 1.2, lp);
      return 1.2;
    },
    kalimba: function (f, t, v, out) {
      partial(f, t, 0.004, v, 1.5, out); partial(f, t, 0.004, v * 0.22, 0.9, out, 'triangle'); partial(f * 5.4, t, 0.002, v * 0.04, 0.07, out);
      return 0.8;
    },
    flute: function (f, t, v, out, dur) {
      dur = Math.max(0.8, dur || 1.8);
      var end = t + dur, rel = Math.min(0.6, dur * 0.35), g = ctx.createGain(), lp = filt('lowpass', f * 3, 0.5);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.22); g.gain.linearRampToValueAtTime(v * 0.82, end - rel); g.gain.exponentialRampToValueAtTime(0.0001, end);
      lp.connect(g); g.connect(out);
      var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 4.6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.005, t + Math.min(0.8, dur * 0.5)); lfo.connect(lg);
      [[1, 0.8, 'sine'], [1, 0.22, 'triangle'], [2, 0.08, 'sine']].forEach(function (p) {
        var o = ctx.createOscillator(), og = ctx.createGain(); o.type = p[2]; o.frequency.value = f * p[0]; og.gain.value = p[1];
        lg.connect(o.frequency); o.connect(og); og.connect(lp); o.start(t); o.stop(end + 0.05);
      });
      lfo.start(t); lfo.stop(end + 0.05);
      // a little breath on the front of each note
      var s = ctx.createBufferSource(), bp = filt('bandpass', Math.min(6000, f * 2), 1.4), ng = ctx.createGain();
      s.buffer = noise(); s.loop = true;
      ng.gain.setValueAtTime(0.0001, t); ng.gain.linearRampToValueAtTime(v * 0.1, t + 0.08); ng.gain.linearRampToValueAtTime(v * 0.025, t + 0.45); ng.gain.exponentialRampToValueAtTime(0.0001, end);
      s.connect(bp); bp.connect(ng); ng.connect(out); s.start(t); s.stop(end + 0.05);
      return dur;
    },
    gong: function (f, t, v, out) {
      var lp = filt('lowpass', 300, 0.7); lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(2200, t + 1.2); lp.frequency.exponentialRampToValueAtTime(480, t + 8); lp.connect(out);
      [[1, 1, 11, 0.12], [2.02, 0.5, 8, 0.15], [2.98, 0.3, 6, 0.2], [4.07, 0.18, 4, 0.25], [5.43, 0.1, 3, 0.3]].forEach(function (p) { partial(f * p[0], t, p[3], v * p[1], p[2], lp); });
      var s = ctx.createBufferSource(), bp = filt('bandpass', 700, 0.6), ng = ctx.createGain(); s.buffer = noise(); s.loop = true;
      ng.gain.setValueAtTime(0.0001, t); ng.gain.linearRampToValueAtTime(v * 0.1, t + 0.5); ng.gain.exponentialRampToValueAtTime(0.0001, t + 4);
      s.connect(bp); bp.connect(ng); ng.connect(lp); s.start(t); s.stop(t + 4.1);
      return 4;
    },
    // k: 1 (a short tilt) to 8 (a long, slow one)
    rain: function (k, t, v, out, dur) {
      dur = dur || (1.2 + k * 0.45);
      var s = ctx.createBufferSource(), hp = filt('highpass', 1500, 0.5), bp = filt('bandpass', 2600 + (9 - k) * 380, 0.7), g = ctx.createGain(), end = t + dur, tt = t + 0.01;
      s.buffer = noise(); s.loop = true; s.playbackRate.value = 0.9 + rnd() * 0.2;
      g.gain.setValueAtTime(0.0001, t);
      while (tt < end - 0.04) {
        var u = (tt - t) / dur, e = Math.min(1, u * 6) * Math.pow(1 - u, 0.8), pk = Math.max(0.0002, v * e * (0.35 + rnd() * 0.65)), d = 0.004 + rnd() * 0.012;
        g.gain.linearRampToValueAtTime(pk, tt + 0.002);
        g.gain.linearRampToValueAtTime(0.0001 + v * e * 0.07, tt + 0.002 + d);
        tt += 0.002 + d + rnd() * 0.02 * (0.5 + u);
      }
      g.gain.linearRampToValueAtTime(0.0001, end);
      s.connect(hp); hp.connect(bp); bp.connect(g); g.connect(out); s.start(t); s.stop(end + 0.05);
      return dur;
    },
    drone: function (f, t, v, out, dur) {
      dur = Math.max(2.5, dur || 5);
      var att = Math.min(1.8, dur * 0.3), rel = Math.min(2.4, dur * 0.4), end = t + dur, g = ctx.createGain(), lp = filt('lowpass', 620, 0.4);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + att); g.gain.setValueAtTime(v, end - rel); g.gain.linearRampToValueAtTime(0.0001, end);
      lp.connect(g); g.connect(out);
      [[1, 0.42, 'sawtooth', -5], [1, 0.42, 'sawtooth', 5], [1.5, 0.3, 'sawtooth', 3], [2, 0.16, 'sine', 0], [0.5, 0.3, 'sine', 0]].forEach(function (p) {
        var o = ctx.createOscillator(), og = ctx.createGain(); o.type = p[2]; o.frequency.value = f * p[0]; o.detune.value = p[3]; og.gain.value = p[1];
        o.connect(og); og.connect(lp); o.start(t); o.stop(end + 0.05);
      });
      // the bellows: a slow breathing in the tone
      var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.16; lg.gain.value = 160; lfo.connect(lg); lg.connect(lp.frequency); lfo.start(t); lfo.stop(end + 0.05);
      return dur;
    }
  };
  // how loud each instrument is when tapped, and in a song (before its own volume)
  var LOUD = { chimes: 0.15, bowl: 0.2, handpan: 0.24, kalimba: 0.2, flute: 0.11, gong: 0.2, rain: 0.2, drone: 0.06 };

  // the instrument glows softly while it sounds
  var glowT = {};
  function glow(id, secs, delay) {
    var b = $('.bd-inst[data-id="' + id + '"]'); if (!b) return;
    var on = function () { b.classList.add('is-sounding'); clearTimeout(glowT[id]); glowT[id] = setTimeout(function () { b.classList.remove('is-sounding'); }, Math.max(500, Math.min(4000, secs * 1000))); };
    if (delay > 0.03) setTimeout(on, delay * 1000); else on();
  }
  // play one note of one instrument now (a tap): returns false when sound is off
  function tap(id, pad) {
    var d = byId[id]; if (!d) return false;
    var p = d.pads[clamp(pad, 0, 7)];
    if (!ready()) { glow(id, 0.6); return false; }
    var t = ctx.currentTime + 0.02, v = LOUD[id] * (0.85 + rnd() * 0.2), len;
    if (id === 'rain') len = VOICE.rain(p, t, v, tapBus);
    else if (id === 'drone') len = VOICE.drone(hz(p), t, v, tapBus, 6);
    else if (id === 'flute') len = VOICE.flute(hz(p), t, v, tapBus, 1.8);
    else len = VOICE[id](hz(p), t, v, tapBus);
    glow(id, len);
    return true;
  }

  // ---------- the mix ----------
  var BPM = { slow: 56, slower: 42 };
  function blankMix() { var p = {}; INST.forEach(function (d) { p[d.id] = { on: false, vol: 0.6 }; }); return { parts: p, tempo: 'slow', from: '' }; }
  var SONGS = [
    { id: 'mist', name: 'Morning mist', about: 'Wind chimes, kalimba and a wooden flute over a soft drone.', tempo: 'slow', prog: [57, 60, 55, 62], parts: { chimes: 0.6, kalimba: 0.7, flute: 0.5, drone: 0.5 } },
    { id: 'dusk', name: 'Temple at dusk', about: 'Singing bowls, a soft gong and a slow flute.', tempo: 'slower', prog: [57, 62, 57, 60], parts: { bowl: 0.8, gong: 0.5, drone: 0.7, flute: 0.45 } },
    { id: 'rain', name: 'Rain on the roof', about: 'A rain stick, handpan and kalimba, with a few chimes.', tempo: 'slow', prog: [57, 55, 60, 57], parts: { rain: 0.6, handpan: 0.75, kalimba: 0.4, chimes: 0.35, drone: 0.4 } },
    { id: 'water', name: 'Still water', about: 'Bowls and handpan, low and slow, with chimes now and then.', tempo: 'slower', prog: [60, 57, 62, 55], parts: { bowl: 0.6, handpan: 0.5, chimes: 0.45, drone: 0.6, flute: 0.3 } }
  ];
  var songById = {}; SONGS.forEach(function (s) { songById[s.id] = s; });
  function mixFromSong(s) { var m = blankMix(); m.tempo = s.tempo; m.from = s.id; for (var k in s.parts) m.parts[k] = { on: true, vol: s.parts[k] }; return m; }
  var mix = mixFromSong(SONGS[0]);
  function partsOn(m) { return INST.filter(function (d) { return m.parts[d.id].on; }).length; }

  // ---------- kept on this device ----------
  var KEY = 'bears-dojo-music', saved = { v: 1, len: 600, song: 'mist', mixes: [] };
  function cleanMix(o) {
    if (!o || typeof o !== 'object' || !o.parts) return null;
    var m = blankMix(); m.tempo = o.tempo === 'slower' ? 'slower' : 'slow'; m.from = songById[o.from] ? o.from : '';
    INST.forEach(function (d) { var p = o.parts[d.id]; if (p && typeof p === 'object') m.parts[d.id] = { on: !!p.on, vol: clamp(+p.vol || 0, 0, 1) }; });
    if (typeof o.name === 'string') m.name = o.name.replace(/[<>]/g, '').slice(0, 30);
    return m;
  }
  function load() {
    try {
      var o = JSON.parse(U.lsGet(KEY) || 'null'); if (!o || typeof o !== 'object') return;
      if ([300, 600, 1200, 0].indexOf(+o.len) > -1) saved.len = +o.len;
      if (songById[o.song]) saved.song = o.song;
      if (Array.isArray(o.mixes)) saved.mixes = o.mixes.map(cleanMix).filter(function (x) { return x && x.name; }).slice(0, 8);
    } catch (e) {}
  }
  function store() { U.lsSet(KEY, JSON.stringify({ v: 1, len: saved.len, song: saved.song, mixes: saved.mixes })); }

  // ---------- the song engine: a slow, lookahead scheduler on the audio clock ----------
  var P = { playing: false, paused: false, len: 600, el: 0, lastT: 0, nextT: 0, step: 0, prog: SONGS[0].prog, seed: 0, kal: [], pan: [], fluteAt: 0, rainAt: 0, droneUntil: 0, finalDone: false, fadeDone: false, why: '' };
  var ENTRY = { drone: 0, bowl: 0, gong: 0, chimes: 8, rain: 12, flute: 20, handpan: 28, kalimba: 36 };
  var timerId = 0, uiId = 0;
  function e8() { return 30 / BPM[mix.tempo]; }
  function on(id) { return mix.parts[id].on && mix.parts[id].vol > 0.01; }
  function songTime(t) { return P.el + (t - ctx.currentTime); }
  function finite() { return P.len > 0; }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function intensity(st) {
    var a = 0.3 + 0.7 * smooth(st / 45), b = finite() ? smooth((P.len - st - 14) / 45) : 1, ev = 0.8 + 0.2 * Math.sin(2 * Math.PI * st / 170 + P.seed);
    return a * b * ev;
  }
  function breeze(st) { return 0.5 + 0.5 * Math.sin(2 * Math.PI * st / 47 + P.seed) * Math.sin(2 * Math.PI * st / 131 + P.seed * 2); }
  function entered(id, st) { var k = finite() ? Math.min(1, P.len / 600) : 1; return st >= ENTRY[id] * k; }
  function motif(n, dens) { var a = []; for (var i = 0; i < n; i++) a.push(rnd() < dens ? ri(6) : null); if (a[0] == null) a[0] = 0; return a; }
  function mutate(a, k) { for (var i = 0; i < k; i++) { var j = ri(a.length); a[j] = rnd() < 0.6 ? ri(6) : null; } }
  function note(id, midiOrK, t, v, dur) {
    var out = partG[id]; if (!out) return;
    var len = id === 'rain' ? VOICE.rain(midiOrK, t, v, out, dur) : VOICE[id](hz(midiOrK), t, v, out, dur);
    glow(id, Math.min(len, 3), t - ctx.currentTime);
  }
  function step(s, t) {
    var st = songTime(t), I = intensity(st), cs = 64, cStep = s % cs, root = P.prog[Math.floor(s / cs) % P.prog.length], pc = root % 12, E = e8();
    var ending = finite() && st > P.len - 22;
    // the drone holds the chord (two notes a fifth apart), and crossfades into the next one
    if (on('drone') && (cStep === 0 || t > P.droneUntil)) {
      var rest = (cs - cStep) * E, dr = byId.drone.pads[nearest(byId.drone.pads, pc)];
      if (!ending || cStep === 0) { note('drone', dr, t, LOUD.drone, rest + 3); P.droneUntil = t + rest; }
    }
    // the singing bowl: a slow strike on the chord's note every few beats
    if (on('bowl') && cStep % 16 === 0 && !ending && rnd() < (cStep === 0 ? 0.95 : 0.25 + 0.5 * I)) {
      var bn = byId.bowl.pads, bi = nearest(bn, rnd() < 0.7 ? pc : (pc + 7) % 12); note('bowl', bn[bi], t, LOUD.bowl * (0.6 + 0.4 * I));
    }
    // the gong: a deep bloom every second chord
    if (on('gong') && (s === 0 || (s % (cs * 2) === 0 && rnd() < 0.8)) && !ending) { var gn = byId.gong.pads; note('gong', gn[nearest(gn, pc)], t, LOUD.gong * (0.45 + 0.4 * I)); }
    if (ending) {
      // one last ring, then the song settles into silence
      if (!P.finalDone && st > P.len - 19) {
        P.finalDone = true;
        var fin = on('bowl') ? 'bowl' : on('gong') ? 'gong' : on('handpan') ? 'handpan' : on('chimes') ? 'chimes' : on('kalimba') ? 'kalimba' : '';
        if (fin) { var fl = byId[fin].pads; note(fin, fl[nearest(fl, 9)], t, LOUD[fin] * 0.8); }
      }
      return;
    }
    // wind chimes: a few at a time, more when the breeze picks up
    if (on('chimes') && entered('chimes', st) && rnd() < (0.015 + 0.1 * breeze(st)) * I) {
      var cn = byId.chimes.pads, k = 1 + ri(3), off = 0;
      for (var c = 0; c < k; c++) { note('chimes', cn[ri(cn.length)], t + off, LOUD.chimes * (0.5 + 0.5 * rnd())); off += 0.08 + rnd() * 0.3; }
    }
    // kalimba: a little pattern that changes a note or two every chord
    if (on('kalimba') && entered('kalimba', st)) {
      if (cStep === 0) mutate(P.kal, 2);
      var kd = P.kal[s % P.kal.length];
      if (kd != null && rnd() < 0.35 + 0.6 * I) { var kn = byId.kalimba.pads, kb = nearest(kn, pc); note('kalimba', kn[clamp(kb + kd, 0, 7)], t + (rnd() - 0.5) * 0.02, LOUD.kalimba * (0.55 + 0.35 * rnd()) * (0.6 + 0.4 * I)); }
    }
    // handpan: a slower, lower pattern on the beats
    if (on('handpan') && entered('handpan', st) && s % 2 === 0) {
      if (cStep === 0) mutate(P.pan, 1);
      var hd = P.pan[(s / 2) % P.pan.length];
      if (hd != null && rnd() < 0.4 + 0.55 * I) { var hn = byId.handpan.pads, hb = nearest(hn, pc); note('handpan', hn[clamp(hb + hd - 1, 0, 7)], t, LOUD.handpan * (0.6 + 0.3 * rnd()) * (0.6 + 0.4 * I)); }
    }
    // the wooden flute: a short phrase of long notes, then a rest
    if (on('flute') && entered('flute', st) && st >= P.fluteAt) {
      var fn = byId.flute.pads, fi = nearest(fn, rnd() < 0.6 ? pc : (pc + 7) % 12), n = 2 + ri(3), ft = t;
      for (var q = 0; q < n; q++) { var d = (2 + ri(3)) * 2 * E; note('flute', fn[fi], ft, LOUD.flute * (0.75 + 0.25 * I), d * 0.95); ft += d; fi = clamp(fi + (rnd() < 0.5 ? -1 : 1) * (1 + (rnd() < 0.25 ? 1 : 0)), 0, 7); }
      P.fluteAt = st + (ft - t) + (6 + ri(10)) * 2 * E;
    }
    // the rain stick: a slow tilt now and then
    if (on('rain') && entered('rain', st) && st >= P.rainAt) {
      var rd = 3 + rnd() * 3; note('rain', 3 + ri(5), t, LOUD.rain * (0.5 + 0.5 * I), rd); P.rainAt = st + rd + 5 + rnd() * 10;
    }
  }
  function tick() {
    if (!P.playing || P.paused) return;
    if (!ready()) { pause('sound'); return; }
    var now = ctx.currentTime;
    if (now > P.lastT) { P.el += now - P.lastT; P.lastT = now; }
    if (finite()) {
      // the soft ending: the whole song fades over its last 14 seconds
      if (!P.fadeDone && P.el > P.len - 14) { P.fadeDone = true; fadeBus(0.0001, Math.max(1, P.len - P.el + 1)); }
      if (P.el >= P.len + 1.5) { finish(); return; }
    }
    var guard = 0;
    while (P.nextT < now + 0.5 && guard++ < 16) { if (P.nextT < now) P.nextT = now + 0.02; step(P.step, P.nextT); P.nextT += e8(); P.step++; }
  }
  function fadeBus(to, secs) {
    if (!bus) return; var now = ctx.currentTime, g = bus.gain;
    try { g.cancelScheduledValues(now); g.setValueAtTime(Math.max(0.0001, g.value), now); g.linearRampToValueAtTime(Math.max(0.0001, to), now + secs); } catch (e) {}
  }
  function startSong() {
    if (!ready()) { soundNeeded(); return false; }
    P.playing = true; P.paused = false; P.len = saved.len; P.el = 0; P.step = 0; P.lastT = ctx.currentTime; P.nextT = ctx.currentTime + 0.15;
    P.seed = rnd() * 6.28; P.kal = motif(16, 0.45); P.pan = motif(8, 0.5); P.fluteAt = 0; P.rainAt = 0; P.droneUntil = 0; P.finalDone = false; P.fadeDone = false; P.why = '';
    var s = songById[mix.from]; P.prog = s ? s.prog : SONGS[ri(SONGS.length)].prog;
    applyParts(0.05); fadeBus(1, 6);
    clearInterval(timerId); timerId = setInterval(tick, 90); tick();
    clearInterval(uiId); uiId = setInterval(paintTime, 500);
    announce('Playing ' + nowName() + (finite() ? ' for ' + Math.round(P.len / 60) + ' minutes.' : ', with no set end.') + ' It starts softly.');
    paintTransport(); return true;
  }
  function pause(why) {
    if (!P.playing || P.paused) return;
    P.paused = true; P.why = why || '';
    if (ctx) { var now = ctx.currentTime; if (now > P.lastT) P.el += now - P.lastT; P.lastT = now; }
    if (bus && ctx) fadeBus(0.0001, 0.5);
    if (why === 'sound') announce('Paused, because Sound is off.'); else if (why !== 'hide') announce('Paused at ' + clock(P.el) + '.');
    paintTransport(); paintTime();
  }
  function resume() {
    if (!P.playing || !P.paused) return;
    if (!ready()) { soundNeeded(); return; }
    P.paused = false; P.why = ''; P.lastT = ctx.currentTime; P.nextT = ctx.currentTime + 0.12;
    if (finite() && P.el > P.len - 14) fadeBus(0.0001, Math.max(1, P.len - P.el + 1)); else fadeBus(1, 2);
    announce('Playing again.'); paintTransport();
  }
  function stop(quiet) {
    if (!P.playing) return;
    P.playing = false; P.paused = false; clearInterval(timerId); clearInterval(uiId);
    if (bus && ctx && ctx.state !== 'closed') fadeBus(0.0001, 1.2);
    if (!quiet) announce('Stopped.');
    paintTransport(); paintTime();
  }
  function finish() {
    stop(true); var say = $('#bd-mu-now'); if (say) say.textContent = 'That is the end of the song. Take a moment before you move on.';
    announce('The song has ended.');
  }
  // the parts follow the mixer right away (a short glide, so nothing jumps)
  function applyParts(tau) {
    if (!ctx || !partG.chimes) return; var now = ctx.currentTime;
    INST.forEach(function (d) { var p = mix.parts[d.id], g = partG[d.id].gain; try { g.cancelScheduledValues(now); g.setTargetAtTime(p.on ? p.vol : 0, now, tau == null ? 0.35 : tau); } catch (e) {} });
  }

  // ---------- the page ----------
  var root = null;
  function announce(t) { var l = $('#bd-mu-live'); if (!l) return; l.textContent = ''; setTimeout(function () { l.textContent = t; }, 40); }
  function clock(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function nowName() { var s = songById[mix.from]; if (mix.name) return mix.name; return s ? s.name : 'your mix'; }
  function quietSite() { try { return !!(window.TOLQuiet && window.TOLQuiet.sound && !window.TOLQuiet.sound()); } catch (e) { return false; } }
  function soundNeeded() {
    var s = $('#bd-mu-snd'); if (s) s.hidden = false;
    var b = $('#bd-mu-sndbtn'); if (b) { try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } }
    say('Sound is off. Turn it on here, or with Sound at the top of the page, to hear the instruments.');
  }
  function say(t) { var p = $('#bd-mu-say'); if (p) p.textContent = t; announce(t); }
  function paintSound() {
    var s = $('#bd-mu-snd'); if (!s) return; s.hidden = !!A.on;
    var t = $('#bd-mu-sndtxt'); if (t) t.textContent = quietSite() ? 'Sound is off (Quiet mode is on for the site). You can still turn it on for the dojo:' : 'Sound is off right now.';
  }
  var sel = 3;   // the kalimba is in your hands first
  function paintPads() {
    var d = INST[sel], h = $('#bd-pads-h'), box = $('#bd-pads'); if (!h || !box) return;
    h.textContent = d.id === 'rain' ? 'Rain stick: short to long tilts (keys 1 to 8)' : d.name + ': notes, low to high (keys 1 to 8)';
    box.setAttribute('data-id', d.id);
    box.innerHTML = d.pads.map(function (p, i) {
      var lab = d.id === 'rain' ? 'tilt ' + (i + 1) + ' of 8' : 'note ' + (i + 1) + ' of 8, ' + NAME[p % 12] + (d.id === 'drone' ? ' drone' : '');
      var txt = d.id === 'rain' ? (i + 1) : NAME[p % 12];
      return '<button type="button" class="bd-pad" data-p="' + i + '" style="--k:' + (i / 7).toFixed(2) + '" aria-label="' + esc(d.name + ', ' + lab) + '"><b>' + txt + '</b><small aria-hidden="true">' + (i + 1) + '</small></button>';
    }).join('');
    $$('.bd-inst').forEach(function (b, i) { b.setAttribute('aria-pressed', String(i === sel)); });
  }
  function padHit(i) {
    var b = $('#bd-pads .bd-pad[data-p="' + i + '"]');
    if (b) { b.classList.remove('is-hit'); void b.offsetWidth; b.classList.add('is-hit'); setTimeout(function () { b.classList.remove('is-hit'); }, 700); }
    if (!tap(INST[sel].id, i)) soundNeeded(); else { var p = $('#bd-mu-say'); if (p && /Sound is off/.test(p.textContent)) p.textContent = ''; }
  }
  function paintTransport() {
    var b = $('#bd-mu-play'), st = $('#bd-mu-stop'); if (!b) return;
    b.textContent = !P.playing ? 'Play' : P.paused ? 'Resume' : 'Pause';
    b.setAttribute('aria-label', !P.playing ? 'Play ' + nowName() : P.paused ? 'Resume ' + nowName() : 'Pause ' + nowName());
    st.disabled = !P.playing;
    if (root) root.classList.toggle('is-playing', P.playing && !P.paused);
    var nw = $('#bd-mu-now');
    if (nw) nw.textContent = P.playing ? (P.paused ? 'Paused: ' : 'Now playing: ') + nowName() + ', ' + partsOn(mix) + ' instrument' + (partsOn(mix) === 1 ? '' : 's') + ', ' + mix.tempo + ' pace.' : 'Ready: ' + nowName() + '.';
  }
  function paintTime() {
    var t = $('#bd-mu-time'), bar = $('#bd-mu-bar'); if (!t) return;
    var el = P.playing ? P.el + (P.paused || !ctx ? 0 : Math.max(0, ctx.currentTime - P.lastT)) : 0, len = P.playing ? P.len : saved.len;
    t.textContent = len > 0 ? clock(Math.min(el, len)) + ' / ' + clock(len) : clock(el) + ' (no set end)';
    if (bar) bar.style.width = len > 0 ? (100 * Math.min(1, el / len)).toFixed(1) + '%' : '0%';
  }
  function paintMixer() {
    INST.forEach(function (d) {
      var p = mix.parts[d.id], b = $('#bd-mx-' + d.id), r = $('#bd-mv-' + d.id);
      if (b) { b.setAttribute('aria-pressed', String(p.on)); $('b', b).textContent = p.on ? 'on' : 'off'; }
      if (r) { r.value = Math.round(p.vol * 100); r.setAttribute('aria-valuetext', Math.round(p.vol * 100) + ' percent'); r.closest('.bd-mx-row').classList.toggle('is-off', !p.on); }
    });
    var tp = $('input[name="bd-mu-tempo"][value="' + mix.tempo + '"]'); if (tp) tp.checked = true;
    var sg = $('input[name="bd-mu-song"][value="' + mix.from + '"]'); $$('input[name="bd-mu-song"]').forEach(function (x) { x.checked = x === sg && !mix.name && !mix.edited; });
  }
  function paintSaved() {
    var ul = $('#bd-mx-list'); if (!ul) return;
    if (!saved.mixes.length) { ul.innerHTML = '<li class="bd-mx-none">No saved mixes yet.</li>'; return; }
    ul.innerHTML = saved.mixes.map(function (m, i) {
      var names = INST.filter(function (d) { return m.parts[d.id].on; }).map(function (d) { return d.name.toLowerCase(); });
      return '<li><span class="bd-mx-n"><b>' + esc(m.name) + '</b><small>' + esc(names.join(', ') || 'no instruments') + ', ' + m.tempo + '</small></span>' +
        '<button type="button" class="bd-pill" data-play="' + i + '" aria-label="Play ' + esc(m.name) + '">Play</button><button type="button" class="bd-pill" data-del="' + i + '" aria-label="Remove ' + esc(m.name) + '">Remove</button></li>';
    }).join('');
  }
  function useMix(m, label) {
    mix = cleanMix(m) || mixFromSong(SONGS[0]); if (label) mix.name = label;
    if (ctx) applyParts();
    paintMixer(); paintTransport();
  }
  function edited() { mix.edited = true; if (mix.name) mix.name = ''; paintMixer(); paintTransport(); if (P.playing) applyParts(); }

  function build_ui() {
    root = $('#bd-music'); if (!root) return false;
    var shelf = INST.map(function (d) {
      return '<button type="button" class="bd-inst" data-id="' + d.id + '" aria-pressed="false" aria-label="' + esc(d.name + ': ' + d.about + '. Play it, and show its notes below') + '">' +
        '<span class="bd-inst-glow" aria-hidden="true"></span><svg viewBox="0 0 80 64" aria-hidden="true" focusable="false">' + DEFS + ART[d.id] + '</svg><span class="bd-inst-n">' + esc(d.name) + '</span></button>';
    }).join('');
    var songs = SONGS.map(function (s) {
      return '<label class="bd-song"><input type="radio" name="bd-mu-song" value="' + s.id + '"><span><b>' + esc(s.name) + '</b><small>' + esc(s.about) + '</small></span></label>';
    }).join('');
    var lens = [[300, '5 minutes'], [600, '10 minutes'], [1200, '20 minutes'], [0, 'No set end']].map(function (l) {
      return '<label class="bd-opt"><input type="radio" name="bd-mu-len" value="' + l[0] + '"' + (saved.len === l[0] ? ' checked' : '') + '><span>' + l[1] + '</span></label>';
    }).join('');
    var rows = INST.map(function (d) {
      return '<div class="bd-mx-row"><button type="button" class="bd-mx-tg" id="bd-mx-' + d.id + '" data-id="' + d.id + '" aria-pressed="false">' + esc(d.name) + ': <b>off</b></button>' +
        '<label class="sr-only" for="bd-mv-' + d.id + '">' + esc(d.name) + ' volume</label><input type="range" class="bd-mx-vol" id="bd-mv-' + d.id + '" data-id="' + d.id + '" min="0" max="100" step="5" value="60"></div>';
    }).join('');
    root.innerHTML =
      '<div class="bd-mu-head"><h3 id="bd-mu-h">The music corner</h3>' +
      '<p class="bd-note">Tap an instrument to play it, then play its notes one by one. Every note comes from one calm scale, so anything played together fits.</p>' +
      '<p class="bd-mu-snd" id="bd-mu-snd"><span id="bd-mu-sndtxt">Sound is off right now.</span> <button type="button" class="bd-pill" id="bd-mu-sndbtn">Turn sound on</button></p></div>' +
      '<div class="bd-shelf" role="group" aria-label="Instruments">' + shelf + '</div>' +
      '<div class="bd-pads-w"><p class="bd-pads-h" id="bd-pads-h"></p><div class="bd-pads" id="bd-pads" role="group" aria-labelledby="bd-pads-h"></div></div>' +
      '<p class="bd-mu-say" id="bd-mu-say"></p><p class="sr-only" id="bd-mu-live" role="status" aria-live="polite"></p>' +
      '<details class="bd-mu-box" id="bd-mu-songs" open><summary>Songs to sit with</summary>' +
      '<p class="bd-note">Longer pieces that play by themselves. The patterns change slowly and always stay in the same calm key. Each one starts softly and ends softly, so you can close your eyes and let it run.</p>' +
      '<fieldset class="bd-fs"><legend>Song</legend><div class="bd-songs">' + songs + '</div></fieldset>' +
      '<fieldset class="bd-fs"><legend>How long</legend><div class="bd-ch">' + lens + '</div></fieldset>' +
      '<div class="bd-transport"><button type="button" class="bd-go" id="bd-mu-play">Play</button><button type="button" class="bd-pill" id="bd-mu-stop" disabled>Stop</button>' +
      '<span class="bd-mu-time" id="bd-mu-time" role="timer" aria-live="off"></span></div>' +
      '<div class="bd-mu-prog" aria-hidden="true"><span id="bd-mu-bar"></span></div><p class="bd-note bd-mu-now" id="bd-mu-now"></p></details>' +
      '<details class="bd-mu-box" id="bd-mu-mix"><summary>Make your own mix</summary>' +
      '<p class="bd-note">Turn each instrument’s part on or off and set how loud it is. You hear every change right away while a song plays, and the parts always blend because they share one key.</p>' +
      '<div class="bd-mx-rows">' + rows + '</div>' +
      '<fieldset class="bd-fs"><legend>Pace</legend><div class="bd-ch"><label class="bd-opt"><input type="radio" name="bd-mu-tempo" value="slow"><span>Slow</span></label><label class="bd-opt"><input type="radio" name="bd-mu-tempo" value="slower"><span>Slower</span></label></div></fieldset>' +
      '<div class="bd-row"><button type="button" class="bd-pill" id="bd-mx-sur">Surprise me</button><button type="button" class="bd-pill" id="bd-mx-play">Play this mix</button></div>' +
      '<form class="bd-mx-save" id="bd-mx-save"><label for="bd-mx-name">Name this mix</label><div class="bd-mx-saverow"><input class="bd-text" id="bd-mx-name" type="text" maxlength="30" autocomplete="off" placeholder="For example: Slow rain"><button type="submit" class="bd-pill">Save on this device</button></div></form>' +
      '<p class="bd-note">Saved mixes stay in this browser, on this device.</p><ul class="bd-mx-list" id="bd-mx-list"></ul></details>';
    return true;
  }

  function wire() {
    root.addEventListener('click', function (e) {
      var t = e.target;
      var inst = t.closest('.bd-inst');
      if (inst) { sel = byId[inst.getAttribute('data-id')].i; paintPads(); if (!tap(INST[sel].id, INST[sel].id === 'drone' ? 5 : 3)) soundNeeded(); else { var p = $('#bd-mu-say'); if (p) p.textContent = ''; } return; }
      var pad = t.closest('.bd-pad'); if (pad) { padHit(+pad.getAttribute('data-p')); return; }
      var tg = t.closest('.bd-mx-tg');
      if (tg) { var id = tg.getAttribute('data-id'), p2 = mix.parts[id]; p2.on = !p2.on; if (p2.on && p2.vol < 0.05) p2.vol = 0.5; edited(); if (p2.on && P.playing && !P.paused && ctx) P.droneUntil = 0; return; }
      var pl = t.closest('[data-play]'); if (pl) { var m = saved.mixes[+pl.getAttribute('data-play')]; if (m) { useMix(m, m.name); if (P.playing) { if (P.paused) resume(); announce('Now playing ' + m.name + '.'); } else startSong(); } return; }
      var dl = t.closest('[data-del]'); if (dl) { var i = +dl.getAttribute('data-del'), nm = saved.mixes[i] && saved.mixes[i].name; saved.mixes.splice(i, 1); store(); paintSaved(); announce((nm || 'The mix') + ' was removed from this device.'); var f = $('#bd-mx-name'); if (f) f.focus(); return; }
    });
    // keys 1 to 8 play the notes of the instrument in your hands (when the music corner has focus)
    root.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var a = e.target; if (a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && a.type === 'text'))) return;
      if (/^[1-8]$/.test(e.key)) { e.preventDefault(); padHit(+e.key - 1); }
    });
    $('#bd-mu-sndbtn').addEventListener('click', function () { A.toggle(true); paintSound(); if (A.on) say('Sound is on. Tap an instrument.'); });
    $('#bd-mu-play').addEventListener('click', function () { if (!P.playing) startSong(); else if (P.paused) resume(); else pause(); });
    $('#bd-mu-stop').addEventListener('click', function () { stop(); $('#bd-mu-play').focus(); });
    $$('input[name="bd-mu-song"]').forEach(function (r) {
      r.addEventListener('change', function () {
        if (!r.checked) return; var s = songById[r.value]; saved.song = s.id; store(); useMix(mixFromSong(s));
        if (P.playing) { P.prog = s.prog; P.droneUntil = 0; announce('Now playing ' + s.name + '.'); }
      });
    });
    $$('input[name="bd-mu-len"]').forEach(function (r) {
      r.addEventListener('change', function () {
        if (!r.checked) return; saved.len = +r.value; store();
        if (P.playing) { P.len = saved.len > 0 ? Math.max(saved.len, P.el + 30) : 0; P.fadeDone = false; P.finalDone = false; if (!P.paused) fadeBus(1, 2); }
        paintTime();
      });
    });
    $$('input[name="bd-mu-tempo"]').forEach(function (r) { r.addEventListener('change', function () { if (r.checked) { mix.tempo = r.value; edited(); } }); });
    $$('.bd-mx-vol').forEach(function (r) {
      r.addEventListener('input', function () { var p = mix.parts[r.getAttribute('data-id')]; p.vol = clamp(+r.value / 100, 0, 1); if (p.vol > 0.01 && !p.on) p.on = true; edited(); });
    });
    $('#bd-mx-sur').addEventListener('click', function () {
      var m = blankMix(), pool = U.shuffle(INST.map(function (d) { return d.id; }).filter(function (id) { return id !== 'drone'; })), n = 3 + ri(3);
      pool.slice(0, n).forEach(function (id) { m.parts[id] = { on: true, vol: Math.round((0.35 + rnd() * 0.5) * 20) / 20 }; });
      if (rnd() < 0.8) m.parts.drone = { on: true, vol: Math.round((0.35 + rnd() * 0.35) * 20) / 20 };
      m.tempo = rnd() < 0.5 ? 'slow' : 'slower'; m.from = SONGS[ri(SONGS.length)].id;
      useMix(m, ''); mix.edited = true; paintMixer();
      var names = INST.filter(function (d) { return mix.parts[d.id].on; }).map(function (d) { return d.name.toLowerCase(); }).join(', ');
      if (P.playing) { var s = songById[mix.from]; if (s) P.prog = s.prog; P.droneUntil = 0; if (P.paused) resume(); announce('A surprise mix: ' + names + '.'); }
      else if (!startSong()) say('A surprise mix is ready: ' + names + '. Turn Sound on to hear it.');
    });
    $('#bd-mx-play').addEventListener('click', function () { if (!P.playing) startSong(); else if (P.paused) resume(); else announce('Your mix is playing.'); });
    $('#bd-mx-save').addEventListener('submit', function (e) {
      e.preventDefault();
      var inp = $('#bd-mx-name'), nm = (inp.value || '').replace(/[<>]/g, '').trim().slice(0, 30) || 'My mix ' + (saved.mixes.length + 1);
      if (!partsOn(mix)) { say('Turn at least one instrument on before saving.'); return; }
      var copy = cleanMix(mix); copy.name = nm;
      saved.mixes = saved.mixes.filter(function (m) { return m.name !== nm; }); saved.mixes.unshift(copy); saved.mixes = saved.mixes.slice(0, 8);
      if (!U.lsSet(KEY, JSON.stringify({ v: 1, len: saved.len, song: saved.song, mixes: saved.mixes }))) say('This browser would not keep it (storage may be full or blocked).');
      else say('Saved "' + nm + '" on this device.');
      inp.value = ''; mix.name = nm; mix.edited = false; paintSaved(); paintTransport();
    });
  }

  // ---------- sound on and off, leaving the room, the page going away ----------
  function hook() {
    var orig = A.toggle;
    A.toggle = function () {
      var r = orig.apply(A, arguments); paintSound();
      if (!A.on && P.playing && !P.paused) pause('sound');
      else if (A.on && P.playing && P.paused && P.why === 'sound') resume();   // paused only because Sound went off: carry on
      return r;
    };
    var inn = $('#bd-inside');
    if (inn && window.MutationObserver) new MutationObserver(function () { if (inn.hidden && P.playing) stop(true); }).observe(inn, { attributes: true, attributeFilter: ['hidden'] });
    window.addEventListener('pagehide', function () { if (P.playing && !P.paused) pause('hide'); });
    // while the page is hidden the dojo suspends its audio clock, so the song and its timer simply wait
  }

  function start() {
    U = BD.util; A = BD.audio; if (!U || !A) return;
    load();
    var s = songById[saved.song] || SONGS[0]; mix = mixFromSong(s);
    if (!build_ui()) return;
    wire(); hook();
    paintPads(); paintMixer(); paintSaved(); paintTransport(); paintTime(); paintSound();
    BD.music = { tap: tap, play: startSong, pause: pause, resume: resume, stop: stop, state: function () { return { playing: P.playing, paused: P.paused, el: P.el, len: P.len, mix: JSON.parse(JSON.stringify(mix)) }; }, songs: SONGS.map(function (x) { return x.id; }), seek: function (sec) { if (P.playing) { P.el = Math.max(0, +sec || 0); P.fadeDone = false; P.finalDone = false; } }, instruments: INST.map(function (d) { return d.id; }) };
  }
  if (BD.ready) start(); else doc.addEventListener('bears-dojo-ready', start);
})();
