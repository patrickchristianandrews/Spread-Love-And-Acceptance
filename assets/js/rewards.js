/* rewards.js — levels, gentle streaks and a background that keeps growing, shared by every
   calm game. Each level you finish counts, and every few levels (a random two to five)
   something new appears in the living garden behind every page: a swing, koi, wind chimes,
   a bridge, a blossom tree... and each one plays along with the animals there.
   The streak is gentle: one missed day a week is a rest day and never breaks it.
   Everything is kept in this browser only. Nothing is sent anywhere. */
(function () {
  'use strict';
  if (window.TOLRewards) return; // already loaded on this page
  var KEY = 'tol-rewards-v1';

  // What appears in the background, in order. Every few levels (a random two to five) the
  // next one arrives, and each one plays along with the animals and everything else there.
  var WONDERS = [
    ['garden-swing', 'A tree and a swing', '🌳', 'An old tree by the pond with a wooden swing. The dogs take turns on it.'],
    ['garden-koi', 'Koi in the pond', '🐟', 'Two glowing koi swim slow circles, and leap when anyone splashes.'],
    ['garden-chimes', 'Wind chimes', '🎐', 'Chimes hang from the tree and sparkle whenever someone runs past.'],
    ['garden-boats', 'Paper boats', '⛵', 'Candle-lit paper boats drift across the pond. The frog hops aboard now and then.'],
    ['garden-bridge', 'A little bridge', '🌉', 'A wooden footbridge over the pond, the best spot for a hug.'],
    ['garden-blossom', 'A blossom tree', '🌸', 'A cherry tree on the far bank. Its petals drift across every page and land on whoever is near.'],
    ['garden-aurora', 'Aurora', '🌌', 'Ribbons of light across the sky. Everyone stops to look up.'],
    ['garden-lights', 'Fairy lights', '✨', 'Warm little lights between the trees that glow brighter as the animals pass beneath.'],
    ['garden-balloon', 'A hot-air balloon', '🎈', 'A striped balloon drifts across the sky, and the plane waves hello.'],
    ['garden-hammock', 'A hammock', '🛏️', 'A hammock between the trees, for naps after all that playing.'],
    ['garden-rainbow', 'Rainbow lanterns', '🏮', 'The Night Garden’s lanterns rise in every pastel colour.'],
    ['garden-owls', 'Sleepy owls', '🦉', 'Two owls in the branches whose eyes follow the fun.'],
    ['garden-butterflies', 'Glowing butterflies', '🦋', 'Soft glowing butterflies that the dogs chase and the bunny follows.'],
    ['garden-meteors', 'A meteor shower', '🌠', 'Now and then a shower of shooting stars, and everyone makes a wish.'],
    ['garden-gazebo', 'A lantern gazebo', '🏯', 'A little glowing gazebo on the hill, where the dogs go to dance.']
  ];
  var LADDER = WONDERS.map(function (w) { return { id: w[0], kind: 'garden', name: w[1], icon: w[2], desc: w[3] }; });
  // after all that, more fireflies every few levels, for as long as you like to play
  for (var mi = 0; mi < 40; mi++) LADDER.push({ id: 'garden-flies-' + mi, kind: 'garden', name: 'More fireflies', icon: '✨', desc: 'Five more fireflies light up the background.' });
  var ALL = LADDER;
  var TILE_THEMES = [{ id: 'tiles-petal', name: 'Petal', icon: '🌸' }];

  function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function daysBetween(a, b) { var pa = a.split('-'), pb = b.split('-'); return Math.round((Date.UTC(+pb[0], pb[1] - 1, +pb[2]) - Date.UTC(+pa[0], pa[1] - 1, +pa[2])) / 864e5); }

  var S = { lv: 0, nextAt: 0, lastAt: 0, days: [], streak: 0, best: 0, rest: '', last: '', unlocked: [], tiles: 'tiles-petal', garden: {}, from: {}, games: {}, today: { day: '', did: {}, bouquet: false } };
  try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); for (var k in o) S[k] = o[k]; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  delete S.petals; delete S.today;
  S.unlocked = S.unlocked.filter(function (id) { return id.indexOf('st-') !== 0 && id.indexOf('tiles-') !== 0; }); // stickers and tiles retired
  S.tiles = 'tiles-petal';
  function gap() { return 2 + Math.floor(Math.random() * 4); } // a surprise every two to five levels
  if (!S.nextAt) { S.lv = S.lv || S.unlocked.length * 3; S.lastAt = S.lv; S.nextAt = S.lv + gap(); }
  function nextUnlock() { for (var i = 0; i < ALL.length; i++) if (S.unlocked.indexOf(ALL[i].id) === -1) return ALL[i]; return null; }
  function level() { return S.lv + 1; }

  // A new day: keep the streak (a missed day is forgiven once a week), and give a daily blossom.
  function touchDay() {
    var today = dayKey();
    if (S.last === today) return 0;
    var bonus = 5;
    if (!S.last) S.streak = 1;
    else {
      var gap = daysBetween(S.last, today);
      if (gap === 1) S.streak++;
      else if (gap === 2 && (!S.rest || daysBetween(S.rest, today) >= 7)) { S.streak++; S.rest = today; }
      else S.streak = 1;
    }
    S.best = Math.max(S.best, S.streak);
    S.last = today;
    S.days.push(today); if (S.days.length > 60) S.days = S.days.slice(-60);
    bonus += Math.min(S.streak, 7) - 1;
    return bonus;
  }

  // earn(n, source, why): a level done. Every few levels something new appears in the
  // background. Shows it softly; returns what happened.
  function earn(n, source, why, opts) {
    opts = opts || {};
    touchDay();
    if (source) S.from[source] = (S.from[source] || 0) + 1;
    S.lv++;
    var fresh = [];
    if (S.lv >= S.nextAt) {
      var u = nextUnlock();
      if (u) { S.unlocked.push(u.id); S.garden[u.id] = true; fresh.push(u); }
      S.lastAt = S.lv; S.nextAt = S.lv + gap();
    }
    save();
    var res = { level: level(), streak: S.streak, unlocked: fresh, next: nextUnlock() };
    if (!opts.quiet && !fresh.length) toast(res, why);
    if (fresh.length && !opts.noCard) setTimeout(function () { unlockCard(fresh[0]); }, opts.cardDelay || 1400);
    renderChips();
    return res;
  }

  // Remember a game's personal bests and counts (for the keepsakes page).
  function record(game, key, value, mode) {
    var g = S.games[game] = S.games[game] || {};
    if (mode === 'max') { var was = g[key] || 0; if (value > was) { g[key] = value; save(); return true; } return false; }
    g[key] = (g[key] || 0) + (value == null ? 1 : value); save(); return g[key];
  }
  function stat(game, key) { return (S.games[game] || {})[key] || 0; }

  /* ---------------------------------------------------------------- the soft UI */
  var css = false;
  function style() {
    if (css) return; css = true;
    var s = document.createElement('style');
    s.textContent =
      '.tr-toast{position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom,0px));transform:translate(-50%,30px);opacity:0;z-index:90;pointer-events:none;' +
      'display:flex;align-items:center;gap:.55rem;padding:.55rem 1rem .55rem .7rem;border-radius:999px;background:rgba(255,252,246,.96);color:#3C3350;' +
      'box-shadow:0 10px 30px rgba(60,40,90,.22);font:600 .95rem/1.2 Lora,Georgia,serif;transition:transform .5s cubic-bezier(.2,.8,.2,1),opacity .5s;max-width:calc(100vw - 24px)}' +
      '.tr-toast.is-in{transform:translate(-50%,0);opacity:1}' +
      '.tr-toast b{display:inline-grid;place-items:center;min-width:2.1rem;height:2.1rem;padding:0 .4rem;border-radius:999px;background:linear-gradient(135deg,#F9D3DE,#F4C2D8);color:#7A3355;font:700 .95rem/1 "IBM Plex Mono",monospace}' +
      '.tr-toast small{display:block;font:400 .78rem/1.3 Lora,Georgia,serif;color:#6A6152}' +
      '.tr-toast .tr-bar{display:block;width:120px;height:5px;border-radius:5px;background:#EFE6F4;margin-top:4px;overflow:hidden}.tr-toast .tr-bar i{display:block;height:100%;background:linear-gradient(90deg,#F4A6B8,#C9A7E8);border-radius:5px;transition:width .8s}' +
      '.tr-card{position:fixed;inset:0;z-index:95;display:grid;place-items:center;padding:16px;background:rgba(46,38,60,.35);opacity:0;transition:opacity .35s}' +
      '.tr-card.is-in{opacity:1}.tr-card-box{position:relative;max-width:22rem;width:100%;text-align:center;padding:1.6rem 1.3rem 1.2rem;border-radius:26px;background:linear-gradient(160deg,#FFF8EE,#F6EEF8 60%,#EEF4FA);box-shadow:0 20px 60px rgba(40,30,70,.35);transform:scale(.85);transition:transform .5s cubic-bezier(.2,1.4,.4,1)}' +
      '.tr-card.is-in .tr-card-box{transform:scale(1)}.tr-card-k{margin:0;font:500 .72rem/1 "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:#8A6D8F}' +
      '.tr-card-art{display:grid;place-items:center;width:6.5rem;height:6.5rem;margin:.8rem auto;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#F9E1EA 60%,#EBDDF6);font-size:3.2rem;animation:tr-bob 4s ease-in-out infinite}' +
      '.tr-card-art img{width:70%;height:70%}.tr-card h2{margin:.2rem 0 .3rem;font:600 1.45rem/1.2 Fraunces,Georgia,serif;color:#2B2440}.tr-card-hint{font-size:.9rem !important;color:#8A6D8F !important}.tr-card p{margin:0 0 1rem;color:#5A5346;font:1rem/1.45 Lora,Georgia,serif}' +
      '.tr-card-row{display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap}.tr-card-row a,.tr-card-row button{font:600 .95rem Lora,Georgia,serif;min-height:44px;padding:.55rem 1.1rem;border-radius:999px;border:1px solid #D9C8F0;background:#fff;color:#4E3F6B;text-decoration:none;cursor:pointer}' +
      '.tr-card-row .tr-go{background:#3C3350;color:#FFF8EE;border-color:#3C3350}' +
      '.tr-confetti{position:absolute;left:50%;top:40%;width:0;height:0;pointer-events:none}.tr-confetti span{position:absolute;font-size:18px;animation:tr-fly 1.6s cubic-bezier(.2,.8,.2,1) both}' +
      '@keyframes tr-fly{0%{transform:translate(0,0) scale(.3);opacity:0}15%{opacity:1}100%{transform:translate(var(--dx),var(--dy)) rotate(var(--r)) scale(1);opacity:0}}' +
      '@keyframes tr-bob{50%{transform:translateY(-6px)}}' +
      '.tr-chip{display:inline-flex;align-items:center;gap:.45rem;min-height:36px;padding:.3rem .8rem;border-radius:999px;background:rgba(255,255,255,.85);border:1px solid #EBD3E4;color:#4E3F6B;text-decoration:none;font:600 .88rem/1 Lora,Georgia,serif;white-space:nowrap}' +
      '.tr-chip:hover{background:#fff}.tr-chip .tr-s{color:#B5651D}' +
      '@media (prefers-reduced-motion:reduce){.tr-toast,.tr-card,.tr-card-box{transition:none}.tr-card-art,.tr-confetti span{animation:none}}';
    document.head.appendChild(s);
  }
  var toastEl = null, toastTimer = null;
  function toast(res, why) {
    if (typeof document === 'undefined') return;
    style();
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'tr-toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    var pct = Math.round((S.lv - S.lastAt) / Math.max(1, S.nextAt - S.lastAt) * 100);
    toastEl.innerHTML = '<b>' + res.level + '</b><span>✨ ' + esc(why || 'Level done') +
      '<small>' + (res.next ? 'Something new is on its way to the background' : 'Everything has arrived. Thank you for playing.') + '</small><span class="tr-bar"><i style="width:' + Math.max(6, pct) + '%"></i></span></span>';
    requestAnimationFrame(function () { toastEl.classList.add('is-in'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-in'); }, 3200);
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function artFor(u) { return u.img ? '<img src="' + u.img + '" alt="">' : '<span aria-hidden="true">' + (u.icon || '🌸') + '</span>'; }
  var cardOpen = false;
  function unlockCard(u) {
    if (cardOpen || typeof document === 'undefined') return;
    style(); cardOpen = true;
    var what = 'Level ' + level() + ' · something new in the background';
    var action = '';
    var c = document.createElement('div');
    c.className = 'tr-card'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-modal', 'true'); c.setAttribute('aria-label', 'You unlocked ' + u.name);
    c.innerHTML = '<div class="tr-card-box"><div class="tr-confetti" aria-hidden="true"></div><p class="tr-card-k">✨ ' + what + ' ✨</p><div class="tr-card-art">' + artFor(u) + '</div>' +
      '<h2>' + esc(u.name) + '</h2><p>' + esc(u.desc) + '</p><p class="tr-card-hint">Look behind the page to find it.</p><div class="tr-card-row">' + action + '<button type="button" class="tr-go" data-close>Keep playing</button></div></div>';
    document.body.appendChild(c);
    var conf = c.querySelector('.tr-confetti'), bits = ['🌸', '✨', '💗', '🫧', '🌟'];
    for (var i = 0; i < 18; i++) {
      var sp = document.createElement('span'), a = i / 18 * Math.PI * 2, d = 90 + (i % 3) * 40;
      sp.textContent = bits[i % bits.length];
      sp.style.setProperty('--dx', Math.round(Math.cos(a) * d) + 'px'); sp.style.setProperty('--dy', Math.round(Math.sin(a) * d) + 'px'); sp.style.setProperty('--r', (i * 37 % 180 - 90) + 'deg');
      sp.style.animationDelay = (i % 5) * 60 + 'ms'; conf.appendChild(sp);
    }
    requestAnimationFrame(function () { c.classList.add('is-in'); });
    function close() { c.classList.remove('is-in'); cardOpen = false; setTimeout(function () { c.remove(); }, 350); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    c.addEventListener('click', function (e) {
      if (e.target === c || e.target.closest('[data-close]')) close();
      var use = e.target.closest('[data-use]');
      if (use) { setTiles(use.getAttribute('data-use')); close(); }
    });
    var go = c.querySelector('.tr-go'); if (go) go.focus();
  }

  // Tile colours for the word games
  function setTiles(id) {
    if (id !== 'tiles-petal' && S.unlocked.indexOf(id) === -1) return false;
    S.tiles = id; save();
    if (typeof document !== 'undefined') document.documentElement.setAttribute('data-tiles', id);
    return true;
  }

  // Little chips that show your level and streak
  function renderChips() {
    if (typeof document === 'undefined') return;
    Array.prototype.forEach.call(document.querySelectorAll('[data-rewards-chip]'), function (el) {
      style();
      el.innerHTML = '<span class="tr-chip" role="img" aria-label="Level ' + level() + (S.streak > 1 ? ', ' + S.streak + '-day streak' : '') + '">✨ ' + level() +
        (S.streak > 1 ? ' <span class="tr-s">🔥 ' + S.streak + '</span>' : '') + '</span>';
    });
  }

  // another page (or the page around the background) finished a level: pick up what's new at once
  if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('storage', function (e) {
    if (e.key !== KEY || !e.newValue) return;
    try { var o = JSON.parse(e.newValue); for (var k in o) S[k] = o[k]; renderChips(); } catch (err) {}
  });
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-tiles', S.tiles || 'tiles-petal');
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderChips); else renderChips();
  }

  window.TOLRewards = {
    earn: earn, record: record, stat: stat, setTiles: setTiles, renderChips: renderChips, unlockCard: unlockCard,
    has: function (id) { return id === 'tiles-petal' || S.unlocked.indexOf(id) !== -1; },
    garden: function (id) { return S.unlocked.indexOf(id) !== -1; },
    extraFlies: function () { return S.unlocked.filter(function (id) { return id.indexOf('garden-flies-') === 0; }).length * 5; },
    setGarden: function (id, on) { S.garden[id] = !!on; save(); },
    state: function () { return { streak: S.streak, best: S.best, days: S.days.slice(), level: level(), next: nextUnlock(), toNext: Math.max(0, S.nextAt - S.lv), progress: (S.lv - S.lastAt) / Math.max(1, S.nextAt - S.lastAt), unlocked: S.unlocked.slice(), from: S.from, games: S.games }; },
    ladder: ALL, tileThemes: TILE_THEMES, dayKey: dayKey
  };
})();
