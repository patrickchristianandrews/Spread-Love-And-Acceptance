/* calming-supplements.js: drop-down filters for /calming-supplements.html (condition, neurotype, type, evidence),
   deep links (?condition=sleep&neurotype=adhd), "go straight to" one option, and the Breathe-break links
   (also used on /nervous-system.html). Nothing is stored: the filters live only in the address bar. */
(function () {
  'use strict';

  /* ---- "Breathe break" links open the site's own Breathe break, starting on Calm breathing (in 4, out 6)
     unless this person already picked a method there. Without it, the link still goes to the Night Garden. ---- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-breathe]');
    if (!a) return;
    var b = document.querySelector('.tol-breathe-btn');
    if (!b) return;
    e.preventDefault();
    var had = null; try { had = localStorage.getItem('tol-br-method'); } catch (x) {}
    b.click();
    if (had !== null) return;
    var tries = 0;
    (function pick() {
      var m = document.querySelector('[data-method="calm"]');
      if (m && m.offsetParent !== null) m.click(); else if (++tries < 40) setTimeout(pick, 100);
    })();
  });

  var form = document.getElementById('cs-filter');
  if (!form) return;

  var F = {
    condition: { el: document.getElementById('cs-f-cond'), attr: 'data-cond' },
    neurotype: { el: document.getElementById('cs-f-nt'), attr: 'data-nt' },
    type: { el: document.getElementById('cs-f-type'), attr: 'data-type' },
    evidence: { el: document.getElementById('cs-f-ev'), attr: 'data-ev' }
  };
  var KEYS = ['condition', 'neurotype', 'type', 'evidence'];
  var cards = Array.prototype.slice.call(document.querySelectorAll('.cs-card[data-cond]'));
  var groups = ['common', 'lesser', 'nopill', 'other'];
  var count = document.getElementById('cs-count');
  var empty = document.getElementById('cs-empty');
  var total = cards.length;

  function words(el, attr) { return (el.getAttribute(attr) || '').split(/\s+/); }
  function val(k) { return F[k].el ? F[k].el.value : ''; }
  function label(k) { var s = F[k].el; return s && s.value ? s.options[s.selectedIndex].text : ''; }

  var bar = document.getElementById('cs-bar');
  var change = document.getElementById('cs-change');
  function setFilterHeight() {
    if (bar) document.documentElement.style.setProperty('--cs-bar-h', bar.offsetHeight + 'px');
  }
  // "Change filters" appears in the result bar once the drop-downs have scrolled out of view
  if (change && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      var off = !es[0].isIntersecting && es[0].boundingClientRect.top < 0;
      change.hidden = !off;
      setFilterHeight();
    }).observe(form);
    change.addEventListener('click', function () {
      form.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      try { F.condition.el.focus({ preventScroll: true }); } catch (x) { F.condition.el.focus(); }
    });
  }

  function syncUrl() {
    if (!window.history || !history.replaceState) return;
    var p = new URLSearchParams(location.search);
    KEYS.forEach(function (k) { if (val(k)) p.set(k, val(k)); else p.delete(k); });
    var q = p.toString();
    try { history.replaceState(history.state, '', location.pathname + (q ? '?' + q : '') + location.hash); } catch (x) {}
  }

  function apply(fromUser) {
    var shown = 0, nt = val('neurotype');
    cards.forEach(function (c) {
      var ok = KEYS.every(function (k) {
        var v = val(k);
        return !v || words(c, F[k].attr).indexOf(v) !== -1;
      });
      c.hidden = !ok;
      if (ok) shown++;
      // the note for the chosen neurotype, shown at the top of the card
      var box = c.querySelector('.cs-ntc');
      if (box) {
        var note = nt && c.querySelector('[data-nt-note="' + nt + '"]');
        if (note) { box.innerHTML = note.innerHTML; box.hidden = false; }
        else { box.innerHTML = ''; box.hidden = true; }
      }
    });
    groups.forEach(function (g) {
      var any = cards.some(function (c) { return !c.hidden && c.closest('[data-group="' + g + '"]'); });
      Array.prototype.forEach.call(document.querySelectorAll('[data-group="' + g + '"]'), function (el) { el.hidden = !any; });
    });
    KEYS.forEach(function (k) { if (F[k].el) F[k].el.classList.toggle('cs-on', !!val(k)); });
    // short notes about the chosen condition and neurotype
    Array.prototype.forEach.call(document.querySelectorAll('[data-cond-note]'), function (p) { p.hidden = p.getAttribute('data-cond-note') !== val('condition'); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-nt-intro]'), function (p) { p.hidden = p.getAttribute('data-nt-intro') !== nt; });

    var parts = KEYS.map(label).filter(Boolean);
    var msg;
    if (!parts.length) msg = 'Showing all ' + total + ' options';
    else msg = 'Showing ' + shown + ' of ' + total + ' options' + (shown ? '' : '');
    count.textContent = msg;
    document.getElementById('cs-show').textContent = shown === total ? 'Show options' : 'Show ' + shown + ' option' + (shown === 1 ? '' : 's');
    document.getElementById('cs-show').disabled = shown === 0;
    empty.hidden = shown !== 0;
    if (fromUser) syncUrl();
    setFilterHeight();
  }

  function clearAll() {
    KEYS.forEach(function (k) { if (F[k].el) F[k].el.value = ''; });
    apply(true);
  }

  function goTo(card) {
    if (!card) return;
    if (card.hidden) clearAll();
    var h = card.querySelector('h3') || card;
    card.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    try { h.focus({ preventScroll: true }); } catch (x) { h.focus(); }
  }

  KEYS.forEach(function (k) { if (F[k].el) F[k].el.addEventListener('change', function () { apply(true); }); });
  document.getElementById('cs-clear').addEventListener('click', function () { clearAll(); F.condition.el.focus(); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-cs-clear]'), function (b) { b.addEventListener('click', function () { clearAll(); F.condition.el.focus(); }); });
  document.getElementById('cs-show').addEventListener('click', function () {
    goTo(cards.filter(function (c) { return !c.hidden; })[0]);
  });
  var jump = document.getElementById('cs-jump');
  function doJump() { if (jump.value) goTo(document.getElementById(jump.value)); }
  document.getElementById('cs-jump-go').addEventListener('click', doJump);
  jump.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); doJump(); } });

  // a link to a card that the filters are hiding: clear the filters so it shows
  function revealHash() {
    var id = decodeURIComponent((location.hash || '').slice(1));
    var c = id && document.getElementById(id);
    if (c && c.classList.contains('cs-card') && c.hidden) { clearAll(); c.scrollIntoView(); }
  }
  window.addEventListener('hashchange', revealHash);
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var c = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
    if (c && c.classList.contains('cs-card') && c.hidden) clearAll();
  });

  // read ?condition=…&neurotype=…&type=…&evidence=… (also accepts ?nt= and ?cond=)
  var q = new URLSearchParams(location.search);
  var alias = { condition: ['condition', 'cond'], neurotype: ['neurotype', 'nt'], type: ['type'], evidence: ['evidence', 'ev'] };
  var any = false;
  KEYS.forEach(function (k) {
    var v = '';
    alias[k].forEach(function (n) { if (!v && q.get(n)) v = q.get(n).toLowerCase(); });
    if (v && F[k].el && F[k].el.querySelector('option[value="' + v.replace(/[^a-z0-9-]/g, '') + '"]')) { F[k].el.value = v; any = true; }
  });
  apply(false);
  revealHash();
  if (any && !location.hash) {
    var b = document.getElementById('browse');
    if (b) setTimeout(function () { b.scrollIntoView(); }, 0);
  }
  window.addEventListener('resize', setFilterHeight);
})();
