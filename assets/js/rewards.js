/* rewards.js — petals, gentle streaks and a garden that grows, shared by every calm game.
   Playing well earns petals (a word found without a hint, a row bloomed, a puzzle
   finished). Petals never get spent or lost; they add up, and at each milestone your garden
   grows: something new and calm appears in the living garden behind every page (a tree and
   swing, wind chimes, a bridge, a blossom tree...), and now and then new tile colours.
   The streak is gentle: one missed day a week is a rest day and never breaks it.
   Everything is kept in this browser only. Nothing is sent anywhere. */
(function () {
  'use strict';
  if (window.TOLRewards) return; // already loaded on this page
  var KEY = 'tol-rewards-v1';

  // What grows, and when.
  var LADDER = [
    { id: 'tiles-rose', at: 25, kind: 'tiles', name: 'Rose tiles', icon: '\uD83C\uDF39', desc: 'Warm rosy tiles for the word games.' },
    { id: 'garden-swing', at: 60, kind: 'garden', name: 'A tree and a swing', icon: '\uD83C\uDF33', desc: 'An old tree grows by the pond, with a wooden swing that sways in the breeze.' },
    { id: 'garden-koi', at: 120, kind: 'garden', name: 'Koi in the pond', icon: '\uD83D\uDC1F', desc: 'Two glowing koi swim slow circles in the pond.' },
    { id: 'tiles-moon', at: 200, kind: 'tiles', name: 'Moonlight tiles', icon: '\uD83C\uDF19', desc: 'Deep blue night tiles with soft silver letters.' },
    { id: 'garden-chimes', at: 300, kind: 'garden', name: 'Wind chimes', icon: '\uD83C\uDF90', desc: 'Chimes hang from the tree, glinting, and ring softly in the Night Garden.' },
    { id: 'garden-boats', at: 420, kind: 'garden', name: 'Paper boats', icon: '\u26F5', desc: 'Little paper boats with candles drift across the pond.' },
    { id: 'garden-bridge', at: 560, kind: 'garden', name: 'A little bridge', icon: '\uD83C\uDF09', desc: 'A wooden footbridge arches over the pond.' },
    { id: 'tiles-meadow', at: 700, kind: 'tiles', name: 'Meadow tiles', icon: '\uD83C\uDF3F', desc: 'Fresh green tiles, like a summer morning.' },
    { id: 'garden-blossom', at: 850, kind: 'garden', name: 'A blossom tree', icon: '\uD83C\uDF38', desc: 'A cherry tree blooms on the far bank, and its petals drift across every page.' },
    { id: 'garden-aurora', at: 1000, kind: 'garden', name: 'Aurora', icon: '\uD83C\uDF0C', desc: 'Soft ribbons of light ripple across the sky.' },
    { id: 'garden-lights', at: 1200, kind: 'garden', name: 'Fairy lights', icon: '\u2728', desc: 'Strings of warm little lights between the trees, twinkling.' },
    { id: 'tiles-sunrise', at: 1400, kind: 'tiles', name: 'Sunrise tiles', icon: '\uD83C\uDF05', desc: 'Peach and gold, like the first light.' },
    { id: 'garden-balloon', at: 1650, kind: 'garden', name: 'A hot-air balloon', icon: '\uD83C\uDF88', desc: 'A striped balloon drifts slowly across the sky.' },
    { id: 'garden-hammock', at: 1950, kind: 'garden', name: 'A hammock', icon: '\uD83D\uDECF\uFE0F', desc: 'A hammock between the trees, for the laziest afternoons.' },
    { id: 'garden-rainbow', at: 2300, kind: 'garden', name: 'Rainbow lanterns', icon: '\uD83C\uDFEE', desc: 'Your lanterns rise in every pastel colour.' },
    { id: 'tiles-gold', at: 2700, kind: 'tiles', name: 'Golden tiles', icon: '\u2728', desc: 'Glowing gold, for a true regular.' },
    { id: 'garden-owls', at: 3100, kind: 'garden', name: 'Sleepy owls', icon: '\uD83E\uDD89', desc: 'Two owls blink from the branches.' },
    { id: 'garden-butterflies', at: 3600, kind: 'garden', name: 'Glowing butterflies', icon: '\uD83E\uDD8B', desc: 'Soft glowing butterflies float among the flowers.' },
    { id: 'garden-meteors', at: 4200, kind: 'garden', name: 'A meteor shower', icon: '\uD83C\uDF20', desc: 'Now and then, a gentle shower of shooting stars.' },
    { id: 'garden-gazebo', at: 4900, kind: 'garden', name: 'A lantern gazebo', icon: '\uD83C\uDFEF', desc: 'A little gazebo glows on the hill, the calmest spot in the garden.' }
  ];
  // after all that, every 700 petals brings more fireflies to the garden, forever
  var MORE = [];
  for (var mi = 0; mi < 30; mi++) MORE.push(['\u2728', 'More fireflies']);
  function ladder() {
    var out = LADDER.slice(), last = LADDER[LADDER.length - 1].at;
    MORE.forEach(function (m, i) { out.push({ id: 'garden-flies-' + i, at: last + 700 * (i + 1), kind: 'garden', name: m[1], icon: m[0], desc: 'Five more fireflies light up your garden.' }); });
    return out;
  }
  var ALL = ladder();
  var TILE_THEMES = [{ id: 'tiles-petal', name: 'Petal', icon: '🌸' }].concat(ALL.filter(function (u) { return u.kind === 'tiles'; }));

  function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function daysBetween(a, b) { var pa = a.split('-'), pb = b.split('-'); return Math.round((Date.UTC(+pb[0], pb[1] - 1, +pb[2]) - Date.UTC(+pa[0], pa[1] - 1, +pa[2])) / 864e5); }

  var S = { petals: 0, days: [], streak: 0, best: 0, rest: '', last: '', unlocked: [], tiles: 'tiles-petal', garden: {}, from: {}, games: {}, today: { day: '', did: {}, bouquet: false } };
  // The daily bouquet: one calm breath, one word game and one garden game in a day
  var BOUQUET = { breath: ['breathe'], words: ['bloom', 'crossword', 'words'], garden: ['pond', 'fireflies'] };
  function kindOf(src) { for (var k in BOUQUET) if (BOUQUET[k].indexOf(src) !== -1) return k; return null; }
  try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); for (var k in o) S[k] = o[k]; } } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  // anything already earned (for example when the garden's list changes) is simply there
  ALL.forEach(function (u) { if (u.at <= S.petals && S.unlocked.indexOf(u.id) === -1) S.unlocked.push(u.id); });
  S.unlocked = S.unlocked.filter(function (id) { return id.indexOf('st-') !== 0; }); // stickers retired

  function nextUnlock() { for (var i = 0; i < ALL.length; i++) if (ALL[i].at > S.petals) return ALL[i]; return null; }
  function prevAt() { var p = 0; ALL.forEach(function (u) { if (u.at <= S.petals) p = u.at; }); return p; }
  function level() { return 1 + ALL.filter(function (u) { return u.at <= S.petals; }).length; }

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

  // earn(n, source, why): add petals for doing well; returns what happened, and shows it softly.
  function earn(n, source, why, opts) {
    opts = opts || {};
    n = Math.max(0, Math.round(n || 0));
    var daily = touchDay(), before = S.petals;
    S.petals += n + daily;
    if (source) S.from[source] = (S.from[source] || 0) + n;
    // the daily bouquet
    var tk = dayKey();
    if (!S.today || S.today.day !== tk) S.today = { day: tk, did: {}, bouquet: false };
    var kind = kindOf(source), bouquetNow = false;
    if (kind) S.today.did[kind] = true;
    if (!S.today.bouquet && S.today.did.breath && S.today.did.words && S.today.did.garden) { S.today.bouquet = true; S.petals += 10; bouquetNow = true; }
    var fresh = ALL.filter(function (u) { return u.at > before && u.at <= S.petals && S.unlocked.indexOf(u.id) === -1; });
    fresh.forEach(function (u) { S.unlocked.push(u.id); if (u.kind === 'garden') S.garden[u.id] = true; });
    save();
    var res = { gained: n + (bouquetNow ? 10 : 0), daily: daily, total: S.petals, streak: S.streak, unlocked: fresh, next: nextUnlock(), bouquet: bouquetNow };
    if (!opts.quiet && (n || daily)) toast(res, bouquetNow ? (why ? why + ' \u00B7 ' : '') + 'Daily bouquet complete! +10' : why);
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
      '.tr-card-art img{width:70%;height:70%}.tr-card h2{margin:.2rem 0 .3rem;font:600 1.45rem/1.2 Fraunces,Georgia,serif;color:#2B2440}.tr-card p{margin:0 0 1rem;color:#5A5346;font:1rem/1.45 Lora,Georgia,serif}' +
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
    var nx = res.next, pct = nx ? Math.round((S.petals - prevAt()) / (nx.at - prevAt()) * 100) : 100;
    var line = (why || 'Petals for your garden') + (res.daily ? ' · +' + res.daily + ' daily blossom' + (res.streak > 1 ? ' (' + res.streak + '-day streak)' : '') : '');
    toastEl.innerHTML = '<b>+' + (res.gained + res.daily) + '</b><span>🌸 ' + esc(line) +
      '<small>' + (nx ? (nx.at - S.petals) + ' more to unlock ' + esc(nx.name) : 'Every keepsake unlocked!') + '</small><span class="tr-bar"><i style="width:' + Math.max(4, pct) + '%"></i></span></span>';
    requestAnimationFrame(function () { toastEl.classList.add('is-in'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-in'); }, 3600);
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function artFor(u) { return u.img ? '<img src="' + u.img + '" alt="">' : '<span aria-hidden="true">' + (u.icon || '🌸') + '</span>'; }
  var cardOpen = false;
  function unlockCard(u) {
    if (cardOpen || typeof document === 'undefined') return;
    style(); cardOpen = true;
    var what = { tiles: 'New tile colours', garden: 'Your garden grew' }[u.kind] || 'Something new';
    var action = u.kind === 'tiles' ? '<button type="button" class="tr-go" data-use="' + u.id + '">Use them now</button>'
      : '<a class="tr-go" href="/keepsakes.html">See your garden</a>';
    var c = document.createElement('div');
    c.className = 'tr-card'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-modal', 'true'); c.setAttribute('aria-label', 'You unlocked ' + u.name);
    c.innerHTML = '<div class="tr-card-box"><div class="tr-confetti" aria-hidden="true"></div><p class="tr-card-k">✨ ' + what + ' ✨</p><div class="tr-card-art">' + artFor(u) + '</div>' +
      '<h2>' + esc(u.name) + '</h2><p>' + esc(u.desc) + '</p><div class="tr-card-row">' + action + '<button type="button" data-close>Keep playing</button></div></div>';
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

  // Little chips that show your petals and streak, and open the keepsakes page
  function renderChips() {
    if (typeof document === 'undefined') return;
    Array.prototype.forEach.call(document.querySelectorAll('[data-rewards-chip]'), function (el) {
      style();
      el.innerHTML = '<a class="tr-chip" href="/keepsakes.html" aria-label="' + S.petals + ' petals, ' + S.streak + '-day streak. Open your keepsakes">🌸 ' + S.petals +
        (S.streak > 1 ? ' <span class="tr-s">🔥 ' + S.streak + '</span>' : '') + '</a>';
    });
  }

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-tiles', S.tiles || 'tiles-petal');
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderChips); else renderChips();
  }

  window.TOLRewards = {
    earn: earn, record: record, stat: stat, setTiles: setTiles, renderChips: renderChips, unlockCard: unlockCard,
    has: function (id) { return id === 'tiles-petal' || S.unlocked.indexOf(id) !== -1; },
    garden: function (id) { return S.unlocked.indexOf(id) !== -1 && S.garden[id] !== false; },
    extraFlies: function () { return S.unlocked.filter(function (id) { return id.indexOf('garden-flies-') === 0; }).length * 5; },
    setGarden: function (id, on) { S.garden[id] = !!on; save(); },
    bouquet: function () { var t = S.today && S.today.day === dayKey() ? S.today : { did: {}, bouquet: false }; return { breath: !!t.did.breath, words: !!t.did.words, garden: !!t.did.garden, done: !!t.bouquet }; },
    state: function () { return { petals: S.petals, streak: S.streak, best: S.best, days: S.days.slice(), rest: S.rest, level: level(), next: nextUnlock(), prevAt: prevAt(), unlocked: S.unlocked.slice(), tiles: S.tiles, from: S.from, games: S.games }; },
    ladder: ALL, tileThemes: TILE_THEMES, dayKey: dayKey
  };
})();
