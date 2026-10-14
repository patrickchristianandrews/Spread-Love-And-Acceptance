/* explore.js — "Everything on this site" (/explore.html).
   Every page and tool as a small card, built from the same lists the menu and search use (site.js exposes them as
   window.TOLSiteMap), so the page stays current as pages are added. Filters: what you need, who it's about, how long
   you have, and what kind of page it is, plus a words filter (it also reads the search index, loaded only once
   someone types). The filters live in the address (?need=calm&rel=family), so a filtered list can be linked to.
   Nothing is stored or sent. */
(function () {
  'use strict';
  var grid = document.querySelector('[data-ex-grid]');
  if (!grid) return;
  var M = window.TOLSiteMap;
  // the tools registry (tools-registry.js): a tool here gets the same plain name, type, time and who-for as on /tools.html
  var TT = {}, NEED_OF = { talk: 'talk', self: 'self', load: 'load', calm: 'calm', family: 'family', work: 'work', health: 'health', learn: 'read', play: 'play', plan: 'load' };
  (window.TOLTools || []).forEach(function (t) { var p = t.href.split(/[?#]/)[0]; if (!TT[p]) TT[p] = t; if (!TT[t.href]) TT[t.href] = t; });
  function ttOf(e) { return TT[e.u] || TT[e.p] || null; }
  var countEl = document.querySelector('[data-ex-count]'), resetBtn = document.querySelector('[data-ex-reset]'),
    emptyEl = document.querySelector('[data-ex-empty]'), moreEl = document.querySelector('[data-ex-more]'),
    qEl = document.getElementById('ex-q'), relEl = document.getElementById('ex-rel'), timeEl = document.getElementById('ex-time'), typeEl = document.getElementById('ex-type'),
    needBox = document.querySelector('[data-ex-need]');
  if (!M) { countEl.innerHTML = 'The list didn’t load. The plain list of every page is on <a href="/contents.html">All pages</a>.'; return; }

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fold(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'"); }
  function pathOf(u) { var p = String(u || '').split(/[?#]/)[0]; if (/\/$/.test(p)) p += 'index.html'; return p; }

  // ---------- the pages: the menu first (its order is the site's own "most useful first"), then every other listed page
  var byKey = {}, list = [];
  var SKIP = /^#|^\/(index|404|offline|garden-backdrop|explore|membership|telemetry|roadmap|dashboard|suite-index)\.html$|^\/legal\/(refund|terms)/;
  function add(it, from) {
    if (!it || !it.href || SKIP.test(it.href)) return;
    var p = pathOf(it.href), hash = it.href.indexOf('#') !== -1;
    var key = hash && !byKey[p] ? it.href : p;
    if (hash && byKey[p]) return;                         // a part of a page that's already listed
    var e = byKey[key];
    if (!e) {
      e = byKey[key] = { u: it.href.replace(/\?.*$/, ''), p: p, t: '', n: '', code: '', isNew: false, order: list.length };
      list.push(e);
    }
    if (!e.t || from === 'menu') e.t = (M.plainLabel && M.plainLabel(it.href)) || it.title || e.t;
    var tt0 = TT[e.u] || (!hash && TT[p]);
    if (tt0 && (tt0.href === e.u || tt0.href.split(/[?#]/)[0] === e.u)) { e.t = tt0.name + (tt0.brand ? ' (' + tt0.brand.replace(/^the /, '') + ')' : ''); e.n = tt0.does; e.tool = tt0; }
    if (it.note && (!e.n || (from === 'menu' && it.note.length > 40))) e.n = it.note;
    if (it.code && !e.code) e.code = it.code;
    if (it.code === 'New') e.isNew = true;
  }
  (M.menu || []).forEach(function (g) { if (g.id !== 'about') g.items.forEach(function (it) { if (!it.sub) add(it, 'menu'); }); });
  (M.sections || []).forEach(function (s) { s.items.forEach(function (it) { add(it, 'sections'); }); });
  (M.menu || []).forEach(function (g) { if (g.id === 'about') g.items.forEach(function (it) { if (!it.sub) add(it, 'menu'); }); });
  // every tool in the registry is here too, even one the menu doesn't name
  (window.TOLTools || []).forEach(function (t) { add({ href: t.href, title: t.name, note: t.does }, 'tools'); });

  // ---------- what each page is
  var GAME = /^\/(frequency-journey(-play)?|word-bloom|quiet-words|quiet-crossword|daily-ledger-crossword|recheck-drive|bears-dojo|pause-and-play|surprise|keepsakes|quest)\.html$/;
  var MEDIA = /^\/(frequency-buddies[a-z0-9-]*|pal-cam-tv|podcast-index|echoes-of-gold|soundscapes|calm-visualizer|wp-11-sound-toolkit)\.html$/;
  var INFO = /^\/(about|is-this-for-you|method-and-limits|how-it-works|five-pillars|ways-in|on-this-device|contents|whats-new|install|research|brand|legal\/[a-z-]+)\.html$|^\/legal\//;
  function typeOf(e) {
    var p = e.p, c = e.code || '';
    if (e.tool) return e.tool.type === 'play' ? 'game' : /^\/workpapers\/(?!calculators)|^\/wp-\d|^\/(prog-01|full-path|chore-chart-for-couples|week-0)\.html$/.test(p) ? 'worksheet' : 'tool';
    if (/^\/book\//.test(p)) return 'book';
    if (MEDIA.test(p) || /^(Cartoon|On air|Shuffle|Song|Make|Teaser|Music|Drift|Sounds|Album|Podcast|Live)$/.test(c)) return 'media';
    if (GAME.test(p) || c === 'Game') return 'game';
    if (/^\/workpapers\//.test(p) || /^\/wp-\d/.test(p) || /^(WP-|CALC|Check$|Print$|Week 0$|6 weeks$|Suite$|Package$)/.test(c) || /^\/(prog-01|week-0|full-path|program|chore-chart-for-couples)\.html$/.test(p)) return 'worksheet';
    if (INFO.test(p)) return 'info';
    if ((M.isTool && M.isTool(p)) || /^(Tool|Quiz|Daily|Now|Breathe|Chat)$/.test(c) || /^\/(ladder|wavelength|wiring-card|communication-style-quiz|write-it-through|how-you-take-things-in|ask)\.html$/.test(p)) return 'tool';
    return 'guide';
  }
  var TYPE_NAME = { guide: 'Guide', tool: 'Tool', worksheet: 'Workpaper', game: 'Game', book: 'Book', media: 'Watch or listen', info: 'About the site' };
  var DEFAULT_MIN = { guide: 10, tool: 5, worksheet: 10, game: 5, book: 15, media: 5, info: 5 };
  var WORDNUM = { one: 1, two: 2, three: 3, four: 4, five: 5, ten: 10, fifteen: 15, twenty: 20, thirty: 30, ninety: 1.5 };
  function minutesOf(e) {
    if (e.tool && e.tool.mins) return { m: e.tool.mins, known: true };
    var t = fold(e.t + ' ' + e.n), m;
    if ((m = /\b(\d{1,3})\s*(?:-|to|or)\s*(\d{1,3})[ -]?(?:minutes?|mins?)\b/.exec(t))) return { m: +m[2], known: true };
    if ((m = /\b(\d{1,3}|one|two|three|four|five|ten|fifteen|twenty|thirty)[ -]?(?:minutes?|mins?|min)\b/.exec(t))) return { m: WORDNUM[m[1]] || +m[1], known: true };
    if (/\b(\d+|ninety|thirty)[ -]?seconds?\b|\ba minute\b|one tap/.test(t)) return { m: 1, known: true };
    if (/six (gentle )?weeks|\bweeks?\b.*program/.test(t)) return { m: 30, known: true };
    return { m: DEFAULT_MIN[e.type] || 10, known: false };
  }
  var REL_IDS = { 'just-me': 1, couples: 1, friends: 1, family: 1, 'co-parents': 1, housemates: 1, work: 1, 'life-changes': 1 };
  var REL_NAME = { 'just-me': 'Just me', couples: 'Couples', friends: 'Friends', family: 'Family', 'co-parents': 'Co-parents', housemates: 'Housemates', work: 'Work', 'life-changes': 'Life changes' };
  var CALM = /calm|breath|night-garden|ladder|upset-right-now|wp-11|soften|soundscapes|calm-visualizer|supplement|sleep|anxi|settle|soothe|bears-dojo/;
  var HEALTH = /supplement|herb|illness|\bill\b|sleep|health|disab|low energy|nervous system|burn-?out|adhd|autis|sensory|dyslex|anxi|medic|caring for someone/;
  var HEALTH_PAGE = /^\/(calming-supplements|when-one-is-ill|caregivers|adhd-kids|night-garden|ladder|upset-right-now|wp-11|how-you-take-things-in|neurodivergent-relationships|wired-differently)\.html$|^\/book\/understanding-(2-stress|9-minds)/;
  function needsOf(e, areas) {
    var n = {}, txt = fold(e.p + ' ' + e.t + ' ' + e.n);
    if (areas.talk) n.talk = 1;
    if (areas.load) n.load = 1;
    if (areas.self || areas['just-me']) n.self = 1;
    if (areas.family || areas['co-parents']) n.family = 1;
    if (areas.work) n.work = 1;
    if (areas.read || e.type === 'book' || /^\/(library|learn)\b|^\/(glossary|research|reading|library|infographic|polymath)\.html$/.test(e.p)) n.read = 1;
    if (e.type === 'game' || e.type === 'media' || areas.media) n.play = 1;
    if (CALM.test(txt) || (areas.play && e.type !== 'game')) n.calm = 1;
    if (HEALTH_PAGE.test(e.p) || HEALTH.test(fold(e.t + ' ' + e.n))) n.health = 1;
    if (/money|chore|bills|who does what|fair share|invisible|mental load|one owner|split/.test(txt)) n.load = 1;
    if (/listen|say it|message|conversation|apolog|check-in|talk|fight|argu/.test(txt) && e.type !== 'game') n.talk = 1;
    if (/parent|teen|grand|family|kinship|foster|sibling|stepfam|child/.test(txt)) n.family = 1;
    if (/\bwork\b|cowork|colleague|business|team/.test(txt)) n.work = 1;
    if (e.tool) [e.tool.type].concat(e.tool.also || []).forEach(function (k) { if (NEED_OF[k]) n[NEED_OF[k]] = 1; });
    return n;
  }
  list.forEach(function (e) {
    e.type = typeOf(e);
    var areas = (M.areasOf && M.areasOf(e.u)) || {};
    e.rels = Object.keys(areas).filter(function (a) { return REL_IDS[a]; });
    e.needs = needsOf(e, areas);
    var tm = minutesOf(e); e.min = tm.m; e.minKnown = tm.known;
    if (e.tool && e.tool.who) {
      var w = e.tool.who; e.who = w.indexOf('solo') !== -1 && w.length === 1 ? 'On your own' : w.indexOf('solo') === -1 ? 'Together' : 'Alone or together';
      if (w.indexOf('solo') !== -1 && e.rels.indexOf('just-me') === -1) e.rels.push('just-me');
    }
    e.hay = fold(e.t + ' ' + e.n + ' ' + e.p.replace(/[\/.-]/g, ' ') + ' ' + TYPE_NAME[e.type] + ' ' + e.rels.map(function (r) { return REL_NAME[r]; }).join(' ') + (e.tool ? ' ' + (e.tool.kw || '') + ' ' + (e.tool.brand || '') + ' ' + (e.who || '') : ''));
  });

  // ---------- the cards (built once; filtering only shows and hides them)
  function timeLabel(e) { var m = e.min < 1.5 ? 'about a minute' : (e.minKnown ? '' : 'about ') + Math.round(e.min) + ' min'; return m; }
  grid.innerHTML = list.map(function (e, i) {
    var tags = '<span>' + esc(TYPE_NAME[e.type]) + '</span>' + '<span class="ex-time">' + esc(timeLabel(e)) + '</span>' + (e.who ? '<span>' + esc(e.who) + '</span>' : '') +
      (e.isNew ? '<span class="ex-new">New</span>' : '') + e.rels.slice(0, 2).map(function (r) { return '<span>' + esc(REL_NAME[r]) + '</span>'; }).join('');
    return '<li data-i="' + i + '"><a class="ex-card" href="' + esc(e.u) + '"><span class="ex-t">' + esc(e.t) + '</span>' +
      (e.n ? '<span class="ex-n">' + esc(e.n) + '</span>' : '') + '<span class="ex-m">' + tags + '</span></a></li>';
  }).join('');
  var lis = Array.prototype.slice.call(grid.children);

  // ---------- filters, read from and written to the address
  var S = { q: '', need: '', rel: '', time: '', type: '', sort: '' }, PAGE = 48, shownMax = PAGE;
  (function () {
    var u = new URLSearchParams(location.search);
    Object.keys(S).forEach(function (k) { if (u.get(k)) S[k] = u.get(k); });
    if (S.need === 'calm-play') S.need = 'calm';
  })();
  function sync() {
    qEl.value = S.q; relEl.value = S.rel; timeEl.value = S.time; typeEl.value = S.type;
    Array.prototype.forEach.call(needBox.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === S.need)); });
  }
  function writeUrl() {
    var u = new URLSearchParams();
    Object.keys(S).forEach(function (k) { if (S[k]) u.set(k, S[k]); });
    var qs = u.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '')); } catch (e) {}
  }
  var deep = null;   // page text from the search index, once someone types words (loaded only then)
  // "Best match for what you described" (the search's needs layer, in site.js): someone types their problem
  // ("my teen won't talk to me"), not a page's name. Those pages show first, with why each helps; when nothing
  // fits, the closest needs, the 3-question finder, Professor Puddles and the plain list are offered instead.
  var NEED = null, needQ = '', bestBox = document.createElement('div'), noneBox = document.createElement('div');
  bestBox.className = 'tol-find-best ex-best'; bestBox.hidden = true; bestBox.setAttribute('aria-live', 'polite');
  noneBox.className = 'tol-find-none ex-none'; noneBox.hidden = true;
  grid.parentNode.insertBefore(bestBox, grid);
  emptyEl.parentNode.insertBefore(noneBox, emptyEl.nextSibling);
  function askNeeds() {
    var q = S.q;
    if (q === needQ) return;
    needQ = q; NEED = null;
    if (!q || q.length < 3 || !window.TOLSearch || !window.TOLSearch.needs) return;
    window.TOLSearch.needs(q, function (M) { if (S.q !== q) return; NEED = M; apply(true); });
  }
  if (window.TOLSearch && window.TOLSearch.wire) window.TOLSearch.wire(noneBox, function (words) { S.q = words; sync(); askNeeds(); loadDeep(); apply(); });
  var TOGETHER = /(^|[^a-z])(we|us|our|together|both|each other)([^a-z]|$)/;
  function soloOf(e) { return e.tool && e.tool.who ? (e.tool.who.indexOf('solo') !== -1 ? 1 : 0) : 1; }
  function wordsMatch(e, terms) {
    if (!terms.length) return true;
    var h = e.hay + (deep && deep[e.p] ? ' ' + deep[e.p] : '');
    return terms.every(function (t) { return h.indexOf(t) !== -1; });
  }
  function apply(keepMax) {
    if (!keepMax) shownMax = PAGE;
    var terms = fold(S.q).split(/[^a-z0-9'-]+/).filter(function (t) { return t.length > 1 && !/^(the|and|for|with|my|a|an|to|of|in|on|is|it|i)$/.test(t); });
    var bestAt = {};
    if (S.q && NEED && NEED.best) NEED.best.g.forEach(function (g, i) { var p = pathOf(g[0]); if (bestAt[p] == null) bestAt[p] = i; });
    var hits = list.filter(function (e) {
      if (S.need && !e.needs[S.need]) return false;
      if (S.rel && e.rels.indexOf(S.rel) === -1) return false;
      if (S.type && e.type !== S.type) return false;
      if (S.time === '1' && e.min > 2) return false;
      if (S.time === '10' && e.min > 10) return false;
      if (S.time === '30' && e.min < 15) return false;
      return bestAt[e.p] != null || wordsMatch(e, terms);
    });
    // a words filter puts pages whose name matches first; "?sort=new" puts the newest first
    // the best match for what they described first; then, when nobody else is named, what one person can use alone
    var solo = !TOGETHER.test(fold(S.q));
    function bestRank(e) { return bestAt[e.p] == null ? 99 : bestAt[e.p]; }
    if (terms.length) hits.sort(function (a, b) { var ta = terms.every(function (t) { return fold(a.t).indexOf(t) !== -1; }), tb = terms.every(function (t) { return fold(b.t).indexOf(t) !== -1; }); return (bestRank(a) - bestRank(b)) || (tb - ta) || (solo ? soloOf(b) - soloOf(a) : 0) || (a.order - b.order); });
    else if (S.sort === 'new') hits.sort(function (a, b) { return (b.isNew - a.isNew) || (a.order - b.order); });
    // words typed: each kind of page sits together (tools, workpapers, guides...), in the order the kinds first
    // appear, so a workpaper is never shown in among the tools or the other way round
    if (terms.length) { var kOrder = [], byK = {}; hits.forEach(function (e) { if (!byK[e.type]) { byK[e.type] = []; kOrder.push(e.type); } byK[e.type].push(e); }); hits = [].concat.apply([], kOrder.map(function (k) { return byK[k]; })); }
    var show = {}, order = [];
    hits.forEach(function (e, n) { if (n < shownMax) { show[e.order] = 1; order.push(e.order); } });
    lis.forEach(function (li) { li.hidden = !show[+li.getAttribute('data-i')]; });
    order.forEach(function (i) { grid.appendChild(lis[i]); });   // matching cards in their best order
    var filtered = !!(S.q || S.need || S.rel || S.time || S.type);
    countEl.textContent = hits.length === list.length ? 'All ' + list.length + ' pages and tools.' : hits.length + (hits.length === 1 ? ' page fits.' : ' pages fit.');
    resetBtn.hidden = !filtered;
    emptyEl.hidden = !!hits.length;
    var best = S.q && NEED && NEED.best && window.TOLSearch;
    bestBox.innerHTML = best ? window.TOLSearch.bestHTML(NEED.best, S.q) : ''; bestBox.hidden = !best;
    var none = !hits.length && S.q && S.q.length >= 3 && NEED && window.TOLSearch;
    noneBox.innerHTML = none ? window.TOLSearch.fallbackHTML(S.q, NEED) : ''; noneBox.hidden = !none;
    moreEl.hidden = hits.length <= shownMax;
    if (!moreEl.hidden) moreEl.querySelector('button').textContent = 'Show more (' + (hits.length - shownMax) + ' more)';
    writeUrl();
  }
  function loadDeep() {
    if (deep || !window.TOLSearch || !window.TOLSearch.load) return;
    deep = {};
    window.TOLSearch.load(function (pages) {
      (pages || []).forEach(function (p) {
        var k = pathOf(p.u).replace(/-in-depth\.html$/, '.html');
        if (!byKey[k]) return;
        deep[k] = (deep[k] || '') + ' ' + fold((p.s || []).join(' ') + ' ' + (p.d || '') + ' ' + String(p.x || '').slice(0, 1200));
      });
      apply(true);
    });
  }

  needBox.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var v = b.getAttribute('data-v'); S.need = S.need === v ? '' : v; sync(); apply();
  });
  var tmr = null;
  qEl.addEventListener('input', function () { clearTimeout(tmr); tmr = setTimeout(function () { S.q = qEl.value.trim(); askNeeds(); if (S.q.length >= 3) loadDeep(); apply(); }, 120); });
  qEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var a = grid.querySelector('li:not([hidden]) a'); if (a) a.focus(); } });
  relEl.addEventListener('change', function () { S.rel = relEl.value; apply(); });
  timeEl.addEventListener('change', function () { S.time = timeEl.value; apply(); });
  typeEl.addEventListener('change', function () { S.type = typeEl.value; apply(); });
  resetBtn.addEventListener('click', function () { S.q = S.need = S.rel = S.time = S.type = ''; sync(); apply(); qEl.focus(); });
  moreEl.querySelector('button').addEventListener('click', function () {
    var before = shownMax; shownMax += 1000; apply(true);
    var next = grid.querySelectorAll('li:not([hidden]) a')[before]; if (next) next.focus();
  });
  sync(); apply();
  if (S.q && S.q.length >= 3) { askNeeds(); loadDeep(); }
})();
