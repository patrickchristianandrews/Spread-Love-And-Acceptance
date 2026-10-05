/* arcade.js — Tidbit and Sugarfoot's Arcade (frequency-journey.html)

   Pick a pup (Tidbit or Sugarfoot), pick a game, press start.
     Treat Chase  a maze game in the spirit of the old arcade chasers: gather every treat while grumpy little
                  clouds of Static drift about. A golden heart turns them into friendly bubbles you can pop.
     Cross the Way  a crossing game in the same spirit: hop over the busy road, ride the logs and lily pads
                  across the river and reach the five doghouses.
     Treat Trail  a snake game: a bubble friend joins the trail for every treat; a bump only shortens it.
     Bubble Break a brick-breaker: bounce a bubble into blocks of Static; a miss just floats back down.
     Treat Shower a catch game: fill the basket with falling treats; a raindrop is only a drip on the nose.
   Every level after the first is new: a freshly built maze, shuffled road and river lanes, new hedges, wall
   patterns and speeds, and a kindness line that isn't repeated until all of them have been seen.
   The site's rule holds: no way to lose. A bump (a cloud, a van, a splash) sends the pup back to the start
   with a soft "oof"; treats already gathered stay gathered and the score never goes down. There is no game
   over. "Relaxed pace" slows everything (it is on by default when the visitor prefers reduced motion).
   Sound is small and optional. Nothing is sent anywhere; the pup you chose, your settings and your best
   scores are kept only in this browser (localStorage key tol-arcade-v1).

   Controls, as easy as can be: the arrow keys or WASD; a swipe; a tap on the playfield (the pup heads that
   way); or the big on-screen arrows (hold one to keep going). A turn pressed a little early is remembered
   for a moment, so there is no need to be exact; in Cross the Way one extra hop can be queued while a hop
   is still in the air. P pauses, M mutes.

   Tidbit and Sugarfoot are drawn by pups.js (TOLPups). Test hook: TOLArcade.state(). */
