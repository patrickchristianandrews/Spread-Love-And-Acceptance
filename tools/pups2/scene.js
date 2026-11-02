// scene.js: props for the coloring pages in the same clean style as the pups (smooth curves, one bold outline per shape).
(function () {
  var OUT = '#2B211C';
  function P(g, pts, close) { var n = pts.length; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (var i = 0; i < (close ? n : n - 1); i++) { var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n], k = 1 / 6;
      if (!close) { if (i === 0) p0 = p1; if (i + 2 >= n) p3 = p2; }
      g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]); }
    if (close) g.closePath(); }
  function poly(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }
  function fs(g, fill, lw) { g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = OUT; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }
  function shape(g, pts, fill, lw) { P(g, pts, true); fs(g, fill, lw); }
  function line(g, pts, lw) { P(g, pts, false); g.lineWidth = lw; g.strokeStyle = OUT; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); }
  function blob(g, list, fill, lw) { list.forEach(function (pts) { P(g, pts, true); g.lineWidth = lw * 2; g.strokeStyle = OUT; g.lineJoin = 'round'; g.stroke(); }); list.forEach(function (pts) { P(g, pts, true); g.fillStyle = fill; g.fill(); }); }
  function circ(g, x, y, r, fill, lw) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); fs(g, fill, lw); }
  function ring(n, cx, cy, r, jit) { var a = []; for (var i = 0; i < n; i++) { var t = i / n * Math.PI * 2; a.push([cx + Math.cos(t) * r * (1 + (jit ? jit(i) : 0)), cy + Math.sin(t) * r * (1 + (jit ? jit(i) : 0))]); } return a; }
  var S = {
    col: function (o, c) { return o && o.mono ? '#FFFFFF' : c; },
    cloud: function (g, x, y, s, o) { var lw = (o && o.lw) || 4; var puffs = [[-60, 0, 30], [-24, -22, 36], [20, -26, 34], [56, -4, 28], [0, 6, 34]];
      blob(g, puffs.map(function (p) { return ring(14, x + p[0] * s, y + p[1] * s, p[2] * s); }), S.col(o, '#FFFFFF'), lw); },
    sun: function (g, x, y, r, o) { var lw = (o && o.lw) || 4;
      for (var i = 0; i < 12; i++) { var t = i / 12 * Math.PI * 2, a = t - 0.12, b = t + 0.12;
        shape(g, [[x + Math.cos(a) * r * 1.22, y + Math.sin(a) * r * 1.22], [x + Math.cos(t) * r * 1.62, y + Math.sin(t) * r * 1.62], [x + Math.cos(b) * r * 1.22, y + Math.sin(b) * r * 1.22]], S.col(o, '#F7C948'), lw * 0.8); }
      circ(g, x, y, r, S.col(o, '#FFD95A'), lw);
      line(g, [[x - r * 0.42, y + r * 0.18], [x, y + r * 0.42], [x + r * 0.42, y + r * 0.18]], lw * 0.8);
      circ(g, x - r * 0.34, y - r * 0.18, r * 0.09, OUT, 0); circ(g, x + r * 0.34, y - r * 0.18, r * 0.09, OUT, 0); },
    hills: function (g, W, y1, y2, o) { var lw = (o && o.lw) || 4;
      shape(g, [[-40, y1 + 40], [W * 0.2, y1 - 30], [W * 0.5, y1 + 10], [W * 0.8, y1 - 40], [W + 40, y1 + 20], [W + 40, 1400], [-40, 1400]], S.col(o, '#A9D98C'), lw);
      shape(g, [[-40, y2 + 20], [W * 0.3, y2 - 30], [W * 0.65, y2 + 20], [W + 40, y2 - 20], [W + 40, 1400], [-40, 1400]], S.col(o, '#8CCB6E'), lw); },
    tree: function (g, x, y, s, o) { var lw = (o && o.lw) || 4;
      shape(g, [[x - 22 * s, y], [x - 16 * s, y - 120 * s], [x - 30 * s, y - 170 * s], [x + 30 * s, y - 170 * s], [x + 16 * s, y - 120 * s], [x + 22 * s, y]], S.col(o, '#A8743F'), lw);
      line(g, [[x - 4 * s, y - 30 * s], [x + 2 * s, y - 70 * s], [x - 2 * s, y - 110 * s]], lw * 0.6);
      blob(g, [[-70, -200, 60], [-10, -250, 70], [60, -205, 60], [-30, -170, 50], [36, -165, 52]].map(function (p) { return ring(16, x + p[0] * s, y + p[1] * s, p[2] * s); }), S.col(o, '#7CC266'), lw);
      [[-40, -215], [20, -240], [44, -190], [-12, -186]].forEach(function (p) { circ(g, x + p[0] * s, y + p[1] * s, 8 * s, S.col(o, '#E8504A'), lw * 0.7); }); },
    fence: function (g, x0, x1, y, h, o) { var lw = (o && o.lw) || 4, w = 34, gap = 10;
      shape(g, [[x0, y - h * 0.72], [x1, y - h * 0.72], [x1, y - h * 0.6], [x0, y - h * 0.6]], S.col(o, '#FFFFFF'), lw * 0.85);
      shape(g, [[x0, y - h * 0.3], [x1, y - h * 0.3], [x1, y - h * 0.18], [x0, y - h * 0.18]], S.col(o, '#FFFFFF'), lw * 0.85);
      for (var x = x0; x < x1 - w * 0.5; x += w + gap) poly(g, [[x, y], [x, y - h + 12], [x + w / 2, y - h], [x + w, y - h + 12], [x + w, y]]), fs(g, S.col(o, '#FFFFFF'), lw); },
    flower: function (g, x, y, s, petal, o) { var lw = (o && o.lw) || 3.4;
      line(g, [[x, y], [x - 4 * s, y - 30 * s], [x, y - 60 * s]], lw);
      shape(g, [[x, y - 22 * s], [x - 20 * s, y - 34 * s], [x - 26 * s, y - 24 * s], [x - 6 * s, y - 16 * s]], S.col(o, '#7CC266'), lw * 0.8);
      for (var i = 0; i < 6; i++) { var t = i / 6 * Math.PI * 2; circ(g, x + Math.cos(t) * 13 * s, y - 60 * s + Math.sin(t) * 13 * s, 9 * s, S.col(o, petal || '#F48FB1'), lw * 0.8); }
      circ(g, x, y - 60 * s, 9 * s, S.col(o, '#FFD95A'), lw * 0.8); },
    tuft: function (g, x, y, s, o) { var lw = (o && o.lw) || 3.4;
      shape(g, [[x - 18 * s, y], [x - 14 * s, y - 26 * s], [x - 6 * s, y - 10 * s], [x, y - 34 * s], [x + 6 * s, y - 10 * s], [x + 14 * s, y - 28 * s], [x + 18 * s, y]], S.col(o, '#7CC266'), lw * 0.8); },
    butterfly: function (g, x, y, s, o) { var lw = (o && o.lw) || 3;
      [-1, 1].forEach(function (d) { shape(g, [[x, y], [x + d * 26 * s, y - 24 * s], [x + d * 34 * s, y - 6 * s], [x + d * 14 * s, y + 4 * s]], S.col(o, '#B79CEB'), lw);
        shape(g, [[x, y + 2 * s], [x + d * 22 * s, y + 10 * s], [x + d * 18 * s, y + 24 * s], [x + d * 4 * s, y + 14 * s]], S.col(o, '#F7A8C2'), lw); });
      shape(g, [[x - 3 * s, y - 10 * s], [x + 3 * s, y - 10 * s], [x + 3 * s, y + 18 * s], [x - 3 * s, y + 18 * s]], S.col(o, '#5B3F8C'), lw * 0.8);
      line(g, [[x - 1, y - 10 * s], [x - 8 * s, y - 22 * s]], lw * 0.7); line(g, [[x + 1, y - 10 * s], [x + 8 * s, y - 22 * s]], lw * 0.7); },
    ball: function (g, x, y, r, o) { var lw = (o && o.lw) || 4; circ(g, x, y, r, S.col(o, '#E8504A'), lw);
      line(g, [[x - r, y], [x - r * 0.3, y - r * 0.25], [x + r * 0.3, y + r * 0.25], [x + r, y]], lw * 0.8); line(g, [[x - r * 0.15, y - r], [x + r * 0.1, y], [x - r * 0.15, y + r]], lw * 0.8); },
    heart: function (g, x, y, s, o) { var lw = (o && o.lw) || 3.4; shape(g, [[x, y + 18 * s], [x - 22 * s, y - 2 * s], [x - 20 * s, y - 18 * s], [x - 8 * s, y - 20 * s], [x, y - 10 * s], [x + 8 * s, y - 20 * s], [x + 20 * s, y - 18 * s], [x + 22 * s, y - 2 * s]], S.col(o, '#F48FB1'), lw); },
    doghouse: function (g, x, y, s, o) { var lw = (o && o.lw) || 4;
      poly(g, [[x - 70 * s, y], [x - 70 * s, y - 90 * s], [x + 70 * s, y - 90 * s], [x + 70 * s, y]]); fs(g, S.col(o, '#F2B6A0'), lw);
      poly(g, [[x - 90 * s, y - 84 * s], [x, y - 160 * s], [x + 90 * s, y - 84 * s], [x + 78 * s, y - 72 * s], [x, y - 138 * s], [x - 78 * s, y - 72 * s]]); fs(g, S.col(o, '#C94F4F'), lw);
      P(g, [[x - 30 * s, y], [x - 30 * s, y - 40 * s], [x, y - 66 * s], [x + 30 * s, y - 40 * s], [x + 30 * s, y]], false); g.closePath(); fs(g, S.col(o, '#5A4036'), lw);
      shape(g, [[x - 40 * s, y - 112 * s], [x + 40 * s, y - 112 * s], [x + 40 * s, y - 92 * s], [x - 40 * s, y - 92 * s]], S.col(o, '#FFFFFF'), lw * 0.8); },
    bone: function (g, x, y, s, rot, o) { var lw = (o && o.lw) || 3.6; g.save(); g.translate(x, y); g.rotate(rot || 0);
      blob(g, [ring(12, -26 * s, -7 * s, 9 * s), ring(12, -26 * s, 7 * s, 9 * s), ring(12, 26 * s, -7 * s, 9 * s), ring(12, 26 * s, 7 * s, 9 * s), [[-26 * s, -7 * s], [26 * s, -7 * s], [26 * s, 7 * s], [-26 * s, 7 * s]]], S.col(o, '#FFF6E0'), lw); g.restore(); },
    frame: function (g, W, H, m, o) { var lw = (o && o.lw) || 7; var r = 46;
      g.beginPath(); g.moveTo(m + r, m); g.lineTo(W - m - r, m); g.quadraticCurveTo(W - m, m, W - m, m + r); g.lineTo(W - m, H - m - r); g.quadraticCurveTo(W - m, H - m, W - m - r, H - m);
      g.lineTo(m + r, H - m); g.quadraticCurveTo(m, H - m, m, H - m - r); g.lineTo(m, m + r); g.quadraticCurveTo(m, m, m + r, m); g.closePath(); g.lineWidth = lw; g.strokeStyle = OUT; g.stroke(); }
  };
  (typeof window !== 'undefined' ? window : global).SCENE = S;
})();
