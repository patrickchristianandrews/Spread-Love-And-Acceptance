/* get-downloads.js: the one-time email step for downloads made on pages that can't send it themselves
   (the workpaper pages block outside connections, so their Download PDF opens this page in a new tab).
   Same list and the same device key as book-download.js: the address goes to Buttondown; this device keeps
   only 'tol-book-dl' = '1', never the address. ?next=/path offers a way back. */
(function () {
  'use strict';
  var KEY = 'tol-book-dl', URL = 'https://buttondown.email/api/emails/embed-subscribe/spreadloveandacceptance';
  var form = document.querySelector('.bk-dl-form'), gate = document.querySelector('.bk-dl-gate'), done = document.querySelector('.gd-done');
  if (!form) return;
  var msg = form.querySelector('.bk-dl-msg'), input = form.querySelector('input[type=email]');
  var next = ''; try { next = new URLSearchParams(location.search).get('next') || ''; } catch (e) {}
  if (!/^\/[^\/]/.test(next)) next = '';
  var back = document.getElementById('gd-back');
  if (back && next) { back.href = next; back.textContent = 'Back to where you were'; }
  function finish() {
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    gate.hidden = true; done.hidden = false;
    try { done.querySelector('h2').focus(); } catch (e) {}
  }
  try { if (localStorage.getItem(KEY) === '1') { gate.hidden = true; done.hidden = false; } } catch (e) {}
  function say(t, kind) { msg.textContent = t; msg.className = 'bk-dl-msg' + (kind ? ' is-' + kind : ''); }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = (input.value || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { say('Enter an email address, like name@example.com.', 'error'); input.focus(); return; }
    say('One moment…');
    var settled = false, timer = setTimeout(function () { end(); }, 12000);
    function end() { if (settled) return; settled = true; clearTimeout(timer); finish(); }
    try {
      fetch(URL, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ email: email, embed: '1', tag: 'download' }) }).then(end, end);
    } catch (err) { end(); }
  });
})();
