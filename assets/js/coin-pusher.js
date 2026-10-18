/* coin-pusher.js — the Kindness Coin Pusher (/coin-pusher.html): a cozy 3D coin pusher.
   Tap where to drop a coin. The pusher slides back and forth, and every coin that falls off the front edge
   fills the kindness meter. Every 5 coins a tip card slides up (bigger pushes bring deeper tips), and now and
   then a medallion with one of the site's characters rides along with the coins. Find them all and the machine
   goes wild for a moment.

   - One simple simulation (circles on a flat bed, a sliding pusher, friction, an open front edge), drawn two ways:
     three.js (r128, from cdnjs) for the cabinet, or a flat, calm view on a 2D canvas. The flat view is used with
     "Keep the page still", the device's reduce-motion setting, or when three.js can't load (offline).
   - All sound is made here with WebAudio, and only starts after the first tap. Quiet mode or site sounds off
     keep it silent. It pauses when the tab is hidden.
   - No money, nothing to buy. Coins refill slowly by themselves.
   - Kept on this device only: localStorage "tol-coin-v1" { cup, t, meter, found{id:time}, tips[], pending[], since, dup, snd, mus, view, done }.
   - #debug-all shows the full-collection celebration (nothing is saved while it runs). */
(function () {
  'use strict';
  var D = window.TOLCoinData; if (!D) return;
  var doc = document, root = doc.documentElement;
  var $ = function (s) { return doc.querySelector(s); };
  var main = $('#cp'); if (!main) return;

  // ---------- the world (units: one coin is 0.84 across)
  var HX = 4.6, ZB = -5.5, ZE = 3.6, R = 0.42, RP = 0.6, COIN_H = 0.16, PRIZE_H = 0.22;
  var PF_MID = -2.6, PF_AMP = 1.0, PERIOD = 4.2, MAXC = 128;
  var CUPMAX = 30, REFILL = 15000, KEY = 'tol-coin-v1';
  var DEBUG_ALL = /#debug-all\b/.test(location.hash);
  var mm = window.matchMedia ? function (q) { return window.matchMedia(q).matches; } : function () { return false; };
  var PHONE = mm('(pointer: coarse)') || mm('(max-width: 700px)');

  // ---------- saved state
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  var st = load() || {};
  st.cup = typeof st.cup === 'number' ? st.cup : CUPMAX; st.t = st.t || Date.now(); st.meter = st.meter || 0;
  st.found = st.found || {}; st.tips = st.tips || []; st.pending = st.pending || []; st.since = st.since || 0; st.dup = st.dup || 0;
  if (st.snd == null) st.snd = 1; if (st.mus == null) st.mus = 1;
  var noSave = DEBUG_ALL;
  function save() { if (noSave) return; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  // coins that came back while you were away
  (function () { var n = Math.floor((Date.now() - st.t) / REFILL); if (n > 0) { st.cup = Math.min(CUPMAX, st.cup + n); st.t += n * REFILL; } if (st.cup >= CUPMAX) st.t = Date.now(); })();
  if (DEBUG_ALL) { st = JSON.parse(JSON.stringify(st)); D.chars.forEach(function (c) { st.found[c.id] = st.found[c.id] || Date.now(); }); st.done = 0; }
  save();

  // ---------- calm, quiet and sound
  function stillChosen() { return window.TOLStill && window.TOLStill.chosen ? window.TOLStill.chosen() : (root.classList.contains('tol-still') || mm('(prefers-reduced-motion: reduce)')); }
  function soundAllowed() { return window.TOLQuiet ? window.TOLQuiet.sound() : !root.classList.contains('tol-quiet'); }
  var calm = stillChosen();

  // ---------- the simulation
  var items = [], t = 0, pf = PF_MID - PF_AMP, pfPrev = pf, pushT = 0, pushIdle = 0, wildUntil = 0;
  function pusherAt(tt) { return PF_MID + PF_AMP * Math.sin(tt * 2 * Math.PI / PERIOD - Math.PI / 2); }
  function mk(x, z, kind, pid) { return { x: x, z: z, px: x, pz: z, r: kind === 'prize' ? RP : R, kind: kind, pid: pid || '', st: 'field', y: 0, vy: 0, vz: 0, tilt: 0, spin: Math.random() * 6, age: 0 }; }
  function prefill() {
    // a full bed, packed right up to the edge, so the first few coins already nudge some over (like a real machine)
    var gap = 2 * R + 0.02, rows = 0;
    for (var z = ZE - 0.04; z > PF_MID + PF_AMP + R; z -= gap * 0.87) {
      var off = (rows++ % 2) ? gap / 2 : 0;
      for (var x = -HX + R + off; x <= HX - R; x += gap) if (Math.random() < 0.96) items.push(mk(x + (Math.random() - 0.5) * 0.04, z - Math.random() * 0.05, 'coin'));
    }
    st.pending.forEach(function (id, i) { items.push(mk(-2 + i * 2 + Math.random(), 0.4 + Math.random(), 'prize', id)); });
    for (var k = 0; k < 90; k++) step(1 / 60, true);
  }
  function fieldCount() { var n = 0; for (var i = 0; i < items.length; i++) if (items[i].st !== 'gone') n++; return n; }
  function step(dt, silent) {
    // the pusher: always moving in the 3D view; in the calm view it runs for a little while after each coin
    var speed = t < wildUntil ? 1.7 : 1;
    if (calm) { if (pushIdle > 0) { pushT += dt; pushIdle -= dt; } }
    else pushT += dt * speed;
    t += dt;
    pfPrev = pf; pf = pusherAt(pushT);
    var i, j, a, b, n = items.length;
    for (i = 0; i < n; i++) {
      a = items[i];
      if (a.st === 'drop') { a.vy -= 22 * dt; a.y += a.vy * dt; if (a.y <= 0) { a.y = 0; a.st = 'field'; a.px = a.x; a.pz = a.z; if (!silent) clink(a.kind === 'prize' ? 0.7 : 1, 0.6); } continue; }
      if (a.st === 'fall') {
        a.age += dt; a.vy -= 14 * dt; a.y += a.vy * dt; a.z += a.vz * dt; a.tilt = Math.min(1.5, a.tilt + dt * 5);
        if (a.y < -1.15) { a.st = 'gone'; if (!silent) landed(a); }
        continue;
      }
      if (a.st !== 'field') continue;
      // a little sliding, then friction
      var vx = (a.x - a.px) * 0.5, vz = (a.z - a.pz) * 0.5;
      vx = Math.max(-0.08, Math.min(0.08, vx)); vz = Math.max(-0.08, Math.min(0.08, vz));
      a.px = a.x; a.pz = a.z; a.x += vx; a.z += vz;
    }
    for (var it = 0; it < 4; it++) {
      for (i = 0; i < n; i++) {
        a = items[i]; if (a.st !== 'field') continue;
        if (a.z - a.r < pf) a.z = pf + a.r;
        if (a.x < -HX + a.r) a.x = -HX + a.r; else if (a.x > HX - a.r) a.x = HX - a.r;
        if (a.z < ZB + a.r) a.z = ZB + a.r;
      }
      for (i = 0; i < n; i++) {
        a = items[i]; if (a.st !== 'field') continue;
        for (j = i + 1; j < n; j++) {
          b = items[j]; if (b.st !== 'field') continue;
          var dx = b.x - a.x, dz = b.z - a.z, rr = a.r + b.r;
          if (dx > rr || dx < -rr || dz > rr || dz < -rr) continue;
          var d2 = dx * dx + dz * dz; if (d2 >= rr * rr) continue;
          var d = Math.sqrt(d2) || 0.0001, ov = rr - d, nx = dx / d, nz = dz / d;
          if (d < 0.0002) { nx = Math.random() - 0.5; nz = 1; }
          // a coin held against the pusher face doesn't give way
          var pa = a.z - a.r <= pf + 0.004, pb = b.z - b.r <= pf + 0.004;
          var wa = pa && !pb ? 0 : pb && !pa ? 1 : 0.5;
          a.x -= nx * ov * wa; a.z -= nz * ov * wa; b.x += nx * ov * (1 - wa); b.z += nz * ov * (1 - wa);
        }
      }
    }
    // off the front edge
    for (i = 0; i < n; i++) {
      a = items[i]; if (a.st !== 'field') continue;
      if (a.z > ZE) { a.st = 'fall'; a.vy = 0; a.vz = 1.2 + Math.random() * 0.6; a.age = 0; if (silent) a.st = 'gone'; }
    }
    if (items.length > 40 && (items.length - fieldCount()) > 20) items = items.filter(function (q) { return q.st !== 'gone'; });
  }

  // ---------- dropping a coin
  var aimX = 0;
  function dropCoin(x, free) {
    if (!free && st.cup <= 0) { hud(); nudgeEmpty(); return false; }
    if (fieldCount() >= MAXC) return false;
    x = Math.max(-HX + R, Math.min(HX - R, x));
    var c = mk(x, Math.max(pf, PF_MID - PF_AMP) + R + 0.12 + Math.random() * 0.3, 'coin');
    c.st = 'drop'; c.y = 2.4; c.vy = 0;
    items.push(c);
    if (!free) {
      if (st.cup >= CUPMAX) st.t = Date.now();
      st.cup--; st.since++;
      maybePrize(x);
      save(); hud();
      if (calm) pushIdle = Math.max(pushIdle, PERIOD * 1.5);
      active();
    }
    clink(1.3, 0.35);
    return true;
  }
  // prizes: a fair chance with every coin, and never more than 8 coins without one
  function maybePrize(x) {
    var onField = items.filter(function (q) { return q.kind === 'prize' && q.st !== 'gone'; }).length;
    var all = D.chars.length, have = Object.keys(st.found).length;
    if (onField >= 2) return;
    var chance = have >= all ? 0.04 : st.since >= 8 ? 1 : 0.11;
    if (Math.random() >= chance) return;
    var pend = st.pending, open = D.chars.filter(function (c) { return !st.found[c.id] && pend.indexOf(c.id) < 0; });
    var pick;
    if (open.length && (st.dup >= 1 || Math.random() < 0.8)) pick = open[Math.floor(Math.random() * open.length)];
    else { var any = D.chars.filter(function (c) { return pend.indexOf(c.id) < 0; }); pick = any[Math.floor(Math.random() * any.length)]; }
    if (!pick) return;
    st.since = 0; st.pending.push(pick.id);
    var p = mk(Math.max(-HX + RP, Math.min(HX - RP, x + (Math.random() - 0.5) * 1.2)), Math.max(pf, PF_MID - PF_AMP) + RP + 0.2, 'prize', pick.id);
    p.st = 'drop'; p.y = 2.8; items.push(p);
    say('A medallion dropped in with your coin. Push it over the edge to meet who is on it.');
    if (view && view.prizeAdded) view.prizeAdded(p);
  }

  // ---------- what falls off the edge
  var burst = [], burstTimer = 0;
  function landed(a) {
    if (a.kind === 'prize') { gotPrize(a.pid); return; }
    st.meter++;
    if (st.meter % 3 === 0 && st.cup < CUPMAX) st.cup++;
    burst.push(st.meter); burstTimer = 1.1;
    trayAdd();
    chime(burst.length);
    sparkleAt(a.x, ZE + 0.6);
    save(); hud();
  }
  function endBurst() {
    var n = burst.length, first = burst[0] - 1, last = burst[n - 1]; burst = [];
    if (n >= 4) { shake(Math.min(1, n / 8)); lights('sparkle', 1.6); dropJingle(n); }
    var crossed5 = Math.floor(last / 5) > Math.floor(first / 5);
    if (!crossed5 && n < 4) return;
    var tier = n >= 7 ? 3 : n >= 4 ? 2 : 1;
    if (Math.floor(last / 100) > Math.floor(first / 100)) tier = 3;
    else if (Math.floor(last / 25) > Math.floor(first / 25)) tier = Math.max(tier, 2);
    if (crossed5 || tier > 1) showTip(tier, n);
    say(n + (n === 1 ? ' coin' : ' coins') + ' dropped. Kindness meter: ' + st.meter + '.');
  }

  // ---------- tips
  function toolLink(tip) {
    var name = tip.label, href = tip.href;
    if (tip.tool && window.TOLToolById) { try { var r = window.TOLToolById(tip.tool); if (r) { name = r.name || name; href = tip.href || r.href; } } catch (e) {} }
    return { name: name, href: href || '/tools.html' };
  }
  function pickTip(tier) {
    var seen = st.tips, pool = D.tips.filter(function (x) { return x.tier === tier && seen.indexOf(x.id) < 0; });
    if (!pool.length) pool = D.tips.filter(function (x) { return x.tier <= tier && seen.indexOf(x.id) < 0; });
    if (!pool.length) pool = D.tips.filter(function (x) { return seen.indexOf(x.id) < 0; });
    if (!pool.length) pool = D.tips.filter(function (x) { return x.tier === tier; });
    return pool[Math.floor(Math.random() * pool.length)];
  }
  var TIER_NAME = { 1: 'A kindness tip', 2: 'A deeper tip', 3: 'A rare tip' };
  function showTip(tier, n) {
    var tip = pickTip(tier); if (!tip) return;
    if (st.tips.indexOf(tip.id) < 0) st.tips.push(tip.id);
    save(); tipsList();
    var L = toolLink(tip);
    card('tip t' + tip.tier, (n >= 4 ? 'A big push of ' + n + ' coins · ' : '') + TIER_NAME[tip.tier], tip.t,
      '<p>' + esc(tip.b) + '</p><p class="cp-card-go"><a href="' + esc(L.href) + '">Read more: ' + esc(L.name) + ' <span aria-hidden="true">→</span></a></p>');
    bell(tip.tier);
  }

  // ---------- prizes found
  function charById(id) { for (var i = 0; i < D.chars.length; i++) if (D.chars[i].id === id) return D.chars[i]; return null; }
  function gotPrize(id) {
    var c = charById(id); st.pending = st.pending.filter(function (x) { return x !== id; });
    if (!c) { save(); return; }
    var isNew = !st.found[c.id];
    if (isNew) { st.found[c.id] = Date.now(); st.dup = 0; }
    else { st.dup++; st.cup = Math.min(CUPMAX + 5, st.cup + 3); }
    save(); hud(); shelf();
    var have = Object.keys(st.found).length, all = D.chars.length;
    var img = '<img class="cp-card-med" alt="" src="' + medURL(c, true) + '" width="88" height="88">';
    if (isNew) {
      card('prize', 'A new friend for your shelf · ' + have + ' of ' + all, c.name,
        img + '<p>' + esc(c.line) + '</p><p class="cp-card-go"><a href="' + esc(c.home) + '">Visit ' + esc(c.name.replace(/^The /, 'the ')) + ' in ' + esc(c.where) + ' <span aria-hidden="true">→</span></a></p>');
      fanfare(); lights('sparkle', 2.4); shake(0.5);
      say('New friend found: ' + c.name + '. ' + have + ' of ' + all + ' on your shelf.');
      if (have >= all && !st.done) setTimeout(wild, 1600);
    } else {
      card('prize', 'Hello again · 3 coins back in your cup', c.name, img + '<p>' + esc(c.name) + ' came back to say hello. ' + esc(c.line) + '</p>');
      bell(1);
    }
  }

  // ---------- the machine goes wild (every friend found)
  var wilding = false;
  function wild() {
    if (wilding) return; wilding = true;
    st.done = 1; save();
    wildUntil = t + 9;
    lights('wild', 9);
    jackpot();
    if (!calm) {
      confetti(220);
      for (var k = 0; k < 36; k++) setTimeout(function () { dropCoin((Math.random() - 0.5) * 2 * (HX - R), true); }, 120 + k * 70);
      shake(1);
    }
    if (view && view.dance) view.dance(9);
    main.classList.add('is-wild');
    setTimeout(function () { main.classList.remove('is-wild'); wilding = false; }, 9000);
    setTimeout(celebrate, calm ? 400 : 3800);
    say('You found every friend on the site. The machine is celebrating with you.');
  }
  function celebrate() {
    var box = $('#cp-celebrate'); if (!box) return;
    box.hidden = false;
    var row = $('#cp-cel-friends');
    if (row && !row.childNodes.length) D.chars.forEach(function (c, i) { var im = doc.createElement('img'); im.src = medURL(c, true); im.alt = ''; im.width = 48; im.height = 48; im.style.animationDelay = (i * 0.07) + 's'; row.appendChild(im); });
    var h = $('#cp-cel-h'); if (h) h.focus();
  }
  function share() {
    var o = { title: 'Kindness Coin Pusher', text: 'I found every friend on Spread Love & Acceptance in the Kindness Coin Pusher: Professor Puddles, Tidbit, Sugarfoot and the whole gang. A cozy arcade with a kind tip every few coins. Free, nothing to buy.', url: location.origin + '/coin-pusher.html', heading: 'Share the coin pusher' };
    if (window.TOLShareKit && window.TOLShareKit.shareText) { window.TOLShareKit.shareText(o); return; }
    var s = doc.createElement('script'); s.src = '/assets/js/share-kit.js';
    s.onload = function () { if (window.TOLShareKit && window.TOLShareKit.shareText) window.TOLShareKit.shareText(o); else if (window.TOLShare) window.TOLShare.share({ title: o.title, text: o.text, url: o.url }); };
    s.onerror = function () { if (navigator.share) navigator.share({ title: o.title, text: o.text, url: o.url }).catch(function () {}); };
    doc.head.appendChild(s);
  }

  // ---------- medallion pictures (made once per character)
  var medCache = {};
  function medCanvas(c, found, size) {
    var k = c.id + (found ? '1' : '0') + size; if (medCache[k]) return medCache[k];
    var cv = doc.createElement('canvas'); cv.width = cv.height = size; D.drawMedallion(cv, c, found ? undefined : false);
    medCache[k] = cv; return cv;
  }
  function medURL(c, found) { try { return medCanvas(c, found, 176).toDataURL('image/png'); } catch (e) { return ''; } }

  // ---------- HUD, shelf, tips list, cards
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var liveEl = $('#cp-live'), lastSay = 0;
  function say(s) { if (!liveEl) return; var now = Date.now(); if (now - lastSay < 900) return; lastSay = now; liveEl.textContent = s; }
  function hud() {
    var c = $('#cp-cup'); if (c) c.textContent = st.cup;
    var m = $('#cp-meter'); if (m) m.textContent = st.meter;
    var bar = $('#cp-meter-bar'); if (bar) { var p = (st.meter % 5) / 5; bar.style.width = (p * 100) + '%'; bar.parentNode.setAttribute('aria-valuenow', String(st.meter % 5)); }
    var nx = $('#cp-next'); if (nx) { var left = 5 - (st.meter % 5); nx.textContent = left === 1 ? '1 more coin to the next tip' : left + ' more coins to the next tip'; }
    var f = $('#cp-found'); if (f) f.textContent = Object.keys(st.found).length + ' of ' + D.chars.length;
    var tp = $('#cp-tips-n'); if (tp) tp.textContent = st.tips.length + ' of ' + D.tips.length;
    var b = $('#cp-drop'); if (b) { b.setAttribute('aria-disabled', st.cup <= 0 ? 'true' : 'false'); }
    var e = $('#cp-empty'); if (e) e.hidden = st.cup > 0;
  }
  function shelf() {
    var ul = $('#cp-shelf'); if (!ul) return;
    ul.innerHTML = '';
    D.chars.forEach(function (c) {
      var li = doc.createElement('li'), got = !!st.found[c.id];
      li.className = got ? 'is-found' : 'is-missing';
      if (got) li.innerHTML = '<a href="' + esc(c.home) + '"><img alt="" width="64" height="64" src="' + medURL(c, true) + '"><span class="cp-shelf-n">' + esc(c.name) + '</span><span class="cp-shelf-w">' + esc(c.where) + '</span></a>';
      else li.innerHTML = '<span class="cp-shelf-box"><img alt="" width="64" height="64" src="' + medURL(c, false) + '"><span class="cp-shelf-n">Not found yet</span></span>';
      ul.appendChild(li);
    });
    hud();
  }
  function tipsList() {
    var ul = $('#cp-tips'); if (!ul) return;
    ul.innerHTML = '';
    st.tips.forEach(function (id) {
      var tip = null; D.tips.forEach(function (x) { if (x.id === id) tip = x; }); if (!tip) return;
      var L = toolLink(tip), li = doc.createElement('li');
      li.innerHTML = '<b>' + esc(tip.t) + '</b> ' + esc(tip.b) + ' <a href="' + esc(L.href) + '">' + esc(L.name) + '</a>';
      ul.appendChild(li);
    });
    var none = $('#cp-tips-none'); if (none) none.hidden = st.tips.length > 0;
    hud();
  }
  var cardQ = [], cardOpen = false;
  function card(kind, kicker, title, html) { cardQ.push([kind, kicker, title, html]); if (!cardOpen) nextCard(); }
  function nextCard() {
    var box = $('#cp-card'); if (!box) return;
    var c = cardQ.shift(); if (!c) { cardOpen = false; box.classList.remove('is-up'); setTimeout(function () { if (!cardOpen) box.hidden = true; }, calm ? 0 : 300); return; }
    cardOpen = true;
    box.className = 'cp-card cp-' + c[0].split(' ').join(' cp-');
    $('#cp-card-k').textContent = c[1]; $('#cp-card-t').textContent = c[2]; $('#cp-card-b').innerHTML = c[3];
    box.hidden = false; void box.offsetWidth; box.classList.add('is-up');
  }
  function nudgeEmpty() { var e = $('#cp-empty'); if (e) { e.hidden = false; e.classList.remove('is-pulse'); void e.offsetWidth; if (!calm) e.classList.add('is-pulse'); } }

  // the refill clock and the "take a break" nudge
  var playMs = 0, lastActive = 0, breakShown = 0;
  function active() { lastActive = Date.now(); }
  setInterval(function () {
    if (doc.hidden) return;
    var changed = false;
    while (st.cup < CUPMAX && Date.now() - st.t >= REFILL) { st.cup++; st.t += REFILL; changed = true; }
    if (st.cup >= CUPMAX) st.t = Date.now();
    if (changed) { save(); hud(); }
    var e = $('#cp-refill'); if (e) { var s = Math.max(0, Math.ceil((REFILL - (Date.now() - st.t)) / 1000)); e.textContent = st.cup >= CUPMAX ? 'Your cup is full.' : 'Next coin in ' + s + ' s.'; }
    if (Date.now() - lastActive < 60000) playMs += 1000;
    if (playMs - breakShown >= 10 * 60000) { breakShown = playMs; var b = $('#cp-break'); if (b) b.hidden = false; }
  }, 1000);

  // ---------- sound (WebAudio, made here; nothing to download)
  var AC = null, master = null, sfx = null, musBus = null, humG = null, humO = null, musTimer = 0, musNext = 0, musStep = 0;
  function soundOn() { return !!st.snd && soundAllowed(); }
  function audio() {
    if (AC || !soundOn()) return AC;
    var Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return null;
    try { AC = new Ctx(); } catch (e) { return null; }
    var comp = AC.createDynamicsCompressor(); comp.connect(AC.destination);
    master = AC.createGain(); master.gain.value = 0.8; master.connect(comp);
    sfx = AC.createGain(); sfx.gain.value = 0.9; sfx.connect(master);
    musBus = AC.createGain(); musBus.gain.value = 0.32; musBus.connect(master);
    // the pusher's soft hum
    var lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
    humO = AC.createOscillator(); humO.type = 'triangle'; humO.frequency.value = 62;
    humG = AC.createGain(); humG.gain.value = 0;
    humO.connect(lp); lp.connect(humG); humG.connect(master); humO.start();
    startMusic();
    return AC;
  }
  function env(g, t0, a, peak, dec) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + dec); }
  function tone(freq, type, t0, a, peak, dec, bus) {
    if (!AC) return;
    var o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = freq;
    env(g, t0, a, peak, dec); o.connect(g); g.connect(bus || sfx); o.start(t0); o.stop(t0 + a + dec + 0.05);
  }
  function clink(pm, vol) {
    if (!soundOn() || !AC) return;
    var t0 = AC.currentTime + 0.005, m = (pm || 1) * (0.94 + Math.random() * 0.12), v = (vol || 0.5) * 0.16;
    tone(2650 * m, 'sine', t0, 0.002, v, 0.16); tone(3980 * m, 'sine', t0, 0.002, v * 0.6, 0.1); tone(1320 * m, 'triangle', t0, 0.002, v * 0.5, 0.05);
  }
  var PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5, 1568, 1760];
  function bellNote(f, t0, v) { tone(f, 'sine', t0, 0.004, v, 1.1); tone(f * 2.01, 'sine', t0, 0.004, v * 0.35, 0.5); tone(f * 3.98, 'sine', t0, 0.003, v * 0.12, 0.25); }
  function chime(n) { if (!soundOn() || !AC) return; var t0 = AC.currentTime + 0.01; bellNote(PENTA[Math.min(PENTA.length - 1, (n - 1) % 10)], t0, 0.09); clink(0.8, 0.3); }
  function bell(tier) { if (!soundOn() || !AC) return; var t0 = AC.currentTime + 0.05; [0, 2, 4].slice(0, tier + 1).forEach(function (k, i) { bellNote(PENTA[k + 2], t0 + i * 0.16, 0.08); }); }
  function dropJingle(n) { if (!soundOn() || !AC) return; var t0 = AC.currentTime + 0.02; for (var i = 0; i < Math.min(8, n + 2); i++) { bellNote(PENTA[i], t0 + i * 0.07, 0.07); clink(1 + i * 0.05, 0.25); } }
  function fanfare() {
    if (!soundOn() || !AC) return; var t0 = AC.currentTime + 0.05;
    [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { bellNote(f, t0 + i * 0.12, 0.1); tone(f / 2, 'triangle', t0 + i * 0.12, 0.01, 0.05, 0.4); });
    [523.25, 659.25, 783.99].forEach(function (f) { tone(f, 'sine', t0 + 0.5, 0.05, 0.05, 1.4); });
  }
  function jackpot() {
    if (!soundOn() || !AC) return; var t0 = AC.currentTime + 0.05;
    var mel = [523.25, 659.25, 783.99, 1046.5, 880, 1046.5, 1318.5, 1568, 1318.5, 1046.5, 1174.66, 1568, 2093];
    mel.forEach(function (f, i) { bellNote(f, t0 + i * 0.14, 0.09); });
    [261.63, 329.63, 392, 523.25].forEach(function (f) { tone(f, 'triangle', t0 + 1.9, 0.08, 0.05, 2.4); });
    for (var k = 0; k < 26; k++) (function (k) { setTimeout(function () { clink(0.9 + Math.random() * 0.5, 0.35); }, 200 + k * 110); })(k);
  }
  // a slow, warm jazz loop: soft electric-piano chords, a walking bass and a music-box tune on top
  var CHORDS = [[174.61, 220, 261.63, 329.63], [146.83, 174.61, 220, 261.63], [196, 233.08, 293.66, 349.23], [130.81, 164.81, 233.08, 293.66]];
  var BASS = [[87.31, 110, 130.81, 110], [73.42, 87.31, 110, 87.31], [98, 116.54, 146.83, 116.54], [65.41, 82.41, 98, 116.54]];
  var TUNE = [880, 0, 1046.5, 880, 783.99, 0, 698.46, 0, 659.25, 698.46, 0, 880, 783.99, 0, 0, 0, 587.33, 0, 698.46, 880, 932.33, 0, 880, 0, 783.99, 0, 659.25, 0, 698.46, 0, 0, 0];
  function startMusic() {
    if (!AC || musTimer) return;
    musNext = AC.currentTime + 0.15; musStep = 0;
    musTimer = setInterval(musTick, 60);
  }
  function stopMusic() { if (musTimer) { clearInterval(musTimer); musTimer = 0; } }
  function musTick() {
    if (!AC || doc.hidden) return;
    var beat = 60 / 76;
    while (musNext < AC.currentTime + 0.25) {
      var on = st.mus && soundOn();
      var bar = Math.floor(musStep / 8) % 4, s8 = musStep % 8, swing = (s8 % 2) ? beat * 0.16 : 0, tt = musNext + swing;
      if (on) {
        if (s8 === 0 || s8 === 5) CHORDS[bar].forEach(function (f) { tone(f, 'sine', tt, 0.03, 0.035, s8 === 0 ? 2.2 : 1.2, musBus); tone(f * 2, 'sine', tt, 0.01, 0.008, 0.6, musBus); });
        if (s8 % 2 === 0) tone(BASS[bar][s8 / 2], 'triangle', tt, 0.01, 0.07, beat * 0.9, musBus);
        var n = TUNE[musStep % 32]; if (n) { tone(n * 2, 'sine', tt, 0.003, 0.03, 0.7, musBus); tone(n * 4.02, 'sine', tt, 0.002, 0.006, 0.25, musBus); }
      }
      musNext += beat / 2; musStep++;
    }
  }
  function hum(speed) { if (!AC || !humG) return; var v = soundOn() ? Math.min(0.05, Math.abs(speed) * 1.4) : 0; humG.gain.setTargetAtTime(v, AC.currentTime, 0.15); humO.frequency.setTargetAtTime(58 + Math.abs(speed) * 300, AC.currentTime, 0.2); }
  function firstTap() { if (soundOn()) { audio(); if (AC && AC.state === 'suspended') AC.resume(); } }

  // ---------- light chase, shake, confetti, sparkles (shared by both views)
  var lightMode = 'idle', lightUntil = 0, shakeAmt = 0;
  function lights(mode, secs) { if (calm && mode !== 'idle') return; lightMode = mode; lightUntil = t + secs; }
  function shake(a) { if (calm) return; shakeAmt = Math.max(shakeAmt, a); }
  var fx = $('#cp-fx'), fxg = fx ? fx.getContext('2d') : null, parts = [];
  var CONF = ['#E9C46F', '#F2A98A', '#B9A2D9', '#8EC5EA', '#7DB07A', '#E2556A', '#FFF3CC'];
  function confetti(n) {
    if (calm || !fx) return;
    var w = fx.clientWidth, h = fx.clientHeight;
    for (var i = 0; i < n; i++) parts.push({ x: Math.random() * w, y: -20 - Math.random() * h * 0.6, vx: (Math.random() - 0.5) * 60, vy: 60 + Math.random() * 120, r: Math.random() * 6, vr: (Math.random() - 0.5) * 8, s: 4 + Math.random() * 6, c: CONF[i % CONF.length], life: 6, kind: 'c' });
  }
  function sparkleAt(x, z) {
    if (calm || !fx || !view) return;
    var p = view.project(x, -0.6, z); if (!p) return;
    for (var i = 0; i < 9; i++) { var an = Math.random() * 6.28, sp = 30 + Math.random() * 70; parts.push({ x: p[0], y: p[1], vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 30, r: 0, vr: 0, s: 2 + Math.random() * 3, c: '#FFE7A0', life: 0.7, kind: 's' }); }
  }
  function drawFx(dt) {
    if (!fxg) return;
    var dpr = fx.width / Math.max(1, fx.clientWidth);
    fxg.setTransform(dpr, 0, 0, dpr, 0, 0); fxg.clearRect(0, 0, fx.clientWidth, fx.clientHeight);
    if (!parts.length) return;
    var h = fx.clientHeight;
    parts = parts.filter(function (p) { p.life -= dt; return p.life > 0 && p.y < h + 30; });
    parts.forEach(function (p) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      if (p.kind === 'c') { p.vy += 30 * dt; fxg.save(); fxg.translate(p.x, p.y); fxg.rotate(p.r); fxg.fillStyle = p.c; fxg.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); fxg.restore(); }
      else { p.vy += 120 * dt; fxg.globalAlpha = Math.max(0, p.life / 0.7); fxg.fillStyle = p.c; fxg.beginPath(); fxg.arc(p.x, p.y, p.s, 0, 7); fxg.fill(); fxg.globalAlpha = 1; }
    });
  }
  // the bulbs: a colour for bulb i of n right now
  var WARM = [[255, 214, 150], [255, 180, 120], [255, 236, 200], [240, 160, 170], [200, 180, 240]];
  function bulb(i, n) {
    var mode = t < lightUntil ? lightMode : 'idle', k, v;
    if (calm) return [255, 222, 170, 0.75];
    if (mode === 'wild') { k = WARM[(i + Math.floor(t * 12)) % WARM.length]; v = ((i + Math.floor(t * 14)) % 3 === 0) ? 1 : 0.35; return [k[0], k[1], k[2], v]; }
    if (mode === 'sparkle') { v = Math.random() < 0.5 ? 1 : 0.4; return [255, 226, 160, v]; }
    v = 0.45 + 0.55 * Math.max(0, Math.sin(t * 2.2 - i * 0.55)); return [255, 214, 150, v];
  }

  // ---------- tray: the coins you've dropped, piled up
  var trayN = 0;
  function trayAdd() { trayN = Math.min(60, trayN + 1); if (view && view.tray) view.tray(trayN); }

  // =====================================================================================
  // the 3D view (three.js)
  // =====================================================================================
  var stage = $('#cp-stage'), canvas = null, view = null;
  function make3D() {
    var THREE = window.THREE; if (!THREE) return null;
    var cv = doc.createElement('canvas'); cv.className = 'cp-canvas';
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !PHONE, alpha: false, powerPreference: 'low-power' }); } catch (e) { return null; }
    var dprMax = PHONE ? 1.5 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprMax));
    renderer.outputEncoding = THREE.sRGBEncoding;
    var scene = new THREE.Scene();
    var cam = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    // a warm room for the metal to reflect
    (function () {
      var c = doc.createElement('canvas'); c.width = 256; c.height = 128; var g = c.getContext('2d');
      var gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#FFF1D6'); gr.addColorStop(0.35, '#E9B877'); gr.addColorStop(0.55, '#6B4430'); gr.addColorStop(1, '#2A1B14');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
      g.fillStyle = 'rgba(255,240,210,.9)'; for (var i = 0; i < 8; i++) { g.beginPath(); g.ellipse(16 + i * 32, 30, 9, 5, 0, 0, 7); g.fill(); }
      var tx = new THREE.CanvasTexture(c); tx.mapping = THREE.EquirectangularReflectionMapping; tx.encoding = THREE.sRGBEncoding;
      var pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(tx).texture; tx.dispose(); pm.dispose();
    })();
    function bg() { return root.getAttribute('data-theme') === 'dark' || (root.getAttribute('data-theme') !== 'light' && mm('(prefers-color-scheme: dark)')) ? 0x1F1A22 : 0xEFE4CF; }
    scene.background = new THREE.Color(bg());
    scene.add(new THREE.HemisphereLight(0xFFE9C7, 0x3A2A20, 0.7));
    var sun = new THREE.DirectionalLight(0xFFDDB0, 0.9); sun.position.set(-3, 9, 7); scene.add(sun);
    var glow = new THREE.PointLight(0xFFB86B, 0.9, 14, 2); glow.position.set(0, 3.2, -3.4); scene.add(glow);

    function canvasTex(w, h, paint) { var c = doc.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); var tx = new THREE.CanvasTexture(c); tx.encoding = THREE.sRGBEncoding; tx.anisotropy = 4; return tx; }
    var woodTex = canvasTex(256, 256, function (g, w, h) {
      g.fillStyle = '#7A4A2B'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 70; i++) { var y = Math.random() * h; g.strokeStyle = Math.random() < 0.5 ? 'rgba(40,20,10,.22)' : 'rgba(200,140,90,.18)'; g.lineWidth = 1 + Math.random() * 3; g.beginPath(); g.moveTo(0, y); for (var x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x / 40 + i) * 3); g.stroke(); }
    });
    woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
    var feltTex = canvasTex(128, 128, function (g, w, h) {
      g.fillStyle = '#2E5A4E'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 1600; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.05)'; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
    });
    feltTex.wrapS = feltTex.wrapT = THREE.RepeatWrapping; feltTex.repeat.set(4, 4);
    var wood = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.62, metalness: 0.05 });
    var woodDark = new THREE.MeshStandardMaterial({ map: woodTex, color: 0x8A6A58, roughness: 0.7 });
    var brass = new THREE.MeshStandardMaterial({ color: 0xD4A94E, metalness: 0.85, roughness: 0.3 });
    var felt = new THREE.MeshStandardMaterial({ map: feltTex, roughness: 0.95 });
    var glass = new THREE.MeshStandardMaterial({ color: 0xDDEEFF, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.1, depthWrite: false });
    function box(w, h, d, mat, x, y, z) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); scene.add(m); return m; }

    // the bed, the edge, the sides, the back
    var bedLen = ZE - ZB + 4;
    var bed = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, bedLen), felt); bed.rotation.x = -Math.PI / 2; bed.position.set(0, 0, (ZE + ZB - 4) / 2); scene.add(bed);
    box(HX * 2 + 0.1, 0.08, 0.12, brass, 0, -0.02, ZE + 0.02);
    box(HX * 2, 0.5, 0.1, woodDark, 0, -0.32, ZE + 0.02);
    [-1, 1].forEach(function (s) {
      box(0.06, 1.5, ZE - ZB + 1, glass, s * (HX + 0.05), 0.75, (ZE + ZB) / 2 + 0.3);
      box(0.12, 0.08, ZE - ZB + 1, brass, s * (HX + 0.05), 1.52, (ZE + ZB) / 2 + 0.3);
      box(0.9, 6.6, ZE - ZB + 3.2, wood, s * (HX + 0.55), 0.3, (ZE + ZB) / 2 + 0.2);
      box(0.1, 6.62, 0.1, brass, s * (HX + 0.12), 0.3, ZE + 1.75);
    });
    // the pusher: a wooden shelf with a brass face
    var pusher = new THREE.Group();
    var pBody = new THREE.Mesh(new THREE.BoxGeometry(HX * 2 - 0.04, 0.62, 6), wood); pBody.position.set(0, 0.31, -3); pusher.add(pBody);
    var pFace = new THREE.Mesh(new THREE.BoxGeometry(HX * 2 - 0.04, 0.12, 0.08), brass); pFace.position.set(0, 0.56, 0.0); pusher.add(pFace);
    scene.add(pusher);
    // the back wall with the sign and the bulbs
    box(HX * 2 + 0.2, 3.4, 0.4, woodDark, 0, 2.6, ZB - 0.2);
    var signTex = canvasTex(1024, 256, function (g, w, h) {
      var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5C2A2E'); gr.addColorStop(1, '#3A1C22'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#E9C46F'; g.lineWidth = 8; g.strokeRect(14, 14, w - 28, h - 28);
    });
    function paintSign() {
      var g = signTex.image.getContext('2d'), w = 1024, h = 256;
      var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5C2A2E'); gr.addColorStop(1, '#3A1C22'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#E9C46F'; g.lineWidth = 8; g.strokeRect(14, 14, w - 28, h - 28);
      g.fillStyle = '#FFE7B0'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '500 92px Fraunces, Georgia, serif'; g.fillText('Kindness Coin Pusher', w / 2, h / 2 - 14);
      g.font = '500 34px "IBM Plex Mono", monospace'; g.fillStyle = '#E9C46F'; g.fillText('A COZY ARCADE · EVERY COIN, A KIND IDEA', w / 2, h / 2 + 62);
      signTex.needsUpdate = true;
    }
    paintSign(); if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(paintSign);
    var sign = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 1.9), new THREE.MeshBasicMaterial({ map: signTex })); sign.position.set(0, 2.85, ZB + 0.01); scene.add(sign);
    var bulbs = [], bulbGeo = new THREE.SphereGeometry(0.11, 10, 8);
    (function () {
      var pts = [], i;
      for (i = 0; i <= 12; i++) pts.push([-4.05 + i * 8.1 / 12, 3.95]);
      for (i = 1; i <= 3; i++) pts.push([4.05, 3.95 - i * 2.2 / 3]);
      for (i = 11; i >= 0; i--) pts.push([-4.05 + i * 8.1 / 12, 1.75]);
      for (i = 2; i >= 1; i--) pts.push([-4.05, 3.95 - i * 2.2 / 3]);
      pts.forEach(function (p) { var m = new THREE.Mesh(bulbGeo, new THREE.MeshBasicMaterial({ color: 0xFFD696 })); m.position.set(p[0], p[1], ZB + 0.08); scene.add(m); bulbs.push(m); });
    })();
    // the drop rail across the back, where the coin goes in
    box(HX * 2, 0.08, 0.08, brass, 0, 2.55 - 0.9, -3.55);
    // the tray
    var trayZ = ZE + 1.0, trayY = -1.2;
    box(HX * 2 + 0.2, 0.1, 1.6, brass, 0, trayY - 0.05, trayZ);
    box(HX * 2 + 0.2, 0.36, 0.1, brass, 0, trayY + 0.13, trayZ + 0.8);
    box(HX * 2 + 1.9, 3, 0.4, wood, 0, trayY - 1.6, trayZ + 1.0);
    box(HX * 2 + 1.9, 0.12, 0.5, brass, 0, trayY + 0.0, trayZ + 1.05);

    // coins: one instanced mesh, heart on each face
    var heartTex = canvasTex(128, 128, function (g, w) {
      var gr = g.createRadialGradient(w * 0.4, w * 0.35, 4, w / 2, w / 2, w / 2); gr.addColorStop(0, '#FBE3A0'); gr.addColorStop(1, '#C8963A'); g.fillStyle = gr; g.fillRect(0, 0, w, w);
      g.strokeStyle = 'rgba(120,80,20,.55)'; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 10, 0, 7); g.stroke();
      g.fillStyle = 'rgba(150,95,25,.55)'; var x = w / 2, y = w / 2 + 2, s = 22;
      g.beginPath(); g.moveTo(x, y + s * 0.9); g.bezierCurveTo(x - s * 1.4, y, x - s * 0.7, y - s * 1.1, x, y - s * 0.35); g.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.4, y, x, y + s * 0.9); g.fill();
    });
    var coinSide = new THREE.MeshStandardMaterial({ color: 0xE2B24E, metalness: 0.8, roughness: 0.32 });
    var coinFace = new THREE.MeshStandardMaterial({ map: heartTex, metalness: 0.65, roughness: 0.35 });
    var coinGeo = new THREE.CylinderGeometry(R, R, COIN_H, 28);
    var coins = new THREE.InstancedMesh(coinGeo, [coinSide, coinFace, coinFace], MAXC + 8); coins.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(coins);
    var trayCoins = new THREE.InstancedMesh(coinGeo, [coinSide, coinFace, coinFace], 60); trayCoins.count = 0; scene.add(trayCoins);
    var trayPos = []; for (var i = 0; i < 60; i++) trayPos.push([(Math.random() - 0.5) * (HX * 2 - 0.8), trayZ - 0.55 + Math.random() * 1.1, Math.random() * 6, (Math.random() - 0.5) * 0.4, Math.floor(i / 22)]);
    var ghost = new THREE.Mesh(coinGeo, new THREE.MeshStandardMaterial({ color: 0xF2CC72, metalness: 0.6, roughness: 0.3, transparent: true, opacity: 0.55 })); scene.add(ghost);
    // prize medallions
    var prizeMeshes = {}, prizeGeo = new THREE.CylinderGeometry(RP, RP, PRIZE_H, 36);
    function prizeMesh(p) {
      if (prizeMeshes[p.pid + p.spin]) return prizeMeshes[p.pid + p.spin];
      var c = charById(p.pid); if (!c) return null;
      var tx = new THREE.CanvasTexture(medCanvas(c, true, 256)); tx.encoding = THREE.sRGBEncoding;
      var top = new THREE.MeshStandardMaterial({ map: tx, metalness: 0.2, roughness: 0.5 });
      var m = new THREE.Mesh(prizeGeo, [brass, top, brass]); scene.add(m); prizeMeshes[p.pid + p.spin] = m; return m;
    }
    // the friends who dance on top when the machine goes wild
    var dancers = [], danceUntil = 0;
    function dance(secs) {
      danceUntil = t + secs;
      if (!dancers.length) D.chars.forEach(function (c, i) {
        var tx = new THREE.CanvasTexture(medCanvas(c, true, 256)); tx.encoding = THREE.sRGBEncoding;
        var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true })); s.scale.set(0.85, 0.85, 1);
        s.userData.i = i; scene.add(s); dancers.push(s);
      });
      dancers.forEach(function (s) { s.visible = true; });
    }

    var M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1), V = new THREE.Vector3();
    var camBase = new THREE.Vector3(), camLook = new THREE.Vector3(0, 0.1, 0.2), W = 0, H = 0;
    function resize() {
      var w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
      W = w; H = h; renderer.setSize(w, h, false); cam.aspect = w / h;
      // keep the whole machine in view, phone or desktop
      var want = 12.6, vf = 2 * Math.atan(Math.tan(21 * Math.PI / 180) * Math.max(1, 1.25 / cam.aspect));
      cam.fov = vf * 180 / Math.PI; cam.updateProjectionMatrix();
      var dist = (want / 2) / (Math.tan(vf / 2) * cam.aspect); dist = Math.max(dist, 11.5);
      camBase.set(0, dist * 0.62, dist * 0.78).add(camLook);
      sizeFx();
    }
    function render(dt) {
      // shake
      var sx = 0, sy = 0; if (shakeAmt > 0.01) { sx = (Math.random() - 0.5) * shakeAmt * 0.18; sy = (Math.random() - 0.5) * shakeAmt * 0.12; shakeAmt *= Math.pow(0.02, dt); } else shakeAmt = 0;
      cam.position.set(camBase.x + sx, camBase.y + sy, camBase.z); cam.lookAt(camLook);
      pusher.position.z = pf;
      var n = 0, i, a;
      var seen = {};
      for (i = 0; i < items.length; i++) {
        a = items[i]; if (a.st === 'gone') continue;
        var h = a.kind === 'prize' ? PRIZE_H : COIN_H;
        P.set(a.x, a.y + h / 2 + 0.001, a.z);
        E.set(a.tilt, a.spin, 0); Q.setFromEuler(E);
        if (a.kind === 'prize') { var pm = prizeMesh(a); if (pm) { pm.position.copy(P); pm.quaternion.copy(Q); pm.visible = true; seen[a.pid + a.spin] = 1; } continue; }
        if (n >= MAXC + 8) continue;
        M.compose(P, Q, S1); coins.setMatrixAt(n++, M);
      }
      coins.count = n; coins.instanceMatrix.needsUpdate = true;
      for (var k in prizeMeshes) if (!seen[k]) { scene.remove(prizeMeshes[k]); delete prizeMeshes[k]; }
      ghost.position.set(aimX, 1.62 + 0.18 + Math.sin(t * 3) * 0.04, -3.55 + 0.25); ghost.rotation.set(Math.PI / 2 * 0.85, 0, 0); ghost.visible = st.cup > 0;
      for (i = 0; i < bulbs.length; i++) { var b = bulb(i, bulbs.length); bulbs[i].material.color.setRGB(b[0] / 255 * (0.35 + 0.65 * b[3]), b[1] / 255 * (0.35 + 0.65 * b[3]), b[2] / 255 * (0.35 + 0.65 * b[3])); }
      glow.intensity = (t < lightUntil && lightMode === 'wild') ? 1.2 + Math.sin(t * 20) * 0.4 : 0.9;
      if (dancers.length) {
        var on = t < danceUntil;
        dancers.forEach(function (s, j) {
          s.visible = on; if (!on) return;
          var col = j % 11, row = Math.floor(j / 11);
          s.position.set(-4.2 + col * 0.84, 4.7 + row * 0.9 + Math.abs(Math.sin(t * 6 + j)) * 0.35, ZB - 0.1 + row * 0.2);
          s.material.rotation = Math.sin(t * 5 + j) * 0.3;
        });
      }
      renderer.render(scene, cam);
    }
    function tray(nc) {
      trayCoins.count = nc;
      for (var j = 0; j < nc; j++) { var q = trayPos[j]; P.set(q[0], trayY + 0.08 + q[4] * 0.12, q[1]); E.set(q[3], q[2], 0); Q.setFromEuler(E); M.compose(P, Q, S1); trayCoins.setMatrixAt(j, M); }
      trayCoins.instanceMatrix.needsUpdate = true;
    }
    var ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.3), hit = new THREE.Vector3(), ndc = new THREE.Vector2();
    function aimFrom(cx, cy) {
      var r = cv.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, cam); if (!ray.ray.intersectPlane(plane, hit)) return null; return hit.x;
    }
    function project(x, y, z) { V.set(x, y, z).project(cam); if (V.z > 1) return null; return [(V.x + 1) / 2 * W, (1 - V.y) / 2 * H]; }
    function theme() { scene.background.set(bg()); }
    function dispose() { renderer.dispose(); }
    return { canvas: cv, resize: resize, render: render, aimFrom: aimFrom, project: project, tray: tray, dance: dance, theme: theme, dispose: dispose, kind: '3d' };
  }

  // =====================================================================================
  // the flat, calm view (2D canvas, seen from above)
  // =====================================================================================
  function make2D() {
    var cv = doc.createElement('canvas'); cv.className = 'cp-canvas';
    var g = cv.getContext('2d'), W = 0, H = 0, sc = 1, ox = 0, oz = 0, dpr = 1, nTray = 0, danceUntil = 0;
    var Z0 = PF_MID - PF_AMP - 0.6, Z1 = ZE + 1.5;
    function resize() {
      W = stage.clientWidth; H = stage.clientHeight; if (!W || !H) return;
      dpr = Math.min(window.devicePixelRatio || 1, PHONE ? 1.5 : 2);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      sc = Math.min((W - 24) / (HX * 2 + 1.2), (H - 20) / (Z1 - Z0)); ox = W / 2; oz = (H - (Z1 - Z0) * sc) / 2 - Z0 * sc;
      sizeFx();
    }
    function X(x) { return ox + x * sc; } function Y(z) { return oz + z * sc; }
    function dark() { return root.getAttribute('data-theme') === 'dark' || (root.getAttribute('data-theme') !== 'light' && mm('(prefers-color-scheme: dark)')); }
    function coin(x, y, r, a) {
      g.globalAlpha = a; var gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
      gr.addColorStop(0, '#FBE3A0'); gr.addColorStop(1, '#C8963A'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      g.strokeStyle = 'rgba(120,80,20,.5)'; g.lineWidth = Math.max(1, r * 0.1); g.beginPath(); g.arc(x, y, r * 0.8, 0, 7); g.stroke(); g.globalAlpha = 1;
    }
    function render() {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = dark() ? '#1F1A22' : '#EFE4CF'; g.fillRect(0, 0, W, H);
      // cabinet sides and bed
      g.fillStyle = '#7A4A2B'; g.fillRect(X(-HX) - 14, Y(Z0) - 6, HX * 2 * sc + 28, (Z1 - Z0) * sc + 12);
      g.fillStyle = '#2E5A4E'; g.fillRect(X(-HX), Y(Z0), HX * 2 * sc, (ZE - Z0) * sc);
      // pusher
      g.fillStyle = '#8A5A3A'; g.fillRect(X(-HX), Y(Z0), HX * 2 * sc, (pf - Z0) * sc);
      g.fillStyle = '#D4A94E'; g.fillRect(X(-HX), Y(pf) - 3, HX * 2 * sc, 3);
      // edge and tray
      g.fillStyle = '#D4A94E'; g.fillRect(X(-HX), Y(ZE), HX * 2 * sc, 4);
      g.fillStyle = '#5C3A24'; g.fillRect(X(-HX), Y(ZE) + 4, HX * 2 * sc, (Z1 - ZE) * sc - 8);
      for (var j = 0; j < Math.min(nTray, 30); j++) coin(X(-HX + 0.5 + ((j * 2.37) % (HX * 2 - 1))), Y(ZE + 0.55 + ((j * 0.61) % 0.6)), R * sc * 0.8, 0.9);
      // aim
      if (st.cup > 0) { g.globalAlpha = 0.5; coin(X(aimX), Y(Z0) + 10, R * sc, 0.55); g.globalAlpha = 1; }
      for (var i = 0; i < items.length; i++) {
        var a = items[i]; if (a.st === 'gone') continue;
        var alpha = a.st === 'fall' ? Math.max(0, 1 + a.y) : a.st === 'drop' ? Math.max(0.2, 1 - a.y / 2.6) : 1;
        if (a.kind === 'prize') { var c = charById(a.pid); if (c) { g.globalAlpha = alpha; g.drawImage(medCanvas(c, true, 128), X(a.x) - RP * sc, Y(a.z) - RP * sc, RP * 2 * sc, RP * 2 * sc); g.globalAlpha = 1; } }
        else coin(X(a.x), Y(a.z), R * sc, alpha);
      }
      if (t < danceUntil) {
        var n = D.chars.length, s = Math.min(36, (W - 20) / 11);
        D.chars.forEach(function (c, k) { g.drawImage(medCanvas(c, true, 128), W / 2 - 5.5 * s + (k % 11) * s, 6 + Math.floor(k / 11) * s, s - 2, s - 2); });
      }
    }
    function aimFrom(cx) { var r = cv.getBoundingClientRect(); return ((cx - r.left) / r.width * W - ox) / sc; }
    function project(x, y, z) { return [X(x), Y(z)]; }
    return { canvas: cv, resize: resize, render: render, aimFrom: aimFrom, project: project, tray: function (n) { nTray = n; }, dance: function (s) { danceUntil = t + s; }, theme: function () {}, dispose: function () {}, kind: '2d' };
  }

  function sizeFx() { if (!fx) return; var d = Math.min(window.devicePixelRatio || 1, 2); fx.width = Math.round(stage.clientWidth * d); fx.height = Math.round(stage.clientHeight * d); }

  // ---------- choose and mount a view
  function wantFlat() { return calm || st.view === 'flat' || !window.THREE; }
  function mount() {
    if (view) { view.dispose(); if (view.canvas.parentNode) view.canvas.parentNode.removeChild(view.canvas); }
    view = (!wantFlat() && make3D()) || make2D();
    canvas = view.canvas;
    canvas.setAttribute('aria-hidden', 'true');
    stage.insertBefore(canvas, stage.firstChild);
    stage.classList.toggle('is-flat', view.kind === '2d');
    view.resize(); view.tray(trayN);
    var vb = $('#cp-view'); if (vb) { vb.setAttribute('aria-pressed', String(view.kind === '2d')); vb.querySelector('b').textContent = view.kind === '2d' ? 'flat' : '3D'; vb.hidden = !window.THREE || calm; }
    var cn = $('#cp-calm-note'); if (cn) cn.hidden = !calm;
  }

  // ---------- input: tap where to drop, or use the buttons and arrow keys
  function aimTo(x) { if (x == null || isNaN(x)) return; aimX = Math.max(-HX + R, Math.min(HX - R, x)); }
  stage.addEventListener('pointerdown', function (e) {
    if (e.target.closest && e.target.closest('.cp-card, .cp-hud, button, a')) return;
    firstTap(); aimTo(view.aimFrom(e.clientX, e.clientY)); dropCoin(aimX);
  });
  stage.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' && !(e.target.closest && e.target.closest('.cp-card'))) aimTo(view.aimFrom(e.clientX, e.clientY)); });
  $('#cp-drop').addEventListener('click', function () { firstTap(); dropCoin(aimX); });
  $('#cp-left').addEventListener('click', function () { firstTap(); aimTo(aimX - 0.8); active(); });
  $('#cp-right').addEventListener('click', function () { firstTap(); aimTo(aimX + 0.8); active(); });
  stage.addEventListener('keydown', function (e) {
    if (e.target !== stage) return;
    if (e.key === 'ArrowLeft') { aimTo(aimX - 0.5); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { aimTo(aimX + 0.5); e.preventDefault(); }
    else if (e.key === ' ' || e.key === 'Enter') { firstTap(); dropCoin(aimX); e.preventDefault(); }
  });
  doc.addEventListener('pointerdown', firstTap, { once: true, capture: true });
  doc.addEventListener('keydown', firstTap, { once: true, capture: true });
  $('#cp-card-x').addEventListener('click', function () { nextCard(); });

  // ---------- the bar: sound, music, view
  function syncBar() {
    var s = $('#cp-sound'), m = $('#cp-music'), allowed = soundAllowed();
    s.setAttribute('aria-pressed', String(!!st.snd && allowed)); s.querySelector('b').textContent = st.snd && allowed ? 'on' : 'off';
    m.setAttribute('aria-pressed', String(!!st.mus && !!st.snd && allowed)); m.querySelector('b').textContent = st.mus && st.snd && allowed ? 'on' : 'off';
    s.disabled = !allowed; m.disabled = !allowed || !st.snd;
    var q = $('#cp-quiet-note'); if (q) q.hidden = allowed;
    if (master && AC) master.gain.setTargetAtTime(soundOn() ? 0.8 : 0, AC.currentTime, 0.05);
  }
  $('#cp-sound').addEventListener('click', function () { st.snd = st.snd ? 0 : 1; save(); if (st.snd) { audio(); if (AC && AC.state === 'suspended') AC.resume(); } syncBar(); });
  $('#cp-music').addEventListener('click', function () { st.mus = st.mus ? 0 : 1; save(); syncBar(); });
  $('#cp-view').addEventListener('click', function () { st.view = st.view === 'flat' ? '3d' : 'flat'; save(); mount(); });
  $('#cp-break-ok').addEventListener('click', function () { $('#cp-break').hidden = true; });
  $('#cp-break-rest').addEventListener('click', function () {
    $('#cp-break').hidden = true; resting = true; stopLoop(); if (AC) AC.suspend();
    var r = $('#cp-rest'); if (r) { r.hidden = false; $('#cp-rest-back').focus(); }
  });
  $('#cp-rest-back').addEventListener('click', function () { resting = false; $('#cp-rest').hidden = true; if (AC && soundOn()) AC.resume(); startLoop(); });
  $('#cp-share').addEventListener('click', share);
  $('#cp-cel-close').addEventListener('click', function () { $('#cp-celebrate').hidden = true; stage.focus(); });
  $('#cp-reset').addEventListener('click', function () {
    if (!window.confirm('Start over? This clears your coins, your shelf of friends and the tips you have found, on this device.')) return;
    try { localStorage.removeItem(KEY); } catch (e) {}
    location.hash = ''; location.reload();
  });
  window.addEventListener('tol-quiet', syncBar);
  doc.addEventListener('tol-still', function () { var c = stillChosen(); if (c !== calm) { calm = c; if (calm) { parts = []; shakeAmt = 0; } mount(); } });
  if (window.matchMedia) { try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { view && view.theme(); }); } catch (e) {} }
  new MutationObserver(function () { view && view.theme(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  // ---------- the loop (stops while the tab is hidden)
  var raf = 0, last = 0, acc = 0, resting = false, humTick = 0, frames = [];
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60; last = now;
    frames.push(dt); if (frames.length > 120) frames.shift();
    acc += dt; var steps = 0;
    while (acc >= 1 / 60 && steps < 6) { step(1 / 60); acc -= 1 / 60; steps++; }
    if (steps === 6) acc = 0;
    if (burstTimer > 0) { burstTimer -= dt; if (burstTimer <= 0) endBurst(); }
    if ((humTick += dt) > 0.12) { humTick = 0; hum((pf - pfPrev) * 60 / 6); }
    view.render(dt); drawFx(dt);
  }
  function startLoop() { if (!raf && !resting && !doc.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
  function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  doc.addEventListener('visibilitychange', function () {
    if (doc.hidden) { stopLoop(); if (AC && AC.state === 'running') AC.suspend(); }
    else { startLoop(); if (AC && soundOn() && !resting) AC.resume(); }
  });
  var rT = 0; window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(function () { view && view.resize(); }, 120); });

  // for checks: window.TOLCoinPusher.stats()
  window.TOLCoinPusher = {
    stats: function () { var s = frames.slice().sort(function (a, b) { return a - b; }); return { view: view && view.kind, calm: calm, coins: fieldCount(), meter: st.meter, cup: st.cup, found: Object.keys(st.found).length, tips: st.tips.length, p50: s[Math.floor(s.length / 2)] * 1000, p95: s[Math.floor(s.length * 0.95)] * 1000 }; },
    drop: function (x) { return dropCoin(x == null ? aimX : x); }
  };

  // ---------- go
  prefill(); mount(); shelf(); tipsList(); syncBar(); hud(); startLoop();
  main.classList.add('is-ready');
  if (DEBUG_ALL) setTimeout(wild, 900);
})();
