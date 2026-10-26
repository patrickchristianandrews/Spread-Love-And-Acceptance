/* return-contact.js: the Contact page (/contact.html), return21.
   - Contact: the email address and what helps in a message (no form: a static site cannot send email itself).
   - Email updates: the address goes to Buttondown (tag "contact-page"), the same way the site's other forms send it.
   - Share: the site's share sheet (window.TOLShare) with the page for people who were sent a link. */
(function () {
  'use strict';
  var SIGNUP = 'https://buttondown.email/api/emails/embed-subscribe/spreadloveandacceptance';
  var SHARE_URL = 'https://spreadloveandacceptance.com/someone-sent-you-this.html';
  function $(id) { return document.getElementById(id); }

  function start() {
    // email updates
    var sf = $('ct-signup'), ssay = $('ct-signup-say');
    if (sf) sf.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('ct-email'), email = (input.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { ssay.textContent = 'Enter an email address, like name@example.com.'; input.focus(); return; }
      ssay.textContent = 'One moment…';
      var settled = false, timer = setTimeout(function () { done(false); }, 12000);
      function done(okay) {
        if (settled) return; settled = true; clearTimeout(timer);
        if (okay) {
          ssay.textContent = 'Thank you. You’re on the list. Buttondown may send a confirmation email first, and confirming keeps you on it.';
          try { var s = JSON.parse(localStorage.getItem('tol-return-v1') || '{}') || {}; s.nl = 'yes'; localStorage.setItem('tol-return-v1', JSON.stringify(s)); } catch (x) {}
          input.value = '';
        } else ssay.textContent = 'We couldn’t reach the newsletter just now, so you’re not on the list yet. Please try again in a little while.';
      }
      if (navigator.onLine === false) { done(false); return; }
      try { fetch(SIGNUP, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ email: email, embed: '1', tag: 'contact-page' }) }).then(function () { done(true); }, function () { done(false); }); }
      catch (err) { done(false); }
    });

    // share
    var sb = $('ct-share'), shsay = $('ct-share-say');
    if (sb) sb.addEventListener('click', function () {
      var o = { title: 'Spread Love & Acceptance', text: 'I found this free site with kind, practical help for getting along at home. No sign-up, and nothing you type leaves your phone.', url: SHARE_URL };
      if (window.TOLShare && window.TOLShare.open) { window.TOLShare.open(o); return; }
      if (navigator.share) { navigator.share(o).catch(function () {}); return; }
      try { navigator.clipboard.writeText(o.text + ' ' + o.url).then(function () { shsay.textContent = 'Link copied. Paste it in a message to a friend.'; }); } catch (e) { shsay.textContent = 'Copy this link: ' + o.url; }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
