/* pals-cam-ambience.js — quiet, real sounds of each pal cam place: birdsong in the backyard (crickets at
   night), waves at the beach, wind on the snowy hill, a trickling stream by the pond, water lapping at the
   dock, a crackling fire at the cabin and campsite, rain on a rainy day. Soft, looped seamlessly, and
   always under the pups. It follows the pal cam's Sound button (and Quiet mode), and nothing is sent anywhere.
   Recordings (from the open-source Blanket app's collection, edited into gentle loops):
   birds by kvgarlic (CC0), stream by gluckose (CC0), wind by felix.blume (CC0), boat by Falcet (CC0),
   crickets by Lisa Redfern (public domain), café by stephan (public domain). The waves, rain, city,
   fireplace and far-off carnival organ were made for this site from scratch (no recordings), so they're free to use. */
(function () {
  'use strict';
  var BASE = '/assets/audio/ambience/';
  // scene id -> [day layers, night layers]; each layer is [file, level]
  var DAY_NIGHT = function (day, night) { return [day, night || day]; };
  var BIRDS = [['birds', 0.55]], NIGHT = [['crickets', 0.5]];
  var MAP = {
    backyard: DAY_NIGHT(BIRDS, NIGHT), forest: DAY_NIGHT([['birds', 0.55], ['wind', 0.2]], [['crickets', 0.5], ['wind', 0.18]]),
    meadow: DAY_NIGHT([['birds', 0.5], ['wind', 0.22]], NIGHT), gardenparty: DAY_NIGHT(BIRDS, NIGHT), farm: DAY_NIGHT(BIRDS, NIGHT),
    orchard: DAY_NIGHT([['birds', 0.45], ['wind', 0.25]], NIGHT), treehouse: DAY_NIGHT([['birds', 0.5], ['wind', 0.2]], NIGHT),
    pumpkins: DAY_NIGHT([['wind', 0.3], ['birds', 0.3]], [['crickets', 0.4], ['wind', 0.25]]),
    beach: DAY_NIGHT([['waves', 0.6]]), lighthouse: DAY_NIGHT([['waves', 0.5], ['wind', 0.3]]), bonfire: DAY_NIGHT([['waves', 0.45], ['fire', 0.5]]),
    snow: DAY_NIGHT([['wind', 0.45]]), cabin: DAY_NIGHT([['fire', 0.55], ['wind', 0.2]]), cabinin: DAY_NIGHT([['fire', 0.6], ['wind', 0.08]]),
    pond: DAY_NIGHT([['stream', 0.4], ['birds', 0.35]], [['stream', 0.35], ['crickets', 0.4]]),
    dock: DAY_NIGHT([['boat', 0.55], ['birds', 0.2]], [['boat', 0.5], ['crickets', 0.3]]),
    citypark: DAY_NIGHT([['city', 0.3], ['birds', 0.35]], [['city', 0.3], ['crickets', 0.25]]), rooftop: DAY_NIGHT([['city', 0.3], ['wind', 0.25]]),
    festival: DAY_NIGHT([['city', 0.3]]), carnival: DAY_NIGHT([['carnival', 0.3]]),
    campsite: DAY_NIGHT([['fire', 0.5], ['birds', 0.3]], [['fire', 0.5], ['crickets', 0.45]]),
    rainy: DAY_NIGHT([['rain', 0.55]]), bakery: DAY_NIGHT([['cafe', 0.35]]), library: DAY_NIGHT([['cafe', 0.12]]),
    underwater: DAY_NIGHT([['underwater', 0.5]]), aquarium: DAY_NIGHT([['underwater', 0.4]])
  };
  var FADE_IN = 3, FADE_OUT = 2, FULL = 0.9, UNDER_MUSIC = 0.45; // fuller on their own, a little under the music when it plays
  var bufs = {}, cur = [], gen = 0, sceneId = null, hour = 12, on = true, paused = false, out = null;
  function ctx() { return window.__pcAudio || null; }
  function isNight(h) { return h < 6 || h >= 20.5; }
  // A seamless loop, made once per sound: the mp3's tiny padding is trimmed from both ends, and the last
  // 1.5 seconds are blended into the first 1.5 seconds (equal-power), so the end flows straight into the
  // start. (Looping the raw file between two cut points left a jump in the waveform, heard as a click
  // every time the sound came round, about once a minute per layer.)
  var XF = 1.5;
  function seamless(c, buf) {
    try {
      var sr = buf.sampleRate, pad = Math.min(Math.round(0.06 * sr), Math.floor(buf.length / 8)), n = buf.length - pad * 2, x = Math.min(Math.round(XF * sr), Math.floor(n / 3));
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
  function load(name) {
    if (bufs[name]) return bufs[name];
    var c = ctx(); if (!c) return Promise.resolve(null);
    bufs[name] = fetch(BASE + name + '.mp3').then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (ab) {
      if (!ab) return null;
      return new Promise(function (ok) { try { var pr = c.decodeAudioData(ab, ok, function () { ok(null); }); if (pr && pr.catch) pr.catch(function () { ok(null); }); } catch (e) { ok(null); } });
    }).then(function (buf) { return buf ? seamless(c, buf) : null; }).catch(function () { return null; });
    return bufs[name];
  }
  function bus() {
    var c = ctx(); if (!c) return null;
    if (!out) { out = c.createGain(); out.gain.value = FULL; out.connect(c.destination); }
    var M = window.TOLPalsCamMusic, lv = M && M.on() && M.has(sceneId) ? UNDER_MUSIC : FULL;
    try { out.gain.setTargetAtTime(lv, c.currentTime, 0.6); } catch (e) { out.gain.value = lv; }
    return out;
  }
  function fadeOut(list, secs) {
    var c = ctx();
    list.forEach(function (n) {
      try { var t = c.currentTime; n.g.gain.cancelScheduledValues(t); n.g.gain.setValueAtTime(n.g.gain.value, t); n.g.gain.linearRampToValueAtTime(0.0001, t + secs); n.s.stop(t + secs + 0.1); } catch (e) {}
    });
  }
  function stopAll(secs) { gen++; var list = cur; cur = []; fadeOut(list, secs); }
  function start() {
    var my = ++gen, c = ctx(), b = bus(), m = MAP[sceneId];
    if (!on || paused || !c || !b || !m || document.hidden) { stopAll(FADE_OUT); return; }
    var layers = m[isNight(hour) ? 1 : 0], want = sceneId;
    // load the new place's sounds first, then crossfade: the old ones fade out as the new ones fade in, with no silent gap
    Promise.all(layers.map(function (L) { return load(L[0]); })).then(function (bs) {
      if (my !== gen || sceneId !== want || !on || paused) return;
      var old = cur; cur = []; fadeOut(old, FADE_OUT);
      bs.forEach(function (buf, i) {
        if (!buf) return; var L = layers[i];
        var s = c.createBufferSource(), g = c.createGain();
        s.buffer = buf; s.loop = true; // the whole (already seamless) buffer loops, end straight into start
        g.gain.value = 0.0001; g.connect(b);
        // the crackling fire's recording is full of sharp little snaps (about 400 a minute) that came through as a
        // steady clicking: a soft low-pass rounds each snap into a gentle pop, at the same overall loudness
        if (L[0] === 'fire') { var lp = c.createBiquadFilter(), lp2 = c.createBiquadFilter(); lp.type = lp2.type = 'lowpass'; lp.frequency.value = lp2.frequency.value = 1400; lp.Q.value = lp2.Q.value = 0.5; s.connect(lp); lp.connect(lp2); lp2.connect(g); }
        else s.connect(g);
        var t = c.currentTime; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(L[1], t + FADE_IN); // the ramp is anchored at now, so it never jumps
        s.start(t, Math.random() * buf.duration);
        cur.push({ s: s, g: g });
      });
    });
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) stopAll(0.4); else if (sceneId) start(); });
  window.TOLPalsCamAmbience = {
    scene: function (id, h) { sceneId = id; if (h != null) hour = +h; paused = false; start(); },
    stop: function () { sceneId = null; stopAll(FADE_OUT); },
    pause: function () { paused = true; stopAll(0.6); },
    resume: function () { if (!paused) return; paused = false; if (sceneId) start(); },
    set: function (v) { on = !!v; if (on) start(); else stopAll(0.8); return on; },
    level: function (v) { var b = bus(), c = ctx(); if (b && c) { try { b.gain.setTargetAtTime(v, c.currentTime, 0.08); } catch (e) { b.gain.value = v; } } },
    has: function (id) { return !!MAP[id || sceneId]; },
    scenes: function () { return Object.keys(MAP); },
    playing: function () { return cur.length; }
  };
})();
