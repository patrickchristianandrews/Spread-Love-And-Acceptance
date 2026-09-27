/* pups.js — the two pals, drawn exactly as they are in the Night Garden (night-garden.js),
   for pages that want them running about: the Frequency Journey's landing page.
   TOLPups.draw(ctx, look, pose, phase, wag, blink, t, tilt): pose is 'run', 'sit', 'bow', 'lie' or 'wiggle';
   draw at the paws (0,0), facing right; scale and flip the context first. */
(function () {
  'use strict';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ctx = null;
  var LOOKS = {
    // stocky, long drop ears, tan brows running into tan cheeks, a fawn muzzle and chin, big white toes
    drop: { build: 'stocky', ear: 'drop', legUp: '#A45C2E', legLow: '#B97847', paw: '#F1EADF', nails: true, tan: '#C9965F', chest: 'white', muzzle: 'cream', collar: false, brow: 'patch', tail: 'plume' },
    // leaner and taller, round tan brow dots, tan cheeks and lips, folded ears, tan lower legs, a collar
    collar: { build: 'lean', ear: 'fold', legUp: '#262220', legLow: '#C98A4F', paw: '#D99E62', chest: 'tan', muzzle: 'rottie', collar: true, brow: 'dot', tail: 'short' }
  };
  function drawPup(L, pose, ph, wag, blink, t, tilt) {
    var BLACK = '#252120', TAN = L.tan || '#C4834A', WHITE = '#F4EFE6', PINK = '#EE8FA6';
    var lean = L.build === 'lean', LL = lean ? 15 : 12.5, BRX = lean ? 18.5 : 18, BRY = lean ? 8.8 : 10.2, BY = lean ? -21 : -18.5;
    function leg(x0, y0, ang, len, back) {
      ctx.save(); ctx.translate(x0, y0); ctx.rotate(ang);
      var up = len * 0.5;
      ctx.fillStyle = L.legUp; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-2.8, -2, 5.6, up + 3, 2.8) : ctx.rect(-2.8, -2, 5.6, up + 3); ctx.fill();
      ctx.fillStyle = L.legLow; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-2.5, up, 5, len - up, 2.5) : ctx.rect(-2.5, up, 5, len - up); ctx.fill();
      ctx.fillStyle = L.paw; ctx.beginPath(); ctx.ellipse(1, len, 3.9, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      if (L.nails) { // pale toes with little dark nails
        ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(1.2, len - 1.6); ctx.lineTo(1.2, len + 1.2); ctx.moveTo(3.2, len - 1.3); ctx.lineTo(3.2, len + 1.3); ctx.stroke();
        ctx.fillStyle = '#2A2422'; [[4.6, len + 0.8], [3.3, len + 2.1], [1.6, len + 2.4]].forEach(function (n) { ctx.beginPath(); ctx.ellipse(n[0], n[1], 0.9, 0.55, 0.5, 0, Math.PI * 2); ctx.fill(); });
      }
      if (back) { ctx.fillStyle = 'rgba(10,8,8,0.22)'; ctx.fillRect(-4, -2, 9, len + 4); }
      ctx.restore();
    }
    var lie = pose === 'lie', bow = pose === 'bow', sit = pose === 'sit', wiggle = pose === 'wiggle', moving = pose === 'run' || wiggle;
    var bodyTilt = sit ? -0.42 : bow ? 0.3 : 0;
    // tail: a soft plume, or a short happy stub-and-wag
    var tlen = L.tail === 'plume' ? 15 : 10;
    ctx.save(); ctx.translate(lie ? -18 : -16, lie ? -9 : sit ? -6 : bow ? -27 : BY - 2); ctx.rotate((bow ? -1.3 : -0.9) + wag);
    ctx.strokeStyle = BLACK; ctx.lineWidth = L.tail === 'plume' ? 5.5 : 4.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-6, -tlen * 0.45, -5, -tlen); ctx.stroke();
    ctx.strokeStyle = TAN; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(1, 1); ctx.quadraticCurveTo(-4, -tlen * 0.35, -3.6, -tlen * 0.75); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.restore();
    var a = Math.sin(ph) * 0.7, b = Math.sin(ph + Math.PI) * 0.7;
    if (wiggle) { a = Math.sin(t / 60) * 0.6; b = Math.sin(t / 60 + 2) * 0.6; }
    if (moving) { leg(-10, BY + 5, b * 0.8, LL, true); leg(10, BY + 5, a * 0.8, LL, true); }
    else if (sit) leg(9, -16, 0.05, LL + 2, true);
    else if (bow) leg(-11, -18, 0.05, LL + 4, true);
    // body
    ctx.save(); ctx.rotate(bodyTilt);
    if (lie) {
      ctx.fillStyle = BLACK; ctx.beginPath(); ctx.ellipse(-2, -9, 19, 8.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = L.legLow; ctx.beginPath(); ctx.ellipse(-12, -4, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = L.legLow; ctx.beginPath(); ctx.ellipse(18, -2.5, 8, 2.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = L.paw; ctx.beginPath(); ctx.ellipse(26, -2.5, 3.8, 2.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(23, -0.3, 3.8, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      if (L.chest === 'white') { ctx.fillStyle = '#F2ECE3'; ctx.beginPath(); ctx.ellipse(12.5, -7, 1.4, 2.6, 0, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.fillStyle = TAN; ctx.beginPath(); ctx.ellipse(12, -7, 3.6, 3.4, 0, 0, Math.PI * 2); ctx.fill(); }
    } else {
      ctx.fillStyle = BLACK; ctx.beginPath(); ctx.ellipse(0, BY, BRX, BRY, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(12, BY - 5, 7, 8, -0.5, 0, Math.PI * 2); ctx.fill(); // neck
      if (L.chest === 'white') {
        ctx.fillStyle = TAN; ctx.beginPath(); ctx.ellipse(16, BY - 4, 4, 6.5, -0.45, 0, Math.PI * 2); ctx.fill();         // throat, the same fawn brown
        ctx.fillStyle = '#F2ECE3';
        ctx.beginPath(); ctx.ellipse(15.6, BY + 1.5, 1.5, 3.4, -0.3, 0, Math.PI * 2); ctx.fill();                           // just a small pale streak on the chest
        ctx.fillStyle = TAN; ctx.beginPath(); ctx.ellipse(12, BY + 7.5, 4.5, 2.2, 0, 0, Math.PI * 2); ctx.fill();            // tan below
      }
      else {
        ctx.fillStyle = TAN; ctx.beginPath(); ctx.ellipse(14, BY + 0.5, 4.2, 3.4, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(15, BY + 5.5, 3.6, 2.8, -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = WHITE; ctx.beginPath(); ctx.arc(15.8, BY + 3, 1.1, 0, Math.PI * 2); ctx.fill();
      }
      if (L.collar) { ctx.strokeStyle = '#141111'; ctx.lineWidth = 2.8; ctx.beginPath(); ctx.moveTo(9, BY - 11); ctx.quadraticCurveTo(14, BY - 3, 18, BY - 5); ctx.stroke();
        ctx.fillStyle = '#D5D9E0'; ctx.fillRect(13.6, BY - 7.4, 2.8, 2.4); ctx.fillStyle = '#141111'; ctx.fillRect(14.4, BY - 6.8, 1.2, 1.2); }
    }
    ctx.restore();
    if (moving) { leg(-12, BY + 4, a, LL); leg(12, BY + 4, b, LL); }
    else if (sit) { leg(12, -17, -0.05, LL + 3); ctx.fillStyle = BLACK; ctx.beginPath(); ctx.ellipse(-9, -6, 8.5, 5.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = L.legLow; ctx.beginPath(); ctx.ellipse(-4, -2.5, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = L.paw; ctx.beginPath(); ctx.ellipse(-0.5, -1, 4, 2.4, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (bow) { ctx.fillStyle = L.legLow; ctx.beginPath(); ctx.ellipse(20, -2.5, 8, 2.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = L.paw; ctx.beginPath(); ctx.ellipse(28, -2.5, 3.8, 2.6, 0, 0, Math.PI * 2); ctx.fill(); leg(-13, -16, 0, LL + 3); }
    // head: a little bigger than life, the way cartoons do it
    var hx = lie ? 19 : sit ? 18 : bow ? 22 : 21, hy = lie ? -19 : sit ? -38 : bow ? -14 : BY - 12;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate((pose === 'run' ? Math.sin(ph) * 0.05 : bow ? -0.15 : lie ? 0.05 : 0) + (tilt || 0));
    var R = 11;
    // the ear behind the head (drop ears hang down each side)
    if (L.ear === 'drop') { ctx.fillStyle = '#1B1817'; ctx.beginPath(); ctx.ellipse(-4, 2, 4, 6.5, 0.35, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = BLACK; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8, 2.5, 8.5, 6.2, 0.08, 0, Math.PI * 2); ctx.fill(); // snout
    if (L.muzzle === 'cream') {
      ctx.fillStyle = TAN; ctx.beginPath(); ctx.ellipse(5, 2.6, 9.4, 7.8, 0.12, 0, Math.PI * 2); ctx.fill();            // soft fawn fills the lower face
      ctx.fillStyle = TAN; ctx.beginPath(); ctx.ellipse(10.8, 2.6, 6.6, 3.9, 0.06, 0, Math.PI * 2); ctx.fill();         // muzzle, the same fawn brown
      ctx.fillStyle = TAN; ctx.beginPath(); ctx.ellipse(7.5, 8.6, 7, 3.2, 0.12, 0, Math.PI * 2); ctx.fill();             // chin, the same fawn brown
      ctx.beginPath(); ctx.ellipse(2.5, 9.5, 4.5, 3.5, 0, 0, Math.PI * 2); ctx.fill();                                   // running into the throat
      ctx.fillStyle = BLACK; ctx.beginPath(); ctx.ellipse(4.3, -1.8, 3, 2.5, -0.1, 0, Math.PI * 2); ctx.fill();           // dark rim around the eye
      ctx.fillStyle = TAN; ctx.beginPath(); ctx.ellipse(3.4, -5.9, 3.6, 2.1, -0.25, 0, Math.PI * 2); ctx.fill();          // tan brow above it
    } else {
      ctx.fillStyle = TAN; ctx.beginPath(); ctx.ellipse(8.5, 4.5, 8, 4.8, 0.1, 0, Math.PI * 2); ctx.fill();          // tan lips and cheeks
      ctx.beginPath(); ctx.ellipse(4, 2.5, 3.8, 3.6, 0, 0, Math.PI * 2); ctx.fill();                                   // tan cheek patch
      ctx.fillStyle = BLACK; ctx.beginPath(); ctx.ellipse(10, 0.6, 7.5, 2.4, 0.08, 0, Math.PI * 2); ctx.fill();        // black nose bridge
      ctx.fillStyle = 'rgba(210,200,186,0.85)'; ctx.beginPath(); ctx.ellipse(8.5, 8.4, 3.2, 1.5, 0.15, 0, Math.PI * 2); ctx.fill(); // grey chin
      ctx.fillStyle = '#D69B5F'; ctx.beginPath(); ctx.arc(3.4, -5.6, 2.5, 0, Math.PI * 2); ctx.fill();               // round tan brow dot
    }
    ctx.fillStyle = '#121010'; ctx.beginPath(); ctx.ellipse(16, 1.4, 2.9, 2.3, 0, 0, Math.PI * 2); ctx.fill();       // nose
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(15.3, 0.6, 0.8, 0, Math.PI * 2); ctx.fill();
    // big happy open grin
    ctx.fillStyle = '#3A1E22'; ctx.beginPath(); ctx.moveTo(15, 4.6); ctx.quadraticCurveTo(11, 10.5, 6, 6); ctx.quadraticCurveTo(11, 7.6, 15, 4.6); ctx.fill();
    var pant = REDUCED ? 0 : Math.sin(t / (pose === 'run' ? 120 : 260)) * 0.8;
    ctx.fillStyle = PINK; ctx.beginPath(); ctx.ellipse(10.5, 8.6 + pant, 2.5, 3.2 + pant * 0.6, 0.2, 0, Math.PI * 2); ctx.fill();
    // soft, kind eye
    if (blink) { ctx.strokeStyle = '#121010'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(2.2, -1.6); ctx.lineTo(6.2, -1.6); ctx.stroke(); }
    else { ctx.fillStyle = '#3A2418'; ctx.beginPath(); ctx.arc(4.2, -1.6, 2.1, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(4.9, -2.4, 0.75, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(247,165,185,0.5)'; ctx.beginPath(); ctx.ellipse(7, 4.5, 2.2, 1.2, 0, 0, Math.PI * 2); ctx.fill();
    // the near ear
    var flap = pose === 'run' && !REDUCED ? Math.sin(ph * 1.1) * 0.35 : 0;
    if (L.ear === 'drop') {
      ctx.save(); ctx.translate(-3, -6.5); ctx.rotate(0.35 + flap);
      ctx.fillStyle = BLACK; ctx.beginPath(); ctx.ellipse(-1.5, 5.5, 4.8, 7.2, 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(214,160,150,0.5)'; ctx.beginPath(); ctx.ellipse(0.2, 1.8, 1.6, 3.2, 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(-1.5, 7, 4.6, 9.5, 0.15, -1.2, 0.3); ctx.stroke();
      ctx.restore();
    } else { // small folded ear up top, tipping forward, with a tan edge
      ctx.save(); ctx.translate(-1.5, -8.5); ctx.rotate(0.35 + flap * 0.4);
      ctx.fillStyle = BLACK; ctx.beginPath(); ctx.moveTo(-4, -1); ctx.quadraticCurveTo(1, -6, 6, 0); ctx.quadraticCurveTo(2, 4, -3, 3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#B97A43'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-3, 2.6); ctx.quadraticCurveTo(2, 3.6, 5.6, 0.4); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  function drawCape(L, t, col, flying) {
    var BY = L.build === 'lean' ? -21 : -18.5, f = Math.sin(t / (flying ? 70 : 170)), len = flying ? 36 : 24;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(15, BY - 9);
    ctx.quadraticCurveTo(-6, BY - 15 + f * 3, -len, BY - (flying ? 11 : 2) + f * 4);
    ctx.lineTo(-len + 4, BY + (flying ? 3 : 11) + f * 5);
    ctx.quadraticCurveTo(-6, BY + 2 - f * 2, 11, BY - 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.moveTo(8, BY - 8); ctx.quadraticCurveTo(-8, BY - 12 + f * 3, -len * 0.8, BY - (flying ? 9 : 1) + f * 4); ctx.lineTo(-len * 0.7, BY - (flying ? 6 : -2) + f * 4); ctx.quadraticCurveTo(-6, BY - 8, 8, BY - 6); ctx.fill();
    ctx.fillStyle = '#F8DC6E'; ctx.beginPath(); ctx.arc(14, BY - 6, 2.3, 0, Math.PI * 2); ctx.fill();
  }
  window.TOLPups = {
    looks: LOOKS,
    reduced: REDUCED,
    draw: function (c, L, pose, ph, wag, blink, t, tilt) { ctx = c; drawPup(L, pose, ph, wag, blink, t, tilt); },
    cape: function (c, L, t, col, flying) { ctx = c; drawCape(L, t, col, flying); }
  };
})();
