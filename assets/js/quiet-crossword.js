/* quiet-crossword.js — Quiet Crossword (/quiet-crossword.html): small, gentle crosswords.
   Tap a square (tap it again to switch between across and down) and type with the
   on-screen keys or a keyboard. Each word glows softly when it's right. "Next" goes on
   in order, "Random" (or "A random one") picks one you haven't played, and you can change the difficulty
   any time (game-levels.js). Every puzzle counts as a level, with a kinder note for no reveals (rewards.js). No timer, no way to lose. Progress stays in this browser. */
(function () {
  'use strict';
  var root = document.getElementById('xw'); if (!root) return;
  if (!window.TOLLevels) return;
  // one engine, two kinds of crossword: the friendly free-form ones, and newspaper-style grids
  var PAPER = root.getAttribute('data-mode') === 'paper';
  // Each level is a big bank of puzzles, loaded a chunk at a time (game-levels.js). Once you've seen a
  // whole bank, new puzzles are made right here (make() below) from the answers and clues in the bank.
  var levels = window.TOLLevels.create(PAPER ? { game: 'paper', tiers: [
    { id: 'mini', name: 'Mini', bank: 'np-mini' }, { id: 'small', name: 'Easy', bank: 'np-small' }, { id: 'daily', name: 'Daily', bank: 'np-daily' },
    { id: 'weekend', name: 'Weekend', bank: 'np-weekend' }, { id: 'sunday', name: 'Big Sunday', bank: 'np-sunday' }], keyOf: keyOf, generate: make } : { game: 'crossword', tiers: [
    { id: 'gentle', name: 'Gentle', bank: 'xw-gentle' }, { id: 'easy', name: 'Easy', bank: 'xw-easy' }, { id: 'medium', name: 'Medium', bank: 'xw-medium' },
    { id: 'hard', name: 'Hard', bank: 'xw-hard' }, { id: 'expert', name: 'Expert', bank: 'xw-expert' }], keyOf: keyOf, generate: make });
  // two puzzles are "alike" if they share a theme (Gentle) or the very same answers
  function keyOf(p) { return p.t && !/^(Easy|Medium|Hard|Expert)$/.test(p.t) ? 'theme:' + p.t : p.w.map(function (w) { return w[0]; }).sort().join(' '); }

  // ---------- new puzzles, made in the browser once a whole bank has been seen ----------
  // The answers and clues come from a few chunks of the same bank (so they're the same gentle words,
  // clued the same careful way), shuffled into a brand-new grid: a free-form crossword like the bank's
  // own, or for the newspaper, a fresh fill of one of the bank's patterns.
  var SIZE = { easy: [8, 6, 9], medium: [9, 9, 12], hard: [10, 10, 14], expert: [10, 10, 16], gentle: [8, 6, 11],
    mini: [5, 4, 8], small: [7, 6, 12], daily: [9, 9, 16], weekend: [11, 12, 22], sunday: [13, 14, 28] };
  function make(ctx) {
    var rand = ctx.rand, ks = [], want = Math.min(ctx.chunks, PAPER ? 4 : 3);
    while (ks.length < want) { var k = Math.floor(rand() * ctx.chunks); if (ks.indexOf(k) === -1) ks.push(k); }
    return Promise.all(ks.map(ctx.chunk)).then(function (lists) {
      var all = [].concat.apply([], lists), clues = {};
      all.forEach(function (p) { p.w.forEach(function (w) { (clues[w[0]] = clues[w[0]] || []).push(w[4]); }); });
      function clue(w) { var c = clues[w]; return c[Math.floor(rand() * c.length)]; }
      if (PAPER) return paper(ctx, all, clues, clue) || free(ctx, Object.keys(clues), clue, SIZE[ctx.tier.id] || SIZE.daily, ctx.tier.name + ' crossword');
      if (ctx.tier.id === 'gentle') {
        // a theme: every answer that theme has in these chunks
        var by = {};
        all.forEach(function (p) { p.w.forEach(function (w) { (by[p.t] = by[p.t] || {})[w[0]] = 1; }); });
        var names = Object.keys(by).filter(function (n) { return Object.keys(by[n]).length >= 8 && ctx.recent.indexOf('theme:' + n) === -1; });
        if (!names.length) names = Object.keys(by);
        for (var tries = 0; tries < 6; tries++) {
          var name = names[Math.floor(rand() * names.length)], got = free(ctx, Object.keys(by[name]), clue, SIZE.gentle, name);
          if (got) return got;
        }
        return null;
      }
      return free(ctx, Object.keys(clues), clue, SIZE[ctx.tier.id] || SIZE.easy, ctx.tier.name);
    });
  }
  function free(ctx, words, clue, size, title) {
    var rand = ctx.rand, n = size[0], lo = size[1], hi = size[2];
    words = words.filter(function (w) { return w.length >= 3 && w.length <= n; });
    for (var tries = 0; tries < 30; tries++) {
      for (var i = words.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)), t = words[i]; words[i] = words[j]; words[j] = t; }
      var lay = window.TOLLevels.place(words.slice(0, lo >= 10 ? 90 : 40), n, n, rand, 8);
      if (lay.w.length < lo) continue;
      var w = lay.w.slice(0, hi), minr = Math.min.apply(null, w.map(function (x) { return x[1]; })), minc = Math.min.apply(null, w.map(function (x) { return x[2]; }));
      w = w.map(function (x) { return [x[0], x[1] - minr, x[2] - minc, x[3], clue(x[0])]; });
      var W = Math.max.apply(null, w.map(function (x) { return x[2] + (x[3] === 'a' ? x[0].length : 1); })), H = Math.max.apply(null, w.map(function (x) { return x[1] + (x[3] === 'd' ? x[0].length : 1); }));
      return { t: title, W: W, H: H, w: w, fresh: true };
    }
    return null;
  }
  function paper(ctx, all, clues, clue) {
    var words = Object.keys(clues);
    for (var tries = 0; tries < 4; tries++) {
      var pat = all[Math.floor(ctx.rand() * all.length)];
      var got = window.TOLLevels.fill(pat.g, words, ctx.rand, pat.n <= 7 ? 1200 : 2000);
      if (got) return { n: pat.n, g: pat.g, w: got.map(function (x) { return x.concat([clue(x[0])]); }), fresh: true };
    }
    return null;
  }
  var cur = null;
  var R = window.TOLRewards, KEY = PAPER ? 'tol-np-v1' : 'tol-xw-v1';
  var S = { at: -1, fill: {}, reveals: 0, done: [], solved: 0 };
  try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); for (var k in o) S[k] = o[k]; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  var $ = function (q) { return root.querySelector(q); };
  var gridEl = $('.xw-grid'), clueEl = $('.xw-clue-text'), listA = document.querySelector('.xw-across'), listD = document.querySelector('.xw-down'), noteEl = $('.xw-note'), live = $('.gm-live');
  var pz = null, words = [], cells = {}, sol = {}, sel = null, dir = 'a';

  // ---------- sound: soft plucks as you type, a chord for each word ----------
  var music = null, soundOn = get('tol-xw-sound', 'on') !== 'off';
  function get(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function wake() {
    if (!soundOn || !window.TOLMusic) return null;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    if (!music) { music = window.TOLMusic.create(null, null, { calm: true }); music.level(0.4); }
    music.start(); return music;
  }

  function start(c) {
    cur = c;
    var key = c.tier.id + ':' + c.index;
    if (S.at !== key) { S.at = key; S.fill = {}; S.reveals = 0; save(); }
    pz = c.puzzle.g ? { W: c.puzzle.n, H: c.puzzle.n, w: c.puzzle.w, t: c.tier.name + ' crossword' } : c.puzzle;
    words = []; cells = {}; sol = {};
    levels.paintBar(barEl, c);
    // number the squares the usual way: left to right, top to bottom
    var starts = {};
    pz.w.forEach(function (w) { starts[w[1] + ',' + w[2]] = true; });
    var num = 0, numAt = {};
    for (var r = 0; r < pz.H; r++) for (var c = 0; c < pz.W; c++) if (starts[r + ',' + c]) numAt[r + ',' + c] = ++num;
    pz.w.forEach(function (w) {
      var cl = []; for (var j = 0; j < w[0].length; j++) { var rr = w[1] + (w[3] === 'd' ? j : 0), cc = w[2] + (w[3] === 'a' ? j : 0); cl.push(rr + ',' + cc); sol[rr + ',' + cc] = w[0][j]; }
      words.push({ text: w[0], d: w[3], clue: w[4], n: numAt[w[1] + ',' + w[2]], cells: cl });
    });
    words.sort(function (a, b) { return a.d === b.d ? a.n - b.n : (a.d === 'a' ? -1 : 1); });
    $('.xw-theme').textContent = pz.t;
    $('.xw-no').textContent = cur.movedUp ? 'You moved up to ' + cur.tier.name + '!' : (PAPER ? '' : cur.tier.name);
    root.classList.toggle('is-big', pz.W >= 11);
    root.classList.remove('is-done'); $('.xw-done').hidden = true;
    build(numAt);
    sel = words[0].cells[0]; dir = words[0].d;
    paint();
    noteEl.textContent = S.solved ? 'Tap a square to begin. Tap it again to switch direction.' : 'Tap a square, then type. Tap the same square again to switch between across and down.';
  }

  function build(numAt) {
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = 'repeat(' + pz.W + ', 1fr)';
    gridEl.style.maxWidth = 'min(' + Math.min(pz.W * 54, 440) + 'px, ' + (40 * pz.W / pz.H).toFixed(1) + 'vh)';
    for (var r = 0; r < pz.H; r++) for (var c = 0; c < pz.W; c++) {
      var key = r + ',' + c, d;
      if (sol[key]) {
        d = document.createElement('button'); d.type = 'button'; d.className = 'gm-cell is-on xw-cell'; d.setAttribute('data-k', key);
        d.innerHTML = (numAt[key] ? '<span class="gm-n">' + numAt[key] + '</span>' : '') + '<span class="xw-l">' + (S.fill[key] || '') + '</span>';
        d.setAttribute('aria-label', 'Square' + (numAt[key] ? ' ' + numAt[key] : '') + (S.fill[key] ? ', ' + S.fill[key] : ', empty'));
      } else { d = document.createElement('div'); d.className = 'gm-cell xw-block'; }
      gridEl.appendChild(d); cells[key] = d;
    }
    listA.innerHTML = ''; listD.innerHTML = '';
    words.forEach(function (w, i) {
      var li = document.createElement('li'); li.innerHTML = '<button type="button" data-w="' + i + '"><b>' + w.n + '</b> ' + esc(w.clue) + ' <span class="xw-len">(' + w.text.length + ')</span></button>';
      (w.d === 'a' ? listA : listD).appendChild(li);
    });
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function current() {
    var list = words.filter(function (w) { return w.cells.indexOf(sel) !== -1; });
    return list.filter(function (w) { return w.d === dir; })[0] || list[0];
  }
  function solved(w) { return w.cells.every(function (k) { return S.fill[k] === sol[k]; }); }
  function paint() {
    var w = current(); if (w) dir = w.d;
    Object.keys(cells).forEach(function (k) {
      var el = cells[k]; if (!sol[k]) return;
      el.classList.toggle('is-word', !!w && w.cells.indexOf(k) !== -1);
      el.classList.toggle('is-sel', k === sel);
      el.querySelector('.xw-l').textContent = S.fill[k] || '';
    });
    words.forEach(function (x, i) {
      var ok = solved(x);
      x.cells.forEach(function (k) { if (ok) cells[k].classList.add('is-found'); });
      var b = document.querySelector('[data-w="' + i + '"]'); if (b) { b.classList.toggle('is-solved', ok); b.classList.toggle('is-active', x === w); }
    });
    // squares that are no longer part of any solved word lose their glow
    Object.keys(cells).forEach(function (k) { if (sol[k] && !words.some(function (x) { return x.cells.indexOf(k) !== -1 && solved(x); })) cells[k].classList.remove('is-found'); });
    if (w) clueEl.innerHTML = '<b>' + w.n + ' ' + (w.d === 'a' ? 'Across' : 'Down') + '</b> ' + esc(w.clue) + ' <span class="xw-len">(' + w.text.length + ')</span>';
  }

  function type(ch) {
    if (!sel || root.classList.contains('is-done')) return;
    var w = current(), before = words.filter(solved).length;
    S.fill[sel] = ch; save();
    var m = wake(); if (m) m.pluck(m.note(w.cells.indexOf(sel) + 1), 0.035);
    var i = w.cells.indexOf(sel);
    // move on to the next empty square in this word, or the next square
    var nxt = null;
    for (var j = i + 1; j < w.cells.length; j++) if (!S.fill[w.cells[j]]) { nxt = w.cells[j]; break; }
    sel = nxt || w.cells[Math.min(i + 1, w.cells.length - 1)];
    paint();
    var after = words.filter(solved).length;
    if (after > before) {
      if (m) m.reward(false);
      var nw = words.filter(function (x) { return solved(x) && x.cells.indexOf(w.cells[i]) !== -1; })[0];
      noteEl.innerHTML = '<b>' + cap(nw ? nw.text : '') + '</b> ✨';
      live.textContent = 'Correct: ' + (nw ? nw.text.toLowerCase() : '');
      if (after === words.length) return setTimeout(finish, 500);
      if (w && solved(w)) nextWord(1, true);
    }
  }
  function back() {
    if (!sel) return;
    var w = current(), i = w.cells.indexOf(sel);
    if (S.fill[sel]) { delete S.fill[sel]; } else if (i > 0) { sel = w.cells[i - 1]; delete S.fill[sel]; }
    save(); paint();
  }
  function cap(t) { return t.charAt(0) + t.slice(1).toLowerCase(); }
  function nextWord(step, skipSolved) {
    var i = words.indexOf(current());
    for (var n = 1; n <= words.length; n++) {
      var w = words[((i + step * n) % words.length + words.length) % words.length];
      if (skipSolved && solved(w)) continue;
      sel = w.cells.filter(function (k) { return !S.fill[k]; })[0] || w.cells[0]; dir = w.d; paint(); return;
    }
  }

  function finish() {
    root.classList.add('is-done');
    var perfect = S.reveals === 0, won = 6 + words.length + (perfect ? 6 : 0);
    if (S.done.indexOf(S.at) === -1) S.done.push(S.at);
    S.solved++; save();
    levels.finished(cur);
    var m = wake(); if (m) { m.home(); setTimeout(function () { m.reward(true); }, 500); }
    var res = null;
    if (R) { res = R.earn(won, 'crossword', perfect ? 'Solved with no reveals' : 'Crossword solved'); R.record('crossword', 'done'); }
    if (window.TOLGarden) window.TOLGarden.gift('words');
    var card = $('.xw-done');
    card.querySelector('.xw-done-h').textContent = perfect ? 'Solved, all by yourself!' : 'Solved. Lovely.';
    card.querySelector('.xw-done-p').textContent = 'You’ve finished ' + S.solved + (S.solved === 1 ? ' crossword.' : ' crosswords.') + ' Take a slow breath.';
    card.querySelector('.xw-done-petals').textContent = (res && res.unlocked && res.unlocked.length ? '\u2728 New in the background: ' + res.unlocked[0].name : res ? '\u2728 Level ' + res.level : '');
    var tip = card.querySelector('.xw-done-tip'); if (tip) tip.innerHTML = window.TOLLevels.programTip();
    card.hidden = false; card.querySelector('.xw-again').focus();
  }

  // ---------- input ----------
  gridEl.addEventListener('click', function (e) {
    var b = e.target.closest('.xw-cell'); if (!b) return;
    var k = b.getAttribute('data-k');
    if (k === sel) { var both = words.filter(function (w) { return w.cells.indexOf(k) !== -1; }); if (both.length > 1) dir = dir === 'a' ? 'd' : 'a'; }
    else { sel = k; if (!words.some(function (w) { return w.d === dir && w.cells.indexOf(k) !== -1; })) dir = dir === 'a' ? 'd' : 'a'; }
    wake(); paint();
  });
  $('.xw-keys').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var k = b.getAttribute('data-k');
    if (k === 'back') back(); else type(k);
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-w]'); if (!b) return;
    var w = words[+b.getAttribute('data-w')]; sel = w.cells.filter(function (k) { return !S.fill[k]; })[0] || w.cells[0]; dir = w.d; paint();
    gridEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $('.xw-prev').addEventListener('click', function () { nextWord(-1); });
  $('.xw-next').addEventListener('click', function () { nextWord(1); });
  document.addEventListener('keydown', function (e) {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!root.contains(document.activeElement) && !document.activeElement.closest('.xw-lists') && document.activeElement !== document.body) return;
    var k = e.key;
    if (/^[a-zA-Z]$/.test(k)) { e.preventDefault(); wake(); type(k.toUpperCase()); }
    else if (k === 'Backspace') { e.preventDefault(); back(); }
    else if (k === 'Tab') { e.preventDefault(); nextWord(e.shiftKey ? -1 : 1); }
    else if (k.indexOf('Arrow') === 0 && sel) {
      e.preventDefault();
      var p = sel.split(',').map(Number), d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
      dir = d[0] ? 'd' : 'a';
      for (var s2 = 1; s2 < 9; s2++) { var nk = (p[0] + d[0] * s2) + ',' + (p[1] + d[1] * s2); if (sol[nk]) { sel = nk; break; } }
      paint();
    }
  });
  $('.xw-reveal').addEventListener('click', function () {
    var w = current(); if (!w) return;
    var k = w.cells.filter(function (x) { return S.fill[x] !== sol[x]; })[0]; if (!k) return;
    sel = k; S.reveals++; type(sol[k]);
    noteEl.textContent = 'One letter is in. Try the next one with no reveals, just for fun.';
  });
  $('.xw-check').addEventListener('click', function () {
    var wrong = Object.keys(S.fill).filter(function (k) { return S.fill[k] && S.fill[k] !== sol[k]; });
    wrong.forEach(function (k) { cells[k].classList.add('is-wrong'); setTimeout(function () { cells[k].classList.remove('is-wrong'); }, 2200); });
    noteEl.textContent = wrong.length ? wrong.length + (wrong.length === 1 ? ' square is' : ' squares are') + ' gently glowing: worth another look.' : 'Everything you’ve typed so far is right.';
  });
  function go(p) { p.then(start, function () { noteEl.textContent = 'That puzzle didn\u2019t load. Check your connection and try again.'; }); }
  $('.xw-another').addEventListener('click', function () { go(levels.random()); });
  $('.xw-again').addEventListener('click', function () { go(levels.next()); });
  var barEl = $('.gl-host');
  levels.bar(barEl, function (p) { go(p); });
  var sb = $('.xw-sound');
  function soundLabel() { sb.setAttribute('aria-pressed', String(soundOn)); sb.innerHTML = soundOn ? '&#127925;' : '&#128263;'; sb.setAttribute('aria-label', soundOn ? 'Music on' : 'Music off'); }
  sb.addEventListener('click', function () { soundOn = !soundOn; set('tol-xw-sound', soundOn ? 'on' : 'off'); soundLabel(); if (soundOn) wake(); else if (music) music.stop(); });
  soundLabel();
  document.addEventListener('visibilitychange', function () { if (!music) return; if (document.hidden) music.stop(); else if (soundOn) music.start(); });

  var dateEl = document.getElementById('np-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  // carry on where you left off
  go(levels.current());
  root.hidden = false;
  window.__crossword = { levels: levels, make: make, get words() { return words; }, type: type, get sel() { return sel; }, set sel(v) { sel = v; }, start: start, get sol() { return sol; } };
})();
