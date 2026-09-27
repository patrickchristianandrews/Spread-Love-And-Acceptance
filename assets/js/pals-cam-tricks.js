/* pals-cam-tricks.js — who Tidbit and Sugarfoot are, for the pal cam (pals-cam.js):
   - tricks: what each pal does when she's tapped or her "do a trick!" button is pressed. Tidbit's are quick
     and flashy; Sugarfoot's are big, slow and cuddly. Each is { id, name, dur (ms), run(A, d, o, p), front(g, A, i) }:
     run sets her pose for this moment (d is her, o is her pal, p is 0..1 through the trick, A.t is ms into it),
     front draws any props. The same helpers as the activities (hop, flip, spin, say, burst, once...) work here.
   - interludes: short personality moments that sometimes play between activities (not counted in the tally).
   - quips: little things they say on the way to the next activity, and how each reacts to the other's tricks.
   - facts: the "Pal facts" drawer shows three of these per pal each time the cam opens.
   Tidbit is index 0 (looks.drop: the big smile); Sugarfoot is index 1 (looks.collar: the gentle wag, tan eyebrow dots).
   Both have a big heart of gold. */
(function () {
  'use strict';
  var PI = Math.PI, TAU = PI * 2;
  var X = window.TOLPalsCamActs || (window.TOLPalsCamActs = { acts: [], combos: [] });
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mix(a, b, p) { return a + (b - a) * p; }
  function eio(p) { p = clamp(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function rear(A, d, a, b, amt) { if (A.in(a, b)) { d.pivot = 'hind'; d.rot = -(amt || 0.4) * A.bump(a, b); } }

  // ---------------- Tidbit: quick and flashy ----------------
  var tidbit = [
    { id: 'backflip', name: 'Lightning backflip', dur: 1100, run: function (A, d) { A.flip(d, 180, 650, 58, 1, -1); d.pose = A.in(180, 830) ? 'run' : d.pose; d.ph = 1.2; if (A.once(830)) A.burst(A.pos(0).x, A.G - 4, 4, 'puff', { speed: 0.04 }); } },
    { id: 'doublespin', name: 'Double spin', dur: 1100, run: function (A, d) { A.spin(d, 100, 850, 2); d.pose = 'run'; d.ph = 0; d.lift += A.bump(100, 950) * 12; } },
    { id: 'juggle', name: 'Speed juggling', dur: 1800, run: function (A, d) { d.tilt = -0.25; d.pose = 'sit'; },
      front: function (g, A, i) { var h = A.head(i); for (var j = 0; j < 3; j++) { var ph = ((A.t) / 520 + j / 3) % 1, u = (ph * 2) % 1, right = ph < 0.5, x = h.x + (right ? mix(-10, 10, u) : mix(10, -10, u)), y = h.y - 14 - 34 * 4 * u * (1 - u); if (A.t > 150 && A.t < 1650) A.U.ball(g, x, y, 3.6); } } },
    { id: 'moonwalk', name: 'Mini moonwalk', dur: 1500, run: function (A, d) { var f = d.face >= 0 ? 1 : -1; d.x -= f * 28 * Math.sin(A.p(0, 1500) * PI); d.pose = 'run'; d.ph = A.t / 45; if (A.once(1100)) A.burst(A.head(0).x, A.head(0).y - 10, 4, 'spark'); } },
    { id: 'cards', name: 'Card trick', dur: 1700, run: function (A, d) { rear(A, d, 100, 1600, 0.25); A.say(d, 'Your card?', 900, 1650); },
      front: function (g, A, i) { var m = A.mouth(i), fan = A.back(100, 450); for (var k = 0; k < 5; k++) { if (k === 2 && A.t > 500) continue; g.save(); g.translate(m.x + 4, m.y - 2); g.rotate((-0.6 + k * 0.3) * fan); A.U.rr(g, -2.6, -12, 5.2, 8, 1, '#FFFFFF'); A.U.heart(g, 0, -8, 1.4, '#E4566E'); g.restore(); }
        if (A.t > 500) { var p = A.p(500, 1300), y = m.y - 14 - Math.sin(p * PI) * 40; g.save(); g.translate(m.x + 4, y); g.rotate(p * TAU * 2); A.U.rr(g, -3, -4, 6, 8, 1, '#FFF3C9'); A.U.heart(g, 0, 0, 1.6, '#E4566E'); g.restore(); } } },
    { id: 'handstand', name: 'Handstand', dur: 1600, run: function (A, d) { var u = A.e(150, 450) * (1 - A.e(1150, 1450)); d.rot = -PI * 0.85 * u; d.lift += 22 * u; d.pose = 'run'; d.ph = 1.4; d.wag = 4; } },
    { id: 'cartwheel', name: 'Cartwheel', dur: 1200, run: function (A, d) { var p = A.p(100, 1000), f = d.face >= 0 ? 1 : -1; d.x += f * 30 * Math.sin(p * PI); d.rot = TAU * eio(p); d.lift += 14 * Math.sin(p * PI); d.pose = 'run'; d.ph = 1.3; } },
    { id: 'zoomlap', name: 'Zoom lap', dur: 1500, run: function (A, d) { var p = A.p(0, 1400), f = d.face >= 0 ? 1 : -1, s = Math.sin(p * TAU); d.x += f * 46 * s; d.face = Math.cos(p * TAU) >= 0 ? f : -f; d.pose = 'run'; d.dy = -8 * Math.sin(p * PI); if (A.tick(120, 0, 1400)) A.burst(A.pos(0).x, A.G - 2, 1, 'puff', { speed: 0.02, life: 400 }); } },
    { id: 'airfive', name: 'Air high five', dur: 1100, run: function (A, d) { rear(A, d, 100, 1000, 0.75); A.hop(d, 300, 300, 12); if (A.once(500)) A.burst(A.head(0).x + A.head(0).face * 10, A.head(0).y - 16, 8, 'spark'); A.say(d, 'Up top!', 400, 1050); } },
    { id: 'pounce', name: 'Pounce!', dur: 1300, run: function (A, d) { if (A.t < 450) { d.pose = 'bow'; d.wag = 5; } var f = d.face >= 0 ? 1 : -1, p = A.p(450, 1000); d.x += f * 24 * Math.sin(p * PI); A.hop(d, 450, 550, 34); if (A.in(450, 1000)) { d.pose = 'run'; d.ph = 1.3; } } },
    { id: 'wiggle', name: 'Speed wiggle', dur: 1100, run: function (A, d) { d.pose = 'wiggle'; d.wag = 6; d.lift += Math.abs(Math.sin(A.t / 60)) * 3; } },
    { id: 'tailspin', name: 'Tail tornado', dur: 1200, run: function (A, d) { A.spin(d, 50, 1000, 3); d.pose = 'run'; d.ph = A.t / 30; if (A.tick(150, 0, 1000)) A.burst(A.pos(0).x, A.G - 2, 1, 'puff', { speed: 0.03 }); } },
    { id: 'hattip', name: 'Top-hat tip', dur: 1500, run: function (A, d) { d.over = function (g, A2, i) { var h = A2.headL(i), up = A2.bump(500, 1100) * 8, s = A2.back(0, 300); A2.U.hat(g, h.x - 1, h.y - 8 - up, 0.6 * s); }; A.say(d, 'Ta-da!', 500, 1400); d.tilt = -0.15 * A.bump(400, 1200); } },
    { id: 'shades', name: 'Too cool', dur: 1500, run: function (A, d) { d.over = function (g, A2, i) { var h = A2.headL(i), dn = A2.out(100, 450); g.save(); g.translate(0, -14 * (1 - dn)); A2.U.rr(g, h.x + 1, h.y - 4, 7, 4, 2, '#2C2638'); A2.U.rr(g, h.x + 9, h.y - 4, 5, 4, 2, '#2C2638'); A2.U.line(g, h.x - 4, h.y - 3, h.x + 1, h.y - 3, '#2C2638', 1); g.restore(); }; A.say(d, 'Cool.', 600, 1400); d.tilt = -0.1; } },
    { id: 'nosebal', name: 'Nose balance', dur: 1700, run: function (A, d) { d.tilt = -0.3 + Math.sin(A.t / 120) * 0.04; d.pose = 'sit'; },
      front: function (g, A, i) { var m = A.mouth(i), b = Math.abs(Math.sin(A.t / 180)) * 10; if (A.t > 100 && A.t < 1600) A.U.ball(g, m.x + 2, m.y - 18 - b, 4.4); } },
    { id: 'frisbee', name: 'Flying frisbee catch', dur: 1400, run: function (A, d) { A.hop(d, 450, 500, 42); if (A.in(450, 950)) { d.pose = 'run'; d.ph = 1.2; } },
      front: function (g, A, i) { var m = A.mouth(i), p = A.p(0, 700), x = p < 1 ? mix(m.x + 90 * (m.face), m.x, p) : m.x, y = p < 1 ? mix(m.y - 60, m.y, p) - Math.sin(p * PI) * 20 : m.y; A.U.ell(g, x, y, 8, 2.4, '#7FB8F0'); } },
    { id: 'kickflip', name: 'Kickflip', dur: 1300, run: function (A, d) { A.hop(d, 300, 600, 34); d.under = function (g, A2) { var f = Math.cos(A2.e(300, 900) * TAU); g.save(); g.translate(0, 3); g.scale(1, f); A2.U.rr(g, -15, -1.5, 30, 3, 1.5, '#E4566E'); A2.U.circle(g, -9, 3, 2.2, '#3C3350'); A2.U.circle(g, 9, 3, 2.2, '#3C3350'); g.restore(); }; d.pose = 'run'; d.ph = 1.2; } },
    { id: 'barrelroll', name: 'Barrel roll', dur: 1200, run: function (A, d) { A.flip(d, 150, 800, 40, 1, 1); if (A.in(150, 950)) { d.pose = 'run'; d.ph = 1.3; } } },
    { id: 'poof', name: 'Now you see me', dur: 1500, run: function (A, d) { if (A.in(300, 900)) d.alpha = 0; if (A.once(300)) A.burst(A.pos(0).x, A.G - 24, 8, 'puff', { speed: 0.04 }); if (A.once(900)) A.burst(A.pos(0).x, A.G - 30, 10, 'spark', { spread: TAU }); A.say(d, 'Ta-da!', 950, 1450); } },
    { id: 'drumroll', name: 'Drumroll… TA-DA', dur: 1500, run: function (A, d) { if (A.t < 1000) { d.pose = 'run'; d.ph = A.t / 25; d.lift += Math.abs(Math.sin(A.t / 40)) * 2; } else rear(A, d, 1000, 1500, 0.5); if (A.once(1050)) A.burst(A.head(0).x, A.head(0).y - 20, 14, 'confetti', { speed: 0.12 }); } },
    { id: 'airguitar', name: 'Air guitar solo', dur: 1600, run: function (A, d) { d.pivot = 'hind'; d.rot = -0.35 - Math.abs(Math.sin(A.t / 90)) * 0.08; d.tilt = Math.sin(A.t / 120) * 0.2; if (A.tick(200, 0, 1500)) A.burst(A.head(0).x, A.head(0).y - 10, 1, 'note'); } },
    { id: 'fig8', name: 'Figure eight', dur: 1600, run: function (A, d) { var p = A.p(0, 1500), f = d.face >= 0 ? 1 : -1; d.x += f * 24 * Math.sin(p * TAU); d.dy += 7 * Math.sin(p * TAU * 2); d.face = Math.cos(p * TAU) >= 0 ? f : -f; d.pose = 'run'; } },
    { id: 'goldheart', name: 'Heart of gold', dur: 1600, run: function (A, d) { rear(A, d, 100, 1500, 0.4); d.wag = 4; if (A.once(400)) A.burst(A.head(0).x, A.head(0).y - 20, 8, 'gold', { speed: 0.07 }); A.say(d, 'For you!', 600, 1500); },
      front: function (g, A, i) { var h = A.head(i), s = A.back(200, 600) * (1 - A.e(1300, 1600)); if (s > 0.02) { A.U.circle(g, h.x, h.y - 30, 14 * s, 'rgba(255,215,110,.3)'); A.U.heart(g, h.x, h.y - 30, 9 * s, '#F6CB4C'); } } },
    { id: 'somersault', name: 'Somersault', dur: 1200, run: function (A, d) { var p = A.p(150, 950), f = d.face >= 0 ? 1 : -1; d.x += f * 20 * Math.sin(p * PI); d.rot = TAU * eio(p); d.lift += 10 * Math.sin(p * PI); d.pose = 'lie'; if (p <= 0 || p >= 1) d.pose = 'sit'; } }
  ];

  // ---------------- Sugarfoot: big, slow and cuddly ----------------
  var sugarfoot = [
    { id: 'bellyflop', name: 'Belly flop into the leaves', dur: 1900, run: function (A, d) { A.hop(d, 200, 700, 40); if (A.t > 900) { d.pose = 'lie'; d.wag = 3; } if (A.once(900)) A.burst(A.pos(1).x, A.G - 6, 18, 'leaf', { speed: 0.14, spread: 2.6 }); } },
    { id: 'bearhug', name: 'Bear hug', dur: 2000, run: function (A, d, o) { var dx = o.x - d.x, near = Math.abs(dx) < 130, h = A.e(200, 700) * (1 - A.e(1500, 1900)); if (near) { d.x += dx * 0.5 * h * (1 - 44 / Math.max(44, Math.abs(dx))); d.face = dx >= 0 ? 1 : -1; o.face = -d.face; d.pivot = o.pivot = 'hind'; d.rot = -0.5 * h; o.rot = -0.5 * h; d.blink = o.blink = h > 0.6; } else { d.pivot = 'hind'; d.rot = -0.5 * h; d.blink = h > 0.6; } d.sx *= 1 + 0.05 * h; if (A.tick(400, 400, 1600)) A.burst(A.head(1).x, A.head(1).y - 14, 2, 'heart'); },
      front: function (g, A, i) { var dx = A.pos(1 - i).x - A.pos(i).x; if (Math.abs(dx) < 130) return; var h = A.e(200, 700) * (1 - A.e(1500, 1900)), m = A.mouth(i); if (h > 0.05) A.U.heart(g, m.x + m.face * 6, m.y + 4, 9 * h, '#F7A8C2'); } },
    { id: 'twirl', name: 'Spinning twirl', dur: 1800, run: function (A, d) { A.spin(d, 100, 1500, 1); d.pose = 'run'; d.ph = 0; d.lift += A.bump(100, 1600) * 8; if (A.tick(160, 100, 1600)) A.burst(A.pos(1).x + (Math.random() - 0.5) * 30, A.G - 30, 1, 'spark'); } },
    { id: 'teacup', name: 'Teacup on the nose', dur: 2100, run: function (A, d) { d.tilt = -0.28 + Math.sin(A.t / 260) * 0.05; d.pose = 'sit'; d.over = function (g, A2, i) { var h = A2.headL(i), s = A2.back(0, 400); g.save(); g.translate(h.x + 15, h.y - 6); g.scale(s, s); A2.U.ell(g, 0, 0, 5, 1.2, '#FFFFFF'); A2.U.rr(g, -3, -5, 6, 5, 1.5, '#FFFFFF'); A2.U.rr(g, -3, -3.4, 6, 1, 0, '#F7A8C2'); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(0, -6); g.quadraticCurveTo(2 + Math.sin(A2.now / 150) * 2, -9, 0, -12); g.stroke(); g.restore(); }; A.say(d, 'Steady…', 700, 1800); } },
    { id: 'slowwag', name: 'Slow-motion happy wag', dur: 2000, run: function (A, d) { d.pose = 'sit'; d.wag = 0.35; d.rot = Math.sin(A.t / 400) * 0.07; d.pivot = 'hind'; d.blink = A.in(600, 1400); if (A.tick(500, 200, 1800)) A.burst(A.head(1).x, A.head(1).y - 14, 1, 'heart'); } },
    { id: 'playbow', name: 'Big play bow', dur: 1600, run: function (A, d) { if (A.in(150, 1300)) { d.pose = 'bow'; d.wag = 4; } A.hop(d, 1200, 300, 16); A.say(d, 'Play?', 400, 1200); } },
    { id: 'rollover', name: 'Slow roll-over', dur: 2000, run: function (A, d) { if (A.in(200, 1800)) { d.pose = 'lie'; d.rot = TAU * eio(A.p(400, 1600)); d.lift += 8 * A.bump(400, 1600); d.wag = 3; } } },
    { id: 'sitpretty', name: 'Sit pretty', dur: 1900, run: function (A, d) { var u = A.e(150, 500) * (1 - A.e(1500, 1850)); d.pivot = 'hind'; d.rot = -0.85 * u; d.pose = 'sit'; if (A.once(700)) A.burst(A.head(1).x, A.head(1).y - 14, 4, 'heart'); } },
    { id: 'stretch', name: 'Big, big stretch', dur: 2000, run: function (A, d) { if (A.in(150, 1600)) { d.pose = 'bow'; d.sx *= 1 + 0.12 * A.bump(150, 1600); } A.say(d, 'Mmmm.', 400, 1500); } },
    { id: 'flowersniff', name: 'Stop and smell the flowers', dur: 1900, run: function (A, d) { if (A.in(300, 1500)) { d.pose = 'bow'; d.blink = true; } A.say(d, 'Aah.', 1300, 1900); if (A.once(1400)) A.burst(A.mouth(1).x, A.mouth(1).y, 8, 'confetti', { col: '#F7A8C2', speed: 0.06 }); },
      front: function (g, A, i) { var m = A.mouth(i), s = A.back(0, 400) * (1 - A.e(1500, 1900)); if (s <= 0) return; var x = m.x + m.face * 8, y = A.G + 2; A.U.line(g, x, y, x, y - 12 * s, '#6FA15A', 1.4); for (var k = 0; k < 5; k++) A.U.circle(g, x + Math.cos(k * 1.26) * 3 * s, y - 13 * s + Math.sin(k * 1.26) * 3 * s, 2 * s, '#F28AA8'); A.U.circle(g, x, y - 13 * s, 1.4 * s, '#F7DC6F'); } },
    { id: 'cozycurl', name: 'Cozy curl-up', dur: 2100, run: function (A, d) { if (A.in(150, 2000)) { d.pose = 'lie'; d.blink = true; } A.say(d, 'Zzz', 700, 1900); },
      front: function (g, A, i) { var p = A.pos(i), s = A.back(200, 600) * (1 - A.e(1800, 2100)); if (s > 0.02) { A.U.ell(g, p.x - p.face * 2, p.y - 10, 22 * s, 8 * s, '#B79CEB'); A.U.ell(g, p.x - p.face * 6, p.y - 12, 12 * s, 3 * s, 'rgba(255,255,255,.3)'); } } },
    { id: 'heartpaws', name: 'Heart paws', dur: 1800, run: function (A, d) { rear(A, d, 100, 1700, 0.55); },
      front: function (g, A, i) { var h = A.head(i), s = A.back(300, 800) * (1 - A.e(1400, 1800)); if (s > 0.02) A.U.heart(g, h.x + h.face * 14, h.y - 22 - A.p(300, 1800) * 16, 12 * s, '#F28AA8'); } },
    { id: 'bubblesnout', name: 'Nose bubble', dur: 1800, run: function (A, d) { d.tilt = -0.15; d.blink = A.in(200, 1200); A.say(d, 'Pop!', 1250, 1750); if (A.once(1250)) A.burst(A.mouth(1).x + A.mouth(1).face * 6, A.mouth(1).y - 12, 8, 'spark', { spread: TAU, speed: 0.06 }); },
      front: function (g, A, i) { if (A.t > 1250) return; var m = A.mouth(i), r = 2 + 10 * A.e(200, 1200); g.strokeStyle = 'rgba(160,200,255,.9)'; g.lineWidth = 1.2; g.beginPath(); g.arc(m.x + m.face * (6 + r * 0.6), m.y - 10 - r * 0.5, r, 0, TAU); g.stroke(); A.U.circle(g, m.x + m.face * (6 + r * 0.3), m.y - 12 - r * 0.8, r * 0.18, 'rgba(255,255,255,.9)'); } },
    { id: 'butterfly', name: 'Butterfly perch', dur: 2100, run: function (A, d) { d.blink = false; d.tilt = -0.12; A.say(d, 'Hi, friend.', 1200, 2000); },
      front: function (g, A, i) { var h = A.head(i), p = A.e(0, 1000), x = mix(h.x + 60, h.x - h.face * 2, p) + Math.sin(A.t / 120) * 10 * (1 - p), y = mix(h.y - 60, h.y - 13, p), f = Math.abs(Math.sin(A.t / (p < 1 ? 60 : 400))); A.U.ell(g, x - 4 * f, y - 3, 4 * f + 1, 3.4, '#F6A04D'); A.U.ell(g, x + 4 * f, y - 3, 4 * f + 1, 3.4, '#F6A04D'); A.U.ell(g, x, y - 1, 1, 3.4, '#3C3350'); } },
    { id: 'stomp', name: 'Gentle-giant stomps', dur: 2000, run: function (A, d) { A.hop(d, 200, 600, 26); A.hop(d, 1000, 600, 26); [800, 1600].forEach(function (t) { if (A.once(t)) { A.burst(A.pos(1).x, A.G - 2, 6, 'puff', { speed: 0.05 }); A.shake(1.2); } }); d.sx *= 1.04; } },
    { id: 'snuggle', name: 'Snuggle wiggle', dur: 1700, run: function (A, d) { d.pose = 'wiggle'; d.wag = 2.2; if (A.tick(300, 100, 1600)) A.burst(A.head(1).x, A.head(1).y - 14, 1, 'heart'); } },
    { id: 'awoo', name: 'A big happy "Awoo!"', dur: 1800, run: function (A, d) { d.tilt = -0.55 * A.e(100, 400) * (1 - A.e(1500, 1800)); d.pivot = 'hind'; d.rot = -0.2 * A.bump(100, 1700); A.say(d, 'Awooo!', 300, 1600); if (A.tick(250, 300, 1500)) A.burst(A.head(1).x, A.head(1).y - 20, 1, 'note'); } },
    { id: 'pillow', name: 'Pillow pounce', dur: 2000, run: function (A, d) { A.hop(d, 300, 500, 30); if (A.t > 800) { d.pose = 'lie'; d.lift += 6; d.blink = A.t > 1100; } if (A.once(800)) A.burst(A.pos(1).x, A.G - 14, 14, 'puff', { col: '#FFFFFF', speed: 0.07, spread: TAU, size: 0.35, life: 1400 }); },
      front: function (g, A, i) { var p = A.pos(i), s = A.back(0, 300) * (1 - A.e(1700, 2000)); if (s > 0.02) A.U.rr(g, p.x - 22 * s, A.G - 4, 44 * s, 10 * s, 5, '#F7C9D4'); } },
    { id: 'slowleap', name: 'Slow-motion leap', dur: 2000, run: function (A, d) { A.hop(d, 250, 1400, 64); if (A.in(250, 1650)) { d.pose = 'run'; d.ph = 1.2; d.wag = 0.5; } if (A.tick(180, 300, 1600)) A.burst(A.pos(1).x, A.pos(1).y - 20, 1, 'spark', { speed: 0.02 }); } },
    { id: 'blanketcape', name: 'Blanket cape swish', dur: 1800, run: function (A, d) { d.cape = '#B79CEB'; A.spin(d, 500, 900, 1); d.lift += 10 * A.bump(500, 1400); A.say(d, 'Swish!', 800, 1600); } },
    { id: 'puppyeyes', name: 'Puppy eyes', dur: 1800, run: function (A, d) { d.tilt = 0.32 * A.e(100, 400); d.pose = 'sit'; d.wag = 0.8; A.say(d, 'Please?', 500, 1600); },
      front: function (g, A, i) { var h = A.head(i); if (A.in(300, 1600)) A.U.star(g, h.x + h.face * 6, h.y - 4, 2 + Math.sin(A.t / 120), 'rgba(255,255,255,.95)', A.t / 300); } },
    { id: 'snowcatch', name: 'Catching a snowflake', dur: 2000, run: function (A, d) { d.tilt = -0.4 * A.e(100, 500); if (A.in(1300, 1700)) A.say(d, '!', 1300, 1900); A.hop(d, 1200, 300, 10); },
      front: function (g, A, i) { var m = A.mouth(i); for (var k = 0; k < 5; k++) { var p = clamp((A.t - k * 180) / 1300, 0, 1); if (p <= 0 || p >= 1) continue; var x = mix(m.x - 40 + k * 20, k === 2 ? m.x : m.x - 40 + k * 20 + 8, p) + Math.sin(A.t / 200 + k) * 4, y = mix(m.y - 70, k === 2 ? m.y : A.G, p); A.U.star(g, x, y, 2.4, '#FFFFFF', A.t / 400); } } },
    { id: 'goldglow', name: 'Golden glow hug', dur: 2000, run: function (A, d, o) { var dx = o.x - d.x, h = A.e(200, 600) * (1 - A.e(1600, 2000)); if (Math.abs(dx) < 130) { d.x += dx * 0.45 * h * (1 - 44 / Math.max(44, Math.abs(dx))); d.face = dx >= 0 ? 1 : -1; } d.pivot = 'hind'; d.rot = -0.45 * h; d.blink = h > 0.6; if (A.tick(350, 400, 1700)) A.burst((A.head(1).x + A.head(0).x) / 2, A.head(1).y - 16, 2, 'gold', { speed: 0.05 }); },
      front: function (g, A, i) { var h = A.head(i), s = A.e(300, 700) * (1 - A.e(1600, 2000)); if (s > 0.02) { var gr = g.createRadialGradient(h.x, h.y, 2, h.x, h.y, 50 * s); gr.addColorStop(0, 'rgba(255,220,120,.35)'); gr.addColorStop(1, 'rgba(255,220,120,0)'); g.fillStyle = gr; g.fillRect(h.x - 50, h.y - 50, 100, 100); } } },
    { id: 'lean', name: 'The famous lean', dur: 1900, run: function (A, d, o) { var dx = o.x - d.x, h = A.e(200, 600) * (1 - A.e(1500, 1900)); if (Math.abs(dx) < 130) { d.x += dx * 0.45 * h * (1 - 40 / Math.max(40, Math.abs(dx))); d.face = dx >= 0 ? 1 : -1; } d.pivot = 'hind'; d.rot = 0.18 * h; d.blink = h > 0.7; A.say(d, '<3', 700, 1600); } }
  ];

  // ---------------- interludes: little personality beats between activities ----------------
  var interludes = [
    { id: 'i-zoom', name: 'Zoom lap', kind: 'interlude', dur: 2800, cap: 'Tidbit does a quick lap around Sugarfoot. Sugarfoot waits, wagging slowly',
      run: function (A, T, S) { var th = A.e(200, 2400) * TAU, r = 46; S.pose = 'sit'; S.wag = 0.6; T.x = S.x + Math.cos(th + PI) * r; T.dy = Math.sin(th + PI) * 10; T.z = Math.sin(th + PI) > 0 ? 2 : 0; T.face = -Math.sin(th + PI) >= 0 ? 1 : -1; if (A.in(200, 2400)) T.pose = 'run'; if (A.t > 2400) T.face = 1; S.face = T.x > S.x ? 1 : -1; A.say(S, 'Aww.', 2200, 2800); } },
    { id: 'i-sniff', name: 'Sniff sniff', kind: 'interlude', dur: 3000, cap: 'Tidbit is sniffing something out…',
      run: function (A, T, S) { if (A.t < 1800) { T.pose = 'bow'; T.x = A.x0 + Math.sin(A.t / 300) * 14; T.face = Math.cos(A.t / 300) >= 0 ? 1 : -1; T.tilt = Math.abs(Math.sin(A.t / 90)) * 0.1; } A.say(T, 'A clue!', 1900, 2700); if (A.t > 1900) { T.face = 1; A.hop(T, 1900, 300, 14); } S.tilt = 0.2; if (A.once(1900)) A.burst(A.x0 + 20, A.G - 4, 4, 'spark'); } },
    { id: 'i-lean', name: 'The lean', kind: 'interlude', dur: 2800, cap: 'Sugarfoot scoots over and leans on Tidbit',
      run: function (A, T, S) { S.x = mix(A.x1, A.x0 + 40, A.e(200, 1000)); if (A.in(200, 1000)) S.pose = 'run'; S.face = -1; T.face = 1; if (A.t > 1100) { S.pivot = 'hind'; S.rot = 0.14 * A.e(1100, 1500); S.blink = A.t > 1600; } A.say(T, '<3', 1600, 2500); if (A.once(1600)) A.burst(A.x0 + 20, A.G - 70, 3, 'heart'); } },
    { id: 'i-wags', name: 'Wag-off', kind: 'interlude', dur: 2400, cap: 'Very fast wags from Tidbit. Very slow, happy ones from Sugarfoot',
      run: function (A, T, S) { T.wag = 4; S.wag = 0.4; T.ear = Math.sin(A.t / 60) * 0.3; S.blink = A.in(900, 1500); } },
    { id: 'i-stretch', name: 'Stretches', kind: 'interlude', dur: 2800, cap: 'A big, long stretch from Sugarfoot. A tiny one from Tidbit, then off she zooms',
      run: function (A, T, S) { if (A.in(100, 1900)) { S.pose = 'bow'; S.sx *= 1 + 0.08 * A.bump(100, 1900); } if (A.in(200, 600)) T.pose = 'bow'; if (A.t > 700) { T.x = A.x0 - Math.sin(A.p(700, 2600) * PI) * 40; T.face = A.t < 1650 ? -1 : 1; if (A.in(700, 2600)) T.pose = 'run'; } A.say(S, 'Mmm.', 500, 1400); } }
  ];

  var quips = {
    tidbit: ['Race you!', 'Ooh, idea!', 'Watch this!', 'I’ve got a plan!', 'Follow me!', 'Faster!', 'A clue!', 'Next!', 'Hmm…', 'Let’s go!', 'I know!', 'This way!'],
    sugarfoot: ['Right behind you.', 'Together?', 'I’ve got you.', 'Okay!', 'Aww.', 'Brave paws!', 'Hug later?', 'Mmm.', '<3', 'Coming!', 'Us!', 'Wait for me!'],
    tidbitReacts: ['Aww!', 'Again!', '10 out of 10!', 'So cozy!', '<3', 'Best pal!', 'Heart of gold!'],
    sugarfootReacts: ['Wow!', 'Bravo!', 'So fast!', 'Hee!', '<3', 'Show-off!']
  };

  var facts = {
    tidbit: [
      { k: 'Favorite snack', v: 'Crunchy apple slices, eaten at top speed' },
      { k: 'Superpower', v: 'Spotting a dropped crumb from across the garden' },
      { k: 'Secret talent', v: 'Can untie any knot (and several shoelaces)' },
      { k: 'Favorite time of day', v: 'Morning, with a whole day of plans ahead' },
      { k: 'On a trip she’d bring', v: 'A map, a spare map, and a map of the maps' },
      { k: 'Favorite game', v: 'Anything with a finish line' },
      { k: 'Best trick', v: 'The lightning backflip' },
      { k: 'Favorite sound', v: 'Sugarfoot’s happy sigh' },
      { k: 'Always first to', v: 'Say hello to a new friend' },
      { k: 'Dream job', v: 'Chief inventor at the tennis ball factory' },
      { k: 'Can’t resist', v: 'A mystery that needs solving' },
      { k: 'Favorite place', v: 'The top of the tallest hill, for the view' },
      { k: 'Motto', v: 'Why walk when you can zoom?' },
      { k: 'Favorite weather', v: 'Windy days, perfect for kites' },
      { k: 'Soft side', v: 'She checks on Sugarfoot every few minutes' },
      { k: 'Favorite word', v: '“Go!”' },
      { k: 'Heart of gold', v: 'She always saves the last tennis ball for her pal' },
      { k: 'Kindest habit', v: 'Stopping mid-zoom to help anyone who looks lost' }
    ],
    sugarfoot: [
      { k: 'Favorite snack', v: 'A warm biscuit, shared with Tidbit' },
      { k: 'Superpower', v: 'Hugs that make the whole day better' },
      { k: 'Secret talent', v: 'Balancing a teacup on her nose' },
      { k: 'Favorite time of day', v: 'Night, under the stars' },
      { k: 'On a trip she’d bring', v: 'The softest blanket, big enough for two' },
      { k: 'Favorite game', v: 'Hide and seek (she hides where Tidbit can find her)' },
      { k: 'Best trick', v: 'The slow-motion belly flop' },
      { k: 'Favorite sound', v: 'Rain on the roof of a blanket fort' },
      { k: 'Always first to', v: 'Walk into the dark, so Tidbit doesn’t have to' },
      { k: 'Dream job', v: 'Keeper of the night-time lanterns' },
      { k: 'Can’t resist', v: 'A tiny creature who needs a friend' },
      { k: 'Favorite place', v: 'Right beside Tidbit' },
      { k: 'Motto', v: 'Together is the best way to go' },
      { k: 'Favorite weather', v: 'The very first snowfall' },
      { k: 'Goofy side', v: 'She snores like a little kettle' },
      { k: 'Favorite word', v: '“Us.”' },
      { k: 'Brave about', v: 'Thunder, dark caves and very big puddles' },
      { k: 'Heart of gold', v: 'Nobody gets left out when she\u2019s around' },
      { k: 'Wag style', v: 'Slow, gentle and very, very happy' }
    ]
  };

  X.tricks = { tidbit: tidbit, sugarfoot: sugarfoot };
  X.interludes = interludes;
  X.quips = quips;
  X.facts = facts;
})();
