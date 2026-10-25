/* supp.js: the catalog on /calming-supplements.html.
   The page ships every option as plain HTML cards (readable with JavaScript off and by search engines). This script adds:
   search, filters, sort, a live count, "Show more", a Details drawer (a bottom sheet on phones) that is filled only when opened,
   compare (up to 3), a shortlist kept on this device (print or copy as text), deep links (#option-name), and a tidy toolbar.
   Saved on this device only: the shortlist (localStorage key tol-supp-list). Nothing is sent anywhere. */
(function () {
  'use strict';
  if (window.SUPP) return;
  var D = document, H = D.documentElement;
  var grid = D.getElementById('sp-grid');
  if (!grid) return;

  var LIST_KEY = 'tol-supp-list';
  var STEP = 12, MAXCMP = 3;
  var EVL = { good: 'Good evidence', some: 'Some evidence', mixed: 'Mixed evidence', early: 'Early evidence', weak: 'Weak evidence', none: 'No good evidence' };
  var KINDS = ['supplement', 'herb', 'food', 'habit', 'practice', 'therapy'];

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function el(tag, cls, html) { var n = D.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function norm(s) { return String(s || '').toLowerCase().replace(/[‘’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function reduce() { return (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || H.classList.contains('tol-still') || H.classList.contains('tol-quiet'); }
  function scrollTo(node, block) { try { node.scrollIntoView({ block: block || 'start', behavior: reduce() ? 'auto' : 'smooth' }); } catch (e) { node.scrollIntoView(); } }
  function focusIt(n) { if (!n) return; if (!n.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(n.tagName)) n.setAttribute('tabindex', '-1'); try { n.focus({ preventScroll: true }); } catch (e) { n.focus(); } }
  function txt(n) { return n ? n.textContent.replace(/\s+/g, ' ').trim() : ''; }
  var live = null;
  function say(msg) { if (!live) { live = el('p', 'sr-only'); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); D.body.appendChild(live); } live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); }

  /* ------------------------------------------------------------------ the options */
  var byId = {};
  var cards = Array.prototype.map.call(grid.querySelectorAll('.sp-card'), function (c, i) {
    var d = c.querySelector('details.sp-d'), body = d && d.querySelector('.sp-d-body');
    var store = el('div', 'sp-store'); store.hidden = true;
    if (body) store.appendChild(body);
    if (d) d.parentNode.removeChild(d);
    c.appendChild(store);
    var o = {
      el: c, id: c.id, name: c.getAttribute('data-name'), kind: c.getAttribute('data-kind'), type: c.getAttribute('data-type'), ev: c.getAttribute('data-ev'), evr: +c.getAttribute('data-evr'),
      cond: (c.getAttribute('data-cond') || '').split(' ').filter(Boolean), nt: (c.getAttribute('data-nt') || '').split(' ').filter(Boolean),
      med: c.getAttribute('data-med') || '', preg: c.getAttribute('data-preg') || '', cnd: c.getAttribute('data-cnd') || '', cndt: c.getAttribute('data-cndt') || '', grp: c.getAttribute('data-grp'),
      i: i, body: body, store: store, txt: null
    };
    o.sum = txt(c.querySelector('.sp-sum'));
    o.nameHtml = c.querySelector('.sp-name').innerHTML;
    o.kindLabel = txt(c.querySelector('.sp-kind'));
    var f = c.querySelectorAll('.sp-facts > div');
    o.studied = f[0] ? txt(f[0].querySelector('dd')) : '';
    o.forms = f[1] ? txt(f[1].querySelector('dd')) : '';
    byId[o.id] = o;
    return o;
  });
  var N = cards.length;
  function haystack(o) {
    if (o.txt == null) {
      var top = o.name + ' ' + txt(o.el.querySelector('.sp-aka')) + ' ' + o.sum + ' ' + o.studied + ' ' + o.forms;
      o.txt = { top: norm(top), all: norm(top + ' ' + (o.body ? o.body.textContent : '')), name: norm(o.name) };
    }
    return o.txt;
  }
  function watchOf(o) { var w = o.body && o.body.querySelector('.sp-watch'); return w ? txt(w).replace(/^Watch out\s*/, '') : ''; }
  function rowOf(o, k) { var r = o.body && o.body.querySelector('.sp-row[data-k="' + k + '"] dd'); return r ? r.innerHTML : ''; }

  /* ------------------------------------------------------------------ saved list (this device only) */
  var saved = [];
  function loadSaved() { try { var a = JSON.parse(lsGet(LIST_KEY) || '[]'); saved = Array.isArray(a) ? a.filter(function (id) { return byId[id]; }) : []; } catch (e) { saved = []; } }
  function storeSaved() { if (saved.length) lsSet(LIST_KEY, JSON.stringify(saved)); else lsDel(LIST_KEY); D.dispatchEvent(new CustomEvent('supp-list', { detail: { ids: saved.slice() } })); }
  function isSaved(id) { return saved.indexOf(id) !== -1; }
  function toggleSave(id) {
    var i = saved.indexOf(id);
    if (i === -1) { saved.push(id); say(byId[id].name + ' saved to your shortlist.'); } else { saved.splice(i, 1); say(byId[id].name + ' removed from your shortlist.'); }
    storeSaved(); syncButtons();
  }
  loadSaved();

  /* ------------------------------------------------------------------ compare (this visit only) */
  var cmp = [];
  var tray = D.getElementById('sp-tray'), trayT = D.getElementById('sp-tray-t'), trayOpen = D.getElementById('sp-tray-open');
  function toggleCmp(id) {
    var i = cmp.indexOf(id);
    if (i !== -1) cmp.splice(i, 1);
    else if (cmp.length >= MAXCMP) { say('You can compare up to ' + MAXCMP + '. Remove one first.'); trayT.textContent = 'You can compare up to ' + MAXCMP + '. Remove one first.'; return; }
    else cmp.push(id);
    syncButtons();
  }

  function syncButtons() {
    Array.prototype.forEach.call(D.querySelectorAll('.sp-sv[data-id]'), function (b) {
      var on = isSaved(b.getAttribute('data-id')), nm = byId[b.getAttribute('data-id')].name;
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', (on ? 'Remove ' + nm + ' from my shortlist' : 'Save ' + nm + ' to my shortlist'));
      var t = b.querySelector('.sp-bt'); if (t) t.textContent = on ? 'Saved' : 'Save';
    });
    Array.prototype.forEach.call(D.querySelectorAll('.sp-cmp[data-id]'), function (b) {
      var on = cmp.indexOf(b.getAttribute('data-id')) !== -1, nm = byId[b.getAttribute('data-id')].name;
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', (on ? 'Remove ' + nm + ' from the comparison' : 'Compare ' + nm));
      var t = b.querySelector('.sp-bt'); if (t) t.textContent = on ? 'Added' : 'Compare';
    });
    var sc = D.getElementById('sp-scount'); if (sc) { sc.textContent = saved.length; sc.hidden = !saved.length; }
    var sb = D.getElementById('sp-short-btn'); if (sb) sb.setAttribute('aria-label', 'My shortlist, ' + saved.length + (saved.length === 1 ? ' option' : ' options'));
    if (tray) {
      tray.hidden = !cmp.length;
      if (cmp.length) {
        trayT.textContent = 'Compare: ' + cmp.map(function (id) { return byId[id].name; }).join(', ') + ' (' + cmp.length + ' of ' + MAXCMP + ')' + (cmp.length < 2 ? '. Pick one more.' : '');
        trayOpen.disabled = cmp.length < 2;
      }
    }
    if (dlg && dlg.open && mode === 'list') renderList();
    if (dlg && dlg.open && mode === 'compare') { if (cmp.length < 2) closeDlg(); }
  }

  /* ------------------------------------------------------------------ filters, search, sort, "show more" */
  var st = { kind: '', cond: '', nt: '', ev: [], q: '', sort: 'ev', limit: STEP, only: null, onlyLabel: '' };
  var order = cards.slice();
  var q = D.getElementById('sp-q'), sortSel = D.getElementById('sp-sort'), condSel = D.getElementById('sp-f-cond'), ntSel = D.getElementById('sp-f-nt');
  var countEl = D.getElementById('sp-count'), emptyEl = D.getElementById('sp-empty'), moreRow = D.getElementById('sp-more-row'), moreBtn = D.getElementById('sp-more'), allBtn = D.getElementById('sp-all');
  var fcount = D.getElementById('sp-fcount');
  function radioVal(name) { var r = D.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ''; }
  function evChecked() { return Array.prototype.map.call(D.querySelectorAll('input[name="sp-ev"]:checked'), function (i) { return i.value; }); }

  function matches(o, tokens) {
    if (st.only) { if (st.only.indexOf(o.id) === -1) return false; }
    if (st.kind && o.kind !== st.kind) return false;
    if (st.cond && o.cond.indexOf(st.cond) === -1) return false;
    if (st.nt && o.nt.indexOf(st.nt) === -1) return false;
    if (st.ev.length && st.ev.indexOf(o.ev) === -1) return false;
    if (tokens && tokens.length) { var h = haystack(o).all; for (var i = 0; i < tokens.length; i++) if (h.indexOf(tokens[i]) === -1) return false; }
    return true;
  }
  function score(o, tokens) {
    if (!tokens.length) return 0;
    var h = haystack(o), s = 0, whole = tokens.join(' ');
    if (h.name === whole) s += 6; else if (h.name.indexOf(whole) === 0) s += 4; else if (h.name.indexOf(whole) !== -1) s += 3;
    tokens.forEach(function (t) { if (h.name.indexOf(t) !== -1) s += 1; if (h.top.indexOf(t) !== -1) s += 1; });
    return s;
  }
  function activeFilters() { return (st.cond || st.only ? 1 : 0) + (st.nt ? 1 : 0) + (st.ev.length ? 1 : 0); }
  function anyFilter() { return !!(st.kind || st.cond || st.nt || st.ev.length || st.q || st.only); }

  function apply(fromUser) {
    var tokens = norm(st.q).split(' ').filter(Boolean);
    var list = cards.slice();
    var sc = {}; cards.forEach(function (o) { sc[o.id] = score(o, tokens); });
    list.sort(function (a, b) {
      if (tokens.length && sc[a.id] !== sc[b.id]) return sc[b.id] - sc[a.id];
      if (st.sort === 'az') return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
      return (b.evr - a.evr) || (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1);
    });
    var changed = list.some(function (o, i) { return o !== order[i]; });
    if (changed) { var fr = D.createDocumentFragment(); list.forEach(function (o) { fr.appendChild(o.el); }); grid.appendChild(fr); order = list; }
    var matched = list.filter(function (o) { return matches(o, tokens); });
    var shown = 0;
    list.forEach(function (o) {
      var ok = matches(o, tokens), vis = ok && shown < st.limit;
      if (ok) shown++;
      o.el.hidden = !vis;
    });
    var vis = Math.min(matched.length, st.limit);
    var s;
    if (!matched.length) s = 'No options match.';
    else if (!anyFilter()) s = N + ' options, ' + (st.sort === 'az' ? 'A to Z' : 'strongest evidence first');
    else s = matched.length + ' of ' + N + ' options match' + (vis < matched.length ? ', showing ' + vis : '');
    countEl.textContent = s;
    emptyEl.hidden = matched.length > 0;
    var left = matched.length - vis;
    moreRow.hidden = left <= 0;
    moreBtn.textContent = 'Show ' + Math.min(STEP, left) + ' more' + (left > STEP ? ' (' + left + ' left)' : '');
    allBtn.hidden = left <= STEP;
    allBtn.textContent = 'Show all ' + matched.length;
    var n = activeFilters(); fcount.textContent = n; fcount.hidden = !n;
    // notes for a chosen goal or group
    Array.prototype.forEach.call(D.querySelectorAll('[data-cond-note]'), function (p) { p.hidden = p.getAttribute('data-cond-note') !== st.cond; });
    Array.prototype.forEach.call(D.querySelectorAll('[data-nt-intro]'), function (p) { p.hidden = p.getAttribute('data-nt-intro') !== st.nt; });
    // the neurotype note on each card is read in Details; mark which cards have one for the chosen group
    H.classList.add('sp-ready');
    if (fromUser) syncUrl();
    D.dispatchEvent(new CustomEvent('supp-filter', { detail: { matched: matched.length } }));
    return matched;
  }
  function syncUrl() {
    if (!window.history || !history.replaceState) return;
    var p = new URLSearchParams(location.search);
    ['condition', 'neurotype', 'type', 'evidence', 'q', 'sort', 'cond', 'nt', 'ev'].forEach(function (k) { p.delete(k); });
    if (st.cond) p.set('condition', st.cond);
    if (st.nt) p.set('neurotype', st.nt);
    if (st.kind) p.set('type', st.kind);
    if (st.ev.length) p.set('evidence', st.ev.join(','));
    if (st.q) p.set('q', st.q);
    if (st.sort !== 'ev') p.set('sort', st.sort);
    var s = p.toString();
    try { history.replaceState(history.state, '', location.pathname + (s ? '?' + s : '') + location.hash); } catch (e) {}
  }
  function readUi() {
    st.kind = radioVal('sp-kind'); st.ev = evChecked(); st.nt = ntSel.value; st.sort = sortSel.value; st.q = q.value.trim();
    var cv = condSel.value;
    if (cv === '__only') { /* keep the picker's set */ } else { st.cond = cv; st.only = null; st.onlyLabel = ''; dropOnlyOption(); }
  }
  function dropOnlyOption() { var o = condSel.querySelector('option[value="__only"]'); if (o) o.parentNode.removeChild(o); }
  function writeUi() {
    var r = D.querySelector('input[name="sp-kind"][value="' + st.kind + '"]'); if (r) r.checked = true;
    Array.prototype.forEach.call(D.querySelectorAll('input[name="sp-ev"]'), function (i) { i.checked = st.ev.indexOf(i.value) !== -1; });
    ntSel.value = st.nt; sortSel.value = st.sort; q.value = st.q;
    if (st.only) {
      var o = condSel.querySelector('option[value="__only"]');
      if (!o) { o = D.createElement('option'); o.value = '__only'; condSel.insertBefore(o, condSel.firstChild.nextSibling); }
      o.textContent = 'From Find what fits: ' + st.onlyLabel; condSel.value = '__only';
    } else { dropOnlyOption(); condSel.value = st.cond; }
  }
  function clearFilters(keepQuery) {
    st.kind = ''; st.cond = ''; st.nt = ''; st.ev = []; st.only = null; st.onlyLabel = ''; if (!keepQuery) st.q = '';
    st.limit = STEP; writeUi(); apply(true);
  }
  function setFilters(f) {
    if (f.kind != null) st.kind = f.kind;
    if (f.cond != null) { st.cond = f.cond; st.only = null; st.onlyLabel = ''; }
    if (f.nt != null) st.nt = f.nt;
    if (f.ev != null) st.ev = f.ev;
    if (f.only) { st.only = f.only; st.onlyLabel = f.label || ''; st.cond = ''; }
    if (f.q != null) st.q = f.q;
    st.limit = STEP; writeUi(); apply(true);
  }
  var qTimer = 0;
  q.addEventListener('input', function () { clearTimeout(qTimer); qTimer = setTimeout(function () { readUi(); st.limit = STEP; apply(true); }, 140); });
  q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); readUi(); apply(true); var f = grid.querySelector('.sp-card:not([hidden]) .sp-name'); if (f && !e.shiftKey) { /* leave focus in the box; Tab goes to the first card */ } } });
  [ntSel, sortSel, condSel].forEach(function (s) { s.addEventListener('change', function () { readUi(); st.limit = STEP; apply(true); }); });
  Array.prototype.forEach.call(D.querySelectorAll('input[name="sp-kind"], input[name="sp-ev"]'), function (i) { i.addEventListener('change', function () { readUi(); st.limit = STEP; apply(true); }); });
  D.getElementById('sp-clear').addEventListener('click', function () { clearFilters(); });
  D.getElementById('sp-empty-clear').addEventListener('click', function () { clearFilters(); focusIt(q); });
  moreBtn.addEventListener('click', function () {
    var before = grid.querySelectorAll('.sp-card:not([hidden])').length;
    st.limit += STEP; apply(false);
    var vis = grid.querySelectorAll('.sp-card:not([hidden])'); if (vis[before]) focusIt(vis[before].querySelector('.sp-name'));
    say(vis.length + ' options showing.');
  });
  allBtn.addEventListener('click', function () {
    var before = grid.querySelectorAll('.sp-card:not([hidden])').length;
    st.limit = 1e6; apply(false);
    var vis = grid.querySelectorAll('.sp-card:not([hidden])'); if (vis[before]) focusIt(vis[before].querySelector('.sp-name'));
    say('All ' + vis.length + ' matching options showing.');
  });

  // the Filters popover
  var bar = D.getElementById('sp-bar'), pop = D.getElementById('sp-pop'), fbtn = D.getElementById('sp-filter-btn');
  function popOpen(open) {
    pop.hidden = !open; fbtn.setAttribute('aria-expanded', String(open));
    if (open) { var r = bar.getBoundingClientRect(); if (r.top < 0) scrollTo(bar, 'start'); }
  }
  fbtn.addEventListener('click', function () { popOpen(pop.hidden); });
  D.getElementById('sp-pop-done').addEventListener('click', function () { popOpen(false); focusIt(fbtn); var f = grid.querySelector('.sp-card:not([hidden])'); if (f) scrollTo(D.getElementById('sp-count'), 'center'); });
  D.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pop.hidden && !(dlg && dlg.open)) { popOpen(false); focusIt(fbtn); } });
  D.addEventListener('click', function (e) { if (!pop.hidden && !e.target.closest('#sp-bar')) popOpen(false); });

  /* ------------------------------------------------------------------ the Details drawer, compare and shortlist views */
  var dlg = null, mode = null, opener = null, curId = null;
  function ensureDlg() {
    if (dlg) return dlg;
    dlg = el('dialog', 'sp-dlg');
    dlg.setAttribute('aria-labelledby', 'sp-dlg-title');
    dlg.innerHTML = '<div class="sp-dlg-head"><div><p class="sp-dlg-meta"></p><h2 id="sp-dlg-title" tabindex="-1"></h2></div><button type="button" class="sp-dlg-x" aria-label="Close">&times;</button></div>' +
      '<div class="sp-dlg-body" tabindex="-1"></div><div class="sp-dlg-foot"></div>';
    D.body.appendChild(dlg);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) closeDlg(); });
    dlg.querySelector('.sp-dlg-x').addEventListener('click', closeDlg);
    dlg.addEventListener('close', onClosed);
    dlg.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = decodeURIComponent(a.getAttribute('href').slice(1));
      if (byId[id]) { e.preventDefault(); openCard(id); }
    });
    return dlg;
  }
  function head(meta, title) {
    dlg.querySelector('.sp-dlg-meta').innerHTML = meta;
    dlg.querySelector('#sp-dlg-title').innerHTML = title;
  }
  function foot(html) { var f = dlg.querySelector('.sp-dlg-foot'); f.innerHTML = html; return f; }
  function open() {
    if (!dlg.open) {
      H.classList.add('sp-lock');
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    }
    dlg.querySelector('.sp-dlg-body').scrollTop = 0;
  }
  function closeDlg() { if (dlg && dlg.open) { if (dlg.close) dlg.close(); else { dlg.removeAttribute('open'); onClosed(); } } }
  function onClosed() {
    H.classList.remove('sp-lock');
    var was = mode, id = curId;
    mode = null; curId = null;
    if (was === 'card' && id && location.hash === '#' + id) { try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) {} }
    if (opener && D.contains(opener) && opener.offsetParent !== null) focusIt(opener);
    opener = null;
  }
  function statusMsg(m) { var s = dlg.querySelector('.sp-dlg-status'); if (s) { s.textContent = m; setTimeout(function () { if (s.textContent === m) s.textContent = ''; }, 3500); } }

  function btnSave(id) { return '<button type="button" class="sp-btn sp-sv" data-id="' + id + '" aria-pressed="false"><span class="sp-bt">Save</span></button>'; }
  function btnCmp(id) { return '<button type="button" class="sp-btn sp-cmp" data-id="' + id + '" aria-pressed="false"><span class="sp-bt">Compare</span></button>'; }

  function openCard(id, from) {
    var o = byId[id]; if (!o) return;
    ensureDlg(); mode = 'card'; curId = id; opener = from || opener || D.activeElement;
    head('<span class="sp-kind">' + esc(o.kindLabel) + '</span><span class="sp-ev sp-ev-' + o.ev + '">' + EVL[o.ev] + '</span>', o.nameHtml);
    var body = dlg.querySelector('.sp-dlg-body'); body.innerHTML = '';
    var g = el('dl', 'sp-glance-row');
    g.innerHTML = '<div><dt>Studied in</dt><dd>' + esc(o.studied) + '</dd></div>' + (o.forms ? '<div><dt>Forms</dt><dd>' + esc(o.forms) + '</dd></div>' : '');
    body.appendChild(g);
    if (o.body) body.appendChild(o.body.cloneNode(true));
    var f = foot(btnSave(id) + btnCmp(id) + '<button type="button" class="sp-btn" data-a="link">Copy link</button><button type="button" class="sp-btn" data-a="print">Print this</button><p class="sp-dlg-status" role="status" aria-live="polite"></p>');
    f.querySelector('[data-a="link"]').addEventListener('click', function () { copy(location.origin + location.pathname + '#' + id, 'Link copied.'); });
    f.querySelector('[data-a="print"]').addEventListener('click', function () { printNow(); });
    f.querySelector('.sp-sv').addEventListener('click', function () { toggleSave(id); });
    f.querySelector('.sp-cmp').addEventListener('click', function () { toggleCmp(id); });
    syncButtons();
    open();
    try { history.replaceState(history.state, '', location.pathname + location.search + '#' + id); } catch (e) {}
  }

  function cell(o, html) { return '<div class="sp-cmp-cell"><b>' + esc(o.name) + '</b>' + (html || '<span>Not stated on this page.</span>') + '</div>'; }
  function openCompare(from) {
    if (cmp.length < 2) return;
    ensureDlg(); mode = 'compare'; curId = null; opener = from || opener || D.activeElement;
    head('<span class="sp-kind">Side by side</span>', 'Compare ' + cmp.length + ' options');
    var os = cmp.map(function (id) { return byId[id]; });
    var rows = [
      ['Evidence', function (o) { return '<span class="sp-ev sp-ev-' + o.ev + '">' + EVL[o.ev] + '</span>'; }],
      ['What it may do', function (o) { return esc(o.sum); }],
      ['Studied in', function (o) { return esc(o.studied); }],
      ['Forms', function (o) { return o.forms ? esc(o.forms) : ''; }],
      ['Watch out', function (o) { return esc(watchOf(o)); }],
      ['Medicines', function (o) { return rowOf(o, 'meds'); }],
      ['Pregnancy and breastfeeding', function (o) { return rowOf(o, 'preg'); }],
      ['Liver, kidneys and other conditions', function (o) { return rowOf(o, 'liver') || (rowOf(o, 'care') ? 'Take care if ' + rowOf(o, 'care') : ''); }],
      ['Side effects', function (o) { return rowOf(o, 'side'); }],
      ['Sources', function (o) { var s = o.body && o.body.querySelector('.sp-src'); return s ? s.innerHTML.replace(/^(Sources?:\s*)/, '') : ''; }]
    ];
    var h = '<div class="sp-cmp-grid" style="--n:' + os.length + '"><div class="sp-cmp-row sp-cmp-head"><div class="sp-cmp-label">Option</div><div class="sp-cmp-cells">' +
      os.map(function (o) { return '<div class="sp-cmp-cell"><b>' + o.nameHtml + '</b><button type="button" class="sp-btn" data-open="' + o.id + '">Details</button> <button type="button" class="sp-btn" data-drop="' + o.id + '">Remove</button></div>'; }).join('') + '</div></div>';
    rows.forEach(function (r) { h += '<div class="sp-cmp-row"><div class="sp-cmp-label">' + r[0] + '</div><div class="sp-cmp-cells">' + os.map(function (o) { return cell(o, r[1](o)); }).join('') + '</div></div>'; });
    h += '</div>';
    var body = dlg.querySelector('.sp-dlg-body'); body.innerHTML = h;
    body.querySelectorAll('[data-open]').forEach(function (b) { b.addEventListener('click', function () { openCard(b.getAttribute('data-open'), opener); }); });
    body.querySelectorAll('[data-drop]').forEach(function (b) { b.addEventListener('click', function () { toggleCmp(b.getAttribute('data-drop')); if (cmp.length >= 2) openCompare(opener); }); });
    var f = foot('<button type="button" class="sp-btn" data-a="clear">Clear comparison</button><button type="button" class="sp-btn" data-a="print">Print this</button><p class="sp-dlg-status" role="status" aria-live="polite"></p>');
    f.querySelector('[data-a="clear"]').addEventListener('click', function () { cmp = []; syncButtons(); closeDlg(); });
    f.querySelector('[data-a="print"]').addEventListener('click', function () { printNow(); });
    open();
  }

  function renderList() {
    var body = dlg.querySelector('.sp-dlg-body');
    if (!saved.length) {
      body.innerHTML = '<p class="sp-empty-list">Nothing saved yet. Use <strong>Save</strong> on any option and it will wait here. Your shortlist stays on this device and is never sent anywhere.</p>';
    } else {
      body.innerHTML = '<ul class="sp-list">' + saved.map(function (id) {
        var o = byId[id];
        return '<li><div><span class="sp-ev sp-ev-' + o.ev + '">' + EVL[o.ev] + '</span></div><h3>' + o.nameHtml + '</h3><p>' + esc(o.sum) + '</p><p><strong>Watch out:</strong> ' + esc(watchOf(o)) + '</p>' +
          '<div class="sp-list-act"><button type="button" class="sp-btn" data-open="' + id + '">Details</button><button type="button" class="sp-btn" data-rm="' + id + '">Remove</button></div></li>';
      }).join('') + '</ul>';
      body.querySelectorAll('[data-open]').forEach(function (b) { b.addEventListener('click', function () { openCard(b.getAttribute('data-open'), opener); }); });
      body.querySelectorAll('[data-rm]').forEach(function (b) { b.addEventListener('click', function () { var id = b.getAttribute('data-rm'); toggleSave(id); }); });
    }
    var f = foot('<button type="button" class="sp-btn" data-a="print"' + (saved.length ? '' : ' disabled') + '>Print</button><button type="button" class="sp-btn" data-a="copy"' + (saved.length ? '' : ' disabled') + '>Copy as text</button><button type="button" class="sp-btn" data-a="clear"' + (saved.length ? '' : ' disabled') + '>Clear my shortlist</button><p class="sp-dlg-status" role="status" aria-live="polite"></p>');
    f.querySelector('[data-a="print"]').addEventListener('click', function () { printNow(); });
    f.querySelector('[data-a="copy"]').addEventListener('click', function () { copy(listText(), 'Copied as text.'); });
    f.querySelector('[data-a="clear"]').addEventListener('click', function () { saved = []; storeSaved(); syncButtons(); statusMsg('Shortlist cleared.'); });
  }
  function openList(from) {
    ensureDlg(); mode = 'list'; curId = null; opener = from || opener || D.activeElement;
    head('<span class="sp-kind">Saved on this device</span>', 'My shortlist');
    renderList(); open();
  }
  function listText() {
    var u = location.origin + location.pathname;
    var t = 'My shortlist: calming supplements, herbs and natural approaches\nFrom ' + u + '\nThis is a list of what research says. It is not medical advice or a recommendation.\n\n';
    saved.forEach(function (id, i) {
      var o = byId[id];
      t += (i + 1) + '. ' + o.name + ' (' + EVL[o.ev] + ')\n   ' + o.sum + '\n   Watch out: ' + watchOf(o) + '\n   ' + u + '#' + id + '\n\n';
    });
    return t.trim() + '\n';
  }
  function copy(text, ok) {
    function done(good) { statusMsg(good ? ok : 'Could not copy. Select the text and copy it by hand.'); say(good ? ok : 'Could not copy.'); }
    function fallback() {
      var ta = D.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      (dlg && dlg.open ? dlg : D.body).appendChild(ta); ta.select(); var good = false; try { good = D.execCommand('copy'); } catch (e) {} ta.parentNode.removeChild(ta); done(good);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, fallback); else fallback();
  }

  /* ------------------------------------------------------------------ printing: the open view, or the shortlist */
  var pr = null;
  function printBox() { if (!pr) { pr = el('div'); pr.id = 'sp-print'; D.body.appendChild(pr); } return pr; }
  function srcText(root) {
    // links keep their address in print (shown by the style sheet)
    return root;
  }
  function itemHtml(o, full) {
    var h = '<div class="sp-pr-item"><h2>' + o.nameHtml + '</h2><p><span class="sp-ev">' + EVL[o.ev] + '</span> · ' + esc(o.kindLabel) + '</p>' +
      '<dl><dt>Studied in</dt><dd>' + esc(o.studied) + '</dd>' + (o.forms ? '<dt>Forms</dt><dd>' + esc(o.forms) + '</dd>' : '') + '</dl>';
    if (full && o.body) h += o.body.innerHTML; else h += '<p>' + esc(o.sum) + '</p><p><strong>Watch out:</strong> ' + esc(watchOf(o)) + '</p>';
    return h + '</div>';
  }
  function fillPrint() {
    var b = printBox(), u = location.origin + location.pathname, h = '';
    if (mode === 'card' && curId) h = itemHtml(byId[curId], true) + '<p class="sp-pr-foot">' + esc(u) + '#' + curId + '</p>';
    else if (mode === 'compare') { h = '<h1>Compare</h1>' + cmp.map(function (id) { return itemHtml(byId[id], false); }).join(''); }
    else { h = '<h1>My shortlist</h1>' + saved.map(function (id) { return itemHtml(byId[id], true); }).join(''); }
    h += '<p class="sp-pr-foot">From Spread Love &amp; Acceptance, calming supplements guide: ' + esc(u) + '. General information from published research, not medical advice. Last checked: October 2026.</p>';
    b.innerHTML = h;
  }
  function printNow() { fillPrint(); H.classList.add('sp-printing'); setTimeout(function () { window.print(); setTimeout(function () { if (!/Mobi|Android/i.test(navigator.userAgent)) endPrint(); }, 300); }, 30); }
  function endPrint() { H.classList.remove('sp-printing'); if (pr) pr.innerHTML = ''; }
  window.addEventListener('beforeprint', function () { if (dlg && dlg.open && !H.classList.contains('sp-printing')) { fillPrint(); H.classList.add('sp-printing'); } });
  window.addEventListener('afterprint', endPrint);

  /* ------------------------------------------------------------------ card buttons */
  cards.forEach(function (o) {
    var a = o.el.querySelector('.sp-actions');
    a.innerHTML = '<button type="button" class="sp-btn sp-open" data-id="' + o.id + '" aria-haspopup="dialog" aria-label="Details for ' + esc(o.name) + '"><span>Details</span></button>' +
      btnSave(o.id) + btnCmp(o.id);
  });
  grid.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button[data-id]'); if (!b) return;
    var id = b.getAttribute('data-id');
    if (b.classList.contains('sp-open')) openCard(id, b);
    else if (b.classList.contains('sp-sv')) toggleSave(id);
    else if (b.classList.contains('sp-cmp')) toggleCmp(id);
  });
  trayOpen.addEventListener('click', function () { openCompare(trayOpen); });
  D.getElementById('sp-tray-clear').addEventListener('click', function () { cmp = []; syncButtons(); });
  D.getElementById('sp-short-btn').addEventListener('click', function (e) { openList(e.currentTarget); });

  /* ------------------------------------------------------------------ reaching a card or a part of the page */
  var GROUP_IDS = { common: 1, 'lesser-known': 1, other: 1, 'no-pill': 1 };
  function rankOf(o) { var tokens = norm(st.q).split(' ').filter(Boolean), n = 0; for (var i = 0; i < order.length; i++) { if (order[i] === o) return n; if (matches(order[i], tokens)) n++; } return n; }
  function reveal(id, opts) {
    opts = opts || {};
    var o = byId[id]; if (!o) return false;
    var tokens = norm(st.q).split(' ').filter(Boolean);
    if (!matches(o, tokens)) clearFilters();
    var r = rankOf(o); if (r >= st.limit) { st.limit = Math.ceil((r + 1) / STEP) * STEP; apply(false); }
    o.el.scrollIntoView({ block: 'center', behavior: 'auto' });
    o.el.classList.add('is-target'); setTimeout(function () { o.el.classList.remove('is-target'); }, 2600);
    if (opts.open) openCard(id, opts.from || o.el.querySelector('.sp-open'));
    else focusIt(o.el.querySelector('.sp-name'));
    return true;
  }
  function openAncestors(n) { for (var p = n; p && p !== D.body; p = p.parentNode) if (p.tagName === 'DETAILS') p.open = true; }
  function toHash(fromLoad) {
    var id = decodeURIComponent((location.hash || '').slice(1));
    if (!id) return;
    if (byId[id]) { if (dlg && dlg.open && curId === id) return; reveal(id, { open: true }); return; }
    if (GROUP_IDS[id]) { if (id === 'no-pill') setFilters({ kind: 'habit', cond: '', nt: '', ev: [] }); else clearFilters(); scrollTo(D.getElementById('browse')); return; }
    var t = D.getElementById(id);
    if (t) { openAncestors(t); if (/^nt-/.test(id) || id === 'all-sources') { scrollTo(t); focusIt(t.querySelector('summary') || t); } }
  }
  window.addEventListener('hashchange', function () { if (dlg && dlg.open && mode !== 'card') closeDlg(); toHash(false); });
  D.addEventListener('click', function (e) {
    var nf = e.target.closest && e.target.closest('a[data-nt-filter]');
    if (nf) { e.preventDefault(); setFilters({ nt: nf.getAttribute('data-nt-filter'), kind: '', cond: '' }); scrollTo(D.getElementById('browse')); return; }
    var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a || e.defaultPrevented || (dlg && dlg.contains(a))) return;
    var id = decodeURIComponent(a.getAttribute('href').slice(1));
    if (byId[id]) { e.preventDefault(); reveal(id, { open: true, from: a }); }
    else if (GROUP_IDS[id]) { e.preventDefault(); history.replaceState(null, '', '#' + id); toHash(false); }
  });

  /* ------------------------------------------------------------------ the toolbar: Save, Share, Print, On this page, and the site's "only the steps" switch */
  var tools = D.getElementById('sp-tools');
  var saveB = tools.querySelector('[data-t="save"]'), printB = tools.querySelector('[data-t="print"]'), tocB = tools.querySelector('[data-t="toc"]'), toc = D.getElementById('sp-toc');
  saveB.addEventListener('click', function () { var b = D.querySelector('.tol-save-btn'); if (b) { b.click(); } });
  printB.addEventListener('click', function () { window.print(); });
  function tocOpen(open) { toc.hidden = !open; tocB.setAttribute('aria-expanded', String(open)); }
  tocB.addEventListener('click', function (e) { e.stopPropagation(); tocOpen(toc.hidden); });
  toc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
    var t = D.getElementById(a.getAttribute('href').slice(1)); if (!t) return;
    e.preventDefault(); tocOpen(false); scrollTo(t); try { history.replaceState(null, '', '#' + t.id); } catch (er) {}
    var h = t.querySelector('h2') || t; focusIt(h);
  });
  D.addEventListener('click', function (e) { if (!toc.hidden && !e.target.closest('.sp-menu-wrap')) tocOpen(false); });
  D.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !toc.hidden) { tocOpen(false); focusIt(tocB); } });
  // pick up the site's own buttons when they arrive
  var shareSlot = tools.querySelector('.sp-share-slot'), extra = toc.querySelector('.sp-toc-extra');
  function adopt() {
    var main = D.getElementById('main');
    var top = main.querySelector(':scope > .tsk-top-row .tol-share-btn, :scope > .tsk-top-row [data-share]');
    if (top && !shareSlot.contains(top)) { shareSlot.appendChild(top); top.classList.add('sp-tbtn'); }
    var steps = main.querySelector(':scope > .tol-steps-toggle');
    if (steps && !extra.contains(steps)) extra.appendChild(steps);
    if (!D.querySelector('.tol-save-btn') && saveB && !saveB.hidden && adopt.n > 12) saveB.hidden = true;
    adopt.n = (adopt.n || 0) + 1;
  }
  adopt();
  if (window.MutationObserver) {
    var mo = new MutationObserver(function () { adopt(); }); mo.observe(D.getElementById('main'), { childList: true });
    setTimeout(function () { mo.disconnect(); if (!shareSlot.children.length) shareSlot.classList.add('is-empty'); }, 9000);
  }
  var tries = 0; (function poll() { adopt(); if (++tries < 16) setTimeout(poll, 500); })();

  /* ------------------------------------------------------------------ start up */
  // links written as ?condition=sleep&neurotype=adhd (also ?cond=, ?nt=, ?type=, ?evidence=, ?q=)
  (function readUrl() {
    var p = new URLSearchParams(location.search), any = false;
    function get() { for (var i = 0; i < arguments.length; i++) { var v = p.get(arguments[i]); if (v) return v.toLowerCase(); } return ''; }
    var c = get('condition', 'cond'), n = get('neurotype', 'nt'), t = get('type'), ev = get('evidence', 'ev'), qq = p.get('q') || '', so = get('sort');
    if (c && condSel.querySelector('option[value="' + c.replace(/[^a-z0-9-]/g, '') + '"]')) { st.cond = c; any = true; }
    if (n && ntSel.querySelector('option[value="' + n.replace(/[^a-z0-9-]/g, '') + '"]')) { st.nt = n; any = true; }
    if (t) { t = t === 'device' ? 'practice' : t; if (KINDS.indexOf(t) !== -1) { st.kind = t; any = true; } }
    if (ev) { st.ev = ev.split(',').filter(function (v) { return EVL[v]; }); if (st.ev.length) any = true; }
    if (qq) { st.q = qq.slice(0, 80); any = true; }
    if (so === 'az') st.sort = 'az';
    writeUi();
    st.__any = any;
  })();
  apply(false);
  syncButtons();
  if (st.__any && !location.hash) setTimeout(function () { D.getElementById('browse').scrollIntoView(); }, 0);
  delete st.__any;
  toHash(true);

  window.SUPP = {
    cards: cards, byId: byId, state: st, open: openCard, reveal: reveal, isSaved: isSaved, toggleSave: toggleSave, setFilters: setFilters, clearFilters: clearFilters,
    openList: openList, say: say, EVL: EVL, watchOf: watchOf, scrollToCatalog: function () { scrollTo(D.getElementById('browse')); }
  };
  D.dispatchEvent(new CustomEvent('supp-ready'));
})();
