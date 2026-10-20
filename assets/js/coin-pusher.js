/* coin-pusher.js — the Kindness Coin Pusher (/coin-pusher.html): a cozy 3D coin pusher.
   Tap where to drop a coin. The pusher slides back and forth, and every coin that falls off the front edge
   fills the kindness meter (every 3 put a coin back in your cup). Now and then a medallion with one of the
   site's 22 friends rides along with the coins. Each friend you push over the edge brings a celebration that
   grows as your shelf fills (friends 1-5, 6-10, 11-15, 16-21), and the 22nd brings the big finale: a long,
   wild show, a trophy kept on this device, and a "Replay the moment" button.
   game19: tips are rare now (the first after about a minute of play, then at most one every 4 minutes, never
   during a celebration) and can be switched off. Coins bounce when they land, wobble on the edge, tumble as
   they fall; a combo counter counts a push, and a near miss gets a little "So close!".
   Calm: reduced motion, "Keep the page still" or Quiet mode turn every celebration into a short, still banner
   (no shaking, no flashes, no confetti). Nothing flashes faster than 3 times a second.

   - One simple simulation (circles on a flat bed, a sliding pusher, friction, an open front edge), drawn two ways:
     three.js (r128, from cdnjs) for the cabinet, or a flat, calm view on a 2D canvas. The flat view is used with
     "Keep the page still", the device's reduce-motion setting, or when three.js can't load (offline).
   - All sound is made here with WebAudio, and only starts after the first tap. Quiet mode or site sounds off
     keep it silent. It pauses when the tab is hidden.
   - No money, nothing to buy. Coins refill slowly by themselves.
   - Kept on this device only: localStorage "tol-coin-v1" { cup, t, meter, found{id:time}, tips[], pending[], since, dup, snd, mus, view, done,
     tipsOff (game19: 1 when tips are switched off), lastTip (game19: when the last tip showed), trophy (game19: when all 22 were found) }.
   - #debug-all shows the full-collection celebration (nothing is saved while it runs).
   - Test hooks: TOLCoinPusher.celebrate(n) plays the celebration for friend n of 22 (22: the finale) without saving;
     TOLCoinPusher.give(k) really finds k more friends; TOLCoinPusher.stats(). */
