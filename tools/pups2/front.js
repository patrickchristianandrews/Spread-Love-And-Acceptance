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
  // the show's own colors (assets/js/pups.js LOOKS)
  var C = { tidbit: { coat: '#252120', ear: '#252120', tan: '#C4834A', brow: '#D69B5F', sock: '#C98A4F', paw: '#D99E62', tongue: '#EE8FA6', collar: '#141111', tag: '#D5D9E0', chin: '#D2C8BA', earEdge: '#B97A43', eye: '#3A2418' },
            sugarfoot: { coat: '#252120', ear: '#1B1817', tan: '#C9965F', brow: '#C9965F', leg: '#A45C2E', legLow: '#B97847', paw: '#F1EADF', tongue: '#EE8FA6', white: '#F2ECE3', eye: '#3A2418' } };
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
      [-1, 1].forEach(function (s) { if (wave && s === 1) return; shape(g, [[s * 6, -86], [s * 22, -96], [s * 36, -86], [s * 38, -50], [s * 36, -16], [s * 8, -16], [s * 4, -50]], col(c.leg), lw * 0.8);
        shape(g, [[s * 5, -48], [s * 21, -54], [s * 37, -48], [s * 36, -16], [s * 8, -16]], col(c.legLow), lw * 0.7); });
      shape(g, [[-9, HY + 60], [9, HY + 60], [12, -84], [5, -60], [0, -54], [-5, -60], [-12, -84]], col(c.white), lw * 0.75);
    } else [-1, 1].forEach(function (s) { shape(g, [[s * 4, -104], [s * 18, -110], [s * 28, -98], [s * 24, -82], [s * 10, -80], [s * 4, -90]], col(c.tan), lw * 0.75); });
    // paws: Tidbit's tan socks run up the leg in one smooth shape
    [-1, 1].forEach(function (s) {
      if (!(wave && s === 1)) { if (!sug) shape(g, [[s * 6, -14], [s * 7, -46], [s * 21, -52], [s * 35, -46], [s * 37, -14]], col(c.sock), lw * 0.75);
        shape(g, [[s * 4, -2], [s * 6, -16], [s * 22, -22], [s * 38, -16], [s * 40, -2]], col(c.paw), lw * 0.85); }
      line(g, [[s * 17, -14], [s * 17, -3]], lw * 0.55); line(g, [[s * 27, -14], [s * 27, -3]], lw * 0.55);
      shape(g, [[s * 44, -2], [s * 46, -14], [s * 62, -18], [s * 76, -10], [s * 74, 0]], col(c.paw), lw * 0.85); // back feet at the sides
      line(g, [[s * 58, -12], [s * 58, -2]], lw * 0.5); line(g, [[s * 66, -12], [s * 66, -2]], lw * 0.5);
    });
    if (!sug) { shape(g, [[-40, HY + 52], [0, HY + 62], [40, HY + 52], [42, HY + 62], [0, HY + 74], [-42, HY + 62]], mono ? '#FFFFFF' : c.collar, lw * 0.8); shape(g, [[-7, HY + 72], [7, HY + 72], [7, HY + 86], [-7, HY + 86]], col(c.tag), lw * 0.7); }
    // face (the show's markings)
    g.save(); g.translate(0, HY);
    if (sug) {
      // soft fawn fills the lower face; a dark rim round each eye; tan brows
      shape(g, [[-50, -2], [-34, -12], [-18, -6], [0, -14], [18, -6], [34, -12], [50, -2], [52, 26], [32, 52], [0, 60], [-32, 52], [-52, 26]], col(c.tan), lw * 0.8);
      [-1, 1].forEach(function (s) { ell(g, s * 26, -14, 17, 16, 0, mono ? '#FFFFFF' : c.coat, lw * 0.7); ell(g, s * 24, -42, 11, 7, s * -0.25, col(c.brow), lw * 0.7); });
      shape(g, [[-30, 16], [-24, 2], [0, -4], [24, 2], [30, 16], [22, 36], [0, 44], [-22, 36]], col(c.tan), lw * 0.75);   // muzzle
    } else {
      // Rottweiler mask: black face, tan cheeks and lips, a black stripe down the nose, round tan brow dots, a grey chin
      shape(g, [[-48, 30], [-42, 10], [-24, 4], [-10, 8], [0, 22], [10, 8], [24, 4], [42, 10], [48, 30], [36, 46], [16, 50], [0, 52], [-16, 50], [-36, 46]], col(c.tan), lw * 0.8);
      shape(g, [[-10, -24], [10, -24], [9, 2], [6, 12], [-6, 12], [-9, 2]], mono ? '#FFFFFF' : c.coat, lw * 0.7);           // the black stripe down the nose
      ell(g, 0, 48, 10, 5, 0, col(c.chin), lw * 0.6);
      [-1, 1].forEach(function (s) { ell(g, s * 24, -38, 8.5, 8, 0, col(c.brow), lw * 0.7); });
    }
    // eyes: the show's warm brown, big and kind, with two catchlights
    [-1, 1].forEach(function (s) { ell(g, s * 26, -14, 13, 14.5, 0, '#FFFFFF', lw * 0.75); ell(g, s * 26 + 1.5, -13, 10.2, 11.6, 0, mono ? OUT : c.eye, 0); ell(g, s * 26 + 2, -12, 5.4, 6.2, 0, OUT, 0); ell(g, s * 26 + 5.5, -17.5, 4.2, 4.2, 0, '#FFFFFF', 0); ell(g, s * 26 - 2.5, -7, 1.9, 1.9, 0, '#FFFFFF', 0); });
    shape(g, [[-12, 8], [0, 4], [12, 8], [8, 16], [0, 19], [-8, 16]], OUT, lw * 0.5); ell(g, -3, 8, 3, 1.8, 0, mono ? '#FFFFFF' : '#8A7F7A', 0);
    line(g, [[0, 19], [0, 25]], lw * 0.75); line(g, [[-16, 23], [-8, 29], [0, 25], [8, 29], [16, 23]], lw * 0.75);
    shape(g, [[-8, 28], [8, 28], [9, 40], [0, 46], [-9, 40]], col(c.tongue), lw * 0.7); line(g, [[0, 30], [0, 38]], lw * 0.4);
    if (!mono) [-1, 1].forEach(function (s) { ell(g, s * 46, 16, 7, 4.5, 0, 'rgba(238,143,166,0.4)', 0); });
    if (sug) [-1, 1].forEach(function (s) { shape(g, [[s * 42, -58], [s * 64, -50], [s * 78, -20], [s * 80, 26], [s * 70, 56], [s * 56, 50], [s * 52, 14], [s * 46, -24]], col(c.coat), lw); });
    else [-1, 1].forEach(function (s) { shape(g, [[s * 30, -64], [s * 56, -76], [s * 84, -60], [s * 82, -40], [s * 64, -34], [s * 50, -46]], col(c.coat), lw); line(g, [[s * 52, -44], [s * 66, -38], [s * 80, -42]], lw * 0.6); });   // folded ears, a tan edge
    g.restore();
    if (wave && sug) { blob(g, [arm], col(c.leg), lw); }
    if (wave) { shape(g, [[18, -60], [24, -70], [40, -72], [50, -62], [46, -46], [30, -42], [20, -48]], col(c.paw), lw * 0.85);   // the lifted paw, hanging from the bent wrist
      line(g, [[30, -48], [30, -44]], lw * 0.5); line(g, [[38, -48], [39, -44]], lw * 0.5); }
  }
  window.PUPF = { draw: pup };
})();
