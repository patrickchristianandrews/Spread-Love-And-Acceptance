/* coin-pusher.js — the Kindness Coin Pusher (/coin-pusher.html): a cozy coin pusher with 50 collectibles to find.
   Tap or drag to aim, tap to drop, keep Drop pressed for a stream. A wooden shelf slides back and forth and nudges the coins
   toward the front edge; coins and prizes that tip over the lip land in the tray. Nothing costs anything, nothing can be lost.

   - One small simulation, drawn on one canvas (no libraries, nothing to download): coins are discs that slide, bump, stack up to a few
     layers, slide off the stack when they are off-center, ride the shelf forward, drop off its front edge when it slides back, tip at the
     lip and fall into the tray. Prizes are heavier and stand on a brass base, and teeter at the lip before they go.
     A fixed time step (120 steps a second, at most 5 per frame), a pool of 190 things that never grows, and a cap on particles keep every
     frame the same small size, so a long session does not slow down or leak.
   - Calm effects (on by default with the device's reduce-motion setting or the site's "Keep the page still"): no shaking, no zoom, few sparkles,
     no confetti, and the shelf only moves for a few seconds after each coin. Nothing flashes faster than 3 times a second, ever.
   - Kept on this device only, in one key: localStorage "tol-coin-v2" (see load() for every field). The old "tol-coin-v1" is read once, then removed.
     It works with storage blocked (progress lasts until the page closes). No network requests.
   - Test hooks: window.TOLCoinPusher (stats, drop, run, soak, give, openGift, startNap, startZoomies, jackpot, state, ...).
     #debug-all shows the finale (nothing is saved while it runs). */
