/* app-bar.js — the free app, offered in one slim line at the very top of every page, and the iPhone/iPad
   install sheet.

   THE LINE. site.js keeps an empty 36px <aside class="tol-appbar"> above the site's bar from the first paint
   (so nothing jumps) and loads this file, which fills it in for the device in hand:
     - Chrome or Edge has offered to install (beforeinstallprompt): "Install the free app" asks it right away.
     - iPhone or iPad: the same words, "Install the free app", open the install sheet below.
     - Safari on a Mac, or Firefox on a computer (no install offer): the same words open the computer sheet below.
     - Android without that offer: "Get the free app" goes to /install.html#chrome.
     - anything else: "Get the free app" goes to /install.html.
   Never inside the installed app, never on /install.html, never on paper. Its × hides it on later pages and visits
   too, for 30 days (localStorage 'tol-appbar-off': the date it was closed; sessionStorage too, for this visit). Quiet
   mode and "No surprises" leave it out (site.js and site.css). Quiet mode: plain and still (app-bar.css).

   THE INSTALL SHEET. Apple lets no website install itself in one tap (Safari has no install prompt), so
   window.TOLAppBar.guide() opens the nearest thing: an iOS-style sheet with the app's icon and name and a blue
   Install button. Install shows the two taps Safari needs (Share, then Add to Home Screen and Add), with a
   bouncing arrow pointing at where the Share button is on this browser: the bottom bar in Safari on iPhone
   (behind the ⋯ button in Safari 26), the top right in Safari on iPad, the address bar in Chrome. Inside
   another app's browser (Instagram, Facebook, TikTok, Gmail...) it says to open the page in Safari first, with a
   Copy link button. It is a modal <dialog>, so it sits above the site's dark-mode filter and takes the real iOS
   light or dark colours, following the site's own dark mode. install.html shows the same sheet, still, inline:
   any element with data-iosg-inline gets one.

   THE COMPUTER SHEET. window.TOLAppBar.desk(): the same sheet for Safari on a Mac and Firefox on Windows, Mac or Linux.
   One button downloads a desktop shortcut made right in the browser (Windows .url, Mac .webloc, Linux .desktop); then a
   small drawing says to drag it to the desktop. Safari 17+ also gets File > Add to Dock; Firefox a line about Chrome or Edge.

   IN THE APP (owner17). The installed app has no address bar or browser Share menu, so every page there gets a Share
   button in the site's bar (left of Menu) and "Share this page" / "Copy link or show a QR code" at the top of the menu.
   See appShare() below. share-kit.js loads this file inside the app.

   AFTER INSTALL. Opened from the Home Screen (navigator.standalone), one small "Installed. Welcome to the app"
   note shows once (localStorage 'tol-ios-welcome'). site.js loads this file in the app only until then.
   Spanish pages get Spanish words (TOLLang from site.js). Nothing is sent anywhere. */
