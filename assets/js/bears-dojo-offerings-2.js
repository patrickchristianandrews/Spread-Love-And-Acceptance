/* bears-dojo-offerings-2.js — more calm offerings for The Bears Dojo:
   feed a koi, a gratitude bell, a haiku maker, a small kind act to pass on, a stretch of the moment,
   a tidy-up that cannot fail, a little bonsai, wind chimes and a single brush circle (ensō).
   All of them are optional, untimed, safe for all ages and stay on this device. */
(function () {
  'use strict';
  var BD = window.BearsDojo; if (!BD) return;
  var U = BD.util, rand = U.rand, pick = U.pick, shuffle = U.shuffle, esc = U.esc, clamp = U.clamp, $ = U.$;
  var uid = 0, TAU = Math.PI * 2;
  function not() { return 'Turn Sound on (top of the page) to hear it.'; }
  function svgPt(svg, e) { var r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal; return [(e.clientX - r.left) / r.width * vb.width, (e.clientY - r.top) / r.height * vb.height]; }

  // ---------- 9. feed a koi, one crumb at a time ----------
  var KOI = [['#F08A4B', '#FFF1E0', 'orange'], ['#EFEAE0', '#F08A4B', 'white and orange'], ['#D8503A', '#F7D9A0', 'red']];
  BD.offer({ id: 'koi', kind: 'Feed', title: 'Feed a koi', mount: function (host, api) {
    host.innerHTML = '<p class="od-note">Offer a crumb: press the button, or tap the water where you would like it to land. Only one at a time, so each koi gets its moment.</p>' +
      '<svg class="od-pond" viewBox="0 0 400 240" role="img" aria-label="A small pond with three koi swimming slowly"><defs><radialGradient id="od-pg" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#8FC6D2"/><stop offset="1" stop-color="#3F7C90"/></radialGradient></defs>' +
      '<rect width="400" height="240" fill="url(#od-pg)"/><g fill="#5E9A5A" opacity=".9"><ellipse cx="60" cy="50" rx="22" ry="9"/><ellipse cx="338" cy="196" rx="26" ry="10"/><ellipse cx="350" cy="52" rx="16" ry="7"/></g><circle cx="62" cy="47" r="4" fill="#F3B6C4"/><circle cx="341" cy="193" r="4" fill="#F3B6C4"/>' +
      '<g id="od-koig"></g><g id="od-ripg"></g><circle id="od-crumb" r="3.2" fill="#EAD4A4" stroke="#B89B62" stroke-width=".8" visibility="hidden"/></svg>' +
      '<div class="od-row"><button type="button" class="bd-go" id="od-feed">Offer a crumb</button></div><p class="od-note od-say" aria-live="polite"></p>';
    var svg = $('.od-pond', host), kg = $('#od-koig', host), rg = $('#od-ripg', host), crumb = $('#od-crumb', host), btn = $('#od-feed', host), say = $('.od-say', host), koi = [], cr = null, cool = false;
    KOI.forEach(function (k, i) {
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.innerHTML = '<path d="M-17 0 C-27 -6 -32 -4 -35 -10 C-32 0 -32 0 -35 10 C-32 4 -27 6 -17 0Z" fill="' + k[0] + '" opacity=".85"/><ellipse cx="0" cy="0" rx="19" ry="7" fill="' + k[0] + '"/><ellipse cx="-3" cy="-1.5" rx="9" ry="3.6" fill="' + k[1] + '" opacity=".85"/><path d="M2 -6 q4 -6 9 -5 M2 6 q4 6 9 5" stroke="' + k[0] + '" stroke-width="2" fill="none" opacity=".7"/><circle cx="13" cy="-2.2" r="1.1" fill="#2B2620"/><circle cx="13" cy="2.2" r="1.1" fill="#2B2620"/>';
      kg.appendChild(g); koi.push({ g: g, x: 70 + i * 110, y: 60 + i * 55, a: rand(628) / 100, tx: 0, ty: 0, name: k[2], v: 0 }); newTarget(koi[i]);
    });
    function newTarget(k) { k.tx = 40 + rand(320); k.ty = 36 + rand(170); }
    function place(k) { k.g.setAttribute('transform', 'translate(' + k.x.toFixed(1) + ' ' + k.y.toFixed(1) + ') rotate(' + (k.a * 180 / Math.PI).toFixed(1) + ')'); }
    koi.forEach(place);
    function ripple(x, y) { var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 14); c.setAttribute('class', 'od-rip'); rg.appendChild(c); setTimeout(function () { c.remove(); }, api.still() ? 1600 : 2800); }
    function drop(x, y) {
      if (cr || cool) { say.textContent = 'One crumb at a time. Let this one be found first.'; return; }
      cr = { x: clamp(x, 20, 380), y: clamp(y, 20, 220) }; crumb.setAttribute('cx', cr.x); crumb.setAttribute('cy', cr.y); crumb.setAttribute('visibility', 'visible'); btn.setAttribute('aria-disabled', 'true'); btn.classList.add('is-wait');
      say.textContent = 'A crumb floats on the water.'; ripple(cr.x, cr.y); api.audio.plop();
      if (api.still()) api.later(function () { var k = nearest(); k.x = cr.x - 10; k.y = cr.y; eat(k); place(k); }, 900);
    }
    function nearest() { var b = null, bd = 1e9; koi.forEach(function (k) { var d = Math.hypot(k.x - cr.x, k.y - cr.y); if (d < bd) { bd = d; b = k; } }); return b; }
    function eat(k) {
      ripple(cr.x, cr.y); crumb.setAttribute('visibility', 'hidden'); cr = null; cool = true; k.fed = true; newTarget(k);
      say.textContent = 'The ' + k.name + ' koi came up for it, gently.'; if (!api.audio.plop()) {}
      api.later(function () { cool = false; btn.removeAttribute('aria-disabled'); btn.classList.remove('is-wait'); }, api.still() ? 800 : 2200);
    }
    btn.addEventListener('click', function () { drop(60 + rand(280), 50 + rand(140)); });
    api.on(svg, 'pointerdown', function (e) { var p = svgPt(svg, e); drop(p[0], p[1]); });
    api.frames(function (dt) {
      if (api.still()) return; var s = dt / 1000, chaser = cr ? nearest() : null;
      koi.forEach(function (k) {
        var tx = k === chaser ? cr.x : k.tx, ty = k === chaser ? cr.y : k.ty, want = Math.atan2(ty - k.y, tx - k.x), diff = Math.atan2(Math.sin(want - k.a), Math.cos(want - k.a)), sp = k === chaser ? 34 : 15 + (koi.indexOf(k) * 3);
        k.a += clamp(diff, -1.3 * s, 1.3 * s); k.x += Math.cos(k.a) * sp * s; k.y += Math.sin(k.a) * sp * s + Math.sin(performance.now() / 700 + k.x) * 0.05;
        if (Math.hypot(tx - k.x, ty - k.y) < 12) { if (k === chaser) eat(k); else newTarget(k); }
        if (k.x < 10 || k.x > 390 || k.y < 10 || k.y > 230) { k.x = clamp(k.x, 10, 390); k.y = clamp(k.y, 10, 230); newTarget(k); }
        place(k);
      });
    });
  } });

  // ---------- 10. gratitude bell ----------
  BD.offer({ id: 'bell', kind: 'Appreciate', title: 'The gratitude bell', mount: function (host, api) {
    host.innerHTML = '<p class="od-note">Type one small thing you are grateful for, then ring the bell. It chimes and floats away. It is not saved unless you choose to keep it.</p>' +
      '<div class="od-bellrow"><svg class="od-bellsvg" viewBox="0 0 80 100" aria-hidden="true"><rect x="8" y="4" width="64" height="7" rx="3" fill="#8A5233"/><g class="bellswing" id="od-bellg"><path d="M40 11v10" stroke="#8A5233" stroke-width="3"/><path d="M20 70c0-22 6-40 20-40s20 18 20 40z" fill="#C79A52"/><ellipse cx="40" cy="70" rx="23" ry="5" fill="#A97C36"/><path d="M28 44c-1 10-1 18-2 22" stroke="#FFF1C9" stroke-width="2.4" fill="none" opacity=".55" stroke-linecap="round"/><circle cx="40" cy="78" r="4.4" fill="#6E4B14"/></g></svg><div class="od-floatbox" aria-hidden="true"></div></div>' +
      '<form class="od-form"><label class="sr-only" for="od-gt">One small thing you are grateful for</label><input id="od-gt" class="bd-text" type="text" maxlength="80" autocomplete="off" placeholder="I am grateful for…"><button class="bd-go" type="submit">Ring the bell</button></form>' +
      '<div class="od-keep" hidden><p class="od-note od-said"></p><div class="od-row"><button type="button" class="bd-pill" id="od-keepit">Keep this one on this device</button></div></div>' +
      '<details class="od-kept"><summary>Thoughts I have kept (<span class="od-n">0</span>)</summary><ul class="od-keptl"></ul><div class="od-row"><button type="button" class="bd-pill" id="od-clr">Let them all go</button></div></details><p class="od-note od-say" aria-live="polite"></p>';
    var form = $('form', host), inp = $('input', host), fb = $('.od-floatbox', host), keep = $('.od-keep', host), said = $('.od-said', host), list = $('.od-keptl', host), nEl = $('.od-n', host), say = $('.od-say', host), last = '';
    function load() { try { var a = JSON.parse(api.store.get('gratitude')); return Array.isArray(a) ? a.filter(function (x) { return typeof x === 'string'; }).slice(0, 40) : []; } catch (e) { return []; } }
    function save(a) { api.store.set('gratitude', JSON.stringify(a)); }
    function paint() {
      var a = load(); nEl.textContent = a.length; list.innerHTML = '';
      a.forEach(function (t, i) { var li = document.createElement('li'); li.innerHTML = '<span>' + esc(t) + '</span><button type="button" class="od-x" aria-label="Let go of: ' + esc(t) + '">&times;</button>'; li.querySelector('button').addEventListener('click', function () { var b = load(); b.splice(i, 1); save(b); paint(); say.textContent = 'Let go.'; }); list.appendChild(li); });
      $('#od-clr', host).hidden = !a.length;
    }
    inp.addEventListener('input', function () { api.busy(inp.value.length > 0); });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); var t = inp.value.trim(); last = t; inp.value = ''; api.busy(false);
      var g = $('#od-bellg', host); g.classList.remove('is-ring'); void g.getBoundingClientRect(); g.classList.add('is-ring');
      var ok = api.audio.chime(api.audio.note(3 + rand(5)) , 0.18);
      if (t) { var p = document.createElement('p'); p.className = 'od-float'; p.textContent = t; fb.appendChild(p); var gone = function () { p.remove(); }; p.addEventListener('animationend', gone); api.later(gone, api.still() ? 7000 : 9000); }
      keep.hidden = !t; said.textContent = t ? 'It floated away. If you would like to remember it, you can keep it.' : '';
      say.textContent = t ? (ok ? 'The bell rings, and your thought floats off.' : 'Your thought floats off. ' + not()) : (ok ? 'Just the bell.' : 'The bell sways. ' + not());
    });
    $('#od-keepit', host).addEventListener('click', function () { if (!last) return; var a = load(); a.unshift(last); save(a.slice(0, 40)); last = ''; keep.hidden = true; say.textContent = 'Kept, on this device only. You can let it go any time below.'; paint(); });
    $('#od-clr', host).addEventListener('click', function () { save([]); paint(); say.textContent = 'All let go.'; });
    paint();
  } });

  // ---------- 11. a haiku maker ----------
  var FIVE = ['Morning light arrives', 'The old stone is warm', 'A slow breath goes out', 'Rain on the soft leaves', 'Tea steam drifts upward', 'Moss on quiet steps', 'One small bell, then calm', 'The pond holds the sky', 'Wind through the bamboo', 'Soft snow, soft footsteps', 'Lanterns glow gently', 'Somewhere a friend waits', 'Warm light on the floor', 'Fog lifts from the hills', 'Two pups asleep here', 'Let the day settle'];
  var SEVEN = ['The koi circle slowly round', 'A single leaf finds the stream', 'Nothing here needs to be fixed', 'The fountain keeps its own time', 'Breathing in, I am right here', 'Bamboo bends and then returns', 'Small kindnesses ripple out', 'The garden forgives the rain', 'A lantern for someone far', 'Shoulders soften, jaw unclenched', 'Warm hands around a small cup', 'Even the stones are resting', 'Morning mist on the pine trees', 'You are welcome as you are', 'The bell hums long after sound', 'Slowly the whole sky turns gold'];
  BD.offer({ id: 'haiku', kind: 'Compose', title: 'A haiku for now', mount: function (host, api) {
    var pools = [FIVE, SEVEN, FIVE], lines = [], first = shuffle(FIVE);
    lines = [first[0], pick(SEVEN), first[1]];
    host.innerHTML = '<p class="od-note">Five syllables, seven, five. Tap any line to swap it for another that fits. Read it slowly, out loud or in your head.</p><div class="od-haiku" role="group" aria-label="Your haiku"></div><div class="od-row"><button type="button" class="bd-pill" id="od-hnew">A whole new haiku</button></div>';
    var box = $('.od-haiku', host);
    function paint(focusI) {
      box.innerHTML = '';
      lines.forEach(function (t, i) { var b = document.createElement('button'); b.type = 'button'; b.className = 'od-hline'; b.textContent = t; b.setAttribute('aria-label', 'Line ' + (i + 1) + ': ' + t + '. Press for a different line.'); b.addEventListener('click', function () { var o = pools[i].filter(function (x) { return lines.indexOf(x) < 0; }); lines[i] = pick(o); paint(i); api.say(lines.join('. ')); api.audio.pluck(api.audio.note(rand(9)), 0.12); }); box.appendChild(b); });
      if (focusI != null) box.children[focusI].focus({ preventScroll: true });
    }
    $('#od-hnew', host).addEventListener('click', function () { var f = shuffle(FIVE); lines = [f[0], pick(SEVEN), f[1]]; paint(); api.say(lines.join('. ')); });
    paint();
  } });

  // ---------- 12. pass it on: one small kind thing for today ----------
  var ACTS = ['Tell someone you live with one thing you appreciate about them.', 'Hold a door open for someone and smile.', 'Send a short thank-you to someone who helped you once.', 'Water a plant, or fill a bird’s water dish.', 'Let someone go first.', 'Leave a kind note where a friend will find it.', 'Ask someone how they are, then really listen to the answer.', 'Pick up one piece of litter on your way.', 'Make a warm drink for someone.', 'Say thank you to someone whose work you usually don’t notice.', 'Give a friend a sincere compliment.', 'Clear one thing from a shared table before anyone asks.', 'Share something you have plenty of: a snack, a book, a song.', 'Let one small annoyance go, just this once.', 'Speak to yourself once today the way you would speak to a friend.', 'Message someone you haven’t heard from in a while.', 'Give a pet or a loved one a little extra attention.', 'Tidy one small corner for someone else.', 'Smile at someone and mean it.', 'Tell someone one thing you like about them.', 'Let someone else choose, and enjoy their choice.', 'Write a kind word about something that helped you.', 'Offer to carry something for someone.', 'Say sorry first, if there is something small to be sorry for.', 'Thank a teacher, a helper or a neighbor.', 'Make space for someone, or save them a seat.', 'Wave to a neighbor.', 'Draw a tiny picture for someone.', 'Put your phone away for one whole conversation today.', 'Tell someone, “I’m glad you’re here.”'];
  var actBag = [];
  BD.offer({ id: 'pass', kind: 'Pass it on', title: 'One small kind thing', mount: function (host, api) {
    function show() {
      if (!actBag.length) actBag = shuffle(ACTS); var a = actBag.shift();
      host.innerHTML = '<div class="od-center"><p class="od-note">If it feels right, here is one small thing you could pass on today.</p><p class="od-quote od-act" tabindex="-1">' + esc(a) + '</p><div class="od-row"><button type="button" class="bd-go" id="od-try">I’ll try that</button><button type="button" class="bd-pill" id="od-other">Another idea</button></div><p class="od-note od-say" aria-live="polite"></p></div>';
      $('#od-try', host).addEventListener('click', function () { $('.od-say', host).textContent = pick(['Lovely. That is all it takes.', 'Thank you. The world is a little warmer for it.', 'Wonderful. Small things travel far.', 'Good. And if today is too full, another day works too.']); api.audio.chime(api.audio.note(4 + rand(4)), 0.12); });
      $('#od-other', host).addEventListener('click', function () { show(); var q = $('.od-act', host); q.focus({ preventScroll: true }); });
    }
    show();
  } });

  // ---------- 13. a stretch of the moment, with a little figure who goes first ----------
  var STRETCH = [
    { n: 'Reach up slowly', how: ['Breathe in as your arms float up.', 'Breathe out as they drift back down.', 'Go only as high as feels pleasant.'], f: [{ lu: -8, lf: -4, ru: 8, rf: 4 }, { lu: -170, lf: -176, ru: 170, rf: 176 }], t: ['Arms resting at your sides.', 'Arms reaching up, long and easy.'] },
    { n: 'A slow side lean', how: ['Arms up, lean gently to one side, then the other.', 'Keep your breath easy and your shoulders loose.', 'Come back to the middle between sides.'], f: [{ lu: -168, lf: -174, ru: 168, rf: 174, lean: 0 }, { lu: -142, lf: -128, ru: 152, rf: 120, lean: 16 }, { lu: -168, lf: -174, ru: 168, rf: 174, lean: 0 }, { lu: -152, lf: -120, ru: 142, rf: 128, lean: -16 }], t: ['Standing tall, arms up.', 'Leaning gently to your right.', 'Back to the middle.', 'Leaning gently to your left.'] },
    { n: 'Shoulder roll', how: ['Lift your shoulders up toward your ears.', 'Let them roll back and drop down.', 'Do it as slowly as a sigh.'], f: [{ sh: 0 }, { sh: 11, lu: -12, ru: 12 }, { sh: 0 }, { sh: -3 }], t: ['Shoulders resting.', 'Shoulders lifted.', 'Shoulders let go.', 'Shoulders soft and low.'] },
    { n: 'Gentle neck tilt', how: ['Let your head tilt toward one shoulder.', 'Stay for a breath or two.', 'Come back to center, then try the other side.'], f: [{ head: 0 }, { head: 20 }, { head: 0 }, { head: -20 }], t: ['Head in the middle.', 'Head resting toward your right.', 'Back to center.', 'Head resting toward your left.'] },
    { n: 'Open your chest', how: ['Let your arms open out to the sides.', 'Breathe in and feel your chest widen.', 'Breathe out and let them come back.'], f: [{ lu: -8, lf: -4, ru: 8, rf: 4 }, { lu: -88, lf: -96, ru: 88, rf: 96 }], t: ['Arms resting.', 'Arms open wide.'] },
    { n: 'Stand tall, rise a little', how: ['Imagine a string lifting the top of your head.', 'Roll up onto your toes if that feels good.', 'Float back down slowly.'], f: [{ up: 0, lu: -6, ru: 6 }, { up: 9, lu: -20, lf: -16, ru: 20, rf: 16 }], t: ['Feet flat, standing easy.', 'Taller, rising gently.'] }
  ];
  var stretchBag = [];
  BD.offer({ id: 'stretch', kind: 'Move', title: 'A stretch of the moment', mount: function (host, api) {
    if (!stretchBag.length) stretchBag = shuffle(STRETCH); var S = stretchBag.shift(), bear = api.bear();
    var D = { lean: 0, head: 0, lu: -8, lf: -4, ru: 8, rf: 4, sh: 0, up: 0 };
    function full(f) { var o = {}; for (var k in D) o[k] = f[k] != null ? f[k] : D[k]; return o; }
    var frames = S.f.map(full), idx = 0, from = frames[0], to = frames[0], prog = 1, playing = !api.still(), hold = 0;
    host.innerHTML = '<div class="od-stretch"><svg class="od-fig" viewBox="0 0 200 230" role="img" aria-label="A little bear figure showing the stretch"></svg><div><h4 class="od-h4">' + esc(S.n) + '</h4><ul class="od-how">' + S.how.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul><p class="od-note od-pos" aria-live="polite"></p><p class="od-note">Go only as far as feels comfortable. Skip this one if it doesn’t feel right today.</p><div class="od-row"><button type="button" class="bd-pill" id="od-nextpos">Next position</button><button type="button" class="bd-pill" id="od-play" aria-pressed="' + playing + '">Gentle motion: <b>' + (playing ? 'on' : 'off') + '</b></button></div></div></div>';
    var svg = $('.od-fig', host), pos = $('.od-pos', host);
    function L(x1, y1, x2, y2, c, w) { return '<path d="M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' L' + x2.toFixed(1) + ' ' + y2.toFixed(1) + '" stroke="' + c + '" stroke-width="' + w + '" stroke-linecap="round" fill="none"/>'; }
    function dir(a, len) { var r = a * Math.PI / 180; return [Math.sin(r) * len, Math.cos(r) * len]; }
    function draw(p) {
      var hx = 100, hy = 148 - p.up, lr = p.lean * Math.PI / 180, nx = hx + Math.sin(lr) * 52, ny = hy - Math.cos(lr) * 52, px = Math.cos(lr), py = Math.sin(lr);
      var slx = nx - px * 17, sly = ny - py * 17 - p.sh, srx = nx + px * 17, sry = ny + py * 17 - p.sh, fur = bear.fur, robe = bear.robe, s = '<line x1="20" y1="218" x2="180" y2="218" stroke="#B9AC86" stroke-width="3" stroke-linecap="round" opacity=".7"/>';
      [[-10, -3], [10, 3]].forEach(function (a, i) { var x0 = hx + (i ? 9 : -9), k = dir(a[0], 36), k2 = dir(a[1], 34); s += L(x0, hy, x0 + k[0], hy + k[1], fur, 9) + L(x0 + k[0], hy + k[1], x0 + k[0] + k2[0], hy + k[1] + k2[1], fur, 9) + '<ellipse cx="' + (x0 + k[0] + k2[0] + (i ? 5 : -5)).toFixed(1) + '" cy="' + (hy + k[1] + k2[1] + 2).toFixed(1) + '" rx="8" ry="4" fill="' + fur + '"/>'; });
      s += L(hx, hy, nx, ny - p.sh * 0.3, robe, 26);
      var ua = [[slx, sly, p.lu, p.lf], [srx, sry, p.ru, p.rf]];
      ua.forEach(function (a) { var e = dir(a[2], 29), w = dir(a[3], 27); s += L(a[0], a[1], a[0] + e[0], a[1] + e[1], fur, 8) + L(a[0] + e[0], a[1] + e[1], a[0] + e[0] + w[0], a[1] + e[1] + w[1], fur, 8) + '<circle cx="' + (a[0] + e[0] + w[0]).toFixed(1) + '" cy="' + (a[1] + e[1] + w[1]).toFixed(1) + '" r="5.2" fill="' + fur + '"/>'; });
      var ha = lr + p.head * Math.PI / 180, cx = nx + Math.sin(ha) * 17, cy = ny - Math.cos(ha) * 17 - p.sh * 0.5, deg = (ha * 180 / Math.PI).toFixed(1);
      s += '<g transform="translate(' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ') rotate(' + deg + ')"><circle cx="-14" cy="-12" r="7" fill="' + fur + '"/><circle cx="14" cy="-12" r="7" fill="' + fur + '"/><circle r="17" fill="' + fur + '"/><ellipse cy="6" rx="8" ry="6" fill="rgba(255,255,255,.4)"/><ellipse cy="3" rx="3" ry="2.2" fill="#3B2A26"/><path d="M-9 -3 q3 3 6 0 M3 -3 q3 3 6 0" stroke="#3B2A26" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M-4 9 q4 3 8 0" stroke="#3B2A26" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>';
      svg.innerHTML = s;
    }
    function lerp(a, b, t) { var o = {}; for (var k in a) o[k] = a[k] + (b[k] - a[k]) * t; return o; }
    function say() { pos.textContent = 'Position ' + (idx + 1) + ' of ' + frames.length + ': ' + S.t[idx]; }
    function step() {
      idx = (idx + 1) % frames.length; from = lerp(from, to, prog * prog * (3 - 2 * prog)); to = frames[idx]; prog = 0; hold = 0; say();
      if (api.still()) { from = to; prog = 1; draw(to); }
    }
    $('#od-nextpos', host).addEventListener('click', step);
    $('#od-play', host).addEventListener('click', function () { playing = !playing; var b = $('#od-play', host); b.setAttribute('aria-pressed', String(playing)); $('b', b).textContent = playing ? 'on' : 'off'; hold = 0; });
    api.onStill(function () { if (api.still()) { playing = false; from = to; prog = 1; draw(to); var b = $('#od-play', host); b.setAttribute('aria-pressed', 'false'); $('b', b).textContent = 'off'; } });
    draw(frames[0]); say();
    api.frames(function (dt) {
      if (api.still()) return;
      if (prog < 1) { prog = Math.min(1, prog + dt / 3000); draw(lerp(from, to, prog * prog * (3 - 2 * prog))); }
      else if (playing) { hold += dt; if (hold > 1600) step(); }
    });
  } });

  // ---------- 14. tidy the shapes (there is no wrong way) ----------
  var SHAPES = { circle: ['Circle', '<circle cx="20" cy="20" r="14"/>'], square: ['Square', '<rect x="7" y="7" width="26" height="26" rx="3"/>'], triangle: ['Triangle', '<path d="M20 6L34 32H6z" stroke-linejoin="round"/>'], diamond: ['Diamond', '<path d="M20 4L35 20 20 36 5 20z" stroke-linejoin="round"/>'] };
  var TIDY_COLS = ['#E58FA3', '#7FB0D8', '#E0A030', '#6C8F5A', '#B7A3DE', '#D2623F'];
  BD.offer({ id: 'tidy', kind: 'Tidy', title: 'A tidy table', mount: function (host, api) {
    var keys = Object.keys(SHAPES), items = [], sel = null, left = 0, dragged = false, offs = [];
    host.innerHTML = '<p class="od-note">Pick up a shape and set it on its own mat: tap a shape, then a mat, or drag it over. If it isn’t the right one, it simply stays where it was.</p><div class="od-tidy-items" role="group" aria-label="Shapes on the table"></div><div class="od-tidy-mats" role="group" aria-label="Mats"></div><p class="od-note od-say" aria-live="polite"></p><div class="od-row"><button type="button" class="bd-pill" id="od-scatter">Scatter them again</button></div>';
    var it = $('.od-tidy-items', host), mats = $('.od-tidy-mats', host), say = $('.od-say', host);
    function svgOf(k, c) { return '<svg viewBox="0 0 40 40" aria-hidden="true" fill="' + c + '" stroke="rgba(60,50,80,.35)" stroke-width="1.5">' + SHAPES[k][1] + '</svg>'; }
    function build() {
      offs.splice(0).forEach(function (f) { f(); }); it.innerHTML = ''; mats.innerHTML = ''; sel = null; items = [];
      var cols = shuffle(TIDY_COLS); keys.forEach(function (k, i) { items.push({ k: k, c: cols[i] }, { k: k, c: cols[(i + 2) % cols.length] }); }); items = shuffle(items); left = items.length;
      items.forEach(function (o) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'od-shape'; b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', SHAPES[o.k][0].toLowerCase() + ' shape. Press, then press a mat to place it.'); b.innerHTML = svgOf(o.k, o.c); o.el = b; it.appendChild(b);
        b.addEventListener('click', function () { if (dragged) return; select(o === sel ? null : o); });
        var ghostX = 0;
        offs.push(BD.drag(b, { start: function () { dragged = false; }, move: function (dx, dy) { dragged = true; b.classList.add('is-drag'); b.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; },
          end: function (e, moved) { b.classList.remove('is-drag'); b.style.transform = ''; if (moved) { b.style.visibility = 'hidden'; var t = document.elementFromPoint(e.clientX, e.clientY); b.style.visibility = ''; var m = t && t.closest && t.closest('.od-mat'); if (m) attempt(o, m.getAttribute('data-k'), m); setTimeout(function () { dragged = false; }, 60); } } }));
      });
      keys.forEach(function (k) {
        var m = document.createElement('button'); m.type = 'button'; m.className = 'od-mat'; m.setAttribute('data-k', k); m.setAttribute('aria-label', SHAPES[k][0] + ' mat');
        m.innerHTML = '<svg viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 3" opacity=".65">' + SHAPES[k][1] + '</svg><span class="od-matn">' + SHAPES[k][0] + '</span><span class="od-matp"></span>'; mats.appendChild(m);
        m.addEventListener('click', function () { if (sel) attempt(sel, k, m); else say.textContent = 'Choose a shape first, then a mat.'; });
      });
      say.textContent = '';
    }
    function select(o) { sel = o; items.forEach(function (x) { if (x.el) x.el.setAttribute('aria-pressed', String(x === o)); }); mats.classList.toggle('is-ready', !!o); if (o) say.textContent = 'Picked up the ' + SHAPES[o.k][0].toLowerCase() + '. Which mat?'; }
    function attempt(o, k, m) {
      if (!o.el || o.done) return;
      if (o.k !== k) { say.textContent = 'Not that one. This ' + SHAPES[o.k][0].toLowerCase() + ' belongs on the ' + SHAPES[o.k][0].toLowerCase() + ' mat. No hurry.'; m.classList.add('is-no'); setTimeout(function () { m.classList.remove('is-no'); }, 700); return; }
      o.done = true; $('.od-matp', m).insertAdjacentHTML('beforeend', svgOf(o.k, o.c)); var nx = o.el.nextElementSibling || it.querySelector('button:not([hidden])'); o.el.remove(); o.el = null; sel = null; mats.classList.remove('is-ready'); left--;
      say.textContent = left ? pick(['There. Just right.', 'Nicely placed.', 'That looks calm.', 'A little tidier.']) : 'All tidy. A calm, quiet table.'; api.audio.pluck(api.audio.note(rand(9)), 0.14);
      if (nx && nx.focus && document.activeElement === document.body) nx.focus({ preventScroll: true });
    }
    $('#od-scatter', host).addEventListener('click', build); api.cleanup(function () { offs.forEach(function (f) { f(); }); });
    build();
  } });

  // ---------- 15. a little bonsai to water ----------
  BD.offer({ id: 'bonsai', kind: 'Tend', title: 'A little bonsai', mount: function (host, api) {
    var N = 24, pts = [], growth = 0;
    function plan() { pts = []; var tips = [[70, 82], [160, 72], [176, 122], [58, 126], [112, 104]]; tips.forEach(function (t) { for (var i = 0; i < 5; i++) pts.push([t[0] + rand(34) - 17, t[1] + rand(26) - 15, rand(180)]); }); pts = shuffle(pts).slice(0, N); }
    host.innerHTML = '<p class="od-note">Water the little tree a few drops at a time. It grows slowly, and it cannot be overwatered here.</p><svg class="od-bonsai" viewBox="0 0 240 230" role="img" aria-label="A small bonsai tree in a pot"></svg><p class="od-note od-say" aria-live="polite"></p><div class="od-row"><button type="button" class="bd-go" id="od-water">Water the tree</button><button type="button" class="bd-pill" id="od-plant">Plant another</button></div>';
    var svg = $('.od-bonsai', host), say = $('.od-say', host);
    function paint(fresh) {
      var s = '<ellipse cx="120" cy="214" rx="64" ry="6" fill="rgba(60,50,40,.18)"/><path d="M112 168 C108 140 116 118 108 104 C104 94 90 90 72 84 M110 110 C124 98 148 86 162 74 M116 144 C136 138 158 132 176 124 M114 134 C96 132 76 130 60 128 M108 106 C112 108 114 112 116 118" stroke="#6E4A33" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M112 168 C108 140 116 118 108 104" stroke="#8A6144" stroke-width="2" fill="none" opacity=".6"/>';
      s += '<path d="M72 170 H168 L158 212 H82Z" fill="#B5654A"/><rect x="68" y="164" width="104" height="10" rx="3" fill="#C97C5C"/><ellipse cx="120" cy="168" rx="46" ry="3.4" fill="#6E5A3C"/>';
      var n = Math.min(N, growth * 3);
      for (var i = 0; i < n; i++) { var p = pts[i], c = ['#6F9A5E', '#7FAE6B', '#5E8D57'][i % 3]; s += '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="11" ry="6.5" transform="rotate(' + p[2] + ' ' + p[0] + ' ' + p[1] + ')" fill="' + c + '" class="' + (fresh && i >= n - 3 ? 'od-pop' : '') + '"/>'; }
      if (growth >= 7) for (var j = 0; j < Math.min(9, (growth - 6) * 2); j++) { var q = pts[(j * 2 + 1) % N]; s += '<circle cx="' + (q[0] + 3) + '" cy="' + (q[1] - 3) + '" r="3.4" fill="#F3B6C4" class="' + (fresh && j >= Math.min(9, (growth - 6) * 2) - 2 ? 'od-pop' : '') + '"/>'; }
      s += '<g class="od-can" transform="translate(150 20)"><path d="M0 0h28l-4 20H4z" fill="#6FA3C9"/><path d="M26 6l16-8" stroke="#6FA3C9" stroke-width="4" stroke-linecap="round"/><path d="M4 2c-8 0-8 12 0 12" stroke="#6FA3C9" stroke-width="3" fill="none"/><g class="od-drops" fill="#9CCDE6" opacity="0"><circle cx="44" cy="12" r="2"/><circle cx="48" cy="34" r="2"/><circle cx="46" cy="56" r="2"/></g></g>';
      svg.innerHTML = s;
    }
    var msgs = ['A little drink. Slowly, slowly.', 'New leaves are opening.', 'It is greener already.', 'Fuller now, and calm.', 'Almost in bloom.', 'Small blossoms are opening.', 'In full leaf and blossom. Nothing more is needed.'];
    $('#od-water', host).addEventListener('click', function () {
      if (growth >= 9) { say.textContent = 'It has had plenty of water, and it is in bloom. Rest a moment beside it.'; return; }
      growth++; paint(true); say.textContent = msgs[Math.min(msgs.length - 1, Math.floor(growth * msgs.length / 10))];
      var d = svg.querySelector('.od-drops'); if (d) { d.setAttribute('class', 'od-drops is-pour'); d.setAttribute('opacity', api.still() ? '1' : ''); }
      api.audio.tone(api.audio.note(6 + rand(3)), 0.5, 0.045);
    });
    $('#od-plant', host).addEventListener('click', function () { growth = 0; plan(); paint(); say.textContent = 'A fresh little tree, just beginning.'; });
    plan(); paint();
  } });

  // ---------- 16. wind chimes ----------
  BD.offer({ id: 'chimes', kind: 'Listen', title: 'Wind chimes', mount: function (host, api) {
    var A = api.audio, notes = [9, 7, 5, 4, 3, 1, 0], h = '<p class="od-note">Touch a chime, or sweep a finger across them. Or let a breeze pass through.</p><div class="od-chimes" role="group" aria-label="Wind chimes"><div class="od-bar"></div>';
    notes.forEach(function (n, i) { h += '<button type="button" class="od-tube" data-n="' + n + '" aria-label="Chime ' + (i + 1) + ' of ' + notes.length + '" style="--l:' + (70 + (i * 17)) + 'px"><span></span></button>'; });
    host.innerHTML = h + '</div><div class="od-row"><button type="button" class="bd-pill" id="od-breeze">Let a breeze pass</button></div><p class="od-note od-say" aria-live="polite"></p>';
    var box = $('.od-chimes', host), say = $('.od-say', host), lastT = null, downP = false;
    function ring(t) { var ok = A.chime(A.note(+t.getAttribute('data-n')), 0.15); t.classList.remove('is-swing'); void t.offsetWidth; t.classList.add('is-swing'); setTimeout(function () { t.classList.remove('is-swing'); }, 2600); return ok; }
    api.on(box, 'click', function (e) { var t = e.target.closest('.od-tube'); if (t) { var ok = ring(t); say.textContent = ok ? '' : not(); } });
    api.on(box, 'pointerdown', function (e) { downP = e.pointerType !== 'mouse' || e.buttons === 1; lastT = null; });
    api.on(box, 'pointermove', function (e) { if (!downP || e.buttons === 0 && e.pointerType === 'mouse') return; var t = document.elementFromPoint(e.clientX, e.clientY); t = t && t.closest && t.closest('.od-tube'); if (t && t !== lastT) { lastT = t; ring(t); } });
    api.on(window, 'pointerup', function () { downP = false; lastT = null; });
    $('#od-breeze', host).addEventListener('click', function () {
      var tubes = box.querySelectorAll('.od-tube'), n = 4 + rand(4), d = 0, ok = true;
      for (var i = 0; i < n; i++) { (function (t, wait) { d += wait; api.later(function () { ok = ring(t) && ok; }, d); })(tubes[rand(tubes.length)], 250 + rand(800)); }
      say.textContent = A.on ? 'A breeze passes through.' : 'A breeze passes through. ' + not();
    });
  } });

  // ---------- 17. one brush circle (ensō) ----------
  BD.offer({ id: 'enso', kind: 'Draw', title: 'One breath, one circle', mount: function (host, api) {
    host.innerHTML = '<p class="od-note">Draw a circle in one slow stroke, with a finger or a mouse. It does not need to be round or closed. The ink fades by itself. Or press the button and watch one being drawn.</p><div class="od-ensowrap"><canvas class="od-enso" role="img" aria-label="A paper canvas for one brush circle"></canvas></div><div class="od-row"><button type="button" class="bd-pill" id="od-draw1">Draw one for me</button><button type="button" class="bd-pill" id="od-clear">Let it go</button></div>';
    var cv = $('canvas', host), ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1, segs = [], cur = null, last = null, doneAt = 0, auto = null, dirty = true;
    function size() { dpr = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth || 300; H = W * 0.7; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); dirty = true; }
    function pt(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.width]; }
    api.on(cv, 'pointerdown', function (e) { try { cv.setPointerCapture(e.pointerId); } catch (x) {} segs = []; auto = null; last = pt(e); last.t = performance.now(); cur = true; doneAt = 0; e.preventDefault(); });
    api.on(cv, 'pointermove', function (e) { if (!cur) return; var p = pt(e), now = performance.now(), dx = (p[0] - last[0]) * W, dy = (p[1] - last[1]) * W, d = Math.hypot(dx, dy); if (d < 2) return; var v = d / Math.max(1, now - last.t), w = clamp(15 - v * 5, 2.5, 15); segs.push([last[0], last[1], p[0], p[1], w]); p.t = now; last = p; dirty = true; e.preventDefault(); });
    function end() { if (cur) { cur = null; doneAt = performance.now(); } }
    api.on(cv, 'pointerup', end); api.on(cv, 'pointercancel', end);
    $('#od-clear', host).addEventListener('click', function () { segs = []; auto = null; doneAt = 0; dirty = true; });
    $('#od-draw1', host).addEventListener('click', function () {
      segs = []; doneAt = 0; var cx = 0.5 + (Math.random() - 0.5) * 0.06, cy = 0.35, r = 0.2 + Math.random() * 0.04, a0 = -2 + Math.random() * 0.5, sweep = 5.5 + Math.random() * 0.5, pts = [];
      for (var i = 0; i <= 90; i++) { var t = i / 90, a = a0 + sweep * t, rr = r * (1 + 0.03 * Math.sin(t * 5)) * (1 - 0.06 * t); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 15 - 12 * t * t - 2 * Math.sin(t * 3)]); }
      auto = { pts: pts, i: 0 }; if (api.still()) { for (var k = 1; k < pts.length; k++) segs.push([pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], pts[k][2]]); auto = null; doneAt = performance.now(); dirty = true; }
    });
    function draw(now) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#F6EFDD'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(150,120,70,.07)'; for (var i = 0; i < 90; i++) ctx.fillRect((i * 97 % 100) / 100 * W, (i * 53 % 100) / 100 * H, 2, 1);
      var al = 1; if (doneAt && !api.still()) al = clamp(1 - (now - doneAt - 3500) / 9000, 0, 1);
      if (al <= 0) { segs = []; doneAt = 0; return; }
      ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(30,26,28,' + 0.88 * al + ')';
      segs.forEach(function (s) { ctx.lineWidth = s[4]; ctx.beginPath(); ctx.moveTo(s[0] * W, s[1] * W); ctx.lineTo(s[2] * W, s[3] * W); ctx.stroke(); });
      ctx.strokeStyle = 'rgba(30,26,28,' + 0.18 * al + ')'; segs.forEach(function (s, k) { if (k % 2) return; ctx.lineWidth = s[4] * 0.45; ctx.beginPath(); ctx.moveTo(s[0] * W + 2, s[1] * W - 1); ctx.lineTo(s[2] * W + 2, s[3] * W - 1); ctx.stroke(); });
    }
    size(); api.on(window, 'resize', size); try { var ro = new ResizeObserver(size); ro.observe(cv); api.cleanup(function () { ro.disconnect(); }); } catch (e) {}
    api.frames(function (dt, now) {
      if (auto) { var n = Math.max(1, Math.round(dt / 28)); for (var k = 0; k < n && auto.i < auto.pts.length - 1; k++) { var a = auto.pts[auto.i], b = auto.pts[auto.i + 1]; segs.push([a[0], a[1], b[0], b[1], b[2]]); auto.i++; } dirty = true; if (auto.i >= auto.pts.length - 1) { auto = null; doneAt = now; } }
      if (dirty || (segs.length && doneAt && !api.still())) { draw(now); dirty = false; }
    });
    api.onStill(function () { dirty = true; });
  } });
})();
