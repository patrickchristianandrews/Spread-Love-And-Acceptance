/* this-week.js: "This week" (return26). A calm, weekly reason to come back, kept on this device only.

   1. The weekly card. A fixed 52-week schedule (assets/js/this-week-data.js) picks the week from the date on this
      device: one small thing to try (about a minute), one thing to explore, one thing to notice and one idea to
      try with someone, plus a link to My week (Sunday and Monday say "Look back on your week"). No server and no
      fetch, so it works offline. The home page (index.html) and /this-week.html carry the current default week as
      plain HTML, so with JavaScript off they still read well; this file swaps in the right week. /this-week.html
      keeps the last four weeks to look at (?week=YYYY-MM-DD, a Monday).
   2. "Welcome back" on the home page, only for someone who has local history (a past day, a part of Seven small days,
      a saved week, a chapter left halfway). Exactly one best next step, in this order: look back on your week
      (Sunday and Monday, with a saved week and nothing for this week yet), today's part of Seven small days, a
      chapter or the self path they were partway through, part 1 of Seven small days, or this week's card. It never
      says "you missed" or counts days. "Not now" keeps it quiet for a week (the plain card below stays). On the
      second or third day it adds one line about keeping the site on the home screen (/install.html), never a pop-up.
      In Quiet mode the install line is left out. It reads keys other parts of the site already keep and writes nothing
      until "Not now" is tapped.
   3. "Add today to your week": one small line inside the "What you got from this" card (return-visit.js calls
      TOLThisWeek.addLine). If My week has nothing for this week, a one-tap weather for today is saved as a draft in
      My week's own storage (tol-week-v1, same format), with Undo. At most once a day, and it rests for 30 days after
      three days with no tap. Never in Quiet mode.
   4. "Send this week's idea to someone": the site's own share sheet (TOLShareKit.shareText, else TOLShare, else the
      device's share menu, else copy) with a kind default message. One person at a time (private share).

   Keys: tol-thisweek-v1 { nn: the date "Not now" was tapped, ln: { d, n, off } for the one line } and, only after a tap
   on the weather, a draft day in tol-week-v1. Nothing is sent anywhere. No analytics. Exposes window.TOLThisWeek;
   require()-able in node (tools/this-week/*.js). */
