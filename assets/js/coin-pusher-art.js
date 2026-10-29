/* coin-pusher-art.js — the pictures for the Kindness Coin Pusher (/coin-pusher.html): coins, the 50 collectibles, the cabinet.
   Everything is drawn here with the canvas, once, and kept: nothing to download, nothing sent anywhere.
   window.TOLCoinArt = {
     SETS, ITEMS, byId(id), THEMES, SKINS, MARQUEE,
     figure(id, px)            a canvas with the collectible standing on its little brass base (cached)
     silhouette(id, px)        the same shape in shadow, for a collectible not found yet
     coin(skin, kind, rpx, k)  a coin lying on the deck, seen from the front and above (cached; k 0-3 turns the heart)
     shadow(rpx)               a soft round shadow
     camera(w, h)              the view: project(x, y, z) -> [screenX, screenY, pixelsPerUnit], and back again
     paintBack(g, cam, theme, dark), paintFront(g, cam, theme, dark)   the cabinet, drawn once per size
   Professor Puddles is drawn from the same shapes as the site's own picture of him (PUDDLES_SVG in site.js). */
(function () {
  'use strict';
  var D = window.TOLCoinData;
  var TAU = Math.PI * 2;

  // ---------- the world (units: one coin is 0.92 across)
  var W = { HX: 4.2, ZB: -5, ZE: 4.2, R: 0.46, T: 0.13, SHELF: 0.26, PF_MIN: -3.4, PF_MAX: -1.0, SLOT_Y: 2.1, SLOT_Z: -4.05, PITCH: 1.12, DIST: 26, WALL: 3.5, MQ0: 3.4, MQ1: 5.1, PILLAR: 4.3, PW: 0.8 };

  // ---------- small colour helpers
  function rgb(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function hex(a) { return '#' + a.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function mix(a, b, t) { var x = rgb(a), y = rgb(b); return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]); }
  function lt(c, t) { return mix(c, '#ffffff', t); }
  function dk(c, t) { return mix(c, '#000000', t); }
  function rgba(c, a) { var x = rgb(c); return 'rgba(' + x[0] + ',' + x[1] + ',' + x[2] + ',' + a + ')'; }
  function mk(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

  // ---------- the cabinet looks (themes) and coin skins: earned by finishing sets, never bought
  var THEMES = {
    walnut: { name: 'Cozy Walnut', wood: ['#9A6137', '#5E3820'], felt: ['#2F6B59', '#1E4A3F'], trim: '#E0B050', sign: ['#6B2F36', '#3F1B22'], glow: '#FFD27A', wall: ['#F4E2BE', '#E2C792'], nightWall: ['#3A2B3F', '#241A2B'] },
    golden: { name: 'Golden Hour', wood: ['#B9743A', '#7A431F'], felt: ['#B5683A', '#7E4325'], trim: '#F3C65E', sign: ['#8A3B2A', '#55221A'], glow: '#FFC46B', wall: ['#FFE6B8', '#F1C98A'], nightWall: ['#4A2F2A', '#2E1B1A'] },
    mint: { name: 'Meadow Mint', wood: ['#D8C79C', '#A28E5F'], felt: ['#4FA08A', '#2F7867'], trim: '#E7C469', sign: ['#2F6A5C', '#1B4137'], glow: '#C9F2C0', wall: ['#EAF6E2', '#CFE6C6'], nightWall: ['#24383A', '#152427'] },
    plum: { name: 'Starlight Plum', wood: ['#6A3F62', '#3E2239'], felt: ['#2D3A78', '#1C2552'], trim: '#E8C27A', sign: ['#43254C', '#2A1631'], glow: '#C9B6FF', wall: ['#E5D8F2', '#C9B5E3'], nightWall: ['#2A2147', '#171230'] },
    ocean: { name: 'Ocean Glass', wood: ['#4B8EA3', '#2B5C6E'], felt: ['#2E7F8F', '#1B5361'], trim: '#F0D78C', sign: ['#1F5566', '#10343F'], glow: '#9FE6F2', wall: ['#DDF2F4', '#B8DDE2'], nightWall: ['#17333C', '#0C1F26'] },
    rose: { name: 'Rosewood Blush', wood: ['#A85468', '#6B2F40'], felt: ['#C9788A', '#97506A'], trim: '#F2D07E', sign: ['#7A2E45', '#4A1A2B'], glow: '#FFC3D1', wall: ['#FCE3E6', '#F1C3CB'], nightWall: ['#3E222E', '#26141C'] }
  };
  var SKINS = {
    gold: { name: 'Classic Gold', face: ['#FBE7A6', '#E6B84F', '#B98428'], edge: ['#D9A23C', '#8E6020'], mark: '#9A6A1E', emb: 'heart' },
    copper: { name: 'Warm Copper', face: ['#F7C7A3', '#CF8052', '#8F4E2C'], edge: ['#B86A3E', '#7A3F22'], mark: '#7C4326', emb: 'heart' },
    silver: { name: 'Cloud Silver', face: ['#FFFFFF', '#CBD2DC', '#8D97A6'], edge: ['#B5BDC9', '#7A8494'], mark: '#6F7A8A', emb: 'cloud' },
    rosegold: { name: 'Rose Gold', face: ['#FFE0DB', '#EBA59E', '#B8675F'], edge: ['#D98B83', '#9A5049'], mark: '#9A4F4A', emb: 'heart' },
    starry: { name: 'Starry Night', face: ['#9AA2EC', '#555BB0', '#2D2F72'], edge: ['#4A4FA0', '#2B2D68'], mark: '#F5D77A', emb: 'star' }
  };
  var KINDS = {   // surprise coins: how they look
    heavy: { face: ['#C9B09A', '#8C6B55', '#5A4132'], edge: ['#7A5C48', '#4A3326'], mark: '#3E2B20', emb: 'bolt' },
    bouncy: { face: ['#D9FFE9', '#7FD8A6', '#3F9C70'], edge: ['#62C08C', '#2F8059'], mark: '#2D7A55', emb: 'swirl' },
    rainbow: { face: ['#FFFFFF', '#F7C8F0', '#9BC8F7'], edge: ['#C9A8F0', '#7D8DE0'], mark: '#FFFFFF', emb: 'star', rainbow: true }
  };
  var MARQUEE = {   // short lines that scroll through the sign; "start" ones are there from the first visit
    start: ['KINDNESS COIN PUSHER', 'EVERY COIN IS A SMALL HELLO', 'NO TIMERS, NO RUSH', 'FREE TO PLAY, ALWAYS'],
    pals: ['TIDBIT SAYS: ONE MORE COIN!', 'SUGARFOOT SAYS: NAP FIRST'],
    buddies: ['THE WHOLE BUNCH SAYS HI', 'DOT ARRIVES WHEN DOT ARRIVES'],
    garden: ['THE FIREFLIES ARE ON', 'SOFT LIGHTS, SLOW EVENING'],
    static: ['EVEN CLOUDS HAVE BAD DAYS', 'STATIC FADES. YOU DON’T.'],
    charms: ['A LITTLE LUCK GOES A LONG WAY', 'LUCKY YOU, YOU’RE HERE'],
    gems: ['SHINY AND PROUD OF IT', 'ONE GEM AT A TIME'],
    sky: ['MAKE A SMALL WISH', 'THE SKY IS ON YOUR SIDE'],
    cozy: ['TEA, BLANKET, COIN, REPEAT', 'GOOD DAY FOR A SNACK'],
    stars: ['SMALL WINS COUNT', 'YOU SHOWED UP. NICE.']
  };

  // ---------- the sets and the 50 collectibles. rar = sparkle level 1-4 (how often it rides in). Nothing here costs anything.
  var SETS = [
    { id: 'pals', name: 'Pups and Professor', blurb: 'The faces you meet around the site.', reward: { type: 'theme', id: 'golden' } },
    { id: 'buddies', name: 'Frequency Buddies', blurb: 'The cartoon gang, all eight.', reward: { type: 'theme', id: 'mint' } },
    { id: 'garden', name: 'Night Garden', blurb: 'Soft lights and sleepy friends.', reward: { type: 'theme', id: 'plum' } },
    { id: 'static', name: 'Little Clouds of Static', blurb: 'Grumpy, fuzzy, shy and drifting.', reward: { type: 'skin', id: 'silver' } },
    { id: 'charms', name: 'Lucky Charms', blurb: 'Small things that feel like luck.', reward: { type: 'skin', id: 'rosegold' } },
    { id: 'gems', name: 'Gem Box', blurb: 'Eight shiny stones.', reward: { type: 'theme', id: 'ocean' } },
    { id: 'sky', name: 'Night Sky', blurb: 'Wishes, planets and one friendly sun.', reward: { type: 'skin', id: 'starry' } },
    { id: 'cozy', name: 'Cozy Corner', blurb: 'Everything you want on a rainy Sunday.', reward: { type: 'theme', id: 'rose' } }
  ];
  var ITEMS = [];
  function add(set, id, name, rar, line, size, extra) { var o = { id: id, set: set, name: name, rar: rar, line: line, size: size || 'fig' }; if (extra) for (var k in extra) o[k] = extra[k]; ITEMS.push(o); }
  // the 22 characters come from coin-pusher-data.js (names, where they live); rarity and set are chosen here
  var CHAR_SET = {
    tidbit: ['pals', 3], sugarfoot: ['pals', 3], puddles: ['pals', 4], peach: ['pals', 2], lilac: ['pals', 2],
    ollie: ['buddies', 2], dot: ['buddies', 1], hopper: ['buddies', 1], nutmeg: ['buddies', 1], lumi: ['buddies', 2], beep: ['buddies', 2], ducklings: ['buddies', 1], moon: ['buddies', 4],
    butterfly: ['garden', 2], bunny: ['garden', 1], hedgehog: ['garden', 1], kip: ['garden', 2], bear: ['garden', 3],
    grumble: ['static', 1], fuzz: ['static', 1], mumble: ['static', 2], drift: ['static', 2]
  };
  if (D && D.chars) {
    var order = ['tidbit', 'sugarfoot', 'puddles', 'peach', 'lilac', 'ollie', 'dot', 'hopper', 'nutmeg', 'lumi', 'beep', 'ducklings', 'moon', 'butterfly', 'bunny', 'hedgehog', 'kip', 'bear', 'grumble', 'fuzz', 'mumble', 'drift'];
    order.forEach(function (id) {
      var c = null; D.chars.forEach(function (x) { if (x.id === id) c = x; }); if (!c) return;
      var nm = id === 'kip' ? 'The fireflies in a jar' : c.name;
      add(CHAR_SET[id][0], id, nm, CHAR_SET[id][1], c.line, 'fig', { home: c.home, where: c.where, char: true });
    });
  }
  add('charms', 'clover', 'Four-leaf clover', 1, 'Four leaves, one lucky afternoon.', 'charm');
  add('charms', 'horseshoe', 'Lucky horseshoe', 1, 'Hang it open end up, so the luck stays in.', 'charm');
  add('charms', 'ladybug', 'Ladybug', 1, 'Six dots and a very polite walk.', 'charm');
  add('charms', 'acorn', 'Acorn', 1, 'Nutmeg’s favorite snack, and a tree in disguise.', 'charm');
  add('charms', 'wishbone', 'Wishbone', 2, 'Two people, one wish, one small pull.', 'charm');
  add('charms', 'key', 'Little brass key', 2, 'It opens whatever you are curious about.', 'charm');
  add('charms', 'rainbow', 'Pocket rainbow', 4, 'Rain plus sun, folded up small.', 'charm');
  add('charms', 'feather', 'Soft feather', 1, 'Light enough to float, sturdy enough to be a charm.', 'charm');
  add('gems', 'ruby', 'Ruby', 2, 'Warm red, like a good cup of cocoa.', 'charm');
  add('gems', 'sapphire', 'Sapphire', 2, 'Deep blue, the color of a quiet evening.', 'charm');
  add('gems', 'emerald', 'Emerald', 2, 'Green as the first day of spring.', 'charm');
  add('gems', 'amethyst', 'Amethyst', 2, 'Purple, and a little bit sparkly.', 'charm');
  add('gems', 'citrine', 'Citrine', 1, 'A sunny yellow stone.', 'charm');
  add('gems', 'pearl', 'Pearl', 2, 'Round, smooth and a little shy.', 'charm');
  add('gems', 'moonstone', 'Moonstone', 3, 'It glows a little, like it knows a secret.', 'charm');
  add('gems', 'diamond', 'Diamond', 4, 'The rarest sparkle in the whole machine.', 'charm');
  add('sky', 'crescent', 'Crescent charm', 2, 'A thin moon with a tiny star beside it.', 'charm');
  add('sky', 'shooting', 'Shooting star', 3, 'Make a small wish. Any size works.', 'charm');
  add('sky', 'comet', 'Friendly comet', 2, 'Fast, but it waves as it goes by.', 'charm');
  add('sky', 'planet', 'Ringed planet', 3, 'Far away, and somehow still cozy.', 'charm');
  add('sky', 'sun', 'Smiling sun', 2, 'Back every morning, no matter what.', 'charm');
  add('sky', 'dipper', 'Little Dipper', 3, 'Seven stars and one handle.', 'charm');
  add('cozy', 'teacup', 'Teacup', 1, 'Still warm. Take your time.', 'charm');
  add('cozy', 'slipper', 'Fuzzy slipper', 1, 'For the walk from the couch to the kitchen.', 'charm');
  add('cozy', 'candle', 'Little candle', 1, 'A small light for a big evening.', 'charm');
  add('cozy', 'book', 'Bedtime book', 2, 'One more page, then lights out.', 'charm');
  add('cozy', 'cookie', 'Chocolate chip cookie', 1, 'Warm from the oven, at least in your imagination.', 'charm');
  add('cozy', 'quilt', 'Heart quilt', 2, 'Stitched from scraps, and all the better for it.', 'charm');
  var BY = {}; ITEMS.forEach(function (it) { BY[it.id] = it; });
  function byId(id) { return BY[id] || null; }

  // ---------- drawing helpers (a figure is drawn on a 100 x 100 sheet; its feet are at y = 84)
  function blob(g, x, y, rx, ry, col, rot) {
    g.save(); g.translate(x, y); if (rot) g.rotate(rot);
    var gr = g.createRadialGradient(-rx * 0.35, -ry * 0.4, Math.min(rx, ry) * 0.1, 0, 0, Math.max(rx, ry) * 1.08);
    gr.addColorStop(0, lt(col, 0.5)); gr.addColorStop(0.5, col); gr.addColorStop(1, dk(col, 0.3));
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill(); g.restore();
  }
  function flat(g, x, y, rx, ry, col, rot) { g.save(); g.translate(x, y); if (rot) g.rotate(rot); g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill(); g.restore(); }
  function gloss(g, x, y, rx, ry, rot, a) { g.save(); g.translate(x, y); g.rotate(rot || 0); g.fillStyle = 'rgba(255,255,255,' + (a == null ? 0.45 : a) + ')'; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill(); g.restore(); }
  function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function shadedRR(g, x, y, w, h, r, col) {
    var gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, lt(col, 0.4)); gr.addColorStop(0.5, col); gr.addColorStop(1, dk(col, 0.28));
    g.fillStyle = gr; rrect(g, x, y, w, h, r); g.fill();
  }
  function eye(g, x, y, r, col) { g.fillStyle = col || '#2B2620'; g.beginPath(); g.ellipse(x, y, r, r * 1.15, 0, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + r * 0.35, y - r * 0.4, r * 0.38, 0, TAU); g.fill(); }
  function smile(g, x, y, w, col, lw) { g.strokeStyle = col || '#2B2620'; g.lineWidth = lw || 1.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x, y + w * 0.9, x + w, y); g.stroke(); }
  function cheeks(g, x, y, sp, r, a) { g.fillStyle = 'rgba(240,110,130,' + (a == null ? 0.4 : a) + ')'; g.beginPath(); g.ellipse(x - sp, y, r, r * 0.65, 0, 0, TAU); g.ellipse(x + sp, y, r, r * 0.65, 0, 0, TAU); g.fill(); }
  function heartPath(g, x, y, s) { g.beginPath(); g.moveTo(x, y + s * 0.9); g.bezierCurveTo(x - s * 1.5, y - s * 0.05, x - s * 0.75, y - s * 1.1, x, y - s * 0.35); g.bezierCurveTo(x + s * 0.75, y - s * 1.1, x + s * 1.5, y - s * 0.05, x, y + s * 0.9); g.closePath(); }
  function heart(g, x, y, s, col) { g.fillStyle = col || '#E2556A'; heartPath(g, x, y, s); g.fill(); }
  function starPath(g, x, y, R, r, n, rot) { g.beginPath(); for (var i = 0; i < n * 2; i++) { var a = (rot || -Math.PI / 2) + i * Math.PI / n, rr = i % 2 ? r : R; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); }
  function star(g, x, y, R, col, rot) { var gr = g.createLinearGradient(x - R, y - R, x + R, y + R); gr.addColorStop(0, lt(col, 0.55)); gr.addColorStop(1, dk(col, 0.15)); g.fillStyle = gr; starPath(g, x, y, R, R * 0.46, 5, rot); g.fill(); }
  function poly(g, pts, fill, stroke, lw) { g.beginPath(); pts.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1; g.lineJoin = 'round'; g.stroke(); } }
  function glow(g, x, y, r, col, a) { var gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(col, a == null ? 0.7 : a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }

  // a cloud of Static: the same shape in four moods
  function cloud(g, col, mood) {
    var bumps = [[-17, 8, 14], [0, -1, 18], [17, 8, 14], [-7, 14, 13], [8, 14, 13]];
    if (mood === 'fuzz') for (var i = 0; i < 16; i++) { var a = i / 16 * TAU, ex = 50 + Math.cos(a) * 28, ey = 58 + Math.sin(a) * 18 + 2; flat(g, ex, ey, 5, 5, dk(col, 0.06)); }
    bumps.forEach(function (b) { blob(g, 50 + b[0], 54 + b[1], b[2], b[2], col); });
    gloss(g, 41, 41, 8, 4, -0.5, 0.4);
    var ex = 42, ey = 56;
    if (mood === 'grumble') {
      eye(g, ex, ey, 2.6); eye(g, 58, ey, 2.6);
      g.strokeStyle = '#3A3550'; g.lineWidth = 1.8; g.lineCap = 'round'; g.beginPath(); g.moveTo(37, ey - 6); g.lineTo(46, ey - 3); g.moveTo(63, ey - 6); g.lineTo(54, ey - 3); g.stroke();
      g.beginPath(); g.moveTo(44, 68); g.quadraticCurveTo(50, 63, 56, 68); g.stroke();
    } else if (mood === 'mumble') {
      eye(g, ex, ey + 1, 2.4); eye(g, 58, ey + 1, 2.4); cheeks(g, 50, 64, 13, 3.6, 0.55);
      g.strokeStyle = '#3A3550'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(47, 67.5); g.quadraticCurveTo(50, 69.5, 53, 67.5); g.stroke();
    } else if (mood === 'drift') {
      eye(g, ex, ey, 2.4); eye(g, 58, ey, 2.4); smile(g, 50, 63, 4.6, '#3A3550', 1.5); cheeks(g, 50, 63, 14, 3.2, 0.35);
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.6; g.beginPath(); g.arc(68, 50, 5, Math.PI, Math.PI * 2.1); g.stroke(); g.beginPath(); g.arc(68, 50, 2.2, 0, Math.PI * 1.6); g.stroke();
    } else {
      eye(g, ex, ey, 3.2); eye(g, 58, ey, 3.2); smile(g, 50, 64, 5.5, '#3A3550', 1.6); cheeks(g, 50, 64, 14, 3.4, 0.4);
    }
  }
  // a faceted gem: a crown on top, a point below; facets shaded from the base color
  function cut(g, cx, cy, w, h, col, sp) {
    var tw = w * 0.62, ch = h * 0.34, L = cx - w / 2, Rr = cx + w / 2, T = cy - h / 2, B = cy + h / 2;
    var tl = [cx - tw / 2, T], tr = [cx + tw / 2, T], gl = [L, T + ch], gr = [Rr, T + ch], bot = [cx, B];
    poly(g, [gl, tl, tr, gr, bot], dk(col, 0.1), dk(col, 0.45), 1);
    poly(g, [tl, tr, [cx + tw * 0.2, T + ch], [cx - tw * 0.2, T + ch]], lt(col, 0.6));
    poly(g, [gl, tl, [cx - tw * 0.2, T + ch]], lt(col, 0.3)); poly(g, [tr, gr, [cx + tw * 0.2, T + ch]], col);
    poly(g, [gl, [cx - tw * 0.2, T + ch], bot], dk(col, 0.05)); poly(g, [[cx - tw * 0.2, T + ch], [cx + tw * 0.2, T + ch], bot], lt(col, 0.2));
    poly(g, [[cx + tw * 0.2, T + ch], gr, bot], dk(col, 0.28));
    if (sp !== false) { star(g, cx - w * 0.2, T + h * 0.16, 3.2, '#ffffff'); }
  }

  // ---------- every collectible: a function that draws it on the 100 x 100 sheet
  var ART = {};
  ART.peach = function (g) { blob(g, 50, 58, 25, 24, '#F6A98A'); gloss(g, 38, 44, 8, 4.5, -0.6); eye(g, 42, 57, 2.6); eye(g, 58, 57, 2.6); smile(g, 50, 63, 5, '#8A3F32', 1.6); cheeks(g, 50, 63, 15, 3.6, 0.5); heart(g, 67, 74, 5.5); };
  ART.lilac = function (g) { shadedRR(g, 26, 34, 48, 48, 17, '#BFA6E0'); gloss(g, 38, 44, 8, 4.5, -0.5, 0.4); eye(g, 42, 58, 2.6); eye(g, 58, 58, 2.6); smile(g, 50, 65, 5, '#4C3A6E', 1.6); cheeks(g, 50, 65, 15, 3.6, 0.45); heart(g, 33, 76, 5.5); };
  ART.puddles = function (g) {   // the same shapes as PUDDLES_SVG in site.js (a drop, round glasses, a little cap)
    g.save(); var k = 0.86; g.translate(50 - 40 * k, 83 - 72 * k); g.scale(k, k); D.drawPuddlesShapes(g); g.restore();
  };
  ART.tidbit = function (g) { pup(g, 'collar'); };
  ART.sugarfoot = function (g) { pup(g, 'drop'); };
  function pup(g, look) {
    var P = window.TOLPups; if (!P) { blob(g, 50, 60, 22, 18, look === 'collar' ? '#262220' : '#A45C2E'); eye(g, 44, 56, 2.5); eye(g, 56, 56, 2.5); return; }
    g.save(); g.translate(46, 83); g.scale(1.0, 1.0);
    try { P.draw(g, P.looks[look], 'wiggle', 0.6, 0.35, false, 0, 0.05); } catch (e) {}
    g.restore();
  }
  ART.ollie = function (g) {
    flat(g, 41, 83, 5, 2.4, '#E8913A'); flat(g, 59, 83, 5, 2.4, '#E8913A');
    poly(g, [[33, 36], [38, 22], [45, 32]], '#7A5738'); poly(g, [[67, 36], [62, 22], [55, 32]], '#7A5738');
    blob(g, 50, 58, 25, 27, '#A9825A'); blob(g, 27, 63, 7, 15, '#8A6742', 0.18); blob(g, 73, 63, 7, 15, '#8A6742', -0.18);
    blob(g, 50, 68, 15, 15, '#F0DDB8'); g.strokeStyle = 'rgba(150,110,70,.55)'; g.lineWidth = 1.4; g.lineCap = 'round';
    for (var i = 0; i < 3; i++) { g.beginPath(); g.moveTo(43, 64 + i * 5); g.lineTo(50, 67 + i * 5); g.lineTo(57, 64 + i * 5); g.stroke(); }
    flat(g, 41, 47, 9.5, 9.5, '#FFF7E6'); flat(g, 59, 47, 9.5, 9.5, '#FFF7E6'); g.strokeStyle = '#6B4A2B'; g.lineWidth = 1.6; [41, 59].forEach(function (x) { g.beginPath(); g.arc(x, 47, 9.5, 0, TAU); g.stroke(); });
    eye(g, 42, 48, 4.4, '#3A2A1C'); eye(g, 58, 48, 4.4, '#3A2A1C'); poly(g, [[50, 52], [46, 57], [54, 57]], '#EE9B3F', '#B86A1C', 0.8);
    gloss(g, 40, 37, 8, 3.5, -0.5, 0.3);
  };
  ART.dot = function (g) {
    blob(g, 46, 77, 26, 7.5, '#F2D9C4'); blob(g, 70, 66, 8, 13, '#F2D9C4', 0.2);
    g.strokeStyle = '#E3BFA2'; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(68, 56); g.lineTo(66, 45); g.moveTo(74, 57); g.lineTo(77, 46); g.stroke();
    flat(g, 66, 44, 3.6, 3.6, '#fff'); flat(g, 77, 45, 3.6, 3.6, '#fff'); eye(g, 66.5, 44.5, 1.9); eye(g, 77.5, 45.5, 1.9); smile(g, 71, 70, 3.2, '#8A5A44', 1.3); cheeks(g, 71, 70, 7, 2.2, 0.5);
    blob(g, 40, 56, 21, 21, '#C7A6D9');
    g.strokeStyle = '#7C5C96'; g.lineWidth = 2.2; g.beginPath(); for (var a = 0; a < 11; a += 0.2) { var rr = 2 + a * 1.6; g.lineTo(40 + Math.cos(a) * rr * 0.95, 56 + Math.sin(a) * rr * 0.95); } g.stroke();
    gloss(g, 31, 43, 7, 3.4, -0.6, 0.4);
  };
  ART.hopper = function (g) {
    blob(g, 29, 81, 10, 4.5, '#6FA36C'); blob(g, 71, 81, 10, 4.5, '#6FA36C');
    blob(g, 50, 65, 27, 19, '#7DB07A'); blob(g, 50, 73, 17, 10, '#D5EBC0'); blob(g, 50, 49, 23, 16, '#7DB07A');
    flat(g, 37, 35, 9, 9, '#8FC08A'); flat(g, 63, 35, 9, 9, '#8FC08A'); flat(g, 37, 36, 6.6, 6.6, '#fff'); flat(g, 63, 36, 6.6, 6.6, '#fff');
    eye(g, 37, 37, 3.4); eye(g, 63, 37, 3.4); smile(g, 50, 54, 11, '#2F5E36', 1.8); cheeks(g, 50, 55, 17, 4, 0.5); gloss(g, 40, 46, 8, 3, -0.3, 0.35);
    flat(g, 47, 49, 1, 1, '#2F5E36'); flat(g, 53, 49, 1, 1, '#2F5E36');
  };
  ART.nutmeg = function (g) {
    blob(g, 72, 52, 13, 27, '#C77D4A', 0.35); blob(g, 70, 54, 7, 18, '#E9B07C', 0.35);
    blob(g, 46, 66, 18, 19, '#C98B58'); blob(g, 46, 70, 10.5, 13, '#F3E0C4'); blob(g, 42, 42, 17, 15, '#C98B58');
    blob(g, 31, 28, 6, 6.6, '#C98B58'); blob(g, 53, 27, 6, 6.6, '#C98B58'); flat(g, 31, 28.6, 3, 3.6, '#F2B6A0'); flat(g, 53, 27.6, 3, 3.6, '#F2B6A0');
    blob(g, 42, 48, 8, 6, '#F3E0C4'); eye(g, 35, 41, 2.8); eye(g, 50, 41, 2.8); flat(g, 42, 46, 2.2, 1.6, '#4A2E22'); smile(g, 42, 50, 2.8, '#4A2E22', 1.2); cheeks(g, 42, 48, 11, 2.8, 0.45);
    blob(g, 44, 63, 5.4, 6.6, '#C28A3C'); blob(g, 44, 58, 6.4, 3.4, '#7A5230'); gloss(g, 33, 36, 6, 2.6, -0.4, 0.35);
  };
  ART.lumi = function (g) {
    blob(g, 76, 70, 7, 17, '#B85A2E', 0.7); g.strokeStyle = 'rgba(255,240,220,.85)'; g.lineWidth = 2.2; for (var i = 0; i < 3; i++) { g.beginPath(); g.arc(78 - i * 3, 64 + i * 6, 6, -0.4, 1.9); g.stroke(); }
    blob(g, 50, 72, 19, 13, '#A94F2B');
    poly(g, [[28, 42], [33, 22], [45, 34]], '#C8602F'); poly(g, [[72, 42], [67, 22], [55, 34]], '#C8602F'); poly(g, [[32, 38], [34, 27], [40, 34]], '#FFF4E6'); poly(g, [[68, 38], [66, 27], [60, 34]], '#FFF4E6');
    blob(g, 50, 50, 26, 21, '#D9774A'); blob(g, 38, 58, 10.5, 8, '#FFF4E6'); blob(g, 62, 58, 10.5, 8, '#FFF4E6'); blob(g, 50, 61, 8.5, 6.4, '#FFF4E6');
    flat(g, 40, 41, 5, 2.8, '#FFF4E6'); flat(g, 60, 41, 5, 2.8, '#FFF4E6'); eye(g, 41, 49, 3); eye(g, 59, 49, 3); flat(g, 50, 58, 3, 2.2, '#2B2620'); smile(g, 50, 61, 2.8, '#2B2620', 1.2);
    gloss(g, 41, 36, 8, 3, -0.4, 0.3);
  };
  ART.beep = function (g) {
    shadedRR(g, 36, 70, 9, 13, 3, '#7B8FA3'); shadedRR(g, 55, 70, 9, 13, 3, '#7B8FA3');
    shadedRR(g, 30, 44, 40, 32, 9, '#8FA3B5'); shadedRR(g, 22, 50, 8, 18, 4, '#7B8FA3'); shadedRR(g, 70, 50, 8, 18, 4, '#7B8FA3');
    g.strokeStyle = '#6B7C8C'; g.lineWidth = 2; g.beginPath(); g.moveTo(50, 34); g.lineTo(50, 24); g.stroke(); glow(g, 50, 22, 9, '#FF9A6A', 0.55); flat(g, 50, 22, 3.6, 3.6, '#FF7A4A'); gloss(g, 49, 21, 1.3, 1.1, 0, 0.8);
    shadedRR(g, 33, 34, 34, 22, 7, '#8FA3B5'); rrect(g, 36, 37, 28, 16, 5); g.fillStyle = '#1F2740'; g.fill();
    glow(g, 43, 45, 6, '#6EE7F5', 0.4); glow(g, 57, 45, 6, '#6EE7F5', 0.4); rrect(g, 40, 42, 6, 6, 2); g.fillStyle = '#6EE7F5'; g.fill(); rrect(g, 54, 42, 6, 6, 2); g.fill();
    g.strokeStyle = '#6EE7F5'; g.lineWidth = 1.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(44, 50.5); g.quadraticCurveTo(50, 54, 56, 50.5); g.stroke();
    heart(g, 50, 63, 5, '#F2829A'); [[34, 48], [66, 48], [34, 72], [66, 72]].forEach(function (p) { flat(g, p[0], p[1], 1.1, 1.1, '#5E6F80'); });
    gloss(g, 40, 37, 6, 1.8, -0.2, 0.3);
  };
  ART.ducklings = function (g) {
    function duck(x, y, s) {
      flat(g, x - 4 * s, y + 9 * s, 3.2 * s, 1.5 * s, '#E8913A'); flat(g, x + 4 * s, y + 9 * s, 3.2 * s, 1.5 * s, '#E8913A');
      blob(g, x, y, 11 * s, 10 * s, '#F4D24F'); blob(g, x - 8 * s, y + 1 * s, 4 * s, 6 * s, '#EAC23A', 0.3); blob(g, x + 1 * s, y - 11 * s, 7.4 * s, 7 * s, '#F8DB6A');
      poly(g, [[x + 5 * s, y - 11 * s], [x + 11 * s, y - 9.6 * s], [x + 5 * s, y - 8 * s]], '#EE8B2B'); eye(g, x - 0.6 * s, y - 12.6 * s, 1.6 * s); flat(g, x - 3 * s, y - 8 * s, 1.8 * s, 1.1 * s, 'rgba(240,120,130,.5)');
    }
    duck(31, 72, 0.8); duck(69, 72, 0.8); duck(50, 62, 1.1);
  };
  ART.moon = function (g) {
    glow(g, 50, 54, 42, '#FFF0B4', 0.55);
    blob(g, 50, 54, 26, 26, '#F4E7B8'); [[38, 44, 5], [62, 40, 3.4], [60, 66, 4.6], [36, 65, 2.6]].forEach(function (c) { flat(g, c[0], c[1], c[2], c[2] * 0.9, 'rgba(200,175,110,.35)'); });
    g.strokeStyle = '#5A4A3A'; g.lineWidth = 1.7; g.lineCap = 'round'; g.beginPath(); g.arc(42, 55, 3.6, 0.15 * Math.PI, 0.85 * Math.PI); g.moveTo(65, 55); g.arc(58, 55, 3.6, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    smile(g, 50, 62, 4.4, '#5A4A3A', 1.5); cheeks(g, 50, 61, 15, 3.8, 0.4); gloss(g, 40, 40, 8, 3.6, -0.6, 0.45); star(g, 79, 28, 4, '#FFE7A0'); star(g, 22, 34, 3, '#FFE7A0');
  };
  ART.butterfly = function (g) {
    function bf(x, y, s, a, b) {
      glow(g, x, y, 22 * s, '#BDEBFF', 0.45);
      blob(g, x - 8 * s, y - 5 * s, 9 * s, 12 * s, a, -0.6); blob(g, x + 8 * s, y - 5 * s, 9 * s, 12 * s, a, 0.6);
      blob(g, x - 6 * s, y + 7 * s, 6.4 * s, 8 * s, b, 0.5); blob(g, x + 6 * s, y + 7 * s, 6.4 * s, 8 * s, b, -0.5);
      blob(g, x, y + 1 * s, 1.8 * s, 8 * s, '#3B4C6B'); g.strokeStyle = '#3B4C6B'; g.lineWidth = 1 * s; g.beginPath(); g.moveTo(x, y - 6 * s); g.quadraticCurveTo(x - 3 * s, y - 13 * s, x - 6 * s, y - 13 * s); g.moveTo(x, y - 6 * s); g.quadraticCurveTo(x + 3 * s, y - 13 * s, x + 6 * s, y - 13 * s); g.stroke();
      [[-8, -5], [8, -5]].forEach(function (d) { flat(g, x + d[0] * s, y + d[1] * s, 2.4 * s, 3.2 * s, 'rgba(255,255,255,.6)'); });
    }
    bf(40, 56, 1.35, '#8FC1D9', '#B9E3F2'); bf(66, 36, 0.9, '#9AD6C8', '#C9F0E4');
  };
  ART.bunny = function (g) {
    flat(g, 66, 78, 5, 5, '#fff'); blob(g, 50, 68, 18, 16, '#F6E4EA');
    blob(g, 41, 24, 5.4, 16, '#F6E4EA', -0.12); flat(g, 41, 26, 2.7, 11, '#F2B8C6', -0.12); blob(g, 62, 36, 5.4, 14, '#F6E4EA', 0.95); flat(g, 62, 36, 2.7, 9.5, '#F2B8C6', 0.95);
    blob(g, 50, 48, 16, 14, '#F6E4EA'); eye(g, 44, 47, 2.4); eye(g, 56, 47, 2.4); poly(g, [[50, 51], [47.6, 49.2], [52.4, 49.2]], '#EE8FA6'); smile(g, 50, 52.5, 3, '#8A5A64', 1.2); cheeks(g, 50, 51, 11, 3, 0.5);
    flat(g, 42, 80, 5, 3, '#F6E4EA'); flat(g, 58, 80, 5, 3, '#F6E4EA'); gloss(g, 42, 40, 6, 2.6, -0.4, 0.4);
  };
  ART.hedgehog = function (g) {
    flat(g, 40, 83, 5, 2.4, '#7A5A3E'); flat(g, 58, 83, 5, 2.4, '#7A5A3E');
    g.fillStyle = '#6E5238'; g.strokeStyle = '#4E3A28'; g.lineWidth = 1.5; g.lineCap = 'round';
    for (var i = 0; i < 38; i++) { var a = Math.PI + 0.1 + i / 37 * (Math.PI * 0.95); g.strokeStyle = i % 2 ? '#4E3A28' : '#8A6B4A'; g.beginPath(); g.moveTo(46 + Math.cos(a) * 20, 70 + Math.sin(a) * 19); g.lineTo(46 + Math.cos(a) * 30, 70 + Math.sin(a) * 28); g.stroke(); }
    blob(g, 46, 66, 25, 20, '#8A6B4A'); blob(g, 66, 68, 13, 10, '#EAD3B3'); flat(g, 77, 67, 2.8, 2.4, '#2B2620'); eye(g, 68, 62, 2.2); cheeks(g, 66, 71, 4, 2.6, 0.4); smile(g, 70, 72, 2.4, '#7A5A3E', 1.1);
    gloss(g, 36, 54, 8, 3, -0.5, 0.3);
  };
  ART.kip = function (g) {
    glow(g, 50, 56, 36, '#FFE97A', 0.35);
    rrect(g, 31, 36, 38, 46, 9); var gr = g.createLinearGradient(31, 0, 69, 0); gr.addColorStop(0, 'rgba(210,235,255,.5)'); gr.addColorStop(0.5, 'rgba(235,248,255,.18)'); gr.addColorStop(1, 'rgba(190,220,250,.4)'); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.5; g.stroke();
    shadedRR(g, 34, 29, 32, 9, 3, '#C99A3E');
    [[42, 62, 6], [58, 52, 5], [50, 72, 5.5], [41, 47, 4.4], [60, 68, 4]].forEach(function (f) { glow(g, f[0], f[1], f[2] * 2.6, '#FFE97A', 0.7); flat(g, f[0], f[1], f[2] * 0.42, f[2] * 0.42, '#FFF8C8'); });
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(36, 44); g.lineTo(36, 66); g.stroke();
  };
  ART.bear = function (g) {
    flat(g, 41, 83, 7, 3, '#8A5C38'); flat(g, 59, 83, 7, 3, '#8A5C38'); blob(g, 50, 67, 20, 18, '#A9744A'); blob(g, 50, 70, 11, 12, '#E4C9A5');
    shadedRR(g, 32, 66, 36, 5, 2, '#F2EBDD'); flat(g, 50, 68.5, 3, 3, '#2B2620');
    blob(g, 35, 30, 7.2, 7.2, '#A9744A'); blob(g, 65, 30, 7.2, 7.2, '#A9744A'); flat(g, 35, 31, 3.5, 3.5, '#E4C9A5'); flat(g, 65, 31, 3.5, 3.5, '#E4C9A5');
    blob(g, 50, 42, 18, 16, '#B98055'); blob(g, 50, 49, 8.6, 6.6, '#E4C9A5'); flat(g, 50, 47, 3, 2.2, '#2B2620'); smile(g, 50, 51, 2.8, '#2B2620', 1.2); eye(g, 42, 40, 2.4); eye(g, 58, 40, 2.4); cheeks(g, 50, 49, 14, 2.8, 0.4);
    shadedRR(g, 32, 33, 36, 4.6, 2, '#F6F1E6'); flat(g, 70, 35, 3, 3, '#E2556A'); g.strokeStyle = '#E2556A'; g.lineWidth = 2; g.beginPath(); g.moveTo(70, 35); g.lineTo(76, 40); g.moveTo(70, 35); g.lineTo(74, 30); g.stroke(); gloss(g, 41, 34, 7, 2.6, -0.4, 0.3);
  };
  ART.grumble = function (g) { cloud(g, '#9FA8C9', 'grumble'); };
  ART.fuzz = function (g) { cloud(g, '#C9A8E0', 'fuzz'); };
  ART.mumble = function (g) { cloud(g, '#F2B6A0', 'mumble'); };
  ART.drift = function (g) { cloud(g, '#A8D8C8', 'drift'); };

  // ----- charms
  ART.clover = function (g) {
    g.strokeStyle = '#3F8F52'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(50, 56); g.quadraticCurveTo(52, 72, 58, 80); g.stroke();
    [0, 1, 2, 3].forEach(function (i) { g.save(); g.translate(50, 54); g.rotate(i * Math.PI / 2 + Math.PI); var gr = g.createLinearGradient(0, 0, 0, 22); gr.addColorStop(0, '#9BE08A'); gr.addColorStop(1, '#3F9B4E'); g.fillStyle = gr; heartPath(g, 0, 11, 11); g.fill(); g.strokeStyle = 'rgba(30,90,40,.4)'; g.lineWidth = 1; g.stroke(); g.restore(); });
    gloss(g, 43, 42, 4, 2, -0.7, 0.45);
  };
  ART.horseshoe = function (g) {
    g.lineCap = 'round'; g.strokeStyle = '#7C8796'; g.lineWidth = 13; g.beginPath(); g.arc(50, 52, 20, Math.PI * 0.82, Math.PI * 2.18); g.stroke();
    var gr = g.createLinearGradient(30, 30, 70, 76); gr.addColorStop(0, '#F5F7FA'); gr.addColorStop(0.5, '#C5CCD6'); gr.addColorStop(1, '#8D97A6'); g.strokeStyle = gr; g.lineWidth = 10.5; g.beginPath(); g.arc(50, 52, 20, Math.PI * 0.82, Math.PI * 2.18); g.stroke();
    g.fillStyle = '#5E6877'; [[32, 60], [30, 50], [32, 40], [68, 60], [70, 50], [68, 40]].forEach(function (p, i) { flat(g, p[0] + (i < 3 ? 0 : 0), p[1], 1.5, 1.8, '#5E6877'); });
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.6; g.beginPath(); g.arc(50, 52, 24, Math.PI * 1.1, Math.PI * 1.5); g.stroke();
  };
  ART.ladybug = function (g) {
    blob(g, 50, 40, 9, 8, '#2B2620'); eye(g, 46, 38, 1.8, '#fff'); eye(g, 54, 38, 1.8, '#fff'); g.strokeStyle = '#2B2620'; g.lineWidth = 1.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(46, 33); g.quadraticCurveTo(42, 26, 38, 27); g.moveTo(54, 33); g.quadraticCurveTo(58, 26, 62, 27); g.stroke();
    blob(g, 50, 62, 24, 21, '#E24B4B'); g.strokeStyle = '#2B2620'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(50, 44); g.lineTo(50, 83); g.stroke();
    [[39, 54, 3.6], [61, 54, 3.6], [37, 68, 3.2], [63, 68, 3.2], [44, 77, 2.8], [56, 77, 2.8]].forEach(function (d) { flat(g, d[0], d[1], d[2], d[2], '#2B2620'); });
    gloss(g, 39, 50, 7, 3.2, -0.6, 0.5);
  };
  ART.acorn = function (g) {
    g.fillStyle = '#C28A3C'; var gr = g.createRadialGradient(44, 56, 3, 50, 62, 24); gr.addColorStop(0, '#E8B766'); gr.addColorStop(1, '#8F5E22'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(32, 50); g.quadraticCurveTo(32, 76, 50, 84); g.quadraticCurveTo(68, 76, 68, 50); g.closePath(); g.fill();
    blob(g, 50, 46, 21, 11, '#7A5230'); g.fillStyle = 'rgba(40,20,5,.35)'; for (var i = 0; i < 12; i++) flat(g, 36 + (i % 4) * 9.3, 43 + Math.floor(i / 4) * 4.2, 1.2, 1, 'rgba(40,20,5,.4)');
    g.strokeStyle = '#5E3E1E'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(50, 36); g.lineTo(52, 28); g.stroke(); gloss(g, 41, 62, 3.4, 8, 0.2, 0.4);
  };
  ART.wishbone = function (g) {
    g.lineCap = 'round'; g.lineJoin = 'round';
    function bone(col, w) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(31, 30); g.quadraticCurveTo(33, 58, 50, 62); g.quadraticCurveTo(67, 58, 69, 30); g.moveTo(50, 62); g.lineTo(50, 80); g.stroke(); }
    bone('#B89B6A', 11); bone('#F4E8CF', 8); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(31, 34); g.quadraticCurveTo(33, 56, 46, 60); g.stroke(); flat(g, 31, 29, 5, 4, '#F4E8CF'); flat(g, 69, 29, 5, 4, '#F4E8CF');
  };
  ART.key = function (g) {
    g.save(); g.translate(50, 56); g.rotate(-0.35); g.translate(-50, -56);
    shadedRR(g, 47, 44, 6, 42, 2.5, '#D4A94E'); shadedRR(g, 53, 70, 10, 5, 1.5, '#D4A94E'); shadedRR(g, 53, 78, 7, 5, 1.5, '#D4A94E');
    var gr = g.createRadialGradient(46, 30, 2, 50, 34, 16); gr.addColorStop(0, '#FBE3A0'); gr.addColorStop(1, '#B98428'); g.fillStyle = gr; g.beginPath(); g.arc(50, 34, 14, 0, TAU); g.fill();
    g.globalCompositeOperation = 'destination-out'; heartPath(g, 50, 34, 6); g.fill(); g.globalCompositeOperation = 'source-over'; g.strokeStyle = 'rgba(120,80,20,.5)'; g.lineWidth = 1.2; g.beginPath(); g.arc(50, 34, 14, 0, TAU); g.stroke(); gloss(g, 43, 26, 4, 2, -0.6, 0.6); g.restore();
  };
  ART.rainbow = function (g) {
    ['#E2556A', '#F2A04A', '#F4D26B', '#7DB07A', '#5FA3D9', '#9A7FD0'].forEach(function (c, i) { g.strokeStyle = c; g.lineWidth = 5.2; g.lineCap = 'butt'; g.beginPath(); g.arc(50, 74, 32 - i * 4.8, Math.PI, TAU); g.stroke(); });
    [[19, 76], [81, 76]].forEach(function (p) { blob(g, p[0], p[1], 9, 6, '#FFFFFF'); blob(g, p[0] + (p[0] < 50 ? 6 : -6), p[1] - 3, 7, 6, '#FFFFFF'); blob(g, p[0] + (p[0] < 50 ? -5 : 5), p[1] - 1, 5, 4, '#F3F7FF'); });
    star(g, 50, 40, 4, '#FFE7A0');
  };
  ART.feather = function (g) {
    g.save(); g.translate(50, 56); g.rotate(-0.55);
    var gr = g.createLinearGradient(-8, 0, 8, 0); gr.addColorStop(0, '#CFE3F6'); gr.addColorStop(0.5, '#F4FAFF'); gr.addColorStop(1, '#9DC0E6'); g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, -30); g.bezierCurveTo(16, -18, 15, 14, 0, 28); g.bezierCurveTo(-15, 14, -16, -18, 0, -30); g.fill(); g.strokeStyle = 'rgba(80,120,170,.5)'; g.lineWidth = 1; g.stroke();
    g.strokeStyle = 'rgba(90,130,180,.55)'; g.lineWidth = 0.9; for (var i = -20; i < 22; i += 5) { g.beginPath(); g.moveTo(0, i); g.lineTo(-9 + Math.abs(i) * 0.15, i - 6); g.moveTo(0, i); g.lineTo(9 - Math.abs(i) * 0.15, i - 6); g.stroke(); }
    g.strokeStyle = '#7C95B4'; g.lineWidth = 1.8; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -28); g.lineTo(0, 38); g.stroke(); g.restore();
  };
  // ----- gems
  ART.ruby = function (g) { glow(g, 50, 56, 32, '#FF5A6A', 0.35); cut(g, 50, 56, 40, 40, '#D93A55'); };
  ART.sapphire = function (g) {
    glow(g, 50, 56, 32, '#5A8CFF', 0.35); g.save(); g.translate(50, 56);
    var gr = g.createLinearGradient(-20, -24, 20, 24); gr.addColorStop(0, '#8FB4FF'); gr.addColorStop(0.5, '#2F5FD0'); gr.addColorStop(1, '#16307A'); g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 19, 25, 0, 0, TAU); g.fill(); g.strokeStyle = '#122A6E'; g.lineWidth = 1.2; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; for (var i = 0; i < 8; i++) { var a = i / 8 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 8, Math.sin(a) * 11); g.lineTo(Math.cos(a) * 19, Math.sin(a) * 25); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(0, 0, 8, 11, 0, 0, TAU); g.fill(); g.restore(); star(g, 42, 40, 3.6, '#ffffff');
  };
  ART.emerald = function (g) {
    glow(g, 50, 56, 32, '#4AD08A', 0.35); var gr = g.createLinearGradient(30, 34, 70, 80); gr.addColorStop(0, '#7BE8A8'); gr.addColorStop(0.5, '#1E9B5E'); gr.addColorStop(1, '#0F5C3A'); g.fillStyle = gr;
    poly(g, [[38, 34], [62, 34], [72, 44], [72, 70], [62, 80], [38, 80], [28, 70], [28, 44]], gr, '#0C4A2E', 1.2);
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1; poly(g, [[41, 40], [59, 40], [66, 47], [66, 67], [59, 74], [41, 74], [34, 67], [34, 47]], null, 'rgba(255,255,255,.4)', 1); poly(g, [[45, 47], [55, 47], [58, 51], [58, 63], [55, 67], [45, 67], [42, 63], [42, 51]], 'rgba(255,255,255,.18)', 'rgba(255,255,255,.4)', 1); star(g, 38, 40, 3.4, '#ffffff');
  };
  ART.amethyst = function (g) {
    glow(g, 50, 56, 32, '#B58CFF', 0.35);
    [[36, 60, 8, 30, -0.25], [64, 60, 8, 30, 0.25], [50, 54, 10, 40, 0]].forEach(function (c) {
      g.save(); g.translate(c[0], 82); g.rotate(c[4]); var h = c[3], w = c[2]; var gr = g.createLinearGradient(-w, 0, w, 0); gr.addColorStop(0, '#C9A4F5'); gr.addColorStop(0.5, '#8E5BD0'); gr.addColorStop(1, '#5B3496'); g.fillStyle = gr;
      poly(g, [[-w, 0], [-w, -h * 0.7], [0, -h], [w, -h * 0.7], [w, 0]], gr, '#3F2270', 1); poly(g, [[-w, -h * 0.7], [0, -h], [0, -h * 0.55]], 'rgba(255,255,255,.35)'); g.restore();
    }); star(g, 46, 30, 3.4, '#ffffff');
  };
  ART.citrine = function (g) { glow(g, 50, 56, 32, '#FFD34A', 0.4); g.save(); g.translate(50, 56); g.rotate(Math.PI / 4); var gr = g.createLinearGradient(-20, -20, 20, 20); gr.addColorStop(0, '#FFF0A0'); gr.addColorStop(0.5, '#F2B820'); gr.addColorStop(1, '#B5780A'); g.fillStyle = gr; rrect(g, -19, -19, 38, 38, 6); g.fill(); g.strokeStyle = '#8A5A06'; g.lineWidth = 1.2; g.stroke(); g.fillStyle = 'rgba(255,255,255,.3)'; rrect(g, -11, -11, 22, 22, 3); g.fill(); g.strokeStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(-19, -19); g.lineTo(-11, -11); g.moveTo(19, -19); g.lineTo(11, -11); g.moveTo(19, 19); g.lineTo(11, 11); g.moveTo(-19, 19); g.lineTo(-11, 11); g.stroke(); g.restore(); star(g, 40, 42, 3.4, '#ffffff'); };
  ART.pearl = function (g) {
    blob(g, 50, 74, 26, 8, '#F2C9D0'); g.strokeStyle = '#D79AA6'; g.lineWidth = 1; for (var i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(50, 80); g.lineTo(50 + i * 8, 69); g.stroke(); }
    blob(g, 50, 56, 17, 17, '#FBF6F2'); var gr = g.createRadialGradient(44, 50, 1, 50, 56, 18); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(50, 56, 17, 0, TAU); g.fill();
    g.fillStyle = 'rgba(190,210,255,.25)'; g.beginPath(); g.ellipse(55, 63, 8, 5, -0.5, 0, TAU); g.fill(); gloss(g, 43, 49, 4, 2.4, -0.6, 0.8);
  };
  ART.moonstone = function (g) {
    glow(g, 50, 56, 34, '#CFE3FF', 0.5); g.save(); g.translate(50, 56);
    var gr = g.createRadialGradient(-6, -8, 2, 0, 0, 24); gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.5, '#D6E4F5'); gr.addColorStop(1, '#8FA6CF'); g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 20, 26, 0.2, 0, TAU); g.fill();
    var sh = g.createLinearGradient(-20, 0, 20, 0); sh.addColorStop(0, 'rgba(150,200,255,0)'); sh.addColorStop(0.5, 'rgba(150,200,255,.55)'); sh.addColorStop(1, 'rgba(200,170,255,0)'); g.fillStyle = sh; g.beginPath(); g.ellipse(2, 2, 15, 22, 0.2, 0, TAU); g.fill(); g.strokeStyle = '#7C93BE'; g.lineWidth = 1; g.beginPath(); g.ellipse(0, 0, 20, 26, 0.2, 0, TAU); g.stroke(); g.restore(); gloss(g, 42, 42, 5, 2.6, -0.7, 0.7);
  };
  ART.diamond = function (g) { glow(g, 50, 54, 40, '#BFF3FF', 0.6); cut(g, 50, 54, 52, 48, '#9ADCF0'); star(g, 74, 30, 4.4, '#ffffff'); star(g, 24, 38, 3, '#ffffff'); };
  // ----- sky
  ART.crescent = function (g) {
    glow(g, 50, 54, 34, '#FFE7A0', 0.4); g.save(); g.translate(50, 54); var gr = g.createLinearGradient(-20, -20, 20, 20); gr.addColorStop(0, '#FFF0B8'); gr.addColorStop(1, '#D4A02E'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 24, 0, TAU); g.fill();
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(11, -4, 20, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over'; g.restore(); star(g, 66, 38, 6, '#FFE7A0'); gloss(g, 38, 40, 3, 7, 0.4, 0.5);
  };
  ART.shooting = function (g) {
    [[0.35, 20], [0.25, 26], [0.15, 32]].forEach(function (t, i) { g.strokeStyle = 'rgba(255,224,140,' + t[0] + ')'; g.lineWidth = 6 - i * 1.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(58 - 8, 48 + 6 - i * 2); g.lineTo(58 - 40 + i * 4, 70 - 14 + i * 6); g.stroke(); });
    glow(g, 60, 46, 26, '#FFE08A', 0.55); star(g, 60, 46, 17, '#F6C842', -Math.PI / 2 + 0.2); gloss(g, 55, 40, 4, 2, -0.6, 0.6);
  };
  ART.comet = function (g) {
    g.fillStyle = 'rgba(140,200,255,.5)'; g.beginPath(); g.moveTo(62, 46); g.quadraticCurveTo(40, 58, 18, 78); g.quadraticCurveTo(38, 56, 56, 38); g.closePath(); g.fill();
    g.fillStyle = 'rgba(190,225,255,.45)'; g.beginPath(); g.moveTo(66, 50); g.quadraticCurveTo(52, 68, 34, 82); g.quadraticCurveTo(52, 62, 60, 42); g.closePath(); g.fill();
    glow(g, 64, 44, 24, '#BFE6FF', 0.6); blob(g, 64, 44, 13, 13, '#CFEAFF'); eye(g, 61, 43, 2); eye(g, 68, 43, 2); smile(g, 64.5, 49, 3, '#3B5C86', 1.3); cheeks(g, 64.5, 48, 8, 2.2, 0.4); gloss(g, 59, 38, 4, 2, -0.6, 0.6);
  };
  ART.planet = function (g) {
    g.save(); g.translate(50, 56); g.rotate(-0.35); g.strokeStyle = '#B98428'; g.lineWidth = 5; g.beginPath(); g.ellipse(0, 0, 33, 9, 0, Math.PI, TAU); g.stroke(); g.restore();
    blob(g, 50, 56, 19, 19, '#E3A56E'); g.save(); g.beginPath(); g.arc(50, 56, 19, 0, TAU); g.clip(); g.strokeStyle = 'rgba(160,90,50,.35)'; g.lineWidth = 3.4; [-6, 2, 10].forEach(function (d) { g.beginPath(); g.moveTo(28, 56 + d); g.quadraticCurveTo(50, 56 + d + 4, 72, 56 + d); g.stroke(); }); g.restore();
    g.save(); g.translate(50, 56); g.rotate(-0.35); g.strokeStyle = '#E9C46F'; g.lineWidth = 5; g.beginPath(); g.ellipse(0, 0, 33, 9, 0, 0, Math.PI); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(0, -1.4, 33, 9, 0, 0.3, 1.2); g.stroke(); g.restore(); gloss(g, 42, 46, 5, 2.6, -0.6, 0.5);
  };
  ART.sun = function (g) {
    glow(g, 50, 54, 40, '#FFD24A', 0.45); g.fillStyle = '#F4B63A'; for (var i = 0; i < 12; i++) { var a = i / 12 * TAU; g.save(); g.translate(50, 54); g.rotate(a); poly(g, [[-3.6, -23], [0, -33], [3.6, -23]], '#F4B63A'); g.restore(); }
    blob(g, 50, 54, 22, 22, '#FFD04A'); eye(g, 43, 51, 2.6); eye(g, 57, 51, 2.6); smile(g, 50, 58, 6, '#8A4A12', 1.6); cheeks(g, 50, 58, 15, 3.8, 0.5); gloss(g, 41, 42, 7, 3.4, -0.6, 0.5);
  };
  ART.dipper = function (g) {
    var gr = g.createRadialGradient(44, 44, 4, 50, 56, 34); gr.addColorStop(0, '#3B3F85'); gr.addColorStop(1, '#1B1C48'); g.fillStyle = gr; g.beginPath(); g.arc(50, 56, 33, 0, TAU); g.fill(); g.strokeStyle = '#E9C46F'; g.lineWidth = 2; g.stroke();
    var pts = [[27, 62], [38, 66], [48, 60], [56, 56], [62, 46], [72, 44], [72, 56]];
    g.strokeStyle = 'rgba(255,240,180,.55)'; g.lineWidth = 1.3; g.beginPath(); pts.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.stroke();
    pts.forEach(function (p, i) { glow(g, p[0], p[1], 7, '#FFF0B0', 0.5); star(g, p[0], p[1], i === 0 ? 4 : 3.2, '#FFF0B0'); }); [[36, 40, 1.2], [54, 74, 1.2], [30, 50, 1]].forEach(function (s) { flat(g, s[0], s[1], s[2], s[2], 'rgba(255,255,255,.7)'); });
  };
  // ----- cozy
  ART.teacup = function (g) {
    g.strokeStyle = 'rgba(200,220,240,.8)'; g.lineWidth = 2.4; g.lineCap = 'round'; [[42, 0], [52, 4], [62, 0]].forEach(function (s) { g.beginPath(); g.moveTo(s[0], 44); g.bezierCurveTo(s[0] - 6, 38, s[0] + 6, 32, s[0], 24 - s[1]); g.stroke(); });
    blob(g, 50, 78, 32, 7, '#E9EEF5');
    g.strokeStyle = '#D5DEE9'; g.lineWidth = 5; g.beginPath(); g.arc(73, 58, 8, -1.3, 1.6); g.stroke();
    var gr = g.createLinearGradient(26, 0, 74, 0); gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.6, '#EEF3F9'); gr.addColorStop(1, '#C9D4E2'); g.fillStyle = gr; g.beginPath(); g.moveTo(26, 48); g.lineTo(74, 48); g.quadraticCurveTo(72, 78, 50, 78); g.quadraticCurveTo(28, 78, 26, 48); g.fill();
    flat(g, 50, 48, 24, 5, '#8A5A3A'); flat(g, 50, 49, 21, 3.6, '#A9724A'); g.strokeStyle = '#6FA3D9'; g.lineWidth = 3; g.beginPath(); g.moveTo(28, 58); g.quadraticCurveTo(50, 64, 72, 58); g.stroke(); heart(g, 50, 69, 3.4, '#E2556A');
  };
  ART.slipper = function (g) {
    blob(g, 50, 74, 32, 9, '#C9758A'); blob(g, 45, 66, 28, 14, '#F2A8BA'); blob(g, 60, 62, 15, 11, '#FBC4D2'); [[48, 50], [57, 49], [66, 52], [72, 58]].forEach(function (p) { blob(g, p[0] - 4, p[1] + 6, 5, 4.6, '#FDD3DE'); });
    flat(g, 38, 52, 12, 6, '#C9758A'); gloss(g, 36, 60, 8, 3, -0.2, 0.35); flat(g, 28, 64, 5, 5, 'rgba(255,255,255,.35)');
  };
  ART.candle = function (g) {
    blob(g, 50, 80, 24, 6, '#C99A3E'); blob(g, 50, 78, 20, 4.4, '#E9C46F'); glow(g, 50, 36, 28, '#FFC46B', 0.6);
    var gr = g.createLinearGradient(36, 0, 64, 0); gr.addColorStop(0, '#FFF6E0'); gr.addColorStop(0.5, '#FFE7B8'); gr.addColorStop(1, '#E6C48A'); g.fillStyle = gr; rrect(g, 37, 44, 26, 34, 4); g.fill(); blob(g, 50, 44, 13, 3.6, '#FFF1D0');
    g.strokeStyle = '#4A3A2A'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(50, 44); g.lineTo(50, 38); g.stroke();
    var fg = g.createRadialGradient(50, 34, 1, 50, 32, 11); fg.addColorStop(0, '#FFF8C8'); fg.addColorStop(0.5, '#FFC247'); fg.addColorStop(1, '#F07A2A'); g.fillStyle = fg; g.beginPath(); g.moveTo(50, 20); g.bezierCurveTo(60, 30, 58, 40, 50, 40); g.bezierCurveTo(42, 40, 40, 30, 50, 20); g.fill();
  };
  ART.book = function (g) {
    g.save(); g.translate(50, 56); g.rotate(-0.08);
    shadedRR(g, -22, -28, 44, 56, 4, '#5A8FB0'); poly(g, [[-22, -28], [-26, -24], [-26, 32], [-22, 28]], '#3F6E8C'); rrect(g, -18, 28, 38, 4, 1); g.fillStyle = '#FFF6E0'; g.fill(); rrect(g, 20, -26, 3, 54, 1); g.fillStyle = '#FFF6E0'; g.fill();
    g.strokeStyle = '#E9C46F'; g.lineWidth = 1.4; rrect(g, -17, -23, 34, 46, 2); g.stroke(); heart(g, 0, -4, 8, '#F2829A'); g.fillStyle = '#E9C46F'; g.font = '600 7px Georgia, serif'; g.textAlign = 'center'; g.fillText('GOODNIGHT', 0, 16); gloss(g, -12, -20, 7, 2, -0.2, 0.25); g.restore();
  };
  ART.cookie = function (g) {
    blob(g, 50, 58, 28, 26, '#D9A55E'); g.strokeStyle = 'rgba(150,90,30,.35)'; g.lineWidth = 2; g.beginPath(); g.arc(50, 58, 24, 0, TAU); g.stroke();
    [[40, 46, 4.6], [58, 44, 4], [64, 60, 4.8], [46, 62, 4.2], [36, 64, 3.4], [54, 74, 4], [70, 50, 3]].forEach(function (c) { blob(g, c[0], c[1], c[2], c[2] * 0.85, '#5A3524', 0.4); gloss(g, c[0] - 1, c[1] - 1, c[2] * 0.3, c[2] * 0.2, 0, 0.45); });
    flat(g, 38, 52, 1.2, 1, 'rgba(120,70,20,.5)'); flat(g, 56, 56, 1.2, 1, 'rgba(120,70,20,.5)'); flat(g, 48, 70, 1.2, 1, 'rgba(120,70,20,.5)'); gloss(g, 36, 42, 8, 3, -0.6, 0.3);
  };
  ART.quilt = function (g) {
    g.save(); g.translate(50, 56); g.rotate(0.06); var cols = ['#F2A8BA', '#F6D77E', '#9BC8F7', '#B9A2D9', '#F9F1E0', '#A8D8C8', '#F6D77E', '#F2A8BA', '#9BC8F7'];
    for (var i = 0; i < 9; i++) { var cx = -20 + (i % 3) * 13.4, cy = -20 + Math.floor(i / 3) * 13.4; shadedRR(g, cx, cy, 12.6, 12.6, 1.5, cols[i]); g.strokeStyle = 'rgba(255,255,255,.7)'; g.setLineDash([1.6, 1.6]); g.lineWidth = 0.8; g.strokeRect(cx + 1.5, cy + 1.5, 9.6, 9.6); g.setLineDash([]); }
    heart(g, 0, 0, 5.4, '#E2556A'); g.strokeStyle = 'rgba(80,50,50,.35)'; g.lineWidth = 1; g.strokeRect(-21, -21, 42, 42); g.restore();
  };

  // ---------- figures: the collectible on its little brass base, cached
  var figCache = {}, silCache = {};
  function plinth(g, small) {
    var rx = small ? 25 : 30, ry = small ? 10.5 : 12.5, ty = 79;   // the top of the base: a flat disc seen from above and in front
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(50, ty + 7, rx + 4, ry + 2.5, 0, 0, TAU); g.fill();
    var sg = g.createLinearGradient(50 - rx, 0, 50 + rx, 0); sg.addColorStop(0, '#8A6424'); sg.addColorStop(0.3, '#E3BE6A'); sg.addColorStop(0.6, '#C99A3E'); sg.addColorStop(1, '#6E4E1C');
    g.fillStyle = sg; g.beginPath(); g.ellipse(50, ty + 5, rx, ry, 0, 0, TAU); g.fill(); g.fillRect(50 - rx, ty, rx * 2, 5);
    g.beginPath(); g.ellipse(50, ty + 5, rx, ry, 0, 0, TAU); g.fill();
    var tp = g.createRadialGradient(44, ty - 3, 2, 50, ty, rx); tp.addColorStop(0, '#FFF3C8'); tp.addColorStop(0.7, '#E6C46E'); tp.addColorStop(1, '#C99A3E');
    g.fillStyle = tp; g.beginPath(); g.ellipse(50, ty, rx, ry, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(120,80,20,.45)'; g.lineWidth = 1; g.beginPath(); g.ellipse(50, ty, rx - 3, ry - 2.2, 0, 0, TAU); g.stroke();
  }
  function figure(id, px) {
    var key = id + '@' + px; if (figCache[key]) return figCache[key];
    var it = BY[id], c = mk(px, px), g = c.getContext('2d'); g.scale(px / 100, px / 100);
    if (it && ART[id]) { plinth(g, it.size === 'charm'); try { g.save(); if (it.size === 'charm') { g.translate(50, 84); g.scale(1.12, 1.12); g.translate(-50, -84); } ART[id](g); g.restore(); } catch (e) { g.restore(); } }
    figCache[key] = c; return c;
  }
  function silhouette(id, px) {
    var key = id + '@' + px; if (silCache[key]) return silCache[key];
    var f = figure(id, px), c = mk(px, px), g = c.getContext('2d'); g.drawImage(f, 0, 0);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = '#4A4350'; g.fillRect(0, 0, px, px);
    g.globalCompositeOperation = 'source-over'; silCache[key] = c; return c;
  }

  // ---------- coins: a coin lying flat, seen from the front and above. rpx is the radius on screen.
  var coinCache = {}, coinN = 0;
  function coin(skin, kind, rpx, k) {
    rpx = Math.max(3, Math.round(rpx)); k = k | 0;
    var key = (kind || '') + '|' + (kind ? '' : skin) + '|' + rpx + '|' + k; var hit = coinCache[key]; if (hit) return hit;
    if (coinN > 220) { coinCache = {}; coinN = 0; }
    var S = kind && KINDS[kind] ? KINDS[kind] : (SKINS[skin] || SKINS.gold);
    var ky = Math.sin(W.PITCH), thick = Math.max(1.6, rpx * 0.19), ry = rpx * ky;
    var w = Math.ceil(rpx * 2 + 4), h = Math.ceil(ry * 2 + thick + 5), cx = w / 2, cy = 2 + ry;
    var c = mk(w, h), g = c.getContext('2d');
    // the edge
    var eg = g.createLinearGradient(cx - rpx, 0, cx + rpx, 0); eg.addColorStop(0, S.edge[0]); eg.addColorStop(0.45, lt(S.edge[0], 0.25)); eg.addColorStop(1, S.edge[1]);
    g.fillStyle = eg; g.beginPath(); g.ellipse(cx, cy + thick, rpx, ry, 0, 0, Math.PI); g.lineTo(cx - rpx, cy); g.closePath(); g.fill();
    g.beginPath(); g.ellipse(cx, cy + thick, rpx, ry, 0, 0, TAU); g.fill();
    g.fillRect(cx - rpx, cy, rpx * 2, thick);
    if (rpx > 9) { g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 1; g.beginPath(); for (var i = -rpx + 3; i < rpx - 1; i += 3) { var yy = Math.sqrt(Math.max(0, 1 - (i / rpx) * (i / rpx))) * ry; g.moveTo(cx + i, cy + yy); g.lineTo(cx + i, cy + yy + thick); } g.stroke(); }
    // the face
    var fg = g.createRadialGradient(cx - rpx * 0.35, cy - ry * 0.4, rpx * 0.08, cx, cy, rpx * 1.05);
    if (S.rainbow) { fg = g.createLinearGradient(cx - rpx, cy - ry, cx + rpx, cy + ry); ['#FFB3C7', '#FFE3A3', '#C9F5B8', '#A8E3F7', '#D2B8FF'].forEach(function (cc, i) { fg.addColorStop(i / 4, cc); }); }
    else { fg.addColorStop(0, S.face[0]); fg.addColorStop(0.55, S.face[1]); fg.addColorStop(1, S.face[2]); }
    g.fillStyle = fg; g.beginPath(); g.ellipse(cx, cy, rpx, ry, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = Math.max(1, rpx * 0.07); g.beginPath(); g.ellipse(cx, cy, rpx - 0.6, ry - 0.5, 0, Math.PI * 1.05, Math.PI * 1.7); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(cx, cy, rpx - 0.6, ry - 0.5, 0, Math.PI * 0.05, Math.PI * 0.7); g.stroke();
    // the raised ring and the mark
    g.strokeStyle = rgba(S.mark, 0.42); g.lineWidth = Math.max(1, rpx * 0.07); g.beginPath(); g.ellipse(cx, cy, rpx * 0.74, ry * 0.74, 0, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(cx, cy + 0.7, rpx * 0.74, ry * 0.74, 0, Math.PI * 0.1, Math.PI * 0.8); g.stroke();
    if (rpx >= 7) {
      g.save(); g.translate(cx, cy); g.scale(1, ky); g.rotate([0, 0.38, -0.38, Math.PI + 0.2][k & 3]); var s = rpx * 0.34;
      g.fillStyle = rgba(S.mark, 0.62);
      if (S.emb === 'star') { starPath(g, 0, 0, s * 1.25, s * 0.55, 5); g.fill(); }
      else if (S.emb === 'cloud') { g.beginPath(); g.arc(-s * 0.55, s * 0.2, s * 0.5, 0, TAU); g.arc(0, -s * 0.15, s * 0.7, 0, TAU); g.arc(s * 0.55, s * 0.2, s * 0.5, 0, TAU); g.rect(-s * 0.55, s * 0.1, s * 1.1, s * 0.6); g.fill(); }
      else if (S.emb === 'bolt') { g.beginPath(); g.moveTo(s * 0.2, -s * 1.1); g.lineTo(-s * 0.7, s * 0.2); g.lineTo(-s * 0.05, s * 0.2); g.lineTo(-s * 0.25, s * 1.1); g.lineTo(s * 0.7, -s * 0.25); g.lineTo(s * 0.05, -s * 0.25); g.closePath(); g.fill(); }
      else if (S.emb === 'swirl') { g.strokeStyle = rgba(S.mark, 0.7); g.lineWidth = Math.max(1, s * 0.3); g.beginPath(); for (var a = 0; a < 9; a += 0.3) g.lineTo(Math.cos(a) * (0.1 + a * 0.1) * s * 1.2, Math.sin(a) * (0.1 + a * 0.1) * s * 1.2); g.stroke(); }
      else { heartPath(g, 0, 0, s); g.fill(); }
      g.restore();
    }
    var o = { c: c, ox: cx, oy: cy, w: w, h: h, th: thick }; coinCache[key] = o; coinN++; return o;
  }
  var shCache = {};
  function shadow(rpx) {
    rpx = Math.max(3, Math.round(rpx)); if (shCache[rpx]) return shCache[rpx];
    var ky = Math.sin(W.PITCH), w = Math.ceil(rpx * 2.6), h = Math.ceil(rpx * 2.6 * ky), c = mk(w, h), g = c.getContext('2d');
    g.translate(w / 2, h / 2); g.scale(1, ky); var gr = g.createRadialGradient(0, 0, rpx * 0.2, 0, 0, rpx * 1.25); gr.addColorStop(0, 'rgba(10,5,0,.42)'); gr.addColorStop(1, 'rgba(10,5,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rpx * 1.3, 0, TAU); g.fill();
    return (shCache[rpx] = { c: c, ox: w / 2, oy: h / 2 });
  }

  // ---------- the camera: a plain perspective view from the front and above, fitted to the box it is given
  function camera(w, h) {
    var P = W.PITCH, sp = Math.sin(P), cp = Math.cos(P), Dd = W.DIST, T = [0, 0.8, -0.4], C = [0, T[1] + Dd * sp, T[2] + Dd * cp];
    function raw(x, y, z) { var vy = y - C[1], vz = z - C[2]; var zc = -vy * sp - vz * cp, yc = vy * cp - vz * sp; return [x / zc, yc / zc, 1 / zc]; }
    var fitPts = [[-(W.HX + W.PW), W.MQ1 + 0.2, W.ZB - 0.6], [W.HX + W.PW, W.MQ1 + 0.2, W.ZB - 0.6], [-(W.HX + W.PW), -2.7, W.ZE + 2.7], [W.HX + W.PW, -2.7, W.ZE + 2.7]];
    var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    fitPts.forEach(function (p) { var r = raw(p[0], p[1], p[2]); x0 = Math.min(x0, r[0]); x1 = Math.max(x1, r[0]); y0 = Math.min(y0, r[1]); y1 = Math.max(y1, r[1]); });
    var m = Math.max(6, Math.min(w, h) * 0.015);
    var F = Math.min((w - 2 * m) / (x1 - x0), (h - 2 * m) / (y1 - y0));
    var cx = w / 2 - F * (x0 + x1) / 2, cy = h / 2 + F * (y0 + y1) / 2;
    var cam = { w: w, h: h, F: F, cx: cx, cy: cy,
      project: function (x, y, z) { var r = raw(x, y, z); return [cx + F * r[0], cy - F * r[1], F * r[2]]; },
      // the world x under a screen x, on the plane at the drop slot (for aiming)
      worldX: function (sx) { var r = raw(0, W.SLOT_Y, W.SLOT_Z); return (sx - cx) / (F * r[2]); },
      scaleAt: function (y, z) { return F * raw(0, y, z)[2]; }
    };
    return cam;
  }

  // ---------- the cabinet. paintBack: the room, the back wall, the marquee box, the deck. paintFront: the lip, the tray, the glass.
  function seeded(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function quad(g, cam, a, b, c, d, fill, stroke) {
    var pa = cam.project(a[0], a[1], a[2]), pb = cam.project(b[0], b[1], b[2]), pc = cam.project(c[0], c[1], c[2]), pd = cam.project(d[0], d[1], d[2]);
    g.beginPath(); g.moveTo(pa[0], pa[1]); g.lineTo(pb[0], pb[1]); g.lineTo(pc[0], pc[1]); g.lineTo(pd[0], pd[1]); g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.stroke(); }
    return [pa, pb, pc, pd];
  }
  function lin(g, p0, p1, stops) { var gr = g.createLinearGradient(p0[0], p0[1], p1[0], p1[1]); stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); }); return gr; }
  function woodGrain(g, rnd, x, y, w, h, base, a) {   // soft, long grain lines across a box on screen
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    for (var i = 0; i < Math.max(6, h / 7); i++) { var yy = y + rnd() * h; g.strokeStyle = rnd() < 0.5 ? 'rgba(30,12,4,' + (a * 0.6) + ')' : 'rgba(255,220,170,' + (a * 0.5) + ')'; g.lineWidth = 0.6 + rnd() * 1.6; g.beginPath(); g.moveTo(x, yy); g.bezierCurveTo(x + w * 0.3, yy + (rnd() - 0.5) * 5, x + w * 0.7, yy + (rnd() - 0.5) * 5, x + w, yy + (rnd() - 0.5) * 3); g.stroke(); }
    g.restore();
  }
  // the look for the day or the night: the wood and felt go a little deeper after dark
  function pal(theme, dark) {
    var T0 = THEMES[theme] || THEMES.walnut; if (!dark) return T0;
    var o = {}; for (var k in T0) o[k] = T0[k]; o.wood = [dk(T0.wood[0], 0.3), dk(T0.wood[1], 0.32)]; o.felt = [dk(T0.felt[0], 0.2), dk(T0.felt[1], 0.24)]; o.sign = [dk(T0.sign[0], 0.1), dk(T0.sign[1], 0.1)]; return o;
  }
  function paintBack(g, cam, theme, dark) {
    var TH = pal(theme, dark), w = cam.w, h = cam.h, rnd = seeded(7), HX = W.HX, ZB = W.ZB, ZE = W.ZE, P = cam.project;
    // the room
    var bgG = g.createLinearGradient(0, 0, 0, h);
    if (dark) { bgG.addColorStop(0, '#2A2040'); bgG.addColorStop(0.55, '#1C162B'); bgG.addColorStop(1, '#120E1C'); } else { bgG.addColorStop(0, '#FBEBD0'); bgG.addColorStop(0.6, '#F3DDB6'); bgG.addColorStop(1, '#E6C795'); }
    g.fillStyle = bgG; g.fillRect(0, 0, w, h);
    for (var i = 0; i < 16; i++) { var bx = rnd() * w, by = rnd() * h, br = (0.05 + rnd() * 0.09) * Math.min(w, h) * 1.2, ba = dark ? 0.1 + rnd() * 0.12 : 0.18 + rnd() * 0.18; var cols = dark ? ['#FFC46B', '#F29AB8', '#8FA8FF', '#FFE7A0'] : ['#FFFFFF', '#FFE3B0', '#FFC9A8', '#FFF4D8']; var bg2 = g.createRadialGradient(bx, by, br * 0.2, bx, by, br); bg2.addColorStop(0, rgba(cols[i % 4], ba)); bg2.addColorStop(0.8, rgba(cols[i % 4], ba * 0.8)); bg2.addColorStop(1, rgba(cols[i % 4], 0)); g.fillStyle = bg2; g.beginPath(); g.arc(bx, by, br, 0, TAU); g.fill(); }
    var wallA = dark ? TH.nightWall : TH.wall;
    // the cabinet's rear box and the back wall
    var wall = quad(g, cam, [-HX, 0, ZB], [HX, 0, ZB], [HX, W.WALL, ZB], [-HX, W.WALL, ZB], lin(g, P(0, W.WALL, ZB), P(0, 0, ZB), [[0, wallA[0]], [1, wallA[1]]]));
    // faint hearts and dots on the wall
    g.save(); g.beginPath(); g.moveTo(wall[0][0], wall[0][1]); g.lineTo(wall[1][0], wall[1][1]); g.lineTo(wall[2][0], wall[2][1]); g.lineTo(wall[3][0], wall[3][1]); g.closePath(); g.clip();
    for (var r = 0; r < 5; r++) for (var c = 0; c < 9; c++) { var wx = -HX + 0.5 + c * 1.0 + (r % 2) * 0.5, wy = 0.6 + r * 0.8, pp = P(wx, wy, ZB); g.fillStyle = dark ? 'rgba(255,230,180,.06)' : 'rgba(150,90,40,.07)'; if ((r + c) % 3 === 0) heartPath(g, pp[0], pp[1], pp[2] * 0.14); else { g.beginPath(); g.arc(pp[0], pp[1], pp[2] * 0.06, 0, TAU); } g.fill(); }
    var hp = P(0, 1.55, ZB); g.save(); g.translate(hp[0], hp[1]); g.scale(1, 0.62); g.fillStyle = dark ? 'rgba(255,200,150,.11)' : 'rgba(226,85,106,.16)'; heartPath(g, 0, 0, hp[2] * 1.15); g.fill(); g.strokeStyle = dark ? 'rgba(233,196,111,.4)' : 'rgba(185,132,40,.5)'; g.lineWidth = Math.max(2, hp[2] * 0.07); g.stroke(); g.restore();
    [[-2.6, 2.6], [2.6, 2.6], [-3.1, 1.0], [3.1, 1.0]].forEach(function (q, i) { var sp = P(q[0], q[1], ZB); g.fillStyle = dark ? 'rgba(255,240,190,.5)' : 'rgba(185,132,40,.3)'; starPath(g, sp[0], sp[1], sp[2] * (i < 2 ? 0.2 : 0.14), sp[2] * 0.08, 5); g.fill(); });
    var shade = g.createLinearGradient(0, wall[3][1], 0, wall[0][1] + (wall[0][1] - wall[3][1]) * 0.1); shade.addColorStop(0, 'rgba(30,10,0,.22)'); shade.addColorStop(0.35, 'rgba(30,10,0,0)'); g.fillStyle = shade; g.fillRect(0, wall[3][1], w, wall[0][1] - wall[3][1] + 20);
    g.restore();
    // the pillars (outer wood), back to front: inner face, then top, then front
    [-1, 1].forEach(function (sd) {
      var xi = sd * HX, xo = sd * (HX + W.PW), zb = ZB - 0.5, zf = ZE + 0.35, top = W.PILLAR;
      var inner = quad(g, cam, [xi, 0, zb], [xi, 0, zf], [xi, top, zf], [xi, top, zb], lin(g, P(xi, 3, zb), P(xi, 3, zf), [[0, dk(TH.wood[1], 0.35)], [1, TH.wood[1]]]));
      quad(g, cam, [xi, top, zb], [xi, top, zf], [xo, top, zf], [xo, top, zb], lin(g, P(xi, top, zb), P(xo, top, zf), [[0, lt(TH.wood[0], 0.25)], [1, TH.wood[0]]]));
      var fr = quad(g, cam, [xi, 0, zf], [xo, 0, zf], [xo, top, zf], [xi, top, zf], lin(g, P(xi, 0, zf), P(xi, top, zf), [[0, TH.wood[1]], [1, TH.wood[0]]]));
      woodGrain(g, rnd, Math.min(fr[0][0], fr[1][0]), fr[2][1], Math.abs(fr[1][0] - fr[0][0]), fr[0][1] - fr[2][1], TH.wood[0], 0.35);
      // brass trim up the inside edge, and a row of studs
      var t0 = P(xi, 0.05, zf), t1 = P(xi, top, zf); g.strokeStyle = TH.trim; g.lineWidth = Math.max(2, t0[2] * 0.09); g.beginPath(); g.moveTo(t0[0], t0[1]); g.lineTo(t1[0], t1[1]); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(t0[0] - sd, t0[1]); g.lineTo(t1[0] - sd, t1[1]); g.stroke();
      for (var k = 0; k < 6; k++) { var sp = P(sd * (HX + W.PW * 0.5), 0.6 + k * 0.85, zf); var sg = g.createRadialGradient(sp[0] - 1, sp[1] - 1, 0.5, sp[0], sp[1], sp[2] * 0.12); sg.addColorStop(0, lt(TH.trim, 0.6)); sg.addColorStop(1, dk(TH.trim, 0.3)); g.fillStyle = sg; g.beginPath(); g.arc(sp[0], sp[1], Math.max(1.5, sp[2] * 0.1), 0, TAU); g.fill(); }
      // a soft shadow where the wall meets the deck
      var s0 = P(xi, 0, ZB), s1 = P(xi, 0, ZE), sg2 = g.createLinearGradient(sd < 0 ? s0[0] : s0[0] - 24, 0, sd < 0 ? s0[0] + 24 : s0[0], 0); sg2.addColorStop(sd < 0 ? 0 : 1, 'rgba(0,0,0,.3)'); sg2.addColorStop(sd < 0 ? 1 : 0, 'rgba(0,0,0,0)'); g.fillStyle = sg2; g.beginPath(); g.moveTo(s0[0], s0[1]); g.lineTo(s1[0], s1[1]); g.lineTo(s1[0] + sd * -26, s1[1]); g.lineTo(s0[0] + sd * -14, s0[1]); g.closePath(); g.fill();
    });
    // the deck: felt, with a soft pattern and lanes painted near the lip
    var deck = quad(g, cam, [-HX, 0, ZB], [HX, 0, ZB], [HX, 0, ZE], [-HX, 0, ZE], lin(g, P(0, 0, ZB), P(0, 0, ZE), [[0, dk(TH.felt[1], 0.2)], [0.5, TH.felt[1]], [1, TH.felt[0]]]));
    g.save(); g.beginPath(); g.moveTo(deck[0][0], deck[0][1]); g.lineTo(deck[1][0], deck[1][1]); g.lineTo(deck[2][0], deck[2][1]); g.lineTo(deck[3][0], deck[3][1]); g.closePath(); g.clip();
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1; for (var zz = ZB; zz <= ZE; zz += 1.0) { var a1 = P(-HX, 0, zz), a2 = P(HX, 0, zz); g.beginPath(); g.moveTo(a1[0], a1[1]); g.lineTo(a2[0], a2[1]); g.stroke(); }
    for (var xx = -HX; xx <= HX + 0.01; xx += 1.05) { var b1 = P(xx, 0, ZB), b2 = P(xx, 0, ZE); g.beginPath(); g.moveTo(b1[0], b1[1]); g.lineTo(b2[0], b2[1]); g.stroke(); }
    for (var n = 0; n < 700; n++) { var fx = -HX + rnd() * 2 * HX, fz = ZB + rnd() * (ZE - ZB), fp = P(fx, 0, fz); g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.06)'; g.fillRect(fp[0], fp[1], 1.3, 1.3); }
    // the two bonus lanes at the lip
    [[-HX, -HX * 0.5, 'rgba(150,170,255,.20)', 'SLEEPY CORNER'], [HX * 0.5, HX, 'rgba(255,190,120,.22)', 'BOUNCY ZONE']].forEach(function (L) {
      quad(g, cam, [L[0], 0, ZE - 2.2], [L[1], 0, ZE - 2.2], [L[1], 0, ZE], [L[0], 0, ZE], L[2]);
      var m0 = P((L[0] + L[1]) / 2, 0, ZE - 0.45); g.save(); g.translate(m0[0], m0[1]); g.scale(1, Math.sin(W.PITCH)); g.fillStyle = dark ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.65)'; g.font = '700 ' + Math.max(7, m0[2] * 0.2) + 'px "IBM Plex Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(L[3], 0, 0); g.restore();
      g.strokeStyle = 'rgba(255,255,255,.28)'; g.setLineDash([4, 4]); var d0 = P(L[0] === -HX ? L[1] : L[0], 0, ZE - 2.2), d1 = P(L[0] === -HX ? L[1] : L[0], 0, ZE); g.beginPath(); g.moveTo(d0[0], d0[1]); g.lineTo(d1[0], d1[1]); g.stroke(); g.setLineDash([]);
    });
    // inner shadow along the back wall
    var bs = g.createLinearGradient(0, P(0, 0, ZB)[1], 0, P(0, 0, ZB + 2.5)[1]); bs.addColorStop(0, 'rgba(0,0,0,.35)'); bs.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = bs; g.fillRect(0, P(0, 0, ZB)[1], w, P(0, 0, ZB + 2.5)[1] - P(0, 0, ZB)[1]);
    g.restore();
    var lc = P(0, W.MQ0, ZB + 0.2), lg = g.createRadialGradient(lc[0], lc[1], 0, lc[0], lc[1] + lc[2] * 1.2, lc[2] * 4.6); lg.addColorStop(0, rgba(TH.glow, dark ? 0.42 : 0.34)); lg.addColorStop(1, rgba(TH.glow, 0)); g.fillStyle = lg; g.fillRect(0, lc[1], w, lc[2] * 5);
    // the marquee box across the top, with its brass frame (the sign and the bulbs are drawn live)
    var mq = quad(g, cam, [-HX - W.PW, W.MQ0, ZB + 0.9], [HX + W.PW, W.MQ0, ZB + 0.9], [HX + W.PW, W.MQ1, ZB + 0.9], [-HX - W.PW, W.MQ1, ZB + 0.9], lin(g, P(0, W.MQ1, ZB), P(0, W.MQ0, ZB), [[0, lt(TH.wood[0], 0.2)], [1, TH.wood[1]]]));
    quad(g, cam, [-HX - W.PW, W.MQ1, ZB + 0.9], [HX + W.PW, W.MQ1, ZB + 0.9], [HX + W.PW, W.MQ1, ZB - 0.5], [-HX - W.PW, W.MQ1, ZB - 0.5], lin(g, P(0, W.MQ1, ZB + 0.9), P(0, W.MQ1, ZB - 0.5), [[0, lt(TH.wood[0], 0.3)], [1, TH.wood[0]]]));
    quad(g, cam, [-HX - W.PW, W.MQ0, ZB + 0.9], [HX + W.PW, W.MQ0, ZB + 0.9], [HX + W.PW, W.MQ0, ZB + 0.3], [-HX - W.PW, W.MQ0, ZB + 0.3], 'rgba(0,0,0,.4)');
    woodGrain(g, rnd, mq[0][0], mq[2][1], mq[1][0] - mq[0][0], mq[0][1] - mq[2][1], TH.wood[0], 0.3);
    // the drop rail: a brass bar with a slot, where the coin goes in
    var r0 = P(-HX, W.SLOT_Y + 0.3, W.SLOT_Z - 0.35), r1 = P(HX, W.SLOT_Y + 0.3, W.SLOT_Z - 0.35); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = Math.max(5, r0[2] * 0.3); g.lineCap = 'round'; g.beginPath(); g.moveTo(r0[0] + 3, r0[1] + 3); g.lineTo(r1[0] - 3, r1[1] + 3); g.stroke();
    g.strokeStyle = lin(g, [r0[0], r0[1] - 4], [r0[0], r0[1] + 6], [[0, lt(TH.trim, 0.55)], [0.5, TH.trim], [1, dk(TH.trim, 0.35)]]); g.lineWidth = Math.max(4, r0[2] * 0.22); g.beginPath(); g.moveTo(r0[0] + 3, r0[1]); g.lineTo(r1[0] - 3, r1[1]); g.stroke();
    g.fillStyle = '#2A1810'; g.beginPath(); g.ellipse((r0[0] + r1[0]) / 2, r0[1], (r1[0] - r0[0]) * 0.46, Math.max(1.4, r0[2] * 0.05), 0, 0, TAU); g.fill();
    return { sign: { tl: P(-HX - W.PW * 0.5, W.MQ1 - 0.28, ZB + 0.92), tr: P(HX + W.PW * 0.5, W.MQ1 - 0.28, ZB + 0.92), bl: P(-HX - W.PW * 0.5, W.MQ0 + 0.28, ZB + 0.92), br: P(HX + W.PW * 0.5, W.MQ0 + 0.28, ZB + 0.92) } };
  }
  function paintFront(g, cam, theme, dark) {
    var TH = pal(theme, dark), w = cam.w, h = cam.h, HX = W.HX, ZB = W.ZB, ZE = W.ZE, P = cam.project, rnd = seeded(21);
    // the lip and the drop-off into the tray
    var lip = quad(g, cam, [-HX, 0.0, ZE], [HX, 0.0, ZE], [HX, -0.2, ZE + 0.35], [-HX, -0.2, ZE + 0.35], lin(g, P(0, 0, ZE), P(0, -0.2, ZE + 0.35), [[0, lt(TH.trim, 0.6)], [1, dk(TH.trim, 0.2)]]));
    quad(g, cam, [-HX, -0.2, ZE + 0.35], [HX, -0.2, ZE + 0.35], [HX, -1.55, ZE + 0.35], [-HX, -1.55, ZE + 0.35], lin(g, P(0, -0.2, ZE), P(0, -1.55, ZE), [[0, 'rgba(0,0,0,.55)'], [1, 'rgba(0,0,0,.85)']]));
    // the tray floor behind a brass rail, in three bins (the lanes at the sides)
    var tray = quad(g, cam, [-HX, -1.55, ZE + 0.35], [HX, -1.55, ZE + 0.35], [HX, -1.55, ZE + 2.7], [-HX, -1.55, ZE + 2.7], lin(g, P(0, -1.55, ZE + 0.35), P(0, -1.55, ZE + 2.7), [[0, dk(TH.wood[1], 0.45)], [1, dk(TH.wood[1], 0.1)]]));
    var lanesX = [-HX * 0.5, HX * 0.5]; lanesX.forEach(function (lx) { quad(g, cam, [lx - 0.06, -1.55, ZE + 0.35], [lx + 0.06, -1.55, ZE + 0.35], [lx + 0.06, -0.35, ZE + 0.35], [lx - 0.06, -0.35, ZE + 0.35], lin(g, P(lx, -1.55, ZE), P(lx, -0.3, ZE), [[0, dk(TH.trim, 0.3)], [1, lt(TH.trim, 0.3)]])); });
    return { tray: tray, bins: [[-HX, lanesX[0]], [lanesX[0], lanesX[1]], [lanesX[1], HX]] };
  }
  // the front cabinet, glass and bezel: drawn over the coins (the tray pile is drawn between paintFront and this)
  function paintGlass(g, cam, theme, dark) {
    var TH = pal(theme, dark), w = cam.w, h = cam.h, HX = W.HX, ZB = W.ZB, ZE = W.ZE, P = cam.project, rnd = seeded(33);
    var front = quad(g, cam, [-HX - W.PW, -1.55, ZE + 2.7], [HX + W.PW, -1.55, ZE + 2.7], [HX + W.PW, -2.7, ZE + 2.7], [-HX - W.PW, -2.7, ZE + 2.7], lin(g, P(0, -1.55, ZE), P(0, -2.7, ZE), [[0, TH.wood[0]], [1, TH.wood[1]]]));
    var rim = quad(g, cam, [-HX - W.PW, -1.1, ZE + 2.7], [HX + W.PW, -1.1, ZE + 2.7], [HX + W.PW, -1.55, ZE + 2.7], [-HX - W.PW, -1.55, ZE + 2.7], lin(g, P(0, -1.1, ZE), P(0, -1.55, ZE), [[0, lt(TH.trim, 0.55)], [0.5, TH.trim], [1, dk(TH.trim, 0.3)]]));
    woodGrain(g, rnd, front[0][0], front[0][1], front[1][0] - front[0][0], front[3][1] - front[0][1], TH.wood[0], 0.3);
    var pl = P(0, -2.1, ZE + 2.7); g.fillStyle = lin(g, [pl[0], pl[1] - 12], [pl[0], pl[1] + 12], [[0, lt(TH.trim, 0.5)], [1, dk(TH.trim, 0.2)]]); var pw = pl[2] * 2.8, ph = pl[2] * 0.62; rrect(g, pl[0] - pw / 2, pl[1] - ph / 2, pw, ph, ph * 0.3); g.fill(); g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1; g.stroke();
    g.fillStyle = 'rgba(60,30,10,.75)'; g.font = '600 ' + Math.max(8, ph * 0.42) + 'px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Kindness Coin Pusher', pl[0], pl[1] + 1);
    // the glass over the window: a soft sheen and two streaks
    var a = P(-HX, W.WALL, ZB), b = P(HX, W.WALL, ZB), c = P(HX, -0.1, ZE), d = P(-HX, -0.1, ZE);
    g.save(); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.clip();
    var sh = g.createLinearGradient(0, a[1], 0, d[1]); sh.addColorStop(0, 'rgba(255,255,255,.16)'); sh.addColorStop(0.3, 'rgba(255,255,255,.03)'); sh.addColorStop(0.75, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(255,255,255,.07)'); g.fillStyle = sh; g.fillRect(a[0], a[1], b[0] - a[0], d[1] - a[1]);
    var span = b[0] - a[0], hh = d[1] - a[1];
    [[0.18, 0.1, 0.07], [0.5, 0.045, 0.045], [0.78, 0.03, 0.05]].forEach(function (s) { var x0 = a[0] + span * s[0]; g.fillStyle = 'rgba(255,255,255,' + s[2] + ')'; g.beginPath(); g.moveTo(x0, a[1]); g.lineTo(x0 + span * s[1], a[1]); g.lineTo(x0 + span * s[1] - hh * 0.32, d[1]); g.lineTo(x0 - hh * 0.32, d[1]); g.closePath(); g.fill(); });
    var vg = g.createRadialGradient((a[0] + b[0]) / 2, (a[1] + d[1]) / 2, span * 0.2, (a[0] + b[0]) / 2, (a[1] + d[1]) / 2, span * 0.95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.22)'); g.fillStyle = vg; g.fillRect(a[0], a[1], span, hh);
    g.restore();
  }

  window.TOLCoinArt = { W: W, SETS: SETS, ITEMS: ITEMS, byId: byId, THEMES: THEMES, SKINS: SKINS, KINDS: KINDS, MARQUEE: MARQUEE, figure: figure, silhouette: silhouette, coin: coin, shadow: shadow, camera: camera, pal: pal, paintBack: paintBack, paintFront: paintFront, paintGlass: paintGlass, mix: mix, lt: lt, dk: dk, rgba: rgba, mk: mk, heartPath: heartPath, starPath: starPath };
})();
