/* pals-cam-acts.js — the things Tidbit and Sugarfoot get up to on the pal cam (pals-cam.js).
   To add one, push another entry: every activity is a small script with a start, a middle and a
   punchline, written as a pure function of its own clock A.t (milliseconds), so it can never pile
   up or get stuck.

   { id, name (for the tally), kind: 'silly' | 'sweet' | 'cool' | 'surprising', time: 'day' | 'night' (optional),
     dur (ms), cap (the caption), punch: [ms, 'second line'] (optional),
     at(A) -> [tidbitX, sugarfootX] (optional start spots; default A.x0 and A.x1),
     run(A, T, S)  sets each pal's pose for this moment: x, lift, face (+1 right), pose ('sit' 'run' 'bow' 'lie' 'wiggle'),
                   rot (radians, her own frame), pivot ('center' | 'hind'), sx/sy (squash), tilt, wag, blink, alpha,
                   scale, dy, z, cape, capeFly, noEar, ear, and under/over(g, A, i) to draw things in her own frame,
     back(g, A) / front(g, A) draw props behind / in front of the pals (logical stage units) }

   Helpers on A: t, dur, cx, span, x0, x1, G, W, H, e(a,b) eased 0..1, p(a,b) linear, out(a,b), back(a,b) overshoot,
   bump(a,b), in(a,b), osc(period, amp, phase), walk(d, from, to, a, b), hop(d, t0, dur, h), flip(d, t0, dur, h, turns, dir),
   spin(d, t0, dur, turns), say(d, text, a, b), once(t), tick(period, from, to), burst(x, y, n, kind, opts), shake(px),
   head(i), mouth(i), pos(i), headL(i), pup(g, 'collar'|'drop', x, y, scale, face, pose), U (drawing helpers),
   dark (it's dusk or night), water, snow, setting, R (reduced motion).
   Tidbit is T (index 0, looks.collar), Sugarfoot is S (index 1, looks.drop). */
