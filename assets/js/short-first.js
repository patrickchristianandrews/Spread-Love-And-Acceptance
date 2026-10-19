/* short-first.js (panel16, pages16): the "Read more" folds on long guide pages (details.sf-more, see
   assets/css/short-first.css). A link or an address (#id) that points inside a fold opens it first; "Show me only the
   steps" and printing open them all, so nothing is ever out of reach. No storage, nothing sent. */
(function () {
  'use strict';
  var D = document;
  function folds() { return D.querySelectorAll('main details.sf-more'); }
  function openFor(id, scroll) {
    if (!id) return;
    var el = null; try { el = D.getElementById(decodeURIComponent(id)); } catch (e) { el = null; }
    if (!el) return;
    // a link to a section's heading opens that section's fold too (data-sf-for names the heading it belongs to)
    var own = el.id ? D.querySelector('details.sf-more[data-sf-for="' + el.id.replace(/["\\]/g, '') + '"]') : null;
    if (own && !own.open) own.open = true;
    var d = el.closest('details.sf-more'), shut = false;
    while (d) { if (!d.open) { d.open = true; shut = true; } d = d.parentElement && d.parentElement.closest('details.sf-more'); }
    if (shut && scroll) { try { el.scrollIntoView({ block: 'start' }); } catch (e2) { el.scrollIntoView(); } }
  }
  function fromHash(scroll) { openFor((location.hash || '').slice(1), scroll); }
  window.addEventListener('hashchange', function () { fromHash(true); });
  // the same in-page link twice gives no hashchange; open on the click itself
  D.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
    openFor(a.getAttribute('href').slice(1), false);
  }, true);
  function allOpen() { Array.prototype.forEach.call(folds(), function (d) { d.open = true; }); }
  window.addEventListener('beforeprint', allOpen);
  try {
    new MutationObserver(function () { if (D.documentElement.classList.contains('tol-only-steps')) allOpen(); })
      .observe(D.documentElement, { attributes: true, attributeFilter: ['class'] });
  } catch (e) {}
  function start() { fromHash(true); if (D.documentElement.classList.contains('tol-only-steps')) allOpen(); }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
  window.addEventListener('load', function () { setTimeout(function () { fromHash(true); }, 50); });
})();
