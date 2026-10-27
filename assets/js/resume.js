/* resume.js: "Continue where you left off" (resume26). Remembers the last three places a visitor was in, on this device
   only, so the Welcome back panel (home page) and /this-week.html can offer to pick up again.

   What a place is: { u: address, k: kind, t: plain title, at: when (ms), done, f, s, ep, pos, tot }.
     k: 'chapter' (book chapter), 'guide', 'tool', 'workpaper', 'game', 'episode' (Frequency Buddies), 'week' (My week), 'feel' (Paint Your Feelings)
     f/s: how far down a chapter or guide they got (0 to 1) and where: { id: the section above the top of the screen, off: pixels below it, f }
     done: a chapter or guide read to the end, or an episode that ended
     ep/pos/tot: the episode id, and the playback position and length in seconds
   Written in localStorage 'tol-resume-v1' as { v: 1, p: [place, place, place] }, newest first. It keeps no search words, no text
   typed into a tool or a note, and no answers: only the page, its title, and how far along. Nothing is sent anywhere.

   When it writes: after a few seconds in a page or the first scroll or tap (so a bounce is not a place), and when the page is
   left. Never with "Stop remembering pages I visit" on (that setting also clears this list), never in Quiet mode, never when the
   browser will not keep anything. It skips only the pages that are not places to resume (the list is SKIP below).

   Picking up: a chapter or guide opens at "#resume" (the Continue button adds it), then scrolls back quietly, with a small
   "Back where you were" note and a Start from the top button. Without #resume nothing moves, so the browser's own scroll
   restoring, links with a #part and the Save button's "Mark my place" (bookmarks.js, which keeps its own "Pick up where you
   stopped?" line) are left alone. If a place was marked by hand more recently, that spot is used. An episode shows a
   "Resume at 4:12" button above the player (buddies-player.js: TOLBuddiesPlayer.resumeAt). Paint Your Feelings keeps its own
   saved questions (emo-ui.js, only when the visitor taps "Save my place"); this list only points to the page.

   window.TOLResume: { enabled, places, visible, model, remove, forget, href, detail, ago, kindName, onChange }. */
