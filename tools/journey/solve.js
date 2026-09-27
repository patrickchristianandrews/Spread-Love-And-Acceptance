#!/usr/bin/env node
/* Checks every grid level ("walk" levels) of The Frequency Journey (assets/js/journey-levels.js)
   with a breadth-first search: each one must be solvable, and we record the fewest moves.
   A "move" is one step of one pal, or one step of both pals together.
   Each walk level has several boards (its own, plus the variants in assets/js/journey-pools.js, one picked per
   play). Every board must be solvable in exactly its stated min, and must really need its level's idea:
   without the thorny shadow, the ice blocks, or either bridge, it can't be done.
   Then a generator self-test: 200 random meadows (lights-out, 3x3 and 4x4) and 200 random "Calls in the dark"
   paths, each made the way the game makes them, and each proven solvable by search and by replaying it.
   The other kinds of challenge (riddles, sorting…) are checked by tools/journey/check-content.js.

   node tools/journey/solve.js            check all boards and generators, print a table
   node tools/journey/solve.js --write    also save solutions to tools/journey/solutions.json
   node tools/journey/solve.js 2-3        print one level's solution step by step (2-3c: one variant)  */
'use strict';
var path = require('path'), fs = require('fs');
var J = require(path.join(__dirname, '../../assets/js/journey-levels.js'));
var P = require(path.join(__dirname, '../../assets/js/journey-pools.js'));
var ARROW = ['up', 'right', 'down', 'left'], WHO = ['first', 'second', 'both'];
var only = process.argv.slice(2).find(function (a) { return /^\d-\d[a-z]?$/.test(a); });
var out = {}, bad = 0;

function checkShape(L, id) {
  var errs = [];
  if (L.a < 0 || L.b < 0) errs.push('missing a pal start');
  if (L.goal.length !== 2) errs.push('needs exactly two goal tiles');
  else if (J.cheb(L, L.goal[0], L.goal[1]) !== 1 || (L.goal[0] % L.W !== L.goal[1] % L.W && (L.goal[0] / L.W | 0) !== (L.goal[1] / L.W | 0))) errs.push('goal tiles must sit side by side');
  if (L.W < 7 || L.W > 9 || L.H < 7 || L.H > 9) errs.push('size ' + L.W + 'x' + L.H + ' is outside 7-9');
  L.melody.forEach(function (n) { if (L.g.indexOf(String(n)) < 0) errs.push('melody note ' + n + ' has no crystal'); });
  if (L.melody.length && !L.murk.length) errs.push('melody but no murk');
  ['p', 'q', 'r'].forEach(function (c) {
    var hasPlate = L.g.indexOf(c) >= 0, hasBridge = L.g.indexOf(c.toUpperCase()) >= 0;
    if (hasPlate !== hasBridge) errs.push('plate ' + c + ' and bridge ' + c.toUpperCase() + ' must come in pairs');
  });
  return errs;
}

// the idea each board must need: replace these tiles, and it should become impossible
var NEEDS = { '1-2': [['T', '#', 'the thorny shadow']], '2-2': [['b', '.', 'the ice blocks']], '4-3': [['P', '_', 'bridge P'], ['Q', '_', 'bridge Q']] };
var seenRows = {};
J.WORLDS.forEach(function (w) {
  w.levels.forEach(function (lv, li) {
    var lid = w.n + '-' + (li + 1);
    if (lv.type !== 'walk') return;
    var boards = [{ id: lid + 'a', rows: lv.rows, min: lv.min }].concat(P.walk[lid] || []);
    boards.forEach(function (bd) {
      var id = bd.id;
      if (only && only !== lid && only !== id) return;
      var L = J.parse({ rows: bd.rows }, w.n), errs = checkShape(L, id), t0 = Date.now();
      var sol = J.solve(L, null, 3e6), ms = Date.now() - t0;
      if (sol === false) errs.push('UNSOLVABLE');
      if (sol === null) errs.push('search too big');
      if (sol) {
        var S = J.init(L);
        sol.forEach(function (m) { S = J.step(L, S, m[0], m[1]).s; });
        if (!J.won(L, S)) errs.push('replay did not win');
      }
      (NEEDS[lid] || []).forEach(function (nd) {
        var rows2 = bd.rows.map(function (r) { return r.split(nd[0]).join(nd[1]); });
        if (J.solve(J.parse({ rows: rows2 }, w.n), null, 3e6) !== false) errs.push('can be done without ' + nd[2]);
      });
      var key = bd.rows.join('/'); if (seenRows[key]) errs.push('same board as ' + seenRows[key]); seenRows[key] = id;
      var together = 0;
      if (sol) sol.forEach(function (m) { if (m[0] === 2) together++; });
      var row = (id + ' ').slice(0, 5) + ' ' + (w.short + '       ').slice(0, 9) + L.W + 'x' + L.H + '  min ' + (sol ? String(sol.length).padStart(3) : '  -') +
        '  (together ' + together + ')  ' + ms + 'ms' + (errs.length ? '  !! ' + errs.join('; ') : '  ok');
      console.log(row);
      if (errs.length) bad++;
      out[id] = { min: sol ? sol.length : null, moves: sol || [] };
      if (only && sol) sol.forEach(function (m, k) { console.log(String(k + 1).padStart(3) + '. ' + WHO[m[0]] + ' ' + ARROW[m[1]]); });
      if (sol && typeof bd.min === 'number' && bd.min !== sol.length) { console.log('   note: ' + id + ' says min ' + bd.min + ', solver found ' + sol.length); bad++; }
    });
  });
});

