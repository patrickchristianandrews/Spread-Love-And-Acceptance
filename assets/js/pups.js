/* pups.js — the two pals, drawn exactly as they are in the Night Garden (night-garden.js),
   for pages that want them running about: the Frequency Journey's landing page.
   TOLPups.draw(ctx, look, pose, phase, wag, blink, t, tilt): pose is 'run', 'sit', 'bow', 'lie' or 'wiggle';
   draw at the paws (0,0), facing right; scale and flip the context first.
   An optional 9th argument, opts, is used by the pal cam (pals-cam.js): { ear: radians added to the
   near ear (a flick), noEar: true to leave the ears off (when they turn into helicopter blades). */
(function () {
  'use strict';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ctx = null;
  var LOOKS = {
    // stocky, long drop ears, tan brows running into tan cheeks, a fawn muzzle and chin, big white toes
    drop: { build: 'stocky', ear: 'drop', legUp: '#A45C2E', legLow: '#B97847', paw: '#F1EADF', nails: true, tan: '#C9965F', chest: 'white', muzzle: 'cream', collar: false, brow: 'patch', tail: 'plume' },
    // leaner and taller, round tan brow dots, tan cheeks and lips, folded ears, tan lower legs, a collar
    collar: { build: 'lean', ear: 'drop', legUp: '#262220', legLow: '#C98A4F', paw: '#D99E62', chest: 'spots', muzzle: 'rottie', collar: true, brow: 'dot', tail: 'long' }
  };
  // outfits (owner, Nov 3 2026): Tidbit always wears something purple, Sugarfoot always something pink, and the item
  // changes from scene to scene. The player sets TOLPups.outfitKey per scene; other pages get one per page.
  var OUTFITS = ['hat', 'cap', 'bow', 'bandana', 'necklace', 'shirt', 'shoes'];
  var WEAR = { collar: { main: '#7B4FBF', light: '#B39BE0', dark: '#55329A' }, drop: { main: '#F07EA6', light: '#FAB9CF', dark: '#D45A86' } };
  function hash(str) { var h = 0x811c9dc5; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; }
  function outfitFor(L, o) {
    if (o && o.outfit) return o.outfit; if (o && o.noOutfit) return null;
    var key = (window.TOLPups && window.TOLPups.outfitKey) || (location && location.pathname) || 'home';
    return OUTFITS[hash(key + '|' + (L.collar ? 'tidbit' : 'sugarfoot')) % OUTFITS.length];
  }
  function drawPup(L, pose, ph, wag, blink, t, tilt, o) {
    var wear = outfitFor(L, o), WC = L.collar ? WEAR.collar : WEAR.drop;
    function shoe(x, y, dk) { // a little sneaker over the paw: colored upper, pale sole, a lace
      if (wear !== 'shoes') return;
      var k = dk ? 0.78 : 1; function mul(c) { if (!dk) return c; var n = parseInt(c.slice(1), 16); return 'rgb(' + Math.round((n >> 16) * k) + ',' + Math.round((n >> 8 & 255) * k) + ',' + Math.round((n & 255) * k) + ')'; }
      ctx.fillStyle = mul('#F4EFE6'); ctx.beginPath(); ctx.ellipse(x + 0.6, y + 1.3, 4.6, 1.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = mul(WC.main); ctx.beginPath(); ctx.ellipse(x + 0.3, y - 0.4, 4.3, 2.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = mul(WC.light); ctx.beginPath(); ctx.ellipse(x - 0.8, y - 1.6, 1.9, 1.1, 0, 0, Math.PI * 2); ctx.fill();
    }
    var earX = (o && o.ear) || 0, noEar = !!(o && o.noEar);
    var BLACK = '#252120', TAN = L.tan || '#C4834A', WHITE = '#F4EFE6', PINK = '#EE8FA6';
    var lean = L.build === 'lean', LL = lean ? 15 : 12.5, BRX = lean ? 18.5 : 18, BRY = lean ? 8.8 : 10.2, BY = lean ? -21 : -18.5;
    function leg(x0, y0, ang, len, back) {
      ctx.save(); ctx.translate(x0, y0); ctx.rotate(ang);
      // owner, Nov 1 2026: "make sure they look smooth everywhere": one soft, tapered leg (thick at the top, slimmer at the
      // ankle) with a gently curved sock line and a round paw, instead of two stacked tubes; the far legs are a shade darker
      // (no grey box behind them)
      var up = len * 0.5, dk = back ? 0.22 : 0;
      function sh(c) { if (!dk || c.charAt(0) !== '#') return c; var n = parseInt(c.slice(1), 16), k = 1 - dk; return 'rgb(' + Math.round((n >> 16) * k) + ',' + Math.round((n >> 8 & 255) * k) + ',' + Math.round((n & 255) * k) + ')'; }
      ctx.fillStyle = sh(L.legLow); ctx.beginPath(); ctx.moveTo(-3.1, -1); ctx.quadraticCurveTo(-3.4, len * 0.5, -2.3, len - 0.6); ctx.lineTo(2.3, len - 0.6);
      ctx.quadraticCurveTo(3.4, len * 0.5, 3.1, -1); ctx.quadraticCurveTo(0, -3.4, -3.1, -1); ctx.fill();
      ctx.fillStyle = sh(L.legUp); ctx.beginPath(); ctx.moveTo(-3.1, -1); ctx.quadraticCurveTo(-3.3, up * 0.6, -2.9, up + 0.4); ctx.quadraticCurveTo(0, up + 1.8, 2.9, up + 0.4);
      ctx.quadraticCurveTo(3.3, up * 0.6, 3.1, -1); ctx.quadraticCurveTo(0, -3.4, -3.1, -1); ctx.fill();
      ctx.fillStyle = sh(L.paw); ctx.beginPath(); ctx.ellipse(1, len, 4.1, 2.6, 0, 0, Math.PI * 2); ctx.fill(); shoe(1, len, back);
      if (L.nails && wear !== 'shoes') { // pale toes with little dark nails
        ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(1.2, len - 1.6); ctx.lineTo(1.2, len + 1.2); ctx.moveTo(3.2, len - 1.3); ctx.lineTo(3.2, len + 1.3); ctx.stroke();
        ctx.fillStyle = '#2A2422'; [[4.6, len + 0.8], [3.3, len + 2.1], [1.6, len + 2.4]].forEach(function (n) { ctx.beginPath(); ctx.ellipse(n[0], n[1], 0.9, 0.55, 0.5, 0, Math.PI * 2); ctx.fill(); });
      }
      ctx.restore();
    }
    var lie = pose === 'lie', bow = pose === 'bow', sit = pose === 'sit', wiggle = pose === 'wiggle', moving = pose === 'run' || wiggle;
    var bodyTilt = sit ? -0.42 : bow ? 0.3 : 0;
    // tail: a soft plume, or a short happy stub-and-wag
    var tlen = L.tail === 'plume' ? 15 : L.tail === 'long' ? 17 : 10;
    ctx.save(); ctx.translate(lie ? -18 : sit ? -12 : bow ? -13 : -16, lie ? -9 : sit ? -3 : bow ? -22 : BY - 2); ctx.rotate((bow ? -1.1 : sit ? -0.6 : -0.9) + wag);
    if (L.tail === 'plume') { // the original soft plume
      ctx.strokeStyle = BLACK; ctx.lineWidth = 5.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-6, -tlen * 0.45, -5, -tlen); ctx.stroke();
      ctx.strokeStyle = TAN; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(1, 1); ctx.quadraticCurveTo(-4, -tlen * 0.35, -3.6, -tlen * 0.75); ctx.stroke(); ctx.lineCap = 'butt';
    } else if (L.tail === 'long') { // a long thin curve, up and over (Tidbit)
      ctx.strokeStyle = BLACK; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-7, -tlen * 0.5, -3, -tlen); ctx.stroke(); ctx.lineCap = 'butt';
    } else {
      ctx.strokeStyle = BLACK; ctx.lineWidth = 4.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-6, -tlen * 0.45, -5, -tlen); ctx.stroke(); ctx.lineCap = 'butt';
    }
    ctx.restore();
    var a = Math.sin(ph) * 0.7, b = Math.sin(ph + Math.PI) * 0.7;
    if (wiggle) { a = Math.sin(t / 60) * 0.6; b = Math.sin(t / 60 + 2) * 0.6; }
    if (moving) { leg(-10, BY + 5, b * 0.8, LL, true); leg(10, BY + 5, a * 0.8, LL, true); }
    // the near legs too, before the body, so they come out from under it instead of sitting on top like stickers (owner, Nov 2 2026)
    if (moving) { leg(-12, BY + 4, a, LL); leg(12, BY + 4, b, LL); }
    else if (sit) leg(9, -16, 0.05, LL + 2, true);
    else if (bow) leg(-11, -18, 0.05, LL + 4, true);
    // sitting: a neck from the shoulders up into the head, behind the chest markings, so the head sits on the body smoothly (owner, Nov 1 2026)
    if (sit) { ctx.fillStyle = BLACK; ctx.beginPath(); ctx.ellipse(14, -29, 7.5, 10, 0.25, 0, Math.PI * 2); ctx.fill(); }
    // body
    ctx.save(); ctx.rotate(bodyTilt);
    if (lie) {
      ctx.fillStyle = BLACK; ctx.beginPath(); ctx.ellipse(-2, -9, 19, 8.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = L.legLow; ctx.beginPath(); ctx.ellipse(-12, -4, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = L.legLow; ctx.beginPath(); ctx.ellipse(18, -2.5, 8, 2.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = L.paw; ctx.beginPath(); ctx.ellipse(26, -2.5, 3.8, 2.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(23, -0.3, 3.8, 2.5, 0, 0, Math.PI * 2); ctx.fill(); shoe(26, -2.5, true); shoe(23, -0.3);
      if (L.chest === 'white') { ctx.fillStyle = '#F2ECE3'; ctx.beginPath(); ctx.ellipse(12.5, -7, 1.4, 2.6, 0, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.fillStyle = TAN; ctx.beginPath(); ctx.ellipse(11, -6.5, 2.4, 2.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(15, -7.5, 2.1, 2, 0, 0, Math.PI * 2); ctx.fill(); }
    } else {
      ctx.fillStyle = BLACK; ctx.beginPath(); ctx.ellipse(0, BY, BRX, BRY, 0, 0, Math.PI * 2); ctx.fill();
      if (!sit) { ctx.beginPath(); ctx.ellipse(12, BY - 5, 7, 8, -0.5, 0, Math.PI * 2); ctx.fill(); } // neck (sitting has its own; this one would tip up into a lump on the back)
      if (sit) { /* sitting: the chest marks go on the upright chest, drawn after the body (the tipped body would put them on the back) */ }
      else if (L.chest === 'white') { // Sugarfoot, as she always was: a fawn throat and a small pale streak on the chest
        ctx.fillStyle = TAN; ctx.beginPath(); ctx.ellipse(16, BY - 4, 4, 6.5, -0.45, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#F2ECE3'; ctx.beginPath(); ctx.ellipse(15.6, BY + 1.5, 1.5, 3.4, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = TAN; ctx.beginPath(); ctx.ellipse(12, BY + 7.5, 4.5, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      }
      else if (L.chest === 'spots') { // Tidbit: two tan spots on the chest and a tan throat
        ctx.fillStyle = TAN; ctx.beginPath(); ctx.ellipse(16, BY - 3, 3, 4.2, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(13.5, BY + 4, 2.4, 2.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(17.5, BY + 3.2, 2.1, 2, 0, 0, Math.PI * 2); ctx.fill();
      }
      else {
        ctx.fillStyle = TAN; ctx.beginPath(); ctx.ellipse(14, BY + 0.5, 4.2, 3.4, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(15, BY + 5.5, 3.6, 2.8, -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = WHITE; ctx.beginPath(); ctx.arc(15.8, BY + 3, 1.1, 0, Math.PI * 2); ctx.fill();
      }
      if (L.collar && !sit) { ctx.strokeStyle = '#141111'; ctx.lineWidth = 2.8; ctx.beginPath(); ctx.moveTo(9, BY - 11); ctx.quadraticCurveTo(14, BY - 3, 18, BY - 5); ctx.stroke();
        ctx.fillStyle = '#D5D9E0'; ctx.fillRect(13.6, BY - 7.4, 2.8, 2.4); ctx.fillStyle = '#141111'; ctx.fillRect(14.4, BY - 6.8, 1.2, 1.2); }
      if (wear === 'shirt') { // a little tee over the front of the body, with a pale collar and a sleeve
        ctx.save(); ctx.beginPath(); ctx.ellipse(0, BY, BRX, BRY, 0, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = WC.main; ctx.beginPath(); ctx.ellipse(5, BY + 0.5, BRX * 0.7, BRY + 1, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = WC.dark; ctx.beginPath(); ctx.ellipse(-6.5, BY + 1, 2.2, BRY + 1, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = WC.light; ctx.beginPath(); ctx.ellipse(4, BY - 3.5, 3.2, 2.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.fillStyle = WC.light; ctx.beginPath(); ctx.ellipse(13, BY - 8, 3.4, 2.4, -0.5, 0, Math.PI * 2); ctx.fill(); // the collar of the tee
      }
    }
    if (wear === 'shirt' && lie) { ctx.fillStyle = WC.main; ctx.beginPath(); ctx.ellipse(2, -10.5, 12, 6.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = WC.light; ctx.beginPath(); ctx.ellipse(12.5, -12, 3, 2, -0.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    // sitting: the chest marks on the upright chest, under the sitting neck
    if (sit && L.chest === 'white') {
      ctx.fillStyle = TAN; ctx.beginPath(); ctx.ellipse(16, -24, 3.6, 6, -0.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#F2ECE3'; ctx.beginPath(); ctx.ellipse(16, -17, 1.5, 3.4, -0.1, 0, Math.PI * 2); ctx.fill();
    } else if (sit && L.chest === 'spots') {
      ctx.fillStyle = TAN; ctx.beginPath(); ctx.ellipse(16.5, -23, 2.8, 4, -0.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(14, -14.5, 2.3, 2.1, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(18.5, -15, 2, 1.9, 0, 0, Math.PI * 2); ctx.fill();
    }
    // sitting, the collar goes round the sitting neck (the body's own collar spot turns to the back when it tips up)
    if (sit && L.collar) { ctx.strokeStyle = '#141111'; ctx.lineWidth = 2.8; ctx.beginPath(); ctx.moveTo(8.5, -33); ctx.quadraticCurveTo(13.5, -25, 20, -28); ctx.stroke();
      ctx.fillStyle = '#D5D9E0'; ctx.fillRect(14.2, -27.6, 2.8, 2.4); ctx.fillStyle = '#141111'; ctx.fillRect(15, -27, 1.2, 1.2); }
    if (moving) { /* the near legs are drawn before the body (above) */ }
    else if (sit) { leg(12, -17, -0.05, LL + 3); ctx.fillStyle = BLACK; ctx.beginPath(); ctx.ellipse(-9, -6, 8.5, 5.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = L.legLow; ctx.beginPath(); ctx.ellipse(-4, -2.5, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = L.paw; ctx.beginPath(); ctx.ellipse(-0.5, -1, 4, 2.4, 0, 0, Math.PI * 2); ctx.fill(); shoe(-0.5, -1); }
    else if (bow) { ctx.fillStyle = L.legLow; ctx.beginPath(); ctx.ellipse(20, -2.5, 8, 2.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = L.paw; ctx.beginPath(); ctx.ellipse(28, -2.5, 3.8, 2.6, 0, 0, Math.PI * 2); ctx.fill(); shoe(28, -2.5); leg(-13, -16, 0, LL + 3); }
    // head: a little bigger than life, the way cartoons do it
    var hx = lie ? 19 : sit ? 18 : bow ? 22 : 21, hy = lie ? -19 : sit ? -38 : bow ? -14 : BY - 12;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate((pose === 'run' ? Math.sin(ph) * 0.05 : bow ? -0.15 : lie ? 0.05 : 0) + (tilt || 0));
    var R = 11;
    // the ear behind the head (drop ears hang down each side)
    if (L.ear === 'drop' && !noEar) { ctx.fillStyle = '#1B1817'; ctx.beginPath(); ctx.ellipse(-4, 2, 4, 6.5, 0.35, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = BLACK; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8, 2.5, 8.5, 6.2, 0.08, 0, Math.PI * 2); ctx.fill(); // snout
    if (L.muzzle === 'cream' || L.muzzle === 'blaze') { // Sugarfoot, from her photo
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.ellipse(8, 2.5, 8.5, 6.2, 0.08, 0, Math.PI * 2); ctx.clip(); // every mark stays inside the head
      sfLowerFace(TAN, WHITE);
      // the black stripe: from the forehead between the eyes, down the top of the muzzle to the nose
      ctx.fillStyle = BLACK; ctx.beginPath(); ctx.moveTo(4.6, -14); ctx.lineTo(22, -14); ctx.lineTo(22, -0.4); ctx.lineTo(15.4, -0.3);
      ctx.quadraticCurveTo(10.5, -0.5, 7.2, -2.2); ctx.quadraticCurveTo(5.4, -4.2, 4.6, -14); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(4.3, -1.7, 3.1, 2.6, -0.1, 0, Math.PI * 2); ctx.fill();                                // dark rim around the eye
      ctx.beginPath(); ctx.ellipse(6.7, -0.2, 0.7, 1.5, -0.5, 0, Math.PI * 2); ctx.fill();                                // dark at the eye's front corner, into the stripe
      // the long pale brow, slanting up and back toward the ear
      ctx.fillStyle = '#D3A676'; ctx.beginPath(); ctx.ellipse(2.6, -5.9, 5, 1.75, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#EADAC2'; ctx.beginPath(); ctx.ellipse(3.1, -6.4, 3, 0.8, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
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
    if (noEar) { /* the pal cam draws them itself */ }
    else if (L.ear === 'drop') {
      ctx.save(); ctx.translate(-3, -6.5); ctx.rotate(0.35 + flap + earX);
      ctx.fillStyle = BLACK; ctx.beginPath(); ctx.ellipse(-1.5, 5.5, 4.8, 7.2, 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(214,160,150,0.5)'; ctx.beginPath(); ctx.ellipse(0.2, 1.8, 1.6, 3.2, 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(-1.5, 7, 4.6, 9.5, 0.15, -1.2, 0.3); ctx.stroke();
      ctx.restore();
    } else { // small folded ear up top, tipping forward, with a tan edge
      ctx.save(); ctx.translate(-1.5, -8.5); ctx.rotate(0.35 + flap * 0.4 + earX * 0.6);
      ctx.fillStyle = BLACK; ctx.beginPath(); ctx.moveTo(-4, -1); ctx.quadraticCurveTo(1, -6, 6, 0); ctx.quadraticCurveTo(2, 4, -3, 3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#B97A43'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-3, 2.6); ctx.quadraticCurveTo(2, 3.6, 5.6, 0.4); ctx.stroke();
      ctx.restore();
    }
    // what she wears on her head or at her neck (the shirt is on the body)
    if (wear === 'hat') { // a soft beanie with a pompom
      ctx.fillStyle = WC.main; ctx.beginPath(); ctx.ellipse(-1.5, -9.2, 8.6, 4.8, -0.12, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = WC.dark; ctx.beginPath(); ctx.ellipse(-1.5, -9, 8.8, 1.7, -0.12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = WC.light; ctx.beginPath(); ctx.arc(-2.5, -14.2, 2.4, 0, Math.PI * 2); ctx.fill();
    } else if (wear === 'cap') { // a ball cap, brim toward the nose
      ctx.fillStyle = WC.main; ctx.beginPath(); ctx.ellipse(-1, -8.8, 8.2, 5, -0.1, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = WC.dark; ctx.beginPath(); ctx.ellipse(6.5, -8.6, 6.5, 1.6, -0.05, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = WC.light; ctx.beginPath(); ctx.arc(-1, -13.4, 1.1, 0, Math.PI * 2); ctx.fill();
    } else if (wear === 'bow') { // a bow by the ear
      ctx.fillStyle = WC.main; ctx.beginPath(); ctx.ellipse(-8.3, -8.6, 3.4, 2.1, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(-2.5, -9.8, 3.4, 2.1, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = WC.dark; ctx.beginPath(); ctx.arc(-5.4, -9.3, 1.5, 0, Math.PI * 2); ctx.fill();
    } else if (wear === 'bandana') { // a bandana knotted at the neck, the point hanging down the chest
      ctx.fillStyle = WC.main; ctx.beginPath(); ctx.moveTo(-6, 7.5); ctx.quadraticCurveTo(2, 9.5, 10, 7.5); ctx.lineTo(3, 17.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = WC.light; ctx.beginPath(); ctx.moveTo(-5.5, 8); ctx.quadraticCurveTo(2, 9.8, 9.5, 8); ctx.quadraticCurveTo(2, 11.2, -5.5, 8); ctx.fill();
      ctx.fillStyle = WC.dark; ctx.beginPath(); ctx.arc(-4.5, 8.5, 1.4, 0, Math.PI * 2); ctx.fill();
    } else if (wear === 'necklace') { // a string of beads with a heart
      ctx.strokeStyle = WC.dark; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-5, 7.5); ctx.quadraticCurveTo(2, 15, 9.5, 8); ctx.stroke();
      ctx.fillStyle = WC.light; [[-3, 9.4], [0, 11], [5, 11], [8, 9.3]].forEach(function (b) { ctx.beginPath(); ctx.arc(b[0], b[1], 1, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = WC.main; ctx.beginPath(); ctx.moveTo(2.5, 15.2); ctx.bezierCurveTo(-0.5, 12.6, 0.4, 10.6, 2.5, 11.8); ctx.bezierCurveTo(4.6, 10.6, 5.5, 12.6, 2.5, 15.2); ctx.fill();
    }
    ctx.restore();
  }
  // Sugarfoot's lower face, without the grin: tan cheeks and tan up the sides of the muzzle, white only along the lips,
  // beside the nose, on the chin and down the throat (with a cream edge where the tan meets the white, like her photo)
  function sfLowerFace(TAN, WHITE) {
    ctx.fillStyle = TAN; ctx.beginPath(); ctx.ellipse(4.5, 4, 8.6, 7.2, 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-3, 0.5, 4.2, 5.5, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10.5, 2.4, 7, 3.6, 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#E6CFB2'; ctx.beginPath(); ctx.ellipse(11.6, 5.2, 6.2, 3.3, 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(14.6, 3.2, 2.9, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = WHITE; ctx.beginPath(); ctx.ellipse(12, 5.8, 5.4, 2.6, 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(14.8, 3.8, 2.3, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8, 8.8, 6.2, 3, 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(2.5, 10, 4.2, 3.2, 0, 0, Math.PI * 2); ctx.fill();
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
    outfits: OUTFITS, outfitKey: null,
    reduced: REDUCED,
    draw: function (c, L, pose, ph, wag, blink, t, tilt, opts) { ctx = c; drawPup(L, pose, ph, wag, blink, t, tilt, opts); },
    cape: function (c, L, t, col, flying) { ctx = c; drawCape(L, t, col, flying); },
    // repaint Sugarfoot's lower face under a new mouth (head space, below the eye line only)
    lowerFace: function (c, L) { ctx = c; c.save(); c.beginPath(); c.rect(-30, 3.6, 60, 30); c.clip(); sfLowerFace(L.tan || '#C4834A', '#F4EFE6'); c.restore(); }
  };
})();
