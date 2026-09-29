/* quiet-words.js — Quiet Words (/quiet-words.html): a calming word search.
   No timer, no score, no losing. Drag across letters (or tap the first letter, then the
   last) to find a word; it glows, rings softly and leaves a kind line behind.
   Every puzzle has its own theme; "Next" and "Random" pick the next one (game-levels.js). Progress stays in this browser. */
(function () {
  'use strict';
  var root = document.getElementById('qw'); if (!root) return;

  var FALLBACK = [
    { name: 'Calm', words: [
      ['CALM', 'Calm isn’t the absence of feelings. It’s a little room around them.'],
      ['BREATHE', 'Your breath is always there to come back to.'],
      ['REST', 'Rest is part of the work, not a break from it.'],
      ['SOFT', 'You’re allowed to be soft with yourself today.'],
      ['STILL', 'A still moment is enough. It doesn’t have to be long.'],
      ['EASE', 'Ease in. There’s no rush here.'],
      ['QUIET', 'Quiet is a kind of kindness to your mind.'],
      ['SLOW', 'Slow is still moving.']] },
    { name: 'Kindness', words: [
      ['KIND', 'Kindness counts most when it’s small and ordinary.'],
      ['GENTLE', 'Gentle is strong. It just doesn’t shout.'],
      ['CARE', 'Caring for yourself is how you keep caring for others.'],
      ['SMILE', 'Smile at someone today. It travels further than you think.'],
      ['THANKS', 'Say one specific thank-you before the day ends.'],
      ['HUG', 'A slow hug helps two people settle.'],
      ['HELP', 'Asking for help is a kindness to the person you ask.'],
      ['WARM', 'Warmth is remembered long after words are forgotten.']] },
    { name: 'Night Garden', words: [
      ['MOON', 'The moon is never really gone. Neither is calm.'],
      ['STARS', 'Even on cloudy nights, the stars are still there.'],
      ['FIREFLY', 'Small lights matter. Be one for someone today.'],
      ['BLOOM', 'You bloom in your own season.'],
      ['POND', 'Let your thoughts settle, like water going still.'],
      ['LILY', 'Float for a while. You don’t have to swim hard.'],
      ['GLOW', 'The glow comes back after rest.'],
      ['BREEZE', 'Let a worry pass by like a breeze.']] },
    { name: 'Connection', words: [
      ['TOGETHER', 'Most of closeness is ordinary moments, shared.'],
      ['LISTEN', 'Listening is one of the kindest things you can do.'],
      ['TRUST', 'Trust is built in small, kept promises.'],
      ['SHARE', 'Share one good thing from your day.'],
      ['LAUGH', 'Laughing together is a small repair.'],
      ['FRIEND', 'Send a friend a “thinking of you” text.'],
      ['HOME', 'Home is often a person, not a place.'],
      ['LOVE', 'Love shows up in how we answer the little moments.']] },
    { name: 'Gratitude', words: [
      ['GRATEFUL', 'Name three things that went okay today. Small things count.'],
      ['GIFT', 'Today is a small gift, even the plain parts.'],
      ['JOY', 'Joy is often tiny. Look for it at eye level.'],
      ['LIGHT', 'Let a little light in, even through a crack.'],
      ['HOPE', 'Hope is a quiet thing. It still counts.'],
      ['GROW', 'You’re growing, even when it doesn’t feel like it.'],
      ['ENOUGH', 'You are doing enough.'],
      ['SUNRISE', 'Tomorrow starts fresh.']] },
    { name: 'Paws', words: [
      ['PAWS', 'For the small companions who love us without words.'],
      ['WAG', 'Be as glad to see someone as a dog is.'],
      ['PUPPY', 'Play is good for grown-ups too.'],
      ['TREAT', 'Give yourself a small treat today.'],
      ['CUDDLE', 'Comfort counts. Let yourself be comforted.'],
      ['WALK', 'A short walk can lift a whole day.'],
      ['LOYAL', 'Loyalty is love that keeps showing up.'],
      ['FETCH', 'Chase something just for the fun of it.']] }
  ];
  // The themes live in a big bank (assets/js/puzzles/qw-themes-<k>.js, over 400 of them), loaded a
  // chunk at a time by game-levels.js; these six are only for when that can't load. Every level keeps
  // its own record of the themes you've seen, and once you've seen them all, new puzzles mix two
  // themes together (mix() below), so there's always a fresh one.
  var THEMES = FALLBACK;
  // five difficulty levels: bigger grids, more words, and more directions (backwards at the top)
  var ALLDIRS = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
  var TIERS = {
    gentle: { N: 7, dirs: ALLDIRS.slice(0, 2), words: 5 }, easy: { N: 9, dirs: ALLDIRS.slice(0, 3), words: 7 },
    medium: { N: 10, dirs: ALLDIRS.slice(0, 4), words: 8 }, hard: { N: 11, dirs: ALLDIRS, words: 10 }, expert: { N: 12, dirs: ALLDIRS, words: 12 }
  };
  var N = 9, DIRS = TIERS.easy.dirs, cur = null;
  var levels = window.TOLLevels ? window.TOLLevels.create({ game: 'words', tiers: ['gentle', 'easy', 'medium', 'hard', 'expert'].map(function (id) {
    return { id: id, name: id.charAt(0).toUpperCase() + id.slice(1), bank: 'qw-themes' };
  }), keyOf: function (t) { return t.name; }, generate: mix,
    // each level opens at its own place in the theme bank (so they don't all begin with "Calm"), and
    // counts the puzzles you've played there: 1, 2, 3 ...
    startAt: function (k, n) { return Math.floor(n * k / 5) + k * 7; }, countSeen: true }) : null;
  function mix(ctx) {
    var a = Math.floor(ctx.rand() * ctx.chunks), b = Math.floor(ctx.rand() * ctx.chunks);
    return Promise.all([ctx.chunk(a), ctx.chunk(b)]).then(function (l) {
      var T = TIERS[ctx.tier.id] || TIERS.easy, pool = l[0].concat(l[1]).filter(function (t) { return ctx.recent.indexOf(t.name) === -1 && t.words.filter(function (w) { return w[0].length <= T.N; }).length >= 5; });
      if (pool.length < 2) pool = l[0].concat(l[1]);
      var x = pool[Math.floor(ctx.rand() * pool.length)], y = x;
      for (var k = 0; k < 20 && (y === x || y.name === x.name); k++) y = pool[Math.floor(ctx.rand() * pool.length)];
      var words = [], seen = {};
      function take(t) { var ws = t.words.slice(); for (var i = ws.length - 1; i > 0; i--) { var j = Math.floor(ctx.rand() * (i + 1)), s = ws[i]; ws[i] = ws[j]; ws[j] = s; } return ws; }
      var wx = take(x), wy = take(y);
      for (var i = 0; words.length < 18 && (i < wx.length || i < wy.length); i++) [wx[i], wy[i]].forEach(function (w) { if (w && !seen[w[0]]) { seen[w[0]] = 1; words.push(w); } });
      return { name: x.name + ' & ' + y.name, words: words, fresh: true };
    });
  }
  var FILL = 'AEIOUAEIOULNRSTDGHMBPWY';
  // a few letter runs kept out of the grid (written backwards-shifted so they don't read as words here)
  var AVOID = ['fuvg', 'nff', 'gvg', 'cvff', 'qnza', 'uryy', 'fyhg', 'juber', 'anmv', 'ubr', 'cbea', 'cbbc'].map(function (w) {
    return w.replace(/[a-z]/g, function (c) { return String.fromCharCode((c.charCodeAt(0) - 84) % 26 + 97); }).toUpperCase();
  });

  var COLORS = ['#F9C9B4', '#D9C8F0', '#BFE3CF', '#C6DFF4', '#F8E7AE', '#F7C9D4', '#FBD5C0', '#CDE6F7'];
  var $ = function (q) { return root.querySelector(q); };
  var gridEl = $('.qw-grid'), svg = $('.qw-marks'), listEl = $('.qw-words'), noteEl = $('.qw-note'), themeEl = $('.qw-theme'), live = $('.qw-live');
  var grid = [], words = [], found = {}, theme = null, puzzleNo = 0;
  function get(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // ---------- sound: soft music that answers you (calm-music.js) ----------
  // Background chords and a gentle melody; each letter you pick plays the next rising note in
  // tune with the chord, and every found word settles with a small arpeggio.
  // Off until you turn it on (remembered on this device); the site's Quiet mode keeps it off.
  var music = null, soundSw = null;
  function soundOn() { return !!(soundSw && soundSw.on()); }
  function wake() {
    if (!soundOn() || !window.TOLMusic) return null;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    if (!music) { music = window.TOLMusic.create(); music.level(0.5); }
    music.start(); return music;
  }
  function letterNote(i) { var m = wake(); if (m) m.pluck(m.note(i + 2), 0.045); }
  function bell(i) { var m = wake(); if (m) m.reward(false); }

  // ---------- making a puzzle ----------
  // Every choice comes from a random number seeded by the level, the puzzle's number and its theme,
  // so "Gentle · 1" is the same grid every time you open it.
  var rnd = Math.random;
  function seeded(key) {
    if (!window.TOLLevels || !window.TOLLevels.rng) return Math.random;
    return window.TOLLevels.rng(window.TOLLevels.hash('words:' + key));
  }
  function build(th) {
    for (var tries = 0; tries < 80; tries++) {
      var g = []; for (var r = 0; r < N; r++) g.push(new Array(N).fill(''));
      var placed = [], ok = true;
      var list = th.words.slice().sort(function (a, b) { return b[0].length - a[0].length; });
      for (var w = 0; w < list.length && ok; w++) {
        var word = list[w][0], done = false;
        for (var k = 0; k < 300 && !done; k++) {
          var d = DIRS[Math.floor(rnd() * DIRS.length)], r0 = Math.floor(rnd() * N), c0 = Math.floor(rnd() * N);
          var re = r0 + d[0] * (word.length - 1), ce = c0 + d[1] * (word.length - 1);
          if (re < 0 || re >= N || ce < 0 || ce >= N) continue;
          var fits = true;
          for (var i = 0; i < word.length; i++) { var ch = g[r0 + d[0] * i][c0 + d[1] * i]; if (ch && ch !== word[i]) { fits = false; break; } }
          if (!fits) continue;
          for (i = 0; i < word.length; i++) g[r0 + d[0] * i][c0 + d[1] * i] = word[i];
          placed.push({ word: word, line: list[w][1], r: r0, c: c0, dr: d[0], dc: d[1] }); done = true;
        }
        if (!done) ok = false;
      }
      if (!ok) continue;
      var own = g.map(function (row) { return row.map(function (ch) { return !!ch; }); });
      for (r = 0; r < N; r++) for (var c = 0; c < N; c++) if (!g[r][c]) g[r][c] = FILL[Math.floor(rnd() * FILL.length)];
      if (clean(g, own)) return { grid: g, words: placed };
    }
    return null;
  }
  // no unkind letter runs in the grid. A run that lies wholly inside the hidden words is fine (SHELL,
  // GLASS and HELLO are gentle words); only one that touches a random filler letter is rejected.
  function clean(g, own) {
    var lines = [], r, c, k;
    function add(cells) { lines.push(cells); }
    for (r = 0; r < N; r++) { var row = []; for (c = 0; c < N; c++) row.push([r, c]); add(row); }
    for (c = 0; c < N; c++) { var col = []; for (r = 0; r < N; r++) col.push([r, c]); add(col); }
    for (var s = -N + 1; s < N; s++) { var d1 = [], d2 = []; for (r = 0; r < N; r++) { var c1 = r + s; if (c1 >= 0 && c1 < N) d1.push([r, c1]); var c2 = s + N - 1 - r; if (c2 >= 0 && c2 < N) d2.push([r, c2]); } add(d1); add(d2); }
    return !lines.some(function (cells) {
      return [cells, cells.slice().reverse()].some(function (cs) {
        var text = cs.map(function (p) { return g[p[0]][p[1]]; }).join('');
        return AVOID.some(function (a) {
          for (var at = text.indexOf(a); at !== -1; at = text.indexOf(a, at + 1)) {
            for (k = at; k < at + a.length; k++) if (!own[cs[k][0]][cs[k][1]]) return true;
          }
          return false;
        });
      });
    });
  }


  function start(index, c) {
    var th = c && c.puzzle ? c.puzzle : THEMES[index % THEMES.length];
    // the level decides the grid size, the directions and how many of the theme's words to hide
    var T = TIERS[c ? c.tier.id : 'easy'] || TIERS.easy, was = [N, DIRS];
    N = T.N; DIRS = T.dirs;
    var key = (c ? c.tier.id + ':' + c.index : 'x:' + index) + ':' + th.name;
    rnd = seeded(key);
    var pool = th.words.filter(function (w) { return w[0].length <= N; });
    for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp; }
    var made = null, kept = loadPlace(key, N);
    if (kept) made = { grid: kept.grid, words: kept.words };
    for (var want = T.words; !made && want >= 3; want--) made = build({ name: th.name, words: pool.slice(0, want) });
    if (!made) { N = was[0]; DIRS = was[1]; return; } // keep the puzzle on screen as it was
    puzzleNo = index; theme = th; cur = c || null;
    gridEl.style.gridTemplateColumns = 'repeat(' + N + ', 1fr)';
    if (levels && c) levels.paintBar(barEl, c);
    grid = made.grid; words = made.words; found = kept ? kept.found : {}; hinted = kept ? !!kept.hinted : false; placeKey = key;
    themeEl.textContent = theme.name;
    var nFound = Object.keys(found).length;
    noteEl.innerHTML = nFound ? '<span class="qw-note-h">Welcome back.</span> Your ' + (nFound === 1 ? 'word is' : nFound + ' words are') + ' still glowing, right where you left ' + (nFound === 1 ? 'it' : 'them') + '.'
      : '<span class="qw-note-h">Find the words, at your own pace.</span> Drag across the letters, or tap the first letter and then the last.';
    root.classList.remove('is-done');
    render();
    words.forEach(function (w) { if (found[w.word]) { var li = listEl.querySelector('[data-w="' + w.word + '"]'); if (li) { li.classList.add('is-found'); li.style.setProperty('--c', found[w.word]); } } });
    drawMarks();
    if (nFound && nFound === words.length) { root.classList.add('is-done'); noteEl.innerHTML = '<span class="qw-note-h">All found.</span> This one is finished. A new theme is waiting under Next whenever you’re ready.'; }
    savePlace();
  }

  // ---------- your place, kept on this device ----------
  // The puzzle you're on and the words you've found stay in this browser (nothing is sent anywhere),
  // so leaving the page and coming back picks up where you were.
  var PLACE = 'tol-qw-place', placeKey = null;
  function loadPlace(key, n) {
    try {
      var o = JSON.parse(localStorage.getItem(PLACE) || 'null');
      if (o && o.key === key && o.n === n && o.grid && o.grid.length === n && o.words && o.words.length) {
        return { grid: o.grid.map(function (row) { return row.split(''); }), words: o.words, found: o.found || {}, hinted: o.hinted };
      }
    } catch (e) {}
    return null;
  }
  function savePlace() {
    if (!placeKey) return;
    set(PLACE, JSON.stringify({ key: placeKey, n: N, grid: grid.map(function (row) { return row.join(''); }), words: words, found: found, hinted: hinted }));
  }


  // ---------- drawing ----------
  var tiles = [];
  function render() {
    gridEl.innerHTML = ''; tiles = [];
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'qw-tile'; b.textContent = grid[r][c];
      b.setAttribute('data-r', r); b.setAttribute('data-c', c);
      b.setAttribute('aria-label', grid[r][c] + ', row ' + (r + 1) + ', column ' + (c + 1));
      gridEl.appendChild(b); tiles.push(b);
    }
    listEl.innerHTML = words.slice().sort(function (a, b) { return a.word < b.word ? -1 : 1; }).map(function (w) {
      return '<li data-w="' + w.word + '"><span>' + w.word.charAt(0) + w.word.slice(1).toLowerCase() + '</span></li>';
    }).join('');
    drawMarks();
  }
  function tile(r, c) { return tiles[r * N + c]; }
  function centre(r, c) { var t = tile(r, c), g = gridEl.getBoundingClientRect(), b = t.getBoundingClientRect(); return [b.left - g.left + b.width / 2, b.top - g.top + b.height / 2, b.width]; }
  function drawMarks(sel) {
    var g = gridEl.getBoundingClientRect(); svg.setAttribute('viewBox', '0 0 ' + g.width + ' ' + g.height);
    var out = '';
    words.forEach(function (w, i) {
      if (!found[w.word]) return;
      var a = centre(w.r, w.c), e = centre(w.r + w.dr * (w.word.length - 1), w.c + w.dc * (w.word.length - 1));
      out += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + e[0] + '" y2="' + e[1] + '" stroke="' + found[w.word] + '" stroke-width="' + (a[2] * 0.78) + '" stroke-linecap="round" class="qw-found-mark"/>';
    });
    if (sel && sel.length) {
      var s0 = centre(sel[0][0], sel[0][1]), s1 = centre(sel[sel.length - 1][0], sel[sel.length - 1][1]);
      out += '<line x1="' + s0[0] + '" y1="' + s0[1] + '" x2="' + s1[0] + '" y2="' + s1[1] + '" stroke="rgba(185,160,224,.45)" stroke-width="' + (s0[2] * 0.78) + '" stroke-linecap="round"/>';
    }
    svg.innerHTML = out;
  }

  // ---------- choosing letters: drag, or tap first then last ----------
  var anchor = null, dragging = false, moved = false, sel = [];
  function cellFromPoint(x, y) { var el = document.elementFromPoint(x, y); el = el && el.closest ? el.closest('.qw-tile') : null; return el ? [+el.getAttribute('data-r'), +el.getAttribute('data-c')] : null; }
  function lineTo(a, b) {
    var dr = b[0] - a[0], dc = b[1] - a[1];
    if (!(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc))) { // snap to the nearest straight line
      var ang = Math.atan2(dr, dc), step = Math.round(ang / (Math.PI / 4)), len = Math.max(Math.abs(dr), Math.abs(dc));
      dr = Math.round(Math.sin(step * Math.PI / 4)) * len; dc = Math.round(Math.cos(step * Math.PI / 4)) * len;
    }
    var n = Math.max(Math.abs(dr), Math.abs(dc)), sr = Math.sign(dr), sc = Math.sign(dc), out = [];
    for (var i = 0; i <= n; i++) { var r = a[0] + sr * i, c = a[1] + sc * i; if (r < 0 || r >= N || c < 0 || c >= N) break; out.push([r, c]); }
    return out;
  }
  function markAnchor(on) { tiles.forEach(function (t) { t.classList.remove('is-anchor'); }); if (on && anchor) tile(anchor[0], anchor[1]).classList.add('is-anchor'); }
  gridEl.addEventListener('pointerdown', function (e) {
    var cell = cellFromPoint(e.clientX, e.clientY); if (!cell) return;
    e.preventDefault(); dragging = true; moved = false; wake();
    if (anchor && (anchor[0] !== cell[0] || anchor[1] !== cell[1])) { sel = lineTo(anchor, cell); drawMarks(sel); return; }
    anchor = cell; sel = [cell]; drawMarks(sel); letterNote(0);
  });
  gridEl.addEventListener('pointermove', function (e) {
    if (!dragging || !anchor) return;
    var cell = cellFromPoint(e.clientX, e.clientY); if (!cell) return;
    if (cell[0] !== anchor[0] || cell[1] !== anchor[1]) moved = true;
    var before = sel.length; sel = lineTo(anchor, cell); drawMarks(sel);
    if (sel.length > before) letterNote(sel.length - 1); // each new letter rises a note
  });
  window.addEventListener('pointerup', function () {
    if (!dragging) return; dragging = false;
    if (sel.length > 1) { check(sel); anchor = null; sel = []; markAnchor(false); drawMarks(); return; }
    markAnchor(true); // a single tap: wait for the last letter
  });
  // keyboard: Enter on the first letter, then on the last
  gridEl.addEventListener('keydown', function (e) {
    var t = e.target.closest && e.target.closest('.qw-tile'); if (!t) return;
    var r = +t.getAttribute('data-r'), c = +t.getAttribute('data-c'), move = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
    if (move) { e.preventDefault(); var nr = Math.max(0, Math.min(N - 1, r + move[0])), nc = Math.max(0, Math.min(N - 1, c + move[1])); tile(nr, nc).focus(); if (anchor) drawMarks(lineTo(anchor, [nr, nc])); return; }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!anchor) { anchor = [r, c]; markAnchor(true); drawMarks([anchor]); say('Starting at ' + grid[r][c] + '. Now choose the last letter.'); }
      else { var line = lineTo(anchor, [r, c]); anchor = null; markAnchor(false); if (line.length > 1) check(line); drawMarks(); }
    }
    if (e.key === 'Escape') { anchor = null; markAnchor(false); drawMarks(); }
  });
  function say(msg) { live.textContent = msg; }

  function check(line) {
    var text = line.map(function (p) { return grid[p[0]][p[1]]; }).join(''), back = text.split('').reverse().join('');
    // the word, wherever you found it: SLED can turn up inside another word as well as in its own spot
    var hit = words.filter(function (w) { return !found[w.word] && (w.word === text || w.word === back) && sameCells(w, line); })[0] ||
      words.filter(function (w) { return !found[w.word] && (w.word === text || w.word === back); })[0];
    if (!hit) { miss(text, back, line); return; }
    if (!sameCells(hit, line)) {
      // found it somewhere else: mark it where you found it
      var a = line[0], b = line[line.length - 1], fwd = hit.word === text;
      hit.r = fwd ? a[0] : b[0]; hit.c = fwd ? a[1] : b[1];
      hit.dr = Math.sign((fwd ? b[0] : a[0]) - hit.r); hit.dc = Math.sign((fwd ? b[1] : a[1]) - hit.c);
    }
    var n = Object.keys(found).length;
    found[hit.word] = COLORS[n % COLORS.length];
    bell(n);
    line.forEach(function (p, i) { var t = tile(p[0], p[1]); setTimeout(function () { t.classList.add('is-pop'); setTimeout(function () { t.classList.remove('is-pop'); }, 450); }, i * 60); });
    var li = listEl.querySelector('[data-w="' + hit.word + '"]'); if (li) { li.classList.add('is-found'); li.style.setProperty('--c', found[hit.word]); }
    noteEl.innerHTML = '<span class="qw-note-h">' + hit.word.charAt(0) + hit.word.slice(1).toLowerCase() + '</span> ' + hit.line;
    say('Found ' + hit.word.toLowerCase() + '. ' + hit.line);
    drawMarks(); savePlace();
    if (Object.keys(found).length === words.length) finish();
  }
  // a gentle word when a line isn't one of the hidden words
  function miss(text, back, line) {
    if (line.length < 3) return;
    var done = words.filter(function (w) { return found[w.word] && (w.word === text || w.word === back); })[0];
    noteEl.innerHTML = done ? '<span class="qw-note-h">Already found.</span> ' + cap(done.word) + ' is glowing on the board.'
      : '<span class="qw-note-h">Not one of the hidden words.</span> Keep looking, there’s no rush.';
    say(done ? 'Already found ' + done.word.toLowerCase() + '.' : 'Not one of the hidden words.');
    gridEl.classList.remove('is-miss'); void gridEl.offsetWidth; gridEl.classList.add('is-miss');
  }
  function cap(w) { return w.charAt(0) + w.slice(1).toLowerCase(); }
  function sameCells(w, line) {
    var cells = []; for (var i = 0; i < w.word.length; i++) cells.push((w.r + w.dr * i) + ',' + (w.c + w.dc * i));
    var got = line.map(function (p) { return p[0] + ',' + p[1]; });
    return cells.join('|') === got.join('|') || cells.join('|') === got.slice().reverse().join('|');
  }
  var hinted = false;
  function finish() {
    if (window.TOLGarden) window.TOLGarden.gift('words');
    if (window.TOLRewards) { window.TOLRewards.earn(10 + words.length, 'words', 'Puzzle finished'); window.TOLRewards.record('words', 'done'); }
    root.classList.add('is-done');
    var n = +get('tol-qw-done', '0') + 1; set('tol-qw-done', String(n));
    setTimeout(function () { var m = wake(); if (m) { m.home(); setTimeout(function () { m.reward(true); }, 600); } }, 300);
    noteEl.innerHTML = '<span class="qw-note-h">All found. Lovely.</span> Take a slow breath before you go. ' +
      (n > 1 ? 'You’ve finished ' + n + ' quiet puzzles here.' : 'A new theme is waiting under Next whenever you’re ready.');
    say('All the words are found.');
    if (levels && cur) { levels.finished(cur); noteEl.insertAdjacentHTML('beforeend', window.TOLLevels.programTip()); }
    if (window.TOLTips) window.TOLTips.get(null, function (t) {
      var p = document.createElement('span'); p.className = 'qw-tip'; p.innerHTML = '<strong>A little tip for today:</strong> ' + t[0] + ' ' + t[1];
      noteEl.appendChild(p);
    });
  }

  // ---------- buttons ----------
  function go(p) { p.then(function (c) { start(c.index, c); }, function () { noteEl.textContent = 'That puzzle didn\u2019t load. Check your connection and try again.'; }); }
  var barEl = $('.gl-host');
  if (levels) levels.bar(barEl, function (p) { go(p); });
  $('.qw-next').addEventListener('click', function () { if (levels) go(levels.next()); else start(puzzleNo + 1); });
  // today's theme: picked from the bank by the date alone, so it's the same for everyone today
  $('.qw-today').addEventListener('click', function () {
    var d = new Date(), day = Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
    if (!levels) { start(day % THEMES.length); return; }
    levels.load(levels.state().tier).then(function (inf) {
      var i = (window.TOLLevels.hash('daily:words') + (day % inf.n) * 7919) % inf.n;
      go(levels.pick(i));
    });
  });
  // choose any theme (the list of names loads the first time it's opened)
  var picker = $('.qw-picker'), pickBtn = $('.qw-pick');
  function fillPicker(names) { picker.innerHTML = names.map(function (n, i) { return '<button type="button" data-theme="' + i + '">' + esc(n) + '</button>'; }).join(''); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }
  if (!levels) fillPicker(THEMES.map(function (t) { return t.name; }));
  pickBtn.addEventListener('click', function () {
    picker.hidden = !picker.hidden; pickBtn.setAttribute('aria-expanded', String(!picker.hidden));
    if (levels && !picker.hidden && !picker.children.length) {
      picker.innerHTML = '<p>Loading the themes…</p>';
      window.TOLLevels.script('qw-names').then(function () { fillPicker(window.TOL_QW_NAMES || []); }, function () { picker.innerHTML = '<p>The themes didn’t load. Check your connection and try again.</p>'; });
    }
  });
  picker.addEventListener('click', function (e) {
    var b = e.target.closest('[data-theme]'); if (!b) return;
    picker.hidden = true; pickBtn.setAttribute('aria-expanded', 'false');
    var i = +b.getAttribute('data-theme');
    if (levels) go(levels.pick(i)); else start(i);
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('.qw-hint').addEventListener('click', function () {
    var left = words.filter(function (w) { return !found[w.word]; }); if (!left.length) return;
    var w = left[Math.floor(Math.random() * left.length)], t = tile(w.r, w.c); hinted = true;
    t.classList.add('is-hint'); setTimeout(function () { t.classList.remove('is-hint'); }, 3200); savePlace();
    say('Look near the glowing letter for a word.');
  });
  var sb = $('.qw-sound');
  // music plays only after you turn it on here (it is off to begin with)
  if (window.TOLMusic && window.TOLMusic.toggle) soundSw = window.TOLMusic.toggle(sb, { key: 'tol-qw-sound', label: 'Music', onChange: function (on) { if (on) { var m = wake(); if (m) m.reward(false); } else if (music) music.stop(); } });
  else sb.hidden = true;
  document.addEventListener('visibilitychange', function () { if (!music) return; if (document.hidden) music.stop(); else if (soundOn()) music.start(); });
  window.addEventListener('resize', function () { drawMarks(); });

  // carry on through the levels (each one a new theme, at the difficulty you choose)
  if (levels) go(levels.current());
  else start(Math.floor(Date.now() / 864e5) % THEMES.length);
  root.hidden = false;
  window.__quietWords = { levels: levels, mix: mix, get theme() { return theme; }, get words() { return words; }, get found() { return found; }, check: check, lineTo: lineTo };
})();
