/* word-bloom.js — Word Bloom (/word-bloom.html): a calm, moreish letter-wheel game.
   Swipe across the petals (or tap them one by one) to spell a word. Words that belong
   in the little crossword fill it in; other real words go in the bonus jar. Every level
   blooms into the next, and every level counts toward something new in the background (see rewards.js).
   No timer and no way to lose. Progress stays in this browser. */
(function () {
  'use strict';
  var root = document.getElementById('wb'); if (!root) return;
  if (!window.TOLLevels) return;
  // five difficulty levels, each a big bank of wheels that climb gently, loaded a chunk at a time
  // (game-levels.js). Every wheel's letters are used once across all five, and once you've seen a
  // whole bank, new wheels grow right here from the same gentle word list (grow() below).
  var levels = window.TOLLevels.create({ game: 'bloom', tiers: [
    { id: 'gentle', name: 'Gentle', bank: 'bloom-gentle' }, { id: 'easy', name: 'Easy', bank: 'bloom-easy' },
    { id: 'medium', name: 'Medium', bank: 'bloom-medium' }, { id: 'hard', name: 'Hard', bank: 'bloom-hard' },
    { id: 'expert', name: 'Expert', bank: 'bloom-expert' }],
    keyOf: function (p) { return p.l.split('').sort().join(''); },
    generate: function (ctx) { return window.TOLLevels.script('bloom-lex').then(function () { return grow(ctx); }); } });
  var cur = null;
  var R = window.TOLRewards;
  var KEY = 'tol-bloom-v1';
  var CHAPTERS = ['Seedling', 'Sprout', 'Little meadow', 'Morning dew', 'Wildflowers', 'Butterfly hill', 'Honey grove', 'Sunlit orchard', 'Willow pond', 'Moonlit meadow',
    'Lantern lane', 'Firefly field', 'Starlight garden', 'Rose arbor', 'Lavender path', 'Maple hollow', 'Cloud orchard', 'Aurora glade', 'Golden hour', 'Evergreen'];
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
  function start(c) {
    cur = c; lv = c.puzzle;
    var key = c.tier.id + ':' + c.index;
    S.level = (c.base || 0) + c.index;
    if (S.at !== key) { S.at = key; S.found = []; S.bonus = []; S.hints = 0; S.revealed = []; }
    levels.paintBar(barEl, c);
    save();
    order = lv.l.split('');
    var ch = Math.floor(c.index / 10);
    $('.wb-level').textContent = 'Level ' + (S.level + 1);
    $('.wb-chapter').textContent = c.tier.name + ' · ' + CHAPTERS[Math.floor(ch + (c.base || 0) / 10) % CHAPTERS.length];
    if (c.movedUp) setTimeout(function () { noteEl.innerHTML = '<b>You moved up to ' + c.tier.name + '.</b> Bigger wheels, new words.'; }, 50);
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
      noteEl.innerHTML = '<b>' + cap(w) + '</b> is a bonus word ✨ ' + (10 - S.jar % 10 === 10 ? '' : (10 - S.jar % 10) + (10 - S.jar % 10 === 1 ? ' more fills the jar.' : ' more fill the jar.'));
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
    var res = null;
    if (R) { res = R.earn(petalsWon, 'bloom', perfect ? 'Perfect bloom, no hints' : 'Level ' + (S.level + 1) + ' bloomed'); R.record('bloom', 'levels'); R.record('bloom', 'best', S.level + 1, 'max'); }
    var card = $('.wb-done');
    card.querySelector('.wb-done-h').textContent = perfect ? 'A perfect bloom!' : 'Level ' + (S.level + 1) + ' bloomed';
    card.querySelector('.wb-done-p').textContent = KIND[S.level % KIND.length] + (S.bonus.length ? ' You found ' + S.bonus.length + ' bonus ' + (S.bonus.length === 1 ? 'word' : 'words') + ' too.' : '');
    card.querySelector('.wb-done-petals').textContent = (res && res.unlocked && res.unlocked.length ? '\u2728 New in the background: ' + res.unlocked[0].name : res ? '\u2728 Level ' + res.level : '');
    levels.finished(cur);
    var tip = card.querySelector('.wb-done-tip'); if (tip) tip.innerHTML = window.TOLLevels.programTip();
    card.hidden = false;
    card.querySelector('.wb-next').focus();
    say('Level complete.');
  }

  // ---------- buttons ----------
  $('.wb-next').addEventListener('click', function () { $('.wb-done').hidden = true; go(levels.next()); });
  function go(p) { p.then(start, function () { noteEl.textContent = 'That level didn\u2019t load. Check your connection and try again.'; }); }
  // the difficulty bar: switch level, a random level, or the next one
  var barEl = $('.gl-host');
  levels.bar(barEl, function (p) { $('.wb-done').hidden = true; go(p); });
  // ---------- new wheels, grown in the browser once a whole bank has been seen ----------
  // Like tools/word-games/make_levels.py: a base word of the level's length, every word its letters
  // can make, the most familiar of them laid out as a little crossword, and the rest as bonus words.
  // The word list (bloom-lex.js) is the same safe, gentle one the banks were made from.
  var GROW = { gentle: [[4, 5], 3, 5, 0, 1], easy: [[5, 6], 4, 7, 1, 1], medium: [[6, 7], 5, 9, 1, 2], hard: [[7, 8], 6, 10, 2, 2], expert: [[8, 9], 7, 12, 2, 2] };
  var LEX = null;
  function lexicon() {
    if (LEX) return LEX;
    var src = window.TOL_BLOOM_LEX || {}; LEX = { all: [], by: {} };
    Object.keys(src).forEach(function (L) {
      var ws = src[L].w ? src[L].w.split(' ') : [];
      LEX.by[L] = { w: ws, t: src[L].t };
      ws.forEach(function (w, rank) { LEX.all.push({ w: w, n: counts(w), rank: rank, fam: rank < src[L].t[0] ? 0 : rank < src[L].t[1] ? 1 : rank < src[L].t[2] ? 2 : 3 }); });
    });
    return LEX;
  }
  function counts(w) { var c = {}; for (var i = 0; i < w.length; i++) c[w[i]] = (c[w[i]] || 0) + 1; return c; }
  function within(a, b) { for (var k in a) if ((b[k] || 0) < a[k]) return false; return true; }
  function grow(ctx) {
    var g = GROW[ctx.tier.id] || GROW.easy, lens = g[0], lo = g[1], hi = g[2], baseFam = g[3], gridFam = g[4], rand = ctx.rand, X = lexicon();
    for (var tries = 0; tries < 400; tries++) {
      var L = lens[Math.floor(rand() * lens.length)], list = X.by[L]; if (!list) continue;
      var top = list.t[Math.min(baseFam, 2)] || list.w.length, base = list.w[Math.floor(rand() * top)];
      if (!base || new Set(base.split('')).size < L - (L < 7 ? 1 : 2)) continue;
      var key = base.toUpperCase().split('').sort().join('');
      if (ctx.recent.indexOf(key) !== -1) continue;
      var bc = counts(base), form = X.all.filter(function (x) { return x.w.length <= L && within(x.n, bc); });
      var pool = form.filter(function (x) { return x.w !== base && x.fam <= gridFam; });
      if (pool.length + 1 < lo) continue;
      // the most familiar words, with a little shuffle so two wheels from the same letters differ
      pool.sort(function (a, b) { return (a.fam - b.fam) || (a.rank - b.rank + (rand() - 0.5) * 400); });
      var pick = [base.toUpperCase()].concat(pool.slice(0, hi - 1).map(function (x) { return x.w.toUpperCase(); }));
      var side = L >= 9 ? 9 : 8, lay = window.TOLLevels.place(pick, side, side, rand, 25);
      var got = lay.w.map(function (x) { return x[0]; });
      if (got.length < lo || got.indexOf(base.toUpperCase()) === -1) continue;
      var letters = base.toUpperCase().split('');
      for (var i = letters.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)), t = letters[i]; letters[i] = letters[j]; letters[j] = t; }
      return { l: letters.join(''), W: lay.W, H: lay.H, w: lay.w, b: form.map(function (x) { return x.w.toUpperCase(); }).filter(function (w) { return got.indexOf(w) === -1; }).sort(), fresh: true };
    }
    return null;
  }
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

  go(levels.current());
  root.hidden = false;
  window.__wordBloom = { state: S, levels: levels, grow: grow, get level() { return lv; }, submitWord: function (w) { chosen = []; w.split('').forEach(function (ch) { var i = -1; order.forEach(function (o, j) { if (i < 0 && o === ch && chosen.indexOf(j) === -1) i = j; }); chosen.push(i); }); submit(); }, start: start };
})();
