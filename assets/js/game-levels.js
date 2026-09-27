/* game-levels.js — difficulty levels, "Next" and "Random", and no repeats, for the word games.
   Each game has a few difficulty levels. Each level is a bank of puzzles split into small chunk files
   (assets/js/puzzles/<bank>-<k>.js, sizes listed in assets/js/puzzles/index.js), so a game only ever
   downloads the chunk it needs. "Next" goes through a bank in order (the puzzles climb gently),
   moving up a level at the end; "Random" picks one you haven't seen at the same difficulty; and you
   can switch difficulty any time.
   No repeats: every puzzle you're shown is remembered (a compact bitset per level, in this browser),
   and neither Next nor Random shows it again. Once a whole bank has been seen, the game makes brand-new
   puzzles for you (each game's own generator, seeded so each one is different), so it never runs dry.
   It also offers a short tip from the program after each puzzle. Progress stays in this browser. */
(function () {
  'use strict';

  var BASE = '/assets/js/puzzles/';
  var scripts = {};
  function script(name) {
    if (scripts[name]) return scripts[name];
    scripts[name] = new Promise(function (res, rej) {
      var sc = document.createElement('script');
      sc.src = BASE + name + '.js';
      sc.onload = function () { res(); };
      sc.onerror = function () { delete scripts[name]; sc.remove(); rej(new Error('could not load ' + name)); };
      document.head.appendChild(sc);
    });
    return scripts[name];
  }
  // how big each bank is (a tiny file every game shares)
  function index() {
    if (window.TOL_PUZZLE_INDEX) return Promise.resolve(window.TOL_PUZZLE_INDEX);
    return script('index').then(function () { return window.TOL_PUZZLE_INDEX || {}; });
  }
  function chunk(bank, k) {
    var key = bank + '-' + k, have = window.TOL_PUZZLES && window.TOL_PUZZLES[key];
    if (have) return Promise.resolve(have);
    return script(key).then(function () { return (window.TOL_PUZZLES || {})[key] || []; });
  }
  function puzzleAt(bank, info, i) { return chunk(bank, Math.floor(i / info.per)).then(function (list) { return list[i % info.per]; }); }

  // ---------- a compact record of what you've seen: one bit per puzzle, stored as base64 ----------
  function Bits(str) {
    this.b = [];
    if (str) { try { var s = atob(str); for (var i = 0; i < s.length; i++) this.b.push(s.charCodeAt(i)); } catch (e) { this.b = []; } }
  }
  Bits.prototype.has = function (i) { return !!((this.b[i >> 3] || 0) & (1 << (i & 7))); };
  Bits.prototype.add = function (i) { while (this.b.length <= (i >> 3)) this.b.push(0); this.b[i >> 3] |= 1 << (i & 7); };
  Bits.prototype.count = function (n) { var c = 0; for (var i = 0; i < n; i++) if (this.has(i)) c++; return c; };
  Bits.prototype.toString = function () { var s = ''; for (var i = 0; i < this.b.length; i++) s += String.fromCharCode(this.b[i]); return btoa(s); };

  // a small, seeded random number generator (mulberry32) and a string hash, for the generators
  function rng(seed) {
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  function create(opts) {
    var KEY = 'tol-levels-' + opts.game, tiers = opts.tiers, RECENT = 12;
    var S = { tier: tiers[0].id, pos: {}, seen: {}, fin: {}, gen: {}, recent: [], done: 0, v: 2 };
    var stored = null;
    try { var raw = localStorage.getItem(KEY); if (raw) { stored = JSON.parse(raw); for (var k in stored) S[k] = stored[k]; } } catch (e) {}
    if (!tiers.some(function (t) { return t.id === S.tier; })) S.tier = tiers[0].id;
    // an older record listed the puzzles you'd finished; the banks kept those first, so they carry over
    if (stored && stored.v !== 2) {
      Object.keys(S.seen || {}).forEach(function (id) {
        var old = S.seen[id];
        if (Array.isArray(old)) {
          var b = new Bits(); old.forEach(function (i) { if (i >= 0) b.add(i); }); S.seen[id] = b.toString();
          if (old.indexOf(S.pos && S.pos[id] || 0) !== -1) { S.fin = S.fin || {}; S.fin[id] = S.pos[id] || 0; } // finished: move on
        }
      });
      S.fin = S.fin || {}; S.gen = S.gen || {}; S.recent = S.recent || []; S.v = 2;
    }
    // a game whose levels share one bank (Quiet Words: the same themes at every level) keeps one
    // record for all of them, so a theme played at one level doesn't come back at another
    var bits = {};
    function sk(id) { return opts.shareSeen ? '*' : id; }
    if (opts.shareSeen && !S.seen['*']) {
      var all = new Bits();
      tiers.forEach(function (t) { var b = new Bits(typeof S.seen[t.id] === 'string' ? S.seen[t.id] : ''); for (var i = 0; i < b.b.length * 8; i++) if (b.has(i)) all.add(i); });
      S.seen['*'] = all.toString();
    }
    function seenBits(id) { var k = sk(id); return bits[k] || (bits[k] = new Bits(S.seen[k])); }
    function save() {
      Object.keys(bits).forEach(function (id) { S.seen[id] = bits[id].toString(); });
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    }
    function tierOf(id) { return tiers.filter(function (t) { return t.id === id; })[0]; }
    function bankOf(t) { return t.bank || t.file; }
    var sizes = null;
    function info(t) {
      return index().then(function (idx) {
        sizes = idx;
        var inf = idx[bankOf(t)];
        if (!inf) throw new Error('no bank ' + bankOf(t));
        return inf;
      });
    }
    // how many puzzles come before this level, so level numbers can run on across levels
    function base(t) { var b = 0; for (var i = 0; i < tiers.length && tiers[i] !== t; i++) { var inf = sizes && sizes[bankOf(tiers[i])]; if (inf && bankOf(tiers[i]) !== bankOf(t)) b += inf.n; } return b; }

    function remember(key) {
      if (key == null) return;
      S.recent = (S.recent || []).filter(function (k) { return k !== key; });
      S.recent.push(key); if (S.recent.length > RECENT) S.recent.splice(0, S.recent.length - RECENT);
    }
    function keyOf(p) { try { return opts.keyOf ? opts.keyOf(p) : null; } catch (e) { return null; } }

    // a brand-new puzzle from the game's own generator, once the bank has been seen
    function generated(t, inf, i) {
      var g = i - inf.n, seed = hash(opts.game + ':' + t.id + ':' + g + ':' + (S.salt || (S.salt = Math.floor(Math.random() * 1e9))));
      var ctx = {
        tier: t, bank: bankOf(t), size: inf.n, seed: seed, rand: rng(seed), number: g + 1, recent: (S.recent || []).slice(),
        puzzle: function (j) { return puzzleAt(bankOf(t), inf, ((j % inf.n) + inf.n) % inf.n); },
        chunk: function (k) { return chunk(bankOf(t), ((k % inf.c) + inf.c) % inf.c); }, chunks: inf.c
      };
      if (!opts.generate) return puzzleAt(bankOf(t), inf, g % inf.n); // no generator: go round the bank again
      // the one you're playing is kept, so it's still the same puzzle if you come back later
      var GKEY = KEY + '-made', kept = null;
      try { kept = JSON.parse(localStorage.getItem(GKEY) || 'null'); } catch (e) {}
      if (kept && kept.t === t.id && kept.i === i && kept.p) return Promise.resolve(kept.p);
      return Promise.resolve(opts.generate(ctx)).then(function (p) {
        if (!p) throw new Error('nothing made');
        try { localStorage.setItem(GKEY, JSON.stringify({ t: t.id, i: i, p: p })); } catch (e) {}
        return p;
      });
    }

    // where you are: the puzzle for this level, and its number counting every level before it
    function current() {
      var t = tierOf(S.tier);
      return info(t).then(function (inf) {
        var id = t.id, i = S.pos[id] || 0, seen = seenBits(id);
        // the puzzle you finished last time: move on to one you haven't seen
        if (S.fin[id] === i) { i = nextUnseen(id, inf, i, true); S.pos[id] = i; delete S.fin[id]; }
        if (i < inf.n) seen.add(i); else S.gen[id] = Math.max(S.gen[id] || 0, i - inf.n + 1);
        save();
        var got = i < inf.n ? puzzleAt(bankOf(t), inf, i) : generated(t, inf, i);
        return got.then(function (p) {
          remember(keyOf(p)); save();
          return { tier: t, index: i, puzzle: p, number: i + 1, of: inf.n, fresh: i >= inf.n ? i - inf.n + 1 : 0, base: base(t) };
        });
      });
    }
    // the next unseen puzzle after i, going round to the start; past the end, a new one
    function nextUnseen(id, inf, i, wrap) {
      var seen = seenBits(id);
      if (i >= inf.n) return Math.max(i + 1, inf.n + (S.gen[id] || 0));
      for (var j = i + 1; j < inf.n; j++) if (!seen.has(j)) return j;
      if (wrap) for (j = 0; j < i; j++) if (!seen.has(j)) return j;
      return inf.n + (S.gen[id] || 0);
    }
    // not something you've just played (the same answers, or the same theme at another level):
    // step on to the next unseen one instead; the skipped one stays unseen for later
    function avoidRecent(t, inf, j) {
      if (!opts.keyOf || j >= inf.n) return Promise.resolve(j);
      var tries = 0;
      function look(k) {
        return puzzleAt(bankOf(t), inf, k).then(function (p) {
          if ((S.recent || []).indexOf(keyOf(p)) === -1 || ++tries > RECENT) return k;
          var n2 = nextUnseen(t.id, inf, k, true);
          return n2 >= inf.n || n2 === j ? k : look(n2);
        });
      }
      return look(j);
    }
    function next() {
      var t = tierOf(S.tier);
      return info(t).then(function (inf) {
        var id = t.id, i = S.pos[id] || 0, j = nextUnseen(id, inf, i, false);
        if (j >= inf.n && i < inf.n) {
          // the end of this level: move up, or (at the top) go back for any skipped, then new ones
          var at = tiers.indexOf(t);
          if (at < tiers.length - 1) {
            var up = tiers[at + 1];
            S.tier = up.id; save();
            return info(up).then(function (inf2) {
              var k = S.pos[up.id] || 0;
              if (S.fin[up.id] === k) { k = nextUnseen(up.id, inf2, k, true); delete S.fin[up.id]; }
              return avoidRecent(up, inf2, k);
            }).then(function (k) { S.pos[up.id] = k; save(); return current(); }).then(function (c) { c.movedUp = true; return c; });
          }
          j = nextUnseen(id, inf, i, true);
        }
        return avoidRecent(t, inf, j).then(function (k) {
          S.pos[id] = k; delete S.fin[id]; save();
          return current();
        });
      });
    }
    function random() {
      var t = tierOf(S.tier);
      return info(t).then(function (inf) {
        var id = t.id, seen = seenBits(id), cur = S.pos[id] || 0, left = [];
        for (var i = 0; i < inf.n; i++) if (!seen.has(i) && i !== cur) left.push(i);
        if (!left.length) { S.pos[id] = nextUnseen(id, inf, Math.max(cur, inf.n - 1), false); delete S.fin[id]; save(); return current(); }
        var pick = left[Math.floor(Math.random() * left.length)];
        // not the same answers or theme as something you've just played: try others in the same chunk
        return puzzleAt(bankOf(t), inf, pick).then(function (p) {
          var recent = S.recent || [];
          if (opts.keyOf && recent.indexOf(keyOf(p)) !== -1) {
            var k = Math.floor(pick / inf.per), list = (window.TOL_PUZZLES || {})[bankOf(t) + '-' + k] || [];
            for (var tries = 0; tries < list.length; tries++) {
              var j = k * inf.per + Math.floor(Math.random() * list.length);
              if (j < inf.n && !seen.has(j) && j !== cur && recent.indexOf(keyOf(list[j % inf.per])) === -1) { pick = j; break; }
            }
          }
          S.pos[id] = pick; delete S.fin[id]; save();
          return current();
        });
      });
    }
    // a particular puzzle in this level (Quiet Words' "Choose a theme")
    function pick(i) { S.pos[S.tier] = i; delete S.fin[S.tier]; save(); return current(); }
    function setTier(id) { if (!tierOf(id)) return current(); S.tier = id; save(); return current(); }
    function finished(c) { S.fin[c.tier.id] = c.index; S.done++; save(); }
    // how many you've seen at a level, out of how many there are
    function progress(id) { var t = tierOf(id || S.tier); return info(t).then(function (inf) { return { seen: seenBits(t.id).count(inf.n), of: inf.n, fresh: S.gen[t.id] || 0 }; }); }

    // the bar: difficulty chips, where you are, and the Next / Random buttons
    function bar(el, onPick) {
      el.classList.add('gl-bar');
      el.innerHTML = '<div class="gl-tiers" role="group" aria-label="Difficulty">' + tiers.map(function (t) {
        return '<button type="button" data-tier="' + t.id + '" aria-pressed="' + (t.id === S.tier) + '">' + t.name + '</button>';
      }).join('') + '</div><div class="gl-row"><span class="gl-where" aria-live="polite"></span>' +
        '<button type="button" class="gl-rand" title="A random puzzle you haven’t played, at this difficulty">&#127922; Random</button>' +
        '<button type="button" class="gl-next">Next &rarr;</button></div>';
      el.addEventListener('click', function (e) {
        var t = e.target.closest('[data-tier]');
        if (t) return onPick(setTier(t.getAttribute('data-tier')));
        if (e.target.closest('.gl-rand')) return onPick(random());
        if (e.target.closest('.gl-next')) return onPick(next());
      });
    }
    function paintBar(el, c) {
      Array.prototype.forEach.call(el.querySelectorAll('[data-tier]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-tier') === c.tier.id)); });
      var w = el.querySelector('.gl-where');
      if (w) {
        w.textContent = c.tier.name + ' · ' + (c.fresh ? 'fresh puzzle ' + c.fresh : c.number + ' of ' + c.of.toLocaleString('en-US'));
        w.title = c.fresh ? 'You’ve seen every puzzle at this level, so this one was made just for you.' : 'You won’t see the same puzzle twice at this level.';
      }
    }

    return { load: function (id) { var t = tierOf(id); return info(t); }, current: current, next: next, random: random, pick: pick, setTier: setTier,
      finished: finished, progress: progress, bar: bar, paintBar: paintBar, state: function () { return S; }, tiers: tiers };
  }

  // ---------- shared by the generators: a crossword-style layout, and a dense-grid filler ----------
  // place(): the same layout as tools/word-games/layout.py. Each new word crosses one already placed,
  // with no letters touching side by side except at crossings. Returns { w: [[WORD, r, c, 'a'|'d']], W, H }.
  function place(words, maxW, maxH, rand, tries) {
    tries = tries || 30;
    var best = null;
    function fits(grid, used, word, r, c, d, b) {
      var dr = d === 'a' ? 0 : 1, dc = d === 'a' ? 1 : 0, r1 = r + dr * (word.length - 1), c1 = c + dc * (word.length - 1);
      if (Math.max(b[3], c1) - Math.min(b[1], c) + 1 > maxW || Math.max(b[2], r1) - Math.min(b[0], r) + 1 > maxH) return -1;
      if (grid[(r - dr) + ',' + (c - dc)] || grid[(r1 + dr) + ',' + (c1 + dc)]) return -1;
      var cross = 0;
      for (var i = 0; i < word.length; i++) {
        var rr = r + dr * i, cc = c + dc * i, k = rr + ',' + cc, have = grid[k];
        if (have) { if (have !== word[i] || (used[k] || '').indexOf(d) !== -1) return -1; cross++; continue; }
        if (dr === 0) { if (grid[(rr - 1) + ',' + cc] || grid[(rr + 1) + ',' + cc]) return -1; }
        else if (grid[rr + ',' + (cc - 1)] || grid[rr + ',' + (cc + 1)]) return -1;
      }
      return cross === word.length ? -1 : cross;
    }
    for (var t = 0; t < tries; t++) {
      var order = words.slice().sort(function (a, b) { return b.length - a.length || rand() - 0.5; });
      if (t) { var head = order.slice(0, 1), rest = order.slice(1).map(function (w) { return [w, -w.length + rand() * 2]; }); rest.sort(function (a, b) { return a[1] - b[1]; }); order = head.concat(rest.map(function (x) { return x[0]; })); }
      var first = order[0]; if (!first || first.length > maxW) continue;
      var grid = {}, used = {}, placed = [[first, 0, 0, 'a']], b = [0, 0, 0, first.length - 1];
      for (var i = 0; i < first.length; i++) { grid['0,' + i] = first[i]; used['0,' + i] = 'a'; }
      for (var n = 1; n < order.length; n++) {
        var w = order[n], opts = null, bestScore = -1e9;
        for (var p = 0; p < placed.length; p++) {
          var pw = placed[p];
          for (var a = 0; a < pw[0].length; a++) for (var j = 0; j < w.length; j++) {
            if (pw[0][a] !== w[j]) continue;
            var d = pw[3] === 'a' ? 'd' : 'a', cr = pw[3] === 'a' ? pw[1] : pw[1] + a, cc = pw[3] === 'a' ? pw[2] + a : pw[2];
            var r = d === 'd' ? cr - j : cr, c = d === 'd' ? cc : cc - j, x = fits(grid, used, w, r, c, d, b);
            if (x > 0) {
              var nr1 = r + (d === 'd' ? w.length - 1 : 0), nc1 = c + (d === 'a' ? w.length - 1 : 0);
              var area = (Math.max(b[2], nr1) - Math.min(b[0], r) + 1) * (Math.max(b[3], nc1) - Math.min(b[1], c) + 1);
              var score = x * 10 - area * 0.2 + rand();
              if (score > bestScore) { bestScore = score; opts = [w, r, c, d]; }
            }
          }
        }
        if (!opts) continue;
        var ddr = opts[3] === 'a' ? 0 : 1, ddc = opts[3] === 'a' ? 1 : 0;
        for (i = 0; i < w.length; i++) { var kk = (opts[1] + ddr * i) + ',' + (opts[2] + ddc * i); grid[kk] = w[i]; used[kk] = (used[kk] || '') + opts[3]; }
        placed.push(opts);
        b = [Math.min(b[0], opts[1]), Math.min(b[1], opts[2]), Math.max(b[2], opts[1] + ddr * (w.length - 1)), Math.max(b[3], opts[2] + ddc * (w.length - 1))];
      }
      var h = b[2] - b[0] + 1, wd = b[3] - b[1] + 1, sc = placed.length * 1000 - Math.abs(h - wd) - h * wd * 0.05;
      if (!best || sc > best.sc) best = { sc: sc, w: placed.map(function (x) { return [x[0], x[1] - b[0], x[2] - b[1], x[3]]; }), W: wd, H: h };
      if (placed.length === words.length) break;
    }
    return best || { w: [], W: 0, H: 0 };
  }

  // the slots (across and down runs of 2+ white squares) of a pattern like ['##...', '#....', ...]
  function slots(g) {
    var n = g.length, out = [], r, c, s;
    for (r = 0; r < n; r++) for (c = 0; c < n;) { if (g[r][c] === '#') { c++; continue; } s = c; while (c < n && g[r][c] !== '#') c++; if (c - s > 1) out.push(['a', r, s, c - s]); }
    for (c = 0; c < n; c++) for (r = 0; r < n;) { if (g[r][c] === '#') { r++; continue; } s = r; while (r < n && g[r][c] !== '#') r++; if (r - s > 1) out.push(['d', s, c, r - s]); }
    return out;
  }
  // fill(): fill every slot of a pattern from a word list (most-constrained slot first, with
  // backtracking), within a time budget. Returns [[WORD, r, c, d], ...] or null.
  function fill(pattern, words, rand, ms) {
    var until = Date.now() + (ms || 1500), g = pattern.map(function (row) { return row.split(''); }), sl = slots(pattern);
    var byLen = {}, usedW = {};
    words.forEach(function (w) { (byLen[w.length] = byLen[w.length] || []).push(w); });
    Object.keys(byLen).forEach(function (L) { var a = byLen[L]; for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } });
    var cells = sl.map(function (s) { var out = []; for (var i = 0; i < s[3]; i++) out.push(s[0] === 'a' ? [s[1], s[2] + i] : [s[1] + i, s[2]]); return out; });
    var done = sl.map(function () { return null; });
    function fits(k, w) { var cs = cells[k]; for (var i = 0; i < cs.length; i++) { var ch = g[cs[i][0]][cs[i][1]]; if (ch !== '.' && ch !== w[i]) return false; } return true; }
    function options(k, limit) { var out = [], list = byLen[sl[k][3]] || []; for (var i = 0; i < list.length && out.length < limit; i++) if (!usedW[list[i]] && fits(k, list[i])) out.push(list[i]); return out; }
    function rec() {
      if (Date.now() > until) return false;
      var best = -1, bestOpts = null;
      for (var k = 0; k < sl.length; k++) {
        if (done[k]) continue;
        var o = options(k, 40);
        if (!o.length) return false;
        if (!bestOpts || o.length < bestOpts.length) { best = k; bestOpts = o; if (o.length === 1) break; }
      }
      if (best < 0) return true;
      for (var i = 0; i < Math.min(bestOpts.length, 8); i++) {
        var w = bestOpts[i], cs = cells[best], saved = cs.map(function (p) { return g[p[0]][p[1]]; });
        cs.forEach(function (p, j) { g[p[0]][p[1]] = w[j]; });
        done[best] = w; usedW[w] = true;
        if (rec()) return true;
        done[best] = null; delete usedW[w];
        cs.forEach(function (p, j) { g[p[0]][p[1]] = saved[j]; });
      }
      return false;
    }
    if (!rec()) return null;
    return sl.map(function (s, k) { return [done[k], s[1], s[2], s[0]]; });
  }

  // A short tip from the program, from the mini-dive glossary, with a link to read more
  var tipAt = Math.floor(Math.random() * 1000);
  function programTip() {
    var G = window.TOL_DIVES;
    if (!G) {
      if (!document.querySelector('script[src="/assets/js/dives-glossary.js"]')) { var sc = document.createElement('script'); sc.src = '/assets/js/dives-glossary.js'; document.head.appendChild(sc); }
      return '';
    }
    var keys = Object.keys(G).filter(function (k) { return G[k].u; });
    var k = keys[(tipAt++) % keys.length], d = G[k], first = d.s || (d.d || '').split('\n')[0];
    return '<div class="gl-tip"><p class="gl-tip-k">&#127793; From the program</p><p><b>' + esc(d.t) + ':</b> ' + esc(first) + '</p>' +
      '<p><a href="' + esc(d.u) + '">' + esc(d.l || 'Read more') + ' &rarr;</a></p></div>';
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // warm the glossary up early
  if (typeof document !== 'undefined') setTimeout(function () { programTip(); }, 1500);

  window.TOLLevels = { create: create, programTip: programTip, rng: rng, hash: hash, Bits: Bits, script: script, chunk: chunk, index: index, place: place, slots: slots, fill: fill };
})();
