/* bookmarks.js — "Save" and "Mark my place": keep pages, tools and book spots for later, on this device only.
   window.TOLSaved. site.js loads it on every page (see the mark19 fixnote); /saved.html loads it too.

   - A "Save" button (bookmark icon + word) sits in the site's bar, left of Menu, so it is reachable from every page
     and never covers the words. Tapping it saves the page (title, address without tracking bits, and what kind of
     page it is: book, tool, guide, workpaper or game); the icon fills in and a short note says where to find it.
     Tapping again takes it off, with Undo.
   - Book chapters and long reading pages: the same button opens two choices, "Mark my place here" (the paragraph
     you are reading now) and "Save this page". A place is kept as the nearest paragraph's first words, the nearest
     id above it, and how far down the page it was, so it still works if a page changes a little.
   - Book chapters remember where you stopped by themselves (one place per chapter, overwritten as you read). Opening
     the chapter again shows one small line: "Pick up where you stopped? Continue". Only on that chapter, never on
     the home page.
   - The first time someone opens a tool or a chapter, one small tip points at the button, once per device, and only
     if no other prompt has had this visit (window.TOLPrompt, sessionStorage 'tol-prompt').
   - Notes: "Write a note here" (in the book and long guides) or "Add a note" keeps your own words. Each note leaves a
     small dot by the paragraph where it was written (by the title if it has no paragraph); tap it to read or edit.
   - /saved.html lists everything (window.TOLSaved.renderList), grouped, newest first, with Open, Remove and every
     note with "Go to the spot".

   localStorage (nothing is sent anywhere; included in backups by progress.js; "Erase everything" clears it):
     tol-saved     [{ url, title, type, at, spot?, notes?: [{ id, text, at, spot? }], note? }], newest first, at most 200.
                   notes: up to 50 per page, each with the paragraph it was written at (a small dot marks it on the
                   page); note is a copy of the newest note's words for older versions. An old single note reads as one.
     tol-lastread  { '/book/chapter-2.html': { at, title, spot } }, at most 60 chapters
     tol-save-tip  the date the one-time tip was shown
   A spot is { t: first words of the paragraph, id: nearest id above, n: paragraphs after it, f: 0-1 down the page,
   h: the heading it sits under }. */
