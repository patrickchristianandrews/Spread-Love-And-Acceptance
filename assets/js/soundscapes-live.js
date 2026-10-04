/* soundscapes-live.js — more live soundscapes for /soundscapes.html, made in the browser as you listen
   (Web Audio, nothing downloaded or sent): a crackling fireplace, a forest with wind in the leaves and the
   odd faraway bird, night rain with crickets, a little stream, and a steady hush with nothing in it. Also a gentle sleep timer that fades whatever is
   playing (a live soundscape or a track) and stops it.
   window.TOLLiveSounds.start(name) / .stop(fade seconds) / .playing() */
(function () {
  'use strict';
  var AC = null, out = null, nodes = [], timers = [], cur = '';
  var an = null; // an analyser for the "see and feel the sound" panel (sound-senses.js)

  function ctx() {
    if (AC) return AC;
    var C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    AC = new C();
    return AC;
  }
  // a few seconds of noise, colored: white, pink (softer) or brown (deep)
  function noise(color, seconds) {
    var n = Math.floor(AC.sampleRate * (seconds || 4)), buf = AC.createBuffer(2, n, AC.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch), b0 = 0, b1 = 0, b2 = 0, last = 0;
      for (var i = 0; i < n; i++) {
        var w = Math.random() * 2 - 1;
        if (color === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
        else if (color === 'pink') { b0 = 0.997 * b0 + w * 0.029; b1 = 0.985 * b1 + w * 0.032; b2 = 0.95 * b2 + w * 0.048; d[i] = (b0 + b1 + b2 + w * 0.05) * 0.9; }
        else d[i] = w * 0.5;
      }
    }
    var src = AC.createBufferSource(); src.buffer = buf; src.loop = true;
    return src;
  }
  function gain(v) { var g = AC.createGain(); g.gain.value = v; return g; }
  function filter(type, f, q) { var x = AC.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q) x.Q.value = q; return x; }
  function chain() { for (var i = 0; i < arguments.length - 1; i++) arguments[i].connect(arguments[i + 1]); return arguments[arguments.length - 1]; }
  function keep(n) { nodes.push(n); return n; }
  function every(fn, lo, hi) {
    (function tick() { var id = setTimeout(function () { if (!cur) return; fn(); tick(); }, lo + Math.random() * (hi - lo)); timers.push(id); })();
  }
  // a slow swell on a gain, so beds breathe instead of sitting flat
  function drift(g, base, depth, secs) {
    var lfo = keep(AC.createOscillator()), amt = gain(depth);
    lfo.frequency.value = 1 / secs; chain(lfo, amt, g.gain); g.gain.value = base; lfo.start();
  }

  var BEDS = {
    fireplace: function () {
      // the warm roar of the fire, and crackles and small pops now and then
      var roar = keep(noise('brown', 6)), g = gain(0.5);
      chain(roar, filter('lowpass', 420), g, out); drift(g, 0.45, 0.12, 9); roar.start();
      var hiss = keep(noise('pink', 3)), gh = gain(0.03);
      chain(hiss, filter('highpass', 2500), gh, out); hiss.start();
      every(function () {
        var n = 1 + Math.floor(Math.random() * 4);
        for (var i = 0; i < n; i++) {
          var t = AC.currentTime + i * (0.02 + Math.random() * 0.08), s = noise('white', 0.05), f = filter('bandpass', 900 + Math.random() * 2600, 3), e = gain(0);
          chain(s, f, e, out);
          e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.25 + Math.random() * 0.35, t + 0.003); e.gain.exponentialRampToValueAtTime(0.0008, t + 0.04 + Math.random() * 0.06);
          s.start(t); s.stop(t + 0.15);
        }
      }, 180, 1400);
    },
    forest: function () {
      // wind moving through leaves, rising and falling, with a faraway bird now and then
      var wind = keep(noise('pink', 6)), bp = filter('bandpass', 700, 0.6), g = gain(0.3);
      chain(wind, bp, g, out); drift(g, 0.28, 0.14, 13); wind.start();
      var sway = keep(AC.createOscillator()), sa = gain(260); sway.frequency.value = 1 / 17; chain(sway, sa, bp.frequency); sway.start();
      var low = keep(noise('brown', 5)), gl = gain(0.18); chain(low, filter('lowpass', 200), gl, out); low.start();
      every(function () {
        var t = AC.currentTime, notes = 2 + Math.floor(Math.random() * 3), base = 2200 + Math.random() * 1600, pan = AC.createStereoPanner ? AC.createStereoPanner() : null;
        if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; pan.connect(out); }
        for (var i = 0; i < notes; i++) {
          var o = AC.createOscillator(), e = gain(0), t0 = t + i * (0.16 + Math.random() * 0.1);
          o.type = 'sine'; o.frequency.setValueAtTime(base * (1 + i * 0.06), t0); o.frequency.exponentialRampToValueAtTime(base * (1.25 + i * 0.05), t0 + 0.09);
          chain(o, e, pan || out);
          e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(0.03, t0 + 0.02); e.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.14);
          o.start(t0); o.stop(t0 + 0.2);
        }
      }, 4000, 11000);
    },
    nightrain: function () {
      // steady soft rain, drips from the eaves and crickets in the grass
      var rain = keep(noise('pink', 6)), g = gain(0.34);
      chain(rain, filter('lowpass', 3200), filter('highpass', 300), g, out); drift(g, 0.32, 0.06, 11); rain.start();
      var hum = keep(noise('brown', 5)), gh = gain(0.15); chain(hum, filter('lowpass', 160), gh, out); hum.start();
      every(function () {
        var t = AC.currentTime, o = AC.createOscillator(), e = gain(0);
        o.type = 'sine'; o.frequency.setValueAtTime(900 + Math.random() * 700, t); o.frequency.exponentialRampToValueAtTime(380, t + 0.07);
        chain(o, e, out); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.05, t + 0.004); e.gain.exponentialRampToValueAtTime(0.0005, t + 0.1);
        o.start(t); o.stop(t + 0.12);
      }, 600, 2600);
      every(function () {
        var t = AC.currentTime, f = 4200 + Math.random() * 500;
        for (var i = 0; i < 3; i++) {
          var o = AC.createOscillator(), e = gain(0), t0 = t + i * 0.09;
          o.type = 'triangle'; o.frequency.value = f; chain(o, e, out);
          e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(0.008, t0 + 0.01); e.gain.linearRampToValueAtTime(0, t0 + 0.05);
          o.start(t0); o.stop(t0 + 0.06);
        }
      }, 1500, 4200);
    },
    stream: function () {
      // a small brook over stones: running water that shifts a little all the time, and a soft bubble now and then
      var water = keep(noise('pink', 6)), bp = filter('bandpass', 1100, 0.7), g = gain(0.34);
      chain(water, bp, g, out); drift(g, 0.32, 0.08, 5); water.start();
      var wob = keep(AC.createOscillator()), wa = gain(380); wob.frequency.value = 0.37; chain(wob, wa, bp.frequency); wob.start();
      var low = keep(noise('brown', 5)), gl = gain(0.16); chain(low, filter('lowpass', 240), gl, out); low.start();
      every(function () {
        var t = AC.currentTime, o = AC.createOscillator(), e = gain(0), f0 = 300 + Math.random() * 300;
        o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 2.4, t + 0.06);
        chain(o, e, out); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.025, t + 0.01); e.gain.exponentialRampToValueAtTime(0.0005, t + 0.09);
        o.start(t); o.stop(t + 0.1);
      }, 300, 1800);
    },
    hush: function () {
      // a steady, deep hush (brown noise) with no events at all: nothing to notice, nothing to wait for
      var n = keep(noise('brown', 8)), g = gain(0.55);
      chain(n, filter('lowpass', 520), g, out); n.start();
    }
  };

  function stop(fade) {
    if (!AC || !cur) return;
    cur = '';
    timers.forEach(clearTimeout); timers = [];
    var o = out, ns = nodes; nodes = []; out = null;
    var t = AC.currentTime, f = fade == null ? 1.5 : fade;
    o.gain.cancelScheduledValues(t); o.gain.setValueAtTime(o.gain.value, t); o.gain.linearRampToValueAtTime(0, t + f);
    setTimeout(function () { ns.forEach(function (n) { try { n.stop(); } catch (e) {} }); try { o.disconnect(); } catch (e) {} }, f * 1000 + 100);
  }
  function start(name) {
    if (!BEDS[name] || !ctx()) return false;
    if (cur) stop(0.8);
    if (AC.state === 'suspended') AC.resume();
    out = AC.createGain(); out.gain.value = 0; out.connect(AC.destination);
    if (an) { try { out.connect(an); } catch (e) {} }
    out.gain.linearRampToValueAtTime(0.9, AC.currentTime + 2.5);
    cur = name;
    BEDS[name]();
    return true;
  }
  // the site's Quiet mode, switched on while something plays: fade it out
  document.addEventListener('tol-quiet', function () { try { if (window.TOLQuiet && window.TOLQuiet.on()) stop(1.5); } catch (e) {} });
  // an analyser fed by whatever is playing now (made on first ask), for drawing and feeling the sound
  function analyser() {
    if (!ctx()) return null;
    if (!an) { an = AC.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0.82; }
    if (out) { try { out.connect(an); } catch (e) {} }
    return an;
  }
  window.TOLLiveSounds = { start: start, stop: stop, playing: function () { return cur; }, names: Object.keys(BEDS), analyser: analyser };
})();
