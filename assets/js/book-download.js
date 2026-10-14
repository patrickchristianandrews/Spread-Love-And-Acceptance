/* book-download.js: the book's PDF downloads open after an email address is given (owner's choice).
   The address goes to Buttondown (the email updates list), the same way the site's sign-up form sends it.
   This device then remembers only that the downloads are unlocked ('tol-book-dl'), never the address. */
(function () {
  'use strict';
  var KEY = 'tol-book-dl', URL = 'https://buttondown.email/api/emails/embed-subscribe/spreadloveandacceptance';
  var gate = document.querySelector('.bk-dl-gate'), form = document.querySelector('.bk-dl-form');
  if (!gate || !form) return;
  var msg = form.querySelector('.bk-dl-msg'), input = form.querySelector('input[type=email]');
  var files = document.querySelectorAll('.bk-dl-file, .bk-dl-kit-file'), wanted = null;
  function unlocked() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function paint() {
    var on = unlocked();
    document.documentElement.classList.toggle('bk-dl-on', on);
    gate.hidden = on;
    Array.prototype.forEach.call(files, function (a) { a.setAttribute('aria-disabled', String(!on)); });
  }
  function say(t, kind) { msg.textContent = t; msg.className = 'bk-dl-msg' + (kind ? ' is-' + kind : ''); }
  function open() {
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    paint();
    if (wanted) { var a = wanted; wanted = null; setTimeout(function () { a.click(); }, 150); }
    var first = document.querySelector('.bk-dl-cards'); if (first) first.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  // a download tapped before the address is in: remember it and send them to the form
  Array.prototype.forEach.call(files, function (a) {
    a.addEventListener('click', function (e) {
      if (unlocked()) return;
      e.preventDefault(); wanted = a;
      gate.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(function () { input.focus(); }, 300);
      say('Enter your email address to download “' + (a.closest('section').querySelector('h2').textContent) + '”.');
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
  // arriving at download.html#together etc: show that package
  paint();
})();