(function () {
  'use strict';
  var D = window.TOLCoinData; if (!D) return;
  var doc = document, root = doc.documentElement;
  var $ = function (s) { return doc.querySelector(s); };
  var main = $('#cp'); if (!main) return;

  // ---------- the world (units: one coin is 0.84 across)
  var HX = 4.6, ZB = -5.5, ZE = 3.6, R = 0.42, RP = 0.6, COIN_H = 0.16, PRIZE_H = 0.22;
  var PF_MID = -2.6, PF_AMP = 1.0, PERIOD = 4.2, MAXC = 128;
  var CUPMAX = 40, REFILL = 8000, KEY = 'tol-coin-v1';  // tools16: a bigger cup that refills faster (was 30 coins, one every 15 s)
  var DEBUG_ALL = /#debug-all\b/.test(location.hash);
  var mm = window.matchMedia ? function (q) { return window.matchMedia(q).matches; } : function () { return false; };
  var PHONE = mm('(pointer: coarse)') || mm('(max-width: 700px)');

  // ---------- saved state
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  var st = load() || {};
  st.cup = typeof st.cup === 'number' ? st.cup : CUPMAX; st.t = st.t || Date.now(); st.meter = st.meter || 0;
  st.found = st.found || {}; st.tips = st.tips || []; st.pending = st.pending || []; st.since = st.since || 0; st.dup = st.dup || 0;
  st.lastTip = st.lastTip || 0; st.tipsOff = st.tipsOff ? 1 : 0;
  // someone who found everyone before the trophy existed gets it too, dated to their last find
  if (st.done && !st.trophy) { var lastFind = 0; for (var fk in st.found) lastFind = Math.max(lastFind, +st.found[fk] || 0); st.trophy = lastFind || Date.now(); }
  // sound and music start on, except for someone who has Quiet mode (or site sounds off) on: then they start off and stay
  // off until they're switched on here, even after Quiet mode is turned off (tools16)
  var quietAtStart = window.TOLQuiet ? !window.TOLQuiet.sound() : root.classList.contains('tol-quiet');
  if (st.snd == null) st.snd = quietAtStart ? 0 : 1; if (st.mus == null) st.mus = quietAtStart ? 0 : 1;
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
  // celebrations are calm with a still page, or in Quiet mode
  function celCalm() { if (calm) return true; try { return !!(window.TOLQuiet && window.TOLQuiet.on && window.TOLQuiet.on()); } catch (e) { return false; } }

  // ---------- the simulation
  var items = [], t = 0, pf = PF_MID - PF_AMP, pfPrev = pf, pushT = 0, pushIdle = 0, wildUntil = 0, pushDir = 0;
  function pusherAt(tt) { return PF_MID + PF_AMP * Math.sin(tt * 2 * Math.PI / PERIOD - Math.PI / 2); }
  function mk(x, z, kind, pid) { return { x: x, z: z, px: x, pz: z, r: kind === 'prize' ? RP : R, kind: kind, pid: pid || '', st: 'field', y: 0, vy: 0, vz: 0, tilt: 0, spin: Math.random() * 6, age: 0 }; }
  function prefill() {
    // a full bed, packed right up to the edge, so the first few coins already nudge some over (like a real machine)
    var gap = 2 * R + 0.02, rows = 0;
    for (var z = ZE - 0.04; z > PF_MID + PF_AMP + R; z -= gap * 0.87) {
      var off = (rows++ % 2) ? gap / 2 : 0;
      for (var x = -HX + R + off; x <= HX - R; x += gap) if (Math.random() < 0.96) items.push(mk(x + (Math.random() - 0.5) * 0.04, z - Math.random() * 0.05, 'coin'));
    }
    st.pending = st.pending.filter(function (id, i, a) { return a.indexOf(id) === i && charById(id); }).slice(0, 3);
    st.pending.forEach(function (id, i) { items.push(mk(-2.5 + i * 2.5 + Math.random() * 0.5, ZE - 2.2 + Math.random() * 0.4, 'prize', id)); });
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
      if (a.st === 'drop') {
        a.vy -= 22 * dt; a.y += a.vy * dt;
        if (a.y <= 0) {
          // one little bounce, then it settles (two clinks: the land and the bounce)
          if (!a.bounced && a.vy < -3) { a.bounced = true; a.y = 0.001; a.vy = -a.vy * 0.24; a.spin += 0.6; if (!silent) clink(a.kind === 'prize' ? 0.7 : 1, 0.6); }
          else { a.y = 0; a.st = 'field'; a.px = a.x; a.pz = a.z; if (!silent) clink(a.kind === 'prize' ? 0.75 : 1.08, 0.3); }
        }
        continue;
      }
      if (a.st === 'fall') {
        // tumbling over the edge: a forward tip, a spin and a little roll
        a.age += dt; a.vy -= 14 * dt; a.y += a.vy * dt; a.z += a.vz * dt; a.x += (a.vx || 0) * dt; a.tilt = Math.min(2.6, a.tilt + dt * 6);
        a.spin += (a.vs || 0) * dt; a.roll = (a.roll || 0) + (a.vr || 0) * dt;
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
      if (a.z > ZE) { a.st = 'fall'; a.vy = 0; a.vz = 1.2 + Math.random() * 0.6; a.age = 0; a.vx = (Math.random() - 0.5) * 0.5; a.vs = (Math.random() - 0.5) * 10; a.vr = (Math.random() - 0.5) * 5; if (silent) a.st = 'gone'; }
    }
    // a near miss: the pusher turns back while coins (or a medallion) hang right on the edge
    var dir = pf > pfPrev + 1e-6 ? 1 : pf < pfPrev - 1e-6 ? -1 : pushDir;
    if (!silent && pushDir === 1 && dir === -1) {
      var hang = 0, prizeHang = false;
      for (i = 0; i < n; i++) { a = items[i]; if (a.st === 'field' && a.z > ZE - a.r * 0.45) { hang++; if (a.kind === 'prize') prizeHang = true; } }
      if (prizeHang || hang >= 3) nearMiss(prizeHang);
    }
    pushDir = dir;
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
  // prizes: a fair chance with every coin, and never more than 6 coins without one
  function maybePrize(x) {
    var onField = items.filter(function (q) { return q.kind === 'prize' && q.st !== 'gone'; }).length;
    var all = D.chars.length, have = Object.keys(st.found).length;
    if (onField >= 3) return;
    var chance = have >= all ? 0.04 : st.since >= 6 ? 1 : 0.14;
    if (Math.random() >= chance) return;
    var pend = st.pending, open = D.chars.filter(function (c) { return !st.found[c.id] && pend.indexOf(c.id) < 0; });
    var pick;
    if (open.length && (st.dup >= 1 || Math.random() < 0.8)) pick = open[Math.floor(Math.random() * open.length)];
    else { var any = D.chars.filter(function (c) { return pend.indexOf(c.id) < 0; }); pick = any[Math.floor(Math.random() * any.length)]; }
    if (!pick) return;
    st.since = 0; st.pending.push(pick.id);
    // a medallion bounces in and lands toward the front, so it reaches the edge in a few dozen coins, not hundreds
    var p = mk(Math.max(-HX + RP, Math.min(HX - RP, x + (Math.random() - 0.5) * 1.6)), ZE - 1.3 - Math.random() * 0.7, 'prize', pick.id);
    p.st = 'drop'; p.y = 2.8; items.push(p);
    say('A medallion dropped in with your coin. Push it over the edge to meet who is on it.');
    if (view && view.prizeAdded) view.prizeAdded(p);
  }

  // ---------- what falls off the edge
  var burst = [], burstTimer = 0, burstAge = 0;
  function landed(a) {
    if (a.kind === 'prize') { gotPrize(a.pid); return; }
    st.meter++;
    if (st.meter % 3 === 0 && st.cup < CUPMAX) st.cup++;
    if (!burst.length) burstAge = 0;
    burst.push(st.meter); burstTimer = 0.8;
    trayAdd();
    chime(burst.length); thunk();
    sparkleAt(a.x, ZE + 0.6);
    combo(burst.length);
    save(); hud();
  }
  function endBurst() {
    var n = burst.length; burst = [];
    comboEnd(n);
    if (n >= 5 && !celebrating()) { shake(Math.min(1, n / 10)); lights('sparkle', 1.6); dropJingle(n); }
    // a tip only now and then: after about a minute of play, then at most one every few minutes, never during a
    // celebration, and never once tips are switched off. Bigger pushes still bring deeper ones.
    if (tipReady()) showTip(n >= 9 ? 3 : n >= 5 ? 2 : 1, n);
    if (n >= 2) say(n + ' coins dropped. Kindness meter: ' + st.meter + '.');
  }
  var TIP_FIRST = 60000, TIP_GAP = 4 * 60000;
  function tipReady() { return !st.tipsOff && !celebrating() && playMs >= TIP_FIRST && Date.now() - st.lastTip >= TIP_GAP; }

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
    st.lastTip = Date.now();
    save(); tipsList();
    var L = toolLink(tip);
    card('tip t' + tip.tier, (n >= 5 ? 'A big push of ' + n + ' coins · ' : '') + TIER_NAME[tip.tier], tip.t,
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
    else { st.dup++; st.cup = Math.max(st.cup, Math.min(CUPMAX + 5, st.cup + 3)); }
    save(); hud(); shelf();
    var have = Object.keys(st.found).length, all = D.chars.length;
    var img = '<img class="cp-card-med" alt="" src="' + medURL(c, true) + '" width="88" height="88">';
    if (isNew) {
      card('prize', 'A new friend for your shelf · ' + have + ' of ' + all, c.name,
        img + '<p>' + esc(c.line) + '</p><p class="cp-card-go"><a href="' + esc(c.home) + '">Visit ' + esc(c.name.replace(/^The /, 'the ')) + ' in ' + esc(c.where) + ' <span aria-hidden="true">→</span></a></p>');
      say('New friend found: ' + c.name + '. ' + have + ' of ' + all + ' on your shelf.');
      if (have >= all && !st.done) { st.done = 1; st.trophy = st.trophy || Date.now(); save(); trophyNote(); queueCel(all, c, false); }
      else queueCel(have, c, false);
    } else {
      card('prize', 'Hello again · 3 coins back in your cup', c.name, img + '<p>' + esc(c.name) + ' came back to say hello. ' + esc(c.line) + '</p>');
      bell(1);
    }
  }

  // ---------- celebrations: one for every new friend, bigger as the shelf fills, and a finale for all 22
  //   tier 1 (friends 1-5)    a banner with the friend, sparkles at the edge, a little fanfare
  //   tier 2 (6-10)           + confetti, one soft flash, a small shake, the friends you've found cheering along the bottom
  //   tier 3 (11-15)          + fireworks, the lights chase, Tidbit and Sugarfoot cheering, an extra music layer
  //   tier 4 (16-21)          + a shower of free coins, more fireworks, every found friend dancing on the cabinet, two music layers
  //   the finale (all 22)     about 22 seconds: flashes (two, far apart), waves of fireworks and confetti, a coin rain,
  //                           all 22 friends dancing and parading, every music layer, then the trophy
  // Calm (reduced motion, "Keep the page still", Quiet mode): the banner only, still, with one soft chime.
  var celQ = [], celUntil = 0, celTimers = [], finaleOn = false;
  var flashA = 0, cheerUntil = 0, pupsUntil = 0, congaUntil = 0, congaT0 = 0, fwUntil = 0, fwNext = 0, fwGap = 1;
  function celebrating() { return Date.now() < celUntil || finaleOn; }
  function friendTier(n) { return n >= D.chars.length ? 5 : n >= 16 ? 4 : n >= 11 ? 3 : n >= 6 ? 2 : 1; }
  function later(f, ms) { celTimers.push(setTimeout(f, ms)); }
  function queueCel(n, c, dry) { celQ.push([n, c, dry]); if (!celebrating()) nextCel(); }
  function nextCel() { var q = celQ.shift(); if (!q) return; if (friendTier(q[0]) === 5) finale(q[2]); else celebrateFriend(q[0], q[1]); }
  function banner(tier, kicker, title, c, secs) {
    var b = $('#cp-banner'); if (!b) return;
    b.className = 'cp-banner t' + tier + (celCalm() ? ' is-calm' : '');
    $('#cp-banner-k').textContent = kicker; $('#cp-banner-t').textContent = title;
    var im = $('#cp-banner-img'); if (im) { if (c) { im.src = medURL(c, true); im.hidden = false; } else im.hidden = true; }
    b.hidden = false; void b.offsetWidth; b.classList.add('is-up');
    clearTimeout(banner.tm); banner.tm = setTimeout(function () { b.classList.remove('is-up'); setTimeout(function () { if (!b.classList.contains('is-up')) b.hidden = true; }, celCalm() ? 0 : 350); }, secs * 1000);
  }
  var TIER_LINE = {
    1: ['A new friend!', 'Welcome to the shelf.', 'Hello, friend!', 'Look who it is!', 'One more smile.'],
    2: ['The shelf is filling up!', 'What a find!', 'Friends keep coming!', 'Hooray!', 'Halfway there soon!'],
    3: ['The machine is cheering!', 'More than halfway!', 'What a collection!', 'The lights are dancing!', 'Keep it going!'],
    4: ['Almost everyone!', 'So close to all of them!', 'The whole cabinet is dancing!', 'Nearly there!', 'Just a few to go!']
  };
  function celebrateFriend(n, c) {
    var tier = friendTier(n), all = D.chars.length, left = all - n, calmNow = celCalm();
    var dur = [0, 2.6, 3.4, 4.4, 5.6][tier];
    celUntil = Date.now() + dur * 1000;
    later(nextCel, dur * 1000 + 200);
    var kick = 'Friend ' + n + ' of ' + all + (tier === 4 ? ' · only ' + left + ' to go' : '');
    banner(tier, kick, c ? c.name : TIER_LINE[tier][n % 5], c, dur);
    if (calmNow) { bell(1); return; }
    celSting(tier);
    burstAt(0, ZE - 0.4, 30 + tier * 14, '#FFE7A0');
    if (tier >= 2) { confetti([0, 0, 70, 110, 160][tier]); flash(0.32); shake(0.3 + tier * 0.12); cheerUntil = t + dur; }
    if (tier >= 3) { fireworks(tier === 3 ? 4 : 8, dur * 0.8); lights('wild', dur); pupsUntil = t + dur; musicBoost(tier - 1, 10 + tier * 2); }
    else lights('sparkle', dur);
    if (tier >= 4) {
      for (var k = 0; k < 14; k++) later(function () { dropCoin((Math.random() - 0.5) * 2 * (HX - R), true); }, 200 + k * 120);
      if (view && view.dance) view.dance(dur, foundIds());
      main.classList.add('is-wild'); later(function () { main.classList.remove('is-wild'); }, dur * 1000);
    }
  }
  function foundIds() { return D.chars.filter(function (c) { return !!st.found[c.id]; }).map(function (c) { return c.id; }); }
  // the big one: every friend found
  function finale(dry) {
    if (finaleOn) return;
    finaleOn = true; wilding = true;
    var calmNow = celCalm(), all = D.chars.length;
    say('You found every friend on the site. ' + (calmNow ? 'Here is your trophy.' : 'The machine is throwing a party for you.'));
    if (calmNow) {
      banner(5, 'All ' + all + ' friends found', 'You found everyone!', null, 3.5);
      bell(3); later(function () { endFinale(); }, 1200); return;
    }
    var sk = $('#cp-skipshow'); if (sk) { sk.hidden = false; }
    banner(5, 'All ' + all + ' friends found', 'The whole site came to party!', null, 6);
    jackpot(); flash(0.45); shake(1); lights('wild', 22); wildUntil = t + 20; musicBoost(3, 26);
    confetti(160); fireworks(5, 1.2);
    fwUntil = t + 18; fwGap = 0.9; fwNext = t + 1;
    if (view && view.dance) view.dance(21, foundIds().length ? foundIds() : null);
    congaUntil = t + 20; congaT0 = t; cheerUntil = t + 20; pupsUntil = t + 20;
    main.classList.add('is-wild');
    for (var k = 0; k < 50; k++) later(function () { dropCoin((Math.random() - 0.5) * 2 * (HX - R), true); }, 400 + k * 110);
    later(function () { confetti(120); shake(0.6); celSting(4); banner(5, 'Every friend', 'Tidbit and Sugarfoot are dancing!', null, 4.5); }, 5000);
    later(function () { flash(0.3); confetti(100); celSting(3); banner(5, 'Look at them go', 'All ' + all + ' on the dance floor!', null, 4.5); }, 10000);
    later(function () { confetti(120); fireworks(8, 2); jackpot(); banner(5, 'The finale', 'Thank you for playing!', null, 5); }, 14500);
    later(function () { endFinale(); }, 22000);
  }
  function endFinale() {
    celTimers.forEach(clearTimeout); celTimers = [];
    finaleOn = false; wilding = false; congaUntil = 0; cheerUntil = 0; pupsUntil = 0; fwUntil = 0; wildUntil = 0; lightUntil = 0;
    main.classList.remove('is-wild');
    var sk = $('#cp-skipshow'); if (sk) sk.hidden = true;
    var b = $('#cp-banner'); if (b) { b.classList.remove('is-up'); b.hidden = true; }
    celUntil = 0;
    celebrate();
    nextCel();
  }
  var wilding = false;
  function wild() { finale(DEBUG_ALL); }
  function celebrate() {
    var box = $('#cp-celebrate'); if (!box) return;
    box.hidden = false;
    var row = $('#cp-cel-friends');
    if (row && !row.childNodes.length) D.chars.forEach(function (c, i) { var im = doc.createElement('img'); im.src = medURL(c, true); im.alt = ''; im.width = 48; im.height = 48; im.style.animationDelay = (i * 0.07) + 's'; row.appendChild(im); });
    drawTrophy($('#cp-trophy'));
    var w = $('#cp-cel-when'); if (w) w.textContent = st.trophy ? 'Trophy earned ' + new Date(st.trophy).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ', kept on this device.' : '';
    var h = $('#cp-cel-h'); if (h) { try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }
    setTimeout(function () { try { box.scrollIntoView({ block: 'nearest', behavior: calm ? 'auto' : 'smooth' }); } catch (e) {} }, 300);
  }
  // the trophy: a gold cup with a heart, drawn once on a small canvas
  function drawTrophy(cv) {
    if (!cv || !cv.getContext) return; var g = cv.getContext('2d'), S = cv.width, u = S / 160;
    g.clearRect(0, 0, S, S);
    var gr = g.createLinearGradient(0, 0, S, S); gr.addColorStop(0, '#FBE3A0'); gr.addColorStop(0.5, '#D4A94E'); gr.addColorStop(1, '#9C7330');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(40 * u, 22 * u); g.lineTo(120 * u, 22 * u); g.quadraticCurveTo(120 * u, 92 * u, 80 * u, 98 * u); g.quadraticCurveTo(40 * u, 92 * u, 40 * u, 22 * u); g.fill();
    g.lineWidth = 8 * u; g.strokeStyle = '#C99A3E';
    g.beginPath(); g.arc(36 * u, 46 * u, 16 * u, Math.PI * 0.5, Math.PI * 1.5); g.stroke(); g.beginPath(); g.arc(124 * u, 46 * u, 16 * u, -Math.PI * 0.5, Math.PI * 0.5); g.stroke();
    g.fillStyle = gr; g.fillRect(72 * u, 96 * u, 16 * u, 22 * u); g.fillRect(50 * u, 118 * u, 60 * u, 12 * u); g.fillStyle = '#7A4A2B'; g.fillRect(44 * u, 130 * u, 72 * u, 16 * u);
    g.fillStyle = '#E2556A'; var x = 80 * u, y = 52 * u, s = 16 * u;
    g.beginPath(); g.moveTo(x, y + s * 0.9); g.bezierCurveTo(x - s * 1.4, y, x - s * 0.7, y - s * 1.1, x, y - s * 0.35); g.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.4, y, x, y + s * 0.9); g.fill();
    g.fillStyle = '#FFF3CC'; g.font = '600 ' + Math.round(10 * u) + 'px "IBM Plex Mono", monospace'; g.textAlign = 'center'; g.fillText('ALL 22', 80 * u, 142 * u);
    g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(52 * u, 28 * u, 6 * u, 40 * u);
  }
  function trophyNote() {
    var n = $('#cp-trophy-note'); if (!n) return;
    n.hidden = !st.trophy;
    var d = $('#cp-trophy-date'); if (d && st.trophy) d.textContent = new Date(st.trophy).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  function replay() { $('#cp-celebrate').hidden = true; try { stage.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' }); } catch (e) {} setTimeout(function () { finale(true); }, calm ? 0 : 450); }
  // a combo counter while a push is falling, and its total at the end
  var comboEl = $('#cp-combo'), comboHide = 0, nearAt = 0;
  function combo(n) {
    if (!comboEl || n < 2) return;
    comboEl.textContent = '×' + n; comboEl.setAttribute('data-lvl', n >= 12 ? '3' : n >= 7 ? '2' : '1');
    comboEl.hidden = false; comboEl.classList.remove('is-pop'); void comboEl.offsetWidth; if (!celCalm()) comboEl.classList.add('is-pop');
    clearTimeout(comboHide);
  }
  function comboEnd(n) {
    if (!comboEl) return;
    if (n >= 3) { comboEl.textContent = (n >= 12 ? 'Mega combo ×' : n >= 7 ? 'Big combo ×' : 'Combo ×') + n + '!'; comboEl.classList.remove('is-pop'); void comboEl.offsetWidth; if (!celCalm()) comboEl.classList.add('is-pop'); comboEl.hidden = false; }
    clearTimeout(comboHide); comboHide = setTimeout(function () { comboEl.hidden = true; }, n >= 3 ? 1500 : 300);
  }
  function nearMiss(prize) {
    var now = Date.now(); if (now - nearAt < (prize ? 12000 : 25000) || celebrating() || !comboEl || !comboEl.hidden) return;
    nearAt = now;
    comboEl.textContent = prize ? 'So close! The medallion is on the edge.' : 'So close!'; comboEl.setAttribute('data-lvl', '0');
    comboEl.hidden = false; comboEl.classList.remove('is-pop'); void comboEl.offsetWidth; if (!celCalm()) comboEl.classList.add('is-pop');
    clearTimeout(comboHide); comboHide = setTimeout(function () { comboEl.hidden = true; }, 1600);
    ooh();
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
    var bar = $('#cp-meter-bar'); if (bar) { var p = (st.meter % 3) / 3; bar.style.width = (p * 100) + '%'; bar.parentNode.setAttribute('aria-valuenow', String(st.meter % 3)); }
    var nx = $('#cp-next'); if (nx) { var left = 3 - (st.meter % 3); nx.textContent = left === 1 ? '1 more coin over the edge for a free coin' : left + ' more coins over the edge for a free coin'; }
    tipLine();
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
  // tools16: the card shows the newest tip. A card that arrives while one is up waits a moment (so the first can be read),
  // then takes its place; each card goes away by itself after a few seconds, unless you're pointing at it or reading it
  // with the keyboard. Every tip is also kept in "Tips you've found", so nothing is lost when a card goes.
  var cardQ = [], cardOpen = false, cardShownAt = 0, cardTimer = 0, cardHold = false;
  var CARD_MIN = 2500, CARD_STAY = 8000;
  function card(kind, kicker, title, html) {
    cardQ.push([kind, kicker, title, html]);
    if (!cardOpen) { nextCard(); return; }
    clearTimeout(cardTimer);
    cardTimer = setTimeout(nextCard, Math.max(0, CARD_MIN - (Date.now() - cardShownAt)));
  }
  function cardLater() { clearTimeout(cardTimer); if (cardOpen && !cardHold) cardTimer = setTimeout(nextCard, cardQ.length ? CARD_MIN : CARD_STAY); }
  function nextCard() {
    var box = $('#cp-card'); if (!box) return;
    clearTimeout(cardTimer);
    var c = cardQ.shift(); if (!c) { cardOpen = false; box.classList.remove('is-up'); setTimeout(function () { if (!cardOpen) box.hidden = true; }, calm ? 0 : 300); return; }
    cardOpen = true; cardShownAt = Date.now();
    box.className = 'cp-card cp-' + c[0].split(' ').join(' cp-');
    $('#cp-card-k').textContent = c[1]; $('#cp-card-t').textContent = c[2]; $('#cp-card-b').innerHTML = c[3];
    box.hidden = false; void box.offsetWidth; box.classList.add('is-up');
    cardLater();
  }
  (function () {
    var box = $('#cp-card'); if (!box) return;
    function hold() { cardHold = true; clearTimeout(cardTimer); }
    function let_() { cardHold = box.matches(':hover') || box.contains(doc.activeElement); if (!cardHold) cardLater(); }
    box.addEventListener('mouseenter', hold); box.addEventListener('mouseleave', let_);
    box.addEventListener('focusin', hold); box.addEventListener('focusout', function () { setTimeout(let_, 0); });
  })();
  function nudgeEmpty() { var e = $('#cp-empty'); if (e) { e.hidden = false; e.classList.remove('is-pulse'); void e.offsetWidth; if (!calm) e.classList.add('is-pulse'); } }

  // when the next tip can come (tips are rare, and can be switched off)
  function tipLine() {
    var e = $('#cp-tipnext'); if (!e) return;
    if (st.tipsOff) { e.textContent = 'Tips are off.'; return; }
    var wait = Math.max(TIP_FIRST - playMs, TIP_GAP - (Date.now() - st.lastTip)), m = Math.ceil(wait / 60000);
    e.textContent = wait <= 0 ? 'A tip may come with your next push.' : 'Next tip in about ' + m + (m === 1 ? ' minute' : ' minutes') + ' of play.';
  }
  function syncTips() { var b = $('#cp-tipsbtn'); if (b) { b.setAttribute('aria-pressed', String(!st.tipsOff)); b.querySelector('b').textContent = st.tipsOff ? 'off' : 'on'; } tipLine(); }
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
    if (playMs % 15000 === 0) tipLine();
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
        if (Date.now() < boostUntil) {
          noise(tt, 0.04, 0.025, 7000, musBus);
          if (boostLvl >= 2) { var ch = CHORDS[bar]; tone(ch[s8 % 4] * 4, 'sine', tt, 0.003, 0.02, 0.35, musBus); }
          if (boostLvl >= 3) { if (s8 % 2 === 0) { tone(BASS[bar][s8 / 2] / 2, 'sine', tt, 0.005, 0.08, beat * 0.6, musBus); tone(70, 'sine', tt, 0.002, 0.09, 0.14, musBus); } }
        }
      }
      musNext += beat / 2; musStep++;
    }
  }
  // a soft thunk as a coin lands in the tray, an "ooh" for a near miss, a pop for fireworks
  function thunk() { if (!soundOn() || !AC) return; var t0 = AC.currentTime + 0.02, m = 0.9 + Math.random() * 0.2; tone(190 * m, 'triangle', t0, 0.002, 0.05, 0.12); tone(1400 * m, 'sine', t0 + 0.01, 0.002, 0.02, 0.06); }
  function ooh() { if (!soundOn() || !AC) return; var t0 = AC.currentTime + 0.02; tone(659.25, 'sine', t0, 0.03, 0.05, 0.3); tone(523.25, 'sine', t0 + 0.22, 0.03, 0.05, 0.45); }
  function pop() { if (!soundOn() || !AC) return; var t0 = AC.currentTime + 0.01; noise(t0, 0.18, 0.06, 900); tone(220 + Math.random() * 200, 'sine', t0, 0.003, 0.04, 0.2); }
  // white noise, filtered (shakers, fireworks)
  var NB = null;
  function noise(t0, dur, vol, freq, bus) {
    if (!AC) return;
    try {
      if (!NB) { var n = AC.sampleRate, b = AC.createBuffer(1, n, n), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; NB = b; }
      var src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(); src.buffer = NB; f.type = 'bandpass'; f.frequency.value = freq || 6000; f.Q.value = 0.8;
      env(g, t0, 0.003, vol, dur); src.connect(f); f.connect(g); g.connect(bus || sfx); src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
    } catch (e) {}
  }
  // the celebration stings grow with the tier
  function celSting(tier) {
    if (!soundOn() || !AC) return; var t0 = AC.currentTime + 0.05;
    fanfare();
    if (tier >= 2) for (var k = 0; k < 6; k++) noise(t0 + k * 0.06, 0.05, 0.05, 2500);
    if (tier >= 3) [783.99, 987.77, 1174.66, 1567.98].forEach(function (f, i) { bellNote(f, t0 + 0.6 + i * 0.1, 0.07); });
    if (tier >= 4) [1046.5, 1318.5, 1568, 2093].forEach(function (f, i) { bellNote(f, t0 + 1.1 + i * 0.12, 0.08); tone(f / 4, 'triangle', t0 + 1.1 + i * 0.12, 0.01, 0.05, 0.3); });
  }
  // extra music layers for a while after a big celebration: a shaker, then bells, then a deeper bass and a kick
  var boostLvl = 0, boostUntil = 0;
  function musicBoost(lvl, secs) { if (celCalm()) return; boostLvl = Math.max(Date.now() < boostUntil ? boostLvl : 0, lvl); boostUntil = Math.max(boostUntil, Date.now() + secs * 1000); }
  function hum(speed) { if (!AC || !humG) return; var v = soundOn() ? Math.min(0.05, Math.abs(speed) * 1.4) : 0; humG.gain.setTargetAtTime(v, AC.currentTime, 0.15); humO.frequency.setTargetAtTime(58 + Math.abs(speed) * 300, AC.currentTime, 0.2); }
  function firstTap() { if (soundOn()) { audio(); if (AC && AC.state === 'suspended') AC.resume(); } }

  // ---------- light chase, shake, confetti, sparkles, fireworks (shared by both views)
  // Calm (celCalm) turns all of it off. Particles are capped (MAXP) and cleaned up as they go, for phones.
  var lightMode = 'idle', lightUntil = 0, shakeAmt = 0, MAXP = 450;
  function lights(mode, secs) { if (celCalm() && mode !== 'idle') return; lightMode = mode; lightUntil = t + secs; }
  function shake(a) { if (celCalm()) return; shakeAmt = Math.max(shakeAmt, a); }
  function flash(a) { if (celCalm()) return; flashA = Math.max(flashA, a); }   // one soft flash that fades (celebrations keep them seconds apart)
  var fx = $('#cp-fx'), fxg = fx ? fx.getContext('2d') : null, parts = [];
  var CONF = ['#E9C46F', '#F2A98A', '#B9A2D9', '#8EC5EA', '#7DB07A', '#E2556A', '#FFF3CC'];
  function room(n) { return Math.max(0, Math.min(n, MAXP - parts.length)); }
  function confetti(n) {
    if (celCalm() || !fx) return;
    var w = fx.clientWidth, h = fx.clientHeight; n = room(n);
    for (var i = 0; i < n; i++) parts.push({ x: Math.random() * w, y: -20 - Math.random() * h * 0.6, vx: (Math.random() - 0.5) * 60, vy: 60 + Math.random() * 120, r: Math.random() * 6, vr: (Math.random() - 0.5) * 8, s: 4 + Math.random() * 6, c: CONF[i % CONF.length], life: 6, kind: 'c' });
  }
  function sparkleAt(x, z) {
    if (celCalm() || !fx || !view) return;
    var p = view.project(x, -0.6, z); if (!p) return;
    var n = room(9);
    for (var i = 0; i < n; i++) { var an = Math.random() * 6.28, sp = 30 + Math.random() * 70; parts.push({ x: p[0], y: p[1], vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 30, r: 0, vr: 0, s: 2 + Math.random() * 3, c: '#FFE7A0', life: 0.7, kind: 's' }); }
    if (parts.length < MAXP) parts.push({ x: p[0], y: p[1] - 8, vx: 0, vy: -40, r: 0, vr: 0, s: 0, c: '#FFF3CC', life: 0.8, kind: 't', txt: '+1' });
  }
  // a big ring of sparkles from a spot on the bed
  function burstAt(x, z, n, col) {
    if (celCalm() || !fx || !view) return;
    var p = view.project(x, 0, z); if (!p) return; n = room(n);
    for (var i = 0; i < n; i++) { var an = i / n * 6.28, sp = 80 + Math.random() * 120; parts.push({ x: p[0], y: p[1], vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 40, r: 0, vr: 0, s: 2 + Math.random() * 3, c: col || '#FFE7A0', life: 1, kind: 's' }); }
  }
  // fireworks over the back of the cabinet: n bursts spread over secs seconds
  function fireworks(n, secs) {
    if (celCalm() || !fx) return;
    for (var k = 0; k < n; k++) (function (d) { celTimers.push(setTimeout(function () { boom(); }, d)); })(k * (secs || 1) * 1000 / Math.max(1, n));
  }
  function boom() {
    if (!fx || celCalm()) return;
    var w = fx.clientWidth, h = fx.clientHeight, x = w * (0.15 + Math.random() * 0.7), y = h * (0.1 + Math.random() * 0.3), c = CONF[Math.floor(Math.random() * CONF.length)], n = room(28);
    for (var i = 0; i < n; i++) { var an = i / n * 6.28, sp = 60 + Math.random() * 60; parts.push({ x: x, y: y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, r: 0, vr: 0, s: 2.2, c: c, life: 1.3, kind: 'f' }); }
    pop();
  }
  // the friends you've found, hopping along the bottom; the 22 in a conga line (the finale); the pups cheering
  function drawCrowd(dt) {
    var w = fx.clientWidth, h = fx.clientHeight;
    if (t < cheerUntil) {
      var ids = foundIds(), n = Math.min(ids.length, 22), s = Math.max(22, Math.min(40, (w - 20) / Math.max(8, n)));
      for (var i = 0; i < n; i++) { var c = charById(ids[i]); if (!c) continue; var x = w / 2 - n * s / 2 + i * s, y = h - s - 4 - Math.abs(Math.sin(t * 7 + i)) * 10; fxg.drawImage(medCanvas(c, true, 128), x, y, s - 2, s - 2); }
    }
    if (t < congaUntil) {
      var all = D.chars, cs = Math.max(30, Math.min(52, w / 11)), span = all.length * cs * 1.1 + w;
      all.forEach(function (c, i) {
        var x = ((t - congaT0) * 90 + i * cs * 1.1) % span - all.length * cs * 1.1 + w * 0.2, y = h * 0.42 + Math.sin((t - congaT0) * 4 + i * 0.6) * h * 0.08;
        if (x < -cs || x > w) return;
        fxg.save(); fxg.translate(x, y); fxg.rotate(Math.sin(t * 6 + i) * 0.25); fxg.drawImage(medCanvas(c, true, 128), -cs / 2, -cs / 2, cs, cs); fxg.restore();
      });
    }
    if (t < pupsUntil && window.TOLPups) {
      var ps = Math.max(0.55, Math.min(1.1, w / 600));
      [['collar', 34, 1], ['drop', w - 34, -1]].forEach(function (q, i) {
        fxg.save(); fxg.translate(q[1], h - 8 - Math.abs(Math.sin(t * 6 + i * 1.5)) * 14); fxg.scale(q[2] * ps, ps);
        try { window.TOLPups.draw(fxg, window.TOLPups.looks[q[0]], 'wiggle', t * 10, Math.sin(t * 14) * 0.6, false, t * 1000, Math.sin(t * 3 + i) * 0.15); } catch (e) {}
        fxg.restore();
      });
    }
  }
  function drawFx(dt) {
    if (!fxg) return;
    var dpr = fx.width / Math.max(1, fx.clientWidth);
    fxg.setTransform(dpr, 0, 0, dpr, 0, 0); fxg.clearRect(0, 0, fx.clientWidth, fx.clientHeight);
    // the finale keeps fireworks coming
    if (t < fwUntil && t >= fwNext) { fwNext = t + fwGap; boom(); if (Math.random() < 0.5) boom(); }
    var busy = t < cheerUntil || t < congaUntil || t < pupsUntil;
    if (!parts.length && !busy && flashA <= 0) return;
    var h = fx.clientHeight;
    if (busy && !celCalm()) drawCrowd(dt);
    parts = parts.filter(function (p) { p.life -= dt; return p.life > 0 && p.y < h + 30; });
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      if (p.kind === 'c') { p.vy += 30 * dt; var co = Math.cos(p.r), si = Math.sin(p.r); fxg.setTransform(dpr * co, dpr * si, -dpr * si, dpr * co, dpr * p.x, dpr * p.y); fxg.fillStyle = p.c; fxg.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); }
      else if (p.kind === 't') { fxg.setTransform(dpr, 0, 0, dpr, 0, 0); fxg.globalAlpha = Math.max(0, p.life / 0.8); fxg.fillStyle = p.c; fxg.font = '700 15px Fraunces, Georgia, serif'; fxg.textAlign = 'center'; fxg.fillText(p.txt, p.x, p.y); fxg.textAlign = 'start'; fxg.globalAlpha = 1; }
      else { fxg.setTransform(dpr, 0, 0, dpr, 0, 0); p.vy += (p.kind === 'f' ? 40 : 120) * dt; if (p.kind === 'f') p.vx *= 0.985; fxg.globalAlpha = Math.max(0, Math.min(1, p.life / (p.kind === 'f' ? 0.9 : 0.7))); fxg.fillStyle = p.c; fxg.beginPath(); fxg.arc(p.x, p.y, p.s, 0, 7); fxg.fill(); fxg.globalAlpha = 1; }
    }
    fxg.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (flashA > 0) { fxg.fillStyle = 'rgba(255,248,230,' + Math.min(0.45, flashA) + ')'; fxg.fillRect(0, 0, fx.clientWidth, h); flashA = Math.max(0, flashA - dt * 1.2); }
  }
  // the bulbs: a color for bulb i of n right now. No bulb changes more than about twice a second (photosensitivity).
  var WARM = [[255, 214, 150], [255, 180, 120], [255, 236, 200], [240, 160, 170], [200, 180, 240]];
  function bulb(i, n) {
    var mode = t < lightUntil ? lightMode : 'idle', k, v;
    if (calm) return [255, 222, 170, 0.75];
    if (mode === 'wild') { var step_ = Math.floor(t * 5); k = WARM[(i + Math.floor(t * 2)) % WARM.length]; v = ((i + step_) % 3 === 0) ? 1 : 0.45; return [k[0], k[1], k[2], v]; }
    if (mode === 'sparkle') { var q = Math.floor(t * 2.5) * 31 + i * 17; v = (Math.sin(q) * 43758.5453 % 1 + 1) % 1 < 0.5 ? 1 : 0.45; return [255, 226, 160, v]; }
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
    var trayMat = new THREE.MeshStandardMaterial({ color: 0x9C7330, metalness: 0.7, roughness: 0.45 });
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
    box(HX * 2 + 0.2, 0.1, 1.6, trayMat, 0, trayY - 0.05, trayZ);
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
    var dancers = [], danceUntil = 0, danceIds = null;
    // ids: only these friends dance (the ones found so far); none given: all of them
    function dance(secs, ids) {
      danceUntil = t + secs; danceIds = ids || null;
      if (!dancers.length) D.chars.forEach(function (c, i) {
        var tx = new THREE.CanvasTexture(medCanvas(c, true, 256)); tx.encoding = THREE.sRGBEncoding;
        var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true })); s.scale.set(0.85, 0.85, 1);
        s.userData.i = i; s.userData.id = c.id; scene.add(s); dancers.push(s);
      });
      dancers.forEach(function (s) { s.visible = true; });
    }

    var M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1), V = new THREE.Vector3();
    var camBase = new THREE.Vector3(), camLook = new THREE.Vector3(0, 0.9, -0.4), W = 0, H = 0;
    function resize() {
      var w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
      W = w; H = h; renderer.setSize(w, h, false); cam.aspect = w / h;
      // keep the whole machine in view, phone or desktop: move back until the sign, the sides and the tray all fit
      cam.fov = cam.aspect < 1 ? 50 : 40; cam.updateProjectionMatrix();
      var pts = [[-5.1, 4.35, ZB], [5.1, 4.35, ZB], [-5.1, 0, ZE], [5.1, 0, ZE], [-4.8, -1.3, ZE + 1.8], [4.8, -1.3, ZE + 1.8]];
      var lo = 6, hi = 40, dir = new THREE.Vector3(0, 0.62, 0.78).normalize();
      for (var k = 0; k < 18; k++) {
        var mid = (lo + hi) / 2, fits = true;
        cam.position.copy(dir).multiplyScalar(mid).add(camLook); cam.lookAt(camLook); cam.updateMatrixWorld();
        for (var q = 0; q < pts.length && fits; q++) { V.set(pts[q][0], pts[q][1], pts[q][2]).project(cam); if (Math.abs(V.x) > 0.97 || Math.abs(V.y) > 0.95) fits = false; }
        if (fits) hi = mid; else lo = mid;
      }
      camBase.copy(dir).multiplyScalar(hi).add(camLook);
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
        var tilt = a.tilt, py = a.y;
        // a coin hanging over the edge tips forward and wobbles a little
        if (a.st === 'field') { var over = a.z - (ZE - a.r * 0.6); if (over > 0) { var k = Math.min(1, over / (a.r * 0.6)); tilt = k * 0.32 + (calm ? 0 : Math.sin(t * 16 + a.spin * 3) * 0.05 * k); py -= k * 0.05; } }
        P.set(a.x, py + h / 2 + 0.001, a.z);
        E.set(tilt, a.spin, a.roll || 0); Q.setFromEuler(E);
        if (a.kind === 'prize') { var pm = prizeMesh(a); if (pm) { pm.position.copy(P); pm.quaternion.copy(Q); pm.visible = true; seen[a.pid + a.spin] = 1; } continue; }
        if (n >= MAXC + 8) continue;
        M.compose(P, Q, S1); coins.setMatrixAt(n++, M);
      }
      coins.count = n; coins.instanceMatrix.needsUpdate = true;
      for (var k in prizeMeshes) if (!seen[k]) { scene.remove(prizeMeshes[k]); delete prizeMeshes[k]; }
      ghost.position.set(aimX, 1.62 + 0.18 + Math.sin(t * 3) * 0.04, -3.55 + 0.25); ghost.rotation.set(Math.PI / 2 * 0.85, 0, 0); ghost.visible = st.cup > 0;
      for (i = 0; i < bulbs.length; i++) { var b = bulb(i, bulbs.length); bulbs[i].material.color.setRGB(b[0] / 255 * (0.35 + 0.65 * b[3]), b[1] / 255 * (0.35 + 0.65 * b[3]), b[2] / 255 * (0.35 + 0.65 * b[3])); }
      glow.intensity = (t < lightUntil && lightMode === 'wild') ? 1.2 + Math.sin(t * 6) * 0.3 : 0.9;   // a slow glow, never a flicker
      if (dancers.length) {
        var on = t < danceUntil;
        var shown = dancers.filter(function (s) { return !danceIds || danceIds.indexOf(s.userData.id) >= 0; });
        dancers.forEach(function (s) { s.visible = false; });
        shown.forEach(function (s, j) {
          s.visible = on; if (!on) return;
          var col = j % 11, row = Math.floor(j / 11);
          s.position.set(-4.2 + col * 0.84, 4.25 - row * 0.95 + Math.abs(Math.sin(t * 6 + j)) * 0.22, ZB + 0.5);
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
    var g = cv.getContext('2d'), W = 0, H = 0, sc = 1, ox = 0, oz = 0, dpr = 1, nTray = 0, danceUntil = 0, danceIds = null;
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
        D.chars.filter(function (c) { return !danceIds || danceIds.indexOf(c.id) >= 0; }).forEach(function (c, k) { g.drawImage(medCanvas(c, true, 128), W / 2 - 5.5 * s + (k % 11) * s, 6 + Math.floor(k / 11) * s, s - 2, s - 2); });
      }
    }
    function aimFrom(cx) { var r = cv.getBoundingClientRect(); return ((cx - r.left) / r.width * W - ox) / sc; }
    function project(x, y, z) { return [X(x), Y(z)]; }
    return { canvas: cv, resize: resize, render: render, aimFrom: aimFrom, project: project, tray: function (n) { nTray = n; }, dance: function (s, ids) { danceUntil = t + s; danceIds = ids || null; }, theme: function () {}, dispose: function () {}, kind: '2d' };
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
    if (e.target.closest && e.target.closest('.cp-card, .cp-hud, .cp-banner, button, a')) return;
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
  var tb = $('#cp-tipsbtn'); if (tb) tb.addEventListener('click', function () { st.tipsOff = st.tipsOff ? 0 : 1; save(); syncTips(); say(st.tipsOff ? 'Tips are off. Turn them on again here any time.' : 'Tips are on. One comes now and then.'); });
  var rp = $('#cp-replay'); if (rp) rp.addEventListener('click', replay);
  var rp2 = $('#cp-replay2'); if (rp2) rp2.addEventListener('click', replay);
  var sks = $('#cp-skipshow'); if (sks) sks.addEventListener('click', function (e) { e.stopPropagation(); celTimers.forEach(clearTimeout); celTimers = []; parts = []; flashA = 0; shakeAmt = 0; boostUntil = 0; if (view && view.dance) view.dance(0); endFinale(); });
  $('#cp-cel-close').addEventListener('click', function () { $('#cp-celebrate').hidden = true; stage.focus(); });
  $('#cp-reset').addEventListener('click', function () {
    if (!window.confirm('Start over? This clears your coins, your shelf of friends and the tips you have found, on this device.')) return;
    try { localStorage.removeItem(KEY); } catch (e) {}
    location.hash = ''; location.reload();
  });
  // Quiet mode switched on here: sound and music go off and stay off until switched on again (tools16)
  window.addEventListener('tol-quiet', function () { if (!soundAllowed()) { st.snd = 0; st.mus = 0; save(); } syncBar(); });
  doc.addEventListener('tol-still', function () { var c = stillChosen(); if (c !== calm) { calm = c; if (calm) { parts = []; shakeAmt = 0; flashA = 0; } mount(); } });
  if (window.matchMedia) { try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { view && view.theme(); }); } catch (e) {} }
  new MutationObserver(function () { view && view.theme(); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  // ---------- the loop (stops while the tab is hidden)
  var raf = 0, last = 0, acc = 0, resting = false, humTick = 0, frames = [], simMs = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60; last = now;
    frames.push(dt); if (frames.length > 120) frames.shift();
    acc += dt; var steps = 0, c0 = performance.now();
    while (acc >= 1 / 60 && steps < 6) { step(1 / 60); acc -= 1 / 60; steps++; }
    if (steps === 6) acc = 0;
    simMs = simMs * 0.95 + (performance.now() - c0) * 0.05;
    // a push ends after a quiet moment, or after 2.5 seconds of coins, so a long trickle isn't one giant push
    if (burstTimer > 0) { burstTimer -= dt; burstAge += dt; if (burstTimer <= 0 || burstAge > 2.5) { burstTimer = 0; endBurst(); } }
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
    stats: function () { var s = frames.slice().sort(function (a, b) { return a - b; }); return { view: view && view.kind, calm: calm, celCalm: celCalm(), tipsOff: !!st.tipsOff, lastTip: st.lastTip, playMs: playMs, coins: fieldCount(), meter: st.meter, cup: st.cup, found: Object.keys(st.found).length, tips: st.tips.length, p50: s[Math.floor(s.length / 2)] * 1000, p95: s[Math.floor(s.length * 0.95)] * 1000, simMs: simMs }; },
    drop: function (x) { return dropCoin(x == null ? aimX : x); },
    // test hooks: play the celebration for friend n of 22 without saving (22: the finale); really find k more friends
    celebrate: function (n) { n = Math.max(1, Math.min(D.chars.length, n | 0)); var c = D.chars[(n - 1) % D.chars.length]; queueCel(n, c, true); return { tier: friendTier(n), calm: celCalm() }; },
    give: function (k) { var open = D.chars.filter(function (c) { return !st.found[c.id]; }).slice(0, k || 1); open.forEach(function (c) { gotPrize(c.id); }); return Object.keys(st.found).length; },
    celebrating: function () { return { on: celebrating(), finale: finaleOn, queue: celQ.length, parts: parts.length, trophy: st.trophy || 0 }; },
    // run the machine for a while without drawing (for checks)
    run: function (secs) { for (var i = 0; i < Math.round(secs * 60); i++) { step(1 / 60); if (burstTimer > 0) { burstTimer -= 1 / 60; burstAge += 1 / 60; if (burstTimer <= 0 || burstAge > 2.5) { burstTimer = 0; endBurst(); } } } return this.stats(); }
  };

  // ---------- go
  prefill(); mount(); shelf(); tipsList(); syncBar(); syncTips(); trophyNote(); hud(); startLoop();
  // tools16: the row of games starts at the beginning, so the Arcade (and the others) show on a phone, not only this one
  // (the shared "show the tab you're on" helpers run later too, so this runs again after load, unless you've swiped the row)
  (function () {
    var row = doc.querySelector('.gm-switch'); if (!row) return;
    var touched = false;
    ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(function (ev) { row.addEventListener(ev, function () { touched = true; }, { passive: true }); });
    function start() { if (!touched && row.scrollWidth > row.clientWidth + 1) row.scrollLeft = 0; }
    start();
    function later() { setTimeout(start, 0); setTimeout(start, 900); setTimeout(start, 2500); }
    if (doc.readyState === 'complete') later(); else window.addEventListener('load', later);
  })();
  main.classList.add('is-ready');
  if (DEBUG_ALL) setTimeout(wild, 900);
})();
