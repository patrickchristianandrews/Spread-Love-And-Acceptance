/* quiet-crossword.js — Quiet Crossword (/quiet-crossword.html): small, gentle crosswords.
   Tap a square (tap it again to switch between across and down) and type with the
   on-screen keys or a keyboard. Each word glows softly when it's right. There's a new
   puzzle every day and "Another puzzle" any time; petals for finishing, more with no
   reveals (rewards.js). No timer, no way to lose. Progress stays in this browser. */
(function () {
  'use strict';
  var root = document.getElementById('xw'); if (!root) return;
  var ALL = window.TOL_CROSSWORDS || [];
  if (!ALL.length) return;
  var R = window.TOLRewards, KEY = 'tol-xw-v1';
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

  function start(i) {
    var n = ((i % ALL.length) + ALL.length) % ALL.length;
    if (S.at !== n) { S.at = n; S.fill = {}; S.reveals = 0; save(); }
    pz = ALL[n]; words = []; cells = {}; sol = {};
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
    $('.xw-no').textContent = 'Puzzle ' + (n + 1) + ' of ' + ALL.length;
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
    var m = wake(); if (m) { m.home(); setTimeout(function () { m.reward(true); }, 500); }
    if (R) { R.earn(won, 'crossword', perfect ? 'Solved with no reveals' : 'Crossword solved'); R.record('crossword', 'done'); }
    if (window.TOLGarden) window.TOLGarden.gift('words');
    var card = $('.xw-done');
    card.querySelector('.xw-done-h').textContent = perfect ? 'Solved, all by yourself!' : 'Solved. Lovely.';
    card.querySelector('.xw-done-p').textContent = 'You’ve finished ' + S.solved + (S.solved === 1 ? ' quiet crossword.' : ' quiet crosswords.') + ' Take a slow breath.';
    card.querySelector('.xw-done-petals').textContent = '+' + won + ' petals';
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
    noteEl.textContent = 'One letter is in. Solve a puzzle with no reveals for extra petals.';
  });
  $('.xw-check').addEventListener('click', function () {
    var wrong = Object.keys(S.fill).filter(function (k) { return S.fill[k] && S.fill[k] !== sol[k]; });
    wrong.forEach(function (k) { cells[k].classList.add('is-wrong'); setTimeout(function () { cells[k].classList.remove('is-wrong'); }, 2200); });
    noteEl.textContent = wrong.length ? wrong.length + (wrong.length === 1 ? ' square is' : ' squares are') + ' gently glowing: worth another look.' : 'Everything you’ve typed so far is right.';
  });
  $('.xw-another').addEventListener('click', function () { start(S.at + 1); });
  $('.xw-again').addEventListener('click', function () { start(S.at + 1); });
  var sb = $('.xw-sound');
  function soundLabel() { sb.setAttribute('aria-pressed', String(soundOn)); sb.innerHTML = soundOn ? '&#127925;' : '&#128263;'; sb.setAttribute('aria-label', soundOn ? 'Music on' : 'Music off'); }
  sb.addEventListener('click', function () { soundOn = !soundOn; set('tol-xw-sound', soundOn ? 'on' : 'off'); soundLabel(); if (soundOn) wake(); else if (music) music.stop(); });
  soundLabel();
  document.addEventListener('visibilitychange', function () { if (!music) return; if (document.hidden) music.stop(); else if (soundOn) music.start(); });

  // a new puzzle each day, unless one is in progress
  var day = Math.floor(Date.now() / 864e5);
  start(S.at >= 0 && Object.keys(S.fill).length && S.done.indexOf(S.at) === -1 ? S.at : day % ALL.length);
  root.hidden = false;
  window.__crossword = { get words() { return words; }, type: type, get sel() { return sel; }, set sel(v) { sel = v; }, start: start, get sol() { return sol; } };
})();
