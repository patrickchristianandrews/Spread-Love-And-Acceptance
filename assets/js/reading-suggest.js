/* reading-suggest.js — "Something to read": a small card that suggests one article from the
   Further Reading list (reading-list.js → window.TOL_READING) that suits the page it sits on.

   Needs reading-list.js loaded first. Nothing is sent anywhere. The only thing kept is a short
   list of article ids the reader has opened, in this browser (localStorage 'tol-reading-v1'),
   so the card can offer something new next time.

   API (window.TOLReading):
     card(opts)          → HTMLElement (a wrapper holding the card and its small note)
     suggest(opts)       → one item from the list (or null if the list is empty)
     mount(el, opts)     → builds a card and puts it inside el (el may be an element or a selector)
   opts (all optional):
     topics:   ['calm', 'conflict']  tag keys from TOL_READING.tags; added to what the page suggests
     pillars:  ['III']               only suggest articles in these of the Five Pillars (I to V)
     page:     '/wp-11.html'         defaults to the current path
     audience: 'self' | 'others'     starts the toggle on one side; leave out for both
     heading:  2..6                  heading level for the article title (default 3)
     scan:     false                 skip reading the page's words for topics
*/
(function () {
  'use strict';

  var KEY = 'tol-reading-v1';
  var MAX_KEPT = 400;
  var shown = {};            // ids shown during this visit, shared by every card on the page
  var uid = 0;

  function data() {
    var d = window.TOL_READING || {};
    return { items: d.items || [], tags: d.tags || {}, sources: d.sources || {}, pillars: d.pillars || {} };
  }

  /* ---------- the reader's opened list: article ids only ---------- */
  function readOpened() {
    try {
      var raw = window.localStorage.getItem(KEY);
      var o = raw ? JSON.parse(raw) : null;
      return o && Array.isArray(o.opened) ? o.opened.filter(function (x) { return typeof x === 'string'; }) : [];
    } catch (e) { return []; }
  }
  function markOpened(id) {
    try {
      var list = readOpened().filter(function (x) { return x !== id; });
      list.push(id);
      if (list.length > MAX_KEPT) list = list.slice(list.length - MAX_KEPT);
      window.localStorage.setItem(KEY, JSON.stringify({ opened: list }));
    } catch (e) { /* private mode or storage off: the card still works */ }
  }

  /* ---------- where are we? ---------- */
  // a few pages exist in two places; point them at the one the list uses
  var ALIAS = {
    '/wp-01.html': '/workpapers/wp-01.html',
    '/wp-02.html': '/workpapers/wp-02-battery-stress-meter.html',
    '/wp-03.html': '/workpapers/wp-03-raci-treaty.html',
    '/wp-04.html': '/workpapers/wp-04-deficit-audit.html',
    '/workpapers/wp-04.html': '/workpapers/wp-04-deficit-audit.html',
    '/wp-09.html': '/workpapers/wp-09-tone-filter.html',
    '/workpapers/wp-11.html': '/wp-11.html',
    '/wp-11-sound-toolkit.html': '/wp-11.html',
    '/wp-13.html': '/workpapers/wp-13-pll-protocol.html'
  };
  function normPath(p) {
    p = String(p || '/').split('#')[0].split('?')[0].toLowerCase();
    try { if (/^https?:/.test(p)) p = new URL(p).pathname; } catch (e) { }
    if (p.charAt(0) !== '/') p = '/' + p;
    p = p.replace(/\/index\.html$/, '/').replace(/-in-depth\.html$/, '.html');
    if (!/\.html$/.test(p) && p !== '/') p = p.replace(/\/$/, '') + '.html';
    return ALIAS[p] || p;
  }

  /* ---------- what is this page about? ---------- */
  // mini-dive glossary keys (dives.js marks them with data-dive) → reading topics
  var DIVE = {};
  function dive(tag, keys) { keys.split(' ').forEach(function (k) { DIVE[k] = tag; }); }
  dive('invisible-work', 'unbilled invisible ledger scorekeeping balance clarity undefinedowner raci ra parity twofair deficit anchortax structgap maintmargin');
  dive('stress', 'saturation baseline battery fivefactors bandwidth nervous ladder ventral sympathetic dorsal vagalbrake dysregulation arousal peopleload weather capacityissue');
  dive('calm', 'kit firstsignal defaults asymbreath namingroom box regulatefirst coregulate flooded returntime reentry postpone signalline');
  dive('connection', 'bids turning appreciation goodnews stresstalk rituals pll fourparts resync closing bondsignal');
  dive('conflict', 'checkins groundrules onetopic parkit complaint softstart stonewalling defensiveness contempt regroup notagainst saferoom conflictneeds perpetual');
  dive('repair', 'repair talkingnotes');
  dive('communication', 'tone filter factsbox intentimpact validation acknowledgement speakerlistener acceptinfluence rebuttal subtext bothsides gottman');
  dive('boundaries', 'refusal threemoves boundary');
  dive('neurodiversity', 'neurotypical neurodivergent neurodev doubleempathy overload gating masking hsp alexithymia wired card tenrules');
  dive('autism', 'autistic');
  dive('adhd', 'adhd rsd audhd');
  dive('anxiety', 'anxiety hypervigilance ocd');
  dive('self-compassion', 'selfdiscovery');
  dive('family', 'familyscript');

  var WORDS = {
    'invisible-work': /invisible work|mental load|chores?\b|housework|household|fair share|unbilled|who does what|one owner/g,
    'stress': /stress|burn-?out|nervous system|battery|exhaust/g,
    'calm': /calm(ing)? down|breath|self-sooth|calm-down|regulat/g,
    'connection': /\bbids?\b|turn(ing)? toward|appreciat|connection/g,
    'conflict': /conflict|argument|\bfights?\b|flood|stonewall|contempt|criticism|defensive/g,
    'repair': /\brepair|apolog|sorry|forgiv/g,
    'communication': /listen|validat|i-statement|\btone\b|lands?\b|request/g,
    'anxiety': /anxi|worr(y|ies|ied)|reassur/g,
    'attachment': /attachment/g,
    'boundaries': /boundar|say(ing)? no\b|refus/g,
    'neurodiversity': /neurodiver|wired differently|sensory|masking|double empathy/g,
    'autism': /autis/g,
    'adhd': /\badhd\b|rejection sensitiv/g,
    'self-compassion': /self-compassion|inner critic|be kind to yourself|self-understanding/g,
    'family': /co-parent|parents?\b|family|sibling|caregiv/g,
    'teams': /roommate|housemate|coworker|colleague|\bteams?\b|workplace/g,
    'habits': /habit|routine|small change|look-back/g,
    'gratitude': /gratitude|grateful|thank|kindness/g
  };

  function scanPage() {
    var score = {};
    function add(t, n) { if (t) score[t] = (score[t] || 0) + n; }
    try {
      Array.prototype.forEach.call(document.querySelectorAll('[data-dive]'), function (el) { add(DIVE[el.getAttribute('data-dive')], 2); });
      var main = document.querySelector('main') || document.body;
      if (!main) return [];
      var head = [], h = main.querySelector('h1'), lede = main.querySelector('.simple-lede, .lede');
      if (h) head.push(h.textContent); if (lede) head.push(lede.textContent);
      head.push(document.title || '');
      var headText = head.join(' ').toLowerCase();
      var body = (main.textContent || '').slice(0, 20000).toLowerCase();
      Object.keys(WORDS).forEach(function (t) {
        var re = WORDS[t];
        re.lastIndex = 0; var a = headText.match(re); if (a) add(t, a.length * 3);
        re.lastIndex = 0; var b = body.match(re); if (b) add(t, b.length);
      });
    } catch (e) { return []; }
    var keys = Object.keys(score).sort(function (a, b) { return score[b] - score[a]; });
    if (!keys.length) return [];
    var top = score[keys[0]];
    return keys.filter(function (k) { return score[k] >= Math.max(2, top * 0.5); }).slice(0, 3);
  }

  /* ---------- choosing ---------- */
  function fitsAudience(it, aud) {
    if (aud !== 'self' && aud !== 'others') return true;
    return it.audience === aud || it.audience === 'both';
  }
  function hasAny(it, topics) {
    for (var i = 0; i < topics.length; i++) if (it.topics.indexOf(topics[i]) !== -1) return true;
    return false;
  }
  function pick(list) { return list.length ? list[Math.floor(Math.random() * list.length)] : null; }

  // the tiers, most relevant first: this page and its topics → this page → this page's topics → anything
  function tiers(opts) {
    var d = data(), aud = opts.audience;
    var all = d.items;
    if (opts.pillars && opts.pillars.length) {
      var inPillar = all.filter(function (it) { return (it.pillars || []).some(function (p) { return opts.pillars.indexOf(p) !== -1; }); });
      if (inPillar.length) all = inPillar;
    }
    var pool = all.filter(function (it) { return fitsAudience(it, aud); });
    if (!pool.length) pool = all.slice();
    var page = normPath(opts.page != null ? opts.page : (window.location && window.location.pathname));
    var topics = (opts.topics || []).slice();
    if (opts._scanned) opts._scanned.forEach(function (t) { if (topics.indexOf(t) === -1) topics.push(t); });
    var onPage = pool.filter(function (it) { return (it.pages || []).indexOf(page) !== -1; });
    // on this page, prefer the ones that also match what the page is about
    var focus = opts.topics && opts.topics.length ? opts.topics : (opts._scanned || []);
    var onPageFocus = focus.length ? onPage.filter(function (it) { return hasAny(it, focus); }) : [];
    var byTopic = topics.length ? pool.filter(function (it) { return hasAny(it, topics); }) : [];
    return [onPageFocus, onPage, byTopic, pool];
  }

  function suggest(opts) {
    opts = opts || {};
    if (opts.scan !== false && !opts._scanned && typeof document !== 'undefined') opts._scanned = scanPage();
    var t = tiers(opts), i, fresh, openedSet = {};
    readOpened().forEach(function (id) { openedSet[id] = 1; });
    var ex = opts.exclude || [];
    function ok(it) { return ex.indexOf(it.id) === -1; }
    // 1) not shown this visit and never opened, most relevant tier first
    for (i = 0; i < t.length; i++) {
      fresh = t[i].filter(function (it) { return ok(it) && !shown[it.id] && !openedSet[it.id]; });
      if (fresh.length) return pick(fresh);
    }
    // 2) everything has been shown: start the visit over, still skipping ones they opened
    shown = {};
    for (i = 0; i < t.length; i++) {
      fresh = t[i].filter(function (it) { return ok(it) && !openedSet[it.id]; });
      if (fresh.length) return pick(fresh);
    }
    // 3) they have opened the lot: anything but the one on screen
    var last = t[t.length - 1];
    return pick(last.filter(ok)) || pick(last);
  }

  /* ---------- the look: a soft bubble, like the site's tip boxes ---------- */
  function injectStyle() {
    if (document.getElementById('tol-read-style')) return;
    var css = [
      '.tol-read-wrap{max-width:40rem;margin:2.25rem 0 1.25rem;}',
      '.tol-read{--rb-fill:rgba(255,253,249,.84);position:relative;padding:1.15rem 1.3rem 1.2rem;border:1.5px solid transparent;border-radius:28px;',
      'background:radial-gradient(120% 90% at 14% 8%,rgba(255,255,255,.9),rgba(255,255,255,0) 42%) padding-box,linear-gradient(var(--rb-fill),var(--rb-fill)) padding-box,',
      'linear-gradient(135deg,#F7C9D4,#D9C8F0 30%,#C6DFF4 55%,#C7EBD6 78%,#F8E7AE) border-box;',
      'box-shadow:0 10px 28px rgba(110,90,160,.10),inset 0 -8px 18px rgba(185,160,224,.10),inset 0 2px 0 rgba(255,255,255,.75);',
      '-webkit-backdrop-filter:blur(6px) saturate(1.08);backdrop-filter:blur(6px) saturate(1.08);color:var(--ink,#2B2620);font-family:"Lora",Georgia,serif;}',
      '.tol-read *{box-sizing:border-box;}',
      '.tol-read p{margin:0;max-width:none;}',
      '.tol-read-k{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:#8A6D8F;}',
      '.tol-read-aud{display:flex;flex-wrap:wrap;gap:.4rem;margin:.65rem 0 .85rem;padding:0;border:0;}',
      '.tol-read-aud button,.tol-read-next{font:inherit;font-size:.86rem;line-height:1.2;min-height:44px;padding:.45rem .95rem;border-radius:999px;cursor:pointer;',
      'border:1px solid #D9C8F0;background:rgba(255,255,255,.85);color:#4E3F6B;transition:background .15s ease,border-color .15s ease;}',
      '.tol-read-aud button:hover,.tol-read-next:hover{background:#F3EEF9;}',
      '.tol-read-aud button[aria-pressed="true"]{background:#EDE4F8;border-color:#B9A0E0;color:#3B2F55;font-weight:600;}',
      '.tol-read-aud button[aria-pressed="true"]::before{content:"\\2713\\00a0";}',
      '.tol-read-src{display:inline-block;font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:.72rem;letter-spacing:.03em;padding:.2rem .6rem;border-radius:999px;',
      'background:rgba(199,235,214,.55);color:#2F5A40;border:1px solid rgba(152,210,178,.8);}',
      '.tol-read-src[data-src="pt"]{background:rgba(198,223,244,.55);color:#28506F;border-color:rgba(150,194,232,.8);}',
      '.tol-read-src[data-src="gottman"]{background:rgba(247,201,212,.5);color:#7A3346;border-color:rgba(237,163,182,.8);}',
      '.tol-read-src[data-src="gg"]{background:rgba(248,231,174,.6);color:#6B5418;border-color:rgba(239,210,122,.9);}',
      '.tol-read .tol-read-p{margin:.4rem 0 0 !important;font-size:.8rem;line-height:1.45;color:#6B5A78;}',
      '.tol-read .tol-read-p a{color:inherit;text-decoration:underline;text-decoration-color:#D9C8F0;text-underline-offset:2px;display:inline-block;padding:.15rem 0;min-height:24px;}',
      '.tol-read .tol-read-p a:hover{color:#4E3F6B;}',
      '.tol-read .tol-read-t{font-family:"Fraunces",Georgia,serif;font-weight:600;font-size:1.15rem;line-height:1.3;margin:.5rem 0 .15rem;color:var(--ink,#2B2620);overflow-wrap:anywhere;}',
      '.tol-read .tol-read-by{font-size:.86rem;color:var(--ink-soft,#5A5346);font-style:italic;}',
      '.tol-read .tol-read-s{margin-top:.35rem !important;font-size:1rem;line-height:1.55;color:var(--ink-soft,#5A5346);}',
      '.tol-read-row{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem .9rem;margin-top:.85rem;}',
      '.tol-read .tol-read-go{display:inline-flex;align-items:center;min-height:44px;font-weight:600;color:var(--ink,#2B2620);text-decoration:underline;',
      'text-decoration-color:var(--brass,#A8792F);text-underline-offset:3px;overflow-wrap:anywhere;}',
      '.tol-read .tol-read-go:hover{color:var(--brass,#A8792F);}',
      '.tol-read-body{transition:opacity .22s ease,transform .22s ease;}',
      '.tol-read-body.is-swap{opacity:0;transform:translateY(4px);}',
      '.tol-read a:focus-visible,.tol-read button:focus-visible{outline:2px solid var(--focus,#2B5B8C);outline-offset:2px;}',
      '.tol-read-note{margin:.55rem .9rem 0 !important;font-size:.8rem;line-height:1.45;color:var(--ink-soft,#5A5346);max-width:none;}',
      '.tol-read-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;}',
      '@media (max-width:560px){.tol-read{padding:1rem 1rem 1.05rem;border-radius:24px;}.tol-read-aud button{flex:1 1 auto;}}',
      '@media (prefers-reduced-motion:reduce){.tol-read-body,.tol-read-aud button,.tol-read-next{transition:none;}}',
      '@media print{.tol-read-wrap{display:none;}}'
    ].join('');
    var s = document.createElement('style');
    s.id = 'tol-read-style'; s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* ---------- the card ---------- */
  function card(opts) {
    opts = opts || {};
    injectStyle();
    var d = data(), n = ++uid;
    var state = { audience: '', item: null };  // no 'for me / with others' choice on the card: every article fits both
    if (opts.scan !== false) opts._scanned = scanPage();
    // heading: 'none' (or 0) keeps the changing article title out of the page's outline: a plain line, not a heading
    var level = opts.heading === 'none' || opts.heading === 0 ? 0 : Math.min(6, Math.max(2, parseInt(opts.heading, 10) || 3));

    var wrap = el('div', 'tol-read-wrap no-dive no-cheer');
    var box = el('section', 'tol-read');
    box.setAttribute('aria-labelledby', 'tol-read-k' + n);
    var k = el('p', 'tol-read-k', 'Something to read'); k.id = 'tol-read-k' + n;
    box.appendChild(k);

    var aud = el('div', 'tol-read-aud');
    aud.setAttribute('role', 'group'); aud.setAttribute('aria-label', 'Choose what kind of article to show');
    var bSelf = el('button', '', 'For understanding yourself'); bSelf.type = 'button'; bSelf.setAttribute('data-aud', 'self');
    var bOthers = el('button', '', 'For getting along with others'); bOthers.type = 'button'; bOthers.setAttribute('data-aud', 'others');
    aud.appendChild(bSelf); aud.appendChild(bOthers);

    var body = el('div', 'tol-read-body');
    // announced only after someone asks for another article (set on click below), never on its own
    var src = el('span', 'tol-read-src');
    var pil = el('p', 'tol-read-p');
    var title = el(level ? 'h' + level : 'p', 'tol-read-t');
    var by = el('p', 'tol-read-by');
    var sum = el('p', 'tol-read-s');
    body.appendChild(src); body.appendChild(pil); body.appendChild(title); body.appendChild(by); body.appendChild(sum);
    box.appendChild(body);

    var row = el('div', 'tol-read-row');
    var go = el('a', 'tol-read-go');
    go.target = '_blank'; go.rel = 'noopener';
    var goText = el('span'), arrow = el('span', '', ' ↗'), sr = el('span', 'tol-read-sr', ' (opens in a new tab)');
    arrow.setAttribute('aria-hidden', 'true');
    go.appendChild(goText); go.appendChild(arrow); go.appendChild(sr);
    var next = el('button', 'tol-read-next', 'Show me another'); next.type = 'button';
    next.setAttribute('aria-label', 'Show me another article');
    row.appendChild(go); row.appendChild(next);
    box.appendChild(row);

    wrap.appendChild(box);
    wrap.appendChild(el('p', 'tol-read-note', 'Articles are chosen for this program and open on the publisher’s site.'));

    function syncToggle() {
      bSelf.setAttribute('aria-pressed', state.audience === 'self' ? 'true' : 'false');
      bOthers.setAttribute('aria-pressed', state.audience === 'others' ? 'true' : 'false');
    }
    function render(it, animate) {
      if (!it) { wrap.hidden = true; return; }
      wrap.hidden = false;
      state.item = it; shown[it.id] = 1;
      var sname = d.sources[it.source] || it.source;
      function fill() {
        src.textContent = sname; src.setAttribute('data-src', it.source);
        title.textContent = it.title;
        pil.innerHTML = '';
        // the article's main pillar, linked to where the Five Pillars are explained
        var pk = (it.pillars || [])[0], pd = pk && d.pillars[pk];
        if (pd) {
          var a = el('a', '', 'Pillar ' + pk + ': ' + pd.name);
          a.href = '/five-pillars.html#' + pd.anchor;
          pil.appendChild(a);
        }
        pil.hidden = !pil.firstChild;
        by.textContent = it.author ? 'By ' + it.author : ''; by.hidden = !it.author;
        sum.textContent = it.summary || '';
        go.href = it.url; goText.textContent = 'Read on ' + sname;
        go.setAttribute('data-id', it.id);
        wrap.setAttribute('data-item', it.id);
      }
      var reduce = false;
      try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }
      if (!animate || reduce) { fill(); return; }
      body.classList.add('is-swap');
      setTimeout(function () { fill(); body.classList.remove('is-swap'); }, 180);
    }
    function another(animate) {
      var o = { topics: opts.topics, pillars: opts.pillars, page: opts.page, audience: state.audience, scan: false, _scanned: opts._scanned,
        exclude: state.item ? [state.item.id] : null };
      render(suggest(o), animate);
    }

    function onAud(which) {
      state.audience = state.audience === which ? '' : which;
      syncToggle();
      // keep the article if it already fits the new choice
      if (state.item && fitsAudience(state.item, state.audience)) return;
      another(true);
    }
    bSelf.addEventListener('click', function () { body.setAttribute('aria-live', 'polite'); onAud('self'); });
    bOthers.addEventListener('click', function () { body.setAttribute('aria-live', 'polite'); onAud('others'); });
    next.addEventListener('click', function () { body.setAttribute('aria-live', 'polite'); another(true); });
    function opened() { if (state.item) markOpened(state.item.id); }
    go.addEventListener('click', opened);
    go.addEventListener('auxclick', function (e) { if (e.button === 1) opened(); });

    syncToggle();
    another(false);
    return wrap;
  }

  function mount(target, opts) {
    var host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) return null;
    var c = card(opts);
    host.innerHTML = '';
    host.appendChild(c);
    return c;
  }

  // opened() → ids the reader has opened (this browser only); markOpened(id) adds one. Used by /reading.html.
  window.TOLReading = { card: card, suggest: suggest, mount: mount, opened: readOpened, markOpened: markOpened, _normPath: normPath, _scan: scanPage };
})();
