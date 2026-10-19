/* wpf-print.js: the "Print this form" button on the free fill-in workpapers and the Workpaper Suite.
   Any button with data-wpf-print opens the browser's print dialog. The print layout itself (only the form,
   no menus, notes or suggestion chips) lives in tol-workpaper.css under @media print, so Ctrl+P looks the same.
   tools16: just before printing (the button or Ctrl+P), each box on the form gets a plain copy of what's in it,
   so the paper shows a clean worksheet: words on lines, no drop-down arrows, no grey example text, nothing cut
   off at the edge of a box. A box nobody filled in prints as an empty line to write on. The copies are removed
   again straight after printing; nothing is saved or sent.
   External file because these pages allow no inline scripts. */
(function () {
  'use strict';
  var FIELDS = 'input[type="text"], input[type="number"], input[type="date"], input[type="email"], input[type="tel"], input:not([type]), select, textarea';
  var SKIP = '.wpf-chips, .wpf-lib, .wpf-example, .wpf-share, .wpf-share-in, .wpf-bar, .wpf-how, .ws-paste, [hidden]';
  function niceDate(v) {
    var m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(v || ''); if (!m) return v;
    try { return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return v; }
  }
  function undo() {
    var old = document.querySelectorAll('.wpf-pv'); for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
    var src = document.querySelectorAll('.wpf-pv-src'); for (var j = 0; j < src.length; j++) src[j].classList.remove('wpf-pv-src');
  }
  function prep() {
    undo();
    var host = document.querySelector('.ws-sheet:not([hidden])') || document.getElementById('wpf-root');
    if (!host) return;
    var els = host.querySelectorAll(FIELDS);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.closest(SKIP) || el.type === 'hidden') continue;
      var txt = '';
      if (el.tagName === 'SELECT') { var o = el.options[el.selectedIndex]; txt = o && el.value !== '' ? o.text : ''; if (/^[\s—–-]*$/.test(txt)) txt = ''; }
      else txt = el.type === 'date' ? niceDate(el.value) : el.value;
      var s = document.createElement('span');
      s.className = 'wpf-pv' + (txt ? '' : ' is-blank') + (el.tagName === 'TEXTAREA' ? ' is-long' : '');
      s.setAttribute('aria-hidden', 'true');
      s.textContent = txt || ' ';
      el.classList.add('wpf-pv-src');
      el.parentNode.insertBefore(s, el.nextSibling);
    }
  }
  function wire() {
    var btns = document.querySelectorAll('[data-wpf-print]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        if (typeof window.print === 'function') window.print();
      });
    }
  }
  window.addEventListener('beforeprint', prep);
  window.addEventListener('afterprint', undo);
  window.TOLWpfPrint = { prep: prep, undo: undo };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
