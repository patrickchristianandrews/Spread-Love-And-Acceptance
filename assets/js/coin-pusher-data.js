/* coin-pusher-data.js — the friends for the Kindness Coin Pusher (/coin-pusher.html) and the Arcade's Derby dancers.
   window.TOLCoinData = { chars, drawMedallion(canvas, char), drawChar(ctx, char, size), drawPuddlesShapes(ctx) }
   chars: every character on the site, with where each one lives. The tips moved to coin-pusher-tips.js (window.TOLCoinTips).
   drawPuddlesShapes draws Professor Puddles from the same shapes as the site's own picture of him (PUDDLES_SVG in site.js),
   in that picture's own units (x -4 to 84, y -14 to 78). Nothing here is stored or sent. */
(function () {
  'use strict';

  // every character on the site, and where each one lives
  var chars = [
    { id: 'puddles', name: 'Professor Puddles', emo: '💧', ring: '#7FB2D6', home: '/ask.html', where: 'Ask Professor Puddles', line: 'A cheerful raindrop professor who knows the whole site, and loves a good question.' },
    { id: 'tidbit', name: 'Tidbit', emo: '🐶', ring: '#C98A4F', pup: 'collar', home: '/frequency-journey.html', where: 'Tidbit and Sugarfoot’s Arcade', line: 'The leaner pup with the black mask and the big smile. First to every treat.' },
    { id: 'sugarfoot', name: 'Sugarfoot', emo: '🐶', ring: '#A45C2E', pup: 'drop', home: '/frequency-journey.html', where: 'Tidbit and Sugarfoot’s Arcade', line: 'The stocky pup with floppy ears, white feet and a friendly wag for everyone.' },
    { id: 'ollie', name: 'Ollie the owl', emo: '🦉', ring: '#9C8466', home: '/frequency-buddies.html', where: 'Frequency Buddies', line: 'A wise owl from the cartoon, and a very good listener.' },
    { id: 'dot', name: 'Dot the snail', emo: '🐌', ring: '#C7A6D9', home: '/frequency-buddies.html', where: 'Frequency Buddies', line: 'Takes her time, and always gets there in the end.' },
    { id: 'hopper', name: 'Hopper the frog', emo: '🐸', ring: '#7DB07A', home: '/frequency-buddies.html', where: 'Frequency Buddies', line: 'One big hop, then a long, happy sit.' },
    { id: 'nutmeg', name: 'Nutmeg the squirrel', emo: '🐿️', ring: '#C77D4A', home: '/frequency-buddies.html', where: 'Frequency Buddies', line: 'Quick, chatty, and always has a snack tucked away.' },
    { id: 'lumi', name: 'Lumi the red panda', emo: '', draw: 'panda', ring: '#D9774A', home: '/frequency-buddies.html', where: 'Frequency Buddies', line: 'A soft, round-eared red panda with a stripy tail.' },
    { id: 'beep', name: 'Beep the robot', emo: '🤖', ring: '#8FA3B5', home: '/frequency-buddies.html', where: 'Frequency Buddies', line: 'A friendly robot with a very deep voice and a kind heart.' },
    { id: 'ducklings', name: 'The ducklings', emo: '🐥', ring: '#E8C35A', home: '/frequency-buddies.html', where: 'Frequency Buddies', line: 'They go everywhere in a line, peeping in tiny voices.' },
    { id: 'moon', name: 'The Moon', emo: '', draw: 'moon', ring: '#B7B3D9', home: '/frequency-buddies.html', where: 'Frequency Buddies', line: 'Watches over the pups at night, and speaks softly.' },
    { id: 'butterfly', name: 'The glowing butterflies', emo: '🦋', ring: '#8FC1D9', home: '/night-garden.html', where: 'The Night Garden', line: 'They drift through the Night Garden. The pups chase them, and the bunny follows.' },
    { id: 'bunny', name: 'The Night Garden bunny', emo: '🐰', ring: '#D9B8C4', home: '/night-garden.html', where: 'The Night Garden', line: 'Spins, leaps and flops an ear when you say hello.' },
    { id: 'hedgehog', name: 'The Night Garden hedgehog', emo: '🦔', ring: '#A88F72', home: '/night-garden.html', where: 'The Night Garden', line: 'Snug in its burrow under the flowers.' },
    { id: 'bear', name: 'Your Dojo bear', emo: '🐻', ring: '#A9744A', home: '/bears-dojo.html', where: 'The Bears Dojo', line: 'The bear you build waits by the gate of the temple garden.' },
    { id: 'kip', name: 'The fireflies', emo: '✨', ring: '#E9D27A', home: '/night-garden.html', where: 'The Night Garden', line: 'Little lights that blink on one by one when the garden gets dark.' },
    { id: 'peach', name: 'Peach', emo: '', draw: 'peach', ring: '#F2A98A', home: '/brand.html', where: 'Our logo', line: 'The round one in the logo. Shares one heart with Lilac.' },
    { id: 'lilac', name: 'Lilac', emo: '', draw: 'lilac', ring: '#B9A2D9', home: '/brand.html', where: 'Our logo', line: 'The squishy square one in the logo, because nobody is wired quite the same.' },
    { id: 'grumble', name: 'Grumble', emo: '', draw: 'cloud', col: '#9FA8C9', ring: '#9FA8C9', home: '/frequency-journey.html', where: 'Treat Chase, in the Arcade', line: 'A little cloud of Static. A golden heart turns him into bubbles.' },
    { id: 'fuzz', name: 'Fuzz', emo: '', draw: 'cloud', col: '#C9A8E0', ring: '#C9A8E0', home: '/frequency-journey.html', where: 'Treat Chase, in the Arcade', line: 'A fuzzy little cloud of Static who likes to pop up by surprise.' },
    { id: 'mumble', name: 'Mumble', emo: '', draw: 'cloud', col: '#F2B6A0', ring: '#F2B6A0', home: '/frequency-journey.html', where: 'Treat Chase, in the Arcade', line: 'The shy cloud of Static. Mostly keeps to the corners.' },
    { id: 'drift', name: 'Drift', emo: '', draw: 'cloud', col: '#A8D8C8', ring: '#A8D8C8', home: '/frequency-journey.html', where: 'Treat Chase, in the Arcade', line: 'A wandering cloud of Static who goes wherever the breeze goes.' }
  ];

  // ---------- drawing a medallion: a brass ring, a cream face and the character (canvas 2D, any size)
  function face(g, x, y, s, ink) {
    g.fillStyle = ink || '#2B2620';
    g.beginPath(); g.arc(x - s * 0.32, y, s * 0.09, 0, 7); g.arc(x + s * 0.32, y, s * 0.09, 0, 7); g.fill();
    g.strokeStyle = ink || '#2B2620'; g.lineWidth = s * 0.06; g.lineCap = 'round';
    g.beginPath(); g.arc(x, y + s * 0.12, s * 0.2, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    g.fillStyle = 'rgba(240,120,130,.45)';
    g.beginPath(); g.ellipse(x - s * 0.55, y + s * 0.18, s * 0.14, s * 0.08, 0, 0, 7); g.ellipse(x + s * 0.55, y + s * 0.18, s * 0.14, s * 0.08, 0, 0, 7); g.fill();
  }
  // Professor Puddles, shape for shape the same as PUDDLES_SVG in site.js (the drop, a shine, round glasses, a smile, cheeks, a little cap)
  var PUD_DROP = typeof Path2D === 'function' ? new Path2D('M40 8C33 22 14 36 14 50c0 14 12 22 26 22s26-8 26-22C66 36 47 22 40 8z') : null;
  function drawPuddlesShapes(g) {
    g.save();
    if (PUD_DROP) { g.fillStyle = '#CFE6FA'; g.fill(PUD_DROP); g.strokeStyle = '#7FB2E0'; g.lineWidth = 2.6; g.stroke(PUD_DROP); }
    g.save(); g.translate(30, 30); g.rotate(-25 * Math.PI / 180); g.globalAlpha = 0.6; g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 0, 5, 3, 0, 0, 7); g.fill(); g.restore();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.strokeStyle = '#3A3350'; g.lineWidth = 1.8;
    g.beginPath(); g.arc(31, 46, 6.2, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(49, 46, 6.2, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(37.2, 46); g.lineTo(42.8, 46); g.stroke();
    g.fillStyle = '#2B2620'; g.beginPath(); g.arc(31, 46.5, 2.4, 0, 7); g.fill(); g.beginPath(); g.arc(49, 46.5, 2.4, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(31.9, 45.6, 0.8, 0, 7); g.fill(); g.beginPath(); g.arc(49.9, 45.6, 0.8, 0, 7); g.fill();
    g.strokeStyle = '#2B2620'; g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(35, 56); g.quadraticCurveTo(40, 60.5, 45, 56); g.stroke();
    g.fillStyle = 'rgba(242,163,182,.85)'; g.beginPath(); g.ellipse(23, 55, 3.6, 2.2, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(57, 55, 3.6, 2.2, 0, 0, 7); g.fill();
    // the cap: translate(-9 15) rotate(-20 40 10) scale(.82)
    g.translate(-9, 15); g.translate(40, 10); g.rotate(-20 * Math.PI / 180); g.translate(-40, -10); g.scale(0.82, 0.82);
    g.fillStyle = '#3A3350'; g.beginPath(); g.moveTo(18, 10); g.lineTo(40, 1); g.lineTo(62, 10); g.lineTo(40, 19); g.closePath(); g.fill();
    g.fillStyle = '#4A4266'; g.beginPath(); g.moveTo(29, 14.5); g.lineTo(29, 20.5); g.bezierCurveTo(32, 23.5, 48, 23.5, 51, 20.5); g.lineTo(51, 14.5); g.lineTo(40, 19); g.closePath(); g.fill();
    g.strokeStyle = '#F4D26B'; g.lineWidth = 1.6; g.lineCap = 'butt'; g.beginPath(); g.moveTo(60, 10); g.lineTo(60, 21); g.stroke();
    g.fillStyle = '#F4D26B'; g.beginPath(); g.arc(60, 22.5, 2.3, 0, 7); g.fill();
    g.restore();
  }
  function drawChar(g, c, S) {
    var cx = S / 2, cy = S / 2, u = S / 256;
    if (c.pup && window.TOLPups) {
      g.save(); g.translate(cx - 4 * u, cy + 62 * u); g.scale(2.7 * u, 2.7 * u);
      try { window.TOLPups.draw(g, window.TOLPups.looks[c.pup], 'sit', 0, 0.2, false, 0, 0); } catch (e) {}
      g.restore(); return;
    }
    if (c.id === 'puddles') {
      var k = S / 140; g.save(); g.translate(cx - 40 * k, cy - 34 * k); g.scale(k, k); drawPuddlesShapes(g); g.restore(); return;
    }
    if (c.draw === 'cloud') {
      g.fillStyle = c.col;
      [[-38, 14, 34], [0, -6, 44], [38, 14, 34], [-18, 26, 30], [18, 26, 30]].forEach(function (b) { g.beginPath(); g.arc(cx + b[0] * u, cy + b[1] * u, b[2] * u, 0, 7); g.fill(); });
      face(g, cx, cy + 10 * u, 40 * u); return;
    }
    if (c.draw === 'peach') {
      g.fillStyle = '#F6B08F'; g.beginPath(); g.arc(cx, cy + 6 * u, 64 * u, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(cx - 26 * u, cy - 24 * u, 14 * u, 9 * u, -0.5, 0, 7); g.fill();
      face(g, cx, cy + 6 * u, 48 * u); heart(g, cx + 46 * u, cy + 50 * u, 16 * u); return;
    }
    if (c.draw === 'lilac') {
      g.fillStyle = '#BFA6E0'; rr(g, cx - 62 * u, cy - 56 * u, 124 * u, 120 * u, 34 * u); g.fill();
      g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.ellipse(cx - 28 * u, cy - 30 * u, 14 * u, 8 * u, -0.4, 0, 7); g.fill();
      face(g, cx, cy + 6 * u, 48 * u); heart(g, cx - 46 * u, cy + 50 * u, 16 * u); return;
    }
    if (c.draw === 'moon') {
      g.fillStyle = '#F4E7B8'; g.beginPath(); g.arc(cx, cy, 64 * u, 0, 7); g.fill();
      g.fillStyle = 'rgba(200,180,120,.35)'; [[-30, -28, 10], [28, -34, 7], [34, 30, 9]].forEach(function (b) { g.beginPath(); g.arc(cx + b[0] * u, cy + b[1] * u, b[2] * u, 0, 7); g.fill(); });
      face(g, cx, cy + 4 * u, 44 * u, '#5A4A3A'); return;
    }
    if (c.draw === 'panda') {
      // a red panda: round russet head, white ear tips, white cheeks and brows
      g.fillStyle = '#C8602F'; tri(g, cx - 66 * u, cy - 26 * u, cx - 34 * u, cy - 74 * u, cx - 14 * u, cy - 40 * u); tri(g, cx + 66 * u, cy - 26 * u, cx + 34 * u, cy - 74 * u, cx + 14 * u, cy - 40 * u);
      g.fillStyle = '#FFF4E6'; tri(g, cx - 54 * u, cy - 34 * u, cx - 36 * u, cy - 62 * u, cx - 26 * u, cy - 42 * u); tri(g, cx + 54 * u, cy - 34 * u, cx + 36 * u, cy - 62 * u, cx + 26 * u, cy - 42 * u);
      g.fillStyle = '#D9774A'; g.beginPath(); g.ellipse(cx, cy + 6 * u, 70 * u, 58 * u, 0, 0, 7); g.fill();
      g.fillStyle = '#FFF4E6'; g.beginPath(); g.ellipse(cx - 34 * u, cy + 26 * u, 24 * u, 18 * u, 0, 0, 7); g.ellipse(cx + 34 * u, cy + 26 * u, 24 * u, 18 * u, 0, 0, 7); g.ellipse(cx, cy + 34 * u, 20 * u, 14 * u, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(cx - 26 * u, cy - 18 * u, 10 * u, 6 * u, 0, 0, 7); g.ellipse(cx + 26 * u, cy - 18 * u, 10 * u, 6 * u, 0, 0, 7); g.fill();
      g.fillStyle = '#2B2620'; g.beginPath(); g.arc(cx - 24 * u, cy + 2 * u, 6 * u, 0, 7); g.arc(cx + 24 * u, cy + 2 * u, 6 * u, 0, 7); g.ellipse(cx, cy + 26 * u, 7 * u, 5 * u, 0, 0, 7); g.fill();
      return;
    }
    g.font = Math.round(118 * u) + 'px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (c.id === 'ducklings') { g.font = Math.round(78 * u) + 'px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif'; g.fillText(c.emo, cx - 34 * u, cy + 14 * u); g.fillText(c.emo, cx + 34 * u, cy + 14 * u); g.fillText(c.emo, cx, cy - 34 * u); return; }
    g.fillText(c.emo, cx, cy + 8 * u);
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function tri(g, a, b, c, d, e, f) { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.lineTo(e, f); g.closePath(); g.fill(); }
  function heart(g, x, y, s) {
    g.fillStyle = '#E2556A'; g.beginPath(); g.moveTo(x, y + s * 0.9);
    g.bezierCurveTo(x - s * 1.4, y, x - s * 0.7, y - s * 1.1, x, y - s * 0.35);
    g.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.4, y, x, y + s * 0.9); g.fill();
  }
  function drawMedallion(cv, c, found) {
    var S = cv.width, g = cv.getContext('2d'), cx = S / 2, R = S / 2;
    g.clearRect(0, 0, S, S);
    var rg = g.createLinearGradient(0, 0, S, S);
    rg.addColorStop(0, '#F3D891'); rg.addColorStop(0.45, '#C99A3E'); rg.addColorStop(0.7, '#E9C46F'); rg.addColorStop(1, '#9C7330');
    g.fillStyle = rg; g.beginPath(); g.arc(cx, cx, R - 1, 0, 7); g.fill();
    g.fillStyle = found === false ? '#5A5346' : (c.ring || '#C99A3E'); g.beginPath(); g.arc(cx, cx, R * 0.84, 0, 7); g.fill();
    var fg = g.createRadialGradient(cx - R * 0.2, cx - R * 0.25, R * 0.1, cx, cx, R * 0.78);
    fg.addColorStop(0, found === false ? '#7A7266' : '#FFFBF1'); fg.addColorStop(1, found === false ? '#5E574C' : '#F3E6C8');
    g.fillStyle = fg; g.beginPath(); g.arc(cx, cx, R * 0.76, 0, 7); g.fill();
    g.save(); g.beginPath(); g.arc(cx, cx, R * 0.76, 0, 7); g.clip();
    if (found === false) {
      g.fillStyle = '#EDE3CC'; g.font = '600 ' + Math.round(S * 0.42) + 'px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', cx, cx + S * 0.03);
    } else drawChar(g, c, S);
    g.restore();
    // a soft shine across the brass
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = S * 0.02; g.beginPath(); g.arc(cx, cx, R * 0.92, 3.6, 4.6); g.stroke();
  }

  window.TOLCoinData = { chars: chars, drawMedallion: drawMedallion, drawChar: drawChar, drawPuddlesShapes: drawPuddlesShapes };   // drawChar: the arcade's Derby borrows the friends for its super hits
})();
