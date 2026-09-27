#!/usr/bin/env node
/* Checks the content of every level in The Frequency Journey (assets/js/journey-levels.js),
   using the same helper rules the game uses. Grid "walk" levels are solved by solve.js;
   this checks everything else, plus the shape of the whole journey:

     - worlds 1 to 6 have three levels each, and no two levels are the same kind of challenge
     - difficulty (1 to 5) never goes down as the journey climbs
     - every level has its words: instruction, card heading, lesson, why, a star phrase, and a
       "Read more" link to a page that exists on this site
     - riddles and "which would help?" questions have exactly one intended answer, and a why for every option
     - sorting: every sentence has a bucket that exists, and every bucket is used
     - sequences have unique steps; memory cards are unique; thawing words really are anagrams
     - the meadow (lights-out) puzzle can be solved; the fair-shares puzzle has a fair split
     - "Finish the line": the word bank has exactly one answer the forgiving matcher accepts
     - "Calls in the dark" can be walked in the stated number of calls
   And every item in the pools (assets/js/journey-pools.js) that gives each play a new set:
     - unique ids; a grade (1-3), a Five Pillars number (1-5) and an angle (self / with others) on every item;
       each multi-item pool covers all five pillars and both angles
     - riddles and moments: exactly one intended answer, a why for every option, riddle answers all different
     - sort sentences sit in real buckets, with enough of each; thawing words are real anagram-free words
     - memory faces are unique; sequences have unique steps in a size that matches the grade
     - fair-share sets add up and have at least one fair split
     - "Finish the line": every line appears on the site word for word (tools/journey/site-text.js), and the
       word bank holds exactly one accepted answer
     - every "Read more" link resolves (the page exists, and so does its #anchor)
     - no forbidden words (no healing, treatment or clinical words, nothing about crisis or analytics)
     - the draw itself: 60 plays of every level make valid sets, and nothing repeats until a pool runs out

   node tools/journey/check-content.js                                                         */
'use strict';
var path = require('path'), fs = require('fs');
var J = require(path.join(__dirname, '../../assets/js/journey-levels.js'));
var ROOT = path.join(__dirname, '../..');
var P = require(path.join(__dirname, '../../assets/js/journey-pools.js'));
var SITE = require(path.join(__dirname, 'site-text.js'));
var FORBID = /\bheal|\bcure|\btreatment|\btherap|\bdiagnos|\bdisorder|\btrauma|\babus|\bviolen|\bsuicid|self-harm|\bcrisis|\banalytics|\bclinical|\bmedica|\bsymptom/;
var bad = 0, lines = [];

