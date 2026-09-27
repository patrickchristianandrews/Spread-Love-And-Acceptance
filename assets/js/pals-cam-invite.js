/* pals-cam-invite.js — the occasional, gentle "Peek?" invitation to the pal cam. site.js fetches this file
   only on the page views that roll it (about 1 in 4, once a visit, 15-40 seconds in), then calls show().
   A small note near the bottom corner, stacked above the Weather and Breathe pills. It never takes focus;
   its two buttons are reachable by keyboard, and Esc closes it. "Not now" hides it for the rest of the
   visit. With reduced motion it simply fades. Remembered in sessionStorage only; nothing is sent. */
(function () {
  'use strict';
  if (window.TOLPalCamInvite) return;
  var RM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function ls(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  var CSS = '' +
    '.pci{position:fixed;right:max(.9rem,env(safe-area-inset-right));bottom:var(--pci-b,5rem);z-index:885;width:min(21rem,calc(100vw - 1.8rem));box-sizing:border-box;display:grid;grid-template-columns:auto 1fr;gap:.35rem .7rem;align-items:center;padding:.75rem .85rem .8rem;border-radius:20px;background:linear-gradient(135deg,#FFF6E8,#FBE6F0 60%,#E9E2FB);border:2px solid #F3C6D3;box-shadow:0 12px 32px rgba(60,40,90,.22);color:#3C3350;font:500 .95rem/1.4 Lora,Georgia,serif;opacity:0;transform:translateY(14px) scale(.96);transition:opacity .45s ease,transform .55s cubic-bezier(.2,1.4,.4,1)}' +
    '.pci.is-in{opacity:1;transform:none}' +
    '.pci.is-bye{opacity:0;transform:translateY(10px) scale(.97);transition-duration:.3s}' +
    '.pci-paw{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:#3C3350;color:#FFF3D6;grid-row:span 2}' +
    '.pci-paw svg{width:22px;height:22px}' +
    '.pci p{margin:0;font-size:.95rem}' +
    '.pci p b{font-family:Fraunces,Georgia,serif}' +
    '.pci-btns{display:flex;gap:.4rem;flex-wrap:wrap}' +
    '.pci button{min-height:44px;padding:.35rem .95rem;border-radius:999px;border:1px solid #E6D6EE;background:#fff;color:#3C3350;font:600 .92rem Lora,Georgia,serif;cursor:pointer}' +
    '.pci button.pci-yes{background:#3C3350;border-color:#3C3350;color:#FFF8EE}' +
    '.pci button:focus-visible{outline:3px solid #7C6BB0;outline-offset:2px}' +
    '@media (prefers-reduced-motion: reduce){.pci{transform:none;transition:opacity .4s ease}.pci.is-bye{transform:none}}' +
    'html.tol-still .pci,html.tol-still .pci.is-bye{transform:none;transition:opacity .4s ease}';
  var PAW = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><ellipse cx="12" cy="16.2" rx="4.6" ry="3.8"/><circle cx="6" cy="10.8" r="2.1"/><circle cx="9.6" cy="6.8" r="2.1"/><circle cx="14.4" cy="6.8" r="2.1"/><circle cx="18" cy="10.8" r="2.1"/></svg>';
  var el = null, tries = 0, auto = 0;
  // anything else in the way? then wait a little and try again
  function busy() {
    return document.hidden || !!document.querySelector('.tol-wx, [role="dialog"]:not([hidden]):not(.pc-ov[hidden]), dialog[open], [aria-modal="true"]:not([hidden]), .tol-breathe:not([hidden]), .tol-install, .tol-invite, .tol-bar [aria-expanded="true"]');
  }
  // sit above the Weather (bottom left) and Breathe (bottom right) pills when they share the space
  function place() {
    if (!el) return;
    var me = el.getBoundingClientRect(), b = 14;
    Array.prototype.forEach.call(document.querySelectorAll('.tol-breathe-btn, .tol-wx'), function (n) {
      var r = n.getBoundingClientRect(); if (!r.width || r.right < me.left || r.left > me.right) return;
      b = Math.max(b, window.innerHeight - r.top + 10);
    });
    el.style.setProperty('--pci-b', b + 'px');
  }
  function bye(mode) {
    if (!el) return;
    var n = el, back = n.contains(document.activeElement); el = null; clearTimeout(auto);
    document.removeEventListener('keydown', onKey); window.removeEventListener('resize', place);
    if (mode === 'no') ss('tol-palcam-pop', 'no');
    n.classList.remove('is-in'); n.classList.add('is-bye'); setTimeout(function () { n.remove(); }, 350);
    if (back && mode !== 'yes') { var m = document.getElementById('tol-main') || document.querySelector('main'); if (m && m.focus) { if (!m.hasAttribute('tabindex')) m.setAttribute('tabindex', '-1'); m.focus({ preventScroll: true }); } }
  }
  function onKey(e) { if (e.key === 'Escape' && el) bye('no'); }
  document.addEventListener('tol-still', function (e) { if (e.detail && e.detail.on && el) bye('quiet'); });
  function show(force) {
    if (el) return;
    if (!force && ss('tol-palcam-pop')) return;
    if ((window.TOLStill && window.TOLStill.on()) || document.documentElement.classList.contains('tol-still')) return; // 'Keep the page still' is on
    if (busy()) { if (tries++ < 8) setTimeout(function () { show(force); }, 10000); return; }
    ss('tol-palcam-pop', 'shown'); ls('tol-palcam-pop-prev', '1');
    if (!document.querySelector('style[data-pci]')) { var st = document.createElement('style'); st.setAttribute('data-pci', ''); st.textContent = CSS; document.head.appendChild(st); }
    el = document.createElement('div'); el.className = 'pci'; el.setAttribute('role', 'status'); el.setAttribute('aria-label', 'Pal cam invitation');
    el.innerHTML = '<span class="pci-paw">' + PAW + '</span><p><b>Psst…</b> Tidbit &amp; Sugarfoot are up to something. Peek?</p>' +
      '<div class="pci-btns"><button type="button" class="pci-yes">Check in</button><button type="button" class="pci-no">Not now</button></div>';
    document.body.appendChild(el);
    el.querySelector('.pci-yes').addEventListener('click', function () {
      var opener = document.getElementById('tol-main') || document.querySelector('main') || document.body;
      bye('yes'); if (window.TOLPalCam) window.TOLPalCam.open({ opener: opener });
    });
    el.querySelector('.pci-no').addEventListener('click', function () { bye('no'); });
    document.addEventListener('keydown', onKey); window.addEventListener('resize', place);
    place();
    requestAnimationFrame(function () { requestAnimationFrame(function () { if (el) el.classList.add('is-in'); }); });
    auto = setTimeout(function () { if (el && !el.contains(document.activeElement)) bye('quiet'); }, 30000); // it drifts away on its own if unanswered
  }
  window.TOLPalCamInvite = { show: show, hide: function () { bye('no'); } };
})();
