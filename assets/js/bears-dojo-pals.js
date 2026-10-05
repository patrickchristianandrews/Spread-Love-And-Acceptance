/* bears-dojo-pals.js — three things to do with Tidbit and Sugarfoot at The Bears Dojo:
   splashing in the stream with both of them, fishing off the little dock with Tidbit (always catch and release),
   and raking the zen garden with Sugarfoot. Each is an offering like the others (it can come up in the shuffle),
   and each also has its own button on the grounds, so you can go straight to it. The pups are drawn by pups.js.
   Nothing is stored or sent anywhere; "Keep the page still" and reduced motion hold everything in a calm pose. */
(function () {
  'use strict';
  var BD = window.BearsDojo; if (!BD) return;
  var U = BD.util, rand = U.rand, pick = U.pick, clamp = U.clamp, $ = U.$;
  var TAU = Math.PI * 2;

  function canvas(host, w, h, label) {
    var cv = document.createElement('canvas'); cv.className = 'od-pond od-pals'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', label);
    var dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = w * dpr; cv.height = h * dpr; cv.style.aspectRatio = w + ' / ' + h;
    var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); host.appendChild(cv); return { cv: cv, g: g, w: w, h: h };
  }
  function pt(cv, e, w, h) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * w, (e.clientY - r.top) / r.height * h]; }
  function pup(g, who, x, y, s, face, pose, t, ph) {
    var P = window.TOLPups; if (!P) return;
    g.save(); g.translate(x, y); g.scale(face * s, s);
    try { P.draw(g, who === 'tidbit' ? P.looks.collar : P.looks.drop, pose, ph || 0, Math.sin(t / 140) * 0.6, Math.sin(t / 1300 + (who === 'tidbit' ? 0 : 2)) > 0.985, t, 0); } catch (e) {}
    g.restore();
  }
  function ell(g, x, y, rx, ry, col) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); }

  // ---------- 1. splashing in the stream, with both pups ----------
  var SPLASH_LINES = ['Tidbit pounces on the biggest splash she can find.', 'Sugarfoot shakes off, and gets everyone wet.', 'Tidbit splashes Sugarfoot. Sugarfoot splashes back.',
    'A little fish darts between Sugarfoot’s paws. She stays very, very still.', 'Tidbit chases the ripples and never quite catches one.', 'Both pups sit down in the shallows, all at once, on purpose.',
    'Sugarfoot finds a smooth stone and carries it about proudly.', 'Tidbit blows bubbles at the water. The water wins.'];
  BD.offer({ id: 'splash', kind: 'Play', title: 'Splashing in the stream with Tidbit and Sugarfoot', mount: function (host, api) {
    host.innerHTML = '<p class="od-note">The stream is shallow and warm today. Tap the water to make a splash; the pups will come running. Or press Splash and let them start it.</p>';
    var C = canvas(host, 480, 300, 'A shallow stream with smooth stones. Tidbit and Sugarfoot are splashing about in the water.');
    var row = document.createElement('div'); row.className = 'od-row'; row.innerHTML = '<button type="button" class="bd-go" id="od-splash">Splash!</button>'; host.appendChild(row);
    var say = document.createElement('p'); say.className = 'od-note od-say'; say.setAttribute('aria-live', 'polite'); host.appendChild(say);
    var g = C.g, W = C.w, H = C.h, drops = [], rings = [], t = 0;
    var pups = [{ who: 'tidbit', x: 150, y: 210, tx: 150, ty: 210, face: 1, hop: 0, ph: 0 }, { who: 'sugarfoot', x: 330, y: 226, tx: 330, ty: 226, face: -1, hop: 0, ph: 0 }];
    function splash(x, y, big) {
      x = clamp(x, 30, W - 30); y = clamp(y, 150, H - 20);
      rings.push({ x: x, y: y, r: 4, a: 1 }); if (big) rings.push({ x: x, y: y, r: 0, a: 1 });
      for (var i = 0; i < (big ? 18 : 11); i++) { var an = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, sp = 60 + Math.random() * (big ? 120 : 80); drops.push({ x: x, y: y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, life: 0 }); }
      api.audio.plop();
    }
    function come(x, y) {
      pups.forEach(function (p, i) { p.tx = clamp(x + (i ? 46 : -46), 40, W - 40); p.ty = clamp(y + 10 + i * 8, 170, H - 20); p.face = p.tx > p.x ? 1 : -1; });
      api.later(function () { pups.forEach(function (p) { p.hop = 1; }); splash(x, y + 6, true); say.textContent = pick(SPLASH_LINES); }, api.still() ? 50 : 900);
    }
    api.on(C.cv, 'pointerdown', function (e) { var p = pt(C.cv, e, W, H); splash(p[0], Math.max(150, p[1]), false); come(p[0], Math.max(160, p[1])); });
    $('#od-splash', host).addEventListener('click', function () { var x = 80 + rand(W - 160), y = 180 + rand(90); splash(x, y, true); come(x, y); });
    // now and then the pups start something by themselves
    api.every(function () { if (api.still()) return; var p = pick(pups); p.tx = 60 + rand(W - 120); p.ty = 170 + rand(H - 190); p.face = p.tx > p.x ? 1 : -1; api.later(function () { p.hop = 1; splash(p.x, p.y + 4, false); }, 1300); }, 4200);
    function draw() {
      var sky = g.createLinearGradient(0, 0, 0, 120); sky.addColorStop(0, '#CFE8F3'); sky.addColorStop(1, '#EAF5F0'); g.fillStyle = sky; g.fillRect(0, 0, W, 120);
      g.fillStyle = '#7FB070'; g.beginPath(); g.moveTo(0, 120); g.quadraticCurveTo(240, 96, 480, 124); g.lineTo(480, 150); g.lineTo(0, 150); g.fill();
      [[40, 104], [430, 108], [300, 100]].forEach(function (b) { ell(g, b[0], b[1], 34, 16, '#5E9A5A'); });
      var wat = g.createLinearGradient(0, 140, 0, H); wat.addColorStop(0, '#8FCBDA'); wat.addColorStop(1, '#4D97AF'); g.fillStyle = wat; g.fillRect(0, 140, W, H - 140);
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5; for (var i = 0; i < 9; i++) { var yy = 160 + i * 16, xo = (t / 30 + i * 47) % 120; g.beginPath(); for (var x = -120 + xo; x < W; x += 120) { g.moveTo(x, yy); g.quadraticCurveTo(x + 20, yy - 3, x + 40, yy); } g.stroke(); }
      [[60, 270, 16], [420, 160, 13], [250, 286, 12], [460, 260, 15]].forEach(function (s) { ell(g, s[0], s[1], s[2] * 1.4, s[2] * 0.6, '#9A9387'); ell(g, s[0] - 3, s[1] - 3, s[2] * 0.8, s[2] * 0.3, '#B9B2A5'); });
      rings.forEach(function (r) { g.strokeStyle = 'rgba(255,255,255,' + (r.a * 0.8).toFixed(2) + ')'; g.lineWidth = 2; g.beginPath(); g.ellipse(r.x, r.y, r.r, r.r * 0.38, 0, 0, TAU); g.stroke(); });
      pups.forEach(function (p) {
        var lift = p.hop > 0 ? Math.sin(p.hop * Math.PI) * 26 : 0;
        ell(g, p.x, p.y + 2, 26, 6, 'rgba(30,80,100,.25)');
        g.save(); g.beginPath(); g.rect(0, 0, W, p.y - 4 - lift * 0.1 + 6); g.clip();   // paws under the water line
        pup(g, p.who, p.x, p.y - lift, 1.15, p.face, Math.abs(p.tx - p.x) > 3 ? 'run' : (p.hop > 0 ? 'wiggle' : 'sit'), t, p.ph);
        g.restore();
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(p.x, p.y + 1, 22 + Math.sin(t / 300) * 2, 5, 0, 0, TAU); g.stroke();
      });
      drops.forEach(function (d) { g.fillStyle = 'rgba(225,245,255,' + Math.max(0, 1 - d.life / 1.1).toFixed(2) + ')'; g.beginPath(); g.arc(d.x, d.y, 2.6, 0, TAU); g.fill(); });
    }
    api.frames(function (dt) {
      var s = dt / 1000; if (api.still()) { draw(); return; } t += dt;
      pups.forEach(function (p) {
        var dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), sp = p.who === 'tidbit' ? 130 : 105;
        if (d > 2) { p.x += dx / d * Math.min(d, sp * s); p.y += dy / d * Math.min(d, sp * s); p.ph += s * 14; }
        if (p.hop > 0) { p.hop -= s * 1.6; if (p.hop < 0) p.hop = 0; }
      });
      drops.forEach(function (d) { d.life += s; d.vy += 260 * s; d.x += d.vx * s; d.y += d.vy * s; }); drops = drops.filter(function (d) { return d.life < 1.1; });
      rings.forEach(function (r) { r.r += 40 * s; r.a -= 0.7 * s; }); rings = rings.filter(function (r) { return r.a > 0; });
      draw();
    });
    draw(); say.textContent = 'Tidbit and Sugarfoot are already in the water, waiting for you.';
  } });

  // ---------- 2. fishing off the dock with Tidbit (catch and release, always) ----------
  var FISH = [['a little sunfish', '#F2B33D'], ['a speckled trout', '#9FB58A'], ['a koi with one gold spot', '#F0743E'], ['a shy minnow', '#B9C6CC'], ['a round bluegill', '#6F9CC7'],
    ['a sleepy catfish', '#8C7B6A'], ['a silver dace', '#D7DEE3'], ['a koi as white as a cloud', '#F6F2EA'], ['a tiny perch with stripes', '#C9B45A'], ['a very proud goldfish', '#F59A2E']];
  var FISH_SAY = ['Tidbit says hello, then lets it swim home.', 'Tidbit gives it a gentle look and a gentle splash back into the water.', '“Thank you for visiting,” Tidbit seems to say. Off it goes.',
    'Tidbit wags so hard the dock wobbles. Then back it goes.', 'It wiggles. Tidbit wiggles. Back into the pond it goes.'];
  BD.offer({ id: 'fish', kind: 'Fish', title: 'Fishing with Tidbit', mount: function (host, api) {
    host.innerHTML = '<p class="od-note">Tidbit has her little rod and a spot on the dock. Cast, wait for the bobber to dip, then reel in. Every fish is said hello to and let go.</p>';
    var C = canvas(host, 480, 300, 'A small wooden dock over a pond. Tidbit sits at the end with a fishing rod.');
    var row = document.createElement('div'); row.className = 'od-row'; row.innerHTML = '<button type="button" class="bd-go" id="od-fish">Cast the line</button>'; host.appendChild(row);
    var say = document.createElement('p'); say.className = 'od-note od-say'; say.setAttribute('aria-live', 'polite'); host.appendChild(say);
    var btn = $('#od-fish', host), g = C.g, W = C.w, H = C.h, t = 0, st = 'idle', stT = 0, bob = { x: 0, y: 0 }, fly = 0, caught = null, count = 0, wait = 0;
    var rodTip = { x: 214, y: 128 };
    function setBtn(txt, dis) { btn.textContent = txt; if (dis) { btn.setAttribute('aria-disabled', 'true'); btn.classList.add('is-wait'); } else { btn.removeAttribute('aria-disabled'); btn.classList.remove('is-wait'); } }
    function cast() {
      bob.x = 300 + rand(140); bob.y = 196 + rand(70); st = 'fly'; fly = 0; caught = null; setBtn('Waiting…', true);
      say.textContent = 'Tidbit casts. Plip! Now we wait, quietly.'; wait = api.still() ? 1.2 : 2.5 + Math.random() * 4;
    }
    function reel() {
      if (st === 'bite') { var f = pick(FISH); caught = { name: f[0], col: f[1] }; count++; st = 'catch'; stT = 0; api.audio.plop(); say.textContent = 'Tidbit reels in ' + f[0] + '! ' + pick(FISH_SAY); setBtn('Cast again', false); if (api.audio.on) api.audio.tone(api.audio.note(5), 0.5, 0.04); }
      else if (st === 'wait') { st = 'idle'; say.textContent = 'Too soon. Tidbit reels in an empty line and laughs. Try again when the bobber dips.'; setBtn('Cast again', false); }
    }
    btn.addEventListener('click', function () { if (st === 'idle' || st === 'catch' || st === 'gone') cast(); else if (st === 'bite' || st === 'wait') reel(); });
    api.on(C.cv, 'pointerdown', function () { if (st === 'bite') reel(); else if (st === 'idle' || st === 'catch' || st === 'gone') cast(); });
    function draw() {
      var sky = g.createLinearGradient(0, 0, 0, 140); sky.addColorStop(0, '#F6D9B8'); sky.addColorStop(1, '#F3EBD7'); g.fillStyle = sky; g.fillRect(0, 0, W, 140);
      ell(g, 390, 52, 24, 24, '#FFE3A3'); g.fillStyle = '#86A97A'; g.beginPath(); g.moveTo(0, 130); g.quadraticCurveTo(160, 92, 300, 120); g.quadraticCurveTo(400, 106, 480, 126); g.lineTo(480, 150); g.lineTo(0, 150); g.fill();
      var wat = g.createLinearGradient(0, 140, 0, H); wat.addColorStop(0, '#9CC9C4'); wat.addColorStop(1, '#4E8D97'); g.fillStyle = wat; g.fillRect(0, 140, W, H - 140);
      g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 1.2; for (var i = 0; i < 7; i++) { var yy = 160 + i * 20, xo = (t / 50 + i * 61) % 140; g.beginPath(); for (var x = -140 + xo; x < W; x += 140) { g.moveTo(x, yy); g.quadraticCurveTo(x + 24, yy - 3, x + 48, yy); } g.stroke(); }
      ell(g, 420, 170, 26, 8, '#5F9A60'); ell(g, 60, 250, 20, 7, '#5F9A60'); g.fillStyle = '#F4B6C5'; g.beginPath(); g.arc(424, 167, 5, 0, TAU); g.fill();
      // the dock
      g.fillStyle = '#8A5E3C'; for (var pp = 0; pp < 3; pp++) g.fillRect(40 + pp * 70, 150, 8, 70); g.fillStyle = '#B27D50'; g.fillRect(0, 140, 240, 16); g.fillStyle = '#946642'; for (var b = 0; b < 8; b++) g.fillRect(b * 30, 140, 2, 16);
      // Tidbit and her rod
      var lean = st === 'bite' ? Math.sin(t / 60) * 0.06 : 0;
      pup(g, 'tidbit', 168, 142, 1.25, 1, st === 'catch' ? 'wiggle' : 'sit', t, 0);
      g.save(); g.translate(176, 124); g.rotate(-0.55 + lean); g.strokeStyle = '#5A3A22'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(52, 0); g.stroke(); g.restore();
      rodTip.x = 176 + Math.cos(-0.55 + lean) * 52; rodTip.y = 124 + Math.sin(-0.55 + lean) * 52;
      if (st !== 'idle') {
        var bx = bob.x, by = bob.y;
        if (st === 'fly') { var q = Math.min(1, fly); bx = rodTip.x + (bob.x - rodTip.x) * q; by = rodTip.y + (bob.y - rodTip.y) * q - Math.sin(q * Math.PI) * 60; }
        if (st === 'catch') { var q2 = Math.min(1, stT / 0.8); bx = bob.x + (rodTip.x + 10 - bob.x) * q2; by = bob.y + (rodTip.y + 30 - bob.y) * q2 - Math.sin(q2 * Math.PI) * 40; }
        var dip = st === 'bite' ? 4 + Math.sin(t / 80) * 3 : Math.sin(t / 500) * 1.2;
        g.strokeStyle = 'rgba(60,50,40,.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(rodTip.x, rodTip.y); g.quadraticCurveTo((rodTip.x + bx) / 2, Math.max(rodTip.y, by) + 10, bx, by + dip - 6); g.stroke();
        if (st === 'catch' && caught) {
          g.save(); g.translate(bx, by + 4); g.rotate(Math.sin(t / 90) * 0.4); ell(g, 0, 0, 14, 6, caught.col); g.fillStyle = caught.col; g.beginPath(); g.moveTo(-12, 0); g.lineTo(-22, -7); g.lineTo(-22, 7); g.fill(); g.fillStyle = '#222'; g.beginPath(); g.arc(8, -1.5, 1.4, 0, TAU); g.fill(); g.restore();
        } else {
          ell(g, bx, by + dip - 3, 5, 5, '#F2F2F2'); g.fillStyle = '#E2584E'; g.beginPath(); g.arc(bx, by + dip - 5, 5, Math.PI, 0); g.fill();
          if (st === 'bite') { g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(bx, by + 2, 12 + (t / 30) % 10, 4, 0, 0, TAU); g.stroke(); g.fillStyle = '#2B2140'; g.font = '700 15px Lora, Georgia, serif'; g.textAlign = 'center'; g.fillText('Reel in!', bx, by - 18); }
        }
      }
      g.fillStyle = 'rgba(40,30,20,.55)'; g.beginPath(); if (g.roundRect) g.roundRect(8, H - 28, 190, 20, 8); else g.rect(8, H - 28, 190, 20); g.fill(); g.fillStyle = '#FFF6E0'; g.font = '600 12px Lora, Georgia, serif'; g.textAlign = 'left'; g.fillText('Fish said hello to today: ' + count, 16, H - 14);
    }
    api.frames(function (dt) {
      var s = dt / 1000; t += api.still() ? 0 : dt; stT += s;
      if (st === 'fly') { fly += s * 1.6; if (fly >= 1) { st = 'wait'; stT = 0; api.audio.plop(); } }
      else if (st === 'wait') { wait -= s; if (wait <= 0) { st = 'bite'; stT = 0; say.textContent = 'The bobber dips! Something is nibbling. Reel in!'; setBtn('Reel in!', false); if (api.audio.on) api.audio.tone(api.audio.note(3), 0.25, 0.04); } }
      else if (st === 'bite') { if (stT > (api.still() ? 9 : 3.6)) { st = 'gone'; say.textContent = 'It swam off to think about it. Plenty more in the pond.'; setBtn('Cast again', false); } }
      draw();
    });
    setBtn('Cast the line', false); draw();
  } });

  // ---------- 3. the zen garden, with Sugarfoot ----------
  BD.offer({ id: 'zengarden', kind: 'Rake', title: 'The zen garden with Sugarfoot', mount: function (host, api) {
    host.innerHTML = '<p class="od-note">Sugarfoot has her rake and the sand is smooth. Drag across the sand to rake your own lines, tap to set a stone, or let Sugarfoot rake a pattern while you watch.</p>';
    var C = canvas(host, 480, 300, 'A raked sand garden with a few stones. Sugarfoot walks slowly with a wooden rake.');
    var row = document.createElement('div'); row.className = 'od-row';
    row.innerHTML = '<button type="button" class="bd-go" id="od-zp">Sugarfoot’s pattern</button><button type="button" class="bd-pill" id="od-zs">Set a stone</button><button type="button" class="bd-pill" id="od-zc">Smooth the sand</button>';
    host.appendChild(row);
    var say = document.createElement('p'); say.className = 'od-note od-say'; say.setAttribute('aria-live', 'polite'); host.appendChild(say);
    var g = C.g, W = C.w, H = C.h, t = 0, lines = [], stones = [[150, 120, 18], [340, 190, 24]], sug = { x: 420, y: 250, face: -1, ph: 0 }, path = null, pi = 0, cur = null;
    var PATTERNS = ['waves', 'rings', 'lines', 'spiral'];
    function ringsAround(st) { var out = []; for (var r = st[2] + 12; r < st[2] + 46; r += 9) { var pts = []; for (var a = 0; a <= 40; a++) { var an = a / 40 * TAU; pts.push([st[0] + Math.cos(an) * r * 1.25, st[1] + Math.sin(an) * r * 0.75]); } out.push(pts); } return out; }
    function makePattern(kind) {
      var strokes = [];
      if (kind === 'waves') for (var y = 40; y < H - 20; y += 22) { var p = []; for (var x = 16; x <= W - 16; x += 8) p.push([x, y + Math.sin(x / 38 + y) * 7]); strokes.push(p); }
      else if (kind === 'lines') for (var y2 = 36; y2 < H - 16; y2 += 18) { strokes.push([[16, y2], [W - 16, y2]]); }
      else if (kind === 'spiral') { var p2 = []; for (var a = 0; a < 46; a += 0.12) p2.push([W / 2 + Math.cos(a) * a * 4.6, H / 2 + Math.sin(a) * a * 2.8]); strokes.push(p2.filter(function (q) { return q[0] > 10 && q[0] < W - 10 && q[1] > 10 && q[1] < H - 10; })); }
      else stones.forEach(function (st) { strokes = strokes.concat(ringsAround(st)); });
      return strokes;
    }
    function smooth() { lines = []; }
    function pattern() {
      var k = pick(PATTERNS); if (k !== 'rings') smooth();
      var strokes = makePattern(k); path = []; strokes.forEach(function (s) { path.push({ jump: true }); s.forEach(function (p) { path.push(p); }); }); pi = 0; cur = null;
      say.textContent = { waves: 'Sugarfoot rakes long, slow waves across the garden.', rings: 'Sugarfoot rakes ripples around each stone, like rain on a pond.', lines: 'Sugarfoot rakes straight, even lines, one after another.', spiral: 'Sugarfoot walks a slow spiral out from the middle.' }[k];
      if (api.still()) { strokes.forEach(function (s) { lines.push(s); }); path = null; }
    }
    function avoidStones(p) { for (var i = 0; i < stones.length; i++) { var st = stones[i]; if (Math.hypot((p[0] - st[0]) / 1.25, (p[1] - st[1]) / 0.75) < st[2] + 4) return false; } return true; }
    $('#od-zp', host).addEventListener('click', pattern);
    $('#od-zc', host).addEventListener('click', function () { smooth(); path = null; say.textContent = 'Sugarfoot smooths the sand flat again. A fresh page.'; });
    $('#od-zs', host).addEventListener('click', function () { if (stones.length >= 6) stones.shift(); stones.push([60 + rand(W - 120), 50 + rand(H - 100), 14 + rand(14)]); say.textContent = 'A new stone settles into the sand.'; api.audio.plop(); });
    var drawing = null;
    api.drag(C.cv, {
      start: function (e) { var p = pt(C.cv, e, W, H); drawing = [p]; lines.push(drawing); path = null; },
      move: function (dx, dy, e) { if (!drawing) return; var p = pt(C.cv, e, W, H), l = drawing[drawing.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 4) { drawing.push(p); sug.tx = p[0]; sug.ty = p[1]; } },
      end: function (e, moved) {
        if (!moved) { lines.pop(); var p = pt(C.cv, e, W, H); if (stones.length >= 6) stones.shift(); stones.push([p[0], p[1], 14 + rand(12)]); say.textContent = 'You set a stone. Sugarfoot nods at it, approving.'; api.audio.plop(); }
        else say.textContent = pick(['Sugarfoot follows your line with her own rake, a paw-width behind.', 'A good line. Sugarfoot looks pleased.', 'Sugarfoot rakes beside you, slow and steady.']);
        drawing = null;
      }
    });
    function rakeStroke(s) {
      if (s.length < 2) return;
      [-5, 0, 5].forEach(function (o) {
        g.strokeStyle = 'rgba(150,130,96,.55)'; g.lineWidth = 1.6; g.beginPath();
        for (var i = 0; i < s.length; i++) { var p = s[i], q = s[Math.min(s.length - 1, i + 1)], r = s[Math.max(0, i - 1)], dx = q[0] - r[0], dy = q[1] - r[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d * o, ny = dx / d * o; if (!avoidStones(p)) { g.stroke(); g.beginPath(); continue; } if (i) g.lineTo(p[0] + nx, p[1] + ny); else g.moveTo(p[0] + nx, p[1] + ny); }
        g.stroke();
      });
    }
    function draw() {
      g.fillStyle = '#EDE3CC'; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(0,0,0,.025)'; for (var i = 0; i < 160; i++) g.fillRect((i * 97) % W, (i * 53) % H, 2, 2);
      lines.forEach(rakeStroke);
      stones.forEach(function (st) { ell(g, st[0] + 3, st[1] + st[2] * 0.4, st[2] * 1.3, st[2] * 0.45, 'rgba(0,0,0,.15)'); ell(g, st[0], st[1], st[2] * 1.2, st[2] * 0.75, '#8E887C'); ell(g, st[0] - st[2] * 0.3, st[1] - st[2] * 0.25, st[2] * 0.5, st[2] * 0.25, '#ABA597'); });
      g.strokeStyle = '#7A5A3A'; g.lineWidth = 6; g.strokeRect(0, 0, W, H);
      // Sugarfoot and her rake
      // sug.x, sug.y is where the rake touches the sand; Sugarfoot walks just behind it, always inside the garden
      var bx = clamp(sug.x - sug.face * 34, 26, W - 26), by = clamp(sug.y + 26, 46, H - 8);
      g.strokeStyle = '#8A6340'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(bx + sug.face * 14, by - 24); g.lineTo(sug.x, sug.y); g.stroke();
      g.save(); g.translate(sug.x, sug.y); g.rotate(Math.atan2(sug.y - (by - 24), sug.x - (bx + sug.face * 14)) - Math.PI / 2); g.fillStyle = '#8A6340'; g.fillRect(-9, 0, 18, 3); for (var k = -8; k <= 8; k += 4) g.fillRect(k, 3, 1.5, 5); g.restore();
      pup(g, 'sugarfoot', bx, by, 1.0, sug.face, sug.moving ? 'run' : 'sit', t, sug.ph);
    }
    api.frames(function (dt) {
      var s = dt / 1000; if (!api.still()) t += dt;
      sug.moving = false;
      if (path && pi < path.length && !api.still()) {
        var target = path[pi];
        if (target.jump) { cur = []; lines.push(cur); pi++; }
        else {
          var dx = target[0] - sug.x, dy = target[1] - sug.y, d = Math.hypot(dx, dy), sp = (cur && cur.length ? 150 : 320) * s;   // a quick walk to where the next line starts, then a slow rake
          if (d <= sp) { sug.x = target[0]; sug.y = target[1]; cur.push([target[0], target[1]]); pi++; } else { sug.x += dx / d * sp; sug.y += dy / d * sp; sug.ph += s * 10; sug.moving = true; if (Math.abs(dx) > 1) sug.face = dx > 0 ? 1 : -1; if (cur.length) cur.push([sug.x, sug.y]); }
        }
        if (pi >= path.length) { path = null; say.textContent = 'Sugarfoot sets down her rake and admires the garden. Your turn, if you like.'; }
      } else if (sug.tx != null && !api.still()) {
        var ex = sug.tx - sug.x, ey = sug.ty - sug.y, dd = Math.hypot(ex, ey);
        if (dd > 6) { sug.x += ex / dd * Math.min(dd, 110 * s); sug.y += ey / dd * Math.min(dd, 110 * s); sug.ph += s * 10; sug.moving = true; if (Math.abs(ex) > 2) sug.face = ex > 0 ? 1 : -1; }
        sug.x = clamp(sug.x, 10, W - 10); sug.y = clamp(sug.y, 10, H - 10);
      }
      draw();
    });
    lines = makePattern('rings'); draw();
    say.textContent = 'Sugarfoot has raked ripples around the stones. Rake your own, or ask for her pattern.';
  } });

  // ---------- straight there from the grounds ----------
  function boot() {
    var acts = $('.bd-actions'); if (!acts || $('#bd-pals')) return;
    var box = document.createElement('div'); box.className = 'bd-pals'; box.id = 'bd-pals';
    box.innerHTML = '<p class="bd-pals-k">With Tidbit and Sugarfoot</p><div class="bd-actions">' +
      '<button type="button" class="bd-pill" data-pal="splash">💦 Splash in the stream</button>' +
      '<button type="button" class="bd-pill" data-pal="fish">🎣 Fish with Tidbit</button>' +
      '<button type="button" class="bd-pill" data-pal="zengarden">🪨 The zen garden with Sugarfoot</button></div>';
    acts.parentNode.insertBefore(box, acts.nextSibling);
    box.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-pal]'); if (b && BD.enterTo) BD.enterTo(b.getAttribute('data-pal')); });
  }
  if (BD.ready) boot(); else document.addEventListener('bears-dojo-ready', boot);
})();
