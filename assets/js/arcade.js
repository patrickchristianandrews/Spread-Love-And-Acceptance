/* arcade.js — Tidbit and Sugarfoot's Arcade (frequency-journey.html)

   Pick a pup (Tidbit or Sugarfoot), pick a game, press start.
     Treat Chase  a maze game in the spirit of the old arcade chasers: gather every treat while grumpy little
                  clouds of Static drift about. A golden heart turns them into friendly bubbles you can pop.
     Cross the Way  a crossing game in the same spirit: hop over the busy road, ride the logs and lily pads
                  across the river and reach the five doghouses.
     The Treat Trail  a wagon-trail journey: pace, snacks, rivers and trading posts on the way to Starfall Hill.
     Bubble Break a brick-breaker: bounce a bubble into blocks of Static; a miss just floats back down.
     Treat Shower a catch game: fill the basket with falling treats; a raindrop is only a drip on the nose.
     Home Run Derby  ten pitches: your pup bats, the other one pitches; swing as the ring closes on the plate.
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
      if (/^(chase|cross|trail|bricks|shower|derby)$/.test(d.game)) S.game = d.game;
      if (typeof d.relaxed === 'boolean') S.relaxed = d.relaxed;
      if (typeof d.sound === 'boolean') S.sound = d.sound;
      if (d.best && typeof d.best === 'object') S.best = d.best;
    } }
  } catch (e) { /* private window: fine */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
  function bestKey() { return S.game + ':' + S.pup; }
  function getBest() { return +S.best[bestKey()] || 0; }

  /* ---------- sound: tiny, soft blips (only after the player has pressed start) ---------- */
  // made right here with WebAudio, never before the first tap; the Sound button (or M) and the site's Quiet mode
  // (or "site sounds off" in Settings) both keep the arcade silent
  var AC = null;
  function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } } if (AC && AC.state === 'suspended') { try { AC.resume(); } catch (e) { /* ignore */ } } return AC; }
  function quietSite() { try { return !!(window.TOLQuiet && typeof window.TOLQuiet.sound === 'function' && !window.TOLQuiet.sound()); } catch (e) { return false; } }
  function soundOk() { return S.sound && !quietSite() && !!AC; }
  function blip(freq, dur, type, vol, slide) {
    if (!soundOk()) return; var c = ac(); if (!c) return;
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
    clear: function () { [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { blip(f, 0.2, 'triangle', 0.06); }, i * 120); }); },
    // the Home Run Derby's: the crack of the bat, a whoosh, the crowd, a soft mitt, and the ballpark organ's "charge"
    crack: function () { hiss({ type: 'highpass', f0: 2400, vol: 0.28, atk: 0.001, dur: 0.09 }); blip(900, 0.05, 'square', 0.035, 300); blip(170, 0.12, 'sine', 0.13, 60); },
    whoosh: function (v) { hiss({ type: 'bandpass', f0: 380, f1: 2100, q: 1.4, vol: 0.06 * (v || 1), atk: 0.12, hold: 0.14, dur: 0.32 }); },
    cheer: function (big) {
      hiss({ type: 'bandpass', f0: 950, q: 0.5, vol: big ? 0.1 : 0.05, atk: 0.25, hold: big ? 1.1 : 0.5, dur: big ? 2.4 : 1.2 });
      hiss({ type: 'bandpass', f0: 1900, q: 0.9, vol: big ? 0.05 : 0.025, atk: 0.3, hold: big ? 0.9 : 0.4, dur: big ? 2.1 : 1 });
      if (big) [0.3, 0.55, 0.9].forEach(function (d, i) { setTimeout(function () { blip(1250 + i * 150, 0.28, 'sine', 0.025, 1700 + i * 120); }, d * 1000); });
    },
    mitt: function () { blip(140, 0.09, 'triangle', 0.08, 90); hiss({ type: 'lowpass', f0: 700, vol: 0.05, atk: 0.002, dur: 0.07 }); },
    charge: function () { organ([[392, 0, 0.15], [523.25, 0.16, 0.15], [659.25, 0.32, 0.15], [784, 0.48, 0.3], [659.25, 0.84, 0.14], [784, 1.0, 0.7]]); }
  };
  // filtered noise: { type, f0, f1 (a sweep), q, vol, atk, hold, dur }
  var NOISE = null;
  function noiseBuf(c) {
    if (!NOISE) { var n = Math.floor(c.sampleRate * 2), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; NOISE = b; }
    return NOISE;
  }
  function hiss(o) {
    if (!soundOk()) return; var c = ac(); if (!c) return;
    try {
      var t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), gn = c.createGain(), atk = o.atk || 0.005, hold = Math.max(atk, o.hold || 0);
      s.buffer = noiseBuf(c); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f0, t); if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur); f.Q.value = o.q || 1;
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(o.vol, t + atk); gn.gain.setValueAtTime(o.vol, t + hold); gn.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      s.connect(f); f.connect(gn); gn.connect(c.destination); s.start(t, Math.random() * 0.5); s.stop(t + o.dur + 0.05);
    } catch (e) { /* ignore */ }
  }
  // a little organ: each note is a few soft sine partials, [frequency, start, length] in seconds
  function organ(notes) {
    if (!soundOk()) return; var c = ac(); if (!c) return;
    try {
      var t0 = c.currentTime + 0.02;
      notes.forEach(function (n) {
        var t = t0 + n[1], gn = c.createGain();
        gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.045, t + 0.02); gn.gain.setValueAtTime(0.045, t + n[2] - 0.04); gn.gain.exponentialRampToValueAtTime(0.0001, t + n[2]);
        gn.connect(c.destination);
        [[1, 1], [2, 0.5], [3, 0.28], [4, 0.12]].forEach(function (h) { var o = c.createOscillator(), hg = c.createGain(); o.type = 'sine'; o.frequency.value = n[0] * h[0]; hg.gain.value = h[1]; o.connect(hg); hg.connect(gn); o.start(t); o.stop(t + n[2] + 0.03); });
      });
    } catch (e) { /* ignore */ }
  }

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
  // the three numbers over the field; the Derby counts home runs and pitches instead
  function hudLabels(L) {
    L = L || ['Score', 'Level', 'Best'];
    ['ar-score', 'ar-level', 'ar-best'].forEach(function (id, i) { var b = $(id), n = b && b.previousSibling; if (n && n.nodeType === 3) n.nodeValue = L[i]; });
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
    // games with their own keys (the Treat Trail's numbered choices); Enter on a focused button is left to the button
    if (game && game.onKey && !paused && !(tag === 'BUTTON' && (k === 'Enter' || k === ' ')) && game.onKey(k)) { e.preventDefault(); return; }
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
    if (game && game.onTap) { e.preventDefault(); ptr = null; game.onTap(); return; }   // the Derby: a tap is a swing, at once
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
  D.addEventListener('visibilitychange', function () { if (D.hidden && running && !paused) togglePause(true); gaming(running && !D.hidden); });
  window.addEventListener('pagehide', function () { gaming(false); });
  window.addEventListener('pageshow', function () { gaming(running && !D.hidden); });

  /* ---------- overlay ---------- */
  // alt: an optional third button, { label, fn } (the Home Run Derby's "Swap roles")
  function overlay(title, text, goLabel, onGo, extra, alt) {
    $('ar-ov-h').textContent = title; $('ar-ov-p').textContent = text;
    var go = $('ar-ov-go'); go.textContent = goLabel; go.onclick = function () { $('ar-overlay').hidden = true; if (onGo) onGo(); $('ar-wrap').focus(); };
    var ab = $('ar-ov-alt');
    if (!ab && go.parentNode) { ab = D.createElement('button'); ab.type = 'button'; ab.className = 'ar-btn'; ab.id = 'ar-ov-alt'; go.parentNode.insertBefore(ab, go.nextSibling); }
    if (ab) { ab.hidden = !alt; ab.textContent = alt ? alt.label : ''; ab.onclick = alt ? function () { $('ar-overlay').hidden = true; alt.fn(); } : null; }
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
    me.P = P;
    me.reset(true);
    me.banner = levelBanner(1, me.diff(), 0);
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
      return { G: G, x: i === 0 ? 9 : 8 + (i - 1), y: i === 0 ? 7 : 9, dx: i === 0 ? -1 : 0, dy: 0, state: inHouse ? 'house' : 'roam', release: G.out * lerp(1.8, 1, me.diff()), fright: false };
    });
  };
  // level 1 is gentle: slower Static that waits longer in the house, longer calm spells and longer golden hearts.
  // It climbs a little each level to about level 10, then holds; the Static never gets as quick as the pup.
  Chase.prototype.diff = function () { return crossDiff(this.level, S.relaxed); };
  Chase.prototype.lvlMul = function () { return 1 + Math.min(0.2, (this.level - 1) * 0.02); };
  Chase.prototype.ghostSpeed = function () { return Math.min(lerp(4.3, 6.4, this.diff()), 0.9 * PUPS.sugarfoot.chaseSpeed * this.lvlMul()); };
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
      else if (ch === 'o') { me.cells[r][c] = ','; me.treats--; me.score += 50; me.power = me.P.power * (S.relaxed ? 1.3 : 1) * lerp(1.35, 1, me.diff()); me.chain = 0; me.ghosts.forEach(function (gh) { if (gh.state === 'roam') { gh.fright = true; gh.dx = -gh.dx; gh.dy = -gh.dy; } }); SFX.heart(); me.say('A golden heart! The Static turns into friendly bubbles. Pop them!'); }
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
    var me = this, p = me.pup, mul = speedMul(), dif = me.diff();
    me.clock += dt; if (me.toastT > 0) me.toastT -= dt;
    if (me.banner) { me.banner.t += dt; if (me.banner.t > 2.6) me.banner = null; }
    if (p.invul > 0) p.invul -= dt;
    if (p.want) { p.wantT -= dt; if (p.wantT <= 0) p.want = null; }
    // scatter / chase waves
    me.modeT += dt; if (me.mode === 'scatter' && me.modeT > lerp(8, 5, dif)) { me.mode = 'chase'; me.modeT = 0; } else if (me.mode === 'chase' && me.modeT > lerp(12, 18, dif)) { me.mode = 'scatter'; me.modeT = 0; }
    if (me.power > 0) { me.power -= dt; if (me.power <= 0) { me.power = 0; me.ghosts.forEach(function (gh) { gh.fright = false; }); } }
    // the pup
    var ps = me.P.chaseSpeed * speedMul() * me.lvlMul();
    var before = p.x + p.y;
    me.moveEntity(p, ps * dt, me.decidePup, false);
    p.moving = (p.dx || p.dy) && Math.abs(p.x + p.y - before) > 1e-9;
    if (p.moving) { p.ph += dt * 14; if (p.dx) p.face = p.dx; }
    // the Static
    me.ghosts.forEach(function (gh) {
      if (gh.state === 'house') { gh.release -= dt; if (gh.release <= 0) gh.state = 'leaving'; gh.bob = Math.sin(me.clock * 5 + gh.G.out) * 0.12; return; }
      var sp = me.ghostSpeed() * mul;
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
      if (dd < 0.62 * (who_() === 'sugarfoot' ? 0.85 : 1) * lerp(0.85, 1, dif)) {
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
    overlay('Level ' + me.level + ' cleared!', 'Every treat is gathered. ' + lesson, 'Next level →', function () { var prevD = me.diff(); me.level++; me.cleared = false; me.map = genMaze(Math.random); me.reset(true); me.banner = levelBanner(me.level, me.diff(), prevD); say(me.banner.title + ': ' + me.banner.note + '.'); last = 0; }, '+500 for clearing the maze' + (gift ? ' · ' + gift : ''));
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
  // the little "Level N" card at the start of a level, with a tiny note when the level is a step harder
  function levelBanner(level, d, prevD, extra) {
    var note = level === 1 ? 'nice and easy to start' : d > prevD + 1e-6 ? 'a bit faster now' : 'the same pace as before';
    if (extra) note += ', and ' + extra;
    return { title: 'Level ' + level, note: note, t: 0 };
  }
  function drawBanner(g, b, w, y) {
    if (!b) return;
    var a = Math.max(0, Math.min(1, b.t / 0.25, (2.6 - b.t) / 0.45)); if (a <= 0) return;
    g.save(); g.globalAlpha = a; g.font = '600 12px Lora, Georgia, serif';
    var bw = Math.max(170, g.measureText(b.note).width + 36);
    g.fillStyle = 'rgba(20,16,44,.82)'; wallPath(g, w / 2 - bw / 2, y - 30, bw, 58, 16); g.fill();
    g.strokeStyle = 'rgba(255,224,138,.6)'; g.lineWidth = 1.5; g.stroke();
    g.textAlign = 'center'; g.fillStyle = '#FFE08A'; g.font = '700 21px Fraunces, Georgia, serif'; g.fillText(b.title, w / 2, y - 4);
    g.fillStyle = '#FFF6E0'; g.font = 'italic 500 12px Lora, Georgia, serif'; g.fillText(b.note, w / 2, y + 16);
    g.restore(); g.textAlign = 'start';
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
    drawBanner(g, me.banner, LW, 12.5 * T);
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
  // the lanes: level 1 starts out easy and every level after it gets a little harder, up to about level 10, then holds.
  //   level 1   a few short, slow bikes and scooters with long gaps; wide, slow logs; no lily pads
  //   then      a little faster, a few more vehicles, vans and then buses, shorter logs, lily pads from level 2
  //   level 4   some lily pads start to dip (never in Relaxed pace)
  //   level 5+  the road lanes stop simply taking turns left and right; from about level 7 the river does too
  // Relaxed pace climbs at half the rate. Every lane is checked as it's built: a road lane always leaves a gap the pup
  // can stand in for a fair while, and a river lane never leaves too long a wait for the next log or pad.
  var ROADK = { van: 2, bike: 1, bus: 3, scooter: 1 };
  function lerp(a, b, t) { return a + (b - a) * t; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  // how hard a level is: 0 at level 1, 1 from level 10 on
  function crossDiff(level, relaxed) { var d = clamp((level - 1) / 9, 0, 1); return relaxed ? d * 0.5 : d; }
  // the pup's body on the road (tiles wide), the worst case of the two pups at this difficulty
  function crossShrink(d, who, relaxed) { return Math.min(0.42, (who === 'sugarfoot' ? 0.2 : 0.12) + lerp(0.14, 0, d) + (relaxed ? 0.1 : 0)); }
  // the shortest clear spell a road lane must leave at any spot (seconds, at full pace), and the longest wait
  // for something to stand on in the river (seconds)
  function roadWindow(d) { return lerp(2.4, 0.85, d); }
  function riverWait(d) { return lerp(1.6, 3.2, d); }
  function roadGap(L, d) { return (LOOP / L.n - L.len - (1 - 2 * crossShrink(d, 'tidbit', false))) / L.speed; }
  function riverGap(L, rel) { return (LOOP / L.n - L.len) / Math.max(0.3, rel); }
  function laneSet(level, relaxed) {
    var d = crossDiff(level, relaxed), lanes = [], first = level === 1;
    var mixRoad = d >= 0.44, mixRiver = d >= 0.66;
    var d0 = first ? 1 : (Math.random() < 0.5 ? 1 : -1);
    var maxLen = d < 0.2 ? 1 : d < 0.5 ? 2 : 3;
    var kinds = Object.keys(ROADK).filter(function (k) { return ROADK[k] <= maxLen; });
    ROAD.forEach(function (R, i) {
      var k = first ? (i % 2 ? 'scooter' : 'bike') : pick(kinds);
      var L = { row: R.row, kind: k, len: ROADK[k], dir: mixRoad ? (Math.random() < 0.5 ? 1 : -1) : (i % 2 ? -d0 : d0),
        speed: lerp(0.95, 2.7, d) * (first ? 1 : rnd(0.88, 1.12)), n: Math.round(lerp(2, 4.6, d)) - (!first && Math.random() < 0.35 ? 1 : 0) };
      L.n = Math.max(2, L.n);
      // the check: fewer vehicles first, then a gentler speed, until the gap is wide enough
      while (L.n > 2 && roadGap(L, d) < roadWindow(d)) L.n--;
      while (roadGap(L, d) < roadWindow(d)) L.speed *= 0.92;
      lanes.push(L);
    });
    var r0 = first ? 1 : (Math.random() < 0.5 ? 1 : -1), below = null;
    // the river, nearest the bank first (row 5), so each lane can be checked against the one the pup hops from
    RIVER.slice().reverse().forEach(function (R, j) {
      var i = RIVER.length - 1 - j, pad = !first && Math.random() < lerp(0.15, 0.4, d);
      var L = { row: R.row, kind: pad ? 'pad' : 'log', dive: pad && d >= 0.33, dir: mixRiver ? (Math.random() < 0.5 ? 1 : -1) : (i % 2 ? -r0 : r0),
        len: pad ? (d < 0.6 ? 3 : 2) : clamp(Math.round(lerp(4.6, 2.4, d) + (first ? 0 : rnd(-0.5, 0.5))), 2, 5),
        speed: lerp(0.75, 1.9, d) * (first ? 1 : rnd(0.88, 1.12)), n: 3 };
      if (!first && d > 0.5 && Math.random() < 0.4) L.n = 4;
      // two lanes side by side going the same way must not keep pace with each other, or the pup could wait forever
      if (below && below.dir === L.dir && Math.abs(below.speed - L.speed) < 0.8) L.speed = below.speed + (L.speed >= below.speed ? 0.8 : -0.8);
      if (L.speed < 0.6) { L.speed = 0.6; if (below && below.dir === L.dir && Math.abs(below.speed - L.speed) < 0.8) L.dir = -L.dir; }
      // the check: a pad that dips needs a spare; then more logs or pads, then longer ones, until the wait is short enough
      function rel() { return !below ? L.speed : below.dir === L.dir ? Math.abs(L.speed - below.speed) : L.speed + below.speed; }
      var wait = riverWait(d) * (L.dive ? 0.75 : 1);
      while (riverGap(L, rel()) > wait && L.n < 5) L.n++;
      while (riverGap(L, rel()) > wait && L.len < Math.min(5, LOOP / L.n - 0.6)) L.len++;
      lanes.push(L); below = L;
    });
    return lanes.map(function (L) { L.period = LOOP / L.n; L.speed = +L.speed.toFixed(3); L.off = rnd(0, L.period); return L; });
  }
  function Cross(who) {
    var me = this; me.who = who; me.P = PUPS[who]; me.score = 0; me.level = 1; me.filled = []; me.cleared = false;
    sizeCanvas(COLS * TS, ROWS * TS);
    me.t = 0; me.fx = [];
    me.buildLevel(0);
    me.newPup();
  }
  // the lanes for this level, and a little "Level N" card when it starts (with "a bit faster now" when it is)
  Cross.prototype.buildLevel = function (prevD) {
    var me = this; me.d = crossDiff(me.level, S.relaxed); me.lanes = laneSet(me.level, S.relaxed);
    me.banner = levelBanner(me.level, me.d, prevD, me.lanes.some(function (L) { return L.dive; }) && !S.relaxed && !(me.prevDive) ? 'some lily pads dip now' : '');
    me.prevDive = me.lanes.some(function (L) { return L.dive; });
  };
  Cross.prototype.newPup = function () {
    this.pup = { x: 6, y: 12, hx: 6, hy: 12, hopT: 1, hopD: 0.1, face: 1, ph: 0, state: 'ok', stateT: 0, ride: null, maxRow: 12 };
  };
  // after a bump or a splash: on the early levels (and always in Relaxed pace) the pup starts again from the nearest
  // safe grass, the middle bank for the river and the grass by the road for the road, instead of all the way back
  Cross.prototype.bayTol = function () { return lerp(1.5, 0.5, this.d || 0); };
  Cross.prototype.soft = function () { return this.level <= 3 || S.relaxed; };
  Cross.prototype.respawn = function () {
    var me = this, p = me.pup, keep = p.maxRow;
    if (!me.soft()) { me.newPup(); return; }
    var row = p.y <= 5 ? 6 : 11, x = clamp(Math.round(p.x), 0, COLS - 1);
    me.newPup(); me.pup.x = me.pup.hx = x; me.pup.y = me.pup.hy = row; me.pup.maxRow = Math.min(keep, 12); me.pup.invul = 0.6;
  };
  // the lanes carry their own speed for the level (laneSet). Relaxed pace is a good deal slower here than elsewhere:
  // the lanes' clock (me.t) simply runs slower, so switching it on or off mid-level never makes anything jump
  Cross.prototype.pace = function () { return S.relaxed ? 0.62 : 1; };
  Cross.prototype.lvlMul = function () { return 1; };
  Cross.prototype.objX = function (L, i) {
    var raw = L.off + i * L.period + L.dir * L.speed * this.t;
    // a loop of LOOP (18) tiles: 5 off the left edge, the 13 on screen; nothing longer than 5 tiles, so a log or a bus
    // always wraps round fully out of sight instead of popping in or out at the edge
    var x = ((raw % LOOP) + LOOP) % LOOP - 5;
    return x;
  };
  Cross.prototype.diving = function (L, i) {
    if (!L.dive || S.relaxed || i === 0) return 0;   // in relaxed pace the lily pads never dip, and one pad in each lane never does
    var cyc = 9, ph = ((this.t + i * 2.3 + L.row) % cyc);
    if (ph > 5.2 && ph < 6.8) return 2; // under
    if (ph > 4.0 && ph <= 5.2) return 1; // warning wobble
    return 0;
  };
  Cross.prototype.platformAt = function (L, x) {
    var me = this;
    var e = lerp(-0.2, 0.08, me.d || 0);   // a generous edge on the early levels: a paw on the log is enough
    for (var i = 0; i < L.n; i++) { var ox = me.objX(L, i); if (x + 0.5 >= ox + e && x + 0.5 <= ox + L.len - e) return { i: i, ox: ox, under: me.diving(L, i) === 2 }; }
    return null;
  };
  Cross.prototype.onDir = function (dx, dy) {
    var p = this.pup; if (p.state !== 'ok') return;
    if (p.hopT < 1) { p.queue = [dx, dy]; return; }   // one extra hop can wait for the one in the air
    var nx = Math.round(p.x * 1) + dx, ny = p.y + dy;
    if (dx) nx = p.x + dx; else nx = p.x;
    if (ny < 0 || ny >= ROWS || nx < -0.5 || nx > COLS - 0.5) return;
    if (ny === 0) { // the doghouse row: only into an empty doghouse (the nearest one, and on the early levels it can be a little way off)
      var bay = -1, tol = this.bayTol(), bd = 1e9; BAYS.forEach(function (b, k) { var dd = Math.abs(nx - b); if (dd <= tol && dd < bd && this.filled.indexOf(k) < 0) { bay = k; bd = dd; } }, this);
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
  Cross.prototype.splash = function () { var me = this, p = me.pup; if (p.state !== 'ok') return; p.state = 'splash'; p.stateT = 0; p.ride = null; SFX.splash(); me.say('Splash! ' + me.P.name + ' is fine and a bit damp. ' + (me.soft() ? 'Back to the bank to try again.' : 'Back to the start.')); me.fx.push({ k: 'ring', x: p.x, y: p.y, t: 0 }); };
  Cross.prototype.oof = function () { var me = this, p = me.pup; if (p.state !== 'ok' || p.invul > 0) return; p.state = 'oof'; p.stateT = 0; p.ride = null; SFX.oof(); me.say('Oof! A little bump. ' + me.P.name + ' is fine. ' + (me.soft() ? 'Back to the grass to try again.' : 'Back to the start.')); };
  Cross.prototype.say = function (m) { say(m); };
  Cross.prototype.update = function (dt) {
    var me = this, p = me.pup; me.t += dt * me.pace();
    if (me.banner) { me.banner.t += dt; if (me.banner.t > 2.6) me.banner = null; }
    if (p.invul > 0) p.invul -= dt;
    if (p.state === 'oof' || p.state === 'splash') { p.stateT += dt; if (p.stateT > 0.9) me.respawn(); }
    else {
      if (p.hopT < 1) { p.hopT += dt / p.hopD; p.ph += dt * 24; if (p.hopT >= 1) me.land(); }
      else if (p.ride) {
        p.x += p.ride.dir * p.ride.speed * me.pace() * dt;
        if (p.x < -0.45 || p.x > COLS - 0.55) me.splash();
        else { var hit = me.platformAt(p.ride, p.x); if (!hit || hit.under) me.splash(); }
      }
      // traffic
      if (p.state === 'ok' && (p.y >= 7 && p.y <= 10 || (p.hopT < 1 && (p.hy >= 7 && p.hy <= 10 || p.ty >= 7 && p.ty <= 10)))) {
        var py = p.hopT < 1 ? (p.hy + (p.ty - p.hy) * p.hopT) : p.y, px = p.hopT < 1 ? (p.hx + (p.tx - p.hx) * p.hopT) : p.x;
        // a forgiving body on the early levels: the vehicle has to really be on the pup
        var shrink = crossShrink(me.d, who_(), S.relaxed), rowTol = lerp(0.45, 0.62, me.d);
        me.lanes.forEach(function (L) {
          if (L.kind === 'log' || L.kind === 'pad') return;
          if (Math.abs(py - L.row) > rowTol) return;
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
      paused = false; var prevD = me.d; me.level++; me.cleared = false; me.filled = []; me.buildLevel(prevD); me.newPup(); last = 0; say(me.banner.title + (me.banner.note ? ': ' + me.banner.note + '.' : '.'));
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
    drawBanner(g, me.banner, LW, 6 * S_ + S_ / 2 + 4);
  };

  /* ==================================================================================================
     THE TREAT TRAIL (in the spirit of the old wagon-trail journey games)
     Tidbit and Sugarfoot pack a little wagon and set off from Puddle Hollow for Starfall Hill. You choose
     the pace and the snack sizes, decide what to do at rivers and trading posts, and handle whatever the
     trail brings. Nobody gets hurt and there's no game over: run low on treats and you stop to forage, run
     low on energy and you rest. Every journey is different: new landmarks, new events, new weather.
     Choose with the buttons, the number keys, or up/down then right (or Enter).
     ================================================================================================== */
  var OW = 480, OH = 300, TRIP = 800;
  var PLACES = ['Clover Meadow', 'Lantern Bridge', 'Owl’s Hollow', 'Bluebell Creek', 'Mossy Mill', 'Snail’s Rest', 'Pinecone Pass', 'Honeybee Orchard', 'Frog Pond Ferry',
    'Windmill Rise', 'Old Oak Crossing', 'Teapot Rock', 'Firefly Fields', 'Pebble Beach', 'Sunflower Market', 'Whistling Woods', 'Duckling Dock', 'Moonlit Marsh'];
  var WEATHER = [['sunny', 'Sunny and warm'], ['breezy', 'A gentle breeze'], ['cloudy', 'Soft grey clouds'], ['rain', 'A light rain'], ['fog', 'A bit foggy']];
  var EVENTS = [
    { t: 'A berry patch by the path! Everyone fills up.', d: { treats: 18 } },
    { t: 'Tidbit has a case of the zoomies. Lots of running, not much traveling.', d: { miles: -15, joy: 2 } },
    { t: 'Sugarfoot’s paws are sore. You slow down and take it easy.', d: { energy: -8 } },
    { t: 'A wagon wheel goes wobbly.', fix: true },
    { t: 'A friendly hedgehog asks if you have a snack to spare.', share: true },
    { t: 'Fog rolls in and the trail is hard to see. You lose a little time finding it.', d: { miles: -20 } },
    { t: 'A tailwind! The wagon rolls along nicely.', d: { miles: 25 } },
    { t: 'Sugarfoot finds a shiny button in the grass.', d: { buttons: 3 } },
    { t: 'A rain shower. Everyone huddles under the wagon cover and tells jokes.', d: { energy: -4, joy: 1 } },
    { t: 'A snail on the path shares some news: the river ahead is low today.', d: { joy: 1 } },
    { t: 'Tidbit naps in a sunbeam and wakes up full of beans.', d: { energy: 10 } },
    { t: 'A tummy rumble! Somebody ate too many treats. Everyone rests a little.', d: { energy: -6, treats: -4 } },
    { t: 'Ducklings cross the trail in a line. You wait, and it’s worth it.', d: { miles: -5, joy: 2 } },
    { t: 'A squirrel trades you a sack of acorns for a song.', d: { treats: 10, joy: 1 } },
    { t: 'You find a shortcut along the creek.', d: { miles: 30 } },
    { t: 'The wagon cover rips a little in the wind. Sugarfoot patches it.', d: { energy: -3 } }
  ];
  function Trek(who) {
    var me = this; me.who = who; me.P = PUPS[who]; me.score = 0; me.level = 1; me.cleared = false;
    sizeCanvas(OW, OH); me.ui = null; me.mountUI(); me.newTrip();
  }
  Trek.prototype.newTrip = function () {
    var me = this, names = PLACES.slice();
    for (var i = names.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = names[i]; names[i] = names[j]; names[j] = x; }
    me.stops = [];
    var kinds = ['river', 'post', 'river', 'post', 'sight', 'river', 'post', 'sight'];
    for (var k = 0; k < 7; k++) me.stops.push({ at: Math.round((k + 1) * TRIP / 8 + (Math.random() - 0.5) * 50), name: names[k], kind: kinds[(k + me.level) % kinds.length] });
    me.next = 0; me.miles = 0; me.day = 1; me.treats = 120; me.energy = 90; me.buttons = 20; me.wheels = 1; me.joy = 0;
    me.pace = 'steady'; me.snack = 'regular'; me.wx = WEATHER[0]; me.roll = 0; me.moveT = 0; me.log = [];
    me.say('Day 1. Tidbit and Sugarfoot set off from Puddle Hollow for Starfall Hill, ' + TRIP + ' paw-miles away. Pack light, travel kind.');
    me.menu();
  };
  Trek.prototype.mountUI = function () {
    var me = this, wrap = $('ar-wrap'); if (!wrap) return;
    var old = wrap.querySelector('.ar-tui'); if (old) old.remove();
    var u = D.createElement('div'); u.className = 'ar-tui';
    u.innerHTML = '<p class="ar-tui-msg" aria-live="polite"></p><div class="ar-tui-ch" role="group" aria-label="What to do next"></div>';
    wrap.appendChild(u); me.ui = u; me.msgEl = u.querySelector('.ar-tui-msg'); me.chEl = u.querySelector('.ar-tui-ch');
    me.chEl.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b && !paused) me.choose(+b.getAttribute('data-i')); });
    me.sel = 0;
  };
  Trek.prototype.destroy = function () { if (this.ui) this.ui.remove(); this.ui = null; };
  // the trail's story is told once, in its own panel under the picture (not again in the status line)
  Trek.prototype.say = function (m) { if (this.msgEl) this.msgEl.textContent = m; else say(m); };
  Trek.prototype.ask = function (list) {
    var me = this; me.opts = list; me.sel = 0;
    me.chEl.innerHTML = list.map(function (o, i) { return '<button type="button" class="ar-btn' + (i === 0 ? ' is-main' : '') + '" data-i="' + i + '"><b>' + (i + 1) + '</b> ' + o[0] + '</button>'; }).join('');
  };
  Trek.prototype.mark = function () { Array.prototype.forEach.call(this.chEl.children, function (b, i) { b.classList.toggle('is-sel', i === this.sel); }, this); };
  Trek.prototype.choose = function (i) { var o = this.opts && this.opts[i]; if (!o || this.moveT > 0) return; SFX.hop(); o[1].call(this); };
  Trek.prototype.onDir = function (dx, dy) { if (!this.opts) return; if (dy) { this.sel = (this.sel + dy + this.opts.length) % this.opts.length; this.mark(); } else if (dx > 0) this.choose(this.sel); };
  Trek.prototype.onKey = function (k) { if (/^[1-9]$/.test(k)) { this.choose(+k - 1); return true; } if (k === 'Enter' || k === ' ') { this.choose(this.sel || 0); return true; } return false; };
  Trek.prototype.center = function () { return null; };
  Trek.prototype.clampAll = function () { var me = this; me.treats = Math.max(0, Math.round(me.treats)); me.energy = clamp(Math.round(me.energy), 0, 100); me.buttons = Math.max(0, me.buttons); me.miles = clamp(me.miles, 0, TRIP); };
  Trek.prototype.menu = function () {
    var me = this, nx = me.stops[me.next];
    me.ask([
      ['Keep traveling', function () { me.travel(); }],
      ['Rest for a day', function () { me.day++; me.energy += 22; me.treats -= me.eat(); me.clampAll(); me.say('Day ' + me.day + '. Everyone rests. Tidbit snores, Sugarfoot reads the map. Energy is back up.'); me.menu(); }],
      ['Forage for treats', function () { me.forage(); }],
      ['Change pace (now: ' + me.pace + ')', function () { me.ask([['Gentle: slow, saves energy', function () { me.pace = 'gentle'; me.say('A gentle pace. Plenty of time to sniff the flowers.'); me.menu(); }], ['Steady: a good balance', function () { me.pace = 'steady'; me.say('A steady pace. Paw after paw.'); me.menu(); }], ['Zoomy: fast, but tiring', function () { me.pace = 'zoomy'; me.say('Zoomy pace! Ears flapping in the wind.'); me.menu(); }]]); }],
      ['Snack size (now: ' + me.snack + ')', function () { me.ask([['Small snacks: treats last longer', function () { me.snack = 'small'; me.say('Small snacks. Everyone gets a little less, more often.'); me.menu(); }], ['Regular snacks', function () { me.snack = 'regular'; me.say('Regular snacks. Just right.'); me.menu(); }], ['Big snacks: more energy, more treats used', function () { me.snack = 'big'; me.say('Big snacks! Happy tummies, lighter treat bag.'); me.menu(); }]]); }]
    ]);
    if (nx && me.miles >= nx.at - 0.5) me.arrive();
  };
  Trek.prototype.eat = function () { return { small: 4, regular: 6, big: 9 }[this.snack]; };
  Trek.prototype.travel = function () {
    var me = this;
    me.day++; me.wx = WEATHER[Math.floor(Math.random() * WEATHER.length)];
    var sp = { gentle: 40, steady: 56, zoomy: 75 }[me.pace] * (me.wx[0] === 'rain' ? 0.75 : me.wx[0] === 'fog' ? 0.8 : 1) * (0.6 + me.energy / 250);
    var tired = { gentle: 3, steady: 6, zoomy: 11 }[me.pace] - (me.snack === 'big' ? 2 : me.snack === 'small' ? -1 : 0);
    var nx = me.stops[me.next], goal = nx ? nx.at : TRIP;
    me.fromMiles = me.miles; me.miles = Math.min(goal, me.miles + sp); me.energy -= tired; me.treats -= me.eat(); me.moveT = 1.1;
    var msg = 'Day ' + me.day + '. ' + me.wx[1] + '. You travel ' + Math.round(me.miles - me.fromMiles) + ' paw-miles.';
    if (Math.random() < 0.38) msg += ' ' + me.event();
    me.clampAll();
    if (me.treats <= 0) { me.day++; var f = 15 + Math.floor(Math.random() * 20); me.treats += f; me.energy -= 5; msg += ' The treat bag is empty! You stop for a day to forage and find ' + f + ' treats.'; }
    if (me.energy <= 0) { me.day += 2; me.energy = 45; msg += ' Everyone is worn out, so you rest for two days. Rest is part of the journey.'; }
    me.clampAll(); me.say(msg);
    if (me.miles >= TRIP) { me.finishTrip(); return; }
    if (nx && me.miles >= nx.at) { setTimeout(function () { if (me.ui) me.arrive(); }, 1100); me.ask([]); return; }
    me.menu();
  };
  Trek.prototype.event = function () {
    var me = this, e = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    if (e.fix) { if (me.wheels > 0) { me.wheels--; return e.t + ' You swap in the spare wheel.'; } me.day++; return e.t + ' No spare, so Sugarfoot spends a day fixing it with string and patience.'; }
    if (e.share) { if (me.treats > 20) { me.treats -= 6; me.joy += 3; me.score += 30; return e.t + ' Tidbit shares six treats. The hedgehog does a happy little spin.'; } return e.t + ' Your bag is light, so you share a song instead. The hedgehog loves it.'; }
    for (var k in e.d) me[k] += e.d[k];
    return e.t;
  };
  Trek.prototype.forage = function () {
    var me = this; me.day++; me.energy -= 6; var got = 12 + Math.floor(Math.random() * 26), what = ['apples', 'blackberries', 'crunchy carrots', 'acorns', 'wild strawberries', 'pumpkin seeds'][Math.floor(Math.random() * 6)];
    me.treats += got; me.score += 10; me.clampAll(); SFX.chomp();
    me.say('Day ' + me.day + '. ' + (me.who === 'tidbit' ? 'Tidbit' : 'Sugarfoot') + ' sniffs out ' + what + '. +' + got + ' treats for the bag.'); me.menu();
  };
  Trek.prototype.arrive = function () {
    var me = this, st = me.stops[me.next]; if (!st) return; me.next++; me.score += 50; SFX.bay();
    if (st.kind === 'river') {
      me.say('You reach ' + st.name + ', a river crossing. The water looks ' + (Math.random() < 0.5 ? 'low and slow.' : 'quick today.') + ' How will you cross?');
      me.ask([
        ['Wade across (free, a little splashy)', function () { if (Math.random() < 0.35) { var l = 6 + Math.floor(Math.random() * 10); me.treats -= l; me.clampAll(); SFX.splash(); me.say('Splash! A wave soaks the treat bag. You lose ' + l + ' treats, but everyone laughs.'); } else me.say('Paws wet, spirits high. You wade across just fine.'); me.menu(); }],
        ['Float the wagon (some energy)', function () { me.energy -= 8; me.clampAll(); me.say('Sugarfoot steers, Tidbit paddles. The wagon floats across like a little boat.'); me.menu(); }],
        ['Take the ferry (5 buttons)', function () { if (me.buttons >= 5) { me.buttons -= 5; me.say('The ferry frog takes your buttons and croaks you across. Smooth and dry.'); } else { me.say('Not enough buttons, so you wait a day for the river to calm, then wade across.'); me.day++; } me.menu(); }],
        ['Wait a day for calmer water', function () { me.day++; me.energy += 8; me.treats -= me.eat(); me.clampAll(); me.say('You wait by the bank. By morning the river is calm, and you cross easily.'); me.menu(); }]
      ]);
    } else if (st.kind === 'post') {
      me.say('You reach ' + st.name + ', a little trading post. You have ' + me.buttons + ' shiny buttons.');
      var shop = function () {
        me.ask([
          ['Buy 20 treats (4 buttons)', function () { if (me.buttons >= 4) { me.buttons -= 4; me.treats += 20; me.say('A fresh bag of treats! You have ' + me.buttons + ' buttons left.'); } else me.say('Not quite enough buttons for that.'); shop(); }],
          ['Buy a spare wheel (6 buttons)', function () { if (me.buttons >= 6) { me.buttons -= 6; me.wheels++; me.say('A spare wheel, strapped to the back. Just in case.'); } else me.say('Not quite enough buttons for that.'); shop(); }],
          ['Trade a song for 3 buttons', function () { me.buttons += 3; me.joy++; me.say('Tidbit howls, Sugarfoot hums. The shopkeeper claps and pays you in buttons.'); shop(); }],
          ['Back on the trail', function () { me.menu(); }]
        ]);
      };
      shop();
    } else {
      var sights = ['a view all the way to the sea', 'a giant tree with a door in it', 'a field of glowing fireflies', 'a waterfall shaped like a heart', 'a rock that looks exactly like a teapot'];
      me.energy += 6; me.joy += 2; me.clampAll();
      me.say('You reach ' + st.name + ' and stop to look at ' + sights[Math.floor(Math.random() * sights.length)] + '. Everyone feels a bit lighter.'); me.menu();
    }
  };
  Trek.prototype.finishTrip = function () {
    var me = this; me.cleared = true; me.ask([]);
    var bonus = Math.max(0, 600 - me.day * 12) + me.treats * 2 + me.energy * 3 + me.joy * 20 + me.buttons * 5;
    me.score += bonus; SFX.clear(); recordBest(); hud(); paused = true;
    var gift = rewardLevel('The Treat Trail · journey ' + me.level);
    overlay('You made it to Starfall Hill!', 'Day ' + me.day + '. Everyone arrives together, a little muddy and very happy. ' + nextLesson(), 'A new journey →',
      function () { paused = false; me.level++; me.cleared = false; me.newTrip(); last = 0; }, '+' + bonus + ' for treats, energy, kindness and buttons left' + (gift ? ' · ' + gift : ''));
  };
  Trek.prototype.update = function (dt) { if (this.moveT > 0) { this.moveT -= dt; this.roll += dt * 6; } };
  Trek.prototype.draw = function (t) {
    var me = this; g.setTransform(DPR, 0, 0, DPR, 0, 0);
    var wx = me.wx[0], sky = g.createLinearGradient(0, 0, 0, 170);
    sky.addColorStop(0, wx === 'rain' || wx === 'cloudy' ? '#AEB9C9' : wx === 'fog' ? '#D6DCE2' : '#9FD3F2'); sky.addColorStop(1, '#F1F6EE'); g.fillStyle = sky; g.fillRect(0, 0, OW, 170);
    if (wx === 'sunny' || wx === 'breezy') { g.fillStyle = '#FFE08A'; g.beginPath(); g.arc(410, 46, 22, 0, 7); g.fill(); }
    var scroll = (me.miles * 4 + (me.moveT > 0 ? 0 : 0)) % OW, pm = me.moveT > 0 ? (me.fromMiles + (me.miles - me.fromMiles) * (1 - me.moveT / 1.1)) : me.miles, sx = pm * 4;
    // hills and trees slide by as you travel
    g.fillStyle = '#9DC58A'; g.beginPath(); g.moveTo(0, 170); for (var x = 0; x <= OW; x += 20) g.lineTo(x, 140 + Math.sin((x + sx * 0.3) / 70) * 16); g.lineTo(OW, 200); g.lineTo(0, 200); g.fill();
    g.fillStyle = '#84B873'; g.fillRect(0, 170, OW, 130);
    for (var i = 0; i < 6; i++) { var tx = ((i * 97 - sx * 0.8) % (OW + 80) + OW + 80) % (OW + 80) - 40; g.fillStyle = '#5E9A5A'; g.beginPath(); g.arc(tx, 150, 16, 0, 7); g.arc(tx + 12, 156, 12, 0, 7); g.fill(); g.fillStyle = '#7A5636'; g.fillRect(tx + 3, 160, 5, 14); }
    // the trail
    g.fillStyle = '#D9C08F'; g.fillRect(0, 214, OW, 26); g.fillStyle = 'rgba(150,120,80,.35)'; for (var d = 0; d < 12; d++) { var dx2 = ((d * 53 - sx) % OW + OW) % OW; g.fillRect(dx2, 226, 14, 3); }
    if (wx === 'rain') { g.strokeStyle = 'rgba(80,110,160,.5)'; g.lineWidth = 1.2; for (var r = 0; r < 40; r++) { var rx = (r * 47 + t / 4) % OW, ry = (r * 31 + t / 2) % 200; g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - 3, ry + 8); g.stroke(); } }
    if (wx === 'fog') { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 100, OW, 140); }
    // the wagon, pulled by the pup you chose, with the other riding along
    var moving = me.moveT > 0, bob = moving ? Math.sin(t / 90) * 1.5 : 0, wxp = 230;
    g.fillStyle = '#F3EAD6'; g.beginPath(); g.moveTo(wxp - 50, 200 + bob); g.quadraticCurveTo(wxp - 50, 150 + bob, wxp, 148 + bob); g.quadraticCurveTo(wxp + 50, 150 + bob, wxp + 50, 200 + bob); g.closePath(); g.fill();
    g.strokeStyle = '#C9B48E'; g.lineWidth = 2; for (var h = -30; h <= 30; h += 20) { g.beginPath(); g.moveTo(wxp + h, 152 + bob); g.lineTo(wxp + h, 200 + bob); g.stroke(); }
    var other = me.who === 'tidbit' ? 'sugarfoot' : 'tidbit';
    drawPup(g, other, wxp - 4, 192 + bob, 0.55, 1, 0, false, t, 'sit');
    g.fillStyle = '#9B6B43'; g.fillRect(wxp - 56, 198 + bob, 112, 12);
    [wxp - 36, wxp + 36].forEach(function (cx) { g.strokeStyle = '#5A3A22'; g.lineWidth = 3; g.beginPath(); g.arc(cx, 216, 13, 0, 7); g.stroke(); for (var s = 0; s < 4; s++) { var a = s * Math.PI / 4 + me.roll; g.beginPath(); g.moveTo(cx, 216); g.lineTo(cx + Math.cos(a) * 13, 216 + Math.sin(a) * 13); g.stroke(); } });
    g.strokeStyle = '#7A5636'; g.lineWidth = 2; g.beginPath(); g.moveTo(wxp + 56, 206); g.lineTo(wxp + 92, 214); g.stroke();
    drawPup(g, me.who, wxp + 104, 234, 0.75, 1, t / 90, moving, t, moving ? 'run' : 'sit');
    // progress along the trail, with the stops
    g.fillStyle = 'rgba(30,24,50,.72)'; wallPath(g, 8, 8, OW - 16, 38, 10); g.fill();
    g.fillStyle = '#FFF6E0'; g.font = '600 11px Lora, Georgia, serif'; g.textAlign = 'left';
    g.fillText('Day ' + me.day + ' · ' + Math.round(me.miles) + ' / ' + TRIP + ' paw-miles · 🦴 ' + me.treats + ' · ⚡ ' + me.energy + '% · 🔘 ' + me.buttons + ' · 🛞 ' + me.wheels, 16, 23);
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(16, 32, OW - 32, 5); g.fillStyle = '#FFD66B'; g.fillRect(16, 32, (OW - 32) * pm / TRIP, 5);
    me.stops.forEach(function (st, i) { var px = 16 + (OW - 32) * st.at / TRIP; g.fillStyle = i < me.next ? '#FFD66B' : '#FFFFFF'; g.beginPath(); g.arc(px, 34.5, 3.2, 0, 7); g.fill(); });
    var nx = me.stops[me.next];
    g.fillStyle = 'rgba(30,24,50,.6)'; wallPath(g, 8, OH - 30, OW - 16, 22, 8); g.fill(); g.fillStyle = '#FFF6E0'; g.textAlign = 'center';
    g.fillText(nx ? 'Next: ' + nx.name + ' (' + { river: 'a river', post: 'a trading post', sight: 'a sight to see' }[nx.kind] + '), ' + Math.max(0, Math.round(nx.at - me.miles)) + ' paw-miles' : 'Next: Starfall Hill, ' + Math.round(TRIP - me.miles) + ' paw-miles', OW / 2, OH - 15);
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

  /* ==================================================================================================
     HOME RUN DERBY
     The pup picked on the menu bats and the other one pitches ("Swap roles" lets them change places). Ten
     pitches, each a touch quicker than the last. The pitcher names every pitch before the wind-up, and a ring
     in the pitch's colour closes on the plate: swing (a tap on the field, the big Swing button, or space) as it
     closes. Right on time is a home run; a little early is a grounder and a little late a pop fly; more than
     that is a foul; a miss is only a strike. A home run brings fireworks, confetti, a cheering crowd, the
     distance ("412 ft!"), a little dance and the ballpark organ. With reduced motion or "Keep the page still"
     the extras stay small: no fireworks, confetti or shake, and a calm crowd.
     ================================================================================================== */
  var DW = 440, DH = 520, MOUND = { x: 220, y: 356 }, HIT = { x: 224, y: 444 }, BAT = { x: 166, y: 478, s: 1.25 };
  var PITCH = {
    fast: { name: 'Fastball', cue: 'quick and straight', col: '#FF9F6E', time: 1.05 },
    change: { name: 'Changeup', cue: 'nice and slow', col: '#8EC5FF', time: 1.6 },
    curve: { name: 'Curveball', cue: 'it bends, so follow the ring', col: '#D2B0FF', time: 1.32 }
  };
  var DLINES = {
    fast: ['Here comes my fastball. Ready?', 'A quick one, pal! Watch the ring.', 'Zoom! You can do it.'],
    change: ['A nice slow one for you.', 'Easy does it. This one floats.', 'Slow and friendly, coming up.'],
    curve: ['This one bends. Follow the ring!', 'A little curve, just for you.', 'Watch it swoop!'],
    cheeky: ['Bet you can’t hit this one. (You probably can.)', 'I’m cheering for you, even while I pitch.', 'Don’t tell anyone, but I love it when you hit it far.', 'Ready, set, wag!'],
    hr: ['Wow! That one’s in orbit!', 'Nice hit! I’m a little proud of you.', 'Bye-bye, baseball!', 'The crowd loves you. So do I.'],
    hit: ['Good contact! The next one goes further.', 'Nice! You’re finding the timing.', 'Ooh, close to a big one.'],
    foul: ['Just outside the line. Next one!', 'Foul ball, but a good swing.', 'Almost! A tiny bit sooner or later.'],
    strike: ['So close! You’ll get the next one.', 'That’s okay. Watch the ring.', 'Shake it off. Here comes another.']
  };
  function calmMotion() { if (reduced) return true; try { return !!(window.TOLStill && window.TOLStill.chosen && window.TOLStill.chosen()); } catch (e) { return false; } }
  function otherPup(who) { return who === 'tidbit' ? 'sugarfoot' : 'tidbit'; }
  // easy first (a changeup, a gentle fastball, another changeup), a mix in the middle, a last quick one
  function derbyPlan() {
    var mid = ['fast', 'change', 'curve', 'fast', 'curve', 'change'];
    for (var i = mid.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = mid[i]; mid[i] = mid[j]; mid[j] = x; }
    return ['change', 'fast', 'change'].concat(mid, ['fast']);
  }
  function Derby(who) {
    var me = this; me.who = who; me.pit = otherPup(who); me.P = PUPS[who];
    me.score = 0; me.level = 1; me.n = 0; me.best = 0; me.log = []; me.plan = derbyPlan();
    sizeCanvas(DW, DH);
    me.t = 0; me.phase = 'intro'; me.pt = 0; me.trail = []; me.fw = []; me.conf = []; me.shake = 0; me.hype = 0.15;
    me.batT = -1; me.dance = 0; me.callout = null; me.bubble = null; me.hitB = null; me.calm = calmMotion();
    me.crowd = [];
    var cols = ['#F6A9C8', '#FFE08A', '#8EC5FF', '#A8D8C8', '#F2B6A0', '#C9A8E0', '#FFF6E0', '#9FD3A8'];
    [96, 122, 148].forEach(function (y, r) { for (var x = 8 + r * 5; x < DW; x += 15) me.crowd.push({ x: x + rnd(-2, 2), y: y + rnd(-2, 2), c: cols[Math.floor(Math.random() * cols.length)], ph: rnd(0, 6), dog: Math.random() < 0.35 }); });
    me.setPitch();
  }
  // the pitch about to come: how long it takes to reach the plate, and how wide each timing window is
  Derby.prototype.setPitch = function () {
    var me = this, k = Math.min(me.n, 9), f = k / 9, rx = S.relaxed ? 1.3 : 1;
    me.kind = me.plan[k]; me.pk = PITCH[me.kind];
    me.T = me.pk.time * lerp(1, 0.8, f) * (S.relaxed ? 1.2 : 1);
    me.win = [lerp(0.1, 0.062, f) * rx, lerp(0.2, 0.15, f) * rx, lerp(0.3, 0.24, f) * rx];
    me.bend = Math.random() < 0.5 ? 1 : -1; me.swung = false; me.res = null; me.hitB = null; me.trail = [];
    me.level = k + 1;
  };
  Derby.prototype.intro = function () {
    var me = this; paused = true; swingWait(true);
    overlay('Home Run Derby', me.P.name + ' bats and ' + PUPS[me.pit].name + ' pitches. Ten pitches. Swing as the ring closes on the plate: tap the field, press the big Swing button, or press space.', '⚾ Play ball', function () { paused = false; last = 0; me.begin(); }, 'Want the other pup to bat? Swap roles.', { label: '⇄ Swap roles', fn: function () { derbyAgain(true); } });
  };
  Derby.prototype.begin = function () { var me = this; swingWait(false); me.phase = 'ready'; me.pt = 0; me.talk(); SFX.charge(); me.hype = 0.6; };
  Derby.prototype.talk = function () {
    var me = this, pool = Math.random() < 0.3 ? DLINES.cheeky : DLINES[me.kind];
    me.bubble = { text: pick(pool), t: 0 };
    say('Pitch ' + (me.n + 1) + ' of 10: ' + me.pk.name + ', ' + me.pk.cue + '.');
  };
  Derby.prototype.react = function (kind) { this.bubble = { text: pick(DLINES[kind]), t: 0 }; };
  // test hook: a swing exactly e seconds early (minus) or late (plus), while the ball is on its way
  Derby.prototype.forceSwing = function (e) { var me = this; if (me.phase !== 'flight' || me.swung) return false; me.batT = 0; me.swung = true; me.pt = me.T + e; me.judge(e); return true; };
  Derby.prototype.onKey = function (k) { if (k === ' ' || k === 'Enter' || k === 'ArrowUp' || k === 'x' || k === 'X') { this.swing(); return true; } return false; };
  Derby.prototype.onTap = function () { this.swing(); };
  Derby.prototype.center = function () { return { x: HIT.x, y: HIT.y }; };
  // where the pitched ball is at u (0 at the pitcher's mouth, 1 at the plate)
  Derby.prototype.ballAt = function (u) {
    var me = this, x0 = MOUND.x - 22, y0 = MOUND.y - 30, e = Math.pow(Math.max(0, u), 1.25);
    var x = lerp(x0, HIT.x, u), y = lerp(y0, HIT.y, e), r = lerp(2.2, 6.4, Math.pow(Math.min(1, Math.max(0, u)), 1.6));
    if (u <= 1) {
      if (me.kind === 'fast') y -= 6 * Math.sin(Math.PI * u);
      else if (me.kind === 'change') y -= 18 * Math.sin(Math.PI * u);
      else { x += 34 * me.bend * Math.sin(Math.PI * u); y -= 8 * Math.sin(Math.PI * u); }
    } else { y += (u - 1) * 300; x += (u - 1) * 30; r = 6.4 + (u - 1) * 8; }
    return { x: x, y: y, r: r };
  };
  Derby.prototype.swing = function () {
    var me = this; if (me.phase === 'intro' || me.phase === 'done') return;
    if (me.batT >= 0 && me.batT < 0.5) return;
    me.batT = 0; SFX.whoosh(0.7);
    if (me.phase !== 'flight' || me.swung) { if (me.phase === 'ready' || me.phase === 'windup') say('Wait for the ball, then swing as the ring closes.'); return; }
    me.swung = true; me.judge(me.pt - me.T);
  };
  // e: how early (minus) or late (plus) the swing was, in seconds
  Derby.prototype.judge = function (e) {
    var me = this, a = Math.abs(e), W = me.win, b = me.ballAt(me.pt / me.T), q, dist, kind; me.lastE = e;
    if (a > W[2]) { me.whiff = true; return; }   // a miss: the ball sails on by and it's a strike
    if (a <= W[0]) {
      q = 1 - a / W[0]; kind = 'hr';
      dist = Math.round(365 + 85 * q + (me.kind === 'fast' ? 12 : me.kind === 'curve' ? 6 : 0) + rnd(0, 8));
      me.hitB = { kind: kind, x0: b.x, y0: b.y, x1: clamp(220 + (e < 0 ? -1 : 1) * rnd(10, 150) * (0.4 + (1 - q) * 0.6), 40, 400), y1: 124, H: 150, dur: me.calm ? 1.3 : 1.5, r1: 2.2, t: 0, dist: dist };
      if (!me.calm) me.shake = 0.35; me.hype = 1; SFX.crack(); SFX.cheer(true);
    } else if (a <= W[1]) {
      if (e < 0) { kind = 'ground'; dist = Math.round(rnd(70, 130)); me.hitB = { kind: kind, x0: b.x, y0: b.y, x1: 220 - rnd(30, 120), y1: 338, H: 0, dur: 1.0, r1: 3.6, t: 0, dist: dist }; }
      else { kind = 'pop'; dist = Math.round(rnd(150, 250)); me.hitB = { kind: kind, x0: b.x, y0: b.y, x1: 220 + rnd(-50, 60), y1: 300, H: 300, dur: 1.8, r1: 3.6, t: 0, dist: dist }; }
      SFX.crack(); SFX.cheer(false); me.hype = Math.max(me.hype, 0.5);
    } else {
      kind = 'foul'; var side = e < 0 ? -1 : 1;
      me.hitB = { kind: kind, x0: b.x, y0: b.y, x1: side < 0 ? -30 : DW + 30, y1: 236, H: 120, dur: 1.1, r1: 4, t: 0, dist: 0 };
      blip(700, 0.05, 'square', 0.03, 300);
    }
    me.res = kind; me.phase = 'hit'; me.pt = 0; me.trail = [];
  };
  Derby.prototype.result = function (kind, dist) {
    var me = this, logK = kind === 'ground' || kind === 'pop' ? 'hit' : kind;
    me.log.push({ k: logK, ft: dist || 0 });
    if (kind === 'hr') me.score++;
    if (dist && kind !== 'foul') me.best = Math.max(me.best, dist);
    var big = { hr: dist + ' ft!', ground: 'Grounder', pop: 'Pop fly', foul: 'Foul ball', strike: 'Strike' }[kind];
    var sub = { hr: 'Home run!', ground: dist + ' ft', pop: dist + ' ft', foul: 'Nearly!', strike: 'Next one!' }[kind];
    me.callout = { big: big, sub: sub, t: 0, hr: kind === 'hr' };
    me.react(logK === 'hit' ? 'hit' : kind);
    say(kind === 'hr' ? 'Home run! ' + dist + ' feet. ' + me.score + ' of 10 so far.' : kind === 'strike' ? 'Strike. That’s fine: watch the ring on the next one.' : kind === 'foul' ? 'Foul ball. A touch ' + (me.lastE < 0 ? 'later' : 'sooner') + ' next time.' : (kind === 'ground' ? 'A grounder, ' : 'A pop fly, ') + dist + ' feet. A touch ' + (kind === 'ground' ? 'later' : 'sooner') + ' for a home run.');
    me.phase = 'result'; me.pt = 0; me.resT = kind === 'hr' ? (me.calm ? 2.2 : 2.8) : kind === 'strike' ? 1.3 : 1.5;
    if (kind === 'hr') { me.dance = me.calm ? 0 : 2.4; me.celebrate(); }
    hud();
  };
  Derby.prototype.celebrate = function () {
    var me = this; SFX.charge();
    if (me.calm) return;
    var cols = ['#FFE08A', '#F6A9C8', '#8EC5FF', '#A8E6B8', '#FFB38A', '#D2B0FF'];
    for (var b = 0; b < 4; b++) me.fw.push({ x: rnd(70, DW - 70), y: rnd(36, 96), t: -b * 0.28, c: pick(cols), parts: null });
    for (var i = 0; i < 64; i++) me.conf.push({ x: rnd(0, DW), y: rnd(-80, -4), vx: rnd(-30, 30), vy: rnd(70, 150), r: rnd(0, 6), vr: rnd(-6, 6), c: pick(cols), t: 0 });
  };
  Derby.prototype.next = function () {
    var me = this; me.n++;
    if (me.n >= 10) { me.finish(); return; }
    me.setPitch(); me.phase = 'ready'; me.pt = 0; me.talk(); hud();
  };
  Derby.prototype.finish = function () {
    var me = this; me.phase = 'done'; me.level = 10; recordBest(); hud();
    var fk = 'derby-ft:' + me.who; if (me.best > (+S.best[fk] || 0)) { S.best[fk] = me.best; save(); }
    var hr = me.score, s = hr === 1 ? '' : 's';
    var title = hr >= 7 ? 'What a show!' : hr >= 4 ? 'Lovely swings!' : 'Derby done!';
    var gift = rewardLevel('Home Run Derby · ' + hr + ' home run' + s);
    paused = true; say('Derby done: ' + hr + ' home run' + s + ' out of 10.');
    overlay(title, (hr ? hr + ' home run' + s + ' out of 10. ' : 'No home runs this time, and every swing was good practice. ') + (me.best ? 'Longest hit: ' + me.best + ' ft. ' : '') + nextLesson(), '↻ Play again', function () { derbyAgain(false); },
      'Best with ' + me.P.name + ': ' + (+S.best['derby:' + me.who] || 0) + ' home runs, ' + (+S.best[fk] || 0) + ' ft' + (gift ? ' · ' + gift : ''),
      { label: '⇄ Swap roles: ' + PUPS[me.pit].name + ' bats', fn: function () { derbyAgain(true); } });
  };
  Derby.prototype.update = function (dt) {
    var me = this; me.t += dt; me.pt += dt;
    if (me.batT >= 0) { me.batT += dt; if (me.batT > 0.9) me.batT = -1; }
    if (me.shake > 0) me.shake = Math.max(0, me.shake - dt);
    if (me.dance > 0) me.dance = Math.max(0, me.dance - dt);
    me.hype = Math.max(0.15, me.hype - dt * 0.3);
    if (me.bubble) { me.bubble.t += dt; if (me.bubble.t > 3.2) me.bubble = null; }
    if (me.callout) { me.callout.t += dt; if (me.callout.t > 2.4) me.callout = null; }
    me.fw.forEach(function (f) {
      f.t += dt; if (f.t < 0) return;
      if (!f.parts) { f.parts = []; for (var i = 0; i < 24; i++) { var an = i / 24 * Math.PI * 2, sp = rnd(55, 95); f.parts.push({ x: f.x, y: f.y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp }); } blip(rnd(500, 800), 0.18, 'triangle', 0.02, 200); }
      f.parts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 50 * dt; p.vx *= 0.985; });
    });
    me.fw = me.fw.filter(function (f) { return f.t < 1.4; });
    me.conf.forEach(function (c) { c.t += dt; c.x += c.vx * dt + Math.sin(c.t * 3 + c.r) * 0.4; c.y += c.vy * dt; c.r += c.vr * dt; });
    me.conf = me.conf.filter(function (c) { return c.y < DH + 10 && c.t < 4; });
    var tl = me.calm ? 4 : 14;
    if (me.phase === 'ready') { if (me.pt > 1.15) { me.phase = 'windup'; me.pt = 0; } }
    else if (me.phase === 'windup') { if (me.pt > 0.85) { me.phase = 'flight'; me.pt = 0; SFX.whoosh(0.5); } }
    else if (me.phase === 'flight') {
      var u = me.pt / me.T, b = me.ballAt(u); me.trail.push(b); if (me.trail.length > tl) me.trail.shift();
      if (!me.res && u > 1 + me.win[2] / me.T) { me.res = 'strike'; SFX.mitt(); }
      if (u > 1.32) me.result('strike');
    } else if (me.phase === 'hit') {
      var h = me.hitB, s = Math.min(1, me.pt / h.dur), p = me.hitPos(s); me.trail.push(p); if (me.trail.length > tl) me.trail.shift();
      if (s >= 1) me.result(h.kind, h.dist);
    } else if (me.phase === 'result') { if (me.pt > me.resT) me.next(); }
  };
  Derby.prototype.hitPos = function (s) {
    var h = this.hitB, x = lerp(h.x0, h.x1, s), y = lerp(h.y0, h.y1, s) - h.H * Math.sin(Math.PI * s);
    if (h.kind === 'ground') y -= 12 * Math.abs(Math.sin(s * Math.PI * 3)) * (1 - s);
    if (h.kind === 'pop') y = lerp(h.y0, h.y1, s) - h.H * Math.sin(Math.PI * Math.min(1, s * 1.05));
    return { x: x, y: y, r: lerp(6, h.r1, s) };
  };
  // ---- drawing ----
  Derby.prototype.makeBg = function () {
    var c = D.createElement('canvas'); c.width = Math.round(DW * DPR); c.height = Math.round(DH * DPR);
    var x = c.getContext('2d'); x.scale(DPR, DPR); this.bgDPR = DPR;
    var sk = x.createLinearGradient(0, 0, 0, 190); sk.addColorStop(0, '#1E1A46'); sk.addColorStop(1, '#4A3F8C'); x.fillStyle = sk; x.fillRect(0, 0, DW, 190);
    x.fillStyle = 'rgba(255,246,224,.7)'; for (var i = 0; i < 28; i++) x.fillRect((i * 97) % DW + (i % 3) * 5, 8 + (i * 37) % 60, 1.6, 1.6);
    [[24, 1], [DW - 24, -1]].forEach(function (L) {
      var gl = x.createRadialGradient(L[0], 22, 2, L[0], 22, 70); gl.addColorStop(0, 'rgba(255,240,190,.45)'); gl.addColorStop(1, 'rgba(255,240,190,0)'); x.fillStyle = gl; x.fillRect(L[0] - 70, 0, 140, 100);
      x.fillStyle = '#2A2552'; x.fillRect(L[0] - 2, 26, 4, 60); rr(x, L[0] - 15, 14, 30, 13, 3, '#FFF3C4');
      x.fillStyle = 'rgba(200,180,120,.6)'; for (var k = 0; k < 3; k++) x.fillRect(L[0] - 12 + k * 9, 17, 6, 7);
    });
    x.fillStyle = '#2E2864'; x.fillRect(0, 80, DW, 100);
    x.fillStyle = 'rgba(255,255,255,.06)'; [104, 130, 156].forEach(function (y) { x.fillRect(0, y, DW, 3); });
    x.fillStyle = '#2F6B3E'; x.fillRect(0, 178, DW, 22); x.fillStyle = '#FFE08A'; x.fillRect(0, 178, DW, 2);
    x.fillStyle = '#FFF6E0'; x.font = '600 10px "IBM Plex Mono", monospace'; x.textAlign = 'center'; x.fillText('330', 46, 193); x.fillText('400', DW / 2, 193); x.fillText('330', DW - 46, 193);
    x.fillStyle = '#4F9A5A'; x.fillRect(0, 200, DW, DH - 200);
    x.fillStyle = 'rgba(255,255,255,.05)'; for (var y = 200; y < DH; y += 52) x.fillRect(0, y, DW, 26);
    x.fillStyle = '#C99A64'; x.beginPath(); x.moveTo(220, 300); x.quadraticCurveTo(334, 322, 356, 396); x.lineTo(220, 494); x.lineTo(84, 396); x.quadraticCurveTo(106, 322, 220, 300); x.fill();
    x.fillStyle = '#57A363'; x.beginPath(); x.moveTo(220, 340); x.lineTo(302, 396); x.lineTo(220, 446); x.lineTo(138, 396); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 2; x.beginPath(); x.moveTo(220, 458); x.lineTo(-10, 226); x.moveTo(220, 458); x.lineTo(DW + 10, 226); x.stroke();
    x.fillStyle = '#FFFFFF'; [[304, 396], [220, 332], [136, 396]].forEach(function (p) { x.save(); x.translate(p[0], p[1]); x.rotate(Math.PI / 4); x.fillRect(-4, -4, 8, 8); x.restore(); });
    x.fillStyle = '#C99A64'; x.beginPath(); x.ellipse(MOUND.x, MOUND.y + 2, 30, 10, 0, 0, 7); x.fill(); x.fillStyle = '#FFF6E0'; x.fillRect(MOUND.x - 8, MOUND.y - 1, 16, 3);
    x.fillStyle = '#FFFFFF'; x.beginPath(); x.moveTo(210, 450); x.lineTo(230, 450); x.lineTo(230, 455); x.lineTo(220, 461); x.lineTo(210, 455); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 1.5; x.strokeRect(182, 440, 24, 28); x.strokeRect(234, 440, 24, 28);
    x.textAlign = 'start';
    return c;
  };
  Derby.prototype.draw = function (t) {
    var me = this; g.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (!me.bg || me.bgDPR !== DPR) me.bg = me.makeBg();
    if (me.shake > 0) { var a = 7 * me.shake / 0.35; g.translate(rnd(-a, a), rnd(-a, a)); }
    g.fillStyle = '#1E1A46'; g.fillRect(-10, -10, DW + 20, DH + 20);
    g.drawImage(me.bg, 0, 0, DW, DH);
    // the crowd: little heads (some with dog ears) that bounce when they cheer
    var hype = me.calm ? Math.min(me.hype, 0.2) * 0.4 : me.hype;
    me.crowd.forEach(function (c) {
      var by = c.y - hype * Math.abs(Math.sin(t / 110 + c.ph)) * 7;
      if (hype > 0.45 && !me.calm) { g.strokeStyle = c.c; g.lineWidth = 2; g.beginPath(); g.moveTo(c.x - 4, by + 4); g.lineTo(c.x - 7, by - 6 - Math.sin(t / 90 + c.ph) * 2); g.moveTo(c.x + 4, by + 4); g.lineTo(c.x + 7, by - 6 - Math.cos(t / 90 + c.ph) * 2); g.stroke(); }
      g.fillStyle = c.c; g.beginPath(); g.arc(c.x, by, 5.2, 0, 7); g.fill();
      if (c.dog) { g.fillStyle = '#2A2540'; g.beginPath(); g.ellipse(c.x - 4.5, by - 1, 1.8, 3.4, 0.3, 0, 7); g.ellipse(c.x + 4.5, by - 1, 1.8, 3.4, -0.3, 0, 7); g.fill(); }
      g.fillStyle = 'rgba(40,30,60,.75)'; g.fillRect(c.x - 2.2, by - 1, 1.4, 1.4); g.fillRect(c.x + 0.8, by - 1, 1.4, 1.4);
    });
    // fireworks
    me.fw.forEach(function (f) {
      if (f.t < 0 || !f.parts) return; var al = Math.max(0, 1 - f.t / 1.4);
      g.fillStyle = f.c; g.globalAlpha = al; f.parts.forEach(function (p) { g.beginPath(); g.arc(p.x, p.y, 2, 0, 7); g.fill(); }); g.globalAlpha = 1;
    });
    me.drawBoard();
    // the pitch's name and colour, before and as it's thrown
    if (me.phase === 'ready' || me.phase === 'windup' || me.phase === 'flight') {
      var lab = 'Pitch ' + (me.n + 1) + ' · ' + me.pk.name + ': ' + me.pk.cue;
      g.font = '600 12px Lora, Georgia, serif'; var lw = g.measureText(lab).width + 28;
      g.fillStyle = 'rgba(20,16,44,.85)'; wallPath(g, DW / 2 - lw / 2, 62, lw, 24, 12); g.fill(); g.strokeStyle = me.pk.col; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = me.pk.col; g.beginPath(); g.arc(DW / 2 - lw / 2 + 12, 74, 4, 0, 7); g.fill();
      g.fillStyle = '#FFF6E0'; g.textAlign = 'center'; g.fillText(lab, DW / 2 + 5, 78); g.textAlign = 'start';
    }
    // the timing ring: it closes on the plate exactly when the ball arrives
    if (me.phase === 'windup' || me.phase === 'flight') {
      var u = me.phase === 'flight' ? me.pt / me.T : -0.25 + me.pt / 0.85 * 0.25 - 0.0001, close = clamp(1 - u, 0, 1.25);
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5; g.setLineDash([4, 4]); g.beginPath(); g.arc(HIT.x, HIT.y, 12, 0, 7); g.stroke(); g.setLineDash([]);
      if (u <= 1 + me.win[2] / me.T) {
        var near = Math.abs(u - 1) * me.T <= me.win[0];
        g.strokeStyle = near ? '#FFE08A' : me.pk.col; g.lineWidth = near ? 4 : 3; g.globalAlpha = me.phase === 'windup' ? 0.45 : 1;
        g.beginPath(); g.arc(HIT.x, HIT.y, 12 + 62 * Math.max(0, close), 0, 7); g.stroke(); g.globalAlpha = 1;
      }
    }
    me.drawPitcher(t);
    // the pitched ball, its shadow and its trail
    if (me.phase === 'flight') {
      var bu = me.pt / me.T, b = me.ballAt(bu);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(lerp(MOUND.x - 22, HIT.x, bu) + (me.kind === 'curve' && bu <= 1 ? 34 * me.bend * Math.sin(Math.PI * bu) : 0), lerp(MOUND.y, 466, Math.min(1.2, bu)), b.r, b.r * 0.4, 0, 0, 7); g.fill();
      me.drawTrail(me.pk.col); me.drawBall(b.x, b.y, b.r);
    }
    me.drawBatter(t);
    if (me.phase === 'hit' || (me.phase === 'result' && me.hitB && me.res !== 'strike')) {
      if (me.phase === 'hit') { var hp = me.hitPos(Math.min(1, me.pt / me.hitB.dur)); me.drawTrail(me.hitB.kind === 'hr' ? '#FFE08A' : '#FFF6E0'); me.drawBall(hp.x, hp.y, hp.r); }
      else if (me.hitB.kind === 'hr' && me.pt < 0.6) { g.strokeStyle = 'rgba(255,224,138,' + (1 - me.pt / 0.6) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(me.hitB.x1, me.hitB.y1, 4 + me.pt * 30, 0, 7); g.stroke(); }
    }
    // confetti
    me.conf.forEach(function (c) { g.save(); g.translate(c.x, c.y); g.rotate(c.r); g.fillStyle = c.c; g.fillRect(-3, -1.5, 6, 3); g.restore(); });
    me.drawCallout(); me.drawBubble();
    if (me.n < 2 && (me.phase === 'ready' || me.phase === 'windup')) { g.fillStyle = 'rgba(20,16,44,.6)'; wallPath(g, 70, DH - 30, DW - 140, 22, 10); g.fill(); g.fillStyle = '#FFF6E0'; g.font = '600 11px Lora, Georgia, serif'; g.textAlign = 'center'; g.fillText('Swing as the ring closes on the plate', DW / 2, DH - 15); g.textAlign = 'start'; }
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
  };
  Derby.prototype.drawBall = function (x, y, r) {
    g.fillStyle = '#FFFDF6'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    if (r > 3) { g.strokeStyle = '#E0525F'; g.lineWidth = Math.max(0.8, r * 0.16); g.beginPath(); g.arc(x - r * 0.9, y, r * 0.7, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(x + r * 0.9, y, r * 0.7, Math.PI - 0.9, Math.PI + 0.9); g.stroke(); }
  };
  Derby.prototype.drawTrail = function (col) {
    var tr = this.trail, n = tr.length; g.fillStyle = col;
    for (var i = 0; i < n - 1; i++) { var k = (i + 1) / n; g.globalAlpha = k * 0.45; g.beginPath(); g.arc(tr[i].x, tr[i].y, tr[i].r * (0.4 + k * 0.5), 0, 7); g.fill(); }
    g.globalAlpha = 1;
  };
  Derby.prototype.drawBoard = function () {
    var me = this, x = 64, w = DW - 128;
    g.fillStyle = '#14112C'; wallPath(g, x, 6, w, 50, 10); g.fill(); g.strokeStyle = '#FFE08A'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = '#FFE08A'; g.font = '700 18px "IBM Plex Mono", monospace'; g.fillText('HR ' + me.score + '/10', x + 12, 30);
    g.textAlign = 'right'; g.fillStyle = '#CFC3F0'; g.font = '600 10px "IBM Plex Mono", monospace'; g.fillText('LONGEST', x + w - 12, 20);
    g.fillStyle = '#FFF6E0'; g.font = '700 15px "IBM Plex Mono", monospace'; g.fillText(me.best ? me.best + ' ft' : '—', x + w - 12, 37); g.textAlign = 'start';
    for (var i = 0; i < 10; i++) {
      var L = me.log[i], cx = x + 18 + i * ((w - 36) / 9), cy = 47;
      g.fillStyle = !L ? (i === me.n && me.phase !== 'done' ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.16)') : L.k === 'hr' ? '#FFE08A' : L.k === 'hit' ? '#A8E6B8' : L.k === 'foul' ? '#CFC3F0' : '#F2B6A0';
      g.beginPath(); g.arc(cx, cy, 4, 0, 7); g.fill();
    }
  };
  Derby.prototype.drawPitcher = function (t) {
    var me = this, px = MOUND.x + 8, py = MOUND.y + 6, sc = 0.95, pose = 'sit', rot = 0, lift = 0, hold = false;
    if (me.phase === 'intro' || me.phase === 'ready') { hold = true; if (me.phase === 'ready' && me.pt > 0.9) { rot = (me.pt - 0.9) * 0.6; } }
    else if (me.phase === 'windup') { var k = me.pt / 0.85; hold = k < 0.75; if (k < 0.65) { rot = 0.1 + k * 0.3; lift = Math.sin(k / 0.65 * Math.PI / 2) * 8; } else { pose = 'bow'; rot = -0.1; } }
    else if (me.phase === 'flight' && me.pt < 0.3) pose = 'bow';
    else if (me.dance > 0 || (me.phase === 'result' && me.res === 'hr')) pose = me.calm ? 'sit' : 'wiggle';
    g.save(); g.translate(px, py - lift); g.rotate(rot);
    drawPup(g, me.pit, 0, 0, sc, -1, 0, false, t, pose);
    if (hold) me.drawBall(-31 * sc, (PUPS[me.pit].look === 'collar' ? -26 : -23.5) * sc, 3.4);
    g.restore();
  };
  Derby.prototype.drawBatter = function (t) {
    var me = this, s = BAT.s, x = BAT.x, y = BAT.y, face = 1, pose = 'run', hop = 0;
    if (me.dance > 0) { pose = 'wiggle'; hop = Math.abs(Math.sin(t / 120)) * 9; face = Math.floor(me.dance / 0.4) % 2 ? -1 : 1; }
    drawPup(g, me.who, x, y - hop, s, face, 0, false, t, pose);
    if (me.dance > 0) { // the bat is tossed up for joy
      g.save(); g.translate(x + 50, y - 70 - Math.sin(me.dance * 2.6) * 20); g.rotate(t / 160); me.drawBat(); g.restore(); return;
    }
    var my = (PUPS[me.who].look === 'collar' ? -26 : -23.5) * s, pvx = x + 32 * s, pvy = y + my, ang = -2.25, bt = me.batT;
    if (bt >= 0) {
      if (bt < 0.13) ang = lerp(-2.25, 0.9, 1 - Math.pow(1 - bt / 0.13, 2));
      else if (bt < 0.45) ang = lerp(0.9, 1.5, (bt - 0.13) / 0.32);
      else ang = lerp(1.5, -2.25, (bt - 0.45) / 0.45);
      if (bt < 0.2 && !me.calm) { g.fillStyle = 'rgba(255,246,224,.22)'; g.beginPath(); g.moveTo(pvx, pvy); g.arc(pvx, pvy, 52, -2.25, ang); g.closePath(); g.fill(); }
    }
    g.save(); g.translate(pvx, pvy); g.rotate(ang); me.drawBat(); g.restore();
  };
  Derby.prototype.drawBat = function () {
    g.fillStyle = '#D9A066'; g.beginPath(); g.moveTo(0, -1.8); g.lineTo(34, -3.6); g.quadraticCurveTo(50, -4, 50, 0); g.quadraticCurveTo(50, 4, 34, 3.6); g.lineTo(0, 1.8); g.closePath(); g.fill();
    g.fillStyle = '#7A4A2A'; g.fillRect(-2, -2, 12, 4); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(18, -2.4, 26, 1.2);
  };
  Derby.prototype.drawCallout = function () {
    var c = this.callout; if (!c) return;
    var a = Math.max(0, Math.min(1, (2.4 - c.t) / 0.4)), pop = this.calm ? 1 : 1 + 0.45 * Math.max(0, 1 - c.t / 0.22);
    g.save(); g.globalAlpha = a; g.translate(DW / 2, 224); g.scale(pop, pop); g.textAlign = 'center';
    g.font = '700 ' + (c.hr ? 42 : 30) + 'px Fraunces, Georgia, serif'; g.lineWidth = 6; g.strokeStyle = 'rgba(20,16,44,.85)'; g.strokeText(c.big, 0, 0);
    g.fillStyle = c.hr ? '#FFE08A' : '#FFF6E0'; g.fillText(c.big, 0, 0);
    g.font = '600 15px Lora, Georgia, serif'; g.lineWidth = 4; g.strokeText(c.sub, 0, 24); g.fillStyle = '#FFF6E0'; g.fillText(c.sub, 0, 24);
    g.restore(); g.textAlign = 'start';
  };
  Derby.prototype.drawBubble = function () {
    var b = this.bubble; if (!b) return;
    var a = Math.max(0, Math.min(1, b.t / 0.2, (3.2 - b.t) / 0.4)); if (a <= 0) return;
    g.save(); g.globalAlpha = a; g.font = '600 12px Lora, Georgia, serif';
    var words = b.text.split(' '), lines = [], cur = '';
    words.forEach(function (w) { var tst = cur ? cur + ' ' + w : w; if (g.measureText(tst).width > 170 && cur) { lines.push(cur); cur = w; } else cur = tst; }); if (cur) lines.push(cur);
    var bw = 0; lines.forEach(function (l) { bw = Math.max(bw, g.measureText(l).width); }); bw += 20;
    var bh = lines.length * 15 + 12, bx = Math.min(DW - bw - 8, MOUND.x + 26), by = MOUND.y - 56 - bh;
    g.fillStyle = '#FFF8EC'; wallPath(g, bx, by, bw, bh, 10); g.fill();
    g.beginPath(); g.moveTo(bx + 14, by + bh - 1); g.lineTo(MOUND.x + 4, MOUND.y - 46); g.lineTo(bx + 28, by + bh - 1); g.fill();
    g.fillStyle = '#2B2140'; lines.forEach(function (l, i) { g.fillText(l, bx + 10, by + 18 + i * 15); });
    g.restore();
  };
  // Play again, or swap roles (the pitcher bats): straight back to the first pitch
  function derbyAgain(swap) {
    if (!game || !(game instanceof Derby)) return;
    recordBest();
    if (swap) { S.pup = otherPup(game.who); save(); drawBadge(); $('ar-pupname').textContent = ' · playing as ' + PUPS[S.pup].name; var pr = D.querySelector('input[name="ar-pup"][value="' + S.pup + '"]'); if (pr) pr.checked = true; }
    game = new Derby(S.pup); paused = false; last = 0; tAll = 0; $('ar-overlay').hidden = true; $('ar-pause').textContent = '⏸ Pause';
    game.begin(); game.draw(0); hud();
    if (swap) say(PUPS[S.pup].name + ' bats now, and ' + PUPS[game.pit].name + ' pitches. Pitch 1 of 10: ' + game.pk.name + ', ' + game.pk.cue + '.');
    try { $('ar-wrap').focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }

  // every game in the arcade
  var GAMES = {
    chase: { name: 'Treat Chase', make: function (w) { return new Chase(w); }, hint: 'Gather every treat. Golden hearts turn the Static into bubbles you can pop.', keys: 'udlr', help: 'Move with the arrow keys or WASD, a swipe, a tap on the field, or the big arrows. A turn you press a little early is remembered. P pauses, M mutes.' },
    cross: { name: 'Cross the Way', make: function (w) { return new Cross(w); }, hint: 'Hop over the road, ride the logs and lily pads, and reach the five doghouses.', keys: 'udlr', help: 'One hop per press: the arrow keys or WASD, a swipe, a tap on the field, or the big arrows. One extra hop can wait while a hop is in the air. P pauses, M mutes.' },
    trail: { name: 'The Treat Trail', make: function (w) { return new Trek(w); }, hint: 'Lead the wagon from Puddle Hollow to Starfall Hill: choose your pace and snacks, cross the rivers, trade at the posts. Nobody gets hurt.', keys: '', help: 'Tap a choice under the picture, or press 1 to 5. Up and down pick a choice, Enter takes it. P pauses, M mutes.' },
    bricks: { name: 'Bubble Break', make: function (w) { return new Bricks(w); }, hint: 'Bounce the bubble into the Static. Up or a tap above the pup sends it off; a miss just floats back.', keys: 'lur', up: 'Send the bubble', help: 'Left and right (or drag along the field) move the cushion; up or a tap above the pup sends the bubble. P pauses, M mutes.' },
    shower: { name: 'Treat Shower', make: function (w) { return new Catch(w); }, hint: 'Catch the treats in the basket. A raindrop is only a little drip on the nose.', keys: 'lr', help: 'Left and right, or drag along the field, move the basket. P pauses, M mutes.' },
    derby: { name: 'Home Run Derby', make: function (w) { return new Derby(w); }, hint: 'Ten pitches. Swing as the ring closes on the plate: right on time is a home run.', keys: '', swing: true, labels: ['Home runs', 'Pitch', 'Best'],
      aria: 'Home Run Derby game. Press space, Enter or up to swing, P to pause, M for sound.', help: 'Swing with a tap on the field, the big Swing button, or space (Enter and up work too) as the ring closes on the plate. P pauses, M mutes.' }
  };

  /* ---------- the menu and the stage ---------- */
  function start() {
    if (!window.TOLPups) { say('The pups are still warming up. Try again in a moment.'); return; }
    ac(); // the sound is created here, on the player's own tap
    cv = $('ar-cv'); g = cv.getContext('2d');
    $('ar-select').hidden = true; $('ar-stage').hidden = false;
    if (!GAMES[S.game]) S.game = 'chase';
    if (game && game.destroy) game.destroy();
    game = GAMES[S.game].make(S.pup);
    paused = false; running = true; tAll = 0; $('ar-overlay').hidden = true; $('ar-pause').textContent = '⏸ Pause';
    $('ar-title').textContent = GAMES[S.game].name;
    $('ar-pupname').textContent = ' · playing as ' + PUPS[S.pup].name;
    var wrap = $('ar-wrap'); wrap.setAttribute('aria-label', GAMES[S.game].aria || GAMES[S.game].name + ' game. Use the arrow keys or WASD to move, P to pause, M for sound.');
    setControls(GAMES[S.game]); hudLabels(GAMES[S.game].labels);
    drawBadge(); hud(); game.draw(0);
    say(GAMES[S.game].hint);
    gaming(true); fitStage();
    startLoop(); try { wrap.focus({ preventScroll: true }); } catch (e) { wrap.focus(); }
    showStage();
    if (game.intro) game.intro();
  }
  // tools16: while the Derby's "Play ball" card is up, the big Swing button says so (it does nothing until then)
  function swingWait(on) {
    var sw = $('ar-swing'); if (!sw) return;
    sw.classList.toggle('is-wait', !!on);
    if (on) sw.setAttribute('aria-disabled', 'true'); else sw.removeAttribute('aria-disabled');
    sw.innerHTML = on ? '&#9918; Tap “Play ball” first' : '&#9918; Swing!';
  }
  function swingNudge() {
    say('Tap Play ball to start. Then swing.');
    var go = $('ar-ov-go'); if (!go || $('ar-overlay').hidden) return;
    try { go.focus({ preventScroll: true }); } catch (e) { go.focus(); }
    if (!reduced) { go.classList.remove('is-nudge'); void go.offsetWidth; go.classList.add('is-nudge'); }
  }
  // game mode: the site's floating pills step aside while a game is on (site.css, body.tol-gaming)
  function gaming(on) { if (D.body) D.body.classList.toggle('tol-gaming', !!on); }
  // only the on-screen arrows this game uses, and its own short how-to
  function setControls(G) {
    var keys = G.keys || '', pad = $('ar-dpad');
    if (pad) {
      pad.hidden = !keys; pad.setAttribute('data-keys', keys);
      [['up', 'u'], ['left', 'l'], ['down', 'd'], ['right', 'r']].forEach(function (k) { var b = $('ar-d-' + k[0]); if (b) b.hidden = keys.indexOf(k[1]) < 0; });
      var up = $('ar-d-up'); if (up) up.setAttribute('aria-label', G.up || 'Up');
      pad.setAttribute('aria-label', keys === 'lr' || keys === 'lur' ? 'Move left and right: on-screen arrows (hold one to keep going)' : 'Move: on-screen arrows (hold one to keep going)');
    }
    var sw = $('ar-swing'); if (sw) sw.hidden = !G.swing;
    var h = $('ar-help'); if (h && G.help) h.textContent = G.help;
  }
  // the site header stays at the top of the screen; the game sits just under it
  function headerH() { var b = D.querySelector('.tol-bar'); if (!b) return 0; var cs = getComputedStyle(b); if (cs.position !== 'sticky' && cs.position !== 'fixed') return 0; var r = b.getBoundingClientRect(); return r.bottom > 0 ? r.height : 0; }
  // size the playfield so the field and its controls fit on one screen (portrait: stacked; landscape touch: side by side)
  function fitStage() {
    var stage = $('ar-stage'), play = $('ar-play'), wrap = $('ar-wrap'), side = $('ar-side');
    if (!stage || stage.hidden || !play || !wrap || !cv || !LW) return;
    var vh = window.innerHeight || D.documentElement.clientHeight, avail = vh - headerH() - 10;
    for (var pass = 0; pass < 2; pass++) {
      var cs = getComputedStyle(play), row = cs.display === 'flex' && cs.flexDirection === 'row';
      var pw = play.clientWidth, gap = parseFloat(cs.columnGap) || 0;
      var maxW = row ? pw - (side ? side.offsetWidth : 0) - gap : pw;
      var st = stage.getBoundingClientRect(), extra = wrap.offsetHeight - cv.offsetHeight, padB = parseFloat(getComputedStyle(stage).paddingBottom) || 0, other;
      if (row) other = (play.getBoundingClientRect().top - st.top) + extra + padB;
      else { var btns = $('ar-btns'), last = btns ? btns.getBoundingClientRect().bottom : st.bottom; other = (last - st.top) - cv.offsetHeight + padB; }
      var w = Math.min(maxW, 760, (avail - other) * LW / LH);
      w = Math.max(w, Math.min(maxW, row ? 240 : 360));   // a phone keeps a full-width field (its buttons may sit just below)
      wrap.style.width = Math.floor(w) + 'px';
    }
  }
  function showStage() {
    var stage = $('ar-stage'); if (!stage) return;
    var top = stage.getBoundingClientRect().top + (window.pageYOffset || 0) - headerH() - 6;
    try { window.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' }); } catch (e) { window.scrollTo(0, Math.max(0, top)); }
  }
  var fitT = 0;
  function onResize() { clearTimeout(fitT); fitT = setTimeout(function () { if (running) fitStage(); }, 120); }
  function backToMenu() {
    recordBest(); running = false; paused = false; if (game && game.destroy) game.destroy(); game = null; stopLoop(); gaming(false);
    $('ar-overlay').hidden = true; $('ar-stage').hidden = true; $('ar-select').hidden = false; $('ar-wrap').style.width = '';
    try { $('ar-select').scrollIntoView({ block: 'start' }); } catch (e) { /* ignore */ }
    var f = D.querySelector('input[name="ar-game"]:checked'); if (f) f.focus();
    refreshBest();
  }
  // the Start button names the chosen game, and comes into view as soon as a game is picked
  function startLabel() {
    var b = $('ar-start'); if (b && GAMES[S.game]) b.textContent = '▶ Start ' + GAMES[S.game].name;
    // tools16: the Start at the top of the picker says the pup too, since the cards below may be off screen
    var t = $('ar-start-top'); if (t && GAMES[S.game] && PUPS[S.pup]) t.textContent = '▶ Start ' + GAMES[S.game].name + ' as ' + PUPS[S.pup].name;
  }
  function revealStart() {
    var row = $('ar-go-row'), b = $('ar-start'); if (!row || !b) return;
    var r = b.getBoundingClientRect(), vh = window.innerHeight || 0, stuck = getComputedStyle(row).position === 'sticky';
    // a sticky Start is already on screen; otherwise bring it up above the floating pills at the bottom
    if (r.top < headerH() || r.bottom > vh - (stuck ? 0 : 90)) { try { row.scrollIntoView({ block: 'end', behavior: reduced ? 'auto' : 'smooth' }); } catch (e) { row.scrollIntoView(false); } }
    if (!reduced) { b.classList.remove('is-nudge'); void b.offsetWidth; b.classList.add('is-nudge'); }
  }
  function restart() { recordBest(); if (!game) return; if (game.destroy) game.destroy(); game = GAMES[S.game].make(S.pup); paused = false; $('ar-overlay').hidden = true; $('ar-pause').textContent = '⏸ Pause'; tAll = 0; last = 0; game.draw(0); hud(); say('A fresh start.'); fitStage(); if (game.intro) game.intro(); }
  function drawBadge() {
    var c = $('ar-who'); if (!c || !window.TOLPups) return; var x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
    drawPupOn(x, S.pup, 24, 50, 0.85);
  }
  function drawPupOn(x, who, px, py, sc) { var L = window.TOLPups.looks[PUPS[who].look]; x.save(); x.translate(px, py); x.scale(sc, sc); try { window.TOLPups.draw(x, L, 'sit', 0, 0.2, false, 0, 0); } catch (e) { /* ignore */ } x.restore(); }
  function refreshBest() {
    Object.keys(GAMES).forEach(function (gm) {
      var el = $('ar-best-' + gm); if (!el) return; var a = +S.best[gm + ':tidbit'] || 0, b = +S.best[gm + ':sugarfoot'] || 0;
      if (gm === 'derby') { var fa = +S.best['derby-ft:tidbit'] || 0, fb = +S.best['derby-ft:sugarfoot'] || 0;
        el.textContent = (fa || fb) ? 'Most home runs: Tidbit ' + a + (fa ? ' (' + fa + ' ft)' : '') + ', Sugarfoot ' + b + (fb ? ' (' + fb + ' ft)' : '') : 'Your best: none yet'; return; }
      el.textContent = (a || b) ? 'Best so far: Tidbit ' + a + ', Sugarfoot ' + b : 'Your best: none yet';
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
    if (T3) { var z = T3.getContext('2d'); z.fillStyle = '#9FD3F2'; z.fillRect(0, 0, T3.width, 50); z.fillStyle = '#84B873'; z.fillRect(0, 50, T3.width, 40); z.fillStyle = '#D9C08F'; z.fillRect(0, 62, T3.width, 10); z.fillStyle = '#F3EAD6'; z.beginPath(); z.moveTo(30, 60); z.quadraticCurveTo(30, 36, 50, 35); z.quadraticCurveTo(70, 36, 70, 60); z.fill(); z.fillStyle = '#9B6B43'; z.fillRect(28, 58, 44, 5); z.strokeStyle = '#5A3A22'; z.lineWidth = 2; z.beginPath(); z.arc(38, 66, 5, 0, 7); z.moveTo(67, 66); z.arc(62, 66, 5, 0, 7); z.stroke(); drawPupOn(z, 'tidbit', 92, 72, 0.38); }
    if (T4) { var w4 = T4.getContext('2d'); w4.fillStyle = '#2B2560'; w4.fillRect(0, 0, T4.width, T4.height); for (var bi = 0; bi < 5; bi++) for (var bj = 0; bj < 2; bj++) rr(w4, 6 + bi * 22, 8 + bj * 12, 19, 9, 3, 'hsl(' + (bi * 50 + bj * 30) + ',70%,72%)'); w4.fillStyle = 'rgba(180,225,255,.8)'; w4.beginPath(); w4.arc(70, 46, 4, 0, 7); w4.fill(); rr(w4, 38, 68, 44, 7, 3, '#FFF3D6'); }
    var T6 = $('ar-prev-derby');
    if (T6) { var w6 = T6.getContext('2d'); w6.fillStyle = '#2E2864'; w6.fillRect(0, 0, T6.width, 34); w6.fillStyle = '#2F6B3E'; w6.fillRect(0, 30, T6.width, 6); w6.fillStyle = '#4F9A5A'; w6.fillRect(0, 36, T6.width, 54);
      ['#F6A9C8', '#FFE08A', '#8EC5FF', '#A8D8C8'].forEach(function (c, i) { w6.fillStyle = c; for (var k = 0; k < 6; k++) { w6.beginPath(); w6.arc(8 + k * 20 + i * 5, 10 + (i % 2) * 9, 3, 0, 7); w6.fill(); } });
      w6.fillStyle = '#C99A64'; w6.beginPath(); w6.moveTo(60, 48); w6.lineTo(92, 68); w6.lineTo(60, 90); w6.lineTo(28, 68); w6.closePath(); w6.fill();
      w6.strokeStyle = 'rgba(255,224,138,.8)'; w6.setLineDash([3, 3]); w6.lineWidth = 1.5; w6.beginPath(); w6.moveTo(66, 74); w6.quadraticCurveTo(84, 6, 104, 20); w6.stroke(); w6.setLineDash([]);
      w6.fillStyle = '#FFFDF6'; w6.beginPath(); w6.arc(104, 20, 3.4, 0, 7); w6.fill(); drawPupOn(w6, 'tidbit', 40, 86, 0.36); }
    if (T5) { var w5 = T5.getContext('2d'); w5.fillStyle = '#BFE3F7'; w5.fillRect(0, 0, T5.width, T5.height); w5.fillStyle = '#fff'; w5.beginPath(); w5.arc(50, 16, 10, 0, 7); w5.arc(64, 12, 12, 0, 7); w5.arc(78, 16, 10, 0, 7); w5.fill(); heart(w5, 40, 42, 5, '#FF8FA3'); w5.fillStyle = '#F7E3B5'; w5.fillRect(70, 36, 12, 5); rr(w5, 44, 64, 34, 9, 4, '#C98B4F'); drawPupOn(w5, 'sugarfoot', 61, 86, 0.32); }
  }
  function init() {
    if (!$('ar-select')) return;
    // restore choices
    var pr = D.querySelector('input[name="ar-pup"][value="' + S.pup + '"]'); if (pr) pr.checked = true;
    var gr = D.querySelector('input[name="ar-game"][value="' + S.game + '"]'); if (gr) gr.checked = true;
    Array.prototype.forEach.call(D.querySelectorAll('input[name="ar-pup"]'), function (i) { i.addEventListener('change', function () { S.pup = i.value; save(); startLabel(); }); });
    Array.prototype.forEach.call(D.querySelectorAll('input[name="ar-game"]'), function (i) { i.addEventListener('change', function () { S.game = i.value; save(); startLabel(); }); i.addEventListener('click', function () { setTimeout(revealStart, 0); }); });
    startLabel();
    var sr = $('ar-sel-relaxed'), ss = $('ar-sel-sound');
    if (sr) sr.addEventListener('change', function () { S.relaxed = sr.checked; save(); syncToggles(); });
    if (ss) ss.addEventListener('change', function () { S.sound = ss.checked; save(); syncToggles(); });
    $('ar-start').addEventListener('click', start);
    var st0 = $('ar-start-top'); if (st0) st0.addEventListener('click', start);
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
    var sw = $('ar-swing');
    if (sw) {   // the big Swing button: it swings the moment it's pressed (a keyboard press arrives as a click)
      sw.addEventListener('pointerdown', function (e) { if (sw.classList.contains('is-wait')) { e.preventDefault(); swingNudge(); return; } if (!running || paused || !game || !game.swing) return; e.preventDefault(); game.swing(); });
      sw.addEventListener('click', function (e) { if (e.detail === 0 && sw.classList.contains('is-wait')) { swingNudge(); return; } if (e.detail === 0 && running && !paused && game && game.swing) game.swing(); });
    }
    // /frequency-journey.html#derby opens the menu with the Home Run Derby picked
    if (location.hash === '#derby') { S.game = 'derby'; var dr = D.querySelector('input[name="ar-game"][value="derby"]'); if (dr) dr.checked = true; startLabel(); }
    D.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize); window.addEventListener('orientationchange', onResize);
    var wrap = $('ar-wrap'); wrap.addEventListener('pointerdown', onPointerDown); wrap.addEventListener('pointermove', onPointerMove); wrap.addEventListener('pointerup', onPointerUp); wrap.addEventListener('pointercancel', function () { ptr = null; });
    syncToggles(); refreshBest();
    // tools16: someone who came here from another game's row of tabs lands on the game picker, not the page's opening
    try {
      var ref = D.referrer ? new URL(D.referrer) : null;
      if (!location.hash && ref && ref.origin === location.origin && /^\/(pause-and-play|coin-pusher|word-bloom|quiet-words|quiet-crossword|daily-ledger-crossword|recheck-drive|bears-dojo|frequency-buddies-music-video-maker|night-garden)\.html$/.test(ref.pathname)) {
        var toPicker = function () { var sel = $('ar-select'); if (!sel || sel.hidden) return; var top = sel.getBoundingClientRect().top + (window.pageYOffset || 0) - headerH() - 6; window.scrollTo(0, Math.max(0, top)); };
        toPicker(); setTimeout(toPicker, 300);
      }
    } catch (e) { /* ignore */ }
    var go = function () { previews(); };
    if (window.TOLPups) go(); else window.addEventListener('load', go);
  }
  window.TOLArcade = {
    state: function () { return game ? { game: S.game, pup: S.pup, score: game.score, level: game.level, treats: game.treats, filled: game.filled && game.filled.length, paused: paused, running: running, x: game.pup && game.pup.x, y: game.pup && game.pup.y, phase: game.phase, pitch: game.n, log: game.log, longest: game.best } : { running: false }; },
    _game: function () { return game; }, _set: function (k, v) { S[k] = v; },
    _lanes: function (level, relaxed) { return laneSet(level, !!relaxed); }, _crossDiff: crossDiff, _shrink: crossShrink
  };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();
})();
