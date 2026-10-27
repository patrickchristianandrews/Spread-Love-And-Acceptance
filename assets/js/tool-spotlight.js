/* tool-spotlight.js: helps people find the tools, and notice the ones they have not met yet. Kept small and on this device only.
   Loaded by: /tools.html and the home page (next to tool-art.js), and by come-back.js on tool pages (it loads tool-art.js first).
   It adds one stylesheet, /assets/css/tool-spotlight.css (loaded here when something is drawn).

   1. "Tried": when a tool's page is opened (its path is one of META[id].p in tool-art.js), or its "Try it" button is pressed here, the
      tool id and the date are written down. ONE key: 'tol-tools-seen-v1' = { v: 1, seen: { id: 'YYYY-MM-DD' }, cel: [1, 5] }.
      Only ids and dates, plus which two small milestones (1st and 5th tool) have already had their soft moment, so it happens once.
      Nothing typed into a tool is read or stored, and nothing is sent anywhere.
      "Stop remembering pages I visit" (tol-recent-off): nothing is written and nothing is shown as tried.
      Quiet mode and "Hide the helpers": the record is still kept quietly, but there is no home rail, no "Try another tool" row, no tags
      and no milestone moment.
   2. The home page's "Tool of the day" (<section data-tool-rail hidden>): one tool, the same for everyone on a given day, rotating,
      skipping tools tried in the last 14 days when there is another (home28: one tool written out plainly, no longer a rail of cards).
   3. The "Try another tool" row at the end of tool pages (come-back.js asks for it): two tools that fit what was just used.
   4. Shared card (cardHTML) used by the rail, by /tools.html's cards and by "Start here".
   No streaks, no counts of days, no "you haven't": a count of tools tried, shown warmly and only as a count.
   window.TOLToolSpot: { META, seen, isSeen, mark, count, total, daily, others, nextFor, cardHTML, rowHTML, milestone, shown, countLine, ensureCss,
   onChange, idForPath, tags, whoChip, timeChip, shareAttrs, helpersOff, still } */
