/* book-topic.js — the "On your own / With others" switch on the book's topic pages (book/topic-*.html).
   Each chapter section holds two short versions: <div class="bt-v" data-bt-v="self"> and data-bt-v="others".
   The switch shows one at a time, remembers the choice in this browser (tol-booktopic-v), and also
   honours #own or #others in the address. The tools list marks which tools fit the version shown. */
(function () {
  'use strict';
  var sw = document.querySelector('.bt-switch'); if (!sw) return;
  var KEY = 'tol-booktopic-v';
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function show(v, remember) {
    if (v !== 'self' && v !== 'others') v = 'self';
    Array.prototype.forEach.call(document.querySelectorAll('.bt-opt'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-bt') === v)); });
    Array.prototype.forEach.call(document.querySelectorAll('.bt-v'), function (d) { d.hidden = d.getAttribute('data-bt-v') !== v; });
    Array.prototype.forEach.call(document.querySelectorAll('.bt-tools li[data-for]'), function (li) {
      var f = li.getAttribute('data-for'); li.classList.toggle('is-dim', f !== 'both' && f !== v);
    });
    document.documentElement.setAttribute('data-bt', v);
    if (remember) set(v);
  }
  sw.addEventListener('click', function (e) { var b = e.target.closest('.bt-opt'); if (b) show(b.getAttribute('data-bt'), true); });
  var h = (location.hash || '').slice(1);
  show(h === 'others' ? 'others' : h === 'own' ? 'self' : get() || 'self', false);
})();
