/* app-bar.js — the free app, offered in one slim line at the very top of every page, and the iPhone/iPad
   "Add to Home Screen" guide.

   THE LINE. site.js keeps an empty 36px <aside class="tol-appbar"> above the site's bar from the first paint
   (so nothing jumps) and loads this file, which fills it in for the device in hand:
     - Chrome or Edge has offered to install (beforeinstallprompt): "Install the free app" asks it right away.
     - iPhone or iPad: "Add the free app to your Home Screen" opens the guide below.
     - Android without that offer: "Get the free app" goes to /install.html#chrome.
     - anything else: "Get the free app" goes to /install.html.
   Never inside the installed app, never on /install.html, never on paper. Its × hides it for this visit only
   (sessionStorage 'tol-appbar-off'); it is back on the next visit. Quiet mode: plain and still (app-bar.css).

   THE GUIDE. window.TOLAppBar.guide() opens three illustrated steps (Share, Add to Home Screen, Add) with an
   arrow pointing at where the Share button is on this browser: the bottom bar in Safari on iPhone (behind
   the ⋯ button in Safari 26's compact layout), the top right in Safari on iPad, the address bar in Chrome.
   install.html shows the same drawings: any element with data-iosg-fig="1", "2" or "3" gets one.
   Spanish pages get Spanish words (TOLLang from site.js). Nothing is sent anywhere. */
