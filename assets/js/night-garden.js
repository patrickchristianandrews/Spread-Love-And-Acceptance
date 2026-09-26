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
  function startAudio() {
    if (audio) { audio.ctx.resume(); audio.master.gain.setTargetAtTime(0.32, audio.ctx.currentTime, 1.2); return; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    var ac = new AC(), master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
    var verb = ac.createDelay(1); verb.delayTime.value = 0.32; var fb = ac.createGain(); fb.gain.value = 0.38;
    var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    verb.connect(lp); lp.connect(fb); fb.connect(verb); lp.connect(master);
    var pad = ac.createGain(); pad.gain.value = 0.05; var pf = ac.createBiquadFilter(); pf.type = 'lowpass'; pf.frequency.value = 700;
    pad.connect(pf); pf.connect(master);
    [130.81, 196, 261.63, 329.63].forEach(function (fq, i) {
      var o = ac.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = fq; o.detune.value = (i - 1.5) * 4;
      var g = ac.createGain(); g.gain.value = i === 3 ? 0.35 : 0.6; o.connect(g); g.connect(pad); o.start();
    });
    var lfo = ac.createOscillator(), lfoG = ac.createGain(); lfo.frequency.value = 0.05; lfoG.gain.value = 250; lfo.connect(lfoG); lfoG.connect(pf.frequency); lfo.start();
    audio = { ctx: ac, master: master, verb: verb, pad: pad };
    master.gain.setTargetAtTime(0.32, ac.currentTime, 1.2);
  }
  function stopAudio() { if (audio) audio.master.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.4); }
  function chime(i, vol) {
    if (!audio || !save.sound) return;
    var ac = audio.ctx, t = ac.currentTime, f = NOTES[((i % NOTES.length) + NOTES.length) % NOTES.length];
    var o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = f; o2.frequency.value = f * 2; o2.detune.value = 6;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime((vol || 0.12), t + 0.02); g.gain.exponentialRampToValueAtTime(0.0008, t + 2.6);
    var g2 = ac.createGain(); g2.gain.value = 0.25; o2.connect(g2); g2.connect(g);
    o.connect(g); g.connect(audio.master); g.connect(audio.verb); o.start(t); o2.start(t); o.stop(t + 2.8); o2.stop(t + 2.8);
  }
  function padSwell(level) { if (audio && save.sound) audio.pad.gain.setTargetAtTime(0.03 + level * 0.05, audio.ctx.currentTime, 0.8); }

  // ---------- Modes ----------
  var mode = null, sayTimer = null;
  function say(text, sub, ms) {
    sayEl.innerHTML = text ? text + (sub ? '<small>' + sub + '</small>' : '') : '';
    sayEl.style.opacity = text ? 1 : 0;
    clearTimeout(sayTimer); if (ms) sayTimer = setTimeout(function () { sayEl.style.opacity = 0; }, ms);
  }
  function setMode(m) {
    mode = m;
    document.querySelectorAll('.ng-bar [data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === m)); });
    padEl.hidden = m !== 'pond';
    flies.forEach(function (f) { f.home = null; });
    if (m === 'breathe') { breath.start = performance.now(); breath.count = 0; say('Follow the light', 'Breathe in as it grows, out as it softens.', 0); }
    if (m === 'fireflies') { newShape(); say('Guide the fireflies', 'Touch or move over each faint point, and a firefly will settle there.', 6000); }
    if (m === 'pond') { pondReset(); say('Float the lily pads', 'Fill a row across the pond and it blooms. There’s no hurry, and no way to lose.', 6000); }
    updateCount();
  }

  // Breathe: 4 seconds in, 6 seconds out
  var breath = { start: 0, count: 0, phase: '' };
  function drawBreath(t) {
    var el = (t - breath.start) / 1000; if (el < 0) return;
    var cyc = el % 10, n = Math.floor(el / 10);
    var k = cyc < 4 ? ease(cyc / 4) : 1 - ease((cyc - 4) / 6);
    var ph = cyc < 4 ? 'in' : 'out';
    if (ph !== breath.phase) {
      breath.phase = ph;
      if (ph === 'in' && n > 0 && n > breath.count) { breath.count = n; bloom(); }
      if (breath.count >= 6 && breath.count % 6 === 0 && ph === 'in') say('Six slow breaths. Lovely.', 'Keep going as long as you like, or try the fireflies.', 0);
      else say(ph === 'in' ? 'Breathe in…' : 'And out…', breath.count ? breath.count + (breath.count === 1 ? ' breath' : ' breaths') + ' tonight' : '', 0);
      padSwell(ph === 'in' ? 1 : 0);
    }
    var cx = W * 0.5, cy = H * 0.34, R = Math.min(W, H) * 0.075 * (0.7 + 0.5 * k);
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 3);
    g.addColorStop(0, 'rgba(255,238,210,' + (0.55 + 0.3 * k) + ')'); g.addColorStop(0.35, 'rgba(249,217,184,' + (0.35 + 0.2 * k) + ')'); g.addColorStop(1, 'rgba(217,200,240,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,248,232,0.9)'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.55, 0, Math.PI * 2); ctx.fill();
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
    kite: { name: 'a kite', closed: true, pts: [[0.5, 0.1], [0.78, 0.42], [0.5, 0.9], [0.22, 0.42]] }
  };
  var SHAPE_IDS = Object.keys(SHAPES), shape = null, targets = [], shapeDone = 0, dwell = null;
  function newShape() {
    var pool = SHAPE_IDS.filter(function (id) { return !shape || id !== shape.id; });
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
    targets.forEach(function (p) {
      if (p.done) return;
      var pulse = REDUCED ? 0.5 : 0.4 + 0.3 * Math.sin(t / 500 + p.x);
      ctx.strokeStyle = 'rgba(230,255,170,' + pulse + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.stroke();
    });
    if (mode === 'fireflies' && wand.active) {
      var wg = ctx.createRadialGradient(wand.x, wand.y, 0, wand.x, wand.y, 30); wg.addColorStop(0, 'rgba(255,255,230,0.25)'); wg.addColorStop(1, 'rgba(255,255,230,0)');
      ctx.fillStyle = wg; ctx.beginPath(); ctx.arc(wand.x, wand.y, 30, 0, Math.PI * 2); ctx.fill();
    }
    if (shapeDone && t - shapeDone > 3200) newShape();
  }
  function fireflyTick(t) {
    if (mode !== 'fireflies' || !wand.active || shapeDone) return;
    var near = null;
    targets.forEach(function (p) { if (!p.done && Math.hypot(p.x - wand.x, p.y - wand.y) < 30) near = p; });
    if (!near) { dwell = null; return; }
    if (!dwell || dwell.p !== near) { dwell = { p: near, t: t }; return; }
    if (t - dwell.t > (REDUCED ? 250 : 350)) {
      var free = flies.filter(function (f) { return !f.home; });
      var f = free.length ? free.reduce(function (a, b) { return Math.hypot(a.x * W - near.x, a.y * H - near.y) < Math.hypot(b.x * W - near.x, b.y * H - near.y) ? a : b; }) : null;
      if (f) f.home = near;
      near.done = true; dwell = null;
      var i = targets.indexOf(near); chime(i, 0.08);
      if (targets.every(function (p) { return p.done; })) {
        shapeDone = t; [0, 2, 4, 5].forEach(function (n, k) { setTimeout(function () { chime(n, 0.1); }, k * 160); });
        var first = save.consts.indexOf(shape.id) === -1;
        if (first) { save.consts.push(shape.id); persist(); }
        say('You made ' + shape.def.name + '.', first ? 'It joins your sky. Look up next time you visit.' : 'Another one is on its way.', 3000);
        updateCount();
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
    if (!clearing && t > dropAt) { step(); dropAt = t + 1100; }
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
    if (!clearing) piece.cells.forEach(function (c) { var y = c[1] + piece.y; if (y >= 0) lily(bx + (c[0] + piece.x) * cell, by + y * cell, piece.c, piece.hasFlower, 1, true); });
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
    drawFlies(t, dt);
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
    if (!closeCard.hidden || !welcome.hidden || stage.getBoundingClientRect().bottom < window.innerHeight * 0.5) return;
    if (mode === 'pond' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].indexOf(e.key) !== -1 && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) { e.preventDefault(); pondKey(e.key); }
    if (mode === 'fireflies' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) !== -1 && !/INPUT|TEXTAREA/.test(e.target.tagName)) {
      e.preventDefault(); if (!wand.active) { wand.x = W / 2; wand.y = H * 0.3; wand.active = true; }
      var d = 18; if (e.key === 'ArrowLeft') wand.x -= d; if (e.key === 'ArrowRight') wand.x += d; if (e.key === 'ArrowUp') wand.y -= d; if (e.key === 'ArrowDown') wand.y += d;
    }
  });
  padEl.querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { pondKey(b.getAttribute('data-key')); }); });
  document.querySelectorAll('.ng-bar [data-mode]').forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); }); });

  var soundBtn = document.getElementById('ng-sound');
  function soundLabel() { soundBtn.setAttribute('aria-pressed', String(!!save.sound)); soundBtn.innerHTML = save.sound ? '&#127925; Sound on' : '&#127925; Sound off'; }
  soundBtn.addEventListener('click', function () { save.sound = !save.sound; persist(); soundLabel(); if (save.sound) startAudio(); else stopAudio(); });

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
  document.getElementById('ng-enter').addEventListener('click', function () {
    welcome.hidden = true; if (save.sound) startAudio(); setMode('breathe');
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
  window.__nightGarden = { save: save, setMode: setMode, pondKey: pondKey, get targets() { return targets; }, get mode() { return mode; }, get board() { return board; }, get piece() { return piece; } };
})();
