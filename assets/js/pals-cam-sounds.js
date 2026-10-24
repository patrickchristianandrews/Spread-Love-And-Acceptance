/* pals-cam-sounds.js — the pal cam's sounds.
   - The pups' barks are real, unaltered recordings (all CC0): Tidbit uses a poodle and a mini
     dachshund; Sugarfoot a mini dachshund and a softer, deeper bark. Kept quieter than the music.
     Sources: "one bark of a poodle dog" by fabiopx (freesound 170015), "Miniature Dachshund Bark -
     Indoors" by Ligidium (freesound 192236), "Dog Barks.wav" by UnderlinedDesigns (freesound 191687).
   - Every other sound is a casino sound: chips stacking and clinking, cards shuffling and flipping,
     dice rolling, coins, and a little win bell (Kenney's Casino, RPG and Interface audio, kenney.nl,
     and 50 CC0 retro synth SFX; all CC0).
   All cleaned up (mono, gentle low-pass, fades) and level-matched in /assets/audio/palcam/.
   The pal cam calls TOLPalsCamSounds.bubble / trick / act / tick. The on/off choice is remembered on
   this device only (localStorage), and nothing is sent anywhere. */
(function () {
  'use strict';
  var AC = window.AudioContext || window.webkitAudioContext;
  var BASE = '/assets/audio/palcam/';
  var FILES = {
    barkT: ['tidbit-bark-1', 'tidbit-bark-2', 'tidbit-bark-3'],
    barkS: ['sugarfoot-bark-1', 'sugarfoot-bark-2', 'sugarfoot-bark-3', 'sugarfoot-bark-4'],
    stack: ['chips-stack-1', 'chips-stack-2', 'chips-stack-3'], clink: ['chips-clink-1', 'chips-clink-2', 'chips-clink-3'],
    shuffle: ['cards-shuffle-1', 'cards-shuffle-2', 'cards-shuffle-3'], flip: ['cards-flip-1', 'cards-flip-2', 'cards-flip-3', 'cards-flip-4'],
    dice: ['dice-1', 'dice-2', 'dice-3'], coins: ['coins-1', 'coins-2'], bling: ['coin-bling-1', 'coin-bling-2'], bell: ['bell-1', 'bell-2']
  };
  var BARK_VOL = 0.42; // the pups sit under the music
  var ctx = null, out = null, soft = null, bufs = {}, loading = null, lastAt = -10, lastKey = '', lastKeyAt = 0, nextAmb = 0, clockMs = 0, lastName = '', hushT = 0;
  var OUT_LV = 0.9;
  // the sharp little casino sounds (chips, cards, dice, coins) go through a gentle low-pass, so they land as soft taps, not clicks
  var SHARP = { stack: 1, clink: 1, shuffle: 1, flip: 1, dice: 1, coins: 1 };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var enabled = lsGet('tol-pc-sound') !== 'off', held = false; // held: kept quiet for this visit (the site's quiet mode), without changing the saved choice

  function ensure() {
    if (!AC || !enabled || held) return false;
    if (!ctx) {
      try { ctx = window.__pcAudio || new AC(); } catch (e) { return false; }
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
      out = ctx.createGain(); out.gain.value = OUT_LV;
      out.connect(comp); comp.connect(ctx.destination);
      soft = ctx.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 3200; soft.Q.value = 0.5; soft.connect(out);
    }
    clearTimeout(hushT); hushT = 0;
    if (out.gain.value < OUT_LV * 0.9) { try { var n0 = ctx.currentTime; out.gain.cancelScheduledValues(n0); out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), n0); out.gain.linearRampToValueAtTime(OUT_LV, n0 + 0.08); } catch (e) { out.gain.value = OUT_LV; } }
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
    if (!enabled || held || document.hidden || !FILES[group]) return false;
    if (!ensure()) return false;
    var now = ctx.currentTime;
    if (!force && now - lastAt < (/^bark/.test(group) ? 1.3 : 2.2)) return false; // plenty of quiet between sounds
    var list = FILES[group].filter(function (n) { return bufs[n] && (FILES[group].length < 2 || n !== lastName); });
    if (!list.length) return false;
    var name = pick(list), s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = bufs[name];
    s.playbackRate.value = /^bark/.test(group) ? 1 : 0.98 + Math.random() * 0.04; // barks exactly as recorded
    // every sound eases in over a few milliseconds (no instant jump in level), and the sharp ones are softened
    var at = now + 0.02 + (delay || 0), lv = vol == null ? 1 : vol;
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(lv * (SHARP[group] ? 0.8 : 1), at + (SHARP[group] ? 0.012 : 0.006));
    s.connect(g); g.connect(SHARP[group] && soft ? soft : out); s.start(at);
    lastAt = now + (delay || 0); lastName = name; nextAmb = Math.max(nextAmb, clockMs + 6000);
    return true;
  }
  // one "bark moment": a single real bark, or now and then a second one a beat later
  function bark(who, vol, force, delay) {
    var d = delay || 0, v = (vol == null ? 1 : vol) * BARK_VOL, g = who === 1 ? 'barkS' : 'barkT';
    if (!play(g, v, force, d)) return false;
    if (Math.random() < (who === 1 ? 0.3 : 0.4)) play(g, v * 0.9, true, d + 0.7 + Math.random() * 0.3);
    return true;
  }
  // the two of them "talking": one barks, the other answers
  function chat(first) {
    if (!bark(first, 0.8)) return false;
    bark(1 - first, 0.75, true, 0.75 + Math.random() * 0.35);
    return true;
  }

  // a speech bubble just appeared over one of them
  function bubble(who, text) {
    if (typeof who !== 'number') return;
    var key = who + '|' + text, t = Date.now();
    if (key === lastKey && t - lastKeyAt < 3000) return; lastKey = key; lastKeyAt = t;
    var s = String(text || '').toLowerCase();
    if (/^!+$/.test(s) || /woof|arf|bark|ruff|yay|wow|hooray|yes|ooh|whee/.test(s)) { if (Math.random() < 0.72) bark(who, 0.85); }
    else if (s.length > 3 && Math.random() < 0.2) bark(who, 0.7); // now and then she barks along with what she says
    else if (/^\?+!?$/.test(s)) play('flip', 0.6);
    else if (s === '<3' || s.indexOf('♥') !== -1 || s.indexOf('❤') !== -1) play('stack', 0.6);
  }
  // a trick on request: a happy bark, then now and then a little flourish
  function trick(who) {
    bark(who, 0.9, true);
    if (Math.random() < 0.5) play(pick(['coins', 'bling', 'bell', 'clink', 'dice']), 0.6, true, 0.6);
  }
  // a new activity is starting: sometimes a sound that fits it
  var ACT_SOUNDS = [
    [/ufo|alien|teleport|space|rocket|jetpack|comet|constellation|stardogs|earthrise|zero|robot|magic|wish|sparkle|glow|crystal|firefl|lantern|snowglobe|rainbow|northern|pearl|jelly|gold|dragon|star/, 'bell'],
    [/trampoline|pogo|bounce|leapfrog|seesaw|bigball|ballrain|jumprope|hopscotch|cloudbounce|boomerang|bowling|beanbag|hoops|minigolf|juggle/, 'dice'],
    [/slide|surf|toboggan|skate|zoomies|swing|carousel|highdive|speedrun|relay|race|kite|capes|flight|carpet|planes|leaf|feather|seeds|dandelion|breeze|letter|note|book|map|scrapbook|stickers/, 'flip'],
    [/drum|band|piano|dj|disco|dance|sing|chorus|concert|waltz|conga|hula|talent|show|party|marchband|fest|cheer|fireworks|confetti|treasure|goldball|rainbowpot|gift|present|cake|toast/, 'coins'],
    [/bubble|popcorn|balloon|pop|sprinkler|puddle|spout|rain|drops|pancake|sandwich|pizza|cookie|muffin|bread|pie|apple|smores|treat|tea|picnic/, 'clink'],
    [/silly|sockshow|copycat|pillow|unicycle|wobble|scheme|detective|cookiecode|checkers|jigsaw|dominoes|puzzle/, 'shuffle'],
    [/hug|share|boop|flower|heart|bear|friend|sunset|nap|hammock|critternap|blanket|cozy|snuggle/, 'stack']
  ];
  var BY_KIND = { silly: 'dice', cool: 'shuffle', sweet: 'stack', surprising: 'bling' };
  function act(a) {
    if (!a || a.interlude) return;
    if (Math.random() < 0.22) { var w = Math.random() < 0.5 ? 0 : 1; if (Math.random() < 0.35) chat(w); else bark(w, 0.8, false, 0.4); return; } // a happy bark to start
    if (Math.random() < 0.3) return; // some activities stay quiet
    var key = (a.id + ' ' + (a.name || '')).toLowerCase(), g = null;
    for (var i = 0; i < ACT_SOUNDS.length && !g; i++) if (ACT_SOUNDS[i][0].test(key)) g = ACT_SOUNDS[i][1];
    play(g || BY_KIND[a.kind] || 'stack', 0.6, false, 0.5);
  }
  // the cam is running: once in a while, one of them barks softly or a little chime rings
  function tick(dt, running) {
    if (!running || !enabled || held) return;
    clockMs += dt;
    if (!nextAmb) nextAmb = clockMs + 5000 + Math.random() * 4000;
    if (clockMs < nextAmb) return;
    nextAmb = clockMs + 8000 + Math.random() * 8000; // a gentle, steady rhythm even at the calmer pace
    var r = Math.random(), w = Math.random() < 0.5 ? 0 : 1;
    // out of nowhere, only the pups or a soft chime: the chip and card clicks are kept for moments you can see happen
    if (r < 0.55) bark(w, 0.72); else if (r < 0.85) chat(w); else play(pick(['bling', 'bell']), 0.45);
  }
  function musicOn() { var M = window.TOLPalsCamMusic; return !!(M && M.on()); }
  // going quiet: fade out first, and only put the audio to sleep once the place sounds have faded too
  // (suspending straight away cut every sound off mid-wave, and woke it up mid-wave: two clicks)
  function hush() {
    if (musicOn() || !ctx) return; /* the music shares this audio: never silence it */
    if (out) { try { var n0 = ctx.currentTime; out.gain.cancelScheduledValues(n0); out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), n0); out.gain.linearRampToValueAtTime(0.0001, n0 + 0.15); } catch (e) {} }
    clearTimeout(hushT);
    hushT = setTimeout(function () {
      hushT = 0;
      if (musicOn() || !ctx || ctx.state !== 'running' || !ctx.suspend) return;
      try { var pr = ctx.suspend(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {}
    }, 2600);
  }
  function wake() { if (ctx && ctx.state === 'suspended' && (musicOn() || (enabled && !held))) { if (enabled && !held) ensure(); else { try { var pr = ctx.resume(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} } } }
  function setOn(v) {
    held = false; enabled = !!v; lsSet('tol-pc-sound', enabled ? 'on' : 'off');
    if (enabled) { ensure(); if (loading) loading.then(function () { bark(Math.random() < 0.5 ? 0 : 1, 0.8, true); }); } else hush();
    return enabled;
  }

  window.TOLPalsCamSounds = {
    bubble: bubble, trick: trick, act: act, tick: tick, hush: hush, wake: wake,
    play: function (group, vol) { return play(group, vol, true); }, bark: function (who) { return bark(who, 0.9, true); },
    ready: function () { ensure(); return loading || Promise.resolve(); },
    on: function () { return enabled && !held; }, set: setOn, toggle: function () { return setOn(!(enabled && !held)); },
    hold: function (v) { held = !!v; if (held) hush(); },
    groups: function () { return Object.keys(FILES); }, loaded: function () { return Object.keys(bufs).length; }, supported: !!AC
  };
})();
