/* dives.js — mini dives: tap a term marked with the little water drop and a short,
   friendly explanation opens right on the page, with a link to dig deeper.
   site.js loads this on every page. The first time each term appears in a page's
   text it is marked automatically; any element with data-dive="key" works too.
   Nothing is stored or sent. */
(function () {
  'use strict';
  var G = window.TOL_DIVES || {};
  var MAX = 10; // at most this many marked terms per page, so pages stay calm to read

  var SKIP = 'a, button, h1, h2, h3, h4, h5, h6, label, code, pre, script, style, textarea, input, select, option, summary, svg, canvas, nav, header:not(.read-head), footer, .tol-bar, .no-dive, .tol-dive, .wpf-form, .wpf-bar, .tol-index, .tol-row, .gm-board, .qw, .ng-stage, .ws-sheet, .tol-tip, .dig, [role="dialog"], [aria-hidden="true"]';

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function reEsc(t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function mark() {
    var main = document.querySelector('main'); if (!main) return;
    if (document.body.hasAttribute('data-no-dives')) return;
    var keys = Object.keys(G), used = {}, count = 0;
    // longer phrases first, so "Battery & Stress Meter" wins over "Battery"
    var terms = [];
    keys.forEach(function (k) { (G[k].m || []).forEach(function (p) { terms.push([p, k]); }); });
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
  function makeBtn(key, word) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'tol-dive'; b.setAttribute('data-dive', key);
    b.setAttribute('aria-haspopup', 'dialog');
    b.innerHTML = esc(word) + ICON;
    b.setAttribute('aria-label', word + ': a mini dive, tap for a short explanation');
    return b;
  }

  // ---------- the little dialog ----------
  var box = null, lastBtn = null;
  function open(key, from) {
    var d = G[key]; if (!d) return;
    lastBtn = from;
    if (!box) {
      box = document.createElement('div');
      box.className = 'tol-dive-card'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'tol-dive-h');
      box.innerHTML = '<div class="tol-dive-box"><button type="button" class="tol-dive-x" aria-label="Close">&times;</button>' +
        '<p class="tol-dive-k"><span class="tol-dive-i" aria-hidden="true"></span> Mini dive</p><h2 id="tol-dive-h"></h2><div class="tol-dive-body"></div><p class="tol-dive-more"></p></div>';
      document.body.appendChild(box);
      box.addEventListener('click', function (e) { if (e.target === box || e.target.closest('.tol-dive-x')) close(); });
      box.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') close();
        if (e.key === 'Tab') { var f = box.querySelectorAll('button, a'), a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
      });
    }
    box.querySelector('#tol-dive-h').textContent = d.t;
    box.querySelector('.tol-dive-body').innerHTML = (d.d || '').split('\n').map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    var more = box.querySelector('.tol-dive-more');
    var here = d.u && (location.pathname + location.hash) === d.u;
    more.innerHTML = d.u && !here ? '<a href="' + esc(d.u) + '">' + esc(d.l || 'Dive deeper') + ' &rarr;</a>' : '';
    box.classList.add('is-open');
    requestAnimationFrame(function () { box.classList.add('is-in'); });
    box.querySelector('.tol-dive-x').focus();
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
