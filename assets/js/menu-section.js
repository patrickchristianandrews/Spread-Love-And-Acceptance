/* menu-section.js: one page for every list in the site menu (/section.html?g=play&s=games).
   It reads the same MENU array the top bar and the Menu panel use (site.js shares it as window.TOLSiteMap), so a page added
   to the menu shows up here with no second list to keep. Shows the list's name and paragraph, then every page in it with its
   one-line note, a way back to the area, and the area's other lists. With no list named (or one that is not in the menu) it
   shows the area's lists, or every area's. Nothing is stored or sent. */
(function () {
  'use strict';
  var root = document.querySelector('[data-ms-root]');
  if (!root) return;
  var M = window.TOLSiteMap, SITE = 'Spread Love & Acceptance';
  if (!M || !M.menu) { root.innerHTML = '<p>The list didn’t load. <a href="/explore.html">Everything on this site</a> has every page.</p>'; return; }

  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function attr(s) { return esc(s).replace(/"/g, '&quot;'); }
  function param(k) { var m = new RegExp('[?&]' + k + '=([^&#]*)').exec(location.search); try { return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : ''; } catch (e) { return ''; } }
  function count(n) { return n + (n === 1 ? ' page' : ' pages'); }
  function setMeta(title, desc) {
    document.title = title + ' · ' + SITE;
    var d = document.querySelector('meta[name="description"]');
    if (d) d.setAttribute('content', desc);
  }
  function put(code, h1) {
    var c = document.querySelector('[data-ms-code]'), h = document.querySelector('[data-ms-h1]');
    if (c) c.textContent = code; if (h) h.textContent = h1;
  }
  function crumbs(parts) {
    return '<nav class="tol-where ms-where no-bubble" aria-label="Where you are"><ol><li><a href="/index.html">Home</a></li>' +
      parts.map(function (p, i) { return '<li>' + (p[1] && i < parts.length - 1 ? '<a href="' + attr(p[1]) + '">' + esc(p[0]) + '</a>' : '<span aria-current="page">' + esc(p[0]) + '</span>') + '</li>'; }).join('') + '</ol></nav>';
  }
  function cards(g, lists, here) {
    return '<ul class="ms-cards no-bubble no-cheer">' + lists.filter(function (L) { return L.id !== here; }).map(function (L) {
      return '<li><a class="ms-card" href="' + attr(L.all) + '"><span class="ms-card-t">' + esc(L.name) + '</span>' +
        (L.desc ? '<span class="ms-card-p">' + esc(L.desc) + '</span>' : '') + '<span class="ms-card-n">' + count(L.n || L.items.length) + ' &rarr;</span></a></li>';
    }).join('') + '</ul>';
  }
  function area(id) { return M.menu.filter(function (x) { return x.id === id; })[0] || null; }

  var gid = param('g'), sid = param('s'), g = area(gid), lists = g ? M.lists(gid) : [], L = null;
  lists.forEach(function (x) { if (x.id === sid) L = x; });

  if (g && L) {
    var n = L.items.length;
    put(g.title || g.name, L.name);
    setMeta(L.name + ' · ' + (g.title || g.name), (L.desc || (L.name + ' in ' + (g.title || g.name) + '.')) + ' ' + count(n) + ', each with a one-line note.');
    var html = crumbs([[g.title || g.name, g.all || '/explore.html'], [L.name, '']]);
    if (L.desc) html += '<p class="simple-lede ms-lede no-bubble">' + esc(L.desc) + '</p>';
    html += '<p class="ms-count no-bubble" aria-live="polite">' + count(n) + ' in this list</p>';
    html += '<ul class="ms-list no-bubble no-cheer" aria-label="' + attr(L.name) + '">' + L.items.map(function (it) {
      var t = it.title || (M.plainLabel && M.plainLabel(it.href)) || it.href;
      return '<li><a class="ms-item" href="' + attr(it.href) + '"' + (it.lang ? ' lang="' + attr(it.lang) + '"' : '') + '><span class="ms-t">' + esc(t) + '</span>' + (it.note ? '<span class="ms-n">' + esc(it.note) + '</span>' : '') + '</a></li>';
    }).join('') + '</ul>';
    var more = [];
    if (L.hub && L.hub !== L.all) more.push('<a href="' + attr(L.hub) + '">' + esc(L.hubLabel || 'See a bigger list') + ' &rarr;</a>');
    if (g.all) more.push('<a href="' + attr(g.all) + '">' + esc(g.allLabel || ('Everything in ' + (g.title || g.name))) + ' &rarr;</a>');
    if (more.length) html += '<p class="ms-more no-bubble">' + more.join(' <span aria-hidden="true">&middot;</span> ') + '</p>';
    if (lists.length > 1) html += '<section class="ms-sibs" aria-labelledby="ms-sibs-h"><h2 id="ms-sibs-h">More in ' + esc(g.title || g.name) + '</h2>' + cards(g, lists, L.id) + '</section>';
    root.innerHTML = html;
    return;
  }

  if (g) {
    put(g.title || g.name, g.title || g.name);
    setMeta(g.title || g.name, (g.blurb || ('Every list in ' + (g.title || g.name) + '.')) + ' Choose a list to see its pages.');
    root.innerHTML = crumbs([[g.title || g.name, '']]) + (g.blurb ? '<p class="simple-lede ms-lede no-bubble">' + esc(g.blurb) + '</p>' : '') + cards(g, lists, '') +
      (g.all ? '<p class="ms-more no-bubble"><a href="' + attr(g.all) + '">' + esc(g.allLabel || ('Everything in ' + (g.title || g.name))) + ' &rarr;</a></p>' : '');
    return;
  }

  put('Lists in the menu', 'Lists in the menu');
  setMeta('Lists in the menu', 'Every list in the site menu, with what is in it and a one-line note on each page. Free, with no sign-up.');
  root.innerHTML = crumbs([['Lists in the menu', '']]) + '<p class="simple-lede ms-lede no-bubble">Every area of the menu, and the lists inside it. Choose one to see all of its pages.</p>' +
    M.menu.filter(function (x) { return M.lists(x.id).length; }).map(function (x) {
      return '<section class="ms-area" aria-labelledby="ms-a-' + attr(x.id) + '"><h2 id="ms-a-' + attr(x.id) + '"><a href="' + attr('/section.html?g=' + x.id) + '">' + esc(x.title || x.name) + '</a></h2>' + cards(x, M.lists(x.id), '') + '</section>';
    }).join('') + '<p class="ms-more no-bubble"><a href="/explore.html">Everything on this site &rarr;</a></p>';
})();
