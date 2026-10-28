/* brain-art.js: the drawing for the Brain Map page (/brain-map.html).
   Two views of one brain, drawn as inline SVG strings: the outside (the left side, front on the left) and the inside (a cutaway cut a
   little to the side of the center, so the deep parts show together). It holds shapes and positions only. What each part is called, what
   it does and what research says about it are in brain-data.js.

   window.TOLBrainArt
     build(view, o)    the whole map as an <svg> string. view: 'outside' | 'inside'. o: { id (a prefix, so two maps on one page do not share ids),
                       interactive (regions are buttons), labels (draw the names), regions (data), title, desc }
     paintLayer(view, state)   the markers, rings and network wires for one moment, as the inner markup of the layers (see brain-map.js)
     glyph(key, size)  one marker icon as an <svg> string (the legend and the lists use it)
     netIcon(color)    a tiny dotted wire icon for the network buttons
     overlap(d, o)     two bell curves d standard deviations apart, as an <svg> string, and the share they overlap
   The shapes are made for a 640 by 440 box. Colors are set here and stay as drawn in dark mode (the site turns svg back, so this
   page's maps always sit on a cream plate). Nothing is stored or sent. */
(function () {
  'use strict';
  if (window.TOLBrainArt) return;

  var INK = '#2B2620', PLATE = '#FBF5E6', CREAM = '#FFFDF7', LINE = '#E3D6B4', SOFT = '#7B715F';
  // region colors: warm, muted, each easy to tell apart. Names, markers and shapes carry the meaning too, never color alone.
  var COLOR = {
    pfc: '#6E9BD1', acc: '#3FA79B', insula: '#A874C9', amygdala: '#E2684F', hippocampus: '#D8679C',
    striatum: '#E4AE2C', thalamus: '#55AE82', cerebellum: '#B98B64', senses: '#4DA6C9', tpj: '#86A94F'
  };
  var NETCOLOR = { default: '#C2417A', salience: '#D97706', control: '#1D4ED8', habit: '#0F766E', reading: '#7C3AED' };

  // ---------- shared pieces ----------
  // the outline of the cerebrum seen from the left (front on the left), as a start point and eleven curves
  var START = [126, 300];
  var SEG = [[84, 282, 52, 238, 60, 190], [74, 128, 140, 78, 224, 58], [304, 40, 396, 40, 472, 68], [552, 98, 604, 160, 598, 230],
    [595, 268, 572, 292, 538, 304], [516, 311, 496, 308, 474, 314], [452, 322, 440, 340, 412, 350], [372, 362, 322, 372, 274, 364],
    [226, 356, 190, 336, 176, 318], [168, 306, 178, 296, 182, 288], [170, 296, 150, 306, 126, 300]];
  function f(n) { return Math.round(n * 10) / 10; }
  function pathOf(start, segs) {
    var d = 'M' + start[0] + ' ' + start[1];
    segs.forEach(function (g) { d += 'C' + g.join(' '); });
    return d;
  }
  var CEREBRUM = pathOf(START, SEG) + 'Z';
  // a stretch of the outline, from curve i at t0 to curve j at t1, as an open path (for the bands along the rim in the inside view)
  function split(p0, g, t0, t1) {
    var P = [p0, [g[0], g[1]], [g[2], g[3]], [g[4], g[5]]];
    function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
    function cut(P, t) { var a = lerp(P[0], P[1], t), b = lerp(P[1], P[2], t), c = lerp(P[2], P[3], t), d = lerp(a, b, t), e = lerp(b, c, t), m = lerp(d, e, t); return [[P[0], a, d, m], [m, e, c, P[3]]]; }
    var R = P;
    if (t1 < 1) R = cut(R, t1)[0];
    if (t0 > 0) R = cut(R, t0 / (t1 < 1 ? t1 : 1))[1];
    return R;
  }
  function rim(parts) { // parts: [[curve index, t0, t1], ...] in order along the outline
    var d = '';
    parts.forEach(function (q, k) {
      var i = q[0], p0 = i === 0 ? START : [SEG[i - 1][4], SEG[i - 1][5]];
      var R = split(p0, SEG[i], q[1], q[2]);
      if (k === 0) d += 'M' + f(R[0][0]) + ' ' + f(R[0][1]);
      d += 'C' + f(R[1][0]) + ' ' + f(R[1][1]) + ' ' + f(R[2][0]) + ' ' + f(R[2][1]) + ' ' + f(R[3][0]) + ' ' + f(R[3][1]);
    });
    return d;
  }
  var CEREBELLUM = 'M452 306C480 294 540 298 568 316C592 332 584 372 544 388C504 400 462 384 444 352C436 336 438 316 452 306Z';
  var STEM = 'M386 352C382 378 386 404 394 426L432 426C430 400 434 374 448 354C432 354 406 362 386 352Z';

  // folds: a few named grooves, then many small soft curls placed by a fixed recipe, so it reads as a brain and not a bean
  var SULCI_OUT = [
    'M182 288C240 276 310 262 380 240C410 232 430 224 450 210',                        // lateral fissure
    'M340 48C352 90 362 130 384 176C392 192 398 204 404 214',                          // central sulcus
    'M502 72C494 100 488 130 482 162',                                                 // parieto-occipital
    'M214 330C280 324 350 310 420 284C440 276 452 270 462 260',                       // upper temporal groove
    'M250 350C310 350 370 340 430 322',                                                // lower temporal groove
    'M118 158C170 118 232 98 300 90',                                                  // upper frontal groove
    'M96 240C150 226 190 240 244 240'                                                  // lower frontal groove
  ];
  var FOLIA = ['M456 322C490 312 536 314 566 326', 'M452 338C488 330 540 332 574 344', 'M452 354C490 348 536 350 568 360', 'M462 370C494 366 530 366 552 374'];

  // ---------- where each region is, in each view ----------
  // shapes: [path d, 'fill'] a filled shape, or [path d, 'band', width] a thick line
  // at: the middle of the region (where its markers start and where network wires meet)
  // label: [x, y, anchor, text override, leader end x, leader end y]; hit: [cx, cy, r], a wider invisible target for small parts
  var OUT = {
    pfc: { shapes: [['M126 300C84 282 52 238 60 190C74 128 140 78 224 58C246 53 262 52 276 52C286 96 292 140 276 186C266 216 236 246 200 270C176 286 150 298 126 300Z', 'fill']],
      at: [142, 186], label: [140, 126, 'middle'] },
    senses: { shapes: [['M366 48C376 92 386 132 408 180C414 194 420 204 424 212', 'band', 22], ['M540 98C580 130 598 180 598 226C597 262 576 290 540 302C520 306 506 306 494 308C520 270 530 190 540 98Z', 'fill'],
        ['M214 318C280 312 340 298 396 270', 'band', 20]],
      at: [390, 118], label: [392, 36, 'middle'], extra: [{ at: [566, 208], label: [560, 222, 'middle', 'vision'] }, { at: [300, 306], label: [300, 346, 'middle', 'hearing'] }] },
    tpj: { shapes: [['M410 214C430 190 480 196 490 226C498 252 480 280 452 288C430 292 404 276 402 252C400 238 402 224 410 214Z', 'fill']],
      at: [446, 226], mk: [446, 272], label: [446, 224, 'middle', 'Temporal-\nparietal'] },
    cerebellum: { shapes: [[CEREBELLUM, 'fill']], at: [516, 350], label: [516, 412, 'middle'] }
  };
  var INN = {
    pfc: { shapes: [['M126 300C84 282 52 238 60 190C74 128 140 78 224 58C244 54 262 56 276 62C246 84 222 116 208 154C198 180 194 206 196 232C186 256 160 288 126 300Z', 'fill']],
      at: [118, 196], label: [112, 142, 'middle'] },
    acc: { shapes: [['M206 190C202 146 238 104 292 98C322 95 346 102 362 114', 'band', 15]],
      at: [284, 100], label: [252, 34, 'middle', null, 268, 90], hit: [284, 102, 36] },
    insula: { shapes: [['M180 262C176 240 192 224 212 226C232 228 244 246 238 266C232 284 214 292 198 288C188 284 182 274 180 262Z', 'fill']],
      at: [210, 258], label: [150, 330, 'middle', null, 184, 286], hit: [210, 258, 40] },
    amygdala: { shapes: [['M274 298C274 286 286 278 300 280C316 282 322 294 316 304C310 314 292 318 282 313C276 309 274 304 274 298Z', 'fill']],
      at: [296, 298], label: [262, 350, 'middle', null, 284, 318], hit: [296, 298, 40] },
    hippocampus: { shapes: [['M320 308C354 324 398 316 414 284C424 260 414 236 396 222', 'band', 14]],
      at: [392, 300], mk: [400, 330], label: [448, 304, 'middle', null, 418, 288], hit: [392, 292, 44] },
    striatum: { shapes: [['M236 184C234 164 250 154 264 160C276 166 280 180 276 194C272 208 252 206 242 200C238 196 236 190 236 184Z', 'fill'],
        ['M274 170C312 156 364 160 398 186', 'band', 11], ['M244 246C238 226 248 210 262 212C276 214 284 232 280 252C276 270 260 274 252 266C248 260 246 254 244 246Z', 'fill']],
      at: [262, 190], mk: [256, 236], label: [472, 174, 'middle', null, 410, 186], hit: [264, 214, 46] },
    thalamus: { shapes: [['M296 216C296 198 316 188 338 191C360 194 370 208 365 222C360 236 336 244 316 240C302 236 296 228 296 216Z', 'fill']],
      at: [332, 216], label: [338, 262, 'middle'], hit: [332, 216, 40] },
    cerebellum: { shapes: [[CEREBELLUM, 'fill']], at: [516, 350], label: [516, 412, 'middle'] },
    senses: { shapes: [[rim([[2, .4, .62]]), 'rim', 18], [rim([[3, .5, 1], [4, 0, .85]]), 'rim', 18], [rim([[7, .12, .86]]), 'rim', 18]],
      at: [352, 54], label: [372, 30, 'middle'], extra: [{ at: [588, 232], label: [556, 212, 'middle', 'vision'] }, { at: [330, 352], label: [330, 396, 'middle', 'hearing'] }] },
    tpj: { shapes: [[rim([[2, .78, 1], [3, 0, .38]]), 'rim', 18]],
      at: [504, 84], label: [510, 30, 'middle', 'Temporal-parietal'], hit: [498, 86, 44] }
  };
  // fine lines drawn on top of a part (folds and texture), only for looks
  INN.insula.detail = ['M192 262C192 246 204 238 218 242', 'M200 274C214 280 230 272 232 258', 'M206 258C208 252 216 250 220 256'];
  INN.hippocampus.detail = ['M334 322C354 330 380 326 396 312', 'M340 316C352 322 372 320 384 308'];
  INN.thalamus.detail = ['M332 196C330 210 332 226 336 238'];
  INN.striatum.detail = ['M250 226C254 240 256 252 254 264', 'M262 218C268 232 268 248 264 262'];
  INN.amygdala.detail = ['M290 290C296 296 304 296 308 292'];
  var VIEWS = { outside: OUT, inside: INN };

  // ---------- helpers ----------
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // the same recipe every time: a small seeded random number
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var poly = null;
  function outlinePoly() { // the outline as a list of points, for "is this point inside the brain?"
    if (poly) return poly;
    poly = [];
    var cur = START;
    SEG.forEach(function (g) {
      for (var i = 1; i <= 12; i++) {
        var t = i / 12, u = 1 - t;
        poly.push([u * u * u * cur[0] + 3 * u * u * t * g[0] + 3 * u * t * t * g[2] + t * t * t * g[4], u * u * u * cur[1] + 3 * u * u * t * g[1] + 3 * u * t * t * g[3] + t * t * t * g[5]]);
      }
      cur = [g[4], g[5]];
    });
    return poly;
  }
  function inside(x, y) {
    var P = outlinePoly(), c = false;
    for (var i = 0, j = P.length - 1; i < P.length; j = i++) {
      if (((P[i][1] > y) !== (P[j][1] > y)) && (x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0])) c = !c;
    }
    return c;
  }
  var CURLS = null;
  function curls() { // little soft squiggles that suggest the folds of the cortex
    if (CURLS) return CURLS;
    var r = rng(29), out = [], step = 27;
    for (var y = 52; y < 360; y += step) {
      for (var x = 56; x < 604; x += step) {
        var cx = x + (y / step % 2 ? step / 2 : 0) + (r() - .5) * 12, cy = y + (r() - .5) * 12;
        if (!inside(cx, cy) || !inside(cx - 14, cy) || !inside(cx + 14, cy) || !inside(cx, cy + 12) || !inside(cx, cy - 12)) continue;
        var ang = Math.sin(cx / 64) * 1.1 + Math.cos(cy / 44) * .9 + (r() - .5) * 1.1, L = 13 + r() * 6, k = (r() > .5 ? 1 : -1) * (5 + r() * 4);
        var dx = Math.cos(ang) * L, dy = Math.sin(ang) * L, nx = -Math.sin(ang) * k, ny = Math.cos(ang) * k;
        out.push('M' + f(cx - dx) + ' ' + f(cy - dy) + 'q' + f(nx + dx * .5) + ' ' + f(ny + dy * .5) + ' ' + f(dx) + ' ' + f(dy) + 't' + f(dx) + ' ' + f(dy));
      }
    }
    CURLS = out;
    return out;
  }

  function shapeMarkup(sh, color, cls) {
    if (sh[1] === 'band' || sh[1] === 'rim') {
      var w = sh[1] === 'rim' ? sh[2] * 2 : sh[2];
      return '<path class="bm-edge" d="' + sh[0] + '" fill="none" stroke="' + INK + '" stroke-width="' + (w + 3) + '" stroke-linecap="' + (sh[1] === 'rim' ? 'butt' : 'round') + '"/>' +
        '<path class="' + cls + ' bm-bandc" d="' + sh[0] + '" fill="none" stroke="' + color + '" stroke-width="' + w + '" stroke-linecap="' + (sh[1] === 'rim' ? 'butt' : 'round') + '" stroke-linejoin="round"/>';
    }
    return '<path class="' + cls + '" d="' + sh[0] + '" fill="' + color + '" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>';
  }
  function ringMarkup(sh, color) {
    if (sh[1] === 'band' || sh[1] === 'rim') return '<path class="bm-ringp" d="' + sh[0] + '" fill="none" stroke="' + color + '" stroke-width="' + ((sh[1] === 'rim' ? sh[2] * 2 : sh[2]) + 10) + '" stroke-linecap="round" stroke-linejoin="round"/>';
    return '<path class="bm-ringp" d="' + sh[0] + '" fill="none" stroke="' + color + '" stroke-width="8" stroke-linejoin="round"/>';
  }
  function labelMarkup(text, l, sub) {
    var anchor = l[2] || 'middle', t = sub || l[3] || text, leader = '';
    if (l[4] != null && l[5] != null) leader = '<path class="bm-leader" d="M' + l[0] + ' ' + (l[1] - 6) + 'L' + l[4] + ' ' + l[5] + '" fill="none"/>';
    var lines = String(t).split('\n'), tx = '<text class="bm-lab" x="' + l[0] + '" y="' + l[1] + '" text-anchor="' + anchor + '">';
    lines.forEach(function (ln, i) { tx += '<tspan x="' + l[0] + '"' + (i ? ' dy="22"' : '') + '>' + esc(ln) + '</tspan>'; });
    return leader + tx + '</text>';
  }

  // ---------- the drawing ----------
  function build(view, o) {
    o = o || {};
    var id = o.id || 'bm', R = VIEWS[view], inn = view === 'inside';
    var regs = o.regions || [], byId = {}; regs.forEach(function (r) { byId[r.id] = r; });
    var s = [];
    s.push('<svg class="bm-svg" viewBox="0 0 640 440" xmlns="http://www.w3.org/2000/svg" focusable="false" role="group" aria-labelledby="' + id + '-t ' + id + '-d">');
    s.push('<title id="' + id + '-t">' + esc(o.title || (inn ? 'Inside view of the brain' : 'Outside view of the brain')) + '</title>');
    s.push('<desc id="' + id + '-d">' + esc(o.desc || '') + '</desc>');
    s.push('<defs><clipPath id="' + id + '-clip"><path d="' + CEREBRUM + '"/></clipPath>' +
      '<pattern id="' + id + '-dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="' + LINE + '"/></pattern>' +
      '<radialGradient id="' + id + '-cx" cx="46%" cy="38%" r="70%"><stop offset="0" stop-color="#FFF8EA"/><stop offset="1" stop-color="#F1DFBD"/></radialGradient>' +
      '<radialGradient id="' + id + '-sh" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#6B5A3A" stop-opacity=".22"/><stop offset="1" stop-color="#6B5A3A" stop-opacity="0"/></radialGradient></defs>');
    // the plate
    s.push('<rect class="bm-plate" width="640" height="440" rx="22" fill="' + PLATE + '"/><rect width="640" height="440" rx="22" fill="url(#' + id + '-dots)" opacity=".8"/>');
    s.push('<rect x="7" y="7" width="626" height="426" rx="16" fill="none" stroke="' + LINE + '" stroke-width="1.5"/>');
    s.push('<text class="bm-dir" x="30" y="426">← front</text><text class="bm-dir" x="610" y="426" text-anchor="end">back →</text>');
    s.push('<ellipse cx="338" cy="392" rx="270" ry="22" fill="url(#' + id + '-sh)"/>');
    s.push('<g class="bm-anat" aria-hidden="true">');
    s.push('<path d="' + STEM + '" fill="#E9DCC0" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>');
    if (inn) {
      // the cut face: a cortex rim, white matter, the corpus callosum and the cerebellum with its branching tree
      s.push('<path d="' + CEREBRUM + '" fill="#EDBFA7" stroke="none"/>');
      s.push('<path d="' + CEREBRUM + '" fill="url(#' + id + '-cx)" transform="translate(330 202) scale(.94) translate(-330 -202)"/>');
      s.push('<path d="M214 206C214 170 244 142 290 138C340 134 396 150 436 190" fill="none" stroke="#EFE3C8" stroke-width="13" stroke-linecap="round"/>');
      s.push('<path d="M214 206C214 170 244 142 290 138C340 134 396 150 436 190" fill="none" stroke="' + INK + '" stroke-opacity=".25" stroke-width="1.4" stroke-linecap="round"/>');
      s.push('<path d="' + CEREBELLUM + '" fill="#E8D3B6" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>');
      s.push('<path d="M470 338C492 330 520 336 540 350M494 336C496 352 498 368 508 382M520 340C522 354 530 368 540 380M466 352C486 354 506 354 526 354" fill="none" stroke="#FFF6E4" stroke-width="5" stroke-linecap="round"/>');
    } else {
      s.push('<path d="' + CEREBELLUM + '" fill="#E8D3B6" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>');
      FOLIA.forEach(function (d) { s.push('<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-opacity=".3" stroke-width="1.6" stroke-linecap="round"/>'); });
      s.push('<path d="' + CEREBRUM + '" fill="url(#' + id + '-cx)"/>');
      s.push('<g clip-path="url(#' + id + '-clip)" fill="none" stroke="' + INK + '" stroke-opacity=".3" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">');
      curls().forEach(function (d) { s.push('<path d="' + d + '"/>'); });
      s.push('</g><g clip-path="url(#' + id + '-clip)" fill="none" stroke="' + INK + '" stroke-opacity=".5" stroke-width="2.2" stroke-linecap="round">');
      SULCI_OUT.forEach(function (d) { s.push('<path d="' + d + '"/>'); });
      s.push('</g>');
    }
    s.push('</g>');
    // network wires go under the regions so a part is always easy to tap
    s.push('<g class="bm-nets" aria-hidden="true"></g>');
    // the regions
    s.push('<g class="bm-regions">');
    var order = ['pfc', 'acc', 'insula', 'amygdala', 'hippocampus', 'striatum', 'thalamus', 'cerebellum', 'senses', 'tpj'];   // the order Tab goes in, and the order they are painted in
    order.forEach(function (rid) {
      var def = R[rid]; if (!def) return;
      var r = byId[rid] || { id: rid, name: rid, short: rid }, col = COLOR[rid];
      var attrs = ' class="bm-r" data-region="' + rid + '"';
      if (o.interactive) attrs += ' role="button" tabindex="0" aria-pressed="false" aria-label="' + esc(r.name + ': ' + (r.job || '')) + '" aria-describedby="' + id + '-rd-' + rid + '"';
      s.push('<g' + attrs + '>');
      if (def.hit) s.push('<circle class="bm-hit" cx="' + def.hit[0] + '" cy="' + def.hit[1] + '" r="' + def.hit[2] + '"/>');
      var clip = rid !== 'cerebellum' ? ' clip-path="url(#' + id + '-clip)"' : '';
      s.push('<g class="bm-rings" aria-hidden="true">'); def.shapes.forEach(function (sh) { s.push(ringMarkup(sh, col)); }); s.push('</g>');
      s.push('<g class="bm-fills"' + clip + '>'); def.shapes.forEach(function (sh) { s.push(shapeMarkup(sh, col, 'bm-shape')); }); s.push('</g>');
      if (def.detail) { s.push('<g class="bm-det" aria-hidden="true" fill="none" stroke="' + INK + '" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round">'); def.detail.forEach(function (d) { s.push('<path d="' + d + '"/>'); }); s.push('</g>'); }
      s.push('</g>');
    });
    s.push('</g>');
    // the outline once more on top, so the edge is always clean
    s.push('<path class="bm-outline" d="' + CEREBRUM + '" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round" pointer-events="none"/>');
    if (o.labels !== false) {
      s.push('<g class="bm-labels" aria-hidden="true">');
      order.forEach(function (rid) {
        var def = R[rid]; if (!def) return;
        var r = byId[rid] || { short: rid };
        s.push(labelMarkup(r.short, def.label));
        (def.extra || []).forEach(function (ex) { s.push(labelMarkup(r.short, ex.label, ex.label[3])); });
      });
      s.push('</g>');
    }
    s.push('<g class="bm-marks" aria-hidden="true"></g>');
    s.push('</svg>');
    return s.join('');
  }

  // ---------- markers ----------
  // one icon, drawn in a box centered on 0,0 that is 24 wide
  function glyphPath(key) {
    switch (key) {
      case 'up': return '<path d="M0-6.5L6.5 4.5H-6.5Z" fill="' + INK + '"/>';
      case 'down': return '<path d="M0 6.5L6.5-4.5H-6.5Z" fill="' + INK + '"/>';
      case 'smaller': return '<path d="M-9.5 0L-3.5-5.5V5.5ZM9.5 0L3.5-5.5V5.5Z" fill="' + INK + '"/>';
      case 'larger': return '<path d="M-3.5 0L-9.5-5.5V5.5ZM3.5 0L9.5-5.5V5.5Z" fill="' + INK + '"/>';
      case 'linked': return '<circle cx="-7" cy="0" r="2.8" fill="' + INK + '"/><circle cx="7" cy="0" r="2.8" fill="' + INK + '"/><path d="M-4 0l2.6-4 2.8 8 2.6-4" fill="none" stroke="' + INK + '" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>';
      case 'varies': return '<path d="M-8.5 0q2.1-6 4.2 0t4.2 0 4.2 0 4.2 0" fill="none" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>';
    }
    return '';
  }
  function glyph(key, size) {
    var n = size || 22;
    return '<svg class="bm-gi" viewBox="-13 -13 26 26" width="' + n + '" height="' + n + '" aria-hidden="true" focusable="false"><circle r="12" fill="' + CREAM + '" stroke="' + INK + '" stroke-width="1.8"/>' + glyphPath(key) + '</svg>';
  }
  function badge(key, x, y, scale) {
    return '<g class="bm-badge" transform="translate(' + x + ' ' + y + ') scale(' + (scale || 1) + ')"><circle r="12.5" fill="' + CREAM + '" stroke="' + INK + '" stroke-width="2"/>' + glyphPath(key) + '</g>';
  }

  function netIcon(color) {
    return '<svg class="bm-ni" viewBox="0 0 28 12" width="28" height="12" aria-hidden="true" focusable="false"><path d="M2 6C8 0 14 12 26 6" fill="none" stroke="' + color + '" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="1 5.5"/></svg>';
  }

  // the markers for one moment. state = { view, marks: { regionId: [glyph keys] }, light: { regionId: 0..1 }, nets: [{id, glyph, strong}], netsOn: [ids], regionNodes }
  function paintLayer(view, st) {
    var R = VIEWS[view], out = { marks: '', nets: '' }, sc = st.scale || 1;
    var marks = [], cols = 3, sc = st.scale || 1, gap = 27 * sc;
    Object.keys(st.marks || {}).forEach(function (rid) {
      var def = R[rid]; if (!def) return;
      var list = st.marks[rid], at = def.mk || def.at, ax = at[0], ay = at[1];
      var n = list.length, perRow = Math.min(n, cols), rows = Math.ceil(n / cols);
      list.forEach(function (g, i) {
        var row = Math.floor(i / cols), inRow = Math.min(cols, n - row * cols), col = i % cols;
        var x = ax + (col - (inRow - 1) / 2) * gap, y = ay + (row - (rows - 1) / 2) * gap + (def.markDy || 0);
        marks.push(badge(g, x, y, sc));
      });
    });
    out.marks = marks.join('');
    // network wires between the parts of a network that are in this view
    var nets = [];
    (st.netsOn || []).forEach(function (nid) {
      var net = st.netDefs[nid]; if (!net) return;
      var pts = [];
      net.nodes.forEach(function (rid) {
        var d = R[rid]; if (!d) return;
        var a = d.at;
        if (rid === 'senses' && nid === 'reading') { a = view === 'outside' ? [560, 220] : [582, 214]; }
        pts.push(a);
      });
      if (pts.length < 2) return;
      var dPath = wire(pts), col = NETCOLOR[nid], strong = st.netMark && st.netMark[nid];
      nets.push('<g class="bm-wirenet' + (strong ? ' is-hit' : '') + '" data-net="' + nid + '">' +
        '<path class="bm-wire-glow" d="' + dPath + '" fill="none" stroke="' + col + '" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path class="bm-wire" d="' + dPath + '" fill="none" stroke="' + col + '" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 9"/>' +
        pts.map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="' + col + '" stroke="' + CREAM + '" stroke-width="1.6"/>'; }).join('') + '</g>');
      if (strong) {
        var mid = pts[Math.floor(pts.length / 2)], mp = pts.length === 2 ? [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2 - 14] : [mid[0], mid[1] - 34];
        nets.push('<g class="bm-netmark" transform="translate(' + mp[0] + ' ' + mp[1] + ')">' + badge(st.netMark[nid], 0, 0, sc) + '</g>');
      }
    });
    out.nets = nets.join('');
    return out;
  }
  // a smooth line through points
  function wire(p) {
    if (p.length === 2) {
      var mx = (p[0][0] + p[1][0]) / 2, my = (p[0][1] + p[1][1]) / 2, dx = p[1][0] - p[0][0], dy = p[1][1] - p[0][1];
      return 'M' + p[0][0] + ' ' + p[0][1] + 'Q' + (mx - dy * 0.22).toFixed(1) + ' ' + (my + dx * 0.22).toFixed(1) + ' ' + p[1][0] + ' ' + p[1][1];
    }
    var d = 'M' + p[0][0] + ' ' + p[0][1];
    for (var i = 0; i < p.length - 1; i++) {
      var p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      var c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += 'C' + c1[0].toFixed(1) + ' ' + c1[1].toFixed(1) + ' ' + c2[0].toFixed(1) + ' ' + c2[1].toFixed(1) + ' ' + p2[0] + ' ' + p2[1];
    }
    if (p.length >= 3) { d += 'C' + (p[p.length - 1][0] + 40) + ' ' + (p[p.length - 1][1] - 50) + ' ' + (p[0][0] + 40) + ' ' + (p[0][1] - 50) + ' ' + p[0][0] + ' ' + p[0][1]; }
    return d;
  }

  // ---------- two bell curves ----------
  function phi(x) { // the standard normal cumulative distribution
    var t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp(-x * x / 2);
    var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - p : p;
  }
  function overlapShare(d) { return 2 * phi(-Math.abs(d) / 2); }
  function overlap(d, o) {
    o = o || {};
    var W = 360, H = 120, base = 104, sd = 38, cx = W / 2, shift = d * sd / 2, id = (o.id || 'bmo') + '-ov';
    function curve(c) {
      var pts = [];
      for (var x = 0; x <= W; x += 6) { var z = (x - c) / sd; pts.push((x).toFixed(0) + ' ' + (base - 84 * Math.exp(-z * z / 2)).toFixed(1)); }
      return 'M' + pts.join('L');
    }
    var a = curve(cx - shift), b = curve(cx + shift);
    function area(c) { return curve(c) + 'L' + W + ' ' + base + 'L0 ' + base + 'Z'; }
    var share = overlapShare(d);
    return '<svg class="bm-ov" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Two bell curves, ' + d + ' standard deviations apart. They overlap by about ' + Math.round(share * 100) + ' percent." focusable="false">' +
      '<defs><clipPath id="' + id + 'a"><path d="' + area(cx - shift) + '"/></clipPath></defs>' +
      '<path d="' + area(cx - shift) + '" fill="' + (o.colorA || '#8A7F6A') + '" fill-opacity=".22"/><path d="' + area(cx + shift) + '" fill="' + (o.colorB || '#2B5B8C') + '" fill-opacity=".22"/>' +
      '<path d="' + area(cx + shift) + '" fill="' + INK + '" fill-opacity=".30" clip-path="url(#' + id + 'a)"/>' +
      '<path d="' + a + '" fill="none" stroke="' + (o.colorA || '#8A7F6A') + '" stroke-width="2.4"/><path d="' + b + '" fill="none" stroke="' + (o.colorB || '#2B5B8C') + '" stroke-width="2.4"/>' +
      '<path d="M0 ' + base + 'H' + W + '" stroke="' + INK + '" stroke-opacity=".5" stroke-width="1.4"/>' +
      '<path d="M' + (cx - shift) + ' ' + (base - 90) + 'V' + base + 'M' + (cx + shift) + ' ' + (base - 90) + 'V' + base + '" stroke="' + INK + '" stroke-opacity=".35" stroke-dasharray="3 4" stroke-width="1.2"/></svg>';
  }

  window.TOLBrainArt = { build: build, paintLayer: paintLayer, glyph: glyph, netIcon: netIcon, overlap: overlap, overlapShare: overlapShare, color: COLOR, netColor: NETCOLOR, views: VIEWS };
})();
