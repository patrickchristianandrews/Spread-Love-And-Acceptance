/* book-download.js: the book's PDF downloads open after an email address is given (owner's choice).
   The address goes to Buttondown (the email updates list), the same way the site's sign-up form sends it.
   This device then remembers only that the downloads are unlocked ('tol-book-dl'), never the address.
   owner17: the four books (book/print/book-N-*.pdf) and the big collections (book/pdf/*.pdf) ask for the email
   (links with class bk-dl-file or bk-dl-kit-file). Owner, 21 Oct: the workbook and the pocket guide (class bk-dl-nomail) ask too.
   The page counts and sizes on the buttons are read again from /book/print/series.json, so they always match the files.
   A link to #whole, #for-yourself, #together or #understanding opens "Everything in one PDF (long)" there. */
(function () {
  'use strict';
  var KEY = 'tol-book-dl', URL = 'https://buttondown.email/api/emails/embed-subscribe/spreadloveandacceptance';
  var gate = document.querySelector('.bk-dl-gate'), form = document.querySelector('.bk-dl-form');
  if (!gate || !form) return;
  var msg = form.querySelector('.bk-dl-msg'), input = form.querySelector('input[type=email]');
  var files = document.querySelectorAll('.bk-dl-file, .bk-dl-kit-file, .bk-dl-nomail'), wanted = null;
  function unlocked() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function paint() {
    var on = unlocked();
    document.documentElement.classList.toggle('bk-dl-on', on);
    gate.hidden = on;
    Array.prototype.forEach.call(files, function (a) { a.setAttribute('aria-disabled', String(!on)); });
  }
  function say(t, kind) { msg.textContent = t; msg.className = 'bk-dl-msg' + (kind ? ' is-' + kind : ''); }
  function nameOf(a) {
    if (a.getAttribute('data-name')) return a.getAttribute('data-name');
    var box = a.closest('section, li'), h = box && box.querySelector('h2, h3');
    return h ? h.textContent.trim() : 'the book';
  }
  function open() {
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    paint();
    var a = wanted; wanted = null;
    if (a) {
      var d = a.closest('details'); if (d) d.open = true;
      a.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(function () { a.click(); try { a.focus({ preventScroll: true }); } catch (e) {} }, 150);
      return;
    }
    var first = document.querySelector('.bk-dl-four, .bk-dl-cards'); if (first) first.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  // a download tapped before the address is in: remember it and send them to the form
  Array.prototype.forEach.call(files, function (a) {
    a.addEventListener('click', function (e) {
      if (unlocked()) return;
      e.preventDefault(); wanted = a;
      gate.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(function () { input.focus(); }, 300);
      say('Enter your email address to download ' + nameOf(a) + '.');
    });
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = (input.value || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { say('Enter an email address, like name@example.com.', 'error'); input.focus(); return; }
    say('One moment…');
    var settled = false, timer = setTimeout(function () { done(false); }, 12000);
    function done(ok) {
      if (settled) return; settled = true; clearTimeout(timer);
      say(ok ? 'Thank you. Your downloads are ready below. Buttondown may send a confirmation email first.'
             : 'We couldn’t reach the email service just now, so you may not be on the list yet. Your downloads are ready below anyway.', ok ? 'ok' : 'warn');
      open();
    }
    try {
      fetch(URL, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ email: email, embed: '1', tag: 'book-pdf' }) })
        .then(function () { done(true); }, function () { done(false); });
    } catch (err) { done(false); }
  });

  // arriving at download.html#whole (a collection, folded away under "Everything in one PDF"): open it there
  function toHash() {
    var id = ''; try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) {}
    var t = id && document.getElementById(id), d = t && t.closest('details');
    if (d && !d.open) { d.open = true; setTimeout(function () { t.scrollIntoView({ block: 'start' }); }, 0); }
  }
  toHash();
  window.addEventListener('hashchange', toHash);

  // the page counts and sizes, read from the built files' own list, so a rebuild never leaves them out of date
  var metas = document.querySelectorAll('[data-series] [data-series-meta]');
  if (metas.length && window.fetch) {
    fetch('/book/print/series.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      var books = j && j.books; if (!books) return;
      Array.prototype.forEach.call(metas, function (m) {
        var a = m.closest('[data-series]'), b = books[a.getAttribute('data-series')];
        if (!b || !b.pages) return;
        // only when the link still points at that book's file
        if (b.pdf && (a.getAttribute('href') || '').split('/').pop() !== b.pdf) return;
        m.textContent = b.pages + ' pages' + (b.bytes ? ' · ' + (b.bytes / 1048576).toFixed(1) + ' MB' : '');
      });
    }).catch(function () {});
  }
  paint();
})();
