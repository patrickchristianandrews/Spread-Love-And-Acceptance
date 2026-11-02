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
  var C = { tidbit: { coat: '#221D1B', ear: '#221D1B', tan: '#C98A52', brow: '#C98A52', sock: '#C98A52', paw: '#C98A52', nail: '#2A2422', tongue: '#EE8FA6', chin: '#D9B48C', eye: '#3A2418' },
            sugarfoot: { coat: '#252120', ear: '#252120', earIn: '#D9A38E', tan: '#D8AE82', brow: '#D8AE82', leg: '#A0562E', legLow: '#A0562E', paw: '#F2ECE3', nail: '#2A2422', tongue: '#EE8FA6', white: '#F2ECE3', eye: '#3A2418' } };
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
    if (false) [-1, 1].forEach(function (s) { blob(g, [[[s * 50, HY - 46], [s * 74, HY - 30], [s * 84, HY + 8], [s * 80, HY + 48], [s * 66, HY + 66], [s * 52, HY + 54], [s * 48, HY + 14], [s * 44, HY - 22]]], col(c.ear), lw); });
    blob(g, coat, col(c.coat), lw);
    // soft contour lines: where the front legs are, and the haunches (no closed outlines inside the coat)
    [-1, 1].forEach(function (s) { line(g, [[s * 44, -58], [s * 54, -40], [s * 52, -18]], lw * 0.7); if (wave && s === 1) return; line(g, [[s * 8, -90], [s * 5, -56], [s * 8, -20]], lw * 0.7); line(g, [[s * 34, -86], [s * 37, -54], [s * 35, -22]], lw * 0.7); });
    // Sugarfoot's brown legs and white chest stripe; Tidbit's tan chest
    if (sug) {
      [-1, 1].forEach(function (s) { if (wave && s === 1) return; shape(g, [[s * 6, -86], [s * 22, -96], [s * 36, -86], [s * 38, -50], [s * 36, -16], [s * 8, -16], [s * 4, -50]], col(c.leg), lw * 0.8);
      });
      shape(g, [[-32, HY + 56], [0, HY + 64], [32, HY + 56], [36, -100], [24, -72], [0, -62], [-24, -72], [-36, -100]], col(c.tan), lw * 0.75);
      shape(g, [[-24, HY + 62], [0, HY + 70], [24, HY + 62], [28, -98], [18, -76], [0, -68], [-18, -76], [-28, -98]], col(c.white), lw * 0.75);
    } else shape(g, [[-34, HY + 54], [0, HY + 64], [34, HY + 54], [38, -100], [24, -76], [0, -66], [-24, -76], [-38, -100]], col(c.tan), lw * 0.8);   // big tan chest patch
    // paws: Tidbit's tan socks run up the leg in one smooth shape
    [-1, 1].forEach(function (s) {
      if (!(wave && s === 1)) { if (!sug) shape(g, [[s * 6, -14], [s * 6, -60], [s * 21, -66], [s * 36, -60], [s * 37, -14]], col(c.sock), lw * 0.75);
        shape(g, [[s * 4, -2], [s * 6, -16], [s * 22, -22], [s * 38, -16], [s * 40, -2]], col(c.paw), lw * 0.85);
        [10, 18, 27, 35].forEach(function (x) { ell(g, s * x, 0, 2.6, 1.8, 0, mono ? OUT : c.nail, 0); }); }
      line(g, [[s * 17, -14], [s * 17, -3]], lw * 0.55); line(g, [[s * 27, -14], [s * 27, -3]], lw * 0.55);
      shape(g, [[s * 44, -2], [s * 46, -14], [s * 62, -18], [s * 76, -10], [s * 74, 0]], col(c.paw), lw * 0.85); // back feet at the sides
      line(g, [[s * 58, -12], [s * 58, -2]], lw * 0.5); line(g, [[s * 66, -12], [s * 66, -2]], lw * 0.5);
    });
    // (no collar: he has none in his photo)
    // face (the show's markings)
    g.save(); g.translate(0, HY);
    if (sug) {
      // from her photo: black stripe from the forehead down the top of the muzzle (wider toward the nose), tan cheeks and
      // tan brow streaks, a tan muzzle, white round the mouth and chin, a big smile
      [-1, 1].forEach(function (s) {
        shape(g, [[s * 14, -6], [s * 30, -4], [s * 48, 6], [s * 56, 26], [s * 46, 46], [s * 26, 54], [s * 16, 40], [s * 12, 14]], col(c.tan), lw * 0.8);   // tan cheek
        shape(g, [[s * 10, -30], [s * 12, -48], [s * 24, -60], [s * 42, -58], [s * 52, -44], [s * 48, -26], [s * 34, -26], [s * 20, -26]], col(c.brow), lw * 0.7);   // big tan brow, up toward the ear
      });
      shape(g, [[-30, 22], [-24, 2], [-12, -4], [0, -2], [12, -4], [24, 2], [30, 22], [24, 44], [0, 52], [-24, 44]], col(c.tan), lw * 0.8);              // tan muzzle
      shape(g, [[-7, -44], [7, -44], [12, -14], [15, 6], [0, 10], [-15, 6], [-12, -14]], mono ? '#FFFFFF' : c.coat, lw * 0.7);                           // the black stripe, widening to the nose
      shape(g, [[-24, 30], [-12, 24], [0, 28], [12, 24], [24, 30], [20, 46], [8, 56], [0, 58], [-8, 56], [-20, 46]], col(c.white), lw * 0.75);           // white round the mouth and chin
    } else {
      // from his photo: big tan oval brows, a broad black bridge down to a big nose, tan cheeks, muzzle sides and chin
      [-1, 1].forEach(function (s) {
        shape(g, [[s * 14, -2], [s * 32, -4], [s * 50, 8], [s * 56, 28], [s * 44, 46], [s * 22, 54], [s * 14, 36], [s * 12, 12]], col(c.tan), lw * 0.8);   // tan cheek and muzzle side
        ell(g, s * 25, -40, 12, 8.5, s * -0.35, col(c.brow), lw * 0.7);                                                                               // tan oval brow
      });
      shape(g, [[-22, 30], [-10, 26], [0, 30], [10, 26], [22, 30], [18, 46], [6, 56], [0, 58], [-6, 56], [-18, 46]], col(c.chin), lw * 0.7);              // lighter tan chin
      shape(g, [[-9, -34], [9, -34], [15, -10], [17, 6], [0, 10], [-17, 6], [-15, -10]], mono ? '#FFFFFF' : c.coat, lw * 0.7);                           // broad black bridge
    }
    // eyes: the show's warm brown, big and kind, with two catchlights
    [-1, 1].forEach(function (s) { ell(g, s * 26, -14, 13, 14.5, 0, '#FFFFFF', lw * 0.75); ell(g, s * 26 + 1.5, -13, 10.2, 11.6, 0, mono ? OUT : c.eye, 0); ell(g, s * 26 + 2, -12, 5.4, 6.2, 0, OUT, 0); ell(g, s * 26 + 5.5, -17.5, 4.2, 4.2, 0, '#FFFFFF', 0); ell(g, s * 26 - 2.5, -7, 1.9, 1.9, 0, '#FFFFFF', 0); });
    shape(g, [[-16, 8], [0, 3], [16, 8], [11, 18], [0, 21], [-11, 18]], OUT, lw * 0.5); ell(g, -3, 8, 3, 1.8, 0, mono ? '#FFFFFF' : '#8A7F7A', 0);
    line(g, [[0, 19], [0, 25]], lw * 0.75); line(g, [[-16, 23], [-8, 29], [0, 25], [8, 29], [16, 23]], lw * 0.75);
    shape(g, [[-8, 28], [8, 28], [9, 40], [0, 46], [-9, 40]], col(c.tongue), lw * 0.7); line(g, [[0, 30], [0, 38]], lw * 0.4);
    if (!mono) [-1, 1].forEach(function (s) { ell(g, s * 46, 16, 7, 4.5, 0, 'rgba(238,143,166,0.4)', 0); });
    if (sug) [-1, 1].forEach(function (s) { shape(g, [[s * 30, -62], [s * 56, -72], [s * 80, -60], [s * 92, -30], [s * 86, -2], [s * 72, -8], [s * 58, -30], [s * 46, -44]], col(c.ear), lw);
      shape(g, [[s * 60, -58], [s * 76, -54], [s * 84, -32], [s * 80, -16], [s * 70, -24], [s * 62, -40]], col(c.earIn), lw * 0.6); });
    else [-1, 1].forEach(function (s) { shape(g, [[s * 40, -60], [s * 62, -56], [s * 78, -30], [s * 80, 8], [s * 70, 34], [s * 54, 30], [s * 48, 4], [s * 44, -28]], col(c.ear), lw); });   // soft drop ears hanging beside his face
    g.restore();
    if (wave && sug) { blob(g, [arm], col(c.leg), lw); }
    if (wave) { shape(g, [[18, -60], [24, -70], [40, -72], [50, -62], [46, -46], [30, -42], [20, -48]], col(c.paw), lw * 0.85);   // the lifted paw, hanging from the bent wrist
      line(g, [[30, -48], [30, -44]], lw * 0.5); line(g, [[38, -48], [39, -44]], lw * 0.5); }
  }
  window.PUPF = { draw: pup };
})();