/* ------------------------------------------------------------------ generator self-test */
if (!only) {
  var r = J.rng(20260927), t1 = Date.now(), gb = 0, bl = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], seenB = {};
  for (var i = 0; i < 200; i++) {
    var n = i % 2 ? 4 : 3, m = J.genBloom(n, n, r);
    if (!m) { bad++; console.log('!! meadow ' + i + ': the generator gave up'); continue; }
    var bits = J.bloomBits(m.start), sol = J.bloomSolve(bits, n), b2 = bits;
    if (sol) sol.forEach(function (c) { b2 = J.bloomTap(b2, c, n); });
    if (!sol || !b2.every(Boolean) || bits.every(Boolean) || sol.length !== m.min || m.min < n) { bad++; console.log('!! meadow ' + i + ' ' + m.start.join('/') + ' is not a fair puzzle'); continue; }
    gb++; bl[Math.min(9, m.min)]++; seenB[m.start.join('/')] = 1;
  }
  console.log('meadows: ' + gb + ' of 200 solvable (3x3 and 4x4), fewest taps ' + bl.map(function (c, k) { return c ? k + ':' + c : ''; }).filter(Boolean).join(' ') + ', ' + Object.keys(seenB).length + ' different · ' + (Date.now() - t1) + 'ms');
  var t2 = Date.now(), gm = 0, calls = {}, seenM = {};
  for (i = 0; i < 200; i++) {
    var lo = i % 2 ? 7 : 6, hi = i % 2 ? 9 : 8, z = J.genMaze(lo, hi, r, 6);
    if (!z) { bad++; console.log('!! maze ' + i + ': the generator gave up'); continue; }
    var L = J.mazeParse({ rows: z.rows }), ms = J.mazeSolve(L, 6), errs = [];
    if (L.a < 0 || L.b < 0 || L.goal.length !== 2 || J.cheb(L, L.goal[0], L.goal[1]) !== 1 || L.a >= L.W || L.goal[1] >= L.W) errs.push('bad shape');
    if (!ms) errs.push('unsolvable');
    else {
      if (!J.mazeWalk(L, ms).won) errs.push('replay did not arrive');
      if (ms.length !== z.minCalls || ms.length < lo || ms.length > hi) errs.push('fewest calls ' + ms.length + ' outside ' + lo + '-' + hi);
      if (ms.some(function (c) { return c[1] > 6; })) errs.push('a call longer than six steps');
      if (ms.some(function (c, j) { return j && c[0] === ms[j - 1][0]; })) errs.push('two calls in a row go the same way (the call pad would join them)');
    }
    if (J.mazeWalk(L, [[0, 1]]).won) errs.push('too easy');
    if (errs.length) { bad++; console.log('!! maze ' + i + ': ' + errs.join('; ') + '\n   ' + z.rows.join('\n   ')); continue; }
    gm++; calls[ms.length] = (calls[ms.length] || 0) + 1; seenM[z.rows.join('/')] = 1;
  }
  console.log('dark paths: ' + gm + ' of 200 solvable, fewest calls ' + Object.keys(calls).map(function (k) { return k + ':' + calls[k]; }).join(' ') + ', ' + Object.keys(seenM).length + ' different · ' + (Date.now() - t2) + 'ms');
  var t3 = Date.now(), gs = 0;
  for (i = 0; i < 200; i++) { var sg = J.genSong(6 + i % 2, r); if (sg.length === 6 + i % 2 && sg.every(function (x, k) { return x >= 1 && x <= 5 && x !== sg[k - 1]; })) gs++; else bad++; }
  console.log('tunes: ' + gs + ' of 200 good · ' + (Date.now() - t3) + 'ms');
}
if (process.argv.indexOf('--write') >= 0 && !only) {
  fs.writeFileSync(path.join(__dirname, 'solutions.json'), JSON.stringify(out, null, 0).replace(/\],"/g, '],\n"') + '\n');
  console.log('wrote tools/journey/solutions.json');
}
console.log(bad ? bad + ' problem(s)' : 'All grid boards solvable, and every generator check passed.');
process.exit(bad ? 1 : 0);