(function () {
  'use strict';
  var PI = Math.PI, TAU = PI * 2;
  var acts = [];
  function add(o) { acts.push(o); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mix(a, b, p) { return a + (b - a) * p; }
  function eio(p) { p = clamp(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function arcPt(p, x0, y0, x1, y1, h) { return { x: mix(x0, x1, p), y: mix(y0, y1, p) - h * 4 * p * (1 - p) }; }
  function laugh(A, T, S, t0, t1) { A.say(T, 'Ha!', t0, t0 + 900); A.say(S, 'Ha!', t0 + 250, t0 + 1150); A.hop(T, t0, 300, 12); A.hop(S, t0 + 250, 300, 12); T.wag = S.wag = 3; }
  function paw(g, U, x, y, s, col) { U.ell(g, x, y, 3.2 * s, 2.6 * s, col); U.circle(g, x - 3 * s, y - 3.4 * s, 1.2 * s, col); U.circle(g, x, y - 4.2 * s, 1.2 * s, col); U.circle(g, x + 3 * s, y - 3.4 * s, 1.2 * s, col); }
  function puddle(g, U, x, y, rx) { U.ell(g, x, y, rx, rx * 0.2, '#8CC8EA'); U.ell(g, x - rx * 0.2, y - 1, rx * 0.55, rx * 0.07, 'rgba(255,255,255,.5)'); }
  function plank(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }

  // ======================= SILLY =======================
  add({ id: 'noodle', name: 'Noodle tug-of-war', kind: 'silly', dur: 7600,
    cap: 'Tidbit and Sugarfoot have a tug-of-war with one very long noodle', punch: [4300, 'Snap! Now there’s noodle for two.'],
    run: function (A, T, S) {
      var tug = A.t > 400 && A.t < 4300, sway = tug ? A.osc(1000, 7) : 0;
      T.x = A.x0 - 4 + sway; S.x = A.x1 + 4 + sway;
      if (tug) { T.pose = S.pose = 'bow'; T.wag = S.wag = 2.6; T.tilt = -0.1; S.tilt = -0.1; }
      if (A.t >= 4300) {
        T.x -= A.out(4300, 4900) * 24; S.x += A.out(4300, 4900) * 24;
        A.flip(T, 4300, 650, 26, 1, -1); A.flip(S, 4300, 650, 26, 1, -1);
        if (A.t > 5100) { T.x += A.e(5600, 6600) * 20; S.x -= A.e(5600, 6600) * 20; }
        laugh(A, T, S, 5200);
      }
      A.say(T, '!', 250, 900); A.say(S, '!', 350, 1000);
      if (A.once(4300)) { var a = A.mouth(0), b = A.mouth(1); A.burst((a.x + b.x) / 2, (a.y + b.y) / 2, 10, 'spark'); A.shake(2); }
      if (A.once(6400)) { A.burst(A.cx, A.G - 70, 5, 'heart'); }
    },
    front: function (g, A) {
      var a = A.mouth(0), b = A.mouth(1); g.strokeStyle = '#F2CF72'; g.lineWidth = 3.2; g.lineCap = 'round';
      if (A.t < 4300) { g.beginPath(); g.moveTo(a.x, a.y); g.bezierCurveTo(a.x + (b.x - a.x) * 0.3, a.y + 10 + A.osc(450, 4), a.x + (b.x - a.x) * 0.7, b.y + 10 - A.osc(450, 4), b.x, b.y); g.stroke(); }
      else { var s = 1 - A.e(4500, 6400); if (s > 0.03) { var L = Math.abs(b.x - a.x) * 0.45 * s;
        g.beginPath(); g.moveTo(a.x, a.y); g.quadraticCurveTo(a.x + a.face * L * 0.5, a.y + 14 * s, a.x + a.face * L, a.y + 6 * s); g.stroke();
        g.beginPath(); g.moveTo(b.x, b.y); g.quadraticCurveTo(b.x + b.face * L * 0.5, b.y + 14 * s, b.x + b.face * L, b.y + 6 * s); g.stroke(); } }
    } });

  add({ id: 'sneeze', name: 'The big sneeze', kind: 'silly', dur: 7400,
    cap: 'Sugarfoot sniffs a flower… ah… ah…', punch: [2300, 'ACHOO! Tidbit goes flying (and loves it).'],
    run: function (A, T, S) {
      var c = A.cx;
      if (A.t < 1200) { S.pose = A.t > 300 ? 'bow' : 'sit'; S.x = A.x1 - A.e(0, 400) * 20; }
      else if (A.t < 2300) { S.x = A.x1 - 20; S.pivot = 'hind'; S.rot = -0.42 * A.e(1200, 2250); S.tilt = -0.2; }
      else { S.x = A.x1 - 20; S.pivot = 'hind'; S.rot = 0.25 * A.bump(2300, 2700); S.sy *= 1 - 0.1 * A.bump(2300, 2500); }
      A.say(S, 'Ah…', 1250, 1700); A.say(S, 'Ah…', 1750, 2250);
      if (A.t >= 2300 && A.t < 3200) { var p = A.p(2300, 3200); T.x = mix(A.x0, c - A.span, 1 - Math.pow(1 - p, 2)); T.lift += 70 * 4 * p * (1 - p); T.rot = -TAU * eio(p); T.pose = 'run'; T.ph = 1; }
      else if (A.t >= 3200) { T.x = c - A.span; A.hop(T, 3199, 1, 0); A.walk(T, c - A.span, A.x0 - 10, 4300, 5400); }
      A.say(T, '?!', 3250, 4200);
      if (A.once(2300)) { var m = A.mouth(1); A.burst(m.x - 6, m.y, 14, 'puff', { angle: PI, spread: 0.8, speed: 0.2, life: 600 }); A.burst(c + 10, A.G - 30, 10, 'confetti', { col: '#F7A8C2' }); A.shake(3); }
      if (A.t > 5500) laugh(A, T, S, 5600);
    },
    back: function (g, A) {
      var U = A.U, x = A.x1 - 62, y = A.G + 2, gone = A.t > 2300;
      U.line(g, x, y, x + 2, y - 26, '#6FA15A', 2); U.ell(g, x + 6, y - 12, 5, 2.2, '#8FC46B', -0.5);
      if (!gone) { for (var i = 0; i < 6; i++) U.circle(g, x + 2 + Math.cos(i) * 5, y - 28 + Math.sin(i) * 5, 3.4, '#F7A8C2'); U.circle(g, x + 2, y - 28, 2.6, '#F8D76A'); }
      else U.circle(g, x + 2, y - 28, 2.6, '#F8D76A');
    } });

  add({ id: 'zoomies', name: 'Loop-de-loop zoomies', kind: 'silly', dur: 7800,
    cap: 'Zoomies! Tidbit is about to do a loop-de-loop', punch: [3000, 'She stuck the landing. Sugarfoot is very impressed.'],
    at: function (A) { return [A.cx - A.span + 6, A.cx + A.span - 8]; },
    run: function (A, T, S) {
      var c = A.cx, lx = c - 6, r = 44;
      if (A.t < 600) { T.pose = 'bow'; T.wag = 3; }
      A.say(T, '!', 150, 700);
      A.walk(T, c - A.span + 6, lx, 600, 1500);
      if (A.t >= 1500 && A.t < 2900) { var th = TAU * eio(A.p(1500, 2900)); T.x = lx + r * Math.sin(th); T.lift = r * (1 - Math.cos(th)); T.rot = -th; T.pose = 'run'; T.face = 1; T.ph = A.t / 30; }
      if (A.t >= 2900) { A.walk(T, lx, c + A.span - 74, 2900, 3700); }
      if (A.t >= 3700) { T.x = c + A.span - 74; T.face = 1; }
      S.face = -1; S.tilt = A.t > 1500 && A.t < 2900 ? Math.sin(TAU * A.p(1500, 2900)) * 0.3 : 0;
      A.say(S, 'Whoa!', 1900, 3000);
      if (A.t > 4000 && A.t < 5000) { A.hop(T, 4100, 420, 26); A.hop(S, 4100, 420, 26); T.pivot = S.pivot = 'hind'; T.rot += -0.5 * A.bump(4100, 4520); S.rot += -0.5 * A.bump(4100, 4520); }
      if (A.once(4310)) A.burst(c + A.span - 40, A.G - 70, 12, 'spark');
      if (A.t > 5400) { T.pose = 'lie'; } if (A.t > 5900) { S.pose = 'lie'; }
      if (A.t > 5400) A.say(T, 'Hee!', 5500, 6400);
      if (A.tick(90, 700, 3700)) A.burst(A.pos(0).x - A.pos(0).face * 20, A.pos(0).y - 8, 1, 'puff', { speed: 0.02, life: 500 });
    } });

  add({ id: 'conga', name: 'Conga with a snail', kind: 'silly', dur: 8600,
    cap: 'A conga line, led by one very proud snail', punch: [7000, 'The snail takes a bow. Encore!'],
    at: function (A) { return [A.cx - 58, Math.max(A.cx - A.span + 2, A.cx - 106)]; },
    run: function (A, T, S) {
      var sx = mix(A.cx - 10, A.cx + A.span - 6, A.e(600, 7000)), beat = A.t / 520;
      T.x = sx - 48; S.x = Math.max(A.cx - A.span + 2, sx - 96); T.face = S.face = 1;
      if (A.t > 600 && A.t < 7000) {
        T.pose = S.pose = 'run'; T.rot = Math.sin(beat * PI) * 0.1; S.rot = Math.sin(beat * PI + 0.8) * 0.1;
        if (Math.floor(beat) % 4 === 3) { T.lift += Math.sin((beat % 1) * PI) * 12; S.lift += Math.sin((beat % 1) * PI) * 12; }
        T.wag = S.wag = 2.4;
      }
      if (A.tick(1040, 800, 6800)) A.burst(sx, A.G - 50, 1, 'note');
      if (A.t > 7000) { T.pose = S.pose = 'bow'; A.say(T, '<3', 7200, 8400); A.say(S, '<3', 7350, 8400); }
    },
    front: function (g, A) {
      var U = A.U, x = mix(A.cx - 10, A.cx + A.span - 6, A.e(600, 7000)), y = A.G + 2, turn = A.t > 7000 ? -1 : 1, bob = A.in(600, 7000) ? Math.sin(A.t / 260) * 1.5 : 0;
      g.save(); g.translate(x, y); g.scale(turn * 1.1, 1.1);
      U.ell(g, 2, -3, 12, 3.4, '#C7D98A'); U.line(g, 10, -5, 13, -15 + bob, '#A9C06A', 1.4); U.line(g, 8, -5, 9, -14 - bob, '#A9C06A', 1.4); U.circle(g, 13, -15 + bob, 1.4, '#3C3350'); U.circle(g, 9, -14 - bob, 1.4, '#3C3350');
      U.circle(g, -2, -11, 9, '#E6A86A'); g.strokeStyle = '#B9743E'; g.lineWidth = 1.6; g.beginPath(); for (var i = 0; i < 26; i++) { var a = i * 0.5, r = 7 - i * 0.26; g.lineTo(-2 + Math.cos(a) * r, -11 + Math.sin(a) * r); } g.stroke();
      if (A.t > 7000) U.heart(g, 6, -28 - A.e(7000, 7600) * 6, 4, '#E4566E');
      g.restore();
      if (A.t > 7000 && A.t < 7600) U.star(g, x, y - 34, 3 + A.bump(7000, 7600) * 3, '#F8D76A');
    } });

  add({ id: 'sockshow', name: 'Sock puppet show', kind: 'silly', dur: 8400,
    cap: 'Sugarfoot is putting on a sock puppet show for Tidbit', punch: [6200, 'Ta-da! Tidbit asks for an encore.'],
    at: function (A) { return [A.cx - 80, A.cx + 40]; },
    run: function (A, T, S) {
      S.x = A.cx + 40; S.face = -1; S.z = -1;
      if (A.t > 500 && A.t < 6200) { S.alpha = 0; }
      if (A.t >= 6200) { S.lift = 40 * A.back(6200, 6700); S.pose = 'sit'; if (A.t > 6900) S.pose = 'bow'; }
      A.say(S, 'Ta-da!', 6300, 7300);
      T.x = A.cx - 80; T.face = 1; T.wag = 2;
      if (A.in(3000, 4600)) { A.hop(T, 3200, 260, 10); A.hop(T, 3600, 260, 10); }
      A.say(T, 'Ha!', 3200, 4000); A.say(T, 'Encore!', 7000, 8200); if (A.t > 7000) { A.hop(T, 7100, 280, 14); A.hop(T, 7500, 280, 14); }
      if (A.once(5200)) A.burst(A.cx + 40, A.G - 100, 6, 'heart');
    },
    front: function (g, A) {
      var U = A.U, x = A.cx + 40, y = A.G + 4, pop = A.e(200, 700);
      if (pop <= 0) return;
      g.save(); g.translate(x, y); g.scale(1, pop);
      U.rr(g, -42, -62, 84, 62, 6, '#C9674E'); U.rr(g, -36, -56, 72, 10, 3, '#8E3F33'); U.rr(g, -46, -70, 92, 12, 4, '#F6CB4C');
      U.text(g, 'SOCK SHOW', 0, -63.5, 7.5, '#8E3F33', '700');
      g.restore();
      if (A.t < 900 || A.t > 6100) return;
      var up = A.e(900, 1300) * (1 - A.e(5800, 6100)), kiss = A.e(4800, 5200) * (1 - A.e(5500, 5800));
      [[-1, '#7FB8F0', '#FFFFFF'], [1, '#F7A8C2', '#FFFFFF']].forEach(function (p, j) {
        var talk = (j === 0 ? A.in(1400, 2200) || A.in(3000, 3700) : A.in(2300, 2900) || A.in(3800, 4500)) ? Math.abs(Math.sin(A.t / 90)) : 0.1;
        var px = x + p[0] * (20 - kiss * 13), py = y - 64 - up * 30 + Math.sin(A.t / 300 + j) * 3;
        g.save(); g.translate(px, py); g.scale(-p[0], 1);
        U.rr(g, -7, -2, 14, 34 * up, 6, p[1]); for (var k = 0; k < 3; k++) U.rr(g, -7, 6 + k * 8, 14, 3, 0, p[2]);
        U.ell(g, 3, -4, 11, 8, p[1]); U.circle(g, 0, -8, 2.6, '#fff'); U.circle(g, 0.6, -8, 1.3, '#3C3350');
        U.ell(g, 9, -1 + talk * 2, 5, 1 + talk * 3, '#8E3F53'); g.restore();
      });
      if (A.in(1400, 2200)) A.say({ x: x - 20, y: y - 104, face: -1 }, 'Hi!', 1400, 2200);
      if (A.in(2300, 2900)) A.say({ x: x + 20, y: y - 104, face: 1 }, 'Hello!', 2300, 2900);
      if (A.in(3000, 3700)) A.say({ x: x - 20, y: y - 104, face: -1 }, 'Boop?', 3000, 3700);
      if (A.in(3800, 4500)) A.say({ x: x + 20, y: y - 104, face: 1 }, 'Boop!', 3800, 4500);
      if (kiss > 0.8) U.heart(g, x, y - 112 - A.e(5000, 5600) * 10, 7, '#E4566E');
    } });

  add({ id: 'tailchase', name: 'Tail chase', kind: 'silly', dur: 6800,
    cap: 'Tidbit chases her own tail… round and round', punch: [3800, 'Got it! Now the whole garden is spinning.'],
    run: function (A, T, S) {
      A.say(T, '?', 100, 700); T.tilt = A.t < 600 ? 0.3 : 0;
      if (A.t > 600 && A.t < 3800) { var p = eio(A.p(600, 3800)); T.face = Math.cos(TAU * 3 * p); T.x = A.x0 + Math.sin(TAU * 3 * p) * 8; T.pose = 'run'; T.ph = A.t / 40; T.wag = 4; }
      if (A.t >= 3800 && A.t < 5600) { T.tilt = Math.sin(A.t / 160) * 0.3; T.rot = Math.sin(A.t / 200) * 0.06; T.face = 1; }
      A.say(T, '!', 3800, 4400); S.wag = 2.5;
      if (A.t > 4200) A.say(S, 'Ha!', 4300, 5100);
      if (A.t > 5600) { S.x = A.x1 - A.e(5600, 6300) * 36; S.pivot = 'hind'; S.rot = -0.12 * A.bump(6200, 6800); if (A.once(6300)) A.burst(A.cx, A.G - 70, 4, 'heart'); }
    },
    front: function (g, A) {
      if (A.t < 3800 || A.t > 5600) return;
      var h = A.head(0), a = A.e(3800, 4100) * (1 - A.e(5200, 5600));
      g.save(); g.globalAlpha *= a; for (var i = 0; i < 3; i++) { var an = A.t / 260 + i * TAU / 3; A.U.star(g, h.x + Math.cos(an) * 14, h.y - 18 + Math.sin(an) * 4, 3.4, '#F8D76A', an); } g.restore();
    } });

  add({ id: 'puddle', name: 'Puddle cannonball', kind: 'silly', dur: 7400,
    cap: 'A puddle! Tidbit is winding up for a cannonball', punch: [1700, 'SPLASH! Sugarfoot is now also very wet.'],
    run: function (A, T, S) {
      var c = A.cx;
      if (A.t < 800) { T.pose = 'bow'; T.wag = 3; } A.say(T, '!', 200, 800);
      if (A.t >= 800) { var p = A.p(800, 1700); T.x = mix(A.x0, c - 12, eio(p)); if (p < 1) { T.pose = 'sit'; T.sx *= 0.92; T.rot = -TAU * 0.5 * eio(p) * (A.R ? 0 : 1) * 0; } A.hop(T, 800, 900, 70); }
      if (A.t > 1700) { T.x = c - 12; T.pose = 'sit'; T.dy = 2; }
      if (A.t > 1800 && A.t < 2800) { S.rot = Math.sin(A.t / 35) * 0.2 * (1 - A.p(1800, 2800)); S.pose = 'run'; S.ph = 0; }
      A.say(S, '!', 1750, 2400);
      A.say(S, 'My turn!', 3000, 3700);
      if (A.t >= 3500) { S.x = mix(A.x1, c + 24, A.e(3500, 4300)); A.hop(S, 3500, 800, 54); if (A.t > 4300) { S.pose = 'sit'; S.dy = 4; } }
      if (A.t > 4600 && A.t < 6400) { A.hop(T, 4700, 300, 14); A.hop(S, 5000, 300, 14); A.hop(T, 5300, 300, 14); A.hop(S, 5600, 300, 14); T.wag = S.wag = 3; }
      if (A.once(1700)) { A.burst(c, A.G - 4, 26, 'collar', { speed: 0.22, spread: 2.2 }); A.shake(2.5); }
      if (A.once(4300)) A.burst(c, A.G - 4, 22, 'collar', { speed: 0.2, spread: 2.2 });
      if (A.tick(300, 4700, 6400)) A.burst(c, A.G - 4, 5, 'collar', { speed: 0.12 });
      if (A.t > 6200) A.say(T, 'Ha!', 6300, 7200);
    },
    back: function (g, A) { puddle(g, A.U, A.cx, A.G + 4, 46 + A.bump(1700, 2300) * 8); },
    front: function (g, A) { if (A.t > 5800) A.U.rainbow(g, A.cx, A.G - 10, 50, 3, A.e(5800, 6400) * (1 - A.e(7000, 7400)) * 0.7); } });

  add({ id: 'thintree', name: 'Hide and seek', kind: 'silly', dur: 7800,
    cap: 'Hide and seek! Tidbit hides behind a very, very thin tree', punch: [4600, 'Found you! (It was not a great hiding spot.)'],
    at: function (A) { return [A.x0, A.cx - A.span + 8]; },
    run: function (A, T, S) {
      var tx = A.cx + 40, left = A.cx - A.span + 8;
      S.x = left; S.face = A.t < 1500 ? -1 : 1;
      if (A.t < 1500) { S.pose = 'bow'; A.say(S, '1…2…3!', 300, 1400); }
      A.walk(T, A.x0, tx, 200, 1400); if (A.t > 1400 && A.t < 4600) { T.x = tx; T.face = -1; T.sx *= 0.86; T.sy *= 0.97; T.blink = A.t > 2600 && A.t < 3400; }
      if (A.t >= 1500 && A.t < 4600) { S.face = Math.cos(A.p(1500, 3000) * TAU * 1.5) > 0 ? 1 : -1; A.walk(S, left, A.cx - 40, 3000, 4200); S.tilt = 0.25; A.say(S, '?', 1700, 2900); }
      if (A.t >= 4200) { S.x = A.cx - 40; S.face = 1; }
      A.say(S, '!', 4400, 5000); A.say(T, 'Ha!', 4700, 5500);
      if (A.t >= 4600 && A.t < 6600) { var a = A.e(4800, 6400) * TAU; T.x = tx + Math.cos(a) * 34; S.x = tx - Math.cos(a) * 44; T.face = Math.sin(a) > 0 ? -1 : 1; S.face = -T.face; T.pose = S.pose = 'run'; T.dy = Math.sin(a) * 6; S.dy = -Math.sin(a) * 6; }
      if (A.t >= 6600) { T.x = tx + 34; S.x = tx - 44; T.pose = S.pose = 'lie'; A.say(T, 'Hee!', 6700, 7600); if (A.once(6700)) A.burst(tx, A.G - 50, 4, 'heart'); }
    },
    front: function (g, A) { var U = A.U, x = A.cx + 40, y = A.G + 3; U.rr(g, x - 2, y - 104, 4, 104, 2, '#8A6340'); U.circle(g, x, y - 108, 9, '#6FAE6A'); U.circle(g, x - 6, y - 101, 6, '#7FBE72'); U.circle(g, x + 6, y - 102, 6, '#7FBE72'); } });

  add({ id: 'copycat', name: 'Copycat', kind: 'silly', dur: 8200,
    cap: 'Sugarfoot is copying everything Tidbit does', punch: [5800, 'Then Sugarfoot does a double flip. Show-off!'],
    run: function (A, T, S) {
      [[0, 0], [1, 500]].forEach(function (q) {
        var d = q[0] ? S : T, o = q[1];
        A.hop(d, 600 + o, 380, 26);
        A.spin(d, 1600 + o, 600, 1);
        if (A.in(2700 + o, 3300 + o)) d.pose = 'bow';
        if (A.in(3900 + o, 4600 + o)) d.pose = 'wiggle';
      });
      A.flip(T, 5200, 600, 44, 1, -1);
      A.flip(S, 5900, 900, 70, 2, -1);
      if (A.once(6800)) A.burst(A.x1, A.G - 60, 12, 'spark');
      A.say(T, '!!', 6800, 7600); if (A.t > 7300) T.pose = 'bow';
      A.say(S, 'Hee!', 7000, 8000);
    } });

  add({ id: 'pancakes', name: 'Pancake tower', kind: 'silly', dur: 8200,
    cap: 'Tidbit balances a stack of pancakes on her nose. Sugarfoot keeps adding more', punch: [6000, 'Wobble… wobble… Sugarfoot saves the day!'],
    run: function (A, T, S) {
      T.pose = 'sit'; T.tilt = -0.18 + Math.sin(A.t / 300) * 0.05 * A.p(2000, 6000);
      S.x = A.x1 - 10;
      for (var i = 1; i < 5; i++) { var t0 = 150 + i * 900; if (A.in(t0, t0 + 450)) { S.pivot = 'hind'; S.rot = -0.35 * A.bump(t0, t0 + 450); } }
      if (A.t > 5400 && A.t < 6100) { T.x = A.x0 + Math.sin(A.t / 60) * 3; A.say(T, '!', 5400, 6000); }
      A.walk(S, A.x1 - 10, A.x0 + 40, 5600, 6100);
      if (A.t >= 6100) { S.x = A.x0 + 40; S.face = -1; S.pose = 'sit'; }
      A.say(S, 'Ta-da!', 6300, 7200);
      if (A.t > 6900) { T.pose = 'lie'; S.pose = 'lie'; if (A.tick(250, 7000, 8000)) A.burst(A.cx - 30, A.G - 20, 2, 'crumb'); }
      if (A.once(7000)) A.burst(A.x0 + 20, A.G - 60, 5, 'heart');
    },
    front: function (g, A) {
      var U = A.U, n = clamp(Math.floor((A.t - 600) / 900) + 1, 0, 5), m = A.mouth(0), falling = A.t > 5900;
      var baseX = m.x + m.face * 3, baseY = m.y - 12, wob = Math.sin(A.t / 240) * 0.04 * n;
      if (A.t < 6100) {
        for (var i = 0; i < n; i++) { var fx = falling ? mix(baseX, A.x0 + 40, A.e(5900, 6100)) : baseX + Math.sin(wob * (i + 1)) * i * 3, fy = falling ? mix(baseY - i * 5, A.G - 30 - i * 5, A.e(5900, 6100)) : baseY - i * 5;
          U.ell(g, fx, fy, 12, 3.2, '#E3A85C'); U.ell(g, fx, fy - 1, 11, 2, '#F2C987'); }
        if (n >= 5 && A.t > 5000) { U.rr(g, baseX - 3, baseY - 29, 6, 4, 1, '#FFF1A8'); }
        // the next pancake, flying over in an arc
        for (var j = 0; j < 5; j++) { var t0 = 150 + j * 900, p = clamp((A.t - t0) / 450, 0, 1); if (j === 0 || p <= 0 || p >= 1) continue;
          var s = A.mouth(1), q = arcPt(p, s.x, s.y, baseX, baseY - j * 5, 40); U.ell(g, q.x, q.y, 12, 3.2, '#E3A85C'); }
      } else {
        var px = A.x0 + 40 + 16, py = A.G - 12; U.ell(g, px, py + 3, 20, 4, '#FFFFFF');
        for (var k = 0; k < 5 * (1 - A.e(7000, 8000)); k++) U.ell(g, px, py - k * 4, 12, 3, '#E3A85C');
      }
    } });

  add({ id: 'dance', name: 'Wiggle dance-off', kind: 'silly', dur: 7600,
    cap: 'A wiggle dance-off! Tidbit goes first', punch: [4600, 'Tie! They wiggle together.'],
    run: function (A, T, S) {
      if (A.in(200, 1600)) { T.pose = 'wiggle'; T.wag = 4; A.say(S, 'Ooh!', 700, 1500); }
      if (A.in(1700, 3100)) { S.pose = 'wiggle'; S.wag = 4; A.spin(S, 2400, 600, 1); A.say(T, 'Wow!', 2300, 3100); }
      if (A.in(3200, 4400)) { T.pose = 'wiggle'; A.hop(T, 3300, 320, 20); A.hop(T, 3800, 320, 20); }
      if (A.in(4600, 6500)) { T.pose = S.pose = 'wiggle'; var b = Math.floor((A.t - 4600) / 450) % 2; T.x = A.x0 + (b ? 8 : -8) * A.e(4600, 4800); S.x = A.x1 + (b ? 8 : -8) * A.e(4600, 4800); T.wag = S.wag = 4; }
      if (A.once(5200) || A.once(6000)) A.burst(A.cx, A.G - 90, 16, 'confetti', { speed: 0.14, spread: 2.6 });
      if (A.t > 6700) { T.pose = S.pose = 'bow'; }
      if (A.tick(450, 200, 6500)) A.burst(A.cx + (Math.random() - 0.5) * 60, A.G - 70, 1, 'note');
    } });

  add({ id: 'limbo', name: 'Limbo', kind: 'silly', dur: 8600,
    cap: 'How low can they go? It’s limbo time', punch: [5600, 'Lowest bar yet. Tidbit slides… Sugarfoot just hops over!'],
    at: function (A) { return [A.cx - A.span + 50, A.cx - A.span + 4]; },
    run: function (A, T, S) {
      var c = A.cx, sp = A.span, Lf = c - sp + 4, Ln = c - sp + 50, Rf = c + sp - 4, Rn = c + sp - 50;
      var bar = A.t < 2600 ? 56 : A.t < 5000 ? 36 : 18;
      function under(d) { if (Math.abs(d.x - c) < 34) { d.pose = bar > 40 ? 'bow' : 'lie'; if (d.pose === 'lie') d.ph = 0; } }
      A.walk(T, Ln, Rf, 600, 2300); A.walk(S, Lf, Rn, 800, 2500);
      A.walk(S, Rn, Lf, 3000, 4700); A.walk(T, Rf, Ln, 3200, 4900);
      A.walk(T, Ln, Rn, 5400, 7000);
      if (A.t < 5400) { under(T); under(S); }
      else { if (Math.abs(T.x - c) < 38) { T.pose = 'lie'; } A.walk(S, Lf, Rf, 5800, 7200); var f = A.p(6100, 6900); if (f > 0 && f < 1) { S.lift += 60 * 4 * f * (1 - f); S.rot = -TAU * eio(f); } }
      A.say(S, 'Or… over!', 6200, 7200);
      if (A.t > 7300) { T.face = 1; S.face = -1; laugh(A, T, S, 7400); }
    },
    front: function (g, A) {
      var U = A.U, c = A.cx, bar = A.t < 2400 ? 56 : A.t < 3000 ? mix(56, 36, A.e(2400, 3000)) : A.t < 4900 ? 36 : mix(36, 18, A.e(4900, 5400));
      U.rr(g, c - 38, A.G - 70, 5, 72, 2, '#8E6B9E'); U.rr(g, c + 33, A.G - 70, 5, 72, 2, '#8E6B9E');
      for (var i = 0; i < 6; i++) U.rr(g, c - 36 + i * 12, A.G - bar - 2, 12, 5, 0, i % 2 ? '#F7DC6F' : '#E4566E');
    } });

  add({ id: 'pizza', name: 'Pizza toss', kind: 'silly', dur: 7400,
    cap: 'Chef Tidbit is tossing pizza dough, higher and higher', punch: [4800, 'Oops! Sugarfoot has a brand new hat.'],
    run: function (A, T, S) {
      T.over = function (g, A2, i) { var h = A2.headL(i); A2.U.rr(g, h.x - 8, h.y - 22, 16, 11, 5, '#FFFFFF'); A2.U.circle(g, h.x - 5, h.y - 23, 6, '#FFFFFF'); A2.U.circle(g, h.x + 5, h.y - 23, 6, '#FFFFFF'); };
      [600, 1600, 2600, 3600].forEach(function (t0) { if (A.in(t0 - 150, t0 + 250)) { T.pivot = 'hind'; T.rot = -0.3 * A.bump(t0 - 150, t0 + 250); } });
      A.say(S, 'Ooh!', 1700, 2500);
      if (A.t > 4800 && A.t < 6000) { S.tilt = Math.sin(A.t / 120) * 0.2; A.say(S, '?', 4900, 5600); }
      A.say(T, 'Ha!', 5200, 6000);
      if (A.t > 6000 && A.t < 6400) { S.rot = Math.sin(A.t / 30) * 0.15; }
      A.say(T, 'Ta-da!', 6600, 7400);
    },
    front: function (g, A) {
      var U = A.U, h0 = A.head(0), h1 = A.head(1), x, y, r, spin = A.t / 70, t = A.t;
      var tosses = [[600, 1500, 30, 10], [1600, 2500, 50, 12], [2600, 3500, 80, 14]];
      r = 10; x = h0.x + h0.face * 6; y = h0.y - 14;
      for (var i = 0; i < tosses.length; i++) { var q = tosses[i]; if (t >= q[0] && t < q[1]) { var p = (t - q[0]) / (q[1] - q[0]); y = h0.y - 14 - q[2] * 4 * p * (1 - p); r = q[3]; } if (t >= q[1]) r = q[3]; }
      if (t >= 3600 && t < 4800) { var p2 = (t - 3600) / 1200, a = arcPt(p2, h0.x + h0.face * 6, h0.y - 14, h1.x, h1.y - 10, 120); x = a.x; y = a.y; r = 16; }
      if (t >= 4800 && t < 6000) { x = h1.x; y = h1.y - 8; r = 17; spin = 0; }
      if (t >= 6000 && t < 6600) { var p3 = (t - 6000) / 600, b = arcPt(p3, h1.x, h1.y - 8, h0.x + h0.face * 14, h0.y - 6, 50); x = b.x; y = b.y; r = 15; }
      if (t >= 6600) { x = h0.x + h0.face * 14; y = h0.y - 8; r = 15; spin = t / 40; }
      var w = r * (t >= 4800 && t < 6000 ? 1 : 0.9 + 0.1 * Math.cos(spin)), ry = t >= 4800 && t < 6000 ? r * 0.55 : r * 0.28;
      U.ell(g, x, y, w, ry, '#F4DDA6'); U.ell(g, x, y - 0.5, w * 0.8, ry * 0.7, '#F9ECC6');
      if (t >= 4800 && t < 6000) { U.ell(g, x, y + ry * 0.7, w * 0.95, 3, '#F4DDA6'); }
    } });

  add({ id: 'hula', name: 'Hula hoops', kind: 'silly', dur: 7600,
    cap: 'Sugarfoot can hula hoop. Tidbit would like to try three at once', punch: [4600, 'She did it! Three hoops, one very proud pal.'],
    run: function (A, T, S) {
      function hoops(d, cols, drop, spd) {
        d.under = function (g, A2) { for (var k = 0; k < cols.length; k++) { var y = -22 + k * 7 + drop, ph = A2.now / spd + k; g.strokeStyle = cols[k]; g.lineWidth = 2.4; g.beginPath(); g.ellipse(Math.cos(ph) * 5, y, 26, 5, 0, PI, TAU); g.stroke(); } };
        d.over = function (g, A2) { for (var k = 0; k < cols.length; k++) { var y = -22 + k * 7 + drop, ph = A2.now / spd + k; g.strokeStyle = cols[k]; g.lineWidth = 2.4; g.beginPath(); g.ellipse(Math.cos(ph) * 5, y, 26, 5, 0, 0, PI); g.stroke(); } };
      }
      S.pose = 'run'; S.ph = 0; S.rot = Math.sin(A.t / 110) * 0.07; hoops(S, ['#E4566E'], 0, 110);
      if (A.t > 2400) {
        T.pose = 'run'; T.ph = 0;
        var drop = A.t < 3600 ? 0 : A.t < 4600 ? 22 * A.e(3600, 4000) : 22 * (1 - A.e(4600, 5000));
        hoops(T, ['#7FB8F0', '#F7DC6F', '#8FD694'], drop, A.t > 3600 && A.t < 4600 ? 1e9 : 90); if (A.t < 3600 || A.t > 4600) T.rot = Math.sin(A.t / 90) * 0.08;
      }
      A.say(T, '?', 3800, 4500); A.say(S, 'Wow!', 5000, 5900);
      if (A.once(5000)) A.burst(A.x0, A.G - 70, 10, 'spark');
      if (A.t > 6000) { A.hop(T, 6100, 350, 18); A.hop(S, 6300, 350, 18); }
    } });

  add({ id: 'staring', name: 'Staring contest', kind: 'silly', dur: 7000,
    cap: 'A staring contest. Nobody blink…', punch: [4400, 'A leaf lands on Tidbit’s nose. Blink! Giggles everywhere.'],
    run: function (A, T, S) {
      T.x = A.cx - 34; S.x = A.cx + 34; T.blink = S.blink = false; T.tilt = S.tilt = 0.05;
      if (A.t > 900 && A.t < 4400) { T.sx *= 1.02; S.sx *= 1.02; }
      A.say(T, '…', 1000, 1800); A.say(S, '…', 1400, 2200);
      if (A.t > 3900 && A.t < 4400) T.tilt = Math.sin(A.t / 40) * 0.08;
      if (A.in(4400, 4650)) T.blink = true;
      A.say(S, 'Ha!', 4600, 5400); A.say(T, 'Hee!', 4800, 5600);
      if (A.t > 5200) { T.pose = S.pose = 'lie'; T.rot = -0.2 * A.bump(5300, 5900); S.rot = -0.2 * A.bump(5400, 6000); }
      if (A.once(5300)) A.burst(A.cx, A.G - 50, 5, 'heart');
    },
    front: function (g, A) {
      if (A.t < 2000 || A.t > 4700) return;
      var m = A.mouth(0), p = A.e(2000, 3900), x = mix(A.cx - 30, m.x + 3, p) + Math.sin(A.t / 300) * 12 * (1 - p), y = mix(40, m.y - 8, p);
      g.save(); g.translate(x, y); g.rotate(Math.sin(A.t / 260) * 0.6); A.U.ell(g, 0, 0, 5, 2.4, '#E8913F'); g.restore();
    } });

  add({ id: 'boomerang', name: 'Bone boomerang', kind: 'silly', dur: 7400,
    cap: 'Tidbit throws a bone boomerang and Sugarfoot races after it', punch: [4600, 'Bonk! It came back. Boomerangs do that.'],
    at: function (A) { return [A.cx - A.span + 8, A.cx + 20]; },
    run: function (A, T, S) {
      var c = A.cx, R = A.span - 20;
      T.x = c - A.span + 8; T.face = 1;
      if (A.in(500, 900)) { T.pivot = 'hind'; T.rot = -0.4 * A.bump(500, 900); }
      if (A.t > 800 && A.t < 4600) { var th = TAU * eio(A.p(800, 4600)) - 0.7; S.x = Math.max(c - 36, c - R * Math.cos(th)); S.pose = 'run'; S.face = Math.sin(th) >= 0 ? 1 : -1; if (S.x <= c - 35) S.pose = 'sit'; }
      A.hop(S, 2600, 500, 60); A.say(S, '?', 3100, 3800);
      if (A.t >= 4600) { S.x = c - 36; S.face = -1; }
      A.say(T, '!', 4600, 5200); if (A.t > 4600 && A.t < 5800) T.tilt = Math.sin(A.t / 150) * 0.25;
      if (A.t > 5800) { A.say(T, 'Ha!', 5900, 6700); A.say(S, '<3', 6100, 7000); S.x = c - 36 - A.e(5800, 6400) * 30; }
      if (A.once(4600)) { var h = A.head(0); A.burst(h.x, h.y - 10, 6, 'star', { speed: 0.08 }); }
    },
    front: function (g, A) {
      var c = A.cx, R = A.span - 20, x, y, rot = A.t / 60;
      if (A.t < 800) { var m = A.mouth(0); x = m.x; y = m.y; rot = 0; }
      else if (A.t < 4600) { var th = TAU * eio(A.p(800, 4600)); x = c - R * Math.cos(th); y = A.G - 44 - 40 * Math.sin(th) - 30 * Math.sin(th / 2); }
      else { var h = A.head(0); x = h.x - 6 + A.e(4600, 5000) * 16; y = mix(h.y - 12, A.G + 2, A.e(4600, 5000)); rot = 0.3; }
      A.U.bone(g, x, y, 20, rot, '#F6EEDD');
    } });

  add({ id: 'leafpile', name: 'Leaf pile dive', kind: 'silly', dur: 7400,
    cap: 'A big crunchy leaf pile. Tidbit dives right in', punch: [4600, 'Pop! Two pals with leafy hats.'],
    run: function (A, T, S) {
      var c = A.cx;
      if (A.t < 800) T.pose = 'bow'; A.say(T, '!', 200, 800);
      if (A.t >= 800) { T.x = mix(A.x0, c - 12, A.e(800, 1600)); A.hop(T, 800, 800, 64); }
      if (A.t > 1550 && A.t < 4600) T.alpha = 0;
      A.say(S, '?', 2000, 2800);
      if (A.t >= 3000) { S.x = mix(A.x1, c + 16, A.e(3000, 3700)); A.hop(S, 3000, 700, 56); }
      if (A.t > 3650 && A.t < 4600) S.alpha = 0;
      if (A.t >= 4600) { T.x = c - 34; S.x = c + 34; A.hop(T, 4600, 500, 44); A.hop(S, 4700, 500, 44); var hat = function (g, A2, i) { var h = A2.headL(i); A2.U.ell(g, h.x - 2, h.y - 11, 6, 2.6, '#E8913F', -0.4); A2.U.ell(g, h.x + 4, h.y - 12, 5, 2.2, '#D8643F', 0.5); }; T.over = hat; S.over = hat; }
      if (A.once(1600) || A.once(3700)) A.burst(c, A.G - 20, 22, 'leaf', { speed: 0.17, spread: 2.6 });
      if (A.once(4650)) A.burst(c, A.G - 30, 26, 'leaf', { speed: 0.2, spread: 3 });
      if (A.t > 5600) laugh(A, T, S, 5700);
    },
    front: function (g, A) {
      var U = A.U, c = A.cx, y = A.G + 4, w = A.bump(1600, 2100) * 4 + A.bump(3700, 4200) * 4 + (A.in(2100, 4600) ? Math.sin(A.t / 90) * 1.5 : 0), sq = A.t > 4600 ? 1 - A.e(4600, 5200) * 0.5 : 1;
      var cols = ['#E8913F', '#D8643F', '#F2C14E', '#C9573A', '#8FC46B'];
      for (var i = 0; i < 30; i++) { var a = i / 30 * PI, rr = 44 * Math.sqrt((i * 37 % 30) / 30); g.save(); g.translate(c + Math.cos(a) * rr * 1.3 + w * Math.sin(i), y - Math.sin(a) * rr * 0.7 * sq - 4); g.rotate(i); U.ell(g, 0, 0, 6, 3, cols[i % 5]); g.restore(); }
    } });

  add({ id: 'tooslow', name: 'High-five chain', kind: 'silly', dur: 7400,
    cap: 'High five! Low five! Side five!', punch: [3800, '“Too slow!” Then the biggest high five of all.'],
    run: function (A, T, S) {
      T.x = A.cx - 32; S.x = A.cx + 32; T.pivot = S.pivot = 'hind';
      var r1 = A.bump(500, 1100); T.rot = -0.6 * r1; S.rot = -0.6 * r1;
      if (A.in(1500, 2100)) T.pose = S.pose = 'bow';
      A.hop(T, 2500, 360, 22); A.hop(S, 2500, 360, 22);
      if (A.in(3300, 4400)) { T.rot = -0.6 * A.bump(3300, 4000) ; S.x = A.cx + 32 - A.bump(3700, 4400) * 12; S.rot = 0.18 * A.bump(3800, 4400); }
      A.say(T, 'Too slow!', 3750, 4600); A.say(S, '?!', 4000, 4700);
      A.hop(T, 5000, 600, 50); A.hop(S, 5000, 600, 50); if (A.in(5000, 5600)) { T.rot = -0.7 * A.bump(5000, 5600); S.rot = -0.7 * A.bump(5000, 5600); }
      [800, 1800, 2680].forEach(function (t) { if (A.once(t)) A.burst(A.cx, A.G - (t === 1800 ? 20 : 56), 7, 'spark'); });
      if (A.once(5300)) { A.burst(A.cx, A.G - 100, 18, 'confetti', { speed: 0.15, spread: 3 }); A.shake(2); }
      if (A.t > 6000) laugh(A, T, S, 6100);
    } });

  add({ id: 'pogo', name: 'Pogo sticks', kind: 'silly', dur: 7400,
    cap: 'Boing! Boing! Pogo sticks for two', punch: [3800, 'Boing-spin in the middle!'],
    at: function (A) { return [A.cx - A.span + 6, A.cx + A.span - 6]; },
    run: function (A, T, S) {
      var c = A.cx, sp = A.span;
      function pogo(d, x0, x1, ph) {
        var b = Math.abs(Math.sin(PI * (A.t + ph) / 520)); d.lift = 16 + b * (A.in(3800, 4600) ? 70 : 36); d.x = mix(x0, x1, A.e(300, 3800)) + (A.t > 4600 ? mix(0, x0 - x1, A.e(4600, 6400)) : 0);
        if (b < 0.15) { d.sy *= 0.9; d.sx *= 1.06; } d.pose = 'run'; d.ph = 1.4;
        d.under = function (g) { g.fillStyle = '#6B5A70'; g.fillRect(-1.5, -8, 3, 22); g.fillRect(-7, 6, 14, 2.4); g.strokeStyle = '#B9A6DA'; g.lineWidth = 1.4; g.beginPath(); for (var k = 0; k < 5; k++) g.ellipse(0, 10 + k * 1.2, 3, 0.8, 0, 0, TAU); g.stroke(); };
      }
      if (A.t < 6700) { pogo(T, c - sp + 6, c + sp - 40, 0); pogo(S, c + sp - 6, c - sp + 40, 260); T.dy = -6; S.dy = 6; }
      A.spin(T, 3900, 600, 1); A.spin(S, 3900, 600, 1);
      A.say(T, 'Boing!', 600, 1300); A.say(S, 'Boing!', 1100, 1800);
      if (A.t > 6700) { T.x = c - sp + 6; S.x = c + sp - 6; A.hop(T, 6700, 300, 20); A.hop(S, 6800, 300, 20); }
      if (A.once(4200)) A.burst(c, A.G - 110, 10, 'spark');
    } });

  add({ id: 'planes', name: 'Paper planes', kind: 'silly', dur: 7400,
    cap: 'Paper plane race! Ready, set, throw', punch: [4200, 'Tidbit’s plane lands on her own head. Sugarfoot’s loops right back to her.'],
    run: function (A, T, S) {
      if (A.in(500, 900)) { T.pivot = 'hind'; T.rot = -0.4 * A.bump(500, 900); }
      if (A.in(900, 1300)) { S.pivot = 'hind'; S.rot = -0.4 * A.bump(900, 1300); }
      A.say(T, '?', 4200, 5000); A.say(S, 'Ta-da!', 4700, 5600);
      if (A.t > 5400) { T.wag = S.wag = 3; A.say(T, 'Ha!', 5500, 6300); }
    },
    front: function (g, A) {
      var U = A.U, c = A.cx;
      function plane(x, y, ang, col) { g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = col; g.beginPath(); g.moveTo(9, 0); g.lineTo(-7, -5); g.lineTo(-4, 0); g.lineTo(-7, 5); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(9, 0); g.lineTo(-4, 0); g.stroke(); g.restore(); }
      function path(fn, t0, t1, col, rest) {
        if (A.t < t0) { plane(rest.x, rest.y, 0, col); return; }
        var p = clamp((A.t - t0) / (t1 - t0), 0, 1), a = fn(p), b = fn(Math.min(1, p + 0.01)); plane(a.x, a.y, Math.atan2(b.y - a.y, b.x - a.x) || 0, col);
      }
      var h0 = A.head(0), h1 = A.head(1);
      path(function (p) { if (p >= 1) return { x: h0.x, y: h0.y - 14 }; var th = p * TAU; return { x: mix(h0.x, c + 60 * Math.sin(th), Math.sin(p * PI)) + (p > 0.8 ? 0 : 0), y: mix(h0.y - 10, 60 + 40 * Math.cos(th), Math.sin(p * PI)) }; }, 700, 4200, '#FFFFFF', A.mouth(0));
      path(function (p) { if (p >= 1) return A.mouth(1); var th = p * TAU * 1.5; return { x: mix(h1.x, c - 40 * Math.sin(th), Math.sin(p * PI)), y: mix(h1.y, 80 - 40 * Math.cos(th), Math.sin(p * PI)) }; }, 1100, 4700, '#FCE38A', A.mouth(1));
    } });

  add({ id: 'moonwalk', name: 'The moonwalk', kind: 'cool', dur: 7400,
    cap: 'Sugarfoot has been practising her moonwalk', punch: [4400, 'Tidbit gets the hang of it. Smooth!'],
    at: function (A) { return [A.cx - A.span + 8, A.cx + A.span - 8]; },
    run: function (A, T, S) {
      var c = A.cx, sp = A.span;
      if (A.t > 300 && A.t < 2300) { S.x = mix(c + sp - 8, c - 10, A.e(300, 2300)); S.face = 1; S.pose = 'run'; }
      if (A.t >= 2300) S.x = c - 10;
      A.spin(S, 2400, 500, 1); if (A.in(2900, 3500)) { S.pivot = 'hind'; S.rot = -0.5 * A.bump(2900, 3500); }
      A.say(S, 'Hee!', 2900, 3700); A.say(T, '!!', 3000, 3700);
      T.x = c - sp + 8; T.face = 1;
      if (A.t > 3700 && A.t < 4400) { T.x = mix(c - sp + 8, c - 64, A.e(3700, 4400)); T.face = -1; T.pose = 'run'; }
      if (A.t >= 4400) { var p = A.e(4600, 6400); T.x = mix(c - 64, c - sp + 8, p); S.x = mix(c - 10, c - sp + 58, p); T.face = S.face = 1; if (p > 0 && p < 1) { T.pose = S.pose = 'run'; } }
      A.spin(T, 6400, 500, 1); A.spin(S, 6400, 500, 1);
      if (A.once(6900)) A.burst(c - sp + 34, A.G - 70, 12, 'spark');
    } });

  // ======================= SWEET =======================
  add({ id: 'share', name: 'Sharing a treat', kind: 'sweet', dur: 7400,
    cap: 'A giant cookie! Tidbit breaks it in half for her best friend', punch: [4000, 'Half for you, half for me.'],
    run: function (A, T, S) {
      A.say(T, '!', 800, 1500); A.say(S, '!', 900, 1600); T.tilt = S.tilt = A.in(900, 1500) ? 0.25 : 0;
      A.walk(T, A.x0, A.cx - 30, 1300, 1900);
      if (A.t >= 1900) { T.x = A.cx - 30; if (A.in(2200, 2600)) T.pose = 'bow'; }
      if (A.t > 2600 && A.t < 3800) { A.walk(T, A.cx - 30, A.cx + 10, 2800, 3500); }
      if (A.t >= 3500) { T.x = A.cx + 10 - A.e(3700, 4100) * 36; T.face = 1; }
      if (A.t > 4200) { T.pose = S.pose = 'lie'; S.x = A.x1 - 14; }
      if (A.tick(300, 4300, 5800)) { A.burst(A.mouth(0).x, A.mouth(0).y, 2, 'crumb'); A.burst(A.mouth(1).x, A.mouth(1).y, 2, 'crumb'); }
      if (A.once(2600)) A.burst(A.cx, A.G - 12, 10, 'crumb', { speed: 0.12 });
      if (A.once(5900)) A.burst(A.cx, A.G - 60, 6, 'heart');
      A.say(T, '<3', 6000, 7000); A.say(S, '<3', 6200, 7200);
    },
    back: function (g, A) {
      var U = A.U, c = A.cx, drop = A.t < 800 ? mix(-80, A.G - 14, A.e(0, 800)) : A.G - 14;
      function cookie(x, y, r, half) { g.save(); g.translate(x, y); U.circle(g, 0, 0, r, '#D9A15E'); U.circle(g, 0, 0, r * 0.85, '#E6B878'); for (var i = 0; i < 6; i++) U.circle(g, Math.cos(i * 1.7) * r * 0.5, Math.sin(i * 1.7) * r * 0.5, r * 0.12, '#6B4228'); if (half) { g.fillStyle = 'rgba(0,0,0,0)'; } g.restore(); }
      if (A.t < 2600) cookie(c, drop - A.bump(800, 1000) * 6, 14);
      else if (A.t < 4200) {
        var m = A.mouth(0), p = A.e(2800, 3500);
        g.save(); g.beginPath(); g.rect(c - 20, A.G - 40, 20, 40); g.clip(); cookie(mix(c - 2, m.x, 0), A.G - 14, 14); g.restore();
        g.save(); var hx = A.t > 2800 ? m.x : c + 2, hy = A.t > 2800 ? m.y : A.G - 14; g.beginPath(); g.rect(hx - 1, hy - 20, 20, 40); g.clip(); cookie(hx - 2, hy, 14); g.restore();
      } else {
        var sh = 1 - A.e(4300, 5800); if (sh > 0.05) { var a = A.mouth(0), b = A.mouth(1); cookie(a.x + 4, a.y + 4, 9 * sh); cookie(b.x - 4, b.y + 4, 9 * sh); }
      }
    } });

  add({ id: 'leafblanket', name: 'Leaf blanket nap', kind: 'sweet', dur: 8600,
    cap: 'Tidbit is sleepy, so Sugarfoot fetches a leaf to tuck her in', punch: [5000, 'All tucked in. Sugarfoot snuggles up too.'],
    run: function (A, T, S) {
      var rx = A.cx + A.span - 8;
      A.say(T, 'Yaaawn', 200, 1000); if (A.t > 800) { T.pose = 'lie'; T.blink = A.t > 1400; }
      A.walk(S, A.x1, rx, 1100, 2100); if (A.in(2100, 2500)) S.pose = 'bow';
      A.walk(S, rx, A.x0 + 44, 2500, 3700); if (A.t >= 3700) { S.x = A.x0 + 44; S.face = -1; }
      if (A.in(3800, 4400)) S.pose = 'bow';
      if (A.t > 5000) { S.pose = 'lie'; S.blink = A.t > 5600; S.face = -1; }
      if (A.t > 7200 && A.t < 7800) T.blink = false;
      if (A.once(7300)) A.burst(A.x0 + 20, A.G - 40, 5, 'heart');
    },
    front: function (g, A) {
      var U = A.U, t = A.t, x, y, rot = 0, s = 1;
      if (t < 2300) { x = A.cx + A.span - 8 + 28; y = A.G - 2; rot = 0.2; }
      else if (t < 3900) { var m = A.mouth(1); x = m.x; y = m.y + 2; rot = -0.3; s = 0.8; }
      else { var p = A.pos(0); x = mix(A.mouth(1).x, p.x + 2, A.e(3900, 4400)); y = mix(A.mouth(1).y, p.y - 10, A.e(3900, 4400)); rot = -0.1; s = mix(0.8, 1.3, A.e(3900, 4400)); }
      g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
      U.ell(g, 0, 0, 22, 9, '#7FBE72'); g.strokeStyle = '#5E9E55'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-20, 0); g.lineTo(22, 0); for (var i = -3; i <= 3; i++) { g.moveTo(i * 5, 0); g.lineTo(i * 5 + 4, -6); g.moveTo(i * 5, 0); g.lineTo(i * 5 + 4, 6); } g.stroke();
      g.restore();
      if (t > 1500) { var h = A.head(0); g.font = 'italic 12px Georgia, serif'; g.textAlign = 'center'; for (var j = 0; j < 3; j++) { var age = (t + j * 900) % 2700, a = Math.sin(PI * age / 2700); g.fillStyle = 'rgba(110,90,170,' + (a * 0.8).toFixed(2) + ')'; g.fillText('z', h.x + age / 2700 * 16 + j * 3, h.y - 10 - age / 2700 * 26); } }
    } });

  add({ id: 'boop', name: 'Nose boop', kind: 'sweet', dur: 6200,
    cap: 'Tidbit and Sugarfoot tiptoe closer and closer…', punch: [2400, 'Boop! That’s a heart.'],
    run: function (A, T, S) {
      A.walk(T, A.x0, A.cx - 27, 500, 1900); A.walk(S, A.x1, A.cx + 27, 600, 2000);
      if (A.t >= 1900) { T.x = A.cx - 27; } if (A.t >= 2000) { S.x = A.cx + 27; }
      T.face = 1; S.face = -1; T.tilt = S.tilt = A.in(1900, 2400) ? 0.15 : 0;
      A.say(T, 'Boop!', 2400, 3200); A.say(S, 'Boop!', 2550, 3300);
      if (A.t > 3600 && A.t < 5400) { T.pose = S.pose = 'wiggle'; T.wag = S.wag = 4; }
      if (A.once(3800)) A.burst(A.cx, A.G - 110, 12, 'heart', { speed: 0.1, spread: 3 });
    },
    front: function (g, A) {
      if (A.t < 2400 || A.t > 3900) return;
      var s = A.back(2400, 3200) * (1 - A.e(3600, 3900) * 0.3), a = 1 - A.e(3600, 3900);
      g.save(); g.globalAlpha *= a; A.U.heart(g, A.cx, A.G - 70 - A.e(2400, 3600) * 30, 18 * s, '#F28AA8'); A.U.heart(g, A.cx - 4, A.G - 76 - A.e(2400, 3600) * 30, 5 * s, 'rgba(255,255,255,.6)'); g.restore();
    } });

  add({ id: 'umbrella', name: 'A tiny rain cloud', kind: 'sweet', dur: 8200,
    cap: 'A tiny rain cloud follows Tidbit around. Sugarfoot has an idea', punch: [3600, 'An umbrella for two, and then… a rainbow!'],
    run: function (A, T, S) {
      var c = A.cx;
      A.say(T, '?', 500, 1200); A.walk(T, A.x0, c - A.span + 10, 1200, 2200); A.walk(T, c - A.span + 10, c - 30, 2400, 3200);
      if (A.t > 3200) { T.x = c - 30; T.face = 1; }
      A.walk(S, A.x1, c + 16, 2400, 3500); if (A.t > 3500) { S.x = c + 16; S.face = -1; }
      S.over = function (g, A2, i) { var h = A2.headL(i); g.strokeStyle = '#6B5A70'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(h.x + 12, h.y + 6); g.lineTo(h.x - 4, h.y - 44); g.stroke();
        g.save(); g.translate(h.x - 4, h.y - 44); g.rotate(-0.25 + (A2.t > 5400 ? Math.sin(A2.t / 200) * 0.1 : 0)); g.fillStyle = '#B79CEB'; g.beginPath(); g.moveTo(-34, 6); g.quadraticCurveTo(0, -30, 34, 6); g.closePath(); g.fill(); g.fillStyle = '#E4DAFA'; g.beginPath(); g.moveTo(-12, 3); g.quadraticCurveTo(0, -24, 12, 3); g.closePath(); g.fill(); g.restore(); };
      if (A.t < 2400) S.over = null;
      if (A.t > 5400) { T.pose = S.pose = 'wiggle'; T.wag = S.wag = 3.5; }
      A.say(T, '<3', 5600, 6600); A.say(S, 'Yay!', 5800, 6800);
    },
    back: function (g, A) { if (A.t > 5000) A.U.rainbow(g, A.cx, A.G + 10, 110, 5, A.e(5000, 5800) * 0.85); },
    front: function (g, A) {
      var U = A.U, p = A.pos(0), s = 1 - A.e(4600, 5200); if (s <= 0.02) return;
      var x = p.x - 16, y = p.y - 104;
      g.save(); g.globalAlpha *= s; U.cloud(g, x, y, 0.8, '#A9B2C7');
      g.strokeStyle = 'rgba(120,170,230,.8)'; g.lineWidth = 1.4; var cover = A.t > 3600;
      for (var i = 0; i < 6; i++) { var dx = x + 2 + i * 5, len = cover ? 30 : 70, yy = y + 8 + ((A.t / 3 + i * 23) % len); g.beginPath(); g.moveTo(dx, yy); g.lineTo(dx - 1, yy + 5); g.stroke(); }
      g.restore();
    } });

  add({ id: 'butterfly', name: 'Butterfly visitor', kind: 'sweet', dur: 7200,
    cap: 'A butterfly is looking for somewhere to land…', punch: [2200, 'Tidbit’s nose! She goes cross-eyed trying to see it.'],
    run: function (A, T, S) {
      if (A.in(2200, 4000)) { T.tilt = 0.2; T.blink = false; A.say(T, '!', 2300, 3000); }
      A.walk(S, A.x1, A.x0 + 50, 2800, 3700); if (A.t > 3700) { S.x = A.x0 + 50; S.face = -1; }
      if (A.in(4000, 5200)) { S.tilt = 0.2; A.say(T, 'Ha!', 4300, 5100); }
      if (A.t > 5200) { A.hop(T, 5300, 450, 30); A.hop(S, 5500, 450, 30); }
      if (A.once(5300)) A.burst(A.cx, 50, 8, 'spark');
      A.say(S, '<3', 6100, 7100);
    },
    front: function (g, A) {
      var x, y, t = A.t;
      if (t < 2200) { var p = t / 2200; x = mix(A.cx + A.span, A.mouth(0).x, eio(p)) + Math.sin(t / 200) * 20 * (1 - p); y = mix(40, A.mouth(0).y - 10, eio(p)) + Math.cos(t / 170) * 12 * (1 - p); }
      else if (t < 4000) { x = A.mouth(0).x; y = A.mouth(0).y - 10; }
      else if (t < 5200) { var q = A.e(4000, 4600); x = mix(A.mouth(0).x, A.mouth(1).x, q); y = mix(A.mouth(0).y - 10, A.mouth(1).y - 10, q) - Math.sin(q * PI) * 30; }
      else { var r = A.p(5200, 7200); x = A.cx + Math.cos(r * 12) * 40 * (1 - r); y = A.mouth(1).y - 10 - r * 200; }
      var flap = Math.abs(Math.sin(t / (t > 2200 && t < 5200 ? 300 : 60)));
      g.save(); g.translate(x, y); A.U.ell(g, -4 * flap, -3, 5 * flap + 1, 4, '#F6A04D'); A.U.ell(g, 4 * flap, -3, 5 * flap + 1, 4, '#F6A04D'); A.U.ell(g, -3 * flap, 2, 3 * flap + 1, 3, '#F7DC6F'); A.U.ell(g, 3 * flap, 2, 3 * flap + 1, 3, '#F7DC6F'); A.U.ell(g, 0, 0, 1.2, 4, '#3C3350'); g.restore();
    } });

  add({ id: 'sunflower', name: 'Giant sunflower', kind: 'sweet', time: 'day', dur: 8600,
    cap: 'Sugarfoot plants a seed and Tidbit waters it', punch: [3800, 'It grows… and grows… and GROWS!'],
    run: function (A, T, S) {
      S.x = A.cx + 30; if (A.in(300, 1500)) S.pose = 'bow';
      if (A.tick(150, 300, 1500)) A.burst(A.cx + 4, A.G - 2, 2, 'dirt');
      T.x = A.cx - 40;
      if (A.in(2200, 3400)) { T.pose = 'bow'; }
      if (A.t > 3800) { T.tilt = S.tilt = -0.3 * A.e(3800, 4600); T.face = 1; S.face = -1; A.say(T, 'Whoa!', 4600, 5400); A.say(S, 'Whoa!', 4800, 5600); }
      if (A.t > 6400) { T.tilt = S.tilt = 0; A.say(T, '<3', 6800, 7800); A.say(S, '<3', 7000, 8000); }
      if (A.once(6600)) A.burst(A.cx - 10, A.G - 80, 8, 'spark');
    },
    front: function (g, A) {
      var U = A.U, x = A.cx, y = A.G + 2, gr = A.e(3800, 6000), h = 12 + gr * 118;
      if (A.t > 1500) U.ell(g, x, y, 10, 3, '#8A6B45');
      if (A.in(2200, 3400)) { var m = A.mouth(0); g.save(); g.translate(m.x, m.y); U.rr(g, -4, -6, 14, 10, 3, '#7FB8F0'); U.line(g, 10, -2, 18, -8, '#7FB8F0', 2.5); g.restore(); g.strokeStyle = 'rgba(120,180,240,.8)'; g.lineWidth = 1.2; for (var i = 0; i < 4; i++) { var yy = m.y - 6 + ((A.t / 4 + i * 11) % 30); g.beginPath(); g.moveTo(m.x + 18 + i, yy); g.lineTo(m.x + 18 + i, yy + 4); g.stroke(); } }
      if (A.t < 3400) return;
      var bend = A.bump(6200, 7400), hx = x + Math.sin(A.t / 900) * 3 * gr - bend * 26, hy = y - h + bend * 30;
      g.strokeStyle = '#6FA15A'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y - h * 0.5, hx, hy); g.stroke();
      U.ell(g, x + 7, y - h * 0.4, 9 * gr, 4 * gr, '#7FBE72', -0.5); U.ell(g, x - 7, y - h * 0.6, 9 * gr, 4 * gr, '#7FBE72', 0.5);
      var r = 4 + gr * 18; for (var k = 0; k < 14; k++) { var a = k / 14 * TAU + A.t / 3000; U.ell(g, hx + Math.cos(a) * r, hy + Math.sin(a) * r, r * 0.45, r * 0.18, '#F7C948', a); }
      U.circle(g, hx, hy, r * 0.7, '#7A4E2A'); U.circle(g, hx - r * 0.2, hy - r * 0.2, r * 0.18, 'rgba(255,255,255,.2)');
    } });

  add({ id: 'flowercrown', name: 'Flower crowns', kind: 'sweet', dur: 7400,
    cap: 'Sugarfoot is making something special out of wildflowers', punch: [3400, 'A flower crown for Tidbit, and one right back.'],
    run: function (A, T, S) {
      var rx = A.cx + A.span - 10; A.walk(S, A.x1, rx, 200, 900); if (A.in(900, 2000)) S.pose = 'bow';
      A.walk(S, rx, A.x0 + 46, 2000, 3000); if (A.t >= 3000) { S.x = A.x0 + 46; S.face = -1; }
      if (A.in(3200, 3600)) { S.pivot = 'hind'; S.rot = -0.3 * A.bump(3200, 3600); }
      var crown = function (g, A2, i) { var h = A2.headL(i); for (var k = 0; k < 6; k++) A2.U.circle(g, h.x - 9 + k * 3.8, h.y - 10 - Math.sin(k / 5 * PI) * 3, 2.3, ['#F28AA8', '#F7DC6F', '#B79CEB', '#FFFFFF', '#F6B26B', '#8FD694'][k]); };
      if (A.t > 3400) T.over = crown; if (A.t > 5800) S.over = crown;
      A.spin(T, 3600, 700, 1); A.say(T, '!', 3500, 4200);
      if (A.in(4400, 5400)) T.pose = 'bow';
      if (A.in(5500, 5900)) { T.pivot = 'hind'; T.rot = -0.3 * A.bump(5500, 5900); }
      if (A.once(3450) || A.once(5850)) A.burst(A.cx - 40, A.G - 80, 7, 'spark');
      A.say(S, '<3', 6000, 7000); if (A.t > 6400) { T.pose = S.pose = 'sit'; T.tilt = 0.15; S.tilt = 0.15; }
    } });

  add({ id: 'stargaze', name: 'Stargazing', kind: 'sweet', time: 'night', dur: 8600,
    cap: 'Tidbit and Sugarfoot lie back and look at the stars', punch: [3600, 'The stars join up into a heart, just for them.'],
    run: function (A, T, S) {
      T.x = A.cx - 30; S.x = A.cx + 30; T.pose = S.pose = 'lie'; T.tilt = S.tilt = -0.35; T.face = 1; S.face = -1;
      A.say(T, '!', 2000, 2800); A.say(S, 'Ooh!', 2200, 3000);
      A.say(T, '<3', 6600, 7600); A.say(S, '<3', 6800, 7800);
      if (A.t > 6400) { T.x = A.cx - 22; S.x = A.cx + 22; }
    },
    back: function (g, A) {
      var U = A.U, cx = A.cx, cy = 70, pts = [];
      for (var i = 0; i < 12; i++) { var th = i / 12 * TAU; pts.push({ x: cx + 16 * Math.pow(Math.sin(th), 3) * 3.2, y: cy - (13 * Math.cos(th) - 5 * Math.cos(2 * th) - 2 * Math.cos(3 * th) - Math.cos(4 * th)) * 3.2 }); }
      var tw = function (i) { return 0.6 + 0.4 * Math.sin(A.t / 500 + i * 1.3); };
      pts.forEach(function (p, i) { U.star(g, p.x, p.y, 2.6 + tw(i), 'rgba(255,245,200,' + (0.5 + 0.5 * tw(i)).toFixed(2) + ')'); });
      var n = A.e(3600, 6200) * pts.length;
      if (n > 0) { g.strokeStyle = 'rgba(255,240,200,.75)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (var k = 1; k <= Math.floor(n) && k <= pts.length; k++) { var q = pts[k % pts.length]; g.lineTo(q.x, q.y); } var f = n - Math.floor(n); if (Math.floor(n) < pts.length) { var a = pts[Math.floor(n)], b = pts[(Math.floor(n) + 1) % pts.length]; g.lineTo(mix(a.x, b.x, f), mix(a.y, b.y, f)); } g.stroke(); }
      if (A.in(1800, 2800)) { var p2 = A.p(1800, 2800), sx = mix(A.cx + A.span, A.cx - A.span, p2), sy = 30 + p2 * 40; g.strokeStyle = 'rgba(255,250,220,' + (Math.sin(p2 * PI) * 0.9).toFixed(2) + ')'; g.lineWidth = 2; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 30, sy - 10); g.stroke(); U.circle(g, sx, sy, 2.2, '#FFF6D6'); }
    } });

  add({ id: 'clouds', name: 'Cloud shapes', kind: 'sweet', time: 'day', dur: 8400,
    cap: 'Lying in the grass, finding shapes in the clouds', punch: [3000, 'That one’s a bone! And that one… is smiling back.'],
    run: function (A, T, S) {
      T.x = A.cx - 30; S.x = A.cx + 30; T.pose = S.pose = 'lie'; T.tilt = S.tilt = -0.35;
      A.say(T, 'A bone!', 2600, 3600); A.say(S, '<3', 5000, 5900); A.say(T, 'Ha!', 7000, 7900); A.say(S, 'Ha!', 7200, 8100);
      if (A.t > 7000) { T.wag = S.wag = 3.5; T.rot = -0.12 * A.bump(7000, 7600); S.rot = -0.12 * A.bump(7100, 7700); }
    },
    back: function (g, A) {
      var U = A.U, col = 'rgba(255,255,255,.95)';
      function blobs(list, a) { g.save(); g.globalAlpha *= a; g.fillStyle = col; g.beginPath(); list.forEach(function (b) { g.moveTo(b[0] + b[2], b[1]); g.arc(b[0], b[1], b[2], 0, TAU); }); g.fill(); g.restore(); }
      function shape(kind, x, y, m) {
        var out = [], i;
        if (kind === 'bone') { for (i = 0; i < 7; i++) out.push([x - 24 + i * 8, y, 7]); out.push([x - 30, y - 7, 8], [x - 30, y + 7, 8], [x + 30, y - 7, 8], [x + 30, y + 7, 8]); }
        else if (kind === 'heart') { for (i = 0; i < 14; i++) { var th = i / 14 * TAU; out.push([x + 16 * Math.pow(Math.sin(th), 3) * 1.6, y - (13 * Math.cos(th) - 5 * Math.cos(2 * th) - 2 * Math.cos(3 * th)) * 1.6, 7]); } out.push([x, y, 14]); }
        else { for (i = 0; i < 9; i++) { var a = PI * 0.15 + i / 8 * PI * 0.7; out.push([x + Math.cos(a) * 30, y + Math.sin(a) * 16, 5]); } out.push([x - 14, y - 12, 5], [x + 14, y - 12, 5]); out.push([x - 40, y, 10], [x + 40, y, 10]); }
        return out.map(function (b, j) { var px = x + (j % 3 - 1) * 14, py = y + (j % 2) * 6; return [mix(px, b[0], m), mix(py, b[1], m), mix(10, b[2], m)]; });
      }
      [['bone', 600, 3600], ['heart', 3400, 6200], ['smile', 5800, 8400]].forEach(function (c, k) {
        if (A.t < c[1] - 400 || A.t > c[2] + 400) return;
        var p = A.p(c[1] - 400, c[2] + 400), x = mix(A.cx + A.span + 30, A.cx - A.span - 30, p), m = A.e(c[1] + 300, c[1] + 1400);
        blobs(shape(c[0], x, 70 + k * 6, m), Math.min(1, Math.sin(p * PI) * 2));
      });
      if (A.t > 6800 && A.t < 7400) { var x2 = mix(A.cx + A.span + 30, A.cx - A.span - 30, A.p(5400, 8800)); U.rr(g, x2 + 8, 58, 10, 2, 1, 'rgba(120,140,170,.5)'); }
    } });

  add({ id: 'fireflies', name: 'Firefly heart', kind: 'sweet', time: 'night', dur: 8400,
    cap: 'Fireflies! Tidbit and Sugarfoot hop about trying to say hello', punch: [5000, 'The fireflies gather into a glowing heart.'],
    run: function (A, T, S) {
      A.hop(T, 800, 420, 30); A.hop(S, 1300, 420, 30); A.hop(T, 2200, 420, 36); A.hop(S, 2800, 420, 36);
      if (A.in(3400, 4800)) { T.pivot = S.pivot = 'hind'; T.rot = -0.4 * A.bump(3400, 4000); S.rot = -0.4 * A.bump(3800, 4400); }
      if (A.t > 5000) { T.tilt = S.tilt = -0.3; T.wag = S.wag = 3; A.say(T, '<3', 5600, 6600); A.say(S, '<3', 5800, 6800); }
      T.dy = -2; S.dy = 2;
    },
    front: function (g, A) {
      var U = A.U, n = A.R ? 10 : 14, form = A.e(5000, 6200) * (1 - A.e(7400, 8400));
      for (var i = 0; i < n; i++) {
        var th = i / n * TAU, hx = A.cx + 16 * Math.pow(Math.sin(th), 3) * 2.6, hy = 90 - (13 * Math.cos(th) - 5 * Math.cos(2 * th) - 2 * Math.cos(3 * th) - Math.cos(4 * th)) * 2.6;
        var wx = A.cx + Math.sin(A.t / 1100 + i * 2.1) * (A.span - 10), wy = A.G - 60 - (i * 13 % 70) + Math.cos(A.t / 800 + i) * 18;
        var x = mix(wx, hx, form), y = mix(wy, hy, form), gl = 0.55 + 0.45 * Math.sin(A.t / 600 + i * 1.7);
        U.circle(g, x, y, 6, 'rgba(255,240,140,' + (0.2 * gl).toFixed(2) + ')'); U.circle(g, x, y, 2, 'rgba(255,248,180,' + (0.6 + 0.4 * gl).toFixed(2) + ')');
      }
    } });

  add({ id: 'picnic', name: 'Picnic', kind: 'sweet', dur: 8200,
    cap: 'Picnic time! What’s in the basket?', punch: [4200, 'A little ant wants some too. Sugarfoot shares her cookie.'],
    run: function (A, T, S) {
      T.x = A.cx - 32; S.x = A.cx + 32;
      A.say(T, '?', 400, 1100); if (A.in(800, 1300)) S.pose = 'bow';
      if (A.once(1300)) A.burst(A.cx + 6, A.G - 26, 8, 'spark');
      if (A.in(1800, 3800)) { T.pose = S.pose = 'lie'; if (A.tick(300, 1800, 3800)) { A.burst(A.mouth(0).x, A.mouth(0).y, 1, 'crumb'); A.burst(A.mouth(1).x, A.mouth(1).y, 1, 'crumb'); } }
      if (A.t > 4000) { T.face = S.face = 1; T.tilt = S.tilt = 0.25; A.say(T, '!', 4200, 4900); }
      if (A.in(5400, 5900)) S.pose = 'bow';
      if (A.t > 6400) { A.say(S, '<3', 6500, 7500); A.say(T, 'Ha!', 6600, 7600); T.tilt = S.tilt = 0; }
    },
    back: function (g, A) {
      var U = A.U, c = A.cx, y = A.G + 2;
      g.fillStyle = '#F4F0EA'; g.beginPath(); g.moveTo(c - 80, y + 10); g.lineTo(c + 80, y + 10); g.lineTo(c + 64, y - 6); g.lineTo(c - 64, y - 6); g.closePath(); g.fill();
      g.fillStyle = '#E4566E'; for (var i = 0; i < 8; i++) for (var j = 0; j < 2; j++) if ((i + j) % 2 === 0) { var x0 = c - 64 + i * 16 - j * 8, yy = y - 6 + j * 8; g.beginPath(); g.moveTo(x0, yy); g.lineTo(x0 + 16, yy); g.lineTo(x0 + 16 - 8, yy + 8); g.lineTo(x0 - 8, yy + 8); g.closePath(); g.fill(); }
      var bx = c + 6, lid = A.e(800, 1300); U.rr(g, bx - 12, y - 22, 24, 16, 3, '#C8955A'); g.strokeStyle = '#A57640'; g.lineWidth = 1; for (var k = 0; k < 4; k++) { g.beginPath(); g.moveTo(bx - 12, y - 20 + k * 4); g.lineTo(bx + 12, y - 20 + k * 4); g.stroke(); }
      g.save(); g.translate(bx - 12, y - 22); g.rotate(-lid * 1.2); U.rr(g, 0, -3, 24, 4, 2, '#A57640'); g.restore();
    },
    front: function (g, A) {
      var U = A.U, c = A.cx, y = A.G + 2;
      if (A.in(1300, 1800)) { var q = A.back(1300, 1600); U.rr(g, c + 6 - 9, y - 30 - 10 * q, 18, 8, 2, '#F2D39A'); U.rr(g, c + 6 - 9, y - 27 - 10 * q, 18, 3, 0, '#8FC46B'); }
      if (A.t < 4000) return;
      var ax = mix(c + A.span + 10, c + 50, A.e(4000, 5400)), cook = A.t > 5700;
      if (A.t > 6400) ax = mix(c + 50, c + A.span + 20, A.e(6400, 8200));
      g.save(); g.translate(ax, y + 4); g.scale(-1, 1); U.circle(g, 0, 0, 1.6, '#3C3350'); U.circle(g, 3, -0.5, 1.4, '#3C3350'); U.circle(g, 6, -1, 1.8, '#3C3350');
      if (cook) { U.circle(g, 3, -9 - Math.sin(A.t / 120), 7, '#D9A15E'); U.circle(g, 3, -9 - Math.sin(A.t / 120), 5.5, '#E6B878'); U.circle(g, 1, -10, 1, '#6B4228'); U.circle(g, 5, -8, 1, '#6B4228'); } else U.circle(g, 3, -4, 1.4, '#E0B77F');
      g.restore();
      if (A.in(5400, 5900)) { var m = A.mouth(1); U.circle(g, mix(m.x, ax, A.e(5500, 5800)), mix(m.y, y - 5, A.e(5500, 5800)), 6, '#D9A15E'); }
    } });

  add({ id: 'photo', name: 'Photo booth', kind: 'sweet', dur: 7800,
    cap: 'Say cheese! Tidbit and Sugarfoot pose for a photo', punch: [5200, 'Here’s the picture. Best friends!'],
    at: function (A) { return [A.cx - 78, A.cx - 20]; },
    run: function (A, T, S) {
      T.x = A.cx - 78; S.x = A.cx - 20; T.face = S.face = 1; T.dy = -4; S.dy = 4;
      if (A.in(1800, 2600)) { T.tilt = 0.3; S.tilt = -0.3; T.wag = S.wag = 3; }
      if (A.in(3400, 4200)) { T.pose = 'bow'; S.pivot = 'hind'; S.rot = -0.5; }
      if (A.t > 5400) { T.face = S.face = 1; A.say(T, '<3', 6000, 7000); A.say(S, '<3', 6200, 7200); }
    },
    back: function (g, A) { var U = A.U, x = A.cx + A.span - 10, y = A.G + 2; U.line(g, x, y - 40, x - 12, y, '#4B4A55', 2); U.line(g, x, y - 40, x + 12, y, '#4B4A55', 2); U.line(g, x, y - 40, x, y, '#4B4A55', 2); U.rr(g, x - 14, y - 60, 28, 20, 4, '#3C3350'); U.circle(g, x - 14, y - 50, 6, '#6E5AA8'); U.circle(g, x - 14, y - 50, 3, '#AFA2DC'); U.rr(g, x + 2, y - 64, 8, 4, 1, '#3C3350'); },
    front: function (g, A) {
      var U = A.U, x = A.cx + A.span - 10, y = A.G + 2;
      ['3', '2', '1'].forEach(function (s, k) { A.say({ x: x - 10, y: y - 58, face: -1 }, s, 600 + k * 400, 950 + k * 400); });
      A.say({ x: x - 10, y: y - 58, face: -1 }, '3', 2900, 3100); A.say({ x: x - 10, y: y - 58, face: -1 }, '2', 3100, 3300); A.say({ x: x - 10, y: y - 58, face: -1 }, '1', 3300, 3450);
      [1900, 3500].forEach(function (t0) { var f = A.bump(t0, t0 + (A.R ? 900 : 380)); if (f > 0) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = 'rgba(255,255,255,' + (f * (A.R ? 0.25 : 0.6)).toFixed(2) + ')'; g.fillRect(0, 0, g.canvas.width, g.canvas.height); g.restore(); } });
      if (A.t < 4800) return;
      var p = A.back(4800, 5600), cx = A.cx, cy = 104, w = 96 * p, h = 104 * p; if (w < 2) return;
      g.save(); g.translate(cx, cy); g.rotate(-0.05);
      U.rr(g, -w / 2 - 2, -h / 2 + 3, w + 4, h, 4, 'rgba(40,30,60,.2)'); U.rr(g, -w / 2, -h / 2, w, h, 3, '#FFFFFF');
      g.save(); g.beginPath(); g.rect(-w / 2 + 6, -h / 2 + 6, w - 12, h * 0.72); g.clip(); U.rr(g, -w / 2 + 6, -h / 2 + 6, w - 12, h * 0.72, 0, '#CFE8F7'); U.rr(g, -w / 2 + 6, -h / 2 + 6 + h * 0.55, w - 12, h * 0.2, 0, '#9AD17F');
      A.pup(g, 'collar', -14 * p, -h / 2 + 6 + h * 0.62, 0.6 * p, 1, 'sit'); A.pup(g, 'drop', 18 * p, -h / 2 + 6 + h * 0.62, 0.6 * p, -1, 'sit'); U.heart(g, 2 * p, -h / 2 + 18 * p, 5 * p, '#E4566E'); g.restore();
      U.text(g, 'best friends', 0, h / 2 - 12 * p, 9 * p, '#5B4A86', '600'); g.restore();
    } });

  add({ id: 'gift', name: 'A surprise present', kind: 'sweet', dur: 7600,
    cap: 'A present has appeared, with a big bow on top', punch: [2800, 'Boing! It’s a BFF banner. For both of them.'],
    run: function (A, T, S) {
      T.x = A.cx - 48; S.x = A.cx + 48; A.say(T, '?', 900, 1700); T.tilt = S.tilt = A.in(900, 2000) ? 0.3 : 0;
      if (A.in(1900, 2800)) { T.pose = 'bow'; T.x -= A.e(2200, 2700) * 8; }
      A.say(T, '!', 2900, 3600); A.say(S, '!', 3000, 3700);
      A.hop(T, 3000, 360, 24); A.hop(S, 3100, 360, 24);
      if (A.t > 4200) { T.x = A.cx - 36; S.x = A.cx + 36; T.pivot = S.pivot = 'hind'; T.rot = S.rot = -0.25 * A.e(4200, 4600); A.say(S, '<3', 4600, 5600); }
      if (A.once(2800)) { A.burst(A.cx, A.G - 40, 24, 'confetti', { speed: 0.18, spread: 2.2 }); A.shake(2); }
      if (A.once(4600)) A.burst(A.cx, A.G - 90, 8, 'heart');
    },
    front: function (g, A) {
      var U = A.U, c = A.cx, y = A.G + 2, d = A.t < 700 ? mix(-60, y, A.e(0, 700)) : y, sq = A.bump(700, 900) * 0.15;
      g.save(); g.translate(c, d); g.scale(1 + sq, 1 - sq);
      U.rr(g, -18, -30, 36, 30, 3, '#8FB8F0'); U.rr(g, -3, -30, 6, 30, 0, '#E4566E');
      var lid = A.t > 2800 ? A.back(2800, 3300) : 0; g.save(); g.translate(0, -30 - lid * 30); g.rotate(lid * 0.5); U.rr(g, -20, -7, 40, 8, 2, '#7AA6E0'); U.rr(g, -3, -7, 6, 8, 0, '#E4566E');
      if (A.t < 2800) { U.ell(g, -6, -10, 7, 4, '#E4566E', 0.4); U.ell(g, 6, -10, 7, 4, '#E4566E', -0.4); }
      g.restore(); g.restore();
      if (A.t > 2800) {
        var s = A.back(2800, 3400), wob = Math.sin(A.t / 120) * 3 * (1 - A.e(3000, 5000)), top = y - 34 - 50 * s;
        g.strokeStyle = '#9A9AAA'; g.lineWidth = 1.5; g.beginPath(); for (var k = 0; k <= 10; k++) g.lineTo(c + (k % 2 ? 4 : -4) + wob * k / 10, y - 30 - (50 * s) * k / 10); g.stroke();
        U.rr(g, c - 26 + wob, top - 14, 52, 18, 5, '#FFF3C9'); U.text(g, 'BFF', c + wob, top - 5, 12, '#E4566E', '800');
        [[-40, '#F28AA8'], [40, '#B79CEB'], [0, '#F7DC6F']].forEach(function (b, j) { var by = y - 40 - A.e(3000, 7600) * 130 - j * 10, bx = c + b[0] + Math.sin(A.t / 500 + j) * 6; U.line(g, bx, by + 10, bx, by + 24, 'rgba(90,80,110,.6)', 0.8); U.ell(g, bx, by, 8, 10, b[1]); });
      }
    } });

  add({ id: 'party', name: 'Party for no reason', kind: 'sweet', dur: 7400,
    cap: 'A party for no reason at all! There’s even cake', punch: [3600, 'Blow! Confetti everywhere, and frosting on Tidbit’s nose.'],
    run: function (A, T, S) {
      var hat = function (col) { return function (g, A2, i) { var h = A2.headL(i); g.fillStyle = col; g.beginPath(); g.moveTo(h.x - 7, h.y - 8); g.lineTo(h.x - 1, h.y - 28); g.lineTo(h.x + 5, h.y - 8); g.closePath(); g.fill(); A2.U.circle(g, h.x - 1, h.y - 29, 2.6, '#FFF3C9'); }; };
      T.over = hat('#7FB8F0'); S.over = hat('#F28AA8');
      T.x = A.cx - 40; S.x = A.cx + 40;
      A.say(T, 'Yay!', 500, 1300); A.say(S, 'Yay!', 700, 1500); A.hop(T, 600, 320, 20); A.hop(S, 800, 320, 20);
      if (A.in(3000, 3800)) { T.x += A.e(3000, 3400) * 6; S.x -= A.e(3000, 3400) * 6; T.sx *= 1 + A.bump(3400, 3700) * 0.1; S.sx *= 1 + A.bump(3400, 3700) * 0.1; }
      if (A.t > 4600) { var base = T.over; T.over = function (g, A2, i) { base(g, A2, i); var h = A2.headL(i); A2.U.circle(g, h.x + 15, h.y - 2, 2.6, '#FFFFFF'); }; A.say(S, 'Ha!', 4800, 5600); }
      if (A.in(5600, 6300)) { S.x = A.cx + 22; S.pivot = 'hind'; S.rot = 0.15 * A.bump(5600, 6300); A.say(S, 'Boop!', 5800, 6600); }
      if (A.once(3600)) { A.burst(A.cx, A.G - 40, 4, 'puff', { speed: 0.04 }); A.burst(A.cx, A.G - 120, 26, 'confetti', { speed: 0.12, spread: 3.4 }); }
      if (A.once(6400)) A.burst(A.cx, A.G - 80, 5, 'heart');
    },
    back: function (g, A) {
      var U = A.U, c = A.cx, y = A.G + 2; U.rr(g, c - 20, y - 24, 40, 4, 2, '#C9A77A'); U.rr(g, c - 2, y - 22, 4, 22, 1, '#C9A77A');
      U.rr(g, c - 14, y - 40, 28, 16, 3, '#F7C9D4'); U.rr(g, c - 14, y - 40, 28, 5, 3, '#FFFFFF'); for (var i = 0; i < 5; i++) U.circle(g, c - 11 + i * 5.5, y - 34, 1.2, ['#E4566E', '#7FB8F0', '#F7DC6F'][i % 3]);
      U.rr(g, c - 1, y - 50, 2, 10, 1, '#B79CEB'); if (A.t < 3600) U.flame(g, c, y - 58, 0.8, A.now);
    } });

  add({ id: 'seesaw', name: 'Seesaw launch', kind: 'cool', dur: 8200,
    cap: 'Up and down on the seesaw… and up… and UP', punch: [5000, 'Perfect balance. Best friends, level at last.'],
    _k: function (A) { var t = A.t; if (t < 1400) return -1; if (t < 2600) return mix(-1, 1, A.e(1400, 1580)); if (t < 3800) return mix(1, -1, A.e(2600, 2780)); if (t < 5000) return mix(-1, 1, A.e(3800, 3980)); return mix(1, 0, A.e(5000, 5800)); },
    run: function (A, T, S) {
      var c = A.cx, L = 64, k = this._k(A), hl = 12 + 12 * k, hr = 12 - 12 * k;
      T.x = c - L; S.x = c + L; T.lift = hl; S.lift = hr;
      if (A.t < 1400) { S.lift = A.t < 200 ? 0 : mix(0, hr, A.e(200, 800)); A.hop(S, 200, 600, 50); A.hop(S, 1000, 400, 24); }
      [[1400, T, 0, 24], [2600, S, 0, 24], [3800, T, 0, 24]].forEach(function (q) { var d = q[1], p = A.p(q[0], q[0] + 1200); if (p > 0 && p < 1) { d.lift = mix(q[2], q[3], p) + 110 * 4 * p * (1 - p); d.rot = -TAU * eio(p); d.pose = 'run'; d.ph = 1.2; } });
      [2600, 3800, 5000].forEach(function (t0) { A.hop(T, t0 - 1, 1, 0); A.hop(S, t0 - 1, 1, 0); });
      A.say(T, 'Wheee!', 1500, 2400); A.say(S, 'Wheee!', 2700, 3600);
      if (A.t > 5000) { A.say(T, '<3', 5800, 6800); A.say(S, '<3', 6000, 7000); }
      if (A.once(5800)) A.burst(c, A.G - 70, 10, 'spark');
    },
    back: function (g, A) {
      var U = A.U, c = A.cx, k = this._k(A);
      U.rr(g, c - 6, A.G - 12, 12, 14, 2, '#8E6B9E'); g.save(); g.translate(c, A.G - 12); g.rotate(Math.atan2(k * 12, 64)); U.rr(g, -76, -3, 152, 5, 2, '#E9A15E'); g.restore();
    } });

  // ======================= COOL =======================
  add({ id: 'skate', name: 'Half-pipe skating', kind: 'cool', dur: 8600,
    cap: 'Tidbit drops in on the half-pipe. Sugarfoot is judging', punch: [5200, 'Big air, a flip, and a perfect landing. Ten!'],
    at: function (A) { return [A.cx, A.cx + A.span - 2]; },
    run: function (A, T, S) {
      var c = A.cx, Rr = A.span * 0.78, H = 70, t = A.t;
      function lift(x) { var u = clamp((x - c) / Rr, -0.999, 0.999); return H * (1 - Math.sqrt(1 - u * u)); }
      var amp = t < 5000 ? mix(0.35, 0.86, A.e(0, 5000)) : mix(0.86, 0, A.e(6200, 7400)), th = t / 700 * PI;
      var x = c + Rr * amp * Math.sin(th), v = Math.cos(th);
      T.x = x; T.lift = lift(x); T.pose = 'sit'; T.face = v >= 0 ? 1 : -1; T.dy = -4;
      var u = clamp((x - c) / Rr, -0.99, 0.99), slope = H * u / (Rr * Math.sqrt(1 - u * u)), ang = Math.atan(slope);
      T.rot = Math.atan(-slope) * T.face;
      if (t > 5000 && t < 6200) { var p = A.p(5000, 6200); T.lift += 90 * 4 * p * (1 - p); T.rot += -TAU * eio(p); }
      T.under = function (g) { A.U.rr(g, -16, 1, 32, 3, 2, '#E4566E'); A.U.circle(g, -10, 6, 2.6, '#3C3350'); A.U.circle(g, 10, 6, 2.6, '#3C3350'); };
      S.x = c + A.span - 2; S.face = -1; S.tilt = Math.sin(th) * 0.12; S.wag = 2;
      A.say(S, '10!', 6300, 7600); if (A.t > 7400) { T.x = c; T.lift = 0; T.rot = 0; T.face = 1; }
      if (A.once(5600)) A.burst(x, A.G - 150, 12, 'spark');
    },
    back: function (g, A) {
      var U = A.U, c = A.cx, Rr = A.span * 0.78, H = 70, y = A.G;
      g.fillStyle = '#D9B98A'; g.beginPath(); g.moveTo(c - Rr - 14, y - H); for (var i = 0; i <= 40; i++) { var u = -0.999 + i / 40 * 1.998, x = c + Rr * u; g.lineTo(x, y - H * (1 - Math.sqrt(1 - u * u))); } g.lineTo(c + Rr + 14, y - H); g.lineTo(c + Rr + 14, y + 4); g.lineTo(c - Rr - 14, y + 4); g.closePath(); g.fill();
      g.strokeStyle = '#8E6B9E'; g.lineWidth = 3; g.beginPath(); for (var j = 0; j <= 40; j++) { var u2 = -0.999 + j / 40 * 1.998; g.lineTo(c + Rr * u2, y - H * (1 - Math.sqrt(1 - u2 * u2)) + 1); } g.stroke();
    },
    front: function (g, A) { if (A.t > 6300 && A.t < 7600) { var h = A.head(1); A.U.rr(g, h.x - 26, h.y - 30, 18, 14, 2, '#FFFFFF'); A.U.text(g, '10', h.x - 17, h.y - 23, 9, '#E4566E'); } } });

  add({ id: 'surf', name: 'Rainbow surfing', kind: 'cool', dur: 8600,
    cap: 'Surf’s up! A rainbow wave is rolling in', punch: [4400, 'Hanging ten on a rainbow. Totally tubular!'],
    run: function (A, T, S) {
      var c = A.cx, Hh = 74 * A.e(600, 2200) * (1 - A.e(6600, 7800)), w = A.span * 0.6;
      function h(x) { return Hh * Math.exp(-Math.pow((x - c) / w, 2)); }
      var board = function (col) { return function (g) { A.U.ell(g, 2, 2.5, 24, 3.4, col); A.U.ell(g, 2, 1.5, 18, 1.2, 'rgba(255,255,255,.6)'); }; };
      var ph = A.t / 900 * PI;
      T.x = c - 44 + Math.sin(ph) * 30 * A.e(2000, 2600); S.x = c + 44 + Math.sin(ph + 1.4) * 30 * A.e(2000, 2600);
      T.lift = h(T.x) + 3; S.lift = h(S.x) + 3; T.pose = S.pose = 'run'; T.ph = S.ph = 1.2;
      T.face = Math.cos(ph) >= 0 ? 1 : -1; S.face = Math.cos(ph + 1.4) >= 0 ? 1 : -1;
      var slope = function (x) { return -2 * (x - c) / (w * w) * h(x); };
      T.rot = Math.atan(slope(T.x)) * -T.face * 0.5; S.rot = Math.atan(slope(S.x)) * -S.face * 0.5;
      T.under = board('#F7DC6F'); S.under = board('#7FB8F0'); T.dy = -4; S.dy = 4;
      A.say(T, 'Wheee!', 2600, 3500); A.say(S, 'Cowabunga!', 3400, 4400);
      if (A.tick(260, 2000, 6600)) A.burst(c + (Math.random() - 0.5) * 80, A.G - Hh, 2, 'spark');
      if (A.t > 7600) { T.lift = S.lift = 0; }
    },
    back: function (g, A) {
      var c = A.cx, Hh = 74 * A.e(600, 2200) * (1 - A.e(6600, 7800)), w = A.span * 0.6, cols = ['#F27D7D', '#F6B26B', '#F7DC6F', '#8FD694', '#7FB8F0', '#B79CEB'];
      if (Hh < 1) return;
      for (var i = 0; i < cols.length; i++) {
        var s = 1 - i * 0.14; g.fillStyle = cols[i]; g.beginPath(); g.moveTo(c - A.span - 60, A.G + 4);
        for (var x = c - A.span - 60; x <= c + A.span + 60; x += 6) g.lineTo(x, A.G + 2 - Hh * s * Math.exp(-Math.pow((x - c) / w, 2)) + Math.sin(x / 12 + A.t / 200) * 1.5);
        g.lineTo(c + A.span + 60, A.G + 4); g.closePath(); g.fill();
      }
    } });

  add({ id: 'dj', name: 'DJ on the bone decks', kind: 'cool', dur: 8600,
    cap: 'DJ Tidbit is on the bone turntables. Sugarfoot is on the dance floor', punch: [6200, 'Wait for it… the DROP!'],
    at: function (A) { return [A.cx + 36, A.cx - 64]; },
    run: function (A, T, S) {
      var beat = A.t / 500, bp = beat % 1;
      T.x = A.cx + 36; T.face = -1; T.z = -1; S.z = 1; T.pose = 'sit'; T.tilt = Math.sin(beat * PI) * 0.15; T.lift = Math.abs(Math.sin(beat * PI)) * 4;
      if (A.in(1400, 2400) || A.in(4400, 5200)) { T.pivot = 'hind'; T.rot = -0.2 - Math.sin(A.t / 70) * 0.08; }
      S.x = A.cx - 64; S.face = 1;
      if (A.in(600, 2200)) S.pose = 'wiggle';
      A.spin(S, 2400, 700, 1); if (A.in(3200, 4200)) { A.hop(S, 3300, 300, 18); A.hop(S, 3800, 300, 18); }
      if (A.in(4400, 6000)) { S.pose = 'wiggle'; S.x += Math.sin(beat * PI) * 10; }
      if (A.t > 6200) { A.hop(S, 6200, 480, 50); A.hop(T, 6200, 480, 30); A.spin(S, 6200, 480, 1); }
      if (A.t > 7000) { S.pose = 'bow'; A.say(S, 'Yay!', 7000, 8000); }
      if (A.once(6300)) { A.burst(A.cx, A.G - 110, 30, 'confetti', { speed: 0.16, spread: 3.4 }); A.shake(2); }
      if (A.tick(500, 400, 6100)) A.burst(A.cx + 36 + (Math.random() - 0.5) * 40, A.G - 70, 1, 'note');
    },
    front: function (g, A) {
      var U = A.U, x = A.cx + 36, y = A.G + 4;
      U.rr(g, x - 44, y - 34, 88, 34, 5, '#3C3350'); U.rr(g, x - 44, y - 38, 88, 6, 3, '#5B4A86');
      [-22, 22].forEach(function (dx, j) { var rot = A.now / 300 * (j ? 1 : -1); U.ell(g, x + dx, y - 38, 16, 5, '#1E1A26'); g.save(); g.translate(x + dx, y - 39); g.scale(1, 0.32); g.rotate(rot); A.U.bone(g, 0, 0, 22, 0, '#F6EEDD'); g.restore(); });
      var beat = (A.t / 500) % 1, amp = A.R ? 0.3 : 1;
      [x - 56, x + 56].forEach(function (sx) { U.rr(g, sx - 9, y - 40, 18, 40, 3, '#5B4A86'); U.circle(g, sx, y - 26, 6 + (1 - beat) * 1.5 * amp, '#2C2638'); U.circle(g, sx, y - 10, 4, '#2C2638');
        g.strokeStyle = 'rgba(183,156,235,' + ((1 - beat) * 0.5 * amp).toFixed(2) + ')'; g.lineWidth = 1.5; g.beginPath(); g.arc(sx, y - 26, 8 + beat * 18, 0, TAU); g.stroke(); });
      U.text(g, 'DJ TIDBIT', x, y - 16, 8, '#F7DC6F', '800');
    } });

  add({ id: 'magic', name: 'The magic hat', kind: 'cool', dur: 9200,
    cap: 'Sugarfoot the Magnificent taps her magic hat…', punch: [3600, 'A bunny! And the bunny pulls out… a teeny tiny dog!'],
    at: function (A) { return [A.cx - A.span + 10, A.cx + A.span - 14]; },
    run: function (A, T, S) {
      S.x = A.cx + A.span - 14; S.face = -1; T.x = A.cx - A.span + 10; T.face = 1;
      S.over = function (g, A2, i) { var h = A2.headL(i); A2.U.hat(g, h.x - 1, h.y - 8, 0.7); g.strokeStyle = '#2C2638'; g.lineWidth = 2; g.beginPath(); g.moveTo(h.x + 11, h.y + 6); g.lineTo(h.x + 26, h.y + 2); g.stroke(); A2.U.circle(g, h.x + 26, h.y + 2, 1.6, '#FFFFFF'); };
      if (A.in(700, 1200)) { S.pivot = 'hind'; S.rot = -0.3 * A.bump(700, 1200); }
      A.say(T, '!', 1700, 2400); A.say(T, '!!', 4000, 4800);
      if (A.t > 5000 && A.t < 6400) { T.pose = 'lie'; T.rot = -0.3 * A.bump(5000, 5600); }
      if (A.t > 6400) { T.pose = 'bow'; S.pose = 'bow'; }
      if (A.once(1000) || A.once(3400)) A.burst(A.cx + 10, A.G - 30, 10, 'spark');
      if (A.once(6600)) A.burst(A.cx + 10, A.G - 90, 24, 'confetti', { speed: 0.14, spread: 3 });
    },
    front: function (g, A) {
      var U = A.U, x = A.cx + 10, y = A.G + 2;
      U.rr(g, x - 16, y - 18, 32, 4, 2, '#8E6B9E'); U.rr(g, x - 2, y - 16, 4, 16, 1, '#8E6B9E');
      var by = y - 20 - A.back(1600, 2200) * 22 * (1 - A.e(8200, 8800));
      if (A.t > 1500) {
        g.save(); g.beginPath(); g.rect(x - 30, y - 90, 60, 69); g.clip();
        U.ell(g, x, by, 9, 8, '#FFFFFF'); U.ell(g, x - 4, by - 12, 2.6, 7, '#FFFFFF', -0.2); U.ell(g, x + 4, by - 12, 2.6, 7, '#FFFFFF', 0.2); U.ell(g, x - 4, by - 12, 1.2, 5, '#F7C9D4', -0.2); U.ell(g, x + 4, by - 12, 1.2, 5, '#F7C9D4', 0.2); U.circle(g, x - 3, by - 1, 1.2, '#3C3350'); U.circle(g, x + 3, by - 1, 1.2, '#3C3350'); U.circle(g, x, by + 2, 1.1, '#F28AA8');
        g.restore();
        if (A.t > 2600) { var hx = x + 14, hy = by + 2 - A.e(2600, 3000) * 4; U.hat(g, hx, hy, 0.35); if (A.t > 3400) { var tdy = hy - A.back(3400, 3900) * 12, bo = A.t > 4400 && A.t < 5200 ? A.bump(4400, 5200) : 0; g.save(); g.translate(hx, tdy - bo * 16); if (A.in(4400, 5200)) g.rotate(-TAU * A.e(4400, 5200)); A.pup(g, 'collar', 0, 0, 0.24, -1, A.t > 6400 ? 'bow' : 'sit'); g.restore(); } }
      }
      g.save(); g.translate(x, y - 20); U.hat(g, 0, 0, 1.0); g.restore();
    } });

  add({ id: 'jetpack', name: 'Jetpack flight', kind: 'cool', dur: 8200,
    cap: 'Tidbit straps on a jetpack. Sugarfoot does the countdown', punch: [2000, 'Liftoff! A figure-eight over the treetops.'],
    run: function (A, T, S) {
      var c = A.cx, t = A.t, fire = t > 1900 && t < 7000;
      T.over = function (g, A2) { A2.U.rr(g, -14, -34, 10, 16, 3, '#9AA3B8'); A2.U.rr(g, -16, -20, 5, 6, 1, '#6B7388'); A2.U.rr(g, -9, -20, 5, 6, 1, '#6B7388'); if (fire) { g.save(); g.rotate(0); A2.U.flame(g, -13.5, -14, 0.7, A2.now); A2.U.flame(g, -6.5, -14, 0.7, A2.now + 30); g.restore(); } };
      ['3', '2', '1'].forEach(function (s, k) { A.say(S, s, 500 + k * 420, 850 + k * 420); });
      A.say(S, 'Whoa!', 3200, 4200);
      if (t >= 1900 && t < 3000) { T.lift = 110 * A.e(1900, 3000); T.pose = 'run'; T.ph = 1.2; }
      if (t >= 3000 && t < 6000) { var p = A.p(3000, 6000) * TAU; T.x = A.x0 + (c + (A.span - 16) * Math.sin(p) - A.x0) * A.e(3000, 3400) * (1 - A.e(5600, 6000)); T.lift = 110 - 26 * Math.sin(2 * p); T.face = Math.cos(p) >= 0 ? 1 : -1; T.pose = 'run'; T.ph = 1.2; T.rot = 0.15 * Math.cos(p); }
      if (t >= 6000) { T.lift = 110 * (1 - A.e(6000, 7000)); T.pose = t < 6950 ? 'run' : 'sit'; T.ph = 1.2; A.hop(T, 6999, 1, 0); }
      if (A.tick(110, 1900, 7000)) A.burst(A.pos(0).x - A.pos(0).face * 12, A.pos(0).y + 4, 1, 'puff', { angle: PI / 2, spread: 0.6, speed: 0.05 });
      if (A.once(1900)) A.shake(2.5);
      if (t > 7200) { T.pivot = S.pivot = 'hind'; T.rot = S.rot = -0.5 * A.bump(7300, 7900); if (A.once(7600)) A.burst(A.cx, A.G - 70, 8, 'spark'); }
    } });

  add({ id: 'rocket', name: 'Rocket to the moon', kind: 'cool', dur: 10400,
    cap: 'Tidbit and Sugarfoot climb into a rocket. Destination: the moon!', punch: [4800, 'Moon landing! Low-gravity hops and a heart flag.'],
    run: function (A, T, S) {
      var c = A.cx, mx = c + A.span - 30, t = A.t, moonTop = A.G - 104;
      if (t < 1400) { A.walk(T, A.x0, c - 6, 300, 900); A.walk(S, A.x1, c + 6, 400, 1000); A.hop(T, 900, 400, 40); A.hop(S, 1000, 400, 40); if (t > 1250) T.alpha = 0; if (t > 1350) S.alpha = 0; }
      else if (t < 4800) { T.alpha = S.alpha = 0; T.x = c - 6; S.x = c + 6; }
      else if (t < 7600) {
        T.x = mx - 16; S.x = mx + 12; T.lift = S.lift = moonTop; T.alpha = S.alpha = t > 5150 ? 1 : 0;
        A.hop(T, 5300, 900, 30); A.hop(S, 5600, 900, 30); A.hop(T, 6400, 900, 30);
        if (t > 7200) { T.alpha = S.alpha = 0; }
      } else if (t < 9400) { T.alpha = S.alpha = 0; T.x = c - 6; S.x = c + 6; }
      else { T.x = c - 26; S.x = c + 26; A.hop(T, 9400, 400, 30); A.hop(S, 9500, 400, 30); A.say(T, 'Ta-da!', 9500, 10400); }
      A.say({ x: c, y: A.G - 90, face: 1 }, t < 2000 ? '3' : t < 2400 ? '2' : '1', 1600, 2750);
      if (A.once(2800)) A.shake(3);
      if (A.tick(90, 2800, 3600)) A.burst(c + (Math.random() - 0.5) * 20, A.G - 4, 2, 'puff', { speed: 0.06 });
      if (A.once(6300)) A.burst(mx, A.G - moonTop - 40, 8, 'heart');
    },
    back: function (g, A) {
      var U = A.U, c = A.cx, mx = A.cx + A.span - 30, my = 114, sp = A.e(2400, 3200) * (1 - A.e(8800, 9600));
      if (sp > 0) { g.save(); g.globalAlpha *= sp * 0.55; g.fillStyle = '#141A40'; g.fillRect(-200, -200, A.W + 400, A.G + 190); for (var i = 0; i < 30; i++) { var q = Math.sin(i * 91.7) * 9999, r = Math.sin(i * 37.3) * 9999; U.circle(g, (q - Math.floor(q)) * A.W, (r - Math.floor(r)) * (A.G - 20), 1, '#FFF6D6'); } g.restore(); }
      var ma = A.e(1800, 2800) * (1 - A.e(9200, 10000)); if (ma > 0) { g.save(); g.globalAlpha *= ma; U.circle(g, mx, my + 20, 30, '#EDE6D2'); U.circle(g, mx - 10, my + 14, 5, '#D8CFB8'); U.circle(g, mx + 12, my + 28, 4, '#D8CFB8'); U.circle(g, mx + 4, my + 6, 3, '#D8CFB8');
        if (A.t > 6000 && A.t < 9400) { var fh = A.back(6000, 6500); U.line(g, mx + 30, my - 8, mx + 30, my - 8 - 26 * fh, '#6B5A70', 1.4); U.rr(g, mx + 30, my - 34 * fh, 14, 10 * fh, 1, '#FFF3C9'); U.heart(g, mx + 37, my - 29 * fh, 3 * fh, '#E4566E'); }
        g.restore(); }
    },
    front: function (g, A) {
      var U = A.U, c = A.cx, mx = A.cx + A.span - 30, t = A.t, x = c, y = A.G, rot = 0;
      var pathUp = function (p) { return { x: mix(c, mx, eio(p)), y: mix(A.G, 106, eio(p)) - Math.sin(p * PI) * 30 }; };
      if (t >= 2800 && t < 4800) { var p = A.p(2800, 4800), a = pathUp(p), b = pathUp(Math.min(1, p + 0.02)); x = a.x; y = a.y; rot = Math.atan2(b.x - a.x, -(b.y - a.y)) * (1 - A.e(4300, 4800)); }
      else if (t >= 4800 && t < 7800) { x = mx; y = 106; }
      else if (t >= 7800 && t < 9400) { var q = 1 - A.p(7800, 9400), a2 = pathUp(q), b2 = pathUp(Math.max(0, q - 0.02)); x = a2.x; y = a2.y; rot = Math.atan2(b2.x - a2.x, -(b2.y - a2.y)) * A.e(7800, 8200) * (1 - A.e(9000, 9400)); }
      var vis = t < 9900 ? 1 : 1 - A.e(9900, 10400); if (vis <= 0) return;
      g.save(); g.globalAlpha *= vis; g.translate(x, y); g.rotate(rot);
      if ((t > 2800 && t < 4600) || (t > 7800 && t < 9300)) U.flame(g, 0, 0, 1.4, A.now);
      U.rr(g, -16, -60, 32, 58, 12, '#F4EFE6'); g.fillStyle = '#E4566E'; g.beginPath(); g.moveTo(-16, -48); g.quadraticCurveTo(0, -84, 16, -48); g.closePath(); g.fill();
      g.fillStyle = '#E4566E'; g.beginPath(); g.moveTo(-16, -18); g.lineTo(-26, -2); g.lineTo(-16, -6); g.closePath(); g.fill(); g.beginPath(); g.moveTo(16, -18); g.lineTo(26, -2); g.lineTo(16, -6); g.closePath(); g.fill();
      [[-6, -38, 'collar'], [7, -24, 'drop']].forEach(function (w) { U.circle(g, w[0], w[1], 6.5, '#7FB8F0'); g.save(); g.beginPath(); g.arc(w[0], w[1], 5.5, 0, TAU); g.clip(); if (t > 1300) A.pup(g, w[2], w[0] - 10, w[1] + 16, 0.42, 1, 'sit'); g.restore(); });
      g.restore();
    } });

  add({ id: 'paint', name: 'A masterpiece', kind: 'cool', dur: 8800,
    cap: 'Sugarfoot is painting a masterpiece. Tidbit is holding very, very still', punch: [6000, 'A portrait of Tidbit! In a golden frame.'],
    at: function (A) { return [A.cx - A.span + 12, A.cx + A.span - 8]; },
    run: function (A, T, S) {
      T.x = A.cx - A.span + 12; T.face = 1; T.tilt = -0.2; T.blink = A.t < 6000 ? false : null;
      S.x = A.cx + A.span - 8; S.face = -1;
      S.over = function (g, A2, i) { var h = A2.headL(i); A2.U.ell(g, h.x - 2, h.y - 10, 10, 3.2, '#E4566E', -0.1); A2.U.circle(g, h.x + 2, h.y - 13, 1.6, '#E4566E'); g.strokeStyle = '#8A6340'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(h.x + 11, h.y + 6); g.lineTo(h.x + 26, h.y - 2); g.stroke(); A2.U.circle(g, h.x + 27, h.y - 3, 2, ['#F27D7D', '#7FB8F0', '#F7DC6F'][Math.floor(A2.t / 700) % 3]); };
      if (A.in(600, 5800)) { S.pivot = 'hind'; S.rot = -0.12 - Math.abs(Math.sin(A.t / 180)) * 0.12; }
      if (A.tick(260, 800, 5600)) A.burst(A.cx + 36 + (Math.random() - 0.5) * 30, A.G - 70 + (Math.random() - 0.5) * 20, 1, 'confetti', { speed: 0.04 });
      A.say(T, '!', 6300, 7000); A.say(T, '<3', 7000, 8000); if (A.t > 7000) { T.tilt = 0; T.wag = 3.5; S.wag = 3.5; }
      if (A.once(6000)) A.burst(A.cx + 36, A.G - 80, 14, 'spark');
    },
    back: function (g, A) {
      var U = A.U, x = A.cx + 36, y = A.G + 2, w = 60, h = 52, top = y - 100;
      U.line(g, x - 20, y, x - 6, top + 10, '#8A6340', 3); U.line(g, x + 20, y, x + 6, top + 10, '#8A6340', 3); U.line(g, x, y, x, top + 30, '#8A6340', 2.4);
      U.rr(g, x - w / 2, top, w, h, 2, '#FFFFFF');
      var rev = A.e(700, 5800);
      g.save(); g.beginPath();
      for (var i = 0; i < 8; i++) { var p = clamp(rev * 8 - i, 0, 1); if (p > 0) g.rect(x - w / 2, top + i * h / 8, w * p, h / 8 + 0.5); }
      g.clip(); U.rr(g, x - w / 2, top, w, h, 0, '#CFE8F7'); U.rr(g, x - w / 2, top + h * 0.72, w, h * 0.28, 0, '#9AD17F'); U.circle(g, x + 18, top + 12, 6, '#FFE68A');
      A.pup(g, 'collar', x - 4, top + h * 0.86, 0.62, 1, 'sit', 0.2); g.restore();
      if (A.t > 6000) { var f = A.back(6000, 6500); g.strokeStyle = '#E3AE2F'; g.lineWidth = 4 * f; g.strokeRect(x - w / 2 - 2, top - 2, w + 4, h + 4); }
    } });

  add({ id: 'sandcastle', name: 'Sandcastle kingdom', kind: 'cool', dur: 9400,
    cap: 'Building a sandcastle together, one pat at a time', punch: [4200, 'Sparkle… it’s turning into a REAL castle!'],
    run: function (A, T, S) {
      T.x = A.cx - 64; S.x = A.cx + 64;
      if (A.in(300, 3400)) { T.pose = (Math.floor(A.t / 500) % 2) ? 'bow' : 'sit'; S.pose = (Math.floor(A.t / 500) % 2) ? 'sit' : 'bow'; }
      if (A.tick(250, 300, 3400)) A.burst(A.cx + (Math.random() - 0.5) * 50, A.G - 4, 2, 'dirt', { col: '#E6C98A' });
      A.say(T, '?', 3600, 4200); A.say(S, 'Whoa!', 4800, 5800); A.say(T, 'Whoa!', 5000, 6000);
      if (A.t > 6400) { T.x = A.cx - 30; S.x = A.cx + 30; A.hop(T, 6400, 700, 30); A.hop(S, 6600, 700, 30); if (A.t > 7100) T.lift += 140; if (A.t > 7300) S.lift += 140;
        if (A.in(6400, 7100)) T.lift += 140 * A.e(6400, 7100); if (A.in(6600, 7300)) S.lift += 140 * A.e(6600, 7300);
        var crown = function (g, A2, i) { var h = A2.headL(i); A2.U.crown(g, h.x - 1, h.y - 9, 0.8); }; if (A.t > 7400) { T.over = crown; S.over = crown; } }
      if (A.once(4200)) A.burst(A.cx, A.G - 40, 16, 'spark', { speed: 0.12 });
      if (A.once(7500)) A.burst(A.cx, A.G - 170, 20, 'confetti', { speed: 0.12, spread: 3 });
    },
    back: function (g, A) {
      var U = A.U, c = A.cx, y = A.G + 4, build = A.e(300, 3400), grow = A.e(4400, 6200);
      if (!A.water) { U.rr(g, c - 70, y - 6, 140, 10, 3, '#C9A77A'); U.rr(g, c - 66, y - 6, 132, 6, 2, '#F3DEA8'); }
      var col = grow > 0 ? 'rgb(' + Math.round(mix(233, 238, grow)) + ',' + Math.round(mix(203, 210, grow)) + ',' + Math.round(mix(133, 230, grow)) + ')' : '#E9CB85';
      var s = mix(0.45, 1, grow), hh = build * 40 * s;
      function tower(x, h, w) { U.rr(g, x - w / 2, y - h, w, h, 2, col); for (var k = 0; k < 3; k++) U.rr(g, x - w / 2 + k * w / 3 + 1, y - h - 5 * s, w / 3 - 2, 5 * s, 1, col); if (grow > 0.3) { U.line(g, x, y - h - 5 * s, x, y - h - 24 * s, '#6B5A70', 1.2); g.fillStyle = '#E4566E'; g.beginPath(); g.moveTo(x, y - h - 24 * s); g.lineTo(x + 10 * s * (1 + Math.sin(A.t / 200) * 0.15), y - h - 20 * s); g.lineTo(x, y - h - 16 * s); g.fill(); } }
      if (hh < 1) return;
      tower(c - 30, hh * 1.9 + (grow ? 60 * grow : 0), 18 * s + 6); tower(c + 30, hh * 1.9 + (grow ? 60 * grow : 0), 18 * s + 6); tower(c, hh * 1.3 + 30 * grow, 30 * s + 8);
      U.rr(g, c - 30, y - hh * 1.1, 60, hh * 1.1, 2, col);
      if (grow > 0.2) { U.rr(g, c - 7, y - 24 * s, 14, 24 * s, 7, '#8A6340'); U.rr(g, c - 26, y - hh * 1.5, 6, 8, 3, A.dark ? '#FCE38A' : '#7A6F9A'); U.rr(g, c + 20, y - hh * 1.5, 6, 8, 3, A.dark ? '#FCE38A' : '#7A6F9A'); }
    } });

  add({ id: 'fireworks', name: 'Fireworks conductor', kind: 'cool', dur: 8600,
    cap: 'Maestro Tidbit conducts the fireworks. Every wave of her baton, BOOM', punch: [5800, 'The grand finale!'],
    run: function (A, T, S) {
      T.over = function (g, A2, i) { var h = A2.headL(i); g.strokeStyle = '#F4EFE6'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(h.x + 11, h.y + 6); g.lineTo(h.x + 30, h.y - 12); g.stroke(); A2.U.circle(g, h.x + 30, h.y - 12, 1.6, '#F8D76A'); };
      [900, 2100, 3300, 4500, 5800].forEach(function (t0) { if (A.in(t0 - 300, t0 + 200)) { T.pivot = 'hind'; T.rot = -0.35 * A.bump(t0 - 300, t0 + 200); } });
      A.say(S, 'Ooh!', 1700, 2500); A.say(S, 'Aah!', 3000, 3800); A.say(S, 'Wow!', 6600, 7600);
      S.tilt = -0.25; T.tilt = -0.1;
      var fw = [[900, -40], [2100, 50], [3300, -10], [4500, 70], [5800, -60], [6250, 30], [6700, -5]];
      fw.forEach(function (f, k) { if (A.once(f[0] + 700)) { A.burst(A.cx + f[1], 60 + (k % 3) * 18, A.R ? 12 : 26, 'fw', { spread: TAU, speed: 0.07, grav: 0.00004, life: 1300, col: ['#F27D7D', '#F7DC6F', '#8FD694', '#7FB8F0', '#B79CEB', '#F7A8C2'][k % 6] }); } });
      if (A.t > 7400) { T.pose = S.pose = 'bow'; }
    },
    front: function (g, A) {
      [[900, -40], [2100, 50], [3300, -10], [4500, 70], [5800, -60], [6250, 30], [6700, -5]].forEach(function (f, k) {
        if (!A.in(f[0], f[0] + 700)) return; var p = A.e(f[0], f[0] + 700), x = A.cx + f[1] * p + (A.head(0).x - A.cx) * (1 - p), y = mix(A.G - 20, 60 + (k % 3) * 18, p);
        A.U.circle(g, x, y, 1.8, '#FFF3C9'); g.strokeStyle = 'rgba(255,240,200,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x - (f[1] * 0.05), y + 14); g.stroke();
      });
    } });

  add({ id: 'disco', name: 'Disco night', kind: 'cool', dur: 8600,
    cap: 'The mirror ball comes down. It’s disco time!', punch: [3800, 'Tidbit dips Sugarfoot. The crowd (a snail) goes wild.'],
    run: function (A, T, S) {
      if (A.in(1200, 2600)) { T.pose = S.pose = 'wiggle'; T.wag = S.wag = 4; }
      A.spin(T, 2600, 900, 1); A.spin(S, 2700, 900, 1);
      if (A.in(3800, 5000)) { T.x = A.cx - 20; S.x = A.cx + 26; S.pivot = 'hind'; S.rot = -0.55 * A.bump(3800, 5000); T.pivot = 'hind'; T.rot = -0.2 * A.bump(3800, 5000); }
      if (A.once(4300)) A.burst(A.cx, A.G - 80, 6, 'heart');
      if (A.in(5000, 6600)) { var b = Math.floor((A.t - 5000) / 400) % 2 ? 1 : -1; T.x = A.x0 + b * 14 * A.e(5000, 5200); S.x = A.x1 + b * 14 * A.e(5000, 5200); A.hop(T, 5000 + 400 * Math.floor((A.t - 5000) / 400), 220, 10); A.hop(S, 5000 + 400 * Math.floor((A.t - 5000) / 400), 220, 10); }
      A.flip(S, 6800, 700, 50, 1, -1); A.spin(T, 6800, 700, 2);
      if (A.once(7300)) A.burst(A.cx, A.G - 110, 28, 'confetti', { speed: 0.15, spread: 3.4 });
      if (A.tick(500, 1000, 6600)) A.burst(A.cx + (Math.random() - 0.5) * 100, A.G - 80, 1, 'note');
    },
    back: function (g, A) {
      var dim = A.e(0, 900) * (1 - A.e(7800, 8600)) * (A.dark ? 0.15 : 0.3);
      if (dim > 0) { g.save(); g.fillStyle = 'rgba(30,20,60,' + dim.toFixed(3) + ')'; g.fillRect(-300, -300, A.W + 600, A.H + 600); g.restore(); }
      var on = A.e(900, 1500) * (1 - A.e(7800, 8600)); if (on <= 0) return;
      for (var i = 0; i < (A.R ? 8 : 14); i++) { var a = i / 14 * TAU + A.t / 2400, r = 40 + (i % 4) * 32, hue = (i * 47 + A.t / 40) % 360;
        g.fillStyle = 'hsla(' + hue.toFixed(0) + ',85%,70%,' + (0.28 * on).toFixed(2) + ')'; g.beginPath(); g.ellipse(A.cx + Math.cos(a) * r * 1.4, A.G - 60 + Math.sin(a) * r * 0.5, 7, 4, 0, 0, TAU); g.fill(); }
    },
    front: function (g, A) {
      var y = mix(-30, 46, A.back(0, 1000)) - A.e(7800, 8600) * 90, x = A.cx;
      A.U.line(g, x, -40, x, y - 12, 'rgba(90,80,110,.6)', 1);
      A.U.circle(g, x, y, 13, '#C9CEDA'); for (var i = 0; i < 16; i++) { var a = i / 16 * TAU + A.t / 800, br = 0.5 + 0.5 * Math.sin(A.t / 300 + i); A.U.rr(g, x + Math.cos(a) * 7 - 2, y + Math.sin(a) * 7 - 2, 4, 4, 1, 'rgba(255,255,255,' + (0.3 + br * 0.5).toFixed(2) + ')'); }
    } });

  add({ id: 'ninja', name: 'Ninja cartwheels', kind: 'cool', dur: 7800,
    cap: 'Ninja Sugarfoot bows… then cartwheels across the garden', punch: [3800, 'Hi-yah! One falling leaf, two neat halves.'],
    at: function (A) { return [A.cx - A.span + 8, A.cx + A.span - 8]; },
    run: function (A, T, S) {
      var c = A.cx; T.x = c - A.span + 8; T.face = 1;
      S.over = function (g, A2, i) { var h = A2.headL(i); A2.U.rr(g, h.x - 10, h.y - 6, 20, 3.4, 1, '#E4566E'); g.strokeStyle = '#E4566E'; g.lineWidth = 2; g.beginPath(); g.moveTo(h.x - 10, h.y - 4); g.quadraticCurveTo(h.x - 18, h.y - 2 + Math.sin(A2.now / 90) * 3, h.x - 24, h.y + Math.sin(A2.now / 70) * 4); g.stroke(); };
      if (A.in(300, 900)) S.pose = 'bow';
      if (A.t >= 1000 && A.t < 3100) { var p = A.p(1000, 3100); S.x = mix(A.cx + A.span - 8, c - 20, p); S.rot = TAU * 3 * p; S.lift = 14 * Math.abs(Math.sin(3 * PI * p)); S.face = -1; S.pose = 'run'; S.ph = 1.3; }
      if (A.t >= 3100) { S.x = c - 20; S.face = -1; }
      if (A.in(3600, 4000)) { S.pivot = 'hind'; S.rot = -0.5 * A.bump(3600, 3800) + 0.3 * A.bump(3800, 4000); }
      A.say(S, 'Hi-yah!', 3700, 4500); A.say(T, 'Whoa!', 4200, 5000);
      if (A.t > 5200 && A.t < 6600) { var q = A.p(5200, 6200); T.x = mix(c - A.span + 8, c - 70, q); T.rot = TAU * 0.75 * eio(q); T.lift = 10 * Math.sin(q * PI); if (q >= 1) { T.pose = 'lie'; T.rot = 0; } }
      if (A.t >= 6200) { T.x = c - 70; T.pose = A.t < 6800 ? 'lie' : 'sit'; A.say(T, 'Hee!', 6300, 7200); }
      if (A.t > 7000) { S.pose = T.pose = 'bow'; }
    },
    front: function (g, A) {
      var U = A.U, x = A.cx - 50, t = A.t;
      if (t < 3200 || t > 6000) return;
      if (t < 3800) { var y = mix(20, A.G - 70, A.p(3200, 3800)); g.save(); g.translate(x + Math.sin(t / 150) * 8, y); g.rotate(t / 300); U.ell(g, 0, 0, 7, 3.4, '#8FC46B'); g.restore(); }
      else { var p = A.p(3800, 6000), y2 = mix(A.G - 70, A.G, p); [-1, 1].forEach(function (s) { g.save(); g.translate(x + s * (4 + p * 14), y2); g.rotate(s * (0.4 + p * 3)); g.beginPath(); g.ellipse(0, 0, 7, 3.4, 0, s > 0 ? 0 : PI, s > 0 ? PI : TAU); g.fillStyle = '#8FC46B'; g.fill(); g.restore(); }); }
    } });

  add({ id: 'balloon', name: 'Hot air balloon', kind: 'cool', dur: 9800,
    cap: 'A hot air balloon lands, and two passengers hop right in', punch: [3000, 'Up, up and away! Waving to everyone below.'],
    run: function (A, T, S) {
      var c = A.cx, t = A.t, alt = 0, dx = 0;
      if (t > 2800 && t < 7200) { alt = 110 * A.e(2800, 4400) * (1 - A.e(6800, 8400)); dx = Math.sin(A.p(2800, 8400) * TAU) * (A.span - 40); }
      if (t >= 7200) { alt = 110 * (1 - A.e(6800, 8400)); dx = Math.sin(A.p(2800, 8400) * TAU) * (A.span - 40) * (1 - A.e(7600, 8400)); }
      if (t < 1800) { T.x = A.x0; S.x = A.x1; }
      if (t >= 1600 && t < 8600) { var inT = A.e(1600, 2200), inS = A.e(2000, 2600); T.x = mix(A.x0, c + dx - 14, inT); S.x = mix(A.x1, c + dx + 14, inS); T.lift = alt + 6 * inT + 40 * Math.sin(inT * PI); S.lift = alt + 6 * inS + 40 * Math.sin(inS * PI); T.z = S.z = 0; T.pose = S.pose = 'sit'; }
      if (t >= 8600) { T.x = mix(c - 14, A.x0, A.e(8600, 9300)); S.x = mix(c + 14, A.x1, A.e(8700, 9400)); A.hop(T, 8600, 700, 30); A.hop(S, 8700, 700, 30); }
      if (A.in(4600, 6400)) { T.pivot = S.pivot = 'hind'; T.rot = -0.35 * Math.abs(Math.sin(t / 300)); S.rot = -0.35 * Math.abs(Math.sin(t / 300 + 1)); }
      A.say(T, 'Wheee!', 3400, 4300); A.say(S, 'Hi!', 4800, 5600);
    },
    back: function (g, A) { this._draw(g, A, 'back'); },
    front: function (g, A) { this._draw(g, A, 'front'); },
    _draw: function (g, A, layer) {
      var U = A.U, c = A.cx, t = A.t, alt = 0, dx = 0;
      if (t > 2800) { alt = 110 * A.e(2800, 4400) * (1 - A.e(6800, 8400)); dx = Math.sin(A.p(2800, 8400) * TAU) * (A.span - 40) * (t >= 7200 ? 1 - A.e(7600, 8400) : 1); }
      var land = t < 1400 ? mix(-200, 0, A.e(0, 1400)) : t > 8800 ? -A.e(8800, 9800) * 240 : 0, y = A.G + 4 - alt + land, x = c + dx + (t > 8800 ? A.e(8800, 9800) * 60 : 0);
      if (layer === 'back') {
        g.strokeStyle = '#8A6340'; g.lineWidth = 1; [[-20, -30], [20, 30]].forEach(function (p) { g.beginPath(); g.moveTo(x + p[0], y - 24); g.lineTo(x + p[1], y - 88); g.stroke(); });
        var cols = ['#E4566E', '#F7DC6F', '#7FB8F0', '#F7DC6F', '#E4566E'];
        for (var i = 0; i < 5; i++) { g.fillStyle = cols[i]; g.beginPath(); g.ellipse(x, y - 124, 44 * (1 - Math.abs(i - 2) * 0.3), 46, 0, 0, TAU); g.fill(); }
        U.circle(g, x - 14, y - 142, 7, 'rgba(255,255,255,.35)');
        if ((t > 2800 && t < 4400) || (t > 5600 && t < 6000)) U.flame(g, x, y - 82, 0.9, A.now);
        U.rr(g, x - 30, y - 26, 60, 22, 3, '#A57640');
      } else { U.rr(g, x - 31, y - 18, 62, 18, 3, '#C8955A'); g.strokeStyle = '#A57640'; g.lineWidth = 1; for (var k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x - 31, y - 14 + k * 5); g.lineTo(x + 31, y - 14 + k * 5); g.stroke(); } }
    } });

  add({ id: 'snowball', name: 'Snowball fight', kind: 'cool', dur: 8800,
    cap: 'A snowball fight! (A little snow cloud came just for this.)', punch: [5400, 'Mid-air snowball crash! Then snow angels.'],
    run: function (A, T, S) {
      if (A.in(1500, 2200)) { T.pose = S.pose = 'bow'; }
      [[2400, T], [3200, S], [4000, T], [5000, T], [5000, S]].forEach(function (q) { if (A.in(q[0] - 250, q[0] + 150)) { q[1].pivot = 'hind'; q[1].rot = -0.35 * A.bump(q[0] - 250, q[0] + 150); } });
      if (A.in(2600, 3000)) { S.pose = 'bow'; } A.say(S, 'Missed!', 3000, 3700);
      if (A.in(3500, 4000)) { T.rot = Math.sin(A.t / 30) * 0.15; A.say(T, '!', 3550, 4100); }
      if (A.in(4300, 4800)) { S.rot = Math.sin(A.t / 30) * 0.15; }
      if (A.t > 6200) { T.pose = S.pose = 'lie'; T.rot = Math.sin(A.t / 180) * 0.12; S.rot = Math.sin(A.t / 180 + 1) * 0.12; laugh(A, T, S, 6300); T.lift = S.lift = 0; }
      [[3480, 0], [4280, 1]].forEach(function (h) { if (A.once(h[0])) A.burst(A.head(h[1]).x, A.head(h[1]).y, 10, 'snow', { speed: 0.1, spread: 3 }); });
      if (A.once(5550)) { A.burst(A.cx, A.G - 90, 30, 'snow', { speed: 0.14, spread: TAU, grav: 0.0002 }); A.shake(2); }
    },
    back: function (g, A) {
      var U = A.U;
      if (!A.snow) { var a = A.e(0, 1200); g.save(); g.globalAlpha *= a * (1 - A.e(8000, 8800) * 0.6); U.ell(g, A.cx, A.G + 8, A.span + 40, 22, '#F7FAFE'); g.restore();
        if (A.t < 2400) { g.save(); g.globalAlpha *= a * (1 - A.e(1600, 2400)); U.cloud(g, A.cx - 20, 40, 1.2, '#EEF2F8'); for (var i = 0; i < 10; i++) U.circle(g, A.cx - 26 + i * 8, 56 + ((A.t / 8 + i * 29) % 160), 1.6, '#FFFFFF'); g.restore(); } }
      if (A.t > 6300) { g.save(); g.globalAlpha *= 0.5; [0, 1].forEach(function (i) { var p = A.pos(i); U.ell(g, p.x, A.G + 6, 30 + Math.abs(Math.sin(A.t / 180)) * 6, 6, '#DDE8F4'); }); g.restore(); }
    },
    front: function (g, A) {
      var U = A.U, m0 = A.mouth(0), m1 = A.mouth(1);
      function ball(t0, from, to, h, miss) { if (!A.in(t0, t0 + 700)) return; var p = A.p(t0, t0 + 700), tx = miss ? to.x + (to.x - from.x) * 0.5 : to.x, q = arcPt(p, from.x, from.y, tx, to.y - 4, h); U.circle(g, q.x, q.y, 5, '#FFFFFF'); U.circle(g, q.x - 1.5, q.y - 1.5, 1.8, 'rgba(200,220,245,.9)'); }
      ball(2400, m0, m1, 40, true); ball(3200 - 420, m1, m0, 40, false); ball(4000 - 420, m0, m1, 40, false);
      ball(4300 + 480, m1, m0, 40, false);
      if (A.in(5000, 5550)) { var p = A.p(5000, 5550); var a = arcPt(p, m0.x, m0.y, A.cx, A.G - 90, 40), b = arcPt(p, m1.x, m1.y, A.cx, A.G - 90, 40); U.circle(g, a.x, a.y, 6, '#FFFFFF'); U.circle(g, b.x, b.y, 6, '#FFFFFF'); }
    } });

  add({ id: 'bubbles', name: 'Giant bubbles', kind: 'cool', dur: 9400,
    cap: 'A bubble-blowing contest. Whose bubble will be biggest?', punch: [5000, 'Bubbles so big they float away inside them!'],
    run: function (A, T, S) {
      if (A.in(600, 1800)) { T.sx *= 1 + A.bump(600, 1800) * 0.06; }
      if (A.in(2000, 3200)) { S.sx *= 1 + A.bump(2000, 3200) * 0.06; }
      A.say(T, 'Ooh!', 3300, 4100);
      if (A.t > 5000 && A.t < 8600) { var up = A.e(5000, 6400) * (1 - A.e(7700, 8600)); T.lift = up * 84 + Math.sin(A.t / 500) * 6 * up; S.lift = up * 96 + Math.sin(A.t / 500 + 1.6) * 6 * up; T.x = A.x0 + Math.sin(A.t / 900) * 18 * up; S.x = A.x1 + Math.sin(A.t / 900 + 2) * 18 * up; T.pose = S.pose = 'run'; T.ph = S.ph = 1.2; }
      A.say(T, 'Wheee!', 5800, 6800); A.say(S, 'Wheee!', 6100, 7100);
      if (A.once(7700)) { A.burst(A.pos(0).x, A.pos(0).y - 24, 10, 'spark', { spread: TAU, speed: 0.08 }); A.burst(A.pos(1).x, A.pos(1).y - 24, 10, 'spark', { spread: TAU, speed: 0.08 }); }
      if (A.t > 8600) { T.wag = S.wag = 3; }
    },
    front: function (g, A) {
      function bub(x, y, r, a) { if (!(r >= 2) || a <= 0) return; g.save(); g.globalAlpha *= a; g.fillStyle = 'rgba(200,230,255,.16)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.lineWidth = 1.6; g.strokeStyle = 'rgba(160,200,255,.8)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.strokeStyle = 'rgba(255,170,220,.7)'; g.beginPath(); g.arc(x, y, r - 1.5, 2.4, 3.8); g.stroke(); A.U.ell(g, x - r * 0.4, y - r * 0.45, r * 0.18, r * 0.1, 'rgba(255,255,255,.8)', -0.6); g.restore(); }
      var m0 = A.mouth(0), m1 = A.mouth(1);
      g.strokeStyle = '#B79CEB'; g.lineWidth = 1.4;
      if (A.t < 5000) { [m0, m1].forEach(function (m) { g.beginPath(); g.arc(m.x + m.face * 6, m.y - 2, 4, 0, TAU); g.stroke(); }); }
      var r1 = 18 * A.e(600, 1800), y1 = m0.y - 6 - A.e(1800, 5000) * 140; bub(m0.x + m0.face * 6 + (A.t > 1800 ? Math.sin(A.t / 400) * 10 : 0) + r1 * m0.face, y1, r1, 1 - A.e(4200, 5000));
      var r2 = 30 * A.e(2000, 3200), y2 = m1.y - 10 - A.e(3200, 5200) * 120; bub(m1.x + m1.face * 6 + r2 * m1.face + (A.t > 3200 ? Math.sin(A.t / 450) * 10 : 0), y2, r2, 1 - A.e(4600, 5200));
      if (A.t > 4600 && A.t < 7700) { var s = A.back(4600, 5200); [0, 1].forEach(function (i) { var p = A.pos(i); bub(p.x, p.y - 26, 44 * s, 1); }); }
    } });

  add({ id: 'capes', name: 'Superhero flight', kind: 'cool', dur: 7800,
    cap: 'Capes on. Super Tidbit and Super Sugarfoot take to the sky', punch: [5600, 'Superhero landing! Both of them. At once.'],
    run: function (A, T, S) {
      T.cape = '#7C97E8'; S.cape = '#E4566E';
      if (A.in(300, 1200)) { T.pivot = S.pivot = 'hind'; T.rot = S.rot = -0.3 * A.bump(300, 1200); T.face = S.face = 1; }
      if (A.t >= 1200 && A.t < 5600) {
        [[T, 0], [S, 0.9]].forEach(function (q) { var d = q[0], p = A.p(1200, 5600) * TAU - q[1] * A.e(1200, 1800), up = A.e(1200, 1900) * (1 - A.e(5000, 5600));
          d.x = mix(d.x, A.cx + (A.span - 10) * Math.sin(p), up); d.lift = up * (86 + 34 * Math.cos(p * 2)); d.face = Math.cos(p) >= 0 ? 1 : -1; d.capeFly = up > 0.2; d.pose = 'run'; d.ph = PI / 2; d.rot = 0.12 * Math.cos(p); });
      }
      if (A.t >= 5600) { T.pose = S.pose = A.t < 6400 ? 'bow' : 'sit'; if (A.once(5600)) { A.shake(3); A.burst(A.x0, A.G - 2, 6, 'puff', { speed: 0.06 }); A.burst(A.x1, A.G - 2, 6, 'puff', { speed: 0.06 }); } }
      A.say(T, 'Ta-da!', 6200, 7200); A.say(S, 'Ta-da!', 6400, 7400);
    } });

  add({ id: 'trampoline', name: 'Trampoline tricks', kind: 'cool', dur: 7800,
    cap: 'Bounce, bounce, BOUNCE! Higher every time', punch: [4800, 'Double flip and a high five at the very top!'],
    run: function (A, T, S) {
      T.x = A.cx - 24; S.x = A.cx + 24;
      function bounce(d, ph) { var t = A.t + ph, k = Math.floor(t / 800), p = (t % 800) / 800, h = Math.min(90, 26 + k * 12); d.lift = 16 + h * 4 * p * (1 - p); if (p < 0.08 || p > 0.92) { d.sy *= 0.9; d.sx *= 1.06; } d.pose = 'run'; d.ph = 1.2; }
      if (A.t < 4800) { bounce(T, 0); bounce(S, 400); }
      else if (A.t < 6200) { var p = A.p(4800, 6200); T.lift = S.lift = 16 + 120 * 4 * p * (1 - p); T.rot = -TAU * eio(p); S.rot = -TAU * eio(p); T.pose = S.pose = 'run'; T.ph = S.ph = 1.2; }
      else { T.lift = S.lift = 16; A.hop(T, 6200, 1, 0); A.hop(S, 6200, 1, 0); laugh(A, T, S, 6600); T.lift += 16; S.lift += 16; }
      if (A.once(5500)) A.burst(A.cx, A.G - 130, 14, 'spark', { spread: TAU });
    },
    back: function (g, A) {
      var U = A.U, c = A.cx, y = A.G + 2, sag = Math.max(0, 1 - Math.min(A.pos(0).y > A.G - 20 ? 1 : 0, 1)) * 0;
      U.line(g, c - 58, y - 16, c - 50, y, '#6B5A70', 3); U.line(g, c + 58, y - 16, c + 50, y, '#6B5A70', 3);
      var low = [0, 1].some(function (i) { return A.pos(i).y > A.G - 20; });
      g.strokeStyle = '#3C3350'; g.lineWidth = 4; g.beginPath(); g.moveTo(c - 60, y - 16); g.quadraticCurveTo(c, y - 16 + (low ? 8 : 0), c + 60, y - 16); g.stroke();
      U.rr(g, c - 64, y - 20, 8, 5, 2, '#7FB8F0'); U.rr(g, c + 56, y - 20, 8, 5, 2, '#7FB8F0');
    } });

  add({ id: 'unicycle', name: 'Unicycle act', kind: 'cool', dur: 7800,
    cap: 'Tidbit rides a unicycle. Wobble, wobble, balance!', punch: [4400, 'A wheelie hop and a spin. Sugarfoot cheers!'],
    run: function (A, T, S) {
      var wheel = function (g, A2) { var r = 9, a = A2.pos(0).x / r; g.strokeStyle = '#3C3350'; g.lineWidth = 2; g.beginPath(); g.arc(0, 14, r, 0, TAU); g.stroke(); for (var k = 0; k < 4; k++) { g.beginPath(); g.moveTo(0, 14); g.lineTo(Math.cos(a + k * PI / 2) * r, 14 + Math.sin(a + k * PI / 2) * r); g.stroke(); } A2.U.rr(g, -1.4, -8, 2.8, 22, 1, '#8E6B9E'); A2.U.rr(g, -6, -10, 12, 3, 1.5, '#3C3350'); };
      T.under = wheel; T.lift = 21; T.pose = 'run'; T.ph = 1.3; T.rot = Math.sin(A.t / 210) * 0.07;
      A.walk(T, A.x0, A.cx + 40, 400, 2000); A.walk(T, A.cx + 40, A.x0, 2200, 3800); if (A.t > 2000 && A.t < 2200) T.face = 1;
      T.pose = 'run'; T.ph = 1.3;
      A.hop(T, 4400, 500, 34); A.spin(T, 5100, 700, 1);
      S.x = A.x1 + 20; S.face = -1; S.wag = 3;
      A.say(S, 'Wow!', 4600, 5400); if (A.t > 5200) { A.hop(S, 5300, 300, 16); A.hop(S, 5700, 300, 16); }
      if (A.t > 6400) { T.under = null; T.lift = 0; T.pose = 'bow'; A.hop(T, 6300, 400, 26); }
      if (A.once(6700)) A.burst(A.x0, A.G - 60, 8, 'spark');
    } });

  add({ id: 'tightrope', name: 'Tightrope walk', kind: 'cool', dur: 8800,
    cap: 'Sugarfoot walks the tightrope. Tidbit stays right underneath, just in case', punch: [6400, 'Made it! And a flip for the finish.'],
    at: function (A) { return [A.cx - A.span + 34, A.cx - A.span + 6]; },
    run: function (A, T, S) {
      var c = A.cx, x0 = c - A.span + 6, x1 = c + A.span - 6, H = 66;
      function rope(x) { var u = (x - c) / (x1 - c); return H - 8 * (1 - u * u); }
      if (A.t < 900) { S.x = x0; if (A.t > 300) S.lift = mix(0, rope(x0), A.e(300, 900)); A.hop(S, 300, 600, 30); }
      if (A.t >= 900 && A.t < 6400) { S.x = mix(x0, x1, A.e(900, 6400)); S.lift = rope(S.x); S.pose = 'run'; S.rot = Math.sin(A.t / 260) * 0.08 + (A.in(3400, 4200) ? Math.sin(A.t / 60) * 0.18 * A.bump(3400, 4200) : 0); S.face = 1; }
      if (A.t >= 6400) { S.x = x1; S.lift = mix(rope(x1), 0, A.e(6400, 7200)); var p = A.p(6400, 7200); S.lift += 40 * 4 * p * (1 - p); S.rot = -TAU * eio(p); }
      S.over = function (g) { g.strokeStyle = '#6B5A70'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-2, -40); g.lineTo(-2, -58); g.stroke(); g.fillStyle = '#F7A8C2'; g.beginPath(); g.moveTo(-20, -52); g.quadraticCurveTo(-2, -76, 16, -52); g.closePath(); g.fill(); };
      if (A.t > 7200) S.over = null;
      T.x = clamp(S.x - 30, c - A.span + 34, c + A.span - 40); T.pose = A.t > 900 && A.t < 6400 ? 'run' : 'sit'; T.face = 1; T.tilt = -0.2;
      A.say(T, '!', 3400, 4100); A.say(S, 'Ta-da!', 7200, 8200); A.say(T, 'Wow!', 7400, 8400);
      if (A.once(7200)) A.burst(x1, A.G - 60, 12, 'spark');
    },
    back: function (g, A) {
      var U = A.U, c = A.cx, x0 = c - A.span + 6, x1 = c + A.span - 6, H = 66, y = A.G;
      U.rr(g, x0 - 14, y - H - 4, 5, H + 6, 2, '#8A6340'); U.rr(g, x1 + 9, y - H - 4, 5, H + 6, 2, '#8A6340');
      g.strokeStyle = '#6B5A70'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x0 - 12, y - H); g.quadraticCurveTo(c, y - H + 16, x1 + 12, y - H); g.stroke();
    } });

  add({ id: 'piano', name: 'Piano duet', kind: 'cool', dur: 8200,
    cap: 'A piano duet: Tidbit takes the low notes, Sugarfoot the high ones', punch: [6200, 'The big finish: both paws, one huge chord!'],
    run: function (A, T, S) {
      T.x = A.cx - 50; S.x = A.cx + 50; T.pivot = S.pivot = 'hind';
      T.rot = -0.25 - (A.t < 6200 ? Math.abs(Math.sin(A.t / (A.t > 4000 ? 110 : 220))) * 0.15 : 0);
      S.rot = -0.25 - (A.t < 6200 ? Math.abs(Math.sin(A.t / (A.t > 4000 ? 90 : 150) + 1)) * 0.15 : 0);
      if (A.in(6000, 6600)) { T.rot = S.rot = -0.5 * A.bump(6000, 6400) - 0.1; }
      if (A.tick(A.t > 4000 ? 220 : 440, 300, 6000)) A.burst(A.cx - 20, A.G - 50, 1, 'note');
      if (A.tick(A.t > 4000 ? 180 : 300, 300, 6000)) A.burst(A.cx + 20, A.G - 50, 1, 'note');
      if (A.once(6300)) { A.burst(A.cx, A.G - 60, 10, 'note', { speed: 0.1, spread: 2 }); A.burst(A.cx, A.G - 90, 18, 'confetti', { speed: 0.12, spread: 3 }); }
      if (A.t > 6800) { T.rot = S.rot = 0; T.pose = S.pose = 'bow'; }
    },
    front: function (g, A) {
      var U = A.U, c = A.cx, y = A.G + 2;
      U.rr(g, c - 36, y - 40, 72, 16, 3, '#2C2638'); U.rr(g, c - 30, y - 24, 4, 24, 1, '#2C2638'); U.rr(g, c + 26, y - 24, 4, 24, 1, '#2C2638');
      for (var i = 0; i < 12; i++) { var lit = A.t < 6600 && ((i < 6 && Math.floor(A.t / 220 + i * 3) % 7 === 0) || (i >= 6 && Math.floor(A.t / 150 + i * 5) % 6 === 0)); U.rr(g, c - 33 + i * 5.5, y - 38, 5, 9, 1, lit || A.in(6200, 6700) ? '#F7DC6F' : '#FFFFFF'); }
      for (var k = 0; k < 11; k++) if (k % 7 !== 2 && k % 7 !== 6) U.rr(g, c - 29.5 + k * 5.5, y - 38, 3, 5, 0.5, '#2C2638');
    } });

  add({ id: 'drums', name: 'Pots-and-pans band', kind: 'silly', dur: 7800,
    cap: 'Tidbit found the pots and pans. Sugarfoot found a maraca. It’s a band!', punch: [6000, 'Drum roll… CRASH! Ta-da!'],
    run: function (A, T, S) {
      T.x = A.cx + 4; T.face = 1; T.pivot = 'hind';
      var fast = A.in(5200, 6000) ? 70 : 250; T.rot = -0.2 - Math.abs(Math.sin(A.t / fast)) * 0.18; T.lift = Math.abs(Math.sin(A.t / 500)) * 3;
      S.x = A.x0 - 12; S.face = 1; S.pose = 'wiggle'; S.wag = 4;
      S.over = function (g, A2, i) { var h = A2.headL(i), sh = Math.sin(A2.now / 60) * 3; g.strokeStyle = '#8A6340'; g.lineWidth = 2; g.beginPath(); g.moveTo(h.x + 11, h.y + 6); g.lineTo(h.x + 20, h.y - 2 + sh); g.stroke(); A2.U.ell(g, h.x + 23, h.y - 5 + sh, 5, 6, '#F6B26B'); A2.U.circle(g, h.x + 22, h.y - 7 + sh, 1.2, '#E4566E'); };
      if (A.in(6000, 6600)) { T.rot = -0.6 * A.bump(6000, 6600); }
      if (A.once(6100)) { A.burst(A.cx + 44, A.G - 56, 14, 'spark', { spread: TAU }); A.shake(1.5); }
      A.say(T, 'Ta-da!', 6400, 7400); A.say(S, 'Ta-da!', 6600, 7600);
      if (A.tick(500, 200, 5200)) A.burst(A.cx + 30, A.G - 60, 1, 'note');
    },
    front: function (g, A) {
      var U = A.U, x = A.cx + 30, y = A.G + 3, beat = Math.abs(Math.sin(A.t / 250));
      [[-4, 12, '#9AA3B8'], [14, 10, '#B7BECF'], [30, 8, '#9AA3B8']].forEach(function (p, i) { var sq = (i === Math.floor(A.t / 500) % 3 ? beat : 0) * 1.5; U.ell(g, x + p[0], y - 12 + sq, p[1], 4, p[2]); U.rr(g, x + p[0] - p[1], y - 12 + sq, p[1] * 2, 12 - sq, 2, p[2]); U.ell(g, x + p[0], y - 12 + sq, p[1] - 2, 2.6, '#DDE2EC'); });
      U.line(g, x + 44, y, x + 44, y - 44, '#6B7388', 1.6); g.save(); g.translate(x + 44, y - 46); g.rotate(A.in(6000, 7000) ? Math.sin(A.t / 40) * 0.3 * (1 - A.p(6000, 7000)) : 0); U.ell(g, 0, 0, 14, 3, '#F2C14E'); g.restore();
    } });

  add({ id: 'kite', name: 'Bone kite', kind: 'cool', dur: 8600,
    cap: 'Tidbit runs with a bone-shaped kite. Up it goes!', punch: [5000, 'Sugarfoot grabs the tail and takes a little ride!'],
    at: function (A) { return [A.cx - A.span + 8, A.cx]; },
    run: function (A, T, S) {
      var c = A.cx; A.walk(T, c - A.span + 8, c + A.span - 30, 500, 2600); if (A.t >= 2600) { T.x = c + A.span - 30; T.face = -1; }
      S.x = c; S.face = 1; if (A.in(600, 2600)) { S.x = mix(c, c + 20, A.e(600, 2600)); S.pose = 'run'; }
      if (A.t > 2600) S.x = c + 20;
      A.hop(S, 3400, 450, 40); A.say(S, '?', 3900, 4500);
      if (A.t >= 5000 && A.t < 7200) { var k = this._kite(A); S.x = k.x - 4; S.lift = Math.max(0, A.G - (k.y + 46) - 4) * A.e(5000, 5400) * (1 - A.e(6800, 7200)) + 40 * A.bump(5000, 5400); S.pose = 'run'; S.ph = 1.2; S.face = -1; }
      if (A.t >= 7200) { S.x = this._kite(A).x - 4; }
      A.say(S, 'Wheee!', 5400, 6400); if (A.t > 7300) laugh(A, T, S, 7300);
    },
    _kite: function (A) {
      var c = A.cx, t = A.t, m = { x: c + A.span - 30, y: A.G - 60 };
      if (t < 600) return { x: A.cx - A.span + 30, y: A.G - 30 };
      var up = A.e(600, 2600), lp = A.in(3600, 4800) ? A.e(3600, 4800) * TAU : 0;
      var x = mix(c - A.span + 30, c - 10, up) + Math.sin(t / 700) * 16 + Math.cos(lp) * 0 + (lp ? Math.sin(lp) * 30 : 0), y = mix(A.G - 30, 70, up) + Math.cos(t / 600) * 8 + (lp ? (1 - Math.cos(lp)) * 24 : 0);
      if (t > 5000) { var s = A.e(5000, 5600) * (1 - A.e(6800, 7400)); y = mix(y, 120, s); x = mix(x, c - 10 + Math.sin(t / 500) * 20, s); }
      return { x: x, y: y, lp: lp };
    },
    front: function (g, A) {
      var U = A.U, k = this._kite(A), m = A.mouth(0);
      if (A.t > 500) { g.strokeStyle = 'rgba(90,80,110,.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(m.x, m.y); g.quadraticCurveTo((m.x + k.x) / 2, (m.y + k.y) / 2 + 30, k.x, k.y); g.stroke(); }
      g.strokeStyle = '#E4566E'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(k.x, k.y); for (var i = 1; i <= 6; i++) g.lineTo(k.x + Math.sin(A.t / 200 + i) * 5, k.y + i * 7); g.stroke();
      for (var j = 1; j <= 5; j += 2) U.ell(g, k.x + Math.sin(A.t / 200 + j) * 5, k.y + j * 7, 3, 1.6, '#F7DC6F');
      U.bone(g, k.x, k.y, 30, (k.lp || 0) + Math.sin(A.t / 500) * 0.2, '#F6EEDD');
    } });

  add({ id: 'skates', name: 'Roller-skate jump', kind: 'cool', dur: 8000,
    cap: 'Sugarfoot on roller skates, one ramp, and Tidbit lying very still…', punch: [3200, 'Over the ramp, over Tidbit, and a perfect skid stop!'],
    at: function (A) { return [A.cx - 6, A.cx + A.span - 6]; },
    run: function (A, T, S) {
      var c = A.cx, rx = c + 44;
      T.x = c - 6; T.pose = 'lie'; T.face = 1; T.sy *= A.in(2600, 3600) ? 0.85 : 1; A.say(T, '!', 2400, 3100);
      S.under = function (g) { [-10, -4, 6, 12].forEach(function (x) { A.U.circle(g, x, 3.5, 2.4, '#E4566E'); }); A.U.rr(g, -14, 0, 30, 2.4, 1, '#3C3350'); };
      S.face = -1; S.pose = 'run'; S.ph = 1.2;
      var x = mix(c + A.span - 6, c - A.span + 14, A.e(1200, 4200)), lift = 0;
      if (x < rx + 24 && x > rx - 4) lift = (rx + 24 - x) / 28 * 22;
      if (x <= rx - 4 && x > c - 76) { var p = (rx - 4 - x) / (rx - 4 - (c - 76)); lift = 22 * (1 - p) + 60 * 4 * p * (1 - p); S.rot = -0.3 * (1 - p); }
      S.x = x; S.lift = lift;
      if (A.t < 1200) { S.rot = Math.sin(A.t / 150) * 0.05; }
      if (A.t > 4200) { A.spin(S, 4300, 600, 1); A.say(S, 'Ta-da!', 4900, 5900); }
      if (A.tick(90, 3600, 4200)) A.burst(A.pos(1).x, A.G - 2, 1, 'puff', { speed: 0.03 });
      if (A.t > 5400) { T.pose = 'sit'; A.hop(T, 5500, 300, 16); A.hop(T, 5900, 300, 16); A.say(T, 'Wow!', 5500, 6400); }
    },
    back: function (g, A) { var rx = A.cx + 44, y = A.G + 2; g.fillStyle = '#C9A77A'; g.beginPath(); g.moveTo(rx - 4, y - 22); g.lineTo(rx + 24, y); g.lineTo(rx - 4, y); g.closePath(); g.fill(); g.fillStyle = '#E9CB85'; g.fillRect(rx - 6, y - 22, 3, 22); } });

  add({ id: 'bowling', name: 'Bowling strike', kind: 'cool', dur: 7800,
    cap: 'Tidbit lines up the bowling ball… and rolls!', punch: [2200, 'STRIKE! Then Sugarfoot knocks one pin with her nose… and they all go down.'],
    at: function (A) { return [A.cx - A.span + 10, A.cx + 10]; },
    run: function (A, T, S) {
      T.x = A.cx - A.span + 10; T.face = 1; if (A.in(500, 1000)) T.pose = 'bow';
      S.x = A.cx + 10;
      A.say(S, 'Strike!', 2300, 3100); if (A.in(2800, 4400)) { S.pose = 'wiggle'; A.spin(S, 3600, 600, 1); }
      A.walk(S, A.cx + 10, A.cx + A.span - 52, 4600, 5400); if (A.t > 5400) { S.x = A.cx + A.span - 52; S.face = 1; if (A.in(5600, 6000)) S.pose = 'bow'; }
      A.say(T, '!!', 6200, 7000); if (A.t > 6400) laugh(A, T, S, 6500);
    },
    front: function (g, A) {
      var U = A.U, px = A.cx + A.span - 22, y = A.G + 2, t = A.t;
      var bx = mix(A.cx - A.span + 34, px + 4, A.e(900, 2200)); if (t > 900 && t < 2300) { U.circle(g, bx, y - 7, 7, '#5B4A86'); U.circle(g, bx - 2, y - 9, 1, '#2C2638'); U.circle(g, bx + 1, y - 10, 1, '#2C2638'); }
      else if (t <= 900) { var m = A.mouth(0); U.circle(g, m.x + 6, y - 7, 7, '#5B4A86'); }
      var pins = [[0, 0], [-7, -3], [7, -3], [-14, -6], [0, -6], [14, -6]];
      pins.forEach(function (p, i) {
        var x = px + p[0], yy = y + p[1] * 0.5, rot = 0, off = 0;
        if (t > 2200 && t < 4400) { var q = A.p(2200 + i * 30, 3000 + i * 30); x += (i % 2 ? 1 : -1) * q * 18 + q * 10; off = -Math.sin(q * PI) * (30 + i * 4); rot = q * (3 + i); }
        else if (t >= 4400 && t < 6000) { var up = A.back(4400, 4900); if (up < 0.05) return; g.save(); g.globalAlpha *= up; }
        else if (t >= 6000) { rot = A.e(6000 + i * 120, 6300 + i * 120) * 1.4; }
        g.save(); g.translate(x, yy + off); g.rotate(rot); U.ell(g, 0, -8, 3.2, 8, '#FFFFFF'); U.circle(g, 0, -16, 2.6, '#FFFFFF'); U.rr(g, -3, -13, 6, 1.6, 0, '#E4566E'); g.restore();
        if (t >= 4400 && t < 6000) g.restore();
      });
    } });

  add({ id: 'juggle', name: 'Juggling lesson', kind: 'cool', dur: 9200,
    cap: 'Tidbit is teaching Sugarfoot to juggle tennis balls', punch: [5800, 'Practice pays off: Sugarfoot juggles FOUR!'],
    run: function (A, T, S) {
      T.tilt = A.t < 3600 ? -0.2 + Math.sin(A.t / 300) * 0.05 : 0; T.pose = 'sit';
      if (A.in(3600, 5400)) { S.tilt = -0.2; [3900, 4400, 4900].forEach(function (t0) { if (A.in(t0, t0 + 200)) { S.sy *= 0.9; } if (A.once(t0)) A.burst(A.head(1).x, A.head(1).y - 10, 3, 'star', { speed: 0.05 }); }); A.say(S, '?', 4000, 4800); A.say(T, 'Ha!', 4600, 5300); }
      if (A.t > 5800) { S.tilt = -0.2 + Math.sin(A.t / 280) * 0.05; A.say(T, '!!', 6800, 7600); T.wag = 3.5; }
      if (A.once(7600)) A.burst(A.cx, A.G - 90, 8, 'heart');
      A.say(S, 'Yay!', 7800, 8800);
    },
    front: function (g, A) {
      var U = A.U;
      function juggle(i, n, period, a, b) {
        if (!A.in(a, b)) return; var h = A.head(i);
        for (var j = 0; j < n; j++) { var ph = ((A.t - a) / period + j / n) % 1, u = (ph * 2) % 1, right = ph < 0.5, x = h.x + (right ? mix(-12, 12, u) : mix(12, -12, u)), y = h.y - 14 - 44 * 4 * u * (1 - u); U.ball(g, x, y, 4); }
      }
      juggle(0, 3, 1400, 300, 3600);
      if (A.in(3600, 5400)) { var h1 = A.head(1); [3900, 4400, 4900].forEach(function (t0, j) { var p = A.p(t0 - 400, t0 + 350); if (p <= 0 || p >= 1) return; var y = p < 0.53 ? mix(h1.y - 70, h1.y - 12, p / 0.53) : h1.y - 12 - Math.sin((p - 0.53) / 0.47 * PI) * 16; U.ball(g, h1.x + (j - 1) * 10 + (p > 0.53 ? (p - 0.53) * 40 : 0), y, 4); }); }
      juggle(1, 4, 1500, 5800, 8200);
    } });

  add({ id: 'pawprints', name: 'Paw-print painting', kind: 'cool', dur: 8800,
    cap: 'Paws in the paint, then hop, hop, hop across the canvas…', punch: [6400, 'Stand it up and look: it’s a heart!'],
    run: function (A, T, S) {
      var pts = this._pts(A);
      function follow(d, parity, t0) { var k = -1; for (var i = parity; i < pts.length; i += 2) if (A.t >= pts[i].t) k = i; if (k < 0) return; var prev = k - 2 >= 0 ? pts[k - 2] : null, cur = pts[k], p = clamp((A.t - cur.t) / 220, 0, 1); d.x = prev ? mix(prev.x, cur.x, 1) : cur.x; d.lift = 0; }
      if (A.t > 1000 && A.t < 6000) {
        [[T, 0], [S, 1]].forEach(function (q) { var d = q[0], last = null, nxt = null; for (var i = q[1]; i < pts.length; i += 2) { if (pts[i].t <= A.t) last = pts[i]; else { nxt = pts[i]; break; } }
          if (!last) return; if (!nxt) { d.x = last.x; return; } var p = (A.t - last.t) / (nxt.t - last.t); d.x = mix(last.x, nxt.x, eio(p)); d.lift = Math.sin(p * PI) * 14; d.face = nxt.x >= last.x ? 1 : -1; d.pose = 'run'; d.dy = mix(last.dy, nxt.dy, p); });
      }
      if (A.t >= 6000) { T.x = A.cx - A.span + 20; S.x = A.cx + A.span - 20; T.face = 1; S.face = -1; A.say(T, '<3', 7200, 8200); A.say(S, '<3', 7400, 8400); T.tilt = S.tilt = -0.15; }
      if (A.in(300, 900)) { T.pose = S.pose = 'bow'; }
    },
    _pts: function (A) {
      if (this._c && this._c.cx === A.cx && this._c.sp === A.span) return this._c.pts;
      var out = [], N = 20;
      for (var i = 0; i < N; i++) { var th = (i / N) * TAU + PI; var hx = 16 * Math.pow(Math.sin(th), 3), hy = 13 * Math.cos(th) - 5 * Math.cos(2 * th) - 2 * Math.cos(3 * th) - Math.cos(4 * th); out.push({ x: A.cx + hx * (A.span - 30) / 16, dy: -hy * 0.6, hy: hy, hx: hx, t: 1000 + i * 250, col: i % 2 ? '#E4566E' : '#7C97E8' }); }
      this._c = { cx: A.cx, sp: A.span, pts: out }; return out;
    },
    back: function (g, A) {
      var U = A.U, pts = this._pts(A), up = A.e(6000, 6800), c = A.cx, w = (A.span - 10) * 2, gy = A.G + 6;
      var h = mix(26, 110, up), top = mix(gy - 13, A.G - 130, up);
      if (up > 0) { U.rr(g, c - w / 2 - 3, top - 3, w + 6, h + 6, 4, '#C9A77A'); }
      U.rr(g, c - w / 2, top, w, h, 3, '#FFFDF6');
      [[c - w / 2 - 8, '#7C97E8'], [c + w / 2 + 8, '#E4566E']].forEach(function (p) { if (up < 0.5) { U.rr(g, p[0] - 6, gy - 10, 12, 10, 2, '#9AA3B8'); U.ell(g, p[0], gy - 10, 6, 2, p[1]); } });
      pts.forEach(function (p) { if (A.t < p.t + 180) return; var x = mix(p.x, c + p.hx * (w / 2 - 10) / 16, up), y = mix(gy + p.dy * 0.9, top + h / 2 - p.hy * (h / 2 - 10) / 14, up); paw(g, U, x, y, mix(0.55, 1, up), p.col); });
    } });

  add({ id: 'leapfrog', name: 'Leapfrog', kind: 'silly', dur: 7400,
    cap: 'Leapfrog across the garden!', punch: [4400, 'Boing! They leapfrog into each other. Giggles.'],
    at: function (A) { return [A.cx - A.span + 8, A.cx - A.span + 52]; },
    run: function (A, T, S) {
      var a = A.cx - A.span + 8;
      T.x = a; S.x = a + 44; T.face = S.face = 1;
      var legs = [[T, 700, a, a + 88, S], [S, 1700, a + 44, a + 132, T], [T, 2700, a + 88, a + 176, S]];
      legs.forEach(function (L) { var d = L[0], t0 = L[1]; if (A.t >= t0) { var p = A.p(t0, t0 + 700); d.x = mix(L[2], L[3], eio(p)); if (p < 1) { d.pose = 'run'; d.rot = -0.2 * Math.sin(p * PI); } A.hop(d, t0, 700, 50); if (A.in(t0 - 200, t0 + 700)) L[4].pose = 'bow'; } });
      if (A.t > 3500) { T.x = a + 176; S.x = a + 132; T.face = -1; S.face = 1; }
      if (A.t >= 4000 && A.t < 5200) { var p2 = A.p(4000, 5200), mid = a + 154; T.x = mix(a + 176, mid + 12, Math.sin(p2 * PI) * 1); S.x = mix(a + 132, mid - 12, Math.sin(p2 * PI)); T.lift = S.lift = 50 * Math.sin(p2 * PI); T.pose = S.pose = 'run'; }
      if (A.once(4600)) { A.burst(a + 154, A.G - 90, 6, 'star', { speed: 0.08 }); A.shake(1.5); }
      if (A.t > 5200) { T.pose = S.pose = 'sit'; T.tilt = Math.sin(A.t / 150) * 0.2 * (1 - A.p(5200, 6000)); laugh(A, T, S, 6000); }
    } });

  // ======================= SURPRISING =======================
  add({ id: 'bigball', name: 'The giant ball', kind: 'surprising', dur: 8400,
    cap: 'Wait… what’s that bouncing in?', punch: [2600, 'A GIANT ball! Tidbit hops on top and runs in place.'],
    run: function (A, T, S) {
      var b = this._ball(A);
      A.say(T, '!', 600, 1300); A.say(S, '!', 700, 1400); if (A.in(600, 1800)) { T.pose = S.pose = 'bow'; }
      if (A.t >= 2600 && A.t < 6800) { var up = A.e(2600, 3200); T.x = mix(A.x0, b.x, up); T.lift = mix(0, b.r * 2 - 4, up) + 40 * Math.sin(up * PI); T.pose = 'run'; T.face = b.v >= 0 ? 1 : -1; T.ph = A.t / 40; T.rot = Math.sin(A.t / 220) * 0.06; }
      if (A.t >= 3200 && A.t < 6600) { S.x = clamp(b.x + (b.v >= 0 ? -70 : 70), A.cx - A.span, A.cx + A.span); S.pose = 'run'; S.face = b.v >= 0 ? 1 : -1; }
      if (A.t >= 6800) { var p = A.p(6800, 7500); T.x = mix(b.x, A.x0, eio(p)); T.lift = mix(b.r * 2 - 4, 0, p) + 30 * Math.sin(p * PI); T.rot = -TAU * eio(p); T.pose = 'run'; if (p >= 1) { T.rot = 0; T.pose = 'sit'; } }
      A.say(S, 'Wheee?', 4000, 5000); if (A.t > 7500) laugh(A, T, S, 7500);
    },
    _ball: function (A) {
      var t = A.t, r = 44, c = A.cx, x, y, v = 0;
      if (t < 2400) { var p = A.p(0, 2400); x = mix(c - A.span - 70, c, 1 - Math.pow(1 - p, 2)); var bh = [[0, 0.35, 90], [0.35, 0.65, 50], [0.65, 0.85, 24], [0.85, 1, 8]], h = 0; bh.forEach(function (q) { if (p >= q[0] && p < q[1]) { var u = (p - q[0]) / (q[1] - q[0]); h = q[2] * 4 * u * (1 - u); } }); y = h; v = 1; }
      else if (t < 6800) { var q2 = A.p(3400, 6400); x = c + Math.sin(q2 * TAU) * (A.span - 60); v = Math.cos(q2 * TAU); y = 0; }
      else { var q3 = A.p(7200, 8400); x = c + q3 * (A.span + 80); y = 70 * 4 * Math.min(q3, 0.5) * (1 - Math.min(q3, 0.5)) * 2 * (q3 > 0 ? 1 : 0); v = 1; }
      return { x: x, y: y, r: r, v: v };
    },
    back: function (g, A) {
      var b = this._ball(A), y = A.G + 2 - b.y - b.r, sq = b.y < 3 && A.t < 2400 ? 0.08 : 0;
      A.U.ell(g, b.x, A.G + 3, b.r * 0.9, 5, 'rgba(40,30,60,.12)');
      g.save(); g.translate(b.x, y + sq * b.r); g.scale(1 + sq, 1 - sq); g.rotate(b.x / b.r);
      var cols = ['#F27D7D', '#FFFFFF', '#7FB8F0', '#FFFFFF', '#F7DC6F', '#FFFFFF'];
      for (var i = 0; i < 6; i++) { g.fillStyle = cols[i]; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, b.r, i * TAU / 6, (i + 1) * TAU / 6); g.closePath(); g.fill(); }
      A.U.circle(g, 0, 0, 6, '#FFFFFF'); g.restore(); A.U.circle(g, b.x - b.r * 0.35, y - b.r * 0.4, b.r * 0.18, 'rgba(255,255,255,.35)');
    } });

  add({ id: 'ufo', name: 'The tiny UFO', kind: 'surprising', dur: 9200,
    cap: 'A game of frisbee… until a tiny UFO shows up', punch: [3600, 'It borrows the frisbee! Then brings it back, with a spare.'],
    run: function (A, T, S) {
      if (A.in(500, 900)) { T.pivot = 'hind'; T.rot = -0.4 * A.bump(500, 900); }
      if (A.in(1700, 2100)) { S.pivot = 'hind'; S.rot = -0.4 * A.bump(1700, 2100); }
      if (A.t > 2800) { T.tilt = S.tilt = -0.3; }
      A.say(T, '?!', 3700, 4500); A.say(S, '?!', 3800, 4600);
      if (A.in(5600, 6800)) { S.pivot = 'hind'; S.rot = -0.3 * A.bump(5600, 6800); }
      if (A.in(6600, 7600)) { T.pivot = S.pivot = 'hind'; T.rot = -0.5 * Math.abs(Math.sin(A.t / 150)); S.rot = -0.5 * Math.abs(Math.sin(A.t / 150 + 1)); A.say(T, 'Bye!', 6800, 7600); }
      if (A.t > 7800) { T.tilt = S.tilt = 0; laugh(A, T, S, 7900); }
    },
    front: function (g, A) {
      var U = A.U, t = A.t, m0 = A.mouth(0), m1 = A.mouth(1), ux = A.cx + Math.sin(t / 700) * 10, uy = mix(-40, 58, A.back(2800, 3400)) + Math.sin(t / 300) * 3;
      if (t > 7000) { var q = A.p(7000, 8200); ux += Math.sin(q * 18) * 30 * q + q * 60; uy -= q * 180; }
      function frisbee(x, y, col) { U.ell(g, x, y, 9, 2.8, col || '#E4566E'); U.ell(g, x, y - 1, 6, 1.4, 'rgba(255,255,255,.4)'); }
      if (t < 900) frisbee(m0.x + 4, m0.y);
      else if (t < 1700) { var a = arcPt(A.p(900, 1700), m0.x, m0.y, m1.x, m1.y, 60); frisbee(a.x, a.y); }
      else if (t < 2100) frisbee(m1.x - 4, m1.y);
      else if (t < 2900) { var b = arcPt(A.p(2100, 2900), m1.x, m1.y, m0.x, m0.y, 60); frisbee(b.x, b.y); }
      else if (t < 3300) frisbee(m0.x + 4, m0.y);
      else if (t < 3700) { var c = arcPt(A.p(3300, 3700), m0.x, m0.y, (m0.x + m1.x) / 2, m0.y - 50, 20); frisbee(c.x, c.y); }
      else if (t < 5600) { var rise = A.e(3700, 4400); frisbee(mix((m0.x + m1.x) / 2, ux, rise), mix(m0.y - 50, uy + 12, rise) + Math.sin(t / 150) * 2 * (1 - rise)); }
      else if (t < 6400) { var d = A.e(5600, 6400); frisbee(mix(ux, m1.x - 4, d), mix(uy + 12, m1.y, d)); frisbee(mix(ux, m0.x + 4, d), mix(uy + 12, m0.y, d), '#7FB8F0'); }
      else { frisbee(m1.x - 4, m1.y); frisbee(m0.x + 4, m0.y, '#7FB8F0'); }
      if (t < 2600 || t > 8600) return;
      var beam = A.bump(3500, 6500); if (beam > 0) { g.fillStyle = 'rgba(255,240,160,' + (0.25 * Math.min(1, beam * 3)).toFixed(2) + ')'; g.beginPath(); g.moveTo(ux - 6, uy + 4); g.lineTo(ux + 6, uy + 4); g.lineTo(ux + 22, A.G - 40); g.lineTo(ux - 22, A.G - 40); g.closePath(); g.fill(); }
      U.ell(g, ux, uy - 5, 9, 7, 'rgba(190,230,255,.9)'); U.circle(g, ux, uy - 5, 3.4, '#8FD694'); U.circle(g, ux - 1.2, uy - 6, 0.8, '#2C2638'); U.circle(g, ux + 1.2, uy - 6, 0.8, '#2C2638');
      if (A.in(5800, 7000)) U.line(g, ux + 3, uy - 4, ux + 7, uy - 9 + Math.sin(t / 80) * 2, '#8FD694', 1.4);
      U.ell(g, ux, uy, 20, 5.5, '#9AA3B8'); U.ell(g, ux, uy - 1, 16, 3, '#C9CEDA');
      for (var i = 0; i < 5; i++) U.circle(g, ux - 14 + i * 7, uy + 2, 1.4, Math.floor(t / 450 + i) % 2 ? '#F7DC6F' : '#F7A8C2');
    } });

  add({ id: 'helicopter', name: 'Helicopter ears', kind: 'surprising', dur: 8400,
    cap: 'Tidbit wiggles her ears… faster… FASTER…', punch: [1800, 'Her ears are helicopter blades! She’s flying!'],
    run: function (A, T, S) {
      var spin = A.e(300, 1600) * (1 - A.e(7000, 7800)), t = A.t;
      T.noEar = spin > 0.05;
      T.over = spin > 0.05 ? function (g, A2, i) { var h = A2.headL(i), w = Math.cos(A2.now / (22 / Math.max(0.3, spin))) * 22; A2.U.rr(g, h.x - 2, h.y - 15, 3, 5, 1, '#1B1817'); A2.U.ell(g, h.x - 0.5 + w / 2, h.y - 16, Math.abs(w) / 2 + 2, 2.2, '#252120'); A2.U.ell(g, h.x - 0.5 - w / 2, h.y - 16, Math.abs(w) / 2 + 2, 2.2, '#1B1817'); } : null;
      if (t > 1600 && t < 7200) { var up = A.e(1600, 2600) * (1 - A.e(6600, 7400)), p = A.p(2600, 6600) * TAU; T.x = mix(A.x0, A.cx + (A.span - 40) * Math.sin(p), up * A.e(2400, 3000)); T.lift = up * (80 + 16 * Math.cos(p * 2)); T.pose = 'run'; T.ph = 1.2; T.face = Math.cos(p) >= 0 ? 1 : -1; T.rot = 0.1 * Math.cos(p); }
      A.say(T, 'Wheee!', 2200, 3200); A.say(S, '!!', 2000, 2800);
      if (t > 2600 && t < 6600) { S.x = clamp(T.x + 10, A.cx - A.span, A.cx + A.span); S.face = T.face; S.pose = 'run'; A.hop(S, 3400, 420, 40); A.hop(S, 4600, 420, 40); }
      if (t > 5000 && t < 6800) { S.lift = Math.max(S.lift, (T.lift - 52) * A.e(5000, 5400)); S.x = T.x; S.pose = 'run'; S.ph = 1.2; S.face = T.face; A.say(S, 'Wheee!', 5300, 6200); }
      if (t > 7400) { T.tilt = Math.sin(t / 150) * 0.25 * (1 - A.p(7400, 8400)); laugh(A, T, S, 7600); }
    } });

  add({ id: 'shrink', name: 'The shrinking cookie', kind: 'surprising', dur: 8400,
    cap: 'A sparkly cookie! Tidbit takes a bite…', punch: [1800, 'She’s TINY! So she rides on Sugarfoot’s head.'],
    run: function (A, T, S) {
      var sm = 0.42, t = A.t;
      if (A.in(900, 1300)) T.pose = 'bow';
      var sc = t < 1500 ? 1 : t < 6800 ? mix(1, sm, A.back(1500, 2000)) : mix(sm, 1, A.back(6800, 7300));
      T.scale = sc; A.say(T, 'Eep!', 1800, 2600); A.say(S, '?!', 2000, 2800); if (A.in(2400, 3000)) S.pose = 'bow';
      if (t > 3000 && t < 5200) {
        S.x = mix(A.x1, A.cx + 20, A.e(3600, 4600)); S.face = -1; if (A.in(3600, 4600)) S.pose = 'run';
        var up = A.e(3000, 3500); T.x = mix(A.x0, S.x - 14, up); T.lift = up * 44 + 30 * Math.sin(up * PI); T.face = up < 1 ? 1 : -1; if (up >= 1) T.pose = 'sit';
        A.say(T, 'Wheee!', 3800, 4800);
      }
      if (t >= 5200) { var dn = A.e(5200, 5700); T.x = mix(A.cx + 20 - 12, A.cx - 20, dn); T.lift = mix(44, 0, dn) + 20 * Math.sin(dn * PI); S.x = A.cx + 20; S.face = -1; T.face = 1; }
      if (t > 5800) { S.scale = t < 6800 ? mix(1, sm, A.back(5800, 6200)) : mix(sm, 1, A.back(6800, 7300)); if (A.in(6200, 6700)) { T.pivot = S.pivot = 'hind'; T.rot = S.rot = -0.5 * A.bump(6200, 6700); } }
      if (A.once(1500) || A.once(5800)) A.burst(t < 3000 ? A.pos(0).x : A.pos(1).x, A.G - 20, 12, 'spark', { spread: TAU, speed: 0.08 });
      if (A.once(6800)) A.burst(A.cx, A.G - 40, 20, 'spark', { spread: TAU, speed: 0.12 });
      if (t > 7400) laugh(A, T, S, 7500);
    },
    back: function (g, A) {
      var U = A.U, t = A.t, m = A.mouth(0);
      if (t < 1500) { var y = t < 600 ? mix(-40, A.G - 8, A.e(0, 600)) : A.G - 8, x = A.x0 + 40; U.circle(g, x, y, 8 * (t > 1100 ? 1 - A.e(1100, 1400) * 0.5 : 1), '#E6B878'); U.star(g, x + 6, y - 7, 3 + Math.sin(t / 120), '#F8D76A'); U.circle(g, x - 2, y, 1.2, '#E4566E'); U.circle(g, x + 3, y + 2, 1.2, '#7FB8F0'); }
      if (A.in(5400, 5800)) { var s = A.mouth(1); U.circle(g, s.x, s.y + 2, 5, '#E6B878'); }
    } });

  add({ id: 'spout', name: 'A whale in a puddle', kind: 'surprising', dur: 8600,
    cap: 'Bubbles in the puddle… something’s coming up', punch: [3200, 'A friendly whale! Its spout lifts them sky-high.'],
    run: function (A, T, S) {
      T.x = A.cx - 40; S.x = A.cx + 40; A.say(T, '?', 600, 1400);
      A.say(T, '!!', 1800, 2600); A.say(S, '!!', 1900, 2700);
      var sp = A.e(2800, 3400) * (1 - A.e(5600, 6400)) * 84;
      if (A.t >= 3000 && A.t < 6600) { T.x = A.cx - 34; S.x = A.cx + 34; T.lift = sp + Math.sin(A.t / 180) * 3 * (sp > 20 ? 1 : 0); S.lift = sp + Math.sin(A.t / 180 + 1.5) * 3 * (sp > 20 ? 1 : 0); T.pose = S.pose = 'run'; T.ph = S.ph = 1.2; }
      A.say(T, 'Wheee!', 3600, 4600); A.say(S, 'Wheee!', 3900, 4900);
      if (A.t > 6600) { A.say(T, '<3', 6900, 7900); A.say(S, 'Bye!', 7100, 8100); }
      if (A.tick(200, 300, 1600)) A.burst(A.cx + (Math.random() - 0.5) * 30, A.G, 1, 'bubble', { speed: 0.03 });
    },
    back: function (g, A) {
      var U = A.U, c = A.cx, y = A.G + 4; puddle(g, U, c, y, 56);
      var up = A.back(1600, 2300) * (1 - A.e(7200, 8200));
      if (up > 0.01) { g.save(); g.beginPath(); g.rect(c - 80, y - 90, 160, 90); g.clip(); var wy = y + 36 - up * 44; U.ell(g, c, wy, 38, 34, '#6C9BD2'); U.ell(g, c, wy + 14, 30, 16, '#A8C8EA'); U.circle(g, c + 16, wy - 8, 3.6, '#FFFFFF'); U.circle(g, c + 16.6, wy - 8, 2, '#2C2638'); if (A.in(6800, 7400)) U.rr(g, c + 12, wy - 9, 8, 1.6, 1, '#6C9BD2');
        g.strokeStyle = '#2C4F7A'; g.lineWidth = 1.6; g.beginPath(); g.arc(c + 4, wy + 2, 10, 0.3, 1.4); g.stroke(); U.ell(g, c + 26, wy + 4, 3, 2, '#F7A8C2'); g.restore(); U.ell(g, c, y, 56, 8, 'rgba(140,200,234,.55)'); }
      var sp = A.e(2800, 3400) * (1 - A.e(5600, 6400)) * 84;
      if (sp > 2) { [-34, 34].forEach(function (dx) { g.fillStyle = 'rgba(160,210,245,.85)'; g.beginPath(); g.moveTo(c - 4, y - 20); g.quadraticCurveTo(c + dx * 0.5, y - sp * 0.6, c + dx - 10, y - sp + 2); g.lineTo(c + dx + 10, y - sp + 2); g.quadraticCurveTo(c + dx * 0.5 + 6, y - sp * 0.6, c + 4, y - 20); g.closePath(); g.fill(); U.ell(g, c + dx, y - sp + 2, 16, 5, 'rgba(210,235,252,.95)'); }); }
      if (A.t > 6400) U.rainbow(g, c, y - 10, 70, 4, A.e(6400, 7000) * (1 - A.e(8000, 8600)) * 0.8);
    } });

  add({ id: 'teleport', name: 'Now you see her', kind: 'surprising', dur: 7400,
    cap: 'Sugarfoot waves a magic wand at Tidbit… poof!', punch: [2400, 'Tidbit pops up right behind her. Tap, tap!'],
    at: function (A) { return [A.cx - 70, A.cx + 20]; },
    run: function (A, T, S) {
      T.x = A.cx - 70; S.x = A.cx + 20; S.face = -1;
      S.over = function (g, A2, i) { var h = A2.headL(i); g.strokeStyle = '#2C2638'; g.lineWidth = 2; g.beginPath(); g.moveTo(h.x + 11, h.y + 6); g.lineTo(h.x + 26, h.y); g.stroke(); A2.U.star(g, h.x + 27, h.y - 1, 3.4, '#F8D76A', A2.now / 300); };
      if (A.in(800, 1200)) { S.pivot = 'hind'; S.rot = -0.3 * A.bump(800, 1200); }
      if (A.t > 1250 && A.t < 2400) T.alpha = 0;
      if (A.t >= 1800) { T.x = A.cx + A.span - 6; T.face = -1; }
      A.say(S, '?', 1500, 2300); if (A.in(1400, 2400)) S.face = Math.floor(A.t / 350) % 2 ? 1 : -1;
      if (A.in(2600, 3200)) { S.face = -1; T.x = A.cx + A.span - 6 - A.bump(2700, 3100) * 8; }
      A.say(S, '!!', 3100, 3800); A.hop(S, 3100, 420, 40); A.spin(S, 3100, 420, 1); A.say(T, 'Ha!', 3300, 4100);
      if (A.t > 4000 && A.t < 4800) { S.face = 1; if (A.in(4200, 4600)) { S.pivot = 'hind'; S.rot = -0.3 * A.bump(4200, 4600); } }
      if (A.t > 4700 && A.t < 5400) { T.alpha = 0; S.alpha = 0; }
      if (A.t >= 5000) { T.x = A.cx - 70; S.x = A.cx + A.span - 20; T.face = 1; S.face = -1; }
      A.say(T, '?', 5500, 6200); A.say(S, '?', 5600, 6300);
      if (A.t > 6300) laugh(A, T, S, 6300);
      if (A.once(1250)) A.burst(A.cx - 70, A.G - 20, 10, 'puff', { speed: 0.05 });
      if (A.once(2400)) A.burst(A.cx + A.span - 6, A.G - 30, 10, 'spark', { spread: TAU });
      if (A.once(4700)) { A.burst(A.pos(0).x, A.G - 20, 8, 'puff', { speed: 0.05 }); A.burst(A.pos(1).x, A.G - 20, 8, 'puff', { speed: 0.05 }); }
      if (A.once(5400)) A.burst(A.cx, A.G - 30, 12, 'spark', { spread: TAU });
    } });

  add({ id: 'balloondog', name: 'Balloon dog', kind: 'surprising', dur: 8400,
    cap: 'Sugarfoot twists a long balloon. Squeak, squeak…', punch: [4000, 'A balloon dog! And it’s ALIVE (and very wiggly).'],
    run: function (A, T, S) {
      if (A.in(600, 3200)) { S.pose = 'sit'; S.tilt = Math.sin(A.t / 200) * 0.1; }
      A.say(S, 'Squeak!', 1900, 2500); A.say(S, 'Squeak!', 2600, 3200); A.say(S, 'Ta-da!', 3300, 4100);
      A.say(T, 'Ooh!', 3500, 4200); A.say(T, '!!', 4300, 5000);
      if (A.t > 6300) { T.pivot = S.pivot = 'hind'; T.rot = -0.4 * Math.abs(Math.sin(A.t / 160)); S.rot = -0.4 * Math.abs(Math.sin(A.t / 160 + 1)); T.tilt = S.tilt = -0.3; A.say(T, 'Bye!', 6600, 7600); }
    },
    front: function (g, A) {
      var U = A.U, t = A.t, col = '#F28AA8', m = A.mouth(1);
      if (t < 3200) { var len = 8 + A.e(600, 1600) * 46, x0 = m.x - 2, y0 = m.y; g.strokeStyle = col; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 - len * 0.5, y0 - 20 - Math.sin(t / 200) * 6, x0 - len, y0 - 10); g.stroke(); if (t > 1800) { for (var k = 1; k < 4; k++) U.circle(g, x0 - len * k / 4, y0 - 12 - Math.sin(k) * 4, 2, '#E46B8E'); } return; }
      var x = A.cx + 10, gy = A.G - 2, alive = t > 4000, up = A.e(6300, 8200);
      if (alive && t < 6300) { var q = A.p(4000, 6300); x = A.cx + 10 + Math.sin(q * TAU) * 30; gy = A.G - 2 - Math.abs(Math.sin(q * PI * 6)) * 14; }
      gy -= up * 200; x += up * 30;
      var f = alive && t < 6300 ? (Math.cos(A.p(4000, 6300) * TAU) >= 0 ? 1 : -1) : 1, flip = A.in(5200, 5800) ? A.e(5200, 5800) * TAU : 0;
      g.save(); g.translate(x, gy - 14); g.rotate(-flip); g.scale(f, 1); var seg = function (a, b, w, h, r) { U.ell(g, a, b, w, h, col, r || 0); U.ell(g, a - w * 0.3, b - h * 0.4, w * 0.3, h * 0.25, 'rgba(255,255,255,.45)', r || 0); };
      seg(-8, 10, 2.6, 7, 0.1); seg(-2, 10, 2.6, 7, -0.1); seg(8, 10, 2.6, 7, 0.1); seg(14, 10, 2.6, 7, -0.1); seg(3, 1, 12, 4.6); seg(17, -8, 3, 7, -0.3); seg(20, -14, 6, 4.6); seg(19, -20, 2.4, 5, -0.4); seg(24, -20, 2.4, 5, 0.3);
      g.save(); g.translate(-9, -1); g.rotate(-0.8 + (alive ? Math.sin(t / 60) * 0.5 : 0)); seg(0, -5, 2.4, 6); g.restore();
      U.circle(g, 22, -15, 1, '#2C2638'); g.restore();
      if (up > 0) U.line(g, x + 3, gy - 6, x + 3, gy + 24, 'rgba(90,80,110,.5)', 0.8);
    } });

  add({ id: 'rainbowslide', name: 'Rainbow slide', kind: 'surprising', dur: 8600,
    cap: 'A rainbow arches right over the garden. Is that… a slide?', punch: [4300, 'Wheee! All the way down the rainbow!'],
    at: function (A) { return [A.cx - A.span + 6, A.cx - A.span + 40]; },
    run: function (A, T, S) {
      var c = A.cx, R = A.span - 6, H = 110;
      function onArc(d, p, face) { var x = mix(c - R * 0.94, c + R * 0.94, p), u = (x - c) / R, h = H * Math.sqrt(Math.max(0, 1 - u * u)); d.x = x; d.lift = h; var sl = -H * u / (R * Math.sqrt(Math.max(0.04, 1 - u * u))); d.rot = -Math.atan(sl) * face * (face > 0 ? 1 : 1); d.face = face; }
      A.say(T, '!', 600, 1300); A.say(S, '!', 700, 1400);
      [[T, 0], [S, 450]].forEach(function (q) {
        var d = q[0], o = q[1];
        if (A.t < 1400 + o) return;
        if (A.t < 1800 + o) { var p0 = A.e(1400 + o, 1800 + o); d.x = mix(d.x, c - R * 0.94, p0); d.lift = p0 * H * Math.sqrt(1 - 0.94 * 0.94) + 16 * Math.sin(p0 * PI); d.pose = 'run'; return; }
        if (A.t < 4200 + o) { onArc(d, 0.5 * A.e(1800 + o, 4200 + o), 1); d.pose = 'run'; if (A.t > 3900 + o) d.pose = 'sit'; return; }
        if (A.t < 5200 + o) { var p = A.p(4200 + o, 5200 + o); onArc(d, 0.5 + 0.5 * p * p, 1); d.pose = 'sit'; return; }
        var p2 = A.p(5200 + o, 5800 + o); d.x = mix(c + R * 0.94, c + R - (o ? 44 : 4), p2); d.lift = mix(H * Math.sqrt(1 - 0.94 * 0.94), 0, p2) + 30 * Math.sin(p2 * PI); d.rot = -TAU * eio(p2); d.pose = 'run';
        if (p2 >= 1) { d.rot = 0; d.pose = 'sit'; d.face = o ? 1 : -1; }
      });
      A.say(T, 'Wheee!', 4300, 5200); A.say(S, 'Wheee!', 4800, 5700);
      if (A.t > 6600) laugh(A, T, S, 6700);
    },
    back: function (g, A) { var R = A.span - 6; g.save(); g.translate(A.cx, A.G + 4); g.scale(1, 110 / R); A.U.rainbow(g, 0, 0, R + 10, 5, A.e(0, 1200) * (1 - A.e(7800, 8600)), PI, PI + PI * A.e(0, 1200)); g.restore(); } });

  add({ id: 'popcorn', name: 'Popcorn party', kind: 'surprising', dur: 7800,
    cap: 'Pop! Pop! Tidbit and Sugarfoot catch popcorn in their mouths', punch: [4400, 'Uh-oh. The machine won’t stop! Popcorn everywhere!'],
    run: function (A, T, S) {
      T.x = A.cx - 64; S.x = A.cx + 64;
      [1500, 2300, 3100, 3900].forEach(function (t0, i) { A.hop(i % 2 ? S : T, t0, 360, 30); });
      A.say(T, '!', 4500, 5200); A.say(S, '!', 4600, 5300);
      if (A.t > 5400) { T.pose = S.pose = 'wiggle'; T.wag = S.wag = 4; laugh(A, T, S, 6400); }
      if (A.tick(A.t > 4400 ? 140 : 380, 700, 6400)) A.burst(A.cx, A.G - 72, A.t > 4400 ? 3 : 1, 'puff', { col: '#FFF8E6', speed: 0.13, spread: 1.6, grav: 0.0003, life: 1500, size: 0.35 });
    },
    back: function (g, A) { var U = A.U, c = A.cx, y = A.G + 2; U.rr(g, c - 16, y - 50, 32, 50, 4, '#E4566E'); U.rr(g, c - 13, y - 64, 26, 16, 3, 'rgba(210,235,252,.8)'); U.rr(g, c - 16, y - 68, 32, 5, 2, '#C9474F'); U.rr(g, c - 16, y - 30, 32, 5, 0, '#F7DC6F'); U.text(g, 'POP', c, y - 20, 8, '#FFF3C9', '800'); for (var i = 0; i < 6; i++) U.circle(g, c - 9 + i * 3.6, y - 52 - (i % 2) * 3, 2.6, '#FFF8E6'); },
    front: function (g, A) {
      var U = A.U, pile = A.e(4400, 6600) * 16; if (pile < 0.5) return;
      for (var i = 0; i < 40; i++) { var x = A.cx + (i / 39 - 0.5) * 2 * (A.span + 20), h = pile * (1 - Math.pow((i / 39 - 0.5) * 2, 2) * 0.6); U.circle(g, x, A.G + 6 - h * 0.5 - (i % 3) * 2, 4 + (i % 2), '#FFF8E6'); U.circle(g, x + 3, A.G + 4 - h * 0.8, 3, '#FDEFC4'); }
    } });

  // combos: sometimes the first leads straight into the second
  var combos = [['noodle', 'share'], ['leafblanket', 'stargaze'], ['magic', 'teleport'], ['dj', 'disco'], ['rocket', 'capes'], ['pizza', 'picnic'],
    ['juggle', 'bowling'], ['skate', 'unicycle'], ['bubbles', 'balloon'], ['ufo', 'helicopter'], ['boop', 'flowercrown'], ['zoomies', 'tailchase'],
    ['sunflower', 'butterfly'], ['snowball', 'leafpile'], ['sandcastle', 'fireworks'], ['copycat', 'dance']];

  window.TOLPalsCamActs = { acts: acts, combos: combos };
})();
