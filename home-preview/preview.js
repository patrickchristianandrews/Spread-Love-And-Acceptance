/* home18 previews only (removed before release). No new storage keys: "With someone" / "Just me" uses the
   existing tol-mode-v1 key, exactly as the current home page does. */
(function () {
  'use strict';
  var D = document;

  /* With someone / Just me: tap again to clear (same behaviour and key as index.html) */
  (function () {
    var KEY = 'tol-mode-v1', host = D.querySelector('[data-h18-pick]');
    if (!host) return;
    var box = host.querySelector('[data-tol-mode]'), out = host.querySelector('.wgo-out');
    function get() { try { var m = localStorage.getItem(KEY); return m === 'me' || m === 'with' ? m : ''; } catch (e) { return ''; } }
    function apply() {
      var m = get() || 'none';
      Array.prototype.forEach.call(host.querySelectorAll('[data-mode-show]'), function (el) { el.hidden = (' ' + el.getAttribute('data-mode-show') + ' ').indexOf(' ' + m + ' ') === -1; });
      if (box) Array.prototype.forEach.call(box.querySelectorAll('[data-mode]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === m)); });
      var on = host.querySelector('[data-wgo][aria-pressed="true"]');
      if (on && on.closest('li') && on.closest('li').hidden && out) { out.hidden = true; on.setAttribute('aria-pressed', 'false'); }
    }
    apply();
    if (box) box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-mode]'); if (!b) return;
      var m = b.getAttribute('data-mode'), now = get() === m ? '' : m;
      try { if (now) localStorage.setItem(KEY, now); else localStorage.removeItem(KEY); } catch (x) {}
      apply();
      try { D.dispatchEvent(new CustomEvent('tol-mode', { detail: { mode: now } })); } catch (x) {}
    });
    D.addEventListener('tol-mode', apply);
  })();

  /* "Start here" goes to the picker and puts focus on its heading */
  D.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-h18-start]'); if (!a) return;
    var t = D.getElementById('whats-going-on'); if (!t) return;
    e.preventDefault();
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    try { t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); } catch (x) { t.scrollIntoView(); }
    var h = t.querySelector('h2'); if (h) { h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (x) {} }
    try { history.replaceState(null, '', '#whats-going-on'); } catch (x) {}
  });

  /* "Try an example" next to Check it (a made-up message, a different one each tap) */
  var EX = ['Why didn’t you do the dishes again?', 'Can you pick the kids up at 5? I’m stuck at work.', 'You never text me back.', 'Thanks for sorting dinner tonight, it was lovely.'], exI = 0;
  function tryEx() {
    var box = D.querySelector('[data-h18-try] [data-message-check-mini]'); if (!box) return true;
    var go = box.querySelector('.mcm-go'), ta = box.querySelector('textarea'), row = box.querySelector('.mcm-row');
    if (!go || !ta) return false;
    if (box.querySelector('.hm-ex')) return true;
    var b = D.createElement('button'); b.type = 'button'; b.className = 'hm-ex'; b.textContent = 'Try an example';
    go.after(b);
    var note = D.createElement('p'); note.className = 'mcm-sub no-bubble hm-ex-note'; note.hidden = true;
    note.textContent = 'A made-up example. Type your own any time: it stays on your device.';
    (row || go).after(note);
    b.addEventListener('click', function () { ta.value = EX[exI++ % EX.length]; note.hidden = false; go.click(); });
    return true;
  }
  function start() {
    if (!tryEx() && 'MutationObserver' in window) {
      var box = D.querySelector('[data-h18-try]');
      if (box) { var mo = new MutationObserver(function () { if (tryEx()) mo.disconnect(); }); mo.observe(box, { childList: true, subtree: true }); }
    }
    // while the first screen is in view on a phone, the round floating helpers step aside
    var top = D.querySelector('[data-h18-top]');
    if (top && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { D.documentElement.classList.toggle('h18-top', es[0].isIntersecting); }).observe(top);
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})();
