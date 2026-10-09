/* buddies-music-video.js — "Frequency Buddies", the theme song, as a music video on a stage that moves.

   The whole picture is a pure function of the song's clock (draw(t)), so it stays on the beat, a seek lands
   exactly, and the same code renders the downloadable video frame by frame.
   - The song is the show's own recording: /assets/audio/buddies/theme-open.mp3, then theme-close.mp3 at 51.5 s
     (the same files and lyric times the episode player uses, assets/js/buddies-player.js).
   - The pals are drawn by pups.js (TOLPups.draw); the guests are drawn the way the episode player draws them.
   - "Keep the page still" (TOLStill.chosen()) or the device's reduce-motion setting starts the calm version:
     slower lights, smaller moves, no fireworks bursts. Light changes stay well under 3 a second either way.
   What it remembers (sound on or off, calm or lively) stays in this browser only (localStorage). Nothing is sent. */
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mix(a, b, p) { return a + (b - a) * p; }
  function sio(p) { p = clamp(p, 0, 1); return 0.5 - 0.5 * Math.cos(Math.PI * p); }
  function eio(p) { p = clamp(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function eout(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
  function bump(p) { p = clamp(p, 0, 1); return Math.sin(Math.PI * p); }
  function rnd(i) { var x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
  function sgn(v) { return v < 0 ? -1 : 1; }
  function ramp(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
  // 0 outside [a, b], easing up to 1 over fi seconds and back down over fo
  function win(t, a, b, fi, fo) { if (t <= a || t >= b) return 0; return Math.min(1, fi ? (t - a) / fi : 1, fo ? (b - t) / fo : 1); }

  // ---------- the song ----------
  var CLOSE_AT = 51.5, DUR = 92.4, REC = '2609c';
  var LYRICS = [
    [4.07, 'both', 'Tune in, turn it up, here we go!'],
    [8.94, 'tidbit', 'Yo, it’s Tidbit, black mask, eyebrows tan,'], [11.33, 'tidbit', 'first one out the door with a big ol’ plan!'],
    [13.25, 'tidbit', 'Tail on spin, I’m a zoom-zoom pup,'], [14.92, 'tidbit', 'if the sky gets gray, I’m still lookin’ up!'],
    [16.6, 'sugarfoot', 'And I’m Sugarfoot, white paws, slow and sweet,'], [18.67, 'sugarfoot', 'I take my time with my four little feet.'],
    [20.43, 'sugarfoot', 'When it gets too loud, I take a breath,'], [22.42, 'sugarfoot', 'say what I feel, then I try my best!'],
    [24.34, 'both', 'Different, different, that’s okay,'], [27.29, 'both', 'we find the way together every day!'],
    [30.56, 'both', 'Frequency Buddies! (Ooh-ooh!)'], [34.07, 'both', 'Two pals, one big heart each!'], [39.1, 'both', 'Frequency Buddies! (Arf arf!)'],
    [41.41, 'both', 'Every frequency an adventure, you’ll see!'], [45.96, 'both', 'Turn it up, tune in, come along with me,'], [49.63, 'both', 'we’re the Frequency Buddies!'],
    [52.66, 'tidbit', 'When I go fast…'], [54.45, 'sugarfoot', '…I go slow!'], [56.25, 'tidbit', 'When I say yes…'], [57.65, 'sugarfoot', '…I can say no!'],
    [59.04, 'both', 'When we mess up…'], [61.6, 'both', '…we say sorry!'], [64.15, 'both', 'Then we laugh and keep on runnin’ free!'],
    [70.29, 'both', 'Frequency Buddies! (Ooh-ooh!)'], [72.61, 'both', 'Two pals, one big heart each!'], [77.55, 'both', 'Frequency Buddies! (Arf arf!)'],
    [79.71, 'both', 'Every frequency an adventure, you’ll see!'], [87.05, 'both', 'See you next time, pals! (Arf!)']
  ];
  LYRICS.forEach(function (l, i) { var nx = LYRICS[i + 1]; l[3] = Math.min(nx ? nx[0] : 90.6, l[0] + 5.4, l[0] < CLOSE_AT && (!nx || nx[0] >= CLOSE_AT) ? 51.4 : 99); });
  function lyricAt(t) { for (var i = LYRICS.length - 1; i >= 0; i--) { if (t >= LYRICS[i][0] - 0.12) return t < LYRICS[i][3] ? LYRICS[i] : null; } return null; }
  // the beat (about 130 a minute), measured from the recordings
  function beatAt(t) { return t < 0.09 ? 0 : t < CLOSE_AT ? (t - 0.09) / 0.4615 : 112 + (t - CLOSE_AT - 0.18) / 0.458; }
  // the parts of the show (also the chapter buttons)
  var CHAPTERS = [[0, 'Curtain up'], [4.07, 'Tune in!'], [8.94, 'Tidbit’s verse'], [16.6, 'Sugarfoot’s verse'], [24.34, 'Different is okay'],
    [30.56, 'The big chorus'], [51.5, 'Into space'], [64.15, 'Runnin’ free'], [69.6, 'Grand finale'], [87.05, 'Take a bow']];
  // the costume changes: a sparkle puff, or behind the curtain
  var FITS = [
    { at: 0, id: 'tophat', name: 'Top hats and bow ties' },
    { at: 8.94, id: 'rock', name: 'Rock-star shades', puff: true },
    { at: 16.6, id: 'flowers', name: 'Flower crowns', puff: true },
    { at: 24.34, id: 'royal', name: 'Capes and crowns', puff: true },
    { at: 30.56, id: 'sparkle', name: 'Sparkly vests', puff: true },
    { at: 51.5, id: 'astro', name: 'Space suits' },
    { at: 64.15, id: 'pirate', name: 'Pirate hats', puff: true },
    { at: 69.5, id: 'band', name: 'Marching band uniforms' }
  ];
  function fitAt(t) { var f = FITS[0]; for (var i = 0; i < FITS.length; i++) if (t >= FITS[i].at) f = FITS[i]; return f; }
  var BACKS = [[0, 'night'], [16.6, 'sunset'], [24.34, 'rainbow'], [30.56, 'party'], [51.5, 'space'], [64.15, 'sea'], [69.5, 'finale']];

  // ---------- a viewer's own creation (the music video maker): what each part of the song looks like ----------
  // PLAN, when set, replaces the show's own choreography: { sec: [{ back, light, fx, move, stage } x 7], role: { id: n }, fit: { id: [n x 7] } }
  var SECTIONS = [
    { id: 'intro', name: 'Intro', a: 0, b: 8.94 }, { id: 'verse1', name: 'Tidbit’s verse', a: 8.94, b: 16.6 }, { id: 'verse2', name: 'Sugarfoot’s verse', a: 16.6, b: 24.34 },
    { id: 'chorus', name: 'Chorus', a: 24.34, b: 51.5 }, { id: 'bridge', name: 'Bridge', a: 51.5, b: 64.15 }, { id: 'final', name: 'Final chorus', a: 64.15, b: 87.05 }, { id: 'finale', name: 'Finale', a: 87.05, b: 92.4 }
  ];
  var OPT = {
    back: [['night', 'Starry night'], ['sunset', 'Sunset'], ['rainbow', 'Rainbow lights'], ['party', 'Disco party'], ['sea', 'Beach'], ['snow', 'Snowy hills'], ['space', 'Outer space'], ['campfire', 'Campfire'], ['finale', 'Starburst']],
    light: [['party', 'Party colors'], ['warm', 'Warm and golden'], ['cool', 'Cool blues'], ['spot', 'One spotlight'], ['rainbow', 'Rainbow beams']],
    fx: [['confetti', 'Confetti'], ['hearts', 'Hearts'], ['fireworks', 'Fireworks'], ['bubbles', 'Bubbles'], ['sparkles', 'Sparkles']],
    move: [['side', 'Side step'], ['spin', 'Spin'], ['jump', 'Jump'], ['slide', 'Slide'], ['mirror', 'Mirror'], ['conga', 'Conga line'], ['free', 'Freestyle'], ['pose', 'Big pose']],
    stage: [['classic', 'Classic stage'], ['split', 'Split stage'], ['turntable', 'Turntable'], ['lift', 'Big lift'], ['risers', 'Side risers']],
    fit: [['none', 'Just as they are'], ['tophat', 'Top hats'], ['rock', 'Rock-star shades'], ['flowers', 'Flower crowns'], ['royal', 'Capes and crowns'], ['sparkle', 'Sparkly vests'], ['astro', 'Space suits'], ['pirate', 'Pirate hats'], ['band', 'Band uniforms']],
    role: [['off', 'Not today'], ['lead', 'Lead singer'], ['backup', 'Backup dancer'], ['drums', 'Drums'], ['keys', 'Keys'], ['horns', 'Horn'], ['guitar', 'Guitar'], ['chorus', 'Chorus line'], ['crowd', 'In the crowd']]
  };
  var CAST = ['tidbit', 'sugarfoot', 'ducklings', 'snail', 'owl', 'robot', 'frog', 'squirrel', 'butterfly', 'puddles', 'moon'];
  var PLAN = null, HOT = { chorus: 1, final: 1, finale: 1 };
  function secAt(t) { for (var i = SECTIONS.length - 1; i > 0; i--) if (t >= SECTIONS[i].a) return i; return 0; }
  function secOpt(i, k) { var v = OPT[k][PLAN.sec[i][k]] || OPT[k][0]; return v[0]; }
  function pStage(t, kind) {
    var v = 0;
    SECTIONS.forEach(function (S, i) { if (secOpt(i, 'stage') === kind) v = Math.max(v, eio(ramp(t, S.a + (i ? 0.2 : 4.2), S.a + (i ? 1.2 : 5.2))) * (1 - eio(ramp(t, S.b - (i === 6 ? 3.6 : 0.9), S.b - (i === 6 ? 2.8 : -0.1))))); });
    return v;
  }
  function planHot(t) { return !!HOT[SECTIONS[secAt(t)].id]; }

  // ---------- the stage's own moves ----------
  function stageDrop(t) { return (1 - eio(ramp(t, 1.1, 3.4))) * 400 + eio((t - 90.3) / 1.9) * 420; } // rises in from below, sinks away at the end
  function curtainOpen(t) {
    if (t < 0.7) return 0;
    if (t < 1.9) return eio((t - 0.7) / 1.2);
    if (PLAN) return t < 90.7 ? 1 : 1 - eio((t - 90.7) / 1.3);
    if (t < 50.95) return 1; if (t < 51.45) return 1 - eio((t - 50.95) / 0.5); if (t < 52.0) return 0; if (t < 52.6) return eio((t - 52.0) / 0.6);
    if (t < 68.7) return 1; if (t < 69.2) return 1 - eio((t - 68.7) / 0.5); if (t < 69.8) return 0; if (t < 70.35) return eio((t - 69.8) / 0.55);
    if (t < 90.7) return 1; return 1 - eio((t - 90.7) / 1.3);
  }
  function riserL(t) { if (PLAN) return pStage(t, 'risers'); return eio(ramp(t, 16.95, 17.7)) * (1 - eio(ramp(t, 23.3, 23.9))); }
  function riserR(t) { if (PLAN) return pStage(t, 'risers'); return eio(ramp(t, 8.75, 9.45)) * (1 - eio(ramp(t, 16.25, 16.9))); }
  function bandUp(t) { if (PLAN) return PLAN._band ? eio(ramp(t, 2.4, 4.2)) : 0; return eio(ramp(t, 24.34, 26.2)); }
  function splitAmt(t) { if (PLAN) return pStage(t, 'split'); return eio(ramp(t, 52.5, 53.5)) * (1 - eio(ramp(t, 59.04, 60.1))); }
  function turnUp(t) { if (PLAN) return pStage(t, 'turntable'); return eio(ramp(t, 59.7, 60.5)) * (1 - eio(ramp(t, 63.9, 64.6))); }
  function liftC(t) { if (PLAN) return pStage(t, 'lift'); return eio(ramp(t, 85.7, 86.95)) * (1 - eio(ramp(t, 88.7, 89.5))); }
  function introLift(t) { return eout(ramp(t, 3.35, 4.1)); }

  // ---------- the cast ----------
  var NAMES = { tidbit: 'Tidbit', sugarfoot: 'Sugarfoot', robot: 'Beep the robot', frog: 'Hopper the frog', owl: 'Ollie the owl', squirrel: 'Nutmeg the squirrel',
    ducklings: 'the ducklings', snail: 'Dot the snail', butterfly: 'the butterfly', puddles: 'Professor Puddles', moon: 'the Moon' };
  var BAND = { robot: { x: -150, role: 'drums' }, frog: { x: 70, role: 'keys' }, owl: { x: 230, role: 'horn' }, squirrel: { x: -300, role: 'guitar' } };
  var GUEST_ON = { ducklings: [[11.33, 51.45], [64.5, 99]], snail: [[16.6, 51.45], [64.5, 99]], butterfly: [[16.6, 51.45], [64.5, 99]] };
  function guestOn(id, t) { var w = GUEST_ON[id]; if (!w) return true; for (var i = 0; i < w.length; i++) if (t >= w[i][0] && t < w[i][1]) return true; return false; }

  // ===================================================================================================
  // THE RENDERER: draw(g, t, W, H, opts) paints one frame of the show at song time t
  // ===================================================================================================
  function makeShow() {
    var V = { LW: 1280, H: 720, cx: 640, SP: 1, calm: false, burn: false };
    var FY0 = 600, BK0 = 474; // the stage's front edge and back edge, at rest
    var FY = FY0, BK = BK0;
    function zy(z) { return mix(FY0 - 10, BK0 + 10, z); } // (the stage's rise and fall is added separately)
    function zs(z) { return mix(1, 0.72, z); }
    function sx(xo, z) { return V.cx + xo * V.SP * mix(1, 0.84, z); }
    var PS = 2.6, GS = 1.95;

    // ---------- drawing helpers ----------
    function rr(g, x, y, w, h, r, col) { g.fillStyle = col; g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); }
    function circ(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, Math.max(0.01, r), 0, TAU); g.fill(); }
    function ell(g, x, y, rx, ry, col, rot) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); g.fill(); }
    function line(g, x1, y1, x2, y2, col, w) { g.strokeStyle = col; g.lineWidth = w || 1.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
    function heart(g, x, y, r, col) {
      g.fillStyle = col || '#F28AA8'; g.beginPath(); g.moveTo(x, y + r * 0.9);
      g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.5, x, y - r * 0.5);
      g.bezierCurveTo(x + r * 0.7, y - r * 1.5, x + r * 1.6, y - r * 0.2, x, y + r * 0.9); g.fill();
    }
    function star(g, x, y, r, col, rot) {
      g.fillStyle = col || '#F8D76A'; g.beginPath();
      for (var i = 0; i < 10; i++) { var a = (rot || 0) - Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
      g.closePath(); g.fill();
    }
    function note(g, x, y, s, col) {
      g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 1.8 * s; g.lineCap = 'round';
      g.beginPath(); g.ellipse(x, y, 4 * s, 3 * s, -0.4, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(x + 3.6 * s, y - 1); g.lineTo(x + 3.6 * s, y - 15 * s); g.quadraticCurveTo(x + 8 * s, y - 11 * s, x + 9 * s, y - 8 * s); g.stroke();
    }
    function text(g, str, x, y, size, col, weight, family, align) {
      g.font = (weight || '700') + ' ' + size + 'px ' + (family || 'Fraunces, Georgia, serif'); g.textAlign = align || 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(str, x, y);
    }
    function outlined(g, str, x, y, size, fill, stroke, italic) {
      g.font = (italic ? 'italic ' : '') + '800 ' + size + 'px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineJoin = 'round'; g.lineWidth = Math.max(3, size * 0.16); g.strokeStyle = stroke || '#2E2346'; g.strokeText(str, x, y); g.fillStyle = fill; g.fillText(str, x, y);
    }

    // ---------- the guests, drawn the way the episode player draws them ----------
    function eye(g, x, y, r, blink) { if (blink) { line(g, x - r, y, x + r, y, '#221c1c', 1.1); return; } circ(g, x, y, r, '#fff'); circ(g, x + r * 0.25, y, r * 0.6, '#221c1c'); circ(g, x + r * 0.45, y - r * 0.3, r * 0.22, '#fff'); }
    function gmouth(g, x, y, w, talk, col) { if (talk > 0.05) ell(g, x, y + 1, w * 0.5, 1 + talk * w * 0.35, col || '#6B2A33'); else { g.strokeStyle = col || '#6B2A33'; g.lineWidth = 1.1; g.beginPath(); g.arc(x, y - w * 0.3, w * 0.55, 0.3, Math.PI - 0.3); g.stroke(); } }
    var GDRAW = {
      snail: function (g, t, talk, blink) {
        ell(g, 2, -5, 22, 5.5, '#B9C79A'); line(g, 16, -9, 19, -22, '#9DAE7C', 2); line(g, 20, -8, 25, -20, '#9DAE7C', 2); eye(g, 19, -23, 2.6, blink); eye(g, 25, -21, 2.6, blink);
        circ(g, -4, -17, 13, '#E7A76B'); g.strokeStyle = '#B86B3B'; g.lineWidth = 2; g.beginPath(); for (var a = 0; a < 12; a += 0.3) { var r = 11 - a * 0.85; if (r < 0.5) break; g.lineTo(-4 + Math.cos(a) * r, -17 + Math.sin(a) * r); } g.stroke();
        gmouth(g, 21, -7, 4, talk);
      },
      owl: function (g, t, talk, blink) {
        line(g, -26, 2, 26, 4, '#7A5638', 4); ell(g, 0, -20, 16, 20, '#8A6A4E'); ell(g, 0, -14, 10, 13, '#D9C3A2');
        g.fillStyle = '#8A6A4E'; g.beginPath(); g.moveTo(-14, -34); g.lineTo(-10, -46); g.lineTo(-4, -36); g.moveTo(14, -34); g.lineTo(10, -46); g.lineTo(4, -36); g.fill();
        circ(g, -6.5, -30, 7, '#F2E6CF'); circ(g, 6.5, -30, 7, '#F2E6CF'); eye(g, -6.5, -30, 4.5, blink); eye(g, 6.5, -30, 4.5, blink);
        g.fillStyle = '#E8A93F'; g.beginPath(); g.moveTo(-2.5, -25); g.lineTo(2.5, -25); g.lineTo(0, -20 + talk * 3); g.fill();
        ell(g, -15, -16, 5, 12, '#735538', 0.2); ell(g, 15, -16, 5, 12, '#735538', -0.2);
        line(g, -4, 0, -4, 4, '#E8A93F', 2); line(g, 4, 0, 4, 4, '#E8A93F', 2);
      },
      ducklings: function (g, t, talk, blink, c) {
        for (var i = 0; i < 3; i++) { var x = -26 + i * 22, b = (c && c.duckHop ? c.duckHop[i] : Math.abs(Math.sin(t * 3 + i)) * 2), s = i === 1 ? 1.1 : 0.9;
          g.save(); g.translate(x, -b); g.scale(s, s); ell(g, 0, -8, 9, 7, '#F7D54A'); circ(g, 6, -17, 6, '#F9DC5E'); eye(g, 8, -18.5, 1.5, blink);
          g.fillStyle = '#F29A3A'; g.beginPath(); g.moveTo(11, -17); g.lineTo(16 + talk * 1.5, -16); g.lineTo(11, -14 + talk * 2); g.fill(); ell(g, -3, -8, 5, 3, '#EEC53C', -0.3);
          if (c && c.hat) hatOn(g, c.hat, 6, -22.5, 0.42, t, i);
          g.restore(); }
      },
      robot: function (g, t, talk, blink) {
        circ(g, -8, -4, 5, '#4B4A55'); circ(g, 8, -4, 5, '#4B4A55'); rr(g, -14, -30, 28, 24, 5, '#9FB6C9'); rr(g, -11, -26, 22, 10, 3, '#E9F2F8');
        rr(g, -12, -52, 24, 20, 5, '#B8CAD8'); rr(g, -9, -48, 18, 12, 3, '#23303B');
        if (blink) { line(g, -6, -43, -2, -43, '#7FE3C4', 1.5); line(g, 2, -43, 6, -43, '#7FE3C4', 1.5); } else { circ(g, -4, -43, 2.2, '#7FE3C4'); circ(g, 4, -43, 2.2, '#7FE3C4'); }
        rr(g, -4, -39 + (talk ? 0 : 1), 8, 1.4 + talk * 2.4, 1, '#7FE3C4');
        line(g, 0, -52, 0, -60, '#4B4A55', 1.5); circ(g, 0, -61, 2.4, Math.sin(t * 4) > 0 ? '#F7DC6F' : '#E4566E');
      },
      moon: function (g, t, talk, blink) {
        var gr = g.createRadialGradient(0, 0, 10, 0, 0, 60); gr.addColorStop(0, 'rgba(255,248,210,.35)'); gr.addColorStop(1, 'rgba(255,248,210,0)'); g.fillStyle = gr; g.fillRect(-60, -60, 120, 120);
        circ(g, 0, 0, 30, '#FBF3D5'); circ(g, -12, -10, 5, 'rgba(210,200,160,.35)'); circ(g, 12, 12, 4, 'rgba(210,200,160,.35)'); circ(g, 14, -14, 3, 'rgba(210,200,160,.3)');
        if (blink) { line(g, -13, -3, -5, -3, '#6B5A48', 1.4); line(g, 5, -3, 13, -3, '#6B5A48', 1.4); } else { g.strokeStyle = '#6B5A48'; g.lineWidth = 1.5; g.beginPath(); g.arc(-9, -2, 4, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.beginPath(); g.arc(9, -2, 4, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
        ell(g, -16, 6, 4, 2.2, 'rgba(242,163,182,.6)'); ell(g, 16, 6, 4, 2.2, 'rgba(242,163,182,.6)'); gmouth(g, 0, 10, 8, talk, '#8A5A48');
      },
      puddles: function (g, t, talk, blink) {
        g.save(); g.translate(0, -34); g.scale(0.62, 0.62); g.translate(-40, -40);
        g.fillStyle = '#CFE6FA'; g.strokeStyle = '#7FB2E0'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(40, 8); g.bezierCurveTo(33, 22, 14, 36, 14, 50); g.bezierCurveTo(14, 64, 26, 72, 40, 72); g.bezierCurveTo(54, 72, 66, 64, 66, 50); g.bezierCurveTo(66, 36, 47, 22, 40, 8); g.fill(); g.stroke();
        ell(g, 30, 30, 5, 3, 'rgba(255,255,255,.6)', -0.43);
        g.strokeStyle = '#3A3350'; g.lineWidth = 1.8; g.beginPath(); g.arc(31, 46, 6.2, 0, TAU); g.stroke(); g.beginPath(); g.arc(49, 46, 6.2, 0, TAU); g.stroke(); line(g, 37.2, 46, 42.8, 46, '#3A3350', 1.8);
        if (blink) { line(g, 29, 46.5, 33, 46.5, '#2B2620', 1.4); line(g, 47, 46.5, 51, 46.5, '#2B2620', 1.4); } else { circ(g, 31, 46.5, 2.4, '#2B2620'); circ(g, 49, 46.5, 2.4, '#2B2620'); }
        if (talk > 0.05) ell(g, 40, 57, 4, 1.5 + talk * 3, '#2B2620'); else { g.strokeStyle = '#2B2620'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(35, 56); g.quadraticCurveTo(40, 60.5, 45, 56); g.stroke(); }
        ell(g, 23, 55, 3.6, 2.2, 'rgba(242,163,182,.85)'); ell(g, 57, 55, 3.6, 2.2, 'rgba(242,163,182,.85)');
        g.fillStyle = '#3A3350'; g.beginPath(); g.moveTo(18, 10); g.lineTo(40, 1); g.lineTo(62, 10); g.lineTo(40, 19); g.fill(); g.fillStyle = '#4A4266'; g.beginPath(); g.moveTo(29, 14.5); g.lineTo(29, 20.5); g.bezierCurveTo(32, 23.5, 48, 23.5, 51, 20.5); g.lineTo(51, 14.5); g.lineTo(40, 19); g.fill();
        line(g, 60, 10, 60, 21, '#F4D26B', 1.6); circ(g, 60, 22.5, 2.3, '#F4D26B');
        g.restore();
      },
      frog: function (g, t, talk, blink) {
        ell(g, 0, -9, 14, 10, '#6FB36A'); ell(g, 2, -6, 9, 6, '#CDE7A8'); circ(g, -6, -19, 5.5, '#6FB36A'); circ(g, 7, -19, 5.5, '#6FB36A'); eye(g, -6, -20, 3.4, blink); eye(g, 7, -20, 3.4, blink);
        if (talk > 0.05) ell(g, 3, -8, 5 + talk * 2, 3 + talk * 2.5, '#E8F3C8'); gmouth(g, 1, -12, 12, talk * 0.5, '#2E5A2E');
        ell(g, -12, -1, 6, 2.5, '#5CA058'); ell(g, 12, -1, 6, 2.5, '#5CA058');
      },
      butterfly: function (g, t, talk) {
        var fl = 0.35 + 0.65 * Math.abs(Math.sin(t * 5));
        g.fillStyle = '#B79CEB'; g.beginPath(); g.ellipse(-6 * fl, -10, 9 * fl, 7, -0.5, 0, TAU); g.fill(); g.beginPath(); g.ellipse(-5 * fl, -2, 6 * fl, 5, 0.4, 0, TAU); g.fill();
        g.fillStyle = '#F7A8C2'; g.beginPath(); g.ellipse(6 * fl, -10, 9 * fl, 7, 0.5, 0, TAU); g.fill(); g.beginPath(); g.ellipse(5 * fl, -2, 6 * fl, 5, -0.4, 0, TAU); g.fill();
        ell(g, 0, -6, 1.8, 7, '#4A3F63'); circ(g, 0, -14, 2.4, '#4A3F63'); line(g, 0, -15, -3, -21, '#4A3F63', 0.8); line(g, 0, -15, 3, -21, '#4A3F63', 0.8);
        if (talk > 0.05) circ(g, 0, -12.8, 0.8 + talk * 0.5, '#F7A8C2');
      },
      squirrel: function (g, t, talk, blink) {
        g.fillStyle = '#B5652F'; g.beginPath(); g.moveTo(-6, -4); g.bezierCurveTo(-30, -2, -30, -44, -12, -44); g.bezierCurveTo(-2, -44, -8, -30, -14, -26); g.bezierCurveTo(-18, -18, -12, -8, -6, -4); g.fill();
        ell(g, 0, -12, 9, 12, '#C8733A'); ell(g, 2, -10, 5, 8, '#F0D2A8'); circ(g, 4, -27, 8, '#C8733A');
        g.fillStyle = '#C8733A'; g.beginPath(); g.moveTo(-1, -33); g.lineTo(1, -41); g.lineTo(4, -34); g.fill();
        eye(g, 7, -29, 2.4, blink); circ(g, 12, -25, 1.4, '#3A2418'); gmouth(g, 9.5, -22, 4, talk);
        ell(g, -3, 0, 5, 2.2, '#B5652F'); ell(g, 6, 0, 5, 2.2, '#B5652F');
      }
    };
    // where each guest's head is (its own units, facing right): x, y of the head's middle, its radius, the top of the head
    var GHEAD = { snail: [22, -19, 8, -26], owl: [0, -30, 16, -40], robot: [0, -42, 13, -53], moon: [0, 0, 30, -27], puddles: [0, -26, 17, -58], frog: [0, -15, 12, -23], butterfly: [0, -12, 6, -16], squirrel: [4, -27, 8, -34], ducklings: [0, -24, 8, -24] };

    // ---------- the outfits ----------
    // hats sit on a point (x, y) at scale s, in whoever's own units
    function topHat(g, x, y, s, col, band) { g.save(); g.translate(x, y); g.rotate(-0.12); g.scale(s, s); rr(g, -9, -17, 18, 17, 2, col); rr(g, -14, -2.5, 28, 4.5, 2, col); rr(g, -9, -6.5, 18, 3.5, 0, band); ell(g, -4, -12, 1.6, 4, 'rgba(255,255,255,.18)'); g.restore(); }
    function crown(g, x, y, s) {
      g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = '#F6CB4C'; g.beginPath(); g.moveTo(-9, 0); g.lineTo(-10, -10); g.lineTo(-4.5, -4.5); g.lineTo(0, -12); g.lineTo(4.5, -4.5); g.lineTo(10, -10); g.lineTo(9, 0); g.closePath(); g.fill();
      circ(g, 0, -3, 1.8, '#E4566E'); circ(g, -6, -2.5, 1.3, '#7FB8F0'); circ(g, 6, -2.5, 1.3, '#8FD694'); circ(g, 0, -12, 1.4, '#FFF3C4'); g.restore();
    }
    function flowerCrown(g, x, y, s, cols) { g.save(); g.translate(x, y); g.scale(s, s); for (var k = 0; k < 5; k++) { var fx = -9 + k * 4.5, fy = -Math.sin(k / 4 * Math.PI) * 3; for (var p = 0; p < 5; p++) { var a = p / 5 * TAU; circ(g, fx + Math.cos(a) * 1.7, fy + Math.sin(a) * 1.7, 1.5, cols[k % cols.length]); } circ(g, fx, fy, 1.1, '#F8D76A'); } line(g, -11, 1, 11, 1, '#6FB36A', 1.2); g.restore(); }
    function shako(g, x, y, s, col) { g.save(); g.translate(x, y); g.scale(s, s); rr(g, -7, -16, 14, 16, 2, col); rr(g, -8, -2.5, 16, 3.5, 1, '#2C2638'); rr(g, -7, -10, 14, 2.4, 0, '#F6CB4C'); circ(g, 0, -6, 1.6, '#F6CB4C'); ell(g, 0, -20, 2.6, 6, '#FFFFFF'); ell(g, 0, -24, 1.6, 3.2, '#F7A8C2'); g.restore(); }
    function partyHat(g, x, y, s, col) { g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = col; g.beginPath(); g.moveTo(-7, 0); g.lineTo(0, -18); g.lineTo(7, 0); g.closePath(); g.fill(); line(g, -4.5, -6, 4.5, -6, 'rgba(255,255,255,.75)', 1.4); line(g, -2.3, -12, 2.3, -12, 'rgba(255,255,255,.75)', 1.2); circ(g, 0, -18.5, 2.6, '#FFF3C4'); g.restore(); }
    function pirateHat(g, x, y, s) {
      g.save(); g.translate(x, y); g.scale(s, s);
      g.fillStyle = '#3A2A36'; g.beginPath(); g.moveTo(-15, 0); g.quadraticCurveTo(-11, -16, 0, -15); g.quadraticCurveTo(11, -16, 15, 0); g.quadraticCurveTo(0, -5, -15, 0); g.fill();
      g.strokeStyle = '#F6CB4C'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-14, -0.5); g.quadraticCurveTo(0, -5.5, 14, -0.5); g.stroke();
      heart(g, 0, -9, 3.2, '#F7A8C2'); g.strokeStyle = '#E4566E'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-8, -13); g.quadraticCurveTo(-16, -22, -20, -14); g.stroke(); g.restore();
    }
    function bubble(g, x, y, r) {
      g.fillStyle = 'rgba(205,232,255,.22)'; g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = Math.max(1, r * 0.08); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = Math.max(1, r * 0.1); g.beginPath(); g.arc(x, y, r * 0.75, -2.5, -1.7); g.stroke();
      line(g, x - r * 0.3, y - r * 0.95, x - r * 0.45, y - r * 1.35, '#C9D3E0', Math.max(1, r * 0.07)); circ(g, x - r * 0.45, y - r * 1.38, r * 0.12, '#F7A8C2');
    }
    function shades(g) { rr(g, 0.5, -4.4, 7.5, 4.6, 2, '#2C2638'); rr(g, 9, -4.2, 5.5, 4.2, 2, '#2C2638'); line(g, -4, -3, 1, -3, '#2C2638', 1.1); line(g, 8, -2.6, 9, -2.6, '#2C2638', 1); circ(g, 3, -3.4, 0.9, 'rgba(255,255,255,.75)'); }
    function bowTie(g, x, y, col) { g.fillStyle = col; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5.5, y - 3.8); g.lineTo(x - 5.5, y + 3.8); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 5.5, y - 3.8); g.lineTo(x + 5.5, y + 3.8); g.closePath(); g.fill(); circ(g, x, y, 1.8, col); circ(g, x, y, 0.8, 'rgba(255,255,255,.4)'); }
    function starBand(g, t, col) { g.strokeStyle = '#2C2638'; g.lineWidth = 1; for (var k = -1; k <= 1; k += 2) { var bx = -2 + k * 5 + Math.sin(t * 5.5 + k) * 1.5, by = -22; g.beginPath(); g.moveTo(-2 + k * 3, -10); g.lineTo(bx, by); g.stroke(); star(g, bx, by, 3.6, col, t * 1.6); } }
    // a hat for a guest (or a duckling): whichever this section wears
    function hatOn(g, kind, x, y, s, t, i) {
      if (kind === 'party') partyHat(g, x, y + 1, s, ['#F28AA8', '#7FB8F0', '#F8D76A', '#8FD694'][(i || 0) % 4]);
      else if (kind === 'crown') crown(g, x, y + 1, s * 0.85);
      else if (kind === 'flowers') flowerCrown(g, x, y + 1, s * 0.9, ['#F7A8C2', '#FFFFFF', '#B79CEB']);
      else if (kind === 'pirate') pirateHat(g, x, y + 1, s * 0.75);
      else if (kind === 'shako') shako(g, x, y + 1, s * 0.85, i % 2 ? '#3E5BB0' : '#C93F57');
      else if (kind === 'tophat') topHat(g, x, y + 1, s * 0.75, '#2C2638', '#E4566E');
    }
    var GUEST_HAT = { tophat: null, rock: null, flowers: 'flowers', royal: 'crown', sparkle: 'party', astro: 'helmet', pirate: 'pirate', band: 'shako' };

    // ---------- a pal, with her outfit, singing ----------
    var LOOK = { tidbit: 'collar', sugarfoot: 'drop' };
    var FITCOL = {
      tophat: { tidbit: ['#2C2638', '#E4566E'], sugarfoot: ['#5B3F8C', '#7FB8F0'] },
      rock: { tidbit: '#F8D76A', sugarfoot: '#F7A8C2' },
      sparkle: { tidbit: '#E4566E', sugarfoot: '#4F8FE0' },
      royal: { tidbit: '#7C97E8', sugarfoot: '#E4566E' },
      band: { tidbit: '#C93F57', sugarfoot: '#3E5BB0' }
    };
    function bodyGeo(L) { var lean = L.build === 'lean'; return { BY: lean ? -21 : -18.5, RX: lean ? 18.5 : 18, RY: lean ? 8.8 : 10.2 }; }
    function clipBody(g, L, pose) {
      var b = bodyGeo(L); g.beginPath();
      if (pose === 'lie') g.ellipse(-2, -9, 19, 8.5, 0, 0, TAU);
      else { g.ellipse(0, b.BY, b.RX, b.RY, 0, 0, TAU); g.ellipse(12, b.BY - 5, 7, 8, -0.5, 0, TAU); }
      g.clip(); return b;
    }
    function bodyFit(g, c, L, pose, t) {
      var fit = c.fit, id = c.id, tilt = pose === 'sit' ? -0.42 : pose === 'bow' ? 0.3 : 0;
      if (fit === 'astro') { // the air pack, on the back
        g.save(); g.rotate(tilt);
        if (fit === 'astro') { var b0 = bodyGeo(L); rr(g, -17, b0.BY - 15, 13, 13, 3, '#E9EEF6'); rr(g, -15, b0.BY - 12, 9, 3, 1, '#7FB8F0'); circ(g, -8, b0.BY - 4, 1.5, '#F28AA8'); }
        g.restore();
      }
      if (fit !== 'sparkle' && fit !== 'band' && fit !== 'pirate' && fit !== 'astro' && fit !== 'flowers') return;
      g.save(); g.rotate(tilt);
      var b = clipBody(g, L, pose), y0 = pose === 'lie' ? -18 : b.BY - 14, h = 32;
      if (fit === 'sparkle') {
        var col = FITCOL.sparkle[id]; g.fillStyle = col; g.fillRect(-6, y0, 30, h);
        g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(-6, y0, 6, h);
        for (var k = 0; k < 14; k++) { var sx0 = -4 + (k % 5) * 5.2, sy0 = y0 + 4 + Math.floor(k / 5) * 6 + (k % 2) * 2, a = t * 3 + k * 1.7; star(g, sx0, sy0, 1.1 + 0.7 * Math.max(0, Math.sin(a)), '#FFF6C9', a * 0.3); }
        line(g, -6, y0, -6, y0 + h, '#F6CB4C', 1.6);
      } else if (fit === 'band') {
        var jc = FITCOL.band[id]; g.fillStyle = jc; g.fillRect(-30, y0 - 6, 60, h + 12);
        for (var j = 0; j < 3; j++) line(g, 4, y0 + 7 + j * 4.5, 22, y0 + 7 + j * 4.5, '#F6CB4C', 1.3);
        circ(g, 5, y0 + 7, 1.3, '#F6CB4C'); circ(g, 5, y0 + 11.5, 1.3, '#F6CB4C'); circ(g, 5, y0 + 16, 1.3, '#F6CB4C');
        line(g, -24, y0 + 22, 18, y0 + 22, '#FFFDF4', 2);
      } else if (fit === 'pirate') {
        for (var s2 = 0; s2 < 6; s2++) { g.fillStyle = s2 % 2 ? '#FFFDF4' : '#E4566E'; g.fillRect(-8, y0 + s2 * 4, 32, 4); }
        line(g, -4, y0, 18, y0 + 20, '#F6CB4C', 2.4);
      } else if (fit === 'astro') {
        g.fillStyle = '#F2F4F8'; g.fillRect(-30, y0 - 6, 60, h + 12); line(g, -2, y0, -2, y0 + h, '#C9D3E0', 1); rr(g, 4, y0 + 8, 9, 6, 1.5, '#7FB8F0'); heart(g, 8.5, y0 + 11.2, 2, '#F28AA8');
      } else if (fit === 'flowers') { // a flower necklace
        g.restore(); g.save(); g.rotate(tilt);
        var nb = bodyGeo(L), nx = pose === 'lie' ? 12 : 13, ny = pose === 'lie' ? -10 : nb.BY - 6;
        var fc = id === 'tidbit' ? ['#F7A8C2', '#F8D76A', '#FFFFFF'] : ['#B79CEB', '#7FB8F0', '#FFFFFF'];
        for (var f = 0; f < 5; f++) { var fx = nx - 4 + f * 2.4, fy = ny - 6 + f * 3.4; circ(g, fx, fy, 2.3, fc[f % 3]); circ(g, fx, fy, 0.8, '#F8D76A'); }
      }
      g.restore();
    }
    function headFit(g, c, t) {
      var fit = c.fit, id = c.id;
      if (fit === 'tophat') { var tc = FITCOL.tophat[id]; topHat(g, -1, -8, 0.62, tc[0], tc[1]); bowTie(g, -5, 13, tc[1]); }
      else if (fit === 'rock') { shades(g); starBand(g, t, FITCOL.rock[id]); }
      else if (fit === 'flowers') flowerCrown(g, -1, -10, 0.95, id === 'tidbit' ? ['#F7A8C2', '#F7DC6F', '#FFFFFF'] : ['#B79CEB', '#7FB8F0', '#FFFFFF']);
      else if (fit === 'royal') crown(g, -1, -9, 0.78);
      else if (fit === 'sparkle') bowTie(g, -5, 13, '#F6CB4C');
      else if (fit === 'astro') bubble(g, 4, 1, 18.5);
      else if (fit === 'pirate') pirateHat(g, -1, -9, 0.7);
      else if (fit === 'band') shako(g, -1, -8, 0.78, FITCOL.band[id]);
    }
    function talkAmt(t, k) { var u = t * 10.5 + k; var v = 0.5 + 0.5 * Math.sin(u) * Math.sin(u * 0.37 + 1); return 0.25 + 0.75 * Math.abs(v); }
    function pupFace(g, c, t) {
      var isT = c.id === 'tidbit', TAN = isT ? '#C4834A' : '#C9965F', BLK = '#252120', mouth = c.sing ? talkAmt(t, isT ? 0 : 1.3) * c.sing : 0;
      if (mouth > 0.02) {
        g.save(); g.beginPath();
        if (isT) { g.ellipse(8, 2.5, 8.5, 6.2, 0.08, 0, TAU); g.ellipse(8.5, 4.5, 8, 4.8, 0.1, 0, TAU); }
        else { g.ellipse(5, 2.6, 9.4, 7.8, 0.12, 0, TAU); g.ellipse(10.8, 2.6, 6.6, 3.9, 0.06, 0, TAU); g.ellipse(7.5, 8.6, 7, 3.2, 0.12, 0, TAU); }
        g.clip(); ell(g, 10.5, 7.4, 5.8, 3.6, TAN); ell(g, 10.5, 10.2, 6, 2.6, TAN); if (isT) ell(g, 8.5, 8.4, 3.2, 1.5, 'rgba(210,200,186,0.85)', 0.15); ell(g, 7, 4.5, 2.2, 1.2, 'rgba(247,165,185,0.5)');
        g.restore();
        g.fillStyle = '#3A1E22'; g.beginPath(); g.moveTo(15, 4.8); g.quadraticCurveTo(11, 6.2, 6.8, 5.8); g.quadraticCurveTo(10.5, 6.8 + 4.8 * mouth, 15, 4.8); g.fill();
        g.save(); g.clip(); ell(g, 10.6, 6.6 + 3.6 * mouth, 2.4, 1.2 + 1.4 * mouth, '#EE8FA6', 0.2); g.restore();
      }
      if (c.eyes === 'happy' || c.eyes === 'calm') {
        circ(g, 4.2, -1.6, 2.6, BLK); g.strokeStyle = '#121010'; g.lineWidth = 1.2; g.lineCap = 'round'; g.beginPath();
        if (c.eyes === 'happy') g.arc(4.2, -0.6, 2, Math.PI * 1.1, Math.PI * 1.9); else g.arc(4.2, -2.4, 2, Math.PI * 0.15, Math.PI * 0.85);
        g.stroke();
      } else if (!c.blink) star(g, 4.9, -2.4, 0.9, 'rgba(255,255,255,.9)');
    }
    function drawPup(g, c, t) {
      var P = window.TOLPups; if (!P || !c.on) return;
      var L = P.looks[LOOK[c.id]], s = PS * zs(c.z) * (c.sc || 1), X = sx(c.x, c.z) + (c.dx || 0), base = zy(c.z) + (c.dy || 0), Y = base - c.lift;
      var sh = clamp(1 - (c.lift - (c.stand || 0)) / 160, 0.35, 1);
      if (!c.clip) ell(g, X, base - (c.stand || 0) + 2, 22 * s * 0.8 * sh, 3.6 * s * 0.8 * sh, 'rgba(20,10,40,' + (0.28 * sh).toFixed(3) + ')');
      g.save();
      if (c.clip != null) { g.beginPath(); g.rect(-50, -200, V.LW + 100, c.clip + 200); g.clip(); }
      g.translate(X, Y);
      var f = c.face, fs = sgn(f), fa = Math.max(0.15, Math.abs(f));
      g.scale(fs * fa * s, s);
      if (c.rot) { var pv = c.pivot === 'hind' ? -12 : 0, pvy = c.pivot === 'hind' ? 0 : -22; g.translate(pv, pvy); g.rotate(c.rot); g.translate(-pv, -pvy); }
      var pose = c.pose || 'run', ph = c.ph || 0, wag = (c.tailBase || 0) + Math.sin(t * 11 * (c.wagS || 1) + (c.id === 'tidbit' ? 0 : 2)) * (c.wagA == null ? 0.6 : c.wagA);
      if (c.sy) g.scale(1, c.sy);
      if (c.fit === 'royal' && P.cape) { g.save(); g.rotate(pose === 'sit' ? -0.42 : pose === 'bow' ? 0.3 : 0); g.translate(0, pose === 'lie' ? 10 : 0); P.cape(g, L, t * 1000, FITCOL.royal[c.id], true); g.restore(); }
      P.draw(g, L, pose, ph, wag, !!c.blink, t * 1000, c.tilt || 0, {});
      bodyFit(g, c, L, pose, t);
      var lean = L.build === 'lean', BY = lean ? -21 : -18.5;
      var hx = pose === 'lie' ? 19 : pose === 'sit' ? 18 : pose === 'bow' ? 22 : 21, hy = pose === 'lie' ? -19 : pose === 'sit' ? -38 : pose === 'bow' ? -14 : BY - 12;
      g.translate(hx, hy); g.rotate((pose === 'run' ? Math.sin(ph) * 0.05 : pose === 'bow' ? -0.15 : pose === 'lie' ? 0.05 : 0) + (c.tilt || 0));
      pupFace(g, c, t); headFit(g, c, t);
      var m = g.getTransform(); c.head = { x: m.e / V.k, y: m.f / V.k, k: Math.hypot(m.a, m.b) / V.k };
      g.restore();
    }
    function drawGuest(g, c, t) {
      if (!c.on) return;
      var s = GS * zs(c.z) * (c.sc || 1), X = sx(c.x, c.z) + (c.dx || 0), base = zy(c.z) + (c.dy || 0), Y = base - c.lift - (c.hover || 0);
      if (c.shadow !== false && c.id !== 'moon') { var sh = clamp(1 - (c.lift + (c.hover || 0)) / 200, 0.3, 1); ell(g, X, base + 2, 18 * s * sh, 3 * s * sh, 'rgba(20,10,40,' + (0.24 * sh).toFixed(3) + ')'); }
      g.save(); g.translate(X, Y); if (c.rot) g.rotate(c.rot);
      var f = c.face == null ? 1 : c.face; g.scale(sgn(f) * Math.max(0.2, Math.abs(f)) * s, s);
      var talk = c.sing ? talkAmt(t, c.id.length) * c.sing : 0, blink = ((t + c.id.length * 0.7) % 4.3) < 0.14;
      if (c.id === 'ducklings') c.hat = c.hatKind || null;
      GDRAW[c.id](g, t, talk, blink, c);
      var hd = GHEAD[c.id];
      if (c.id !== 'ducklings' && hd) {
        var hk = c.hatKind;
        if (hk === 'helmet') bubble(g, hd[0], hd[1], hd[2] * 1.45);
        else if (hk && c.id !== 'puddles' && c.id !== 'butterfly') hatOn(g, hk, hd[0] + (c.id === 'snail' ? 0 : -1), hd[3] + 2, c.id === 'moon' ? 1.6 : c.id === 'robot' ? 0.75 : 0.6, t, c.id.length);
        if (c.shades) { g.save(); g.translate(hd[0] - 4, hd[1] + 1); g.scale(2.6, 2.6); shades(g); g.restore(); }
      }
      if (c.extra) c.extra(g, t);
      var m = g.getTransform(), hx0 = hd ? hd[0] : 0, hy0 = hd ? hd[3] : -20; c.head = { x: (m.a * hx0 + m.c * hy0 + m.e) / V.k, y: (m.b * hx0 + m.d * hy0 + m.f) / V.k, k: Math.abs(m.d) / V.k };
      g.restore();
    }

    // ---------- the instruments ----------
    function drums(g, t, b) {
      var hit = Math.pow(1 - (b - Math.floor(b)), 3), side = Math.floor(b) % 2;
      ell(g, 0, -15, 19, 15, '#F7F1E6'); g.strokeStyle = '#C93F57'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, -15, 19, 15, 0, 0, TAU); g.stroke(); heart(g, 0, -15, 6, '#F28AA8');
      ell(g, -24, -24, 10, 4, '#E9EEF6'); rr(g, -34, -24, 20, 7, 1, '#C93F57'); line(g, -24, -17, -24, 0, '#4B4A55', 1.4);
      line(g, 24, -2, 24, -44, '#4B4A55', 1.3); ell(g, 24, -45 + (side ? hit * 1.5 : 0), 12, 2.4, '#F6CB4C', side ? -0.15 * hit : 0.05);
      var aL = side ? 0.2 : -0.6 * hit + 0.2, aR = side ? -0.6 * hit + 0.2 : 0.2;
      line(g, -14, -24, -14 - 14 * Math.cos(aL), -24 - 14 * Math.sin(aL) + 6, '#7F97AA', 3); line(g, -14 - 14 * Math.cos(aL), -18 - 14 * Math.sin(aL), -26, -27 + (side ? -6 : 2) * (1 - hit), '#D9B98A', 1.6);
      line(g, 14, -24, 14 + 12 * Math.cos(aR), -24 - 12 * Math.sin(aR) + 4, '#7F97AA', 3); line(g, 14 + 12 * Math.cos(aR), -20 - 12 * Math.sin(aR), 24, -44 + (side ? 2 : -6) * (1 - hit), '#D9B98A', 1.6);
    }
    function keys(g, t, b) {
      line(g, -16, -2, -10, -16, '#4B4A55', 2); line(g, 16, -2, 10, -16, '#4B4A55', 2);
      rr(g, -26, -22, 52, 9, 2, '#2C2638'); var n = 10, lit = Math.floor(b) % n, lit2 = (Math.floor(b) * 3 + 4) % n;
      for (var i = 0; i < n; i++) { rr(g, -24 + i * 4.8, -20.5, 4.2, 6, 0.8, i === lit ? '#FFE08A' : i === lit2 ? '#BFE3FF' : '#FBF8F2'); }
      for (var j = 0; j < n - 1; j++) if (j % 7 !== 2 && j % 7 !== 6) rr(g, -21.2 + j * 4.8, -20.5, 2.4, 3.6, 0.5, '#2C2638');
    }
    function trumpet(g, t, b) {
      var lift = Math.sin(TAU * (b / 4)) * 0.08;
      g.save(); g.translate(0, -23); g.rotate(0.15 + lift); rr(g, 2, -1.6, 22, 3.2, 1.5, '#F2C14E'); rr(g, 8, -4.2, 2, 4, 0.6, '#E0A93A'); rr(g, 12, -4.2, 2, 4, 0.6, '#E0A93A');
      g.fillStyle = '#F6CB4C'; g.beginPath(); g.moveTo(22, -2); g.lineTo(31, -7); g.lineTo(31, 7); g.lineTo(22, 2); g.closePath(); g.fill(); ell(g, 31, 0, 1.8, 7, '#E0A93A'); g.restore();
    }
    function guitar(g, t, b) {
      var st = Math.max(0, Math.sin(TAU * (b - Math.floor(b)))) * 2;
      g.save(); g.translate(2, -10); g.rotate(-0.55); line(g, 0, 0, 26, 0, '#7A5638', 2.6); rr(g, 24, -2.4, 6, 4.8, 1, '#5B3F8C');
      ell(g, -2, 0, 8.5, 6.5, '#F28AA8'); ell(g, -9, 0, 6, 5.5, '#F28AA8'); circ(g, -3, 0, 2, '#2C2638'); line(g, 0, 0, 28, 0, 'rgba(255,255,255,.6)', 0.6); g.restore();
      line(g, 6, -14, 0 + st, -8 - st, '#C8733A', 2.6);
    }
    function baton(g, t, b) { var a = -0.6 + Math.sin(TAU * b / 2) * 0.55; g.save(); g.translate(10, -30); g.rotate(a); line(g, 0, 0, 22, 0, '#FFFDF6', 1.6); circ(g, 0, 0, 2, '#C9A77A'); g.restore(); }

    // ===================================================================================================
    // THE CHOREOGRAPHY: where everyone is at song time t (pure functions, so a seek lands exactly)
    // ===================================================================================================
    function bounce(t, amp) { var b = beatAt(t); return amp * Math.abs(Math.sin(Math.PI * (b - Math.floor(b)))); }
    function along(keys, t) { // keyframes [t, x, z]: where, and whether moving
      if (t <= keys[0][0]) return { x: keys[0][1], z: keys[0][2], v: 0 };
      for (var i = 0; i < keys.length - 1; i++) {
        var a = keys[i], b = keys[i + 1]; if (t > b[0]) continue;
        var p = (t - a[0]) / Math.max(0.001, b[0] - a[0]), e = sio(p), dv = (b[1] - a[1]);
        return { x: mix(a[1], b[1], e), z: mix(a[2], b[2], e), v: Math.abs(dv) > 2 && p > 0.02 && p < 0.98 ? sgn(dv) : 0 };
      }
      var l = keys[keys.length - 1]; return { x: l[1], z: l[2], v: 0 };
    }
    // the pals' paths through the show: [t, x, z]
    var TRACK = {
      tidbit: [[0, -110, 0.16], [7.9, -110, 0.16], [8.9, -20, 0.08], [9.9, -190, 0.04], [11.2, -40, 0.1], [12.2, 260, 0.14], [13.2, -40, 0.1], [14.95, 0, 0.1], [16.3, 0, 0.1], [16.95, -430, 0.36],
        [23.3, -430, 0.36], [24.25, -150, 0.14], [27.3, -150, 0.14], [28.6, -48, 0.08], [30.56, -48, 0.08], [31.3, -90, 0.1], [34.0, -90, 0.1], [34.9, -56, 0.1], [38.9, -56, 0.1], [39.4, -90, 0.12], [41.41, -90, 0.12],
        [45.96, -90, 0.12], [51.4, -90, 0.12], [51.6, -250, 0.2], [59.04, -250, 0.2], [60.3, -120, 0.3], [64.9, -60, 0.3], [65.6, -390, 0.08], [68.6, -390, 0.08], [69.4, -90, 0.12], [74.3, -90, 0.12], [75.9, 90, 0.04], [77.4, 90, 0.12], [79.71, 90, 0.12],
        [84.3, 90, 0.12], [85.6, -72, 0.3], [99, -72, 0.3]],
      sugarfoot: [[0, 110, 0.16], [7.9, 110, 0.16], [8.75, 430, 0.36], [16.3, 430, 0.36], [16.95, 430, 0.36], [20.3, 20, 0.12], [22.42, 20, 0.12], [24.25, 150, 0.14], [27.3, 150, 0.14], [28.6, 48, 0.08], [30.56, 48, 0.08],
        [31.3, 90, 0.1], [34.0, 90, 0.1], [34.9, 56, 0.1], [38.9, 56, 0.1], [39.4, 90, 0.12], [45.96, 90, 0.12], [51.4, 90, 0.12], [51.6, 250, 0.2], [59.04, 250, 0.2], [60.3, 120, 0.3], [64.9, 60, 0.3], [65.6, 390, 0.26], [68.6, 390, 0.26], [69.4, 90, 0.12],
        [74.3, 90, 0.12], [75.9, -90, 0.2], [77.4, -90, 0.12], [84.3, -90, 0.12], [85.6, 72, 0.3], [99, 72, 0.3]]
    };
    // a conga line: the leader goes round the stage and everyone follows her path a moment behind
    var CONGA = [{ t0: 41.41, t1: 45.6, th0: -0.24, dir: 1, lap: 4.2 }, { t0: 79.71, t1: 84.0, th0: 0.24, dir: -1, lap: 4.3 }, { t0: 67.2, t1: 68.5, th0: Math.PI * 0.5, dir: 1, lap: 2.2, r: 330 }];
    function congaPath(cg, t) { var th = cg.th0 + cg.dir * TAU * (t - cg.t0) / cg.lap, R = cg.r || 380; return { x: R * Math.sin(th), z: 0.46 - 0.34 * Math.cos(th) }; }
    function congaIn(t) { for (var i = 0; i < CONGA.length; i++) if (t >= CONGA[i].t0 - 0.6 && t < CONGA[i].t1 + 1.6) return CONGA[i]; return null; }
    var CONGA_ORDER = ['tidbit', 'sugarfoot', 'ducklings', 'snail', 'butterfly', 'puddles'];
    // follower i joins the line one by one, and leaves it the same way
    function congaPos(cg, t, i, home) {
      var d = 0.32, tt = t - i * d, w = sio((t - (cg.t0 + i * d - 0.45)) / 0.6) * (1 - sio((t - (cg.t1 + i * d * 0.3)) / 0.8));
      if (w <= 0) return null;
      var p = congaPath(cg, clamp(tt, cg.t0, cg.t1)), p2 = congaPath(cg, clamp(tt - 0.05, cg.t0, cg.t1));
      return { x: mix(home.x, p.x, w), z: mix(home.z, p.z, w), w: w, face: sgn(p.x - p2.x), moving: Math.abs(p.x - p2.x) > 0.5 || (tt > cg.t0 && tt < cg.t1) };
    }

    function pupAt(id, t) {
      var me = id === 'tidbit' ? -1 : 1, other = -me, R = V.calm ? 0.55 : 1;
      var c = { id: id, on: true, lift: 0, face: other, pose: 'run', ph: 0, tilt: 0, rot: 0, sing: 0, eyes: null, wagA: 0.6, fit: fitAt(t).id, kind: 'pup' };
      var p = along(TRACK[id], t); c.x = p.x; c.z = p.z;
      if (p.v) { c.face = p.v; c.moving = true; c.ph = c.x * 0.09 / V.SP + t * 2; }
      var b = beatAt(t), bf = b - Math.floor(b), bi = Math.floor(b);
      var ly = lyricAt(t);
      if (ly && (ly[1] === 'both' || ly[1] === id)) c.sing = 1;
      c.blink = ((t + (id === 'tidbit' ? 0 : 1.7)) % 3.9) < 0.13;
      // ---- curtain up: up through the floor on two lifts ----
      if (t < 4.07) {
        var e = introLift(t); c.on = e > 0; c.lift = -(1 - e) * 150 * zs(c.z); c.clip = zy(c.z) + 1; c.face = me === -1 ? 1 : -1; c.wagA = 0.9;
        return c;
      }
      // ---- tune in: side steps together, a spin, a jump ----
      if (t < 8.94) {
        if (t < 4.7) c.lift = 34 * R * bump((t - 4.07) / 0.63);
        else if (t < 6.8) { var sstep = Math.sin(Math.PI * (b - beatAt(4.7)) / 2); c.x += 46 * sstep * R; c.moving = true; c.ph = c.x * 0.09; c.face = Math.cos(Math.PI * (b - beatAt(4.7)) / 2) >= 0 ? 1 : -1; c.lift = bounce(t, 8 * R); }
        else if (t < 7.9) { var u = (t - 6.8) / 1.1; c.face = Math.cos(TAU * sio(u)) * me * -1; c.lift = 38 * R * bump(u); c.eyes = 'happy'; c.pose = 'wiggle'; }
        if (id === 'sugarfoot' && t >= 8.75) c.lift += riserR(t) * 84;
        if (t >= 7.9 && !p.v) c.face = id === 'tidbit' ? 1 : -1;
        return c;
      }
      // ---- Tidbit's verse ----
      if (t < 16.6) {
        if (id === 'tidbit') {
          if (t < 11.2 && !p.v) { c.pose = 'wiggle'; c.lift = bounce(t, 12 * R); c.face = 1; }
          if (t >= 13.25 && t < 14.0) { var su = (t - 13.25) / 0.75; c.face = Math.cos(TAU * sio(su)); c.lift = 10 * bump(su); c.pose = 'wiggle'; }
          else if (t >= 14.0 && t < 14.95) { var zz = (t - 14.0) / 0.95; c.x += Math.sin(TAU * zz * 1.5) * 170 * R; c.face = Math.cos(TAU * zz * 1.5) >= 0 ? 1 : -1; c.moving = true; c.ph = t * 30; c.zoom = 1; }
          else if (t >= 14.95 && t < 16.3) { c.tilt = -0.32 * sio((t - 14.95) / 0.4); c.face = 1; c.lift = t > 15.75 ? 30 * R * bump((t - 15.75) / 0.6) : 0; c.eyes = t > 15.75 ? 'happy' : null; }
        } else { // up on her riser, cheering her pal on
          c.lift += riserR(t) * 84; c.face = -1; c.pose = 'wiggle'; c.lift += bounce(t, 6 * R); c.tilt = 0.1 * Math.sin(t * 3);
          if (t > 15.75 && t < 16.3) c.eyes = 'happy';
        }
        return c;
      }
      // ---- Sugarfoot's verse: slow and sweet ----
      if (t < 24.34) {
        if (id === 'sugarfoot') {
          if (p.v) { c.ph = t * 4.2; c.lift = Math.abs(Math.sin(t * 4.2)) * 3; } // four little feet, one at a time
          else if (t < 20.43) { c.face = -1; c.pose = 'wiggle'; }
          if (t >= 20.43 && t < 22.42) { var br = 0.5 - 0.5 * Math.cos(TAU * (t - 20.43) / 1.99); c.sy = 1 + 0.05 * br; c.eyes = 'calm'; c.wagA = 0.15; c.face = 1; c.pose = 'sit'; c.glow = win(t, 20.43, 22.42, 0.4, 0.4); }
          if (t >= 22.42) { var hq = (t - 22.42) / 0.95; c.lift = 22 * R * bump(hq % 1); c.face = hq < 1 ? 1 : -1; c.eyes = 'happy'; }
        } else {
          c.lift += riserL(t) * 84;
          if (t >= 16.95 && t < 20.43) { c.face = 1; c.pose = 'wiggle'; c.lift += bounce(t, 5 * R); }
          if (t >= 20.43 && t < 22.42) { c.face = 1; c.pose = 'sit'; c.eyes = 'calm'; }
          if (t >= 22.42) { c.face = 1; c.eyes = 'happy'; c.lift += bounce(t, 7 * R); }
          if (t >= 23.3) { c.face = 1; c.lift += 30 * bump((t - 23.3) / 0.95); } // hops down
        }
        return c;
      }
      // ---- different, different, that's okay: the mirror ----
      if (t < 30.56) {
        if (t < 27.29) {
          var mb = b - beatAt(24.34), mp = Math.sin(Math.PI * mb / 2);
          c.x += me * -38 * mp * R; c.face = other; c.tilt = 0.18 * Math.sin(Math.PI * mb / 2) ;
          c.lift = bounce(t, (id === 'tidbit' ? 10 : 4) * R);
          if (t > 26.0 && t < 26.9) { var sp = (t - 26.0) / 0.9; c.face = other * Math.cos(TAU * sio(sp)); c.lift += 18 * R * bump(sp); }
          c.moving = true; c.ph = mb * 2.2;
        } else if (t < 28.6) { /* walking together to the middle */ }
        else if (t < 29.6) { c.face = other; c.eyes = 'happy'; c.pose = 'wiggle'; c.tilt = 0.12 * Math.sin(t * 6); }
        else { c.pose = 'bow'; c.face = 1 * (id === 'tidbit' ? 1 : -1); c.sy = 1 - 0.05 * ramp(t, 29.6, 30.4); } // ready, set…
        return c;
      }
      // ---- the big chorus ----
      if (t < 51.45) {
        var cg = congaIn(t);
        if (t < 31.3) { c.lift = 46 * R * bump((t - 30.56) / 0.74); c.eyes = 'happy'; c.face = me === -1 ? 1 : -1; }
        else if (t < 34.07) { var gb = b - beatAt(31.3); c.x += 70 * Math.sin(Math.PI * gb / 4) * R; c.moving = true; c.ph = c.x * 0.09; c.face = Math.cos(Math.PI * gb / 4) >= 0 ? 1 : -1; c.lift = bounce(t, 9 * R); if (t > 33.2) { var s3 = (t - 33.2) / 0.85; c.face = Math.cos(TAU * sio(s3)); } }
        else if (t < 39.1) { c.face = other; if (t > 34.9) { c.pose = 'wiggle'; c.eyes = 'happy'; c.tilt = 0.12 * win(t, 36.2, 38.6, 0.4, 0.4); c.sing = c.sing * (t > 36.2 && t < 38.6 ? 0.6 : 1); } }
        else if (t < 41.41) { var jq = (t - 39.1) / 0.85; c.lift = 48 * R * bump(jq); c.face = jq < 1 ? Math.cos(TAU * sio(jq)) * other : other; c.eyes = 'happy'; }
        if (cg && t >= 41.0 && t < 47.5) {
          var cp = congaPos(cg, t, id === 'tidbit' ? 0 : 1, { x: c.x, z: c.z });
          if (cp) { c.x = cp.x; c.z = cp.z; if (cp.moving && cp.w > 0.3) { c.face = cp.face; c.moving = true; c.ph = t * 13; c.lift = (bf > 0.75 && bi % 4 === 3 ? 16 * R * bump((bf - 0.75) * 4) : 0); c.pose = 'run'; } }
        }
        if (t >= 45.96 && t < 49.63) { c.face = other; c.lift += bounce(t, 10 * R); if (t > 47.8 && t < 48.8) c.pose = 'wiggle'; }
        if (t >= 49.63) { var fq = (t - 49.63) / 0.8; c.lift = 52 * R * bump(Math.min(fq, 1)); c.face = id === 'tidbit' ? 1 : -1; if (fq > 0.9) { c.pivot = 'hind'; c.rot = -0.45 * sio((fq - 0.9) * 3); c.eyes = 'happy'; } }
        return c;
      }
      // ---- into space: the stage splits ----
      if (t < 64.15) {
        var sa = splitAmt(t); c.dx = me * sa * 120 * V.SP; c.dy = -sa * 46;
        c.face = other;
        if (t < 52.6) { c.face = other; }
        else if (t < 54.45) { if (id === 'tidbit') { var fz = (t - 52.66) / 0.9; c.x += Math.sin(TAU * fz) * 110 * R; c.face = Math.cos(TAU * fz) >= 0 ? 1 : -1; c.moving = true; c.ph = t * 32; c.zoom = 1; } else { c.tilt = 0.15; } }
        else if (t < 56.25) { if (id === 'sugarfoot') { var fl = (t - 54.45) / 1.8; c.lift = 70 * sio(bump(fl)); c.rot = 0.12 * Math.sin(fl * Math.PI); c.face = -1; c.ph = t * 1.4; c.moving = true; c.float = 1; } else c.tilt = -0.15; }
        else if (t < 57.65) { if (id === 'tidbit') { var yq = (t - 56.25) / 0.47; c.lift = 22 * R * bump(yq % 1); c.tilt = 0.18 * Math.sin(yq * Math.PI * 2); c.eyes = 'happy'; c.say = 'Yes!'; } }
        else if (t < 59.04) { if (id === 'sugarfoot') { c.pivot = 'hind'; c.rot = -0.28 * sio((t - 57.65) / 0.3); c.tilt = 0.1 * Math.sin((t - 57.65) * 9) * win(t, 57.7, 58.9, 0.2, 0.3); c.say = 'No, thank you!'; } else c.eyes = 'happy'; }
        else if (t < 60.4) { /* gliding back together, then onto the turntable */ }
        if (t >= 60.4 && t < 61.9) { var ang = (t - 60.4) * 1.9 + (id === 'tidbit' ? Math.PI : 0); c.x = 120 * Math.cos(ang); c.z = 0.3 + 0.12 * Math.sin(ang); c.face = Math.sin(ang) >= 0 ? -1 : 1; c.moving = true; c.ph = t * 9; }
        if (t >= 61.9 && t < 62.4) { c.x = mix(120 * Math.cos(1.5 * 1.9 + (id === 'tidbit' ? Math.PI : 0)), me * 60, sio((t - 61.9) / 0.5)); }
        if (t >= 61.6) c.face = other;
        if (t >= 62.2 && t < 63.1) { c.pose = 'bow'; }
        if (t >= 63.1 && t < 64.15) { c.pivot = 'hind'; c.rot = -0.3 * bump((t - 63.1) / 1.05); c.tilt = 0.25 * bump((t - 63.1) / 1.05); c.eyes = 'happy'; c.x = me * mix(60, 34, bump((t - 63.1) / 1.05)); c.heart = 1; }
        c.lift += turnUp(t) * 26;
        return c;
      }
      // ---- runnin' free: a laugh, a belly slide, and round they go ----
      if (t < 69.5) {
        if (t < 64.9) { c.eyes = 'happy'; c.lift = bounce(t, 6) + turnUp(t) * 26; c.pose = 'wiggle'; }
        if (t >= 65.6 && t < 67.1) {
          var sl = (t - 65.6) / 1.5, sx0 = id === 'tidbit' ? -390 : 390, sx1 = id === 'tidbit' ? 280 : -280;
          c.face = id === 'tidbit' ? 1 : -1;
          if (sl < 0.25) { c.x = mix(sx0, mix(sx0, sx1, 0.3), sio(sl / 0.25)); c.moving = true; c.ph = t * 16; }
          else { c.x = mix(mix(sx0, sx1, 0.3), sx1, eout((sl - 0.25) / 0.75)); c.pose = 'lie'; c.eyes = 'happy'; c.slide = 1 - (sl - 0.25) / 0.75; }
        }
        var rg = CONGA[2];
        if (t >= 66.7 && t < 69.5) {
          var cp2 = congaPos(rg, t, id === 'sugarfoot' ? 0 : 1, { x: id === 'tidbit' ? 280 : -280, z: c.z });
          if (cp2) { c.x = cp2.x; c.z = cp2.z; c.face = cp2.face; c.moving = cp2.moving; c.ph = t * 13; c.pose = 'run'; c.eyes = 'happy'; }
        }
        return c;
      }
      // ---- the grand finale: marching band ----
      if (t < 88.7) {
        var marching = t >= 70.29 && t < 84.3;
        if (marching) { c.ph = Math.PI * (b % 2); c.pose = 'run'; c.lift = (bi % 2 === (id === 'tidbit' ? 0 : 1) ? 12 : 4) * R * bump(bf); c.face = me === -1 ? 1 : -1; c.tilt = -0.06; }
        if (t >= 70.29 && t < 71.1) { c.lift = 40 * R * bump((t - 70.29) / 0.8); c.eyes = 'happy'; }
        if (t >= 72.61 && t < 73.6) { var s4 = (t - 72.61) / 1; c.face = Math.cos(TAU * sio(s4)) * (me === -1 ? 1 : -1); c.pose = 'wiggle'; }
        if (t >= 74.3 && t < 75.9) { c.face = id === 'tidbit' ? 1 : -1; c.moving = true; c.ph = t * 12; }
        if (t >= 77.55 && t < 78.4) { c.lift = 48 * R * bump((t - 77.55) / 0.85); c.eyes = 'happy'; c.face = Math.cos(TAU * sio((t - 77.55) / 0.85)); }
        var cg2 = congaIn(t);
        if (cg2 && t >= 79.2 && t < 85.6) {
          var cp3 = congaPos(cg2, t, id === 'tidbit' ? 0 : 1, { x: c.x, z: c.z });
          if (cp3) { c.x = cp3.x; c.z = cp3.z; if (cp3.moving && cp3.w > 0.3) { c.face = cp3.face; c.moving = true; c.ph = t * 11; c.lift = 10 * R * bump(bf); } }
        }
        if (t >= 85.6) { c.face = other; c.lift += liftC(t) * 92; c.stand = liftC(t) * 92; c.eyes = 'happy'; }
        if (t >= 87.05) { var pq = (t - 87.05) / 0.5; c.pivot = 'hind'; c.rot = -0.5 * sio(pq); c.face = me === -1 ? 1 : -1; c.wagA = 1; c.tilt = -0.15 * sio(pq); }
        return c;
      }
      // ---- bows, then the stage sinks away ----
      c.face = me === -1 ? 1 : -1; c.lift = liftC(t) * 92; c.stand = c.lift; c.eyes = 'happy';
      if (t >= 89.3 && t < 91.0) c.pose = 'bow'; else if (t >= 91.0) { c.lift += bounce(t, 6); c.pose = 'wiggle'; }
      return c;
    }

    // the guests: where they stand, what they do
    var HOME = { ducklings: { x: -330, z: 0.5 }, snail: { x: 330, z: 0.5 }, butterfly: { x: 0, z: 0.55 }, puddles: { x: -470, z: 0.66 } };
    function guestAt(id, t) {
      var c = { id: id, on: true, x: 0, z: 0.5, lift: 0, hover: 0, face: 1, sing: 0, kind: 'guest', hatKind: GUEST_HAT[fitAt(t).id] || null }, R = V.calm ? 0.55 : 1;
      var b = beatAt(t), bf = b - Math.floor(b), ly = lyricAt(t), chorus = (t >= 30.56 && t < 51.45) || (t >= 70.29 && t < 90.5);
      if (ly && ly[1] === 'both') c.sing = 0.9;
      if (BAND[id]) {
        var up = bandUp(t); c.on = up > 0.01; c.band = true; c.x = BAND[id].x; c.z = 1; c.sc = id === 'frog' ? 1.25 : id === 'owl' ? 1.0 : 0.95;
        c.lift = 0; c.dy = 0; c.face = id === 'squirrel' ? 1 : id === 'owl' ? -1 : 1;
        if (id === 'robot') c.extra = function (g2, t2) { drums(g2, t2, beatAt(t2)); };
        if (id === 'frog') c.extra = function (g2, t2) { keys(g2, t2, beatAt(t2)); };
        if (id === 'owl') { c.extra = function (g2, t2) { trumpet(g2, t2, beatAt(t2)); }; c.sing = 0; }
        if (id === 'squirrel') c.extra = function (g2, t2) { guitar(g2, t2, beatAt(t2)); };
        c.lift = bounce(t, (chorus ? 5 : 2) * R); c.rot = Math.sin(TAU * b / 4) * 0.05 * R;
        return c;
      }
      if (id === 'moon') return c; // drawn with the backdrop
      if (!guestOn(id, t) && id !== 'puddles') { c.on = false; return c; }
      var h = HOME[id]; c.x = h.x; c.z = h.z;
      if (id === 'ducklings') {
        c.duckHop = [0, 1, 2].map(function (i) { return bounce(t + i * 0.15, 5 * R) + (chorus ? bounce(t, 4 * R) : 0); });
        if (t < 16.6) { // following the leader: Tidbit's path, a moment behind
          var lead = pupAt('tidbit', Math.max(11.0, t - 0.8)), inq = sio((t - 11.33) / 0.9);
          c.x = mix(-720, lead.x - 70, inq); c.z = lead.z + 0.02; c.face = sgn(lead.x - pupAt('tidbit', Math.max(11.0, t - 0.85)).x || 1) || 1;
          if (t > 14.95) { c.x = mix(lead.x - 70, -300, sio((t - 14.95) / 1.2)); c.z = mix(lead.z, 0.5, sio((t - 14.95) / 1.2)); c.face = 1; }
        } else if (t < 20.43 || (t >= 22.42 && t < 51.45)) { c.face = Math.sin(TAU * b / 8) > 0 ? 1 : -1; c.x += Math.sin(Math.PI * (b) / 4) * 26 * R; }
        if (t >= 64.5 && t < 66.8) { c.x = mix(-720, -330, sio((t - 64.5) / 1.4)); c.face = 1; }
      }
      if (id === 'snail') {
        if (t < 30.56 && t < 51.45) { var sf = pupAt('sugarfoot', t); var sin2 = sio((t - 16.6) / 2.8); c.x = mix(720, sf.x + 80, sin2); c.z = mix(0.3, sf.z + 0.1, sin2); c.face = -1; if (t > 24.0) { var q2 = sio((t - 24.0) / 2.2); c.x = mix(sf.x + 80, 330, q2); c.z = mix(sf.z + 0.1, 0.5, q2); c.face = q2 < 1 ? 1 : -1; } }
        else c.face = Math.sin(TAU * b / 8 + 1) > 0 ? -1 : 1;
        if (t >= 64.5 && t < 66.6) { c.x = mix(720, 330, sio((t - 64.5) / 1.6)); c.face = -1; }
        c.rot = Math.sin(TAU * b / 2) * 0.05 * R;
      }
      if (id === 'butterfly') {
        var bx, bz, bh;
        if (t < 24.34) { var sf2 = pupAt('sugarfoot', t), a = t * 1.7; bx = sf2.x + Math.cos(a) * 70; bz = sf2.z; bh = 120 + Math.sin(a * 1.3) * 26 + sf2.lift; }
        else { var a2 = t * 0.9; bx = Math.sin(a2) * 300; bz = 0.4 + 0.2 * Math.cos(a2); bh = 190 + Math.sin(t * 2.1) * 30; }
        var inb = sio((t - 16.6) / 1.4); c.x = mix(-760, bx, inb); c.z = bz; c.hover = bh; c.face = Math.cos(t * 1.7) >= 0 ? -1 : 1; c.sc = 1.3; c.shadow = false;
        if (t >= 64.5) { var a3 = t * 0.9; c.x = Math.sin(a3) * 300; c.z = 0.4; c.hover = 190 + Math.sin(t * 2.1) * 30; }
      }
      if (id === 'puddles') { // the conductor, floating over the band
        var pin = sio((t - 24.34) / 1.6); c.on = t >= 24.34; c.x = -470; c.z = 0.66; c.hover = mix(420, 120, pin) + Math.sin(t * 1.6) * 6; c.face = 1; c.shadow = pin > 0.9;
        c.extra = function (g2, t2) { baton(g2, t2, beatAt(t2)); };
        if (t >= 51.45 && t < 64.5) { c.x = 0; c.z = 0.95; c.hover = 250 + Math.sin(t * 1.2) * 10; c.hatKind = 'helmet'; c.shadow = false; }
      }
      // in the conga lines
      var cg = congaIn(t);
      if (cg && CONGA_ORDER.indexOf(id) > 1) {
        var ix = CONGA_ORDER.indexOf(id) + (cg === CONGA[2] ? 0 : 0), cp = congaPos(cg, t, ix, { x: c.x, z: c.z });
        if (cp && guestOn(id, t)) { c.x = cp.x; c.z = cp.z; if (cp.w > 0.3) c.face = id === 'snail' || id === 'ducklings' ? cp.face : c.face; if (id === 'puddles' || id === 'butterfly') { c.hover = mix(c.hover, id === 'puddles' ? 40 : 110, cp.w); } }
      }
      // cheering on the big moments
      if (chorus && id !== 'puddles' && id !== 'butterfly') c.lift += bounce(t, 7 * R);
      [30.56, 39.1, 49.63, 70.29, 77.55, 87.05].forEach(function (m) { if (t >= m && t < m + 0.8 && id !== 'butterfly') c.lift += 30 * R * bump((t - m) / 0.8); });
      if (t >= 89.3 && t < 91.0) c.rot = (c.rot || 0) + 0.25 * sio((t - 89.3) / 0.4) * (1 - sio((t - 90.6) / 0.4)); // a bow
      return c;
    }

    // ---------- layers that rarely change are painted once into a picture and reused ----------
    // (small: a sky is a 2-pixel strip stretched across, the nebula a quarter-size picture)
    var CACHE = {}, CN = 0;
    function cached(key, paint, sc, wide) {
      sc = sc || 1; key = key + '|' + V.W + 'x' + V.Hd; var c = CACHE[key];
      if (!c) {
        if (++CN > 12) { CACHE = {}; CN = 1; }
        c = document.createElement('canvas'); c.width = wide ? Math.ceil(V.W * sc) : 2; c.height = Math.ceil(V.Hd * sc); var x = c.getContext('2d'); x.setTransform(V.k * sc, 0, 0, V.k * sc, 0, 0); paint(x); CACHE[key] = c;
      }
      return c;
    }
    function blit(g, c) { var m = g.getTransform(); g.save(); g.setTransform(1, 0, 0, 1, m.e, m.f); g.drawImage(c, 0, 0, V.W, V.Hd); g.restore(); }
    function skyFill(g, key, stops) { blit(g, cached('sky-' + key, function (x) { var gr = x.createLinearGradient(0, 0, 0, BK0); stops.forEach(function (s2) { gr.addColorStop(s2[0], s2[1]); }); x.fillStyle = gr; x.fillRect(0, 0, V.LW, BK0 + 10); })); }

    // ---------- the scenery: backdrops ----------
    var OPEN = { x0: 0, x1: 0, top: 0 };
    function nightSky(g, t, a) {
      g.globalAlpha = a; skyFill(g, 'night', [[0, '#0C1033'], [0.7, '#251D58'], [1, '#3B2A6A']]);
      for (var i = 0; i < 70; i++) { var x = rnd(i) * V.LW, y = 20 + rnd(i + 99) * (BK0 - 80), tw = 0.55 + 0.45 * Math.sin(t * (V.calm ? 0.8 : 1.6) + i * 2.1); star(g, x, y, 1.2 + rnd(i + 7) * 2.2 * tw, 'rgba(255,244,214,' + (0.35 + 0.5 * tw).toFixed(2) + ')', i); }
      // the gray clouds roll in, then the rainbow
      var cl = win(t, 14.7, 16.9, 0.5, 0.9);
      if (cl > 0) { g.globalAlpha = a * cl; for (var k = 0; k < 5; k++) { var cx = V.cx - 420 + k * 210 + Math.sin(t * 0.4 + k) * 12, cy = 130 + (k % 2) * 40; cloud(g, cx, cy, 1.5 + (k % 3) * 0.3, t > 15.75 ? 'rgba(255,255,255,.85)' : 'rgba(150,150,175,.9)'); } }
      var rb = win(t, 15.6, 17.0, 0.5, 0.8); if (rb > 0) rainbow(g, V.cx, BK0 + 40, 360, 20, a * rb);
      g.globalAlpha = 1;
    }
    function cloud(g, x, y, s, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, 22 * s, 0, TAU); g.arc(x + 26 * s, y - 12 * s, 26 * s, 0, TAU); g.arc(x + 54 * s, y, 20 * s, 0, TAU); g.rect(x, y, 54 * s, 18 * s); g.fill(); }
    function rainbow(g, x, y, r, w, a) { var cols = ['#F27D7D', '#F6B26B', '#F7DC6F', '#8FD694', '#7FB8F0', '#B79CEB']; g.save(); g.globalAlpha = a; g.lineCap = 'butt'; for (var i = 0; i < cols.length; i++) { g.strokeStyle = cols[i]; g.lineWidth = w; g.beginPath(); g.arc(x, y, r - i * w, Math.PI, TAU); g.stroke(); } g.restore(); }
    function sunsetSky(g, t, a) {
      g.globalAlpha = a; skyFill(g, 'sunset', [[0, '#6B4FA0'], [0.45, '#E98AA0'], [0.8, '#FFB98A'], [1, '#FFD9A0']]);
      var sy = BK0 - 30 + (t - 16.6) * 2.2; var sg = g.createRadialGradient(V.cx, sy, 20, V.cx, sy, 230); sg.addColorStop(0, 'rgba(255,240,190,.95)'); sg.addColorStop(0.35, 'rgba(255,214,150,.6)'); sg.addColorStop(1, 'rgba(255,200,150,0)'); g.fillStyle = sg; g.fillRect(V.cx - 240, sy - 240, 480, 480);
      circ(g, V.cx, sy, 86, '#FFE7A8');
      for (var k = 0; k < 4; k++) { cloud(g, ((k * 360 + t * 14) % (V.LW + 300)) - 200, 90 + k * 46, 1.1 + k * 0.15, 'rgba(255,236,236,.55)'); }
      for (var h = 0; h < 10; h++) { var hx = rnd(h + 40) * V.LW, hy = BK0 - ((t * 22 + h * 47) % (BK0 - 60)); heart(g, hx + Math.sin(t + h) * 10, hy, 6 + rnd(h) * 6, 'rgba(255,255,255,' + (0.25 + 0.2 * rnd(h + 3)).toFixed(2) + ')'); }
      // when it gets too loud, the lights go soft
      g.globalAlpha = 1;
    }
    var RB = ['#F27D7D', '#F6B26B', '#F7DC6F', '#8FD694', '#7FB8F0', '#B79CEB', '#F7A8C2'];
    function rainbowLights(g, t, a) {
      g.globalAlpha = a; skyFill(g, 'rainbow', [[0, '#1E1440'], [1, '#3A2668']]);
      g.save(); g.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 7; i++) {
        var ang = -Math.PI / 2 + (i - 3) * 0.26 + Math.sin(t * (V.calm ? 0.35 : 0.7) + i * 0.5) * 0.12, len = 620, ox = V.cx, oy = BK0 + 20;
        var ex = ox + Math.cos(ang) * len, ey = oy + Math.sin(ang) * len, w = 70;
        var bg = g.createLinearGradient(ox, oy, ex, ey); bg.addColorStop(0, hexA(RB[i], 0.5 * a)); bg.addColorStop(1, hexA(RB[i], 0));
        g.fillStyle = bg; g.beginPath(); g.moveTo(ox - 8, oy); g.lineTo(ex - Math.sin(ang) * w, ey + Math.cos(ang) * w * 0.3); g.lineTo(ex + Math.sin(ang) * w, ey - Math.cos(ang) * w * 0.3); g.lineTo(ox + 8, oy); g.closePath(); g.fill();
      }
      g.restore();
      for (var k = 0; k < 30; k++) { var x = rnd(k + 200) * V.LW, y = 30 + rnd(k + 300) * (BK0 - 100), tw = 0.5 + 0.5 * Math.sin(t * 1.2 + k); star(g, x, y, 2 + tw * 2, hexA(RB[k % 7], 0.5 + 0.4 * tw), k); }
      g.globalAlpha = 1;
    }
    function hexA(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + clamp(a, 0, 1).toFixed(3) + ')'; }
    function partyWall(g, t, a, finale) {
      g.globalAlpha = a; skyFill(g, finale ? 'finale' : 'party', [[0, finale ? '#3A1146' : '#160E2E'], [1, finale ? '#7A2A6E' : '#2E1B52']]);
      var b = beatAt(t), step = V.calm ? Math.floor(b / 4) : Math.floor(b / 2);
      if (finale) { // a slow starburst
        g.save(); g.translate(V.cx, BK0 - 40); g.rotate(t * (V.calm ? 0.04 : 0.1));
        for (var r = 0; r < 18; r++) { g.fillStyle = r % 2 ? 'rgba(255,214,120,.16)' : 'rgba(255,140,190,.12)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 900, r * TAU / 18, (r + 0.5) * TAU / 18); g.closePath(); g.fill(); }
        g.restore();
      }
      // the LED wall: a grid of dots that makes shapes on the beat (each look painted once, then reused)
      var heartOn = Math.round((win(t, 34.07, 39.0, 0.4, 0.5) + win(t, 72.61, 77.4, 0.4, 0.5)) * 6) / 6;
      ledWall(g, step, heartOn, finale, a);
      g.globalAlpha = 1;
    }
    function ledWall(g, step, heartOn, finale, a) {
      var cols = Math.round(V.LW / 30), rows = 12, x0 = (V.LW - (cols - 1) * 30) / 2, y0 = 92;
      for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) {
        var x = x0 + i * 30, y = y0 + j * 28; if (y > BK0 - 30) continue;
        var u = (x - V.cx) / 150, v = (y - 210) / 150;
        var inHeart = Math.pow(u * u + (-v) * (-v) - 1, 3) - u * u * Math.pow(-v, 3) < 0;
        var wave = 0.5 + 0.5 * Math.sin(i * 0.5 + j * 0.3 - step * 1.1);
        var lit = finale ? wave : 0.25 + 0.4 * wave;
        var col = RB[(i + j + step) % 7];
        var rad = 4.2;
        if (heartOn > 0) { if (inHeart) { lit = mix(lit, 1, heartOn); col = '#FF7FAE'; rad = 4.2 + 2.2 * heartOn; } else lit *= 1 - 0.75 * heartOn; }
        circ(g, x, y, rad, hexA(col, (0.18 + 0.6 * lit) * a));
      }
    }
    function disco(g, t, y) {
      line(g, V.cx, 0, V.cx, y - 34, 'rgba(220,220,235,.7)', 2);
      var gr = g.createRadialGradient(V.cx - 10, y - 10, 4, V.cx, y, 36); gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(1, '#8F95B8'); circ(g, V.cx, y, 34, gr);
      g.save(); g.beginPath(); g.arc(V.cx, y, 34, 0, TAU); g.clip();
      var rot = t * (V.calm ? 0.5 : 1.1);
      for (var i = -5; i <= 5; i++) for (var j = -5; j <= 5; j++) { var u = ((i * 7 + rot * 10) % 70 + 70) % 70 - 35, v = j * 7; var br = 0.5 + 0.5 * Math.sin(i * 1.7 + j * 2.3 + rot * 3); rr(g, V.cx + u - 3, y + v - 3, 6, 6, 1, 'rgba(255,255,255,' + (0.15 + 0.5 * br).toFixed(2) + ')'); }
      g.restore();
    }
    function spaceSky(g, t, a) {
      g.globalAlpha = a; skyFill(g, 'space', [[0, '#05061A'], [1, '#1A1446']]); blit(g, cached('nebula', function (x) {
        [[0.25, 160, '#F28AA8'], [0.72, 230, '#7FB8F0'], [0.5, 300, '#B79CEB']].forEach(function (n) { var nx = V.LW * n[0], ny = n[1], ng = x.createRadialGradient(nx, ny, 10, nx, ny, 240); ng.addColorStop(0, hexA(n[2], 0.32)); ng.addColorStop(1, hexA(n[2], 0)); x.fillStyle = ng; x.fillRect(nx - 240, ny - 240, 480, 480); });
      }, 0.25, true));
      for (var i = 0; i < 90; i++) { var x = rnd(i + 500) * V.LW, y = 10 + rnd(i + 600) * (BK0 - 30), tw = 0.6 + 0.4 * Math.sin(t * 1.3 + i); circ(g, x, y, 0.8 + rnd(i) * 1.8 * tw, 'rgba(255,255,255,' + (0.4 + 0.5 * tw).toFixed(2) + ')'); }
      // a ringed planet and a little one
      var px = V.cx - V.LW * 0.33, py = 190 + Math.sin(t * 0.3) * 6;
      circ(g, px, py, 54, '#F6B26B'); g.save(); g.beginPath(); g.arc(px, py, 54, 0, TAU); g.clip(); for (var s = 0; s < 4; s++) rr(g, px - 60, py - 40 + s * 22, 120, 9, 4, 'rgba(201,111,74,.35)'); g.restore();
      g.strokeStyle = 'rgba(255,230,180,.85)'; g.lineWidth = 6; g.beginPath(); g.ellipse(px, py, 92, 20, -0.25, 0, TAU); g.stroke();
      circ(g, V.cx + V.LW * 0.12, 120, 20, '#8FD694'); circ(g, V.cx + V.LW * 0.12 - 6, 114, 6, 'rgba(255,255,255,.3)');
      // a shooting star
      var ss = ramp(t, 56.6, 57.5); if (ss > 0 && ss < 1) { var sx2 = mix(V.LW * 0.15, V.LW * 0.7, ss), sy2 = mix(60, 200, ss); var sg = g.createLinearGradient(sx2 - 120, sy2 - 44, sx2, sy2); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(255,255,255,.95)'); line(g, sx2 - 120, sy2 - 44, sx2, sy2, sg, 3); star(g, sx2, sy2, 7, '#FFF6C9', t * 3); }
      g.globalAlpha = 1;
    }
    function seaSky(g, t, a) {
      g.globalAlpha = a; skyFill(g, 'sea', [[0, '#5A6FD0'], [0.5, '#F29CB4'], [0.75, '#FFC98B']]);
      var hz = BK0 - 120; circ(g, V.cx + 200, hz - 10, 60, '#FFE29A');
      var sea = g.createLinearGradient(0, hz, 0, BK0); sea.addColorStop(0, '#4F8FD8'); sea.addColorStop(1, '#2E5FA8'); g.fillStyle = sea; g.fillRect(0, hz, V.LW, BK0 - hz + 10);
      for (var k = 0; k < 5; k++) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); for (var x = -20; x < V.LW + 20; x += 20) { var y = hz + 14 + k * 22 + Math.sin(x / 40 + t * 2 + k) * 3; if (x === -20) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
      // a little sailboat with a heart on its sail
      var bx = ((t - 64) * 40) % (V.LW + 300) - 150, by = hz + 8 + Math.sin(t * 2) * 3;
      g.fillStyle = '#8A5A3C'; g.beginPath(); g.moveTo(bx - 34, by); g.lineTo(bx + 34, by); g.lineTo(bx + 24, by + 14); g.lineTo(bx - 24, by + 14); g.closePath(); g.fill();
      line(g, bx, by, bx, by - 64, '#6B4A36', 2.4); g.fillStyle = '#FFFDF4'; g.beginPath(); g.moveTo(bx + 2, by - 62); g.lineTo(bx + 40, by - 8); g.lineTo(bx + 2, by - 8); g.closePath(); g.fill(); heart(g, bx + 16, by - 26, 6, '#F28AA8');
      for (var s = 0; s < 3; s++) { var gx = ((t * 30 + s * 230) % (V.LW + 100)) - 50, gy = 80 + s * 30 + Math.sin(t * 2 + s) * 6; g.strokeStyle = 'rgba(60,40,80,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(gx - 10, gy); g.quadraticCurveTo(gx - 5, gy - 7, gx, gy); g.quadraticCurveTo(gx + 5, gy - 7, gx + 10, gy); g.stroke(); }
      g.globalAlpha = 1;
    }
    function snowSky(g, t, a) {
      g.globalAlpha = a; skyFill(g, 'snow', [[0, '#8FB3E0'], [0.7, '#CFE2F6'], [1, '#EEF5FC']]);
      for (var h = 0; h < 3; h++) ell(g, V.cx + (h - 1) * V.LW * 0.4, BK0 + 10, V.LW * 0.36, 70 - h * 8, h === 1 ? '#FFFFFF' : '#F2F7FD');
      for (var p = 0; p < 9; p++) { var px = (p + 0.5) * V.LW / 9 + Math.sin(p * 7) * 30, py = BK0 - 50 - (p % 3) * 14, ph = 46 + (p % 2) * 18; g.fillStyle = '#3F6E5A'; g.beginPath(); g.moveTo(px, py - ph); g.lineTo(px - ph * 0.42, py); g.lineTo(px + ph * 0.42, py); g.closePath(); g.fill(); g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(px, py - ph); g.lineTo(px - ph * 0.16, py - ph * 0.62); g.lineTo(px + ph * 0.16, py - ph * 0.62); g.closePath(); g.fill(); }
      for (var i = 0; i < 60; i++) { var x = (rnd(i + 800) * V.LW + Math.sin(t * 0.8 + i) * 18), y = ((t * (22 + rnd(i) * 18) + rnd(i + 900) * BK0) % BK0); circ(g, x, y, 1.5 + rnd(i + 3) * 2.2, 'rgba(255,255,255,.9)'); }
      g.globalAlpha = 1;
    }
    function campSky(g, t, a) {
      g.globalAlpha = a; skyFill(g, 'camp', [[0, '#0E1530'], [0.6, '#2B2350'], [1, '#5A3448']]);
      for (var i = 0; i < 50; i++) { var x = rnd(i + 1200) * V.LW, y = 20 + rnd(i + 1300) * (BK0 - 200), tw = 0.55 + 0.45 * Math.sin(t * 1.1 + i * 2.1); circ(g, x, y, 0.8 + rnd(i) * 1.6 * tw, 'rgba(255,244,214,' + (0.3 + 0.5 * tw).toFixed(2) + ')'); }
      var gl = g.createRadialGradient(V.cx, BK0, 20, V.cx, BK0, 420); gl.addColorStop(0, 'rgba(255,170,90,.55)'); gl.addColorStop(1, 'rgba(255,140,80,0)'); g.fillStyle = gl; g.fillRect(V.cx - 420, BK0 - 420, 840, 440);
      for (var p = 0; p < 12; p++) { var px = (p + 0.5) * V.LW / 12, py = BK0 + 6, ph = 90 + rnd(p + 5) * 70; g.fillStyle = '#15182E'; g.beginPath(); g.moveTo(px, py - ph); g.lineTo(px - ph * 0.3, py); g.lineTo(px + ph * 0.3, py); g.closePath(); g.fill(); }
      var fx = V.cx, fy = BK0 - 4; for (var l = -1; l <= 1; l += 2) line(g, fx - 34 * l, fy + 6, fx + 30 * l, fy - 4, '#7A4A30', 8);
      var fl = 1 + Math.sin(t * 9) * 0.1 + Math.sin(t * 5.3) * 0.08; ell(g, fx, fy - 20 * fl, 18, 30 * fl, '#F6A04D'); ell(g, fx, fy - 14 * fl, 10, 18 * fl, '#FFE69A');
      for (var f = 0; f < 14; f++) { var ffx = rnd(f + 40) * V.LW + Math.sin(t * 0.7 + f) * 40, ffy = 120 + rnd(f + 60) * (BK0 - 180) + Math.cos(t * 0.9 + f) * 20, fa = 0.5 + 0.5 * Math.sin(t * 1.3 + f * 1.7); circ(g, ffx, ffy, 6, 'rgba(255,230,120,' + (0.18 * fa).toFixed(2) + ')'); circ(g, ffx, ffy, 2.2, 'rgba(255,240,170,' + (0.4 + 0.5 * fa).toFixed(2) + ')'); }
      g.globalAlpha = 1;
    }
    var BACK_DRAW = { snow: snowSky, campfire: campSky, night: nightSky, sunset: sunsetSky, rainbow: rainbowLights, party: function (g, t, a) { partyWall(g, t, a, false); }, space: spaceSky, sea: seaSky, finale: function (g, t, a) { partyWall(g, t, a, true); } };
    function backdrop(g, t) {
      if (PLAN) return planBackdrop(g, t);
      var i = 0; for (var k = 0; k < BACKS.length; k++) if (t >= BACKS[k][0]) i = k;
      var at = BACKS[i][0], q = i > 0 ? clamp((t - at) / 0.9, 0, 1) : 1;
      if (q < 1) BACK_DRAW[BACKS[i - 1][1]](g, t, 1);
      BACK_DRAW[BACKS[i][1]](g, t, q < 1 ? sio(q) : 1);
      var name = BACKS[i][1];
      // the Moon sings along at night, floats by in space, and comes back for the finale in shades
      var moonA = win(t, 0.6, 16.9, 1.5, 0.8) + win(t, 51.5, 64.4, 0.8, 0.5) + win(t, 69.4, 99, 0.8, 0.1);
      if (moonA > 0) {
        var mx = V.cx + V.LW * 0.34, my = 140 + Math.sin(t * 0.8) * 6, ly = lyricAt(t), mc = { id: 'moon', on: true, x: 0, z: 0, lift: 0, face: 1, sing: ly && ly[1] === 'both' ? 1 : 0, shades: t > 69, kind: 'guest' };
        if (t > 51 && t < 65) { mx = V.cx + V.LW * 0.36; my = 110; }
        g.save(); g.globalAlpha = clamp(moonA, 0, 1); g.translate(mx, my); g.scale(1.6, 1.6);
        GDRAW.moon(g, t, mc.sing ? talkAmt(t, 3) : 0, ((t + 1.1) % 4.6) < 0.14);
        if (mc.shades) { g.save(); g.translate(-13, -4); g.scale(2.2, 2.2); shades(g); g.restore(); }
        g.restore(); g.globalAlpha = 1;
        if (mc.sing && !V.calm) { note(g, mx - 64, my - 30 - ((t * 30) % 30), 1.6, 'rgba(255,240,200,.85)'); }
      }
      if (name === 'party' || (i > 0 && BACKS[i - 1][1] === 'party' && q < 1)) { var dy = 60 + 110 * eout(ramp(t, 30.56, 32.0)) - 200 * eio(ramp(t, 50.9, 51.5)); if (dy > -30) disco(g, t, dy); }
    }

    function planBackdrop(g, t) {
      var i = secAt(t), S = SECTIONS[i], cur = secOpt(i, 'back'), q = i > 0 ? clamp((t - S.a) / 0.9, 0, 1) : 1, prev = i > 0 ? secOpt(i - 1, 'back') : cur;
      if (q < 1 && prev !== cur) { BACK_DRAW[prev](g, t, 1); BACK_DRAW[cur](g, t, sio(q)); } else BACK_DRAW[cur](g, t, 1);
      if (PLAN.role.moon) {
        var mx = V.cx + V.LW * 0.34, my = 140 + Math.sin(t * 0.8) * 6, ly = lyricAt(t), sing = ly && ly[1] === 'both', mf = OPT.fit[(PLAN.fit.moon || [])[i] || 0][0];
        g.save(); g.globalAlpha = ramp(t, 0.6, 2); g.translate(mx, my); g.scale(1.6, 1.6);
        GDRAW.moon(g, t, sing ? talkAmt(t, 3) : 0, ((t + 1.1) % 4.6) < 0.14);
        if (mf === 'rock') { g.save(); g.translate(-13, -4); g.scale(2.2, 2.2); shades(g); g.restore(); }
        else if (GHAT[mf] && GHAT[mf] !== 'helmet') hatOn(g, GHAT[mf], 0, -26, 1.5, t, 1);
        else if (mf === 'astro') bubble(g, 0, 0, 40);
        g.restore(); g.globalAlpha = 1;
      }
      if (cur === 'party') disco(g, t, 60 + 110 * eout(ramp(t, S.a, S.a + 1.4)));
    }
    var GHAT = { none: null, tophat: 'tophat', rock: null, flowers: 'flowers', royal: 'crown', sparkle: 'party', astro: 'helmet', pirate: 'pirate', band: 'shako' };

    // ---------- the stage: deck, light-up tiles, risers, lifts ----------
    var TILE_PAL = { snow: ['#BFE3FF', '#FFFFFF', '#B79CEB'], campfire: ['#F6A04D', '#F6CB4C', '#F28AA8'], night: ['#5B4BC4', '#7FB8F0', '#B79CEB'], sunset: ['#F6B26B', '#F28AA8', '#FFE29A'], rainbow: RB, party: RB, space: ['#7FB8F0', '#B79CEB', '#8FE3D0'], sea: ['#4F8FD8', '#8FE3D0', '#FFE29A'], finale: ['#F28AA8', '#F6CB4C', '#7FB8F0', '#8FD694'] };
    function tileLit(t, i, j, cols) {
      var b = beatAt(t), chorus = PLAN ? planHot(t) && t < 88.7 : (t >= 30.56 && t < 51.45) || (t >= 70.29 && t < 88.7), per = V.calm ? 4 : chorus ? 1 : 2, step = Math.floor(b / per), frac = (b / per) - step;
      var fade = clamp(frac / 0.25, 0, 1); // each change eases in, never a hard flash
      function pat(s) {
        if (t < 4.07) return 0.15 + 0.15 * ((i + j) % 2);
        var mode = Math.floor(s / 8) % 3;
        if (mode === 0) return (i + j + s) % 2 ? 1 : 0.15;
        if (mode === 1) return Math.abs(i - (s % cols)) < 1.5 || Math.abs(i - (cols - 1 - s % cols)) < 1.5 ? 1 : 0.2;
        var d = Math.abs(i - (cols - 1) / 2) + j * 1.2; return Math.abs(d - (s % 6)) < 1.2 ? 1 : 0.2;
      }
      var lv = mix(pat(step - 1), pat(step), fade);
      if (t >= 20.43 && t < 22.42) lv *= 0.35; // a breath: the floor goes soft
      return V.calm ? 0.35 + lv * 0.4 : lv;
    }
    function deckQuad(g, xl0, xr0, xl1, xr1, yF, yB) { g.beginPath(); g.moveTo(xl0, yF); g.lineTo(xr0, yF); g.lineTo(xr1, yB); g.lineTo(xl1, yB); g.closePath(); }
    function drawDeck(g, t, drop) {
      var fy = FY0 + drop, bk = BK0 + drop, sa = splitAmt(t), back = PLAN ? secOpt(secAt(t), 'back') : BACKS.reduce(function (a, k) { return t >= k[0] ? k[1] : a; }, 'night'), pal = TILE_PAL[back];
      var hf = 620 * V.SP + 40, hb = 520 * V.SP + 10, cols = 12, rows = 4;
      [-1, 1].forEach(function (side) {
        var dx = side * sa * 120 * V.SP, dy = -sa * 46;
        var gap = sa * 8;
        var xl0 = side < 0 ? V.cx - hf : V.cx + gap, xr0 = side < 0 ? V.cx - gap : V.cx + hf, xl1 = side < 0 ? V.cx - hb : V.cx + gap * 0.8, xr1 = side < 0 ? V.cx - gap * 0.8 : V.cx + hb;
        g.save(); g.translate(dx, dy);
        // the front face (the apron), then the top
        g.fillStyle = '#3B2340'; g.beginPath(); g.moveTo(xl0, fy); g.lineTo(xr0, fy); g.lineTo(xr0, fy + 26 + (sa > 0 ? 40 * sa : 0)); g.lineTo(xl0, fy + 26 + (sa > 0 ? 40 * sa : 0)); g.closePath(); g.fill();
        rr(g, xl0, fy, xr0 - xl0, 4, 0, '#E9C98A');
        deckQuad(g, xl0, xr0, xl1, xr1, fy, bk); g.fillStyle = '#2A1E3E'; g.fill();
        // light-up tiles in perspective
        for (var j = 0; j < rows; j++) {
          var y0 = mix(fy, bk, j / rows), y1 = mix(fy, bk, (j + 1) / rows);
          for (var i = 0; i < cols / 2; i++) {
            var gi = side < 0 ? i : i + cols / 2, u0 = gi / cols, u1 = (gi + 1) / cols;
            var X0a = mix(V.cx - hf, V.cx + hf, u0), X1a = mix(V.cx - hf, V.cx + hf, u1), X0b = mix(V.cx - hb, V.cx + hb, u0), X1b = mix(V.cx - hb, V.cx + hb, u1);
            var ja = j / rows, jb = (j + 1) / rows, p0 = mix(X0a, X0b, ja), p1 = mix(X1a, X1b, ja), p2 = mix(X1a, X1b, jb), p3 = mix(X0a, X0b, jb);
            var lv = tileLit(t, gi, j, cols), col = pal[(((gi + j * 2 + Math.floor(beatAt(t) / 8)) % pal.length) + pal.length) % pal.length];
            g.fillStyle = hexA(col, 0.12 + 0.62 * lv); g.beginPath(); g.moveTo(p0 + 2, y0 - 1.5); g.lineTo(p1 - 2, y0 - 1.5); g.lineTo(p2 - 2, y1 + 1.5); g.lineTo(p3 + 2, y1 + 1.5); g.closePath(); g.fill();
          }
        }
        if (sa > 0.02) { // the split: glowing edges
          var ex = side < 0 ? xr0 : xl0, ex2 = side < 0 ? xr1 : xl1; line(g, ex, fy, ex2, bk, 'rgba(160,220,255,' + (0.8 * sa).toFixed(2) + ')', 3);
          for (var th = 0; th < 3; th++) { var ty = fy + 30 + th * 14; line(g, ex - side * 6, ty, ex - side * 6 - side * 20 * sa, ty + 30, 'rgba(160,220,255,' + (0.35 * sa).toFixed(2) + ')', 2); }
        }
        g.restore();
      });
      // the gap between the halves shows the starry deep below
      if (sa > 0.02) { var gg = g.createLinearGradient(0, fy, 0, fy + 80); gg.addColorStop(0, 'rgba(120,200,255,' + (0.35 * sa).toFixed(2) + ')'); gg.addColorStop(1, 'rgba(120,200,255,0)'); g.fillStyle = gg; g.fillRect(V.cx - 130 * sa * V.SP, bk, 260 * sa * V.SP, fy - bk + 80); }
      // footlights along the front
      var nb = Math.round(V.LW / 42);
      for (var k = 0; k < nb; k++) { var bx = (k + 0.5) * V.LW / nb, on = V.calm ? 0.8 : 0.75 + 0.25 * Math.sin(t * 3 + k); circ(g, bx, fy + 16, 13, 'rgba(255,232,170,' + (0.16 * on).toFixed(3) + ')'); circ(g, bx, fy + 16, 7, 'rgba(255,232,170,' + (0.3 * on).toFixed(3) + ')'); circ(g, bx, fy + 16, 3, '#FFF1C2'); }
      // the side risers
      [['L', -430, riserL(t), '#F28AA8'], ['R', 430, riserR(t), '#7FB8F0']].forEach(function (r) {
        var h = r[2] * 84, slideIn = r[2] > 0 ? 0 : 1; if (r[2] <= 0.001) return;
        var z = 0.36, x = sx(r[1], z), y = zy(z) + drop, w = 120 * zs(z), d = 22 * zs(z);
        rr(g, x - w, y - h, w * 2, h + 4, 6, '#3B2A55'); for (var s = 0; s < 6; s++) circ(g, x - w + 12 + s * (w * 2 - 24) / 5, y - h + 14, 3.2, hexA(r[3], 0.5 + 0.5 * Math.sin(t * 2 + s)));
        ell(g, x, y - h, w, d, r[3]); ell(g, x, y - h, w - 6, d - 4, hexA('#FFFFFF', 0.25));
      });
      // the turntable in the middle (into space, then sorry and a laugh)
      var tu = turnUp(t);
      if (tu > 0.001) {
        var z2 = 0.3, x2 = V.cx, y2 = zy(z2) + drop + 4, w2 = 170 * zs(z2) * V.SP + 40, d2 = 30, h2 = tu * 26;
        rr(g, x2 - w2, y2 - h2, w2 * 2, h2, 4, '#3E2C64'); ell(g, x2, y2, w2, d2, '#3E2C64');
        ell(g, x2, y2 - h2, w2, d2, '#B79CEB'); var rot = (t - 59.7) * (V.calm ? 0.8 : 1.9);
        g.save(); g.beginPath(); g.ellipse(x2, y2 - h2, w2 - 4, d2 - 3, 0, 0, TAU); g.clip();
        for (var k2 = 0; k2 < 12; k2++) { var a = rot + k2 * TAU / 12; line(g, x2, y2 - h2, x2 + Math.cos(a) * w2, y2 - h2 + Math.sin(a) * d2, k2 % 2 ? 'rgba(255,255,255,.35)' : 'rgba(247,168,194,.55)', 6); }
        g.restore();
        heart(g, x2 + Math.cos(rot) * w2 * 0.6, y2 - h2 + Math.sin(rot) * d2 * 0.6, 7, '#F28AA8');
      }
      // the lift in the middle for the big finish, and the two little ones the pals come up on
      var lc = liftC(t);
      if (lc > 0.001) {
        var y3 = zy(0.3) + drop + 4, w3 = 150 * V.SP + 10, h3 = lc * 92;
        rr(g, V.cx - w3, y3 - h3, w3 * 2, h3, 4, '#5B3F8C'); for (var s2 = 0; s2 < 8; s2++) circ(g, V.cx - w3 + 14 + s2 * (w3 * 2 - 28) / 7, y3 - h3 + 18, 3.4, '#FFE08A');
        ell(g, V.cx, y3, w3, 26, '#5B3F8C'); ell(g, V.cx, y3 - h3, w3, 26, '#F6CB4C'); ell(g, V.cx, y3 - h3, w3 - 8, 21, '#FFE08A');
      }
      var il = introLift(t);
      if (t < 5.2) [-110, 110].forEach(function (xo) { var z = 0.16, x = sx(xo, z), y = zy(z) + drop, w = 46; var glow = win(t, 2.6, 5.2, 0.5, 0.8); ell(g, x, y + 1, w, 10, 'rgba(255,236,170,' + (0.55 * glow).toFixed(2) + ')'); ell(g, x, y + 1, w - 8, 7, 'rgba(30,18,46,' + (0.8 * (1 - il)).toFixed(2) + ')'); });
    }
    // the band's riser, at the back
    function drawBandRiser(g, t, drop) {
      var up = bandUp(t); if (up <= 0.001) return;
      var h = up * 92, y = BK0 + 8 + drop, w = 380 * V.SP + 30;
      rr(g, V.cx - w, y - h, w * 2, h + 30, 8, '#4A2E5C'); rr(g, V.cx - w, y - h, w * 2, 8, 4, '#F6CB4C');
      for (var s = 0; s < 14; s++) circ(g, V.cx - w + 18 + s * (w * 2 - 36) / 13, y - h + 26, 3.4, hexA(RB[s % 7], 0.55 + 0.45 * Math.sin(t * 2.2 + s)));
      text(g, '♥ THE BUDDIES BAND ♥', V.cx, y - h + 52, 18, 'rgba(255,240,210,.85)', '700', '"IBM Plex Mono", monospace');
    }

    // ---------- light: spotlights, a follow spot, a soft breath ----------
    function beam(g, sx0, sy0, tx, ty, w, col, a) {
      var bg = g.createLinearGradient(sx0, sy0, tx, ty); bg.addColorStop(0, hexA(col, 0.36 * a)); bg.addColorStop(1, hexA(col, 0.05 * a));
      g.fillStyle = bg; g.beginPath(); g.moveTo(sx0 - 7, sy0); g.lineTo(sx0 + 7, sy0); g.lineTo(tx + w, ty); g.lineTo(tx - w, ty); g.closePath(); g.fill();
      ell(g, tx, ty, w, w * 0.22, hexA(col, 0.22 * a));
    }
    function lights(g, t, drop, chars) {
      var on = ramp(t, 3.0, 4.2) * (1 - ramp(t, 90.8, 92.2)); if (on <= 0) return;
      var sp = V.calm ? 0.45 : 1, fl = zy(0.15) + drop;
      g.save(); g.globalCompositeOperation = 'lighter';
      var cols = (t >= 30.56 && t < 51.45) || t >= 69.5 ? ['#FFB3D1', '#B3E0FF', '#FFE6A8', '#C9B3FF'] : t >= 16.6 && t < 24.34 ? ['#FFD8B0', '#FFE6C8'] : ['#FFF2D6', '#D6E4FF'];
      var mood = PLAN ? secOpt(secAt(t), 'light') : null;
      if (mood) cols = mood === 'party' ? ['#FFB3D1', '#B3E0FF', '#FFE6A8', '#C9B3FF'] : mood === 'warm' ? ['#FFE0A8', '#FFC98A', '#FFF2D6'] : mood === 'cool' ? ['#B3D4FF', '#C9B3FF', '#A8F0E8'] : mood === 'rainbow' ? ['#F27D7D', '#F6B26B', '#F7DC6F', '#8FD694', '#7FB8F0', '#B79CEB'] : [];
      var n = cols.length;
      for (var i = 0; i < n; i++) {
        var sx0 = V.LW * (0.12 + 0.76 * i / Math.max(1, n - 1)), tx = V.cx + Math.sin(t * 0.9 * sp + i * 1.9) * 380 * V.SP;
        beam(g, sx0, -10, tx, fl, 70, cols[i], on * (t >= 20.43 && t < 22.42 ? 0.3 : 0.8));
      }
      // the follow spot on whoever is singing alone
      var ly = lyricAt(t), solo = ly && ly[1] !== 'both' ? ly[1] : (t >= 8.94 && t < 16.6 ? 'tidbit' : t >= 16.6 && t < 24.34 ? 'sugarfoot' : null);
      if (mood === 'spot') { g.restore(); g.fillStyle = 'rgba(14,8,30,.3)'; g.fillRect(0, 0, V.LW, 720); g.save(); g.globalCompositeOperation = 'lighter'; if (!solo || !chars[solo] || !chars[solo].on || chars[solo].band) solo = PLAN._lead; }
      if (solo && chars[solo] && chars[solo].on) { var sc = chars[solo]; beam(g, V.cx, -20, sx(sc.x, sc.z) + (sc.dx || 0), zy(sc.z) + drop + (sc.dy || 0) + 6, 64, '#FFF6DA', on); }
      g.restore();
    }

    // ---------- the main curtain, the drapes, the sign ----------
    function curtains(g, t) {
      var o = curtainOpen(t), L = V.LW;
      // side drapes and the valance stay (painted once)
      var frame = cached('drapes', function (x) { drapes(x, L); }, 1, true);
      if (o < 0.999) mainCurtain(g, o, L);
      // only the edges and the top of that picture are needed
      var m = g.getTransform(), ew = Math.ceil(80 * V.k), th = Math.ceil(62 * V.k), H2 = Math.ceil((FY0 + 32) * V.k);
      g.save(); g.setTransform(1, 0, 0, 1, m.e, m.f);
      g.drawImage(frame, 0, 0, ew, H2, 0, 0, ew, H2); g.drawImage(frame, V.W - ew, 0, ew, H2, V.W - ew, 0, ew, H2); g.drawImage(frame, ew, 0, V.W - 2 * ew, th, ew, 0, V.W - 2 * ew, th);
      g.restore();
    }
    function drapes(g, L) {
      [-1, 1].forEach(function (sd) {
        var ex = sd < 0 ? 0 : L, w = 66;
        var dg = g.createLinearGradient(ex, 0, ex - sd * w, 0); dg.addColorStop(0, '#6E1F36'); dg.addColorStop(1, '#A33350');
        g.fillStyle = dg; g.beginPath(); g.moveTo(ex, 0); g.lineTo(ex - sd * w, 0); g.quadraticCurveTo(ex - sd * (w - 10), 360, ex - sd * (w + 8), FY0 + 30); g.lineTo(ex, FY0 + 30); g.closePath(); g.fill();
        for (var f = 1; f < 4; f++) line(g, ex - sd * f * 16, 0, ex - sd * (f * 16 + 6), FY0 + 30, 'rgba(50,8,24,.3)', 2.5);
      });
      // the valance, scalloped, with a gold fringe
      g.fillStyle = '#9B2B48'; g.fillRect(0, 0, L, 34); for (var v = 0; v * 46 < L + 46; v++) { circ(g, v * 46 + 23, 34, 23, '#9B2B48'); }
      for (var v2 = 0; v2 * 46 < L + 46; v2++) { g.strokeStyle = '#F6CB4C'; g.lineWidth = 3; g.beginPath(); g.arc(v2 * 46 + 23, 34, 23, 0.15, Math.PI - 0.15); g.stroke(); }
    }
    // the main curtain: two halves that meet in the middle
    function mainCurtain(g, o, L) {
      {
        var cw = (L / 2 + 10) * (1 - o);
        [-1, 1].forEach(function (sd) {
          var x0 = sd < 0 ? -10 : L + 10, x1 = sd < 0 ? cw - 10 : L - cw + 10;
          var cg = g.createLinearGradient(0, 0, L, 0); cg.addColorStop(0, '#8E2842'); cg.addColorStop(0.5, '#B8395A'); cg.addColorStop(1, '#8E2842');
          g.fillStyle = cg; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x1, 0); g.quadraticCurveTo(x1 + sd * 10 * o, 400, x1 - sd * 6, FY0 + 60); g.lineTo(x0, FY0 + 60); g.closePath(); g.fill();
          var nf = Math.max(2, Math.round(cw / 34));
          for (var f = 0; f < nf; f++) { var fx = mix(x0, x1, (f + 0.5) / nf); line(g, fx, 0, fx + sd * 4, FY0 + 60, 'rgba(60,8,28,.28)', 5); line(g, fx + 9, 0, fx + 9 + sd * 4, FY0 + 60, 'rgba(255,200,210,.08)', 4); }
          rr(g, Math.min(x0, x1), FY0 + 30, Math.abs(x1 - x0), 12, 0, '#F6CB4C');
        });
      }
    }
    function marquee(g, t) {
      var down = eout(ramp(t, 0.4, 2.2)) * (1 - eio(ramp(t, 92.0, 92.4))), w = Math.min(560, V.LW * 0.56), h = 82, x = V.cx - w / 2, y = mix(-140, 50, down);
      line(g, x + 30, 0, x + 30, y, 'rgba(255,240,210,.6)', 2); line(g, x + w - 30, 0, x + w - 30, y, 'rgba(255,240,210,.6)', 2);
      rr(g, x - 6, y - 6, w + 12, h + 12, 18, '#3C2A5A'); var mg = g.createLinearGradient(0, y, 0, y + h); mg.addColorStop(0, '#6B4AA0'); mg.addColorStop(1, '#4B3378'); rr(g, x, y, w, h, 14, mg);
      var n = Math.round(w / 22), chase = Math.floor(beatAt(t) / (V.calm ? 2 : 1));
      for (var i = 0; i < n; i++) { var bx = x + 10 + i * (w - 20) / (n - 1), lit = t < 1.2 ? (i / n < (t - 0.4) / 0.8) : true, on = (i + chase) % 3 === 0; circ(g, bx, y + 7, 3.4, !lit ? '#5A4A6A' : on ? '#FFF3C4' : '#F28AA8'); circ(g, bx, y + h - 7, 3.4, !lit ? '#5A4A6A' : on ? '#BFE3FF' : '#FFE08A'); }
      var sub = t < 4.07 ? 'TONIGHT · LIVE ON STAGE' : t >= 87.05 ? 'SEE YOU NEXT TIME, PALS!' : 'THE THEME SONG';
      text(g, sub, V.cx, y + 24, 13, '#F7C98B', '700', '"IBM Plex Mono", monospace');
      var lg = g.createLinearGradient(0, y + 34, 0, y + 70); lg.addColorStop(0, '#FFE08A'); lg.addColorStop(1, '#F7A8C2');
      outlined(g, 'Frequency Buddies', V.cx, y + 52, 34, lg, '#2E2346', true);
    }

    // ---------- the crowd, out front ----------
    // each sign is drawn once into a little picture, then reused (text is slow to draw every frame)
    var SPR = {};
    function signSprite(str, w, col) {
      var key = str + '|' + col + '|' + w + '|' + V.k.toFixed(2), c = SPR[key]; if (c) return c;
      c = document.createElement('canvas'); var k = Math.max(1, V.k * 1.5); c.width = Math.ceil(w * k); c.height = Math.ceil(30 * k);
      var x = c.getContext('2d'); x.scale(k, k); rr(x, 0, 0, w, 30, 5, '#FFFDF4'); text(x, str, w / 2, 15, 13, col, '800', '"IBM Plex Mono", monospace');
      SPR[key] = c; return c;
    }
    var SIGNS = ['GO PALS!', 'ARF ARF!', '♥ TIDBIT', '♥ SUGARFOOT', 'ENCORE!', '♪ ♥ ♪', 'GO PALS!', 'BEST BUDDIES!'];
    function crowd(g, t) {
      var n = Math.round(V.LW / 30), b = beatAt(t), chorus = PLAN ? planHot(t) || (t >= 4.07 && t < 8.94) : (t >= 30.56 && t < 51.45) || (t >= 70.29 && t < 92.4) || (t >= 4.07 && t < 8.94), end = t >= 87.05;
      var hype = t < 1 ? 0 : chorus ? 1 : 0.5, signs = PLAN ? (planHot(t) ? clamp((t - SECTIONS[secAt(t)].a) / 0.5, 0, 1) : 0) : win(t, 30.9, 51.3, 0.5, 0.4) + win(t, 70.5, 99, 0.5, 0.1) + win(t, 57.7, 59.0, 0.3, 0.3) * 0.999;
      var cols = ['#2B2140', '#35294F', '#3F3060', '#2F2547', '#46356A'], glow = ['#7FE0F7', '#F7A8C2', '#F8D76A', '#8FD694'];
      g.save();
      for (var row = 0; row < 2; row++) for (var i = 0; i < n; i++) {
        var k = i * 2 + row, x = (i + 0.5) * V.LW / n + (row ? 14 : -4), y = V.H - (row ? 6 : 34), c = cols[(k * 7) % cols.length], kind = Math.floor(rnd(k + 9) * 4);
        var ph = (b + (i % 4) * 0.25) % 1, bob = (2 + 5 * hype) * Math.abs(Math.sin(Math.PI * ph)) * (V.calm ? 0.5 : 1), hy = y - 22 - bob;
        var wave = end || (chorus && (k * 5 + Math.floor(b / 8)) % 3 === 0);
        var signIx = (k % 7 === 3 && row === 0) ? (Math.floor(k / 7) % SIGNS.length) : -1;
        if (signIx >= 0 && signs > 0) {
          var su = signs, syy = hy - 30 - 20 * su + Math.sin(t * 3 + k) * 3 * (V.calm ? 0.3 : 1), sw2 = Math.max(70, SIGNS[signIx].length * 9 + 16), str = (!PLAN && t >= 57.7 && t < 59.0) ? (signIx % 2 ? 'NO IS OKAY ♥' : 'GO PALS!') : SIGNS[signIx];
          if (str.length > 10) sw2 = str.length * 8.6 + 16;
          g.globalAlpha = clamp(su, 0, 1); line(g, x, hy - 4, x, syy, '#C9A77A', 3);
          g.drawImage(signSprite(str, sw2, ['#E4566E', '#5B3F8C', '#2E7D5B', '#C25B1E'][k % 4]), x - sw2 / 2, syy - 18, sw2, 30);
          g.globalAlpha = 1;
        } else if (wave) {
          var sw = Math.sin(t * (V.calm ? 2 : 4) + i) * 5, ax = x + 9 + sw, ay = hy - 22;
          line(g, x + 6, y - 14 - bob, ax, ay, c, 4);
          if (!end && k % 2 === 0) { var gc = glow[k % 4]; line(g, ax, ay, ax + sw * 0.6, ay - 12, gc, 3); circ(g, ax + sw * 0.6, ay - 12, 5, hexA(gc, 0.3)); } else circ(g, ax, ay, 3.2, c);
          if (end && k % 3 === 0) { line(g, x - 6, y - 14 - bob, x - 9 - sw, ay, c, 4); }
        }
        ell(g, x, y - bob * 0.5, 15, 12, c); circ(g, x, hy, 10, c);
        if (kind === 0) { ell(g, x - 9, hy + 1, 3.5, 7, c, 0.3); ell(g, x + 9, hy + 1, 3.5, 7, c, -0.3); } // floppy ears
        else if (kind === 1) { g.fillStyle = c; g.beginPath(); g.moveTo(x - 9, hy - 3); g.lineTo(x - 6, hy - 15); g.lineTo(x - 1, hy - 8); g.moveTo(x + 9, hy - 3); g.lineTo(x + 6, hy - 15); g.lineTo(x + 1, hy - 8); g.fill(); } // pointy ears
        else if (kind === 2) { ell(g, x - 4, hy - 14, 2.6, 8, c); ell(g, x + 4, hy - 14, 2.6, 8, c); } // long ears
        else { circ(g, x - 8, hy - 7, 4, c); circ(g, x + 8, hy - 7, 4, c); } // round ears
      }
      g.restore();
    }

    // ---------- moments: confetti, fireworks, hearts, sparkle puffs (pure, from the clock) ----------
    var CANNONS = [30.56, 39.1, 49.63, 70.29, 77.55, 87.05];
    var FIREWORKS = [[49.63, 0.22, 120, 0], [50.2, 0.78, 100, 1], [50.7, 0.5, 80, 2], [77.55, 0.25, 110, 3], [78.1, 0.75, 120, 0], [87.05, 0.2, 110, 1], [87.5, 0.8, 100, 2], [88.0, 0.5, 70, 3], [88.6, 0.32, 130, 0], [89.1, 0.68, 120, 1], [30.56, 0.5, 90, 2], [70.4, 0.5, 90, 3]];
    var FWC = [['#FFE08A', '#F28AA8', '#FFFFFF'], ['#7FB8F0', '#B79CEB', '#FFFFFF'], ['#8FD694', '#F7DC6F', '#FFFFFF'], ['#F7A8C2', '#FFB36B', '#FFFFFF']];
    var CONF = ['#F27D7D', '#F6B26B', '#F7DC6F', '#8FD694', '#7FB8F0', '#B79CEB', '#F7A8C2', '#FFFFFF'];
    function moments(g, t, drop, chars) {
      if (PLAN) planFx(g, t, drop, chars);
      // confetti from cannons at both sides of the stage
      if (!PLAN) CANNONS.forEach(function (t0, ci) { confetti(g, t, t0, ci, drop); });
      if (!PLAN) FIREWORKS.forEach(function (fw, fi) { firework(g, t, fw, fi); });
      if (!PLAN) [[34.3, 4.5], [63.1, 1.2], [72.8, 4.2], [87.2, 3.2]].forEach(function (h, hi) { heartsUp(g, t, h[0], h[1], hi, drop); });
      if (!PLAN) FITS.forEach(function (f, fi) { if (!f.puff) return; ['tidbit', 'sugarfoot'].forEach(function (id) { puff(g, t, f.at, fi, chars[id]); }); });
      notes(g, t, chars);
    }
    function confetti(g, t, t0, ci, drop) {
        var u = t - t0, life = 4.2; if (u < 0 || u > life) return;
        var n = V.calm ? 40 : 110;
        for (var i = 0; i < n; i++) {
          var sd = i % 2 ? 1 : -1, r1 = rnd(ci * 977 + i), r2 = rnd(ci * 577 + i * 3 + 1), r3 = rnd(ci * 311 + i * 7 + 2);
          var x0 = V.cx + sd * (V.LW / 2 - 90), y0 = FY0 + drop - 10, ang = -Math.PI / 2 - sd * (0.25 + 0.5 * r1), sp = (V.calm ? 420 : 650) + 420 * r2, k = 1.6;
          var e = (1 - Math.exp(-k * u)) / k, x = x0 + Math.cos(ang) * sp * e + Math.sin(u * 3 + i) * 18 * u, y = y0 + Math.sin(ang) * sp * e + (70 + 60 * r3) * (u - e);
          var a = clamp((life - u) / 0.8, 0, 1); g.globalAlpha = a;
          g.save(); g.translate(x, y); g.rotate(u * (4 + 6 * r3) + i); g.fillStyle = CONF[i % CONF.length]; g.fillRect(-5, -3 * Math.abs(Math.cos(u * 6 + i)) - 0.5, 10, 6 * Math.abs(Math.cos(u * 6 + i)) + 1); g.restore();
        }
        g.globalAlpha = 1;
    }
    // fireworks, in the sky behind (or soft glowing stars, in the calm version)
    function firework(g, t, fw, fi) {
        var u = t - fw[0]; if (u < 0 || u > 2.4) return;
        var x = V.LW * fw[1], y = fw[2] + 40, cs = FWC[fw[3]];
        if (V.calm) { var a0 = bump(u / 2.4); g.globalAlpha = a0 * 0.8; star(g, x, y, 22, cs[0], 0.2); g.globalAlpha = a0 * 0.35; circ(g, x, y, 46, cs[1]); g.globalAlpha = 1; return; }
        if (u < 0.5) { var ry = mix(BK0, y, eout(u / 0.5)); circ(g, x, ry, 3, '#FFF3C4'); line(g, x, ry, x, ry + 26, 'rgba(255,240,200,.5)', 2); return; }
        var v = u - 0.5, n = 44;
        for (var i = 0; i < n; i++) { var ang = i / n * TAU + fi, r = 190 * (1 - Math.exp(-2.4 * v)), px = x + Math.cos(ang) * r, py = y + Math.sin(ang) * r + 26 * v * v; g.globalAlpha = clamp(1 - v / 1.9, 0, 1); circ(g, px, py, 4.6, cs[i % 3]); circ(g, mix(x, px, 0.78), mix(y, py, 0.78), 3, cs[(i + 1) % 3]); circ(g, mix(x, px, 0.55), mix(y, py, 0.55), 2, cs[(i + 2) % 3]); }
        g.globalAlpha = 1;
    }
    // hearts float up
    function heartsUp(g, t, t0, len, hi, drop) {
        var h = [t0, len], u = t - h[0]; if (u < 0 || u > h[1] + 2.4) return;
        for (var i = 0; i < 16; i++) {
          var st = (i / 16) * h[1], v = u - st; if (v < 0 || v > 2.4) continue;
          var x = V.cx + (rnd(hi * 40 + i) - 0.5) * 520 * V.SP, y = zy(0.2) + drop - 90 - v * 90; g.globalAlpha = clamp(1 - v / 2.4, 0, 1) * clamp(v / 0.2, 0, 1);
          heart(g, x + Math.sin(v * 3 + i) * 10, y, 9 + rnd(i) * 6, ['#F28AA8', '#F7A8C2', '#FF7FAE'][i % 3]);
        }
        g.globalAlpha = 1;
    }
    // a sparkle puff: a costume change
    function puff(g, t, at, fi, c) {
          var u = t - (at - 0.3); if (u < 0 || u > 0.95 || !c || !c.on) return;
          var x = sx(c.x, c.z) + (c.dx || 0), y = zy(c.z) + (c.dy || 0) - c.lift - (c.hover || 0) - 34 * zs(c.z), s = zs(c.z), a = u < 0.3 ? u / 0.3 : clamp(1 - (u - 0.3) / 0.65, 0, 1), grow = eout(u / 0.5);
          g.globalAlpha = a * 0.92;
          for (var k = 0; k < 9; k++) { var ang = k / 9 * TAU + fi, r = (28 + 22 * grow) * s; circ(g, x + Math.cos(ang) * r * 0.9, y + Math.sin(ang) * r * 0.6, (24 + 10 * rnd(k + fi)) * s * (0.6 + 0.6 * grow), k % 2 ? '#FFFFFF' : '#FFE6F0'); }
          circ(g, x, y, 46 * s * (0.6 + 0.5 * grow), '#FFF8FB');
          g.globalAlpha = a;
          for (var j = 0; j < 10; j++) { var a2 = j / 10 * TAU + u * 5, r2 = (30 + 70 * grow) * s; star(g, x + Math.cos(a2) * r2, y + Math.sin(a2) * r2 * 0.7, 7 * s, ['#F8D76A', '#F7A8C2', '#7FB8F0'][j % 3], u * 4); }
          g.globalAlpha = 1;
    }
    function notes(g, t, chars) {
      // singing: little notes float up from whoever is singing
      if (!V.calm || Math.floor(t * 2) % 2 === 0) Object.keys(chars).forEach(function (id) {
        var c = chars[id]; if (!c.on || !c.sing || !c.head || c.band && id === 'owl') return;
        var ph = ((t * 0.9 + id.length * 0.37) % 1), x = c.head.x + (id === 'tidbit' || id === 'sugarfoot' ? 18 : 10) + Math.sin(t * 2 + id.length) * 6, y = c.head.y - 18 - ph * 40;
        g.globalAlpha = bump(ph) * 0.95; note(g, x, y, id === 'tidbit' || id === 'sugarfoot' ? 1.5 : 1.1, id === 'tidbit' ? '#FFC48A' : id === 'sugarfoot' ? '#D7C4FF' : '#FFF3C4'); g.globalAlpha = 1;
      });
      // the band's notes, on the beat
      if (bandUp(t) > 0.9 && t < 90.6) Object.keys(chars).filter(function (id) { return chars[id].band && chars[id].role !== 'drums'; }).forEach(function (id, k) {
        var c = chars[id]; if (!c || !c.head) return; k = k % 3; var b = beatAt(t), ph = (b / 2 + k * 0.33) % 1;
        g.globalAlpha = bump(ph) * 0.9; note(g, c.head.x + 26 + ph * 20, c.head.y - 10 - ph * 50, 1.2, ['#FFE08A', '#BFE3FF', '#F7A8C2'][k]); g.globalAlpha = 1;
      });
    }
    // speed lines, a breath of light, a word bubble
    function extras(g, t, drop, chars) {
      ['tidbit', 'sugarfoot'].forEach(function (id) {
        var c = chars[id]; if (!c || !c.on || !c.head) return;
        if (c.zoom || c.slide > 0) { var x = sx(c.x, c.z) + (c.dx || 0), y = zy(c.z) + (c.dy || 0) - 26 - c.lift, d = -sgn(c.face); for (var k = 0; k < 4; k++) line(g, x + d * (46 + k * 10), y - 24 + k * 12, x + d * (90 + k * 22), y - 24 + k * 12, 'rgba(255,255,255,' + (0.55 - k * 0.1).toFixed(2) + ')', 3); if (c.slide > 0) for (var s = 0; s < 5; s++) star(g, x + d * (40 + s * 26), zy(c.z) + drop - 6 - (s % 2) * 10, 5, ['#F8D76A', '#F7A8C2', '#7FB8F0'][s % 3], t * 3 + s); }
        if (c.glow > 0) { var gx = c.head.x, gy = c.head.y + 40; var gr = g.createRadialGradient(gx, gy, 10, gx, gy, 170); gr.addColorStop(0, 'rgba(255,236,170,' + (0.45 * c.glow).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,236,170,0)'); g.fillStyle = gr; g.fillRect(gx - 170, gy - 170, 340, 340); }
        if (c.say) { var bx = c.head.x + (id === 'tidbit' ? 30 : -30), by = c.head.y - 70; g.font = '800 26px Fraunces, Georgia, serif'; var w = g.measureText(c.say).width + 30; rr(g, bx - w / 2, by - 24, w, 46, 18, '#FFFDF6'); g.fillStyle = '#FFFDF6'; g.beginPath(); g.moveTo(bx - 8, by + 20); g.lineTo(bx + (id === 'tidbit' ? -22 : 22), by + 40); g.lineTo(bx + 10, by + 20); g.fill(); text(g, c.say, bx, by, 26, id === 'tidbit' ? '#C25B1E' : '#5B3F8C', '800'); }
        if (c.float && !V.calm) for (var b = 0; b < 3; b++) { var ph = (t * 0.6 + b * 0.33) % 1; circ(g, c.head.x - 20 + b * 14, c.head.y - 30 - ph * 40, 3 + ph * 3, 'rgba(200,230,255,' + (0.6 * (1 - ph)).toFixed(2) + ')'); }
      });
    }

    // ---------- a creation: who stands where, what they wear, how they move ----------
    var SLOT = { drums: -150, keys: 70, horns: 230, guitar: -300 };
    var INSTR = { drums: function (g2, t2) { drums(g2, t2, beatAt(t2)); }, keys: function (g2, t2) { keys(g2, t2, beatAt(t2)); }, horns: function (g2, t2) { trumpet(g2, t2, beatAt(t2)); }, guitar: function (g2, t2) { guitar(g2, t2, beatAt(t2)); } };
    function planGroups() {
      if (PLAN._g) return PLAN._g;
      var G = { lead: [], backup: [], chorus: [], band: [], crowd: [], all: [] };
      CAST.forEach(function (id) { if (id === 'moon') return; var r = OPT.role[PLAN.role[id] || 0][0]; if (r === 'off') return; if (SLOT[r] != null) G.band.push(id); else G[r].push(id); });
      G.dancers = G.lead.concat(G.backup, G.chorus);
      PLAN._band = G.band.length > 0; PLAN._lead = G.lead[0] || G.dancers[0] || null;
      return (PLAN._g = G);
    }
    function homeOf(id, G) {
      var i = G.lead.indexOf(id), n;
      if (i >= 0) { n = G.lead.length; var gap = Math.min(190, 900 / Math.max(1, n)); return { x: (i - (n - 1) / 2) * gap, z: 0.12, role: 'lead' }; }
      if ((i = G.backup.indexOf(id)) >= 0) return { x: (i % 2 ? 1 : -1) * (300 + 120 * Math.floor(i / 2)), z: 0.36, role: 'backup' };
      if ((i = G.chorus.indexOf(id)) >= 0) { n = G.chorus.length; return { x: n === 1 ? 0 : -420 + 840 * i / (n - 1), z: 0.6, role: 'chorus' }; }
      if ((i = G.band.indexOf(id)) >= 0) { var r = OPT.role[PLAN.role[id]][0], dup = G.band.slice(0, i).filter(function (o) { return OPT.role[PLAN.role[o]][0] === r; }).length; return { x: SLOT[r] + dup * 80, z: 1, role: r, band: true }; }
      if ((i = G.crowd.indexOf(id)) >= 0) { n = G.crowd.length; return { x: (i - (n - 1) / 2) * 190, z: 0, role: 'crowd', crowd: true }; }
      return null;
    }
    function fitOf(id, si) { return OPT.fit[((PLAN.fit[id] || [])[si]) || 0][0]; }
    function planChar(id, t, si) {
      var G = planGroups(), h = homeOf(id, G), S = SECTIONS[si], R = V.calm ? 0.55 : 1, pup = id === 'tidbit' || id === 'sugarfoot';
      var c = { id: id, on: !!h, kind: pup ? 'pup' : 'guest', x: h ? h.x : 0, z: h ? h.z : 0.5, lift: 0, hover: 0, face: h && h.x > 0 ? -1 : 1, pose: 'run', ph: 0, tilt: 0, rot: 0, sing: 0, wagA: 0.6 };
      if (!h) return c;
      c.role = h.role; c.band = !!h.band; c.crowdRole = !!h.crowd;
      var f = fitOf(id, si); if (pup) c.fit = f === 'none' ? null : f; else { c.hatKind = GHAT[f] || null; c.shades = f === 'rock'; }
      var ly = lyricAt(t); if (ly && (ly[1] === 'both' || ly[1] === id)) c.sing = pup ? 1 : 0.9;
      if (!pup && ly && ly[1] === 'both') c.sing = 0.9;
      c.blink = ((t + id.length * 0.7) % 3.9) < 0.13;
      if (id === 'butterfly') { c.hover = 110 + Math.sin(t * 2.1) * 20; c.sc = 1.3; c.shadow = false; }
      if (id === 'puddles') { c.hover = 70 + Math.sin(t * 1.6) * 6; }
      if (id === 'ducklings') c.sc = 1.15;
      if (c.band) { c.extra = INSTR[h.role]; if (h.role === 'horns') c.sing = 0; c.lift = bounce(t, (planHot(t) ? 5 : 2) * R); c.rot = Math.sin(TAU * beatAt(t) / 4) * 0.05 * R; c.face = h.role === 'horns' ? -1 : 1; if (id === 'puddles') c.hover = 30; return c; }
      var b = beatAt(t), bf = b - Math.floor(b);
      if (c.crowdRole) { c.lift = bounce(t, 10 * R); c.face = h.x > 0 ? -1 : 1; return c; }
      var k = G.dancers.indexOf(id), n = G.dancers.length, mv = secOpt(si, 'move'), go = t >= 4.07, base = { x: c.x, z: c.z };
      if (!go) { c.face = h.x > 20 ? -1 : 1; c.lift = 0; }
      else {
        var lead = h.role === 'lead', amp = h.role === 'chorus' ? 0.7 : 1;
        if (mv === 'free') { var opts = ['side', 'spin', 'jump', 'mirror']; mv = opts[Math.floor(rnd(k * 13 + Math.floor(b / 8) * 7 + 3) * opts.length)]; }
        if (mv === 'side') { var sp2 = Math.sin(Math.PI * b / 2); c.x += 46 * sp2 * R * amp; c.moving = true; c.ph = c.x * 0.09; c.face = Math.cos(Math.PI * b / 2) >= 0 ? 1 : -1; c.lift = bounce(t, 8 * R); }
        else if (mv === 'spin') { c.lift = bounce(t, 7 * R); var sq = (b % 4) / 4; c.face = h.x > 20 ? -1 : 1; if (sq > 0.75) { c.face *= Math.cos(TAU * sio((sq - 0.75) * 4)); c.lift += 12 * R * bump((sq - 0.75) * 4); c.pose = 'wiggle'; } }
        else if (mv === 'jump') { var jq = (b % 2) / 2; c.lift = 36 * R * amp * bump(jq); c.eyes = 'happy'; c.face = h.x > 20 ? -1 : 1; }
        else if (mv === 'slide') { var p8 = (b % 8) / 8, tri = p8 < 0.5 ? -1 + 4 * p8 : 3 - 4 * p8, prev = ((b - 0.2) % 8) / 8, triP = prev < 0.5 ? -1 + 4 * prev : 3 - 4 * prev; c.x = base.x + 220 * tri * (k % 2 ? -1 : 1) * R; c.face = sgn((tri - triP) * (k % 2 ? -1 : 1)); var mid = Math.abs(tri) < 0.7; if (pup && mid) { c.pose = 'lie'; c.slide = 0.6; c.eyes = 'happy'; } else { c.moving = true; c.ph = t * 14; } if (!pup) c.tilt = mid ? -0.2 * c.face : 0; }
        else if (mv === 'mirror') { var side2 = k % 2 ? -1 : 1, mp = Math.sin(Math.PI * b / 2); c.x += side2 * 40 * mp * R; c.face = side2; c.tilt = 0.16 * mp * side2; c.lift = bounce(t, 6 * R); c.moving = true; c.ph = b * 2.2; }
        else if (mv === 'conga') { var cg = { t0: Math.max(S.a, 4.07), t1: S.b - 0.9, th0: -0.24, dir: 1, lap: 4.6 }, cp = congaPos(cg, t, k, base); if (cp) { c.x = cp.x; c.z = cp.z; if (cp.moving && cp.w > 0.3) { c.face = cp.face; c.moving = true; c.ph = t * 13; c.lift = (bf > 0.75 && Math.floor(b) % 4 === 3 ? 14 * R * bump((bf - 0.75) * 4) : 0); } } }
        else if (mv === 'pose') { c.face = h.x > 20 ? -1 : 1; c.eyes = 'happy'; c.lift = bounce(t, 3 * R); if (pup) { c.pivot = 'hind'; c.rot = -0.42 * sio(ramp(t, S.a, S.a + 0.6)); } else c.lift += (Math.floor(b) % 4 === 0 ? 10 * R * bump(bf) : 0); }
        // the stage's own moves carry the dancers
        var sa = splitAmt(t); if (sa > 0) { var sd = c.x < 0 ? -1 : 1; c.dx = sd * sa * 120 * V.SP; c.dy = -sa * 46; }
        var tu = turnUp(t); if (tu > 0 && lead) { var ang = (t - S.a) * 1.2 * R, r0 = Math.max(80, Math.abs(base.x)), a0 = base.x < 0 ? Math.PI : 0; c.x = mix(c.x, r0 * Math.cos(a0 + ang), tu); c.z = mix(c.z, 0.3 + 0.12 * Math.sin(a0 + ang), tu); c.lift += tu * 26; }
        var lc = liftC(t); if (lc > 0 && lead) { c.z = mix(c.z, 0.3, lc); c.lift += lc * 92; c.stand = lc * 92; }
        var rs = riserL(t); if (rs > 0 && h.role === 'backup' && G.backup.indexOf(id) < 2) { var rx = G.backup.indexOf(id) % 2 ? 430 : -430; c.x = mix(c.x, rx, sio(rs * 2)); c.z = mix(c.z, 0.36, sio(rs * 2)); c.lift += rs * 84; }
      }
      // bows at the very end
      if (t >= 89.3 && t < 91.0) { if (pup) { c.pose = 'bow'; c.pivot = null; c.rot = 0; } else c.rot = (c.rot || 0) + 0.25 * sio((t - 89.3) / 0.4) * (1 - sio((t - 90.6) / 0.4)); }
      return c;
    }
    function planChars(t) {
      var si = secAt(t), S = SECTIONS[si], out = {};
      CAST.forEach(function (id) { if (id !== 'moon') out[id] = planChar(id, t, si); });
      if (si > 0 && t - S.a < 0.8) { // glide from the last part's places into this one's
        var q = sio((t - S.a) / 0.8);
        CAST.forEach(function (id) { if (id === 'moon') return; var c = out[id], p = planChar(id, S.a - 0.001, si - 1); if (c.on && p.on && !c.band && !c.crowdRole) { c.x = mix(p.x, c.x, q); c.z = mix(p.z, c.z, q); } });
      }
      return out;
    }
    function planFx(g, t, drop, chars) {
      var cut = V.calm ? 0.5 : 1;
      SECTIONS.forEach(function (S, i) {
        var fx = PLAN.sec[i].fx || 0, a = Math.max(S.a, 4.07), bt = 0.4615 * (i >= 4 ? 0.992 : 1);
        if (t < a - 0.1 || t > S.b + 4.4) return;
        if (fx & 1) for (var c0 = a + 0.1, ci = 0; c0 < S.b; c0 += bt * 16, ci++) if (t >= c0 && t < c0 + 4.2) confetti(g, t, c0, i * 37 + ci, drop);
        if (fx & 4) for (var f0 = a + 0.3, fi = 0; f0 < S.b; f0 += bt * 4 / cut, fi++) if (t >= f0 && t < f0 + 2.4) firework(g, t, [f0, 0.15 + 0.7 * rnd(i * 53 + fi), 70 + 90 * rnd(i * 71 + fi), (i + fi) % 4], fi);
        if (fx & 2 && t < S.b + 2.6) for (var h0 = a, hi = 0; h0 < S.b; h0 += 0.3 / cut, hi++) { var v = t - h0; if (v < 0) break; if (v > 2.6) continue; var hx = V.cx + (rnd(i * 91 + hi) - 0.5) * 900 * V.SP, hy = zy(0.25) + drop - 60 - v * 95; g.globalAlpha = clamp(1 - v / 2.6, 0, 1) * clamp(v / 0.2, 0, 1); heart(g, hx + Math.sin(v * 3 + hi) * 10, hy, 8 + rnd(hi) * 7, ['#F28AA8', '#F7A8C2', '#FF7FAE'][hi % 3]); }
        if (fx & 8 && t < S.b + 3) for (var b0 = a, bi = 0; b0 < S.b; b0 += 0.22 / cut, bi++) { var w = t - b0; if (w < 0) break; if (w > 3) continue; var bx = V.cx + (rnd(i * 17 + bi) - 0.5) * 1000 * V.SP + Math.sin(w * 2.4 + bi) * 14, by = FY0 + drop - 20 - w * 120, br = 6 + rnd(bi + 9) * 9; g.globalAlpha = clamp(1 - w / 3, 0, 1) * clamp(w / 0.2, 0, 1); g.strokeStyle = 'rgba(200,235,255,.9)'; g.lineWidth = 1.8; g.beginPath(); g.arc(bx, by, br, 0, TAU); g.stroke(); circ(g, bx - br * 0.35, by - br * 0.35, br * 0.22, 'rgba(255,255,255,.8)'); }
        if (fx & 16 && t >= a && t < S.b) for (var s0 = 0; s0 < 22 * cut; s0++) { var per = 1.8 + rnd(s0 + i) * 1.2, ph = ((t + rnd(s0 * 3 + i) * per) % per) / per, sxp = rnd(s0 * 7 + i * 3) * V.LW, syp = 90 + rnd(s0 * 11 + i) * (FY0 - 140); g.globalAlpha = bump(ph) * 0.9; star(g, sxp, syp + drop * 0.5, 4 + 6 * bump(ph), ['#FFF3C4', '#F7A8C2', '#BFE3FF'][s0 % 3], t * 0.8 + s0); }
        g.globalAlpha = 1;
        // costume changes: a sparkle puff for anyone whose outfit changes here
        if (i > 0 && t >= S.a - 0.3 && t < S.a + 0.7) CAST.forEach(function (id) { if (id === 'moon' || !chars[id] || !chars[id].on) return; if (fitOf(id, i) !== fitOf(id, i - 1)) puff(g, t, S.a, i, chars[id]); });
      });
    }

    // ---------- one whole frame ----------
    function draw(g, t, W, H, o) {
      o = o || {};
      V.calm = !!o.calm; V.burn = !!o.burn; PLAN = o.plan || null; if (PLAN) planGroups();
      var k = H / 720; V.k = k; V.W = W; V.Hd = H; V.LW = W / k; V.H = 720; V.cx = V.LW / 2; V.SP = clamp((V.LW - 100) / 1180, 0.62, 1.05);
      t = clamp(t, 0, DUR);
      var drop = stageDrop(t); FY = FY0 + drop; BK = BK0 + drop;
      g.setTransform(k, 0, 0, k, 0, 0);
      g.fillStyle = '#140E22'; g.fillRect(0, 0, V.LW, 720);
      // the backdrop flies in from above as the stage rises
      g.save(); g.translate(0, -(1 - eout(ramp(t, 0.5, 2.6))) * 520); backdrop(g, t); g.restore();
      // everyone, at this moment
      var chars = {};
      if (PLAN) chars = planChars(t);
      else {
        chars.tidbit = pupAt('tidbit', t); chars.sugarfoot = pupAt('sugarfoot', t);
        ['robot', 'frog', 'owl', 'squirrel', 'ducklings', 'snail', 'butterfly', 'puddles'].forEach(function (id) { chars[id] = guestAt(id, t); });
      }
      ['tidbit', 'sugarfoot'].forEach(function (id) { var c = chars[id]; if (c.clip != null) c.clip += drop; });
      lights(g, t, drop, chars);
      // the band, on its riser at the back
      drawBandRiser(g, t, drop);
      var bandY = BK0 + 8 + drop - bandUp(t) * 92;
      Object.keys(chars).filter(function (id) { return chars[id].band; }).sort(function (a, b) { return chars[a].x - chars[b].x; }).forEach(function (id) { var c = chars[id]; if (!c.on) return; c.dy = bandY - zy(1) + 4; if (c.kind === 'pup') drawPup(g, c, t); else drawGuest(g, c, t); });
      drawDeck(g, t, drop);
      // everyone on the stage, back to front
      var list = Object.keys(chars).map(function (id) { return chars[id]; }).filter(function (c) { return c.on && !c.band && !c.crowdRole; });
      list.sort(function (a, b) { return b.z - a.z || (a.kind === 'pup' ? 1 : -1); });
      list.forEach(function (c) { c.dy = (c.dy || 0) + drop; if (c.kind === 'pup') drawPup(g, c, t); else drawGuest(g, c, t); });
      // the soft dim of "take a breath"
      var dim = win(t, 20.43, 22.42, 0.5, 0.6); if (dim > 0) { g.fillStyle = 'rgba(20,10,40,' + (0.32 * dim).toFixed(3) + ')'; g.fillRect(0, 0, V.LW, 720); }
      extras(g, t, drop, chars);
      moments(g, t, drop, chars);
      curtains(g, t);
      marquee(g, t);
      crowd(g, t);
      Object.keys(chars).forEach(function (id) { var c = chars[id]; if (!c.on || !c.crowdRole) return; c.z = 0; c.sc = 0.8; c.dy = 712 - zy(0) - (c.kind === 'pup' ? 0 : 0); if (c.kind === 'pup') drawPup(g, c, t); else drawGuest(g, c, t); }); // pals out in the crowd, cheering
      overlays(g, t);
      g.setTransform(1, 0, 0, 1, 0, 0);
      return chars;
    }
    // costume tags, the thank-you card, and (for the video file) the words
    function overlays(g, t) {
      var f = fitAt(t), u = t - f.at;
      if (PLAN) { var si = secAt(t), S = SECTIONS[si]; f = { at: si ? S.a : 0, name: S.name }; u = t - f.at; }
      if (f.at > 0 && u >= 0 && u < 2.6) {
        var a = Math.min(1, u / 0.3, (2.6 - u) / 0.4), slide = (1 - eout(u / 0.35)) * -320;
        g.globalAlpha = a; g.save(); g.translate(24 + slide, 168); g.rotate(-0.04);
        g.font = '800 30px Fraunces, Georgia, serif'; var w = g.measureText(f.name).width;
        rr(g, 6, -26, w + 44, 74, 14, 'rgba(30,18,46,.55)'); rr(g, 0, -32, w + 44, 74, 14, '#FFE08A');
        text(g, PLAN ? '♪ NOW PLAYING' : '✨ COSTUME CHANGE', 22, -14, 13, '#5B3F8C', '700', '"IBM Plex Mono", monospace', 'left');
        text(g, f.name, 22, 16, 30, '#2E2346', '800', null, 'left');
        g.restore(); g.globalAlpha = 1;
      }
      var end = ramp(t, 91.3, 92.0);
      if (end > 0) {
        g.globalAlpha = end; var lg = g.createLinearGradient(0, 260, 0, 330); lg.addColorStop(0, '#FFE08A'); lg.addColorStop(1, '#F7A8C2');
        outlined(g, 'Thanks for watching!', V.cx, 300, 64, lg, '#2E2346', true);
        outlined(g, 'Two pals. One big heart each.', V.cx, 380, 30, '#FFFDF6', '#2E2346', true);
        g.globalAlpha = 1;
      }
      if (V.burn) {
        var ly = lyricAt(t); if (ly) {
          var who = ly[1] === 'tidbit' ? 'TIDBIT' : ly[1] === 'sugarfoot' ? 'SUGARFOOT' : 'EVERYONE', str = '♪ ' + ly[2] + ' ♪';
          g.font = '600 34px Fraunces, Georgia, serif'; var w2 = Math.min(V.LW - 60, g.measureText(str).width + 60);
          rr(g, V.cx - w2 / 2, 600, w2, 92, 18, 'rgba(20,12,34,.78)');
          text(g, who, V.cx, 622, 15, ly[1] === 'tidbit' ? '#FFC48A' : ly[1] === 'sugarfoot' ? '#D7C4FF' : '#FFE08A', '700', '"IBM Plex Mono", monospace');
          g.font = '600 34px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#FFFDF6'; g.fillText(str, V.cx, 660, V.LW - 90);
        }
      }
    }
    return { draw: draw, pupAt: pupAt, guestAt: guestAt, planChars: function (p, t) { PLAN = p; planGroups(); var r = planChars(t); PLAN = null; return r; } };
  }

  var SHOW = makeShow();
  window.TOLMusicVideo = { sections: SECTIONS, opt: OPT, cast: CAST, draw: SHOW.draw, dur: DUR, closeAt: CLOSE_AT, lyrics: LYRICS, lyricAt: lyricAt, chapters: CHAPTERS, fits: FITS, beatAt: beatAt, names: NAMES };
  if (typeof document === 'undefined') return;

  // ===================================================================================================
  // THE PLAYER
  // ===================================================================================================
  var MEM_KEY = 'tol-music-video-v1';
  function memGet() { try { return JSON.parse(localStorage.getItem(MEM_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function memSet(m) { try { localStorage.setItem(MEM_KEY, JSON.stringify(m)); } catch (e) {} }
  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function stillChosen() { try { return REDUCED || !!(window.TOLStill && (window.TOLStill.chosen ? window.TOLStill.chosen() : window.TOLStill.on())); } catch (e) { return REDUCED; } }
  function fmt(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // iPhones treat web sound as "ambient" and mute it with the silent switch. Asking for media playback
  // (and briefly playing a moment of silence through a media element) lets the music be heard.
  var unlocked = false;
  function unlockMediaAudio() {
    if (unlocked) return; unlocked = true;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try {
      var n = 800, buf = new Uint8Array(44 + n), dv = new DataView(buf.buffer), w = function (o, str) { for (var i = 0; i < str.length; i++) buf[o + i] = str.charCodeAt(i); };
      w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
      dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); w(36, 'data'); dv.setUint32(40, n, true);
      for (var i = 44; i < 44 + n; i++) buf[i] = 128;
      var el = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
      el.setAttribute('playsinline', ''); var pr = el.play(); if (pr && pr.catch) pr.catch(function () { unlocked = false; });
    } catch (e) {}
  }

  // share a link: the site's share sheet if there is one, then the device's own, then copy the link
  function share(d, say) {
    say = say || function () {};
    try { if (window.TOLShare && window.TOLShare.share) { window.TOLShare.share(d); return; } } catch (e) {}
    if (navigator.share) { navigator.share(d).catch(function (e) { if (e && e.name !== 'AbortError') copy(); }); return; }
    copy();
    function copy() {
      function done() { say('Link copied! Paste it anywhere to share.'); }
      function fallback() { try { var ta = document.createElement('textarea'); ta.value = d.url; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); document.body.removeChild(ta); if (ok) done(); else say('Copy this link to share: ' + d.url); } catch (e) { say('Copy this link to share: ' + d.url); } }
      try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(d.url).then(done, fallback); else fallback(); } catch (e) { fallback(); }
    }
  }
  function mount(host, opts) {
    opts = opts || {}; var CH = opts.plan ? SECTIONS.map(function (S) { return [S.a, S.name]; }) : CHAPTERS;
    var mem = memGet(), P = { playing: false, pos: 0, sound: true, calm: mem.calm != null ? !!mem.calm : stillChosen(), calmPicked: mem.calm != null, ended: false, raf: 0, errors: 0, frames: [], startedOnce: false, n: 0, q: 1 };
    host.classList.add('fb-player', 'fbmv');
    host.innerHTML =
      '<div class="fbmv-stage"><canvas class="fbmv-cv" role="img" aria-label="The Frequency Buddies music video: Tidbit, Sugarfoot and all their friends sing and dance the theme song on a moving stage"></canvas>' +
      '<div class="fbmv-tap"><button type="button" class="fbmv-tb fbmv-tre" aria-label="Play again from the start" title="From the start">↺</button><button type="button" class="fbmv-tb fbmv-tplay" aria-label="Play">▶</button><button type="button" class="fbmv-tb fbmv-tfull" aria-label="Full screen" title="Full screen">⛶</button></div>' +
      '<div class="fbmv-ov fbmv-start"><div class="fbmv-ovc">' + (opts.startHtml || '<p class="fbmv-k">Music video · 1:32</p><h3>“Frequency Buddies”</h3><p>The theme song, live on stage, with Tidbit, Sugarfoot and every friend from the episodes.</p><button type="button" class="fbmv-b is-main fbmv-go">▶ Play the music video</button><p class="fbmv-small">Turn your sound on for the song. The words show under the picture.</p>') + '</div></div>' +
      '<div class="fbmv-ov fbmv-end" hidden><div class="fbmv-ovc">' + (opts.endHtml || '<p class="fbmv-k">That’s a wrap!</p><h3>Thanks for watching, pals!</h3><div class="fbmv-row"><button type="button" class="fbmv-b is-main fbmv-again">↺ Watch it again</button><button type="button" class="fbmv-b fbmv-share2">🔗 Share</button><a class="fbmv-b" href="/frequency-buddies-music-video-maker.html">🎬 Make your own</a></div>') + '</div></div></div>' +
      '<p class="fbmv-cap" data-who=""><span class="fbmv-who">♪ The words</span><span class="fbmv-line">The words of the song show here, always.</span></p>' +
      '<div class="fbmv-prog"><div class="fbmv-track" role="slider" tabindex="0" aria-label="Where you are in the song" aria-valuemin="0" aria-valuemax="92" aria-valuenow="0" aria-valuetext="0:00 of 1:32"><div class="fbmv-fill"></div></div><span class="fbmv-time">0:00 / 1:32</span></div>' +
      '<div class="fbmv-ctrl">' +
        '<button type="button" class="fbmv-b is-main fbmv-play" aria-label="Play">▶ Play</button>' +
        '<button type="button" class="fbmv-b fbmv-replay" aria-label="Play again from the start" title="From the start (R)">↺<span class="fbmv-lbl"> From the start</span></button>' +
        '<span class="fbmv-sp"></span>' +
        '<button type="button" class="fbmv-b fbmv-calm" aria-pressed="false">🌙<span class="fbmv-lbl"> Calm version</span> <span class="fbmv-st">off</span></button>' +
        '<button type="button" class="fbmv-b fbmv-full" aria-label="Full screen" title="Full screen (F)">⛶<span class="fbmv-lbl"> Full screen</span></button>' +
        (opts.noShare ? '' : '<button type="button" class="fbmv-b fbmv-share" aria-label="Share this music video">🔗<span class="fbmv-lbl"> Share</span></button>') +
      '</div>' +
      (opts.noChapters ? '' : '<div class="fbmv-chaps" role="group" aria-label="Jump to a part of the song"></div>') +
      '<p class="fbmv-now" aria-live="off"></p>' +
      '<p class="fbmv-sr" aria-live="polite"></p>';
    var $ = function (s) { return host.querySelector(s); };
    var cv = $('.fbmv-cv'), g = cv.getContext('2d'), stageEl = $('.fbmv-stage'), capEl = $('.fbmv-cap'), whoEl = $('.fbmv-who'), lineEl = $('.fbmv-line'), fill = $('.fbmv-fill'), track = $('.fbmv-track'), timeEl = $('.fbmv-time');
    var playBtn = $('.fbmv-play'), calmBtn = $('.fbmv-calm'), startOv = $('.fbmv-start'), endOv = $('.fbmv-end'), nowEl = $('.fbmv-now'), live = $('.fbmv-sr'), chapsEl = $('.fbmv-chaps');
    if (chapsEl) CH.forEach(function (c, i) { var b = document.createElement('button'); b.type = 'button'; b.textContent = c[1]; b.setAttribute('data-t', c[0]); b.addEventListener('click', function () { seek(c[0]); if (!P.playing) play(); }); chapsEl.appendChild(b); });
    var chapBtns = chapsEl ? chapsEl.querySelectorAll('button') : [];
    var W = 0, H = 0;
    function resize() {
      var r = stageEl.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1) * (P.q || 1); // P.q: lowered on slow devices
      var w = Math.max(200, Math.round(r.width * dpr)), h = Math.max(112, Math.round(r.height * dpr));
      if (P.rec) { w = 1280; h = Math.round(1280 * r.height / Math.max(1, r.width)); }
      var cap = 1920 * 1080; if (w * h > cap) { var sc = Math.sqrt(cap / (w * h)); w = Math.round(w * sc); h = Math.round(h * sc); }
      if (w !== W || h !== H) { W = w; H = h; cv.width = W; cv.height = H; paint(); }
    }
    // ---------- the song and its clock ----------
    var AU = { ctx: null, ab: {}, buf: {}, srcs: [], gain: null, startAt: 0, decoding: null };
    ['theme-open', 'theme-close'].forEach(function (n) { AU.ab[n] = fetch('/assets/audio/buddies/' + n + '.mp3?v=' + REC).then(function (r) { return r.ok ? r.arrayBuffer() : null; }).catch(function () { return null; }); });
    function ensureCtx() {
      unlockMediaAudio();
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      if (!AU.ctx) { try { AU.ctx = new AC(); AU.gain = AU.ctx.createGain(); AU.gain.gain.value = P.sound ? 1 : 0; AU.gain.connect(AU.ctx.destination); AU.mix = AU.ctx.createGain(); AU.mix.connect(AU.gain); } catch (e) { AU.ctx = null; return null; } }
      if (AU.ctx.state === 'suspended') { try { var pr = AU.ctx.resume(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} }
      return AU.ctx;
    }
    function decodeAll() {
      if (AU.decoding) return AU.decoding;
      var c = AU.ctx; if (!c) return Promise.resolve(false);
      AU.decoding = Promise.all(['theme-open', 'theme-close'].map(function (n) {
        return AU.ab[n].then(function (ab) {
          if (!ab) return null;
          return new Promise(function (ok) { try { var pr = c.decodeAudioData(ab.slice(0), function (b) { ok(b); }, function () { ok(null); }); if (pr && pr.catch) pr.catch(function () { ok(null); }); } catch (e) { ok(null); } });
        }).then(function (b) { AU.buf[n] = b; return b; });
      })).then(function (r) { return !!(r[0] && r[1]); });
      return AU.decoding;
    }
    function audioReady() { return !!(AU.ctx && AU.buf['theme-open'] && AU.buf['theme-close']); }
    function stopAudio() { AU.srcs.forEach(function (s) { try { s.stop(); } catch (e) {} try { s.disconnect(); } catch (e) {} }); AU.srcs = []; }
    function startAudio(pos) {
      stopAudio(); var c = AU.ctx; if (!audioReady()) return false;
      var now = c.currentTime + 0.06; AU.startAt = now - pos;
      [['theme-open', 0], ['theme-close', CLOSE_AT]].forEach(function (p) {
        var b = AU.buf[p[0]], off = pos - p[1]; if (off >= b.duration) return;
        var s = c.createBufferSource(); s.buffer = b; s.connect(AU.mix);
        if (off >= 0) s.start(now, off); else s.start(now - off); AU.srcs.push(s);
      });
      return true;
    }
    var perf0 = 0, useAudio = false;
    function songT() {
      if (!P.playing) return P.pos;
      if (useAudio && AU.ctx) return AU.ctx.currentTime - AU.startAt;
      return performance.now() / 1000 - perf0;
    }
    // ---------- play, pause, seek ----------
    function play() {
      if (P.ended || P.pos >= DUR - 0.05) { P.pos = 0; P.ended = false; }
      startOv.hidden = true; endOv.hidden = true; P.startedOnce = true;
      var c = ensureCtx();
      P.playing = true; sync(); // the picture starts right away; the song joins once it has loaded
      useAudio = false; perf0 = performance.now() / 1000 - P.pos;
      var token = P.token = (P.token || 0) + 1;
      if (c) {
        var wait = setTimeout(function () { if (token === P.token && !useAudio) live.textContent = 'The song is still loading. The pictures and the words are playing.'; }, 2500);
        decodeAll().then(function (ok) {
          clearTimeout(wait);
          if (!ok || token !== P.token || !P.playing) return;
          var at = songT(); if (startAudio(at)) useAudio = true;
        });
      }
      loop();
    }
    function pause() { if (!P.playing) return; P.pos = clamp(songT(), 0, DUR); P.playing = false; P.token++; stopAudio(); useAudio = false; sync(); paint(); }
    function toggle() { if (P.playing) pause(); else play(); }
    function seek(tt) {
      tt = clamp(tt, 0, DUR - 0.1); P.ended = false; endOv.hidden = true; startOv.hidden = true; P.startedOnce = true;
      if (P.playing) { P.pos = tt; perf0 = performance.now() / 1000 - tt; if (useAudio) startAudio(tt); } else { P.pos = tt; paint(); }
      progress(tt);
    }
    function finish() { if (P.rec) recStop(); P.playing = false; P.pos = DUR; P.ended = true; P.token++; stopAudio(); useAudio = false; endOv.hidden = false; sync(); paint(); live.textContent = 'The music video has ended. Watch it again, or pick an episode.'; }
    // ---------- drawing ----------
    var lastLy = null, lastNow = '', lastFrame = 0;
    function paint() {
      if (!W) return;
      var tt = clamp(songT(), 0, DUR), pic = !P.startedOnce && !P.playing && tt === 0 ? 36.4 : tt; // before the first play: a poster frame from the chorus
      try { SHOW.draw(g, pic, W, H, { calm: P.calm, plan: opts.plan ? opts.plan() : null, burn: !!P.rec }); } catch (e) { P.errors++; if (window.console) console.error('music video', e); }
      progress(tt); caption(tt);
    }
    function loop() {
      cancelAnimationFrame(P.raf);
      var step = function (now) {
        if (!P.playing) return;
        if (lastFrame) { P.frames.push(now - lastFrame); if (P.frames.length > 240) P.frames.shift(); }
        if (++P.n % 90 === 0 && P.frames.length >= 60 && (P.q || 1) > 0.76) { // a slow device: fewer pixels, the same show
          var rec = P.frames.slice(-60), avg = rec.reduce(function (a, b) { return a + b; }, 0) / rec.length;
          if (avg > 40) { P.q = (P.q || 1) * 0.87; resize(); }
        }
        lastFrame = now;
        var tt = songT(); if (tt >= DUR) { finish(); return; }
        paint(); P.raf = requestAnimationFrame(step);
      };
      lastFrame = 0; P.raf = requestAnimationFrame(step);
    }
    function caption(tt) {
      var ly = lyricAt(tt), key = ly ? ly[0] : (tt < 4.07 ? 'intro' : tt >= DUR - 0.2 ? 'end' : 'music');
      if (key !== lastLy) {
        lastLy = key;
        if (ly) { capEl.setAttribute('data-who', ly[1]); whoEl.textContent = '♪ ' + (ly[1] === 'tidbit' ? 'Tidbit' : ly[1] === 'sugarfoot' ? 'Sugarfoot' : 'Everyone'); lineEl.textContent = ly[2]; capEl.classList.remove('is-music'); }
        else { capEl.setAttribute('data-who', ''); whoEl.textContent = key === 'intro' ? '♪ The curtain goes up' : '♪ Music'; lineEl.textContent = key === 'intro' ? 'The stage rises, the lights come on…' : '♪ ♪ ♪'; capEl.classList.add('is-music'); }
      }
      var ci = 0; CH.forEach(function (c, i) { if (tt >= c[0]) ci = i; });
      var f = fitAt(tt), nowTxt = opts.plan ? CH[ci][1] : CH[ci][1] + ' · wearing: ' + f.name.toLowerCase();
      if (opts.onSection && ci !== P.lastCi) { P.lastCi = ci; opts.onSection(ci); }
      if (nowTxt !== lastNow) { lastNow = nowTxt; nowEl.textContent = 'Now: ' + nowTxt; Array.prototype.forEach.call(chapBtns, function (b, i) { b.setAttribute('aria-current', i === ci ? 'true' : 'false'); }); }
    }
    function progress(tt) {
      fill.style.width = (100 * clamp(tt / DUR, 0, 1)).toFixed(2) + '%'; var s = fmt(tt) + ' / ' + fmt(DUR);
      if (timeEl.textContent !== s) { timeEl.textContent = s; track.setAttribute('aria-valuenow', String(Math.round(tt))); track.setAttribute('aria-valuetext', fmt(tt) + ' of ' + fmt(DUR)); }
    }
    function sync() {
      playBtn.textContent = P.playing ? '❚❚ Pause' : '▶ Play'; playBtn.setAttribute('aria-label', P.playing ? 'Pause' : 'Play');
      var tp = $('.fbmv-tplay'); tp.textContent = P.playing ? '❚❚' : '▶'; tp.setAttribute('aria-label', P.playing ? 'Pause' : 'Play');
      calmBtn.setAttribute('aria-pressed', String(P.calm)); calmBtn.querySelector('.fbmv-st').textContent = P.calm ? 'on' : 'off'; calmBtn.setAttribute('aria-label', P.calm ? 'The calm version is on: softer, slower lights and smaller moves. Turn it off' : 'The calm version is off. Turn it on for softer, slower lights and smaller moves');
      host.classList.toggle('is-playing', !!P.playing); // site.js keeps the screen awake and pop-ups away while this is on
      document.documentElement.classList.toggle('fb-watching', !!P.playing);
      wake(!P.playing);
    }
    // ---------- the buttons ----------
    playBtn.addEventListener('click', toggle);
    Array.prototype.forEach.call(host.querySelectorAll('.fbmv-go'), function (b) { b.addEventListener('click', function () { play(); wake(); }); });
    Array.prototype.forEach.call(host.querySelectorAll('.fbmv-again'), function (b) { b.addEventListener('click', function () { seek(0); play(); }); });
    $('.fbmv-replay').addEventListener('click', function () { seek(0); if (!P.playing) play(); });
    calmBtn.addEventListener('click', function () { P.calm = !P.calm; P.calmPicked = true; var m = memGet(); m.calm = P.calm; memSet(m); sync(); paint(); });
    document.addEventListener('tol-still', function () { if (!P.calmPicked) { P.calm = stillChosen(); sync(); paint(); } });
    $('.fbmv-full').addEventListener('click', function () {
      var fs = document.fullscreenElement || document.webkitFullscreenElement;
      if (fs) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      if (host.classList.contains('is-full')) { host.classList.remove('is-full'); document.documentElement.style.overflow = ''; setTimeout(resize, 50); return; }
      var rq = host.requestFullscreen || host.webkitRequestFullscreen;
      if (rq) { try { var pr = rq.call(host); if (pr && pr.catch) pr.catch(function () { host.classList.add('is-full'); setTimeout(resize, 50); }); } catch (e) { host.classList.add('is-full'); } }
      else { host.classList.add('is-full'); document.documentElement.style.overflow = 'hidden'; }
      setTimeout(resize, 80);
    });
    ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) { document.addEventListener(ev, function () { setTimeout(resize, 60); }); });
    function seekFromPointer(e) { var r = track.getBoundingClientRect(), p = clamp((e.clientX - r.left) / r.width, 0, 1); seek(p * DUR); if (!P.playing && P.startedOnce) paint(); }
    track.addEventListener('click', seekFromPointer);
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); seek(songT() + (e.key === 'ArrowLeft' ? -5 : 5)); }
      else if (e.key === 'Home') { e.preventDefault(); seek(0); } else if (e.key === 'End') { e.preventDefault(); seek(DUR - 1); }
    });
    // the controls on the picture fade while it plays, and come back with a tap or a move
    var idleT = 0;
    function wake(hold) {
      host.classList.remove('is-idle'); clearTimeout(idleT);
      if (!hold && P.playing) idleT = setTimeout(function () {
        var a = document.activeElement, kb = false; try { kb = !!(a && host.contains(a) && a.matches(':focus-visible') && a.closest('.fbmv-tap, .fbmv-ctrl, .fbmv-prog')); } catch (e) {}
        if (P.playing && !kb) host.classList.add('is-idle');
      }, 2600);
    }
    var lastTouch = 0;
    stageEl.addEventListener('touchstart', function () { lastTouch = Date.now(); }, { passive: true });
    cv.addEventListener('click', function () { if (Date.now() - lastTouch < 800 && host.classList.contains('is-idle')) { wake(); return; } toggle(); wake(); });
    stageEl.addEventListener('mousemove', function () { wake(); });
    $('.fbmv-tplay').addEventListener('click', function () { toggle(); wake(); });
    $('.fbmv-tre').addEventListener('click', function () { seek(0); if (!P.playing) play(); wake(); });
    $('.fbmv-tfull').addEventListener('click', function () { $('.fbmv-full').click(); wake(); });
    ['.fbmv-ctrl', '.fbmv-prog'].forEach(function (s) { var n = $(s); n.addEventListener('pointerdown', function () { wake(); }); n.addEventListener('focusin', function () { wake(); }); });
    document.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      var tg = e.target, tag = tg && tg.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (tg && tg.isContentEditable)) return;
      if ((tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY') && (e.key === ' ' || e.key === 'Enter')) return;
      if (document.querySelector('.tol-menu-panel.is-open')) return;
      var hr = host.getBoundingClientRect(), vh = window.innerHeight || 1, seen = Math.max(0, Math.min(hr.bottom, vh) - Math.max(hr.top, 0)) / Math.max(1, Math.min(hr.height, vh));
      if (!host.contains(document.activeElement) && !document.fullscreenElement && seen < 0.6) return;
      if (e.key === ' ' || e.key === 'k' || e.key === 'K') { e.preventDefault(); toggle(); wake(); }
      else if (e.key === 'f' || e.key === 'F') $('.fbmv-full').click();
      else if (e.key === 'r' || e.key === 'R') { seek(0); if (!P.playing) play(); }
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden && P.playing && !P.rec) pause(); });
    if (window.ResizeObserver) new ResizeObserver(function () { resize(); }).observe(stageEl); else window.addEventListener('resize', resize);
    resize(); sync();
    // the first picture: the theater, waiting
    P.pos = 0; paint();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!P.playing) paint(); });
    var t0 = /[?&]t=([\d.]+)/.exec(location.search); if (t0) { P.pos = clamp(+t0[1], 0, DUR); startOv.hidden = true; paint(); }
    // ---------- share ----------
    function doShare() {
      var d = opts.shareData ? opts.shareData() : { title: 'Frequency Buddies: the theme song music video', text: 'Watch the Frequency Buddies theme song music video!', url: location.origin + location.pathname };
      share(d, function (msg) { live.textContent = msg; flash(msg); });
    }
    function flash(msg) { var el = host.querySelector('.fbmv-toast'); if (!el) { el = document.createElement('p'); el.className = 'fbmv-toast'; el.setAttribute('role', 'status'); host.appendChild(el); } el.textContent = msg; el.classList.add('is-on'); clearTimeout(el.__t); el.__t = setTimeout(function () { el.classList.remove('is-on'); }, 2600); }
    Array.prototype.forEach.call(host.querySelectorAll('.fbmv-share, .fbmv-share2'), function (b) { b.addEventListener('click', doShare); });
    // ---------- save as a video: the picture and the song, recorded in this browser ----------
    function recSupported() { return !!(window.MediaRecorder && cv.captureStream && (window.AudioContext || window.webkitAudioContext) && typeof window.MediaStreamAudioDestinationNode !== 'undefined'); }
    function recMime() { var t = ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']; for (var i = 0; i < t.length; i++) if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t[i])) return t[i]; return ''; }
    function record(cb) {
      if (!recSupported()) { cb({ error: 'unsupported' }); return; }
      var c = ensureCtx(); if (!c) { cb({ error: 'unsupported' }); return; }
      decodeAll().then(function (ok) {
        if (!ok) { cb({ error: 'nosong' }); return; }
        try {
          pause(); P.rec = { cb: cb, chunks: [] }; W = 0; resize();
          var dest = c.createMediaStreamDestination(); AU.mix.connect(dest); P.rec.dest = dest;
          var ms = new MediaStream(cv.captureStream(30).getVideoTracks().concat(dest.stream.getAudioTracks())), mime = recMime();
          var mr = new MediaRecorder(ms, mime ? { mimeType: mime, videoBitsPerSecond: 3500000 } : {}); P.rec.mr = mr; P.rec.mime = mr.mimeType || mime || 'video/webm';
          mr.ondataavailable = function (e) { if (e.data && e.data.size) P.rec.chunks.push(e.data); };
          mr.onstop = function () { var r = P.rec; P.rec = null; W = 0; resize(); try { AU.mix.disconnect(r.dest); } catch (e) {} var blob = new Blob(r.chunks, { type: r.mime.split(';')[0] }); r.cb({ blob: blob, url: URL.createObjectURL(blob), ext: /mp4/.test(r.mime) ? 'mp4' : 'webm', cancelled: r.cancelled }); };
          mr.start(500); seek(0); play();
        } catch (e) { P.rec = null; W = 0; resize(); cb({ error: 'failed' }); }
      });
    }
    function recStop(cancel) { if (!P.rec || !P.rec.mr) return; P.rec.cancelled = !!cancel; try { if (P.rec.mr.state !== 'inactive') P.rec.mr.stop(); } catch (e) {} }
    window.TOLMusicVideo.player = { refresh: function () { if (!P.playing) paint(); }, record: record, recStop: recStop, recSupported: recSupported, recording: function () { return !!P.rec; }, share: doShare, flash: flash, showStart: function () { startOv.hidden = false; },  play: play, pause: pause, seek: seek, state: function () { return { t: songT(), playing: P.playing, ended: P.ended, calm: P.calm, sound: P.sound, audio: useAudio, errors: P.errors, frames: P.frames.slice(), q: P.q, px: [W, H] }; } };
  }
  window.TOLMusicVideo.mount = mount; window.TOLMusicVideo.share = share;
  function auto() { var el = document.querySelector('[data-music-video]'); if (el && !el.__mv) { el.__mv = 1; mount(el); } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})();