(function () {
  'use strict';
  var KEY = 'tol-arcade-v1';
  var D = document;
  function $(id) { return D.getElementById(id); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* ---------- saved choices and best scores ---------- */
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var S = { pup: 'tidbit', game: 'chase', relaxed: true, sound: true, best: {} };
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) { var d = JSON.parse(raw); if (d && typeof d === 'object') {
      if (d.pup === 'tidbit' || d.pup === 'sugarfoot') S.pup = d.pup;
      if (/^(chase|cross|trail|bricks|shower)$/.test(d.game)) S.game = d.game;
      if (typeof d.relaxed === 'boolean') S.relaxed = d.relaxed;
      if (typeof d.sound === 'boolean') S.sound = d.sound;
      if (d.best && typeof d.best === 'object') S.best = d.best;
    } }
  } catch (e) { /* private window: fine */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
  function bestKey() { return S.game + ':' + S.pup; }
  function getBest() { return +S.best[bestKey()] || 0; }

  /* ---------- sound: tiny, soft blips (only after the player has pressed start) ---------- */
  var AC = null;
  function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } } if (AC && AC.state === 'suspended') { try { AC.resume(); } catch (e) { /* ignore */ } } return AC; }
  function blip(freq, dur, type, vol, slide) {
    if (!S.sound) return; var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  var SFX = {
    chomp: function () { blip(520, 0.05, 'triangle', 0.035, 380); },
    heart: function () { blip(660, 0.12, 'sine', 0.06, 990); },
    pop: function () { blip(700, 0.14, 'triangle', 0.06, 1400); },
    oof: function () { blip(220, 0.25, 'sawtooth', 0.04, 90); },
    hop: function () { blip(480, 0.05, 'square', 0.025, 640); },
    splash: function () { blip(300, 0.3, 'sawtooth', 0.035, 70); },
    bay: function () { [523, 659, 784].forEach(function (f, i) { setTimeout(function () { blip(f, 0.14, 'triangle', 0.06); }, i * 90); }); },
    clear: function () { [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { blip(f, 0.2, 'triangle', 0.06); }, i * 120); }); }
  };

  /* ---------- the pups ---------- */
  var PUPS = {
    tidbit:   { name: 'Tidbit',   look: 'collar', blurb: 'Quick on her paws. A little faster, and her golden hearts last a bit less long.', chaseSpeed: 6.9, power: 6, hop: 0.10 },
    sugarfoot: { name: 'Sugarfoot', look: 'drop',   blurb: 'Steady and strong. A little slower, but golden hearts last longer and she is harder to bump.', chaseSpeed: 6.3, power: 9, hop: 0.14 }
  };
  function drawPup(g, who, x, y, scale, face, phase, moving, t, pose) {
    if (!window.TOLPups) return;
    var L = window.TOLPups.looks[PUPS[who].look];
    g.save(); g.translate(x, y); g.scale(face * scale, scale);
    try { window.TOLPups.draw(g, L, pose || (moving ? 'run' : 'wiggle'), phase, Math.sin(t / 130) * 0.5, Math.sin(t / 900) > 0.985, t, 0); } catch (e) { /* ignore */ }
    g.restore();
  }

  /* ---------- shared: canvas, input, loop ---------- */
  var cv, g, DPR = 1, LW = 456, LH = 504, game = null, raf = 0, last = 0, paused = false, running = false, tAll = 0;
  var lessons = [
    'It’s easier to be brave next to someone you trust.',
    'Letting go of the old way can open a new one.',
    'Kindness to yourself makes room for joy.',
    'What one of us does changes the way for the other.',
    'Say it clearly and kindly, and it can be heard.',
    'Look again: what you can see is not always what you assumed.',
    'The Perfect Frequency was the two of you, in tune.',
    'Small and often beats big and once.',
    'Rest isn’t quitting. It’s how you get to keep going.',
    'A thank-you costs nothing and pays back every time.',
    'Slow down first, then talk. The words land better.',
    'Fix the setup, not the person.',
    'The unseen jobs count too.',
    'Ask “what did you mean?” before deciding what they meant.',
    'One owner per job keeps the peace.',
    'A shared laugh is a reset button for two.',
    'You don’t have to be fast. You just have to be together.',
    'Turning toward a small bid builds a big bridge.',
    'Saying sorry is strong, not small.',
    'Notice what went right today, too.',
    'Every big trip is a lot of small hops.',
    'Your body speaks first. Listen to it.',
    'Different isn’t wrong. It’s just a different station.',
    'Checking in is a kind of caring.',
    'When you’re tired, make the next step tiny.',
    'Good teams take turns being the strong one.',
    'A calm room makes calm talk easier.',
    'Say what you need. Nobody can read minds, not even pups.',
    'Patience is love that waits.',
    'You can disagree and still be on the same side.',
    'Taking a break mid-argument is a skill, not a surrender.',
    'Celebrate the little wins. They add up.',
    'Listening is half of every conversation.',
    'Be gentle with yourself on the hard days.',
    'Curiosity beats blame, every time.',
    'A good plan has room for a bad day.',
    'Help is easier to give than to ask for. Ask anyway.',
    'Two pups, one big heart each, one shared path.'
  ];
  // a fresh line each level: every one is shown once before any repeats
  var lessonBag = [];
  function nextLesson() { if (!lessonBag.length) { lessonBag = lessons.slice(); for (var i = lessonBag.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = lessonBag[i]; lessonBag[i] = lessonBag[j]; lessonBag[j] = x; } } return lessonBag.pop(); }
  function sizeCanvas(w, h) {
    LW = w; LH = h; DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR);
    cv.style.aspectRatio = w + ' / ' + h;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  function say(msg) { var s = $('ar-status'); if (s) s.textContent = msg; }
  function hud() {
    if (!game) return;
    $('ar-score').textContent = game.score; $('ar-level').textContent = game.level;
    var b = Math.max(getBest(), game.score); $('ar-best').textContent = b;
  }
  function recordBest() { if (game && game.score > getBest()) { S.best[bestKey()] = game.score; save(); } }

  var dirReq = null;
  function dir(dx, dy) { if (game && game.onDir && !paused) game.onDir(dx, dy); }
  function onKey(e) {
    if (!running) return;
    var t = e.target, tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key, handled = true;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') dir(0, -1);
    else if (k === 'ArrowDown' || k === 's' || k === 'S') dir(0, 1);
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') dir(-1, 0);
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') dir(1, 0);
    else if (k === 'p' || k === 'P' || k === 'Escape') togglePause();
    else if (k === 'm' || k === 'M') toggleSound();
    else handled = false;
    if (handled) e.preventDefault();
  }
  // a swipe goes that way; a tap on the playfield sends the pup toward the tap
  var ptr = null;
  function onPointerDown(e) {
    if (!running || paused) return;
    if (e.target && e.target.closest && e.target.closest('.ar-overlay')) return;
    ptr = { x: e.clientX, y: e.clientY };
  }
  // dragging a finger or the mouse steers the games with a cushion or basket
  function onPointerMove(e) {
    if (!running || paused || !game || !game.onPoint) return;
    if (!ptr && e.pointerType !== 'mouse') return;
    var rect = cv.getBoundingClientRect(); if (!rect.width) return;
    game.onPoint((e.clientX - rect.left) / rect.width * LW); if (ptr) ptr.drag = true;
  }
  function onPointerUp(e) {
    if (!ptr || !running || paused || !game) { ptr = null; return; }
    if (ptr.drag && game.onPoint) { ptr = null; return; }
    var dx = e.clientX - ptr.x, dy = e.clientY - ptr.y; ptr = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) >= 18) { if (Math.abs(dx) > Math.abs(dy)) dir(dx > 0 ? 1 : -1, 0); else dir(0, dy > 0 ? 1 : -1); return; }
    var rect = cv.getBoundingClientRect(); if (!rect.width) return;
    var fx = (e.clientX - rect.left) / rect.width * LW, fy = (e.clientY - rect.top) / rect.height * LH, c = game.center ? game.center() : null; if (!c) return;
    var tx = fx - c.x, ty = fy - c.y; if (Math.max(Math.abs(tx), Math.abs(ty)) < 6) return;
    if (Math.abs(tx) > Math.abs(ty)) dir(tx > 0 ? 1 : -1, 0); else dir(0, ty > 0 ? 1 : -1);
  }

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    if (!last) last = ts; var dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    if (!running || paused || !game) return;
    tAll += dt * 1000;
    var steps = Math.max(1, Math.ceil(dt / 0.016)), sdt = dt / steps;
    for (var i = 0; i < steps; i++) game.update(sdt);
    game.draw(tAll);
    hud();
  }
  function startLoop() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
  function stopLoop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  D.addEventListener('visibilitychange', function () { if (D.hidden && running && !paused) togglePause(true); });

  /* ---------- overlay ---------- */
  function overlay(title, text, goLabel, onGo, extra) {
    $('ar-ov-h').textContent = title; $('ar-ov-p').textContent = text;
    var go = $('ar-ov-go'); go.textContent = goLabel; go.onclick = function () { $('ar-overlay').hidden = true; if (onGo) onGo(); $('ar-wrap').focus(); };
    $('ar-ov-menu').onclick = backToMenu;
    $('ar-ov-extra').textContent = extra || '';
    $('ar-overlay').hidden = false; go.focus();
  }
  function togglePause(force) {
    if (!running) return;
    paused = typeof force === 'boolean' ? force : !paused;
    $('ar-pause').textContent = paused ? '▶ Resume' : '⏸ Pause';
    if (paused) overlay('Paused', 'Take your time. Nothing moves until you’re ready.', '▶ Resume', function () { paused = false; $('ar-pause').textContent = '⏸ Pause'; last = 0; });
    else $('ar-overlay').hidden = true;
  }
  function toggleSound() { S.sound = !S.sound; save(); syncToggles(); if (S.sound) SFX.heart(); }
  function syncToggles() {
    var s = $('ar-sound'); if (s) { s.textContent = S.sound ? '🔊 Sound: on' : '🔇 Sound: off'; s.setAttribute('aria-pressed', S.sound ? 'true' : 'false'); }
    var r = $('ar-relaxed'); if (r) { r.textContent = S.relaxed ? '🌿 Relaxed pace: on' : '🌿 Relaxed pace: off'; r.setAttribute('aria-pressed', S.relaxed ? 'true' : 'false'); }
    var sel = $('ar-sel-relaxed'); if (sel) sel.checked = S.relaxed;
    var ss = $('ar-sel-sound'); if (ss) ss.checked = S.sound;
  }
  function speedMul() { return S.relaxed ? 0.72 : 1; }

  /* ==================================================================================================
     TREAT CHASE
     ================================================================================================== */
  var MAP = [
    '###################', '#........#........#', '#o##.###.#.###.##o#', '#.................#', '#.##.#.#####.#.##.#',
    '#....#...#...#....#', '####.###.#.###.####', '~~~#.#.......#.#~~~', '####.#.##-##.#.####', ',,,,.,.#GGG#.,.,,,,',
    '####.#.#####.#.####', '~~~#.#.......#.#~~~', '####.#.#####.#.####', '#........#........#', '#.##.###.#.###.##.#',
    '#o.#.....P.....#.o#', '##.#.#.#####.#.#.##', '#....#...#...#....#', '#.######.#.######.#', '#.................#',
    '###################'];
  var CW_ = 19, CH_ = 21, T = 24, TUN = 9;
  var GHOSTS = [
    { name: 'Grumble', col: '#9FA8C9', ai: 'chase', corner: [17, 1], out: 0 },
    { name: 'Fuzz', col: '#C9A8E0', ai: 'ambush', corner: [1, 1], out: 2.5 },
    { name: 'Mumble', col: '#F2B6A0', ai: 'shy', corner: [1, 19], out: 5.5 },
    { name: 'Drift', col: '#A8D8C8', ai: 'wander', corner: [17, 19], out: 8.5 }
  ];
  var DIRS = [[0, -1], [-1, 0], [0, 1], [1, 0]];
  // a fresh maze every level after the first: the house in the middle stays, the top and bottom are rebuilt from an
  // open grid of pillars joined at random into walls (mirrored, so it stays fair), then checked: no dead ends, and
  // every treat can be reached
  function genMaze(rand) {
    var BASE = MAP;
    for (var tries = 0; tries < 200; tries++) {
      var m = BASE.map(function (r) { return r.split(''); });
      // the open grid: corridors on odd rows and odd columns, pillars on even ones
      function region(r0, r1) {
        for (var r = r0; r <= r1; r++) for (var c = 1; c <= 17; c++) m[r][c] = (r % 2 === 0 && c % 2 === 0) ? '#' : '.';
      }
      region(1, 5); region(13, 19);
      var keepOpen = { '5,4': 1, '5,8': 1, '5,10': 1, '5,14': 1, '13,4': 1, '13,6': 1, '13,12': 1, '13,14': 1, '15,9': 1 };
      // join neighbouring pillars into longer walls, the same on both sides
      function join(r0, r1, p) {
        for (var r = r0; r <= r1; r++) for (var c = 1; c <= 9; c++) {
          var cand = (r % 2 === 0 && c % 2 === 1 && c > 1) || (r % 2 === 1 && c % 2 === 0 && r > r0 && r < r1);
          if (!cand || rand() > p) continue;
          if (keepOpen[r + ',' + c] || keepOpen[r + ',' + (18 - c)]) continue;
          m[r][c] = '#'; m[r][18 - c] = '#';
        }
      }
      var jp = Math.max(0.3, 0.55 - tries * 0.003); join(1, 5, jp); join(13, 19, jp);   // walls get a little sparser if a maze keeps failing the checks
      // golden hearts in the four corners, the pup's spot clear
      [[3, 1], [3, 17], [17, 1], [17, 17]].forEach(function (p) { m[p[0]][p[1]] = 'o'; });
      m[15][9] = 'P';
      if (mazeOk(m)) return m.map(function (r) { return r.join(''); });
    }
    return BASE;
  }
  function mazeOk(m) {
    var H = m.length, W = m[0].length, open = function (r, c) { if (r === 9 && (c < 0 || c >= W)) return true; if (r < 0 || r >= H || c < 0 || c >= W) return false; var ch = m[r][c]; return ch !== '#' && ch !== '~' && ch !== '-' && ch !== 'G'; };
    // no dead ends anywhere a treat can be
    for (var r = 1; r < H - 1; r++) for (var c = 1; c < W - 1; c++) {
      if (!open(r, c) || r === 9 && (c < 4 || c > 14)) continue;
      var n = (open(r - 1, c) ? 1 : 0) + (open(r + 1, c) ? 1 : 0) + (open(r, c - 1) ? 1 : 0) + (open(r, c + 1) ? 1 : 0);
      if (n < 2) return false;
    }
    // every open cell reachable from the pup
    var seen = {}, q = [[15, 9]], cnt = 0; seen['15,9'] = 1;
    while (q.length) { var p = q.shift(); cnt++; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var rr = p[0] + d[0], cc = (p[1] + d[1] + W) % W; if (open(rr, cc) && !seen[rr + ',' + cc]) { seen[rr + ',' + cc] = 1; q.push([rr, cc]); } }); }
    var tot = 0; for (r = 0; r < H; r++) for (c = 0; c < W; c++) if (open(r, c)) tot++;
    return cnt === tot && open(1, 1) && open(1, 17) && open(19, 1) && open(19, 17);
  }

  function Chase(who) {
    var P = PUPS[who], me = this;
    me.who = who; me.score = 0; me.level = 1; me.over = false;
    sizeCanvas(CW_ * T, CH_ * T);
    me.cells = []; me.treats = 0; me.map = MAP;
    me.reset(true);
    me.P = P;
  }
  Chase.prototype.cell = function (c, r) {
    if (r === TUN && (c < 0 || c >= CW_)) return ',';
    if (c < 0 || c >= CW_ || r < 0 || r >= CH_) return '~';
    return this.cells[r][c];
  };
  Chase.prototype.open = function (c, r, ghostPass) {
    var ch = this.cell(c, r); if (ch === '#' || ch === '~') return false; if (ch === '-') return !!ghostPass; return true;
  };
  Chase.prototype.reset = function (full) {
    var me = this;
    if (full) {
      me.cells = me.map.map(function (row) { return row.split('').map(function (ch) { return ch === 'P' || ch === 'G' ? ',' : ch; }); });
      me.treats = 0; me.cells.forEach(function (row) { row.forEach(function (ch) { if (ch === '.' || ch === 'o') me.treats++; }); });
    }
    me.pup = { x: 9, y: 15, dx: 0, dy: 0, want: null, face: 1, ph: 0, moving: false, invul: 0 };
    me.mode = 'scatter'; me.modeT = 0; me.power = 0; me.chain = 0; me.clock = 0; me.toast = ''; me.toastT = 0;
    me.ghosts = GHOSTS.map(function (G, i) {
      var inHouse = i > 0;
      return { G: G, x: i === 0 ? 9 : 8 + (i - 1), y: i === 0 ? 7 : 9, dx: i === 0 ? -1 : 0, dy: 0, state: inHouse ? 'house' : 'roam', release: G.out, fright: false };
    });
  };
  Chase.prototype.lvlMul = function () { return 1 + Math.min(0.5, (this.level - 1) * 0.05); };
  Chase.prototype.onDir = function (dx, dy) {
    var p = this.pup; p.want = [dx, dy]; p.wantT = 1.6;   // a turn pressed a little early is remembered for a moment
    if (p.dx === -dx && p.dy === -dy && (p.dx || p.dy)) { p.dx = dx; p.dy = dy; p.want = null; } // turning right around is always allowed
    else if (p.dx === dx && p.dy === dy) p.want = null;
  };
  function isCenter(e) { return Math.abs(e.x - Math.round(e.x)) < 1e-6 && Math.abs(e.y - Math.round(e.y)) < 1e-6; }
  Chase.prototype.moveEntity = function (e, dist, decide, ghostPass) {
    var guard = 0;
    while (dist > 1e-9 && guard++ < 8) {
      if (isCenter(e)) {
        e.x = Math.round(e.x); e.y = Math.round(e.y);
        decide.call(this, e);
        if (!(e.dx || e.dy) || !this.open(e.x + e.dx, e.y + e.dy, ghostPass)) { if (!this.open(e.x + e.dx, e.y + e.dy, ghostPass)) { e.dx = 0; e.dy = 0; } break; }
      }
      var dc;
      if (e.dx > 0) dc = Math.ceil(e.x + 1e-6) - e.x; else if (e.dx < 0) dc = e.x - Math.floor(e.x - 1e-6);
      else if (e.dy > 0) dc = Math.ceil(e.y + 1e-6) - e.y; else dc = e.y - Math.floor(e.y - 1e-6);
      if (dc < 1e-6) dc = 1;
      var m = Math.min(dist, dc);
      e.x += e.dx * m; e.y += e.dy * m; dist -= m;
      if (Math.abs(e.x - Math.round(e.x)) < 1e-6) e.x = Math.round(e.x);
      if (Math.abs(e.y - Math.round(e.y)) < 1e-6) e.y = Math.round(e.y);
      if (e.x <= -1 + 1e-6) e.x += CW_; else if (e.x >= CW_ - 1e-6) e.x -= CW_;
    }
  };
  Chase.prototype.decidePup = function (p) {
    var me = this;
    // eat what's here
    var c = Math.round(p.x), r = Math.round(p.y);
    if (c >= 0 && c < CW_) {
      var ch = me.cells[r][c];
      if (ch === '.') { me.cells[r][c] = ','; me.treats--; me.score += 10; SFX.chomp(); }
      else if (ch === 'o') { me.cells[r][c] = ','; me.treats--; me.score += 50; me.power = me.P.power * (S.relaxed ? 1.3 : 1); me.chain = 0; me.ghosts.forEach(function (gh) { if (gh.state === 'roam') { gh.fright = true; gh.dx = -gh.dx; gh.dy = -gh.dy; } }); SFX.heart(); me.say('A golden heart! The Static turns into friendly bubbles. Pop them!'); }
    }
    var w = p.want;
    if (w && me.open(p.x + w[0], p.y + w[1], false)) { p.dx = w[0]; p.dy = w[1]; p.want = null; }
    else if (!me.open(p.x + p.dx, p.y + p.dy, false)) { p.dx = 0; p.dy = 0; }
  };
  Chase.prototype.center = function () { return { x: this.pup.x * T + T / 2, y: this.pup.y * T + T / 2 }; };
  Chase.prototype.say = function (msg) { this.toast = msg; this.toastT = 2.6; say(msg); };
  Chase.prototype.target = function (gh) {
    var p = this.pup, G = gh.G, pc = Math.round(p.x), pr = Math.round(p.y);
    if (this.mode === 'scatter') return G.corner;
    if (G.ai === 'chase') return [pc, pr];
    if (G.ai === 'ambush') return [pc + p.dx * 4, pr + p.dy * 4];
    if (G.ai === 'shy') { var d = Math.hypot(gh.x - pc, gh.y - pr); return d > 6 ? [pc, pr] : G.corner; }
    return Math.random() < 0.5 ? [pc, pr] : [Math.floor(rnd(1, 18)), Math.floor(rnd(1, 20))];
  };
  Chase.prototype.decideGhost = function (gh) {
    var me = this, opts = [], pass = gh.state === 'leaving' || gh.state === 'eaten';
    DIRS.forEach(function (d) {
      if (d[0] === -gh.dx && d[1] === -gh.dy && (gh.dx || gh.dy)) return; // no turning round, unless stuck
      if (me.open(gh.x + d[0], gh.y + d[1], pass)) {
        if (!pass && me.cell(gh.x + d[0], gh.y + d[1]) === '-') return;
        opts.push(d);
      }
    });
    if (!opts.length) { gh.dx = -gh.dx; gh.dy = -gh.dy; return; }
    if (gh.state === 'roam' && gh.fright) { var rd = opts[Math.floor(Math.random() * opts.length)]; gh.dx = rd[0]; gh.dy = rd[1]; return; }
    var tg;
    if (gh.state === 'leaving') tg = [9, 7];
    else if (gh.state === 'eaten') tg = [9, 9];
    else tg = me.target(gh);
    var best = null, bd = 1e9;
    opts.forEach(function (d) { var dd = Math.pow(gh.x + d[0] - tg[0], 2) + Math.pow(gh.y + d[1] - tg[1], 2); if (dd < bd - 1e-9) { bd = dd; best = d; } });
    gh.dx = best[0]; gh.dy = best[1];
  };
  Chase.prototype.update = function (dt) {
    var me = this, p = me.pup, mul = speedMul() * me.lvlMul();
    me.clock += dt; if (me.toastT > 0) me.toastT -= dt;
    if (p.invul > 0) p.invul -= dt;
    if (p.want) { p.wantT -= dt; if (p.wantT <= 0) p.want = null; }
    // scatter / chase waves
    me.modeT += dt; if (me.mode === 'scatter' && me.modeT > 5) { me.mode = 'chase'; me.modeT = 0; } else if (me.mode === 'chase' && me.modeT > 18) { me.mode = 'scatter'; me.modeT = 0; }
    if (me.power > 0) { me.power -= dt; if (me.power <= 0) { me.power = 0; me.ghosts.forEach(function (gh) { gh.fright = false; }); } }
    // the pup
    var ps = me.P.chaseSpeed * speedMul() * (1 + Math.min(0.2, (me.level - 1) * 0.02));
    var before = p.x + p.y;
    me.moveEntity(p, ps * dt, me.decidePup, false);
    p.moving = (p.dx || p.dy) && Math.abs(p.x + p.y - before) > 1e-9;
    if (p.moving) { p.ph += dt * 14; if (p.dx) p.face = p.dx; }
    // the Static
    me.ghosts.forEach(function (gh) {
      if (gh.state === 'house') { gh.release -= dt; if (gh.release <= 0) gh.state = 'leaving'; gh.bob = Math.sin(me.clock * 5 + gh.G.out) * 0.12; return; }
      var sp = 5.4 * mul;
      if (gh.state === 'eaten') sp = 11;
      else if (gh.fright) sp = 3.1 * mul;
      else if (gh.state === 'leaving') sp = 3.5;
      // leaving: first step inside the house onto the door column
      if (gh.state === 'leaving' && gh.y === 9 && gh.x !== 9 && isCenter(gh)) { gh.dx = gh.x < 9 ? 1 : -1; gh.dy = 0; }
      var wasX = gh.x;
      me.moveEntity(gh, sp * dt, function (e) {
        if (e.state === 'leaving' && e.x === 9 && e.y === 7) { e.state = 'roam'; }
        if (e.state === 'eaten' && e.x === 9 && e.y === 9) { e.state = 'leaving'; e.fright = false; }
        if (e.state === 'leaving' && e.y === 9 && e.x !== 9) { e.dx = e.x < 9 ? 1 : -1; e.dy = 0; return; }
        me.decideGhost(e);
      }, gh.state === 'leaving' || gh.state === 'eaten');
    });
    // meetings
    if (p.invul <= 0) me.ghosts.forEach(function (gh) {
      if (gh.state === 'house' || gh.state === 'eaten') return;
      var dd = Math.hypot(gh.x - p.x, gh.y - p.y);
      if (dd < 0.62 * (who_() === 'sugarfoot' ? 0.85 : 1)) {
        if (gh.fright) { gh.state = 'eaten'; gh.fright = false; me.chain++; var pts = 200 * Math.pow(2, Math.min(3, me.chain - 1)); me.score += pts; me.say('Pop! +' + pts); SFX.pop(); me.pops = (me.pops || []); me.pops.push({ x: gh.x, y: gh.y, t: 0 }); }
        else if (gh.state === 'roam' || gh.state === 'leaving') { me.bump(); }
      }
    });
    if (me.treats <= 0 && !me.cleared) { me.cleared = true; me.finishLevel(); }
    if (me.pops) me.pops = me.pops.filter(function (q) { q.t += dt; return q.t < 0.5; });
  };
  function who_() { return S.pup; }
  Chase.prototype.bump = function () {
    var me = this; SFX.oof();
    me.say('Oof! The Static bumped ' + me.P.name + ' back to the start. No harm done, and every treat you gathered stays gathered.');
    me.oofs = (me.oofs || 0) + 1;
    var cells = me.cells; me.reset(false); me.cells = cells; me.pup.invul = 2.2;
  };
  Chase.prototype.finishLevel = function () {
    var me = this; me.score += 500; SFX.clear(); recordBest(); hud();
    var lesson = nextLesson();
    var gift = rewardLevel('Treat Chase · level ' + me.level);
    overlay('Level ' + me.level + ' cleared!', 'Every treat is gathered. ' + lesson, 'Next level →', function () { me.level++; me.cleared = false; me.map = genMaze(Math.random); me.reset(true); last = 0; }, '+500 for clearing the maze' + (gift ? ' · ' + gift : ''));
    paused = true; var go = $('ar-ov-go'); var orig = go.onclick; go.onclick = function () { paused = false; orig(); };
  };
  // every cleared level counts toward the garden behind every page, like the other calm games
  function rewardLevel(label) {
    var gift = null;
    if (window.TOLRewards && typeof window.TOLRewards.earn === 'function') {
      try { var res = window.TOLRewards.earn(8, 'journey', label, { noCard: true, quiet: true }); gift = res && res.unlocked && res.unlocked[0]; } catch (e) { /* ignore */ }
    }
    return gift ? 'Something new has arrived in your garden. Find it in My garden.' : '';
  }
  function wallPath(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
  function heart(g, x, y, s, col) { g.fillStyle = col; g.beginPath(); g.moveTo(x, y + s * 0.9); g.bezierCurveTo(x - s * 1.3, y, x - s * 0.7, y - s * 1.1, x, y - s * 0.4); g.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.3, y, x, y + s * 0.9); g.fill(); }
  Chase.prototype.draw = function (t) {
    var me = this;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    var bg = g.createLinearGradient(0, 0, 0, LH); bg.addColorStop(0, '#201C44'); bg.addColorStop(1, '#2C2755');
    g.fillStyle = bg; g.fillRect(0, 0, LW, LH);
    // walls: soft rounded pipes
    for (var r = 0; r < CH_; r++) for (var c = 0; c < CW_; c++) {
      var ch = me.map[r][c];
      if (ch === '#') {
        g.fillStyle = '#4655C9'; wallPath(g, c * T + 2, r * T + 2, T - 4, T - 4, 6); g.fill();
        if (c + 1 < CW_ && me.map[r][c + 1] === '#') g.fillRect(c * T + T - 4, r * T + 2, 8, T - 4);
        if (r + 1 < CH_ && me.map[r + 1][c] === '#') g.fillRect(c * T + 2, r * T + T - 4, T - 4, 8);
      } else if (ch === '-') { g.fillStyle = '#F2A6C0'; g.fillRect(c * T + 2, r * T + T / 2 - 2, T - 4, 4); }
    }
    g.fillStyle = 'rgba(255,255,255,.10)';
    for (r = 0; r < CH_; r++) for (c = 0; c < CW_; c++) if (me.map[r][c] === '#') { wallPath(g, c * T + 5, r * T + 5, T - 12, 4, 2); g.fill(); }
    // treats and golden hearts
    for (r = 0; r < CH_; r++) for (c = 0; c < CW_; c++) {
      var k = me.cells[r][c];
      if (k === '.') { g.fillStyle = '#F8DC6E'; g.beginPath(); g.arc(c * T + T / 2, r * T + T / 2, 2.4, 0, 7); g.fill(); }
      else if (k === 'o') { var pu = 1 + Math.sin(t / 220) * 0.14; heart(g, c * T + T / 2, r * T + T / 2 - 1, 6.5 * pu, '#FF8FA3'); }
    }
    // the Static
    me.ghosts.forEach(function (gh) { drawStatic(g, gh, me, t); });
    // pops
    (me.pops || []).forEach(function (q) { var a = 1 - q.t / 0.5; g.strokeStyle = 'rgba(190,230,255,' + a + ')'; g.lineWidth = 2; for (var i = 0; i < 5; i++) { var an = i * 1.256 + q.t * 3; g.beginPath(); g.arc(q.x * T + T / 2 + Math.cos(an) * q.t * 40, q.y * T + T / 2 + Math.sin(an) * q.t * 40, 3 + i % 2 * 2, 0, 7); g.stroke(); } });
    // the pup
    var p = me.pup, blink = p.invul > 0 && Math.floor(t / 110) % 2 === 0;
    if (!blink) drawPup(g, me.who, p.x * T + T / 2 + (p.face > 0 ? -2 : 2), p.y * T + T / 2 + 10, 0.5, p.face, p.ph, p.moving, t);
    // toast
    if (me.toastT > 0 && me.toast) { g.fillStyle = 'rgba(20,16,44,.78)'; wallPath(g, 14, LH - 40, LW - 28, 28, 10); g.fill(); g.fillStyle = '#FFF6E0'; g.font = '600 12px Lora, Georgia, serif'; g.textAlign = 'center'; g.fillText(me.toast.length > 70 ? me.toast.slice(0, 68) + '…' : me.toast, LW / 2, LH - 22); g.textAlign = 'start'; }
  };
  function drawStatic(g, gh, me, t) {
    if (gh.state === 'house' && false) return;
    var x = gh.x * T + T / 2, y = gh.y * T + T / 2 + (gh.bob || 0) * T, R = 10;
    var eaten = gh.state === 'eaten', fr = gh.fright && !eaten;
    if (!eaten) {
      var flash = fr && me.power < 2 && Math.floor(t / 180) % 2 === 0;
      g.fillStyle = fr ? (flash ? '#FFFFFF' : '#9ED3FF') : gh.G.col;
      g.beginPath(); g.arc(x - 5, y - 2, 6.5, Math.PI, 0); g.arc(x + 5, y - 2, 6.5, Math.PI, 0);
      g.arc(x, y - 6, 8, Math.PI, 0);
      g.lineTo(x + R, y + 8); var w = Math.sin(t / 120 + gh.x) * 1.2;
      for (var i = 0; i < 3; i++) { g.quadraticCurveTo(x + R - 3.3 - i * 6.6, y + 12 + w, x + R - 6.6 - i * 6.6, y + 8); }
      g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.arc(x - 3, y - 7, 3, 0, 7); g.fill();
    }
    // face
    g.fillStyle = '#2A2540';
    var ex = gh.dx * 1.6, ey = gh.dy * 1.4;
    if (!eaten) { g.beginPath(); g.arc(x - 3.4 + ex, y - 3 + ey, 1.9, 0, 7); g.arc(x + 3.4 + ex, y - 3 + ey, 1.9, 0, 7); g.fill(); }
    else { g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 3.4, y - 2, 3, 0, 7); g.arc(x + 3.4, y - 2, 3, 0, 7); g.fill(); g.fillStyle = '#2A2540'; g.beginPath(); g.arc(x - 3.4 + ex * 1.5, y - 2 + ey * 1.5, 1.4, 0, 7); g.arc(x + 3.4 + ex * 1.5, y - 2 + ey * 1.5, 1.4, 0, 7); g.fill(); }
    if (!eaten) { g.strokeStyle = '#2A2540'; g.lineWidth = 1.3; g.beginPath(); if (fr) g.arc(x, y + 1, 3.2, 0.15 * Math.PI, 0.85 * Math.PI); else g.arc(x, y + 4.2, 3, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke(); }
  }

  /* ==================================================================================================
     CROSS THE WAY
     ================================================================================================== */
  var COLS = 13, ROWS = 13, TS = 34, LOOP = 18;
  var BAYS = [1, 4, 6, 8, 11];
  var ROAD = [
    { row: 7, dir: 1, speed: 2.0, len: 2, period: 6, kind: 'van' },
    { row: 8, dir: -1, speed: 3.1, len: 1, period: 4.5, kind: 'bike' },
    { row: 9, dir: 1, speed: 2.3, len: 3, period: 9, kind: 'bus' },
    { row: 10, dir: -1, speed: 1.7, len: 1, period: 3, kind: 'scooter' }
  ];
  var RIVER = [
    { row: 1, dir: 1, speed: 1.5, len: 3, period: 6, kind: 'log' },
    { row: 2, dir: -1, speed: 1.9, len: 2, period: 4.5, kind: 'pad', dive: true },
    { row: 3, dir: 1, speed: 1.2, len: 4, period: 6, kind: 'log' },
    { row: 4, dir: -1, speed: 1.7, len: 3, period: 6, kind: 'log' },
    { row: 5, dir: 1, speed: 2.0, len: 2, period: 4.5, kind: 'pad', dive: true }
  ];
  // the lanes: the first level is the classic road and river; every level after that shuffles what drives and floats
  // by, which way, how fast and how far apart, so no two crossings are quite the same
  var ROADK = { van: 2, bike: 1, bus: 3, scooter: 1 };
  function laneSet(fresh) {
    var road = ROAD, river = RIVER;
    if (fresh) {
      var kinds = Object.keys(ROADK), d0 = Math.random() < 0.5 ? 1 : -1;
      road = ROAD.map(function (L, i) { var k = kinds[Math.floor(Math.random() * kinds.length)]; return { row: L.row, dir: i % 2 ? -d0 : d0, speed: +(rnd(1.5, 3.2)).toFixed(2), len: ROADK[k], period: [3, 4.5, 6, 9][Math.floor(Math.random() * 4)], kind: k }; });
      var r0 = Math.random() < 0.5 ? 1 : -1;
      river = RIVER.map(function (L, i) { var pad = Math.random() < 0.35; return { row: L.row, dir: i % 2 ? -r0 : r0, speed: +(rnd(1.1, 2.1)).toFixed(2), len: pad ? (Math.random() < 0.5 ? 2 : 3) : 2 + Math.floor(Math.random() * 3), period: pad ? 4.5 : [4.5, 6][Math.floor(Math.random() * 2)], kind: pad ? 'pad' : 'log', dive: pad }; });
    }
    return road.concat(river).map(function (L) { var n = Math.round(LOOP / L.period); return Object.assign({ off: rnd(0, L.period) }, L, { n: n }); });
  }
  function Cross(who) {
    var me = this; me.who = who; me.P = PUPS[who]; me.score = 0; me.level = 1; me.filled = []; me.cleared = false;
    sizeCanvas(COLS * TS, ROWS * TS);
    me.lanes = laneSet(false);
    me.newPup(); me.t = 0; me.fx = [];
  }
  Cross.prototype.newPup = function () {
    this.pup = { x: 6, y: 12, hx: 6, hy: 12, hopT: 1, hopD: 0.1, face: 1, ph: 0, state: 'ok', stateT: 0, ride: null, maxRow: 12 };
  };
  Cross.prototype.lvlMul = function () { return 1 + Math.min(0.6, (this.level - 1) * 0.08); };
  Cross.prototype.objX = function (L, i) {
    var mul = speedMul() * this.lvlMul();
    var raw = L.off + i * L.period + L.dir * L.speed * mul * this.t;
    var x = ((raw % LOOP) + LOOP) % LOOP - 2.5; // loop of LOOP tiles, starting just off the left edge
    return x;
  };
  Cross.prototype.diving = function (L, i) {
    if (!L.dive || S.relaxed) return 0;   // in relaxed pace the lily pads never dip
    var cyc = 9, ph = ((this.t + i * 2.3 + L.row) % cyc);
    if (ph > 5.2 && ph < 6.8) return 2; // under
    if (ph > 4.0 && ph <= 5.2) return 1; // warning wobble
    return 0;
  };
  Cross.prototype.platformAt = function (L, x) {
    var me = this;
    for (var i = 0; i < L.n; i++) { var ox = me.objX(L, i); if (x + 0.5 >= ox + 0.08 && x + 0.5 <= ox + L.len - 0.08) return { i: i, ox: ox, under: me.diving(L, i) === 2 }; }
    return null;
  };
  Cross.prototype.onDir = function (dx, dy) {
    var p = this.pup; if (p.state !== 'ok') return;
    if (p.hopT < 1) { p.queue = [dx, dy]; return; }   // one extra hop can wait for the one in the air
    var nx = Math.round(p.x * 1) + dx, ny = p.y + dy;
    if (dx) nx = p.x + dx; else nx = p.x;
    if (ny < 0 || ny >= ROWS || nx < -0.5 || nx > COLS - 0.5) return;
    if (ny === 0) { // the doghouse row: only into an empty doghouse
      var bay = -1; BAYS.forEach(function (b, k) { if (Math.abs(nx - b) <= 0.5 && this.filled.indexOf(k) < 0) bay = k; }, this);
      if (bay < 0) { SFX.oof(); return; }
      nx = BAYS[bay];
    }
    p.hx = p.x; p.hy = p.y; p.tx = nx; p.ty = ny; p.hopT = 0; p.hopD = this.P.hop * (S.relaxed ? 1.5 : 1); p.ride = null;
    if (dx) p.face = dx; SFX.hop();
  };
  Cross.prototype.land = function () {
    var me = this, p = me.pup; p.x = p.tx; p.y = p.ty; p.hopT = 1; var q = p.queue; p.queue = null;
    if (p.y < p.maxRow) { p.maxRow = p.y; if (p.y > 0) me.score += 10; }
    if (p.y === 0) {
      var k = -1; BAYS.forEach(function (b, j) { if (Math.abs(p.x - b) < 0.5) k = j; });
      me.filled.push(k); me.score += 50; SFX.bay(); me.say('Home! ' + me.P.name + ' reached a doghouse. ' + (5 - me.filled.length) + ' to go.');
      if (me.filled.length >= 5) { me.cleared = true; me.finish(); } else me.newPup();
      return;
    }
    var L = RIVER.filter(function (R) { return R.row === p.y; })[0];
    if (L) {
      var lane = me.lanes.filter(function (q) { return q.row === p.y; })[0], hit = me.platformAt(lane, p.x);
      if (!hit || hit.under) { me.splash(); return; }
      p.ride = lane;
    }
    if (q && p.state === 'ok') me.onDir(q[0], q[1]);
  };
  Cross.prototype.center = function () { var p = this.pup; return { x: (p.hopT < 1 ? p.hx + (p.tx - p.hx) * p.hopT : p.x) * TS + TS / 2, y: (p.hopT < 1 ? p.hy + (p.ty - p.hy) * p.hopT : p.y) * TS + TS / 2 }; };
  Cross.prototype.splash = function () { var me = this, p = me.pup; if (p.state !== 'ok') return; p.state = 'splash'; p.stateT = 0; p.ride = null; SFX.splash(); me.say('Splash! ' + me.P.name + ' is fine and a bit damp. Back to the start.'); me.fx.push({ k: 'ring', x: p.x, y: p.y, t: 0 }); };
  Cross.prototype.oof = function () { var me = this, p = me.pup; if (p.state !== 'ok') return; p.state = 'oof'; p.stateT = 0; p.ride = null; SFX.oof(); me.say('Oof! A little bump. ' + me.P.name + ' is fine. Back to the start.'); };
  Cross.prototype.say = function (m) { say(m); };
  Cross.prototype.update = function (dt) {
    var me = this, p = me.pup; me.t += dt;
    if (p.state === 'oof' || p.state === 'splash') { p.stateT += dt; if (p.stateT > 0.9) me.newPup(); }
    else {
      if (p.hopT < 1) { p.hopT += dt / p.hopD; p.ph += dt * 24; if (p.hopT >= 1) me.land(); }
      else if (p.ride) {
        var mul = speedMul() * me.lvlMul(); p.x += p.ride.dir * p.ride.speed * mul * dt;
        if (p.x < -0.45 || p.x > COLS - 0.55) me.splash();
        else { var hit = me.platformAt(p.ride, p.x); if (!hit || hit.under) me.splash(); }
      }
      // traffic
      if (p.state === 'ok' && (p.y >= 7 && p.y <= 10 || (p.hopT < 1 && (p.hy >= 7 && p.hy <= 10 || p.ty >= 7 && p.ty <= 10)))) {
        var py = p.hopT < 1 ? (p.hy + (p.ty - p.hy) * p.hopT) : p.y, px = p.hopT < 1 ? (p.hx + (p.tx - p.hx) * p.hopT) : p.x;
        var shrink = (who_() === 'sugarfoot' ? 0.2 : 0.12) + (S.relaxed ? 0.12 : 0);
        me.lanes.forEach(function (L) {
          if (L.kind === 'log' || L.kind === 'pad') return;
          if (Math.abs(py - L.row) > 0.62) return;
          for (var i = 0; i < L.n; i++) { var ox = me.objX(L, i); if (px + shrink < ox + L.len && px + 1 - shrink > ox) { me.oof(); return; } }
        });
      }
    }
    me.fx = me.fx.filter(function (f) { f.t += dt; return f.t < 0.9; });
  };
  Cross.prototype.finish = function () {
    var me = this; me.score += 200; SFX.clear(); recordBest(); hud();
    var lesson = nextLesson();
    paused = true;
    var gift = rewardLevel('Cross the Way · level ' + me.level);
    overlay('Level ' + me.level + ' cleared!', 'All five doghouses are full. ' + lesson, 'Next level →', function () {
      paused = false; me.level++; me.cleared = false; me.filled = []; me.lanes = laneSet(true); me.newPup(); last = 0;
    }, '+200 for filling every doghouse' + (gift ? ' · ' + gift : ''));
  };
  function rr(g, x, y, w, h, r, col) { g.fillStyle = col; wallPath(g, x, y, w, h, r); g.fill(); }
  Cross.prototype.draw = function (t) {
    var me = this, S_ = TS; g.setTransform(DPR, 0, 0, DPR, 0, 0);
    // zones
    for (var r = 0; r < ROWS; r++) {
      var y = r * S_, col;
      if (r === 0) col = '#3F7F4F'; else if (r <= 5) col = '#4F86C6'; else if (r === 6) col = '#7DBB82'; else if (r <= 10) col = '#4A4A58'; else col = '#6FAF7B';
      g.fillStyle = col; g.fillRect(0, y, LW, S_);
      if (r >= 1 && r <= 5) { g.fillStyle = 'rgba(255,255,255,.10)'; for (var k = 0; k < 6; k++) { var wx = ((k * 90 + t / 40 * (r % 2 ? 1 : -1)) % (LW + 60) + LW + 60) % (LW + 60) - 30; g.fillRect(wx, y + 8 + (k % 3) * 8, 26, 2); } }
      if (r >= 8 && r <= 10) { g.fillStyle = 'rgba(255,255,255,.35)'; for (k = 0; k < COLS; k++) g.fillRect(k * S_ + 8, y, 18, 2); }
      if (r === 6 || r >= 11) { g.fillStyle = 'rgba(255,255,255,.07)'; for (k = 0; k < COLS; k += 2) g.fillRect(k * S_, y, S_, S_); }
    }
    // the doghouse row
    for (var c = 0; c < COLS; c++) {
      var bayIdx = BAYS.indexOf(c);
      if (bayIdx < 0) { rr(g, c * S_ + 1, 1, S_ - 2, S_ - 2, 8, '#2F6B3E'); g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.arc(c * S_ + 10, 12, 4, 0, 7); g.arc(c * S_ + 24, 20, 5, 0, 7); g.fill(); }
      else {
        rr(g, c * S_ + 2, 2, S_ - 4, S_ - 4, 6, '#2B5C86');
        var cx = c * S_ + S_ / 2;
        g.fillStyle = '#C98B52'; g.beginPath(); g.moveTo(cx - 11, 24); g.lineTo(cx - 11, 14); g.lineTo(cx, 6); g.lineTo(cx + 11, 14); g.lineTo(cx + 11, 24); g.closePath(); g.fill();
        g.fillStyle = '#5A3B24'; g.beginPath(); g.arc(cx, 20, 5, Math.PI, 0); g.lineTo(cx + 5, 24); g.lineTo(cx - 5, 24); g.fill();
        if (me.filled.indexOf(bayIdx) >= 0) drawPup(g, me.who, cx + 6, 28, 0.36, -1, 0, false, t, 'sit');
      }
    }
    // river platforms and traffic
    me.lanes.forEach(function (L) {
      for (var i = 0; i < L.n; i++) {
        var ox = me.objX(L, i), x = ox * S_, y = L.row * S_, w = L.len * S_;
        if (L.kind === 'log') { rr(g, x + 2, y + 5, w - 4, S_ - 10, 10, '#8B5E3C'); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + 8, y + 14, w - 16, 3); g.fillStyle = '#A8764C'; for (var j = 1; j < L.len; j++) { g.beginPath(); g.arc(x + j * S_ - 3, y + S_ / 2, 4, 0, 7); g.fill(); } }
        else if (L.kind === 'pad') {
          var dv = me.diving(L, i);
          for (var q = 0; q < L.len; q++) {
            var px = x + q * S_ + S_ / 2, wob = dv === 1 ? Math.sin(t / 60) * 1.6 : 0, a = dv === 2 ? 0.18 : 1;
            g.globalAlpha = a; g.fillStyle = '#4DA86B'; g.beginPath(); g.ellipse(px + wob, y + S_ / 2, S_ / 2 - 3, S_ / 2 - 6, 0, 0.25, Math.PI * 2 - 0.1); g.lineTo(px + wob, y + S_ / 2); g.fill();
            g.fillStyle = '#F6A9C8'; g.beginPath(); g.arc(px + wob + 4, y + S_ / 2 - 3, 3, 0, 7); g.fill(); g.globalAlpha = 1;
            if (dv === 2) { g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.2; g.beginPath(); g.arc(px + 4, y + 8, 3, 0, 7); g.arc(px - 5, y + 14, 2, 0, 7); g.stroke(); }
          }
        } else if (L.kind === 'van') { rr(g, x + 2, y + 6, w - 4, S_ - 12, 7, '#F2F2F7'); rr(g, x + (L.dir > 0 ? w - 22 : 6), y + 9, 16, 9, 3, '#8EC5FF'); g.fillStyle = '#222'; g.beginPath(); g.arc(x + 12, y + S_ - 6, 4, 0, 7); g.arc(x + w - 12, y + S_ - 6, 4, 0, 7); g.fill(); g.fillStyle = '#7B6CD9'; g.fillRect(x + 8, y + 20, w - 28, 3); }
        else if (L.kind === 'bus') { rr(g, x + 2, y + 5, w - 4, S_ - 10, 8, '#F7C84B'); g.fillStyle = '#8EC5FF'; for (var wn = 0; wn < 4; wn++) g.fillRect(x + 10 + wn * ((w - 24) / 4), y + 9, (w - 24) / 4 - 4, 9); g.fillStyle = '#222'; g.beginPath(); g.arc(x + 16, y + S_ - 5, 4, 0, 7); g.arc(x + w - 16, y + S_ - 5, 4, 0, 7); g.fill(); }
        else if (L.kind === 'bike') { g.strokeStyle = '#222'; g.lineWidth = 2; g.beginPath(); g.arc(x + 9, y + 24, 6, 0, 7); g.arc(x + 25, y + 24, 6, 0, 7); g.stroke(); g.strokeStyle = '#E56B8A'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x + 9, y + 24); g.lineTo(x + 17, y + 14); g.lineTo(x + 25, y + 24); g.stroke(); g.fillStyle = '#FFD7A8'; g.beginPath(); g.arc(x + 17, y + 9, 4, 0, 7); g.fill(); }
        else if (L.kind === 'scooter') { rr(g, x + 5, y + 18, 24, 6, 3, '#6CC6B2'); g.strokeStyle = '#555'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + (L.dir > 0 ? 27 : 7), y + 20); g.lineTo(x + (L.dir > 0 ? 27 : 7), y + 7); g.stroke(); g.fillStyle = '#222'; g.beginPath(); g.arc(x + 9, y + 27, 3.5, 0, 7); g.arc(x + 25, y + 27, 3.5, 0, 7); g.fill(); g.fillStyle = '#FFD7A8'; g.beginPath(); g.arc(x + 17, y + 11, 4, 0, 7); g.fill(); }
      }
    });
    // rings and the pup
    me.fx.forEach(function (f) { g.strokeStyle = 'rgba(255,255,255,' + (1 - f.t / 0.9) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(f.x * S_ + S_ / 2, f.y * S_ + S_ / 2, 6 + f.t * 30, 0, 7); g.stroke(); });
    var p = me.pup;
    var px = p.hopT < 1 ? p.hx + (p.tx - p.hx) * p.hopT : p.x, py = p.hopT < 1 ? p.hy + (p.ty - p.hy) * p.hopT : p.y;
    var arc = p.hopT < 1 ? Math.sin(p.hopT * Math.PI) * 9 : 0, sc = 0.7;
    if (p.state === 'splash') { if (p.stateT < 0.5) drawPup(g, me.who, px * S_ + S_ / 2, py * S_ + S_ - 4 + p.stateT * 30, sc * (1 - p.stateT), p.face, 0, false, t, 'sit'); }
    else if (p.state === 'oof') { g.save(); g.translate(px * S_ + S_ / 2, py * S_ + S_ - 14); g.rotate(p.stateT * 14); g.translate(-(px * S_ + S_ / 2), -(py * S_ + S_ - 14)); drawPup(g, me.who, px * S_ + S_ / 2, py * S_ + S_ - 6, sc * (1 - p.stateT * 0.6), p.face, 0, false, t, 'sit'); g.restore(); }
    else drawPup(g, me.who, px * S_ + S_ / 2, py * S_ + S_ - 4 - arc, sc * (p.hopT < 1 ? 1 + Math.sin(p.hopT * Math.PI) * 0.1 : 1), p.face, p.ph, p.hopT < 1, t);
    // bays remaining
    g.fillStyle = 'rgba(20,16,44,.55)'; wallPath(g, 6, LH - 24, 150, 18, 8); g.fill(); g.fillStyle = '#FFF6E0'; g.font = '600 11px Lora, Georgia, serif'; g.fillText('Doghouses: ' + me.filled.length + ' of 5', 14, LH - 11);
  };

  /* ==================================================================================================
     TREAT TRAIL (in the spirit of the old snake games)
     The pup trots on by herself; steer her to each treat and a little bubble friend joins the trail behind.
     Bump a hedge or your own trail and it's only an "oof": the trail gets shorter and she starts again in
     the middle. Gather enough friends to clear the level.
     ================================================================================================== */
  var TG = 20, TT = 22;
  function Trail(who) {
    var me = this; me.who = who; me.P = PUPS[who]; me.score = 0; me.level = 1; me.cleared = false;
    sizeCanvas(TG * TT, TG * TT); me.newLevel();
  }
  Trail.prototype.newLevel = function () {
    var me = this; me.goal = 8 + me.level * 2; me.got = 0;
    // a few hedges in the field, different every level (none near the middle, where the pup starts)
    me.rocks = {};
    var n = Math.min(14, 2 + me.level * 2);
    for (var i = 0; i < n; i++) { var x = 1 + Math.floor(Math.random() * (TG - 2)), y = 1 + Math.floor(Math.random() * (TG - 2)); if (Math.abs(x - 10) + Math.abs(y - 10) > 4) me.rocks[x + ',' + y] = 1; }
    me.restart(); me.food();
  };
  Trail.prototype.restart = function () { var me = this; me.body = [[10, 10], [9, 10], [8, 10]]; me.dx = 1; me.dy = 0; me.q = []; me.acc = 0; me.daze = 0; };
  Trail.prototype.free = function (x, y) { if (x < 0 || y < 0 || x >= TG || y >= TG || this.rocks[x + ',' + y]) return false; for (var i = 0; i < this.body.length; i++) if (this.body[i][0] === x && this.body[i][1] === y) return false; return true; };
  Trail.prototype.food = function () { for (var k = 0; k < 400; k++) { var x = Math.floor(Math.random() * TG), y = Math.floor(Math.random() * TG); if (this.free(x, y)) { this.treat = [x, y, Math.random() < 0.15]; return; } } };
  Trail.prototype.onDir = function (dx, dy) { var l = this.q.length ? this.q[this.q.length - 1] : [this.dx, this.dy]; if (dx === -l[0] && dy === -l[1]) return; if (this.q.length < 2) this.q.push([dx, dy]); };
  Trail.prototype.center = function () { var h = this.body[0]; return { x: h[0] * TT + TT / 2, y: h[1] * TT + TT / 2 }; };
  Trail.prototype.update = function (dt) {
    var me = this; if (me.cleared) return;
    if (me.daze > 0) { me.daze -= dt; return; }
    var step = 1 / ((S.relaxed ? 5 : 7) + me.level * 0.4); me.acc += dt;
    while (me.acc >= step) {
      me.acc -= step; if (me.q.length) { var d = me.q.shift(); me.dx = d[0]; me.dy = d[1]; }
      var h = me.body[0], nx = h[0] + me.dx, ny = h[1] + me.dy;
      if (!me.free(nx, ny) && !(me.body.length > 1 && nx === me.body[me.body.length - 1][0] && ny === me.body[me.body.length - 1][1])) {
        SFX.oof(); say('Oof! ' + me.P.name + ' bumped into something. The trail gets a little shorter.'); me.body = me.body.slice(0, Math.max(3, Math.ceil(me.body.length / 2)));
        var keep = me.body.length; me.restart(); while (me.body.length < keep) me.body.push([me.body[me.body.length - 1][0] - 1, 10]); me.daze = 0.8; return;
      }
      me.body.unshift([nx, ny]);
      if (me.treat && nx === me.treat[0] && ny === me.treat[1]) {
        var gold = me.treat[2]; me.score += gold ? 50 : 10; me.got += gold ? 2 : 1; (gold ? SFX.heart : SFX.chomp)();
        if (me.got >= me.goal) { me.finish(); return; }
        me.food();
      } else me.body.pop();
    }
  };
  Trail.prototype.finish = function () {
    var me = this; me.cleared = true; me.score += 300; SFX.clear(); recordBest(); hud(); paused = true;
    var gift = rewardLevel('Treat Trail · level ' + me.level);
    overlay('Level ' + me.level + ' cleared!', 'The whole trail of friends made it. ' + nextLesson(), 'Next level →', function () { paused = false; me.level++; me.cleared = false; me.newLevel(); last = 0; }, '+300 for a full trail' + (gift ? ' · ' + gift : ''));
  };
  Trail.prototype.draw = function (t) {
    var me = this; g.setTransform(DPR, 0, 0, DPR, 0, 0);
    for (var y = 0; y < TG; y++) for (var x = 0; x < TG; x++) { g.fillStyle = (x + y) % 2 ? '#7DBB6E' : '#86C477'; g.fillRect(x * TT, y * TT, TT, TT); }
    g.strokeStyle = '#3F7D45'; g.lineWidth = 6; g.strokeRect(0, 0, LW, LH);   // the hedge all round the field
    Object.keys(me.rocks).forEach(function (k) { var p = k.split(','), x0 = +p[0] * TT, y0 = +p[1] * TT; rr(g, x0 + 2, y0 + 3, TT - 4, TT - 5, 8, '#3F7D45'); g.fillStyle = '#5A9E5C'; g.beginPath(); g.arc(x0 + 8, y0 + 9, 4, 0, 7); g.arc(x0 + 15, y0 + 8, 4, 0, 7); g.fill(); });
    if (me.treat) { var tx = me.treat[0] * TT + TT / 2, ty = me.treat[1] * TT + TT / 2; if (me.treat[2]) heart(g, tx, ty, 6 * (1 + Math.sin(t / 200) * 0.12), '#FF8FA3'); else { g.fillStyle = '#F7E3B5'; g.beginPath(); g.arc(tx - 5, ty - 2, 3, 0, 7); g.arc(tx - 5, ty + 2, 3, 0, 7); g.arc(tx + 5, ty - 2, 3, 0, 7); g.arc(tx + 5, ty + 2, 3, 0, 7); g.fill(); g.fillRect(tx - 5, ty - 2, 10, 4); } }
    for (var i = me.body.length - 1; i >= 1; i--) { var b = me.body[i], hue = (i * 38) % 360; g.fillStyle = 'hsla(' + hue + ',80%,78%,.95)'; g.beginPath(); g.arc(b[0] * TT + TT / 2, b[1] * TT + TT / 2, TT * 0.38, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(b[0] * TT + TT / 2 - 3, b[1] * TT + TT / 2 - 3, 2.5, 0, 7); g.fill(); }
    var h = me.body[0]; if (!(me.daze > 0 && Math.floor(t / 120) % 2)) drawPup(g, me.who, h[0] * TT + TT / 2, h[1] * TT + TT / 2 + 9, 0.46, me.dx < 0 ? -1 : 1, t / 90, true, t);
    g.fillStyle = 'rgba(20,16,44,.55)'; wallPath(g, 6, LH - 24, 170, 18, 8); g.fill(); g.fillStyle = '#FFF6E0'; g.font = '600 11px Lora, Georgia, serif'; g.textAlign = 'left'; g.fillText('Friends on the trail: ' + me.got + ' / ' + me.goal, 14, LH - 11);
  };

  /* ==================================================================================================
     BUBBLE BREAK (in the spirit of the old brick-breaker games)
     The pup carries a soft cushion along the bottom. Bounce the bubble into the blocks of Static to clear
     them. A missed bubble just floats back down onto the cushion: no lives, no game over. Steer with the
     arrows, a drag, or a tap on either side; up (or a tap above) sends the bubble off.
     ================================================================================================== */
  var BW = 440, BH = 520;
  function Bricks(who) { var me = this; me.who = who; me.P = PUPS[who]; me.score = 0; me.level = 1; me.cleared = false; sizeCanvas(BW, BH); me.px = BW / 2; me.tx = BW / 2; me.newLevel(); }
  var PATTERNS = [
    function (r, c) { return true; },
    function (r, c) { return (r + c) % 2 === 0; },
    function (r, c) { return Math.abs(c - 4.5) <= r * 0.8 + 0.5; },
    function (r, c) { return r % 2 === 0 || c === 0 || c === 9; },
    function (r, c) { return Math.abs(c - 4.5) > 1.5 || r > 3; },
    function (r, c) { return (c < 3 || c > 6) !== (r % 3 === 1); }
  ];
  Bricks.prototype.newLevel = function () {
    var me = this, rows = Math.min(7, 4 + Math.floor(me.level / 2)), pat = me.level === 1 ? PATTERNS[0] : PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
    me.bricks = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < 10; c++) if (pat(r, c)) me.bricks.push({ x: 10 + c * 42, y: 60 + r * 24, w: 38, h: 18, hp: r < 1 && me.level > 2 ? 2 : 1, hue: (r * 47 + me.level * 30) % 360 });
    me.left = me.bricks.length; me.held = true; me.ball = null; me.fx = [];
  };
  Bricks.prototype.onDir = function (dx, dy) { if (dx) this.tx = clamp(this.tx + dx * 70, 40, BW - 40); if (dy < 0 && this.held) this.launch(); };
  Bricks.prototype.onPoint = function (fx) { this.tx = clamp(fx, 40, BW - 40); };
  Bricks.prototype.launch = function () { var sp = (S.relaxed ? 250 : 320) * (1 + Math.min(0.4, (this.level - 1) * 0.05)); var a = -Math.PI / 2 + rnd(-0.5, 0.5); this.ball = { x: this.px, y: BH - 72, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp }; this.held = false; SFX.hop(); };
  Bricks.prototype.center = function () { return { x: this.px, y: BH - 40 }; };
  Bricks.prototype.update = function (dt) {
    var me = this; if (me.cleared) return;
    me.px += (me.tx - me.px) * Math.min(1, dt * 12);
    me.fx = me.fx.filter(function (f) { f.t += dt; return f.t < 0.5; });
    if (me.held) return;
    var b = me.ball, r = 8; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx); } if (b.x > BW - r) { b.x = BW - r; b.vx = -Math.abs(b.vx); } if (b.y < r) { b.y = r; b.vy = Math.abs(b.vy); }
    // the cushion: where it hits sets the angle
    if (b.vy > 0 && b.y > BH - 66 - r && b.y < BH - 50 && Math.abs(b.x - me.px) < 46) { var off = (b.x - me.px) / 46, sp = Math.hypot(b.vx, b.vy); b.vx = sp * Math.sin(off * 1.05); b.vy = -Math.abs(sp * Math.cos(off * 1.05)); SFX.hop(); }
    if (b.y > BH + 20) { SFX.oof(); say('The bubble floated down. Here it comes again, no harm done.'); me.held = true; me.ball = null; return; }
    for (var i = 0; i < me.bricks.length; i++) {
      var k = me.bricks[i]; if (k.hp <= 0) continue;
      if (b.x + r > k.x && b.x - r < k.x + k.w && b.y + r > k.y && b.y - r < k.y + k.h) {
        var ox = Math.min(b.x + r - k.x, k.x + k.w - (b.x - r)), oy = Math.min(b.y + r - k.y, k.y + k.h - (b.y - r));
        if (ox < oy) b.vx = -b.vx; else b.vy = -b.vy;
        k.hp--; if (k.hp <= 0) { me.left--; me.score += 20; me.fx.push({ x: k.x + k.w / 2, y: k.y + k.h / 2, t: 0, hue: k.hue }); SFX.pop(); } else SFX.chomp();
        break;
      }
    }
    if (me.left <= 0) me.finish();
  };
  Bricks.prototype.finish = function () {
    var me = this; me.cleared = true; me.score += 300; SFX.clear(); recordBest(); hud(); paused = true;
    var gift = rewardLevel('Bubble Break · level ' + me.level);
    overlay('Level ' + me.level + ' cleared!', 'All the Static is popped. ' + nextLesson(), 'Next level →', function () { paused = false; me.level++; me.cleared = false; me.newLevel(); last = 0; }, '+300 for clearing the wall' + (gift ? ' · ' + gift : ''));
  };
  Bricks.prototype.draw = function (t) {
    var me = this; g.setTransform(DPR, 0, 0, DPR, 0, 0);
    var bg = g.createLinearGradient(0, 0, 0, BH); bg.addColorStop(0, '#2B2560'); bg.addColorStop(1, '#4A3F8C'); g.fillStyle = bg; g.fillRect(0, 0, BW, BH);
    me.bricks.forEach(function (k) { if (k.hp <= 0) return; rr(g, k.x, k.y, k.w, k.h, 7, 'hsl(' + k.hue + ',70%,' + (k.hp > 1 ? 58 : 72) + '%)'); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(k.x + 6, k.y + 4, k.w - 12, 3); g.fillStyle = '#2A2540'; g.beginPath(); g.arc(k.x + k.w / 2 - 5, k.y + 10, 1.5, 0, 7); g.arc(k.x + k.w / 2 + 5, k.y + 10, 1.5, 0, 7); g.fill(); });
    me.fx.forEach(function (f) { var a = 1 - f.t / 0.5; g.strokeStyle = 'hsla(' + f.hue + ',90%,80%,' + a + ')'; g.lineWidth = 2; g.beginPath(); g.arc(f.x, f.y, 6 + f.t * 50, 0, 7); g.stroke(); });
    rr(g, me.px - 46, BH - 62, 92, 14, 7, '#FFF3D6'); g.fillStyle = 'rgba(242,166,192,.8)'; g.fillRect(me.px - 40, BH - 57, 80, 3);
    drawPup(g, me.who, me.px, BH - 18, 0.55, me.tx < me.px - 2 ? -1 : 1, t / 120, Math.abs(me.tx - me.px) > 2, t);
    var bx = me.held ? me.px : me.ball.x, by = me.held ? BH - 72 : me.ball.y;
    g.fillStyle = 'rgba(180,225,255,.55)'; g.beginPath(); g.arc(bx, by, 8, 0, 7); g.fill(); g.strokeStyle = '#E8F6FF'; g.lineWidth = 1.5; g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(bx - 3, by - 3, 2, 0, 7); g.fill();
    if (me.held) { g.fillStyle = '#FFF6E0'; g.font = '600 13px Lora, Georgia, serif'; g.textAlign = 'center'; g.fillText('Press ↑ or tap above the pup to send the bubble', BW / 2, BH / 2 + 60); }
  };

  /* ==================================================================================================
     TREAT SHOWER (in the spirit of the old catch-the-falling-things games)
     Treats tumble down from a friendly cloud; the pup catches them in her basket. Now and then a grumpy
     little Static cloud drops a raindrop: a drip on the nose is only a pause, never a loss.
     ================================================================================================== */
  var CWID = 440, CHT = 520;
  function Catch(who) { var me = this; me.who = who; me.P = PUPS[who]; me.score = 0; me.level = 1; me.cleared = false; sizeCanvas(CWID, CHT); me.px = CWID / 2; me.tx = CWID / 2; me.newLevel(); }
  Catch.prototype.newLevel = function () { var me = this; me.goal = 12 + me.level * 3; me.got = 0; me.items = []; me.spawn = 0; me.daze = 0; me.cloud = rnd(60, CWID - 60); me.cdir = Math.random() < 0.5 ? 1 : -1; me.fx = []; };
  Catch.prototype.onDir = function (dx) { if (dx) this.tx = clamp(this.tx + dx * 70, 30, CWID - 30); };
  Catch.prototype.onPoint = function (fx) { this.tx = clamp(fx, 30, CWID - 30); };
  Catch.prototype.center = function () { return { x: this.px, y: CHT - 40 }; };
  Catch.prototype.update = function (dt) {
    var me = this; if (me.cleared) return;
    var lv = 1 + Math.min(0.8, (me.level - 1) * 0.08), slow = S.relaxed ? 0.75 : 1;
    if (me.daze > 0) me.daze -= dt; else me.px += (me.tx - me.px) * Math.min(1, dt * 10);
    me.cloud += me.cdir * 70 * lv * slow * dt; if (me.cloud < 50 || me.cloud > CWID - 50) { me.cdir = -me.cdir; me.cloud = clamp(me.cloud, 50, CWID - 50); } if (Math.random() < dt * 0.4) me.cdir = -me.cdir;
    me.spawn -= dt;
    if (me.spawn <= 0) {
      me.spawn = rnd(0.7, 1.3) / lv;
      var kind = Math.random() < 0.18 + Math.min(0.12, me.level * 0.015) ? 'drop' : Math.random() < 0.12 ? 'heart' : 'bone';
      me.items.push({ x: clamp(me.cloud + rnd(-30, 30), 20, CWID - 20), y: 70, vy: rnd(90, 130) * lv * slow, kind: kind, rot: rnd(0, 6) });
    }
    me.fx = me.fx.filter(function (f) { f.t += dt; return f.t < 0.6; });
    for (var i = me.items.length - 1; i >= 0; i--) {
      var it = me.items[i]; it.y += it.vy * dt; it.rot += dt * 2;
      if (it.y > CHT - 70 && it.y < CHT - 40 && Math.abs(it.x - me.px) < 34) {
        me.items.splice(i, 1);
        if (it.kind === 'drop') { if (me.daze <= 0) { me.daze = 0.7; SFX.splash(); say('A drip on the nose! ' + me.P.name + ' shakes it off.'); } continue; }
        me.got += it.kind === 'heart' ? 2 : 1; me.score += it.kind === 'heart' ? 40 : 10; me.fx.push({ x: it.x, y: it.y, t: 0 }); (it.kind === 'heart' ? SFX.heart : SFX.chomp)();
        if (me.got >= me.goal) { me.finish(); return; }
      } else if (it.y > CHT + 20) me.items.splice(i, 1);
    }
  };
  Catch.prototype.finish = function () {
    var me = this; me.cleared = true; me.score += 250; SFX.clear(); recordBest(); hud(); paused = true;
    var gift = rewardLevel('Treat Shower · level ' + me.level);
    overlay('Level ' + me.level + ' cleared!', 'The basket is full. ' + nextLesson(), 'Next level →', function () { paused = false; me.level++; me.cleared = false; me.newLevel(); last = 0; }, '+250 for a full basket' + (gift ? ' · ' + gift : ''));
  };
  Catch.prototype.draw = function (t) {
    var me = this; g.setTransform(DPR, 0, 0, DPR, 0, 0);
    var bg = g.createLinearGradient(0, 0, 0, CHT); bg.addColorStop(0, '#9CD3F2'); bg.addColorStop(1, '#E9F6FF'); g.fillStyle = bg; g.fillRect(0, 0, CWID, CHT);
    g.fillStyle = '#7DBB6E'; g.fillRect(0, CHT - 28, CWID, 28);
    // the cloud the treats come from
    var cx = me.cloud; g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(cx - 26, 52, 18, 0, 7); g.arc(cx, 42, 24, 0, 7); g.arc(cx + 26, 52, 18, 0, 7); g.fill(); g.fillStyle = '#2A2540'; g.beginPath(); g.arc(cx - 7, 46, 2, 0, 7); g.arc(cx + 7, 46, 2, 0, 7); g.fill(); g.strokeStyle = '#2A2540'; g.lineWidth = 1.4; g.beginPath(); g.arc(cx, 50, 4, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    me.items.forEach(function (it) {
      if (it.kind === 'heart') heart(g, it.x, it.y, 7, '#FF8FA3');
      else if (it.kind === 'drop') { g.fillStyle = '#5B8DEF'; g.beginPath(); g.moveTo(it.x, it.y - 9); g.quadraticCurveTo(it.x + 7, it.y + 2, it.x, it.y + 6); g.quadraticCurveTo(it.x - 7, it.y + 2, it.x, it.y - 9); g.fill(); }
      else { g.save(); g.translate(it.x, it.y); g.rotate(it.rot); g.fillStyle = '#F7E3B5'; g.beginPath(); g.arc(-7, -3, 3.4, 0, 7); g.arc(-7, 3, 3.4, 0, 7); g.arc(7, -3, 3.4, 0, 7); g.arc(7, 3, 3.4, 0, 7); g.fill(); g.fillRect(-7, -2.5, 14, 5); g.restore(); }
    });
    me.fx.forEach(function (f) { var a = 1 - f.t / 0.6; g.fillStyle = 'rgba(255,214,107,' + a + ')'; g.font = '700 14px Lora, Georgia, serif'; g.textAlign = 'center'; g.fillText('+', f.x, f.y - f.t * 40); });
    drawPup(g, me.who, me.px, CHT - 24, 0.6, me.tx < me.px - 2 ? -1 : 1, t / 110, Math.abs(me.tx - me.px) > 2, t);
    rr(g, me.px - 30, CHT - 74, 60, 18, 8, '#C98B4F'); g.fillStyle = '#A8703C'; g.fillRect(me.px - 26, CHT - 66, 52, 3);
    if (me.daze > 0) { g.fillStyle = '#5B8DEF'; g.font = '700 16px Lora, Georgia, serif'; g.textAlign = 'center'; g.fillText('drip!', me.px, CHT - 90); }
    g.fillStyle = 'rgba(20,16,44,.55)'; wallPath(g, 6, CHT - 24, 150, 18, 8); g.fill(); g.fillStyle = '#FFF6E0'; g.font = '600 11px Lora, Georgia, serif'; g.textAlign = 'left'; g.fillText('In the basket: ' + me.got + ' / ' + me.goal, 14, CHT - 11);
  };

  // every game in the arcade
  var GAMES = {
    chase: { name: 'Treat Chase', make: function (w) { return new Chase(w); }, hint: 'Gather every treat. Golden hearts turn the Static into bubbles you can pop.' },
    cross: { name: 'Cross the Way', make: function (w) { return new Cross(w); }, hint: 'Hop over the road, ride the logs and lily pads, and reach the five doghouses.' },
    trail: { name: 'Treat Trail', make: function (w) { return new Trail(w); }, hint: 'Steer to each treat and a bubble friend joins your trail. A bump only makes it shorter.' },
    bricks: { name: 'Bubble Break', make: function (w) { return new Bricks(w); }, hint: 'Bounce the bubble into the Static. Up or a tap above the pup sends it off; a miss just floats back.' },
    shower: { name: 'Treat Shower', make: function (w) { return new Catch(w); }, hint: 'Catch the treats in the basket. A raindrop is only a little drip on the nose.' }
  };

  /* ---------- the menu and the stage ---------- */
  function start() {
    if (!window.TOLPups) { say('The pups are still warming up. Try again in a moment.'); return; }
    ac(); // the sound is created here, on the player's own tap
    cv = $('ar-cv'); g = cv.getContext('2d');
    $('ar-select').hidden = true; $('ar-stage').hidden = false;
    if (!GAMES[S.game]) S.game = 'chase';
    game = GAMES[S.game].make(S.pup);
    paused = false; running = true; tAll = 0; $('ar-overlay').hidden = true; $('ar-pause').textContent = '⏸ Pause';
    $('ar-title').textContent = GAMES[S.game].name;
    $('ar-pupname').textContent = ' · playing as ' + PUPS[S.pup].name;
    var wrap = $('ar-wrap'); wrap.setAttribute('aria-label', GAMES[S.game].name + ' game. Use the arrow keys or WASD to move, P to pause, M for sound.');
    drawBadge(); hud(); game.draw(0);
    say(GAMES[S.game].hint);
    startLoop(); wrap.focus(); try { wrap.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); } catch (e) { /* ignore */ }
  }
  function backToMenu() {
    recordBest(); running = false; paused = false; game = null; stopLoop();
    $('ar-overlay').hidden = true; $('ar-stage').hidden = true; $('ar-select').hidden = false;
    try { $('ar-select').scrollIntoView({ block: 'start' }); } catch (e) { /* ignore */ }
    var f = D.querySelector('input[name="ar-game"]:checked'); if (f) f.focus();
    refreshBest();
  }
  function restart() { recordBest(); if (!game) return; game = GAMES[S.game].make(S.pup); paused = false; $('ar-overlay').hidden = true; $('ar-pause').textContent = '⏸ Pause'; tAll = 0; last = 0; game.draw(0); hud(); say('A fresh start.'); }
  function drawBadge() {
    var c = $('ar-who'); if (!c || !window.TOLPups) return; var x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
    drawPupOn(x, S.pup, 24, 50, 0.85);
  }
  function drawPupOn(x, who, px, py, sc) { var L = window.TOLPups.looks[PUPS[who].look]; x.save(); x.translate(px, py); x.scale(sc, sc); try { window.TOLPups.draw(x, L, 'sit', 0, 0.2, false, 0, 0); } catch (e) { /* ignore */ } x.restore(); }
  function refreshBest() {
    Object.keys(GAMES).forEach(function (gm) {
      var el = $('ar-best-' + gm); if (!el) return; var a = +S.best[gm + ':tidbit'] || 0, b = +S.best[gm + ':sugarfoot'] || 0;
      el.textContent = (a || b) ? 'Best so far: Tidbit ' + a + ', Sugarfoot ' + b : 'No score yet. Be the first.';
    });
  }
  function previews() {
    var T1 = $('ar-prev-chase'), T2 = $('ar-prev-cross');
    if (T1) { var x = T1.getContext('2d'); x.fillStyle = '#2A2552'; x.fillRect(0, 0, T1.width, T1.height); x.fillStyle = '#4655C9'; [[10, 10, 80, 10], [10, 10, 10, 50], [10, 50, 50, 10], [70, 30, 10, 40], [30, 30, 30, 10]].forEach(function (b) { wallPath(x, b[0], b[1], b[2], b[3], 4); x.fill(); });
      x.fillStyle = '#F8DC6E'; [[20, 24], [30, 24], [40, 24], [50, 24], [60, 44], [60, 60]].forEach(function (d) { x.beginPath(); x.arc(d[0], d[1], 2.2, 0, 7); x.fill(); }); heart(x, 90, 56, 6, '#FF8FA3');
      x.fillStyle = '#9FA8C9'; x.beginPath(); x.arc(86, 22, 8, Math.PI, 0); x.lineTo(94, 32); x.lineTo(78, 32); x.fill(); x.fillStyle = '#2A2540'; x.beginPath(); x.arc(83, 22, 1.5, 0, 7); x.arc(89, 22, 1.5, 0, 7); x.fill();
      drawPupOn(x, 'tidbit', 36, 44, 0.45); }
    if (T2) { var y = T2.getContext('2d'); y.fillStyle = '#4F86C6'; y.fillRect(0, 0, T2.width, 24); y.fillStyle = '#4A4A58'; y.fillRect(0, 24, T2.width, 28); y.fillStyle = '#6FAF7B'; y.fillRect(0, 52, T2.width, 28);
      rr(y, 8, 6, 36, 12, 6, '#8B5E3C'); rr(y, 62, 8, 30, 12, 6, '#8B5E3C'); rr(y, 14, 28, 26, 14, 4, '#F2F2F7'); rr(y, 62, 31, 30, 14, 4, '#F7C84B'); drawPupOn(y, 'sugarfoot', 52, 78, 0.42); }
    var T3 = $('ar-prev-trail'), T4 = $('ar-prev-bricks'), T5 = $('ar-prev-shower');
    if (T3) { var z = T3.getContext('2d'); z.fillStyle = '#86C477'; z.fillRect(0, 0, T3.width, T3.height); [[30, 50], [42, 50], [54, 50], [54, 38]].forEach(function (d, i) { z.fillStyle = 'hsl(' + i * 60 + ',80%,78%)'; z.beginPath(); z.arc(d[0], d[1], 5, 0, 7); z.fill(); }); heart(z, 92, 30, 6, '#FF8FA3'); drawPupOn(z, 'tidbit', 70, 62, 0.4); }
    if (T4) { var w4 = T4.getContext('2d'); w4.fillStyle = '#2B2560'; w4.fillRect(0, 0, T4.width, T4.height); for (var bi = 0; bi < 5; bi++) for (var bj = 0; bj < 2; bj++) rr(w4, 6 + bi * 22, 8 + bj * 12, 19, 9, 3, 'hsl(' + (bi * 50 + bj * 30) + ',70%,72%)'); w4.fillStyle = 'rgba(180,225,255,.8)'; w4.beginPath(); w4.arc(70, 46, 4, 0, 7); w4.fill(); rr(w4, 38, 68, 44, 7, 3, '#FFF3D6'); }
    if (T5) { var w5 = T5.getContext('2d'); w5.fillStyle = '#BFE3F7'; w5.fillRect(0, 0, T5.width, T5.height); w5.fillStyle = '#fff'; w5.beginPath(); w5.arc(50, 16, 10, 0, 7); w5.arc(64, 12, 12, 0, 7); w5.arc(78, 16, 10, 0, 7); w5.fill(); heart(w5, 40, 42, 5, '#FF8FA3'); w5.fillStyle = '#F7E3B5'; w5.fillRect(70, 36, 12, 5); rr(w5, 44, 64, 34, 9, 4, '#C98B4F'); drawPupOn(w5, 'sugarfoot', 61, 86, 0.32); }
  }
  function init() {
    if (!$('ar-select')) return;
    // restore choices
    var pr = D.querySelector('input[name="ar-pup"][value="' + S.pup + '"]'); if (pr) pr.checked = true;
    var gr = D.querySelector('input[name="ar-game"][value="' + S.game + '"]'); if (gr) gr.checked = true;
    Array.prototype.forEach.call(D.querySelectorAll('input[name="ar-pup"]'), function (i) { i.addEventListener('change', function () { S.pup = i.value; save(); }); });
    Array.prototype.forEach.call(D.querySelectorAll('input[name="ar-game"]'), function (i) { i.addEventListener('change', function () { S.game = i.value; save(); }); });
    var sr = $('ar-sel-relaxed'), ss = $('ar-sel-sound');
    if (sr) sr.addEventListener('change', function () { S.relaxed = sr.checked; save(); syncToggles(); });
    if (ss) ss.addEventListener('change', function () { S.sound = ss.checked; save(); syncToggles(); });
    $('ar-start').addEventListener('click', start);
    $('ar-pause').addEventListener('click', function () { togglePause(); });
    $('ar-restart').addEventListener('click', restart);
    $('ar-menu').addEventListener('click', backToMenu);
    $('ar-sound').addEventListener('click', toggleSound);
    $('ar-relaxed').addEventListener('click', function () { S.relaxed = !S.relaxed; save(); syncToggles(); });
    [['up', 0, -1], ['left', -1, 0], ['down', 0, 1], ['right', 1, 0]].forEach(function (b) {
      var el = $('ar-d-' + b[0]); if (!el) return;
      var rep_ = 0;
      function stopHold() { if (rep_) { clearInterval(rep_); rep_ = 0; } }
      el.addEventListener('pointerdown', function (e) { e.preventDefault(); dir(b[1], b[2]); stopHold(); rep_ = setInterval(function () { dir(b[1], b[2]); }, 170); });
      ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(function (ev) { el.addEventListener(ev, stopHold); });
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dir(b[1], b[2]); } });
    });
    D.addEventListener('keydown', onKey);
    var wrap = $('ar-wrap'); wrap.addEventListener('pointerdown', onPointerDown); wrap.addEventListener('pointermove', onPointerMove); wrap.addEventListener('pointerup', onPointerUp); wrap.addEventListener('pointercancel', function () { ptr = null; });
    syncToggles(); refreshBest();
    var go = function () { previews(); };
    if (window.TOLPups) go(); else window.addEventListener('load', go);
  }
  window.TOLArcade = {
    state: function () { return game ? { game: S.game, pup: S.pup, score: game.score, level: game.level, treats: game.treats, filled: game.filled && game.filled.length, paused: paused, running: running, x: game.pup && game.pup.x, y: game.pup && game.pup.y } : { running: false }; },
    _game: function () { return game; }, _set: function (k, v) { S[k] = v; }
  };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();
})();
