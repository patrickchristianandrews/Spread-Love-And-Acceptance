/* game-levels.js — difficulty levels, "Next" and "Random", and no repeats, for the word games.
   Each game has a few difficulty levels, each a file of puzzles (assets/js/puzzles/). "Next"
   goes through them in order (the puzzles in each file climb gently), moving up a level when
   one is finished; "Random" picks a puzzle you haven't seen at the same difficulty; and you can
   switch difficulty any time. It also offers a short tip from the program after each puzzle.
   Progress stays in this browser. */
(function () {
  'use strict';

  function create(opts) {
    var KEY = 'tol-levels-' + opts.game, tiers = opts.tiers, cache = {};
    var S = { tier: tiers[0].id, pos: {}, seen: {}, done: 0 };
    try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); for (var k in o) S[k] = o[k]; } } catch (e) {}
    if (!tiers.some(function (t) { return t.id === S.tier; })) S.tier = tiers[0].id;
    function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
    function tierOf(id) { return tiers.filter(function (t) { return t.id === id; })[0]; }

    // load a level's puzzles (a script that fills window.TOL_PUZZLES[file])
    function load(id) {
      var t = tierOf(id);
      if (t.list) return Promise.resolve(t.list);
      if (cache[id]) return cache[id];
      cache[id] = new Promise(function (res, rej) {
        var have = window.TOL_PUZZLES && window.TOL_PUZZLES[t.file];
        if (have) { t.list = have; return res(have); }
        var sc = document.createElement('script');
        sc.src = '/assets/js/puzzles/' + t.file + '.js';
        sc.onload = function () { t.list = (window.TOL_PUZZLES || {})[t.file] || []; res(t.list); };
        sc.onerror = function () { delete cache[id]; rej(new Error('could not load')); };
        document.head.appendChild(sc);
      });
      return cache[id];
    }
    function seen(id) { return S.seen[id] || (S.seen[id] = []); }
    function markSeen(id, i) { var s = seen(id); if (s.indexOf(i) === -1) s.push(i); if (s.length > 4000) s.splice(0, s.length - 4000); save(); }
    function count(id) { var t = tierOf(id); return t.list ? t.list.length : (t.size || 0); }

    // where you are: the puzzle for this level, and its number counting every level before it
    function current() {
      return load(S.tier).then(function (list) {
        var i = S.pos[S.tier] || 0;
        if (i >= list.length) i = 0;
        return { tier: tierOf(S.tier), index: i, puzzle: list[i], number: i + 1, of: list.length };
      });
    }
    function next() {
      var id = S.tier, list = tierOf(id).list || [], i = (S.pos[id] || 0) + 1;
      // skip ones already played at random
      while (i < list.length && seen(id).indexOf(i) !== -1) i++;
      if (i >= list.length) {
        var at = tiers.indexOf(tierOf(id));
        if (at < tiers.length - 1) { S.tier = tiers[at + 1].id; save(); return current().then(function (c) { c.movedUp = true; return c; }); }
        i = 0; // the very last level: start the hardest again from the top
      }
      S.pos[id] = i; save();
      return current();
    }
    function random() {
      return load(S.tier).then(function (list) {
        var id = S.tier, s = seen(id), left = [];
        for (var i = 0; i < list.length; i++) if (s.indexOf(i) === -1 && i !== (S.pos[id] || 0)) left.push(i);
        if (!left.length) { S.seen[id] = []; for (var j = 0; j < list.length; j++) left.push(j); } // seen them all: start fresh
        var pick = left[Math.floor(Math.random() * left.length)];
        S.pos[id] = pick; save();
        return current();
      });
    }
    function setTier(id) { if (!tierOf(id)) return current(); S.tier = id; save(); return current(); }
    function finished(c) { markSeen(c.tier.id, c.index); S.done++; save(); }

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
      if (w) w.textContent = c.tier.name + ' · ' + c.number + ' of ' + c.of;
    }

    return { load: load, current: current, next: next, random: random, setTier: setTier, finished: finished, bar: bar, paintBar: paintBar, state: function () { return S; }, tiers: tiers };
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

  window.TOLLevels = { create: create, programTip: programTip };
})();