(function () {
  'use strict';
  if (window.TOLToolSpot) return;
  var doc = document, root = doc.documentElement, A = window.TOLToolArt;
  if (!A) return;
  var META = A.meta, ORDER = A.order, KEY = 'tol-tools-seen-v1', DAY = 864e5, CSS = '/assets/css/tool-spotlight.css';

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dnum(d) { return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY); }
  function parse(s) { var p = String(s || '').split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]); return isNaN(d.getTime()) ? null : d; }
  function sp(s) { return String(s || '').split(/\s+/).filter(Boolean); }
  function stopped() { return !!lsGet('tol-recent-off'); }
  function quiet() { return root.classList.contains('tol-quiet') || lsGet('tol-quiet') === '1' || !!(window.TOLQuiet && window.TOLQuiet.on && window.TOLQuiet.on()); }
  function helpersOff() { return quiet() || root.classList.contains('tol-no-helpers'); }
  function still() { return root.classList.contains('tol-still') || quiet() || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }

  /* ---------------------------------------------------------------- the one small record */
  function read() {
    var o = null;
    try { o = JSON.parse(lsGet(KEY) || 'null'); } catch (e) {}
    if (!o || typeof o !== 'object') o = {};
    var seen = {}, cel = [];
    if (o.seen && typeof o.seen === 'object') Object.keys(o.seen).forEach(function (id) { if (META[id] && /^\d{4}-\d\d-\d\d$/.test(o.seen[id])) seen[id] = o.seen[id]; });
    if (Array.isArray(o.cel)) o.cel.forEach(function (n) { if (n === 1 || n === 5) cel.push(n); });
    return { v: 1, seen: seen, cel: cel, real: o.real === true };
  }
  function write(o) { if (!stopped()) lsSet(KEY, JSON.stringify(o)); }
  function seen() { return stopped() ? {} : read().seen; }
  function isSeen(id) { return !!seen()[id]; }
  function count() { return Object.keys(seen()).length; }
  function total() { return ORDER.length; }
  var listeners = [];
  function changed() { listeners.forEach(function (f) { try { f(); } catch (e) {} }); }
  function onChange(f) { listeners.push(f); }

  // writes the id and today's date; { isNew, count } or null when nothing is remembered
  var last = null;
  function mark(id) {
    if (!META[id] || stopped()) return null;
    var o = read(), t = ymd(new Date()), isNew = !o.seen[id];
    if (o.seen[id] !== t) { o.seen[id] = t; write(o); }
    var n = Object.keys(o.seen).length;
    if (isNew) { last = { id: id, isNew: true, count: n }; changed(); }
    return { isNew: isNew, count: n };
  }
  // the first and the fifth tool each get one small, soft moment. Returns 1 or 5 when one is due (never in Quiet mode), else 0.
  // QA28 C9: only after a real use (something typed, picked or pressed in a tool), never just for opening a page: see markUsed()
  function milestone() {
    if (helpersOff() || stopped()) return 0;
    var o = read(), n = Object.keys(o.seen).length;
    if (!o.real) return 0;
    if (n >= 5 && o.cel.indexOf(5) < 0) return 5;
    if (n >= 1 && o.cel.indexOf(1) < 0) return 1;
    return 0;
  }
  function shown(m) {
    var o = read(); [1, 5].forEach(function (k) { if (k <= m && o.cel.indexOf(k) < 0) o.cel.push(k); }); write(o);
  }
  var CELE = { 1: 'That is your first tool tried. A good start.', 5: 'Five tools tried. You are finding what fits.' };
  // the first real use of a tool (a button pressed, a box filled in, a result shown): remembered once, and a "Try another tool" row already
  // on the page gets its small first/fifth-tool line then
  function markUsed() {
    if (stopped()) return;
    var o = read();
    if (!o.real) { o.real = true; write(o); }
    var m = milestone();
    if (!m) return;
    Array.prototype.forEach.call(doc.querySelectorAll('.ts-row'), function (row) {
      if (row.querySelector('.ts-cele')) return;
      var p = doc.createElement('p'); p.className = 'ts-cele'; p.setAttribute('role', 'status'); p.textContent = CELE[m];
      row.insertBefore(p, row.firstChild);
      if (!still()) row.classList.add('ts-pulse');
    });
    setTimeout(function () { shown(m); }, 0);
  }
  function countLine(n, t) {
    if (!n) return 'There are ' + t + ' tools here, all free. Start anywhere.';
    var x = 'You’ve tried ' + n + ' of ' + t + ' tools. ';
    if (n >= t) return x + 'Come back to any favorite whenever you like.';
    return x + (n < 5 ? 'A good start.' : n < 10 ? 'You’re finding what fits.' : 'Nicely explored.');
  }

  function idForPath(path) {
    path = String(path || '').split(/[?#]/)[0].replace(/\/$/, '/index.html') || '/index.html';
    var hit = '';
    ORDER.forEach(function (id) { if (!hit && META[id].h.split(/[?#]/)[0] === path) hit = id; });
    ORDER.forEach(function (id) { if (!hit && META[id].p.indexOf(path) !== -1) hit = id; });
    return hit;
  }

  /* ---------------------------------------------------------------- tags that expire */
  function tags(id) {
    var m = META[id], out = [], today = new Date();
    if (!m || helpersOff() || isSeen(id)) return out;
    var ad = m.ad && parse(m.ad);
    if (ad && dnum(today) - dnum(ad) <= 30 && dnum(today) >= dnum(ad)) out.push('New');
    else { var tm = m.tm && parse(m.tm); if (tm && dnum(today) <= dnum(tm)) out.push('Try me'); }
    return out;
  }

  /* ---------------------------------------------------------------- picking */
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function stride(n) { var s = [7, 11, 13, 17, 19, 23, 5, 3, 1]; for (var i = 0; i < s.length; i++) if (gcd(s[i], n) === 1) return s[i]; return 1; }
  // Tool of the day: the same for everyone on a day, rotating through the list. Tools tried in the last 14 days (before today) are
  // skipped when another is left; a tool tried today stays the pick until tomorrow.
  function daily(o) {
    o = o || {};
    var skip = o.skip || [], L = ORDER.filter(function (id) { return skip.indexOf(id) < 0; });
    if (!L.length) return '';
    var d = dnum(new Date()), s = stride(L.length), sn = seen(), t = ymd(new Date());
    function recent(id) {
      var x = sn[id] && parse(sn[id]); return !!x && sn[id] !== t && d - dnum(x) < 14;
    }
    for (var k = 0; k < L.length; k++) {
      var id = L[(((d + k) * s) % L.length + L.length) % L.length];
      if (!recent(id)) return id;
    }
    return L[((d * s) % L.length + L.length) % L.length];
  }
  // a few more: tools not tried yet, the most useful first with a small daily shuffle, at most two of one kind; then the least recent
  function others(n, o) {
    o = o || {};
    var skip = (o.skip || []).concat(o.not || []), sn = seen(), d = dnum(new Date()), out = [], byType = {};
    var fresh = ORDER.filter(function (id) { return skip.indexOf(id) < 0 && !sn[id]; });
    fresh.sort(function (a, b) {
      var ha = META[a].u * 3 + ((d * 7 + ORDER.indexOf(a) * 13) % 9), hb = META[b].u * 3 + ((d * 7 + ORDER.indexOf(b) * 13) % 9);
      return hb - ha || ORDER.indexOf(a) - ORDER.indexOf(b);
    });
    fresh.forEach(function (id) { var ty = META[id].ty; if (out.length < n && (byType[ty] || 0) < 2) { out.push(id); byType[ty] = (byType[ty] || 0) + 1; } });
    fresh.forEach(function (id) { if (out.length < n && out.indexOf(id) < 0) out.push(id); });
    if (out.length < n) {
      ORDER.filter(function (id) { return skip.indexOf(id) < 0 && sn[id]; }).sort(function (a, b) { return (sn[a] < sn[b] ? -1 : sn[a] > sn[b] ? 1 : 0); })
        .forEach(function (id) { if (out.length < n) out.push(id); });
    }
    return out;
  }
  function overlap(a, b) { return a.filter(function (x) { return b.indexOf(x) !== -1; }).length; }
  // two that fit what was just used: what it helps with, the same wants, its "also" types; ones not tried yet come first
  function nextFor(id, n) {
    var c = META[id]; if (!c) return [];
    var co = sp(c.o), ca = sp(c.al), ci = sp(c.i), withOthers = c.w.indexOf('group') !== -1 || c.w.indexOf('two') !== -1;
    var rows = ORDER.filter(function (x) { return x !== id; }).map(function (x) {
      var m = META[x], s = overlap(co, sp(m.o)) * 3 + overlap(ci, sp(m.i)) * 3 + m.u / 5;
      if (ca.indexOf(m.ty) !== -1) s += 3;
      if (sp(m.al).indexOf(c.ty) !== -1) s += 2;
      if (!isSeen(x)) s += 6;
      if (m.w === 'group' && c.w.indexOf('group') === -1) s -= 6;
      if (m.w === 'two' && !withOthers) s -= 3;
      return { id: x, s: s };
    }).sort(function (a, b) { return b.s - a.s || ORDER.indexOf(a.id) - ORDER.indexOf(b.id); });
    var out = [], ty = {};
    rows.forEach(function (r) { var t = META[r.id].ty; if (out.length < n && !ty[t]) { out.push(r.id); ty[t] = 1; } });
    rows.forEach(function (r) { if (out.length < n && out.indexOf(r.id) < 0) out.push(r.id); });
    return out;
  }

  /* ---------------------------------------------------------------- words */
  function whoChip(w) {
    var s = sp(w), a = s.indexOf('solo') !== -1, t = s.indexOf('two') !== -1, g = s.indexOf('group') !== -1;
    if (a && g) return 'Me or others';
    if (a) return t ? 'Me or two of us' : 'Just me';
    return t ? (g ? 'Two or more' : 'Two of us') : 'A group';
  }
  function timeChip(m) { return m.c || (m.m + ' min'); }
  function shareAttrs(id) {
    var m = META[id];
    return ' data-share data-share-title="' + esc(m.n) + '" data-share-text="' + esc(m.pr + ' It’s free and private.') + '" data-share-url="' + esc(m.h) + '"';
  }
  var IC_CLOCK = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8 4.6V8l2.4 1.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  var IC_WHO = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false"><circle cx="8" cy="5.2" r="2.7" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M2.8 13.4c.6-2.8 2.6-4 5.2-4s4.6 1.2 5.2 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  var IC_SHARE = '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false"><path d="M8 10.5V2.4M4.8 5.4L8 2.2l3.2 3.2M3 8.6v4a1.2 1.2 0 0 0 1.2 1.2h7.6A1.2 1.2 0 0 0 13 12.600v-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var IC_TICK = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false"><path d="M3.4 8.4l3 3 6.200-6.800" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------------------------------------------------------------- the shared card
     o: variant ('rail' | 'start' | 'grid'), ribbon (text, e.g. "Tool of the day"), share (true: a Share button), more (html placed under the buttons) */
  function cardHTML(id, o) {
    o = o || {};
    var m = META[id]; if (!m) return '';
    var c = A.accent(id), tried = isSeen(id), tg = tags(id), v = o.variant || 'grid';
    var flags = (o.ribbon ? '<span class="tc-flag is-day">' + esc(o.ribbon) + '</span>' : '') + tg.map(function (t) { return '<span class="tc-flag' + (t === 'New' ? ' is-new' : ' is-try') + '">' + esc(t) + '</span>'; }).join('') +
      '<span class="tc-tried"' + (tried ? '' : ' hidden') + '>' + IC_TICK + '<span>Tried</span></span>';
    return '<article class="tc no-dive tc--' + v + (tried ? ' is-tried' : '') + (o.ribbon ? ' is-day' : '') + '" data-id="' + esc(id) + '" data-href="' + esc(m.h) + '" style="--tc-a:' + c.a + ';--tc-t:' + c.t + ';--tc-k:' + c.k + '">' +
      '<a class="tc-art" href="' + esc(m.h) + '" tabindex="-1" aria-hidden="true" data-tc-go="' + esc(id) + '">' + A.svg(id, { size: v === 'rail' ? 64 : 96 }) + '</a>' +
      '<div class="tc-body"><div class="tc-flags">' + flags + '</div>' +
      '<h3 class="tc-name">' + esc(m.n) + '</h3>' +
      '<div class="tc-promise">' + esc(m.pr) + '</div>' +
      '<div class="tc-chips"><span class="tc-chip">' + IC_CLOCK + '<span>' + esc(timeChip(m)) + '</span></span><span class="tc-chip">' + IC_WHO + '<span>' + esc(whoChip(m.w)) + '</span></span></div></div>' +
      '<div class="tc-acts"><a class="tc-go" href="' + esc(m.h) + '" data-tc-go="' + esc(id) + '">Try it<span class="sr-only">: ' + esc(m.n) + '</span></a>' +
      (o.share ? '<button type="button" class="tc-share"' + shareAttrs(id) + ' aria-label="Share ' + esc(m.n) + '">' + IC_SHARE + '<span>Share</span></button>' : '') + '</div>' +
      (o.more || '') + '</article>';
  }
  // the end-of-page row: two tools that fit what was just used (come-back.js puts it in the "What you got from this" card)
  function rowHTML(id, o) {
    var ids = nextFor(id, 2), cele = milestone();
    if (!ids.length) return '';
    var li = ids.map(function (x) {
      var m = META[x], c = A.accent(x);
      return '<li><a class="ts-n" href="' + esc(m.h) + '" data-tc-go="' + esc(x) + '" style="--tc-a:' + c.a + ';--tc-t:' + c.t + ';--tc-k:' + c.k + '"><span class="ts-n-art">' + A.svg(x, { size: 44 }) + '</span>' +
        '<span class="ts-n-t"><span class="ts-n-name">' + esc(m.n) + '</span><span class="ts-n-pr">' + esc(m.pr) + '</span></span><span class="ts-n-time">' + esc(timeChip(m)) + '</span></a></li>';
    }).join('');
    if (cele) setTimeout(function () { shown(cele); }, 0);
    return '<div class="ts-row no-dive' + (cele && !still() ? ' ts-pulse' : '') + '" role="group" aria-label="Try another tool">' +
      (cele ? '<p class="ts-cele" role="status">' + esc(CELE[cele]) + '</p>' : '') +
      '<p class="ts-k">Try another tool</p><ul class="ts-list">' + li + '</ul><p class="ts-all"><a href="/tools.html">See all tools</a></p></div>';
  }
  function ensureCss() {
    if (doc.querySelector('link[data-ts-css]') || doc.querySelector('link[href^="' + CSS + '"]')) return;
    var l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = CSS; l.setAttribute('data-ts-css', ''); doc.head.appendChild(l);
  }

  /* ---------------------------------------------------------------- clicks: a card is one big target; "Try it" writes the tool down */
  doc.addEventListener('click', function (e) {
    var go = e.target.closest && e.target.closest('[data-tc-go]');
    if (go) { mark(go.getAttribute('data-tc-go')); return; }
    var card = e.target.closest && e.target.closest('.tc[data-href]');
    if (!card || e.target.closest('a, button, summary, details, input, select, textarea, label')) return;
    var sel = window.getSelection && window.getSelection();
    if (sel && String(sel).length) return;
    mark(card.getAttribute('data-id'));
    if (e.ctrlKey || e.metaKey || e.shiftKey) window.open(card.getAttribute('data-href'), '_blank'); else location.href = card.getAttribute('data-href');
  });
  // back to a page from the browser's memory: show what was tried since
  window.addEventListener('pageshow', function (e) { if (e.persisted) changed(); });
  window.addEventListener('storage', function (e) { if (e.key === KEY) changed(); });

  /* ---------------------------------------------------------------- the home page's rail */
  var HOME_SKIP = ['signal', 'lemon-quick', 'calm', 'feelings', 'team'];   // already on the home page, or not for it
  function initRail(host) {
    if (helpersOff()) return;
    var list = host.querySelector('[data-wt-list]');
    if (!list) return;
    // home28: one Tool of the day, written out plainly (not a row of cards): its name, what you get, how long, and one button
    function draw() {
      if (helpersOff()) { host.hidden = true; return; }
      var id = daily({ skip: HOME_SKIP }), m = id && META[id], n = count(), t = total(), cele = milestone();
      if (!m) { host.hidden = true; return; }
      var c = A.accent(id);
      list.innerHTML = '<div class="wt-f no-dive" data-id="' + esc(id) + '" style="--tc-a:' + c.a + ';--tc-t:' + c.t + ';--tc-k:' + c.k + '">' +
        '<a class="wt-f-art" href="' + esc(m.h) + '" tabindex="-1" aria-hidden="true" data-tc-go="' + esc(id) + '">' + A.svg(id, { size: 96 }) + '</a>' +
        '<div class="wt-f-body"><h3 class="wt-f-name">' + esc(m.n) + '</h3>' +
        '<p class="wt-f-pr">' + esc(m.pr) + '</p>' +
        '<p class="wt-f-meta">' + esc(timeChip(m)) + ' &middot; ' + esc(whoChip(m.w)) + (isSeen(id) ? ' &middot; You have tried this one' : '') + '</p>' +
        '<p class="wt-f-go"><a class="wt-f-btn" href="' + esc(m.h) + '" data-tc-go="' + esc(id) + '">Try it<span class="sr-only">: ' + esc(m.n) + '</span></a>' +
        '<span class="wt-f-count" role="status">' + esc(cele ? CELE[cele] : (n ? 'You have tried ' + n + ' of ' + t + '.' : 'A new one every day.')) + '</span></p></div></div>';
      if (cele) { host.classList.toggle('ts-pulse', !still()); setTimeout(function () { shown(cele); }, 1500); }
      host.hidden = false;
    }
    ensureCss(); draw();
    onChange(draw);
    doc.addEventListener('tol-quiet', function () { if (helpersOff()) host.hidden = true; else draw(); });
  }

  function start() {
    var host = doc.querySelector('[data-tool-rail]');
    if (host) { var go = function () { try { initRail(host); } catch (e) {} }; if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 1500 }); else setTimeout(go, 150); }
    // opened a tool's own page: write it down
    var id = idForPath(location.pathname);
    if (id && !host) {
      mark(id);
      // a real use: a box filled in or a button pressed inside the page's own content (never a link, the menu or this row)
      var arm = function (e) {
        var t = e.target; if (!t || !t.closest || !t.closest('main')) return;
        if (e.type === 'keydown' && /^(Tab|Shift|Escape|Alt|Control|Meta)$/.test(e.key)) return;
        if (!t.closest('button, input, textarea, select, summary, canvas, [role="button"]') || t.closest('.ts-end, .ts-row, nav, header, footer, .tol-pud-card, [data-tc-go]')) return;
        ['pointerdown', 'keydown', 'input', 'change'].forEach(function (n) { doc.removeEventListener(n, arm, true); });
        markUsed();
      };
      ['pointerdown', 'keydown', 'input', 'change'].forEach(function (n) { doc.addEventListener(n, arm, true); });
    }
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();

  window.TOLToolSpot = { META: META, seen: seen, isSeen: isSeen, mark: mark, count: count, total: total, daily: daily, others: others, nextFor: nextFor,
    cardHTML: cardHTML, rowHTML: rowHTML, milestone: milestone, shown: shown, markUsed: markUsed, cele: CELE, countLine: countLine, ensureCss: ensureCss, onChange: onChange,
    idForPath: idForPath, stopped: stopped, tags: tags, whoChip: whoChip, timeChip: timeChip, shareAttrs: shareAttrs, helpersOff: helpersOff, still: still,
    last: function () { return last; }, icons: { clock: IC_CLOCK, who: IC_WHO, share: IC_SHARE, tick: IC_TICK } };
})();
