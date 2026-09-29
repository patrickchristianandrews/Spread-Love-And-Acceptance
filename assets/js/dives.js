/* dives.js — mini dives: tap a term marked with the little water drop and a short,
   friendly explanation opens right on the page, with a link to dig deeper.
   site.js loads this on every page. The first time each term appears in a page's
   text it is marked automatically; any element with data-dive="key" works too.
   Nothing is stored or sent. */
(function () {
  'use strict';
  var G = window.TOL_DIVES || {};
  // names of tools, workpapers, pages and programs aren't marked: mini dives are for terms and topics
  var NAMES = { solvency: 1, deficit: 1, field: 1, battery: 1, raci: 1, tone: 1, pll: 1, kit: 1, checkins: 1, translator: 1, reader: 1, freq: 1, framework: 1,
    mood: 1, lemonade: 1, weather: 1, card: 1, report: 1, prog: 1, suite: 1, workpapers: 1, garden: 1, petals: 1, soundscapes: 1, stories: 1, wired: 1, verdict: 1 };
  var MAX = 24; // at most this many marked terms per page, so pages stay calm to read

  var SKIP = 'a, button, h1, h2, h3, h4, h5, h6, label, code, pre, script, style, textarea, input, select, option, summary, svg, canvas, nav, header:not(.read-head), footer, .tol-bar, .no-dive, .tol-dive, .wpf-form, .wpf-bar, .tol-index, .tol-row, .gm-board, .qw, .ng-stage, .ws-sheet, .tol-tip, .dig, [role="dialog"], [aria-hidden="true"]';

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function reEsc(t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function mark() {
    var main = document.querySelector('main'); if (!main) return;
    if (document.body.hasAttribute('data-no-dives')) return;
    var keys = Object.keys(G), used = {}, count = 0;
    // longer phrases first, so "Battery & Stress Meter" wins over "Battery"
    var terms = [];
    keys.forEach(function (k) { if (NAMES[k] || G[k].name) return; (G[k].m || []).forEach(function (p) { terms.push([p, k]); }); });
    terms.sort(function (a, b) { return b[0].length - a[0].length; });
    if (!terms.length) return;
    var walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || n.nodeValue.length < 4) return NodeFilter.FILTER_REJECT;
        var p = n.parentElement;
        if (!p || p.closest(SKIP)) return NodeFilter.FILTER_REJECT;
        if (!p.closest('p, li, dd, td, blockquote, figcaption, .simple-lede, .announce-line')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (var i = 0; i < nodes.length && count < MAX; i++) {
      var node = nodes[i], text = node.nodeValue, hit = null;
      for (var j = 0; j < terms.length; j++) {
        var k = terms[j][1]; if (used[k]) continue;
        var re = new RegExp('(^|[^A-Za-z0-9-])(' + reEsc(terms[j][0]) + ')(?![A-Za-z0-9])', G[k].cs ? '' : 'i'), m = re.exec(text);
        if (m && (!hit || m.index + m[1].length < hit.at)) hit = { at: m.index + m[1].length, len: m[2].length, key: k };
      }
      if (!hit) continue;
      used[hit.key] = true; count++;
      var before = text.slice(0, hit.at), word = text.slice(hit.at, hit.at + hit.len), after = text.slice(hit.at + hit.len);
      var btn = makeBtn(hit.key, word);
      var frag = document.createDocumentFragment();
      if (before) frag.appendChild(document.createTextNode(before));
      frag.appendChild(btn);
      var rest = document.createTextNode(after); frag.appendChild(rest);
      node.parentNode.replaceChild(frag, node);
      if (after.length > 3) { nodes.splice(i + 1, 0, rest); } // the rest of the sentence may hold another term
    }
    // anything marked by hand
    Array.prototype.forEach.call(document.querySelectorAll('[data-dive]:not(.tol-dive)'), function (el) {
      if (!G[el.getAttribute('data-dive')]) return;
      el.classList.add('tol-dive'); el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0');
      el.insertAdjacentHTML('beforeend', ICON);
    });
  }

  var ICON = '<span class="tol-dive-i" aria-hidden="true"></span>';

  // "Here on this page": an optional line that ties a term to the page it was tapped on.
  // ctx keys: a page path (a simple page and its -in-depth twin share one), a folder
  // prefix ending in "/", or sec: { <body data-sec>: '…' } for a whole section.
  function hereLine(d) {
    var c = d.ctx; if (!c) return '';
    var p = location.pathname || '/'; if (p.slice(-1) === '/') p += 'index.html';
    var twin = p.replace(/-in-depth\.html$/, '.html');
    if (c[p]) return c[p];
    if (c[twin]) return c[twin];
    var best = '';
    Object.keys(c).forEach(function (k) { if (k.slice(-1) === '/' && k.charAt(0) === '/' && p.indexOf(k) === 0 && k.length > best.length) best = k; });
    if (best) return c[best];
    var sec = document.body.getAttribute('data-sec');
    return (c.sec && sec && c.sec[sec]) || '';
  }
  var CSS = '.tol-dive-here{ margin:.15rem 0 .65rem !important; padding:.5rem .75rem; border-left:3px solid #7FB3DA; border-radius:8px; background:rgba(150,194,232,.16); font-size:.94rem; }' +
    '.tol-dive-here b{ font-weight:600; color:#2F5F8A; }' +
    '.tol-dive-tease{ margin:0 !important; font-size:.9rem; line-height:1.45; color:#4F7597; }' +
    '.tol-dive-card .tol-dive-more a{ min-height:44px; display:inline-flex; align-items:center; }' +
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
    if (!box) {
      addCss();
      box = document.createElement('div');
      box.className = 'tol-dive-card'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'tol-dive-h');
      box.innerHTML = '<div class="tol-dive-box"><button type="button" class="tol-dive-x" aria-label="Close">&times;</button>' +
        '<p class="tol-dive-k"><span class="tol-dive-i" aria-hidden="true"></span> Mini dive' + ('speechSynthesis' in window ? ' <button type="button" class="tol-listen-mini tol-dive-listen" aria-pressed="false"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg> Listen</button>' : '') + '</p><ol class="tol-dive-meter" aria-hidden="true"></ol><h2 id="tol-dive-h"></h2><div class="tol-dive-body" aria-live="polite"></div><p class="tol-dive-wade"></p><p class="tol-dive-more"></p></div>';
      document.body.appendChild(box);
      box.addEventListener('click', function (e) {
        if (e.target === box || e.target.closest('.tol-dive-x')) return close();
        if (e.target.closest('.tol-dive-go')) wade();
        var lb = e.target.closest('.tol-dive-listen');
        if (lb) {
          // read the title and the newest step out loud (listen.js, the device's own voice)
          var go = function () { var body = box.querySelector('.tol-dive-body'), layer = body.lastElementChild; if (window.TOLListen && layer) window.TOLListen.read(layer, lb); };
          if (window.TOLListen) go();
          else { var sc = document.createElement('script'); sc.src = '/assets/js/listen.js'; sc.onload = go; document.head.appendChild(sc); }
        }
      });
      box.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') close();
        if (e.key === 'Tab') { var f = box.querySelectorAll('button, a'), a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
      });
    }
    box.querySelector('#tol-dive-h').textContent = d.t;
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
  var STEPS = [['\uD83C\uDFD6', 'On the shore'], ['\uD83D\uDC63', 'Toes in the water'], ['\uD83C\uDF0A', 'The shallows'], ['\uD83C\uDFCA', 'Waist deep']], DEEP = ['\uD83E\uDD3F', 'The deep'];
  function paint() {
    var body = box.querySelector('.tol-dive-body'), d = cur;
    var t = layers[depth] || '';
    body.insertAdjacentHTML('beforeend', '<div class="tol-dive-layer' + (depth ? ' is-new' : '') + '"><p class="tol-dive-step">' + STEPS[depth][0] + ' ' + STEPS[depth][1] + '</p>' +
      t.split('\n').map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
      (depth === 0 && hereText ? '<p class="tol-dive-here"><b>Here on this page:</b> ' + esc(hereText) + '</p>' : '') + '</div>');
    var here = d.u && (location.pathname + location.hash) === d.u, deep = d.u && !here;
    var total = layers.length + (deep ? 1 : 0);
    box.querySelector('.tol-dive-meter').innerHTML = STEPS.slice(0, layers.length).concat(deep ? [DEEP] : []).map(function (st, i) {
      return '<li class="' + (i <= depth ? 'is-on' : '') + '" title="' + st[1] + '">' + st[0] + '</li>';
    }).join('');
    box.querySelector('.tol-dive-meter').style.display = total > 1 ? '' : 'none';
    var more = depth < layers.length - 1;
    box.querySelector('.tol-dive-wade').innerHTML = more ? '<button type="button" class="tol-dive-go">' + (depth === 0 ? 'Wade in a little' : depth === 1 ? 'A little deeper' : 'Wade in to your waist') + ' ' + STEPS[depth + 1][0] + '</button>' : '';
    var last = depth === layers.length - 1;
    box.querySelector('.tol-dive-more').innerHTML = (deep && last && d.lt ? '<p class="tol-dive-tease">' + DEEP[0] + ' <b>The deep end:</b> ' + esc(d.lt) + '</p>' : '') +
      (deep ? '<a href="' + esc(d.u) + '" aria-label="' + esc('Dive deeper: ' + (d.l || d.t) + ', in the full version') + '">' + DEEP[0] + ' ' + esc(d.l || 'Dive deeper') + ' &rarr;</a>' : '') +
      (GLOSS[curKey] && location.pathname !== '/glossary.html' ? '<a class="tol-dive-gloss" href="/glossary.html#' + GLOSS[curKey] + '"><span aria-hidden="true">&#128214;</span> In the glossary</a>' : '') +
      '<a class="tol-dive-chat" href="/ask.html?about=' + encodeURIComponent(d.t) + '"><span aria-hidden="true">&#128172;</span> Chat it out with Professor Puddles</a>';
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
    if (window.TOLListen) window.TOLListen.stop();
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