(function () {
  'use strict';
  if (window.TOLSaved) return;
  var D = document, H = D.documentElement;
  var inFrame = true; try { inFrame = window.self !== window.top; } catch (e) {}
  if (inFrame || /palcam-pop/.test(location.search)) { window.TOLSaved = { off: true }; return; }

  var KEY = 'tol-saved', LAST = 'tol-lastread', TIP = 'tol-save-tip', HOW = 'tol-save-how';
  var MAX_SAVED = 200, MAX_LAST = 60, SPOT_HASH = '#saved-spot';
  var NO_BUTTON = /^\/(404|offline|garden-backdrop|pal-cam-tv|saved)\.html$/;
  var GAME = /^\/(pause-and-play|frequency-journey(-play)?|word-bloom|quiet-words|quiet-crossword|daily-ledger-crossword|coin-pusher|bears-dojo|night-garden|calm-visualizer|frequency-buddies[a-z0-9-]*|echoes-of-gold|keepsakes|quest|relax)\.html$/;
  var WORKPAPER = /^\/(workpapers\/|wp-\d|suite-index)/;
  var CHAPTER = /^\/book\/(?!index\.html|download\.html|topic-)[a-z0-9-]+\.html$/;
  var DROP_PARAM = /^(utm_[a-z]+|fbclid|gclid|dclid|msclkid|mc_[a-z]+|igshid|ref|ref_src|source|s|si|work|palcam-pop|together|_ga)$/i;
  var ICON = '<svg class="tol-sv-ico" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4.2-6.5 4.2v-16a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  var GROUPS = [['book', 'Book'], ['tool', 'Tools'], ['guide', 'Guides'], ['workpaper', 'Workpapers'], ['game', 'Games']];

  // ---------------------------------------------------------------- small helpers
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function json(k, d) { try { var v = JSON.parse(lsGet(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // plain words only: nothing that could ever be read as markup (progress.js refuses those in backups)
  function plain(s, max) {
    return String(s == null ? '' : s).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim()
      .replace(/<(?=[a-z!\/?])/gi, '‹').replace(/(java|vb)script\s*:/gi, '$1script :').replace(/data\s*:\s*text\/html/gi, 'data : text/html').slice(0, max || 160);
  }
  // a note keeps its line breaks (one blank line at most) and can run to 1000 characters
  var NOTE_MAX = 1000;
  function notePlain(s) {
    return String(s == null ? '' : s).replace(/\r\n?/g, '\n').split('\n').map(function (l) { return plain(l, NOTE_MAX); })
      .join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, NOTE_MAX);
  }
  function el(tag, attrs, html) {
    var n = D.createElement(tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k) && attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (html != null) n.innerHTML = html;
    return n;
  }
  function norm(p) { p = String(p || '/'); if (/\/$/.test(p)) p += 'index.html'; return p; }
  var here = norm(location.pathname);
  var cameForSpot = location.hash === '#saved-spot';
  function still() { var c = H.classList; return c.contains('tol-still') || c.contains('tol-quiet') || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function locked() { return H.style.visibility === 'hidden' || !!D.querySelector('.tp-lock'); }
  function barBottom() {
    var bar = D.querySelector('.tol-bar');
    if (!bar) return 0;
    var r = bar.getBoundingClientRect();
    return r.bottom > 0 && getComputedStyle(bar).position !== 'static' ? r.bottom : 0;
  }
  function dayText(t) {
    try { return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: new Date(t).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }); } catch (e) { return ''; }
  }

  // ---------------------------------------------------------------- what this page is
  // the address to keep: the page and its meaningful ?choices, without tracking bits; a #part only when it names a part of the page
  function cleanUrl(withHash) {
    var q = [];
    location.search.replace(/^\?/, '').split('&').forEach(function (kv) {
      if (!kv) return;
      var k = decodeURIComponent(kv.split('=')[0] || '');
      if (!DROP_PARAM.test(k)) q.push(kv);
    });
    var u = here + (q.length ? '?' + q.join('&') : '');
    if (withHash && /^#[A-Za-z][\w-]{0,60}$/.test(location.hash) && location.hash !== SPOT_HASH && D.getElementById(location.hash.slice(1))) u += location.hash;
    return u;
  }
  function keyOf(u) { return String(u || '').split('#')[0]; }
  function typeOf(path) {
    path = norm(String(path || '').split(/[?#]/)[0]);
    if (/^\/book\//.test(path)) return 'book';
    if (WORKPAPER.test(path)) return 'workpaper';
    if (GAME.test(path) || (path === here && D.body && D.body.classList.contains('is-game'))) return 'game';
    var M = window.TOLSiteMap;
    try { if ((M && M.isTool && M.isTool(path)) || /^\/(tools|do|snapshot)\//.test(path)) return 'tool'; } catch (e) {}
    return 'guide';
  }
  function pageTitle() {
    var t = D.title || '';
    t = t.replace(/\s*[·|–—-]\s*Spread Love\s*(&|and)\s*Acceptance\s*$/i, '');
    if (!t || /^Spread Love/i.test(t)) { var h = D.querySelector('main h1, h1'); t = h ? h.textContent : t; }
    return plain(t, 140) || here;
  }
  // QA28 B7: a title is stored when a page is saved, so a tool that was renamed since keeps its old name there. For a tool's own page
  // the current name comes from the site's tool list (tools-registry.js, or tool-art.js on the home page), never from what was stored.
  function toolName(u) {
    var p = norm(String(u || '').split(/[?#]/)[0]), n = '', A = window.TOLToolArt;
    try {
      var f = window.TOLToolForPage && window.TOLToolForPage(p);
      if (f && f.tool && !f.mode && f.tool.name && f.tool.kind !== 'workpaper') n = f.tool.name;
      if (!n && A && A.meta && A.order) A.order.forEach(function (id) { var m = A.meta[id]; if (!n && m && m.n && String(m.h || '').split(/[?#]/)[0] === p) n = m.n; });
    } catch (e) {}
    return n;
  }
  function freshTitle(u, t) { return toolName(u) || t; }
  function haveNames() { return !!(window.TOLToolForPage || window.TOLToolArt); }
  function isChapter() { return CHAPTER.test(here) && !!D.querySelector('main'); }
  function isReading() {
    if (isChapter()) return true;
    var m = D.querySelector('main.read');
    return !!m && (D.documentElement.scrollHeight > window.innerHeight * 3.5);
  }

  // ---------------------------------------------------------------- the lists
  function list() { var a = json(KEY, []); return Array.isArray(a) ? a.filter(function (x) { return x && typeof x.url === 'string' && x.url.charAt(0) === '/'; }) : []; }
  function store(a) {
    a.sort(function (x, y) { return (y.at || 0) - (x.at || 0); });
    if (a.length > MAX_SAVED) a.length = MAX_SAVED;
    var ok = a.length ? lsSet(KEY, JSON.stringify(a)) : (lsDel(KEY), true);
    fire();
    return ok;
  }
  function find(u) { var k = keyOf(u), a = list(); for (var i = 0; i < a.length; i++) if (keyOf(a[i].url) === k) return a[i]; return null; }
  function isSaved(u) { return !!find(u || cleanUrl()); }
  function save(item) {
    var a = list().filter(function (x) { return keyOf(x.url) !== keyOf(item.url); });
    var old = find(item.url);
    var it = { url: plain(item.url, 300), title: plain(item.title, 140), type: item.type || typeOf(item.url), at: item.at || Date.now() };
    var spot = item.spot !== undefined ? item.spot : old && old.spot;
    if (spot) it.spot = cleanSpot(spot);
    var ns = item.notes !== undefined || item.note !== undefined ? notesOf(item) : old ? notesOf(old) : [];
    putNotes(it, ns);
    a.unshift(it);
    return store(a) ? it : null;
  }
  function remove(u) { var k = keyOf(u), was = find(u); store(list().filter(function (x) { return keyOf(x.url) !== k; })); return was; }

  // ---------------------------------------------------------------- notes: several per page, each at its own paragraph
  // A saved item keeps notes: [{ id, text, at, spot? }], newest last. Older saves had one note (and maybe a marked
  // place); they read as one note at that place. "note" stays as a copy of the newest note's words, so a backup
  // opened by an older version of the site still shows something.
  var MAX_NOTES = 50;
  function noteId() { return 'n' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36); }
  function cleanSpot(s) {
    if (!s || typeof s !== 'object') return null;
    var o = { t: plain(s.t, 80), f: Math.max(0, Math.min(1, +s.f || 0)) };
    if (s.id) { o.id = plain(s.id, 80); o.n = Math.max(0, Math.min(400, parseInt(s.n, 10) || 0)); }
    if (s.h) o.h = plain(s.h, 70);
    return o;
  }
  function notesOf(it) {
    if (!it) return [];
    if (Array.isArray(it.notes)) return it.notes.filter(function (n) { return n && typeof n.text === 'string' && n.text.trim(); }).map(function (n, i) {
      var o = { id: /^[a-z0-9]{2,24}$/i.test(n.id || '') ? n.id : 'n' + i + (n.at || 0).toString(36), text: notePlain(n.text), at: +n.at || +it.at || 0 };
      var s = cleanSpot(n.spot); if (s) o.spot = s;
      return o;
    });
    if (typeof it.note === 'string' && it.note.trim()) {
      var o = { id: 'n0' + (+it.at || 0).toString(36), text: notePlain(it.note), at: +it.at || 0 };
      var s = cleanSpot(it.spot); if (s) o.spot = s;
      return [o];
    }
    return [];
  }
  function putNotes(it, ns) {
    ns = (ns || []).filter(function (n) { return n && n.text; }).slice(-MAX_NOTES);
    if (ns.length) { it.notes = ns; it.note = ns[ns.length - 1].text; } else { delete it.notes; delete it.note; }
  }
  function changeNotes(u, fn) {
    var it = find(u); if (!it) return false;
    var ns = fn(notesOf(it)); putNotes(it, ns);
    return store(list().map(function (x) { return keyOf(x.url) === keyOf(u) ? it : x; }));
  }
  function addNote(u, text, spot) {
    var t = notePlain(text); if (!t) return null;
    var n = { id: noteId(), text: t, at: Date.now() }, s = cleanSpot(spot); if (s) n.spot = s;
    return changeNotes(u, function (ns) { ns.push(n); return ns; }) ? n : null;
  }
  function editNote(u, id, text) {
    var t = notePlain(text);
    return changeNotes(u, function (ns) { return ns.map(function (n) { if (n.id === id) n.text = t; return n; }).filter(function (n) { return n.text; }); });
  }
  function deleteNote(u, id) { return changeNotes(u, function (ns) { return ns.filter(function (n) { return n.id !== id; }); }); }
  // the old one-note call: replaces the newest note's words (or adds one)
  function setNote(u, note) {
    var it = find(u); if (!it) return false;
    var ns = notesOf(it);
    if (ns.length) return editNote(u, ns[ns.length - 1].id, note);
    return !!addNote(u, note, null) || !notePlain(note);
  }
  function lastAll() { var o = json(LAST, {}); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; }
  function lastRead(p) { return lastAll()[norm(p || here)] || null; }
  function setLast(p, rec) {
    var o = lastAll();
    if (rec) o[p] = rec; else delete o[p];
    var ks = Object.keys(o).sort(function (a, b) { return (o[b].at || 0) - (o[a].at || 0); });
    ks.slice(MAX_LAST).forEach(function (k) { delete o[k]; });
    if (Object.keys(o).length) lsSet(LAST, JSON.stringify(o)); else lsDel(LAST);
  }
  var hooks = [];
  function fire() { hooks.forEach(function (f) { try { f(); } catch (e) {} }); try { D.dispatchEvent(new CustomEvent('tol-saved')); } catch (e) {} }

  // ---------------------------------------------------------------- reading places
  var BLOCK = 'h2, h3, h4, p, li, blockquote, dt, dd, figcaption, pre';
  function blocks() {
    var main = D.querySelector('main'); if (!main) return [];
    var all = Array.prototype.slice.call(main.querySelectorAll(BLOCK));
    return all.filter(function (b) {
      if (b.closest('.tol-sv, nav, .tol-share-row, .tol-quiet-extras, [hidden], [aria-hidden="true"], .no-print-spot')) return false;
      if (b.querySelector(BLOCK)) return false;                 // the innermost block only (a <li> holding a <p> counts once)
      if (!b.getClientRects().length) return false;             // hidden, or inside a closed <details>
      return (b.textContent || '').replace(/\s+/g, '').length > 1;
    });
  }
  function words(b) { return plain(b.textContent, 400).replace(/\s*[#¶§]+$/, '').slice(0, 80); }
  function absTop(n) { return n.getBoundingClientRect().top + window.scrollY; }
  function spotNow() {
    var bs = blocks(); if (!bs.length) return null;
    var line = barBottom() + Math.min(60, window.innerHeight * 0.08), b = bs[0];
    for (var i = 0; i < bs.length; i++) { var r = bs[i].getBoundingClientRect(); if (r.bottom > line) { b = bs[i]; break; } b = bs[i]; }
    // a very short line (a number in a chart, a label) is a poor anchor: take the next real sentence still on screen
    var idx = bs.indexOf(b);
    if (words(b).length < 24) {
      for (var k = idx + 1; k < Math.min(bs.length, idx + 8); k++) {
        if (bs[k].getBoundingClientRect().top > window.innerHeight * 0.6) break;
        if (words(bs[k]).length >= 24) { b = bs[k]; idx = k; break; }
      }
    }
    var id = '', n = 0, h = '';
    for (var j = idx; j >= 0; j--) {
      var x = bs[j];
      if (!h && /^H[2-4]$/.test(x.tagName)) h = plain(x.textContent, 200).replace(/\s*[#¶§]+$/, '').slice(0, 70);
      if (!id) { var withId = x.id ? x : (x.closest('[id]') && D.querySelector('main').contains(x.closest('[id]')) ? x.closest('[id]') : null); if (withId && withId.tagName !== 'MAIN') { id = withId.id; n = idx - j; } }
      if (id && h) break;
    }
    var full = Math.max(1, D.documentElement.scrollHeight - window.innerHeight);
    var f = Math.max(0, Math.min(1, window.scrollY / full));
    var s = { t: words(b), f: Math.round(f * 1000) / 1000 };
    if (id) { s.id = plain(id, 80); s.n = n; }
    if (h) s.h = h;
    return s;
  }
  function spotEl(s) {
    if (!s) return null;
    var bs = blocks(), full = D.documentElement.scrollHeight, want = (s.f || 0) * Math.max(1, full - window.innerHeight);
    if (s.t) {
      var hits = bs.filter(function (b) { return words(b) === s.t; });
      if (!hits.length && s.t.length > 24) { var head = s.t.slice(0, 24); hits = bs.filter(function (b) { return words(b).indexOf(head) === 0; }); }
      if (hits.length) return hits.sort(function (a, b) { return Math.abs(absTop(a) - want) - Math.abs(absTop(b) - want); })[0];
    }
    if (s.id) {
      var t = D.getElementById(s.id);
      if (t) { var i = bs.indexOf(t); if (i < 0) i = bs.findIndex(function (b) { return t.contains(b) || (t.compareDocumentPosition(b) & 4); }); if (i >= 0) return bs[Math.min(bs.length - 1, i + (s.n || 0))]; }
    }
    return null;
  }
  // where the top of the page would sit for a place (resume.js scrolls there itself, smoothly)
  function spotTop(s) {
    var b = spotEl(s);
    if (b) return Math.max(0, absTop(b) - barBottom() - 18);
    return s && typeof s.f === 'number' ? Math.max(0, s.f * Math.max(0, D.documentElement.scrollHeight - window.innerHeight)) : null;
  }
  function goSpot(s, opts) {
    opts = opts || {};
    var b = spotEl(s), top;
    if (b) top = absTop(b) - barBottom() - 18;
    else if (s && typeof s.f === 'number') top = s.f * Math.max(0, D.documentElement.scrollHeight - window.innerHeight);
    else return false;
    window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
    if (b) {
      // a late picture or font can move things a little: settle once more
      setTimeout(function () { var r = b.getBoundingClientRect(), want = barBottom() + 18; if (Math.abs(r.top - want) > 40) window.scrollTo({ top: Math.max(0, absTop(b) - want), behavior: 'instant' }); }, 450);
      b.classList.add('tol-sv-here');
      if (!b.hasAttribute('tabindex')) { b.setAttribute('tabindex', '-1'); b.addEventListener('blur', function () { b.removeAttribute('tabindex'); }, { once: true }); }
      try { b.focus({ preventScroll: true }); } catch (e) {}
      setTimeout(function () { b.classList.remove('tol-sv-here'); }, 4000);
    }
    if (opts.keep !== false && isChapter()) recordLast(true);
    return true;
  }

  // ---------------------------------------------------------------- the toast: one short line under the bar
  var toastEl = null, toastT = 0;
  function toast(html, ms) {
    if (!toastEl) {
      toastEl = el('div', { class: 'tol-sv tol-sv-toast no-bubble no-cheer', role: 'status', 'aria-live': 'polite' });
      D.body.appendChild(toastEl);
    }
    clearTimeout(toastT);
    toastEl.innerHTML = '<span class="tol-sv-toast-t">' + html + '</span><button type="button" class="tol-sv-x" aria-label="Close this note">×</button>';
    toastEl.querySelector('.tol-sv-x').addEventListener('click', hideToast);
    toastEl.classList.add('is-in');
    toastT = setTimeout(hideToast, ms || 5000);
    return toastEl;
  }
  function hideToast() { clearTimeout(toastT); if (toastEl) toastEl.classList.remove('is-in'); }

  // ---------------------------------------------------------------- the Save button in the bar
  var btn = null, pop = null, word = null, noteSpot = null;
  function sync() {
    if (!btn) return;
    var on = isSaved();
    if (pop) { btn.setAttribute('aria-expanded', pop.hidden ? 'false' : 'true'); btn.removeAttribute('aria-pressed'); }
    else btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('is-saved', on);
    // the word stays "Save" (the icon fills in), so the bar never moves; screen readers hear the state
    if (word) word.textContent = pop ? (on ? ' this page (saved)' : ' this page') : ' this page';
    btn.setAttribute('title', on ? 'Saved. Tap to change' : 'Save this page for later');
    if (pop && !pop.hidden) fillPop();
  }
  function savePage(spot) {
    var it = save({ url: cleanUrl(true), title: pageTitle(), type: typeOf(here), spot: spot === undefined ? undefined : spot });
    if (!it) { toast('This browser isn’t keeping anything right now (private window or full storage), so it couldn’t be saved.', 7000); return null; }
    sync();
    return it;
  }
  function removePage() {
    var was = remove(cleanUrl());
    sync();
    if (!was) return;
    var t = toast('Removed from Saved. <button type="button" class="tol-sv-undo">Undo</button>', 8000);
    t.querySelector('.tol-sv-undo').addEventListener('click', function () { save(was); sync(); toast('Back in Saved.', 3000); if (btn) btn.focus({ preventScroll: true }); });
  }
  function toggle() {
    if (isSaved()) { removePage(); return; }
    if (savePage()) noteToast(toast('Saved. Find it under Saved for later, in the Menu. <a href="/saved.html">Open Saved</a> <button type="button" class="tol-sv-undo tol-sv-addnote">Add a note</button>', 8000));
  }
  // "Add a note" in a toast: at the paragraph you're on if you've scrolled into the page, otherwise by the title
  function noteToast(t, spot) {
    var b = t && t.querySelector('.tol-sv-addnote');
    if (b) b.addEventListener('click', function () { hideToast(); openNote({ spot: spot !== undefined ? spot : (window.scrollY > window.innerHeight * 0.5 ? spotNow() : null) }); });
  }
  function markPlace() {
    var s = spotNow();
    if (!s) { toggle(); return; }
    if (!savePage(s)) return;
    if (isChapter()) { setLast(here, { at: Date.now(), title: pageTitle(), spot: s }); markedY = window.scrollY; }
    noteToast(toast('Your place is marked' + (s.h ? ', at “' + esc(s.h) + '”' : '') + '. Find it under Saved for later, in the Menu. <a href="/saved.html">Open Saved</a> <button type="button" class="tol-sv-undo tol-sv-addnote">Add a note</button>', 8000), s);
  }

  // ---------------------------------------------------------------- notes: your own words on any saved page, tool, workpaper or book spot
  // openNote({ spot }) writes a new note at that paragraph (or by the title when there's none); openNote({ id }) edits one.
  var noteBox = null, noteBack = null;
  function openNote(o) {
    o = o || {};
    hideToast(); if (pop) closePop(false); closeDotPop(false);
    var it = find(cleanUrl()), editing = null;
    if (o.id && it) notesOf(it).forEach(function (n) { if (n.id === o.id) editing = n; });
    var spot = editing ? editing.spot : o.spot === undefined ? null : o.spot;
    noteBack = o.back || btn;
    if (!noteBox) {
      noteBox = el('div', { class: 'tol-sv tol-sv-pop tol-sv-notebox no-bubble no-cheer', role: 'dialog', 'aria-label': 'Your note', hidden: '' });
      D.body.appendChild(noteBox);
      D.addEventListener('keydown', function (e) { if (e.key === 'Escape' && noteBox && !noteBox.hidden) closeNote(); });
    }
    noteBox.innerHTML = '<label class="tol-sv-pop-h" for="tol-sv-notetext">' + (editing ? 'Your note' : 'A new note') +
      '<small>' + (spot && spot.h ? 'Near “' + esc(spot.h) + '.” ' : '') + (spot ? 'A small dot will mark this paragraph.' : 'A small dot will sit beside the page title.') + '</small></label>' +
      '<textarea id="tol-sv-notetext" rows="5" maxlength="' + NOTE_MAX + '" placeholder="What you want to remember, try, or ask about this. Kept only on this device."></textarea>' +
      '<p class="tol-sv-note-acts"><button type="button" class="tol-sv-cgo" data-nt="ok">Keep note</button>' +
      (editing ? '<button type="button" class="tol-sv-undo" data-nt="del">Delete</button>' : '') +
      '<button type="button" class="tol-sv-undo" data-nt="no">Cancel</button>' +
      '<a href="/saved.html">All my notes</a></p>';
    var ta = noteBox.querySelector('textarea'); ta.value = editing ? editing.text : '';
    noteBox.querySelector('[data-nt="ok"]').addEventListener('click', function () {
      var u = cleanUrl(), id = null;
      if (editing) { editNote(u, editing.id, ta.value); id = notePlain(ta.value) ? editing.id : null; }
      else if (notePlain(ta.value)) {
        if (!isSaved() && !savePage(undefined)) return;
        var n = addNote(u, ta.value, spot); id = n && n.id;
      }
      closeNote(id ? dotFor(id) : null);
      if (id) { toast('Note kept. Look for the small dot' + (spot ? ' beside the paragraph' : ' beside the title') + '. Every note is under Saved for later, in the Menu.', 6000); flashDot(id); }
      else if (editing) toast('Note deleted.', 4000);
    });
    var del = noteBox.querySelector('[data-nt="del"]');
    if (del) del.addEventListener('click', function () {
      var was = editing; deleteNote(cleanUrl(), was.id); closeNote(btn);
      var t = toast('Note deleted. <button type="button" class="tol-sv-undo">Undo</button>', 8000);
      t.querySelector('.tol-sv-undo').addEventListener('click', function () {
        changeNotes(cleanUrl(), function (ns) { ns.push(was); ns.sort(function (a, b) { return (a.at || 0) - (b.at || 0); }); return ns; });
        hideToast(); flashDot(was.id); var d = dotFor(was.id); if (d) d.focus({ preventScroll: true });
      });
    });
    noteBox.querySelector('[data-nt="no"]').addEventListener('click', function () { closeNote(); });
    placePop(noteBox); noteBox.hidden = false; ta.focus({ preventScroll: true });
  }
  // focus goes to the given place (the new dot), else back where the note was opened from, else the Save button
  function closeNote(to) {
    if (!noteBox || noteBox.hidden) return;
    noteBox.hidden = true;
    var b = to && D.contains(to) ? to : noteBack && D.contains(noteBack) ? noteBack : btn;
    if (b) try { b.focus({ preventScroll: true }); } catch (e) {}
  }

  // ---------------------------------------------------------------- note dots: a small dot by each paragraph where a note was taken
  // Wide screens: the dot sits in the margin to the left of the paragraph. Phones and indented boxes: a small marker
  // at the start of the paragraph, so it never covers words. A note without a place (or whose paragraph has gone)
  // shows its dot beside the page title. Tapping a dot opens a small box with the note, Edit and Close.
  var dotLayer = null, dotPop = null, dotPopFor = null, dotT = 0, dotTries = 0;
  var DOT_SVG = '<span class="tol-sv-ndot-i" aria-hidden="true"></span>';
  function clearDots() {
    if (dotLayer) dotLayer.innerHTML = '';
    Array.prototype.forEach.call(D.querySelectorAll('.tol-sv-ndot.is-inline'), function (n) { n.remove(); });
  }
  function renderDots() {
    clearTimeout(dotT);
    if (!D.body || NO_BUTTON.test(here)) return;
    if (locked()) { clearDots(); if (++dotTries < 600) dotT = setTimeout(renderDots, 1000); return; }
    var it = find(cleanUrl()), ns = notesOf(it);
    var openId = dotPopFor;
    clearDots();
    if (!ns.length) { closeDotPop(false); return; }
    var main = D.querySelector('main'); if (!main) return;
    var h1 = main.querySelector('h1');
    var bs = blocks(), colLeft = Infinity;
    bs.forEach(function (b) { var r = b.getBoundingClientRect(); if (r.width > 120 && r.left < colLeft) colLeft = r.left; });
    // group notes by the paragraph they belong to (the title when there's none)
    var groups = [];
    ns.forEach(function (n) {
      var b = n.spot ? spotEl(n.spot) : null, tgt = b || h1; if (!tgt) return;
      var g = null; for (var i = 0; i < groups.length; i++) if (groups[i].el === tgt) g = groups[i];
      if (!g) { g = { el: tgt, notes: [], title: !b }; groups.push(g); }
      g.notes.push(n);
    });
    if (!groups.length) return;
    if (!dotLayer) { dotLayer = el('div', { class: 'tol-sv-ndots no-bubble no-cheer' }); D.body.appendChild(dotLayer); }
    if (!dotLayer.parentNode) D.body.appendChild(dotLayer);
    var origin = dotLayer.getBoundingClientRect();
    groups.forEach(function (g) {
      var n = g.notes.length, label = (n > 1 ? n + ' notes' : 'Your note') + (g.title ? ' on this page' : ' here') + ': open';
      var d = el('button', { type: 'button', class: 'tol-sv-ndot' + (n > 1 ? ' is-many' : ''), 'aria-label': label, 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'data-notes': g.notes.map(function (x) { return x.id; }).join(' '), 'data-title': g.title ? '1' : null },
        DOT_SVG + (n > 1 ? '<span class="tol-sv-ndot-n" aria-hidden="true">' + n + '</span>' : ''));
      var r = g.el.getBoundingClientRect(), list = g.el.closest('ul, ol, dl, blockquote'), left = r.left;
      if (list && main.contains(list)) left = Math.min(left, list.getBoundingClientRect().left);
      var wide = !g.title && left >= 56 && Math.abs(left - colLeft) < 30 && r.height > 0;
      if (wide) {
        var lh = parseFloat(getComputedStyle(g.el).lineHeight) || 26;
        d.style.top = Math.round(r.top - origin.top + Math.max(0, lh / 2 - 22)) + 'px';
        d.style.left = Math.round(left - origin.left - 48) + 'px';
        dotLayer.appendChild(d);
      } else {
        d.classList.add('is-inline');
        if (g.title) g.el.appendChild(d); else g.el.insertBefore(d, g.el.firstChild);
      }
      d.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); if (dotPop && !dotPop.hidden && dotPopFor === d.getAttribute('data-notes')) closeDotPop(true); else openDotPop(d); });
    });
    if (openId) { var again = dotFor(openId.split(' ')[0]); if (again) openDotPop(again, true); else closeDotPop(false); }
  }
  function dotFor(id) {
    var ds = D.querySelectorAll('.tol-sv-ndot');
    for (var i = 0; i < ds.length; i++) if ((' ' + ds[i].getAttribute('data-notes') + ' ').indexOf(' ' + id + ' ') !== -1) return ds[i];
    return null;
  }
  function flashDot(id) {
    setTimeout(function () {
      var d = dotFor(id); if (!d) return;
      d.classList.add('is-new'); setTimeout(function () { d.classList.remove('is-new'); }, 2600);
    }, 60);
  }
  function soonDots() { clearTimeout(dotT); dotT = setTimeout(renderDots, 160); }
  function openDotPop(d, quiet) {
    var it = find(cleanUrl()), ids = (d.getAttribute('data-notes') || '').split(' ');
    var ns = notesOf(it).filter(function (n) { return ids.indexOf(n.id) !== -1; });
    if (!ns.length) return;
    if (!dotPop) {
      dotPop = el('div', { class: 'tol-sv tol-sv-npop no-bubble no-cheer', role: 'dialog', 'aria-labelledby': 'tol-sv-npop-h', hidden: '' });
      D.body.appendChild(dotPop);
      dotPop.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-np]'); if (!b) return;
        var a = b.getAttribute('data-np'), back = curDot();
        if (a === 'close') closeDotPop(true);
        else if (a === 'edit') openNote({ id: b.getAttribute('data-id'), back: back });
        else if (a === 'add') openNote({ spot: null, back: back });
      });
      D.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dotPop && !dotPop.hidden) closeDotPop(true); });
      D.addEventListener('pointerdown', function (e) { if (dotPop && !dotPop.hidden && !dotPop.contains(e.target) && !(e.target.closest && e.target.closest('.tol-sv-ndot'))) closeDotPop(false); }, true);
    }
    var near = ns[0].spot && ns[0].spot.h ? ns[0].spot.h : '';
    var onTitle = d.getAttribute('data-title') === '1';
    dotPop.innerHTML = '<p class="tol-sv-pop-h" id="tol-sv-npop-h">' + (ns.length > 1 ? 'Your ' + ns.length + ' notes here' : 'Your note') +
      (near && !onTitle ? '<small>Near “' + esc(near) + '”</small>' : onTitle ? '<small>On this page</small>' : '') + '</p>' +
      '<ul class="tol-sv-npop-list">' + ns.map(function (n) {
        return '<li><p class="tol-sv-npop-t"></p><p class="tol-sv-npop-m"><span>' + esc(dayText(n.at)) + '</span>' +
          '<button type="button" class="tol-sv-undo" data-np="edit" data-id="' + esc(n.id) + '"' + (ns.length > 1 ? ' aria-label="Edit the note from ' + esc(dayText(n.at)) + '"' : '') + '>Edit</button></p></li>';
      }).join('') + '</ul>' +
      '<p class="tol-sv-note-acts">' + (onTitle && !pop ? '<button type="button" class="tol-sv-undo" data-np="add">Add another note</button>' : '') +
      '<button type="button" class="tol-sv-cgo" data-np="close">Close</button><a href="/saved.html">All my notes</a></p>';
    var ts = dotPop.querySelectorAll('.tol-sv-npop-t');
    ns.forEach(function (n, i) { ts[i].textContent = n.text; });
    dotPopFor = d.getAttribute('data-notes');
    Array.prototype.forEach.call(D.querySelectorAll('.tol-sv-ndot[aria-expanded="true"]'), function (x) { x.setAttribute('aria-expanded', 'false'); });
    d.setAttribute('aria-expanded', 'true');
    dotPop.hidden = false;
    placeDotPop(d);
    if (!quiet) { var f = dotPop.querySelector('[data-np="close"]'); if (f) f.focus({ preventScroll: true }); }
  }
  function curDot() { return dotPopFor ? dotFor(dotPopFor.split(' ')[0]) : null; }
  function placeDotPop(d) {
    var r = d.getBoundingClientRect(), w = Math.min(320, window.innerWidth - 24);
    dotPop.style.width = w + 'px';
    var left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - 28));
    dotPop.style.left = Math.round(left + window.scrollX) + 'px';
    // below the dot, or above it when there isn't room below
    var hgt = dotPop.offsetHeight || 200, up = r.bottom + hgt + 12 > window.innerHeight && r.top - hgt - 12 > barBottom();
    dotPop.classList.toggle('is-up', up);
    dotPop.style.top = Math.round((up ? r.top - hgt - 4 : r.bottom + 4) + window.scrollY) + 'px';
    dotPop.style.setProperty('--tol-sv-arrow', Math.round(Math.max(16, Math.min(w - 16, r.left + r.width / 2 - left))) + 'px');
  }
  function closeDotPop(back) {
    if (!dotPop || dotPop.hidden) { dotPopFor = null; return; }
    var d = curDot();
    dotPop.hidden = true; dotPopFor = null;
    if (d) { d.setAttribute('aria-expanded', 'false'); if (back) try { d.focus({ preventScroll: true }); } catch (e) {} }
  }
  function dotsSetup() {
    if (NO_BUTTON.test(here)) return;
    hooks.push(renderDots);
    window.addEventListener('resize', function () { if (dotPop && !dotPop.hidden) closeDotPop(false); soonDots(); });
    window.addEventListener('load', soonDots);
    if (D.fonts && D.fonts.ready) D.fonts.ready.then(soonDots, function () {});
    D.addEventListener('toggle', soonDots, true);   // a <details> opening moves everything below it
    window.addEventListener('storage', function (e) { if (e.key === KEY || e.key === null) renderDots(); });
    try {
      var main = D.querySelector('main'), h0 = 0;
      if (main && window.ResizeObserver) new ResizeObserver(function () { var h = main.offsetHeight; if (Math.abs(h - h0) > 2) { h0 = h; soonDots(); } }).observe(main);
    } catch (e) {}
    renderDots();
    setTimeout(renderDots, 1200);   // late pictures, mini dives and helpers settle
  }
  function fillPop() {
    var on = isSaved(), it = find(cleanUrl());
    pop.innerHTML =
      '<p class="tol-sv-pop-h">Keep this for later</p>' +
      '<button type="button" class="tol-sv-go" data-sv="mark">' + ICON + '<span><strong>Mark my place here</strong><small>Keeps the paragraph you’re reading now</small></span></button>' +
      (on ? '<button type="button" class="tol-sv-go tol-sv-alt" data-sv="remove"><span><strong>Remove from Saved</strong>' + (notesOf(it).length ? '<small>Your notes go too (you can Undo)</small>' : it && it.spot ? '<small>Your marked place goes too</small>' : '') + '</span></button>'
          : '<button type="button" class="tol-sv-go tol-sv-alt" data-sv="page"><span><strong>Save this page</strong><small>Opens at the top</small></span></button>') +
      '<button type="button" class="tol-sv-go tol-sv-alt" data-sv="note"><span><strong>Write a note here</strong><small>Your own words, with a small dot by the paragraph you’re reading</small></span></button>' +
      '<p class="tol-sv-pop-foot"><a href="/saved.html">See everything you saved</a></p>';
  }
  function openPop() {
    if (!pop) return;
    fillPop(); placePop(pop); pop.hidden = false; sync();
    var f = pop.querySelector('button'); if (f) f.focus({ preventScroll: true });
  }
  function closePop(back) { if (!pop || pop.hidden) return; pop.hidden = true; sync(); if (back && btn) btn.focus({ preventScroll: true }); }
  function placePop(box) {
    if (!btn) return;
    var r = btn.getBoundingClientRect(), w = Math.min(320, window.innerWidth - 24);
    box.style.top = Math.round(Math.max(r.bottom, barBottom()) + 8) + 'px';
    box.style.width = w + 'px';
    box.style.left = Math.round(Math.max(12, Math.min(window.innerWidth - w - 12, r.right - w))) + 'px';
  }
  function makeButton() {
    var bar = D.querySelector('.tol-bar');
    if (!bar || NO_BUTTON.test(here)) return null;
    var b = bar.querySelector('.tol-save-btn');
    if (!b) {
      b = el('button', { type: 'button', class: 'tol-save-btn no-bubble' });
      var menu = bar.querySelector('.tol-contents-btn');
      bar.insertBefore(b, menu && menu.parentNode === bar ? menu : null);
    }
    b.innerHTML = ICON + '<span class="tol-save-t">Save</span><span class="tol-sv-sr"> this page</span>';
    word = b.querySelector('.tol-sv-sr');
    return b;
  }
  function setupButton() {
    btn = makeButton(); if (!btn) return;
    // reading pages: two choices; everything else: one tap saves
    if (isReading()) {
      pop = el('div', { class: 'tol-sv tol-sv-pop no-bubble no-cheer', id: 'tol-sv-pop', role: 'group', 'aria-label': 'Save for later', hidden: '' });
      D.body.appendChild(pop);
      btn.setAttribute('aria-controls', 'tol-sv-pop');
      btn.setAttribute('aria-haspopup', 'true');
      pop.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-sv]'); if (!b) return;
        var a = b.getAttribute('data-sv');
        closePop(true);
        if (a === 'mark') markPlace();
        else if (a === 'note') openNote({ spot: noteSpot });
        else if (a === 'page') { if (savePage(null)) noteToast(toast('Saved. Find it under Saved for later, in the Menu. <a href="/saved.html">Open Saved</a> <button type="button" class="tol-sv-undo tol-sv-addnote">Add a note</button>', 8000)); }
        else if (a === 'remove') removePage();
      });
      D.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pop && !pop.hidden) closePop(true); });
      D.addEventListener('pointerdown', function (e) { if (pop && !pop.hidden && !pop.contains(e.target) && !btn.contains(e.target)) closePop(false); }, true);
      D.addEventListener('focusin', function (e) { if (pop && !pop.hidden && !pop.contains(e.target) && e.target !== btn) closePop(false); });
      window.addEventListener('resize', function () { if (pop && !pop.hidden) placePop(pop); });
      var y0 = 0;
      window.addEventListener('scroll', function () { if (pop && !pop.hidden && Math.abs(window.scrollY - y0) > 120) closePop(false); }, { passive: true });
      btn.addEventListener('click', function () { hideTip(); y0 = window.scrollY; if (pop.hidden) { noteSpot = spotNow(); openPop(); } else closePop(false); });
    } else {
      btn.addEventListener('click', function () { hideTip(); toggle(); });
    }
    hooks.push(sync);
    window.addEventListener('storage', function (e) { if (e.key === KEY || e.key === null) sync(); });
    sync();
    // the bar fits itself to the room it has (site.js listens for resize)
    try { window.dispatchEvent(new Event('resize')); } catch (e) {}
  }

  // ---------------------------------------------------------------- "How to save this": one plain line under the title
  // On chapters, tools, workpapers and guides, until the person has saved something, closes the line, or has seen it on 8 pages.
  var howEl = null;
  function howLine() {
    if (!btn || locked() || list().length || H.classList.contains('tol-no-helpers')) return;
    var t = typeOf(here), seen = parseInt(lsGet(HOW) || '0', 10);
    if (lsGet(HOW) === 'off' || seen >= 8 || t === 'game' || here === '/index.html') return;
    // polish24a: one prompt at a time. On the first visit the "Would a calmer page help?" card is on this page, so this line waits for the next page
    try { if (!lsGet('tol-comfort-offer') || D.querySelector('.tol-offer') || ssGet('tol-offer-seen') === location.pathname) return; } catch (e) {}
    var h1 = D.querySelector('main h1'); if (!h1) return;
    var after = h1.closest('header, .read-head, .bk-cover') || h1;
    if (!after.parentNode || !(D.querySelector('main') || D.body).contains(after)) return;
    var what = isChapter() ? 'this exact spot in the book' : t === 'workpaper' ? 'this workpaper' : t === 'tool' ? 'this tool' : 'this page';
    var chip = '<button type="button" class="tol-sv-chip tol-sv-howgo">' + ICON + 'Save</button>';
    howEl = el('p', { class: 'tol-sv-how no-bubble no-cheer', role: 'note' },
      '<span class="tol-sv-how-t"><strong>Want to come back to ' + what + ' later?</strong> Tap ' + chip + ' at the top of the page' +
      (isChapter() ? ', then <strong>Mark my place here</strong>' : '') + '. You can add your own note to it, too. You’ll find it under <strong>Saved for later</strong> in the Menu, and on the home page.</span>' +
      '<button type="button" class="tol-sv-x" aria-label="Got it, hide this line">×</button>');
    after.parentNode.insertBefore(howEl, after.nextSibling);
    lsSet(HOW, String(seen + 1));
    howEl.querySelector('.tol-sv-howgo').addEventListener('click', function () {
      if (btn.getClientRects().length) btn.scrollIntoView({ block: 'nearest' });
      btn.click(); if (pop && !pop.hidden) { var f = pop.querySelector('[data-sv]'); if (f) f.focus(); }
    });
    howEl.querySelector('.tol-sv-x').addEventListener('click', function () { lsSet(HOW, 'off'); hideHow(); });
    hooks.push(function () { if (list().length) hideHow(); });
  }
  function hideHow() { if (howEl) { howEl.remove(); howEl = null; } }

  // ---------------------------------------------------------------- the one-time tip
  var tipEl = null;
  function hideTip() { if (tipEl) { tipEl.remove(); tipEl = null; } }
  function promptFree(n) { var P = window.TOLPrompt; if (P && P.free) return P.free(n); var p = ssGet('tol-prompt'); return !p || p === n; }
  function promptTake(n) { var P = window.TOLPrompt; if (P && P.take) P.take(n); else ssSet('tol-prompt', n); }
  function tipOk() {
    var c = H.classList, t = typeOf(here);
    if (!btn || howEl || lsGet(TIP) || !(t === 'tool' || isChapter())) return false;
    if (!lsGet('tol-comfort-offer')) return false;           // a first visit belongs to "Would a calmer page help?"
    if (c.contains('tol-quiet') || c.contains('tol-no-helpers') || c.contains('ti-nosurprise') || locked()) return false;
    if (/#together=|[?&]together=/.test(location.href) || cameForSpot) return false;
    return promptFree('save-tip') && !D.querySelector('.tol-install, .tol-invite:not([hidden]), .tol-offer, .tol-breathe:not([hidden]), .tp-ask, .tol-sv-cont');
  }
  function maybeTip() {
    var tries = 0;
    (function wait() {
      if (!tipOk()) return;
      var P = window.TOLPrompt;
      if (P && P.quietFor && !P.quietFor(1500) && ++tries < 20) { setTimeout(wait, 1500); return; }
      if (!btn.getClientRects().length) return;
      promptTake('save-tip'); lsSet(TIP, new Date().toISOString().slice(0, 10));
      tipEl = el('div', { class: 'tol-sv tol-sv-tip no-bubble no-cheer', role: 'note' },
        '<p><strong>Tip:</strong> tap <span class="tol-sv-chip">' + ICON + 'Save</span> to keep this for later' + (isChapter() ? ', or to mark your place' : '') + '.</p>' +
        '<button type="button" class="tol-sv-x" aria-label="Close tip">×</button>');
      D.body.appendChild(tipEl);
      var r = btn.getBoundingClientRect(), w = Math.min(300, window.innerWidth - 24);
      tipEl.style.width = w + 'px';
      tipEl.style.top = Math.round(Math.max(r.bottom, barBottom()) + 10) + 'px';
      var left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w + 34));
      tipEl.style.left = Math.round(left) + 'px';
      tipEl.style.setProperty('--tol-sv-arrow', Math.round(Math.max(16, Math.min(w - 16, r.left + r.width / 2 - left))) + 'px');
      tipEl.querySelector('.tol-sv-x').addEventListener('click', hideTip);
      setTimeout(hideTip, 10000);
      var y0 = window.scrollY;
      window.addEventListener('scroll', function off() { if (Math.abs(window.scrollY - y0) > window.innerHeight * 0.8) { hideTip(); window.removeEventListener('scroll', off); } }, { passive: true });
    })();
  }

  // ---------------------------------------------------------------- book chapters: remember where you stopped
  var hold = null, contEl = null, lastT = 0, markedY = null;
  function recordLast(force) {
    if (!isChapter() || locked()) return;
    // a place marked by hand stays as it is until the reader moves on from it
    if (!force && markedY != null) { if (Math.abs(window.scrollY - markedY) < window.innerHeight * 0.4) return; markedY = null; }
    var s = spotNow(); if (!s) return;
    if (hold != null && !force) { if (s.f + 0.02 < hold) return; hold = null; }
    if (s.f < 0.04) return;                                  // still at the top: nothing to come back to
    if (s.f > 0.97) { setLast(here, null); return; }         // read to the end: no "Continue" next time
    setLast(here, { at: Date.now(), title: pageTitle(), spot: s });
  }
  function showContinue(rec) {
    contEl = el('div', { class: 'tol-sv tol-sv-cont no-bubble no-cheer', role: 'region', 'aria-label': 'Pick up where you stopped' },
      '<p><span>Pick up where you stopped?</span> <button type="button" class="tol-sv-cgo">Continue <span aria-hidden="true">→</span></button>' +
      (rec.spot && rec.spot.h ? '<small class="tol-sv-near">near “' + esc(rec.spot.h) + '”</small>' : '') + '</p>' +
      '<button type="button" class="tol-sv-x" aria-label="No thanks, close this">×</button>');
    D.body.appendChild(contEl);
    var y0 = window.scrollY;
    function done() { if (contEl) { contEl.remove(); contEl = null; } window.removeEventListener('scroll', far); }
    function far() { if (Math.abs(window.scrollY - y0) > window.innerHeight * 1.2) done(); }
    contEl.querySelector('.tol-sv-cgo').addEventListener('click', function () { hold = null; done(); goSpot(rec.spot); });
    contEl.querySelector('.tol-sv-x').addEventListener('click', function () { hold = null; done(); });
    window.addEventListener('scroll', far, { passive: true });
  }
  function chapterSetup() {
    if (!isChapter()) return;
    var rec = lastRead(here);
    if (rec && rec.spot && !cameForSpot && !/^#[A-Za-z]/.test(location.hash)) {
      // a reload that already put you back there needs no line
      setTimeout(function () {
        var full = Math.max(1, D.documentElement.scrollHeight - window.innerHeight), f = window.scrollY / full;
        if (f + 0.03 >= (rec.spot.f || 0)) return;
        hold = rec.spot.f || 0;
        var tries = 0;
        (function show() { if (locked()) { if (++tries < 600) setTimeout(show, 500); return; } showContinue(rec); })();
      }, 350);
    }
    window.addEventListener('scroll', function () { clearTimeout(lastT); lastT = setTimeout(function () { recordLast(false); }, 700); }, { passive: true });
    window.addEventListener('pagehide', function () { recordLast(false); });
    D.addEventListener('visibilitychange', function () { if (D.visibilityState === 'hidden') recordLast(false); });
  }
  // arriving from Saved ("Open"): go to the marked place; "Go to the spot" on a note: go there and open the note
  var NOTE_HASH = /^#saved-note-([a-z0-9]{2,24})$/i;
  function arriveAtSpot() {
    var nm = NOTE_HASH.exec(location.hash);
    if (location.hash !== SPOT_HASH && !nm) return;
    var it = find(cleanUrl()), rec = lastRead(here), s = it && it.spot ? it.spot : rec && rec.spot, nid = nm && nm[1];
    if (nid) { s = null; notesOf(it).forEach(function (n) { if (n.id === nid) s = n.spot || null; }); }
    try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) {}
    if (!s && !nid) return;
    var go = function () {
      if (s) goSpot(s, { keep: !nid });
      if (nid) setTimeout(function () {
        renderDots(); var d = dotFor(nid); if (!d) return;
        if (!s) d.scrollIntoView({ block: 'center' });
        flashDot(nid); openDotPop(d);
      }, s ? 520 : 80);
    };
    if (D.readyState === 'complete') setTimeout(go, 60); else window.addEventListener('load', function () { setTimeout(go, 60); });
  }

  // ---------------------------------------------------------------- the menu: one "Saved" line, if site.js hasn't one
  function menuLink() {
    var tries = 0;
    (function place() {
      var panel = D.getElementById('tol-panel');
      if (!panel) { if (++tries < 40) setTimeout(place, 250); return; }
      if (panel.querySelector('a[href="/saved.html"]')) return;
      var ul = panel.querySelector('.tol-panel-quick ul');
      var li = el('li', null, '<a href="/saved.html"><span aria-hidden="true">🔖</span> Saved for later</a>');
      if (ul) ul.insertBefore(li, ul.children[1] || null);
    })();
  }

  // ---------------------------------------------------------------- /saved.html
  var undoBox = null;
  function renderList(host) {
    if (!host) return;
    if (locked()) { setTimeout(function () { renderList(host); }, 400); host.innerHTML = '<p class="sv-none">Locked.</p>'; return; }
    var a = list(), lr = lastAll(), savedKeys = {};
    a.forEach(function (x) { savedKeys[keyOf(x.url)] = 1; });
    var stops = Object.keys(lr).filter(function (p) { return lr[p] && lr[p].spot && !savedKeys[p]; })
      .sort(function (x, y) { return (lr[y].at || 0) - (lr[x].at || 0); }).slice(0, 12);
    var count = D.querySelectorAll('[data-sv-count]');
    Array.prototype.forEach.call(count, function (c) { c.textContent = a.length ? '(' + a.length + ')' : ''; });
    if (!a.length && !stops.length) {
      host.innerHTML = '<div class="sv-empty">' +
        '<p class="sv-empty-h">Nothing saved yet. Saving takes one tap:</p>' +
        '<ol class="sv-steps">' +
        '<li><span class="sv-n" aria-hidden="true">1</span> Open any page, tool, workpaper or chapter of the book.</li>' +
        '<li><span class="sv-n" aria-hidden="true">2</span> Tap <span class="tol-sv-chip">' + ICON + 'Save</span> at the top, next to Menu. In the book, choose <strong>Mark my place here</strong> to keep the exact paragraph, or <strong>Write a note here</strong>. Anywhere else, tap <strong>Add a note</strong> right after saving.</li>' +
        '<li><span class="sv-n" aria-hidden="true">3</span> Come back here any time: <strong>Menu</strong>, then <strong>Saved for later</strong>. Your newest three also show on the home page. Tap <strong>Open</strong> to go straight back.</li>' +
        '</ol></div>';
      return;
    }
    var html = '';
    GROUPS.forEach(function (g) {
      var items = a.filter(function (x) { return (GROUPS.some(function (gg) { return gg[0] === x.type; }) ? x.type : 'guide') === g[0]; });
      var extra = g[0] === 'book' ? stops : [];
      if (!items.length && !extra.length) return;
      html += '<section class="sv-group" aria-labelledby="sv-g-' + g[0] + '"><h2 id="sv-g-' + g[0] + '">' + g[1] + ' <span class="sv-c">' + (items.length + extra.length) + '</span></h2><ul class="sv-list">';
      items.forEach(function (x) {
        var base = keyOf(x.url), open = base + (x.spot ? SPOT_HASH : (x.url.indexOf('#') > 0 ? x.url.slice(x.url.indexOf('#')) : ''));
        var ns = notesOf(x).slice().reverse(), title = esc(freshTitle(x.url, x.title) || x.url);
        html += '<li class="sv-item" data-url="' + esc(x.url) + '">' +
          '<div class="sv-main"><a class="sv-title" href="' + esc(open) + '">' + title + '</a>' +
          '<p class="sv-meta">Saved ' + esc(dayText(x.at)) + (x.spot ? ' · <span class="sv-spot">' + ICON + 'Your place' + (x.spot.h ? ': near “' + esc(x.spot.h) + '”' : '') + '</span>' : '') +
          (ns.length ? ' · ' + ns.length + (ns.length > 1 ? ' notes' : ' note') : '') + '</p>' +
          (ns.length ? '<ul class="sv-notes" aria-label="Your notes on ' + title + '">' + ns.map(function (n) {
            return '<li class="sv-n1" data-id="' + esc(n.id) + '"><span class="sv-ndot" aria-hidden="true"></span><div class="sv-n1-body">' +
              '<p class="sv-note"><span class="tol-sv-sr">Your note: </span>' + esc(n.text) + '</p>' +
              '<p class="sv-meta">' + esc(dayText(n.at)) + ' · ' + (n.spot ? (n.spot.h ? 'near “' + esc(n.spot.h) + '”' : 'at a paragraph') : 'by the title') + '</p>' +
              '<div class="sv-note-edit" hidden><label>Edit this note <span class="sv-opt">(kept only on this device)</span><textarea rows="4" maxlength="' + NOTE_MAX + '">' + esc(n.text) + '</textarea></label>' +
              '<span class="sv-note-acts"><button type="button" class="sv-btn" data-act="nok">Keep note</button><button type="button" class="sv-btn sv-soft" data-act="nno">Cancel</button></span></div>' +
              '<span class="sv-note-btns"><a class="sv-btn sv-go" href="' + esc(base) + '#saved-note-' + esc(n.id) + '">Go to the spot</a>' +
              '<button type="button" class="sv-btn sv-soft" data-act="nedit" aria-label="Edit the note from ' + esc(dayText(n.at)) + ' on ' + title + '">Edit</button>' +
              '<button type="button" class="sv-btn sv-soft" data-act="ndel" aria-label="Delete the note from ' + esc(dayText(n.at)) + ' on ' + title + '">Delete</button></span></div></li>';
          }).join('') + '</ul>' : '') +
          '<div class="sv-note-edit sv-note-new" hidden><label>A new note <span class="sv-opt">(it shows beside the page title; kept only on this device)</span><textarea rows="4" maxlength="' + NOTE_MAX + '"></textarea></label>' +
          '<span class="sv-note-acts"><button type="button" class="sv-btn" data-act="nok">Keep note</button><button type="button" class="sv-btn sv-soft" data-act="nno">Cancel</button></span></div></div>' +
          '<div class="sv-acts"><a class="sv-btn sv-strong" href="' + esc(open) + '" aria-label="Open ' + title + (x.spot ? ' at your place' : '') + '">Open</a>' +
          '<button type="button" class="sv-btn" data-act="note" aria-label="Add a note to ' + title + '">Add a note</button>' +
          '<button type="button" class="sv-btn sv-soft" data-act="remove" aria-label="Remove ' + title + ' from Saved' + (ns.length ? ', with its notes' : '') + '">Remove</button></div></li>';
      });
      extra.forEach(function (p) {
        var r = lr[p];
        html += '<li class="sv-item is-auto" data-last="' + esc(p) + '">' +
          '<div class="sv-main"><a class="sv-title" href="' + esc(p) + SPOT_HASH + '">' + esc(r.title || p) + '</a>' +
          '<p class="sv-meta">Where you stopped reading, ' + esc(dayText(r.at)) + (r.spot.h ? ' · near “' + esc(r.spot.h) + '”' : '') + '</p></div>' +
          '<div class="sv-acts"><a class="sv-btn sv-strong" href="' + esc(p) + SPOT_HASH + '" aria-label="Continue ' + esc(r.title || p) + '">Continue</a>' +
          '<button type="button" class="sv-btn sv-soft" data-act="forget" aria-label="Forget where you stopped in ' + esc(r.title || p) + '">Forget</button></div></li>';
      });
      html += '</ul></section>';
    });
    host.innerHTML = html;
  }
  function savedPage() {
    var host = D.getElementById('sv-list'); if (!host) return;
    var msg = D.getElementById('sv-msg');
    function say(h) { if (msg) msg.innerHTML = h; }
    renderList(host);
    if (!haveNames()) { var rg = D.createElement('script'); rg.src = '/assets/js/tools-registry.js'; rg.onload = function () { renderList(host); }; D.head.appendChild(rg); }
    hooks.push(function () { renderList(host); });
    window.addEventListener('storage', function (e) { if (e.key === KEY || e.key === LAST || e.key === null) renderList(host); });
    host.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-act]'); if (!b) return;
      var li = b.closest('.sv-item'), url = li && li.getAttribute('data-url'), act = b.getAttribute('data-act');
      if (act === 'remove') {
        var was = remove(url);
        say('Removed: ' + esc(was ? was.title : '') + '. <button type="button" class="sv-btn" data-sv-undo>Undo</button>');
        undoBox = was;
        var u = msg && msg.querySelector('[data-sv-undo]'); if (u) u.focus();
      } else if (act === 'forget') {
        var p = li.getAttribute('data-last'), r = lastRead(p);
        setLast(p, null); renderList(host);
        say('Forgotten: where you stopped in ' + esc(r && r.title || p) + '.');
        var h1 = D.querySelector('main h1'); if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus(); }
      } else if (act === 'note' || act === 'nedit') {
        var box = act === 'note' ? li.querySelector('.sv-note-new') : b.closest('.sv-n1').querySelector('.sv-note-edit');
        box.hidden = false; b.hidden = true;
        var inp = box.querySelector('textarea'); inp.focus();
        inp.onkeydown = function (k) { if (k.key === 'Enter' && (k.ctrlKey || k.metaKey)) { k.preventDefault(); box.querySelector('[data-act="nok"]').click(); } if (k.key === 'Escape') { box.querySelector('[data-act="nno"]').click(); } };
      } else if (act === 'nok') {
        var n1 = b.closest('.sv-n1'), val = b.closest('.sv-note-edit').querySelector('textarea').value, nid = n1 && n1.getAttribute('data-id');
        if (nid) { editNote(url, nid, val); say(notePlain(val) ? 'Note kept.' : 'Note deleted.'); }
        else if (notePlain(val)) { var made = addNote(url, val, null); nid = made && made.id; say(made ? 'Note kept. It shows beside the page title.' : 'This browser isn’t keeping anything right now.'); }
        var to = nid && host.querySelector('.sv-n1[data-id="' + nid + '"] [data-act="nedit"]') || itemBtn(url, 'note'); if (to) to.focus();
      } else if (act === 'nno') {
        var n2 = b.closest('.sv-n1'), id2 = n2 && n2.getAttribute('data-id');
        renderList(host);
        var back = id2 && host.querySelector('.sv-n1[data-id="' + id2 + '"] [data-act="nedit"]') || itemBtn(url, 'note'); if (back) back.focus();
      } else if (act === 'ndel') {
        var n3 = b.closest('.sv-n1'), id3 = n3.getAttribute('data-id'), it3 = find(url), gone = null;
        notesOf(it3).forEach(function (n) { if (n.id === id3) gone = n; });
        deleteNote(url, id3);
        noteUndo = gone ? { url: url, note: gone } : null;
        say('Note deleted. <button type="button" class="sv-btn" data-sv-nundo>Undo</button>');
        var u2 = msg && msg.querySelector('[data-sv-nundo]'); if (u2) u2.focus();
      }
    });
    function itemBtn(url, act) { return host.querySelector('.sv-item[data-url="' + (window.CSS && CSS.escape ? CSS.escape(url) : url) + '"] [data-act="' + act + '"]'); }
    var noteUndo = null;
    if (msg) msg.addEventListener('click', function (e) {
      if (!(e.target.closest && e.target.closest('[data-sv-nundo]')) || !noteUndo) return;
      var nu = noteUndo; noteUndo = null;
      changeNotes(nu.url, function (ns) { ns.push(nu.note); ns.sort(function (a, b) { return (a.at || 0) - (b.at || 0); }); return ns; });
      say('Your note is back.');
      var bk = host.querySelector('.sv-n1[data-id="' + nu.note.id + '"] [data-act="nedit"]'); if (bk) bk.focus();
    });
    if (msg) msg.addEventListener('click', function (e) {
      if (!(e.target.closest && e.target.closest('[data-sv-undo]')) || !undoBox) return;
      save(undoBox); say('Back in your list: ' + esc(undoBox.title) + '.'); undoBox = null;
    });
  }

  // ---------------------------------------------------------------- start
  function css(done) {
    if (D.querySelector('link[href="/assets/css/bookmarks.css"]')) { done(); return; }
    var l = el('link', { rel: 'stylesheet', href: '/assets/css/bookmarks.css' });
    var called = false, once = function () { if (!called) { called = true; done(); } };
    l.onload = once; l.onerror = once; setTimeout(once, 2500);
    D.head.appendChild(l);
  }
  window.TOLSaved = { list: list, find: find, isSaved: isSaved, save: save, remove: remove, setNote: setNote, notesOf: notesOf, addNote: addNote, editNote: editNote, deleteNote: deleteNote, renderDots: renderDots, lastRead: lastRead, lastAll: lastAll,
    spotNow: spotNow, goSpot: goSpot, spotTop: spotTop, typeOf: typeOf, cleanUrl: cleanUrl, renderList: renderList, openNote: openNote, KEYS: { saved: KEY, last: LAST, tip: TIP, how: HOW } };
  // the home page's "Pick up where you left off" list (home.js draws it from the saved titles): current names for renamed tools
  function homeNames() {
    if (!/^\/(index\.html)?$/.test(location.pathname)) return;
    var n = 0;
    (function go() {
      var items = D.querySelectorAll('.h-resume-item');
      if (!items.length) { if (++n < 12) setTimeout(go, 400); return; }
      Array.prototype.forEach.call(items, function (a) {
        var nm = toolName((a.getAttribute('href') || '').split('#')[0]), t = a.querySelector('.h-resume-t');
        if (nm && t) t.textContent = nm;
      });
    })();
  }
  function start() {
    css(function () {
      var tries = 0;
      (function place() {
        if (!D.querySelector('.tol-bar') && !NO_BUTTON.test(here) && ++tries < 40) { setTimeout(place, 250); return; }   // site.js builds the bar
        setupButton();
        menuLink();
        savedPage();
        homeNames();
        arriveAtSpot();
        chapterSetup();
        try { howLine(); } catch (e) {}
        try { dotsSetup(); } catch (e) {}
        setTimeout(maybeTip, 2500);
        // "Continue where you left off" (resume.js) is loaded here so it runs on every page the Save button does
        if (!window.TOLResume && !D.querySelector('script[src^="/assets/js/resume.js"]')) { var rs = D.createElement('script'); rs.src = '/assets/js/resume.js'; rs.async = true; D.head.appendChild(rs); }
      })();
    });
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
})();
