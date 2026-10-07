/* quiet-crossword.js — Quiet Crossword (/quiet-crossword.html): small, gentle crosswords.
   Tap a square (tap it again to switch between across and down) and type with the
   on-screen keys or a keyboard. Each word glows softly when it's right. "Next" goes on
   in order, "Random" (or "A random one") picks one you haven't played, and you can change the difficulty
   any time (game-levels.js). Every puzzle counts as a level (rewards.js), the same whether or not you show a letter. No timer, no way to lose. Progress stays in this browser. */
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
  // a clue for each answer, never the same clue twice in one puzzle
  function clueAll(list, clue) {
    var used = {};
    return list.map(function (x) {
      var c = clue(x[0]);
      for (var k = 0; k < 6 && used[c.toLowerCase()]; k++) c = clue(x[0]);
      used[c.toLowerCase()] = 1;
      return c;
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
      var cl = clueAll(w, clue);
      if (new Set(cl.map(function (c) { return c.toLowerCase(); })).size < cl.length) continue;
      w = w.map(function (x, k) { return [x[0], x[1] - minr, x[2] - minc, x[3], cl[k]]; });
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
      if (!got) continue;
      var cl = clueAll(got, clue);
      if (new Set(cl.map(function (c) { return c.toLowerCase(); })).size < cl.length) continue;
      return { n: pat.n, g: pat.g, w: got.map(function (x, k) { return x.concat([cl[k]]); }), fresh: true };
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
  // Off until you turn it on (the switch is remembered on this device); Quiet mode keeps it off.
  var music = null, soundSw = null;
  function soundOn() { return !!(soundSw && soundSw.on()); }
  function get(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function wake() {
    if (!soundOn() || !window.TOLMusic) return null;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    if (!music) { music = window.TOLMusic.create(null, null, { calm: true }); music.level(0.4); }
    music.start(); return music;
  }

  function start(c) {
    cur = c;
    var key = c.tier.id + ':' + c.index;
    if (S.at !== key) {
      // keep the letters of a few puzzles you've left half done (today's and the one you were on)
      S.kept = S.kept || {};
      if (S.at !== -1 && Object.keys(S.fill).length && S.done.indexOf(S.at) === -1) S.kept[S.at] = { f: S.fill, r: S.reveals };
      var back = S.kept[key]; delete S.kept[key];
      var ks = Object.keys(S.kept); while (ks.length > 6) delete S.kept[ks.shift()];
      S.at = key; S.fill = back ? back.f : {}; S.reveals = back ? back.r : 0; save();
    }
    pz = c.puzzle.g ? { W: c.puzzle.n, H: c.puzzle.n, w: c.puzzle.w, t: c.tier.name + ' crossword' } : c.puzzle;
    words = []; cells = {}; sol = {};
    levels.paintBar(barEl, c);
    paintToday();
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
    if (cur.daily) $('.xw-theme').textContent = (PAPER ? 'Today’s ' + cur.tier.name : 'Today’s crossword') + (PAPER ? '' : ': ' + pz.t);
    $('.xw-no').textContent = cur.daily ? (PAPER ? '' : longDate()) : cur.movedUp ? 'You moved up to ' + cur.tier.name + '!' : (PAPER ? '' : cur.tier.name);
    root.classList.toggle('is-big', pz.W >= 11);
    zoomBtn.hidden = pz.W < 9;
    root.classList.toggle('is-zoom', zoom && pz.W >= 9);
    root.classList.remove('is-done'); $('.xw-done').hidden = true;
    var oldWhy = document.querySelector('.xw-why'); if (oldWhy) oldWhy.remove();
    build(numAt);
    sel = words[0].cells[0]; dir = words[0].d;
    paint();
    // a new puzzle from a button: move focus to the grid, so Enter or a letter goes to the puzzle
    // (and not to the button again, which would skip ahead)
    var ae = document.activeElement;
    if (ae && ae !== document.body && (barEl.contains(ae) || todayEl.contains(ae) || ae.closest('.xw-done, .gm-btns')) && cells[sel]) { try { cells[sel].focus({ preventScroll: true }); } catch (e) {} }
    noteEl.textContent = S.solved ? 'Tap a square to begin. Tap it again to switch direction.' : 'Tap a square, then type. Tap the same square again to switch between across and down.';
  }

  function build(numAt) {
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = 'repeat(' + pz.W + ', 1fr)';
    if (root.classList.contains('is-zoom')) { gridEl.style.maxWidth = 'none'; gridEl.style.width = (pz.W * 42) + 'px'; }
    else { gridEl.style.width = ''; gridEl.style.maxWidth = 'min(' + Math.min(pz.W * 54, 440) + 'px, ' + (40 * pz.W / pz.H).toFixed(1) + 'vh)'; }
    for (var r = 0; r < pz.H; r++) for (var c = 0; c < pz.W; c++) {
      var key = r + ',' + c, d;
      if (sol[key]) {
        d = document.createElement('button'); d.type = 'button'; d.className = 'gm-cell is-on xw-cell'; d.setAttribute('data-k', key); d.tabIndex = -1;
        d.innerHTML = (numAt[key] ? '<span class="gm-n">' + numAt[key] + '</span>' : '') + '<span class="xw-l">' + (S.fill[key] || '') + '</span>';
        d.setAttribute('aria-label', cellLabel(key));
      } else { d = document.createElement('div'); d.className = 'gm-cell xw-block'; }
      gridEl.appendChild(d); cells[key] = d;
    }
    listA.innerHTML = ''; listD.innerHTML = ''; lastClue = '';
    words.forEach(function (w, i) {
      var li = document.createElement('li'); li.innerHTML = '<button type="button" data-w="' + i + '"><b>' + w.n + '</b> ' + esc(w.clue) + ' <span class="xw-len">(' + w.text.length + ')</span></button>';
      (w.d === 'a' ? listA : listD).appendChild(li);
    });
  }
  // what a screen reader hears on a square: where it is, which clues it belongs to, and what's in it
  function cellLabel(k) {
    var p = k.split(','), inWords = words.filter(function (w) { return w.cells.indexOf(k) !== -1; });
    return 'Row ' + (+p[0] + 1) + ', column ' + (+p[1] + 1) + '. ' +
      inWords.map(function (w) { return w.n + ' ' + (w.d === 'a' ? 'Across' : 'Down') + ', letter ' + (w.cells.indexOf(k) + 1) + ' of ' + w.cells.length; }).join('; ') +
      '. ' + (S.fill[k] ? 'Letter ' + S.fill[k] : 'Empty') + (inWords.length && inWords.every(solved) ? ', solved' : '') + '.';
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function current() {
    var list = words.filter(function (w) { return w.cells.indexOf(sel) !== -1; });
    return list.filter(function (w) { return w.d === dir; })[0] || list[0];
  }
  function solved(w) { return w.cells.every(function (k) { return S.fill[k] === sol[k]; }); }
  var lastClue = '';
  function paint() {
    var w = current(); if (w) dir = w.d;
    // roving tabindex: only the active square is in the Tab order, and when focus is already in the
    // grid it moves with the active square, so a screen reader hears where typing has taken you
    var ae = document.activeElement, inGrid = !!(ae && ae !== document.body && gridEl.contains(ae));
    Object.keys(cells).forEach(function (k) {
      var el = cells[k]; if (!sol[k]) return;
      el.classList.toggle('is-word', !!w && w.cells.indexOf(k) !== -1);
      el.classList.toggle('is-sel', k === sel);
      var ti = k === sel ? 0 : -1; if (el.tabIndex !== ti) el.tabIndex = ti;
      el.querySelector('.xw-l').textContent = S.fill[k] || '';
      var lab = cellLabel(k); if (el.getAttribute('aria-label') !== lab) el.setAttribute('aria-label', lab);
    });
    words.forEach(function (x, i) {
      var ok = solved(x);
      x.cells.forEach(function (k) { if (ok) cells[k].classList.add('is-found'); });
      var b = document.querySelector('[data-w="' + i + '"]'); if (b) { b.classList.toggle('is-solved', ok); b.classList.toggle('is-active', x === w); }
    });
    // squares that are no longer part of any solved word lose their glow
    Object.keys(cells).forEach(function (k) { if (sol[k] && !words.some(function (x) { return x.cells.indexOf(k) !== -1 && solved(x); })) cells[k].classList.remove('is-found'); });
    // the clue line is a live region: only rewrite it when the active clue changes, not on every letter
    if (w) { var ch = '<b>' + w.n + ' ' + (w.d === 'a' ? 'Across' : 'Down') + '</b> ' + esc(w.clue) + ' <span class="xw-len">(' + w.text.length + ')</span>'; if (ch !== lastClue) { lastClue = ch; clueEl.innerHTML = ch; } }
    if (inGrid && sel && cells[sel] && document.activeElement !== cells[sel]) { try { cells[sel].focus(); } catch (e) {} }
    keepInView();
  }
  // with bigger squares the grid can be wider than the screen: keep the square you're on in view
  function keepInView() {
    if (!root.classList.contains('is-zoom') || !sel || !cells[sel]) return;
    var el = cells[sel], l = el.offsetLeft, r = l + el.offsetWidth;
    if (l < scrollEl.scrollLeft + 8) scrollEl.scrollLeft = l - 8;
    else if (r > scrollEl.scrollLeft + scrollEl.clientWidth - 8) scrollEl.scrollLeft = r - scrollEl.clientWidth + 8;
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
    var perfect = S.reveals === 0, won = 12 + words.length; // help costs nothing: every solve earns the same
    if (S.done.indexOf(S.at) === -1) S.done.push(S.at);
    S.solved++; save();
    if (cur.daily) markToday(cur.daily); else levels.finished(cur);
    var m = wake(); if (m) { m.home(); setTimeout(function () { m.reward(true); }, 500); }
    var res = null;
    if (R) { res = R.earn(won, 'crossword', 'Crossword solved'); R.record('crossword', 'done'); }
    if (window.TOLGarden) window.TOLGarden.gift('words');
    var card = $('.xw-done');
    card.querySelector('.xw-done-h').textContent = 'Solved. Lovely.';
    card.querySelector('.xw-done-p').textContent = 'You’ve finished ' + S.solved + (S.solved === 1 ? ' crossword.' : ' crosswords.') + ' Take a slow breath.';
    card.querySelector('.xw-done-petals').textContent = (res && res.unlocked && res.unlocked.length ? '\u2728 New in the background: ' + res.unlocked[0].name : res ? '\u2728 Level ' + res.level : '');
    var tip = card.querySelector('.xw-done-tip'); if (tip) tip.innerHTML = window.TOLLevels.programTip();
    // after today's puzzle: today's other one if it's still waiting, or on to the collection
    var again = card.querySelector('.xw-again'), other = cur.daily && PAPER && !doneToday(cur.daily === 'mini' ? 'main' : 'mini') ? (cur.daily === 'mini' ? 'main' : 'mini') : null;
    again.setAttribute('data-go', other || (cur.daily ? 'more' : 'next'));
    again.innerHTML = other ? 'Today’s ' + esc(todayTier(other).name) + ' &rarr;' : cur.daily ? 'More puzzles &rarr;' : 'Next puzzle &rarr;';
    if (cur.daily) card.querySelector('.xw-done-p').textContent = 'That’s today’s ' + (PAPER ? cur.tier.name : 'crossword') + '. A new one arrives tomorrow. Take a slow breath.';
    card.hidden = false; again.focus();
    showWhy();
  }
  // "Why this answer?": after solving, each answer with its clue and the words that cross it, since
  // the crossing letters are what settle a clue that more than one word could fit
  function showWhy() {
    var host = document.querySelector('.xw-lists'); if (!host) return;
    var old = host.querySelector('.xw-why'); if (old) old.remove();
    var d = document.createElement('details'); d.className = 'xw-why';
    d.innerHTML = '<summary>Why this answer?</summary><p>Some clues could fit more than one word. The letters that cross each answer are what settle it.</p><ul>' +
      words.map(function (w) {
        var cross = words.filter(function (x) { return x !== w && x.cells.some(function (k) { return w.cells.indexOf(k) !== -1; }); });
        return '<li><b>' + esc(w.text) + '</b> (' + w.n + ' ' + (w.d === 'a' ? 'Across' : 'Down') + ', “' + esc(w.clue) + '”)' +
          (cross.length ? ': it shares letters with ' + cross.map(function (x) { var k = x.cells.filter(function (c) { return w.cells.indexOf(c) !== -1; })[0]; return esc(x.text) + ' (the ' + sol[k] + ')'; }).join(', ') + '.' : '.') + '</li>';
      }).join('') + '</ul>';
    d.style.gridColumn = '1 / -1';
    host.appendChild(d);
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
    else if (k === 'Tab') {
      // Tab moves word to word, and after the last word (or Shift+Tab before the first) it leaves the
      // puzzle like any other control, so the keyboard is never trapped. Escape leaves straight away.
      var wi = words.indexOf(current()), edge = e.shiftKey ? wi <= 0 : wi >= words.length - 1;
      if (edge || !(document.activeElement.closest && document.activeElement.closest('.xw-cell'))) return;
      e.preventDefault(); nextWord(e.shiftKey ? -1 : 1);
    }
    else if (k === 'Escape' && document.activeElement.closest && document.activeElement.closest('.xw-cell')) {
      e.preventDefault(); var out = document.querySelector('.xw-lists button, .xw-lists a, .xw-lists [tabindex]') || document.querySelector('.xw-next'); if (out) out.focus();
    }
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
    noteEl.textContent = 'One letter is in. Show a letter whenever you like.';
  });
  $('.xw-check').addEventListener('click', function () {
    var wrong = Object.keys(S.fill).filter(function (k) { return S.fill[k] && S.fill[k] !== sol[k]; });
    wrong.forEach(function (k) { cells[k].classList.add('is-wrong'); setTimeout(function () { cells[k].classList.remove('is-wrong'); }, 2200); });
    noteEl.textContent = wrong.length ? wrong.length + (wrong.length === 1 ? ' square is' : ' squares are') + ' gently glowing: worth another look.' : 'Everything you’ve typed so far is right.';
  });
  function go(p) { p.then(start, function () { noteEl.textContent = 'That puzzle didn\u2019t load. Check your connection and try again.'; }); }
  $('.xw-another').addEventListener('click', function () { go(levels.random()); });
  $('.xw-again').addEventListener('click', function () {
    var to = this.getAttribute('data-go');
    if (to === 'mini' || to === 'main') go(today(to)); else if (to === 'more') go(levels.current()); else go(levels.next());
  });
  var barEl = $('.gl-host');
  levels.bar(barEl, function (p) { go(p); });

  // ---------- today's puzzles: the same for everyone on the same date ----------
  // The Daily Ledger has a Mini every day and one bigger grid that grows through the week
  // (Easy early in the week, Daily midweek, Weekend on Friday and Saturday, the Big Sunday on
  // Sundays). Quiet Crossword has one themed Gentle crossword a day. Each is picked from its
  // bank by the date alone, so everyone gets the same puzzle, and the rest of the bank stays
  // there to play any time ("More puzzles").
  var MAIN = ['sunday', 'small', 'small', 'daily', 'daily', 'weekend', 'weekend'];
  function dayNo(d) { return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); }
  function dayKey(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function longDate() { return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }); }
  function todayTier(kind) {
    var id = PAPER ? (kind === 'mini' ? 'mini' : MAIN[new Date().getDay()]) : 'gentle';
    return levels.tiers.filter(function (t) { return t.id === id; })[0];
  }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  // a fixed walk through the bank that visits every puzzle before any comes round again
  function dailyIndex(id, n, day) {
    var step = 7919 % n || 1; while (gcd(step, n) !== 1) step++;
    var start = window.TOLLevels.hash('daily:' + id) % n;
    return (start + ((day % n) * step) % n) % n;
  }
  function today(kind) {
    var t = todayTier(kind), d = new Date();
    return levels.load(t.id).then(function (inf) {
      var i = dailyIndex(t.id, inf.n, dayNo(d));
      return window.TOLLevels.chunk(t.bank, Math.floor(i / inf.per)).then(function (list) {
        return { tier: t, index: i, puzzle: list[i % inf.per], number: i + 1, of: inf.n, fresh: 0, base: 0, daily: kind };
      });
    });
  }
  var TKEY = PAPER ? 'tol-np-today' : 'tol-xw-today';
  function todayRec() { var r = null; try { r = JSON.parse(localStorage.getItem(TKEY) || 'null'); } catch (e) {} return r && r.day === dayKey(new Date()) ? r : { day: dayKey(new Date()), done: {} }; }
  function doneToday(kind) { return !!todayRec().done[kind]; }
  function markToday(kind) { var r = todayRec(); r.done[kind] = true; try { localStorage.setItem(TKEY, JSON.stringify(r)); } catch (e) {} paintToday(); }
  var todayEl = document.createElement('div');
  todayEl.className = 'xw-today'; todayEl.setAttribute('role', 'group'); todayEl.setAttribute('aria-label', 'Today’s puzzles');
  var kinds = PAPER ? ['mini', 'main'] : ['main'];
  todayEl.innerHTML = '<span class="xw-today-k">Today</span>' + kinds.map(function (k) { return '<button type="button" data-today="' + k + '"></button>'; }).join('') +
    '<span class="xw-today-more">More puzzles below</span>';
  barEl.parentNode.insertBefore(todayEl, barEl);
  function paintToday() {
    Array.prototype.forEach.call(todayEl.querySelectorAll('[data-today]'), function (b) {
      var k = b.getAttribute('data-today'), t = todayTier(k), on = !!(cur && cur.daily === k);
      b.innerHTML = (doneToday(k) ? '&#10003; ' : '') + (PAPER ? esc(t.name) : 'Today’s crossword');
      b.setAttribute('aria-pressed', String(on));
      b.title = doneToday(k) ? 'Done today. A new one arrives tomorrow.' : 'The same puzzle for everyone today';
    });
    if (cur && cur.daily) {
      Array.prototype.forEach.call(barEl.querySelectorAll('[data-tier]'), function (b) { b.setAttribute('aria-pressed', 'false'); });
      var w = barEl.querySelector('.gl-where'); if (w) { w.textContent = 'Today · ' + new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); w.title = 'Pick a size to play any puzzle from the collection.'; }
    }
  }
  todayEl.addEventListener('click', function (e) { var b = e.target.closest('[data-today]'); if (b) go(today(b.getAttribute('data-today'))); });

  // ---------- bigger squares, for the large grids on a phone ----------
  var scrollEl = document.createElement('div');
  scrollEl.className = 'xw-scroll';
  gridEl.parentNode.insertBefore(scrollEl, gridEl); scrollEl.appendChild(gridEl);
  var zoom = get('tol-xw-zoom', 'off') === 'on';
  var zoomBtn = document.createElement('button');
  zoomBtn.type = 'button'; zoomBtn.className = 'xw-zoom';
  $('.xw-tools').insertBefore(zoomBtn, $('.xw-sound'));
  function zoomLabel() { zoomBtn.setAttribute('aria-pressed', String(zoom)); zoomBtn.innerHTML = zoom ? '&#8854;' : '&#8853;'; zoomBtn.setAttribute('aria-label', zoom ? 'Smaller squares' : 'Bigger squares'); zoomBtn.title = zoom ? 'Fit the grid on the screen' : 'Bigger squares (the grid scrolls sideways)'; }
  zoomBtn.addEventListener('click', function () {
    zoom = !zoom; set('tol-xw-zoom', zoom ? 'on' : 'off'); zoomLabel();
    if (!pz) return;
    root.classList.toggle('is-zoom', zoom && pz.W >= 9);
    var s = sel, d = dir; build(numAtNow()); sel = s; dir = d; paint();
  });
  zoomLabel();
  function numAtNow() { var m = {}; words.forEach(function (w) { m[w.cells[0]] = w.n; }); return m; }
  var sb = $('.xw-sound');
  if (window.TOLMusic && window.TOLMusic.toggle) soundSw = window.TOLMusic.toggle(sb, { key: 'tol-xw-sound', label: 'Music', onChange: function (on) { if (on) wake(); else if (music) music.stop(); } });
  else sb.hidden = true;
  document.addEventListener('visibilitychange', function () { if (!music) return; if (document.hidden) music.stop(); else if (soundOn()) music.start(); });

  var dateEl = document.getElementById('np-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  // carry on where you left off
  // open on today's puzzle until it's done, then carry on where you left off
  var first = PAPER ? (!doneToday('mini') ? 'mini' : !doneToday('main') ? 'main' : null) : (!doneToday('main') ? 'main' : null);
  if (first && !/[?&]more\b/.test(location.search)) go(today(first)); else go(levels.current());
  root.hidden = false;
  window.__crossword = { levels: levels, make: make, get words() { return words; }, type: type, get sel() { return sel; }, set sel(v) { sel = v; }, start: start, get sol() { return sol; } };
})();
