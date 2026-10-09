/* buddies-player.js — Frequency Buddies: animated mini movies starring Tidbit and Sugarfoot.

   Episodes are plain data files (assets/js/buddies/s1e1.js …) that fill window.TOLBuddies.episodes; the format
   is described in the spec and checked by tools/buddies/check.js. This file is the engine:
   - a stage that paints the pal cam's settings (TOLPalsCam.paintScene, from pals-cam.js) and the pals
     (TOLPups.draw, from pups.js), with smooth, calm, time-based motion, faces that show a mood, mouths that
     move while they talk, props, guests, weather and gentle scene travel;
   - a director that plays the beats one after another (a line waits for its voice to finish, with a safety
     timeout, or for its reading time when voices are off);
   - soft generated music (Web Audio) and voices (the browser's own speech, where there is one);
   - the player on /frequency-buddies.html, a small silent "clip" for the pal cam's movie theater, and the
     estimate/lint functions the validator uses (this file loads in Node without a DOM for that).
   What it remembers (last episode and chapter, voices and music on or off) stays in this browser only
   (localStorage), as a convenience. Nothing is sent anywhere. */
(function (root) {
  'use strict';
  var HAS_DOM = typeof document !== 'undefined' && typeof window !== 'undefined';
  var B = root.TOLBuddies = root.TOLBuddies || { episodes: {} };
  if (!B.episodes) B.episodes = {};

  // ---------- the vocabulary (shared with the validator) ----------
  var SCENES = ['backyard', 'beach', 'snow', 'pond', 'forest', 'rooftop', 'meadow', 'dock', 'citypark', 'pumpkins', 'cabin', 'cabinin', 'rainy', 'carnival',
    'library', 'bakery', 'gardenparty', 'campsite', 'lighthouse', 'underwater', 'space', 'farm', 'orchard', 'festival', 'aquarium', 'studio',
    'bonfire', 'treehouse', 'theater', 'blank'];
  var WEATHER = ['clear', 'rain', 'storm', 'snow', 'wind', 'stars'];
  var MOODS = ['happy', 'excited', 'sad', 'grumpy', 'worried', 'calm', 'proud', 'silly', 'sleepy', 'surprised'];
  var MUSIC = ['gentle', 'happy', 'tense', 'sad', 'brave', 'triumph', 'none'];
  // things a pal can carry, and that can lie on the ground (or hang up high) as a prop: every one has a painter (ITEM_PAINT)
  var ITEMS = ['basket', 'plank', 'kite', 'bone', 'lantern', 'blanket', 'flower', 'map', 'toolbox', 'hammer', 'rope',
    'picnic', 'page', 'pages', 'paperboat', 'pole', 'drum', 'ukulele', 'stick', 'pinecones', 'pinecone', 'checklist', 'soggykite',
    'flykite', 'lens', 'bell', 'sign', 'starsign', 'stump', 'log', 'bottle', 'rowboat', 'snailrider'];
  // one thing in different states: picking up a stack of pages takes the page lying there, a picnic is a (very full) basket, …
  var FAMILY = { picnic: 'basket', pages: 'page', paperboat: 'page', soggykite: 'kite', bottle: 'map', checklist: 'blanket', pinecone: 'pinecones', rowboat: 'rope' };
  function fam(it) { return FAMILY[it] || it; }
  // a prop key can name a second one of the same thing: 'page#2'
  function itemOf(k) { return String(k).replace(/#\d+$/, ''); }
  // handing something to her pal ('give'): pages join into a stack, little finds go into a basket (it becomes a full picnic), else she just takes it
  function merged(have, given) { if (!have) return given; if (!given) return have; if (fam(have) === 'page' && fam(given) === 'page') return 'pages'; if (fam(have) === 'basket') return 'picnic'; return given; }
  var BUILDS = ['treehouse', 'roof', 'kite'];
  var TARGETS = ['other', 'left', 'right', 'up'];
  // scenery props (set on a scene or a place beat); every item above is a prop too: { map: 0.5 } on the ground, { page: [0.8, 120] } up high, { map: false } gone
  var SCENERY = ['treehouse', 'bridge', 'creek', 'carousel', 'chimney', 'skykites', 'constellations', 'glow', 'shooting'];
  var PROPS = SCENERY.concat(ITEMS);
  var GLOW = ['bright', 'flicker', 'dim']; // how the lantern shines (it stays that way, scene to scene)
  var SHOOTING = ['one', 'many'];         // a shooting star right now, or a whole starfall
  var TREEHOUSE = ['none', 'frame', 'built', 'wrecked', 'roof', 'done']; // 'done' and 'roof': finished, with the rain roof
  // calm pacing: everything here is on the slow, readable side
  var CPS = 13, MIN_SAY = 2.0, HOLD = 0.8, EMO_HOLD = { sad: 0.6, worried: 0.4, calm: 0.5, proud: 0.4, sleepy: 0.5, surprised: 0.2 };
  var SCENE_T = 1.9, SCENE_CAP = 2.1, GUEST_IN = 2.2, GUEST_OUT = 1.8, TITLE_T = 6.5, PLACE_T = 1.4;
  var WALK_V = 0.11, RUN_V = 0.2; // stage widths per second
  // each action: its usual length in seconds (the shortest it will go is 3/4 of that)
  var ACTIONS = {
    walk: 2.4, run: 1.8, hop: 1.8, spin: 2.2, sit: 1.2, lie: 1.4, bow: 1.4, wiggle: 2.2, wag: 2.0, tailtuck: 2.0, shake: 2.2, sniff: 2.4,
    hug: 3.6, highfive: 2.6, nuzzle: 3.0, lookat: 1.0, turnaway: 1.2, sleep: 3.0, shiver: 2.0, jump: 1.8, carry: 1.4, drop: 1.2, build: 4.0,
    fly: 4.0, dig: 2.6, splash: 2.4, cry: 2.6, laugh: 2.2, think: 2.6, heart: 2.2, sparkle: 2.0, 'rain-drip': 3.0, 'pause-breath': 5.0, point: 1.6, give: 1.4
  };
  var GUESTS = {
    snail: { name: 'Dot the snail', pitch: 1.1, rate: 0.78, where: 'ground', h: 26 },
    owl: { name: 'Ollie the owl', pitch: 0.72, rate: 0.86, where: 'air', h: 40 },
    ducklings: { name: 'the ducklings', pitch: 1.95, rate: 1.1, where: 'ground', h: 24 },
    robot: { name: 'Beep the robot', pitch: 0.45, rate: 0.95, where: 'ground', h: 52 },
    moon: { name: 'the Moon', pitch: 0.8, rate: 0.82, where: 'sky', h: 40 },
    puddles: { name: 'Professor Puddles', pitch: 1.2, rate: 0.98, where: 'hover', h: 48 },
    frog: { name: 'Hopper the frog', pitch: 0.62, rate: 1.02, where: 'ground', h: 26 },
    butterfly: { name: 'the butterfly', pitch: 1.9, rate: 1.05, where: 'flutter', h: 16 },
    squirrel: { name: 'Nutmeg the squirrel', pitch: 1.7, rate: 1.16, where: 'ground', h: 40 }
  };
  var PALS = { tidbit: { name: 'Tidbit', look: 'collar', pitch: 1.6, rate: 1.08 }, sugarfoot: { name: 'Sugarfoot', look: 'drop', pitch: 1.35, rate: 0.95 } };
  var NARRATOR = { name: 'Narrator', pitch: 1.0, rate: 0.95 };
  // the seasons, with a world and a theme for every episode (cards show "coming soon" until its file is here)
  var CATALOG = [
    { season: 1, name: 'Season 1: The First Adventures', eps: [
      { id: 's1e1', n: 1, title: 'The Storm Over the Treehouse', world: 'Backyard, forest and treehouse', theme: 'A treetop expedition against a storm', pillar: 'III', emoji: '⛈️' },
      { id: 's1e2', n: 2, title: 'Out of Tune', world: 'City park, carnival and rooftop', theme: 'A musical treasure hunt for the lost notes', pillar: 'IV', emoji: '🎺' },
      { id: 's1e3', n: 3, title: 'The Heavy Basket', world: 'Farm, orchard and a snowy summit', theme: 'A summit picnic, and a load to share', pillar: 'I', emoji: '🧺' },
      { id: 's1e4', n: 4, title: 'Who Broke the Kite?', world: 'Beach, lighthouse, dock and the deep', theme: 'A seaside kite race', pillar: 'II', emoji: '🪁' },
      { id: 's1e5', n: 5, title: 'The Longest Night', world: 'Forest, campsite, pond and the stars', theme: 'A night quest to the shooting stars', pillar: 'V', emoji: '🌠' }
    ] }
  ];
  // a short, calm note shown before each episode plays: what happens that might feel big
  var NOTES = {
    s1e1: 'A far-off rumble of thunder at the end of chapter 2, and a big storm in chapter 4 (lightning shows as a soft glow). A swaying rope bridge that the pals cross slowly and together. The storm knocks the treehouse down and Sugarfoot cries; the pals snap at each other, then say sorry and rebuild it better.',
    s1e2: 'The wind blows the song pages away, and the pals try to reach them from a windy rooftop. One pal snaps ("Why won\u2019t you just help?"), and they misunderstand each other for a while, then say sorry and make up.',
    s1e3: 'One pal quietly carries far too much and gets very tired. Stepping stones across a shallow creek, and soft falling snow. The pals argue and Sugarfoot cries a little, then they rest in a warm cabin and share the load.',
    s1e4: 'The pals\u2019 kite falls into the waves; they don\u2019t go in after it, and Hopper the frog swims out to help. They blame each other for a while, have a cozy dream under the sea, then find out what really broke.',
    s1e5: 'At night in the forest, the pals take a wrong turn, their lantern grows dim, and they argue. They are never in the pitch dark; they say sorry, rest, and the moon helps them find the way.'
  };
  // shuffle: every episode once, in a random order, then a fresh order (never the same one twice in a row)
  function shufflePick(cur) {
    var ids = catalogIds(), bag = [];
    try { bag = JSON.parse(sessionStorage.getItem('tol-fb-shuffle') || '[]').filter(function (x) { return ids.indexOf(x) >= 0; }); } catch (e) {}
    if (!bag.length) { bag = ids.slice(); for (var i = bag.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = bag[i]; bag[i] = bag[j]; bag[j] = t; } if (bag[0] === cur && bag.length > 1) bag.push(bag.shift()); }
    var next = bag.shift(); try { sessionStorage.setItem('tol-fb-shuffle', JSON.stringify(bag)); } catch (e) {}
    return next;
  }
  function catalogIds() { var out = []; CATALOG.forEach(function (s) { s.eps.forEach(function (e) { out.push(e.id); }); }); return out; }
  function catalogEntry(id) { var f = null; CATALOG.forEach(function (s) { s.eps.forEach(function (e) { if (e.id === id) f = e; }); }); return f; }

  // ---------- small maths ----------
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mix(a, b, p) { return a + (b - a) * p; }
  function eio(p) { p = clamp(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function sio(p) { p = clamp(p, 0, 1); return 0.5 - 0.5 * Math.cos(Math.PI * p); } // the gentlest ease
  function eout(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
  function bump(p) { p = clamp(p, 0, 1); return Math.sin(Math.PI * p); }
  function sgn(v) { return v < 0 ? -1 : 1; }
  function rnd(i) { var x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }

  // ---------- beats: kinds, lengths, and the whole-episode estimate ----------
  function kindOf(b) {
    if (!b || typeof b !== 'object') return null;
    if (b.title === true) return 'title';
    if (b.say != null) return 'say';
    if (b.act != null) return 'act';
    if (b.scene != null) return 'scene';
    if (b.guest != null) return 'guest';
    if (b.music != null) return 'music';
    if (b.wait != null) return 'wait';
    if (b.place != null || b.props != null) return 'place';
    return null;
  }
  function holdOf(b) { return b.hold != null ? Math.max(0, num(b.hold, HOLD)) : HOLD + (EMO_HOLD[b.mood] || 0); }
  // the little silence after a voiced line ends, before the next beat: quick in an excited back-and-forth, a breath longer
  // after a question (the other one takes it in) or a feeling, longer around the narrator and after a written pause
  function turnGap(b, nxb) {
    var gap = Math.max(0.3, holdOf(b) * 0.55), feel = /sad|worried|proud|sleepy|calm/.test(b.mood || '') && !(b.energy > 1);
    if (nxb && nxb.say != null && nxb.say !== b.say) { // the other one answers
      gap = /excited|silly|surprised/.test(b.mood + ' ' + nxb.mood) ? 0.22 : b.mood === 'sad' || nxb.mood === 'sad' || b.mood === 'sleepy' ? 0.55 : 0.3;
      if (/\?\s*$/.test(b.text || '')) gap += 0.2; else if (feel) gap += 0.12;
      if (b.say === 'narrator' || nxb.say === 'narrator') gap = Math.max(gap, 0.5);
    } else if (nxb && nxb.say === b.say) gap = Math.min(gap, 0.38); // she keeps talking
    if (b.hold != null && b.hold >= 1.2) gap = Math.max(gap, 0.7); // a written pause stays a pause
    return gap;
  }
  // small gestures don't hold up the conversation: the next line starts while they play
  var GESTURE = { lookat: 1, wag: 1, laugh: 1, point: 1, wiggle: 1, heart: 1, sparkle: 1, think: 1, shiver: 1, tailtuck: 1, bow: 1, spin: 1, sniff: 1, turnaway: 1, 'rain-drip': 1, cry: 1 };
  function sayTime(b) { var len = String(b.text || '').replace(/[\u{1F000}-\u{1FAFF}☀-➿️]/gu, '').length; return Math.max(MIN_SAY, len / CPS); }
  function whoList(who) { return who === 'both' ? ['tidbit', 'sugarfoot'] : [who || 'tidbit']; }
  // the stage x each character ends up at, so walks can take as long as a calm walk needs
  function newTrack() { return { tidbit: 0.35, sugarfoot: 0.65 }; }
  function bothTo(to, ids, track) {
    var gap = 0.095, t = track.tidbit <= track.sugarfoot; // keep their order
    return { tidbit: clamp(to + (t ? -gap : gap), 0.02, 0.98), sugarfoot: clamp(to + (t ? gap : -gap), 0.02, 0.98) };
  }
  function meetPoints(track, gap) {
    var m = (track.tidbit + track.sugarfoot) / 2, left = track.tidbit <= track.sugarfoot ? 'tidbit' : 'sugarfoot', o = {};
    m = clamp(m, 0.15, 0.85); o[left] = m - gap / 2; o[left === 'tidbit' ? 'sugarfoot' : 'tidbit'] = m + gap / 2; return o;
  }
  function actTargets(b, track) {
    // where each mover is going: { id: x } (used by the estimate and by the stage)
    var a = b.act, out = {};
    if (a === 'hug' || a === 'nuzzle') return meetPoints(track, a === 'hug' ? 0.15 : 0.15);
    if (a === 'highfive') return meetPoints(track, 0.18);
    if (b.to == null || !(a === 'walk' || a === 'run' || a === 'carry' || a === 'hop')) return out;
    var to = clamp(num(b.to, 0.5), 0, 1), ids = whoList(b.who);
    if (b.who === 'both') return bothTo(to, ids, track);
    out[ids[0]] = to; return out;
  }
  function actTime(b, track) {
    var base = ACTIONS[b.act] || 1.6, d = b.dur != null ? Math.max(num(b.dur, base), base * 0.75) : base;
    var tg = actTargets(b, track), far = 0;
    for (var k in tg) far = Math.max(far, Math.abs(tg[k] - (track[k] != null ? track[k] : 0.5)));
    if (b.act === 'walk' || b.act === 'carry') d = Math.max(d, far / WALK_V);
    if (b.act === 'run') d = Math.max(d, far / RUN_V);
    if (b.act === 'hop' && b.to != null) d = Math.max(d, far / 0.09);
    if ((b.act === 'hug' || b.act === 'highfive' || b.act === 'nuzzle') && far > 0.02) d = Math.max(d, base + far / WALK_V * 0.6);
    return d;
  }
  function trackAfter(b, track) {
    var k = kindOf(b);
    if (k === 'place' && b.place) { for (var id in b.place) track[id] = clamp(num(b.place[id], 0.5), 0, 1); }
    if (k === 'act') { var tg = actTargets(b, track); for (var j in tg) track[j] = tg[j]; }
    if (k === 'guest' && !b.exit) track[b.guest] = b.enter === 'left' ? 0.14 : b.enter === 'right' ? 0.86 : 0.5;
  }
  function beatTime(b, track) {
    switch (kindOf(b)) {
      case 'title': return TITLE_T;
      case 'say': return sayTime(b) + holdOf(b);
      case 'act': return actTime(b, track);
      case 'scene': return SCENE_T + (b.caption ? SCENE_CAP : 0.5);
      case 'guest': return b.exit ? GUEST_OUT : GUEST_IN;
      case 'wait': return Math.max(0, num(b.wait, 1));
      case 'place': return 0;
      default: return 0;
    }
  }
  // flatten an episode into timed beats: [{ b, ch, start, dur }], with the title card first
  function flatten(ep) {
    var out = [], t = 0, track = newTrack(), chStart = [];
    out.push({ b: { title: true }, ch: 0, start: 0, dur: TITLE_T }); t = TITLE_T;
    (ep.chapters || []).forEach(function (c, ci) {
      chStart.push(out.length);
      (c.beats || []).forEach(function (b, bi) {
        var d = beatTime(b, track), nb = c.beats[bi + 1];
        if (kindOf(b) === 'act' && GESTURE[b.act] && nb && kindOf(nb) === 'say') d = Math.min(d, b.act === 'laugh' ? 0.9 : 0.45); // as the director plays it: the line starts during the gesture
        out.push({ b: b, ch: ci, start: t, dur: d }); t += d; trackAfter(b, track);
      });
    });
    return { beats: out, total: t, chapterStart: chStart };
  }
  function estimate(ep) {
    var f = flatten(ep), chapters = (ep.chapters || []).map(function (c, i) {
      var s = f.beats[f.chapterStart[i]] ? f.beats[f.chapterStart[i]].start : f.total, e = i + 1 < f.chapterStart.length && f.beats[f.chapterStart[i + 1]] ? f.beats[f.chapterStart[i + 1]].start : f.total;
      return { title: c.title, start: s, dur: e - s };
    });
    var lines = 0, words = 0; f.beats.forEach(function (x) { if (x.b.say != null) { lines++; words += String(x.b.text || '').split(/\s+/).length; } });
    return { total: f.total, minutes: f.total / 60, chapters: chapters, lines: lines, words: words };
  }
  // format and vocabulary checks (the validator prints these; the player just skips what it can't do)
  function lint(ep) {
    var errs = [], warns = [], ids = {};
    function E(m) { errs.push(m); } function Wn(m) { warns.push(m); }
    if (!ep || typeof ep !== 'object') { E('not an object'); return { errors: errs, warnings: warns }; }
    ['id', 'title', 'blurb', 'lesson', 'pillar'].forEach(function (k) { if (!ep[k] || typeof ep[k] !== 'string') E('missing ' + k); });
    if (ep.pillar && ['I', 'II', 'III', 'IV', 'V'].indexOf(ep.pillar) < 0) E('pillar must be I..V');
    if (!Array.isArray(ep.chapters) || !ep.chapters.length) { E('no chapters'); return { errors: errs, warnings: warns }; }
    if (ep.chapters.length < 5 || ep.chapters.length > 7) Wn(ep.chapters.length + ' chapters (5–7 suggested)');
    var guestsIn = {};
    ep.chapters.forEach(function (c, ci) {
      var where = 'chapter ' + (ci + 1);
      if (!c.title) E(where + ': no title');
      if (!Array.isArray(c.beats) || !c.beats.length) { E(where + ': no beats'); return; }
      c.beats.forEach(function (b, bi) {
        var at = where + ' beat ' + (bi + 1), k = kindOf(b);
        if (!k) { E(at + ': unknown beat ' + JSON.stringify(b).slice(0, 80)); return; }
        if (k === 'say') {
          var s = b.say;
          if (!(s === 'tidbit' || s === 'sugarfoot' || s === 'narrator' || GUESTS[s])) E(at + ': unknown speaker "' + s + '"');
          if (GUESTS[s] && !guestsIn[s]) Wn(at + ': ' + s + ' speaks before entering');
          if (typeof b.text !== 'string' || !b.text.trim()) E(at + ': empty line');
          else if (b.text.length > 140) E(at + ': line is ' + b.text.length + ' characters (keep it under 140): "' + b.text.slice(0, 50) + '…"');
          if (b.mood != null && MOODS.indexOf(b.mood) < 0) E(at + ': unknown mood "' + b.mood + '"');
          if (b.hold != null && !(typeof b.hold === 'number' && b.hold >= 0 && b.hold < 10)) E(at + ': hold should be seconds');
        } else if (k === 'act') {
          if (!ACTIONS[b.act]) E(at + ': unknown action "' + b.act + '" (it would fall back to a wiggle)');
          var w = b.who == null ? 'tidbit' : b.who;
          if (!(w === 'tidbit' || w === 'sugarfoot' || w === 'both' || GUESTS[w])) E(at + ': unknown who "' + w + '"');
          if ((b.act === 'hug' || b.act === 'highfive' || b.act === 'nuzzle') && b.who !== 'both') Wn(at + ': ' + b.act + ' is for who: "both"');
          if ((b.act === 'carry' || b.act === 'drop') && ITEMS.indexOf(b.item) < 0) E(at + ': unknown item "' + b.item + '"');
          if (b.act === 'give' && !(w === 'tidbit' || w === 'sugarfoot')) E(at + ': give is for a pal (who: tidbit or sugarfoot)');
          if (b.act === 'build' && BUILDS.indexOf(b.item) < 0) E(at + ': unknown build item "' + b.item + '"');
          if (b.act === 'fly' && b.item != null && b.item !== 'kite') E(at + ': fly takes item "kite"');
          if ((b.act === 'lookat' || b.act === 'point') && b.target != null && TARGETS.indexOf(b.target) < 0) E(at + ': unknown target "' + b.target + '"');
          if (b.to != null && !(typeof b.to === 'number' && b.to >= 0 && b.to <= 1)) E(at + ': to should be 0..1');
          if (b.dur != null && !(typeof b.dur === 'number' && b.dur > 0 && b.dur < 30)) E(at + ': dur should be seconds');
        } else if (k === 'scene') {
          if (SCENES.indexOf(b.scene) < 0) E(at + ': unknown scene "' + b.scene + '"');
          if (b.hour != null && !(typeof b.hour === 'number' && b.hour >= 0 && b.hour <= 24)) E(at + ': hour should be 0..24');
          if (b.weather != null && WEATHER.indexOf(b.weather) < 0) E(at + ': unknown weather "' + b.weather + '"');
          lintProps(b.props, at, E);
        } else if (k === 'guest') {
          if (!GUESTS[b.guest]) E(at + ': unknown guest "' + b.guest + '"');
          if (b.exit) { if (!guestsIn[b.guest]) Wn(at + ': ' + b.guest + ' exits without entering'); guestsIn[b.guest] = 0; }
          else { if (b.enter != null && ['left', 'right', 'top'].indexOf(b.enter) < 0) E(at + ': enter should be left, right or top'); guestsIn[b.guest] = 1; }
        } else if (k === 'music') { if (MUSIC.indexOf(b.music) < 0) E(at + ': unknown music "' + b.music + '"'); }
        else if (k === 'wait') { if (!(typeof b.wait === 'number' && b.wait >= 0 && b.wait <= 20)) E(at + ': wait should be 0..20 seconds'); }
        else if (k === 'place') {
          if (b.place) for (var id in b.place) { if (!(id === 'tidbit' || id === 'sugarfoot' || GUESTS[id])) E(at + ': unknown place id "' + id + '"'); else if (!(typeof b.place[id] === 'number' && b.place[id] >= 0 && b.place[id] <= 1)) E(at + ': place should be 0..1'); }
          lintProps(b.props, at, E);
        }
      });
    });
    return { errors: errs, warnings: warns };
  }
  function lintProps(p, at, E) {
    if (p == null) return; if (typeof p !== 'object') { E(at + ': props should be an object'); return; }
    for (var k in p) {
      var v = p[k], x01 = function (x) { return typeof x === 'number' && x >= 0 && x <= 1; };
      if (PROPS.indexOf(itemOf(k)) < 0 || (k !== itemOf(k) && ITEMS.indexOf(itemOf(k)) < 0)) E(at + ': unknown prop "' + k + '" (props: ' + PROPS.join(', ') + ')');
      else if (k === 'treehouse') { if (TREEHOUSE.indexOf(v) < 0) E(at + ': treehouse should be one of ' + TREEHOUSE.join(', ')); }
      else if (k === 'bridge' || k === 'creek' || k === 'skykites' || k === 'constellations') { if (typeof v !== 'boolean') E(at + ': ' + k + ' should be true or false'); }
      else if (k === 'carousel' || k === 'chimney') { if (!(v === false || x01(v))) E(at + ': ' + k + ' should be 0..1 or false'); }
      else if (k === 'glow') { if (GLOW.indexOf(v) < 0) E(at + ': glow should be one of ' + GLOW.join(', ')); }
      else if (k === 'shooting') { if (!(v === false || SHOOTING.indexOf(v) >= 0)) E(at + ': shooting should be one, many or false'); }
      else if (!(v === false || v === null || x01(v) || (Array.isArray(v) && v.length === 2 && x01(v[0]) && typeof v[1] === 'number' && v[1] >= -40 && v[1] <= 240)))
        E(at + ': ' + k + ' should be 0..1 (on the ground), [x, height] (up high), false (blows away or fades) or null (taken)');
    }
  }
  // what can be seen at every line: the props on stage, what each pal carries, a kite in the air (for the validator:
  // a line that mentions the basket should have a basket in sight). Follows the same rules as the stage below.
  function scan(ep) {
    var out = [], carried = { tidbit: null, sugarfoot: null }, flying = { tidbit: false, sugarfoot: false }, ground = [], scen = {};
    var STOP = { walk: 1, run: 1, carry: 1, drop: 1, hug: 1, highfive: 1, nuzzle: 1, sit: 1, lie: 1, sleep: 1, dig: 1, build: 1 };
    function take(it) { for (var i = 0; i < ground.length; i++) if (fam(ground[i].it) === fam(it)) { ground.splice(i, 1); return; } }
    var rider = {};
    function props(p) {
      if (!p) return;
      for (var k in p) {
        var v = p[k];
        if (ITEMS.indexOf(itemOf(k)) >= 0) { ground = ground.filter(function (g2) { return g2.k !== k; }); if (v !== false && v !== null) ground.push({ k: k, it: itemOf(k) }); }
        else if (k === 'treehouse') scen.treehouse = v !== 'none';
        else if (k === 'shooting' || k === 'glow') { /* moments and light, not things */ }
        else scen[k] = v !== false;
      }
    }
    (ep.chapters || []).forEach(function (c, ci) {
      (c.beats || []).forEach(function (b, bi) {
        var k = kindOf(b), ids = whoList(b.who).filter(function (id) { return id in carried; });
        if (k === 'scene') { ground = []; scen = {}; if (b.scene === 'treehouse') scen.treehouse = true; flying.tidbit = flying.sugarfoot = false; props(b.props); }
        else if (k === 'place') props(b.props);
        else if (k === 'act') {
          ids.forEach(function (id) {
            if (b.act === 'drop' && flying[id] && !carried[id]) { flying[id] = false; return; } // a kite let go of: it tumbles away
            if (STOP[b.act]) flying[id] = false;
            if (b.item === 'snailrider' && (b.act === 'carry' || b.act === 'drop')) { rider[id] = b.act === 'carry'; return; }
            if (b.act === 'carry') { carried[id] = ITEMS.indexOf(b.item) >= 0 ? b.item : 'bone'; if (id === ids[0]) take(carried[id]); }
            if (b.act === 'drop') { var it = carried[id] || b.item; if (it && (id === ids[0] || carried[ids[0]] !== it)) ground.push({ k: it, it: it }); carried[id] = null; }
            if (b.act === 'give') { var o = id === 'tidbit' ? 'sugarfoot' : 'tidbit'; carried[o] = merged(carried[o], carried[id]); carried[id] = null; }
            if (b.act === 'fly') { flying[id] = true; if (carried[id] === 'kite') carried[id] = null; take('kite'); }
            if (b.act === 'build') { if (b.item === 'kite') { take('kite'); ground.push({ k: 'kite', it: 'kite' }); } else scen.treehouse = true; }
          });
        } else if (k === 'say') {
          var seen = {}; ground.forEach(function (g2) { seen[g2.it] = 1; }); for (var s in scen) if (scen[s]) seen[s] = 1;
          for (var id2 in carried) { if (carried[id2]) seen[carried[id2]] = 1; if (flying[id2]) seen.kite = 1; if (rider[id2]) seen.snailrider = 1; }
          out.push({ ch: ci, beat: bi, b: b, seen: Object.keys(seen) });
        }
      });
    });
    return out;
  }

  // ---------- item painters: at a pal's mouth (head space, gr false) or on the ground (stage space, y 0 is the ground; gr true) ----------
  // simple, round, readable shapes in the stage's palette; every ITEMS entry has one (the validator checks)
  function paintKite(g, x, y, s, prog, rot, t, look) {
    // Sunny is lemon yellow with a little sun face; 'soggy' is Sunny after the waves (droopy, a cracked stick); 'fly' is Hopper's fly kite
    g.save(); g.translate(x, y); g.rotate(rot || 0); g.scale(s, s); prog = prog == null ? 1 : prog; t = t || 0;
    if (look === 'fly') {
      ell(g, -10, -5, 11, 6.5, 'rgba(206,232,250,.92)', -0.45); ell(g, 10, -5, 11, 6.5, 'rgba(206,232,250,.92)', 0.45);
      ell(g, 0, 3, 7, 12, '#4A4A58'); circ(g, -4.2, -8, 4, '#E4566E'); circ(g, 4.2, -8, 4, '#E4566E'); circ(g, -3.4, -8.8, 1.2, '#fff'); circ(g, 5, -8.8, 1.2, '#fff');
      g.strokeStyle = '#7FB8F0'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 15); for (var f = 1; f < 6; f++) g.lineTo(Math.sin(f + t * 3) * 4, 15 + f * 6); g.stroke();
      g.restore(); return;
    }
    var soggy = look === 'soggy';
    g.globalAlpha *= 0.35 + 0.65 * prog;
    var cols = soggy ? ['#D9C56E', '#C2AE55', '#D9C56E', '#C2AE55'] : ['#FBE38A', '#F2C94C', '#FBE38A', '#F2C94C'];
    [[0, -18, 12, 0], [12, 0, 0, 22], [0, 22, -12, 0], [-12, 0, 0, -18]].forEach(function (p, i) { if (prog < (i + 1) / 4 - 0.01) return; g.fillStyle = cols[i]; g.beginPath(); g.moveTo(0, 0); g.lineTo(p[0], p[1]); g.lineTo(p[2], p[3]); g.closePath(); g.fill(); });
    g.strokeStyle = 'rgba(110,80,40,.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -18); g.lineTo(0, 22); g.moveTo(-12, 0);
    if (soggy) { g.lineTo(-2, 0); g.lineTo(3, 4); g.lineTo(12, 3); } else g.lineTo(12, 0); g.stroke();
    if (prog >= 1 && !soggy) { // the little sun face
      circ(g, 0, 2, 4.6, '#F8A84B'); circ(g, -1.6, 1.2, 0.7, '#6B4A3A'); circ(g, 1.6, 1.2, 0.7, '#6B4A3A');
      g.strokeStyle = '#6B4A3A'; g.lineWidth = 0.7; g.beginPath(); g.arc(0, 2.6, 1.8, 0.3, Math.PI - 0.3); g.stroke();
    }
    if (prog >= 1) {
      g.strokeStyle = soggy ? '#B89A6A' : '#F28A5C'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 22);
      for (var i = 1; i < (soggy ? 4 : 6); i++) g.lineTo(soggy ? i * 1.5 : Math.sin(i + t * 3) * 4, 22 + i * (soggy ? 4 : 6)); g.stroke();
      if (!soggy) [10, 22].forEach(function (d) { var bx = Math.sin(d / 6 + t * 3) * 4; g.fillStyle = '#E4566E'; g.beginPath(); g.moveTo(bx, 22 + d); g.lineTo(bx - 3, 20 + d); g.lineTo(bx - 3, 24 + d); g.closePath(); g.moveTo(bx, 22 + d); g.lineTo(bx + 3, 20 + d); g.lineTo(bx + 3, 24 + d); g.closePath(); g.fill(); });
    }
    g.restore();
  }
  function paintBasket(g, gr, full) {
    if (!gr) line(g, 13, 7, 14, 12, '#8A6340', 1.4);
    g.save(); if (!gr) g.translate(14, 18); else { g.translate(0, -9); g.scale(1.3, 1.3); }
    if (full) { // packed to the top: the blanket rolled on top, and the map poking out
      g.save(); g.translate(5, -10); g.rotate(-0.5); rr(g, -1.5, -4, 3, 10, 1, '#F3E3BE'); rr(g, -1.5, -4, 3, 1.5, 0, '#D0485F'); g.restore();
      rr(g, -10, -11, 20, 6, 3, '#B79CEB'); line(g, -4, -11, -4, -5, 'rgba(255,255,255,.55)', 1); line(g, 3, -11, 3, -5, 'rgba(255,255,255,.55)', 1);
    }
    rr(g, -9, -5, 18, 11, 3, '#C08A4E'); g.strokeStyle = 'rgba(90,60,30,.5)'; g.lineWidth = 0.8; for (var i = -6; i <= 6; i += 4) { g.beginPath(); g.moveTo(i, -5); g.lineTo(i, 6); g.stroke(); }
    rr(g, -9, -7, 18, 4, 2, '#E4566E'); rr(g, -5, -7, 4, 4, 0, '#fff'); rr(g, 3, -7, 4, 4, 0, '#fff'); g.strokeStyle = '#8A6340'; g.lineWidth = 1.4; g.beginPath(); g.arc(0, -6, 7, Math.PI, 0); g.stroke(); g.restore();
  }
  function paintRug(g, cards) { // a picnic blanket spread out flat (stage space), with the job cards tied on for the checklist
    ell(g, 0, -1, 46, 7, '#B79CEB'); g.save(); g.beginPath(); g.ellipse(0, -1, 46, 7, 0, 0, TAU); g.clip();
    for (var i = -40; i <= 40; i += 10) rr(g, i - 2.5, -9, 5, 16, 0, 'rgba(255,255,255,.35)'); rr(g, -48, -2.5, 96, 3, 0, 'rgba(255,255,255,.3)'); g.restore();
    if (cards) [[-34, -9], [-14, -12], [10, -12], [32, -9]].forEach(function (c, k) {
      line(g, c[0] * 1.15, -1, c[0], c[1] + 4, 'rgba(110,80,50,.7)', 0.8);
      g.save(); g.translate(c[0], c[1]); g.rotate((k - 1.5) * 0.12); rr(g, -4.5, -3, 9, 7, 1.5, '#FFFDF6'); line(g, -2.5, -0.5, 2.5, -0.5, '#9B8FB8', 0.8); line(g, -2.5, 1.6, 1.5, 1.6, '#9B8FB8', 0.8); g.restore();
    });
  }
  function paintPage(g, rot, notes) { // a song page: a cream sheet with a few music notes
    g.save(); g.rotate(rot || 0); rr(g, -6, -8, 12, 15, 1.5, '#FFFBEA'); g.strokeStyle = 'rgba(120,110,150,.45)'; g.lineWidth = 0.6;
    for (var y = -5; y <= 4; y += 3) { g.beginPath(); g.moveTo(-4.5, y); g.lineTo(4.5, y); g.stroke(); }
    if (notes !== false) { circ(g, -2, 1.2, 1.3, '#5C4A86'); line(g, -0.8, 1.2, -0.8, -4.6, '#5C4A86', 0.8); circ(g, 2.4, -1.6, 1.3, '#5C4A86'); line(g, 3.6, -1.6, 3.6, -6.4, '#5C4A86', 0.8); }
    g.restore();
  }
  function paintDrum(g) { ell(g, 0, -2, 11, 4, '#E4566E'); rr(g, -11, -14, 22, 12, 2, '#E4566E'); g.strokeStyle = '#F6CB4C'; g.lineWidth = 1.2; g.beginPath(); for (var i = 0; i <= 6; i++) g.lineTo(-11 + i * 22 / 6, i % 2 ? -4 : -12); g.stroke(); ell(g, 0, -14, 11, 4, '#FFF4DE'); g.strokeStyle = '#B03A4F'; g.lineWidth = 1; g.beginPath(); g.ellipse(0, -14, 11, 4, 0, 0, TAU); g.stroke(); line(g, -4, -24, 2, -16, '#9B6B45', 1.6); line(g, 6, -25, 3, -16, '#9B6B45', 1.6); circ(g, -4, -24, 1.6, '#F6EEDD'); circ(g, 6, -25, 1.6, '#F6EEDD'); }
  function paintUke(g) { circ(g, -6, -2, 7, '#E8913F'); circ(g, 4, -2, 5.6, '#E8913F'); circ(g, -1, -2, 2.2, '#6B4A3A'); rr(g, 8, -3.2, 20, 2.8, 1, '#9B6B45'); rr(g, 26, -4.6, 6, 5.6, 1.5, '#6B4A3A'); g.strokeStyle = 'rgba(255,250,235,.8)'; g.lineWidth = 0.4; for (var s = -1; s <= 1; s++) { g.beginPath(); g.moveTo(-8, -2 + s * 0.9); g.lineTo(28, -2 + s * 0.9); g.stroke(); } }
  function paintSign(g, starry) { // a little wooden signpost: "Pond" pointing left, or a star pointing up the hill to the right
    rr(g, -2, -36, 4, 36, 1.5, '#8A6340'); g.save(); g.translate(0, -30); g.fillStyle = '#C9A77A'; g.beginPath();
    if (starry) { g.moveTo(-12, -6); g.lineTo(12, -6); g.lineTo(19, 0); g.lineTo(12, 6); g.lineTo(-12, 6); } else { g.moveTo(12, -6); g.lineTo(-12, -6); g.lineTo(-19, 0); g.lineTo(-12, 6); g.lineTo(12, 6); }
    g.closePath(); g.fill(); g.strokeStyle = '#8A6340'; g.lineWidth = 1; g.stroke();
    g.restore();
    if (starry) star(g, 2, -30, 4.6, '#F6CB4C', 0); else { g.save(); g.fillStyle = '#5A3E28'; g.font = '700 7px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('POND', -2, -29.5); g.restore(); }
  }
  var ITEM_PAINT = {
    basket: function (g, gr) { paintBasket(g, gr, false); },
    picnic: function (g, gr) { paintBasket(g, gr, true); },
    plank: function (g, gr) { g.save(); if (!gr) { g.translate(12, 7); g.rotate(-0.08); rr(g, -22, -2.5, 44, 5, 1.5, '#C9A77A'); } else { rr(g, -22, -5, 44, 5, 1.5, '#C9A77A'); rr(g, -18, -10, 40, 5, 1.5, '#B8946A'); } g.restore(); },
    kite: function (g, gr, st) { if (gr) paintKite(g, 0, -14, 0.8, 1, 1.2, st.t); else paintKite(g, 26, -12, 0.68, 1, 0.5, st.t); },
    soggykite: function (g, gr, st) { if (gr) paintKite(g, 0, -10, 0.8, 1, 1.45, st.t, 'soggy'); else paintKite(g, 24, -4, 0.65, 1, 0.9, st.t, 'soggy'); },
    flykite: function (g, gr, st) { paintKite(g, gr ? 0 : 24, gr ? -10 : -8, gr ? 0.9 : 0.6, 1, gr ? 1.3 : 0.4, st.t, 'fly'); },
    bone: function (g, gr) { g.save(); g.translate(gr ? 0 : 13, gr ? -3 : 7); if (gr) g.scale(1.3, 1.3); g.fillStyle = '#F6EEDD'; g.fillRect(-7, -1.4, 14, 2.8); [[-7, -1], [-7, 1], [7, -1], [7, 1]].forEach(function (p) { circ(g, p[0], p[1] * 2, 2.4, '#F6EEDD'); }); g.restore(); },
    lantern: function (g, gr, st) {
      g.save(); g.translate(gr ? 0 : 14, gr ? -20 : 8); if (!gr) line(g, 0, 0, 0, 7, '#5A4A3A', 1);
      var lit = st.geo && st.geo.dark > 0.15 || st.weather === 'storm', mode = st.glow || 'bright', k = 1;
      if (mode === 'flicker') k = 0.5 + 0.5 * Math.abs(Math.sin(st.t * 9) * Math.sin(st.t * 3.7 + 1)); else if (mode === 'dim') k = 0.3 + 0.04 * Math.sin(st.t * 2);
      if (lit) { var rad = 10 + 16 * k, gl = g.createRadialGradient(0, 13, 1, 0, 13, rad); gl.addColorStop(0, 'rgba(255,220,140,' + (0.55 * k).toFixed(3) + ')'); gl.addColorStop(1, 'rgba(255,220,140,0)'); g.fillStyle = gl; g.fillRect(-rad, 13 - rad, rad * 2, rad * 2); }
      rr(g, -5, 7, 10, 12, 2, '#E8B04F'); rr(g, -3.5, 9, 7, 8, 1, !lit ? '#FCE9B0' : k > 0.8 ? '#FFF3C4' : k > 0.45 ? '#FBE2A0' : '#D9C48E'); rr(g, -6, 6, 12, 2, 1, '#6B4A3A'); rr(g, -6, 18, 12, 2, 1, '#6B4A3A'); g.restore();
    },
    blanket: function (g, gr) { if (gr) { paintRug(g, false); return; } g.save(); g.translate(8, 6); rr(g, 0, 0, 20, 15, 2, '#B79CEB'); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; for (var b2 = 3; b2 < 20; b2 += 5) { g.beginPath(); g.moveTo(b2, 0); g.lineTo(b2, 15); g.stroke(); } g.restore(); },
    checklist: function (g, gr) { if (gr) { paintRug(g, true); return; } ITEM_PAINT.blanket(g, false); g.save(); g.translate(16, 6); rr(g, 0, 0, 7, 5, 1, '#FFFDF6'); rr(g, 3, 6, 7, 5, 1, '#FFFDF6'); g.restore(); },
    flower: function (g, gr) { g.save(); g.translate(gr ? 0 : 12, gr ? 0 : 7); line(g, 0, 0, 8, gr ? -10 : -8, '#5E8E4A', 1.3); for (var f = 0; f < 5; f++) circ(g, 8 + Math.cos(f * 1.26) * 3, (gr ? -10 : -8) + Math.sin(f * 1.26) * 3, 2.2, '#F28AA8'); circ(g, 8, gr ? -10 : -8, 1.6, '#F7DC6F'); g.restore(); },
    map: function (g, gr) { g.save(); g.translate(gr ? 0 : 13, gr ? -3 : 7.5); if (gr) g.scale(1.3, 1.3); else g.rotate(-0.1); rr(g, -9, -3, 18, 6, 3, '#F3E3BE'); ell(g, -9, 0, 1.8, 3, '#E2CC9C'); ell(g, 9, 0, 1.8, 3, '#E2CC9C'); rr(g, -1.5, -3.2, 3, 6.4, 0, '#D0485F'); g.restore(); },
    toolbox: function (g, gr) { g.save(); g.translate(gr ? 0 : 14, gr ? -8 : 17); if (gr) g.scale(1.2, 1.2); if (!gr) line(g, 0, -10, 0, -6, '#3A3A40', 1.2); rr(g, -10, -6, 20, 12, 2, '#D0485F'); rr(g, -10, -6, 20, 3, 1, '#B03A4F'); g.strokeStyle = '#3A3A40'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-4, -6); g.lineTo(-4, -9); g.lineTo(4, -9); g.lineTo(4, -6); g.stroke(); rr(g, -2, -1, 4, 3, 1, '#F6CB4C'); g.restore(); },
    hammer: function (g, gr) { g.save(); if (gr) { g.translate(0, -3); g.rotate(1.45); } else { g.translate(13, 7); g.rotate(-0.4); } rr(g, -1, -10, 2.4, 14, 1, '#9B6B45'); rr(g, -4, -12, 9, 4, 1, '#6E6E78'); g.restore(); },
    rope: function (g, gr) { g.save(); g.translate(gr ? 0 : 14, gr ? -4 : 12); g.strokeStyle = '#C9A77A'; g.lineWidth = 2; for (var r2 = 0; r2 < 3; r2++) { g.beginPath(); g.ellipse(0, 0, 7 - r2 * 1.5, 4 - r2, 0, 0, TAU); g.stroke(); } g.restore(); },
    page: function (g, gr) { g.save(); if (gr) { g.translate(0, -8); g.scale(1.3, 1.3); paintPage(g, 0.12); } else { g.translate(15, 12); paintPage(g, 0.2); } g.restore(); },
    pages: function (g, gr) { g.save(); if (gr) { g.translate(0, -8); g.scale(1.3, 1.3); } else g.translate(15, 12); paintPage(g, -0.25, false); paintPage(g, 0.05, false); paintPage(g, 0.3); g.restore(); },
    paperboat: function (g, gr) { g.save(); g.translate(gr ? 0 : 16, gr ? -2 : 12); g.scale(1.3, 1.3); g.fillStyle = '#FFFBEA'; g.beginPath(); g.moveTo(-11, -6); g.lineTo(11, -6); g.lineTo(7, 0); g.lineTo(-7, 0); g.closePath(); g.fill(); g.beginPath(); g.moveTo(-4, -6); g.lineTo(1, -17); g.lineTo(6, -6); g.closePath(); g.fill(); g.strokeStyle = 'rgba(120,110,150,.5)'; g.lineWidth = 0.6; g.stroke(); circ(g, 1, -9, 1.1, '#5C4A86'); line(g, 2, -9, 2, -13, '#5C4A86', 0.6); circ(g, -3, -3, 1, '#5C4A86'); g.restore(); },
    pole: function (g, gr) { if (gr) { rr(g, -40, -4, 80, 3.4, 1.7, '#B8946A'); return; } g.save(); g.translate(12, 8); g.rotate(-1.05); rr(g, -14, -1.7, 86, 3.4, 1.7, '#B8946A'); g.restore(); },
    drum: function (g, gr) { g.save(); if (gr) g.scale(1.2, 1.2); else { g.translate(16, 22); g.scale(0.7, 0.7); } paintDrum(g); g.restore(); },
    ukulele: function (g, gr) { g.save(); if (gr) { g.translate(-6, -10); g.rotate(-0.6); } else { g.translate(14, 10); g.scale(0.7, 0.7); } paintUke(g); g.restore(); },
    stick: function (g, gr) { g.save(); g.translate(gr ? 0 : 14, gr ? -2 : 7); g.scale(gr ? 1.3 : 1.15, gr ? 1.3 : 1.15); line(g, -14, 1.5, 14, -1, '#7A5636', 2.6); line(g, 4, -0.5, 9, -7, '#7A5636', 1.8); ell(g, 10.5, -9, 4, 2.2, '#8FC46B', -0.6); ell(g, -9, -1.5, 3, 1.6, '#8FC46B', 0.5); g.restore(); },
    pinecones: function (g, gr) { // thirteen jobs, one pinecone each
      g.save(); if (!gr) { g.translate(14, 12); g.scale(0.6, 0.6); } else { g.translate(0, -3); g.scale(1.6, 1.6); }
      for (var i = 0; i < 13; i++) { var row = i < 6 ? 0 : i < 11 ? 1 : 2, n = row === 0 ? 6 : row === 1 ? 5 : 2, k = row === 0 ? i : row === 1 ? i - 6 : i - 11, px = (k - (n - 1) / 2) * 6.2, py = -row * 4.6;
        ell(g, px, py, 2.8, 3.6, '#8A5A3A'); line(g, px - 2, py - 1, px + 2, py - 1, 'rgba(255,220,170,.45)', 0.7); line(g, px - 2, py + 1.2, px + 2, py + 1.2, 'rgba(255,220,170,.45)', 0.7); }
      g.restore();
    },
    pinecone: function (g, gr) { // one and a half (the shiny rock was generous)
      g.save(); if (!gr) { g.translate(14, 12); g.scale(0.7, 0.7); } else { g.translate(0, -4); g.scale(1.6, 1.6); }
      ell(g, -3, 0, 2.8, 3.6, '#8A5A3A'); line(g, -5, -1, -1, -1, 'rgba(255,220,170,.45)', 0.7);
      g.save(); g.beginPath(); g.rect(1, -5, 6, 10); g.clip(); ell(g, 4, 0, 2.8, 3.6, '#8A5A3A'); g.restore(); g.restore();
    },
    lens: function (g, gr) { g.save(); g.translate(gr ? 0 : 18, gr ? -14 : 6); if (gr) g.scale(1.5, 1.5); g.rotate(0.6); rr(g, -1.6, 7, 3.2, 12, 1.5, '#8A6340'); circ(g, 0, 0, 8.4, '#C9A77A'); circ(g, 0, 0, 7, 'rgba(190,226,246,.75)'); ell(g, -2.6, -2.6, 2.2, 1.2, 'rgba(255,255,255,.8)', -0.7); g.restore(); },
    bell: function (g, gr) { // the big lighthouse bell, on a little wooden frame
      g.save(); if (!gr) { g.translate(14, 14); g.scale(0.5, 0.5); }
      rr(g, -16, -46, 4, 46, 1.5, '#8A6340'); rr(g, 12, -46, 4, 46, 1.5, '#8A6340'); rr(g, -19, -49, 38, 5, 2, '#6B4A3A');
      g.fillStyle = '#E8B04F'; g.beginPath(); g.moveTo(-3, -44); g.quadraticCurveTo(-9, -42, -9, -30); g.lineTo(-11, -24); g.lineTo(11, -24); g.lineTo(9, -30); g.quadraticCurveTo(9, -42, 3, -44); g.closePath(); g.fill();
      ell(g, -3.5, -36, 1.6, 4.5, 'rgba(255,245,210,.6)'); circ(g, 0, -23, 2.4, '#B07F2E'); g.restore();
    },
    sign: function (g, gr) { if (!gr) { g.save(); g.translate(14, 30); g.scale(0.6, 0.6); paintSign(g, false); g.restore(); return; } g.save(); g.scale(1.25, 1.25); paintSign(g, false); g.restore(); },
    starsign: function (g, gr) { if (!gr) { g.save(); g.translate(14, 30); g.scale(0.6, 0.6); paintSign(g, true); g.restore(); return; } g.save(); g.scale(1.25, 1.25); paintSign(g, true); g.restore(); },
    stump: function (g, gr) { // a tree stump shaped like a big armchair
      g.save(); if (!gr) { g.translate(14, 14); g.scale(0.4, 0.4); }
      rr(g, -22, -18, 44, 18, 4, '#9B6B45'); rr(g, -22, -40, 13, 34, 5, '#8A5A3A'); rr(g, 12, -26, 10, 20, 4, '#8A5A3A'); rr(g, -22, -26, 9, 20, 4, '#8A5A3A');
      ell(g, 0, -18, 20, 3.6, '#C9A77A'); g.strokeStyle = 'rgba(120,80,40,.45)'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(2, -18, 11, 2, 0, 0, TAU); g.stroke(); ell(g, -16, -41, 5, 2, '#8FC46B'); g.restore();
    },
    log: function (g, gr) { g.save(); if (!gr) { g.translate(14, 12); g.scale(0.4, 0.4); } rr(g, -34, -15, 68, 15, 7, '#8A5A3A'); ell(g, 33, -7.5, 4, 7.5, '#C9A77A'); ell(g, 33, -7.5, 1.6, 3.4, '#9B6B45'); [[-22, 8], [-4, 12], [16, 8]].forEach(function (m) { ell(g, m[0], -14, m[1], 3, '#7FB06A'); }); g.restore(); },
    bottle: function (g, gr) { // a map that came in a bottle
      g.save(); g.translate(gr ? 0 : 16, gr ? -6 : 10); if (gr) g.scale(1.3, 1.3); g.rotate(gr ? 0 : -0.25);
      rr(g, -12, -5, 18, 10, 4, 'rgba(170,220,215,.8)'); rr(g, 5, -2.6, 6, 5.2, 1.5, 'rgba(170,220,215,.8)'); rr(g, 10, -2.2, 3.4, 4.4, 1, '#B8865A');
      rr(g, -9, -2.4, 12, 4.8, 2.4, '#F3E3BE'); rr(g, -4, -2.4, 2, 4.8, 0, '#D0485F'); ell(g, -7, -3.2, 3, 1, 'rgba(255,255,255,.7)'); g.restore();
    },
    rowboat: function (g, gr) { // an old sunken rowboat, with its rope trailing (the end all thin and fuzzy)
      g.save(); if (!gr) { g.translate(14, 12); g.scale(0.3, 0.3); } g.rotate(-0.12);
      g.fillStyle = '#8A6340'; g.beginPath(); g.moveTo(-40, -22); g.lineTo(40, -22); g.quadraticCurveTo(36, 0, 22, 0); g.lineTo(-24, 0); g.quadraticCurveTo(-38, 0, -40, -22); g.fill();
      rr(g, -40, -24, 80, 4, 2, '#6B4A3A'); line(g, -14, -20, -12, -2, 'rgba(60,40,25,.4)', 1); line(g, 12, -20, 11, -2, 'rgba(60,40,25,.4)', 1); ell(g, -26, -6, 7, 2.4, 'rgba(127,176,106,.8)');
      g.restore();
      g.strokeStyle = '#C9A77A'; g.lineWidth = 2; g.beginPath(); g.moveTo(gr ? 36 : 25, gr ? -18 : 7); g.quadraticCurveTo(gr ? 52 : 28, gr ? -2 : 11, gr ? 66 : 32, gr ? -3 : 11); g.stroke();
      g.strokeStyle = 'rgba(201,167,122,.7)'; g.lineWidth = 0.6; for (var f = 0; f < 5; f++) { g.beginPath(); g.moveTo(gr ? 66 : 32, gr ? -3 : 11); g.lineTo((gr ? 70 : 34) + f * 0.6, (gr ? -6 : 9) + f * 1.6); g.stroke(); }
    },
    snailrider: function (g, gr) { // Dot, riding along on Sugarfoot's back
      g.save(); g.translate(gr ? 0 : -27, gr ? 0 : -2); g.scale(0.55, 0.55);
      ell(g, 2, -5, 18, 4.5, '#B9C79A'); line(g, 13, -8, 15, -18, '#9DAE7C', 1.8); line(g, 17, -7, 21, -17, '#9DAE7C', 1.8); circ(g, 15, -19, 2.4, '#fff'); circ(g, 21, -18, 2.4, '#fff'); circ(g, 15.6, -19, 1.2, '#221c1c'); circ(g, 21.6, -18, 1.2, '#221c1c');
      circ(g, -3, -14, 10, '#E7A76B'); g.strokeStyle = '#B86B3B'; g.lineWidth = 1.8; g.beginPath(); for (var a = 0; a < 12; a += 0.3) { var r = 8.5 - a * 0.7; if (r < 0.5) break; g.lineTo(-3 + Math.cos(a) * r, -14 + Math.sin(a) * r); } g.stroke();
      g.restore();
    }
  };

  var API = root.TOLBuddiesPlayer = {
    vocab: { scenes: SCENES, weather: WEATHER, moods: MOODS, music: MUSIC, items: ITEMS, builds: BUILDS, targets: TARGETS, props: PROPS, scenery: SCENERY, family: FAMILY, treehouse: TREEHOUSE, actions: Object.keys(ACTIONS), guests: Object.keys(GUESTS), speakers: ['tidbit', 'sugarfoot', 'narrator'].concat(Object.keys(GUESTS)) },
    pacing: { cps: CPS, minSay: MIN_SAY, hold: HOLD, emoHold: EMO_HOLD, scene: SCENE_T, sceneCaption: SCENE_CAP, guestIn: GUEST_IN, guestOut: GUEST_OUT, title: TITLE_T, walk: WALK_V, run: RUN_V, actions: ACTIONS },
    estimate: estimate, lint: lint, flatten: flatten, scan: scan, family: fam, catalog: function () { return JSON.parse(JSON.stringify(CATALOG)); }, catalogIds: catalogIds,
    guests: GUESTS, painted: Object.keys(ITEM_PAINT), paintItem: function (g, it, ground, st) { ITEM_PAINT[it](g, !!ground, st || { t: 0, glow: 'bright' }); }
  };
  if (!HAS_DOM) return;
  // =====================================================================================================
  // THE STAGE: everything that is drawn. It knows nothing about timing; the director tells it what happens.
  // =====================================================================================================
  var LH = 300, G = 248, SP = 1.5, TAU = Math.PI * 2;
  var REDUCED_MQ = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function stillNow() { return REDUCED_MQ || !!((window.TOLStill && (window.TOLStill.chosen ? window.TOLStill.chosen() : window.TOLStill.on()))); }
  function geoFor(w, h) {
    var lw = clamp(w / h * LH, 320, 560), k = Math.min(w / lw, h / LH), ox = (w - lw * k) / 2, oy = (h - LH * k) * 0.62;
    return { LW: lw, LH: LH, G: G, k: k, ox: ox, oy: oy, x0: -ox / k, x1: (w - ox) / k, y0: -oy / k, y1: (h - oy) / k };
  }
  function rr(g, x, y, w, h, r, col) { g.fillStyle = col; g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); }
  function circ(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, Math.max(0.01, r), 0, TAU); g.fill(); }
  function ell(g, x, y, rx, ry, col, rot) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); g.fill(); }
  function line(g, x1, y1, x2, y2, col, w) { g.strokeStyle = col; g.lineWidth = w || 1.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  function heart(g, x, y, r, col) {
    g.fillStyle = col || '#F28AA8'; g.beginPath(); g.moveTo(x, y + r * 0.9);
    g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.5, x, y - r * 0.5);
    g.bezierCurveTo(x + r * 0.7, y - r * 1.5, x + r * 1.6, y - r * 0.2, x, y + r * 0.9); g.fill();
  }
  function star(g, x, y, r, col, rot) {
    g.fillStyle = col || '#F8D76A'; g.beginPath();
    for (var i = 0; i < 10; i++) { var a = (rot || 0) - Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    g.closePath(); g.fill();
  }
  var FONT = 'Fraunces, Georgia, serif';

  function makeStage(opts) {
    opts = opts || {};
    var S = {
      t: 0, scene: 'blank', hour: 12, weather: 'clear', props: {}, ground: [], chars: {}, guests: {}, parts: [], wx: [], flash: 0, nextFlash: 6, bright: !!opts.bright, glowT0: -99,
      bubble: null, card: null, trans: null, title: null, geo: null, bg: null, bgKey: '', reduced: !!opts.reduced || stillNow(), compact: !!opts.compact,
      noBubbleText: !!opts.noBubbleText, ep: null, shoot: null, lastEmit: {}
    };
    function pal(id, x) { return { id: id, look: PALS[id].look, x: x, face: id === 'tidbit' ? 1 : -1, fx: id === 'tidbit' ? 1 : -1, pose: 'stand', mood: 'happy', item: null, act: null, talk: 0, ph: 0, tilt0: 0, sleep: false, kite: false, popT: -9, prevPose: 'stand', breathe: 0 }; }
    function reset() {
      S.scene = 'blank'; S.hour = 12; S.weather = 'clear'; S.props = {}; S.ground = []; S.parts = []; S.wx = []; S.bubble = null; S.card = null; S.trans = null; S.title = null; S.think = null;
      S.glow = 'bright'; S.leaving = []; S.shoots = [];
      S.chars = { tidbit: pal('tidbit', 0.35), sugarfoot: pal('sugarfoot', 0.65) }; S.guests = {}; S.bgKey = ''; S.flash = 0;
    }
    reset();
    S.reset = reset;
    function all() { var a = [S.chars.tidbit, S.chars.sugarfoot]; for (var k in S.guests) a.push(S.guests[k]); return a; }
    function get(id) { return S.chars[id] || S.guests[id] || null; }
    S.get = get;
    function other(c) { return c.id === 'tidbit' ? S.chars.sugarfoot : c.id === 'sugarfoot' ? S.chars.tidbit : S.chars.tidbit; }
    var track = function () { var t = {}; all().forEach(function (c) { t[c.id] = c.x; }); return t; };

    // ---------- scene state ----------
    function thState(v) { return v === 'none' ? { b: 0, r: 0, w: 0 } : v === 'frame' ? { b: 0.5, r: 0, w: 0 } : v === 'built' ? { b: 1, r: 0, w: 0 } : v === 'wrecked' ? { b: 1, r: 0, w: 1 } : { b: 1, r: 1, w: 0 }; }
    S.applyScene = function (b) {
      S.scene = SCENES.indexOf(b.scene) >= 0 ? b.scene : 'blank'; S.hour = num(b.hour, S.hour); S.weather = WEATHER.indexOf(b.weather) >= 0 ? b.weather : 'clear';
      S.ground = []; S.leaving = []; S.shoots = []; S.props = {}; S.bgKey = ''; S.wx = []; S.parts = [];
      if (S.scene === 'treehouse') S.props.treehouse = { b: 1, r: 1, w: 0 };
      S.applyProps(b.props, true);
      all().forEach(function (c) { c.kite = false; });
    };
    // an item that goes away (a prop set to false): up-high things blow away on the wind, things on the ground fade
    function leave(it, instant) { if (!instant && S.geo) S.leaving.push({ item: it.item, x: it.x, h: it.h || 0, t0: S.t, prog: it.prog }); }
    S.applyProps = function (p, instant) {
      if (!p) return;
      for (var k in p) {
        var v = p[k];
        if (ITEMS.indexOf(itemOf(k)) >= 0) {
          S.ground = S.ground.filter(function (g2) { if ((g2.key || g2.item) !== k) return true; if (v === false) leave(g2, instant); return false; });
          if (v !== false && v !== null) { var at = Array.isArray(v) ? v : [v, 0]; S.ground.push({ item: itemOf(k), key: k, x: clamp(num(at[0], 0.5), 0, 1), h: num(at[1], 0), t0: instant ? -9 : S.t }); }
        }
        else if (k === 'treehouse') S.props.treehouse = thState(v);
        else if (k === 'glow') S.glow = GLOW.indexOf(v) >= 0 ? v : 'bright';
        else if (k === 'shooting') { S.props.shooting = v === 'many' ? 'many' : null; if (v === 'one' && !instant) shootStar(); }
        else if (k === 'carousel' || k === 'chimney') S.props[k] = v === false ? null : clamp(num(v, 0.75), 0, 1);
        else S.props[k] = !!v;
      }
    };
    S.place = function (pl, instant) {
      var tg = {}, ids = [];
      for (var id in pl) { var c = get(id); if (!c) continue; tg[id] = clamp(num(pl[id], c.x), 0, 1); ids.push(id); }
      var two = ids.filter(function (i) { return i === 'tidbit' || i === 'sugarfoot'; });
      if (two.length) spaceOut('_place', two, tg); // never set down on top of each other (on a narrow stage too)
      ids.forEach(function (id) { var c = get(id), x = tg[id]; if (instant) { c.x = x; c.act = null; } else { c.act = { name: '_place', t0: S.t, dur: PLACE_T, fromX: c.x, toX: x, p: {} }; } });
    };
    S.addGuest = function (id, enter, name, instant) {
      if (!GUESTS[id]) return;
      var gd = GUESTS[id], x = enter === 'left' ? 0.14 : enter === 'right' ? 0.86 : 0.5;
      var c = S.guests[id] = { id: id, guest: true, x: x, face: enter === 'right' ? -1 : 1, fx: enter === 'right' ? -1 : 1, mood: 'happy', talk: 0, name: name || gd.name, enter: enter || 'left', t0: S.t, inT: instant ? 0 : GUEST_IN * 0.8, out: null, act: null, ph: 0, lift: 0 };
      // she looks at whoever she's meeting
      var mid = (S.chars.tidbit.x + S.chars.sugarfoot.x) / 2; c.fx = c.face = x < mid ? 1 : -1;
      if (!instant) S.card = { text: c.name, t0: S.t, dur: 2.4, small: true };
    };
    S.removeGuest = function (id, instant) { var c = S.guests[id]; if (!c) return; if (instant) delete S.guests[id]; else c.out = { t0: S.t, dur: GUEST_OUT * 0.85 }; };

    // ---------- actions ----------
    var MOVE = { walk: 1, run: 1, carry: 1, hop: 1 };
    S.beginAct = function (b) {
      var name = ACTIONS[b.act] ? b.act : 'wiggle', ids = b.who === 'both' ? ['tidbit', 'sugarfoot'] : [b.who || 'tidbit'];
      var tr = track(), tg = actTargets(b, tr), dur = actTime(b, tr);
      spaceOut(name, ids, tg);
      ids.forEach(function (id) {
        var c = get(id); if (!c) return;
        commit(c);
        var a = { name: name, t0: S.t, dur: dur, p: b, fromX: c.x, toX: tg[id] != null ? tg[id] : c.x, fromPose: c.pose };
        if (tg[id] != null && Math.abs(a.toX - a.fromX) > 0.005) c.fx = sgn(a.toX - a.fromX);
        c.act = a; start(c, a);
      });
      return dur;
    };
    // the pals never end a move (or get placed) with their heads on top of each other. The room that takes depends on
    // how big they are drawn on this stage: a pup's head reaches about 42 units (times S.sp) out in front of her middle,
    // so two pals facing each other need twice that between their middles, which is a much bigger share of a narrow
    // phone stage than of a wide one. Hugs, nuzzles and high-fives come closer: snout to snout, cheeks touching.
    var REACH = 43, REACH_CLOSE = 38.5, CLOSE = { hug: 1, nuzzle: 1, highfive: 1 };
    function span() { var gg = S.geo; return gg ? Math.max(120, gg.x1 - gg.x0 - 68) : 465; }
    function pairGap(close) { return clamp(2 * (close ? REACH_CLOSE : REACH) * (S.sp || SP) / span(), 0.1, 0.42); }
    S.pairGap = pairGap;
    function spaceOut(name, ids, tg) {
      var close = !!CLOSE[name], GAP = pairGap(close);
      if (ids.length === 2) {
        var T = S.chars.tidbit, Sg = S.chars.sugarfoot, together = name === 'carry' || (T.shared && Sg.shared && T.item && T.item === Sg.item);
        if (together && tg.tidbit == null) { tg.tidbit = T.x; tg.sugarfoot = Sg.x; } // picking it up together: they step apart to hold each side
        if (tg.tidbit == null || tg.sugarfoot == null) return;
        var need = together ? Math.max(0.27, GAP) : GAP, d = tg.sugarfoot - tg.tidbit; if (Math.abs(d) >= need - 1e-6) return;
        var mid = clamp((tg.tidbit + tg.sugarfoot) / 2, 0.03 + need / 2, 0.97 - need / 2), side = d !== 0 ? sgn(d) : sgn(Sg.x - T.x) || 1;
        tg.tidbit = mid - side * need / 2; tg.sugarfoot = mid + side * need / 2; return;
      }
      var id = ids[0], c = get(id); if (!c || c.guest || tg[id] == null) return;
      var o = other(c), ox = o.act && o.act.toX != null ? o.act.toX : o.x;
      if (Math.abs(tg[id] - ox) >= GAP - 1e-6) return;
      var from = c.x <= ox ? -1 : 1, want = ox + from * GAP;
      if (want < 0.03 || want > 0.97) want = ox - from * GAP;
      tg[id] = clamp(want, 0.03, 0.97);
    }
    // picking something up takes the nearest one of its kind lying there (or the page caught as it flutters down)
    function pickUp(it, x, within) {
      var best = -1, d = within; S.ground.forEach(function (g2, i) { var dd = Math.abs(g2.x - x); if (fam(g2.item) === fam(it) && dd <= d) { best = i; d = dd; } });
      if (best >= 0) S.ground.splice(best, 1);
    }
    function start(c, a) {
      var n = a.name, p = a.p, o = other(c);
      if (n === 'drop' && c.kite && !c.item) { if (c.kitePos) S.leaving.push({ item: 'kite', fall: true, sx: c.kitePos.x, sy: c.kitePos.y, dir: c.fx, t0: S.t }); c.kite = false; c.tilt0 = 0; return; } // let go: the kite tumbles away
      if (n !== 'lookat' && n !== 'point' && n !== 'heart' && n !== 'sparkle' && n !== 'think') c.tilt0 = 0;
      if (c.sleep && n !== 'sleep' && n !== 'heart' && n !== 'sparkle') c.sleep = false;
      if (c.kite && ['walk', 'run', 'carry', 'drop', 'hug', 'highfive', 'nuzzle', 'sit', 'lie', 'sleep', 'dig', 'build'].indexOf(n) >= 0) c.kite = false;
      if (n === 'hug' || n === 'highfive' || n === 'nuzzle') { if (Math.abs(a.toX - a.fromX) < 0.005) c.fx = sgn(o.x - c.x); }
      if ((n === 'carry' || n === 'drop') && p.item === 'snailrider') { c.rider = n === 'carry'; return; } // a friend riding on her back
      if (n === 'give') { var to = other(c); if (c.item) { to.item = merged(to.item, c.item); c.item = null; c.shared = to.shared = false; } c.fx = sgn(to.x - c.x); return; }
      if (n === 'carry') { if (c.pose === 'sit' || c.pose === 'lie') setPose(c, 'stand'); c.shared = p.who === 'both'; c.item = ITEMS.indexOf(p.item) >= 0 ? p.item : 'bone'; pickUp(c.item, c.x, 0.5); }
      if (n === 'tailtuck' || n === 'cry') c.mood = 'sad';
      if (n === 'shiver') c.mood = c.mood === 'happy' ? 'worried' : c.mood;
      if (n === 'lookat' || n === 'point') { var tgt = p.target || 'other'; if (tgt === 'other') { c.fx = sgn(o.x - c.x); c.tilt0 = 0; } else if (tgt === 'left') { c.fx = -1; c.tilt0 = 0; } else if (tgt === 'right') { c.fx = 1; c.tilt0 = 0; } else if (tgt === 'up') c.tilt0 = -0.42; }
      if (n === 'turnaway') c.fx = -sgn(o.x - c.x);
      if (n === 'sit' || n === 'lie' || n === 'bow') setPose(c, n);
      if (n === 'sleep') { setPose(c, 'lie'); c.sleep = true; c.mood = 'sleepy'; }
      if (n === 'walk' || n === 'run' || n === 'carry' && a.toX !== a.fromX) setPose(c, 'stand');
      if (n === 'fly') { c.kite = true; c.tilt0 = -0.3; if (c.item === 'kite') c.item = null; else pickUp('kite', c.x, 1); setPose(c, 'stand'); }
      if (n === 'build' || n === 'dig') { a.prevPose = c.pose; setPose(c, 'bow'); }
      if (n === 'build' && S.scene === 'treehouse' && p.item !== 'kite' && S.geo) c.fx = sgn(thX() + 30 - X(c.x)); // face the tree they're building in
      if (n === 'build') {
        var it = BUILDS.indexOf(p.item) >= 0 ? p.item : 'treehouse';
        if (it === 'kite') { var k = S.ground.filter(function (g2) { return g2.item === 'kitebuild'; })[0];
          if (!k) { var old = S.ground.filter(function (g2) { return fam(g2.item) === 'kite' && !g2.h; })[0]; // mending the one that's there
            if (old) { S.ground.splice(S.ground.indexOf(old), 1); k = { item: 'kitebuild', x: old.x, prog: 0.5, mend: true }; } else k = { item: 'kitebuild', x: clamp(c.x + c.fx * 0.1, 0.05, 0.95), prog: 0 }; S.ground.push(k); } a.kb = k; a.from = k.prog; a.to = p.to != null ? clamp(num(p.to, 1), 0, 1) : Math.min(1, k.prog + 0.5); }
        else { var th = S.props.treehouse || (S.props.treehouse = { b: 0, r: 0, w: 0 }); a.th = th; a.key = it === 'roof' ? 'r' : 'b';
          if (a.key === 'b' && th.w) { th.w = 0; th.b = 0; }
          a.from = th[a.key]; a.to = p.to != null ? clamp(num(p.to, 1), 0, 1) : Math.min(1, th[a.key] + (a.key === 'r' ? 1 : 0.34)); }
      }
      if (n === 'drop') {
        var itm = c.item || (ITEMS.indexOf(p.item) >= 0 ? p.item : null), oc = other(c);
        if (!c.item && p.who === 'both' && S.ground.some(function (g2) { return g2.item === itm && g2.t0 === S.t; })) itm = null; // her pal already set the shared one down
        if (c.shared && oc && oc.shared && oc.item === itm) { // a shared basket goes down once, between them
          S.ground.push({ item: itm, x: clamp((c.x + oc.x) / 2, 0.03, 0.97), t0: S.t }); c.item = null; oc.item = null; c.shared = oc.shared = false;
        } else if (itm) { S.ground.push({ item: itm, x: clamp(c.x + c.fx * 0.1, 0.03, 0.97), t0: S.t }); c.item = null; c.shared = false; } // set down just past her paws, where it can be seen
      }
      if (n === 'pause-breath') c.mood = 'calm';
      if (n === 'highfive') { a.sound = true; }
    }
    function setPose(c, p) { if (c.pose !== p) { c.prevPose = c.pose; c.pose = p; c.popT = S.t; } }
    function commit(c) {
      var a = c.act; if (!a) return; c.act = null;
      if (a.name === '_place') { c.x = a.toX; return; } // cut short by the next action: she still ends up where she was going
      if (MOVE[a.name] || a.name === 'hug' || a.name === 'highfive' || a.name === 'nuzzle') c.x = a.toX;
      if (a.name === 'build') { if (a.th) a.th[a.key] = a.to; if (a.kb) a.kb.prog = a.to; if (a.prevPose) setPose(c, a.prevPose === 'bow' ? 'stand' : a.prevPose); }
      if (a.name === 'dig') setPose(c, a.prevPose || 'stand');
      if (a.name === 'hop' || a.name === 'jump' || a.name === 'splash') { if (c.pose === 'lie') setPose(c, 'stand'); }
      if (a.name === 'hug' || a.name === 'nuzzle' || a.name === 'highfive') c.fx = sgn(other(c).x - c.x);
      if (c.guest && a.toX != null) c.x = a.toX;
    }
    S.endActs = function (force, keepGestures) { all().forEach(function (c) { if (c.act && c.act.name === '_place' && !force) return; if (keepGestures && c.act && GESTURE[c.act.name]) return; commit(c); }); };
    S.instantAct = function (b) { S.beginAct(b); S.endActs(true); };

    // ---------- speaking ----------
    // who a line is spoken to: 'self' (thinking out loud), the other pal, a guest, or 'both' / 'all'
    function addressee(b) { var to = b.to; if (!to) { var c0 = get(b.say); return c0 && !c0.guest ? 'pal' : null; } return to; }
    function passing(c) { if (c.guest) return 0; var o = other(c); if (!o || !walking(c) || walking(o) && c.act.toX > c.act.fromX === o.act.toX > o.act.fromX) return 0; var q = clamp(1 - Math.abs(c.x - o.x) / 0.14, 0, 1); return q * q * (3 - 2 * q); }
    function walking(c) { var a = c.act; return !!(a && a.toX != null && a.toX !== a.fromX); }
    function turnTo(c, x) { if (c && !walking(c) && Math.abs(x - c.x) > 0.01) c.fx = sgn(x - c.x); }
    function faceFor(b) {
      var c = get(b.say); if (!c) return; var to = addressee(b), o;
      c.tilt0 = 0;
      if (to === 'self') { c.tilt0 = 0.14; return; } // head a little down: she's talking to herself
      if (to === 'pal') o = c.guest ? null : other(c); else if (to === 'both' || to === 'all') o = null; else o = get(to);
      if (o && o !== c) { turnTo(c, o.x); turnTo(o, c.x); return; }
      // several listeners: face the middle of the others, and they all look at her
      var xs = all().filter(function (x) { return x !== c && (to !== 'both' || !x.guest); });
      if (!xs.length) xs = all().filter(function (x) { return x !== c; });
      if (xs.length) { var mx = 0; xs.forEach(function (x) { mx += x.x; turnTo(x, c.x); }); turnTo(c, mx / xs.length); }
    }
    S.say = function (b, dur, wait) {
      var c = get(b.say);
      all().forEach(function (x) { x.talk = 0; x.talkFrom = 0; });
      if (c) { if (b.mood && MOODS.indexOf(b.mood) >= 0) c.mood = b.mood; if (c.sleep) c.sleep = false; if (!wait) { c.talkUntil = S.t + dur; c.talk = 1; } }
      faceFor(b);
      S.bubble = c ? { who: b.say, text: String(b.text || ''), to: addressee(b), t0: S.t, until: S.t + dur + 999, mood: b.mood || (c && c.mood), wait: !!wait, vdur: 0 } : null;
    };
    // the recorded voice really starts `delay` seconds from now and lasts `vdur`: words, mouth and bubble follow it
    S.voiceStart = function (delay, vdur) {
      var bb = S.bubble, c = bb && get(bb.who), at = S.t + Math.max(0, delay || 0);
      if (bb) { bb.wait = false; bb.t0 = at; bb.vdur = vdur || 0; }
      if (c) { c.talk = 0; c.talkFrom = at; c.talkUntil = at + (vdur || 60); }
    };
    S.showNow = function () { var bb = S.bubble; if (bb && bb.wait) { bb.wait = false; bb.t0 = S.t; var c = get(bb.who); if (c) { c.talk = 1; c.talkUntil = S.t + 60; } } };
    S.voiceDone = function (keep) { var bb = S.bubble; if (bb) { bb.vdur = bb.vdur && Math.min(bb.vdur, S.t - bb.t0); if (!keep) bb.until = Math.min(bb.until, S.t + 0.55); } S.stopTalk(); };
    S.spokenFrac = function () { var bb = S.bubble; if (!bb || bb.wait) return 0; if (!bb.vdur) return 1; return clamp((S.t - bb.t0) / bb.vdur, 0, 1); };
    S.stopTalk = function () { all().forEach(function (x) { x.talk = 0; x.talkUntil = 0; x.talkFrom = 0; }); };
    S.endSay = function () { if (S.bubble) S.bubble.until = Math.min(S.bubble.until, S.t + 0.25); S.stopTalk(); };
    S.moodOf = function (id, m) { var c = get(id); if (c && MOODS.indexOf(m) >= 0) c.mood = m; };

    // ---------- particles ----------
    var PC = { heart: ['#F28AA8', '#F7A8C2', '#E4566E'], spark: ['#F8D76A', '#FFF1B0', '#FFFFFF'], drop: ['#8CCBF0', '#B5E0F7'], puff: ['rgba(255,255,255,.9)'], dirt: ['#A98A5C', '#8A6B45'], saw: ['#E9C68E', '#D5A866'], leaf: ['#8FC46B', '#E8913F', '#F2C14E'], zzz: ['#8E86C8'], tear: ['#8CCBF0'] };
    function burst(x, y, n, k, o) {
      o = o || {}; if (S.reduced) n = Math.ceil(n / 2);
      for (var i = 0; i < n; i++) {
        if (S.parts.length > 120) S.parts.shift();
        var a = o.angle != null ? o.angle + (Math.random() - 0.5) * (o.spread || 1) : -Math.PI / 2 + (Math.random() - 0.5) * (o.spread || 2.2), sp = (o.speed || 28) * (0.5 + Math.random());
        var cols = PC[k] || PC.spark;
        S.parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: o.grav != null ? o.grav : (k === 'heart' || k === 'spark' || k === 'zzz' ? -6 : k === 'puff' ? -8 : 90), life: 0, ttl: (o.life || 1.6) * (0.8 + Math.random() * 0.4), k: k, col: cols[i % cols.length], rot: Math.random() * 6, s: (o.size || 1) * (0.8 + Math.random() * 0.4) });
      }
    }
    S.burst = burst;
    function stepParts(dt) {
      for (var i = S.parts.length - 1; i >= 0; i--) {
        var p = S.parts[i]; p.life += dt; if (p.life >= p.ttl) { S.parts.splice(i, 1); continue; }
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt;
        if (p.k === 'heart' || p.k === 'zzz') p.x += Math.sin(p.life * 2.2 + p.rot) * 6 * dt;
        if (p.y > G + 30 && p.vy > 0) { p.y = G + 30; p.vy = 0; p.vx *= 0.4; }
      }
    }
    function drawParts(g) {
      for (var i = 0; i < S.parts.length; i++) {
        var p = S.parts[i], q = p.life / p.ttl; g.globalAlpha = clamp(q < 0.12 ? q / 0.12 : 1 - Math.max(0, (q - 0.6) / 0.4), 0, 1);
        if (p.k === 'heart') heart(g, p.x, p.y, 4.6 * p.s, p.col);
        else if (p.k === 'spark') star(g, p.x, p.y, 3.8 * p.s, p.col, p.rot);
        else if (p.k === 'puff') circ(g, p.x, p.y, (4 + q * 8) * p.s, p.col);
        else if (p.k === 'leaf') { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); ell(g, 0, 0, 4 * p.s, 2 * p.s, p.col); g.restore(); }
        else if (p.k === 'zzz') { g.fillStyle = p.col; g.font = '700 ' + (8 + q * 6) + 'px ' + FONT; g.textAlign = 'center'; g.fillText('z', p.x, p.y); }
        else if (p.k === 'saw') { g.fillStyle = p.col; g.fillRect(p.x - 1.2, p.y - 0.8, 2.4, 1.6); }
        else circ(g, p.x, p.y, (p.k === 'drop' || p.k === 'tear' ? 1.7 : 1.5) * p.s, p.col);
      }
      g.globalAlpha = 1;
    }

    // ---------- where things are ----------
    function X(x) { var gg = S.geo; return mix(gg.x0 + 34, gg.x1 - 34, x); }
    S.X = function (x) { return S.geo ? X(x) : 0; };
    function bridgeSpan() { return { a: X(0.36), b: X(0.64) }; }
    function groundDy(px) {
      if (S.props.bridge) { var s = bridgeSpan(); if (px > s.a && px < s.b) { var q = (px - s.a) / (s.b - s.a), sway = S.weather === 'wind' || S.weather === 'storm' ? Math.sin(S.t * 1.3) * 2.5 : 0; return Math.sin(q * Math.PI) * (13 + sway); } }
      if (S.props.creek) { var c = { a: X(0.4), b: X(0.6) }; if (px > c.a && px < c.b) return 4; }
      return 0;
    }

    // ---------- the draw state of a pal this frame ----------
    function palFrame(c, dt) {
      var a = c.act, u = a ? S.t - a.t0 : 0, q = a ? clamp(u / a.dur, 0, 1) : 0, n = a ? a.name : null, p = a ? a.p : {};
      var d = { x: c.x, pose: c.pose, lift: 0, rot: 0, pivot: 'center', sx: 1, sy: 1, tilt: c.tilt0, wagA: 0.5, wagS: 1, eyes: null, ear: 0, glow: 0, dy: 0, jit: 0, moving: false };
      var R = S.reduced;
      if (n === '_place' || MOVE[n] || n === 'hug' || n === 'highfive' || n === 'nuzzle') {
        var mv = n === 'hug' || n === 'highfive' || n === 'nuzzle' ? clamp(q / 0.45, 0, 1) : q;
        if (n === 'hop' && a.toX !== a.fromX) {
          // hop across: a few slow hops, moving only while in the air
          var hops = Math.max(1, Math.round(Math.abs(a.toX - a.fromX) / 0.07)), hp = q * hops, hi = Math.min(hops - 1, Math.floor(hp)), hq = hp - hi;
          d.x = mix(a.fromX, a.toX, (hi + sio(hq)) / hops); d.lift = (R ? 6 : 12) * bump(hq); d.pose = 'stand';
        } else d.x = mix(a.fromX, a.toX, sio(mv));
        if (Math.abs(a.toX - a.fromX) > 0.004 && mv < 1 && n !== 'hop') { d.pose = 'run'; d.moving = true; if (n === 'run' && !R) d.lift += Math.abs(Math.sin(c.ph)) * 2.2; }
      }
      if (c.pose === 'stand' && d.pose === 'stand' && !d.moving) d.pose = 'run'; // standing is the run pose at rest
      var sad = c.mood === 'sad' || c.mood === 'worried', m = c.mood;
      d.wagA = m === 'excited' ? 0.75 : m === 'silly' ? 0.7 : m === 'sad' ? 0.08 : m === 'grumpy' ? 0.05 : m === 'worried' ? 0.12 : m === 'sleepy' || m === 'calm' ? 0.3 : 0.5;
      d.wagS = m === 'excited' ? 1.6 : m === 'calm' || m === 'sleepy' ? 0.55 : sad ? 0.6 : 1;
      d.tailBase = sad ? -1.25 : m === 'grumpy' ? -0.5 : 0;
      d.ear = sad ? 0.45 : m === 'surprised' ? -0.35 : m === 'excited' ? -0.15 : 0;
      if (sad) d.sy *= 0.97;
      switch (n) {
        case 'hop': if (a.toX === a.fromX) { var nh = Math.max(1, Math.round(a.dur / 1.2)), hq2 = (q * nh) % 1; d.lift = (R ? 6 : 14) * bump(hq2); d.sy *= 1 + 0.06 * Math.cos(hq2 * TAU); } d.wagA = 0.8; break;
        case 'jump': var jq = clamp((q - 0.15) / 0.7, 0, 1); d.lift = (R ? 12 : 34) * bump(jq); d.sy *= q < 0.15 ? 1 - 0.1 * bump(q / 0.15) : 1 + 0.08 * bump(jq); d.wagA = 0.9; break;
        case 'spin': d.faceMul = Math.cos(TAU * sio(q)); d.lift = 6 * bump(q); d.wagA = 0.8; break;
        case 'wiggle': d.pose = 'wiggle'; d.rot = Math.sin(u * 4.2) * 0.06; d.wagA = 0.9; d.wagS = 1.5; break;
        case 'wag': d.wagA = 0.95; d.wagS = 1.7; d.lift = R ? 0 : Math.abs(Math.sin(u * 3)) * 1.5; break;
        case 'tailtuck': d.tailBase = -1.35; d.wagA = 0.04; d.sy *= 1 - 0.05 * sio(q * 3); d.ear = 0.55; break;
        case 'shake': var sh = bump(q) * (R ? 0.05 : 0.14); d.rot = Math.sin(u * 13) * sh; d.sx *= 1 + Math.sin(u * 13) * sh * 0.3; if (tick(c, 'shake', 0.12)) burst(X(c.x), G - 28, 3, 'drop', { spread: 3, speed: 60 }); break;
        case 'sniff': d.tilt += 0.32 * sio(q * 4) + Math.sin(u * 7) * 0.05 * bump(q); if (tick(c, 'sniff', 0.7)) burst(X(c.x) + c.face * 34, G - 6, 1, 'puff', { speed: 6, size: 0.5 }); break;
        case 'hug':
          if (q > 0.42) { var hq3 = sio((q - 0.42) / 0.16) * (1 - sio((q - 0.86) / 0.14)); d.pivot = 'hind'; d.rot = -0.34 * hq3; d.eyes = 'happy'; d.tilt += 0.15 * hq3; d.wagA = 0.9; if (c.id === 'sugarfoot') d.rot *= 1.15; }
          if (q > 0.5 && tick(c, 'hug', 0.9) && c.id === 'tidbit') burst(mix(X(c.x), X(other(c).x), 0.5), G - 88, 3, 'heart', { speed: 14 });
          break;
        case 'highfive':
          if (q > 0.42) { var fq = bump(clamp((q - 0.42) / 0.5, 0, 1)); d.pivot = 'hind'; d.rot = -0.55 * fq; d.wagA = 1; d.eyes = fq > 0.7 ? 'happy' : null;
            if (c.id === 'tidbit' && once(a, 'five', q >= 0.67)) { burst(mix(X(c.x), X(other(c).x), 0.5), G - 92, 9, 'spark', { spread: TAU, speed: 34 }); if (S.onSound) S.onSound('bark', c.id); } }
          break;
        case 'nuzzle': if (q > 0.42) { var nq = sio((q - 0.42) / 0.2) * (1 - sio((q - 0.88) / 0.12)); d.tilt += 0.3 * nq; d.eyes = 'happy'; d.wagA = 0.8; if (c.id === 'sugarfoot' && once(a, 'nz', q > 0.6)) burst(mix(X(c.x), X(other(c).x), 0.5), G - 70, 3, 'heart', { speed: 12 }); } break;
        case 'turnaway': d.tilt += 0.08; break;
        case 'shiver': d.jit = Math.sin(u * 30) * (R ? 0.2 : 0.6); d.sy *= 0.96; d.tailBase = -1.2; d.ear = 0.5; break;
        case 'dig': d.tilt += 0.2 + Math.sin(u * 7) * 0.08; if (tick(c, 'dig', 0.3)) burst(X(c.x) - c.face * 18, G - 4, 2, 'dirt', { angle: c.face > 0 ? -2.4 : -0.7, spread: 0.6, speed: 60 }); break;
        case 'build': var bb = Math.abs(Math.sin(u * 4.4)); d.tilt += 0.1 * bb; d.lift = 0; d.hammer = bb;
          if (a.th) a.th[a.key] = mix(a.from, a.to, sio(q)); if (a.kb) a.kb.prog = mix(a.from, a.to, sio(q));
          if (tick(c, 'build', 0.72)) { var tx = a.th ? thX() : X(c.x) + c.face * 34, ty = a.th ? (a.key === 'r' ? G - 178 : G - 140) : G - 8; burst(tx + (Math.random() - 0.5) * 50, ty, 3, 'saw', { speed: 30 }); if (S.onSound) S.onSound('tap', c.id); }
          break;
        case 'fly': d.tilt = -0.3 - 0.08 * Math.sin(u * 1.1); d.wagA = 0.8; break;
        case 'splash': var sq = (q * 2) % 1; d.lift = (R ? 3 : 8) * bump(sq); if (tick(c, 'splash', 0.5)) burst(X(c.x), G - 2, 6, 'drop', { speed: 70, spread: 1.6 }); d.wagA = 0.9; break;
        case 'cry': d.eyes = 'sad'; d.tailBase = -1.2; if (tick(c, 'cry', 1.1)) { var hp2 = c.headStage; if (hp2) S.parts.push({ x: hp2.x + c.face * 3, y: hp2.y + 2, vx: c.face * 3, vy: 5, g: 40, life: 0, ttl: 1.4, k: 'tear', col: '#8CCBF0', rot: 0, s: 1.3 }); } break;
        case 'laugh': d.lift = (R ? 1 : 3) * Math.abs(Math.sin(u * 5)); d.eyes = 'happy'; d.mouth = 0.8; d.tilt += -0.08 + Math.sin(u * 5) * 0.04; d.wagA = 0.9; break;
        case 'heart': if (tick(c, 'heart', 0.5)) { var hh = c.headStage; burst(hh ? hh.x : X(c.x), (hh ? hh.y : G - 60) - 10, 1, 'heart', { speed: 16, spread: 1 }); } d.wagA = 0.8; break;
        case 'sparkle': if (tick(c, 'sparkle', 0.35)) { var hs = c.headStage; burst((hs ? hs.x : X(c.x)) + (Math.random() - 0.5) * 50, (hs ? hs.y : G - 60) - Math.random() * 30, 1, 'spark', { speed: 8 }); } break;
        case 'pause-breath': var br = 0.5 - 0.5 * Math.cos(TAU * u / 4.2); d.glow = bump(Math.min(1, q * 4)) * 0 + 0.35 + 0.65 * br; d.sy *= 1 + 0.035 * br; d.eyes = 'calm'; d.wagA = 0.15; d.glowFade = Math.min(1, u / 0.8, (a.dur - u) / 0.8); break;
        case 'give': d.pivot = 'hind'; d.rot = -0.1 * bump(q); d.tilt += 0.18 * bump(q); break; // a little lean toward her pal, handing it over
        case 'point': d.pivot = 'hind'; d.rot = -0.12 * sio(q * 3); d.tilt += p.target === 'up' ? -0.2 : 0; break;
        case 'sit': case 'lie': case 'bow': case 'sleep': break;
        case 'lookat': break;
        case 'carry': case 'drop': case 'think': case 'rain-drip': case 'walk': case 'run': case '_place': break;
        default: if (n && !ACTIONS[n]) { d.pose = 'wiggle'; d.rot = Math.sin(u * 4) * 0.05; }
      }
      if (c.sleep) { d.eyes = 'closed'; if (tick(c, 'zzz', 1.3)) { var hz = c.headStage; if (hz) burst(hz.x + c.face * 8, hz.y - 10, 1, 'zzz', { speed: 8, angle: -1.2, spread: 0.4, life: 2.4 }); } }
      if (c.kite) d.tilt = Math.min(d.tilt, -0.3);
      // idle life: blinks, breathing, a curious tilt now and then
      if (!c.blinkAt || S.t > c.blinkAt + 0.16) c.blinkAt = S.t + 2 + Math.random() * 3.5;
      d.blink = S.t > c.blinkAt && S.t < c.blinkAt + 0.15;
      if (d.pose !== 'lie') d.sy *= 1 + (c.id === 'tidbit' ? 0.012 : 0.018) * Math.sin(S.t * (c.id === 'tidbit' ? 2.6 : 1.8));
      if (!n && !c.talk && !d.moving && !S.reduced) d.tilt += 0.06 * Math.sin(S.t * 0.5 + (c.id === 'tidbit' ? 0 : 2));
      if (c.talk) d.tilt += 0.035 * Math.sin(S.t * 5.2);
      if ((S.weather === 'wind' || S.weather === 'storm') && !S.reduced) d.ear += Math.sin(S.t * 7 + (c.id === 'tidbit' ? 0 : 1)) * 0.12;
      return d;
    }
    function tick(c, key, every) { var k = c.id + key, last = S.lastEmit[k] || -99; if (S.t - last >= every) { S.lastEmit[k] = S.t; return true; } return false; }
    function once(a, key, cond) { a.done = a.done || {}; if (cond && !a.done[key]) { a.done[key] = 1; return true; } return false; }

    // ---------- step (all motion is time based) ----------
    S.step = function (dt) {
      S.t += dt;
      var R = S.reduced;
      all().forEach(function (c) {
        var tau = 0.16; c.face += (c.fx - c.face) * (1 - Math.exp(-dt / tau));
        if (c.talkFrom && S.t >= c.talkFrom) { c.talk = 1; c.talkFrom = 0; } // the mouth moves when the voice does
        if (c.talk && c.talkUntil && S.t > c.talkUntil) c.talk = 0;
        if (c.act && (c.act.name === '_place' || GESTURE[c.act.name]) && S.t - c.act.t0 >= c.act.dur) commit(c); // little gestures finish on their own
      });
      stepParts(dt);
      if (S.flash > 0) S.flash = Math.max(0, S.flash - dt * 1.6);
      if (S.weather === 'storm' && !R && S.scene !== 'blank') { S.nextFlash -= dt; if (S.nextFlash <= 0) { if (S.bright) S.flash = 0.34; else S.glowT0 = S.t; S.nextFlash = 7 + Math.random() * 6; if (S.onSound) S.onSound('rumble'); } }
      if (S.bubble && S.t > S.bubble.until + 0.4) S.bubble = null;
      if (S.card && S.t > S.card.t0 + S.card.dur + 0.6) S.card = null;
      for (var id in S.guests) { var gs = S.guests[id]; if (gs.out && S.t - gs.out.t0 > gs.out.dur) delete S.guests[id]; }
    };

    // ---------- painting ----------
    function bgPaint(w, h) {
      var key = S.scene + '|' + S.hour.toFixed(2) + '|' + w + 'x' + h + (S.guests.moon ? '|moon' : '');
      if (key === S.bgKey && S.bg) return;
      S.bgKey = key; S.bg = S.bg || document.createElement('canvas'); S.bg.width = w; S.bg.height = h;
      var b = S.bg.getContext('2d'), PC2 = window.TOLPalsCam, geo = null;
      b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, w, h);
      if (S.scene !== 'blank' && PC2 && PC2.paintScene) {
        try { geo = PC2.paintScene(b, S.scene, w, h, S.hour, { env: { bare: S.scene === 'treehouse', noMoon: !!S.guests.moon }, reduced: S.reduced }); } catch (e) { geo = null; }
      }
      if (!geo) { geo = geoFor(w, h); paintBlank(b, w, h, geo); geo.env = { x0: geo.x0 - 4, x1: geo.x1 + 4, y0: geo.y0 - 4, y1: geo.y1 + 4, dark: 0 }; }
      S.sp = SP * clamp((geo.LW || 533) / 520, 0.66, 1); // a little smaller on narrow stages, so the pals have room
      S.geo = geo; S.info = PC2 && PC2.sceneInfo ? PC2.sceneInfo(S.scene) : null;
      // the stage got narrower (a phone turned upright, leaving full screen): step apart if their heads would now meet
      var gk = pairGap(false).toFixed(3); if (gk !== S.gapKey) { S.gapKey = gk; var T = S.chars.tidbit, Sg = S.chars.sugarfoot;
        if (!T.act && !Sg.act && !(S.hidden && (S.hidden.tidbit || S.hidden.sugarfoot))) { var tg = { tidbit: T.x, sugarfoot: Sg.x }; spaceOut('_place', ['tidbit', 'sugarfoot'], tg); T.x = tg.tidbit; Sg.x = tg.sugarfoot; } }
    }
    function paintBlank(b, w, h, geo) {
      var gr = b.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#FBE3EC'); gr.addColorStop(0.55, '#EDE3FA'); gr.addColorStop(1, '#DDEBFA');
      b.fillStyle = gr; b.fillRect(0, 0, w, h);
      b.setTransform(geo.k, 0, 0, geo.k, geo.ox, geo.oy);
      for (var i = 0; i < 18; i++) circ(b, mix(geo.x0, geo.x1, rnd(i)), mix(geo.y0, geo.y1, rnd(i + 30)), 10 + rnd(i + 60) * 40, 'rgba(255,255,255,' + (0.12 + rnd(i + 90) * 0.18).toFixed(2) + ')');
      var gg = b.createLinearGradient(0, G - 20, 0, geo.y1); gg.addColorStop(0, 'rgba(255,255,255,.55)'); gg.addColorStop(1, 'rgba(255,255,255,.2)');
      b.fillStyle = gg; b.fillRect(geo.x0 - 4, G - 16, geo.x1 - geo.x0 + 8, geo.y1 - G + 20);
      b.setTransform(1, 0, 0, 1, 0, 0);
    }
    function thX() { return (S.geo.env ? S.geo.env.x0 : S.geo.x0) + 64; }

    // the treehouse the pals build (only in the treehouse scene; the tree comes from the pal cam painter)
    function drawTreehouse(g) {
      var th = S.props.treehouse; if (!th || S.scene !== 'treehouse') return;
      var tx = thX(), wood = '#C9A77A', dark = '#9B6B45', t = S.t;
      if (th.w) {
        // after the storm: a crooked platform, one wall hanging, planks in the grass
        g.save(); g.translate(tx, G - 128); g.rotate(0.16); rr(g, -44, -2, 70, 6, 2, dark); rr(g, -34, -30, 8, 28, 2, wood); g.restore();
        g.save(); g.translate(tx + 30, G - 124); g.rotate(1.1); rr(g, -4, 0, 30, 6, 2, wood); g.restore();
        [[tx + 40, 0.2], [tx + 70, -0.3], [tx + 98, 0.1], [tx + 18, 2.9], [tx + 120, 0.5]].forEach(function (pl, i) { g.save(); g.translate(pl[0], G - 18 + (i % 2) * 6); g.rotate(pl[1]); rr(g, -16, -2.5, 32, 5, 2, i % 2 ? wood : dark); g.restore(); });
        line(g, tx + 20, G - 150, tx + 34, G - 118, '#6B4A3A', 1.4); ell(g, tx + 36, G - 116, 6, 3, '#F28AA8', 0.8); // the little flag, fallen
        ladder(g, tx, 0.6);
        return;
      }
      var b = clamp(th.b, 0, 1), r = clamp(th.r, 0, 1);
      if (b <= 0 && r <= 0) return;
      ladder(g, tx, 1);
      var pw = 88 * clamp(b / 0.34, 0, 1); if (pw > 0) rr(g, tx - 44, G - 130, pw, 6, 2, dark);
      var wh = 40 * clamp((b - 0.34) / 0.4, 0, 1);
      if (wh > 0) { rr(g, tx - 36, G - 130 - wh, 72, wh, 2, wood); for (var i = 1; i < 6; i++) line(g, tx - 36 + i * 12, G - 130 - wh + 2, tx - 36 + i * 12, G - 132, 'rgba(120,80,40,.25)', 1); }
      if (b > 0.74) { var wq = clamp((b - 0.74) / 0.26, 0, 1); g.globalAlpha = wq; rr(g, tx - 8, G - 160, 16, 16, 2, '#6B4A3A'); rr(g, tx - 6, G - 158, 12, 12, 2, S.geo.dark > 0.2 ? '#FFD68C' : '#9FC7E8'); g.globalAlpha = 1;
        if (r < 0.5) { line(g, tx + 28, G - 170, tx + 28, G - 196, '#6B4A3A', 1.4); g.fillStyle = '#F28AA8'; g.beginPath(); g.moveTo(tx + 28, G - 196); g.lineTo(tx + 44, G - 191 + Math.sin(t * 2) * 1.5); g.lineTo(tx + 28, G - 186); g.fill(); } }
      if (r > 0) {
        // the rain roof: a steep, snug roof with a gutter and a rain chain
        g.save(); g.beginPath(); g.rect(tx - 56, G - 230, 112 * r, 70); g.clip();
        g.fillStyle = '#3F8FA8'; g.beginPath(); g.moveTo(tx - 50, G - 168); g.lineTo(tx, G - 204); g.lineTo(tx + 50, G - 168); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1; for (var s = 0; s < 4; s++) { g.beginPath(); g.moveTo(tx - 42 + s * 7, G - 172 - s * 5); g.lineTo(tx + 42 - s * 7, G - 172 - s * 5); g.stroke(); }
        rr(g, tx - 52, G - 170, 104, 4, 2, '#2E6E84'); ell(g, tx, G - 205, 4, 3, '#F6CB4C');
        g.restore();
        if (r > 0.9) { for (var c2 = 0; c2 < 6; c2++) circ(g, tx + 50, G - 164 + c2 * 6, 1.6, '#B8C4CC'); }
      }
    }
    function ladder(g, tx, a) { g.globalAlpha = a; line(g, tx + 30, G - 124, tx + 32, G - 22, '#C9A77A', 1.6); line(g, tx + 44, G - 124, tx + 46, G - 22, '#C9A77A', 1.6); for (var k = 0; k < 7; k++) line(g, tx + 31, G - 116 + k * 14, tx + 45, G - 116 + k * 14, '#9B6B45', 2); g.globalAlpha = 1; }
    // a rope bridge over a gorge, and a creek with stepping stones
    function drawBridgeBack(g) {
      if (!S.props.bridge) return;
      var s = bridgeSpan(), top = G - 6, bot = S.geo.y1 + 4;
      var gr = g.createLinearGradient(0, top, 0, bot); gr.addColorStop(0, '#39584F'); gr.addColorStop(1, '#1E3340');
      g.fillStyle = gr; g.beginPath(); g.moveTo(s.a - 6, top); g.lineTo(s.b + 6, top); g.lineTo(s.b - 10, bot); g.lineTo(s.a + 10, bot); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(160,210,230,.5)'; g.lineWidth = 1.5; g.beginPath(); for (var x = s.a + 14; x < s.b - 14; x += 6) g.lineTo(x, bot - 10 + Math.sin(x / 9 + S.t * 1.5) * 1.5); g.stroke();
      rr(g, s.a - 16, top - 2, 14, 14, 3, '#7A5A3A'); rr(g, s.b + 2, top - 2, 14, 14, 3, '#7A5A3A');
      [s.a - 8, s.b + 8].forEach(function (px) { rr(g, px - 2.5, G - 44, 5, 42, 2, '#8A6340'); });
      for (var i = 0; i <= 14; i++) { var q = i / 14, px2 = mix(s.a, s.b, q); g.save(); g.translate(px2, G - 2 + groundDy(px2)); rr(g, -4, -2, 8, 4, 1, i % 2 ? '#B98B5E' : '#A67C52'); g.restore(); }
    }
    function drawBridgeFront(g) {
      if (!S.props.bridge) return;
      var s = bridgeSpan(); g.strokeStyle = '#8A6340'; g.lineWidth = 1.6; g.beginPath();
      for (var i = 0; i <= 20; i++) { var q = i / 20, px = mix(s.a - 8, s.b + 8, q), y = G - 40 + Math.sin(q * Math.PI) * 10 + groundDy(mix(s.a, s.b, q)) * 0.5; if (i) g.lineTo(px, y); else g.moveTo(px, y); }
      g.stroke();
      for (var j = 1; j < 10; j++) { var q2 = j / 10, px3 = mix(s.a, s.b, q2), y2 = G - 40 + Math.sin(q2 * Math.PI) * 10 + groundDy(px3) * 0.5; line(g, px3, y2, px3, G - 2 + groundDy(px3), 'rgba(138,99,64,.7)', 0.8); }
    }
    function drawCreek(g) {
      if (!S.props.creek) return;
      var a = X(0.4), b = X(0.6), full = S.weather === 'rain' || S.weather === 'storm', top = G - (full ? 12 : 6);
      var gr = g.createLinearGradient(0, top, 0, G + 40); gr.addColorStop(0, '#78B9D8'); gr.addColorStop(1, '#4F8FB4');
      g.fillStyle = gr; g.beginPath(); g.moveTo(a - 8, top); g.quadraticCurveTo((a + b) / 2, top - 3, b + 8, top); g.lineTo(b + 20, G + 60); g.lineTo(a - 20, G + 60); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.2; var sp = full ? 34 : 16;
      for (var k = 0; k < 6; k++) { var yy = top + 6 + k * 7, off = (S.t * sp + k * 23) % (b - a + 20); g.beginPath(); g.moveTo(a - 10 + off, yy); g.lineTo(a - 10 + off + 12, yy); g.stroke(); }
      [0.44, 0.5, 0.56].forEach(function (q) { ell(g, X(q), G + 1, 11, 4.5, '#9A9A92'); ell(g, X(q) - 2, G - 1, 7, 2, 'rgba(255,255,255,.3)'); });
    }
    function drawGround(g) {
      S.ground.forEach(function (it) {
        var x = X(it.x), y = G + groundDy(x), h = it.h || 0;
        if (it.item === 'kitebuild') {
          if (it.mend) { var mq = clamp((it.prog - 0.5) / 0.5, 0, 1); g.save(); g.globalAlpha = 1 - mq; paintKite(g, x, y - 12, 0.8, 1, 1.45, S.t, 'soggy'); g.globalAlpha = mq; paintKite(g, x, y - 16, 0.8, 1, 0.5, S.t); g.restore(); }
          else paintKite(g, x, y - 16, 0.8, clamp(it.prog, 0, 1), 0.5, S.t); return;
        }
        var pop = it.t0 > 0 ? clamp((S.t - it.t0) / 0.35, 0, 1) : 1; // set down: it settles in
        g.save(); g.globalAlpha = 0.25 + 0.75 * pop;
        if (h > 0) { // up high: caught on something, bobbing on the water, or held up on the wind
          var page = fam(it.item) === 'page', light = page || fam(it.item) === 'kite' || it.item === 'lens' || it.item === 'map', flap = page ? Math.sin(S.t * 5 + it.x * 9) * 0.22 : light ? Math.sin(S.t * 1.4 + it.x * 5) * 0.06 : 0;
          if (it.item === 'kite' || it.item === 'flykite') { if (h > 100) { var kx = x + Math.sin(S.t * 0.9 + it.x * 4) * 8, ky = y - h + Math.sin(S.t * 1.3) * 6; g.strokeStyle = 'rgba(80,60,40,.6)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(kx, ky + 12); g.quadraticCurveTo(kx - 20, (ky + y) / 2, x - 30, y - 6); g.stroke(); paintKite(g, kx, ky, 1, 1, Math.sin(S.t * 1.1 + it.x) * 0.25, S.t, it.item === 'flykite' ? 'fly' : null); g.restore(); return; } }
          g.translate(x, y - h + (light ? Math.sin(S.t * 1.6 + it.x * 7) * (page ? 3 : 1.6) : 0)); g.rotate(flap);
        } else g.translate(x, y + (1 - pop) * -4);
        drawItem(g, it.item, true); g.restore();
      });
      // on the way out: blown away on the wind, a let-go kite tumbling down, or just fading
      S.leaving = S.leaving.filter(function (it) {
        var u = S.t - it.t0;
        if (it.fall) {
          var q = clamp(u / 2.2, 0, 1), fx = it.sx + it.dir * 130 * q + Math.sin(u * 5) * 8, fy = mix(it.sy, G - 36, eio(q)); // down into the waves, out past the shore
          g.save(); g.globalAlpha = clamp((2.8 - u) / 0.6, 0, 1); paintKite(g, fx, fy, 1, 1, u * 2.6 * it.dir, S.t); g.restore(); return u < 2.8;
        }
        var high = it.h > 0, dur = high ? 2.4 : 0.6, q2 = clamp(u / dur, 0, 1), x = X(it.x) + (high ? q2 * 160 : 0), y = G - it.h - (high ? eout(q2) * 120 : 0);
        g.save(); g.globalAlpha = 1 - q2; g.translate(x, y); if (high) g.rotate(Math.sin(u * 6) * 0.6 + q2 * 2);
        if (it.item === 'kitebuild') paintKite(g, 0, -16, 0.8, 1, 0.5, S.t); else drawItem(g, it.item, true); g.restore(); return q2 < 1;
      });
    }
    // big scenery: a carousel at the carnival, a chimney with a weathervane on the rooftops
    function drawCarousel(g) {
      if (S.props.carousel == null) return;
      var x = X(S.props.carousel), y = G, t = S.t, spin = t * 0.7;
      ell(g, x, y - 4, 66, 9, '#C9A77A'); rr(g, x - 66, y - 9, 132, 6, 3, '#E8B04F');
      for (var i = 0; i < 7; i++) { var a = spin + i * TAU / 7, px = x + Math.sin(a) * 54, front = Math.cos(a) > 0; if (front) continue; rr(g, px - 1.5, y - 104, 3, 96, 1.5, '#D9B45A'); }
      for (var j = 0; j < 7; j++) { var a2 = spin + j * TAU / 7, px2 = x + Math.sin(a2) * 54, fr = Math.cos(a2) > 0, bob = Math.sin(t * 2 + j) * 5; if (!fr) continue;
        rr(g, px2 - 1.5, y - 104, 3, 96, 1.5, '#F2D27A');
        var col = j === 2 ? '#7FB8F0' : ['#FFFDF6', '#F7A8C2', '#B79CEB'][j % 3], fs = Math.cos(a2 + Math.PI / 2) > 0 ? 1 : -1;
        g.save(); g.translate(px2, y - 46 + bob); g.scale(fs, 1); ell(g, 0, 0, 13, 6, col); circ(g, 11, -8, 5, col); rr(g, 8, -6, 5, 8, 2, col); line(g, -6, 4, -9, 14, col, 2.4); line(g, 6, 4, 8, 14, col, 2.4); ell(g, -13, -2, 4, 2, '#E8B04F', 0.6); circ(g, 12.5, -9, 1, '#3C3350'); g.restore(); }
      g.fillStyle = '#E4566E'; g.beginPath(); g.moveTo(x - 74, y - 100); g.lineTo(x, y - 136); g.lineTo(x + 74, y - 100); g.closePath(); g.fill();
      g.save(); g.beginPath(); g.moveTo(x - 74, y - 100); g.lineTo(x, y - 136); g.lineTo(x + 74, y - 100); g.closePath(); g.clip();
      for (var k = -3; k <= 3; k += 2) { g.fillStyle = '#FFFDF6'; g.beginPath(); g.moveTo(x + k * 21 - 10, y - 99); g.lineTo(x, y - 136); g.lineTo(x + k * 21 + 10, y - 99); g.closePath(); g.fill(); } g.restore();
      for (var s2 = 0; s2 < 9; s2++) ell(g, x - 64 + s2 * 16, y - 99, 8, 5, s2 % 2 ? '#E4566E' : '#FFFDF6');
      circ(g, x, y - 138, 4, '#F6CB4C');
    }
    function drawChimney(g) {
      if (S.props.chimney == null) return;
      var x = X(S.props.chimney), y = G - 4, w = S.weather === 'wind' || S.weather === 'storm' ? Math.sin(S.t * 2.2) * 0.35 : 0;
      rr(g, x - 16, y - 78, 32, 78, 2, '#B5654A'); for (var r = 0; r < 9; r++) for (var c = 0; c < 2; c++) rr(g, x - 15 + c * 16 + (r % 2) * 8 - 4, y - 76 + r * 8.6, 14, 1.2, 0.5, 'rgba(255,230,210,.25)');
      rr(g, x - 20, y - 84, 40, 8, 2, '#8E4A38');
      line(g, x - 8, y - 84, x - 8, y - 132, '#6E6E78', 1.4); line(g, x - 18, y - 120, x + 2, y - 120, '#6E6E78', 1.2); line(g, x - 15, y - 112, x - 1, y - 112, '#6E6E78', 1.2); // the radio antenna
      line(g, x + 8, y - 84, x + 8, y - 128, '#4B4A55', 1.6); line(g, x + 2, y - 122, x + 14, y - 122, '#4B4A55', 1); line(g, x + 8, y - 116, x + 8, y - 128, '#4B4A55', 1);
      g.save(); g.translate(x + 8, y - 128); g.rotate(w); g.fillStyle = '#4B4A55'; g.beginPath(); g.moveTo(-14, 0); g.lineTo(10, 0); g.lineTo(10, -2); g.lineTo(16, 0.5); g.lineTo(10, 3); g.lineTo(10, 1); g.lineTo(-14, 1); g.closePath(); g.fill(); g.beginPath(); g.moveTo(-14, 0); g.lineTo(-19, -4); g.lineTo(-15, 0.5); g.lineTo(-19, 5); g.closePath(); g.fill(); g.restore();
      circ(g, x + 8, y - 130, 2, '#F6CB4C');
    }
    // the sky at the kite festival: dragon kites, fish kites, and friends
    function drawSkyKites(g) {
      if (!S.props.skykites) return;
      var gg = S.geo, t = S.t, W = gg.x1 - gg.x0;
      [[0.12, 46, '#E4566E', 'diamond'], [0.36, 26, '#7FB8F0', 'fish'], [0.82, 38, '#8FD694', 'dragon'], [0.62, 70, '#B79CEB', 'diamond']].forEach(function (k, i) {
        var kx = gg.x0 + W * k[0] + Math.sin(t * 0.8 + i * 2) * 10, ky = gg.y0 + k[1] + Math.sin(t * 1.2 + i) * 6;
        g.strokeStyle = 'rgba(80,60,40,.35)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(kx, ky + 8); g.quadraticCurveTo(kx - 10, (ky + G) / 2, kx - 30 + i * 12, G - 30); g.stroke();
        g.save(); g.translate(kx, ky); g.rotate(Math.sin(t * 1.1 + i) * 0.2);
        if (k[3] === 'diamond') { g.fillStyle = k[2]; g.beginPath(); g.moveTo(0, -12); g.lineTo(9, 0); g.lineTo(0, 15); g.lineTo(-9, 0); g.closePath(); g.fill(); line(g, 0, -12, 0, 15, 'rgba(255,255,255,.5)', 0.8); }
        else if (k[3] === 'fish') { ell(g, 0, 0, 14, 7, k[2]); g.fillStyle = k[2]; g.beginPath(); g.moveTo(-12, 0); g.lineTo(-22, -7); g.lineTo(-22, 7); g.closePath(); g.fill(); circ(g, 8, -2, 1.8, '#fff'); circ(g, 8.4, -2, 0.9, '#2B2620'); }
        else { for (var s2 = 5; s2 >= 0; s2--) circ(g, -s2 * 8, Math.sin(t * 3 + s2) * 3, 6 - s2 * 0.5, s2 % 2 ? '#F7DC6F' : k[2]); circ(g, 4, -1, 7, k[2]); circ(g, 6, -3, 1.6, '#fff'); line(g, 2, -7, -2, -12, k[2], 1.4); }
        if (k[3] !== 'dragon') { g.strokeStyle = k[2]; g.lineWidth = 1; g.beginPath(); g.moveTo(0, k[3] === 'fish' ? 6 : 15); for (var q = 1; q < 5; q++) g.lineTo(Math.sin(q + t * 3) * 3, (k[3] === 'fish' ? 6 : 15) + q * 5); g.stroke(); }
        g.restore();
      });
    }
    // star pictures: the year's adventures, drawn in stars
    function drawConstellations(g) {
      if (!S.props.constellations) return;
      var gg = S.geo, W = gg.x1 - gg.x0, tw = 0.7 + 0.3 * Math.sin(S.t * 1.5);
      var pics = [
        [0.16, 34, [[-14, 10], [-14, -6], [0, -18], [14, -6], [14, 10], [-14, 10]], [[-14, -6], [14, -6]]], // the treehouse, with its roof
        [0.42, 22, [[-10, -6], [10, -6], [10, 8], [-10, 8], [-10, -6]], [[-6, -12], [-1, -6], [6, -12], [1, -6]]], // a drum and its sticks
        [0.64, 40, [[-12, -2], [12, -2], [9, 10], [-9, 10], [-12, -2]], [[-8, -2], [0, -12], [8, -2]]], // a picnic basket
        [0.86, 20, [[0, -14], [10, 0], [0, 16], [-10, 0], [0, -14]], [[0, 16], [4, 24], [-2, 30]]] // a kite with a brand new string
      ];
      pics.forEach(function (p) {
        var cx = gg.x0 + W * p[0], cy = gg.y0 + p[1] + 24;
        g.strokeStyle = 'rgba(200,210,255,' + (0.35 * tw).toFixed(3) + ')'; g.lineWidth = 0.8;
        [p[2], p[3]].forEach(function (pts) { g.beginPath(); pts.forEach(function (q, i) { if (i) g.lineTo(cx + q[0], cy + q[1]); else g.moveTo(cx + q[0], cy + q[1]); }); g.stroke(); pts.forEach(function (q) { star(g, cx + q[0], cy + q[1], 2.4, 'rgba(255,248,210,' + (0.75 + 0.25 * tw).toFixed(2) + ')', 0); }); });
      });
    }
    // shooting stars: one right now ('one'), or a whole starfall ('many')
    function shootStar() { if (!S.geo) return; var gg = S.geo; S.shoots.push({ t0: S.t, x: mix(gg.x0 + 30, gg.x1 - 160, Math.random()), y: gg.y0 + 14 + Math.random() * 70, len: 1.1 + Math.random() * 0.6 }); }
    function drawShoots(g, dt) {
      if (S.props.shooting === 'many' && !S.reduced && Math.random() < (dt || 0) * 3.2) shootStar();
      S.shoots = S.shoots.filter(function (sh) {
        var q = (S.t - sh.t0) / sh.len; if (q >= 1) return false;
        var sx = sh.x + q * 170, sy = sh.y + q * 54; g.strokeStyle = 'rgba(255,250,220,' + (1 - q).toFixed(2) + ')'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - 40, sy - 12.7); g.stroke(); star(g, sx, sy, 3, '#FFF8D8', 0);
        return true;
      });
    }
    // the things a pal can carry, drawn at her mouth in head space (or on the ground): see ITEM_PAINT
    function drawItem(g, it, onGround) { var f = ITEM_PAINT[it]; if (f) f(g, !!onGround, S); }

    // ---------- faces: moods, a talking mouth, eyes ----------
    function drawFace(g, c, d) {
      var talk = c.talk ? talkAmt(c) : 0, m = c.mood, isT = c.id === 'tidbit', TAN = isT ? '#C4834A' : '#C9965F', BLK = '#252120';
      var eyes = d.eyes || (d.blink ? 'closed' : null) || (m === 'sleepy' ? 'sleepy' : m === 'calm' ? 'soft' : m === 'proud' ? 'happy' : null);
      // cover the pup's own grin, inside the face only, then draw the mouth for this moment
      var mouth = d.mouth != null ? d.mouth : talk;
      var keepGrin = !talk && d.mouth == null && (m === 'happy' || m === 'excited' || m === 'silly' || m === 'proud');
      if (!keepGrin) {
        g.save(); g.beginPath();
        if (isT) { g.ellipse(8, 2.5, 8.5, 6.2, 0.08, 0, TAU); g.ellipse(8.5, 4.5, 8, 4.8, 0.1, 0, TAU); }
        else { g.ellipse(5, 2.6, 9.4, 7.8, 0.12, 0, TAU); g.ellipse(10.8, 2.6, 6.6, 3.9, 0.06, 0, TAU); g.ellipse(7.5, 8.6, 7, 3.2, 0.12, 0, TAU); }
        g.clip(); ell(g, 10.5, 7.4, 5.8, 3.6, TAN); ell(g, 10.5, 10.2, 6, 2.6, TAN);
        if (isT) ell(g, 8.5, 8.4, 3.2, 1.5, 'rgba(210,200,186,0.85)', 0.15);
        ell(g, 7, 4.5, 2.2, 1.2, 'rgba(247,165,185,0.5)');
        g.restore();
        var MC = '#3A1E22';
        if (mouth > 0.02) {
          var down = m === 'sad' || m === 'worried' || m === 'grumpy' ? 1.2 : 0, o = mouth;
          g.fillStyle = MC; g.beginPath(); g.moveTo(15, 4.8); g.quadraticCurveTo(11, 6.2 + down * 0.3, 6.8, 5.8 + down); g.quadraticCurveTo(10.5, 6.8 + 4.6 * o, 15, 4.8); g.fill();
          g.save(); g.clip(); ell(g, 10.6, 6.6 + 3.4 * o, 2.4, 1.2 + 1.4 * o, '#EE8FA6', 0.2); g.restore();
        } else if (m === 'surprised') { ell(g, 11.4, 7, 1.8, 2.3, MC); }
        else if (m === 'sad' || m === 'worried') { g.strokeStyle = MC; g.lineWidth = 1.1; g.lineCap = 'round'; g.beginPath(); g.moveTo(7.4, 7.6); g.quadraticCurveTo(11, 5.4, 14.6, 6.6); g.stroke(); }
        else if (m === 'grumpy') { g.strokeStyle = MC; g.lineWidth = 1.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(7.6, 6.9); g.lineTo(14.4, 6.1); g.stroke(); }
        else { g.strokeStyle = MC; g.lineWidth = 1.1; g.lineCap = 'round'; g.beginPath(); g.moveTo(7, 5.8); g.quadraticCurveTo(10.8, 9, 14.8, 4.9); g.stroke(); }
      }
      if (m === 'silly' && !talk) { ell(g, 9.2, 11.2, 2.2, 3.4, '#EE8FA6', 0.5); }
      // eyes (the pup's own eye sits at 4.2, -1.6)
      if (eyes === 'closed' || eyes === 'happy' || eyes === 'soft' || eyes === 'calm' || eyes === 'sleepy') {
        circ(g, 4.2, -1.6, 2.6, BLK);
        g.strokeStyle = '#121010'; g.lineWidth = 1.2; g.lineCap = 'round'; g.beginPath();
        if (eyes === 'happy') g.arc(4.2, -0.6, 2, Math.PI * 1.1, Math.PI * 1.9);
        else if (eyes === 'sleepy') { g.moveTo(2.3, -1.2); g.lineTo(6.2, -1.2); }
        else if (eyes === 'soft' || eyes === 'calm') g.arc(4.2, -2.4, 2, Math.PI * 0.15, Math.PI * 0.85);
        else { g.moveTo(2.3, -1.6); g.lineTo(6.2, -1.6); }
        g.stroke();
        if (eyes === 'sleepy') { circ(g, 4.2, -0.4, 1.1, '#3A2418'); }
      } else if (eyes === 'sad' || m === 'sad' || m === 'worried') {
        circ(g, 4.9, -2.3, 1, '#fff'); circ(g, 3.4, -0.6, 0.5, 'rgba(255,255,255,.8)');
      } else if (m === 'surprised') { g.strokeStyle = '#fff'; g.lineWidth = 0.8; g.beginPath(); g.arc(4.2, -1.6, 2.7, 0, TAU); g.stroke(); }
      else if (m === 'excited') star(g, 4.9, -2.4, 1.2, '#fff');
      // brows
      if (m === 'sad' || m === 'worried' || eyes === 'sad') line(g, 1.8, -4.6, 6.2, -6.4, '#1a1615', 1.3);
      else if (m === 'grumpy') line(g, 1.8, -6.3, 6.4, -4, '#1a1615', 1.4);
      else if (m === 'surprised') line(g, 2, -6.8, 6, -7.2, '#1a1615', 1.1);
    }
    function talkAmt(c) { var t = S.t * 10.5 + (c.id === 'sugarfoot' ? 1.3 : 0); var v = 0.5 + 0.5 * Math.sin(t) * Math.sin(t * 0.37 + 1); return 0.25 + 0.75 * Math.abs(v); }

    // what the pals carry is drawn after both of them, so a pal standing in front never hides it
    function later(m, it, dx, dy) { S.itemQ.push({ m: m, it: it, dx: dx, dy: dy }); }
    function drawCarried(g) { (S.itemQ || []).forEach(function (q) { g.save(); g.setTransform(q.m); g.translate(q.dx, q.dy); drawItem(g, q.it); g.restore(); }); S.itemQ = []; }
    function drawPal(g, c) {
      var P = window.TOLPups; if (!P) return;
      var d = palFrame(c), L = P.looks[c.look];
      var px = X(d.x) + (d.jit || 0), base = G + groundDy(px) + d.dy, y = base - d.lift;
      var pass = passing(c); if (pass) { base -= 7 * pass; y -= 7 * pass; } // walking past her pal: a step further back
      // legs follow the ground covered
      if (c.lastPx != null && d.moving) c.ph += Math.abs(px - c.lastPx) * 0.2 / S.sp; else if (!d.moving) { var tgt = Math.round(c.ph / Math.PI) * Math.PI; c.ph += (tgt - c.ph) * 0.15; }
      c.lastPx = px;
      var f = c.face * (d.faceMul != null ? d.faceMul : 1), fa = Math.max(0.15, Math.abs(f)), fs = sgn(f);
      var pq = clamp((S.t - c.popT) / 0.35, 0, 1), pop = Math.sin(pq * Math.PI) * 0.06;
      var sh = clamp(1 - d.lift / 120, 0.4, 1);
      ell(g, px, base + 1, 22 * S.sp * sh * 0.8, 3.6 * S.sp * sh * 0.8, 'rgba(40,30,60,' + (0.16 * sh).toFixed(3) + ')');
      if (d.glow > 0) { var gr = g.createRadialGradient(px, y - 28, 4, px, y - 28, 70); gr.addColorStop(0, 'rgba(255,236,170,' + (0.45 * d.glow * (d.glowFade == null ? 1 : d.glowFade)).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,236,170,0)'); g.fillStyle = gr; g.fillRect(px - 70, y - 98, 140, 140); }
      g.save(); g.translate(px, y); g.scale(fs, 1);
      if (d.rot) { var pvx = d.pivot === 'hind' ? -12 * S.sp : 0, pvy = d.pivot === 'hind' ? 0 : -22 * S.sp; g.translate(pvx, pvy); g.rotate(d.rot); g.translate(-pvx, -pvy); }
      g.scale(fa * S.sp * d.sx * (1 + pop * 0.6) * (1 - 0.06 * pass), S.sp * d.sy * (1 - pop) * (1 - 0.06 * pass));
      var wag = d.tailBase + Math.sin(S.t * 11 * d.wagS + (c.id === 'tidbit' ? 0 : 2)) * d.wagA * (c.id === 'tidbit' ? 1 : 0.8) * (S.reduced ? 0.7 : 1);
      var pose = d.pose === 'stand' ? 'run' : d.pose;
      P.draw(g, L, pose, d.moving ? c.ph : (pose === 'run' ? Math.round(c.ph / Math.PI) * Math.PI : c.ph), wag, false, S.t * 1000, d.tilt, { ear: d.ear });
      // into head space: exactly where pups.js put the head
      var lean = L.build === 'lean', BY = lean ? -21 : -18.5;
      var hx = pose === 'lie' ? 19 : pose === 'sit' ? 18 : pose === 'bow' ? 22 : 21, hy = pose === 'lie' ? -19 : pose === 'sit' ? -38 : pose === 'bow' ? -14 : BY - 12;
      var ph = d.moving ? c.ph : Math.round(c.ph / Math.PI) * Math.PI;
      g.translate(hx, hy); g.rotate((pose === 'run' ? Math.sin(ph) * 0.05 : pose === 'bow' ? -0.15 : pose === 'lie' ? 0.05 : 0) + (d.tilt || 0));
      drawFace(g, c, d);
      if (c.item && !(c.act && c.act.name === 'build')) {
        var o2 = S.chars[c.id === 'tidbit' ? 'sugarfoot' : 'tidbit'];
        if (c.shared && o2 && o2.shared && o2.item === c.item) {
          // carried together: one item, held between the two of them (drawn once, when the second pup is drawn)
          var mm = g.getTransform(); c.itemM = { m: mm, t: S.t };
          if (o2.itemM && o2.itemM.t === S.t) {
            // halfway between them at chest height, with a handle to each mouth, so it reads as carried together
            var ks = Math.hypot(mm.a, mm.b), ix = (mm.e + o2.itemM.m.e) / 2, iy = (mm.f + o2.itemM.m.f) / 2 + 16 * ks;
            g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.strokeStyle = 'rgba(110,80,50,.85)'; g.lineWidth = 1.6 * ks; g.lineCap = 'round';
            [c.mouthPx, o2.mouthPx].forEach(function (mp) { if (!mp) return; g.beginPath(); g.moveTo(mp.x, mp.y); g.quadraticCurveTo((mp.x + ix) / 2, iy - 2 * ks, ix + sgn(mp.x - ix) * 8 * ks, iy - 4 * ks); g.stroke(); });
            g.restore();
            later(new DOMMatrix([mm.a, mm.b, mm.c, mm.d, ix, iy]), c.item, -14, -4);
          }
        } else later(g.getTransform(), c.item, 0, 0);
      }
      if (d.hammer != null) later(g.getTransform(), 'hammer', 0, d.hammer * -2);
      if (c.rider) later(g.getTransform(), 'snailrider', 0, 0);
      var m = g.getTransform(); c.headPx = { x: m.e, y: m.f, r: 14 * Math.hypot(m.a, m.b) }; c.headM = m;
      var inv = S.geo; c.headStage = { x: (m.e - inv.ox - S.shift) / inv.k, y: (m.f - inv.oy) / inv.k };
      var mo = m.transformPoint ? m.transformPoint({ x: 16, y: 6 }) : { x: m.e, y: m.f }; c.mouthPx = { x: mo.x, y: mo.y };
      g.restore();
      if (c.kite) { // the kite, up in the breeze, on a long string
        var hs = c.headStage, kx = hs.x + fs * 60 + Math.sin(S.t * 0.9) * 10, ky = Math.max(S.geo.y0 + 30, G - 190 + Math.sin(S.t * 1.3) * 8);
        g.strokeStyle = 'rgba(80,60,40,.7)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(hs.x + fs * 10, hs.y + 6); g.quadraticCurveTo(hs.x + fs * 40, hs.y - 10, kx, ky + 12); g.stroke();
        paintKite(g, kx, ky, 1, 1, Math.sin(S.t * 1.1) * 0.25, S.t); c.kitePos = { x: kx, y: ky };
      }
      if (c.act && c.act.name === 'rain-drip') { var hr = c.headStage, cq = clamp((S.t - c.act.t0) / 0.6, 0, 1) * clamp((c.act.t0 + c.act.dur - S.t) / 0.5, 0, 1); g.globalAlpha = cq;
        [[-12, 0, 10], [0, -5, 13], [13, 0, 10]].forEach(function (q) { circ(g, hr.x + q[0], hr.y - 36 + q[1], q[2], '#8E96A8'); });
        for (var k = 0; k < 4; k++) { var dy2 = ((S.t * 38 + k * 13) % 30); line(g, hr.x - 12 + k * 8, hr.y - 26 + dy2, hr.x - 12 + k * 8, hr.y - 22 + dy2, '#8CCBF0', 1.4); } g.globalAlpha = 1; }
      if (c.act && c.act.name === 'think') { var ht = c.headStage; S.think = { x: ht.x, y: ht.y, id: c.id, emoji: String(c.act.p.think || c.act.p.emoji || '💭'), t0: c.act.t0, dur: c.act.dur, face: fs }; }
    }

    // ---------- guests ----------
    function guestPos(c) {
      var gd = GUESTS[c.id], x = X(c.x), y = gd.where === 'air' ? G - 118 : gd.where === 'sky' ? G - 190 : gd.where === 'hover' ? G - 22 : gd.where === 'flutter' ? G - 96 : G;
      var inq = c.inT ? sio((S.t - c.t0) / c.inT) : 1, outq = c.out ? sio((S.t - c.out.t0) / c.out.dur) : 0, off = 1 - inq + outq;
      if (off > 0) {
        if (c.enter === 'top') y -= off * 220;
        else { var dir = c.enter === 'right' ? 1 : -1, span = (S.geo.x1 - S.geo.x0) * 0.35; x += dir * off * span; if (gd.where === 'air' || gd.where === 'flutter') y -= off * 60; }
      }
      var a = c.act;
      if (a) {
        var q = clamp((S.t - a.t0) / a.dur, 0, 1);
        if (a.toX != null && a.toX !== a.fromX) { c.x = mix(a.fromX, a.toX, sio(q)); x = X(c.x); c.fx = sgn(a.toX - a.fromX); }
        if (a.name === 'hop' || a.name === 'jump' || a.name === 'splash') y -= (a.name === 'jump' ? 26 : 10) * bump((q * (a.name === 'jump' ? 1 : 2)) % 1);
        if (a.name === 'spin') c.spin = Math.cos(TAU * sio(q)); else c.spin = null;
        if (a.name === 'wiggle' || !ACTIONS[a.name]) c.wig = Math.sin((S.t - a.t0) * 4) * 0.08; else c.wig = 0;
        if (a.name === 'heart' && tick(c, 'heart', 0.5)) burst(x, y - gd.h - 6, 1, 'heart', { speed: 14 });
        if (a.name === 'sparkle' && tick(c, 'sp', 0.35)) burst(x + (Math.random() - 0.5) * 40, y - gd.h, 1, 'spark', { speed: 8 });
        if (q >= 1) commit(c);
      } else { c.spin = null; c.wig = 0; }
      if (gd.where === 'hover') y -= 4 * Math.sin(S.t * 1.6);
      if (gd.where === 'flutter') { x += Math.sin(S.t * 0.9) * 14; y += Math.sin(S.t * 1.7) * 8; }
      if (gd.where === 'air') y += Math.sin(S.t * 1.2) * 1.5;
      return { x: x, y: y, alpha: c.out ? 1 - outq * 0.3 : 1 };
    }
    function drawGuest(g, c) {
      var gd = GUESTS[c.id], pos = guestPos(c), t = S.t, talk = c.talk ? talkAmt(c) : 0, f = c.spin != null ? c.spin : c.face;
      c.face += (c.fx - c.face) * 0.12;
      g.save(); g.globalAlpha = pos.alpha; g.translate(pos.x, pos.y); g.rotate(c.wig || 0); g.scale(sgn(f) * Math.max(0.2, Math.abs(f)), 1);
      var blink = (t % 4.3) < 0.14;
      GDRAW[c.id](g, t, talk, blink, c);
      g.restore();
      var m = g.getTransform(); // head, for bubbles and faces
      var hy = pos.y - gd.h * (c.id === 'moon' ? 0.1 : 0.75);
      c.headStage = { x: pos.x, y: hy }; c.headPx = { x: m.a * pos.x + m.e, y: m.d * hy + m.f, r: (c.id === 'moon' ? 30 : gd.h * 0.5) * m.a };
    }
    function eye(g, x, y, r, blink) { if (blink) { line(g, x - r, y, x + r, y, '#221c1c', 1.1); return; } circ(g, x, y, r, '#fff'); circ(g, x + r * 0.25, y, r * 0.6, '#221c1c'); circ(g, x + r * 0.45, y - r * 0.3, r * 0.22, '#fff'); }
    function gmouth(g, x, y, w, talk, col) { if (talk > 0.05) ell(g, x, y + 1, w * 0.5, 1 + talk * w * 0.35, col || '#6B2A33'); else { g.strokeStyle = col || '#6B2A33'; g.lineWidth = 1.1; g.beginPath(); g.arc(x, y - w * 0.3, w * 0.55, 0.3, Math.PI - 0.3); g.stroke(); } }
    var GDRAW = {
      snail: function (g, t, talk, blink) {
        ell(g, 2, -5, 22, 5.5, '#B9C79A'); line(g, 16, -9, 19, -22, '#9DAE7C', 2); line(g, 20, -8, 25, -20, '#9DAE7C', 2); eye(g, 19, -23, 2.6, blink); eye(g, 25, -21, 2.6, blink);
        circ(g, -4, -17, 13, '#E7A76B'); g.strokeStyle = '#B86B3B'; g.lineWidth = 2; g.beginPath(); for (var a = 0; a < 12; a += 0.3) { var r = 11 - a * 0.85; if (r < 0.5) break; g.lineTo(-4 + Math.cos(a) * r, -17 + Math.sin(a) * r); } g.stroke();
        gmouth(g, 21, -7, 4, talk);
      },
      owl: function (g, t, talk, blink) {
        line(g, -26, 2, 26, 4, '#7A5638', 4); ell(g, 0, -20, 16, 20, '#8A6A4E'); ell(g, 0, -14, 10, 13, '#D9C3A2');
        g.fillStyle = '#8A6A4E'; g.beginPath(); g.moveTo(-14, -34); g.lineTo(-10, -46); g.lineTo(-4, -36); g.moveTo(14, -34); g.lineTo(10, -46); g.lineTo(4, -36); g.fill();
        circ(g, -6.5, -30, 7, '#F2E6CF'); circ(g, 6.5, -30, 7, '#F2E6CF'); eye(g, -6.5, -30, 4.5, blink); eye(g, 6.5, -30, 4.5, blink);
        g.fillStyle = '#E8A93F'; g.beginPath(); g.moveTo(-2.5, -25); g.lineTo(2.5, -25); g.lineTo(0, -20 + talk * 3); g.fill();
        ell(g, -15, -16, 5, 12, '#735538', 0.2); ell(g, 15, -16, 5, 12, '#735538', -0.2);
        line(g, -4, 0, -4, 4, '#E8A93F', 2); line(g, 4, 0, 4, 4, '#E8A93F', 2);
      },
      ducklings: function (g, t, talk, blink) {
        for (var i = 0; i < 3; i++) { var x = -26 + i * 22, b = Math.abs(Math.sin(t * 3 + i)) * 2, s = i === 1 ? 1.1 : 0.9;
          g.save(); g.translate(x, -b); g.scale(s, s); ell(g, 0, -8, 9, 7, '#F7D54A'); circ(g, 6, -17, 6, '#F9DC5E'); eye(g, 8, -18.5, 1.5, blink);
          g.fillStyle = '#F29A3A'; g.beginPath(); g.moveTo(11, -17); g.lineTo(16 + talk * 1.5, -16); g.lineTo(11, -14 + talk * 2); g.fill(); ell(g, -3, -8, 5, 3, '#EEC53C', -0.3); g.restore(); }
      },
      robot: function (g, t, talk, blink) {
        circ(g, -8, -4, 5, '#4B4A55'); circ(g, 8, -4, 5, '#4B4A55'); rr(g, -14, -30, 28, 24, 5, '#9FB6C9'); rr(g, -11, -26, 22, 10, 3, '#E9F2F8');
        rr(g, -12, -52, 24, 20, 5, '#B8CAD8'); rr(g, -9, -48, 18, 12, 3, '#23303B');
        if (blink) { line(g, -6, -43, -2, -43, '#7FE3C4', 1.5); line(g, 2, -43, 6, -43, '#7FE3C4', 1.5); } else { circ(g, -4, -43, 2.2, '#7FE3C4'); circ(g, 4, -43, 2.2, '#7FE3C4'); }
        rr(g, -4, -39 + (talk ? 0 : 1), 8, 1.4 + talk * 2.4, 1, '#7FE3C4');
        line(g, 0, -52, 0, -60, '#4B4A55', 1.5); circ(g, 0, -61, 2.4, Math.sin(t * 4) > 0 ? '#F7DC6F' : '#E4566E');
        line(g, -14, -24, -20, -14 + Math.sin(t * 2) * 2, '#7F97AA', 3); line(g, 14, -24, 20, -14 - Math.sin(t * 2) * 2, '#7F97AA', 3);
      },
      moon: function (g, t, talk, blink) {
        var gr = g.createRadialGradient(0, 0, 10, 0, 0, 60); gr.addColorStop(0, 'rgba(255,248,210,.35)'); gr.addColorStop(1, 'rgba(255,248,210,0)'); g.fillStyle = gr; g.fillRect(-60, -60, 120, 120);
        circ(g, 0, 0, 30, '#FBF3D5'); circ(g, -12, -10, 5, 'rgba(210,200,160,.35)'); circ(g, 12, 12, 4, 'rgba(210,200,160,.35)'); circ(g, 14, -14, 3, 'rgba(210,200,160,.3)');
        if (blink) { line(g, -13, -3, -5, -3, '#6B5A48', 1.4); line(g, 5, -3, 13, -3, '#6B5A48', 1.4); } else { g.strokeStyle = '#6B5A48'; g.lineWidth = 1.5; g.beginPath(); g.arc(-9, -2, 4, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.beginPath(); g.arc(9, -2, 4, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
        ell(g, -16, 6, 4, 2.2, 'rgba(242,163,182,.6)'); ell(g, 16, 6, 4, 2.2, 'rgba(242,163,182,.6)'); gmouth(g, 0, 10, 8, talk, '#8A5A48');
      },
      puddles: function (g, t, talk, blink) {
        g.save(); g.translate(0, -34); g.scale(0.62, 0.62); g.translate(-40, -40);
        g.fillStyle = '#CFE6FA'; g.strokeStyle = '#7FB2E0'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(40, 8); g.bezierCurveTo(33, 22, 14, 36, 14, 50); g.bezierCurveTo(14, 64, 26, 72, 40, 72); g.bezierCurveTo(54, 72, 66, 64, 66, 50); g.bezierCurveTo(66, 36, 47, 22, 40, 8); g.fill(); g.stroke();
        ell(g, 30, 30, 5, 3, 'rgba(255,255,255,.6)', -0.43);
        g.strokeStyle = '#3A3350'; g.lineWidth = 1.8; g.beginPath(); g.arc(31, 46, 6.2, 0, TAU); g.stroke(); g.beginPath(); g.arc(49, 46, 6.2, 0, TAU); g.stroke(); line(g, 37.2, 46, 42.8, 46, '#3A3350', 1.8);
        if (blink) { line(g, 29, 46.5, 33, 46.5, '#2B2620', 1.4); line(g, 47, 46.5, 51, 46.5, '#2B2620', 1.4); } else { circ(g, 31, 46.5, 2.4, '#2B2620'); circ(g, 49, 46.5, 2.4, '#2B2620'); }
        if (talk > 0.05) ell(g, 40, 57, 4, 1.5 + talk * 3, '#2B2620'); else { g.strokeStyle = '#2B2620'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(35, 56); g.quadraticCurveTo(40, 60.5, 45, 56); g.stroke(); }
        ell(g, 23, 55, 3.6, 2.2, 'rgba(242,163,182,.85)'); ell(g, 57, 55, 3.6, 2.2, 'rgba(242,163,182,.85)');
        g.fillStyle = '#3A3350'; g.beginPath(); g.moveTo(18, 10); g.lineTo(40, 1); g.lineTo(62, 10); g.lineTo(40, 19); g.fill(); g.fillStyle = '#4A4266'; g.beginPath(); g.moveTo(29, 14.5); g.lineTo(29, 20.5); g.bezierCurveTo(32, 23.5, 48, 23.5, 51, 20.5); g.lineTo(51, 14.5); g.lineTo(40, 19); g.fill();
        line(g, 60, 10, 60, 21, '#F4D26B', 1.6); circ(g, 60, 22.5, 2.3, '#F4D26B');
        g.restore(); ell(g, 0, 0, 12, 2.5, 'rgba(40,30,60,.12)');
      },
      frog: function (g, t, talk, blink) {
        ell(g, 0, -9, 14, 10, '#6FB36A'); ell(g, 2, -6, 9, 6, '#CDE7A8'); circ(g, -6, -19, 5.5, '#6FB36A'); circ(g, 7, -19, 5.5, '#6FB36A'); eye(g, -6, -20, 3.4, blink); eye(g, 7, -20, 3.4, blink);
        if (talk > 0.05) ell(g, 3, -8, 5 + talk * 2, 3 + talk * 2.5, '#E8F3C8'); gmouth(g, 1, -12, 12, talk * 0.5, '#2E5A2E');
        ell(g, -12, -1, 6, 2.5, '#5CA058'); ell(g, 12, -1, 6, 2.5, '#5CA058');
      },
      butterfly: function (g, t, talk, blink) {
        var fl = 0.35 + 0.65 * Math.abs(Math.sin(t * 5)); g.save(); g.scale(1, 1);
        g.fillStyle = '#B79CEB'; g.beginPath(); g.ellipse(-6 * fl, -10, 9 * fl, 7, -0.5, 0, TAU); g.fill(); g.beginPath(); g.ellipse(-5 * fl, -2, 6 * fl, 5, 0.4, 0, TAU); g.fill();
        g.fillStyle = '#F7A8C2'; g.beginPath(); g.ellipse(6 * fl, -10, 9 * fl, 7, 0.5, 0, TAU); g.fill(); g.beginPath(); g.ellipse(5 * fl, -2, 6 * fl, 5, -0.4, 0, TAU); g.fill();
        g.restore(); ell(g, 0, -6, 1.8, 7, '#4A3F63'); circ(g, 0, -14, 2.4, '#4A3F63'); line(g, 0, -15, -3, -21, '#4A3F63', 0.8); line(g, 0, -15, 3, -21, '#4A3F63', 0.8);
        if (talk > 0.05) circ(g, 0, -12.8, 0.8 + talk * 0.5, '#F7A8C2');
      },
      squirrel: function (g, t, talk, blink) {
        g.fillStyle = '#B5652F'; g.beginPath(); g.moveTo(-6, -4); g.bezierCurveTo(-30, -2, -30, -44, -12, -44); g.bezierCurveTo(-2, -44, -8, -30, -14, -26); g.bezierCurveTo(-18, -18, -12, -8, -6, -4); g.fill();
        ell(g, 0, -12, 9, 12, '#C8733A'); ell(g, 2, -10, 5, 8, '#F0D2A8'); circ(g, 4, -27, 8, '#C8733A');
        g.fillStyle = '#C8733A'; g.beginPath(); g.moveTo(-1, -33); g.lineTo(1, -41); g.lineTo(4, -34); g.fill();
        eye(g, 7, -29, 2.4, blink); circ(g, 12, -25, 1.4, '#3A2418'); gmouth(g, 9.5, -22, 4, talk);
        ell(g, 6, -14, 3, 2, '#B5652F'); ell(g, -3, 0, 5, 2.2, '#B5652F'); ell(g, 6, 0, 5, 2.2, '#B5652F');
      }
    };

    // ---------- weather ----------
    function weatherStep(dt) {
      var w = S.weather, want = w === 'rain' ? 70 : w === 'storm' ? 110 : w === 'snow' ? 60 : w === 'wind' ? 26 : w === 'stars' ? 50 : 0, gg = S.geo;
      if (S.reduced) want = Math.round(want * 0.45);
      while (S.wx.length < want) S.wx.push({ x: mix(gg.x0 - 30, gg.x1 + 30, Math.random()), y: mix(gg.y0, G + 30, Math.random()), s: Math.random(), v: 0.6 + Math.random() * 0.6 });
      if (S.wx.length > want) S.wx.length = want;
      var slow = S.reduced ? 0.4 : 1;
      for (var i = 0; i < S.wx.length; i++) {
        var p = S.wx[i];
        if (w === 'rain' || w === 'storm') { p.y += (w === 'storm' ? 330 : 260) * p.v * dt * slow; p.x += (w === 'storm' ? -60 : -18) * dt * slow; }
        else if (w === 'snow') { p.y += 26 * p.v * dt * slow; p.x += Math.sin(S.t * 0.8 + p.s * 6) * 10 * dt; }
        else if (w === 'wind') { p.x += 180 * p.v * dt * slow; p.y += Math.sin(S.t * 2 + p.s * 5) * 12 * dt; }
        if (p.y > G + 40) { p.y = gg.y0 - 5; p.x = mix(gg.x0 - 30, gg.x1 + 30, Math.random()); }
        if (p.x > gg.x1 + 40) { p.x = gg.x0 - 30; p.y = mix(gg.y0, G + 20, Math.random()); }
        if (p.x < gg.x0 - 40) p.x = gg.x1 + 30;
      }
      if (w === 'stars' && !S.reduced) { if (!S.shoot && Math.random() < dt / 9) S.shoot = { t0: S.t, x: mix(gg.x0 + 40, gg.x1 - 120, Math.random()), y: gg.y0 + 20 + Math.random() * 60 }; if (S.shoot && S.t - S.shoot.t0 > 1.4) S.shoot = null; }
    }
    function weatherBack(g) {
      var w = S.weather, gg = S.geo;
      if (w === 'storm' || w === 'rain') { var gr = g.createLinearGradient(0, gg.y0, 0, G - 60); gr.addColorStop(0, w === 'storm' ? 'rgba(40,44,70,.55)' : 'rgba(90,100,125,.35)'); gr.addColorStop(1, 'rgba(90,100,125,0)'); g.fillStyle = gr; g.fillRect(gg.x0 - 4, gg.y0 - 4, gg.x1 - gg.x0 + 8, G - gg.y0);
        if (!S.info || !S.info.indoor) for (var i = 0; i < 6; i++) { var cx = mix(gg.x0 - 20, gg.x1, rnd(i)) + ((S.t * 6 + i * 50) % 80) - 40, cy = gg.y0 + 18 + rnd(i + 9) * 34, s = 1.1 + rnd(i + 3) * 0.9, col = w === 'storm' ? 'rgba(78,82,110,.85)' : 'rgba(150,158,180,.7)'; circ(g, cx, cy, 14 * s, col); circ(g, cx + 16 * s, cy - 6 * s, 16 * s, col); circ(g, cx + 34 * s, cy, 12 * s, col); } }
      if (w === 'stars') { for (var j = 0; j < S.wx.length; j++) { var p = S.wx[j], tw = 0.5 + 0.5 * Math.sin(S.t * (1 + p.s * 2) + p.s * 20); if (p.y < G - 80) star(g, p.x, p.y, 1.2 + p.s * 1.8, 'rgba(255,248,210,' + (0.35 + tw * 0.6).toFixed(2) + ')', 0); }
        if (S.shoot) { var q = (S.t - S.shoot.t0) / 1.4, sx = S.shoot.x + q * 160, sy = S.shoot.y + q * 50; g.strokeStyle = 'rgba(255,250,220,' + (1 - q).toFixed(2) + ')'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - 36, sy - 11); g.stroke(); star(g, sx, sy, 3, '#FFF8D8', 0); } }
    }
    function weatherFront(g) {
      var w = S.weather, gg = S.geo;
      var inside = S.info && S.info.indoor; // inside, the rain and snow stay out past the window
      if (inside) { /* no drops or flakes in the room */ }
      else if (w === 'rain' || w === 'storm') { g.strokeStyle = w === 'storm' ? 'rgba(200,215,240,.55)' : 'rgba(190,210,240,.5)'; g.lineWidth = 1; g.beginPath();
        for (var i = 0; i < S.wx.length; i++) { var p = S.wx[i], dx = w === 'storm' ? -3.5 : -1.2; g.moveTo(p.x, p.y); g.lineTo(p.x + dx, p.y + 9); } g.stroke(); }
      else if (w === 'snow') { for (var j = 0; j < S.wx.length; j++) circ(g, S.wx[j].x, S.wx[j].y, 1.3 + S.wx[j].s * 1.3, 'rgba(255,255,255,.9)'); }
      else if (w === 'wind') { for (var k = 0; k < S.wx.length; k++) { var q = S.wx[k]; if (k % 3 === 0) { g.save(); g.translate(q.x, q.y); g.rotate(S.t * 3 + q.s * 6); ell(g, 0, 0, 3.6, 1.8, ['#8FC46B', '#E8913F', '#F2C14E'][k % 3]); g.restore(); } else line(g, q.x, q.y, q.x + 18 + q.s * 16, q.y, 'rgba(255,255,255,.4)', 1); } }
      if (w === 'storm') { g.fillStyle = 'rgba(24,28,60,.22)'; g.fillRect(gg.x0 - 4, gg.y0 - 4, gg.x1 - gg.x0 + 8, gg.y1 - gg.y0 + 8); }
      else if (w === 'rain') { g.fillStyle = 'rgba(60,70,100,.1)'; g.fillRect(gg.x0 - 4, gg.y0 - 4, gg.x1 - gg.x0 + 8, gg.y1 - gg.y0 + 8); }
      if (S.flash > 0) { g.fillStyle = 'rgba(235,240,255,' + S.flash.toFixed(3) + ')'; g.fillRect(gg.x0 - 4, gg.y0 - 4, gg.x1 - gg.x0 + 8, gg.y1 - gg.y0 + 8); }
      // the default: lightning as a slow, dim lavender glow that fades in and out over about two seconds (no white flash)
      var gq = (S.t - S.glowT0) / 2.2;
      if (gq > 0 && gq < 1) { g.fillStyle = 'rgba(176,168,226,' + (0.09 * Math.sin(Math.PI * gq)).toFixed(3) + ')'; g.fillRect(gg.x0 - 4, gg.y0 - 4, gg.x1 - gg.x0 + 8, gg.y1 - gg.y0 + 8); }
    }

    // ---------- bubbles (drawn in pixels, so text stays crisp and readable) ----------
    function wrap(g, text, maxW) {
      var words = text.split(/\s+/), lines = [], cur = '';
      words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
      if (cur) lines.push(cur); return lines;
    }
    function faces() { var out = []; all().forEach(function (c) { if (c.headPx) out.push(c.headPx); }); return out; }
    function hits(bx, by, bw, bh, fs2, pad) { for (var i = 0; i < fs2.length; i++) { var f = fs2[i], cx = clamp(f.x, bx, bx + bw), cy = clamp(f.y, by, by + bh); if (Math.hypot(f.x - cx, f.y - cy) < f.r + pad) return true; } return false; }
    function drawBubble(g, W, H, dpr) {
      var b = S.bubble; if (!b || b.wait) return;
      var c = get(b.who); if (!c || !c.headPx) return;
      var self = b.to === 'self', chip = self ? 'to herself' : b.to === 'all' ? 'to everyone' : b.to === 'both' ? (c.guest ? 'to Tidbit and Sugarfoot' : 'to both') : b.to && b.to !== 'pal' && get(b.to) && get(b.to).guest ? 'to ' + (get(b.to).name || b.to) : '';
      var age = S.t - b.t0, fade = clamp((b.until + 0.4 - S.t) / 0.4, 0, 1), pin = S.reduced ? clamp(age / 0.25, 0, 1) : eout(clamp(age / 0.35, 0, 1));
      var cssW = W / dpr, compact = S.compact || cssW < 600, fsz = (compact ? 13 : cssW > 900 ? 17 : 15) * dpr;
      var text = b.text, dots = false;
      if (S.noBubbleText || (compact && text.length > 44)) { dots = true; }
      g.font = (self ? 'italic 500 ' : '600 ') + fsz + 'px ' + FONT;
      var maxW = Math.min(W * 0.44, 330 * dpr), lines = dots ? ['• • •'] : wrap(g, text, maxW), lh = fsz * 1.28, padX = 12 * dpr, padY = 8 * dpr;
      var chipF = Math.round(fsz * 0.62), chipH = chip ? chipF * 1.5 : 0;
      var bw = Math.min(maxW, Math.max.apply(null, lines.map(function (l) { return g.measureText(l).width; }))) + padX * 2, bh = lines.length * lh + padY * 2 + chipH;
      if (chip) { g.save(); g.font = '600 ' + chipF + 'px "IBM Plex Mono", monospace'; bw = Math.max(bw, g.measureText(chip.toUpperCase()).width + padX * 2); g.restore(); }
      var hp = c.headPx, fs2 = faces(), gap = 12 * dpr, best = null;
      var tries = [0, -0.35, 0.35, -0.7, 0.7, -1, 1];
      for (var lift = 0; lift < 4 && !best; lift++) {
        for (var i = 0; i < tries.length; i++) {
          var bx = clamp(hp.x - bw / 2 + tries[i] * bw, 6 * dpr, W - bw - 6 * dpr), by = clamp(hp.y - hp.r - gap - bh - lift * 22 * dpr, 6 * dpr, H - bh - 6 * dpr);
          if (!hits(bx, by, bw, bh, fs2, 4 * dpr)) { best = { x: bx, y: by }; break; }
        }
      }
      if (!best) best = { x: clamp(hp.x - bw / 2, 6 * dpr, W - bw - 6 * dpr), y: 6 * dpr };
      g.save(); g.globalAlpha = fade * clamp(pin * 1.3, 0, 1);
      var sc = 0.85 + 0.15 * pin, cx = best.x + bw / 2, cy = best.y + bh / 2; g.translate(cx, cy); g.scale(sc, sc); g.translate(-cx, -cy);
      var isG = !!c.guest, fill = isG ? '#FFF8E6' : c.id === 'tidbit' ? '#FFFDF8' : '#FDF7FF', stroke = c.id === 'tidbit' ? 'rgba(200,120,60,.7)' : c.id === 'sugarfoot' ? 'rgba(120,96,170,.7)' : 'rgba(120,110,90,.6)';
      g.shadowColor = 'rgba(40,20,60,.18)'; g.shadowBlur = 8 * dpr; g.shadowOffsetY = 2 * dpr;
      if (self) { fill = 'rgba(255,253,248,.82)'; g.shadowBlur = 4 * dpr; }
      g.fillStyle = fill; g.beginPath(); if (g.roundRect) g.roundRect(best.x, best.y, bw, bh, (self ? bh / 2.4 : 14 * dpr)); else g.rect(best.x, best.y, bw, bh); g.fill();
      g.shadowColor = 'transparent'; g.strokeStyle = stroke; g.lineWidth = 1.5 * dpr; if (self && g.setLineDash) g.setLineDash([3 * dpr, 4 * dpr]); g.stroke(); if (g.setLineDash) g.setLineDash([]);
      if (chip) { g.save(); g.font = '600 ' + chipF + 'px "IBM Plex Mono", monospace'; g.fillStyle = stroke; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(chip.toUpperCase(), best.x + bw / 2, best.y + padY * 0.7 + chipH / 2); g.restore(); }
      // the tail points at the speaker's head
      var tx0 = clamp(hp.x, best.x + 16 * dpr, best.x + bw - 16 * dpr), ty0 = best.y + bh - 1, below = hp.y > best.y + bh;
      if (below && self) { // murmur: two little dots instead of a pointing tail
        [[0.35, 3.2], [0.7, 2.2]].forEach(function (k) { g.beginPath(); g.arc(mix(tx0, hp.x, k[0]), mix(ty0, hp.y - hp.r * 0.9, k[0]), k[1] * dpr, 0, TAU); g.fillStyle = fill; g.fill(); g.strokeStyle = stroke; g.stroke(); });
      } else if (below) { /* a long tail when the bubble had to move away, so it's clear who's talking */ var far = hp.y - hp.r * 0.9 - ty0 > 30 * dpr, tipX = mix(tx0, hp.x, far ? 0.8 : 0.5), tipY = far ? hp.y - hp.r * 0.95 : Math.min(hp.y - hp.r * 0.9, ty0 + 14 * dpr); g.fillStyle = fill; g.beginPath(); g.moveTo(tx0 - 7 * dpr, ty0); g.lineTo(tipX, tipY); g.lineTo(tx0 + 7 * dpr, ty0); g.closePath(); g.fill(); g.strokeStyle = stroke; g.beginPath(); g.moveTo(tx0 - 7 * dpr, ty0 + 0.5); g.lineTo(tipX, tipY); g.lineTo(tx0 + 7 * dpr, ty0 + 0.5); g.stroke(); }
      g.fillStyle = '#3C3350'; g.textAlign = 'center'; g.textBaseline = 'middle';
      if (dots) { var n = Math.floor(S.t * 3) % 3; g.fillText(['•  ·  ·', '·  •  ·', '·  ·  •'][S.reduced ? 0 : n], best.x + bw / 2, best.y + bh / 2); }
      else {
        // words light up as they're spoken, so the text keeps pace with the voice
        var all2 = lines.join(' ').split(' '), lit = all2.map(function () { return true; });
        var ink = self ? '#5A4F70' : '#3C3350', wn = 0, top = best.y + padY + chipH;
        lines.forEach(function (l, k) {
          var ws = l.split(' '), sp = g.measureText(' ').width, lw = g.measureText(l).width, x = best.x + bw / 2 - lw / 2, y = top + lh * (k + 0.5);
          g.textAlign = 'left';
          ws.forEach(function (w) { g.globalAlpha = fade * clamp(pin * 1.3, 0, 1) * (lit[wn] ? 1 : 0.38); g.fillStyle = ink; g.fillText(w, x, y); x += g.measureText(w).width + sp; wn++; });
        });
      }
      g.restore();
    }
    function drawThink(g, W, H, dpr) {
      var th = S.think; if (!th) return; S.think = null;
      var c = get(th.id); if (!c || !c.headPx) return;
      var q = clamp((S.t - th.t0) / 0.5, 0, 1) * clamp((th.t0 + th.dur - S.t) / 0.4, 0, 1), hp = c.headPx, r = 22 * dpr, x = clamp(hp.x + th.face * 30 * dpr, r + 6, W - r - 6), y = clamp(hp.y - hp.r - 44 * dpr, r + 6, H);
      g.save(); g.globalAlpha = q; g.fillStyle = '#FFFDF8'; g.strokeStyle = 'rgba(92,74,134,.45)'; g.lineWidth = 1.2 * dpr;
      [[0.25, 4], [0.55, 6.5]].forEach(function (k) { var bx = mix(hp.x, x, k[0]), by = mix(hp.y - hp.r, y + r, k[0]); g.beginPath(); g.arc(bx, by, k[1] * dpr, 0, TAU); g.fill(); g.stroke(); });
      g.beginPath(); for (var i = 0; i < 7; i++) { var a = i / 7 * TAU; g.moveTo(x + Math.cos(a) * r * 0.75 + r * 0.42, y + Math.sin(a) * r * 0.55); g.arc(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.55, r * 0.42, 0, TAU); } g.fill();
      circ(g, x, y, r * 0.8, '#FFFDF8');
      g.font = (20 * dpr) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(th.emoji, x, y + 1 * dpr);
      g.restore();
    }
    function drawCard(g, W, H, dpr) {
      var cd = S.card; if (!cd) return;
      var a = clamp((S.t - cd.t0) / 0.5, 0, 1) * clamp((cd.t0 + cd.dur + 0.5 - S.t) / 0.6, 0, 1); if (a <= 0) return;
      var cssW = W / dpr, fsz = (cd.small ? 13 : cssW < 600 ? 15 : 19) * dpr;
      g.save(); g.globalAlpha = a; g.font = (cd.small ? '600 ' : 'italic 600 ') + fsz + 'px ' + FONT;
      var tw = g.measureText(cd.text).width + 32 * dpr, th = fsz * 2.1, x = (W - tw) / 2, y = (cd.small ? 10 : 14) * dpr;
      g.fillStyle = cd.small ? 'rgba(255,253,248,.92)' : 'rgba(46,36,70,.72)'; g.beginPath(); if (g.roundRect) g.roundRect(x, y, tw, th, th / 2); else g.rect(x, y, tw, th); g.fill();
      g.fillStyle = cd.small ? '#4E3F6B' : '#FFF6E0'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(cd.text, W / 2, y + th / 2 + 1);
      g.restore();
    }
    // the series title card that opens every episode
    function drawTitle(g, W, H, dpr, u, ep) {
      var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2E2A5C'); gr.addColorStop(0.6, '#6B4F8E'); gr.addColorStop(1, '#F2A98C');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      for (var i = 0; i < 60; i++) { var tw = 0.5 + 0.5 * Math.sin(u * (1 + rnd(i) * 2) + i); star(g, rnd(i + 7) * W, rnd(i + 70) * H * 0.7, (1 + rnd(i + 3) * 2) * dpr, 'rgba(255,248,220,' + (0.3 + 0.6 * tw).toFixed(2) + ')', 0); }
      // a soft frequency wave
      g.strokeStyle = 'rgba(255,230,190,.45)'; g.lineWidth = 2 * dpr; g.beginPath();
      for (var x = 0; x <= W; x += 6 * dpr) { var y = H * 0.66 + Math.sin(x / (40 * dpr) + u * 1.2) * 10 * dpr * Math.sin(Math.PI * x / W); if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
      var geo = geoFor(W, H), P = window.TOLPups, s = geo.k;
      if (P) {
        [['collar', 0.2, 1], ['drop', 0.8, -1]].forEach(function (p, j) {
          var run = clamp((u - 0.4 - j * 0.25) / 1.6, 0, 1), px = mix(p[1] < 0.5 ? -0.2 : 1.2, p[1], sio(run)), sx = geo.ox + mix(geo.x0 + 34, geo.x1 - 34, px) * s, sy = geo.oy + (G + 10) * s;
          g.save(); g.translate(sx, sy); g.scale(p[2] * s * 1.7, s * 1.7);
          P.draw(g, P.looks[p[0]], run < 1 ? 'run' : 'sit', u * 9, Math.sin(u * 9) * 0.5, false, u * 1000, run < 1 ? 0 : -0.1);
          g.restore();
        });
      }
      if (S.poster) return;
      var a1 = clamp((u - 0.6) / 1, 0, 1), a2 = clamp((u - 2) / 1, 0, 1), cssW = W / dpr, big = (cssW < 600 ? 30 : 46) * dpr;
      g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.globalAlpha = a1; g.font = '600 ' + big + 'px ' + FONT; g.fillStyle = '#FFF3D6'; g.shadowColor = 'rgba(255,200,120,.6)'; g.shadowBlur = 18 * dpr;
      g.fillText('Frequency Buddies', W / 2, H * 0.3 - (1 - a1) * 8 * dpr); g.shadowBlur = 0;
      g.globalAlpha = a2; g.font = '500 ' + (big * 0.36) + 'px "IBM Plex Mono", monospace'; g.fillStyle = '#F7DCC8';
      g.fillText(('Season ' + (ep.season || 1) + ' · Episode ' + (ep.number || 1)).toUpperCase(), W / 2, H * 0.3 + big * 0.85);
      g.font = 'italic 500 ' + (big * 0.58) + 'px ' + FONT; g.fillStyle = '#FFFFFF'; g.fillText(ep.title || '', W / 2, H * 0.3 + big * 1.55);
      g.restore();
    }

    // ---------- one frame ----------
    S.shift = 0;
    function paintWorld(g, W, H, dpr, shift) {
      bgPaint(W, H); var gg = S.geo; S.shift = shift || 0;
      g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(S.bg, S.shift, 0);
      g.setTransform(gg.k, 0, 0, gg.k, gg.ox + S.shift, gg.oy);
      var PC2 = window.TOLPalsCam, env = gg.env;
      if (S.info && S.info.ambient && PC2 && PC2.paintAmbient) PC2.paintAmbient(g, S.scene, env, S.t * 1000, 'back');
      weatherBack(g); drawConstellations(g); drawShoots(g, S.lastDt); drawSkyKites(g);
      drawCarousel(g); drawChimney(g); drawTreehouse(g); drawBridgeBack(g); drawCreek(g); drawGround(g);
      S.itemQ = [];
      var list = [];
      for (var id in S.guests) if (GUESTS[id].where !== 'ground' && GUESTS[id].where !== 'hover') list.push(S.guests[id]);
      list.forEach(function (c) { drawGuest(g, c); g.setTransform(gg.k, 0, 0, gg.k, gg.ox + S.shift, gg.oy); });
      var order = [S.chars.tidbit, S.chars.sugarfoot];
      for (var gid in S.guests) if (GUESTS[gid].where === 'ground' || GUESTS[gid].where === 'hover') order.push(S.guests[gid]);
      order.sort(function (a, b) { return (a.guest ? 1 : 0) - (b.guest ? 1 : 0) || (passing(b) - passing(a)) || (a.id === 'tidbit' ? -1 : 1); });
      order.forEach(function (c) { if (S.hidden && S.hidden[c.id]) return; if (c.guest) drawGuest(g, c); else drawPal(g, c); g.setTransform(gg.k, 0, 0, gg.k, gg.ox + S.shift, gg.oy); });
      drawCarried(g); g.setTransform(gg.k, 0, 0, gg.k, gg.ox + S.shift, gg.oy);
      drawBridgeFront(g);
      drawParts(g);
      if (S.info && S.info.ambient && PC2 && PC2.paintAmbient) PC2.paintAmbient(g, S.scene, env, S.t * 1000, 'front');
      weatherFront(g);
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
    S.render = function (g, W, H, dpr, dt) {
      dpr = dpr || 1;
      bgPaint(W, H); weatherStep(dt || 0); S.lastDt = dt || 0;
      var tr = S.trans;
      if (tr && tr.snap) {
        var p = clamp((S.t - tr.t0) / tr.dur, 0, 1), e = sio(p);
        if (tr.kind === 'pan') {
          paintWorld(g, W, H, dpr, (1 - e) * W);
          g.drawImage(tr.snap, -e * W, 0);
          g.fillStyle = 'rgba(30,22,46,' + (0.18 * bump(p)).toFixed(3) + ')'; g.fillRect(0, 0, W, H);
        } else {
          if (p < 0.5) { g.drawImage(tr.snap, 0, 0); g.fillStyle = 'rgba(30,22,46,' + (sio(p * 2) * 0.92).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
          else { paintWorld(g, W, H, dpr, 0); g.fillStyle = 'rgba(30,22,46,' + ((1 - sio((p - 0.5) * 2)) * 0.92).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
        }
        if (p >= 1) S.trans = null;
      } else paintWorld(g, W, H, dpr, 0);
      if (!S.trans || S.trans.kind !== 'pan') { drawThink(g, W, H, dpr); drawBubble(g, W, H, dpr); } else S.think = null;
      drawCard(g, W, H, dpr);
      if (S.title) { var u = S.t - S.title.t0, a = clamp((S.title.dur - u) / 0.9, 0, 1); g.save(); g.globalAlpha = a; drawTitle(g, W, H, dpr, u, S.ep || {}); g.restore(); if (u > S.title.dur) S.title = null; }
    };
    // a scene change: remember this frame, then pan (a new place) or fade (same place, new time)
    S.transition = function (canvas, kind) {
      if (!canvas) return;
      var snap = document.createElement('canvas'); snap.width = canvas.width; snap.height = canvas.height; snap.getContext('2d').drawImage(canvas, 0, 0);
      S.trans = { t0: S.t, dur: kind === 'pan' ? SCENE_T * 0.95 : SCENE_T * 0.9, kind: kind, snap: snap };
    };
    S.showTitle = function (on) { S.title = on ? { t0: S.t, dur: TITLE_T - 0.6 } : null; };
    S.track = track;
    return S;
  }

  // =====================================================================================================
  // THE DIRECTOR: plays the beats in order, waits for voices, and can jump to any beat.
  // =====================================================================================================
  function makeDirector(stage, ep, hooks) {
    hooks = hooks || {};
    var F = flatten(ep), D = { i: 0, u: 0, dur: 0, playing: false, ended: false, voice: false, voiceEnd: null, ch: -1, music: 'none', flat: F, ep: ep, total: F.total };
    stage.ep = ep;
    function call(name) { if (hooks[name]) { try { return hooks[name].apply(null, Array.prototype.slice.call(arguments, 1)); } catch (e) { if (window.console) console.error('buddies: ' + name, e); } } return undefined; }
    function instant(b) {
      switch (kindOf(b)) {
        case 'scene': stage.applyScene(b); break;
        case 'place': if (b.place) stage.place(b.place, true); stage.applyProps(b.props); break;
        case 'act': stage.instantAct(b); break;
        case 'guest': if (b.exit) stage.removeGuest(b.guest, true); else stage.addGuest(b.guest, b.enter, b.name, true); break;
        case 'music': D.music = b.music; break;
        case 'say': if (b.mood) stage.moodOf(b.say, b.mood); break;
      }
    }
    function begin(i) {
      D.i = i; D.u = 0; D.voice = false; D.voiceEnd = null; D.vdur = 0; D.vAt = 0; D.shown = true;
      var fb = F.beats[i]; if (!fb) { D.ended = true; D.playing = false; stage.endActs(); stage.endSay(); call('onEnd'); return; }
      var b = fb.b, k = kindOf(b);
      if (fb.ch !== D.ch) { D.ch = fb.ch; call('onChapter', fb.ch); }
      stage.endActs(false, k === 'say');
      D.dur = fb.dur;
      switch (k) {
        case 'title': stage.showTitle(true); call('onCaption', '', ''); call('onMusic', 'title'); break;
        case 'say':
          var st = sayTime(b); stage.say(b, st, true); call('onLine', b);
          var cb = function (ok) {
            if (D.i !== i || !D.voice) return;
            D.voiceEnd = ok === false ? null : D.u; if (ok === false) D.voice = false;
            var nx = F.beats[i + 1], more = nx && kindOf(nx.b) === 'say'; stage.voiceDone(more);
            if (!more && ok !== false) call('onVoiceEnd', b); // nobody talking next: the words go when the voice does
          };
          D.shown = false;
          cb.nearLaugh = [F.beats[i - 1], F.beats[i + 1], F.beats[i + 2]].some(function (x) { return x && x.b.act === 'laugh'; });
          cb.start = function (delay, vdur) {
            if (D.i !== i || D.shown) return; D.shown = true;
            var lag = Math.max(0, delay || 0) + (call('latency') || 0);
            D.vAt = D.u + lag; D.vdur = vdur || 0; stage.voiceStart(lag, vdur);
            var show = function () { if (D.i === i) call('onCaption', b.say, b.text, b); };
            if (lag > 0.02) setTimeout(show, lag * 1000); else show();
          };
          if (call('speak', b, cb)) D.voice = true;
          else { D.shown = true; stage.showNow(); call('onCaption', b.say, b.text, b); }
          break;
        case 'act': D.dur = stage.beginAct(b); call('onAct', b);
          var nb = F.beats[i + 1]; if (GESTURE[b.act] && nb && kindOf(nb.b) === 'say') D.dur = Math.min(D.dur, b.act === 'laugh' ? 0.9 : 0.45);
          break;
        case 'scene':
          var same = b.scene === stage.scene, cv = call('canvas');
          if (cv && i > 1) stage.transition(cv, same || stage.reduced || b.scene === 'blank' || stage.scene === 'blank' ? 'fade' : 'pan');
          stage.applyScene(b); stage.endSay();
          // the pals stand where the next 'place' says from the very first frame of the new scene (not where they stood in the last one, which could be right on the bridge)
          for (var la = i + 1; la < F.beats.length; la++) { var kb = kindOf(F.beats[la].b); if (kb === 'place') { var pb = F.beats[la].b; if (pb.place) stage.place(pb.place, true); stage.applyProps(pb.props); } else if (kb !== 'music') break; }
          if (b.caption) { stage.card = { text: b.caption, t0: stage.t + SCENE_T * 0.55, dur: SCENE_CAP }; call('onCaption', 'scene', b.caption, b); }
          call('onWeather', stage.weather);
          break;
        case 'guest': if (b.exit) stage.removeGuest(b.guest); else stage.addGuest(b.guest, b.enter, b.name); break;
        case 'music': D.music = b.music; call('onMusic', b.music); break;
        case 'place':
          // right after a scene change (nothing said or done yet), the pals are simply there when the scene fades in
          var fresh = false; for (var q = i - 1; q >= 0; q--) { var kq = kindOf(F.beats[q].b); if (kq === 'scene') { fresh = true; break; } if (kq === 'say' || kq === 'act' || kq === 'guest') break; }
          if (b.place) stage.place(b.place, fresh); stage.applyProps(b.props); break;
      }
      call('onBeat', i, fb);
    }
    function done() {
      var fb = F.beats[D.i]; if (!fb) return true; var b = fb.b;
      if (kindOf(b) === 'say' && !D.shown && D.u > 3) { D.shown = true; stage.showNow(); call('onCaption', b.say, b.text, b); } // the voice is slow to start: show the words anyway
      if (kindOf(b) === 'say' && D.voice) {
        if (D.voiceEnd != null) {
          return D.u >= D.voiceEnd + turnGap(b, F.beats[D.i + 1] && F.beats[D.i + 1].b);
        }
        return D.u > sayTime(b) * 2.4 + holdOf(b) + 4; // the voice never said it had finished: move on anyway
      }
      return D.u >= D.dur;
    }
    D.tick = function (dt) {
      if (!D.playing || D.ended) return;
      stage.step(dt); D.u += dt;
      var fb = F.beats[D.i];
      if (fb && kindOf(fb.b) === 'say' && !D.voice && D.u >= sayTime(fb.b)) stage.stopTalk();
      var n = 0;
      while (!D.ended && done() && n++ < 50) {
        if (F.beats[D.i] && kindOf(F.beats[D.i].b) === 'say') stage.endSay();
        begin(D.i + 1);
      }
    };
    D.seek = function (i) {
      i = clamp(i | 0, 0, F.beats.length - 1);
      call('stopSpeech');
      stage.reset(); D.music = 'none'; D.ended = false; D.ch = -1;
      for (var j = 1; j < i; j++) instant(F.beats[j].b);
      stage.endActs(); stage.trans = null; stage.card = null; stage.bubble = null; stage.title = null;
      call('onMusic', D.music); call('onWeather', stage.weather);
      begin(i);
    };
    D.seekChapter = function (ch) { ch = clamp(ch, 0, F.chapterStart.length - 1); D.seek(ch === 0 ? 0 : F.chapterStart[ch]); };
    D.seekTime = function (t) { var k = 0; for (var i = 0; i < F.beats.length; i++) if (F.beats[i].start <= t) k = i; D.seek(k); };
    D.time = function () { var fb = F.beats[D.i]; return fb ? fb.start + Math.min(D.u, fb.dur) : F.total; };
    D.voiceFrac = function () { if (D.voiceEnd != null || !D.voice) return 1; if (!D.vdur) return D.shown ? 1 : 0; return clamp((D.u - D.vAt) / D.vdur, 0, 1); };
    D.chapterAt = function () { var fb = F.beats[D.i]; return fb ? fb.ch : F.chapterStart.length - 1; };
    D.chapterTime = function (ch) { var s = F.chapterStart[ch]; return ch === 0 ? 0 : F.beats[s] ? F.beats[s].start : F.total; };
    D.restartLine = function () { var fb = F.beats[D.i]; if (fb && kindOf(fb.b) === 'say') begin(D.i); };
    return D;
  }

  // =====================================================================================================
  // SOUND: soft generated music moods, rain, and a rare happy bark (Web Audio, made on the first Play)
  // =====================================================================================================
  var AU = { live: [], ctx: null, bus: null, mus: null, sfx: null, on: true, mood: 'none', timer: 0, next: 0, step: 0, rain: null, lastBark: -99, barks: {} };
  var CH = { // chords as MIDI notes; period in seconds per chord
    gentle: { p: 5.2, c: [[48, 55, 64, 71], [45, 52, 60, 67], [41, 48, 57, 64], [43, 50, 59, 62]], arp: 0.25 },
    happy: { p: 3.6, c: [[48, 55, 64, 67], [43, 50, 59, 67], [45, 52, 60, 64], [41, 48, 57, 65]], arp: 1 },
    tense: { p: 4.4, c: [[45, 52, 60, 64], [46, 53, 62, 65], [43, 50, 58, 62], [45, 52, 61, 64]], arp: 0, pulse: true },
    sad: { p: 5.6, c: [[45, 52, 60, 64], [41, 48, 57, 60], [48, 55, 60, 64], [43, 50, 55, 59]], arp: 0.15 },
    brave: { p: 3.8, c: [[50, 57, 62, 66], [45, 52, 61, 64], [47, 54, 62, 66], [43, 50, 59, 62]], arp: 0.8, pulse: true },
    triumph: { p: 3.2, c: [[48, 55, 64, 67], [41, 48, 60, 65], [43, 50, 59, 67], [48, 55, 64, 72]], arp: 1 },
    title: { p: 3.2, c: [[48, 55, 64, 67], [43, 50, 62, 67]], arp: 1 }
  };
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  var MIX = { music: 0.32, amb: 0.34, sfx: 0.5, duck: 0.5, fx: 0.7 }; // voices play at full level; the rest sits underneath
  // everyone's voice pulls the bed down smoothly, and it comes back up gently once nobody has spoken for a moment
  function duck(on, holdMs) {
    var c = AU.ctx; if (!c || !AU.bed) return;
    clearTimeout(AU.duckT);
    if (on) { try { AU.bed.gain.setTargetAtTime(MIX.duck, c.currentTime, 0.12); } catch (e) {} }
    AU.duckT = setTimeout(function () { if (AU.bed && AU.ctx) try { AU.bed.gain.setTargetAtTime(1, AU.ctx.currentTime, 0.9); } catch (e) {} }, holdMs == null ? 900 : holdMs);
  }
  // iPhones treat web sound as "ambient" and mute it with the silent switch. Asking for media playback
  // (and briefly playing a moment of silence through a media element) lets the music be heard.
  var unlocked = false;
  function unlockMediaAudio() {
    if (unlocked) return; unlocked = true;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try {
      var n = 800, buf = new Uint8Array(44 + n), dv = new DataView(buf.buffer), w = function (o, str) { for (var i = 0; i < str.length; i++) buf[o + i] = str.charCodeAt(i); };
      w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
      dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); w(36, 'data'); dv.setUint32(40, n, true);
      for (var i = 44; i < 44 + n; i++) buf[i] = 128;
      var el = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
      el.setAttribute('playsinline', ''); var pr = el.play(); if (pr && pr.catch) pr.catch(function () { unlocked = false; });
    } catch (e) {}
  }
  function auEnsure() {
    unlockMediaAudio();
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    if (!AU.ctx) {
      try { AU.ctx = new AC(); } catch (e) { return null; }
      var c = AU.ctx; AU.bus = c.createGain(); AU.bus.gain.value = AU.on ? 0.9 : 0; AU.bus.connect(c.destination);
      // the bed (music, place sounds, effects) sits well under the voices, and dips a little more while anyone talks
      AU.bed = c.createGain(); AU.bed.gain.value = 1; AU.bed.connect(AU.bus);
      AU.mus = c.createGain(); AU.mus.gain.value = MIX.music; var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500; AU.mus.connect(lp); lp.connect(AU.bed);
      AU.sfx = c.createGain(); AU.sfx.gain.value = MIX.sfx; AU.sfx.connect(AU.bed);
      AU.amb = c.createGain(); AU.amb.gain.value = MIX.amb; AU.amb.connect(AU.bed);
    }
    if (AU.ctx.state === 'suspended') { try { var pr = AU.ctx.resume(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} }
    return AU.ctx;
  }
  function pad(freq, t, len, vol) {
    var c = AU.ctx; [0, 5].forEach(function (det, k) {
      var o = c.createOscillator(), gn = c.createGain(); o.type = k ? 'sine' : 'triangle'; o.frequency.value = freq; o.detune.value = det;
      gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(vol * (k ? 0.7 : 0.5), t + Math.min(1.8, len * 0.35)); gn.gain.setValueAtTime(vol * (k ? 0.7 : 0.5), t + len * 0.75); gn.gain.linearRampToValueAtTime(0.0001, t + len + 1.4);
      o.connect(gn); gn.connect(AU.mus); o.start(t); o.stop(t + len + 1.6);
      AU.live.push({ g: gn, end: t + len + 1.6 });
    });
  }
  function pluck(freq, t, vol) {
    var c = AU.ctx, o = c.createOscillator(), gn = c.createGain(); o.type = 'sine'; o.frequency.value = freq;
    gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(vol, t + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(gn); gn.connect(AU.mus); o.start(t); o.stop(t + 1);
    AU.live.push({ g: gn, end: t + 1 });
  }
  function auSchedule() {
    var c = AU.ctx; if (!c || AU.mood === 'none' || !CH[AU.mood]) return;
    var m = CH[AU.mood];
    while (AU.next < c.currentTime + 0.6) {
      var t = Math.max(AU.next, c.currentTime + 0.05), chord = m.c[AU.step % m.c.length];
      chord.forEach(function (n, i) { pad(hz(n), t, m.p, i === 0 ? 0.03 : 0.022); });
      if (m.arp) { for (var k = 0; k < 8; k++) if (Math.random() < m.arp) pluck(hz(chord[(k * 3 + AU.step) % chord.length] + 12), t + k * m.p / 8, 0.018); }
      if (m.pulse) for (var q = 0; q < 4; q++) pluck(hz(chord[0] - 12), t + q * m.p / 4, 0.03);
      AU.step++; AU.next = t + m.p;
      if (AU.mood === 'title' && AU.step >= 2) { AU.mood = 'none'; break; }
    }
  }
  // a change of music lands on the next chord, so it flows; a big change ('now') lets the old notes fade quickly first
  function auMood(m, now) {
    var was = AU.mood; AU.mood = m && (CH[m] || m === 'none') ? m : 'none';
    if (!AU.ctx) return;
    var c = AU.ctx, t = c.currentTime;
    AU.live = AU.live.filter(function (n) { return n.end > t; });
    if (was === 'none' || AU.mood === 'none' || !(AU.next > t) || AU.next > t + 6) { AU.step = 0; AU.next = t + 0.1; }
    else if (now && was !== AU.mood) {
      AU.live.forEach(function (n) { try { n.g.gain.cancelScheduledValues(t); n.g.gain.setValueAtTime(n.g.gain.value, t); n.g.gain.linearRampToValueAtTime(0.0001, t + 0.9); } catch (e) {} });
      AU.live = []; AU.step = 0; AU.next = t + 0.5;
    } else if (was !== AU.mood) AU.step = 0; // the new chords begin where the current one ends
    if (!AU.timer) AU.timer = setInterval(function () { if (AU.ctx && AU.ctx.state === 'running') auSchedule(); }, 250);
  }
  // the real sounds of each place, under the music (the same recordings as the pal cam)
  var AMB_MAP = {
    backyard: [['birds', .5]], forest: [['birds', .5], ['wind', .18]], meadow: [['birds', .45], ['wind', .2]], gardenparty: [['birds', .5]], farm: [['birds', .5]],
    orchard: [['birds', .4], ['wind', .22]], treehouse: [['birds', .45], ['wind', .2]], pumpkins: [['wind', .28], ['birds', .28]],
    beach: [['waves', .55]], lighthouse: [['waves', .45], ['wind', .28]], bonfire: [['waves', .4], ['fire', .45]], snow: [['wind', .42]], cabin: [['fire', .5], ['wind', .18]],
    pond: [['stream', .38], ['birds', .3]], dock: [['boat', .5], ['birds', .18]], citypark: [['city', .28], ['birds', .3]], rooftop: [['city', .28], ['wind', .22]],
    festival: [['city', .28]], carnival: [['carnival', .28]], campsite: [['fire', .45], ['birds', .25]], rainy: [['rain', .5]], bakery: [['cafe', .32]], library: [['cafe', .1]],
    underwater: [['underwater', .45]], aquarium: [['underwater', .38]], studio: [['cafe', .12]], theater: [['cafe', .08]], space: [['underwater', .12]]
  };
  var AMBP = { bufs: {}, cur: [], gen: 0, key: '' };
  function ambLoad(n) {
    if (AMBP.bufs[n]) return AMBP.bufs[n];
    var c = AU.ctx; if (!c) return Promise.resolve(null);
    AMBP.bufs[n] = fetch('/assets/audio/ambience/' + n + '.mp3').then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (ab) {
      if (!ab) return null; return new Promise(function (ok) { try { var pr = c.decodeAudioData(ab, ok, function () { ok(null); }); if (pr && pr.catch) pr.catch(function () { ok(null); }); } catch (e) { ok(null); } });
    }).catch(function () { return null; });
    return AMBP.bufs[n];
  }
  function auAmbience(scene, weather, hour) {
    var c = AU.ctx; if (!c) return;
    var layers = (AMB_MAP[scene] || []).slice(), night = hour != null && (hour < 6 || hour >= 20.5);
    if (night) layers = layers.map(function (l) { return l[0] === 'birds' ? ['crickets', l[1]] : l; });
    if (weather === 'rain' || weather === 'storm') layers = layers.filter(function (l) { return l[0] !== 'birds'; }).concat([['rain', weather === 'storm' ? .55 : .45]]);
    if (weather === 'wind') layers.push(['wind', .35]);
    if (weather === 'stars' && !layers.some(function (l) { return l[0] === 'crickets'; })) layers.push(['crickets', .3]);
    var key = JSON.stringify(layers); if (key === AMBP.key) return; AMBP.key = key;
    var my = ++AMBP.gen, old = AMBP.cur; AMBP.cur = [];
    old.forEach(function (n) { try { n.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.7); n.s.stop(c.currentTime + 3); } catch (e) {} });
    layers.forEach(function (L) {
      ambLoad(L[0]).then(function (buf) {
        if (!buf || my !== AMBP.gen) return;
        var s = c.createBufferSource(), g = c.createGain(); s.buffer = buf; s.loop = true; s.loopStart = Math.min(0.06, buf.duration / 4); s.loopEnd = Math.max(s.loopStart + 1, buf.duration - 0.06);
        g.gain.value = 0.0001; s.connect(g); g.connect(AU.amb || AU.sfx); s.start(c.currentTime, Math.random() * buf.duration); g.gain.setTargetAtTime(L[1], c.currentTime, 1);
        AMBP.cur.push({ s: s, g: g });
      });
    });
  }
  function auWeather(w) {
    var c = AU.ctx; if (!c) return;
    var want = w === 'storm' ? 0.03 : w === 'rain' ? 0.018 : w === 'wind' ? 0.012 : 0;
    if (!AU.rain && want) {
      var len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      var src = c.createBufferSource(); src.buffer = buf; src.loop = true; var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.4; var gn = c.createGain(); gn.gain.value = 0;
      src.connect(bp); bp.connect(gn); gn.connect(AU.sfx); src.start(); AU.rain = { g: gn, bp: bp };
    }
    if (AU.rain) { AU.rain.bp.frequency.setTargetAtTime(w === 'wind' ? 420 : 900, c.currentTime, 0.5); AU.rain.g.gain.setTargetAtTime(want, c.currentTime, 0.8); }
  }
  function auSound(kind, who) {
    var c = AU.ctx; if (!c || !AU.on || c.state !== 'running') return;
    if (kind === 'rumble') {
      var len = c.sampleRate * 3, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      var s = c.createBufferSource(); s.buffer = buf; var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 110; var gn = c.createGain(); gn.gain.value = 0.22;
      s.connect(lp); lp.connect(gn); gn.connect(AU.sfx); s.start(c.currentTime + 0.4);
    } else if (kind === 'tap') {
      var o = c.createOscillator(), g2 = c.createGain(); o.type = 'triangle'; o.frequency.value = 520 + Math.random() * 80; g2.gain.setValueAtTime(0.03, c.currentTime); g2.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.12); o.connect(g2); g2.connect(AU.sfx); o.start(); o.stop(c.currentTime + 0.14);
    } else if (kind === 'bark') {
      if (c.currentTime - AU.lastBark < 25) return; AU.lastBark = c.currentTime;
      var n = 1 + Math.floor(Math.random() * 3), src = '/assets/audio/palcam/' + (who === 'sugarfoot' ? 'sugarfoot' : 'tidbit') + '-bark-' + n + '.wav';
      try { var a = new Audio(src); a.volume = 0.2; var pr = a.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {}
    }
  }
  function auOn(v) { AU.on = !!v; if (AU.bus && AU.ctx) AU.bus.gain.setTargetAtTime(AU.on ? 0.9 : 0, AU.ctx.currentTime, 0.3); }
  function auPause(p) { if (!AU.ctx) return; try { var pr = p ? AU.ctx.suspend() : AU.ctx.resume(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} }

  // =====================================================================================================
  // VOICES: the browser's own speech, where there is some. Cute: Tidbit bright and quick, Sugarfoot soft
  // and slower, the Narrator calm; every guest sounds a little different.
  // =====================================================================================================
  var VO = { ok: !!(window.speechSynthesis && window.SpeechSynthesisUtterance), picked: null, cur: null, token: 0 };
  function vlist() { try { return (window.speechSynthesis.getVoices() || []).filter(function (v) { return /^en([-_]|$)/i.test(v.lang || ''); }); } catch (e) { return []; } }
  var FEM = /samantha|ava|allison|susan|zira|aria|jenny|michelle|karen|moira|tessa|fiona|serena|victoria|emma|joanna|salli|kendra|kimberly|ivy|libby|sonia|natasha|female|google us english/i;
  var MALE = /daniel|alex|guy|david|mark|tom|arthur|oliver|ryan|brian|matthew|justin|george|male|james|aaron|fred/i;
  function vscore(v, fem) { var s = 0, n = v.name || ''; if (/en[-_]US/i.test(v.lang)) s += 3; if (/natural|neural|enhanced|premium|online/i.test(n)) s += 3; if (/google/i.test(n)) s += 1; if (fem ? FEM.test(n) : MALE.test(n)) s += 4; if (v.localService === false) s += 0.5; return s; }
  function vpick() {
    var L = vlist(); if (!L.length) return null;
    var fem = L.slice().sort(function (a, b) { return vscore(b, true) - vscore(a, true); }), male = L.slice().sort(function (a, b) { return vscore(b, false) - vscore(a, false); });
    var tid = fem[0], sug = fem.filter(function (v) { return v.name !== tid.name && FEM.test(v.name); })[0] || tid, nar = male.filter(function (v) { return MALE.test(v.name); })[0] || fem.filter(function (v) { return v !== tid && v !== sug; })[0] || tid;
    return { tidbit: tid, sugarfoot: sug, narrator: nar, guest: male[0] || tid };
  }
  function voicesReady() { if (!VO.ok) return false; if (!VO.picked) VO.picked = vpick(); return !!VO.picked; }
  if (VO.ok) { try { window.speechSynthesis.addEventListener('voiceschanged', function () { VO.picked = vpick(); }); } catch (e) {} }
  function cleanForSpeech(t) { return String(t).replace(/[\u{1F000}-\u{1FAFF}☀-➿️]/gu, '').replace(/\s+/g, ' ').trim(); }
  function vspeak(b, cb) {
    if (!voicesReady()) return false;
    var who = b.say, P = PALS[who] || (GUESTS[who] ? GUESTS[who] : NARRATOR), text = cleanForSpeech(b.text); if (!text) return false;
    var u = new window.SpeechSynthesisUtterance(text), tok = ++VO.token;
    u.voice = VO.picked[who] || (GUESTS[who] ? VO.picked.guest : VO.picked.narrator); u.lang = u.voice && u.voice.lang || 'en-US';
    u.pitch = clamp(P.pitch || 1, 0.1, 2); u.rate = clamp(P.rate || 1, 0.5, 1.6); u.volume = 1;
    if (who === 'narrator' && b.mood === 'excited') u.rate = 1.0;
    var fired = false; function end(ok) { if (fired || tok !== VO.token) return; fired = true; cb(ok); }
    var vc = VO.line = { key: ckey(b.say, b.text), t0: 0, dur: sayTime(b) * 1.15, ch: -1, done: false, text: text };
    u.onstart = function () { vc.t0 = performance.now(); duck(true, vc.dur * 1000 + 1500); if (tok === VO.token && cb.start) cb.start(0, vc.dur); };
    u.onboundary = function (e) { if (e && e.name !== 'sentence' && e.charIndex != null) vc.ch = e.charIndex; };
    u.onend = function () { vc.done = true; duck(false, 700); end(true); }; u.onerror = function (e) { end(e && (e.error === 'interrupted' || e.error === 'canceled') ? true : false); };
    VO.cur = u; // held, so the browser doesn't lose it before it ends
    try { if (window.speechSynthesis.speaking || window.speechSynthesis.pending) window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch (e) { return false; }
    return true;
  }
  function vstop() { VO.token++; if (VO.ok) { try { window.speechSynthesis.cancel(); } catch (e) {} } cstop(); tstop(); }

  // THE TRAILER: the "Next time" card is read aloud like a movie trailer. A low, slow narrator for the
  // dramatic lines, a quicker, higher one for the slapstick ones, with a beat between lines. Device
  // speech only (there is no recording of it); the card always shows the words too.
  var TV = { token: 0, on: false, btn: null };
  function tbtn() { if (TV.btn) { TV.btn.textContent = TV.on ? '■ Stop the trailer' : '🎬 Hear the trailer'; TV.btn.setAttribute('aria-pressed', TV.on ? 'true' : 'false'); } }
  function tstop() { var was = TV.on; TV.token++; TV.on = false; if (was && VO.ok) { try { window.speechSynthesis.cancel(); } catch (e) {} } tbtn(); }
  function tspeak(lines) {
    if (!lines || !lines.length || !voicesReady()) return false;
    try { window.speechSynthesis.cancel(); } catch (e) {}
    var tok = ++TV.token, i = 0; TV.on = true; tbtn();
    (function nextLine() {
      if (tok !== TV.token) return;
      if (i >= lines.length) { TV.on = false; tbtn(); return; }
      var line = lines[i], last = i === lines.length - 1, funny = /!|\?|\(/.test(line);
      var u = new window.SpeechSynthesisUtterance(cleanForSpeech(line));
      u.voice = VO.picked.narrator || VO.picked.guest; u.lang = u.voice && u.voice.lang || 'en-US';
      u.pitch = last ? 0.5 : funny ? 0.85 : 0.55; u.rate = last ? 0.8 : funny ? 1.02 : 0.84; u.volume = 1;
      var step = function () { if (tok !== TV.token) return; i++; setTimeout(nextLine, funny ? 220 : 520); };
      u.onend = step; u.onerror = step; VO.cur = u;
      try { window.speechSynthesis.speak(u); } catch (e) { TV.on = false; tbtn(); }
    })();
    return true;
  }

  // RECORDED VOICES: every line is recorded ahead of time (natural voices, one per character) in
  // /assets/audio/buddies/<episode>/<key>.mp3, listed in index.json. A line plays its recording through
  // Web Audio (reliable on phones once Play has been pressed); a line with no recording falls back to
  // the device's own speech, and then to captions only.
  var PLAYER_VER = '3 Oct · 1'; // shown under the player, so we can tell which version a browser has
  var REC = '2609c'; // bump whenever the recordings are redone, so no browser plays an old copy
  var CL = { base: '/assets/audio/buddies/', maps: {}, ready: {}, bufs: {}, got: {}, src: null, gain: null, token: 0, lastFx: -99 };
  function ckey(who, text) { var h = 0x811c9dc5, s = who + '|' + text; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }
  function clipMap(ep) {
    if (!CL.maps[ep]) CL.maps[ep] = fetch(CL.base + ep + '/index.json?v=' + REC, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (m) { CL.ready[ep] = m || false; return m; });
    return CL.maps[ep];
  }
  function clipBuf(ep, k) {
    var id = ep + '/' + k; if (CL.bufs[id]) return CL.bufs[id];
    var c = auEnsure(); if (!c) return Promise.resolve(null);
    CL.bufs[id] = fetch(CL.base + id + '.mp3?v=' + REC).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (ab) {
      if (!ab) return null;
      return new Promise(function (ok) { try { c.decodeAudioData(ab, ok, function () { ok(null); }); } catch (e) { ok(null); } });
    }).catch(function () { return null; }).then(function (buf) { CL.got[id] = buf; return buf; });
    return CL.bufs[id];
  }
  // little cartoon dog noises in each pup's own voice ("Arf!", "Hee hee!", "Aww…"), now and then before a line
  var FX = { up: ['arf', 'arfarf', 'ruff', 'yip', 'woof', 'laugh-1', 'laugh-2'], wow: ['ooh', 'arf', 'yip'], down: ['aww', 'mmm', 'hmm'], soft: ['mmm', 'sigh', 'yawn'] };
  var FX_MOOD = { happy: 'up', excited: 'up', silly: 'up', proud: 'up', surprised: 'wow', sad: 'down', worried: 'down', sleepy: 'soft', calm: 'soft' };
  function fxLoad() { ['tidbit', 'sugarfoot'].forEach(function (w) { Object.keys(FX).forEach(function (g) { FX[g].forEach(function (k) { clipBuf('fx', w + '-' + k); }); }); [1, 2, 3, 4].forEach(function (n) { clipBuf('fx', w + '-laugh-' + n); }); }); }
  // a real, recorded laugh when the story says a pup laughs (both of them: one, then the other joins in)
  function laughFor(who) {
    var c = AU.ctx; if (!c || c.state !== 'running') return;
    if (!CL.gain) { CL.gain = c.createGain(); CL.gain.gain.value = 1; CL.gain.connect(c.destination); }
    var list = who === 'both' ? ['tidbit', 'sugarfoot'] : [who];
    list.forEach(function (w, i) {
      var n = 1 + Math.floor(Math.random() * 4), buf = CL.got['fx/' + w + '-laugh-' + n] || CL.got['fx/' + w + '-laugh-1'];
      if (!buf) return;
      var s = c.createBufferSource(), g = c.createGain(); g.gain.value = i ? 0.8 : 0.9; s.buffer = buf; s.connect(g); g.connect(CL.gain);
      try { s.start(c.currentTime + 0.05 + i * 0.35); } catch (e) {}
      duck(true, (buf.duration + 0.4 + i * 0.35) * 1000 + 700);
    });
  }
  function fxPick(b, cb) {
    if (b.say !== 'tidbit' && b.say !== 'sugarfoot') return null;
    if (b.to === 'self' || (cb && cb.nearLaugh)) return null; // no noise on a murmur, or right next to a real laugh
    if (b.mood === 'worried' || b.mood === 'grumpy' || (b.energy || 1) >= 1.2 || /!\s*$/.test(b.text || '') && b.mood !== 'happy' && b.mood !== 'excited') return null;
    var g = FX_MOOD[b.mood]; if (!g) return null;
    var c = AU.ctx; if (!c || c.currentTime - CL.lastFx < 14) return null;
    if (Math.random() > (g === 'up' ? 0.18 : g === 'wow' ? 0.2 : 0.12)) return null; // now and then, so the talk keeps flowing
    var list = FX[g].filter(function (x) { return !/^laugh/.test(x); }); if (!list.length) return null;
    var k = list[Math.floor(Math.random() * list.length)], buf = CL.got['fx/' + b.say + '-' + k];
    if (!buf || buf.duration > 0.9) return null; // only a quick little sound, so the line isn't kept waiting
    CL.lastFx = c.currentTime; return buf;
  }
  function clipHas(ep, b) { var m = CL.ready[ep]; return !!(m && m[ckey(b.say, b.text)]); }
  function clipPrefetch(ep, list, from, n) { for (var i = from, got = 0; i < list.length && got < n; i++) if (clipHas(ep, list[i])) { clipBuf(ep, ckey(list[i].say, list[i].text)); got++; } }
  function cstop() {
    CL.token++;
    if (CL.src) { var c = AU.ctx, s0 = CL.src, g0 = CL.srcG; try { s0.onended = null; if (c && g0) { g0.gain.setTargetAtTime(0.0001, c.currentTime, 0.03); s0.stop(c.currentTime + 0.15); } else s0.stop(); } catch (e) {} CL.src = null; CL.srcG = null; }
  }
  function cspeak(ep, b, cb) {
    if (!clipHas(ep, b)) return false;
    var c = auEnsure(); if (!c) return false;
    if (!CL.gain) { CL.gain = c.createGain(); CL.gain.gain.value = 1; CL.gain.connect(c.destination); }
    VO.token++; if (VO.ok) { try { window.speechSynthesis.cancel(); } catch (e) {} }
    cstop(); var tok = CL.token;
    clipBuf(ep, ckey(b.say, b.text)).then(function (buf) {
      if (tok !== CL.token) return;
      if (!buf) { cb(false); return; }
      var fx = fxPick(b, cb), at = c.currentTime + 0.03;
      if (fx) { var f = c.createBufferSource(), fg = c.createGain(); fg.gain.value = MIX.fx; f.buffer = fx; f.connect(fg); fg.connect(CL.gain); try { f.start(at); } catch (e) {} at += fx.duration + 0.12; }
      var s = c.createBufferSource(), sg = c.createGain(); s.buffer = buf; s.connect(sg); sg.connect(CL.gain);
      sg.gain.setValueAtTime(0.0001, at); sg.gain.linearRampToValueAtTime(1, at + 0.012); // a soft start
      sg.gain.setValueAtTime(1, at + Math.max(0.02, buf.duration - 0.03)); sg.gain.linearRampToValueAtTime(0.0001, at + buf.duration); // and a soft end
      CL.srcG = sg;
      if (cb.start) cb.start(at - c.currentTime, buf.duration);
      var wm = CL.ready[ep] && CL.ready[ep][ckey(b.say, b.text)];
      CL.cur = { key: ckey(b.say, b.text), at: at, dur: buf.duration, words: wm && wm[1] || null, done: false };
      var cur = CL.cur;
      s.onended = function () { cur.done = true; if (tok !== CL.token) return; CL.src = null; cb(true); };
      CL.src = s; try { s.start(at); } catch (e) { cb(false); }
      var dur = buf.duration + (at - c.currentTime); duck(true, dur * 1000 + 900); // everything else steps back while she talks
    });
    return true;
  }

  // =====================================================================================================
  // LOADING episode files (each one is a small script that fills TOLBuddies.episodes)
  // =====================================================================================================
  var BASE = '/assets/js/buddies/', loading = {};
  function loadEpisode(id) {
    if (B.episodes[id]) return Promise.resolve(B.episodes[id]);
    if (loading[id]) return loading[id];
    loading[id] = new Promise(function (ok) {
      if (!/^s\d+e\d+$/.test(id)) { ok(null); return; }
      var sc = document.createElement('script'); sc.src = BASE + id + '.js';
      sc.onload = function () { ok(B.episodes[id] || null); }; sc.onerror = function () { ok(null); };
      document.head.appendChild(sc);
    });
    return loading[id];
  }
  function loadAll() { return Promise.all(catalogIds().map(loadEpisode)); }
  function nextIdOf(id) { var ids = catalogIds(), i = ids.indexOf(id); return i >= 0 && i + 1 < ids.length ? ids[i + 1] : null; }
  function fmt(t) { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2); }
  function mins(t) { return Math.round(t / 60) + ' min'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // =====================================================================================================
  // THE PLAYER (the /frequency-buddies.html page)
  // =====================================================================================================
  var KEY = 'tol-buddies-v1';
  // each episode as a video to download and watch offline (sizes in MB)
  var DOWNLOADS = { s1e1: 19, s1e2: 20, s1e3: 18, s1e4: 19, s1e5: 17 };
  function memGet() { try { var o = JSON.parse(localStorage.getItem(KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
  function memSet(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* private mode: fine */ } }
  var CSS = '' +
    '.fb-player{position:relative;display:flex;flex-direction:column;gap:.55rem;padding:.75rem;border-radius:26px;background:linear-gradient(170deg,#241C38,#1B1629);color:#FFF6E6;box-shadow:0 18px 50px rgba(30,20,50,.28);font-family:Lora,Georgia,serif}' +
    '.fb-head{display:flex;align-items:baseline;justify-content:space-between;gap:.6rem;flex-wrap:wrap;padding:0 .3rem}' +
    '.fb-head h2{margin:0;font:600 1.25rem/1.2 Fraunces,Georgia,serif;color:#FFF3D6}' +
    '.fb-chap{margin:0;font:500 .8rem/1.3 "IBM Plex Mono",monospace;letter-spacing:.05em;text-transform:uppercase;color:#D9C8F0}' +
    '.fb-stage{position:relative;width:100%;aspect-ratio:16/9;border-radius:18px;overflow:hidden;background:#2E2A5C}' +
    '.fb-player.is-stream{position:fixed;inset:0;z-index:2147483000;padding:0;gap:0;border-radius:0;background:#000;box-shadow:none}' +
    '.fb-player.is-stream .fb-head,.fb-player.is-stream .fb-ctrl,.fb-player.is-stream .fb-prog,.fb-player.is-stream .fb-chaps,.fb-player.is-stream .fb-note,.fb-player.is-stream .fb-skip,.fb-player.is-stream .fb-ov{display:none!important}' +
    '.fb-player.is-stream .fb-stage{position:absolute;inset:0;width:100%;height:100%;aspect-ratio:auto;border-radius:0}' +
    '.fb-player.is-stream .fb-cap{position:absolute;left:50%;bottom:2.6vh;transform:translateX(-50%);z-index:5;width:auto;max-width:74vw;min-height:0!important;height:auto!important;margin:0;padding:.35em .9em .45em;border-radius:14px;background:rgba(20,14,32,.72);font-size:clamp(14px,1.75vw,32px);line-height:1.3;text-align:center}' +
    '.fb-player.is-stream .fb-cap .fb-who{font-size:.5em;margin-bottom:.15em}.fb-player.is-stream .fb-stage,.fb-player.is-stream .fb-cv{border-radius:0!important}' +
    '.fb-player.is-stream .fb-cap.is-empty{display:none}' +
    'html.fb-streaming,html.fb-streaming body{overflow:hidden!important;background:#000!important;filter:none!important}' +
    'html.fb-streaming body > :not(main):not(script){display:none!important}' +
    'html.fb-watching iframe.tol-garden-bg,html.fb-watching .tol-garden-veil{display:none!important}' +
    '.fb-skip{position:absolute;right:.7rem;bottom:.7rem;z-index:3;padding:.45rem .85rem;border-radius:999px;border:1.5px solid rgba(255,255,255,.7);background:rgba(30,22,46,.72);color:#FFF6E6;font:600 .85rem/1 "IBM Plex Mono",monospace;cursor:pointer}.fb-skip[hidden]{display:none}.fb-skip:hover,.fb-skip:focus-visible{background:rgba(30,22,46,.92)}' +
    '@media (max-width:600px){.fb-stage{aspect-ratio:1/1;max-height:62vh}.fb-player{padding:.5rem;border-radius:20px}}' +
    '.fb-cv{position:absolute;left:0;top:0;width:100%;height:100%;display:block;cursor:pointer}' +
    '.fb-player .fb-cap{margin:0;max-width:none;width:100%;box-sizing:border-box;min-height:4.1em;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:.55rem .9rem;border-radius:14px;background:rgba(0,0,0,.34);text-align:center;font:500 1.14rem/1.4 Fraunces,Georgia,serif;color:#FFFDF6;text-wrap:balance}' +
    '.fb-cap .fb-who{display:block;font:600 .78rem/1.3 "IBM Plex Mono",monospace;letter-spacing:.06em;text-transform:uppercase;margin-bottom:.1rem}' +
    '.fb-cap[data-who="tidbit"] .fb-who{color:#FFC48A}.fb-cap[data-who="sugarfoot"] .fb-who{color:#D7C4FF}.fb-cap[data-who="narrator"] .fb-who{color:#BFE3D6}.fb-cap .fb-who.is-guest{color:#FFE08A}' +
    '.fb-cap[data-who="narrator"] .fb-line,.fb-cap[data-who="scene"] .fb-line,.fb-cap.is-self .fb-line{font-style:italic}.fb-cap.is-self .fb-line{opacity:.88}' +
    '.fb-line span{transition:opacity .12s linear}.fb-line .fb-soon{opacity:.42}@media (prefers-reduced-motion:reduce){.fb-line span{transition:none}}' +
    '@media (max-width:600px){.fb-cap{font-size:1.02rem;min-height:4.6em;padding:.45rem .6rem}}' +
    '.fb-prog{display:flex;align-items:center;gap:.7rem;padding:0 .2rem}' +
    '.fb-track{position:relative;flex:1;height:10px;border-radius:99px;background:rgba(255,255,255,.16);cursor:pointer;touch-action:none}' +
    '.fb-track:focus-visible{outline:3px solid #C9B6F2;outline-offset:4px}' +
    '.fb-fill{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:linear-gradient(90deg,#F7C98B,#F2A0B8)}' +
    '.fb-tick{position:absolute;top:-3px;width:2px;height:16px;border-radius:2px;background:rgba(255,255,255,.55)}' +
    '.fb-time{flex:none;font:500 .82rem "IBM Plex Mono",monospace;color:#E6DDF6;min-width:6.6em;text-align:right}' +
    '.fb-ctrl{display:flex;align-items:center;gap:.45rem;flex-wrap:wrap}' +
    '.fb-b{min-height:44px;min-width:44px;padding:.35rem .8rem;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#FFF6E6;font:600 .95rem/1.1 Lora,Georgia,serif;cursor:pointer;touch-action:manipulation}' +
    '.fb-b:hover{background:rgba(255,255,255,.16)}.fb-b:focus-visible{outline:3px solid #C9B6F2;outline-offset:2px}' +
    '.fb-b.is-main{background:#FFF3D6;color:#2B2140;border-color:#FFF3D6;min-width:7.2em}' +
    '.fb-b .fb-st{display:inline-block;margin-left:.15rem;padding:.08rem .5rem;border-radius:999px;font:700 .72rem/1.3 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.06em;text-transform:uppercase;background:rgba(255,255,255,.14);color:#D9D2E6}' +
    '.fb-b[aria-pressed="true"]{background:rgba(142,221,166,.16);border-color:#8EDDA6;box-shadow:0 0 0 2px rgba(142,221,166,.22)}.fb-b[aria-pressed="true"] .fb-st{background:#8EDDA6;color:#16331F}' +
    '.fb-b[aria-pressed="false"]{border-style:dashed;border-color:rgba(255,255,255,.35);color:#CFC7DC}' +
    '.fb-sp{flex:1}' +
    '.fb-tap{position:absolute;inset:0;z-index:4;pointer-events:none;transition:opacity .35s}' +
    '.fb-tap-b{position:absolute;pointer-events:auto;display:grid;place-items:center;border:2px solid rgba(255,255,255,.75);background:rgba(20,14,32,.62);color:#FFF6E6;cursor:pointer;border-radius:999px;font:600 1.2rem/1 system-ui,sans-serif;width:52px;height:52px;padding:0}' +
    '.fb-tap-play{left:50%;top:50%;width:84px;height:84px;margin:-42px 0 0 -42px;font-size:2rem}' +
    '.fb-tap-re{left:.7rem;top:.7rem}.fb-tap-full{right:.7rem;top:.7rem}' +
    '.fb-tap-b:focus-visible{outline:3px solid #F7C98B;outline-offset:2px}' +
    '.fb-player.is-idle .fb-tap{opacity:0}.fb-player.is-idle .fb-tap-b{pointer-events:none}.fb-player.is-idle .fb-stage{cursor:none}' +
    '.fb-stage:has(.fb-ov:not([hidden])) .fb-tap{display:none}' +
    '.fb-under{display:flex;flex-wrap:wrap;gap:.5rem;margin:.6rem 0 0}.fb-under .fb-b{text-decoration:none}.fb-player a.fb-b,.fb-player a.fb-b:visited{color:#FFF6E6}.fb-player a.fb-b.is-main,.fb-player a.fb-b.is-main:visited{color:#2B2140}.fb-player a.fb-b:hover{color:#FFFFFF}.fb-player a.fb-dl{display:inline-flex;align-items:center;background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.45)}.fb-player a.fb-dl[hidden]{display:none}.fb-player:fullscreen .fb-under,.fb-player.is-full .fb-under,.fb-player.is-stream .fb-under{display:none}' +
    '@media (max-width:600px){.fb-ctrl .fb-full .fb-lbl{display:none}.fb-b{padding:.35rem .65rem}.fb-sp{flex-basis:100%;height:0}}' +
    '.fb-ovc .fb-cn{margin:.1rem auto .75rem;padding:.55rem .75rem;border-radius:12px;background:rgba(255,255,255,.1);border-left:3px solid #BFE3D6;text-align:left;font-size:.92rem;line-height:1.45;color:#F2EAFB}' +
    '.fb-ovc .fb-cn b{color:#CDEFE2}' +
    '@media (max-width:600px){.fb-ovc .fb-cn{font-size:.86rem;padding:.45rem .6rem;margin-bottom:.5rem}}' +
    '.fb-season .fb-cards > li{display:flex;flex-direction:column;align-items:flex-start}.fb-season .fb-cards > li > .fb-card{flex:1 1 auto;height:auto}' +
    '@media (max-width:600px){.fb-ov{padding:.6rem}.fb-ovc h3{margin-bottom:.2rem}.fb-ovc{display:flex;flex-direction:column}.fb-ovc .fb-row{order:2;margin-bottom:.55rem}.fb-ovc .fb-cn{order:3}}' +
    '.fb-one{display:inline-block;margin:.45rem .2rem 0;font-size:.88rem;color:#FFE08A !important;text-decoration:underline;text-underline-offset:3px}' +
    '.fb-chaps{margin:0;padding:0 .2rem}.fb-chaps ol{list-style:none;margin:.3rem 0 0;padding:0;display:flex;flex-wrap:wrap;gap:.35rem}' +
    '.fb-chaps h3{margin:.2rem 0 0;font:600 .8rem/1.3 "IBM Plex Mono",monospace;letter-spacing:.06em;text-transform:uppercase;color:#D9C8F0}' +
    '.fb-chaps button{min-height:40px;padding:.3rem .75rem;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:transparent;color:#F2EAFB;font:500 .86rem/1.2 Lora,Georgia,serif;cursor:pointer}' +
    '.fb-chaps button[aria-current="true"]{background:rgba(247,201,139,.2);border-color:#F7C98B;color:#FFF3D6}' +
    '.fb-chaps button:focus-visible{outline:3px solid #C9B6F2;outline-offset:2px}' +
    '.fb-ov{position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:flex-start;padding:1rem;background:linear-gradient(180deg,rgba(24,18,40,.35),rgba(24,18,40,.78));text-align:center;overflow:auto}' +
    '.fb-ov[hidden]{display:none}' +
    '.fb-ovc{max-width:34rem;margin:auto}.fb-ovc h3{margin:0 0 .3rem;font:600 clamp(1.2rem,4vw,1.8rem)/1.15 Fraunces,Georgia,serif;color:#FFF3D6}' +
    '.fb-ovc p{margin:.2rem auto .7rem;color:#F2EAFB;font-size:.98rem;line-height:1.45}' +
    '.fb-ovc .fb-k{font:500 .75rem/1.3 "IBM Plex Mono",monospace;letter-spacing:.08em;text-transform:uppercase;color:#F7C98B;margin:0 0 .3rem}' +
    '.fb-ovc .fb-row{display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap}' +
    '.fb-ovc .fb-next{margin:.6rem auto .9rem;padding:.7rem .9rem;border-radius:16px;background:rgba(255,255,255,.1);border:1px dashed rgba(255,255,255,.3)}' +
    '.fb-ovc .fb-next b{display:block;color:#FFE08A;font:600 .78rem/1.3 "IBM Plex Mono",monospace;letter-spacing:.06em;text-transform:uppercase}' +
    '.fb-ovc .fb-trailer{margin:.45rem 0 .6rem;max-height:34vh;overflow-y:auto;text-align:left}' +
    '.fb-ovc .fb-trailer p{margin:.35rem 0;font:italic 500 .95rem/1.45 Fraunces,Georgia,serif}' +
    '.fb-ovc .fb-trailer p:first-child{color:#FFE08A;letter-spacing:.02em}' +
    '.fb-ovc .fb-trailer p:last-child{font-style:normal;font-weight:700;color:#FFE08A}' +
    '.fb-ovc a.fb-b{display:inline-flex;align-items:center;text-decoration:none}' +
    '@media (max-width:600px){.fb-ovc p{font-size:.88rem;margin-bottom:.45rem}.fb-ovc .fb-hide-s{display:none}}' +
    '.fb-note{margin:0;padding:0 .3rem;font-size:.8rem;color:#CFC3E4}' +
    // full screen: only the picture, filling the screen, with the caption as a subtitle on it and the tap controls
    '.fb-player.is-fs{position:fixed;inset:0;z-index:10050;border-radius:0;padding:0;gap:0;background:#000;box-shadow:none;overflow:hidden}' +
    '.fb-player.is-fs .fb-head,.fb-player.is-fs .fb-prog,.fb-player.is-fs .fb-ctrl,.fb-player.is-fs .fb-under,.fb-player.is-fs .fb-chaps,.fb-player.is-fs .fb-note{display:none!important}' +
    '.fb-player.is-fs .fb-stage{position:absolute;inset:0;width:100%;height:100%;max-height:none;aspect-ratio:auto;border-radius:0}.fb-player.is-fs .fb-cv{border-radius:0}' +
    '.fb-player.is-fs .fb-cap{position:absolute;left:50%;bottom:max(2.6vh,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:5;width:auto;max-width:min(64vw,54rem);min-height:0;margin:0;padding:.35em .9em .45em;border-radius:14px;background:rgba(20,14,32,.74);font-size:clamp(15px,2.1vw,34px);line-height:1.3;pointer-events:none}' +
    '.fb-player.is-fs .fb-cap .fb-who{font-size:.5em;margin-bottom:.15em}.fb-player.is-fs .fb-cap.is-empty{display:none}' +
    '@media (max-width:760px){.fb-player.is-fs .fb-cap{max-width:calc(100vw - 1.5rem);bottom:calc(max(8px,env(safe-area-inset-bottom)) + 2.9rem)}}' +
    '.fb-player.is-fs .fb-tap-re{left:max(.8rem,env(safe-area-inset-left));top:max(.8rem,env(safe-area-inset-top))}.fb-player.is-fs .fb-tap-full{right:max(.8rem,env(safe-area-inset-right));top:max(.8rem,env(safe-area-inset-top))}' +
    '.fb-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
    // the episode cards (the Frequency Journey page and the player page)
    '.fb-season{margin:0;padding:1.1rem;border-radius:26px;background:linear-gradient(160deg,#2A2244,#43315E 60%,#6B4A6E);color:#FFF6E6}' +
    '.fb-season-h{display:flex;align-items:center;gap:.8rem;margin:0 0 .9rem;flex-wrap:wrap}' +
    '.fb-season-h .fb-badge{display:inline-grid;place-items:center;padding:.3rem .7rem;border-radius:999px;background:#FFE08A;color:#2B2140;font:700 .78rem/1 "IBM Plex Mono",monospace;letter-spacing:.06em;text-transform:uppercase}' +
    '.fb-season-h h3{margin:0;font:600 1.2rem/1.2 Fraunces,Georgia,serif;color:#FFF3D6}' +
    '.fb-season .fb-cards{list-style:none;margin:0;padding:0;max-width:none;display:grid;gap:.8rem;grid-template-columns:1fr}' +
    '.fb-season .fb-cards > li{margin:0;padding:0;max-width:none}.fb-season .fb-cards > li::before{content:none}' +
    '@media (min-width:640px){.fb-season .fb-cards{grid-template-columns:1fr 1fr}.fb-season .fb-cards > li:first-child{grid-column:1 / -1}}' +
    '.fb-card{position:relative;width:100%;display:grid;grid-template-columns:auto 1fr;gap:.25rem .9rem;align-items:start;height:100%;box-sizing:border-box;padding:.8rem;border-radius:20px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);color:#FFF6E6 !important;text-decoration:none !important;transition:transform .2s,background .2s}' +
    'a.fb-card:hover{transform:translateY(-2px);background:rgba(255,255,255,.13)}a.fb-card:focus-visible{outline:3px solid #FFE08A;outline-offset:3px}' +
    '.fb-card canvas,.fb-card .fb-thumb{grid-row:span 5;width:132px;height:88px;border-radius:14px;background:linear-gradient(150deg,#6B5A9E,#F2A98C);display:grid;place-items:center;font-size:2.2rem}' +
    '@media (max-width:420px){.fb-card{grid-template-columns:1fr}.fb-card canvas,.fb-card .fb-thumb{grid-row:auto;width:100%;height:auto;aspect-ratio:16/9}}' +
    '.fb-card .fb-num{font:600 .74rem/1.3 "IBM Plex Mono",monospace;letter-spacing:.07em;text-transform:uppercase;color:#FFE08A}' +
    '.fb-card h4{margin:0;font:600 1.12rem/1.2 Fraunces,Georgia,serif;color:#FFFDF6}' +
    '.fb-card .fb-world{display:inline-block;justify-self:start;padding:.12rem .55rem;border-radius:999px;background:rgba(191,227,214,.18);color:#CDEFE2;font-size:.78rem;line-height:1.35}' +
    '.fb-card p{margin:0;font-size:.9rem;line-height:1.45;color:#EDE4F8}' +
    '.fb-card .fb-meta{font:500 .76rem/1.3 "IBM Plex Mono",monospace;color:#F7C98B}' +
    '.fb-card.is-soon{opacity:.72;border-style:dashed}.fb-card.is-soon .fb-meta{color:#D9C8F0}' +
    '.fb-card.is-now{border-color:#FFE08A;background:rgba(255,224,138,.12)}' +
    '.fb-season .fb-more{margin:.9rem 0 0;max-width:none;text-align:center;font-size:.86rem;color:#E6DDF6}';
  function injectCss() { if (document.querySelector('style[data-buddies]')) return; var st = document.createElement('style'); st.setAttribute('data-buddies', ''); st.textContent = CSS; document.head.appendChild(st); }

  function mount(host, opts) {
    opts = opts || {};
    injectCss();
    var q = {}; try { location.search.replace(/^\?/, '').split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); }); } catch (e) {}
    var rate = clamp(parseFloat(q.rate) || 1, 0.25, 32), mem = memGet();
    var shuffle = !!(opts.shuffle || q.shuffle === '1');
    var id = /^s\d+e\d+$/.test(q.ep || '') ? q.ep : shuffle ? shufflePick(null) : (opts.ep || mem.last || 's1e1');
    var P = { host: host, id: id, ep: null, stage: null, dir: null, raf: 0, last: 0, errors: 0, playing: false, started: false, voices: true, music: true, bright: false, one: false, oneCh: 0, oneFirst: q.one === '1', rate: rate, ch: 0 };
    host.classList.add('fb-player'); P.shuffle = shuffle; P.stream = !!(opts.stream || q.stream === '1');
    if (P.stream) { host.classList.add('is-stream'); document.documentElement.classList.add('fb-streaming'); P.voices = true; P.music = true; P.rate = 1; }
    host.innerHTML =
      '<div class="fb-head"><h2 class="fb-title">Frequency Buddies</h2><p class="fb-chap" aria-live="off"></p></div>' +
      '<div class="fb-stage"><canvas class="fb-cv" role="img" aria-label="An animated story with Tidbit and Sugarfoot"></canvas><button type="button" class="fb-skip" hidden>Skip intro ⏭</button>' +
      '<div class="fb-tap"><button type="button" class="fb-tap-b fb-tap-re" aria-label="Restart the episode from the beginning" title="Restart">↺</button><button type="button" class="fb-tap-b fb-tap-play" aria-label="Play">▶</button><button type="button" class="fb-tap-b fb-tap-full" aria-label="Full screen" title="Full screen">⛶</button></div>' +
      '<div class="fb-ov fb-start"><div class="fb-ovc"><p class="fb-k">Loading…</p></div></div><div class="fb-ov fb-end" hidden></div></div>' +
      '<p class="fb-cap" data-who=""><span class="fb-who"></span><span class="fb-line">Captions show here, always.</span></p>' +
      '<div class="fb-prog"><div class="fb-track" role="slider" tabindex="0" aria-label="Where you are in the episode" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="fb-fill"></div></div><span class="fb-time">0:00</span></div>' +
      '<div class="fb-ctrl">' +
        '<button type="button" class="fb-b fb-prev" aria-label="Previous chapter" title="Previous chapter (Left arrow)">⏮</button>' +
        '<button type="button" class="fb-b is-main fb-play" aria-label="Play" title="Play or pause (Space)">▶ Play</button>' +
        '<button type="button" class="fb-b fb-nextc" aria-label="Next chapter" title="Next chapter (Right arrow)">⏭</button>' +
        '<button type="button" class="fb-b fb-restart" aria-label="Restart the episode from the beginning" title="Restart the episode (R)">↺ Restart</button>' +
        '<span class="fb-sp"></span>' +
        '<button type="button" class="fb-b fb-full" aria-label="Full screen" title="Full screen (F)">⛶<span class="fb-lbl"> Full screen</span></button>' +
      '</div>' +
      '<div class="fb-under"><button type="button" class="fb-b fb-restart2">↺ Restart episode</button><a class="fb-b fb-dl" hidden>⬇ Download this episode</a></div>' +
      '<div class="fb-chaps"><h3>Chapters</h3><ol></ol></div>' +
      '<p class="fb-note">Space plays and pauses, the arrow keys move between chapters. Voices are recorded, and captions are always on. <span class="fb-ver">Player ' + PLAYER_VER + '</span></p>' +
      '<p class="fb-sr fb-live" aria-live="polite"></p>';
    var $ = function (s) { return host.querySelector(s); };
    var cv = $('.fb-cv'), g = cv.getContext('2d'), stageEl = $('.fb-stage'), capEl = $('.fb-cap'), whoEl = $('.fb-who'), lineEl = $('.fb-line'), fill = $('.fb-fill'), trackEl = $('.fb-track'), timeEl = $('.fb-time');
    var skipBtn = $('.fb-skip'), playBtn = $('.fb-play'), startOv = $('.fb-start'), endOv = $('.fb-end'), chapEl = $('.fb-chap'), live = $('.fb-live');
    var W = 0, H = 0, DPR = 1;
    function resize() {
      var r = stageEl.getBoundingClientRect(); DPR = Math.max(0.6, Math.min(2, window.devicePixelRatio || 1) * (P.q || 1)); // P.q: lowered on slow devices
      var w = Math.max(200, Math.round(r.width)), h = Math.max(120, Math.round(r.height));
      if (w * DPR !== W || h * DPR !== H) { W = Math.round(w * DPR); H = Math.round(h * DPR); cv.width = W; cv.height = H; if (P.stage) { P.stage.bgKey = ''; paint(0); } }
    }
    function paint(dt) { if (!P.stage || !W) return; try { P.stage.render(g, W, H, DPR, dt); } catch (e) { P.errors++; if (window.console) console.error('buddies render', e); } }
    function syncBtns() {
      playBtn.textContent = P.playing ? '❚❚ Pause' : '▶ Play'; playBtn.setAttribute('aria-label', P.playing ? 'Pause' : 'Play');
      var tp = host.querySelector('.fb-tap-play'); if (tp) { tp.textContent = P.playing ? '❚❚' : '▶'; tp.setAttribute('aria-label', P.playing ? 'Pause' : 'Play'); }
      if (typeof wakeTap === 'function') wakeTap(!P.playing);
      host.classList.toggle('is-playing', !!P.playing); // site.js keeps pop-ups and helpers away while this is on
      document.documentElement.classList.toggle('fb-watching', !!P.playing); // and the moving garden behind the page rests, so the show runs smoothly
      if (document.body) document.body.classList.toggle('tol-video-playing', !!P.playing); // site.css tucks the floating helpers away while it plays
      if (P.wasPlaying !== !!P.playing) { P.wasPlaying = !!P.playing; if (typeof dockNote === 'function') dockNote(); }
      var gf = document.querySelector('iframe.tol-garden-bg');
      if (gf && P.playing && !gf.__rest) { gf.__rest = gf.src; gf.src = 'about:blank'; } else if (gf && !P.playing && gf.__rest) { gf.src = gf.__rest; gf.__rest = null; }
    }
    function voiceOk() { return (VO.ok || CL.ready[P.id]) && P.rate === 1; }
    function save() { var m = memGet(); m.last = P.id; m.pos = m.pos || {}; m.pos[P.id] = { ch: P.ch }; delete m.voices; delete m.music; delete m.bright; memSet(m); } // (older saves could turn voices or music off; those switches are gone)
    function setCaption(who, text, b) {
      capEl.setAttribute('data-who', who || '');
      var nm = who === 'scene' ? '' : who === 'narrator' ? 'Narrator' : PALS[who] ? PALS[who].name : GUESTS[who] ? (P.stage && P.stage.guests[who] ? P.stage.guests[who].name : GUESTS[who].name) : '';
      // who she's talking to: herself, her pal, a guest, or everyone
      var to = b && b.to, toNm = '';
      if (to === 'self') toNm = 'to herself';
      else if (to === 'all') toNm = 'to everyone';
      else if (to === 'both') toNm = PALS[who] ? 'to both' : 'to Tidbit and Sugarfoot';
      else if (to && who !== 'narrator') toNm = 'to ' + (PALS[to] ? PALS[to].name : P.stage && P.stage.guests[to] ? P.stage.guests[to].name : GUESTS[to] ? GUESTS[to].name : to);
      whoEl.textContent = nm + (nm && toNm ? ' · ' + toNm : ''); whoEl.className = 'fb-who' + (GUESTS[who] ? ' is-guest' : '');
      capEl.classList.toggle('is-self', to === 'self'); if (P.rec && who !== 'scene') recCue(nm, text);
      lineEl.textContent = '';
      P.capWords = []; P.capLit = -1; P.capB = who !== 'scene' ? b : null;
      String(text || '').split(/(\s+)/).forEach(function (w) {
        if (!w) return; if (/^\s+$/.test(w)) { lineEl.appendChild(document.createTextNode(w)); return; }
        var sp = document.createElement('span'); sp.textContent = w; lineEl.appendChild(sp); P.capWords.push(sp);
      });
      P.capTimed = !!(b && who !== 'scene' && P.voices && P.rate === 1);
      capLight();
      if (!P.voices && text) live.textContent = (nm ? nm + (toNm ? ', ' + toNm : '') + ': ' : '') + text;
    }
    // the caption keeps pace with the voice: spoken words are bright, the rest wait a little dimmer
    function capLight() {
      var ws = P.capWords || []; if (!ws.length) return;
      var n = ws.length, lit = n;
      if (lit === P.capLit) return; P.capLit = lit;
      ws.forEach(function (sp, i) { sp.className = i < lit ? '' : 'fb-soon'; });
    }

    // ---------- THE THEME SONG ----------
    // Like a 90s sitcom: the opening plays before the episode (each pup gets her own verse, a name card and a
    // freeze-frame, then a montage of places for the chorus and the logo), and the rest of the song plays over
    // closing credits after it. Everything follows the song's own clock, so the pictures stay on the beat.
    // Lyric times come from the song file. Skippable; only when Music is on.
    var SONG = {
      open: { file: 'theme-open', base: 0, dur: 51.4, lyrics: [
        [4.07, 'both', 'Tune in, turn it up, here we go!'],
        [8.94, 'tidbit', 'Yo, it’s Tidbit, black mask, eyebrows tan,'], [11.33, 'tidbit', 'first one out the door with a big ol’ plan!'],
        [13.25, 'tidbit', 'Tail on spin, I’m a zoom-zoom pup,'], [14.92, 'tidbit', 'if the sky gets gray, I’m still lookin’ up!'],
        [16.6, 'sugarfoot', 'And I’m Sugarfoot, white paws, slow and sweet,'], [18.67, 'sugarfoot', 'I take my time with my four little feet.'],
        [20.43, 'sugarfoot', 'When it gets too loud, I take a breath,'], [22.42, 'sugarfoot', 'say what I feel, then I try my best!'],
        [24.34, 'both', 'Different, different, that’s okay,'], [27.29, 'both', 'we find the way together every day!'],
        [30.56, 'both', 'Frequency Buddies! (Ooh-ooh!)'], [34.07, 'both', 'Two pals, one big heart each!'], [39.1, 'both', 'Frequency Buddies! (Arf arf!)'],
        [41.41, 'both', 'Every frequency an adventure, you’ll see!'], [45.96, 'both', 'Turn it up, tune in, come along with me,'], [49.63, 'both', 'we’re the Frequency Buddies!']
      ] },
      close: { file: 'theme-close', base: 51.5, dur: 92.4, lyrics: [
        [52.66, 'tidbit', 'When I go fast…'], [54.45, 'sugarfoot', '…I go slow!'], [56.25, 'tidbit', 'When I say yes…'], [57.65, 'sugarfoot', '…I can say no!'],
        [59.04, 'both', 'When we mess up…'], [61.6, 'both', '…we say sorry!'], [64.15, 'both', 'Then we laugh and keep on runnin’ free!'],
        [70.29, 'both', 'Frequency Buddies! (Ooh-ooh!)'], [72.61, 'both', 'Two pals, one big heart each!'], [77.55, 'both', 'Frequency Buddies! (Arf arf!)'],
        [79.71, 'both', 'Every frequency an adventure, you’ll see!'], [87.05, 'both', 'See you next time, pals! (Arf!)']
      ] }
    };
    var TCOL = { tidbit: '#FF9F43', sugarfoot: '#B79CEB', both: '#F28AA8' };
    function themeCues(kind) {
      var S = P.stage, ep = P.ep || {};
      function scene(id, hour, weather) { var c = cv; if (c && S.scene !== 'blank') { S.transition(c, 'fade'); if (S.trans) S.trans.dur = 0.4; } S.applyScene({ scene: id, hour: hour, weather: weather || 'clear' }); S.title = null; }
      function at(t, u) { S.place({ tidbit: t, sugarfoot: u }, true); S.chars.tidbit.fx = S.chars.tidbit.face = t < u ? 1 : -1; S.chars.sugarfoot.fx = S.chars.sugarfoot.face = t < u ? -1 : 1; }
      function hide(id) { S.hidden = {}; if (id) S.hidden[id] = 1; }
      function act(who, name, o) { var b = { act: name, who: who }; for (var k in o || {}) b[k] = o[k]; S.beginAct(b); }
      function card(name, tag, col, top) { P.th.card = { name: name, tag: tag, col: col, t0: P.th.t, top: !!top, life: top ? 4.6 : 3.0 }; }
      function freeze(d, name, col) { P.th.freeze = { until: P.th.t + d, name: name, col: col, t0: P.th.t }; }
      function logo(big) { P.th.logo = { t0: P.th.t, big: !!big }; }
      function credit(a, b) { P.th.credit = { a: a, b: b, t0: P.th.t }; }
      if (kind === 'open') return [
        [0, function () { hide(null); S.applyScene({ scene: 'blank', hour: 12, weather: 'clear' }); S.showTitle(true); }],
        [4.07, function () { scene('backyard', 10); at(0.08, 0.2); act('both', 'run', { to: 0.5, dur: 2.4 }); }],
        [6.8, function () { act('both', 'wiggle'); }],
        [8.94, function () { scene('citypark', 11); hide('sugarfoot'); at(0.64, 0.98); S.chars.tidbit.fx = S.chars.tidbit.face = -1; act('tidbit', 'wiggle'); card('Tidbit', 'the one who goes first', TCOL.tidbit); }],
        [11.33, function () { act('tidbit', 'run', { to: 0.84, dur: 1.2 }); }],
        [12.6, function () { act('tidbit', 'run', { to: 0.62, dur: 1.0 }); }],
        [13.25, function () { act('tidbit', 'spin'); }],
        [14.92, function () { S.weather = 'rain'; act('tidbit', 'lookat', { target: 'up' }); }],
        [15.75, function () { S.weather = 'clear'; S.wx = []; act('tidbit', 'sparkle'); }],
        [15.95, function () { freeze(0.62, 'Tidbit', TCOL.tidbit); }],
        [16.6, function () { scene('meadow', 16); hide('tidbit'); at(0.02, 0.58); act('sugarfoot', 'walk', { to: 0.72, dur: 2 }); card('Sugarfoot', 'the one who takes her time', TCOL.sugarfoot); }],
        [18.67, function () { act('sugarfoot', 'wag'); }],
        [20.43, function () { act('sugarfoot', 'pause-breath', { dur: 1.9 }); }],
        [22.42, function () { act('sugarfoot', 'heart'); }],
        [23.65, function () { freeze(0.66, 'Sugarfoot', TCOL.sugarfoot); }],
        [24.34, function () { scene('beach', 17.5); hide(null); at(0.2, 0.8); act('tidbit', 'hop'); act('sugarfoot', 'sit'); }],
        [25.8, function () { act('tidbit', 'spin'); act('sugarfoot', 'wag'); }],
        [27.29, function () { act('both', 'walk', { to: 0.5, dur: 1.4 }); }],
        [28.8, function () { act('both', 'hug', { dur: 1.7 }); }],
        [30.56, function () { scene('carnival', 19); at(0.4, 0.6); act('both', 'wiggle'); logo(false); }],
        [32.3, function () { act('both', 'spin'); }],
        [34.07, function () { scene('snow', 12, 'snow'); at(0.4, 0.6); act('both', 'heart'); }],
        [36.5, function () { act('both', 'nuzzle', { dur: 2.2 }); }],
        [39.1, function () { scene('forest', 21, 'stars'); at(0.38, 0.62); act('both', 'jump'); logo(false); }],
        [41.41, function () { scene('treehouse', 15); at(0.2, 0.36); act('both', 'run', { to: 0.62, dur: 1.8 }); }],
        [43.6, function () { act('both', 'spin'); }],
        [45.96, function () { scene('rooftop', 20.8, 'stars'); at(0.38, 0.62); act('both', 'hop'); }],
        [47.8, function () { act('both', 'wiggle'); }],
        [49.63, function () { scene('backyard', 17); at(0.4, 0.6); act('both', 'jump'); logo(true); }]
      ];
      var guests = [], seen = {};
      (ep.chapters || []).forEach(function (c) { c.beats.forEach(function (b) { if (b.guest && !b.exit && !seen[b.guest]) { seen[b.guest] = 1; guests.push(b.name || (GUESTS[b.guest] && GUESTS[b.guest].name) || b.guest); } }); });
      return [
        [51.5, function () { hide(null); scene('backyard', 18.6); at(0.12, 0.88); credit('Frequency Buddies', 'Season ' + (ep.season || 1) + ' · Episode ' + (ep.number || 1) + ': ' + (ep.title || '')); }],
        [52.66, function () { act('tidbit', 'run', { to: 0.36, dur: 1.2 }); }],
        [54.45, function () { act('sugarfoot', 'walk', { to: 0.64, dur: 1.7 }); }],
        [56.25, function () { act('tidbit', 'hop'); }],
        [57.65, function () { act('sugarfoot', 'sit'); }],
        [59.04, function () { act('both', 'bow'); }],
        [61.6, function () { act('both', 'nuzzle', { dur: 2.2 }); }],
        [64.15, function () { act('both', 'laugh'); }],
        [66.4, function () { act('both', 'run', { to: 0.72, dur: 2.2 }); }],
        [70.29, function () { scene('citypark', 19); at(0.38, 0.6); act('both', 'wiggle'); credit('Starring', 'Tidbit as herself'); }],
        [72.61, function () { scene('beach', 18); at(0.38, 0.6); act('both', 'spin'); }],
        [74.4, function () { credit('and', 'Sugarfoot as herself'); }],
        [77.55, function () { scene('snow', 13, 'snow'); at(0.4, 0.6); act('both', 'heart'); credit(guests.length ? 'With special guests' : 'With', guests.length ? guests.slice(0, 5).join(', ') : 'all their friends'); }],
        [79.71, function () { scene('forest', 21, 'stars'); at(0.38, 0.62); act('both', 'jump'); }],
        [81.6, function () { credit('Theme song', '“Frequency Buddies”'); act('both', 'wiggle'); }],
        [84.3, function () { credit('Thank you for watching!', 'Two pals. One big heart each.'); act('both', 'spin'); }],
        [87.05, function () { scene('backyard', 20.2, 'stars'); at(0.42, 0.58); act('both', 'wag'); P.th.credit = null; card('See you next time, pals!', 'Arf!', TCOL.both, true); }],
        [89.6, function () { P.th.iris = { t0: P.th.t, dur: 2.5 }; }]
      ];
    }
    var themeBuf = {};
    function themeLoad(kind) {
      if (themeBuf[kind]) return themeBuf[kind];
      var c = auEnsure(); if (!c) return Promise.resolve(null);
      themeBuf[kind] = fetch(CL.base + SONG[kind].file + '.mp3?v=' + REC).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (ab) {
        if (!ab) return null;
        return new Promise(function (ok) { try { var pr = c.decodeAudioData(ab, ok, function () { ok(null); }); if (pr && pr.catch) pr.catch(function () { ok(null); }); } catch (e) { ok(null); } });
      }).catch(function () { return null; });
      return themeBuf[kind];
    }
    function themeWanted() { return (P.music || P.voices) && !!(window.AudioContext || window.webkitAudioContext); } // the theme is part of the show: it plays whenever any sound is on
    function songCap(who, text) {
      capEl.setAttribute('data-who', who === 'both' ? 'tidbit' : who); P.capB = null; P.capWords = [];
      whoEl.textContent = '♪ ' + (who === 'tidbit' ? 'Tidbit' : who === 'sugarfoot' ? 'Sugarfoot' : 'Tidbit and Sugarfoot'); whoEl.className = 'fb-who';
      lineEl.textContent = text; if (P.rec) recCue(who === 'tidbit' ? 'Tidbit' : who === 'sugarfoot' ? 'Sugarfoot' : 'Tidbit and Sugarfoot', '♪ ' + text + ' ♪');
    }
    function startTheme(kind, done) {
      if (!themeWanted()) { done(); return; }
      var c = auEnsure(); auOn(true); auPause(false);
      themeLoad(kind).then(function (buf) {
        if (!buf || !P.stage || P.th) { done(); return; }
        vstop(); P.stage.stopTalk(); auMood('none'); auAmbience('blank', 'clear', 12);
        var S0 = SONG[kind], g0 = c.createGain(); g0.gain.value = 1; g0.connect(AU.bus || c.destination);
        var src = c.createBufferSource(); src.buffer = buf; src.connect(g0);
        var t0 = c.currentTime + 0.06; src.start(t0);
        P.th = { kind: kind, song: S0, at: t0, src: src, gain: g0, t: S0.base, cues: themeCues(kind), ci: 0, li: 0, done: done };
        skipBtn.textContent = kind === 'open' ? 'Skip intro ⏭' : 'Skip credits ⏭'; skipBtn.hidden = false;
        lineEl.textContent = ''; whoEl.textContent = '';
        live.textContent = kind === 'open' ? 'The Frequency Buddies theme song.' : 'Closing credits and the theme song.';
        P.playing = true; syncBtns(); startLoop();
      });
    }
    function endTheme(run) {
      var th = P.th; if (!th) return; P.th = null;
      try { var c = AU.ctx, tt = c.currentTime; th.gain.gain.setValueAtTime(th.gain.gain.value, tt); th.gain.gain.linearRampToValueAtTime(0.0001, tt + 0.35); th.src.stop(tt + 0.4); } catch (e) {}
      skipBtn.hidden = true; if (P.stage) P.stage.hidden = null; lineEl.textContent = ''; whoEl.textContent = '';
      if (run) th.done();
    }
    function themeTick(dt) {
      var th = P.th, c = AU.ctx; if (!th || !c) return;
      th.t = th.manual != null ? th.manual : th.song.base + Math.max(0, c.currentTime - th.at);
      while (th.ci < th.cues.length && th.cues[th.ci][0] <= th.t) { try { th.cues[th.ci][1](); } catch (e) { P.errors++; } th.ci++; }
      var L = th.song.lyrics;
      while (th.li < L.length && L[th.li][0] <= th.t) {
        var ly = L[th.li], nx = L[th.li + 1], len = (nx ? nx[0] : th.song.dur) - ly[0];
        songCap(ly[1], ly[2]);
        (ly[1] === 'both' ? ['tidbit', 'sugarfoot'] : [ly[1]]).forEach(function (id) { var ch = P.stage.get(id); if (ch) { ch.talk = 1; ch.talkFrom = 0; ch.talkUntil = P.stage.t + Math.max(0.6, len - 0.25); } });
        th.li++;
      }
      if (!(th.freeze && th.t < th.freeze.until)) P.stage.step(dt); // a freeze-frame holds the picture
      paint(dt); drawTheme(g, W, H, DPR, th);
      if (th.t >= th.song.dur) endTheme(true);
    }
    // the 90s touches, drawn over the picture
    function outlined(g, text, x, y, size, fill, dpr, align) {
      g.font = 'italic 800 ' + size + 'px ' + 'Fraunces, Georgia, serif'; g.textAlign = align || 'left'; g.textBaseline = 'middle';
      g.lineJoin = 'round'; g.lineWidth = Math.max(3, size * 0.14); g.strokeStyle = '#2E2346'; g.strokeText(text, x, y);
      g.fillStyle = fill; g.fillText(text, x, y);
    }
    function drawTheme(g, W, H, dpr, th) {
      var t = th.t, k = Math.min(W, H * 16 / 9) / 820, still = P.stage && P.stage.reduced;
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      if (th.freeze && t < th.freeze.until + 0.15) { // freeze-frame: a colored wash, a snapshot border and her name, big
        var fz = th.freeze, fa = Math.min(1, (t - fz.t0) / 0.12) * Math.min(1, (fz.until + 0.15 - t) / 0.15);
        g.globalAlpha = 0.3 * fa; g.fillStyle = fz.col; g.fillRect(0, 0, W, H);
        g.globalAlpha = fa; g.strokeStyle = '#FFFDF8'; g.lineWidth = 10 * k; g.strokeRect(12 * k, 12 * k, W - 24 * k, H - 24 * k);
        g.save(); g.translate(W * 0.5, H * 0.3); g.rotate(-0.05); outlined(g, fz.name.toUpperCase(), 0, 0, 74 * k, '#FFF3D6', dpr, 'center'); g.restore();
      }
      if (th.card) { // the name card slides in, tilted, like a 90s opening
        var cd = th.card, u = t - cd.t0, life = cd.life || 3.0;
        if (u > life + 0.4) th.card = null;
        else {
          var inn = Math.min(1, u / 0.35), out = Math.max(0, (u - life) / 0.4), e = 1 - Math.pow(1 - inn, 3), x = W * 0.05 - (1 - e) * W * 0.6 - out * W * 0.6, y = cd.top ? H * 0.2 : H * 0.74;
          g.save(); g.translate(x, y); g.rotate(-0.06);
          g.font = 'italic 800 ' + (46 * k) + 'px Fraunces, Georgia, serif'; var nw = g.measureText(cd.name).width;
          g.fillStyle = '#2E2346'; g.fillRect(8 * k, -34 * k + 8 * k, nw + 44 * k, 68 * k);
          g.fillStyle = cd.col; g.fillRect(0, -34 * k, nw + 44 * k, 68 * k);
          outlined(g, cd.name, 22 * k, 0, 46 * k, '#FFFFFF', dpr);
          g.font = '600 ' + (15 * k) + 'px "IBM Plex Mono", monospace'; var tw = g.measureText(cd.tag.toUpperCase()).width;
          g.fillStyle = '#FFFDF8'; g.fillRect(22 * k, 40 * k, tw + 20 * k, 26 * k); g.fillStyle = '#2E2346'; g.textAlign = 'left'; g.fillText(cd.tag.toUpperCase(), 32 * k, 53 * k);
          g.restore();
        }
      }
      if (th.logo) { // the show's name pops in on the beat
        var lg = th.logo, lu = t - lg.t0, life2 = lg.big ? 99 : 2.6;
        if (lu > life2) th.logo = null;
        else {
          var pop = still ? 1 : 1 + 0.18 * Math.exp(-lu * 6) * Math.cos(lu * 18), la = Math.min(1, lu / 0.2) * Math.min(1, (life2 - lu) / 0.4);
          g.globalAlpha = la; g.save(); g.translate(W / 2, lg.big ? H * 0.16 : H * 0.17); g.scale(pop, pop); g.rotate(-0.03);
          var sz = (lg.big ? 62 : 50) * k, grd = g.createLinearGradient(0, -sz / 2, 0, sz / 2); grd.addColorStop(0, '#FFE08A'); grd.addColorStop(1, '#F28AA8');
          outlined(g, 'Frequency Buddies', 0, 0, sz, grd, dpr, 'center');
          if (lg.big && P.ep) {
            g.font = '600 ' + (16 * k) + 'px "IBM Plex Mono", monospace'; g.textAlign = 'center'; g.fillStyle = '#FFFDF8'; g.strokeStyle = '#2E2346'; g.lineWidth = 4 * k;
            var l1 = ('Season ' + (P.ep.season || 1) + ' · Episode ' + (P.ep.number || 1)).toUpperCase(); g.strokeText(l1, 0, sz * 0.8); g.fillText(l1, 0, sz * 0.8);
            outlined(g, P.ep.title || '', 0, sz * 1.35, 26 * k, '#FFFFFF', dpr, 'center');
          }
          g.restore(); g.globalAlpha = 1;
        }
      }
      if (th.credit) { // closing credits, one card at a time
        var cr = th.credit, cu = t - cr.t0, ca = Math.min(1, cu / 0.4);
        g.globalAlpha = ca; var bw = Math.min(W * 0.8, 520 * k), bh = 84 * k, bx = (W - bw) / 2, by = H * 0.06;
        g.fillStyle = 'rgba(30,22,46,.72)'; if (g.roundRect) { g.beginPath(); g.roundRect(bx, by, bw, bh, 16 * k); g.fill(); } else g.fillRect(bx, by, bw, bh);
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#F7C98B'; g.font = '600 ' + (14 * k) + 'px "IBM Plex Mono", monospace'; g.fillText(cr.a.toUpperCase(), W / 2, by + 26 * k);
        g.fillStyle = '#FFF6E6'; g.font = 'italic 600 ' + (26 * k) + 'px Fraunces, Georgia, serif'; g.fillText(cr.b, W / 2, by + 58 * k, bw - 24 * k);
        g.globalAlpha = 1;
      }
      if (th.iris) { // the classic circle close, on the pals
        var ir = th.iris, q = Math.min(1, (t - ir.t0) / ir.dur), T1 = P.stage.chars.tidbit.headPx, T2 = P.stage.chars.sugarfoot.headPx;
        var cx = T1 && T2 ? (T1.x + T2.x) / 2 : W / 2, cy = T1 && T2 ? (T1.y + T2.y) / 2 + 20 * k : H / 2, r = Math.max(0, (1 - q * q) * Math.hypot(W, H));
        g.fillStyle = '#120D1C'; g.beginPath(); g.rect(0, 0, W, H); g.arc(cx, cy, r, 0, Math.PI * 2, true); g.fill('evenodd');
      }
      g.restore();
    }

    // ---------- another episode, in place (shuffle), without reloading the page ----------
    function switchTo(id, autoplay) {
      if (!id) return;
      if (P.th) endTheme(false); P.playing = false; if (P.dir) P.dir.playing = false; vstop(); if (P.stage) P.stage.stopTalk(); stopLoop(); syncBtns();
      P.id = id; P.introDone = false; live.textContent = 'Up next: ' + ((catalogEntry(id) || {}).title || 'another episode');
      loadEpisode(id).then(function (ep) {
        if (!ep) { var nx = shufflePick(id); if (nx && nx !== id) switchTo(nx, autoplay); return; }
        ready(ep); if (opts.onSwitch) opts.onSwitch(ep);
        if (autoplay) setTimeout(function () { P.introDone = false; P.dir.seek(0); play(); }, 1200);
      });
    }
    // ---------- recording an episode as a video, in this browser (for YouTube) ----------
    // The picture is the stage, drawn into a 1920×1080 frame; the sound is everything the player plays.
    // Captions are written down as they appear, for an .srt file YouTube can use as closed captions.
    function recSupported() { return !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream && (window.AudioContext || window.webkitAudioContext)); }
    function recMime() { var t = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4;codecs=avc1,mp4a', 'video/mp4']; for (var i = 0; i < t.length; i++) if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t[i])) return t[i]; return ''; }
    function recStart(o) {
      o = o || {};
      if (!recSupported()) { if (o.onError) o.onError('This browser can’t record video. Try Chrome, Edge or Firefox on a computer.'); return false; }
      if (P.rec) return false;
      var c = auEnsure(); if (!c) return false;
      if (!P.music) { P.music = true; auOn(true); } if (!P.voices) P.voices = true; P.rate = 1; syncBtns(); save();
      if (!CL.gain) { CL.gain = c.createGain(); CL.gain.gain.value = 1; CL.gain.connect(c.destination); }
      var dest = c.createMediaStreamDestination(); AU.bus.connect(dest); CL.gain.connect(dest);
      var RW = o.width || 1920, RH = o.height || 1080;
      var rc = document.createElement('canvas'); rc.width = RW; rc.height = RH; var rg = rc.getContext('2d');
      rg.fillStyle = '#1B1629'; rg.fillRect(0, 0, RW, RH);
      var stream = rc.captureStream(30); dest.stream.getAudioTracks().forEach(function (t) { stream.addTrack(t); });
      var mime = recMime(), mr;
      try { mr = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: o.bitrate || 6e6, audioBitsPerSecond: 160000 } : {}); } catch (e) { if (o.onError) o.onError('Recording couldn’t start in this browser.'); return false; }
      P.rec = { mr: mr, chunks: [], canvas: rc, g: rg, dest: dest, t0: 0, cues: [], mime: mr.mimeType || mime || 'video/webm', o: o, id: P.id, title: P.ep ? P.ep.title : '' };
      mr.ondataavailable = function (e) { if (e.data && e.data.size) P.rec.chunks.push(e.data); };
      mr.onstop = function () { recFinish(); };
      if (P.th) endTheme(false); // start clean, from the very beginning
      P.introDone = false; P.dir.seek(0); P.ch = 0; renderChapter();
      recFrame(); mr.start(1000); P.rec.t0 = performance.now();
      play();
      return true;
    }
    function recFrame() {
      var r = P.rec; if (!r || !cv.width) return; var RW = r.canvas.width, RH = r.canvas.height, k = Math.min(RW / cv.width, RH / cv.height), w = cv.width * k, h = cv.height * k;
      r.g.fillStyle = '#1B1629'; r.g.fillRect(0, 0, RW, RH); r.g.drawImage(cv, (RW - w) / 2, (RH - h) / 2, w, h);
      var txt = lineEl.textContent, who = whoEl.textContent;
      if (r.o.captions && txt) { // captions in the picture, like the stream view
        var g2 = r.g, fs = Math.round(RH * 0.034), pad = fs * 0.55; g2.save(); g2.font = '500 ' + fs + 'px Lora, Georgia, serif';
        var words = txt.split(' '), lines = [], cur2 = '', maxW = RW * 0.7;
        words.forEach(function (wd) { var tt = cur2 ? cur2 + ' ' + wd : wd; if (g2.measureText(tt).width > maxW && cur2) { lines.push(cur2); cur2 = wd; } else cur2 = tt; }); if (cur2) lines.push(cur2);
        var bw = Math.max.apply(null, lines.map(function (l) { return g2.measureText(l).width; })) + pad * 2, lh = fs * 1.3, bh = lines.length * lh + pad * 1.4 + (who ? fs * 0.8 : 0), bx = (RW - bw) / 2, by = RH - bh - RH * 0.03;
        g2.fillStyle = 'rgba(20,14,32,.74)'; if (g2.roundRect) { g2.beginPath(); g2.roundRect(bx, by, bw, bh, fs * 0.5); g2.fill(); } else g2.fillRect(bx, by, bw, bh);
        g2.textAlign = 'center'; g2.textBaseline = 'top'; var y = by + pad * 0.7;
        if (who) { g2.font = '600 ' + Math.round(fs * 0.5) + 'px "IBM Plex Mono", monospace'; g2.fillStyle = '#F7C98B'; g2.fillText(who.toUpperCase(), RW / 2, y); y += fs * 0.8; }
        g2.font = '500 ' + fs + 'px Lora, Georgia, serif'; g2.fillStyle = '#FFF6E6'; lines.forEach(function (l) { g2.fillText(l, RW / 2, y); y += lh; });
        g2.restore();
      }
    }
    function recCue(who, text) { var r = P.rec; if (!r) return; r.cues.push({ t: (performance.now() - r.t0 - (r.paused || 0)) / 1000, who: who, text: text || '' }); }
    function recStop() { var r = P.rec; if (!r) return; recCue('', ''); try { if (r.mr.state !== 'inactive') r.mr.stop(); } catch (e) { recFinish(); } }
    function srtTime(t) { t = Math.max(0, t); var ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s + ',' + ('00' + (ms % 1000)).slice(-3); }
    function recSrt(cues) {
      var out = [], n = 0;
      cues.forEach(function (c, i) {
        if (!c.text) return; var nx = cues[i + 1], end = nx ? nx.t : c.t + 4; if (end - c.t < 0.3) return;
        out.push(String(++n), srtTime(c.t) + ' --> ' + srtTime(Math.min(end, c.t + 12)), (c.who ? c.who + ': ' : '') + c.text, '');
      });
      return out.join('\n');
    }
    function recFinish() {
      var r = P.rec; if (!r) return; P.rec = null;
      try { AU.bus.disconnect(r.dest); CL.gain.disconnect(r.dest); } catch (e) {}
      var ext = /mp4/.test(r.mime) ? 'mp4' : 'webm', base = 'frequency-buddies-' + r.id;
      var video = new Blob(r.chunks, { type: r.mime.split(';')[0] }), srt = new Blob([recSrt(r.cues)], { type: 'text/plain' });
      if (r.o.onDone) r.o.onDone({ video: video, srt: srt, videoName: base + '.' + ext, srtName: base + '.srt', id: r.id, title: r.title });
    }
    // a thumbnail: the episode's title card, 1280×720
    function thumbnail() {
      if (!P.stage) return null; var was = P.stage.title;
      P.stage.title = { t0: -3.4, dur: 99 }; P.stage.poster = false; P.stage.t = P.stage.t || 0;
      var sv = P.stage.t; P.stage.t = 4.2; paint(0); P.stage.t = sv; P.stage.title = was;
      var tc = document.createElement('canvas'); tc.width = 1280; tc.height = 720; var tg = tc.getContext('2d'), k = Math.min(1280 / cv.width, 720 / cv.height);
      tg.drawImage(cv, (1280 - cv.width * k) / 2, (720 - cv.height * k) / 2, cv.width * k, cv.height * k); paint(0);
      return tc;
    }
    // ---------- the music follows the story ----------
    // The script's own music cues lead. Between them, the feeling of the last few lines steers the music
    // (worried lines get tense music, a sad stretch goes soft, a proud moment lifts), never flipping back
    // and forth: a change only when two of the last three lines agree, and not more than once in a while.
    var MF = { cue: 'none', cueAt: -99, cur: 'none', at: -99, recent: [] };
    var LINE_MUSIC = { happy: 'happy', silly: 'happy', excited: 'happy', proud: 'triumph', worried: 'tense', grumpy: 'tense', sad: 'sad', calm: 'gentle', sleepy: 'gentle' };
    function musicCue(m) {
      var t = P.dir ? P.dir.time() : 0, want = m === 'none' ? 'gentle' : m, big = /^(tense|sad|triumph|brave)$/.test(want) && want !== MF.cur;
      MF.cue = m; MF.cueAt = t; MF.recent = [];
      if (want !== MF.cur || AU.mood === 'none') { MF.cur = want; MF.at = t; auMood(want, big); }
    }
    function musicFollow(b) {
      if (!P.dir || b.say === 'narrator' && !b.mood) return;
      var t = P.dir.time(), cat = LINE_MUSIC[b.mood] || null;
      if (b.mood === 'excited' && (b.energy || 1) >= 1.25) cat = 'brave';
      if (b.mood === 'surprised') cat = (b.energy || 1) >= 1.2 ? 'tense' : null;
      MF.recent.push(cat); if (MF.recent.length > 3) MF.recent.shift();
      if (t - MF.cueAt < 20 || t - MF.at < 14 || MF.cue === 'title') return; // the script just chose, or the music just changed
      var n = {}; MF.recent.forEach(function (x) { if (x) n[x] = (n[x] || 0) + 1; });
      var best = null; for (var k in n) if (n[k] >= 2 && (!best || n[k] > n[best])) best = k;
      if (best && best !== MF.cur) { MF.cur = best; MF.at = t; auMood(best, best === 'tense' || best === 'sad'); }
    }
    function voiceSrc(t) { var v = host.querySelector('.fb-ver'); if (v && v.getAttribute('data-src') !== t) { v.setAttribute('data-src', t); v.textContent = 'Player ' + PLAYER_VER + ' · ' + t; } }
    var hooks = {
      canvas: function () { return cv; },
      onCaption: setCaption,
      onVoiceEnd: function (b) { clearTimeout(P.capClr); P.capClr = setTimeout(function () { if (P.capB === b) { lineEl.textContent = ''; whoEl.textContent = ''; P.capWords = []; P.capB = null; if (P.rec) recCue('', ''); } }, 450); },
      latency: function () { var c = AU.ctx; return c ? (c.outputLatency || c.baseLatency || 0) : 0; },
      speak: function (b, cb) {
        if (!P.voices || P.rate !== 1) return false;
        if (cspeak(P.id, b, cb)) { voiceSrc('recorded voices'); var at = P.says.indexOf(b); if (at >= 0) clipPrefetch(P.id, P.says, at + 1, 4); return true; }
        if (voiceOk() && vspeak(b, cb)) { voiceSrc('this device’s speech (the recordings didn’t load)'); return true; } return false;
      },
      stopSpeech: vstop,
      onAct: function (b) { if (b.act === 'laugh' && P.voices && P.rate === 1 && (b.who === 'tidbit' || b.who === 'sugarfoot' || b.who === 'both')) laughFor(b.who); },
      onWeather: function (w) { auWeather(w); if (P.music && P.stage) auAmbience(P.stage.scene, w, P.stage.hour); },
      onMusic: function (m) { musicCue(m); },
      onLine: function (b) { musicFollow(b); },
      onChapter: function (ch) { P.ch = ch; renderChapter(); if (P.started) save(); },
      onEnd: function () {
        P.one = false; var m = memGet(); if (m.pos) delete m.pos[P.id]; m.watched = m.watched || {}; m.watched[P.id] = 1; memSet(m);
        var fin = function () {
          if (P.rec) { recStop(); P.playing = false; stopLoop(); syncBtns(); showEnd(); auMood('none'); return; }
          if (P.shuffle) { P.playing = false; stopLoop(); switchTo(shufflePick(P.id), true); return; }
          P.playing = false; stopLoop(); syncBtns(); showEnd(); auMood('none');
        };
        if (themeWanted()) startTheme('close', fin); else fin();
      }
    };
    function renderChapter() {
      var ep = P.ep; if (!ep) return;
      chapEl.textContent = 'Chapter ' + (P.ch + 1) + ' of ' + ep.chapters.length + ' · ' + ep.chapters[P.ch].title;
      Array.prototype.forEach.call(host.querySelectorAll('.fb-chaps button'), function (b, i) { b.setAttribute('aria-current', i === P.ch ? 'true' : 'false'); });
    }
    function progress() {
      if (P.th) { // the theme song has its own little clock, so the episode clock never looks stuck at 0:00
        var th = P.th, d = th.song.dur || 0, e = Math.max(0, th.t - th.song.base);
        timeEl.textContent = '♪ ' + (th.kind === 'open' ? 'Theme' : 'Credits') + (d ? ' ' + fmt(e) + ' / ' + fmt(d - th.song.base) : '');
        return;
      }
      if (!P.dir) return; var t = P.dir.time(), T = P.dir.total;
      fill.style.width = (100 * clamp(t / T, 0, 1)).toFixed(2) + '%'; timeEl.textContent = fmt(t) + ' / ' + fmt(T);
      trackEl.setAttribute('aria-valuenow', String(Math.round(100 * t / T))); trackEl.setAttribute('aria-valuetext', fmt(t) + ' of ' + fmt(T) + ', chapter ' + (P.ch + 1));
    }
    function loop(now) {
      P.raf = 0; if (!P.playing) return;
      P.raf = requestAnimationFrame(loop);
      // the story follows the real clock, so on a slow device the pictures skip ahead instead of falling behind the voices and music
      var raw = P.last ? (now - P.last) / 1000 : 0.016; P.last = now; var dt = clamp(raw, 0, 0.35);
      // and if frames come slowly, draw a little less sharply so it stays smooth
      P.ft = P.ft == null ? raw : P.ft * 0.95 + raw * 0.05; P.ftN = (P.ftN || 0) + 1;
      if (P.ftN > 60) { P.ftN = 0;
        if (P.ft > 0.045 && (P.q || 1) > 0.5) { P.q = Math.max(0.5, (P.q || 1) * 0.8); resize(); }
        else if (P.ft < 0.022 && (P.q || 1) < 1) { P.q = Math.min(1, P.q * 1.12); resize(); } }
      if (P.th) { try { themeTick(dt); } catch (e) { P.errors++; if (window.console) console.error('buddies theme', e); endTheme(true); } progress(); if (P.rec) recFrame(); if (P.stream || P.fs) capEl.classList.toggle('is-empty', !lineEl.textContent); return; }
      try { P.dir.tick(dt * P.rate); } catch (e) { P.errors++; if (window.console) console.error('buddies tick', e); }
      if (P.one && !P.dir.ended && P.dir.chapterAt() !== P.oneCh) { chapterBreak(P.dir.chapterAt()); return; }
      paint(dt * P.rate); progress(); capLight(); if (P.rec) recFrame();
      if (P.stream || P.fs) capEl.classList.toggle('is-empty', !lineEl.textContent);
    }
    function chMins(i) { var e = estimate(P.ep).chapters[i]; return e ? Math.max(1, Math.round(e.dur / 60)) : 2; }
    function oneLabel(i) { var n = chMins(i); return 'Watch one chapter (about ' + n + ' minute' + (n === 1 ? '' : 's') + ')'; }
    function playOne(ch) { P.one = true; P.oneCh = ch; goChapter(ch); }
    // one chapter is done: pause at the start of the next one, and offer it (or the rest)
    function chapterBreak(next) {
      var done = P.oneCh; P.one = false; pause();
      P.dir.seekChapter(next); P.ch = next; renderChapter(); save(); paint(0); progress();
      var ep = P.ep;
      endOv.innerHTML = '<div class="fb-ovc"><p class="fb-k">End of chapter ' + (done + 1) + ' · ' + esc(ep.chapters[done].title) + '</p><h3>Taking a little break</h3>' +
        '<p>Don’t worry: Tidbit and Sugarfoot are okay. Whatever happens next, they work it out together, and the story ends happy.</p>' +
        '<p>Your place is saved in this browser, so you can come back to chapter ' + (next + 1) + ' anytime.</p><div class="fb-row">' +
        '<button type="button" class="fb-b is-main fb-one-next">▶ Next chapter (about ' + chMins(next) + ' min)</button>' +
        '<button type="button" class="fb-b fb-rest">Keep watching</button></div></div>';
      endOv.querySelector('.fb-one-next').addEventListener('click', function () { playOne(next); });
      endOv.querySelector('.fb-rest').addEventListener('click', function () { endOv.hidden = true; play(); });
      endOv.hidden = false; live.textContent = 'End of chapter ' + (done + 1) + '. Paused.';
      var f = endOv.querySelector('.fb-one-next'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {}
    }
    function startLoop() { if (!P.raf) { P.last = 0; P.raf = requestAnimationFrame(loop); } }
    function stopLoop() { if (P.raf) cancelAnimationFrame(P.raf); P.raf = 0; }
    function restart() {
      if (!P.dir) return;
      if (P.th) endTheme(false);
      vstop(); if (P.stage) P.stage.stopTalk();
      endOv.hidden = true; startOv.hidden = true;
      P.playing = false; P.dir.playing = false; P.introDone = false; P.dir.seek(0); P.ch = 0; if (P.one) P.oneCh = 0; renderChapter(); progress();
      play(); live.textContent = 'Starting the episode from the beginning.';
    }
    function play() {
      if (!P.dir) return; recHold(false);
      if (P.th) { startOv.hidden = true; endOv.hidden = true; auPause(false); P.playing = true; syncBtns(); startLoop(); return; } // the theme song carries on
      if (P.dir.ended && !P.th) { endOv.hidden = true; P.dir.seek(0); }
      startOv.hidden = true; endOv.hidden = true; P.started = true;
      if (P.dir.i === 0 && !P.introDone && themeWanted()) { // from the very start: the theme song first
        P.introDone = true; P.stage.reduced = stillNow();
        startTheme('open', function () { P.dir.seek(1); P.playing = false; play(); });
        return;
      }
      if (P.music) { auEnsure(); auOn(true); auPause(false); auMood(P.dir.music === 'none' && P.dir.i === 0 ? 'title' : MF.cur !== 'none' ? MF.cur : (P.dir.music === 'none' ? 'gentle' : P.dir.music)); auWeather(P.stage.weather); AMBP.key = ''; auAmbience(P.stage.scene, P.stage.weather, P.stage.hour); } else { auOn(false); }
      P.playing = true; P.dir.playing = true; P.stage.reduced = stillNow();
      P.dir.restartLine(); syncBtns(); startLoop(); inView();
    }
    // on Play, bring the whole screen into view below the site's sticky header
    function inView() {
      if (P.fs || document.fullscreenElement) return;
      var hd = document.querySelector('.tol-bar'), top = hd ? Math.max(0, hd.getBoundingClientRect().bottom) : 0;
      var r = host.getBoundingClientRect();
      if (r.top < top + 4 || r.top > innerHeight * 0.5) { try { scrollBy({ top: r.top - top - 10, behavior: stillNow() ? 'auto' : 'smooth' }); } catch (e) { scrollBy(0, r.top - top - 10); } }
    }
    function recHold(on) { var r = P.rec; if (!r) return; try { if (on && r.mr.state === 'recording') { r.mr.pause(); r.hid = performance.now(); } else if (!on && r.mr.state === 'paused' && !document.hidden) { r.mr.resume(); r.paused = (r.paused || 0) + performance.now() - (r.hid || performance.now()); } } catch (e) {} }
    function pause() { recHold(true); if (!P.dir) return; if (P.th) { P.playing = false; auPause(true); stopLoop(); syncBtns(); return; } P.playing = false; P.dir.playing = false; vstop(); P.stage.stopTalk(); auPause(true); stopLoop(); syncBtns(); paint(0); }
    function toggle() { if (P.playing) pause(); else play(); }
    function goChapter(ch) {
      if (ch <= 0 && !P.one && P.dir) { restart(); return; }
      if (P.th) endTheme(false);
      if (!P.dir) return; var n = P.ep.chapters.length; ch = clamp(ch, 0, n - 1);
      endOv.hidden = true; startOv.hidden = true; P.started = true;
      P.dir.seekChapter(ch); P.ch = ch; if (P.one) P.oneCh = ch; renderChapter(); save(); paint(0); progress();
      if (P.playing) { P.dir.playing = true; startLoop(); } else play();
      live.textContent = 'Chapter ' + (ch + 1) + ': ' + P.ep.chapters[ch].title;
    }
    function prevChapter() { if (!P.dir) return; var ch = P.dir.chapterAt(); if (P.dir.time() - P.dir.chapterTime(ch) < 4 && ch > 0) goChapter(ch - 1); else goChapter(ch); }
    function nextChapter() { if (!P.dir) return; var ch = P.dir.chapterAt(); if (ch + 1 < P.ep.chapters.length) goChapter(ch + 1); }
    playBtn.addEventListener('click', toggle);
    // ---------- the controls on the picture: they fade while it plays, and come back with a tap or a move ----------
    var idleT = 0;
    function wakeTap(hold) {
      host.classList.remove('is-idle'); clearTimeout(idleT);
      if (!hold && P.playing) idleT = setTimeout(function () {
        // not while someone is moving through the buttons with a keyboard
        var a = document.activeElement, kb = false; try { kb = !!(a && host.contains(a) && a.matches(':focus-visible') && a.closest('.fb-tap, .fb-ctrl, .fb-prog')); } catch (e) {}
        if (P.playing && !kb) host.classList.add('is-idle');
      }, P.fs ? 2000 : 2600);
    }
    var lastTouch = 0;
    stageEl.addEventListener('touchstart', function () { lastTouch = Date.now(); }, { passive: true });
    cv.addEventListener('click', function () {
      // a tap on a touch screen first brings the controls back; a click with a mouse plays or pauses, like any video
      if (Date.now() - lastTouch < 800 && host.classList.contains('is-idle')) { wakeTap(); return; }
      toggle(); wakeTap();
    });
    stageEl.addEventListener('mousemove', function () { wakeTap(); });
    host.querySelector('.fb-tap-play').addEventListener('click', function () { toggle(); wakeTap(); });
    host.querySelector('.fb-tap-re').addEventListener('click', function () { restart(); wakeTap(); });
    host.querySelector('.fb-tap-full').addEventListener('click', function () { $('.fb-full').click(); wakeTap(); });
    $('.fb-restart').addEventListener('click', restart);
    $('.fb-restart2').addEventListener('click', function () { restart(); inView(); });
    ['fb-ctrl', 'fb-prog'].forEach(function (c) { var n = host.querySelector('.' + c); if (n) { n.addEventListener('pointerdown', function () { wakeTap(); }); n.addEventListener('focusin', function () { wakeTap(); }); } });
    $('.fb-prev').addEventListener('click', prevChapter);
    $('.fb-nextc').addEventListener('click', nextChapter);
    skipBtn.addEventListener('click', function () { endTheme(true); });
    // ---------- full screen: the picture alone, filling the screen ----------
    function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
    function setFs(on) {
      if (P.fs === on) return; P.fs = on;
      host.classList.toggle('is-fs', on); document.documentElement.classList.toggle('fb-full-open', on);
      if (document.body) document.body.classList.toggle('tol-video-full', on);
      var tf = host.querySelector('.fb-tap-full'); if (tf) { tf.textContent = on ? '✕' : '⛶'; tf.setAttribute('aria-label', on ? 'Leave full screen' : 'Full screen'); tf.title = on ? 'Leave full screen (Esc)' : 'Full screen'; }
      capEl.classList.toggle('is-empty', !lineEl.textContent);
      if (!on) { try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {} }
      dockNote(); setTimeout(resize, 60); wakeTap(!P.playing);
    }
    function lockLandscape() { // phones: turn the picture sideways when the phone allows it (only works in real full screen)
      try { if (screen.orientation && screen.orientation.lock && window.matchMedia && matchMedia('(pointer:coarse)').matches) { var lp = screen.orientation.lock('landscape'); if (lp && lp.catch) lp.catch(function () {}); } } catch (e) {}
    }
    function fakeFull() { // no full screen on this browser (an iPhone): cover the window instead, and let Back leave it
      host.classList.add('is-full'); document.documentElement.style.overflow = 'hidden';
      try { history.pushState({ fbFull: 1 }, ''); P.fsHist = true; } catch (e) {}
      setFs(true);
    }
    function enterFull() {
      var rq = host.requestFullscreen || host.webkitRequestFullscreen;
      if (!rq) { fakeFull(); return; }
      try { var pr = rq.call(host); if (pr && pr.then) pr.then(lockLandscape, fakeFull); else lockLandscape(); } catch (e) { fakeFull(); }
    }
    function leaveFull(fromHistory) {
      if (fsEl()) { try { var xp = (document.exitFullscreen || document.webkitExitFullscreen).call(document); if (xp && xp.catch) xp.catch(function () {}); } catch (e) {} return; }
      if (host.classList.contains('is-full')) {
        host.classList.remove('is-full'); document.documentElement.style.overflow = ''; setFs(false);
        if (P.fsHist) { P.fsHist = false; if (!fromHistory) try { history.back(); } catch (e) {} }
      }
    }
    $('.fb-full').addEventListener('click', function () { if (P.fs) leaveFull(); else enterFull(); });
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) { document.addEventListener(ev, function () { if (!host.classList.contains('is-full')) setFs(fsEl() === host); setTimeout(resize, 60); }); });
    window.addEventListener('popstate', function () { if (host.classList.contains('is-full')) leaveFull(true); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && host.classList.contains('is-full')) { e.preventDefault(); leaveFull(); } });
    // the time-and-weather note (clock-weather.js) sits in the picture's corner while the show plays, and in full screen,
    // instead of floating over the buttons and chapters
    host.setAttribute('data-tol-clock', '.fb-stage');
    function dockNote() { try { document.dispatchEvent(new CustomEvent('tol-clock-dock')); } catch (e) {} }
    function seekFromPointer(e) { if (!P.dir) return; var r = trackEl.getBoundingClientRect(), p = clamp((e.clientX - r.left) / r.width, 0, 1); if (p < 0.012 || p * P.dir.total < 3) { restart(); return; } if (P.th) endTheme(false); endOv.hidden = true; startOv.hidden = true; P.started = true; P.dir.seekTime(p * P.dir.total); P.ch = P.dir.chapterAt(); if (P.one) P.oneCh = P.ch; renderChapter(); paint(0); progress(); if (P.playing) P.dir.playing = true; else play(); }
    trackEl.addEventListener('click', seekFromPointer);
    trackEl.addEventListener('keydown', function (e) { if (e.key === 'Home') { e.preventDefault(); goChapter(0); } else if (e.key === 'End') { e.preventDefault(); goChapter(P.ep.chapters.length - 1); } });
    document.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      var t = e.target, tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      if ((tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY') && (e.key === ' ' || e.key === 'Enter')) return;
      if (document.querySelector('.pc-ov:not([hidden]), .tol-menu-panel.is-open')) return;
      // only when the player has focus or is mostly on screen, so Space still scrolls the story below
      var hr = host.getBoundingClientRect(), vh = window.innerHeight || 1, seen = Math.max(0, Math.min(hr.bottom, vh) - Math.max(hr.top, 0)) / Math.max(1, Math.min(hr.height, vh));
      if (!host.contains(document.activeElement) && !P.fs && seen < 0.6) return;
      if (e.key === ' ' || e.key === 'k' || e.key === 'K') { e.preventDefault(); toggle(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prevChapter(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); nextChapter(); }
      else if (e.key === 'f' || e.key === 'F') { $('.fb-full').click(); }
      else if (e.key === 'r' || e.key === 'R') { restart(); }
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && P.playing && !P.stream) pause(); // a stream keeps going
      if (P.rec) { try { if (document.hidden && P.rec.mr.state === 'recording') { P.rec.mr.pause(); P.rec.hid = performance.now(); } else if (!document.hidden && P.rec.mr.state === 'paused') { P.rec.mr.resume(); P.rec.paused = (P.rec.paused || 0) + performance.now() - (P.rec.hid || performance.now()); } } catch (e) {} }
    });
    document.addEventListener('tol-still', function () { if (P.stage) { P.stage.reduced = stillNow(); P.stage.bgKey = ''; paint(0); syncBtns(); } });
    window.addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(function () { resize(); }).observe(stageEl);

    function showStart() {
      var ep = P.ep, est = estimate(ep), m = memGet(), pos = m.pos && m.pos[P.id], ch = pos && pos.ch > 0 && pos.ch < ep.chapters.length ? pos.ch : 0;
      var note = NOTES[P.id] || (hasStorm() ? 'A gentle storm with thunder. Lightning shows as a soft glow.' : '');
      var oneBtn = '<button type="button" class="fb-b' + (P.oneFirst ? ' is-main' : '') + ' fb-onech">' + (P.oneFirst ? '▶ ' : '') + oneLabel(ch) + '</button>';
      startOv.innerHTML = '<div class="fb-ovc"><p class="fb-k">Season ' + (ep.season || 1) + ' · Episode ' + (ep.number || 1) + ' · about ' + mins(est.total) + ' · ' + ep.chapters.length + ' chapters</p>' +
        '<h3>' + esc(ep.title) + '</h3><p class="fb-hide-s">' + esc(ep.blurb) + '</p>' +
        (note ? '<p class="fb-cn"><b>Before you watch:</b> ' + esc(note) +  + soundLine() + '</p>' : '') +
        '<div class="fb-row">' +
        (P.oneFirst ? oneBtn : '') +
        '<button type="button" class="fb-b' + (P.oneFirst ? '' : ' is-main') + ' fb-begin">▶ Play the episode</button>' +
        (ch ? '<button type="button" class="fb-b fb-resume">Pick up at chapter ' + (ch + 1) + '</button>' : '') +
        (P.oneFirst ? '' : oneBtn) + '</div></div>';
      var rb = startOv.querySelector('.fb-resume'), bb = startOv.querySelector('.fb-begin');
      startOv.querySelector('.fb-onech').addEventListener('click', function () { playOne(ch); });
      if (rb) rb.addEventListener('click', function () { goChapter(ch); });
      bb.addEventListener('click', restart);
      startOv.hidden = false;
    }
    function soundLine() {
      var what = P.voices && P.music ? 'Voices, music and sounds' : P.voices ? 'Voices' : P.music ? 'Music and sounds' : '';
      return what ? ' <span class="fb-hide-s">' + what + ' will play, and the captions are always on.</span>' : ' <span class="fb-hide-s">Captions tell the story.</span>';
    }
    function hasStorm() { return !!(P.ep && P.ep.chapters.some(function (c) { return c.beats.some(function (b) { return b.weather === 'storm'; }); })); }
    function showEnd() {
      var ep = P.ep, nid = nextIdOf(P.id), nep = nid ? B.episodes[nid] : null, ce = nid ? catalogEntry(nid) : null;
      var teaser = ep.next || (nep && nep.blurb) || '', ntitle = nep ? nep.title : ce ? ce.title : '';
      var trailer = Array.isArray(teaser), tlines = trailer ? teaser : [];   // a trailer (a list of lines) is read aloud; a plain teaser stays plain text
      endOv.innerHTML = '<div class="fb-ovc"><p class="fb-k">The end · ' + esc(ep.title) + '</p><h3>What the pals learned</h3><p>' + esc(ep.lesson) + '</p>' +
        (tlines.length || teaser || ntitle ? '<div class="fb-next"><b>Next time on Frequency Buddies' + (ntitle ? ': ' + esc(ntitle) : '') + '</b>' + (trailer ? '<div class="fb-trailer">' + tlines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') + '</div>' + (VO.ok && tlines.length ? '<button type="button" class="fb-b fb-hear" aria-pressed="false">🎬 Hear the trailer</button>' : '') : esc(teaser)) + '</div>' : '') +
        '<div class="fb-row">' + (nep ? '<a class="fb-b is-main" href="/frequency-buddies.html?ep=' + nid + '">▶ Watch episode ' + nep.number + '</a>' : nid ? '<span class="fb-b" aria-disabled="true">Episode ' + (ce ? ce.n : '') + ' is coming soon</span>' : '') +
        '<button type="button" class="fb-b fb-again">↺ Watch again</button><a class="fb-b" href="/frequency-journey.html#buddies">All episodes</a></div></div>';
      endOv.querySelector('.fb-again').addEventListener('click', restart);
      TV.btn = endOv.querySelector('.fb-hear'); tstop();
      if (TV.btn) TV.btn.addEventListener('click', function () { if (TV.on) tstop(); else tspeak(tlines); });
      endOv.hidden = false;
      if (TV.btn && P.voices && voicesReady()) setTimeout(function () { if (!endOv.hidden && !TV.on) tspeak(tlines); }, 700); live.textContent = 'The end. ' + ep.lesson;
      var f = endOv.querySelector('a.is-main, .fb-again'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {}
    }
    function ready(ep) {
      if (!ep) { startOv.innerHTML = '<div class="fb-ovc"><p class="fb-k">Coming soon</p><h3>This episode isn’t here yet</h3><p>The pals are still rehearsing it. Try another one below.</p><a class="fb-b is-main" href="/frequency-buddies.html?ep=s1e1">▶ Watch episode 1</a></div>'; return; }
      P.says = []; ep.chapters.forEach(function (c) { c.beats.forEach(function (b) { if (b.say) P.says.push(b); }); });
      clipMap(P.id).then(function (m) { if (m) fxLoad(); clipPrefetch(P.id, P.says, 0, 3); syncBtns(); });
      P.ep = ep; P.stage = makeStage({ reduced: stillNow(), bright: P.bright });
      P.stage.onSound = function (k, who) { if (P.music) auSound(k, who); };
      P.dir = makeDirector(P.stage, ep, hooks);
      $('.fb-title').textContent = ep.title;
      var dl = host.querySelector('.fb-dl');
      if (dl) { var mb = DOWNLOADS[P.id]; dl.hidden = !mb; if (mb) { dl.href = '/assets/video/frequency-buddies-' + P.id + '.mp4'; dl.setAttribute('download', 'Frequency Buddies - Episode ' + (ep.number || '') + ' - ' + String(ep.title).replace(/[\\/:*?"<>|]/g, '') + '.mp4'); dl.textContent = '⬇ Download this episode (MP4, ' + mb + ' MB)'; } }
      cv.setAttribute('aria-label', 'Animated story: ' + ep.title + '. ' + ep.blurb);
      var ol = host.querySelector('.fb-chaps ol'), est = estimate(ep); ol.innerHTML = '';
      ep.chapters.forEach(function (c, i) { var li = document.createElement('li'), b = document.createElement('button'); b.type = 'button'; b.textContent = (i + 1) + '. ' + c.title; b.setAttribute('aria-label', 'Chapter ' + (i + 1) + ': ' + c.title + ', ' + fmt(est.chapters[i].start)); b.addEventListener('click', function () { goChapter(i); }); li.appendChild(b); ol.appendChild(li); });
      Array.prototype.forEach.call(trackEl.querySelectorAll('.fb-tick'), function (x) { x.remove(); });
      est.chapters.forEach(function (c, i) { if (!i) return; var tk = document.createElement('i'); tk.className = 'fb-tick'; tk.style.left = (100 * c.start / est.total).toFixed(2) + '%'; trackEl.appendChild(tk); });
      P.dir.seek(0); P.ch = 0; renderChapter();
      // a still of the title card behind the start screen
      P.stage.title = { t0: -3.4, dur: 99 }; P.stage.poster = true; resize(); paint(0); P.stage.poster = false; P.stage.title = { t0: 0, dur: TITLE_T - 0.6 };
      progress(); syncBtns(); showStart();
      if (P.stream && !P.streamStarted) {
        P.streamStarted = true; startOv.hidden = true;
        var wake = function () { auEnsure(); auPause(false); }; document.addEventListener('pointerdown', wake); document.addEventListener('keydown', wake);
        setTimeout(function () { P.introDone = false; P.dir.seek(0); play(); }, 900);
      }
      if (opts.onReady) opts.onReady(ep);
      loadEpisode(nextIdOf(P.id) || '');
    }
    resize(); syncBtns();
    var pk = window.TOLPalsCam && window.TOLPalsCam.loadPacks ? window.TOLPalsCam.loadPacks().catch(function () {}) : Promise.resolve();
    Promise.all([loadEpisode(P.id), pk]).then(function (r) { ready(r[0]); });
    API._p = P; API._showEnd = showEnd;
    API._music = function () { return { mood: AU.mood, cur: MF.cur, cue: MF.cue }; };
    API.record = recStart; API.stopRecording = recStop; API.recording = function () { return !!P.rec; }; API.recordSupported = recSupported;
    API.thumbnail = thumbnail; API.switchTo = function (id) { switchTo(id, false); }; API.shuffleNext = function () { switchTo(shufflePick(P.id), true); }; API._themeTick = function (dt) { themeTick(dt); }; API._startTheme = startTheme; // (for tests and the preview video)
    return P;
  }

  // the episode cards: a season banner and numbered cards with a world tag, runtime and "coming soon"
  function renderCards(host, opts) {
    opts = opts || {}; injectCss();
    var html = '';
    CATALOG.forEach(function (s) {
      html += '<div class="fb-season"><div class="fb-season-h"><span class="fb-badge">Season ' + s.season + '</span><h3>' + esc(s.name.replace(/^Season \d+: /, '')) + '</h3></div><ol class="fb-cards">';
      s.eps.forEach(function (e) { html += '<li data-ep="' + e.id + '"></li>'; });
      html += '</ol><p class="fb-more">More seasons are on the way. Each episode runs about 16 to 17 minutes, in short chapters of about 2 to 4 minutes, with captions and gentle voices. You can watch one chapter at a time.</p></div>';
    });
    host.innerHTML = html;
    function card(e) {
      var li = host.querySelector('li[data-ep="' + e.id + '"]'), ep = B.episodes[e.id], now = opts.current === e.id;
      if (!li) return;
      var est = ep ? estimate(ep) : null, one = est ? Math.max(1, Math.round(est.chapters[0].dur / 60)) : 2;
      var inner = '<span class="fb-thumb" aria-hidden="true">' + e.emoji + '</span><span class="fb-num">Episode ' + e.n + (ep ? ' · ' + mins(est.total) + ' · ' + ep.chapters.length + ' chapters' : '') + '</span><h4>' + esc(ep ? ep.title : e.title) + '</h4>' +
        '<span class="fb-world">🗺️ ' + esc(e.world) + '</span><p>' + esc(ep ? ep.blurb : e.theme + '.') + '</p><span class="fb-meta">' + (ep ? (now ? 'Now playing' : '▶ Watch now') : 'Coming soon') + '</span>';
      li.innerHTML = (ep && !now ? '<a class="fb-card" href="/frequency-buddies.html?ep=' + e.id + '">' + inner + '</a>' : '<div class="fb-card' + (ep ? ' is-now' : ' is-soon') + '">' + inner + '</div>') +
        (ep ? '<a class="fb-one" href="/frequency-buddies.html?ep=' + e.id + '&amp;one=1">Watch one chapter (about ' + one + ' minute' + (one === 1 ? '' : 's') + ')</a>' : '');
      if (ep) thumb(li, ep);
    }
    CATALOG.forEach(function (s) { s.eps.forEach(card); });
    return loadAll().then(function () { CATALOG.forEach(function (s) { s.eps.forEach(card); }); });
  }
  // a small painted still for a card: the episode's first real scene, with the pals in it
  function thumb(li, ep) {
    var PC2 = window.TOLPalsCam; if (!PC2 || !PC2.paintScene || !window.TOLPups) return;
    var sc = null; ep.chapters.some(function (c) { return c.beats.some(function (b) { if (b.scene && b.scene !== 'blank' && b.scene !== 'theater') { sc = b; return true; } return false; }); });
    if (!sc) return;
    var go = function () {
      var old = li.querySelector('.fb-thumb'); if (!old) return;
      var c = document.createElement('canvas'); c.width = 264; c.height = 176; c.setAttribute('aria-hidden', 'true');
      var st = makeStage({ reduced: true, compact: true }); st.applyScene(sc); st.t = 1;
      try { st.render(c.getContext('2d'), 264, 176, 1, 0); old.parentNode.replaceChild(c, old); } catch (e) { /* the emoji stays */ }
    };
    (PC2.packsReady && PC2.packsReady() ? Promise.resolve() : PC2.loadPacks ? PC2.loadPacks() : Promise.resolve()).then(go, go);
  }

  // =====================================================================================================
  // A SILENT CLIP for the pal cam's movie theater: a random stretch of a random episode, no voices,
  // no captions, dotted bubbles; it moves on to another stretch every half minute or so
  // =====================================================================================================
  function clip(o) {
    o = o || {};
    var cv = document.createElement('canvas'), g = cv.getContext('2d'), st = makeStage({ compact: true, noBubbleText: true, reduced: !!o.reduced }), dir = null, title = '', left = 0;
    function eps() { return catalogIds().map(function (id) { return B.episodes[id]; }).filter(function (e) { return e && e.chapters && e.chapters.length; }); }
    function pick() {
      var L = eps(); if (!L.length) return false;
      var ep = L[Math.floor(Math.random() * L.length)], ch = Math.floor(Math.random() * ep.chapters.length);
      dir = makeDirector(st, ep, {}); dir.seekChapter(ch); if (ch === 0) dir.seek(1);
      dir.playing = true; left = 30 + Math.random() * 14; title = ep.title; return true;
    }
    return {
      ready: function () { return eps().length > 0; },
      title: function () { return title; },
      frame: function (dtMs, w, h) {
        if (!dir && !pick()) return null;
        if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; st.bgKey = ''; }
        var dt = clamp(dtMs / 1000, 0, 0.06); dir.tick(dt); left -= dt;
        if (left <= 0 || dir.ended) pick();
        st.render(g, w, h, 1, dt); return cv;
      }
    };
  }

  API.mount = mount; API.renderCards = renderCards; API.clip = clip; API.loadEpisode = loadEpisode; API.loadAll = loadAll;
  API.state = function () {
    var P = API._p; if (!P || !P.dir) return null;
    var S2 = P.stage; return { ep: P.id, i: P.dir.i, beats: P.dir.flat.beats.length, ch: P.dir.chapterAt(), time: P.dir.time(), total: P.dir.total, playing: P.playing, ended: P.dir.ended, scene: S2.scene, weather: S2.weather, errors: P.errors, voices: P.voices, rate: P.rate, guests: Object.keys(S2.guests), trans: !!S2.trans,
      pals: ['tidbit', 'sugarfoot'].map(function (id) { var c = S2.chars[id]; return { x: c.x, pose: c.pose, mood: c.mood, item: c.item, act: c.act ? c.act.name : null, head: c.headPx || null }; }), bubble: S2.bubble ? S2.bubble.text : null };
  };
  API.seek = function (i) { var P = API._p; if (P && P.dir) { P.dir.seek(i); } };
  API.play = function () { var P = API._p; if (P) P.host.querySelector('.fb-play').click(); };
  // start the player on any element marked [data-buddies-player], and the cards on [data-buddies-cards]
  function auto() {
    var el = document.querySelector('[data-buddies-player]'); if (el && !el.__fb) { el.__fb = 1; mount(el, { shuffle: el.hasAttribute('data-shuffle') || /[?&]stream=1\b/.test(location.search) }); }
    Array.prototype.forEach.call(document.querySelectorAll('[data-buddies-cards]'), function (c) { if (!c.__fb) { c.__fb = 1; renderCards(c, { current: el && API._p ? API._p.id : null }); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})(typeof window !== 'undefined' ? window : globalThis);
