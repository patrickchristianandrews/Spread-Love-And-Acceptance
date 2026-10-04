/* arcade.js — the Frequency Journey arcade (frequency-journey.html)

   Pick a pup (Tidbit or Sugarfoot), pick a game, press start.
     Treat Chase  a maze game in the spirit of the old arcade chasers: gather every treat while grumpy little
                  clouds of Static drift about. A golden heart turns them into friendly bubbles you can pop.
     Cross the Way  a crossing game in the same spirit: hop over the busy road, ride the logs and lily pads
                  across the river and reach the five doghouses.
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
      if (d.game === 'chase' || d.game === 'cross') S.game = d.game;
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
    'The Perfect Frequency was the two of you, in tune.'
  ];
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
  function onPointerUp(e) {
    if (!ptr || !running || paused || !game) { ptr = null; return; }
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

  function Chase(who) {
    var P = PUPS[who], me = this;
    me.who = who; me.score = 0; me.level = 1; me.over = false;
    sizeCanvas(CW_ * T, CH_ * T);
    me.cells = []; me.treats = 0;
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
      me.cells = MAP.map(function (row) { return row.split('').map(function (ch) { return ch === 'P' || ch === 'G' ? ',' : ch; }); });
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
    var lesson = lessons[(me.level - 1) % lessons.length];
    var gift = rewardLevel('Treat Chase · level ' + me.level);
    overlay('Level ' + me.level + ' cleared!', 'Every treat is gathered. ' + lesson, 'Next level →', function () { me.level++; me.cleared = false; me.reset(true); last = 0; }, '+500 for clearing the maze' + (gift ? ' · ' + gift : ''));
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
      var ch = MAP[r][c];
      if (ch === '#') {
        g.fillStyle = '#4655C9'; wallPath(g, c * T + 2, r * T + 2, T - 4, T - 4, 6); g.fill();
        if (c + 1 < CW_ && MAP[r][c + 1] === '#') g.fillRect(c * T + T - 4, r * T + 2, 8, T - 4);
        if (r + 1 < CH_ && MAP[r + 1][c] === '#') g.fillRect(c * T + 2, r * T + T - 4, T - 4, 8);
      } else if (ch === '-') { g.fillStyle = '#F2A6C0'; g.fillRect(c * T + 2, r * T + T / 2 - 2, T - 4, 4); }
    }
    g.fillStyle = 'rgba(255,255,255,.10)';
    for (r = 0; r < CH_; r++) for (c = 0; c < CW_; c++) if (MAP[r][c] === '#') { wallPath(g, c * T + 5, r * T + 5, T - 12, 4, 2); g.fill(); }
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
  function Cross(who) {
    var me = this; me.who = who; me.P = PUPS[who]; me.score = 0; me.level = 1; me.filled = []; me.cleared = false;
    sizeCanvas(COLS * TS, ROWS * TS);
    me.lanes = ROAD.concat(RIVER).map(function (L) { var n = Math.round(LOOP / L.period); return Object.assign({ off: rnd(0, L.period) }, L, { n: n }); });
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
    var lesson = lessons[(me.level - 1) % lessons.length];
    paused = true;
    var gift = rewardLevel('Cross the Way · level ' + me.level);
    overlay('Level ' + me.level + ' cleared!', 'All five doghouses are full. ' + lesson, 'Next level →', function () {
      paused = false; me.level++; me.cleared = false; me.filled = []; me.newPup(); last = 0;
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

  /* ---------- the menu and the stage ---------- */
  function start() {
    if (!window.TOLPups) { say('The pups are still warming up. Try again in a moment.'); return; }
    ac(); // the sound is created here, on the player's own tap
    cv = $('ar-cv'); g = cv.getContext('2d');
    $('ar-select').hidden = true; $('ar-stage').hidden = false;
    game = S.game === 'chase' ? new Chase(S.pup) : new Cross(S.pup);
    paused = false; running = true; tAll = 0; $('ar-overlay').hidden = true; $('ar-pause').textContent = '⏸ Pause';
    $('ar-title').textContent = S.game === 'chase' ? 'Treat Chase' : 'Cross the Way';
    $('ar-pupname').textContent = ' · playing as ' + PUPS[S.pup].name;
    var wrap = $('ar-wrap'); wrap.setAttribute('aria-label', (S.game === 'chase' ? 'Treat Chase' : 'Cross the Way') + ' game. Use the arrow keys or WASD to move, P to pause, M for sound.');
    drawBadge(); hud(); game.draw(0);
    say(S.game === 'chase' ? 'Gather every treat. Golden hearts turn the Static into bubbles you can pop.' : 'Hop over the road, ride the logs and lily pads, and reach the five doghouses.');
    startLoop(); wrap.focus(); try { wrap.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); } catch (e) { /* ignore */ }
  }
  function backToMenu() {
    recordBest(); running = false; paused = false; game = null; stopLoop();
    $('ar-overlay').hidden = true; $('ar-stage').hidden = true; $('ar-select').hidden = false;
    try { $('ar-select').scrollIntoView({ block: 'start' }); } catch (e) { /* ignore */ }
    var f = D.querySelector('input[name="ar-game"]:checked'); if (f) f.focus();
    refreshBest();
  }
  function restart() { recordBest(); if (!game) return; game = S.game === 'chase' ? new Chase(S.pup) : new Cross(S.pup); paused = false; $('ar-overlay').hidden = true; $('ar-pause').textContent = '⏸ Pause'; tAll = 0; last = 0; game.draw(0); hud(); say('A fresh start.'); }
  function drawBadge() {
    var c = $('ar-who'); if (!c || !window.TOLPups) return; var x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
    drawPupOn(x, S.pup, 24, 50, 0.85);
  }
  function drawPupOn(x, who, px, py, sc) { var L = window.TOLPups.looks[PUPS[who].look]; x.save(); x.translate(px, py); x.scale(sc, sc); try { window.TOLPups.draw(x, L, 'sit', 0, 0.2, false, 0, 0); } catch (e) { /* ignore */ } x.restore(); }
  function refreshBest() {
    ['chase', 'cross'].forEach(function (gm) {
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
    var wrap = $('ar-wrap'); wrap.addEventListener('pointerdown', onPointerDown); wrap.addEventListener('pointerup', onPointerUp); wrap.addEventListener('pointercancel', function () { ptr = null; });
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
