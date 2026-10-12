/* take-in.js — "How you take things in": an optional profile, picked on /how-you-take-things-in.html,
   that adapts every page to how someone's mind takes in information. People can pick neurotypes or
   situations (ADHD, autistic, dyslexic and more), plain preferences ("Short steps first", "One thing at a
   time"), or both. Each neurotype only switches on a visible list of preferences, and any of them can be
   unticked.

   Nothing leaves the device. Everything is kept in ONE localStorage key, 'tol-take-in' (JSON):
     { v:1, types:[...], prefs:[...], prev:{settingKey: valueBefore}, place:{path:{y,p,c,t}}, ticks:{path:[...]}, at:'YYYY-MM-DD' }
   Saving mostly PRESETS the site's existing Settings keys (tol-text-size, tol-contrast, tol-still, tol-ruler,
   tol-spacing, tol-nobubbles, tol-sound-off, tol-hide-helpers, tol-book-extras) once, at save time, so the
   Settings panel still has the last word. "Clear them all" puts every one of those back the way it was.
   On each page it adds html classes ti-<pref> and a few small, reversible helpers (see apply() below).

   Works on its own (the picker page includes it directly) or loaded by site.js on every page.
   Other tools can read the profile:
     TOLTakeIn.get()       → { types:[...], prefs:[...] } (copies) or null when nothing is chosen
     TOLTakeIn.has(pref)   → true when that preference is on ('short', 'literal', 'simple', ...)
     TOLTakeIn.wiring()    → Signal Translator wiring ids for the chosen neurotypes (['autistic','adhd'])
     TOLTakeIn.puddles()   → { brief, easy, literal } hints for Professor Puddles
     TOLTakeIn.choices     → { prefs:[{id,name,note,group}], types:[{id,name,prefs,wiring}] }
     TOLTakeIn.save(types, prefs), TOLTakeIn.reset(), TOLTakeIn.settingsFor(prefs)
   and listen for the 'tol-take-in' event on document. */
