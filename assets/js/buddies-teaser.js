/* buddies-teaser.js — the Frequency Buddies Season 2 teaser (frequency-buddies-season-2.html).
   About a minute, trailer style: a quiet cold open, quick cuts of new places with a drum hit at each one,
   title cards, a shadowy new friend, two funny moments, a heartfelt one, the big reveal with a little of
   the theme song, and a short gag after the credits. Everything is drawn on a canvas and every frame is a
   pure function of the time, so it can be paused, replayed, seeked and rendered to a video.
   It draws the pals with pups.js (window.TOLPups). The music is made right here with Web Audio, plus the
   pals' own recorded "arf"s and laughs and a few seconds of the recorded theme song.
   A small game rides along: five secrets are hidden in the cuts. Tap them while it plays (or paused) to
   find them; what you've found is remembered on this device only (localStorage, nothing is sent).
   The calm version (Keep the page still, or reduced motion) cross-fades instead of cutting, never slams
   or shakes, and drops the fast flurry. Light never changes quickly, in either version.
   window.TOLTeaser exposes play/pause/seek/state/renderAt/renderAudio for tests and the video render. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  var VW = 640, VH = 360, TAU = Math.PI * 2;
  var KEY = 'tol-fb-s2-teaser';
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mix(a, b, p) { return a + (b - a) * p; }
  function eout(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
  function eio(p) { p = clamp(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function sio(p) { p = clamp(p, 0, 1); return 0.5 - 0.5 * Math.cos(Math.PI * p); }
  function backOut(p) { p = clamp(p, 0, 1); var c = 1.70158; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); }
  function bump(p) { p = clamp(p, 0, 1); return Math.sin(Math.PI * p); }
  function rnd(i) { var x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
  function win(u, a, b, f) { f = f || 0.25; return clamp((u - a) / f, 0, 1) * clamp((b - u) / f, 0, 1); }

  // ---------------------------------------------------------------- drawing helpers
  function rr(g, x, y, w, h, r, col) { g.fillStyle = col; g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); }
  function circ(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, Math.max(0.01, r), 0, TAU); g.fill(); }
  function ell(g, x, y, rx, ry, col, rot) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); g.fill(); }
  function line(g, x1, y1, x2, y2, col, w) { g.strokeStyle = col; g.lineWidth = w || 1.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  function star(g, x, y, r, col, rot) { g.fillStyle = col; g.beginPath(); for (var i = 0; i < 10; i++) { var a = (rot || 0) - Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); g.fill(); }
  function heart(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.moveTo(x, y + r * 0.9); g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.5, x, y - r * 0.5); g.bezierCurveTo(x + r * 0.7, y - r * 1.5, x + r * 1.6, y - r * 0.2, x, y + r * 0.9); g.fill(); }
  function lin(g, x0, y0, x1, y1, stops) { var gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); }); return gr; }
  function sky(g, stops, h) { g.fillStyle = lin(g, 0, 0, 0, h || VH, stops); g.fillRect(-60, -60, VW + 120, (h || VH) + 120); }
  function glow(g, x, y, r, col, a) { if (a <= 0) return; var gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(' + col + ',' + a.toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  function puff(g, x, y, s, col) { g.fillStyle = col; g.beginPath(); [[0, 0, 22], [24, -10, 26], [50, -2, 22], [70, 6, 16], [-18, 8, 15]].forEach(function (p) { g.moveTo(x + (p[0] + p[2]) * s, y + p[1] * s); g.arc(x + p[0] * s, y + p[1] * s, p[2] * s, 0, TAU); }); g.rect(x - 18 * s, y + 4 * s, 88 * s, 18 * s); g.fill(); }
  function note(g, x, y, s, col) { g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 1.8 * s; g.beginPath(); g.ellipse(x, y, 4 * s, 3 * s, -0.4, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x + 3.6 * s, y - 1); g.lineTo(x + 3.6 * s, y - 15 * s); g.quadraticCurveTo(x + 8 * s, y - 11 * s, x + 9 * s, y - 7 * s); g.stroke(); }
  function paw(g, x, y, s, col) { ell(g, x, y + 2 * s, 4.2 * s, 3.4 * s, col); [[-4.4, -3.2], [-1.5, -5.6], [1.5, -5.6], [4.4, -3.2]].forEach(function (p) { ell(g, x + p[0] * s, y + p[1] * s, 1.6 * s, 2 * s, col); }); }
  function stars(g, n, seed, t, h, calm) { for (var i = 0; i < n; i++) { var tw = calm ? 0.8 : 0.55 + 0.45 * Math.sin(t * 1.4 + i * 1.7); circ(g, rnd(i + seed) * VW, rnd(i + seed + 300) * (h || 220), 0.5 + rnd(i + seed + 600) * 1.3, 'rgba(255,250,235,' + (0.35 + 0.6 * rnd(i + seed + 900)) * tw + ')'); } }
  function font(g, w, size, fam) { g.font = w + ' ' + size + 'px ' + (fam || 'Fraunces, Georgia, serif'); }
  function spacing(g, px) { if ('letterSpacing' in g) g.letterSpacing = px + 'px'; }

  // ---------------------------------------------------------------- the pals (pups.js), with hats and helmets
  // pup(g, who, x, y, s, o): o = { face, pose, t, wag, tilt, ear, blink, ph, rot, over(g), cape, capeFly };
  // returns the top of the head, in the current coordinates, for speech bubbles.
  function pup(g, who, x, y, s, o) {
    var P = window.TOLPups; o = o || {}; if (!P) return { x: x, y: y - 60 * s };
    var L = P.looks[who === 'tidbit' ? 'collar' : 'drop'], pose = o.pose || 'sit', face = o.face || 1, t = o.t || 0;
    var lean = L.build === 'lean', BY = lean ? -21 : -18.5;
    var hx = pose === 'lie' ? 19 : pose === 'sit' ? 18 : pose === 'bow' ? 22 : 21, hy = pose === 'lie' ? -19 : pose === 'sit' ? -38 : pose === 'bow' ? -14 : BY - 12;
    var lift = o.lift || 0;
    // a soft shadow under the paws
    if (!o.noShadow) ell(g, x, y + 1, 21 * s, 3.4 * s, 'rgba(30,20,50,' + (0.18 * clamp(1 - lift / 60, 0.3, 1)).toFixed(3) + ')');
    g.save(); g.translate(x, y - lift); if (o.rot) g.rotate(o.rot); g.scale(s * face, s * (o.sy || 1));
    if (o.cape) P.cape(g, L, t * 1000, o.cape, !!o.capeFly);
    var blink = o.blink != null ? o.blink : ((t + (who === 'tidbit' ? 0 : 1.7)) % 3.9) < 0.12;
    P.draw(g, L, pose, o.ph || 0, o.wag != null ? o.wag : Math.sin(t * 9 + (who === 'tidbit' ? 0 : 2)) * 0.5, blink, t * 1000, o.tilt || 0, { ear: o.ear || 0 });
    if (o.reach) { // a front paw stretched out to hold a pal's paw
      var ex = 12 + o.reach, ey = -14 - (o.reachUp || 0);
      g.lineCap = 'round'; g.strokeStyle = '#252120'; g.lineWidth = 6; g.beginPath(); g.moveTo(10, -24); g.quadraticCurveTo(16, -16, 12 + o.reach * 0.5, ey + 1); g.stroke();
      g.strokeStyle = L.legLow; g.lineWidth = 5; g.beginPath(); g.moveTo(12 + o.reach * 0.45, ey + 1); g.lineTo(ex - 2, ey); g.stroke();
      ell(g, ex, ey, 4, 3, L.paw); g.lineCap = 'butt';
    }
    g.translate(hx, hy); g.rotate(o.tilt || 0);
    if (o.over) o.over(g, t);
    g.restore();
    var ang = o.rot || 0, lx = hx * face * s, ly = (hy - 14) * s;
    return { x: x + lx * Math.cos(ang) - ly * Math.sin(ang), y: y - lift + lx * Math.sin(ang) + ly * Math.cos(ang), who: who };
  }
  // accessories, drawn in head space (head centre at 0,0, radius 11, facing right)
  var HAT = {
    beanie: function (col) { return function (g) { g.fillStyle = col; g.beginPath(); g.arc(1, -6, 11.5, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fill(); rr(g, -11, -8, 24, 5, 2.5, 'rgba(255,255,255,.8)'); circ(g, 1, -18.5, 4.2, '#FFFFFF'); }; },
    explorer: function (g) { ell(g, 1, -9, 19, 4.5, '#C9A26A'); g.fillStyle = '#DDB97E'; g.beginPath(); g.ellipse(1, -10, 12, 11, 0, Math.PI, TAU); g.fill(); rr(g, -11, -12, 24, 3.4, 1.5, '#8A5A3A'); },
    goggles: function (g) { rr(g, -11, -11, 22, 3, 1.5, '#6B4A3A'); circ(g, -3, -10, 4.2, '#8A6343'); circ(g, 6, -10, 4.2, '#8A6343'); circ(g, -3, -10, 2.8, '#BFE7F5'); circ(g, 6, -10, 2.8, '#BFE7F5'); circ(g, -4, -11, 0.9, '#fff'); circ(g, 5, -11, 0.9, '#fff'); },
    helmet: function (g, t) { // a glass bubble helmet (under the sea, or out in space)
      g.fillStyle = 'rgba(200,235,255,.18)'; g.beginPath(); g.arc(3, 1, 19, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(235,248,255,.85)'; g.lineWidth = 1.6; g.beginPath(); g.arc(3, 1, 19, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.beginPath(); g.arc(3, 1, 14.5, Math.PI * 1.15, Math.PI * 1.45); g.stroke();
    },
    space: function (g, t) { HAT.helmet(g, t); line(g, 3, -18, 5 + Math.sin(t * 6) * 2, -29, '#C9C9D6', 1.4); circ(g, 5 + Math.sin(t * 6) * 2, -30, 2.8, '#E4566E'); rr(g, -13, 15, 32, 5, 2.5, '#C9C9D6'); }
  };

  // ---------------------------------------------------------------- per-frame records: speech bubbles and secrets in canvas pixels
  var FR = { says: [], secrets: [], narr: [] };
  function px(g, x, y) { var m = g.getTransform(); return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f, k: Math.hypot(m.a, m.b) }; }
  // a line of dialogue, shown from u0 to u1 over the speaker's head (o: { big, dx })
  function say(g, head, text, u, u0, u1, o) { if (u < u0 || u > u1) return; var p = px(g, head.x, head.y); FR.says.push({ dur: u1 - u0, who: head.who || 'tidbit', x: p.x, y: p.y, text: text, a: clamp((u - u0) / 0.12, 0, 1) * clamp((u1 - u) / 0.14, 0, 1), pop: (u - u0), o: o || {} }); live(text); }
  // the trailer announcer: a line across the top of the picture, typed out, and read aloud by the player (draw: false = read aloud only)
  function narr(text, u, u0, u1, draw) { if (u < u0 || u > u1) return; FR.narr.push({ text: text, u: u - u0, a: clamp((u - u0) / 0.2, 0, 1) * clamp((u1 - u) / 0.25, 0, 1), draw: draw !== false }); live(text); }
  var SECRETS = [
    { id: 'star', name: 'The star sticker', where: 'balloon', hint: 'Look closely at the balloon basket, way up above the clouds.' },
    { id: 'paw', name: 'The paw print', where: 'library', hint: 'Check the book spines in the library, next to the secret door.' },
    { id: 'note', name: 'The music note', where: 'market', hint: 'Look up at the lanterns over the night market.' },
    { id: 'duck', name: 'The rubber duck', where: 'underwater', hint: 'Peek into the coral at the bottom of the sea.' },
    { id: 'heart', name: 'The tiny heart', where: 'rooftop', hint: 'Look up at the stars from the rooftop, high on the right.' }
  ];
  function secret(g, id, x, y, r) { var p = px(g, x, y); FR.secrets.push({ id: id, x: p.x, y: p.y, r: r * p.k }); }

  // ---------------------------------------------------------------- the places
  function backyard(g, t, o) { // night in the backyard, from Season 1, with the treehouse
    o = o || {};
    sky(g, [[0, '#121838'], [0.62, '#33306A'], [1, '#6E5688']], 290);
    stars(g, 70, 11, t, 210, o.calm);
    // the moon
    circ(g, 548, 62, 20, '#FFF4D2'); circ(g, 557, 56, 18, '#2A2A5E'); glow(g, 545, 64, 70, '255,240,200', 0.12);
    // the mysterious glow behind the far hill
    if (o.glow > 0) { glow(g, 470, 262, 210, '255,214,140', 0.55 * o.glow); glow(g, 470, 262, 90, '190,250,235', 0.5 * o.glow); }
    g.fillStyle = '#2A2852'; g.beginPath(); g.moveTo(-60, 285); g.quadraticCurveTo(180, 238, 360, 268); g.quadraticCurveTo(470, 232, 700, 262); g.lineTo(700, 400); g.lineTo(-60, 400); g.fill();
    // the tree and the treehouse
    rr(g, 52, 120, 26, 190, 8, '#231D3A');
    [[64, 92, 62], [20, 120, 44], [110, 118, 46], [64, 60, 40]].forEach(function (c) { circ(g, c[0], c[1], c[2], '#1F2A3E'); });
    rr(g, 40, 140, 70, 46, 4, '#3A2C40'); g.fillStyle = '#4A3448'; g.beginPath(); g.moveTo(32, 142); g.lineTo(75, 112); g.lineTo(118, 142); g.fill();
    rr(g, 64, 152, 20, 18, 3, '#FFD98A'); glow(g, 74, 161, 40, '255,210,120', 0.35);
    // the fence
    for (var i = 0; i < 18; i++) rr(g, 140 + i * 30, 252, 12, 46, 3, '#3B3560');
    rr(g, 136, 262, 540, 6, 2, '#3B3560'); rr(g, 136, 282, 540, 6, 2, '#3B3560');
    // grass
    g.fillStyle = lin(g, 0, 288, 0, 360, [[0, '#2E4A44'], [1, '#1B2E2E']]); g.fillRect(-60, 288, VW + 120, 120);
    for (var j = 0; j < 40; j++) { var gx = rnd(j + 40) * VW, gy = 292 + rnd(j + 80) * 60; line(g, gx, gy, gx + 2, gy - 6, 'rgba(120,170,140,.35)', 1.2); }
    // fireflies
    for (var f = 0; f < 14; f++) { var fx = rnd(f + 5) * VW + Math.sin(t * 0.5 + f) * 22, fy = 170 + rnd(f + 9) * 120 + Math.sin(t * 0.8 + f * 2) * 12, fa = o.calm ? 0.7 : 0.5 + 0.5 * Math.sin(t * 1.6 + f * 3); glow(g, fx, fy, 9, '255,240,150', 0.45 * fa); circ(g, fx, fy, 1.4, 'rgba(255,248,190,' + fa + ')'); }
  }
  function coldOpen(g, u, d, calm) {
    var perk = sio((u - 3.85) / 0.35), up = u > 4.55, gl = sio((u - 3.7) / 2.2) * (calm ? 1 : 0.88 + 0.12 * Math.sin(u * 2.2));
    var z = mix(1, 1.13, sio(u / d)), sh = calm ? 0 : 1.1 * win(u, 3.7, 6.2, 0.4);
    g.save(); g.translate(330 + Math.sin(u * 37) * sh, 270 + Math.cos(u * 31) * sh); g.scale(z, z); g.translate(-330, -270);
    backyard(g, u, { glow: u > 3.7 ? gl : 0, calm: calm });
    rr(g, 222, 296, 200, 14, 6, '#7C62A8'); rr(g, 222, 296, 200, 4, 3, '#9A84C6');
    var tid, sug;
    if (!up) {
      tid = pup(g, 'tidbit', 262, 304, 1.55, { pose: 'lie', face: 1, t: u, ear: -0.7 * perk, tilt: -0.15 * perk, wag: 0.1 });
      sug = pup(g, 'sugarfoot', 384, 304, 1.55, { pose: 'lie', face: -1, t: u, ear: -0.8 * perk, tilt: -0.15 * perk, wag: 0.1 });
    } else {
      var q = eout((u - 4.55) / 0.3);
      tid = pup(g, 'tidbit', 282, 304, 1.55, { pose: 'sit', face: 1, t: u, ear: -0.7, tilt: -0.08, sy: 0.9 + 0.1 * q, wag: 0.2 });
      sug = pup(g, 'sugarfoot', 366, 304, 1.55, { pose: 'sit', face: 1, t: u, ear: -0.8, tilt: -0.12, sy: 0.9 + 0.1 * q, wag: 0.1 });
    }
    // two little "!"s when the ears go up
    if (u > 3.85 && u < 4.9) { var a = win(u, 3.9, 4.9, 0.12); g.globalAlpha = a; font(g, '800', 22); g.textAlign = 'center'; g.fillStyle = '#FFE08A'; g.fillText('!', tid.x + 4, tid.y - 10 - 4 * eout((u - 3.9) / 0.2)); g.fillText('!', sug.x - 4, sug.y - 10 - 4 * eout((u - 3.9) / 0.2)); g.globalAlpha = 1; }
    say(g, tid, 'Did you hear that?', u, 5.0, 6.55);
    say(g, sug, 'From… out there.', u, 6.6, 8.0);
    g.restore();
  }
  function card(g, u, d, text, o, calm) {
    o = o || {};
    var gr = g.createRadialGradient(320, 180, 20, 320, 180, 420); gr.addColorStop(0, o.c0 || '#3D2C63'); gr.addColorStop(1, o.c1 || '#130D24'); g.fillStyle = gr; g.fillRect(-60, -60, VW + 120, VH + 120);
    for (var i = 0; i < 46; i++) { var x = rnd(i + 3) * VW + Math.sin(u + i) * 6, y = ((rnd(i + 7) * VH - u * (8 + rnd(i) * 14)) % VH + VH) % VH; circ(g, x, y, 0.6 + rnd(i + 11) * 1.6, 'rgba(255,224,160,' + (0.15 + rnd(i + 13) * 0.35) + ')'); }
    narr(text.replace(/\.$/, '…'), u, 0.1, d, false);
    var s = calm ? 1 + 0.03 * u / d : (1 + 0.55 * (1 - eout(u / 0.2))) * (1 + 0.04 * u / d), a = calm ? clamp(u / 0.3, 0, 1) * clamp((d - u) / 0.3, 0, 1) : clamp(u / 0.07, 0, 1);
    g.save(); g.globalAlpha = a; g.translate(320, 180); g.scale(s, s);
    font(g, '700', o.size || 52); spacing(g, 1); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillText(text, 3, 4);
    g.fillStyle = lin(g, 0, -30, 0, 30, [[0, '#FFF6E2'], [1, '#F7C98B']]); g.fillText(text, 0, 0);
    // a soft shine that slides across the words
    var w = g.measureText(text).width, sx = mix(-w / 2 - 80, w / 2 + 80, clamp(u / d, 0, 1));
    g.fillStyle = lin(g, sx - 40, 0, sx + 40, 0, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,.28)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(sx - 40, -6, 80, 4);
    rr(g, -w / 2 * clamp(u / 0.5, 0, 1), 36, w * clamp(u / 0.5, 0, 1), 3, 1.5, 'rgba(247,201,139,.7)');
    spacing(g, 0); g.restore();
  }
  function balloon(g, u, d, calm, zoom) {
    g.save(); g.translate(330, 200); g.scale(1.18, 1.18); g.translate(-330, -200);
    sky(g, [[0, '#7DBEEB'], [0.55, '#BFE0F5'], [1, '#FCD9B8']]);
    glow(g, 96, 78, 120, '255,240,200', 0.6); circ(g, 96, 78, 26, '#FFF3C8');
    for (var b = 0; b < 4; b++) { var bx0 = ((b * 70 + u * 22) % 760) - 60, by0 = 70 + b * 18 + Math.sin(b) * 10, fl = Math.sin(u * 9 + b) * 3; g.strokeStyle = '#5A5A7A'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(bx0 - 6, by0 - fl); g.quadraticCurveTo(bx0 - 3, by0 - 2, bx0, by0); g.quadraticCurveTo(bx0 + 3, by0 - 2, bx0 + 6, by0 - fl); g.stroke(); }
    [[262, 8, 'rgba(255,240,245,.85)', 0.9], [292, 16, 'rgba(255,255,255,.92)', 1.15], [336, 34, '#FFFFFF', 1.4]].forEach(function (L, li) {
      if (li === 2) return;
      for (var i = 0; i < 10; i++) { var x = ((i * 86 - u * L[1]) % 860 + 860) % 860 - 110; puff(g, x, L[0] + Math.sin(i * 2.1) * 8, L[3], L[2]); }
    });
    var bx = 330 + u * 9, by = 118 + Math.sin(u * 1.5) * 4;
    // the envelope: concentric gores, like a striped balloon
    g.save(); g.beginPath(); g.arc(bx, by - 30, 80, Math.PI * 0.82, Math.PI * 2.18); g.quadraticCurveTo(bx + 52, by + 40, bx + 24, by + 74); g.lineTo(bx - 24, by + 74); g.quadraticCurveTo(bx - 52, by + 40, bx - 80 * Math.cos(Math.PI * 0.18), by - 30 + 80 * Math.sin(Math.PI * 0.18)); g.closePath(); g.clip();
    var cols = ['#E4566E', '#F7DC6F', '#7FB8F0', '#F7DC6F', '#E4566E', '#FFF3E0'];
    for (var k = 0; k < 6; k++) ell(g, bx, by - 10, 84 * (1 - k / 6.2), 110, cols[k]);
    ell(g, bx - 34, by - 62, 16, 30, 'rgba(255,255,255,.28)', -0.4);
    g.restore();
    rr(g, bx - 26, by + 72, 52, 7, 3, '#B0485A');
    [[-24, -30], [-8, -12], [8, 12], [24, 30]].forEach(function (r) { line(g, bx + r[0], by + 78, bx + r[1], by + 118, '#7A5A3A', 1.2); });
    // the flame, a soft flicker
    var fl2 = calm ? 1 : 1 + 0.12 * Math.sin(u * 23);
    ell(g, bx, by + 92, 5 * fl2, 10 * fl2, '#F6A04D'); ell(g, bx, by + 94, 2.6, 5.5 * fl2, '#FFE69A');
    // the pals inside the basket (the basket front covers their legs)
    var wind = calm ? 0.2 : 0.35 * Math.sin(u * 13);
    var tid = pup(g, 'tidbit', bx - 14, by + 146, 1.0, { pose: 'sit', face: 1, t: u, ear: -0.5 + wind, over: HAT.goggles, noShadow: true });
    var sug = pup(g, 'sugarfoot', bx + 15, by + 146, 1.0, { pose: 'sit', face: 1, t: u + 1, ear: 0.4 + wind, tilt: -0.1, noShadow: true });
    rr(g, bx - 36, by + 116, 72, 40, 6, '#B9824F'); rr(g, bx - 38, by + 113, 76, 8, 4, '#8E5E36');
    for (var w2 = 0; w2 < 6; w2++) line(g, bx - 34 + w2 * 13.6, by + 122, bx - 34 + w2 * 13.6, by + 154, 'rgba(110,70,40,.4)', 1);
    line(g, bx - 34, by + 136, bx + 34, by + 136, 'rgba(110,70,40,.4)', 1);
    // secret: a star sticker on the basket
    star(g, bx - 22, by + 145, 6.4, '#FFFFFF'); star(g, bx - 22, by + 145, 5, calm ? '#F6CB4C' : (Math.sin(u * 3) > 0 ? '#F6CB4C' : '#F8D76A'));
    secret(g, 'star', bx - 22, by + 145, 14);
    // the front row of clouds drifts past
    for (var i2 = 0; i2 < 9; i2++) { var x2 = ((i2 * 96 - u * 34) % 860 + 860) % 860 - 120; puff(g, x2, 336 + Math.sin(i2 * 1.7) * 8, 1.4, '#FFFFFF'); }
    if (!zoom) say(g, tid, 'Wheee!', u, 0.6, 1.9);
    g.restore();
  }
  function lighthouse(g, u, d, calm) {
    sky(g, [[0, '#24324F'], [0.6, '#4D6585'], [1, '#7891AE']]);
    stars(g, 18, 70, u, 120, calm);
    var lx = 468, top = 78;
    // the beam: a soft slow sweep
    var ang = mix(-2.75, -2.25, u / d), sp = 0.1;
    g.save(); g.globalAlpha = 0.5; g.fillStyle = lin(g, lx, top + 12, lx + Math.cos(ang) * 520, top + 12 + Math.sin(ang) * 520, [[0, 'rgba(255,240,190,.75)'], [1, 'rgba(255,240,190,0)']]);
    g.beginPath(); g.moveTo(lx, top + 14); g.lineTo(lx + Math.cos(ang - sp) * 560, top + 14 + Math.sin(ang - sp) * 560); g.lineTo(lx + Math.cos(ang + sp) * 560, top + 14 + Math.sin(ang + sp) * 560); g.closePath(); g.fill(); g.restore();
    // rocks and the tower
    g.fillStyle = '#2E3546'; g.beginPath(); g.moveTo(370, 300); g.quadraticCurveTo(400, 250, 450, 258); g.quadraticCurveTo(520, 240, 560, 270); g.quadraticCurveTo(600, 284, 620, 300); g.fill();
    g.fillStyle = '#F2EEE6'; g.beginPath(); g.moveTo(lx - 26, 262); g.lineTo(lx - 15, top + 30); g.lineTo(lx + 15, top + 30); g.lineTo(lx + 26, 262); g.closePath(); g.fill();
    g.save(); g.clip(); for (var s = 0; s < 4; s++) { g.fillStyle = '#D0485F'; g.fillRect(lx - 30, top + 52 + s * 52, 60, 24); } g.restore();
    rr(g, lx - 22, top + 26, 44, 6, 2, '#2E3546'); rr(g, lx - 13, top + 6, 26, 20, 3, '#FFE9A8'); glow(g, lx, top + 15, 60, '255,236,170', 0.8);
    g.fillStyle = '#B03A4F'; g.beginPath(); g.arc(lx, top + 6, 14, Math.PI, TAU); g.fill(); circ(g, lx, top - 9, 3, '#B03A4F');
    rr(g, lx - 6, 230, 12, 30, 5, '#5A4A3A'); circ(g, lx, 200, 5, '#FFE9A8');
    // the sea
    g.fillStyle = lin(g, 0, 290, 0, 360, [[0, '#2F4D68'], [1, '#1A2C40']]); g.fillRect(-60, 292, VW + 120, 90);
    for (var w = 0; w < 7; w++) { g.strokeStyle = 'rgba(200,225,240,.25)'; g.lineWidth = 1.4; g.beginPath(); for (var x = -20; x < 680; x += 10) { var y = 302 + w * 9 + Math.sin(x / 26 + u * 2 + w) * 2; if (x === -20) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
    // the pals in a little rowboat with a lantern
    var bob = Math.sin(u * 2.2) * 2.5, bx = 196 + u * 6;
    var tid = pup(g, 'tidbit', bx - 8, 312 + bob, 1.05, { pose: 'sit', face: 1, t: u, ear: -0.4, noShadow: true, tilt: -0.08 });
    pup(g, 'sugarfoot', bx - 46, 312 + bob, 1.05, { pose: 'sit', face: 1, t: u + 1, noShadow: true });
    g.fillStyle = '#8A5A3A'; g.beginPath(); g.moveTo(bx - 82, 306 + bob); g.lineTo(bx + 38, 306 + bob); g.quadraticCurveTo(bx + 30, 330 + bob, bx + 12, 332 + bob); g.lineTo(bx - 64, 332 + bob); g.quadraticCurveTo(bx - 80, 326 + bob, bx - 82, 306 + bob); g.fill();
    rr(g, bx - 82, 304 + bob, 120, 5, 2, '#6B4430');
    line(g, bx + 30, 306 + bob, bx + 42, 286 + bob, '#6B4430', 2); rr(g, bx + 37, 284 + bob, 10, 12, 3, '#FFD98A'); glow(g, bx + 42, 290 + bob, 34, '255,210,120', 0.5);
    // fog drifting past
    for (var f = 0; f < 7; f++) { var fx = ((f * 140 + u * (10 + f * 3)) % 900) - 160; ell(g, fx, 200 + rnd(f + 2) * 110, 140, 22 + rnd(f) * 14, 'rgba(225,235,245,' + (0.1 + 0.08 * rnd(f + 5)) + ')'); }
    say(g, tid, 'Look!', u, 0.5, 1.8);
  }
  function mountain(g, u, d, calm) {
    sky(g, [[0, '#2F2B6B'], [0.45, '#9A6A9E'], [0.75, '#F2A28A'], [1, '#FFD69A']], 260);
    var sy = 236 - u * 10; glow(g, 448, sy, 170, '255,220,150', 0.65); circ(g, 448, sy, 30, '#FFE7A8');
    g.fillStyle = '#8E7BB8'; g.beginPath(); g.moveTo(-60, 260); [[40, 190], [120, 240], [200, 175], [300, 236], [380, 196], [520, 248], [600, 186], [700, 240]].forEach(function (p) { g.lineTo(p[0], p[1]); }); g.lineTo(700, 400); g.lineTo(-60, 400); g.fill();
    g.fillStyle = '#6E5E9E'; g.beginPath(); g.moveTo(-60, 300); [[60, 250], [150, 290], [520, 280], [640, 236], [700, 270]].forEach(function (p) { g.lineTo(p[0], p[1]); }); g.lineTo(700, 400); g.lineTo(-60, 400); g.fill();
    // the summit, with a small flat top for two pals
    g.fillStyle = '#F4F6FF'; g.beginPath(); g.moveTo(80, 400); g.lineTo(286, 214); g.lineTo(366, 214); g.lineTo(600, 400); g.fill();
    g.fillStyle = '#C9D0F0'; g.beginPath(); g.moveTo(326, 214); g.lineTo(366, 214); g.lineTo(600, 400); g.lineTo(420, 400); g.fill();
    for (var i = 0; i < 16; i++) { var tx = 180 + rnd(i + 21) * 300, ty = 240 + rnd(i + 23) * 110, ta = calm ? 0.5 : 0.5 + 0.5 * Math.sin(u * 4 + i * 2); star(g, tx, ty, 2.2 * ta + 0.5, 'rgba(255,255,255,' + ta + ')'); }
    // a heart flag
    line(g, 326, 214, 326, 156, '#6B4A3A', 2); g.fillStyle = '#F28AA8'; g.beginPath(); g.moveTo(327, 157); g.quadraticCurveTo(350, 160 + Math.sin(u * 5) * 3, 366, 162); g.quadraticCurveTo(350, 168 + Math.sin(u * 5 + 1) * 3, 327, 175); g.fill(); heart(g, 343, 166, 4, '#FFFFFF');
    var tid = pup(g, 'tidbit', 302, 216, 1.15, { pose: 'sit', face: 1, t: u, over: HAT.beanie('#E4566E'), tilt: -0.1 });
    var sug = pup(g, 'sugarfoot', 348, 216, 1.15, { pose: 'sit', face: 1, t: u + 1, over: HAT.beanie('#7FB8F0'), tilt: -0.14 });
    // little breath clouds in the cold
    [0, 1].forEach(function (k) { var ph = ((u + k * 0.7) % 1.4) / 1.4, hx = (k ? 348 : 302) + 32 + ph * 14, hy = 180 - ph * 8; circ(g, hx, hy, 2 + ph * 5, 'rgba(255,255,255,' + (0.5 * (1 - ph)) + ')'); });
    say(g, sug, 'We made it!', u, 0.5, 1.9);
  }
  function books(g, x0, x1, y, h, seed) {
    var x = x0, i = 0, cols = ['#7A3B4E', '#2E4F7A', '#3E6B4A', '#B07A3A', '#5B3F8C', '#8E2F3F', '#2F6B6B', '#C9A26A'];
    while (x < x1 - 6) { var w = 7 + Math.floor(rnd(seed + i) * 7), bh = h - rnd(seed + i + 50) * 12; if (x + w > x1) w = x1 - x; rr(g, x, y - bh, w - 1, bh, 1, cols[Math.floor(rnd(seed + i + 90) * cols.length)]); rr(g, x + 1, y - bh + 4, w - 3, 2, 0, 'rgba(255,230,170,.35)'); x += w; i++; }
  }
  function library(g, u, d, calm) {
    rr(g, -60, -60, VW + 120, VH + 120, 0, '#3E2826');
    var open = eio((u - 0.25) / 1.1);
    // the bookcases
    [[20, 236], [404, 620]].forEach(function (c, ci) { rr(g, c[0] - 8, 30, c[1] - c[0] + 16, 262, 4, '#5B3A2C'); for (var s = 0; s < 5; s++) { rr(g, c[0], 40 + s * 50, c[1] - c[0], 46, 2, '#2A1A16'); books(g, c[0] + 3, c[1] - 3, 84 + s * 50, 40, ci * 300 + s * 31); rr(g, c[0] - 6, 84 + s * 50, c[1] - c[0] + 12, 5, 1, '#6E4636'); } });
    // the secret: a paw print on a blue book (left case, second shelf)
    rr(g, 92, 96, 14, 38, 1, '#2E4F7A'); paw(g, 99, 118, 1.15, '#FFE9C0'); secret(g, 'paw', 99, 116, 14);
    // behind the door: golden light and a spiral stair going up
    var gx = 320;
    g.save(); g.beginPath(); g.rect(244, 30, 152, 262); g.clip();
    g.fillStyle = lin(g, 0, 30, 0, 292, [[0, '#FFE6A0'], [1, '#F2A55A']]); g.fillRect(244, 30, 152, 262);
    for (var k = 0; k < 9; k++) { var sa = k * 0.7 + u * 0.4, sx = gx + Math.cos(sa) * 40, sy2 = 270 - k * 24; rr(g, sx - 22, sy2, 44, 6, 3, 'rgba(160,90,40,' + (0.35 + 0.05 * k) + ')'); }
    for (var m = 0; m < 16; m++) { var mx = 250 + rnd(m + 3) * 140, my = 280 - ((u * 30 + rnd(m) * 260) % 260); circ(g, mx, my, 1.5, 'rgba(255,255,255,.8)'); }
    g.restore();
    // the bookcase door swings open on its left hinge
    var dw = 152 * (1 - 0.82 * open);
    g.save(); g.translate(244, 0); g.transform(1, -0.12 * open, 0, 1, 0, 0);
    rr(g, 0, 30, dw, 262, 3, '#5B3A2C');
    g.save(); g.scale(dw / 152, 1); for (var s2 = 0; s2 < 5; s2++) { rr(g, 6, 40 + s2 * 50, 140, 46, 2, '#2A1A16'); books(g, 9, 143, 84 + s2 * 50, 40, 777 + s2 * 13); } g.restore();
    rr(g, 0, 30, dw, 262, 3, 'rgba(0,0,0,' + (0.35 * open) + ')');
    g.restore();
    glow(g, gx, 300, 180, '255,214,140', 0.55 * open);
    // floor and rug
    rr(g, -60, 292, VW + 120, 80, 0, '#5E3C2E'); for (var f = 0; f < 10; f++) line(g, f * 70, 292, f * 70 - 30, 360, 'rgba(0,0,0,.18)', 1);
    ell(g, gx, 322, 170, 18, '#8E2F3F'); ell(g, gx, 322, 150, 13, '#B0485A');
    var tid = pup(g, 'tidbit', 214, 322, 1.4, { pose: 'run', face: 1, t: u, ear: -0.6 * open, tilt: -0.12 });
    var sug = pup(g, 'sugarfoot', 430, 322, 1.4, { pose: 'run', face: -1, t: u + 1, ear: -0.6 * open, tilt: -0.08 });
    say(g, sug, 'A secret door!', u, 0.8, 1.95);
  }
  function lanterns(g, u, y0, sag, seed, calm, hide) {
    var cols = ['#F27D7D', '#F6B26B', '#F7DC6F', '#F2A0B8', '#7FD3C8', '#B79CEB'];
    g.strokeStyle = 'rgba(40,30,60,.8)'; g.lineWidth = 1; g.beginPath(); for (var x = -20; x <= 660; x += 10) { var yy = y0 + sag * Math.sin(Math.PI * clamp((x + 20) / 680, 0, 1)); if (x === -20) g.moveTo(x, yy); else g.lineTo(x, yy); } g.stroke();
    for (var i = 0; i < 14; i++) {
      var lx = -4 + i * 48 + (seed % 2) * 24; if (hide && Math.abs(lx - hide) < 20) continue;
      var ly = y0 + sag * Math.sin(Math.PI * clamp((lx + 20) / 680, 0, 1)), sw = calm ? 0 : Math.sin(u * 1.8 + i + seed) * 0.08, col = cols[(i + seed) % cols.length];
      g.save(); g.translate(lx, ly); g.rotate(sw); line(g, 0, 0, 0, 6, 'rgba(40,30,60,.8)', 1);
      glow(g, 0, 16, 30, '255,200,140', 0.32); ell(g, 0, 16, 9, 11, col); rr(g, -5, 4, 10, 3, 1, '#4A3448'); rr(g, -5, 26, 10, 3, 1, '#4A3448'); ell(g, -2, 13, 2.5, 5, 'rgba(255,255,255,.3)');
      g.restore();
    }
  }
  function market(g, u, d, calm, zoom) {
    sky(g, [[0, '#171C48'], [1, '#3D2F6E']], 260);
    stars(g, 26, 140, u, 120, calm);
    g.fillStyle = '#251E4A'; [[0, 170, 90], [80, 140, 70], [150, 184, 110], [260, 120, 80], [340, 160, 100], [440, 132, 90], [530, 176, 120]].forEach(function (b) { g.fillRect(b[0], b[1], b[2], 300); });
    for (var w = 0; w < 30; w++) if (rnd(w + 33) > 0.45) rr(g, rnd(w + 1) * 620, 150 + rnd(w + 2) * 90, 7, 9, 1, 'rgba(255,215,140,.55)');
    var shift = -u * 26;
    g.save(); g.translate(shift * 0.4, 0);
    lanterns(g, u, 54, 26, 0, calm); lanterns(g, u, 96, 30, 1, calm, 378);
    // the secret: a music note hanging in among the lanterns
    var nx = 378, ny = 96 + 30 * Math.sin(Math.PI * clamp((nx + 20) / 680, 0, 1)), nsw = calm ? 0 : Math.sin(u * 1.8 + 3) * 0.1;
    g.save(); g.translate(nx, ny); g.rotate(nsw); line(g, 0, 0, 0, 8, 'rgba(40,30,60,.8)', 1); glow(g, 2, 20, 22, '255,230,150', 0.35); note(g, -1, 26, 1.2, '#FFD966'); secret(g, 'note', 1, 18, 14); g.restore();
    g.restore();
    // the stalls
    [[30, '#D0485F'], [236, '#3FA3A0'], [442, '#7E5BB8']].forEach(function (s, i) {
      var x = s[0] + shift * 0.9; x = ((x % 700) + 700) % 700 - 40;
      rr(g, x + 6, 226, 6, 80, 2, '#4A3448'); rr(g, x + 162, 226, 6, 80, 2, '#4A3448');
      glow(g, x + 88, 260, 110, '255,205,130', 0.4);
      for (var k = 0; k < 7; k++) { g.fillStyle = k % 2 ? '#FFF3E0' : s[1]; g.beginPath(); g.moveTo(x + k * 25, 206); g.lineTo(x + k * 25 + 25, 206); g.lineTo(x + k * 25 + 25, 228); g.arc(x + k * 25 + 12.5, 228, 12.5, 0, Math.PI); g.closePath(); g.fill(); }
      rr(g, x + 4, 270, 168, 36, 4, '#7A4E3A'); rr(g, x + 4, 268, 168, 6, 3, '#9B6B4A');
      for (var f = 0; f < 6; f++) circ(g, x + 22 + f * 24, 262, 7, ['#F6A04D', '#F27D7D', '#F7DC6F', '#8FD694'][(f + i) % 4]);
    });
    rr(g, -60, 304, VW + 120, 80, 0, '#2B2244'); for (var c = 0; c < 22; c++) ell(g, ((c * 37 + shift) % 680 + 680) % 680 - 20, 318 + (c % 3) * 14, 14, 4, 'rgba(255,255,255,.05)');
    var px0 = 210 + u * 34;
    var tid = pup(g, 'tidbit', px0, 330, 1.3, { pose: 'run', face: 1, t: u, ph: px0 * 0.22, wag: Math.sin(u * 12) * 0.6 });
    pup(g, 'sugarfoot', px0 - 74, 330, 1.3, { pose: 'run', face: 1, t: u, ph: px0 * 0.22 + 1.6, over: function (g2) { line(g2, 14, 6, 28, 10, '#6B4A3A', 1.4); line(g2, 28, 10, 28, 18, '#6B4A3A', 1); glow(g2, 28, 24, 18, '255,210,120', 0.6); ell(g2, 28, 24, 5, 6, '#F27D7D'); } });
    for (var sp = 0; sp < 12; sp++) { var sx = rnd(sp + 61) * VW, sy = 300 - ((u * 24 + rnd(sp + 62) * 200) % 200); circ(g, sx, sy, 1.2, 'rgba(255,220,150,' + (0.6 * rnd(sp + 63)) + ')'); }
    if (!zoom) say(g, tid, 'So many lanterns!', u, 0.4, 1.95);
  }
  function underwater(g, u, d, calm, zoom) {
    sky(g, [[0, '#127095'], [0.5, '#0B4A6B'], [1, '#062238']]);
    for (var r = 0; r < 6; r++) { var rx = 60 + r * 110 + Math.sin(u * 0.6 + r) * 14; g.fillStyle = 'rgba(200,245,255,.07)'; g.beginPath(); g.moveTo(rx - 14, -10); g.lineTo(rx + 14, -10); g.lineTo(rx + 70, 360); g.lineTo(rx + 20, 360); g.fill(); }
    // jellyfish, softly glowing
    [[120, 110, '247,168,194'], [520, 90, '183,156,235'], [600, 210, '127,211,200']].forEach(function (j, i) {
      var jy = j[1] + Math.sin(u * 1.2 + i) * 8, pulse = calm ? 1 : 0.9 + 0.1 * Math.sin(u * 2 + i);
      glow(g, j[0], jy, 50, j[2], 0.35 * pulse);
      g.fillStyle = 'rgba(' + j[2] + ',.85)'; g.beginPath(); g.arc(j[0], jy, 16, Math.PI, TAU); g.quadraticCurveTo(j[0], jy + 6, j[0] - 16, jy); g.fill();
      for (var tn = 0; tn < 4; tn++) { g.strokeStyle = 'rgba(' + j[2] + ',.6)'; g.lineWidth = 1.4; g.beginPath(); var tx = j[0] - 9 + tn * 6; g.moveTo(tx, jy + 2); g.quadraticCurveTo(tx + Math.sin(u * 3 + tn) * 5, jy + 14, tx, jy + 26); g.stroke(); }
    });
    // the seabed: sand, coral, seaweed
    g.fillStyle = '#3B5E62'; g.beginPath(); g.moveTo(-60, 318); g.quadraticCurveTo(200, 300, 380, 316); g.quadraticCurveTo(520, 326, 700, 306); g.lineTo(700, 400); g.lineTo(-60, 400); g.fill();
    for (var s = 0; s < 8; s++) { var sx = 20 + s * 84, sw = calm ? 0 : Math.sin(u * 1.5 + s) * 6; g.strokeStyle = '#3E8E6A'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(sx, 330); g.quadraticCurveTo(sx + sw, 290, sx + sw * 1.5, 262 + rnd(s) * 20); g.stroke(); }
    [[470, '#F2A0B8'], [560, '#F6A04D'], [610, '#E4566E'], [80, '#F6A04D']].forEach(function (c) { g.strokeStyle = c[1]; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(c[0], 330); g.lineTo(c[0], 298); g.moveTo(c[0], 312); g.lineTo(c[0] - 14, 294); g.moveTo(c[0], 306); g.lineTo(c[0] + 13, 288); g.stroke(); circ(g, c[0] - 14, 294, 4, c[1]); circ(g, c[0] + 13, 288, 4, c[1]); circ(g, c[0], 296, 4, c[1]); });
    // the secret: a tiny rubber duck tucked into the coral
    var dx = 528, dy = 318; ell(g, dx, dy, 9, 6.5, '#F7D44C'); circ(g, dx + 6, dy - 7, 5, '#F7D44C'); g.fillStyle = '#F08A3C'; g.beginPath(); g.moveTo(dx + 10, dy - 7); g.lineTo(dx + 16, dy - 5.5); g.lineTo(dx + 10, dy - 4.5); g.fill(); circ(g, dx + 7, dy - 8.5, 1, '#2A2420'); ell(g, dx - 3, dy - 1, 4, 2.4, '#F2C030', -0.3);
    secret(g, 'duck', dx + 2, dy - 4, 14);
    // the pals swim by in bubble helmets
    var sx2 = 230 + u * 18;
    var tid = pup(g, 'tidbit', sx2 + 70, 196 + Math.sin(u * 2) * 6, 1.25, { pose: 'run', face: 1, t: u, ph: u * 7, over: HAT.helmet, noShadow: true, tilt: -0.05, rot: -0.08 });
    pup(g, 'sugarfoot', sx2 - 30, 228 + Math.sin(u * 2 + 1.5) * 6, 1.25, { pose: 'run', face: 1, t: u, ph: u * 7 + 2, over: HAT.helmet, noShadow: true, rot: -0.05 });
    for (var b = 0; b < 26; b++) { var bx = rnd(b + 71) * VW, by = 360 - ((u * (30 + rnd(b + 72) * 40) + rnd(b + 73) * 360) % 380), br = 1.5 + rnd(b + 74) * 3.5; g.strokeStyle = 'rgba(220,250,255,.55)'; g.lineWidth = 1; g.beginPath(); g.arc(bx + Math.sin(u * 2 + b) * 3, by, br, 0, TAU); g.stroke(); }
    for (var p = 0; p < 24; p++) circ(g, rnd(p + 81) * VW, rnd(p + 82) * 300, 1.1, 'rgba(180,255,230,' + (calm ? 0.5 : 0.3 + 0.3 * Math.sin(u * 2 + p)) + ')');
    if (!zoom) say(g, tid, 'It’s glowing!', u, 0.5, 1.95);
  }
  function rooftop(g, u, d, calm) {
    sky(g, [[0, '#0A0F2E'], [0.7, '#262A63'], [1, '#463E7A']]);
    stars(g, 110, 200, u, 250, calm);
    circ(g, 92, 66, 18, '#FFF4D2'); circ(g, 100, 60, 16, '#121844');
    // the secret: a tiny pink heart among the stars
    var hs = calm ? 1 : 0.85 + 0.15 * Math.sin(u * 2.5); glow(g, 566, 52, 14, '255,170,200', 0.5); heart(g, 566, 54, 5.2 * hs, '#FF9EC0'); secret(g, 'heart', 566, 52, 14);
    // shooting stars
    [[0.15, 140, 40, 1], [0.75, 420, 30, 1], [1.25, 260, 80, 0.8]].forEach(function (s) {
      var q = (u - s[0]) / 0.75; if (q < 0 || q > 1) return;
      var x = s[1] + q * 190, y = s[2] + q * 80, a = bump(q) * s[3];
      g.strokeStyle = lin(g, x - 70, y - 30, x, y, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(255,250,220,' + a + ')']]); g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 70, y - 30); g.lineTo(x, y); g.stroke(); star(g, x, y, 4 * a + 0.5, 'rgba(255,250,220,' + a + ')');
    });
    // the city
    g.fillStyle = '#151A3E'; [[-10, 210, 70], [56, 236, 50], [104, 190, 60], [164, 226, 44], [404, 200, 64], [466, 230, 48], [512, 180, 70], [580, 214, 70]].forEach(function (b) { g.fillRect(b[0], b[1], b[2], 200); });
    for (var w = 0; w < 46; w++) if (rnd(w + 91) > 0.5) rr(g, rnd(w + 92) * 640, 196 + rnd(w + 93) * 90, 6, 8, 1, 'rgba(255,215,140,.6)');
    // the rooftop and the telescope
    rr(g, -60, 296, VW + 120, 80, 0, '#2B2F55'); for (var k = 0; k < 16; k++) rr(g, k * 44 - 10, 296, 40, 5, 1, '#3A3F6A');
    line(g, 262, 252, 244, 298, '#8A7A6A', 2.4); line(g, 262, 252, 282, 298, '#8A7A6A', 2.4); line(g, 262, 252, 262, 298, '#8A7A6A', 2);
    g.save(); g.translate(262, 250); g.rotate(-0.55); rr(g, -26, -7, 62, 14, 5, '#D9A85B'); rr(g, 30, -9, 12, 18, 3, '#B8873F'); rr(g, -32, -4, 8, 8, 2, '#8A6A3A'); g.restore();
    pup(g, 'tidbit', 214, 300, 1.35, { pose: 'sit', face: 1, t: u, tilt: -0.32 });
    var sug = pup(g, 'sugarfoot', 372, 300, 1.35, { pose: 'sit', face: -1, t: u + 1, tilt: -0.45, ear: -0.3 });
    say(g, sug, 'Make a wish!', u, 0.55, 1.95);
  }
  function friend(g, u, d, calm) {
    var z = mix(1, 1.14, sio(u / d));
    g.save(); g.translate(470, 240); g.scale(z, z); g.translate(-470, -240);
    sky(g, [[0, '#231C46'], [0.6, '#4F3F7C'], [1, '#86699C']], 300);
    stars(g, 30, 400, u, 150, calm);
    for (var m = 0; m < 4; m++) ell(g, ((m * 200 + u * 8) % 900) - 100, 240 + m * 14, 200, 16, 'rgba(220,210,240,.12)');
    g.fillStyle = '#1C1636'; [[20, 60], [90, 40], [560, 50], [620, 70]].forEach(function (tr) { g.fillRect(tr[0] - 9, 120, 18, 200); circ(g, tr[0], 110, tr[1], '#1C1636'); });
    g.fillStyle = lin(g, 0, 296, 0, 360, [[0, '#2B3A4A'], [1, '#1A2430']]); g.fillRect(-60, 296, VW + 120, 100);
    // the new friend, in shadow, with a little lantern
    var fx = 470, fy = 300, tilt = (calm ? 0.5 : 1) * 0.18 * sio((u - 2.2) / 0.4) * (1 - sio((u - 3.4) / 0.4));
    g.save(); g.translate(fx, fy); g.rotate(tilt);
    var sh = '#171233';
    // a big fluffy tail, swishing happily
    var tw = calm ? 0 : Math.sin(u * 3) * 0.25; g.fillStyle = sh; g.beginPath(); g.ellipse(52 + tw * 12, -70, 20, 40, 0.5 + tw, 0, TAU); g.fill();
    // a round, fluffy body and head, with round ears and a curl on top
    ell(g, 0, -46, 48, 50, sh); circ(g, 0, -108, 36, sh);
    [-1, 1].forEach(function (sd) { circ(g, sd * 27, -136, 13, sh); circ(g, sd * 27, -136, 6, '#2A2350'); });
    g.strokeStyle = sh; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(-2, -142); g.quadraticCurveTo(6, -158, 14, -150); g.stroke();
    // warm lantern light on one side
    g.save(); g.beginPath(); g.ellipse(0, -46, 48, 50, 0, 0, TAU); g.arc(0, -108, 36, 0, TAU); g.clip(); glow(g, -60, -40, 90, '255,200,130', 0.35); g.restore();
    // a cozy scarf, the only color you can see
    g.fillStyle = 'rgba(214,90,110,.7)'; g.beginPath(); g.ellipse(0, -76, 30, 8, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(14, -74); g.quadraticCurveTo(26, -56 + tw * 8, 20, -42); g.lineTo(10, -46); g.quadraticCurveTo(14, -60, 6, -72); g.fill();
    var bl = (u > 1.5 && u < 1.62) || (u > 2.95 && u < 3.06);
    [-14, 14].forEach(function (ex) { glow(g, ex, -110, 14, '255,240,190', 0.35); if (bl) { g.strokeStyle = '#FFF1B8'; g.lineWidth = 2.2; g.beginPath(); g.arc(ex, -112, 6, 0.2, Math.PI - 0.2); g.stroke(); } else { ell(g, ex, -110, 7.5, 9, '#FFF6D6'); circ(g, ex + 1.5, -108, 4.4, '#2A2140'); circ(g, ex + 3, -110.5, 1.7, '#FFFFFF'); circ(g, ex, -106, 0.9, '#FFFFFF'); } });
    // a little smile
    g.strokeStyle = 'rgba(255,240,200,.55)'; g.lineWidth = 2; g.beginPath(); g.arc(0, -96, 6, 0.3, Math.PI - 0.3); g.stroke();
    // the lantern it holds up
    var ls = calm ? 0 : Math.sin(u * 2) * 0.12; g.save(); g.translate(-46, -78); g.rotate(ls); line(g, 0, 0, 0, 12, sh, 2.4); glow(g, 0, 24, 56, '255,205,130', 0.6); rr(g, -8, 12, 16, 20, 5, '#FFD98A'); rr(g, -9, 10, 18, 3, 1, sh); rr(g, -9, 31, 18, 3, 1, sh); g.restore();
    g.restore();
    // tall grass in front of it
    for (var gr = 0; gr < 26; gr++) { var gx = 400 + gr * 6, sw = calm ? 0 : Math.sin(u * 1.5 + gr) * 3; g.strokeStyle = '#141A26'; g.lineWidth = 4; g.beginPath(); g.moveTo(gx, 306); g.quadraticCurveTo(gx + sw, 280, gx + sw * 2 + (gr % 3 - 1) * 5, 248 + rnd(gr) * 24); g.stroke(); }
    if (u > 2.3 && u < 3.5) { var qa = win(u, 2.3, 3.5, 0.15); g.globalAlpha = qa; font(g, '800', 30); g.textAlign = 'center'; g.fillStyle = '#FFE08A'; g.fillText('?', 470 + 30, 150 - 6 * eout((u - 2.3) / 0.3)); g.globalAlpha = 1; }
    for (var f = 0; f < 10; f++) { var ffx = rnd(f + 401) * VW + Math.sin(u + f) * 10, ffy = 190 + rnd(f + 402) * 100; glow(g, ffx, ffy, 8, '255,240,150', 0.4); }
    var tid = pup(g, 'tidbit', 196, 314, 1.5, { pose: 'sit', face: 1, t: u, ear: -0.7, tilt: -0.1 });
    var sug = pup(g, 'sugarfoot', 126, 314, 1.5, { pose: 'sit', face: 1, t: u + 1, ear: -0.6, tilt: -0.15 });
    say(g, tid, 'Who’s that?', u, 0.55, 2.2);
    say(g, sug, 'A new friend…?', u, 2.35, 3.95);
    g.restore();
  }
  function meadow(g, u) {
    sky(g, [[0, '#7CC6F2'], [1, '#E6F6FF']], 260);
    circ(g, 560, 60, 26, '#FFF1B0'); glow(g, 560, 60, 110, '255,245,190', 0.5);
    puff(g, 80 + u * 6, 70, 0.8, 'rgba(255,255,255,.95)'); puff(g, 360 + u * 4, 50, 0.6, 'rgba(255,255,255,.9)');
    g.fillStyle = '#A6DB86'; g.beginPath(); g.moveTo(-60, 260); g.quadraticCurveTo(200, 220, 420, 252); g.quadraticCurveTo(560, 236, 700, 250); g.lineTo(700, 400); g.lineTo(-60, 400); g.fill();
    g.fillStyle = '#86C76C'; g.fillRect(-60, 290, VW + 120, 100);
    for (var f = 0; f < 34; f++) { var x = rnd(f + 501) * VW, y = 266 + rnd(f + 502) * 90; circ(g, x, y, 3, ['#F28AA8', '#F7DC6F', '#FFFFFF', '#B79CEB'][f % 4]); circ(g, x, y, 1.2, '#F6CB4C'); }
  }
  function sneeze(g, u, d, calm) {
    meadow(g, u);
    var ach = sio((u - 0.3) / 1.05), boom = u >= 1.4, kick = boom ? Math.exp(-(u - 1.4) * 5) : 0;
    // the dandelion, right under Tidbit's nose
    line(g, 330, 300, 333, 252, '#5E8E4A', 1.8);
    if (!boom) { circ(g, 333, 248, 9, 'rgba(255,255,255,.9)'); for (var s = 0; s < 14; s++) line(g, 333, 248, 333 + Math.cos(s / 14 * TAU) * 10, 248 + Math.sin(s / 14 * TAU) * 10, 'rgba(255,255,255,.8)', 0.8); }
    else for (var p = 0; p < 22; p++) { var q = u - 1.4, a = -0.9 + rnd(p + 601) * 1.6, v = 70 + rnd(p + 602) * 110, x = 333 + Math.cos(a) * v * (1 - Math.exp(-q * 3)) / 1.2 + q * 14, y = 248 + Math.sin(a) * v * (1 - Math.exp(-q * 3)) / 1.2 - q * 10 + Math.sin(q * 4 + p) * 4; if (x > 700) continue; line(g, x, y, x, y + 5, 'rgba(255,255,255,.85)', 0.8); circ(g, x, y, 2.4, 'rgba(255,255,255,.9)'); }
    var tTilt = boom ? 0.28 * kick - 0.05 : -0.36 * ach;
    var tid = pup(g, 'tidbit', 272, 304, 1.65, { pose: 'sit', face: 1, t: u, tilt: tTilt, blink: !boom && u > 0.9 ? true : undefined, sx: 1 });
    // Sugarfoot's explorer hat stays on... until it doesn't
    var hatGone = boom;
    var sug = pup(g, 'sugarfoot', 400, 304, 1.65, { pose: 'sit', face: -1, t: u + 1, ear: boom ? 1.1 * kick + 0.1 : 0, tilt: boom ? -0.15 * kick : 0, blink: boom && u < 1.75 ? true : undefined, over: hatGone ? null : HAT.explorer });
    if (hatGone) {
      var hq = (u - 1.4) / (calm ? 1.4 : 1.0), hx = 400 - 18 * 1.65 + hq * 320, hy = 304 - 52 * 1.65 - 150 * Math.sin(Math.min(hq, 1) * 1.4) + hq * hq * 60;
      g.save(); g.translate(hx, hy); g.rotate(hq * (calm ? 3 : 7)); g.scale(1.65, 1.65); HAT.explorer(g); g.restore();
      if (!calm) for (var w = 0; w < 4; w++) { var wq = clamp((u - 1.4 - w * 0.04) / 0.35, 0, 1); if (wq > 0 && wq < 1) line(g, 360 + wq * 60, 220 + w * 12, 380 + wq * 90, 220 + w * 12, 'rgba(255,255,255,' + (0.8 * (1 - wq)) + ')', 2); }
    }
    say(g, tid, u < 0.85 ? 'Ah…' : 'Ah… ahh…', u, 0.3, 1.35);
    say(g, tid, 'CHOO!', u, 1.4, 2.05, { big: true });
    say(g, sug, '…Bless you!', u, 2.15, 3.0);
  }
  function puddle(g, u, d, calm) {
    sky(g, [[0, '#A3BAD6'], [1, '#EEF2F8']], 270);
    g.save(); g.globalAlpha = 0.35; var cols = ['#F27D7D', '#F6B26B', '#F7DC6F', '#8FD694', '#7FB8F0', '#B79CEB']; for (var r = 0; r < 6; r++) { g.strokeStyle = cols[r]; g.lineWidth = 6; g.beginPath(); g.arc(470, 300, 200 - r * 6, Math.PI * 1.05, Math.PI * 1.6); g.stroke(); } g.restore();
    g.fillStyle = '#8FBF7A'; g.fillRect(-60, 262, VW + 120, 140); g.fillStyle = '#7AAE66'; g.fillRect(-60, 300, VW + 120, 100);
    for (var t2 = 0; t2 < 3; t2++) { rr(g, 60 + t2 * 250, 190, 10, 80, 4, '#6B5A4A'); circ(g, 65 + t2 * 250, 184, 32, '#6FA45C'); }
    // the puddle
    ell(g, 340, 314, 104, 17, '#88AFCF'); ell(g, 340, 312, 92, 12, '#B4D0E6'); ell(g, 310, 310, 30, 3, 'rgba(255,255,255,.6)');
    var slipAt = 0.85, sitAt = 1.25;
    if (u > slipAt) for (var k = 0; k < 3; k++) { var rq = ((u - slipAt) * 0.9 + k * 0.33) % 1; g.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - rq)) + ')'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(352, 314, 20 + rq * 80, 4 + rq * 12, 0, 0, TAU); g.stroke(); }
    var tid, tx;
    if (u < slipAt) { tx = mix(-50, 270, u / slipAt); tid = pup(g, 'tidbit', tx, 312, 1.5, { pose: 'run', face: 1, t: u, ph: tx * 0.24, wag: Math.sin(u * 14) * 0.7 }); }
    else if (u < sitAt) { var q = (u - slipAt) / (sitAt - slipAt); tx = mix(270, 350, eout(q)); tid = pup(g, 'tidbit', tx, 314 - 16 * bump(q), 1.5, { pose: 'run', face: 1, t: u, ph: 1, rot: -0.9 * bump(q) - 0.2 * q, ear: -1 * bump(q) }); }
    else { tx = 350; tid = pup(g, 'tidbit', tx, 318, 1.5, { pose: 'sit', face: 1, t: u, tilt: 0.1, wag: Math.sin(u * 4) * 0.3, noShadow: true }); ell(g, tx + 6, 320, 40, 6, 'rgba(136,175,207,.9)'); }
    // the splash
    if (u > 0.95) for (var p = 0; p < 18; p++) { var q2 = (u - 0.95) * (calm ? 0.75 : 1), a = -Math.PI * (0.1 + 0.8 * rnd(p + 701)), v = 90 + rnd(p + 702) * 120, x = 340 + Math.cos(a) * v * q2, y = 308 + Math.sin(a) * v * q2 + 260 * q2 * q2; if (y > 318 || q2 > 1.2) continue; circ(g, x, y, 2 + rnd(p + 703) * 2.5, 'rgba(160,200,235,.9)'); }
    // a leaf floats down onto her head
    if (u > 1.35) { var lq = clamp((u - 1.35) / 0.7, 0, 1), lx = tid.x + 4 + Math.sin(lq * 9) * 18 * (1 - lq), ly = mix(60, tid.y + 12, eout(lq)); g.save(); g.translate(lx, ly); g.rotate(Math.sin(lq * 8) * 0.6 * (1 - lq) + 0.3); ell(g, 0, 0, 9, 4.5, '#E89B3A'); line(g, -9, 0, 9, 0, '#B8701F', 1); g.restore(); }
    var gig = u > 1.25, sug = pup(g, 'sugarfoot', 520, 312, 1.5, { pose: gig ? 'wiggle' : 'sit', face: -1, t: u + 1, wag: gig ? Math.sin(u * 16) * 0.8 : 0.3 });
    say(g, sug, 'Hee hee!', u, 1.3, 2.05);
    say(g, tid, 'On purpose!', u, 2.1, 3.2);
  }
  function hill(g, u, d, calm) {
    var z = mix(1.28, 1, eio(u / d));
    g.save(); g.translate(314, 250); g.scale(z, z); g.translate(-314, -250);
    sky(g, [[0, '#4F4296'], [0.5, '#D9768E'], [0.8, '#F7A97E'], [1, '#FFD29A']], 300);
    stars(g, 16, 800, u, 90, calm);
    var sunx = 470, suny = 262; glow(g, sunx, suny, 240, '255,210,150', 0.6); circ(g, sunx, suny, 52, '#FFE2A2');
    g.save(); g.globalAlpha = 0.12; g.translate(sunx, suny); g.rotate(u * 0.05); for (var r = 0; r < 12; r++) { g.rotate(TAU / 12); g.fillStyle = '#FFF4D0'; g.beginPath(); g.moveTo(0, 0); g.lineTo(380, -22); g.lineTo(380, 22); g.fill(); } g.restore();
    g.fillStyle = '#7E5D97'; g.beginPath(); g.moveTo(-60, 290); g.quadraticCurveTo(150, 250, 330, 280); g.quadraticCurveTo(520, 256, 700, 276); g.lineTo(700, 400); g.lineTo(-60, 400); g.fill();
    g.fillStyle = lin(g, 0, 270, 0, 360, [[0, '#7FA65A'], [1, '#4E7A3E']]); g.beginPath(); g.moveTo(-60, 360); g.quadraticCurveTo(150, 300, 314, 298); g.quadraticCurveTo(480, 300, 700, 352); g.lineTo(700, 400); g.lineTo(-60, 400); g.fill();
    rr(g, 128, 230, 9, 74, 4, '#4A3A3A'); circ(g, 132, 218, 30, '#5E7A48'); circ(g, 112, 230, 20, '#5E7A48'); circ(g, 152, 230, 20, '#5E7A48');
    for (var p = 0; p < 10; p++) { var px1 = ((rnd(p + 801) * VW + u * 12) % VW), py1 = 150 + rnd(p + 802) * 120 + Math.sin(u + p) * 8; ell(g, px1, py1, 3, 1.8, 'rgba(255,200,215,.7)', u + p); }
    var lean = 0.08 * sio((u - 0.4) / 0.8);
    // facing each other, front paws touching
    var rch = 26 * sio((u - 0.3) / 0.7);
    var tid = pup(g, 'tidbit', 248, 302, 1.7, { pose: 'sit', face: 1, t: u, tilt: lean, wag: Math.sin(u * 5) * 0.5, reach: rch, reachUp: 2 });
    var sug = pup(g, 'sugarfoot', 378, 302, 1.7, { pose: 'sit', face: -1, t: u + 1, tilt: lean, wag: Math.sin(u * 5 + 1) * 0.5, reach: rch, reachUp: 2 });
    var ha = sio((u - 1.0) / 0.5); glow(g, 313, 274, 20, '255,225,235', 0.55 * ha);
    if (u > 1.2) { var hq = clamp((u - 1.2) / 2.6, 0, 1); g.globalAlpha = bump(hq * 0.9 + 0.1); heart(g, 313 + Math.sin(hq * 6) * 6, 250 - hq * 80, 8 + hq * 4, '#F28AA8'); g.globalAlpha = 1; }
    say(g, sug, 'Wherever we go next…', u, 0.6, 2.75);
    say(g, tid, '…we go together.', u, 2.9, 5.6);
    g.restore();
  }
  function riser(g, u, d, calm) {
    rr(g, -60, -60, VW + 120, VH + 120, 0, '#120C24');
    var q = eio(u / d); glow(g, 320, 190, 60 + 260 * q, '255,214,140', 0.25 + 0.35 * q); glow(g, 320, 190, 30 + 90 * q, '190,250,235', 0.3 * q);
    for (var i = 0; i < 30; i++) { var a = rnd(i + 901) * TAU, r0 = 260 + rnd(i + 902) * 120, r = r0 * (1 - q * 0.85); star(g, 320 + Math.cos(a) * r, 190 + Math.sin(a) * r * 0.6, 1.5 + 2 * q, 'rgba(255,240,200,' + (0.3 + 0.6 * q) + ')'); }
  }
  function reveal(g, u, d, calm) {
    sky(g, [[0, '#0F0B2A'], [0.55, '#2A1E58'], [1, '#4E3274']]);
    stars(g, 90, 1000, u, 360, calm);
    for (var b = 0; b < 3; b++) { g.save(); g.globalAlpha = 0.16; g.fillStyle = ['#7FD3C8', '#F2A0B8', '#B79CEB'][b]; g.beginPath(); for (var x = -20; x <= 660; x += 20) { var y = 70 + b * 30 + Math.sin(x / 90 + u * 0.4 + b) * 18; if (x === -20) g.moveTo(x, y); else g.lineTo(x, y); } for (var x2 = 660; x2 >= -20; x2 -= 20) g.lineTo(x2, 100 + b * 30 + Math.sin(x2 / 70 + u * 0.3 + b) * 14); g.fill(); g.restore(); }
    glow(g, 320, 170, 260, '255,214,150', 0.32 + 0.06 * (calm ? 0 : Math.sin(u * 1.5)));
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // FREQUENCY BUDDIES
    var s1 = calm ? 1 : 1 + 0.6 * (1 - eout(u / 0.22)), a1 = calm ? clamp(u / 0.5, 0, 1) : clamp(u / 0.06, 0, 1);
    g.save(); g.globalAlpha = a1; g.translate(320, 120); g.scale(s1, s1); font(g, '700', 43); spacing(g, 2);
    g.fillStyle = '#2A1846'; g.fillText('FREQUENCY BUDDIES', 3, 5); g.fillStyle = lin(g, 0, -24, 0, 24, [[0, '#FFF8EA'], [1, '#FFE3B0']]); g.fillText('FREQUENCY BUDDIES', 0, 0); spacing(g, 0); g.restore();
    // SEASON 2
    if (u > 1.0) {
      var q = u - 1.0, s2 = calm ? 1 : 1 + 1.2 * (1 - backOut(q / 0.35)), a2 = calm ? clamp(q / 0.5, 0, 1) : clamp(q / 0.06, 0, 1);
      g.save(); g.globalAlpha = a2; g.translate(320, 196); g.scale(Math.max(0.6, s2), Math.max(0.6, s2));
      font(g, '700', 34); spacing(g, 8); var w1 = g.measureText('SEASON').width; font(g, '800', 92); spacing(g, 0); var w2 = g.measureText('2').width, tot = w1 + 22 + w2, x0 = -tot / 2;
      font(g, '700', 34); spacing(g, 8); g.textAlign = 'left'; g.fillStyle = '#FFD98A'; g.fillText('SEASON', x0, 8); spacing(g, 0);
      font(g, '800', 92); var gx = x0 + w1 + 22; g.fillStyle = '#2A1846'; g.fillText('2', gx + 4, 8); g.fillStyle = lin(g, 0, -44, 0, 44, [[0, '#FFF3B0'], [0.5, '#F7C04A'], [1, '#F08A5A']]); g.fillText('2', gx, 4);
      g.textAlign = 'center'; g.restore();
      // the sparkle burst
      for (var i = 0; i < (calm ? 18 : 40); i++) {
        var ang = rnd(i + 1101) * TAU, sp = calm ? 30 + rnd(i + 1102) * 50 : 120 + rnd(i + 1102) * 220, life = 1.3 + rnd(i + 1103) * 0.8, k = q / life; if (k > 1) continue;
        var dist = sp * (1 - Math.exp(-q * 2.4)) / 2.4 * (calm ? 2 : 1), sx = 360 + Math.cos(ang) * dist, sy = 196 + Math.sin(ang) * dist * 0.75 + 30 * q * q;
        star(g, sx, sy, (2 + rnd(i + 1104) * 4) * (1 - k * 0.6), ['rgba(255,236,160,', 'rgba(255,190,215,', 'rgba(190,250,235,', 'rgba(255,255,255,'][i % 4] + (1 - k) + ')', q * 2 + i);
      }
    }
    // Coming soon
    if (u > 2.2) { var a3 = clamp((u - 2.2) / 0.5, 0, 1); g.globalAlpha = a3; font(g, 'italic 500', 28); g.fillStyle = '#FBE7FF'; g.fillText('Coming soon', 320, 266 + 6 * (1 - eout((u - 2.2) / 0.5))); rr(g, 320 - 70 * a3, 286, 140 * a3, 2.5, 1.2, 'rgba(247,201,139,.8)'); g.globalAlpha = 1; }
    if (u > 3.0) { g.globalAlpha = clamp((u - 3.0) / 0.6, 0, 1) * 0.85; font(g, '500', 13, '"IBM Plex Mono", monospace'); spacing(g, 1); g.fillStyle = '#D9C8F0'; g.fillText('FREE ON SPREADLOVEANDACCEPTANCE.COM', 320, 340); spacing(g, 0); g.globalAlpha = 1; }
    // the pals pop up, one each side
    if (u > 1.6) {
      var pq = calm ? sio((u - 1.6) / 0.8) : backOut((u - 1.6) / 0.45), bounce = calm ? 0 : Math.abs(Math.sin((u - 2.2) * Math.PI / 0.47)) * 5 * clamp(u - 2.2, 0, 1);
      pup(g, 'tidbit', 92, mix(430, 330, pq) - bounce, 1.6, { pose: 'wiggle', face: 1, t: u, wag: Math.sin(u * 14) * 0.8, noShadow: true });
      pup(g, 'sugarfoot', 548, mix(430, 330, pq) - (calm ? 0 : Math.abs(Math.sin((u - 1.97) * Math.PI / 0.47)) * 5 * clamp(u - 2.2, 0, 1)), 1.6, { pose: 'wiggle', face: -1, t: u, wag: Math.sin(u * 14 + 1) * 0.8, noShadow: true });
      for (var h = 0; h < 4; h++) { var hq = ((u - 1.8 + h * 0.6) % 2.4) / 2.4; if (u < 1.8 + h * 0.2) continue; g.globalAlpha = bump(hq) * 0.9; heart(g, (h % 2 ? 548 : 92) + Math.sin(hq * 6 + h) * 10, 240 - hq * 90, 6, '#F28AA8'); g.globalAlpha = 1; }
    }
    // a little confetti drifting down
    if (u > 1.0) for (var c = 0; c < (calm ? 12 : 30); c++) { var cq = u - 1.0, cy = -20 + ((cq * (40 + rnd(c + 1201) * 40) + rnd(c + 1202) * 380) % 400), cx = rnd(c + 1203) * VW + Math.sin(cq * 2 + c) * 14; g.save(); g.translate(cx, cy); g.rotate(cq * 3 + c); rr(g, -3, -1.5, 6, 3, 1, ['#F7DC6F', '#F28AA8', '#7FD3C8', '#B79CEB'][c % 4]); g.restore(); }
  }
  function post(g, u, d, calm) {
    backyard(g, u + 20, { calm: calm });
    var pop = u > 3.9, pq = pop ? (calm ? sio((u - 3.9) / 0.5) : backOut((u - 3.9) / 0.35)) : 0;
    var look = u < 1.0 ? 1 : u < 1.8 ? -1 : 1;
    var sug = pup(g, 'sugarfoot', 238, 312, 1.6, { pose: u > 6.2 ? 'wiggle' : 'sit', face: look, t: u, tilt: u > 4 ? -0.05 : 0.05, ear: pop ? -0.6 : 0, wag: u > 6.2 ? Math.sin(u * 15) * 0.8 : undefined });
    // Tidbit, behind the bush, in a space helmet and a cape
    var tid = pup(g, 'tidbit', 452, mix(372, 290, pq), 1.6, { pose: pop ? 'wiggle' : 'sit', face: -1, t: u, over: HAT.space, cape: '#E4566E', capeFly: false, wag: Math.sin(u * 14) * 0.8, noShadow: true });
    var rs = u > 3.2 && u < 3.95 && !calm ? Math.sin(u * 40) * 0.04 : 0;
    g.save(); g.translate(452, 318); g.rotate(rs); [[-46, -8, 30], [-14, -22, 36], [24, -12, 32], [52, 0, 24], [-60, 6, 20]].forEach(function (b) { circ(g, b[0], b[1], b[2], '#24453C'); }); [[-30, -20, 4], [10, -34, 4], [36, -18, 3]].forEach(function (b) { circ(g, b[0], b[1], b[2], '#F28AA8'); }); g.restore();
    rr(g, 380, 318, 150, 50, 0, '#1E3530');
    if (pop) for (var i = 0; i < 12; i++) { var q = u - 3.9, a = -Math.PI * (0.15 + 0.7 * rnd(i + 1301)), v = 80 + rnd(i + 1302) * 90; if (q > 1) break; star(g, 452 + Math.cos(a) * v * q, 230 + Math.sin(a) * v * q + 60 * q * q, 3 * (1 - q), 'rgba(255,236,160,' + (1 - q) + ')'); }
    say(g, sug, 'Wait… did anyone see where Tidbit went?', u, 0.4, 3.3);
    say(g, tid, 'Ready for Season 2!', u, 4.15, 6.2, { big: false });
    say(g, sug, 'Of course!', u, 6.3, 7.7);
    say(g, tid, 'I’ll be bark!', u, 7.8, 9.4);
  }

  // ---------------------------------------------------------------- the funny middle: seven slapstick bits, each a wink at a famous movie
  function bone(g, x, y, s, rot, col) { g.save(); g.translate(x, y); g.rotate(rot || 0); g.scale(s, s); rr(g, -9, -2, 18, 4, 2, col); circ(g, -10, -2.6, 3, col); circ(g, -10, 2.6, 3, col); circ(g, 10, -2.6, 3, col); circ(g, 10, 2.6, 3, col); g.restore(); }
  function beachBall(g, x, y, r, rot, sq) {
    g.save(); g.translate(x, y); g.scale(1 + (1 - sq) * 0.6, sq); g.rotate(rot); circ(g, 0, 0, r, '#FFFFFF');
    var cols = ['#F27D7D', '#7FB8F0', '#F7DC6F', '#8FD694', '#F2A0B8', '#B79CEB'];
    for (var i = 0; i < 6; i++) { g.fillStyle = cols[i]; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, i / 6 * TAU, (i + 0.5) / 6 * TAU); g.closePath(); g.fill(); }
    circ(g, 0, 0, r * 0.16, '#FFFFFF'); g.restore();
  }
  function onomato(g, text, x, y, size, col, a, rot) { if (a <= 0) return; g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(rot || 0); font(g, '800', size); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(0,0,0,.35)'; g.fillText(text, 2, 3); g.fillStyle = col; g.fillText(text, 0, 0); g.restore(); }
  function splash(g, x, y, u0, u, n, seed) { var q = u - u0; if (q < 0 || q > 1.1) return; for (var i = 0; i < n; i++) { var a = -Math.PI * (0.1 + 0.8 * rnd(i + seed)), v = 70 + rnd(i + seed + 1) * 130, px1 = x + Math.cos(a) * v * q, py1 = y + Math.sin(a) * v * q + 280 * q * q; if (py1 > y + 6) continue; circ(g, px1, py1, 3.4 - q * 1.6, 'rgba(190,225,250,' + (0.9 - q * 0.8) + ')'); } }
  // 1. the boulder (Raiders of the Lost Ark): it turns out to be a beach ball
  function boulder(g, u, d, calm) {
    var shake = calm || u < 3.0 || u > 5.1 ? 0 : 1.6;
    g.save(); if (shake) g.translate(Math.sin(u * 53) * shake, Math.cos(u * 47) * shake);
    sky(g, [[0, '#EE9A55'], [0.55, '#F7CE88'], [1, '#FCE9BE']], 280);
    glow(g, 520, 92, 200, '255,236,190', 0.45); circ(g, 520, 92, 32, '#FFF1BE');
    g.fillStyle = '#C99A62'; g.beginPath(); g.moveTo(-60, 282); g.lineTo(20, 150); g.lineTo(110, 150); g.lineTo(150, 282); g.fill();
    for (var c = 0; c < 3; c++) { rr(g, 200 + c * 60, 170, 22, 112, 3, '#B98750'); rr(g, 194 + c * 60, 164, 34, 10, 3, '#C9996A'); }
    g.fillStyle = lin(g, 0, 280, 0, 360, [[0, '#E0B678'], [1, '#C79A5C']]); g.fillRect(-60, 280, VW + 120, 120);
    rr(g, 322, 262, 44, 24, 3, '#9C7448'); rr(g, 316, 256, 56, 8, 3, '#B58A58');
    var taken = u > 2.3;
    if (!taken) { glow(g, 344, 244, 30, '255,225,120', 0.5 + 0.2 * Math.sin(u * 8)); bone(g, 344, 246, 1.2, 0, '#F6C945'); }
    var tx = u < 3.5 ? 276 : Math.min(548, 276 + (u - 3.5) * 270), running = u >= 3.5 && tx < 548, face = tx >= 548 ? -1 : 1;
    var tid = pup(g, 'tidbit', tx, 306, 1.5, { pose: running ? 'run' : 'sit', face: face, t: u, ph: tx * 0.24, over: HAT.explorer, wag: running ? Math.sin(u * 16) * 0.7 : Math.sin(u * 6) * 0.4, lift: running ? 4 * Math.abs(Math.sin(u * 14)) : 0, ear: running ? -0.6 : 0 });
    if (taken) bone(g, tid.x + 17 * face, tid.y + 26, 0.95, 0.3 * face, '#F6C945');
    var sug = pup(g, 'sugarfoot', 598, 306, 1.4, { pose: 'sit', face: -1, t: u + 1, ear: u > 3.2 ? -0.7 : 0, tilt: u > 3.2 ? -0.1 : 0 });
    var bx = u < 3.2 ? -90 : u < 4.5 ? -90 + (u - 3.2) * 340 : 352 + 96 * eout((u - 4.5) / 0.9), isBall = u > 5.3;
    if (u >= 3.1 && u < 5.9) {
      var rot = bx / 46;
      if (!isBall) { g.save(); g.translate(bx, 262); g.rotate(rot); circ(g, 0, 0, 46, '#8D8A94'); circ(g, -12, -14, 14, '#9C99A4'); line(g, -30, 10, -8, 22, '#6E6B76', 3); line(g, 10, -34, 24, -10, '#6E6B76', 3); line(g, 14, 24, 34, 12, '#6E6B76', 3); g.restore(); }
      else { var sq = 1 - 0.28 * bump((u - 5.3) / 0.7) - 0.06 * clamp((u - 5.9) / 1, 0, 1); beachBall(g, bx, 262 + (1 - sq) * 40, 46, rot * 0.3, sq); }
      if (!calm && u < 5.3) for (var k = 0; k < 8; k++) { var q = ((u * 1.6 + rnd(k + 1500)) % 1); g.globalAlpha = (1 - q) * 0.5; circ(g, bx - 30 - q * 80 - rnd(k + 1501) * 24, 300 - q * 20, 5 + q * 11, '#E2C79A'); g.globalAlpha = 1; }
    }
    if (u > 5.3 && u < 6.4) onomato(g, 'pffffft…', 440, 214, 24, '#FFFFFF', win(u, 5.3, 6.4, 0.2), -0.08);
    narr('In a world of golden bones…', u, 0.1, 2.0);
    say(g, tid, 'Golden bone. Easy!', u, 2.1, 3.3);
    say(g, sug, 'Tidbit! RUN!', u, 3.5, 4.8, { big: true });
    say(g, tid, 'A… beach ball?', u, 5.5, 7.0);
    say(g, sug, 'Every time.', u, 6.2, 7.4);
    g.restore();
  }
  // 2. the pond (Jaws): a fin, two dramatic notes, and a very small shark
  function jaws(g, u, d, calm) {
    sky(g, [[0, '#0E1636'], [1, '#25306A']], 210); stars(g, 40, 1600, u, 170, calm);
    circ(g, 520, 58, 22, '#FFF4D2'); circ(g, 529, 52, 19, '#18204A'); glow(g, 520, 58, 90, '255,240,200', 0.12);
    var WL = 236;
    g.fillStyle = lin(g, 0, 190, 0, 360, [[0, '#2E4F8C'], [1, '#14265A']]); g.fillRect(-60, 190, VW + 120, 220);
    for (var w = 0; w < 9; w++) line(g, 20 + w * 74 + Math.sin(u * 1.2 + w) * 8, 214 + (w % 3) * 16, 60 + w * 74 + Math.sin(u * 1.2 + w) * 8, 214 + (w % 3) * 16, 'rgba(150,190,240,.25)', 1.6);
    g.fillStyle = 'rgba(255,240,200,.14)'; g.fillRect(500, 190, 40, 170);
    rr(g, 556, 196, 100, 10, 2, '#5A4636'); rr(g, 580, 204, 8, 60, 2, '#4A3A2C'); rr(g, 630, 204, 8, 60, 2, '#4A3A2C');
    // Tidbit paddles on a duck ring
    var by = WL + 5 + Math.sin(u * 2.3) * 3, leap = clamp((u - 3.0) / 1.0, 0, 1), air = bump(leap) * 110, fl = leap < 1 && leap > 0 ? -TAU * leap : 0, tx = 250 + leap * 60;
    if (u < 3.0 || u > 4.1) {
      var tid = pup(g, 'tidbit', tx, (u > 4.1 ? WL + 36 : by) + 18, 1.45, { pose: 'sit', face: 1, t: u, tilt: u < 3.0 ? Math.sin(u * 2) * 0.06 : 0.1, noShadow: true, ear: u >= 2.7 && u < 3 ? -1.2 : 0 });
      if (u < 3.0) { ell(g, tx + 2, by + 8, 36, 12, '#F7DC6F'); ell(g, tx + 2, by + 6, 24, 6, '#14265A'); circ(g, tx - 30, by + 2, 6, '#F7DC6F'); }
    } else { var tl = pup(g, 'tidbit', tx, WL + 18 - air, 1.45, { pose: 'wiggle', face: 1, t: u, rot: fl, noShadow: true, ear: -1 }); }
    // the fin glides in from the right, two beats at a time
    var fx = u < 2.7 ? mix(660, 330, clamp((u - 0.5) / 2.2, 0, 1)) : 330;
    var beat = u > 0.8 && u < 3.0 ? Math.max(0, Math.sin(u * Math.PI * 2 / 0.9)) : 0;
    var rise = clamp((u - 2.9) / 0.5, 0, 1);
    var sy0 = WL + 40 - 30 * rise;
    g.save(); g.beginPath(); g.rect(0, 0, VW, WL + 2); g.clip();
    var sug = pup(g, 'sugarfoot', fx, sy0 + 50, 1.5, { pose: 'sit', face: -1, t: u + 1, over: function (gg) { gg.fillStyle = '#8A8FA0'; gg.beginPath(); gg.moveTo(-8, -9); gg.lineTo(0, -38); gg.lineTo(10, -9); gg.fill(); gg.fillStyle = '#A8ADBD'; gg.beginPath(); gg.moveTo(-3, -11); gg.lineTo(0, -30); gg.lineTo(4, -11); gg.fill(); }, noShadow: true, tilt: u > 3.0 ? 0.08 : 0 });
    g.restore();
    if (u > 0.5 && u < 3.0) for (var r2 = 0; r2 < 3; r2++) { var rq = ((u * 0.9 + r2 / 3) % 1); g.strokeStyle = 'rgba(200,225,255,' + 0.45 * (1 - rq) + ')'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(fx, WL + 2, 14 + rq * 50, 3 + rq * 7, 0, 0, TAU); g.stroke(); }
    ell(g, fx, WL + 3, 20, 3.5, 'rgba(120,160,220,.35)');
    onomato(g, beat > 0.5 ? 'DUN…' : 'dun…', 330, 120, beat > 0.5 ? 40 : 34, '#E4566E', win(u, 0.9, 2.9, 0.25) * (0.5 + 0.5 * beat), 0);
    splash(g, tx + 20, WL + 2, 3.9, u, 16, 1700);
    if (u > 3.9) for (var rr2 = 0; rr2 < 2; rr2++) { var q3 = ((u - 3.9) * 0.8 + rr2 * 0.4) % 1; g.strokeStyle = 'rgba(210,235,255,' + 0.6 * (1 - q3) + ')'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(tx + 20, WL + 4, 18 + q3 * 70, 3 + q3 * 9, 0, 0, TAU); g.stroke(); }
    say(g, { x: tx, y: by - 38, who: 'tidbit' }, 'Nice night for a swim.', u, 0.3, 1.7);
    say(g, { x: tx, y: by - 38, who: 'tidbit' }, '…Hello?', u, 2.0, 2.9);
    say(g, sug, 'Gotcha!', u, 3.0, 4.2, { big: true });
    say(g, { x: tx, y: WL - 20, who: 'tidbit' }, 'We need a bigger bone!', u, 4.4, 6.0);
  }
  // 3. slow motion (The Matrix): Tidbit dodges a pie, and the pie finds Sugarfoot
  function matrix(g, u, d, calm) {
    g.fillStyle = lin(g, 0, 0, 0, VH, [[0, '#04140C'], [1, '#0A2E1A']]); g.fillRect(-60, -60, VW + 120, VH + 120);
    for (var c = 0; c < 36; c++) { var cx0 = 10 + c * 18, sp = 30 + rnd(c + 1800) * 60, off = rnd(c + 1801) * 400; font(g, '600', 12, '"IBM Plex Mono", monospace'); g.textAlign = 'center'; for (var k = 0; k < 9; k++) { var yy = ((u * sp + off - k * 16) % 460) - 40; g.fillStyle = 'rgba(80,255,150,' + (0.5 * (1 - k / 9) * 0.8) + ')'; g.fillText(String.fromCharCode(0x30A0 + Math.floor(rnd(c * 9 + k + Math.floor(u * 3)) * 60)), cx0, yy); } }
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(-60, 290, VW + 120, 120);
    var lean = sio((u - 1.4) / 0.9) * (1 - sio((u - 2.9) / 0.9));
    var tid = pup(g, 'tidbit', 250, 312, 1.6, { pose: 'sit', face: 1, t: u, rot: -0.55 * lean, tilt: -0.2 * lean, sy: 1 - 0.1 * lean, over: function (gg) { rr(gg, -9, -5, 24, 6, 3, '#101010'); circ(gg, -3, -2, 4.4, '#0A0A0A'); circ(gg, 8, -2, 4.4, '#0A0A0A'); gg.fillStyle = 'rgba(120,255,170,.5)'; gg.fillRect(-6, -4, 3, 1.5); } });
    var hit = u > 3.6, pie = u > 0.9 && u < 3.7;
    var sug = pup(g, 'sugarfoot', 500, 312, 1.6, { pose: 'sit', face: -1, t: u + 1, ear: hit ? -0.9 : 0, tilt: hit ? 0.2 : 0 });
    if (pie) { var q = clamp((u - 0.9) / 2.8, 0, 1), px0 = mix(-40, 484, q), py0 = 236 + 8 * Math.sin(q * 3) - 18 * bump(q); for (var gh = 4; gh >= 1; gh--) { g.globalAlpha = 0.14 * (5 - gh) / 4; var gq = clamp(q - gh * 0.03, 0, 1); ell(g, mix(-40, 484, gq), 236 + 8 * Math.sin(gq * 3) - 18 * bump(gq), 24, 7, '#F6F0E4'); } g.globalAlpha = 1; ell(g, px0, py0 + 4, 26, 7, '#C98A4E'); ell(g, px0, py0 - 1, 24, 9, '#FFF8EC'); circ(g, px0 - 4, py0 - 9, 4, '#D93A52'); }
    if (hit) { var sq2 = clamp((u - 3.6) / 0.25, 0, 1); for (var b2 = 0; b2 < 7; b2++) { var ang = -Math.PI * (0.1 + 0.8 * rnd(b2 + 1850)), v = 40 + rnd(b2 + 1851) * 70, qq = clamp((u - 3.6) / 0.9, 0, 1); circ(g, 488 + Math.cos(ang) * v * qq, 262 + Math.sin(ang) * v * qq + 60 * qq * qq, 5 - qq * 2, '#FFF8EC'); } ell(g, sug.x - 8, sug.y + 24, 20 * sq2, 14 * sq2, '#FFF8EC'); circ(g, sug.x - 12, sug.y + 16, 5 * sq2, '#FFF8EC'); circ(g, sug.x - 2, sug.y + 28, 5 * sq2, '#FFF8EC'); circ(g, sug.x - 14, sug.y + 31, 4 * sq2, '#D93A52'); }
    onomato(g, 'SPLAT!', 500, 170, 34, '#FFF8EC', win(u, 3.6, 4.7, 0.1), 0.1);
    say(g, tid, 'Whoa… slow motion.', u, 0.3, 1.8);
    say(g, tid, 'I know pie-fu.', u, 2.0, 3.4);
    say(g, sug, 'Why is it always me?', u, 4.0, 5.4);
    say(g, sug, 'Mmm. Cherry.', u, 5.5, 6.4);
  }
  // 4. snakes on a plane (the famous line, kept family-friendly): Tidbit has had it, and Sugarfoot gets there first
  function snk(g, x0, y0, x1, y1, t, amp, w, col, headCol) {
    var n = 22, dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, pts = [];
    for (var i = 0; i <= n; i++) { var q = i / n, off = Math.sin(t * 5 - q * 9) * amp * (0.25 + q); pts.push([x0 + dx * q + nx * off, y0 + dy * q + ny * off]); }
    for (var k = 0; k < n; k++) { g.strokeStyle = k % 4 < 2 ? col : '#3E9A58'; g.lineWidth = w * (1 - 0.45 * (k / n)); g.lineCap = 'round'; g.beginPath(); g.moveTo(pts[k][0], pts[k][1]); g.lineTo(pts[k + 1][0], pts[k + 1][1]); g.stroke(); }
    var h = pts[n], pr = pts[n - 1], ang = Math.atan2(h[1] - pr[1], h[0] - pr[0]);
    g.save(); g.translate(h[0], h[1]); g.rotate(ang);
    ell(g, 2, 0, w * 0.75, w * 0.6, headCol || col); circ(g, 1, -w * 0.28, 1.9, '#fff'); circ(g, 1, w * 0.28, 1.9, '#fff'); circ(g, 1.6, -w * 0.28, 0.9, '#222'); circ(g, 1.6, w * 0.28, 0.9, '#222');
    if (Math.floor(t * 4) % 2) { line(g, w * 0.7, 0, w * 0.7 + 7, 0, '#E4566E', 1.1); line(g, w * 0.7 + 7, 0, w * 0.7 + 10, -2, '#E4566E', 1); line(g, w * 0.7 + 7, 0, w * 0.7 + 10, 2, '#E4566E', 1); }
    g.restore();
  }
  function snakes(g, u, d, calm) {
    // the cabin: a wall of windows over a row of blue seats, overhead bins, and a carpeted aisle
    g.fillStyle = lin(g, 0, 0, 0, VH, [[0, '#E3EAF4'], [1, '#B8C6DB']]); g.fillRect(-60, -60, VW + 120, VH + 120);
    rr(g, -20, -4, VW + 40, 56, 6, '#C9D3E3'); for (var b = 0; b < 4; b++) { rr(g, 22 + b * 160, 8, 140, 38, 8, '#D8E0EE'); rr(g, 22 + b * 160, 40, 140, 5, 2, '#AEBBD0'); }
    var open = u > 1.0 ? clamp((u - 1.0) / 0.25, 0, 1) : 0;
    for (var w2 = 0; w2 < 4; w2++) { var wx = 56 + w2 * 160; rr(g, wx, 78, 86, 78, 22, '#9FB0C8'); g.save(); g.beginPath(); if (g.roundRect) g.roundRect(wx + 5, 83, 76, 68, 18); else g.rect(wx + 5, 83, 76, 68); g.clip(); g.fillStyle = lin(g, 0, 83, 0, 151, [[0, '#7DBEF2'], [1, '#D6EEFF']]); g.fillRect(wx, 80, 90, 80); puff(g, wx + ((u * 30 + w2 * 40) % 120) - 40, 118, 0.7, 'rgba(255,255,255,.95)'); g.restore(); }
    for (var sr = 0; sr < 4; sr++) { var sxs = 40 + sr * 160; rr(g, sxs, 196, 110, 150, 26, '#4A6FA5'); rr(g, sxs + 10, 206, 90, 22, 11, '#6A8FC4'); }
    g.fillStyle = '#6D7C9A'; g.fillRect(-60, 318, VW + 120, 100); g.fillStyle = 'rgba(255,255,255,.12)'; for (var cs = 0; cs < 10; cs++) g.fillRect(cs * 70, 318, 3, 100);
    // oxygen masks drop
    if (open > 0) for (var m = 0; m < 4; m++) { var mx = 98 + m * 160 + Math.sin(u * 3 + m) * 4, my = 40 + open * (44 + 10 * Math.sin(m * 2)); line(g, 98 + m * 160, 40, mx, my, '#9AA3B5', 1.6); ell(g, mx, my + 5, 9, 7, '#F7D86A'); }
    // snakes tumble out of the bins (cheerful, green and not scary), and two slither down the aisle
    var drop = sio((u - 1.0) / 0.7), fl = u > 1.6 ? clamp((u - 1.6) / 0.5, 0, 1) : 0;
    if (drop > 0) [[120, 0], [330, 1], [520, 2]].forEach(function (s0) { snk(g, s0[0], 44, s0[0] + Math.sin(u * 2 + s0[1]) * 14, 44 + 120 * drop + s0[1] * 14, u + s0[1], 7, 11, '#5CC47A'); });
    if (fl > 0) { snk(g, -40 + 150 * fl, 330, 130 + 150 * fl, 336, u, 8, 12, '#6FD08A'); snk(g, 700 - 230 * fl, 340, 520 - 230 * fl, 332, u + 1, 8, 12, '#4FB86F', '#4FB86F'); }
    onomato(g, 'SSSSSSS', 330, 72, 34, '#2F8A4C', win(u, 1.2, 2.8, 0.15), -0.04);
    // the two on the case
    var stand = clamp((u - 1.5) / 0.4, 0, 1), tcx = 200, tid = pup(g, 'tidbit', tcx, 326, 1.45, { pose: u < 1.5 ? 'sit' : 'run', face: 1, t: u, ph: u * 5, over: HAT.goggles, tilt: -0.04 + 0.04 * Math.sin(u * 9) * stand, wag: 0.3, lift: 0 });
    var dash = u < 3.7 ? 470 : u < 4.1 ? mix(470, 262, eio((u - 3.7) / 0.4)) : u < 5.4 ? 262 : mix(262, 340, sio((u - 5.4) / 0.6));
    var sug = pup(g, 'sugarfoot', dash, 326, 1.45, { pose: (u >= 3.7 && u < 4.1) ? 'run' : 'sit', face: -1, t: u + 1, ph: u * 18, over: HAT.beanie('#7FB8F0'), lift: (u >= 3.7 && u < 4.1) ? 6 : 0 });
    // the paw that stops the word
    if (u >= 4.05 && u < 5.5) { var px = tid.x + 14, py = tid.y + 8; ell(g, px, py, 11, 8, '#C98A4E', 0.2); circ(g, px - 4, py - 5, 2.2, '#B97847'); circ(g, px + 1, py - 6, 2.2, '#B97847'); circ(g, px + 6, py - 4, 2.2, '#B97847'); }
    onomato(g, 'FWUMP!', 300, 186, 30, '#FFF8EC', win(u, 4.0, 4.9, 0.1), 0.08);
    say(g, sug, 'What a smooth flight!', u, 0.2, 1.4);
    say(g, tid, 'Snakes?!', u, 1.6, 2.5);
    say(g, tid, 'I have had it with these snakes on this—', u, 2.6, 4.0, { big: true });
    say(g, sug, '…PLANE! This lovely plane!', u, 4.1, 5.0, { big: true });
    say(g, tid, 'Mmf mmf!', u, 5.0, 5.5);
    say(g, tid, '…on this plane.', u, 5.6, 6.3);
    say(g, sug, 'Good girl.', u, 6.3, 7.0);
  }
  // 5. the vault (Mission: Impossible): a cookie, a rope and a muffled partner
  function vault(g, u, d, calm) {
    g.fillStyle = lin(g, 0, 0, 0, VH, [[0, '#10121F'], [1, '#22263C']]); g.fillRect(-60, -60, VW + 120, VH + 120);
    for (var t = 0; t < 8; t++) { g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(t * 84, 0, 2, 300); }
    g.fillStyle = '#1A1C2C'; g.fillRect(-60, 300, VW + 120, 100);
    var alarm = u > 4.3, flick = alarm ? (Math.floor(u * 6) % 2 ? 1 : 0.4) : 1;
    for (var l = 0; l < 7; l++) { var y0 = 70 + l * 36, y1 = 70 + ((l * 53) % 7) * 36 + 40; g.strokeStyle = 'rgba(255,60,80,' + (0.5 * flick * (0.7 + 0.3 * Math.sin(u * 5 + l))) + ')'; g.lineWidth = alarm ? 3 : 2; g.beginPath(); g.moveTo(-10, y0); g.lineTo(650, y1); g.stroke(); }
    if (alarm) { g.fillStyle = 'rgba(255,40,70,' + (0.14 * (Math.floor(u * 6) % 2 ? 1 : 0.2)) + ')'; g.fillRect(0, 0, VW, VH); }
    rr(g, 296, 268, 48, 40, 3, '#3A3F5A'); ell(g, 320, 266, 34, 7, '#E8E8F0'); ell(g, 320, 263, 14, 6, '#C98A4E'); circ(g, 316, 262, 1.4, '#6B4A2A'); circ(g, 324, 264, 1.4, '#6B4A2A');
    var q = clamp((u - 0.6) / 3.0, 0, 1), y0r = u < 4.0 ? mix(-6, 188, eio(q)) : mix(188, 308, clamp((u - 4.0) / 0.45, 0, 1) * clamp((u - 4.0) / 0.45, 0, 1)), fall = clamp((u - 4.0) / 0.5, 0, 1), rot = u < 4.0 ? Math.PI + Math.sin(u * 2) * 0.05 : Math.PI + Math.PI * fall;
    var tid = pup(g, 'tidbit', 566, 308, 1.5, { pose: 'sit', face: -1, t: u, ear: -0.4, tilt: u > 4.0 ? 0.15 : -0.05 });
    if (u < 4.0) { line(g, 320, -6, 320, y0r, '#B8A27A', 2.2); line(g, 320, -6, tid.x - 4, tid.y + 16, '#B8A27A', 2.2); circ(g, 320, -4, 5, '#8A8FA0'); }
    var sug = pup(g, 'sugarfoot', 320, y0r, 1.5, { pose: 'sit', face: 1, t: u + 1, rot: rot, noShadow: u < 4.2, ear: -0.5 });
    onomato(g, 'WEE-OO! WEE-OO!', 320, 48, 28, '#FF6A86', win(u, 4.3, 6.2, 0.1) * flick, 0);
    say(g, sug, 'Almost there…', u, 0.9, 2.3);
    say(g, tid, 'Mmf! Mmf mmf!', u, 1.5, 2.9);
    say(g, sug, 'Got it!', u, 3.0, 3.9, { big: true });
    say(g, tid, '…Oops.', u, 4.0, 5.0);
    say(g, sug, 'Mission: possible… ish.', u, 5.0, 6.6);
  }
  // 5. the bridge (The Lord of the Rings, and Steve Urkel): a wizard holds the line against a ladybug
  function bridge(g, u, d, calm) {
    sky(g, [[0, '#8EC8F2'], [1, '#EAF6FF']], 250); puff(g, 90 + u * 5, 60, 0.8, 'rgba(255,255,255,.95)'); puff(g, 420 + u * 4, 40, 0.6, 'rgba(255,255,255,.9)');
    g.fillStyle = '#7DB868'; g.beginPath(); g.moveTo(-60, 250); g.quadraticCurveTo(200, 210, 420, 244); g.quadraticCurveTo(560, 230, 700, 244); g.lineTo(700, 400); g.lineTo(-60, 400); g.fill();
    var WL = 306; g.fillStyle = lin(g, 0, WL - 20, 0, 380, [[0, '#6CB5E4'], [1, '#3F86C2']]); g.fillRect(-60, WL - 6, VW + 120, 100);
    for (var w = 0; w < 8; w++) line(g, 10 + w * 84 + Math.sin(u * 1.4 + w) * 6, WL + 14 + (w % 3) * 12, 56 + w * 84 + Math.sin(u * 1.4 + w) * 6, WL + 14 + (w % 3) * 12, 'rgba(255,255,255,.35)', 1.6);
    rr(g, 150, 268, 340, 12, 3, '#A9825A'); for (var pl = 0; pl < 11; pl++) line(g, 156 + pl * 31, 268, 156 + pl * 31, 280, '#7E5C3A', 1.5);
    rr(g, 150, 232, 8, 38, 2, '#8B6743'); rr(g, 482, 232, 8, 38, 2, '#8B6743'); rr(g, 150, 232, 340, 5, 2, '#8B6743'); rr(g, 150, 250, 340, 4, 2, '#8B6743');
    var hitU = 3.7, tumble = clamp((u - hitU) / 0.9, 0, 1);
    // Sugarfoot the wizard, staff and all
    var sx = u < hitU ? 330 : 330 + tumble * 90, sy = u < hitU ? 268 : 268 + (-80 * bump(tumble) + 120 * tumble * tumble), srot = u < hitU ? 0 : tumble * TAU * 1.2;
    var inWater = sy > WL - 10 && u >= hitU;
    function wiz(gg) { gg.fillStyle = '#9AA0B4'; gg.beginPath(); gg.moveTo(-12, -9); gg.lineTo(2, -40); gg.lineTo(14, -9); gg.fill(); ell(gg, 1, -9, 17, 4, '#8A90A4'); ell(gg, 4, 11, 7, 9, '#F4F4F4'); }
    if (!inWater) {
      var sug = pup(g, 'sugarfoot', sx, sy, 1.55, { pose: 'sit', face: 1, t: u + 1, rot: srot, over: wiz, ear: u > 1.3 && u < 3.4 ? -0.4 : 0, noShadow: u >= hitU });
      if (u < hitU) { line(g, sx + 34, 268, sx + 34, 182, '#7A5636', 4); circ(g, sx + 34, 178, 8, '#BFE7F5'); glow(g, sx + 34, 178, u > 1.4 && u < 3.2 ? 44 : 26, '200,240,255', u > 1.4 && u < 3.2 ? 0.7 : 0.35); }
    }
    // the ladybug: a very slow, very brave visitor
    var lx = mix(160, 480, clamp((u - 0.4) / 3.1, 0, 1)); if (u < hitU + 0.2) { circ(g, lx, 262, 6, '#E4566E'); g.fillStyle = '#2A2A3A'; g.beginPath(); g.arc(lx + 4, 262, 3, 0, TAU); g.fill(); circ(g, lx - 1, 260, 1.1, '#2A2A3A'); circ(g, lx + 2, 264, 1.1, '#2A2A3A'); line(g, lx - 3, 267, lx - 4, 270, '#2A2A3A', 1); line(g, lx + 3, 267, lx + 4, 270, '#2A2A3A', 1); }
    // Tidbit comes in way too fast
    var tx = u < 3.1 ? -60 : u < hitU ? mix(-60, 300, (u - 3.1) / (hitU - 3.1)) : 300 + tumble * 80, ty = u < hitU ? 268 : 268 + (-40 * bump(tumble) + 130 * tumble * tumble);
    if (u >= 3.1 && !inWater) { pup(g, 'tidbit', tx, ty, 1.55, { pose: u < hitU ? 'run' : 'wiggle', face: 1, t: u, ph: tx * 0.24, rot: u < hitU ? 0 : -tumble * TAU, lift: u < hitU ? 3 * Math.abs(Math.sin(u * 16)) : 0, wag: 0.7, noShadow: u >= hitU }); }
    // both end up in the stream, heads out
    if (u >= hitU + 0.9) {
      g.save(); g.beginPath(); g.rect(0, 0, VW, WL + 2); g.clip();
      var bob = Math.sin(u * 3) * 2; pup(g, 'sugarfoot', 420, WL + 40 + bob, 1.55, { pose: 'sit', face: -1, t: u + 1, over: wiz, noShadow: true, ear: -0.8 }); pup(g, 'tidbit', 380, WL + 40 - bob, 1.55, { pose: 'sit', face: 1, t: u, noShadow: true, ear: -1 }); g.restore();
      for (var r3 = 0; r3 < 2; r3++) { var rq = ((u - hitU - 0.9) * 0.7 + r3 * 0.5) % 1; g.strokeStyle = 'rgba(255,255,255,' + 0.6 * (1 - rq) + ')'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(400, WL + 2, 30 + rq * 80, 4 + rq * 10, 0, 0, TAU); g.stroke(); }
    }
    splash(g, 400, WL, hitU + 0.7, u, 20, 1900);
    var sh = u >= hitU + 0.9 ? { x: 420, y: WL - 40, who: 'sugarfoot' } : { x: sx, y: sy - 74, who: 'sugarfoot' };
    say(g, { x: sx, y: 268 - 74, who: 'sugarfoot' }, 'YOU SHALL NOT PASS!', u, 1.0, 3.0, { big: true });
    say(g, { x: sx, y: 268 - 74, who: 'sugarfoot' }, '…Okay.', u, 3.05, 3.65);
    say(g, { x: 396, y: WL - 40, who: 'tidbit' }, 'Did I do that?', u, 5.3, 6.6);
  }
  // 6. the leap (Toy Story): to infinity, and into the laundry
  function laundry(g, u, d, calm) {
    sky(g, [[0, '#7CC6F2'], [1, '#E6F6FF']], 250); circ(g, 560, 58, 24, '#FFF1B0'); glow(g, 560, 58, 100, '255,245,190', 0.5); puff(g, 120 + u * 5, 62, 0.8, 'rgba(255,255,255,.95)');
    g.fillStyle = '#A6DB86'; g.fillRect(-60, 250, VW + 120, 160); g.fillStyle = '#86C76C'; g.fillRect(-60, 296, VW + 120, 100);
    for (var f = 0; f < 22; f++) rr(g, f * 30 - 10, 220, 14, 50, 3, '#F4EFE0');
    rr(g, -10, 238, VW + 20, 5, 2, '#E8E0CC'); rr(g, -10, 252, VW + 20, 5, 2, '#E8E0CC');
    // the doghouse
    rr(g, 24, 226, 120, 80, 4, '#C9704A'); g.fillStyle = '#9A4E32'; g.beginPath(); g.moveTo(10, 228); g.lineTo(84, 186); g.lineTo(158, 228); g.fill(); rr(g, 60, 256, 48, 50, 18, '#3A2418');
    // the laundry basket
    var landU = 2.5, bq = clamp((u - landU) / 0.3, 0, 1), bsq = 1 - 0.14 * bump(bq);
    rr(g, 440, 280, 80, 30 * bsq + 4, 6, '#C9A06A'); for (var wv = 0; wv < 5; wv++) line(g, 450 + wv * 16, 284, 450 + wv * 16, 308, '#A8804C', 1.6);
    var pile = u < landU ? [['#F2A0B8', 460, 276], ['#7FB8F0', 482, 272], ['#F7DC6F', 500, 278]] : [];
    pile.forEach(function (p) { ell(g, p[1], p[2], 16, 8, p[0]); });
    // Sugarfoot, folding
    var sug = pup(g, 'sugarfoot', 580, 308, 1.5, { pose: 'sit', face: -1, t: u + 1, ear: u > landU ? -0.9 : 0, tilt: u > landU + 0.4 ? 0.12 : 0 });
    // Tidbit, caped, on the roof, then airborne
    var lq = clamp((u - 1.6) / (landU - 1.6), 0, 1), air = u > 1.6 && u < landU;
    var tx = air ? mix(96, 480, lq) : u >= landU ? 480 : 96, ty = air ? mix(190, 280, lq) - 120 * 4 * lq * (1 - lq) : u >= landU ? 282 + 12 * bump(clamp((u - landU) / 0.4, 0, 1)) : 190;
    var tid = pup(g, 'tidbit', tx, ty, 1.55, { pose: air ? 'wiggle' : u >= landU ? 'sit' : 'sit', face: 1, t: u, over: HAT.goggles, cape: '#E4566E', capeFly: air, rot: air ? -0.5 + lq * 1.1 : 0, ear: air ? -1.2 : 0, wag: 0.6, noShadow: air });
    if (u >= landU) {
      var q2 = clamp((u - landU) / 1.2, 0, 1); for (var s = 0; s < 14; s++) { var a = -Math.PI * (0.1 + 0.8 * rnd(s + 2000)), v = 80 + rnd(s + 2001) * 120, px1 = 480 + Math.cos(a) * v * q2, py1 = 276 + Math.sin(a) * v * q2 + 300 * q2 * q2; if (py1 > 306) py1 = 306 + (s % 3) * 3; ell(g, px1, py1, 13, 6, ['#F2A0B8', '#7FB8F0', '#F7DC6F', '#8FD694', '#B79CEB'][s % 5], q2 * 6 + s); }
      // a sock lands on Tidbit's head
      var sq3 = clamp((u - landU - 0.8) / 0.5, 0, 1); if (sq3 > 0) { g.save(); g.translate(tid.x + 2, tid.y - 8 + (1 - eout(sq3)) * -40); g.rotate(0.3); rr(g, -6, -20, 12, 26, 6, '#F7DC6F'); rr(g, -6, -20, 12, 6, 3, '#E4566E'); g.restore(); }
    }
    onomato(g, 'FWOOMP!', 470, 236, 28, '#FFFFFF', win(u, landU, landU + 1.1, 0.1), -0.1);
    say(g, { x: 96, y: 112, who: 'tidbit' }, 'Ready? Watch this!', u, 0.3, 1.6);
    say(g, { x: tx, y: Math.max(40, ty - 70), who: 'tidbit' }, 'To infinity… and beyond!', u, 1.7, 2.9, { big: true });
    say(g, sug, 'That’s my laundry.', u, 3.1, 4.3);
    say(g, tid, 'To infinity… and the laundry!', u, 4.4, 6.1);
  }

  // ---------------------------------------------------------------- the edit: every shot on the timeline
  // [start, end, id, draw function, extra]
  // the funny middle: a card, then six bits (id, length in seconds, draw function)
  var GAGS = [['boulder', 7.2, boulder], ['jaws', 6.2, jaws], ['matrix', 6.2, matrix], ['snakes', 7.0, snakes], ['vault', 6.6, vault], ['bridge', 6.6, bridge], ['laundry', 6.2, laundry]];
  // each bit is slowed to the pace its lines need to be spoken, so the voices and the picture always go along together
  var GK = { boulder: 1.35, jaws: 1.5, matrix: 1.5, snakes: 1.8, vault: 1, bridge: 1.4, laundry: 1.35 };
  GAGS = GAGS.map(function (x) { var k = GK[x[0]] || 1, f = x[2]; return [x[0], x[1] * k, k === 1 ? f : function (g, u, d, c) { return f(g, u / k, d / k, c); }, k]; });
  var G0 = 38.7, GCARD = 1.8, GL = GCARD + GAGS.reduce(function (n, x) { return n + x[1]; }, 0);   // the funny middle starts at G0 and lasts GL seconds
  var POST_EXTRA = 1.6;   // a little longer at the very end, for one more gag
  var EDIT = [
    [0, 8.0, 'cold', coldOpen],
    [8.0, 10.0, 'card', function (g, u, d, c) { card(g, u, d, 'The pals are back.', null, c); }],
    [10.0, 12.0, 'balloon', balloon],
    [12.0, 14.0, 'lighthouse', lighthouse],
    [14.0, 16.0, 'mountain', mountain],
    [16.0, 17.5, 'card', function (g, u, d, c) { card(g, u, d, 'New places.', { size: 62 }, c); }],
    [17.5, 19.5, 'library', library],
    [19.5, 21.5, 'market', market],
    [21.5, 23.5, 'underwater', underwater],
    [23.5, 25.5, 'rooftop', rooftop],
    [25.5, 27.0, 'card', function (g, u, d, c) { card(g, u, d, 'New friends.', { size: 62 }, c); }],
    [27.0, 31.0, 'friend', friend],
    [31.0, 32.5, 'card', function (g, u, d, c) { card(g, u, d, 'Bigger adventures.', { size: 56 }, c); }],
    [32.5, 35.5, 'sneeze', sneeze],
    [35.5, 38.7, 'puddle', puddle],
    [G0, G0 + GCARD, 'card', function (g, u, d, c) { card(g, u, d, 'Funnier than ever.', { size: 56, c0: '#5B3A6B', c1: '#1C1030' }, c); }]
  ];
  (function () { var t = G0 + GCARD; GAGS.forEach(function (x) { EDIT.push([t, t + x[1], x[0], x[2]]); t += x[1]; }); })();
  [
    [38.7, 39.2, 'flash1', function (g, u, d, c) { zoomed(g, balloon, u + 0.8, 1.35, 330, 230, c); }, 'fast'],
    [39.2, 39.7, 'flash2', function (g, u, d, c) { zoomed(g, market, u + 1.2, 1.3, 320, 150, c); }, 'fast'],
    [39.7, 40.2, 'flash3', function (g, u, d, c) { zoomed(g, underwater, u + 1, 1.3, 330, 220, c); }, 'fast'],
    [40.2, 41.7, 'card', function (g, u, d, c) { card(g, u, d, 'Same big hearts.', { size: 58, c0: '#5A3460', c1: '#1E1028' }, c); }],
    [41.7, 47.7, 'hill', hill],
    [47.7, 48.7, 'riser', riser],
    [48.7, 55.2, 'reveal', reveal],
    [55.2, 55.9, 'black', function (g) { rr(g, -60, -60, VW + 120, VH + 120, 0, '#0B0816'); }],
    [55.9, 63.8 + POST_EXTRA, 'post', post]
  ].forEach(function (e) { var r = e.slice(); r[0] += GL; r[1] += GL; EDIT.push(r); });
  var DUR = 63.8 + GL + POST_EXTRA;
  function zoomed(g, fn, u, z, fx, fy, calm) { g.save(); g.translate(fx, fy); g.scale(z, z); g.translate(-fx, -fy); fn(g, u, 2, calm, true); g.restore(); }
  // in the calm version the fast flurry becomes one gentle look back at the balloon
  var CALM_SWAP = { flash1: [38.7 + GL, 40.2 + GL, 'flashc', function (g, u, d, c) { balloon(g, u + 0.3, 2, c, true); }] };
  function shotAt(T, calm) {
    for (var i = 0; i < EDIT.length; i++) {
      var s = EDIT[i]; if (T < s[1] || i === EDIT.length - 1) {
        if (calm && s[4] === 'fast') { var c = CALM_SWAP.flash1; return { i: i, s: c, u: T - c[0], d: c[1] - c[0] }; }
        return { i: i, s: s, u: T - s[0], d: s[1] - s[0] };
      }
    }
    return null;
  }

  // the words, for screen readers and the transcript
  var lastLive = '';
  function live(text) { if (FR.quiet) return; FR.line = text; }

  // ---------------------------------------------------------------- painting a frame
  // render(g, W, H, T, calm, bs): bs makes speech bubbles bigger on small screens
  function render(g, W, H, T, calm, bs) {
    FR.says = []; FR.secrets = []; FR.narr = []; FR.line = '';
    var k = Math.min(W / VW, H / VH), ox = (W - VW * k) / 2, oy = (H - VH * k) / 2;
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#0B0816'; g.fillRect(0, 0, W, H);
    g.save(); g.beginPath(); g.rect(ox, oy, VW * k, VH * k); g.clip();
    g.setTransform(k, 0, 0, k, ox, oy);
    var sh = shotAt(T, calm);
    drawShot(g, sh, calm, T);
    // calm: each cut becomes a soft cross-fade from the shot before
    if (calm && sh.i > 0 && sh.u < 0.4) {
      var prevT = sh.s[0] - 0.001, pv = shotAt(prevT, calm);
      if (pv && pv.s !== sh.s) { var keepS = FR.says, keepX = FR.secrets; FR.says = []; FR.secrets = []; FR.quiet = true; g.save(); g.globalAlpha = 1 - sio(sh.u / 0.4); drawShot(g, { i: pv.i, s: pv.s, u: pv.u + sh.u, d: pv.d }, calm, prevT); g.restore(); FR.quiet = false; FR.says = keepS; FR.secrets = keepX; }
    }
    // the cut "punch": the new picture lands a touch big and settles (motion only, no flash)
    g.setTransform(1, 0, 0, 1, 0, 0);
    // a soft vignette, for that cinema feel
    var vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,6,20,.38)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    // the speech bubbles, on top, at a steady size
    FR.says.forEach(function (s) { bubble(g, s, k * (bs || 1), ox, oy, W, H, calm); });
    // the trailer narrator: a big, low caption in the movie-trailer voice
    FR.narr.forEach(function (n) {
      if (!n.draw) return;
      var fs = 26 * k * (bs || 1); g.save(); g.globalAlpha = n.a; g.font = '800 ' + fs + 'px Lora, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(8,4,18,.55)'; g.fillText(n.text.toUpperCase(), W / 2 + 2, H * 0.86 + 2);
      g.fillStyle = '#FFE9B0'; g.fillText(n.text.toUpperCase(), W / 2, H * 0.86); g.restore();
    });
    // fade in from black at the very start, and out at the end
    var fade = Math.max(clamp(1 - T / 0.8, 0, 1), clamp((T - (DUR - 0.6)) / 0.6, 0, 1));
    if (fade > 0) { g.fillStyle = 'rgba(11,8,22,' + fade + ')'; g.fillRect(0, 0, W, H); }
    g.restore();
    FR.shot = sh.s[2];
    return sh;
  }
  function drawShot(g, sh, calm, T) {
    var punch = !calm && sh.i > 0 && sh.s[2] !== 'card' ? 1 + 0.05 * (1 - eout(sh.u / 0.3)) : 1;
    g.save();
    if (punch !== 1) { g.translate(320, 180); g.scale(punch, punch); g.translate(-320, -180); }
    try { sh.s[3](g, sh.u, sh.d, calm); } catch (e) { if (window.console) console.error('teaser shot ' + sh.s[2], e); }
    g.restore();
  }
  function wrap(g, text, maxW) { var words = String(text).split(' '), lines = [], cur = ''; words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }); if (cur) lines.push(cur); return lines; }
  function bubble(g, s, k, ox, oy, W, H, calm) {
    var big = s.o.big, fs = (big ? 30 : 19) * k, pad = 10 * k;
    g.font = (big ? '800 ' : '600 ') + fs + 'px Lora, Georgia, serif';
    var lines = wrap(g, s.text, Math.min(W * 0.62, 250 * k)), lh = fs * 1.22, w = 0; lines.forEach(function (l) { w = Math.max(w, g.measureText(l).width); });
    var bw = w + pad * 2.2, bh = lines.length * lh + pad * 1.5, tail = 12 * k;
    var bx = clamp(s.x - bw / 2, 8, W - bw - 8), by = s.y - bh - tail; if (by < 8) by = 8;
    var sc = calm ? 1 : 0.8 + 0.2 * backOut(s.pop / 0.22);
    g.save(); g.globalAlpha = s.a; g.translate(s.x, by + bh); g.scale(sc, sc); g.translate(-s.x, -(by + bh));
    g.fillStyle = 'rgba(20,10,40,.25)'; g.beginPath(); if (g.roundRect) g.roundRect(bx + 2 * k, by + 3 * k, bw, bh, 14 * k); else g.rect(bx, by, bw, bh); g.fill();
    var tx = clamp(s.x, bx + 16 * k, bx + bw - 16 * k);
    g.fillStyle = big ? '#FFF3D6' : '#FFFDF8'; g.beginPath(); if (g.roundRect) g.roundRect(bx, by, bw, bh, 14 * k); else g.rect(bx, by, bw, bh); g.fill();
    g.beginPath(); g.moveTo(tx - 7 * k, by + bh - 1); g.lineTo(tx + 7 * k, by + bh - 1); g.lineTo(s.x + (s.x < tx ? -2 : 2) * k, Math.min(s.y - 2 * k, by + bh + tail)); g.closePath(); g.fill();
    g.fillStyle = big ? '#B03A4F' : '#2B2140'; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach(function (l, i) { g.fillText(l, bx + bw / 2, by + pad * 0.75 + lh * (i + 0.5)); });
    g.restore();
  }

  // ---------------------------------------------------------------- the music and sounds (Web Audio)
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  var FXN = ['arf', 'arfarf', 'ruff', 'woof', 'yip', 'hmm', 'ooh', 'aww', 'mmm', 'sigh', 'laugh-1', 'laugh-2'];
  var SAMPLES = []; ['tidbit', 'sugarfoot'].forEach(function (w) { FXN.forEach(function (n) { SAMPLES.push(w + '-' + n); }); });
  var AMBN = ['birds', 'wind', 'waves', 'crickets', 'city', 'carnival', 'cafe', 'underwater', 'rain', 'stream'];   // the same place sounds Season 1 uses
  var BUF = {}, bufP = null, decodeCtx = null;
  function loadSamples(c) {
    if (bufP) return bufP; decodeCtx = c;
    var list = SAMPLES.map(function (n) { return ['/assets/audio/buddies/fx/' + n + '.mp3', n]; }).concat(AMBN.map(function (n) { return ['/assets/audio/ambience/' + n + '.mp3', 'amb:' + n]; })).concat([['/assets/audio/buddies/theme-open.mp3', 'theme']]);
    bufP = Promise.all(list.map(function (L) {
      return fetch(L[0]).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (ab) {
        if (!ab) return; return new Promise(function (ok) { try { var pr = c.decodeAudioData(ab, function (b) { BUF[L[1]] = b; ok(); }, function () { ok(); }); if (pr && pr.catch) pr.catch(function () { ok(); }); } catch (e) { ok(); } });
      }).catch(function () {});
    }));
    return bufP;
  }
  // the instruments, for any context (live, or offline for the video), into one bus
  function kit(c, bus, keep) {
    var noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), nd = noise.getChannelData(0), lastB = 0;
    for (var i = 0; i < nd.length; i++) nd[i] = rnd(i * 0.37 + 5) * 2 - 1;
    var brown = c.createBuffer(1, c.sampleRate * 3, c.sampleRate), bd = brown.getChannelData(0);
    for (var j = 0; j < bd.length; j++) { lastB = (lastB + 0.02 * (rnd(j * 0.71 + 9) * 2 - 1)) / 1.02; bd[j] = lastB * 3.5; }
    function src(n) { keep(n); return n; }
    function env(gn, t, a, peak, hold, rel) { gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(peak, t + a); gn.gain.setValueAtTime(peak, t + a + hold); gn.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel); }
    function osc(type, f, t, stop) { var o = src(c.createOscillator()); o.type = type; o.frequency.value = f; o.start(t); o.stop(stop); return o; }
    function gainTo(dest) { var gn = c.createGain(); gn.connect(dest || bus); return gn; }
    function noiseSrc(t, len, buf) { var n = src(c.createBufferSource()); n.buffer = buf || noise; n.loop = true; n.start(t); n.stop(t + len); return n; }
    function filt(type, f, q) { var b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; return b; }
    // Season 1's music bed: soft pads and plucks through a low-pass, kept low under everything else
    var mus = c.createGain(); mus.gain.value = 0.55; var mlp = c.createBiquadFilter(); mlp.type = 'lowpass'; mlp.frequency.value = 1500; mus.connect(mlp); mlp.connect(bus);
    var amb = c.createGain(); amb.gain.value = 0.9; amb.connect(bus);
    var I = {
      mpad: function (t, m, len, vol) { [[0, 'triangle', 0.5], [5, 'sine', 0.7]].forEach(function (v) { var o = osc(v[1], hz(m), t, t + len + 1.8), gn = gainTo(mus); o.detune.value = v[0]; var pk = vol * v[2]; gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(pk, t + Math.min(1.4, len * 0.35)); gn.gain.setValueAtTime(pk, t + len * 0.75); gn.gain.linearRampToValueAtTime(0.0001, t + len + 1.6); o.connect(gn); }); },
      mpluck: function (t, m, vol) { var o = osc('sine', hz(m), t, t + 1), gn = gainTo(mus); gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(vol, t + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.9); o.connect(gn); },
      amb: function (t, name, len, vol) { var b = BUF['amb:' + name]; if (!b) return; var sN = src(c.createBufferSource()), gn = gainTo(amb); sN.buffer = b; sN.loop = true; sN.connect(gn); gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(vol, t + 0.6); gn.gain.setValueAtTime(vol, t + Math.max(0.6, len - 0.7)); gn.gain.linearRampToValueAtTime(0.0001, t + len); sN.start(t, (name.length * 1.7) % Math.max(1, b.duration - 1)); sN.stop(t + len + 0.1); },
      pad: function (t, notes, len, vol) { notes.forEach(function (m) { [[-7, 'triangle', 0.5], [6, 'sine', 0.7]].forEach(function (v) { var o = osc(v[1], hz(m), t, t + len + 2.2), gn = gainTo(); o.detune.value = v[0]; env(gn, t, Math.min(1.6, len * 0.35), vol * v[2], len * 0.55, 1.8); o.connect(gn); }); }); },
      bass: function (t, m, len, vol) { var o = osc('triangle', hz(m), t, t + len + 0.4), gn = gainTo(); env(gn, t, 0.01, vol, len * 0.4, len * 0.5); o.connect(gn); var o2 = osc('sine', hz(m - 12), t, t + len + 0.4), g2 = gainTo(); env(g2, t, 0.01, vol * 0.8, len * 0.4, len * 0.5); o2.connect(g2); },
      pluck: function (t, m, vol) { var o = osc('triangle', hz(m), t, t + 0.8), gn = gainTo(); env(gn, t, 0.005, vol, 0.01, 0.5); o.connect(gn); },
      bell: function (t, m, vol) { [[1, 1, 2.2], [2.76, 0.25, 1.2], [5.4, 0.08, 0.6]].forEach(function (p) { var o = osc('sine', hz(m) * p[0], t, t + p[2] + 0.2), gn = gainTo(); env(gn, t, 0.004, vol * p[1], 0.02, p[2]); o.connect(gn); }); },
      piano: function (t, m, vol) { [[1, 1, 'triangle'], [2, 0.3, 'sine'], [3, 0.08, 'sine']].forEach(function (p) { var o = osc(p[2], hz(m) * p[0], t, t + 2.6), gn = gainTo(); env(gn, t, 0.005, vol * p[1], 0.04, 2 / p[0]); o.connect(gn); }); },
      marimba: function (t, m, vol) { [[1, 1, 0.7], [4, 0.15, 0.2]].forEach(function (p) { var o = osc('sine', hz(m) * p[0], t, t + 1), gn = gainTo(); env(gn, t, 0.003, vol * p[1], 0.01, p[2]); o.connect(gn); }); },
      kick: function (t, vol) { var o = osc('sine', 120, t, t + 0.6), gn = gainTo(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.22); env(gn, t, 0.003, vol, 0.03, 0.4); o.connect(gn); },
      boom: function (t, vol) { // the trailer hit: a deep, warm thump with a soft roar on top
        var o = osc('sine', 70, t, t + 2.2), gn = gainTo(); o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(34, t + 1.2); env(gn, t, 0.005, vol, 0.08, 1.7); o.connect(gn);
        [45, 57].forEach(function (m) { var s = osc('sawtooth', hz(m), t, t + 1.8), f = filt('lowpass', 520), g2 = gainTo(); f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(160, t + 1.4); env(g2, t, 0.02, vol * 0.22, 0.1, 1.4); s.connect(f); f.connect(g2); });
        var n = noiseSrc(t, 1.2), nf = filt('lowpass', 700), g3 = gainTo(); env(g3, t, 0.005, vol * 0.35, 0.02, 0.9); n.connect(nf); nf.connect(g3);
      },
      snare: function (t, vol) { var n = noiseSrc(t, 0.3), f = filt('bandpass', 1900, 0.8), gn = gainTo(); env(gn, t, 0.002, vol, 0.01, 0.16); n.connect(f); f.connect(gn); var o = osc('triangle', 190, t, t + 0.2), g2 = gainTo(); env(g2, t, 0.002, vol * 0.5, 0.01, 0.1); o.connect(g2); },
      hat: function (t, vol) { var n = noiseSrc(t, 0.1), f = filt('highpass', 7500), gn = gainTo(); env(gn, t, 0.001, vol, 0.005, 0.04); n.connect(f); f.connect(gn); },
      tom: function (t, f0, vol) { var o = osc('sine', f0, t, t + 0.5), gn = gainTo(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + 0.3); env(gn, t, 0.003, vol, 0.02, 0.32); o.connect(gn); },
      crash: function (t, vol) { var n = noiseSrc(t, 2.2), f = filt('highpass', 4200), gn = gainTo(); env(gn, t, 0.004, vol, 0.05, 1.8); n.connect(f); f.connect(gn); },
      swell: function (t, len, vol) { var n = noiseSrc(t, len + 0.05), f = filt('bandpass', 400, 1.2), gn = gainTo(); f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(5000, t + len); gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + len); gn.gain.linearRampToValueAtTime(0.0001, t + len + 0.04); n.connect(f); f.connect(gn); },
      rumble: function (t, len, vol) { var n = noiseSrc(t, len, brown), f = filt('lowpass', 140), gn = gainTo(); gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(vol, t + len * 0.35); gn.gain.linearRampToValueAtTime(0.0001, t + len); n.connect(f); f.connect(gn); var o = osc('sine', 46, t, t + len), g2 = gainTo(); g2.gain.setValueAtTime(0.0001, t); g2.gain.linearRampToValueAtTime(vol * 0.6, t + len * 0.4); g2.gain.linearRampToValueAtTime(0.0001, t + len); o.connect(g2); },
      cricket: function (t, vol) { for (var k = 0; k < 3; k++) { var o = osc('sine', 4300, t + k * 0.05, t + k * 0.05 + 0.04), gn = gainTo(); env(gn, t + k * 0.05, 0.004, vol, 0.01, 0.02); o.connect(gn); } },
      vox: function (t, f, len, vol, vi, f2) { // a little talking voice: a buzzy tone through two vowel filters, one per syllable
        var V = [[730, 1090], [310, 2200], [570, 900], [530, 1800], [660, 1700]][vi % 5], o = osc('sawtooth', f, t, t + len + 0.05), g = gainTo();
        o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f2 || f, t + len);
        var lfo = osc('sine', 6, t, t + len + 0.05), lg = c.createGain(); lg.gain.value = f * 0.012; lfo.connect(lg); lg.connect(o.frequency);
        var a1 = filt('bandpass', V[0], 5), a2 = filt('bandpass', V[1], 7), g1 = c.createGain(), g2 = c.createGain(); g1.gain.value = 1; g2.gain.value = 0.6;
        env(g, t, 0.015, vol, len * 0.55, len * 0.35); o.connect(a1); o.connect(a2); a1.connect(g1); a2.connect(g2); g1.connect(g); g2.connect(g);
      },
      blip: function (t, f, vol) { var o = osc('triangle', f, t, t + 0.12), gn = gainTo(); o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 1.08, t + 0.05); env(gn, t, 0.005, vol, 0.03, 0.05); o.connect(gn); },
      glide: function (t, f0, f1, len, vol, type) { var o = osc(type || 'sine', f0, t, t + len + 0.1), gn = gainTo(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + len); env(gn, t, 0.01, vol, len * 0.7, len * 0.3); o.connect(gn); },
      whoosh: function (t, len, vol) { var n = noiseSrc(t, len + 0.1), f = filt('bandpass', 400, 2), gn = gainTo(); f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2600, t + len * 0.5); f.frequency.exponentialRampToValueAtTime(400, t + len); gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(vol, t + len * 0.45); gn.gain.linearRampToValueAtTime(0.0001, t + len); n.connect(f); f.connect(gn); },
      splash: function (t, vol) { var n = noiseSrc(t, 0.7), f = filt('lowpass', 2200), gn = gainTo(); env(gn, t, 0.005, vol, 0.03, 0.5); n.connect(f); f.connect(gn); for (var k = 0; k < 5; k++) { var o = osc('sine', 700 + rnd(k + 31) * 900, t + 0.05 + k * 0.06, t + 0.2 + k * 0.06), g2 = gainTo(); o.frequency.exponentialRampToValueAtTime(1800, t + 0.12 + k * 0.06); env(g2, t + 0.05 + k * 0.06, 0.003, vol * 0.25, 0.01, 0.06); o.connect(g2); } },
      sneeze: function (t, vol) { var n = noiseSrc(t, 0.4), f = filt('bandpass', 2600, 0.9), gn = gainTo(); env(gn, t, 0.01, vol, 0.04, 0.22); n.connect(f); f.connect(gn); },
      sparkle: function (t, vol) { for (var k = 0; k < 9; k++) { var tt = t + k * 0.045 + rnd(k + 77) * 0.02, o = osc('sine', 3200 + rnd(k + 78) * 3800, tt, tt + 0.25), gn = gainTo(); env(gn, tt, 0.002, vol, 0.01, 0.2); o.connect(gn); } },
      sample: function (t, name, vol, from, len) { var b = BUF[name]; if (!b) return; var s = src(c.createBufferSource()), gn = gainTo(); s.buffer = b; s.connect(gn); gn.gain.value = vol; from = from || 0; if (len) { gn.gain.setValueAtTime(vol, t + Math.max(0, len - 1.4)); gn.gain.linearRampToValueAtTime(0.0001, t + len); s.start(t, from, len + 0.05); } else s.start(t, from); }
    };
    return I;
  }
  // Season 1's music moods (chords as MIDI notes, period in seconds per chord) and what each shot feels like
  var CH = {
    gentle: { p: 5.2, c: [[48, 55, 64, 71], [45, 52, 60, 67], [41, 48, 57, 64], [43, 50, 59, 62]], arp: 0.25 },
    happy: { p: 3.6, c: [[48, 55, 64, 67], [43, 50, 59, 67], [45, 52, 60, 64], [41, 48, 57, 65]], arp: 1 },
    tense: { p: 4.4, c: [[45, 52, 60, 64], [46, 53, 62, 65], [43, 50, 58, 62], [45, 52, 61, 64]], arp: 0, pulse: true },
    brave: { p: 3.8, c: [[50, 57, 62, 66], [45, 52, 61, 64], [47, 54, 62, 66], [43, 50, 59, 62]], arp: 0.8, pulse: true },
    triumph: { p: 3.2, c: [[48, 55, 64, 67], [41, 48, 60, 65], [43, 50, 59, 67], [48, 55, 64, 72]], arp: 1 }
  };
  var SHOT_MOOD = { cold: 'gentle', balloon: 'brave', lighthouse: 'gentle', mountain: 'brave', library: 'happy', market: 'happy', underwater: 'gentle', rooftop: 'brave', friend: 'gentle', sneeze: 'happy', puddle: 'happy', boulder: 'tense', jaws: 'tense', matrix: 'tense', snakes: 'tense', vault: 'tense', bridge: 'brave', laundry: 'happy', flash1: 'triumph', flash2: 'triumph', flash3: 'triumph', hill: 'happy', riser: 'triumph', reveal: 'triumph', post: 'gentle' };
  var SHOT_AMB = { cold: [['crickets', 0.5]], balloon: [['wind', 0.55]], lighthouse: [['waves', 0.6], ['wind', 0.25]], mountain: [['wind', 0.6]], library: [['cafe', 0.2]], market: [['carnival', 0.4], ['city', 0.2]], underwater: [['underwater', 0.6]], rooftop: [['city', 0.35], ['wind', 0.25]], friend: [['birds', 0.4]], sneeze: [['birds', 0.35]], puddle: [['rain', 0.5]], boulder: [['wind', 0.35], ['birds', 0.2]], jaws: [['waves', 0.55], ['crickets', 0.25]], bridge: [['stream', 0.5], ['birds', 0.3]], laundry: [['birds', 0.5]], hill: [['birds', 0.4]], post: [['crickets', 0.4]] };
  // every line that appears on screen, and when: found by playing the picture quietly on a tiny canvas, so the sound can never drift from it
  var SCAN = {};
  function scanLines(calm) {
    var key = calm ? 'c' : 'n'; if (SCAN[key]) return SCAN[key];
    var cv = document.createElement('canvas'); cv.width = 128; cv.height = 72; var g = cv.getContext('2d'); if (!g) return [];
    var out = [], act = {}, keep = { says: FR.says, narr: FR.narr, line: FR.line, secrets: FR.secrets, quiet: FR.quiet };
    for (var T = 0; T <= DUR; T += 0.125) {
      try { render(g, 128, 72, T, !!calm, 1); } catch (e) {}
      var now = {};
      FR.says.forEach(function (x) { now[x.who + '|' + x.text] = { who: x.who, text: x.text }; });
      FR.narr.forEach(function (x) { now['narr|' + x.text] = { who: 'narr', text: x.text }; });
      Object.keys(now).forEach(function (k) { if (!act[k]) act[k] = { T: T, who: now[k].who, text: now[k].text }; });
      Object.keys(act).forEach(function (k) { if (!now[k]) { act[k].dur = T - act[k].T; out.push(act[k]); delete act[k]; } });
    }
    Object.keys(act).forEach(function (k) { act[k].dur = DUR - act[k].T; out.push(act[k]); });
    FR.says = keep.says; FR.narr = keep.narr; FR.line = keep.line; FR.secrets = keep.secrets; FR.quiet = keep.quiet;
    out.sort(function (x, y) { return x.T - y.T; }); SCAN[key] = out; return out;
  }
  // the score: [time, instrument, ...args]; `calm` softens the big hits
  function score(calm) {
    var E = [], H = calm ? 0.55 : 1;
    function ev() { E.push(Array.prototype.slice.call(arguments)); }
    function talk() {}   // the little synthetic voice blips are gone: every line now gets a real recorded pup sound instead
    function hit(t, big) { if (big) ev(t, 'boom', 0.3 * H); }
    // cold open: crickets, a soft chord, then everything goes quiet... and a rumble
    ev(0, 'pad', [57, 64, 67, 71], 7.6, 0.03);
    [0.3, 0.9, 1.6, 2.2, 2.9, 3.3].forEach(function (t) { ev(t, 'cricket', 0.018); });
    ev(0.8, 'bell', 76, 0.05); ev(2.3, 'bell', 79, 0.04);
    ev(3.7, 'rumble', 3.2, 0.35);
    ev(3.9, 'glide', 600, 1200, 0.12, 0.05, 'sine');
    [[4.4, 81], [4.9, 88], [5.4, 87], [6.2, 83]].forEach(function (n) { ev(n[0], 'bell', n[1], 0.07); });
    ev(4.95, 'sample', 'tidbit-hmm', 0.55); talk(5.2, 6, 620);
    ev(6.65, 'sample', 'sugarfoot-ooh', 0.55); talk(6.9, 7, 470);
    ev(7.0, 'swell', 1.0, 0.12 * H);
    // the build: A minor, F, C, G, with a pulse that grows
    var prog = [[45, [57, 60, 64]], [41, [53, 57, 60]], [36, [55, 60, 64]], [43, [55, 59, 62]]];
    function bars() {}
    hit(8.0, true); ev(8.0, 'piano', 45, 0.12); ev(8.0, 'piano', 57, 0.1);
    bars(8.0, 4, { bass: 0.05, kick: false });
    [10, 12, 14].forEach(function (t) { hit(t, false); ev(t, 'tom', 110, 0.2 * H); });
    ev(10.2, 'sample', 'tidbit-ooh', 0.4); ev(12.6, 'sample', 'tidbit-hmm', 0.3);
    ev(15.4, 'swell', 0.6, 0.1 * H);
    hit(16.0, true);
    bars(16.0, 5, { bass: 0.06, hats: true, arp: true, kick: true, snare: true });
    [17.5, 19.5, 21.5, 23.5].forEach(function (t) { hit(t, false); });
    talk(18.3, 5, 480); talk(19.9, 6, 640); talk(22.0, 5, 640); talk(24.05, 5, 480);
    ev(24.9, 'swell', 0.6, 0.12 * H);
    hit(25.5, true);
    // the new friend: hushed, curious, plucky
    ev(27.0, 'pad', [57, 64, 71], 4, 0.02);
    for (var p = 0; p < 8; p++) ev(27.0 + p * 0.5, 'pluck', [57, 60, 64, 60, 57, 62, 65, 62][p], 0.06);
    talk(27.6, 5, 640, 0.03); ev(28.6, 'bell', 81, 0.06); ev(28.9, 'bell', 88, 0.06); ev(29.2, 'bell', 87, 0.06);
    ev(29.4, 'glide', 900, 1500, 0.15, 0.04); talk(29.4, 6, 470, 0.03); ev(30.4, 'swell', 0.6, 0.12 * H);
    hit(31.0, true); bars(31.0, 1, { bass: 0.06, hats: true, kick: true, snare: true });
    [32.0, 32.125, 32.25, 32.375].forEach(function (t, i) { ev(t, 'tom', 120 + i * 30, 0.2 * H); });
    // the sneeze
    [0, 0.25, 0.5, 0.75].forEach(function (d, i) { ev(32.5 + d, 'marimba', [72, 76, 79, 76][i], 0.08); });
    ev(32.85, 'blip', 520, 0.04); ev(33.4, 'blip', 600, 0.045); ev(33.65, 'blip', 680, 0.045);
    ev(33.9, 'sneeze', 0.32); ev(33.92, 'whoosh', 0.7, 0.18); ev(34.0, 'glide', 300, 900, 0.35, 0.08, 'triangle'); ev(34.35, 'glide', 900, 260, 0.3, 0.06, 'triangle');
    talk(34.7, 5, 480);
    // the puddle
    for (var r = 0; r < 7; r++) ev(35.5 + r * 0.12, 'marimba', 67 + [0, 2, 4, 5, 7, 9, 11][r], 0.07);
    ev(36.35, 'glide', 1300, 380, 0.45, 0.06, 'sine'); ev(36.45, 'splash', 0.3);
    ev(36.8, 'sample', 'sugarfoot-laugh-2', 0.5); talk(37.6, 7, 640);
    // the flurry
    ev(38.2, 'swell', 0.5, 0.1 * H);
    [38.7, 39.2, 39.7].forEach(function (t, i) { hit(t, i === 0); ev(t, 'tom', 100 + i * 40, 0.25 * H); ev(t, 'bass', 45, 0.4, 0.07); });
    // same big hearts: warm piano
    ev(40.2, 'piano', 48, 0.12); ev(40.2, 'piano', 64, 0.08); ev(40.2, 'bell', 84, 0.05); ev(40.2, 'kick', 0.25 * H);
    var warm = [[48, [60, 64, 67, 71]], [43, [59, 62, 67, 74]], [45, [57, 60, 64, 69]], [41, [57, 60, 65, 69]]];
    for (var w = 0; w < 4; w++) {
      var t0 = 41.7 + w * 1.5, ch = warm[w];
      ev(t0, 'pad', ch[1], 1.5, 0.024); ev(t0, 'bass', ch[0], 1.2, 0.07);
      for (var a = 0; a < 6; a++) ev(t0 + a * 0.25, 'piano', ch[1][[0, 1, 2, 3, 2, 1][a]] + 12, 0.045);
    }
    talk(42.3, 8, 480, 0.03); ev(43.0, 'bell', 84, 0.05); ev(44.0, 'sample', 'sugarfoot-aww', 0.4); talk(44.6, 7, 640, 0.03);
    ev(47.7, 'swell', 1.0, 0.16 * H); ev(47.7, 'glide', 180, 720, 1.0, 0.05, 'sawtooth');
    for (var s = 0; s < 12; s++) ev(47.7 + 1 - 1 / (1 + s * 0.35) * 1.0 + 0, 'snare', 0.03 + s * 0.006);
    // the reveal: a big hit, then the theme song itself
    hit(48.7, true); ev(48.7, 'kick', 0.5 * H);
    ev(48.44, 'sample', 'theme', 0.85, 30.3, 6.8);
    ev(49.7, 'kick', 0.45 * H); ev(49.7, 'crash', 0.06 * H); ev(49.72, 'sparkle', 0.03);
    ev(50.4, 'sample', 'tidbit-arfarf', 0.45); ev(50.9, 'sample', 'sugarfoot-arfarf', 0.45);
    // after the credits
    [56.0, 56.7, 57.6, 58.4, 59.0].forEach(function (t) { ev(t, 'cricket', 0.016); });
    ev(55.9, 'pad', [57, 64, 67], 3.5, 0.018);
    talk(56.35, 14, 470, 0.03);
    [59.1, 59.3, 59.5, 59.65].forEach(function (t) { ev(t, 'whoosh', 0.15, 0.06); });
    ev(59.8, 'glide', 400, 1100, 0.12, 0.08, 'sine'); ev(59.85, 'sample', 'tidbit-yip', 0.5);
    [[59.95, 79], [60.1, 84], [60.25, 88]].forEach(function (n) { ev(n[0], 'bell', n[1], 0.07); });
    talk(60.2, 7, 660, 0.035);
    ev(62.2, 'sample', 'sugarfoot-laugh-1', 0.45);
    ev(63.0, 'bell', 84, 0.04);
    // the funny middle (G0 .. G0 + GL): everything from the flurry on moves later, and the new bits get their own music
    E.forEach(function (e) { if (e[0] >= 38.19) e[0] += GL; });
    var starts = [], tt = G0 + GCARD; GAGS.forEach(function (x) { starts.push(tt); tt += x[1]; });
    hit(G0, true); ev(G0, 'sparkle', 0.03); ev(G0 + 0.1, 'whoosh', 0.7, 0.1);
    var tEnd = G0 + GL;
    // 1. boulder: sneaky plucks, a rumble, drums, then a slide-whistle sigh
    var marks = [E.length], T = starts[0];
    ev(T + 2.3, 'bell', 88, 0.07); ev(T + 3.0, 'rumble', 3.0, 0.4);
    for (var k1 = 0; k1 < 8; k1++) ev(T + 3.2 + k1 * 0.28, 'tom', 90 + (k1 % 2) * 25, 0.22 * H);
    ev(T + 3.4, 'boom', 0.4 * H); ev(T + 5.3, 'glide', 700, 150, 0.7, 0.08, 'sine'); ev(T + 5.5, 'sample', 'sugarfoot-laugh-1', 0.4);
    talk(T + 2.1, 6, 640); talk(T + 3.5, 4, 470); talk(T + 5.5, 6, 640); talk(T + 6.2, 5, 470);
    // 2. pond: two dramatic notes, faster and faster
    marks.push(E.length); T = starts[1];
    for (var k2 = 0, t2 = T + 0.9; k2 < 5 && t2 < T + 2.9; k2++) { ev(t2, 'bass', 40, 0.5, 0.15); ev(t2 + 0.26, 'bass', 41, 0.5, 0.15); t2 += k2 < 2 ? 0.9 : 0.6; }
    ev(T + 2.9, 'swell', 0.5, 0.14 * H); ev(T + 2.95, 'crash', 0.08 * H); ev(T + 3.0, 'glide', 300, 1500, 0.3, 0.07, 'triangle'); ev(T + 3.3, 'sample', 'sugarfoot-laugh-2', 0.45); ev(T + 3.9, 'splash', 0.35);
    talk(T + 0.3, 6, 640); talk(T + 2.0, 3, 640); talk(T + 3.0, 4, 470); talk(T + 4.4, 7, 640);
    // 3. slow motion: a long low sweep, a splat, and a sad trombone
    marks.push(E.length); T = starts[2];
    ev(T + 1.0, 'bass', 33, 2.6, 0.12); ev(T + 1.0, 'glide', 260, 80, 2.4, 0.05, 'sawtooth'); ev(T + 3.5, 'tom', 80, 0.3 * H); ev(T + 3.6, 'splash', 0.3); ev(T + 3.6, 'crash', 0.05 * H);
    ev(T + 4.2, 'glide', 400, 340, 0.4, 0.06, 'sawtooth'); ev(T + 4.65, 'glide', 340, 290, 0.4, 0.06, 'sawtooth'); ev(T + 5.1, 'glide', 290, 210, 0.9, 0.06, 'sawtooth');
    talk(T + 0.3, 6, 640); talk(T + 2.0, 5, 640); talk(T + 4.0, 7, 470); talk(T + 5.5, 4, 470);
    // 4. snakes on a plane: a calm cabin, hissing, a drumroll... and a stop-short when the word nearly comes out
    marks.push(E.length); T = starts[3];
    ev(T + 0.1, 'pad', [57, 60, 64], 1.2, 0.03); ev(T + 1.0, 'whoosh', 0.5, 0.1); ev(T + 1.05, 'bell', 91, 0.05); ev(T + 1.2, 'swell', 1.2, 0.1 * H); ev(T + 1.4, 'rumble', 2.4, 0.3);
    for (var ks = 0; ks < 9; ks++) ev(T + 2.5 + ks * (0.2 - ks * 0.008), 'tom', 96 - ks * 3, (0.16 + ks * 0.015) * H);
    ev(T + 2.6, 'bass', 33, 1.4, 0.1); ev(T + 4.0, 'crash', 0.09 * H); ev(T + 4.0, 'boom', 0.4 * H); ev(T + 4.05, 'blip', 880, 0.05);
    ev(T + 4.6, 'sample', 'tidbit-hmm', 0.5); ev(T + 5.1, 'glide', 500, 330, 0.5, 0.06, 'sawtooth'); ev(T + 5.7, 'sample', 'sugarfoot-laugh-2', 0.4); ev(T + 6.2, 'bell', 84, 0.05);
    talk(T + 0.2, 6, 470); talk(T + 1.6, 4, 640); talk(T + 2.6, 9, 640); talk(T + 4.1, 7, 470); talk(T + 4.3, 4, 330, 0.03); talk(T + 5.5, 4, 640); talk(T + 6.2, 4, 470);
    // 5. vault: a tense five-beat riff, a cookie "ting", an alarm
    marks.push(E.length); T = starts[4];
    for (var k3 = 0; k3 < 6; k3++) { [0, 0.4, 0.8, 1.0, 1.4].forEach(function (o) { ev(T + 0.6 + k3 * 1.6 + o, 'bass', k3 % 2 ? 38 : 36, 0.2, 0.09); }); if (T + 0.6 + k3 * 1.6 < T + 4.2) ev(T + 0.6 + k3 * 1.6 + 0.2, 'hat', 0.03); }
    ev(T + 3.0, 'bell', 96, 0.07); ev(T + 4.0, 'glide', 900, 200, 0.5, 0.08, 'sine'); ev(T + 4.45, 'kick', 0.3 * H);
    for (var k4 = 0; k4 < 6; k4++) ev(T + 4.3 + k4 * 0.3, 'glide', k4 % 2 ? 660 : 880, k4 % 2 ? 660 : 880, 0.26, 0.03, 'sawtooth');
    talk(T + 0.9, 5, 640); talk(T + 1.5, 6, 330, 0.03); talk(T + 3.0, 3, 640); talk(T + 4.0, 3, 330); talk(T + 5.0, 7, 640);
    // 6. bridge: a big, serious chord, a tiny ladybug, and a splash
    marks.push(E.length); T = starts[5];
    ev(T + 0.8, 'pad', [45, 57, 64], 3.2, 0.045); ev(T + 0.9, 'swell', 1.0, 0.12 * H); ev(T + 1.0, 'tom', 80, 0.3 * H); ev(T + 1.0, 'boom', 0.4 * H); ev(T + 1.4, 'bell', 76, 0.05);
    ev(T + 3.65, 'crash', 0.08 * H); ev(T + 4.0, 'glide', 700, 200, 0.5, 0.07, 'sine'); ev(T + 4.4, 'splash', 0.4); ev(T + 5.3, 'sample', 'tidbit-ooh', 0.4);
    talk(T + 1.0, 8, 330); talk(T + 3.05, 3, 470); talk(T + 5.3, 6, 640);
    // 7. the leap: a hero fanfare and a very soft landing
    marks.push(E.length); T = starts[6];
    [72, 76, 79, 84].forEach(function (m, i) { ev(T + 1.7 + i * 0.09, 'bell', m, 0.06); }); ev(T + 1.75, 'whoosh', 0.8, 0.14); ev(T + 2.5, 'boom', 0.35 * H); ev(T + 2.5, 'crash', 0.06 * H);
    for (var k6 = 0; k6 < 6; k6++) ev(T + 2.6 + k6 * 0.1, 'marimba', 84 - k6 * 2, 0.06); ev(T + 3.2, 'sample', 'sugarfoot-aww', 0.4);
    talk(T + 0.3, 6, 640); talk(T + 1.7, 7, 640); talk(T + 3.1, 5, 470); talk(T + 4.4, 8, 640);
    marks.push(E.length);
    GAGS.forEach(function (gg, n) { var k = gg[3]; if (k === 1) return; for (var q = marks[n]; q < marks[n + 1]; q++) E[q][0] = starts[n] + (E[q][0] - starts[n]) * k; });
    // the very end: one more bark
    ev(55.9 + GL + 7.8, 'sample', 'tidbit-arfarf', 0.45); talk(55.9 + GL + 7.9, 8, 660, 0.035); ev(55.9 + GL + 9.1, 'sample', 'tidbit-yip', 0.4);
    // ---- Season 1's sound, made to fit this picture exactly
    // the old per-line sounds and synthetic pads give way to: a mood for each shot (Season 1's own chords), the real place sounds under
    // it, and a recorded pup sound the moment each line appears. The lines and their times are read straight from the picture.
    E = E.filter(function (e) { return e[1] !== 'pad' && e[1] !== 'cricket' && e[1] !== 'blip' && !(e[1] === 'sample' && e[2] !== 'theme'); });
    var segs = [], last = null;
    EDIT.forEach(function (sh) {
      var m = sh[2] === 'card' ? (last ? last.m : 'gentle') : (SHOT_MOOD[sh[2]] || (last ? last.m : 'gentle'));
      if (last && last.m === m) last.te = sh[1]; else { last = { m: m, ts: sh[0], te: sh[1] }; segs.push(last); }
    });
    segs.forEach(function (sg) {
      var C = CH[sg.m]; if (!C) return;
      for (var t = sg.ts, st = 0; t < sg.te - 0.4; t += C.p, st++) {
        var chord = C.c[st % C.c.length], len = Math.min(C.p, sg.te - t + 0.8);
        chord.forEach(function (n, i) { ev(t, 'mpad', n, len, i === 0 ? 0.03 : 0.022); });
        if (C.arp) for (var k = 0; k < 8; k++) if (rnd(st * 9 + k + t) < C.arp) ev(t + k * C.p / 8, 'mpluck', chord[(k * 3 + st) % chord.length] + 12, 0.018);
        if (C.pulse) for (var q = 0; q < 4; q++) ev(t + q * C.p / 4, 'mpluck', chord[0] - 12, 0.03);
      }
    });
    EDIT.forEach(function (sh) {
      var L = SHOT_AMB[sh[2]]; if (!L) return;
      L.forEach(function (a) { ev(Math.max(0, sh[0] - 0.3), 'amb', a[0], sh[1] - sh[0] + 0.9, a[1] * 0.8); });
    });
    var cnt = { tidbit: 0, sugarfoot: 0 };
    scanLines(calm).forEach(function (ln) {
      if (ln.who === 'narr') return;
      var w = ln.who === 'sugarfoot' ? 'sugarfoot' : 'tidbit', i = cnt[w]++, tx = ln.text.toLowerCase(), pick;
      if (/ha ha|hee|funny|joke|laugh/.test(tx)) pick = 'laugh-' + (1 + i % 2);
      else if (/\?/.test(tx)) pick = ['hmm', 'ooh', 'hmm', 'arf'][i % 4];
      else if (/…|\.\.\.|—/.test(tx) && !/!/.test(tx)) pick = ['aww', 'mmm', 'sigh', 'hmm'][i % 4];
      else if (/!/.test(tx)) pick = ['arf', 'yip', 'arfarf', 'woof', 'ruff'][i % 5];
      else pick = ['arf', 'ruff', 'mmm'][i % 3];
      ev(ln.T + 0.04, 'sample', w + '-' + pick, 0.62);
    });
    // every line is spoken by a little talking voice, timed to the words on screen (Tidbit bright and quick, Sugarfoot softer and lower, the narrator deep and slow).
    // The words that matter (SHOUTED ones, the last word of a shout or a question, and the key word of a trailing "…") get a higher, louder, longer syllable and a tiny beat of space before them.
    scanLines(calm).forEach(function (ln) {
      var ws = ln.text.match(/[A-Za-z0-9’']+[!?…]*/g) || []; if (!ws.length) return;
      var V = ln.who === 'narr' ? { f: 128, v: 0.05 } : ln.who === 'sugarfoot' ? { f: 392, v: 0.05 } : { f: 560, v: 0.05 };
      var q = /\?/.test(ln.text), ex = /!/.test(ln.text), syl = [], tot = 0;
      ws.forEach(function (w, wi) {
        var core = w.replace(/[^A-Za-z0-9’']/g, ''), loud = core.length > 1 && core === core.toUpperCase() && /[A-Z]/.test(core);
        var last = wi === ws.length - 1, strong = loud || (last && /[!?]/.test(w)) || (last && ws.length > 1 && !/…/.test(w)) || (wi === ws.length - 2 && /…$/.test(w) === false && /…/.test(ws[ws.length - 1]) && ws.length > 2);
        var n = Math.max(1, Math.round(core.length / 3.2)); syl.push({ n: n, strong: strong, loud: loud, last: last, w: strong ? 1.5 : 1 }); tot += n * (strong ? 1.5 : 1);
      });
      var span = Math.max(0.5, ln.dur * 0.86), step = span / tot, t = ln.T + 0.06, k = 0;
      syl.forEach(function (w, wi) {
        if (w.strong && wi > 0) t += step * 0.35;   // a hair of space before the important word
        for (var s2 = 0; s2 < w.n; s2++, k++) {
          var u = tot ? (t - ln.T) / span : 0, f = V.f * (1 + 0.14 * (rnd(k * 5.3 + ln.T) - 0.5) + (q ? 0.3 * Math.max(0, u - 0.5) : 0) - (ex ? 0 : 0.05 * u)), len = Math.min(0.26, step * (w.strong ? 1.4 : 0.85)), vol = V.v * (ln.who === 'narr' ? 1.1 : 1) * (0.8 + 0.3 * rnd(k * 2.1 + ln.T));
          if (w.strong) { f *= w.loud ? 1.28 : 1.16; vol *= w.loud ? 1.9 : 1.5; }
          ev(t, 'vox', f, len, vol, Math.floor(rnd(k * 1.7 + ln.T * 3) * 5), f * (q && w.last && s2 === w.n - 1 ? 1.3 : w.strong ? 1.04 : 0.94));
          t += step * (w.strong ? 1.5 : 1) / 1;
        }
      });
    });
    E.sort(function (a, b) { return a[0] - b[0]; });
    return E;
  }
  function fire(I, e, when) { try { var fn = I[e[1]]; if (fn) fn.apply(null, [when].concat(e.slice(2))); } catch (er) {} }
  function makeChain(c, dest) {
    var bus = c.createGain(); bus.gain.value = 1;
    var comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 14; comp.ratio.value = 3.5; comp.attack.value = 0.005; comp.release.value = 0.3;
    var verb = c.createConvolver(), len = Math.floor(c.sampleRate * 2.4), ir = c.createBuffer(2, len, c.sampleRate);
    for (var ch = 0; ch < 2; ch++) { var dd = ir.getChannelData(ch); for (var i = 0; i < len; i++) dd[i] = (rnd(i * 0.13 + ch * 7) * 2 - 1) * Math.pow(1 - i / len, 3); }
    verb.buffer = ir; var wet = c.createGain(); wet.gain.value = 0.22;
    bus.connect(comp); bus.connect(verb); verb.connect(wet); wet.connect(comp); comp.connect(dest);
    return bus;
  }

  // ---------------------------------------------------------------- memory: found secrets and a favorite place, on this device only
  function load() { try { var o = JSON.parse(localStorage.getItem(KEY) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* private mode: fine */ } }
  var MEM = load(); if (!Array.isArray(MEM.found)) MEM.found = [];
  MEM.found = MEM.found.filter(function (id) { return SECRETS.some(function (s) { return s.id === id; }); });

  // ---------------------------------------------------------------- the player
  var REDUCED_MQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function calmNow() { if (window.__teaserCalm != null) return !!window.__teaserCalm; try { if (window.TOLStill && window.TOLStill.chosen) return !!window.TOLStill.chosen(); } catch (e) {} return !!(REDUCED_MQ && REDUCED_MQ.matches); }
  var unlocked = false;
  function unlockMediaAudio() { // iPhones: ask for media playback so the silent switch doesn't mute the music
    if (unlocked) return; unlocked = true;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try {
      var n = 800, buf = new Uint8Array(44 + n), dv = new DataView(buf.buffer), w = function (o, str) { for (var i = 0; i < str.length; i++) buf[o + i] = str.charCodeAt(i); };
      w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
      dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); w(36, 'data'); dv.setUint32(40, n, true);
      for (var i = 44; i < 44 + n; i++) buf[i] = 128;
      var el = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))); el.setAttribute('playsinline', ''); var pr = el.play(); if (pr && pr.catch) pr.catch(function () { unlocked = false; });
    } catch (e) {}
  }
  function fmt(t) { t = Math.max(0, Math.floor(t)); return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); }

  function mount(host) {
    host.innerHTML =
      '<div class="tz-player">' +
      '<div class="tz-stage"><canvas class="tz-cv" role="img" aria-label="The Frequency Buddies Season 2 teaser. Tap the hidden secrets as it plays."></canvas>' +
      '<div class="tz-fx" aria-hidden="true"></div>' +
      '<div class="tz-tap"><button type="button" class="tz-tb tz-tap-play" aria-label="Play">▶</button><button type="button" class="tz-tb tz-tap-re" aria-label="Replay from the start">↺</button><button type="button" class="tz-tb tz-tap-full" aria-label="Full screen">⛶</button></div>' +
      '<div class="tz-ov tz-start"><div class="tz-ovc"><p class="tz-k">Season 2 · the teaser</p><button type="button" class="tz-big">▶ Play the teaser</button><p>About two minutes. <b>Five secrets</b> are hidden in it: tap them when you spot them!</p></div></div>' +
      '<div class="tz-ov tz-end" hidden><div class="tz-ovc"><p class="tz-k">Season 2 is coming soon</p><h3 class="tz-end-h">You found 0 of 5 secrets</h3><p class="tz-end-p">Watch it again to find them all.</p><div class="tz-row"><button type="button" class="tz-b is-main tz-again">↺ Watch again</button><a class="tz-b" href="#pick">Pick your favorite new place</a></div></div></div>' +
      '</div>' +
      '<div class="tz-prog"><div class="tz-track" role="slider" tabindex="0" aria-label="Teaser time" aria-valuemin="0" aria-valuemax="' + Math.round(DUR) + '" aria-valuenow="0"><div class="tz-fill"></div></div><span class="tz-time">0:00 / ' + fmt(DUR) + '</span></div>' +
      '<div class="tz-ctrl"><button type="button" class="tz-b is-main tz-play">▶ Play</button><button type="button" class="tz-b tz-re">↺ Replay</button><span class="tz-sp"></span><button type="button" class="tz-b tz-full">⛶ <span class="tz-lbl">Full screen</span></button></div>' +
      '<div class="tz-found" aria-live="polite"><span class="tz-found-t">🔍 Secrets found: <b>0</b> of 5</span><span class="tz-dots" aria-hidden="true"></span></div>' +
      '<p class="tz-sr" aria-live="polite"></p>' +
      '</div>';
    var $ = function (s) { return host.querySelector(s); };
    var player = $('.tz-player'), stage = $('.tz-stage'), cv = $('.tz-cv'), g = cv.getContext('2d'), fxEl = $('.tz-fx');
    var startOv = $('.tz-start'), endOv = $('.tz-end'), playBtn = $('.tz-play'), track = $('.tz-track'), fill = $('.tz-fill'), timeEl = $('.tz-time'), srEl = $('.tz-sr');
    var P = { T: 0, playing: false, started: false, sound: true, voices: true, calm: calmNow(), at: 0, raf: 0, recent: [], fx: [], ended: false };
    var A = { ctx: null, master: null, bus: null, live: [], E: null, idx: 0, map: 0, timer: 0 };
    var W = 0, H = 0, dpr = 1, bs = 1;
    function resize() {
      var r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
      var w = Math.max(200, Math.round(r.width * dpr)), h = Math.max(112, Math.round(r.height * dpr));
      if (w !== W || h !== H) { W = cv.width = w; H = cv.height = h; }
      bs = clamp(560 / Math.max(1, Math.min(r.width, r.height * 16 / 9)), 1, 1.45);
      paint();
    }
    // after the end, the title stays up behind the end card
    function paint() { if (!W) return; render(g, W, H, P.ended ? 53.2 + GL : P.T, P.calm, bs); drawFx(); if (P.playing) speakNow(); if (FR.line && FR.line !== lastLive) { lastLive = FR.line; srEl.textContent = FR.line; } }
    // the found-a-secret ring, drawn over the picture for a moment
    function drawFx() {
      var now = performance.now(); P.fx = P.fx.filter(function (f) { return now - f.t0 < 1100; });
      P.fx.forEach(function (f) {
        var q = (now - f.t0) / 1100; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1 - q;
        g.strokeStyle = '#FFE08A'; g.lineWidth = 3 * dpr; g.beginPath(); g.arc(f.x, f.y, (14 + 40 * eout(q)) * dpr, 0, TAU); g.stroke();
        for (var i = 0; i < 8; i++) { var a = i / 8 * TAU, d = (10 + 46 * eout(q)) * dpr; star(g, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, 4 * dpr * (1 - q), '#FFF3B0'); }
        g.restore();
      });
    }
    // ----- read aloud: the speech bubbles and the narrator, in the browser's own voices
    // VOICES, the way Season 1 does them: a recorded voice for a line when one exists
    // (/assets/audio/buddies/s2teaser/<key>.mp3, listed in index.json, key made from who|text), otherwise the device's own speech,
    // with Season 1's voice choices (Tidbit bright and quick, Sugarfoot softer and slower, the narrator calm and low).
    var prevKeys = {}, voiceList = [], picked = null, canSay = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
    var FEM = /samantha|ava|allison|susan|zira|aria|jenny|michelle|karen|moira|tessa|fiona|serena|victoria|emma|joanna|salli|kendra|kimberly|ivy|libby|sonia|natasha|female|google us english/i;
    var MALE = /daniel|alex|guy|david|mark|tom|arthur|oliver|ryan|brian|matthew|justin|george|male|james|aaron|fred/i;
    function vscore(v, fem) { var sc = 0, n = v.name || ''; if (/en[-_]US/i.test(v.lang)) sc += 3; if (/natural|neural|enhanced|premium|online/i.test(n)) sc += 3; if (/google/i.test(n)) sc += 1; if (fem ? FEM.test(n) : MALE.test(n)) sc += 4; if (v.localService === false) sc += 0.5; return sc; }
    function vpick() {
      if (!voiceList.length) return null;
      var fem = voiceList.slice().sort(function (x, y) { return vscore(y, true) - vscore(x, true); }), male = voiceList.slice().sort(function (x, y) { return vscore(y, false) - vscore(x, false); });
      var tid = fem[0], sug = fem.filter(function (v) { return v.name !== tid.name && FEM.test(v.name); })[0] || tid, nar = male.filter(function (v) { return MALE.test(v.name); })[0] || fem.filter(function (v) { return v !== tid && v !== sug; })[0] || tid;
      return { tidbit: tid, sugarfoot: sug, narr: nar };
    }
    function loadVoices() { try { voiceList = (speechSynthesis.getVoices() || []).filter(function (v) { return /^en([-_]|$)/i.test(v.lang || ''); }); } catch (e) { voiceList = []; } picked = vpick(); }
    if (canSay) { loadVoices(); try { speechSynthesis.addEventListener('voiceschanged', loadVoices); } catch (e) {} }
    var VOICE = { tidbit: { pitch: 1.6, rate: 1.08 }, sugarfoot: { pitch: 1.35, rate: 0.95 }, narr: { pitch: 1.0, rate: 0.95 } };
    function ckey(who, text) { var h = 0x811c9dc5, t = who + '|' + text; for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }
    var CLIP = { map: null, started: false, bufs: {} };
    function clipsInit() { if (CLIP.started) return; CLIP.started = true; fetch('/assets/audio/buddies/s2teaser/index.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (m) { CLIP.map = m || {}; }).catch(function () { CLIP.map = {}; }); }
    function lineDur(who, text) { var L = scanLines(P.calm), k = who + '|' + text; for (var i = 0; i < L.length; i++) if (L[i].who === who && L[i].text === text) return L[i].dur; return 1.5; }
    // the music steps back a little while someone is talking, so every word can be heard
    function duck(on) { try { if (A.master && A.ctx) A.master.gain.setTargetAtTime(on ? 0.5 : 0.9, A.ctx.currentTime, 0.05); } catch (e) {} }
    function playClip(key) {
      var c = A.ctx; if (!c) return false;
      var go = function (buf) { if (!buf || !P.playing) return; var s2 = c.createBufferSource(), gn = c.createGain(); s2.buffer = buf; gn.gain.value = 1; s2.connect(gn); gn.connect(c.destination); duck(true); s2.onended = function () { duck(false); }; s2.start(); A.live.push(s2); };
      if (CLIP.bufs[key]) { CLIP.bufs[key].then(go); return true; }
      CLIP.bufs[key] = fetch('/assets/audio/buddies/s2teaser/' + key + '.mp3').then(function (r) { return r.ok ? r.arrayBuffer() : null; }).then(function (ab) { return ab ? new Promise(function (ok) { try { c.decodeAudioData(ab, ok, function () { ok(null); }); } catch (e) { ok(null); } }) : null; }).catch(function () { return null; });
      CLIP.bufs[key].then(go); return true;
    }
    function speakNow() {
      var items = FR.narr.map(function (n) { return { who: 'narr', text: n.text }; }).concat(FR.says.map(function (x) { return { who: x.who === 'sugarfoot' ? 'sugarfoot' : 'tidbit', text: x.text }; })), cur = {}, fresh = [];
      items.forEach(function (it) { var k = it.who + '|' + it.text; cur[k] = 1; if (!prevKeys[k]) fresh.push(it); });
      prevKeys = cur; if (!fresh.length) return;
      clipsInit();
      var spokeWithSpeech = false;
      fresh.forEach(function (it) {
        var key = ckey(it.who, it.text);
        if (CLIP.map && CLIP.map[key]) { playClip(key); return; }   // a recorded voice
        if (!canSay) return;
        try {
          if (!spokeWithSpeech) { try { speechSynthesis.cancel(); } catch (e) {} spokeWithSpeech = true; }   // never let the voice fall behind the picture
          var V = VOICE[it.who] || VOICE.tidbit, u = new SpeechSynthesisUtterance(it.text.replace(/…/g, '...').replace(/—/g, '...')), v = picked && picked[it.who];
          if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
          var words = (it.text.match(/[A-Za-z’']+/g) || []).length, need = 0.35 + 0.34 * words, win = lineDur(it.who, it.text);
          u.pitch = V.pitch; u.rate = Math.max(0.9, Math.min(1.5, V.rate * Math.max(1, need / Math.max(0.6, win)))); u.volume = 1;
          u.onstart = function () { duck(true); }; u.onend = u.onerror = function () { duck(false); };
          speechSynthesis.speak(u);
        } catch (e) {}
      });
    }
    function silence() { prevKeys = {}; duck(false); try { if (canSay) speechSynthesis.cancel(); } catch (e) {} }
    // ----- sound
    function ensureAudio() {
      unlockMediaAudio();
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      if (!A.ctx) { try { A.ctx = new AC(); } catch (e) { return null; } A.master = A.ctx.createGain(); A.master.gain.value = P.sound ? 0.9 : 0; A.master.connect(A.ctx.destination); loadSamples(A.ctx); }
      if (A.ctx.state === 'suspended') { try { var pr = A.ctx.resume(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} }
      return A.ctx;
    }
    function audioStop() {
      clearInterval(A.timer); A.timer = 0;
      if (A.bus) { var b = A.bus; try { b.gain.setTargetAtTime(0, A.ctx.currentTime, 0.03); } catch (e) {} setTimeout(function () { try { b.disconnect(); } catch (e) {} }, 300); }
      A.live.forEach(function (n) { try { n.stop(A.ctx.currentTime + 0.25); } catch (e) {} }); A.live = []; A.bus = null;
    }
    function audioStart(fromT) {
      audioStop(); var c = A.ctx; if (!c) return;
      var out = c.createGain(); out.gain.value = 1; out.connect(A.master); A.bus = out;
      var bus = makeChain(c, out), I = kit(c, bus, function (n) { A.live.push(n); if (A.live.length > 600) A.live.splice(0, 200); });
      A.E = score(P.calm); A.idx = 0; A.map = c.currentTime + 0.06 - fromT; A.I = I;
      // the theme song started before this point? pick it up partway
      A.E.forEach(function (e) { if (e[1] === 'sample' && e[2] === 'theme' && fromT > e[0] && fromT < e[0] + e[5]) { var into = fromT - e[0]; fire(I, [0, 'sample', 'theme', e[3], e[4] + into, e[5] - into], c.currentTime + 0.06); } });
      while (A.idx < A.E.length && A.E[A.idx][0] < fromT - 0.01) A.idx++;
      function pump() { if (!A.bus || A.ctx !== c) return; var horizon = c.currentTime + 0.5; while (A.idx < A.E.length && A.E[A.idx][0] + A.map < horizon) { var e = A.E[A.idx++]; if (e[1] === 'vox' && canSay) { e = e.slice(); e[4] *= 0.6; } fire(I, e, Math.max(c.currentTime, e[0] + A.map)); } }
      pump(); A.timer = setInterval(pump, 120);
    }
    // ----- the clock
    function loop() {
      P.raf = 0; if (!P.playing) return;
      var now = performance.now(), dt = Math.min(0.1, (now - P.at) / 1000); P.at = now; P.T += dt;
      if (P.T >= DUR) { P.T = DUR; finish(); paint(); progress(); return; }
      paint(); progress(); noteRecent(); P.raf = requestAnimationFrame(loop);
    }
    function progress() { var p = P.T / DUR; fill.style.width = (p * 100).toFixed(2) + '%'; timeEl.textContent = fmt(P.T) + ' / ' + fmt(DUR); track.setAttribute('aria-valuenow', Math.round(P.T)); }
    function syncBtns() { playBtn.textContent = P.playing ? '❚❚ Pause' : '▶ Play'; var tp = $('.tz-tap-play'); tp.textContent = P.playing ? '❚❚' : '▶'; tp.setAttribute('aria-label', P.playing ? 'Pause' : 'Play'); player.classList.toggle('is-playing', P.playing); }
    function play() {
      if (P.T >= DUR - 0.05 || !P.started) P.T = 0; // the first press starts at the very beginning, not at the poster
      P.calm = calmNow(); P.started = true; P.ended = false; startOv.hidden = true; endOv.hidden = true;
      if (canSay) { try { var pr = new SpeechSynthesisUtterance(' '); pr.volume = 0; speechSynthesis.speak(pr); } catch (e) {} }   // phones only allow speech that starts from a tap
      if (ensureAudio()) audioStart(P.T);
      P.playing = true; P.at = performance.now(); syncBtns(); wake(); if (!P.raf) P.raf = requestAnimationFrame(loop); inView();
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden && P.playing && A.ctx && A.ctx.state === 'suspended') { try { A.ctx.resume(); } catch (e) {} } });
    function pause() { P.playing = false; audioStop(); silence(); if (P.raf) cancelAnimationFrame(P.raf); P.raf = 0; syncBtns(); wake(true); paint(); }
    function toggle() { if (P.playing) pause(); else play(); }
    function restart() { P.T = 0; P.recent = []; play(); }
    function seek(t) { silence(); P.T = clamp(t, 0, DUR); endOv.hidden = true; if (P.playing) { audioStart(P.T); P.at = performance.now(); } paint(); progress(); }
    function finish() {
      P.playing = false; P.ended = true; audioStop(); silence(); syncBtns(); wake(true);
      MEM.plays = (MEM.plays || 0) + 1; save(MEM);
      var n = MEM.found.length; $('.tz-end-h').textContent = n >= 5 ? 'You found all 5 secrets! 🌟' : 'You found ' + n + ' of 5 secrets';
      $('.tz-end-p').textContent = n >= 5 ? 'Super spotter! Season 2 is coming soon, and you’re ready for it.' : n === 0 ? 'Five secrets are hidden in the teaser. Watch it again and tap them when you spot them!' : 'Watch it again to find them all. Need a clue? The hints are just below.';
      endOv.hidden = false; document.dispatchEvent(new CustomEvent('tol-teaser-end', { detail: { found: n } }));
    }
    function inView() { if (document.fullscreenElement || player.classList.contains('is-full')) return; var hd = document.querySelector('.tol-bar'), top = hd ? Math.max(0, hd.getBoundingClientRect().bottom) : 0, r = player.getBoundingClientRect(); if (r.top < top + 4 || r.top > innerHeight * 0.5) { try { scrollBy({ top: r.top - top - 10, behavior: P.calm ? 'auto' : 'smooth' }); } catch (e) { scrollBy(0, r.top - top - 10); } } }
    // ----- secrets
    function noteRecent() { var now = performance.now(); FR.secrets.forEach(function (s) { P.recent = P.recent.filter(function (r) { return r.id !== s.id; }); P.recent.push({ id: s.id, x: s.x, y: s.y, r: s.r, t: now }); }); P.recent = P.recent.filter(function (r) { return now - r.t < 600; }); }
    function hitSecret(cx, cy) {
      var list = FR.secrets.concat(P.recent), best = null, bd = 1e9, minR = 26 * dpr;
      list.forEach(function (s) { var d = Math.hypot(s.x - cx, s.y - cy); if (d < Math.max(s.r, minR) && d < bd) { bd = d; best = s; } });
      return best;
    }
    function found(s) {
      P.fx.push({ x: s.x, y: s.y, t0: performance.now() }); if (!P.playing) { var n0 = performance.now(), spin = function () { paint(); if (performance.now() - n0 < 1150 && !P.playing) requestAnimationFrame(spin); }; requestAnimationFrame(spin); }
      var def = SECRETS.filter(function (x) { return x.id === s.id; })[0], fresh = MEM.found.indexOf(s.id) < 0;
      if (fresh) { MEM.found.push(s.id); save(MEM); }
      if (A.ctx && A.bus && A.I) { var t = A.ctx.currentTime + 0.01; [84, 88, 91, 96].forEach(function (m, i) { A.I.bell(t + i * 0.07, m, 0.06); }); }
      else if (ensureAudio()) { var c = A.ctx, out = c.createGain(); out.connect(A.master); var I2 = kit(c, out, function () {}); [84, 88, 91, 96].forEach(function (m, i) { I2.bell(c.currentTime + 0.02 + i * 0.07, m, 0.06); }); setTimeout(function () { try { out.disconnect(); } catch (e) {} }, 2500); }
      toast(fresh ? (MEM.found.length >= 5 ? 'You found all 5 secrets! 🌟' : 'Secret found: ' + def.name.toLowerCase() + '! ' + MEM.found.length + ' of 5') : 'Already found: ' + def.name.toLowerCase());
      syncFound(); document.dispatchEvent(new CustomEvent('tol-teaser-secret', { detail: { id: s.id, fresh: fresh, found: MEM.found.slice() } }));
    }
    var toastT = 0;
    function toast(msg) { fxEl.textContent = msg; fxEl.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(function () { fxEl.classList.remove('is-on'); }, 2200); }
    function syncFound() {
      var n = MEM.found.length; $('.tz-found-t').innerHTML = (n >= 5 ? '🌟 All 5 secrets found!' : '🔍 Secrets found: <b>' + n + '</b> of 5');
      $('.tz-dots').innerHTML = SECRETS.map(function (s) { return '<i class="' + (MEM.found.indexOf(s.id) >= 0 ? 'on' : '') + '"></i>'; }).join('');
      var list = document.querySelector('[data-teaser-secrets]');
      if (list) list.innerHTML = SECRETS.map(function (s, i) { var got = MEM.found.indexOf(s.id) >= 0; return '<li class="' + (got ? 'is-got' : '') + '"><span class="tz-ic" aria-hidden="true">' + (got ? '✓' : (i + 1)) + '</span><span>' + (got ? '<b>' + s.name + '</b> · found!' : '<b>Secret ' + (i + 1) + '</b> <details><summary>Need a hint?</summary>' + s.hint + '</details>') + '</span></li>'; }).join('');
    }
    // ----- taps and clicks on the picture
    var idleT = 0, lastTouch = 0;
    function wake(hold) { player.classList.remove('is-idle'); clearTimeout(idleT); if (!hold && P.playing) idleT = setTimeout(function () { var a = document.activeElement, kb = false; try { kb = !!(a && player.contains(a) && a.matches(':focus-visible')); } catch (e) {} if (P.playing && !kb) player.classList.add('is-idle'); }, 2600); }
    stage.addEventListener('touchstart', function () { lastTouch = Date.now(); }, { passive: true });
    cv.addEventListener('click', function (e) {
      var r = cv.getBoundingClientRect(), cx = (e.clientX - r.left) * (W / r.width), cy = (e.clientY - r.top) * (H / r.height);
      if (P.started) { var s = hitSecret(cx, cy); if (s) { found(s); wake(); return; } }
      if (!P.started) { play(); return; }
      if (Date.now() - lastTouch < 800 && player.classList.contains('is-idle')) { wake(); return; }
      toggle(); wake();
    });
    stage.addEventListener('mousemove', function () { wake(); });
    $('.tz-big').addEventListener('click', function () { play(); });
    $('.tz-tap-play').addEventListener('click', function () { toggle(); wake(); });
    $('.tz-tap-re').addEventListener('click', function () { restart(); });
    $('.tz-tap-full').addEventListener('click', function () { $('.tz-full').click(); wake(); });
    $('.tz-again').addEventListener('click', function () { restart(); });
    playBtn.addEventListener('click', toggle);
    $('.tz-re').addEventListener('click', restart);
    $('.tz-full').addEventListener('click', function () {
      var fs = document.fullscreenElement || document.webkitFullscreenElement;
      if (fs) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      if (player.classList.contains('is-full')) { player.classList.remove('is-full'); document.documentElement.style.overflow = ''; setTimeout(resize, 50); return; }
      var rq = player.requestFullscreen || player.webkitRequestFullscreen;
      if (rq) { try { var pr = rq.call(player); if (pr && pr.catch) pr.catch(function () { player.classList.add('is-full'); setTimeout(resize, 50); }); } catch (e) { player.classList.add('is-full'); } }
      else { player.classList.add('is-full'); document.documentElement.style.overflow = 'hidden'; }
      setTimeout(resize, 80);
    });
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) { document.addEventListener(ev, function () { setTimeout(resize, 60); }); });
    function seekPointer(e) { var r = track.getBoundingClientRect(); seek(clamp((e.clientX - r.left) / r.width, 0, 1) * DUR); if (!P.playing && P.started) startOv.hidden = true; }
    track.addEventListener('click', seekPointer);
    track.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); seek(P.T + 5); } else if (e.key === 'ArrowLeft') { e.preventDefault(); seek(P.T - 5); } else if (e.key === 'Home') { e.preventDefault(); seek(0); } });
    document.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return; var t = e.target, tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      if (!player.contains(t) && t !== document.body) return;
      if (e.key === ' ' || e.key === 'k') { if (tag === 'BUTTON' && e.key === ' ') return; e.preventDefault(); toggle(); }
      else if (e.key === 'f') $('.tz-full').click();
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden && P.playing) pause(); });
    document.addEventListener('tol-still', function () { if (!P.playing) { P.calm = calmNow(); paint(); } });
    if (REDUCED_MQ && REDUCED_MQ.addEventListener) REDUCED_MQ.addEventListener('change', function () { if (!P.playing) { P.calm = calmNow(); paint(); } });
    window.addEventListener('resize', resize);
    // the poster: the big title, before anyone presses play
    P.T = 51.6 + GL; syncFound();
    resize();
    if (document.fonts && document.fonts.load) Promise.all(['700 40px Fraunces', 'italic 500 28px Fraunces', '600 19px Lora', '800 30px Lora', '500 13px "IBM Plex Mono"'].map(function (f) { return document.fonts.load(f).catch(function () {}); })).then(function () { paint(); });
    return { P: P, play: play, pause: pause, seek: seek, restart: restart, paint: paint, found: function () { return MEM.found.slice(); }, secrets: function () { return FR.secrets.map(function (s) { var r = cv.getBoundingClientRect(); return { id: s.id, x: r.left + s.x * r.width / W, y: r.top + s.y * r.height / H }; }); }, shot: function () { return FR.shot; }, setCalm: function (v) { window.__teaserCalm = v; P.calm = calmNow(); paint(); } };
  }

  // ---------------------------------------------------------------- "Which new place are you most excited for?"
  var PLACES = [
    { id: 'balloon', e: '🎈', name: 'The hot-air balloon', who: 'Tidbit', say: 'Up, up and away! I call the window seat. (It’s all window.)' },
    { id: 'lighthouse', e: '🌫️', name: 'The lighthouse in the fog', who: 'Sugarfoot', say: 'A light that helps everyone find their way home? I love it already.' },
    { id: 'mountain', e: '🏔️', name: 'The snowy mountain top', who: 'Tidbit', say: 'Race you to the top! …Okay, a slow race. Sugarfoot likes slow races.' },
    { id: 'library', e: '📚', name: 'The secret library door', who: 'Sugarfoot', say: 'A door hiding behind the books? I have SO many questions.' },
    { id: 'market', e: '🏮', name: 'The night market', who: 'Tidbit', say: 'Lanterns, music and snacks. Mostly snacks.' },
    { id: 'underwater', e: '🐠', name: 'The glowing sea', who: 'Sugarfoot', say: 'Glowing jellyfish! Do you think they’re shy, or just very bright?' },
    { id: 'rooftop', e: '🔭', name: 'The rooftop telescope', who: 'Tidbit', say: 'A wish on every shooting star. I’m going to need a lot of wishes.' }
  ];
  function mountPicker(box) {
    box.innerHTML = '<div class="tz-picks" role="group" aria-label="New places">' + PLACES.map(function (p) { return '<button type="button" class="tz-pick" data-id="' + p.id + '" aria-pressed="false"><span class="tz-pe" aria-hidden="true">' + p.e + '</span>' + p.name + '</button>'; }).join('') + '</div><div class="tz-react" aria-live="polite"></div>';
    var react = box.querySelector('.tz-react');
    function show(id, fresh) {
      var p = PLACES.filter(function (x) { return x.id === id; })[0]; if (!p) return;
      box.querySelectorAll('.tz-pick').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-id') === id ? 'true' : 'false'); });
      react.innerHTML = '<div class="tz-react-k">' + (fresh ? 'Great pick!' : 'Your pick') + ' ' + p.e + '</div><div class="tz-react-q"><b>' + p.who + ':</b> “' + p.say + '”</div><div class="tz-react-n">Saved on this device only. Change your mind anytime.</div>';
      react.classList.remove('is-pop'); void react.offsetWidth; react.classList.add('is-pop');
    }
    box.addEventListener('click', function (e) { var b = e.target.closest('.tz-pick'); if (!b) return; MEM.pick = b.getAttribute('data-id'); save(MEM); show(MEM.pick, true); });
    if (MEM.pick) show(MEM.pick, false);
  }

  // ---------------------------------------------------------------- for tests and the video render
  function renderAudio(calm) { // the whole soundtrack, offline, as a 44.1 kHz stereo WAV (base64)
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OAC) return Promise.reject(new Error('no offline audio'));
    var sr = 44100, c = new OAC(2, Math.ceil(sr * DUR), sr);
    return loadSamples(c).then(function () {
      var bus = makeChain(c, c.destination), I = kit(c, bus, function () {});
      score(!!calm).forEach(function (e) { fire(I, e, e[0]); });
      return c.startRendering();
    }).then(function (buf) {
      var n = buf.length, L = buf.getChannelData(0), R = buf.getChannelData(1), out = new DataView(new ArrayBuffer(44 + n * 4)), s = function (o, str) { for (var i = 0; i < str.length; i++) out.setUint8(o + i, str.charCodeAt(i)); };
      s(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); s(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true); out.setUint32(24, sr, true); out.setUint32(28, sr * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); s(36, 'data'); out.setUint32(40, n * 4, true);
      for (var i = 0; i < n; i++) { out.setInt16(44 + i * 4, clamp(L[i] * 0.9, -1, 1) * 32767, true); out.setInt16(46 + i * 4, clamp(R[i] * 0.9, -1, 1) * 32767, true); }
      var bytes = new Uint8Array(out.buffer), bin = '', CH = 0x8000; for (var j = 0; j < bytes.length; j += CH) bin += String.fromCharCode.apply(null, bytes.subarray(j, j + CH));
      return btoa(bin);
    });
  }
  var API = window.TOLTeaser = { duration: DUR, secrets: SECRETS.map(function (s) { return s.id; }), places: PLACES.map(function (p) { return p.id; }), edit: EDIT.map(function (s) { return { t0: s[0], t1: s[1], id: s[2] }; }),
    renderAt: function (canvas, T, calm) { var g = canvas.getContext('2d'); render(g, canvas.width, canvas.height, T, !!calm, 1); return FR.shot; },
    renderAudio: renderAudio, lines: function (calm) { return scanLines(!!calm).map(function (l) { return { t: +l.T.toFixed(2), who: l.who, text: l.text, dur: +l.dur.toFixed(2) }; }); } };
  function init() {
    var host = document.querySelector('[data-teaser]'); if (host) { var pl = mount(host); API.player = pl; ['play', 'pause', 'seek', 'restart', 'found', 'secrets', 'shot', 'setCalm'].forEach(function (k) { API[k] = pl[k]; }); API.state = function () { return { t: pl.P.T, playing: pl.P.playing, ended: pl.P.ended, calm: pl.P.calm, shot: FR.shot, found: MEM.found.slice() }; }; }
    var pk = document.querySelector('[data-teaser-picker]'); if (pk) mountPicker(pk);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
