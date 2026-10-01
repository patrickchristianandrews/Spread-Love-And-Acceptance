/* pals-cam-pack-more.js — even more for the pal cam: games, kindness moments, little skits, things to
   make together and quiet things to watch, some just for certain places or for the night. Loaded when the
   cam first opens, after pals-cam-pack-extra.js, and written the same way (see the notes at the top of
   pals-cam-acts.js; the routine kit K comes from pals-cam-pack-scenes.js).
   Tidbit is T (index 0, the black mask): quick, busy, bold. Sugarfoot is S (index 1, the white feet):
   slow, steady, thoughtful, and she leans on her pal. Both have a big heart of gold. */
(function () {
  'use strict';
  var PI = Math.PI, TAU = PI * 2;
  var X = window.TOLPalsCamActs; if (!X || !X.kit) return;
  var K = X.kit, rr = K.rr, circ = K.circ, ell = K.ell, line = K.line, glow = K.glow;
  function mix(a, b, p) { return a + (b - a) * p; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function add(o) { X.acts.push(o); return o; }
  // places with open sky and ground underfoot
  var OUT = ['backyard', 'meadow', 'citypark', 'forest', 'pond', 'rooftop', 'gardenparty', 'farm', 'orchard', 'campsite', 'treehouse', 'pumpkins', 'beach', 'dock'];
  var GRASS = ['backyard', 'meadow', 'citypark', 'forest', 'gardenparty', 'farm', 'orchard', 'campsite', 'treehouse', 'pumpkins'];
  // Sugarfoot's famous lean: she scoots in and rests on her pal
  function lean(A, d, o, a, b) { var h = A.e(a, a + 400) * (1 - A.e(b - 400, b)); if (h <= 0) return; d.face = o.x >= d.x ? 1 : -1; d.pivot = 'hind'; d.rot = 0.18 * h; d.blink = h > 0.8; }
  function bubble(g, x, y, r, a) { g.strokeStyle = 'rgba(190,225,255,' + (0.9 * a).toFixed(2) + ')'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, Math.max(0.5, r), 0, TAU); g.stroke(); circ(g, x - r * 0.35, y - r * 0.35, Math.max(0.4, r * 0.18), 'rgba(255,255,255,' + (0.8 * a).toFixed(2) + ')'); }
  function kite(g, x, y, s, col, rot) { g.save(); g.translate(x, y); g.rotate(rot || 0); g.fillStyle = col; g.beginPath(); g.moveTo(0, -12 * s); g.lineTo(8 * s, 0); g.lineTo(0, 14 * s); g.lineTo(-8 * s, 0); g.closePath(); g.fill(); line(g, 0, -12 * s, 0, 14 * s, 'rgba(255,255,255,.6)', 1); line(g, -8 * s, 0, 8 * s, 0, 'rgba(255,255,255,.6)', 1); g.restore(); }

  // ======================= games =======================
  add({ id: 'm-hideseek', name: 'Hide and seek in a box', kind: 'silly', dur: 8600,
    cap: 'Hide and seek! Tidbit counts. Sugarfoot hides in her favorite spot…', punch: [6000, 'Found you! (The wagging tail was a big clue.)'],
    run: function (A, T, S) {
      var bx = A.cx + 52;
      S.x = mix(A.x1, bx + 8, A.e(300, 900)); S.face = -1;
      if (A.in(900, 6000)) { S.pose = 'lie'; S.wag = 3.5; S.dy = 8; }
      T.x = A.x0 - 10;
      if (A.t < 3400) { T.face = -1; T.blink = true; T.tilt = 0.2; }
      A.say(T, 'One, two…', 500, 1500); A.say(T, '…ten!', 2400, 3300); A.say(T, 'Ready or not!', 3400, 4200);
      if (A.t >= 3400) { A.walk(T, A.x0 - 10, A.cx - A.span + 14, 3900, 4700); if (A.t > 4700) T.face = -1; A.say(T, 'Hmm?', 4700, 5300); A.walk(T, A.cx - A.span + 14, bx - 50, 5200, 5900); }
      if (A.t >= 5900) { T.face = 1; A.say(T, 'Found you!', 6000, 6900); A.hop(S, 6000, 380, 22); S.face = -1; }
      if (A.t > 6900) K.laugh(A, T, S, 7000);
      if (A.once(6000)) A.burst(bx, A.G - 50, 10, 'confetti', { speed: 0.1 });
    },
    front: function (g, A) {
      var bx = A.cx + 52, y = A.G + 6;
      rr(g, bx - 24, y - 40, 48, 40, 2, '#D2A86E'); rr(g, bx - 24, y - 40, 48, 6, 2, '#C29560'); line(g, bx - 8, y - 26, bx + 8, y - 26, 'rgba(120,80,40,.45)', 1.5);
    } });

  add({ id: 'm-tag', name: 'Gentle tag', kind: 'silly', dur: 8200,
    cap: 'Tag! Tidbit is very fast. Sugarfoot is very… steady', punch: [4700, 'Tidbit slows down just enough. Sugarfoot tags her and beams.'],
    run: function (A, T, S) {
      var far = A.cx - A.span + 12;
      A.walk(T, A.x0, A.x1 - 38, 200, 900); A.say(T, 'Tag!', 900, 1600); if (A.in(900, 1300)) T.face = 1;
      A.walk(T, A.x1 - 38, far, 1300, 2200);
      if (A.in(2200, 3800)) { T.face = 1; T.wag = 4; A.hop(T, 2500, 260, 14); A.hop(T, 3000, 260, 14); }
      A.say(T, 'Over here!', 2400, 3400);
      A.walk(S, A.x1, A.cx - 6, 1500, 3800); A.say(S, 'Coming…', 1900, 2800);
      A.walk(T, far, A.cx - 44, 3800, 4500);
      if (A.t > 4500) { T.face = 1; S.face = -1; S.x = A.cx - 6; }
      A.say(S, 'Tag!', 4700, 5500); A.hop(S, 4700, 320, 14);
      if (A.t > 5400) K.laugh(A, T, S, 5600);
      lean(A, S, T, 6400, 8200);
      K.hearts(A, A.cx - 24, A.G - 80, 4800, 6);
    } });

  add({ id: 'm-catch', name: 'Playing catch', kind: 'sweet', dur: 8400,
    cap: 'A game of catch. Back and forth, back and forth…', punch: [6600, 'A spinning catch! “Great throw!” “Great catch!”'],
    at: function (A) { return [A.cx - 64, A.cx + 64]; },
    run: function (A, T, S) {
      T.x = A.cx - 64; S.x = A.cx + 64; T.face = 1; S.face = -1;
      [600, 1800, 3000, 4200].forEach(function (t0, k) { K.rear(A, k % 2 ? S : T, t0 - 300, t0 + 150, 0.3); });
      K.rear(A, S, 5100, 5550, 0.45);
      A.say(T, 'Catch!', 500, 1300); A.say(S, 'Got it!', 1500, 2300); A.say(T, 'Nice!', 3700, 4500);
      A.say(S, 'Up high!', 5000, 5900); A.flip(T, 6150, 560, 34, 1, -1); A.say(T, 'Got it!', 6750, 7500); A.say(S, 'Wow!', 7000, 7800);
      if (A.t > 6800) T.wag = S.wag = 3.5;
      K.hearts(A, A.cx, A.G - 90, 6800, 6);
    },
    front: function (g, A) {
      var U = A.U, th = [[600, 0, 1, 900, 46], [1800, 1, 0, 900, 46], [3000, 0, 1, 900, 46], [4200, 1, 0, 900, 46], [5300, 1, 0, 1300, 130]], hold = 0;
      for (var k = 0; k < th.length; k++) {
        var q = th[k], p = A.p(q[0], q[0] + q[3]);
        if (A.t < q[0]) { hold = q[1]; break; }
        if (p < 1) { var a = A.mouth(q[1]), b = A.mouth(q[2]); U.ball(g, mix(a.x, b.x, p), mix(a.y, b.y, p) - q[4] * 4 * p * (1 - p), 4.5); return; }
        hold = q[2];
      }
      var m = A.mouth(hold); U.ball(g, m.x + m.face * 2, m.y + 1, 4.5);
    } });

  add({ id: 'm-tug', name: 'A fair tug-of-war', kind: 'silly', dur: 7800,
    cap: 'Tug-of-war with a rope toy. The red ribbon marks the middle…', punch: [4300, 'Plop! They both sit down at once. A perfect tie.'],
    at: function (A) { return [A.cx - 46, A.cx + 46]; },
    run: function (A, T, S) {
      var tug = A.in(400, 4300), sway = tug ? A.osc(1100, 6) : 0;
      T.x = A.cx - 46 + sway; S.x = A.cx + 46 + sway; T.face = 1; S.face = -1;
      if (tug) { T.pose = S.pose = 'bow'; T.wag = S.wag = 3; }
      A.say(T, 'Grr-ruff!', 900, 1800); A.say(S, 'Hmm-mm!', 2000, 2900);
      if (A.t >= 4300) { T.pose = S.pose = 'lie'; T.x -= 6; S.x += 6; K.laugh(A, T, S, 4700); A.say(T, 'Tie!', 5800, 6700); A.say(S, 'Again!', 6200, 7100); }
      if (A.once(4300)) { A.burst(A.cx, A.G - 30, 10, 'spark', { spread: TAU, speed: 0.08 }); A.shake(1.5); }
    },
    front: function (g, A) {
      var a = A.mouth(0), b = A.mouth(1), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 + (A.t < 4300 ? 4 : 14);
      g.strokeStyle = '#E8D7B4'; g.lineWidth = 3.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(a.x, a.y); g.quadraticCurveTo(mx, my + 4, b.x, b.y); g.stroke();
      var rx = mix(mix(a.x, mx, 0.5), mix(mx, b.x, 0.5), 0.5), ry = mix(mix(a.y, my + 4, 0.5), mix(my + 4, b.y, 0.5), 0.5);
      g.fillStyle = '#E4566E'; g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - 6, ry - 4); g.lineTo(rx - 6, ry + 4); g.closePath(); g.fill(); g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx + 6, ry - 4); g.lineTo(rx + 6, ry + 4); g.closePath(); g.fill(); circ(g, rx, ry, 2, '#C93F57');
    } });

  add({ id: 'm-bubbles', name: 'Bubble wand', kind: 'sweet', dur: 8400,
    cap: 'Tidbit waves a bubble wand. Sugarfoot gently boops them…', punch: [5400, 'One big bubble lands on Sugarfoot’s nose, and stays!'],
    at: function (A) { return [A.cx - 50, A.cx + 50]; },
    run: function (A, T, S) {
      T.x = A.cx - 50 + A.osc(1400, 4); S.x = A.cx + 50; T.face = 1; S.face = -1;
      if (A.in(600, 4200)) T.wag = 3;
      A.hop(S, 1900, 300, 16); A.hop(S, 2900, 300, 16); A.hop(S, 3700, 300, 16);
      A.say(S, 'Boop!', 2000, 2700); A.say(S, 'Boop!', 3000, 3600); A.say(T, 'A big one!', 4300, 5200);
      if (A.in(5300, 7000)) { S.tilt = 0.25; S.blink = A.t > 6000; A.say(S, '…!', 5400, 6200); }
      if (A.once(2050) || A.once(3050) || A.once(3850)) { var m = A.mouth(1); A.burst(m.x - 10, m.y - 10, 5, 'bubble', { spread: TAU, speed: 0.05 }); }
      if (A.once(7000)) { var m2 = A.mouth(1); A.burst(m2.x, m2.y - 8, 8, 'heart'); }
      if (A.t > 7000) K.laugh(A, T, S, 7100);
    },
    front: function (g, A) {
      var w = A.mouth(0), wx = w.x + 10, wy = w.y - 10;
      line(g, w.x, w.y, wx, wy, '#B79CEB', 2); g.strokeStyle = '#B79CEB'; g.lineWidth = 1.6; g.beginPath(); g.arc(wx + 3, wy - 3, 4.5, 0, TAU); g.stroke();
      for (var i = 0; i < 9; i++) { var b0 = 700 + i * 360, age = A.t - b0; if (age < 0 || age > 2400) continue; var p = age / 2400, x = wx + 6 + age * 0.045, y = wy - 6 - age * 0.02 + Math.sin(age / 300 + i) * 6; bubble(g, x, y, 3 + (i % 3) * 1.6, 1 - Math.max(0, (p - 0.75) / 0.25)); }
      if (A.in(4200, 7000)) { var s = A.e(4200, 4600), f = A.e(4600, 5300), m = A.mouth(1), x2 = mix(wx + 8, m.x - 3, f), y2 = mix(wy - 8, m.y - 12, f) - Math.sin(f * PI) * 20; bubble(g, x2, y2, 4 + s * 6, 1); }
    } });

  add({ id: 'm-blocks', name: 'Block tower', kind: 'cool', dur: 8400,
    cap: 'Taking turns stacking blocks: your block, my block, your block…', punch: [5300, 'It wobbles… wobbles… and stays up! Teamwork tower.'],
    at: function (A) { return [A.cx - 46, A.cx + 46]; },
    run: function (A, T, S) {
      T.x = A.cx - 46; S.x = A.cx + 46; T.face = 1; S.face = -1;
      for (var k = 0; k < 6; k++) K.rear(A, k % 2 ? S : T, 600 + k * 560, 1050 + k * 560, 0.35);
      A.say(T, 'Mine!', 700, 1300); A.say(S, 'Yours?', 1300, 1900); A.say(T, 'No, ours!', 1900, 2700);
      if (A.in(4000, 5300)) { T.tilt = S.tilt = 0.25; A.say(T, '…', 4100, 5100); A.say(S, '…', 4200, 5100); }
      if (A.t > 5300) { T.wag = S.wag = 4; A.hop(T, 5300, 380, 26); A.hop(S, 5400, 420, 20); A.say(S, 'We did it!', 5900, 6900); }
      if (A.once(5300)) A.burst(A.cx, A.G - 90, 14, 'confetti', { speed: 0.12 });
      K.gold(A, A.cx, A.G - 100, 5600, 5);
    },
    front: function (g, A) {
      var U = A.U, cols = ['#E4566E', '#F6B26B', '#F7DC6F', '#8FD694', '#7FB8F0', '#B79CEB'], wob = A.in(4000, 5300) ? Math.sin(A.t / 110) * 0.06 * (1 - A.e(4600, 5300)) : 0;
      g.save(); g.translate(A.cx, A.G + 6); g.rotate(wob);
      for (var k = 0; k < 6; k++) {
        var t0 = 600 + k * 560, p = A.e(t0, t0 + 420); if (A.t < t0) break;
        var tx = (k % 2 ? 2 : -2), ty = -12 - k * 12;
        if (p < 1) { var m = A.mouth(k % 2); g.restore(); rr(g, mix(m.x, A.cx + tx, p) - 9, mix(m.y, A.G + 6 + ty, p) - 6 - Math.sin(p * PI) * 14, 18, 12, 2, cols[k]); g.save(); g.translate(A.cx, A.G + 6); g.rotate(wob); continue; }
        rr(g, tx - 9, ty, 18, 12, 2, cols[k]); rr(g, tx - 6, ty + 3, 4, 4, 1, 'rgba(255,255,255,.35)');
      }
      if (A.t > 4000) U.star(g, 0, -86, 6 * A.back(4000, 4400), '#F8D76A', A.t / 900);
      g.restore();
    } });

  add({ id: 'm-slide', name: 'Taking turns on the slide', kind: 'sweet', dur: 9800,
    cap: 'One slide, two pals. Tidbit goes first…', punch: [2900, '“Your turn!” Tidbit waits at the bottom to cheer.'],
    at: function (A) { return [A.x0, A.cx + A.span - 14]; },
    run: function (A, T, S) {
      var lx = A.cx + 54, bot = A.cx - 50, wait = A.cx + A.span - 14, far = A.cx - A.span + 12, top = 54;
      function slide(d, a, b, c, e) { // climb a..b, slide c..e
        if (A.in(a, c)) { d.x = lx - 4; d.face = -1; d.lift = top * A.e(a, b); d.pose = A.t < b ? 'run' : 'sit'; }
        else if (A.in(c, e)) { var p = A.p(c, e), q = p * p; d.x = mix(lx - 4, bot, q); d.lift = top * (1 - q); d.face = -1; d.pose = 'sit'; d.pivot = 'center'; d.rot = 0.42 * (1 - A.e(e - 120, e)); }
      }
      T.x = A.x0; A.walk(T, A.x0, lx - 4, 300, 1000); slide(T, 1000, 1500, 1700, 2300); A.say(T, 'Wheee!', 1800, 2600);
      if (A.t >= 2300) { T.x = bot; A.walk(T, bot, far, 2400, 3000); if (A.t > 3000) T.face = 1; }
      A.say(T, 'Your turn!', 2900, 3800);
      S.x = wait; S.face = -1; A.walk(S, wait, lx - 4, 3200, 3900); slide(S, 3900, 5000, 5300, 6500); A.say(S, 'Wheee…', 5400, 6400);
      if (A.t >= 6500) { S.x = bot + 8; S.face = -1; A.say(S, 'Thank you!', 6600, 7500); A.walk(T, far, bot - 30, 6500, 7000); A.say(T, 'Again!', 7400, 8200); if (A.t > 7000) T.face = 1; }
      if (A.t > 7600) lean(A, S, T, 7600, 9800);
      if (A.once(2300) || A.once(6500)) A.burst(bot, A.G - 10, 6, 'spark', { spread: 2 });
      K.hearts(A, bot - 10, A.G - 80, 6700, 6);
    },
    back: function (g, A) {
      var lx = A.cx + 54, bot = A.cx - 50, y = A.G + 2, top = A.G - 52;
      line(g, lx + 6, y, lx + 6, top, '#9AA3B8', 3); line(g, lx + 20, y, lx + 20, top, '#9AA3B8', 3);
      for (var k = 1; k < 5; k++) line(g, lx + 6, y - k * 11, lx + 20, y - k * 11, '#B7BFD0', 2);
      rr(g, lx - 2, top - 4, 24, 5, 2, '#7FB8F0');
      g.strokeStyle = '#F6B26B'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(lx, top); g.quadraticCurveTo(mix(lx, bot, 0.55), mix(top, y, 0.85), bot - 10, y - 2); g.stroke();
    } });

  add({ id: 'm-dance', name: 'Twirl and dip', kind: 'cool', dur: 8200,
    cap: 'Dance class! Step to the side, step back, and twirl…', punch: [5400, 'The big finish: a dip! Sugarfoot is very graceful.'],
    at: function (A) { return [A.cx - 40, A.cx + 40]; },
    run: function (A, T, S) {
      var st = A.in(400, 3000) ? A.osc(1200, 14) : 0;
      T.x = A.cx - 40 + st; S.x = A.cx + 40 + st; T.face = 1; S.face = -1;
      if (A.in(400, 3000)) { T.wag = S.wag = 3; T.lift += Math.abs(A.osc(600, 4)); S.lift += Math.abs(A.osc(600, 3)); }
      A.spin(T, 3000, 900, 2); A.spin(S, 3200, 900, 2);
      if (A.t > 4200) { T.x = mix(A.cx - 40, A.cx - 22, A.e(4200, 5000)); S.x = mix(A.cx + 40, A.cx + 22, A.e(4200, 5000)); }
      if (A.in(5400, 6800)) { var h = A.e(5400, 5800) * (1 - A.e(6400, 6800)); S.pivot = 'hind'; S.rot = -0.42 * h; S.blink = h > 0.6; T.pivot = 'hind'; T.rot = 0.14 * h; }
      A.say(T, 'And twirl!', 2900, 3800); A.say(T, 'Ta-da!', 7000, 7900); A.say(S, 'Ta-da!', 7100, 8000);
      if (A.t > 6900) { A.hop(T, 7000, 360, 20); A.hop(S, 7100, 380, 18); }
      if (A.tick(500, 400, 4200)) A.burst(A.cx + A.osc(700, 30), A.G - 90, 1, 'note', { speed: 0.04 });
      K.hearts(A, A.cx, A.G - 80, 6000, 7);
    } });

  add({ id: 'm-pompoms', name: 'You can do it!', kind: 'sweet', dur: 8800,
    cap: 'Sugarfoot wants to hop over the log. Tidbit grabs her pom-poms', punch: [5100, 'She did it! Tidbit cheers loud enough for the whole world.'],
    at: function (A) { return [A.cx - 70, A.cx + 54]; },
    run: function (A, T, S) {
      T.x = A.cx - 70; T.face = 1; S.x = A.cx + 54; S.face = -1;
      if (A.in(600, 7000)) { T.wag = 4; T.lift += Math.abs(A.osc(500, 5)); }
      A.say(S, 'Hup!', 1700, 2300); A.hop(S, 1900, 380, 9);
      A.say(T, 'You can do it!', 2500, 3600); A.say(S, 'Okay…', 3700, 4300);
      if (A.t >= 4400) { S.x = mix(A.cx + 54, A.cx - 26, A.e(4400, 5100)); A.hop(S, 4400, 700, 36); }
      A.say(S, 'Hup!', 4300, 4900);
      if (A.t > 5100) { A.flip(T, 5150, 600, 30, 1, -1); A.say(T, 'Yay!', 5200, 6000); S.wag = 4; A.say(S, 'I did it!', 5900, 6900); }
      if (A.t > 7000) lean(A, S, T, 7000, 8800);
      if (A.once(5100)) A.burst(A.cx - 40, A.G - 70, 16, 'confetti', { speed: 0.13 });
      K.gold(A, A.cx - 30, A.G - 90, 6200, 5);
    },
    back: function (g, A) { var x = A.cx + 14, y = A.G + 4; rr(g, x - 20, y - 12, 40, 12, 6, '#9B6B45'); ell(g, x + 20, y - 6, 4, 6, '#C9A77A'); ell(g, x + 20, y - 6, 2, 3.4, '#9B6B45'); },
    front: function (g, A) {
      if (A.t < 600 || A.t > 7400) return; var h = A.head(0), sh = A.osc(300, 4);
      [[-10, -8 + sh], [14, -10 - sh]].forEach(function (o, k) { for (var j = 0; j < 7; j++) { var a = j / 7 * TAU + A.t / 300; circ(g, h.x + o[0] + Math.cos(a) * 4, h.y + 18 + o[1] + Math.sin(a) * 4, 2.6, k ? '#F7A8C2' : '#7FB8F0'); } });
    } });

  // ======================= kindness =======================
  add({ id: 'm-nicethings', name: 'Saying nice things', kind: 'sweet', dur: 8600,
    cap: 'A favorite game: taking turns saying nice things', punch: [5400, '“You’re my best friend!” “You too!”'],
    at: function (A) { return [A.cx - 34, A.cx + 34]; },
    run: function (A, T, S) {
      T.x = A.cx - 34; S.x = A.cx + 34; T.face = 1; S.face = -1;
      var q = [[600, T, 'You’re brave!'], [1800, S, 'You’re clever!'], [3000, T, 'You’re cozy!'], [4200, S, 'You’re so fast!'], [5400, T, 'You’re my best friend!'], [6800, S, 'You too!']];
      q.forEach(function (x, k) { A.say(x[1], x[2], x[0], x[0] + (k === 4 ? 1300 : 1100)); var o = x[1] === T ? S : T; if (A.in(x[0] + 400, x[0] + 1400)) { o.wag = 4; o.tilt = 0.2; } if (A.once(x[0] + 500)) { var m = A.head(o === T ? 0 : 1); A.burst(m.x, m.y - 10, 3, 'heart'); } });
      if (A.t > 7400) lean(A, S, T, 7400, 8600);
      K.gold(A, A.cx, A.G - 90, 7000, 6);
    } });

  add({ id: 'm-waitup', name: 'Wait for me', kind: 'sweet', dur: 9200,
    cap: 'Walk time! Tidbit zooms ahead… then stops and looks back', punch: [2700, 'Back she comes. Some walks are better slow, side by side.'],
    at: function (A) { return [A.cx - A.span + 40, A.cx - A.span + 12]; },
    run: function (A, T, S) {
      var s0 = A.cx - A.span + 12, s1 = A.cx + 30;
      T.x = A.cx - A.span + 40; T.face = 1; S.x = s0; S.face = 1;
      A.walk(T, A.cx - A.span + 40, A.cx + A.span - 10, 500, 1200);
      if (A.in(1200, 1900)) { T.face = -1; T.tilt = 0.3; }
      A.say(T, 'Oh!', 1300, 1900);
      A.walk(T, A.cx + A.span - 10, s0 + 36, 1900, 2600);
      if (A.t > 2600) { T.face = 1; A.say(S, 'Thanks, pal.', 2700, 3700); }
      if (A.t > 2900) { A.walk(S, s0, s1, 2900, 7000); T.x = S.x + 34; if (A.t < 7000) { T.pose = 'run'; T.face = 1; } }
      A.say(T, 'Slow is nice.', 4600, 5600);
      if (A.t > 7000) { T.face = -1; lean(A, S, T, 7100, 9200); }
      K.hearts(A, s1 + 16, A.G - 80, 7400, 7);
    } });

  add({ id: 'm-boost', name: 'A helping boost', kind: 'sweet', dur: 8800,
    cap: 'A cookie on a high shelf. Tidbit hops… and hops… too high!', punch: [4800, 'Teamwork! And Tidbit breaks the cookie in two, of course.'],
    at: function (A) { return [A.cx - 6, A.cx + A.span - 20]; },
    run: function (A, T, S) {
      var bx = A.cx - 6;
      T.x = bx; T.face = 1; A.hop(T, 500, 380, 22); A.hop(T, 1200, 380, 22); A.say(T, 'Hmm!', 1700, 2300);
      S.x = A.cx + A.span - 20; A.walk(S, S.x, bx + 2, 1700, 2500); if (A.t >= 2500) { S.x = bx + 2; S.face = 1; S.pose = A.t < 4600 ? 'bow' : 'sit'; }
      A.say(S, 'Hop on!', 2500, 3300);
      if (A.t >= 2900 && A.t < 4600) { T.x = bx - 2; T.lift += 18 + 12 * Math.sin(Math.min(1, A.p(2900, 3200)) * PI * 0.5); T.dy = -6; T.z = 2; }
      if (A.t >= 4600) { T.x = mix(bx - 2, bx - 46, A.e(4600, 5100)); A.hop(T, 4600, 450, 26); }
      if (A.t > 5100) { T.face = 1; S.face = -1; A.say(T, 'Half for you!', 5300, 6300); A.say(S, 'Thank you!', 6400, 7300); }
      if (A.once(3700)) A.burst(A.cx + 30, A.G - 84, 6, 'crumb', { spread: TAU, speed: 0.04 });
      K.hearts(A, A.cx - 26, A.G - 80, 6500, 7);
    },
    back: function (g, A) { var x = A.cx + 30, y = A.G + 4; rr(g, x - 3, y - 76, 6, 76, 2, '#9B6B45'); rr(g, x - 16, y - 80, 32, 5, 2, '#C9A77A'); },
    front: function (g, A) {
      var x = A.cx + 30, top = A.G - 80, cx, cy;
      function cookie(px, py, half) { g.save(); g.translate(px, py); if (half) { g.beginPath(); g.rect(half < 0 ? -7 : 0, -7, 7, 14); g.clip(); } circ(g, 0, 0, 6, '#D9A35E'); circ(g, -2, -1, 1.1, '#6B4228'); circ(g, 2.4, 1.6, 1.1, '#6B4228'); circ(g, 1, -3, 0.9, '#6B4228'); g.restore(); }
      if (A.t < 3700) { cookie(x, top - 5, 0); return; }
      var m = A.mouth(0);
      if (A.t < 5600) { cookie(m.x + m.face * 3, m.y + 1, 0); return; }
      var m1 = A.mouth(1), p = A.e(5600, 6200); cookie(m.x + 3, m.y + 1, -1); cookie(mix(m.x + 5, m1.x - 3, p), mix(m.y + 1, m1.y + 1, p) - Math.sin(p * PI) * 10, 1);
    } });

  add({ id: 'm-phone', name: 'Tin-can telephone', kind: 'sweet', dur: 8600,
    cap: 'Two cans and a long string. Tidbit has something to say…', punch: [5200, '“You’re my best friend.” “You’re MY best friend!”'],
    at: function (A) { return [A.cx - A.span + 14, A.cx + A.span - 14]; },
    run: function (A, T, S) {
      var l = A.cx - A.span + 14, r = A.cx + A.span - 14;
      T.x = l; S.x = r; T.face = 1; S.face = -1;
      A.say(T, 'Hello?', 700, 1500); if (A.in(1500, 2700)) { S.tilt = 0.35; } A.say(S, 'Hello!', 2800, 3600);
      A.say(T, 'Psst… guess what?', 3700, 4800); if (A.in(4800, 5200)) S.tilt = 0.35;
      A.say(S, 'You’re my best friend too!', 5200, 6400);
      if (A.t > 6400) { A.walk(T, l, A.cx - 30, 6400, 7100); A.walk(S, r, A.cx + 30, 6400, 7300); }
      if (A.t > 7300) { T.face = 1; lean(A, S, T, 7300, 8600); }
      K.hearts(A, A.cx, A.G - 80, 7300, 8);
    },
    front: function (g, A) {
      if (A.t > 6400) return; var a = A.mouth(0), b = A.mouth(1);
      g.strokeStyle = 'rgba(240,230,210,.95)'; g.lineWidth = 1; g.beginPath(); g.moveTo(a.x + 5, a.y); g.quadraticCurveTo((a.x + b.x) / 2, Math.max(a.y, b.y) + 16, b.x - 5, b.y); g.stroke();
      rr(g, a.x, a.y - 4, 7, 8, 1.5, '#C9CEDA'); rr(g, b.x - 7, b.y - 4, 7, 8, 1.5, '#C9CEDA');
      [[1500, 2700], [4000, 5100]].forEach(function (w) { if (!A.in(w[0], w[1])) return; var p = A.p(w[0], w[1]), x = mix(a.x + 5, b.x - 5, p), y = mix(a.y, b.y, p) + 16 * 4 * p * (1 - p) * 0.5 - 6; A.U.heart(g, x, y, 4, '#E4566E'); });
    } });

  add({ id: 'm-thankyou', name: 'A thank-you song', kind: 'sweet', dur: 8000,
    cap: 'Sugarfoot helped find Tidbit’s favorite ball. Tidbit has a song for her', punch: [4200, '“Thank you, thank you, thank youuu!” (Sugarfoot loves it.)'],
    at: function (A) { return [A.cx - 40, A.cx + 40]; },
    run: function (A, T, S) {
      T.x = A.cx - 40 + A.osc(1600, 6); S.x = A.cx + 40; T.face = 1; S.face = -1;
      A.say(T, 'Ahem!', 500, 1200); A.say(T, 'Thank you…', 1400, 2600); A.say(T, '…thank youuu!', 2800, 4100);
      if (A.in(1400, 4200)) { T.pivot = 'hind'; T.rot = -0.12 + A.osc(800, 0.06); T.wag = 3; }
      if (A.tick(380, 1400, 4200)) { var m = A.mouth(0); A.burst(m.x + 6, m.y - 6, 1, 'note', { speed: 0.05 }); }
      if (A.t > 4200) { S.wag = 4; S.tilt = 0.2; A.hop(S, 4300, 360, 16); A.say(S, 'Anytime, pal.', 4600, 5700); }
      if (A.t > 5800) lean(A, S, T, 5800, 8000);
      K.gold(A, A.cx, A.G - 90, 4400, 6);
    },
    back: function (g, A) { A.U.ball(g, A.cx - 4, A.G + 2, 6); } });

  add({ id: 'm-shareblanket', name: 'Sharing the blanket', kind: 'sweet', dur: 8200,
    cap: 'A chilly breeze. Tidbit has the only blanket…', punch: [3600, '…so she scoots over. There’s room for two.'],
    at: function (A) { return [A.cx - 36, A.cx + 58]; },
    run: function (A, T, S) {
      T.x = A.cx - 36; T.face = 1; T.pose = 'lie';
      S.x = A.cx + 58; S.face = -1; if (A.in(800, 3400)) { S.sx *= 1 + 0.03 * Math.sin(A.t / 40); A.say(S, 'Brrr…', 1000, 1900); }
      A.say(T, 'Here!', 2600, 3400);
      if (A.t > 2800) { T.x = mix(A.cx - 36, A.cx - 26, A.e(2800, 3400)); S.x = mix(A.cx + 58, A.cx + 12, A.e(3400, 4400)); if (A.t < 4400) S.pose = 'run'; else S.pose = 'lie'; }
      if (A.t > 4600) { T.blink = S.blink = A.t > 5600; T.wag = S.wag = 2; A.say(S, 'Toasty.', 4700, 5600); }
      K.hearts(A, A.cx - 6, A.G - 60, 5000, 6);
    },
    front: function (g, A) {
      var x0 = A.cx - 62, w = mix(48, 100, A.e(2900, 4600)), y = A.G - 18;
      g.fillStyle = '#B79CEB'; g.beginPath(); g.moveTo(x0, A.G + 4); g.quadraticCurveTo(x0 + 4, y - 6, x0 + w * 0.5, y - 8); g.quadraticCurveTo(x0 + w - 4, y - 6, x0 + w, A.G + 4); g.closePath(); g.fill();
      for (var i = 0; i < 4; i++) circ(g, x0 + w * (0.2 + i * 0.2), y - 2 + Math.abs(i - 1.5) * 2, 2.2, '#F7DC6F');
    } });

  // ======================= little skits =======================
  add({ id: 'm-weather', name: 'The weather report', kind: 'silly', dur: 8400,
    cap: 'And now, the weather, with Tidbit', punch: [3800, 'Today’s forecast: a 100% chance of cuddles.'],
    at: function (A) { return [A.cx - 64, A.cx + 64]; },
    run: function (A, T, S) {
      T.x = A.cx - 64; S.x = A.cx + 64; T.face = 1; S.face = -1;
      K.rear(A, T, 700, 1500, 0.3); K.rear(A, T, 2200, 3000, 0.3); K.rear(A, T, 3600, 4400, 0.3);
      A.say(T, 'Sunny today!', 700, 1700); A.say(T, 'Then… a cloud.', 2100, 3100); A.say(T, '…and cuddles!', 3600, 4600);
      if (A.in(1800, 3600)) S.tilt = 0.25;
      if (A.t > 4400) { S.x = mix(A.cx + 64, A.cx - 30, A.e(4400, 5600)); if (A.t < 5600) { S.pose = 'run'; S.face = -1; } }
      if (A.t > 5600) { T.face = 1; S.face = -1; lean(A, S, T, 5600, 8400); A.say(T, 'Back to you!', 6200, 7300); }
      K.hearts(A, A.cx - 40, A.G - 90, 5700, 7);
    },
    back: function (g, A) {
      var U = A.U, x = A.cx + 4, y = A.G - 96;
      rr(g, x - 38, y - 4, 76, 56, 4, '#5B6FC0'); rr(g, x - 34, y, 68, 48, 3, '#CFE8F7'); line(g, x - 20, y + 52, x - 24, A.G + 4, '#6B7388', 2); line(g, x + 20, y + 52, x + 24, A.G + 4, '#6B7388', 2);
      if (A.t > 700) { circ(g, x - 18, y + 16, 7 * A.back(700, 1000), '#F8D76A'); }
      if (A.t > 2100) U.cloud(g, x - 4, y + 26, 0.5 * A.back(2100, 2400), '#FFFFFF');
      if (A.t > 3600) { U.heart(g, x + 22, y + 14, 7 * A.back(3600, 3900), '#E4566E'); U.text(g, '100%', x + 4, y + 42, 8, '#3C3350', '800'); }
    },
    front: function (g, A) { var m = A.mouth(0), p = A.t < 2100 ? -18 : A.t < 3600 ? -2 : 22; line(g, m.x, m.y, A.cx + 4 + p, A.G - 80 + (A.t > 2100 && A.t < 3600 ? 10 : 0), '#9B6B45', 1.6); } });

  add({ id: 'm-cafe', name: 'Café Sugarfoot', kind: 'silly', dur: 8800,
    cap: 'Welcome to Café Sugarfoot. Tidbit would like to order…', punch: [5000, '“One of everything!” Here it is: one cookie shaped like a heart.'],
    at: function (A) { return [A.cx - 56, A.cx + 34]; },
    run: function (A, T, S) {
      T.x = A.cx - 56; T.face = 1; S.x = A.cx + 34; S.face = -1;
      A.say(T, 'One of everything!', 600, 1900); A.say(S, 'Coming right up.', 2000, 2900);
      if (A.t > 2700) { A.walk(S, A.cx + 34, A.cx + A.span - 8, 2700, 3300); A.walk(S, A.cx + A.span - 8, A.cx + 26, 3500, 4500); if (A.in(3300, 3500)) S.face = 1; if (A.t > 4500) S.face = -1; }
      if (A.t > 4600) K.rear(A, S, 4600, 5200, 0.3);
      A.say(S, 'Everything!', 5100, 6000);
      if (A.t > 5300) { T.wag = 4; A.hop(T, 5300, 340, 18); A.say(T, 'Perfect!', 5800, 6800); }
      if (A.t > 6900) K.laugh(A, T, S, 7000);
      K.hearts(A, A.cx - 14, A.G - 70, 5200, 6);
    },
    front: function (g, A) {
      var U = A.U, tx = A.cx - 14, ty = A.G - 20;
      rr(g, tx - 20, ty, 40, 4, 2, '#FFFFFF'); rr(g, tx - 2, ty + 4, 4, 20, 1, '#C9A77A');
      var on = A.t > 4900, m = A.mouth(1), carry = A.in(3500, 4900), x = carry ? m.x - 8 : tx, y = carry ? m.y - 2 : ty - 1;
      if (A.t < 3400) return;
      ell(g, x, y, 10, 2, '#E0E4EC');
      if (on) U.heart(g, x, y - 5, 5, '#D98F4E');
      var lift = A.e(4900, 5300); g.save(); g.translate(x + lift * 10, y - lift * 14); g.rotate(lift * 0.6); g.fillStyle = '#C9CEDA'; g.beginPath(); g.arc(0, 0, 8, PI, TAU); g.fill(); circ(g, 0, -8, 1.6, '#9AA3B8'); g.restore();
    } });

  add({ id: 'm-slowmo', name: 'Slow-motion race', kind: 'silly', dur: 9000,
    cap: 'On your marks… get set… go! (In slow motion.)', punch: [6400, 'A tie! In slow motion, everybody wins.'],
    at: function (A) { return [A.cx - A.span + 14, A.cx - A.span + 26]; },
    run: function (A, T, S) {
      var a = A.cx - A.span + 14, b = A.cx + A.span - 30;
      T.x = a; S.x = a + 12; T.face = S.face = 1;
      A.say(T, 'Ready?', 300, 1000); A.say(S, 'Set…', 900, 1500);
      if (A.t > 1400) { var p = A.p(1400, 6400); T.x = mix(a, b - 6, p); S.x = mix(a + 12, b + 6, p); if (p < 1) { T.pose = S.pose = 'run'; T.lift += Math.abs(Math.sin(A.t / 700)) * 10; S.lift += Math.abs(Math.sin(A.t / 700 + 1)) * 10; T.tilt = -0.1; } }
      A.say(T, 'Gooooo…', 1600, 3200); A.say(S, 'Fiiiinish…', 3800, 5600);
      if (A.t > 6400) { K.laugh(A, T, S, 6600); A.say(S, 'Tie!', 7600, 8600); }
      if (A.once(6400)) A.burst(b, A.G - 40, 14, 'confetti', { speed: 0.12 });
    },
    back: function (g, A) {
      var b = A.cx + A.span - 30, a = A.cx - A.span + 14, y = A.G + 4;
      rr(g, a - 4, y - 2, 3, 6, 1, '#FFFFFF');
      line(g, b + 22, y, b + 22, y - 40, '#9AA3B8', 2); line(g, b - 22, y, b - 22, y - 40, '#9AA3B8', 2);
      var br = A.t > 6400, sag = br ? A.e(6400, 6900) * 22 : 0;
      g.strokeStyle = '#E4566E'; g.lineWidth = 2; g.beginPath(); if (!br) { g.moveTo(b - 22, y - 30); g.lineTo(b + 22, y - 30); } else { g.moveTo(b - 22, y - 30); g.lineTo(b - 14 + sag * 0.2, y - 30 + sag); g.moveTo(b + 22, y - 30); g.lineTo(b + 14 - sag * 0.2, y - 30 + sag); } g.stroke();
    } });

  add({ id: 'm-freeze', name: 'Freeze dance', kind: 'silly', dur: 8200,
    cap: 'Freeze dance! Dance when the music plays. Freeze when it stops!', punch: [5600, 'Tidbit cannot hold still. Nobody minds one bit.'],
    at: function (A) { return [A.cx - 46, A.cx + 46]; },
    run: function (A, T, S) {
      var on = A.in(400, 2200) || A.in(3400, 5000);
      T.x = A.cx - 46; S.x = A.cx + 46; T.face = 1; S.face = -1;
      if (on) { T.pose = S.pose = 'wiggle'; T.wag = S.wag = 4; T.x += A.osc(500, 6); S.x += A.osc(700, 5); T.lift += Math.abs(A.osc(500, 6)); }
      if (A.in(2200, 3400)) { A.say(T, 'Wobble…', 2400, 3300); T.pivot = 'hind'; T.rot = A.osc(260, 0.08); }
      if (A.in(5000, 5600)) { T.pivot = 'hind'; T.rot = A.osc(200, 0.12); }
      if (A.t >= 5600) { T.pose = 'lie'; K.laugh(A, T, S, 5700); }
      A.say(S, 'Freeze!', 2200, 2900); A.say(S, 'Freeze!', 5000, 5700);
      if (on && A.tick(320)) A.burst(A.cx + A.osc(900, 30), A.G - 80, 1, 'note', { speed: 0.05 });
    },
    back: function (g, A) { var x = A.cx, y = A.G + 4, on = A.in(400, 2200) || A.in(3400, 5000), b = on ? Math.abs(Math.sin(A.t / 120)) * 1.5 : 0; rr(g, x - 12, y - 14 - b, 24, 14, 3, '#E4566E'); circ(g, x - 5, y - 7 - b, 3.6, '#3C3350'); circ(g, x + 5, y - 7 - b, 3.6, '#3C3350'); line(g, x + 8, y - 14 - b, x + 12, y - 22 - b, '#9AA3B8', 1.2); } });

  add({ id: 'm-yawn', name: 'The catchy yawn', kind: 'silly', dur: 7800,
    cap: 'Sugarfoot gives a big, slow yawn. Tidbit is NOT tired. Not at all…', punch: [3800, '…“Yaaawn!” Yawns are catchy. Nap time for two.'],
    run: function (A, T, S) {
      if (A.in(600, 1800)) { S.pivot = 'hind'; S.rot = -0.22 * A.bump(600, 1800); S.blink = true; }
      A.say(S, 'Yaaawn…', 700, 1700); A.say(T, 'I’m not tir…', 2000, 3200);
      if (A.in(3000, 4200)) { T.pivot = 'hind'; T.rot = -0.25 * A.bump(3000, 4200); T.blink = true; }
      A.say(T, 'Yaaawn!', 3200, 4100);
      if (A.t > 4300) { T.pose = S.pose = 'lie'; T.blink = S.blink = true; T.x = mix(A.x0, A.cx - 26, A.e(4300, 5000)); S.x = mix(A.x1, A.cx + 26, A.e(4300, 5000)); T.wag = S.wag = 1; }
    },
    front: function (g, A) { if (A.t < 5000) return; for (var i = 0; i < 3; i++) { var ph = ((A.t - 5000) / 1600 + i / 3) % 1; A.U.text(g, 'z', A.cx + 10 + ph * 18, A.G - 50 - ph * 30, 7 + ph * 5, 'rgba(110,90,168,' + (1 - ph).toFixed(2) + ')', '800'); } } });

  add({ id: 'm-hum', name: 'Humming harmony', kind: 'sweet', dur: 8000,
    cap: 'Sugarfoot hums a low note. Tidbit hums a high one…', punch: [4200, 'Low hum, high hum. Together it sounds like one happy song.'],
    at: function (A) { return [A.cx - 32, A.cx + 32]; },
    run: function (A, T, S) {
      T.x = A.cx - 32 + A.osc(2400, 3); S.x = A.cx + 32 + A.osc(2400, 3); T.face = S.face = 1; T.tilt = S.tilt = -0.25;
      A.say(S, 'Hmm-mmm…', 500, 1700); A.say(T, 'La-la-la!', 1900, 3000);
      if (A.tick(520, 500, 7000)) { var m = A.mouth(1); A.burst(m.x + 4, m.y, 1, 'note', { col: '#6E5AA8', speed: 0.04 }); }
      if (A.tick(340, 1900, 7000)) { var m2 = A.mouth(0); A.burst(m2.x + 4, m2.y - 4, 1, 'note', { col: '#E4566E', speed: 0.06 }); }
      if (A.t > 4800) { S.face = -1; lean(A, S, T, 4800, 8000); }
      K.hearts(A, A.cx, A.G - 90, 4300, 6);
    } });

  add({ id: 'm-lullaby', name: 'Lullaby', kind: 'sweet', time: 'night', dur: 8800,
    cap: 'Tidbit is too wiggly to sleep. Sugarfoot hums a lullaby…', punch: [4600, 'Even busy Tidbit gets sleepy when Sugarfoot hums.'],
    at: function (A) { return [A.cx - 40, A.cx + 36]; },
    run: function (A, T, S) {
      var calm = 1 - A.e(1600, 4400);
      T.x = A.cx - 40 + Math.sin(A.t / 260) * 12 * calm; T.face = Math.cos(A.t / 260) * calm >= 0 ? 1 : -1; if (calm > 0.5) { T.pose = 'run'; T.lift += Math.abs(Math.sin(A.t / 200)) * 8 * calm; }
      S.x = A.cx + 36; S.face = -1; S.pose = A.t > 1200 ? 'lie' : 'sit';
      A.say(T, 'Not sleepy!', 400, 1400); A.say(S, 'Hush-a-bye…', 1600, 2800);
      if (A.tick(650, 1600, 6000)) { var m = A.mouth(1); A.burst(m.x - 4, m.y - 4, 1, 'note', { col: '#B79CEB', speed: 0.03 }); }
      if (A.t > 4400) { T.pose = 'lie'; T.face = 1; T.x = mix(A.cx - 40, A.cx - 8, A.e(4400, 5200)); T.blink = A.t > 5600; S.blink = A.t > 6400; }
      A.say(T, 'Sleepy…', 5000, 5900);
    },
    back: function (g, A) { var x = A.cx + A.span - 30, y = 50; circ(g, x, y, 16, '#FFF3C9'); circ(g, x + 7, y - 4, 14, 'rgba(40,40,80,.55)'); glow(g, x, y, 40, '255,243,201', 0.25); },
    front: function (g, A) { if (A.t < 5600) return; for (var i = 0; i < 3; i++) { var ph = ((A.t - 5600) / 1800 + i / 3) % 1; A.U.text(g, 'z', A.cx + 6 + ph * 16, A.G - 44 - ph * 28, 6 + ph * 5, 'rgba(230,220,255,' + (1 - ph).toFixed(2) + ')', '800'); } } });

  // ======================= just for certain places =======================
  function ripple(g, x, y, age, s) { if (age < 0 || age > 1800) return; var p = age / 1800, r = (3 + p * 14) * (s || 1); g.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - p)).toFixed(2) + ')'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y, r, r * 0.3, 0, 0, TAU); g.stroke(); }

  add({ id: 'm-snowangel', name: 'Snow angels', kind: 'sweet', where: ['snow', 'cabin'], dur: 8600,
    cap: 'Fresh snow! Flop down, then wiggle, wiggle…', punch: [5000, 'Two snow angels, side by side. Pal angels!'],
    at: function (A) { return [A.cx - 34, A.cx + 34]; },
    run: function (A, T, S) {
      T.x = A.cx - 34; S.x = A.cx + 34; T.face = 1; S.face = -1;
      A.say(T, 'Flop!', 500, 1200); A.say(S, 'Flop!', 700, 1400);
      if (A.in(800, 4400)) { T.pose = S.pose = 'lie'; T.sx *= 1 + A.osc(400, 0.08); S.sx *= 1 + A.osc(600, 0.06); T.wag = S.wag = 3; }
      A.say(T, 'Wiggle!', 1800, 2700); A.say(S, 'Wiggle…', 2800, 3700);
      if (A.t >= 4400) { A.walk(T, A.cx - 34, A.cx - 84, 4400, 5000); A.walk(S, A.cx + 34, A.cx + 84, 4500, 5200); }
      if (A.t > 5200) { T.face = 1; S.face = -1; T.tilt = S.tilt = 0.3; A.say(S, 'Pretty!', 5600, 6600); A.say(T, 'Us!', 6000, 6900); }
      if (A.once(800)) A.burst(A.cx, A.G - 6, 12, 'snow', { spread: 2.6 });
      K.hearts(A, A.cx, A.G - 70, 6000, 7);
    },
    back: function (g, A) {
      var a = A.e(900, 4000); if (a <= 0) return;
      [A.cx - 34, A.cx + 34].forEach(function (x, i) {
        var y = A.G + 4, col = 'rgba(160,190,230,' + (0.75 * a).toFixed(2) + ')', fl = A.in(800, 4400) ? A.osc(400 + i * 200, 0.15) : 0;
        g.save(); g.translate(x, y); g.scale(1, 0.55);
        ell(g, -14, -10, 14, 6, col, -0.5 - fl); ell(g, 14, -10, 14, 6, col, 0.5 + fl);
        g.fillStyle = col; g.beginPath(); g.moveTo(-6, -12); g.lineTo(6, -12); g.lineTo(13, 8); g.lineTo(-13, 8); g.closePath(); g.fill();
        circ(g, 0, -20, 6, col); g.restore();
      });
    } });

  add({ id: 'm-puddles', name: 'Puddle hopping', kind: 'silly', where: ['rainy'], time: 'day', dur: 8600,
    cap: 'The rain stopped. Puddles! Splash, splash, splash…', punch: [4000, 'Sugarfoot’s one slow, big STOMP makes the biggest splash of all!'],
    run: function (A, T, S) {
      var px = [A.cx - 62, A.cx, A.cx + 62];
      T.x = px[0]; T.face = 1; S.x = px[2]; S.face = -1;
      A.hop(T, 500, 380, 18);
      if (A.t >= 1300) { T.x = mix(px[0], px[1] - 4, A.e(1300, 1800)); A.hop(T, 1300, 500, 26); }
      if (A.t >= 2300) { T.x = mix(px[1] - 4, px[0], A.e(2300, 2800)); A.hop(T, 2300, 500, 26); T.face = A.t < 2800 ? -1 : 1; }
      A.say(T, 'Splash!', 600, 1300); A.say(T, 'Splash!', 1850, 2400); A.say(S, 'My turn…', 2900, 3600);
      A.hop(S, 3700, 300, 10); A.say(S, 'STOMP!', 4000, 4800);
      if (A.once(880) || A.once(1800) || A.once(2800)) A.burst(T.x, A.G + 2, 8, 'drop', { speed: 0.1, spread: 2 });
      if (A.once(4000)) { A.burst(px[2], A.G + 2, 22, 'drop', { speed: 0.16, spread: 2.4 }); A.shake(2); }
      if (A.t > 4600) K.laugh(A, T, S, 4800);
      if (A.t >= 5800) { T.x = mix(px[0], px[1] - 20, A.e(5800, 6400)); S.x = mix(px[2], px[1] + 20, A.e(5800, 6600)); if (A.t < 6400) T.pose = 'run'; if (A.t < 6600) S.pose = 'run'; if (A.t > 6600) { T.face = 1; S.face = -1; } }
      A.hop(T, 6900, 420, 22); A.hop(S, 6900, 460, 20); A.say(T, 'Together!', 6700, 7600);
      if (A.once(7340)) A.burst(px[1], A.G + 2, 16, 'drop', { speed: 0.14, spread: 2.4 });
    },
    back: function (g, A) { [A.cx - 62, A.cx, A.cx + 62].forEach(function (x, k) { var w = A.t > 4000 && k === 2 ? 1 + 0.2 * A.bump(4000, 4800) : 1; ell(g, x, A.G + 3, 26 * w, 5 * w, '#8CC8EA'); ell(g, x - 5, A.G + 2, 12, 1.4, 'rgba(255,255,255,.55)'); }); } });

  add({ id: 'm-stones', name: 'Skipping stones', kind: 'silly', where: ['dock', 'lighthouse', 'beach', 'bonfire'], dur: 8400,
    cap: 'Skipping stones! Tidbit shows Sugarfoot how it’s done', punch: [4300, 'Three skips for Tidbit. The biggest splash ever for Sugarfoot. Both win!'],
    at: function (A) { return [A.cx - 52, A.cx - 12]; },
    run: function (A, T, S) {
      T.x = A.cx - 52; S.x = A.cx - 12; T.face = S.face = 1; T.tilt = S.tilt = -0.2;
      K.rear(A, T, 600, 1100, 0.4); K.rear(A, S, 3000, 3500, 0.4);
      A.say(T, 'Skip, skip, skip!', 1500, 2700); A.say(S, 'My turn…', 2600, 3300); A.say(S, 'Plop!', 3900, 4600);
      if (A.once(3900)) A.burst(A.cx + 30, A.G - 40, 18, 'drop', { speed: 0.14, spread: 1.2 });
      if (A.t > 4500) { K.laugh(A, T, S, 4600); A.say(T, 'Biggest splash!', 5600, 6700); }
      if (A.t > 6800) lean(A, S, T, 6800, 8400);
    },
    back: function (g, A) {
      var pts = [[A.cx - 28, A.G - 46], [A.cx + 26, A.G - 42], [A.cx + 64, A.G - 48], [A.cx + 92, A.G - 53], [A.cx + 112, A.G - 56]], sk = [1100, 1500, 1900, 2300, 2650];
      for (var k = 0; k < 4; k++) { var p = A.p(sk[k], sk[k + 1]); if (p > 0 && p < 1) { var a = pts[k], b = pts[k + 1], h = 18 / (k + 1); ell(g, mix(a[0], b[0], p), mix(a[1], b[1], p) - h * 4 * p * (1 - p), 2.6 - k * 0.4, 1.6 - k * 0.2, '#6B7388'); } }
      for (var j = 1; j < 4; j++) ripple(g, pts[j][0], pts[j][1], A.t - sk[j], 1 - j * 0.15);
      var q = A.p(3500, 3900); if (q > 0 && q < 1) circ(g, mix(A.cx + 10, A.cx + 30, q), mix(A.G - 52, A.G - 40, q) - 30 * 4 * q * (1 - q), 3.6, '#6B7388');
      ripple(g, A.cx + 30, A.G - 40, A.t - 3900, 2); ripple(g, A.cx + 30, A.G - 40, A.t - 4200, 1.6);
    } });

  add({ id: 'm-wavehop', name: 'Wave hopping', kind: 'silly', where: ['beach', 'bonfire'], time: 'day', dur: 8400,
    cap: 'Little waves roll in. Hop! Hop! Hop!', punch: [5600, 'A big one! Two splashy pals, shaking off and giggling.'],
    at: function (A) { return [A.cx - 40, A.cx + 40]; },
    run: function (A, T, S) {
      T.x = A.cx - 40; S.x = A.cx + 40; T.face = 1; S.face = -1;
      [1400, 3000, 4600].forEach(function (t0) { A.hop(T, t0 - 100, 420, 28); A.hop(S, t0, 480, 20); });
      A.say(T, 'Hop!', 1400, 2000); A.say(S, 'Hop!', 3100, 3700); A.say(T, 'Big one!', 5000, 5800);
      if (A.once(5900)) A.burst(A.cx, A.G - 20, 20, 'drop', { spread: 2.8, speed: 0.15 });
      if (A.in(6100, 7000)) { T.sx *= 1 + 0.08 * Math.sin(A.t / 30); S.sx *= 1 + 0.08 * Math.sin(A.t / 30 + 1); A.say(S, 'Splashy!', 6200, 7100); }
      if (A.t > 7000) K.laugh(A, T, S, 7100);
    },
    front: function (g, A) {
      var y0 = A.G - 24, x0 = A.cx - A.span - 60, x1 = A.cx + A.span + 60;
      [[1400, 24], [3000, 24], [4600, 24], [5900, 40]].forEach(function (w) {
        var p = A.p(w[0] - 900, w[0] + 1100); if (p <= 0 || p >= 1) return; var d = w[1] * Math.sin(p * PI), x;
        g.fillStyle = 'rgba(150,210,238,.72)'; g.beginPath(); g.moveTo(x0, y0); for (x = x0; x <= x1; x += 10) g.lineTo(x, y0 + d + Math.sin(x / 16 + A.t / 200) * 2.5); g.lineTo(x1, y0); g.closePath(); g.fill();
        for (x = x0; x <= x1; x += 14) circ(g, x, y0 + d + Math.sin(x / 16 + A.t / 200) * 2.5, 2.6, 'rgba(255,255,255,.85)');
      });
    } });

  add({ id: 'm-kites', name: 'Two kites', kind: 'cool', where: OUT, time: 'day', dur: 8600,
    cap: 'Two kites on a breezy day. Up, up, up…', punch: [4600, 'The kites loop around each other, like they’re dancing too.'],
    at: function (A) { return [A.cx - 40, A.cx + 40]; },
    run: function (A, T, S) {
      T.x = A.cx - 40 + A.osc(3000, 6); S.x = A.cx + 40 + A.osc(3000, 6, 1); T.face = S.face = 1; T.tilt = S.tilt = -0.45;
      A.say(T, 'Up!', 600, 1400); A.say(S, 'Higher!', 1600, 2400); A.say(T, 'Ooh!', 4700, 5500); A.say(S, 'They’re dancing!', 5600, 6700);
      if (A.t > 6400) T.wag = S.wag = 3.5;
      K.hearts(A, A.cx + 20, A.G - 150, 6400, 6);
    },
    front: function (g, A) {
      var r = A.e(300, 2600), ky = mix(A.G - 70, 70, r), c = { x: A.cx + 20, y: ky + 10 }, j = (1 - A.e(3800, 4200)) + A.e(6400, 6800), lp = A.in(4200, 6400) ? A.e(4200, 6400) * TAU : 0;
      var ks = [{ x: c.x + Math.cos(PI + lp) * 40 + A.osc(2000, 8) * j, y: c.y + Math.sin(PI + lp) * 22 + A.osc(1500, 5) * j, col: '#E4566E' }, { x: c.x + Math.cos(lp) * 40 + A.osc(2300, 8, 1) * j, y: c.y + Math.sin(lp) * 22 + A.osc(1700, 5, 2) * j, col: '#7FB8F0' }];
      ks.forEach(function (k, i) {
        var m = A.mouth(i); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(m.x, m.y); g.quadraticCurveTo(mix(m.x, k.x, 0.6), mix(m.y, k.y, 0.3), k.x, k.y + 14); g.stroke();
        for (var b = 0; b < 4; b++) { var tx = k.x + Math.sin(A.t / 200 + b + i) * 4 - b * 3, ty = k.y + 18 + b * 7; ell(g, tx, ty, 2.6, 1.3, i ? '#F7DC6F' : '#B79CEB'); }
        kite(g, k.x, k.y, 1.1, k.col, Math.sin(A.t / 500 + i) * 0.2);
      });
    } });

  // quiet things to watch together at night
  add(K.watch({ id: 'm-constellation', name: 'Connect the stars', where: OUT.concat(['bonfire', 'lighthouse', 'cabin', 'snow']), time: 'night', lie: true, tilt: -0.35,
    cap: 'Lying on their backs (well, almost), connecting the stars with their noses…', punch: 'Dot to dot to dot… the stars make a heart!',
    says: [[1200, 'T', 'That one!'], [2400, 'S', 'And that one…'], [4500, 'T', 'A heart!', true], [5400, 'S', 'For us.']], gold: true,
    show: function (g, A) {
      var U = A.U, n = 10, pts = [], i, sc = 3.2, cx = A.cx, cy = 70;
      for (i = 0; i < n; i++) { var th = i / n * TAU; pts.push([cx + 16 * Math.pow(Math.sin(th), 3) * sc, cy - (13 * Math.cos(th) - 5 * Math.cos(2 * th) - 2 * Math.cos(3 * th) - Math.cos(4 * th)) * sc]); }
      var p = A.e(1000, 4400) * n;
      g.strokeStyle = 'rgba(255,240,190,.7)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (i = 1; i <= n && i <= p + 1; i++) { var a = pts[i - 1], b = pts[i % n], f = clamp(p - (i - 1), 0, 1); g.lineTo(mix(a[0], b[0], f), mix(a[1], b[1], f)); }
      g.stroke();
      for (i = 0; i < n; i++) { var tw = 0.6 + 0.4 * Math.sin(A.t / 300 + i * 2); U.star(g, pts[i][0], pts[i][1], 2.6 + tw, 'rgba(255,245,200,' + (0.6 + 0.4 * tw).toFixed(2) + ')'); }
      if (A.t > 4400) glow(g, cx, cy - 4, 70, '255,230,180', (0.25 * A.e(4400, 5000)).toFixed(2));
    } }));

  add(K.watch({ id: 'm-owl', name: 'Owl hello', where: ['forest', 'campsite', 'treehouse', 'orchard'], time: 'night', face: 1, dx: -16,
    cap: 'Somebody up in the branches says “Hoo?”', punch: 'An owl! She hoots back three times. A new night friend.',
    says: [[1500, 'T', 'Who?'], [2600, 'S', 'Hoo!'], [3500, 'T', 'Hoo-hoo!', true], [5400, 'S', 'Night, owl!']],
    show: function (g, A) {
      var U = A.U, x = A.cx + 60, y = A.G - 140, bl = Math.sin(A.t / 1300) > 0.94;
      line(g, A.cx + A.span + 40, y + 16, A.cx + 20, y + 22, '#6B4A3A', 5); ell(g, A.cx + 34, y + 16, 7, 3, '#4F7F62');
      ell(g, x, y, 12, 15, '#9B7B5E'); ell(g, x, y + 4, 8, 10, '#D9C3A0');
      circ(g, x - 5, y - 6, 4.4, '#FFF3C9'); circ(g, x + 5, y - 6, 4.4, '#FFF3C9');
      if (!bl) { circ(g, x - 5, y - 6, 2, '#2C2638'); circ(g, x + 5, y - 6, 2, '#2C2638'); } else { line(g, x - 8, y - 6, x - 2, y - 6, '#2C2638', 1.2); line(g, x + 2, y - 6, x + 8, y - 6, '#2C2638', 1.2); }
      g.fillStyle = '#F6A04D'; g.beginPath(); g.moveTo(x - 2, y - 2); g.lineTo(x + 2, y - 2); g.lineTo(x, y + 2); g.fill();
      g.fillStyle = '#9B7B5E'; g.beginPath(); g.moveTo(x - 10, y - 10); g.lineTo(x - 8, y - 18); g.lineTo(x - 4, y - 12); g.fill(); g.beginPath(); g.moveTo(x + 10, y - 10); g.lineTo(x + 8, y - 18); g.lineTo(x + 4, y - 12); g.fill();
      [800, 4400, 4900, 5400].forEach(function (t0) { if (A.in(t0, t0 + 700)) U.text(g, 'hoo', x - 24, y - 22 - A.p(t0, t0 + 700) * 10, 7, 'rgba(255,245,220,' + (1 - A.p(t0, t0 + 700)).toFixed(2) + ')', '800'); });
    } }));

  add(K.watch({ id: 'm-frogs', name: 'Frog chorus', where: ['pond'], time: 'night', kind: 'silly',
    cap: 'Down by the pond, the frogs start their evening song', punch: 'Ribbit, ribbit, WOOF. The frogs don’t mind one bit.',
    says: [[1600, 'T', 'Ribbit?'], [2800, 'S', 'Ribbit…'], [4400, 'T', 'Woof!', true], [5600, 'S', 'Hee!']],
    show: function (g, A) {
      var base = A.cx - A.span;
      [[0.18, 0], [0.32, 1], [0.46, 2]].forEach(function (f) {
        var x = base + (A.span * 2) * f[0] - 20, y = A.G - 26, k = f[1], cr = Math.max(0, Math.sin(A.t / 260 + k * 2.1));
        ell(g, x, y + 2, 14, 3.4, '#5E9E5A'); ell(g, x, y - 3, 7, 5, '#7FBE72'); circ(g, x - 3, y - 8, 2.4, '#7FBE72'); circ(g, x + 3, y - 8, 2.4, '#7FBE72'); circ(g, x - 3, y - 8, 1, '#2C2638'); circ(g, x + 3, y - 8, 1, '#2C2638');
        if (cr > 0.6) circ(g, x, y - 1, 3 * cr, 'rgba(240,240,200,.8)');
      });
    } }));

  add(K.watch({ id: 'm-moonpath', name: 'The moon’s path', where: ['beach', 'bonfire', 'dock', 'lighthouse'], time: 'night',
    cap: 'The moon rises over the water, quiet and bright', punch: 'A silver path across the water, all the way to the moon.',
    says: [[1600, 'S', 'Ooh…'], [3000, 'T', 'A path!'], [5400, 'S', 'Pretty.']],
    show: function (g, A) {
      var mx = A.cx + A.span * 0.62, my = mix(A.G - 70, 60, A.e(0, 3200)); glow(g, mx, my, 60, '255,245,210', 0.3); circ(g, mx, my, 16, '#FFF6D8');
      var a = A.e(1500, 3500); if (a <= 0) return;
      for (var k = 0; k < 7; k++) { var y = A.G - 56 + k * 4, w = 6 + k * 3 + Math.sin(A.t / 300 + k) * 3; rr(g, mx - w / 2 + Math.sin(A.t / 500 + k * 1.3) * 3, y, w, 1.6, 1, 'rgba(255,248,220,' + (0.75 * a).toFixed(2) + ')'); }
    } }));

  // ======================= making things together =======================
  function steam(g, x, y, n, k) { for (var i = 0; i < n; i++) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - (n - 1) * 4 + i * 8, y); g.quadraticCurveTo(x - (n - 1) * 4 + i * 8 + 3, y - 6, x - (n - 1) * 4 + i * 8, y - 14 * k); g.stroke(); } }
  function flower(g, U, x, y, r, col) { for (var i = 0; i < 5; i++) circ(g, x + Math.cos(i * TAU / 5) * r, y + Math.sin(i * TAU / 5) * r, r * 0.8, col); circ(g, x, y, r * 0.7, '#F8D76A'); }

  add(K.make({ id: 'm-soup', name: 'Pretend soup', where: GRASS, kind: 'silly', cap: 'Pretend kitchen! Today’s special: leaf and acorn soup', punch: 'Leaf and acorn soup. Delicious (pretend)!', say1: 'A leaf!', say2: 'An acorn!', last: 'Yum (pretend)!', particle: 'leaf',
    draw: function (g, U, A, p, done) {
      var x = A.cx, y = A.G + 4, n = Math.floor(p * 6);
      rr(g, x - 20, y - 22, 40, 22, 6, '#8E8A9A'); rr(g, x - 24, y - 24, 48, 5, 2, '#A3A0AE');
      for (var i = 0; i < n; i++) { var ix = x - 14 + (i * 7) % 28, iy = y - 25 - (i % 2) * 2; if (i % 2) circ(g, ix, iy, 2.6, '#9B6B45'); else ell(g, ix, iy, 4, 2, ['#8FC46B', '#E8913F', '#D8643F'][i % 3], 0.4); }
      var a = A.t / 300; line(g, x, y - 24, x + Math.cos(a) * 8, y - 40 + Math.sin(a) * 2, '#C9A77A', 2);
      if (done > 0) steam(g, x, y - 30, 3, done);
    } }));

  add(K.make({ id: 'm-watering', name: 'Watering the seedlings', where: ['backyard', 'gardenparty', 'farm', 'rooftop', 'meadow'], cap: 'Four little seedlings, one watering can, two careful gardeners', punch: 'Little sprouts, then big blooms. Gardening is a team job.', say1: 'Water!', say2: 'Gently…', last: 'Flowers!', particle: 'drop',
    draw: function (g, U, A, p, done) {
      var y = A.G + 4;
      for (var i = 0; i < 4; i++) { var x = A.cx - 27 + i * 18, h = 4 + p * 10 + done * 8; ell(g, x, y, 7, 2.4, '#8A6B45'); line(g, x, y - 2, x, y - h, '#6FA15A', 1.4); ell(g, x + 3, y - h * 0.6, 3, 1.4, '#8FC46B', -0.5); if (done > 0) flower(g, U, x, y - h, 2.4 * done, ['#F7A8C2', '#F7DC6F', '#B79CEB', '#F27D7D'][i]); }
      if (!done) { var cx2 = A.cx - 20 + Math.sin(A.t / 700) * 22, cy = A.G - 40; rr(g, cx2 - 8, cy - 6, 16, 12, 3, '#7FB8F0'); line(g, cx2 + 8, cy - 2, cx2 + 16, cy - 8, '#7FB8F0', 2.4); for (var k = 0; k < 3; k++) circ(g, cx2 + 16 + k, cy - 4 + ((A.t / 6 + k * 9) % 26), 1, '#8CCBF0'); }
    } }));

  add(K.make({ id: 'm-puzzle', name: 'The heart puzzle', kind: 'cool', cap: 'A brand-new puzzle. Edges first, then the middle…', punch: 'The last piece clicks in: a big heart right in the middle.', say1: 'Edge!', say2: 'Corner!', last: 'Click!',
    draw: function (g, U, A, p, done) {
      var x = A.cx - 21, y = A.G - 34, n = Math.floor(p * 8.99), ord = [0, 2, 6, 8, 1, 3, 5, 7];
      rr(g, x - 3, y - 3, 48, 40, 3, 'rgba(60,51,80,.15)');
      for (var i = 0; i < n && i < 8; i++) { var c = ord[i] % 3, r = Math.floor(ord[i] / 3); rr(g, x + c * 14, y + r * 11.4, 13, 10.4, 2, ['#CFE8F7', '#BFE3C7', '#FFF3C9'][(c + r) % 3]); }
      if (done > 0) { rr(g, x + 14, y + 11.4, 13, 10.4, 2, '#F7C9D4'); U.heart(g, x + 20.5, y + 17, 9 * done, '#E4566E'); }
    } }));

  add(K.make({ id: 'm-glasses', name: 'Water-glass music', kind: 'cool', cap: 'Five glasses, a little water in each, and a spoon. Ting!', punch: 'Ting, tang, tong! They play a little song for each other.', say1: 'Ting!', say2: 'Tong!', last: 'Encore!', particle: 'note',
    draw: function (g, U, A, p, done) {
      var y = A.G + 2;
      for (var i = 0; i < 5; i++) { var x = A.cx - 30 + i * 15, h = 8 + i * 3; rr(g, x - 5, y - 20, 10, 20, 2, 'rgba(220,235,250,.55)'); rr(g, x - 4, y - 1 - h * Math.min(1, p * 1.5), 8, h * Math.min(1, p * 1.5), 1, ['rgba(242,125,125,.7)', 'rgba(246,178,107,.7)', 'rgba(247,220,111,.7)', 'rgba(143,214,148,.7)', 'rgba(127,184,240,.7)'][i]); }
      var k = Math.floor(A.t / 300) % 5, sx = A.cx - 30 + k * 15; line(g, sx + 6, A.G - 32, sx + 2, A.G - 20, '#C9CEDA', 1.8);
    } }));

  add(K.make({ id: 'm-leafrub', name: 'Leaf rubbings', where: ['forest', 'orchard', 'pumpkins', 'studio'], cap: 'Paper, crayons and a pile of leaves. Rub, rub, rub…', punch: 'Every leaf has its own pattern. A whole leafy gallery.', say1: 'Rub!', say2: 'Ooh, veins!', last: 'Art!', particle: 'leaf',
    draw: function (g, U, A, p, done) {
      var x = A.cx, y = A.G - 30; rr(g, x - 30, y - 16, 60, 34, 2, '#FFFDF6');
      for (var i = 0; i < 3; i++) { var a = clamp(p * 3 - i, 0, 1); if (a <= 0) continue; var lx = x - 18 + i * 18; g.save(); g.globalAlpha *= a; ell(g, lx, y, 7, 11, ['#E8913F', '#8FC46B', '#D8643F'][i], 0.3); line(g, lx - 2, y + 9, lx + 2, y - 9, 'rgba(255,255,255,.7)', 0.8); for (var k = -1; k <= 1; k++) line(g, lx, y + k * 4, lx + 4, y + k * 4 - 3, 'rgba(255,255,255,.6)', 0.6); g.restore(); }
      if (done > 0) { g.strokeStyle = '#C9A77A'; g.lineWidth = 2.4 * done; g.strokeRect(x - 31, y - 17, 62, 36); }
    } }));

  add(K.make({ id: 'm-mudpies', name: 'Mud pie bakery', where: ['backyard', 'farm', 'meadow'], kind: 'silly', cap: 'The Mud Pie Bakery is open! Pat, pat, pat…', punch: 'Three mud pies with daisies on top. Just for admiring, not for eating.', say1: 'Pat!', say2: 'Pat, pat!', last: 'Fancy!', particle: 'dirt',
    draw: function (g, U, A, p, done) {
      var y = A.G + 3;
      for (var i = 0; i < 3; i++) { if (p * 3 < i + 0.2) continue; var x = A.cx - 22 + i * 22, s = clamp(p * 3 - i, 0, 1); ell(g, x, y - 3 * s, 9 * s, 4 * s, '#7A5638'); ell(g, x, y - 5 * s, 7 * s, 2.4 * s, '#8E6845'); if (done > 0) flower(g, U, x, y - 8, 2 * done, '#FFFFFF'); }
    } }));

  add(K.make({ id: 'm-shells', name: 'Shell sorting', where: ['beach', 'bonfire', 'lighthouse'], cap: 'A bucket of shells to sort: big, medium, small, tiny', punch: 'A shell for every size of friend. They line them up just so.', say1: 'Big one!', say2: 'Tiny one!', last: 'Just so!',
    draw: function (g, U, A, p, done) {
      var y = A.G + 3, n = Math.floor(p * 5.99), cols = ['#F7C9D4', '#FFE8C9', '#F7DCC0', '#E8D6F7', '#FFFFFF'];
      rr(g, A.cx + 34, y - 14, 14, 14, 3, '#7FB8F0');
      for (var i = 0; i < n; i++) { var s = 1.3 - i * 0.2, x = A.cx - 32 + i * 14; g.save(); g.translate(x, y - 2); g.scale(s, s); g.fillStyle = cols[i]; g.beginPath(); g.moveTo(-6, 2); for (var j = 0; j <= 8; j++) { var a = PI + j / 8 * PI; g.lineTo(Math.cos(a) * 6, 2 + Math.sin(a) * 7); } g.closePath(); g.fill(); for (var k = 1; k < 4; k++) line(g, 0, 2, -6 + k * 3, -3, 'rgba(200,120,140,.5)', 0.7); g.restore(); }
      if (done > 0) U.star(g, A.cx - 32, y - 18, 3 * done, '#FFF3B0', A.t / 400);
    } }));

  add(K.make({ id: 'm-bouquet', name: 'Wildflower bouquets', where: ['meadow', 'gardenparty', 'backyard', 'citypark'], cap: 'Picking wildflowers, one for each color of the rainbow', punch: 'Two bouquets. They trade, so each one gets the other’s.', say1: 'Pink!', say2: 'Yellow!', last: 'For you!',
    draw: function (g, U, A, p, done) {
      [A.cx - 16, A.cx + 16].forEach(function (x, b) {
        var y = A.G - 6, sw = done > 0 ? (b ? -1 : 1) * A.e(4900, 5600) * 10 : 0, n = Math.floor(p * 4.99);
        for (var i = 0; i < n; i++) { var a = -0.5 + i * 0.25, tx = x + sw + Math.sin(a) * 14, ty = y - 18 - Math.cos(a) * 6; line(g, x + sw, y, tx, ty, '#6FA15A', 1.2); flower(g, U, tx, ty, 2, ['#F7A8C2', '#F7DC6F', '#B79CEB', '#F27D7D', '#7FB8F0'][(i + b) % 5]); }
        if (n) { g.fillStyle = b ? '#7FB8F0' : '#F28AA8'; g.beginPath(); g.moveTo(x + sw - 4, y - 4); g.lineTo(x + sw + 4, y - 4); g.lineTo(x + sw + 2, y + 2); g.lineTo(x + sw - 2, y + 2); g.fill(); }
      });
    } }));

  add(K.make({ id: 'm-pumpkinpaint', name: 'Painting pumpkins', where: ['pumpkins', 'orchard', 'farm'], kind: 'silly', cap: 'Two round pumpkins and a pot of paint. Happy faces, coming up', punch: 'Two smiling pumpkins. One looks a lot like Tidbit.', say1: 'Eyes!', say2: 'A smile!', last: 'Ha, it’s you!',
    draw: function (g, U, A, p, done) {
      [A.cx - 16, A.cx + 16].forEach(function (x, i) {
        var y = A.G - 8; ell(g, x, y, 12, 10, '#F6A04D'); ell(g, x - 5, y, 4, 9, 'rgba(200,110,40,.35)'); ell(g, x + 5, y, 4, 9, 'rgba(200,110,40,.35)'); rr(g, x - 1.5, y - 14, 3, 5, 1, '#6FA15A');
        if (p > 0.3 + i * 0.15) { circ(g, x - 4, y - 3, 1.6, '#3C3350'); circ(g, x + 4, y - 3, 1.6, '#3C3350'); }
        if (p > 0.6 + i * 0.15) { g.strokeStyle = '#3C3350'; g.lineWidth = 1.4; g.beginPath(); g.arc(x, y + 1, 4, 0.3, PI - 0.3); g.stroke(); }
        if (!i && done > 0) { g.fillStyle = 'rgba(30,25,30,.85)'; g.beginPath(); g.ellipse(x, y - 3, 8 * done, 2.6, 0, 0, TAU); g.fill(); circ(g, x - 4, y - 3, 1, '#FFFFFF'); circ(g, x + 4, y - 3, 1, '#FFFFFF'); }
      });
    } }));

  add(K.make({ id: 'm-scarf', name: 'A scarf for two', where: ['cabinin', 'cabin', 'rainy'], cap: 'Knit, knit, knit. The scarf is getting very, very long…', punch: 'One very long scarf. Just right for two pals.', say1: 'Knit!', say2: 'Purl!', last: 'Cozy!',
    draw: function (g, U, A, p, done) {
      var y = A.G - 14, w = 8 + p * 60, x = A.cx - w / 2;
      for (var i = 0; i * 6 < w; i++) rr(g, x + i * 6, y - 4, Math.min(6, w - i * 6), 8, 1, ['#E4566E', '#FFF3C9', '#7FB8F0'][i % 3]);
      for (var k = 0; k < 3; k++) { line(g, x, y - 3 + k * 3, x - 4, y - 2 + k * 3, '#E4566E', 1); line(g, x + w, y - 3 + k * 3, x + w + 4, y - 2 + k * 3, '#7FB8F0', 1); }
      if (!done) { line(g, A.cx - 6, y - 14, A.cx + 2, y - 4, '#C9A77A', 1.6); line(g, A.cx + 6, y - 14, A.cx - 2, y - 4, '#C9A77A', 1.6); circ(g, A.cx, y - 18, 4, '#B79CEB'); }
      else U.heart(g, A.cx, y - 16, 5 * done, '#E4566E');
    } }));

  add(K.make({ id: 'm-cinnamon', name: 'Cinnamon swirls', where: ['bakery', 'cabinin'], cap: 'Roll the dough, sprinkle the cinnamon, roll it up, swirl!', punch: 'Warm cinnamon swirls. The whole place smells like a hug.', say1: 'Roll!', say2: 'Sprinkle!', last: 'Swirly!', particle: 'crumb',
    draw: function (g, U, A, p, done) {
      var y = A.G - 4; rr(g, A.cx - 30, y - 2, 60, 6, 2, '#C9A77A');
      [A.cx - 14, A.cx + 14].forEach(function (x, i) { var r = 3 + p * 6; circ(g, x, y - r, r, '#E8C48E'); g.strokeStyle = '#9B5E35'; g.lineWidth = 1.2; g.beginPath(); for (var a = 0; a < p * 4 * PI; a += 0.3) { var rr2 = a / (4 * PI) * r * 0.9; g.lineTo(x + Math.cos(a + i) * rr2, y - r + Math.sin(a + i) * rr2); } g.stroke(); });
      if (done > 0) steam(g, A.cx, y - 20, 2, done);
    } }));

  add(K.make({ id: 'm-partyhats', name: 'Party hats', where: ['gardenparty', 'carnival', 'festival', 'backyard'], kind: 'silly', cap: 'Paper, glue and glitter. Party hats for everyone!', punch: 'Party hats for everyone, even the snail.', say1: 'Glitter!', say2: 'Glue!', last: 'Party!', particle: 'confetti',
    draw: function (g, U, A, p, done) {
      [[A.cx - 18, 1, '#F7A8C2'], [A.cx + 18, 1, '#7FB8F0'], [A.cx, 0.55, '#F7DC6F']].forEach(function (h, i) {
        if (p < i * 0.3) return; var x = h[0], s = h[1], y = A.G + 2 - (i === 2 ? 0 : 0);
        g.fillStyle = h[2]; g.beginPath(); g.moveTo(x - 8 * s, y); g.lineTo(x + 8 * s, y); g.lineTo(x, y - 20 * s); g.closePath(); g.fill();
        for (var k = 1; k < 3; k++) circ(g, x + (k % 2 ? -2 : 2) * s, y - k * 6 * s, 1.2 * s, '#FFFFFF');
        if (p > i * 0.3 + 0.2) circ(g, x, y - 20 * s - 2 * s, 3 * s, '#E4566E');
      });
      if (done > 0) { var x = A.cx + 40, y = A.G + 2; ell(g, x + 2, y - 3, 8, 3, '#C7D98A'); circ(g, x, y - 7, 5, '#E7B98A'); g.fillStyle = '#B79CEB'; g.beginPath(); g.moveTo(x - 4, y - 11); g.lineTo(x + 4, y - 11); g.lineTo(x, y - 11 - 10 * done); g.fill(); }
    } }));

  add(K.make({ id: 'm-minilight', name: 'A tiny lighthouse', where: ['lighthouse'], kind: 'cool', cap: 'Building a little lighthouse of their own, stripe by stripe', punch: 'The tiny lamp comes on. Now there are two lighthouses keeping watch.', say1: 'Red!', say2: 'White!', last: 'Shine!',
    draw: function (g, U, A, p, done) {
      var x = A.cx, y = A.G + 2, h = 10 + p * 34;
      g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(x - 9, y); g.lineTo(x - 6, y - h); g.lineTo(x + 6, y - h); g.lineTo(x + 9, y); g.closePath(); g.fill();
      for (var s = 0; s * 12 < h - 6; s += 2) rr(g, x - 8 + s * 0.4, y - 6 - s * 6 - 6, 16 - s * 0.8, 6, 0, '#E4566E');
      if (p > 0.95) { rr(g, x - 6, y - h - 8, 12, 8, 2, '#FFF3C9'); rr(g, x - 7, y - h - 11, 14, 3, 1, '#3C3350'); if (done > 0) glow(g, x, y - h - 4, 30 * done + 4, '255,240,180', 0.6); }
    } }));

  add(K.make({ id: 'm-collage', name: 'Collage time', where: ['studio', 'library', 'rainy'], cap: 'Scissors (safe ones), glue and scraps of paper. Collage time!', punch: 'A collage of the two of them, holding paws. Frame-worthy.', say1: 'Snip!', say2: 'Stick!', last: 'Frame it!', particle: 'confetti',
    draw: function (g, U, A, p, done) {
      var x = A.cx, y = A.G - 32; rr(g, x - 28, y - 18, 56, 38, 2, '#FFFDF6');
      if (p > 0.15) circ(g, x - 14, y - 2, 7, '#F7DC6F');
      if (p > 0.35) rr(g, x - 4, y - 12, 16, 10, 2, '#8FD694');
      if (p > 0.55) U.star(g, x + 16, y + 8, 5, '#7FB8F0');
      if (p > 0.75) U.heart(g, x, y + 8, 5, '#E4566E');
      if (p > 0.9) { A.pup(g, 'drop', x - 12, y + 16, 0.16, 1, 'sit', 0); A.pup(g, 'collar', x + 6, y + 16, 0.16, -1, 'sit', 0); }
      if (done > 0) { g.strokeStyle = '#E3AE2F'; g.lineWidth = 3 * done; g.strokeRect(x - 29, y - 19, 58, 40); }
    } }));

  add(K.make({ id: 'm-doghouse', name: 'Doghouse makeover', where: ['backyard', 'farm'], cap: 'The old doghouse needs a fresh coat of paint. Brushes ready!', punch: 'Sky blue with a big heart on the door. The coziest house on the block.', say1: 'Paint!', say2: 'Drip…', last: 'Home!', particle: 'confetti',
    draw: function (g, U, A, p, done) {
      var x = A.cx, y = A.G + 4;
      g.fillStyle = '#C9A77A'; g.fillRect(x - 22, y - 30, 44, 30); g.save(); g.beginPath(); g.rect(x - 22, y - 30, 44 * p, 30); g.clip(); g.fillStyle = '#9FD3F2'; g.fillRect(x - 22, y - 30, 44, 30); g.restore();
      g.fillStyle = '#C9674E'; g.beginPath(); g.moveTo(x - 28, y - 28); g.lineTo(x, y - 46); g.lineTo(x + 28, y - 28); g.closePath(); g.fill();
      g.fillStyle = '#4A3B4F'; g.beginPath(); g.arc(x, y - 10, 8, PI, TAU); g.rect(x - 8, y - 10, 16, 10); g.fill();
      if (done > 0) U.heart(g, x, y - 36, 5 * done, '#F7DC6F');
    } }));

  add(K.make({ id: 'm-glowwands', name: 'Glow wands', where: ['festival', 'carnival', 'bonfire'], time: 'night', kind: 'cool', cap: 'Glow wands at night: swish, swoosh, swirl!', punch: 'Swish, swoosh… together they draw a glowing heart in the air.', say1: 'Swish!', say2: 'Swoosh!', last: 'Glowy!', particle: 'spark',
    draw: function (g, U, A, p, done) {
      var cx = A.cx, cy = A.G - 70;
      if (!done) { for (var i = 0; i < 12; i++) { var a = A.t / 300 - i * 0.18; circ(g, cx - 24 + Math.cos(a) * 16, cy + Math.sin(a * 1.3) * 12, 2.4 - i * 0.15, 'rgba(127,224,247,' + (0.9 - i * 0.07).toFixed(2) + ')'); circ(g, cx + 24 + Math.cos(-a) * 16, cy + Math.sin(-a * 1.2) * 12, 2.4 - i * 0.15, 'rgba(247,168,194,' + (0.9 - i * 0.07).toFixed(2) + ')'); } return; }
      var n = 22; for (var k = 0; k < n * done; k++) { var th = k / n * TAU; circ(g, cx + 16 * Math.pow(Math.sin(th), 3) * 2.2, cy - (13 * Math.cos(th) - 5 * Math.cos(2 * th) - 2 * Math.cos(3 * th) - Math.cos(4 * th)) * 2.2, 2.2, k % 2 ? 'rgba(127,224,247,.95)' : 'rgba(247,168,194,.95)'); }
      glow(g, cx, cy, 60, '255,220,240', (0.3 * done).toFixed(2));
    } }));

  add(K.make({ id: 'm-applebasket', name: 'Apple basket', where: ['orchard', 'farm'], cap: 'One basket, lots of apples. One for you, one for me, one for the basket…', punch: 'A basket full to the top, and a shiny apple each.', say1: 'One!', say2: 'Two!', last: 'Full!',
    draw: function (g, U, A, p, done) {
      var x = A.cx, y = A.G + 4, n = Math.floor(p * 8.99);
      for (var i = 0; i < n; i++) { var ax = x - 12 + (i % 4) * 8, ay = y - 18 - Math.floor(i / 4) * 6; circ(g, ax, ay, 4.4, i % 3 ? '#E4566E' : '#C93F57'); circ(g, ax - 1.4, ay - 1.4, 1, 'rgba(255,255,255,.5)'); }
      g.fillStyle = '#C9965F'; g.beginPath(); g.moveTo(x - 20, y - 18); g.lineTo(x + 20, y - 18); g.lineTo(x + 15, y); g.lineTo(x - 15, y); g.closePath(); g.fill();
      for (var k = 0; k < 3; k++) line(g, x - 18 + k * 1.6, y - 13 + k * 5, x + 18 - k * 1.6, y - 13 + k * 5, 'rgba(120,80,40,.4)', 1);
      g.strokeStyle = '#9B6B45'; g.lineWidth = 2; g.beginPath(); g.arc(x, y - 18, 16, PI, TAU); g.stroke();
      if (done > 0) U.heart(g, x, y - 42, 5 * done, '#F6CB4C');
    } }));

  add(K.make({ id: 'm-cards', name: 'Thank-you cards', kind: 'sweet', cap: 'Making thank-you cards for everyone who was kind this week', punch: 'A card for the mail carrier, the neighbor, and one for each other.', say1: 'Fold!', say2: 'A heart!', last: 'Thank you!', particle: 'heart',
    draw: function (g, U, A, p, done) {
      var y = A.G - 4;
      for (var i = 0; i < 3; i++) { if (p < i * 0.3) continue; var x = A.cx - 22 + i * 22; g.save(); g.translate(x, y); g.rotate((i - 1) * 0.12 - done * (i - 1) * 0.12); rr(g, -8, -22, 16, 22, 1.5, ['#FFF3C9', '#F7C9D4', '#CFE8F7'][i]); if (p > i * 0.3 + 0.15) U.heart(g, 0, -13, 4, '#E4566E'); if (p > i * 0.3 + 0.25) line(g, -5, -5, 5, -5, '#8E7AB8', 1); g.restore(); }
      if (done > 0) U.text(g, 'THANK YOU', A.cx, A.G - 34 - done * 4, 7, '#5B4A86', '800');
    } }));

  // ======================= watching together =======================
  function bobbing(o, f) { var r0 = o.run; o.run = function (A, T, S) { r0(A, T, S); f(A, T, S); }; return o; }

  add(bobbing(K.watch({ id: 'm-pagewait', name: 'Wait for the page', where: ['library', 'rainy', 'cabinin', 'treehouse'], lie: true, tilt: 0.1,
    cap: 'Reading the same book together. Tidbit is a very fast reader…', punch: '…but she waits at the end of every page for her pal.',
    says: [[1200, 'T', 'Done!'], [2200, 'S', 'Wait…'], [3200, 'T', 'Okay!'], [4800, 'S', 'Now!'], [5600, 'T', 'Turn!', true]],
    show: function (g, A) {
      var x = A.cx, y = A.G + 2, flip = A.in(5000, 5600) ? A.p(5000, 5600) : 0;
      rr(g, x - 22, y - 10, 44, 12, 2, '#7C97E8'); rr(g, x - 20, y - 12, 19, 12, 1, '#FFF8EE'); rr(g, x + 1, y - 12, 19, 12, 1, '#FFF8EE');
      for (var k = 0; k < 3; k++) { line(g, x - 17, y - 9 + k * 3, x - 4, y - 9 + k * 3, 'rgba(60,51,80,.3)', 0.8); line(g, x + 4, y - 9 + k * 3, x + 17, y - 9 + k * 3, 'rgba(60,51,80,.3)', 0.8); }
      if (flip > 0 && flip < 1) { var w = 19 * Math.cos(flip * PI); rr(g, w >= 0 ? x + 1 : x + w, y - 13, Math.abs(w), 12, 1, '#FFFDF6'); }
    } }), function (A, T, S) { if (A.in(1300, 4800)) { T.tilt = 0.3; T.wag = 3; } }));

  add(bobbing(K.watch({ id: 'm-pigeons', name: 'Pigeon bobbing', where: ['rooftop', 'citypark'], kind: 'silly', face: 1, dx: -30,
    cap: 'Three pigeons stroll by, bobbing their heads. Bob, bob, bob…', punch: 'Now the pals are bobbing too. The pigeons seem to approve.',
    says: [[1400, 'T', 'Bob?'], [3000, 'S', 'Bob.'], [5600, 'T', 'Coo!', true]],
    show: function (g, A) {
      for (var i = 0; i < 3; i++) {
        var x = A.cx + 26 + i * 22 + Math.sin(A.t / 2000 + i) * 6, y = A.G + 2, b = Math.sin(A.t / 160 + i) * 2.4;
        ell(g, x, y - 7, 7, 5, '#9AA3B8'); ell(g, x - 6, y - 9, 4, 2.4, '#7E879C'); circ(g, x + 5 + b, y - 13, 3.2, '#8A93A8'); circ(g, x + 6 + b, y - 14, 0.8, '#2C2638');
        g.fillStyle = '#F6A04D'; g.beginPath(); g.moveTo(x + 8 + b, y - 13); g.lineTo(x + 11 + b, y - 12); g.lineTo(x + 8 + b, y - 11.5); g.fill();
        line(g, x - 1, y - 2, x - 1, y + 1, '#E48A7E', 1); line(g, x + 2, y - 2, x + 2, y + 1, '#E48A7E', 1);
      }
    } }), function (A, T, S) { if (A.in(2400, 7000)) { var b = Math.sin(A.t / 160) * 0.18; T.tilt = -0.1 + b; S.tilt = -0.1 + Math.sin(A.t / 160 + 1) * 0.18; T.wag = S.wag = 3; } }));

  add(K.watch({ id: 'm-fountain', name: 'A rainbow in the fountain', where: ['citypark', 'gardenparty'], time: 'day', face: 1, dx: -36,
    cap: 'The fountain splashes and sparkles in the sun', punch: 'The sun hits the spray just right: a tiny rainbow!',
    says: [[1400, 'S', 'Sparkly!'], [4600, 'T', 'A rainbow!', true], [5600, 'S', 'Wow…']], gold: true,
    show: function (g, A) {
      var U = A.U, x = A.cx + 66, y = A.G + 2;
      ell(g, x, y - 4, 26, 6, '#B7BFD0'); ell(g, x, y - 6, 22, 4, '#8CC8EA'); rr(g, x - 3, y - 26, 6, 22, 2, '#B7BFD0'); ell(g, x, y - 26, 10, 3, '#C9CEDA');
      for (var k = 0; k < 10; k++) { var ph = ((A.t / 900) + k / 10) % 1, dir = k % 2 ? 1 : -1, px = x + dir * ph * 18, py = y - 28 - Math.sin(ph * PI) * 18 + ph * 20; circ(g, px, py, 1.4, 'rgba(180,225,250,.9)'); }
      if (A.t > 4200) { g.save(); g.globalAlpha *= A.e(4200, 4800) * (0.7 + 0.2 * Math.sin(A.t / 300)); U.rainbow(g, x, y - 18, 24, 2, 1); g.restore(); }
    } }));

  add(K.watch({ id: 'm-leafboats', name: 'Leaf boats', where: ['pond', 'dock'], face: 1,
    cap: 'Two leaf boats with twig masts, set sail across the water', punch: 'The little boats bump together and sail on, side by side.',
    says: [[1400, 'T', 'Go, boat!'], [2400, 'S', 'Sail…'], [4600, 'T', 'Friends!', true]],
    show: function (g, A) {
      var p = A.e(600, 4400), pond = A.setting === 'pond', y = pond ? A.G - 27 : A.G - 46, lc = pond ? A.W * 0.32 : A.cx + 30;
      [[mix(lc - 62, lc - 8, p), 0, '#8FC46B'], [mix(lc + 62, lc + 8, p), 1, '#E8913F']].forEach(function (q) {
        var x = q[0] + (A.t > 4400 ? (A.t - 4400) * 0.004 : 0), yy = y + Math.sin(A.t / 400 + q[1]) * 1.2;
        g.fillStyle = q[2]; g.beginPath(); g.moveTo(x - 9, yy); g.quadraticCurveTo(x, yy + 6, x + 9, yy); g.closePath(); g.fill();
        line(g, x, yy, x, yy - 12, '#7A5638', 1); g.fillStyle = '#FFFDF6'; g.beginPath(); g.moveTo(x + 0.5, yy - 12); g.lineTo(x + 7, yy - 5); g.lineTo(x + 0.5, yy - 4); g.fill();
      });
    } }));

  add(K.watch({ id: 'm-seahorses', name: 'Seahorse dance', where: ['underwater', 'aquarium'], kind: 'cool', face: 1, dx: -30,
    cap: 'Two seahorses bob up and down, holding tails', punch: 'They twirl and curl their tails into a heart. Best friends, just like them.',
    says: [[1400, 'T', 'Ooh!'], [2800, 'S', 'Holding tails!'], [4800, 'T', 'Like us!', true]],
    show: function (g, A) {
      var U = A.U, cx = A.cx + 66, cy = A.G - 90;
      [-1, 1].forEach(function (s, i) {
        var x = cx + s * 12, y = cy + Math.sin(A.t / 500 + i * PI) * 8;
        g.save(); g.translate(x, y); g.scale(-s, 1);
        ell(g, 0, 0, 5, 9, i ? '#F6B26B' : '#F7A8C2'); circ(g, 2, -10, 4, i ? '#F6B26B' : '#F7A8C2'); rr(g, 4, -11, 6, 2.4, 1, i ? '#F6B26B' : '#F7A8C2'); circ(g, 2, -11, 0.9, '#2C2638');
        g.strokeStyle = i ? '#F6B26B' : '#F7A8C2'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(0, 8); g.quadraticCurveTo(-2, 16, 3, 18); g.stroke();
        g.restore();
      });
      if (A.t > 4400) U.heart(g, cx, cy + 26, 6 * A.back(4400, 4900), '#F28AA8');
    } }));

  add(bobbing(K.watch({ id: 'm-cow', name: 'Good morning, cow', where: ['farm'], time: 'day', kind: 'silly', face: 1, dx: -30,
    cap: 'A big friendly face peeks over the fence…', punch: 'The cow says moo. Tidbit says woof. Sugarfoot says… moof?',
    says: [[1400, 'T', 'Woof!'], [2600, 'S', 'Hello!'], [4400, 'S', 'Moof?', true], [5400, 'T', 'Ha!']], punchAt: 4400,
    show: function (g, A) {
      var x = A.cx + 70, y = A.G - 40 - A.e(400, 1400) * 10, moo = A.in(3200, 4000);
      for (var k = 0; k < 3; k++) rr(g, x - 40, A.G - 34 + k * 10, 80, 4, 1, '#C9A77A'); rr(g, x - 36, A.G - 40, 4, 40, 1, '#B7865A'); rr(g, x + 32, A.G - 40, 4, 40, 1, '#B7865A');
      ell(g, x, y, 13, 15, '#FFFFFF'); ell(g, x - 5, y - 6, 5, 4, '#3C3350'); ell(g, x, y + 9, 10, 7, '#F7C9D4'); circ(g, x - 3, y + 9, 1.4, '#C98A9A'); circ(g, x + 3, y + 9, 1.4, '#C98A9A');
      circ(g, x - 5, y - 3, 1.6, '#2C2638'); circ(g, x + 5, y - 3, 1.6, '#2C2638'); ell(g, x - 15, y - 9, 6, 3, '#FFFFFF', -0.4); ell(g, x + 15, y - 9, 6, 3, '#FFFFFF', 0.4); ell(g, x - 7, y - 15, 2, 4, '#E8D6B0', -0.3); ell(g, x + 7, y - 15, 2, 4, '#E8D6B0', 0.3);
      if (moo) A.U.text(g, 'MOO!', x + 26, y - 18, 8, '#5B4A86', '800');
    } }), function (A, T, S) { if (A.in(3200, 4000)) { T.tilt = S.tilt = 0.35; } }));

  add(bobbing(K.watch({ id: 'm-fishfollow', name: 'Follow the fish', where: ['aquarium'], kind: 'silly', face: 1,
    cap: 'Tidbit wiggles her nose at the glass. The little fish come to see…', punch: 'Now the whole school follows her nose, left and right. A fish parade!',
    says: [[1200, 'T', 'Hi, fish!'], [3400, 'S', 'They like you!'], [5400, 'T', 'Wheee!', true]],
    show: function (g, A) {
      var tx = A.mouth(0).x;
      for (var i = 0; i < 6; i++) { var lag = i * 0.12, fx = mix(A.cx + 80 + i * 10, tx + 10 + i * 9, A.e(800 + i * 150, 3000)), fy = A.G - 70 - (i % 3) * 12 + Math.sin(A.t / 300 + i) * 3; K.fish(g, fx + Math.sin(A.t / 500 - lag * 6) * 6, fy, 1, -1, ['#F6A04D', '#F7DC6F', '#7FE0F7'][i % 3]); }
    } }), function (A, T, S) { if (A.in(3400, 7600)) { T.x = A.cx - 30 + Math.sin((A.t - 3400) / 600) * 26; T.pose = 'run'; T.face = Math.cos((A.t - 3400) / 600) >= 0 ? 1 : -1; } }));

  // ======================= finds, catches and games =======================
  add(K.showTell({ id: 'm-acorn', name: 'An acorn to share', who: 'S', where: ['forest', 'citypark', 'orchard', 'backyard'], cap: 'Sugarfoot finds the biggest, shiniest acorn…', find: 'An acorn!', react: 'For the squirrel?', punch: 'They leave it by the old oak, for the squirrel. Sharing!', item: function (g, U, t, k) { K.items.acorn(g, U, t, 0); if (k) U.heart(g, 0, -12 - k * 6, 3 + k * 2, '#F6CB4C'); } }));
  add(K.showTell({ id: 'm-seaglass', name: 'Sea glass', who: 'T', kind: 'cool', where: ['beach', 'bonfire', 'lighthouse'], cap: 'Something green and glowy sparkles in the sand…', find: 'Sea glass!', react: 'Like a gem!', punch: 'Smooth green sea glass. They hold it up, and the sun shines right through.', gold: true, item: function (g, U, t, k) { g.fillStyle = 'rgba(127,214,170,.9)'; g.beginPath(); g.moveTo(-6, -3); g.lineTo(0, -7); g.lineTo(7, -2); g.lineTo(4, 5); g.lineTo(-4, 5); g.closePath(); g.fill(); circ(g, -2, -2, 1.4, 'rgba(255,255,255,.7)'); if (k) glow(g, 0, 0, 18 * k + 4, '127,214,170', 0.5); } }));
  add(K.catcher({ id: 'm-snacks', name: 'Floating snacks', where: ['space'], cap: 'Snack time in zero gravity. The crackers float away!', count: 'Got one!', punch: 'Every snack caught, and every snack shared.', thing: function (g, U, x, y, t) { g.save(); g.translate(x, y); g.rotate(t / 700); rr(g, -4, -4, 8, 8, 1.5, '#E0B77F'); circ(g, -1.4, -1.4, 0.7, '#B7865A'); circ(g, 1.6, 1.4, 0.7, '#B7865A'); g.restore(); } }));
  add(K.game({ id: 'm-gourdbowl', name: 'Gourd bowling', where: ['pumpkins', 'farm'], cap: 'Bowling with a round little gourd. Three pins at the end of the row…', punch: 'Strike! A shiny ribbon for the team.',
    target: function (g, U, x, y, t) { var down = t > 3800 ? Math.min(1, (t - 3800) / 300) : 0; for (var i = 0; i < 3; i++) { g.save(); g.translate(x - 10 + i * 10, y); g.rotate(down * (i - 1 || 1) * 1.2); ell(g, 0, -8, 3.4, 8, '#FFFFFF'); rr(g, -3, -12, 6, 2, 1, '#E4566E'); g.restore(); } },
    thing: function (g, U, x, y, t) { circ(g, x, y, 4.4, '#F6A04D'); line(g, x, y - 4, x + 1, y - 7, '#6FA15A', 1.2); },
    prize: function (g, U, x, y, t) { for (var i = 0; i < 8; i++) circ(g, x + Math.cos(i * TAU / 8) * 6, y + Math.sin(i * TAU / 8) * 6, 3.4, '#7FB8F0'); circ(g, x, y, 5, '#F7DC6F'); g.fillStyle = '#7FB8F0'; g.fillRect(x - 4, y + 6, 3, 10); g.fillRect(x + 1, y + 6, 3, 10); } }));
})();
