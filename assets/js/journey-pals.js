/* journey-pals.js — Tidbit and Sugarfoot romping all over the Frequency Journey's landing
   page: they race between the cards, hop from one to the next, and stop to play (a hug, a
   high five, a play bow, a roll, a spin, a nap, digging, or a flight in their capes), with
   their names popping up. Tap one and she bounces. Drawn by pups.js. Nothing is stored or sent. */
(function () {
  'use strict';
  var P = window.TOLPups; if (!P) return;
  var cv = document.createElement('canvas');
  cv.className = 'jp-canvas'; cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  var ctx = cv.getContext('2d'), W = 0, H = 0, DPR = 1;
  function resize() { DPR = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
  resize(); addEventListener('resize', resize);

  var PALS = [
    { name: 'Tidbit', look: P.looks.collar, cape: '#7C97E8', x: 0, y: 0, face: 1, tag: 0 },
    { name: 'Sugarfoot', look: P.looks.drop, cape: '#E4566E', x: 0, y: 0, face: 1, tag: 0 }
  ];
  function sc() { return W < 600 ? 0.72 : 0.95; }
  var ACTS = ['hug', 'five', 'bow', 'roll', 'spin', 'nap', 'dig', 'hug', 'five', 'cape', 'chase', 'wiggle'];

  // spots to play on: the top edges of the page's cards that are on screen
  function spots() {
    var out = [];
    Array.prototype.forEach.call(document.querySelectorAll('[data-romp]'), function (el) {
      var r = el.getBoundingClientRect();
      if (r.width < 120 || r.top < 70 || r.top > H - 40) return;
      out.push({ el: el, x0: r.left + 30, x1: r.right - 30, y: r.top + scrollY });
    });
    return out;
  }
  var S = { mode: 'run', t0: 0, until: 0, from: null, to: null, act: null, lastT: 0 };
  var sparks = [];
  function burst(x, y, n, kind) { for (var i = 0; i < n; i++) sparks.push({ x: x, y: y, vx: (Math.random() - 0.5) * 1.6, vy: -0.6 - Math.random() * 1.2, life: 1, k: kind || 'heart' }); }

  function pickTarget(now) {
    var sp = spots();
    if (!sp.length) { S.mode = 'wait'; S.until = now + 800; return; }
    var s = sp[Math.floor(Math.random() * sp.length)], x = s.x0 + Math.random() * Math.max(10, s.x1 - s.x0);
    // if they've been scrolled out of view, they come running in from the nearest side
    PALS.forEach(function (p, i) {
      var vy = p.y - scrollY;
      if (!p.x || vy < -60 || vy > H + 60) { p.x = x < W / 2 ? -40 - i * 40 : W + 40 + i * 40; p.y = s.y; }
    });
    S.from = PALS.map(function (p) { return [p.x, p.y]; });
    S.to = [x, s.y];
    S.act = Math.random() < 0.12 ? 'cape' : null;
    var d = Math.hypot(x - PALS[0].x, s.y - PALS[0].y);
    S.mode = 'run'; S.t0 = now; S.until = now + Math.max(900, Math.min(3200, d * (S.act === 'cape' ? 5 : 7)));
  }
  function play(now) {
    S.mode = 'play'; S.act = ACTS[Math.floor(Math.random() * ACTS.length)]; S.t0 = now; S.until = now + (S.act === 'nap' ? 5200 : 3400);
    PALS.forEach(function (p) { p.tag = now; });
    if (S.act === 'hug' || S.act === 'five') setTimeout(function () { burst(S.to[0], S.to[1] - 70 * sc(), S.act === 'hug' ? 3 : 8, S.act === 'hug' ? 'heart' : 'spark'); }, 900);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    var dt = S.lastT ? Math.min(60, now - S.lastT) : 16; S.lastT = now;
    ctx.clearRect(0, 0, W, H);
    if (P.reduced) { still(now); return; }
    if (!S.to) pickTarget(now);
    if (now > S.until) { if (S.mode === 'run') play(now); else pickTarget(now); }
    var k = Math.min(1, (now - S.t0) / Math.max(1, S.until - S.t0)), s = sc();
    PALS.forEach(function (p, i) {
      var pose = 'sit', ph = now / 90 + i * 1.7, lift = 0, rear = 0, tilt = 0, wag = Math.sin(now / 90 + i) * 0.5, flying = false;
      var off = (i ? -1 : 1) * 26 * s; // side by side, facing each other when they stop
      if (S.mode === 'run' && S.from) {
        var lag = i ? 0.08 : 0, kk = Math.max(0, Math.min(1, (k - lag) / (1 - lag))), e = kk * kk * (3 - 2 * kk);
        var fx = S.from[i][0], fy = S.from[i][1], tx = S.to[0] + off, ty = S.to[1];
        p.x = fx + (tx - fx) * e; p.y = fy + (ty - fy) * e;
        var arc = S.act === 'cape' ? Math.max(140, Math.abs(ty - fy) * 0.6 + 120) : Math.max(18, Math.abs(ty - fy) * 0.45);
        lift = Math.sin(kk * Math.PI) * arc * (kk > 0 && kk < 1 ? 1 : 0);
        if (Math.abs(tx - fx) > 2) p.face = tx > fx ? 1 : -1;
        pose = 'run'; flying = S.act === 'cape' && kk > 0.05 && kk < 0.95;
        if (flying) ph = Math.PI / 2 + Math.sin(now / 260) * 0.15;
        if (!flying && kk < 1) lift += Math.abs(Math.sin(ph)) * 3;
      } else if (S.mode === 'play') {
        var q = Math.min(1, (now - S.t0) / (S.until - S.t0)), a = S.act;
        p.face = i ? 1 : -1; // Tidbit on the right faces left, Sugarfoot on the left faces right
        if (a === 'hug') { rear = Math.sin(Math.min(1, q * 1.4) * Math.PI) * 0.55; pose = 'sit'; }
        else if (a === 'five') { var f = q < 0.3 ? 0 : q < 0.5 ? (q - 0.3) / 0.2 : q < 0.62 ? 1 : q < 0.8 ? 1 - (q - 0.62) / 0.18 : 0; rear = f * 0.7; pose = f ? 'sit' : 'run'; if (!f) ph = 0; }
        else if (a === 'bow') { pose = i ? 'bow' : 'run'; if (!i) { ph = 0; lift = Math.abs(Math.sin(now / 180)) * 10; } }
        else if (a === 'roll') { pose = i === 0 && q > 0.2 && q < 0.8 ? 'wiggle' : 'sit'; }
        else if (a === 'spin') { pose = 'run'; p.face = Math.cos(now / 140 + i); ph = now / 60; }
        else if (a === 'nap') { pose = 'lie'; wag *= 0.15; }
        else if (a === 'dig') { pose = i ? 'bow' : 'sit'; if (i && Math.random() < 0.3) burst(p.x - p.face * 18 * s, p.y - 4, 1, 'dirt'); tilt = i ? 0 : 0.35; }
        else if (a === 'chase') { var ang = now / 400 + i * Math.PI; p.x = S.to[0] + Math.cos(ang) * 40 * s; p.face = -Math.sin(ang) >= 0 ? 1 : -1; pose = 'run'; lift = Math.abs(Math.sin(ph)) * 3; }
        else if (a === 'wiggle') { pose = 'wiggle'; }
        else pose = 'sit';
        if (a !== 'chase' && a !== 'spin') p.x += ((S.to[0] + off) - p.x) * 0.2;
      }
      // tapped: a happy bounce
      if (p.tap && now - p.tap < 900) { lift += Math.abs(Math.sin((now - p.tap) / 150)) * 16; pose = 'run'; ph = 0; }
      var vx = p.x, vy = p.y - scrollY;
      if (vy < -80 || vy > H + 80) return;
      p.vx = vx; p.vy = vy - lift - 24 * s;
      ctx.save(); ctx.translate(vx, vy - lift);
      ctx.fillStyle = 'rgba(40,30,60,0.12)'; ctx.beginPath(); ctx.ellipse(0, lift + 1, 20 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
      var fc = Math.abs(p.face) < 0.15 ? (p.face < 0 ? -0.15 : 0.15) : p.face;
      ctx.scale(s * fc, s);
      if (rear) ctx.rotate(-rear);
      if (flying) P.cape(ctx, p.look, now, p.cape, true);
      if (S.mode === 'play' && S.act === 'roll' && i === 0) { var rr = Math.sin(Math.min(1, (now - S.t0) / (S.until - S.t0) * 1.25) * Math.PI); ctx.translate(0, -12 - 12 * rr); ctx.rotate(Math.PI * 0.9 * rr); ctx.translate(0, 12); }
      P.draw(ctx, p.look, pose === 'run' && ph === 0 ? 'run' : pose, ph, wag, Math.sin(now / 1000 + 2 + i * 3) > 0.985, now, tilt);
      ctx.restore();
      if (S.mode === 'play' && S.act === 'nap' && i === 1) zzz(vx, vy - 44 * s, now);
      // name tags when they stop (and when tapped)
      var since = Math.max(S.mode === 'play' ? now - p.tag : -1, p.tap ? 2200 - (now - p.tap) : -1);
      var tagA = S.mode === 'play' ? Math.min(1, (now - p.tag) / 300) * (now - p.tag < 2600 ? 1 : Math.max(0, 1 - (now - p.tag - 2600) / 400)) : 0;
      if (p.tap && now - p.tap < 2000) tagA = Math.max(tagA, 1 - Math.max(0, (now - p.tap - 1600) / 400));
      if (tagA > 0.02) tag(p.name, vx + (S.mode === 'play' ? (i ? -1 : 1) * 16 : 0), vy - lift - 64 * s - (S.mode === 'play' ? 0 : i * 22), tagA);
    });
    // hearts and sparkles
    for (var j = sparks.length - 1; j >= 0; j--) {
      var sp = sparks[j]; sp.x += sp.vx * dt * 0.06; sp.y += sp.vy * dt * 0.06; sp.life -= dt / 1100;
      if (sp.life <= 0) { sparks.splice(j, 1); continue; }
      var yy = sp.y - scrollY; ctx.globalAlpha = sp.life;
      if (sp.k === 'heart') { ctx.fillStyle = '#F29AB2'; heart(sp.x, yy, 5); }
      else if (sp.k === 'spark') { ctx.fillStyle = '#F4D26B'; ctx.beginPath(); ctx.arc(sp.x, yy, 2.4, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.fillStyle = '#A98A5C'; ctx.beginPath(); ctx.arc(sp.x, yy, 1.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  }
  function heart(x, y, r) { ctx.beginPath(); ctx.moveTo(x, y + r * 0.9); ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.5, x, y - r * 0.5); ctx.bezierCurveTo(x + r * 0.7, y - r * 1.5, x + r * 1.6, y - r * 0.2, x, y + r * 0.9); ctx.fill(); }
  function tag(t, x, y, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.font = '600 12px Lora, Georgia, serif';
    var w = ctx.measureText(t).width + 16;
    ctx.fillStyle = 'rgba(255,253,248,0.95)'; ctx.strokeStyle = 'rgba(185,160,224,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w / 2, y - 11, w, 22, 11) : ctx.rect(x - w / 2, y - 11, w, 22); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5B4A86'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y + 1);
    ctx.restore();
  }
  function zzz(x, y, now) {
    ctx.font = 'italic 14px Georgia, serif'; ctx.textAlign = 'center';
    for (var j = 0; j < 3; j++) { var age = (now + j * 900) % 2700, a = Math.sin(Math.PI * age / 2700); ctx.fillStyle = 'rgba(120,100,170,' + (a * 0.8).toFixed(2) + ')'; ctx.fillText('z', x + age / 2700 * 18 + j * 3, y - age / 2700 * 30); }
  }
  // for anyone who asks for less motion: the two of them sitting together by the title
  function still(now) {
    var h = document.querySelector('.jl-hero'); if (!h) return;
    var r = h.getBoundingClientRect(), s = sc();
    PALS.forEach(function (p, i) {
      ctx.save(); ctx.translate(r.right - 70 - i * 44 * s, r.bottom - 8); ctx.scale(s * (i ? 1 : -1), s);
      P.draw(ctx, p.look, 'sit', 0, 0, false, now, 0); ctx.restore();
    });
  }
  // tap one of them (anywhere a pal is standing) for a bounce and her name
  document.addEventListener('pointerdown', function (e) {
    PALS.forEach(function (p) { if (p.vx != null && Math.hypot(p.vx - e.clientX, p.vy - e.clientY) < 34) { p.tap = performance.now(); burst(p.x, p.y - 60 * sc(), 4, 'heart'); } });
  }, { passive: true });
  requestAnimationFrame(frame);
})();
