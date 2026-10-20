/* home.js: small extras for the home page (home18). Nothing here is sent anywhere, and it adds no storage keys.
   - A "What's going on?" choice that this copy of journeys.js can't answer yet becomes a plain link (its data-fallback
     page), so a choice never does nothing (the live journeys.js has no "quietsocial" or "homefam" answer).
   - Old links into the home page (/#start-where, #logic-h, #why-h and so on, from before home18) land on the nearest
     part of the new page.
   - While the first screen is in view, the round floating helpers step aside on a phone, and the corner Help button on
     a short laptop screen (CSS in home.css), so nothing sits over its words. */
(function () {
  'use strict';
  var D = document, root = D.documentElement;

  /* ---------------------------------------------------------------- choices with no answer in journeys.js */
  function fallbacks() {
    var J = window.TOLJourneys, host = D.getElementById('whats-going-on'); if (!host) return;
    var has = {};
    ((J && J.picks) || []).forEach(function (p) { has[p.id] = 1; });
    Array.prototype.forEach.call(host.querySelectorAll('li[data-fallback] [data-wgo]'), function (b) {
      if (has[b.getAttribute('data-wgo')] && b.tagName === 'BUTTON') return;   // journeys.js answers it here
      var li = b.closest('li'), a = D.createElement('a');
      a.className = 'wgo-opt'; a.href = li.getAttribute('data-fallback');
      while (b.firstChild) a.appendChild(b.firstChild);
      b.parentNode.replaceChild(a, b);
    });
  }

  /* ---------------------------------------------------------------- old links into the home page */
  var OLD = { 'start-where': 'whats-going-on', 'sw-h': 'whats-going-on', 'logic-h': 'tools', 'logic': 'tools', 'why-h': 'top', 'why': 'top',
    'whats-here': 'tools', 'hh-map-h': 'tools', 'try': 'top', 'open-free': 'explore', 'contents': 'tools', 'directory': 'tools' };
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

  function start() {
    [fallbacks, oldHash, observer].forEach(function (f) { try { f(); } catch (e) {} });
    window.addEventListener('hashchange', function () { try { oldHash(); } catch (e) {} });
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})();
