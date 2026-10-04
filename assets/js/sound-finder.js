/* sound-finder.js — "Find your sound" for /soundscapes.html.
   Three quick taps (what you need, how your body is, how you like sound) and it suggests one sound, with
   the reasons, and two others to try. It looks at every track and live soundscape on the page.
   How the suggestions are made: each sound has a few plain traits (how big it is, how steady, how bright,
   how much low tone, how long). The three Brain Breakers were measured (loudness, brightness and how they
   build); the calm tracks and live sounds use what their cards already say. Each trait nudges a score. No
   quiz result is stored as a "type", and nothing is sent anywhere.
   For "you": a "go-to" you can save for each need, and a count of what you have played. Both stay in this
   browser's localStorage ('tol-sound-fav', 'tol-sound-plays'). */
(function () {
  'use strict';
  var host = document.getElementById('finder');
  if (!host) return;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function jget(k) { try { return JSON.parse(lsGet(k) || '{}') || {}; } catch (e) { return {}; } }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  var RM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // e = how big it is, s = how steady (nothing sudden), b = how bright or sharp, l = how much low tone, m = minutes (0 = never ends)
  var S = [
    { id: 'star', name: 'Shooting Star', kind: 'track', m: 3.5, e: .85, s: .55, b: .5, l: .5, tags: ['wake', 'feel', 'reset'],
      note: 'Gets going right away and stays big. A middle brightness.', why: { wake: 'It starts big and stays big, so it wakes you up fast.', feel: 'Full-on from the first seconds, with no quiet lead-in.', reset: 'Three and a half minutes of all-in sound, then you are done.' } },
    { id: 'watching', name: 'Watching a Shooting Star', kind: 'track', m: 3.6, e: .8, s: .5, b: .68, l: .4, tags: ['feel', 'wake'],
      note: 'The longest and brightest of the three. It builds in waves, then eases back down at the end, so it lands softer.', why: { feel: 'It builds in waves to a big finish, then eases out.', wake: 'The brightest of the Brain Breakers, and it keeps building.' } },
    { id: 'shimmer', name: 'Thunderous Shimmer', kind: 'track', m: 2.9, e: .85, s: .55, b: .4, l: .6, tags: ['wake', 'reset', 'feel'],
      note: 'The shortest, with the fullest, darkest tone. It climbs to the end and finishes at full.', why: { wake: 'It climbs steadily and finishes at full.', reset: 'The shortest of the big ones, under three minutes.', feel: 'A full, dark tone that you can feel in the low end.' } },
    { id: 'breath', name: 'The Breath Beneath', kind: 'track', m: 2.9, e: .2, s: .85, b: .2, l: 1, tags: ['reset', 'calm'],
      note: 'A deep 40 Hz drone under a resting-breath rhythm. Best on headphones.', why: { reset: 'Made as a bridge out of stressful work: a few minutes to reset.', calm: 'A steady, deep tone at the pace of a resting breath.' } },
    { id: 'anchor', name: 'One Breath to Anchor You', kind: 'track', m: 2.9, e: .1, s: .8, b: .15, l: .7, voice: true, tags: ['calm', 'reset'],
      note: 'Very spare and spacious, with a few guided words and long quiet gaps.', why: { calm: 'Bright, busy sounds are stripped away, so the room feels calm.', reset: 'Three minutes to find your baseline again.' } },
    { id: 'nothing', name: 'Nothing Needs to Change', kind: 'track', m: 2.9, e: .15, s: .9, b: .15, l: .9, tags: ['calm', 'sleep'],
      note: 'The slowest and deepest piece, easy to breathe along with.', why: { calm: 'Long, slow swells that are easy to breathe along with.', sleep: 'The slowest, deepest piece on the page.' } },
    { id: 'road', name: 'The Road We Made', kind: 'track', m: 2.8, e: .45, s: .6, b: .6, l: .5, voice: true, tags: ['feel', 'wake'],
      note: 'An Americana song with vocals and a steady, grounded rhythm.', why: { feel: 'A steady rhythm to walk with, with voices and a story.', wake: 'Gentle energy and a walking pace.' } },
    { id: 'deep', name: 'Deep', kind: 'live', m: 0, e: .15, s: .9, b: .1, l: .95, tags: ['calm', 'sleep', 'focus'], note: 'Warm low drones with a heartbeat pulse. Never ends.', why: { calm: 'Warm, low drones with a slow pulse.', sleep: 'Low and even, and it never ends. Add the sleep timer.', focus: 'Warm and low, with nothing to follow.' } },
    { id: 'ocean', name: 'Ocean', kind: 'live', m: 0, e: .2, s: .8, b: .3, l: .5, tags: ['calm', 'sleep'], note: 'Slow waves over a soft hum.', why: { calm: 'Slow waves you can breathe with.', sleep: 'Rolling waves and a soft hum, with the sleep timer.' } },
    { id: 'rain', name: 'Soft rain', kind: 'live', m: 0, e: .2, s: .9, b: .45, l: .2, tags: ['calm', 'focus', 'sleep'], note: 'Gentle rain with a warm hum underneath.', why: { calm: 'Gentle, even rain.', focus: 'A steady wash of sound that covers other noise.', sleep: 'Even rain, with nothing sudden.' } },
    { id: 'bowls', name: 'Singing bowls', kind: 'live', m: 0, e: .15, s: .6, b: .6, l: .3, tags: ['calm'], note: 'Slow, ringing bowls over a soft drone.', why: { calm: 'Slow, ringing bowls over a soft drone.' } },
    { id: 'fireplace', name: 'Fireplace', kind: 'live', m: 0, e: .25, s: .5, b: .5, l: .4, tags: ['calm', 'feel'], note: 'The warm roar of a fire, with crackles and pops.', why: { calm: 'A warm roar with small crackles.', feel: 'Cozy and alive, with crackles to listen for.' } },
    { id: 'forest', name: 'Forest', kind: 'live', m: 0, e: .2, s: .6, b: .5, l: .2, tags: ['calm', 'focus'], note: 'Wind in the leaves and a faraway bird.', why: { calm: 'Wind through the leaves, and a faraway bird.', focus: 'Soft wind with just a little life in it.' } },
    { id: 'nightrain', name: 'Night rain', kind: 'live', m: 0, e: .2, s: .9, b: .4, l: .2, tags: ['sleep', 'calm'], note: 'Steady rain after dark, with drips and crickets.', why: { sleep: 'Steady rain after dark, with crickets.', calm: 'Even rain, and a quiet night around it.' } },
    { id: 'stream', name: 'Little stream', kind: 'live', m: 0, e: .2, s: .7, b: .5, l: .1, tags: ['focus', 'calm'], note: 'A small brook over stones.', why: { focus: 'Moving water that gives your mind something light to rest on.', calm: 'A small brook, with a soft bubble now and then.' } },
    { id: 'hush', name: 'Steady hush', kind: 'live', m: 0, e: .05, s: 1, b: .1, l: .6, tags: ['focus', 'sleep'], note: 'A deep, even hush with nothing happening in it.', why: { focus: 'Nothing happens in it at all, so nothing pulls your attention.', sleep: 'A deep, even hush with no surprises.' } }
  ];
  var BYID = {}; S.forEach(function (x) { BYID[x.id] = x; });
  var NEEDS = [['wake', 'Wake my brain up'], ['reset', 'Reset between tasks'], ['calm', 'Calm down'], ['focus', 'Focus'], ['sleep', 'Wind down for sleep'], ['feel', 'Feel something big']];
  var BODY = [['', 'No idea'], ['fine', 'Fine'], ['tired', 'Tired'], ['wired', 'Wired or restless'], ['over', 'Anxious or overwhelmed']];
  var PREFS = [['steady', 'Nothing sudden'], ['soft', 'Soft and gentle'], ['big', 'Big and loud'], ['nobright', 'No bright or sharp sounds'], ['feelit', 'I want to feel it (low tones)'], ['short', 'About three minutes']];
  var NEEDNAME = {}; NEEDS.forEach(function (n) { NEEDNAME[n[0]] = n[1]; });

  var need = '', body = '', prefs = {};

  function score(x) {
    var sc = 0, why = [];
    if (x.tags.indexOf(need) >= 0) { sc += 5; if (x.why && x.why[need]) why.push(x.why[need]); }
    if (need === 'wake') sc += x.e * 3 - (x.kind === 'live' ? 2 : 0);
    if (need === 'calm' || need === 'sleep') sc += (1 - x.e) * 3 + x.s * 1.5;
    if (need === 'focus') sc += x.s * 2 - x.e * 2 - (x.voice ? 3 : 0);
    if (need === 'reset') sc += (x.m && x.m <= 3.1 ? 2 : 0) + (x.e > .4 && x.e < .9 ? 1 : 0);
    if (need === 'feel') sc += x.e * 2;
    if (need === 'sleep' && x.voice) sc -= 3;
    if (body === 'over') { sc -= x.e * 5; sc += x.s * 1.5; if (x.e > .6) why.push('__over'); }
    if (body === 'wired') sc -= x.e * 1.5 * (need === 'feel' ? 0 : 1);
    if (body === 'tired' && (need === 'wake' || need === 'reset')) sc += x.e * 1;
    if (prefs.steady) { sc += x.s * 2 - (1 - x.s) * 2; if (x.s >= .85) why.push('Steady, with nothing sudden.'); }
    if (prefs.soft) { sc -= x.e * 3; if (x.e <= .25) why.push('Soft and gentle.'); }
    if (prefs.big) { sc += x.e * 3; if (x.e >= .75) why.push('Big and full.'); }
    if (prefs.nobright) { sc -= Math.max(0, x.b - .35) * 6; if (x.b <= .3) why.push('No bright or sharp sounds in it.'); }
    if (prefs.feelit) { sc += x.l * 3; if (x.l >= .85) why.push('Lots of low tone you can feel through headphones or a phone speaker.'); }
    if (prefs.short) { sc += (x.m && x.m <= 3.1) ? 2 : (x.m ? 0 : -0.5); if (x.m && x.m <= 3.1) why.push('Under about three minutes.'); }
    var plays = jget('tol-sound-plays')[x.id] || 0; sc += Math.min(1, plays * 0.25);
    return { x: x, sc: sc, why: why, plays: plays };
  }
  function rank() { return S.map(score).sort(function (a, b) { return b.sc - a.sc; }); }

  // ---------- the panel ----------
  function chips(group, list, cur, multi) {
    return list.map(function (it) {
      var on = multi ? !!prefs[it[0]] : cur === it[0];
      return '<button type="button" class="sf-c" data-g="' + group + '" data-v="' + it[0] + '" aria-pressed="' + on + '">' + esc(it[1]) + '</button>';
    }).join('');
  }
  function draw() {
    var fav = jget('tol-sound-fav'), plays = jget('tol-sound-plays'), keep = Object.keys(fav).filter(function (k) { return BYID[fav[k]]; });
    var top = Object.keys(plays).sort(function (a, b) { return plays[b] - plays[a]; })[0];
    var mine = '';
    if (keep.length || top) {
      mine = '<div class="sf-mine"><strong>Yours</strong>' +
        keep.map(function (k) { return '<span>For “' + esc(NEEDNAME[k] || k).toLowerCase() + '”: <button type="button" class="sf-link" data-play="' + fav[k] + '">' + esc(BYID[fav[k]].name) + '</button></span>'; }).join('') +
        (top && BYID[top] ? '<span>Played most: <button type="button" class="sf-link" data-play="' + top + '">' + esc(BYID[top].name) + '</button> (' + plays[top] + (plays[top] === 1 ? ' time' : ' times') + ')</span>' : '') + '</div>';
    }
    var res = '';
    if (need) {
      var r = rank(), pick = r[0], more = r.slice(1, 3), f = fav[need] === pick.x.id;
      var reasons = pick.why.filter(function (w) { return w !== '__over'; }).slice(0, 4);
      if (!reasons.length) reasons = [pick.x.note];
      var warn = body === 'over' && pick.x.e > .6 ? '<p class="sf-warn">Big sounds can feel like too much when you are overwhelmed. If you play it, start with the volume low, and the calm picks below are there for you.</p>' : '';
      var tail = pick.x.kind === 'live' ? ' Plays until you stop it, and the sleep timer can fade it.' : '';
      res = '<div class="sf-pick"><p class="sf-k">Try this first</p><h3>' + esc(pick.x.name) + '</h3><p class="sf-note">' + esc(pick.x.note) + esc(tail) + '</p><ul>' +
        reasons.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' + warn +
        '<div class="sf-row"><button type="button" class="sf-play" data-play="' + pick.x.id + '">&#9654; Play it</button>' +
        '<button type="button" class="sf-b" data-fav="' + pick.x.id + '" aria-pressed="' + f + '">' + (f ? 'Saved as my go-to' : 'Save as my go-to for “' + esc(NEEDNAME[need]).toLowerCase() + '”') + '</button></div>' +
        (pick.plays ? '<p class="sf-small">You have played this ' + pick.plays + (pick.plays === 1 ? ' time' : ' times') + '.</p>' : '') + '</div>' +
        '<div class="sf-more"><p class="sf-k">Also worth a try</p>' + more.map(function (m) { return '<div class="sf-alt"><div><strong>' + esc(m.x.name) + '</strong><span>' + esc(m.x.note) + '</span></div><button type="button" class="sf-b" data-play="' + m.x.id + '">&#9654; Play</button></div>'; }).join('') + '</div>';
    } else res = '<p class="sf-hint">Tap what you need above and a suggestion appears here.</p>';
    host.querySelector('.sf-out').innerHTML = mine + res;
    host.querySelectorAll('[data-g="need"]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === need)); });
    plain();
  }
  // the site gives loose text a soft bubble; inside this panel the panel itself is the card
  function plain() { host.querySelectorAll('p, h2, h3, ul, li').forEach(function (n) { n.classList.add('no-bubble'); }); }
  host.innerHTML =
    '<h2 id="finder-h" class="live-h">Find your sound</h2>' +
    '<p class="live-lede">Not sure which one to press? Three quick taps. It suggests one sound and tells you why. Nothing is saved unless you choose to save a go-to, and that stays on your device.</p>' +
    '<div class="sf-q" role="group" aria-labelledby="sf-q1"><p class="sf-ql" id="sf-q1">1. What do you need right now?</p><div class="sf-chips">' + chips('need', NEEDS, need) + '</div></div>' +
    '<div class="sf-q" role="group" aria-labelledby="sf-q2"><p class="sf-ql" id="sf-q2">2. How is your body? <span>(optional)</span></p><div class="sf-chips">' + chips('body', BODY, body) + '</div></div>' +
    '<div class="sf-q" role="group" aria-labelledby="sf-q3"><p class="sf-ql" id="sf-q3">3. How do you like sound? <span>(pick any)</span></p><div class="sf-chips">' + chips('pref', PREFS, null, true) + '</div></div>' +
    '<div class="sf-out" role="region" aria-live="polite" aria-label="Your suggestion"></div>' +
    '<p class="sf-small">The three Brain Breakers were measured for loudness, brightness and how they build. The calm tracks and live sounds are matched from what their cards say. This is a starting point, not a prescription, and your own ears win.</p>';

  // ---------- playing ----------
  function say(msg) { var o = host.querySelector('.sf-out'); var p = o.querySelector('.sf-live'); if (!p) { p = document.createElement('p'); p.className = 'sf-live sf-small'; o.appendChild(p); } p.textContent = msg; }
  function playSound(id) {
    var x = BYID[id]; if (!x) return;
    if (x.kind === 'live') {
      var b = document.querySelector('[data-live="' + id + '"]'); if (!b) return;
      if (b.getAttribute('aria-pressed') !== 'true') b.click();
      b.scrollIntoView({ block: 'center', behavior: RM ? 'auto' : 'smooth' });
    } else {
      var cards = document.querySelectorAll('.track-card'), hit = null;
      cards.forEach(function (c) { var t = c.querySelector('.track-title'); if (t && t.textContent.replace(/^\d+\.\s*/, '') === x.name) hit = c; });
      if (!hit) return; var a = hit.querySelector('audio'); if (!a) return;
      hit.scrollIntoView({ block: 'center', behavior: RM ? 'auto' : 'smooth' });
      var p = a.play(); if (p && p.catch) p.catch(function () { say('Your browser blocked the sound. Press play on the track.'); });
    }
  }
  function bump(id) { var p = jget('tol-sound-plays'); p[id] = (p[id] || 0) + 1; lsSet('tol-sound-plays', JSON.stringify(p)); }

  host.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-g')) {
      var g = b.getAttribute('data-g'), v = b.getAttribute('data-v');
      if (g === 'need') need = need === v ? '' : v;
      else if (g === 'body') { body = v; host.querySelectorAll('[data-g="body"]').forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-v') === body)); }); }
      else { prefs[v] = !prefs[v]; b.setAttribute('aria-pressed', String(!!prefs[v])); }
      draw();
    } else if (b.hasAttribute('data-play')) playSound(b.getAttribute('data-play'));
    else if (b.hasAttribute('data-fav')) {
      var fv = jget('tol-sound-fav'), id = b.getAttribute('data-fav');
      if (fv[need] === id) delete fv[need]; else fv[need] = id;
      lsSet('tol-sound-fav', JSON.stringify(fv)); draw();
    }
  });

  // count what gets played anywhere on the page, so "played most" is real
  document.querySelectorAll('.track-player').forEach(function (a) {
    a.addEventListener('play', function () {
      var c = a.closest('.track-card'), t = c && c.querySelector('.track-title'); if (!t) return;
      var name = t.textContent.replace(/^\d+\.\s*/, ''), id = null; S.forEach(function (x) { if (x.name === name) id = x.id; });
      if (id) { bump(id); draw(); }
    });
  });
  document.querySelectorAll('[data-live]').forEach(function (b) {
    b.addEventListener('click', function () { if (b.getAttribute('aria-pressed') !== 'true') { /* pressed state flips after this handler */ bump(b.getAttribute('data-live')); setTimeout(draw, 50); } });
  });
  document.addEventListener('tol-sound-played', function (e) { if (e.detail && BYID[e.detail.id]) { bump(e.detail.id); draw(); } });

  draw();
})();
