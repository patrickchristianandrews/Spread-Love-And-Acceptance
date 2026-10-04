/* pals-cam-more.js — more things Tidbit and Sugarfoot get up to on the pal cam, written the same way
   as pals-cam-acts.js (see the notes at the top of that file). These lean into who they are:
   Tidbit (T, index 0, looks.drop: the big smile) is quick, curious, always a step ahead, keeps an eye on her pal and
   is first in line for a high five. Sugarfoot (S, index 1, looks.collar: the collar and the gentle wag) is steady, brave in the dark,
   the best hugger there is, and happiest beside Tidbit. Both have a big heart of gold. Plus plenty of routines they do together.
   Optional extra field: where: ['beach', 'pond', ...] limits an activity to those settings. */
(function () {
  'use strict';
  var PI = Math.PI, TAU = PI * 2;
  var X = window.TOLPalsCamActs || (window.TOLPalsCamActs = { acts: [], combos: [] });
  function add(o) { X.acts.push(o); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mix(a, b, p) { return a + (b - a) * p; }
  function eio(p) { p = clamp(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function arcPt(p, x0, y0, x1, y1, h) { return { x: mix(x0, x1, p), y: mix(y0, y1, p) - h * 4 * p * (1 - p) }; }
  function laugh(A, T, S, t0) { A.say(T, 'Ha!', t0, t0 + 900); A.say(S, 'Ha!', t0 + 250, t0 + 1150); A.hop(T, t0, 300, 12); A.hop(S, t0 + 250, 300, 12); T.wag = S.wag = 3; }
  function hearts(A, x, y, t, n) { if (A.once(t)) A.burst(x, y, n || 6, 'heart'); }
  function rear(A, d, a, b, amt) { if (A.in(a, b)) { d.pivot = 'hind'; d.rot = -(amt || 0.4) * A.bump(a, b); } }
  function lean(d, amt) { d.pivot = 'hind'; d.rot = amt; }
  // little friends and props, drawn in stage units
  function mouse(g, U, x, y, s, f) { g.save(); g.translate(x, y); g.scale(s * (f || 1), s); U.ell(g, 0, -4, 7, 4.5, '#B8B1BD'); U.circle(g, 6, -6, 3.4, '#B8B1BD'); U.circle(g, 5, -9.5, 2.2, '#F2B8C6'); U.circle(g, 8.5, -6.5, 0.9, '#2C2638'); U.circle(g, 9.8, -5, 0.8, '#E4566E'); g.strokeStyle = '#B8B1BD'; g.lineWidth = 1; g.beginPath(); g.moveTo(-7, -3); g.quadraticCurveTo(-13, -8, -15, -2); g.stroke(); g.restore(); }
  function bird(g, U, x, y, s, f, flap, col) { g.save(); g.translate(x, y); g.scale(s * (f || 1), s); U.ell(g, 0, 0, 6, 4.4, col || '#7FB8F0'); U.circle(g, 5, -3, 3.2, col || '#7FB8F0'); U.circle(g, 6, -3.6, 0.8, '#2C2638'); g.fillStyle = '#F2A84B'; g.beginPath(); g.moveTo(8, -3); g.lineTo(11, -2); g.lineTo(8, -1.4); g.fill(); U.ell(g, -1, -1 - (flap || 0) * 3, 4, 2, 'rgba(255,255,255,.7)', -0.4 - (flap || 0)); g.restore(); }
  function duck(g, U, x, y, s, f) { g.save(); g.translate(x, y); g.scale(s * (f || 1), s); U.ell(g, 0, -4, 6, 4.4, '#F7DC6F'); U.circle(g, 4.5, -9, 3.4, '#F7DC6F'); U.circle(g, 5.6, -9.8, 0.8, '#2C2638'); U.ell(g, 8.4, -8.4, 2.2, 1.1, '#F2A84B'); g.restore(); }
  function snail(g, U, x, y, s, f, t) { g.save(); g.translate(x, y); g.scale(s * (f || 1), s); var b = Math.sin((t || 0) / 260) * 1.2; U.ell(g, 2, -3, 12, 3.4, '#C7D98A'); U.line(g, 10, -5, 13, -15 + b, '#A9C06A', 1.4); U.line(g, 8, -5, 9, -14 - b, '#A9C06A', 1.4); U.circle(g, 13, -15 + b, 1.4, '#3C3350'); U.circle(g, 9, -14 - b, 1.4, '#3C3350'); U.circle(g, -2, -11, 9, '#E6A86A'); g.strokeStyle = '#B9743E'; g.lineWidth = 1.6; g.beginPath(); for (var i = 0; i < 24; i++) { var a = i * 0.5, r = 7 - i * 0.27; g.lineTo(-2 + Math.cos(a) * r, -11 + Math.sin(a) * r); } g.stroke(); g.restore(); }
  function ladybug(g, U, x, y, s, flip) { g.save(); g.translate(x, y); g.scale(s, s * (flip ? -1 : 1)); U.ell(g, 0, -3, 5, 4, '#E4566E'); U.circle(g, 4.4, -3, 2.2, '#2C2638'); U.line(g, 0, -7, 0, 1, '#2C2638', 0.8); U.circle(g, -2, -4.6, 1, '#2C2638'); U.circle(g, 2, -1.6, 1, '#2C2638'); U.circle(g, -2.4, -1, 0.9, '#2C2638'); g.restore(); }
  function bee(g, U, x, y, s, t) { g.save(); g.translate(x, y); g.scale(s, s); var f = Math.abs(Math.sin(t / 30)); U.ell(g, -1, -5 - f, 3, 4 * f + 1, 'rgba(255,255,255,.8)'); U.ell(g, 0, 0, 5, 3.6, '#F7C948'); U.rr(g, -1.6, -3.4, 1.6, 6.8, 0.6, '#2C2638'); U.rr(g, 1.6, -3.2, 1.4, 6.4, 0.6, '#2C2638'); U.circle(g, 4.2, -0.6, 0.8, '#2C2638'); g.restore(); }
  function sign(g, U, x, y, w, h, text, bg, fg, size) { U.rr(g, x - w / 2, y - h / 2, w, h, 4, bg || '#FFF6E0'); g.strokeStyle = 'rgba(90,70,110,.35)'; g.lineWidth = 1; g.strokeRect(x - w / 2 + 0.5, y - h / 2 + 0.5, w - 1, h - 1); U.text(g, text, x, y + 0.5, size || 9, fg || '#5B4A86', '700'); }
  function lantern(g, U, x, y, s, glow) { if (glow) { var gr = g.createRadialGradient(x, y, 2, x, y, 40 * s); gr.addColorStop(0, 'rgba(255,230,150,.45)'); gr.addColorStop(1, 'rgba(255,230,150,0)'); g.fillStyle = gr; g.fillRect(x - 40 * s, y - 40 * s, 80 * s, 80 * s); } U.rr(g, x - 4 * s, y - 6 * s, 8 * s, 11 * s, 2 * s, '#FCE38A'); U.rr(g, x - 5 * s, y - 8 * s, 10 * s, 2.4 * s, 1, '#6B5A70'); U.rr(g, x - 5 * s, y + 5 * s, 10 * s, 2.2 * s, 1, '#6B5A70'); g.strokeStyle = '#6B5A70'; g.lineWidth = 1; g.beginPath(); g.arc(x, y - 9 * s, 3 * s, PI, TAU); g.stroke(); }
  function pool(g, U, x, y, w, back) { if (back) { U.ell(g, x, y - 4, w / 2, 11, '#6FB8E6'); U.ell(g, x - w * 0.12, y - 6, w * 0.25, 3, 'rgba(255,255,255,.45)'); } else { g.fillStyle = '#F28AA8'; g.beginPath(); g.ellipse(x, y - 2, w / 2 + 4, 13, 0, 0, PI); g.lineTo(x - w / 2 - 4, y - 10); g.ellipse(x, y - 10, w / 2 + 4, 12, 0, PI, 0, true); g.closePath(); g.fill(); U.rr(g, x - w / 2 - 4, y - 12, w + 8, 4, 2, '#F7C9D4'); } }
  function medal(g, A2, i) { var col = i ? '#E3AE2F' : '#E3AE2F'; g.strokeStyle = '#7C97E8'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(10, -30); g.lineTo(14, -20); g.lineTo(18, -30); g.stroke(); A2.U.circle(g, 14, -18, 3.4, col); }
  function silhouette(g, A, key, x, y, s, f, pose, alpha) {
    g.save(); g.globalAlpha *= alpha; if ('filter' in g) g.filter = 'brightness(0)'; A.pup(g, key, x, y, s, f, pose || 'run', 0); g.restore(); if ('filter' in g) g.filter = 'none';
  }

  // ======================= TIDBIT: schemes, puzzles, speed, sleuthing, inventions =======================
  add({ id: 'scheme', name: 'Tidbit’s clever scheme', kind: 'silly', dur: 8400,
    cap: 'Tidbit has a Very Clever Scheme. It involves a big red button', punch: [4400, 'The scheme was a surprise hug all along!'],
    at: function (A) { return [A.cx - 70, A.cx + A.span - 8]; },
    run: function (A, T, S) {
      T.x = A.cx - 70; T.face = -1;
      A.say(T, 'Ooh, idea!', 150, 1000); for (var k = 0; k < 4; k++) rear(A, T, 1000 + k * 380, 1300 + k * 380, 0.3);
      A.walk(T, A.cx - 70, A.cx - 10, 1900, 2500); if (A.in(2500, 2900)) T.pose = 'bow'; A.walk(T, A.cx - 10, A.cx - 70, 2900, 3400); if (A.t > 3400) T.face = 1;
      A.walk(S, A.cx + A.span - 8, A.cx + 30, 3300, 4300); if (A.t >= 4300) { S.x = A.cx + 30; S.face = -1; }
      A.say(S, '?', 4000, 4500);
      if (A.t > 4600) { T.x = mix(A.cx - 70, A.cx - 4, A.e(4600, 5100)); A.hop(T, 4600, 500, 30); if (A.t > 5100) { lean(T, 0.2); lean(S, 0.2); T.wag = S.wag = 3; } }
      A.say(S, 'Aww.', 5400, 6400); A.say(T, 'Gotcha!', 5600, 6600);
      if (A.once(4400)) A.burst(A.cx + 20, A.G - 100, 22, 'confetti', { speed: 0.15, spread: 3 });
      hearts(A, A.cx + 14, A.G - 80, 5300, 8);
    },
    back: function (g, A) {
      var U = A.U, x = A.cx - 30, y = A.G - 50, p = A.e(1000, 2600);
      U.rr(g, x - 30, y - 30, 60, 42, 3, '#3F5E4E'); U.rr(g, x - 32, y - 32, 64, 4, 1, '#8A6340'); U.line(g, x - 24, y + 12, x - 28, A.G + 2, '#8A6340', 2); U.line(g, x + 24, y + 12, x + 28, A.G + 2, '#8A6340', 2);
      g.save(); g.beginPath(); g.rect(x - 30, y - 30, 60 * p, 42); g.clip(); g.strokeStyle = '#F4EFE6'; g.lineWidth = 1.3;
      g.strokeRect(x - 24, y - 6, 12, 10); g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x + 6, y); g.moveTo(x + 2, y - 4); g.lineTo(x + 6, y); g.lineTo(x + 2, y + 4); g.stroke(); U.heart(g, x + 16, y + 1, 5, '#F7A8C2'); U.text(g, 'PLAN', x, y - 20, 8, '#F4EFE6'); g.restore();
    },
    front: function (g, A) {
      var U = A.U, bx = A.cx + 16, y = A.G + 4;
      if (A.t > 2700) { var pr = A.in(4300, 4700) ? 2 : 0; U.ell(g, bx, y, 9, 3, '#8E8A9A'); U.ell(g, bx, y - 2 + pr, 7, 3, '#E4566E'); }
      if (A.t > 4350) { var s = A.back(4350, 4900), wob = Math.sin(A.t / 110) * 3 * (1 - A.e(4600, 6000)); g.strokeStyle = '#9A9AAA'; g.lineWidth = 1.4; g.beginPath(); for (var k = 0; k <= 8; k++) g.lineTo(bx + (k % 2 ? 3 : -3) + wob * k / 8, y - 4 - 70 * s * k / 8); g.stroke();
        sign(g, U, bx + wob, y - 4 - 70 * s - 8, 80, 16, 'SURPRISE HUG!', '#FFF3C9', '#E4566E', 8.5); }
    } });

  add({ id: 'jigsaw', name: 'Speed jigsaw', kind: 'cool', dur: 7800,
    cap: 'Tidbit solves a jigsaw puzzle at top speed', punch: [5000, 'Done! It’s a picture of the two of them.'],
    run: function (A, T, S) {
      T.x = A.cx - 40 + Math.sin(A.t / 160) * 26 * A.bump(600, 4800); T.face = Math.cos(A.t / 160) >= 0 ? 1 : -1; if (A.in(600, 4800)) { T.pose = 'run'; T.lift = Math.abs(Math.sin(A.t / 80)) * 5; }
      if (A.t >= 4800) { T.x = A.cx - 40; T.face = 1; }
      S.x = A.x1 + 16; S.tilt = 0.2 * Math.sin(A.t / 500); A.say(S, 'Wow!', 5100, 6000);
      if (A.in(5600, 6300)) T.pose = 'bow'; A.say(T, 'Ta-da!', 5600, 6600);
      if (A.once(4800)) A.burst(A.cx - 10, A.G - 110, 16, 'spark', { spread: TAU });
    },
    back: function (g, A) {
      var U = A.U, x = A.cx - 10, y = A.G - 120, w = 66, h = 54, cw = w / 3, ch = h / 3;
      U.line(g, x - 20, y + h, x - 26, A.G + 2, '#8A6340', 2.4); U.line(g, x + 20, y + h, x + 26, A.G + 2, '#8A6340', 2.4); U.rr(g, x - w / 2 - 4, y - 4, w + 8, h + 8, 3, '#C9A77A'); U.rr(g, x - w / 2, y, w, h, 2, '#F4EFE6');
      for (var i = 0; i < 9; i++) {
        var t0 = 700 + i * 450, p = A.e(t0, t0 + 380); if (A.t < t0) continue;
        var gx = x - w / 2 + (i % 3) * cw, gy = y + Math.floor(i / 3) * ch, sx = mix(A.cx - A.span + 20 + (i * 37) % (A.span), gx, p), sy = mix(A.G - 10 - (i % 3) * 8, gy, p) - Math.sin(p * PI) * 30;
        g.save(); g.beginPath(); g.rect(sx, sy, cw - 0.6, ch - 0.6); g.clip(); g.translate(sx - gx, sy - gy);
        U.rr(g, x - w / 2, y, w, h, 0, '#CFE8F7'); U.rr(g, x - w / 2, y + h * 0.7, w, h * 0.3, 0, '#9AD17F'); A.pup(g, 'drop', x - 14, y + h * 0.86, 0.36, 1, 'sit', 0); A.pup(g, 'collar', x + 14, y + h * 0.86, 0.36, -1, 'sit', 0); U.heart(g, x, y + 12, 5, '#E4566E');
        g.restore();
      }
    } });

  add({ id: 'speedrun', name: 'Obstacle course speed run', kind: 'cool', dur: 8200,
    cap: 'Tidbit’s obstacle course speed run. Sugarfoot has the stopwatch', punch: [5000, 'Weave, hop, tunnel, finish! A new record.'],
    at: function (A) { return [A.cx - A.span + 6, A.cx - A.span + 52]; },
    run: function (A, T, S) {
      var c = A.cx, sp = A.span, x0 = c - sp + 6, x1 = c + sp - 30;
      S.x = c - sp + 52; S.face = 1; S.dy = 6; T.dy = -6;
      S.over = function (g, A2, i) { var h = A2.headL(i); A2.U.circle(g, h.x + 14, h.y + 8, 4.6, '#E6E2EE'); A2.U.circle(g, h.x + 14, h.y + 8, 3.4, '#FFFFFF'); A2.U.line(g, h.x + 14, h.y + 8, h.x + 14 + Math.cos(A2.now / 120) * 2.6, h.y + 8 + Math.sin(A2.now / 120) * 2.6, '#E4566E', 0.8); };
      A.say(S, 'Go!', 600, 1200);
      if (A.t >= 900 && A.t < 5000) {
        var p = A.p(900, 5000); T.x = mix(x0, x1, p); T.pose = 'run'; T.face = 1;
        T.dy = -6 + 10 * Math.sin(clamp((T.x - (c - 70)) / 60, 0, 1) * TAU * 1.5); // weaving the cones
        var hx = c + 6; if (Math.abs(T.x - hx) < 22) T.lift = 30 * Math.cos((T.x - hx) / 22 * PI / 2);
        if (T.x > c + 36 && T.x < c + 74) T.alpha = 0.15;
      }
      if (A.t >= 5000) { T.x = x1; T.face = -1; A.hop(T, 5100, 400, 30); }
      A.say(S, '3.2 s!', 5200, 6200); A.say(T, 'New record!', 5600, 6800);
      if (A.once(5000)) A.burst(x1, A.G - 60, 16, 'confetti', { speed: 0.14, spread: 2.6 });
    },
    back: function (g, A) { var U = A.U, c = A.cx; [c - 70, c - 40, c - 10].forEach(function (x) { g.fillStyle = '#F6A04D'; g.beginPath(); g.moveTo(x - 6, A.G + 2); g.lineTo(x, A.G - 16); g.lineTo(x + 6, A.G + 2); g.fill(); U.rr(g, x - 4, A.G - 8, 8, 2.4, 0, '#FFFFFF'); }); U.rr(g, c + 4 - 18, A.G - 22, 3, 24, 1, '#8E6B9E'); U.rr(g, c + 4 + 15, A.G - 22, 3, 24, 1, '#8E6B9E'); U.rr(g, c + 4 - 18, A.G - 24, 36, 4, 2, '#F7DC6F'); },
    front: function (g, A) { var U = A.U, c = A.cx; g.fillStyle = '#7FB8F0'; g.beginPath(); g.ellipse(c + 56, A.G + 2, 22, 20, 0, PI, TAU); g.fill(); U.ell(g, c + 56, A.G - 6, 16, 12, 'rgba(40,60,110,.35)'); U.rr(g, c + A.span - 20, A.G - 40, 3, 42, 1, '#6B5A70'); U.rr(g, c + A.span - 20, A.G - 40, 14, 8, 1, '#F2F2F2'); U.rr(g, c + A.span - 20, A.G - 40, 7, 4, 0, '#3C3350'); U.rr(g, c + A.span - 13, A.G - 36, 7, 4, 0, '#3C3350'); } });

  add({ id: 'detective', name: 'Detective Tidbit', kind: 'silly', dur: 8800,
    cap: 'Detective Tidbit and the Case of the Missing Ball', punch: [6200, 'Case closed! It was under Sugarfoot all along.'],
    at: function (A) { return [A.cx - A.span + 8, A.cx + A.span - 20]; },
    run: function (A, T, S) {
      var c = A.cx, sp = A.span;
      T.over = function (g, A2, i) { var h = A2.headL(i); A2.U.ell(g, h.x - 1, h.y - 9, 11, 3, '#9B6B45'); A2.U.ell(g, h.x - 1, h.y - 12, 7, 4.6, '#B7865A'); g.strokeStyle = '#6B5A70'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(h.x + 11, h.y + 6); g.lineTo(h.x + 22, h.y + 4); g.stroke(); g.strokeStyle = '#3C3350'; g.lineWidth = 1.4; g.beginPath(); g.arc(h.x + 27, h.y + 3, 5, 0, TAU); g.stroke(); A2.U.circle(g, h.x + 27, h.y + 3, 4.2, 'rgba(200,230,255,.5)'); };
      S.x = c + sp - 20; S.face = -1; S.tilt = 0.25; S.blink = A.t > 2000 && A.t < 2300;
      var stops = [[600, c - sp + 8, c - 50], [2400, c - 50, c + 0], [4200, c + 0, c + sp - 66]];
      stops.forEach(function (q) { A.walk(T, q[1], q[2], q[0], q[0] + 1200); if (A.in(q[0] + 1200, q[0] + 1800)) { T.pose = 'bow'; T.tilt = 0.2; } });
      A.say(T, 'Hmm…', 1900, 2600); A.say(T, 'A clue!', 3700, 4400); A.say(S, '?', 5000, 5600);
      if (A.t > 6000) { S.lift = 14 * A.back(6000, 6400) * (1 - A.e(7000, 7400)); A.say(T, 'Case closed!', 6200, 7300); }
      if (A.t > 7400) laugh(A, T, S, 7500);
    },
    back: function (g, A) { var c = A.cx, sp = A.span; for (var i = 0; i < 9; i++) { var x = mix(c - sp + 30, c + sp - 40, i / 8); if (A.t < 300 + i * 500) continue; g.save(); g.globalAlpha *= 0.55; A.U.ell(g, x, A.G + 8 + (i % 2) * 4, 2.6, 2, '#6B4A3A'); A.U.circle(g, x - 2.4, A.G + 5 + (i % 2) * 4, 0.9, '#6B4A3A'); A.U.circle(g, x + 2.4, A.G + 5 + (i % 2) * 4, 0.9, '#6B4A3A'); g.restore(); } },
    front: function (g, A) { var p = A.pos(1); if (A.t < 7400) A.U.ball(g, p.x + 6 + (A.t > 6000 ? A.e(6400, 7200) * -30 : 0), A.G - 2 - (A.t > 6000 ? 0 : 0), 5); } });

  add({ id: 'launcher', name: 'The treat launcher', kind: 'cool', dur: 8400,
    cap: 'Inventor Tidbit has built a treat launcher. Stand back!', punch: [5600, 'One small adjustment… and a perfect catch!'],
    at: function (A) { return [A.cx - 60, A.x1 + 18]; },
    run: function (A, T, S) {
      T.x = A.cx - 64; T.face = 1; S.x = A.x1 + 18; S.face = -1;
      for (var k = 0; k < 4; k++) rear(A, T, 300 + k * 520, 700 + k * 520, 0.3);
      if (A.tick(180, 300, 2400)) A.burst(A.cx - 30, A.G - 30, 1, 'spark');
      A.say(T, 'Ready?', 2500, 3200); if (A.in(2800, 4000)) S.tilt = -0.3;
      if (A.in(3000, 3300)) T.pose = 'bow';
      if (A.t > 3800 && A.t < 4700) { T.tilt = 0.3; A.say(T, '?', 3900, 4600); }
      if (A.in(4800, 5400)) { T.pose = 'bow'; if (A.tick(150, 4800, 5400)) A.burst(A.cx - 30, A.G - 26, 2, 'spark'); }
      if (A.in(5500, 5800)) T.pose = 'bow';
      if (A.t > 6200) { S.wag = 3.5; A.say(S, 'Mmm!', 6300, 7200); A.say(T, 'It works!', 6600, 7600); }
      hearts(A, A.x1, A.G - 70, 6300);
    },
    back: function (g, A) {
      var U = A.U, x = A.cx - 30, y = A.G + 2, fire = A.bump(3000, 3300) + A.bump(5500, 5800);
      U.rr(g, x - 16, y - 20, 32, 20, 3, '#9AA3B8'); [[-8, -26, 7], [8, -24, 5]].forEach(function (q, j) { g.save(); g.translate(x + q[0], y + q[1]); g.rotate(A.t / (j ? -200 : 260)); g.fillStyle = '#C9CEDA'; for (var k = 0; k < 8; k++) { g.rotate(TAU / 8); g.fillRect(-1.2, -q[2] - 2, 2.4, 4); } U.circle(g, 0, 0, q[2], '#C9CEDA'); U.circle(g, 0, 0, q[2] * 0.4, '#6B7388'); g.restore(); });
      g.save(); g.translate(x + 10, y - 16); g.rotate(-0.4 - fire * 1.2); U.rr(g, 0, -2, 24, 4, 2, '#E4566E'); U.circle(g, 24, 0, 4, '#8E6B9E'); g.restore();
    },
    front: function (g, A) {
      var U = A.U, x = A.cx - 30, s = A.mouth(1), h0 = A.head(0);
      function treat(px, py) { A.U.bone(g, px, py, 10, A.t / 90, '#E0B77F'); }
      if (A.in(3000, 3900)) { var p = A.p(3000, 3900), q = arcPt(p, x + 30, A.G - 30, h0.x + 2, h0.y - 12, 120); treat(q.x, q.y); }
      if (A.in(3900, 4700)) treat(h0.x + 2, h0.y - 12);
      if (A.in(5500, 6250)) { var p2 = A.p(5500, 6250), q2 = arcPt(p2, x + 30, A.G - 30, s.x, s.y, 70); treat(q2.x, q2.y); }
    } });

  add({ id: 'tours', name: 'Tidbit Tours', kind: 'silly', dur: 9000,
    cap: 'Welcome to Tidbit Tours! Please keep your paws inside the tour', punch: [5600, 'Final stop: the best view of all. Her best friend.'],
    at: function (A) { return [A.cx - A.span + 50, A.cx - A.span + 6]; },
    run: function (A, T, S) {
      var c = A.cx, sp = A.span;
      T.over = function (g, A2, i) { var h = A2.headL(i); g.strokeStyle = '#6B5A70'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(h.x + 11, h.y + 6); g.lineTo(h.x + 6, h.y - 30); g.stroke(); g.fillStyle = '#F7DC6F'; g.beginPath(); g.moveTo(h.x + 6, h.y - 30); g.lineTo(h.x + 22, h.y - 26 + Math.sin(A2.now / 120) * 1.5); g.lineTo(h.x + 6, h.y - 21); g.fill(); };
      A.walk(T, c - sp + 50, c - 20, 300, 1500); A.walk(S, c - sp + 6, c - 74, 400, 1600);
      if (A.in(1500, 3000)) { T.face = -1; rear(A, T, 1600, 2200, 0.25); }
      A.say(T, 'A stick!', 1700, 2700); A.say(S, 'Ooh.', 2300, 3000);
      A.walk(T, c - 20, c + sp - 10, 3100, 4300); A.walk(S, c - 74, c + sp - 64, 3200, 4400);
      if (A.in(4300, 5400)) { T.face = -1; T.tilt = -0.35; S.tilt = -0.35; }
      A.say(T, 'A cloud!', 4400, 5300);
      if (A.t > 5500) { T.face = -1; S.face = 1; rear(A, T, 5600, 6200, 0.3); A.say(T, 'And… you!', 5700, 6800); A.say(S, '<3', 6600, 7600); if (A.t > 6800) { T.pose = S.pose = 'sit'; } }
      hearts(A, c + sp - 36, A.G - 80, 6600);
    },
    back: function (g, A) { var U = A.U, x = A.cx - 50; g.save(); g.translate(x, A.G + 6); g.rotate(0.1); U.rr(g, -14, -2, 28, 3.4, 1.5, '#9B6B45'); U.line(g, 6, -1, 10, -6, '#9B6B45', 1.6); g.restore(); if (A.t > 1600 && A.t < 3000) U.star(g, x, A.G - 8, 3 + A.bump(1600, 2200) * 2, '#F8D76A'); } });

  add({ id: 'dominoes', name: 'Domino run', kind: 'cool', dur: 8200,
    cap: 'Tidbit sets up a long, long domino run', punch: [3900, 'Tap! Click-click-click-click… DING!'],
    at: function (A) { return [A.cx - A.span + 20, A.cx + A.span - 10]; },
    run: function (A, T, S) {
      var c = A.cx, sp = A.span, x0 = c - sp + 34, x1 = c + sp - 40;
      if (A.t < 3600) { var p = A.p(200, 3500); T.x = mix(c - sp + 20, x1 - 8, p); T.face = 1; T.pose = Math.floor(A.t / 250) % 2 ? 'bow' : 'run'; T.dy = -8; }
      else { A.walk(T, x1 - 8, c - sp + 20, 3500, 3800); if (A.t >= 3800) { T.x = c - sp + 20; T.face = 1; if (A.in(3800, 4000)) T.pose = 'bow'; } }
      S.x = c + sp - 10; S.face = -1; S.dy = 8; S.tilt = 0.15;
      A.say(S, 'Ding!', 6200, 7000); A.hop(S, 6200, 300, 20); A.hop(T, 6300, 300, 20);
      if (A.once(6100)) A.burst(x1 + 12, A.G - 34, 8, 'note', { speed: 0.08 });
      if (A.t > 7000) laugh(A, T, S, 7000);
    },
    front: function (g, A) {
      var U = A.U, c = A.cx, sp = A.span, x0 = c - sp + 34, x1 = c + sp - 40, n = 14;
      for (var i = 0; i < n; i++) { var x = mix(x0, x1, i / (n - 1)), put = 200 + i * (3300 / n); if (A.t < put) continue; var fall = A.e(3900 + i * 150, 4100 + i * 150) * 1.25;
        g.save(); g.translate(x + 2, A.G + 4); g.rotate(fall); U.rr(g, -2, -14, 4, 14, 1, ['#E4566E', '#7FB8F0', '#F7DC6F', '#8FD694'][i % 4]); g.restore(); }
      var bx = x1 + 14, ring = A.bump(6100, 6600) * 0.3; U.line(g, bx, A.G + 2, bx, A.G - 22, '#6B5A70', 1.6); g.save(); g.translate(bx, A.G - 24); g.rotate(Math.sin(A.t / 40) * ring); g.fillStyle = '#F2C14E'; g.beginPath(); g.moveTo(-7, 8); g.quadraticCurveTo(-7, -6, 0, -6); g.quadraticCurveTo(7, -6, 7, 8); g.closePath(); g.fill(); U.circle(g, 0, 9, 1.8, '#B08A2E'); g.restore();
    } });

  add({ id: 'treasure', name: 'Treasure map', kind: 'cool', dur: 8800,
    cap: 'Tidbit draws a treasure map. X marks the spot!', punch: [5800, 'Treasure! Two matching bandanas.'],
    run: function (A, T, S) {
      var c = A.cx;
      for (var k = 0; k < 3; k++) rear(A, T, 200 + k * 450, 550 + k * 450, 0.25);
      A.say(T, 'X!', 1700, 2400);
      A.walk(T, A.x0, c - 26, 2400, 3100); A.walk(S, A.x1, c + 26, 2500, 3200);
      if (A.in(3300, 5200)) { T.pose = Math.floor(A.t / 300) % 2 ? 'bow' : 'sit'; S.pose = Math.floor(A.t / 300) % 2 ? 'sit' : 'bow'; }
      if (A.tick(200, 3300, 5200)) A.burst(c, A.G - 2, 2, 'dirt');
      if (A.t > 6200) { var band = function (col) { return function (g) { g.fillStyle = col; g.beginPath(); g.moveTo(9, -34); g.lineTo(19, -30); g.lineTo(15, -20); g.closePath(); g.fill(); }; }; T.over = band('#E4566E'); S.over = band('#E4566E'); T.wag = S.wag = 3.5; }
      A.say(S, 'Matching!', 6400, 7400); hearts(A, c, A.G - 80, 6600);
      if (A.once(5800)) A.burst(c, A.G - 30, 16, 'spark', { spread: 2.4 });
    },
    back: function (g, A) { if (A.t > 2200) { A.U.line(g, A.cx - 5, A.G + 4, A.cx + 5, A.G + 10, '#E4566E', 2); A.U.line(g, A.cx + 5, A.G + 4, A.cx - 5, A.G + 10, '#E4566E', 2); } },
    front: function (g, A) {
      var U = A.U, c = A.cx;
      if (A.t < 2400) { var m = A.head(0), s = A.back(100, 500), x = m.x + 34, y = m.y + 10; g.save(); g.translate(x, y); g.scale(s, s); U.rr(g, -18, -12, 36, 24, 2, '#F3E3B6'); g.setLineDash([2, 2]); g.strokeStyle = '#8A6340'; g.lineWidth = 1; g.beginPath(); g.moveTo(-14, 6); g.quadraticCurveTo(-4, -8, 4, 2); g.quadraticCurveTo(8, 6, 10, -4); g.stroke(); g.setLineDash([]); U.line(g, 8, -7, 13, -2, '#E4566E', 1.6); U.line(g, 13, -7, 8, -2, '#E4566E', 1.6); g.restore(); }
      if (A.t > 5200) { var up = A.back(5200, 5700), cy = A.G + 4 - 14 * up, lid = A.e(5800, 6200); U.rr(g, c - 14, cy - 12, 28, 14, 2, '#9B6B45'); U.rr(g, c - 14, cy - 6, 28, 2, 0, '#F2C14E'); g.save(); g.translate(c - 14, cy - 12); g.rotate(-lid * 1.1); U.rr(g, 0, -6, 28, 6, 3, '#B7865A'); g.restore(); if (lid > 0.5) { U.star(g, c - 4, cy - 18, 3, '#F8D76A', A.t / 200); U.star(g, c + 6, cy - 22, 2.4, '#F8D76A', -A.t / 200); } }
    } });

  add({ id: 'telescope', name: 'Telescope night', kind: 'sweet', time: 'night', dur: 8600,
    cap: 'Tidbit sets up her telescope and looks at the moon', punch: [4400, 'The moon winked at her! Sugarfoot has to see this.'],
    run: function (A, T, S) {
      T.x = A.cx - 26; T.face = 1; if (A.in(800, 4300)) { T.pose = 'sit'; T.tilt = -0.25; }
      A.say(T, '!', 4400, 5000); if (A.in(4400, 4800)) T.x -= 8 * A.bump(4400, 4800);
      A.say(T, 'Look!', 5000, 5800);
      if (A.t > 5200) { T.x = A.cx - 70; S.x = mix(A.x1, A.cx - 26, A.e(5200, 6000)); S.face = S.x < A.x1 - 2 && A.t < 6000 ? -1 : 1; if (A.t > 6000) { S.face = 1; S.tilt = -0.25; } }
      A.say(S, 'Hi, moon!', 6600, 7600); hearts(A, A.cx + 60, 70, 7000);
    },
    back: function (g, A) {
      var U = A.U, mx = A.cx + A.span - 20, my = 60, wink = A.bump(4200, 4700);
      U.circle(g, mx, my, 26, 'rgba(255,250,220,.15)'); U.circle(g, mx, my, 18, '#FBF3D5'); U.circle(g, mx - 6, my + 6, 3, '#EDE3C2'); U.circle(g, mx + 8, my - 7, 2.4, '#EDE3C2');
      U.circle(g, mx - 6, my - 3, 1.4, '#6B5A70'); if (wink > 0.3) U.line(g, mx + 3, my - 3, mx + 8, my - 3, '#6B5A70', 1.2); else U.circle(g, mx + 6, my - 3, 1.4, '#6B5A70');
      if (A.t > 4000) { g.strokeStyle = '#6B5A70'; g.lineWidth = 1.2; g.beginPath(); g.arc(mx, my + 3, 6, 0.3, PI - 0.3); g.stroke(); }
      var x = A.cx + 2, y = A.G + 2; U.line(g, x, y - 26, x - 10, y, '#6B5A70', 1.6); U.line(g, x, y - 26, x + 10, y, '#6B5A70', 1.6); g.save(); g.translate(x, y - 28); g.rotate(-0.55); U.rr(g, -14, -4, 34, 8, 3, '#7C97E8'); U.rr(g, 18, -5, 6, 10, 2, '#5B6FC0'); g.restore();
    } });

  add({ id: 'checkers', name: 'Checkers rematch', kind: 'sweet', dur: 8400,
    cap: 'A game of checkers. Tidbit wins in three quick moves…', punch: [4600, '…then she lets Sugarfoot win the rematch.'],
    run: function (A, T, S) {
      T.x = A.cx - 46; S.x = A.cx + 46; T.pose = S.pose = 'sit';
      [900, 1600, 2300].forEach(function (t0) { rear(A, T, t0 - 150, t0 + 200, 0.2); });
      A.say(T, 'Ta-da!', 2800, 3600); A.say(S, 'Ooh.', 3200, 3900);
      rear(A, S, 5000, 6300, 0.18); A.say(S, 'Yay?', 6400, 7300);
      if (A.in(6800, 7200)) T.blink = true;
      if (A.t > 7300) { T.wag = S.wag = 3.5; } hearts(A, A.cx, A.G - 60, 7300);
    },
    front: function (g, A) {
      var U = A.U, x = A.cx, y = A.G + 4, s = 6; U.rr(g, x - 26, y - 14, 52, 14, 2, '#9B6B45');
      g.save(); g.translate(x, y - 14); g.scale(1, 0.4); for (var i = 0; i < 8; i++) for (var j = 0; j < 8; j++) U.rr(g, -24 + i * s, -24 + j * s, s, s, 0, (i + j) % 2 ? '#2C2638' : '#F4EFE6');
      var red = [[1, 5], [3, 5], [5, 6]], blue = [[2, 2], [4, 1], [6, 2]];
      function piece(ij, col, off) { U.circle(g, -24 + ij[0] * s + 3 + (off ? off[0] : 0), -24 + ij[1] * s + 3 + (off ? off[1] : 0), 2.4, col); }
      red.forEach(function (ij, k) { var t0 = 900 + k * 700, p = A.e(t0 - 200, t0); piece(ij, '#E4566E', [p * 6, -p * 12]); });
      blue.forEach(function (ij, k) { var p = A.e(5000 + k * 400, 5300 + k * 400); piece(ij, '#7FB8F0', [-p * 6, p * 12]); });
      g.restore();
    } });

  add({ id: 'robot', name: 'Cardboard robot', kind: 'cool', dur: 8600,
    cap: 'Tidbit builds a cardboard robot. Box, box, box, antenna…', punch: [3200, 'It’s alive! And it really wants a hug.'],
    run: function (A, T, S) {
      T.x = A.cx - 54; T.face = 1; [600, 1300, 2000, 2700].forEach(function (t0) { A.hop(T, t0, 300, 22); });
      A.say(T, 'Beep?', 3100, 3800); A.say(S, 'Aww!', 4200, 5000);
      A.walk(S, A.x1, A.cx + 26, 5400, 6000); if (A.t >= 6000) { S.x = A.cx + 26; S.face = -1; lean(S, 0.22 * A.e(6000, 6400)); }
      hearts(A, A.cx, A.G - 80, 6400, 8);
    },
    back: function (g, A) {
      var U = A.U, x = A.cx, y = A.G + 2, on = A.t > 3200, sway = on && A.t < 6000 ? Math.round(Math.sin(A.t / 240) * 2) * 0.06 : 0;
      g.save(); g.translate(x, y); g.rotate(sway);
      if (A.t > 600) { U.rr(g, -10, -14, 7, 14, 1, '#C9A77A'); U.rr(g, 3, -14, 7, 14, 1, '#C9A77A'); }
      if (A.t > 1300) { U.rr(g, -14, -40, 28, 27, 2, '#D9B98A'); U.rr(g, -6, -33, 12, 10, 2, on ? (A.t > 6400 ? '#F28AA8' : '#8FD694') : '#B89A70'); if (on && A.t > 6400) U.heart(g, 0, -28, 4, '#E4566E'); }
      if (A.t > 2000) { U.rr(g, -11, -60, 22, 19, 2, '#C9A77A'); U.circle(g, -5, -52, 2.6, on ? '#7FE0F7' : '#8A6F4E'); U.circle(g, 5, -52, 2.6, on ? '#7FE0F7' : '#8A6F4E'); U.rr(g, -4, -46, 8, 1.6, 1, '#8A6F4E'); U.rr(g, -22, -38 + (on ? Math.sin(A.t / 200) * 3 : 0), 8, 4, 2, '#D9B98A'); U.rr(g, 14, -38 - (on ? Math.sin(A.t / 200) * 3 : 0), 8, 4, 2, '#D9B98A'); }
      if (A.t > 2700) { U.line(g, 0, -60, 0, -70, '#6B5A70', 1.2); U.circle(g, 0, -71, 2.4, on ? '#F7DC6F' : '#E4566E'); }
      g.restore();
      if (A.once(3200)) A.burst(x, y - 72, 8, 'spark', { spread: TAU });
      if (on && A.in(3400, 5800)) A.say({ x: x + 20, y: y - 70, face: 1 }, 'Beep boop!', 3600, 4800);
    } });

  add({ id: 'shadowrace', name: 'Racing her shadow', kind: 'surprising', time: 'day', dur: 7600,
    cap: 'Tidbit races her own shadow. Neck and neck…', punch: [4600, 'She stops. Her shadow… keeps going?!'],
    at: function (A) { return [A.cx - A.span + 8, A.cx + A.span - 10]; },
    run: function (A, T, S) {
      var c = A.cx, sp = A.span; S.x = c + sp - 10; S.face = -1;
      if (A.t < 4600) { T.x = mix(c - sp + 8, c + 20, A.e(400, 4400)); T.face = 1; if (A.in(400, 4400)) T.pose = 'run'; }
      else T.x = c + 20;
      A.say(T, '?!', 4800, 5600); if (A.in(4800, 5800)) T.tilt = 0.3;
      A.say(S, 'Ha!', 5400, 6200); if (A.t > 6600) laugh(A, T, S, 6600);
    },
    back: function (g, A) {
      var p = A.pos(0), c = A.cx, run = A.t > 400 && A.t < 5400, off = A.t > 4600 ? 34 * A.bump(4600, 6400) : 0;
      g.save(); g.translate(p.x + 6 + off, A.G + 8); g.scale(1, -0.38); silhouette(g, A, 'drop', 0, 0, A.S * 0.95, 1, run ? 'run' : 'sit', 0.3); g.restore();
    } });

  add({ id: 'fiveline', name: 'High-five line', kind: 'silly', dur: 8400,
    cap: 'Tidbit is first in line for high fives. So is everyone else', punch: [6000, 'Saving the best for last: Sugarfoot!'],
    at: function (A) { return [A.cx - 50, A.cx + A.span - 8]; },
    run: function (A, T, S) {
      T.x = A.cx - 50; T.face = 1;
      [1300, 2700, 4100].forEach(function (t0) { rear(A, T, t0 - 250, t0 + 250, 0.55); if (A.once(t0)) A.burst(A.cx - 26, A.G - 56, 6, 'spark'); });
      S.x = A.cx + A.span - 8; S.face = -1;
      A.walk(S, A.cx + A.span - 8, A.cx - 6, 5000, 5800);
      if (A.t > 5800) { S.x = A.cx - 6; S.face = -1; rear(A, T, 6000, 6800, 0.65); rear(A, S, 6000, 6800, 0.65); }
      if (A.once(6400)) A.burst(A.cx - 28, A.G - 70, 16, 'confetti', { speed: 0.14, spread: 2.4 });
      A.say(T, 'Next!', 1500, 2200); A.say(T, 'Next!', 2900, 3600); A.say(T, 'Best!', 6600, 7600);
      hearts(A, A.cx - 28, A.G - 80, 7000);
    },
    front: function (g, A) {
      var U = A.U, line = A.cx + 10;
      function slot(k, t0) { var inP = A.e(t0 - 900, t0 - 300), outP = A.e(t0 + 300, t0 + 900); return { x: mix(line + 30 + k * 26, A.cx - 22, inP) - outP * 0, y: A.G + 3 - outP * 90, a: 1 - outP }; }
      var s0 = slot(0, 1300), s1 = slot(1, 2700), s2 = slot(2, 4100);
      g.save(); g.globalAlpha *= s0.a; snail(g, U, s0.x, A.G + 3, 0.8, -1, A.now); g.restore();
      g.save(); g.globalAlpha *= s1.a; bird(g, U, s1.x, s1.y - 4, 1.1, -1, Math.abs(Math.sin(A.now / 80))); g.restore();
      g.save(); g.globalAlpha *= s2.a; mouse(g, U, s2.x, s2.y, 1, -1); g.restore();
    } });

  add({ id: 'watchful', name: 'On watch', kind: 'sweet', dur: 8800,
    cap: 'Sugarfoot takes a nap. Tidbit keeps watch', punch: [4200, 'A bee buzzes by. Tidbit politely shows it the way out.'],
    run: function (A, T, S) {
      S.pose = 'lie'; S.blink = true; S.x = A.x1 - 4;
      T.x = A.x0 + 10; T.face = Math.cos(A.t / 700) > 0 ? 1 : -1; T.tilt = Math.sin(A.t / 500) * 0.15;
      T.over = A.t < 6400 ? function (g, A2, i) { var h = A2.headL(i); A2.U.circle(g, h.x + 4, h.y - 1, 2.8, '#3C3350'); A2.U.circle(g, h.x + 9, h.y - 1, 2.8, '#3C3350'); A2.U.circle(g, h.x + 4, h.y - 1, 1.6, '#9FD2F2'); A2.U.circle(g, h.x + 9, h.y - 1, 1.6, '#9FD2F2'); } : null;
      if (A.t > 4000 && A.t < 6000) { T.face = 1; T.x = A.x0 + 10 + 36 * A.e(4000, 4500); rear(A, T, 4600, 5400, 0.35); A.say(T, 'Shh!', 4700, 5500); }
      if (A.t >= 6000) { T.x = mix(A.x0 + 46, A.x1 - 50, A.e(6000, 6800)); if (A.t > 6800) { T.pose = 'lie'; T.face = 1; T.blink = A.t > 7600 ? (Math.sin(A.t / 300) > 0) : false; } }
      if (A.t > 1000) A.say(S, 'Zzz', 1200, 2600);
      hearts(A, A.x1 - 30, A.G - 50, 7200, 4); gold(A, A.x0 + 40, A.G - 70, 5400, 5);
    },
    front: function (g, A) { if (A.t < 3800 || A.t > 6200) return; var p = A.p(3800, 6200), x = mix(A.cx + A.span + 10, A.cx - A.span - 20, p < 0.4 ? p * 0.9 : 0.36 + (p - 0.4) * 1.1), y = A.G - 50 + Math.sin(A.t / 120) * 8 - (p > 0.4 ? (p - 0.4) * 160 : 0); if (p > 0.45) x = mix(A.cx - 10, A.cx + A.span + 20, (p - 0.45) / 0.55); bee(g, A.U, x, y, 1.1, A.now); } });

  add({ id: 'cookiecode', name: 'The cookie jar code', kind: 'silly', dur: 7800,
    cap: 'Tidbit tries to crack the cookie jar code. Click… click…', punch: [4200, 'Open! One cookie each, of course.'],
    run: function (A, T, S) {
      T.x = A.cx - 30; T.face = 1; T.tilt = 0.2;
      [900, 1800, 2700].forEach(function (t0) { rear(A, T, t0 - 200, t0 + 200, 0.2); if (A.once(t0)) A.burst(A.cx + 4, A.G - 26, 3, 'spark'); });
      A.say(T, 'Hmm…', 1100, 1800); A.say(T, 'Aha!', 3300, 4100);
      A.say(S, '!', 4300, 4900);
      if (A.t > 4600) { T.face = 1; T.x = A.cx - 30; }
      if (A.in(5000, 5800)) { S.tilt = -0.3; }
      if (A.t > 5800) { T.pose = S.pose = 'lie'; if (A.tick(260, 5900, 7200)) { A.burst(A.mouth(0).x, A.mouth(0).y, 1, 'crumb'); A.burst(A.mouth(1).x, A.mouth(1).y, 1, 'crumb'); } }
      hearts(A, A.cx, A.G - 60, 6800);
    },
    front: function (g, A) {
      var U = A.U, x = A.cx + 10, y = A.G + 3;
      U.rr(g, x - 14, y - 32, 28, 32, 8, 'rgba(210,235,252,.7)'); U.circle(g, x - 5, y - 10, 5, '#D9A15E'); U.circle(g, x + 5, y - 14, 5, '#D9A15E');
      var lid = A.e(4200, 4600); g.save(); g.translate(x, y - 32 - lid * 18); g.rotate(lid * 0.6); U.rr(g, -12, -5, 24, 6, 3, '#E4566E'); g.restore();
      if (A.t < 4200) { U.rr(g, x - 12, y - 24, 24, 10, 2, '#8E8A9A'); for (var k = 0; k < 3; k++) { var t0 = 900 + k * 900, turn = A.t > t0 ? 1 : A.e(t0 - 500, t0); U.circle(g, x - 7 + k * 7, y - 19, 2.8, '#F4EFE6'); U.line(g, x - 7 + k * 7, y - 19, x - 7 + k * 7 + Math.cos(turn * 5) * 2.2, y - 19 + Math.sin(turn * 5) * 2.2, '#3C3350', 0.9); } }
      if (A.in(4400, 5800)) { var p = A.p(4600, 5400), s = A.mouth(1), m = A.mouth(0); U.circle(g, mix(x, s.x, p), mix(y - 36, s.y, p) - Math.sin(p * PI) * 40, 4, '#D9A15E'); U.circle(g, mix(x, m.x, p), mix(y - 36, m.y, p) - Math.sin(p * PI) * 30, 4, '#D9A15E'); }
    } });

  // ======================= SUGARFOOT: rescues, hugs, bravery, gentle with tiny friends =======================
  function gold(A, x, y, t, n) { if (A.once(t)) A.burst(x, y, n || 7, 'gold', { speed: 0.07 }); } // a heart of gold, when they help
  add({ id: 'ladybug', name: 'Ladybug rescue', kind: 'sweet', dur: 7600,
    cap: 'A ladybug is stuck on her back. Sugarfoot to the rescue', punch: [4000, 'A gentle nose-nudge, and she’s flying again!'],
    run: function (A, T, S) {
      A.say(T, '!', 400, 1000); A.walk(S, A.x1, A.cx + 30, 900, 2800); if (A.t >= 2800) { S.x = A.cx + 30; S.face = -1; }
      if (A.in(3000, 4200)) { S.pose = 'bow'; S.tilt = 0.1; }
      A.say(S, 'There.', 4300, 5100);
      if (A.t > 5400) { S.blink = false; S.tilt = -0.15; A.say(T, 'Hero!', 5800, 6800); T.wag = 3.5; }
      hearts(A, A.cx + 10, A.G - 70, 6200); gold(A, A.cx + 20, A.G - 60, 4100);
    },
    front: function (g, A) {
      var U = A.U, x = A.cx + 2, y = A.G + 2, t = A.t;
      if (t < 4000) { ladybug(g, U, x, y - 3, 1.4, true); var w = Math.sin(t / 60); g.strokeStyle = '#2C2638'; g.lineWidth = 0.8; for (var k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x - 3 + k * 3, y); g.lineTo(x - 4 + k * 3 + w, y + 3); g.stroke(); } }
      else { var p = A.p(4000, 5400), h = A.head(1), px, py; if (p < 1) { px = x + Math.sin(p * TAU) * 30; py = y - 6 - p * 60; } else { px = h.x + h.face * 13; py = h.y - 2; } ladybug(g, U, px, py, 1.4, false); if (p < 1) { U.ell(g, px - 4, py - 5, 4, 2, 'rgba(255,255,255,.6)', -0.5); U.ell(g, px + 4, py - 5, 4, 2, 'rgba(255,255,255,.6)', 0.5); } }
    } });

  add({ id: 'bearhug', name: 'The famous bear hug', kind: 'sweet', dur: 7400,
    cap: 'Sugarfoot warms up for her famous bear hug. Stretch…', punch: [2800, 'HUG! The best hugger there is.'],
    run: function (A, T, S) {
      if (A.in(200, 1400)) { S.pose = 'bow'; S.sx *= 1.06; } A.say(S, 'Mmm.', 400, 1300);
      if (A.in(1400, 1800)) S.rot = Math.sin(A.t / 40) * 0.1;
      if (A.t > 1800) { S.x = mix(A.x1, A.cx + 20, A.e(1800, 2600)); A.hop(S, 1900, 600, 20); }
      if (A.t > 2600) { T.x = A.cx - 20; S.x = A.cx + 20; T.face = 1; S.face = -1; var hug = A.e(2600, 3000) * (1 - A.e(5600, 6200)); lean(T, -0.55 * hug); lean(S, -0.55 * hug); S.sx *= 1 + 0.05 * Math.sin(A.t / 200) * hug; T.lift = 6 * hug; T.blink = S.blink = hug > 0.5; T.wag = S.wag = 3.5; }
      A.say(T, 'Oof!', 3100, 3900); if (A.tick(450, 3000, 5600)) A.burst(A.cx, A.G - 90, 2, 'heart'); gold(A, A.cx, A.G - 100, 3000, 8);
      if (A.t > 6300) laugh(A, T, S, 6300);
    } });

  add({ id: 'darkcave', name: 'Brave in the dark', kind: 'cool', dur: 9400,
    cap: 'A dark cave. Sugarfoot goes first, lantern held high', punch: [4200, 'Nothing scary in here. Just sparkly crystals!'],
    at: function (A) { return [A.cx - 70, A.cx - 30]; },
    run: function (A, T, S) {
      var c = A.cx, cave = c + A.span - 30;
      S.over = A.t < 8200 ? function (g, A2, i) { var h = A2.headL(i); g.strokeStyle = '#6B5A70'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(h.x + 12, h.y + 6); g.lineTo(h.x + 18, h.y + 10); g.stroke(); lantern(g, A2.U, h.x + 19, h.y + 18, 0.9, true); } : null;
      T.x = c - 70; T.face = 1; A.say(T, '?', 600, 1300); A.say(S, 'I’ve got you.', 900, 2100);
      A.walk(S, c - 30, cave, 2000, 3400); if (A.t > 3200 && A.t < 5800) S.alpha = 0;
      if (A.t > 3200) { T.tilt = 0.2; } A.say(T, 'Coming!', 4400, 5100);
      A.walk(T, c - 70, cave - 10, 4800, 5800); if (A.t > 5700 && A.t < 6400) T.alpha = 0;
      if (A.t >= 5800) { S.x = mix(cave, c + 20, A.e(6000, 7000)); S.alpha = 1; S.face = -1; if (A.in(6000, 7000)) S.pose = 'run'; }
      if (A.t >= 6200) { T.x = mix(cave - 10, c - 30, A.e(6300, 7200)); T.alpha = 1; T.face = -1; if (A.in(6300, 7200)) T.pose = 'run'; }
      if (A.t > 7200) { T.face = 1; T.over = function (g, A2, i) { var h = A2.headL(i); A2.U.star(g, h.x + 16, h.y + 8, 3.6, '#B79CEB', A2.now / 400); }; A.say(T, 'Wow!', 7400, 8300); A.say(S, 'Brave paws!', 7700, 8800); }
      hearts(A, c, A.G - 80, 7600);
    },
    back: function (g, A) {
      var U = A.U, x = A.cx + A.span - 24, y = A.G + 2;
      U.ell(g, x, y - 40, 60, 62, '#8E8A9A'); U.ell(g, x - 10, y - 48, 16, 10, '#A6A2B2'); U.ell(g, x + 20, y - 70, 14, 9, '#A6A2B2');
      g.fillStyle = '#1E1A26'; g.beginPath(); g.ellipse(x, y, 34, 46, 0, PI, TAU); g.fill();
      var glow = A.e(3400, 4200) * (1 - A.e(6000, 7000)); if (glow > 0) { var gr = g.createRadialGradient(x, y - 20, 2, x, y - 20, 40); gr.addColorStop(0, 'rgba(255,230,150,' + (0.55 * glow).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(255,230,150,0)'); g.fillStyle = gr; g.fillRect(x - 40, y - 60, 80, 60);
        [[-18, -12, '#B79CEB'], [10, -26, '#7FE0F7'], [20, -8, '#F7A8C2'], [-6, -34, '#8FD694']].forEach(function (q, k) { g.save(); g.globalAlpha *= glow * (0.7 + 0.3 * Math.sin(A.t / 300 + k)); g.fillStyle = q[2]; g.beginPath(); g.moveTo(x + q[0], y + q[1] - 8); g.lineTo(x + q[0] + 4, y + q[1]); g.lineTo(x + q[0], y + q[1] + 4); g.lineTo(x + q[0] - 4, y + q[1]); g.closePath(); g.fill(); g.restore(); }); }
    } });

  add({ id: 'mouseride', name: 'A tiny passenger', kind: 'sweet', dur: 8200,
    cap: 'A tiny mouse would like a ride. Sugarfoot says yes, of course', punch: [6400, 'Thank-you present: one very small flower.'],
    run: function (A, T, S) {
      if (A.in(1400, 2400)) S.pose = 'bow';
      if (A.t > 2400 && A.t < 6200) { var p = A.p(2600, 6000); S.x = A.x1 + Math.sin(p * TAU) * -60; S.face = Math.cos(p * TAU) >= 0 ? -1 : 1; if (p > 0 && p < 1) S.pose = 'run'; T.x = S.x - 70 * (S.face > 0 ? 1 : -1) * 0 - 58; T.x = Math.max(A.cx - A.span, Math.min(S.x - 58, A.x0 + 20)); T.face = 1; }
      if (A.t > 6200) { S.x = A.x1; S.face = -1; if (A.in(6200, 6700)) S.pose = 'bow'; }
      A.say(T, 'Hi!', 3000, 3700); A.say(S, 'Hold on!', 3600, 4400); A.say(S, 'Aww.', 6900, 7800);
      hearts(A, A.x1, A.G - 80, 6900);
    },
    front: function (g, A) {
      var U = A.U, t = A.t, h = A.head(1), x, y, f = -1;
      if (t < 1400) { x = mix(A.cx - A.span - 10, A.x1 - 30, A.e(0, 1400)); y = A.G + 3; f = 1; }
      else if (t < 2400) { var p = A.e(1400, 2400); x = mix(A.x1 - 30, h.x - h.face * 2, p); y = mix(A.G + 3, h.y - 9, p) - Math.sin(p * PI) * 10; f = 1; }
      else if (t < 6400) { x = h.x - h.face * 2; y = h.y - 9; f = h.face; }
      else { var q = A.e(6400, 6900); x = mix(h.x, h.x + h.face * 18, q); y = mix(h.y - 9, A.G + 3, q); f = -h.face; }
      mouse(g, U, x, y, 0.9, f);
      if (t > 3000 && t < 6200) { g.save(); g.translate(x + 6 * f, y - 10); g.rotate(Math.sin(t / 120) * 0.6); U.rr(g, -0.6, -4, 1.2, 4, 0.5, '#B8B1BD'); g.restore(); }
      if (t > 6800) { var m = A.mouth(1); U.line(g, m.x, m.y, m.x + 2, m.y - 8, '#6FA15A', 1); U.circle(g, m.x + 2, m.y - 9, 2.2, '#F7A8C2'); }
    } });

  add({ id: 'blanketfort', name: 'Blanket fort', kind: 'sweet', dur: 9200,
    cap: 'Sugarfoot builds a cozy blanket fort, big enough for two', punch: [5600, 'Fairy lights on. The coziest place in the world.'],
    run: function (A, T, S) {
      var c = A.cx;
      if (A.in(600, 2800)) { S.x = mix(A.x1, c + 50, A.e(600, 1200)); S.pose = Math.floor(A.t / 350) % 2 ? 'bow' : 'run'; S.ph = 0; }
      A.say(T, 'Ooh!', 1600, 2400);
      if (A.t > 3000) { T.x = mix(A.x0, c - 18, A.e(3000, 3800)); S.x = mix(c + 50, c + 18, A.e(3200, 4000)); T.face = 1; S.face = -1; if (A.t > 4000) { T.pose = S.pose = 'sit'; } }
      A.say(S, 'So cozy.', 5800, 6800); A.say(T, 'Best fort!', 6400, 7400);
      if (A.t > 7000) { lean(S, 0.14 * A.e(7000, 7400)); }
      hearts(A, c, A.G - 90, 7200);
    },
    back: function (g, A) {
      var U = A.U, c = A.cx, y = A.G + 2, up = A.e(900, 2600);
      [c - 46, c + 46].forEach(function (x) { U.rr(g, x - 7, y - 36, 14, 4, 1, '#9B6B45'); U.rr(g, x - 6, y - 32, 2, 32, 1, '#9B6B45'); U.rr(g, x + 4, y - 32, 2, 32, 1, '#9B6B45'); U.rr(g, x + 4, y - 58, 3, 26, 1, '#9B6B45'); });
      if (up > 0) { g.fillStyle = '#B79CEB'; g.beginPath(); g.moveTo(c - 60, y); g.lineTo(c - 48, y - 60 * up); g.quadraticCurveTo(c, y - 76 * up, c + 48, y - 60 * up); g.lineTo(c + 60, y); g.closePath(); g.fill(); g.fillStyle = '#4A3F63'; g.beginPath(); g.ellipse(c, y, 36, 44 * up, 0, PI, TAU); g.fill(); }
      if (A.t > 5400) for (var i = 0; i < 9; i++) { var x2 = c - 40 + i * 10, y2 = y - 50 - Math.sin(i / 8 * PI) * 12, tw = 0.6 + 0.4 * Math.sin(A.t / 400 + i); U.circle(g, x2, y2, 5, 'rgba(255,230,150,' + (0.25 * tw).toFixed(2) + ')'); U.circle(g, x2, y2, 1.8, ['#FCE38A', '#F7A8C2', '#A8E0F7'][i % 3]); }
    },
    front: function (g, A) { var U = A.U, c = A.cx, y = A.G + 2, up = A.e(900, 2600); if (up <= 0) return; g.fillStyle = '#9C84CC'; g.beginPath(); g.moveTo(c - 62, y + 2); g.quadraticCurveTo(c - 50, y - 30 * up, c - 36, y + 2); g.fill(); g.beginPath(); g.moveTo(c + 62, y + 2); g.quadraticCurveTo(c + 50, y - 30 * up, c + 36, y + 2); g.fill(); if (A.t > 2600) { U.ell(g, c - 30, y + 4, 14, 6, '#F7C9D4'); U.ell(g, c + 30, y + 4, 14, 6, '#FFF3C9'); } } });

  add({ id: 'ducklings', name: 'Duckling parade', kind: 'sweet', dur: 8600,
    cap: 'Three ducklings have decided Sugarfoot is in charge', punch: [6200, 'Everyone snuggles up for a rest. Aww.'],
    run: function (A, T, S) {
      var c = A.cx;
      if (A.t < 6200) { var p = A.p(1400, 6000); S.x = c + Math.sin(p * TAU) * (A.span - 30); S.face = Math.cos(p * TAU) >= 0 ? 1 : -1; if (p > 0 && p < 1) S.pose = 'run'; }
      else { S.x = c; S.pose = 'lie'; S.face = -1; }
      T.x = c - A.span + 8; T.face = 1; T.dy = -8; S.dy = 6; A.say(T, '!', 700, 1400); A.say(T, 'Aww!', 6600, 7600); A.say(S, 'Shh.', 7000, 7800);
      hearts(A, c, A.G - 60, 6800);
    },
    front: function (g, A) {
      var U = A.U, c = A.cx, t = A.t;
      for (var k = 0; k < 3; k++) {
        var lag = 420 + k * 380, p = clamp((t - lag - 1400) / 4600, 0, 1), x, f, y = A.G + 6;
        if (t < 1400) { x = mix(c + A.span + 40 + k * 18, c + 40 + k * 16, A.e(0, 1400)); f = -1; }
        else if (t < 6200) { x = c + Math.sin(p * TAU) * (A.span - 30); f = Math.cos(p * TAU) >= 0 ? 1 : -1; }
        else { x = c - 14 + k * 14; f = -1; y = A.G + 8; }
        duck(g, U, x, y - Math.abs(Math.sin((t + k * 100) / 110)) * (t < 6200 ? 2 : 0), 0.9, f);
      }
    } });

  add({ id: 'lanternwalk', name: 'Lantern walk', kind: 'sweet', time: 'night', dur: 8400,
    cap: 'A night walk. Sugarfoot leads the way with her lantern', punch: [4800, 'Fireflies come to say hello to the light.'],
    at: function (A) { return [A.cx - A.span + 8, A.cx - A.span + 52]; },
    run: function (A, T, S) {
      var c = A.cx, sp = A.span;
      S.over = function (g, A2, i) { var h = A2.headL(i); g.strokeStyle = '#6B5A70'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(h.x + 12, h.y + 6); g.lineTo(h.x + 18, h.y + 10); g.stroke(); lantern(g, A2.U, h.x + 19, h.y + 18, 0.9, true); };
      A.walk(S, c - sp + 52, c + 40, 400, 4200); A.walk(T, c - sp + 8, c - 10, 600, 4400);
      A.say(S, 'Right here.', 2000, 3000); A.say(T, 'Together!', 2600, 3600);
      if (A.t > 4400) { T.face = S.face = 1; T.tilt = S.tilt = -0.3; if (A.t > 6000) { T.x = c - 10; lean(S, 0.1); } }
      hearts(A, c + 20, A.G - 80, 6600);
    },
    front: function (g, A) { if (A.t < 4200) return; var m = A.head(1), n = A.R ? 5 : 8, gather = A.e(4200, 5400); for (var i = 0; i < n; i++) { var a = i / n * TAU + A.t / 1200, r = 24 + (i % 3) * 8, x = mix(A.cx + Math.sin(i * 2.3) * 100, m.x + 20 + Math.cos(a) * r, gather), y = mix(40 + i * 12, m.y + 10 + Math.sin(a) * r * 0.6, gather), gl = 0.5 + 0.5 * Math.sin(A.t / 500 + i); A.U.circle(g, x, y, 5, 'rgba(255,240,140,' + (0.2 * gl).toFixed(2) + ')'); A.U.circle(g, x, y, 1.6, 'rgba(255,248,180,' + (0.6 + 0.4 * gl).toFixed(2) + ')'); } } });

  add({ id: 'snailhelp', name: 'Snail crossing', kind: 'sweet', dur: 8200,
    cap: 'A snail needs to cross the path. Sugarfoot gives it a lift', punch: [3000, 'Crossing guard Tidbit holds up the traffic (there is no traffic).'],
    at: function (A) { return [A.cx + 10, A.cx - A.span + 30]; },
    run: function (A, T, S) {
      var c = A.cx, sp = A.span;
      S.x = c - sp + 30; S.face = -1; if (A.in(800, 1800)) S.pose = 'bow';
      if (A.t > 1800) { S.x = mix(c - sp + 30, c + sp - 20, A.e(2000, 6600)); S.face = 1; if (A.in(2000, 6600)) { S.pose = 'run'; } }
      T.x = c + 10; T.face = -1;
      T.over = A.t > 2600 && A.t < 7000 ? function (g, A2, i) { var h = A2.headL(i); A2.U.line(g, h.x + 11, h.y + 6, h.x + 13, h.y - 18, '#6B5A70', 1.4); g.save(); g.translate(h.x + 13, h.y - 26); g.fillStyle = '#E4566E'; g.beginPath(); for (var k = 0; k < 8; k++) { var a = PI / 8 + k * PI / 4; g.lineTo(Math.cos(a) * 8, Math.sin(a) * 8); } g.closePath(); g.fill(); A2.U.text(g, 'STOP', 0, 0.5, 4.5, '#FFFFFF', '800'); g.restore(); } : null;
      if (A.t > 3200 && A.t < 5600) { T.x = mix(c + 10, c - 50, A.e(3200, 3800)); T.face = 1; rear(A, T, 3800, 5400, 0.3); }
      A.say(T, 'Stop!', 3400, 4200); A.say({ x: c + sp - 40, y: A.G - 30, face: -1 }, 'Thanks!', 7000, 8000);
      hearts(A, c + sp - 30, A.G - 50, 7200); gold(A, c + sp - 30, A.G - 70, 7000);
    },
    front: function (g, A) {
      var U = A.U, t = A.t, p = A.pos(1), x, y;
      if (t < 800) { x = mix(A.cx - A.span, A.cx - A.span + 12, A.e(0, 800)); y = A.G + 3; }
      else if (t < 1800) { var q = A.e(800, 1800); x = mix(A.cx - A.span + 12, p.x - 6 * p.face, q); y = mix(A.G + 3, p.y - 30, q); }
      else if (t < 6800) { x = p.x - 6 * p.face; y = p.y - 30; }
      else { var r = A.e(6800, 7300); x = mix(p.x - 6 * p.face, A.cx + A.span - 36, r); y = mix(p.y - 30, A.G + 3, r); }
      snail(g, U, x, y, 0.7, 1, A.now);
    } });

  add({ id: 'grumblecloud', name: 'The grumbly cloud', kind: 'sweet', dur: 7800,
    cap: 'A little grey cloud drifts in, grumbling to itself', punch: [4400, 'One Sugarfoot hug later: a happy pink cloud raining confetti.'],
    run: function (A, T, S) {
      A.say(T, '?', 1200, 1900); if (A.in(1200, 2200)) T.x = A.x0 - 8 * A.e(1200, 1600);
      A.say(S, 'Aww.', 2000, 2800);
      if (A.t > 2800) { S.x = mix(A.x1, A.cx + 26, A.e(2800, 3300)); S.face = -1; var h = A.e(3300, 3700) * (1 - A.e(4600, 5000)); lean(S, -0.75 * h); S.blink = h > 0.5; S.sx *= 1 + 0.05 * h; }
      if (A.t > 5000) { T.wag = S.wag = 3.5; A.say(T, 'Yay!', 5200, 6100); }
      if (A.tick(260, 4600, 7000)) A.burst(A.cx + (Math.random() - 0.5) * 30, 80, 3, 'confetti', { angle: PI / 2, spread: 0.8, speed: 0.05 });
    },
    back: function (g, A) {
      var U = A.U, x = mix(A.cx + A.span + 40, A.cx - 14, A.e(0, 1800)) + Math.sin(A.t / 700) * 4, y = mix(40, 120, A.e(0, 1800)) - A.e(5600, 7800) * 110;
      var happy = A.e(4400, 5000), sq = A.bump(3300, 4800) * 0.15;
      g.save(); g.translate(x + 15, y); g.scale(1 - sq, 1 + sq * 0.5); g.translate(-15, 0);
      U.cloud(g, 0, 0, 0.9, happy > 0 ? 'rgb(' + Math.round(mix(170, 247, happy)) + ',' + Math.round(mix(176, 200, happy)) + ',' + Math.round(mix(196, 214, happy)) + ')' : '#AAB0C4');
      U.circle(g, 9, -2, 1.3, '#4E4A5E'); U.circle(g, 21, -2, 1.3, '#4E4A5E'); g.strokeStyle = '#4E4A5E'; g.lineWidth = 1.2; g.beginPath(); if (happy > 0.5) g.arc(15, 2, 4, 0.3, PI - 0.3); else g.arc(15, 7, 4, PI + 0.4, TAU - 0.4); g.stroke();
      g.restore();
      if (A.t < 3300) { g.strokeStyle = 'rgba(90,90,120,.5)'; g.lineWidth = 1; for (var k = 0; k < 3; k++) { var o = (A.t / 6 + k * 7) % 20; g.beginPath(); g.moveTo(x + 36 + o * 0.3, y - 10 + k * 5); g.lineTo(x + 42 + o * 0.3, y - 12 + k * 5); g.stroke(); } }
    } });

  add({ id: 'teaparty', name: 'Tiny tea party', kind: 'sweet', dur: 8800,
    cap: 'Sugarfoot hosts a tea party for her tiny friends', punch: [5600, 'Tidbit arrives with cake. Everybody cheers!'],
    at: function (A) { return [A.cx - A.span + 6, A.cx + 44]; },
    run: function (A, T, S) {
      S.x = A.cx + 44; S.face = -1;
      [1600, 2600, 3600].forEach(function (t0) { if (A.in(t0, t0 + 700)) { S.pose = 'bow'; } });
      T.x = A.cx - A.span + 6; T.face = 1; A.walk(T, A.cx - A.span + 6, A.cx - 56, 5000, 5600);
      A.say(T, 'I brought cake!', 5600, 6600);
      if (A.t > 6800) { S.tilt = -0.2; S.pivot = 'hind'; S.rot = -0.1; S.over = function (g, A2, i) { var h = A2.headL(i); A2.U.ell(g, h.x + 15, h.y - 6, 5, 1.2, '#FFFFFF'); A2.U.rr(g, h.x + 12, h.y - 11, 6, 5, 1.5, '#FFFFFF'); }; A.say(S, 'Ta-da!', 7200, 8200); }
      hearts(A, A.cx, A.G - 70, 6600, 8);
    },
    front: function (g, A) {
      var U = A.U, x = A.cx, y = A.G + 4;
      U.rr(g, x - 30, y - 16, 60, 4, 2, '#F4EFE6'); U.rr(g, x - 26, y - 12, 3, 12, 1, '#C9A77A'); U.rr(g, x + 23, y - 12, 3, 12, 1, '#C9A77A');
      [x - 18, x - 2, x + 14].forEach(function (cx2, k) { U.rr(g, cx2 - 3, y - 22, 6, 5, 1.5, '#FFFFFF'); var fill = A.e(1800 + k * 1000, 2200 + k * 1000); if (fill > 0) U.rr(g, cx2 - 2.4, y - 20, 4.8, 2.4 * fill, 1, '#C9965F'); });
      snail(g, U, x - 44, y + 1, 0.6, 1, A.now); bird(g, U, x - 14, y - 26, 0.8, 1, 0); mouse(g, U, x + 6, y - 18, 0.7, -1);
      [1600, 2600, 3600].forEach(function (t0, k) { if (!A.in(t0 + 100, t0 + 600)) return; var m = A.mouth(1); U.rr(g, m.x - 6, m.y - 2, 10, 8, 3, '#7FB8F0'); g.strokeStyle = 'rgba(201,150,95,.8)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(m.x - 6, m.y + 2); g.quadraticCurveTo(m.x - 12, m.y + 6, x - 18 + k * 16, y - 20); g.stroke(); });
      if (A.t > 5600) { var cx3 = mix(A.mouth(0).x, x - 26, A.e(6400, 6800)), cy3 = mix(A.mouth(0).y, y - 20, A.e(6400, 6800)); U.rr(g, cx3 - 6, cy3 - 6, 12, 7, 2, '#F7C9D4'); U.rr(g, cx3 - 6, cy3 - 6, 12, 2.4, 1, '#FFFFFF'); U.circle(g, cx3, cy3 - 8, 1.8, '#E4566E'); }
    } });

  add({ id: 'highdive', name: 'High dive', kind: 'cool', dur: 8800,
    cap: 'The high dive! Sugarfoot bravely goes first', punch: [5400, 'Tidbit is right behind her. CANNONBALL!'],
    at: function (A) { return [A.cx + A.span - 50, A.cx + A.span - 10]; },
    run: function (A, T, S) {
      var c = A.cx, bx = c + A.span - 10, H = 80, px = c - 42;
      function climb(d, t0, face) {
        if (A.t < t0) return;
        if (A.t < t0 + 1400) { d.x = bx; d.lift = H * A.e(t0, t0 + 1400); d.pose = 'run'; d.ph = A.t / 60; d.face = -1; d.pivot = 'hind'; d.rot = -0.9 * (1 - A.e(t0 + 1100, t0 + 1400)); return; }
        if (A.t < t0 + 2200) { d.x = mix(bx, c + 26, A.e(t0 + 1400, t0 + 2000)); d.lift = H + Math.abs(Math.sin(A.t / 120)) * 6 * A.p(t0 + 1900, t0 + 2200); d.pose = 'run'; d.face = -1; return; }
        if (A.t < t0 + 3100) { var p = A.p(t0 + 2200, t0 + 3100); d.x = mix(c + 26, px + (d.i ? 16 : -16), p); d.lift = mix(H, 0, p) + 50 * 4 * p * (1 - p); d.pose = 'sit'; d.face = -1; d.rot = -0.3 * p; return; }
        d.x = px + (d.i ? 16 : -16); d.lift = -4 + Math.sin(A.t / 300 + d.i) * 2; d.pose = 'sit'; d.face = d.i ? -1 : 1; d.dy = 4;
      }
      S.face = -1; T.face = -1; S.x = bx; T.x = c + A.span - 50;
      climb(S, 200); climb(T, 3400);
      A.say(S, 'Here I go!', 1700, 2500); A.say(T, 'Go!', 2600, 3300); A.say(T, 'Wheee!', 5700, 6500);
      if (A.once(3300)) { A.burst(px, A.G - 4, 20, 'drop', { speed: 0.2, spread: 2 }); A.shake(2); }
      if (A.once(6500)) { A.burst(px, A.G - 4, 24, 'drop', { speed: 0.22, spread: 2 }); A.shake(2); }
      if (A.t > 7000) laugh(A, T, S, 7000);
    },
    back: function (g, A) { var U = A.U, c = A.cx, bx = c + A.span - 10, H = 80; pool(g, U, c - 42, A.G + 6, 110, true); U.rr(g, bx + 8, A.G - H, 3, H + 2, 1, '#9AA3B8'); U.rr(g, bx + 18, A.G - H, 3, H + 2, 1, '#9AA3B8'); for (var k = 0; k < 6; k++) U.rr(g, bx + 8, A.G - H + 8 + k * 13, 13, 2, 1, '#9AA3B8'); var flex = Math.sin(A.t / 60) * 3 * (A.bump(2000, 2400) + A.bump(5200, 5600)); g.strokeStyle = '#7FB8F0'; g.lineWidth = 4; g.beginPath(); g.moveTo(bx + 14, A.G - H); g.quadraticCurveTo(c + 50, A.G - H, c + 18, A.G - H + flex); g.stroke(); },
    front: function (g, A) { pool(g, A.U, A.cx - 42, A.G + 6, 110, false); } });

  add({ id: 'shadowpuppets', name: 'Shadow puppets', kind: 'cool', time: 'night', dur: 8600,
    cap: 'Sugarfoot isn’t scared of the dark. She’s putting on a shadow puppet show', punch: [5800, 'Bunny, bird, heart… and the finale: Sugarfoot herself!'],
    at: function (A) { return [A.cx - 70, A.cx + 50]; },
    run: function (A, T, S) {
      T.x = A.cx - 70; T.face = 1; S.x = A.cx + 50; if (A.in(300, 7200)) S.alpha = 0;
      A.say(T, 'Ooh!', 1600, 2400); A.say(T, 'Ha!', 3600, 4300); A.say(T, '<3', 5000, 5800);
      if (A.t > 7200) { S.x = A.cx + 50 - 28 * A.e(7200, 7700); S.face = -1; A.say(S, 'Ta-da!', 7400, 8400); T.wag = 3.5; }
    },
    back: function (g, A) {
      var U = A.U, x = A.cx + 50, y = A.G + 4;
      g.fillStyle = '#E8D7B0'; g.beginPath(); g.moveTo(x - 50, y); g.lineTo(x, y - 90); g.lineTo(x + 50, y); g.closePath(); g.fill();
      var gr = g.createRadialGradient(x, y - 40, 4, x, y - 40, 50); gr.addColorStop(0, 'rgba(255,236,170,.9)'); gr.addColorStop(1, 'rgba(255,236,170,0)'); g.save(); g.beginPath(); g.moveTo(x - 50, y); g.lineTo(x, y - 90); g.lineTo(x + 50, y); g.closePath(); g.clip(); g.fillStyle = gr; g.fillRect(x - 50, y - 90, 100, 90);
      g.fillStyle = 'rgba(40,30,50,.75)'; var sx = x, sy = y - 40;
      if (A.in(800, 2800)) { var hop = Math.abs(Math.sin(A.t / 200)) * 4; U.ell(g, sx, sy - hop, 12, 8, 'rgba(40,30,50,.75)'); U.ell(g, sx - 4, sy - 14 - hop, 2.6, 8, 'rgba(40,30,50,.75)', -0.2); U.ell(g, sx + 3, sy - 14 - hop, 2.6, 8, 'rgba(40,30,50,.75)', 0.2); }
      else if (A.in(2800, 4600)) { var f = Math.sin(A.t / 90); g.beginPath(); g.moveTo(sx - 16, sy - f * 10); g.lineTo(sx, sy); g.lineTo(sx + 16, sy - f * 10); g.lineTo(sx, sy + 4); g.closePath(); g.fill(); U.circle(g, sx + 2, sy - 2, 4, 'rgba(40,30,50,.75)'); }
      else if (A.in(4600, 6200)) U.heart(g, sx, sy, 12 + Math.sin(A.t / 200) * 1.5, 'rgba(40,30,50,.75)');
      else if (A.in(6200, 7200)) { g.save(); g.globalAlpha *= 0.75; if ('filter' in g) g.filter = 'brightness(0)'; A.pup(g, 'collar', sx, sy + 18, 0.9, -1, 'sit', 0); g.restore(); if ('filter' in g) g.filter = 'none'; }
      g.restore();
      g.strokeStyle = '#B9A06A'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - 50, y); g.lineTo(x, y - 90); g.lineTo(x + 50, y); g.stroke(); U.line(g, x, y, x, y - 30, '#B9A06A', 1);
    } });

  add({ id: 'critternap', name: 'Nap buddies', kind: 'sweet', dur: 8400,
    cap: 'Sugarfoot lies very, very still. A butterfly lands. Then a ladybug. Then a bee…', punch: [6000, 'The gentlest giant. Everybody’s napping now.'],
    run: function (A, T, S) {
      S.x = A.cx + 30; S.pose = 'lie'; S.blink = A.t > 6000; S.wag = 0.4;
      T.x = mix(A.x0, A.cx - 40, A.e(3000, 4200)); T.face = 1; if (A.in(3000, 4200)) { T.pose = 'run'; }
      A.say(T, 'Shh!', 4400, 5200); if (A.t > 6400) { T.pose = 'lie'; T.blink = true; }
      if (A.t > 6000) A.say(S, 'Zzz', 6400, 7800);
    },
    front: function (g, A) {
      var U = A.U, p = A.pos(1), f = p.face, bx = p.x - f * 4, by = p.y - 22;
      var land = function (t0, sx, sy, tx, ty) { var q = A.e(t0, t0 + 1200); return { x: mix(sx, tx, q) + Math.sin(A.t / 150) * 12 * (1 - q), y: mix(sy, ty, q) + Math.cos(A.t / 130) * 8 * (1 - q) }; };
      var b1 = land(600, A.cx + A.span, 40, bx - 8 * f, by), b2 = land(2000, A.cx - A.span, 50, bx + 4 * f, by - 1), b3 = land(3400, A.cx + A.span, 70, bx + 12 * f, by + 1);
      if (A.t > 600) { var fl = Math.abs(Math.sin(A.t / (A.t > 1800 ? 500 : 60))); U.ell(g, b1.x - 4 * fl, b1.y - 3, 4 * fl + 1, 3.4, '#B79CEB'); U.ell(g, b1.x + 4 * fl, b1.y - 3, 4 * fl + 1, 3.4, '#B79CEB'); }
      if (A.t > 2000) ladybug(g, U, b2.x, b2.y + 2, 1, false);
      if (A.t > 3400) bee(g, U, b3.x, b3.y - 1, 0.9, A.t > 4600 ? 0 : A.now);
      if (A.t > 6200) { g.font = 'italic 9px Georgia, serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(110,90,170,.7)'; g.fillText('z', b3.x + 6, b3.y - 8 - (A.t / 40) % 8); }
    } });

  add({ id: 'leanarch', name: 'Perfect balance', kind: 'sweet', dur: 7000,
    cap: 'Sugarfoot leans on Tidbit. Tidbit leans back', punch: [3600, 'Perfect balance. Happiest side by side.'],
    run: function (A, T, S) {
      T.x = mix(A.x0, A.cx - 22, A.e(300, 1200)); S.x = mix(A.x1, A.cx + 22, A.e(400, 1300)); T.face = 1; S.face = -1;
      var l = A.e(1400, 2400) * (1 - A.e(6000, 6700)), wob = Math.sin(A.t / 300) * 0.05 * A.bump(2400, 3600);
      lean(T, 0.28 * l + wob); lean(S, 0.28 * l - wob); T.blink = S.blink = A.in(3800, 5200);
      A.say(S, 'Us.', 4000, 5000); A.say(T, '<3', 4300, 5300);
      if (A.tick(500, 3600, 6000)) A.burst(A.cx, A.G - 70, 1, 'heart');
    } });

  // ======================= DUO ROUTINES =======================
  add({ id: 'synchro', name: 'Synchronized swimming', kind: 'cool', dur: 9000,
    cap: 'Synchronized swimming in the paddling pool. And… begin!', punch: [5600, 'Dolphin leap! The duck judge holds up two tens.'],
    run: function (A, T, S) {
      var c = A.cx; T.x = c - 26; S.x = c + 26; T.face = 1; S.face = -1; T.dy = S.dy = 4;
      var bob = Math.sin(A.t / 300) * 3; T.lift = S.lift = -4 + bob; T.pose = S.pose = 'sit';
      A.spin(T, 1200, 900, 1); A.spin(S, 1200, 900, 1);
      if (A.in(2400, 3800)) { var u = A.bump(2400, 3800); T.rot = S.rot = PI * Math.min(1, u * 1.6); T.lift += 18 * u; S.lift += 18 * u; }
      if (A.in(4000, 5200)) { T.pivot = S.pivot = 'hind'; T.rot = S.rot = -0.6 * A.bump(4000, 5200); }
      if (A.in(5400, 6600)) { var p = A.p(5400, 6600); T.x = mix(c - 26, c + 26, p); S.x = mix(c + 26, c - 26, p); T.lift += 60 * Math.sin(p * PI); S.lift += 30 * Math.sin(p * PI); T.rot = -PI * 0.4 * Math.sin(p * PI * 2); T.pose = 'run'; T.ph = 1.2; }
      if (A.t >= 6600) { T.x = c + 26; S.x = c - 26; T.face = -1; S.face = 1; rear(A, T, 6700, 8200, 0.5); rear(A, S, 6700, 8200, 0.5); }
      if (A.tick(500, 600, 6600)) A.burst(c + (Math.random() - 0.5) * 60, A.G - 4, 2, 'drop', { speed: 0.08 });
      if (A.once(6600)) A.burst(c, A.G - 10, 16, 'drop', { speed: 0.18, spread: 2 });
      if (A.once(7000)) A.burst(c, A.G - 90, 16, 'confetti', { speed: 0.12, spread: 3 });
    },
    back: function (g, A) { pool(g, A.U, A.cx, A.G + 6, 130, true); },
    front: function (g, A) { var U = A.U; pool(g, U, A.cx, A.G + 6, 130, false); var dx = A.cx + A.span - 12; duck(g, U, dx, A.G + 6, 1.3, -1); if (A.t > 6800) { sign(g, U, dx - 12, A.G - 24, 14, 12, '10', '#FFFFFF', '#E4566E', 8); sign(g, U, dx + 4, A.G - 24, 14, 12, '10', '#FFFFFF', '#E4566E', 8); } } });

  add({ id: 'band2', name: 'Two-dog band', kind: 'cool', dur: 8800,
    cap: 'The Tidbit & Sugarfoot Band: guitar and big bass drum!', punch: [6200, 'Big finish! The birds on the wire go wild.'],
    run: function (A, T, S) {
      var beat = A.t / 500;
      T.x = A.x0; T.face = 1; T.pivot = 'hind'; T.rot = -0.25 - Math.abs(Math.sin(A.t / 180)) * 0.06; T.tilt = Math.sin(beat * PI) * 0.15;
      T.over = function (g) { g.save(); g.translate(12, -26); g.rotate(0.5); A.U.ell(g, 0, 0, 7, 5.5, '#E4566E'); A.U.circle(g, 0, 0, 1.8, '#3C3350'); A.U.rr(g, 5, -1.2, 18, 2.4, 1, '#8A6340'); g.restore(); };
      S.x = A.x1 + 10; S.face = -1; S.sy *= 1 - 0.05 * Math.max(0, Math.sin(beat * TAU)); S.wag = 2;
      if (A.in(6200, 7000)) { A.hop(T, 6200, 500, 34); A.hop(S, 6250, 500, 30); }
      A.say(T, 'Two, three, four!', 200, 1100);
      if (A.tick(500, 1000, 6200)) A.burst(A.cx, A.G - 70, 1, 'note');
      if (A.once(6400)) A.burst(A.cx, A.G - 100, 22, 'confetti', { speed: 0.14, spread: 3 });
      if (A.t > 7200) { T.rot = 0; T.pivot = 'center'; T.pose = S.pose = 'bow'; }
    },
    front: function (g, A) {
      var U = A.U, x = A.x1 - 22, y = A.G + 4, hit = Math.max(0, Math.sin(A.t / 500 * TAU));
      U.circle(g, x, y - 16, 16, '#F4EFE6'); U.circle(g, x, y - 16, 13, '#7C97E8'); U.text(g, 'T&S', x, y - 16, 7, '#FFFFFF', '800'); if (hit > 0.8) { g.strokeStyle = 'rgba(124,151,232,.5)'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y - 16, 20, 0, TAU); g.stroke(); }
      g.strokeStyle = '#3C3350'; g.lineWidth = 1; g.beginPath(); g.moveTo(A.cx - A.span, 40); g.quadraticCurveTo(A.cx, 52, A.cx + A.span, 40); g.stroke();
      for (var k = 0; k < 3; k++) { var bx = A.cx - 40 + k * 40, by = 46 + (k === 1 ? 4 : 1) - Math.abs(Math.sin(A.t / 250 + k)) * (A.t > 6200 && A.t < 7400 ? 10 : 2); bird(g, U, bx, by, 0.9, k % 2 ? -1 : 1, A.t > 6200 && A.t < 7400 ? Math.abs(Math.sin(A.t / 60)) : 0, ['#7FB8F0', '#F7A8C2', '#8FD694'][k]); U.line(g, bx, by + 4, bx, by + 15, '#8A6340', 1.2); sign(g, U, bx, by + 22, 72, 13, ['GO TIDBIT!', 'GO SUGARFOOT!', 'ENCORE!'][k], ['#FFF3C9', '#E9F2FF', '#F6EAFB'][k], ['#E4566E', '#3E5A86', '#6A2E86'][k], 7); }
    } });

  // ======================= SILLY: break dancing, jokes and silly walks =======================
  // a little boombox, pulsing to the beat (stage units)
  function boombox(g, U, x, y, t) {
    var pulse = Math.max(0, Math.sin(t / 500 * TAU)); U.rr(g, x - 17, y - 22, 34, 20, 3, '#4B4E6D'); U.rr(g, x - 6, y - 26, 12, 4, 2, '#3C3350');
    for (var k = -1; k <= 1; k += 2) { U.circle(g, x + k * 9, y - 12, 6.2 + pulse * 1.2, '#2C2638'); U.circle(g, x + k * 9, y - 12, 3 + pulse * 0.8, '#7FB8F0'); }
    U.rr(g, x - 4, y - 8, 8, 3, 1, '#F7C948');
  }
  // the fan birds on the wire, each holding a little sign: one for Tidbit, one for Sugarfoot
  function fanWire(g, U, A, hype) {
    g.strokeStyle = '#3C3350'; g.lineWidth = 1; g.beginPath(); g.moveTo(A.cx - A.span, 40); g.quadraticCurveTo(A.cx, 52, A.cx + A.span, 40); g.stroke();
    var labels = [['GO TIDBIT!', '#FFF3C9', '#E4566E'], ['GO SUGARFOOT!', '#E9F2FF', '#3E5A86'], ['BEST BUDDIES!', '#F6EAFB', '#6A2E86']], cols = ['#7FB8F0', '#F7A8C2', '#8FD694'];
    for (var k = 0; k < 3; k++) {
      var bx = A.cx - 64 + k * 64, by = 46 + (k === 1 ? 4 : 1) - Math.abs(Math.sin(A.t / 250 + k)) * (hype ? 8 : 2), sway = Math.sin(A.t / 300 + k * 2) * (hype ? 3 : 1);
      bird(g, U, bx, by, 0.9, k % 2 ? -1 : 1, hype ? Math.abs(Math.sin(A.t / 60 + k)) : 0, cols[k]);
      U.line(g, bx + sway * 0.4, by + 4, bx + sway, by + 15, '#8A6340', 1.2);
      sign(g, U, bx + sway, by + 22, 72, 13, labels[k][0], labels[k][1], labels[k][2], 7);
    }
  }

  add({ id: 'breakdance', name: 'Break dance battle', kind: 'silly', dur: 12400,
    cap: 'A break dance battle! Tidbit goes first, and the birds brought signs', punch: [9600, 'They finish with a spin, a freeze and a very silly bow.'],
    at: function (A) { return [A.cx - 70, A.cx + 70]; },
    run: function (A, T, S) {
      var c = A.cx;
      T.x = c - 70; T.face = 1; S.x = c + 70; S.face = -1;
      A.say(T, 'Dance battle!', 200, 1400); A.say(S, 'Bring it!', 1300, 2200);
      if (A.tick(500, 1200, 11800)) A.burst(c, A.G - 90, 1, 'note');
      // round one: Tidbit. Run in, spin on her back, then freeze
      A.walk(T, c - 70, c - 28, 2200, 2800);
      if (A.t > 2800) { T.x = c - 28; T.face = 1; }
      if (A.in(2900, 4700)) { T.pose = 'lie'; T.pivot = 'center'; T.rot = TAU * 3 * A.e(2900, 4700); T.lift = 4 + 4 * Math.abs(Math.sin(A.t / 120)); T.tilt = 0; }
      A.say(S, 'Whoa!', 3300, 4100);
      if (A.in(4700, 5600)) { T.pose = 'bow'; T.wag = 3; A.say(T, 'Freeze!', 4800, 5700); }
      if (A.once(4700)) A.burst(c - 28, A.G - 50, 14, 'confetti', { speed: 0.13, spread: 2.4 });
      if (A.t > 5700) { T.x = mix(c - 28, c - 70, A.e(5700, 6300)); T.face = 1; }
      // round two: Sugarfoot. Flips, then the worm
      A.walk(S, c + 70, c + 24, 5700, 6300);
      if (A.t > 6300) { S.x = c + 24; S.face = -1; }
      A.flip(S, 6500, 800, 34, 1, 1);
      A.say(T, 'Ooh!', 6600, 7400);
      if (A.in(7500, 9000)) { S.pose = 'wiggle'; S.wag = 4; S.x = c + 24 + Math.sin(A.t / 130) * 16; S.sy *= 1 - 0.1 * Math.abs(Math.sin(A.t / 130)); A.say(S, 'The worm!', 7600, 8600); }
      if (A.once(7500)) A.burst(c + 24, A.G - 50, 12, 'confetti', { speed: 0.12, spread: 2.2 });
      if (A.t > 9000) { S.x = mix(c + 24, c + 70, A.e(9000, 9500)); }
      // finale: both at once
      if (A.in(9600, 11200)) { T.pose = S.pose = 'wiggle'; T.wag = S.wag = 4; T.x = c - 40 + Math.sin(A.t / 160) * 8; S.x = c + 40 - Math.sin(A.t / 160) * 8; A.spin(T, 9800, 800, 2); A.spin(S, 10100, 800, -2); A.hop(T, 10600, 360, 24); A.hop(S, 10650, 360, 24); }
      if (A.once(10600)) A.burst(c, A.G - 90, 22, 'confetti', { speed: 0.15, spread: 3 });
      if (A.t > 11200) { T.x = c - 40; S.x = c + 40; T.face = 1; S.face = -1; T.pose = S.pose = 'bow'; }
      A.say(T, 'Tie again!', 11300, 12300); A.say(S, 'Best day!', 11500, 12400);
    },
    back: function (g, A) { fanWire(g, A.U, A, A.in(2900, 5600) || A.in(6500, 9000) || A.in(9600, 11400)); },
    front: function (g, A) { boombox(g, A.U, A.cx, A.G + 8, A.t); }
  });

  add({ id: 'jokes', name: 'Joke swap', kind: 'silly', dur: 17200,
    cap: 'Joke time! Tidbit and Sugarfoot trade their very best jokes', punch: [15600, 'Boo who? Don’t cry, it’s only a joke!'],
    at: function (A) { return [A.cx - 44, A.cx + 44]; },
    run: function (A, T, S) {
      var c = A.cx; T.x = c - 44; T.face = 1; S.x = c + 44; S.face = -1;
      function roll(d, a, b, side) { if (A.in(a, b)) { d.pose = 'lie'; d.pivot = 'center'; d.rot = side * (0.5 + Math.sin(A.t / 140) * 0.7); d.lift = 3 + 3 * Math.abs(Math.sin(A.t / 110)); } }
      // joke one: Tidbit
      A.say(T, 'What’s a pup’s favorite pizza?', 300, 2300); rear(A, T, 300, 900, 0.25);
      A.say(S, 'Hmm… I give up!', 2400, 3700);
      A.say(T, 'Pupperoni!', 3900, 4900); A.hop(T, 3900, 400, 22);
      if (A.once(3900)) A.burst(c, A.G - 100, 14, 'confetti', { speed: 0.13, spread: 2.4 });
      A.say(S, 'Ha ha ha!', 5000, 6000); roll(S, 5000, 6400, 1); A.say(T, 'Ha!', 5200, 6000); T.wag = 3;
      // joke two: Sugarfoot
      A.say(S, 'Why did the pup sit in the shade?', 6800, 9000); rear(A, S, 6800, 7400, 0.25);
      A.say(T, 'Why?', 9100, 9900);
      A.say(S, 'He didn’t want to be a hot dog!', 10000, 12200); A.hop(S, 10000, 400, 22);
      if (A.once(10000)) A.burst(c, A.G - 100, 14, 'confetti', { speed: 0.13, spread: 2.4 });
      A.flip(T, 11000, 700, 26, 1, -1); A.say(T, 'Oh no!', 11000, 12000); roll(T, 12000, 13000, -1);
      // joke three: knock knock, with the best silliness at the end
      A.say(T, 'Knock knock!', 13100, 14000); A.say(S, 'Who’s there?', 14000, 14900);
      A.say(T, 'Boo!', 14900, 15400); A.say(S, 'Boo who?', 15400, 16000);
      A.say(T, 'Don’t cry, it’s only a joke!', 16000, 17100);
      if (A.t > 16000) { T.wag = S.wag = 3; A.hop(S, 16300, 300, 14); }
    },
    front: function (g, A) {
      var U = A.U, y = A.G + 6;
      // a tiny drum for the ba-dum-tss after each punchline
      var hit = A.in(4900, 5200) || A.in(12200, 12500) || A.in(16000, 16300) ? 1.5 : 0;
      U.ell(g, A.cx, y, 12, 4, '#3C3350'); U.ell(g, A.cx, y - 5 + hit, 11, 3.6, '#F4EFE6'); U.rr(g, A.cx - 11, y - 5 + hit, 22, 6, 1, '#E4566E'); U.ell(g, A.cx, y + 1, 11, 3.6, '#B8384F');
    } });

  add({ id: 'sillywalks', name: 'Silly walks', kind: 'silly', dur: 9800,
    cap: 'The silly walk parade: Tidbit prances, Sugarfoot moonwalks', punch: [7400, 'They meet in the middle and wiggle off, very serious.'],
    at: function (A) { return [A.x0, A.x1]; },
    run: function (A, T, S) {
      var c = A.cx;
      // Tidbit prances to the right, one tiny hop at a time; Sugarfoot moonwalks backwards to the left
      var pT = A.p(600, 5200), pS = A.p(600, 5200);
      T.x = mix(A.x0, A.x1, eio(pT)); S.x = mix(A.x1, A.x0, eio(pS));
      if (pT > 0 && pT < 1) { T.face = 1; S.face = 1; T.pose = 'run'; S.pose = 'run'; var k = Math.floor((A.t - 600) / 300); A.hop(T, 600 + k * 300, 220, 12); S.tilt = Math.sin(A.t / 120) * 0.2; }
      A.say(T, 'Prance, prance, prance!', 900, 2700); A.say(S, 'Moonwalk!', 2900, 4300);
      if (A.in(5200, 7400)) { T.face = 1; S.face = -1; T.pose = 'sit'; S.pose = 'sit'; }
      A.say(T, 'Nice walk!', 5300, 6300); A.say(S, 'It’s a sidewalk.', 6400, 7600);
      if (A.once(6400)) A.burst(c, A.G - 90, 10, 'confetti', { speed: 0.12, spread: 2.2 });
      if (A.in(7500, 9200)) { T.pose = S.pose = 'wiggle'; T.wag = S.wag = 4; T.x = mix(T.x, c - 30, A.e(7500, 8000)); S.x = mix(S.x, c + 30, A.e(7500, 8000)); A.spin(T, 8000, 700, 1); A.spin(S, 8200, 700, -1); }
      if (A.t > 9200) { T.pose = S.pose = 'bow'; }
    } });

  add({ id: 'talentshow', name: 'Talent show', kind: 'cool', dur: 9600,
    cap: 'Talent show night! First up: Tidbit and her lightning card trick', punch: [5000, 'Next: Sugarfoot… hugs the judge. Top marks! A trophy for two.'],
    at: function (A) { return [A.cx - 10, A.cx + A.span - 8]; },
    run: function (A, T, S) {
      var c = A.cx;
      T.x = c - 10; T.lift = 16; T.face = -1; S.x = c + A.span - 8; S.face = -1;
      if (A.t < 4600) { A.flip(T, 2000, 600, 40, 1, -1); rear(A, T, 1000, 1600, 0.4); A.say(T, 'Your card?', 1100, 1900); }
      else { T.x = mix(c - 10, c + A.span - 44, A.e(4600, 5200)); T.lift = 16 * (1 - A.e(4600, 5000)); T.face = 1; if (A.in(4600, 5200)) T.pose = 'run'; }
      if (A.t > 4800) { S.x = mix(c + A.span - 8, c - 10, A.e(5000, 5800)); S.lift = 16 * A.e(5400, 5800); S.face = -1; if (A.in(5000, 5800)) S.pose = 'run'; }
      if (A.in(6000, 7000)) { S.x = c - A.span + 50; S.lift = 0; S.pose = 'bow'; S.blink = true; }
      if (A.t >= 7000) { S.x = c + 20; T.x = c + A.span - 44; T.face = -1; S.face = 1; T.lift = 0; S.lift = 0; rear(A, T, 7600, 8800, 0.4); rear(A, S, 7600, 8800, 0.4); A.say(S, 'We won!', 7700, 8700); }
      if (A.once(7600)) A.burst(c + 60, A.G - 80, 22, 'confetti', { speed: 0.14, spread: 3 });
    },
    back: function (g, A) {
      var U = A.U, c = A.cx, y = A.G + 2;
      U.rr(g, c - 60, y - 16, 110, 16, 2, '#8E6B9E'); U.rr(g, c - 60, y - 18, 110, 3, 1, '#F2C14E');
      var open = A.e(0, 800); g.fillStyle = '#C9474F'; g.fillRect(c - 64, y - 110, 30 - 24 * open + 4, 94); g.fillRect(c + 30 + 24 * open, y - 110, 24 - 24 * open + 4, 94); U.rr(g, c - 66, y - 114, 120, 8, 2, '#A83A42');
      var sx = A.t < 4800 ? A.pos(0).x : A.pos(1).x; g.fillStyle = 'rgba(255,245,200,' + (A.dark ? 0.25 : 0.15) + ')'; g.beginPath(); g.moveTo(sx - 6, y - 110); g.lineTo(sx + 6, y - 110); g.lineTo(sx + 30, y - 16); g.lineTo(sx - 30, y - 16); g.closePath(); g.fill();
    },
    front: function (g, A) {
      var U = A.U, c = A.cx, jx = c - A.span + 26, y = A.G + 6;
      snail(g, U, jx, y, 0.9, 1, A.now); U.rr(g, jx + 2, y - 26, 5, 3, 1, '#2C2638');
      if (A.in(2800, 4600)) sign(g, U, jx + 16, y - 36, 16, 12, '9', '#FFFFFF', '#5B4A86', 9);
      if (A.t > 6800) { sign(g, U, jx + 16, y - 36, 18, 12, '11!', '#FFF3C9', '#E4566E', 8); if (A.in(6000, 7000)) U.heart(g, jx + 4, y - 30, 4, '#E4566E'); }
      if (A.in(1000, 2000)) { var m = A.mouth(0); for (var k = 0; k < 5; k++) { g.save(); g.translate(m.x, m.y - 4); g.rotate(-0.6 + k * 0.3); U.rr(g, -2.5, -12, 5, 8, 1, k === 2 ? '#E4566E' : '#FFFFFF'); g.restore(); } }
      if (A.t > 7400) { var tx = c + 50, s = A.back(7400, 7900); g.save(); g.translate(tx, y - 20 * s); g.scale(s, s); U.rr(g, -6, 0, 12, 4, 1, '#B08A2E'); U.rr(g, -1.5, -8, 3, 8, 1, '#E3AE2F'); g.fillStyle = '#E3AE2F'; g.beginPath(); g.moveTo(-9, -20); g.lineTo(9, -20); g.quadraticCurveTo(8, -8, 0, -8); g.quadraticCurveTo(-8, -8, -9, -20); g.fill(); g.restore(); }
    } });

  add({ id: 'relay', name: 'Relay race', kind: 'cool', dur: 8200,
    cap: 'Relay race! Tidbit runs the first leg…', punch: [2000, 'Baton to Sugarfoot! Through the finish tape!'],
    at: function (A) { return [A.cx - A.span + 6, A.cx - 20]; },
    run: function (A, T, S) {
      var c = A.cx, sp = A.span;
      A.walk(T, c - sp + 6, c - 50, 400, 1900); T.dy = -6; S.dy = 6;
      S.x = c - 20; S.face = 1; if (A.t < 1900) { S.lift = Math.abs(Math.sin(A.t / 150)) * 6; }
      A.walk(S, c - 20, c + sp - 6, 2000, 3800); A.walk(T, c - 50, c + sp - 54, 3000, 4600);
      if (A.t > 4600) { T.face = 1; S.face = -1; var m = function (g, A2, i) { medal(g, A2, i); }; if (A.t > 5200) { T.over = m; S.over = m; } A.hop(T, 4700, 400, 30); A.hop(S, 4800, 400, 30); A.say(T, 'We did it!', 4800, 5800); A.say(S, 'Together!', 5300, 6300); }
      if (A.once(3500)) A.burst(c + sp - 24, A.G - 40, 16, 'confetti', { speed: 0.14, spread: 2.4 });
    },
    front: function (g, A) {
      var U = A.U, c = A.cx, fx = c + A.span - 24;
      var hold = A.t < 1950 ? 0 : 1, m = A.mouth(hold); if (A.t < 5000) { g.save(); g.translate(m.x, m.y); g.rotate(0.2); U.rr(g, -1, -2, 12, 4, 2, '#F7DC6F'); g.restore(); }
      U.rr(g, fx - 1, A.G - 44, 2.4, 46, 1, '#6B5A70'); if (A.t < 3450) { U.rr(g, fx + 1, A.G - 34, 2, 2, 0, '#E4566E'); g.strokeStyle = '#E4566E'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(fx, A.G - 30); g.lineTo(fx, A.G - 20); g.stroke(); }
      else { var p = A.e(3450, 4200); g.strokeStyle = '#E4566E'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(fx, A.G - 30); g.quadraticCurveTo(fx + 10 * p, A.G - 20, fx + 14 * p, A.G - 6); g.stroke(); }
    } });

  add({ id: 'handshake', name: 'The secret handshake', kind: 'silly', dur: 7800,
    cap: 'Their top secret handshake. Please don’t tell anyone', punch: [5200, 'Paw bump, spin, hip bump, wiggle, boop… TA-DA!'],
    run: function (A, T, S) {
      T.x = A.cx - 28; S.x = A.cx + 28;
      rear(A, T, 300, 900, 0.5); rear(A, S, 300, 900, 0.5); if (A.once(600)) A.burst(A.cx, A.G - 50, 4, 'spark');
      A.spin(T, 1000, 700, 1); A.spin(S, 1000, 700, 1);
      if (A.in(1900, 2900)) { T.face = -1; S.face = 1; var b = A.bump(2100, 2700); T.x = A.cx - 28 + 10 * b; S.x = A.cx + 28 - 10 * b; if (A.once(2400)) A.burst(A.cx, A.G - 20, 4, 'star', { speed: 0.06 }); }
      if (A.in(3000, 3900)) T.pose = S.pose = 'wiggle';
      if (A.in(4000, 4800)) { T.x = A.cx - 20; S.x = A.cx + 20; A.say(T, 'Boop!', 4200, 4900); }
      A.hop(T, 5000, 450, 36); A.hop(S, 5000, 450, 36); if (A.in(5000, 5450)) { T.pivot = S.pivot = 'hind'; T.rot = S.rot = -0.5 * A.bump(5000, 5450); }
      if (A.once(5250)) A.burst(A.cx, A.G - 100, 18, 'confetti', { speed: 0.14, spread: 3 });
      A.say(S, 'Ta-da!', 5600, 6600); if (A.t > 6400) laugh(A, T, S, 6600);
    } });

  add({ id: 'waltz', name: 'Garden waltz', kind: 'sweet', dur: 8200,
    cap: 'One, two, three, one, two, three… a waltz for two', punch: [6200, 'And a graceful dip to finish.'],
    run: function (A, T, S) {
      var th = A.e(600, 6200) * TAU * 2, r = 30;
      if (A.t > 400 && A.t < 6200) { T.x = A.cx - Math.cos(th) * r; S.x = A.cx + Math.cos(th) * r; T.dy = -Math.sin(th) * 8; S.dy = Math.sin(th) * 8; T.z = Math.sin(th) > 0 ? 0 : 1; S.z = 1 - T.z; T.face = sgn(S.x - T.x); S.face = -T.face; lean(T, -0.35); lean(S, -0.35); T.lift = S.lift = Math.abs(Math.sin(A.t / 333 * PI)) * 3; }
      else if (A.t >= 6200) { T.x = A.cx - 22; S.x = A.cx + 22; T.face = 1; S.face = -1; lean(S, -0.7 * A.bump(6200, 7600)); lean(T, 0.15 * A.bump(6200, 7600)); }
      if (A.tick(600, 600, 6200)) A.burst(A.cx, A.G - 80, 1, 'note');
      hearts(A, A.cx, A.G - 90, 6800);
      function sgn(v) { return v < 0 ? -1 : 1; }
    } });

  add({ id: 'tandem', name: 'Bicycle for two', kind: 'cool', dur: 8400,
    cap: 'A bicycle built for two. Tidbit steers, Sugarfoot pedals', punch: [5400, 'Ring ring! And a very small wheelie.'],
    at: function (A) { return [A.cx - A.span + 40, A.cx - A.span + 6]; },
    run: function (A, T, S) {
      var c = A.cx, sp = A.span, p = A.e(300, 5000), q = A.e(5600, 7800);
      var bx = mix(c - sp + 24, c + sp - 30, p) + mix(0, -(sp * 2 - 54) * 0.5, q);
      T.x = bx + 18; S.x = bx - 18; T.face = S.face = q > 0.01 ? -1 : 1; if (q > 0.01) { T.x = bx - 18; S.x = bx + 18; }
      T.lift = S.lift = 20; T.pose = S.pose = 'run'; T.ph = 1.2; S.ph = A.t / 60; T.dy = -2; S.dy = 2;
      if (A.in(5000, 5600)) { var w = A.bump(5000, 5600); T.lift += 10 * w; T.rot = S.rot = -0.2 * w; }
      A.say(T, 'Ring ring!', 3200, 4100); A.say(S, 'Wheee!', 5200, 6100);
      this._bx = bx;
    },
    back: function (g, A) {
      var U = A.U, p0 = A.pos(0), p1 = A.pos(1), bx = (p0.x + p1.x) / 2, y = A.G + 2, rot = bx / 8;
      [bx - 30, bx + 30].forEach(function (wx) { g.strokeStyle = '#3C3350'; g.lineWidth = 2; g.beginPath(); g.arc(wx, y - 10, 10, 0, TAU); g.stroke(); for (var k = 0; k < 3; k++) U.line(g, wx, y - 10, wx + Math.cos(rot + k * 2.1) * 10, y - 10 + Math.sin(rot + k * 2.1) * 10, '#6B7388', 0.8); });
      g.strokeStyle = '#7C97E8'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(bx - 30, y - 10); g.lineTo(bx - 14, y - 22); g.lineTo(bx + 14, y - 22); g.lineTo(bx + 30, y - 10); g.moveTo(bx - 14, y - 22); g.lineTo(bx - 4, y - 10); g.lineTo(bx + 14, y - 22); g.stroke();
      var hx = p0.x > p1.x ? bx + 26 : bx - 26; U.line(g, hx, y - 20, hx, y - 30, '#3C3350', 1.8); U.rr(g, hx - 5, y - 32, 10, 2.4, 1, '#3C3350');
    } });

  add({ id: 'toboggan', name: 'Toboggan for two', kind: 'cool', where: ['snow'], dur: 7600,
    cap: 'Push, push, jump on! Toboggan for two', punch: [3600, 'Zoom… spin… POOF into a snowbank!'],
    at: function (A) { return [A.cx - A.span + 40, A.cx - A.span + 6]; },
    run: function (A, T, S) {
      var c = A.cx, sp = A.span, sx = mix(c - sp + 22, c - sp + 60, A.e(200, 1800)) + mix(0, sp * 2 - 110, A.e(1800, 4400));
      if (A.t < 1800) { T.x = sx + 20; S.x = sx - 16; T.pose = S.pose = 'run'; T.face = S.face = 1; if (A.t < 1500) { lean(S, 0.3); } }
      else { T.x = sx + 14; S.x = sx - 12; T.lift = S.lift = 8; T.pose = S.pose = 'sit'; T.face = S.face = 1; }
      A.hop(S, 1500, 300, 16);
      if (A.t > 4000 && A.t < 4600) { T.face = S.face = Math.cos(A.e(4000, 4600) * TAU); }
      if (A.t > 4600) { T.alpha = S.alpha = A.t < 5400 ? 0.2 : 1; T.lift = S.lift = 0; }
      A.say(T, 'Faster!', 2200, 3000); A.say(S, 'Wheee!', 2800, 3600);
      if (A.once(4600)) { A.burst(c + sp - 40, A.G - 20, 26, 'snow', { speed: 0.16, spread: 2.6 }); A.shake(2); }
      if (A.t > 5600) laugh(A, T, S, 5700);
    },
    back: function (g, A) { var U = A.U, p1 = A.pos(1), p0 = A.pos(0), x = (p0.x + p1.x) / 2; if (A.t < 5400) { U.rr(g, x - 30, A.G - 4, 60, 5, 2, '#C9474F'); g.strokeStyle = '#C9474F'; g.lineWidth = 2.4; g.beginPath(); g.arc(x + 30, A.G - 8, 5, -PI / 2, PI / 2); g.stroke(); } U.ell(g, A.cx + A.span - 20, A.G + 2, 30, 14, '#F7FAFE'); } });

  add({ id: 'mirror', name: 'The mirror frame', kind: 'silly', dur: 8000,
    cap: 'Is that a mirror? Tidbit waves. Her reflection waves back…', punch: [4800, 'Wait. Mirrors don’t stick out their tongues!'],
    run: function (A, T, S) {
      T.x = A.cx - 30; S.x = A.cx + 30; T.face = 1; S.face = -1; T.dy = S.dy = 0;
      [[600, 'tilt'], [1500, 'rear'], [2500, 'hop'], [3500, 'bow']].forEach(function (m) { [T, S].forEach(function (d) { if (m[1] === 'tilt' && A.in(m[0], m[0] + 700)) d.tilt = 0.3 * A.bump(m[0], m[0] + 700); if (m[1] === 'rear') rear(A, d, m[0], m[0] + 700, 0.5); if (m[1] === 'hop') A.hop(d, m[0], 350, 24); if (m[1] === 'bow' && A.in(m[0], m[0] + 700)) d.pose = 'bow'; }); });
      if (A.in(4400, 5400)) { S.pose = 'wiggle'; A.say(S, 'Hee!', 4600, 5400); }
      A.say(T, '?!', 5000, 5800);
      if (A.t > 5600) { T.x = mix(A.cx - 30, A.cx - 50, A.e(5600, 6000)); T.lift = 10 * A.bump(5600, 6200); T.tilt = 0.4 * A.bump(5800, 6800); }
      if (A.t > 6600) laugh(A, T, S, 6700);
    },
    front: function (g, A) { var U = A.U, x = A.cx, y = A.G + 4; U.rr(g, x - 3, y - 80, 6, 80, 2, '#E3AE2F'); U.rr(g, x - 3, y - 84, 6, 6, 3, '#F2C14E'); } });

  add({ id: 'threeleg', name: 'Three-legged race', kind: 'silly', dur: 7800,
    cap: 'Three-legged race! Left, right, left…', punch: [3800, 'Tumble! Up again, and over the line together.'],
    at: function (A) { return [A.cx - A.span + 20, A.cx - A.span + 34]; },
    run: function (A, T, S) {
      var c = A.cx, sp = A.span, x = mix(c - sp + 20, c + sp - 40, A.p(400, 3800) * 0.55 + A.e(4800, 6600) * 0.45);
      T.x = x; S.x = x + 14; T.face = S.face = 1; T.dy = -5; S.dy = 5;
      if (A.in(400, 3800) || A.in(4800, 6600)) { T.pose = S.pose = 'run'; var st = Math.floor(A.t / 280) % 2; T.lift = st ? 4 : 0; S.lift = st ? 0 : 4; T.rot = st ? 0.08 : -0.05; S.rot = st ? -0.05 : 0.08; }
      if (A.in(3800, 4800)) { T.pose = S.pose = 'lie'; T.rot = -0.4 * A.bump(3800, 4400); S.rot = -0.4 * A.bump(3850, 4450); A.say(T, 'Oops!', 3900, 4600); }
      A.say(S, 'Left!', 800, 1500); A.say(T, 'Right!', 1400, 2100);
      if (A.once(6600)) A.burst(c + sp - 30, A.G - 50, 16, 'confetti', { speed: 0.14, spread: 2.6 });
      if (A.t > 6700) laugh(A, T, S, 6800);
    },
    front: function (g, A) { var p0 = A.pos(0), p1 = A.pos(1), x = (p0.x + p1.x) / 2 + 2; A.U.rr(g, x - 6, A.G - 6 - (p0.y < A.G - 2 || p1.y < A.G - 2 ? 2 : 0), 12, 4, 2, '#E4566E'); } });

  add({ id: 'howl', name: 'Moon duet', kind: 'sweet', time: 'night', dur: 8000,
    cap: 'A duet for the moon. Tidbit takes the high part, Sugarfoot the low', punch: [5200, 'All together now: AWOOOO!'],
    run: function (A, T, S) {
      T.x = A.cx - 24; S.x = A.cx + 24; T.face = 1; S.face = -1;
      function sing(d, a, b) { if (A.in(a, b)) { d.tilt = -0.5 * A.e(a, a + 200) * (1 - A.e(b - 200, b)); d.pivot = 'hind'; d.rot = -0.2 * A.bump(a, b); } }
      sing(T, 600, 1800); sing(S, 2000, 3400); sing(T, 3600, 4400); sing(S, 3900, 4700); sing(T, 5200, 7000); sing(S, 5200, 7000);
      A.say(T, 'Awoo!', 700, 1700); A.say(S, 'Awooo…', 2100, 3300); A.say(T, 'AWOOO!', 5300, 6800); A.say(S, 'AWOOO!', 5400, 6900);
      if (A.tick(300, 600, 7000)) A.burst(A.cx + (Math.random() - 0.5) * 40, A.G - 80, 1, 'note');
      if (A.once(5600)) A.burst(A.cx, 70, 12, 'star', { spread: TAU, speed: 0.06 });
    },
    back: function (g, A) { var U = A.U, mx = A.cx + A.span - 20, my = 56, s = A.e(5000, 5600); U.circle(g, mx, my, 16, '#FBF3D5'); U.circle(g, mx - 5, my - 2, 1.3, '#6B5A70'); U.circle(g, mx + 5, my - 2, 1.3, '#6B5A70'); g.strokeStyle = '#6B5A70'; g.lineWidth = 1.2; g.beginPath(); if (s > 0.5) g.ellipse(mx, my + 5, 3, 3.4, 0, 0, TAU); else g.arc(mx, my + 3, 4, 0.3, PI - 0.3); g.stroke(); } });

  add({ id: 'rowboat', name: 'Row, row, row', kind: 'sweet', where: ['beach', 'pond', 'dock'], dur: 8400,
    cap: 'Row, row, row the boat. Tidbit rows, Sugarfoot steers', punch: [4400, 'A fish jumps right over the boat! Splash!'],
    at: function (A) { return [A.cx - A.span + 30, A.cx - A.span + 6]; },
    run: function (A, T, S) {
      var c = A.cx, sp = A.span, bx = mix(c - sp + 18, c + sp - 30, A.e(300, 7400));
      T.x = bx + 12; S.x = bx - 12; T.face = S.face = 1; T.lift = S.lift = 38; T.dy = -2; S.dy = 2; T.pose = S.pose = 'sit';
      T.pivot = 'hind'; T.rot = -0.1 - Math.sin(A.t / 300) * 0.08; T.lift += Math.sin(A.t / 400) * 1.5; S.lift += Math.sin(A.t / 400 + 1) * 1.5;
      A.say(S, 'Row!', 800, 1500); A.say(T, '!', 4500, 5100); A.say(S, 'Wow!', 4700, 5500);
      if (A.once(4800)) A.burst(A.pos(0).x + 20, A.G - 40, 10, 'drop', { speed: 0.12, spread: 2 });
      hearts(A, bx, A.G - 110, 6600);
    },
    front: function (g, A) {
      var U = A.U, p0 = A.pos(0), p1 = A.pos(1), bx = (p0.x + p1.x) / 2, y = A.G - 36 + Math.sin(A.t / 400) * 1.5;
      g.fillStyle = '#C9674E'; g.beginPath(); g.moveTo(bx - 32, y - 8); g.lineTo(bx + 32, y - 8); g.quadraticCurveTo(bx + 24, y + 6, bx, y + 6); g.quadraticCurveTo(bx - 24, y + 6, bx - 32, y - 8); g.fill(); U.rr(g, bx - 32, y - 10, 64, 3, 1, '#8E3F33');
      var oa = Math.sin(A.t / 300) * 0.5; [-1, 1].forEach(function (s) { g.save(); g.translate(bx + 10, y - 8); g.rotate(0.9 * s + oa * s); U.rr(g, -1, 0, 2, 22, 1, '#8A6340'); U.ell(g, 0, 22, 2.6, 5, '#8A6340'); g.restore(); });
      if (A.in(4200, 5200)) { var p = A.p(4200, 5200), fx = mix(bx - 30, bx + 40, p), fy = y + 4 - Math.sin(p * PI) * 60; g.save(); g.translate(fx, fy); g.rotate(-PI * 0.5 + p * PI); U.ell(g, 0, 0, 7, 3.4, '#F6A04D'); g.fillStyle = '#F6A04D'; g.beginPath(); g.moveTo(-6, 0); g.lineTo(-11, -4); g.lineTo(-11, 4); g.fill(); U.circle(g, 4, -1, 0.8, '#2C2638'); g.restore(); }
    } });

  add({ id: 'piggyback', name: 'Piggyback ride', kind: 'sweet', dur: 7600,
    cap: 'Sugarfoot gives Tidbit a piggyback ride', punch: [3600, '“Giddy-up!” A slow, happy lap of the garden.'],
    run: function (A, T, S) {
      if (A.in(300, 1400)) S.pose = 'bow';
      if (A.t < 1400) { T.x = mix(A.x0, A.x1 - 4, A.e(700, 1400)); A.hop(T, 800, 600, 50); T.lift += 34 * A.e(800, 1400); }
      else if (A.t < 6200) { var p = A.p(1600, 6000); S.x = A.x1 - Math.sin(p * TAU) * (A.span - 20) * 0.8; S.face = Math.cos(p * TAU) >= 0 ? -1 : 1; if (p > 0 && p < 1) { S.pose = 'run'; } T.x = S.x + 4 * S.face; T.face = S.face; T.lift = 34 + Math.abs(Math.sin(A.t / 250)) * 3; T.pose = 'sit'; rear(A, T, 3000, 3800, 0.3); T.z = 1; S.z = 0; }
      else { T.x = mix(A.x1, A.x0, A.e(6200, 6800)); T.lift = mix(34, 0, A.e(6200, 6800)) + 20 * A.bump(6200, 6800); S.x = A.x1; }
      A.say(T, 'Giddy-up!', 1700, 2600); A.say(S, 'Hold on!', 2600, 3400); A.say(T, 'Wheee!', 4200, 5000);
      if (A.t > 6900) laugh(A, T, S, 6900);
    } });

  add({ id: 'wheelbarrow', name: 'Wheelbarrow ride', kind: 'silly', dur: 7600,
    cap: 'Tidbit takes Sugarfoot for a wheelbarrow ride', punch: [3400, 'Bump! Everyone bounces. Everyone giggles.'],
    at: function (A) { return [A.cx - A.span + 8, A.cx - A.span + 50]; },
    run: function (A, T, S) {
      var c = A.cx, sp = A.span, x = mix(c - sp + 50, c + sp - 20, A.e(300, 3400)) - mix(0, 80, A.e(4200, 6200));
      S.x = x; S.lift = 14 + 16 * A.bump(3300, 3700); S.pose = 'sit'; S.face = 1; S.z = 1;
      T.x = x - 42; T.face = 1; T.pose = 'bow'; T.z = 0; A.hop(T, 3300, 300, 12);
      if (A.t > 4200) { S.face = -1; T.x = x + 42; T.face = -1; }
      A.say(S, 'Wheee!', 1000, 1900); A.say(T, 'Hold on!', 3000, 3800); if (A.t > 6400) laugh(A, T, S, 6400);
    },
    front: function (g, A) { var U = A.U, x = A.pos(1).x, y = A.G + 2, dir = A.t > 4200 ? -1 : 1; U.circle(g, x + dir * 22, y - 8, 8, '#3C3350'); U.circle(g, x + dir * 22, y - 8, 3, '#9AA3B8'); g.fillStyle = '#7FB8F0'; g.beginPath(); g.moveTo(x - 24, y - 26); g.lineTo(x + 24, y - 26); g.lineTo(x + 18, y - 10); g.lineTo(x - 18, y - 10); g.closePath(); g.fill(); U.line(g, x - dir * 18, y - 16, x - dir * 44, y - 22, '#8A6340', 2); U.circle(g, x + 20 + (A.t > 3300 && A.t < 3500 ? 2 : 0), y + 1, 2.4, '#8E8A9A'); } });

  add({ id: 'tennis', name: 'Tennis rally', kind: 'cool', dur: 8600,
    cap: 'A tennis match! This rally is going on and on…', punch: [6000, 'The ball lands on top of the net. And stays there. Draw!'],
    run: function (A, T, S) {
      T.x = A.cx - 64; S.x = A.cx + 64; var per = 1000, k = Math.floor((A.t - 400) / per), ph = ((A.t - 400) % per) / per;
      if (A.t > 400 && A.t < 6000) { var hitter = k % 2 ? S : T; if (ph < 0.2) rear(A, hitter, 400 + k * per - 50, 400 + k * per + 250, 0.35); var other = k % 2 ? T : S; if (ph > 0.7) { other.lift = 6 * Math.sin((ph - 0.7) / 0.3 * PI); } }
      A.say(T, '?', 6300, 7000); A.say(S, '?', 6400, 7100); if (A.t > 7100) laugh(A, T, S, 7100);
    },
    front: function (g, A) {
      var U = A.U, c = A.cx, y = A.G + 2, per = 1000;
      U.rr(g, c - 1.5, y - 30, 3, 32, 1, '#6B5A70'); g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 0.6; for (var k = 0; k < 5; k++) { g.beginPath(); g.moveTo(c - 1, y - 28 + k * 6); g.lineTo(c + 1, y - 28 + k * 6); g.stroke(); } U.rr(g, c - 2, y - 32, 4, 3, 1, '#FFFFFF');
      var m0 = A.mouth(0), m1 = A.mouth(1);
      [m0, m1].forEach(function (m, i) { g.save(); g.translate(m.x, m.y); g.rotate(i ? 0.5 : -0.5); g.strokeStyle = '#E4566E'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(i ? -8 : 8, -6, 5, 7, 0, 0, TAU); g.stroke(); g.restore(); });
      if (A.t < 400) return;
      if (A.t < 6000) { var k2 = Math.floor((A.t - 400) / per), p = ((A.t - 400) % per) / per, a = k2 % 2 ? m1 : m0, b = k2 % 2 ? m0 : m1, q = arcPt(p, a.x, a.y - 8, b.x, b.y - 8, 50); U.ball(g, q.x, q.y, 3.4); }
      else { var s = A.e(6000, 6300); U.ball(g, c, mix(y - 60, y - 36, s) + (s < 1 ? 0 : Math.sin(A.t / 200) * 0.5), 3.4); }
    } });

  add({ id: 'jumprope', name: 'Jump rope', kind: 'silly', dur: 7800,
    cap: 'Jump rope! Tidbit turns, Sugarfoot jumps', punch: [4000, 'Swap! Tidbit jumps double-time.'],
    at: function (A) { return [A.cx - 50, A.cx + 14]; },
    run: function (A, T, S) {
      var per = A.t < 4000 ? 800 : 480;
      if (A.t < 4000) { T.x = A.cx - 50; T.face = 1; T.pivot = 'hind'; T.rot = -0.2 - 0.1 * Math.sin(A.t / per * TAU); S.x = A.cx + 14; S.face = -1; var ph = (A.t % per) / per; if (A.t > 400) S.lift = 26 * Math.max(0, Math.sin(ph * TAU + PI / 2)); }
      else { S.x = A.cx - 50; S.face = 1; S.pivot = 'hind'; S.rot = -0.2 - 0.1 * Math.sin(A.t / per * TAU); T.x = A.cx + 14; T.face = -1; var ph2 = (A.t % per) / per; if (A.t < 6800) T.lift = 22 * Math.max(0, Math.sin(ph2 * TAU + PI / 2)); }
      A.say(S, 'One!', 900, 1500); A.say(S, 'Two!', 1700, 2300); A.say(T, 'Faster!', 4200, 5000);
      if (A.t > 6800) { T.pose = 'lie'; laugh(A, T, S, 6900); }
    },
    back: function (g, A) { this._rope(g, A, true); }, front: function (g, A) { this._rope(g, A, false); },
    _rope: function (g, A, back) {
      var per = A.t < 4000 ? 800 : 480, ang = (A.t % per) / per * TAU, turner = A.t < 4000 ? 0 : 1, m = A.mouth(turner), px = A.cx + A.span - 6, py = A.G - 30;
      var s = Math.sin(ang); if ((s < 0) !== back) { if (!back || A.t > 6800) return; }
      U2(g, A, m, px, py, ang);
      function U2(g2, A2, m2, x2, y2, a) { var mx = (m2.x + x2) / 2, my = (m2.y + y2) / 2 + Math.cos(a) * 34; g2.strokeStyle = '#E4566E'; g2.lineWidth = 1.6; g2.beginPath(); g2.moveTo(m2.x, m2.y); g2.quadraticCurveTo(mx, my + 20 * Math.cos(a), x2, y2); g2.stroke(); A2.U.rr(g2, x2 - 1.5, y2, 3, A2.G + 2 - y2, 1, '#8A6340'); }
    } });

  add({ id: 'hopscotch', name: 'Hopscotch', kind: 'silly', dur: 7600,
    cap: 'Hopscotch! Tidbit goes first, quick as anything', punch: [3800, 'Sugarfoot’s turn: big, bouncy, and a spin on six!'],
    at: function (A) { return [A.cx - A.span + 8, A.cx - A.span + 40]; },
    run: function (A, T, S) {
      var c = A.cx, sp = A.span, x0 = c - 70, dx = 26;
      function hops(d, t0, per, h) { for (var k = 0; k < 6; k++) { var a = t0 + k * per; if (A.t >= a) { d.x = mix(k ? x0 + (k - 1) * dx : d.x, x0 + k * dx, eio(Math.min(1, (A.t - a) / (per * 0.8)))); } A.hop(d, a, per * 0.8, h); } }
      T.x = c - sp + 8; S.x = c - sp + 40; T.face = S.face = 1; T.dy = -6; S.dy = 6;
      hops(T, 400, 380, 16); if (A.t > 2800) { T.x = mix(x0 + 5 * dx, c + sp - 10, A.e(2800, 3400)); if (A.in(2800, 3400)) T.pose = 'run'; if (A.t > 3400) T.face = -1; }
      if (A.t > 3600) { hops(S, 3800, 520, 22); S.sy *= 1; } A.spin(S, 6500, 600, 1);
      A.say(T, 'Done!', 3400, 4100); A.say(S, 'Six!', 6500, 7300);
      if (A.once(6500)) A.burst(x0 + 5 * dx, A.G - 20, 8, 'spark');
    },
    back: function (g, A) { var U = A.U, x0 = A.cx - 70; for (var k = 0; k < 6; k++) { var x = x0 + k * 26; g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.2; g.strokeRect(x - 12, A.G + 2, 24, 10); U.text(g, String(k + 1), x, A.G + 7, 7, 'rgba(255,255,255,.9)', '700'); } } });

  add({ id: 'sandwich', name: 'The tallest sandwich', kind: 'silly', dur: 8000,
    cap: 'Building the world’s tallest sandwich, one layer each', punch: [5400, 'Wobble… and one big bite from each side.'],
    run: function (A, T, S) {
      T.x = A.cx - 44; S.x = A.cx + 44;
      for (var k = 0; k < 8; k++) { var d = k % 2 ? S : T, t0 = 400 + k * 550; rear(A, d, t0, t0 + 400, 0.35); }
      if (A.t > 5600) { T.x = A.cx - 28; S.x = A.cx + 28; if (A.tick(250, 5800, 7000)) { A.burst(A.cx - 10, A.G - 40, 1, 'crumb'); A.burst(A.cx + 10, A.G - 40, 1, 'crumb'); } }
      A.say(T, 'Pickle!', 1500, 2200); A.say(S, 'Cheese!', 2000, 2700); hearts(A, A.cx, A.G - 90, 7000);
    },
    front: function (g, A) {
      var U = A.U, x = A.cx, y = A.G + 4, cols = ['#E6B878', '#8FC46B', '#F2C14E', '#E4566E', '#E6B878', '#8FC46B', '#F7DC6F', '#E6B878'];
      U.ell(g, x, y - 1, 20, 4, '#FFFFFF');
      var n = 0, wob = Math.sin(A.t / 200) * 0.04 * A.bump(4500, 5800), bite = A.e(5800, 7000);
      for (var k = 0; k < 8; k++) { var t0 = 400 + k * 550; if (A.t < t0 + 300) continue; n++; var w = (k % 4 === 0 ? 16 : 18) * (1 - bite * 0.5), ly = y - 4 - k * 6; g.save(); g.translate(x + Math.sin(wob * (k + 1) * 10) * k, ly); U.rr(g, -w, -3, w * 2, k % 4 === 0 ? 5 : 3.6, 2, cols[k]); g.restore(); }
      for (var j = 0; j < 8; j++) { var t1 = 400 + j * 550, p = clamp((A.t - t1) / 300, 0, 1); if (p <= 0 || p >= 1) continue; var src = A.mouth(j % 2), q = arcPt(p, src.x, src.y, x, y - 4 - j * 6, 30); U.rr(g, q.x - 10, q.y - 2, 20, 4, 2, cols[j]); }
    } });

  add({ id: 'sculpt', name: 'Sculpting each other', kind: 'cool', dur: 8600,
    cap: 'Pat, pat, shape… they’re sculpting each other', punch: [5200, 'Ta-da! Striking resemblances. Mostly.'],
    run: function (A, T, S) {
      T.x = A.cx - 70; S.x = A.cx + 70; T.face = 1; S.face = -1;
      if (A.in(400, 5000)) { T.pose = Math.floor(A.t / 320) % 2 ? 'bow' : 'sit'; S.pose = Math.floor(A.t / 420) % 2 ? 'sit' : 'bow'; }
      if (A.tick(300, 400, 5000)) { A.burst(A.cx - 30, A.G - 10, 1, 'dirt', { col: A.snow ? '#FFFFFF' : '#E6C98A' }); A.burst(A.cx + 30, A.G - 10, 1, 'dirt', { col: A.snow ? '#FFFFFF' : '#E6C98A' }); }
      if (A.t > 5400) { T.x = A.cx + 30 + 44; T.face = -1; S.x = A.cx - 30 - 44; S.face = 1; T.x = Math.min(T.x, A.cx + A.span); S.x = Math.max(S.x, A.cx - A.span); if (A.t > 6000) { T.tilt = S.tilt = 0.25; } }
      A.say(T, 'Ha!', 6400, 7200); A.say(S, 'Nailed it.', 6800, 7800);
    },
    back: function (g, A) {
      var U = A.U, col = A.snow ? '#F4F8FC' : '#E9CB85', form = A.e(1000, 5000);
      [[A.cx - 30, 'collar', 1], [A.cx + 30, 'drop', -1]].forEach(function (q) {
        var mh = 28 * (1 - form); if (mh > 1) U.ell(g, q[0], A.G + 2, 20, mh, col);
        if (form > 0) { g.save(); g.globalAlpha *= form; if ('filter' in g) g.filter = A.snow ? 'grayscale(1) brightness(2.2)' : 'sepia(1) saturate(0.7) brightness(1.6)'; A.pup(g, q[1], q[0], A.G + 2, A.S * 0.9, q[2], 'sit', 0); g.restore(); if ('filter' in g) g.filter = 'none'; }
      });
    } });

  add({ id: 'hammock', name: 'Hammock time', kind: 'sweet', dur: 8400,
    cap: 'Hammock time. Hop in, and swiiing…', punch: [4400, 'Ahh. Happiest side by side.'],
    run: function (A, T, S) {
      var sw = Math.sin(A.t / 900) * 6 * A.e(2400, 3400);
      if (A.t < 2400) { T.x = mix(A.x0, A.cx - 16, A.e(800, 1400)); T.lift = 30 * A.e(800, 1400); A.hop(T, 800, 600, 30); S.x = mix(A.x1, A.cx + 16, A.e(1500, 2300)); S.lift = 30 * A.e(1500, 2300); A.hop(S, 1500, 800, 26); }
      else { T.x = A.cx - 16 + sw; S.x = A.cx + 16 + sw; T.lift = S.lift = 28; T.pose = S.pose = 'lie'; T.face = 1; S.face = -1; T.blink = S.blink = A.t > 4400 && A.t < 7000; }
      if (A.t > 7000) { T.x = mix(A.cx - 16, A.x0, A.e(7000, 7400)); T.lift = mix(28, 0, A.e(7000, 7400)) + 20 * A.bump(7000, 7400); T.pose = 'run'; }
      A.say(S, 'Ahh.', 4400, 5400); A.say(T, 'Mmm.', 4800, 5800); hearts(A, A.cx, A.G - 70, 5000);
    },
    back: function (g, A) { var U = A.U, c = A.cx, y = A.G + 2, sw = Math.sin(A.t / 900) * 6 * A.e(2400, 3400); [c - 84, c + 84].forEach(function (x) { U.rr(g, x - 3, y - 70, 6, 72, 2, '#8A6340'); }); g.strokeStyle = '#F7A8C2'; g.lineWidth = 4; g.beginPath(); g.moveTo(c - 82, y - 60); g.quadraticCurveTo(c + sw, y - (A.t > 2400 && A.t < 7000 ? 0 : 16), c + 82, y - 60); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; g.stroke(); } });

  add({ id: 'umbrelladrop', name: 'Cloud elevator', kind: 'surprising', time: 'day', dur: 8800,
    cap: 'A friendly cloud floats down and gives them a lift. Up, up…', punch: [3400, 'Umbrellas open! A slow, swaying float back down.'],
    run: function (A, T, S) {
      var up = A.e(1400, 3000), down = A.e(3400, 7000), h = 150 * up * (1 - down);
      if (A.t < 1400) { A.hop(T, 900, 500, 30); A.hop(S, 1100, 500, 30); if (A.t > 1400) {} }
      T.lift = h + (A.t > 900 && A.t < 1400 ? 18 * A.e(900, 1400) : A.t >= 1400 && down === 0 ? 18 : 0); S.lift = h + (A.t > 1100 && A.t < 1400 ? 18 * A.e(1100, 1400) : A.t >= 1400 && down === 0 ? 18 : 0);
      if (A.t > 3400) { T.lift = h; S.lift = h * 0.94; T.x = A.x0 + Math.sin(A.t / 600) * 16 * (1 - down); S.x = A.x1 + Math.sin(A.t / 600 + 1) * 16 * (1 - down); T.pose = S.pose = 'run'; T.ph = S.ph = 1.2; var umb = function (col) { return function (g, A2, i) { var hd = A2.headL(i); A2.U.line(g, hd.x + 12, hd.y + 6, hd.x + 2, hd.y - 36, '#6B5A70', 1.2); g.fillStyle = col; g.beginPath(); g.moveTo(hd.x - 22, hd.y - 30); g.quadraticCurveTo(hd.x + 2, hd.y - 58, hd.x + 26, hd.y - 30); g.closePath(); g.fill(); }; }; T.over = umb('#F7DC6F'); S.over = umb('#7FB8F0'); }
      if (A.t > 7000) { T.pose = S.pose = 'sit'; laugh(A, T, S, 7200); }
      A.say(T, 'Going up!', 1600, 2500); A.say(S, 'Wheee!', 4000, 5000);
    },
    back: function (g, A) { var up = A.e(1400, 3000), gone = A.e(3400, 4400), y = A.G - 2 - 150 * up - gone * 80, x = A.cx - 60 + gone * 40, a = A.e(0, 800) * (1 - gone); if (a <= 0) return; g.save(); g.globalAlpha *= a; var yy = A.t < 800 ? mix(-60, A.G - 2, A.e(0, 800)) : y; A.U.cloud(g, x - 20, yy, 2.4, 'rgba(255,255,255,.96)'); g.restore(); } });

  add({ id: 'pillowfight', name: 'Pillow fight', kind: 'silly', dur: 7600,
    cap: 'Pillow fight! (The gentlest kind.)', punch: [4600, 'Double bop! It’s snowing feathers.'],
    run: function (A, T, S) {
      T.x = A.cx - 36; S.x = A.cx + 36;
      [800, 1700, 2600, 3500].forEach(function (t0, k) { var d = k % 2 ? S : T, o = k % 2 ? T : S; rear(A, d, t0 - 250, t0 + 150, 0.45); if (A.in(t0, t0 + 300)) { o.x += (k % 2 ? -6 : 6) * A.bump(t0, t0 + 300); o.tilt = 0.3; } if (A.once(t0)) A.burst(o.x, A.G - 40, 5, 'puff', { col: '#FFFFFF', speed: 0.06, size: 0.4 }); });
      rear(A, T, 4400, 4800, 0.45); rear(A, S, 4400, 4800, 0.45);
      if (A.once(4650)) A.burst(A.cx, A.G - 60, 30, 'puff', { col: '#FFFFFF', speed: 0.12, spread: TAU, grav: 0.00004, life: 2200, size: 0.35 });
      if (A.t > 5200) { T.pose = S.pose = 'lie'; laugh(A, T, S, 5400); }
    },
    front: function (g, A) {
      if (A.t > 5200) { A.U.rr(g, A.cx - 50, A.G - 2, 28, 10, 5, '#F7C9D4'); A.U.rr(g, A.cx + 22, A.G - 2, 28, 10, 5, '#FFF3C9'); return; }
      [0, 1].forEach(function (i) { var m = A.mouth(i); g.save(); g.translate(m.x + m.face * 8, m.y - 6); g.rotate(m.face * 0.4); A.U.rr(g, -9, -6, 18, 12, 6, i ? '#FFF3C9' : '#F7C9D4'); g.restore(); });
    } });

  add({ id: 'lemonade', name: 'Lemonade stand', kind: 'sweet', time: 'day', dur: 8800,
    cap: 'Tidbit and Sugarfoot open a lemonade stand', punch: [6400, 'Last glasses of the day: one for each other. Cheers!'],
    at: function (A) { return [A.cx - 22, A.cx + 22]; },
    run: function (A, T, S) {
      T.x = A.cx - 22; S.x = A.cx + 22; T.face = S.face = 1; T.z = S.z = 0;
      [1400, 3000, 4600].forEach(function (t0) { rear(A, S, t0 - 300, t0 + 200, 0.3); rear(A, T, t0 + 100, t0 + 500, 0.2); });
      A.say(T, 'Thank you!', 1500, 2300); A.say(T, 'Next!', 3100, 3800);
      if (A.t > 6000) { T.face = 1; S.face = -1; rear(A, T, 6400, 7000, 0.3); rear(A, S, 6400, 7000, 0.3); A.say(S, 'Cheers!', 6500, 7400); if (A.once(6700)) A.burst(A.cx, A.G - 70, 6, 'spark'); }
      hearts(A, A.cx, A.G - 90, 7200);
    },
    front: function (g, A) {
      var U = A.U, c = A.cx, y = A.G + 4;
      U.rr(g, c - 42, y - 30, 84, 30, 3, '#FFF3C9'); for (var k = 0; k < 6; k++) U.rr(g, c - 42 + k * 14, y - 42, 14, 10, 0, k % 2 ? '#FFFFFF' : '#F7DC6F'); U.text(g, 'LEMONADE', c, y - 18, 8.5, '#E3AE2F', '800'); U.rr(g, c - 44, y - 58, 3, 58, 1, '#C9A77A'); U.rr(g, c + 41, y - 58, 3, 58, 1, '#C9A77A');
      var cust = [[1400, 'snail'], [3000, 'bird'], [4600, 'mouse']];
      cust.forEach(function (q) { var t0 = q[0], inP = A.e(t0 - 900, t0 - 200), outP = A.e(t0 + 400, t0 + 1000); if (inP <= 0 || outP >= 1) return; var x = c + A.span + 20 - (A.span - 30) * inP - outP * 0 + outP * 60, yy = y + 2 - (q[1] === 'bird' ? 30 * outP : 0); if (q[1] === 'snail') snail(g, U, x, yy, 0.7, -1, A.now); else if (q[1] === 'bird') bird(g, U, x, yy - 6, 1, -1, outP > 0 ? Math.abs(Math.sin(A.now / 60)) : 0); else mouse(g, U, x, yy, 1, -1); if (A.in(t0, t0 + 400)) U.rr(g, x - 16, yy - 14, 5, 7, 1, '#FCE38A'); });
    } });

  add({ id: 'cheer', name: 'Cheer pyramid', kind: 'cool', dur: 7800,
    cap: 'Pom-poms up! A cheer routine: Ready? OK!', punch: [4600, 'The finale: the world’s smallest (and best) pyramid!'],
    run: function (A, T, S) {
      var pom = function (col) { return function (g, A2, i) { var h = A2.headL(i), b = Math.sin(A2.now / 100) * 2; A2.U.circle(g, h.x + 13, h.y + 7 + b, 5, col); A2.U.circle(g, h.x + 11, h.y + 5 + b, 3, 'rgba(255,255,255,.4)'); }; };
      T.over = pom('#E4566E'); S.over = pom('#7FB8F0');
      A.say(T, 'Ready?', 200, 900); A.say(S, 'OK!', 700, 1400);
      [1200, 1800, 2400].forEach(function (t0) { A.hop(T, t0, 300, 22); A.hop(S, t0 + 100, 300, 22); });
      A.spin(T, 3000, 600, 1); A.spin(S, 3000, 600, 1);
      if (A.t > 4000) { S.x = A.cx; S.pose = 'bow'; S.face = 1; T.x = mix(A.x0, A.cx - 2, A.e(4000, 4600)); T.lift = 22 * A.e(4000, 4600) + 20 * A.bump(4000, 4600); T.face = 1; if (A.t > 4600) { T.pivot = 'hind'; T.rot = -0.5; } }
      if (A.once(4700)) A.burst(A.cx, A.G - 100, 26, 'confetti', { speed: 0.15, spread: 3.2 });
      A.say(T, 'Ta-da!', 4800, 5800); A.say(S, 'Go team!', 5200, 6200);
      if (A.t > 6600) { T.x = mix(A.cx - 2, A.x0, A.e(6600, 7100)); T.lift = mix(22, 0, A.e(6600, 7100)) + 16 * A.bump(6600, 7100); T.rot = 0; T.pivot = 'center'; S.pose = 'sit'; }
    } });

  add({ id: 'letters', name: 'Letters for each other', kind: 'sweet', dur: 8400,
    cap: 'Mail’s here! A bird brings a letter for each of them', punch: [5000, 'They wrote to each other. The very same day.'],
    run: function (A, T, S) {
      T.x = A.cx - 40; S.x = A.cx + 40; T.tilt = S.tilt = A.in(2800, 4800) ? -0.2 : 0;
      A.say(T, '!', 2400, 3000); A.say(S, '!', 2600, 3200);
      if (A.t > 5000) { A.say(T, '<3', 5200, 6200); A.say(S, '<3', 5400, 6400); }
      if (A.t > 6200) { T.x = A.cx - 22; S.x = A.cx + 22; lean(T, -0.4 * A.e(6400, 6800)); lean(S, -0.4 * A.e(6400, 6800)); T.blink = S.blink = A.t > 6800; }
      hearts(A, A.cx, A.G - 90, 6600, 8);
    },
    front: function (g, A) {
      var U = A.U, t = A.t, bx = mix(A.cx + A.span + 30, A.cx, A.e(0, 1600)) + A.e(2400, 3600) * (A.span + 40), by = 60 + Math.sin(t / 200) * 6 - A.e(2400, 3600) * 40;
      bird(g, U, bx, by, 1.3, t < 2400 ? -1 : 1, Math.abs(Math.sin(t / 70)));
      [0, 1].forEach(function (i) {
        var m = A.mouth(i), drop = A.e(1600 + i * 300, 2400 + i * 300), x = mix(bx, m.x + m.face * 4, drop), y = mix(by + 8, m.y - 4, drop), open = A.e(3200, 3800) * (1 - A.e(6200, 6600));
        if (t < 1600 + i * 300) { x = bx + (i ? 4 : -4); y = by + 8; }
        g.save(); g.translate(x, y); U.rr(g, -8, -5, 16, 10, 1, '#FFFFFF'); g.strokeStyle = '#E3D6C0'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-8, -5); g.lineTo(0, 1); g.lineTo(8, -5); g.stroke();
        if (open > 0) { U.rr(g, -8, -5 - 14 * open, 16, 14 * open, 1, '#FFF8E6'); if (open > 0.6) { U.heart(g, 0, -12, 3.4, '#E4566E'); } }
        g.restore();
      });
    } });

  add({ id: 'campfire', name: 'Campfire marshmallows', kind: 'sweet', time: 'night', dur: 8600,
    cap: 'Toasting marshmallows by the campfire', punch: [4200, 'Tidbit’s is a little extra toasty. Sugarfoot shares her golden one.'],
    run: function (A, T, S) {
      T.x = A.cx - 50; S.x = A.cx + 50; T.pose = S.pose = 'sit';
      A.say(T, 'Oops!', 4200, 5000); A.say(S, 'Share?', 5200, 6000);
      if (A.t > 6000) { T.x = A.cx - 30; S.x = A.cx + 36; T.wag = S.wag = 3.5; A.say(T, 'Mmm!', 6600, 7600); lean(S, 0.12); }
      hearts(A, A.cx, A.G - 90, 6800);
    },
    back: function (g, A) {
      var U = A.U, c = A.cx, y = A.G + 4;
      U.rr(g, c - 14, y - 5, 28, 5, 2, '#7A5638'); g.save(); g.translate(c, y - 3); g.rotate(0.4); U.rr(g, -12, -2.5, 24, 5, 2, '#8A6340'); g.restore();
      var f = A.now, glow = g.createRadialGradient(c, y - 12, 2, c, y - 12, 50); glow.addColorStop(0, 'rgba(255,190,110,.35)'); glow.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = glow; g.fillRect(c - 50, y - 62, 100, 70);
      U.flame(g, c - 4, y - 18, 1.5, f); U.flame(g, c + 4, y - 16, 1.2, f + 60);
      if (A.tick(400, 0, 8600)) A.burst(c + (Math.random() - 0.5) * 10, y - 30, 1, 'spark', { speed: 0.03, grav: -0.00002, life: 1800 });
    },
    front: function (g, A) {
      var U = A.U, c = A.cx;
      [0, 1].forEach(function (i) {
        var m = A.mouth(i), tipx = c + (i ? 10 : -10), tipy = A.G - 34, give = i === 1 && A.t > 5200 ? A.e(5200, 6000) : 0;
        if (A.t > 6000 && i === 1) return;
        U.line(g, m.x, m.y, mix(tipx, A.mouth(0).x + 10, give), mix(tipy, A.mouth(0).y - 6, give), '#9B6B45', 1.4);
        var toast = A.e(1000, 4000), col = i ? 'rgb(' + Math.round(mix(255, 236, toast)) + ',' + Math.round(mix(255, 200, toast)) + ',' + Math.round(mix(255, 130, toast)) + ')' : 'rgb(' + Math.round(mix(255, 110, toast)) + ',' + Math.round(mix(255, 80, toast)) + ',' + Math.round(mix(255, 60, toast)) + ')';
        U.rr(g, mix(tipx, A.mouth(0).x + 10, give) - 3.6, mix(tipy, A.mouth(0).y - 6, give) - 3.2, 7.2, 6.4, 2, col);
        if (!i && A.in(4000, 4800)) U.circle(g, tipx, tipy - 8 - A.p(4000, 4800) * 10, 3 + A.p(4000, 4800) * 4, 'rgba(200,200,210,' + (0.5 * (1 - A.p(4000, 4800))).toFixed(2) + ')');
      });
    } });

  // ======================= SURPRISING =======================
  add({ id: 'cloudbounce', name: 'Cloud trampoline', kind: 'surprising', time: 'day', dur: 8200,
    cap: 'A cloud floats all the way down to the ground. Is it… bouncy?', punch: [3000, 'SO bouncy. The floatiest bounces ever.'],
    run: function (A, T, S) {
      A.say(T, '?', 1200, 1900); T.tilt = S.tilt = A.in(1000, 2200) ? 0.3 : 0;
      if (A.t > 2400 && A.t < 6800) { T.x = A.cx - 30; S.x = A.cx + 30; var per = 1300, pt = ((A.t - 2400) % per) / per, ps = ((A.t - 2400 + 650) % per) / per; T.lift = 16 + 110 * Math.sin(pt * PI); S.lift = 16 + 90 * Math.sin(ps * PI); T.pose = S.pose = 'run'; T.ph = S.ph = 1.2; if (A.t > 5000) { T.rot = -TAU * pt; } }
      if (A.t >= 6800) { T.x = A.x0; S.x = A.x1; laugh(A, T, S, 7000); }
      A.say(T, 'Wheee!', 3000, 3900); A.say(S, 'Boing!', 3700, 4600);
    },
    back: function (g, A) { var y = A.t < 1200 ? mix(-40, A.G + 2, A.e(0, 1200)) : A.t > 6800 ? mix(A.G + 2, -60, A.e(6800, 8200)) : A.G + 2, sq = 0; if (A.t > 2400 && A.t < 6800) { var per = 1300, pt = ((A.t - 2400) % per) / per; sq = pt < 0.1 || pt > 0.9 ? 0.12 : 0; } g.save(); g.translate(A.cx, y); g.scale(1 + sq, 1 - sq); A.U.cloud(g, -40, -8, 2.6, 'rgba(255,255,255,.97)'); g.restore(); } });

  add({ id: 'giantsnail', name: 'The giant snail', kind: 'surprising', dur: 8800,
    cap: 'A snail the size of a car glides by. Want a ride?', punch: [2600, 'All aboard the slowest, friendliest ride in town.'],
    run: function (A, T, S) {
      var sx = mix(A.cx - A.span - 60, A.cx + A.span + 60, A.p(0, 8800));
      A.say(T, '!!', 800, 1600); A.say(S, 'Ooh!', 1000, 1800);
      if (A.t > 2000 && A.t < 6600) { T.x = clamp(sx - 10, A.cx - A.span, A.cx + A.span); S.x = clamp(sx + 16, A.cx - A.span, A.cx + A.span); T.lift = S.lift = 58 * A.e(2000, 2600) + 20 * A.bump(2000, 2600); T.face = S.face = 1; rear(A, T, 3600, 4400, 0.35); rear(A, S, 4000, 4800, 0.35); T.dy = -4; S.dy = 4; }
      if (A.t >= 6600) { T.x = clamp(mix(sx - 10, A.cx + 20, A.e(6600, 7100)), A.cx - A.span, A.cx + A.span); S.x = clamp(mix(sx + 16, A.cx + 70, A.e(6600, 7100)), A.cx - A.span, A.cx + A.span); T.lift = S.lift = mix(58, 0, A.e(6600, 7100)) + 20 * A.bump(6600, 7100); }
      A.say(T, 'Bye, snail!', 7400, 8400);
    },
    back: function (g, A) { var sx = mix(A.cx - A.span - 60, A.cx + A.span + 60, A.p(0, 8800)); snail(g, A.U, sx, A.G + 4, 5, 1, A.now); } });

  add({ id: 'moonplay', name: 'Catch with the moon', kind: 'surprising', time: 'night', dur: 8800,
    cap: 'The moon floats down. It wants to play catch!', punch: [3200, 'Boop! Boop! The moon giggles every time.'],
    run: function (A, T, S) {
      A.say(T, '!!', 800, 1600); A.say(S, 'Hi, moon!', 1200, 2200);
      [3000, 4200, 5400].forEach(function (t0, k) { var d = k % 2 ? S : T; A.hop(d, t0 - 200, 400, 40); });
      if (A.t > 6800) { rear(A, T, 6900, 7700, 0.4); rear(A, S, 6900, 7700, 0.4); A.say(T, 'Bye!', 7000, 7900); }
    },
    front: function (g, A) {
      var U = A.U, t = A.t, x, y, h0 = A.head(0), h1 = A.head(1);
      if (t < 2600) { x = A.cx + A.span - 20 - A.e(0, 2600) * (A.span - 20); y = mix(40, 90, A.e(0, 2600)); }
      else if (t < 6200) { var k = Math.floor((t - 2600) / 1200), p = ((t - 2600) % 1200) / 1200, a = k % 2 ? h0 : h1, b = k % 2 ? h1 : h0; if (k === 0) a = { x: A.cx, y: 90 }; var q = arcPt(p, a.x, a.y - 18, b.x, b.y - 18, 50); x = q.x; y = q.y; }
      else { var r = A.e(6200, 8200); x = mix(h1.x, A.cx + A.span - 20, r); y = mix(h1.y - 18, 40, r); }
      U.circle(g, x, y, 20, 'rgba(255,250,220,.2)'); U.circle(g, x, y, 13, '#FBF3D5'); U.circle(g, x - 4, y - 2, 1.2, '#6B5A70'); U.circle(g, x + 4, y - 2, 1.2, '#6B5A70'); g.strokeStyle = '#6B5A70'; g.lineWidth = 1; g.beginPath(); g.arc(x, y + 2, 3.4, 0.3, PI - 0.3); g.stroke(); U.circle(g, x - 6, y + 3, 1.6, 'rgba(247,168,194,.6)'); U.circle(g, x + 6, y + 3, 1.6, 'rgba(247,168,194,.6)');
      [3000, 4200, 5400].forEach(function (t0) { if (A.in(t0, t0 + 700)) A.say({ x: x, y: y - 6, face: 1 }, 'Hee!', t0, t0 + 700); });
    } });

  add({ id: 'shadowescape', name: 'The runaway shadow', kind: 'surprising', time: 'day', dur: 8200,
    cap: 'Tidbit’s shadow wanders off on its own…', punch: [4400, 'It’s hiding with Sugarfoot’s shadow! They’re dancing.'],
    run: function (A, T, S) {
      T.x = A.x0; A.say(T, '?!', 1400, 2200); if (A.in(1400, 2400)) T.tilt = 0.35;
      A.walk(T, A.x0, A.cx + 10, 2600, 3800); if (A.t > 3800) { T.x = A.cx + 10; T.face = 1; }
      A.say(S, 'Ha!', 4600, 5400); A.say(T, 'Ha!', 5000, 5800);
      if (A.t > 6200) { A.walk(T, A.cx + 10, A.x0, 6200, 7000); if (A.t > 7000) T.face = 1; }
    },
    back: function (g, A) {
      var t = A.t, p0 = A.pos(0), p1 = A.pos(1), sx;
      if (t < 1200) sx = p0.x; else if (t < 4200) sx = mix(p0.x, p1.x + 18, A.e(1200, 4200)); else if (t < 6400) sx = p1.x + 18 + Math.sin(t / 250) * 10; else sx = mix(p1.x + 18, p0.x, A.e(6400, 7400));
      var dance = A.in(4200, 6400);
      g.save(); g.translate(sx + 4, A.G + 8); g.scale(1, -0.36); silhouette(g, A, 'drop', 0, 0, A.S * 0.9, dance ? Math.sign(Math.cos(t / 250)) || 1 : (t > 1200 && t < 4200 ? 1 : 1), t > 1200 && t < 4200 ? 'run' : dance ? 'wiggle' : 'sit', 0.3); g.restore();
      g.save(); g.translate(p1.x - 4 + (dance ? Math.sin(t / 250 + 2) * 8 : 0), A.G + 8); g.scale(1, -0.36); silhouette(g, A, 'collar', 0, 0, A.S * 0.9, -1, dance ? 'wiggle' : 'sit', 0.3); g.restore();
    } });

  add({ id: 'ballrain', name: 'Raining tennis balls', kind: 'surprising', dur: 7600,
    cap: 'Wait… is it raining TENNIS BALLS?', punch: [4400, 'Best weather ever. Tidbit catches three at once!'],
    run: function (A, T, S) {
      A.say(T, '!!', 400, 1200); A.say(S, '!!', 500, 1300);
      if (A.in(1200, 5200)) { T.x = A.cx + Math.sin(A.t / 400) * (A.span - 10); T.face = Math.cos(A.t / 400) >= 0 ? 1 : -1; T.pose = 'run'; S.x = A.cx - Math.sin(A.t / 700) * (A.span - 30); S.face = Math.cos(A.t / 700) >= 0 ? -1 : 1; S.pose = 'run'; T.dy = -6; S.dy = 6; A.hop(T, 2400, 300, 24); A.hop(S, 3300, 400, 20); A.hop(T, 3800, 300, 24); }
      if (A.t >= 5200) { T.x = mix(T.x, A.x0, 1); S.x = A.x1; T.over = function (g, A2, i) { var h = A2.headL(i); for (var k = 0; k < 3; k++) A2.U.ball(g, h.x + 12 + k * 3, h.y + 6 - k * 3, 3.2); }; S.over = function (g, A2, i) { var h = A2.headL(i); A2.U.ball(g, h.x + 14, h.y + 6, 5.5); }; laugh(A, T, S, 5600); }
    },
    front: function (g, A) { if (A.t > 5200) return; var n = A.R ? 8 : 14; for (var i = 0; i < n; i++) { var per = 1400 + (i * 137) % 700, ph = ((A.t + i * 311) % per) / per, x = A.cx - A.span - 20 + ((i * 97) % (A.span * 2 + 40)), fall = Math.min(1, ph / 0.6), y = mix(-20, A.G, fall * fall); if (ph > 0.6) y = A.G - Math.abs(Math.sin((ph - 0.6) / 0.4 * PI * 2)) * 20 * (1 - (ph - 0.6) / 0.4); g.save(); g.globalAlpha *= A.e(0, 600); A.U.ball(g, x, y - 4, 4); g.restore(); } } });

  add({ id: 'singflowers', name: 'The singing flowers', kind: 'surprising', time: 'day', dur: 8400,
    cap: 'Pop, pop, pop… the flowers have faces. And they’re singing!', punch: [5400, 'One flower hits a really high note. Bravo!'],
    run: function (A, T, S) {
      A.say(T, '!', 1400, 2000); A.say(S, 'Ooh!', 1600, 2300);
      if (A.in(2600, 5200)) { T.pose = S.pose = 'wiggle'; T.wag = S.wag = 3.5; }
      if (A.in(5400, 6400)) { T.tilt = S.tilt = 0.35; } if (A.t > 6600) { T.pose = S.pose = 'bow'; A.say(T, 'Bravo!', 6800, 7800); }
      if (A.tick(400, 2000, 6400)) A.burst(A.cx + (Math.random() - 0.5) * 2 * A.span, A.G - 30, 1, 'note');
      if (A.once(5400)) A.burst(A.cx, A.G - 40, 14, 'confetti', { col: '#F7A8C2', speed: 0.12 });
    },
    front: function (g, A) {
      var U = A.U, n = 5;
      for (var i = 0; i < n; i++) { var x = A.cx - A.span + 10 + i * (A.span * 2 - 20) / (n - 1), up = A.back(300 + i * 250, 800 + i * 250), y = A.G + 12, h = 26 * up, sing = A.in(2000, 6400) ? Math.abs(Math.sin(A.t / (180 + i * 30))) : 0, hi = i === 2 && A.in(5400, 6400);
        if (up <= 0.02) continue; U.line(g, x, y, x, y - h, '#6FA15A', 1.8); U.ell(g, x + 4, y - h * 0.5, 4, 2, '#8FC46B', -0.5);
        var hx = x, hy = y - h - (hi ? 6 : 0); for (var k = 0; k < 7; k++) { var a = k / 7 * TAU; U.circle(g, hx + Math.cos(a) * 7 * up, hy + Math.sin(a) * 7 * up, 3.6 * up, ['#F28AA8', '#F7DC6F', '#B79CEB', '#F6B26B', '#FFFFFF'][i]); }
        U.circle(g, hx, hy, 5.4 * up, '#FFF3B0'); U.circle(g, hx - 1.8, hy - 1.2, 0.7, '#3C3350'); U.circle(g, hx + 1.8, hy - 1.2, 0.7, '#3C3350'); U.ell(g, hx, hy + 2, 1.6, 0.4 + sing * 1.6 + (hi ? 1 : 0), '#C9474F'); }
      if (A.in(5400, 6400)) A.say({ x: A.cx, y: A.G - 44, face: 1 }, 'La!', 5400, 6400);
    } });

  add({ id: 'marchband', name: 'Critter parade', kind: 'surprising', dur: 8400,
    cap: 'Tidbit leads a parade. Who’s following? Everyone!', punch: [4600, 'A snail, a duckling, a mouse, a bird… and Sugarfoot on the big drum.'],
    at: function (A) { return [A.cx - A.span + 8, A.cx - A.span + 8]; },
    run: function (A, T, S) {
      var c = A.cx, sp = A.span, x = mix(c - sp + 8, c + sp - 8, A.e(300, 6800));
      T.x = x; T.face = 1; T.pose = 'run'; T.lift = Math.abs(Math.sin(A.t / 250)) * 4; T.dy = -6;
      T.over = function (g, A2, i) { var h = A2.headL(i); A2.U.line(g, h.x + 11, h.y + 6, h.x + 16, h.y - 26 + Math.sin(A2.now / 150) * 3, '#F4EFE6', 1.2); A2.U.circle(g, h.x + 16, h.y - 27 + Math.sin(A2.now / 150) * 3, 2.4, '#E4566E'); };
      S.x = Math.max(c - sp, x - 110); S.face = 1; S.pose = 'run'; S.dy = 6; S.lift = Math.abs(Math.sin(A.t / 250 + 1)) * 4;
      if (A.t > 6800) { T.face = -1; laugh(A, T, S, 7000); }
      if (A.tick(500, 400, 6800)) A.burst(x - 50, A.G - 60, 1, 'note');
    },
    front: function (g, A) {
      var U = A.U, p0 = A.pos(0), p1 = A.pos(1);
      var line = function (k) { return mix(p1.x, p0.x, (k + 1) / 5); };
      snail(g, U, line(3), A.G + 5, 0.6, 1, A.now); duck(g, U, line(2), A.G + 6 - Math.abs(Math.sin(A.now / 120)) * 2, 0.9, 1); mouse(g, U, line(1), A.G + 5, 0.9, 1); bird(g, U, line(0), A.G - 20 + Math.sin(A.now / 200) * 4, 0.9, 1, Math.abs(Math.sin(A.now / 70)));
      var h = A.head(1); U.circle(g, h.x + 12, h.y + 20, 9, '#F4EFE6'); U.circle(g, h.x + 12, h.y + 20, 7, '#7C97E8');
    } });

  add({ id: 'bubblebath', name: 'Bubble bath', kind: 'silly', dur: 8000,
    cap: 'Bath time in a big tub. How many bubbles is too many?', punch: [4200, 'Too many! They pop up wearing bubble beards.'],
    run: function (A, T, S) {
      T.x = A.cx - 20; S.x = A.cx + 20; T.lift = S.lift = 10; T.pose = S.pose = 'sit'; T.dy = S.dy = 2;
      if (A.in(2400, 4200)) { T.alpha = S.alpha = 0.001; }
      if (A.t > 4200) { A.hop(T, 4200, 500, 30); A.hop(S, 4300, 500, 30); var beard = function (g, A2, i) { var h = A2.headL(i); for (var k = 0; k < 5; k++) A2.U.circle(g, h.x + 6 + k * 2.6, h.y + 9 + (k % 2) * 2, 2.8, 'rgba(255,255,255,.95)'); A2.U.circle(g, h.x - 2, h.y - 11, 3.4, 'rgba(255,255,255,.95)'); }; T.over = beard; S.over = beard; }
      A.say(T, 'Ho ho!', 4800, 5700); A.say(S, 'Ha!', 5200, 6000);
      if (A.tick(250, 600, 4200)) A.burst(A.cx + (Math.random() - 0.5) * 40, A.G - 24, 1, 'bubble', { speed: 0.04 });
    },
    front: function (g, A) {
      var U = A.U, c = A.cx, y = A.G + 4, foam = A.e(400, 2600) * (1 - A.e(6400, 8000) * 0.7);
      U.rr(g, c - 50, y - 26, 100, 22, 10, '#E6E2EE'); U.rr(g, c - 44, y - 6, 6, 6, 2, '#9AA3B8'); U.rr(g, c + 38, y - 6, 6, 6, 2, '#9AA3B8');
      for (var i = 0; i < 16; i++) { var bx = c - 46 + (i * 29) % 92, by = y - 26 - (i % 3) * 7 * foam - foam * 16 * Math.abs(Math.sin(i)), r = (5 + (i % 4) * 2) * (0.4 + foam); U.circle(g, bx, by, r, 'rgba(255,255,255,.95)'); U.circle(g, bx - r * 0.3, by - r * 0.3, r * 0.25, 'rgba(200,225,255,.8)'); }
    } });

  add({ id: 'fishing', name: 'Gone fishing (for socks)', kind: 'silly', where: ['beach', 'pond', 'dock'], dur: 8200,
    cap: 'Gone fishing! Tidbit feels a tug…', punch: [3800, 'It’s a sock! Then Sugarfoot reels in… the other sock. A matching pair!'],
    run: function (A, T, S) {
      T.x = A.x0; S.x = A.x1; T.face = S.face = -1 * 0 + 1; S.face = 1; T.tilt = S.tilt = 0.15;
      A.say(T, '!', 2200, 2800); if (A.in(2400, 3800)) { T.pivot = 'hind'; T.rot = -0.3 - 0.1 * Math.sin(A.t / 60); }
      A.say(T, 'A sock?', 4000, 4900); if (A.in(5200, 6400)) { S.pivot = 'hind'; S.rot = -0.3 - 0.1 * Math.sin(A.t / 60); }
      A.say(S, 'A pair!', 6600, 7600); if (A.t > 6800) laugh(A, T, S, 7000);
    },
    front: function (g, A) {
      [[0, 2400, 3800, '#E4566E'], [1, 5200, 6400, '#E4566E']].forEach(function (q) {
        var m = A.mouth(q[0]), tip = { x: m.x + 30, y: m.y - 30 }, reel = A.e(q[1], q[2]), wy = A.G - 44;
        A.U.line(g, m.x, m.y, tip.x, tip.y, '#8A6340', 1.4); g.strokeStyle = 'rgba(90,80,110,.6)'; g.lineWidth = 0.7; var ey = mix(wy, tip.y + 8, reel), ex = tip.x + 4; g.beginPath(); g.moveTo(tip.x, tip.y); g.lineTo(ex, ey); g.stroke();
        if (A.t < q[1]) A.U.circle(g, ex, wy + Math.sin(A.t / 300) * 1.2, 1.6, '#E4566E');
        else { g.save(); g.translate(ex, ey + 6); g.rotate(Math.sin(A.t / 150) * 0.3); A.U.rr(g, -2.4, 0, 4.8, 9, 1.5, q[3]); A.U.rr(g, -2.4, 7, 7, 3.4, 1.5, q[3]); A.U.rr(g, -2.4, 2, 4.8, 1.4, 0, '#FFFFFF'); g.restore(); }
      });
    } });

  add({ id: 'bubblewrap', name: 'Bubble wrap dance', kind: 'silly', dur: 7400,
    cap: 'A giant sheet of bubble wrap. Pop! Pop-pop!', punch: [4000, 'Pop-pop-pop-pop! The best dance floor ever.'],
    run: function (A, T, S) {
      var hopT = function (d, off, per, h) { for (var k = 0; k < 14; k++) A.hop(d, 400 + off + k * per, per * 0.7, h); };
      hopT(T, 0, 380, 16); hopT(S, 190, 520, 20);
      T.x = A.x0 + Math.sin(A.t / 700) * 16; S.x = A.x1 - Math.sin(A.t / 900) * 16;
      if (A.in(4000, 5600)) { T.pose = S.pose = 'wiggle'; }
      A.say(T, 'Pop!', 700, 1300); A.say(S, 'Pop!', 1300, 1900); if (A.t > 6200) laugh(A, T, S, 6200);
    },
    back: function (g, A) { var U = A.U, c = A.cx; U.rr(g, c - A.span - 10, A.G - 2, A.span * 2 + 20, 16, 3, 'rgba(230,240,252,.85)'); for (var i = 0; i < 22; i++) { var x = c - A.span + i * (A.span * 2) / 21, popped = A.t > 500 + ((i * 373) % 6000); U.circle(g, x, A.G + 5 + (i % 2) * 3, 3.2, popped ? 'rgba(200,215,235,.6)' : 'rgba(255,255,255,.95)'); } } });

  add({ id: 'kitecatch', name: 'Rainbow scarf', kind: 'sweet', dur: 7800,
    cap: 'The wind snatches Sugarfoot’s scarf! Tidbit is already running', punch: [4200, 'Caught it! Tidbit wraps it round both of them.'],
    run: function (A, T, S) {
      A.say(S, 'Oh!', 500, 1200);
      var sx = this._scarf(A);
      if (A.t > 900 && A.t < 4200) { T.x = clamp(sx.x - 10, A.cx - A.span, A.cx + A.span); T.face = sx.v >= 0 ? 1 : -1; T.pose = 'run'; A.hop(T, 3500, 500, 60); }
      if (A.t >= 4200) { T.x = mix(clamp(sx.x - 10, A.cx - A.span, A.cx + A.span), A.cx - 20, A.e(4400, 5200)); S.x = mix(A.x1, A.cx + 20, A.e(4400, 5200)); T.face = 1; S.face = -1; if (A.t > 5200) { lean(T, 0.12); lean(S, 0.12); } }
      A.say(T, 'Got it!', 4100, 4900); A.say(S, 'My hero.', 5400, 6400); hearts(A, A.cx, A.G - 80, 5600);
    },
    _scarf: function (A) {
      var t = A.t;
      if (t < 800) { var h = A.head(1); return { x: h.x, y: h.y + 8, v: 0 }; }
      if (t < 4000) { var p = A.p(800, 4000); return { x: mix(A.x1, A.cx - A.span + 20, p) + Math.sin(p * 9) * 20, y: A.G - 80 - Math.sin(p * PI) * 50 + Math.cos(p * 11) * 10, v: -1 }; }
      var m = A.mouth(0); return { x: m.x, y: m.y, v: 1 };
    },
    front: function (g, A) {
      var s = this._scarf(A), cols = ['#F27D7D', '#F6B26B', '#F7DC6F', '#8FD694', '#7FB8F0', '#B79CEB'];
      if (A.t > 5200) { var a = A.head(0), b = A.head(1); for (var k = 0; k < 6; k++) { g.strokeStyle = cols[k]; g.lineWidth = 1.6; g.beginPath(); g.moveTo(a.x - 6, a.y + 12 + k * 1.4); g.quadraticCurveTo((a.x + b.x) / 2, a.y + 22 + k * 1.4, b.x + 6, b.y + 12 + k * 1.4); g.stroke(); } return; }
      for (var j = 0; j < 6; j++) { g.strokeStyle = cols[j]; g.lineWidth = 1.8; g.beginPath(); g.moveTo(s.x, s.y + j * 1.6); g.quadraticCurveTo(s.x + 12, s.y + j * 1.6 + Math.sin(A.t / 90) * 6, s.x + 26, s.y + j * 1.6 + Math.sin(A.t / 70) * 4); g.stroke(); }
    } });

  add({ id: 'starcatch', name: 'Catching a falling star', kind: 'surprising', time: 'night', dur: 8400,
    cap: 'A shooting star is heading right for the garden…', punch: [3600, 'Sugarfoot catches it, gently. It’s a tiny, glowing, giggling star.'],
    run: function (A, T, S) {
      A.say(T, '!!', 800, 1600); T.tilt = S.tilt = A.in(600, 3200) ? -0.35 : 0;
      A.walk(S, A.x1, A.cx + 10, 2000, 3000); if (A.in(3000, 3600)) { S.pivot = 'hind'; S.rot = -0.3 * A.bump(3000, 3600); }
      if (A.t > 3600) { S.x = A.cx + 10; S.face = -1; A.say(S, 'Gently…', 3700, 4500); T.x = mix(A.x0, A.cx - 40, A.e(4200, 4800)); }
      if (A.t > 6600) { T.pivot = S.pivot = 'hind'; T.rot = S.rot = -0.4 * A.bump(6600, 7600); A.say(T, 'Bye!', 6800, 7800); }
    },
    front: function (g, A) {
      var U = A.U, t = A.t, x, y, s = 6;
      if (t < 3500) { var p = A.e(0, 3500); x = mix(A.cx + A.span + 20, A.head(1).x + A.head(1).face * 10, p); y = mix(10, A.head(1).y + 2, p); if (p < 1) { g.strokeStyle = 'rgba(255,245,200,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30, y - 16); g.stroke(); } }
      else if (t < 6600) { var h = A.head(1); x = h.x + h.face * 10 + Math.sin(t / 300) * 3; y = h.y - 4 - A.e(4800, 5600) * 14; }
      else { var q = A.e(6600, 8400), h2 = A.head(1); x = mix(h2.x, A.cx - 20, q); y = mix(h2.y - 18, 20, q); }
      var gl = g.createRadialGradient(x, y, 1, x, y, 20); gl.addColorStop(0, 'rgba(255,240,170,.6)'); gl.addColorStop(1, 'rgba(255,240,170,0)'); g.fillStyle = gl; g.fillRect(x - 20, y - 20, 40, 40);
      U.star(g, x, y, s, '#FFE68A', t / 900); U.circle(g, x - 1.4, y - 0.4, 0.6, '#6B5A70'); U.circle(g, x + 1.4, y - 0.4, 0.6, '#6B5A70');
      if (A.in(4800, 6000)) A.say({ x: x, y: y - 4, face: 1 }, 'Hee!', 4800, 6000);
    } });

  add({ id: 'snowdogs', name: 'Snow-pals', kind: 'sweet', where: ['snow'], dur: 8400,
    cap: 'Rolling snowballs, stacking them up…', punch: [5000, 'Two snow-pals, side by side. Just like the real ones.'],
    run: function (A, T, S) {
      T.x = A.cx - 60 + Math.sin(A.t / 300) * 14 * A.bump(300, 3600); S.x = A.cx + 60 + Math.sin(A.t / 400 + 2) * 12 * A.bump(300, 3600); if (A.in(300, 3600)) { T.pose = S.pose = 'bow'; }
      if (A.in(3800, 4800)) { rear(A, T, 3800, 4400, 0.4); rear(A, S, 4200, 4800, 0.4); }
      if (A.t > 5200) { T.x = A.cx - 80; S.x = A.cx + 80; T.face = 1; S.face = -1; A.say(T, 'Twins!', 5400, 6300); A.say(S, '<3', 5800, 6800); }
      hearts(A, A.cx, A.G - 80, 6000);
    },
    back: function (g, A) {
      var U = A.U, b = A.e(300, 3600), top = A.back(3800, 4400), top2 = A.back(4200, 4800);
      [[A.cx - 26, top, '#E4566E'], [A.cx + 26, top2, '#7FB8F0']].forEach(function (q) { var r1 = 6 + 12 * b; U.circle(g, q[0], A.G - r1 + 4, r1, '#FFFFFF'); if (q[1] > 0) { var r2 = 10 * q[1], hy = A.G - 2 * r1 + 4 - r2 + 3; U.circle(g, q[0], hy, r2, '#FFFFFF'); U.ell(g, q[0] - 8 * q[1], hy - 2, 3 * q[1], 6 * q[1], '#3C3350', 0.3); U.circle(g, q[0] + 3, hy - 2, 1.2, '#3C3350'); U.circle(g, q[0] + 8, hy + 1, 1.8, '#F2A84B'); U.rr(g, q[0] - 8, hy + r2 - 3, 16, 3, 1.5, q[2]); } });
    } });

  add({ id: 'heartsofgold', name: 'Hearts of gold', kind: 'sweet', dur: 8800,
    cap: 'A baby bird has tumbled out of its nest. Tidbit spots it first…', punch: [4600, 'Sugarfoot lifts it home, gently. Two hearts of gold, glowing.'],
    at: function (A) { return [A.cx - 70, A.cx + 70]; },
    run: function (A, T, S) {
      var c = A.cx, tx = c + A.span - 34;
      A.say(T, '!', 500, 1100); A.walk(T, c - 70, c + 10, 900, 1800); if (A.in(1800, 2600)) { T.pose = 'bow'; T.face = 1; }
      A.say(T, 'Help!', 2000, 2800);
      A.walk(S, c + 70, c + 40, 2400, 3000); if (A.in(3000, 3600)) { S.pose = 'bow'; S.face = 1; }
      A.walk(S, c + 40, tx - 10, 3700, 4500); if (A.in(4500, 5400)) { S.face = 1; S.pivot = 'hind'; S.rot = -0.75 * A.bump(4500, 5400); }
      if (A.t > 5400) { S.x = tx - 10; T.x = mix(c + 10, tx - 50, A.e(5400, 6000)); T.face = S.face = 1; T.tilt = S.tilt = -0.3; }
      A.say({ x: tx + 10, y: A.G - 120, face: 1 }, 'Tweet!', 5800, 6800);
      if (A.t > 6800) { T.face = 1; S.face = -1; lean(S, 0.12); T.wag = 4; }
      if (A.once(5400)) { A.burst(tx, A.G - 100, 10, 'gold', { speed: 0.08 }); } if (A.once(6900)) A.burst((A.pos(0).x + A.pos(1).x) / 2, A.G - 80, 10, 'gold', { speed: 0.06 });
    },
    back: function (g, A) { var U = A.U, tx = A.cx + A.span - 34, y = A.G + 2; U.rr(g, tx + 6, y - 110, 7, 112, 2, '#8A6340'); U.circle(g, tx + 10, y - 124, 22, '#6FAE6A'); U.circle(g, tx - 6, y - 110, 12, '#7FBE72'); U.ell(g, tx + 2, y - 100, 12, 5, '#9B6B45'); U.ell(g, tx + 2, y - 102, 9, 3, '#B7865A'); },
    front: function (g, A) {
      var U = A.U, tx = A.cx + A.span - 34, t = A.t, x, y;
      if (t < 3600) { x = A.cx + 30; y = A.G + 2; }
      else if (t < 5400) { var m = A.mouth(1); x = m.x + 2; y = m.y - 2; if (t > 4600) { var p = A.e(4600, 5400); x = mix(m.x + 2, tx + 2, p); y = mix(m.y - 2, A.G - 104, p); } }
      else { x = tx + 2; y = A.G - 104; }
      bird(g, U, x, y, 0.75, 1, t < 3600 ? 0 : Math.abs(Math.sin(t / 90)) * 0.5, '#F7DC6F');
      if (t > 5400) { var gl = 0.5 + 0.5 * Math.sin(t / 300); [0, 1].forEach(function (i) { var h = A.head(i); U.circle(g, h.x, h.y - 26, 9, 'rgba(255,215,110,' + (0.25 * gl).toFixed(2) + ')'); U.heart(g, h.x, h.y - 26, 5, '#F6CB4C'); }); }
    } });

  X.combos = (X.combos || []).concat([['scheme', 'bearhug'], ['detective', 'cookiecode'], ['darkcave', 'lanternwalk'], ['relay', 'handshake'], ['telescope', 'moonplay'],
    ['teaparty', 'mouseride'], ['synchro', 'bubblebath'], ['band2', 'talentshow'], ['launcher', 'robot'], ['blanketfort', 'campfire'], ['tennis', 'jumprope']]);
})();
