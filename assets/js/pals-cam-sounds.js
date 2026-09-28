/* pals-cam-sounds.js — soft, made-on-the-spot dog sounds for the pal cam.
   Everything is synthesized with Web Audio (no sound files): little yips, arfs, soft boofs,
   happy whines, sniffs, pants, sighs, sneezes, a tiny awoo, a squeaky toy and a playful grumble.
   Tidbit's voice is higher and quicker; Sugarfoot's is lower, slower and softer.
   Gentle on purpose: a quiet master level, a soft limiter, and never two sounds on top of each other.
   The pal cam calls TOLPalsCamSounds.bubble / trick / tick; the on/off choice is remembered on this
   device only (localStorage), and nothing is sent anywhere. */
(function () {
  'use strict';
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, noiseBuf = null, lastAt = 0, lastKey = '', lastKeyAt = 0, nextAmb = 0, clockMs = 0;
  var VOICE = [
    { p: 1.24, sp: 1.12, v: 1 },     // Tidbit: the big smile, quick and curious
    { p: 0.86, sp: 0.88, v: 0.85 }   // Sugarfoot: the gentle wag, steady and soft
  ];
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var enabled = lsGet('tol-palcam-sound') !== 'off';

  function ensure() {
    if (!AC || !enabled) return false;
    if (!ctx) {
      try { ctx = window.__pcAudio || new AC(); } catch (e) { return false; }
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -24; comp.knee.value = 18; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.2;
      var soft = ctx.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 5200; // nothing sharp
      master = ctx.createGain(); master.gain.value = 0.38;
      master.connect(soft); soft.connect(comp); comp.connect(ctx.destination);
      var n = ctx.sampleRate, b = ctx.createBuffer(1, n, n), d = b.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      noiseBuf = b;
    }
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(function () {});
    return ctx.state !== 'closed';
  }

  // ---------- building blocks ----------
  function env(g, t, a, peak, hold, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.setValueAtTime(Math.max(peak, 0.0002), t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  }
  function tone(t, type, freqs, dur, peak, o) {
    o = o || {};
    var os = ctx.createOscillator(), g = ctx.createGain(), out = g;
    os.type = type;
    os.frequency.setValueAtTime(freqs[0], t);
    for (var i = 1; i < freqs.length; i++) os.frequency.exponentialRampToValueAtTime(freqs[i], t + dur * i / (freqs.length - 1));
    if (o.vib) { var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; lfo.connect(lg); lg.connect(os.frequency); lfo.start(t); lfo.stop(t + dur + 0.1); }
    if (o.am) { var am = ctx.createOscillator(), ag = ctx.createGain(), depth = ctx.createGain(); am.frequency.value = o.am; depth.gain.value = 0.5; ag.gain.value = 0.5; am.connect(depth); depth.connect(ag.gain); am.start(t); am.stop(t + dur + 0.1); g.connect(ag); out = ag; }
    var f = null;
    if (o.lp || o.bp) { f = ctx.createBiquadFilter(); f.type = o.bp ? 'bandpass' : 'lowpass'; f.frequency.value = o.bp || o.lp; f.Q.value = o.q || 0.9; }
    os.connect(g);
    if (f) { out.connect(f); f.connect(master); } else out.connect(master);
    env(g, t, o.a || 0.012, peak, o.hold || 0, Math.max(0.02, dur - (o.a || 0.012) - (o.hold || 0)));
    os.start(t); os.stop(t + dur + 0.05);
  }
  function noise(t, dur, peak, type, freq, q, o) {
    o = o || {};
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.playbackRate.value = o.rate || 1;
    f.type = type; f.frequency.setValueAtTime(freq, t); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur); f.Q.value = q || 0.8;
    s.connect(f); f.connect(g); g.connect(master);
    env(g, t, o.a || 0.01, peak, o.hold || 0, Math.max(0.02, dur - (o.a || 0.01) - (o.hold || 0)));
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  // ---------- the sounds (who: 0 Tidbit, 1 Sugarfoot) ----------
  var S = {
    yip: function (t, v) { // a bright little "yip!" (twice, sometimes)
      var n = Math.random() < 0.5 ? 2 : 1;
      for (var k = 0; k < n; k++) {
        var s = t + k * 0.15 / v.sp;
        tone(s, 'triangle', [760 * v.p, 1120 * v.p, 880 * v.p], 0.1 / v.sp, 0.6 * v.v, { bp: 1500 * v.p, q: 0.7, a: 0.006 });
        noise(s, 0.05, 0.08 * v.v, 'bandpass', 2600, 1.2);
      }
    },
    arf: function (t, v) { // a friendly "arf"
      tone(t, 'triangle', [420 * v.p, 520 * v.p, 300 * v.p], 0.16 / v.sp, 0.5 * v.v, { bp: 1000 * v.p, q: 0.8, a: 0.008 });
      tone(t, 'sine', [210 * v.p, 150 * v.p], 0.14 / v.sp, 0.25 * v.v, { lp: 900 });
      noise(t, 0.08, 0.12 * v.v, 'bandpass', 1300 * v.p, 1);
    },
    boof: function (t, v) { // a soft, low "boof" (more of a puff than a bark)
      tone(t, 'sine', [200 * v.p, 128 * v.p], 0.2 / v.sp, 0.55 * v.v, { lp: 650, a: 0.01 });
      noise(t, 0.12, 0.1 * v.v, 'lowpass', 900, 0.7);
    },
    whine: function (t, v) { // a happy little whine, up and down
      tone(t, 'sine', [900 * v.p, 1260 * v.p, 1080 * v.p, 1180 * v.p], 0.6 / v.sp, 0.2 * v.v, { vib: [7, 22], a: 0.05, lp: 2400 });
    },
    hmm: function (t, v) { // a curious rising "hmm?"
      tone(t, 'sine', [520 * v.p, 820 * v.p], 0.28 / v.sp, 0.22 * v.v, { a: 0.04, lp: 1800, vib: [5, 8] });
    },
    awoo: function (t, v) { // a tiny, soft "awoo"
      tone(t, 'sine', [430 * v.p, 660 * v.p, 600 * v.p, 520 * v.p], 1.1 / v.sp, 0.22 * v.v, { vib: [5.5, 14], a: 0.12, lp: 1600 });
      tone(t, 'triangle', [860 * v.p, 1320 * v.p, 1200 * v.p, 1040 * v.p], 1.1 / v.sp, 0.05 * v.v, { a: 0.14, lp: 2000 });
    },
    pant: function (t, v) { // happy panting: hah-hah-hah
      for (var k = 0; k < 6; k++) noise(t + k * 0.16 / v.sp, 0.08 / v.sp, 0.34 * v.v, 'bandpass', (k % 2 ? 1050 : 1350) * v.p, 1.1, { a: 0.012 });
    },
    sniff: function (t, v) { // sniff sniff sniff
      var n = 3 + Math.floor(Math.random() * 2);
      for (var k = 0; k < n; k++) noise(t + k * 0.1 / v.sp, 0.055, 0.2 * v.v, 'highpass', 2600, 0.7, { a: 0.008 });
    },
    sneeze: function (t, v) { // a tiny "ah-choo"
      tone(t, 'sine', [520 * v.p, 760 * v.p], 0.18, 0.12 * v.v, { a: 0.06, lp: 1500 });
      noise(t + 0.22, 0.13, 0.28 * v.v, 'bandpass', 2400, 0.9, { a: 0.006, to: 1400 });
      tone(t + 0.22, 'triangle', [700 * v.p, 460 * v.p], 0.1, 0.12 * v.v, { lp: 1600 });
    },
    sigh: function (t, v) { // a contented sigh
      noise(t, 0.75 / v.sp, 0.14 * v.v, 'lowpass', 1000, 0.6, { a: 0.18, to: 500 });
      tone(t, 'sine', [230 * v.p, 165 * v.p], 0.7 / v.sp, 0.08 * v.v, { a: 0.15, lp: 700 });
    },
    snore: function (t, v) { // a very soft snore
      noise(t, 1.0, 0.16 * v.v, 'lowpass', 380, 0.8, { a: 0.4, rate: 0.6 });
      tone(t, 'sine', [110 * v.p, 95 * v.p], 1.0, 0.06 * v.v, { a: 0.4, lp: 400 });
    },
    squeak: function (t, v) { // the squeaky toy (the same toy for both of them)
      tone(t, 'sine', [1750, 2350, 1900], 0.13, 0.2, { a: 0.006 });
      tone(t + 0.19, 'sine', [1800, 2450, 2000], 0.12, 0.17, { a: 0.006 });
    },
    grumble: function (t, v) { // a playful, cute grumble (never a real growl)
      tone(t, 'sawtooth', [96 * v.p, 104 * v.p, 90 * v.p], 0.48 / v.sp, 0.24 * v.v, { am: 24, lp: 480, a: 0.06 });
    }
  };

  // ---------- when to make a sound ----------
  function play(who, name, force) {
    if (!enabled || !S[name] || document.hidden) return false;
    if (!ensure()) return false;
    var now = ctx.currentTime;
    if (!force && now - lastAt < 0.7) return false; // never a pile-up
    lastAt = now; nextAmb = Math.max(nextAmb, clockMs + 6000);
    try { S[name](now + 0.02, VOICE[who === 1 ? 1 : 0]); } catch (e) { return false; }
    return true;
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  var SPEAK = [['yip', 'arf', 'whine', 'hmm'], ['boof', 'arf', 'whine', 'hmm']];

  // a speech bubble just appeared
  function bubble(who, text) {
    if (typeof who !== 'number') return;
    var key = who + '|' + text, t = Date.now();
    if (key === lastKey && t - lastKeyAt < 2500) return; lastKey = key; lastKeyAt = t;
    var s = String(text || '').toLowerCase(), name;
    if (/^!+$/.test(s)) name = who ? 'boof' : 'yip';
    else if (s === '?' || /^\?+!?$/.test(s)) name = 'hmm';
    else if (s === '<3' || s.indexOf('♥') !== -1 || s.indexOf('❤') !== -1) name = 'whine';
    else if (/^z+$/.test(s.replace(/\s/g, '')) || s.indexOf('zzz') !== -1) name = 'snore';
    else if (/a+w+o+/.test(s)) name = 'awoo';
    else if (/choo|sneez/.test(s)) name = 'sneeze';
    else if (/sniff/.test(s)) name = 'sniff';
    else if (/woof|arf|bark|ruff/.test(s)) name = who ? 'boof' : 'arf';
    else if (/yay|wow|whee|yes|hooray|ooh/.test(s)) name = who ? 'arf' : 'yip';
    else if (Math.random() < 0.6) name = pick(SPEAK[who]);
    if (name) play(who, name);
  }
  // a trick on request: always answered
  function trick(who) { play(who, pick(who ? ['boof', 'arf', 'whine', 'squeak'] : ['yip', 'arf', 'squeak', 'whine']), true); }
  // the cam is running: now and then a little everyday sound
  function tick(dt, running) {
    if (!running || !enabled) return;
    clockMs += dt;
    if (!nextAmb) nextAmb = clockMs + 9000 + Math.random() * 8000;
    if (clockMs < nextAmb) return;
    nextAmb = clockMs + 14000 + Math.random() * 18000;
    var who = Math.random() < 0.5 ? 0 : 1, r = Math.random();
    play(who, r < 0.2 ? 'sniff' : r < 0.38 ? 'pant' : r < 0.52 ? 'sigh' : r < 0.64 ? 'grumble' : r < 0.76 ? (who ? 'boof' : 'yip') : r < 0.86 ? 'hmm' : r < 0.93 ? 'sneeze' : 'awoo');
  }
  function hush() { if (ctx && ctx.state === 'running' && ctx.suspend) ctx.suspend().catch(function () {}); }
  function wake() { if (enabled && ctx && ctx.state === 'suspended') ctx.resume().catch(function () {}); }
  function setOn(v) {
    enabled = !!v; lsSet('tol-palcam-sound', enabled ? 'on' : 'off');
    if (enabled) { ensure(); play(Math.random() < 0.5 ? 0 : 1, 'arf', true); } else hush();
    return enabled;
  }

  window.TOLPalsCamSounds = {
    bubble: bubble, trick: trick, tick: tick, hush: hush, wake: wake, play: play,
    on: function () { return enabled; }, set: setOn, toggle: function () { return setOn(!enabled); },
    names: function () { return Object.keys(S); }, supported: !!AC
  };
})();
