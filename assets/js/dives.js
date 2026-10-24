/* dives.js — mini dives: a word with a dotted line and a little water drop opens a short,
   friendly explanation right on the page, a step at a time, with a link to dig deeper.
   site.js loads this on every page. The first time each term appears in a page's reading
   text it is marked automatically (at most one per paragraph, and a sensible number per
   page); any element with data-dive="key" works too.
   Two kinds of entries live in dives-glossary.js: the program's own ideas, and plain
   explanations of everyday hard words (alexithymia, rumination, attachment and so on).
   Never marked: headings, buttons, links, labels, tool and workpaper names, people's names,
   paragraphs about the author, and whole pages about the author, the law or this device.
   localStorage: tol-dive-hint, the one-time "Words with a dotted line…" hint: a count of
   pages it has shown on, or "off" once closed or once a dive has been opened. */
(function () {
  'use strict';
  var G = window.TOL_DIVES || {};
  // names of tools, workpapers, pages and programs aren't marked: mini dives are for terms and topics
  var NAMES = { solvency: 1, deficit: 1, field: 1, battery: 1, raci: 1, tone: 1, pll: 1, kit: 1, checkins: 1, translator: 1, reader: 1, freq: 1, framework: 1,
    mood: 1, lemonade: 1, weather: 1, card: 1, report: 1, prog: 1, suite: 1, workpapers: 1, garden: 1, petals: 1, soundscapes: 1, stories: 1, wired: 1, verdict: 1 };
  // pages about the author, the legal pages and the "what's on this device" pages: no marks at all
  var NO_PAGE = /^\/(about|about-in-depth|privacy-policy|terms-of-service|refund-policy|telemetry|on-this-device|saved|404|offline|brand|sent-this|someone-sent-you-this)\.html$/;
  var MAX = 40, MIN = 10, WORDS_PER = 110; // up to 40 on a long page, about one per 110 words, at least 10
  var HINT = 'tol-dive-hint', HINT_PAGES = 5;

  var SKIP = 'a, button, h1, h2, h3, h4, h5, h6, label, code, pre, script, style, textarea, input, select, option, summary, svg, canvas, nav, header, footer, figure figcaption .credit, .tol-bar, .no-dive, [data-no-dives], .tol-dive, .tol-dive-hint, .wpf-form, .wpf-bar, .tol-index, .tol-row, .gm-board, .qw, .ng-stage, .ws-sheet, .tol-tip, .dig, .tol-cheer, .tol-pud-card, .tol-sv, .tol-sv-how, .tol-sv-mine, .tol-sv-ndot, .read-code, .eyebrow, .kicker, .pe-refs, .refs, .references, .sources, [class*="-refs"], [class*="-sources"], #all-sources, #sources, #references, cite, .tag, .tags, .chip, .pill, .badge, [role="dialog"], [aria-hidden="true"], [role="button"], [role="tab"], [role="menu"], [contenteditable]';
  var BLOCK = 'p, li, dd, td, blockquote, figcaption, .simple-lede, .announce-line';
  // label lines and keyword lists, not reading text
  var LABEL = /^\s*(also known as|see also|keywords?|tags?|related|sources?|references?|read next)\b/i;
  var AUTHOR = /\bChristian\b/;
  // a line from a reference list: "Author, A. (2000). Title. Journal, 12(3), 45." or a checked web page
  var CITE = /\(\d{4}[a-z]?\)\.\s|\(web page, checked|doi\.org|\b\d+\(\d+\),\s*\d+/i;

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function reEsc(t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var reCache = {};
  function re(src) { if (!src) return null; if (!(src in reCache)) { try { reCache[src] = new RegExp(src, 'i'); } catch (e) { reCache[src] = null; } } return reCache[src]; }
  function here() { var p = location.pathname || '/'; if (p.slice(-1) === '/') p += 'index.html'; return p; }

  // ---------- spotting the terms ----------
  // One pattern finds every phrase at once (longest first); at each hit the phrases that start
  // there are tried in order, and the first unused term whose paragraph passes its checks wins.
  var index = null;
  function build() {
    var terms = [], byLow = {};
    Object.keys(G).forEach(function (k) {
      var d = G[k]; if (!d || NAMES[k] || d.name) return;
      (d.m || []).forEach(function (p) { if (p && p.length > 1) terms.push({ p: p, k: k, cs: !!d.cs }); });
    });
    terms.sort(function (a, b) { return b.p.length - a.p.length; });
    terms.forEach(function (t) { var l = t.p.toLowerCase(); (byLow[l] = byLow[l] || []).push(t); });
    var alt = Object.keys(byLow).sort(function (a, b) { return b.length - a.length; }).map(reEsc).join('|');
    index = { terms: terms, byLow: byLow, re: alt ? new RegExp('(^|[^A-Za-z0-9\\u00C0-\\u024F-])(' + alt + ')(?![A-Za-z0-9\\u00C0-\\u024F]|-[A-Za-z])', 'gi') : null };
  }
  function fits(t, word, blockText) {
    var d = G[t.k];
    if (t.cs && word !== t.p) return false;
    var nd = re(d.nd), nx = re(d.nx);
    if (nd && !nd.test(blockText)) return false;
    if (nx && nx.test(blockText)) return false;
    return true;
  }
  function find(text, blockText, used) {
    var rx = index.re; rx.lastIndex = 0; var m;
    while ((m = rx.exec(text))) {
      var at = m.index + m[1].length, low = m[2].toLowerCase();
      // every phrase that starts here, longest first (a used "autistic burnout" can still leave "autistic")
      var cands = index.terms.filter(function (t) {
        var l = t.p.length; if (l > low.length) return false;
        var seg = text.substr(at, l);
        if (seg.toLowerCase() !== t.p.toLowerCase()) return false;
        var nx = text.charAt(at + l), nx2 = text.charAt(at + l + 1);
        return !/[A-Za-z0-9À-ɏ]/.test(nx) && !(nx === '-' && /[A-Za-z]/.test(nx2));
      });
      for (var i = 0; i < cands.length; i++) {
        var t = cands[i]; if (used[t.k]) continue;
        var word = text.substr(at, t.p.length);
        if (fits(t, word, blockText)) return { at: at, len: t.p.length, key: t.k };
      }
      rx.lastIndex = at + 1;
    }
    return null;
  }
  function blockOf(n) { var p = n.parentElement; return p && p.closest(BLOCK); }

  function mark() {
    var main = document.querySelector('main'); if (!main) return;
    if (document.body.hasAttribute('data-no-dives') || NO_PAGE.test(here())) return;
    addCss();
    if (!index) build();
    var count = 0, used = {}, done = [];
    if (index.re) {
      var words = (main.textContent || '').split(/\s+/).length;
      var cap = Math.max(MIN, Math.min(MAX, Math.round(words / WORDS_PER)));
      var okBlock = [];  // blocks checked once: reading text, not a label, not about the author
      var walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          if (!n.nodeValue || n.nodeValue.length < 4) return NodeFilter.FILTER_REJECT;
          var p = n.parentElement;
          if (!p || p.closest(SKIP)) return NodeFilter.FILTER_REJECT;
          var b = p.closest(BLOCK); if (!b || b.closest(SKIP)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      var nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
      for (var i = 0; i < nodes.length && count < cap; i++) {
        var node = nodes[i], b = blockOf(node); if (!b || done.indexOf(b) !== -1) continue;
        var bt = okBlock.indexOf(b) !== -1 ? b.textContent : null;
        if (bt == null) {
          bt = (b.textContent || '').replace(/\s+/g, ' ');
          if (bt.length < 40 || LABEL.test(bt) || AUTHOR.test(bt) || CITE.test(bt)) { done.push(b); continue; }
          okBlock.push(b);
        }
        var text = node.nodeValue, hit = find(text, bt, used);
        if (!hit) continue;
        used[hit.key] = true; count++; done.push(b);   // at most one mini dive per paragraph
        var before = text.slice(0, hit.at), word = text.slice(hit.at, hit.at + hit.len), after = text.slice(hit.at + hit.len);
        var frag = document.createDocumentFragment();
        if (before) frag.appendChild(document.createTextNode(before));
        frag.appendChild(makeBtn(hit.key, word));
        if (after) frag.appendChild(document.createTextNode(after));
        node.parentNode.replaceChild(frag, node);
      }
    }
    // anything marked by hand
    Array.prototype.forEach.call(document.querySelectorAll('[data-dive]:not(.tol-dive)'), function (el) {
      if (!G[el.getAttribute('data-dive')]) return;
      el.classList.add('tol-dive'); el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0');
      el.insertAdjacentHTML('beforeend', ICON);
    });
    if (count) hint(main);
  }

  var ICON = '<span class="tol-dive-i" aria-hidden="true"></span>';

  // ---------- the one-time hint ----------
  // A small line just above the first marked paragraph, on the first few pages with mini dives,
  // until it's closed or a mini dive has been opened.
  var hintEl = null;
  function hint(main) {
    var v = lsGet(HINT);
    if (v === 'off' || (parseInt(v || '0', 10) || 0) >= HINT_PAGES) return;
    if (document.documentElement.classList.contains('tol-no-helpers')) return;
    var first = main.querySelector('.tol-dive'); if (!first) return;
    var e = first.closest(BLOCK) || first;
    // climb to a box whose parent lays things out as plain blocks, so the line never lands inside a list or a grid
    while (e.parentElement && e !== main) {
      var par = e.parentElement, disp = getComputedStyle(par).display;
      if (!/^(LI|DT|DD|TD|TH|TR|TBODY|THEAD|TABLE|FIGCAPTION|SUMMARY)$/.test(e.tagName) && /^(block|flow-root)$/.test(disp) && !par.closest('a, button, details:not([open])')) break;
      e = par;
    }
    if (e === main || !e.parentElement) return;
    hintEl = document.createElement('p');
    hintEl.className = 'tol-dive-hint no-bubble no-cheer';
    hintEl.setAttribute('role', 'note');
    hintEl.innerHTML = '<span class="tol-dive-i" aria-hidden="true"></span><span class="tol-dive-hint-t">Words with a dotted line have a short explanation. Tap one.</span>' +
      '<button type="button" class="tol-dive-hint-x" aria-label="Got it, hide this tip">&times;</button>';
    e.parentElement.insertBefore(hintEl, e);
    lsSet(HINT, String((parseInt(v || '0', 10) || 0) + 1));
    hintEl.querySelector('button').addEventListener('click', function () { hintOff(); var d = main.querySelector('.tol-dive'); if (d) d.focus({ preventScroll: true }); });
  }
  function hintOff() { lsSet(HINT, 'off'); if (hintEl) { hintEl.remove(); hintEl = null; } }

  // "Here on this page": an optional line that ties a term to the page it was tapped on.
  // ctx keys: a page path (a simple page and its -in-depth twin share one), a folder
  // prefix ending in "/", or sec: { <body data-sec>: '…' } for a whole section.
  function hereLine(d) {
    var c = d.ctx; if (!c) return '';
    var p = here();
    var twin = p.replace(/-in-depth\.html$/, '.html');
    if (c[p]) return c[p];
    if (c[twin]) return c[twin];
    var best = '';
    Object.keys(c).forEach(function (k) { if (k.slice(-1) === '/' && k.charAt(0) === '/' && p.indexOf(k) === 0 && k.length > best.length) best = k; });
    if (best) return c[best];
    var sec = document.body.getAttribute('data-sec');
    return (c.sec && sec && c.sec[sec]) || '';
  }
  // the marker: a dotted underline and a small drop, calm enough to read past; the card's extras
  var CSS = 'main .tol-dive{ background:none; text-decoration:underline dotted #3C78AA; text-decoration-thickness:2px; text-underline-offset:.24em; text-decoration-skip-ink:none; }' +
    'main .tol-dive:hover, main .tol-dive:focus-visible{ background:rgba(150,194,232,.28); }' +
    'main .tol-dive .tol-dive-i{ width:.72em; height:.72em; margin-left:.1em; vertical-align:.32em; }' +
    'html.tol-quiet main .tol-dive{ text-decoration-color:rgba(60,120,170,.7); }' +
    '.tol-dive-hint{ display:flex; align-items:center; gap:.45rem; width:fit-content; max-width:100% !important; margin:.2rem 0 .7rem !important; padding:.2rem .2rem .2rem .7rem !important; border-radius:999px; background:#F2F8FD !important; border:1px solid #CFE2F2 !important; color:#2F5F8A; font-size:.9rem; line-height:1.35; box-shadow:none !important; }' +
    '.tol-dive-hint::before{ content:none !important; }' +
    '.tol-dive-hint .tol-dive-i{ flex:none; display:inline-block; width:1em; height:1em; margin:0; }' +
    '.tol-dive-hint-x{ flex:none; min-width:44px; min-height:44px; margin:-.4rem 0; padding:0; border:0; border-radius:999px; background:none; color:#2F5F8A; font:400 1.35rem/1 Georgia, serif; cursor:pointer; }' +
    '.tol-dive-hint-x:hover{ background:rgba(150,194,232,.25); }' +
    '.tol-dive-hint-x:focus-visible{ outline:3px solid #2B5B8C; outline-offset:2px; }' +
    '@media print{ .tol-dive-hint{ display:none !important; } main .tol-dive{ text-decoration:none; } }' +
    '.tol-dive-ev{ display:inline-block; margin:0 0 .5rem !important; padding:.15rem .6rem; border-radius:999px; background:#EEF5EC; border:1px solid #BFDDB8; color:#2F5A3C; font-size:.8rem; font-weight:600; }' +
    '.tol-dive-here{ margin:.15rem 0 .65rem !important; padding:.5rem .75rem; border-left:3px solid #7FB3DA; border-radius:8px; background:rgba(150,194,232,.16); font-size:.94rem; }' +
    '.tol-dive-here b{ font-weight:600; color:#2F5F8A; }' +
    '.tol-dive-tease{ margin:0 !important; font-size:.9rem; line-height:1.45; color:#4F7597; }' +
    '.tol-dive-card .tol-dive-more a{ min-height:44px; display:inline-flex; align-items:center; }' +
    '.tol-dive-card .tol-dive-chat{ min-height:44px; }' +
    '.tol-dive-card .tol-dive-x{ width:44px; height:44px; top:8px; right:8px; }';
  function addCss() {
    if (document.getElementById('tol-dive-css')) return;
    var st = document.createElement('style'); st.id = 'tol-dive-css'; st.textContent = CSS; document.head.appendChild(st);
  }
  function makeBtn(key, word) {
    // a span that acts as a button, so a long term wraps across lines like the words around it
    // (a real <button> becomes one box and can spill over the line below in narrow places)
    var b = document.createElement('span');
    b.setAttribute('role', 'button'); b.tabIndex = 0; b.className = 'tol-dive'; b.setAttribute('data-dive', key);
    b.setAttribute('aria-haspopup', 'dialog');
    b.innerHTML = esc(word) + ICON;
    b.setAttribute('aria-label', word + ': a mini dive, tap for a short explanation');
    return b;
  }

  // ---------- the little dialog ----------
  var box = null, lastBtn = null, curKey = '';
  // mini dives that also have a one-line entry in the glossary (glossary.html#id)
  var GLOSS = {static: 'static', framework: 'frequency', retune: 'retune', drift: 'drift', carrier: 'carrier-wave', wired: 'wiring', card: 'wiring-card', weather: 'weather', talkwindow: 'talk-window', almanac: 'almanac', battery: 'battery', invisible: 'load', unbilled: 'unbilled-debt', raci: 'owner', pll: 'check-in', kit: 'calm-down-kit', flooded: 'flooded', bids: 'bid', turning: 'turning-toward', repair: 'repair', refusal: 'neutral-refusal', workpapers: 'workpaper', lemonade: 'lemonade-stand', solvency: 'can-the-load-last', translator: 'signal-translator', reader: 'conversation-reader', masking: 'masking', petals: 'levels'};
  function open(key, from) {
    var d = G[key]; if (!d) return;
    lastBtn = from; curKey = key;
    hintOff();
    if (!box) {
      addCss();
      box = document.createElement('div');
      box.className = 'tol-dive-card'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'tol-dive-h');
      box.innerHTML = '<div class="tol-dive-box"><button type="button" class="tol-dive-x" aria-label="Close">&times;</button>' +
        '<p class="tol-dive-k"><span class="tol-dive-i" aria-hidden="true"></span> Mini dive' + '</p><ol class="tol-dive-meter" aria-hidden="true"></ol><h2 id="tol-dive-h"></h2><p class="tol-dive-ev" hidden></p><div class="tol-dive-body" aria-live="polite"></div><p class="tol-dive-wade"></p><p class="tol-dive-more"></p></div>';
      document.body.appendChild(box);
      box.addEventListener('click', function (e) {
        if (e.target === box || e.target.closest('.tol-dive-x')) return close();
        if (e.target.closest('.tol-dive-go')) wade();
        var ch = e.target.closest('.tol-dive-chat');
        if (ch && cur && (window.TOLPuddles || window.TOLChat)) {
          e.preventDefault(); var q = 'What does “' + cur.t + '” mean?'; close();
          if (window.TOLPuddles) window.TOLPuddles.open(q); else window.TOLChat.open({ topic: q });
        }
      });
      box.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') close();
        if (e.key === 'Tab') { var f = box.querySelectorAll('button, a'), a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
      });
    }
    box.querySelector('#tol-dive-h').textContent = d.t;
    var ev = box.querySelector('.tol-dive-ev');
    if (d.ev) { ev.textContent = d.ev; ev.hidden = false; } else { ev.textContent = ''; ev.hidden = true; }
    // the layers, from the shore to the deep: a line to start, then a little more, then the shallows
    var paras = (d.d || '').split('\n').filter(Boolean);
    layers = [d.s || paras[0], d.f || (d.s ? '' : paras[1]), d.w || (d.s ? '' : paras.slice(2).join('\n')), d.x || ''].filter(Boolean);
    depth = 0; cur = d; hereText = hereLine(d);
    box.querySelector('.tol-dive-body').innerHTML = '';
    paint();
    box.classList.add('is-open');
    requestAnimationFrame(function () { box.classList.add('is-in'); });
    box.querySelector('.tol-dive-x').focus();
  }
  var layers = [], depth = 0, cur = null, hereText = '';
  var STEPS = [['🏖', 'On the shore'], ['👣', 'Toes in the water'], ['🌊', 'The shallows'], ['🏊', 'Waist deep']], DEEP = ['🤿', 'The deep'];
  function paint() {
    var body = box.querySelector('.tol-dive-body'), d = cur;
    var t = layers[depth] || '';
    body.insertAdjacentHTML('beforeend', '<div class="tol-dive-layer' + (depth ? ' is-new' : '') + '"><p class="tol-dive-step">' + STEPS[depth][0] + ' ' + STEPS[depth][1] + '</p>' +
      t.split('\n').map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
      (depth === 0 && hereText ? '<p class="tol-dive-here"><b>Here on this page:</b> ' + esc(hereText) + '</p>' : '') + '</div>');
    var onIt = d.u && (location.pathname + location.hash) === d.u, deep = d.u && !onIt;
    var total = layers.length + (deep ? 1 : 0);
    box.querySelector('.tol-dive-meter').innerHTML = STEPS.slice(0, layers.length).concat(deep ? [DEEP] : []).map(function (st, i) {
      return '<li class="' + (i <= depth ? 'is-on' : '') + '" title="' + st[1] + '">' + st[0] + '</li>';
    }).join('');
    box.querySelector('.tol-dive-meter').style.display = total > 1 ? '' : 'none';
    var more = depth < layers.length - 1;
    box.querySelector('.tol-dive-wade').innerHTML = '<span class="tol-dive-ask">' + (more ? (depth === 0 ? 'Want to go further?' : 'Keep going, or talk it through:') : 'Want to talk it through?') + '</span>' +
      (more ? '<button type="button" class="tol-dive-go">' + (depth === 0 ? 'Wade in a little' : depth === 1 ? 'A little deeper' : 'Wade in to your waist') + ' ' + STEPS[depth + 1][0] + '</button>' : '') +
      '<a class="tol-dive-chat" href="/ask.html?about=' + encodeURIComponent(d.t) + '"><span aria-hidden="true">&#128172;</span> Chat it out with Professor Puddles</a>';
    var last = depth === layers.length - 1;
    box.querySelector('.tol-dive-more').innerHTML = (deep && last && d.lt ? '<p class="tol-dive-tease">' + DEEP[0] + ' <b>The deep end:</b> ' + esc(d.lt) + '</p>' : '') +
      (deep ? '<a href="' + esc(d.u) + '" aria-label="' + esc('Dive deeper: ' + (d.l || d.t) + ', in the full version') + '">' + DEEP[0] + ' ' + esc(d.l || 'Dive deeper') + ' &rarr;</a>' : '') +
      (GLOSS[curKey] && location.pathname !== '/glossary.html' ? '<a class="tol-dive-gloss" href="/glossary.html#' + GLOSS[curKey] + '"><span aria-hidden="true">&#128214;</span> In the glossary</a>' : '');
    if (depth) { var nl = body.lastElementChild; if (nl) body.scrollTo ? body.scrollTo({ top: nl.offsetTop - body.offsetTop - 8, behavior: 'smooth' }) : (body.scrollTop = nl.offsetTop); }
    else body.scrollTop = 0;
  }
  function wade() {
    if (depth >= layers.length - 1) return;
    depth++; paint();
    var g = box.querySelector('.tol-dive-go'); (g || box.querySelector('.tol-dive-more a') || box.querySelector('.tol-dive-x')).focus();
  }
  function close() {
    if (!box) return;
    box.classList.remove('is-in');
    setTimeout(function () { box.classList.remove('is-open'); }, 260);
    if (lastBtn && lastBtn.focus) lastBtn.focus();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.tol-dive');
    if (!b || (box && box.contains(b))) return;
    e.preventDefault(); open(b.getAttribute('data-dive'), b);
  });
  document.addEventListener('keydown', function (e) {
    var b = e.target.closest && e.target.closest('.tol-dive[role="button"]');
    if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(b.getAttribute('data-dive'), b); }
  });

  window.TOLDives = { open: open, mark: mark };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mark); else mark();
})();
