/* wide-screens.js — a better fit for tablets, laptops and desktops (and for the installed Windows or Mac window).
   Everything here is optional and adds to the page; with it off, every page still reads the same on a phone.
   - On a big screen, long pages get a small "On this page" outline that sits beside the reading column, follows
     your place with a highlight, and jumps to a section on click. It is built from the page's own h2 headings.
   - With a keyboard: "/" opens search, "?" lists the shortcuts, "g" then "h" goes home, "g" then "s" to Start here,
     "g" then "a" to Ask Professor Puddles, "b" opens Breathe, "a" opens Professor Puddles here, "q" toggles Quiet.
     Shortcuts never fire while you are typing, and they are skipped on pages with their own controls (games,
     cartoons, the teaser, soundscapes, Drift, the Night Garden).
   - On touch tablets: a little more room for the text, larger tap targets in the menu, chips and links, and a
     wider reading column in portrait. Reduced motion turns the smooth scrolling off.
   Nothing is stored or sent. */
(function () {
  'use strict';
  var path = location.pathname.replace(/\/index\.html$/, '/');
  var OWN = /^\/(frequency-journey|frequency-buddies[a-z0-9-]*|pause-and-play|soundscapes|calm-visualizer|night-garden|pal-cam-tv|re-?check[a-z-]*|daily-ledger[a-z-]*|word-bloom|quiet-words|quiet-crossword|install|ask)\.html$|^\/(games|puzzles|workpapers\/fill)\//;
  var RM = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches), fine = !!(window.matchMedia && matchMedia('(pointer: fine)').matches);

  var CSS =
    // tablets: touch screens between phone and laptop size
    '@media (pointer:coarse) and (min-width:700px) and (max-width:1366px){' +
      'html{ font-size:106.25%; }' +
      'main.read{ max-width:46rem; }' +
      '.tol-bar button, .tol-bar a, .tol-nav a, .tol-nav button, .tol-drop a{ min-height:48px; }' +
      '.dig, .growing-chip, .sf-c, .sn-b, .tol-chip, .hh-go a, main.read ul.sh-first a{ min-height:46px; }' +
      'main.read button, main.read .in-tab, main.read summary{ min-height:46px; }' +
      'main.read a{ text-underline-offset:.18em; }' +
    '}' +
    // the outline beside long pages
    '.tol-outline{ position:fixed; top:6.2rem; left:calc(50% + 21rem + 2rem); width:14.5rem; max-height:calc(100vh - 8.5rem); overflow:auto; z-index:20; display:none; ' +
      'padding:.8rem .9rem .9rem; border-radius:18px; background:rgba(255,253,248,.92); border:1px solid rgba(217,200,240,.8); box-shadow:0 10px 26px -14px rgba(60,40,90,.3); font:500 .84rem/1.3 "Lora",Georgia,serif; }' +
    '.tol-outline.is-on{ display:block; }' +
    '.tol-outline h2{ margin:0 0 .4rem !important; font:600 .7rem "IBM Plex Mono",monospace !important; letter-spacing:.1em; text-transform:uppercase; color:#6B4F8A !important; background:none !important; box-shadow:none !important; border:0 !important; padding:0 !important; }' +
    '.tol-outline ol{ list-style:none; margin:0 !important; padding:0 !important; }' +
    '.tol-outline li{ margin:0 !important; padding:0 !important; max-width:none !important; background:none !important; box-shadow:none !important; border:0 !important; }' +
    '.tol-outline a{ display:block; padding:.32rem .55rem; border-radius:10px; color:#3B2A55 !important; text-decoration:none !important; border-left:3px solid transparent; }' +
    '.tol-outline a:hover{ background:rgba(237,227,248,.7); }' +
    '.tol-outline a.is-here{ background:#EDE3F8; border-left-color:#8A4FA8; font-weight:700; }' +
    '.tol-outline a:focus-visible{ outline:2px solid #3B2A55; outline-offset:1px; }' +
    '@media (min-width:1260px){ .tol-outline.is-on{ display:block; } }' +
    '@media (max-width:1259px){ .tol-outline{ display:none !important; } }' +
    '@media print{ .tol-outline, .tol-keys{ display:none !important; } }' +
    // the shortcuts list
    '.tol-keys{ position:fixed; inset:0; z-index:2000; display:grid; place-items:center; background:rgba(20,12,40,.55); padding:1rem; }' +
    '.tol-keys[hidden]{ display:none; }' +
    '.tol-keys-in{ max-width:30rem; width:100%; max-height:90vh; overflow:auto; padding:1.2rem 1.3rem; border-radius:22px; background:#FFFDF8; color:#2B2140; box-shadow:0 20px 50px rgba(0,0,0,.4); font:500 1rem/1.4 "Lora",Georgia,serif; }' +
    '.tol-keys-in h2{ margin:0 0 .6rem !important; font:700 1.3rem "Fraunces",Georgia,serif !important; background:none !important; box-shadow:none !important; border:0 !important; padding:0 !important; }' +
    '.tol-keys-in dl{ margin:0; display:grid; grid-template-columns:auto 1fr; gap:.4rem .9rem; align-items:center; }' +
    '.tol-keys-in dt{ white-space:nowrap; } .tol-keys-in dd{ margin:0; }' +
    '.tol-keys-in kbd{ display:inline-block; min-width:1.6rem; padding:.1rem .45rem; text-align:center; border-radius:7px; border:1px solid #B9A0E0; border-bottom-width:3px; background:#F6F1FD; font:600 .85rem "IBM Plex Mono",monospace; }' +
    '.tol-keys-x{ margin-top:.9rem; min-height:44px; padding:.4rem 1.1rem; border-radius:999px; border:1px solid #6B4F8A; background:#6B4F8A; color:#fff; font:inherit; cursor:pointer; }' +
    '.tol-keys-hint{ position:fixed; left:50%; bottom:.6rem; transform:translateX(-50%); z-index:870; padding:.25rem .8rem; border-radius:999px; background:rgba(43,33,64,.78); color:#fff; font:500 .78rem "Lora",Georgia,serif; pointer-events:none; opacity:0; transition:opacity .4s; }' +
    '.tol-keys-hint.on{ opacity:1; }';
  function css() { if (document.getElementById('tol-wide-css')) return; var s = document.createElement('style'); s.id = 'tol-wide-css'; s.textContent = CSS; document.head.appendChild(s); }

  function slug(s, used) { var b = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'section', id = b, n = 2; while (used[id] || document.getElementById(id)) id = b + '-' + n++; used[id] = 1; return id; }

  // ---------- the outline
  function outline() {
    if (OWN.test(path) || !fine && coarse && innerWidth < 1260) return;
    var main = document.querySelector('main.read'); if (!main) return;
    var hs = Array.prototype.filter.call(main.querySelectorAll('h2'), function (h) { return h.textContent.trim().length > 2 && !h.closest('aside, nav, .tol-keys, .sx-safe, .tol-outline, [data-teaser], .cb-end, .bb-end, .appad, .tol-pud-card'); });
    if (hs.length < 4 || main.textContent.length < 3500) return;
    var used = {}, items = hs.slice(0, 18).map(function (h) { if (!h.id) h.id = slug(h.textContent, used); return { h: h, id: h.id, t: h.textContent.replace(/\s+/g, ' ').trim().replace(/[.:]$/, '') }; });
    var nav = document.createElement('nav'); nav.className = 'tol-outline no-bubble'; nav.setAttribute('aria-label', 'On this page');
    nav.innerHTML = '<h2>On this page</h2><ol>' + items.map(function (i) { return '<li><a href="#' + i.id + '">' + i.t.replace(/</g, '&lt;') + '</a></li>'; }).join('') + '</ol>';
    document.body.appendChild(nav);
    var links = Array.prototype.slice.call(nav.querySelectorAll('a'));
    nav.addEventListener('click', function (e) {
      var a = e.target.closest('a'); if (!a) return; var t = document.getElementById(a.getAttribute('href').slice(1)); if (!t) return;
      e.preventDefault(); t.scrollIntoView({ block: 'start', behavior: RM ? 'auto' : 'smooth' }); try { history.replaceState(null, '', '#' + t.id); } catch (er) {}
      t.setAttribute('tabindex', '-1'); try { t.focus({ preventScroll: true }); } catch (er) {}
    });
    function place() { var r = main.getBoundingClientRect(); nav.style.left = Math.round(r.right + 28) + 'px'; nav.classList.toggle('is-on', innerWidth >= 1260 && r.right + 28 + 232 < innerWidth); }
    function here() {
      var y = innerHeight * 0.3, cur = items[0];
      items.forEach(function (i) { if (i.h.getBoundingClientRect().top <= y) cur = i; });
      links.forEach(function (a) { var on = a.getAttribute('href') === '#' + cur.id; a.classList.toggle('is-here', on); if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
      if (nav.classList.contains('is-on')) { var on = nav.querySelector('.is-here'); if (on) { var nr = nav.getBoundingClientRect(), ar = on.getBoundingClientRect(); if (ar.top < nr.top + 30 || ar.bottom > nr.bottom - 10) nav.scrollTop += ar.top - nr.top - nr.height / 2; } }
    }
    var tick = 0; function onScroll() { if (tick) return; tick = requestAnimationFrame(function () { tick = 0; here(); }); }
    window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', function () { place(); here(); }); place(); here();
  }

  // ---------- the keyboard
  var KEYS = [['/', 'Search the site'], ['?', 'Show this list'], ['g then h', 'Go to the home page'], ['g then s', 'Go to Start here'], ['g then a', 'Go to Ask Professor Puddles'], ['a', 'Open Professor Puddles on this page'], ['b', 'Open Breathe, a one-minute calm break'], ['q', 'Quiet mode on or off'], ['Esc', 'Close whatever is open']];
  var dlg = null, lastTrigger = null, gAt = 0;
  function typing(t) { return t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable); }
  function openKeys() {
    if (!dlg) {
      dlg = document.createElement('div'); dlg.className = 'tol-keys no-bubble'; dlg.hidden = true; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-labelledby', 'tol-keys-h');
      dlg.innerHTML = '<div class="tol-keys-in"><h2 id="tol-keys-h">Keyboard shortcuts</h2><dl>' + KEYS.map(function (k) { return '<dt>' + k[0].split(' then ').map(function (x) { return '<kbd>' + x + '</kbd>'; }).join(' then ') + '</dt><dd>' + k[1] + '</dd>'; }).join('') + '</dl><button type="button" class="tol-keys-x">Close</button></div>';
      document.body.appendChild(dlg);
      dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('.tol-keys-x')) closeKeys(); });
    }
    lastTrigger = document.activeElement; dlg.hidden = false; var b = dlg.querySelector('.tol-keys-x'); if (b) b.focus();
  }
  function closeKeys() { if (dlg && !dlg.hidden) { dlg.hidden = true; if (lastTrigger && lastTrigger.focus) try { lastTrigger.focus(); } catch (e) {} } }
  function click(sel) { var n = document.querySelector(sel); if (n) { n.click(); return true; } return false; }
  function keyboard() {
    if (!fine || OWN.test(path)) return;
    document.addEventListener('keydown', function (e) {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape') { closeKeys(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      if (dlg && !dlg.hidden) { if (e.key === 'Tab') { e.preventDefault(); dlg.querySelector('.tol-keys-x').focus(); } return; }
      var k = e.key, now = Date.now();
      if (gAt && now - gAt < 1200) {
        gAt = 0; var go = { h: '/', s: '/start-here.html', a: '/ask.html' }[k.toLowerCase()]; if (go) { e.preventDefault(); location.href = go; return; }
      }
      if (k === '/') { if (click('.tol-search-btn')) { e.preventDefault(); } }
      else if (k === '?') { e.preventDefault(); openKeys(); }
      else if (k === 'g' || k === 'G') { gAt = now; }
      else if (k === 'b' || k === 'B') { if (click('.tol-breathe-btn')) e.preventDefault(); }
      else if (k === 'a' || k === 'A') { if (click('.tol-pud-fab')) e.preventDefault(); }
      else if (k === 'q' || k === 'Q') { if (click('.tol-bar-quiet')) e.preventDefault(); }
    });
    // a one-time whisper that the shortcuts exist, for people with a keyboard
    var seen = false; try { seen = sessionStorage.getItem('tol-keys-hint') === '1'; } catch (e) {}
    if (!seen && innerWidth >= 900) {
      var onKey = function () { document.removeEventListener('keydown', onKey); };
      setTimeout(function () {
        var h = document.createElement('div'); h.className = 'tol-keys-hint'; h.setAttribute('aria-hidden', 'true'); h.textContent = 'Tip: press ? for keyboard shortcuts'; document.body.appendChild(h);
        requestAnimationFrame(function () { h.classList.add('on'); }); setTimeout(function () { h.classList.remove('on'); setTimeout(function () { h.remove(); }, 500); }, 3600);
        try { sessionStorage.setItem('tol-keys-hint', '1'); } catch (e) {}
      }, 2500);
    }
  }

  function start() { css(); outline(); keyboard(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