(function (G) {
  'use strict';
  if (typeof document === 'undefined' || G.TOLResume) return;
  var doc = document, root = doc.documentElement;
  try { if (G.top !== G.self) return; } catch (e) { return; }
  if (/palcam-pop/.test(location.search)) return;

  var KEY = 'tol-resume-v1', EMO_DRAFT = 'tol-emo-draft-v1', WEEK = 'tol-week-v1', MAXP = 3, DAY = 864e5, MAXAGE = 30 * DAY;
  // The pages that are not places to resume (the home page, the error and offline pages, Saved, the pages this list is shown on
  // or managed from, and two pages that only exist as backdrops). Every other page is remembered the same way.
  var SKIP = /^\/(index|404|offline|saved|on-this-device|this-week|garden-backdrop|pal-cam-tv)\.html$/;
  var KINDS = { chapter: 'Book chapter', guide: 'Guide', tool: 'Tool', workpaper: 'Workpaper', game: 'Game', episode: 'Cartoon', week: 'Your week', feel: 'Tool' };
  var READING = { chapter: 1, guide: 1 };
  var CHAPTER = /^\/book\/(?!index\.html|download\.html|topic-)[a-z0-9-]+\.html$/;
  var GAME = /^\/(pause-and-play|frequency-journey(-play)?|word-bloom|quiet-words|quiet-crossword|daily-ledger-crossword|coin-pusher|bears-dojo|night-garden|calm-visualizer|frequency-buddies[a-z0-9-]*|echoes-of-gold|keepsakes|quest|relax)\.html$/;
  var WORKPAPER = /^\/(workpapers\/|wp-\d|suite-index)/;

  /* ---------------------------------------------------------------- storage (every call safe when the browser blocks it) */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return localStorage.getItem(k) === v; } catch (e) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function lj(k) { try { return JSON.parse(lsGet(k) || 'null'); } catch (e) { return null; } }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function plain(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().replace(/<(?=[a-z!\/?])/gi, '').slice(0, max || 90); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function stopped() { return !!lsGet('tol-recent-off'); }
  function quiet() { return root.classList.contains('tol-quiet') || lsGet('tol-quiet') === '1' || !!(G.TOLQuiet && G.TOLQuiet.on && G.TOLQuiet.on()); }
  function still() { return root.classList.contains('tol-still') || root.classList.contains('tol-quiet') || !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function enabled() { return !stopped() && !quiet(); }
  function locked() { return root.style.visibility === 'hidden' || !!doc.querySelector('.tp-lock'); }

  /* ---------------------------------------------------------------- the list */
  function clean(p) {
    if (!p || typeof p !== 'object' || typeof p.u !== 'string' || p.u.charAt(0) !== '/' || p.u.charAt(1) === '/' || !KINDS[p.k]) return null;
    var o = { u: p.u.slice(0, 200), k: p.k, t: plain(p.t, 90), at: +p.at || 0 };
    if (!o.at) return null;
    if (p.done) o.done = true;
    if (typeof p.f === 'number') o.f = Math.round(clamp(p.f, 0, 1) * 1000) / 1000;
    if (p.s && typeof p.s === 'object') {
      var s = { f: Math.round(clamp(+p.s.f || 0, 0, 1) * 1000) / 1000 };
      if (typeof p.s.id === 'string' && /^[\w:.-]{1,80}$/.test(p.s.id)) { s.id = p.s.id; s.off = clamp(Math.round(+p.s.off || 0), 0, 200000); }
      o.s = s;
    }
    if (typeof p.ep === 'string' && /^s\d{1,2}e\d{1,2}$/.test(p.ep)) { o.ep = p.ep; o.pos = clamp(Math.round(+p.pos || 0), 0, 36000); o.tot = clamp(Math.round(+p.tot || 0), 0, 36000); }
    return o;
  }
  function places() {   // everything stored and not too old, newest first (no settings check: see visible)
    var o = lj(KEY), a = o && Array.isArray(o.p) ? o.p : [], now = Date.now(), out = [];
    a.forEach(function (p) { var c = clean(p); if (c && now - c.at < MAXAGE && c.at < now + DAY) out.push(c); });
    out.sort(function (x, y) { return y.at - x.at; });
    return out.slice(0, MAXP);
  }
  var hooks = [];
  function changed() { hooks.forEach(function (f) { try { f(); } catch (e) {} }); }
  function write(list) {
    if (!list.length) { lsDel(KEY); changed(); return true; }
    var ok = lsSet(KEY, JSON.stringify({ v: 1, p: list.slice(0, MAXP) }));
    changed(); return ok;
  }
  // a place already shown here after the visitor pressed Remove or Forget does not come back until they visit it again
  function remove(u) { write(places().filter(function (p) { return p.u !== u; })); }
  function forget() { lsDel(KEY); changed(); }
  function put(patch) {
    if (!enabled() || !patch || !patch.u) return false;
    var list = places(), old = null;
    list = list.filter(function (p) { if (p.u === patch.u) { old = p; return false; } return true; });
    var next = {};
    if (old) for (var k in old) next[k] = old[k];
    for (var j in patch) if (patch[j] !== undefined) next[j] = patch[j];
    next.at = Date.now();
    var c = clean(next); if (!c) return false;
    list.unshift(c);
    return write(list);
  }

  /* ---------------------------------------------------------------- wording: day-level only, never an exact time */
  function dayNum(t) { var d = new Date(t); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY); }
  function ago(at, now) {
    var n = dayNum(now || Date.now()) - dayNum(at);
    if (n <= 0) return 'today';
    if (n === 1) return 'yesterday';
    if (n < 7) return n + ' days ago';
    if (n < 14) return 'last week';
    if (n < 28) return Math.floor(n / 7) + ' weeks ago';
    return 'a while ago';
  }
  function mmss(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function weekDraft() {
    var s = lj(WEEK); if (!s || typeof s !== 'object' || !s.drafts || typeof s.drafts !== 'object') return false;
    return Object.keys(s.drafts).some(function (k) { return !(s.weeks && s.weeks[k]); });
  }
  function emoDraft() { var d = lj(EMO_DRAFT); return !!(d && typeof d === 'object' && d.ans); }
  function spotted(p) { return !!(READING[p.k] && p.s && (p.f || 0) >= 0.04 && !p.done); }
  function isDone(p) { return p.k === 'week' ? !weekDraft() : !!p.done; }
  function kindName(p) { return KINDS[p.k] || 'Page'; }
  // QA28 B7: the title is stored when a place is saved, so a tool renamed since would keep its old name here for up to 30 days.
  // A tool's own page is shown by its current name from the site's tool list (tool-art.js on the home page, or tools-registry.js).
  function name(p) {
    if (!p || (p.k !== 'tool' && p.k !== 'feel')) return p && p.t || '';
    var u = String(p.u || '').split(/[?#]/)[0], n = '';
    try {
      var f = G.TOLToolForPage && G.TOLToolForPage(u);
      if (f && f.tool && !f.mode && f.tool.name && f.tool.kind !== 'workpaper') n = f.tool.name;
      var A = G.TOLToolArt;
      if (!n && A && A.meta && A.order) A.order.forEach(function (id) { var m = A.meta[id]; if (!n && m && m.n && String(m.h || '').split(/[?#]/)[0] === u) n = m.n; });
    } catch (e) {}
    return plain(n || p.t, 90);
  }
  function href(p) {
    if (spotted(p)) return p.u + '#resume';
    if (p.k === 'episode' && p.ep) return p.u + '?ep=' + p.ep;
    return p.u;
  }
  function detail(p) {
    var bits = [kindName(p), ago(p.at)];
    if (p.done) bits.push(p.k === 'episode' ? 'watched to the end' : 'read to the end');
    else if (spotted(p)) bits.push('about ' + Math.max(5, Math.round(p.f * 20) * 5) + ' percent in');
    else if (p.k === 'episode' && p.pos >= 15) bits.push('at ' + mmss(p.pos));
    else if (p.k === 'week' && weekDraft()) bits.push('your draft is waiting');
    else if (p.k === 'feel' && emoDraft()) bits.push('your saved questions are waiting');
    return bits.join(', ');
  }
  // what is shown: nothing at all while the setting is on (the list is also cleared then), done places last
  function visible() { return stopped() ? [] : places(); }
  function model() {
    var all = visible(), open = all.filter(function (p) { return !isDone(p); });
    return { all: all, open: open, primary: all.length && !isDone(all[0]) ? all[0] : null, also: open.filter(function (p) { return p !== all[0] || isDone(all[0]); }) };
  }

  /* ---------------------------------------------------------------- the page I am on */
  var here = location.pathname.replace(/\/$/, '/index.html') || '/index.html';
  if (here === '/') here = '/index.html';
  function onTheSite() { return !SKIP.test(here) && !!doc.body && !doc.querySelector('meta[http-equiv="Content-Security-Policy"]'); }
  function kindHere() {
    if (CHAPTER.test(here) && doc.querySelector('main')) return 'chapter';
    if (here === '/frequency-buddies.html') return 'episode';
    if (here === '/what-am-i-feeling.html') return 'feel';
    if (here === '/my-week.html') return 'week';
    if (WORKPAPER.test(here)) return 'workpaper';
    if (GAME.test(here) || (doc.body && doc.body.classList.contains('is-game'))) return 'game';
    var S = G.TOLSaved, t = ''; try { t = S && S.typeOf ? S.typeOf(here) : ''; } catch (e) {}
    if (t === 'tool' || t === 'game' || t === 'workpaper') return t;
    try { var M = G.TOLSiteMap; if ((M && M.isTool && M.isTool(here)) || /^\/(tools|do|snapshot)\//.test(here)) return 'tool'; } catch (e) {}
    return 'guide';
  }
  function titleHere() {
    var t = doc.title || '';
    t = t.replace(/\s*[·|–—-]\s*Spread Love\s*(&|and)\s*Acceptance\s*$/i, '');
    if (!t || /^Spread Love/i.test(t)) { var h = doc.querySelector('main h1, h1'); t = h ? h.textContent : t; }
    return plain(t, 90);
  }
  // a plain, short name: "Chat Analyzer: Check a Text..." is kept as "Chat Analyzer"; a book chapter keeps its whole title
  function nameHere(k) {
    var t = titleHere(), m;
    if (k === 'chapter') return t;
    if ((m = /^(.{3,40}?\?)\s/.exec(t))) return plain(m[1], 60);
    var i = t.indexOf(': ');
    return i >= 3 && i <= 40 ? plain(t.slice(0, i), 60) : t;
  }
  function absTop(n) { return n.getBoundingClientRect().top + G.scrollY; }
  function barBottom() {
    var bar = doc.querySelector('.tol-bar'); if (!bar) return 0;
    var r = bar.getBoundingClientRect();
    return r.bottom > 0 && getComputedStyle(bar).position !== 'static' ? r.bottom : 0;
  }
  function scrollFull() { return Math.max(1, root.scrollHeight - G.innerHeight); }
  // where the top of the screen is: the section above it (the nearest id on a heading or section) and how far below it
  function spotNow() {
    var y = G.scrollY, s = { f: Math.round(clamp(y / scrollFull(), 0, 1) * 1000) / 1000 }, best = null;
    var main = doc.querySelector('main') || doc.body;
    Array.prototype.forEach.call(main.querySelectorAll('h1[id], h2[id], h3[id], h4[id], section[id], article[id]'), function (a) { if (a.getClientRects().length && absTop(a) <= y + 4) best = a; });
    if (best && y - absTop(best) < 6000) { s.id = best.id; s.off = Math.max(0, Math.round(y - absTop(best))); }
    return s;
  }
  function spotTop(s) {
    if (s.id) { var a = doc.getElementById(s.id); if (a) return Math.max(0, absTop(a) + (s.off || 0)); }
    return Math.max(0, (s.f || 0) * scrollFull());
  }

  /* ---------------------------------------------------------------- writing the place */
  var kind = '', armed = false, maxF = 0;
  function touch() {
    if (!kind || !armed || locked() || !enabled()) return;
    var f = clamp(G.scrollY / scrollFull(), 0, 1), patch = { u: here, k: kind }, t = nameHere(kind);
    maxF = Math.max(maxF, f);
    if (t) patch.t = t;
    if (kind === 'episode') { var cur = places().filter(function (p) { return p.u === here; })[0]; if (cur && cur.ep) delete patch.t; }
    if (READING[kind]) {
      // read to the end (a short page counts once it has been looked at), or somewhere along the way; still at the top keeps what was there
      if (root.scrollHeight <= G.innerHeight * 1.4 || maxF >= 0.95) { patch.f = 1; patch.done = true; patch.s = null; }
      else if (f >= 0.04) { patch.f = f; patch.done = false; patch.s = spotNow(); }
    }
    put(patch);
  }
  var idle = 0;
  function later() { clearTimeout(idle); idle = setTimeout(touch, 700); }
  function arm() { if (armed) return; armed = true; touch(); }
  function startRecording() {
    if (!onTheSite()) return;
    kind = kindHere();
    if (location.hash === '#resume') comeBack();      // picking up works in Quiet mode too; only writing is switched off
    if (kind === 'episode') episodeWatch();            // the Resume button works in Quiet mode too; writing does not
    if (!enabled()) return;
    var t0 = setTimeout(arm, 8000);
    function first() { clearTimeout(t0); arm(); }
    G.addEventListener('scroll', function () { if (G.scrollY > 40) { arm(); later(); } }, { passive: true });
    doc.addEventListener('pointerdown', first, { once: true, passive: true });
    doc.addEventListener('keydown', first, { once: true });
    G.addEventListener('pagehide', function () { touch(); });
    doc.addEventListener('visibilitychange', function () { if (doc.visibilityState === 'hidden') touch(); });
  }

  /* ---------------------------------------------------------------- the stylesheet, loaded only when something is drawn */
  function css() {
    if (doc.querySelector('link[data-resume-css]')) return;
    var l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = '/assets/css/resume.css'; l.setAttribute('data-resume-css', '');
    doc.head.appendChild(l);
  }
  var noteEl = null, noteT = 0;
  function note(html, onTop) {
    css();
    if (noteEl) noteEl.remove();
    noteEl = doc.createElement('div'); noteEl.className = 'rs-note no-bubble no-cheer'; noteEl.setAttribute('role', 'status'); noteEl.setAttribute('aria-live', 'polite');
    noteEl.innerHTML = '<span class="rs-note-t">' + html + '</span><button type="button" class="rs-note-x" aria-label="Close this note">&times;</button>';
    doc.body.appendChild(noteEl);
    noteEl.style.top = Math.round(barBottom() + 10) + 'px';   // just under the site's bar
    noteEl.querySelector('.rs-note-x').addEventListener('click', hideNote);
    var top = noteEl.querySelector('[data-rs-top]');
    if (top) top.addEventListener('click', function () { hideNote(); onTop(); });
    clearTimeout(noteT); noteT = setTimeout(hideNote, 16000);
    return noteEl;
  }
  function hideNote() { clearTimeout(noteT); if (noteEl) { noteEl.remove(); noteEl = null; } }

  /* ---------------------------------------------------------------- arriving with #resume: a chapter or guide scrolls back, quietly */
  function comeBack() {
    if (!READING[kind]) return;
    var p = places().filter(function (x) { return x.u === here; })[0];
    try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) {}
    var mine = p && p.s ? p : null, spot = mine ? mine.s : null, fromMark = null;
    // a place marked by hand with the Save button (bookmarks.js), if it is newer than this one, wins
    try {
      var S = G.TOLSaved, lr = S && S.lastRead ? S.lastRead(here) : null;
      if (lr && lr.spot && S.spotTop && (!mine || (+lr.at || 0) > mine.at)) fromMark = lr.spot;
    } catch (e) {}
    if (!spot && !fromMark) return;
    var moved = false;
    function stop() { moved = true; }
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) { G.addEventListener(ev, stop, { once: true, passive: true }); });
    function target() {
      if (fromMark) { try { var v = G.TOLSaved.spotTop(fromMark); if (typeof v === 'number') return v; } catch (e) {} }
      return spot ? spotTop(spot) : null;
    }
    function go() {
      if (moved || G.scrollY > 160) return;     // the browser (or the visitor) already moved the page: leave it
      var y = target(); if (y == null || y < 120) return;
      try { G.scrollTo({ top: y, left: 0, behavior: still() ? 'auto' : 'smooth' }); } catch (e) { G.scrollTo(0, y); }
      note('Back where you were. <button type="button" class="rs-note-b" data-rs-top>Start from the top</button>', function () {
        put({ u: here, k: kind, s: null, f: 0, done: false });
        try { G.scrollTo({ top: 0, left: 0, behavior: still() ? 'auto' : 'smooth' }); } catch (e) { G.scrollTo(0, 0); }
        maxF = 0; var heading = doc.querySelector('main h1'); if (heading) { heading.setAttribute('tabindex', '-1'); try { heading.focus({ preventScroll: true }); } catch (e) {} }
      });
      // pictures and fonts can move things a little: look once more after the scroll has settled
      setTimeout(function () { if (moved) return; var y2 = target(); if (y2 != null && Math.abs(G.scrollY - y2) > 140) { try { G.scrollTo({ top: y2, behavior: 'auto' }); } catch (e) {} } }, still() ? 700 : 1500);
    }
    if (doc.readyState === 'complete') setTimeout(go, 120); else G.addEventListener('load', function () { setTimeout(go, 120); }, { once: true });
  }

  /* ---------------------------------------------------------------- Frequency Buddies: episode and playback position */
  function episodeWatch() {
    var shownFor = '', poll = 0;
    function api() { return G.TOLBuddiesPlayer; }
    function tick() {
      var A = api(), st = null; try { st = A && A.state ? A.state() : null; } catch (e) {}
      if (!st || !st.ep) return;
      var title = '';
      try { title = A._p && A._p.ep && A._p.ep.title ? A._p.ep.title : ''; } catch (e) {}
      var name = title ? 'Frequency Buddies: ' + plain(title, 70) : 'Frequency Buddies';
      if (shownFor !== st.ep) {
        shownFor = st.ep;
        var p = places().filter(function (x) { return x.u === here && x.ep === st.ep; })[0];
        if (p && !p.done && p.pos >= 15 && !st.playing && st.time < 5) offer(p, name);
      }
      if (!enabled() || locked()) return;
      if (st.ended) { put({ u: here, k: 'episode', t: name, ep: st.ep, pos: 0, tot: Math.round(st.total || 0), done: true }); return; }
      if (st.time >= 15 && (st.playing || armed)) put({ u: here, k: 'episode', t: name, ep: st.ep, pos: Math.floor(st.time), tot: Math.round(st.total || 0), done: false });
    }
    function offer(p, name) {
      css();
      var host = doc.querySelector('[data-buddies-player]'); if (!host || doc.querySelector('.rs-ep')) return;
      var bar = doc.createElement('div'); bar.className = 'rs-ep no-bubble no-cheer'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Back where you were');
      bar.innerHTML = '<span class="rs-ep-t">Back where you were in ' + esc(name.replace(/^Frequency Buddies: /, '')) + '.</span>' +
        '<button type="button" class="rs-ep-go" data-rs-go>Resume at ' + mmss(p.pos) + '</button>' +
        '<button type="button" class="rs-ep-top" data-rs-start>Start from the top</button>';
      host.parentNode.insertBefore(bar, host);
      function gone() { if (bar.parentNode) bar.remove(); clearInterval(watch); }
      bar.querySelector('[data-rs-go]').addEventListener('click', function () {
        var A = api(); try { if (A && A.resumeAt && A.resumeAt(p.pos)) { gone(); return; } } catch (e) {}
        say(bar, 'This browser could not jump there. Use the bar under the picture.');
      });
      bar.querySelector('[data-rs-start]').addEventListener('click', function () { put({ u: here, k: 'episode', ep: p.ep, pos: 0, done: false }); gone(); });
      var watch = setInterval(function () { var A = api(), st = null; try { st = A && A.state && A.state(); } catch (e) {} if (st && (st.playing || st.time >= 5)) gone(); }, 1000);
    }
    function say(bar, t) { var s = bar.querySelector('.rs-ep-t'); if (s) s.textContent = t; }
    poll = setInterval(tick, 3000); setTimeout(tick, 1200);
  }

  /* ---------------------------------------------------------------- start */
  if (stopped()) lsDel(KEY);   // "Stop remembering pages I visit" also clears this list
  G.TOLResume = {
    KEY: KEY, SKIP: SKIP, enabled: enabled, places: places, visible: visible, model: model, remove: remove, forget: forget, href: href, detail: detail, name: name,
    ago: ago, kindName: kindName, isDone: isDone, mmss: mmss, onChange: function (f) { hooks.push(f); }, css: css
  };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', startRecording); else startRecording();
})(window);