(function (G) {
  'use strict';
  var DAY = 864e5, MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var p = String(s || '').split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]); return isNaN(d.getTime()) ? null : d; }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function dayStart(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function monday(d) { var x = dayStart(d); return addDays(x, -((x.getDay() + 6) % 7)); }
  function utcDay(d) { return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function short(d) { return MONS[d.getMonth()] + ' ' + d.getDate(); }

  /* ---------------------------------------------------------------- which week it is */
  function data() { return G.TOL_THIS_WEEK; }
  function epochMonday() { return monday(parse(data().epoch)); }
  // n: whole weeks since the first week (Monday, the epoch), never below 0; idx: which of the 52 cards
  function weekNumber(date) { return Math.max(0, Math.round((utcDay(monday(date)) - utcDay(epochMonday())) / (7 * DAY))); }
  function weekInfo(date) {
    var D = data(), n = weekNumber(date), start = addDays(epochMonday(), n * 7), idx = n % D.weeks.length;
    return { n: n, idx: idx, start: start, end: addDays(start, 6), w: D.weeks[idx], label: short(start) + ' to ' + short(addDays(start, 6)) };
  }
  // the weeks that can be looked at: this week and up to three before it (never before the first week)
  function archive(date) {
    var out = [], now = weekNumber(date);
    for (var k = 0; k < 4 && now - k >= 0; k++) out.push(weekInfo(addDays(monday(date), -7 * k)));
    return out;
  }
  function whenWord(k) { return k === 0 ? 'This week' : k === 1 ? 'Last week' : k + ' weeks ago'; }

  /* ---------------------------------------------------------------- the card (one template for the page, the home page and the build script) */
  function exLabel(k) { return { Tool: 'a tool', Guide: 'a guide', Chapter: 'a book chapter', Episode: 'an episode', Game: 'a game' }[k] || 'a page'; }
  function cardHTML(info, o) {
    o = o || {}; var w = info.w, id = o.id || 'tw-h';
    var tryLink = w.trl && !o.plain ? ' <a class="tw-more-link" href="' + esc(w.trl[0]) + '">' + esc(w.trl[1]) + '</a>' : '';
    var items =
      '<li class="tw-item tw-try"><span class="tw-l">Try, about a minute</span><span class="tw-t">' + esc(w.tr) + tryLink + '</span></li>' +
      '<li class="tw-item tw-ex"><span class="tw-l">Explore, ' + exLabel(w.k) + '</span><a class="tw-exlink" href="' + esc(w.eu) + '"><strong>' + esc(w.et) + '</strong><span>' + esc(w.en) + '</span></a></li>';
    var more =
      '<li class="tw-item"><span class="tw-l">Notice</span><span class="tw-t">' + esc(w.no) + '</span></li>' +
      '<li class="tw-item"><span class="tw-l">Try it with someone</span><span class="tw-t">' + esc(w.wi) + '</span></li>';
    var body = o.home
      ? '<ul class="tw-list">' + items + '</ul><details class="tw-fold"><summary>Notice, and try it with someone</summary><ul class="tw-list">' + more + '</ul></details>'
      : '<ul class="tw-list">' + items + more + '</ul>';
    var go = '<p class="tw-go">' + (o.home
      ? '<a class="tw-link" href="/this-week.html">The whole card, and earlier weeks</a>'
      : '<a class="tw-link" href="/my-week.html">Your week in weather</a>') +
      ' <button type="button" class="tw-btn is-soft" data-tw-send hidden>Send this week’s idea to someone</button></p>';
    var kicker = (o.kicker || 'This week') + ', ' + info.label;
    return '<p class="tw-k">' + esc(kicker) + '</p><h2 class="tw-h" id="' + id + '">' + esc(w.t) + '</h2>' + body + go;
  }

  /* ---------------------------------------------------------------- sharing */
  function shareMessage(info) {
    return 'A small idea for this week, in case you’d like to try it with me: ' + info.w.t + '. It takes about a minute.';
  }
  function shareInfo(info, base) {
    var origin = base || (G.location ? G.location.origin : 'https://spreadloveandacceptance.com');
    return { title: 'This week: ' + info.w.t, text: shareMessage(info), url: origin + '/this-week.html?week=' + ymd(info.start), heading: 'Send this week’s idea' };
  }
  function share(info) {
    var d = shareInfo(info);
    if (G.TOLShareKit && G.TOLShareKit.shareText) { try { G.TOLShareKit.shareText(d); return true; } catch (e) {} }
    if (G.TOLShare && G.TOLShare.open) { try { G.TOLShare.open(d); return true; } catch (e) {} }
    try { if (G.navigator && G.navigator.share) { G.navigator.share({ title: d.title, text: d.text, url: d.url }).catch(function () {}); return true; } } catch (e) {}
    try { G.navigator.clipboard.writeText(d.text + ' ' + d.url); return 'copied'; } catch (e) {}
    return false;
  }

  if (typeof document === 'undefined') {   // node: the build script and the tests
    var API = { weekInfo: weekInfo, weekNumber: weekNumber, archive: archive, cardHTML: cardHTML, shareInfo: shareInfo, monday: monday, ymd: ymd, parse: parse };
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
    return;
  }

  /* ================================================================ browser only */
  if (G.TOLThisWeek) return;
  var doc = document, root = doc.documentElement;
  if (doc.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;
  try { if (G.top !== G.self) return; } catch (e) { return; }

  var KEY = 'tol-thisweek-v1', WEEK = 'tol-week-v1', CHECKIN = 'tol-weather-v1';
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function lj(k) { try { return JSON.parse(lsGet(k) || 'null'); } catch (e) { return null; } }
  function helpersOff() { return root.classList.contains('tol-no-helpers') || root.classList.contains('tol-quiet') || !!(G.TOLQuiet && G.TOLQuiet.on && G.TOLQuiet.on()); }
  function recentOff() { return !!lsGet('tol-recent-off'); }
  function still() { return root.classList.contains('tol-still') || !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function css() {
    if (doc.querySelector('link[data-this-week]')) return;
    var l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = '/assets/css/this-week.css'; l.setAttribute('data-this-week', '');
    doc.head.appendChild(l);
  }
  function needData(cb) {
    if (G.TOL_THIS_WEEK) return cb();
    var s = doc.createElement('script'); s.src = '/assets/js/this-week-data.js'; s.onload = cb; s.onerror = function () {};
    doc.head.appendChild(s);
  }

  var S = { nn: '', ln: { d: '', n: 0, off: '' } };
  (function () { var o = lj(KEY); if (o && typeof o === 'object') { if (typeof o.nn === 'string') S.nn = o.nn; if (o.ln && typeof o.ln === 'object') S.ln = { d: o.ln.d || '', n: +o.ln.n || 0, off: o.ln.off || '' }; } })();
  function save() { lsSet(KEY, JSON.stringify(S)); }

  /* ---------------------------------------------------------------- what My week keeps (read; one small write for "Add today") */
  var SKIES = [['sunny', 'Sunny'], ['partly', 'Partly cloudy'], ['cloudy', 'Cloudy'], ['rainy', 'Rainy'], ['stormy', 'Stormy'], ['foggy', 'Foggy'], ['windy', 'Windy']];
  var SKYNAME = {}; SKIES.forEach(function (s) { SKYNAME[s[0]] = s[1]; });
  function readWeekStore() {
    var s = lj(WEEK); if (!s || typeof s !== 'object' || Array.isArray(s)) s = {};
    if (!s.weeks || typeof s.weeks !== 'object' || Array.isArray(s.weeks)) s.weeks = {};
    if (!s.drafts || typeof s.drafts !== 'object' || Array.isArray(s.drafts)) s.drafts = {};
    return s;
  }
  function weekDays(s) {   // every day with a weather, as 'YYYY-MM-DD' (the same merge My week shows)
    var out = {};
    ['weeks', 'drafts'].forEach(function (b) {
      Object.keys(s[b]).forEach(function (k) {
        var st = parse(k), w = s[b][k]; if (!st || !w || !Array.isArray(w.days)) return;
        w.days.forEach(function (d, i) { if (d && d.k && SKYNAME[d.k]) out[ymd(addDays(st, i))] = 1; });
      });
    });
    return out;
  }
  function checkinDays() {
    var out = {}, a = lj(CHECKIN); if (!Array.isArray(a)) return out;
    a.forEach(function (e) { if (e && /^\d{4}-\d{2}-\d{2}$/.test(e.d || '') && { clear: 1, gusty: 1, fog: 1 }[e.sky]) out[e.d] = e; });
    return out;
  }
  function savedWeekCount() { var s = readWeekStore(); return Object.keys(s.weeks).length; }
  function hasEntryThisWeek(now) {
    var days = weekDays(readWeekStore()), m = monday(now);
    for (var i = 0; i < 7; i++) if (days[ymd(addDays(m, i))]) return true;
    return false;
  }
  // the same reading of a Today's Weather check-in that my-week.js uses, so a draft started here keeps those days filled in
  function fromCheckin(e) {
    var i = typeof e.i === 'number' ? e.i : null, o = { src: 'checkin', t: [] };
    o.k = e.sky === 'clear' ? (i == null || i < 30 ? 'sunny' : i < 50 ? 'partly' : 'cloudy') : e.sky === 'gusty' ? (i != null && i >= 70 ? 'stormy' : 'windy') : 'foggy';
    if (i != null) o.s = Math.max(0, Math.min(10, Math.round(i / 10)));
    var z = { bad: 2, short: 4, ok: 6, good: 9 }[e.sleep]; if (z != null) o.z = z;
    var m = { work: 'work', money: 'money', health: 'health', family: 'family', kids: 'family' };
    (Array.isArray(e.front) ? e.front : []).forEach(function (x) { if (m[x] && o.t.indexOf(m[x]) < 0) o.t.push(m[x]); });
    return o;
  }
  var lastAdd = null;
  function addToday(sky) {
    if (!SKYNAME[sky]) return false;
    var s = readWeekStore(), t = dayStart(new Date()), start = ymd(addDays(t, -6)), prev = s.drafts[start] ? JSON.parse(JSON.stringify(s.drafts[start])) : null;
    var base = s.drafts[start] || s.weeks[start], wk = base ? JSON.parse(JSON.stringify(base)) : { start: start, days: [], note: '', savedAt: null };
    var ci = checkinDays(), st = parse(start);
    if (!Array.isArray(wk.days)) wk.days = [];
    for (var i = 0; i < 7; i++) {
      if (!wk.days[i] || typeof wk.days[i] !== 'object') wk.days[i] = (!base && i < 6 && ci[ymd(addDays(st, i))]) ? fromCheckin(ci[ymd(addDays(st, i))]) : { t: [] };
      if (!Array.isArray(wk.days[i].t)) wk.days[i].t = [];
    }
    if (wk.days[6].k) return false;   // never over something already there
    wk.days[6].k = sky; delete wk.days[6].src;
    if (!s.v) s.v = 1;
    s.drafts[start] = wk;
    if (!lsSet(WEEK, JSON.stringify(s))) return false;
    lastAdd = { start: start, prev: prev };
    return true;
  }
  function undoAdd() {
    if (!lastAdd) return false;
    var s = readWeekStore();
    if (lastAdd.prev) s.drafts[lastAdd.start] = lastAdd.prev; else delete s.drafts[lastAdd.start];
    var ok = lsSet(WEEK, JSON.stringify(s)); lastAdd = null; return ok;
  }

  /* ---------------------------------------------------------------- 3. one line in "What you got from this" */
  var pageShown = false;
  function lineWanted() {
    if (helpersOff()) return false;
    var now = new Date(), t = ymd(now);
    if (checkinDays()[t] || hasEntryThisWeek(now)) return false;
    if (S.ln.off && t < S.ln.off) return false;
    if (S.ln.d === t && !pageShown) return false;     // once a day
    if (S.ln.d !== t) {
      S.ln.n += 1; S.ln.d = t;
      if (S.ln.n > 3) { S.ln.off = ymd(addDays(now, 30)); S.ln.n = 0; save(); return false; }   // three quiet days: rest for a month
      save();
    }
    pageShown = true;
    return true;
  }
  function addLine(card) {
    if (!card || card.querySelector('.tw-line') || !lineWanted()) return;
    css();
    var p = doc.createElement('p'); p.className = 'tw-line cb-mini no-bubble';
    p.innerHTML = '<span class="tw-line-q" id="tw-line-q">Add today to your week. Tap the weather that fits.</span> <span class="tw-pick" role="group" aria-labelledby="tw-line-q">' +
      SKIES.map(function (s) { return '<button type="button" data-tw-sky="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</span>' +
      '<span class="tw-line-say" role="status" aria-live="polite"></span>';
    p.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button'); if (!b) return;
      var say = p.querySelector('.tw-line-say'), pick = p.querySelector('.tw-pick'), q = p.querySelector('.tw-line-q');
      if (b.hasAttribute('data-tw-sky')) {
        var k = b.getAttribute('data-tw-sky');
        if (addToday(k)) {
          S.ln.n = 0; save(); pick.hidden = true; q.hidden = true;
          say.innerHTML = 'Added: ' + esc(SKYNAME[k]) + ' for today. <a href="/my-week.html">See your week</a> <button type="button" class="tw-undo" data-tw-undo>Undo</button>';
          var u = say.querySelector('[data-tw-undo]'); if (u) try { u.focus(); } catch (x) {}
        } else say.textContent = 'This browser would not keep that, so nothing was saved.';
      } else if (b.hasAttribute('data-tw-undo')) {
        undoAdd(); say.textContent = 'Taken back.'; pick.hidden = false; q.hidden = false;
        var f = pick.querySelector('button'); if (f) try { f.focus(); } catch (x) {}
      }
    });
    card.appendChild(p);
  }

  /* ---------------------------------------------------------------- the card in the page */
  function fillCard(host, info, o) {
    if (host.getAttribute('data-tw-week') !== ymd(info.start) || o.force) {
      host.innerHTML = cardHTML(info, o); host.setAttribute('data-tw-week', ymd(info.start));
    }
    var send = host.querySelector('[data-tw-send]');
    if (send) { send.hidden = false; send.onclick = function () { var r = share(info); if (r === 'copied') send.textContent = 'Link copied'; }; }
  }
  function myWeekPush(host, now) {   // Sunday and Monday: "Look back on your week" comes first
    var d = now.getDay(); if (d !== 0 && d !== 1) return;
    var go = host.querySelector('.tw-go'); if (!go || go.querySelector('.tw-look')) return;
    var link = go.querySelector('.tw-link[href="/my-week.html"]'); if (link) link.remove();
    var a = doc.createElement('a'); a.className = 'tw-btn tw-look'; a.href = '/my-week.html'; a.textContent = 'Look back on your week';
    go.insertBefore(a, go.firstChild); go.insertBefore(doc.createTextNode(' '), a.nextSibling);
  }

  function initPage(sec) {
    needData(function () {
      css();
      var host = sec.querySelector('[data-tw-card]') || sec, now = new Date(), cur = weekInfo(now), arc = archive(now), shown = cur, note = '';
      var asked = ''; try { asked = new URLSearchParams(location.search).get('week') || ''; } catch (e) {}
      if (asked) {
        var ad = parse(asked), hit = null;
        if (ad) arc.forEach(function (a) { if (ymd(a.start) === ymd(monday(ad))) hit = a; });
        if (hit) shown = hit; else note = 'That week has moved on, so this is the card for this week.';
      }
      var tabs = sec.querySelector('[data-tw-tabs]'), noteEl = sec.querySelector('[data-tw-note]');
      function draw(info, focus) {
        fillCard(host, info, { kicker: info.n === cur.n ? 'This week' : (info.n === cur.n - 1 ? 'Last week' : 'Earlier'), force: true });
        if (info.n === cur.n) myWeekPush(host, now);
        if (tabs) Array.prototype.forEach.call(tabs.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-tw-n') === String(info.n))); });
        if (focus) { var h = host.querySelector('.tw-h'); if (h) { h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (e) {} } }
        try { history.replaceState(null, '', info.n === cur.n ? location.pathname : location.pathname + '?week=' + ymd(info.start)); } catch (e) {}
      }
      if (tabs && arc.length > 1) {
        tabs.innerHTML = arc.map(function (a, k) { return '<button type="button" data-tw-n="' + a.n + '" aria-pressed="false">' + whenWord(k) + '<span class="tw-tab-d">' + esc(a.label) + '</span></button>'; }).join('');
        tabs.hidden = false;
        tabs.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var n = +b.getAttribute('data-tw-n'); arc.forEach(function (a) { if (a.n === n) draw(a, true); }); });
      } else if (tabs) {
        var em = sec.querySelector('[data-tw-early]'); if (em) em.hidden = false;
      }
      if (noteEl && note) { noteEl.textContent = note; noteEl.hidden = false; }
      draw(shown, false);
    });
  }

  /* ---------------------------------------------------------------- 2. "Welcome back" on the home page */
  var ME = ['Name the feeling', 'Check your weather', 'One specific thank-you', 'An if-then plan', 'Step back from it', 'Three things that went okay', 'Keep one'];
  var WITH = ['Turn toward one small moment', 'Thank one quiet job', 'Ask instead of guessing', 'Start one thing softly', 'Check how it landed', 'Laugh together', 'Keep one together'];
  function daysState() {
    var o = lj('tol-return-v1') || {}, m = lsGet('tol-mode-v1'), set = o.set === 'me' || o.set === 'with' ? o.set : (m === 'me' || m === 'with' ? m : 'me');
    var d = (o.p && o.p[set]) || {}, count = 0, next = 0, today = ymd(new Date()), doneToday = false;
    for (var i = 1; i <= 7; i++) { if (d[i]) { count++; if (d[i] === today) doneToday = true; } else if (!next) next = i; }
    return { set: set, count: count, next: next, doneToday: doneToday, title: next ? (set === 'with' ? WITH : ME)[next - 1] : '' };
  }
  // someone who has been here on an earlier day. With "Stop remembering pages I visit" no days are kept, so what they
  // chose to keep (a part of Seven small days, a saved week, a saved place) stands in for it.
  function hasHistory() {
    var o = lj('tol-return-v1') || {}, days = lj('tol-visit-days');
    if (o.prev || (Array.isArray(days) && days.length >= 2)) return true;
    if (!recentOff()) return false;
    var last = lj('tol-lastread'), saved = lj('tol-saved');
    return daysState().count > 0 || savedWeekCount() > 0 || !!(last && typeof last === 'object' && Object.keys(last).length) || !!(Array.isArray(saved) && saved.length);
  }
  function midway() {
    if (recentOff()) return null;
    var last = lj('tol-lastread'), best = null;
    if (last && typeof last === 'object') Object.keys(last).forEach(function (u) {
      var r = last[u]; if (!r || u.charAt(0) !== '/') return;
      var at = +new Date(r.at) || 0, f = r.spot && typeof r.spot.f === 'number' ? r.spot.f : null;
      if (f == null || f < 0.05 || f > 0.92 || Date.now() - at > 30 * DAY) return;
      if (!best || at > best.at) best = { u: u, at: at, title: String(r.title || '').replace(/\s*[·|]\s*Spread Love.*$/, '') || 'your chapter' };
    });
    if (best) return { kind: 'chapter', h: best.title, d: 'You were partway through. It opens right where you stopped.', href: best.u + '#saved-spot', btn: 'Continue reading', path: best.u };
    var sp = lj('tol-selfpath-v1');
    if (sp && Array.isArray(sp.done) && sp.done.length >= 1 && sp.done.length <= 5) return { kind: 'selfpath', h: 'Your self path', d: 'You have done ' + sp.done.length + ' of 6 steps. The next one is ready when you are.', href: '/self-path.html#steps', btn: 'Pick up your self path' };
    return null;
  }
  function bestStep(now, info) {
    var ds = daysState(), dow = now.getDay();
    if ((dow === 0 || dow === 1) && savedWeekCount() && !hasEntryThisWeek(now)) return { kind: 'week', h: 'Look back on your week', d: 'Tap the weather for each day. It takes about five minutes and stays on this device.', href: '/my-week.html', btn: 'Look back on your week' };
    if (ds.next && !ds.doneToday && ds.count > 0) return { kind: 'days', h: 'Part ' + ds.next + ' of 7: ' + ds.title, d: 'Seven small days. A small thing to try today, about a minute.', href: '#small-days', btn: 'Do today’s part' };
    var mw = midway(); if (mw) return mw;
    if (ds.next && !ds.doneToday && ds.count === 0) return { kind: 'days', h: 'Part 1 of 7: ' + ds.title, d: 'Seven small days. One small thing a day, about a minute each.', href: '#small-days', btn: 'Try part 1' };
    return { kind: 'week-card', h: info.w.t, d: info.w.tr, href: '/this-week.html', btn: 'See this week’s idea', small: 'This week' };
  }
  function installLine() {
    if (helpersOff()) return '';
    var days = lj('tol-visit-days'), n = Array.isArray(days) ? days.length : 0;
    if (n < 2 || n > 3) return '';
    var standalone = (G.matchMedia && G.matchMedia('(display-mode: standalone)').matches) || G.navigator.standalone === true;
    if (standalone || lsGet('tol-app-installed') || lsGet('tol-install-asked')) return '';
    var off = lsGet('tol-appbar-off'); if (off && /^\d{4}-\d\d-\d\d$/.test(off) && Date.now() - Date.parse(off) < 30 * DAY) return '';
    try { if (sessionStorage.getItem('tol-invite-seen')) return ''; } catch (e) {}
    var phone = G.innerWidth <= 760;
    return '<p class="tw-install">Keep this site on your ' + (phone ? 'phone' : 'device') + '. It opens like an app, works offline, and nothing you type leaves your ' + (phone ? 'phone' : 'device') + '. <a href="/install.html">Show me how</a></p>';
  }
  function snoozed() { return !!S.nn && Date.now() - Date.parse(S.nn) < 7 * DAY; }

  function welcome(sec, info, now) {
    if (root.style.visibility === 'hidden' || doc.querySelector('.tp-lock') || !hasHistory() || snoozed()) return;
    var intro = doc.querySelector('.h-intro'); if (!intro) return;
    var step = bestStep(now, info), quick = intro.querySelector('.h-quick');
    var panel = doc.createElement('section'); panel.className = 'tw-back'; panel.id = 'tw-back'; panel.setAttribute('aria-labelledby', 'tw-back-h');
    panel.innerHTML = '<h2 class="tw-back-h" id="tw-back-h">Welcome back</h2>' +
      '<p class="tw-step"><strong>' + esc(step.h) + '</strong><span>' + esc(step.d) + '</span></p>' +
      '<p class="tw-go"><a class="tw-btn" href="' + esc(step.href) + '">' + esc(step.btn) + '</a> <button type="button" class="tw-link tw-quiet" data-tw-notnow>Not now</button></p>' +
      installLine() +
      (step.small ? '' : '<p class="tw-small">This week: <a href="/this-week.html">' + esc(info.w.t) + '</a></p>') +
      '<p class="tw-say" role="status" aria-live="polite"></p>';
    if (quick && quick.nextSibling) intro.insertBefore(panel, quick.nextSibling); else intro.appendChild(panel);
    intro.classList.add('has-tw');
    sec.classList.add('is-away');   // the card below stays out of sight while this panel is the block
    // a chapter shown here need not also show under "Pick up where you left off"
    if (step.path) {
      var box = doc.getElementById('pick-up');
      if (box) {
        Array.prototype.forEach.call(box.querySelectorAll('.h-resume-item'), function (a) { if ((a.getAttribute('href') || '').split('#')[0] === step.path) { var li = a.closest('li'); if (li) li.remove(); } });
        if (!box.querySelector('.h-resume-item') && !box.classList.contains('is-tip')) box.hidden = true;
      }
    }
    panel.querySelector('[data-tw-notnow]').addEventListener('click', function () {
      S.nn = ymd(new Date()); save();
      var keep = panel.querySelector('.tw-say');
      panel.querySelector('.tw-step').remove(); panel.querySelector('.tw-go').remove();
      Array.prototype.forEach.call(panel.querySelectorAll('.tw-install, .tw-small, .tw-back-h'), function (n) { n.remove(); });
      keep.textContent = 'Okay. This stays quiet for a week.';
      intro.classList.remove('has-tw'); sec.classList.remove('is-away');
      keep.setAttribute('tabindex', '-1'); try { keep.focus({ preventScroll: true }); } catch (e) {}
      setTimeout(function () { panel.remove(); }, 4000);
    });
  }

  function initHome(sec) {
    needData(function () {
      css();
      var now = new Date(), info = weekInfo(now), host = sec.querySelector('[data-tw-card]') || sec;
      fillCard(host, info, { home: true, kicker: 'This week' });
      myWeekPush(host, now);
      try { welcome(sec, info, now); } catch (e) {}
    });
  }

  function start() {
    var home = doc.querySelector('[data-this-week="home"]'), page = doc.querySelector('[data-this-week="page"]');
    if (home) initHome(home);
    if (page) initPage(page);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();

  G.TOLThisWeek = {
    weekInfo: weekInfo, archive: archive, cardHTML: cardHTML, share: function (i) { return share(i || weekInfo(new Date())); },
    shareCurrent: function () { return share(weekInfo(new Date())); }, addLine: addLine, addToday: addToday, undoAdd: undoAdd,
    needData: needData, shareInfo: shareInfo, bestStep: function () { return bestStep(new Date(), weekInfo(new Date())); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