(function () {
  'use strict';
  if (window.TOLTakeIn) return;
  var KEY = 'tol-take-in', PAGE = '/how-you-take-things-in.html';
  var H = document.documentElement;
  var path = (location.pathname || '/').replace(/\/$/, '/index.html');
  var HOME = path === '/index.html';

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------------------------------------------------------------- the choices
  // group 'main': the plain preferences everyone sees first; 'more': the extra helpers the neurotypes use
  var PREFS = [
    { id: 'short', group: 'main', name: 'Short steps first', note: 'Long pages open on just the steps, with “Show the whole page” one tap away. Long side sections start folded, and the low-energy version opens where a page has one.' },
    { id: 'literal', group: 'main', name: 'Plain and literal', note: 'No hints, idioms or jokey helper lines. Plain wording where a page offers it, and the “what to do” lists open.' },
    { id: 'listen', group: 'main', name: 'Listen instead of read', note: 'The “Listen” buttons are bigger and easier to find. Your device’s own voice reads the page aloud.' },
    { id: 'big', group: 'main', name: 'Big text and calm', note: 'Extra large text and a still page.' },
    { id: 'pictures', group: 'main', name: 'Pictures and summaries', note: 'Where a page has an “In short” box, a button turns it into a picture summary.' },
    { id: 'onething', group: 'main', name: 'One thing at a time', note: 'Pages made of numbered idea cards show one card at a time, with Back, Next and “3 of 7”. “Show all at once” is always there.' },
    { id: 'notimer', group: 'main', name: 'No timers or countdowns', note: 'Countdown clocks are hidden. Breathing counts stay, because they set the pace of a breath, not a deadline.' },
    { id: 'nosurprise', group: 'main', name: 'No surprises', note: 'No pop-ups, pop-in helpers, level-up cards or offers. The page stays still.' },
    { id: 'place', group: 'main', name: 'Keep my place', note: 'Each page remembers how far down you were. Next time, a small “Carry on where you were” link near the top takes you back.' },
    { id: 'fewer', group: 'more', name: 'Fewer extras', note: 'Side boxes, reading suggestions, quizzes, music players and helpers are put away, so the main text stands alone.' },
    { id: 'readable', group: 'more', name: 'Easier-to-read text', note: 'A plain, clear font your device already has (like Verdana), roomier spacing, shorter left-aligned lines, and no italics.' },
    { id: 'ruler', group: 'more', name: 'Reading ruler', note: 'A soft band that follows your finger or pointer, so you keep your place on the line.' },
    { id: 'senses', group: 'more', name: 'Calm for the senses', note: 'A still page, site sounds off, and no bubbles or shapes behind the words.' },
    { id: 'reassure', group: 'more', name: 'Reassurance and a way out', note: 'A short line at the top of each page: nothing here is graded, there’s no rush, and a “Leave this site quickly” button. Progress counts are hidden.' },
    { id: 'expect', group: 'more', name: 'Know what’s coming', note: 'Reading pages say how long they take (minutes and words) and list their parts before you start.' },
    { id: 'checklist', group: 'more', name: 'Tick off steps', note: 'Numbered steps get tick boxes, remembered on this device, so you can see what you’ve done.' },
    { id: 'targets', group: 'more', name: 'Bigger buttons', note: 'Buttons, form boxes and links in lists get larger and roomier, so they’re easier to tap.' },
    { id: 'contrast', group: 'more', name: 'Largest text and high contrast', note: 'The largest text size, with black on white (white on black in dark mode).' },
    { id: 'simple', group: 'more', name: 'Simpler English', note: 'On the Ask page, a tip shows how to get Professor Puddles to answer in short, everyday words.' }
  ];
  // wiring: the Signal Translator's own ids, for "how it may land on me"
  var TYPES = [
    { id: 'adhd', name: 'ADHD', prefs: ['short', 'onething', 'place', 'fewer'], wiring: ['adhd'] },
    { id: 'autistic', name: 'Autistic', prefs: ['literal', 'nosurprise', 'senses', 'expect'], wiring: ['autistic'] },
    { id: 'dyslexic', name: 'Dyslexic', prefs: ['readable', 'ruler', 'listen'], wiring: ['dyslexic'] },
    { id: 'dyspraxic', name: 'Dyspraxic (DCD)', prefs: ['targets', 'readable', 'place'], wiring: ['dyspraxic'] },
    { id: 'anxiety', name: 'Anxiety or OCD', prefs: ['notimer', 'reassure', 'nosurprise'], wiring: ['anxiety'] },
    { id: 'sensory', name: 'Sensory sensitivity', prefs: ['senses', 'nosurprise'], wiring: ['hsp'] },
    { id: 'lowenergy', name: 'Low energy or chronic illness', prefs: ['short', 'fewer'], wiring: [] },
    { id: 'memory', name: 'Brain injury or memory difficulties', prefs: ['place', 'checklist'], wiring: [] },
    { id: 'esl', name: 'English isn’t my first language', prefs: ['literal', 'listen', 'simple'], wiring: [] },
    { id: 'lowvision', name: 'Older eyes or low vision', prefs: ['contrast', 'targets'], wiring: [] }
  ];
  var PREF_IDS = PREFS.map(function (p) { return p.id; }), TYPE_IDS = TYPES.map(function (t) { return t.id; });
  function prefById(id) { for (var i = 0; i < PREFS.length; i++) if (PREFS[i].id === id) return PREFS[i]; return null; }
  function typeById(id) { for (var i = 0; i < TYPES.length; i++) if (TYPES[i].id === id) return TYPES[i]; return null; }

  // ---------------------------------------------------------------- storage (one key)
  function read() {
    var v = null; try { v = JSON.parse(lsGet(KEY) || 'null'); } catch (e) { v = null; }
    if (!v || typeof v !== 'object') return null;
    v.types = (Array.isArray(v.types) ? v.types : []).filter(function (t) { return TYPE_IDS.indexOf(t) !== -1; });
    v.prefs = (Array.isArray(v.prefs) ? v.prefs : []).filter(function (p) { return PREF_IDS.indexOf(p) !== -1; });
    v.prev = v.prev && typeof v.prev === 'object' ? v.prev : {};
    v.place = v.place && typeof v.place === 'object' ? v.place : {};
    v.ticks = v.ticks && typeof v.ticks === 'object' ? v.ticks : {};
    return v;
  }
  function write(v) { lsSet(KEY, JSON.stringify(v)); }
  var prof = read();
  var ON = {};
  (prof ? prof.prefs : []).forEach(function (p) { ON[p] = 1; });
  function has(p) { return !!ON[p]; }

  // ---------------------------------------------------------------- the site's own Settings keys each preference presets
  var SOUND_KEYS = ['tol-pc-sound', 'tol-pc-music', 'tol-qw-sound', 'tol-xw-sound', 'tol-bloom-sound'];
  // → { key: value } (null = remove the key)
  function settingsFor(prefs) {
    var s = {}, on = {}; prefs.forEach(function (p) { on[p] = 1; });
    if (on.readable) s['tol-spacing'] = 'wide';
    if (on.ruler) s['tol-ruler'] = '1';
    if (on.senses) { s['tol-still'] = '1'; s['tol-sound-off'] = '1'; s['tol-nobubbles'] = '1'; SOUND_KEYS.forEach(function (k) { s[k] = 'off'; }); }
    if (on.big) { s['tol-text-size'] = 'xl'; s['tol-still'] = '1'; }
    if (on.contrast) { s['tol-contrast'] = '1'; s['tol-text-size'] = 'xxl'; }
    if (on.nosurprise) { s['tol-hide-helpers'] = '1'; s['tol-still'] = '1'; }
    if (on.fewer) { s['tol-hide-helpers'] = '1'; s['tol-book-extras'] = null; }
    return s;
  }
  var SETTING_NAMES = {
    'tol-spacing': ['Spacing', { wide: 'Roomy' }], 'tol-ruler': ['Reading ruler', { 1: 'On' }],
    'tol-still': ['Keep the page still', { 1: 'On' }], 'tol-sound-off': ['Keep site sounds off', { 1: 'On' }],
    'tol-nobubbles': ['Text bubbles', { 1: 'Off' }], 'tol-text-size': ['Text size', { xl: 'Extra large', xxl: 'Largest' }],
    'tol-contrast': ['High contrast', { 1: 'On' }], 'tol-hide-helpers': ['Hide the helpers', { 1: 'On' }],
    'tol-book-extras': ['Book extras', { '': 'Hidden (just the text)' }]
  };

  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function emit() { try { document.dispatchEvent(new CustomEvent('tol-take-in', { detail: api.get() })); } catch (e) {} }

  // Save: presets the Settings keys once (remembering what was there before), then the classes.
  function save(types, prefs) {
    types = (types || []).filter(function (t) { return TYPE_IDS.indexOf(t) !== -1; });
    prefs = (prefs || []).filter(function (p, i, a) { return PREF_IDS.indexOf(p) !== -1 && a.indexOf(p) === i; });
    if (!prefs.length && !types.length) { reset(); return; }
    var v = read() || { v: 1, prev: {}, place: {}, ticks: {} };
    var want = settingsFor(prefs);
    Object.keys(want).forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(v.prev, k)) v.prev[k] = lsGet(k);
      if (want[k] == null) lsDel(k); else lsSet(k, want[k]);
    });
    // a key no preference wants any more goes back to what it was before
    Object.keys(v.prev).forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(want, k)) return;
      if (v.prev[k] == null) lsDel(k); else lsSet(k, v.prev[k]);
      delete v.prev[k];
    });
    if (!prefs.length || prefs.indexOf('place') === -1) v.place = {};
    if (prefs.indexOf('checklist') === -1) v.ticks = {};
    v.v = 1; v.types = types; v.prefs = prefs; v.at = today();
    write(v);
    // someone who has chosen how pages should look doesn't need the "Would a calmer page help?" offer too
    lsSet('tol-comfort-offer', 'done');
    prof = read(); ON = {}; prefs.forEach(function (p) { ON[p] = 1; });
    classes(); emit();
  }
  // Clear: every Settings key goes back to what it was, and the one key is removed
  function reset() {
    var v = read();
    if (v) Object.keys(v.prev).forEach(function (k) { if (v.prev[k] == null) lsDel(k); else lsSet(k, v.prev[k]); });
    lsDel(KEY); prof = null; ON = {};
    classes(); emit();
  }

  // ---------------------------------------------------------------- html classes (CSS in take-in.css)
  function classes() {
    PREF_IDS.forEach(function (p) { H.classList.toggle('ti-' + p, !!ON[p]); });
    H.classList.toggle('ti-on', Object.keys(ON).length > 0);
  }
  classes();
  function linkCss() {
    if (document.querySelector('link[href$="/take-in.css"]')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/assets/css/take-in.css';
    (document.head || H).appendChild(l);
  }
  if (Object.keys(ON).length || path === PAGE) linkCss();

  // ---------------------------------------------------------------- page helpers
  function main() { return document.querySelector('main'); }
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html != null) n.innerHTML = html;
    return n;
  }
  // our own lines stay through "Show me only the steps", never get a bubble or a buddy, and aren't read aloud as page text
  var OWN = 'no-bubble no-cheer no-listen';
  function topSlot() {
    var m = main(); if (!m) return null;
    var box = m.querySelector(':scope > .ti-top');
    if (box) return box;
    box = el('div', { class: 'ti-top ' + OWN, 'data-keep-steps': '' });
    var head = m.querySelector(':scope > .read-head, :scope > header');
    if (head) head.after(box); else m.insertBefore(box, m.firstChild);
    return box;
  }
  function busyPage() { return !!(document.body && (document.body.classList.contains('is-game') || document.body.hasAttribute('data-no-take-in'))); }
  // the nearest match from n up to (not past) main: html and body carry tol- classes too
  function within(n, sel) { for (var x = n; x && x.tagName !== 'MAIN' && x !== document.body; x = x.parentElement) if (x.matches && x.matches(sel)) return x; return null; }
  function inOwn(n) { return !!(n.closest && n.closest('.ti-prev, .ti-top, nav, .tol-bar, .tol-panel, .tol-set, .tol-foot, footer')); }

  // ---- Short steps first: turn on "Show me only the steps" (in-short.js) and the low-energy version where a page has them
  var shortDone = false, foldsDone = false;
  function shortSteps() {
    if (!has('short') || shortDone) return;
    var b = document.querySelector('main .tol-steps-toggle button'), low = document.getElementById('il-low');
    if (low && low.getAttribute('aria-pressed') !== 'true') { low.click(); shortDone = true; }
    else if (b && b.getAttribute('aria-pressed') !== 'true') { b.click(); shortDone = true; }
  }
  // no steps switch on this page: long side sections that already fold start folded (unless a link points inside one)
  function shortFolds() {
    if (!has('short') || foldsDone || shortDone || HOME) return;
    foldsDone = true;
    var tgt = location.hash && safeTarget(location.hash);
    Array.prototype.forEach.call(document.querySelectorAll('main details.pg-fold[open]'), function (d) {
      if (tgt && d.contains(tgt)) return;
      if ((d.textContent || '').split(/\s+/).length < 120) return;
      d.open = false; d.setAttribute('data-ti-folded', '');
    });
  }
  // fold only once it's known there's no steps switch coming: in-short.js has run, or site.js didn't load it
  function foldsWhenKnown(last) {
    if (!has('short') || foldsDone || shortDone) return;
    var isc = document.querySelector('script[src$="/in-short.js"]');
    if (window.TOLInShort || last || (!isc && window.TOLSettings)) { shortSteps(); shortFolds(); }
  }
  function safeTarget(h) { try { return document.getElementById(decodeURIComponent(h.slice(1))); } catch (e) { return null; } }

  // ---- Plain and literal: [data-literal] alternatives replace the figure of speech; "what to do" lists open
  function literal() {
    if (!has('literal')) return;
    Array.prototype.forEach.call(document.querySelectorAll('main [data-literal]:not([data-ti-lit])'), function (n) {
      if (inOwn(n) && !n.closest('.ti-prev')) return;
      n.setAttribute('data-ti-lit', ''); n.setAttribute('data-ti-orig', n.textContent);
      n.textContent = n.getAttribute('data-literal');
    });
    Array.prototype.forEach.call(document.querySelectorAll('main details:not([open]):not([data-ti-opened])'), function (d) {
      var s = d.querySelector('summary'); if (!s) return;
      if (/what to do|steps|in short|words (you could|to) (use|say)|try this|say it/i.test(s.textContent || '')) { d.open = true; d.setAttribute('data-ti-opened', ''); }
    });
  }

  // ---- One thing at a time: numbered idea cards (ol.ideas) one at a time, never out of reach
  var oneLists = [];
  function oneThing() {
    if (!has('onething') || HOME) return;
    Array.prototype.forEach.call(document.querySelectorAll('main ol.ideas:not([data-ti-one])'), function (ol) {
      if (inOwn(ol)) return;
      var items = Array.prototype.filter.call(ol.children, function (c) { return c.tagName === 'LI'; });
      if (items.length < 3) return;
      ol.setAttribute('data-ti-one', '');
      var L = { ol: ol, items: items, i: 0, all: false };
      var top = el('p', { class: 'ti-one-top ' + OWN, 'data-keep-steps': '' }),
          nav = el('div', { class: 'ti-one-nav ' + OWN, 'data-keep-steps': '', role: 'group', 'aria-label': 'Move between the parts' });
      top.innerHTML = '<span class="ti-one-count" aria-live="polite"></span> <button type="button" class="ti-one-all">Show all at once</button>';
      nav.innerHTML = '<button type="button" class="ti-one-back">Back</button><span class="ti-one-count"></span><button type="button" class="ti-one-next">Next</button>';
      ol.before(top); ol.after(nav);
      L.top = top; L.nav = nav;
      top.querySelector('.ti-one-all').addEventListener('click', function () { setAll(L, !L.all); });
      nav.querySelector('.ti-one-back').addEventListener('click', function () { show(L, L.i - 1, true); });
      nav.querySelector('.ti-one-next').addEventListener('click', function () { show(L, L.i + 1, true); });
      oneLists.push(L);
      var tgt = location.hash && safeTarget(location.hash), start = 0;
      items.forEach(function (li, j) { if (tgt && li.contains(tgt)) start = j; });
      show(L, start, false);
    });
  }
  function show(L, i, move) {
    L.i = Math.max(0, Math.min(L.items.length - 1, i));
    L.ol.classList.toggle('ti-one', !L.all);
    // the hidden cards don't count, so the one showing keeps its own number (01, 02, ...)
    L.items.forEach(function (li, j) { var off = !L.all && j !== L.i; li.classList.toggle('ti-one-off', off); li.style.counterSet = L.all ? '' : 'idea ' + (j + 1); });
    var label = L.all ? 'All ' + L.items.length + ' parts' : 'Part ' + (L.i + 1) + ' of ' + L.items.length;
    Array.prototype.forEach.call(L.top.querySelectorAll('.ti-one-count'), function (c) { c.textContent = label; });
    Array.prototype.forEach.call(L.nav.querySelectorAll('.ti-one-count'), function (c) { c.textContent = label; });
    L.nav.hidden = L.all;
    var back = L.nav.querySelector('.ti-one-back'), next = L.nav.querySelector('.ti-one-next');
    back.disabled = L.i === 0; next.disabled = L.i === L.items.length - 1;
    // the last card says where the page carries on, so the end is never a dead end
    next.textContent = L.i === L.items.length - 1 ? 'That’s all ' + L.items.length : 'Next';
    if (move && !L.all) {
      var li = L.items[L.i], h = li.querySelector('h2, h3, h4') || li;
      if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
      try { h.focus({ preventScroll: true }); } catch (e) {}
      var r = L.top.getBoundingClientRect();
      if (r.top < 0 || r.top > window.innerHeight * 0.6) L.top.scrollIntoView({ block: 'start' });
      notePlace();
    }
  }
  function setAll(L, all) {
    L.all = all; L.top.querySelector('.ti-one-all').textContent = all ? 'One at a time' : 'Show all at once';
    show(L, L.i, false);
  }
  // a link to a part inside a hidden card (the chapter bar, a contents list, Back from another page) opens that card
  function revealFor(tgt) {
    oneLists.forEach(function (L) { L.items.forEach(function (li, j) { if (li.contains(tgt) && li.classList.contains('ti-one-off')) show(L, j, false); }); });
  }
  window.addEventListener('hashchange', function () { var t = location.hash && safeTarget(location.hash); if (t) revealFor(t); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="#"]'); if (!a || !oneLists.length) return;
    var u; try { u = new URL(a.href, location.href); } catch (er) { return; }
    if (u.pathname.replace(/\/$/, '/index.html') !== path || !u.hash) return;
    var t = safeTarget(u.hash); if (t) revealFor(t);
  }, true);
  // printing shows every card
  window.addEventListener('beforeprint', function () { H.classList.add('ti-printing'); });
  window.addEventListener('afterprint', function () { H.classList.remove('ti-printing'); });

  // ---- Keep my place: how far down each page you were, and a small link back (never on the home page)
  var placeT = 0;
  function notePlace() {
    if (!has('place') || HOME) return;
    clearTimeout(placeT);
    placeT = setTimeout(function () {
      var v = read(); if (!v || v.prefs.indexOf('place') === -1) return;
      var dh = Math.max(1, document.documentElement.scrollHeight - window.innerHeight), y = Math.round(window.scrollY || 0);
      var card = 0; oneLists.forEach(function (L) { if (!L.all) card = L.i; });
      v.place[path] = { y: y, p: Math.round(100 * y / dh), c: card, t: Date.now() };
      // only the forty most recent pages are kept
      var ks = Object.keys(v.place).sort(function (a, b) { return (v.place[b].t || 0) - (v.place[a].t || 0); });
      ks.slice(40).forEach(function (k) { delete v.place[k]; });
      write(v);
    }, 700);
  }
  function placeLink() {
    if (!has('place') || HOME || location.hash || path === PAGE) return;
    var at = prof && prof.place && prof.place[path];
    if (!at || Date.now() - (at.t || 0) > 1000 * 60 * 60 * 24 * 60) return;
    var card = at.c > 0 && oneLists.length ? at.c : 0;
    if (!card && (at.y < 700 || at.p < 8)) return;
    var slot = topSlot(); if (!slot) return;
    var p = el('p', { class: 'ti-place' });
    p.innerHTML = '<a href="#" class="ti-place-go">' + (card ? 'Carry on from part ' + (card + 1) : 'Carry on where you were') + '</a> <small>' +
      (card ? '' : '(about ' + Math.min(99, at.p) + '% of the way down)') + '</small>';
    p.querySelector('a').addEventListener('click', function (e) {
      e.preventDefault();
      if (card) { oneLists.forEach(function (L) { if (!L.all) show(L, card, true); }); }
      else {
        var dh = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo({ top: Math.min(at.y, Math.round(dh * at.p / 100) || at.y), behavior: 'auto' });
      }
      p.remove();
    });
    slot.appendChild(p);
  }

  // ---- Tick off steps: tick boxes on numbered steps, kept on this device
  function checklist() {
    if (!has('checklist') || HOME) return;
    var lists = Array.prototype.filter.call(document.querySelectorAll('main ol:not(.ideas):not([data-ti-ticks])'), function (ol) {
      if (inOwn(ol) || within(ol, '[class*="tol-"], form, [role="tablist"]')) return false;
      var li = Array.prototype.filter.call(ol.children, function (c) { return c.tagName === 'LI'; });
      if (li.length < 2 || li.length > 15) return false;
      // a list of links (a contents list) isn't a list of steps
      var linky = li.filter(function (x) { var a = x.querySelector('a'); return a && (a.textContent || '').trim().length >= (x.textContent || '').trim().length - 4; }).length;
      return linky < li.length / 2;
    });
    var v = read(), done = (v && v.ticks[path]) || [];
    lists.forEach(function (ol, li0) {
      ol.setAttribute('data-ti-ticks', ''); ol.classList.add('ti-ticked');
      Array.prototype.forEach.call(ol.children, function (li, j) {
        if (li.tagName !== 'LI') return;
        var id = li0 + '.' + j, words = (li.textContent || '').trim().split(/\s+/).slice(0, 6).join(' ');
        var b = el('input', { type: 'checkbox', class: 'ti-tick', 'aria-label': 'Done: ' + words });
        b.checked = done.indexOf(id) !== -1; li.classList.toggle('ti-done', b.checked);
        b.addEventListener('change', function () {
          var w = read(); if (!w) return;
          var list = w.ticks[path] || [];
          list = list.filter(function (x) { return x !== id; }); if (b.checked) list.push(id);
          if (list.length) w.ticks[path] = list; else delete w.ticks[path];
          var ks = Object.keys(w.ticks); if (ks.length > 40) delete w.ticks[ks[0]];
          write(w); li.classList.toggle('ti-done', b.checked);
        });
        li.insertBefore(b, li.firstChild);
      });
    });
  }

  // ---- Pictures and summaries: the "In short" box as a picture (Professor Puddles' poster maker, or a plain card)
  function inShortBox() {
    return Array.prototype.filter.call(document.querySelectorAll('main .tol-inshort, main [data-in-short]'), function (n) { return !inOwn(n) && n.querySelector('li'); })[0] || null;
  }
  function pictures() {
    if (!has('pictures') || HOME) return;
    var box = inShortBox(); if (!box || box.hasAttribute('data-ti-pic')) return;
    box.setAttribute('data-ti-pic', '');
    var items = Array.prototype.map.call(box.querySelectorAll('li'), function (li) { return (li.textContent || '').replace(/\s+/g, ' ').trim(); }).filter(Boolean).slice(0, 6);
    var row = el('div', { class: 'ti-pic ' + OWN, 'data-keep-steps': '' });
    row.innerHTML = '<button type="button" class="ti-pic-go" aria-expanded="false">Show this as a picture</button><div class="ti-pic-host" hidden></div>';
    box.after(row);
    var btn = row.querySelector('button'), host = row.querySelector('.ti-pic-host'), made = false;
    btn.addEventListener('click', function () {
      var open = host.hidden;
      host.hidden = !open; btn.setAttribute('aria-expanded', String(open)); btn.textContent = open ? 'Hide the picture' : 'Show this as a picture';
      if (open && !made) { made = true; drawPicture(host, items); }
    });
  }
  function pageTitle() { var h = document.querySelector('main h1'); return ((h && h.textContent) || document.title || '').replace(/\s+/g, ' ').trim().split(/[:|]/)[0].slice(0, 70); }
  function drawPicture(host, items) {
    var spec = { layout: 'checklist', marker: 'number', kicker: 'In short', title: pageTitle(), items: items.map(function (t) { return { text: t }; }), source: path };
    function plain() {
      host.innerHTML = '<figure class="ti-piccard"><figcaption><span>In short</span>' + esc(spec.title) + '</figcaption><ol>' +
        items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol></figure>';
    }
    function poster() {
      try { window.TOLInfographic.mount(host, spec); } catch (e) { plain(); }
    }
    if (window.TOLInfographic && window.TOLInfographic.mount) { poster(); return; }
    host.innerHTML = '<p class="ti-pic-wait">Drawing the picture…</p>';
    var s = document.createElement('script'); s.src = '/assets/js/puddles-infographic.js';
    s.onload = function () { host.innerHTML = ''; if (window.TOLInfographic && window.TOLInfographic.mount) poster(); else plain(); };
    s.onerror = function () { host.innerHTML = ''; plain(); };
    document.head.appendChild(s);
  }

  // ---- Reassurance and a way out
  function reassure() {
    if (!has('reassure') || HOME || path === PAGE) return;
    var m = main(); if (!m) return;
    var slot = topSlot(); if (!slot || slot.querySelector('.ti-calm')) return;
    var txt = (m.textContent || '');
    var privateToo = /(stays?|kept|saved) (only )?(on|in) (this|your) (device|browser|phone)|never leaves|nothing you type (leaves|is sent)|leaves your device/i.test(txt);
    var hasExit = !!m.querySelector('[data-tol-exit]');
    var p = el('p', { class: 'ti-calm' });
    p.innerHTML = '<span>Nothing here is graded. There’s no right answer and no rush, and you can stop at any point.' + (privateToo ? ' What you type stays on this device.' : '') + '</span>' +
      (hasExit ? '' : ' <button type="button" data-tol-exit class="ti-exit">Leave this site quickly</button>');
    slot.appendChild(p);
  }

  // ---- Know what's coming: minutes and words, and the parts of the page
  function expect() {
    if (!has('expect') || HOME || path === PAGE) return;
    var m = main(); if (!m || !document.querySelector('main.read, body.tol-deep main')) return;
    // tools (something to fill in) don't get a reading time
    if (m.querySelectorAll('textarea, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select').length > 1) return;
    var slot = topSlot(); if (!slot || slot.querySelector('.ti-expect')) return;
    var clone = m.cloneNode(true);
    Array.prototype.forEach.call(clone.querySelectorAll('nav, script, style, .ti-top, .tol-pud-card, .tol-cheer, .lp-card, .tol-read-host, .tol-fp-note, .tol-offer, [aria-hidden="true"], .sr-only, details:not([open]) > :not(summary)'), function (n) { n.remove(); });
    var words = (clone.textContent || '').split(/\s+/).filter(Boolean).length;
    if (words < 250) return;
    var mins = Math.max(1, Math.round(words / 200));
    var hs = Array.prototype.filter.call(m.querySelectorAll('h2'), function (h) { return !inOwn(h) && !h.closest('.tol-pud-card, .lp-card, .tol-read-host, .tol-fp-note, aside') && (h.textContent || '').trim(); });
    var p = el('div', { class: 'ti-expect' });
    p.innerHTML = '<p><strong>About ' + mins + (mins === 1 ? ' minute' : ' minutes') + ' to read</strong> (' + words.toLocaleString('en-US') + ' words' +
      (hs.length ? ', in ' + hs.length + (hs.length === 1 ? ' part' : ' parts') : '') + '). You can stop and come back any time.</p>' +
      (hs.length > 1 ? '<details><summary>What’s on this page</summary><ol>' + hs.map(function (h) {
        var t = esc((h.textContent || '').replace(/\s+/g, ' ').trim());
        return '<li>' + (h.id ? '<a href="#' + esc(h.id) + '">' + t + '</a>' : t) + '</li>';
      }).join('') + '</ol></details>' : '');
    slot.appendChild(p);
  }

  // ---- No timers: a calm line in place of the Quick checks pause clock
  function noTimer() {
    if (!has('notimer')) return;
    var pc = document.getElementById('pause-clock');
    if (pc && !(pc.nextElementSibling && pc.nextElementSibling.classList.contains('ti-notimer-note'))) {
      pc.after(el('p', { class: 'ti-notimer-note' }, 'Your pause is running. Take the time you need; there’s no clock to watch.'));
    }
  }

  // ---- Simpler English (and plain and literal): a tip on the Ask page
  function askHint() {
    if (!(has('simple') || has('literal')) || path !== '/ask.html') return;
    var chat = document.getElementById('ask-chat'); if (!chat || document.querySelector('.ti-hint')) return;
    chat.before(el('p', { class: 'ti-hint ' + OWN }, has('simple')
      ? 'Tip: type <strong>simple English</strong> and Professor Puddles answers in short sentences and everyday words from then on. Type <strong>shorter</strong> for a shorter answer.'
      : 'Tip: type <strong>shorter</strong> for a shorter, plainer answer, or <strong>simple English</strong> for everyday words.'));
  }

  // ---------------------------------------------------------------- run on the page
  function apply() {
    if (!Object.keys(ON).length || busyPage() || path === PAGE) return;
    literal(); shortSteps(); oneThing(); checklist(); pictures(); reassure(); expect(); noTimer(); askHint();
  }
  function start() {
    // the picker page shows the look (the classes) but none of the page changes, so it stays whole while choosing
    if (!Object.keys(ON).length || busyPage() || path === PAGE) return;
    apply();
    placeLink();
    // some parts arrive a moment later (the "In short" box and the steps switch from in-short.js, the Listen buttons)
    [150, 400, 1200, 2500, 4500].forEach(function (ms) { setTimeout(function () { apply(); foldsWhenKnown(ms >= 4500); }, ms); });
    if (has('place') && !HOME) {
      window.addEventListener('scroll', notePlace, { passive: true });
      window.addEventListener('pagehide', function () { clearTimeout(placeT); placeT = 0; notePlaceNow(); });
    }
  }
  function notePlaceNow() {
    var v = read(); if (!v || v.prefs.indexOf('place') === -1) return;
    var dh = Math.max(1, document.documentElement.scrollHeight - window.innerHeight), y = Math.round(window.scrollY || 0);
    var card = 0; oneLists.forEach(function (L) { if (!L.all) card = L.i; });
    v.place[path] = { y: y, p: Math.round(100 * y / dh), c: card, t: Date.now() }; write(v);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  // ---------------------------------------------------------------- for other tools
  var api = window.TOLTakeIn = {
    version: 1,
    key: KEY,
    page: PAGE,
    get: function () { return prof && (prof.prefs.length || prof.types.length) ? { types: prof.types.slice(), prefs: prof.prefs.slice() } : null; },
    has: has,
    types: function () { return prof ? prof.types.slice() : []; },
    prefs: function () { return Object.keys(ON); },
    wiring: function () {
      var out = []; (prof ? prof.types : []).forEach(function (t) { (typeById(t) || { wiring: [] }).wiring.forEach(function (w) { if (out.indexOf(w) === -1) out.push(w); }); });
      return out.slice(0, 3);
    },
    puddles: function () { return { brief: has('short') || has('literal') || has('simple'), easy: has('simple'), literal: has('literal') }; },
    choices: { prefs: PREFS.map(function (p) { return { id: p.id, name: p.name, note: p.note, group: p.group }; }), types: TYPES.map(function (t) { return { id: t.id, name: t.name, prefs: t.prefs.slice(), wiring: t.wiring.slice() }; }) },
    settingsFor: settingsFor,
    settingNames: SETTING_NAMES,
    save: save,
    reset: reset,
    apply: apply
  };
})();
