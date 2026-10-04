/* bears-dojo-offerings.js — the first calm offerings inside The Bears Dojo:
   breathing circle, singing bowls, stacking stones, a sand garden, kind-word cards, a memory-match card game,
   a "see, hear, feel" walk, and lanterns for the stream. Each one is small, keyboard-friendly, can't be lost,
   and keeps whatever you type on your device only (mostly: not even there). */
(function () {
  'use strict';
  var BD = window.BearsDojo; if (!BD) return;
  var U = BD.util, rand = U.rand, pick = U.pick, shuffle = U.shuffle, esc = U.esc, clamp = U.clamp, $ = U.$;
  var uid = 0;
  function flash(node, cls, ms) { node.classList.add(cls); setTimeout(function () { node.classList.remove(cls); }, ms || 1400); }
  function not() { return 'Turn Sound on (top of the page) to hear it.'; }

  // ---------- 1. a breathing circle, a different rhythm each time ----------
  var RHYTHMS = [
    { n: 'Box breathing', d: 'In for four, hold for four, out for four, hold for four.', s: [['Breathe in', 4, 'in'], ['Hold', 4, 'hold'], ['Breathe out', 4, 'out'], ['Hold', 4, 'hold']] },
    { n: 'A longer breath out', d: 'In for four, out for six. The out-breath is the long one.', s: [['Breathe in', 4, 'in'], ['Breathe out', 6, 'out']] },
    { n: 'A slow wave', d: 'In for five, out for five, like a wave on a still lake.', s: [['In', 5, 'in'], ['Out', 5, 'out']] },
    { n: 'The triangle', d: 'In for four, hold for four, out for four.', s: [['Breathe in', 4, 'in'], ['Hold', 4, 'hold'], ['Breathe out', 4, 'out']] },
    { n: 'A soft sigh', d: 'A gentle breath in, then a long, easy sigh out.', s: [['A gentle breath in', 4, 'in'], ['Sigh it out', 7, 'out']] },
    { n: 'Three and three', d: 'In for three, out for three. Easy and light.', s: [['In', 3, 'in'], ['Out', 3, 'out']] }
  ];
  var lastRhythm = -1;
  BD.offer({ id: 'breath', kind: 'Breathe', title: 'Breathe with the circle', mount: function (host, api) {
    var cur = pick(RHYTHMS.map(function (r, i) { return i; }).filter(function (i) { return i !== lastRhythm; })), step = 0, scale = 0.55;
    host.innerHTML = '<div class="od-center"><div class="od-orb-wrap"><div class="od-orb" id="od-orb" aria-hidden="true"><span class="od-orb-t"></span></div></div>' +
      '<p class="od-sr sr-only">A circle that grows while you breathe in and shrinks while you breathe out. The words change with each part of the breath.</p>' +
      '<p class="od-note od-d"></p><div class="od-row"><button type="button" class="bd-pill" id="od-rh">A different rhythm</button></div></div>';
    var orb = $('#od-orb', host), t = $('.od-orb-t', host), d = $('.od-d', host);
    function setScale(sc, sec) { scale = sc; if (api.still()) { orb.style.transform = ''; return; } orb.style.transitionDuration = sec + 's'; orb.style.transform = 'scale(' + sc + ')'; }
    function run() {
      var r = RHYTHMS[cur], st = r.s[step % r.s.length]; t.textContent = st[0];
      if (st[2] === 'in') setScale(1, st[1]); else if (st[2] === 'out') setScale(0.55, st[1]);
      if (api.audio.on) api.audio.tone(st[2] === 'in' ? api.audio.note(4) : st[2] === 'out' ? api.audio.note(1) : api.audio.note(3), st[1] * 0.7, 0.035);
      api.later(function () { step++; run(); }, st[1] * 1000);
    }
    function begin() { var r = RHYTHMS[cur]; lastRhythm = cur; d.textContent = r.n + '. ' + r.d + ' Just follow the circle, for as long as you like.'; step = 0; orb.style.transitionDuration = '0s'; orb.style.transform = api.still() ? '' : 'scale(.55)'; setTimeout(run, 60); }
    // "A different rhythm" mounts this offering again, which picks a rhythm other than the one just shown
    $('#od-rh', host).addEventListener('click', function () { BD.show('breath', 'now'); });
    begin();
  } });

  // ---------- 2. singing bowls ----------
  BD.offer({ id: 'bowls', kind: 'Listen', title: 'Three singing bowls', mount: function (host, api) {
    var A = api.audio, defs = [['low', 'Low bowl', A.note(0) / 2, 128], ['middle', 'Middle bowl', A.note(2), 104], ['high', 'High bowl', A.note(5), 84]];
    var h = '<p class="od-note">Tap a bowl to strike it softly. Let it ring out; there is no right way.</p><div class="od-bowls">';
    defs.forEach(function (b, i) {
      h += '<div class="od-bowl-w"><button type="button" class="od-bowl" data-i="' + i + '" aria-label="Strike the ' + b[1].toLowerCase() + '" style="--s:' + b[3] + 'px"><svg viewBox="0 0 120 80" aria-hidden="true"><ellipse cx="60" cy="72" rx="42" ry="6" fill="#B5483A" opacity=".85"/><path d="M14 30 C14 58 36 68 60 68 C84 68 106 58 106 30Z" fill="#C79A52"/><path d="M14 30 C14 58 36 68 60 68 C84 68 106 58 106 30Z" fill="url(#od-bg)" opacity=".3"/><ellipse cx="60" cy="30" rx="46" ry="9" fill="#E7C987"/><ellipse cx="60" cy="31" rx="38" ry="6.4" fill="#A97C36"/><path d="M26 44 C32 56 44 60 56 61" stroke="#FFF1C9" stroke-width="2" fill="none" opacity=".5" stroke-linecap="round"/></svg><span class="od-rings" aria-hidden="true"></span></button><span class="od-cap">' + b[1] + '</span></div>';
    });
    host.innerHTML = h + '</div><p class="od-note od-hint" aria-live="polite"></p>';
    var hint = $('.od-hint', host);
    api.on(host, 'click', function (e) {
      var b = e.target.closest('.od-bowl'); if (!b) return; var i = +b.getAttribute('data-i'), vol = 0.16 + Math.random() * 0.08;
      var ok = A.bowl(defs[i][2], vol); hint.textContent = ok ? 'Listen to it fade.' : not();
      var rings = $('.od-rings', b), r = document.createElement('i'); rings.appendChild(r); setTimeout(function () { r.remove(); }, 4200);
      flash(b, 'is-struck', 1600);
    });
  } });

  // ---------- 3. stacking stones (they never fall) ----------
  BD.offer({ id: 'cairn', kind: 'Stack', title: 'A small cairn', mount: function (host, api) {
    var sizes = [[124, 'a wide flat stone'], [104, 'a broad stone'], [86, 'a round stone'], [70, 'a smaller stone'], [54, 'a small stone'], [40, 'a tiny stone']], cols = ['#8E8A84', '#A39B8F', '#7F7A76', '#B3A999', '#969089', '#8A8178'];
    var stones = shuffle(sizes.map(function (s, i) { return { w: s[0], h: Math.round(s[0] * 0.3 + 8), name: s[1], c: cols[i], dx: rand(13) - 6, id: i }; })), placed = [], offs = [];
    var notes = ['It holds.', 'Steady.', 'A lovely balance.', 'It sits just right.', 'Quiet and sure.', 'Nothing is going anywhere.'];
    host.innerHTML = '<p class="od-note">Choose a stone to set on the stack, by tapping it, pressing Enter, or dragging it over. They can go in any order, and they will not fall.</p>' +
      '<div class="od-cairn-grid"><div class="od-tray" id="od-tray" role="group" aria-label="Stones to choose from"></div><div class="od-cairn" id="od-cairn" role="img" aria-label="The cairn"><div class="od-ground"></div></div></div>' +
      '<p class="od-note od-say" aria-live="polite"></p><div class="od-row"><button type="button" class="bd-pill" id="od-take">Take the top one off</button><button type="button" class="bd-pill" id="od-again">Start again</button></div>';
    var tray = $('#od-tray', host), cairn = $('#od-cairn', host), say = $('.od-say', host), dragged = false;
    function stoneEl(s) { var d = document.createElement('div'); d.className = 'od-stone'; d.style.cssText = 'width:' + s.w + 'px;height:' + s.h + 'px;background:radial-gradient(ellipse at 35% 28%, ' + s.c + ' 0%, ' + s.c + ' 40%, rgba(0,0,0,.28) 140%)'; return d; }
    function renderTray() {
      offs.splice(0).forEach(function (f) { f(); }); tray.innerHTML = '';
      stones.forEach(function (s) {
        if (placed.indexOf(s) > -1) return;
        var b = document.createElement('button'); b.type = 'button'; b.className = 'od-pick'; b.setAttribute('aria-label', 'Place ' + s.name + ' on the stack'); b.appendChild(stoneEl(s)); tray.appendChild(b);
        b.addEventListener('click', function () { if (dragged) { dragged = false; return; } place(s); });
        offs.push(BD.drag(b, { start: function () { dragged = false; b.classList.add('is-drag'); }, move: function (dx, dy) { dragged = true; b.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; },
          end: function (e, moved) { b.classList.remove('is-drag'); b.style.transform = ''; if (moved) { var r = cairn.getBoundingClientRect(); if (e.clientX > r.left - 20 && e.clientX < r.right + 20 && e.clientY > r.top - 20 && e.clientY < r.bottom + 20) place(s); setTimeout(function () { dragged = false; }, 50); } } }));
      });
      if (!tray.children.length) tray.innerHTML = '<p class="od-note">Every stone is on the stack.</p>';
    }
    function renderCairn(last) {
      Array.prototype.slice.call(cairn.querySelectorAll('.od-stone')).forEach(function (n) { n.remove(); });
      var y = 6; placed.forEach(function (s, i) { var d = stoneEl(s); d.style.left = 'calc(50% + ' + s.dx + 'px - ' + s.w / 2 + 'px)'; d.style.bottom = y + 'px'; if (s === last) d.classList.add('od-settle'); cairn.appendChild(d); y += Math.round(s.h * 0.78); });
      cairn.setAttribute('aria-label', 'The cairn, with ' + placed.length + ' of ' + stones.length + ' stones');
    }
    function place(s) {
      if (placed.indexOf(s) > -1) return; placed.push(s); renderTray(); renderCairn(s);
      say.textContent = placed.length === stones.length ? 'Six stones, held together by nothing but patience. It can stay as long as you like.' : pick(notes);
      if (api.audio.on) api.audio.tone(api.audio.note(placed.length + 1), 0.6, 0.05);
      var next = tray.querySelector('button'); if (next && document.activeElement === document.body) next.focus();
    }
    $('#od-take', host).addEventListener('click', function () { if (!placed.length) return; placed.pop(); renderTray(); renderCairn(); say.textContent = 'Set down gently.'; });
    $('#od-again', host).addEventListener('click', function () { placed = []; stones = shuffle(stones); renderTray(); renderCairn(); say.textContent = 'A clear place to begin again.'; });
    api.cleanup(function () { offs.forEach(function (f) { f(); }); });
    renderTray(); renderCairn();
  } });

  // ---------- 4. a sand garden to rake ----------
  BD.offer({ id: 'sand', kind: 'Rake', title: 'The sand garden', mount: function (host, api) {
    host.innerHTML = '<p class="od-note">Drag your finger or mouse to rake lines in the sand. Try a circle around a stone. The sand smooths itself over, slowly. With a keyboard, use the arrow keys to move the rake and Space to lift it or set it down.</p>' +
      '<div class="od-sandwrap"><canvas class="od-sand" tabindex="0" role="application" aria-label="Sand garden. Use the arrow keys to rake, Space to lift or set down the rake."></canvas></div>' +
      '<div class="od-row"><button type="button" class="bd-pill" id="od-smooth">Smooth the sand</button><button type="button" class="bd-pill" id="od-rake" aria-pressed="true">Rake: <b>down</b></button></div><p class="od-note od-say" aria-live="polite"></p>';
    var cv = $('canvas', host), ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1, strokes = [], cur = null, dirty = true, down = true, kx = 0.5, ky = 0.25, kTimer = 0, focus = false, grain = null, say = $('.od-say', host);
    var rocks = [[0.22, 0.3, 0.07], [0.7, 0.18, 0.05], [0.58, 0.38, 0.04]];
    function size() { dpr = Math.min(2, window.devicePixelRatio || 1); W = cv.clientWidth || 300; H = W / 2; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); dirty = true; }
    function mkGrain() { var g = document.createElement('canvas'); g.width = 160; g.height = 160; var c = g.getContext('2d'); for (var i = 0; i < 700; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(140,115,70,.10)' : 'rgba(255,250,235,.22)'; c.fillRect(rand(160), rand(160), 1.4, 1.4); } return g; }
    function pt(e) { var r = cv.getBoundingClientRect(); return [clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.width, 0, 0.5)]; }
    function begin(p) { cur = { p: [p], born: performance.now() }; strokes.push(cur); if (strokes.length > 50) strokes.shift(); dirty = true; }
    function add(p) { if (!cur) return; var l = cur.p[cur.p.length - 1]; if (Math.hypot((p[0] - l[0]) * W, (p[1] - l[1]) * W) < 4) return; cur.p.push(p); cur.born = performance.now(); if (cur.p.length > 400) cur.p.shift(); dirty = true; }
    api.on(cv, 'pointerdown', function (e) { try { cv.setPointerCapture(e.pointerId); } catch (x) {} cv.focus({ preventScroll: true }); begin(pt(e)); e.preventDefault(); });
    api.on(cv, 'pointermove', function (e) { if (cur && e.buttons !== 0) { add(pt(e)); e.preventDefault(); } });
    api.on(cv, 'pointerup', function () { cur = null; }); api.on(cv, 'pointercancel', function () { cur = null; });
    api.on(cv, 'focus', function () { focus = true; dirty = true; }); api.on(cv, 'blur', function () { focus = false; cur = null; dirty = true; });
    api.on(cv, 'keydown', function (e) {
      var k = e.key, st = 0.03;
      if (k === ' ' || k === 'Spacebar') { toggle(); e.preventDefault(); return; }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(k) < 0) return; e.preventDefault();
      kx = clamp(kx + (k === 'ArrowRight' ? st : k === 'ArrowLeft' ? -st : 0), 0.02, 0.98); ky = clamp(ky + (k === 'ArrowDown' ? st : k === 'ArrowUp' ? -st : 0), 0.02, 0.48);
      if (down) { if (!cur) begin([kx, ky]); else add([kx, ky]); clearTimeout(kTimer); kTimer = setTimeout(function () { cur = null; }, 700); } dirty = true;
    });
    function toggle() { down = !down; cur = null; var b = $('#od-rake', host); b.setAttribute('aria-pressed', String(down)); $('b', b).textContent = down ? 'down' : 'up'; say.textContent = down ? 'Rake set down.' : 'Rake lifted.'; dirty = true; }
    $('#od-rake', host).addEventListener('click', toggle);
    $('#od-smooth', host).addEventListener('click', function () { strokes = []; cur = null; dirty = true; say.textContent = 'Smooth again.'; });
    api.cleanup(function () { clearTimeout(kTimer); });
    function offsetPath(p, o) { var out = []; for (var i = 0; i < p.length; i++) { var a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; out.push([p[i][0] - dy / l * o, p[i][1] + dx / l * o]); } return out; }
    function draw(now) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#EADFC4'; ctx.fillRect(0, 0, W, H);
      if (!grain) grain = ctx.createPattern(mkGrain(), 'repeat'); ctx.fillStyle = grain; ctx.fillRect(0, 0, W, H);
      var still = api.still(), gap = 0.014;
      strokes = strokes.filter(function (s) { return still || now - s.born < 52000; });
      strokes.forEach(function (s) {
        var age = now - s.born, al = still || s === cur ? 1 : clamp(1 - (age - 18000) / 32000, 0, 1); if (al <= 0 || s.p.length < 2) return;
        [-1, 0, 1].forEach(function (k) {
          var q = offsetPath(s.p, k * gap); ctx.beginPath(); ctx.moveTo(q[0][0] * W, q[0][1] * W); for (var i = 1; i < q.length; i++) ctx.lineTo(q[i][0] * W, q[i][1] * W);
          ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,252,240,' + 0.8 * al + ')'; ctx.lineWidth = 3.4; ctx.stroke();
          ctx.strokeStyle = 'rgba(130,104,62,' + 0.55 * al + ')'; ctx.lineWidth = 2; ctx.save(); ctx.translate(-0.8, -0.8); ctx.stroke(); ctx.restore();
        });
      });
      rocks.forEach(function (r) { var x = r[0] * W, y = r[1] * W, rr = r[2] * W;
        ctx.fillStyle = 'rgba(100,80,50,.25)'; ctx.beginPath(); ctx.ellipse(x + 3, y + rr * 0.6, rr * 1.2, rr * 0.5, 0, 0, 7); ctx.fill();
        var g = ctx.createRadialGradient(x - rr * 0.3, y - rr * 0.4, rr * 0.1, x, y, rr * 1.2); g.addColorStop(0, '#B5ADA0'); g.addColorStop(1, '#6E6962'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rr * 1.15, rr * 0.85, 0, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(111,142,98,.55)'; ctx.beginPath(); ctx.ellipse(x - rr * 0.3, y - rr * 0.5, rr * 0.5, rr * 0.2, 0, 0, 7); ctx.fill(); });
      if (focus) { ctx.strokeStyle = down ? '#3C3350' : 'rgba(60,51,80,.5)'; ctx.lineWidth = 2; ctx.setLineDash(down ? [] : [3, 3]); ctx.beginPath(); ctx.arc(kx * W, ky * W, 8, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    }
    size(); api.on(window, 'resize', size); try { var ro = new ResizeObserver(size); ro.observe(cv); api.cleanup(function () { ro.disconnect(); }); } catch (e) {}
    api.frames(function (dt, now) { if (dirty || (strokes.length && !api.still())) { draw(now); dirty = false; } });
    api.onStill(function () { dirty = true; });
  } });

  // ---------- 5. kind-word cards, and one tiny question just for you ----------
  var WORDS = [
    ['You are allowed to move at the pace of a garden.', 'What is one thing that could go slowly today?'], ['Being kind to yourself counts as kindness too.', 'What would you say to a friend who felt the way you do?'],
    ['You do not have to earn rest.', 'Where could you rest a little today?'], ['Small steps still move you forward.', 'What is one small step that feels friendly?'],
    ['There is room for you here, exactly as you are.', 'What part of you would like a little welcome?'], ['Some days the best thing to do is simply breathe.', 'What does your breath feel like right now?'],
    ['You have made it through every hard day so far.', 'What helped, even a little?'], ['It is okay not to have it all figured out.', 'What is one thing you are curious about?'],
    ['Gentle is a kind of strength.', 'Where could you be a little gentler today?'], ['Someone is glad you exist.', 'Who comes to mind when you think of being cared about?'],
    ['A pause is part of the music.', 'What would a good pause look like today?'], ['You can begin again whenever you like.', 'What would you like to begin again, softly?'],
    ['Feelings are visitors. You can let them sit a while.', 'Which feelings are visiting today? Just name them.'], ['Enough is a real amount.', 'What feels like enough today?'],
    ['Warm things are worth noticing.', 'What is one warm thing near you?'], ['Kindness travels farther than we see.', 'Who could you pass a little kindness to?'],
    ['You are more than what you get done.', 'What do you like about yourself that has nothing to do with work?'], ['Be as patient with yourself as with a seedling.', 'What is growing slowly in your life?'],
    ['Listening is a way of loving.', 'Who would enjoy being listened to this week?'], ['Rain waters the garden too.', 'What hard thing might also be helping something grow?'],
    ['You can set something down for a while.', 'What could you set down for ten minutes?'], ['A kind word costs nothing and lasts a long time.', 'What kind word would you like to hear today?'],
    ['Mistakes are how paths get worn in.', 'What did you learn from a stumble?'], ['Home can be a feeling, not only a place.', 'Where do you feel most at home?'],
    ['It is okay to ask for help.', 'Who might be glad to help with something small?'], ['You bring something nobody else can.', 'What small thing is just yours?'],
    ['Soft light, soft voice, soft day.', 'What would make today a little softer?'], ['Let the moment be as big as it is.', 'What are you noticing right now?'],
    ['You are doing better than you think.', 'What is one thing you handled well lately?'], ['Your best today is enough for today.', 'What does your best look like right now?']
  ];
  var wordBag = [];
  BD.offer({ id: 'cards', kind: 'Reflect', title: 'Pick a kind word', mount: function (host, api) {
    function draw3() { if (wordBag.length < 3) wordBag = shuffle(WORDS); return [wordBag.shift(), wordBag.shift(), wordBag.shift()]; }
    function deal() {
      var three = draw3(); api.busy(false);
      host.innerHTML = '<p class="od-note">Three cards are face down. Choose whichever one calls to you.</p><div class="od-deck"></div>';
      var deck = $('.od-deck', host);
      three.forEach(function (w, i) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'od-cardback'; b.setAttribute('aria-label', 'Card ' + (i + 1) + ' of 3, face down. Turn it over.');
        b.innerHTML = '<svg viewBox="0 0 60 80" aria-hidden="true"><circle cx="30" cy="40" r="14" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".6"/><path d="M30 26c4 8 4 20 0 28-4-8-4-20 0-28zM16 40c8-4 20-4 28 0-8 4-20 4-28 0z" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".5"/></svg>';
        deck.appendChild(b); b.addEventListener('click', function () { reveal(w); });
      });
      if (document.activeElement === document.body) { var f = deck.querySelector('button'); if (f) f.focus({ preventScroll: true }); }
    }
    function reveal(w) {
      var id = 'od-ans-' + (++uid);
      host.innerHTML = '<div class="od-face"><p class="od-quote">' + esc(w[0]) + '</p><p class="od-ask">' + esc(w[1]) + '</p><label class="sr-only" for="' + id + '">Your private answer</label><textarea id="' + id + '" class="od-ta" rows="3" maxlength="400" placeholder="Answer here if you like, just for you. It stays on this device and is never saved or sent."></textarea><div class="od-row"><button type="button" class="bd-pill od-redeal">Turn over three new cards</button></div></div>';
      var ta = $('textarea', host); ta.addEventListener('input', function () { api.busy(ta.value.length > 0); });
      $('.od-redeal', host).addEventListener('click', deal); api.say(w[0] + ' ' + w[1]);
      var q = $('.od-quote', host); q.setAttribute('tabindex', '-1'); q.focus({ preventScroll: true });
    }
    deal();
  } });

  // ---------- 6. match the calm pictures (no timer, no losing, the grid grows slowly) ----------
  var ICONS = {
    moon: ['Moon', '<path d="M15 4a8 8 0 1 0 5 13A7 7 0 0 1 15 4z"/>'], sun: ['Sun', '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'],
    lotus: ['Lotus', '<path d="M12 19c-4 0-7-3-8-7 3 0 6 1 8 4 2-3 5-4 8-4-1 4-4 7-8 7z"/><path d="M12 16c-2-2-2-7 0-10 2 3 2 8 0 10z"/>'], leaf: ['Leaf', '<path d="M5 19C5 9 11 5 20 4c0 9-4 15-13 15z"/><path d="M5 19L14 10"/>'],
    wave: ['Wave', '<path d="M2 11c3-4 5-4 8 0s5 4 8 0 3-3 4-2M2 17c3-4 5-4 8 0s5 4 8 0 3-3 4-2"/>'], mountain: ['Mountain', '<path d="M2 20L9 7l4 7 3-4 6 10z"/>'],
    lantern: ['Lantern', '<path d="M12 2v3M8 5h8l2 3v8l-2 3H8l-2-3V8z"/><path d="M6 12h12M12 21v2"/>'], bell: ['Bell', '<path d="M6 17c1-2 1-4 1-7a5 5 0 0 1 10 0c0 3 0 5 1 7zM10 20a2 2 0 0 0 4 0"/>'],
    fish: ['Koi', '<path d="M3 12c4-6 10-6 14 0-4 6-10 6-14 0zM17 12l4-4v8z"/><circle cx="8" cy="11" r=".8"/>'], star: ['Star', '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'],
    cloud: ['Cloud', '<path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1A4.5 4.5 0 0 1 17 18z"/>'], stones: ['Stones', '<ellipse cx="12" cy="18" rx="8" ry="3"/><ellipse cx="12" cy="12.5" rx="5.5" ry="2.6"/><ellipse cx="12" cy="8" rx="3" ry="2"/>'],
    bamboo: ['Bamboo', '<path d="M9 22V3M15 22V6M7 8h4M7 15h4M13 11h4M13 18h4"/>'], tea: ['Tea', '<path d="M5 9h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M9 3c1 1 1 2 0 3M12 3c1 1 1 2 0 3"/>'],
    heart: ['Heart', '<path d="M12 20S4 15 4 9.5A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 8 2.5C20 15 12 20 12 20z"/>']
  };
  var ICON_KEYS = Object.keys(ICONS), TINTS = ['#B5483A', '#3F4B8C', '#3E6B4C', '#A8792F', '#7B4A7D', '#2F7D86'];
  var MATCH_NOTES = ['A good pair, found slowly.', 'Nicely noticed.', 'Two of a kind. Lovely.', 'Take your time. You always can.', 'That felt quiet and right.', 'Matched, and nothing hurried.', 'A small good thing.', 'Something familiar, found again.', 'Two that belong together.', 'Paying attention is a kindness too.'];
  var PAIRS = [2, 3, 4, 6, 8, 10, 12], memLevel = 0;
  BD.offer({ id: 'match', kind: 'Match', title: 'Match the calm pictures', mount: function (host, api) {
    host.innerHTML = '<p class="od-note od-mnote" aria-live="polite"></p><div class="od-mgrid" role="group" aria-label="Cards"></div><div class="od-row od-mrow"></div>';
    var grid = $('.od-mgrid', host), note = $('.od-mnote', host), row = $('.od-mrow', host), first = null, lock = false, left = 0, cards = [];
    function build() {
      var n = PAIRS[memLevel], keys = shuffle(ICON_KEYS).slice(0, n), deck = shuffle(keys.concat(keys));
      var w = host.clientWidth || 320, natural = { 2: 2, 3: 3, 4: 4, 6: 4, 8: 4, 10: 5, 12: 6 }[n], cols = Math.max(2, Math.min(natural, Math.floor(w / 70)));
      grid.style.setProperty('--cols', cols); grid.innerHTML = ''; row.innerHTML = ''; first = null; lock = false; left = n; cards = [];
      note.textContent = n === 2 ? 'Find the matching pairs. Turn over two cards at a time. Nothing is timed and nothing is lost.' : 'Find the pairs. There is no hurry.';
      deck.forEach(function (k, i) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'od-mcard'; b.setAttribute('data-k', k); b.setAttribute('aria-label', 'Card ' + (i + 1) + ', face down');
        b.style.setProperty('--t', TINTS[ICON_KEYS.indexOf(k) % TINTS.length]);
        b.innerHTML = '<span class="od-mback" aria-hidden="true"></span><span class="od-mfront" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + ICONS[k][1] + '</svg></span>';
        grid.appendChild(b); cards.push(b);
        b.addEventListener('click', function () { flip(b, i); });
      });
    }
    function show(b, on) { b.classList.toggle('is-up', on); var i = cards.indexOf(b) + 1; b.setAttribute('aria-label', 'Card ' + i + (on ? ', ' + ICONS[b.getAttribute('data-k')][0] : ', face down')); }
    function flip(b) {
      if (lock || b.classList.contains('is-done') || b === first) return; show(b, true);
      if (!first) { first = b; return; }
      var a = first; first = null;
      if (a.getAttribute('data-k') === b.getAttribute('data-k')) {
        [a, b].forEach(function (x) { x.classList.add('is-done'); x.setAttribute('aria-label', ICONS[x.getAttribute('data-k')][0] + ', matched'); }); left--;
        var msg = ICONS[a.getAttribute('data-k')][0] + '. ' + pick(MATCH_NOTES); note.textContent = msg; api.say(msg);
        if (api.audio.on) api.audio.pluck(api.audio.note(rand(9)), 0.18);
        if (!left) done();
      } else { lock = true; api.later(function () { show(a, false); show(b, false); lock = false; }, api.still() ? 700 : 950); }
    }
    function done() {
      var more = memLevel < PAIRS.length - 1;
      api.later(function () {
        note.textContent = more ? 'Every pair found, and nothing hurried. Would you like a few more cards next time?' : 'Every pair found. A whole table of quiet pictures.';
        row.innerHTML = ''; if (more) { var b = document.createElement('button'); b.type = 'button'; b.className = 'bd-pill'; b.textContent = 'A few more cards'; b.addEventListener('click', function () { memLevel++; build(); }); row.appendChild(b); }
        var s = document.createElement('button'); s.type = 'button'; s.className = 'bd-pill'; s.textContent = 'Shuffle these again'; s.addEventListener('click', build); row.appendChild(s);
        api.say(note.textContent);
      }, 700);
    }
    build();
    api.on(window, 'resize', function () { if (!cards.some(function (c) { return c.classList.contains('is-up'); })) build(); });
  } });

  // ---------- 7. see, hear, feel: a small grounding walk ----------
  BD.offer({ id: 'ground', kind: 'Notice', title: 'See, hear, feel', mount: function (host, api) {
    var steps = [['See', 'Look around, slowly. Find three things you can see. Colors, shapes, light, anything at all.', 'what is it?'], ['Hear', 'Now listen. Find three sounds, near or far. The quiet between sounds counts too.', 'what do you hear?'], ['Feel', 'Last, notice three things you can feel: your feet, the chair, the air on your skin.', 'what do you feel?']], at = 0;
    function render() {
      if (at >= steps.length) { host.innerHTML = '<div class="od-center"><p class="od-quote">Three of each, noticed.</p><p class="od-note">You are here, in this moment, and that is plenty. Nothing you wrote was kept.</p><div class="od-row"><button type="button" class="bd-pill" id="od-gagain">Walk through it again</button></div></div>'; $('#od-gagain', host).addEventListener('click', function () { at = 0; render(); }); api.say('Three of each, noticed. You are here.'); return; }
      var s = steps[at], h = '<div class="od-ground"><p class="od-step" aria-hidden="true">' + (at + 1) + ' of 3</p><h4 class="od-h4">' + s[0] + ': three things</h4><p class="od-note">' + s[1] + '</p><ul class="od-found">';
      for (var i = 0; i < 3; i++) { var id = 'od-g' + (++uid); h += '<li><label class="sr-only" for="' + id + '">Thing ' + (i + 1) + ', ' + s[0].toLowerCase() + ' (optional)</label><input id="' + id + '" class="bd-text" type="text" maxlength="60" placeholder="(optional) ' + s[2] + '" autocomplete="off"><button type="button" class="bd-pill od-got" aria-pressed="false">Found one</button></li>'; }
      host.innerHTML = h + '</ul><div class="od-row"><button type="button" class="bd-go od-gnext">' + (at < 2 ? 'Next' : 'Finish') + '</button></div></div>';
      var n = 0; var go = $('.od-gnext', host);
      Array.prototype.forEach.call(host.querySelectorAll('.od-got'), function (b) { b.addEventListener('click', function () { var on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); b.textContent = on ? 'Found' : 'Found one'; n += on ? 1 : -1; if (n === 3) api.say('Three found. Whenever you are ready, go on.'); }); });
      Array.prototype.forEach.call(host.querySelectorAll('input'), function (i2) { i2.addEventListener('input', function () { api.busy(true); }); });
      go.addEventListener('click', function () { api.busy(false); at++; render(); var h4 = $('.od-h4', host) || $('.od-quote', host); if (h4) { h4.setAttribute('tabindex', '-1'); h4.focus({ preventScroll: true }); } });
    }
    render();
  } });

  // ---------- 8. a lantern for the stream, with one word ----------
  BD.offer({ id: 'lantern', kind: 'Release', title: 'A lantern for the stream', mount: function (host, api) {
    host.innerHTML = '<p class="od-note">Write a word or two: a wish, a name, a worry you would like to let go of. Light a lantern and set it on the water. It floats away, and your word goes with it. Nothing is saved.</p>' +
      '<form class="od-form"><label class="sr-only" for="od-lw">Your word for the lantern</label><input id="od-lw" class="bd-text" type="text" maxlength="24" autocomplete="off" placeholder="A word or two"><button class="bd-go" type="submit">Light a lantern</button></form>' +
      '<div class="od-stream" aria-hidden="true"><div class="od-stream-l"></div></div><p class="od-note od-say" aria-live="polite"></p>';
    var form = $('form', host), inp = $('input', host), lane = $('.od-stream-l', host), say = $('.od-say', host), count = 0;
    inp.addEventListener('input', function () { api.busy(inp.value.length > 0); });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); if (count >= 7) { say.textContent = 'The stream is full of light for now. Watch a little.'; return; }
      var w = inp.value.trim().slice(0, 24), d = document.createElement('div'); d.className = 'od-lant'; d.style.top = (6 + rand(48)) + '%'; d.style.setProperty('--dur', (22 + rand(8)) + 's');
      d.innerHTML = '<svg viewBox="0 0 40 52" aria-hidden="true"><path d="M20 2v6" stroke="#7A4B2A" stroke-width="2"/><path d="M8 12h24l3 6v16l-3 6H8l-3-6V18z" fill="#FFD27A" stroke="#B5483A" stroke-width="2"/><path d="M5 26h30M20 12v28" stroke="#B5483A" stroke-width="1.4" opacity=".6"/><ellipse cx="20" cy="26" rx="9" ry="12" fill="#FFF1B8" opacity=".8"/><path d="M8 44h24" stroke="#B5483A" stroke-width="3"/></svg><span>' + esc(w) + '</span>';
      lane.appendChild(d); count++; say.textContent = w ? '“' + w + '” is on the water.' : 'Your lantern is on the water.'; inp.value = ''; api.busy(false);
      var gone = function () { if (d.parentNode) { d.remove(); count--; } };
      d.addEventListener('animationend', gone); api.later(gone, api.still() ? 12000 : 31000);
      api.audio.pluck(api.audio.note(rand(9)), 0.14);
    });
  } });
})();
