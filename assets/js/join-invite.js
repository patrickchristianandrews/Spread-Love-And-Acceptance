/* join-invite.js — "Join the newsletter": a free note when something new arrives, which also opens the few pages that ask for an email.
   site.js loads this only for visitors who haven't signed up. It adds:
   - a banner at the very top of the home page (only when the page has no sign-up strip of its own), and
   - rarely, a small invitation while browsing other pages
     (about 1 in 5 page views, at most once every two weeks, never in the first minute of a visit
     or of a page, never on the pages about growing up and knowing yourself, never when the device asks
     for reduced motion, never while a video
     or episode plays or while someone is typing, and never on top of another invitation or dialog).
     Closing it puts focus back where it was.
   Both disappear the moment someone signs up (the site sends a "tol-member" event).
   Sign-up uses the site's own free sign-up (window.TOL.signUp). The email is sent to the
   newsletter service only when the person presses Join; nothing else is collected. */
(function () {
  'use strict';
  var TOL = window.TOL || {};
  if (!TOL.signUp || (TOL.isMember && TOL.isMember())) return;

  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var path = location.pathname;
  var isHome = path === '/' || path === '/index.html';

  var css = document.createElement('style');
  css.textContent =
    '.tol-join{box-sizing:border-box;border-radius:22px;background:linear-gradient(135deg,#FFF3F7,#EEF2FB);box-shadow:0 8px 24px rgba(60,40,90,.12);color:#2B2620;font-family:"Lora",Georgia,serif}' +
    '.tol-join h2{margin:0 0 .3rem;font:600 1.18rem/1.3 "Fraunces",Georgia,serif;color:#2B2620}' +
    '.tol-join p{margin:0 0 .7rem;font-size:.97rem;line-height:1.5;color:#3F384A;max-width:none;padding:0;background:none;box-shadow:none}' +
    '.tol-join form{display:flex;flex-wrap:wrap;gap:.5rem;margin:0}' +
    '.tol-join input[type=email]{box-sizing:border-box;flex:1 1 13rem;min-width:0;min-height:46px;padding:.55rem .85rem;border:1.5px solid #B9A8D6;border-radius:999px;background:#fff;font:inherit;color:#2B2620}' +
    '.tol-join input[type=email]:focus-visible{outline:3px solid #2F5F8A;outline-offset:2px}' +
    '.tol-join button{min-height:46px;padding:.5rem 1.2rem;border:0;border-radius:999px;cursor:pointer;font:600 1rem "Lora",Georgia,serif}' +
    '.tol-join .tol-join-go{background:#2F5F8A;color:#fff}.tol-join .tol-join-go:hover{background:#264E73}' +
    '.tol-join button:focus-visible{outline:3px solid #2F5F8A;outline-offset:2px}' +
    '.tol-join .tol-join-small{margin:.55rem 0 0;font-size:.86rem;color:#4F4760}' +
    '.tol-join .tol-msg{margin:.5rem 0 0;font-size:.92rem}.tol-join .tol-msg.is-error{color:#9B2C3C}.tol-join .tol-msg.is-ok{color:#2F5A3C}.tol-join .tol-msg.is-warn{color:#5A4214}' +
    '.tol-join-x{position:absolute;top:.35rem;right:.35rem;width:44px;height:44px;min-height:0!important;padding:0!important;background:none;color:#5E5470;font-size:1.4rem!important;line-height:1}' +
    '.tol-join-x:hover{background:rgba(0,0,0,.05)!important}' +
    '.tol-join-banner{position:relative;margin:0 0 1.4rem;padding:1.1rem 1.2rem}' +
    '.tol-join-banner .tol-join-k{display:inline-block;margin:0 0 .35rem;padding:.15rem .6rem;border-radius:999px;background:#EAF6EF;color:#2F5A3C;font:600 .8rem/1.6 "Lora",Georgia,serif}' +
    '.tol-join-pop{position:fixed;left:50%;bottom:5.2rem;z-index:60;width:min(26rem,calc(100vw - 32px));transform:translateX(-50%);padding:1.1rem 1.1rem 1rem;opacity:0;transition:opacity .35s,transform .35s}' +
    '.tol-join-pop.is-in{opacity:1;transform:translateX(-50%) translateY(-4px)}' +
    '.tol-join-pop h2{padding-right:2.4rem}' +
    '.tol-join-later{background:none;color:#3E5A86;text-decoration:underline;text-underline-offset:3px}' +
    '@media (prefers-reduced-motion:reduce){.tol-join-pop{transition:none}}' +
    '@media print{.tol-join{display:none!important}}';
  document.head.appendChild(css);

  function form(idp) {
    return '<form novalidate>' +
      '<label class="sr-only" for="' + idp + '-email" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Your email</label>' +
      '<input type="email" id="' + idp + '-email" name="email" autocomplete="email" placeholder="you@example.com" required>' +
      '<button type="submit" class="tol-join-go">Join free</button>' +
      '</form><p class="tol-msg" role="status" aria-live="polite"></p>';
  }
  function wire(box) {
    var f = box.querySelector('form'), msg = box.querySelector('.tol-msg');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      TOL.signUp(f.querySelector('input').value, msg);
    });
  }

  // ---------- the home page banner ----------
  function banner() {
    var main = document.querySelector('main');
    // the home page has its own sign-up strip at the bottom, so nothing sits on the first screen
    if (document.getElementById('open-free')) return;
    if (!main || document.querySelector('.tol-join-banner')) return;
    var b = document.createElement('section');
    b.className = 'tol-join tol-join-banner';
    b.setAttribute('aria-labelledby', 'tol-join-h');
    b.innerHTML =
      '<span class="tol-join-k">Free</span>' +
      '<h2 id="tol-join-h">Reading, tools and games are free to everyone. Join free to open the workpapers too</h2>' +
      '<p class="tol-join-long">You don’t need an email to read, play or use the tools. The fill-in workpapers and Chapters III to V ask for one: join for a short, friendly note when something new arrives, and they open right away in this browser. No payment, and you can unsubscribe any time.</p>' +
      '<p class="tol-join-short">Free. No payment. Unsubscribe any time.</p>' +
      form('tol-join-b') +
      '<p class="tol-join-small">Already joined on another device? Enter the same email here to open everything.</p>';
    var intro = main.querySelector('[data-home-intro]'); // right under the one-line "what this is"
    main.insertBefore(b, intro ? intro.nextElementSibling : main.firstElementChild);
    wire(b);
  }

  // ---------- the occasional invitation on other pages ----------
  var SKIP = /^\/(ask|offline|404|brand)\.html$|^\/legal\/|^\/workpapers\/fill\/|^\/frequency-journey|^\/calm-visualizer/;
  // never while a tool, the chat or a game is in use, while someone is typing, or after a heavy weather check
  // today (site.js decides: window.TOLSite.busy); reading pages only
  function busy() {
    return (window.TOLSite && window.TOLSite.busy()) || (window.TOLQuiet && window.TOLQuiet.on()) ||
      document.querySelector('[role=dialog]:not([hidden]), dialog[open], .tol-wx, .tol-install, .pci, .tol-join-pop, #tol-panel:not([hidden]), .tol-set:not([hidden])');
  }
  function popup() {
    if (document.querySelector('.tol-join-pop')) return;
    var p = document.createElement('aside');
    p.className = 'tol-join tol-join-pop';
    p.setAttribute('aria-labelledby', 'tol-join-ph');
    p.innerHTML =
      '<button type="button" class="tol-join-x" aria-label="Close this invitation">&times;</button>' +
      '<h2 id="tol-join-ph">Want a note when something new arrives?</h2>' +
      '<p>Join the free newsletter. It also opens the few chapters and workpapers that ask for an email, right away in this browser. No payment, unsubscribe any time.</p>' +
      form('tol-join-p') +
      '<p class="tol-join-small"><button type="button" class="tol-join-later">Maybe later</button></p>';
    var back = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    document.body.appendChild(p);
    wire(p);
    function close() {
      var had = p.contains(document.activeElement);
      p.classList.remove('is-in'); setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 350); document.removeEventListener('keydown', onKey);
      // focus goes back where it was (or to the top of the page), never lost on <body>
      if (had || document.activeElement === document.body) {
        var to = back && document.contains(back) ? back : document.getElementById('tol-main');
        if (to && to.focus) try { to.focus({ preventScroll: true }); } catch (e) {}
      }
    }
    function onKey(e) { if (e.key === 'Escape' && !e.defaultPrevented) close(); }
    p.querySelector('.tol-join-x').addEventListener('click', close);
    p.querySelector('.tol-join-later').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(function () { p.classList.add('is-in'); });
  }
  function maybePopup() {
    if (isHome || SKIP.test(path) || document.body.classList.contains('is-game') || !document.querySelector('main.read') || document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;
    var force = /[?&]join-pop=1\b/.test(location.search);
    if (window.TOLSite && window.TOLSite.busy() && !force) return; // a tool page: not here at all
    if (window.TOLSite && window.TOLSite.sensitive && window.TOLSite.sensitive() && !force) return; // a tender page: never here
    if (window.TOLSite && window.TOLSite.calmDevice && window.TOLSite.calmDevice() && !force) return; // the device asks for less motion: no pop-up at all
    // rarely: about 1 in 5 page views, and at most once every two weeks ('tol-join-pop-prev' keeps the date it last showed)
    var prev = ls('tol-join-pop-prev'), today = new Date().toISOString().slice(0, 10);
    var recent = /^\d{4}-\d{2}-\d{2}$/.test(prev || '') && (Date.parse(today) - Date.parse(prev)) / 864e5 < 14;
    if (!force && (ss('tol-join-pop') || prev === '1' || recent || Math.random() >= 0.2)) return;
    // never in the first minute of a visit (the time this tab first opened the site, kept in this tab only)
    var visitT0 = parseInt(ss('tol-visit-t0') || '0', 10) || Date.now();
    var started = Date.now(), scrolled = false, fired = false;
    function onScroll() { if (window.scrollY > window.innerHeight) scrolled = true; }
    window.addEventListener('scroll', onScroll, { passive: true });
    function tick() {
      if (fired) return;
      var t = Date.now() - started;
      var ready = force ? t > 1200 : (Date.now() - visitT0 > 60000 && (t > 45000 || (scrolled && t > 20000)));
      if (!ready || document.hidden || busy()) { setTimeout(tick, 2000); return; }
      fired = true;
      window.removeEventListener('scroll', onScroll);
      ss('tol-join-pop', '1'); ls('tol-join-pop-prev', today);
      popup();
    }
    setTimeout(tick, 2000);
  }

  // ---------- gone the moment someone signs up ----------
  function removeAll() {
    Array.prototype.forEach.call(document.querySelectorAll('.tol-join'), function (n) {
      var warn = n.querySelector('.tol-msg.is-warn');
      if (warn) { // the newsletter couldn't be reached: keep the honest note and its "Try joining again" button in view
        var x = n.querySelector('.tol-join-x');
        Array.prototype.slice.call(n.childNodes).forEach(function (c) { if (c !== warn && c !== x) n.removeChild(c); });
        if (warn.parentNode !== n) n.appendChild(warn);
        warn.setAttribute('role', 'status');
        return;
      }
      var ok = n.querySelector('.tol-msg.is-ok');
      if (ok && n.classList.contains('tol-join-pop')) { setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 2600); return; } // let them read "You're in" first
      if (ok) { n.innerHTML = '<p class="tol-msg is-ok" role="status">' + ok.textContent + '</p>'; setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 6000); return; }
      if (n.parentNode) n.parentNode.removeChild(n);
    });
  }
  document.addEventListener('tol-member', function (e) { if (e.detail && e.detail.member) removeAll(); });

  if (isHome) banner();
  maybePopup();
})();
