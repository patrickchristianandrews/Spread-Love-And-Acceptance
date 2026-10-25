/* calm-pills.js: /calm-without-pills.html
   The page ships every card as plain HTML (readable with JavaScript off and by search engines). This script adds a Details drawer
   (a bottom sheet on phones) that is filled only when opened, "Show more", deep links (#option-name, and the old addresses of
   /calming-supplements.html), a tidy toolbar (Save, Share, Print, Contents) and "Try one this week".
   Saved on this device only: your weekly pick and ticked days (localStorage key tol-calm-try). Nothing is sent anywhere. */
(function () {
  'use strict';
  var D = document, H = D.documentElement;
  var grid = D.getElementById('sp-grid');
  if (!grid) return;
  var TRY_KEY = 'tol-calm-try';
  var STEP = (window.matchMedia && matchMedia('(max-width:639px)').matches) ? 4 : 12;
  var EVL = { good: 'Good evidence', some: 'Some evidence', mixed: 'Mixed evidence', early: 'Early evidence', weak: 'Weak evidence', none: 'No good evidence' };

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function el(tag, cls, html) { var n = D.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function txt(n) { return n ? n.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function reduce() { return (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || H.classList.contains('tol-still') || H.classList.contains('tol-quiet'); }
  function scrollTo(n, block) { try { n.scrollIntoView({ block: block || 'start', behavior: reduce() ? 'auto' : 'smooth' }); } catch (e) { n.scrollIntoView(); } }
  function focusIt(n) { if (!n) return; if (!n.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(n.tagName)) n.setAttribute('tabindex', '-1'); try { n.focus({ preventScroll: true }); } catch (e) { n.focus(); } }
  var live = null;
  function say(m) { if (!live) { live = el('p', 'sr-only'); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); D.body.appendChild(live); } live.textContent = ''; setTimeout(function () { live.textContent = m; }, 30); }

  /* ------------------------------------------------------------------ cards */
  var byId = {};
  var cards = Array.prototype.map.call(grid.querySelectorAll('.sp-card'), function (c) {
    var d = c.querySelector('details.sp-d'), body = d && d.querySelector('.sp-d-body');
    var store = el('div', 'sp-store'); store.hidden = true;
    if (body) store.appendChild(body);
    if (d) d.parentNode.removeChild(d);
    c.appendChild(store);
    var f = c.querySelectorAll('.sp-facts > div');
    var o = { el: c, id: c.id, name: c.getAttribute('data-name'), ev: c.getAttribute('data-ev'), tryable: c.getAttribute('data-try') === '1', body: body,
      nameHtml: c.querySelector('.sp-name').innerHTML, kindLabel: txt(c.querySelector('.sp-kind')), sum: txt(c.querySelector('.sp-sum')),
      studied: f[0] ? txt(f[0].querySelector('dd')) : '', forms: f[1] ? txt(f[1].querySelector('dd')) : '' };
    byId[o.id] = o;
    return o;
  });
  var N = cards.length, limit = STEP;
  var moreRow = D.getElementById('sp-more-row'), moreBtn = D.getElementById('sp-more'), allBtn = D.getElementById('sp-all');
  function paint() {
    cards.forEach(function (o, i) { o.el.hidden = i >= limit; });
    var left = Math.max(0, N - limit);
    moreRow.hidden = left <= 0;
    moreBtn.textContent = 'Show ' + Math.min(STEP, left) + ' more' + (left > STEP ? ' (' + left + ' left)' : '');
    allBtn.hidden = left <= STEP;
    H.classList.add('sp-ready');
  }
  moreBtn.addEventListener('click', function () { var before = limit; limit += STEP; paint(); if (cards[before]) focusIt(cards[before].el.querySelector('.sp-name')); say(Math.min(limit, N) + ' of ' + N + ' showing.'); });
  allBtn.addEventListener('click', function () { var before = limit; limit = N; paint(); if (cards[before]) focusIt(cards[before].el.querySelector('.sp-name')); say('All ' + N + ' showing.'); });
  cards.forEach(function (o) {
    o.el.querySelector('.sp-actions').innerHTML = '<button type="button" class="sp-btn sp-open" data-id="' + o.id + '" aria-haspopup="dialog" aria-label="Details for ' + esc(o.name) + '"><span>Details</span></button>';
  });
  grid.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('button.sp-open'); if (b) openCard(b.getAttribute('data-id'), b); });
  paint();

  /* ------------------------------------------------------------------ the Details drawer */
  var dlg = null, mode = null, opener = null, curId = null;
  function ensureDlg() {
    if (dlg) return dlg;
    dlg = el('dialog', 'sp-dlg'); dlg.setAttribute('aria-labelledby', 'sp-dlg-title');
    dlg.innerHTML = '<div class="sp-dlg-head"><div><p class="sp-dlg-meta"></p><h2 id="sp-dlg-title" tabindex="-1"></h2></div><button type="button" class="sp-dlg-x" aria-label="Close">&times;</button></div><div class="sp-dlg-body" tabindex="-1"></div><div class="sp-dlg-foot"></div>';
    D.body.appendChild(dlg);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) closeDlg(); });
    dlg.querySelector('.sp-dlg-x').addEventListener('click', closeDlg);
    dlg.addEventListener('close', onClosed);
    dlg.querySelector('.sp-dlg-foot').addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button[data-a]'); if (!b || !curId) return;
      var a = b.getAttribute('data-a'), id = curId;
      if (a === 'link') copy(location.origin + location.pathname + '#' + id, 'Link copied.');
      else if (a === 'print') printNow();
      else if (a === 'try') { closeDlg(); pickTry(id); }
    });
    return dlg;
  }
  function closeDlg() { if (dlg && dlg.open) { if (dlg.close) dlg.close(); else { dlg.removeAttribute('open'); onClosed(); } } }
  function onClosed() {
    H.classList.remove('sp-lock');
    var id = curId; mode = null; curId = null;
    if (id && location.hash === '#' + id) { try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) {} }
    if (opener && D.contains(opener) && opener.offsetParent !== null) focusIt(opener);
    opener = null;
  }
  function status(m) { var s = dlg.querySelector('.sp-dlg-status'); if (s) { s.textContent = m; setTimeout(function () { if (s.textContent === m) s.textContent = ''; }, 3500); } }
  function openCard(id, from) {
    var o = byId[id]; if (!o) return;
    ensureDlg(); mode = 'card'; curId = id; opener = from || opener || D.activeElement;
    dlg.querySelector('.sp-dlg-meta').innerHTML = '<span class="sp-kind">' + esc(o.kindLabel) + '</span><span class="sp-ev sp-ev-' + o.ev + '">' + EVL[o.ev] + '</span>';
    dlg.querySelector('#sp-dlg-title').innerHTML = o.nameHtml;
    var body = dlg.querySelector('.sp-dlg-body'); body.innerHTML = '';
    var g = el('dl', 'sp-glance-row');
    g.innerHTML = '<div><dt>Studied in</dt><dd>' + esc(o.studied) + '</dd></div>' + (o.forms ? '<div><dt>Forms</dt><dd>' + esc(o.forms) + '</dd></div>' : '');
    body.appendChild(g);
    if (o.body) body.appendChild(o.body.cloneNode(true));
    var f = dlg.querySelector('.sp-dlg-foot');
    f.innerHTML = (o.tryable ? '<button type="button" class="sp-btn sp-try-btn" data-a="try">Try this week</button>' : '') + '<button type="button" class="sp-btn" data-a="link">Copy link</button><button type="button" class="sp-btn" data-a="print">Print this</button><p class="sp-dlg-status" role="status" aria-live="polite"></p>';
    if (!dlg.open) { H.classList.add('sp-lock'); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
    body.scrollTop = 0;
    try { history.replaceState(history.state, '', location.pathname + location.search + '#' + id); } catch (e) {}
  }
  function copy(text, ok) {
    function done(g) { status(g ? ok : 'Could not copy. Select the address and copy it by hand.'); say(g ? ok : 'Could not copy.'); }
    function fb() { var ta = D.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0'; (dlg && dlg.open ? dlg : D.body).appendChild(ta); ta.select(); var g = false; try { g = D.execCommand('copy'); } catch (e) {} ta.parentNode.removeChild(ta); done(g); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, fb); else fb();
  }

  /* ------------------------------------------------------------------ print the open card */
  var pr = null;
  function fillPrint() {
    if (!pr) { pr = el('div'); pr.id = 'sp-print'; D.body.appendChild(pr); }
    var o = byId[curId]; if (!o) return;
    var u = location.origin + location.pathname;
    pr.innerHTML = '<div class="sp-pr-item"><h2>' + o.nameHtml + '</h2><p><span class="sp-ev">' + EVL[o.ev] + '</span> · ' + esc(o.kindLabel) + '</p><dl><dt>Studied in</dt><dd>' + esc(o.studied) + '</dd>' +
      (o.forms ? '<dt>Forms</dt><dd>' + esc(o.forms) + '</dd>' : '') + '</dl>' + (o.body ? o.body.innerHTML : '') + '</div><p class="sp-pr-foot">From Spread Love &amp; Acceptance, Calm without pills: ' + esc(u) + '#' + o.id + '. General information from published research, not medical advice. Last checked: October 2026.</p>';
  }
  function printNow() { fillPrint(); H.classList.add('sp-printing'); setTimeout(function () { window.print(); setTimeout(function () { if (!/Mobi|Android/i.test(navigator.userAgent)) endPrint(); }, 300); }, 30); }
  function endPrint() { H.classList.remove('sp-printing'); if (pr) pr.innerHTML = ''; }
  window.addEventListener('beforeprint', function () { if (dlg && dlg.open && !H.classList.contains('sp-printing')) { fillPrint(); H.classList.add('sp-printing'); } });
  window.addEventListener('afterprint', endPrint);

  /* ------------------------------------------------------------------ reaching a card, or a part of the old page */
  var OLD = {};   // ids from the old supplements page: they now land on the note about supplements, herbs and drugs
  (D.getElementById('sp-old-ids') ? D.getElementById('sp-old-ids').getAttribute('data-ids') : '').split(' ').forEach(function (i) { if (i) OLD[i] = 'supplements-note'; });
  var COND = { sleep: 'sleep-regularity', anxiety: 'breathing', panic: 'breathing', stress: 'exercise', mood: 'exercise', focus: 'exercise', burnout: 'pacing', grief: 'connection', social: 'connection', regulation: 'breathing', racing: 'expressive-writing', pain: 'pacing', sensory: 'sensory-tools', pms: 'exercise', menopause: 'cbt-i' };
  function reveal(id, open, from) {
    var o = byId[id]; if (!o) return false;
    var i = cards.indexOf(o); if (i >= limit) { limit = Math.ceil((i + 1) / STEP) * STEP; paint(); }
    o.el.scrollIntoView({ block: 'center', behavior: 'auto' });
    o.el.classList.add('is-target'); setTimeout(function () { o.el.classList.remove('is-target'); }, 2600);
    if (open) openCard(id, from || o.el.querySelector('.sp-open')); else focusIt(o.el.querySelector('.sp-name'));
    return true;
  }
  function openAncestors(n) { for (var p = n; p && p !== D.body; p = p.parentNode) if (p.tagName === 'DETAILS') p.open = true; }
  function toHash() {
    var id = decodeURIComponent((location.hash || '').slice(1));
    if (!id) return;
    if (byId[id]) { if (dlg && dlg.open && curId === id) return; reveal(id, true); return; }
    var t = D.getElementById(id);
    if (t) { openAncestors(t); if (id === 'studies') { var rd = D.getElementById('sp-reads'); if (rd) rd.open = true; } return; }
    var to = OLD[id] || (COND[id] && 'card:' + COND[id]);
    if (!to) return;
    if (/^card:/.test(to)) { reveal(to.slice(5), false); return; }
    t = D.getElementById(to); if (t) { scrollTo(t); }
  }
  window.addEventListener('hashchange', function () { if (dlg && dlg.open) closeDlg(); toHash(); });
  D.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a || e.defaultPrevented || (dlg && dlg.contains(a))) return;
    var id = decodeURIComponent(a.getAttribute('href').slice(1));
    if (byId[id]) { e.preventDefault(); reveal(id, true, a); }
  });

  /* ------------------------------------------------------------------ toolbar */
  var tools = D.getElementById('sp-tools');
  var saveB = tools.querySelector('[data-t="save"]'), printB = tools.querySelector('[data-t="print"]'), tocB = tools.querySelector('[data-t="toc"]'), toc = D.getElementById('sp-toc');
  saveB.addEventListener('click', function () { var b = D.querySelector('.tol-save-btn'); if (b) b.click(); });
  printB.addEventListener('click', function () { window.print(); });
  function tocOpen(open) { toc.hidden = !open; tocB.setAttribute('aria-expanded', String(open)); }
  tocB.addEventListener('click', function (e) { e.stopPropagation(); tocOpen(toc.hidden); });
  toc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
    var t = D.getElementById(a.getAttribute('href').slice(1)); if (!t) return;
    e.preventDefault(); tocOpen(false); scrollTo(t); try { history.replaceState(null, '', '#' + t.id); } catch (er) {}
    focusIt(t.querySelector('h2') || t);
  });
  D.addEventListener('click', function (e) { if (!toc.hidden && !e.target.closest('.sp-menu-wrap')) tocOpen(false); });
  D.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !toc.hidden) { tocOpen(false); focusIt(tocB); } });
  var shareSlot = tools.querySelector('.sp-share-slot'), extra = toc.querySelector('.sp-toc-extra'), n = 0;
  function adopt() {
    var main = D.getElementById('main');
    var top = main.querySelector(':scope > .tsk-top-row .tol-share-btn, :scope > .tsk-top-row [data-share]');
    if (top && !shareSlot.contains(top)) { shareSlot.appendChild(top); top.classList.add('sp-tbtn'); }
    var steps = main.querySelector(':scope > .tol-steps-toggle');
    if (steps && !extra.contains(steps)) extra.appendChild(steps);
    if (++n > 14 && !D.querySelector('.tol-save-btn')) saveB.hidden = true;
  }
  adopt();
  if (window.MutationObserver) { var mo = new MutationObserver(adopt); mo.observe(D.getElementById('main'), { childList: true }); setTimeout(function () { mo.disconnect(); if (!shareSlot.children.length) shareSlot.classList.add('is-empty'); }, 9000); }
  var tries = 0; (function poll() { adopt(); if (++tries < 16) setTimeout(poll, 500); })();

  /* ------------------------------------------------------------------ Try one this week (this device only) */
  var pick = D.getElementById('sp-try-pick'), dayBox = D.getElementById('sp-days'), msg = D.getElementById('sp-try-msg'), clr = D.getElementById('sp-try-clear');
  function pad(x) { return (x < 10 ? '0' : '') + x; }
  function weekStart() { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayIdx() { return (new Date().getDay() + 6) % 7; }
  var T = null;
  function loadT() { try { T = JSON.parse(lsGet(TRY_KEY) || 'null'); } catch (e) { T = null; } if (T && (!byId[T.id] || !Array.isArray(T.d) || T.d.length !== 7)) T = null; }
  function saveT() { if (T && T.id) lsSet(TRY_KEY, JSON.stringify(T)); else lsDel(TRY_KEY); }
  function drawT() {
    var wk = weekStart(), fresh = false;
    if (T && T.wk !== wk) { T.wk = wk; T.d = [0, 0, 0, 0, 0, 0, 0]; fresh = true; saveT(); }
    pick.value = T ? T.id : '';
    var ti = todayIdx();
    Array.prototype.forEach.call(dayBox.querySelectorAll('.sp-day'), function (b) {
      var i = +b.getAttribute('data-d'); b.setAttribute('aria-pressed', String(!!(T && T.d[i]))); b.disabled = !T;
      if (i === ti) b.setAttribute('aria-current', 'date'); else b.removeAttribute('aria-current');
    });
    clr.hidden = !T;
    if (!T) msg.textContent = 'Pick one to begin.';
    else { var c = T.d.reduce(function (a, b) { return a + b; }, 0); msg.textContent = (fresh ? 'A new week. ' : '') + byId[T.id].name + ': ' + c + (c === 1 ? ' day' : ' days') + ' ticked this week.'; }
  }
  function pickTry(id) {
    T = { id: id, wk: weekStart(), d: [0, 0, 0, 0, 0, 0, 0] }; saveT(); drawT();
    scrollTo(D.getElementById('try')); say(byId[id].name + ' is your pick for this week.');
  }
  pick.addEventListener('change', function () { if (!pick.value) { T = null; saveT(); drawT(); return; } if (!T || T.id !== pick.value) { T = { id: pick.value, wk: weekStart(), d: [0, 0, 0, 0, 0, 0, 0] }; saveT(); } drawT(); });
  dayBox.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('.sp-day'); if (!b || !T) return; var i = +b.getAttribute('data-d'); T.d[i] = T.d[i] ? 0 : 1; saveT(); drawT(); });
  clr.addEventListener('click', function () { T = null; saveT(); drawT(); say('Cleared from this device.'); focusIt(pick); });
  loadT(); drawT();

  toHash();
  window.CALMPILLS = { open: openCard, reveal: reveal };
})();
