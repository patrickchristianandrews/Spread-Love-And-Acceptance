/* go.js: the "From the books" pages. A printed code opens /go/<list>#<card>: that card is highlighted, scrolled to and gets a
   short "From your book" line, so the reader sees at once what they came for. Marks the current list in the bottom links.
   Nothing is stored or sent. */
(function () {
  'use strict';
  var here = location.pathname.replace(/\.html$/, '') + '.html';
  document.querySelectorAll('.go-nav a').forEach(function (a) { if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page'); });
  function mark() {
    var id = decodeURIComponent((location.hash || '').slice(1));
    document.querySelectorAll('.go-card.is-here').forEach(function (c) { c.classList.remove('is-here'); var n = c.querySelector('.go-here'); if (n) n.remove(); });
    if (!id) return;
    var card = document.getElementById(id);
    if (!card || !card.classList.contains('go-card')) return;
    card.classList.add('is-here');
    var p = document.createElement('p'); p.className = 'go-here'; p.textContent = 'From your book';
    card.insertBefore(p, card.firstChild);
    setTimeout(function () { card.scrollIntoView({ block: 'center' }); var o = card.querySelector('.go-open'); if (o) o.focus({ preventScroll: true }); }, 60);
  }
  window.addEventListener('hashchange', mark);
  mark();
})();
