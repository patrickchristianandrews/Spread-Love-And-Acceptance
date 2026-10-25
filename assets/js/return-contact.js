/* return-contact.js: the Contact page (/contact.html), return21.
   - Feedback: topic chips, an optional page, a note, "OK to quote me" and, if asked, the screen size and browser.
     "Open it in my email app" builds a mailto: link with a subject and the note written out, so the visitor's own
     email app sends it (or not). "Copy the note instead" copies the same text. Nothing is sent from this page.
     The draft is kept in this tab only (sessionStorage 'tol-contact-draft') so a slip of the Back button loses
     nothing; it is gone when the tab closes.
   - Email updates: the address goes to Buttondown (tag "contact-page"), the same way the site's other forms send it.
   - Share: the site's share sheet (window.TOLShare) with the page for people who were sent a link. */
(function () {
  'use strict';
  var TO = 'spreadloveandacceptance@gmail.com';
  var SIGNUP = 'https://buttondown.email/api/emails/embed-subscribe/spreadloveandacceptance';
  var DRAFT = 'tol-contact-draft';
  var SHARE_URL = 'https://spreadloveandacceptance.com/someone-sent-you-this.html';
  function $(id) { return document.getElementById(id); }

  function start() {
    var form = $('ct-form'); if (!form) return;
    var note = $('ct-note'), page = $('ct-page'), quote = $('ct-quote'), device = $('ct-device'), say = $('ct-say');

    // came here from another page of the site: offer it as the page, without saying anything about it
    try {
      var ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.origin === location.origin && ref.pathname !== location.pathname && !page.value) {
        var t = ref.pathname.replace(/^\/+|\.html$/g, '').replace(/\/index$/, '') || 'home page';
        page.placeholder = 'For example: ' + t;
      }
    } catch (e) {}

    // the draft, for this tab only
    function draftSave() {
      try {
        sessionStorage.setItem(DRAFT, JSON.stringify({ topics: topics(), page: page.value, note: note.value, quote: quote.checked }));
      } catch (e) {}
    }
    (function draftLoad() {
      var d = null; try { d = JSON.parse(sessionStorage.getItem(DRAFT) || 'null'); } catch (e) {}
      if (!d) return;
      Array.prototype.forEach.call(form.querySelectorAll('input[name="topic"]'), function (c) { c.checked = (d.topics || []).indexOf(c.value) !== -1; });
      page.value = d.page || ''; note.value = d.note || ''; quote.checked = !!d.quote;
    })();
    form.addEventListener('input', draftSave);
    form.addEventListener('change', draftSave);

    function topics() { return Array.prototype.map.call(form.querySelectorAll('input[name="topic"]:checked'), function (c) { return c.value; }); }
    function subject() { var t = topics(); return 'Feedback: ' + (t.length ? t.join(', ') : 'a note about the site'); }
    function body() {
      var L = [];
      if (topics().length) L.push('About: ' + topics().join(', '));
      if (page.value.trim()) L.push('Page or tool: ' + page.value.trim());
      L.push('', note.value.trim(), '');
      L.push(quote.checked ? 'It’s OK to quote my words on the site, without my name.' : 'Please don’t quote me on the site.');
      if (device.checked) {
        L.push('', 'Screen: ' + window.innerWidth + ' x ' + window.innerHeight + (window.devicePixelRatio ? ' (' + window.devicePixelRatio + 'x)' : ''));
        L.push('Browser: ' + navigator.userAgent);
      }
      L.push('', 'Sent from spreadloveandacceptance.com/contact.html');
      return L.join('\n');
    }
    function ready() {
      if (!note.value.trim() && !topics().length) {
        say.textContent = 'Write a line in “Your note,” or pick what it’s about, first.';
        note.focus(); return false;
      }
      return true;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!ready()) return;
      var href = 'mailto:' + TO + '?subject=' + encodeURIComponent(subject()) + '&body=' + encodeURIComponent(body());
      say.textContent = 'Opening your email app with the note filled in. Nothing is sent until you press Send there. If nothing opened, use “Copy the note instead.”';
      window.location.href = href;
    });
    $('ct-copy').addEventListener('click', function () {
      if (!ready()) return;
      var text = 'To: ' + TO + '\nSubject: ' + subject() + '\n\n' + body();
      function ok() { say.textContent = 'Copied. Paste it into an email to ' + TO + '.'; }
      function fallback() {
        var ta = document.createElement('textarea'), done = false;
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { done = document.execCommand('copy'); } catch (x) {}
        ta.remove();
        say.textContent = done ? 'Copied. Paste it into an email to ' + TO + '.' : 'Copying didn’t work here. Select your note and copy it by hand.';
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
    });

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
