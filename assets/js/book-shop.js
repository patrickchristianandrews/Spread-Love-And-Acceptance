/* book-shop.js: where to buy the print books (print12). The print books are optional; everything stays free online.
   One entry per book (the ids in tools/book/series.json). Paste a full https:// address to show a button:
     direct   the shop on this site (a print-on-demand store)
     amazon   the book's Amazon page
     ingram   a page where any bookshop or library can order it
   While a link is empty, its button stays hidden, and so does the "Get it in print" row when all three are empty.
   Never put an address here that you haven't checked yourself. */
window.TOLBookShop = {
  'book-1-know-yourself-kindly': { direct: '', amazon: '', ingram: '' },
  'book-2-heal-and-steady':      { direct: '', amazon: '', ingram: '' },
  'book-3-understanding-each-other': { direct: '', amazon: '', ingram: '' },
  'book-4-share-the-load':       { direct: '', amazon: '', ingram: '' },
  'workbook':                    { direct: '', amazon: '', ingram: '' },
  'pocket-the-logic-behind-it':  { direct: '', amazon: '', ingram: '' }
};
(function () {
  function ok(u) { return typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/.test(u); }
  function apply() {
    var shop = window.TOLBookShop || {}, live = false;
    document.querySelectorAll('[data-shop-book]').forEach(function (row) {
      var links = shop[row.getAttribute('data-shop-book')] || {}, any = false;
      row.querySelectorAll('a[data-shop]').forEach(function (a) {
        var u = links[a.getAttribute('data-shop')];
        if (ok(u)) { a.href = u; a.rel = 'noopener'; a.hidden = false; any = true; } else { a.removeAttribute('href'); a.hidden = true; }
      });
      row.hidden = !any;
      if (any) live = true;
    });
    // "Paperbacks: coming to Amazon soon" holds only until the first shop link is filled in
    if (live) document.querySelectorAll('[data-shop-soon]').forEach(function (p) { p.textContent = 'The paperbacks are optional. Everything here stays free to read online.'; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
})();
