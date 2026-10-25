/* emo-art.js: draws the personal picture for "What am I feeling?" (/what-am-i-feeling.html) on a canvas.
   Every mark comes from one part listed by emo-engine.js (buildArt), so each one has a legend entry in plain words.
   The same answers always give the same picture (a seeded random number), so a saved session redraws exactly.
   Still image only: no animation, no flashing. The site's dark mode turns canvases back to their true colors,
   so the picture looks the same in both themes. Exposes window.EMO_ART.draw(canvas, parts, { seed, numbers }). */
(function (root) {
  'use strict';
  var W = 900, CX = 450, CY = 440, FR = 402;

  function rng(seed) {
    var a = seed >>> 0 || 1;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function rgb(hex) { var h = String(hex || '#888888').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgba(hex, a) { var c = rgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function mix(hex, hex2, t) { var a = rgb(hex), b = rgb(hex2); return '#' + [0, 1, 2].map(function (i) { var v = Math.round(a[i] + (b[i] - a[i]) * t); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function gray(hex, t) { var c = rgb(hex), g = Math.round(c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11); return mix(hex, '#' + [g, g, g].map(function (v) { return (v < 16 ? '0' : '') + v.toString(16); }).join(''), t); }

  // a closed outline from a radius function
  function blob(ctx, cx, cy, rf, steps) {
    steps = steps || 180; ctx.beginPath();
    for (var i = 0; i <= steps; i++) { var a = i / steps * Math.PI * 2, r = rf(a); var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.closePath();
  }
  function wobble(R) { var p = [R() * 6.28, R() * 6.28, R() * 6.28]; return function (a) { return 0.035 * Math.sin(2 * a + p[0]) + 0.025 * Math.sin(3 * a + p[1]) + 0.015 * Math.sin(5 * a + p[2]); }; }
  function softFill(ctx, cx, cy, r, color, alpha) {
    var g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.05);
    g.addColorStop(0, rgba(mix(color, '#FFFFFF', 0.45), alpha)); g.addColorStop(0.7, rgba(color, alpha)); g.addColorStop(1, rgba(mix(color, '#2B2620', 0.12), alpha));
    return g;
  }

  /* ------------------------------------------------------------------ the parts */
  function drawBg(ctx, R) {
    var g = ctx.createRadialGradient(CX, CY, 60, CX, CY + 20, 640);
    g.addColorStop(0, '#FCF9F1'); g.addColorStop(1, '#ECE2CC');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
    ctx.fillStyle = 'rgba(90,70,40,0.05)';
    for (var i = 0; i < 1500; i++) { ctx.fillRect(R() * W, R() * W, 1.4, 1.4); }
  }
  function frameGap(parts) { return parts.opening ? { a: -0.95, w: 0.36 } : null; }
  function drawFrame(ctx, gap) {
    ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = '#C9BA9E';
    ctx.beginPath();
    if (gap) ctx.arc(CX, CY + 10, FR, gap.a + gap.w / 2, gap.a - gap.w / 2 + Math.PI * 2);
    else ctx.arc(CX, CY + 10, FR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(160,140,110,0.35)';
    ctx.beginPath();
    if (gap) ctx.arc(CX, CY + 10, FR - 9, gap.a + gap.w / 2 + 0.02, gap.a - gap.w / 2 - 0.02 + Math.PI * 2); else ctx.arc(CX, CY + 10, FR - 9, 0, Math.PI * 2);
    ctx.stroke(); ctx.restore();
  }
  function gapPoint(gap, r) { return { x: CX + Math.cos(gap.a) * r, y: CY + 10 + Math.sin(gap.a) * r }; }
  function drawOpening(ctx, e, gap, coreR) {
    var p = gapPoint(gap, FR), g = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 210);
    g.addColorStop(0, rgba(e.color, 0.75)); g.addColorStop(0.45, rgba(e.color, 0.28)); g.addColorStop(1, rgba(e.color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 210, 0, Math.PI * 2); ctx.fill();
    // a path of small dots from the middle toward the light
    var s = { x: CX + Math.cos(gap.a) * (coreR + 40), y: CY + Math.sin(gap.a) * (coreR + 40) }, t = gapPoint(gap, FR - 30);
    for (var i = 0; i < 7; i++) {
      var k = i / 6, x = s.x + (t.x - s.x) * k + Math.sin(k * 3.1) * 14, y = s.y + (t.y - s.y) * k;
      ctx.fillStyle = rgba(mix(e.color, '#8A6A2A', 0.35), 0.35 + k * 0.5); ctx.beginPath(); ctx.arc(x, y, 3 + k * 4, 0, Math.PI * 2); ctx.fill();
    }
    return gapPoint(gap, FR - 46);
  }
  function drawHorizon(ctx, e) {
    ctx.save(); ctx.strokeStyle = rgba(e.color, 0.9); ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(60, 668); ctx.bezierCurveTo(260, 664, 380, 670, 430, 668); ctx.bezierCurveTo(455, 667, 455, 636, 480, 634); ctx.bezierCurveTo(560, 630, 700, 636, 840, 632); ctx.stroke();
    ctx.lineTo(840, 900); ctx.lineTo(60, 900); ctx.closePath(); ctx.fillStyle = rgba(e.color, 0.12); ctx.fill();
    ctx.restore(); return { x: 700, y: 610 };
  }
  function drawFog(ctx, e, R) {
    ctx.save();
    for (var i = 0; i < 9; i++) {
      var x = 120 + R() * 660, y = 600 + R() * 90, rx = 120 + R() * 140, ry = 22 + R() * 18;
      var g = ctx.createRadialGradient(x, y, 2, x, y, rx); g.addColorStop(0, rgba(e.color, 0.42)); g.addColorStop(1, rgba(e.color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore(); return { x: 150, y: 625 };
  }
  function drawSpeckle(ctx, e, R) {
    var n = Math.round(160 + 420 * (e.density || 0.5)); ctx.fillStyle = rgba(e.color, 0.42);
    for (var i = 0; i < n; i++) { var a = R() * Math.PI * 2, r = 318 + R() * 78, s = 1 + R() * 2; ctx.fillRect(CX + Math.cos(a) * r, CY + 10 + Math.sin(a) * r, s, s); }
    return { x: CX + Math.cos(2.5) * 352, y: CY + 10 + Math.sin(2.5) * 352 };
  }
  function layoutStones(stones) {
    var sorted = stones.slice().sort(function (a, b) { return b.weight - a.weight; }), row = [[], []], out = [];
    sorted.forEach(function (s) { var r = 24 + s.weight * 6.5; var w0 = row[0].reduce(function (t, x) { return t + x.r * 1.7; }, 0); (w0 + r * 1.7 < 430 ? row[0] : row[1]).push({ s: s, r: r }); });
    [0, 1].forEach(function (ri) {
      var list = row[ri]; if (!list.length) return;
      var total = list.reduce(function (t, x) { return t + x.r * 1.7; }, 0), left = [], right = [];
      list.forEach(function (x, i) { (i % 2 ? right : left).push(x); });
      var ordered = left.reverse().concat(right), x0 = CX - total / 2;
      ordered.forEach(function (x) { var cx = x0 + x.r * 0.85; x0 += x.r * 1.7; out.push({ s: x.s, r: x.r, x: cx, y: (ri ? 712 : 778) - x.r * 0.45 }); });
    });
    return out;
  }
  function drawStone(ctx, p, R) {
    var w = wobble(R);
    ctx.save(); ctx.fillStyle = 'rgba(60,45,30,0.14)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r * 0.62, p.r * 0.95, p.r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    blob(ctx, p.x, p.y, function (a) { return p.r * (1 + w(a) * 2) * (Math.sin(a) > 0 ? 0.82 : 1); }, 90);
    ctx.fillStyle = softFill(ctx, p.x, p.y, p.r, p.s.color, 0.95); ctx.fill();
    ctx.strokeStyle = rgba(mix(p.s.color, '#2B2620', 0.4), 0.5); ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    return { x: p.x, y: p.y };
  }
  function drawAnchors(ctx, e, R) {
    var pts = [], n = Math.min(6, e.count || 1);
    for (var i = 0; i < n; i++) {
      var x = 175 + (i % 3) * 46 + R() * 14, y = 600 - Math.floor(i / 3) * 44 + R() * 12;
      ctx.fillStyle = 'rgba(126,156,104,0.75)'; ctx.beginPath(); ctx.ellipse(x - 12, y + 16, 12, 5, -0.6, 0, Math.PI * 2); ctx.fill();
      var g = ctx.createRadialGradient(x, y, 1, x, y, 26); g.addColorStop(0, rgba(e.color, 0.95)); g.addColorStop(0.35, rgba(e.color, 0.45)); g.addColorStop(1, rgba(e.color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = mix(e.color, '#FFFFFF', 0.5); ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
      pts.push({ x: x, y: y });
    }
    return pts[0];
  }
  function drawBridge(ctx, e, from, coreR) {
    var s = from || { x: CX, y: 800 }, t = { x: CX + 10, y: CY + coreR * 0.92 };
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(e.color, 0.32); ctx.lineWidth = 20;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.bezierCurveTo(s.x + 90, s.y - 90, t.x + 110, t.y + 80, t.x, t.y); ctx.stroke();
    ctx.strokeStyle = rgba(e.color, 0.8); ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
    return { x: (s.x + t.x) / 2 + 70, y: (s.y + t.y) / 2 };
  }
  var PERSON_AT = { jagged: [Math.PI * 1.12, 115], broken: [Math.PI * 1.88, 120], far: [Math.PI * 0.86, 0], warm: [Math.PI * 0.08, 92] };
  function figure(ctx, x, y, color, s) {
    s = s || 1; ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y - 14 * s, 10 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y + 12 * s, 16 * s, 14 * s, 0, Math.PI, 0); ctx.fill();
  }
  function drawPerson(ctx, e, coreR) {
    var at = PERSON_AT[e.style] || PERSON_AT.jagged, a = at[0], d = e.style === 'far' ? 330 : coreR + at[1];
    var x = CX + Math.cos(a) * d, y = CY + Math.sin(a) * d, ex = CX + Math.cos(a) * (coreR + 6), ey = CY + Math.sin(a) * (coreR + 6);
    ctx.save(); ctx.lineCap = 'round';
    if (e.style === 'jagged') {
      ctx.strokeStyle = rgba(e.color, 0.95); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y);
      for (var i = 1; i <= 8; i++) { var k = i / 8, px = x + (ex - x) * k, py = y + (ey - y) * k, off = (i % 2 ? 9 : -9) * (i < 8 ? 1 : 0); ctx.lineTo(px - Math.sin(a) * off, py + Math.cos(a) * off); }
      ctx.stroke();
    } else if (e.style === 'broken') {
      ctx.strokeStyle = rgba(e.color, 0.9); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (ex - x) * 0.38, y + (ey - y) * 0.38); ctx.moveTo(x + (ex - x) * 0.62, y + (ey - y) * 0.62); ctx.lineTo(ex, ey); ctx.stroke();
    } else if (e.style === 'far') {
      ctx.strokeStyle = rgba(e.color, 0.7); ctx.lineWidth = 2.5; ctx.setLineDash([2, 10]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = rgba(e.color, 0.55); ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
    }
    figure(ctx, x, y, rgba(e.color, 0.95), e.style === 'far' ? 0.85 : 1);
    if (e.style === 'warm') { var a2 = a + 0.42, x2 = CX + Math.cos(a2) * (d + 12), y2 = CY + Math.sin(a2) * (d + 12); ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(CX + Math.cos(a2) * (coreR + 6), CY + Math.sin(a2) * (coreR + 6)); ctx.stroke(); figure(ctx, x2, y2, rgba(mix(e.color, '#C2566B', 0.3), 0.95), 0.9); }
    ctx.restore(); return { x: x, y: y - 40 };
  }
  function drawCups(ctx, e) {
    var n = e.count || 1, x = 752, y0 = 445 - (n - 1) * 24, first = null;
    for (var i = 0; i < n; i++) {
      var y = y0 + i * 48, torn = e.torn && i === n - 1;
      ctx.save(); ctx.strokeStyle = rgba(e.color, 0.95); ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.fillStyle = 'rgba(255,253,247,0.7)';
      function cup(dx) { ctx.beginPath(); ctx.moveTo(x - 17 + dx, y - 15); ctx.lineTo(x - 12 + dx, y + 15); ctx.lineTo(x + 12 + dx, y + 15); ctx.lineTo(x + 17 + dx, y - 15); ctx.fill(); ctx.stroke(); }
      if (torn) { ctx.save(); ctx.beginPath(); ctx.rect(x - 30, y - 30, 30, 60); ctx.clip(); cup(-5); ctx.restore(); ctx.save(); ctx.beginPath(); ctx.rect(x, y - 30, 30, 60); ctx.clip(); cup(5); ctx.restore(); }
      else cup(0);
      ctx.beginPath(); ctx.arc(x + 21 + (torn ? 5 : 0), y - 2, 7, -1.2, 1.2); ctx.stroke();
      ctx.restore(); if (!first) first = { x: x, y: y - 34 };
    }
    return first;
  }
  function drawHaze(ctx, e, R, coreR) {
    var n = Math.min(8, 2 + Math.round((e.count || 1) * 1.5)), first = null;
    for (var i = 0; i < n; i++) {
      var x = CX - 210 + R() * 420, y = CY - coreR - 55 - R() * 70, rx = 60 + R() * 70, ry = 13 + R() * 9;
      var g = ctx.createRadialGradient(x, y, 2, x, y, rx); g.addColorStop(0, rgba(e.color, 0.55)); g.addColorStop(1, rgba(e.color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, (R() - 0.5) * 0.4, 0, Math.PI * 2); ctx.fill();
      if (!first || y < first.y) first = { x: x, y: y };
    }
    return first;
  }
  function drawRing(ctx, e, coreR) {
    var r = coreR + 30, f = Math.max(0.04, Math.min(1, e.fill == null ? 0.5 : e.fill));
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(e.color, 0.45); ctx.lineWidth = 2; ctx.setLineDash([2, 9]); ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = rgba(e.color, 0.9); ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(CX, CY, r, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.stroke();
    ctx.restore(); return { x: CX - 26, y: CY - r };
  }
  function edgeFn(style, Ri, R) {
    var w = wobble(R), ph = R() * 6.28;
    if (style === 'droop') return function (a) { return Ri * (1 + 0.1 * Math.sin(a) + w(a)); };
    if (style === 'tremble') return function (a) { return Ri * (1 + 0.022 * Math.sin(38 * a + ph) + w(a) * 0.6); };
    if (style === 'spiky') return function (a) { var k = 15, t = Math.abs(((a * k / Math.PI) % 2) - 1); return Ri * (0.88 + 0.2 * t + w(a) * 0.5); };
    if (style === 'flat') return function () { return Ri; };
    return function (a) { return Ri * (1 + w(a)); };
  }
  function drawFeeling(ctx, fm, i, coreR, R) {
    var off = i ? coreR * 0.2 : 0, ang = 0.6 + i * 2.2, cx = CX + Math.cos(ang) * off, cy = CY + Math.sin(ang) * off, Ri = coreR * (1 - 0.13 * i);
    var color = fm.color, style = fm.edge;
    ctx.save();
    if (i) ctx.globalCompositeOperation = 'multiply';
    if (style === 'rings') {
      for (var k = 0; k < 3; k++) { var a = k * 2.09 + 0.4, x = cx + Math.cos(a) * Ri * 0.32, y = cy + Math.sin(a) * Ri * 0.32; ctx.fillStyle = softFill(ctx, x, y, Ri * 0.72, color, 0.55); ctx.beginPath(); ctx.arc(x, y, Ri * 0.72, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = rgba(color, 0.7); ctx.lineWidth = 2; ctx.stroke(); }
    } else if (style === 'cloud') {
      for (var c = 0; c < 7; c++) { var ca = c / 7 * Math.PI * 2, cr = Ri * (0.45 + R() * 0.12); ctx.fillStyle = rgba(color, 0.42); ctx.beginPath(); ctx.arc(cx + Math.cos(ca) * Ri * 0.42, cy + Math.sin(ca) * Ri * 0.34, cr, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = rgba(mix(color, '#2B2620', 0.3), 0.8); ctx.lineWidth = 2.5; ctx.setLineDash([3, 9]); ctx.beginPath(); ctx.arc(cx, cy, Ri * 1.02, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    } else if (style === 'glow') {
      var g = ctx.createRadialGradient(cx, cy, Ri * 0.1, cx, cy, Ri * 1.25); g.addColorStop(0, rgba(mix(color, '#FFFFFF', 0.4), 0.9)); g.addColorStop(0.65, rgba(color, 0.6)); g.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, Ri * 1.25, 0, Math.PI * 2); ctx.fill();
    } else {
      var fn = edgeFn(style, Ri, R);
      if (style === 'soft') { ctx.shadowColor = rgba(color, 0.6); ctx.shadowBlur = 40; }
      blob(ctx, cx, cy, fn, style === 'spiky' ? 360 : 180);
      if (style === 'flat') ctx.fillStyle = rgba(gray(color, 0.4), 0.7);
      else if (style === 'dense') { var gd = ctx.createRadialGradient(cx, cy, Ri * 0.05, cx, cy, Ri); gd.addColorStop(0, rgba(mix(color, '#2B2620', 0.45), 0.92)); gd.addColorStop(1, rgba(mix(color, '#FFFFFF', 0.25), 0.75)); ctx.fillStyle = gd; }
      else ctx.fillStyle = softFill(ctx, cx, cy, Ri, color, style === 'soft' ? 0.5 : 0.8);
      ctx.fill(); ctx.shadowBlur = 0;
      if (style !== 'soft' && style !== 'flat') { ctx.strokeStyle = rgba(mix(color, '#2B2620', 0.3), 0.55); ctx.lineWidth = style === 'spiky' ? 2 : 1.5; ctx.stroke(); }
      if (style === 'tremble') { [1.13, 1.25].forEach(function (m, j) { blob(ctx, cx, cy, function (a) { return fn(a) * m; }, 180); ctx.strokeStyle = rgba(color, 0.42 - j * 0.14); ctx.lineWidth = 1.5; ctx.stroke(); }); }
      if (style === 'drift') { var dx = cx + Math.cos(-0.5) * Ri * 1.38, dy = cy + Math.sin(-0.5) * Ri * 1.38; ctx.fillStyle = softFill(ctx, dx, dy, Ri * 0.26, color, 0.8); ctx.beginPath(); ctx.arc(dx, dy, Ri * 0.26, 0, Math.PI * 2); ctx.fill(); }
      if (style === 'crack') { ctx.strokeStyle = rgba(mix(color, '#2B2620', 0.6), 0.8); ctx.lineWidth = 2.2; ctx.beginPath(); var sx = cx - Ri * 0.55, sy = cy - Ri * 0.5; ctx.moveTo(sx, sy); for (var q = 1; q <= 6; q++) ctx.lineTo(sx + Ri * 0.18 * q + (q % 2 ? 8 : -6), sy + Ri * 0.17 * q + (q % 2 ? -6 : 8)); ctx.stroke(); }
      if (style === 'scatter') { for (var s2 = 0; s2 < 16; s2++) { var sa = R() * Math.PI * 2, sr = Ri * (1.12 + R() * 0.3); ctx.fillStyle = rgba(color, 0.8); ctx.beginPath(); ctx.arc(cx + Math.cos(sa) * sr, cy + Math.sin(sa) * sr, 2 + R() * 3, 0, Math.PI * 2); ctx.fill(); } }
    }
    ctx.restore();
  }
  function drawThreads(ctx, e, R, coreR) {
    var n = e.count || 1, kx = CX + coreR * 0.32, ky = CY - coreR * 0.18, first = null;
    ctx.save(); ctx.lineCap = 'round';
    for (var i = 0; i < n; i++) {
      var a = R() * Math.PI * 2, b = a + Math.PI + (R() - 0.5) * 1.6, r1 = 386, sx = CX + Math.cos(a) * r1, sy = CY + 10 + Math.sin(a) * r1, tx = CX + Math.cos(b) * r1, ty = CY + 10 + Math.sin(b) * r1;
      var c1x, c1y, c2x, c2y;
      if (e.knot) { c1x = kx + (R() - 0.5) * 40; c1y = ky + (R() - 0.5) * 40; c2x = kx + (R() - 0.5) * 40; c2y = ky + (R() - 0.5) * 40; }
      else { c1x = CX + (R() - 0.5) * coreR * 1.6; c1y = CY + (R() - 0.5) * coreR * 1.6; c2x = CX + (R() - 0.5) * coreR * 1.6; c2y = CY + (R() - 0.5) * coreR * 1.6; }
      ctx.strokeStyle = rgba(e.color, 0.55 + R() * 0.3); ctx.lineWidth = 1.4 + R() * 1.2;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.bezierCurveTo(c1x, c1y, c2x, c2y, tx, ty); ctx.stroke();
      if (!first) first = { x: CX + Math.cos(a) * 330, y: CY + 10 + Math.sin(a) * 330 };
    }
    if (e.knot) { ctx.strokeStyle = rgba(e.color, 0.85); ctx.lineWidth = 1.8; for (var k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(kx + (R() - 0.5) * 10, ky + (R() - 0.5) * 10, 7 + R() * 7, 5 + R() * 5, R() * 3, 0, Math.PI * 2); ctx.stroke(); } }
    ctx.restore(); return first;
  }
  function drawStory(ctx, e, coreR, R) {
    var w = wobble(R), r = coreR + 54;
    ctx.save(); ctx.strokeStyle = rgba(e.color, 0.85); ctx.lineWidth = 2.5; ctx.setLineDash([11, 9]);
    blob(ctx, CX, CY, function (a) { return r * (1 + w(a)); }, 140); ctx.stroke(); ctx.restore();
    return { x: CX + Math.cos(2.35) * r, y: CY + Math.sin(2.35) * r };
  }
  function drawPings(ctx, e, R) {
    var first = null;
    for (var i = 0; i < (e.count || 4); i++) {
      var x = 175 + R() * 170, y = 175 + R() * 130, s = 9 + R() * 8, a = (R() - 0.5) * 0.8;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = rgba(e.color, 0.25); ctx.strokeStyle = rgba(e.color, 0.9); ctx.lineWidth = 2;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-s / 2, -s / 2, s, s, 3); else ctx.rect(-s / 2, -s / 2, s, s); ctx.fill(); ctx.stroke(); ctx.restore();
      if (!first || y < first.y) first = { x: x, y: y };
    }
    return first;
  }
  function drawWedges(ctx, e) {
    var W2 = [[0, 330, 120, 215], [0, 520, 110, 205], [W, 400, 120, 690]], first = null;
    W2.forEach(function (w) {
      var g = ctx.createLinearGradient(w[0], w[1], w[3], w[1]); g.addColorStop(0, rgba(e.color, 0.6)); g.addColorStop(1, rgba(e.color, 0.12));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(w[0], w[1] - w[2] / 2); ctx.lineTo(w[3], w[1]); ctx.lineTo(w[0], w[1] + w[2] / 2); ctx.closePath(); ctx.fill();
      if (!first) first = { x: w[3] - 30, y: w[1] - 28 };
    });
    return first;
  }
  function drawAdded(ctx, e, coreR) {
    var first = null;
    for (var i = 0; i < (e.count || 1); i++) {
      var a = -0.15 + i * 0.32, x = CX + Math.cos(a) * (coreR + 82), y = CY + Math.sin(a) * (coreR + 82);
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillStyle = rgba(e.color, 0.9); ctx.fillRect(-7, -7, 14, 14); ctx.restore();
      if (!first) first = { x: x + 18, y: y - 18 };
    }
    return first;
  }
  function marker(ctx, n, p, taken) {
    var x = Math.max(16, Math.min(W - 16, p.x)), y = Math.max(16, Math.min(W - 16, p.y));
    for (var tries = 0; tries < 12; tries++) {
      var hit = taken.some(function (t) { return Math.abs(t.x - x) < 30 && Math.abs(t.y - y) < 30; });
      if (!hit) break; x += 30; if (x > W - 20) { x = p.x - 30; y += 30; }
    }
    taken.push({ x: x, y: y });
    ctx.save(); ctx.fillStyle = 'rgba(255,253,247,0.95)'; ctx.strokeStyle = '#2B2620'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2B2620'; ctx.font = '600 15px "IBM Plex Mono", ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), x, y + 1);
    ctx.restore();
  }

  /* ------------------------------------------------------------------ draw everything */
  function draw(canvas, parts, o) {
    o = o || {};
    var px = o.px || canvas.width, ctx = canvas.getContext('2d'); if (!ctx) return [];
    var sc = px / W; ctx.setTransform(sc, 0, 0, sc, 0, 0);
    var R = rng(o.seed || 1), by = {}; parts.forEach(function (e) { (by[e.kind] = by[e.kind] || []).push(e); by[e.id] = e; });
    var core = by.core ? by.core[0] : null, coreR = core ? 92 + (core.n || 5) * 8.5 : 120, at = {};
    drawBg(ctx, R);
    var gap = by.opening ? { a: -0.95, w: 0.36 } : null;
    ctx.save(); ctx.beginPath(); ctx.arc(CX, CY + 10, FR, 0, Math.PI * 2); ctx.clip();
    if (by.horizon) at.horizon = drawHorizon(ctx, by.horizon[0]);
    if (by.fog) at.fog = drawFog(ctx, by.fog[0], R);
    if (by.speckle) at.speckle = drawSpeckle(ctx, by.speckle[0], R);
    if (gap) at.opening = drawOpening(ctx, by.opening[0], gap, coreR);
    var stones = layoutStones(by.stone || []), stoneAt = {};
    stones.forEach(function (p) { at[p.s.id] = drawStone(ctx, p, R); stoneAt[p.s.fid] = p; });
    if (by.anchors) at.anchors = drawAnchors(ctx, by.anchors[0], R);
    if (by.bridge) {
      var fromF = { work: ['workload', 'caregiving', 'roles', 'meaning', 'jobinsecurity'], money: ['money'], home: ['home'], people: ['othercrisis', 'obligations'], body: ['healthchange'], change: ['jobinsecurity'] }[by.bridge[0].from] || [];
      var st = null; fromF.forEach(function (f) { if (!st && stoneAt[f]) st = stoneAt[f]; });
      at.bridge = drawBridge(ctx, by.bridge[0], st ? { x: st.x, y: st.y - st.r * 0.5 } : null, coreR);
    }
    (by.person || []).forEach(function (e) { at[e.id] = drawPerson(ctx, e, coreR); });
    if (by.cups) at.cups = drawCups(ctx, by.cups[0]);
    if (by.haze) at.haze = drawHaze(ctx, by.haze[0], R, coreR);
    if (by.ring) at.ring = drawRing(ctx, by.ring[0], coreR);
    if (core) { var fams = core.fams.slice(0, 4); for (var i = fams.length - 1; i >= 0; i--) drawFeeling(ctx, fams[i], i, coreR, R); at.core = { x: CX + coreR * 0.15, y: CY + coreR * 0.15 }; }
    if (by.threads) at.threads = drawThreads(ctx, by.threads[0], R, coreR);
    if (by.story) at.story = drawStory(ctx, by.story[0], coreR, R);
    if (by.pings) at.pings = drawPings(ctx, by.pings[0], R);
    if (by.added) at.added = drawAdded(ctx, by.added[0], coreR);
    ctx.restore();
    drawFrame(ctx, gap);
    if (by.wedges) at.wedges = drawWedges(ctx, by.wedges[0]);
    var taken = [];
    if (o.numbers !== false) parts.forEach(function (e, idx) { var p = at[e.id] || at[e.kind]; if (p) marker(ctx, idx + 1, p, taken); });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return at;
  }

  root.EMO_ART = { draw: draw, size: W };
})(window);