function need(cond, id, msg) { if (!cond) { bad++; lines.push('  !! ' + id + ': ' + msg); } return cond; }
function str(x) { return typeof x === 'string' && x.trim().length > 0; }
function unique(arr) { return new Set(arr).size === arr.length; }
// a same-site link: the page must exist, and so must its #anchor if it has one
function linkOk(href) {
  if (!/^\//.test(href || '')) return false;
  var parts = href.split('#'), file = path.join(ROOT, parts[0]);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return false;
  if (parts[1]) { var html = fs.readFileSync(file, 'utf8'); return html.indexOf('id="' + parts[1] + '"') >= 0 || html.indexOf("id='" + parts[1] + "'") >= 0; }
  return true;
}
function oneRight(opts, id, what) {
  need(Array.isArray(opts) && opts.length >= 3, id, what + ' needs at least three options');
  if (!Array.isArray(opts)) return;
  need(opts.filter(function (o) { return o.ok; }).length === 1, id, what + ' must have exactly one intended answer');
  need(opts.every(function (o) { return str(o.t) && str(o.why); }), id, what + ': every option needs words and a why');
  need(unique(opts.map(function (o) { return o.t; })), id, what + ': options must differ');
}

var CHECK = {
  walk: function (lv, id) { need(Array.isArray(lv.rows) && typeof lv.min === 'number', id, 'a walk level needs rows and min (solve.js checks it)'); return 'grid · min ' + lv.min + ' moves (see solve.js)'; },
  riddle: function (lv, id) {
    need(lv.riddles && lv.riddles.length >= 2, id, 'needs at least two riddles');
    lv.riddles.forEach(function (r, k) { need(str(r.q) && str(r.hint), id, 'riddle ' + (k + 1) + ' needs a question and a hint'); oneRight(r.options, id, 'riddle ' + (k + 1)); });
    return lv.riddles.length + ' riddles';
  },
  reframe: function (lv, id) {
    lv.items.forEach(function (it, k) { need(str(it.harsh), id, 'thought ' + (k + 1) + ' needs a harsh thought'); oneRight(it.options, id, 'thought ' + (k + 1)); });
    return lv.items.length + ' thoughts';
  },
  choose: function (lv, id) {
    lv.items.forEach(function (it, k) { need(str(it.q), id, 'moment ' + (k + 1) + ' needs a question'); oneRight(it.options, id, 'moment ' + (k + 1)); });
    return lv.items.length + ' moments, ' + lv.items.map(function (i) { return i.options.length; }).join('/') + ' options';
  },
  breath: function (lv, id) {
    need(lv.inhale > 0 && lv.exhale > 0 && lv.need >= 1, id, 'needs inhale, exhale and need');
    need(lv.window > 0 && lv.window < Math.min(lv.inhale, lv.exhale) / 2, id, 'the tap window must be smaller than half a breath, so turns never overlap');
    return 'in ' + lv.inhale + ' / out ' + lv.exhale + ' · ' + lv.need + ' taps · ±' + lv.window + 's';
  },
  unscramble: function (lv, id) {
    lv.words.forEach(function (w, k) {
      need(/^[A-Z]+$/.test(w.w), id, 'word ' + (k + 1) + ' should be capital letters');
      need(w.mix.split('').sort().join('') === w.w.split('').sort().join(''), id, 'word ' + (k + 1) + ': the frozen letters must be the same letters');
      need(w.mix !== w.w, id, 'word ' + (k + 1) + ' starts already thawed');
      need(str(w.clue), id, 'word ' + (k + 1) + ' needs a clue');
    });
    need(unique(lv.words.map(function (w) { return w.w; })), id, 'words must differ');
    return lv.words.map(function (w) { return w.w; }).join(', ');
  },
  sequence: function (lv, id) {
    need(lv.steps.length >= 4, id, 'needs at least four steps');
    need(unique(lv.steps.map(function (s) { return s.t; })), id, 'steps must be unique');
    need(lv.steps.every(function (s) { return str(s.t) && str(s.why); }), id, 'every step needs words and a why');
    return lv.steps.length + ' steps';
  },
  match: function (lv, id) {
    var faces = []; lv.pairs.forEach(function (p) { faces.push(p.a, p.b); });
    need(unique(faces), id, 'every memory card must be different');
    need(lv.pairs.every(function (p) { return str(p.a) && str(p.b) && str(p.why); }), id, 'every pair needs two faces and a why');
    return lv.pairs.length + ' pairs (' + faces.length + ' cards)';
  },
  bloom: function (lv, id) {
    need(lv.start.length === 3 && lv.start.every(function (r) { return /^[01]{3}$/.test(r); }), id, 'start must be three rows of three 0/1');
    var bits = J.bloomBits(lv.start), sol = J.bloomSolve(bits);
    need(bits.some(function (b) { return !b; }), id, 'the meadow starts fully open');
    need(Array.isArray(sol), id, 'the meadow can’t be brought to full bloom');
    if (sol) { var b = bits; sol.forEach(function (i) { b = J.bloomTap(b, i); }); need(b.every(Boolean), id, 'replaying the solution didn’t open every flower'); }
    return 'solvable in ' + (sol ? sol.length : '?') + ' taps';
  },
  bids: function (lv, id) {
    var bids = lv.scene.filter(function (s) { return s.bid; }).length;
    need(bids >= 2 && bids < lv.scene.length, id, 'the scene needs some bids and some ordinary moments');
    need(lv.scene.every(function (s) { return str(s.t) && str(s.why); }), id, 'every moment needs a why');
    need(unique(lv.scene.map(function (s) { return s.t; })), id, 'moments must differ');
    need(str(lv.reply && lv.reply.q), id, 'needs a reply question'); oneRight(lv.reply.options, id, 'the reply');
    return bids + ' bids in ' + lv.scene.length + ' moments';
  },
  balance: function (lv, id) {
    var n = lv.jobs.length, total = lv.jobs.reduce(function (s, j) { return s + j.w; }, 0), fair = 0;
    need(lv.cap.length === 2 && lv.capNote.length === 2, id, 'two batteries, two notes');
    need(total === lv.cap[0] + lv.cap[1], id, 'the jobs (' + total + ') must add up to both batteries (' + (lv.cap[0] + lv.cap[1]) + ')');
    need(lv.jobs.every(function (j) { return str(j.t) && j.w > 0; }), id, 'every job needs a name and a weight');
    need(unique(lv.jobs.map(function (j) { return j.t; })), id, 'jobs must differ');
    need(lv.jobs.some(function (j) { return j.hidden; }), id, 'include some invisible work');
    for (var m = 0; m < 1 << n; m++) { var a = 0; for (var i = 0; i < n; i++) if (!(m >> i & 1)) a += lv.jobs[i].w; if (a === lv.cap[0]) fair++; }
    need(fair > 0, id, 'there is no fair split');
    return n + ' jobs · ' + fair + ' fair splits';
  },
  echo: function (lv, id) {
    need(lv.song.every(function (n) { return n >= 1 && n <= 5 && n === Math.floor(n); }), id, 'notes must be 1 to 5');
    need(lv.first >= 2 && lv.first < lv.song.length, id, 'the tune must start short and grow');
    return 'rounds of ' + lv.first + '…' + lv.song.length + ' notes';
  },
  sort: function (lv, id) {
    var keys = lv.buckets.map(function (b) { return b.k; });
    need(unique(keys), id, 'bucket keys must be unique');
    lv.items.forEach(function (it, k) { need(keys.indexOf(it.k) >= 0, id, 'sentence ' + (k + 1) + ' has no bucket'); need(str(it.why), id, 'sentence ' + (k + 1) + ' needs a why'); });
    keys.forEach(function (k) { need(lv.items.some(function (it) { return it.k === k; }), id, 'bucket ' + k + ' is never used'); });
    need(unique(lv.items.map(function (it) { return it.t; })), id, 'sentences must differ');
    return lv.items.length + ' sentences, ' + keys.length + ' buckets';
  },
  fill: function (lv, id) {
    lv.lines.forEach(function (ln, k) {
      var w = 'line ' + (k + 1);
      need(str(ln.before) || str(ln.after), id, w + ' needs words around the gap');
      need(ln.a.length >= 1 && ln.a.every(function (a) { return J.fillMatch(ln, a); }), id, w + ': every accepted answer must match itself');
      var hits = ln.choices.filter(function (c) { return J.fillMatch(ln, c); });
      need(hits.length === 1, id, w + ': the word bank must hold exactly one accepted answer (it holds ' + hits.length + ')');
      need(unique(ln.choices.map(function (c) { return J.norm(c); })), id, w + ': word bank choices must differ');
      need(str(ln.hint) && str(ln.why), id, w + ' needs a hint and a why');
      need(!J.fillMatch(ln, 'xyz') && !J.fillMatch(ln, ''), id, w + ': the matcher is too forgiving');
      need(SITE.find(ln.before + ln.a[0] + ln.after).length > 0, id, w + ' doesn’t appear on the site word for word: ' + ln.before + ln.a[0] + ln.after);
    });
    return lv.lines.length + ' lines';
  },
  spot: function (lv, id) {
    lv.scenes.forEach(function (sc, k) {
      var st = sc.bits.filter(function (b) { return b.story; }).length;
      need(st >= 1 && st < sc.bits.length, id, 'scene ' + (k + 1) + ' needs some stories and some things seen');
      need(sc.bits.every(function (b) { return str(b.t) && str(b.why); }), id, 'scene ' + (k + 1) + ': every part needs a why');
      need(unique(sc.bits.map(function (b) { return b.t; })), id, 'scene ' + (k + 1) + ': parts must differ');
    });
    return lv.scenes.map(function (s) { return s.bits.filter(function (b) { return b.story; }).length + '/' + s.bits.length; }).join(' + ') + ' stories';
  },
  maze: function (lv, id) {
    var L = J.mazeParse(lv), sol = J.mazeSolve(L, lv.maxRun);
    need(L.a >= 0 && L.b >= 0 && L.goal.length === 2 && J.cheb(L, L.goal[0], L.goal[1]) === 1, id, 'needs a lookout (A) beside one tone tile (O), and a walker (B)');
    need(Array.isArray(sol), id, 'the walker can’t reach the tone');
    if (sol) {
      need(J.mazeWalk(L, sol).won, id, 'replaying the calls didn’t arrive');
      need(sol.length === lv.minCalls, id, 'minCalls says ' + lv.minCalls + ', the fewest is ' + sol.length);
      need(sol.length <= lv.maxCalls, id, 'needs more calls than allowed');
      need(!J.mazeWalk(L, [[0, 1]]).won, id, 'too easy');
    }
    return 'fewest calls ' + (sol ? sol.length : '?') + ' of ' + lv.maxCalls + ' (' + (sol || []).map(function (c) { return 'URDL'[c[0]] + c[1]; }).join(' ') + ')';
  }
};

var types = [], ds = [], stars = [];
J.WORLDS.forEach(function (W) {
  if (W.n <= 6) need(W.levels.length === 3, 'world ' + W.n, 'needs three levels');
  need(str(W.intro) && str(W.summary) && str(W.theme), 'world ' + W.n, 'needs an intro, theme and summary');
  W.levels.forEach(function (lv, k) {
    var id = W.n + '-' + (k + 1), extra = '';
    ['kind', 'ask', 'done', 'lesson', 'why', 'star'].forEach(function (f) { need(str(lv[f]), id, 'missing ' + f); });
    need(lv.d >= 1 && lv.d <= 5 && lv.d === Math.floor(lv.d), id, 'difficulty must be 1 to 5');
    need(str(lv.star) && lv.star.length <= 40, id, 'the star phrase should be short (40 characters or fewer)');
    if (need(Array.isArray(lv.more) && str(lv.more[0]) && str(lv.more[1]), id, 'needs a Read more link')) {
      need(linkOk(lv.more[0]), id, 'Read more page (or its #anchor) not found: ' + lv.more[0]);
    }
    var all = JSON.stringify(lv).toLowerCase();
    need(!FORBID.test(all), id, 'keep it to everyday ideas: no healing, treatment, clinical or crisis words (' + (all.match(FORBID) || [''])[0] + ')');
    if (need(!!CHECK[lv.type], id, 'unknown type ' + lv.type)) { try { extra = CHECK[lv.type](lv, id); } catch (e) { need(false, id, 'crashed: ' + e.message); } }
    types.push(lv.type + (lv.type === 'walk' ? ':' + W.mech : '')); ds.push(lv.d); stars.push(lv.star);
    console.log(id + '  d' + lv.d + '  ' + (lv.type + '          ').slice(0, 11) + (lv.kind + '                         ').slice(0, 24) + extra);
  });
});
need(types.length === 18, 'journey', 'expected 18 levels, found ' + types.length);
need(unique(types), 'journey', 'two levels share a challenge kind: ' + types.join(', '));
need(ds.every(function (d, i) { return !i || d >= ds[i - 1]; }), 'journey', 'difficulty should never go down: ' + ds.join(' '));
need(ds[0] === 1 && ds[ds.length - 1] === 5, 'journey', 'should start at 1 and reach 5');
need(unique(stars), 'journey', 'star phrases must differ');
var nonGrid = J.WORLDS.reduce(function (n, W) { return n + W.levels.filter(function (lv) { return lv.type !== 'walk' && lv.type !== 'maze'; }).length; }, 0);
need(nonGrid >= 10, 'journey', 'at least ten levels should be something other than a grid (found ' + nonGrid + ')');
console.log('difficulty: ' + ds.join(' ') + ' · ' + nonGrid + ' non-grid levels');

/* ------------------------------------------------------------------ the pools */
console.log('\npools');
var allIds = {};
function common(name, list, opts) {
  opts = opts || {};
  var id = 'pool ' + name, ps = {}, as = {};
  need(Array.isArray(list) && list.length >= (opts.min || 1), id, 'needs at least ' + (opts.min || 1) + ' items (has ' + (list ? list.length : 0) + ')');
  list.forEach(function (it) {
    var iid = id + ' ' + it.id;
    need(str(it.id) && !allIds[it.id], iid, 'ids must be present and unique across every pool');
    allIds[it.id] = 1;
    need([1, 2, 3].indexOf(it.g) >= 0, iid, 'grade must be 1, 2 or 3');
    if (!opts.noPillar) {
      need(it.p >= 1 && it.p <= 5, iid, 'needs a Five Pillars number (1-5)');
      need(it.an === 'self' || it.an === 'with', iid, 'needs an angle: self or with others');
      ps[it.p] = 1; as[it.an] = 1;
    }
    var js = JSON.stringify(it).toLowerCase();
    need(!FORBID.test(js), iid, 'forbidden word: ' + (js.match(FORBID) || [''])[0]);
    need(!/sugarfoot[^.]{0,40}\b(he|his|him)\b|tidbit[^.]{0,40}\b(he|his|him)\b/i.test(JSON.stringify(it)), iid, 'Sugarfoot and Tidbit are both she/her');
  });
  if (opts.cover) {
    need(Object.keys(ps).length === 5, id, 'should cover all five pillars (covers ' + Object.keys(ps).sort().join(',') + ')');
    if (opts.cover === 2) need(as.self && as.with, id, 'should include both angles: in you, and with others');
  }
  var g = [0, 0, 0, 0]; list.forEach(function (it) { g[it.g]++; });
  return list.length + ' items (easy ' + g[1] + ', medium ' + g[2] + ', hard ' + g[3] + ')' + (opts.noPillar ? '' : ' · pillars ' + [1, 2, 3, 4, 5].map(function (n) { return list.filter(function (it) { return it.p === n; }).length; }).join('/'));
}
function report(name, msg) { console.log('  ' + (name + '             ').slice(0, 10) + msg); }

report('riddle', common('riddle', P.riddle, { min: 60, cover: 2 }));
P.riddle.forEach(function (r) { var id = 'riddle ' + r.id; need(str(r.q) && str(r.hint) && r.w >= 1 && r.w <= 6, id, 'needs a question, a hint and a world (1-6)'); oneRight(r.options, id, 'the riddle'); need(r.options.length === 3, id, 'three choices'); });
var ans = P.riddle.map(function (r) { return J.norm(r.options.filter(function (o) { return o.ok; })[0].t); });
need(unique(ans), 'riddle', 'riddle answers should all differ, so a set never has two with the same answer');
need([1, 2, 3, 4, 5, 6].every(function (w) { return P.riddle.some(function (r) { return r.w === w; }); }), 'riddle', 'riddles should fit every world');

report('choose', common('choose', P.choose, { min: 40, cover: 2 }));
P.choose.forEach(function (c) { need(str(c.q), 'choose ' + c.id, 'needs a moment'); oneRight(c.options, 'choose ' + c.id, 'the moment'); need(c.options.length === 4, 'choose ' + c.id, 'four options'); });

report('reframe', common('reframe', P.reframe, { min: 20, cover: 2 }));
P.reframe.forEach(function (k) { need(str(k.harsh), 'reframe ' + k.id, 'needs a harsh thought'); oneRight(k.options, 'reframe ' + k.id, 'the thought'); });

var BUCKETS = J.levelOf(5, 2).buckets.map(function (b) { return b.k; });
report('sort', common('sort', P.sort, { min: 80, cover: 2 }) + ' · ' + BUCKETS.map(function (k) { return k + ' ' + P.sort.filter(function (s) { return s.k === k; }).length; }).join(', '));
P.sort.forEach(function (s) { need(BUCKETS.indexOf(s.k) >= 0 && str(s.t) && str(s.why), 'sort ' + s.id, 'needs a real bucket, words and a why'); });
need(unique(P.sort.map(function (s) { return J.norm(s.t); })), 'sort', 'sentences must differ');
BUCKETS.forEach(function (k) { need(P.sort.filter(function (s) { return s.k === k; }).length >= 12, 'sort', 'bucket ' + k + ' needs at least 12 sentences, so sets stay fresh'); });

report('word', common('word', P.word, { min: 60, cover: 2 }));
var sig = {};
P.word.forEach(function (w) {
  var id = 'word ' + w.w;
  need(/^[A-Z]{3,10}$/.test(w.w), id, 'capital letters, 3 to 10 of them (so the tiles fit a phone)');
  need(str(w.clue), id, 'needs a clue');
  var k = w.w.split('').sort().join(''); need(!sig[k], id, 'is an anagram of ' + sig[k] + ': the answer would be ambiguous'); sig[k] = w.w;
  var rr = J.rng(w.w.length * 7 + 3);
  for (var t = 0; t < 20; t++) { var m = J.scramble(w.w, rr); need(m !== w.w && m.split('').sort().join('') === k, id, 'scrambling must keep the letters and never give the word itself'); }
});

report('pair', common('pair', P.pair, { min: 30, cover: 2 }) + ' · kinds ' + Object.keys(P.pairKinds).map(function (c) { return c + ' ' + P.pair.filter(function (p) { return p.c === c; }).length; }).join(', '));
var faces = []; P.pair.forEach(function (p) { faces.push(J.norm(p.a), J.norm(p.b)); need(!!P.pairKinds[p.c] && str(p.a) && str(p.b) && str(p.why) && str(p.x), 'pair ' + p.id, 'needs a kind, two faces, a why and an x'); });
need(unique(faces), 'pair', 'every memory face must be different across the whole pool');

report('seq', common('seq', P.seq, { min: 12, cover: 2 }));
P.seq.forEach(function (q) {
  var id = 'seq ' + q.id;
  need(q.steps.length === q.g + 3, id, 'grade ' + q.g + ' means ' + (q.g + 3) + ' steps');
  need(unique(q.steps.map(function (s) { return J.norm(s.t); })), id, 'steps must be unique');
  need(q.steps.every(function (s) { return str(s.t) && str(s.why); }), id, 'every step needs words and a why');
  need(str(q.title) && str(q.q) && str(q.win) && str(q.lesson) && str(q.why), id, 'needs a title, a question, a win line, a lesson and a why');
  need(Array.isArray(q.more) && linkOk(q.more[0]) && str(q.more[1]), id, 'Read more link not found: ' + (q.more && q.more[0]));
});

report('fill', common('fill', P.fill, { min: 40, cover: 2 }));
P.fill.forEach(function (ln) {
  var id = 'fill ' + ln.id, full = ln.before + ln.a[0] + ln.after;
  need(ln.a.length >= 1 && ln.a.every(function (a) { return J.fillMatch(ln, a); }), id, 'every accepted answer must match itself');
  var hits = ln.choices.filter(function (c) { return J.fillMatch(ln, c); });
  need(ln.choices.length === 3 && hits.length === 1, id, 'the word bank must hold three words, exactly one accepted (holds ' + hits.length + ')');
  need(unique(ln.choices.map(J.norm)), id, 'word bank choices must differ');
  need(str(ln.hint) && str(ln.why), id, 'needs a hint and a why');
  need(!J.fillMatch(ln, 'xyz') && !J.fillMatch(ln, ''), id, 'the matcher is too forgiving');
  need(SITE.find(full).length > 0, id, 'doesn’t appear on the site word for word: ' + full);
});
need(unique(P.fill.map(function (l) { return J.norm(l.before + l.a[0] + l.after); })), 'fill', 'lines must differ');

report('spot', common('spot', P.spot, { min: 20, cover: 2 }));
P.spot.forEach(function (sc) {
  var id = 'spot ' + sc.id, st = sc.bits.filter(function (b) { return b.story; }).length;
  need(str(sc.title) && st >= 1 && st < sc.bits.length, id, 'needs a title, and some stories and some things seen');
  need(sc.bits.every(function (b) { return str(b.t) && str(b.why); }) && unique(sc.bits.map(function (b) { return b.t; })), id, 'every part needs a why, and parts must differ');
});

report('bids', common('bids', P.bids, { min: 20 }));
P.bids.forEach(function (b) {
  var id = 'bids ' + b.id, n = b.scene.filter(function (s) { return s.bid; }).length;
  need(str(b.title) && str(b.who) && str(b.setting), id, 'needs a title, a who and a setting');
  need(n >= 2 && n < b.scene.length, id, 'needs some reaches and some ordinary moments');
  need(b.scene.every(function (s) { return str(s.t) && str(s.why); }) && unique(b.scene.map(function (s) { return s.t; })), id, 'every moment needs a why, and moments must differ');
  need(str(b.reply.q), id, 'needs a reply question'); oneRight(b.reply.options, id, 'the reply');
});

report('fair', common('fair', P.fair, { min: 12 }));
P.fair.forEach(function (f) {
  var id = 'fair ' + f.id, n = f.jobs.length, total = f.jobs.reduce(function (s, j) { return s + j.w; }, 0), fair = 0;
  need(str(f.title) && f.cap.length === 2 && f.capNote.length === 2, id, 'needs a title, two batteries and two notes');
  need(total === f.cap[0] + f.cap[1], id, 'jobs (' + total + ') must add up to both batteries (' + (f.cap[0] + f.cap[1]) + ')');
  need(f.jobs.every(function (j) { return str(j.t) && j.w >= 1 && j.w <= 5; }) && unique(f.jobs.map(function (j) { return j.t; })), id, 'jobs need names, weights 1-5, and must differ');
  need(f.jobs.some(function (j) { return j.hidden; }), id, 'include some invisible work');
  need(n <= 10, id, 'ten jobs at most, so it fits a phone');
  for (var m = 0; m < 1 << n; m++) { var a = 0; for (var i = 0; i < n; i++) if (!(m >> i & 1)) a += f.jobs[i].w; if (a === f.cap[0]) fair++; }
  need(fair > 0, id, 'there is no fair split');
});

report('breath', common('breath', P.breath, { min: 4, noPillar: true }));
P.breath.forEach(function (b) { need(b.exhale > b.inhale && b.inhale >= 3 && b.exhale <= 8, 'breath ' + b.id, 'a calm pattern breathes out for longer than in, at an easy pace'); });

report('walk', Object.keys(P.walk).map(function (k) { return k + ': ' + (P.walk[k].length + 1) + ' boards'; }).join(', ') + ' (solve.js checks them)');
need(linkOk(P.pillarPage), 'pillars', 'the Five Pillars link must resolve: ' + P.pillarPage);
P.pillars.slice(1).forEach(function (pl) { need(linkOk(P.pillarPage.split('#')[0] + '#' + pl.id), 'pillars', 'Pillar ' + pl.roman + ' link must resolve: ' + P.pillarPage + '#' + pl.id); });

/* ------------------------------------------------------------------ the draw: 60 plays of every level */
console.log('\ndraws (60 plays of each level, seeded)');
var PER = { riddle: ['riddles', 3], unscramble: ['words', 3], match: ['pairs', 6], reframe: ['items', 4], sort: ['items', 10], fill: ['lines', 6], spot: ['scenes', 2], choose: ['items', 4] };
J.WORLDS.forEach(function (W) {
  W.levels.forEach(function (base, k) {
    var id = W.n + '-' + (k + 1), seen = {}, rr = J.rng(1000 + W.n * 10 + k), sets = [], firstRepeat = -1, used = {}, perDraw = 1;
    for (var t = 0; t < 60; t++) {
      var lv = J.drawLevel(W.n, k + 1, seen, { rng: rr, again: t % 3 === 2 });
      need(lv && lv.type === base.type && lv.d === base.d && lv.star === base.star, id, 'a drawn level must keep its type, difficulty and star');
      if (!lv) continue;
      var tag = id + ' draw ' + (t + 1);
      if (PER[base.type]) {
        var list = lv[PER[base.type][0]]; perDraw = PER[base.type][1];
        need(list && list.length === perDraw, tag, 'expected ' + perDraw + ' items, got ' + (list && list.length));
        need(unique(lv.set), tag, 'a set must not repeat an item');
      }
      if (base.type === 'match') {
        var f2 = []; lv.pairs.forEach(function (p) { f2.push(p.a, p.b); });
        need(unique(f2) && unique(lv.pairs.map(function (p) { return p.x; })), tag, 'pairs in one game must not be mix-up-able');
      }
      if (base.type === 'sort') BUCKETS.forEach(function (b) { need(lv.items.filter(function (s) { return s.k === b; }).length >= 2, tag, 'every bucket needs at least two sentences'); });
      if (base.type === 'riddle' || base.type === 'choose' || base.type === 'reframe') (lv.riddles || lv.items).forEach(function (q) { need(q.options.filter(function (o) { return o.ok; }).length === 1, tag, 'shuffled options must keep one answer'); });
      if (base.type === 'unscramble') lv.words.forEach(function (w) { need(w.mix !== w.w && w.mix.split('').sort().join('') === w.w.split('').sort().join(''), tag, 'bad scramble for ' + w.w); });
      if (base.type === 'bloom') { var sol = J.bloomSolve(J.bloomBits(lv.start), lv.n); need(sol && sol.length === lv.minTaps && !J.bloomBits(lv.start).every(Boolean), tag, 'the meadow must be solvable and not already open'); }
      if (base.type === 'maze') { var L = J.mazeParse(lv), ms = J.mazeSolve(L, lv.maxRun); need(ms && ms.length === lv.minCalls && ms.length <= lv.maxCalls - 1, tag, 'the dark path must be walkable in its fewest calls, with room to spare'); }
      if (base.type === 'walk') need(!!lv.min && Array.isArray(lv.rows), tag, 'a board and its fewest moves');
      if (base.type === 'breath') need(lv.window < Math.min(lv.inhale, lv.exhale) / 2, tag, 'tap window too wide');
      if (base.type === 'echo') need(lv.song.every(function (n, i) { return n >= 1 && n <= 5 && n !== lv.song[i - 1]; }), tag, 'tune notes 1-5, no note twice in a row');
      need(lv.pillars.length >= 1, tag, 'every set should name at least one pillar');
      lv.set.forEach(function (x) { if (used[x] && firstRepeat < 0) firstRepeat = t; used[x] = 1; });
      sets.push(lv.set.join(','));
    }
    var distinct = new Set(sets).size;
    need(distinct >= 3, id, 'plays should differ (only ' + distinct + ' different sets in 60)');
    var poolName = (J.DRAW[id] || {}).pool, size = poolName ? P[poolName].length : 0;
    if (poolName && size) {
      var safe = Math.floor(size / perDraw / 2);
      need(firstRepeat < 0 || firstRepeat >= safe, id, 'something repeated after only ' + firstRepeat + ' plays (pool of ' + size + ')');
    }
    report(id, (base.type + '          ').slice(0, 11) + distinct + ' different sets in 60 plays' + (poolName ? ' · first repeat after ' + (firstRepeat < 0 ? 'none' : firstRepeat) + ' plays · ' + Object.keys(used).length + ' of ' + size + ' used' : ''));
  });
});

lines.forEach(function (l) { console.log(l); });
console.log(bad ? bad + ' problem(s)' : 'All content checks passed.');
process.exit(bad ? 1 : 0);
