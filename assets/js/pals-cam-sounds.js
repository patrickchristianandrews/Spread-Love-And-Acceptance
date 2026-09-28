/* pals-cam-sounds.js — cute cartoon sounds for the pal cam.
   All made on the spot with Web Audio (no sound files), in a bright, musical, cartoon style:
   playful barks, sweet puppy whimpers, giggles, a tiny awoo and a whistle-snore for the pups,
   plus fun effects that match what they're doing: "ooh-ooh-ah-ah" monkey hoots, a spaceship
   "wooo-eee-ooo", laser "pew-pew", boings, slide whistles, sparkle chimes, bubble pops, a kazoo,
   a clown-horn honk and a little "ta-da!".
   Tidbit's voice is higher and quicker; Sugarfoot's is lower, slower and softer.
   Gentle on purpose: a soft master level, a light echo, a limiter, and never a pile-up.
   The pal cam calls TOLPalsCamSounds.bubble / trick / act / tick. The on/off choice is remembered
   on this device only (localStorage), and nothing is sent anywhere. */
(function () {
  'use strict';
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, bus = null, wet = null, lastAt = 0, lastKey = '', lastKeyAt = 0, nextAmb = 0, clockMs = 0, noiseBuf = null;
  var VOICE = [
    { p: 1.22, sp: 1.12, v: 1 },     // Tidbit: the big smile, quick and curious
    { p: 0.84, sp: 0.9, v: 0.9 }     // Sugarfoot: the gentle wag, steady and soft
  ];
  var PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  function semi(f, n) { return f * Math.pow(2, n / 12); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var enabled = lsGet('tol-palcam-sound') !== 'off';

  function ensure() {
    if (!AC || !enabled) return false;
    if (!ctx) {
      try { ctx = window.__pcAudio || new AC(); } catch (e) { return false; }
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20; comp.knee.value = 14; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.18;
      var master = ctx.createGain(); master.gain.value = 0.42;
      var tame = ctx.createBiquadFilter(); tame.type = 'lowpass'; tame.frequency.value = 7000;
      bus = ctx.createGain(); bus.gain.value = 1;
      // a light, sweet echo
      var dl = ctx.createDelay(1), fb = ctx.createGain(), dlp = ctx.createBiquadFilter();
      dl.delayTime.value = 0.17; fb.gain.value = 0.28; dlp.type = 'lowpass'; dlp.frequency.value = 3200;
      wet = ctx.createGain(); wet.gain.value = 0.22;
      bus.connect(tame); bus.connect(wet); wet.connect(dl); dl.connect(dlp); dlp.connect(fb); fb.connect(dl); dlp.connect(tame);
      tame.connect(master); master.connect(comp); comp.connect(ctx.destination);
      var n = ctx.sampleRate, b = ctx.createBuffer(1, n, n), d = b.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      noiseBuf = b;
    }
    if (ctx.state === 'suspended' && ctx.resume) { try { var pr = ctx.resume(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} }
    return ctx.state !== 'closed';
  }

  // ---------- building blocks ----------
  // a note: glides through the given frequencies, with an optional wobble (vib), brightness (fm) and vowel (bp)
  function note(t, f, dur, peak, o) {
    o = o || {};
    var fs = typeof f === 'number' ? [f] : f;
    var os = ctx.createOscillator(), g = ctx.createGain(), out = g;
    os.type = o.type || 'sine';
    os.frequency.setValueAtTime(fs[0], t);
    for (var i = 1; i < fs.length; i++) {
      var at = t + dur * (o.curve ? Math.pow(i / (fs.length - 1), o.curve) : i / (fs.length - 1));
      if (o.lin) os.frequency.linearRampToValueAtTime(fs[i], at); else os.frequency.exponentialRampToValueAtTime(fs[i], at);
    }
    if (o.vib) { var l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.vib[0]; lg.gain.setValueAtTime(o.vib[1], t); if (o.vibTo != null) lg.gain.linearRampToValueAtTime(o.vibTo, t + dur); l.connect(lg); lg.connect(os.frequency); l.start(t); l.stop(t + dur + 0.1); }
    if (o.fm) { var m = ctx.createOscillator(), mg = ctx.createGain(); m.frequency.setValueAtTime(fs[0] * (o.fmr || 2), t); mg.gain.setValueAtTime(fs[0] * o.fm, t); mg.gain.exponentialRampToValueAtTime(Math.max(1, fs[0] * o.fm * 0.08), t + dur); m.connect(mg); mg.connect(os.frequency); m.start(t); m.stop(t + dur + 0.1); }
    os.connect(g);
    if (o.bp) { var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = o.q || 2; var bps = typeof o.bp === 'number' ? [o.bp] : o.bp; bp.frequency.setValueAtTime(bps[0], t); if (bps[1]) bp.frequency.exponentialRampToValueAtTime(bps[1], t + dur); g.connect(bp); out = bp; }
    if (o.lp) { var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp; out.connect(lp); out = lp; }
    out.connect(bus);
    var a = o.a || 0.01, rel = Math.max(0.03, dur - a - (o.hold || 0));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    if (o.hold) g.gain.setValueAtTime(peak, t + a + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + (o.hold || 0) + rel);
    os.start(t); os.stop(t + dur + 0.08);
  }
  function air(t, dur, peak, f0, f1, q) { // a soft whoosh
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = q || 1.4;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    s.connect(f); f.connect(g); g.connect(bus);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.start(t, Math.random() * 0.4); s.stop(t + dur + 0.05);
  }

  // ---------- the sounds ----------
  var S = {
    // --- the pups' voices ---
    bark: function (t, v) { // a bouncy cartoon "ruff!"
      var f = 430 * v.p;
      note(t, [f, f * 1.5, f * 1.05], 0.13 / v.sp, 0.34 * v.v, { type: 'triangle', fm: 1.1, fmr: 1, bp: [900 * v.p, 1500 * v.p], q: 1.2, a: 0.006 });
      note(t, [f / 2, f * 0.7], 0.12 / v.sp, 0.12 * v.v, { a: 0.006 });
    },
    barks: function (t, v) { // "arf-arf!" playful double bark, second one higher
      S.bark(t, v); S.bark(t + 0.17 / v.sp, { p: v.p * 1.12, sp: v.sp, v: v.v * 0.9 });
    },
    yip: function (t, v) { // a squeaky little "yip!"
      note(t, [900 * v.p, 1500 * v.p, 1200 * v.p], 0.1 / v.sp, 0.34 * v.v, { type: 'triangle', fm: 0.6, fmr: 1, a: 0.004 });
    },
    whimper: function (t, v) { // cute puppy "mm-mm-mmm?" — three sweet little notes
      var f = 1050 * v.p;
      note(t, [f, f * 1.18, f * 1.08], 0.16 / v.sp, 0.16 * v.v, { vib: [9, 18], a: 0.03 });
      note(t + 0.2 / v.sp, [f * 1.08, f * 1.26, f * 1.14], 0.16 / v.sp, 0.15 * v.v, { vib: [9, 18], a: 0.03 });
      note(t + 0.4 / v.sp, [f * 1.1, f * 1.42, f * 1.3], 0.3 / v.sp, 0.15 * v.v, { vib: [8, 22], a: 0.04 });
    },
    aww: function (t, v) { // a soft, happy sigh-song
      note(t, [760 * v.p, 980 * v.p, 700 * v.p], 0.55 / v.sp, 0.16 * v.v, { vib: [6, 10], a: 0.08, bp: [1200, 800], q: 0.8 });
    },
    giggle: function (t, v) { // "hehehehe!" — quick hops up a happy scale
      for (var k = 0; k < 5; k++) note(t + k * 0.075 / v.sp, [semi(700 * v.p, PENTA[k + 1]), semi(700 * v.p, PENTA[k + 1] + 3)], 0.06, 0.15 * v.v, { type: 'triangle', a: 0.004 });
    },
    ooh: function (t, v) { // a curious, rising "ooh?"
      note(t, [480 * v.p, 820 * v.p], 0.32 / v.sp, 0.32 * v.v, { type: 'triangle', bp: [600, 1100], q: 1.5, a: 0.04, curve: 1.6 });
    },
    awoo: function (t, v) { // a tiny, sweet "awoooo"
      note(t, [520 * v.p, 780 * v.p, 740 * v.p, 640 * v.p], 1.0 / v.sp, 0.18 * v.v, { vib: [5.5, 4], vibTo: 22, a: 0.12, bp: [900, 1300], q: 0.7 });
      note(t, [1040 * v.p, 1560 * v.p, 1480 * v.p, 1280 * v.p], 1.0 / v.sp, 0.04 * v.v, { a: 0.14 });
    },
    snore: function (t, v) { // cartoon snore: a soft "hnnk" then a "wheee-ooo" whistle
      air(t, 0.5, 0.05 * v.v, 300, 500, 2);
      note(t + 0.55, [1900 * v.p, 2300 * v.p, 950 * v.p], 0.75, 0.11 * v.v, { a: 0.1, curve: 0.7 });
    },
    // --- fun effects ---
    monkey: function (t, v) { // "ooh-ooh-ah-ah!" monkey hoots
      var f = 520 * v.p, steps = [0, 3, 7, 10];
      for (var k = 0; k < 4; k++) {
        var s = t + k * 0.16, ah = k >= 2, g = semi(f, steps[k]);
        note(s, [g * 0.9, g * 1.25, g], 0.13, 0.3 * v.v, { type: 'sawtooth', bp: ah ? [1100, 1400] : [520, 700], q: ah ? 3 : 4, a: 0.01, lp: 2600 });
      }
    },
    spaceship: function (t) { // a theremin spaceship: "wooo-eee-ooo"
      note(t, [440, 990, 620, 880, 520], 1.5, 0.14, { vib: [6.5, 25], lin: true, a: 0.1 });
      note(t, [880, 1980, 1240, 1760, 1040], 1.5, 0.03, { a: 0.12, lin: true });
    },
    ufo: function (t) { // a little UFO warble, swooping by
      note(t, [700, 1200, 800], 1.1, 0.12, { type: 'triangle', vib: [11, 110], vibTo: 40, fm: 0.4, fmr: 1.5, a: 0.08 });
    },
    pew: function (t) { // laser "pew-pew"
      for (var k = 0; k < 2; k++) note(t + k * 0.16, [1900, 420], 0.14, 0.13, { type: 'square', lp: 3000, a: 0.003, curve: 0.5 });
    },
    rocket: function (t) { // a rocket lifting off: a soft whoosh and a rising tone
      air(t, 1.0, 0.2, 300, 2200, 0.9);
      note(t + 0.1, [220, 880], 0.9, 0.09, { type: 'triangle', a: 0.2 });
    },
    boing: function (t) { // a springy "boi-oi-oing"
      note(t, [260, 360, 310], 0.55, 0.26, { type: 'triangle', vib: [16, 70], vibTo: 2, a: 0.004, lin: true });
    },
    slideUp: function (t) { note(t, [420, 1500], 0.55, 0.15, { vib: [7, 12], a: 0.03, curve: 1.2 }); }, // slide whistle up
    slideDown: function (t) { note(t, [1400, 380], 0.6, 0.15, { vib: [7, 12], a: 0.03, curve: 0.8 }); }, // and back down
    sparkle: function (t) { // twinkly chimes going up
      var base = 1046, idx = [0, 2, 4, 5, 7];
      for (var k = 0; k < 5; k++) note(t + k * 0.07, semi(base, PENTA[idx[k]]), 0.5, 0.07, { a: 0.003, fm: 0.8, fmr: 3.5 });
    },
    pop: function (t) { // bubble pops: plip-plop-plip
      for (var k = 0; k < 3; k++) note(t + k * (0.09 + Math.random() * 0.05), [700 + Math.random() * 500, 220], 0.07, 0.2, { a: 0.002, curve: 0.4 });
    },
    kazoo: function (t) { // a silly little kazoo tune
      var mel = [0, 4, 7, 4, 12], dur = [0.12, 0.12, 0.12, 0.12, 0.26];
      var s = t; for (var k = 0; k < mel.length; k++) { note(s, semi(392, mel[k]), dur[k], 0.14, { type: 'sawtooth', lp: 1500, vib: [28, 6], a: 0.01 }); s += dur[k] + 0.02; }
    },
    honk: function (t) { // a friendly clown-horn "honk honk"
      for (var k = 0; k < 2; k++) note(t + k * 0.22, [330, 300], 0.16, 0.3, { type: 'sawtooth', bp: 900, q: 2.5, a: 0.01, vib: [30, 8] });
    },
    tada: function (t) { // a little "ta-da!"
      note(t, 523, 0.12, 0.13, { type: 'triangle', a: 0.005 });
      [523, 659, 784, 1046].forEach(function (f) { note(t + 0.16, f, 0.7, 0.07, { type: 'triangle', a: 0.01 }); });
    },
    ding: function (t) { note(t, 1568, 0.9, 0.16, { fm: 1.2, fmr: 3.5, a: 0.003 }); note(t, 3136, 0.6, 0.02, { a: 0.003 }); }, // a bright bell
    squeak: function (t) { note(t, [1700, 2400, 1900], 0.13, 0.13, { a: 0.005 }); note(t + 0.18, [1800, 2500, 2000], 0.12, 0.11, { a: 0.005 }); }, // squeaky toy
    whoosh: function (t) { air(t, 0.45, 0.3, 500, 2600, 1.1); } // a quick "zoom!"
  };

  // ---------- when to make a sound ----------
  function play(who, name, force, delay) {
    if (!enabled || !S[name] || document.hidden) return false;
    if (!ensure()) return false;
    var now = ctx.currentTime;
    if (!force && now - lastAt < 0.9) return false; // never a pile-up
    lastAt = now; nextAmb = Math.max(nextAmb, clockMs + 7000);
    try { S[name](now + 0.02 + (delay || 0), VOICE[who === 1 ? 1 : 0]); } catch (e) { return false; }
    return true;
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  var TALK = [['barks', 'yip', 'giggle', 'whimper', 'ooh', 'bark'], ['bark', 'barks', 'aww', 'whimper', 'ooh', 'giggle']];

  // a speech bubble just appeared over one of them
  function bubble(who, text) {
    if (typeof who !== 'number') return;
    var key = who + '|' + text, t = Date.now();
    if (key === lastKey && t - lastKeyAt < 2500) return; lastKey = key; lastKeyAt = t;
    var s = String(text || '').toLowerCase(), name;
    if (/^!+$/.test(s)) name = who ? 'bark' : 'yip';
    else if (/^\?+!?$/.test(s)) name = 'ooh';
    else if (s === '<3' || s.indexOf('♥') !== -1 || s.indexOf('❤') !== -1) name = 'whimper';
    else if (s.indexOf('zz') !== -1) name = 'snore';
    else if (/a+w+o+/.test(s)) name = 'awoo';
    else if (/woof|arf|bark|ruff/.test(s)) name = 'barks';
    else if (/ha(ha)+|hehe|hee|lol/.test(s)) name = 'giggle';
    else if (/yay|wow|whee|hooray|woo+|ta-?da/.test(s)) name = who ? 'barks' : 'giggle';
    else if (/aww|sweet|love|thank/.test(s)) name = 'aww';
    else if (Math.random() < 0.55) name = pick(TALK[who]);
    if (name) play(who, name);
  }
  // a trick on request: always answered, with a bark and a little flourish
  function trick(who) {
    play(who, who ? pick(['barks', 'bark', 'aww']) : pick(['barks', 'yip', 'giggle']), true);
    play(who, pick(['boing', 'slideUp', 'sparkle', 'tada', 'squeak', 'honk']), true, 0.32);
  }
  // a new activity is starting: a sound that fits it
  var ACT_SOUNDS = [
    [/ufo|alien|teleport/, ['ufo', 'spaceship']],
    [/space|rocket|jetpack|moon|comet|constellation|stardogs|earthrise|zero|robot|galax/, ['spaceship', 'rocket', 'pew', 'ufo']],
    [/fireworks|summerfire|confetti/, ['pew', 'sparkle', 'tada']],
    [/trampoline|pogo|bounce|leapfrog|seesaw|bigball|ballrain|jumprope|hopscotch|cloudbounce|boomerang/, ['boing']],
    [/slide|surf|toboggan|skate|zoomies|swing|carousel|highdive|speedrun|relay|race/, ['slideUp', 'whoosh', 'slideDown']],
    [/magic|wish|sparkle|glow|crystal|firefl|lantern|snowglobe|rainbow|light|dust|star|northern|pearl|jelly|gold|dragon/, ['sparkle', 'ding']],
    [/bubble|popcorn|balloon|pop|sprinkler|puddle|spout|whale/, ['pop']],
    [/drum|band|piano|dj|disco|dance|sing|chorus|concert|waltz|conga|hula|talent|show|party|marchband|birdsong/, ['kazoo', 'tada']],
    [/monkey|jungle|banana|swing|tree|climb|juggle|silly|sockshow|copycat|pillow/, ['monkey']],
    [/honk|clown|carnival|unicycle|circus|pancake|sandwich|pizza/, ['honk', 'boing']],
    [/nap|sleep|hammock|critternap|leafblanket|longnight/, ['snore']],
    [/hug|share|boop|flower|letter|gift|heart|bear|note|friend|toast|thank/, ['whimper', 'aww']],
    [/sneeze/, ['yip']],
    [/howl|moon duet/, ['awoo']]
  ];
  var BY_KIND = { silly: ['monkey', 'kazoo', 'honk', 'boing', 'giggle'], cool: ['tada', 'slideUp', 'whoosh', 'sparkle'], sweet: ['whimper', 'aww', 'sparkle', 'ding'], surprising: ['ooh', 'boing', 'ufo', 'sparkle'] };
  function act(a) {
    if (!a || a.interlude || Math.random() < 0.3) return; // not every single time
    var key = (a.id + ' ' + (a.name || '')).toLowerCase(), list = null;
    for (var i = 0; i < ACT_SOUNDS.length && !list; i++) if (ACT_SOUNDS[i][0].test(key)) list = ACT_SOUNDS[i][1];
    if (!list) list = BY_KIND[a.kind] || BY_KIND.sweet;
    play(Math.random() < 0.5 ? 0 : 1, pick(list), false, 0.4);
  }
  // the cam is running: now and then a little everyday sound from one of them
  function tick(dt, running) {
    if (!running || !enabled) return;
    clockMs += dt;
    if (!nextAmb) nextAmb = clockMs + 9000 + Math.random() * 7000;
    if (clockMs < nextAmb) return;
    nextAmb = clockMs + 13000 + Math.random() * 15000;
    var who = Math.random() < 0.5 ? 0 : 1, r = Math.random();
    play(who, r < 0.22 ? 'barks' : r < 0.4 ? 'giggle' : r < 0.55 ? 'whimper' : r < 0.66 ? 'ooh' : r < 0.76 ? (who ? 'aww' : 'yip') : r < 0.84 ? 'monkey' : r < 0.9 ? 'squeak' : r < 0.95 ? 'ufo' : 'awoo');
  }
  function hush() { if (ctx && ctx.state === 'running' && ctx.suspend) { try { var pr = ctx.suspend(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} } }
  function wake() { if (enabled && ctx && ctx.state === 'suspended') ensure(); }
  function setOn(v) {
    enabled = !!v; lsSet('tol-palcam-sound', enabled ? 'on' : 'off');
    if (enabled) { ensure(); play(Math.random() < 0.5 ? 0 : 1, 'barks', true); } else hush();
    return enabled;
  }

  window.TOLPalsCamSounds = {
    bubble: bubble, trick: trick, act: act, tick: tick, hush: hush, wake: wake, play: play,
    on: function () { return enabled; }, set: setOn, toggle: function () { return setOn(!enabled); },
    names: function () { return Object.keys(S); }, supported: !!AC
  };
})();
