/* home.js: small extras for the home page (home28). Nothing here is sent anywhere, and it adds no storage keys.
   - Old links into the home page (/#start-where, #logic-h, #why-h and so on, from before) land on the nearest part of the page.
   - While the first screen is in view, the round floating helpers step aside on a phone, and the corner Help button on
     a short laptop screen (CSS in home.css), so nothing sits over its words.
   - "Pick up where you left off": the three most recent saved places, shown only when there is something saved (and not
     already shown in the Welcome back panel, which this-week.js draws above the question). */
(function () {
  'use strict';
  var D = document, root = D.documentElement;

  /* ---------------------------------------------------------------- old links into the home page */
  var OLD = { 'start-where': 'what-to-do', 'sw-h': 'what-to-do', 'logic-h': 'what-to-do', 'logic': 'what-to-do', 'why-h': 'top', 'why': 'top',
    'whats-here': 'what-to-do', 'hh-map-h': 'what-to-do', 'try': 'top', 'open-free': 'explore', 'contents': 'what-to-do', 'directory': 'what-to-do',
    'tools': 'tools-worth-trying', 'friends': 'what-to-do', 'worth-a-look': 'what-to-do', 'tool-spotlight': 'tools-worth-trying' };
  function oldHash() {
    var id = decodeURIComponent((location.hash || '').slice(1)); if (!id || D.getElementById(id) || !OLD[id]) return;
    var t = D.getElementById(OLD[id]); if (!t) return;
    try { t.scrollIntoView({ block: 'start' }); } catch (e) { t.scrollIntoView(); }
  }

  /* ---------------------------------------------------------------- the floating helpers step aside over the first screen */
  function observer() {
    var top = D.querySelector('[data-h18-top]');
    if (top && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { root.classList.toggle('h18-top', es[0].isIntersecting); }).observe(top);
  }

  /* ---------------------------------------------------------------- "Pick up where you left off"
     Reads the bookmarks' own keys (tol-saved, tol-lastread; see bookmarks.js); shows the three most recent, newest first.
     Hidden while the app lock is on, and for anyone with nothing saved. */
  function resume() {
    var box = D.getElementById('pick-up'); if (!box) return;
    if (root.style.visibility === 'hidden' || D.querySelector('.tp-lock')) return;
    function read(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
    var items = [], seen = {};
    function add(url, title, at, kind, spot) {
      var path = String(url || '').split('#')[0]; if (!path || seen[path] || !/^\//.test(path)) return;
      seen[path] = 1; items.push({ path: path, title: String(title || path), at: +new Date(at) || 0, kind: kind, spot: spot });
    }
    var last = read('tol-lastread', {});
    Object.keys(last).forEach(function (u) { var r = last[u] || {}; add(u, r.title, r.at, 'Where you stopped reading', true); });
    read('tol-saved', []).forEach(function (x) { if (x) add(x.url, x.title, x.at, x.spot ? 'Your marked place' : 'Saved', !!x.spot); });
    if (!items.length) return;   // nothing saved yet: the section stays out of sight
    items.sort(function (a, b) { return b.at - a.at; });
    var ul = box.querySelector('.h-resume-list');
    items.slice(0, 3).forEach(function (it) {
      var li = D.createElement('li'), a = D.createElement('a');
      a.className = 'h-resume-item'; a.href = it.path + (it.spot ? '#saved-spot' : '');
      var t = D.createElement('span'); t.className = 'h-resume-t'; t.textContent = it.title.replace(/\s*[·|]\s*Spread Love.*$/, '');
      var k = D.createElement('span'); k.className = 'h-resume-k'; k.textContent = it.kind;
      a.appendChild(t); a.appendChild(k); li.appendChild(a); ul.appendChild(li);
    });
    box.hidden = false;
  }

  function start() {
    [oldHash, observer, resume].forEach(function (f) { try { f(); } catch (e) {} });
    window.addEventListener('hashchange', function () { try { oldHash(); } catch (e) {} });
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})();
