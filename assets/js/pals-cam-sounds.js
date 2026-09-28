/* pals-cam-sounds.js — soft, real sounds for the pal cam.
   Recorded sounds (all CC0, free to use), cleaned up and level-matched, in /assets/audio/palcam/:
   - Tidbit's barks: a small, yappy pup ("Dog bark2.wav" by MisterTood, freesound 9032)
   - Sugarfoot's barks: a mini dachshund and a poodle ("Miniature Dachshund Bark - Indoors" by Ligidium,
     freesound 192236; "one bark of a poodle dog" by fabiopx, freesound 170015)
   - chimes, plucks and little tunes from Kenney's Interface Sounds and Music Jingles (kenney.nl)
   - a real slide whistle, boings and soft swishes (Bluezone/"bb" sample packs and 100 CC0 SFX, via
     github.com/lavenderdotpet/CC0-Public-Domain-Sounds)
   Kept gentle: a soft master level, plenty of quiet between sounds, and never two at once.
   The pal cam calls TOLPalsCamSounds.bubble / trick / act / tick. The on/off choice is remembered on
   this device only (localStorage), and nothing is sent anywhere. */
(function () {
  'use strict';
  var AC = window.AudioContext || window.webkitAudioContext;
  var BASE = '/assets/audio/palcam/';
  var FILES = {
    barkT: ['tidbit-bark-1', 'tidbit-bark-2', 'tidbit-bark-3', 'tidbit-bark-4'],
    barkS: ['sugarfoot-bark-1', 'sugarfoot-bark-2', 'sugarfoot-bark-3'],
    chime: ['chime-1', 'chime-2'], pluck: ['pluck-1', 'pluck-2'], ding: ['ding'], curious: ['curious'], plip: ['plip'], sparkle: ['sparkle'],
    tune: ['tune-1', 'tune-2', 'tune-3', 'tune-4', 'tune-5'], sweet: ['sweet-1', 'sweet-2', 'sweet-3'],
    slide: ['slide-up-1', 'slide-up-2'], wobble: ['slide-wobble', 'slide-fall-rise'], boing: ['boing-1', 'boing-2'],
    swish: ['swish-1', 'swish-2', 'swish-3'], space: ['space-1', 'space-2']
  };
  var ctx = null, out = null, bufs = {}, loading = null, lastAt = -10, lastKey = '', lastKeyAt = 0, nextAmb = 0, clockMs = 0, lastName = '';
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var enabled = lsGet('tol-palcam-sound') !== 'off';

  function ensure() {
    if (!AC || !enabled) return false;
    if (!ctx) {
      try { ctx = window.__pcAudio || new AC(); } catch (e) { return false; }
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
      out = ctx.createGain(); out.gain.value = 0.9;
      out.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended' && ctx.resume) { try { var pr = ctx.resume(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} }
    load();
    return ctx.state !== 'closed';
  }
  // fetch the little sound files once, the first time sound is used
  function load() {
    if (loading || !ctx) return loading;
    var names = []; Object.keys(FILES).forEach(function (k) { names = names.concat(FILES[k]); });
    loading = Promise.all(names.map(function (n) {
      return fetch(BASE + n + '.wav').then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (ab) {
        if (!ab) return;
        return new Promise(function (ok) { try { ctx.decodeAudioData(ab, function (b) { bufs[n] = b; ok(); }, function () { ok(); }); } catch (e) { ok(); } });
      }).catch(function () {});
    }));
    return loading;
  }

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  // play one sound from a group, softly; vol is 0..1 on top of the file's own (already gentle) level
  function play(group, vol, force, delay) {
    if (!enabled || document.hidden || !FILES[group]) return false;
    if (!ensure()) return false;
    var now = ctx.currentTime;
    if (!force && now - lastAt < 2.2) return false; // plenty of quiet between sounds
    var list = FILES[group].filter(function (n) { return bufs[n] && (FILES[group].length < 2 || n !== lastName); });
    if (!list.length) return false;
    var name = pick(list), s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = bufs[name];
    s.playbackRate.value = 0.97 + Math.random() * 0.06; // a touch of variety, never chipmunky
    g.gain.value = vol == null ? 1 : vol;
    s.connect(g); g.connect(out); s.start(now + 0.02 + (delay || 0));
    lastAt = now + (delay || 0); lastName = name; nextAmb = Math.max(nextAmb, clockMs + 9000);
    return true;
  }
  function bark(who, vol, force, delay) { return play(who === 1 ? 'barkS' : 'barkT', vol, force, delay); }

  // a speech bubble just appeared over one of them
  function bubble(who, text) {
    if (typeof who !== 'number') return;
    var key = who + '|' + text, t = Date.now();
    if (key === lastKey && t - lastKeyAt < 3000) return; lastKey = key; lastKeyAt = t;
    var s = String(text || '').toLowerCase();
    if (/^!+$/.test(s) || /woof|arf|bark|ruff|yay|wow|hooray/.test(s)) { if (Math.random() < 0.6) bark(who, 0.85); }
    else if (/^\?+!?$/.test(s)) play('curious', 0.7);
    else if (s === '<3' || s.indexOf('♥') !== -1 || s.indexOf('❤') !== -1) play('chime', 0.7);
  }
  // a trick on request: a happy bark, then now and then a little flourish
  function trick(who) {
    bark(who, 0.9, true);
    if (Math.random() < 0.5) play(pick(['pluck', 'boing', 'sparkle', 'tune']), 0.75, true, 0.35);
  }
  // a new activity is starting: sometimes a sound that fits it
  var ACT_SOUNDS = [
    [/ufo|alien|teleport|space|rocket|jetpack|comet|constellation|stardogs|earthrise|zero|robot/, 'space'],
    [/trampoline|pogo|bounce|leapfrog|seesaw|bigball|ballrain|jumprope|hopscotch|cloudbounce|boomerang/, 'boing'],
    [/slide|surf|toboggan|skate|zoomies|swing|carousel|highdive|speedrun|relay|race|kite|capes|flight|carpet/, 'slide'],
    [/magic|wish|sparkle|glow|crystal|firefl|lantern|snowglobe|rainbow|northern|pearl|jelly|gold|dragon|star/, 'sparkle'],
    [/bubble|popcorn|balloon|pop|sprinkler|puddle|spout|rain|drops/, 'plip'],
    [/drum|band|piano|dj|disco|dance|sing|chorus|concert|waltz|conga|hula|talent|show|party|marchband|fest|cheer/, 'tune'],
    [/silly|sockshow|copycat|pillow|pancake|sandwich|pizza|juggle|unicycle|wobble|scheme/, 'wobble'],
    [/hug|share|boop|flower|letter|gift|heart|bear|note|friend|toast|sunset|nap|hammock|picnic|tea/, 'sweet'],
    [/planes|leaf|twirl|feather|seeds|dandelion|blossom|breeze/, 'swish']
  ];
  var BY_KIND = { silly: 'wobble', cool: 'tune', sweet: 'sweet', surprising: 'sparkle' };
  function act(a) {
    if (!a || a.interlude || Math.random() < 0.55) return; // most activities are quiet
    var key = (a.id + ' ' + (a.name || '')).toLowerCase(), g = null;
    for (var i = 0; i < ACT_SOUNDS.length && !g; i++) if (ACT_SOUNDS[i][0].test(key)) g = ACT_SOUNDS[i][1];
    play(g || BY_KIND[a.kind] || 'chime', 0.75, false, 0.5);
  }
  // the cam is running: once in a while, one of them barks softly or a little chime rings
  function tick(dt, running) {
    if (!running || !enabled) return;
    clockMs += dt;
    if (!nextAmb) nextAmb = clockMs + 20000 + Math.random() * 15000;
    if (clockMs < nextAmb) return;
    nextAmb = clockMs + 30000 + Math.random() * 30000;
    if (Math.random() < 0.7) bark(Math.random() < 0.5 ? 0 : 1, 0.7); else play(pick(['pluck', 'chime', 'sweet']), 0.6);
  }
  function hush() { if (ctx && ctx.state === 'running' && ctx.suspend) { try { var pr = ctx.suspend(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} } }
  function wake() { if (enabled && ctx && ctx.state === 'suspended') ensure(); }
  function setOn(v) {
    enabled = !!v; lsSet('tol-palcam-sound', enabled ? 'on' : 'off');
    if (enabled) { ensure(); if (loading) loading.then(function () { bark(Math.random() < 0.5 ? 0 : 1, 0.8, true); }); } else hush();
    return enabled;
  }

  window.TOLPalsCamSounds = {
    bubble: bubble, trick: trick, act: act, tick: tick, hush: hush, wake: wake,
    play: function (group, vol) { return play(group, vol, true); }, bark: function (who) { return bark(who, 0.9, true); },
    ready: function () { ensure(); return loading || Promise.resolve(); },
    on: function () { return enabled; }, set: setOn, toggle: function () { return setOn(!enabled); },
    groups: function () { return Object.keys(FILES); }, loaded: function () { return Object.keys(bufs).length; }, supported: !!AC
  };
})();
