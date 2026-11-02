// Tidbit and Sugarfoot facing the reader, sitting: one continuous outline around the whole coat (owner: "smoother, not disjointed").
(function () {
  var OUT = '#2B211C';
  function P(g, pts, close) { var n = pts.length; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (var i = 0; i < (close ? n : n - 1); i++) { var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n], k = 1 / 6;
      if (!close) { if (i === 0) p0 = p1; if (i + 2 >= n) p3 = p2; }
      g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]); }
    if (close) g.closePath(); }
  // several shapes of one color as ONE region: stroke them all wide, then fill them all, so only the outside edge shows
  function blob(g, list, fill, lw) {
    g.lineJoin = 'round'; g.lineCap = 'round';
    list.forEach(function (pts) { P(g, pts, true); g.lineWidth = lw * 2; g.strokeStyle = OUT; g.stroke(); });
    list.forEach(function (pts) { P(g, pts, true); g.fillStyle = fill; g.fill(); });
  }
  function shape(g, pts, fill, lw) { P(g, pts, true); g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = OUT; g.lineJoin = 'round'; g.stroke(); }
  function line(g, pts, lw) { P(g, pts, false); g.lineWidth = lw; g.strokeStyle = OUT; g.lineCap = 'round'; g.stroke(); }
  function ell(g, x, y, rx, ry, rot, fill, lw) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); if (lw) { g.lineWidth = lw; g.strokeStyle = OUT; g.stroke(); } }
  var C = { tidbit: { coat: '#2A2321', ear: '#2A2321', tan: '#C98A4F', tan2: '#D9A066', paw: '#D9A066', tongue: '#EE8FA6', collar: '#D9483B', tag: '#F2C14E' },
            sugarfoot: { coat: '#2A2321', ear: '#221C1B', tan: '#C9965F', tan2: '#D8AC78', paw: '#F4EFE6', tongue: '#EE8FA6', white: '#F4EFE6', leg: '#A45C2E' } };
  function pup(g, who, o) {
    o = o || {}; var mono = !!o.mono, lw = o.lw || 3.4, c = C[who], sug = who === 'sugarfoot', col = function (x) { return mono ? '#FFFFFF' : x; };
    var wave = !!o.wave, HY = -176;
    var head = [[-70, HY], [-64, HY - 40], [-38, HY - 66], [0, HY - 74], [38, HY - 66], [64, HY - 40], [70, HY], [62, HY + 34], [36, HY + 56], [0, HY + 62], [-36, HY + 56], [-62, HY + 34]];
    // the body flows out of the head: wide at the bottom, the front legs part of the same shape
    var body = [[-36, HY + 44], [-54, -96], [-62, -50], [-58, -14], [-40, 0], [0, 2], [40, 0], [58, -14], [62, -50], [54, -96], [36, HY + 44]];
    var tail = [[46, -26], [70, -40], [86, -66], [80, -76], [64, -58], [44, -40]];
    var arm = [[8, -92], [30, -98], [40, -84], [42, -66], [36, -56], [22, -58], [16, -72], [8, -80]];
    var coat = [tail, body, head]; if (wave && !sug) coat.push(arm);
    // Sugarfoot's ears hang behind the face first
    if (sug) [-1, 1].forEach(function (s) { blob(g, [[[s * 50, HY - 46], [s * 74, HY - 30], [s * 84, HY + 8], [s * 80, HY + 48], [s * 66, HY + 66], [s * 52, HY + 54], [s * 48, HY + 14], [s * 44, HY - 22]]], col(c.ear), lw); });
    blob(g, coat, col(c.coat), lw);
    // soft contour lines: where the front legs are, and the haunches (no closed outlines inside the coat)
    [-1, 1].forEach(function (s) { line(g, [[s * 44, -58], [s * 54, -40], [s * 52, -18]], lw * 0.7); if (wave && s === 1) return; line(g, [[s * 8, -90], [s * 5, -56], [s * 8, -20]], lw * 0.7); line(g, [[s * 34, -86], [s * 37, -54], [s * 35, -22]], lw * 0.7); });
    // Sugarfoot's brown legs and white chest stripe; Tidbit's tan chest
    if (sug) {
      [-1, 1].forEach(function (s) { if (wave && s === 1) return; shape(g, [[s * 6, -86], [s * 22, -96], [s * 36, -86], [s * 38, -50], [s * 36, -16], [s * 8, -16], [s * 4, -50]], col(c.leg), lw * 0.8); });
      shape(g, [[-9, HY + 60], [9, HY + 60], [12, -84], [5, -60], [0, -54], [-5, -60], [-12, -84]], col(c.white), lw * 0.75);
    } else shape(g, [[-22, HY + 66], [22, HY + 66], [24, -88], [12, -70], [0, -64], [-12, -70], [-24, -88]], col(c.tan), lw * 0.8);
    // paws: Tidbit's tan socks run up the leg in one smooth shape
    [-1, 1].forEach(function (s) {
      if (!(wave && s === 1)) shape(g, sug ? [[s * 4, -2], [s * 6, -16], [s * 22, -22], [s * 38, -16], [s * 40, -2]] : [[s * 4, -2], [s * 7, -30], [s * 21, -36], [s * 36, -30], [s * 40, -2]], col(c.paw), lw * 0.85);
      line(g, [[s * 17, -14], [s * 17, -3]], lw * 0.55); line(g, [[s * 27, -14], [s * 27, -3]], lw * 0.55);
      shape(g, [[s * 44, -2], [s * 46, -14], [s * 62, -18], [s * 76, -10], [s * 74, 0]], col(c.paw), lw * 0.85); // back feet at the sides
      line(g, [[s * 58, -12], [s * 58, -2]], lw * 0.5); line(g, [[s * 66, -12], [s * 66, -2]], lw * 0.5);
    });
    if (!sug) { shape(g, [[-40, HY + 52], [0, HY + 62], [40, HY + 52], [42, HY + 62], [0, HY + 74], [-42, HY + 62]], col(c.collar), lw * 0.8); ell(g, 0, HY + 82, 8, 9, 0, col(c.tag), lw * 0.7); }
    // face
    g.save(); g.translate(0, HY);
    if (sug) {
      shape(g, [[-48, -4], [-28, -24], [-10, -16], [0, -26], [10, -16], [28, -24], [48, -4], [50, 26], [30, 52], [0, 60], [-30, 52], [-50, 26]], col(c.tan), lw * 0.8);
      [-1, 1].forEach(function (s) { ell(g, s * 24, -42, 10, 7, s * -0.2, col(c.tan2), lw * 0.7); });
    } else [-1, 1].forEach(function (s) { ell(g, s * 24, -38, 8.5, 7, 0, col(c.tan2), lw * 0.7); });
    // muzzle and cheeks as one soft tan shape for Tidbit
    shape(g, sug ? [[-30, 18], [-24, 2], [0, -4], [24, 2], [30, 18], [22, 38], [0, 46], [-22, 38]]
                 : [[-50, 26], [-40, 8], [-24, 2], [0, -4], [24, 2], [40, 8], [50, 26], [40, 44], [20, 46], [0, 50], [-20, 46], [-40, 44]], col(sug ? c.tan2 : c.tan), lw * 0.8);
    [-1, 1].forEach(function (s) { ell(g, s * 26, -14, 14, 15.5, 0, '#FFFFFF', lw * 0.8); ell(g, s * 26 + 1, -12, 10.5, 12, 0, OUT, 0); ell(g, s * 26 + 5, -17, 4.2, 4.2, 0, '#FFFFFF', 0); ell(g, s * 26 - 3, -6, 2, 2, 0, '#FFFFFF', 0); });
    shape(g, [[-12, 6], [0, 2], [12, 6], [8, 14], [0, 17], [-8, 14]], OUT, lw * 0.5); ell(g, -3, 6, 3, 1.8, 0, mono ? '#FFFFFF' : '#8A7F7A', 0);
    line(g, [[0, 17], [0, 23]], lw * 0.75); line(g, [[-16, 21], [-8, 27], [0, 23], [8, 27], [16, 21]], lw * 0.75);
    shape(g, [[-8, 26], [8, 26], [9, 39], [0, 45], [-9, 39]], col(c.tongue), lw * 0.7); line(g, [[0, 28], [0, 37]], lw * 0.4);
    if (!mono) [-1, 1].forEach(function (s) { ell(g, s * 46, 12, 7, 4.5, 0, 'rgba(238,143,166,0.45)', 0); });
    if (sug) [-1, 1].forEach(function (s) { shape(g, [[s * 42, -58], [s * 64, -50], [s * 78, -20], [s * 80, 26], [s * 70, 56], [s * 56, 50], [s * 52, 14], [s * 46, -24]], col(c.coat), lw); });
    else [-1, 1].forEach(function (s) { shape(g, [[s * 30, -64], [s * 56, -76], [s * 84, -60], [s * 82, -40], [s * 64, -34], [s * 50, -46]], col(c.coat), lw); });
    g.restore();
    if (wave && sug) { blob(g, [arm], col(c.leg), lw); }
    if (wave) { shape(g, [[18, -60], [24, -70], [40, -72], [50, -62], [46, -46], [30, -42], [20, -48]], col(c.paw), lw * 0.85);   // the lifted paw, hanging from the bent wrist
      line(g, [[30, -48], [30, -44]], lw * 0.5); line(g, [[38, -48], [39, -44]], lw * 0.5); }
  }
  window.PUPF = { draw: pup };
})();
