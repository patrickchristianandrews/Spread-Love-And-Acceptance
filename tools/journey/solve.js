#!/usr/bin/env node
/* Checks every level of The Frequency Journey (assets/js/journey-levels.js) with a
   breadth-first search: each one must be solvable, and we record the fewest moves.
   A "move" is one step of one pal, or one step of both pals together.

   node tools/journey/solve.js            check all levels, print a table
   node tools/journey/solve.js --write    also save solutions to tools/journey/solutions.json
   node tools/journey/solve.js 2-3        print one level's solution step by step          */
'use strict';
var path = require('path'), fs = require('fs');
var J = require(path.join(__dirname, '../../assets/js/journey-levels.js'));
var ARROW = ['up', 'right', 'down', 'left'], WHO = ['first', 'second', 'both'];
var only = process.argv.slice(2).find(function (a) { return /^\d-\d$/.test(a); });
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

J.WORLDS.forEach(function (w) {
  w.levels.forEach(function (lv, li) {
    var id = w.n + '-' + (li + 1);
    if (only && only !== id) return;
    var L = J.parse(lv, w.n), errs = checkShape(L, id), t0 = Date.now();
    var sol = J.solve(L, null, 3e6), ms = Date.now() - t0;
    if (sol === false) errs.push('UNSOLVABLE');
    if (sol === null) errs.push('search too big');
    // replay the solution through the engine to be sure it wins
    if (sol) {
      var S = J.init(L);
      sol.forEach(function (m) { S = J.step(L, S, m[0], m[1]).s; });
      if (!J.won(L, S)) errs.push('replay did not win');
    }
    // does it really need both pals? (solve again with "together" moves only)
    var together = 0;
    if (sol) sol.forEach(function (m) { if (m[0] === 2) together++; });
    var row = id + '  ' + (w.short + '       ').slice(0, 9) + L.W + 'x' + L.H + '  min ' + (sol ? String(sol.length).padStart(3) : '  -') +
      '  (together ' + together + ')  ' + ms + 'ms' + (errs.length ? '  !! ' + errs.join('; ') : '  ok');
    console.log(row);
    if (errs.length) bad++;
    out[id] = { min: sol ? sol.length : null, moves: sol || [] };
    if (only && sol) sol.forEach(function (m, k) { console.log(String(k + 1).padStart(3) + '. ' + WHO[m[0]] + ' ' + ARROW[m[1]]); });
    if (sol && typeof lv.min === 'number' && lv.min !== sol.length) { console.log('   note: level says min ' + lv.min + ', solver found ' + sol.length); bad++; }
  });
});
if (process.argv.indexOf('--write') >= 0 && !only) {
  fs.writeFileSync(path.join(__dirname, 'solutions.json'), JSON.stringify(out, null, 0).replace(/\],"/g, '],\n"') + '\n');
  console.log('wrote tools/journey/solutions.json');
}
console.log(bad ? bad + ' problem(s)' : 'All levels solvable.');
process.exit(bad ? 1 : 0);
