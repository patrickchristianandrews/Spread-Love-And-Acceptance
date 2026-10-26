/* emo-art.js: paints the personal picture for "What am I feeling?" (/what-am-i-feeling.html) on a canvas.
   It is an abstract painting, framed and matted like a piece in a gallery, with a small title card.
   The look follows the mood of the answers (calm to turbulent, slow to quick, closed in to open, light to heavy)
   and the colors of the feelings, so different answers give clearly different pictures.
   Every mark comes from one part listed by emo-engine.js (buildArt), so each one has a legend entry in plain words.
   The same answers always give the same picture (seeded random numbers, one stream per part), so a saved session
   redraws exactly. Still image only: no animation, no flashing. The site's dark mode turns canvases back to their
   true colors, and the frame and card are painted inside the canvas, so the picture looks the same in both themes.
   Exposes window.EMO_ART.draw(canvas, parts, { seed, numbers, px, mood, title, date }). */
(function (root) {
  'use strict';
  var W = 900, WX = 80, WY = 60, S = 740, TAU = Math.PI * 2;

  /* ------------------------------------------------------------------ numbers and colors */
  function rng(seed) {
    var a = seed >>> 0 || 1;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hs(str) { var h = 2166136261; str = String(str); for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function sub(seed, id) { return rng(((seed >>> 0) ^ hs(id)) >>> 0); }
  function cl(x, a, b) { return x < a ? a : x > b ? b : x; }
  function hx(v) { v = Math.round(cl(v, 0, 255)); return (v < 16 ? '0' : '') + v.toString(16); }
  function rgb(hex) { var h = String(hex || '#888888').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16); if (isNaN(n)) n = 0x888888; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgba(hex, a) { var c = rgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (Math.round(cl(a, 0, 1) * 1000) / 1000) + ')'; }
  function mix(h1, h2, t) { var a = rgb(h1), b = rgb(h2); return '#' + [0, 1, 2].map(function (i) { return hx(a[i] + (b[i] - a[i]) * t); }).join(''); }
  function toHsl(hex) {
    var c = rgb(hex), r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn;
    if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); if (mx === r) h = (g - b) / d + (g < b ? 6 : 0); else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; }
    return [h, s, l];
  }
  function hsl(h, s, l) {
    h = ((h % 360) + 360) % 360; s = cl(s, 0, 1); l = cl(l, 0, 1);
    var a = s * Math.min(l, 1 - l);
    function f(n) { var k = (n + h / 30) % 12; return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255); }
    return '#' + hx(f(0)) + hx(f(8)) + hx(f(4));
  }
  function lum(hex) { var c = rgb(hex); return (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) / 255; }
  // whatever color a person picked, bring it to a bright, saturated version of the same hue
  function vivid(hex) { var h = toHsl(hex); if (h[1] < 0.1) return hex; return hsl(h[0], Math.max(h[1], 0.8), cl(h[2], 0.46, 0.62)); }

  /* ------------------------------------------------------------------ palettes
     Each feeling brings its own palette, built around the hue of its hero color so that a changed color shifts the
     whole palette. [hue, saturation, lightness]; a fourth value of 1 pins the hue (a warm glow stays warm). */
  var T = {
    sad: { h0: 222, g: [[250, .82, .13], [228, .88, .27]], c: [[222, .95, .52], [190, .95, .46], [262, .82, .54], [240, .9, .64], [204, .95, .64]], a: [38, 1, .6, 1] },
    anxious: { h0: 43, g: [[262, .92, .14], [318, .92, .36]], c: [[50, 1, .58], [182, 1, .52], [322, .96, .6], [96, .9, .55], [262, .9, .7]], a: [58, 1, .86, 1] },
    angry: { h0: 352, g: [[226, .95, .38], [238, .92, .2]], c: [[352, .95, .52], [18, 1, .56], [38, 1, .58], [334, .95, .6], [220, .98, .6]], a: [52, 1, .86, 1] },
    over: { h0: 258, g: [[340, .9, .52], [270, .86, .4]], c: [[266, .86, .62], [190, .96, .54], [28, 1, .6], [52, 1, .62], [300, .82, .5]], a: [52, 1, .88, 1] },
    numb: { h0: 228, g: [[226, .72, .88], [290, .64, .9]], c: [[228, .66, .66], [298, .58, .76], [182, .58, .72], [236, .52, .58]], a: [8, 1, .58, 1] },
    lonely: { h0: 175, g: [[200, .95, .2], [186, .96, .38]], c: [[176, .9, .46], [206, .95, .56], [158, .84, .62], [232, .8, .62]], a: [24, 1, .62, 1] },
    hurt: { h0: 338, g: [[332, .86, .38], [280, .74, .3]], c: [[338, .95, .62], [310, .82, .56], [10, 1, .66], [270, .72, .52]], a: [46, 1, .6, 1] },
    guilt: { h0: 300, g: [[316, .86, .17], [346, .88, .3]], c: [[300, .8, .44], [336, .9, .47], [14, .96, .52], [268, .72, .42]], a: [44, 1, .62, 1] },
    tired: { h0: 199, g: [[232, .78, .8], [322, .78, .84]], c: [[214, .86, .66], [250, .78, .72], [300, .72, .76], [336, .86, .79], [186, .82, .72]], a: [34, 1, .76, 1] },
    restless: { h0: 22, g: [[40, 1, .56], [14, 1, .54]], c: [[22, 1, .56], [48, 1, .56], [182, .96, .42], [340, .96, .56], [262, .86, .52]], a: [56, 1, .9, 1] },
    okay: { h0: 142, g: [[198, .88, .8], [24, .96, .84]], c: [[190, .9, .56], [214, .86, .62], [166, .8, .52], [30, 1, .64], [346, .86, .74], [52, 1, .66]], a: [42, 1, .62, 1] },
    joy: { h0: 142, g: [[48, 1, .8], [336, .92, .78]], c: [[48, 1, .56], [336, .96, .62], [178, .96, .46], [14, 1, .62], [270, .82, .66], [120, .72, .52]], a: [52, 1, .92, 1] },
    cant: { h0: 250, g: [[205, .96, .88], [290, .92, .88]], c: [[250, .82, .7], [190, .92, .62], [310, .82, .7], [40, .96, .72]], a: [45, 1, .78, 1] }
  };
  function palette(key, hero) {
    var t = T[key] || T.cant, hh = toHsl(hero || '#888888'), H = hh[1] < 0.1 ? t.h0 : hh[0];
    function col(sp) { return hsl(sp[3] ? sp[0] : sp[0] - t.h0 + H, sp[1], sp[2]); }
    var g = t.g.map(col);
    return { key: key, g: g, c: t.c.map(col), a: col(t.a), dark: (lum(g[0]) + lum(g[1])) / 2 < 0.42 };
  }

  /* ------------------------------------------------------------------ painting tools (all in picture coordinates, 0 to S) */
  function organic(c, cx, cy, rx, ry, rot, wob, ph, steps) {
    steps = steps || 30; var pts = [], cr = Math.cos(rot), sr = Math.sin(rot), i;
    for (i = 0; i < steps; i++) {
      var a = i / steps * TAU, k = 1 + wob * (Math.sin(2 * a + ph[0]) * 0.5 + Math.sin(3 * a + ph[1]) * 0.3 + Math.sin(5 * a + ph[2]) * 0.2);
      var x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k; pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
    }
    var n = pts.length; c.beginPath(); c.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
    for (i = 0; i < n; i++) { var p = pts[i], q = pts[(i + 1) % n]; c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    c.closePath();
  }
  // a soft-edged pool of color, like a stain soaked into raw canvas
  function stain(P, cx, cy, rx, ry, rot, c1, c2, a, o) {
    o = o || {}; var c = P.c, ph = [P.R() * TAU, P.R() * TAU, P.R() * TAU], wob = o.wob == null ? 0.12 : o.wob, cr = Math.cos(rot), sr = Math.sin(rot);
    c.save();
    [[1.09, 0.16], [1.045, 0.26], [1, 1]].forEach(function (p) {
      organic(c, cx, cy, rx * p[0], ry * p[0], rot, wob, ph);
      var g = c.createLinearGradient(cx - cr * rx, cy - sr * rx, cx + cr * rx, cy + sr * rx);
      g.addColorStop(0, rgba(c1, a * p[1])); g.addColorStop(1, rgba(c2 || c1, a * p[1])); c.fillStyle = g; c.fill();
    });
    if (o.lit !== false) {
      organic(c, cx, cy, rx, ry, rot, wob, ph); c.save(); c.clip();
      var lg = c.createRadialGradient(cx - rx * 0.25, cy - ry * 0.45, 2, cx - rx * 0.1, cy - ry * 0.2, Math.max(rx, ry) * 0.9);
      lg.addColorStop(0, 'rgba(255,255,255,' + (0.3 * a) + ')'); lg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = lg; c.fillRect(cx - rx * 1.2, cy - ry * 1.2, rx * 2.4, ry * 2.4); c.restore();
    }
    if (o.rim !== 0) { organic(c, cx, cy, rx, ry, rot, wob, ph); c.lineWidth = o.rimW || 2.5; c.strokeStyle = rgba(mix(c1, P.dark ? '#FFFFFF' : '#220B4A', 0.4), a * 0.35); c.stroke(); }
    c.restore();
  }
  function glow(P, x, y, r, color, a, mode) {
    var c = P.c; c.save(); c.globalCompositeOperation = mode || (P.dark ? 'screen' : 'source-over');
    var g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, a)); g.addColorStop(0.35, rgba(color, a * 0.45)); g.addColorStop(0.7, rgba(color, a * 0.12)); g.addColorStop(1, rgba(color, 0));
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
  }
  function disc(P, x, y, r, color, a, hot) {
    var c = P.c, g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.05, x, y, r);
    g.addColorStop(0, rgba(hot || mix(color, '#FFFFFF', 0.7), a)); g.addColorStop(0.55, rgba(color, a)); g.addColorStop(1, rgba(color, a * 0.85));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  }
  function cr1(a, b, c, d, t) { return 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t); }
  function spline(pts, n) {
    var out = [], m = pts.length - 1;
    for (var i = 0; i <= n; i++) {
      var t = i / n * m, j = Math.min(m - 1, Math.floor(t)), u = t - j, p0 = pts[Math.max(0, j - 1)], p1 = pts[j], p2 = pts[j + 1], p3 = pts[Math.min(m, j + 2)];
      out.push([cr1(p0[0], p1[0], p2[0], p3[0], u), cr1(p0[1], p1[1], p2[1], p3[1], u)]);
    }
    return out;
  }
  function plen(pts) { var L = 0; for (var i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
  // a brush stroke along a curve: a filled body with bristle streaks that thin out and break up, like dry paint
  function gesture(P, pts, w, color, a, o) {
    o = o || {}; var c = P.c, R = P.R, n = o.n || Math.round(cl(plen(pts) / 7, 22, 64)), sp = spline(pts, n), nb = o.bristles || 8, c2 = o.c2 || color, taper = o.taper || 'both', i, j;
    function env(t) {
      var e = taper === 'none' ? 1 : taper === 'end' ? Math.min(1, (1 - t) / 0.45) : taper === 'start' ? Math.min(1, t / 0.35) : Math.min(1, t / 0.16, (1 - t) / 0.4);
      return Math.max(0.04, e) * (o.swell ? 1 + 0.25 * Math.sin(t * Math.PI) : 1);
    }
    var nx = [], ny = [];
    for (i = 0; i <= n; i++) { var pa = sp[Math.max(0, i - 1)], pb = sp[Math.min(n, i + 1)], dx = pb[0] - pa[0], dy = pb[1] - pa[1], d = Math.hypot(dx, dy) || 1; nx.push(-dy / d); ny.push(dx / d); }
    c.save(); c.lineCap = o.round ? 'round' : 'butt'; c.lineJoin = 'round';
    c.beginPath();
    for (i = 0; i <= n; i++) { var e = env(i / n) * w / 2; c[i ? 'lineTo' : 'moveTo'](sp[i][0] + nx[i] * e, sp[i][1] + ny[i] * e); }
    for (i = n; i >= 0; i--) { var e2 = env(i / n) * w / 2; c.lineTo(sp[i][0] - nx[i] * e2, sp[i][1] - ny[i] * e2); }
    c.closePath();
    var g = c.createLinearGradient(sp[0][0], sp[0][1], sp[n][0], sp[n][1]); g.addColorStop(0, rgba(color, a * 0.62)); g.addColorStop(1, rgba(c2, a * 0.62)); c.fillStyle = g; c.fill();
    for (j = 0; j < nb; j++) {
      var f = (j + 0.5) / nb - 0.5, wob = (R() - 0.5) * w * 0.05, up = false, run = 0;
      c.strokeStyle = rgba(mix(color, c2, R()), a * (0.3 + R() * 0.55)); c.lineWidth = Math.max(0.8, w / nb * (1.1 + R() * 1.5));
      c.beginPath(); var pen = false;
      for (i = 0; i <= n; i++) {
        var t = i / n, ee = env(t);
        if (o.dry && !up && R() < o.dry * 0.07 * (0.3 + t)) { up = true; run = 2 + Math.floor(R() * 5); }
        if (up && --run <= 0) up = false;
        var x = sp[i][0] + nx[i] * (f * w * ee + wob), y = sp[i][1] + ny[i] * (f * w * ee + wob);
        if (up) { pen = false; continue; }
        if (!pen) { c.moveTo(x, y); pen = true; } else c.lineTo(x, y);
      }
      c.stroke();
    }
    c.restore();
  }
  function drip(P, x, y0, len, w, color, a) {
    var c = P.c, br = w * 0.78, bend = (P.R() - 0.5) * 8, g = c.createLinearGradient(x, y0, x, y0 + len), ye = y0 + len - br;
    g.addColorStop(0, rgba(color, a * 0.75)); g.addColorStop(1, rgba(mix(color, '#FFFFFF', 0.2), a));
    c.save(); c.fillStyle = g; c.beginPath(); c.moveTo(x - w * 0.5, y0); c.lineTo(x - w * 0.5, y0 + 2);
    c.bezierCurveTo(x - w * 0.5, ye * 0.6 + y0 * 0.4, x + bend - br * 0.55, ye - br * 1.2, x + bend - br * 0.55, ye - br * 0.2); c.arc(x + bend, ye, br * 0.8, Math.PI * 1.1, Math.PI * -0.1, true);
    c.bezierCurveTo(x + bend + br * 0.55, ye - br * 1.2, x + w * 0.5, ye * 0.6 + y0 * 0.4, x + w * 0.5, y0); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,' + a * 0.3 + ')'; c.beginPath(); c.ellipse(x - br * 0.25 + bend, ye - br * 0.1, br * 0.16, br * 0.34, 0, 0, TAU); c.fill();
    if (P.R() < 0.55) { c.fillStyle = rgba(color, a); c.beginPath(); c.arc(x + bend + (P.R() - 0.5) * 16, y0 + len + br * (0.9 + P.R()), 1.5 + P.R() * 2.5, 0, TAU); c.fill(); }
    c.restore();
  }
  function splatter(P, cx, cy, r, n, color, a, dir) {
    var c = P.c, R = P.R; c.save();
    for (var i = 0; i < n; i++) {
      var ang = dir == null ? R() * TAU : dir + (R() - 0.5) * 1.6, d = r * Math.pow(R(), 1.6), sz = 0.8 + Math.pow(R(), 3.2) * r * 0.1;
      var x = cx + Math.cos(ang) * d, y = cy + Math.sin(ang) * d;
      c.fillStyle = rgba(R() < 0.25 ? mix(color, '#FFFFFF', 0.4) : color, a * (0.5 + R() * 0.5));
      c.beginPath(); if (sz > 2.4 && R() < 0.5) c.ellipse(x, y, sz * 2.3, sz * 0.8, ang, 0, TAU); else c.arc(x, y, sz, 0, TAU); c.fill();
    }
    c.restore();
  }
  function shard(P, cx, cy, size, ang, c1, c2, a, o) {
    o = o || {}; var c = P.c, R = P.R, n = o.sides || (3 + Math.floor(R() * 3)), pts = [], base = R() * TAU;
    for (var i = 0; i < n; i++) { var aa = base + i / n * TAU + (R() - 0.5) * 0.7, rr = size * (0.45 + R() * 0.65); pts.push([cx + Math.cos(aa + ang) * rr * (o.stretch || 1), cy + Math.sin(aa + ang) * rr]); }
    c.save(); var g = c.createLinearGradient(cx - size, cy - size, cx + size, cy + size); g.addColorStop(0, rgba(c1, a)); g.addColorStop(1, rgba(c2, a));
    c.fillStyle = g; c.beginPath(); pts.forEach(function (p, i) { c[i ? 'lineTo' : 'moveTo'](p[0], p[1]); }); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,' + (0.45 * a) + ')'; c.lineWidth = 1.1; c.stroke(); c.restore();
  }
  function petal(P, x, y, len, wid, ang, color, a) {
    var c = P.c; c.save(); c.translate(x, y); c.rotate(ang); c.fillStyle = rgba(color, a);
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.45, -wid, len, 0); c.quadraticCurveTo(len * 0.45, wid, 0, 0); c.fill(); c.restore();
  }
  // a patch of gold leaf: crinkled foil with ragged edges
  function goldLeaf(P, x, y, w, h, rot, tint) {
    var c = P.c, R = P.R, pts = [], n = 9, gold = tint || '#E8B330';
    for (var i = 0; i < n; i++) { var a = i / n * TAU, rr = 0.55 + R() * 0.45; pts.push([Math.cos(a) * w / 2 * rr, Math.sin(a) * h / 2 * rr]); }
    c.save(); c.translate(x, y); c.rotate(rot);
    var g = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    g.addColorStop(0, mix(gold, '#FFF6C8', 0.75)); g.addColorStop(0.3, gold); g.addColorStop(0.55, mix(gold, '#7A4A00', 0.45)); g.addColorStop(0.78, mix(gold, '#FFF2B0', 0.6)); g.addColorStop(1, mix(gold, '#8A5200', 0.3));
    c.fillStyle = g; c.beginPath(); pts.forEach(function (p, i) { c[i ? 'lineTo' : 'moveTo'](p[0], p[1]); }); c.closePath(); c.fill();
    c.save(); c.clip();
    for (var k = 0; k < 7; k++) { c.fillStyle = R() < 0.5 ? 'rgba(255,248,210,0.35)' : 'rgba(120,70,0,0.22)'; c.beginPath(); c.moveTo((R() - 0.5) * w, (R() - 0.5) * h); c.lineTo((R() - 0.5) * w, (R() - 0.5) * h); c.lineTo((R() - 0.5) * w, (R() - 0.5) * h); c.closePath(); c.fill(); }
    c.restore();
    c.strokeStyle = 'rgba(255,244,190,0.7)'; c.lineWidth = 0.9; c.stroke(); c.restore();
  }
  function hairCurve(P, x0, y0, x1, y1, bend, color, a, w) {
    var c = P.c, R = P.R, mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1;
    c.strokeStyle = rgba(color, a); c.lineWidth = w || 1; c.beginPath(); c.moveTo(x0, y0);
    c.bezierCurveTo(mx - dy / d * bend + (R() - 0.5) * 30, my + dx / d * bend, mx + dy / d * bend * 0.6, my - dx / d * bend * 0.6 + (R() - 0.5) * 30, x1, y1); c.stroke();
  }
  function dotted(P, x0, y0, x1, y1, n, r0, r1, color, a, sway) {
    var c = P.c;
    for (var i = 0; i < n; i++) { var k = n === 1 ? 1 : i / (n - 1), x = x0 + (x1 - x0) * k + Math.sin(k * 3.2) * (sway || 0), y = y0 + (y1 - y0) * k + Math.cos(k * 2.4) * (sway || 0) * 0.5; c.fillStyle = rgba(color, a * (0.45 + k * 0.55)); c.beginPath(); c.arc(x, y, r0 + (r1 - r0) * k, 0, TAU); c.fill(); }
  }
  // a thin keyline under fine marks so they read on any ground
  function halo(P, a) { return rgba(P.dark ? '#FFFFFF' : '#1A0E3D', a); }

  /* ------------------------------------------------------------------ the feelings: one kind of painting for each */
  var MOTIF = {};

  // wide horizontal washes with slow curves and a soft light (calm, hopeful, and worn out when they sag)
  MOTIF.wash = function (P, f, F, k) {
    var c = P.c, R = P.R, pal = f.pal, tired = f.id === 'tired', n = 5, m = P.m, i;
    for (i = 0; i < n; i++) {
      var y = S * (0.1 + 0.8 * (i + 0.5) / n) + (R() - 0.5) * 36, ry = S * (tired ? 0.088 : 0.078) * (0.8 + R() * 0.7) * (0.65 + 0.45 * k);
      stain(P, S * (0.5 + (R() - 0.5) * 0.1), y, S * (0.62 + R() * 0.2), ry, tired ? 0.04 + 0.03 * i : (R() - 0.5) * 0.07, pal.c[i % pal.c.length], pal.c[(i + 1) % pal.c.length], (tired ? 0.66 : 0.7) * (0.75 + 0.25 * m.amp), { wob: 0.07 });
    }
    for (i = 0; i < 3; i++) {
      var y0 = S * (0.2 + R() * 0.6), y1 = y0 + (R() - 0.5) * 90;
      gesture(P, [[-30, y0], [S * 0.28, y0 + (R() - 0.5) * 40], [S * 0.64, y1 + (R() - 0.5) * 40], [S + 30, y1]], 10 + R() * 22 + (tired ? 6 : 0), i % 2 ? '#FFFFFF' : pal.a, 0.42, { dry: 0.25, bristles: 7 });
    }
    if (tired) for (i = 0; i < 6; i++) drip(P, S * (0.08 + R() * 0.84), S * (0.3 + R() * 0.5), 40 + R() * 120, 6 + R() * 10, pal.c[i % pal.c.length], 0.5);
    else for (i = 0; i < 7; i++) { var bx = R() * S, by = R() * S * 0.8, br = 6 + R() * 22; disc(P, bx, by, br, pal.c[i % pal.c.length], 0.35); }
    glow(P, F.x, F.y, 190 * k * m.amp, pal.a, 0.8);
    disc(P, F.x, F.y, 34 * k * (0.7 + 0.3 * m.amp), mix(pal.a, '#FFFFFF', 0.35), 0.95);
  };

  // tall verticals and slow drips on deep jewel tones, with one warm light low in the picture
  MOTIF.drip = function (P, f, F, k) {
    var c = P.c, R = P.R, pal = f.pal, m = P.m, n = Math.round(5 + 3 * k), i;
    for (i = 0; i < n; i++) {
      var x = S * (0.06 + 0.88 * (i + R() * 0.7) / n), w = 36 + R() * 80, len = S * (0.35 + R() * 0.55) * (0.7 + 0.5 * m.weight);
      stain(P, x, len / 2 - 20, w / 2, len / 2 + 10, 0, pal.c[i % pal.c.length], pal.c[(i + 2) % pal.c.length], 0.62, { wob: 0.05 });
    }
    for (i = 0; i < 11; i++) drip(P, S * (0.04 + R() * 0.92), -4, S * (0.15 + R() * 0.62 * (0.7 + 0.5 * m.weight)), 7 + R() * 20, pal.c[(i * 2 + 1) % pal.c.length], 0.9);
    c.save(); c.strokeStyle = 'rgba(255,255,255,0.28)'; c.lineWidth = 1;
    for (i = 0; i < 10; i++) { var lx = R() * S; c.beginPath(); c.moveTo(lx, 0); c.lineTo(lx + (R() - 0.5) * 14, S * (0.2 + R() * 0.6)); c.stroke(); } c.restore();
    for (i = 0; i < 3; i++) { var gx = S * (0.1 + R() * 0.8); gesture(P, [[gx, -20], [gx + (R() - 0.5) * 50, S * 0.4], [gx + (R() - 0.5) * 70, S * (0.7 + R() * 0.3)]], 18 + R() * 24, pal.c[(i + 3) % pal.c.length], 0.5, { taper: 'end', dry: 0.5 }); }
    glow(P, F.x, F.y, 220 * k * m.amp, pal.a, 0.85, 'screen');
    disc(P, F.x, F.y, 30 * k * (0.75 + 0.3 * m.amp), pal.a, 0.98, '#FFF6D0');
    for (i = 0; i < 9; i++) { var a = R() * TAU, d = 50 + R() * 120; c.fillStyle = rgba(pal.a, 0.35 + R() * 0.5); c.beginPath(); c.arc(F.x + Math.cos(a) * d * 0.6, F.y - R() * d, 1.2 + R() * 2.2, 0, TAU); c.fill(); }
  };

  // bold diagonal slashes, hot reds and oranges against cobalt
  MOTIF.slash = function (P, f, F, k) {
    var c = P.c, R = P.R, pal = f.pal, m = P.m, n = Math.round((3.4 + 3 * m.turb) * (0.6 + 0.45 * k)), base = -0.72 + (R() - 0.5) * 0.25, i;
    for (i = 0; i < n; i++) {
      var cx = S * (0.1 + R() * 0.8), cy = S * (0.1 + R() * 0.8), len = 360 + R() * 460, ang = base + (R() - 0.5) * 0.34, dx = Math.cos(ang), dy = Math.sin(ang), w = (80 + R() * 130) * (0.6 + 0.45 * k);
      var cobalt = i % 4 === 3, col = cobalt ? pal.c[4] : pal.c[i % 4], col2 = cobalt ? mix(pal.c[4], '#FFFFFF', 0.4) : pal.c[(i + 1) % 4];
      gesture(P, [[cx - dx * len / 2, cy - dy * len / 2], [cx, cy + (R() - 0.5) * 14], [cx + dx * len / 2, cy + dy * len / 2]], w, col, 0.88, { taper: 'end', dry: 0.7, bristles: 12, c2: col2, n: 34, round: true });
      if (i % 3 === 0) gesture(P, [[cx - dx * len * 0.3, cy - dy * len * 0.3], [cx + dx * len * 0.35, cy + dy * len * 0.35]], 5 + R() * 9, pal.a, 0.8, { taper: 'end', dry: 0.3, bristles: 4 });
    }
    gesture(P, [[F.x - 160 * k, F.y + 120 * k], [F.x, F.y], [F.x + 190 * k, F.y - 140 * k]], 12, pal.a, 0.9, { taper: 'both', dry: 0.15, bristles: 5 });
    for (i = 0; i < 4; i++) splatter(P, S * (0.15 + R() * 0.7), S * (0.15 + R() * 0.7), 70 + R() * 50, 26, pal.c[i % 3], 0.9, base + 0.2);
    glow(P, F.x, F.y, 120 * k, pal.a, 0.5);
  };

  // dense crossing lines and sharp fragments clustered at the center of attention, electric color
  MOTIF.shatter = function (P, f, F, k) {
    var c = P.c, R = P.R, pal = f.pal, m = P.m, over = f.id === 'over', i, n;
    if (over) {
      for (i = 0; i < 9; i++) {
        var rx = 90 + R() * 200, ry = 60 + R() * 150, x = F.x + (R() - 0.5) * 340 * k, y = F.y + (R() - 0.5) * 340 * k;
        if (i % 2) stain(P, x, y, rx, ry, R() * 3, pal.c[i % pal.c.length], pal.c[(i + 1) % pal.c.length], 0.4, { wob: 0.18 });
        else { c.save(); c.translate(x, y); c.rotate(R() * 3); c.fillStyle = rgba(pal.c[i % pal.c.length], 0.38); c.fillRect(-rx * 0.8, -ry * 0.8, rx * 1.6, ry * 1.6); c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 1.2; c.strokeRect(-rx * 0.8, -ry * 0.8, rx * 1.6, ry * 1.6); c.restore(); }
      }
      for (var s = 0; s < 3; s++) {
        var rcx = F.x + (R() - 0.5) * 220 * k, rcy = F.y + (R() - 0.5) * 220 * k; c.strokeStyle = rgba(s % 2 ? '#FFFFFF' : pal.a, 0.5); c.lineWidth = 1.1;
        for (i = 0; i < 12; i++) { c.beginPath(); c.arc(rcx, rcy, 20 + i * 11 * k, 0, TAU); c.stroke(); }
      }
    }
    n = Math.round((over ? 12 : 18) * (0.5 + 0.7 * k));
    for (i = 0; i < n; i++) { var a = R() * TAU, d = Math.pow(R(), 0.8) * 190 * k * (0.8 + 0.4 * m.amp); shard(P, F.x + Math.cos(a) * d, F.y + Math.sin(a) * d, 28 + R() * 70, Math.round(R() * 3) * 0.52 + R() * 0.2, pal.c[i % pal.c.length], pal.c[(i + 2) % pal.c.length], 0.8); }
    n = Math.round((over ? 26 : 56) * (0.45 + 0.7 * k) * (0.6 + 0.6 * m.turb));
    c.save(); c.lineCap = 'round';
    for (i = 0; i < n; i++) {
      var a0 = R() * TAU, d0 = R() * 140 * k, x0 = F.x + Math.cos(a0) * d0, y0 = F.y + Math.sin(a0) * d0, ang = Math.round(R() * 5) * 0.63 + R() * 0.12, L = 140 + R() * 480;
      c.strokeStyle = rgba(i % 7 === 0 ? pal.a : pal.c[i % pal.c.length], 0.5 + R() * 0.45); c.lineWidth = 0.8 + R() * 2.2;
      c.beginPath(); c.moveTo(x0 - Math.cos(ang) * L / 2, y0 - Math.sin(ang) * L / 2); c.lineTo(x0 + Math.cos(ang) * L / 2, y0 + Math.sin(ang) * L / 2); c.stroke();
    }
    c.restore();
    for (i = 0; i < 3; i++) gesture(P, [[F.x - 200 + R() * 60, F.y + (R() - 0.5) * 240], [F.x, F.y + (R() - 0.5) * 80], [F.x + 200 - R() * 60, F.y + (R() - 0.5) * 240]], 8 + R() * 14, pal.c[i], 0.85, { taper: 'both', dry: 0.35, bristles: 6 });
    splatter(P, F.x, F.y, 150 * k, 50, pal.a, 0.9);
    glow(P, F.x, F.y, 80 * k, '#FFFFFF', 0.4, 'screen');
  };

  // large quiet fields of color with soft edges and one bright thread
  MOTIF.field = function (P, f, F, k) {
    var c = P.c, R = P.R, pal = f.pal, i;
    function field(x, y, w, h, color, a) {
      c.save(); for (var j = 0; j < 7; j++) { var e = (6 - j) * 3.6; c.fillStyle = rgba(color, a * (0.1 + j * 0.13)); c.beginPath(); if (c.roundRect) c.roundRect(x - e, y - e, w + e * 2, h + e * 2, 10 + e); else c.rect(x - e, y - e, w + e * 2, h + e * 2); c.fill(); }
      var g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(0.2, 'rgba(255,255,255,0)'); g.addColorStop(0.85, 'rgba(60,40,120,0)'); g.addColorStop(1, 'rgba(60,40,120,0.14)'); c.fillStyle = g; c.fillRect(x, y, w, h);
      c.restore();
    }
    var t1 = S * (0.1 + R() * 0.06), h1 = S * (0.36 + R() * 0.08), t2 = t1 + h1 + S * (0.05 + R() * 0.03), h2 = S * (0.26 + R() * 0.06);
    field(S * 0.1, t1, S * 0.8, h1, pal.c[0], 0.95);
    field(S * (0.1 + R() * 0.04), t2, S * (0.76 + R() * 0.04), h2, pal.c[1], 0.95);
    c.save(); c.globalAlpha = 0.14;
    for (i = 0; i < 40; i++) { var yy = t1 + R() * (h1 + h2 + 40); c.fillStyle = R() < 0.5 ? '#FFFFFF' : pal.c[3]; c.fillRect(S * 0.1 + R() * 40, yy, S * 0.4 + R() * S * 0.4, 1 + R() * 2); }
    c.restore();
    var ty = t1 + h1 + (t2 - t1 - h1) / 2;
    gesture(P, [[-20, ty + 40], [S * 0.3, ty - 6], [F.x, F.y > S / 2 ? ty + 18 : ty - 22], [S * 0.8, ty + 4], [S + 20, ty - 30]], 4.5, pal.a, 0.98, { taper: 'both', bristles: 3, dry: 0.05 });
    glow(P, F.x, ty, 70, pal.a, 0.5);
    disc(P, F.x, ty + (F.y > S / 2 ? 18 : -22), 7 * k + 3, pal.a, 1);
  };

  // lots of open space and one small light far away
  MOTIF.void = function (P, f, F, k) {
    var c = P.c, R = P.R, pal = f.pal, m = P.m, i, far = { x: F.x < S / 2 ? S * 0.86 : S * 0.14, y: F.y < S / 2 ? S * 0.2 : S * 0.82 };
    stain(P, S / 2, S * 0.88, S * 0.7, S * 0.2, -0.03, pal.c[0], pal.c[1], 0.7, { wob: 0.05 });
    stain(P, S * 0.5, S * 0.74, S * 0.62, S * 0.07, 0.02, pal.c[2], pal.c[1], 0.45, { wob: 0.05 });
    c.save(); c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, S * 0.7); c.lineTo(S, S * 0.7 + (R() - 0.5) * 6); c.stroke(); c.restore();
    for (i = 0; i < 24; i++) { c.fillStyle = 'rgba(255,255,255,' + (0.1 + R() * 0.3) + ')'; c.beginPath(); c.arc(R() * S, R() * S * 0.62, 0.7 + R() * 1.3, 0, TAU); c.fill(); }
    glow(P, F.x, F.y, 230 * k, pal.c[2], 0.5);
    disc(P, F.x, F.y, 22 * k * (0.8 + 0.3 * m.amp), mix(pal.a, '#FFFFFF', 0.2), 0.98);
    glow(P, F.x, F.y, 90 * k, pal.a, 0.85);
    dotted(P, F.x, F.y, far.x, far.y, 9, 1.4, 3.2, '#FFFFFF', 0.55, 12);
    disc(P, far.x, far.y, 7 * k + 2, '#FFFFFF', 0.9, '#FFFFFF'); glow(P, far.x, far.y, 46, '#FFFFFF', 0.55);
    f.farPt = far;
  };

  // a field of color split by a thin gold crack
  MOTIF.fracture = function (P, f, F, k) {
    var c = P.c, pal = f.pal, m = P.m, seed = Math.floor(P.R() * 1e9), ang = -0.9 + (P.R() - 0.5) * 0.5, nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2), dx = Math.cos(ang), dy = Math.sin(ang);
    function field() {
      var R = rng(seed), P2 = { c: c, R: R, dark: P.dark, m: m }, i;
      for (i = 0; i < 6; i++) stain(P2, S * (0.12 + R() * 0.76), S * (0.12 + R() * 0.76), 160 + R() * 190, 90 + R() * 150, R() * 3, pal.c[i % pal.c.length], pal.c[(i + 1) % pal.c.length], 0.78, { wob: 0.15 });
      for (i = 0; i < 3; i++) gesture(P2, [[-20, S * (0.2 + R() * 0.6)], [S * 0.4, S * (0.2 + R() * 0.6)], [S + 20, S * (0.2 + R() * 0.6)]], 30 + R() * 40, pal.c[(i + 2) % pal.c.length], 0.5, { taper: 'both', dry: 0.3 });
    }
    var gap = 14 * (0.8 + 0.4 * m.amp), L = 1500;
    function half(sign, off) {
      c.save(); c.beginPath(); c.moveTo(F.x - dx * L, F.y - dy * L); c.lineTo(F.x + dx * L, F.y + dy * L); c.lineTo(F.x + dx * L + nx * sign * L, F.y + dy * L + ny * sign * L); c.lineTo(F.x - dx * L + nx * sign * L, F.y - dy * L + ny * sign * L); c.closePath(); c.clip();
      c.translate(nx * off, ny * off); field(); c.restore();
    }
    c.fillStyle = rgba(mix(pal.g[1], '#000000', 0.2), 1); c.fillRect(0, 0, S, S);
    half(1, gap / 2); half(-1, -gap / 2);
    // the gold seam
    var R = P.R, pts = [], t;
    for (t = -1.1; t <= 1.1; t += 0.11) pts.push([F.x + dx * t * 520 + (R() - 0.5) * 22, F.y + dy * t * 520 + (R() - 0.5) * 22]);
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = 'rgba(255,214,110,0.55)'; c.lineWidth = gap + 8; c.beginPath(); pts.forEach(function (p, i) { c[i ? 'lineTo' : 'moveTo'](p[0], p[1]); }); c.stroke();
    var g = c.createLinearGradient(F.x - 200, F.y - 200, F.x + 200, F.y + 200); g.addColorStop(0, '#FFF1B0'); g.addColorStop(0.4, '#F0B93A'); g.addColorStop(0.7, '#C98A1A'); g.addColorStop(1, '#FFE08A');
    c.strokeStyle = g; c.lineWidth = gap * 0.7; c.beginPath(); pts.forEach(function (p, i) { c[i ? 'lineTo' : 'moveTo'](p[0], p[1]); }); c.stroke();
    c.strokeStyle = 'rgba(255,255,230,0.8)'; c.lineWidth = 1.2; c.stroke();
    for (var b = 0; b < 4; b++) { var bp = pts[3 + Math.floor(R() * (pts.length - 6))], ba = ang + (R() < 0.5 ? 1 : -1) * (0.5 + R() * 0.6), bl = 60 + R() * 120; c.strokeStyle = '#F6CF6B'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(bp[0], bp[1]); c.lineTo(bp[0] + Math.cos(ba) * bl * 0.5 + (R() - 0.5) * 14, bp[1] + Math.sin(ba) * bl * 0.5); c.lineTo(bp[0] + Math.cos(ba) * bl, bp[1] + Math.sin(ba) * bl + (R() - 0.5) * 14); c.stroke(); }
    c.restore();
    glow(P, F.x, F.y, 170 * k, '#FFD76A', 0.6, 'screen');
    for (var i = 0; i < 5; i++) goldLeaf(P, F.x + (R() - 0.5) * 200, F.y + (R() - 0.5) * 200, 8 + R() * 16, 6 + R() * 12, R() * 3);
  };

  // dense shapes pressing in and darkening toward the middle, with one ember underneath
  MOTIF.weight = function (P, f, F, k) {
    var c = P.c, R = P.R, pal = f.pal, m = P.m, i, cx = S * 0.5 + (F.x - S / 2) * 0.4, cy = S * 0.58;
    for (i = 0; i < 5; i++) stain(P, cx + (R() - 0.5) * 180, cy + (R() - 0.5) * 150, 190 + R() * 130, 110 + R() * 90, (R() - 0.5) * 0.5, pal.c[i % pal.c.length], pal.c[(i + 1) % pal.c.length], 0.78, { wob: 0.14 });
    for (i = 0; i < 6; i++) {
      var s = 1 - i * 0.14, col = mix(pal.c[i % 2], '#12021E', 0.15 + i * 0.12);
      stain(P, cx + (R() - 0.5) * 24, cy + 20 + (R() - 0.5) * 24, 210 * s * (0.8 + 0.3 * k), 140 * s * (0.8 + 0.3 * k), (R() - 0.5) * 0.3, col, col, 0.55, { wob: 0.1, lit: false, rimW: 3 });
    }
    for (i = 0; i < 4; i++) gesture(P, [[S * 0.1, S * (0.18 + i * 0.07)], [S * 0.5, S * (0.2 + i * 0.07) + 10], [S * 0.9, S * (0.17 + i * 0.07)]], 26 + R() * 20, pal.c[(i + 2) % pal.c.length], 0.6, { taper: 'both', dry: 0.3 });
    c.save(); c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 1;
    for (i = 0; i < 26; i++) { var x = S * 0.1 + R() * S * 0.8; c.beginPath(); c.moveTo(x, S * (0.04 + R() * 0.16)); c.lineTo(x + (R() - 0.5) * 20, S * (0.3 + R() * 0.15)); c.stroke(); }
    c.restore();
    glow(P, cx, cy + 20, 150 * k * m.amp, pal.a, 0.9, 'screen');
    disc(P, cx, cy + 20, 16 * k + 4, pal.a, 1, '#FFF3C0');
    F.x = cx; F.y = cy + 20;
  };

  // rings and confetti-like petals flying out from a bright center (joy), or scattered sparks (restlessness)
  MOTIF.burst = function (P, f, F, k) {
    var c = P.c, R = P.R, pal = f.pal, m = P.m, joy = f.variant === 'joy', i, n;
    if (joy) {
      for (i = 0; i < 6; i++) disc(P, S * (0.08 + R() * 0.84), S * (0.08 + R() * 0.84), 40 + R() * 90, pal.c[i % pal.c.length], 0.22);
      for (i = 0; i < 9; i++) { c.strokeStyle = rgba(pal.c[i % pal.c.length], 0.6); c.lineWidth = 1.2 + (i % 3); c.beginPath(); c.arc(F.x, F.y, 30 + i * 26 * k * (0.8 + 0.3 * m.amp), 0, TAU); c.stroke(); }
      n = Math.round(70 * (0.5 + 0.6 * k) * (0.7 + 0.5 * m.amp));
      for (i = 0; i < n; i++) {
        var a = i / n * TAU + (R() - 0.5) * 0.25, d = 50 + Math.pow(R(), 0.75) * 330 * k * (0.75 + 0.35 * m.amp), x = F.x + Math.cos(a) * d, y = F.y + Math.sin(a) * d, sz = 7 + d * 0.06 + R() * 14, col = pal.c[Math.floor(R() * pal.c.length)], kind = Math.floor(R() * 4);
        if (kind === 0) petal(P, x, y, sz * 2.2, sz * 0.7, a, col, 0.9);
        else if (kind === 1) { c.fillStyle = rgba(col, 0.92); c.beginPath(); c.arc(x, y, sz * 0.55, 0, TAU); c.fill(); }
        else if (kind === 2) { c.save(); c.translate(x, y); c.rotate(a + R()); c.fillStyle = rgba(col, 0.9); c.fillRect(-sz * 0.2, -sz * 0.7, sz * 0.4, sz * 1.4); c.restore(); }
        else { c.strokeStyle = rgba(col, 0.9); c.lineWidth = 3 + R() * 3; c.lineCap = 'round'; c.beginPath(); c.arc(x, y, sz * 0.6, a, a + 2.4); c.stroke(); }
      }
      glow(P, F.x, F.y, 150 * k * m.amp, '#FFFFFF', 0.95, 'source-over');
      disc(P, F.x, F.y, 30 * k + 8, pal.c[0], 1, '#FFFFFF');
    } else {
      n = Math.round(60 * (0.5 + 0.6 * k));
      c.save(); c.lineCap = 'round';
      for (i = 0; i < n; i++) {
        var x2 = R() * S, y2 = R() * S, a2 = (R() < 0.6 ? -0.9 : 0.5) + (R() - 0.5) * 1.1, L = 14 + R() * 60;
        c.strokeStyle = rgba(pal.c[i % pal.c.length], 0.85); c.lineWidth = 2 + R() * 5; c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 + Math.cos(a2) * L, y2 + Math.sin(a2) * L); c.stroke();
        if (i % 3 === 0) { c.fillStyle = rgba(pal.a, 0.9); c.beginPath(); c.arc(x2 + Math.cos(a2) * (L + 14), y2 + Math.sin(a2) * (L + 14), 2 + R() * 3, 0, TAU); c.fill(); }
      }
      c.restore();
      c.save(); c.lineJoin = 'miter'; c.lineCap = 'butt'; c.miterLimit = 4; for (i = 0; i < 5; i++) { var zx = S * (0.1 + R() * 0.6), zy = S * (0.1 + R() * 0.8), za = (R() - 0.5) * 0.9; c.strokeStyle = rgba(pal.c[(i + 2) % pal.c.length], 0.92); c.lineWidth = 4 + R() * 5; c.beginPath(); c.moveTo(zx, zy); for (var z = 1; z < 9; z++) c.lineTo(zx + z * (20 + R() * 16) * Math.cos(za) + (z % 2 ? 1 : -1) * 18 * Math.sin(za), zy + z * 24 * Math.sin(za) + (z % 2 ? -1 : 1) * (14 + R() * 18)); c.stroke(); } c.restore();
      glow(P, F.x, F.y, 160 * k, pal.a, 0.9); disc(P, F.x, F.y, 20 * k + 6, pal.a, 1, '#FFFFFF');
    }
  };

  // soft overlapping veils with a dotted edge, for a feeling with no name yet
  MOTIF.mist = function (P, f, F, k) {
    var c = P.c, R = P.R, pal = f.pal, i;
    for (i = 0; i < 8; i++) {
      var x = F.x + (R() - 0.5) * 430, y = F.y + (R() - 0.5) * 430, rx = 110 + R() * 190, ry = 80 + R() * 140, rot = R() * 3;
      stain(P, x, y, rx, ry, rot, pal.c[i % pal.c.length], pal.c[(i + 1) % pal.c.length], 0.52, { wob: 0.16 });
      if (i % 3 === 0) { organic(c, x, y, rx, ry, rot, 0.16, [R() * 6, R() * 6, R() * 6]); c.setLineDash([2, 8]); c.lineWidth = 2; c.strokeStyle = halo(P, 0.55); c.stroke(); c.setLineDash([]); }
    }
    for (i = 0; i < 6; i++) hairCurve(P, R() * S, R() * S, R() * S, R() * S, 80, '#FFFFFF', 0.55, 1.1);
    glow(P, F.x, F.y, 200 * k, '#FFFFFF', 0.8, 'source-over');
    glow(P, F.x, F.y, 90 * k, pal.a, 0.8, 'source-over');
  };

  /* ------------------------------------------------------------------ the parts: one kind of mark for each thing you told me */
  var PART = {};
  function fit(v, a, b) { return cl(v, a, b); }

  PART.threads = function (P, e, X) {
    var c = P.c, R = P.R, n = e.count || 1, col = vivid(e.color), K = { x: X.F.x + 40, y: X.F.y - 30 }, first = null, i;
    c.save(); c.lineCap = 'round';
    for (i = 0; i < n; i++) {
      var a0 = R() * TAU, a1 = a0 + Math.PI + (R() - 0.5) * 1.5, sx = S / 2 + Math.cos(a0) * S * 0.72, sy = S / 2 + Math.sin(a0) * S * 0.72, tx = S / 2 + Math.cos(a1) * S * 0.72, ty = S / 2 + Math.sin(a1) * S * 0.72, c1x, c1y, c2x, c2y;
      if (e.knot) { c1x = K.x + (R() - 0.5) * 60; c1y = K.y + (R() - 0.5) * 60; c2x = K.x + (R() - 0.5) * 60; c2y = K.y + (R() - 0.5) * 60; }
      else { c1x = X.F.x + (R() - 0.5) * 380; c1y = X.F.y + (R() - 0.5) * 380; c2x = X.F.x + (R() - 0.5) * 380; c2y = X.F.y + (R() - 0.5) * 380; }
      var lw = 1.1 + R() * 1.4;
      c.strokeStyle = halo(P, 0.28); c.lineWidth = lw + 2.2; c.beginPath(); c.moveTo(sx, sy); c.bezierCurveTo(c1x, c1y, c2x, c2y, tx, ty); c.stroke();
      c.strokeStyle = rgba(col, 0.9); c.lineWidth = lw; c.stroke();
      if (!first) first = { x: fit(c1x, 24, S - 24), y: fit(c1y, 24, S - 24) };
    }
    if (e.knot) { c.strokeStyle = rgba(col, 0.95); c.lineWidth = 1.6; for (i = 0; i < 6; i++) { c.beginPath(); c.ellipse(K.x + (R() - 0.5) * 12, K.y + (R() - 0.5) * 12, 7 + R() * 14, 5 + R() * 9, R() * 3, 0, TAU); c.stroke(); } first = { x: K.x + 22, y: K.y - 22 }; }
    c.restore(); return first;
  };

  PART.stones = function (P, list, X) {
    var c = P.c, R = P.R, out = {}, sorted = list.slice().sort(function (a, b) { return b.weight - a.weight; }), items = sorted.map(function (e) { return { e: e, r: 62 + e.weight * 15 }; });
    var total = items.reduce(function (t, x) { return t + x.r * 1.45; }, 0), sc = total > S * 1.02 ? S * 1.02 / total : 1, x0 = (S - Math.min(total, S * 1.02)) / 2;
    var order = []; items.forEach(function (x, i) { (i % 2 ? order.push(x) : order.unshift(x)); });
    order.forEach(function (it, idx) {
      var r = it.r * sc, cx = x0 + r * 0.72, cy = S - r * 0.34 + (idx % 2 ? -r * 0.1 : r * 0.05), col = vivid(it.e.color), ph = [R() * TAU, R() * TAU, R() * TAU], rot = (R() - 0.5) * 0.2;
      x0 += r * 1.45;
      // a lighter twin behind the shape, so the shapes lock together like pieces of a puzzle
      organic(c, cx + r * 0.3, cy - r * 0.22, r * 0.95, r * 0.8, 0.35, 0.12, ph); c.fillStyle = rgba(mix(col, '#FFFFFF', 0.3), 0.62); c.fill();
      organic(c, cx, cy, r * 1.08, r * 0.86, rot, 0.1, ph);
      var g = c.createLinearGradient(cx - r * 0.5, cy - r, cx + r * 0.4, cy + r * 0.8); g.addColorStop(0, mix(col, '#FFFFFF', 0.3)); g.addColorStop(0.4, col); g.addColorStop(1, mix(col, '#12002C', 0.55));
      c.fillStyle = g; c.fill();
      c.save(); c.clip();
      for (var q = 0; q < 16; q++) { var yy = cy - r * 0.8 + q * r * 0.11; c.strokeStyle = q % 2 ? 'rgba(255,255,255,0.16)' : 'rgba(20,0,50,0.16)'; c.lineWidth = 1 + R() * 3.5; c.beginPath(); c.moveTo(cx - r * 1.2, yy + R() * 8); c.quadraticCurveTo(cx, yy - 14 + R() * 20, cx + r * 1.2, yy + R() * 8); c.stroke(); }
      c.restore();
      organic(c, cx, cy, r * 1.08, r * 0.86, rot, 0.1, ph); c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,0.45)'; c.stroke();
      out[it.e.id] = { x: cx, y: cy - r * 0.45, r: r };
    });
    return out;
  };

  PART.person = function (P, e, X) {
    var c = P.c, R = P.R, col = vivid(e.color), F = X.F, st = e.style, ang, d, x, y;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    if (st === 'jagged' || st === 'broken') {
      ang = st === 'jagged' ? -2.55 : -0.55; d = 215 + X.coreR * 0.3; x = fit(F.x + Math.cos(ang) * d, 40, S - 40); y = fit(F.y + Math.sin(ang) * d, 40, S - 40);
      var dx = x - F.x, dy = y - F.y, L = Math.hypot(dx, dy) || 1, px = -dy / L, py = dx / L;
      if (st === 'jagged') {
        c.beginPath(); c.moveTo(F.x, F.y);
        for (var i = 1; i < 9; i++) { var kk = i / 9, off = (i % 2 ? 16 : -16); c.lineTo(F.x + dx * kk + px * off, F.y + dy * kk + py * off); }
        c.lineTo(x, y); c.strokeStyle = halo(P, 0.3); c.lineWidth = 6; c.stroke(); c.strokeStyle = rgba(col, 0.98); c.lineWidth = 3; c.stroke();
        shard(P, x, y, 26, ang, col, mix(col, '#FFD84A', 0.5), 0.98, { sides: 3 }); glow(P, x, y, 54, col, 0.5);
      } else {
        c.strokeStyle = halo(P, 0.25); c.lineWidth = 6.5; c.beginPath(); c.moveTo(F.x, F.y); c.lineTo(F.x + dx * 0.36, F.y + dy * 0.36); c.moveTo(F.x + dx * 0.62, F.y + dy * 0.62); c.lineTo(x, y); c.stroke();
        c.strokeStyle = rgba(col, 0.95); c.lineWidth = 3.6; c.stroke();
        glow(P, x, y, 62, col, 0.5); disc(P, x, y, 17, col, 0.98);
      }
      c.restore(); return { x: x, y: y - 26 };
    }
    if (st === 'far') {
      x = F.x < S / 2 ? S * 0.88 : S * 0.12; y = F.y < S / 2 ? S * 0.86 : S * 0.14;
      dotted(P, F.x, F.y, x, y, 11, 1.6, 3.4, col, 0.85, 14); glow(P, x, y, 54, col, 0.55); disc(P, x, y, 10, col, 0.98);
      c.restore(); return { x: x, y: y - 22 };
    }
    // warm: two soft golden lights close to the middle
    var ox = F.x + 118, oy = F.y + 76;
    c.strokeStyle = rgba(col, 0.55); c.lineWidth = 6; c.beginPath(); c.moveTo(F.x, F.y); c.lineTo(ox, oy); c.stroke();
    glow(P, ox, oy, 78, col, 0.7, 'source-over'); disc(P, ox, oy, 19, col, 1, '#FFF3C0'); glow(P, ox + 38, oy + 12, 56, mix(col, '#FF6A8A', 0.35), 0.7, 'source-over'); disc(P, ox + 38, oy + 12, 14, mix(col, '#FF6A8A', 0.35), 1, '#FFF3C0');
    c.restore(); return { x: ox + 8, y: oy - 28 };
  };

  PART.wedges = function (P, e) {
    var c = P.c, col = vivid(e.color), W2 = [[0, S * 0.3, S * 0.2, 150, S * 0.36], [S, S * 0.58, S * 0.18, S - 160, S * 0.53], [S * 0.62, S, S * 0.15, 0, S - 150]], first = null;
    W2.forEach(function (w, i) {
      c.save(); var g, p;
      if (i < 2) { g = c.createLinearGradient(w[0], w[1], w[3], w[4]); p = [[w[0], w[1] - w[2] * 0.5], [w[3], w[4]], [w[0], w[1] + w[2] * 0.5]]; }
      else { g = c.createLinearGradient(w[0], w[1], w[0], w[4]); p = [[w[0] - w[2] * 0.5, S], [w[0] - 8, w[4]], [w[0] + w[2] * 0.5, S]]; }
      g.addColorStop(0, rgba(col, 0.92)); g.addColorStop(1, rgba(mix(col, '#FFFFFF', 0.45), 0.3));
      c.fillStyle = g; c.beginPath(); c.moveTo(p[0][0], p[0][1]); c.lineTo(p[1][0], p[1][1]); c.lineTo(p[2][0], p[2][1]); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1.2; c.stroke(); c.restore();
      if (!first) first = { x: p[1][0] - 26, y: p[1][1] - 30 };
    });
    return first;
  };

  PART.ring = function (P, e, X) {
    var c = P.c, col = vivid(e.color), r = X.coreR + 46, fl = cl(e.fill == null ? 0.5 : e.fill, 0.04, 1), cx = cl(X.F.x, r + 22, S - r - 22), cy = cl(X.F.y, r + 22, S - r - 22);
    c.save(); c.lineCap = 'round';
    c.strokeStyle = halo(P, 0.35); c.lineWidth = 1.4; c.setLineDash([2, 8]); c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke(); c.setLineDash([]);
    c.strokeStyle = halo(P, 0.28); c.lineWidth = 15; c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + fl * TAU); c.stroke();
    var g = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r); g.addColorStop(0, mix(col, '#FFFFFF', 0.5)); g.addColorStop(1, col);
    c.strokeStyle = g; c.lineWidth = 10; c.stroke();
    var ea = -Math.PI / 2 + fl * TAU; glow(P, cx + Math.cos(ea) * r, cy + Math.sin(ea) * r, 34, col, 0.7); disc(P, cx + Math.cos(ea) * r, cy + Math.sin(ea) * r, 6, col, 1);
    c.restore(); return { x: cx - 8, y: cy - r - 22 };
  };

  PART.haze = function (P, e, X) {
    var c = P.c, R = P.R, col = mix(vivid(e.color), '#FFFFFF', 0.35), n = Math.min(8, 2 + Math.round((e.count || 1) * 1.5)), first = null;
    for (var i = 0; i < n; i++) {
      var y = S * (0.05 + R() * 0.24), x0 = -30 + R() * S * 0.4, y2 = y + (R() - 0.5) * 80;
      gesture(P, [[x0, y], [x0 + S * 0.4, y2 - 26], [x0 + S * 0.85, y2 + 8]], 14 + R() * 24, col, 0.5, { taper: 'both', dry: 0.15, bristles: 6, c2: '#FFFFFF' });
      if (!first || y < first.y) first = { x: x0 + S * 0.3, y: y2 - 24 };
    }
    return first;
  };

  PART.story = function (P, e, X) {
    var c = P.c, R = P.R, col = vivid(e.color), r = X.coreR + 66, ph = [R() * TAU, R() * TAU, R() * TAU], cx = cl(X.F.x, r + 10, S - r - 10), cy = cl(X.F.y, r + 10, S - r - 10);
    c.save(); c.setLineDash([11, 9]); c.lineCap = 'round'; organic(c, cx, cy, r, r, 0, 0.07, ph, 40);
    c.strokeStyle = halo(P, 0.3); c.lineWidth = 5; c.stroke(); c.strokeStyle = rgba(col, 0.95); c.lineWidth = 2.6; c.stroke(); c.restore();
    return { x: cx + Math.cos(2.35) * r, y: cy + Math.sin(2.35) * r };
  };

  PART.cups = function (P, e) {
    var c = P.c, col = vivid(e.color), n = e.count || 1, x = S - 96, y0 = S * 0.5 - (n - 1) * 26, first = null;
    c.save(); c.lineCap = 'round';
    for (var i = 0; i < n; i++) {
      var y = y0 + i * 52, torn = e.torn && i === n - 1;
      [halo(P, 0.28), rgba(col, 0.98)].forEach(function (sc, pass) {
        c.strokeStyle = sc; c.lineWidth = pass ? 4.2 : 8;
        c.beginPath(); if (torn) { c.arc(x - 5, y, 26, 0.15, Math.PI * 0.5 - 0.05); c.moveTo(x + 5 + 26 * Math.cos(Math.PI * 0.5 + 0.05), y + 26 * Math.sin(Math.PI * 0.5 + 0.05)); c.arc(x + 5, y, 26, Math.PI * 0.5 + 0.05, Math.PI - 0.15); } else c.arc(x, y, 26, 0.1, Math.PI - 0.1);
        c.stroke();
      });
      if (!first) first = { x: x, y: y - 30 };
    }
    c.restore(); return first;
  };

  PART.horizon = function (P, e) {
    var c = P.c, col = vivid(e.color), y = S * 0.7;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    function path() { c.beginPath(); c.moveTo(-10, y + 10); c.bezierCurveTo(S * 0.2, y + 6, S * 0.35, y + 12, S * 0.46, y + 8); c.bezierCurveTo(S * 0.5, y + 7, S * 0.5, y - 30, S * 0.55, y - 32); c.bezierCurveTo(S * 0.7, y - 36, S * 0.85, y - 30, S + 10, y - 34); }
    path(); c.strokeStyle = halo(P, 0.28); c.lineWidth = 12; c.stroke(); path(); c.strokeStyle = rgba(col, 0.98); c.lineWidth = 6.5; c.stroke();
    c.lineTo(S + 10, S + 10); c.lineTo(-10, S + 10); c.closePath(); var g = c.createLinearGradient(0, y - 30, 0, S); g.addColorStop(0, rgba(col, 0.32)); g.addColorStop(1, rgba(col, 0.04)); c.fillStyle = g; c.fill();
    c.restore(); return { x: S * 0.55, y: y - 56 };
  };

  PART.fog = function (P, e) {
    var c = P.c, R = P.R, col = mix(vivid(e.color), '#FFFFFF', 0.3);
    c.save();
    for (var i = 0; i < 10; i++) {
      var x = S * (0.05 + R() * 0.9), y = S * (0.74 + R() * 0.13), rx = 110 + R() * 150, ry = 20 + R() * 22;
      var g = c.createRadialGradient(x, y, 2, x, y, rx); g.addColorStop(0, rgba(col, 0.62)); g.addColorStop(1, rgba(col, 0));
      c.fillStyle = g; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill();
    }
    c.restore(); return { x: S * 0.14, y: S * 0.72 };
  };

  PART.speckle = function (P, e) {
    var c = P.c, R = P.R, col = vivid(e.color), n = Math.round(160 + 420 * (e.density || 0.5));
    c.save();
    for (var i = 0; i < n; i++) {
      var side = Math.floor(R() * 4), t = R(), d = Math.pow(R(), 2) * 70, x = side < 2 ? t * S : (side === 2 ? d : S - d), y = side < 2 ? (side ? S - d : d) : t * S, s = 0.8 + Math.pow(R(), 3) * 3.6;
      c.fillStyle = rgba(col, 0.3 + R() * 0.6); c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill();
    }
    c.restore();
    splatter(P, S * 0.96, S * 0.04, 70, 30, col, 0.8, 2.3); splatter(P, S * 0.04, S * 0.96, 70, 30, col, 0.8, -0.8);
    return { x: S - 70, y: S * 0.2 };
  };

  PART.pings = function (P, e) {
    var c = P.c, R = P.R, col = vivid(e.color), first = null;
    for (var i = 0; i < (e.count || 4); i++) {
      var x = 60 + R() * (S - 120), y = 30 + R() * 130, s = 11 + R() * 11, a = (R() - 0.5) * 0.9;
      c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = rgba(col, 0.88); c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.8; c.fillRect(-s / 2, -s / 2, s, s); c.strokeRect(-s / 2, -s / 2, s, s); c.restore();
      glow(P, x, y, 30, col, 0.3);
      if (!first || y < first.y) first = { x: x, y: y };
    }
    return first;
  };

  PART.bridge = function (P, e, X) {
    var c = P.c, col = vivid(e.color), from = X.src, t = { x: X.F.x, y: X.F.y + 20 };
    gesture(P, [[from.x, from.y], [(from.x + t.x) / 2 + 80, (from.y + t.y) / 2 + 30], [t.x + 40, t.y + 70], [t.x, t.y]], 26, col, 0.9, { taper: 'both', dry: 0.25, bristles: 8, c2: mix(col, '#FFFFFF', 0.4) });
    c.save(); c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(from.x, from.y); c.bezierCurveTo((from.x + t.x) / 2 + 80, (from.y + t.y) / 2 + 30, t.x + 40, t.y + 70, t.x, t.y); c.stroke(); c.restore();
    return { x: (from.x + t.x) / 2 + 66, y: (from.y + t.y) / 2 + 20 };
  };

  PART.anchors = function (P, e) {
    var c = P.c, R = P.R, col = vivid(e.color), n = Math.min(6, e.count || 1), pts = [];
    for (var i = 0; i < n; i++) {
      var x = 80 + (i % 3) * 52 + R() * 18, y = S * 0.62 - Math.floor(i / 3) * 48 + R() * 14;
      glow(P, x, y, 46, col, 0.9, 'source-over'); disc(P, x, y, 7, col, 1, '#FFFFFF'); goldLeaf(P, x + 13, y - 11, 9, 7, R() * 3, mix(col, '#E8B330', 0.5));
      pts.push({ x: x, y: y });
    }
    return pts[0];
  };

  PART.opening = function (P, e, X) {
    var c = P.c, R = P.R, col = vivid(e.color), F = X.F, rightSide = F.x < S / 2, ox = rightSide ? S + 8 : -8, oy = S * 0.2;
    glow(P, ox, oy, 330, col, 0.85, 'source-over'); glow(P, ox, oy, 150, '#FFFFFF', 0.85, 'source-over');
    c.save(); c.lineCap = 'round';
    for (var i = 0; i < 20; i++) {
      var a = (rightSide ? Math.PI : 0) + (rightSide ? -1 : 1) * (0.1 + i * 0.075 + R() * 0.03), L = 380 + R() * 360, gr = c.createLinearGradient(ox, oy, ox + Math.cos(a) * L, oy + Math.sin(a) * L);
      gr.addColorStop(0, 'rgba(255,255,255,' + (0.35 + R() * 0.3) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.strokeStyle = gr; c.lineWidth = 1 + R() * 3.5;
      c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + Math.cos(a) * L, oy + Math.sin(a) * L); c.stroke();
    }
    c.restore();
    var sx = F.x + (rightSide ? 60 : -60), sy = F.y - 40;
    for (var j = 0; j < 8; j++) { var k = j / 7, x = sx + (ox - sx) * k * 0.86, y = sy + (oy - sy) * k + Math.sin(k * 3.1) * 16; glow(P, x, y, 14 + k * 12, col, 0.6, 'source-over'); goldLeaf(P, x, y, 5 + k * 9, 4 + k * 7, R() * 3, mix(col, '#E8B330', 0.4)); }
    return { x: ox + (rightSide ? -60 : 60), y: oy + 44 };
  };

  PART.added = function (P, e, X) {
    var c = P.c, col = vivid(e.color), first = null;
    for (var i = 0; i < (e.count || 1); i++) {
      var a = -0.2 + i * 0.5, x = X.F.x + Math.cos(a) * (X.coreR + 92), y = X.F.y + Math.sin(a) * (X.coreR + 92);
      x = fit(x, 30, S - 30); y = fit(y, 30, S - 30);
      glow(P, x, y, 30, col, 0.5, 'source-over'); goldLeaf(P, x, y, 22, 22, Math.PI / 4, mix(col, '#E8B330', 0.5));
      if (!first) first = { x: x + 18, y: y - 18 };
    }
    return first;
  };

  /* ------------------------------------------------------------------ the whole painting */
  function noiseTile(R, size) {
    var t = document.createElement('canvas'); t.width = t.height = size; var tc = t.getContext('2d'); if (!tc || !tc.createImageData) return null;
    var im = tc.createImageData(size, size), d = im.data;
    for (var i = 0; i < d.length; i += 4) { var v = 128 + Math.round((R() + R() + R() - 1.5) * 70); d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    tc.putImageData(im, 0, 0); return t;
  }
  function marker(c, n, p, taken) {
    var x = cl(p.x, 16, S - 16), y = cl(p.y, 16, S - 16);
    for (var tries = 0; tries < 14; tries++) {
      var hit = taken.some(function (t) { return Math.abs(t.x - x) < 30 && Math.abs(t.y - y) < 30; });
      if (!hit) break; x += 30; if (x > S - 20) { x = p.x - 30; y += 30; }
    }
    x = cl(x, 16, S - 16); y = cl(y, 16, S - 16); taken.push({ x: x, y: y });
    c.save(); c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 6; c.fillStyle = 'rgba(255,255,255,0.96)'; c.strokeStyle = '#1A1033'; c.lineWidth = 1.6;
    c.beginPath(); c.arc(x, y, 13, 0, TAU); c.fill(); c.shadowBlur = 0; c.stroke();
    c.fillStyle = '#1A1033'; c.font = '600 15px "IBM Plex Mono", ui-monospace, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), x, y + 1); c.restore();
  }
  function frame(c, title, sub) {
    c.fillStyle = '#16131C'; c.fillRect(0, 0, W, W);
    c.fillStyle = '#2C2837'; c.fillRect(8, 8, W - 16, W - 16);
    var g = c.createLinearGradient(0, 0, W, W); g.addColorStop(0, '#FBF8F2'); g.addColorStop(1, '#EFE9DD');
    c.fillStyle = g; c.fillRect(12, 12, W - 24, W - 24);
    c.fillStyle = 'rgba(0,0,0,0.05)'; c.fillRect(WX - 6, WY - 6, S + 12, S + 12);
    c.fillStyle = '#FFFFFF'; c.fillRect(WX - 3, WY - 3, S + 6, S + 6);
  }
  function plaque(c, title, sub) {
    var y = WY + S + 44, size = 27, t = title;
    c.save(); c.fillStyle = '#231E2E'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    for (; size >= 15; size -= 1) { c.font = 'italic ' + size + 'px Georgia, "Times New Roman", serif'; if (c.measureText(t).width <= S - 190) break; }
    if (c.measureText(t).width > S - 190) { while (t.length > 3 && c.measureText(t + '…').width > S - 190) t = t.slice(0, -1); t += '…'; }
    c.fillText(t, WX, y);
    c.font = '500 12px "IBM Plex Mono", ui-monospace, monospace'; c.fillStyle = '#6B6478'; c.fillText(sub, WX, y + 24);
    c.fillStyle = '#E8B330'; c.fillRect(WX + S - 36, y - 12, 36, 3); c.restore();
  }
  function placeFocal(R, m, lead) {
    var t = [S / 3, S * 2 / 3], x = t[R() < 0.5 ? 0 : 1], y = m.weight > 0.62 ? t[1] : m.open > 0.62 ? t[0] : t[R() < 0.5 ? 0 : 1];
    if (lead === 'weight') { y = t[1]; }
    return { x: x + (R() - 0.5) * 36, y: y + (R() - 0.5) * 36 };
  }
  function fallbackMood(parts) { return { turb: 0.35, energy: 0.35, open: 0.5, weight: 0.45, amp: 0.85, fams: [{ id: 'cant', motif: 'mist', variant: null, w: 1 }] }; }

  function draw(canvas, parts, o) {
    o = o || {};
    var px = o.px || canvas.width, ctx = canvas.getContext('2d'); if (!ctx) return {};
    var sc = px / W, seed = o.seed || 1, R0 = rng(seed), by = {}, at = {};
    parts.forEach(function (e) { (by[e.kind] = by[e.kind] || []).push(e); });
    var core = by.core ? by.core[0] : null, mood = (core && core.mood) || o.mood || fallbackMood(parts);
    var fams = core ? core.fams.slice(0, 4) : [{ id: 'cant', color: '#9B8CFF', motif: 'mist', variant: null }];
    var lead = fams[0], key0 = lead.variant === 'joy' ? 'joy' : (T[lead.id] ? lead.id : 'cant');
    var pal0 = palette(key0, vivid(lead.color || '#9B8CFF'));
    var P = { c: ctx, R: R0, sc: sc, dark: pal0.dark, m: mood };

    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    frame(ctx);
    ctx.save(); ctx.beginPath(); ctx.rect(WX, WY, S, S); ctx.clip(); ctx.translate(WX, WY);

    // the ground
    var vert = key0 === 'okay' || key0 === 'tired' || key0 === 'joy', gg = vert ? ctx.createLinearGradient(0, 0, S * 0.2, S) : ctx.createLinearGradient(0, 0, S * 0.45, S);
    gg.addColorStop(0, pal0.g[0]); gg.addColorStop(1, pal0.g[1]); ctx.fillStyle = gg; ctx.fillRect(0, 0, S, S);
    var F = placeFocal(R0, mood, lead.motif), thirds = [[S / 3, S / 3], [S * 2 / 3, S / 3], [S / 3, S * 2 / 3], [S * 2 / 3, S * 2 / 3]];
    for (var gi = 0; gi < 3; gi++) glow(P, thirds[(gi + 1) % 4][0] + (R0() - 0.5) * 80, thirds[(gi + 2) % 4][1] + (R0() - 0.5) * 80, 300 + R0() * 120, pal0.c[gi % pal0.c.length], pal0.dark ? 0.45 : 0.4);

    // the feelings: the strongest one leads at the focal point, the others layer over it from the other thirds
    var coreR = 44 + 9 * (core ? core.n : 5) * 0.8, X = { F: F, coreR: coreR };
    var order = fams.map(function (fm, i) { return i; }).reverse();
    order.forEach(function (i) {
      var fm = fams[i], key = fm.variant === 'joy' ? 'joy' : (T[fm.id] ? fm.id : 'cant'), pal = palette(key, vivid(fm.color || '#9B8CFF')), f = { id: fm.id, variant: fm.variant, pal: pal };
      var FF = i ? { x: cl(S - F.x + (R0() - 0.5) * 120, 60, S - 60), y: i % 2 ? F.y : S - F.y } : F, motif = MOTIF[fm.motif] || MOTIF.mist;
      var Pi = { c: ctx, R: sub(seed, 'fam:' + fm.id + ':' + i), sc: sc, dark: i ? pal.dark : P.dark, m: mood };
      ctx.save(); if (i) { ctx.globalAlpha = 0.78 - (i - 1) * 0.12; if (P.dark) ctx.globalCompositeOperation = 'screen'; }
      motif(Pi, f, FF, i ? 0.66 : 1, i ? 'second' : 'lead');
      ctx.restore();
      if (f.farPt && !i) at.far = f.farPt;
    });
    at.core = { x: F.x + 26, y: F.y - 30 };

    // the parts, each with its own stream of random numbers
    var Pp = function (id) { return { c: ctx, R: sub(seed, id), sc: sc, dark: P.dark, m: mood }; };
    if (by.fog) at.fog = PART.fog(Pp('fog'), by.fog[0], X);
    if (by.horizon) at.horizon = PART.horizon(Pp('horizon'), by.horizon[0], X);
    if (by.speckle) at.speckle = PART.speckle(Pp('speckle'), by.speckle[0], X);
    if (by.wedges) at.wedges = PART.wedges(Pp('wedges'), by.wedges[0], X);
    if (by.opening) at.opening = PART.opening(Pp('opening'), by.opening[0], X);
    var stoneAt = {};
    if (by.stone) { var st = PART.stones(Pp('stones'), by.stone, X); by.stone.forEach(function (e) { if (st[e.id]) { at[e.id] = st[e.id]; stoneAt[e.fid] = st[e.id]; } }); }
    if (by.bridge) {
      var br = by.bridge[0], fromF = ({ work: ['workload', 'caregiving', 'roles', 'meaning', 'jobinsecurity'], money: ['money'], home: ['home'], people: ['othercrisis', 'obligations'], body: ['healthchange'], change: ['jobinsecurity'] })[br.from] || [], src = null;
      fromF.forEach(function (fid) { if (!src && stoneAt[fid]) src = stoneAt[fid]; });
      at.bridge = PART.bridge(Pp('bridge'), br, { F: F, coreR: coreR, src: src ? { x: src.x, y: src.y - src.r * 0.5 } : { x: S * 0.3, y: S * 0.84 } });
    }
    (by.person || []).forEach(function (e) { at[e.id] = PART.person(Pp(e.id), e, X); });
    if (by.cups) at.cups = PART.cups(Pp('cups'), by.cups[0], X);
    if (by.haze) at.haze = PART.haze(Pp('haze'), by.haze[0], X);
    if (by.ring) at.ring = PART.ring(Pp('ring'), by.ring[0], X);
    if (by.threads) at.threads = PART.threads(Pp('threads'), by.threads[0], X);
    if (by.story) at.story = PART.story(Pp('story'), by.story[0], X);
    if (by.pings) at.pings = PART.pings(Pp('pings'), by.pings[0], X);
    if (by.anchors) at.anchors = PART.anchors(Pp('anchors'), by.anchors[0], X);
    if (by.added) at.added = PART.added(Pp('added'), by.added[0], X);

    // the finishing layer: fine line work that follows the mood, gold-leaf at the focal point, a soft vignette
    var Rf = sub(seed, 'finish'), Pf = { c: ctx, R: Rf, sc: sc, dark: P.dark, m: mood }, nl = Math.round(3 + 22 * Math.pow(mood.turb, 1.3) * mood.amp);
    ctx.save(); ctx.lineCap = 'round';
    for (var li = 0; li < nl; li++) {
      var side = Rf() < 0.5, x0 = side ? -10 : Rf() * S, y0 = side ? Rf() * S : -10, x1 = side ? S + 10 : Rf() * S, y1 = side ? Rf() * S : S + 10;
      hairCurve(Pf, x0, y0, x1, y1, (mood.turb < 0.3 ? 40 : 160) * (Rf() - 0.5) * 2, li % 3 ? (P.dark ? '#FFFFFF' : '#220B4A') : pal0.a, 0.1 + 0.24 * Rf(), 0.6 + Rf() * 0.9);
    }
    ctx.restore();
    for (var gl = 0; gl < 3 + Math.round(mood.open * 4); gl++) {
      var ga = Rf() * TAU, gd = 30 + Rf() * 150;
      goldLeaf(Pf, F.x + Math.cos(ga) * gd, F.y + Math.sin(ga) * gd, 6 + Rf() * 16, 5 + Rf() * 11, Rf() * 3);
    }
    for (var fl = 0; fl < 16; fl++) { var fa = Rf() * TAU, fd = 40 + Rf() * 200; ctx.fillStyle = 'rgba(255,225,130,' + (0.4 + Rf() * 0.5) + ')'; ctx.beginPath(); ctx.arc(F.x + Math.cos(fa) * fd, F.y + Math.sin(fa) * fd, 0.8 + Rf() * 1.8, 0, TAU); ctx.fill(); }
    var vg = ctx.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.78), vs = 0.08 + 0.3 * mood.weight * (1 - mood.open * 0.7);
    vg.addColorStop(0, 'rgba(10,0,30,0)'); vg.addColorStop(1, 'rgba(10,0,30,' + vs + ')'); ctx.fillStyle = vg; ctx.fillRect(0, 0, S, S);
    ctx.restore();

    // grain, painted in device pixels so it stays fine at any size
    var tile = noiseTile(sub(seed, 'grain'), 200);
    if (tile) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); ctx.rect(WX * sc, WY * sc, S * sc, S * sc); ctx.clip();
      var pat = ctx.createPattern(tile, 'repeat');
      if (pat) { ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.3; ctx.fillStyle = pat; ctx.fillRect(WX * sc, WY * sc, S * sc, S * sc); }
      ctx.restore();
    }
    ctx.setTransform(sc, 0, 0, sc, 0, 0);
    // the window edge, then the numbers and the title card
    var ws = ctx.createLinearGradient(0, WY, 0, WY + 22); ws.addColorStop(0, 'rgba(0,0,0,0.22)'); ws.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ws; ctx.fillRect(WX, WY, S, 22);
    var ws2 = ctx.createLinearGradient(WX, 0, WX + 18, 0); ws2.addColorStop(0, 'rgba(0,0,0,0.16)'); ws2.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = ws2; ctx.fillRect(WX, WY, 18, S);
    var yr = o.date ? new Date(o.date) : new Date(), when = isNaN(yr) ? '' : yr.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    plaque(ctx, (o.title && String(o.title).trim()) || ('Untitled, ' + (isNaN(yr) ? '' : yr.getFullYear())), 'MADE FROM YOUR ANSWERS' + (when ? ', ' + when.toUpperCase() : ''));
    if (o.numbers !== false) {
      var taken = []; ctx.save(); ctx.translate(WX, WY);
      parts.forEach(function (e, idx) { var p = at[e.id] || at[e.kind]; if (p) marker(ctx, idx + 1, p, taken); });
      ctx.restore();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return at;
  }

  root.EMO_ART = { draw: draw, size: W, palette: palette };
})(window);
