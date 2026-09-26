/* word-bloom.js — Word Bloom (/word-bloom.html): a calm, moreish letter-wheel game.
   Swipe across the petals (or tap them one by one) to spell a word. Words that belong
   in the little crossword fill it in; other real words go in the bonus jar. Every level
   blooms into the next, with petals for doing well (see rewards.js).
   No timer and no way to lose. Progress stays in this browser. */
(function () {
  'use strict';
  var root = document.getElementById('wb'); if (!root) return;
  var LEVELS = window.TOL_BLOOM_LEVELS || [];
  if (!LEVELS.length) return;
  var R = window.TOLRewards;
  var KEY = 'tol-bloom-v1';
  var CHAPTERS = ['Seedling', 'Sprout', 'Little meadow', 'Morning dew', 'Wildflowers', 'Butterfly hill', 'Honey grove', 'Sunlit orchard', 'Willow pond', 'Moonlit meadow',
    'Lantern lane', 'Firefly field', 'Starlight garden', 'Rose arbour', 'Lavender path', 'Maple hollow', 'Cloud orchard', 'Aurora glade', 'Golden hour', 'Evergreen'];
  var KIND = ['Lovely. Take a slow breath.', 'Beautifully done.', 'Your garden grows.', 'That felt good, didn’t it?', 'One more little bloom.', 'Gently does it.',
    'You found them all.', 'A small win is still a win.', 'Your mind has had a lovely stretch.', 'Well played. Rest your eyes a moment.'];

  var S = { level: 0, found: [], bonus: [], jar: 0, hints: 0, revealed: [], cleared: 0, perfect: 0 };
  try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); for (var k in o) S[k] = o[k]; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  var $ = function (q) { return root.querySelector(q); };
  var gridEl = $('.wb-grid'), wheel = $('.wb-wheel'), lines = $('.wb-lines'), wordEl = $('.wb-word'), noteEl = $('.wb-note'), live = $('.gm-live');
  var lv = null, cells = {}, petals = [], order = [];

  // ---------- sound (calm-music.js): each petal rises a note; each word settles with a chord ----------
  var music = null, soundOn = get('tol-bloom-sound', 'on') !== 'off';
  function get(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function wake() {
    if (!soundOn || !window.TOLMusic) return null;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    if (!music) { music = window.TOLMusic.create(null, null, { calm: true }); music.level(0.45); }
    music.start(); return music;
  }
  function note(i) { var m = wake(); if (m) m.pluck(m.note(i + 1), 0.045); }

  // ---------- a level ----------
  function start(n) {
    S.level = Math.max(0, Math.min(n, LEVELS.length - 1));
    lv = LEVELS[S.level];
    if (S.at !== S.level) { S.at = S.level; S.found = []; S.bonus = []; S.hints = 0; S.revealed = []; }
    save();
    order = lv.l.split('');
    var ch = Math.floor(S.level / 10);
    $('.wb-level').textContent = 'Level ' + (S.level + 1);
    $('.wb-chapter').textContent = CHAPTERS[ch % CHAPTERS.length] + ' · ' + (S.level % 10 + 1) + ' of 10';
    root.setAttribute('data-chapter', String(ch % 5));
    root.classList.remove('is-done');
    buildGrid(); buildWheel(); jar();
    noteEl.innerHTML = S.level === 0 && !S.cleared ? '<b>Swipe across the petals</b> to spell a word. Tap them one at a time if you prefer.' : 'Find every word to bloom this level.';
    wordEl.textContent = '';
  }

  function buildGrid() {
    gridEl.innerHTML = ''; cells = {};
    gridEl.style.gridTemplateColumns = 'repeat(' + lv.W + ', 1fr)';
    gridEl.style.maxWidth = 'min(' + Math.min(lv.W * 52, 420) + 'px, ' + (30 * lv.W / lv.H).toFixed(1) + 'vh)'; // keep the wheel on screen
    for (var r = 0; r < lv.H; r++) for (var c = 0; c < lv.W; c++) {
      var d = document.createElement('div'); d.className = 'gm-cell'; gridEl.appendChild(d); cells[r + ',' + c] = d;
    }
    lv.w.forEach(function (w) { eachCell(w, function (el) { el.classList.add('is-on'); }); });
    lv.w.forEach(function (w) { if (S.found.indexOf(w[0]) !== -1) fill(w, false); });
    S.revealed.forEach(function (k) { var el = cells[k]; if (el && !el.textContent) { el.textContent = letterAt(k); el.classList.add('is-hinted'); } });
  }
  function eachCell(w, fn) { for (var i = 0; i < w[0].length; i++) { var r = w[1] + (w[3] === 'd' ? i : 0), c = w[2] + (w[3] === 'a' ? i : 0); fn(cells[r + ',' + c], i, r + ',' + c); } }
  function letterAt(key) { var out = ''; lv.w.forEach(function (w) { eachCell(w, function (el, i, k) { if (k === key) out = w[0][i]; }); }); return out; }
  function fill(w, animate) {
    eachCell(w, function (el, i) {
      var go = function () { el.textContent = w[0][i]; el.classList.remove('is-hinted'); el.classList.add('is-found'); };
      if (animate) setTimeout(go, i * 90); else go();
    });
  }

  function buildWheel() {
    wheel.querySelectorAll('.wb-petal').forEach(function (p) { p.remove(); });
    petals = [];
    var n = order.length;
    order.forEach(function (ch, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'wb-petal'; b.textContent = ch; b.setAttribute('data-i', i);
      b.setAttribute('aria-label', 'Letter ' + ch);
      var a = -Math.PI / 2 + i / n * Math.PI * 2, rad = n > 6 ? 37 : 35;
      b.style.left = (50 + Math.cos(a) * rad) + '%'; b.style.top = (50 + Math.sin(a) * rad) + '%';
      wheel.appendChild(b); petals.push(b);
    });
  }

  // ---------- choosing letters: swipe, or tap one by one ----------
  var chosen = [], dragging = false, tapMode = false, pointer = null;
  function word() { return chosen.map(function (i) { return order[i]; }).join(''); }
  function drawLines() {
    var box = wheel.getBoundingClientRect(), pts = chosen.map(function (i) { var r = petals[i].getBoundingClientRect(); return [r.left - box.left + r.width / 2, r.top - box.top + r.height / 2]; });
    if (dragging && pointer && pts.length) pts.push([pointer[0] - box.left, pointer[1] - box.top]);
    lines.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
    lines.innerHTML = pts.length > 1 ? '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '"/>' : '';
    petals.forEach(function (p, i) { p.classList.toggle('is-on', chosen.indexOf(i) !== -1); });
    wordEl.textContent = word();
    wordEl.classList.remove('is-good', 'is-bonus', 'is-miss', 'is-again');
  }
  function petalAt(x, y) {
    var hit = null;
    petals.forEach(function (p, i) { var r = p.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; if (Math.hypot(cx - x, cy - y) < r.width * 0.55) hit = i; });
    return hit;
  }
  function add(i) {
    if (i == null) return;
    if (chosen.length > 1 && chosen[chosen.length - 2] === i) { chosen.pop(); drawLines(); return; } // slide back to undo
    if (chosen.indexOf(i) !== -1) return;
    chosen.push(i); note(chosen.length - 1); drawLines();
  }
  wheel.addEventListener('pointerdown', function (e) {
    var i = petalAt(e.clientX, e.clientY);
    if (e.target.closest('.wb-mid')) { if (chosen.length) submit(); return; }
    if (i == null) return;
    e.preventDefault(); wake();
    try { wheel.setPointerCapture(e.pointerId); } catch (err) {}
    if (tapMode && chosen.length) { add(i); return; }
    dragging = true; pointer = [e.clientX, e.clientY]; chosen = []; add(i);
  });
  wheel.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    pointer = [e.clientX, e.clientY]; add(petalAt(e.clientX, e.clientY)); drawLines();
  });
  function up() {
    if (!dragging) return; dragging = false; pointer = null;
    if (chosen.length === 1) { tapMode = true; drawLines(); noteEl.innerHTML = 'Tap more petals, then tap the middle to try the word.'; return; }
    submit();
  }
  wheel.addEventListener('pointerup', up);
  wheel.addEventListener('pointercancel', function () { dragging = false; chosen = []; drawLines(); });
  // keyboard: type letters, Enter to try, Backspace to undo
  document.addEventListener('keydown', function (e) {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || root.classList.contains('is-done')) return;
    var k = e.key.toUpperCase();
    if (k === 'ENTER' && chosen.length) { e.preventDefault(); submit(); return; }
    if (k === 'BACKSPACE' && chosen.length) { e.preventDefault(); chosen.pop(); drawLines(); return; }
    if (k === 'ESCAPE') { chosen = []; drawLines(); return; }
    if (/^[A-Z]$/.test(k)) { var i = -1; order.forEach(function (ch, j) { if (i < 0 && ch === k && chosen.indexOf(j) === -1) i = j; }); if (i >= 0) { wake(); tapMode = true; add(i); } }
  });

  function submit() {
    var w = word(); tapMode = false;
    if (w.length < 3) { chosen = []; drawLines(); return; }
    var hit = lv.w.filter(function (x) { return x[0] === w; })[0];
    if (hit && S.found.indexOf(w) === -1) {
      S.found.push(w); save(); fill(hit, true); feedback('is-good');
      var m = wake(); if (m) m.reward(false);
      var left = lv.w.length - S.found.length;
      noteEl.innerHTML = '<b>' + cap(w) + '</b> ' + (left ? '· ' + left + (left === 1 ? ' word to go' : ' words to go') : '');
      say('Found ' + w.toLowerCase() + '.');
      if (!left) setTimeout(finish, 700);
    } else if (hit || S.bonus.indexOf(w) !== -1) {
      feedback('is-again'); noteEl.innerHTML = 'You already found <b>' + cap(w) + '</b>.';
    } else if (lv.b.indexOf(w) !== -1) {
      S.bonus.push(w); S.jar++; save(); feedback('is-bonus'); jar(true);
      var mm = wake(); if (mm) mm.pluck(mm.note(6), 0.05);
      noteEl.innerHTML = '<b>' + cap(w) + '</b> is a bonus word ✨ ' + (10 - S.jar % 10 === 10 ? '' : (10 - S.jar % 10) + ' more fills the jar.');
      if (S.jar % 10 === 0 && R) R.earn(10, 'bloom', 'Bonus jar full');
    } else {
      feedback('is-miss'); noteEl.textContent = 'Not this time. Try another.';
    }
    setTimeout(function () { chosen = []; drawLines(); }, 450);
  }
  function feedback(cls) { wordEl.classList.add(cls); }
  function cap(w) { return w.charAt(0) + w.slice(1).toLowerCase(); }
  function say(t) { live.textContent = t; }
  function jar(bump) { var el = $('.wb-jar-n'); el.textContent = String(S.jar % 10) + '/10'; var j = $('.wb-jar'); if (bump) { j.classList.remove('is-bump'); void j.offsetWidth; j.classList.add('is-bump'); } j.style.setProperty('--fill', (S.jar % 10) * 10 + '%'); }

  function finish() {
    root.classList.add('is-done');
    var perfect = S.hints === 0, petalsWon = 4 + lv.w.length + (perfect ? 5 : 0) + S.bonus.length;
    S.cleared++; if (perfect) S.perfect++;
    save();
    var m = wake(); if (m) { m.home(); setTimeout(function () { m.reward(true); }, 500); }
    if (window.TOLGarden && S.cleared % 5 === 0) window.TOLGarden.gift('words');
    if (R) { R.earn(petalsWon, 'bloom', perfect ? 'Perfect bloom, no hints' : 'Level ' + (S.level + 1) + ' bloomed'); R.record('bloom', 'levels'); R.record('bloom', 'best', S.level + 1, 'max'); }
    var card = $('.wb-done');
    card.querySelector('.wb-done-h').textContent = perfect ? 'A perfect bloom!' : 'Level ' + (S.level + 1) + ' bloomed';
    card.querySelector('.wb-done-p').textContent = KIND[S.level % KIND.length] + (S.bonus.length ? ' You found ' + S.bonus.length + ' bonus ' + (S.bonus.length === 1 ? 'word' : 'words') + ' too.' : '');
    card.querySelector('.wb-done-petals').textContent = '+' + petalsWon + ' petals';
    card.hidden = false;
    card.querySelector('.wb-next').focus();
    say('Level complete.');
  }

  // ---------- buttons ----------
  $('.wb-next').addEventListener('click', function () { $('.wb-done').hidden = true; start(S.level + 1 < LEVELS.length ? S.level + 1 : 0); });
  $('.wb-shuffle').addEventListener('click', function () {
    for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t; }
    chosen = []; wheel.classList.add('is-spin'); setTimeout(function () { wheel.classList.remove('is-spin'); buildWheel(); drawLines(); }, 250);
  });
  $('.wb-hint').addEventListener('click', function () {
    // show one letter of a word not yet found
    var left = lv.w.filter(function (w) { return S.found.indexOf(w[0]) === -1; });
    for (var k = 0; k < left.length; k++) {
      var done = false;
      eachCell(left[k], function (el, i, key) { if (!done && !el.textContent) { el.textContent = left[k][0][i]; el.classList.add('is-hinted'); S.revealed.push(key); done = true; } });
      if (done) { S.hints++; save(); noteEl.textContent = 'A letter is showing. Finish without hints for a perfect bloom next time.'; return; }
    }
  });
  var sb = $('.wb-sound');
  function soundLabel() { sb.setAttribute('aria-pressed', String(soundOn)); sb.innerHTML = soundOn ? '&#127925;' : '&#128263;'; sb.setAttribute('aria-label', soundOn ? 'Music on' : 'Music off'); }
  sb.addEventListener('click', function () { soundOn = !soundOn; set('tol-bloom-sound', soundOn ? 'on' : 'off'); soundLabel(); if (soundOn) wake(); else if (music) music.stop(); });
  soundLabel();
  document.addEventListener('visibilitychange', function () { if (!music) return; if (document.hidden) music.stop(); else if (soundOn) music.start(); });
  window.addEventListener('resize', drawLines);

  start(S.level);
  root.hidden = false;
  window.__wordBloom = { state: S, get level() { return lv; }, submitWord: function (w) { chosen = []; w.split('').forEach(function (ch) { var i = -1; order.forEach(function (o, j) { if (i < 0 && o === ch && chosen.indexOf(j) === -1) i = j; }); chosen.push(i); }); submit(); }, start: start };
})();
