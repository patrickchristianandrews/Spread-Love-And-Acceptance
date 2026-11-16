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