(function () {
  'use strict';
  if (window.TOLAppBar) return;
  var OFF = 'tol-appbar-off', WELCOME = 'tol-ios-welcome';
  function T(en, es) { return window.TOLLang ? window.TOLLang.T(en, es) : en; }
  function isEs() { return !!(window.TOLLang && window.TOLLang.es()); }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  // closed with its × in the last 30 days (localStorage 'tol-appbar-off' holds the date)
  function closedLately() { var d = lsGet(OFF); if (!d || !/^\d{4}-\d\d-\d\d$/.test(d)) return false; return Date.now() - Date.parse(d) < 30 * 86400000; }
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  // the sheet slides and the arrow bounces like iOS, even with the page kept still (phones start still): the arrow is how
  // it shows where to tap. Quiet mode and the device's "reduce motion" keep both still.
  function stillMotion() {
    return document.documentElement.classList.contains('tol-quiet') || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  // ---------------------------------------------------------------- which device, which browser
  var ua = navigator.userAgent || '';
  var IPAD = /ipad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var IOS = IPAD || /iphone|ipod/i.test(ua);
  var ANDROID = !IOS && /android/i.test(ua);
  function iosBrowser() {
    if (/FBAN|FBAV|FBIOS|Instagram|Line\/|LinkedInApp|Snapchat|Twitter|TikTok|musical_ly|BytedanceWebview|Pinterest|MicroMessenger|GSA\/|Gmail/.test(ua)) return 'inapp';
    if (/CriOS/.test(ua)) return 'chrome';
    if (/EdgiOS/.test(ua)) return 'edge';
    if (/FxiOS/.test(ua)) return 'firefox';
    return 'safari';
  }
  // where the Share button is on this browser
  function where() {
    if (!IOS) return 'iphone26';          // looking from a computer: show today's iPhone
    var b = iosBrowser();
    if (b !== 'safari') return b;
    if (IPAD) return 'ipad';
    var m = /Version\/(\d+)/.exec(ua);
    return m && +m[1] >= 26 ? 'iphone26' : 'iphone';
  }

  // ---------------------------------------------------------------- small iOS-style glyphs (they take the text colour)
  var SVG = '<svg class="tol-iosg-g" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">';
  var G_SHARE = SVG + '<path d="M8.5 9.5H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1.5"/><path d="M12 14.5V2.8M8.3 6.3 12 2.6l3.7 3.7"/></svg>';
  var G_PLUS = SVG + '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M12 8v8M8 12h8"/></svg>';
  var G_BOOK = SVG + '<path d="M12 6.5C10 5 7 4.6 4 5v13c3-.4 6 0 8 1.5 2-1.5 5-1.9 8-1.5V5c-3-.4-6 0-8 1.5zM12 6.5v13"/></svg>';
  var G_DOTS = '<svg class="tol-iosg-g" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="10.2" fill="none" stroke="currentColor" stroke-width="1.6"/><g fill="currentColor"><circle cx="7.4" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="16.6" cy="12" r="1.5"/></g></svg>';
  var G_MENU = SVG + '<path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  var G_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var ARROW = '<svg viewBox="0 0 56 56" aria-hidden="true" focusable="false"><path d="M28 5v36M14 29l14 15 14-15" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><path d="M28 5v36M14 29l14 15 14-15" fill="none" stroke="#007AFF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function sh() { return '<span class="tol-iosg-ico">' + G_SHARE + '</span>'; }
  function dt() { return '<span class="tol-iosg-ico">' + G_DOTS + '<span class="tol-iosg-sr">' + T('More', 'Más') + ' (&middot;&middot;&middot;)</span></span>'; }

  // ---------------------------------------------------------------- the words
  var NAME = 'Spread Love &amp; Acceptance';
  function step1(w) {
    return {
      iphone: T('Tap <b>Share</b> ' + sh() + ' in Safari&rsquo;s toolbar, at the bottom of the screen.', 'Toca <b>Compartir</b> ' + sh() + ' en la barra de Safari, abajo en la pantalla.'),
      iphone26: T('Tap ' + dt() + ' in Safari&rsquo;s toolbar, at the bottom right. Then tap <b>Share</b> ' + sh() + '.', 'Toca ' + dt() + ' en la barra de Safari, abajo a la derecha. Luego toca <b>Compartir</b> ' + sh() + '.'),
      ipad: T('Tap <b>Share</b> ' + sh() + ' in Safari&rsquo;s toolbar, at the top right.', 'Toca <b>Compartir</b> ' + sh() + ' en la barra de Safari, arriba a la derecha.'),
      chrome: T('Tap <b>Share</b> ' + sh() + ' in Chrome&rsquo;s address bar, at the top right.', 'Toca <b>Compartir</b> ' + sh() + ' en la barra de direcciones de Chrome, arriba a la derecha.'),
      edge: T('Tap ' + dt() + ' at the bottom of Edge. Then tap <b>Share</b> ' + sh() + '.', 'Toca ' + dt() + ' abajo en Edge. Luego toca <b>Compartir</b> ' + sh() + '.'),
      firefox: T('Tap the menu <span class="tol-iosg-ico">' + G_MENU + '</span> at the bottom right of Firefox. Then tap <b>Share</b> ' + sh() + '.', 'Toca el menú <span class="tol-iosg-ico">' + G_MENU + '</span> abajo a la derecha en Firefox. Luego toca <b>Compartir</b> ' + sh() + '.')
    }[w] || '';
  }
  function step2() { return T('Tap <b>Add to Home Screen</b>, then <b>Add</b>.', 'Toca <b>Agregar a pantalla de inicio</b> y luego <b>Agregar</b>.'); }
  // a little copy of the share sheet's list, and of the Add bar, so the right row is easy to spot
  function mock() {
    function row(g, t, hi) { return '<span class="tol-iosg-mrow' + (hi ? ' is-hi' : '') + '"><span>' + t + '</span><span class="tol-iosg-mg">' + g + '</span></span>'; }
    return '<span class="tol-iosg-mock" aria-hidden="true">' +
      '<span class="tol-iosg-mlist">' + row(G_BOOK, T('Add Bookmark', 'Agregar marcador')) + row(G_PLUS, T('Add to Home Screen', 'Agregar a pantalla de inicio'), true) + '</span>' +
      '<span class="tol-iosg-mbar"><span class="tol-iosg-mc">' + T('Cancel', 'Cancelar') + '</span><b>' + T('Add to Home Screen', 'Agregar a inicio') + '</b><span class="tol-iosg-madd">' + T('Add', 'Agregar') + '</span></span>' +
    '</span>';
  }
  function stepsHTML(w) {
    return '<ol class="tol-iosg-steps no-bubble">' +
      '<li><span class="tol-iosg-n" aria-hidden="true">1</span><span class="tol-iosg-t">' + step1(w) + '</span></li>' +
      '<li><span class="tol-iosg-n" aria-hidden="true">2</span><span class="tol-iosg-t">' + step2() + mock() +
        '<span class="tol-iosg-note">' + T('It may be further down the list. If you see <i>Open as Web App</i>, leave it on.', 'Puede estar más abajo en la lista. Si ves <i>Abrir como app web</i>, déjalo activado.') + '</span></span></li>' +
    '</ol>';
  }
  function inappHTML() {
    return '<div class="tol-iosg-inapp">' +
      '<p class="tol-iosg-h3" id="tol-iosg-step">' + T('Open this page in Safari first', 'Primero abre esta página en Safari') + '</p>' +
      '<p class="tol-iosg-p">' + T('This page is open inside another app. Apps like Instagram, Facebook, TikTok and Gmail can&rsquo;t add things to your Home Screen. Safari can.', 'Esta página está abierta dentro de otra app. Apps como Instagram, Facebook, TikTok y Gmail no pueden agregar cosas a tu pantalla de inicio. Safari sí.') + '</p>' +
      '<p class="tol-iosg-p">' + T('Tap ' + dt() + ' or the menu at the top right and choose <b>Open in Safari</b> (or <b>Open in browser</b>). Or copy the link and paste it into Safari.', 'Toca ' + dt() + ' o el menú de arriba a la derecha y elige <b>Abrir en Safari</b> (o <b>Abrir en el navegador</b>). O copia el enlace y pégalo en Safari.') + '</p>' +
      '<button type="button" class="tol-iosg-copy">' + T('Copy link', 'Copiar enlace') + '</button>' +
      '<p class="tol-iosg-copied" role="status"></p>' +
      '<p class="tol-iosg-p tol-iosg-dim">' + T('Then tap <b>Install the free app</b> again, in Safari.', 'Luego toca <b>Instala la app gratis</b> otra vez, en Safari.') + '</p>' +
    '</div>';
  }
  // the top of the sheet: icon, name, one grey line, and the blue Install button (App Store style)
  function headHTML(tag, button) {
    return '<div class="tol-iosg-app">' +
      '<img class="tol-iosg-icon" src="/assets/icons/apple-touch-icon-180.png" alt="" width="88" height="88">' +
      '<div class="tol-iosg-meta">' +
        '<' + tag + ' class="tol-iosg-name" id="' + (tag === 'h2' ? 'tol-iosg-h' : 'tol-iosg-hi') + '">' + NAME + '</' + tag + '>' +
        '<p class="tol-iosg-sub">' + T('Free &middot; No account &middot; Works offline', 'Gratis &middot; Sin cuenta &middot; Funciona sin conexión') + '</p>' +
        button +
      '</div>' +
    '</div>';
  }

  // ---------------------------------------------------------------- the sheet
  var POINT = { iphone: 'is-bottom', iphone26: 'is-bottom-right', ipad: 'is-top-right', chrome: 'is-top-right', edge: 'is-bottom', firefox: 'is-bottom-right', inapp: 'is-top-right' };
  var open = null;
  function guide(from) {
    if (open) return;
    var w = where(), here = /\/install\.html$/.test(location.pathname), root = document.documentElement;
    var dlg = document.createElement('dialog');
    var canModal = typeof dlg.showModal === 'function';
    // the site's dark mode turns the whole page over with a filter; a modal dialog sits above it, so it takes real dark colours
    var dark = canModal && /invert/.test(getComputedStyle(root).filter || '');
    dlg.className = 'tol-iosg no-bubble' + (canModal ? ' is-top' : ' is-flat') + (dark ? ' is-dark' : '') + (POINT[w] ? ' ' + POINT[w] : '') + (w === 'ipad' ? ' is-ipad' : '') + (stillMotion() ? ' is-still' : '');
    dlg.setAttribute('aria-labelledby', 'tol-iosg-h');
    dlg.innerHTML =
      '<div class="tol-iosg-card no-bubble" tabindex="-1">' +
        '<span class="tol-iosg-grab" aria-hidden="true"></span>' +
        '<button type="button" class="tol-iosg-x" aria-label="' + T('Close', 'Cerrar') + '"><span aria-hidden="true">&times;</span></button>' +
        headHTML('h2', '<button type="button" class="tol-iosg-get">' + T('Install', 'Instalar') + '</button><span class="tol-iosg-free" hidden>' + G_CHECK + T('Free', 'Gratis') + '</span>') +
        '<p class="tol-iosg-about">' + T('Puts ' + NAME + ' on your Home Screen with its own icon. It opens full screen, like any app.', 'Pone ' + NAME + ' en tu pantalla de inicio con su propio ícono. Se abre a pantalla completa, como cualquier app.') + '</p>' +
        '<div class="tol-iosg-how" hidden>' +
          (w === 'inapp' ? inappHTML() :
            '<p class="tol-iosg-h3" id="tol-iosg-step" tabindex="-1">' + T('Two taps in ' + ({ chrome: 'Chrome', edge: 'Edge', firefox: 'Firefox' }[w] || 'Safari'), 'Dos toques en ' + ({ chrome: 'Chrome', edge: 'Edge', firefox: 'Firefox' }[w] || 'Safari')) + '</p>' + stepsHTML(w)) +
          (IOS ? '' : '<p class="tol-iosg-p tol-iosg-dim">' + T('Open this page on your iPhone or iPad to do it there.', 'Abre esta página en tu iPhone o iPad para hacerlo allí.') + '</p>') +
          '<button type="button" class="tol-iosg-done">' + T('Done', 'Listo') + '</button>' +
          (here ? '' : '<a class="tol-iosg-more" href="/install.html#iphone"' + (isEs() ? ' hreflang="en"' : '') + '>' + T('More help', 'Más ayuda (en inglés)') + '</a>') +
        '</div>' +
      '</div>' +
      (IOS && POINT[w] ? '<div class="tol-iosg-point" aria-hidden="true">' + ARROW + '</div>' : '');
    var card = dlg.querySelector('.tol-iosg-card');
    present(dlg, from);
    // Install: show the taps (and the arrow that points at Share)
    var get = dlg.querySelector('.tol-iosg-get');
    get.addEventListener('click', function () {
      dlg.classList.add('is-steps');
      dlg.querySelector('.tol-iosg-how').hidden = false;
      dlg.querySelector('.tol-iosg-about').hidden = true;
      get.hidden = true; dlg.querySelector('.tol-iosg-free').hidden = false;
      var to = dlg.querySelector('#tol-iosg-step');
      if (w === 'inapp') to = dlg.querySelector('.tol-iosg-copy');
      if (to) { if (!to.hasAttribute('tabindex') && to.tagName !== 'BUTTON') to.setAttribute('tabindex', '-1'); to.focus(); }
    });
    var copy = dlg.querySelector('.tol-iosg-copy');
    if (copy) copy.addEventListener('click', function () {
      var link = location.origin + location.pathname, said = dlg.querySelector('.tol-iosg-copied');
      function ok() { said.textContent = T('Copied. Now open Safari and paste it into the address bar.', 'Copiado. Ahora abre Safari y pégalo en la barra de direcciones.'); }
      function manual() { said.textContent = T('Copy this link: ', 'Copia este enlace: ') + link; }
      function old() {
        try {
          var ta = document.createElement('textarea'); ta.value = link; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
          card.appendChild(ta); ta.select(); ta.setSelectionRange(0, link.length);
          var done = document.execCommand('copy'); ta.remove(); if (done) ok(); else manual();
        } catch (e) { manual(); }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(ok, old); else old();
    });
    get.focus();
  }

  // the sheet's shared workings (the iPhone sheet and the computer sheet): open it as a modal above the page, close it
  // with ×, Done, Escape, a click outside or a pull down, keep Tab inside it, and give focus back to what opened it
  function present(dlg, from) {
    var root = document.documentElement, canModal = typeof dlg.showModal === 'function';
    var card = dlg.querySelector('.tol-iosg-card'), was = root.style.overflow, closing = false;
    function close() {
      if (closing) return; closing = true;
      document.removeEventListener('keydown', onKey, true);
      function gone() {
        try { if (dlg.open && dlg.close) dlg.close(); } catch (e) {}
        dlg.remove(); root.style.overflow = was; open = null;
        if (from && from.focus && document.contains(from)) from.focus();
      }
      if (dlg.classList.contains('is-still')) gone();
      else { dlg.classList.add('is-closing'); setTimeout(gone, 220); }
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(card.querySelectorAll('button, a[href]'), function (n) { return n.offsetParent !== null && !n.disabled; });
      if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (!card.contains(document.activeElement)) { e.preventDefault(); a.focus(); }
      else if (e.shiftKey && (document.activeElement === a || document.activeElement === card)) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('.tol-iosg-done, .tol-iosg-x')) close(); });
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
    // pull the sheet down to close it, like any iOS sheet
    var y0 = null, dy = 0;
    card.addEventListener('touchstart', function (e) { if (card.scrollTop > 0 || e.touches.length !== 1) { y0 = null; return; } y0 = e.touches[0].clientY; dy = 0; }, { passive: true });
    card.addEventListener('touchmove', function (e) {
      if (y0 === null) return; dy = e.touches[0].clientY - y0;
      if (dy > 0) { card.style.transition = 'none'; card.style.transform = 'translateY(' + dy + 'px)'; } else { card.style.transform = ''; }
    }, { passive: true });
    card.addEventListener('touchend', function () {
      if (y0 === null) return; y0 = null; card.style.transition = ''; card.style.transform = '';
      if (dy > 90) close();
    });
    document.addEventListener('keydown', onKey, true);
    (document.body || root).appendChild(dlg);
    css(function () {});
    try { if (canModal) dlg.showModal(); else dlg.setAttribute('open', ''); } catch (e) { dlg.setAttribute('open', ''); dlg.classList.remove('is-top', 'is-dark'); dlg.classList.add('is-flat'); }
    root.style.overflow = 'hidden';
    open = dlg;
    return close;
  }

  // ---------------------------------------------------------------- computers with no install button: Safari on a Mac, Firefox
  // Safari on a Mac and Firefox (Windows, Mac, Linux) have no install prompt for websites. The next best thing, in one click:
  // a desktop shortcut file, made right here in the browser (nothing is fetched or sent). Safari 17 and later (macOS Sonoma
  // or later) can also make a real app with File > Add to Dock, so it says how, with a small drawing of that menu.
  var SITE = 'https://spreadloveandacceptance.com/';
  var DESK = (function () {
    if (IOS || ANDROID || /Mobi|Tablet/i.test(ua)) return null;
    var os = /Windows/.test(ua) ? 'win' : /Macintosh|Mac OS X/.test(ua) ? 'mac' : /Linux|X11|CrOS|BSD/.test(ua) ? 'linux' : null;
    if (!os) return null;
    if (/Firefox\//.test(ua) && !/Seamonkey/i.test(ua)) return { os: os, br: 'firefox', v: 0 };
    var v = /Version\/(\d+)/.exec(ua);
    if (os === 'mac' && v && /Safari\//.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/.test(ua)) return { os: os, br: 'safari', v: +v[1] };
    return null;
  })();
  // the shortcut file for this computer: Windows .url, Mac .webloc, Linux .desktop
  function shortcut(os) {
    if (os === 'win') return { name: 'Spread Love & Acceptance.url',
      text: '[InternetShortcut]\r\nURL=' + SITE + '\r\nIconFile=' + SITE + 'favicon.ico\r\nIconIndex=0\r\n' };
    if (os === 'mac') return { name: 'Spread Love & Acceptance.webloc',
      text: '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
        '<plist version="1.0">\n<dict>\n\t<key>URL</key>\n\t<string>' + SITE + '</string>\n</dict>\n</plist>\n' };
    return { name: 'spread-love-and-acceptance.desktop',
      text: '[Desktop Entry]\nVersion=1.0\nType=Link\nName=Spread Love & Acceptance\nComment=Open ' + SITE + '\nURL=' + SITE + '\nIcon=web-browser\n' };
  }
  function saveFile(f, where) {
    var blob = new Blob([f.text], { type: 'application/octet-stream' }), url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = f.name; a.rel = 'noopener'; a.hidden = true; a.tabIndex = -1;
    where.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
  }
  var G_DOWN = SVG + '<path d="M12 3.5v11M7.5 10.5 12 15l4.5-4.5M4.5 16.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2"/></svg>';
  // a tiny drawing: the file in Downloads, a dotted arrow, the same file on the desktop
  function dragFig() {
    var file = '<svg class="tol-desk-file" viewBox="0 0 28 34" aria-hidden="true" focusable="false"><path d="M3 2h15l7 7v23H3z" fill="var(--cell)" stroke="var(--label2)" stroke-width="1.5" stroke-linejoin="round"/><path d="M18 2v7h7" fill="none" stroke="var(--label2)" stroke-width="1.5" stroke-linejoin="round"/></svg>' +
      '<img src="/assets/icons/favicon-32.png" alt="" width="14" height="14">';
    return '<span class="tol-desk-fig" aria-hidden="true">' +
      '<span class="tol-desk-place"><span class="tol-desk-box is-folder"><span class="tol-desk-doc">' + file + '</span></span><span class="tol-desk-cap">' + T('Downloads', 'Descargas') + '</span></span>' +
      '<svg class="tol-desk-arrow" viewBox="0 0 64 24" focusable="false"><path d="M4 18C20 2 42 2 56 14" fill="none" stroke="var(--blue)" stroke-width="2.2" stroke-dasharray="4 4" stroke-linecap="round"/><path d="M49 15l8 0-2-8" fill="none" stroke="var(--blue)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '<span class="tol-desk-place"><span class="tol-desk-box is-screen"><span class="tol-desk-doc">' + file + '</span></span><span class="tol-desk-cap">' + T('Desktop', 'Escritorio') + '</span></span>' +
    '</span>';
  }
  // a small copy of Safari's File menu, with Add to Dock picked out
  function dockMenu() {
    function it(t, hi) { return '<span class="tol-desk-mi' + (hi ? ' is-hi' : '') + '">' + t + '</span>'; }
    return '<span class="tol-desk-menu" aria-hidden="true">' +
      '<span class="tol-desk-mbar"><b>Safari</b><span class="is-on">' + T('File', 'Archivo') + '</span><span>' + T('Edit', 'Edición') + '</span><span>' + T('View', 'Visualización') + '</span></span>' +
      '<span class="tol-desk-mdrop">' + it(T('New Window', 'Nueva ventana')) + it(T('Open File&hellip;', 'Abrir archivo&hellip;')) + it(T('Close Window', 'Cerrar ventana')) +
        '<span class="tol-desk-msep"></span>' + it(T('Share', 'Compartir')) + it(T('Add to Dock&hellip;', 'Agregar al Dock&hellip;'), true) + '</span>' +
    '</span>';
  }
  function desk(from) {
    if (open || !DESK) return;
    var root = document.documentElement, f = shortcut(DESK.os), here = /\/install\.html$/.test(location.pathname);
    var dlg = document.createElement('dialog'), canModal = typeof dlg.showModal === 'function';
    var dark = canModal && /invert/.test(getComputedStyle(root).filter || '');
    var dock = DESK.br === 'safari' && DESK.v >= 17;
    dlg.className = 'tol-iosg is-desk no-bubble' + (canModal ? ' is-top' : ' is-flat') + (dark ? ' is-dark' : '') + (stillMotion() ? ' is-still' : '');
    dlg.setAttribute('aria-labelledby', 'tol-iosg-h');
    dlg.innerHTML =
      '<div class="tol-iosg-card no-bubble" tabindex="-1">' +
        '<span class="tol-iosg-grab" aria-hidden="true"></span>' +
        '<button type="button" class="tol-iosg-x" aria-label="' + T('Close', 'Cerrar') + '"><span aria-hidden="true">&times;</span></button>' +
        headHTML('h2', '') +
        '<p class="tol-iosg-about">' + T('Put the site on your desktop. One double-click opens it, any time.', 'Pon el sitio en tu escritorio. Un doble clic lo abre, cuando quieras.') + '</p>' +
        '<button type="button" class="tol-desk-dl">' + G_DOWN + '<span>' + T('Download a desktop shortcut', 'Descargar un acceso directo') + '</span></button>' +
        '<div class="tol-desk-after" hidden>' + dragFig() +
          '<p class="tol-iosg-p tol-desk-said" role="status"></p>' +
        '</div>' +
        (dock ? '<div class="tol-desk-app">' +
            '<p class="tol-iosg-h3">' + T('Or make it an app', 'O conviértelo en una app') + '</p>' +
            '<p class="tol-iosg-p">' + T('In Safari&rsquo;s menu bar choose <b>File</b> &rarr; <b>Add to Dock</b>, then click <b>Add</b>. It opens in its own window, with its own icon in the Dock.', 'En la barra de menús de Safari elige <b>Archivo</b> &rarr; <b>Agregar al Dock</b> y luego haz clic en <b>Agregar</b>. Se abre en su propia ventana, con su propio ícono en el Dock.') + '</p>' +
            dockMenu() +
            '<p class="tol-iosg-p tol-iosg-dim">' + T('This needs macOS Sonoma or later.', 'Necesita macOS Sonoma o posterior.') + '</p>' +
          '</div>' : '') +
        (DESK.br === 'firefox' ? '<p class="tol-iosg-p tol-iosg-dim tol-desk-ff">' + T('For a full app with its own window, open this site in Chrome or Edge and tap <b>Install</b>.', 'Para una app completa con su propia ventana, abre este sitio en Chrome o Edge y haz clic en <b>Instalar</b>.') + '</p>' : '') +
        '<button type="button" class="tol-iosg-done">' + T('Done', 'Listo') + '</button>' +
        (here ? '' : '<a class="tol-iosg-more" href="/install.html#' + (DESK.os === 'win' ? 'windows' : 'desktop') + '"' + (isEs() ? ' hreflang="en"' : '') + '>' + T('More help', 'Más ayuda (en inglés)') + '</a>') +
      '</div>';
    present(dlg, from);
    var dl = dlg.querySelector('.tol-desk-dl'), after = dlg.querySelector('.tol-desk-after');
    dl.addEventListener('click', function () {
      saveFile(f, dlg.querySelector('.tol-iosg-card'));
      after.hidden = false;
      dlg.querySelector('.tol-iosg-about').hidden = true;   // room for the next step, as the iPhone sheet does
      dl.classList.add('is-again');
      dl.querySelector('span').textContent = T('Download it again', 'Descargarlo otra vez');
      // filled after it is shown, so screen readers say it
      setTimeout(function () {
        after.querySelector('.tol-desk-said').innerHTML = T('Drag it from your Downloads to your desktop. Double-click it any time to open the site.', 'Arrástralo de tus Descargas a tu escritorio. Haz doble clic en él cuando quieras para abrir el sitio.') +
          (DESK.os === 'linux' ? ' <span class="tol-iosg-dim">' + T('If your computer asks whether to trust it or allow launching, say yes.', 'Si tu computadora pregunta si confías en él o si permites abrirlo, di que sí.') + '</span>' : '');
      }, 60);
    });
    dl.focus();
  }

  // the same sheet, still, inside a page (the install page's Apple steps)
  function inline(host) {
    var w = where(), btn = IOS
      ? '<button type="button" class="tol-iosg-get">' + T('Install', 'Instalar') + '</button>'
      : '<span class="tol-iosg-free is-plain">' + T('Free', 'Gratis') + '</span>';
    host.innerHTML = '<div class="tol-iosg-card is-inline no-bubble">' + headHTML('p', btn) +
      stepsHTML(w === 'inapp' ? (IPAD ? 'ipad' : 'iphone26') : w) + '</div>';
    var b = host.querySelector('.tol-iosg-get');
    if (b) b.addEventListener('click', function () { guide(b); });
  }

  // ---------------------------------------------------------------- after install: one small welcome, once
  function welcome() {
    if (navigator.standalone !== true || lsGet(WELCOME) === '1') return;
    lsSet(WELCOME, '1');
    css(function () {
      var t = document.createElement('div');
      t.className = 'tol-iosw no-bubble' + (stillMotion() ? ' is-still' : '');
      t.setAttribute('role', 'status');
      t.innerHTML = '<img src="/assets/icons/apple-touch-icon-180.png" alt="" width="28" height="28"><span>' + T('Installed. Welcome to the app', 'Instalada. Te damos la bienvenida a la app') + '</span>';
      document.body.appendChild(t);
      function bye() { t.classList.add('is-out'); setTimeout(function () { t.remove(); }, 400); }
      t.addEventListener('click', bye);
      setTimeout(bye, 4500);
    });
  }

  // ---------------------------------------------------------------- the line at the top
  // the styles, once; done() runs when they are in (or after a short wait), so the line is drawn styled, with no jump
  var cssReady = false, cssWait = [];
  function css(done) {
    if (done) { if (cssReady) done(); else cssWait.push(done); }
    if (document.getElementById('tol-appbar-css')) return;
    var l = document.createElement('link'); l.id = 'tol-appbar-css'; l.rel = 'stylesheet'; l.href = '/assets/css/app-bar.css';
    function ready() { if (cssReady) return; cssReady = true; cssWait.splice(0).forEach(function (f) { f(); }); }
    l.onload = ready; l.onerror = ready; setTimeout(ready, 2500);
    document.head.appendChild(l);
  }
  var ICON = '<img class="tol-appbar-ic" src="/assets/icons/apple-touch-icon-180.png" alt="" width="24" height="24">';
  function hl() { return isEs() ? ' hreflang="en"' : ''; }
  function render(bar) {
    if (!bar || !document.contains(bar)) return;
    if (standalone()) { bar.hidden = true; return; }
    var ready = !!(window.TOLInstall && window.TOLInstall.ready()), html;
    var note = '<span class="tol-appbar-note">' + T('Its own icon, works offline, no sign-up', 'Su propio ícono, funciona sin conexión, sin registrarte') + '</span>';
    if (ready) {
      html = '<button type="button" class="tol-appbar-go" data-appbar="install"><span>' + T('Install the free app', 'Instala la app gratis') + '</span></button>' + note;
    } else if (lsGet('tol-app-installed') === '1' && !IOS) {
      html = '<span class="tol-appbar-note" style="display:block">' + T('You have the free app. Open it from your home screen or app list.', 'Ya tienes la app gratis. Ábrela desde tu pantalla de inicio.') + '</span>';
    } else if (IOS) {   // the same words as Android; Apple's two taps are shown in the sheet
      html = '<button type="button" class="tol-appbar-go" data-appbar="ios" aria-haspopup="dialog"><span>' + T('Install the free app', 'Instala la app gratis') + '</span></button>' + note;
    } else if (DESK) {   // Safari on a Mac, Firefox: a desktop shortcut in one click (and Add to Dock in Safari 17+), in a sheet
      html = '<button type="button" class="tol-appbar-go" data-appbar="desk" aria-haspopup="dialog"><span>' + T('Install the free app', 'Instala la app gratis') + '</span></button>' + note;
    } else if (ANDROID) {
      html = '<a class="tol-appbar-go" href="/install.html#chrome"' + hl() + '><span>' + T('Get the free app<span class="tol-appbar-more"> for Android</span>', 'Consigue la app gratis<span class="tol-appbar-more"> para Android</span>') + '</span></a>' + note;
    } else {
      html = '<a class="tol-appbar-go" href="/install.html"' + hl() + '><span>' + T('Get the free app', 'Consigue la app gratis') + '</span></a>' + note;
    }
    var had = bar.contains(document.activeElement);
    bar.innerHTML = '<span class="tol-appbar-in">' + ICON + html + '</span>' +
      '<button type="button" class="tol-appbar-x" aria-label="' + T('Hide the app line', 'Ocultar la línea de la app') + '" title="' + T('Hide it (it stays hidden for a month)', 'Ocultarla (queda oculta un mes)') + '">&times;</button>';
    var go = bar.querySelector('[data-appbar]');
    if (go && go.getAttribute('data-appbar') === 'install') go.addEventListener('click', function () {
      window.TOLInstall.ask().then(function (r) { if (r === 'unavailable' || r === 'error') location.href = '/install.html'; else render(bar); });
    });
    if (go && go.getAttribute('data-appbar') === 'ios') go.addEventListener('click', function () { guide(go); });
    if (go && go.getAttribute('data-appbar') === 'desk') go.addEventListener('click', function () { desk(go); });
    bar.querySelector('.tol-appbar-x').addEventListener('click', function () {
      // home16b: once closed it stays closed on later pages and visits (localStorage, the date it was closed), for a month
      ssSet(OFF, '1'); lsSet(OFF, new Date().toISOString().slice(0, 10));
      var next = document.querySelector('.tol-bar a, .tol-bar button');
      bar.remove();
      if (next) next.focus();
    });
    if (had) { var f = bar.querySelector('.tol-appbar-go, .tol-appbar-x'); if (f) f.focus(); }
  }

  // iPhone and iPad: the start-up screens, if the page's head doesn't have them yet (Safari reads them when you tap Add)
  var SPLASH = [[440, 956, 3], [402, 874, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3], [375, 812, 3], [414, 896, 3], [414, 896, 2], [414, 736, 3], [375, 667, 2],
    [744, 1133, 2], [820, 1180, 2], [810, 1080, 2], [834, 1194, 2], [834, 1112, 2], [1024, 1366, 2], [1032, 1376, 2], [768, 1024, 2]];
  function iosHead() {
    if (!IOS || document.querySelector('link[rel="apple-touch-startup-image"]')) return;
    SPLASH.forEach(function (s) {
      var l = document.createElement('link'); l.rel = 'apple-touch-startup-image';
      l.href = '/assets/icons/splash/splash-' + s[0] * s[2] + 'x' + s[1] * s[2] + '.png';
      l.media = '(device-width: ' + s[0] + 'px) and (device-height: ' + s[1] + 'px) and (-webkit-device-pixel-ratio: ' + s[2] + ') and (orientation: portrait)';
      document.head.appendChild(l);
    });
  }

  // ---------------------------------------------------------------- inside the installed app: Share, always in reach
  // owner17: the installed app has no address bar and no browser Share menu, so a page was hard to pass on. In the app
  // (display-mode standalone, or navigator.standalone on iPhone and iPad) every page gets a Share button in the site's
  // bar, just left of Menu, and the menu gets "Share this page" and "Copy link or show a QR code". Share opens the
  // device's own share menu (navigator.share) with the page's clean address: its canonical link, never a ?query or a
  // #part, so nothing typed into a tool travels with it. Where the device has no share menu (or it fails), the site's
  // own share sheet opens instead (site.js TOLShare, with share-kit.js: Copy link, Text message, Email, WhatsApp, a QR
  // code and more). share-kit.js loads this file in the app; nothing is stored and nothing is sent.
  var G_APPSHARE = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
  function inFrame() { try { return window.self !== window.top; } catch (e) { return true; } }
  // the page's own clean address: the canonical link when it is this site's, else this address without ?query or #part
  function cleanUrl() {
    var here = location.origin + location.pathname, c = document.querySelector('link[rel="canonical"]');
    var href = c && c.getAttribute('href');
    if (href) {
      try {
        var u = new URL(href, location.href);
        if (/(^|\.)spreadloveandacceptance\.com$/.test(u.hostname) || u.origin === location.origin) return u.origin + u.pathname;
      } catch (e) {}
    }
    return here;
  }
  function pageTitle() {
    var h = document.querySelector('main h1, [role="main"] h1, h1');
    var t = h ? (h.textContent || '').replace(/\s+/g, ' ').trim() : '';
    if (!t) t = (document.title || '').replace(/\s*[|·–-]\s*Spread Love.*$/i, '').trim();
    return t || 'Spread Love & Acceptance';
  }
  function pageText() {
    var m = document.querySelector('meta[name="description"]'), d = m ? (m.getAttribute('content') || '').trim() : '';
    if (d.length > 200) d = d.slice(0, 197).replace(/\s+\S*$/, '') + '…';
    return d || T('Free, kind tools for yourself and the people you share a life with.', 'Herramientas gratis y amables para ti y para quienes comparten tu vida.');
  }
  function pageShare() { return { title: pageTitle(), text: pageText(), url: cleanUrl() }; }
  // the site's own share sheet (the fallback, and "Copy link or show a QR code")
  function sheet(d) {
    if (window.TOLShare && window.TOLShare.open) { window.TOLShare.open({ title: d.title, text: d.text, url: d.url }); return true; }
    return false;
  }
  var sharing = false;
  function appShareNow(from) {
    var d = pageShare(), data = { title: d.title, text: d.text, url: d.url };
    if (sharing) return Promise.resolve(null);
    var can = typeof navigator.share === 'function';
    try { if (can && navigator.canShare) can = navigator.canShare(data); } catch (e) { can = true; }
    if (!can) { sheet(d); return Promise.resolve({ method: 'sheet' }); }
    sharing = true;
    var p;
    try { p = Promise.resolve(navigator.share(data)); } catch (e) { p = Promise.reject(e); }
    return p.then(function () {
      sharing = false;
      ['tol:shared', 'tol-shared'].forEach(function (n) { try { document.dispatchEvent(new CustomEvent(n, { detail: { url: d.url, method: 'native', how: 'native' } })); } catch (e) {} });
      return { method: 'native' };
    }, function (err) {
      sharing = false;
      if (err && err.name === 'AbortError') { if (from && from.focus && document.contains(from)) from.focus(); return null; }   // they closed their share menu
      sheet(d); return { method: 'sheet' };
    });
  }
  function shareBarButton() {
    var bar = document.querySelector('.tol-bar');
    if (!bar || bar.querySelector('.tol-app-share')) return !!bar;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'tol-app-share no-bubble';
    b.setAttribute('aria-label', T('Share this page', 'Compartir esta página'));
    b.setAttribute('title', T('Share this page', 'Compartir esta página'));
    b.innerHTML = G_APPSHARE + '<span class="tol-app-share-t">' + T('Share', 'Compartir') + '</span>';
    b.addEventListener('click', function () { appShareNow(b); });
    var menu = bar.querySelector('.tol-contents-btn');
    bar.insertBefore(b, menu && menu.parentNode === bar ? menu : null);
    // the bar fits itself to the room it has (site.js listens for resize)
    try { window.dispatchEvent(new Event('resize')); } catch (e) {}
    return true;
  }
  function shareMenuRow() {
    var panel = document.getElementById('tol-panel');
    if (!panel || panel.querySelector('.tol-app-share-row')) return !!panel;
    var row = document.createElement('div');
    row.className = 'tol-app-share-row no-bubble';
    row.innerHTML = '<button type="button" class="tol-btn tol-app-share-go" data-app-share="device">' + G_APPSHARE + '<span>' + T('Share this page', 'Compartir esta página') + '</span></button>' +
      '<button type="button" class="tol-btn is-quiet tol-app-share-more" data-app-share="sheet">' + T('Copy link or show a QR code', 'Copiar el enlace o mostrar un código QR') + '</button>';
    function shut() { var c = panel.querySelector('.tol-panel-head .tol-close'); if (c && !panel.hidden) c.click(); }
    row.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-app-share]'); if (!b) return;
      var how = b.getAttribute('data-app-share');
      shut();
      // after the menu has closed, so the share menu or the sheet takes the focus
      setTimeout(function () {
        var from = document.querySelector('.tol-bar .tol-app-share') || document.querySelector('.tol-bar .tol-contents-btn');
        if (how === 'sheet') { if (!sheet(pageShare())) appShareNow(from); } else appShareNow(from);
      }, 60);
    });
    var head = panel.querySelector('.tol-panel-head');
    panel.insertBefore(row, head && head.parentNode === panel ? head.nextSibling : panel.firstChild);
    return true;
  }
  function appShare() {
    if (!standalone() || inFrame()) return;
    document.documentElement.classList.add('tol-in-app');
    css(function () {
      var tries = 0;
      (function place() {
        var a = shareBarButton(), b = shareMenuRow();
        if ((!a || !b) && ++tries < 40) setTimeout(place, 250);   // the bar and menu are built by site.js; wait a little for them
      })();
    });
  }

  function mount() {
    iosHead();
    welcome();
    appShare();
    // the same sheet, still, wherever a page asks for it (the install page's Apple steps)
    var hosts = document.querySelectorAll('[data-iosg-inline]');
    if (hosts.length) { css(); Array.prototype.forEach.call(hosts, inline); }
    var bar = document.querySelector('aside.tol-appbar');
    if (!bar) return;
    if (standalone() || /\/install\.html$/.test(location.pathname) || ssGet(OFF) === '1' || closedLately()) { bar.remove(); return; }
    css(function () { render(bar); });
    // Chrome or Edge may offer the install a moment later (site.js keeps the offer), or the app may get installed
    function again() { setTimeout(function () { css(function () { render(bar); }); }, 0); }
    window.addEventListener('beforeinstallprompt', again);
    window.addEventListener('appinstalled', again);
    document.addEventListener('tol-app-installed', again);
  }

  window.TOLAppBar = { guide: guide, where: where, ios: IOS, browser: iosBrowser, desk: desk, computer: DESK, share: appShareNow, shareData: pageShare };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
