/* quiet-words.js — Quiet Words (/quiet-words.html): a calming word search.
   No timer, no score, no losing. Drag across letters (or tap the first letter, then the
   last) to find a word; it glows, rings softly and leaves a kind line behind.
   A new theme each day; "Another puzzle" any time. Progress stays in this browser. */
(function () {
  'use strict';
  var root = document.getElementById('qw'); if (!root) return;

  var THEMES = [
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
      ['FRIEND', 'Send a friend a “thinking of you”.'],
      ['HOME', 'Home is often a person, not a place.'],
      ['LOVE', 'Love shows up in how we answer the little moments.']] },
    { name: 'Gratitude', words: [
      ['GRATEFUL', 'Name three things that went okay today. Small counts.'],
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
  var N = 9, DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1]];
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

  // ---------- sound: a soft bell ----------
  var ac = null, soundOn = get('tol-qw-sound', 'on') !== 'off';
  function bell(i) {
    if (!soundOn) return;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state !== 'running') ac.resume();
      var notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5], f = notes[i % notes.length], t = ac.currentTime;
      [1, 2.01].forEach(function (m, k) {
        var o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f * m; o.type = k ? 'triangle' : 'sine';
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(k ? 0.02 : 0.07, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
        o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 2.5);
      });
    } catch (e) {}
  }

  // ---------- making a puzzle ----------
  function build(th) {
    for (var tries = 0; tries < 80; tries++) {
      var g = []; for (var r = 0; r < N; r++) g.push(new Array(N).fill(''));
      var placed = [], ok = true;
      var list = th.words.slice().sort(function (a, b) { return b[0].length - a[0].length; });
      for (var w = 0; w < list.length && ok; w++) {
        var word = list[w][0], done = false;
        for (var k = 0; k < 300 && !done; k++) {
          var d = DIRS[Math.floor(Math.random() * DIRS.length)], r0 = Math.floor(Math.random() * N), c0 = Math.floor(Math.random() * N);
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
      for (r = 0; r < N; r++) for (var c = 0; c < N; c++) if (!g[r][c]) g[r][c] = FILL[Math.floor(Math.random() * FILL.length)];
      if (clean(g)) return { grid: g, words: placed };
    }
    return null;
  }
  function clean(g) {
    var lines = [];
    for (var r = 0; r < N; r++) lines.push(g[r].join(''));
    for (var c = 0; c < N; c++) { var col = ''; for (r = 0; r < N; r++) col += g[r][c]; lines.push(col); }
    for (var s = -N + 1; s < N; s++) { var d1 = '', d2 = ''; for (r = 0; r < N; r++) { var c1 = r + s; if (c1 >= 0 && c1 < N) d1 += g[r][c1]; var c2 = s + N - 1 - r; if (c2 >= 0 && c2 < N) d2 += g[r][c2]; } lines.push(d1, d2); }
    return !lines.some(function (ln) { var both = ln + ' ' + ln.split('').reverse().join(''); return AVOID.some(function (a) { return both.indexOf(a) !== -1; }); });
  }

  function start(index) {
    puzzleNo = index;
    theme = THEMES[index % THEMES.length];
    var made = build(theme); if (!made) return;
    grid = made.grid; words = made.words; found = {};
    themeEl.textContent = theme.name;
    noteEl.innerHTML = '<span class="qw-note-h">Find the words, at your own pace.</span> Drag across the letters, or tap the first letter and then the last.';
    root.classList.remove('is-done');
    render();
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
    e.preventDefault(); dragging = true; moved = false;
    if (anchor && (anchor[0] !== cell[0] || anchor[1] !== cell[1])) { sel = lineTo(anchor, cell); drawMarks(sel); return; }
    anchor = cell; sel = [cell]; drawMarks(sel);
  });
  gridEl.addEventListener('pointermove', function (e) {
    if (!dragging || !anchor) return;
    var cell = cellFromPoint(e.clientX, e.clientY); if (!cell) return;
    if (cell[0] !== anchor[0] || cell[1] !== anchor[1]) moved = true;
    sel = lineTo(anchor, cell); drawMarks(sel);
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
    var hit = words.filter(function (w) { return !found[w.word] && (w.word === text || w.word === back) && sameCells(w, line); })[0];
    if (!hit) return;
    var n = Object.keys(found).length;
    found[hit.word] = COLORS[n % COLORS.length];
    bell(n);
    line.forEach(function (p, i) { var t = tile(p[0], p[1]); setTimeout(function () { t.classList.add('is-pop'); setTimeout(function () { t.classList.remove('is-pop'); }, 450); }, i * 60); });
    var li = listEl.querySelector('[data-w="' + hit.word + '"]'); if (li) { li.classList.add('is-found'); li.style.setProperty('--c', found[hit.word]); }
    noteEl.innerHTML = '<span class="qw-note-h">' + hit.word.charAt(0) + hit.word.slice(1).toLowerCase() + '</span> ' + hit.line;
    say('Found ' + hit.word.toLowerCase() + '. ' + hit.line);
    drawMarks();
    if (Object.keys(found).length === words.length) finish();
  }
  function sameCells(w, line) {
    var cells = []; for (var i = 0; i < w.word.length; i++) cells.push((w.r + w.dr * i) + ',' + (w.c + w.dc * i));
    var got = line.map(function (p) { return p[0] + ',' + p[1]; });
    return cells.join('|') === got.join('|') || cells.join('|') === got.slice().reverse().join('|');
  }
  function finish() {
    root.classList.add('is-done');
    var n = +get('tol-qw-done', '0') + 1; set('tol-qw-done', String(n));
    setTimeout(function () { [0, 2, 4, 5].forEach(function (k, i) { setTimeout(function () { bell(k); }, i * 180); }); }, 400);
    noteEl.innerHTML = '<span class="qw-note-h">All found. Lovely.</span> Take a slow breath before you go. ' +
      (n > 1 ? 'You’ve finished ' + n + ' quiet puzzles here.' : 'Come back tomorrow for a new theme.');
    say('All the words are found.');
  }

  // ---------- buttons ----------
  $('.qw-next').addEventListener('click', function () { start(puzzleNo + 1); });
  $('.qw-hint').addEventListener('click', function () {
    var left = words.filter(function (w) { return !found[w.word]; }); if (!left.length) return;
    var w = left[Math.floor(Math.random() * left.length)], t = tile(w.r, w.c);
    t.classList.add('is-hint'); setTimeout(function () { t.classList.remove('is-hint'); }, 3200);
    say('Look near the glowing letter for a word.');
  });
  var sb = $('.qw-sound');
  function soundLabel() { sb.setAttribute('aria-pressed', String(soundOn)); sb.innerHTML = soundOn ? '&#127925; Sound on' : '&#127925; Sound off'; }
  sb.addEventListener('click', function () { soundOn = !soundOn; set('tol-qw-sound', soundOn ? 'on' : 'off'); soundLabel(); if (soundOn) bell(2); });
  soundLabel();
  window.addEventListener('resize', function () { drawMarks(); });

  // a new theme each day
  var day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
  start(day % THEMES.length);
  root.hidden = false;
  window.__quietWords = { get words() { return words; }, get found() { return found; }, check: check, lineTo: lineTo };
})();
