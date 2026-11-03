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
    Object.keys(m).forEach(function (k) { if (m[k].layers) Object.keys(m[k].layers).forEach(function (l) { names.push(k + '-' + l); }); else names.push(k); if (m[k].ears) Object.keys(m[k].ears).forEach(function (e) { names.push(k + '-' + e); }); });
    return Promise.all(names.map(function (n) { return new Promise(function (res) { var i = img(n); if (i.complete && i.naturalWidth) return res(); i.onload = i.onerror = res; }); }));
  }).then(function () { ready = true; });
  P.ready = readyP; P.painted = true;

  function who(L) { return L && L.collar ? 'tb' : 'sf'; }
  function viewFor(w, pose, o) {
    var moving = o && o.moving, act = o && o.act;
    if (act === 'turnaway' || act === 'tailtuck') return '34back';      // sulking, hiding: turned away from us
    if (act === 'lookat' && o && o.lookUp) return 'back';
    if (pose === 'run' && moving) return 'right';
    if (pose === 'run') { // standing: talking or feeling something turns a little toward us
      var talk = o && o.talk > 0, feel = o && o.mood && o.mood !== 'happy' && o.mood !== 'calm';
      return (talk || feel || (o && o.mouth != null) || (o && o.listening)) ? '34front' : 'right';
    }
    if (pose === 'sit' || pose === 'bow') return '34front';
    if (pose === 'lie') return 'front';
    if (pose === 'wiggle') return 'front';
    return 'right';
  }
  // the face picture (eyes, brows, cheeks; the painted mouths are cleaned off) and the mouth, which is drawn
  function faceFor(o) {
    var m = (o && o.mood) || 'happy';
    if (m === 'surprised') return 'surprised';
    if (m === 'happy' || m === 'excited' || m === 'silly' || m === 'proud') return 'happy';
    return 'curious';
  }
  var STATE = {};
  // a little spring per pup: head, ears and tail lag the body and overshoot, the way a cartoon does follow-through
  function spring(st, key, target, t, k, damp) {
    var sp = st[key] || (st[key] = { x: target, v: 0, t: t });
    var dt = Math.min(0.05, Math.max(0, (t - sp.t) / 1000)); sp.t = t;
    for (var i = 0; i < 3; i++) { var a = (target - sp.x) * k - sp.v * damp; sp.v += a * dt / 3; sp.x += sp.v * dt / 3; }
    return sp.x;
  }
  function brows(g, eyes, k, o, w, fx0, fy0) {
    var m = (o && o.mood) || 'happy'; if (!(m === 'sad' || m === 'worried' || m === 'grumpy' || m === 'surprised')) return;
    g.save(); g.strokeStyle = '#1a1412'; g.lineCap = 'round';
    eyes.forEach(function (e, i) {
      var x = fx0 + e[0] * k, y = fy0 + e[1] * k, r = e[2] * k, inner = (i === 0 ? 1 : -1);   // inner end points toward the other eye
      g.lineWidth = Math.max(1, r * 0.17); g.beginPath();
      if (m === 'sad' || m === 'worried') { g.moveTo(x - inner * r * 0.9, y - r * 1.25); g.quadraticCurveTo(x, y - r * 1.5, x + inner * r * 0.8, y - r * 1.75); }
      else if (m === 'grumpy') { g.moveTo(x - inner * r * 0.9, y - r * 1.7); g.lineTo(x + inner * r * 0.8, y - r * 1.25); }
      else { g.moveTo(x - r * 0.9, y - r * 1.75); g.quadraticCurveTo(x, y - r * 2.05, x + r * 0.9, y - r * 1.75); }
      g.stroke();
    });
    g.restore();
  }
  function eyelids(g, eyes, k, o, w, fx0, fy0) {
    var blink = o && o.blink, ey = o && o.eyes, m = (o && o.mood) || 'happy';
    var closed = blink || ey === 'closed' || ey === 'sleepy' || m === 'sleepy', happy = ey === 'happy' || (m === 'excited' && !(o && o.talk)), soft = ey === 'soft' || ey === 'calm' || m === 'calm';
    var amt = closed ? 1 : soft ? 0.3 : 0;
    if (!amt && !happy) { if (m === 'surprised') eyes.forEach(function (e) { var x = fx0 + e[0] * k, y = fy0 + e[1] * k, r = e[2] * k; g.save(); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = Math.max(1, r * 0.22); g.beginPath(); g.arc(x, y, r * 1.08, 0, Math.PI * 2); g.stroke(); g.restore(); }); return; }
    var lid = w === 'tb' ? '#2B2523' : '#C98A50', line = '#1a1412';
    eyes.forEach(function (e) {
      var x = fx0 + e[0] * k, y = fy0 + e[1] * k, r = e[2] * k * 1.15;
      g.save();
      if (happy) { g.fillStyle = lid; g.beginPath(); g.ellipse(x, y, r, r, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = line; g.lineWidth = Math.max(1, r * 0.16); g.lineCap = 'round'; g.beginPath(); g.arc(x, y + r * 0.35, r * 0.8, Math.PI * 1.12, Math.PI * 1.88); g.stroke(); }
      else { g.fillStyle = lid; g.beginPath(); g.ellipse(x, y - r + r * amt, r, r * amt, 0, 0, Math.PI * 2); g.fill();
        if (amt >= 0.99) { g.strokeStyle = line; g.lineWidth = Math.max(1, r * 0.14); g.lineCap = 'round'; g.beginPath(); g.moveTo(x - r * 0.75, y + r * 0.05); g.quadraticCurveTo(x, y + r * 0.35, x + r * 0.75, y + r * 0.05); g.stroke(); } }
      g.restore();
    });
  }
  function squashFor(w, view, t) {
    var st = STATE[w] || (STATE[w] = { view: view, t0: -9e9 });
    if (st.view !== view) { st.view = view; st.t0 = t; }
    var u = (t - st.t0) / 180; if (u < 0 || u >= 1) return 1;
    return 1 - 0.3 * Math.sin(Math.PI * u);
  }
  // the mouth, the way the show draws it: a smile at rest, a dark open mouth with a pink tongue that follows the voice,
  // an o for surprise, a down-turned line for sad or worried, a flat line for grumpy. (mx, my) and hw are in sprite pixels.
  function drawMouth(g, mo, k, o, t, w) {
    var m = (o && o.mood) || 'happy', talk = o && o.talk ? o.talk : 0, mouth = o && o.mouth != null ? o.mouth : talk;
    var x = mo.x * k, y = mo.y * k, hw = mo.hw * k, side = mo.side || 0, MC = '#3A1E22', PINK = '#EE8FA6';
    if (side < 0) { g.save(); g.translate(2 * x, 0); g.scale(-1, 1); side = -side; }
    var happy = m === 'happy' || m === 'excited' || m === 'silly' || m === 'proud';
    var pant = happy && !mouth ? 0.22 + 0.08 * Math.sin((t || 0) / 240 + (w === 'sf' ? 1 : 0)) : 0;   // a soft happy pant at rest
    var open = Math.max(mouth, pant);
    if (mouth > 0.02) { var vis = 0.5 + 0.5 * Math.sin((t || 0) / 95 + (w === 'sf' ? 2 : 0)); hw *= 0.78 + 0.32 * vis; }   // ah and oo: the width changes too
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    if (open > 0.03) {
      var oh = hw * (0.18 + 0.55 * open), ow = hw * (0.55 + 0.15 * open);
      g.fillStyle = MC; g.beginPath();
      if (side) { g.moveTo(x - hw * 0.9, y - hw * 0.1); g.quadraticCurveTo(x, y - hw * 0.05 - oh * 0.15, x + hw * 0.55, y - hw * 0.12); g.quadraticCurveTo(x + hw * 0.1, y + oh * 1.3, x - hw * 0.9, y - hw * 0.1); }
      else { g.moveTo(x - ow, y); g.quadraticCurveTo(x, y - oh * 0.3, x + ow, y); g.quadraticCurveTo(x, y + oh * 1.9, x - ow, y); }
      g.closePath(); g.fill();
      g.clip(); g.fillStyle = PINK; g.beginPath(); g.ellipse(x + (side ? -hw * 0.25 : 0), y + oh * 0.95, ow * 0.5, oh * 0.6, 0, 0, Math.PI * 2); g.fill();
    } else if (m === 'surprised') { g.fillStyle = MC; g.beginPath(); g.ellipse(x, y + hw * 0.1, hw * 0.3, hw * 0.4, 0, 0, Math.PI * 2); g.fill(); }
    else if (mo.painted && !(m === 'sad' || m === 'worried' || m === 'grumpy')) { /* the painting's own smile */ }
    else {
      g.strokeStyle = MC; g.lineWidth = Math.max(1, hw * 0.1); g.beginPath();
      if (m === 'sad' || m === 'worried') { g.moveTo(x - hw * 0.8, y + hw * 0.25); g.quadraticCurveTo(x, y - hw * 0.25, x + hw * 0.8, y + hw * 0.25); }
      else if (m === 'grumpy') { g.moveTo(x - hw * 0.8, y); g.lineTo(x + hw * 0.8, y - hw * 0.05); }
      else if (side) { g.moveTo(x - hw * 1.1, y - hw * 0.2); g.quadraticCurveTo(x - hw * 0.1, y + hw * 0.3, x + hw * 0.8, y - hw * 0.15); }
      else { g.moveTo(x - hw * 0.9, y - hw * 0.15); g.quadraticCurveTo(x, y + hw * 0.4, x + hw * 0.9, y - hw * 0.15); }
      g.stroke();
    }
    if (mo.side < 0) g.restore();
    g.restore();
  }
  function drawLayer(g, name, lay, k, ox, oy, rotDeg, px, py) {
    var im = IMG[name]; if (!im || !im.naturalWidth) return;
    if (rotDeg) { g.save(); g.translate(ox + px * k, oy + py * k); g.rotate(rotDeg * D2R); g.drawImage(im, (lay.x - px) * k, (lay.y - py) * k, lay.w * k, lay.h * k); g.restore(); }
    else g.drawImage(im, ox + lay.x * k, oy + lay.y * k, lay.w * k, lay.h * k);
  }
  function drawPainted(g, L, pose, ph, wag, blink, t, tilt, o) {
    var w = who(L), view = viewFor(w, pose, o);
    var tr = g.getTransform ? g.getTransform() : null, mirrored = !!(tr && (tr.a * tr.d - tr.b * tr.c) < 0), unflip = false;
    if (mirrored && view === 'right' && META[w + '-left']) { view = 'left'; unflip = true; }   // facing left: the real left-facing drawing
    var key = w + '-' + view, m = META[key]; if (!m) return;
    if (unflip) { g.save(); g.scale(-1, 1); }
    var k = UNITS / m.h, ox = (unflip ? -4 : 4) - m.w * k / 2, oy = -m.h * k;          // paws on the ground, centred a touch forward
    var sy = 1, dy = 0, lean = 0;
    if (pose === 'lie') { sy = 0.72; }
    if (pose === 'bow') { lean = -0.22; }
    if (pose === 'sit') { sy = 0.96; }
    g.save();
    if (lean) { g.translate(-10, 0); g.rotate(lean); g.translate(10, 0); }
    var sq = squashFor(w, view, t || 0); if (sq !== 1) { g.scale(sq, 1 + (1 - sq) * 0.35); }
    var tk = (o && o.talk) || 0; if (tk > 0.02) { var tb = 1 + 0.025 * tk; g.scale(1 / Math.sqrt(tb), tb); }   // a little bounce on each word
    if (sy !== 1) g.scale(1, sy);
    var s1 = Math.sin(ph), s2 = Math.sin(ph + 0.35), moving = pose === 'run' && o && o.moving, dir = unflip ? -1 : 1;
    var legs = moving || (pose === 'run' && Math.abs(s1) > 0.02) ? { fl1: A_LEG * s1 * dir, fl2: -A_LEG * s1 * dir, bl1: -A_LEG * s2 * dir, bl2: A_LEG * s2 * dir } : {};
    var st = STATE[w] || (STATE[w] = {});
    var lift = (o && o.lift) || 0, liftV = spring(st, 'lift', lift, t || 0, 260, 14), bounce = (liftV - lift) * 0.08;   // the body lags a hop a touch
    var headDeg = spring(st, 'head', ((tilt || 0) * 57.3 * 0.8 + (moving ? -3 * Math.sin(2 * ph) : 0) - bounce * 6) * dir, t || 0, 180, 9);
    var tailDeg = spring(st, 'tail', ((wag || 0) * 57.3 * 0.55 + (moving ? 8 * Math.sin(ph * 0.5) : 0) + bounce * 10) * dir, t || 0, 120, 6);
    if (!moving && !(o && o.talk)) { if (!st.flickAt || (t || 0) > st.flickAt + 400) st.flickAt = (t || 0) + 2500 + 4000 * Math.abs(Math.sin((t || 0) * 0.0007 + (w === 'sf' ? 1 : 0))); if ((t || 0) > st.flickAt && (t || 0) < st.flickAt + 60 && st.ears) st.ears.v += 260 * (w === 'sf' ? -1 : 1); }   // an idle ear flick now and then
    var earDeg = spring(st, 'ears', -headDeg * 0.35 + bounce * 12 + (moving ? 4 * Math.sin(2 * ph + 1) : 0) + ((o && o.ear) || 0) * 20, t || 0, 90, 5); earDeg = Math.max(-7, Math.min(7, earDeg));
    var face = null, useFace = false;   // moods are drawn on the pup's own painted head: brows, eyelids, eye rings, mouth
    if (useFace) { if (st.face !== face) { st.prevFace = st.face; st.face = face; st.faceT = t || 0; } }
    var prevA = (useFace && st.prevFace && (t || 0) - st.faceT < 140) ? 1 - ((t || 0) - st.faceT) / 140 : 0;
    m.order.forEach(function (p) {
      var lay = m.layers[p]; if (!lay) return;
      if (p === 'body' && useFace && m.layers['body-nohead']) lay = m.layers['body-nohead'], p = 'body-nohead';
      var rot = 0, px = 0, py = 0;
      if (p in legs) { rot = legs[p]; px = lay.px; py = lay.py; }
      else if (p === 'head') { rot = headDeg; px = lay.px; py = lay.py; if (useFace) return; }
      else if (p === 'tail') { rot = tailDeg; px = lay.px; py = lay.py; }
      drawLayer(g, key + '-' + p, lay, k, ox, oy, rot, px, py);
    });
    var hl = m.layers.head, hpx = hl ? hl.px : (m.face ? m.face.cx : 0), hpy = hl ? hl.py : (m.face ? m.face.cy : 0);
    if (useFace) {
      var fm = META[w + '-face-' + face], fi = IMG[w + '-face-' + face], fw = m.face.w * k, fh = fm.h / fm.w * fw;
      g.save(); g.translate(ox + hpx * k, oy + hpy * k); g.rotate(headDeg * D2R);
      var fx0 = (m.face.cx - hpx) * k - fw / 2, fy0 = (m.face.cy - hpy) * k - fh / 2, fk = fw / fm.w;
      if (fi && fi.naturalWidth) g.drawImage(fi, fx0, fy0, fw, fh);
      if (prevA > 0) { var pf = META[w + '-face-' + st.prevFace], pi = IMG[w + '-face-' + st.prevFace]; if (pf && pi && pi.naturalWidth) { g.globalAlpha = prevA; g.drawImage(pi, (m.face.cx - hpx) * k - fw / 2, (m.face.cy - hpy) * k - (pf.h / pf.w * fw) / 2, fw, pf.h / pf.w * fw); g.globalAlpha = 1; } }
      if (fm.ears) ['earL', 'earR'].forEach(function (en) {   // the ears again on top, swinging a little from their roots
        var el = fm.ears[en], ei = IMG[w + '-face-' + face + '-' + en]; if (!el || !ei || !ei.naturalWidth) return;
        var sgn = en === 'earL' ? 1 : -1;
        g.save(); g.translate(fx0 + el.px * fk, fy0 + el.py * fk); g.rotate(earDeg * sgn * D2R); g.drawImage(ei, (el.x - el.px) * fk, (el.y - el.py) * fk, el.w * fk, el.h * fk); g.restore();
      });
      if (fm.eyes) { brows(g, fm.eyes, fk, o, w, fx0, fy0); eyelids(g, fm.eyes, fk, o, w, fx0, fy0); }
      if (fm.mouth) { g.translate(fx0, fy0); drawMouth(g, fm.mouth, fk, o, t, w); }
      g.restore();
    } else if (m.mouth && hl) {
      g.save(); g.translate(ox + hpx * k, oy + hpy * k); g.rotate(headDeg * D2R); g.translate(-hpx * k, -hpy * k);
      if (m.eyes) { brows(g, m.eyes, k, o, w, 0, 0); eyelids(g, m.eyes, k, o, w, 0, 0); }
      drawMouth(g, m.mouth, k, o, t, w); g.restore();
    } else if (m.mouth) { g.save(); g.translate(ox, oy); drawMouth(g, m.mouth, k, o, t, w); g.restore(); }
    g.restore();
    if (unflip) g.restore();
  }
  P.draw = function (c, L, pose, ph, wag, blink, t, tilt, o) {
    if (!ready || !META) { vector(c, L, pose, ph, wag, blink, t, tilt, o); return; }
    drawPainted(c, L, pose, ph, wag, blink, t, tilt, o || {});
  };
  // where the head is, in pup space (for items carried at the mouth, speech bubbles and the like)
  P.head = function (id, pose, o) {
    var w = id === 'tidbit' ? 'tb' : 'sf', view = viewFor(w, pose, o), m = META && META[w + '-' + view]; if (!m) return { x: 21, y: -33 };
    if (view === 'right' && o && o.mirrored && META[w + '-left']) { var ml = META[w + '-left'], kl = UNITS / ml.h, hl2 = ml.layers.head; return { x: 4 + ml.w * kl / 2 - (hl2.x + hl2.w * 0.45) * kl, y: -ml.h * kl + (hl2.y + hl2.h * 0.45) * kl, r: hl2.w * kl / 2 }; }
    var k = UNITS / m.h, ox = 4 - m.w * k / 2, oy = -m.h * k, sy = pose === 'lie' ? 0.72 : 1;
    if (m.face) return { x: ox + m.face.cx * k, y: (oy + m.face.cy * k) * sy, r: m.face.w * k / 2 };
    var hl = m.layers.head; if (hl) return { x: ox + (hl.x + hl.w * 0.55) * k, y: (oy + (hl.y + hl.h * 0.45) * k) * sy, r: hl.w * k / 2 };
    return { x: ox + m.w * 0.7 * k, y: oy + m.h * 0.3 * k, r: 14 };
  };
})();
