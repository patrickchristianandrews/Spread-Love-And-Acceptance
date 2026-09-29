/* night-garden.js — The Night Garden (/night-garden.html)

   A calm garden at night with three gentle activities:
     Breathe   — a light swells for 4 seconds and softens for 6 (about six breaths a
                 minute); each full breath blooms a flower and lets a lantern rise.
     Fireflies — guide fireflies to faint points until a constellation lights up.
     Lily pond — a slow, forgiving falling-shapes puzzle. No timer, no losing: if the
                 pond fills, it simply settles and starts fresh.
   The garden remembers flowers, lilies and constellations in this browser only
   (localStorage). The moon follows the real moon; the season follows the calendar.
   Nothing is sent anywhere. Sound is off until the visitor turns it on (the choice is kept on
   this device), it never starts while a card covers the garden, and the site's Quiet mode keeps it
   off. "Keep the page still" (or the device asking for less motion) stills the garden. */
(function () {
  'use strict';

  var stage = document.getElementById('ng-stage'), canvas = document.getElementById('ng-canvas');
  if (!stage || !canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var sayEl = document.getElementById('ng-say'), countEl = document.getElementById('ng-count');
  var padEl = document.getElementById('ng-pad');
  function stillNow() {
    return !!((window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
      (window.TOLStill && window.TOLStill.on()) || document.documentElement.classList.contains('tol-still'));
  }
  var REDUCED = stillNow();
  document.addEventListener('tol-still', function () { REDUCED = stillNow(); });
  function quietNow() { try { return !!(window.TOLQuiet && window.TOLQuiet.on()); } catch (e) { return false; } }
  // Backdrop mode (garden-backdrop.html, behind Pause & Play): silent, no buttons, and it
  // never changes the visitor's saved garden.
  var AMBIENT = document.documentElement.hasAttribute('data-ambient');
  // Behind the pages, each part of the site has its own scene (garden, beach, lake, meadow,
  // river, forest), lit by the visitor's own clock: dawn, day, golden hour, dusk or night.
  // The Night Garden itself is always night.
  var QS = (function () { var o = {}; location.search.replace(/[?&]([a-z]+)=([a-z]+)/g, function (_, k, v) { o[k] = v; }); return o; })();
  var SCENE = AMBIENT && /^(garden|beach|lake|meadow|river|forest)$/.test(QS.scene || '') ? QS.scene : 'garden';
  // behind a page, the page can name a spot the dogs shouldn't run through (the pal cam button): { l, t, r, b } in page pixels
  var AVOID = null;
  if (AMBIENT) window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data || !('tolAvoid' in e.data)) return;
    var a = e.data.tolAvoid; AVOID = a && isFinite(a.l) && isFinite(a.t) && isFinite(a.r) && isFinite(a.b) ? a : null;
  });
  function todNow() {
    if (!AMBIENT) return 'night';
    if (/^(dawn|day|golden|dusk|night)$/.test(QS.tod || '')) return QS.tod;
    var d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    return h < 5 ? 'night' : h < 7.5 ? 'dawn' : h < 16.5 ? 'day' : h < 19 ? 'golden' : h < 21 ? 'dusk' : 'night';
  }
  var TOD = todNow();
  var NIGHTNESS = { night: 1, dusk: 0.7, dawn: 0.3, golden: 0.2, day: 0.08 };

  // ---------- Saved garden (this browser only) ----------
  var KEY = 'tol-night-garden-v1';
  var save = { flowers: [], lilies: 0, consts: [], days: [], breaths: 0, sound: true }, mutedThisVisit = false;
  try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); for (var k in o) save[k] = o[k]; } } catch (e) {}
  // sound is on only if the visitor turned it on (save.snd), never by default, and never in Quiet mode
  save.sound = save.snd === 'on' && !quietNow();
  function persist() { if (AMBIENT) return; try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }
  // ---------- Variety: what this browser has already seen ----------
  // Every picture, pond layout, breathing pattern, sky word, parting thought and kind of night is chosen
  // so it doesn't repeat what this visitor saw recently. The lists live in the same saved garden
  // (this browser only), trimmed so they stay small.
  if (!save.variety || typeof save.variety !== 'object' || Array.isArray(save.variety)) save.variety = {};
  function seenList(k) { var v = save.variety; if (!Array.isArray(v[k])) v[k] = []; return v[k]; }
  function markSeen(k, key, cap) { var l = seenList(k), i = l.indexOf(key); if (i >= 0) l.splice(i, 1); l.push(key); cap = cap || 300; if (l.length > cap) l.splice(0, l.length - cap); persist(); }
  function mulberry(a) { a = a >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var vr = mulberry((Date.now() ^ Math.floor(Math.random() * 4294967295)) >>> 0);
  // pick from a list, preferring things not among the most recent `recent` seen under key k
  function pickFresh(list, k, idOf, recent) {
    var l = seenList(k), rec = l.slice(-(recent == null ? Math.floor(list.length / 2) : recent));
    var pool = list.filter(function (x) { return rec.indexOf(idOf(x)) < 0; });
    if (!pool.length) pool = list;
    return pool[Math.floor(vr() * pool.length)];
  }
  function hashStr(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  var today = new Date(); var todayKey = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
  // ---------- Season and moon ----------
  var month = today.getMonth(); // 0-11
  var SEASON = month >= 2 && month <= 4 ? 'spring' : month >= 5 && month <= 7 ? 'summer' : month >= 8 && month <= 10 ? 'autumn' : 'winter';
  var HUES = { spring: [330, 350, 290, 50, 200], summer: [20, 45, 340, 280, 190], autumn: [25, 35, 10, 45, 330], winter: [230, 260, 290, 200, 320] }[SEASON];
  var moonPhase = (function () { // 0 = new, 0.5 = full
    var ref = Date.UTC(2000, 0, 6, 18, 14), syn = 29.530588853;
    var d = (Date.now() - ref) / 864e5; return ((d % syn) + syn) % syn / syn;
  })();

  var returning = save.days.length > 0, gifted = 0, planted = null;
  try { planted = JSON.parse(localStorage.getItem('tol-garden-gifts') || 'null'); } catch (e) {}
  if (!returning && !save.flowers.length) { for (var s0 = 0; s0 < 7; s0++) addFlower(true); } // a few blooms to welcome a first visit
  if (!AMBIENT && save.days.indexOf(todayKey) === -1) {
    // A new day: a few buds open on their own. Missing days never costs anything.
    if (returning) { gifted = Math.min(3, 1 + Math.floor(Math.random() * 3)); for (var g = 0; g < gifted; g++) addFlower(true); }
    save.days.push(todayKey); if (save.days.length > 400) save.days = save.days.slice(-400); persist();
  }
  // flowers planted by calm moments elsewhere on the site
  var plantedLine = '';
  if (!AMBIENT && planted && planted.count > 0) {
    for (var pg = 0; pg < Math.min(24, planted.count); pg++) addFlower(true);
    var NAMES = { breathe: ['breathing break', 'breathing breaks'], words: ['Quiet Words puzzle', 'Quiet Words puzzles'], kindness: ['kind moment', 'kind moments'], weather: ['weather check-in', 'weather check-ins'] };
    var bits = Object.keys(planted.from || {}).filter(function (k) { return NAMES[k]; }).map(function (k) { var n = planted.from[k]; return n + ' from ' + (n === 1 ? 'a ' + NAMES[k][0] : 'your ' + NAMES[k][1]); });
    plantedLine = planted.count + (planted.count === 1 ? ' new flower' : ' new flowers') + ' grew from your calm moments' + (bits.length ? ': ' + bits.join(', ') : '') + '. ';
    persist();
    try { localStorage.removeItem('tol-garden-gifts'); } catch (e) {}
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
  // a different sky every night: the stars and the soft clouds are seeded by the date
  var NIGHT_SEED = hashStr(todayKey + (AMBIENT ? QS.scene || '' : ''));
  // and a different kind of night on each visit, never the same as the last two
  var TONIGHTS = [
    { id: 'clear', line: 'Tonight the sky is clear and full of stars.' },
    { id: 'mist', line: 'Tonight a soft mist is resting over the meadow.' },
    { id: 'motes', line: 'Tonight little lights are drifting up from the grass.' },
    { id: 'twinkle', line: 'Tonight the stars are twinkling brightly.' },
    { id: 'meteors', line: 'Tonight is a night for shooting stars. Keep an eye on the sky.' },
    { id: 'breeze', line: 'Tonight a gentle breeze is carrying petals across the garden.' }
  ];
  var TONIGHT = AMBIENT && (SCENE !== 'garden' || TOD !== 'night') ? TONIGHTS[0] : pickFresh(TONIGHTS, 'a', function (x) { return x.id; }, 2);
  if (!AMBIENT) markSeen('a', TONIGHT.id, 12);
  var SHOOT = TONIGHT.id === 'meteors' ? 0.45 : 1;
  var stars = (function () { var r = rng(1 + NIGHT_SEED % 2147483645), a = [], n = 150 + NIGHT_SEED % 50; for (var i = 0; i < n; i++) a.push({ x: r(), y: r() * 0.58, s: 0.4 + r() * 1.3, p: r() * 6.28 }); return a; })();

  function drawBackground() {
    bg = document.createElement('canvas'); bg.width = canvas.width; bg.height = canvas.height;
    var b = bg.getContext('2d'); b.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (SCENE !== 'garden' || TOD !== 'night') return drawScene(b);
    var sky = b.createLinearGradient(0, 0, 0, H * 0.7);
    sky.addColorStop(0, '#171A34'); sky.addColorStop(0.45, '#2E2F5C'); sky.addColorStop(0.8, '#5C4A78'); sky.addColorStop(1, '#C98E8E');
    b.fillStyle = sky; b.fillRect(0, 0, W, H);
    // soft watercolour clouds
    var cr = rng(1 + (NIGHT_SEED >>> 3) % 2147483645);
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

  // ---------- Scenes and the time of day (behind the pages) ----------
  var SKIES = {
    dawn: ['#7482BD', '#C9A7CF', '#F6C6B8', '#FFE4C6'], day: ['#8EC5EA', '#B3D8F1', '#DAEEF9', '#F3F9F4'],
    golden: ['#7D9BCF', '#E6B6AA', '#F6CD9F', '#FCE6C0'], dusk: ['#2F3566', '#665890', '#C38AA6', '#F0B69A'], night: ['#171A34', '#2E2F5C', '#5C4A78', '#C98E8E']
  };
  var TINT = { dawn: ['#E9C9D8', 0.16], day: ['#FFFFFF', 0], golden: ['#F2C48E', 0.2], dusk: ['#3A3560', 0.42], night: ['#1B1F3C', 0.62] };
  function hexRgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function tint(hex) { var a = hexRgb(hex), t = TINT[TOD], c = hexRgb(t[0]), k = t[1]; return 'rgb(' + a.map(function (v, i) { return Math.round(v + (c[i] - v) * k); }).join(',') + ')'; }
  function band(b, y0, amp, freq, ph, col) {
    b.fillStyle = col; b.beginPath(); b.moveTo(0, H);
    for (var x = 0; x <= W + 10; x += 10) b.lineTo(x, H * y0 + Math.sin(x / W * Math.PI * freq + ph) * H * amp + Math.sin(x / W * 11 + ph * 2) * H * 0.005);
    b.lineTo(W, H); b.closePath(); b.fill();
  }
  function drawScene(b) {
    var sk = SKIES[TOD], g = b.createLinearGradient(0, 0, 0, H * 0.7);
    g.addColorStop(0, sk[0]); g.addColorStop(0.45, sk[1]); g.addColorStop(0.8, sk[2]); g.addColorStop(1, sk[3]);
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    // the sun, where it is at this time of day
    var sun = { dawn: [0.2, 0.5, '255,214,170'], day: [0.8, 0.13, '255,250,225'], golden: [0.82, 0.4, '255,196,130'], dusk: [0.74, 0.56, '255,170,140'] }[TOD];
    if (sun) {
      var sx = W * sun[0], sy = H * sun[1], sr = Math.min(W, H) * 0.05, sg = b.createRadialGradient(sx, sy, 0, sx, sy, sr * 6);
      sg.addColorStop(0, 'rgba(' + sun[2] + ',0.9)'); sg.addColorStop(0.18, 'rgba(' + sun[2] + ',0.55)'); sg.addColorStop(1, 'rgba(' + sun[2] + ',0)');
      b.fillStyle = sg; b.fillRect(0, 0, W, H);
      if (TOD !== 'dusk') { b.fillStyle = 'rgba(' + sun[2] + ',0.95)'; b.beginPath(); b.arc(sx, sy, sr, 0, Math.PI * 2); b.fill(); }
    }
    var cr = rng(7), cloudC = { dawn: '255,228,236', day: '255,255,255', golden: '255,226,204', dusk: '230,180,210', night: '185,160,224' }[TOD];
    for (var i = 0; i < 7; i++) {
      var cx = cr() * W, cy = H * (0.1 + cr() * 0.35), rad = Math.max(W, H) * (0.1 + cr() * 0.12), cg = b.createRadialGradient(cx, cy, 0, cx, cy, rad);
      cg.addColorStop(0, 'rgba(' + cloudC + ',' + (TOD === 'night' ? 0.1 : 0.28) + ')'); cg.addColorStop(1, 'rgba(' + cloudC + ',0)');
      b.fillStyle = cg; b.fillRect(0, 0, W, H);
    }
    var r = rng(11), p = pondShape(), water = ['#9FD3EE', '#7BBBE0', '#6AA7CF'];
    if (SCENE === 'beach') {
      // the sea to the horizon, gentle foam, a far sailboat, then warm sand
      var sea = b.createLinearGradient(0, H * 0.57, 0, H * 0.72);
      sea.addColorStop(0, tint('#7DB9DA')); sea.addColorStop(1, tint('#A9DCE8'));
      b.fillStyle = sea; b.fillRect(0, H * 0.575, W, H * 0.16);
      b.strokeStyle = 'rgba(255,255,255,' + (TOD === 'night' ? 0.12 : 0.4) + ')'; b.lineWidth = 1.2;
      for (var fl = 0; fl < 7; fl++) { var fy = H * (0.6 + fl * 0.016); b.beginPath(); for (var fx = 0; fx <= W; fx += 12) b.lineTo(fx, fy + Math.sin(fx / 40 + fl) * 1.5); b.globalAlpha = 0.4 + fl * 0.08; b.stroke(); b.globalAlpha = 1; }
      var bx = W * 0.3, by = H * 0.585; b.fillStyle = tint('#F6F1E6'); b.beginPath(); b.moveTo(bx, by - 18); b.lineTo(bx, by - 2); b.lineTo(bx + 12, by - 2); b.closePath(); b.fill();
      b.fillStyle = tint('#C9876A'); b.fillRect(bx - 7, by - 2, 18, 3);
      band(b, 0.69, 0.012, 2.2, 0.4, tint('#F1DDB8')); band(b, 0.76, 0.01, 1.4, 1.1, tint('#EBD2A6'));
      b.fillStyle = tint('#E6C999'); for (var sh = 0; sh < 26; sh++) { b.beginPath(); b.ellipse(r() * W, H * (0.74 + r() * 0.24), 1.6 + r() * 2.4, 1 + r(), r() * 3, 0, Math.PI * 2); b.fill(); }
      water = ['#A6DCEB', '#86C8E0', '#72B3D2'];
    } else if (SCENE === 'lake') {
      // mountains with snowy tops, a wide still lake, and the near shore
      [[tint('#9DA8C8'), 0.44, 0.1, 5], [tint('#8697B8'), 0.5, 0.08, 7]].forEach(function (m, n) {
        b.fillStyle = m[0]; b.beginPath(); b.moveTo(0, H * 0.62); var peaks = m[3];
        for (var k = 0; k <= peaks; k++) { var px = W * k / peaks, py = H * (m[1] + (k % 2 ? 0 : m[2]) + r() * 0.04); b.lineTo(px, py); if (n === 0 && k % 2) { b.save(); b.restore(); } }
        b.lineTo(W, H * 0.62); b.closePath(); b.fill();
      });
      b.fillStyle = 'rgba(255,255,255,' + (TOD === 'night' ? 0.15 : 0.55) + ')';
      for (var k2 = 1; k2 <= 5; k2 += 2) { var px2 = W * k2 / 5, py2 = H * 0.44 + 2; b.beginPath(); b.moveTo(px2, py2); b.lineTo(px2 - W * 0.035, py2 + H * 0.035); b.lineTo(px2 + W * 0.035, py2 + H * 0.035); b.closePath(); b.fill(); }
      var lake = b.createLinearGradient(0, H * 0.6, 0, H * 0.7); lake.addColorStop(0, tint('#9CC8E4')); lake.addColorStop(1, tint('#7FB0D4'));
      b.fillStyle = lake; b.fillRect(0, H * 0.6, W, H * 0.1);
      b.strokeStyle = 'rgba(255,255,255,' + (TOD === 'night' ? 0.1 : 0.35) + ')'; b.lineWidth = 1;
      for (var lr = 0; lr < 10; lr++) { var ly = H * (0.61 + r() * 0.08), lx = r() * W; b.beginPath(); b.moveTo(lx, ly); b.lineTo(lx + 20 + r() * 50, ly); b.stroke(); }
      band(b, 0.69, 0.01, 2.4, 0.2, tint('#9CC79A')); band(b, 0.78, 0.012, 1.6, 1.3, tint('#86B887'));
    } else if (SCENE === 'river') {
      band(b, 0.55, 0.035, 1.4, 0.3, tint('#A6C4C0')); band(b, 0.6, 0.04, 2.2, 1.2, tint('#98BFA4'));
      band(b, 0.675, 0.012, 3, 0.7, tint('#A5CF96'));
      // the river winds down from the hills into the pond
      var rv = b.createLinearGradient(0, H * 0.6, 0, H * 0.9); rv.addColorStop(0, tint('#B7DCEF')); rv.addColorStop(1, tint('#86C1E2'));
      b.fillStyle = rv; b.beginPath();
      b.moveTo(W * 0.6, H * 0.6); b.bezierCurveTo(W * 0.72, H * 0.68, W * 0.3, H * 0.72, p.x - p.rx * 0.5, p.y - p.ry * 0.3);
      b.lineTo(p.x + p.rx * 0.5, p.y - p.ry * 0.3); b.bezierCurveTo(W * 0.5, H * 0.73, W * 0.8, H * 0.67, W * 0.62, H * 0.6); b.closePath(); b.fill();
      b.strokeStyle = 'rgba(255,255,255,0.35)'; b.lineWidth = 1;
      for (var rr = 0; rr < 8; rr++) { var ry = H * (0.66 + rr * 0.025), rx = W * (0.5 + Math.sin(rr) * 0.08); b.beginPath(); b.moveTo(rx, ry); b.lineTo(rx + 14, ry + 1); b.stroke(); }
    } else if (SCENE === 'forest') {
      band(b, 0.56, 0.03, 1.3, 0.8, tint('#9DB5B2'));
      // rows of soft pines, far to near
      [[0.58, '#7FA39A', 0.05, 26], [0.63, '#6B967F', 0.065, 18]].forEach(function (row) {
        b.fillStyle = tint(row[1]);
        for (var tx = -10; tx < W + 20; tx += row[3] + r() * row[3]) { var th = H * row[2] * (0.7 + r() * 0.6), ty = H * row[0] + r() * H * 0.02; b.beginPath(); b.moveTo(tx, ty - th); b.lineTo(tx + th * 0.32, ty); b.lineTo(tx - th * 0.32, ty); b.closePath(); b.fill(); }
      });
      band(b, 0.675, 0.012, 3, 0.4, tint('#97C290'));
    } else { // garden or meadow: rolling hills and a flowery meadow
      band(b, 0.57, 0.035, 1.3, 0, tint(SCENE === 'meadow' ? '#B3CBB4' : '#AFC0CF')); band(b, 0.61, 0.045, 2.1, 1, tint(SCENE === 'meadow' ? '#A2C79C' : '#9FBCAE'));
      band(b, 0.655, 0.03, 3.4, 2, tint(SCENE === 'meadow' ? '#96C58A' : '#94B99A'));
      band(b, 0.675, 0.012, 1.65, 0, tint(SCENE === 'meadow' ? '#A4D292' : '#9CC794'));
      if (SCENE === 'meadow') for (var fdot = 0; fdot < 140; fdot++) {
        var dx = r() * W, dy = H * (0.66 + r() * 0.33), hue = [340, 48, 280, 200, 20][fdot % 5];
        if (inPond(dx / W, dy / H)) continue;
        b.fillStyle = 'hsla(' + hue + ',70%,' + (TOD === 'night' ? 45 : 80) + '%,0.9)'; b.beginPath(); b.arc(dx, dy, 1.4 + r() * 1.8 * (dy / H), 0, Math.PI * 2); b.fill();
      }
    }
    // the pond, in daylight colours
    var pg = b.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.rx);
    pg.addColorStop(0, tint(water[0])); pg.addColorStop(0.7, tint(water[1])); pg.addColorStop(1, tint(water[2]));
    b.fillStyle = pg; b.beginPath(); b.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2); b.fill();
    b.strokeStyle = 'rgba(255,255,255,0.25)'; b.lineWidth = 2; b.stroke();
  }
  // check the clock now and then, so the light changes through the day
  if (AMBIENT) setInterval(function () { var t2 = todNow(); if (t2 !== TOD) { TOD = t2; drawBackground(); } }, 5 * 60 * 1000);
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
    var NIGHT = NIGHTNESS[TOD];
    if (NIGHT < 0.5) drawDaySky(t);
    if (NIGHT < 0.25) return;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], a = (REDUCED ? 0.6 : TONIGHT.id === 'twinkle' ? 0.4 + 0.5 * Math.sin(t / 650 + s.p * 3) : 0.45 + 0.35 * Math.sin(t / 1400 + s.p)) * (NIGHT < 1 ? NIGHT * 0.6 : 1);
      ctx.fillStyle = 'rgba(255,248,230,' + a.toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.s, 0, Math.PI * 2); ctx.fill();
    }
    // constellations earned on earlier visits, faintly
    save.consts.forEach(function (id, n) {
      var shape = SHAPES[id]; if (!shape) return;
      var cx = W * (0.08 + (n % 7) * 0.14), cy = H * (0.08 + Math.floor(n / 7) * 0.075), sz = Math.min(W, H) * 0.045;
      ctx.strokeStyle = 'rgba(255,240,210,0.16)'; ctx.lineWidth = 1;
      tracePath(shape.pts.map(function (p) { return [cx + (p[0] - 0.5) * sz, cy + (p[1] - 0.5) * sz]; }), shape.parts); ctx.stroke();
      shape.pts.forEach(function (p) { ctx.fillStyle = 'rgba(255,240,210,0.5)'; ctx.beginPath(); ctx.arc(cx + (p[0] - 0.5) * sz, cy + (p[1] - 0.5) * sz, 1.3, 0, Math.PI * 2); ctx.fill(); });
      var who = save.dedic && save.dedic[id];
      if (who) {
        // a dedicated constellation: its lines a little brighter, and the name clear and warm beneath it
        ctx.strokeStyle = 'rgba(255,226,170,0.45)'; ctx.lineWidth = 1.2;
        tracePath(shape.pts.map(function (p) { return [cx + (p[0] - 0.5) * sz, cy + (p[1] - 0.5) * sz]; }), shape.parts); ctx.stroke();
        var fs = W < 560 ? 13 : 14, label = '\u2665 ' + who, maxW = Math.min(W * 0.34, 190);
        ctx.save(); ctx.font = '600 ' + fs + 'px Lora, Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        var tw = Math.min(maxW, ctx.measureText(label).width), ty = cy + sz * 0.62;
        cx = Math.max(tw / 2 + 10, Math.min(W - tw / 2 - 10, cx)); // keep the whole name on screen
        ctx.fillStyle = 'rgba(28,31,58,0.62)'; ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(cx - tw / 2 - 6, ty - 3, tw + 12, fs + 7, 9); else ctx.rect(cx - tw / 2 - 6, ty - 3, tw + 12, fs + 7);
        ctx.fill();
        ctx.shadowColor = 'rgba(255,214,150,0.7)'; ctx.shadowBlur = 6; ctx.fillStyle = '#FFE9C2';
        ctx.fillText(label, cx, ty, maxW); ctx.restore();
      }
    });
    // moon with its real phase
    var mx = W * 0.84, my = H * 0.15, mr = Math.min(W, H) * 0.045;
    // on a narrow screen the pond's "Next" box and row count sit top right: the moon rises a little lower there
    if (mode === 'pond' && W < 700 && !AMBIENT) { mx = W * 0.86; my = H * 0.36; }
    if (TOD !== 'night') { ctx.save(); ctx.globalAlpha = TOD === 'dusk' ? 0.55 : 0.3; mx = W * 0.2; my = H * 0.12; }
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
    if (TOD !== 'night') ctx.restore();
  }
  // daytime: soft clouds drifting by, a few birds, and a sparkle on the water
  function drawDaySky(t) {
    var tt = REDUCED ? 0 : t;
    for (var c = 0; c < 4; c++) {
      var cx = ((tt / (260000 + c * 60000) + c * 0.27) % 1.3 - 0.15) * W, cy = H * (0.1 + c * 0.07), cw = Math.min(W, 900) * (0.12 + (c % 2) * 0.05);
      ctx.fillStyle = 'rgba(255,255,255,' + (TOD === 'day' ? 0.55 : 0.35) + ')';
      [[0, 0, 1], [0.35, -0.25, 0.7], [-0.35, -0.1, 0.65], [0.65, 0.05, 0.55]].forEach(function (q) { ctx.beginPath(); ctx.ellipse(cx + q[0] * cw, cy + q[1] * cw * 0.4, cw * 0.32 * q[2], cw * 0.16 * q[2], 0, 0, Math.PI * 2); ctx.fill(); });
    }
    if (TOD !== 'dusk') {
      ctx.strokeStyle = 'rgba(70,80,110,0.45)'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
      for (var bd = 0; bd < 3; bd++) {
        var bq = (tt / 70000 + bd * 0.13) % 1.4 - 0.2, bx = bq * W, by = H * (0.22 + bd * 0.04) + Math.sin(tt / 3000 + bd) * 6, fl = Math.sin(tt / 180 + bd) * 3;
        ctx.beginPath(); ctx.moveTo(bx - 6, by - fl); ctx.quadraticCurveTo(bx - 3, by - 3, bx, by); ctx.quadraticCurveTo(bx + 3, by - 3, bx + 6, by - fl); ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }
  }

  var lanterns = [];
  function addLantern(x) { lanterns.push({ x: x != null ? x : W * (0.3 + Math.random() * 0.4), y: H * 0.72, vy: 0.25 + Math.random() * 0.2, ph: Math.random() * 6, life: 1 }); }
  function drawLanterns(t, dt) {
    for (var i = lanterns.length - 1; i >= 0; i--) {
      var L = lanterns[i]; L.y -= L.vy * dt * (REDUCED ? 0.03 : 0.06); L.life = Math.min(1, (L.y - H * 0.05) / (H * 0.3));
      if (L.y < H * 0.05) { lanterns.splice(i, 1); continue; }
      var x = L.x + (REDUCED ? 0 : Math.sin(t / 1200 + L.ph) * 8), a = Math.max(0, L.life);
      var hue = extra('garden-rainbow') ? Math.round(L.ph * 57) % 360 : null;
      var glowC = hue == null ? '255,200,130' : hsl2rgb(hue, 0.9, 0.78);
      var g = ctx.createRadialGradient(x, L.y, 0, x, L.y, 26); g.addColorStop(0, 'rgba(' + glowC + ',' + (0.55 * a) + ')'); g.addColorStop(1, 'rgba(' + glowC + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, L.y, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hue == null ? 'rgba(255,214,150,' + (0.95 * a) + ')' : 'hsla(' + hue + ',90%,84%,' + (0.95 * a) + ')'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 5, L.y - 7, 10, 13, 3) : ctx.rect(x - 5, L.y - 7, 10, 13); ctx.fill();
    }
  }

  // Wonders that arrive as you finish levels (rewards.js): koi, paper boats, an aurora, rainbow lanterns
  function extra(id) { return !!(window.TOLRewards && window.TOLRewards.garden(id)); }
  function hasWonder(id) { return extra(id); }

  // ---------- The garden's wonders, arriving as you play ----------
  // A tree with a swing and chimes on the right bank, a blossom tree on the left, fairy lights
  // strung between them, a hammock, a bridge, a balloon, owls, butterflies, meteors, a gazebo.
  function bank(u) { var p = pondShape(), RX = Math.max(p.rx, W * 0.3) * 1.2, gy = Math.min(p.y, H - 14); return { x: p.x + RX * Math.cos(-Math.PI * u), y: gy + p.ry * 1.6 * Math.sin(-Math.PI * u) }; }
  function wScale() { return Math.max(0.8, Math.min(1.4, Math.min(W, H) / 520)); }
  function tree(x, y, s, t, crown, leaf) {
    ctx.fillStyle = '#3A2E2A'; ctx.beginPath(); ctx.moveTo(x - 5 * s, y); ctx.quadraticCurveTo(x - 2 * s, y - 40 * s, x - 3 * s, y - 70 * s); ctx.lineTo(x + 4 * s, y - 70 * s); ctx.quadraticCurveTo(x + 3 * s, y - 40 * s, x + 6 * s, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3A2E2A'; ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - 58 * s); ctx.quadraticCurveTo(x - 20 * s, y - 66 * s, x - 38 * s, y - 64 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 62 * s); ctx.quadraticCurveTo(x + 18 * s, y - 70 * s, x + 34 * s, y - 66 * s); ctx.stroke(); ctx.lineCap = 'butt';
    var sway = REDUCED ? 0 : Math.sin(t / 2600) * 2 * s;
    [[-26, -86, 30], [8, -96, 34], [30, -80, 26], [-6, -74, 28], [-40, -72, 20]].forEach(function (b, i) {
      var g = ctx.createRadialGradient(x + b[0] * s + sway, y + b[1] * s - b[2] * s * 0.3, 2, x + b[0] * s + sway, y + b[1] * s, b[2] * s);
      g.addColorStop(0, crown[0]); g.addColorStop(1, crown[1]);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + b[0] * s + sway, y + b[1] * s, b[2] * s, 0, Math.PI * 2); ctx.fill();
    });
    if (leaf) for (var k = 0; k < 14; k++) { ctx.fillStyle = leaf; ctx.beginPath(); ctx.arc(x + Math.sin(k * 7.3) * 44 * s + sway, y - 84 * s + Math.cos(k * 3.1) * 22 * s, 2.4 * s, 0, Math.PI * 2); ctx.fill(); }
  }
  var petals = [];
  function drawWonders(t, layer) {
    var s = wScale(), A = bank(0.12), B = bank(1.02);
    if (layer === 'sky') {
      if (extra('garden-balloon')) {
        var q = ((t / 140000) % 1), bxx = -60 + q * (W + 120), byy = H * 0.2 + Math.sin(t / 5000) * 10;
        ctx.save(); ctx.translate(bxx, byy); ctx.scale(s, s);
        var cols = ['#F7C9D4', '#F8E7AE', '#C6DFF4', '#D9C8F0'];
        for (var st = 0; st < 4; st++) { ctx.fillStyle = cols[st]; ctx.beginPath(); ctx.ellipse(0, 0, 20 - st * 5, 24, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = 'rgba(255,240,215,.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-8, 20); ctx.lineTo(-5, 34); ctx.moveTo(8, 20); ctx.lineTo(5, 34); ctx.stroke();
        ctx.fillStyle = '#A8792F'; ctx.fillRect(-6, 34, 12, 8); ctx.restore();
      }
      if (extra('garden-meteors') && !REDUCED) {
        var cyc = t % 45000;
        if (cyc < 2600) for (var m = 0; m < 5; m++) {
          var mq = (cyc - m * 380) / 1200; if (mq < 0 || mq > 1) continue;
          var mx = W * (0.15 + m * 0.17) + mq * W * 0.12, my = H * (0.05 + (m % 3) * 0.05) + mq * H * 0.1;
          var gg = ctx.createLinearGradient(mx, my, mx - W * 0.05, my - H * 0.04); gg.addColorStop(0, 'rgba(255,248,230,' + (1 - mq) + ')'); gg.addColorStop(1, 'rgba(255,248,230,0)');
          ctx.strokeStyle = gg; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx - W * 0.05, my - H * 0.04); ctx.stroke();
        }
      }
      if (extra('garden-gazebo')) {
        var gx = W * 0.2, gy = H * 0.6;
        ctx.save(); ctx.translate(gx, gy); ctx.scale(s * 0.9, s * 0.9);
        var gl = ctx.createRadialGradient(0, -18, 2, 0, -18, 46); gl.addColorStop(0, 'rgba(255,214,150,.45)'); gl.addColorStop(1, 'rgba(255,214,150,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, -18, 46, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4B3F52'; ctx.beginPath(); ctx.moveTo(-26, -30); ctx.lineTo(0, -48); ctx.lineTo(26, -30); ctx.closePath(); ctx.fill();
        ctx.fillRect(-22, -30, 3, 30); ctx.fillRect(19, -30, 3, 30); ctx.fillRect(-2, -30, 3, 30); ctx.fillRect(-24, -2, 48, 3);
        ctx.fillStyle = '#FFD99A'; [-14, 10].forEach(function (lx) { ctx.beginPath(); ctx.arc(lx, -24, 2.6, 0, Math.PI * 2); ctx.fill(); });
        ctx.restore();
      }
      return;
    }
    if (layer === 'bank') {
      if (extra('garden-blossom')) tree(B.x, B.y, s, t, ['rgba(250,205,222,.95)', 'rgba(214,138,170,.9)'], 'rgba(255,236,244,.9)');
      if (extra('garden-swing')) {
        tree(A.x, A.y, s, t, ['rgba(92,130,112,.95)', 'rgba(44,72,66,.95)'], null);
        var sw = REDUCED ? 0 : Math.sin(t / 1300) * 0.28, px = A.x - 26 * s, py = A.y - 62 * s, len = 44 * s;
        var ex = px + Math.sin(sw) * len, ey = py + Math.cos(sw) * len;
        ctx.strokeStyle = 'rgba(230,214,190,.85)'; ctx.lineWidth = 1.2 * s;
        ctx.beginPath(); ctx.moveTo(px - 7 * s, py); ctx.lineTo(ex - 7 * s, ey); ctx.moveTo(px + 7 * s, py); ctx.lineTo(ex + 7 * s, ey); ctx.stroke();
        ctx.fillStyle = '#8A6242'; ctx.fillRect(ex - 10 * s, ey - 1.5 * s, 20 * s, 3.5 * s);
      }
      if (extra('garden-chimes') && extra('garden-swing')) {
        var cx0 = A.x + 26 * s, cy0 = A.y - 66 * s, wob = REDUCED ? 0 : Math.sin(t / 900) * 0.08;
        ctx.save(); ctx.translate(cx0, cy0); ctx.rotate(wob);
        ctx.strokeStyle = 'rgba(230,214,190,.7)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 8 * s); ctx.stroke();
        ctx.fillStyle = '#C9B37A'; ctx.fillRect(-7 * s, 8 * s, 14 * s, 2 * s);
        [-5, -2, 1, 4].forEach(function (cx, k) { var gl2 = 0.6 + 0.4 * Math.sin(t / 400 + k); ctx.fillStyle = 'rgba(230,230,240,' + gl2 + ')'; ctx.fillRect(cx * s, 11 * s, 1.6 * s, (10 + k * 3) * s); });
        ctx.restore();
        if (audio && save.sound && mode && !REDUCED && Math.random() < 0.0012) chime(4 + Math.floor(Math.random() * 3), 0.025);
        if (!REDUCED && dogNear(cx0, A.y - 20 * s, 70 * s) && Math.random() < 0.08) { burst(cx0, cy0 + 16 * s, 2, 50, 88); if (audio && save.sound && mode && Math.random() < 0.15) chime(4 + Math.floor(Math.random() * 3), 0.02); }
      }
      if (extra('garden-hammock') && extra('garden-swing')) {
        var h1 = [A.x + 8 * s, A.y - 30 * s], h2 = [Math.min(W - 8, A.x + 70 * s), A.y - 26 * s];
        ctx.strokeStyle = '#6B5242'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(h2[0], A.y); ctx.lineTo(h2[0], h2[1] - 6 * s); ctx.stroke();
        ctx.fillStyle = 'rgba(247,201,212,.9)'; ctx.beginPath(); ctx.moveTo(h1[0], h1[1]); ctx.quadraticCurveTo((h1[0] + h2[0]) / 2, h1[1] + 22 * s + (REDUCED ? 0 : Math.sin(t / 1600) * 2 * s), h2[0], h2[1]);
        ctx.quadraticCurveTo((h1[0] + h2[0]) / 2, h1[1] + 12 * s, h1[0], h1[1]); ctx.fill();
      }
      if (extra('garden-lights')) {
        var L1 = extra('garden-swing') ? [A.x + 30 * s, A.y - 84 * s] : [W * 0.95, H * 0.55], L2 = extra('garden-blossom') ? [B.x - 30 * s, B.y - 84 * s] : [W * 0.05, H * 0.55];
        var mid = [(L1[0] + L2[0]) / 2, Math.max(L1[1], L2[1]) + 40 * s];
        ctx.strokeStyle = 'rgba(40,36,50,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L1[0], L1[1]); ctx.quadraticCurveTo(mid[0], mid[1], L2[0], L2[1]); ctx.stroke();
        for (var k2 = 1; k2 < 24; k2++) {
          var f = k2 / 24, lx = (1 - f) * (1 - f) * L1[0] + 2 * (1 - f) * f * mid[0] + f * f * L2[0], ly = (1 - f) * (1 - f) * L1[1] + 2 * (1 - f) * f * mid[1] + f * f * L2[1];
          var tw = REDUCED ? 0.8 : 0.5 + 0.5 * Math.sin(t / 500 + k2 * 1.7), hue = [48, 345, 200, 120][k2 % 4];
          if (dogNear(lx, ly + 40 * s, 80 * s)) tw = Math.min(1.4, tw + 0.7);
          var lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 7 * s); lg.addColorStop(0, 'hsla(' + hue + ',90%,80%,' + (0.7 * tw) + ')'); lg.addColorStop(1, 'hsla(' + hue + ',90%,80%,0)');
          ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, ly, 7 * s, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (extra('garden-owls') && extra('garden-swing')) {
        [[A.x - 34 * s, A.y - 70 * s], [A.x + 30 * s, A.y - 74 * s]].forEach(function (o, k) {
          var blink = Math.sin(t / 1300 + k * 2) > 0.95;
          ctx.fillStyle = '#6B5A4E'; ctx.beginPath(); ctx.ellipse(o[0], o[1] - 7 * s, 6 * s, 8 * s, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#F4E6C8'; [-2.5, 2.5].forEach(function (ex2) { ctx.beginPath(); ctx.arc(o[0] + ex2 * s, o[1] - 9 * s, blink ? 0.6 * s : 2 * s, 0, Math.PI * 2); ctx.fill(); });
          var d0 = pack.pos && pack.pos[0], look = d0 ? Math.max(-1, Math.min(1, (d0[0] - o[0]) / (120 * s))) : 0, lookY = d0 ? Math.max(-0.6, Math.min(0.8, (d0[1] - o[1]) / (160 * s))) : 0;
          if (!blink) { ctx.fillStyle = '#2B2620'; [-2.5, 2.5].forEach(function (ex2) { ctx.beginPath(); ctx.arc(o[0] + ex2 * s + look * 0.8 * s, o[1] - 9 * s + lookY * 0.7 * s, 0.9 * s, 0, Math.PI * 2); ctx.fill(); }); }
        });
      }
      if (extra('garden-bridge')) {
        var p = pondShape(), x1 = p.x - p.rx * 0.42, x2 = p.x + p.rx * 0.42, yb = p.y + p.ry * 0.35;
        ctx.strokeStyle = '#8A6242'; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(x1, yb); ctx.quadraticCurveTo(p.x, yb - 34 * s, x2, yb); ctx.stroke();
        ctx.lineWidth = 1.4 * s; ctx.strokeStyle = '#C9A57A';
        ctx.beginPath(); ctx.moveTo(x1, yb - 12 * s); ctx.quadraticCurveTo(p.x, yb - 46 * s, x2, yb - 12 * s); ctx.stroke();
        for (var k3 = 0; k3 <= 6; k3++) { var fx = k3 / 6, bx2 = x1 + (x2 - x1) * fx, by2 = yb - 34 * s * 2 * fx * (1 - fx); ctx.beginPath(); ctx.moveTo(bx2, by2); ctx.lineTo(bx2, by2 - 12 * s); ctx.stroke(); }
      }
      return;
    }
    // 'air': petals drifting from the blossom tree, and glowing butterflies
    if (extra('garden-blossom') && !REDUCED) {
      if (petals.length < 26 && Math.random() < 0.05) petals.push({ x: B.x + (Math.random() - 0.5) * 60 * s, y: B.y - 90 * s, vx: 0.2 + Math.random() * 0.4, vy: 0.15 + Math.random() * 0.2, r: Math.random() * 6, life: 0 });
      petals = petals.filter(function (pt) { return pt.y < H + 10 && pt.x < W + 10; });
      petals.forEach(function (pt) {
        pt.x += pt.vx + Math.sin(t / 900 + pt.r) * 0.3; pt.y += pt.vy; pt.r += 0.02;
        ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(pt.r); ctx.fillStyle = 'rgba(250,205,222,.85)'; ctx.beginPath(); ctx.ellipse(0, 0, 3 * s, 1.8 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      });
    }
    if (extra('garden-butterflies')) for (var b = 0; b < 5; b++) {
      var bt = t / 1000 + b * 13, bxx2 = W * (0.15 + 0.7 * ((Math.sin(bt * 0.13 + b) + 1) / 2)), byy2 = H * (0.72 + 0.12 * Math.sin(bt * 0.21 + b * 2));
      var flap = REDUCED ? 0.6 : Math.abs(Math.sin(bt * 6)), hue2 = [290, 200, 45, 330, 160][b];
      var bg2 = ctx.createRadialGradient(bxx2, byy2, 0, bxx2, byy2, 12 * s); bg2.addColorStop(0, 'hsla(' + hue2 + ',80%,80%,.45)'); bg2.addColorStop(1, 'hsla(' + hue2 + ',80%,80%,0)');
      ctx.fillStyle = bg2; ctx.beginPath(); ctx.arc(bxx2, byy2, 12 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'hsla(' + hue2 + ',80%,86%,.95)';
      [-1, 1].forEach(function (side) { ctx.beginPath(); ctx.ellipse(bxx2 + side * 3 * s * flap, byy2, 3.2 * s * flap + 0.5, 4.2 * s, side * 0.4, 0, Math.PI * 2); ctx.fill(); });
    }
  }
  function hsl2rgb(h, s, l) {
    var a = s * Math.min(l, 1 - l), f = function (n) { var k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
    return f(0) + ',' + f(8) + ',' + f(4);
  }
  function drawAurora(t) {
    if (!extra('garden-aurora')) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    [[150, 0.07, 0], [280, 0.05, 2], [190, 0.045, 4]].forEach(function (b) {
      var g = ctx.createLinearGradient(0, H * 0.04, 0, H * 0.34);
      g.addColorStop(0, 'hsla(' + b[0] + ',80%,70%,0)'); g.addColorStop(0.5, 'hsla(' + b[0] + ',80%,70%,' + b[1] + ')'); g.addColorStop(1, 'hsla(' + b[0] + ',80%,70%,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, H * 0.34);
      for (var x = 0; x <= W; x += 16) ctx.lineTo(x, H * (0.12 + 0.05 * Math.sin(x / W * 5 + b[2] + (REDUCED ? 0 : t / 5200)) + 0.02 * Math.sin(x / W * 13 + b[2])));
      ctx.lineTo(W, H * 0.34); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  }
  function drawPondLife(t) {
    var p = pondShape(), tt = REDUCED ? 0 : t;
    if (extra('garden-koi')) [[0, '#F59A5B'], [Math.PI, '#FFF1E0']].forEach(function (k, i) {
      var a = tt / (9000 + i * 1700) + k[0], x = p.x + Math.cos(a) * p.rx * 0.55, y = p.y + Math.sin(a) * p.ry * 0.5, dir = a + Math.PI / 2;
      if (!REDUCED && (pack.state === 'splash' || pack.state === 'surf')) { var jmp = Math.max(0, Math.sin(t / 420 + i * 2.2)); if (jmp > 0) { y -= jmp * 22; dir += (Math.cos(t / 420 + i * 2.2) > 0 ? -1 : 1) * 0.9; if (jmp > 0.97 && Math.random() < 0.3) burst(x, p.y + Math.sin(a) * p.ry * 0.5, 3, 205, 86); } }
      ctx.save(); ctx.translate(x, y); ctx.rotate(dir); ctx.globalAlpha = 0.85;
      ctx.fillStyle = k[1]; ctx.beginPath(); ctx.ellipse(0, 0, 11, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-17, -5 + Math.sin(tt / 200) * 2); ctx.lineTo(-17, 5 + Math.sin(tt / 200) * 2); ctx.closePath(); ctx.fill();
      if (i === 1) { ctx.fillStyle = '#F07A3E'; ctx.beginPath(); ctx.arc(3, -1, 2.4, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore(); ctx.globalAlpha = 1;
    });
    if (extra('garden-boats')) for (var b = 0; b < 3; b++) {
      var q = ((tt / 60000 + b / 3) % 1), x2 = p.x - p.rx * 0.8 + q * p.rx * 1.6, y2 = p.y - p.ry * 0.2 + b * p.ry * 0.25 + Math.sin(tt / 900 + b) * 1.5;
      var glow = ctx.createRadialGradient(x2, y2 - 8, 0, x2, y2 - 8, 16); glow.addColorStop(0, 'rgba(255,214,150,0.5)'); glow.addColorStop(1, 'rgba(255,214,150,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x2, y2 - 8, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(250,246,236,0.9)'; ctx.beginPath(); ctx.moveTo(x2 - 9, y2); ctx.lineTo(x2 + 9, y2); ctx.lineTo(x2 + 6, y2 + 4); ctx.lineTo(x2 - 6, y2 + 4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2, y2 - 9); ctx.lineTo(x2 + 6, y2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFE39A'; ctx.beginPath(); ctx.arc(x2 - 3, y2 - 3, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  }

  var flies = [];
  var moreFlies = window.TOLRewards && window.TOLRewards.extraFlies ? Math.min(60, window.TOLRewards.extraFlies()) : 0;
  for (var fi = 0; fi < (REDUCED ? 14 : 26) + moreFlies; fi++) flies.push({ x: Math.random(), y: 0.45 + Math.random() * 0.45, vx: 0, vy: 0, ph: Math.random() * 6, home: null });
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
      if (NIGHTNESS[TOD] < 1) blink *= 0.25 + NIGHTNESS[TOD] * 0.7; // fainter by day
      var g = ctx.createRadialGradient(x, y, 0, x, y, 12); g.addColorStop(0, 'rgba(230,255,170,' + (0.8 * blink) + ')'); g.addColorStop(1, 'rgba(230,255,170,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(250,255,220,' + blink + ')'; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
    });
  }

  // ---------- Sound (on by default; the Sound button turns it off) ----------
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
    if (audio) { audio.ctx.resume(); audio.master.gain.setTargetAtTime(LEVEL, audio.ctx.currentTime, 0.8); if (audio.music) audio.music.start(); return; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    var ac = new AC(), master = ac.createGain(); master.gain.value = 0;
    var comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    master.connect(comp); comp.connect(ac.destination);
    // a soft echo for the chimes
    // a warm hall: a generated stereo impulse that fades over four seconds
    var verb = ac.createConvolver(), irLen = Math.floor(ac.sampleRate * 4), ir = ac.createBuffer(2, irLen, ac.sampleRate);
    for (var ch = 0; ch < 2; ch++) { var dd = ir.getChannelData(ch); for (var k = 0; k < irLen; k++) dd[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / irLen, 3.2); }
    verb.buffer = ir; var wet = ac.createGain(); wet.gain.value = 0.6; verb.connect(wet); wet.connect(master);
    // the music: warm chords drifting every two box-breathing counts, a soft wandering melody,
    // and every chime tuned to the chord playing now (calm-music.js)
    var music = window.TOLMusic ? window.TOLMusic.create(ac, master, { calm: true }) : null, pad;
    if (music) { music.level(0.95); music.start(); pad = music.pad; }
    else { pad = ac.createGain(); pad.gain.value = 0; pad.connect(master); }
    // the night air: gentle filtered noise that rises and falls like a breeze
    var len = ac.sampleRate * 3, nb = ac.createBuffer(1, len, ac.sampleRate), d = nb.getChannelData(0), last = 0;
    for (var i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    var air = ac.createBufferSource(); air.buffer = nb; air.loop = true;
    // a low, warm hush (no hiss), swelling slowly like distant wind in the trees
    var af = ac.createBiquadFilter(); af.type = 'lowpass'; af.frequency.value = 420; af.Q.value = 0.3;
    var ag = ac.createGain(); ag.gain.value = 0.03;
    var alfo = ac.createOscillator(), alfoG = ac.createGain(); alfo.frequency.value = 0.05; alfoG.gain.value = 0.022; alfo.connect(alfoG); alfoG.connect(ag.gain); alfo.start();
    air.connect(af); af.connect(ag); ag.connect(master); air.start();
    // and water: the soft lap of the pond, a slower breath of filtered noise
    var wsrc = ac.createBufferSource(); wsrc.buffer = nb; wsrc.loop = true; wsrc.playbackRate.value = 0.6;
    var wf = ac.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 260; wf.Q.value = 0.9;
    var wg = ac.createGain(); wg.gain.value = 0.018;
    var wl = ac.createOscillator(), wlg = ac.createGain(); wl.frequency.value = 0.11; wlg.gain.value = 0.014; wl.connect(wlg); wlg.connect(wg.gain); wl.start();
    wsrc.connect(wf); wf.connect(wg); wg.connect(master); wsrc.start();
    audio = { ctx: ac, master: master, verb: verb, pad: pad, music: music };
    if (ac.state !== 'running' && ac.resume) ac.resume();
    master.gain.setTargetAtTime(LEVEL, ac.currentTime, 0.8);
  }
  function stopAudio() { if (audio) { audio.master.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.4); if (audio.music) audio.music.stop(); } }
  function chime(i, vol) {
    if (!audio || !save.sound) return;
    if (audio.music) { audio.music.pluck(audio.music.note(i), (vol || 0.1) * 0.9); return; } // always in tune with the chord playing now
    var ac = audio.ctx, t = ac.currentTime, f = NOTES[((i % NOTES.length) + NOTES.length) % NOTES.length];
    var o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 2; o2.detune.value = 3;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime((vol || 0.12) * 1.1, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0008, t + 3.2);
    var g2 = ac.createGain(); g2.gain.value = 0.12; o2.connect(g2); g2.connect(g);
    o.connect(g); g.connect(audio.master); g.connect(audio.verb); o.start(t); o2.start(t); o.stop(t + 3.4); o2.stop(t + 3.4);
  }
  // a soft water bloop, for a lily pad settling onto the pond
  function plink() {
    if (!audio || !save.sound) return;
    var ac = audio.ctx, t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(520, t + 0.09);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.04, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.35);
    o.connect(g); g.connect(audio.master); g.connect(audio.verb); o.start(t); o.stop(t + 0.4);
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
      'Finish the picture to hear its whole song and learn what it means. There are {N} to collect, and you can dedicate each new one to someone you love. No picture ever comes back exactly the same: each time it is turned, stretched or started from a new star.',
      'Once you have found a few, <strong>wild constellations</strong> appear too: new shapes the sky makes just for you, each with its own name.',
      'Now and then a <strong>shooting star</strong> crosses the sky. Catch it for a wish and a new flower.'],
      keys: 'On a keyboard, the arrow keys move your light.' },
    pond: { ico: '&#128167;', h: 'How to play the lily pond', steps: [
      'Lily pads drift slowly down the pond. The faint outline shows where they’ll land.',
      'On a phone, <strong>drag</strong> the pad left or right with your finger, <strong>tap</strong> to turn it, and <strong>flick down</strong> to drop it. Or use the buttons: hold &#9664; &#9654; to slide.',
      'The little box shows which pad is coming <strong>next</strong>. When a pad lands, you have a moment to slide it into place.',
      'Fill a whole row from side to side and it blooms into flowers. Two rows at once is a <strong>double bloom</strong>, and a rare <strong>golden lotus</strong> glows gold.',
      'If the pond fills up, it simply settles and starts fresh. You can’t lose.'],
      keys: 'On a keyboard: arrow keys to move and turn, space to drop.' }
  };
  var helpCard = document.getElementById('ng-help');
  function showHelp(m) {
    var h = HELP[m || mode]; if (!h || !helpCard) return;
    if ((m || mode) === 'breathe') {
      var bp = chooseBreath();
      h = { ico: HELP.breathe.ico, h: bp.name + ' in the garden', steps: [
        'Watch the glowing light. A little star travels around ' + bp.shape + ', one part of the path for each part of the breath.',
        'Tonight’s pattern: <strong>' + breathDesc(bp) + '</strong>. The number in the light counts down each part for you.',
        'The garden has several calm patterns and brings a different one on most visits. Every one breathes out for at least as long as it breathes in, and any holds are short and easy. If a pattern ever feels like a strain, just breathe your own way and watch the light.',
        'Words drift down from the sky to keep you company. Each full round plants a flower, and the animals by the pond hop along with you.'] };
    }
    document.getElementById('ng-help-ico').innerHTML = h.ico;
    document.getElementById('ng-help-h').textContent = h.h;
    document.getElementById('ng-help-steps').innerHTML = h.steps.map(function (x) { return '<li>' + x.replace('{N}', SHAPE_IDS.length) + '</li>'; }).join('') +
      (h.keys && window.matchMedia && window.matchMedia('(hover: hover)').matches ? '<li>' + h.keys + '</li>' : '');
    helpCard.hidden = false; say('', '', 0);
    if (audio) stopAudio(); // the garden goes quiet while a card is up
    try { document.getElementById('ng-help-ok').focus({ preventScroll: true }); } catch (e) {}
  }
  function hideHelp() {
    helpCard.hidden = true;
    if (mode === 'breathe') { breath.start = performance.now() + 600; breath.count = 0; breath.phase = ''; }
    if (mode === 'pond') dropAt = performance.now() + 1500;
    soundIfClear();
    try { document.getElementById('ng-help-btn').focus({ preventScroll: true }); } catch (e) {}
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
    stage.classList.toggle('is-play', m === 'pond' || m === 'fireflies'); // the page doesn't scroll while you play
    flies.forEach(function (f) { f.home = null; });
    if (m === 'breathe') { var bp = chooseBreath(); breath.start = performance.now() + 1500; breath.count = 0; breath.phase = ''; skyWords = []; wordAt = 0; say(bp.name, breathDesc(bp).replace(/^./, function (c) { return c.toUpperCase(); }) + '. Follow the star around ' + bp.shape + '.', 0); }
    if (m === 'fireflies') { newShape(); say('Connect the stars', 'Start at 1 and follow the numbers. Each star sings a note.', 6000); }
    if (m === 'pond') { pondReset(); say('Float the lily pads', layout ? 'Old lilies are waiting at the bottom tonight, with gaps to fill. The first pads to drift in fit them.' : 'Drag a pad with your finger, tap to turn it, flick down to drop it. Fill a row and it blooms.', 6000); }
    hud();
    updateCount();
    // The first time in each activity, show how it works
    save.seen = save.seen || {};
    if (!save.seen[m]) { save.seen[m] = 1; persist(); showHelp(m); }
  }

  // Breathe: a light that grows as you breathe in and softens as you breathe out.
  // Each visit brings one of several calm patterns (never the one from the last few visits; the very
  // first visit is box breathing). Every pattern breathes out for at least as long as it breathes in,
  // and holds are short and easy.
  var breath = { start: 0, count: 0, phase: '' };
  var BREATHS = [
    { id: 'box', name: 'Box breathing', shape: 'a square', steps: [['in', 4], ['top', 4], ['out', 4], ['bottom', 4]] },
    { id: 'box3', name: 'A gentle box', shape: 'a small square', steps: [['in', 3], ['top', 3], ['out', 3], ['bottom', 3]] },
    { id: 'long-out', name: 'The long breath out', shape: 'a circle', steps: [['in', 4], ['out', 6]] },
    { id: 'triangle', name: 'Triangle breathing', shape: 'a triangle', steps: [['in', 4], ['top', 4], ['out', 4]] },
    { id: 'wave', name: 'The slow wave', shape: 'a square', steps: [['in', 4], ['top', 2], ['out', 6], ['bottom', 2]] },
    { id: 'even', name: 'Even breathing', shape: 'a circle', steps: [['in', 5], ['out', 5]] },
    { id: 'rest-triangle', name: 'The resting triangle', shape: 'a triangle', steps: [['in', 4], ['out', 6], ['bottom', 2]] },
    { id: 'three-five', name: 'In three, out five', shape: 'a circle', steps: [['in', 3], ['out', 5]] },
    { id: 'tide', name: 'The tide', shape: 'a triangle', steps: [['in', 5], ['top', 2], ['out', 7]] }
  ];
  var BREATH = null;
  function breathDesc(bp) { return bp.steps.map(function (st) { return (st[0] === 'in' ? 'in ' : st[0] === 'out' ? 'out ' : st[0] === 'top' ? 'hold ' : 'rest ') + st[1]; }).join(' · '); }
  function chooseBreath() {
    if (BREATH) return BREATH;
    BREATH = seenList('b').length || AMBIENT ? pickFresh(BREATHS, 'b', function (x) { return x.id; }, 4) : BREATHS[0];
    markSeen('b', BREATH.id, 20);
    return BREATH;
  }
  var BOX_SAY = { in: 'Breathe in…', top: 'Hold…', out: 'Breathe out…', bottom: 'Rest…' };
  var BOX_SUB = { in: 'Slowly, through your nose', top: 'Gently. No strain.', out: 'Slow and warm, through your mouth', bottom: 'Rest, empty and easy' };
  // words that drift down from the sky, one each round: a large, shuffled set, least recently seen first
  var SKY_WORDS = [
    'Slow, even breaths are a quiet signal that you can ease off.',
    'Let each breath out be soft and unhurried.',
    'The pauses stretch each breath, so your whole rhythm calms down.',
    'Counting gives a busy mind one simple job to do.',
    'Let your body settle toward rest.',
    'Let your shoulders drop. Let your jaw soften.',
    'Notice your hands. Warmer? Heavier? That’s your body relaxing.',
    'If a thought pulls you away, that’s okay. Come back to the count.',
    'You’re doing it. One calm round at a time.',
    'There is nothing to get right here. Just follow the light.',
    'Let the out-breath be a little longer, like a sigh.',
    'Your feet are on the ground. The ground is holding you.',
    'This moment only needs this breath.',
    'Let your forehead smooth out.',
    'Unclench your hands, one finger at a time.',
    'Whatever today carried, you can set it down for a few breaths.',
    'Noticing how you feel is the first step, and you’re taking it.',
    'Your battery fills a little with every slow round.',
    'Breathing slowly is something you can take with you anywhere.',
    'Let your tummy rise as you breathe in.',
    'Feel the air: cool on the way in, warm on the way out.',
    'The light will wait for you. There’s no hurry.',
    'Let your eyes go soft. Look at the glow, not through it.',
    'If you lose count, just start again at one.',
    'Some rounds feel easy and some feel fidgety. Both are fine.',
    'You don’t have to fix anything tonight.',
    'Let the next breath be a kind one.',
    'Rest is part of the rhythm too.',
    'A calmer you makes calmer talks possible, later.',
    'Your state shapes how the day’s words land. This helps it settle.',
    'Imagine putting today’s list on a shelf. It will be there tomorrow.',
    'Let your tongue rest gently behind your teeth.',
    'Breathe in something you’re glad about. Breathe out something you can leave.',
    'Each flower in the garden is a breath you took.',
    'Slow is still moving.',
    'You are allowed to take up this space and this time.',
    'Feel your back against the chair, or the floor, or the bed.',
    'Let the sounds around you come and go.',
    'Nothing needs an answer right now.',
    'Kind to yourself, one breath at a time.',
    'Tomorrow can wait until tomorrow.',
    'Picture the pond: still, and a little silver.'
  ];
  var wordOrder = null;
  function nextWord() {
    if (!wordOrder || !wordOrder.length) {
      var rec = seenList('w').slice(-24), fresh = [], old = [];
      SKY_WORDS.forEach(function (w, i) { (rec.indexOf(i) < 0 ? fresh : old).push(i); });
      function shuf(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(vr() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
      wordOrder = shuf(fresh).concat(shuf(old));
    }
    var k = wordOrder.shift(); markSeen('w', k, 40);
    return SKY_WORDS[k];
  }
  var skyWords = [], wordAt = 0;
  function dropWord(t) {
    var bp = chooseBreath(), text = wordAt === 0 ? bp.name + ': ' + breathDesc(bp) + '.' : nextWord();
    skyWords.push({ text: text, born: t, x: 0.5 + (Math.random() - 0.5) * 0.08 }); wordAt++;
  }
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
    var bp = chooseBreath(), steps = bp.steps, cycle = steps.reduce(function (a, st) { return a + st[1]; }, 0);
    var cyc = el % cycle, n = Math.floor(el / cycle), step = 0, into = cyc;
    while (step < steps.length - 1 && into >= steps[step][1]) { into -= steps[step][1]; step++; }
    var ph = steps[step][0], dur = steps[step][1];
    var k = ph === 'in' ? ease(into / dur) : ph === 'top' ? 1 : ph === 'out' ? 1 - ease(into / dur) : 0;
    var phKey = step + ph;
    if (phKey !== breath.phase) {
      breath.phase = phKey;
      if (step === 0 && n > 0 && n > breath.count) { breath.count = n; bloom(); }
      if (step === 0) { dropWord(t); hopAll(); }
      if (breath.count >= 4 && breath.count % 4 === 0 && step === 0) say('Four calm rounds. Lovely.', 'Keep going as long as you like.', 0);
      else say(BOX_SAY[ph], BOX_SUB[ph] + (breath.count ? ' · ' + breath.count + (breath.count === 1 ? ' round' : ' rounds') + ' tonight' : ''), 0);
      padSwell(ph === 'bottom' ? 'bottom' : ph);
    }
    var cx = W * 0.5, cy = H * 0.36, R = Math.min(W, H) * 0.075 * (0.7 + 0.5 * k);
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 3);
    g.addColorStop(0, 'rgba(255,238,210,' + (0.55 + 0.3 * k) + ')'); g.addColorStop(0.35, 'rgba(249,217,184,' + (0.35 + 0.2 * k) + ')'); g.addColorStop(1, 'rgba(217,200,240,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,248,232,0.9)'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.55, 0, Math.PI * 2); ctx.fill();
    // the path the little star travels: one side for each part of the breath (a circle for in-and-out)
    var half = Math.min(W, H) * 0.075 * 1.35 + 16, f = into / dur, dx, dy;
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,240,215,0.16)';
    if (steps.length === 2) {
      var rr = half * 1.1, a0 = Math.PI / 2, a1 = a0 + (step === 0 ? f : 1 + f) * Math.PI; // up the left side, then down the right
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(249,217,184,0.9)'; ctx.beginPath(); ctx.arc(cx, cy, rr, a0, a1); ctx.stroke(); ctx.lineCap = 'butt';
      dx = cx + Math.cos(a1) * rr; dy = cy + Math.sin(a1) * rr;
    } else {
      var pts = steps.length === 3 ? [[cx - half * 1.1, cy + half * 0.8], [cx, cy - half * 1.1], [cx + half * 1.1, cy + half * 0.8]] : [[cx - half, cy + half], [cx - half, cy - half], [cx + half, cy - half], [cx + half, cy + half]];
      pts.push(pts[0]);
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var q = 1; q < pts.length; q++) ctx.lineTo(pts[q][0], pts[q][1]); ctx.closePath(); ctx.stroke();
      ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(249,217,184,0.9)'; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (var i = 0; i < step; i++) ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
      dx = pts[step][0] + (pts[step + 1][0] - pts[step][0]) * f; dy = pts[step][1] + (pts[step + 1][1] - pts[step][1]) * f;
      ctx.lineTo(dx, dy); ctx.stroke(); ctx.lineCap = 'butt';
    }
    ctx.fillStyle = '#FFF6E6'; ctx.shadowColor = 'rgba(255,236,214,0.95)'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(dx, dy, 5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(60,50,90,0.85)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 ' + Math.round(Math.max(16, R * 0.5)) + 'px Fraunces, Georgia, serif';
    ctx.fillText(String(Math.max(1, Math.ceil(dur - into))), cx, cy + 1);
    drawSkyWords(t);
  }

  // ---------- Happy animals around the pond ----------
  // A bunny, a frog on a lily pad, a duckling on the water and a hedgehog in its burrow.
  // They hop together on every breath in (Breathe), and get up to small silly things:
  // the bunny spins, leaps and flops an ear; the frog croaks and flicks its tongue at
  // fireflies; the duckling paddles and dives bottoms-up; the hedgehog pops in and out of
  // its hole, and in Breathe it rises with your in-breath and ducks down as you breathe out.
  var critters = [
    { kind: 'bunny', fx: -1.12, fy: -0.35, hop: 0, act: null, next: 0 },
    { kind: 'frog', fx: -0.45, fy: 0.05, hop: 0, act: null, next: 0 },
    { kind: 'duck', fx: 0.4, fy: 0.15, hop: 0, act: null, next: 0 },
    { kind: 'hedgehog', fx: 1.12, fy: -0.3, hop: 0, act: null, next: 0, out: 0 }
  ];
  var ACTS = { bunny: [['spin', 900], ['binky', 900], ['ear', 1600]], frog: [['croak', 1400], ['tongue', 650]], duck: [['dive', 1900], ['shake', 900]] };
  function hopAll() { if (REDUCED) return; var now = performance.now(); critters.forEach(function (c, i) { if (c.kind !== 'hedgehog') c.hop = now + i * 140; }); }
  function drawCritters(t) {
    var p = pondShape(), s = Math.max(1, Math.min(1.4, Math.min(W, H) / 520)) * (AMBIENT ? 1.2 : 1); // a little bigger behind the pages, so they're easy to spot
    // keep them above the buttons at the bottom of the screen
    var bar = document.querySelector('.ng-bar'), br = bar && bar.getBoundingClientRect(), barTop = br && br.height ? br.top - canvas.getBoundingClientRect().top : H; // no bar (the backdrop): the whole height
    var groundY = Math.min(p.y, barTop - 14);
    drawPack(t, p, s, groundY, barTop, 'back'); // dogs on the far bank pass behind the others
    critters.forEach(function (c) {
      var x = p.x + c.fx * Math.max(p.rx, W * 0.3), y = groundY + c.fy * p.ry, lift = 0, squash = 1, since = t - c.hop;
      c.sx = x; c.sy = y; c.ss = s;
      var blink = Math.sin(t / 900 + c.fx * 7) > 0.985;
      // on phones the pond's touch buttons cover the middle, so only the two at the sides come out
      if (mode === 'pond' && !padEl.hidden && W <= 560 && (c.kind === 'frog' || c.kind === 'duck')) return;
      if (c.away) return; // off playing with the dogs
      if (c.kind === 'hedgehog') { drawBurrow(c, x, y, s, t, blink); return; }
      // silly things, now and then (less often while you breathe)
      if (!REDUCED && !c.act && t > c.next) {
        if (c.next) { var opts = ACTS[c.kind]; if (mode !== 'breathe' && Math.random() < 0.3) c.hop = t; else { var o = opts[Math.floor(Math.random() * opts.length)]; c.act = { name: o[0], t0: t, dur: o[1] }; } }
        c.next = t + (mode === 'breathe' ? 7000 + Math.random() * 7000 : 2500 + Math.random() * 4500);
      }
      var act = c.act && t - c.act.t0 < c.act.dur ? c.act : null; if (!act) c.act = null;
      var q = act ? (t - act.t0) / act.dur : 0;
      if (!REDUCED && since >= 0 && since < 750) { var hq = since / 750; lift = Math.sin(hq * Math.PI) * 22 * s * (c.kind === 'duck' ? 0.4 : 1); squash = hq < 0.1 ? 1 - hq * 1.5 : hq > 0.9 ? 1 - (1 - hq) * 1.5 : 1.06; }
      if (act && act.name === 'binky') lift = Math.sin(q * Math.PI) * 34 * s;
      if (c.kind === 'duck' && !REDUCED) x += Math.sin(t / 1700) * 14 * s; // paddling about
      ctx.save(); ctx.translate(x, y);
      // soft shadow or ripple
      ctx.fillStyle = c.kind === 'duck' || c.kind === 'frog' ? 'rgba(200,215,255,0.18)' : 'rgba(10,15,30,0.25)';
      ctx.beginPath(); ctx.ellipse(0, 2, 16 * s * (1 - Math.min(0.6, lift / (60 * s))), 4 * s, 0, 0, Math.PI * 2); ctx.fill();
      if (c.kind === 'frog') { ctx.fillStyle = '#6FAE8A'; ctx.beginPath(); ctx.ellipse(0, 1, 20 * s, 6 * s, 0, 0.35, Math.PI * 2 - 0.05); ctx.fill(); }
      ctx.translate(0, -lift); ctx.scale(1 / Math.sqrt(squash), squash); ctx.scale(s, s);
      if (act && act.name === 'spin') ctx.scale(Math.cos(q * Math.PI * 2), 1);
      if (act && act.name === 'binky') ctx.rotate(Math.sin(q * Math.PI * 2) * 0.35);
      if (c.kind === 'duck' && Math.cos(t / 1700) < 0) ctx.scale(-1, 1); // faces the way it paddles
      if (c.kind === 'frog') drawFrog(blink, act, q, x, y, s); else if (c.kind === 'bunny') drawBunny(blink, act, q); else drawDuck(blink, act, q, t);
      ctx.restore();
    });
    drawPack(t, p, s, groundY, barTop, 'front');
  }

  // Two dogs who play together by the pond. One is black and tan with white paws, a white
  // chin and a big grin; the other is black with bold tan eyebrows, tan cheeks and chest
  // patches, tan paws and a collar. They chase each other along the far bank, swap who's
  // chasing, play-bow, roll over and sit side by side. In Breathe they lie down together.
  var PUPS = [
    // stocky, long drop ears, tan brows running into tan cheeks, a cream-and-grey muzzle,
    // white chin and bib, reddish-tan forelegs and big white toes
    { build: 'stocky', ear: 'drop', legUp: '#A45C2E', legLow: '#B97847', paw: '#F1EADF', nails: true, tan: '#C9965F', chest: 'white', muzzle: 'cream', collar: false, brow: 'patch', tail: 'plume' },
    // leaner and taller, round tan brow dots, a black stripe down the nose with tan cheeks and
    // lips, small folded ears, black legs turning tan below the knee, tan chest patches, a collar
    { build: 'lean', ear: 'fold', legUp: '#262220', legLow: '#C98A4F', paw: '#D99E62', chest: 'tan', muzzle: 'rottie', collar: true, brow: 'dot', tail: 'short' }
  ];
  var pack = { u: 0.25, dir: 1, lead: 0, state: 'chase', until: 0, lastT: 0, spot: [0.3, 0.2], actor: 0, v: 1, cur: [0.25, 0.12], face: [-1, -1] };
  function puPos(p, groundY, RX, u) { var ang = -Math.PI * u; return { ang: ang, x: p.x + RX * Math.cos(ang), y: groundY + p.ry * 1.6 * Math.sin(ang) }; }
  // What they get up to. They never stop for long: chases and zoomies in between, and bits of
  // mischief when they meet up. In Breathe they play at a gentler pace.
  var GAMES = ['hug', 'five', 'bow', 'roll', 'tug', 'hug', 'dig', 'spin', 'five', 'splash', 'visit', 'tug', 'zoom', 'hug', 'spin', 'visit',
    'cape', 'plane', 'kite', 'surf', 'ball', 'bubbles', 'butterfly', 'dance', 'leapfrog', 'float', 'cape', 'ball', 'kite', 'dance', 'plane', 'leapfrog',
    'swingride', 'bridge', 'nap', 'gazebo', 'stargaze', 'swingride', 'bridge', 'nap', 'gazebo', 'stargaze',
    'space', 'squirt', 'balloons', 'swim', 'space', 'squirt', 'balloons', 'swim'];
  // games that need something in the background first (it arrives as levels are finished)
  var NEEDS = { swingride: ['garden-swing'], nap: ['garden-swing', 'garden-hammock'], bridge: ['garden-bridge'], gazebo: ['garden-gazebo'] };
  function canPlay(g) {
    if (g === 'stargaze') return hasWonder('garden-aurora') || hasWonder('garden-meteors');
    return !NEEDS[g] || NEEDS[g].every(hasWonder);
  }
  // the bigger adventures: how long each lasts, which ones leave the ground (1: one of them, 2: both),
  // and which are too lively for Breathe
  var ADV_DUR = { space: 10000, squirt: 6500, balloons: 6500, swim: 9000, swingride: 8000, bridge: 5200, nap: 9000, gazebo: 7000, stargaze: 6000, cape: 9000, plane: 11000, surf: 8500, float: 6500, kite: 7000, ball: 6500, bubbles: 5500, butterfly: 5500, dance: 4800, leapfrog: 6500 };
  var FORCE_PLAY = (/[?&]play=(\w+)/.exec(location.search) || [])[1];
  if (FORCE_PLAY && !ADV_DUR[FORCE_PLAY] && GAMES.indexOf(FORCE_PLAY) === -1) FORCE_PLAY = null;
  var AIR = { space: 2, swim: 2, cape: 2, plane: 2, surf: 1, float: 1, swingride: 2, bridge: 2, nap: 2, gazebo: 2 };
  var LIVELY = { space: 1, squirt: 1, balloons: 1, zoom: 1, splash: 1, cape: 1, plane: 1, surf: 1, float: 1, ball: 1 };
  function packStep(t, dt) {
    var calm = mode === 'breathe';
    if (!pack.until) pack.until = t + 5000;
    if (t > pack.until) {
      var next = pack.state === 'chase' || pack.state === 'zoom' ? GAMES[Math.floor(Math.random() * GAMES.length)] : 'chase';
      if (FORCE_PLAY && next !== 'chase') next = FORCE_PLAY; // for trying one out: ?play=kite
      if (!canPlay(next)) next = 'hug';
      if (calm && LIVELY[next]) next = ['butterfly', 'dance', 'bubbles', 'tug'][Math.floor(Math.random() * 4)];
      // sometimes a chase comes with a skateboard, or the frog along for the ride
      pack.variant = next === 'chase' ? (Math.random() < 0.18 && !calm ? 'skate' : Math.random() < 0.25 ? 'ride' : null) : null;
      if (critters[1].away !== (pack.variant === 'ride') && critters[1].sx != null) burst(critters[1].sx, critters[1].sy - 12 * (critters[1].ss || 1), 6, 120, 80);
      critters[1].away = pack.variant === 'ride';
      critters[0].away = next === 'leapfrog';
      pack.whoosh = false; pack.poof = 0; pack.popped = false; pack.bub = []; pack.surfX = null; pack.bfx = null;
      pack.fdir = (pack.cur[0] + pack.cur[1]) / 2 < 0.5 ? -1 : 1; // fly toward the middle of the screen
      if (next === 'chase' || next === 'zoom') { pack.lead = Math.random() < 0.5 ? 0 : 1; if (Math.random() < 0.5) pack.dir *= -1; }
      else { // meet up in the middle of the far bank, facing each other, without crossing over
        var c = Math.max(0.33, Math.min(0.67, (pack.cur[0] + pack.cur[1]) / 2));
        var du = Math.max(0.03, Math.min(0.2, ({ squirt: 170, balloons: 170, tug: 128, hug: 44, five: 58, dance: 52, ball: 150, kite: 110, leapfrog: 70 }[next] || 84) * pack.sc / 1.3 / (pack.RX * Math.PI)));
        if (next === 'splash') c = 0.5;
        // go and play by one of the garden's wonders: the swing tree or the blossom tree
        if (next === 'visit') {
          var spots = [];
          if (hasWonder('garden-swing')) spots.push(0.16);
          if (hasWonder('garden-blossom')) spots.push(0.95);
          if (!spots.length) next = 'hug'; else { c = spots[Math.floor(Math.random() * spots.length)]; pack.visit = c; du = 70 * pack.sc / 1.3 / (pack.RX * Math.PI); }
        }
        pack.spot = pack.cur[0] > pack.cur[1] ? [c + du / 2, c - du / 2] : [c - du / 2, c + du / 2];
        if (AIR[next]) pack.spot = pack.cur.slice(); // take off from right where they are
        pack.actor = Math.random() < 0.5 ? 0 : 1;
      }
      pack.state = next; pack.t0 = t;
      pack.until = t + (next === 'chase' ? 4000 + Math.random() * 3500 : next === 'zoom' ? 3500 : ADV_DUR[next] || 3200) * (calm ? 1.4 : 1);
      pack.pops = 0;
    }
    var running = pack.state === 'chase' || pack.state === 'zoom';
    pack.v += ((running ? (pack.state === 'zoom' ? 2.3 : 1) : 0) - pack.v) * Math.min(1, dt * 0.003); // ease into a run and out of it
    if (running) {
      pack.u += pack.dir * dt / 7000 * Math.max(0.25, pack.v) * (calm ? 0.6 : 1);
      var lo = W < 600 ? 0.22 : 0.13;
      if (pack.u > 1) { pack.u = 1; pack.dir = -1; } if (pack.u < lo) { pack.u = lo; pack.dir = 1; }
    }
  }
  // draw the dogs on the far bank ('back') or the near side ('front'), so they pass behind the others
  function drawPack(t, p, s, groundY, barTop, layer) {
    if (QS.pals === 'off') return;
    var RX = Math.max(p.rx, W * 0.3) * 1.2; pack.RX = RX; pack.sc = 1.3 * s;
    if (layer === 'back') { var dt = pack.lastT ? Math.min(60, t - pack.lastT) : 16; pack.lastT = t; if (!REDUCED) packStep(t, dt); }
    var mouths = [], ex = [];
    [0, 1].forEach(function (i) {
      var x, y, face = 1, pose, depth = 1, prog = 0, ph = t / 90 + i * 1.7, tilt = 0, dx = 0, rear = 0, extra = null, aloft = false;
      if (REDUCED) { // still, side by side, for anyone who asks for less motion
        if (layer !== 'front') return;
        pose = 'lie'; x = p.x + (i ? 1 : -1) * 48 * s; y = groundY - p.ry * 1.95; face = i ? -1 : 1; depth = 0.86;
      } else {
        var u, isLead = i === pack.lead, running = pack.state === 'chase' || pack.state === 'zoom';
        var gap = W < 600 ? 0.22 : 0.13; // more room between them on small screens
        var goal = running ? (isLead ? pack.u : Math.max(0, Math.min(1, pack.u - pack.dir * gap))) : pack.spot[i];
        var prev = pack.cur[i]; pack.cur[i] += (goal - pack.cur[i]) * 0.06; u = pack.cur[i];
        var travelling = Math.abs(goal - u) > 0.012, moveDir = u - prev;
        var P = puPos(p, groundY, RX, u); x = P.x; y = P.y; depth = 1 + 0.16 * Math.sin(P.ang);
        if (pack.state === 'splash' && i === pack.actor && !travelling) y += p.ry * 0.55; // right down at the water's edge
        var me = i === pack.actor, adv = !running && !travelling && ADV[pack.state];
        aloft = adv && (AIR[pack.state] === 2 || (AIR[pack.state] === 1 && me));
        if (aloft ? layer !== 'front' : (Math.sin(P.ang) < -0.35) !== (layer === 'back')) return;
        prog = Math.min(1, (t - pack.t0) / Math.max(1, pack.until - pack.t0));
        if (running || travelling) {
          pose = 'run'; face = moveDir > 0.00005 ? -1 : moveDir < -0.00005 ? 1 : pack.face[i]; if (pack.state === 'zoom') ph *= 1.6;
          if (running && isLead && pack.variant === 'skate') { ph = 0; extra = { after: drawBoard }; }
          if (running && isLead && pack.variant === 'ride') extra = { after: frogRider(PUPS[i]) };
        }
        else {
          var other = pack.cur[1 - i]; face = other > u ? -1 : 1; // face each other
          var st = pack.state;
          if (st === 'bow') pose = me ? 'bow' : 'bounce';
          else if (st === 'roll') { pose = me ? 'roll' : 'sit'; if (!me) tilt = 0.3; }
          else if (st === 'tug') { pose = 'bowtug'; dx = Math.sin(t / 230) * 5 * s; } // both pull, back and forth
          else if (st === 'dig') { if (me) { pose = 'bow'; if (Math.random() < 0.35) burst(x - face * 16 * s, y - 4 * s, 2, 28, 42, -face); } else { pose = 'sit'; tilt = 0.35 + Math.sin(t / 700) * 0.1; } }
          else if (st === 'spin') { pose = me ? 'run' : 'bounce'; if (me) { face = Math.cos(t / 140); ph = t / 60; } }
          else if (st === 'hug') { // up on their back legs, leaning in for a hug, with little hearts
            pose = 'sit'; rear = Math.min(1, prog * 4) * (prog > 0.85 ? (1 - prog) / 0.15 : 1) * 0.55;
            if (i === 0 && rear > 0.4 && Math.random() < 0.06) burst(x - face * 12 * s, y - 52 * s, 1, 345, 80);
          }
          else if (st === 'five') { // a high five: up, paws together (with a sparkle), and down again
            var k5 = prog < 0.3 ? 0 : prog < 0.5 ? (prog - 0.3) / 0.2 : prog < 0.62 ? 1 : prog < 0.8 ? 1 - (prog - 0.62) / 0.18 : 0;
            pose = k5 > 0 ? 'sit' : 'bounce'; rear = k5 * 0.7;
            if (i === 0 && k5 === 1 && !pack.fived) { pack.fived = true; burst(x - face * 20 * s, y - 50 * s, 10, 48, 82); if (audio && save.sound) chime(5, 0.05); }
            if (prog < 0.3) pack.fived = false;
          }
          else if (st === 'visit') { pose = me ? 'bow' : 'sit'; if (me && Math.random() < 0.05) burst(x - face * 14 * s, y - 8 * s, 1, pack.visit > 0.5 ? 340 : 110, 80); }
          else if (st === 'splash') {
            if (me) { pose = 'bounce'; if (Math.random() < 0.25) burst(x, y - 2 * s, 3, 205, 80); }
            else { pose = prog > 0.5 ? 'shake' : 'sit'; if (prog > 0.5 && Math.random() < 0.3) burst(x, y - 20 * s, 2, 205, 82); }
          } else if (adv) {
            var o = adv(i, me, x, y, face, prog, t, s, p, ex);
            if (!o) return;
            x = o.x; y = o.y; pose = o.pose; if (o.face != null) face = o.face; if (o.depth) depth = o.depth; rear = o.rear || 0; tilt = o.tilt || 0; if (o.ph != null) ph = o.ph; extra = o.draw || null;
          } else pose = 'sit';
        }
      }
      if (!aloft) y = Math.min(y, barTop - 12);
      var tapped = pack.tapT && t - (pack.tapT[i] || -9999) < 1100;
      if (tapped && !REDUCED && !aloft) { pose = 'bounce'; if (Math.random() < 0.3) burst(x, y - 40 * s, 1, 345, 80); }
      // turn around smoothly instead of flipping
      if (tapped && !REDUCED && !aloft) { face = Math.cos((t - pack.tapT[i]) / 120); if (Math.abs(face) < 0.12) face = face < 0 ? -0.12 : 0.12; }
      else if (!REDUCED && pack.state !== 'spin') { pack.faceNow = pack.faceNow || [face, face]; pack.faceNow[i] += (face - pack.faceNow[i]) * 0.18; pack.face[i] = face; face = pack.faceNow[i]; if (Math.abs(face) < 0.12) face = face < 0 ? -0.12 : 0.12; }
      else if (!REDUCED) { pack.faceNow = pack.faceNow || [face, face]; pack.faceNow[i] = face; if (Math.abs(face) < 0.12) face = face < 0 ? -0.12 : 0.12; }
      var lift = pose === 'bounce' ? Math.abs(Math.sin(t / 180 + i)) * 10 : pose === 'run' && !REDUCED ? Math.abs(Math.sin(ph)) * 4 : 0;
      var wag = REDUCED ? 0 : Math.sin(t / (pose === 'run' ? 70 : 90) + i) * (pose === 'lie' ? 0.08 : 0.5);
      var blink = Math.sin(t / 1000 + 2 + i * 3) > 0.985;
      pack.pos = pack.pos || []; pack.pos[i] = [x + dx, y - 20 * s, s];
      // near the page's button, a dog fades softly out of view instead of running through it
      pack.fade = pack.fade || [1, 1];
      var hit = false;
      if (AVOID) { var cr = canvas.getBoundingClientRect(), px = x + dx + cr.left, py = y + cr.top, hw = 34 * s; hit = px + hw > AVOID.l && px - hw < AVOID.r && py + 6 > AVOID.t && py - 64 * s < AVOID.b; }
      pack.fade[i] += ((hit ? 0 : 1) - pack.fade[i]) * (REDUCED ? 1 : 0.12);
      if (pack.fade[i] < 0.03) return;
      ctx.save(); ctx.globalAlpha = pack.fade[i]; ctx.translate(x + dx, y);
      ctx.fillStyle = 'rgba(10,15,30,0.28)'; ctx.beginPath(); ctx.ellipse(0, 2, 22 * s * depth, 4.5 * s * depth, 0, 0, Math.PI * 2); ctx.fill();
      ctx.translate(0, -lift * s); ctx.scale(1.3 * s * depth * face, 1.3 * s * depth);
      if (rear) ctx.rotate(-rear); // rearing up for a hug or a high five
      if (extra && extra.before) extra.before();
      if (pose === 'roll') { // a silly roll onto her back, legs in the air
        var r = Math.sin(Math.min(1, prog * 1.25) * Math.PI);
        ctx.translate(0, -12 - 12 * r); ctx.rotate(Math.PI * 0.9 * r); ctx.translate(0, 12);
        drawPup(PUPS[i], r > 0.5 ? 'wiggle' : 'run', ph * 2, wag, blink, t);
      } else if (pose === 'shake') { // a whole-body shake after the splash
        ctx.rotate(Math.sin(t / 45) * 0.12); drawPup(PUPS[i], 'run', 0, wag, blink, t);
      } else if (pose === 'bowtug') {
        drawPup(PUPS[i], 'bow', 0, wag * 1.4, blink, t);
        mouths[i] = [x + dx + Math.sign(face) * 1.3 * s * depth * 37, y - 1.3 * s * depth * 7];
      } else drawPup(PUPS[i], pose === 'bounce' ? 'run' : pose, pose === 'bounce' ? 0 : ph, wag, blink, t, tilt);
      if (extra && extra.after) extra.after();
      ctx.restore();
    });
    ex.forEach(function (f) { f(); });
    if (!REDUCED && pack.state === 'hug' && pack.pos && pack.pos[0] && pack.pos[1]) {
      var hp = Math.min(1, (t - pack.t0) / Math.max(1, pack.until - pack.t0));
      if (hp > 0.25 && hp < 0.9) {
        var hx = (pack.pos[0][0] + pack.pos[1][0]) / 2, hy = Math.min(pack.pos[0][1], pack.pos[1][1]) - 30 * s - (hp - 0.25) * 30 * s, ha = Math.sin((hp - 0.25) / 0.65 * Math.PI);
        ctx.save(); ctx.globalAlpha = 0.9 * ha; ctx.fillStyle = '#F7A1B8'; ctx.translate(hx, hy); ctx.scale(s, s);
        ctx.beginPath(); ctx.moveTo(0, 5); ctx.bezierCurveTo(-9, -2, -6, -10, 0, -5); ctx.bezierCurveTo(6, -10, 9, -2, 0, 5); ctx.fill(); ctx.restore();
      }
    }
    // the stick they're tugging on, held between them
    if (mouths[0] && mouths[1]) {
      ctx.strokeStyle = '#8A6242'; ctx.lineWidth = 3.2 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(mouths[0][0], mouths[0][1]); ctx.lineTo(mouths[1][0], mouths[1][1]); ctx.stroke();
      var mx = (mouths[0][0] + mouths[1][0]) / 2, my = (mouths[0][1] + mouths[1][1]) / 2;
      ctx.lineWidth = 1.8 * s; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + 5 * s, my - 6 * s); ctx.stroke(); ctx.lineCap = 'butt';
    }
  }

  // ---------- The dogs' bigger adventures ----------
  // Capes and a loop through the sky, a little plane with a heart banner, surfing a lily pad,
  // floating up in a bubble, a kite, catch, bubbles, a butterfly, a dance, and leapfrog with the
  // bunny. Each returns where to draw that dog and how (or nothing, to draw it some other way).
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(v) { v = clamp01(v); return v * v * (3 - 2 * v); }
  function flightAt(q, x0, y0, dir, A, Hh) {
    var e = clamp01(q);
    return { x: x0 + dir * A * Math.sin(Math.PI * e), y: y0 - Hh * Math.pow(Math.sin(Math.PI * e), 0.7) - Hh * 0.22 * Math.sin(2 * Math.PI * e) };
  }
  function flightVel(q, x0, y0, dir, A, Hh) {
    var a = flightAt(Math.min(q, 0.99), x0, y0, dir, A, Hh), b = flightAt(Math.min(q, 0.99) + 0.01, x0, y0, dir, A, Hh);
    return { x: b.x - a.x, y: b.y - a.y };
  }
  function sound(n, v) { if (audio && save.sound) chime(n, v); }
  var ADV = {
    // flying saucers: each in its own little ship, zooming loops around the sky
    space: function (i, me, x, y, face, prog, t, s, p, ex) {
      var q = clamp01((prog - 0.06 - i * 0.04) / 0.86), A = Math.min(W * 0.36, 400), Hh = Math.max(80, Math.min(H * 0.5, y - 70));
      var a = flightAt(q, x, y, pack.fdir, A, Hh), v = q > 0 && q < 1 ? flightVel(q, x, y, pack.fdir, A, Hh) : { x: 0, y: 0 };
      if (q > 0 && q < 1) { a.x += (i ? -1 : 1) * 48 * s + Math.sin(t / 400 + i * 2) * 22 * s; a.y += Math.cos(t / 520 + i * 2) * 16 * s + (i ? 30 * s : -10 * s); }
      var tilt2 = Math.max(-0.35, Math.min(0.35, v.x / Math.max(1, A * 0.02) * 0.25));
      ex.push(function () { drawSaucer(a.x, a.y, i, 1.3 * s, t, tilt2, q > 0 && q < 1); });
      pack.pos = pack.pos || []; pack.pos[i] = [a.x, a.y - 24 * s, s];
      if (!pack.poof && i === 1) { pack.poof = 1; burst(x, y - 20 * s, 12, 190, 86); sound(5, 0.04); }
      if (q > 0 && q < 1 && Math.random() < 0.25) burst(a.x - Math.sign(v.x || 1) * 22 * s, a.y + 4 * s, 1, i ? 190 : 300, 84);
      return null;
    },
    // water guns: squirting each other across a gap, and a shake when you're hit
    squirt: function (i, me, x, y, face, prog, t, s, p, ex) {
      var per = 1600, since = t - pack.t0, k = (since % per) / per, from = Math.floor(since / per) % 2, to = 1 - from;
      if (i === 1) ex.push(function () {
        var A = pack.pos && pack.pos[from], B = pack.pos && pack.pos[to]; if (!A || !B || k > 0.7) return;
        var sx = A[0] + (B[0] > A[0] ? 1 : -1) * 34 * s, sy = A[1] - 4 * s;
        for (var d = 0; d < 14; d++) {
          var f = Math.max(0, Math.min(1, k / 0.55 - d * 0.04)); if (f <= 0) continue;
          var dx = sx + (B[0] - sx) * f, dy = sy + (B[1] - 6 * s - sy) * f - Math.sin(f * Math.PI) * 28 * s;
          ctx.fillStyle = 'rgba(190,225,255,' + (0.85 - d * 0.04) + ')'; ctx.beginPath(); ctx.arc(dx, dy, (2.4 - d * 0.1) * s, 0, Math.PI * 2); ctx.fill();
        }
        if (k > 0.5 && k < 0.56) burst(B[0], B[1] - 6 * s, 3, 205, 88);
      });
      var hit = i === to && k > 0.55 && k < 0.95;
      return { x: x, y: y, pose: hit ? 'shake' : i === from && k < 0.6 ? 'bow' : 'bounce', face: face, draw: { after: squirter(i) } };
    },
    // water balloons: lobbed back and forth, bursting with a splash
    balloons: function (i, me, x, y, face, prog, t, s, p, ex) {
      var per = 1800, since = t - pack.t0, k = (since % per) / per, from = Math.floor(since / per) % 2, to = 1 - from;
      if (i === 1) ex.push(function () {
        var A = pack.pos && pack.pos[from], B = pack.pos && pack.pos[to]; if (!A || !B) return;
        if (k < 0.62) {
          var f = k / 0.62, bx = A[0] + (B[0] - A[0]) * f, by = A[1] - 10 * s + (B[1] - A[1]) * f - Math.sin(f * Math.PI) * 95 * s;
          ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.sin(t / 120) * 0.3); ctx.scale(s, s);
          ctx.fillStyle = ['#F7A1B8', '#9FCBF0', '#F8DC6E', '#B9A0E0'][Math.floor(since / per) % 4]; ctx.beginPath(); ctx.ellipse(0, 0, 6, 7.5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(-2, -3, 1.8, 2.6, -0.4, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        } else if (k < 0.66) burst(B[0], B[1] - 10 * s, 5, 205, 88);
      });
      var wet = i === to && k > 0.62 && k < 0.95;
      return { x: x, y: y, pose: wet ? 'shake' : i === from && k < 0.14 ? 'bow' : 'sit', face: face, tilt: i === to && k < 0.62 ? -0.3 : 0 };
    },
    // a swim: doggy paddle laps around the pond
    swim: function (i, me, x, y, face, prog, t, s, p) {
      var e = clamp01((prog - 0.12) / 0.76), ang = e * Math.PI * 2 + i * 1.3, cx = p.x + Math.cos(ang - Math.PI / 2) * p.rx * 0.55, cy = p.y + Math.sin(ang - Math.PI / 2) * p.ry * 0.45 + 4 * s;
      var h = hopTo(x, y, cx, cy, prog < 0.12 ? prog : prog > 0.88 ? prog : 0.5, s, 0.9);
      var inWater = !h.moving;
      var dir = Math.cos(ang) >= 0 ? 1 : -1;
      if (inWater && Math.random() < 0.2) burst(h.x - dir * 20 * s, h.y, 1, 205, 88);
      return { x: h.x, y: h.y + (inWater ? Math.sin(t / 260 + i) * 1.5 * s : 0), pose: inWater ? 'run' : 'bounce', ph: inWater ? t / 70 : null, face: inWater ? dir : h.dir, depth: h.depth, draw: inWater ? { after: waterline } : null };
    },
    // playing with what's grown in the background
    swingride: function (i, me, x, y, face, prog, t, s) {
      var A = bank(0.12), ws = wScale(), sw = REDUCED ? 0 : Math.sin(t / 1300) * 0.28, px = A.x - 26 * ws, py = A.y - 62 * ws, len = 44 * ws;
      if (me) { // on the swing, swinging
        var h = hopTo(x, y, px + Math.sin(sw) * len, py + Math.cos(sw) * len, prog, s, 0.72);
        return { x: h.x, y: h.y, pose: h.moving ? 'bounce' : 'sit', face: h.moving ? h.dir : 1, rear: h.moving ? 0 : -sw * 0.7, depth: h.depth };
      }
      var h2 = hopTo(x, y, A.x + 34 * ws, A.y, prog, s, 0.8); // giving a push, or cheering
      return { x: h2.x, y: h2.y, pose: 'bounce', face: h2.moving ? h2.dir : -1, depth: h2.depth };
    },
    bridge: function (i, me, x, y, face, prog, t, s, p) {
      var ws = wScale(), x1 = p.x - p.rx * 0.42, x2 = p.x + p.rx * 0.42, yb = p.y + p.ry * 0.35, bx = p.x + (i ? 1 : -1) * 15 * ws, f = (bx - x1) / (x2 - x1), by = yb - 34 * ws * 2 * f * (1 - f) - 2.5 * ws;
      var h = hopTo(x, y, bx, by, prog, s, 0.85), pr = clamp01((prog - 0.18) / 0.64);
      if (!h.moving && i === 0 && pr > 0.2 && pr < 0.8 && Math.random() < 0.06) burst(p.x, by - 52 * s, 1, 345, 80);
      return { x: h.x, y: h.y, pose: h.moving ? 'bounce' : 'sit', face: h.moving ? h.dir : (i ? -1 : 1), rear: h.moving ? 0 : Math.sin(pr * Math.PI) * 0.5, depth: h.depth };
    },
    nap: function (i, me, x, y, face, prog, t, s, p, ex) {
      var A = bank(0.12), ws = wScale(), h1x = A.x + 8 * ws, h2x = Math.min(W - 8, A.x + 70 * ws);
      var mx = (h1x + h2x) / 2 + (i ? 9 : -9) * ws, my = A.y - 19 * ws + (REDUCED ? 0 : Math.sin(t / 1600) * 1.5 * ws);
      var h = hopTo(x, y, mx, my, prog, s, 0.72);
      if (!h.moving && i === 1) ex.push(function () { zzz((h1x + h2x) / 2, my - 26 * ws, t, ws); });
      return { x: h.x, y: h.y, pose: h.moving ? 'bounce' : 'lie', face: h.moving ? h.dir : (i ? -1 : 1), depth: h.depth };
    },
    gazebo: function (i, me, x, y, face, prog, t, s, p, ex) {
      var ws = wScale(), gx = W * 0.2 + (i ? 9 : -9) * ws * 0.9, gy = H * 0.6 - 1;
      var h = hopTo(x, y, gx, gy, prog, s, 0.42);
      if (!h.moving && i === 1) ex.push(function () { notes(W * 0.2, gy - 34 * ws, t, ws * 0.8); });
      return h.moving ? { x: h.x, y: h.y, pose: 'bounce', face: h.dir, depth: h.depth }
        : { x: h.x, y: h.y, pose: 'sit', face: Math.cos(t / 520 + i * Math.PI), rear: 0.5 + Math.sin(t / 260 + i) * 0.12, depth: h.depth };
    },
    stargaze: function (i, me, x, y, face, prog, t, s) {
      if (i === 1 && hasWonder('garden-meteors') && Math.random() < 0.02) burst(W * (0.2 + Math.random() * 0.6), H * (0.08 + Math.random() * 0.1), 3, 50, 92);
      if (i === 0 && Math.random() < 0.01) burst(x, y - 60 * s, 1, 345, 82); // a wish
      return { x: x, y: y, pose: 'sit', face: face, tilt: -0.6, rear: 0.12 };
    },
    cape: function (i, me, x, y, face, prog, t, s) {
      var q = clamp01((prog - 0.08 - (me ? 0 : 0.06)) / 0.84), L = PUPS[i], col = i ? '#7C97E8' : '#E4566E';
      var A = Math.min(W * 0.34, 380), Hh = Math.max(60, Math.min(H * 0.42, y - 70));
      var draw = { before: function () { drawCape(L, t, col, q > 0 && q < 1); } };
      if (q <= 0 || q >= 1) return { x: x, y: y, pose: prog < 0.5 ? 'bow' : 'bounce', face: pack.fdir, draw: draw }; // capes on, crouch, then a happy landing
      var a = flightAt(q, x, y, pack.fdir, A, Hh), v = flightVel(q, x, y, pack.fdir, A, Hh);
      if (!me) a.y += 18 * s;
      if (Math.random() < 0.3) burst(a.x - Math.sign(v.x) * 22 * s, a.y - 18 * s, 1, i ? 220 : 350, 84);
      if (!pack.whoosh) { pack.whoosh = true; sound(3, 0.04); }
      return { x: a.x, y: a.y, pose: 'run', face: v.x >= 0 ? 1 : -1, ph: Math.PI / 2 + Math.sin(t / 260) * 0.15,
        rear: Math.max(-0.45, Math.min(0.45, Math.atan2(-v.y, Math.abs(v.x) + 0.001))), draw: draw };
    },
    plane: function (i, me, x, y, face, prog, t, s, p, ex) {
      if (i === 1) return null; // both ride in the plane, drawn once
      var q = clamp01((prog - 0.06) / 0.88), A = Math.min(W * 0.38, 420), Hh = Math.max(70, Math.min(H * 0.48, y - 80));
      var a = flightAt(q, x, y, pack.fdir, A, Hh), v = q > 0 && q < 1 ? flightVel(q, x, y, pack.fdir, A, Hh) : { x: pack.fdir, y: 0 };
      var fs = Math.max(-1, Math.min(1, v.x / Math.max(1, A * 0.02))); if (Math.abs(fs) < 0.15) fs = fs < 0 ? -0.15 : 0.15;
      var ang = Math.max(-0.4, Math.min(0.4, Math.atan2(v.y, Math.abs(v.x) + 0.001)));
      ex.push(function () { drawPlane(a.x, a.y, fs, 1.3 * s, t, ang); });
      pack.pos = pack.pos || []; pack.pos[0] = [a.x + fs * 10 * s, a.y - 30 * s, s]; pack.pos[1] = [a.x - fs * 16 * s, a.y - 30 * s, s];
      if (!pack.poof) { pack.poof = 1; burst(x, y - 20 * s, 14, 45, 86); sound(4, 0.05); }
      if (pack.poof === 1 && prog > 0.96) { pack.poof = 2; burst(a.x, a.y - 20 * s, 14, 45, 86); sound(6, 0.05); }
      return null;
    },
    surf: function (i, me, x, y, face, prog, t, s, p) {
      if (!me) return { x: x, y: y, pose: 'bounce', face: p.x > x ? 1 : -1 }; // cheering from the bank
      var cx = p.x, cy = p.y - p.ry * 0.1, sx, sy, jump = 0, k, onWater = prog >= 0.12 && prog <= 0.88;
      if (prog < 0.12) { k = ease(prog / 0.12); sx = x + (cx - x) * k; sy = y + (cy - y) * k; jump = Math.sin(k * Math.PI) * 44 * s; }
      else if (prog > 0.88) { k = ease((prog - 0.88) / 0.12); sx = cx + (x - cx) * k; sy = cy + (y - cy) * k; jump = Math.sin(k * Math.PI) * 44 * s; }
      else { var e = (prog - 0.12) / 0.76; sx = cx + Math.sin(e * Math.PI * 2) * p.rx * 0.55; sy = cy + Math.sin(e * Math.PI * 4) * p.ry * 0.3; }
      var f = pack.surfX == null || Math.abs(sx - pack.surfX) < 0.05 ? (pack.faceS || 1) : sx > pack.surfX ? 1 : -1; pack.surfX = sx; pack.faceS = f;
      if (onWater && Math.random() < 0.35) burst(sx - f * 24 * s, sy, 2, 200, 88, -f);
      return { x: sx, y: sy - jump, pose: onWater ? 'run' : 'bounce', ph: 0.55, face: f, rear: onWater ? Math.sin(t / 300) * 0.08 : 0, draw: onWater ? { before: drawPadUnder } : null };
    },
    float: function (i, me, x, y, face, prog, t, s, p, ex) {
      if (!me) return { x: x, y: y, pose: 'sit', face: face, tilt: -0.4 }; // looking up in wonder
      var inB = prog < 0.8, rise = inB ? ease(prog / 0.6) * 120 * s : 120 * s * (1 - ease((prog - 0.8) / 0.12));
      var dx = Math.sin(t / 700) * 18 * s * Math.min(1, rise / (60 * s)), bx = x + dx, by = y - rise;
      if (!inB && !pack.popped) { pack.popped = true; burst(bx, by - 26 * s, 16, 200, 90); sound(6, 0.05); }
      if (inB) ex.push(function () { bubbleAt(bx, by - 26 * s, 42 * s, 1); });
      return { x: bx, y: by, pose: inB ? 'run' : 'bounce', ph: inB ? Math.sin(t / 220) * 1.2 : null, face: Math.sin(t / 1500) >= 0 ? 1 : -1 };
    },
    kite: function (i, me, x, y, face, prog, t, s, p, ex) {
      if (!me) return { x: x, y: y, pose: 'bounce', face: face, tilt: -0.3 };
      var kx = x - face * 55 * s + Math.sin(t / 1300) * 40 * s, ky = Math.max(30, y - 175 * s + Math.sin(t / 800) * 14 * s);
      var mx = x + face * 36 * s, my = y - 44 * s;
      ex.push(function () { drawKite(mx, my, kx, ky, t, s); });
      return { x: x, y: y, pose: 'sit', face: face, tilt: -0.35 };
    },
    ball: function (i, me, x, y, face, prog, t, s, p, ex) {
      var per = 1500, since = t - pack.t0, k = (since % per) / per, from = Math.floor(since / per) % 2, to = 1 - from;
      if (i === 1) ex.push(function () {
        var A = pack.pos && pack.pos[from], B = pack.pos && pack.pos[to]; if (!A || !B) return;
        drawBall(A[0] + (B[0] - A[0]) * k, A[1] - 8 * s + (B[1] - A[1]) * k - Math.sin(k * Math.PI) * 85 * s, s, t);
      });
      return { x: x, y: y, pose: i === to && k > 0.72 ? 'bounce' : i === from && k < 0.16 ? 'bow' : 'sit', face: face, tilt: i === to ? -0.25 : 0 };
    },
    bubbles: function (i, me, x, y, face, prog, t, s, p, ex) {
      if (i === 1) ex.push(function () {
        var A = pack.pos && pack.pos[0], B = pack.pos && pack.pos[1]; if (!A || !B) return;
        var mx = (A[0] + B[0]) / 2, gy = Math.max(A[1], B[1]);
        for (var j = 0; j < 6; j++) {
          var age = ((t - pack.t0) + j * 433) % 2600, r = (4 + (j % 3) * 2) * s;
          var bx = mx + (j - 2.5) * 16 * s + Math.sin(age / 300 + j) * 10 * s, by = gy - 6 * s - age / 2600 * 130 * s;
          if (age < (pack.bub[j] || 0)) burst(bx, gy - 136 * s, 4, 200, 90);
          pack.bub[j] = age; bubbleAt(bx, by, r, Math.min(1, age / 300));
        }
      });
      return { x: x, y: y, pose: 'bounce', face: face, tilt: -0.35 };
    },
    butterfly: function (i, me, x, y, face, prog, t, s, p, ex) {
      if (me) {
        var bx = x + Math.sin(t / 900) * 60 * s, by = y - 78 * s + Math.sin(t / 430) * 20 * s; pack.bfx = bx;
        ex.push(function () { drawButterfly(bx, by, s, t); });
        return { x: x, y: y, pose: 'bounce', face: bx > x ? 1 : -1, tilt: -0.3 };
      }
      return { x: x, y: y, pose: 'sit', face: pack.bfx != null ? (pack.bfx > x ? 1 : -1) : face, tilt: -0.25 + Math.sin(t / 600) * 0.15 };
    },
    dance: function (i, me, x, y, face, prog, t, s, p, ex) {
      if (i === 1) ex.push(function () {
        var A = pack.pos && pack.pos[0], B = pack.pos && pack.pos[1]; if (!A || !B) return;
        var mx = (A[0] + B[0]) / 2, gy = Math.min(A[1], B[1]);
        ctx.textAlign = 'center'; ctx.font = Math.round(15 * s) + 'px Georgia, serif';
        for (var j = 0; j < 4; j++) {
          var age = ((t - pack.t0) + j * 700) % 2800;
          ctx.fillStyle = 'rgba(255,228,244,' + (Math.sin(Math.PI * age / 2800) * 0.9).toFixed(2) + ')';
          ctx.fillText(j % 2 ? '♪' : '♫', mx + (j - 1.5) * 20 * s + Math.sin(age / 400 + j) * 10 * s, gy - 40 * s - age / 2800 * 70 * s);
        }
      });
      return { x: x, y: y, pose: 'sit', face: Math.cos(t / 520 + i * Math.PI), rear: 0.5 + Math.sin(t / 260 + i) * 0.12 };
    },
    leapfrog: function (i, me, x, y, face, prog, t, s, p, ex) {
      if (i === 1) ex.push(function () {
        var A = pack.pos && pack.pos[0], B = pack.pos && pack.pos[1]; if (!A || !B) return;
        var xa = Math.min(A[0], B[0]) - 48 * s, xb = Math.max(A[0], B[0]) + 48 * s, gy = Math.max(A[1], B[1]) + 20 * s;
        var per = 2200, since = t - pack.t0, k = (since % per) / per, dir = Math.floor(since / per) % 2 ? -1 : 1, e = dir > 0 ? k : 1 - k;
        var bx = xa + (xb - xa) * e, near = Math.max(0, 1 - Math.min(Math.abs(bx - A[0]), Math.abs(bx - B[0])) / (44 * s));
        var by = gy - Math.abs(Math.sin(3 * Math.PI * e)) * (16 * s + 46 * s * near);
        ctx.save(); ctx.translate(bx, by); ctx.scale(-dir * s * 1.1, s * 1.1); drawBunny(false, { name: 'binky' }, 0); ctx.restore();
      });
      return { x: x, y: y, pose: 'bow', face: face };
    }
  };
  // hop from where they are over to a spot, stay a while, and hop back (k: how far there, 0..1)
  function hopTo(x, y, tx, ty, prog, s, tdepth) {
    var k, back = prog > 0.88;
    if (prog < 0.15) k = ease(prog / 0.15); else if (back) k = 1 - ease((prog - 0.88) / 0.12); else k = 1;
    var moving = k < 1, lift = moving ? Math.sin(k * Math.PI) * 44 * s : 0;
    return { x: x + (tx - x) * k, y: y + (ty - y) * k - lift, moving: moving, dir: (back ? x > tx : tx > x) ? 1 : -1, depth: 1 + ((tdepth || 1) - 1) * k };
  }
  function zzz(x, y, t, ws) {
    ctx.textAlign = 'center'; ctx.font = 'italic ' + Math.round(13 * ws) + 'px Georgia, serif';
    for (var j = 0; j < 3; j++) { var age = (t + j * 900) % 2700, a = Math.sin(Math.PI * age / 2700); ctx.fillStyle = 'rgba(235,228,255,' + (a * 0.85).toFixed(2) + ')'; ctx.fillText('z', x + age / 2700 * 18 * ws + j * 3 * ws, y - age / 2700 * 30 * ws); }
  }
  function notes(x, y, t, ws) {
    ctx.textAlign = 'center'; ctx.font = Math.round(15 * ws) + 'px Georgia, serif';
    for (var j = 0; j < 4; j++) { var age = (t + j * 700) % 2800; ctx.fillStyle = 'rgba(255,228,244,' + (Math.sin(Math.PI * age / 2800) * 0.9).toFixed(2) + ')'; ctx.fillText(j % 2 ? '♪' : '♫', x + (j - 1.5) * 16 * ws + Math.sin(age / 400 + j) * 8 * ws, y - age / 2800 * 60 * ws); }
  }
  // is one of the dogs near this point? (for things that react to them)
  function dogNear(x, y, r) { var hit = null; (pack.pos || []).forEach(function (q) { if (q && Math.hypot(q[0] - x, q[1] - y) < r) hit = q; }); return hit; }
  // the water up to their shoulders while they swim, with a ripple
  function waterline() {
    ctx.fillStyle = TOD === 'night' || TOD === 'dusk' ? 'rgba(62,80,130,0.92)' : 'rgba(120,170,220,0.9)'; ctx.beginPath(); ctx.ellipse(2, -8, 30, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(235,245,255,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(2, -12, 30, 5, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  }
  // a bright little water blaster held up by the chin
  function squirter(i) {
    return function () {
      ctx.save(); ctx.translate(24, -14); ctx.rotate(-0.15);
      ctx.fillStyle = i ? '#8FC8F2' : '#F7A1B8'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-4, -4, 18, 7, 3) : ctx.rect(-4, -4, 18, 7); ctx.fill();
      ctx.fillStyle = '#F8DC6E'; ctx.beginPath(); ctx.arc(2, -7, 3.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = i ? '#6FA9D8' : '#E27D98'; ctx.fillRect(-2, 2, 4, 6); ctx.fillRect(12, -2.5, 4, 3);
      ctx.restore();
    };
  }
  // a little flying saucer with its pilot under a glass dome
  function drawSaucer(cx, cy, i, k, t, tilt, flying) {
    ctx.save(); ctx.translate(cx, cy - 10 * k); ctx.rotate(tilt); ctx.scale(k, k);
    if (flying) { var bg = ctx.createLinearGradient(0, 8, 0, 40); bg.addColorStop(0, 'rgba(255,245,200,0.35)'); bg.addColorStop(1, 'rgba(255,245,200,0)'); ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(-10, 6); ctx.lineTo(10, 6); ctx.lineTo(20, 40); ctx.lineTo(-20, 40); ctx.closePath(); ctx.fill(); }
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, -8, 17, 17, 0, Math.PI, 0); ctx.closePath(); ctx.clip();
    ctx.translate(-2, 6); ctx.scale(0.5, 0.5); drawPup(PUPS[i], 'sit', 0, Math.sin(t / 90) * 0.5, false, t, -0.1); ctx.restore();
    ctx.fillStyle = 'rgba(210,235,255,0.28)'; ctx.beginPath(); ctx.ellipse(0, -8, 17, 17, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, -8, 17, 17, 0, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke();
    ctx.fillStyle = i ? '#B9C8F2' : '#F2B9CF'; ctx.beginPath(); ctx.ellipse(0, -4, 30, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = i ? '#8FA3DD' : '#DD8FAE'; ctx.beginPath(); ctx.ellipse(0, -1, 22, 5, 0, 0, Math.PI); ctx.fill();
    for (var l = -2; l <= 2; l++) { ctx.fillStyle = 'hsla(' + ((t / 8 + l * 60) % 360) + ',90%,82%,' + (0.6 + 0.4 * Math.sin(t / 200 + l)) + ')'; ctx.beginPath(); ctx.arc(l * 11, -3, 2, 0, Math.PI * 2); ctx.fill(); }
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
  function drawBoard() {
    ctx.fillStyle = '#F2A3B6'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-23, 0, 46, 3.6, 1.8) : ctx.rect(-23, 0, 46, 3.6); ctx.fill();
    ctx.fillStyle = '#FFF4F7'; ctx.fillRect(-18, 0.8, 36, 1);
    ctx.fillStyle = '#EDE6FA'; [-14, 14].forEach(function (wx) { ctx.beginPath(); ctx.arc(wx, 6, 2.7, 0, Math.PI * 2); ctx.fill(); });
  }
  function frogRider(L) {
    var BY = L.build === 'lean' ? -21 : -18.5;
    return function () { ctx.save(); ctx.translate(19, BY - 21); ctx.scale(0.52, 0.52); drawFrog(false, null, 0, 0, 0, 1); ctx.restore(); };
  }
  function drawPadUnder() {
    ctx.fillStyle = '#6FAE8A'; ctx.beginPath(); ctx.ellipse(0, 2, 27, 6.5, 0, 0.35, Math.PI * 2 - 0.05); ctx.fill();
    ctx.strokeStyle = 'rgba(214,242,218,0.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(-20, 0); ctx.moveTo(0, 2); ctx.lineTo(18, 5); ctx.stroke();
  }
  function bubbleAt(x, y, r, a) {
    ctx.save(); ctx.globalAlpha = a == null ? 1 : a;
    var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(0.8, 'rgba(200,225,255,0.10)'); g.addColorStop(1, 'rgba(230,200,255,0.35)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(235,225,255,0.55)'; ctx.lineWidth = Math.max(1, r / 18); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.42, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawKite(mx, my, kx, ky, t, s) {
    ctx.strokeStyle = 'rgba(255,245,230,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(mx, my);
    ctx.quadraticCurveTo((mx + kx) / 2 + 20 * s, (my + ky) / 2 + 30 * s, kx, ky + 20 * s); ctx.stroke();
    ctx.save(); ctx.translate(kx, ky); ctx.rotate(Math.sin(t / 500) * 0.2); ctx.scale(s, s);
    ctx.fillStyle = '#F7C9D4'; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(13, 0); ctx.lineTo(0, 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#C6DFF4'; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-13, 0); ctx.lineTo(0, 22); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 22); ctx.moveTo(-13, 0); ctx.lineTo(13, 0); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,220,0.7)'; ctx.beginPath(); ctx.moveTo(0, 22);
    for (var j = 1; j <= 6; j++) ctx.lineTo(Math.sin(t / 200 + j) * 5, 22 + j * 7); ctx.stroke();
    ['#F8DC6E', '#D9C8F0', '#C7EBD6'].forEach(function (c, j) { var yy = 22 + (j + 1) * 12, xx = Math.sin(t / 200 + (j + 1) * 1.7) * 5; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx - 4, yy - 3); ctx.lineTo(xx - 4, yy + 3); ctx.closePath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + 4, yy - 3); ctx.lineTo(xx + 4, yy + 3); ctx.closePath(); ctx.fill(); });
    ctx.restore();
  }
  function drawBall(x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t / 150); ctx.scale(s, s);
    ctx.fillStyle = '#F4A6B8'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFF6E6'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, 6, -0.6, 0.6); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 6, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke();
    ctx.restore();
  }
  function drawButterfly(x, y, s, t) {
    var f = 0.25 + Math.abs(Math.sin(t / 70)) * 0.75;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(217,200,240,0.95)'; ctx.beginPath(); ctx.ellipse(-5 * f, -3, 6 * f, 5, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(5 * f, -3, 6 * f, 5, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(247,201,212,0.95)'; ctx.beginPath(); ctx.ellipse(-4 * f, 4, 4 * f, 3.4, 0.4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(4 * f, 4, 4 * f, 3.4, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4A3F5E'; ctx.fillRect(-0.8, -6, 1.6, 12);
    ctx.restore();
  }
  // the little plane: both of them in the cockpit, ears in the wind, pulling a heart banner
  function drawPlane(cx, cy, fs, k, t, ang) {
    ctx.save(); ctx.translate(cx, cy - 16 * k); ctx.scale(fs * k, k); ctx.rotate(ang);
    var w = Math.sin(t / 120);
    ctx.strokeStyle = 'rgba(255,245,230,0.7)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-38, -3); ctx.lineTo(-58, -2 + w); ctx.stroke();
    ctx.fillStyle = 'rgba(255,248,236,0.95)'; ctx.beginPath();
    var bx; for (bx = 0; bx <= 46; bx += 4) ctx.lineTo(-58 - bx, -9 + Math.sin(t / 120 + bx / 7) * 2);
    for (bx = 46; bx >= 0; bx -= 4) ctx.lineTo(-58 - bx, 6 + Math.sin(t / 120 + bx / 7) * 2);
    ctx.closePath(); ctx.fill();
    var hy = -1.5 + Math.sin(t / 120 + 23 / 7) * 2; ctx.fillStyle = '#EE8FA6'; ctx.beginPath(); ctx.moveTo(-81, hy + 4); ctx.bezierCurveTo(-88, hy - 1, -85, hy - 7, -81, hy - 3); ctx.bezierCurveTo(-77, hy - 7, -74, hy - 1, -81, hy + 4); ctx.fill();
    // tail fin
    ctx.fillStyle = '#E79AAE'; ctx.beginPath(); ctx.moveTo(-26, -6); ctx.lineTo(-38, -22); ctx.lineTo(-40, -4); ctx.closePath(); ctx.fill();
    // the two of them, sitting in the cockpit
    var wag = Math.sin(t / 90) * 0.5;
    [[1, 12], [0, -12]].forEach(function (d) { ctx.save(); ctx.translate(d[1], 2); ctx.scale(0.6, 0.6); drawPup(PUPS[d[0]], 'sit', 0, wag, false, t, -0.1); ctx.restore(); });
    // body, stripe, wing, wheels, propeller
    ctx.fillStyle = '#F7C9D4'; ctx.beginPath(); ctx.ellipse(0, -2, 38, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(-30, -3, 60, 2.2);
    ctx.fillStyle = '#C6DFF4'; ctx.beginPath(); ctx.ellipse(4, 5, 22, 3.6, 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4A3F5E'; [-6, 14].forEach(function (wx) { ctx.beginPath(); ctx.arc(wx, 12, 2.6, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = '#F8DC6E'; ctx.beginPath(); ctx.arc(38, -2, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,248,236,0.75)'; ctx.beginPath(); ctx.ellipse(40, -2, 1.6, 2 + 12 * Math.abs(Math.sin(t / 25)), 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
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
  function eye(x, y, r, blink) {
    if (blink) { ctx.strokeStyle = '#2B2620'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.stroke(); return; }
    ctx.fillStyle = '#2B2620'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + r * 0.35, y - r * 0.35, r * 0.4, 0, Math.PI * 2); ctx.fill();
  }
  function cheeks(x1, x2, y) { ctx.fillStyle = 'rgba(247,165,185,0.8)'; [x1, x2].forEach(function (x) { ctx.beginPath(); ctx.ellipse(x, y, 2.6, 1.6, 0, 0, Math.PI * 2); ctx.fill(); }); }
  function smile(x, y, w) { ctx.strokeStyle = '#2B2620'; ctx.lineWidth = 1.3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y - w * 0.4, w, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke(); ctx.lineCap = 'butt'; }
  function drawFrog(b, act, q, fx, fy, s) {
    // a croak: the throat puffs up twice
    if (act && act.name === 'croak') { var puff = Math.abs(Math.sin(q * Math.PI * 2)); ctx.fillStyle = 'rgba(236,250,220,0.95)'; ctx.beginPath(); ctx.ellipse(0, -4, 5 + puff * 5, 3 + puff * 4, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#9ED9A8'; ctx.beginPath(); ctx.ellipse(0, -9, 13, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#D6F2DA'; ctx.beginPath(); ctx.ellipse(0, -6, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9ED9A8'; [-6, 6].forEach(function (x) { ctx.beginPath(); ctx.arc(x, -18, 5, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = '#fff'; [-6, 6].forEach(function (x) { ctx.beginPath(); ctx.arc(x, -18, 3.4, 0, Math.PI * 2); ctx.fill(); });
    var tongue = act && act.name === 'tongue';
    eye(-6, -18, 1.8, b || (tongue && q > 0.2 && q < 0.6)); eye(6, -18, 1.8, b || (tongue && q > 0.2 && q < 0.6)); cheeks(-8, 8, -11);
    if (tongue) {
      // flick toward the nearest firefly, or up at the sky
      var tx = 18, ty = -40, best = 160;
      flies.forEach(function (f) { var d = Math.hypot(f.x * W - fx, f.y * H - fy); if (d < best) { best = d; tx = (f.x * W - fx) / s; ty = (f.y * H - fy) / s; } });
      var reach = Math.sin(q * Math.PI);
      ctx.strokeStyle = '#EE8FA6'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(tx * reach, -10 + (ty + 10) * reach); ctx.stroke(); ctx.lineCap = 'butt';
      ctx.fillStyle = '#EE8FA6'; ctx.beginPath(); ctx.arc(tx * reach, -10 + (ty + 10) * reach, 2.2, 0, Math.PI * 2); ctx.fill();
    } else smile(0, -10, 4);
  }
  function drawBunny(b, act, q) {
    var flop = act && act.name === 'ear' ? Math.sin(q * Math.PI) * 1.2 : 0;
    ctx.fillStyle = '#F4F1FA';
    ctx.beginPath(); ctx.ellipse(-4, -30, 3.2, 10, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(4, -21); ctx.rotate(0.15 + flop); ctx.beginPath(); ctx.ellipse(0, -9, 3.2, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F7C9D4'; ctx.beginPath(); ctx.ellipse(0, -9, 1.4, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#F7C9D4'; ctx.beginPath(); ctx.ellipse(-4, -30, 1.4, 7, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F4F1FA'; ctx.beginPath(); ctx.ellipse(0, -7, 11, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(0, -17, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(10, -7, 3, 0, Math.PI * 2); ctx.fill();
    var happy = act && (act.name === 'binky' || act.name === 'spin');
    if (happy) { ctx.strokeStyle = '#2B2620'; ctx.lineWidth = 1.3; [-3, 3].forEach(function (ex) { ctx.beginPath(); ctx.arc(ex, -17.5, 1.6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }); }
    else { eye(-3, -18, 1.5, b); eye(3, -18, 1.5, b); }
    ctx.fillStyle = '#EE8FA6'; ctx.beginPath(); ctx.arc(0, -15, 1.2, 0, Math.PI * 2); ctx.fill(); cheeks(-5.5, 5.5, -14.5);
  }
  function drawDuck(b, act, q, t) {
    if (act && act.name === 'dive') {
      // bottoms up: only the tail and little feet show, wiggling above the water
      var wig = Math.sin(t / 90) * 0.25, depth = Math.sin(q * Math.PI);
      ctx.save(); ctx.rotate(wig * depth);
      ctx.fillStyle = '#F8DC6E'; ctx.beginPath(); ctx.ellipse(0, -4 * depth, 7, 5 + 3 * depth, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#F2C94C'; ctx.beginPath(); ctx.moveTo(-2, -8 * depth - 2); ctx.lineTo(0, -8 * depth - 8); ctx.lineTo(3, -8 * depth - 2); ctx.fill();
      ctx.fillStyle = '#F4A261'; [-4, 4].forEach(function (fx) { ctx.beginPath(); ctx.ellipse(fx, -9 * depth - 4, 2.2, 1.2, fx * 0.1, 0, Math.PI * 2); ctx.fill(); });
      ctx.restore();
      ctx.strokeStyle = 'rgba(210,225,255,' + (0.5 * depth) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 0, 10 + 8 * q, 2.5 + 2 * q, 0, 0, Math.PI * 2); ctx.stroke();
      return;
    }
    var shake = act && act.name === 'shake' ? Math.sin(q * Math.PI * 10) * 0.25 : 0;
    ctx.fillStyle = '#F8DC6E'; ctx.beginPath(); ctx.ellipse(0, -6, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(-6, -12); ctx.rotate(shake);
    ctx.beginPath(); ctx.arc(0, -3, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F4A261'; ctx.beginPath(); ctx.ellipse(-7, -2, 3.6, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    eye(-1, -4.5, 1.5, b); cheeks(-4.5, 3.5, -1); ctx.restore();
    ctx.fillStyle = '#F2C94C'; ctx.beginPath(); ctx.ellipse(3, -7, 5, 3, -0.3 + (shake ? Math.sin(q * 40) * 0.4 : 0), 0, Math.PI * 2); ctx.fill();
    if (shake) { ctx.fillStyle = 'rgba(210,230,255,0.8)'; for (var d = 0; d < 5; d++) { var a = d / 5 * Math.PI * 2 + q * 6; ctx.beginPath(); ctx.arc(-6 + Math.cos(a) * 12, -14 + Math.sin(a) * 9, 1.2, 0, Math.PI * 2); ctx.fill(); } }
  }
  // the hedgehog's burrow: it keeps popping out, sniffing about, and ducking back in
  function drawBurrow(c, x, y, s, t, blink) {
    var target;
    c.sx = x; c.sy = y; c.ss = s;
    if (c.tapT && t - c.tapT < 1400) target = t - c.tapT < 500 ? 0 : 1; // tapped: a quick duck, then peeks out again
    else if (mode === 'breathe') target = breath.phase === 'in' || breath.phase === 'top' ? 1 : 0.05; // rises with your breath in
    if (target === undefined) { var cyc = (t / 1000 + c.fx * 3) % 7; target = cyc < 1.4 ? 0 : cyc < 1.9 ? 0.45 : cyc < 5.6 ? 1 : 0; }
    if (REDUCED) target = 1;
    c.out += (target - c.out) * (mode === 'breathe' ? 0.03 : 0.09);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // the mound and the dark hole
    ctx.fillStyle = '#4A4A5E'; ctx.beginPath(); ctx.ellipse(0, 1, 22, 7, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1C1D2E'; ctx.beginPath(); ctx.ellipse(0, 0, 13, 4.2, 0, 0, Math.PI * 2); ctx.fill();
    // only the part above the hole shows
    ctx.save(); ctx.beginPath(); ctx.rect(-30, -60, 60, 60); ctx.clip();
    var rise = (1 - c.out) * 24, look = mode === 'breathe' ? 1 : (Math.sin(t / 1300 + 1) > 0 ? 1 : -1), sniff = Math.sin(t / 110) * 0.6 * (c.out > 0.8 ? 1 : 0);
    ctx.translate(0, rise + 3); ctx.scale(look, 1);
    drawHedgehog(blink, sniff);
    ctx.restore();
    // the near rim of the hole, in front
    ctx.strokeStyle = '#5A5A70'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 13, 4.2, 0, 0.1, Math.PI - 0.1); ctx.stroke();
    ctx.restore();
  }
  function drawHedgehog(b, sniff) {
    sniff = sniff || 0;
    ctx.fillStyle = '#9C7B63'; ctx.beginPath();
    for (var i = 0; i <= 8; i++) { var a = Math.PI + i / 8 * Math.PI, r = i % 2 ? 11 : 15; ctx.lineTo(3 + Math.cos(a) * r, -7 + Math.sin(a) * r * 0.9); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#EAD7C0'; ctx.beginPath(); ctx.ellipse(-8, -6, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2B2620'; ctx.beginPath(); ctx.arc(-14.5, -6 + sniff, 1.5, 0, Math.PI * 2); ctx.fill();
    eye(-8, -8, 1.4, b); cheeks(-11, -4, -4.5);
  }

  function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function bloom() {
    var f = addFlower(false); addLantern(f.x * W); save.breaths++; persist(); chime(Math.floor(Math.random() * 5), 0.1); updateCount();
    if (window.TOLRewards && save.breaths % 4 === 0) window.TOLRewards.earn(5, 'breathe', 'Four calm breaths', { quiet: true, soft: true }); // nothing pops up while you breathe
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
    paw: { name: 'two little paws', groups: [].concat(pawAt(0.25, 0.72), pawAt(0.75, 0.3)) }
  };
  // two paw prints walking side by side: a pad, then four toes, for each
  function pawAt(cx, cy) {
    return [{ closed: true, pts: [[cx - 0.15, cy + 0.04], [cx - 0.07, cy + 0.15], [cx + 0.07, cy + 0.15], [cx + 0.15, cy + 0.04], [cx, cy - 0.06]] },
      { pts: [[cx - 0.2, cy - 0.12]] }, { pts: [[cx - 0.075, cy - 0.23]] }, { pts: [[cx + 0.075, cy - 0.23]] }, { pts: [[cx + 0.2, cy - 0.12]] }];
  }
  // more pictures to find: a star map that keeps growing
  function arcPts(cx, cy, r, a0, a1, n, ry) { var a = []; for (var i = 0; i < n; i++) { var t = a0 + (a1 - a0) * i / (n - 1); a.push([cx + Math.cos(t) * r, cy + Math.sin(t) * (ry || r)]); } return a; }
  function heartPts(cx, cy, k, n) { var a = []; for (var i = 0; i < n; i++) { var t = i / n * Math.PI * 2; a.push([cx + k * 16 * Math.pow(Math.sin(t), 3), cy - k * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]); } return a; }
  var MORE_SHAPES = {
    tree: { name: 'a little pine tree', closed: true, pts: [[0.5, 0.08], [0.72, 0.4], [0.61, 0.4], [0.82, 0.7], [0.55, 0.7], [0.55, 0.9], [0.45, 0.9], [0.45, 0.7], [0.18, 0.7], [0.39, 0.4], [0.28, 0.4]] },
    cloud: { name: 'a cloud', closed: true, pts: [[0.14, 0.64], [0.1, 0.52], [0.2, 0.41], [0.32, 0.43], [0.4, 0.3], [0.55, 0.26], [0.66, 0.34], [0.72, 0.44], [0.84, 0.45], [0.9, 0.57], [0.83, 0.67], [0.5, 0.69]] },
    bird: { name: 'a bird in flight', closed: false, pts: [[0.08, 0.42], [0.28, 0.32], [0.44, 0.42], [0.5, 0.56], [0.56, 0.42], [0.72, 0.32], [0.92, 0.42]] },
    fish: { name: 'a fish', closed: true, pts: [[0.12, 0.5], [0.3, 0.3], [0.56, 0.3], [0.72, 0.5], [0.9, 0.32], [0.88, 0.68], [0.72, 0.5], [0.56, 0.7], [0.3, 0.7]] },
    cup: { name: 'a warm cup', groups: [{ pts: [[0.22, 0.3], [0.27, 0.8], [0.63, 0.8], [0.68, 0.3]] }, { pts: [[0.68, 0.4], [0.84, 0.44], [0.84, 0.6], [0.66, 0.66]] }, { pts: [[0.4, 0.14]] }, { pts: [[0.52, 0.1]] }] },
    bell: { name: 'a bell', groups: [{ closed: true, pts: [[0.5, 0.12], [0.66, 0.24], [0.7, 0.54], [0.84, 0.74], [0.16, 0.74], [0.3, 0.54], [0.34, 0.24]] }, { pts: [[0.5, 0.88]] }] },
    umbrella: { name: 'an umbrella', groups: [{ pts: arcPts(0.5, 0.5, 0.4, Math.PI, Math.PI * 2, 7, 0.34) }, { pts: [[0.5, 0.18], [0.5, 0.84], [0.4, 0.9]] }] },
    boat: { name: 'a little sailboat', groups: [{ closed: true, pts: [[0.12, 0.68], [0.88, 0.68], [0.74, 0.86], [0.26, 0.86]] }, { closed: true, pts: [[0.5, 0.12], [0.5, 0.6], [0.24, 0.6]] }] },
    mountain: { name: 'a mountain', closed: false, pts: [[0.04, 0.84], [0.28, 0.42], [0.42, 0.6], [0.62, 0.18], [0.78, 0.5], [0.96, 0.84]] },
    candle: { name: 'a candle', groups: [{ closed: true, pts: [[0.4, 0.42], [0.6, 0.42], [0.6, 0.9], [0.4, 0.9]] }, { closed: true, pts: [[0.5, 0.1], [0.58, 0.25], [0.5, 0.34], [0.42, 0.25]] }] },
    feather: { name: 'a feather', closed: true, pts: [[0.18, 0.9], [0.32, 0.62], [0.52, 0.36], [0.82, 0.1], [0.72, 0.42], [0.52, 0.64], [0.3, 0.78]] },
    snail: { name: 'a snail', groups: [{ pts: (function () { var a = []; for (var i = 0; i < 9; i++) { var t = i / 8 * Math.PI * 3.2, r = 0.3 - i * 0.03; a.push([0.52 + Math.cos(t + Math.PI) * r, 0.5 + Math.sin(t + Math.PI) * r]); } return a; })() }, { pts: [[0.08, 0.84], [0.9, 0.84], [0.95, 0.72]] }] },
    sun: { name: 'the sun', groups: [{ closed: true, pts: arcPts(0.5, 0.5, 0.22, 0, Math.PI * 2 * 7 / 8, 8) }, { pts: [[0.5, 0.1]] }, { pts: [[0.9, 0.5]] }, { pts: [[0.5, 0.9]] }, { pts: [[0.1, 0.5]] }] },
    rainbow: { name: 'a rainbow', groups: [{ pts: arcPts(0.5, 0.78, 0.42, Math.PI, Math.PI * 2, 6) }, { pts: arcPts(0.5, 0.78, 0.26, Math.PI * 2, Math.PI, 5) }] },
    raindrop: { name: 'a raindrop', closed: true, pts: [[0.5, 0.1], [0.64, 0.4], [0.7, 0.6], [0.62, 0.78], [0.5, 0.84], [0.38, 0.78], [0.3, 0.6], [0.36, 0.4]] },
    mushroom: { name: 'a mushroom', groups: [{ closed: true, pts: [[0.12, 0.5], [0.24, 0.28], [0.5, 0.16], [0.76, 0.28], [0.88, 0.5]] }, { pts: [[0.4, 0.5], [0.38, 0.86], [0.62, 0.86], [0.6, 0.5]] }] },
    twohearts: { name: 'two hearts', groups: [{ closed: true, pts: heartPts(0.32, 0.36, 0.014, 8) }, { closed: true, pts: heartPts(0.68, 0.62, 0.014, 8) }] },
    infinity: { name: 'an infinity loop', closed: true, pts: (function () { var a = []; for (var i = 0; i < 12; i++) { var t = i / 12 * Math.PI * 2, d = 1 + Math.pow(Math.sin(t), 2); a.push([0.5 + 0.42 * Math.cos(t) / d, 0.5 + 0.42 * Math.sin(t) * Math.cos(t) / d]); } return a; })() },
    gem: { name: 'a gem', closed: true, pts: [[0.3, 0.2], [0.7, 0.2], [0.88, 0.4], [0.5, 0.88], [0.12, 0.4]] },
    teapot: { name: 'a teapot', groups: [{ closed: true, pts: [[0.32, 0.4], [0.68, 0.4], [0.78, 0.6], [0.68, 0.8], [0.32, 0.8], [0.22, 0.6]] }, { pts: [[0.23, 0.56], [0.1, 0.42], [0.06, 0.34]] }, { pts: [[0.5, 0.28]] }] },
    bridge: { name: 'a little bridge', closed: false, pts: [[0.04, 0.72], [0.2, 0.52], [0.38, 0.42], [0.62, 0.42], [0.8, 0.52], [0.96, 0.72]] },
    lantern: { name: 'a lantern', groups: [{ closed: true, pts: [[0.34, 0.32], [0.66, 0.32], [0.72, 0.78], [0.28, 0.78]] }, { pts: [[0.4, 0.32], [0.5, 0.14], [0.6, 0.32]] }] },
    cat: { name: 'a sleepy cat', closed: true, pts: [[0.2, 0.3], [0.3, 0.1], [0.42, 0.28], [0.58, 0.28], [0.7, 0.1], [0.8, 0.3], [0.8, 0.64], [0.5, 0.84], [0.2, 0.64]] },
    acorn: { name: 'an acorn', groups: [{ closed: true, pts: [[0.24, 0.38], [0.34, 0.22], [0.66, 0.22], [0.76, 0.38]] }, { pts: [[0.3, 0.38], [0.32, 0.62], [0.5, 0.86], [0.68, 0.62], [0.7, 0.38]] }, { pts: [[0.5, 0.1]] }] },
    crown: { name: 'a daisy crown', closed: true, pts: [[0.14, 0.76], [0.14, 0.3], [0.32, 0.52], [0.5, 0.2], [0.68, 0.52], [0.86, 0.3], [0.86, 0.76]] },
    bone: { name: 'a dog bone', closed: true, pts: [[0.16, 0.36], [0.26, 0.26], [0.36, 0.4], [0.64, 0.4], [0.74, 0.26], [0.84, 0.36], [0.78, 0.5], [0.84, 0.64], [0.74, 0.74], [0.64, 0.6], [0.36, 0.6], [0.26, 0.74], [0.16, 0.64], [0.22, 0.5]] },
    sprout: { name: 'a sprout', groups: [{ pts: [[0.5, 0.9], [0.5, 0.5]] }, { closed: true, pts: [[0.5, 0.56], [0.34, 0.44], [0.18, 0.28], [0.38, 0.3], [0.5, 0.44]] }, { closed: true, pts: [[0.5, 0.5], [0.64, 0.34], [0.84, 0.22], [0.76, 0.42], [0.56, 0.54]] }] },
    apple: { name: 'an apple', groups: [{ closed: true, pts: [[0.5, 0.3], [0.66, 0.24], [0.8, 0.36], [0.8, 0.58], [0.66, 0.82], [0.5, 0.76], [0.34, 0.82], [0.2, 0.58], [0.2, 0.36], [0.34, 0.24]] }, { pts: [[0.5, 0.3], [0.54, 0.12]] }, { pts: [[0.62, 0.14]] }] },
    balloon: { name: 'a balloon', groups: [{ closed: true, pts: arcPts(0.5, 0.36, 0.26, -Math.PI / 2, Math.PI * 1.5 - 0.5, 9, 0.28) }, { pts: [[0.5, 0.64], [0.46, 0.76], [0.54, 0.86], [0.5, 0.96]] }] },
    key: { name: 'a little key', groups: [{ closed: true, pts: arcPts(0.28, 0.5, 0.16, 0, Math.PI * 2 * 5 / 6, 6) }, { pts: [[0.44, 0.5], [0.9, 0.5]] }, { pts: [[0.78, 0.5], [0.78, 0.64]] }, { pts: [[0.88, 0.5], [0.88, 0.62]] }] },
    letter: { name: 'a letter', groups: [{ closed: true, pts: [[0.14, 0.28], [0.86, 0.28], [0.86, 0.76], [0.14, 0.76]] }, { pts: [[0.14, 0.28], [0.5, 0.56], [0.86, 0.28]] }] },
    snowflake: { name: 'a snowflake', groups: [{ pts: [[0.5, 0.1], [0.5, 0.5], [0.5, 0.9]] }, { pts: [[0.15, 0.3], [0.5, 0.5], [0.85, 0.7]] }, { pts: [[0.15, 0.7], [0.5, 0.5], [0.85, 0.3]] }] },
    owl: { name: 'a little owl', groups: [{ closed: true, pts: [[0.3, 0.2], [0.4, 0.3], [0.6, 0.3], [0.7, 0.2], [0.76, 0.5], [0.66, 0.84], [0.34, 0.84], [0.24, 0.5]] }, { pts: [[0.4, 0.44]] }, { pts: [[0.6, 0.44]] }] },
    mitten: { name: 'a mitten', closed: true, pts: [[0.34, 0.9], [0.3, 0.5], [0.34, 0.24], [0.5, 0.14], [0.66, 0.24], [0.68, 0.46], [0.8, 0.4], [0.84, 0.52], [0.7, 0.66], [0.66, 0.9]] },
    note: { name: 'a music note', groups: [{ closed: true, pts: [[0.24, 0.74], [0.34, 0.66], [0.44, 0.72], [0.36, 0.82]] }, { pts: [[0.44, 0.72], [0.44, 0.18], [0.76, 0.3], [0.76, 0.42]] }] },
    pup: { name: 'a pup’s face', groups: [{ closed: true, pts: [[0.3, 0.3], [0.5, 0.24], [0.7, 0.3], [0.76, 0.56], [0.62, 0.8], [0.38, 0.8], [0.24, 0.56]] }, { pts: [[0.3, 0.3], [0.14, 0.52], [0.24, 0.6]] }, { pts: [[0.7, 0.3], [0.86, 0.52], [0.76, 0.6]] }, { pts: [[0.5, 0.64]] }] },
    hotair: { name: 'a hot-air balloon', groups: [{ closed: true, pts: [[0.5, 0.08], [0.72, 0.18], [0.8, 0.38], [0.66, 0.6], [0.34, 0.6], [0.2, 0.38], [0.28, 0.18]] }, { closed: true, pts: [[0.42, 0.78], [0.58, 0.78], [0.58, 0.9], [0.42, 0.9]] }, { pts: [[0.36, 0.6], [0.42, 0.78]] }, { pts: [[0.64, 0.6], [0.58, 0.78]] }] }
  };
  Object.keys(MORE_SHAPES).forEach(function (id) { SHAPES[id] = MORE_SHAPES[id]; });
  // shapes are one line unless they have separate parts; either way, work from parts
  Object.keys(SHAPES).forEach(function (id) {
    var d = SHAPES[id];
    if (!d.groups) d.groups = [{ closed: d.closed, pts: d.pts }];
    d.pts = []; d.parts = [];
    d.groups.forEach(function (g) { d.parts.push({ start: d.pts.length, len: g.pts.length, closed: !!g.closed }); d.pts = d.pts.concat(g.pts); });
  });
  // trace a shape's lines through its first n stars (all of them if n is left out)
  function tracePath(xy, parts, n) {
    if (n == null) n = xy.length;
    ctx.beginPath();
    parts.forEach(function (pt) {
      var k = Math.max(0, Math.min(pt.len, n - pt.start)); if (k < 2) return;
      ctx.moveTo(xy[pt.start][0], xy[pt.start][1]);
      for (var i = 1; i < k; i++) ctx.lineTo(xy[pt.start + i][0], xy[pt.start + i][1]);
      if (k === pt.len && pt.closed && pt.len > 2) ctx.closePath();
    });
  }
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
    paw: ['The Paw Prints', 'For the small companions who love us without words.'],
    tree: ['The Evergreen', 'Some things stay steady through every season.'],
    cloud: ['The Cloud', 'Thoughts drift by. You don’t have to follow each one.'],
    bird: ['The Swallow', 'You can travel far and still come home.'],
    fish: ['The Fish', 'Go with the current when you can.'],
    cup: ['The Warm Cup', 'A small pause, held in both hands.'],
    bell: ['The Bell', 'A clear, kind word carries a long way.'],
    umbrella: ['The Umbrella', 'You can’t stop the rain, but you can share the shelter.'],
    boat: ['The Sailboat', 'Change the sails, not the whole sea.'],
    mountain: ['The Mountain', 'The view gets wider, one step at a time.'],
    candle: ['The Candle', 'A small light is still a light.'],
    feather: ['The Feather', 'Hold your worries lightly tonight.'],
    snail: ['The Snail', 'Slow is still moving.'],
    sun: ['The Sun', 'Morning always comes back round.'],
    rainbow: ['The Rainbow', 'Something bright often follows the rain.'],
    raindrop: ['The Raindrop', 'Small things add up to a whole river.'],
    mushroom: ['The Mushroom', 'Quiet growth happens where nobody is looking.'],
    twohearts: ['The Two Hearts', 'Two hearts of gold, side by side, like Tidbit and Sugarfoot.'],
    infinity: ['The Loop', 'Kindness comes back around.'],
    gem: ['The Gem', 'You notice what matters. That is a gift.'],
    teapot: ['The Teapot', 'Make a pot for two, and ask how their day was.'],
    bridge: ['The Bridge', 'Reach across the gap. Someone may be reaching back.'],
    lantern: ['The Lantern', 'Light the next few steps. That’s enough.'],
    cat: ['The Sleepy Cat', 'Rest is not a prize. It’s a need.'],
    acorn: ['The Acorn', 'Big things start very small.'],
    crown: ['The Daisy Crown', 'Everyone deserves to be celebrated for something.'],
    bone: ['The Bone', 'Tidbit and Sugarfoot would share this one. Probably.'],
    sprout: ['The Sprout', 'New things start small and green. Give them time.'],
    apple: ['The Apple', 'Something simple and good, shared, is plenty.'],
    balloon: ['The Balloon', 'Hold on lightly. Some things are lovelier when they float.'],
    key: ['The Key', 'A kind question can open a lot of doors.'],
    letter: ['The Letter', 'Write someone a few warm words this week.'],
    snowflake: ['The Snowflake', 'No two alike, and each one lovely.'],
    owl: ['The Little Owl', 'Listen twice as much as you speak tonight.'],
    mitten: ['The Mitten', 'Warm hands, warm heart. Hold one tonight if you can.'],
    note: ['The Note', 'One small note can start a whole song.'],
    pup: ['The Pup', 'Be as glad to see someone as a dog is.'],
    hotair: ['The Hot-Air Balloon', 'Rise slowly. The view is worth it.']
  };
  // wild constellations: new every time, drawn from the night itself, with a name and a kind thought
  var WILD_ADJ = ['Quiet', 'Gentle', 'Wandering', 'Sleepy', 'Patient', 'Brave', 'Little', 'Silver', 'Faithful', 'Hopeful', 'Humming', 'Dancing', 'Kindly', 'Steady', 'Dreaming', 'Curious', 'Lantern-lit', 'Midnight', 'Morning', 'Laughing', 'Listening', 'Golden'];
  var WILD_NOUN = ['Heron', 'Path', 'River', 'Kettle', 'Harp', 'Fox', 'Owl', 'Garden Gate', 'Ladder', 'Kite String', 'Hedgehog', 'Willow', 'Map', 'Staircase', 'Firefly', 'Violin', 'Swan', 'Walking Stick', 'Hill Path', 'Wren', 'Comet Tail', 'Pebble Trail', 'Dragonfly', 'Otter', 'Moth', 'Signpost'];
  var WILD_THOUGHT = [
    'Nobody has ever drawn this one before. Neither has anyone ever been quite like you.',
    'A path made of small lights. Most good days are, too.',
    'Some shapes only appear when you slow down enough to see them.',
    'Every star here was already shining. You just joined them up.',
    'The sky keeps making new pictures. There is always more to find.',
    'Name it after someone who makes you feel at home.',
    'Connecting one small thing to the next is how a lot of good work gets done.',
    'Look how far you came, one star at a time.',
    'Stars don’t hurry, and they still cross the whole sky.',
    'Tonight’s sky made this just for you.',
    'A winding line is still a line that arrives.',
    'You noticed something nobody else saw tonight.'
  ];
  // the names of constellations found before names were kept, for My garden (/keepsakes.html)
  if (!AMBIENT && save.consts.length && (!save.cnames || save.consts.some(function (id) { return !save.cnames[id]; }))) {
    save.cnames = save.cnames || {};
    save.consts.forEach(function (id) { if (MEANING[id]) save.cnames[id] = MEANING[id][0]; });
    persist();
  }
  var SHAPE_IDS = Object.keys(SHAPES), shape = null, targets = [], shapeDone = 0, dwell = null, sparks = [], shooting = null, nextShoot = 0;
  // One picture, one of endless variations: mirrored or not, a slight turn and stretch, a different
  // first star and direction, parts in a different order, and a little natural wobble. Each variation
  // has a key; the keys this browser has seen are kept, so the same puzzle never comes round twice.
  function variantOf(id, r) {
    var d = SHAPES[id], mir = r() < 0.5, ang = (r() - 0.5) * 0.5, sx = 0.9 + r() * 0.18, sy = 0.9 + r() * 0.18, sig = [];
    var groups = d.parts.map(function (pt, gi) {
      var pts = d.pts.slice(pt.start, pt.start + pt.len).map(function (q) { return q.slice(); });
      if (pt.closed && pts.length > 2) { var st = Math.floor(r() * pts.length); pts = pts.slice(st).concat(pts.slice(0, st)); if (r() < 0.5) pts = [pts[0]].concat(pts.slice(1).reverse()); sig.push(gi + 's' + st + (pts.length > 1 ? pts[1][0].toFixed(2) : '')); }
      else if (pts.length > 1 && r() < 0.5) { pts.reverse(); sig.push(gi + 'r'); }
      return { closed: pt.closed, pts: pts, gi: gi };
    });
    for (var i = groups.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), tmp = groups[i]; groups[i] = groups[j]; groups[j] = tmp; }
    var ca = Math.cos(ang), sa = Math.sin(ang), all = [], parts = [];
    groups.forEach(function (g) {
      parts.push({ start: all.length, len: g.pts.length, closed: !!g.closed });
      g.pts.forEach(function (q) {
        var x = (q[0] - 0.5) * sx * (mir ? -1 : 1), y = (q[1] - 0.5) * sy;
        all.push([x * ca - y * sa + (r() - 0.5) * 0.024, x * sa + y * ca + (r() - 0.5) * 0.024]);
      });
    });
    fitUnit(all);
    return { id: id, pts: all, parts: parts, key: id + ':' + (mir ? 'm' : 'n') + ':' + Math.round(ang * 24) + ':' + Math.round(sx * 20) + Math.round(sy * 20) + ':' + groups.map(function (g) { return g.gi; }).join('') + ':' + sig.join(',') };
  }
  // scale and centre points into the unit square with a little margin, keeping their shape
  function fitUnit(all) {
    var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    all.forEach(function (q) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
    var k = 0.88 / Math.max(x1 - x0, y1 - y0, 0.3), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    all.forEach(function (q) { q[0] = 0.5 + (q[0] - mx) * k; q[1] = 0.5 + (q[1] - my) * k; });
  }
  function segHit(a, b, c, d) {
    function o(p, q, r2) { return (q[0] - p[0]) * (r2[1] - p[1]) - (q[1] - p[1]) * (r2[0] - p[0]); }
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
  }
  // a wild constellation: a winding line of six to nine stars that never crosses itself
  function wildShape(r) {
    for (var t = 0; t < 300; t++) {
      var n = 6 + Math.floor(r() * 4), pts = [[0.2 + r() * 0.6, 0.2 + r() * 0.6]], ang = r() * Math.PI * 2, ok = true;
      while (pts.length < n && ok) {
        ok = false;
        for (var k = 0; k < 40 && !ok; k++) {
          var a = ang + (r() - 0.5) * 2.4, dd = 0.2 + r() * 0.2, last = pts[pts.length - 1], q = [last[0] + Math.cos(a) * dd, last[1] + Math.sin(a) * dd];
          if (q[0] < 0.06 || q[0] > 0.94 || q[1] < 0.06 || q[1] > 0.94) continue;
          if (pts.some(function (p2) { return Math.hypot(p2[0] - q[0], p2[1] - q[1]) < 0.14; })) continue;
          var cross = false; for (var i = 0; i + 1 < pts.length - 1; i++) if (segHit(pts[i], pts[i + 1], last, q)) cross = true;
          if (cross) continue;
          pts.push(q); ang = a; ok = true;
        }
      }
      if (!ok) continue;
      var closed = n >= 7 && r() < 0.35;
      if (closed) { var L2 = pts.length - 1; for (var j = 1; j + 1 < L2; j++) if (segHit(pts[j], pts[j + 1], pts[L2], pts[0])) closed = false; }
      fitUnit(pts);
      var name = 'The ' + WILD_ADJ[Math.floor(r() * WILD_ADJ.length)] + ' ' + WILD_NOUN[Math.floor(r() * WILD_NOUN.length)];
      return { id: 'wild', wild: true, name: name, meaning: WILD_THOUGHT[Math.floor(r() * WILD_THOUGHT.length)], pts: pts, parts: [{ start: 0, len: pts.length, closed: closed }], key: 'wild:' + name };
    }
    return null;
  }
  // where the stars go on this screen; a puzzle is only used if every star is on the sky, clear of the
  // title and the buttons, and far enough from the others to reach one at a time
  function placeTargets(def) {
    var sz = Math.min(W, H) * 0.36, cx = W * 0.5, cy = H * 0.3;
    var ts = def.pts.map(function (p) { return { x: cx + (p[0] - 0.5) * sz, y: cy + (p[1] - 0.5) * sz, done: false }; });
    var ok = ts.every(function (p) { return p.x > 18 && p.x < W - 18 && p.y > 56 && p.y < H * 0.62; });
    for (var i = 0; i < ts.length && ok; i++) for (var j = i + 1; j < ts.length; j++) {
      var dist = Math.hypot(ts[i].x - ts[j].x, ts[i].y - ts[j].y);
      if (dist < (j === i + 1 ? 22 : 16)) { ok = false; break; }
    }
    return ok ? ts : null;
  }
  function puzzleOK(def) { return !!(def && placeTargets(def)); }
  function chooseId() {
    var unfound = SHAPE_IDS.filter(function (id) { return save.consts.indexOf(id) === -1 && (!shape || id !== shape.id); });
    if (unfound.length) return unfound[Math.floor(vr() * unfound.length)];
    // everything found: the pictures you've seen least recently come first
    return pickFresh(SHAPE_IDS.filter(function (id) { return !shape || id !== shape.id; }), 'cs', function (x) { return x; }, Math.floor(SHAPE_IDS.length * 0.6));
  }
  function newShape() {
    var seen = seenList('c'), allFound = save.consts.length >= SHAPE_IDS.length;
    var wildTurn = save.consts.length >= 3 && vr() < (allFound ? 0.45 : 0.18), def = null, ts = null;
    for (var t = 0; t < 60 && !ts; t++) {
      def = wildTurn && t < 40 ? wildShape(vr) : variantOf(chooseId(), vr);
      if (!def || (seen.indexOf(def.key) >= 0 && t < 50)) { def = null; continue; }
      ts = placeTargets(def);
    }
    if (!ts) { var id0 = chooseId(), d0 = SHAPES[id0]; def = { id: id0, pts: d0.pts, parts: d0.parts, key: id0 + ':plain:' + Date.now() }; ts = placeTargets(def) || def.pts.map(function (p) { return { x: W * 0.5 + (p[0] - 0.5) * Math.min(W, H) * 0.36, y: H * 0.3 + (p[1] - 0.5) * Math.min(W, H) * 0.36, done: false }; }); }
    shape = { id: def.id, def: def, key: def.key, wild: !!def.wild, name: def.name, meaning: def.meaning }; shapeDone = 0;
    targets = ts;
    markSeen('c', def.key, 500);
    if (!def.wild) markSeen('cs', def.id, 60);
    save.variety.pics = (save.variety.pics || 0) + 1;
    flies.forEach(function (f) { f.home = null; });
  }
  // the same puzzle, laid out again for a new screen size (keeps the stars you've lit)
  function relayoutShape() {
    if (!shape) return;
    var ts = placeTargets(shape.def); if (!ts) return;
    ts.forEach(function (p, i) { p.done = !!(targets[i] && targets[i].done); }); targets = ts;
  }
  function drawShape(t) {
    if (!shape) return;
    var glow = shapeDone ? Math.min(1, (t - shapeDone) / 900) : 0;
    ctx.strokeStyle = 'rgba(255,240,210,' + (0.12 + glow * 0.6) + ')'; ctx.lineWidth = 1 + glow * 1.5; ctx.setLineDash(glow ? [] : [3, 6]);
    var xy = targets.map(function (p) { return [p.x, p.y]; });
    tracePath(xy, shape.def.parts); ctx.stroke(); ctx.setLineDash([]);
    // the lines you've connected so far, glowing
    var litN = 0; while (litN < targets.length && targets[litN].done) litN++;
    if (litN > 1 && !glow) {
      ctx.save(); ctx.strokeStyle = 'rgba(255,236,190,0.85)'; ctx.lineWidth = 2.4; ctx.shadowColor = 'rgba(255,230,170,0.9)'; ctx.shadowBlur = 10; ctx.lineCap = 'round';
      tracePath(xy, shape.def.parts, litN); ctx.stroke(); ctx.restore();
    }
    if (glow) { // the finished picture shimmers
      ctx.save(); ctx.strokeStyle = 'rgba(255,236,190,' + (0.5 + 0.4 * Math.sin(t / 300)) + ')'; ctx.lineWidth = 3; ctx.shadowColor = 'rgba(255,220,160,1)'; ctx.shadowBlur = 18;
      tracePath(xy, shape.def.parts); ctx.stroke();
      ctx.fillStyle = 'rgba(255,240,200,0.9)'; targets.forEach(function (p) { ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2); ctx.fill(); }); ctx.restore();
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
      ctx.fillText('\u2728 ' + lit + ' of ' + targets.length + ' lit  \u00b7  ' + (shape.wild ? 'a wild one, never seen before' : save.consts.length + ' of ' + SHAPE_IDS.length + ' pictures found'), W / 2, lowest + 34);
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
  function burst(x, y, n, hue, light, dirX) {
    if (REDUCED) return;
    for (var i = 0; i < n; i++) {
      var a = dirX ? (dirX > 0 ? -Math.PI * 0.3 : -Math.PI * 0.7) + (Math.random() - 0.5) * 0.9 : Math.random() * Math.PI * 2, v = 0.6 + Math.random() * 1.6;
      sparks.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.4, life: 1, h: hue == null ? 40 + Math.random() * 30 : hue, l: light || 85 });
    }
  }
  function drawSparks(dt) {
    for (var i = sparks.length - 1; i >= 0; i--) {
      var p = sparks[i]; p.x += p.vx * dt * 0.06; p.y += p.vy * dt * 0.06; p.vy += 0.002 * dt; p.life -= dt / 900;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.fillStyle = 'hsla(' + p.h + ',' + (p.l < 60 ? 45 : 100) + '%,' + p.l + '%,' + p.life + ')';
      if (p.h === 345) { // little hearts
        var r = 2.4 + p.life * 1.8; ctx.beginPath(); ctx.moveTo(p.x, p.y + r * 0.9);
        ctx.bezierCurveTo(p.x - r * 1.6, p.y - r * 0.2, p.x - r * 0.7, p.y - r * 1.5, p.x, p.y - r * 0.5);
        ctx.bezierCurveTo(p.x + r * 0.7, p.y - r * 1.5, p.x + r * 1.6, p.y - r * 0.2, p.x, p.y + r * 0.9); ctx.fill();
      } else { ctx.beginPath(); ctx.arc(p.x, p.y, 1.8 + p.life * 1.4, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  // now and then a shooting star crosses the sky; catch it for a wish
  function drawShooting(t) {
    if (mode !== 'fireflies' || REDUCED) return;
    if (!nextShoot) nextShoot = t + (15000 + Math.random() * 15000) * SHOOT;
    if (!shooting && t > nextShoot) { var fromLeft = Math.random() < 0.5; shooting = { t0: t, x0: fromLeft ? W * 0.05 : W * 0.95, y0: H * (0.06 + Math.random() * 0.1), dx: (fromLeft ? 1 : -1) * W * 0.7, dy: H * 0.22, caught: false }; }
    if (!shooting) return;
    var q = (t - shooting.t0) / 3200; if (q >= 1) { shooting = null; nextShoot = t + (25000 + Math.random() * 25000) * SHOOT; return; }
    var x = shooting.x0 + shooting.dx * q, y = shooting.y0 + shooting.dy * q;
    var g = ctx.createLinearGradient(x, y, x - shooting.dx * 0.12, y - shooting.dy * 0.12);
    g.addColorStop(0, 'rgba(255,250,230,0.95)'); g.addColorStop(1, 'rgba(255,250,230,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - shooting.dx * 0.12, y - shooting.dy * 0.12); ctx.stroke(); ctx.lineCap = 'butt';
    ctx.fillStyle = '#FFFBEA'; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
    if (wand.active && Math.hypot(wand.x - x, wand.y - y) < 44) {
      burst(x, y, 40, 50); [0, 2, 4, 5, 6].forEach(function (n, k) { setTimeout(function () { chime(n, 0.09); }, k * 110); });
      save.wishes = (save.wishes || 0) + 1; addFlower(false); addLantern(); persist(); updateCount();
      if (window.TOLRewards) window.TOLRewards.earn(4, 'fireflies', 'You caught a shooting star', { soft: true });
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
        targets.forEach(function (p, k) { setTimeout(function () { chime(k, 0.06); burst(p.x, p.y, 6); }, 250 + k * 120); });
        if (audio && audio.music && save.sound) setTimeout(function () { audio.music.reward(true); }, 350 + targets.length * 120);
        var first = !shape.wild && save.consts.indexOf(shape.id) === -1, m = shape.wild ? [shape.name, shape.meaning] : MEANING[shape.id] || ['A new constellation', ''];
        if (first) { save.consts.push(shape.id); save.cnames = save.cnames || {}; save.cnames[shape.id] = m[0]; persist(); }
        if (shape.wild) { save.wild = (save.wild || 0) + 1; persist(); }
        if (window.TOLRewards) window.TOLRewards.earn(first ? 15 : shape.wild ? 8 : 6, 'fireflies', first ? 'A new constellation' : shape.wild ? 'A wild constellation' : 'A constellation sang', { soft: true });
        say(m[0] + (first ? ' \u2728 New!' : shape.wild ? ' \u2728' : ''), m[1] + (first ? '  ' + save.consts.length + ' of ' + SHAPE_IDS.length + ' found.' : shape.wild ? '  Wild constellations found: ' + save.wild + '.' : ''), 5200);
        updateCount();
        if (first) setTimeout(function () { askDedication(shape.id, m[0]); }, 2600);
      }
    }
  }

  // Lily pond: slow, forgiving falling shapes
  // Drag a pad sideways with your finger, tap to turn it, flick down to drop it. A brief
  // pause before a pad settles lets you slide it into place. Rows bloom into flowers; two or
  // more at once are a double (or triple) bloom. Now and then a golden lotus drifts in.
  // If the pond fills, it simply settles and starts fresh: you can't lose.
  var COLS = 8, ROWS = 12, board = [], piece = null, nextK = null, cell = 30, bx = 0, by = 0, dropAt = 0, clearing = null, settleAt = 0;
  var pondRows = 0, pondBest = 0, landT = 0, landMoves = 0, gold = 0;
  var PIECES = [
    [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [1, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 2]], [[1, 0], [1, 1], [1, 2], [0, 2]], [[1, 0], [2, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [1, 1], [2, 1]]
  ];
  var LILY = ['#BFE3CF', '#C6DFF4', '#D9C8F0', '#F7C9D4', '#F8E7AE', '#F9C9B4', '#A9DCC8', '#F6D77A', '#9FB9C4'];
  var GOLD = 8, OLD = 9; // OLD: the old lilies a pond layout starts with

  // Pond layouts: most ponds start with a few rows of old lilies with gaps in them. Each layout is made
  // by starting from full rows and lifting pads out, one shape at a time, only ever lifting a pad
  // with open water straight above it. So the same pads, dropped back in the reverse order, always
  // fit: the first few pads to drift in are exactly those, and the layout is always solvable.
  // Every layout is checked by dropping them back before it's used, and seen layouts aren't repeated.
  var queue = [], layout = null;
  function rotCells(cells, k) { var c = cells.map(function (x) { return x.slice(); }); for (var i = 0; i < k; i++) { var w = Math.max.apply(null, c.map(function (x) { return x[0]; })); c = c.map(function (x) { return [x[1], w - x[0]]; }); } return c; }
  function makeLayout(r) {
    for (var t = 0; t < 400; t++) {
      var rowsN = 2 + Math.floor(r() * 3), top = ROWS - rowsN, g = [], y, x;
      for (y = 0; y < ROWS; y++) g.push(new Array(COLS).fill(y >= top ? 1 : 0));
      var plan = [];
      for (var tries = 0; tries < 500 && plan.length < 9; tries++) {
        var sk = Math.floor(r() * PIECES.length), rk = Math.floor(r() * 4), cells = rotCells(PIECES[sk], rk);
        var ox = Math.floor(r() * COLS), oy = top - 1 + Math.floor(r() * (rowsN + 1)), ok = true, mine = {};
        cells.forEach(function (c) { mine[(c[1] + oy) + ',' + (c[0] + ox)] = 1; });
        cells.forEach(function (c) {
          var cx = c[0] + ox, cy = c[1] + oy;
          if (cx < 0 || cx >= COLS || cy < top || cy >= ROWS || !g[cy][cx]) { ok = false; return; }
          for (var yy = 0; yy < cy; yy++) if (g[yy][cx] && !mine[yy + ',' + cx]) ok = false; // open water straight above
        });
        if (!ok) continue;
        cells.forEach(function (c) { g[c[1] + oy][c[0] + ox] = 0; });
        plan.push({ s: sk, r: rk, x: ox, y: oy });
        var filled = 0; for (y = top; y < ROWS; y++) for (x = 0; x < COLS; x++) filled += g[y][x];
        var everyRowOpen = true; for (y = top; y < ROWS; y++) if (g[y].every(Boolean)) everyRowOpen = false;
        if (plan.length >= 2 && everyRowOpen && filled / (rowsN * COLS) <= 0.72 && (filled / (rowsN * COLS) >= 0.45 || plan.length >= 5)) break;
      }
      var rowsOk = true; for (y = top; y < ROWS; y++) if (g[y].every(Boolean) || !g[y].some(Boolean)) rowsOk = false;
      if (!rowsOk || plan.length < 2) continue;
      var start = g.slice(top).map(function (row) { return row.slice(); });
      var L = { rows: start, plan: plan.slice().reverse(), key: start.map(function (row) { return row.join(''); }).join('/') };
      if (layoutSolvable(L)) return L;
    }
    return null;
  }
  // drop the planned pads back in, from where they appear, straight down: every starting row must fill
  function layoutSolvable(L) {
    var g = [], y;
    for (y = 0; y < ROWS - L.rows.length; y++) g.push(new Array(COLS).fill(0));
    L.rows.forEach(function (row) { g.push(row.slice()); });
    function hit(cells, x, yy) { return cells.some(function (c) { var cx = c[0] + x, cy = c[1] + yy; return cx < 0 || cx >= COLS || cy >= ROWS || (cy >= 0 && g[cy][cx]); }); }
    var ok = L.plan.every(function (p) {
      var cells = rotCells(PIECES[p.s], p.r);
      if (hit(cells, Math.floor(COLS / 2) - 1, 0) || hit(cells, p.x, 0)) return false;
      var yy = 0; while (!hit(cells, p.x, yy + 1)) yy++;
      if (yy !== p.y) return false;
      cells.forEach(function (c) { g[c[1] + yy][c[0] + p.x] = 1; });
      return true;
    });
    for (y = ROWS - L.rows.length; y < ROWS && ok; y++) if (!g[y].every(Boolean)) ok = false;
    return ok;
  }
  function pickLayout() {
    if (!seenList('p').length && !save.lilies) { markSeen('p', 'open', 300); return null; } // the very first pond is open water
    if (vr() < 0.2) return null;                                                          // and now and then, open water again
    var seen = seenList('p');
    for (var t = 0; t < 30; t++) { var L = makeLayout(vr); if (L && seen.indexOf(L.key) < 0) { markSeen('p', L.key, 300); return L; } }
    return null;
  }
  function layoutPond() {
    var phone = W <= 560;
    by = Math.round(phone ? 64 : H * 0.1);
    var bottomRoom = phone ? 205 : H * 0.3; // on phones the touch pad and buttons sit below the pond
    cell = Math.max(16, Math.floor(Math.min((H - by - bottomRoom) / ROWS, (W * (phone ? 0.7 : 0.6)) / COLS, 40)));
    bx = Math.round(W / 2 - COLS * cell / 2 - (phone ? cell * 0.9 : 0));
    document.documentElement.style.setProperty('--tr-top', (phone ? by + ROWS * cell + 16 : 70) + 'px');
  }
  function pondReset() {
    clearing = null; board = []; for (var r = 0; r < ROWS; r++) board.push(new Array(COLS).fill(0)); pondRows = 0; nextK = null;
    layout = pickLayout(); queue = [];
    if (layout) {
      layout.rows.forEach(function (row, i) { row.forEach(function (v, c) { if (v) board[ROWS - layout.rows.length + i][c] = vr() < 0.3 ? -OLD : OLD; }); });
      queue = layout.plan.map(function (p) { return p.s; }); layout.cleared = false;
    }
    spawn();
  }
  function pickK() { if (queue.length) return queue.shift(); gold++; if (gold >= 12 && Math.random() < 0.35) { gold = 0; return -1; } return Math.floor(Math.random() * PIECES.length); }
  function driftMs() { return Math.max(620, 1150 - Math.floor(pondRows / 8) * 70); } // a touch quicker as the pond grows, never rushed
  function spawn() {
    var k = nextK == null ? pickK() : nextK; nextK = pickK();
    var shapeK = k < 0 ? Math.floor(Math.random() * PIECES.length) : k;
    piece = { cells: PIECES[shapeK].map(function (c) { return c.slice(); }), x: Math.floor(COLS / 2) - 1, y: 0, c: k < 0 ? GOLD : shapeK + 1, hasFlower: k < 0 || Math.random() < 0.5 };
    landT = 0; landMoves = 0;
    dropAt = performance.now() + 1200;
    if (collide(piece.cells, piece.x, piece.y)) {
      settleAt = performance.now();
      var best = pondRows > pondBest; pondBest = Math.max(pondBest, pondRows);
      if (window.TOLRewards && pondRows) window.TOLRewards.record('pond', 'best', pondRows, 'max');
      say('The pond settles.', pondRows ? pondRows + (pondRows === 1 ? ' row' : ' rows') + ' bloomed in that pond' + (best ? ', your best yet!' : '.') + ' Fresh water now.' : 'Fresh water. Keep going whenever you like.', 3600);
      for (var r = 0; r < ROWS; r++) board[r].fill(0);
      pondRows = 0; layout = null; queue = [];
    }
    hud();
  }
  function collide(cells, x, y) {
    for (var i = 0; i < cells.length; i++) {
      var cx = cells[i][0] + x, cy = cells[i][1] + y;
      if (cx < 0 || cx >= COLS || cy >= ROWS) return true;
      if (cy >= 0 && board[cy][cx]) return true;
    }
    return false;
  }
  function moved() { if (landT && landMoves < 10) { landT = performance.now(); landMoves++; } } // a little extra time to slide it in
  function rotate() {
    var w = Math.max.apply(null, piece.cells.map(function (c) { return c[0]; }));
    var rot = piece.cells.map(function (c) { return [c[1], w - c[0]]; });
    [0, -1, 1, -2, 2].some(function (dx) { if (!collide(rot, piece.x + dx, piece.y)) { piece.cells = rot; piece.x += dx; moved(); softTick(); return true; } return false; });
  }
  function move(dx) { if (!collide(piece.cells, piece.x + dx, piece.y)) { piece.x += dx; moved(); softTick(); return true; } return false; }
  function softTick() { if (audio && save.sound && audio.music) audio.music.pluck(audio.music.note(1), 0.012); }
  // one step down; when it can't go further it waits a moment before settling
  function step(now) {
    if (!collide(piece.cells, piece.x, piece.y + 1)) { piece.y++; landT = 0; return true; }
    if (!now && landT && performance.now() - landT < 480) return false;
    if (!now && !landT) { landT = performance.now(); return false; }
    lock();
    return false;
  }
  function lock() {
    piece.cells.forEach(function (c) { var y = c[1] + piece.y; if (y >= 0) board[y][c[0] + piece.x] = piece.c * (piece.hasFlower ? -1 : 1); });
    plink();
    var p0 = piece; piece.cells.forEach(function (c) { if (c[1] + p0.y >= 0) ripples.push({ x: bx + (c[0] + p0.x + 0.5) * cell, y: by + (c[1] + p0.y + 0.5) * cell, t: performance.now() }); });
    var full = []; board.forEach(function (row, r) { if (row.every(Boolean)) full.push(r); });
    if (full.length) { clearing = { rows: full, t: performance.now(), gold: full.some(function (r) { return board[r].some(function (v) { return Math.abs(v) === GOLD; }); }) }; full.forEach(function (r, i) { setTimeout(function () { chime(r + i, 0.08); }, i * 160); }); }
    else spawn();
  }
  function pondKey(k) {
    if (mode !== 'pond' || !piece || clearing) return;
    if (k === 'ArrowLeft') move(-1); else if (k === 'ArrowRight') move(1); else if (k === 'ArrowUp') rotate();
    else if (k === 'ArrowDown') { if (!step()) { if (landT) lock(); } dropAt = performance.now() + 900; }
    else if (k === ' ') { while (step(true)) {} }
  }
  var ripples = [];
  var hudEl = document.getElementById('ng-pond-hud');
  function hud() { if (hudEl) hudEl.textContent = mode === 'pond' ? 'Rows ' + pondRows + (pondBest ? ' · best ' + pondBest : '') : ''; }
  function drawPond(t) {
    if (!piece) return;
    if (clearing && t - clearing.t > 800) {
      var n = clearing.rows.length;
      clearing.rows.slice().sort(function (a, b) { return a - b; }).forEach(function (r) { board.splice(r, 1); board.unshift(new Array(COLS).fill(0)); });
      for (var i = 0; i < n; i++) { addFlower(false); addLantern(); }
      pondRows += n; save.lilies += n; persist(); updateCount();
      var names = ['', 'A row bloomed.', 'Double bloom!', 'Triple bloom!', 'A whole garden bloomed!'];
      say(names[Math.min(4, n)] + (clearing.gold ? ' ✨' : ''), clearing.gold ? 'The golden lotus opened. How lovely.' : 'New flowers opened in your garden.', 2400);
      if (n > 1 && audio && audio.music && save.sound) setTimeout(function () { audio.music.reward(n > 2); }, 300);
      if (window.TOLRewards) window.TOLRewards.earn([0, 2, 5, 9, 14][Math.min(4, n)] + (clearing.gold ? 4 : 0), 'pond', names[Math.min(4, n)].replace(/[.!]$/, ''), { quiet: true, soft: true });
      clearing = null;
      if (layout && !layout.cleared && !board.some(function (row) { return row.some(function (v) { return Math.abs(v) === OLD; }); })) {
        layout.cleared = true; addFlower(false); addLantern();
        save.variety.ponds = (save.variety.ponds || 0) + 1; persist();
        setTimeout(function () { say('The old lilies all bloomed.', 'Every gap is filled. The pond is yours now.', 3200); }, 2500);
        if (window.TOLRewards) window.TOLRewards.earn(6, 'pond', 'The old lilies bloomed', { quiet: true, soft: true });
      }
      spawn(); hud();
    }
    if (!clearing && t > dropAt && (!helpCard || helpCard.hidden)) { step(); dropAt = t + (landT ? 120 : driftMs()); }
    // water
    var w = COLS * cell, h = ROWS * cell;
    ctx.fillStyle = 'rgba(70,87,138,0.35)'; ctx.strokeStyle = 'rgba(200,210,255,0.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx - 8, by - 8, w + 16, h + 16, 18) : ctx.rect(bx - 8, by - 8, w + 16, h + 16); ctx.fill(); ctx.stroke();
    // faint column guides make it easy to line pads up
    ctx.strokeStyle = 'rgba(200,215,255,0.045)'; ctx.lineWidth = 1;
    for (var cc = 1; cc < COLS; cc++) { ctx.beginPath(); ctx.moveTo(bx + cc * cell, by); ctx.lineTo(bx + cc * cell, by + h); ctx.stroke(); }
    for (var rr = 1; rr < 4; rr++) {
      var ry = by + h * (rr / 4) + (REDUCED ? 0 : Math.sin(t / 1600 + rr) * 3);
      ctx.strokeStyle = 'rgba(200,215,255,0.07)'; ctx.beginPath(); ctx.moveTo(bx, ry); ctx.quadraticCurveTo(bx + w / 2, ry + 6, bx + w, ry); ctx.stroke();
    }
    // ripples where pads settle
    ripples = ripples.filter(function (rp) { return t - rp.t < 900; });
    ripples.forEach(function (rp) { var q = (t - rp.t) / 900; ctx.strokeStyle = 'rgba(220,230,255,' + (0.35 * (1 - q)) + ')'; ctx.beginPath(); ctx.ellipse(rp.x, rp.y, cell * (0.3 + q * 0.6), cell * (0.2 + q * 0.4), 0, 0, Math.PI * 2); ctx.stroke(); });
    board.forEach(function (row, r) {
      var fade = clearing && clearing.rows.indexOf(r) !== -1 ? 1 + (t - clearing.t) / 400 : 1;
      row.forEach(function (v, c) { if (v) lily(bx + c * cell, by + r * cell, Math.abs(v), v < 0, fade, false, t); });
    });
    if (!clearing) {
      var gy = piece.y; while (!collide(piece.cells, piece.x, gy + 1)) gy++;
      if (gy > piece.y) {
        ctx.strokeStyle = 'rgba(255,246,224,0.45)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]);
        piece.cells.forEach(function (c) { var y = c[1] + gy; if (y >= 0) { ctx.beginPath(); ctx.arc(bx + (c[0] + piece.x) * cell + cell / 2, by + y * cell + cell / 2, cell * 0.4, 0, Math.PI * 2); ctx.stroke(); } });
        ctx.setLineDash([]);
      }
      var bob = landT ? Math.sin((t - landT) / 60) * 0.6 : 0;
      piece.cells.forEach(function (c) { var y = c[1] + piece.y; if (y >= 0) lily(bx + (c[0] + piece.x) * cell, by + y * cell + bob, piece.c, piece.hasFlower, 1, true, t); });
    }
    // what's floating in next
    if (nextK != null) {
      var nk = nextK < 0 ? 0 : nextK, cells = PIECES[nk], s = cell * 0.5, nx = bx + w + 18, ny = by + 6;
      ctx.fillStyle = 'rgba(28,31,58,0.45)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(nx - 6, ny - 6, s * 4 + 12, s * 4 + 26, 12) : ctx.rect(nx - 6, ny - 6, s * 4 + 12, s * 4 + 26); ctx.fill();
      ctx.fillStyle = 'rgba(220,214,240,0.8)'; ctx.font = '11px Lora, Georgia, serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('Next', nx, ny - 2);
      var saved = cell; cell = s;
      cells.forEach(function (c) { lily(nx + c[0] * s, ny + 14 + c[1] * s, nextK < 0 ? GOLD : nk + 1, nextK < 0, 1, false, t); });
      cell = saved;
    }
  }
  function lily(x, y, k, flower, fade, live, t) {
    var r = cell * 0.44 * Math.min(1.25, fade), cx = x + cell / 2, cy = y + cell / 2, a = fade > 1 ? Math.max(0, 2 - fade) : 1;
    ctx.globalAlpha = a;
    if (k === GOLD) { var gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.8); gg.addColorStop(0, 'rgba(255,224,140,0.45)'); gg.addColorStop(1, 'rgba(255,224,140,0)'); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = LILY[(k - 1) % LILY.length];
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, 0.35, Math.PI * 2 - 0.05); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = live ? 'rgba(255,255,255,0.7)' : 'rgba(40,60,80,0.25)'; ctx.lineWidth = 1; ctx.stroke();
    if (flower || fade > 1) {
      ctx.fillStyle = fade > 1 ? '#FFF3D6' : k === GOLD ? '#FFF6D8' : '#F7C9D4';
      for (var i = 0; i < 5; i++) { var an = i / 5 * Math.PI * 2; ctx.beginPath(); ctx.ellipse(cx + Math.cos(an) * r * 0.28, cy + Math.sin(an) * r * 0.28, r * 0.2, r * 0.12, an, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#F8DC6E'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Main loop ----------
  var lastT = performance.now(), running = true, rafId = 0;
  function kick() { if (!rafId) rafId = requestAnimationFrame(frame); }
  var lastDraw = 0;
  function frame(t) {
    rafId = 0;
    if (AMBIENT && t - lastDraw < 32) { kick(); return; } // a gentle 30 frames a second is plenty behind a page
    lastDraw = t;
    var dt = Math.min(60, t - lastT); lastT = t;
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    if (bg) ctx.drawImage(bg, 0, 0, W, H);
    drawAurora(t);
    drawSky(t);
    drawTonight(t, 'sky');
    drawWonders(t, 'sky');
    // pond shimmer
    var p = pondShape();
    if (!REDUCED) for (var i = 0; i < 3; i++) { ctx.strokeStyle = 'rgba(210,220,255,0.08)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx * (0.4 + i * 0.2) + Math.sin(t / 1800 + i) * 6, p.ry * (0.4 + i * 0.2), 0, 0, Math.PI * 2); ctx.stroke(); }
    drawPondLife(t);
    drawTonight(t, 'low');
    drawWonders(t, 'bank');
    if (!sorted) sorted = save.flowers.slice().sort(function (a, b) { return a.y - b.y; });
    sorted.forEach(function (f) { drawFlower(f, t); });
    drawLanterns(t, dt);
    if (mode === 'breathe') drawBreath(t);
    if (mode === 'fireflies') { fireflyTick(t); drawShape(t); }
    if (mode === 'pond') drawPond(t);
    drawCritters(t);
    drawFlies(t, dt);
    drawTonight(t, 'air', dt);
    drawWonders(t, 'air');
    drawSparks(dt);
    kick();
  }

  // the kind of night: a low mist, drifting lights or petals, or faint shooting stars
  var motes = [], meteor = null;
  function drawTonight(t, layer, dt) {
    var id = TONIGHT.id; dt = dt || 16;
    if (layer === 'low' && id === 'mist') {
      for (var i = 0; i < 3; i++) {
        var y = H * (0.6 + i * 0.045), x = W * 0.5 + (REDUCED ? 0 : Math.sin(t / 9000 + i * 2.1) * W * 0.18), rx = W * 0.6;
        var g = ctx.createRadialGradient(x, y, 0, x, y, rx); g.addColorStop(0, 'rgba(225,228,248,0.11)'); g.addColorStop(1, 'rgba(225,228,248,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, H * 0.07, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (layer === 'air' && (id === 'motes' || id === 'breeze') && !REDUCED) {
      var want = id === 'motes' ? 18 : 12;
      while (motes.length < want) motes.push({ x: Math.random(), y: id === 'motes' ? 0.72 + Math.random() * 0.26 : Math.random() * 0.62, s: 0.6 + Math.random(), p: Math.random() * 6.28, h: HUES[Math.floor(Math.random() * HUES.length)] });
      motes.forEach(function (m) {
        if (id === 'motes') { m.y -= dt * 0.00002 * m.s; m.x += Math.sin(t / 1800 + m.p) * 0.0002; if (m.y < 0.35) { m.y = 0.95; m.x = Math.random(); } }
        else { m.x += dt * 0.000025 * m.s; m.y += Math.sin(t / 1300 + m.p) * 0.0004; if (m.x > 1.05) { m.x = -0.05; m.y = Math.random() * 0.62; } }
        var a = 0.35 + 0.3 * Math.sin(t / 700 + m.p);
        ctx.fillStyle = id === 'motes' ? 'rgba(255,244,200,' + a.toFixed(2) + ')' : 'hsla(' + m.h + ',70%,85%,' + (a * 0.9).toFixed(2) + ')';
        ctx.beginPath();
        if (id === 'motes') ctx.arc(m.x * W, m.y * H, 1.4 * m.s, 0, Math.PI * 2); else ctx.ellipse(m.x * W, m.y * H, 3 * m.s, 1.6 * m.s, Math.sin(t / 900 + m.p), 0, Math.PI * 2);
        ctx.fill();
      });
    }
    if (layer === 'sky' && id === 'meteors' && !REDUCED && mode !== 'fireflies') {
      if (!meteor && Math.random() < 0.0035) meteor = { t0: t, x: W * (0.1 + Math.random() * 0.6), y: H * (0.05 + Math.random() * 0.2), d: Math.random() < 0.5 ? 1 : -1 };
      if (meteor) {
        var q = (t - meteor.t0) / 1100; if (q >= 1) meteor = null;
        else { var mx = meteor.x + meteor.d * q * W * 0.2, my = meteor.y + q * H * 0.07; ctx.strokeStyle = 'rgba(255,250,230,' + (0.6 * (1 - q)).toFixed(2) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx - meteor.d * W * 0.04, my - H * 0.014); ctx.stroke(); }
      }
    }
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
  canvas.addEventListener('pointermove', function (e) {
    var p = pos(e); wand.x = p.x; wand.y = p.y; wand.active = true;
    // pond: the pad follows your finger sideways, and down if you drag down slowly
    if (mode === 'pond' && swipe && piece && !clearing) {
      var dx = p.x - swipe.lx, n = Math.trunc(dx / (cell * 0.9));
      while (n > 0) { move(1); n--; swipe.lx += cell * 0.9; swipe.moved = true; }
      while (n < 0) { move(-1); n++; swipe.lx -= cell * 0.9; swipe.moved = true; }
      var dy = p.y - swipe.ly;
      if (dy > cell * 1.1 && Math.abs(p.x - swipe.x) < cell * 1.5) { swipe.ly += cell; swipe.moved = true; swipe.down = (swipe.down || 0) + 1; if (step()) dropAt = performance.now() + 700; }
    }
  });
  // tap an animal and it plays: the dogs bounce and spin with hearts, the others do their tricks
  var tappedAnimal = false;
  function tapAnimal(x, y) {
    var t = performance.now(), hit = false;
    (pack.pos || []).forEach(function (q, i) {
      if (hit || !q || Math.hypot(q[0] - x, q[1] - y) > 34 * q[2]) return;
      hit = true; pack.tapT = pack.tapT || []; pack.tapT[i] = t;
      burst(q[0], q[1] - 16 * q[2], 14, 345, 82); [4, 5, 6].forEach(function (n, k) { setTimeout(function () { chime(n, 0.06); }, k * 90); });
    });
    critters.forEach(function (c) {
      if (hit || c.sx == null || Math.hypot(c.sx - x, c.sy - 14 * c.ss - y) > 28 * c.ss) return;
      hit = true;
      if (c.kind === 'hedgehog') c.tapT = t;
      else { var trick = { bunny: 'binky', frog: 'croak', duck: 'dive' }[c.kind]; c.act = { name: trick, t0: t, dur: trick === 'dive' ? 1900 : trick === 'croak' ? 1400 : 900 }; c.next = t + 3000; }
      burst(c.sx, c.sy - 20 * c.ss, 8, c.kind === 'duck' ? 205 : 50, 82); chime({ bunny: 5, frog: 1, duck: 3, hedgehog: 2 }[c.kind], 0.06);
    });
    return hit;
  }
  canvas.addEventListener('pointerdown', function (e) {
    var p = pos(e); tappedAnimal = mode !== 'fireflies' && tapAnimal(p.x, p.y) || (mode === 'fireflies' && !nextTarget() ? tapAnimal(p.x, p.y) : false);
    if (mode === 'fireflies' && !tappedAnimal && p.y > H * 0.62) tappedAnimal = tapAnimal(p.x, p.y); // the animals live low; the stars are high
    wand.x = p.x; wand.y = p.y; wand.active = true; swipe = tappedAnimal ? null : { x: p.x, y: p.y, lx: p.x, ly: p.y, t: performance.now() };
    if (mode === 'pond' && swipe) { try { canvas.setPointerCapture(e.pointerId); } catch (err) {} }
  });
  canvas.addEventListener('pointerleave', function () { if (mode !== 'fireflies') wand.active = false; });
  canvas.addEventListener('pointerup', function (e) {
    if (!swipe || mode !== 'pond') { swipe = null; return; }
    var p = pos(e), dx = p.x - swipe.x, dy = p.y - swipe.y, quick = performance.now() - swipe.t < 280;
    if (!swipe.moved && Math.abs(dx) < 14 && Math.abs(dy) < 14) pondKey('ArrowUp');       // a tap turns it
    else if (quick && dy > 40 && dy > Math.abs(dx) * 1.5) pondKey(' ');                   // a quick flick down drops it
    swipe = null;
  });
  document.addEventListener('keydown', function (e) {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    // Space on a link or button does its usual job, except in the pond, where the garden's own
    // buttons (the modes, the pad) shouldn't swallow it: there Space drops the pad
    if (e.key === ' ' && e.target.closest && e.target.closest('button, a, summary') && !(mode === 'pond' && stage.contains(e.target) && !e.target.closest('.ng-card, #ng-more-menu'))) return;
    if (!closeCard.hidden || !welcome.hidden || (helpCard && !helpCard.hidden) || (dedCard && !dedCard.hidden) || stage.getBoundingClientRect().bottom < window.innerHeight * 0.5) return;
    if (mode === 'pond' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].indexOf(e.key) !== -1 && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) { e.preventDefault(); pondKey(e.key); }
    if (mode === 'fireflies' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(e.key) !== -1 && !/INPUT|TEXTAREA/.test(e.target.tagName)) {
      e.preventDefault(); if (!wand.active) { wand.x = W / 2; wand.y = H * 0.3; wand.active = true; }
      var d = 18; if (e.key === 'ArrowLeft') wand.x -= d; if (e.key === 'ArrowRight') wand.x += d; if (e.key === 'ArrowUp') wand.y -= d; if (e.key === 'ArrowDown') wand.y += d;
    }
  });
  // the touch pad: hold an arrow and the pad keeps sliding
  padEl.querySelectorAll('button').forEach(function (b) {
    var k = b.getAttribute('data-key'), rep = null, held = false;
    function stop() { clearTimeout(rep); clearInterval(rep); rep = null; }
    b.addEventListener('pointerdown', function (e) {
      e.preventDefault(); held = true; pondKey(k);
      if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowDown') rep = setTimeout(function () { rep = setInterval(function () { pondKey(k); }, k === 'ArrowDown' ? 70 : 110); }, 260);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, stop); });
    b.addEventListener('click', function (e) { if (held) { held = false; return; } pondKey(k); }); // keyboard and switch access
  });
  document.querySelectorAll('.ng-bar [data-mode]').forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); }); });

  // phones: sound, full screen and leave live behind a small "more" button
  var moreBtn = document.getElementById('ng-more'), moreMenu = document.getElementById('ng-more-menu');
  if (moreBtn && moreMenu) {
    var closeMore = function () { moreMenu.classList.remove('is-open'); moreBtn.setAttribute('aria-expanded', 'false'); };
    moreBtn.addEventListener('click', function (e) { e.stopPropagation(); var open = !moreMenu.classList.contains('is-open'); moreMenu.classList.toggle('is-open', open); moreBtn.setAttribute('aria-expanded', String(open)); if (open) moreMenu.querySelector('button').focus(); });
    moreMenu.addEventListener('click', function () { setTimeout(closeMore, 150); });
    document.addEventListener('pointerdown', function (e) { if (!e.target.closest('#ng-more, #ng-more-menu')) closeMore(); });
    moreMenu.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeMore(); moreBtn.focus(); } });
  }
  var soundBtn = document.getElementById('ng-sound');
  var soundWelcome = document.getElementById('ng-sound-welcome');
  function soundLabel() {
    soundBtn.setAttribute('aria-pressed', String(!!save.sound)); soundBtn.innerHTML = save.sound ? '&#127925; Sound: on' : '&#128263; Sound: off';
    if (soundWelcome) { soundWelcome.setAttribute('aria-pressed', String(!!save.sound)); soundWelcome.innerHTML = save.sound ? '&#127925; Soft sound: on' : '&#128263; Soft sound: off'; }
  }
  function setSound(on) {
    save.sound = !!on && !quietNow(); save.snd = save.sound ? 'on' : 'off'; persist(); soundLabel();
    if (!save.sound) { mutedThisVisit = true; stopAudio(); }
  }
  // any card covering the garden (the welcome, how to play, a dedication, leaving)
  function cardUp() { return Array.prototype.some.call(stage.querySelectorAll('.ng-card'), function (c) { return !c.hidden; }); }
  function soundIfClear() { if (save.sound && !quietNow() && !cardUp()) startAudio(); }
  // on the welcome card, the switch only records the choice: sound starts once you're in the garden
  if (soundWelcome) soundWelcome.addEventListener('click', function () { setSound(!save.sound); });
  soundBtn.addEventListener('click', function () {
    setSound(!save.sound);
    if (save.sound && !cardUp()) { startAudio(); setTimeout(function () { chime(2, 0.12); }, 150); say('Sound on', 'If you can’t hear anything, turn your volume up' + (/iphone|ipad/i.test(navigator.userAgent) ? ' and check the silent switch.' : '.'), 3500); }
  });
  // Quiet mode switched on elsewhere: the garden falls silent at once
  document.addEventListener('tol-quiet', function () { if (quietNow() && save.sound) { save.sound = false; soundLabel(); stopAudio(); } });

  var QUOTES = [
    'You don’t have to fix everything tonight.',
    'Slow is still moving.',
    'Notice one small moment today, and turn toward it.',
    'Your breath is always there to come back to.',
    'Be as kind to yourself as you’d be to a friend.',
    'Rest is part of the work.',
    'Say one specific thank-you before bed.',
    'Feelings are weather. They pass.',
    'Tomorrow is a fresh page.',
    'You carried a lot today. It’s okay to set it down now.',
    'Someone is glad you exist. Probably more than one someone.',
    'Small, steady steps still get you there.',
    'You don’t have to be ready. You only have to be willing.',
    'Tonight, let good enough be enough.',
    'Say what you need plainly, and kindly. It usually helps.',
    'The people who love you would want you to rest.',
    'A pause is not a stop. It’s a breath before the next part.',
    'Notice what went well today, even if it was small.',
    'You can come back to the hard thing tomorrow, with a fuller battery.',
    'Kindness counts double when it’s aimed at yourself.',
    'The garden will be here. So will you.',
    'Most of life is ordinary Tuesdays. Make one a little kinder.',
    'You are allowed to ask for help.',
    'Let one worry go tonight. It can find its own way home.',
    'Thank one person tomorrow for one specific thing.',
    'Being tired is information, not a failing.',
    'Slow down enough to hear what you actually think.',
    'A quiet mind grows from quiet minutes.',
    'You did more today than anyone saw.',
    'Hold your plans lightly and your people closely.'
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
    dedCard.hidden = false; dedCard.setAttribute('data-id', id); try { inp.focus({ preventScroll: true }); } catch (e) {}
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
    var qi = pickFresh(QUOTES.map(function (_, i) { return i; }), 'q', function (x) { return x; }, 20); markSeen('q', qi, 40);
    document.getElementById('ng-quote').textContent = QUOTES[qi];
    var tipEl = document.getElementById('ng-tip');
    if (tipEl && window.TOLTips) window.TOLTips.get(['sleep', 'rest', 'calm', 'kindness'], function (t) { tipEl.innerHTML = '<strong>A little tip:</strong> ' + t[0] + ' ' + t[1]; tipEl.hidden = false; });
    closeCard.hidden = false; stopAudio(); try { document.getElementById('ng-stay').focus({ preventScroll: true }); } catch (e) {}
  });
  function stay() { closeCard.hidden = true; soundIfClear(); document.getElementById('ng-leave').focus(); }
  document.getElementById('ng-stay').addEventListener('click', stay);
  closeCard.addEventListener('keydown', function (e) { if (e.key === 'Escape') stay(); });

  // Welcome, then into the garden
  var welcome = document.getElementById('ng-welcome');
  if (returning || plantedLine) {
    document.getElementById('ng-welcome-h').textContent = 'Welcome back';
    document.getElementById('ng-welcome-p').textContent = plantedLine + (gifted ? 'While you were away, ' + gifted + (gifted === 1 ? ' new flower' : ' new flowers') + ' opened on their own. ' : '') +
      'Your garden has ' + save.flowers.length + (save.flowers.length === 1 ? ' flower' : ' flowers') + (save.consts.length ? ' and ' + save.consts.length + (save.consts.length === 1 ? ' constellation' : ' constellations') + ' in its sky' : '') + '. Stay as long as you like.';
  }
  var wp = document.getElementById('ng-welcome-p');
  if (wp && !AMBIENT) wp.textContent += ' ' + TONIGHT.line;
  document.querySelectorAll('[data-enter]').forEach(function (b) {
    b.addEventListener('click', function () {
      welcome.hidden = true;
      if (window.innerWidth <= 560 && fullBtn && !document.documentElement.classList.contains('ng-full')) setFull(true); // more room on a phone
      setMode(b.getAttribute('data-enter'));
      soundIfClear(); // only if sound is on, and not while the how-to card is showing
    });
  });

  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) { lastT = performance.now(); kick(); if (audio && save.sound) audio.ctx.resume(); }
    else { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } if (audio) audio.ctx.suspend(); }
  });
  window.addEventListener('resize', function () { var w0 = W, h0 = H; resize(); if (mode === 'fireflies' && (Math.abs(W - w0) > 1 || Math.abs(H - h0) > 1)) relayoutShape(); });

  resize(); soundLabel(); updateCount();
  kick();
  // Expose a tiny hook for testing
  window.__nightGarden = {
    // variety, for tests: the current puzzle, a new one, solving it with the light as a visitor would
    puzzle: function () { return shape ? { key: shape.key, id: shape.id, wild: shape.wild, name: shape.wild ? shape.name : (MEANING[shape.id] || [''])[0], stars: targets.length, done: shapeDone > 0, fits: targets.every(function (p) { return p.x > 0 && p.x < W && p.y > 0 && p.y < H; }) } : null; },
    nextPuzzle: function () { newShape(); return this.puzzle(); },
    solvePuzzle: function () {
      var t = performance.now() + 1000, guard = 0;
      while (!shapeDone && guard++ < 200) { var nx = nextTarget(); if (!nx) break; wand.x = nx.x; wand.y = nx.y; wand.active = true; fireflyTick(t); t += 200; fireflyTick(t); t += 20; }
      return shapeDone > 0;
    },
    pondLayout: function () { return layout ? { key: layout.key, rows: layout.rows.length, pads: layout.plan.length, solvable: layoutSolvable(layout) } : null; },
    newPond: function () { pondReset(); return this.pondLayout(); },
    breath: function () { var b = chooseBreath(); return { id: b.id, name: b.name, desc: breathDesc(b) }; },
    tonight: function () { return TONIGHT.id; },
    variety: function () { return JSON.parse(JSON.stringify(save.variety)); },
    shapes: SHAPE_IDS.length,
    save: save, setMode: setMode, pondKey: pondKey, get targets() { return targets; }, get mode() { return mode; }, get board() { return board; }, get piece() { return piece; }, get audio() { return audio; }, critters: critters, pack: pack, portrait: function (c2d, i, pose, tt) { var o = ctx; ctx = c2d; drawPup(PUPS[i], pose || 'run', 1.2, 0.2, false, tt || 0); ctx = o; } };
})();
