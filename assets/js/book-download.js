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

  // listing26: "Read it on iPad, Android or Kindle" under each book. The file downloads as usual, and a few lines
  // under the buttons say how to open it on that device (the email step comes first, the same as every download).
  var HOW = {
    ipad: {
      epub: 'Saved to your iPad. Open the <b>Files</b> app, go to <b>Downloads</b> and tap the book. Tap the Share button (the square with the arrow) and choose <b>Books</b>. It stays in Apple Books, which remembers your page. Tap <b>Aa</b> to change the text size.',
      pdf: 'Saved to your iPad. Open the <b>Files</b> app, go to <b>Downloads</b> and tap the book. To keep it with your books, tap Share and choose <b>Books</b>. To color on a page, open it in Files and tap the pen (Markup).'
    },
    android: {
      epub: 'Saved to your Downloads. Open it with <b>Google Play Books</b> (free on the Play Store): tap the file, then choose Play Books. It remembers your page, and <b>Aa</b> changes the text size.',
      pdf: 'Saved to your Downloads. Open it with <b>Google Play Books</b> or any PDF app. To color on a page, use a free PDF app with a pen tool, such as Adobe Acrobat Reader or Xodo.'
    },
    kindle: {
      epub: 'To send it to your Kindle: on a computer or phone, go to <b>amazon.com/sendtokindle</b>, sign in with your Amazon account and drop this file in. In a few minutes it appears on your Kindle and in the Kindle app, under Library.',
      pdf: 'To send it to your Kindle: go to <b>amazon.com/sendtokindle</b>, sign in with your Amazon account and drop this file in. It shows each page as printed, so it looks best on a Kindle tablet or the Kindle app on a phone or tablet.'
    }
  };
  Array.prototype.forEach.call(document.querySelectorAll('.bk-dl-devlink'), function (a) {
    a.addEventListener('click', function () {
      if (!unlocked()) return;
      var how = a.closest('.bk-dl-dev'); how = how && how.nextElementSibling;
      var t = HOW[a.getAttribute('data-dev')]; if (!how || !t) return;
      how.innerHTML = t[a.getAttribute('data-kind') === 'pdf' ? 'pdf' : 'epub']; how.hidden = false;
    });
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
