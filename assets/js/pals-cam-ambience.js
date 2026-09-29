/* pals-cam-ambience.js — quiet, real sounds of each pal cam place: birdsong in the backyard (crickets at
   night), waves at the beach, wind on the snowy hill, a trickling stream by the pond, water lapping at the
   dock, a crackling fire at the cabin and campsite, rain on a rainy day. Soft, looped seamlessly, and
   always under the pups. It follows the pal cam's Sound button (and Quiet mode), and nothing is sent anywhere.
   Recordings (from the open-source Blanket app's collection, edited into gentle loops):
   birds by kvgarlic (CC0), stream by gluckose (CC0), wind by felix.blume (CC0), boat by Falcet (CC0),
   crickets by Lisa Redfern (public domain), fireplace by ezwa (public domain), café by stephan (public
   domain), waves by Luftrum (CC BY), rain by alex36917 (CC BY), city by gezortenplotz (CC BY). */
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
    snow: DAY_NIGHT([['wind', 0.45]]), cabin: DAY_NIGHT([['fire', 0.55], ['wind', 0.2]]),
    pond: DAY_NIGHT([['stream', 0.4], ['birds', 0.35]], [['stream', 0.35], ['crickets', 0.4]]),
    dock: DAY_NIGHT([['boat', 0.55], ['birds', 0.2]], [['boat', 0.5], ['crickets', 0.3]]),
    citypark: DAY_NIGHT([['city', 0.3], ['birds', 0.35]], [['city', 0.3], ['crickets', 0.25]]), rooftop: DAY_NIGHT([['city', 0.3], ['wind', 0.25]]),
    festival: DAY_NIGHT([['city', 0.3]]), carnival: DAY_NIGHT([['cafe', 0.3]]),
    campsite: DAY_NIGHT([['fire', 0.5], ['birds', 0.3]], [['fire', 0.5], ['crickets', 0.45]]),
    rainy: DAY_NIGHT([['rain', 0.55]]), bakery: DAY_NIGHT([['cafe', 0.35]]), library: DAY_NIGHT([['cafe', 0.12]]),
    underwater: DAY_NIGHT([['underwater', 0.5]]), aquarium: DAY_NIGHT([['underwater', 0.4]])
  };
  var FADE_IN = 3, FADE_OUT = 2, FULL = 0.9, UNDER_MUSIC = 0.55; // fuller on their own, a little under the music when it plays
  var bufs = {}, cur = [], gen = 0, sceneId = null, hour = 12, on = true, paused = false, out = null;
  function ctx() { return window.__pcAudio || null; }
  function isNight(h) { return h < 6 || h >= 20.5; }
  function load(name) {
    if (bufs[name]) return bufs[name];
    var c = ctx(); if (!c) return Promise.resolve(null);
    bufs[name] = fetch(BASE + name + '.mp3').then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (ab) {
      if (!ab) return null;
      return new Promise(function (ok) { try { var pr = c.decodeAudioData(ab, ok, function () { ok(null); }); if (pr && pr.catch) pr.catch(function () { ok(null); }); } catch (e) { ok(null); } });
    }).catch(function () { return null; });
    return bufs[name];
  }
  function bus() {
    var c = ctx(); if (!c) return null;
    if (!out) { out = c.createGain(); out.gain.value = FULL; out.connect(c.destination); }
    var M = window.TOLPalsCamMusic, lv = M && M.on() && M.has(sceneId) ? UNDER_MUSIC : FULL;
    try { out.gain.setTargetAtTime(lv, c.currentTime, 0.6); } catch (e) { out.gain.value = lv; }
    return out;
  }
  function stopAll(secs) {
    gen++;
    var c = ctx(), list = cur; cur = [];
    list.forEach(function (n) {
      try { var t = c.currentTime; n.g.gain.cancelScheduledValues(t); n.g.gain.setValueAtTime(n.g.gain.value, t); n.g.gain.linearRampToValueAtTime(0.0001, t + secs); n.s.stop(t + secs + 0.1); } catch (e) {}
    });
  }
  function start() {
    stopAll(FADE_OUT); var my = ++gen;
    var c = ctx(), b = bus(), m = MAP[sceneId];
    if (!on || paused || !c || !b || !m || document.hidden) return;
    var layers = m[isNight(hour) ? 1 : 0], want = sceneId;
    layers.forEach(function (L) {
      load(L[0]).then(function (buf) {
        if (!buf || my !== gen || sceneId !== want || !on || paused) return;
        var s = c.createBufferSource(), g = c.createGain();
        s.buffer = buf; s.loop = true; s.loopStart = Math.min(0.06, buf.duration / 4); s.loopEnd = Math.max(s.loopStart + 1, buf.duration - 0.06); // skip the mp3's tiny padding g.gain.value = 0.0001; s.connect(g); g.connect(b);
        var t = c.currentTime; s.start(t, Math.random() * buf.duration); g.gain.linearRampToValueAtTime(L[1], t + FADE_IN);
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
    level: function (v) { var b = bus(); if (b) b.gain.value = v; },
    has: function (id) { return !!MAP[id || sceneId]; },
    scenes: function () { return Object.keys(MAP); },
    playing: function () { return cur.length; }
  };
})();
