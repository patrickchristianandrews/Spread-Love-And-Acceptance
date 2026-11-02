// concept: Tidbit and Sugarfoot redrawn as outlined cartoon dogs (side view, facing right). Units: paws on y=0, about 200 tall.
(function () {
  var OUT = '#2B211C';
  function P(g, pts, close) { // smooth closed curve through points (Catmull-Rom -> bezier)
    var n = pts.length; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (var i = 0; i < (close ? n : n - 1); i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n], k = 1 / 6;
      if (!close) { if (i === 0) p0 = p1; if (i + 2 >= n) p3 = p2; }
      g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
    }
    if (close) g.closePath();
  }
  function blob(g, list, fill, lw) {
    g.lineJoin = 'round'; g.lineCap = 'round';
    list.forEach(function (pts) { P(g, pts, true); g.lineWidth = lw * 2; g.strokeStyle = OUT; g.stroke(); });
    list.forEach(function (pts) { P(g, pts, true); g.fillStyle = fill; g.fill(); });
  }
  function shape(g, pts, fill, lw, close) { P(g, pts, close !== false); g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = OUT; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }
  function line(g, pts, lw) { P(g, pts, false); g.lineWidth = lw; g.strokeStyle = OUT; g.lineCap = 'round'; g.stroke(); }
  function ell(g, x, y, rx, ry, rot, fill, lw) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); if (lw) { g.lineWidth = lw; g.strokeStyle = OUT; g.stroke(); } }
  function flick(g, x, y, ang, len, lw, col) { var c = Math.cos(ang), s = Math.sin(ang), n = [-s, c];
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + c * len * 0.5 + n[0] * len * 0.18, y + s * len * 0.5 + n[1] * len * 0.18, x + c * len, y + s * len);
    g.lineWidth = lw; g.strokeStyle = col || OUT; g.lineCap = 'round'; g.stroke(); }
  var C = { tidbit: { coat: '#221D1B', tan: '#C98A52', brow: '#C98A52', sock: '#C98A52', paw: '#C98A52', nail: '#2A2422', tongue: '#EE8FA6', chin: '#D9B48C', eye: '#3A2418' },
            sugarfoot: { coat: '#252120', ear: '#252120', earIn: '#D9A38E', tan: '#D8AE82', brow: '#D8AE82', leg: '#A0562E', legLow: '#A0562E', paw: '#F2ECE3', nail: '#2A2422', tongue: '#EE8FA6', white: '#F2ECE3', eye: '#3A2418' } };
  function color(c, mono) { return mono ? '#FFFFFF' : c; }
  // one leg: from a hip/shoulder point down to a paw, soft and tapered
  function leg(g, x, top, footX, len, col, sock, paw, lw, mono) {
    var y0 = -top, y1 = -6;
    shape(g, [[x - 15, y0], [x + 14, y0], [x + 12 + (footX - x) * 0.4, y1 - len * 0.55], [footX + 9, y1 - len * 0.22], [footX + 8, y1], [footX - 8, y1], [footX - 9, y1 - len * 0.25], [x - 12 + (footX - x) * 0.4, y1 - len * 0.55]], color(col, mono), lw);
    if (sock) shape(g, [[footX - 10, y1 - 26], [footX, y1 - 30], [footX + 10, y1 - 26], [footX + 9, y1], [footX - 9, y1]], color(sock, mono), lw * 0.8);
    shape(g, [[footX - 11, -2], [footX - 6, -13], [footX + 10, -13], [footX + 17, -5], [footX + 15, 1], [footX - 9, 1]], color(paw, mono), lw);
    line(g, [[footX + 4, -9], [footX + 4, -1]], lw * 0.6); line(g, [[footX + 10, -9], [footX + 10, -1]], lw * 0.6);
  }
  var SKULL = [[-30, -6], [-24, -32], [0, -44], [24, -36], [34, -20], [52, -14], [64, -4], [64, 10], [50, 20], [26, 26], [0, 26], [-22, 18]];
  function head(g, who, hx, hy, s, mono, lw, look, part) {
    var c = C[who], sug = who === 'sugarfoot';
    g.save(); g.translate(hx, hy); g.scale(s, s);
    // far ear (Sugarfoot's long drop ears)
    if (part === 'back') { if (false) shape(g, [[-22, -22], [-34, 2], [-34, 34], [-22, 46], [-10, 30], [-8, 0]], color('#1E1918', mono), lw); g.restore(); return; }
    // head and snout in one outline: round skull, short rounded muzzle
    if (sug) {
      shape(g, [[-6, 6], [8, -2], [26, 2], [44, 8], [60, 10], [66, 14], [58, 22], [40, 28], [16, 28], [0, 22]], color(c.tan, mono), lw * 0.8);     // tan cheek and muzzle side
      shape(g, [[28, 14], [46, 12], [62, 14], [58, 22], [40, 28], [26, 26]], color(c.white, mono), lw * 0.7);                                       // white round the mouth and chin
      shape(g, [[-2, -20], [4, -32], [18, -38], [32, -34], [34, -24], [22, -22], [8, -18]], color(c.brow, mono), lw * 0.7);                       // big tan brow
    } else {
      shape(g, [[-4, 6], [10, -2], [28, 2], [46, 8], [60, 10], [66, 14], [58, 22], [40, 28], [16, 28], [0, 22]], color(c.tan, mono), lw * 0.8);     // tan cheek and muzzle side, under the black bridge
      shape(g, [[28, 16], [46, 14], [60, 16], [56, 24], [40, 28], [28, 26]], color(c.chin, mono), lw * 0.65);                                     // lighter tan chin
      ell(g, 14, -27, 10, 6.5, -0.15, color(c.brow, mono), lw * 0.7);                                                                              // tan oval brow
    }
    // nose, mouth, tongue
    ell(g, 64, -2, 10, 7.5, 0.1, OUT, 0); ell(g, 61, -5.5, 3.2, 2, 0, mono ? '#FFFFFF' : '#8A7F7A', 0); ell(g, 69, 0, 2.2, 1.5, 0.5, mono ? '#FFFFFF' : '#3B3431', 0);   // nose, shine, nostril
    if (sug) {   // her open smile
      line(g, [[60, 8], [52, 15], [42, 14]], lw * 0.8);
      shape(g, [[44, 15], [54, 15], [55, 27], [49, 31], [43, 25]], color(c.tongue, mono), lw * 0.75); line(g, [[49, 17], [49, 24]], lw * 0.45);
    } else {     // his calm closed smile
      line(g, [[62, 8], [54, 14], [40, 15], [34, 12]], lw * 0.8);
    }
    // big friendly eye
    ell(g, 18, -10, 10.5, 11.5, 0, '#FFFFFF', lw * 0.75); ell(g, 19.5, -9.5, 8.4, 9.4, 0, mono ? OUT : '#2A170D', 0);
    if (!mono) { ell(g, 19.5, -8.8, 6.8, 7.6, 0, '#4A2C1A', 0); ell(g, 19, -6.6, 4.8, 4, 0, '#6B4430', 0); }
    ell(g, 20.2, -8.8, 3.9, 4.5, 0, OUT, 0); ell(g, 22.6, -12.6, 3.3, 3.3, 0, '#FFFFFF', 0); ell(g, 16.8, -4.6, 1.5, 1.5, 0, '#FFFFFF', 0);
    g.beginPath(); g.arc(18, -8, 12.5, Math.PI * 1.15, Math.PI * 1.85); g.lineWidth = lw * 0.85; g.strokeStyle = OUT; g.lineCap = 'round'; g.stroke();   // eyelid
    [[48, 8], [52, 13], [46, 15]].forEach(function (p) { ell(g, p[0], p[1], 1.2, 1.2, 0, OUT, 0); });                                                        // whisker dots
    [[-12, -24, -1.6], [-2, -30, -1.45], [8, -30, -1.3]].forEach(function (f) { flick(g, f[0], f[1], f[2], 6, lw * 0.5, mono ? OUT : '#4A403C'); });       // fur on the head
    // near ear
    if (sug) { shape(g, [[-34, -30], [-18, -46], [2, -44], [10, -30], [4, -12], [-8, -2], [-22, -12]], color(c.ear, mono), lw); shape(g, [[-18, -36], [-4, -38], [0, -26], [-6, -14], [-16, -22]], color(c.earIn, mono), lw * 0.6); }
    else shape(g, [[-12, -34], [-30, -22], [-36, 4], [-30, 30], [-16, 38], [-4, 24], [-2, 0], [-2, -24]], color(c.coat, mono), lw);   // soft drop ear hanging beside his face
    g.restore();
  }
  function legPts(x, top, footX, len) {
    var y0 = -top, y1 = -6;
    return [[x - 15, y0], [x + 14, y0], [x + 12 + (footX - x) * 0.4, y1 - len * 0.55], [footX + 9, y1 - len * 0.22], [footX + 8, y1], [footX - 8, y1], [footX - 9, y1 - len * 0.25], [x - 12 + (footX - x) * 0.4, y1 - len * 0.55]];
  }
  function pawPts(fx) { return [[fx - 11, -2], [fx - 7, -14], [fx + 9, -14], [fx + 17, -6], [fx + 15, 1], [fx - 9, 1]]; }
  function sockPts(fx) { return [[fx - 10, -4], [fx - 12, -52], [fx, -60], [fx + 12, -52], [fx + 11, -4]]; }
  function toes(g, fx, lw) { [2, 7, 12].forEach(function (d) { line(g, [[fx + d, -11], [fx + d, -1]], lw * 0.5); }); }
  function pup(g, who, pose, o) {
    o = o || {}; var mono = !!o.mono, lw = o.lw || 3.4, c = C[who], sug = who === 'sugarfoot';
    var w = sug ? 1.06 : 1, W = function (L) { return L.map(function (p) { return [p[0] * w, p[1]]; }); };
    var far = sug ? '#7E4426' : '#1E1918', farPaw = sug ? '#D9D2C7' : '#C48A55', nearLeg = sug ? c.leg : c.coat;
    g.save(); if (o.left) g.scale(-1, 1);
    var coat = [], legs = [], paws = [], hx, hy, hs;
    if (pose === 'sit') {
      coat.push([[-52, -14], [-74, -22], [-88, -40], [-82, -46], [-68, -32], [-50, -26]]);
      blob(g, [legPts(26, 70, 30, 60)], color(far, mono), lw); shape(g, pawPts(30), color(farPaw, mono), lw * 0.85); toes(g, 30, lw);
      coat.push(W([[-6, -128], [-34, -112], [-56, -82], [-66, -46], [-62, -14], [-40, 0], [0, 0], [18, -20], [30, -60], [38, -100], [26, -126]]));
      if (!sug) coat.push(legPts(14, 76, 20, 64)); else legs.push(legPts(14, 76, 20, 64));
      paws.push(20); hx = 32; hy = -150; hs = 1.32;
    } else {
      var a = o.step || 0;
      coat.push([[-76, -112], [-94, -128], [-100, -146], [-92, -150], [-84, -134], [-70, -122]]);
      [[30, 86, 32 - a * 10], [-54, 84, -54 + a * 10]].forEach(function (L) { blob(g, [legPts(L[0], L[1], L[2], 80)], color(far, mono), lw); if (!sug) shape(g, sockPts(L[2]), color('#B7793F', mono), lw * 0.8); shape(g, pawPts(L[2]), color(farPaw, mono), lw * 0.85); toes(g, L[2], lw); });
      coat.push(W([[-84, -106], [-70, -130], [-30, -138], [16, -136], [48, -126], [64, -104], [58, -80], [36, -66], [8, -70], [-26, -76], [-56, -70], [-80, -80]]));
      [[22, 90, 24 + a * 10], [-44, 88, -44 - a * 10]].forEach(function (L) { (sug ? legs : coat).push(legPts(L[0], L[1], L[2], 84)); paws.push(L[2]); });
      hx = 54 * w; hy = -152; hs = 1.22;
    }
    head(g, who, hx, hy, hs, mono, lw / hs, o.look, 'back');   // Sugarfoot's far ear, behind everything
    coat.push(SKULL.map(function (p) { return [hx + p[0] * hs, hy + p[1] * hs]; }));
    blob(g, coat, color(c.coat, mono), lw);       // tail, body, near legs and head: one shape, one outline
    if (pose === 'sit') line(g, [[-18 * w, -84], [-48 * w, -70], [-54 * w, -40], [-38 * w, -18]], lw * 0.75); // the haunch, a soft contour
    else line(g, [[-46 * w, -126], [-70 * w, -112], [-72 * w, -86]], lw * 0.75);
    if (pose === 'sit') { shape(g, [[-42 * w, -14], [-6, -16], [10, -10], [12, 0], [-44 * w, 0]], color(c.paw, mono), lw * 0.85); }
    legs.forEach(function (L) { blob(g, [L], color(nearLeg, mono), lw); });

    var chestSit = sug ? [[22, -120], [34, -112], [38, -90], [32, -66], [24, -70], [22, -96]] : [[10, -124], [32, -116], [40, -92], [34, -64], [22, -62], [12, -88]];
    var chestStand = sug ? [[42, -124], [56, -114], [62, -96], [56, -78], [46, -82], [44, -104]] : [[30, -128], [54, -118], [64, -96], [56, -74], [42, -72], [32, -98]];
    shape(g, pose === 'sit' ? chestSit : chestStand, color(sug ? c.white : c.tan, mono), lw * 0.8);
    paws.forEach(function (fx) { if (!sug) shape(g, sockPts(fx), color(c.tan, mono), lw * 0.8); shape(g, pawPts(fx), color(c.paw, mono), lw * 0.85); toes(g, fx, lw); [fx + 2, fx + 8, fx + 14].forEach(function (x) { ell(g, x + 2, 0, 2.4, 1.6, 0, mono ? OUT : c.nail, 0); }); });
    // (no collar: he has none in his photo)
    head(g, who, hx, hy, hs, mono, lw / hs, o.look, 'front');
    g.restore();
  }
  window.PUP2 = { draw: pup };
})();
