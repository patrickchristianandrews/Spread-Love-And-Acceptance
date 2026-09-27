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

   node tools/journey/check-content.js                                                         */
'use strict';
var path = require('path'), fs = require('fs');
var J = require(path.join(__dirname, '../../assets/js/journey-levels.js'));
var ROOT = path.join(__dirname, '../..');
var bad = 0, lines = [];

function need(cond, id, msg) { if (!cond) { bad++; lines.push('  !! ' + id + ': ' + msg); } return cond; }
function str(x) { return typeof x === 'string' && x.trim().length > 0; }
function unique(arr) { return new Set(arr).size === arr.length; }
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
      var file = path.join(ROOT, lv.more[0].split('#')[0]);
      need(/^\//.test(lv.more[0]) && fs.existsSync(file), id, 'Read more page not found: ' + lv.more[0]);
    }
    var all = JSON.stringify(lv).toLowerCase();
    need(!/\bheal|\bcure|\btreatment|\btherap/.test(all), id, 'keep it to everyday ideas: no healing or treatment words');
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
lines.forEach(function (l) { console.log(l); });
console.log(bad ? bad + ' problem(s)' : 'All content checks passed.');
process.exit(bad ? 1 : 0);
