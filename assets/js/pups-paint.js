/* pups-paint.js: the painted Tidbit and Sugarfoot (the owner's turnaround sheet, cut into layers in assets/img/pups),
   drawn through the same TOLPups.draw contract as pups.js, so every page, the episode player, the trailer and the
   music video get the painted pups without changing how they act. Load it after pups.js.
   TOLPups.draw(ctx, look, pose, phase, wag, blink, t, tilt, opts): paws at (0,0), facing right, pup space is about
   56 units tall. The player passes opts.mood, opts.talk (0..1), opts.mouth, opts.eyes and opts.moving, which pick the
   view and the face. TOLPups.head(who, pose, opts) says where the head is, in pup space, for things carried at the mouth. */
(function () {
  'use strict';
  var P = window.TOLPups; if (!P) return;
  var BASE = '/assets/img/pups/', UNITS = 60, IMG = {}, META = null, ready = false, vector = P.draw;
  var A_LEG = 24, D2R = Math.PI / 180;
  function img(n) { if (!IMG[n]) { var i = new Image(); i.src = BASE + n + '.png'; IMG[n] = i; } return IMG[n]; }
  var readyP = fetch(BASE + 'meta.json').then(function (r) { return r.json(); }).then(function (m) {
    META = m; var names = [];
    Object.keys(m).forEach(function (k) { if (m[k].layers) Object.keys(m[k].layers).forEach(function (l) { names.push(k + '-' + l); }); else names.push(k); });
    return Promise.all(names.map(function (n) { return new Promise(function (res) { var i = img(n); if (i.complete && i.naturalWidth) return res(); i.onload = i.onerror = res; }); }));
  }).then(function () { ready = true; });
  P.ready = readyP; P.painted = true;

  function who(L) { return L && L.collar ? 'tb' : 'sf'; }
  function viewFor(w, pose, o) {
    var moving = o && o.moving;
    if (pose === 'run' && moving) return 'right';
    if (pose === 'run') { // standing: talking or feeling something turns a little toward us
      var talk = o && o.talk > 0, feel = o && o.mood && o.mood !== 'happy' && o.mood !== 'calm';
      return (talk || feel || (o && o.mouth != null)) ? '34front' : 'right';
    }
    if (pose === 'sit' || pose === 'bow') return '34front';
    if (pose === 'lie') return 'front';
    if (pose === 'wiggle') return 'front';
    return 'right';
  }
  // the face: a closed-mouth base, and how much of the open-mouth face shows over it (0..1), so the mouth moves smoothly
  function faceFor(w, o, t) {
    if (!o) return { base: 'curious', open: 1 };
    var m = o.mood || 'happy', mouth = o.mouth != null ? o.mouth : (o.talk || 0);
    if (mouth > 0.02) return { base: m === 'surprised' ? 'surprised' : 'curious', open: Math.min(1, Math.max(0, (mouth - 0.25) / 0.6)) };
    if (m === 'surprised') return { base: 'surprised', open: 0 };
    if (m === 'happy' || m === 'excited' || m === 'silly' || m === 'proud') return { base: 'curious', open: 1 };
    return { base: 'curious', open: 0 };
  }
  var STATE = {};
  function squashFor(w, view, t) {
    var st = STATE[w] || (STATE[w] = { view: view, t0: -9e9 });
    if (st.view !== view) { st.view = view; st.t0 = t; }
    var u = (t - st.t0) / 180; if (u < 0 || u >= 1) return 1;
    return 1 - 0.3 * Math.sin(Math.PI * u);
  }
  function drawLayer(g, name, lay, k, ox, oy, rotDeg, px, py) {
    var im = IMG[name]; if (!im || !im.naturalWidth) return;
    if (rotDeg) { g.save(); g.translate(ox + px * k, oy + py * k); g.rotate(rotDeg * D2R); g.drawImage(im, (lay.x - px) * k, (lay.y - py) * k, lay.w * k, lay.h * k); g.restore(); }
    else g.drawImage(im, ox + lay.x * k, oy + lay.y * k, lay.w * k, lay.h * k);
  }
  function drawPainted(g, L, pose, ph, wag, blink, t, tilt, o) {
    var w = who(L), view = viewFor(w, pose, o), key = w + '-' + view, m = META[key]; if (!m) return;
    var k = UNITS / m.h, ox = 4 - m.w * k / 2, oy = -m.h * k;          // paws on the ground, centred a touch forward
    var sy = 1, dy = 0, lean = 0;
    if (pose === 'lie') { sy = 0.72; }
    if (pose === 'bow') { lean = -0.22; }
    if (pose === 'sit') { sy = 0.96; }
    g.save();
    if (lean) { g.translate(-10, 0); g.rotate(lean); g.translate(10, 0); }
    var sq = squashFor(w, view, t || 0); if (sq !== 1) { g.scale(sq, 1 + (1 - sq) * 0.35); }
    if (sy !== 1) g.scale(1, sy);
    var s1 = Math.sin(ph), s2 = Math.sin(ph + 0.35), moving = pose === 'run' && o && o.moving;
    var legs = moving || (pose === 'run' && Math.abs(s1) > 0.02) ? { fl1: A_LEG * s1, fl2: -A_LEG * s1, bl1: -A_LEG * s2, bl2: A_LEG * s2 } : {};
    var headDeg = (tilt || 0) * 57.3 * 0.8 + (moving ? -3 * Math.sin(2 * ph) : 0);
    var tailDeg = (wag || 0) * 57.3 * 0.55 + (moving ? 8 * Math.sin(ph * 0.5) : 0);
    var face = m.face ? faceFor(w, o, t) : null, useFace = !!face && view !== 'right';
    m.order.forEach(function (p) {
      var lay = m.layers[p]; if (!lay) return;
      if (p === 'body' && useFace && m.layers['body-nohead']) lay = m.layers['body-nohead'], p = 'body-nohead';
      var rot = 0, px = 0, py = 0;
      if (p in legs) { rot = legs[p]; px = lay.px; py = lay.py; }
      else if (p === 'head') { rot = headDeg; px = lay.px; py = lay.py; if (useFace) return; }
      else if (p === 'tail') { rot = tailDeg; px = lay.px; py = lay.py; }
      drawLayer(g, key + '-' + p, lay, k, ox, oy, rot, px, py);
    });
    if (useFace) {
      var hl = m.layers.head, hpx = hl ? hl.px : m.face.cx, hpy = hl ? hl.py : m.face.cy, fw = m.face.w * k;
      g.save(); g.translate(ox + hpx * k, oy + hpy * k); g.rotate(headDeg * D2R);
      function putFace(n, alpha) {
        var f = META[w + '-face-' + n], fi = IMG[w + '-face-' + n]; if (!f || !fi || !fi.naturalWidth || alpha <= 0.01) return;
        var fh = f.h / f.w * fw; g.globalAlpha = alpha; g.drawImage(fi, (m.face.cx - hpx) * k - fw / 2, (m.face.cy - hpy) * k - fh / 2, fw, fh); g.globalAlpha = 1;
      }
      putFace(face.base, 1); if (face.open > 0) putFace('happy', face.open);
      g.restore();
    }
    g.restore();
  }
  P.draw = function (c, L, pose, ph, wag, blink, t, tilt, o) {
    if (!ready || !META) { vector(c, L, pose, ph, wag, blink, t, tilt, o); return; }
    drawPainted(c, L, pose, ph, wag, blink, t, tilt, o || {});
  };
  // where the head is, in pup space (for items carried at the mouth, speech bubbles and the like)
  P.head = function (id, pose, o) {
    var w = id === 'tidbit' ? 'tb' : 'sf', view = viewFor(w, pose, o), m = META && META[w + '-' + view]; if (!m) return { x: 21, y: -33 };
    var k = UNITS / m.h, ox = 4 - m.w * k / 2, oy = -m.h * k, sy = pose === 'lie' ? 0.72 : 1;
    if (m.face) return { x: ox + m.face.cx * k, y: (oy + m.face.cy * k) * sy, r: m.face.w * k / 2 };
    var hl = m.layers.head; if (hl) return { x: ox + (hl.x + hl.w * 0.55) * k, y: (oy + (hl.y + hl.h * 0.45) * k) * sy, r: hl.w * k / 2 };
    return { x: ox + m.w * 0.7 * k, y: oy + m.h * 0.3 * k, r: 14 };
  };
})();
