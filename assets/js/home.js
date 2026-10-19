/* home.js: small extras for the home page (home16). Nothing here is sent anywhere, and it adds no storage keys.
   - "Pick up where you left off": for someone who has been here before (tol-visit-days or tol-come-back-v1 shows an
     earlier day), a small card under the opening lines with their journey in progress, the next book chapter or
     their self path. It only READS keys the site already keeps (tol-visit-days, tol-come-back-v1, tol-journeys-v1,
     tol-selfpath-v1) and never shows a list of pages visited.
   - "Try an example" in "Check a text before you send it": fills in one made-up, neutral message and checks it.
   - Tidbit and Sugarfoot, drawn still (pups.js) on the arcade card in "Meet the friends".
   - "Every situation" opens when a link or the address points at #start-where.
   - While the first card's chooser is on a phone screen, and while Professor Puddles' card is in view, the round
     floating helpers step aside (CSS in index.html). */
(function () {
  'use strict';
  var D = document, root = D.documentElement;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function json(k) { try { return JSON.parse(lsGet(k) || 'null'); } catch (e) { return null; } }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function path(u) { return String(u || '').split(/[?#]/)[0]; }
  function go(t) { t = String(t || ''); return esc(t) + (/\u2192|\u2190/.test(t) ? '' : '\u00a0\u2192'); }

  /* ---------------------------------------------------------------- Pick up where you left off */
  function pickUp() {
    var host = D.querySelector('[data-hh-back]'); if (!host) return;
    // tol-visit-days holds dates like "Mon Oct 19 2026" (site.js); tol-come-back-v1's days are "2026-10-19"
    var t = today(), t2 = new Date().toDateString(), days = json('tol-visit-days'), cb = json('tol-come-back-v1') || {};
    function other(d) { return d && d !== t && d !== t2; }
    var earlier = (Array.isArray(days) && days.some(other)) || (Array.isArray(cb.days) && cb.days.some(other));
    if (!earlier) return;
    var items = [];
    // a guided journey under way: the one started most recently, with its next step
    var J = window.TOLJourneys, o = json((J && J.key) || 'tol-journeys-v1');
    if (J && o && o.j) {
      var best = null;
      J.journeys.forEach(function (j) {
        var r = o.j[j.id]; if (!r) return;
        var d = Array.isArray(r.d) ? r.d : [], need = [], done = 0;
        j.steps.forEach(function (s, i) { if (s.k !== 'wp') { need.push(i); if (d.indexOf(i) >= 0) done++; } });
        if (!(r.s || d.length) || done >= need.length) return;
        if (!best || String(r.s || '') > String(best.r.s || '')) best = { j: j, r: r, done: done, total: need.length };
      });
      if (best) items.push('<li><a href="/journeys.html#' + esc(best.j.id) + '">' + go(best.j.title) + '</a><small>Your guided journey: ' + best.done + ' of ' + best.total + ' steps done</small></li>');
    }
    // the book: the next chapter not yet opened, once at least one has been
    var read = cb.read && typeof cb.read === 'object' ? cb.read : {}, M = window.TOLSiteMap;
    if (Object.keys(read).length && M && M.sections) {
      var book = M.sections.filter(function (s) { return s.id === 'book'; })[0], chs = [];
      if (book) chs = book.items.filter(function (it) { return /^\/book\/(self-\d-[a-z]+|preface|chapter-\d|understanding-\d+-[a-z-]+|afterword)\.html$/.test(it.href || ''); });
      var any = chs.some(function (c) { return read[path(c.href)]; }), nx = null;
      if (any) chs.some(function (c) { if (!read[path(c.href)]) { nx = c; return true; } return false; });
      if (nx) items.push('<li><a href="' + esc(nx.href) + '">' + go(nx.title || 'The next chapter') + '</a><small>Next in the book</small></li>');
    }
    // the self path: steps marked done
    var sp = json('tol-selfpath-v1');
    if (items.length < 2 && sp && Array.isArray(sp.done) && sp.done.length) items.push('<li><a href="/self-path.html">Your self path\u00a0\u2192</a><small>' + sp.done.length + (sp.done.length === 1 ? ' step' : ' steps') + ' done so far</small></li>');
    if (!items.length) items.push('<li><a href="/on-this-device.html#progress">See your progress\u00a0\u2192</a></li>');
    host.innerHTML = '<p class="hh-back-h">Welcome back. Pick up where you left off:</p><ul>' + items.slice(0, 2).join('') + '</ul>';
    host.hidden = false;
  }

  /* ---------------------------------------------------------------- Try an example */
  var EXAMPLE = 'Why didn’t you do the dishes again?';
  function tryExample() {
    var box = D.querySelector('.hm-try [data-message-check-mini]'); if (!box) return;
    function add() {
      var row = box.querySelector('.mcm-row'), go = box.querySelector('.mcm-go'), ta = box.querySelector('textarea');
      if (!row || !go || !ta || box.querySelector('.hm-ex')) return !!(row && box.querySelector('.hm-ex'));
      var b = D.createElement('button'); b.type = 'button'; b.className = 'hm-ex'; b.textContent = 'Try an example';
      go.after(b);
      var note = D.createElement('p'); note.className = 'mcm-sub no-bubble hm-ex-note'; note.hidden = true;
      note.textContent = 'A made-up example. Type your own any time: it stays on your device.';
      row.after(note);
      b.addEventListener('click', function () {
        ta.value = EXAMPLE;
        note.hidden = false;
        go.click();
      });
      return true;
    }
    if (add()) return;
    if (!('MutationObserver' in window)) return;
    var mo = new MutationObserver(function () { if (add()) mo.disconnect(); });
    mo.observe(box, { childList: true, subtree: true });
  }

  /* ---------------------------------------------------------------- the pups on the arcade card (drawn once, still) */
  function pups() {
    var c = D.querySelector('canvas[data-hm-pups]'); if (!c || !c.getContext) return;
    var n = 0;
    (function go() {
      var P = window.TOLPups;
      if (!P) { if (++n < 40) setTimeout(go, 150); return; }
      var x = c.getContext('2d'), w = c.width, h = c.height, s = h / 82;
      x.clearRect(0, 0, w, h);
      // Sugarfoot on the left and Tidbit on the right, sitting side by side and facing each other
      x.save(); x.translate(w * 0.24, h * 0.95); x.scale(s, s); try { P.draw(x, P.looks.drop, 'sit', 0, 0.2, false, 0, 0); } catch (e) {} x.restore();
      x.save(); x.translate(w * 0.76, h * 0.95); x.scale(-s, s); try { P.draw(x, P.looks.collar, 'sit', 0, 0.2, false, 0, 0); } catch (e) {} x.restore();
    })();
  }

  /* ---------------------------------------------------------------- "Every situation" opens for #start-where */
  function situations() {
    var d = D.getElementById('start-where'); if (!d || d.tagName !== 'DETAILS') return;
    function open() { d.open = true; }
    if (location.hash === '#start-where') { open(); setTimeout(function () { try { d.scrollIntoView({ block: 'start' }); } catch (e) {} }, 60); }
    window.addEventListener('hashchange', function () { if (location.hash === '#start-where') open(); });
    D.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[href="#start-where"], a[href="/index.html#start-where"], a[href="/#start-where"]'); if (a) open(); }, true);
  }

  /* ---------------------------------------------------------------- the floating helpers step aside */
  function observers() {
    if (!('IntersectionObserver' in window)) return;
    var card = D.querySelector('.hm-friends .hh-pud');
    if (card) new IntersectionObserver(function (es) { root.classList.toggle('hh-pud-on', es[0].isIntersecting); }).observe(card);
    var top = D.querySelector('.hh .hh-wgo');
    if (top) new IntersectionObserver(function (es) { root.classList.toggle('hh-top-on', es[0].isIntersecting); }).observe(top);
  }

  function start() {
    [pickUp, tryExample, pups, situations, observers].forEach(function (f) { try { f(); } catch (e) {} });
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})();
