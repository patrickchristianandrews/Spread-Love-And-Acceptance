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
  // light from above: a soft sheen along the middle of the back, fading to nothing well before the neck, legs and tail,
  // so the body reads as one smooth round shape and no joint ever shows a line
  function roundShade(cx, cy, rx, ry) {
    ctx.save(); ctx.translate(cx - rx * 0.18, cy - ry * 0.5); ctx.scale(1, 0.34);
    var gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 0.68); gr.addColorStop(0, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, rx * 0.68, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  // where each pose puts the head (in pup space, paws at 0,0, facing right) and how it is turned
  function headPos(L, pose, ph) {
    var BY = L.build === 'lean' ? -21 : -18.5;
    return { x: pose === 'lie' ? 19 : pose === 'sit' ? 18 : pose === 'bow' ? 22 : 21, y: pose === 'lie' ? -19 : pose === 'sit' ? -38 : pose === 'bow' ? -14 : BY - 12,
             r: pose === 'run' ? Math.sin(ph || 0) * 0.05 : pose === 'bow' ? -0.15 : pose === 'lie' ? 0.05 : 0 };
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
      roundShade(-2, -9, 19, 8.5);
      ctx.fillStyle = L.legLow; ctx.beginPath(); ctx.ellipse(-12, -4, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = L.legLow; ctx.beginPath(); ctx.ellipse(18, -2.5, 8, 2.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = L.paw; ctx.beginPath(); ctx.ellipse(26, -2.5, 3.8, 2.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(23, -0.3, 3.8, 2.5, 0, 0, Math.PI * 2); ctx.fill(); shoe(26, -2.5, true); shoe(23, -0.3);
      if (L.chest === 'white') { ctx.fillStyle = '#F2ECE3'; ctx.beginPath(); ctx.ellipse(12.5, -7, 1.4, 2.6, 0, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.fillStyle = TAN; ctx.beginPath(); ctx.ellipse(11, -6.5, 2.4, 2.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(15, -7.5, 2.1, 2, 0, 0, Math.PI * 2); ctx.fill(); }
    } else {
      ctx.fillStyle = BLACK; ctx.beginPath(); ctx.ellipse(0, BY, BRX, BRY, 0, 0, Math.PI * 2); ctx.fill();
      if (!sit) { ctx.beginPath(); ctx.ellipse(12, BY - 5, 7, 8, -0.5, 0, Math.PI * 2); ctx.fill(); } // neck (sitting has its own; this one would tip up into a lump on the back)
      roundShade(0, BY, BRX, BRY); // soft light along the back and shade underneath, so the body reads as one smooth round shape
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
    // (o.head, when given, puts the head somewhere else: the player moves it smoothly from one pose's place to the next)
    var hp = (o && o.head) || headPos(L, pose, ph);
    ctx.save(); ctx.translate(hp.x, hp.y); ctx.rotate(hp.r + (tilt || 0));
    var R = 11;
    // the ear behind the head (drop ears hang down each side)
    if (L.ear === 'drop' && !noEar) { ctx.fillStyle = '#1B1817'; ctx.beginPath(); ctx.ellipse(-4, 2, 4, 6.5, 0.35, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = BLACK; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8, 2.5, 8.5, 6.2, 0.08, 0, Math.PI * 2); ctx.fill(); // snout
    var hg = ctx.createRadialGradient(-2.5, -6.5, 0.5, -2.5, -6.5, 10); hg.addColorStop(0, 'rgba(255,255,255,0.13)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill(); // a soft sheen on the crown
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
    var pant = REDUCED ? 0 : Math.sin(t / (pose === 'run' ? 120 : 260)) * 0.8;
    if (o && o.talk > 0) { // talking (opts.talk, 0..1 from the voice's loudness): the mouth opens and closes with the words
      var tk = Math.min(1, (o.talk - 0.02) / 0.98);
      ctx.fillStyle = '#3A1E22'; ctx.beginPath(); ctx.moveTo(15, 4.6); ctx.quadraticCurveTo(11, 6.6 + 6.4 * tk, 6.2, 6); ctx.quadraticCurveTo(11, 6.9, 15, 4.6); ctx.fill();
      if (tk > 0.25) { ctx.save(); ctx.clip(); ctx.fillStyle = PINK; ctx.beginPath(); ctx.ellipse(10.6, 6.8 + 4.6 * tk, 2.4, 1.2 + 1.6 * tk, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    } else { // big happy open grin
      ctx.fillStyle = '#3A1E22'; ctx.beginPath(); ctx.moveTo(15, 4.6); ctx.quadraticCurveTo(11, 10.5, 6, 6); ctx.quadraticCurveTo(11, 7.6, 15, 4.6); ctx.fill();
      ctx.fillStyle = PINK; ctx.beginPath(); ctx.ellipse(10.5, 8.6 + pant, 2.5, 3.2 + pant * 0.6, 0.2, 0, Math.PI * 2); ctx.fill();
    }
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
    headPos: headPos,
    // repaint Sugarfoot's lower face under a new mouth (head space, below the eye line only)
    lowerFace: function (c, L) { ctx = c; c.save(); c.beginPath(); c.rect(-30, 3.6, 60, 30); c.clip(); sfLowerFace(L.tan || '#C4834A', '#F4EFE6'); c.restore(); }
  };
})();

/* The painted Tidbit and Sugarfoot (owner, Nov 17 2026: "update Sugarfoot and Tidbit to the current version all over
   the website", the painted look first seen in the Season 2 teaser). Their art is two painted sheets,
   /assets/img/pups-sprites/walk.webp (four walk frames each) and poses.webp (three views each). Once both sheets have
   loaded, TOLPups.draw, headPos and head draw these instead of the vector pups above, with the same arguments, so every
   page, the episode player, the pal cams, the launch screen and the games change together. Until then (and if the
   sheets can't load) the vector pups are drawn. TOLPups.ready resolves when the painted pups are in. */
(function () {
  'use strict';
  var P = (typeof window !== 'undefined' ? window : self).TOLPups; if (!P) return;
  var window = (typeof self !== 'undefined' ? self : this);
  var META = {"poses":[{"r":0,"c":0,"x0":32,"x1":97,"y0":14,"y1":111,"hx":64.47295673076923,"hy":35.47716346153846,"ang":0,"dog":0},{"r":0,"c":1,"x0":18,"x1":99,"y0":14,"y1":110,"hx":74.31534309946029,"hy":34.88897455666924,"ang":1,"dog":0},{"r":0,"c":2,"x0":13,"x1":116,"y0":14,"y1":110,"hx":88.06999195494771,"hy":36.154465004022526,"ang":2,"dog":0},{"r":0,"c":3,"x0":31,"x1":111,"y0":14,"y1":112,"hx":86.22783825816485,"hy":35.77760497667185,"ang":3,"dog":0},{"r":1,"c":0,"x0":33,"x1":95,"y0":9,"y1":108,"hx":64.12722802704364,"hy":31.169022741241548,"ang":4,"dog":0},{"r":1,"c":1,"x0":20,"x1":99,"y0":9,"y1":108,"hx":44.3700543056633,"hy":30.541505042668735,"ang":5,"dog":0},{"r":1,"c":2,"x0":10,"x1":114,"y0":10,"y1":107,"hx":37.67769897557132,"hy":31.84475965327029,"ang":6,"dog":0},{"r":1,"c":3,"x0":20,"x1":107,"y0":10,"y1":108,"hx":46.35302593659942,"hy":31.67435158501441,"ang":7,"dog":0},{"r":2,"c":0,"x0":30,"x1":97,"y0":6,"y1":107,"hx":64.00492341356674,"hy":28.915754923413566,"ang":0,"dog":1},{"r":2,"c":1,"x0":14,"x1":100,"y0":7,"y1":107,"hx":73.84728734092431,"hy":28.716008037508374,"ang":1,"dog":1},{"r":2,"c":2,"x0":6,"x1":114,"y0":7,"y1":107,"hx":84.59847434119278,"hy":30.002080443828017,"ang":2,"dog":1},{"r":2,"c":3,"x0":25,"x1":110,"y0":6,"y1":107,"hx":82.73403456048084,"hy":28.89556724267468,"ang":3,"dog":1},{"r":3,"c":0,"x0":30,"x1":94,"y0":3,"y1":107,"hx":61.93784078516903,"hy":25.863140676117776,"ang":4,"dog":1},{"r":3,"c":1,"x0":13,"x1":102,"y0":4,"y1":106,"hx":40.836413415468854,"hy":26.279945242984258,"ang":5,"dog":1},{"r":3,"c":2,"x0":1,"x1":115,"y0":4,"y1":106,"hx":32.72020725388601,"hy":26.91062176165803,"ang":6,"dog":1},{"r":3,"c":3,"x0":17,"x1":111,"y0":3,"y1":107,"hx":45.365396627108055,"hy":25.96002498438476,"ang":7,"dog":1}],"walk":[{"r":0,"c":0,"x0":7,"x1":120,"y0":23,"y1":105,"hx":93.2337552742616,"hy":41.94514767932489,"dog":0},{"r":0,"c":1,"x0":15,"x1":120,"y0":23,"y1":106,"hx":93.19357495881384,"hy":42.522240527182866,"dog":0},{"r":0,"c":2,"x0":14,"x1":120,"y0":23,"y1":106,"hx":93.16105176663928,"hy":42.455217748562035,"dog":0},{"r":0,"c":3,"x0":15,"x1":120,"y0":24,"y1":106,"hx":93.3774385072095,"hy":42.78201865988126,"dog":0},{"r":1,"c":0,"x0":7,"x1":120,"y0":21,"y1":109,"hx":92.9360119047619,"hy":40.85565476190476,"dog":1},{"r":1,"c":1,"x0":13,"x1":120,"y0":21,"y1":110,"hx":92.8474331164136,"hy":41.33405639913232,"dog":1},{"r":1,"c":2,"x0":13,"x1":120,"y0":21,"y1":110,"hx":93.07350800582242,"hy":41.346433770014556,"dog":1},{"r":1,"c":3,"x0":13,"x1":120,"y0":21,"y1":110,"hx":93.07272727272728,"hy":41.35345454545455,"dog":1}],"fw":128,"fh":128,"wh":128}, BASE = '/assets/img/pups-sprites/';

  var K = 0.52;          // pup units per sprite pixel: a standing pup is about 50 units tall, like the drawn ones
  var S = null;
  // their colors (owner, Nov 3 2026): Tidbit always wears something purple, Sugarfoot something pink, a different item
  // each scene. The painted sheets have no outfits, so the item is drawn on: on the head (a beanie, a cap, a bow) or at
  // the neck (a bandana, a necklace). When a scene already puts something on a pup's head, the item goes at the neck.
  var WEAR = { tidbit: { main: '#7B4FBF', light: '#B39BE0', dark: '#55329A' }, sugarfoot: { main: '#F07EA6', light: '#FAB9CF', dark: '#D45A86' } };
  var HEAD = ['hat', 'cap', 'bow'], NECK = ['bandana', 'necklace'], ALL = HEAD.concat(NECK);
  function hash(str) { var h = 0x811c9dc5; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; }
  function outfit(who, o) {
    var key = (window.TOLPups && window.TOLPups.outfitKey) || (typeof location !== 'undefined' && location.pathname) || 'site', h = hash(key + '|' + who);
    if (o && o.hat) return NECK[h % NECK.length];
    return ALL[h % ALL.length];
  }
  // the items, in head space (head centre at 0,0, facing right), drawn a little bigger than on the drawn pups' heads
  function wearItem(ctx, wear, WC, neckDy) {
    if (HEAD.indexOf(wear) >= 0) { ctx.translate(0.5, 4.6); ctx.scale(1.14, 1.14); } // these heads are bigger and sit lower than the drawn ones
    if (wear === 'hat') {
      ctx.fillStyle = WC.main; ctx.beginPath(); ctx.ellipse(-1.5, -9.2, 8.6, 4.8, -0.12, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = WC.dark; ctx.beginPath(); ctx.ellipse(-1.5, -9, 8.8, 1.7, -0.12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = WC.light; ctx.beginPath(); ctx.arc(-2.5, -14.2, 2.4, 0, Math.PI * 2); ctx.fill();
    } else if (wear === 'cap') {
      ctx.fillStyle = WC.main; ctx.beginPath(); ctx.ellipse(-1, -8.8, 8.2, 5, -0.1, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = WC.dark; ctx.beginPath(); ctx.ellipse(6.5, -8.6, 6.5, 1.6, -0.05, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = WC.light; ctx.beginPath(); ctx.arc(-1, -13.4, 1.1, 0, Math.PI * 2); ctx.fill();
    } else if (wear === 'bow') {
      ctx.fillStyle = WC.main; ctx.beginPath(); ctx.ellipse(-8.3, -8.6, 3.4, 2.1, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(-2.5, -9.8, 3.4, 2.1, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = WC.dark; ctx.beginPath(); ctx.arc(-5.4, -9.3, 1.5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.translate(-1, neckDy);
      if (wear === 'bandana') {
        ctx.fillStyle = WC.main; ctx.beginPath(); ctx.moveTo(-6, 7.5); ctx.quadraticCurveTo(2, 9.5, 10, 7.5); ctx.lineTo(3, 17.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = WC.light; ctx.beginPath(); ctx.moveTo(-5.5, 8); ctx.quadraticCurveTo(2, 9.8, 9.5, 8); ctx.quadraticCurveTo(2, 11.2, -5.5, 8); ctx.fill();
        ctx.fillStyle = WC.dark; ctx.beginPath(); ctx.arc(-4.5, 8.5, 1.4, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.strokeStyle = WC.dark; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-5, 7.5); ctx.quadraticCurveTo(2, 15, 9.5, 8); ctx.stroke();
        ctx.fillStyle = WC.light; [[-3, 9.4], [0, 11], [5, 11], [8, 9.3]].forEach(function (b) { ctx.beginPath(); ctx.arc(b[0], b[1], 1.2, 0, Math.PI * 2); ctx.fill(); });
        ctx.fillStyle = WC.main; ctx.beginPath(); ctx.moveTo(2.5, 15.2); ctx.bezierCurveTo(-0.5, 12.6, 0.4, 10.6, 2.5, 11.8); ctx.bezierCurveTo(4.6, 10.6, 5.5, 12.6, 2.5, 15.2); ctx.fill();
      }
    }
  }
  // the jaw of each drawing, measured on the sheets (sprite pixels, from the head centre): the mouth line runs from the
  // corner (the hinge, first point) to the front of the lips; the rest goes round the chin and the tongue
  var JAW = {
    0: { a1: [[-1, 8], [16, 12], [20, 16], [18, 22], [8, 22], [1, 16]], a2: [[9, 6], [27, 9], [26, 14], [22, 19], [15, 17], [11, 11]], w: [[-1, 8], [17, 13], [18, 18], [15, 22], [6, 20], [1, 14]] },
    1: { a1: [[-1, 6], [18, 8], [18, 14], [14, 19], [5, 18], [1, 12]], a2: [[11, 2], [29, 4], [27, 10], [22, 16], [16, 14], [13, 8]], w: [[-3, 9], [17, 9], [17, 15], [13, 19], [4, 19], [-1, 14]] }
  };
  // talking (opts.talk, 0..1 from the voice's loudness): the painted mouth opens. Everything between the mouth line and
  // the chin is stretched down smoothly (most at the chin, fading out into the neck and to each side), so the drawing's
  // own lips and tongue open up, with no edges and nothing drawn on top
  function jaw(ctx, fr, dog, kind, tk) {
    // while talking the jaw goes from a little closed (past the painted smile, between syllables) to wide open
    var J = JAW[dog][kind], f = fr.f, fw = S.meta.fw, d = -2.4 + 7.9 * tk;
    if (Math.abs(d) < 0.15) return;
    var xs = J.map(function (p) { return p[0]; }), ys = J.map(function (p) { return p[1]; });
    var x0 = Math.min.apply(null, xs) - 4, x1 = Math.max.apply(null, xs) + 3, chin = Math.max.apply(null, ys), y1 = chin + 10;
    var a = J[0], b = J[1];
    function top(x) { var u = Math.max(0, Math.min(1, (x - a[0]) / ((b[0] - a[0]) || 1))); return a[1] + (b[1] - a[1]) * u; }
    function ss(v) { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); }
    function dy(x, y) {
      var t = top(x), wy = y <= t ? 0 : y <= chin ? ss((y - t) / Math.max(2, chin - t)) : 1 - ss((y - chin) / (y1 - chin));
      var wx = ss((x - x0) / 5) * ss((x1 - x) / 5);
      return d * wy * wx;
    }
    var ytop = Math.floor(Math.min(a[1], b[1])) - (d < 0 ? 4 : 1), sx0 = f.c * fw + f.hx, sy0 = f.r * fr.fh + f.hy;
    for (var x = Math.floor(x0); x < x1; x += 1) {
      for (var y = ytop; y < y1; y++) {
        var o0 = dy(x + 0.5, y), o1 = dy(x + 0.5, y + 1);
        ctx.drawImage(fr.img, sx0 + x, sy0 + y, 1, 1, x, y + o0, 1.4, Math.max(0.6, 1 + (o1 - o0)) + 0.6);
      }
    }
  }
  // their eyes on each drawing (sprite pixels from the head centre: x, y, radius, and the fur colour just above), for
  // blinking: a lid of that fur comes down over the eye with a dark lash line along its edge
  var EYES = {
    '0:1': [[-2.5, -4, 3.1, '#332820'], [12, -6, 2.6, '#393128']], '0:2': [[10, -5.5, 3.1, '#352821']],
    '1:1': [[-3, -6, 3.3, '#815E3E'], [12, -7, 2.7, '#725740']], '1:2': [[11, -7, 3.1, '#694A35']]
  };
  function blinkLids(ctx, fr, dog, ang, shut) {
    // the lid is the painted fur from just above the eye, slid down over it (so it has the fur's own colors and
    // texture), and a closed eye is a soft dark curve, like a sleepy smile
    var f = fr.f, fw = S.meta.fw, sx0 = f.c * fw + f.hx, sy0 = f.r * fr.fh + f.hy;
    (EYES[dog + ':' + ang] || []).forEach(function (e) {
      var x = e[0], y = e[1], r = e[2] + 0.5, h = 2 * r * shut;
      ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, r + 0.3, r + 0.3, 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = e[3]; ctx.fillRect(x - r - 1, y - r - 1, 2 * r + 2, h + 1);
      ctx.drawImage(fr.img, sx0 + x - r - 1, sy0 + y - r - 1 - 2 * r - 1, 2 * r + 2, 2 * r + 1, x - r - 1, y - r - 1 + h - 2 * r - 1, 2 * r + 2, 2 * r + 1);
      ctx.restore();
      if (shut > 0.6) { ctx.strokeStyle = 'rgba(18,12,10,.9)'; ctx.lineWidth = 1.1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(x, y - 0.6, r * 0.8, 1.4, 0, 0.25, Math.PI - 0.25); ctx.stroke(); }
    });
  }
  function frame(dog, pose, ph) {
    var M = S.meta;
    if (pose === 'run' && S.moving[dog]) { var q = Math.floor((((ph % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2)) % 4; return { img: S.walk, f: M.walk[dog * 4 + q], fh: M.wh }; }
    // 'front': looking straight out at us (the books' title and calm pages); 'back': walking away
    var ang = pose === 'front' ? 0 : pose === 'back' ? 4 : pose === 'lie' || pose === 'bow' ? 2 : 1;
    var f = M.poses.filter(function (x) { return x.dog === dog && x.ang === ang; })[0];
    return { img: S.poses, f: f, fh: M.fh };
  }
  // the walk has four painted frames a stride, shown one at a time (no blending: two drawings at once read as a double
  // face); a pose change (sitting down, getting up to run) is a clean cut to the new drawing
  function walkNext(dog, ph) {
    var M = S.meta, a = (((ph % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2), q = Math.floor(a) % 4, fr = a - Math.floor(a);
    var w = Math.max(0, Math.min(1, (fr - 0.35) / 0.65)); w = w * w * (3 - 2 * w);
    return { fr: { img: S.walk, f: M.walk[dog * 4 + (q + 1) % 4], fh: M.wh }, w: w };
  }
  function blit(ctx, fr) { var p = place(fr), fw = S.meta.fw; ctx.drawImage(fr.img, fr.f.c * fw, fr.f.r * fr.fh, fw, fr.fh, -p.cx, -p.fy, fw, fr.fh); }
  function place(fr) { var f = fr.f; return { cx: (f.x0 + f.x1) / 2, fy: f.y1 }; }
  function headPos(L, pose, ph) {
    var dog = L.collar ? 0 : 1, fr = frame(dog, pose, ph), p = place(fr), f = fr.f;
    var sy = pose === 'lie' ? 0.72 : 1;
    return { x: (f.hx - p.cx) * K, y: (f.hy - p.fy) * K * sy, r: 0 };
  }
  function draw(ctx, L, pose, ph, wag, blink, t, tilt, o) {
    var dog = L.collar ? 0 : 1;
    // walking or standing still: the stride phase only moves while the pup walks
    var key = dog + ':' + pose; if (S.lastPh[key] != null) S.moving[dog] = Math.abs(ph - S.lastPh[key]) > 1e-4; S.lastPh[key] = ph;
    var fr = frame(dog, pose, ph), f = fr.f, p = place(fr), fw = S.meta.fw;
    var col = f.c, row = f.r, sx = col * fw, sy0 = row * fr.fh;
    // life: breathing, a slow sway of the weight from paw to paw, a happy wiggle with the tail, and a little bounce on
    // the stressed syllables while talking
    var tt = (t || 0) / 1000, tk = o && o.talk > 0 ? Math.min(1, o.talk) : 0, still = fr.img !== S.walk;
    var breathe = 1 + 0.02 * Math.sin(tt * 1.9 + dog * 1.7) + 0.03 * tk, sy = (pose === 'lie' ? 0.72 : 1) * breathe;
    ctx.save();
    if (still && !(window.TOLPups || {}).reduced) {
      ctx.rotate(0.016 * Math.sin(tt * 1.25 + dog * 2.1));
      ctx.transform(1, 0, -0.035 * (wag || 0), 1, 0, 0);   // the body leans a touch with each wag of the tail
    }
    ctx.imageSmoothingEnabled = true; try { ctx.imageSmoothingQuality = 'high'; } catch (e) {}
    var rot = (tilt || 0) * 0.45 + (pose === 'bow' ? 0.16 : 0) + (pose === 'wiggle' ? Math.sin((t || 0) / 95) * 0.07 : 0);
    if (rot) { ctx.translate(0, -18); ctx.rotate(rot); ctx.translate(0, 18); }
    ctx.scale(K, K * sy);
    ctx.drawImage(fr.img, sx, sy0, fw, fr.fh, -p.cx, -p.fy, fw, fr.fh);
    var P = window.TOLPups || {}, clk = P.clock || 0, B = S.blend[dog] || (S.blend[dog] = {}), kind = fr.img === S.walk ? 'w' : 'p' + f.ang;
    if (P.quiet || B.shot !== P.shot || clk < B.T || clk - B.T > 0.3) { B.kind = kind; B.from = null; }
    else if (kind !== B.kind) { B.from = { fr: B.fr, at: clk }; B.kind = kind; }
    if (!P.quiet) { B.fr = fr; B.T = clk; B.shot = P.shot; }
    // no blending between walk frames or poses: two drawings on top of each other read as a double face and extra legs
    if (still && blink && S.shut) ctx.drawImage(S.shut, sx, sy0, fw, fr.fh, -p.cx, -p.fy, fw, fr.fh);   // eyes closed (poses-shut.webp)
    // no moving jaw while talking: redrawing part of the painted muzzle smeared and doubled the face. The speech bubble and
    // the little bounce on the stressed syllables show who is talking.
    // the outfit, at the head of this drawing
    if (!(o && o.noOutfit)) {
      var who = dog ? 'sugarfoot' : 'tidbit', wear = (o && o.outfit) || outfit(who, o);
      ctx.save(); ctx.translate(f.hx - p.cx, f.hy - p.fy); ctx.scale(1 / K, 1 / K); ctx.scale(1.18, 1.18 / sy * (pose === 'lie' ? 0.72 : 1));
      wearItem(ctx, wear, WEAR[who], pose === 'lie' ? 0 : 3);
      ctx.restore();
    }
    ctx.restore();
  }

  function head(whoName, pose, opts) { var L = P.looks[whoName === 'sugarfoot' || whoName === 'sf' ? 'drop' : 'collar']; var h = headPos(L, pose === 'stand' ? 'run' : pose, 0); return { x: h.x, y: h.y }; }
  function install(walk, poses) {
    S = { walk: walk, poses: poses, meta: META, moving: [false, false], lastPh: {}, blend: {} };
    P.draw = function (c, L, pose, ph, wag, blink, t, tilt, opts) { draw(c, L, pose === 'stand' ? 'run' : pose, ph, wag, blink, t, tilt, opts); };
    P.headPos = function (L, pose, ph) { return headPos(L, pose === 'stand' ? 'run' : pose, ph); };
    P.head = head; P.cape = function () {}; P.lowerFace = function () {}; P.sprites = true; P.painted = true;
  }
  function load(name) {
    if (typeof document !== 'undefined') return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = BASE + name; });
    return fetch(BASE + name).then(function (r) { return r.blob(); }).then(function (b) { return createImageBitmap(b); });   // in a worker
  }
  P.ready = Promise.all([load('walk.webp'), load('poses.webp'), load('poses-shut.webp').catch(function () { return null; })]).then(function (s) { install(s[0], s[1]); S.shut = s[2]; }).catch(function () {});
})();