(function () {
  'use strict';
  var D = window.TOLCoinData, A = window.TOLCoinArt, TIPS = window.TOLCoinTips || [], SFX = window.TOLCoinSfx || null;
  var doc = document, root = doc.documentElement;
  var $ = function (s) { return doc.querySelector(s); };
  var main = $('#cp'); if (!D || !A || !main) return;
  var W = A.W, HX = W.HX, ZB = W.ZB, ZE = W.ZE, R = W.R, T = W.T, SH = W.SHELF, PF_MIN = W.PF_MIN, PF_MAX = W.PF_MAX, SLOT_Y = W.SLOT_Y, SLOT_Z = W.SLOT_Z;
  var TAU = Math.PI * 2, KEY = 'tol-coin-v2', OLD_KEY = 'tol-coin-v1';
  var DEBUG_ALL = /#debug-all\b/.test(location.hash);
  var mm = window.matchMedia ? function (q) { try { return window.matchMedia(q).matches; } catch (e) { return false; } } : function () { return false; };
  var PHONE = mm('(pointer: coarse)') || mm('(max-width: 700px)');
  var now = function () { return window.performance && performance.now ? performance.now() : Date.now(); };
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // ---------------------------------------------------------------- numbers that shape the game
  var COIN_MAX = 150, POOL = 190, MAXP = 150, MAXP_CALM = 34, DT = 1 / 120, MAXSTEPS = 5, G = 24, ITER = 4, PERIOD = 4.8;
  var METER_N = 30, JAR_OPEN = 40, JAR_N = 25, TIP_GAP = 22, LANE_N = 5, TRAY_Y = -1.5;
  var TRAY_Z0 = ZE + 0.55, TRAY_Z1 = ZE + 2.3;

  // ---------------------------------------------------------------- saved state (one key)
  var storeOK = true;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { storeOK = false; return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { storeOK = false; return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function fresh() {
    return { v: 2, coins: 0, drops: 0, meter: 0, found: {}, pend: [], since: 0, tips: [], bag: [], jar: 0, tipAt: 0, tipsRead: 0, gift: { d: '', got: 0 }, goals: { d: '', list: [] }, stars: 0,
      sets: {}, lane: { l: 0, r: 0 }, trophy: 0, best: 0, evs: 0, cab: { theme: 'walnut', skin: 'gold', marq: 1 },
      opt: { snd: 1, qon: 0, vol: 70, amb: 1, mus: 0, calm: null, hap: null, tips: 1, thm: 'auto' }, born: Date.now() };
  }
  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
  function load() {
    var raw = lsGet(KEY), o = null;
    if (raw) { try { o = JSON.parse(raw); } catch (e) { o = null; } }
    var s = fresh();
    if (o && typeof o === 'object') {
      s.coins = Math.max(0, num(o.coins, 0) | 0); s.drops = Math.max(0, num(o.drops, 0) | 0); s.meter = clamp(num(o.meter, 0) | 0, 0, METER_N - 1); s.since = Math.max(0, num(o.since, 0) | 0);
      if (o.found && typeof o.found === 'object') for (var k in o.found) if (A.byId(k)) { var f = o.found[k]; s.found[k] = { n: Math.max(1, num(f && f.n, 1) | 0), t: num(f && f.t, Date.now()) }; }
      if (Array.isArray(o.pend)) s.pend = o.pend.filter(function (id, i, a) { return A.byId(id) && a.indexOf(id) === i; }).slice(0, 3);
      if (Array.isArray(o.tips)) s.tips = o.tips.filter(function (id, i, a) { return typeof id === 'string' && a.indexOf(id) === i; }).slice(0, 400);
      if (Array.isArray(o.bag)) s.bag = o.bag.filter(function (id) { return typeof id === 'string'; }).slice(0, 400);
      s.jar = Math.max(0, num(o.jar, 0) | 0); s.tipAt = num(o.tipAt, 0); s.tipsRead = Math.max(0, num(o.tipsRead, 0) | 0); s.stars = Math.max(0, num(o.stars, 0) | 0); s.trophy = num(o.trophy, 0); s.best = Math.max(0, num(o.best, 0) | 0); s.evs = Math.max(0, num(o.evs, 0) | 0); s.born = num(o.born, s.born);
      if (o.gift && typeof o.gift === 'object') s.gift = { d: String(o.gift.d || ''), got: o.gift.got ? 1 : 0 };
      if (o.goals && typeof o.goals === 'object' && Array.isArray(o.goals.list)) s.goals = { d: String(o.goals.d || ''), list: o.goals.list.slice(0, 3).map(function (g) { return { id: String(g.id), n: Math.max(0, num(g.n, 0) | 0), done: g.done ? 1 : 0 }; }) };
      if (o.sets && typeof o.sets === 'object') for (var sk in o.sets) if (o.sets[sk]) s.sets[sk] = 1;
      if (o.lane && typeof o.lane === 'object') s.lane = { l: clamp(num(o.lane.l, 0) | 0, 0, LANE_N), r: clamp(num(o.lane.r, 0) | 0, 0, LANE_N) };
      if (o.cab && typeof o.cab === 'object') { s.cab.theme = A.THEMES[o.cab.theme] ? o.cab.theme : 'walnut'; s.cab.skin = A.SKINS[o.cab.skin] ? o.cab.skin : 'gold'; s.cab.marq = o.cab.marq === 0 ? 0 : 1; }
      if (o.opt && typeof o.opt === 'object') {
        var p = o.opt; s.opt.snd = p.snd === 0 ? 0 : 1; s.opt.qon = p.qon ? 1 : 0; s.opt.vol = clamp(num(p.vol, 70) | 0, 0, 100); s.opt.amb = p.amb === 0 ? 0 : 1; s.opt.mus = p.mus ? 1 : 0;
        s.opt.calm = p.calm === 0 || p.calm === 1 ? p.calm : null; s.opt.hap = p.hap === 0 || p.hap === 1 ? p.hap : null; s.opt.tips = p.tips === 0 ? 0 : 1; s.opt.thm = p.thm === 'day' || p.thm === 'night' ? p.thm : 'auto';
      }
    } else {
      // the first visit after the old version: take the friends, tips and trophy across (then the old key is removed)
      var oldRaw = lsGet(OLD_KEY), old = null; if (oldRaw) { try { old = JSON.parse(oldRaw); } catch (e) { old = null; } }
      if (old && typeof old === 'object') {
        if (old.found && typeof old.found === 'object') for (var fk in old.found) if (A.byId(fk)) s.found[fk] = { n: 1, t: num(old.found[fk], Date.now()) };
        if (Array.isArray(old.tips)) s.tips = old.tips.filter(function (id) { return typeof id === 'string'; }).slice(0, 200);
        s.coins = Math.max(0, num(old.meter, 0) | 0); s.trophy = 0; s.opt.snd = old.snd === 0 ? 0 : 1; s.opt.mus = old.mus ? 1 : 0; s.opt.tips = old.tipsOff ? 0 : 1; s.born = num(old.since, 0) || s.born;
      }
    }
    return s;
  }
  var st = load(), noSave = DEBUG_ALL, dirty = false, saveT = 0;
  function save(now_) { if (noSave) return; dirty = true; if (now_) flush(); else if (!saveT) saveT = setTimeout(flush, 1400); }
  function flush() { clearTimeout(saveT); saveT = 0; if (!dirty || noSave) return; dirty = false; if (!lsSet(KEY, JSON.stringify(st))) storeOK = false; else lsDel(OLD_KEY); var n = $('#cp-save-note'); if (n) n.hidden = storeOK; }
  var today = dayKey();
  if (st.gift.d !== today) st.gift = { d: today, got: 0 };
  if (DEBUG_ALL) { st = JSON.parse(JSON.stringify(st)); A.ITEMS.forEach(function (it) { st.found[it.id] = st.found[it.id] || { n: 1, t: Date.now() }; }); st.sets = {}; st.trophy = 0; }

  // ---------------------------------------------------------------- the site's choices: calm, quiet, dark, sound, buzz
  function siteStill() { try { return window.TOLStill && window.TOLStill.chosen ? !!window.TOLStill.chosen() : (root.classList.contains('tol-still') || mm('(prefers-reduced-motion: reduce)')); } catch (e) { return false; } }
  function quietMode() { try { return !!(window.TOLQuiet && window.TOLQuiet.on && window.TOLQuiet.on()); } catch (e) { return root.classList.contains('tol-quiet'); } }
  function soundAllowed() { try { return window.TOLQuiet ? !!window.TOLQuiet.sound() : !root.classList.contains('tol-quiet'); } catch (e) { return true; } }
  function calmOn() { return st.opt.calm == null ? (siteStill() || quietMode()) : !!st.opt.calm; }
  function soundOn() { return !!st.opt.snd && (soundAllowed() || !!st.opt.qon); }
  function siteHaptic() { var v = lsGet('tol-haptic'); return !!v && v !== 'off'; }
  function buzzOn() { return !!navigator.vibrate && !quietMode() && (st.opt.hap == null ? siteHaptic() : !!st.opt.hap); }
  function buzz(p) { if (!buzzOn() || doc.hidden) return; try { navigator.vibrate(p); } catch (e) {} }
  function darkNow() {
    var t = root.getAttribute('data-theme'); if (t === 'dark') return true; if (t === 'light') return false;
    var v = lsGet('tol-theme'); if (v === 'dark') return true; if (v === 'light') return false;
    return mm('(prefers-color-scheme: dark)');
  }
  function modeNow() { return st.opt.thm === 'day' ? 'day' : st.opt.thm === 'night' ? 'night' : (darkNow() ? 'night' : 'day'); }
  var calm = calmOn(), mode = modeNow();

  // ---------------------------------------------------------------- sets, rewards, goals
  function setItems(id) { return A.ITEMS.filter(function (it) { return it.set === id; }); }
  function setDone(id) { var l = setItems(id); return l.length > 0 && l.every(function (it) { return !!st.found[it.id]; }); }
  function setCount(id) { var l = setItems(id), n = 0; l.forEach(function (it) { if (st.found[it.id]) n++; }); return [n, l.length]; }
  function setOf(id) { for (var i = 0; i < A.SETS.length; i++) if (A.SETS[i].id === id) return A.SETS[i]; return null; }
  function foundCount() { var n = 0; A.ITEMS.forEach(function (it) { if (st.found[it.id]) n++; }); return n; }
  function haveTheme(id) { if (id === 'walnut') return true; return A.SETS.some(function (s) { return s.reward.type === 'theme' && s.reward.id === id && setDone(s.id); }); }
  function haveSkin(id) { if (id === 'gold') return true; if (id === 'copper') return st.stars >= 10; return A.SETS.some(function (s) { return s.reward.type === 'skin' && s.reward.id === id && setDone(s.id); }); }
  function marqueeLines() {
    var l = A.MARQUEE.start.slice();
    A.SETS.forEach(function (s) { if (setDone(s.id) && A.MARQUEE[s.id]) l = l.concat(A.MARQUEE[s.id]); });
    if (st.stars >= 5) l = l.concat(A.MARQUEE.stars);
    return l;
  }
  var GOALS = [
    { id: 'coins25', t: 'Collect 25 coins', n: 25, ev: 'coin' }, { id: 'coins60', t: 'Collect 60 coins', n: 60, ev: 'coin' },
    { id: 'nap3', t: 'Send 3 coins into Sugarfoot’s sleepy corner', n: 3, ev: 'lane0' }, { id: 'zoom3', t: 'Send 3 coins into Tidbit’s bouncy zone', n: 3, ev: 'lane2' },
    { id: 'prizeSF', t: 'Drop a prize for Sugarfoot today', n: 1, ev: 'prize0' }, { id: 'prizeTB', t: 'Drop a prize for Tidbit today', n: 1, ev: 'prize2' },
    { id: 'prize1', t: 'Find a prize today', n: 1, ev: 'prize' }, { id: 'prizeNew', t: 'Find someone new for your shelf', n: 1, ev: 'prizeNew' },
    { id: 'chain4', t: 'Tip 4 coins over the edge at once', n: 1, ev: 'chain4' }, { id: 'chain7', t: 'Tip 7 coins over the edge at once', n: 1, ev: 'chain7' },
    { id: 'drops20', t: 'Drop 20 coins', n: 20, ev: 'drop' }, { id: 'drops40', t: 'Drop 40 coins', n: 40, ev: 'drop' },
    { id: 'tip1', t: 'Read a tip from the jar', n: 1, ev: 'tipread', needJar: 1 }, { id: 'event1', t: 'Start a naptime or zoomies', n: 1, ev: 'event' }
  ];
  function goalDef(id) { for (var i = 0; i < GOALS.length; i++) if (GOALS[i].id === id) return GOALS[i]; return null; }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function pickGoals() {
    var h = hashStr(today), pool = GOALS.filter(function (g) { return !g.needJar || st.coins >= JAR_OPEN; }), out = [], used = {};
    for (var tries = 0; out.length < 3 && tries < 60; tries++) {
      h = (Math.imul(h, 1664525) + 1013904223) >>> 0; var g = pool[h % pool.length], fam = g.ev.replace(/[0-9]/g, '');
      if (used[g.id] || used[fam + (g.ev === 'coin' ? '' : g.ev)]) continue; used[g.id] = 1; used[fam + (g.ev === 'coin' ? '' : g.ev)] = 1; out.push({ id: g.id, n: 0, done: 0 });
    }
    return out;
  }
  if (st.goals.d !== today || !st.goals.list.length) st.goals = { d: today, list: pickGoals() };
  function goalEvent(ev, k) {
    if (DEBUG_ALL) return; k = k || 1; var any = false;
    st.goals.list.forEach(function (g) {
      var def = goalDef(g.id); if (!def || g.done || def.ev !== ev) return;
      g.n = Math.min(def.n, g.n + k); any = true;
      if (g.n >= def.n) { g.done = 1; st.stars++; toast('Goal done: ' + def.t + '.'); if (SFX && !silent) SFX.play('goal'); say('Goal done: ' + def.t + '. That is ' + st.stars + (st.stars === 1 ? ' star.' : ' stars.')); }
    });
    if (any) { save(); renderGoals(); renderCabinet(); }
  }

  // ---------------------------------------------------------------- the world: a pool of things, a shelf, a fixed time step
  function blank() { return { x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0, r: R, h: T, im: 1, k: 0, ty: 'coin', pid: '', st: 0, sp: 0, wr: 0, tilt: 0, vt: 0, tmax: 1.6, rk: 0, e: 0.25, val: 1, bn: 0, lane: 1, over: 0, dead: 0, wob: 0, age: 0, rar: 1, sz: 'fig' }; }
  var items = [], freeList = [], i0;
  for (i0 = 0; i0 < POOL; i0++) freeList.push(blank());
  var TYPES = { coin: { r: R, h: T, im: 1, e: 0.25, val: 1 }, big: { r: R * 1.5, h: T * 1.7, im: 0.42, e: 0.2, val: 2 }, heavy: { r: R * 1.08, h: T * 1.3, im: 0.38, e: 0.08, val: 2 }, bouncy: { r: R, h: T, im: 1, e: 0.8, val: 1 }, rainbow: { r: R, h: T, im: 0.9, e: 0.3, val: 3 } };
  function spawn(x, z, y, ty) {
    if (!freeList.length) return null;
    var a = freeList.pop(), P = TYPES[ty] || TYPES.coin;
    a.x = x; a.z = z; a.y = y; a.vx = a.vz = a.vy = 0; a.r = P.r; a.h = P.h; a.im = P.im; a.e = P.e; a.val = P.val; a.k = 0; a.ty = ty || 'coin'; a.pid = ''; a.st = 0; a.sp = rnd(0, TAU); a.wr = 0; a.tilt = 0; a.vt = 0; a.tmax = 1.6; a.rk = (Math.random() * 4) | 0; a.bn = 0; a.lane = 1; a.over = 0; a.dead = 0; a.wob = 0; a.age = 0; a.rar = 1; a.sz = 'fig';
    items.push(a); return a;
  }
  function spawnPrize(id, x, z, y) {
    var it = A.byId(id), a = spawn(x, z, y, 'coin'); if (!a) return null;
    a.k = 1; a.ty = 'prize'; a.pid = id; a.sz = it ? it.size : 'fig'; a.rar = it ? it.rar : 1; a.r = a.sz === 'charm' ? 0.54 : 0.7; a.h = 0.62; a.im = a.sz === 'charm' ? 0.42 : 0.3; a.e = 0.1; a.val = 0; a.sp = 0;
    return a;
  }
  function release(a) { var i = items.indexOf(a); if (i >= 0) { items[i] = items[items.length - 1]; items.pop(); } freeList.push(a); }
  var pf = PF_MIN, pfPrev = PF_MIN, vf = 0, pushT = 0, pushIdle = 0, simT = 0, ts = 1, tsTarget = 1, silent = true;
  function pusherAt(t) { return PF_MIN + (PF_MAX - PF_MIN) * (0.5 - 0.5 * Math.cos(TAU * t / PERIOD)); }
  var speedMul = 1;
  var impacts = 0, impactV = 0, landV = 0, edgeN = 0;   // gathered during a step; sounded once per frame
  function liveCoins() { var n = 0; for (var i = 0; i < items.length; i++) if (!items[i].k && items[i].st !== 2) n++; return n; }
  function prizesOnDeck() { var n = 0; for (var i = 0; i < items.length; i++) if (items[i].k) n++; return n; }

  function step() {
    var calmNow = calm;
    if (calmNow) { if (pushIdle > 0) { pushT += DT * speedMul; pushIdle -= DT; } } else pushT += DT * speedMul;
    pfPrev = pf; pf = pusherAt(pushT); vf = (pf - pfPrev) / DT; simT += DT;
    var n = items.length, i, j, a, b, it;
    // 1. move everything
    for (i = 0; i < n; i++) {
      a = items[i];
      if (a.st === 1) {
        a.vy -= G * DT; a.y += a.vy * DT; a.x += a.vx * DT; a.z += a.vz * DT; a.sp += a.wr * DT;
        if (a.x < -HX + a.r) { a.x = -HX + a.r; a.vx = Math.abs(a.vx) * 0.3; } else if (a.x > HX - a.r) { a.x = HX - a.r; a.vx = -Math.abs(a.vx) * 0.3; }
        if (a.z < ZB + a.r) { a.z = ZB + a.r; a.vz = Math.abs(a.vz) * 0.3; }
        if (a.y < -3) a.dead = 1;
      } else if (a.st === 2) {
        a.vy -= 20 * DT; a.y += a.vy * DT; a.z += a.vz * DT; a.x += a.vx * DT; a.sp += a.wr * DT; a.tilt = Math.min(a.tmax, a.tilt + a.vt * DT); a.vt *= 0.992;
        if (a.y < TRAY_Y) a.dead = 1;
      } else {
        var base = a.z < pf ? SH : 0, fr = a.y > base + 0.03 ? 2.4 : 4.6, k = 1 - fr * DT;
        a.vx *= k; a.vz *= k; if (a.vx * a.vx + a.vz * a.vz > 36) { a.vx *= 0.8; a.vz *= 0.8; }
        a.x += a.vx * DT; a.z += a.vz * DT; a.sp += a.wr * DT; a.wr *= 0.97;
      }
    }
    // keep them in order, back to front (a few swaps at most): the sweep below then passes a push forward through a column
    for (i = 1; i < items.length; i++) { a = items[i]; j = i - 1; while (j >= 0 && items[j].z > a.z) { items[j + 1] = items[j]; j--; } items[j + 1] = a; }
    n = items.length;
    // 2. things pushing on things
    for (var iter = 0; iter < ITER; iter++) {
      for (i = 0; i < n; i++) {
        a = items[i]; if (a.st === 2) continue;
        if (a.x < -HX + a.r) { a.x = -HX + a.r; if (a.vx < 0) a.vx *= -0.15; } else if (a.x > HX - a.r) { a.x = HX - a.r; if (a.vx > 0) a.vx *= -0.15; }
        if (a.z < ZB + a.r) { a.z = ZB + a.r; if (a.vz < 0) a.vz *= -0.15; }
        // the shelf's front face is a wall for anything lying on the deck in front of it
        if (a.y < SH - 0.04 && a.z >= pf - 0.02 && a.z - a.r < pf) { a.z = pf + a.r; if (a.vz < vf) a.vz = vf; }
        for (j = i + 1; j < n; j++) {
          b = items[j]; if (b.z - a.z > a.r + 0.72) break; if (b.st === 2) continue;
          var dy = a.y - b.y, hm = dy > 0 ? b.h : a.h; if (dy < 0 ? -dy >= hm * 0.9 : dy >= hm * 0.9) continue;
          var dx = b.x - a.x, dz = b.z - a.z, rr = a.r + b.r, d2 = dx * dx + dz * dz; if (d2 >= rr * rr) continue;
          var d = Math.sqrt(d2) || 0.0001, nx = dx / d, nz = dz / d, ov = rr - d; if (d < 0.0002) { nx = 1; nz = 0; }
          var wa = a.im / (a.im + b.im), wb = 1 - wa;
          a.x -= nx * ov * wa; a.z -= nz * ov * wa; b.x += nx * ov * wb; b.z += nz * ov * wb;
          var vn = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
          if (vn < 0 && iter === 0) {
            var jm = -(1 + 0.12) * vn / (a.im + b.im); a.vx -= jm * a.im * nx; a.vz -= jm * a.im * nz; b.vx += jm * b.im * nx; b.vz += jm * b.im * nz;
            if (-vn > 0.7) { impacts++; if (-vn > impactV) impactV = -vn; }
          }
        }
      }
    }
    // 3. what is each thing standing on? (the deck, the shelf, or a coin under it): land, slide off, or fall
    for (i = 0; i < n; i++) {
      a = items[i]; if (a.st === 2 || a.dead) continue;
      var bs = a.z < pf ? SH : 0, surf = bs, sup = null, supD = 9;
      if (!a.k) {
        for (j = i - 1; j >= 0; j--) { b = items[j]; if (a.z - b.z > a.r + 0.72) break; if (b.k || b.st === 2 || b.dead) continue; var tp = b.y + b.h; if (tp > a.y + 0.03 || tp <= surf - 0.001) continue; var ddx = a.x - b.x, ddz = a.z - b.z, dd = Math.sqrt(ddx * ddx + ddz * ddz); if (dd < b.r * 0.98) { if (tp > surf + 0.001 || dd < supD) { surf = tp; sup = b; supD = dd; } } }
        for (j = i + 1; j < n; j++) { b = items[j]; if (b.z - a.z > a.r + 0.72) break; if (b.k || b.st === 2 || b.dead) continue; var tp2 = b.y + b.h; if (tp2 > a.y + 0.03 || tp2 <= surf - 0.001) continue; var ex = a.x - b.x, ez = a.z - b.z, ed = Math.sqrt(ex * ex + ez * ez); if (ed < b.r * 0.98) { if (tp2 > surf + 0.001 || ed < supD) { surf = tp2; sup = b; supD = ed; } } }
      }
      if (a.st === 1) {
        if (a.y <= surf + 0.002 && a.vy <= 0) {
          var iv = -a.vy; a.y = surf; if (surf > bs + 0.01 && !a.k) { a.vx += rnd(-0.7, 0.7); a.vz += rnd(-0.5, 0.5); }
          if (iv > 2.6 && a.bn < 2 && a.e > 0.06) { a.vy = iv * a.e; a.bn++; a.sp += 0.6; a.wr += rnd(-4, 4); if (iv > 3.4) { if (a.k) { impacts++; impactV = Math.max(impactV, 0.9); landV = Math.max(landV, 1); } else landV = Math.max(landV, Math.min(1, iv / 9)); } }
          else { a.st = 0; a.vy = 0; a.vx *= 0.5; a.vz *= 0.5; a.bn = 0; if (iv > 1.2) landV = Math.max(landV, a.k ? 1 : Math.min(1, iv / 8)); if (a.k) a.wob = 1; }
        }
      } else {
        if (a.y > surf + 0.025) { a.st = 1; a.vy = 0; a.bn = 1; a.wr = rnd(-3, 3); if (sup === null && a.y > bs + 0.05) { /* lost what held it up: it tumbles a little */ a.vx += rnd(-0.4, 0.4); a.vz += rnd(-0.2, 0.4); } else if (a.k) a.wob = 1; }
        else {
          if (a.y < surf) a.y = Math.min(surf, a.y + 0.06);
          if (sup) {
            var off = supD / sup.r; var cp = Math.min(1, 9 * DT); a.vx += (sup.vx - a.vx) * cp; a.vz += (sup.vz - a.vz) * cp;
            if (a.y > bs + 2.6 * T && !a.k) { var tx = (a.x - sup.x) || rnd(-1, 1), tz = (a.z - sup.z) || rnd(-1, 1), tl = Math.sqrt(tx * tx + tz * tz) || 1; a.vx += tx / tl * 1.6 * 0.12 * 60 * DT * 6; a.vz += tz / tl * 1.6 * 0.12 * 60 * DT * 6; a.tilt = 0.35; } else if (off > 0.5) { var ux = (a.x - sup.x) / (supD || 1), uz = (a.z - sup.z) / (supD || 1), sl = 7 * (off - 0.5); a.vx += ux * sl * DT * 60 * 0.12; a.vz += uz * sl * DT * 60 * 0.12; a.tilt = Math.min(0.5, (off - 0.5) * 1.1); } else a.tilt *= 0.9;
          } else {
            if (bs === SH && vf > 0 && a.y <= SH + 0.02) { var c2 = Math.min(1, 16 * DT); a.vz += (vf - a.vz) * c2; }   // the shelf drags what lies on it forward
            if (!a.k) a.tilt *= 0.9;
          }
          // the lip: over the edge it goes. A little hang first.
          a.over = Math.max(0, (a.z + a.r * 0.5 - ZE) / (a.r * 1.1));
          if (a.over > 0.35 && a.z > ZE - 0.12) a.vz += 3.2 * DT;
          if (a.z > ZE) startFall(a);
        }
      }
      if (a.wob > 0) a.wob = Math.max(0, a.wob - DT * 1.1);
      if (a.st === 1 && a.z > ZE + 0.2) startFall(a);
    }
    // 4. things that reached the tray
    for (i = items.length - 1; i >= 0; i--) { a = items[i]; if (a.dead) { if (a.st === 2 && !silent) onTray(a); freeList.push(a); items[i] = items[items.length - 1]; items.pop(); } }
  }
  function startFall(a) {
    a.st = 2; a.vy = Math.min(a.vy, 0) - 0.3; a.vz = Math.max(a.vz, 0) + 1.5 + Math.random() * 1.1; a.vx += rnd(-0.5, 0.5); a.wr = rnd(-9, 9); a.vt = a.k ? 4.5 : 5 + Math.random() * 3; a.tmax = a.k ? 1.5 : 1.7; a.lane = a.x < -HX * 0.5 ? 0 : a.x > HX * 0.5 ? 2 : 1; a.bn = 0;
    if (!silent) edgeN++;
  }

  // ---------------------------------------------------------------- the view: one canvas, three painted layers and what moves
  var stage = $('#cp-stage'), canvas = $('#cp-canvas'), g = canvas ? canvas.getContext('2d') : null;
  var cam = null, dpr = 1, cw = 0, ch = 0, LB = null, LF = null, LG = null, trayL = null, scene = null, signCv = null, signMsg = '', bulbs = [], bulbSpr = null;
  var tray = [[], [], []], trayDirty = true, pupSpr = {}, sceneKey = '';
  var BIN = [[-HX, -HX * 0.5], [-HX * 0.5, HX * 0.5], [HX * 0.5, HX]], TRAY_CAP = [26, 60, 26];
  function themeId() { return A.THEMES[st.cab.theme] ? st.cab.theme : 'walnut'; }
  function buildScene() {
    if (!stage || !g) return;
    var w = stage.clientWidth, h = stage.clientHeight; if (w < 40 || h < 40) return;
    var want = Math.min(window.devicePixelRatio || 1, PHONE ? 1.75 : 2); if (w * h * want * want > 1500000) want = Math.max(1, Math.sqrt(1500000 / (w * h)));
    dpr = want; cw = Math.round(w * dpr); ch = Math.round(h * dpr);
    var key = cw + 'x' + ch + '|' + themeId() + '|' + mode; if (key === sceneKey && cam) return; sceneKey = key;
    canvas.width = cw; canvas.height = ch; cam = A.camera(cw, ch);
    var dark = mode === 'night', th = themeId();
    LB = A.mk(cw, ch); scene = A.paintBack(LB.getContext('2d'), cam, th, dark);
    LF = A.mk(cw, ch); A.paintFront(LF.getContext('2d'), cam, th, dark);
    LG = A.mk(cw, ch); A.paintGlass(LG.getContext('2d'), cam, th, dark);
    trayL = A.mk(cw, ch); trayDirty = true; signMsg = ''; pupSpr = {};
    // the bulbs around the sign
    bulbs = []; var s = scene.sign, nb = 16, i, p;
    function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
    var tl = lerp(s.tl, s.bl, -0.12), tr = lerp(s.tr, s.br, -0.12), bl = lerp(s.bl, s.tl, -0.12), br = lerp(s.br, s.tr, -0.12);
    tl = [tl[0] - 8 * dpr, tl[1]]; bl = [bl[0] - 8 * dpr, bl[1]]; tr = [tr[0] + 8 * dpr, tr[1]]; br = [br[0] + 8 * dpr, br[1]];
    for (i = 0; i <= nb; i++) { p = lerp(tl, tr, i / nb); bulbs.push(p); p = lerp(bl, br, i / nb); bulbs.push(p); }
    for (i = 1; i < 3; i++) { bulbs.push(lerp(tl, bl, i / 3)); bulbs.push(lerp(tr, br, i / 3)); }
    var br2 = Math.max(3, (s.tr[0] - s.tl[0]) / 70); bulbSpr = A.mk(br2 * 6, br2 * 6); var bg = bulbSpr.getContext('2d'), grd = bg.createRadialGradient(br2 * 3, br2 * 3, 0, br2 * 3, br2 * 3, br2 * 3);
    grd.addColorStop(0, 'rgba(255,250,225,1)'); grd.addColorStop(0.25, 'rgba(255,226,150,.95)'); grd.addColorStop(0.5, 'rgba(255,190,90,.35)'); grd.addColorStop(1, 'rgba(255,170,60,0)'); bg.fillStyle = grd; bg.fillRect(0, 0, br2 * 6, br2 * 6);
  }
  function paintSign(msg) {
    if (!scene) return; var th = A.pal(themeId(), mode === 'night');
    signCv = signCv || A.mk(1024, 190); var c = signCv.getContext('2d'); c.clearRect(0, 0, 1024, 190);
    var gr = c.createLinearGradient(0, 0, 0, 190); gr.addColorStop(0, th.sign[0]); gr.addColorStop(1, th.sign[1]); c.fillStyle = gr; c.beginPath(); c.roundRect ? c.roundRect(6, 6, 1012, 178, 26) : c.rect(6, 6, 1012, 178); c.fill();
    c.strokeStyle = th.trim; c.lineWidth = 7; c.stroke(); c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2; c.beginPath(); c.roundRect ? c.roundRect(16, 16, 992, 158, 20) : c.rect(16, 16, 992, 158); c.stroke();
    var size = 84; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '600 ' + size + 'px Fraunces, Georgia, serif';
    while (c.measureText(msg).width > 900 && size > 34) { size -= 4; c.font = '600 ' + size + 'px Fraunces, Georgia, serif'; }
    c.shadowColor = th.glow; c.shadowBlur = 28; c.fillStyle = '#FFF3D6'; c.fillText(msg, 512, 98); c.shadowBlur = 0; c.fillStyle = '#FFF8E8'; c.fillText(msg, 512, 98);
    signMsg = msg;
  }
  var marqIdx = 0, marqAt = 0, marqFade = 1, marqNext = '';
  function marqueeStep(dt) {
    var lines = st.cab.marq && !calm ? marqueeLines() : [A.MARQUEE.start[0]];
    if (!signMsg) { paintSign(lines[0]); marqAt = clock; return; }
    if (marqNext) { marqFade -= dt * 2.5; if (marqFade <= 0) { paintSign(marqNext); marqNext = ''; marqFade = 0; } return; }
    if (marqFade < 1) { marqFade = Math.min(1, marqFade + dt * 2.5); return; }
    if (lines.length > 1 && clock - marqAt > 9) { marqAt = clock; marqIdx = (marqIdx + 1) % lines.length; if (lines[marqIdx] !== signMsg) { marqNext = lines[marqIdx]; marqFade = 1; } }
    else if (lines.length === 1 && signMsg !== lines[0]) { marqNext = lines[0]; }
  }
  function pupSprite(look, pose, flip, blink) {
    var k = look + pose + (flip ? 'f' : '') + (blink ? 'b' : ''), P = window.TOLPups; if (pupSpr[k]) return pupSpr[k];
    var c = A.mk(170, 120), q = c.getContext('2d'); pupSpr[k] = c; if (!P) return c;
    q.translate(flip ? 100 : 70, 108); if (flip) q.scale(-2.3, 2.3); else q.scale(2.3, 2.3);
    try { P.draw(q, P.looks[look], pose, 0.5, 0.25, !!blink, 0, 0); } catch (e) {}
    return c;
  }

  // ---------------------------------------------------------------- particles (a hard cap, reused)
  var parts = [], partFree = [], pi0;
  for (pi0 = 0; pi0 < MAXP; pi0++) partFree.push({ k: 0, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, s: 4, c: '#FFE7A0', r: 0, vr: 0, txt: '' });
  function addPart(k, x, y, vx, vy, life, s, c, txt) {
    if (!partFree.length || (calm && parts.length >= MAXP_CALM)) return null;
    var p = partFree.pop(); p.k = k; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = p.max = life; p.s = s; p.c = c; p.r = rnd(0, TAU); p.vr = rnd(-4, 4); p.txt = txt || ''; parts.push(p); return p;
  }
  var CONF = ['#E9C46F', '#F2A98A', '#B9A2D9', '#8EC5EA', '#7DB07A', '#E2556A', '#FFF3CC'];
  function sparkleAtWorld(x, y, z, n, col) {
    if (!cam || (calm && n > 5)) n = calm ? Math.min(n, 4) : n; var p = cam.project(x, y, z), s = p[2];
    for (var i = 0; i < n; i++) { var an = rnd(0, TAU), sp = rnd(0.5, 2.2) * s; addPart(1, p[0], p[1], Math.cos(an) * sp, Math.sin(an) * sp - s * 0.8, rnd(0.5, 0.95), rnd(2.4, 5) * dpr, col || '#FFE7A0'); }
  }
  function confetti(n) {
    if (calm || !cam) return; for (var i = 0; i < n; i++) addPart(2, rnd(0, cw), rnd(-0.3, 0) * ch, rnd(-30, 30) * dpr, rnd(60, 150) * dpr, rnd(2.2, 3.6), rnd(5, 9) * dpr, CONF[i % CONF.length]);
  }
  function floatText(x, y, z, txt, col) { if (!cam) return; var p = cam.project(x, y, z); addPart(3, p[0], p[1], 0, -42 * dpr, 0.95, 15 * dpr, col || '#FFF3CC', txt); }
  function zzAt(x, y, z) { if (!cam || calm) return; var p = cam.project(x, y, z); addPart(4, p[0], p[1], rnd(6, 14) * dpr, -rnd(16, 26) * dpr, 1.8, rnd(11, 16) * dpr, '#DDE6FF', 'Z'); }
  function updateParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.life -= dt;
      if (p.life <= 0) { partFree.push(p); parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      if (p.k === 2) { p.vy += 40 * dpr * dt; } else if (p.k === 1) { p.vy += 90 * dpr * dt; p.vx *= 0.98; }
    }
  }
  function drawParts() {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], a = Math.max(0, Math.min(1, p.life / Math.min(0.6, p.max)));
      g.globalAlpha = a;
      if (p.k === 1) { var s = p.s; g.fillStyle = p.c; g.beginPath(); g.moveTo(p.x, p.y - s * 1.7); g.quadraticCurveTo(p.x, p.y, p.x + s * 1.7, p.y); g.quadraticCurveTo(p.x, p.y, p.x, p.y + s * 1.7); g.quadraticCurveTo(p.x, p.y, p.x - s * 1.7, p.y); g.quadraticCurveTo(p.x, p.y, p.x, p.y - s * 1.7); g.fill(); }
      else if (p.k === 2) { g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.scale(1, Math.abs(Math.cos(p.r * 1.7)) + 0.15); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); }
      else if (p.k === 3) { g.fillStyle = p.c; g.font = '700 ' + p.s + 'px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.fillText(p.txt, p.x, p.y); g.lineWidth = 0; }
      else if (p.k === 4) { g.fillStyle = p.c; g.font = '700 ' + p.s + 'px Fraunces, Georgia, serif'; g.textAlign = 'center'; g.fillText(p.txt, p.x + Math.sin(p.r) * 3, p.y); }
      else if (p.k === 5) { g.fillStyle = p.c; A.heartPath(g, p.x, p.y, p.s); g.fill(); }
    }
    g.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- drawing the frame
  var fxShake = 0, fxZoom = 0, zoomHold = 0, zoomAmt = 1, clock = 0, aimX = 0, aimShow = 0, bulbLevel = 1, evTint = 0, evKind = '', dash = 0, dashDir = 1;
  function drawTray() {
    if (!trayDirty) return; trayDirty = false;
    var q = trayL.getContext('2d'); q.clearRect(0, 0, cw, ch);
    var skinCoin = function (t, rr) { return A.coin(st.cab.skin, t === 'coin' ? '' : t, rr, 0); };
    var list = [];
    for (var b = 0; b < 3; b++) tray[b].forEach(function (c) { list.push(c); });
    list.sort(function (m, n) { return (m.z + m.lv * 0.3) - (n.z + n.lv * 0.3); });
    // the two pups in their corners (drawn first, so coins land in front of and around them)
    [[0, 'drop', 'lie', false, true], [2, 'collar', 'sit', true, false]].forEach(function (c) {
      var lane = c[0], x = (BIN[lane][0] + BIN[lane][1]) / 2, p = cam.project(x, TRAY_Y + 0.02, ZE + 1.95), wpx = cam.scaleAt(TRAY_Y, ZE + 2) * 2.1, spr = pupSprite(c[1], c[2], c[3], c[4]), hh = wpx * 120 / 170;
      // a cushion (left) or a spring pad (right) under them
      q.save(); q.translate(p[0], p[1]); q.scale(1, Math.sin(W.PITCH)); q.fillStyle = lane === 0 ? 'rgba(150,160,230,.95)' : 'rgba(240,150,90,.95)'; q.beginPath(); q.ellipse(0, 0, wpx * 0.52, wpx * 0.36, 0, 0, TAU); q.fill(); q.fillStyle = lane === 0 ? 'rgba(210,215,255,.9)' : 'rgba(255,205,150,.9)'; q.beginPath(); q.ellipse(0, -wpx * 0.03, wpx * 0.4, wpx * 0.26, 0, 0, TAU); q.fill(); q.restore();
      var hop = lane === 2 ? -Math.abs(Math.sin(clock * 5)) * wpx * 0.05 * (calm ? 0 : 1) : 0;
      q.drawImage(spr, p[0] - wpx / 2, p[1] - hh * 0.9 + hop, wpx, hh);
    });
    list.forEach(function (c) { var p = cam.project(c.x, TRAY_Y + (c.lv + 1) * T, c.z), s = skinCoin(c.t, R * p[2] * 0.96); var sh = A.shadow(R * p[2]); q.globalAlpha = 0.5; q.drawImage(sh.c, p[0] - sh.ox, p[1] - sh.oy + 2); q.globalAlpha = 1; q.drawImage(s.c, p[0] - s.ox, p[1] - s.oy); });
  }
  var trayPups = [0, 0];
  function drawFrame(dt) {
    if (!cam) return;
    // the camera: a tiny shake and a slow zoom
    var sx = 0, sy = 0, z = 1;
    if (!calm) { if (fxShake > 0.02) { sx = (Math.random() - 0.5) * fxShake * 7 * dpr; sy = (Math.random() - 0.5) * fxShake * 5 * dpr; fxShake *= Math.pow(0.004, dt); } else fxShake = 0; z = zoomAmt; } else { fxShake = 0; }
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = mode === 'night' ? '#14101D' : '#E6C795'; if (sx || sy || z !== 1) g.fillRect(0, 0, cw, ch);
    g.setTransform(z, 0, 0, z, cw * (1 - z) / 2 + sx, ch * 0.52 * (1 - z) + sy);
    g.drawImage(LB, 0, 0);
    drawSignAndBulbs();
    drawShelf();
    g.drawImage(LF, 0, 0);
    drawTray(); g.drawImage(trayL, 0, 0);
    drawAim();
    drawItems();
    g.drawImage(LG, 0, 0);
    drawParts();
    if (evTint > 0.01 && !calm) { g.globalAlpha = evTint; g.fillStyle = evKind === 'nap' ? 'rgba(70,90,190,.5)' : 'rgba(255,170,80,.28)'; g.fillRect(0, 0, cw, ch); g.globalAlpha = 1; }
    if (dash > 0 && !calm) drawDash();
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  function drawSignAndBulbs() {
    var s = scene.sign; if (signCv) {
      var a = marqNext ? Math.max(0, marqFade) : marqFade; g.globalAlpha = 0.25 + 0.75 * a;
      g.save(); g.transform(s.tr[0] - s.tl[0], s.tr[1] - s.tl[1], s.bl[0] - s.tl[0], s.bl[1] - s.tl[1], s.tl[0], s.tl[1]); g.drawImage(signCv, 0, 0, 1, 1); g.restore(); g.globalAlpha = 1;
    }
    var bw = bulbSpr.width, k, lvl = (evKind && !calm) ? 1 : 0.9;
    for (k = 0; k < bulbs.length; k++) {
      var ph = calm ? 0.8 : 0.62 + 0.38 * Math.sin(clock * 2.1 - k * 0.55); g.globalAlpha = Math.min(1, ph * lvl);   // slow swells, never a flash
      g.drawImage(bulbSpr, bulbs[k][0] - bw / 2, bulbs[k][1] - bw / 2);
    }
    g.globalAlpha = 1;
  }
  function drawShelf() {
    var P = cam.project, th = A.pal(themeId(), mode === 'night'), a = P(-HX, SH, ZB), b = P(HX, SH, ZB), c = P(HX, SH, pf), d = P(-HX, SH, pf), e = P(-HX, 0, pf), f = P(HX, 0, pf);
    var gr = g.createLinearGradient(0, a[1], 0, d[1]); gr.addColorStop(0, A.dk(th.wood[1], 0.15)); gr.addColorStop(1, th.wood[0]);
    g.fillStyle = gr; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.fill();
    g.fillStyle = A.dk(th.wood[1], 0.1); g.beginPath(); g.moveTo(d[0], d[1]); g.lineTo(c[0], c[1]); g.lineTo(f[0], f[1]); g.lineTo(e[0], e[1]); g.closePath(); g.fill();
    // a brass edge on the front, and a soft shadow on the deck in front of it
    var th2 = Math.max(2, d[2] * 0.07); g.fillStyle = th.trim; g.fillRect(d[0], d[1] - th2, c[0] - d[0], th2 * 1.1); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(d[0], d[1] - th2, c[0] - d[0], 1);
    var sh = g.createLinearGradient(0, e[1], 0, e[1] + d[2] * 0.5); sh.addColorStop(0, 'rgba(0,0,0,.3)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(e[0], e[1], f[0] - e[0], d[2] * 0.5);
  }
  function drawAim() {
    if (aimShow <= 0 && !awaitingFirst) return; var P = cam.project, p = P(aimX, SLOT_Y, SLOT_Z), q = P(aimX, SH, SLOT_Z + 0.05), pulse = calm ? 0 : Math.sin(clock * 3) * 0.04;
    g.save(); g.globalAlpha = Math.min(0.65, (awaitingFirst ? 0.65 : aimShow));
    g.strokeStyle = 'rgba(255,248,220,.8)'; g.lineWidth = Math.max(1.5, dpr * 1.4); g.setLineDash([4 * dpr, 5 * dpr]); g.beginPath(); g.moveTo(p[0], p[1] + p[2] * 0.18); g.lineTo(q[0], q[1]); g.stroke(); g.setLineDash([]);
    var sp = A.coin(st.cab.skin, '', R * p[2], 1); g.globalAlpha = Math.min(0.85, (awaitingFirst ? 0.8 : aimShow + 0.2)); g.drawImage(sp.c, p[0] - sp.ox, p[1] - sp.oy + pulse * p[2]); g.restore();
  }
  var sortArr = [];
  function drawItems() {
    var n = items.length, i, a, P = cam.project; sortArr.length = n;
    for (i = 0; i < n; i++) sortArr[i] = items[i];
    for (i = 1; i < n; i++) { a = sortArr[i]; var ka = a.z + a.y * 0.55, j = i - 1; while (j >= 0 && sortArr[j].z + sortArr[j].y * 0.55 > ka) { sortArr[j + 1] = sortArr[j]; j--; } sortArr[j + 1] = a; }
    for (i = 0; i < n; i++) { a = sortArr[i]; if (a.dead) continue; if (a.k) drawPrize(a); else drawCoin(a); }
  }
  function drawCoin(a) {
    var P = cam.project, ground = a.st === 2 ? Math.max(a.y, TRAY_Y) : 0, p = P(a.x, a.y + a.h, a.z), rp = a.r * p[2];
    var kind = a.ty === 'coin' ? '' : a.ty === 'big' ? '' : a.ty, spr = A.coin(st.cab.skin, kind, rp, a.rk);
    // a soft shadow on whatever is below
    if (a.st !== 2) { var sp = P(a.x + 0.05, Math.max(0, a.y - (a.st === 1 ? 0 : a.h * 0.2)), a.z + 0.04), sh = A.shadow(rp); g.globalAlpha = a.st === 1 ? Math.max(0.15, 0.55 - a.y * 0.12) : (a.y > 0.05 ? 0.45 : 0.55); g.drawImage(sh.c, sp[0] - sh.ox, sp[1] - sh.oy + (a.st === 1 ? 0 : spr.th * 0.3)); g.globalAlpha = 1; }
    if (a.st === 2 || a.over > 0.05 || a.st === 1 && Math.abs(a.vy) > 1) {
      // tipping, tumbling: squash it the way a turning coin looks, and lean it over the lip
      var tl = a.st === 2 ? a.tilt : a.over * 0.5 + (calm ? 0 : Math.sin(clock * 15 + a.sp) * 0.03 * Math.min(1, a.over * 2)), sy = a.st === 2 ? Math.max(0.28, Math.abs(Math.cos(a.sp * 0.9))) : Math.max(0.7, 1 - tl * 0.15) * (1 + tl * 0.18);
      g.save(); g.translate(p[0], p[1] + (a.st === 2 ? 0 : a.over * rp * 0.18)); if (a.st === 2) g.rotate(Math.sin(a.sp * 0.5) * 0.5); g.scale(1, sy); g.drawImage(spr.c, -spr.ox, -spr.oy); g.restore();
    } else if (a.st === 1 && a.ty === 'bouncy' || a.tilt > 0.05) {
      g.save(); g.translate(p[0], p[1]); g.scale(1, 1 - a.tilt * 0.12); g.drawImage(spr.c, -spr.ox, -spr.oy); g.restore();
    } else g.drawImage(spr.c, p[0] - spr.ox, p[1] - spr.oy);
    if (a.ty === 'big') { /* the big lucky coin is simply a bigger coin (its radius is bigger) */ }
  }
  function drawPrize(a) {
    var P = cam.project, base = P(a.x, a.y, a.z), wu = (a.r * 2) / (a.sz === 'charm' ? 0.5 : 0.6), px = Math.max(24, Math.round(wu * base[2] / 8) * 8), spr = A.figure(a.pid, Math.min(256, px)), size = wu * base[2];
    var sh = A.shadow(a.r * base[2] * 1.05); g.globalAlpha = a.st === 1 ? 0.35 : 0.6; var gp = P(a.x, 0, a.z); g.drawImage(sh.c, gp[0] - sh.ox, gp[1] - sh.oy); g.globalAlpha = 1;
    // teeter: the nearer the edge, the more it leans and wobbles
    var lean = a.st === 2 ? a.tilt : Math.min(0.6, a.over * 0.7), wob = (calm ? 0 : Math.sin(clock * 14 + a.sp * 3) * 0.045 * (a.over > 0.1 ? Math.min(1, a.over * 2) : 0)) + (calm ? 0 : Math.sin(clock * 22) * 0.05 * a.wob);
    g.save(); g.translate(base[0], base[1]); g.rotate(wob + (a.st === 2 ? Math.sin(a.sp * 0.4) * 0.25 : 0)); g.scale(1 + lean * 0.1, Math.max(0.4, 1 - lean * 0.45)); g.drawImage(spr, -size / 2, -size * 0.84, size, size); g.restore();
    if (a.rar >= 3 && !calm && a.st !== 2) { var tw = (Math.sin(clock * 2 + a.sp) + 1) / 2; g.globalAlpha = 0.25 + 0.5 * tw; g.fillStyle = '#FFF3CC'; var sx = base[0] + Math.cos(a.sp) * size * 0.28, sy2 = base[1] - size * (0.55 + 0.2 * Math.sin(a.sp * 2)); g.beginPath(); g.moveTo(sx, sy2 - 5 * dpr); g.quadraticCurveTo(sx, sy2, sx + 5 * dpr, sy2); g.quadraticCurveTo(sx, sy2, sx, sy2 + 5 * dpr); g.quadraticCurveTo(sx, sy2, sx - 5 * dpr, sy2); g.quadraticCurveTo(sx, sy2, sx, sy2 - 5 * dpr); g.fill(); g.globalAlpha = 1; }
  }
  function drawDash() {
    // Tidbit runs across the top of the machine during the zoomies
    var spr = A.figure('tidbit', 128), x = (dashDir > 0 ? dash : 1 - dash) * cw * 1.3 - cw * 0.15, y = ch * 0.3 + Math.sin(dash * 30) * 6 * dpr, s = cw * 0.2;
    g.save(); g.globalAlpha = 0.95; g.translate(x, y); if (dashDir < 0) g.scale(-1, 1); g.drawImage(spr, -s / 2, -s * 0.8, s, s); g.restore();
  }

  // ---------------------------------------------------------------- sound and buzz, from what happened in a step
  var lastSnd = 0;
  function sound(n, a) { if (SFX && soundOn() && !silent) SFX.play(n, a); }
  function flushImpacts() {
    if (impacts > 0) { var k = Math.min(3, impacts); for (var i = 0; i < k; i++) sound('clink', Math.min(1, impactV / 3.5)); impacts = 0; impactV = 0; }
    if (landV > 0) { sound('land', landV); landV = 0; }
    if (edgeN > 0) { edgeN = 0; }
  }

  // ---------------------------------------------------------------- dropping
  var awaitingFirst = !st.drops && !DEBUG_ALL, lastSurprise = 0;
  function evChip(txt, secs) {
    var e = $('#cp-evt'); if (!e) return; e.textContent = txt; e.hidden = false; e.classList.remove('is-on'); void e.offsetWidth; e.classList.add('is-on'); clearTimeout(evChip.t); evChip.t = setTimeout(function () { e.classList.remove('is-on'); setTimeout(function () { if (!e.classList.contains('is-on')) e.hidden = true; }, 300); }, (secs || 2.4) * 1000);
  }
  function drop(x, o) {
    o = o || {}; if (paused && !o.free) return false;
    if (liveCoins() >= COIN_MAX) { if (!o.free) evChip('The deck is full. Let the shelf work for a moment.', 2); return false; }
    x = clamp(x == null ? aimX : x, -HX + R, HX - R);
    var ty = o.type || 'coin';
    if (!o.free && !o.type) {
      if (evKind === 'zoom') ty = 'bouncy';
      else if (clock - lastSurprise > 14 && Math.random() < 0.05) { ty = ['bouncy', 'bouncy', 'heavy', 'big', 'rainbow'][(Math.random() * 5) | 0]; lastSurprise = clock; var nm = { bouncy: 'A bouncy coin!', heavy: 'A heavy coin: it shoves.', big: 'A big lucky coin!', rainbow: 'A rainbow coin: worth 3.' }[ty]; evChip(nm, 2.6); say(nm); }
    }
    var a = spawn(x + rnd(-0.1, 0.1), SLOT_Z + rnd(-0.1, 0.25), SLOT_Y, ty); if (!a) return false;
    a.st = 1; a.vy = -0.4; a.wr = rnd(-6, 6); a.vx = rnd(-0.05, 0.05);
    if (calm && !o.free) pushIdle = Math.max(pushIdle, PERIOD * 1.7);
    if (!o.free) {
      awaitingFirst = false; st.drops++; st.since++; lastActive = clock; goalEvent('drop'); maybePrize(x); sound('drop'); buzz(8);
      if (st.drops % 5 === 0) say(st.drops + ' coins dropped.'); save(); updateHud();
    }
    return true;
  }
  // prizes: the first chances are small, and by about 14 coins one is sure (so nobody waits forever); never more than 3 on the deck
  function maybePrize(x) {
    if (prizesOnDeck() + 0 >= 3) return;
    var s = st.since, chance = s < 5 ? 0.03 : s >= 14 ? 1 : 0.07 + (s - 5) * 0.06;
    if (Math.random() < chance) sendPrize(x);
  }
  var RARW = [0, 10, 6, 3, 1.1];
  function pickPrizeId() {
    var pend = st.pend, total = 0, pool = [];
    A.ITEMS.forEach(function (it) { if (pend.indexOf(it.id) >= 0) return; var w = RARW[it.rar] * (st.found[it.id] ? 0.22 : 1); pool.push([it.id, w]); total += w; });
    var r = Math.random() * total; for (var i = 0; i < pool.length; i++) { r -= pool[i][1]; if (r <= 0) return pool[i][0]; }
    return pool.length ? pool[0][0] : null;
  }
  function sendPrize(x, id) {
    if (prizesOnDeck() >= 3) return false; id = id || pickPrizeId(); if (!id) return false;
    var a = spawnPrize(id, clamp((x == null ? aimX : x) + rnd(-0.6, 0.6), -HX + 0.7, HX - 0.7), SLOT_Z + 0.2, SLOT_Y + 0.3); if (!a) return false;
    a.st = 1; a.vy = -0.2; st.since = 0; st.pend.push(id); save();
    say('A prize rode in with your coin: ' + A.byId(id).name + '. Push it over the edge.');
    sound('ui'); return true;
  }

  // ---------------------------------------------------------------- what reaches the tray
  var chain = { n: 0, last: 0, coins: 0 }, lastBigAt = -99, evUntil = 0, lastEvAt = -99, lastActive = 0;
  function trayAddCoin(a) {
    var b = a.lane, bin = tray[b], rg = BIN[b], x = clamp(a.x, rg[0] + 0.3, rg[1] - 0.3), z = clamp(a.z, TRAY_Z0, TRAY_Z1 - (b === 1 ? 0 : 0.2)), lv = 0, i;
    for (i = 0; i < bin.length; i++) { var c = bin[i], dd = Math.abs(c.x - x) + Math.abs(c.z - z); if (dd < 0.5) lv = Math.max(lv, c.lv + 1); }
    bin.push({ x: x, z: z, lv: Math.min(lv, 4), t: a.ty }); if (bin.length > TRAY_CAP[b]) bin.shift(); trayDirty = true;
  }
  function onTray(a) {
    if (a.k) { gotPrize(a); return; }
    var val = a.val || 1; st.coins += val; st.meter += val; st.jar += val; chain.n++; chain.coins += val; chain.last = clock;
    trayAddCoin(a); goalEvent('coin', val);
    var lane = a.lane; if (lane === 0) { st.lane.l = Math.min(LANE_N, st.lane.l + 1); goalEvent('lane0'); } else if (lane === 2) { st.lane.r = Math.min(LANE_N, st.lane.r + 1); goalEvent('lane2'); }
    sound('tray', chain.n); sound('collect', chain.n - 1); buzz(chain.n >= 6 ? 14 : 8);
    if (!calm || chain.n < 3) { var p = cam ? cam.project(a.x, TRAY_Y, a.z) : null; if (p && !(calm)) { sparkleAtWorld(a.x, TRAY_Y + 0.3, a.z, 4, a.ty === 'rainbow' ? '#FFD6F5' : '#FFE7A0'); } }
    if (val > 1) floatText(a.x, TRAY_Y + 0.6, a.z, '+' + val, '#FFF3CC'); else if (chain.n <= 3 || chain.n % 3 === 0) floatText(a.x, TRAY_Y + 0.6, a.z, '+1', '#FFF3CC');
    comboShow();
    while (st.meter >= METER_N) { st.meter -= METER_N; meterFull(); }
    if (st.coins >= JAR_OPEN && !jarWasOpen) { jarWasOpen = true; say('The tip jar is open. Tips will slip out as coins fall.'); toast('The tip jar is open.'); if (soundOn()) sound('goal'); renderJar(); }
    if (lane === 0 && st.lane.l >= LANE_N && !evKind && clock - lastEvAt > 12) startNap();
    if (lane === 2 && st.lane.r >= LANE_N && !evKind && clock - lastEvAt > 12) startZoomies();
    save(); updateHud();
  }
  function meterFull() { toast('Kindness meter full: a prize is on its way.'); say('The kindness meter is full. A prize is on its way.'); if (!sendPrize(null)) st.since = 99; }

  // a cascade: the coins that tip over the edge within a moment of each other
  var comboEl = $('#cp-combo'), comboT = 0;
  function comboShow() {
    if (!comboEl || chain.n < 3) return;
    comboEl.textContent = 'Cascade ×' + chain.n; comboEl.setAttribute('data-lvl', chain.n >= 10 ? '3' : chain.n >= 6 ? '2' : '1'); comboEl.hidden = false; comboEl.classList.remove('is-pop'); void comboEl.offsetWidth; if (!calm) comboEl.classList.add('is-pop'); comboT = clock + 2;
  }
  function endChain() {
    var n = chain.n, coins = chain.coins; chain.n = 0; chain.coins = 0;
    if (n > st.best) { st.best = n; save(); }
    if (n >= 4) goalEvent('chain4'); if (n >= 7) goalEvent('chain7');
    if (n >= 6 && !calm) { fxShake = Math.max(fxShake, Math.min(1, n / 12)); }
    if (n >= 3) say(n + ' coins tipped over the edge at once. Kindness meter ' + st.meter + ' of ' + METER_N + '.');
    if (n >= 12 && clock - lastBigAt > 16) jackpot(n);
    else if (n >= 6) { sound('prize', 1); }
    // the tip jar: a bigger cascade brings a deeper tip, once the jar is open
    if (n >= 3) { var tier = n >= 12 ? 3 : n >= 6 ? 2 : 1; if (n >= 6 && st.jar >= 8) tipDue = Math.max(tipDue, tier + 0.5); else if (st.jar >= JAR_N) tipDue = Math.max(tipDue, tier); }
    if (st.jar >= JAR_N && !tipDue) tipDue = 1;
    maybeTip();
  }
  function jackpot(n) {
    lastBigAt = clock; var big = n || 0;
    banner({ k: 'Jackpot', t: big ? big + ' coins at once!' : 'Jackpot!', s: 'A shower of coins is on its way.', secs: 3.4, tier: 3 });
    sound('jackpot'); buzz([20, 30, 20, 30, 50]);
    if (!calm) { zoomPulse(); confetti(46); fxShake = Math.max(fxShake, 0.8); }
    for (var k = 0; k < 9; k++) laterT(function () { if (liveCoins() < COIN_MAX - 12) drop(rnd(-HX + 0.6, HX - 0.6), { free: true }); }, 350 + k * 150);
  }
  function zoomPulse() { zoomHold = clock; }
  var laterList = [];
  function laterT(fn, ms) { var id = setTimeout(function () { var i = laterList.indexOf(id); if (i >= 0) laterList.splice(i, 1); fn(); }, ms); laterList.push(id); }
  function clearLater() { laterList.forEach(clearTimeout); laterList = []; }

  // ---------------------------------------------------------------- bonus moments: Sugarfoot's naptime and Tidbit's zoomies
  var evTimer = 0;
  function endEvent() { evKind = ''; evUntil = 0; tsTarget = 1; speedMul = 1; if (SFX) SFX.pitch(1); evTintTarget = 0; evChip('', 0.01); }
  var evTintTarget = 0;
  function startNap() {
    if (evKind) return; evKind = 'nap'; lastEvAt = clock; evUntil = clock + 9.5; st.lane.l = 0; st.evs++; goalEvent('event'); save();
    banner({ k: 'Bonus', t: 'Sugarfoot’s naptime', s: 'Everything slows down for a slow, sleepy cascade.', secs: 3.4, tier: 2, id: 'sugarfoot' });
    sound('nap'); if (SFX) SFX.pitch(0.86); tsTarget = calm ? 0.8 : 0.5; evTintTarget = 0.22; buzz([30, 60, 30]);
    var n = 16; for (var k = 0; k < n; k++) laterT(function () { if (evKind === 'nap' && liveCoins() < COIN_MAX - 10) { drop(rnd(-HX + 0.7, HX - 0.7), { free: true }); if (Math.random() < 0.5) zzAt(-HX * 0.75, 0.5, ZE - 0.4); } }, 400 + k * 430);
    say('Sugarfoot’s naptime. Everything slows down while a sleepy shower of coins drifts in.'); updateLanes();
  }
  function startZoomies() {
    if (evKind) return; evKind = 'zoom'; lastEvAt = clock; evUntil = clock + 8.5; st.lane.r = 0; st.evs++; goalEvent('event'); save();
    banner({ k: 'Bonus', t: 'Tidbit’s zoomies!', s: 'Fast shelf, bouncy coins, and a coin shower.', secs: 3.2, tier: 2, id: 'tidbit' });
    sound('zoom'); if (SFX) SFX.pitch(1.1); speedMul = calm ? 1.3 : 1.9; evTintTarget = 0.1; dash = 0.001; dashDir = Math.random() < 0.5 ? 1 : -1; buzz([15, 30, 15, 30, 15]);
    var n = 14; for (var k = 0; k < n; k++) laterT(function () { if (evKind === 'zoom' && liveCoins() < COIN_MAX - 10) drop(rnd(-HX + 0.7, HX - 0.7), { free: true, type: 'bouncy' }); }, 300 + k * 260);
    say('Tidbit’s zoomies. The shelf speeds up and the coins get bouncy.'); updateLanes();
  }

  // ---------------------------------------------------------------- prizes found
  var celQ = [], celBusy = 0;
  function gotPrize(a) {
    var id = a.pid, it = A.byId(id); st.pend = st.pend.filter(function (x) { return x !== id; });
    if (!it) { save(); return; }
    var f = st.found[id], isNew = !f; if (isNew) st.found[id] = { n: 1, t: Date.now() }; else f.n++;
    var lane = a.lane; goalEvent('prize'); if (lane === 0) goalEvent('prize0'); if (lane === 2) goalEvent('prize2'); if (isNew) goalEvent('prizeNew');
    sound('thud', 1); sound('prize', it.rar); buzz(it.rar >= 3 ? [20, 40, 30] : [14, 30, 14]);
    sparkleAtWorld(a.x, TRAY_Y + 0.5, a.z, 12 + it.rar * 4, '#FFE7A0'); if (!calm) { fxShake = Math.max(fxShake, 0.45); confetti(it.rar * 8); }
    var sc = setCount(it.set), sObj = setOf(it.set), fnd = foundCount(), all = A.ITEMS.length;
    var spark = new Array(it.rar + 1).join('✦');
    if (isNew) banner({ k: 'New for your shelf · ' + fnd + ' of ' + all, t: it.name, s: sObj.name + ': ' + sc[0] + ' of ' + sc[1] + '. Sparkle level ' + it.rar + ' ' + spark, secs: 3.6, tier: it.rar >= 3 ? 3 : 2, id: id });
    else banner({ k: 'Hello again · found ' + st.found[id].n + ' times', t: it.name, s: 'Four bonus coins are on the way.', secs: 2.6, tier: 1, id: id });
    if (!isNew) for (var k = 0; k < 4; k++) laterT(function () { drop(rnd(-HX + 0.6, HX - 0.6), { free: true }); }, 500 + k * 220);
    say((isNew ? 'New for your shelf: ' : 'Hello again: ') + it.name + '. ' + it.line + (isNew ? ' ' + sObj.name + ', ' + sc[0] + ' of ' + sc[1] + '.' : ''));
    if (it.rar >= 4 && clock - lastBigAt > 16) { lastBigAt = clock; if (!calm) zoomPulse(); }
    // a finished set earns a look or a coin style
    if (isNew && sc[0] === sc[1] && !st.sets[it.set]) { st.sets[it.set] = 1; laterT(function () { setComplete(sObj); }, 2400); }
    if (isNew && fnd >= all && !st.trophy) { st.trophy = Date.now(); laterT(function () { finale(); }, 5600); }
    save(true); renderShelf(); updateHud();
  }
  function setComplete(s) {
    var r = s.reward, what = r.type === 'theme' ? 'a new cabinet look: ' + A.THEMES[r.id].name : 'a new coin style: ' + A.SKINS[r.id].name;
    banner({ k: 'Set complete', t: s.name, s: 'You earned ' + what + ', and new marquee lines.', secs: 4.2, tier: 3, id: A.ITEMS.filter(function (x) { return x.set === s.id; })[0].id });
    sound('set'); if (!calm) { confetti(60); zoomPulse(); } buzz([30, 40, 30, 40, 60]);
    say('Set complete: ' + s.name + '. You earned ' + what + '. Find it in Your cabinet, below the machine.'); renderCabinet(); renderShelf();
  }
  function finale() {
    banner({ k: 'All ' + A.ITEMS.length + ' found', t: 'You found everything!', s: 'Every set, every look, every coin style.', secs: 5, tier: 3, id: 'puddles' });
    sound('finale'); if (!calm) { confetti(120); zoomPulse(); fxShake = 1; }
    for (var k = 0; k < 24; k++) laterT(function () { if (liveCoins() < COIN_MAX - 10) drop(rnd(-HX + 0.6, HX - 0.6), { free: true, type: ['coin', 'bouncy', 'rainbow'][(Math.random() * 3) | 0] }); }, 400 + k * 190);
    laterT(function () { showCelebrate(); }, 5600); say('You found every collectible. Here is your trophy.');
  }

  // ---------------------------------------------------------------- the banner (one at a time), toasts, the live region
  var banEl = $('#cp-banner'), banArt = $('#cp-banner-art'), banQ = [], banUntil = 0, banTimer = 0, banOn = false;
  function banner(o) { banQ.push(o); if (!banOn) nextBanner(); }
  function nextBanner() {
    var o = banQ.shift(); if (!o) { banOn = false; if (banEl) { banEl.classList.remove('is-up'); setTimeout(function () { if (!banOn) banEl.hidden = true; }, calm ? 0 : 320); } return; }
    banOn = true; if (!banEl) return;
    banEl.className = 'cp-banner t' + (o.tier || 1) + (calm ? ' is-calm' : '');
    $('#cp-banner-k').textContent = o.k || ''; $('#cp-banner-t').textContent = o.t || ''; $('#cp-banner-s').textContent = o.s || '';
    var c = banArt.getContext('2d'); c.clearRect(0, 0, banArt.width, banArt.height); if (o.id) { banArt.hidden = false; c.drawImage(A.figure(o.id, 128), 0, 0, banArt.width, banArt.height); } else banArt.hidden = true;
    banEl.hidden = false; void banEl.offsetWidth; banEl.classList.add('is-up');
    clearTimeout(banTimer); banTimer = setTimeout(nextBanner, (o.secs || 3) * 1000 + (banQ.length ? 0 : 150));
  }
  var liveEl = $('#cp-live'), lastSay = 0, sayQ = [], sayT = 0;
  function say(s) {
    if (!liveEl) return; var t = now(); sayQ.push(s); if (sayQ.length > 4) sayQ.shift();
    if (sayT) return; var wait = Math.max(0, 1100 - (t - lastSay)); sayT = setTimeout(function () { sayT = 0; lastSay = now(); liveEl.textContent = sayQ.join(' '); sayQ = []; }, wait);
  }
  var toastEl = null, toastT = 0;
  function toast(msg) { evChip(msg, 3.2); }

  // ---------------------------------------------------------------- the tip jar
  var tipDue = 0, jarWasOpen = st.coins >= JAR_OPEN, cardEl = $('#cp-card'), cardOpen = false, cardHold = false, cardTimer = 0;
  function tipById(id) { for (var i = 0; i < TIPS.length; i++) if (TIPS[i].id === id) return TIPS[i]; return null; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  // every tip shows once before any shows again; after a full round, the last ten wait their turn
  function nextTip(tier) {
    if (!TIPS.length) return null;
    st.bag = st.bag.filter(function (id) { return !!tipById(id); });
    if (!st.bag.length) { var recent = st.tips.slice(-10); st.bag = shuffle(TIPS.map(function (t) { return t.id; }).filter(function (id) { return recent.indexOf(id) < 0; })); if (!st.bag.length) st.bag = shuffle(TIPS.map(function (t) { return t.id; })); }
    var want = Math.max(1, Math.min(3, Math.floor(tier || 1))), idx = -1, i;
    for (i = 0; i < st.bag.length && i < 40; i++) { var tp = tipById(st.bag[i]); if (tp && tp.tier === want) { idx = i; break; } }
    if (idx < 0) idx = 0;
    var id = st.bag.splice(idx, 1)[0]; return tipById(id);
  }
  function toolLink(tip) {
    var name = tip.label || '', href = tip.href;
    if (tip.tool && window.TOLToolById) { try { var r = window.TOLToolById(tip.tool); if (r) { name = r.name || name; href = tip.href || r.href; } } catch (e) {} }
    return { name: name || 'Read more', href: href || '/tools.html' };
  }
  function canShowTip() { return soundOrNot() && st.opt.tips && st.coins >= JAR_OPEN && !banOn && !banQ.length && !evKind && clock - lastTipAt > TIP_GAP && !paused; }
  function soundOrNot() { return true; }
  var lastTipAt = -99;
  function maybeTip() { if (tipDue && canShowTip()) { var tier = tipDue; tipDue = 0; st.jar = Math.max(0, st.jar - JAR_N); showTip(tier, true); } }
  function showTip(tier, fromJar, manual) {
    var tip = nextTip(tier); if (!tip) return; var L = toolLink(tip), first = st.tips.indexOf(tip.id) < 0;
    if (first) st.tips.push(tip.id); st.tipAt = Date.now(); lastTipAt = clock; if (manual) { st.tipsRead++; goalEvent('tipread'); } else if (fromJar) { goalEvent('tipread'); }
    var kick = manual ? 'Tip jar' : tier >= 3 ? 'Tip jar · from a big cascade' : tier >= 2 ? 'Tip jar · from a cascade' : 'Tip jar';
    card(kick + (tip.kind === 'know' ? ' · Did you know?' : ''), tip.t, '<p>' + esc(tip.b) + '</p><p class="cp-card-go"><a href="' + esc(L.href) + '">Read more: ' + esc(L.name) + ' <span aria-hidden="true">→</span></a></p>');
    sound('tip'); say('Tip: ' + tip.t + '. ' + tip.b); latest = tip; renderJar(); renderTips(); save();
  }
  var latest = null;
  function card(k, t, html) {
    if (!cardEl) return; $('#cp-card-k').textContent = k; $('#cp-card-t').textContent = t; $('#cp-card-b').innerHTML = html;
    cardEl.hidden = false; cardOpen = true; void cardEl.offsetWidth; cardEl.classList.add('is-up'); cardLater(13000);
  }
  function cardLater(ms) { clearTimeout(cardTimer); if (cardOpen && !cardHold) cardTimer = setTimeout(closeCard, ms); }
  function closeCard() { if (!cardEl) return; clearTimeout(cardTimer); cardOpen = false; cardEl.classList.remove('is-up'); setTimeout(function () { if (!cardOpen) cardEl.hidden = true; }, calm ? 0 : 300); }
  if (cardEl) {
    cardEl.addEventListener('mouseenter', function () { cardHold = true; clearTimeout(cardTimer); }); cardEl.addEventListener('mouseleave', function () { cardHold = cardEl.contains(doc.activeElement); cardLater(6000); });
    cardEl.addEventListener('focusin', function () { cardHold = true; clearTimeout(cardTimer); }); cardEl.addEventListener('focusout', function () { setTimeout(function () { cardHold = cardEl.matches(':hover') || cardEl.contains(doc.activeElement); cardLater(6000); }, 0); });
    $('#cp-card-x').addEventListener('click', function () { cardHold = false; closeCard(); try { stage.focus({ preventScroll: true }); } catch (e) {} });
  }

  // ---------------------------------------------------------------- the daily gift: one free shower of coins the first time you visit each day
  function giftReady() { return st.gift.d === today && !st.gift.got; }
  function openGift() {
    if (!giftReady()) return false; st.gift.got = 1; save(true);
    banner({ k: 'Today’s gift', t: 'A shower of 20 coins', s: 'Free, and no strings. Come back tomorrow for another.', secs: 3.2, tier: 2 });
    sound('gift'); buzz([20, 30, 20]); if (!calm) confetti(30);
    for (var k = 0; k < 20; k++) laterT(function () { if (liveCoins() < COIN_MAX - 8) drop(rnd(-HX + 0.6, HX - 0.6), { free: true }); }, 250 + k * 140);
    if (Math.random() < 0.5 && prizesOnDeck() < 3) laterT(function () { sendPrize(null); }, 1200);
    say('Today’s gift: a shower of 20 coins is dropping in.'); renderGift(); return true;
  }

  // ---------------------------------------------------------------- the page: HUD, goals, gift, jar, shelf, cabinet, tips
  function updateHud() {
    var c = $('#cp-coins'); if (c) c.textContent = st.coins;
    var m = $('#cp-meter'); if (m) m.textContent = st.meter + '/' + METER_N;
    var bar = $('#cp-mbar-i'); if (bar) { bar.style.width = (st.meter / METER_N * 100) + '%'; bar.parentNode.setAttribute('aria-valuenow', String(st.meter)); bar.parentNode.setAttribute('aria-valuetext', st.meter + ' of ' + METER_N + ' coins'); }
    var f = $('#cp-found'); if (f) f.textContent = foundCount() + '/' + A.ITEMS.length;
    var sn = $('#cp-shelf-n'); if (sn) sn.textContent = foundCount() + ' of ' + A.ITEMS.length;
    updateLanes(); renderJar();
  }
  function updateLanes() {
    var l = $('#cp-lane-l'), r = $('#cp-lane-r'), j = $('#cp-jar-s');
    if (l) l.textContent = (evKind === 'nap' ? 'napping' : st.lane.l + '/' + LANE_N); if (r) r.textContent = (evKind === 'zoom' ? 'zooming' : st.lane.r + '/' + LANE_N);
    if (j) j.textContent = st.coins >= JAR_OPEN ? (st.opt.tips ? Math.min(st.jar, JAR_N) + '/' + JAR_N : 'tips off') : st.coins + '/' + JAR_OPEN;
  }
  function toolbarSync() {
    var b;
    b = $('#cp-sound'); if (b) { var on = soundOn(); b.setAttribute('aria-pressed', String(on)); b.querySelector('b').textContent = on ? 'on' : 'off'; }
    b = $('#cp-calm'); if (b) { b.setAttribute('aria-pressed', String(calm)); b.querySelector('b').textContent = calm ? 'on' : 'off'; }
    b = $('#cp-theme'); if (b) b.querySelector('b').textContent = st.opt.thm === 'auto' ? 'Auto' : st.opt.thm === 'day' ? 'Day' : 'Night';
    b = $('#cp-amb'); if (b) { b.setAttribute('aria-pressed', String(!!st.opt.amb)); b.querySelector('b').textContent = st.opt.amb ? 'on' : 'off'; }
    b = $('#cp-music'); if (b) { b.setAttribute('aria-pressed', String(!!st.opt.mus)); b.querySelector('b').textContent = st.opt.mus ? 'on' : 'off'; }
    b = $('#cp-tipsbtn'); if (b) { b.setAttribute('aria-pressed', String(!!st.opt.tips)); b.querySelector('b').textContent = st.opt.tips ? 'on' : 'off'; }
    b = $('#cp-buzz'); if (b) { var can = !!navigator.vibrate && !quietMode(), bz = can && (st.opt.hap == null ? siteHaptic() : !!st.opt.hap); b.hidden = !navigator.vibrate; b.setAttribute('aria-pressed', String(bz)); b.disabled = !can; b.querySelector('b').textContent = bz ? 'on' : 'off'; }
    var v = $('#cp-vol'); if (v) { v.value = st.opt.vol; $('#cp-vol-o').textContent = st.opt.vol + '%'; }
    var q = $('#cp-quiet-note'); if (q) q.hidden = soundAllowed();
    var sn = $('#cp-save-note'); if (sn) sn.hidden = storeOK;
    if (SFX) SFX.config({ on: soundOn(), vol: st.opt.vol / 100, amb: !!st.opt.amb, music: !!st.opt.mus });
    main.classList.toggle('is-calm', calm);
  }
  function renderGift() {
    var box = $('#cp-giftbox'), line = $('#cp-giftline'), btn = $('#cp-gift'), sb = $('#cp-giftbtn'), rdy = giftReady();
    if (line) line.textContent = rdy ? 'A free gift is waiting: a shower of 20 coins.' : 'Today’s gift is opened. Another one is waiting tomorrow.';
    if (btn) { btn.hidden = !rdy; }
    if (sb) { sb.hidden = !rdy; }
  }
  function renderGoals() {
    var ul = $('#cp-goals'); if (!ul) return; ul.innerHTML = '';
    st.goals.list.forEach(function (g2) {
      var def = goalDef(g2.id); if (!def) return; var li = doc.createElement('li'); li.className = g2.done ? 'is-done' : '';
      li.innerHTML = '<span class="cp-goal-t">' + esc(def.t) + '</span> <span class="cp-goal-n">' + (g2.done ? 'Done' : g2.n + ' of ' + def.n) + '</span><span class="cp-goal-bar" aria-hidden="true"><i style="width:' + Math.round(g2.n / def.n * 100) + '%"></i></span>';
      ul.appendChild(li);
    });
    var stars = $('#cp-stars'); if (stars) stars.textContent = st.stars;
  }
  function jarCanvas() {
    var c = $('#cp-jar-art'); if (!c) return; var q = c.getContext('2d'), w = c.width, h = c.height; q.clearRect(0, 0, w, h);
    var open = st.coins >= JAR_OPEN, frac = open ? Math.min(1, st.jar / JAR_N) : Math.min(1, st.coins / JAR_OPEN);
    q.save(); q.translate(w / 2, 0);
    var th = A.THEMES[themeId()];
    // the coins inside
    q.save(); q.beginPath(); q.moveTo(-30, 30); q.lineTo(30, 30); q.lineTo(30, 100); q.quadraticCurveTo(30, 112, 18, 112); q.lineTo(-18, 112); q.quadraticCurveTo(-30, 112, -30, 100); q.closePath(); q.clip();
    var n = Math.round(frac * 16);
    for (var i = 0; i < n; i++) { var row = Math.floor(i / 3), col = i % 3, x = -18 + col * 18 + (row % 2) * 6 - 3, y = 104 - row * 9; var gr = q.createLinearGradient(x - 10, y, x + 10, y + 6); gr.addColorStop(0, '#FBE7A6'); gr.addColorStop(1, '#C8963A'); q.fillStyle = gr; q.beginPath(); q.ellipse(x, y, 11, 5.5, 0, 0, TAU); q.fill(); q.strokeStyle = 'rgba(120,80,20,.5)'; q.lineWidth = 1; q.stroke(); }
    q.restore();
    q.fillStyle = 'rgba(200,225,255,.22)'; q.strokeStyle = 'rgba(120,150,190,.9)'; q.lineWidth = 2.5; q.beginPath(); q.moveTo(-30, 30); q.lineTo(-30, 100); q.quadraticCurveTo(-30, 112, -18, 112); q.lineTo(18, 112); q.quadraticCurveTo(30, 112, 30, 100); q.lineTo(30, 30); q.stroke(); q.fill();
    q.fillStyle = th.trim; q.strokeStyle = 'rgba(0,0,0,.35)'; q.lineWidth = 1.5; q.beginPath(); q.roundRect ? q.roundRect(-34, 16, 68, 14, 5) : q.rect(-34, 16, 68, 14); q.fill(); q.stroke();
    q.fillStyle = 'rgba(255,255,255,.5)'; q.fillRect(-22, 38, 5, 52);
    if (!open) { q.fillStyle = 'rgba(0,0,0,.28)'; q.beginPath(); q.roundRect ? q.roundRect(-34, 16, 68, 14, 5) : q.rect(-34, 16, 68, 14); q.fill(); }
    q.restore();
  }
  function renderJar() {
    var s = $('#cp-jar-status'), s2 = $('#cp-jar-s2'), bar = $('#cp-jar-bar'), box = bar ? bar.parentNode : null, open = st.coins >= JAR_OPEN;
    if (s) s.textContent = open ? (st.opt.tips ? 'The tip jar is open. A short tip slips out every ' + JAR_N + ' coins, and sooner after a big cascade.' : 'The tip jar is open, and tips are off. Turn them on in More options.') : 'Collect ' + JAR_OPEN + ' coins to open the tip jar.';
    if (s2) s2.textContent = open ? Math.min(st.jar, JAR_N) + ' of ' + JAR_N + ' coins toward the next tip' : st.coins + ' of ' + JAR_OPEN + ' coins';
    var v = open ? Math.min(st.jar, JAR_N) : st.coins, mx = open ? JAR_N : JAR_OPEN; if (bar) { bar.style.width = Math.min(100, v / mx * 100) + '%'; box.setAttribute('aria-valuenow', String(Math.min(v, mx))); box.setAttribute('aria-valuemax', String(mx)); }
    var btn = $('#cp-tipnow'); if (btn) btn.hidden = !open;
    var lt = $('#cp-latest'); if (lt) { var tp = latest || (st.tips.length ? tipById(st.tips[st.tips.length - 1]) : null); lt.hidden = !tp; if (tp) { var L = toolLink(tp); $('#cp-latest-t').textContent = tp.t; $('#cp-latest-b').textContent = tp.b; $('#cp-latest-go').innerHTML = '<a href="' + esc(L.href) + '">Read more: ' + esc(L.name) + ' <span aria-hidden="true">→</span></a>'; } }
    jarCanvas(); updateLanes();
  }
  function renderTips() {
    var ul = $('#cp-tips'); if (!ul) return; ul.innerHTML = '';
    st.tips.slice().reverse().forEach(function (id) { var tip = tipById(id); if (!tip) return; var L = toolLink(tip), li = doc.createElement('li'); li.innerHTML = '<b>' + esc(tip.t) + '</b> ' + esc(tip.b) + ' <a href="' + esc(L.href) + '">' + esc(L.name) + '</a>'; ul.appendChild(li); });
    var none = $('#cp-tips-none'); if (none) none.hidden = st.tips.length > 0; var cn = $('#cp-tips-count'); if (cn) { cn.hidden = !st.tips.length; cn.textContent = st.tips.length + ' of ' + TIPS.length + ' tips found. Each one shows once before any repeats.'; }
  }
  var shelfBuilt = false, figQueue = [];
  function sparkleText(r) { return new Array(r + 1).join('✦'); }
  function renderShelf() {
    var wrap = $('#cp-sets'); if (!wrap) return;
    if (!shelfBuilt) {
      shelfBuilt = true; wrap.innerHTML = '';
      A.SETS.forEach(function (s) {
        var sec = doc.createElement('section'); sec.className = 'cp-set'; sec.id = 'cp-set-' + s.id; sec.setAttribute('aria-labelledby', 'cp-set-h-' + s.id);
        var rw = s.reward.type === 'theme' ? 'cabinet look “' + A.THEMES[s.reward.id].name + '”' : 'coin style “' + A.SKINS[s.reward.id].name + '”';
        sec.innerHTML = '<div class="cp-set-head"><h3 id="cp-set-h-' + s.id + '">' + esc(s.name) + '</h3><p class="cp-set-n" data-set-n="' + s.id + '"></p></div><p class="cp-set-b">' + esc(s.blurb) + ' <span class="cp-set-r" data-set-r="' + s.id + '"></span></p><ul class="cp-grid" id="cp-grid-' + s.id + '"></ul>';
        sec.querySelector('[data-set-r]').setAttribute('data-rw', rw); wrap.appendChild(sec);
        var ul = sec.querySelector('ul');
        setItems(s.id).forEach(function (it) {
          var li = doc.createElement('li'); li.id = 'cp-it-' + it.id; li.innerHTML = '<div class="cp-card2"><canvas class="cp-fig" width="128" height="128" aria-hidden="true"></canvas><span class="cp-it-n"></span><span class="cp-it-s"></span><span class="cp-it-w"></span></div>'; ul.appendChild(li); figQueue.push(it.id);
        });
      });
      pumpFigs();
    }
    A.SETS.forEach(function (s) {
      var c = setCount(s.id), n = $('[data-set-n="' + s.id + '"]'), r = $('[data-set-r="' + s.id + '"]');
      if (n) n.textContent = c[0] + ' of ' + c[1] + (c[0] === c[1] ? ' · complete' : '');
      if (r) r.textContent = (c[0] === c[1] ? 'Earned: ' : 'Finish the set to earn the ') + r.getAttribute('data-rw') + '.';
      $('#cp-set-' + s.id).classList.toggle('is-done', c[0] === c[1]);
      setItems(s.id).forEach(function (it) {
        var li = $('#cp-it-' + it.id); if (!li) return; var f = st.found[it.id], card2 = li.firstChild, nm = card2.querySelector('.cp-it-n'), sp = card2.querySelector('.cp-it-s'), wh = card2.querySelector('.cp-it-w');
        li.className = f ? 'is-found' : 'is-missing';
        nm.textContent = f ? it.name : 'Not found yet';
        sp.innerHTML = '<span aria-hidden="true">' + sparkleText(it.rar) + '</span><span class="sr-only">Sparkle level ' + it.rar + ' of 4</span>';
        if (f) { wh.innerHTML = it.home ? '<a href="' + esc(it.home) + '">Visit: ' + esc(it.where) + '</a>' : esc(it.line); if (f.n > 1) wh.innerHTML += ' <span class="cp-it-x">Found ' + f.n + ' times</span>'; }
        else wh.textContent = it.rar >= 3 ? 'A rare find' : it.rar === 2 ? 'Shows up now and then' : 'Shows up often';
        drawFig(it.id);
      });
    });
    var tn = $('#cp-trophy-note'); if (tn) { tn.hidden = !st.trophy; var d = $('#cp-trophy-date'); if (d && st.trophy) d.textContent = new Date(st.trophy).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }
  }
  function drawFig(id) {
    var li = $('#cp-it-' + id); if (!li) return; var cv = li.querySelector('canvas'), q = cv.getContext('2d'), found = !!st.found[id];
    if (cv._d === (found ? 1 : 2)) return; cv._d = found ? 1 : 2; q.clearRect(0, 0, 128, 128); q.drawImage(found ? A.figure(id, 128) : A.silhouette(id, 128), 0, 0);
    if (!found) { q.fillStyle = 'rgba(255,255,255,.75)'; q.font = '600 40px Fraunces, Georgia, serif'; q.textAlign = 'center'; q.fillText('?', 64, 70); }
  }
  function pumpFigs() { var t0 = now(); while (figQueue.length && now() - t0 < 8) { drawFig(figQueue.shift()); } if (figQueue.length) requestAnimationFrame(pumpFigs); }
  function renderCabinet() {
    var th = $('#cp-themes'), sk = $('#cp-skins'); if (!th || !sk) return; th.innerHTML = ''; sk.innerHTML = '';
    Object.keys(A.THEMES).forEach(function (id) {
      var t = A.THEMES[id], have = haveTheme(id), b = doc.createElement('button'); b.type = 'button'; b.className = 'cp-choice'; b.setAttribute('aria-pressed', String(st.cab.theme === id)); b.disabled = !have; b.setAttribute('data-theme-id', id);
      var from = A.SETS.filter(function (s) { return s.reward.type === 'theme' && s.reward.id === id; })[0];
      b.innerHTML = '<span class="cp-sw" style="background:linear-gradient(135deg,' + t.wood[0] + ' 0 38%,' + t.felt[0] + ' 38% 78%,' + t.trim + ' 78%)" aria-hidden="true"></span><span class="cp-ch-n">' + esc(t.name) + '</span><span class="cp-ch-s">' + (have ? (st.cab.theme === id ? 'In use' : 'Use this look') : 'Finish ' + esc(from.name) + ' to earn it') + '</span>';
      th.appendChild(b);
    });
    Object.keys(A.SKINS).concat(['copper']).filter(function (v, i, a) { return a.indexOf(v) === i; }).forEach(function (id) {
      var s = A.SKINS[id], have = haveSkin(id), b = doc.createElement('button'); b.type = 'button'; b.className = 'cp-choice'; b.setAttribute('aria-pressed', String(st.cab.skin === id)); b.disabled = !have; b.setAttribute('data-skin-id', id);
      var from = A.SETS.filter(function (x) { return x.reward.type === 'skin' && x.reward.id === id; })[0], how = from ? 'Finish ' + from.name + ' to earn it' : (id === 'copper' ? 'Earn 10 goal stars (' + Math.min(10, st.stars) + ' so far)' : '');
      var cv = A.coin(id, '', 16, 1); var sw = doc.createElement('canvas'); sw.width = cv.w; sw.height = cv.h; sw.className = 'cp-coinsw'; sw.setAttribute('aria-hidden', 'true'); sw.getContext('2d').drawImage(cv.c, 0, 0);
      b.appendChild(sw); b.insertAdjacentHTML('beforeend', '<span class="cp-ch-n">' + esc(s.name) + '</span><span class="cp-ch-s">' + (have ? (st.cab.skin === id ? 'In use' : 'Use this style') : how) + '</span>'); sk.appendChild(b);
    });
    var mb = $('#cp-marq'); if (mb) { mb.setAttribute('aria-pressed', String(!!st.cab.marq)); mb.querySelector('b').textContent = st.cab.marq ? 'on' : 'off'; }
    var mn = $('#cp-marq-n'); if (mn) mn.textContent = marqueeLines().length + ' lines so far. Goal stars: ' + st.stars + '.';
  }
  function showCelebrate() {
    var box = $('#cp-celebrate'); if (!box) return; box.hidden = false;
    drawTrophy($('#cp-trophy')); var w = $('#cp-cel-when'); if (w) w.textContent = st.trophy ? 'Trophy earned ' + new Date(st.trophy).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ', kept on this device.' : '';
    var h = $('#cp-cel-h'); if (h) { try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }
    setTimeout(function () { try { box.scrollIntoView({ block: 'nearest', behavior: calm ? 'auto' : 'smooth' }); } catch (e) {} }, 300); renderShelf();
  }
  function drawTrophy(cv) {
    if (!cv || !cv.getContext) return; var q = cv.getContext('2d'), S = cv.width, u = S / 160; q.clearRect(0, 0, S, S);
    var gr = q.createLinearGradient(0, 0, S, S); gr.addColorStop(0, '#FBE3A0'); gr.addColorStop(0.5, '#D4A94E'); gr.addColorStop(1, '#9C7330'); q.fillStyle = gr;
    q.beginPath(); q.moveTo(40 * u, 22 * u); q.lineTo(120 * u, 22 * u); q.quadraticCurveTo(120 * u, 92 * u, 80 * u, 98 * u); q.quadraticCurveTo(40 * u, 92 * u, 40 * u, 22 * u); q.fill();
    q.lineWidth = 8 * u; q.strokeStyle = '#C99A3E'; q.beginPath(); q.arc(36 * u, 46 * u, 16 * u, Math.PI * 0.5, Math.PI * 1.5); q.stroke(); q.beginPath(); q.arc(124 * u, 46 * u, 16 * u, -Math.PI * 0.5, Math.PI * 0.5); q.stroke();
    q.fillStyle = gr; q.fillRect(72 * u, 96 * u, 16 * u, 22 * u); q.fillRect(50 * u, 118 * u, 60 * u, 12 * u); q.fillStyle = '#7A4A2B'; q.fillRect(44 * u, 130 * u, 72 * u, 16 * u);
    q.fillStyle = '#E2556A'; A.heartPath(q, 80 * u, 52 * u, 16 * u); q.fill();
    q.fillStyle = '#FFF3CC'; q.font = '600 ' + Math.round(10 * u) + 'px "IBM Plex Mono", monospace'; q.textAlign = 'center'; q.fillText('ALL ' + A.ITEMS.length, 80 * u, 142 * u); q.fillStyle = 'rgba(255,255,255,.45)'; q.fillRect(52 * u, 28 * u, 6 * u, 40 * u);
  }

  // ---------------------------------------------------------------- input: tap, drag, hold, keys
  var rectCache = null;
  function worldXFrom(cx) { var r = canvas.getBoundingClientRect(); if (!cam || !r.width) return aimX; return cam.worldX((cx - r.left) / r.width * cw); }
  function aimTo(x, quiet) { if (x == null || isNaN(x)) return; var nx = clamp(x, -HX + R, HX - R); if (!quiet && Math.abs(nx - aimX) > 0.3 && soundOn()) { var t = now(); if (t - lastSnd > 90) { lastSnd = t; sound('step'); } } aimX = nx; aimShow = 2.6; lastActive = clock; }
  var ptr = null, holdT = 0, streamT = 0, lastDropT = 0;
  function startStream() { clearInterval(streamT); streamT = setInterval(function () { if (paused || doc.hidden) return; drop(aimX); }, 165); }
  function stopStream() { clearInterval(streamT); streamT = 0; clearTimeout(holdT); holdT = 0; }
  function dropOnce(x) { lastDropT = now(); return drop(x); }
  stage.addEventListener('pointerdown', function (e) {
    if (e.button && e.button !== 0) return; if (e.target.closest && e.target.closest('.cp-card, .cp-banner a, button, a, .cp-paused')) return;
    if (SFX) SFX.gesture();
    ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, stream: false }; aimTo(worldXFrom(e.clientX), true);
    try { stage.setPointerCapture(e.pointerId); } catch (er) {}
    clearTimeout(holdT); holdT = setTimeout(function () { if (ptr && !ptr.moved) { ptr.stream = true; dropOnce(aimX); startStream(); } }, 420);
  });
  stage.addEventListener('pointermove', function (e) {
    if (ptr && e.pointerId === ptr.id) { if (Math.abs(e.clientX - ptr.x) + Math.abs(e.clientY - ptr.y) > 12) ptr.moved = true; aimTo(worldXFrom(e.clientX), false); }
    else if (e.pointerType === 'mouse' && !(e.target.closest && e.target.closest('.cp-card'))) aimTo(worldXFrom(e.clientX), true);
  });
  function endPtr(e, cancel) {
    if (!ptr || e.pointerId !== ptr.id) return; var p = ptr; ptr = null; stopStream(); try { stage.releasePointerCapture(e.pointerId); } catch (er) {}
    if (cancel || p.stream) return; aimTo(worldXFrom(e.clientX), true); dropOnce(aimX);
  }
  stage.addEventListener('pointerup', function (e) { endPtr(e, false); }); stage.addEventListener('pointercancel', function (e) { endPtr(e, true); });
  stage.addEventListener('lostpointercapture', function (e) { if (ptr && e.pointerId === ptr.id) { ptr = null; stopStream(); } });
  // the three big buttons
  function holdButton(btn, onDown, onTick, every) {
    var t1 = 0, t2 = 0, down = false;
    function stop() { down = false; clearTimeout(t1); clearInterval(t2); }
    btn.addEventListener('pointerdown', function (e) { if (e.button && e.button !== 0) return; if (SFX) SFX.gesture(); down = true; lastDropT = now(); onDown(); clearTimeout(t1); t1 = setTimeout(function () { if (down) t2 = setInterval(onTick, every); }, 380); });
    ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(function (ev) { btn.addEventListener(ev, stop); });
    btn.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { if (SFX) SFX.gesture(); lastDropT = now(); down = true; onDown(); clearTimeout(t1); t1 = setTimeout(function () { if (down) t2 = setInterval(onTick, every); }, 380); e.preventDefault(); } else if (e.key === ' ' || e.key === 'Enter') e.preventDefault(); });
    btn.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') { stop(); e.preventDefault(); } });
    return function () { return down; };
  }
  var dropBtn = $('#cp-drop');
  holdButton(dropBtn, function () { dropOnce(aimX); }, function () { if (!paused) drop(aimX); }, 165);
  dropBtn.addEventListener('click', function (e) { if (now() - lastDropT < 600) return; if (SFX) SFX.gesture(); dropOnce(aimX); });   // a click from a screen reader or voice control
  function aimBtn(btn, dir) {
    holdButton(btn, function () { aimTo(aimX + dir * 0.55); }, function () { aimTo(aimX + dir * 0.3, true); }, 60);
    btn.addEventListener('click', function () { if (now() - lastDropT < 600) return; aimTo(aimX + dir * 0.55); });
  }
  aimBtn($('#cp-left'), -1); aimBtn($('#cp-right'), 1);
  main.addEventListener('keydown', function (e) {
    var t = e.target, inCtl = t === stage || (t.closest && t.closest('.cp-controls'));
    if (!inCtl || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowLeft') { aimTo(aimX - 0.4); e.preventDefault(); } else if (e.key === 'ArrowRight') { aimTo(aimX + 0.4); e.preventDefault(); }
    else if (e.key === 'Home') { aimTo(-HX); e.preventDefault(); } else if (e.key === 'End') { aimTo(HX); e.preventDefault(); }
    else if (t === stage && (e.key === ' ' || e.key === 'Enter') && !e.repeat) { if (SFX) SFX.gesture(); lastDropT = now(); dropOnce(aimX); clearTimeout(holdT); holdT = setTimeout(function () { startStream(); }, 420); e.preventDefault(); }
    else if (t === stage && (e.key === ' ' || e.key === 'Enter')) e.preventDefault();
    else if ((e.key === 'p' || e.key === 'P') && t === stage) { setPaused(!paused); e.preventDefault(); }
  });
  stage.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') stopStream(); });
  stage.addEventListener('blur', stopStream);
  main.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (cardOpen) { closeCard(); } var sh = $('#cp-sheet'); if (sh && !sh.hidden) { sh.hidden = true; $('#cp-more').setAttribute('aria-expanded', 'false'); $('#cp-more').focus(); } var cf = $('#cp-confirm'); if (cf && !cf.hidden) { cf.hidden = true; $('#cp-reset').focus(); } } });

  // ---------------------------------------------------------------- the options
  function say2(s) { say(s); }
  $('#cp-sound').addEventListener('click', function () {
    var on = soundOn(); if (SFX) SFX.gesture();
    if (on) st.opt.snd = 0; else { st.opt.snd = 1; st.opt.qon = soundAllowed() ? 0 : 1; }
    save(); toolbarSync(); if (soundOn()) { sound('ui'); say('Sound is on.'); } else say('Sound is off.');
  });
  $('#cp-calm').addEventListener('click', function () { st.opt.calm = calm ? 0 : 1; save(); applyCalm(); say(calm ? 'Calm effects are on: less shaking and fewer sparkles.' : 'Calm effects are off.'); });
  $('#cp-theme').addEventListener('click', function () { st.opt.thm = st.opt.thm === 'auto' ? 'day' : st.opt.thm === 'day' ? 'night' : 'auto'; save(); applyMode(); toolbarSync(); say('Look: ' + (st.opt.thm === 'auto' ? 'follows the site, now ' + mode : st.opt.thm) + '.'); });
  $('#cp-more').addEventListener('click', function () { var sh = $('#cp-sheet'); sh.hidden = !sh.hidden; this.setAttribute('aria-expanded', String(!sh.hidden)); });
  $('#cp-vol').addEventListener('input', function () { st.opt.vol = this.value | 0; $('#cp-vol-o').textContent = st.opt.vol + '%'; if (SFX) SFX.config({ vol: st.opt.vol / 100 }); save(); });
  $('#cp-vol').addEventListener('change', function () { sound('clink', 0.6); });
  $('#cp-amb').addEventListener('click', function () { st.opt.amb = st.opt.amb ? 0 : 1; save(); toolbarSync(); });
  $('#cp-music').addEventListener('click', function () { st.opt.mus = st.opt.mus ? 0 : 1; if (st.opt.mus && !soundOn()) { st.opt.snd = 1; st.opt.qon = soundAllowed() ? 0 : 1; } save(); toolbarSync(); });
  $('#cp-buzz').addEventListener('click', function () { var cur = st.opt.hap == null ? siteHaptic() : !!st.opt.hap; st.opt.hap = cur ? 0 : 1; save(); toolbarSync(); if (st.opt.hap) buzz(40); });
  $('#cp-tipsbtn').addEventListener('click', function () { st.opt.tips = st.opt.tips ? 0 : 1; save(); toolbarSync(); renderJar(); updateLanes(); say(st.opt.tips ? 'Tips are on.' : 'Tips are off.'); });
  $('#cp-describe').addEventListener('click', function () { say2(describe()); });
  function describe() {
    var coins = liveCoins(), pr = items.filter(function (a) { return a.k; }).map(function (a) { var it = A.byId(a.pid); return it ? it.name : 'a prize'; });
    return 'The shelf is ' + (vf > 0.05 ? 'sliding forward' : vf < -0.05 ? 'sliding back' : 'resting') + '. About ' + coins + ' coins are on the machine' + (pr.length ? ', and ' + (pr.length === 1 ? 'one prize: ' : pr.length + ' prizes: ') + pr.join(', ') : ', and no prizes right now') + '. You have collected ' + st.coins + ' coins and found ' + foundCount() + ' of ' + A.ITEMS.length + ' prizes. The kindness meter is at ' + st.meter + ' of ' + METER_N + '. Your aim is ' + (aimX < -1.2 ? 'toward the left' : aimX > 1.2 ? 'toward the right' : 'near the middle') + '.';
  }
  function setPaused(p) {
    paused = !!p; var b = $('#cp-pause'); if (b) { b.setAttribute('aria-pressed', String(paused)); b.textContent = paused ? 'Resume' : 'Pause'; }
    var pe = $('#cp-paused'); if (pe) pe.hidden = !paused; stopStream();
    if (SFX) { if (paused) SFX.suspend(); else SFX.resume(); }
    if (paused) say('Paused.'); else { say('Playing.'); lastTs = 0; }
  }
  var paused = false, autoPaused = false;
  $('#cp-pause').addEventListener('click', function () { setPaused(!paused); });
  $('#cp-resume').addEventListener('click', function () { setPaused(false); try { stage.focus({ preventScroll: true }); } catch (e) {} });
  var gb = $('#cp-giftbtn'); if (gb) gb.addEventListener('click', function () { openGift(); });
  $('#cp-gift').addEventListener('click', function () { openGift(); });
  $('#cp-tipnow').addEventListener('click', function () { if (!TIPS.length) return; showTip(1 + Math.floor(Math.random() * 3), false, true); });
  $('#cp-themes').addEventListener('click', function (e) { var b = e.target.closest('[data-theme-id]'); if (!b || b.disabled) return; st.cab.theme = b.getAttribute('data-theme-id'); save(); sceneKey = ''; buildScene(); renderCabinet(); jarCanvas(); say('Cabinet look: ' + A.THEMES[st.cab.theme].name + '.'); });
  $('#cp-skins').addEventListener('click', function (e) { var b = e.target.closest('[data-skin-id]'); if (!b || b.disabled) return; st.cab.skin = b.getAttribute('data-skin-id'); trayDirty = true; save(); renderCabinet(); say('Coin style: ' + A.SKINS[st.cab.skin].name + '.'); });
  $('#cp-marq').addEventListener('click', function () { st.cab.marq = st.cab.marq ? 0 : 1; save(); renderCabinet(); signMsg = ''; });
  $('#cp-break-ok').addEventListener('click', function () { $('#cp-break').hidden = true; });
  $('#cp-break-rest').addEventListener('click', function () { $('#cp-break').hidden = true; resting = true; setPaused(true); var r = $('#cp-rest'); if (r) { r.hidden = false; $('#cp-rest-back').focus(); } $('#cp-paused').hidden = true; });
  $('#cp-rest-back').addEventListener('click', function () { resting = false; $('#cp-rest').hidden = true; setPaused(false); try { stage.focus({ preventScroll: true }); } catch (e) {} });
  var resting = false;
  $('#cp-share').addEventListener('click', share);
  function share() {
    var o = { title: 'Kindness Coin Pusher', text: 'I found all 50 collectibles in the Kindness Coin Pusher on Spread Love & Acceptance: Professor Puddles, Tidbit, Sugarfoot, lucky charms, gems and more. A cozy arcade with a short, useful tip in the jar. Free, nothing to buy.', url: location.origin + '/coin-pusher.html' };
    if (window.TOLShareKit && window.TOLShareKit.shareText) { window.TOLShareKit.shareText(o); return; }
    var s = doc.createElement('script'); s.src = '/assets/js/share-kit.js';
    s.onload = function () { if (window.TOLShareKit && window.TOLShareKit.shareText) window.TOLShareKit.shareText(o); else if (window.TOLShare) window.TOLShare.share({ title: o.title, text: o.text, url: o.url }); };
    s.onerror = function () { if (navigator.share) navigator.share({ title: o.title, text: o.text, url: o.url }).catch(function () {}); };
    doc.head.appendChild(s);
  }
  function replay() { $('#cp-celebrate').hidden = true; try { stage.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' }); } catch (e) {} setTimeout(finale, calm ? 0 : 450); }
  $('#cp-replay').addEventListener('click', replay); $('#cp-replay2').addEventListener('click', replay);
  $('#cp-cel-close').addEventListener('click', function () { $('#cp-celebrate').hidden = true; stage.focus(); });
  $('#cp-reset').addEventListener('click', function () { var c = $('#cp-confirm'); c.hidden = false; $('#cp-confirm-no').focus(); });
  $('#cp-confirm-no').addEventListener('click', function () { $('#cp-confirm').hidden = true; $('#cp-reset').focus(); });
  $('#cp-confirm-yes').addEventListener('click', function () { noSave = true; clearTimeout(saveT); lsDel(KEY); lsDel(OLD_KEY); location.hash = ''; location.reload(); });

  // ---------------------------------------------------------------- calm and look changes, from here or from the site
  function applyCalm() {
    var c = calmOn(); if (c === calm && true) { toolbarSync(); return; } calm = c; if (calm) { parts.forEach(function (p) { partFree.push(p); }); parts = []; fxShake = 0; zoomAmt = 1; }
    toolbarSync(); signMsg = ''; if (evKind) { tsTarget = evKind === 'nap' ? (calm ? 0.8 : 0.5) : 1; speedMul = evKind === 'zoom' ? (calm ? 1.3 : 1.9) : 1; }
  }
  function applyMode() { var m = modeNow(); mode = m; main.setAttribute('data-mode', m); sceneKey = ''; buildScene(); jarCanvas(); trayDirty = true; toolbarSync(); }
  doc.addEventListener('tol-still', function () { applyCalm(); }); window.addEventListener('tol-quiet', function () { if (!soundAllowed() && !st.opt.qon) { /* silent until the player turns it on here */ } if (st.opt.calm == null) applyCalm(); toolbarSync(); });
  try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (st.opt.thm === 'auto') applyMode(); }); window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', function () { if (st.opt.calm == null) applyCalm(); }); } catch (e) {}
  try { new MutationObserver(function () { if (st.opt.thm === 'auto') { var m = modeNow(); if (m !== mode) applyMode(); } }).observe(root, { attributes: true, attributeFilter: ['data-theme', 'class'] }); } catch (e) {}

  // ---------------------------------------------------------------- the loop: fixed steps, paused when the page is hidden or out of focus
  var raf = 0, last = 0, acc = 0, lastTs = 0, frames = [], simMs = 0, drawMs = 0, playMs = 0, breakShown = 0, bonusAcc = 0, frameN = 0;
  function frame(t) {
    raf = requestAnimationFrame(frame);
    var rdt = last ? Math.min(0.1, (t - last) / 1000) : 1 / 60; last = t; frameN++;
    if (frames.length < 720) frames.push(rdt * 1000); else { frames[frameN % 720] = rdt * 1000; }
    if (paused || autoPaused) { return; }
    clock += rdt;
    ts += (tsTarget - ts) * Math.min(1, rdt * 3); acc += rdt * ts; var c0 = now(), n = 0; silent = false;
    while (acc >= DT && n < MAXSTEPS) { step(); acc -= DT; n++; } if (n === MAXSTEPS) acc = 0;
    simMs = simMs * 0.95 + (now() - c0) * 0.05; flushImpacts();
    frameLogic(rdt);
    var c1 = now(); drawFrame(rdt); drawMs = drawMs * 0.95 + (now() - c1) * 0.05;
  }
  function frameLogic(dt) {
    if (chain.n && clock - chain.last > 0.9) endChain();
    if (comboT && clock > comboT) { comboT = 0; if (comboEl) comboEl.hidden = true; }
    if (aimShow > 0) aimShow -= dt;
    updateParts(dt); marqueeStep(dt);
    if (evKind && clock > evUntil) { var k = evKind; endEvent(); if (k === 'nap') { laterT(function () { sendPrize(null); }, 400); } updateLanes(); }
    evTint += (evTintTarget - evTint) * Math.min(1, dt * 2);
    if (dash > 0) { dash += dt / 3.2; if (dash >= 1) dash = 0; }
    // the slow zoom on a jackpot: in over about a second, out over about two
    var zt = clock - zoomHold; zoomAmt = calm ? 1 : (zt < 0 || zt > 3.4 ? 1 : 1 + 0.06 * (zt < 1.1 ? easeOut(zt / 1.1) : 1 - easeInOut((zt - 1.1) / 2.3)));
    // the hum follows the shelf
    if (SFX && frameN % 8 === 0) SFX.hum(Math.min(1, Math.abs(vf) / 0.8));
    if (frameN % 30 === 0) { maybeTip(); if (lastActive && clock - lastActive < 60) playMs += 0.5; if (playMs - breakShown >= 600) { breakShown = playMs; var bk = $('#cp-break'); if (bk && !resting) bk.hidden = false; } }
    if (frameN % 120 === 0 && st.coins >= JAR_OPEN) updateLanes();
  }
  function easeOut(x) { return 1 - Math.pow(1 - x, 3); } function easeInOut(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function startLoop() { if (!raf && !doc.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
  function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function pageHide() { stopLoop(); stopStream(); flush(); if (SFX) SFX.suspend(); }
  function pageShow() { if (!paused) { if (SFX) SFX.resume(); } startLoop(); }
  doc.addEventListener('visibilitychange', function () { if (doc.hidden) pageHide(); else pageShow(); });
  window.addEventListener('pagehide', function () { pageHide(); });
  window.addEventListener('blur', function () { if (!doc.hidden && !paused) { autoPaused = true; stopStream(); var pe = $('#cp-paused'); if (pe) pe.hidden = false; if (SFX) SFX.suspend(); } });
  window.addEventListener('focus', function () { if (autoPaused) { autoPaused = false; var pe = $('#cp-paused'); if (pe && !paused) pe.hidden = true; if (!paused && SFX) SFX.resume(); last = 0; } });
  var rT = 0; function onResize() { clearTimeout(rT); rT = setTimeout(function () { buildScene(); }, 90); }
  window.addEventListener('resize', onResize); window.addEventListener('orientationchange', onResize);
  try { if (window.ResizeObserver) new ResizeObserver(onResize).observe(stage); } catch (e) {}
  doc.addEventListener('tol-fullscreen', function () { onResize(); setTimeout(onResize, 300); });

  // ---------------------------------------------------------------- starting up
  function prefill() {
    silent = true; var gap = 2 * R + 0.03, row = 0, x, z;
    for (z = ZE - 0.45; z > PF_MAX + R + 0.2; z -= gap * 0.86) { var off = (row++ % 2) ? gap / 2 : 0; for (x = -HX + R + off; x <= HX - R; x += gap) if (Math.random() < 0.95) { var c = spawn(x + rnd(-0.03, 0.03), z + rnd(-0.04, 0.02), 0, 'coin'); if (c) { c.rk = (Math.random() * 4) | 0; } } }
    // a few resting on top of others, so the pile looks like a pile
    var base = items.slice(); for (var k = 0; k < 16; k++) { var u = base[(Math.random() * base.length) | 0]; if (u && u.z < ZE - 1.2) { var top = spawn(u.x + rnd(-0.12, 0.12), u.z + rnd(-0.12, 0.12), u.y + T, 'coin'); if (top) top.rk = (Math.random() * 4) | 0; } }
    st.pend.forEach(function (id, i) { var a = spawnPrize(id, -2.4 + i * 2.4 + rnd(-0.3, 0.3), ZE - 2.4 + rnd(-0.3, 0.3), 0); if (a) a.st = 0; });
    pushT = PERIOD * 0.5; pf = pusherAt(pushT); pfPrev = pf;
    var oldCalm = calm; calm = false; for (var s = 0; s < 1250; s++) step(); calm = oldCalm; pushT = 0; pf = pusherAt(0); pfPrev = pf; pushIdle = 0;
    for (var i = items.length - 1; i >= 0; i--) { var q = items[i]; if (q.st === 2 || (!q.k && q.z > ZE - 0.6)) { freeList.push(q); items[i] = items[items.length - 1]; items.pop(); } else { q.vx = q.vz = 0; q.wr = 0; q.tilt = 0; if (q.st === 1) { q.st = 0; q.vy = 0; } } }
    silent = false;
  }
  function init() {
    main.setAttribute('data-mode', mode); buildScene(); prefill(); renderShelf(); renderCabinet(); renderGoals(); renderGift(); renderTips(); updateHud(); toolbarSync(); if (st.tips.length) latest = tipById(st.tips[st.tips.length - 1]); renderJar();
    if (!storeOK) { var sn = $('#cp-save-note'); if (sn) sn.hidden = false; }
    // the row of games starts at the beginning, so every game shows on a phone
    var row = doc.querySelector('.gm-switch'); if (row) { var touched = false; ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(function (ev) { row.addEventListener(ev, function () { touched = true; }, { passive: true }); }); var s0 = function () { if (!touched && row.scrollWidth > row.clientWidth + 1) row.scrollLeft = 0; }; s0(); if (doc.readyState === 'complete') { setTimeout(s0, 0); setTimeout(s0, 900); } else window.addEventListener('load', function () { setTimeout(s0, 0); setTimeout(s0, 900); }); }
    main.classList.add('is-ready'); flush(); startLoop();
    if (!st.drops && !DEBUG_ALL) setTimeout(function () { if (!st.drops) evChip('Tap, or drag and let go, to drop a coin', 4); }, 900);
    if (DEBUG_ALL) setTimeout(function () { st.trophy = Date.now(); finale(); }, 900);
  }
  // make sure the stage has a size before the first scene (fonts and the fullscreen wrap can move things)
  if (stage.clientWidth > 40) init(); else { var tries = 0, iv = setInterval(function () { if (stage.clientWidth > 40 || ++tries > 40) { clearInterval(iv); init(); } }, 50); }

  // ---------------------------------------------------------------- hooks for checks
  window.TOLCoinPusher = {
    stats: function () {
      var f = frames.slice().sort(function (a, b) { return a - b; }), sum = 0; frames.forEach(function (v) { sum += v; });
      return { calm: calm, mode: mode, coins: st.coins, drops: st.drops, items: items.length, live: liveCoins(), prizes: prizesOnDeck(), parts: parts.length, free: freeList.length, found: foundCount(), tips: st.tips.length, meter: st.meter, jar: st.jar,
        frames: frames.length, avgMs: frames.length ? sum / frames.length : 0, p95Ms: f.length ? f[Math.floor(f.length * 0.95)] : 0, simMs: simMs, drawMs: drawMs, evKind: evKind, paused: paused, storeOK: storeOK, dpr: dpr, size: [cw, ch] };
    },
    resetFrames: function () { frames = []; frameN = 0; },
    drop: function (x, o) { return drop(x, o); },
    state: function () { return JSON.parse(JSON.stringify(st)); },
    run: function (secs) { silent = false; for (var i = 0; i < Math.round(secs / DT); i++) { step(); clock += DT; if (i % 4 === 0) { flushImpacts(); if (chain.n && clock - chain.last > 0.9) endChain(); } } return items.length; },
    // drop n coins as fast as the physics allows (no drawing): for the soak check
    soak: function (n, perSec) { var per = perSec || 4, k = 0, errs = 0; for (var i = 0; i < n; i++) { try { if (i % 40 === 0 && prizesOnDeck() < 3 && Math.random() < 0.5) sendPrize(null); drop(rnd(-HX + R, HX - R)); for (var s = 0; s < Math.round(1 / DT / per); s++) { step(); clock += DT; } flushImpacts(); if (chain.n && clock - chain.last > 0.9) endChain(); } catch (e) { errs++; } } return { errors: errs, items: items.length, free: freeList.length, coins: st.coins, parts: parts.length }; },
    give: function (id) { var it = A.byId(id); if (!it) return false; var a = spawnPrize(id, 0, ZE - 0.2, 0); if (a) { a.st = 0; st.pend.push(id); a.z = ZE + 0.05; } return !!a; },
    giveAll: function () { A.ITEMS.forEach(function (it) { if (!st.found[it.id]) st.found[it.id] = { n: 1, t: Date.now() }; }); renderShelf(); updateHud(); },
    prize: function (id) { return sendPrize(0, id); },
    openGift: openGift, startNap: startNap, startZoomies: startZoomies, jackpot: function () { jackpot(12); },
    showTip: function (t) { showTip(t || 1, false, true); }, tips: function () { return TIPS.length; },
    cabinet: function (id) { st.cab.theme = id; sceneKey = ''; buildScene(); }, skin: function (id) { st.cab.skin = id; trayDirty = true; },
    setCalm: function (v) { st.opt.calm = v ? 1 : 0; applyCalm(); }, setMode: function (v) { st.opt.thm = v; applyMode(); },
    pause: setPaused, flush: function () { flush(); }, aim: function (x) { aimTo(x); return aimX; },
    debug: function () { return { pf: pf, vf: vf, items: items.map(function (a) { return [a.x, a.z, a.y, a.st, a.k, a.r, a.h, a.ty]; }) }; },
    describe: describe, count: function () { return { items: items.length, free: freeList.length, parts: parts.length, pfree: partFree.length, timers: laterList.length }; }
  };
})();
