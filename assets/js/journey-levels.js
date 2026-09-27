/* journey-levels.js — the seven worlds of The Frequency Journey, and the small rules engine
   that both the game (frequency-journey.js) and the level checker (tools/journey/solve.js) use.

   Tiles
     .  ground            #  wall (trees, rocks, crystals… it depends on the world)
     A  first pal start    B  second pal start      O  the glowing tone (two tiles; both pals stand on it)
     T  thorny shadow: lifts when both pals stand beside it (touching, diagonals too) at the same time
     i  ice: a pal slides until something stops it
     b  ice block: push it; push it into water and it melts into a stepping-stone crossing
     ~  water          _  canyon / open sky (never walkable)
     *  light fragment: gather them all before the tone opens
     p q r  pressure plates     P Q R  bridge pieces over the canyon, up while a pal stands on the plate
                                     (a bridge piece also stays up under a pal who is on it)
     1-5  singing crystals: step on them in the order of the level's melody to clear the murk
     m  grey murk (clears when the melody is complete)
     x  illusion: looks like starry ground but isn't; a pal just bounces gently back
     h  hidden ground: looks like empty sky but is really there
*/
(function (root) {
  'use strict';

  var WORLDS = [
    { n: 1, hz: 396, name: 'The Whispering Shadows', theme: 'Letting go of fear', short: 'Shadows', mech: 'shadows',
      intro: 'A stormy forest. The lantern light only reaches a little way, and it shines brightest when the pals stay close. Thorny shadows lift when both pals stand beside them together.',
      lessons: [
        'It’s easier to be brave next to someone you trust.',
        'Staying close doesn’t mean standing still. You can move forward side by side.',
        'Some shadows only lift when you face them together.'
      ],
      summary: 'Learning to trust: fear gets smaller when you don’t have to carry it alone.',
      levels: [
        { min: 10, rows: [
          '#..#...',
          '.A.#.OO',
          '...#...',
          'B..T...',
          '#..#..#',
          '...#...',
          '..##..#'
        ], tip: 'Bring both pals right up beside the thorny shadow. Together, the shadow lifts.' },
        { min: 17, rows: [
          'A..#....',
          '.#.#.##.',
          '.#.....#',
          '.##T####',
          '...T..#.',
          '##.#..#.',
          '...#T...',
          'B..#.#OO'
        ], tip: 'Stay close and the lantern light grows. Each thorny shadow needs you both.' },
        { min: 22, rows: [
          '....#...#',
          '.A#.T.#.O',
          '..#.#.#.O',
          '#.#...#T#',
          '..###T#..',
          '.T.....#.',
          '.###.#...',
          '..B#.#.#.',
          '#......#.'
        ], tip: 'A longer walk through the dark. Keep each other in the light.' }
      ] },
    { n: 2, hz: 417, name: 'The Melting Glaciers', theme: 'Welcoming change', short: 'Glaciers', mech: 'glaciers',
      intro: 'A frozen land, starting to thaw. Ice is slippery: a pal slides until something stops it. Push ice blocks into the water and they melt into a crossing.',
      lessons: [
        'Old ways of doing things can melt into new paths.',
        'Sometimes you slide further than you planned. That’s okay; you can find your footing again.',
        'Change is easier when someone is there to help you stop and steady.'
      ],
      summary: 'Welcoming change: what was frozen can soften and carry you somewhere new.',
      levels: [
        { min: 13, rows: [
          'A..#...',
          '.b.#.OO',
          '.......',
          '##~~~##',
          '.......',
          'B.b....',
          '..#..#.'
        ], tip: 'Push an ice block into the water. It melts into a little crossing.' },
        { min: 12, rows: [
          'A.iiii~.',
          '..ii#i~.',
          '.biiii~O',
          '..i#ii~O',
          'B.iiii~.',
          '#.iiii~.',
          '..#ii#~.',
          '......~#'
        ], tip: 'On ice a pal slides until something stops it. A wall, a block, or the other pal can be a good stop.' },
        { min: 10, rows: [
          '.A..#..B.',
          '.b.##..b.',
          '...##....',
          '~~~~~~~~~',
          'iiiiiiiii',
          'iii#iiiii',
          'iiiiiiiii',
          'iiiii#iii',
          '###OO####'
        ], tip: 'Help each other stop on the ice. One pal can wait so the other has something to slide against.' }
      ] },
    { n: 3, hz: 528, name: 'The Golden Meadow', theme: 'Joy, and being kind to yourself', short: 'Meadow', mech: 'meadow',
      intro: 'A sunny field. Flowers bloom wherever the pals run. Gather every light fragment, then meet at the tone.',
      lessons: [
        'Little moments of light add up.',
        'Be as kind to yourself as you would be to your best friend.',
        'Joy grows where you let yourself wander freely.'
      ],
      summary: 'Joy and self-kindness: you deserve the same warmth you give to others.',
      levels: [
        { min: 16, rows: [
          '*.....#',
          '.A..*..',
          '...#...',
          '.*.#.OO',
          '...#...',
          'B....*.',
          '#..*...'
        ], tip: 'Gather the light fragments. Flowers bloom wherever the pals run.' },
        { min: 24, rows: [
          '*..#..*.',
          '.A.#....',
          '...##.#.',
          '.*......',
          '#..*.##.',
          '.#..#.*.',
          '.B..#...',
          '*.....OO'
        ], tip: 'Two pals gather twice as fast. Try splitting up for a moment, then meeting again.' },
        { min: 33, rows: [
          '*...#...*',
          '.A....#..',
          '..#.*.#..',
          '.*#......',
          '....###..',
          '##.*....*',
          '..B..##T#',
          '*..#..#..',
          '...#*.#OO'
        ], tip: 'A little thorny shadow has wandered in. You know what to do.' }
      ] },
    { n: 4, hz: 639, name: 'The Bridge of Echoes', theme: 'Connection', short: 'Bridge', mech: 'bridge',
      intro: 'A deep canyon. Stepping on a stone plate raises the bridge pieces that match it, so one pal holds steady while the other crosses. Then you swap.',
      lessons: [
        'What you do on your side of the canyon changes the path for someone else.',
        'Holding steady for a friend is a quiet kind of love.',
        'Taking turns helping each other keeps you both moving.'
      ],
      summary: 'Connection: we each walk our own path, and we make each other’s paths possible.',
      levels: [
        { min: 19, rows: [
          '...._OO',
          '.A.._..',
          '..p.P..',
          '...._..',
          'B..._q.',
          '...._..',
          '....Q..'
        ], tip: 'One pal stands on the plate to raise the bridge. The other crosses, then finds a plate to bring their pal over.' },
        { min: 14, rows: [
          'A.._.._.',
          '...P.qR.',
          '_______O',
          '_______O',
          '...._...',
          '.p..Q.r.',
          'B..._...',
          '...._...'
        ], tip: 'Two paths, one on each side. Each plate helps the other side.' },
        { min: 21, rows: [
          '...QQQQQ.',
          '.A.___._.',
          '.q.____..',
          '...__r._.',
          'B..P.OOR.',
          '..._..._p',
          '...____..',
          '#..___._.',
          '...___._.'
        ], tip: 'Take turns. Sometimes the kindest thing is to wait on a plate a little longer.' }
      ] },
    { n: 5, hz: 741, name: 'The Singing Valleys', theme: 'Finding your voice', short: 'Valleys', mech: 'valleys',
      intro: 'Giant crystals hum when a pal steps on them. Listen to the little melody, then step on the crystals in that order to clear the grey murk.',
      lessons: [
        'Listening first makes it easier to find the right words.',
        'When things get murky, slow down and try again, one note at a time.',
        'Your voice matters. Saying what’s true can clear the air.'
      ],
      summary: 'Finding your voice: listen closely, speak clearly, and the fog lifts.',
      levels: [
        { min: 15, rows: [
          '..#....',
          'A...1..',
          '..#..#.',
          '.3..m..',
          '..##mOO',
          'B...m..',
          '...2#..'
        ], melody: [1, 2, 3], tip: 'Tap Listen to hear the melody again. Step on the crystals in that order.' },
        { min: 15, rows: [
          '.2..#...',
          'A...#.3.',
          '..1.....',
          '##.#m##.',
          '..4.m..#',
          '.#..mm#.',
          'B.3.#mOO',
          '....#...'
        ], melody: [2, 1, 3, 4], tip: 'If a wrong crystal hums, the tune just starts again. Either pal can sing a note.' },
        { min: 19, rows: [
          '.1...#...',
          'A.#.4#.5.',
          '..#..#...',
          '.2.......',
          '#.##m#.##',
          '..3.m.3..',
          'B.#.mmm.#',
          '..1.m.mOO',
          '#...#.m..'
        ], melody: [1, 2, 3, 4, 5], tip: 'Five notes this time. Plan a path that avoids the notes you don’t need yet.' }
      ] },
    { n: 6, hz: 852, name: 'The Starry Summit', theme: 'Seeing clearly', short: 'Summit', mech: 'summit',
      intro: 'A night climb on ground made of constellations. Some stars aren’t really there, and some hidden ones are. Tap Look closely to see things as they are.',
      lessons: [
        'Not everything that looks solid is, and not everything that seems missing is gone.',
        'Take a quiet moment to look closely before you step.',
        'Trust what you know, even when the path is hard to see.'
      ],
      summary: 'Seeing clearly: looking past what seems true to what is true.',
      levels: [
        { min: 11, rows: [
          '___..OO',
          '_A._x._',
          '_..h.._',
          '_x.h.x_',
          '_..x.._',
          '_B.h.._',
          '___.___'
        ], tip: 'Tap Look closely to see which stars are real. Walking into an illusion only bounces you back.' },
        { min: 13, rows: [
          'A....x..',
          '__h____x',
          '__..h.hO',
          '_______O',
          '_____h..',
          '___..._x',
          '___h___x',
          'B.......'
        ], tip: 'Some paths are hidden in the dark between stars.' },
        { min: 15, rows: [
          '_...h..OO',
          '_.x._x.._',
          'Ah_.T._x_',
          '.._hx.h._',
          '_x.._.x._',
          '_.hx_h..#',
          'x._.._x._',
          'B.h.x..h_',
          '__.x_...x'
        ], tip: 'Look closely, then trust what you saw. A shadow waits near the top; face it together.' }
      ] },
    { n: 7, hz: 963, name: 'The Infinite Sky', theme: 'The Perfect Frequency', short: 'Sky', mech: 'sky',
      intro: 'The pals made it, together and still themselves. There’s nothing left to solve. Tap the sky to place stars that chime, and the pals will float over to play.',
      lessons: ['You made it together, and you’re still wholly yourselves.'],
      summary: 'The Perfect Frequency: stay as long as you like. This is a place to rest.',
      levels: [] }
  ];

  /* ------------------------------------------------------------------ the engine */
  var DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // up, right, down, left
  var FLOORISH = '.ABhi*O12345pqr'; // tiles a pal can stand on (given no other rules)

  function parse(level, world) {
    var rows = level.rows, H = rows.length, W = rows[0].length, g = [], L = {
      W: W, H: H, g: g, a: -1, b: -1, blocks: [], goal: [], water: [], thorns: [], frags: [], murk: [],
      melody: level.melody || [], world: world
    };
    for (var y = 0; y < H; y++) {
      if (rows[y].length !== W) throw new Error('Ragged row ' + y + ' in world ' + world);
      for (var x = 0; x < W; x++) {
        var c = rows[y][x], i = y * W + x;
        if (c === 'A') { L.a = i; c = '.'; }
        else if (c === 'B') { L.b = i; c = '.'; }
        else if (c === 'b') { L.blocks.push(i); c = '.'; }
        if (c === 'O') L.goal.push(i);
        if (c === '~') L.water.push(i);
        if (c === 'T') L.thorns.push(i);
        if (c === '*') L.frags.push(i);
        if (c === 'm') L.murk.push(i);
        g.push(c);
      }
    }
    return L;
  }

  function init(L) { return { a: L.a, b: L.b, k: L.blocks.slice().sort(num), wm: 0, tm: 0, fm: 0, pr: 0, mc: 0 }; }
  function num(x, y) { return x - y; }
  function clone(S) { return { a: S.a, b: S.b, k: S.k.slice(), wm: S.wm, tm: S.tm, fm: S.fm, pr: S.pr, mc: S.mc }; }
  function key(S) { return S.a + ',' + S.b + '|' + S.k.join(',') + '|' + S.wm + '|' + S.tm + '|' + S.fm + '|' + S.pr + '|' + S.mc; }
  function pal(S, w) { return w ? S.b : S.a; }
  function nb(L, i, d) {
    var x = i % L.W + DIRS[d][0], y = (i / L.W | 0) + DIRS[d][1];
    return x < 0 || y < 0 || x >= L.W || y >= L.H ? -1 : y * L.W + x;
  }
  function cheb(L, i, j) { return Math.max(Math.abs(i % L.W - j % L.W), Math.abs((i / L.W | 0) - (j / L.W | 0))); }
  function melted(L, S, i) { var k = L.water.indexOf(i); return k >= 0 && (S.wm >> k & 1) === 1; }
  function pressed(L, S, letter) { return L.g[S.a] === letter || L.g[S.b] === letter; }

  // can a pal stand on tile i (ignoring pals and blocks)? why = reason it can't
  function ground(L, S, i, who) {
    if (i < 0) return 'edge';
    var c = L.g[i];
    if (FLOORISH.indexOf(c) >= 0) return '';
    if (c === '~') return melted(L, S, i) ? '' : 'water';
    if (c === 'T') return (S.tm >> L.thorns.indexOf(i) & 1) ? '' : 'thorn';
    if (c === 'm') return S.mc ? '' : 'murk';
    if (c === 'x') return 'illusion';
    if (c === 'P' || c === 'Q' || c === 'R') {
      if (pressed(L, S, c.toLowerCase())) return '';
      if (pal(S, 1 - who) === i || pal(S, who) === i) return ''; // a bridge piece holds under a pal
      return 'bridge';
    }
    if (c === '#') return 'wall';
    return 'gap';
  }
  // can an ice block rest on tile i?
  function blockGround(L, S, i) {
    if (i < 0) return false;
    var c = L.g[i];
    return c === '.' || c === 'i' || (c === '~' && melted(L, S, i));
  }

  // enter a tile: gather, sing, reveal
  function enter(L, S, i, who, ev) {
    var c = L.g[i];
    if (c === '*') { var f = L.frags.indexOf(i); if (!(S.fm >> f & 1)) { S.fm |= 1 << f; ev.push({ t: 'frag', i: i, who: who, all: S.fm === (1 << L.frags.length) - 1 }); } }
    else if (c >= '1' && c <= '5') {
      var n = +c;
      if (S.mc) ev.push({ t: 'note', i: i, n: n, who: who, free: true });
      else if (L.melody[S.pr] === n) {
        S.pr++;
        ev.push({ t: 'note', i: i, n: n, who: who, ok: true, pr: S.pr });
        if (S.pr === L.melody.length) { S.mc = 1; ev.push({ t: 'clear' }); }
      } else {
        S.pr = L.melody[0] === n ? 1 : 0;
        ev.push({ t: 'note', i: i, n: n, who: who, ok: false, pr: S.pr });
      }
    } else if (c === 'h') ev.push({ t: 'hidden', i: i });
  }

  // one pal tries one step
  function stepOne(L, S, who, d, ev, paths) {
    var from = pal(S, who), t = nb(L, from, d), other = pal(S, 1 - who);
    if (t < 0) return false;
    if (t === other) { ev.push({ t: 'bump', who: who, i: t }); return false; }
    var why = ground(L, S, t, who);
    if (why) { ev.push({ t: why === 'illusion' ? 'bounce' : 'bump', why: why, who: who, i: t }); return false; }
    var bk = S.k.indexOf(t);
    if (bk >= 0) {
      var u = nb(L, t, d);
      if (u < 0 || u === other || u === from || S.k.indexOf(u) >= 0) { ev.push({ t: 'bump', why: 'block', who: who, i: t }); return false; }
      if (L.g[u] === '~' && !melted(L, S, u)) {
        S.k.splice(bk, 1); S.wm |= 1 << L.water.indexOf(u);
        ev.push({ t: 'melt', from: t, i: u, who: who });
      } else if (blockGround(L, S, u)) {
        S.k[bk] = u; S.k.sort(num);
        ev.push({ t: 'push', from: t, i: u, who: who });
      } else { ev.push({ t: 'bump', why: 'block', who: who, i: t }); return false; }
    }
    var path = [from, t];
    if (who) S.b = t; else S.a = t;
    enter(L, S, t, who, ev);
    // slide across ice
    var cur = t, guard = 0;
    while (L.g[cur] === 'i' && guard++ < 99) {
      var n = nb(L, cur, d);
      if (n < 0 || n === pal(S, 1 - who) || S.k.indexOf(n) >= 0 || ground(L, S, n, who)) break;
      cur = n; path.push(n);
      if (who) S.b = n; else S.a = n;
      enter(L, S, n, who, ev);
    }
    if (path.length > 2) ev.push({ t: 'slide', who: who });
    paths[who] = path;
    return true;
  }

  // who: 0, 1, or 2 (both together). Returns { s, ev, paths, moved } — s is a fresh state.
  function step(L, S0, who, d) {
    var S = clone(S0), ev = [], paths = [null, null], moved = false;
    if (who === 2) {
      var dx = DIRS[d][0], dy = DIRS[d][1];
      var pa = (S.a % L.W) * dx + (S.a / L.W | 0) * dy, pb = (S.b % L.W) * dx + (S.b / L.W | 0) * dy;
      var order = pa >= pb ? [0, 1] : [1, 0];
      order.forEach(function (w) { if (stepOne(L, S, w, d, ev, paths)) moved = true; });
    } else moved = stepOne(L, S, who, d, ev, paths);
    if (moved) {
      L.thorns.forEach(function (ti, k) {
        if (!(S.tm >> k & 1) && cheb(L, S.a, ti) <= 1 && cheb(L, S.b, ti) <= 1) { S.tm |= 1 << k; ev.push({ t: 'lift', i: ti }); }
      });
    }
    return { s: S, ev: ev, paths: paths, moved: moved };
  }

  function allFrags(L, S) { return S.fm === (1 << L.frags.length) - 1; }
  function won(L, S) { return allFrags(L, S) && L.goal.indexOf(S.a) >= 0 && L.goal.indexOf(S.b) >= 0; }

  // breadth-first search for the fewest moves. Actions are [who, dir]; who 2 = together.
  function solve(L, S0, maxNodes) {
    S0 = S0 || init(L); maxNodes = maxNodes || 2e6;
    var start = key(S0); if (won(L, S0)) return [];
    var seen = new Map(); seen.set(start, null);
    var q = [S0], keys = [start], head = 0;
    while (head < q.length) {
      if (seen.size > maxNodes) return null;
      var S = q[head], k0 = keys[head]; head++;
      for (var who = 0; who < 3; who++) for (var d = 0; d < 4; d++) {
        var r = step(L, S, who, d); if (!r.moved) continue;
        var k = key(r.s); if (seen.has(k)) continue;
        seen.set(k, [k0, who, d]);
        if (won(L, r.s)) {
          var out = [], cur = k;
          while (seen.get(cur)) { var e = seen.get(cur); out.unshift([e[1], e[2]]); cur = e[0]; }
          return out;
        }
        q.push(r.s); keys.push(k);
      }
    }
    return false; // unsolvable
  }

  var api = { WORLDS: WORLDS, DIRS: DIRS, parse: parse, init: init, clone: clone, key: key, step: step, won: won, allFrags: allFrags,
    solve: solve, ground: ground, melted: melted, pressed: pressed, nb: nb, cheb: cheb };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TOLJourney = api;
})(this);
