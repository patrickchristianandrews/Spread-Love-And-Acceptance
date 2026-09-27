#!/usr/bin/env node
/* Makes new boards for The Frequency Journey's grid "walk" levels (1-2 thorny shadow, 2-2 ice and water,
   4-3 bridge plates), the offline way: random boards built from each level's idea, then kept only if the
   same breadth-first solver the game and tools/journey/solve.js use says they are
     - solvable, with a fewest-moves count inside the level's range,
     - impossible without the level's idea (no thorny shadow / no ice blocks / either bridge missing),
     - different from every board already in journey-levels.js and the pools.
   Prints a JS snippet (one { id, min, rows } per line) to paste into a pool chunk's P.walk lists.
   Nothing runs in the browser: the game just picks one stored board per play.

   node tools/journey/gen-walk.js [count per level, default 20] [seed]                                   */
'use strict';
var path = require('path');
var J = require(path.join(__dirname, '../../assets/js/journey-levels.js'));
var P = require(path.join(__dirname, '../../assets/js/journey-pools.js'));
var COUNT = +process.argv[2] || 20, r = J.rng(+process.argv[3] || 20260927);
function ri(n) { return Math.floor(r() * n); }
function blank(W, H) { var g = []; for (var y = 0; y < H; y++) { g.push([]); for (var x = 0; x < W; x++) g[y].push('.'); } return g; }
function rows(g) { return g.map(function (row) { return row.join(''); }); }
function free(g, x, y) { return g[y] && g[y][x] === '.'; }
function place(g, ch, ys, W) { for (var t = 0; t < 200; t++) { var y = ys[ri(ys.length)], x = ri(W); if (free(g, x, y)) { g[y][x] = ch; return [x, y]; } } return null; }
function placeGoal(g, ys, W) {
  for (var t = 0; t < 200; t++) { var y = ys[ri(ys.length)], x = ri(W - 1); if (free(g, x, y) && free(g, x + 1, y)) { g[y][x] = 'O'; g[y][x + 1] = 'O'; return true; } }
  return false;
}
function sprinkle(g, ch, n, ys, W) { for (var k = 0; k < n; k++) place(g, ch, ys, W); }
function range(a, b) { var o = []; for (var i = a; i <= b; i++) o.push(i); return o; }
// flip the whole board so the pals start at the top as often as at the bottom
function maybeFlip(g) { return r() < 0.5 ? g.slice().reverse() : g; }
function maybeMirror(g) { return r() < 0.5 ? g.map(function (row) { return row.slice().reverse(); }) : g; }

