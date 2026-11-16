/* sprite-pups.js — a PREVIEW of Tidbit and Sugarfoot drawn from painted sprite sheets (tools/pups3/walk.webp and
   poses.webp: Tidbit is the first dog on each sheet, Sugarfoot the second), in place of the drawn pups in pups.js.
   Not loaded by any page. tools/pups3/render-teaser.js injects it into the Season 2 teaser page to render a preview.

   It replaces TOLPups.draw and TOLPups.headPos with the same arguments, so the scene code doesn't change:
   - walking ('run' with the stride phase moving): the four walk frames, one per quarter stride
   - standing, sitting, wiggling: the three-quarter view turned toward the way the pup faces (no sitting art yet)
   - lying down: the side view, lowered; a play bow: the side view, tipped forward
   The sheets have no sitting, lying or bowing art, no mouths for talking and no outfits; those would need new art.
   TOLPupSprites.install({ walk: Image, poses: Image, meta: {...} }) */
(function () {
  'use strict';
  var K = 0.52;          // pup units per sprite pixel: a standing pup is about 50 units tall, like the drawn ones
  var S = null;
  // their colors (owner, Nov 3 2026): Tidbit always wears something purple, Sugarfoot something pink, a different item
  // each scene. The painted sheets have no outfits, so the item is drawn on: on the head (a beanie, a cap, a bow) or at
  // the neck (a bandana, a necklace). When a scene already puts something on a pup's head, the item goes at the neck.
  var WEAR = { tidbit: { main: '#7B4FBF', light: '#B39BE0', dark: '#55329A' }, sugarfoot: { main: '#F07EA6', light: '#FAB9CF', dark: '#D45A86' } };
  var HEAD = ['hat', 'cap', 'bow'], NECK = ['bandana', 'necklace'], ALL = HEAD.concat(NECK);
  function hash(str) { var h = 0x811c9dc5; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; }
  function outfit(who, o) {
    var key = (window.TOLPups && window.TOLPups.outfitKey) || 'teaser', h = hash(key + '|' + who);
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
  function frame(dog, pose, ph) {
    var M = S.meta;
    if (pose === 'run' && S.moving[dog]) { var q = Math.floor((((ph % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2)) % 4; return { img: S.walk, f: M.walk[dog * 4 + q], fh: M.wh }; }
    var ang = pose === 'lie' || pose === 'bow' ? 2 : 1;
    var f = M.poses.filter(function (x) { return x.dog === dog && x.ang === ang; })[0];
    return { img: S.poses, f: f, fh: M.fh };
  }
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
    var breathe = 1 + 0.012 * Math.sin((t || 0) / 520 + dog * 1.7), sy = (pose === 'lie' ? 0.72 : 1) * breathe;
    ctx.save();
    ctx.imageSmoothingEnabled = true; try { ctx.imageSmoothingQuality = 'high'; } catch (e) {}
    var rot = (tilt || 0) * 0.45 + (pose === 'bow' ? 0.16 : 0) + (pose === 'wiggle' ? Math.sin((t || 0) / 95) * 0.07 : 0);
    if (rot) { ctx.translate(0, -18); ctx.rotate(rot); ctx.translate(0, 18); }
    ctx.scale(K, K * sy);
    ctx.drawImage(fr.img, sx, sy0, fw, fr.fh, -p.cx, -p.fy, fw, fr.fh);
    // the outfit, at the head of this drawing
    if (!(o && o.noOutfit)) {
      var who = dog ? 'sugarfoot' : 'tidbit', wear = (o && o.outfit) || outfit(who, o);
      ctx.save(); ctx.translate(f.hx - p.cx, f.hy - p.fy); ctx.scale(1 / K, 1 / K); ctx.scale(1.18, 1.18 / sy * (pose === 'lie' ? 0.72 : 1));
      wearItem(ctx, wear, WEAR[who], pose === 'lie' ? 0 : 3);
      ctx.restore();
    }
    ctx.restore();
  }
  window.TOLPupSprites = {
    install: function (o) {
      S = { walk: o.walk, poses: o.poses, meta: o.meta, moving: [false, false], lastPh: {} };
      var P = window.TOLPups; if (!P) return false;
      P.draw = function (c, L, pose, ph, wag, blink, t, tilt, opts) { draw(c, L, pose, ph, wag, blink, t, tilt, opts); };
      P.headPos = headPos; P.cape = function () {}; P.sprites = true;
      return true;
    }
  };
})();
