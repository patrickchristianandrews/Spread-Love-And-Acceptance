/* game-fullscreen.js: one shared full screen for every game on the site (window.TOLFull).
   - TOLFull.enter(el, { name }) makes a game container fill the screen with the Fullscreen API and, when the browser
     has none (iPhone Safari) or refuses, with a fixed "immersive" overlay that covers the site bar and helpers.
   - A big "✕ Exit" button sits in a reserved strip at the top right (48px+, always on top, never covered by the game).
     Esc exits, and so does the browser's Back button or gesture (a history state is pushed on entry).
   - Exiting puts the game back in the page exactly where it was: same scroll position, same state. A game that wants
     to pause listens for the "tol-fullscreen" event on document ({ detail: { active, mode, el } }).
   - Pages register their game below (PAGES), so each HTML page only needs this one script tag. Games without a Start
     button get a small "Play" card on top of the board; pressing it goes full screen.
   - No sounds, no animation (so Quiet mode and reduced motion are respected by default). Nothing is stored. */
(function () {
  'use strict';
  var D = document, W = window, H = D.documentElement;
  var BAR = 52;                                  // px: the reserved top strip that holds the Exit button
  var cur = null;                                // { el, mode, ph, y, name, inerts, pushed, hadGaming }
  var popping = false, kickT = [];

  /* ---------- the games on this site (path without .html) ---------- */
  var PAGES = {
    '/frequency-journey': { sel: '#ar-stage', name: 'Tidbit and Sugarfoot’s Arcade', manual: true },   // arcade.js calls TOLFull.enter on Start
    '/word-bloom': { sel: '#wb', name: 'Word Bloom', gate: true },
    '/quiet-words': { sel: '#qw', name: 'Quiet Words', gate: true },
    '/quiet-crossword': { sel: '#xw', name: 'Quiet Crossword', gate: true },
    '/daily-ledger-crossword': { sel: '#xw', name: 'The Daily Ledger Crossword', gate: true },
    '/recheck-drive': { sel: '#rd', name: 'The Re-check Drive', start: '#rd-start' },
    '/coin-pusher': { wrap: ['.cp-machine', '#cp-celebrate'], name: 'Kindness Coin Pusher', gate: true },
    '/bears-dojo': { wrap: ['.bd-bar', '#bd-inside'], name: 'The Bears Dojo', gate: true }
  };

  /* ---------- styles (inline, so no stylesheet link is needed) ---------- */
  var CSS = [
    ':root{--tol-fs-bar:' + BAR + 'px}',
    '.tol-fs-bar,.tol-fs-gate{display:none}',
    /* the full screen container */
    '.tol-fs-on{position:fixed!important;top:0!important;left:0!important;right:0!important;bottom:0!important;width:auto!important;height:auto!important;max-width:none!important;max-height:none!important;margin:0!important;border-radius:0!important;border:0!important;box-sizing:border-box!important;z-index:2147483000!important;overflow:auto!important;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;background-color:var(--tol-fs-bg,var(--paper,#F5EFDE))!important;color:var(--tol-fs-ink,var(--ink,#2B2620));padding:calc(var(--tol-fs-bar) + env(safe-area-inset-top,0px) + 6px) calc(env(safe-area-inset-right,0px) + 10px) calc(env(safe-area-inset-bottom,0px) + 10px) calc(env(safe-area-inset-left,0px) + 10px)!important}',
    '.tol-fs-on:focus{outline:none}',
    'html.tol-fs-lock,html.tol-fs-lock body{overflow:hidden!important}',
    'html.tol-fs-lock .tol-bar,html.tol-fs-lock .tol-bar *{visibility:hidden!important}',
    'html.tol-fs-lock body>*:not(.tol-fs-ph):not(script):not(style):not(:has(.tol-fs-on)){visibility:hidden!important}',
    '.tol-fs-on .gm-switch,.tol-fs-on .tol-fs-hide{display:none!important}',
    '.tol-fs-on>.tol-fs-bar{display:flex;position:fixed;top:0;left:0;right:0;z-index:2147483600;box-sizing:border-box;height:calc(var(--tol-fs-bar) + env(safe-area-inset-top,0px));padding:env(safe-area-inset-top,0px) calc(env(safe-area-inset-right,0px) + 8px) 0 calc(env(safe-area-inset-left,0px) + 14px);align-items:center;justify-content:space-between;gap:.6rem;background:#1E1B24;color:#fff;box-shadow:0 2px 10px rgba(0,0,0,.35);font:600 .95rem/1.2 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}',
    '.tol-fs-bar .tol-fs-title{color:#fff;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.92}',
    '.tol-fs-bar .tol-fs-exit{flex:none;min-width:104px;min-height:48px;padding:.35rem 1.2rem!important;margin:0!important;border-radius:999px!important;border:3px solid #fff!important;background:#FFD84D!important;color:#1E1B24!important;box-shadow:none!important;text-shadow:none!important;opacity:1!important;filter:none!important;font:800 1.1rem/1 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;letter-spacing:.01em;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}',
    '.tol-fs-bar .tol-fs-exit:hover{background:#FFE98C!important}',
    '.tol-fs-bar .tol-fs-exit:focus-visible{outline:3px solid #fff;outline-offset:3px}',
    '.tol-fs-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
    /* the small "Full screen" row that shows in the page (not in full screen) */
    '.tol-fs-row{display:flex;justify-content:flex-end;margin:0 0 .4rem;grid-column:1/-1}',
    '.tol-fs-on .tol-fs-row,.tol-fs-gated>.tol-fs-row{display:none!important}',
    '.tol-fs-row .tol-fs-open{min-height:44px;padding:.35rem 1rem!important;margin:0!important;border-radius:999px!important;border:2px solid var(--brass,#A8792F)!important;background:var(--tol-fs-bg,var(--paper,#F5EFDE))!important;color:var(--tol-fs-ink,var(--ink,#2B2620))!important;font:700 .95rem/1 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;cursor:pointer;touch-action:manipulation}',
    '.tol-fs-row .tol-fs-open:focus-visible{outline:3px solid var(--focus,#2B5B8C);outline-offset:2px}',
    /* the Play card laid over a board that has no Start button */
    '.tol-fs-gated{position:relative!important;min-height:min(78vh,540px)}',
    '.tol-fs-gated>.tol-fs-gate{display:flex;position:absolute;inset:0;z-index:30;align-items:center;justify-content:center;padding:1rem;background:rgba(245,239,222,.9);background:color-mix(in srgb,var(--tol-fs-bg,var(--paper,#F5EFDE)) 90%,transparent);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);border-radius:inherit}',
    '.tol-fs-gate-card{max-width:26rem;text-align:center;padding:1.3rem 1.2rem;border-radius:18px;background:var(--tol-fs-bg,var(--paper,#F5EFDE));color:var(--tol-fs-ink,var(--ink,#2B2620));border:2px solid var(--brass,#A8792F);box-shadow:0 8px 28px rgba(0,0,0,.18)}',
    '.tol-fs-gate-t{margin:0 0 .35rem;font:800 1.45rem/1.2 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}',
    '.tol-fs-gate-p{margin:0 0 1rem;font:500 1rem/1.45 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}',
    '.tol-fs-gate .tol-fs-play{min-height:56px;min-width:12rem;padding:.6rem 1.8rem!important;margin:0!important;border-radius:999px!important;border:3px solid var(--ink,#2B2620)!important;background:#FFD84D!important;color:#1E1B24!important;font:800 1.25rem/1 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;cursor:pointer;touch-action:manipulation}',
    '.tol-fs-gate .tol-fs-play:focus-visible{outline:3px solid var(--focus,#2B5B8C);outline-offset:3px}',
    '@media (max-height:460px){.tol-fs-gate-card{padding:.8rem 1rem}.tol-fs-gate-p{margin-bottom:.6rem}}'
  ].join('\n');
  function addCSS() {
    if (D.getElementById('tol-fs-css')) return;
    var s = D.createElement('style'); s.id = 'tol-fs-css'; s.textContent = CSS; (D.head || H).appendChild(s);
  }

  /* ---------- small helpers ---------- */
  function el_(tag, cls, txt) { var e = D.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function nativeFn(el) { return el.requestFullscreen || el.webkitRequestFullscreen || null; }
  function nativeEl() { return D.fullscreenElement || D.webkitFullscreenElement || null; }
  function nativeExit() { var f = D.exitFullscreen || D.webkitExitFullscreen; if (f && nativeEl()) { try { var p = f.call(D); if (p && p.catch) p.catch(function () { /* already out */ }); } catch (e) { /* ignore */ } } }
  // tell the game its box changed: games listen for resize / orientationchange and refit their canvas
  function kick() {
    kickT.forEach(clearTimeout); kickT = [];
    [0, 60, 250, 700].forEach(function (ms) { kickT.push(setTimeout(function () { try { W.dispatchEvent(new Event('resize')); } catch (e) { /* ignore */ } }, ms)); });
  }
  // the page's own colors (a game page can be dark on its own): the full screen box and the Play card use them, so text stays readable
  function pageColors(el) {
    var bg = '', n = el, c;
    while (n && n.nodeType === 1) { c = getComputedStyle(n).backgroundColor; var m = c && c.match(/rgba?\(([^)]*)\)/), al = m ? (m[1].split(',')[3] == null ? 1 : parseFloat(m[1].split(',')[3])) : 0; if (m && al >= 0.95) { bg = c; break; } n = n.parentNode; }
    el.style.setProperty('--tol-fs-bg', bg || '#F5EFDE');
    var ink = getComputedStyle(D.body).color || '#2B2620';
    // polish24a: a dark game page can leave the body text black; pick a readable ink for the Play card from the card's own background
    try {
      var lum = function (css) { var q = css && css.match(/rgba?\(([^)]*)\)/); if (!q) return null; var v = q[1].split(',').slice(0, 3).map(function (x) { x = parseFloat(x) / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
      var lb = lum(bg || '#F5EFDE'), li = lum(ink);
      if (lb != null && li != null) { var hi = Math.max(lb, li), lo = Math.min(lb, li); if ((hi + 0.05) / (lo + 0.05) < 4.5) ink = lb < 0.4 ? '#F4F0FA' : '#2B2620'; }
    } catch (e) { /* keep the page's own color */ }
    el.style.setProperty('--tol-fs-ink', ink);
  }
  function announce(txt) { if (cur && cur.live) cur.live.textContent = txt; }
  function fire(active, c) {
    try { D.dispatchEvent(new CustomEvent('tol-fullscreen', { detail: { active: active, mode: c.mode, el: c.el } })); } catch (e) { /* ignore */ }
  }

  /* ---------- the bar, the in-page button ---------- */
  function ensureUI(el, name) {
    var ui = el._tolFs;
    if (!ui) {
      var bar = el_('div', 'tol-fs-bar'); bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Full screen controls');
      var title = el_('span', 'tol-fs-title', name || '');
      var ex = el_('button', 'tol-fs-exit', '✕ Exit'); ex.type = 'button'; ex.setAttribute('aria-label', 'Exit full screen'); ex.setAttribute('data-tol-fs-exit', '');
      var live = el_('span', 'tol-fs-live'); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
      bar.appendChild(title); bar.appendChild(live); bar.appendChild(ex);
      ex.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); exit(); });
      // keep a tap on Exit from also reaching the game under it
      ['pointerdown', 'touchstart', 'mousedown'].forEach(function (t) { bar.addEventListener(t, function (e) { e.stopPropagation(); }); });
      el.insertBefore(bar, el.firstChild);
      var row = el_('div', 'tol-fs-row tol-fs-hide-in-print');
      var open = el_('button', 'tol-fs-open', '⛶ Full screen'); open.type = 'button'; open.setAttribute('aria-label', 'Play full screen');
      row.appendChild(open); el.insertBefore(row, bar.nextSibling);
      ui = el._tolFs = { bar: bar, title: title, live: live, exit: ex, row: row, name: name || '' };
      open.addEventListener('click', function () { enter(el, { name: ui.name }); });
    }
    if (name) { ui.name = name; ui.title.textContent = name; }
    return ui;
  }

  // everything else on the page is inert while a game is full screen (screen readers and Tab stay in the game)
  function makeInert(el) {
    var list = [];
    for (var n = el; n && n !== D.body && n.parentNode; n = n.parentNode) {
      var kids = n.parentNode.children;
      for (var i = 0; i < kids.length; i++) {
        var k = kids[i]; if (k === n || k.inert || /^(SCRIPT|STYLE|LINK)$/.test(k.tagName)) continue;
        try { k.inert = true; list.push(k); } catch (e) { /* ignore */ }
      }
    }
    return list;
  }
  function undoInert(list) { list.forEach(function (k) { try { k.inert = false; } catch (e) { /* ignore */ } }); }

  /* ---------- enter / exit ---------- */
  function enter(el, opts) {
    opts = opts || {};
    if (!el) return Promise.resolve('none');
    addCSS();
    if (cur && cur.el === el) { if (opts.name) { ensureUI(el, opts.name); } return Promise.resolve(cur.mode); }
    if (cur) exitNow(false);
    var ui = ensureUI(el, opts.name || (el._tolFs && el._tolFs.name) || (el.getAttribute('aria-label') || ''));
    pageColors(el);
    var r = el.getBoundingClientRect();
    var c = cur = { el: el, mode: 'overlay', ph: null, y: W.pageYOffset || 0, inerts: [], pushed: false, hadGaming: D.body.classList.contains('tol-gaming'), live: ui.live, gateOff: false };
    // hold the element's place in the page so nothing jumps while it is out of the flow
    var cs = getComputedStyle(el), ph = D.createElement('div');
    ph.className = 'tol-fs-ph'; ph.setAttribute('aria-hidden', 'true');
    ph.style.cssText = 'height:' + Math.round(r.height) + 'px;margin:' + cs.marginTop + ' 0 ' + cs.marginBottom + ';';
    if (el.parentNode) el.parentNode.insertBefore(ph, el);
    c.ph = ph;
    el.classList.add('tol-fs-on'); H.classList.add('tol-fs-lock'); D.body.classList.add('tol-gaming');
    if (el.getAttribute('tabindex') == null) { el.setAttribute('tabindex', '-1'); c.addedTab = true; }
    c.inerts = makeInert(el);
    // the Back button / gesture leaves full screen instead of leaving the page
    try { history.pushState({ tolFs: 1 }, '', location.href); c.pushed = true; } catch (e) { /* ignore */ }
    announce('Full screen. Leave with the Exit button, the Escape key or your Back button.');
    var done = Promise.resolve('overlay');
    var rq = nativeFn(el);
    if (rq && !opts.overlayOnly) {
      try {
        var p = rq.call(el, { navigationUI: 'hide' });
        if (p && p.then) done = p.then(function () { if (cur === c) { c.mode = 'native'; } else nativeExit(); return c.mode; }, function () { return 'overlay'; });
        else { c.mode = 'native'; }
      } catch (e) { /* the overlay stays */ }
    }
    if (!opts.keepFocus) { try { el.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    fire(true, c); kick();
    return done;
  }

  function exitNow(popHistory) {
    var c = cur; if (!c) return;
    cur = null;
    var el = c.el;
    el.classList.remove('tol-fs-on'); H.classList.remove('tol-fs-lock');
    if (!c.hadGaming) D.body.classList.remove('tol-gaming');
    if (c.addedTab) el.removeAttribute('tabindex');
    undoInert(c.inerts);
    if (c.ph && c.ph.parentNode) c.ph.parentNode.removeChild(c.ph);
    nativeExit();
    if (popHistory && c.pushed && history.state && history.state.tolFs) { popping = true; try { history.back(); } catch (e) { popping = false; } }
    try { W.scrollTo(0, c.y); } catch (e) { /* ignore */ }
    c.mode = c.mode + '-exited';
    fire(false, { mode: 'out', el: el });
    kick();
    // keep the keyboard where it was: on the game, or on the page's own button
    var back = el._tolFs && el._tolFs.row && el._tolFs.row.querySelector('button');
    if (!D.activeElement || D.activeElement === D.body || !D.body.contains(D.activeElement)) { try { (back || el).focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }
  function exit() { exitNow(true); }

  /* ---------- listeners that apply to every game ---------- */
  D.addEventListener('keydown', function (e) {
    if (cur && (e.key === 'Escape' || e.key === 'Esc') && !e.defaultPrevented) { e.preventDefault(); e.stopPropagation(); exit(); }   // the game's own Esc (pause) does not also fire
  }, true);
  W.addEventListener('popstate', function () {
    if (popping) { popping = false; return; }
    if (cur) { cur.pushed = false; exitNow(false); }
  });
  function onFsChange() {
    // the browser took us out of native full screen (Esc, a gesture, F11): leave for good
    if (cur && cur.mode === 'native' && !nativeEl()) exit();
    else kick();
  }
  D.addEventListener('fullscreenchange', onFsChange);
  D.addEventListener('webkitfullscreenchange', onFsChange);
  W.addEventListener('orientationchange', kick);

  /* ---------- the Play card (games with no Start button of their own) ---------- */
  function gate(el, name) {
    if (!el || el._tolGate) return;
    var g = el_('div', 'tol-fs-gate'); g.setAttribute('role', 'group'); g.setAttribute('aria-label', 'Start ' + name);
    var card = el_('div', 'tol-fs-gate-card');
    card.appendChild(el_('p', 'tol-fs-gate-t', name));
    card.appendChild(el_('p', 'tol-fs-gate-p', 'This plays full screen. To leave, tap the big ✕ Exit button, press Esc, or use your Back button. You will come back to this page right where you were.'));
    var b = el_('button', 'tol-fs-play', '▶ Play'); b.type = 'button';
    card.appendChild(b); g.appendChild(card);
    var kids = [];
    pageColors(el);
    el.classList.add('tol-fs-gated');
    Array.prototype.forEach.call(el.children, function (k) { if (k !== g && !/^(SCRIPT|STYLE)$/.test(k.tagName) && !k.inert) { try { k.inert = true; kids.push(k); } catch (e) { /* ignore */ } } });
    // the game may add its own pieces later; they wait behind the card too (the card covers them)
    el.appendChild(g); el._tolGate = g;
    b.addEventListener('click', function () {
      g.parentNode && g.parentNode.removeChild(g); el._tolGate = null; el.classList.remove('tol-fs-gated');
      undoInert(kids);
      enter(el, { name: name });
    });
  }

  function wrapRange(a, z) {
    var first = D.querySelector(a), last = D.querySelector(z);
    if (!first || !last || first.parentNode !== last.parentNode) return null;
    var w = D.createElement('div'); w.className = 'tol-fs-wrap';
    first.parentNode.insertBefore(w, first);
    var n = first, stop = last.nextSibling;
    while (n && n !== stop) { var nx = n.nextSibling; w.appendChild(n); n = nx; }
    return w;
  }

  function autoWire() {
    var path = location.pathname.replace(/\.html$/, '').replace(/\/index$/, '') || '/';
    var P = PAGES[path]; if (!P) return;
    addCSS();
    var el = P.wrap ? wrapRange(P.wrap[0], P.wrap[1]) : D.querySelector(P.sel);
    if (!el) return;
    ensureUI(el, P.name);
    if (P.gate) gate(el, P.name);
    if (P.start) { var s = D.querySelector(P.start); if (s) s.addEventListener('click', function () { enter(el, { name: P.name, keepFocus: true }); }); }
  }

  W.TOLFull = {
    enter: enter, exit: exit, gate: gate,
    active: function () { return !!cur; },
    mode: function () { return cur ? cur.mode : ''; },
    element: function () { return cur ? cur.el : null; },
    title: function (t) { if (cur && cur.el._tolFs) { cur.el._tolFs.title.textContent = t; cur.el._tolFs.name = t; } },
    bar: BAR
  };
  addCSS();
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', autoWire); else autoWire();
})();
