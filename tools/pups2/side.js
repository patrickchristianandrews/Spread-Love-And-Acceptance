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
  var C = {
    tidbit: { coat: '#2A2321', tan: '#C98A4F', tan2: '#D9A066', paw: '#D9A066', tongue: '#EE8FA6', collar: '#D9483B', tag: '#F2C14E' },
    sugarfoot: { coat: '#2A2321', tan: '#C9965F', tan2: '#D8AC78', paw: '#F4EFE6', tongue: '#EE8FA6', white: '#F4EFE6' }
  };
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
    if (part === 'back') { if (sug) shape(g, [[-22, -22], [-34, 2], [-34, 34], [-22, 46], [-10, 30], [-8, 0]], color('#1E1918', mono), lw); g.restore(); return; }
    // head and snout in one outline: round skull, short rounded muzzle
    if (sug) {
      shape(g, [[2, -14], [20, -22], [36, -14], [52, -10], [62, 0], [60, 12], [46, 20], [22, 24], [2, 22], [-6, 10], [-4, -4]], color(c.tan, mono), lw * 0.8); // tan face
      shape(g, [[-6, -34], [8, -40], [14, -32], [6, -24], [-4, -26]], color(c.tan2, mono), lw * 0.7); // brow
    } else {
      shape(g, [[22, 4], [40, -2], [58, 2], [64, 10], [52, 20], [30, 24], [16, 18]], color(c.tan, mono), lw * 0.8); // tan muzzle
      ell(g, 2, -24, 6.5, 5.5, 0, color(c.tan2, mono), lw * 0.7); // brow dot
      ell(g, 6, 14, 8, 7, 0, color(c.tan, mono), lw * 0.7); // cheek
    }
    // nose, mouth, tongue
    ell(g, 63, -2, 9, 7, 0.1, OUT, 0); ell(g, 60, -5, 3, 2, 0, mono ? '#FFFFFF' : '#8A7F7A', 0);
    line(g, [[60, 8], [52, 15], [42, 14]], lw * 0.8);
    shape(g, [[44, 15], [54, 15], [55, 27], [49, 31], [43, 25]], color(c.tongue, mono), lw * 0.75);
    line(g, [[49, 17], [49, 24]], lw * 0.45);
    // big friendly eye
    ell(g, 17, -10, 11, 12.5, 0, '#FFFFFF', lw * 0.8); ell(g, 19, -9, 8.2, 9.6, 0, OUT, 0); ell(g, 22, -13, 3.4, 3.4, 0, '#FFFFFF', 0); ell(g, 16.5, -4.5, 1.6, 1.6, 0, '#FFFFFF', 0);
    // near ear
    if (sug) shape(g, [[-14, -28], [-30, -14], [-34, 18], [-26, 44], [-12, 50], [-2, 32], [-2, 0], [-4, -22]], color(c.coat, mono), lw);
    else shape(g, [[-18, -34], [-2, -54], [16, -50], [24, -40], [12, -34], [-6, -26]], color(c.coat, mono), lw); // folded ear tipping forward
    g.restore();
  }
  function legPts(x, top, footX, len) {
    var y0 = -top, y1 = -6;
    return [[x - 15, y0], [x + 14, y0], [x + 12 + (footX - x) * 0.4, y1 - len * 0.55], [footX + 9, y1 - len * 0.22], [footX + 8, y1], [footX - 8, y1], [footX - 9, y1 - len * 0.25], [x - 12 + (footX - x) * 0.4, y1 - len * 0.55]];
  }
  function pawPts(fx) { return [[fx - 11, -2], [fx - 7, -14], [fx + 9, -14], [fx + 17, -6], [fx + 15, 1], [fx - 9, 1]]; }
  function sockPts(fx) { return [[fx - 10, -4], [fx - 10, -26], [fx, -31], [fx + 10, -26], [fx + 11, -4]]; }
  function toes(g, fx, lw) { line(g, [[fx + 4, -10], [fx + 4, -1]], lw * 0.55); line(g, [[fx + 10, -10], [fx + 10, -1]], lw * 0.55); }
  function pup(g, who, pose, o) {
    o = o || {}; var mono = !!o.mono, lw = o.lw || 3.4, c = C[who], sug = who === 'sugarfoot';
    var w = sug ? 1.06 : 1, W = function (L) { return L.map(function (p) { return [p[0] * w, p[1]]; }); };
    var far = sug ? '#8E5530' : '#1E1918', farPaw = sug ? '#D9D2C7' : '#C48A55', nearLeg = sug ? '#A45C2E' : c.coat;
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
    var chestSit = sug ? [[26, -104], [36, -86], [32, -62], [24, -70], [20, -92]] : [[18, -108], [36, -100], [36, -78], [26, -66], [16, -82]];
    var chestStand = sug ? [[44, -112], [58, -100], [54, -80], [46, -84], [40, -100]] : [[36, -118], [58, -108], [56, -86], [44, -78], [34, -96]];
    shape(g, pose === 'sit' ? chestSit : chestStand, color(sug ? c.white : c.tan, mono), lw * 0.8);
    paws.forEach(function (fx) { if (!sug) shape(g, sockPts(fx), color(c.tan, mono), lw * 0.8); shape(g, pawPts(fx), color(c.paw, mono), lw * 0.85); toes(g, fx, lw); });
    if (!sug) {
      if (pose === 'sit') { shape(g, [[2, -124], [24, -116], [40, -118], [38, -108], [20, -104], [0, -112]], color(c.collar, mono), lw * 0.8); ell(g, 28, -100, 5, 5.5, 0, color(c.tag, mono), lw * 0.7); }
      else { shape(g, [[26, -132], [44, -122], [58, -124], [56, -114], [42, -110], [24, -120]], color(c.collar, mono), lw * 0.8); ell(g, 48, -106, 5, 5.5, 0, color(c.tag, mono), lw * 0.7); }
    }
    head(g, who, hx, hy, hs, mono, lw / hs, o.look, 'front');
    g.restore();
  }
  window.PUP2 = { draw: pup };
})();
