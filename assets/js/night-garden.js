/* night-garden.js — The Night Garden (/night-garden.html)

   A calm garden at night with three gentle activities:
     Breathe   — a light swells for 4 seconds and softens for 6 (about six breaths a
                 minute); each full breath blooms a flower and lets a lantern rise.
     Fireflies — guide fireflies to faint points until a constellation lights up.
     Lily pond — a slow, forgiving falling-shapes puzzle. No timer, no losing: if the
                 pond fills, it simply settles and starts fresh.
   The garden remembers flowers, lilies and constellations in this browser only
   (localStorage). The moon follows the real moon; the season follows the calendar.
   Nothing is sent anywhere. Sound is off until the visitor turns it on. */
(function () {
  'use strict';

  var stage = document.getElementById('ng-stage'), canvas = document.getElementById('ng-canvas');
  if (!stage || !canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var sayEl = document.getElementById('ng-say'), countEl = document.getElementById('ng-count');
  var padEl = document.getElementById('ng-pad');
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Saved garden (this browser only) ----------
  var KEY = 'tol-night-garden-v1';
  var save = { flowers: [], lilies: 0, consts: [], days: [], breaths: 0, sound: false };
  try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); for (var k in o) save[k] = o[k]; } } catch (e) {}
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }
  var today = new Date(); var todayKey = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
  // ---------- Season and moon ----------
  var month = today.getMonth(); // 0-11
  var SEASON = month >= 2 && month <= 4 ? 'spring' : month >= 5 && month <= 7 ? 'summer' : month >= 8 && month <= 10 ? 'autumn' : 'winter';
  var HUES = { spring: [330, 350, 290, 50, 200], summer: [20, 45, 340, 280, 190], autumn: [25, 35, 10, 45, 330], winter: [230, 260, 290, 200, 320] }[SEASON];
  var moonPhase = (function () { // 0 = new, 0.5 = full
    var ref = Date.UTC(2000, 0, 6, 18, 14), syn = 29.530588853;
    var d = (Date.now() - ref) / 864e5; return ((d % syn) + syn) % syn / syn;
  })();

  var returning = save.days.length > 0, gifted = 0;
  if (!returning && !save.flowers.length) { for (var s0 = 0; s0 < 7; s0++) addFlower(true); } // a few blooms to welcome a first visit
  if (save.days.indexOf(todayKey) === -1) {
    // A new day: a few buds open on their own. Missing days never costs anything.
    if (returning) { gifted = Math.min(3, 1 + Math.floor(Math.random() * 3)); for (var g = 0; g < gifted; g++) addFlower(true); }
    save.days.push(todayKey); if (save.days.length > 400) save.days = save.days.slice(-400); persist();
  }

  // ---------- Sizing ----------
  var W = 0, H = 0, DPR = 1, bg = null;
  function resize() {
    var r = stage.getBoundingClientRect(); W = Math.max(320, r.width); H = Math.max(420, r.height);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawBackground(); layoutPond();
  }

  // Seeded randomness so stars and hills stay put between visits
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  var stars = (function () { var r = rng(42), a = []; for (var i = 0; i < 170; i++) a.push({ x: r(), y: r() * 0.58, s: 0.4 + r() * 1.3, p: r() * 6.28 }); return a; })();

  function drawBackground() {
    bg = document.createElement('canvas'); bg.width = canvas.width; bg.height = canvas.height;
    var b = bg.getContext('2d'); b.setTransform(DPR, 0, 0, DPR, 0, 0);
    var sky = b.createLinearGradient(0, 0, 0, H * 0.7);
    sky.addColorStop(0, '#171A34'); sky.addColorStop(0.45, '#2E2F5C'); sky.addColorStop(0.8, '#5C4A78'); sky.addColorStop(1, '#C98E8E');
    b.fillStyle = sky; b.fillRect(0, 0, W, H);
    // soft watercolour clouds
    var cr = rng(7);
    for (var i = 0; i < 7; i++) {
      var cx = cr() * W, cy = H * (0.1 + cr() * 0.4), rad = Math.max(W, H) * (0.12 + cr() * 0.15);
      var cg = b.createRadialGradient(cx, cy, 0, cx, cy, rad);
      cg.addColorStop(0, 'rgba(185,160,224,0.10)'); cg.addColorStop(1, 'rgba(185,160,224,0)');
      b.fillStyle = cg; b.fillRect(0, 0, W, H);
    }
    // hills, far to near
    var hills = [['#3D3A66', 0.57, 0.035, 1.3], ['#34395E', 0.61, 0.045, 2.1], ['#2C3A52', 0.655, 0.03, 3.4]];
    hills.forEach(function (h, n) {
      b.fillStyle = h[0]; b.beginPath(); b.moveTo(0, H);
      for (var x = 0; x <= W + 10; x += 10) b.lineTo(x, H * h[1] + Math.sin(x / W * Math.PI * h[3] + n) * H * h[2] + Math.sin(x / W * 11 + n * 2) * H * 0.006);
      b.lineTo(W, H); b.closePath(); b.fill();
    });
    // meadow
    var m = b.createLinearGradient(0, H * 0.64, 0, H);
    var meadow = { spring: ['#2E4A4A', '#223834'], summer: ['#2F4A3E', '#22362C'], autumn: ['#3E4256', '#2A2D40'], winter: ['#34405A', '#262E44'] }[SEASON];
    m.addColorStop(0, meadow[0]); m.addColorStop(1, meadow[1]);
    b.fillStyle = m; b.beginPath(); b.moveTo(0, H);
    for (var x2 = 0; x2 <= W + 10; x2 += 10) b.lineTo(x2, H * 0.675 + Math.sin(x2 / W * 5.2) * H * 0.012);
    b.lineTo(W, H); b.closePath(); b.fill();
    // pond
    var p = pondShape();
    var pg = b.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.rx);
    pg.addColorStop(0, '#46578A'); pg.addColorStop(0.7, '#2F3B66'); pg.addColorStop(1, '#27304F');
    b.fillStyle = pg; b.beginPath(); b.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2); b.fill();
    b.strokeStyle = 'rgba(200,210,255,0.12)'; b.lineWidth = 2; b.stroke();
  }
  function pondShape() { return { x: W * 0.5, y: H * 0.875, rx: Math.min(W * 0.26, 360), ry: H * 0.065 }; }

  // ---------- Garden flowers ----------
  function addFlower(quiet) {
    var r = Math.random, tries = 0, x, y;
    do { x = 0.03 + r() * 0.94; y = 0.7 + r() * 0.27; tries++; } while (inPond(x, y) && tries < 30);
    var f = { x: +x.toFixed(4), y: +y.toFixed(4), h: HUES[Math.floor(r() * HUES.length)] + Math.round((r() - 0.5) * 14), n: 5 + Math.floor(r() * 3), s: +(0.8 + r() * 0.5).toFixed(2), t: Date.now() };
    save.flowers.push(f); sorted = null;
    if (save.flowers.length > 160) save.flowers.shift();
    if (!quiet) { f.born = performance.now(); persist(); }
    return f;
  }
  function inPond(nx, ny) {
    var dx = (nx - 0.5) / 0.3, dy = (ny - 0.875) / 0.09; return dx * dx + dy * dy < 1;
  }
  // Grown flowers are drawn once into a small image and reused every frame; only
  // flowers still opening are drawn from scratch.
  var sprites = typeof WeakMap === 'function' ? new WeakMap() : null, sorted = null;
  function flowerSize(f) { var depth = 0.55 + (f.y - 0.7) * 2.2; return 7 * f.s * depth * Math.min(1.4, W / 700 + 0.5); }
  function flowerSprite(f) {
    var sp = sprites && sprites.get(f);
    if (sp && sp.W === W) return sp;
    var size = flowerSize(f), half = Math.ceil(size * 3.3 + 2), top = Math.ceil(size * 3.2 + size * 3.3 + 2), bot = Math.ceil(size * 0.3 + 2);
    var c = document.createElement('canvas'); c.width = Math.ceil(half * 2 * DPR); c.height = Math.ceil((top + bot) * DPR);
    var g = c.getContext('2d'); g.setTransform(DPR, 0, 0, DPR, half * DPR, top * DPR);
    paintFlower(g, f, size, 1);
    sp = { c: c, half: half, top: top, w: half * 2, h: top + bot, W: W };
    if (sprites) sprites.set(f, sp);
    return sp;
  }
  function drawFlower(f, t) {
    var x = f.x * W, y = f.y * H, size = flowerSize(f);
    var grow = f.born ? Math.max(0.05, Math.min(1, (t - f.born) / 1800)) : 1;
    var sway = REDUCED ? 0 : Math.sin(t / 1600 + f.x * 20) * 0.08;
    ctx.save(); ctx.translate(x, y); ctx.rotate(sway);
    if (grow >= 1 && sprites) { var sp = flowerSprite(f); ctx.drawImage(sp.c, -sp.half, -sp.top, sp.w, sp.h); }
    else paintFlower(ctx, f, size, grow);
    ctx.restore();
  }
  function paintFlower(ctx, f, size, grow) {
    var stem = size * 3.2;
    ctx.save();
    ctx.strokeStyle = 'rgba(120,170,140,0.75)'; ctx.lineWidth = Math.max(1, size * 0.18);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(size * 0.3, -stem * 0.5, 0, -stem * grow); ctx.stroke();
    ctx.fillStyle = 'rgba(120,170,140,0.6)';
    ctx.beginPath(); ctx.ellipse(size * 0.5, -stem * 0.35, size * 0.55, size * 0.22, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.translate(0, -stem * grow);
    var r = size * grow;
    // glow
    var gl = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 3.2);
    gl.addColorStop(0, 'hsla(' + f.h + ',80%,80%,0.28)'); gl.addColorStop(1, 'hsla(' + f.h + ',80%,80%,0)');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, r * 3.2, 0, Math.PI * 2); ctx.fill();
    for (var i = 0; i < f.n; i++) {
      ctx.rotate(Math.PI * 2 / f.n);
      var pg = ctx.createRadialGradient(0, -r * 0.6, 0, 0, -r * 0.6, r);
      pg.addColorStop(0, 'hsla(' + f.h + ',85%,92%,0.95)'); pg.addColorStop(1, 'hsla(' + f.h + ',60%,72%,0.85)');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(0, -r * 0.62, r * 0.42, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'hsl(' + ((f.h + 40) % 360) + ',80%,78%)'; ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ---------- Moon, stars, lanterns, fireflies ----------
  function drawSky(t) {
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], a = REDUCED ? 0.6 : 0.45 + 0.35 * Math.sin(t / 1400 + s.p);
      ctx.fillStyle = 'rgba(255,248,230,' + a.toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.s, 0, Math.PI * 2); ctx.fill();
    }
    // constellations earned on earlier visits, faintly
    save.consts.forEach(function (id, n) {
      var shape = SHAPES[id]; if (!shape) return;
      var cx = W * (0.12 + (n % 5) * 0.18), cy = H * (0.12 + Math.floor(n / 5) * 0.12), sz = Math.min(W, H) * 0.06;
      ctx.strokeStyle = 'rgba(255,240,210,0.16)'; ctx.lineWidth = 1; ctx.beginPath();
      shape.pts.forEach(function (p, j) { var px = cx + (p[0] - 0.5) * sz, py = cy + (p[1] - 0.5) * sz; if (j) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
      if (shape.closed) ctx.closePath(); ctx.stroke();
      shape.pts.forEach(function (p) { ctx.fillStyle = 'rgba(255,240,210,0.5)'; ctx.beginPath(); ctx.arc(cx + (p[0] - 0.5) * sz, cy + (p[1] - 0.5) * sz, 1.3, 0, Math.PI * 2); ctx.fill(); });
      var who = save.dedic && save.dedic[id];
      if (who) { ctx.fillStyle = 'rgba(255,240,210,0.45)'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = 'italic 10px Lora, Georgia, serif'; ctx.fillText(who, cx, cy + sz * 0.6); }
    });
    // moon with its real phase
    var mx = W * 0.84, my = H * 0.15, mr = Math.min(W, H) * 0.045;
    var halo = ctx.createRadialGradient(mx, my, mr, mx, my, mr * 4);
    halo.addColorStop(0, 'rgba(255,240,210,0.22)'); halo.addColorStop(1, 'rgba(255,240,210,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(mx, my, mr * 4, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#FFF3D6'; ctx.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
    var lit = moonPhase <= 0.5 ? moonPhase * 2 : (1 - moonPhase) * 2; // 0 new .. 1 full
    var waxing = moonPhase < 0.5;
    ctx.fillStyle = 'rgba(40,44,80,0.88)';
    ctx.beginPath(); ctx.ellipse(mx + (waxing ? -1 : 1) * mr * lit * 2, my, mr * 1.02, mr * 1.02, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  var lanterns = [];
  function addLantern(x) { lanterns.push({ x: x != null ? x : W * (0.3 + Math.random() * 0.4), y: H * 0.72, vy: 0.25 + Math.random() * 0.2, ph: Math.random() * 6, life: 1 }); }
  function drawLanterns(t, dt) {
    for (var i = lanterns.length - 1; i >= 0; i--) {
      var L = lanterns[i]; L.y -= L.vy * dt * (REDUCED ? 0.03 : 0.06); L.life = Math.min(1, (L.y - H * 0.05) / (H * 0.3));
      if (L.y < H * 0.05) { lanterns.splice(i, 1); continue; }
      var x = L.x + (REDUCED ? 0 : Math.sin(t / 1200 + L.ph) * 8), a = Math.max(0, L.life);
      var g = ctx.createRadialGradient(x, L.y, 0, x, L.y, 26); g.addColorStop(0, 'rgba(255,200,130,' + (0.55 * a) + ')'); g.addColorStop(1, 'rgba(255,200,130,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, L.y, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,214,150,' + (0.95 * a) + ')'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 5, L.y - 7, 10, 13, 3) : ctx.rect(x - 5, L.y - 7, 10, 13); ctx.fill();
    }
  }

  var flies = [];
  for (var fi = 0; fi < (REDUCED ? 14 : 26); fi++) flies.push({ x: Math.random(), y: 0.45 + Math.random() * 0.45, vx: 0, vy: 0, ph: Math.random() * 6, home: null });
  var wand = { x: -1, y: -1, active: false };
  function drawFlies(t, dt) {
    flies.forEach(function (f) {
      var tx, ty, speed = REDUCED ? 0.00004 : 0.00008;
      if (f.home) { tx = f.home.x / W; ty = f.home.y / H; speed = 0.004; }
      else if (mode === 'fireflies' && wand.active) { tx = wand.x / W + Math.sin(t / 900 + f.ph) * 0.05; ty = wand.y / H + Math.cos(t / 1100 + f.ph) * 0.05; speed = 0.0009; }
      else { tx = f.x + Math.sin(t / 3000 + f.ph) * 0.02; ty = f.y + Math.cos(t / 3400 + f.ph * 2) * 0.02; }
      f.x += (tx - f.x) * Math.min(1, speed * dt * 10); f.y += (ty - f.y) * Math.min(1, speed * dt * 10);
      f.x = Math.max(0.01, Math.min(0.99, f.x)); f.y = Math.max(0.05, Math.min(0.97, f.y));
      var blink = f.home ? 1 : REDUCED ? 0.7 : 0.35 + 0.65 * Math.max(0, Math.sin(t / 700 + f.ph * 3));
      var x = f.x * W, y = f.y * H;
      var g = ctx.createRadialGradient(x, y, 0, x, y, 12); g.addColorStop(0, 'rgba(230,255,170,' + (0.8 * blink) + ')'); g.addColorStop(1, 'rgba(230,255,170,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(250,255,220,' + blink + ')'; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
    });
  }

  // ---------- Sound (off until turned on) ----------
  var audio = null;
  var NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];
  // iPhones treat web sound as "ambient" and mute it with the silent switch. Asking for
  // media playback (and briefly playing a silent clip) lets the garden be heard.
  function unlockMediaAudio() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    try {
      var n = 800, buf = new Uint8Array(44 + n), dv = new DataView(buf.buffer), w = function (o, str) { for (var i = 0; i < str.length; i++) buf[o + i] = str.charCodeAt(i); };
      w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
      dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); w(36, 'data'); dv.setUint32(40, n, true);
      for (var i = 44; i < 44 + n; i++) buf[i] = 128;
      var el = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
      el.setAttribute('playsinline', ''); var pr = el.play(); if (pr && pr.catch) pr.catch(function () {});
    } catch (e) {}
  }
  var LEVEL = 0.55;
  function startAudio() {
    unlockMediaAudio();
    if (audio) { audio.ctx.resume(); audio.master.gain.setTargetAtTime(LEVEL, audio.ctx.currentTime, 0.8); return; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    var ac = new AC(), master = ac.createGain(); master.gain.value = 0;
    var comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    master.connect(comp); comp.connect(ac.destination);
    // a soft echo for the chimes
    // a warm hall: a generated stereo impulse that fades over four seconds
    var verb = ac.createConvolver(), irLen = Math.floor(ac.sampleRate * 4), ir = ac.createBuffer(2, irLen, ac.sampleRate);
    for (var ch = 0; ch < 2; ch++) { var dd = ir.getChannelData(ch); for (var k = 0; k < irLen; k++) dd[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / irLen, 3.2); }
    verb.buffer = ir; var wet = ac.createGain(); wet.gain.value = 0.5; verb.connect(wet); wet.connect(master);
    // a deep, warm bed in the style of The Breath Beneath: low C and G drones (with the octaves
    // above them, so phone speakers carry them too), a slow heartbeat pulse every two seconds,
    // and soft notes from the same five-note scale blooming now and then
    var pad = ac.createGain(); pad.gain.value = 0.1; var pf = ac.createBiquadFilter(); pf.type = 'lowpass'; pf.frequency.value = 1200;
    pad.connect(pf); pf.connect(master); pf.connect(verb);
    [[65.41, .26], [98, .18], [130.81, .38], [196, .34], [261.63, .42], [329.63, .3], [392, .22]].forEach(function (v, i) {
      [-1, 1].forEach(function (side) {
        var o = ac.createOscillator(); o.type = i < 2 ? 'sine' : 'triangle'; o.frequency.value = v[0]; o.detune.value = side * (3 + i * 2);
        var g = ac.createGain(); g.gain.value = v[1] * 0.5; o.connect(g);
        if (ac.createStereoPanner) { var pn = ac.createStereoPanner(); pn.pan.value = side * (0.2 + i * 0.1); g.connect(pn); pn.connect(pad); } else g.connect(pad);
        o.start();
      });
    });
    var pulse = ac.createOscillator(), pulseG = ac.createGain(); pulse.frequency.value = 1 / 2.05; pulseG.gain.value = 0.035; pulse.connect(pulseG); pulseG.connect(pad.gain); pulse.start();
    var lfo = ac.createOscillator(), lfoG = ac.createGain(); lfo.frequency.value = 0.03; lfoG.gain.value = 300; lfo.connect(lfoG); lfoG.connect(pf.frequency); lfo.start();
    var PENTA = [261.63, 293.66, 329.63, 392, 440];
    setInterval(function () {
      if (!save.sound || document.hidden) return;
      var t = ac.currentTime, f = PENTA[Math.floor(Math.random() * 5)] * (Math.random() < 0.3 ? 2 : 1), len = 7 + Math.random() * 4;
      var o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
      o.frequency.value = f; o2.type = 'triangle'; o2.frequency.value = f; o2.detune.value = 7; lp.type = 'lowpass'; lp.frequency.value = 1400;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07, t + len * 0.4); g.gain.linearRampToValueAtTime(0, t + len);
      o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master); g.connect(verb); o.start(t); o2.start(t); o.stop(t + len + 0.1); o2.stop(t + len + 0.1);
    }, 5600);
    // the night air: gentle filtered noise that rises and falls like a breeze
    var len = ac.sampleRate * 3, nb = ac.createBuffer(1, len, ac.sampleRate), d = nb.getChannelData(0), last = 0;
    for (var i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    var air = ac.createBufferSource(); air.buffer = nb; air.loop = true;
    var af = ac.createBiquadFilter(); af.type = 'bandpass'; af.frequency.value = 900; af.Q.value = 0.6;
    var ag = ac.createGain(); ag.gain.value = 0.05;
    var alfo = ac.createOscillator(), alfoG = ac.createGain(); alfo.frequency.value = 0.08; alfoG.gain.value = 0.03; alfo.connect(alfoG); alfoG.connect(ag.gain); alfo.start();
    air.connect(af); af.connect(ag); ag.connect(master); air.start();
    audio = { ctx: ac, master: master, verb: verb, pad: pad };
    if (ac.state !== 'running' && ac.resume) ac.resume();
    master.gain.setTargetAtTime(LEVEL, ac.currentTime, 0.8);
  }
  function stopAudio() { if (audio) audio.master.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.4); }
  function chime(i, vol) {
    if (!audio || !save.sound) return;
    var ac = audio.ctx, t = ac.currentTime, f = NOTES[((i % NOTES.length) + NOTES.length) % NOTES.length];
    var o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = f; o2.frequency.value = f * 2; o2.detune.value = 6;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime((vol || 0.12) * 1.8, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0008, t + 2.6);
    var g2 = ac.createGain(); g2.gain.value = 0.25; o2.connect(g2); g2.connect(g);
    o.connect(g); g.connect(audio.master); g.connect(audio.verb); o.start(t); o2.start(t); o.stop(t + 2.8); o2.stop(t + 2.8);
  }
  // a soft wooden plink, for a lily pad settling
  function plink() {
    if (!audio || !save.sound) return;
    var ac = audio.ctx, t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(700, t); o.frequency.exponentialRampToValueAtTime(420, t + 0.12);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.35);
    o.connect(g); g.connect(audio.master); o.start(t); o.stop(t + 0.4);
  }
  // the pad swells as you breathe in and settles as you breathe out, with a soft cue at each turn
  function padSwell(ph) {
    if (!audio || !save.sound) return;
    var level = ph === 'in' || ph === 'top' ? 1 : 0;
    audio.pad.gain.setTargetAtTime(0.06 + level * 0.1, audio.ctx.currentTime, level ? 1.2 : 1.8);
    chime({ in: 0, top: 2, out: 4, bottom: 3 }[ph] || 0, ph === 'in' || ph === 'out' ? 0.05 : 0.03);
  }

  // ---------- Modes ----------
  var mode = null, sayTimer = null;
  function say(text, sub, ms) {
    sayEl.innerHTML = text ? text + (sub ? '<small>' + sub + '</small>' : '') : '';
    sayEl.style.opacity = text ? 1 : 0;
    clearTimeout(sayTimer); if (ms) sayTimer = setTimeout(function () { sayEl.style.opacity = 0; }, ms);
  }
  var HELP = {
    breathe: { ico: '&#127800;', h: 'Box breathing in the garden', steps: [
      'Watch the glowing light. A little star travels around a square, one side for each step.',
      'Up the left side, <strong>breathe in</strong> for 4. Along the top, <strong>hold</strong> for 4.',
      'Down the right side, <strong>breathe out</strong> for 4. Along the bottom, <strong>hold</strong> for 4.',
      'Words drift down from the sky to tell you what the breathing is doing for you. Each full square plants a flower, and the animals by the pond hop along with you.'] },
    fireflies: { ico: '&#10024;', h: 'How to play Fireflies', steps: [
      'A faint picture appears in the sky, made of numbered circles.',
      'Drag your finger (or move your mouse) to circle <strong>1</strong> and rest there. A firefly lights it, and it sings a note.',
      'Go to the next number, and the next. Each one joins the line and sings the next note of a little tune.',
      'Finish the picture to hear its whole song and learn what it means. There are ten to collect, and you can dedicate each new one to someone you love.',
      'Now and then a <strong>shooting star</strong> crosses the sky. Catch it for a wish and a new flower.'],
      keys: 'On a keyboard, the arrow keys move your light.' },
    pond: { ico: '&#128167;', h: 'How to play the lily pond', steps: [
      'Lily pads drift slowly down the pond. The faint outline shows where they’ll land.',
      'Move them with <strong>&#9664; &#9654;</strong>, turn them with <strong>&#10227;</strong>, and drop them with <strong>&#9660;</strong>. Or swipe sideways, tap to turn, and swipe down to drop.',
      'Fill a whole row from side to side and it blooms into flowers for your garden.',
      'If the pond fills up, it simply settles and starts fresh. You can’t lose.'],
      keys: 'On a keyboard: arrow keys to move and turn, space to drop.' }
  };
  var helpCard = document.getElementById('ng-help');
  function showHelp(m) {
    var h = HELP[m || mode]; if (!h || !helpCard) return;
    document.getElementById('ng-help-ico').innerHTML = h.ico;
    document.getElementById('ng-help-h').textContent = h.h;
    document.getElementById('ng-help-steps').innerHTML = h.steps.map(function (x) { return '<li>' + x + '</li>'; }).join('') +
      (h.keys && window.matchMedia && window.matchMedia('(hover: hover)').matches ? '<li>' + h.keys + '</li>' : '');
    helpCard.hidden = false; say('', '', 0);
    document.getElementById('ng-help-ok').focus();
  }
  function hideHelp() {
    helpCard.hidden = true;
    if (mode === 'breathe') { breath.start = performance.now() + 600; breath.count = 0; breath.phase = ''; }
    if (mode === 'pond') dropAt = performance.now() + 1500;
    document.getElementById('ng-help-btn').focus();
  }
  if (helpCard) {
    document.getElementById('ng-help-ok').addEventListener('click', hideHelp);
    helpCard.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideHelp(); });
    document.getElementById('ng-help-btn').addEventListener('click', function () { showHelp(); });
  }

  function setMode(m) {
    mode = m;
    document.querySelectorAll('.ng-bar [data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === m)); });
    padEl.hidden = m !== 'pond';
    flies.forEach(function (f) { f.home = null; });
    if (m === 'breathe') { breath.start = performance.now() + 1500; breath.count = 0; breath.phase = ''; skyWords = []; wordAt = 0; say('Box breathing', 'In 4 · hold 4 · out 4 · hold 4. Follow the star around the square.', 0); }
    if (m === 'fireflies') { newShape(); say('Guide the fireflies', 'Touch or move over each faint point, and a firefly will settle there.', 6000); }
    if (m === 'pond') { pondReset(); say('Float the lily pads', 'Fill a row across the pond and it blooms. There’s no hurry, and no way to lose.', 6000); }
    updateCount();
    // The first time in each activity, show how it works
    save.seen = save.seen || {};
    if (!save.seen[m]) { save.seen[m] = 1; persist(); showHelp(m); }
  }

  // Breathe: 4 seconds in, 6 seconds out
  var breath = { start: 0, count: 0, phase: '' };
  // Box breathing: in 4, hold 4, out 4, hold 4. The light grows, rests, softens, rests.
  var BOX = [['in', 4, 'Breathe in…'], ['top', 4, 'Hold…'], ['out', 4, 'Breathe out…'], ['bottom', 4, 'Hold…']];
  var BOX_SUB = { in: 'Slowly, through your nose', top: 'Gently. No strain.', out: 'Slow and warm, through your mouth', bottom: 'Rest, empty and easy' };
  // words that drift down from the sky, one each round: what box breathing is doing for you
  var SKY_WORDS = [
    'Box breathing: in for 4, hold for 4, out for 4, hold for 4.',
    'Slow, even breaths tell your nervous system that you are safe.',
    'Every slow breath out gently slows your heart.',
    'The pauses stretch each breath, so your whole rhythm calms down.',
    'Counting gives a busy mind one simple job to do.',
    'Your body is shifting into “rest and digest”.',
    'Let your shoulders drop. Let your jaw soften.',
    'Notice your hands. Warmer? Heavier? That’s your body relaxing.',
    'If a thought pulls you away, that’s okay. Come back to the count.',
    'Steady breathing helps your body settle, and your mind follows.',
    'Nurses, athletes and first responders breathe this way to stay steady.',
    'You’re doing it. One calm square at a time.'
  ];
  var skyWords = [], wordAt = 0;
  function dropWord(t) { skyWords.push({ text: SKY_WORDS[wordAt % SKY_WORDS.length], born: t, x: 0.5 + (Math.random() - 0.5) * 0.08 }); wordAt++; }
  function drawSkyWords(t) {
    skyWords = skyWords.filter(function (w) { return t - w.born < 14000; });
    var size = Math.round(Math.max(15, Math.min(22, W / 26)));
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'italic 500 ' + size + 'px Fraunces, Georgia, serif';
    skyWords.forEach(function (w) {
      var p = (t - w.born) / 14000, a = p < 0.12 ? p / 0.12 : p > 0.8 ? (1 - p) / 0.2 : 1;
      var y = H * (0.15 + (REDUCED ? 0.04 : p * 0.07)), x = W * w.x + (REDUCED ? 0 : Math.sin(t / 2400 + w.born) * 10);
      var lines = wrapText(w.text, W * 0.82), lh = size * 1.3;
      ctx.shadowColor = 'rgba(255,230,200,' + (0.6 * a) + ')'; ctx.shadowBlur = 14; ctx.fillStyle = 'rgba(255,246,228,' + (0.95 * a) + ')';
      lines.forEach(function (ln, i) { ctx.fillText(ln, x, y + (i - (lines.length - 1) / 2) * lh); });
    });
    ctx.restore();
  }
  function wrapText(text, maxW) {
    var words = text.split(' '), lines = [], line = '';
    words.forEach(function (wd) { var test = line ? line + ' ' + wd : wd; if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = wd; } else line = test; });
    if (line) lines.push(line); return lines;
  }

  function drawBreath(t) {
    if (helpCard && !helpCard.hidden) return;
    var el = (t - breath.start) / 1000; if (el < 0) return;
    var cyc = el % 16, n = Math.floor(el / 16), step = Math.min(3, Math.floor(cyc / 4)), into = cyc - step * 4;
    var ph = BOX[step][0];
    var k = ph === 'in' ? ease(into / 4) : ph === 'top' ? 1 : ph === 'out' ? 1 - ease(into / 4) : 0;
    if (ph !== breath.phase) {
      breath.phase = ph;
      if (ph === 'in' && n > 0 && n > breath.count) { breath.count = n; bloom(); }
      if (ph === 'in') { dropWord(t); hopAll(); }
      if (breath.count >= 4 && breath.count % 4 === 0 && ph === 'in') say('Four calm squares. Lovely.', 'Keep going as long as you like.', 0);
      else say(BOX[step][2], BOX_SUB[ph] + (breath.count ? ' · ' + breath.count + (breath.count === 1 ? ' round' : ' rounds') + ' tonight' : ''), 0);
      padSwell(ph);
    }
    var cx = W * 0.5, cy = H * 0.36, R = Math.min(W, H) * 0.075 * (0.7 + 0.5 * k);
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 3);
    g.addColorStop(0, 'rgba(255,238,210,' + (0.55 + 0.3 * k) + ')'); g.addColorStop(0.35, 'rgba(249,217,184,' + (0.35 + 0.2 * k) + ')'); g.addColorStop(1, 'rgba(217,200,240,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,248,232,0.9)'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.55, 0, Math.PI * 2); ctx.fill();
    // the box: a soft square the light travels around, one side per step
    var half = Math.min(W, H) * 0.075 * 1.35 + 16, x0 = cx - half, y0 = cy - half, side = half * 2;
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,240,215,0.16)'; ctx.strokeRect(x0, y0, side, side);
    var pts = [[x0, y0 + side], [x0, y0], [x0 + side, y0], [x0 + side, y0 + side], [x0, y0 + side]];
    ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(249,217,184,0.9)'; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 0; i < step; i++) ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
    var f = into / 4, dx = pts[step][0] + (pts[step + 1][0] - pts[step][0]) * f, dy = pts[step][1] + (pts[step + 1][1] - pts[step][1]) * f;
    ctx.lineTo(dx, dy); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = '#FFF6E6'; ctx.shadowColor = 'rgba(255,236,214,0.95)'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(dx, dy, 5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(60,50,90,0.85)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 ' + Math.round(Math.max(16, R * 0.5)) + 'px Fraunces, Georgia, serif';
    ctx.fillText(String(Math.max(1, Math.ceil(4 - into))), cx, cy + 1);
    drawSkyWords(t);
  }

  // ---------- Happy animals around the pond ----------
  // a frog on a lily pad, a bunny, a duckling on the water and a hedgehog. In Breathe they
  // hop together at the start of every breath in; otherwise they hop now and then.
  var critters = [
    { kind: 'bunny', fx: -1.12, fy: -0.35, hop: 0, next: 0 },
    { kind: 'frog', fx: -0.45, fy: 0.05, hop: 0, next: 0 },
    { kind: 'duck', fx: 0.4, fy: 0.15, hop: 0, next: 0 },
    { kind: 'hedgehog', fx: 1.12, fy: -0.3, hop: 0, next: 0 }
  ];
  function hopAll() { if (REDUCED) return; var now = performance.now(); critters.forEach(function (c, i) { c.hop = now + i * 140; }); }
  function drawCritters(t) {
    var p = pondShape(), s = Math.max(1, Math.min(1.4, Math.min(W, H) / 520));
    // keep them above the buttons at the bottom of the screen
    var bar = document.querySelector('.ng-bar'), barTop = bar ? bar.getBoundingClientRect().top - canvas.getBoundingClientRect().top : H;
    var groundY = Math.min(p.y, barTop - 14);
    critters.forEach(function (c) {
      if (!REDUCED && mode !== 'breathe' && t > c.next) { if (c.next) c.hop = t; c.next = t + 4000 + Math.random() * 6000; }
      var x = p.x + c.fx * Math.max(p.rx, W * 0.3), y = groundY + c.fy * p.ry, lift = 0, squash = 1, since = t - c.hop;
      if (!REDUCED && since >= 0 && since < 750) { var q = since / 750; lift = Math.sin(q * Math.PI) * 22 * s * (c.kind === 'duck' ? 0.4 : 1); squash = q < 0.1 ? 1 - q * 1.5 : q > 0.9 ? 1 - (1 - q) * 1.5 : 1.06; }
      var blink = Math.sin(t / 900 + c.fx * 7) > 0.985;
      ctx.save(); ctx.translate(x, y);
      // soft shadow or ripple
      ctx.fillStyle = c.kind === 'duck' || c.kind === 'frog' ? 'rgba(200,215,255,0.18)' : 'rgba(10,15,30,0.25)';
      ctx.beginPath(); ctx.ellipse(0, 2, 16 * s * (1 - lift / (60 * s)), 4 * s, 0, 0, Math.PI * 2); ctx.fill();
      if (c.kind === 'frog') { ctx.fillStyle = '#6FAE8A'; ctx.beginPath(); ctx.ellipse(0, 1, 20 * s, 6 * s, 0, 0.35, Math.PI * 2 - 0.05); ctx.fill(); }
      ctx.translate(0, -lift); ctx.scale(1 / Math.sqrt(squash), squash); ctx.scale(s, s);
      if (c.kind === 'frog') drawFrog(blink); else if (c.kind === 'bunny') drawBunny(blink); else if (c.kind === 'duck') drawDuck(blink); else drawHedgehog(blink);
      ctx.restore();
    });
  }
  function eye(x, y, r, blink) {
    if (blink) { ctx.strokeStyle = '#2B2620'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.stroke(); return; }
    ctx.fillStyle = '#2B2620'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + r * 0.35, y - r * 0.35, r * 0.4, 0, Math.PI * 2); ctx.fill();
  }
  function cheeks(x1, x2, y) { ctx.fillStyle = 'rgba(247,165,185,0.8)'; [x1, x2].forEach(function (x) { ctx.beginPath(); ctx.ellipse(x, y, 2.6, 1.6, 0, 0, Math.PI * 2); ctx.fill(); }); }
  function smile(x, y, w) { ctx.strokeStyle = '#2B2620'; ctx.lineWidth = 1.3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y - w * 0.4, w, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke(); ctx.lineCap = 'butt'; }
  function drawFrog(b) {
    ctx.fillStyle = '#9ED9A8'; ctx.beginPath(); ctx.ellipse(0, -9, 13, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#D6F2DA'; ctx.beginPath(); ctx.ellipse(0, -6, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9ED9A8'; [-6, 6].forEach(function (x) { ctx.beginPath(); ctx.arc(x, -18, 5, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = '#fff'; [-6, 6].forEach(function (x) { ctx.beginPath(); ctx.arc(x, -18, 3.4, 0, Math.PI * 2); ctx.fill(); });
    eye(-6, -18, 1.8, b); eye(6, -18, 1.8, b); smile(0, -10, 4); cheeks(-8, 8, -11);
  }
  function drawBunny(b) {
    ctx.fillStyle = '#F4F1FA';
    ctx.beginPath(); ctx.ellipse(-4, -30, 3.2, 10, -0.15, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(4, -30, 3.2, 10, 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F7C9D4'; ctx.beginPath(); ctx.ellipse(-4, -30, 1.4, 7, -0.15, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(4, -30, 1.4, 7, 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F4F1FA'; ctx.beginPath(); ctx.ellipse(0, -7, 11, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(0, -17, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(10, -7, 3, 0, Math.PI * 2); ctx.fill();
    eye(-3, -18, 1.5, b); eye(3, -18, 1.5, b); ctx.fillStyle = '#EE8FA6'; ctx.beginPath(); ctx.arc(0, -15, 1.2, 0, Math.PI * 2); ctx.fill(); cheeks(-5.5, 5.5, -14.5);
  }
  function drawDuck(b) {
    ctx.fillStyle = '#F8DC6E'; ctx.beginPath(); ctx.ellipse(0, -6, 11, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(-6, -15, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F2C94C'; ctx.beginPath(); ctx.ellipse(3, -7, 5, 3, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F4A261'; ctx.beginPath(); ctx.ellipse(-13, -14, 3.6, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    eye(-7, -16.5, 1.5, b); cheeks(-10.5, -2.5, -13);
  }
  function drawHedgehog(b) {
    ctx.fillStyle = '#9C7B63'; ctx.beginPath();
    for (var i = 0; i <= 8; i++) { var a = Math.PI + i / 8 * Math.PI, r = i % 2 ? 11 : 15; ctx.lineTo(3 + Math.cos(a) * r, -7 + Math.sin(a) * r * 0.9); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#EAD7C0'; ctx.beginPath(); ctx.ellipse(-8, -6, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2B2620'; ctx.beginPath(); ctx.arc(-14.5, -6, 1.5, 0, Math.PI * 2); ctx.fill();
    eye(-8, -8, 1.4, b); cheeks(-11, -4, -4.5);
  }

  function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function bloom() {
    var f = addFlower(false); addLantern(f.x * W); save.breaths++; persist(); chime(Math.floor(Math.random() * 5), 0.1); updateCount();
  }

  // Fireflies: constellations
  function ring(n, r, cx, cy, rot) { var a = []; for (var i = 0; i < n; i++) { var t = rot + i / n * Math.PI * 2; a.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]); } return a; }
  var SHAPES = {
    heart: { name: 'a heart', closed: true, pts: (function () { var a = []; for (var i = 0; i < 12; i++) { var t = i / 12 * Math.PI * 2; a.push([0.5 + 0.028 * 16 * Math.pow(Math.sin(t), 3), 0.45 - 0.028 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]); } return a; })() },
    star: { name: 'a star', closed: true, pts: (function () { var a = []; for (var i = 0; i < 10; i++) { var t = -Math.PI / 2 + i / 10 * Math.PI * 2, r = i % 2 ? 0.2 : 0.46; a.push([0.5 + Math.cos(t) * r, 0.52 + Math.sin(t) * r]); } return a; })() },
    moon: { name: 'a crescent moon', closed: true, pts: (function () { var a = []; for (var i = 0; i <= 6; i++) { var t = -Math.PI / 2 + i / 6 * Math.PI; a.push([0.5 + Math.cos(t) * 0.42, 0.5 + Math.sin(t) * 0.42]); } for (var j = 5; j >= 1; j--) { var u = -Math.PI / 2 + j / 6 * Math.PI; a.push([0.62 + Math.cos(u) * 0.2, 0.5 + Math.sin(u) * 0.36]); } return a; })() },
    flower: { name: 'a flower', closed: true, pts: (function () { var a = []; for (var i = 0; i < 12; i++) { var t = i / 12 * Math.PI * 2, r = i % 2 ? 0.2 : 0.44; a.push([0.5 + Math.cos(t) * r, 0.5 + Math.sin(t) * r]); } return a; })() },
    leaf: { name: 'a leaf', closed: true, pts: [[0.12, 0.85], [0.28, 0.55], [0.5, 0.32], [0.76, 0.16], [0.9, 0.12], [0.84, 0.36], [0.68, 0.6], [0.44, 0.78], [0.12, 0.85]].slice(0, 8) },
    house: { name: 'a little house', closed: true, pts: [[0.2, 0.85], [0.2, 0.5], [0.5, 0.18], [0.8, 0.5], [0.8, 0.85], [0.5, 0.85]] },
    wave: { name: 'a wave', closed: false, pts: (function () { var a = []; for (var i = 0; i < 10; i++) a.push([0.08 + i * 0.093, 0.55 + Math.sin(i / 9 * Math.PI * 2) * 0.22]); return a; })() },
    kite: { name: 'a kite', closed: true, pts: [[0.5, 0.1], [0.78, 0.42], [0.5, 0.9], [0.22, 0.42]] },
    butterfly: { name: 'a butterfly', closed: true, pts: [[0.5, 0.3], [0.3, 0.12], [0.1, 0.22], [0.2, 0.48], [0.5, 0.52], [0.24, 0.62], [0.2, 0.86], [0.42, 0.8], [0.5, 0.6], [0.58, 0.8], [0.8, 0.86], [0.76, 0.62], [0.5, 0.52], [0.8, 0.48], [0.9, 0.22], [0.7, 0.12]] },
    paw: { name: 'a little paw', closed: false, pts: [[0.3, 0.62], [0.36, 0.84], [0.5, 0.9], [0.64, 0.84], [0.7, 0.62], [0.5, 0.56], [0.3, 0.62], [0.18, 0.4], [0.36, 0.24], [0.5, 0.18], [0.64, 0.24], [0.82, 0.4]] }
  };
  // each constellation has a name and a kind thought to carry away
  var MEANING = {
    heart: ['The Heart', 'For everyone you carry with you.'],
    star: ['The Wishing Star', 'Make a wish tonight, for someone else.'],
    moon: ['The Crescent', 'Rest is part of the rhythm too.'],
    flower: ['The Bloom', 'Small things grow when they’re tended.'],
    leaf: ['The Leaf', 'Let one worry go, and watch it float away.'],
    house: ['The Home', 'For the people who feel like home.'],
    wave: ['The Wave', 'Feelings rise, and feelings pass.'],
    kite: ['The Kite', 'Lightness is allowed.'],
    butterfly: ['The Butterfly', 'Change can be gentle.'],
    paw: ['The Paw Print', 'For the small companions who love us without words.']
  };
  var SHAPE_IDS = Object.keys(SHAPES), shape = null, targets = [], shapeDone = 0, dwell = null, sparks = [], shooting = null, nextShoot = 0;
  function newShape() {
    // pictures you haven't found yet come first, so the collection keeps growing
    var unfound = SHAPE_IDS.filter(function (id) { return save.consts.indexOf(id) === -1 && (!shape || id !== shape.id); });
    var pool = unfound.length ? unfound : SHAPE_IDS.filter(function (id) { return !shape || id !== shape.id; });
    var id = pool[Math.floor(Math.random() * pool.length)];
    shape = { id: id, def: SHAPES[id] }; shapeDone = 0;
    var sz = Math.min(W, H) * 0.36, cx = W * 0.5, cy = H * 0.3;
    targets = SHAPES[id].pts.map(function (p) { return { x: cx + (p[0] - 0.5) * sz, y: cy + (p[1] - 0.5) * sz, done: false }; });
    flies.forEach(function (f) { f.home = null; });
  }
  function drawShape(t) {
    if (!shape) return;
    var glow = shapeDone ? Math.min(1, (t - shapeDone) / 900) : 0;
    ctx.strokeStyle = 'rgba(255,240,210,' + (0.12 + glow * 0.6) + ')'; ctx.lineWidth = 1 + glow * 1.5; ctx.setLineDash(glow ? [] : [3, 6]);
    ctx.beginPath(); targets.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); if (shape.def.closed) ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
    // the lines you've connected so far, glowing
    var litN = 0; while (litN < targets.length && targets[litN].done) litN++;
    if (litN > 1 && !glow) {
      ctx.save(); ctx.strokeStyle = 'rgba(255,236,190,0.85)'; ctx.lineWidth = 2.4; ctx.shadowColor = 'rgba(255,230,170,0.9)'; ctx.shadowBlur = 10; ctx.lineCap = 'round';
      ctx.beginPath(); for (var li = 0; li < litN; li++) { if (li) ctx.lineTo(targets[li].x, targets[li].y); else ctx.moveTo(targets[li].x, targets[li].y); } ctx.stroke(); ctx.restore();
    }
    if (glow) { // the finished picture shimmers
      ctx.save(); ctx.strokeStyle = 'rgba(255,236,190,' + (0.5 + 0.4 * Math.sin(t / 300)) + ')'; ctx.lineWidth = 3; ctx.shadowColor = 'rgba(255,220,160,1)'; ctx.shadowBlur = 18;
      ctx.beginPath(); targets.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); if (shape.def.closed) ctx.closePath(); ctx.stroke(); ctx.restore();
    }
    var next = nextTarget();
    targets.forEach(function (p) {
      if (p.done) return;
      var pulse = REDUCED ? 0.7 : 0.55 + 0.3 * Math.sin(t / 500 + p.x), big = p === next;
      ctx.fillStyle = 'rgba(230,255,170,' + (big ? 0.22 : 0.1) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, big ? 15 : 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(230,255,170,' + pulse + ')'; ctx.lineWidth = big ? 2.2 : 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, big ? 15 + (REDUCED ? 0 : Math.sin(t / 300) * 2) : 10, 0, Math.PI * 2); ctx.stroke();
      if (big) { ctx.fillStyle = 'rgba(255,250,225,0.95)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 12px Lora, Georgia, serif'; ctx.fillText(String(targets.indexOf(p) + 1), p.x, p.y + 0.5); }
    });
    // a soft arrow from your light toward the next circle
    if (next && !shapeDone && wand.active && Math.hypot(next.x - wand.x, next.y - wand.y) > 60) {
      var an = Math.atan2(next.y - wand.y, next.x - wand.x), ax = wand.x + Math.cos(an) * 34, ay = wand.y + Math.sin(an) * 34;
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(an); ctx.fillStyle = 'rgba(255,250,220,0.75)';
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -6); ctx.lineTo(-2, 0); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    // how many are lit
    if (!shapeDone) {
      var lit = targets.filter(function (p) { return p.done; }).length, lowest = Math.max.apply(null, targets.map(function (p) { return p.y; }));
      ctx.fillStyle = 'rgba(255,246,224,0.85)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '500 14px Lora, Georgia, serif';
      ctx.fillText('\u2728 ' + lit + ' of ' + targets.length + ' lit  \u00b7  ' + save.consts.length + ' of ' + SHAPE_IDS.length + ' pictures found', W / 2, lowest + 34);
    }
    if (mode === 'fireflies' && wand.active) {
      var wg = ctx.createRadialGradient(wand.x, wand.y, 0, wand.x, wand.y, 30); wg.addColorStop(0, 'rgba(255,255,230,0.25)'); wg.addColorStop(1, 'rgba(255,255,230,0)');
      ctx.fillStyle = wg; ctx.beginPath(); ctx.arc(wand.x, wand.y, 30, 0, Math.PI * 2); ctx.fill();
    }
    if (shapeDone && t - shapeDone > 4200 && (!dedCard || dedCard.hidden)) newShape();
    drawShooting(t);
  }
  // The unlit circle to aim for: the nearest to your light, or the first one if you haven't started
  // connect the dots in order: the next one is always the first unlit circle
  function nextTarget() { for (var i = 0; i < targets.length; i++) if (!targets[i].done) return targets[i]; return null; }
  function burst(x, y, n, hue) {
    if (REDUCED) return;
    for (var i = 0; i < n; i++) { var a = Math.random() * Math.PI * 2, v = 0.6 + Math.random() * 1.6; sparks.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.4, life: 1, h: hue == null ? 40 + Math.random() * 30 : hue }); }
  }
  function drawSparks(dt) {
    for (var i = sparks.length - 1; i >= 0; i--) {
      var p = sparks[i]; p.x += p.vx * dt * 0.06; p.y += p.vy * dt * 0.06; p.vy += 0.002 * dt; p.life -= dt / 900;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.fillStyle = 'hsla(' + p.h + ',100%,85%,' + p.life + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.8 + p.life * 1.4, 0, Math.PI * 2); ctx.fill();
    }
  }
  // now and then a shooting star crosses the sky; catch it for a wish
  function drawShooting(t) {
    if (mode !== 'fireflies' || REDUCED) return;
    if (!nextShoot) nextShoot = t + 15000 + Math.random() * 15000;
    if (!shooting && t > nextShoot) { var fromLeft = Math.random() < 0.5; shooting = { t0: t, x0: fromLeft ? W * 0.05 : W * 0.95, y0: H * (0.06 + Math.random() * 0.1), dx: (fromLeft ? 1 : -1) * W * 0.7, dy: H * 0.22, caught: false }; }
    if (!shooting) return;
    var q = (t - shooting.t0) / 3200; if (q >= 1) { shooting = null; nextShoot = t + 25000 + Math.random() * 25000; return; }
    var x = shooting.x0 + shooting.dx * q, y = shooting.y0 + shooting.dy * q;
    var g = ctx.createLinearGradient(x, y, x - shooting.dx * 0.12, y - shooting.dy * 0.12);
    g.addColorStop(0, 'rgba(255,250,230,0.95)'); g.addColorStop(1, 'rgba(255,250,230,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - shooting.dx * 0.12, y - shooting.dy * 0.12); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = '#FFFBEA'; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
    if (wand.active && Math.hypot(wand.x - x, wand.y - y) < 44) {
      burst(x, y, 40, 50); [0, 2, 4, 5, 6].forEach(function (n, k) { setTimeout(function () { chime(n, 0.09); }, k * 110); });
      save.wishes = (save.wishes || 0) + 1; addFlower(false); addLantern(); persist(); updateCount();
      say('You caught a shooting star!', 'Make a wish for someone you love. A new flower opened in your garden.', 4000);
      shooting = null; nextShoot = t + 30000 + Math.random() * 25000;
    }
  }
  function fireflyTick(t) {
    if (mode !== 'fireflies' || !wand.active || shapeDone) return;
    var near = null;
    var nx = nextTarget(); if (nx && Math.hypot(nx.x - wand.x, nx.y - wand.y) < 38) near = nx;
    if (!near) { dwell = null; return; }
    if (!dwell || dwell.p !== near) { dwell = { p: near, t: t }; return; }
    if (t - dwell.t > 180) {
      var free = flies.filter(function (f) { return !f.home; });
      var f = free.length ? free.reduce(function (a, b) { return Math.hypot(a.x * W - near.x, a.y * H - near.y) < Math.hypot(b.x * W - near.x, b.y * H - near.y) ? a : b; }) : null;
      if (f) f.home = near;
      near.done = true; dwell = null;
      var i = targets.indexOf(near); chime(i, 0.08); burst(near.x, near.y, 12);
      if (targets.every(function (p) { return p.done; })) {
        shapeDone = t;
        // the finished picture sings its whole tune back to you
        targets.forEach(function (p, k) { setTimeout(function () { chime(k, 0.07); burst(p.x, p.y, 6); }, 250 + k * 120); });
        var first = save.consts.indexOf(shape.id) === -1, m = MEANING[shape.id] || ['A new constellation', ''];
        if (first) { save.consts.push(shape.id); persist(); }
        say(m[0] + (first ? ' \u2728 New!' : ''), m[1] + (first ? '  ' + save.consts.length + ' of ' + SHAPE_IDS.length + ' found.' : ''), 5200);
        updateCount();
        if (first) setTimeout(function () { askDedication(shape.id, m[0]); }, 2600);
      }
    }
  }

  // Lily pond: slow, forgiving falling shapes
  var COLS = 8, ROWS = 12, board = [], piece = null, cell = 30, bx = 0, by = 0, dropAt = 0, clearing = null, settleAt = 0;
  var PIECES = [
    [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [1, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 2]], [[1, 0], [1, 1], [1, 2], [0, 2]], [[1, 0], [2, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [1, 1], [2, 1]]
  ];
  var LILY = ['#BFE3CF', '#C6DFF4', '#D9C8F0', '#F7C9D4', '#F8E7AE', '#F9C9B4', '#A9DCC8'];
  function layoutPond() {
    by = Math.round(H * 0.1);
    var room = W <= 560 ? H - by - 200 : H * 0.6; // on phones the touch pad sits below the pond
    cell = Math.max(14, Math.floor(Math.min(room / ROWS, H * 0.6 / ROWS, (W * 0.84) / COLS, 38)));
    bx = Math.round(W / 2 - COLS * cell / 2);
  }
  function pondReset() { clearing = null; board = []; for (var r = 0; r < ROWS; r++) board.push(new Array(COLS).fill(0)); spawn(); }
  function spawn() {
    var k = Math.floor(Math.random() * PIECES.length);
    piece = { cells: PIECES[k].map(function (c) { return c.slice(); }), x: Math.floor(COLS / 2) - 1, y: 0, c: k + 1, hasFlower: Math.random() < 0.5 };
    dropAt = performance.now() + 1200;
    if (collide(piece.cells, piece.x, piece.y)) { settleAt = performance.now(); say('The pond settles.', 'Fresh water. Carry on whenever you like.', 3000); for (var r = 0; r < ROWS; r++) board[r].fill(0); }
  }
  function collide(cells, x, y) {
    for (var i = 0; i < cells.length; i++) {
      var cx = cells[i][0] + x, cy = cells[i][1] + y;
      if (cx < 0 || cx >= COLS || cy >= ROWS) return true;
      if (cy >= 0 && board[cy][cx]) return true;
    }
    return false;
  }
  function rotate() {
    var w = Math.max.apply(null, piece.cells.map(function (c) { return c[0]; }));
    var rot = piece.cells.map(function (c) { return [c[1], w - c[0]]; });
    [0, -1, 1].some(function (dx) { if (!collide(rot, piece.x + dx, piece.y)) { piece.cells = rot; piece.x += dx; return true; } return false; });
  }
  function move(dx) { if (!collide(piece.cells, piece.x + dx, piece.y)) piece.x += dx; }
  function step() {
    if (!collide(piece.cells, piece.x, piece.y + 1)) { piece.y++; return true; }
    piece.cells.forEach(function (c) { var y = c[1] + piece.y; if (y >= 0) board[y][c[0] + piece.x] = piece.c * (piece.hasFlower ? -1 : 1); });
    plink();
    var full = []; board.forEach(function (row, r) { if (row.every(Boolean)) full.push(r); });
    if (full.length) { clearing = { rows: full, t: performance.now() }; full.forEach(function (r, i) { setTimeout(function () { chime(r + i, 0.1); }, i * 140); }); }
    else spawn();
    return false;
  }
  function pondKey(k) {
    if (mode !== 'pond' || !piece || clearing) return;
    if (k === 'ArrowLeft') move(-1); else if (k === 'ArrowRight') move(1); else if (k === 'ArrowUp') rotate();
    else if (k === 'ArrowDown') { step(); dropAt = performance.now() + 900; }
    else if (k === ' ') { while (step()) {} }
  }
  function drawPond(t) {
    if (!piece) return;
    if (clearing && t - clearing.t > 700) {
      var n = clearing.rows.length;
      clearing.rows.slice().sort(function (a, b) { return a - b; }).forEach(function (r) { board.splice(r, 1); board.unshift(new Array(COLS).fill(0)); });
      for (var i = 0; i < n; i++) { addFlower(false); addLantern(); }
      save.lilies += n; persist(); updateCount();
      say(n > 1 ? n + ' rows bloomed.' : 'A row bloomed.', 'New flowers opened in your garden.', 2400);
      clearing = null; spawn();
    }
    if (!clearing && t > dropAt && (!helpCard || helpCard.hidden)) { step(); dropAt = t + 1100; }
    // water
    var w = COLS * cell, h = ROWS * cell;
    ctx.fillStyle = 'rgba(70,87,138,0.35)'; ctx.strokeStyle = 'rgba(200,210,255,0.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx - 8, by - 8, w + 16, h + 16, 18) : ctx.rect(bx - 8, by - 8, w + 16, h + 16); ctx.fill(); ctx.stroke();
    for (var rr = 1; rr < 4; rr++) {
      var ry = by + h * (rr / 4) + (REDUCED ? 0 : Math.sin(t / 1600 + rr) * 3);
      ctx.strokeStyle = 'rgba(200,215,255,0.07)'; ctx.beginPath(); ctx.moveTo(bx, ry); ctx.quadraticCurveTo(bx + w / 2, ry + 6, bx + w, ry); ctx.stroke();
    }
    board.forEach(function (row, r) {
      var fade = clearing && clearing.rows.indexOf(r) !== -1 ? 1 + (t - clearing.t) / 350 : 1;
      row.forEach(function (v, c) { if (v) lily(bx + c * cell, by + r * cell, Math.abs(v), v < 0, fade); });
    });
    if (!clearing) {
      var gy = piece.y; while (!collide(piece.cells, piece.x, gy + 1)) gy++;
      if (gy > piece.y) {
        ctx.strokeStyle = 'rgba(255,246,224,0.45)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]);
        piece.cells.forEach(function (c) { var y = c[1] + gy; if (y >= 0) { ctx.beginPath(); ctx.arc(bx + (c[0] + piece.x) * cell + cell / 2, by + y * cell + cell / 2, cell * 0.4, 0, Math.PI * 2); ctx.stroke(); } });
        ctx.setLineDash([]);
      }
      piece.cells.forEach(function (c) { var y = c[1] + piece.y; if (y >= 0) lily(bx + (c[0] + piece.x) * cell, by + y * cell, piece.c, piece.hasFlower, 1, true); });
    }
  }
  function lily(x, y, k, flower, fade, live) {
    var r = cell * 0.44 * Math.min(1.25, fade), cx = x + cell / 2, cy = y + cell / 2, a = fade > 1 ? Math.max(0, 2 - fade) : 1;
    ctx.globalAlpha = a;
    ctx.fillStyle = LILY[(k - 1) % LILY.length];
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, 0.35, Math.PI * 2 - 0.05); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = live ? 'rgba(255,255,255,0.7)' : 'rgba(40,60,80,0.25)'; ctx.lineWidth = 1; ctx.stroke();
    if (flower || fade > 1) {
      ctx.fillStyle = fade > 1 ? '#FFF3D6' : '#F7C9D4';
      for (var i = 0; i < 5; i++) { var an = i / 5 * Math.PI * 2; ctx.beginPath(); ctx.ellipse(cx + Math.cos(an) * r * 0.28, cy + Math.sin(an) * r * 0.28, r * 0.2, r * 0.12, an, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#F8DC6E'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Main loop ----------
  var lastT = performance.now(), running = true, rafId = 0;
  function kick() { if (!rafId) rafId = requestAnimationFrame(frame); }
  function frame(t) {
    rafId = 0;
    var dt = Math.min(60, t - lastT); lastT = t;
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    if (bg) ctx.drawImage(bg, 0, 0, W, H);
    drawSky(t);
    // pond shimmer
    var p = pondShape();
    if (!REDUCED) for (var i = 0; i < 3; i++) { ctx.strokeStyle = 'rgba(210,220,255,0.08)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx * (0.4 + i * 0.2) + Math.sin(t / 1800 + i) * 6, p.ry * (0.4 + i * 0.2), 0, 0, Math.PI * 2); ctx.stroke(); }
    if (!sorted) sorted = save.flowers.slice().sort(function (a, b) { return a.y - b.y; });
    sorted.forEach(function (f) { drawFlower(f, t); });
    drawLanterns(t, dt);
    if (mode === 'breathe') drawBreath(t);
    if (mode === 'fireflies') { fireflyTick(t); drawShape(t); }
    if (mode === 'pond') drawPond(t);
    drawCritters(t);
    drawFlies(t, dt);
    drawSparks(dt);
    kick();
  }

  function updateCount() {
    var parts = [save.flowers.length + (save.flowers.length === 1 ? ' flower' : ' flowers')];
    if (save.consts.length) parts.push(save.consts.length + (save.consts.length === 1 ? ' constellation' : ' constellations'));
    if (save.lilies) parts.push(save.lilies + ' lily ' + (save.lilies === 1 ? 'row' : 'rows'));
    countEl.textContent = 'Your garden: ' + parts.join(' · ');
  }

  // ---------- Input ----------
  function pos(e) { var r = canvas.getBoundingClientRect(); var p = e.touches ? e.touches[0] : e; return { x: p.clientX - r.left, y: p.clientY - r.top }; }
  var swipe = null;
  canvas.addEventListener('pointermove', function (e) { var p = pos(e); wand.x = p.x; wand.y = p.y; wand.active = true; });
  canvas.addEventListener('pointerdown', function (e) { var p = pos(e); wand.x = p.x; wand.y = p.y; wand.active = true; swipe = { x: p.x, y: p.y, t: performance.now() }; });
  canvas.addEventListener('pointerleave', function () { if (mode !== 'fireflies') wand.active = false; });
  canvas.addEventListener('pointerup', function (e) {
    if (!swipe || mode !== 'pond') { swipe = null; return; }
    var p = pos(e), dx = p.x - swipe.x, dy = p.y - swipe.y;
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) pondKey('ArrowUp');
    else if (Math.abs(dx) > Math.abs(dy)) { var n = Math.max(1, Math.round(Math.abs(dx) / cell)); for (var i = 0; i < n; i++) pondKey(dx > 0 ? 'ArrowRight' : 'ArrowLeft'); }
    else if (dy > 30) pondKey(' ');
    swipe = null;
  });
  document.addEventListener('keydown', function (e) {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === ' ' && e.target.closest && e.target.closest('button, a, summary')) return;
    if (!closeCard.hidden || !welcome.hidden || (helpCard && !helpCard.hidden) || (dedCard && !dedCard.hidden) || stage.getBoundingClientRect().bottom < window.innerHeight * 0.5) return;
    if (mode === 'pond' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].indexOf(e.key) !== -1 && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) { e.preventDefault(); pondKey(e.key); }
    if (mode === 'fireflies' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) !== -1 && !/INPUT|TEXTAREA/.test(e.target.tagName)) {
      e.preventDefault(); if (!wand.active) { wand.x = W / 2; wand.y = H * 0.3; wand.active = true; }
      var d = 18; if (e.key === 'ArrowLeft') wand.x -= d; if (e.key === 'ArrowRight') wand.x += d; if (e.key === 'ArrowUp') wand.y -= d; if (e.key === 'ArrowDown') wand.y += d;
    }
  });
  padEl.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { pondKey(b.getAttribute('data-key')); }); });
  document.querySelectorAll('.ng-bar [data-mode]').forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); }); });

  var soundBtn = document.getElementById('ng-sound');
  var soundWelcome = document.getElementById('ng-sound-welcome');
  function soundLabel() {
    soundBtn.setAttribute('aria-pressed', String(!!save.sound)); soundBtn.innerHTML = save.sound ? '&#127925; Sound on' : '&#127925; Sound off';
    if (soundWelcome) { soundWelcome.setAttribute('aria-pressed', String(!!save.sound)); soundWelcome.innerHTML = save.sound ? '&#127925; Soft sound: on' : '&#127925; Soft sound: off'; }
  }
  if (soundWelcome) soundWelcome.addEventListener('click', function () {
    save.sound = !save.sound; persist(); soundLabel();
    if (save.sound) { startAudio(); setTimeout(function () { chime(2, 0.12); }, 150); } else stopAudio();
  });
  soundBtn.addEventListener('click', function () {
    save.sound = !save.sound; persist(); soundLabel();
    if (save.sound) { startAudio(); setTimeout(function () { chime(2, 0.12); }, 150); say('Sound on', 'If you can’t hear anything, turn your volume up' + (/iphone|ipad/i.test(navigator.userAgent) ? ' and check the silent switch.' : '.'), 3500); }
    else stopAudio();
  });

  var QUOTES = [
    'You don’t have to fix everything tonight.',
    'Slow is still moving.',
    'Notice one small moment today, and turn toward it.',
    'Your breath is always there to come back to.',
    'Be as kind to yourself as you’d be to a friend.',
    'Rest is part of the work.',
    'Say one specific thank-you before bed.',
    'Feelings are weather. They pass.'
  ];
  // Full screen: hide the site header (and use the browser's full screen where it has one)
  var fullBtn = document.getElementById('ng-full');
  function setFull(on) {
    document.documentElement.classList.toggle('ng-full', on);
    fullBtn.setAttribute('aria-pressed', String(on));
    fullBtn.innerHTML = on ? '&#10530; Show the menu' : '&#10530; Full screen';
    window.scrollTo(0, 0); resize();
  }
  if (fullBtn) {
    fullBtn.addEventListener('click', function () {
      var on = !document.documentElement.classList.contains('ng-full');
      setFull(on);
      var d = document.documentElement;
      try {
        if (on && d.requestFullscreen && !document.fullscreenElement) d.requestFullscreen().catch(function () {});
        else if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
      } catch (e) {}
    });
    document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && document.documentElement.classList.contains('ng-full')) setFull(false); });
  }

  // Dedicate a new constellation to someone. The name stays in this browser only.
  var dedCard = document.getElementById('ng-dedicate');
  function askDedication(id, title) {
    if (!dedCard || mode !== 'fireflies') return;
    document.getElementById('ng-ded-title').textContent = title + ' is in your sky now.';
    var inp = document.getElementById('ng-ded-name'); inp.value = '';
    dedCard.hidden = false; dedCard.setAttribute('data-id', id); inp.focus();
  }
  if (dedCard) {
    var dedDone = function (keep) {
      var id = dedCard.getAttribute('data-id'), name = document.getElementById('ng-ded-name').value.trim().slice(0, 30);
      if (keep && name) { save.dedic = save.dedic || {}; save.dedic[id] = name; persist(); say('For ' + name + ' \u2665', 'Look for it in your sky whenever you visit.', 3500); }
      dedCard.hidden = true;
    };
    document.getElementById('ng-ded-save').addEventListener('click', function () { dedDone(true); });
    document.getElementById('ng-ded-skip').addEventListener('click', function () { dedDone(false); });
    document.getElementById('ng-ded-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') dedDone(true); if (e.key === 'Escape') dedDone(false); });
  }

  var closeCard = document.getElementById('ng-close');
  document.getElementById('ng-leave').addEventListener('click', function () {
    document.getElementById('ng-quote').textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    closeCard.hidden = false; stopAudio(); document.getElementById('ng-stay').focus();
  });
  function stay() { closeCard.hidden = true; if (save.sound) startAudio(); document.getElementById('ng-leave').focus(); }
  document.getElementById('ng-stay').addEventListener('click', stay);
  closeCard.addEventListener('keydown', function (e) { if (e.key === 'Escape') stay(); });

  // Welcome, then into the garden
  var welcome = document.getElementById('ng-welcome');
  if (returning) {
    document.getElementById('ng-welcome-h').textContent = 'Welcome back';
    document.getElementById('ng-welcome-p').textContent = (gifted ? 'While you were away, ' + gifted + (gifted === 1 ? ' new flower' : ' new flowers') + ' opened on their own. ' : '') +
      'Your garden has ' + save.flowers.length + (save.flowers.length === 1 ? ' flower' : ' flowers') + (save.consts.length ? ' and ' + save.consts.length + (save.consts.length === 1 ? ' constellation' : ' constellations') + ' in its sky' : '') + '. Stay as long as you like.';
  }
  document.querySelectorAll('[data-enter]').forEach(function (b) {
    b.addEventListener('click', function () { welcome.hidden = true; if (save.sound) startAudio(); setMode(b.getAttribute('data-enter')); });
  });

  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) { lastT = performance.now(); kick(); if (audio && save.sound) audio.ctx.resume(); }
    else { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } if (audio) audio.ctx.suspend(); }
  });
  window.addEventListener('resize', function () { var w0 = W; resize(); if (mode === 'fireflies' && Math.abs(W - w0) > 1) newShape(); });

  resize(); soundLabel(); updateCount();
  kick();
  // Expose a tiny hook for testing
  window.__nightGarden = { save: save, setMode: setMode, pondKey: pondKey, get targets() { return targets; }, get mode() { return mode; }, get board() { return board; }, get piece() { return piece; }, get audio() { return audio; } };
})();
