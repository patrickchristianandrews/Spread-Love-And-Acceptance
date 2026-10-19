/* home.js: small extras for the home page (home16). Nothing here is sent anywhere, and it adds no storage keys.
   - "Get the paperback" under the covers shows only once a book has a shop link in book-shop.js.
   - "Try an example" in "Check a text before you send it": fills in one made-up, neutral message and checks it.
   - Tidbit and Sugarfoot, drawn still (pups.js) on the arcade card in "Meet the friends".
   - "Every situation" opens when a link or the address points at #start-where.
   - While the first card's chooser is on a phone screen, and while Professor Puddles' card is in view, the round
     floating helpers step aside (CSS in index.html). */
(function () {
  'use strict';
  var D = document, root = D.documentElement;

  /* ---------------------------------------------------------------- Try an example */
  var EXAMPLE = 'Why didn’t you do the dishes again?';
  function tryExample() {
    var box = D.querySelector('.hm-try [data-message-check-mini]'); if (!box) return;
    function add() {
      var row = box.querySelector('.mcm-row'), go = box.querySelector('.mcm-go'), ta = box.querySelector('textarea');
      if (!row || !go || !ta || box.querySelector('.hm-ex')) return !!(row && box.querySelector('.hm-ex'));
      var b = D.createElement('button'); b.type = 'button'; b.className = 'hm-ex'; b.textContent = 'Try an example';
      go.after(b);
      var note = D.createElement('p'); note.className = 'mcm-sub no-bubble hm-ex-note'; note.hidden = true;
      note.textContent = 'A made-up example. Type your own any time: it stays on your device.';
      row.after(note);
      b.addEventListener('click', function () {
        ta.value = EXAMPLE;
        note.hidden = false;
        go.click();
      });
      return true;
    }
    if (add()) return;
    if (!('MutationObserver' in window)) return;
    var mo = new MutationObserver(function () { if (add()) mo.disconnect(); });
    mo.observe(box, { childList: true, subtree: true });
  }

  /* ---------------------------------------------------------------- "Get the paperback" shows once any book has a shop link (book-shop.js) */
  function printLink() {
    var a = D.querySelector('[data-hm-print]'); if (!a) return;
    a.hidden = !D.querySelector('.hm-bk [data-shop-book]:not([hidden])');
  }

  /* ---------------------------------------------------------------- the pups on the arcade card (drawn once, still) */
  function pups() {
    var c = D.querySelector('canvas[data-hm-pups]'); if (!c || !c.getContext) return;
    var n = 0;
    (function go() {
      var P = window.TOLPups;
      if (!P) { if (++n < 40) setTimeout(go, 150); return; }
      var x = c.getContext('2d'), w = c.width, h = c.height, s = h / 82;
      x.clearRect(0, 0, w, h);
      // Sugarfoot on the left and Tidbit on the right, sitting side by side and facing each other
      x.save(); x.translate(w * 0.24, h * 0.95); x.scale(s, s); try { P.draw(x, P.looks.drop, 'sit', 0, 0.2, false, 0, 0); } catch (e) {} x.restore();
      x.save(); x.translate(w * 0.76, h * 0.95); x.scale(-s, s); try { P.draw(x, P.looks.collar, 'sit', 0, 0.2, false, 0, 0); } catch (e) {} x.restore();
    })();
  }

  /* ---------------------------------------------------------------- "Every situation" opens for #start-where */
  function situations() {
    var d = D.getElementById('start-where'); if (!d || d.tagName !== 'DETAILS') return;
    function open() { d.open = true; }
    if (location.hash === '#start-where') { open(); setTimeout(function () { try { d.scrollIntoView({ block: 'start' }); } catch (e) {} }, 60); }
    window.addEventListener('hashchange', function () { if (location.hash === '#start-where') open(); });
    D.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[href="#start-where"], a[href="/index.html#start-where"], a[href="/#start-where"]'); if (a) open(); }, true);
  }

  /* ---------------------------------------------------------------- the floating helpers step aside */
  function observers() {
    if (!('IntersectionObserver' in window)) return;
    var card = D.querySelector('.hm-friends .hh-pud');
    if (card) new IntersectionObserver(function (es) { root.classList.toggle('hh-pud-on', es[0].isIntersecting); }).observe(card);
    var top = D.querySelector('.hh .hh-wgo');
    if (top) new IntersectionObserver(function (es) { root.classList.toggle('hh-top-on', es[0].isIntersecting); }).observe(top);
  }

  function start() {
    [tryExample, printLink, pups, situations, observers].forEach(function (f) { try { f(); } catch (e) {} });
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})();