var MAKE = {
  // a full wall with one thorny shadow in it; pals on one side, the tone on the other
  '1-2': function () {
    var W = 7, H = 7, g = blank(W, H), wy = 2 + ri(3), tx = ri(W);
    for (var x = 0; x < W; x++) g[wy][x] = x === tx ? 'T' : '#';
    var near = range(0, wy - 1), far = range(wy + 1, H - 1);
    if (!placeGoal(g, near, W)) return null;
    if (!place(g, 'A', far, W) || !place(g, 'B', far, W)) return null;
    sprinkle(g, '#', 3 + ri(4), near, W); sprinkle(g, '#', 3 + ri(5), far, W);
    return maybeMirror(maybeFlip(g));
  },
  // a river with walls at its banks; ice blocks to push in, and sometimes slippery ice
  '2-2': function () {
    var W = 7, H = 7, g = blank(W, H), wy = 2 + ri(3), a = ri(2), b = W - 1 - ri(2);
    for (var x = 0; x < W; x++) g[wy][x] = x >= a && x <= b ? '~' : '#';
    var near = range(0, wy - 1), far = range(wy + 1, H - 1);
    if (!placeGoal(g, near, W)) return null;
    if (!place(g, 'A', far, W) || !place(g, 'B', far, W)) return null;
    sprinkle(g, 'b', 1 + ri(3), far, W);
    sprinkle(g, 'i', ri(3), far.concat(near), W);
    sprinkle(g, '#', 2 + ri(3), far, W); sprinkle(g, '#', 1 + ri(3), near, W);
    return maybeMirror(maybeFlip(g));
  },
  // a canyon with two bridge pieces, each up while a pal stands on its plate
  '4-3': function () {
    var W = 7, H = 7, g = blank(W, H), cx = 2 + ri(3), ys = range(0, H - 1);
    for (var y = 0; y < H; y++) g[y][cx] = '_';
    var py = ri(H), qy; do { qy = ri(H); } while (Math.abs(qy - py) < 2);
    g[py][cx] = 'P'; g[qy][cx] = 'Q';
    var left = [], right = [];
    for (var x = 0; x < W; x++) (x < cx ? left : x > cx ? right : []).push(x);
    function put(ch, xs) { for (var t = 0; t < 200; t++) { var x = xs[ri(xs.length)], y = ri(H); if (g[y][x] === '.') { g[y][x] = ch; return [x, y]; } } return null; }
    function putGoal(xs) { for (var t = 0; t < 200; t++) { var x = xs[ri(xs.length)], y = ri(H); if (xs.indexOf(x + 1) >= 0 && g[y][x] === '.' && g[y][x + 1] === '.') { g[y][x] = 'O'; g[y][x + 1] = 'O'; return true; } } return false; }
    if (right.length < 2 || left.length < 2) return null;
    if (!putGoal(right)) return null;
    if (!put('A', left) || !put('B', left) || !put('p', left) || !put('q', right)) return null;
    for (var k = 0; k < 1 + ri(3); k++) put('#', r() < 0.5 ? left : right);
    return maybeFlip(maybeMirror(g));
  }
};
var RANGE = { '1-2': [8, 13], '2-2': [11, 16], '4-3': [15, 21] };
var NEEDS = { '1-2': [['T', '#']], '2-2': [['b', '.']], '4-3': [['P', '_'], ['Q', '_']] };
var WORLD = { '1-2': 1, '2-2': 2, '4-3': 4 };

var known = {};
J.WORLDS.forEach(function (w, wi) { w.levels.forEach(function (lv, li) { if (lv.type === 'walk') known[lv.rows.join('/')] = (wi + 1) + '-' + (li + 1) + 'a'; }); });
Object.keys(P.walk).forEach(function (k) { P.walk[k].forEach(function (b) { known[b.rows.join('/')] = b.id; }); });

var out = [];
Object.keys(MAKE).forEach(function (id) {
  var got = [], tries = 0, t0 = Date.now(), next = (P.walk[id] || []).length;
  while (got.length < COUNT && tries < 4000) {
    tries++;
    var g = MAKE[id](); if (!g) continue;
    var rw = rows(g), key = rw.join('/'); if (known[key]) continue;
    var L = J.parse({ rows: rw }, WORLD[id]); if (L.goal.length !== 2) continue;
    var sol = J.solve(L, null, 4e5);
    if (!sol || sol.length < RANGE[id][0] || sol.length > RANGE[id][1]) continue;
    var needed = NEEDS[id].every(function (nd) { return J.solve(J.parse({ rows: rw.map(function (s) { return s.split(nd[0]).join(nd[1]); }) }, WORLD[id]), null, 4e5) === false; });
    if (!needed) continue;
    if (sol.every(function (m) { return m[0] !== 2; }) && r() < 0.7) continue; // prefer boards where walking together helps
    known[key] = 1;
    var bid = id + 'g' + (++next);
    got.push("      { id: '" + bid + "', min: " + sol.length + ", rows: ['" + rw.join("', '") + "'] }");
  }
  console.error(id + ': ' + got.length + ' boards from ' + tries + ' tries · ' + (Date.now() - t0) + 'ms');
  out.push("    '" + id + "': [\n" + got.join(',\n') + '\n    ]');
});
console.log('{\n' + out.join(',\n') + '\n}');
