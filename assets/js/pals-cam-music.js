/* pals-cam-music.js — gentle background music for the pal cam, one track per scene.
   Off until the viewer turns it on with the 🎵 Music button (the choice is remembered on this device
   only). Each scene that has a track plays it on a soft loop under the pups' sounds, fading in and out
   when the scene changes or the cam closes. Scenes without a track stay quiet.
   The music streams from /assets/audio/music/ and is never kept in the offline cache. */
(function () {
  'use strict';
  var BASE = '/assets/audio/music/';
  // scene id -> track file (more scenes are added as their tracks arrive)
  var TRACKS = {
    backyard: 'backyard.m4a', // 1 The Backyard
    beach: 'beach.m4a',       // 2 The Beach
    snow: 'snow.m4a',         // 3 A Snowy Hill
    pond: 'pond.m4a',         // 4 The Park by the Pond
    forest: 'forest.m4a',     // 5 A Forest Clearing
    rooftop: 'rooftop.m4a',   // 6 The Rooftop Garden
    meadow: 'meadow.m4a',     // 7 The Meadow
    dock: 'dock.m4a',         // 8 The Lakeside Dock
    citypark: 'citypark.m4a'  // 9 The City Park
  };
  // scenes without their own track yet borrow the closest one (the theater stays quiet for the movie)
  var BORROW = { pumpkins: 'forest', cabin: 'snow', rainy: 'pond', carnival: 'citypark', library: 'rooftop', bakery: 'backyard',
    gardenparty: 'meadow', campsite: 'forest', lighthouse: 'beach', underwater: 'dock', space: 'rooftop', farm: 'meadow',
    orchard: 'forest', festival: 'citypark', aquarium: 'dock', studio: 'rooftop', bonfire: 'beach', treehouse: 'backyard' };
  function trackFor(id) { return TRACKS[id] || TRACKS[BORROW[id]] || null; }
  var LEVEL = 0.2;          // soft: well under the pups
  var FADE_IN = 2.5, FADE_OUT = 1.6;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var enabled = lsGet('tol-palcam-music') === 'on';
  var scene = null, cur = null, playing = false;

  function actx() { return window.__pcAudio || null; }
  // one player per track: an <audio> element (it streams, so long tracks don't fill memory),
  // routed through Web Audio for a smooth fade where that's available (iPhones ignore .volume)
  function make(file) {
    var el = new Audio(); el.src = BASE + file; el.loop = true; el.preload = 'auto'; el.crossOrigin = 'anonymous';
    var p = { el: el, file: file, gain: null };
    var ac = actx();
    if (ac && ac.createMediaElementSource) {
      try { var src = ac.createMediaElementSource(el), g = ac.createGain(); g.gain.value = 0; src.connect(g); g.connect(ac.destination); p.gain = g; } catch (e) { p.gain = null; }
    }
    if (!p.gain) el.volume = 0;
    return p;
  }
  function fade(p, to, secs, done) {
    var ac = actx();
    if (p.gain && ac) {
      var now = ac.currentTime, g = p.gain.gain;
      g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(to, now + secs);
      if (done) setTimeout(done, secs * 1000 + 60);
      return;
    }
    var start = p.el.volume, t0 = Date.now();
    (function step() {
      var k = Math.min(1, (Date.now() - t0) / (secs * 1000));
      p.el.volume = Math.max(0, Math.min(1, start + (to - start) * k));
      if (k < 1) setTimeout(step, 50); else if (done) done();
    })();
  }
  function stopPlayer(p) {
    if (!p) return;
    fade(p, 0, FADE_OUT, function () { try { p.el.pause(); } catch (e) {} });
  }
  function startScene() {
    var file = scene && trackFor(scene);
    if (!enabled || !file || document.hidden) { if (cur) { stopPlayer(cur); cur = null; } playing = false; return; }
    if (cur && cur.file === file) { resume(); return; }
    if (cur) stopPlayer(cur);
    var ac = actx(); if (ac && ac.state === 'suspended' && ac.resume) { try { ac.resume(); } catch (e) {} }
    cur = make(file);
    var pr; try { pr = cur.el.play(); } catch (e) {}
    if (pr && pr.catch) pr.catch(function () {});
    fade(cur, LEVEL, FADE_IN); playing = true;
  }
  function resume() {
    if (!cur || !enabled) return;
    var ac = actx(); if (ac && ac.state === 'suspended' && ac.resume) { try { var rp = ac.resume(); if (rp && rp.catch) rp.catch(function () {}); } catch (e) {} }
    var pr; try { pr = cur.el.play(); } catch (e) {} if (pr && pr.catch) pr.catch(function () {});
    fade(cur, LEVEL, 1.2); playing = true;
  }
  function pause() { if (cur && playing) { var p = cur; fade(p, 0, 0.8, function () { if (!playing) try { p.el.pause(); } catch (e) {} }); } playing = false; }
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else if (scene) resume(); });

  window.TOLPalsCamMusic = {
    scene: function (id) { scene = id; startScene(); },            // a scene opened
    stop: function () { scene = null; if (cur) { stopPlayer(cur); cur = null; } playing = false; }, // the cam closed
    pause: pause, resume: function () { if (scene && enabled) { if (cur) resume(); else startScene(); } },
    on: function () { return enabled; },
    has: function (id) { return !!trackFor(id || scene); },
    set: function (v) { enabled = !!v; lsSet('tol-palcam-music', enabled ? 'on' : 'off'); if (enabled) startScene(); else if (cur) { stopPlayer(cur); cur = null; playing = false; } return enabled; },
    toggle: function () { return this.set(!enabled); },
    tracks: function () { return Object.keys(TRACKS); }
  };
})();
