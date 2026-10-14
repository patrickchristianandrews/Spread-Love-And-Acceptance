/* lock-boot.js — the app lock's first moment (see progress.js). tools/seo/build_seo.py loads it at the top of every
   page's <head>, before anything paints. When the app lock is on, the page starts hidden; site.js then loads
   progress.js, which shows the lock screen or lets the page through. Without it, a page could show for a moment
   before the lock covers it. It is an external file (never inline) so the strict-CSP worksheet pages can run it.
   Never on /safety.html or /upset-right-now.html, never inside a frame. It reads one key ('tol-lock-v1') and
   stores nothing. The lock is a privacy screen, not encryption, so if the rest of the page's scripts never
   arrive, the page is shown again rather than left blank. */
(function () {
  'use strict';
  try {
    if (/^\/(safety|upset-right-now)\.html$/.test(location.pathname)) return;
    if (window.self !== window.top) return;
    if ((localStorage.getItem('tol-lock-v1') || '').indexOf('"on":1') <= 0) return;
    var h = document.documentElement;
    h.style.visibility = 'hidden';
    window.addEventListener('load', function () {
      setTimeout(function () {
        if (!window.TOLProgress && !document.querySelector('.tp-lock')) h.style.visibility = '';
      }, 10000);
    });
  } catch (e) {}
})();
