/* wpf-print.js: the "Print this form" button on the free fill-in workpapers and the Workpaper Suite.
   Any button with data-wpf-print opens the browser's print dialog. The print layout itself (only the form,
   no menus, notes or suggestion chips) lives in tol-workpaper.css under @media print, so Ctrl+P looks the same.
   External file because these pages allow no inline scripts. */
(function () {
  'use strict';
  function wire() {
    var btns = document.querySelectorAll('[data-wpf-print]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        if (typeof window.print === 'function') window.print();
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
