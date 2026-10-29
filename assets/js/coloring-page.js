/* coloring-page.js: /coloring-page.html, a coloring page at random from the three coloring books (owner, Oct 29 2026).
   The pictures and their words come from /assets/js/coloring-pages-data.js (tools/coloring/build_pages.py). A shuffled
   pile per choice means no picture repeats until every one in that choice has been shown. The address keeps the shown
   picture (?p=little-04) so it can be shared or opened again. Print sends only the picture, at full letter size.
   Nothing is stored or sent. */
(function () {
  'use strict';
  var root = document.querySelector('[data-cp-root]');
  var D = window.TOL_COLORING;
  if (!root || !D || !D.pages || !D.pages.length) return;
  function $(s) { return root.querySelector(s); }
  var res = $('[data-cp-result]'), img = $('[data-cp-img]'), words = $('[data-cp-words]'), from = $('[data-cp-from]');
  var save = $('[data-cp-save]'), book = $('[data-cp-book]'), live = $('[data-cp-live]'), go = $('[data-cp-go]');
  var BOOKS = {}; D.books.forEach(function (b) { BOOKS[b.id] = b; });
  var piles = {}, current = null;

  function who() { var r = root.querySelector('input[name="cp-who"]:checked'); return r ? r.value : 'any'; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function next(w) {
    if (!piles[w] || !piles[w].length) {
      piles[w] = shuffle(D.pages.filter(function (p) { return w === 'any' || p.book === w; }));
      if (current && piles[w].length > 1 && piles[w][piles[w].length - 1].id === current.id) piles[w].unshift(piles[w].pop());
    }
    return piles[w].pop();
  }
  function show(p, announce) {
    current = p;
    var b = BOOKS[p.book];
    img.src = p.src;
    img.alt = p.alt || ('A coloring page from ' + b.title);
    words.textContent = p.words || '';
    words.hidden = !p.words;
    from.textContent = 'From ' + b.title + ' (' + b.who + '), picture ' + p.n + ' of ' + b.count;
    save.href = p.src;
    save.setAttribute('download', 'Coloring page - ' + b.title + ' - ' + p.n + '.png');
    book.href = b.book;
    res.hidden = false;
    go.textContent = 'Give me a different page';
    try { history.replaceState(null, '', location.pathname + '?p=' + encodeURIComponent(p.id)); } catch (e) {}
    if (announce) live.textContent = 'New page: ' + img.alt + '.';
  }
  function pick() { show(next(who()), true); }

  function printIt() {
    if (!current) return;
    var f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true');
    f.tabIndex = -1;
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    var url = new URL(current.src, location.href).href;
    f.srcdoc = '<!DOCTYPE html><html><head><title>Coloring page</title><style>@page{size:8.5in 11in;margin:0}' +
      'html,body{margin:0;padding:0;background:#fff}img{display:block;width:8.5in;height:11in}</style></head>' +
      '<body><img src="' + url.replace(/"/g, '&quot;') + '" alt=""></body></html>';
    var done = false;
    f.onload = function () {
      var im = f.contentDocument && f.contentDocument.querySelector('img');
      function go2() {
        if (done) return; done = true;
        try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { window.print(); }
        setTimeout(function () { f.remove(); }, 60000);
      }
      if (im && !im.complete) { im.onload = go2; im.onerror = go2; } else go2();
    };
    document.body.appendChild(f);
  }

  go.addEventListener('click', pick);
  $('[data-cp-again]').addEventListener('click', function () { pick(); img.scrollIntoView({ block: 'nearest' }); });
  $('[data-cp-print]').addEventListener('click', printIt);
  root.addEventListener('change', function (e) {
    if (e.target && e.target.name === 'cp-who' && current) pick();
  });

  var w0 = /[?&]who=(little|big|grown)\b/.exec(location.search);
  if (w0) { var r0 = root.querySelector('input[name="cp-who"][value="' + w0[1] + '"]'); if (r0) r0.checked = true; }
  var m = /[?&]p=([a-z]+-\d+)/.exec(location.search), start = null;
  if (m) D.pages.forEach(function (p) { if (p.id === m[1]) start = p; });
  if (start) {
    var r = root.querySelector('input[name="cp-who"][value="' + start.book + '"]');
    if (r) r.checked = true;
    show(start, false);
  }
})();