(function () {
  'use strict';
  if (window.TOLAppBar) return;
  var OFF = 'tol-appbar-off';
  function T(en, es) { return window.TOLLang ? window.TOLLang.T(en, es) : en; }
  function isEs() { return !!(window.TOLLang && window.TOLLang.es()); }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }

  // ---------------------------------------------------------------- which device, which browser
  var ua = navigator.userAgent || '';
  var IPAD = /ipad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var IOS = IPAD || /iphone|ipod/i.test(ua);
  var ANDROID = !IOS && /android/i.test(ua);
  function iosBrowser() {
    if (/FBAN|FBAV|Instagram|Line\/|LinkedInApp|Snapchat|Twitter|TikTok|musical_ly|GSA\//.test(ua)) return 'inapp';
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

  // ---------------------------------------------------------------- the drawings (each has its own light screen, so dark mode leaves it readable)
  var FONT = 'font-family="-apple-system, system-ui, Helvetica, Arial, sans-serif"';
  var HI = '#E4566E', BLUE = '#007AFF';
  function shareGlyph(x, y, s, col) {
    s = s || 1; col = col || BLUE;
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" fill="none" stroke="' + col + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M-4 -3h-4v13h16v-13h-4"/><path d="M0 4v-15M-4.5 -6.5l4.5-4.5 4.5 4.5"/></g>';
  }
  function dots(x, y, col) { col = col || '#3A3A3C'; return '<g fill="' + col + '"><circle cx="' + (x - 6) + '" cy="' + y + '" r="2.2"/><circle cx="' + x + '" cy="' + y + '" r="2.2"/><circle cx="' + (x + 6) + '" cy="' + y + '" r="2.2"/></g>'; }
  function ring(x, y, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="none" stroke="' + HI + '" stroke-width="3"/><circle cx="' + x + '" cy="' + y + '" r="' + (r + 5) + '" fill="none" stroke="' + HI + '" stroke-opacity=".3" stroke-width="3"/>'; }
  function box(x, y, w, h) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="9" fill="none" stroke="' + HI + '" stroke-width="3"/>'; }
  function txt(x, y, s, size, extra) { return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 12) + '" ' + FONT + ' ' + (extra || 'fill="#1C1C1E"') + '>' + esc(s) + '</text>'; }
  function page(y0, y1) {   // a few grey lines standing for the page
    var o = '';
    for (var y = y0, i = 0; y < y1; y += 16, i++) o += '<rect x="24" y="' + y + '" width="' + (i % 3 === 2 ? 150 : 252) + '" height="7" rx="3.5" fill="#D9D9DE"/>';
    return o;
  }
  function frame(inner, label) {
    return '<svg class="tol-iosg-pic" viewBox="0 0 300 160" role="img" aria-label="' + esc(label) + '" focusable="false">' +
      '<rect width="300" height="160" rx="18" fill="#F2F2F7"/>' + inner + '</svg>';
  }
  function menu(x, y, rows, hi) {   // a small pop-up menu
    var h = rows.length * 26 + 8, o = '<rect x="' + x + '" y="' + y + '" width="128" height="' + h + '" rx="12" fill="#fff" stroke="#D1D1D6"/>';
    rows.forEach(function (r, i) {
      var ry = y + 4 + i * 26;
      if (i) o += '<path d="M' + (x + 8) + ' ' + ry + 'h112" stroke="#E5E5EA"/>';
      o += txt(x + 12, ry + 17, r, 12) + (i === hi ? shareGlyph(x + 112, ry + 16, 0.7) + box(x + 3, ry + 1, 122, 24) : '');
    });
    return o;
  }
  var URL_TXT = 'spreadloveandacceptance.com';
  function figShare(w) {
    var o, lab = T('Where the Share button is', 'Dónde está el botón Compartir');
    if (w === 'iphone') {
      o = page(18, 86) + '<rect x="0" y="88" width="300" height="72" rx="0" fill="#F9F9FB"/><rect x="40" y="94" width="220" height="24" rx="12" fill="#E5E5EA"/>' + txt(150, 110, URL_TXT, 11, 'fill="#3A3A3C" text-anchor="middle"') +
        '<path d="M44 132l-7 7 7 7" fill="none" stroke="' + BLUE + '" stroke-width="2.4" stroke-linecap="round"/><path d="M96 132l7 7-7 7" fill="none" stroke="#C7C7CC" stroke-width="2.4" stroke-linecap="round"/>' +
        shareGlyph(150, 142, 0.95) + ring(150, 139, 17) +
        '<path d="M196 133h20v14h-20z" fill="none" stroke="' + BLUE + '" stroke-width="2"/><rect x="250" y="131" width="15" height="15" rx="3" fill="none" stroke="' + BLUE + '" stroke-width="2"/>';
    } else if (w === 'iphone26') {
      o = page(14, 70) + menu(160, 22, [T('Share', 'Compartir'), T('Add Bookmark', 'Agregar marcador')], 0) +
        '<rect x="0" y="112" width="300" height="48" fill="#F9F9FB"/><circle cx="28" cy="136" r="16" fill="#E5E5EA"/><path d="M31 129l-7 7 7 7" fill="none" stroke="#3A3A3C" stroke-width="2.4" stroke-linecap="round"/>' +
        '<rect x="52" y="120" width="186" height="32" rx="16" fill="#E5E5EA"/>' + txt(145, 140, URL_TXT, 11, 'fill="#3A3A3C" text-anchor="middle"') +
        '<circle cx="268" cy="136" r="16" fill="#E5E5EA"/>' + dots(268, 136) + ring(268, 136, 19);
    } else if (w === 'ipad') {
      o = '<rect x="0" y="0" width="300" height="40" rx="18" fill="#F9F9FB"/><rect x="0" y="20" width="300" height="20" fill="#F9F9FB"/>' +
        '<rect x="14" y="13" width="16" height="14" rx="3" fill="none" stroke="' + BLUE + '" stroke-width="2"/>' +
        '<rect x="80" y="9" width="140" height="22" rx="11" fill="#E5E5EA"/>' + txt(150, 24, URL_TXT, 9.5, 'fill="#3A3A3C" text-anchor="middle"') +
        shareGlyph(242, 22, 0.85) + ring(242, 19, 15) + '<path d="M266 20h12M272 14v12" stroke="' + BLUE + '" stroke-width="2.2" stroke-linecap="round"/>' + page(56, 150);
    } else if (w === 'chrome') {
      o = '<rect x="0" y="0" width="300" height="48" rx="18" fill="#F9F9FB"/><rect x="0" y="24" width="300" height="24" fill="#F9F9FB"/>' +
        '<rect x="14" y="9" width="272" height="30" rx="15" fill="#E5E5EA"/>' + txt(30, 29, URL_TXT, 11, 'fill="#3A3A3C"') +
        shareGlyph(264, 27, 0.8) + ring(264, 24, 15) + page(62, 150);
    } else if (w === 'edge') {
      o = page(14, 70) + menu(86, 26, [T('Share', 'Compartir'), T('Settings', 'Configuración')], 0) +
        '<rect x="0" y="112" width="300" height="48" fill="#F9F9FB"/>' + dots(150, 136) + ring(150, 136, 17);
    } else if (w === 'firefox') {
      o = page(14, 70) + menu(160, 26, [T('Share', 'Compartir'), T('Settings', 'Configuración')], 0) +
        '<rect x="0" y="112" width="300" height="48" fill="#F9F9FB"/><path d="M260 128h16M260 136h16M260 144h16" stroke="#3A3A3C" stroke-width="2.4" stroke-linecap="round"/>' + ring(268, 136, 17);
    } else {   // inside another app: open it in Safari first
      o = '<rect x="0" y="0" width="300" height="40" rx="18" fill="#F9F9FB"/><rect x="0" y="20" width="300" height="20" fill="#F9F9FB"/>' + dots(270, 20) + ring(270, 20, 16) +
        '<rect x="150" y="46" width="138" height="34" rx="12" fill="#fff" stroke="#D1D1D6"/>' + txt(162, 68, T('Open in Safari', 'Abrir en Safari'), 12) + box(153, 49, 132, 28) + page(96, 150);
    }
    return frame(o, lab);
  }
  function figAdd() {
    var rows = [T('Copy', 'Copiar'), T('Add to Reading List', 'Agregar a la lista de lectura'), T('Add to Home Screen', 'Agregar a pantalla de inicio'), T('Find on Page', 'Buscar en la página')], o = '';
    o += '<rect x="16" y="10" width="268" height="140" rx="14" fill="#fff"/>';
    rows.forEach(function (r, i) {
      var y = 10 + i * 35;
      if (i) o += '<path d="M28 ' + y + 'h244" stroke="#E5E5EA"/>';
      o += txt(30, y + 22, r, 12.5, i === 2 ? 'fill="#1C1C1E" font-weight="700"' : 'fill="#1C1C1E"');
      if (i === 2) o += '<rect x="250" y="' + (y + 9) + '" width="17" height="17" rx="4" fill="none" stroke="#1C1C1E" stroke-width="1.8"/><path d="M258.5 ' + (y + 13) + 'v9M254 ' + (y + 17.5) + 'h9" stroke="#1C1C1E" stroke-width="1.8" stroke-linecap="round"/>' + box(20, y + 3, 260, 30);
      else o += '<circle cx="258.5" cy="' + (y + 17.5) + '" r="7" fill="none" stroke="#8E8E93" stroke-width="1.6"/>';
    });
    return frame(o, T('Add to Home Screen, in the list', 'Agregar a pantalla de inicio, en la lista'));
  }
  function figConfirm() {
    var o = '<rect x="0" y="0" width="300" height="40" rx="18" fill="#F9F9FB"/><rect x="0" y="20" width="300" height="20" fill="#F9F9FB"/>' +
      txt(16, 25, T('Cancel', 'Cancelar'), 12.5, 'fill="' + BLUE + '"') + txt(150, 25, T('Add to Home Screen', 'Agregar a inicio'), 12, 'fill="#1C1C1E" font-weight="700" text-anchor="middle"') +
      txt(284, 25, T('Add', 'Agregar'), 13, 'fill="' + BLUE + '" font-weight="700" text-anchor="end"') + box(isEs() ? 226 : 250, 6, isEs() ? 66 : 42, 28) +
      '<rect x="16" y="50" width="268" height="58" rx="12" fill="#fff"/><image href="/assets/icons/apple-touch-icon-180.png" x="26" y="57" width="44" height="44" preserveAspectRatio="xMidYMid meet"/>' +
      '<rect x="26" y="57" width="44" height="44" rx="10" fill="none" stroke="#E5E5EA"/>' +
      txt(80, 76, 'Spread Love & Acceptance', 12.5, 'fill="#1C1C1E" font-weight="600"') + txt(80, 94, URL_TXT, 10, 'fill="#8E8E93"') +
      '<rect x="16" y="116" width="268" height="34" rx="12" fill="#fff"/>' + txt(28, 138, T('Open as Web App', 'Abrir como app web'), 12) +
      '<rect x="238" y="123" width="36" height="20" rx="10" fill="#34C759"/><circle cx="264" cy="133" r="8" fill="#fff"/>';
    return frame(o, T('The Add button, top right', 'El botón Agregar, arriba a la derecha'));
  }
  function drawings(w) { w = w || where(); return [figShare(w), figAdd(), figConfirm()]; }

  // ---------------------------------------------------------------- the words for each step
  function steps(w) {
    var s1 = {
      iphone: T('Tap the <strong>Share</strong> button at the bottom of the screen. It is the square with an arrow pointing up.', 'Toca el botón <strong>Compartir</strong> abajo en la pantalla. Es el cuadrado con una flecha hacia arriba.'),
      iphone26: T('Tap the <strong>&middot;&middot;&middot;</strong> button at the bottom right, then tap <strong>Share</strong>. (If you see the Share button itself, the square with an arrow, tap that.)', 'Toca el botón <strong>&middot;&middot;&middot;</strong> abajo a la derecha y luego <strong>Compartir</strong>. (Si ves el botón Compartir, el cuadrado con una flecha, tócalo.)'),
      ipad: T('Tap the <strong>Share</strong> button at the top right. It is the square with an arrow pointing up.', 'Toca el botón <strong>Compartir</strong> arriba a la derecha. Es el cuadrado con una flecha hacia arriba.'),
      chrome: T('Tap the <strong>Share</strong> button at the top right, in the address bar.', 'Toca el botón <strong>Compartir</strong> arriba a la derecha, en la barra de direcciones.'),
      edge: T('Tap the <strong>&middot;&middot;&middot;</strong> menu at the bottom, then tap <strong>Share</strong>.', 'Toca el menú <strong>&middot;&middot;&middot;</strong> de abajo y luego <strong>Compartir</strong>.'),
      firefox: T('Tap the menu (three lines) at the bottom right, then tap <strong>Share</strong>. If you can&rsquo;t find it, open this page in Safari.', 'Toca el menú (tres rayas) abajo a la derecha y luego <strong>Compartir</strong>. Si no lo encuentras, abre esta página en Safari.'),
      inapp: T('This page is open inside another app. Tap <strong>&middot;&middot;&middot;</strong> and choose <strong>Open in Safari</strong> (or Open in browser). Then tap Share there.', 'Esta página está abierta dentro de otra app. Toca <strong>&middot;&middot;&middot;</strong> y elige <strong>Abrir en Safari</strong>. Después toca Compartir allí.')
    }[w];
    return [s1,
      T('Scroll down the list and tap <strong>Add to Home Screen</strong>.', 'Baja por la lista y toca <strong>Agregar a pantalla de inicio</strong>.'),
      T('Tap <strong>Add</strong> at the top right. If you see <em>Open as Web App</em>, leave it on.', 'Toca <strong>Agregar</strong> arriba a la derecha. Si ves <em>Abrir como app web</em>, déjalo activado.')];
  }

  // ---------------------------------------------------------------- the guide
  var POINT = { iphone: 'is-bottom', iphone26: 'is-bottom-right', ipad: 'is-top-right', chrome: 'is-top-right', edge: 'is-bottom', firefox: 'is-bottom-right', inapp: 'is-top-right' };
  var ARROW = '<svg viewBox="0 0 56 56" aria-hidden="true" focusable="false"><path d="M28 4v38M14 30l14 16 14-16" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M28 4v38M14 30l14 16 14-16" fill="none" stroke="' + HI + '" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var open = null;
  function guide(from) {
    if (open) return;
    css();
    var w = where(), pics = drawings(w), st = steps(w), here = /\/install\.html$/.test(location.pathname);
    var ov = document.createElement('div');
    ov.className = 'tol-iosg no-bubble' + (POINT[w] === 'is-top-right' ? ' is-top' : '');
    ov.innerHTML =
      '<div class="tol-iosg-card" role="dialog" aria-modal="true" aria-labelledby="tol-iosg-h" tabindex="-1">' +
        '<h2 id="tol-iosg-h">' + T('Add the free app to your Home Screen', 'Agrega la app gratis a tu pantalla de inicio') + '</h2>' +
        '<p class="tol-iosg-sub">' + T('Three taps. It gets its own icon, Spread Love &amp; Acceptance, and opens full screen. Free, no account.', 'Tres toques. Tendrá su propio ícono, Spread Love &amp; Acceptance, y se abrirá a pantalla completa. Gratis, sin cuenta.') + '</p>' +
        '<ol>' + st.map(function (s, i) { return '<li><p>' + s + '</p>' + pics[i] + '</li>'; }).join('') + '</ol>' +
        (IOS ? '' : '<p class="tol-iosg-tip">' + T('Open this page on your iPhone or iPad to do it there. Safari is the surest; Chrome and Edge work too on iOS 16.4 or newer.', 'Abre esta página en tu iPhone o iPad para hacerlo allí. Safari es lo más seguro; Chrome y Edge también sirven con iOS 16.4 o más nuevo.') + '</p>') +
        '<p class="tol-iosg-row"><button type="button" class="tol-iosg-done">' + T('Done', 'Listo') + '</button>' +
        (here ? '' : '<a class="tol-iosg-more" href="/install.html#iphone"' + (isEs() ? ' hreflang="en"' : '') + '>' + T('More help', 'Más ayuda (en inglés)') + '</a>') + '</p>' +
        '<button type="button" class="tol-iosg-x" aria-label="' + T('Close', 'Cerrar') + '">&times;</button>' +
      '</div>';
    var pt = null;
    if (IOS && POINT[w]) { pt = document.createElement('div'); pt.className = 'tol-iosg-point ' + POINT[w]; pt.setAttribute('aria-hidden', 'true'); pt.innerHTML = ARROW; }
    var card = ov.firstChild, root = document.documentElement, was = root.style.overflow;
    function close() {
      ov.remove(); if (pt) pt.remove(); root.style.overflow = was; document.removeEventListener('keydown', onKey, true); open = null;
      if (from && from.focus && document.contains(from)) from.focus();
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(card.querySelectorAll('button, a[href]'), function (n) { return n.offsetParent !== null; });
      if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === a || document.activeElement === card)) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('.tol-iosg-done, .tol-iosg-x')) close(); });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(ov); if (pt) document.body.appendChild(pt);
    root.style.overflow = 'hidden';
    open = ov;
    card.focus();
  }

  // ---------------------------------------------------------------- the line at the top
  function css() {
    if (document.getElementById('tol-appbar-css')) return;
    var l = document.createElement('link'); l.id = 'tol-appbar-css'; l.rel = 'stylesheet'; l.href = '/assets/css/app-bar.css';
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
      html = '<span class="tol-appbar-note" style="display:inline">' + T('You have the free app. Open it from your home screen or app list.', 'Ya tienes la app gratis. Ábrela desde tu pantalla de inicio.') + '</span>';
    } else if (IOS) {
      html = '<button type="button" class="tol-appbar-go" data-appbar="ios" aria-label="' + T('Add the free app to your Home Screen', 'Agrega la app gratis a tu pantalla de inicio') + '"><span>' +
        T('Add the free app<span class="tol-appbar-more"> to your Home Screen</span>', 'Agrega la app gratis<span class="tol-appbar-more"> a tu inicio</span>') + '</span></button>';
    } else if (ANDROID) {
      html = '<a class="tol-appbar-go" href="/install.html#chrome"' + hl() + '><span>' + T('Get the free app<span class="tol-appbar-more"> for Android</span>', 'Consigue la app gratis<span class="tol-appbar-more"> para Android</span>') + '</span></a>' + note;
    } else {
      html = '<a class="tol-appbar-go" href="/install.html"' + hl() + '><span>' + T('Get the free app', 'Consigue la app gratis') + '</span></a>' + note;
    }
    var had = bar.contains(document.activeElement);
    bar.innerHTML = '<span class="tol-appbar-in">' + ICON + html + '</span>' +
      '<button type="button" class="tol-appbar-x" aria-label="' + T('Hide the app line for this visit', 'Ocultar la línea de la app en esta visita') + '" title="' + T('Hide for this visit', 'Ocultar en esta visita') + '">&times;</button>';
    var go = bar.querySelector('[data-appbar]');
    if (go && go.getAttribute('data-appbar') === 'install') go.addEventListener('click', function () {
      window.TOLInstall.ask().then(function (r) { if (r === 'unavailable' || r === 'error') location.href = '/install.html'; else render(bar); });
    });
    if (go && go.getAttribute('data-appbar') === 'ios') go.addEventListener('click', function () { guide(go); });
    bar.querySelector('.tol-appbar-x').addEventListener('click', function () {
      ssSet(OFF, '1');
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

  function mount() {
    iosHead();
    // the same drawings, wherever a page asks for them (the install page's Apple steps)
    var figs = document.querySelectorAll('[data-iosg-fig]');
    if (figs.length) {
      css();
      var pics = drawings();
      Array.prototype.forEach.call(figs, function (n) { var i = +n.getAttribute('data-iosg-fig') - 1; if (pics[i]) n.innerHTML = pics[i]; });
    }
    var bar = document.querySelector('aside.tol-appbar');
    if (!bar) return;
    if (standalone() || /\/install\.html$/.test(location.pathname) || ssGet(OFF) === '1') { bar.remove(); return; }
    css();
    render(bar);
    // Chrome or Edge may offer the install a moment later (site.js keeps the offer), or the app may get installed
    window.addEventListener('beforeinstallprompt', function () { setTimeout(function () { render(bar); }, 0); });
    window.addEventListener('appinstalled', function () { setTimeout(function () { render(bar); }, 0); });
    document.addEventListener('tol-app-installed', function () { render(bar); });
  }

  window.TOLAppBar = { guide: guide, drawings: drawings, where: where, ios: IOS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
