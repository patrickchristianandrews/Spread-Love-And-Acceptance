/* my-week.js: "Your week in weather" on /my-week.html.
   1. Capture: tap the weather for each of the last 7 days, add optional sliders, tags and a note.
      Days already recorded in Today's Weather (tol-weather-v1) are read, never changed, and used to prefill.
   2. Save on this device (tol-week-v1): drafts, saved weeks, a pinned plan, the forecast adjusters, the reminder choice.
      Compare two weeks, edit, copy as text, print or save as PDF, save as an image card, delete one or all.
   3. Recap: a weather report of the week with a plain-language recap written by fixed rules on the device.
   4. Forecast: the next 7 days from a transparent model (a baseline from recent weeks plus fixed, listed factors)
      with adjusters, a "why" panel, "what would help most", a pinned plan, and forecast vs what happened.
   5. A weekly calendar reminder (.ics).
   Nothing is sent anywhere. No account. It is a playful planning tool based only on what the person enters. */
(function () {
  'use strict';
  var doc = document;
  var KEY = 'tol-week-v1', CHECKIN = 'tol-weather-v1', SITE = 'https://spreadloveandacceptance.com';

  /* ---------------------------------------------------------------- small helpers */
  function $(id) { return doc.getElementById(id); }
  function qs(s, r) { return (r || doc).querySelector(s); }
  function qsa(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) { var p = String(s || '').split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function validYmd(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !isNaN(parseYmd(s).getTime()); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function today() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  function diffDays(a, b) { return Math.round((a.getTime() - b.getTime()) / 86400000); }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function round1(x) { return Math.round(x * 10) / 10; }
  function mean(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function sign(x, d) { var v = d == null ? Math.round(x) : round1(x); return (v > 0 ? '+' : v < 0 ? '-' : '') + Math.abs(v); }
  var WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var WDS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function dshort(d) { return MONS[d.getMonth()] + ' ' + d.getDate(); }
  function dlong(d) { return WD[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate(); }
  function rangeLabel(start) {
    var s = parseYmd(start), e = addDays(s, 6);
    return dshort(s) + ' to ' + dshort(e) + (s.getFullYear() !== e.getFullYear() ? ', ' + e.getFullYear() : ', ' + e.getFullYear());
  }
  function list(a) { return a.length < 2 ? (a[0] || '') : a.length === 2 ? a[0] + ' and ' + a[1] : a.slice(0, -1).join(', ') + ', and ' + a[a.length - 1]; }
  function still() { var h = doc.documentElement; return h.classList.contains('tol-still') || h.classList.contains('tol-quiet') || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function pearson(xs, ys) {
    var n = xs.length; if (n < 4) return null;
    var mx = mean(xs), my = mean(ys), sxy = 0, sxx = 0, syy = 0;
    for (var i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) * (xs[i] - mx); syy += (ys[i] - my) * (ys[i] - my); }
    if (!sxx || !syy) return null;
    return sxy / Math.sqrt(sxx * syy);
  }

  /* ---------------------------------------------------------------- the seven skies */
  var SKIES = [
    { k: 'sunny', name: 'Sunny', b: 92, blurb: 'bright and easy' },
    { k: 'partly', name: 'Partly cloudy', b: 75, blurb: 'mostly good, a few clouds' },
    { k: 'cloudy', name: 'Cloudy', b: 55, blurb: 'flat or gray, nothing sharp' },
    { k: 'rainy', name: 'Rainy', b: 35, blurb: 'low, tearful or heavy' },
    { k: 'stormy', name: 'Stormy', b: 15, blurb: 'strained or overwhelmed' },
    { k: 'foggy', name: 'Foggy', b: 42, blurb: 'tired, far away or unclear' },
    { k: 'windy', name: 'Windy', b: 50, blurb: 'revved up, restless' }
  ];
  var SKY = {}; SKIES.forEach(function (s) { SKY[s.k] = s; });
  var TAGS = [
    { k: 'work', n: 'Work' }, { k: 'family', n: 'Family' }, { k: 'partner', n: 'Partner' }, { k: 'health', n: 'Health' },
    { k: 'money', n: 'Money' }, { k: 'rest', n: 'Rest' }, { k: 'fun', n: 'Fun' }, { k: 'conflict', n: 'Conflict' }, { k: 'news', n: 'Good news' }
  ];
  var TAG = {}; TAGS.forEach(function (t) { TAG[t.k] = t; });
  var SLIDERS = [
    { f: 'e', n: 'Energy', lo: 'drained', hi: 'full of it' },
    { f: 's', n: 'Stress', lo: 'calm', hi: 'strained' },
    { f: 'z', n: 'Sleep', lo: 'poorly rested', hi: 'well rested' },
    { f: 'c', n: 'Connection with others', lo: 'on my own', hi: 'well connected' }
  ];

  /* ---------------------------------------------------------------- icons: one set of layers that morphs between skies */
  var LAYER_ORDER = ['sun', 'cloud', 'rain', 'bolt', 'fog', 'wind'];
  var Z = [0, 0, 0, 1];
  var STATE = {
    sunny:  { sun: [1, 0, 0, 1.25], cloud: [0, 0, 10, .8], rain: Z, bolt: Z, fog: Z, wind: Z, fill: '#FFFFFF' },
    partly: { sun: [1, -9, -9, .85], cloud: [1, 5, 5, .9], rain: Z, bolt: Z, fog: Z, wind: Z, fill: '#FFFFFF' },
    cloudy: { sun: [0, -9, -9, .6], cloud: [1, 0, 0, 1.15], rain: Z, bolt: Z, fog: Z, wind: Z, fill: '#CBD3DD' },
    rainy:  { sun: [0, 0, -6, .6], cloud: [1, 0, -7, 1.05], rain: [1, 0, -2, 1], bolt: Z, fog: Z, wind: Z, fill: '#9AA8B8' },
    stormy: { sun: [0, 0, -6, .6], cloud: [1, 0, -8, 1.05], rain: [1, 0, 0, 1], bolt: [1, 0, 0, 1], fog: Z, wind: Z, fill: '#5C687C' },
    foggy:  { sun: [0, 0, -6, .6], cloud: [1, 0, -9, 1], rain: Z, bolt: Z, fog: [1, 0, 0, 1], wind: Z, fill: '#E3E8EE' },
    windy:  { sun: [0, 0, -6, .6], cloud: [1, -10, -12, .65], rain: Z, bolt: Z, fog: Z, wind: [1, 0, 0, 1], fill: '#DEE5EC' }
  };
  function layerStyle(t) {
    return 'opacity:' + t[0] + ';transform:translate(' + t[1] + 'px,' + t[2] + 'px) scale(' + t[3] + ');transform-origin:32px 32px';
  }
  function iconInner(k) {
    var s = STATE[k] || STATE.cloudy, rays = '';
    for (var i = 0; i < 8; i++) rays += '<line x1="32" y1="12.5" x2="32" y2="17.5" transform="rotate(' + (i * 45) + ' 32 32)"/>';
    return '' +
      '<g class="l-sun" style="' + layerStyle(s.sun) + '"><g class="rays" stroke="#F2A81D" stroke-width="3" stroke-linecap="round">' + rays + '</g><circle cx="32" cy="32" r="10" fill="#F7B733"/></g>' +
      '<g class="l-cloud" style="' + layerStyle(s.cloud) + '"><path d="M20 45a9 9 0 0 1-1.5-17.9A12 12 0 0 1 41.5 25 9.5 9.5 0 0 1 44 45Z" fill="' + s.fill + '" stroke="#7D8A9B" stroke-width="1.4" stroke-linejoin="round" style="fill:' + s.fill + '"/></g>' +
      '<g class="l-rain" style="' + layerStyle(s.rain) + '" stroke="#4F86C6" stroke-width="2.6" stroke-linecap="round"><line class="drop" x1="24" y1="49" x2="22.5" y2="55"/><line class="drop d2" x1="32" y1="49" x2="30.5" y2="55"/><line class="drop d3" x1="40" y1="49" x2="38.5" y2="55"/></g>' +
      '<g class="l-bolt" style="' + layerStyle(s.bolt) + '"><polygon class="flick" points="34,33 25,48 31.5,48 28.5,60 40.5,43 34,43" fill="#F6C026" stroke="#C48A0B" stroke-width="1" stroke-linejoin="round"/></g>' +
      '<g class="l-fog" style="' + layerStyle(s.fog) + '" stroke="#9AA8B8" stroke-width="3.2" stroke-linecap="round"><line x1="14" y1="45" x2="46" y2="45"/><line class="f2" x1="20" y1="52" x2="52" y2="52"/><line x1="14" y1="59" x2="42" y2="59"/></g>' +
      '<g class="l-wind" style="' + layerStyle(s.wind) + '" fill="none" stroke="#6E97C0" stroke-width="2.8" stroke-linecap="round"><path d="M10 34h30a5.5 5.5 0 1 0-5.5-5.5"/><path class="w2" d="M14 43h34a5.5 5.5 0 1 1-5.5 5.5"/><path class="w3" d="M10 52h18"/></g>';
  }
  function ico(k, cls) {
    return '<svg class="wk-ico' + (cls ? ' ' + cls : '') + '" data-k="' + esc(k) + '" viewBox="0 0 64 64" aria-hidden="true" focusable="false">' + iconInner(k) + '</svg>';
  }
  function setIco(svg, k) {
    if (!svg || !STATE[k] || svg.getAttribute('data-k') === k) return;
    var s = STATE[k];
    svg.setAttribute('data-k', k);
    LAYER_ORDER.forEach(function (l) {
      var g = svg.querySelector('.l-' + l); if (g) g.setAttribute('style', layerStyle(s[l]));
    });
    var p = svg.querySelector('.l-cloud path'); if (p) { p.style.fill = s.fill; p.setAttribute('fill', s.fill); }
  }

  /* ---------------------------------------------------------------- storage (one key, tol-week-v1) */
  var S = null, memOnly = false;
  function defaultAdj() {
    return { sleep: 0, work: 0, people: 0, event: [0, 0, 0, 0, 0, 0, 0], talk: [0, 0, 0, 0, 0, 0, 0], trip: [0, 0, 0, 0, 0, 0, 0], rest: [0, 0, 0, 0, 0, 0, 0], fun: [0, 0, 0, 0, 0, 0, 0], move: [0, 0, 0, 0, 0, 0, 0] };
  }
  function cleanDay(d) {
    d = d && typeof d === 'object' ? d : {};
    var o = {};
    if (SKY[d.k]) o.k = d.k;
    ['e', 's', 'z', 'c'].forEach(function (f) { if (typeof d[f] === 'number' && isFinite(d[f])) o[f] = clamp(Math.round(d[f]), 0, 10); });
    o.t = Array.isArray(d.t) ? d.t.filter(function (x) { return TAG[x]; }).filter(function (x, i, a) { return a.indexOf(x) === i; }) : [];
    if (typeof d.n === 'string' && d.n) o.n = d.n.slice(0, 240);
    if (d.src === 'checkin') o.src = 'checkin';
    return o;
  }
  function cleanWeek(w, startKey) {
    var o = { start: startKey, days: [], note: '', savedAt: null };
    var src = w && Array.isArray(w.days) ? w.days : [];
    for (var i = 0; i < 7; i++) o.days.push(cleanDay(src[i]));
    if (w && typeof w.note === 'string') o.note = w.note.slice(0, 300);
    if (w && typeof w.savedAt === 'number') o.savedAt = w.savedAt;
    return o;
  }
  function cleanAdj(a) {
    var d = defaultAdj(); if (!a || typeof a !== 'object') return d;
    ['sleep', 'work', 'people'].forEach(function (k) { if (typeof a[k] === 'number') d[k] = clamp(Math.round(a[k]), -3, 3); });
    ['event', 'talk', 'trip', 'rest', 'fun', 'move'].forEach(function (k) {
      if (Array.isArray(a[k])) for (var i = 0; i < 7; i++) d[k][i] = clamp(+a[k][i] || 0, 0, k === 'event' ? 2 : 1);
    });
    return d;
  }
  function load() {
    var raw = null, s = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { memOnly = true; }
    try { s = JSON.parse(raw || 'null'); } catch (e) { s = null; }
    if (!s || typeof s !== 'object') s = {};
    var out = { v: 1, weeks: {}, drafts: {}, plans: {}, adj: cleanAdj(s.adj), adjStart: validYmd(s.adjStart) ? s.adjStart : '', remind: { dow: 0, hm: '18:00' } };
    ['weeks', 'drafts'].forEach(function (b) {
      var src = s[b] && typeof s[b] === 'object' ? s[b] : {};
      Object.keys(src).forEach(function (k) { if (validYmd(k)) out[b][k] = cleanWeek(src[k], k); });
    });
    var pl = s.plans && typeof s.plans === 'object' ? s.plans : {};
    Object.keys(pl).forEach(function (k) {
      var p = pl[k]; if (!validYmd(k) || !p || !Array.isArray(p.days)) return;
      out.plans[k] = { start: k, pinnedAt: +p.pinnedAt || 0, adj: cleanAdj(p.adj), days: p.days.slice(0, 7).map(function (d) {
        return { k: SKY[d && d.k] ? d.k : 'cloudy', b: clamp(+d.b || 0, 0, 100), lo: clamp(+d.lo || 0, 0, 100), hi: clamp(+d.hi || 0, 0, 100) };
      }) };
    });
    if (s.remind && typeof s.remind === 'object') {
      if (typeof s.remind.dow === 'number') out.remind.dow = clamp(Math.round(s.remind.dow), 0, 6);
      if (/^\d{2}:\d{2}$/.test(s.remind.hm || '')) out.remind.hm = s.remind.hm;
    }
    return out;
  }
  var saveTimer = null;
  function persistNow() {
    clearTimeout(saveTimer); saveTimer = null;
    if (!S) return true;
    try { localStorage.setItem(KEY, JSON.stringify(S)); return true; } catch (e) { memOnly = true; return false; }
  }
  function persist() { clearTimeout(saveTimer); saveTimer = setTimeout(persistNow, 250); }
  function hasContent(w) {
    if (!w) return false;
    if (w.note) return true;
    return w.days.some(function (d) { return d.k || d.n || (d.t && d.t.length) || ['e', 's', 'z', 'c'].some(function (f) { return typeof d[f] === 'number'; }); });
  }
  function comparable(w) {
    if (!w) return '';
    return JSON.stringify({ d: w.days, n: w.note || '' });
  }

  /* ---------------------------------------------------------------- Today's Weather check-ins (read only) */
  var ciCache = null;
  function checkins() {
    if (ciCache) return ciCache;
    var out = {}, a = null;
    try { a = JSON.parse(localStorage.getItem(CHECKIN) || '[]'); } catch (e) { a = null; }
    if (Array.isArray(a)) a.forEach(function (e) {
      if (!e || !validYmd(e.d) || !{ clear: 1, gusty: 1, fog: 1 }[e.sky]) return;
      var i = typeof e.i === 'number' ? e.i : null, o = { src: 'checkin', t: [] };
      o.k = e.sky === 'clear' ? (i == null || i < 30 ? 'sunny' : i < 50 ? 'partly' : 'cloudy') : e.sky === 'gusty' ? (i != null && i >= 70 ? 'stormy' : 'windy') : 'foggy';
      if (i != null) o.s = clamp(Math.round(i / 10), 0, 10);
      var z = { bad: 2, short: 4, ok: 6, good: 9 }[e.sleep]; if (z != null) o.z = z;
      var f = Array.isArray(e.front) ? e.front : [], m = { work: 'work', money: 'money', health: 'health', family: 'family', kids: 'family' };
      f.forEach(function (x) { if (m[x] && o.t.indexOf(m[x]) < 0) o.t.push(m[x]); });
      out[e.d] = o;
    });
    ciCache = out; return out;
  }

  /* ---------------------------------------------------------------- the week on screen, and every day we know about */
  var cur = null, viewStart = '';
  function startForEnd(end) { return ymd(addDays(end, -6)); }
  function loadWeek(startKey) {
    viewStart = startKey;
    var base = S.drafts[startKey] || S.weeks[startKey];
    if (base) { cur = clone(base); return; }
    cur = cleanWeek(null, startKey);
    var ci = checkins(), s = parseYmd(startKey);
    for (var i = 0; i < 7; i++) { var k = ymd(addDays(s, i)); if (ci[k]) cur.days[i] = cleanDay(ci[k]); }
  }
  function gather() {
    var out = {}, ci = checkins();
    Object.keys(ci).forEach(function (k) { var o = clone(ci[k]); o.key = k; o.from = 'checkin'; out[k] = o; });
    function addWeek(w, from, wipe) {
      var s = parseYmd(w.start);
      w.days.forEach(function (d, i) {
        var k = ymd(addDays(s, i));
        if (!d.k) { if (wipe) delete out[k]; return; }
        var o = clone(d); o.key = k; o.from = from; out[k] = o;
      });
    }
    Object.keys(S.weeks).forEach(function (k) { addWeek(S.weeks[k], 'saved', false); });
    Object.keys(S.drafts).forEach(function (k) { addWeek(S.drafts[k], 'draft', false); });
    if (cur) addWeek(cur, 'draft', true);
    return out;
  }
  function bOf(d) { return d && SKY[d.k] ? SKY[d.k].b : null; }
  function lc(s) { return String(s).toLowerCase(); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  /* ---------------------------------------------------------------- the recap, by fixed rules (nothing leaves the device) */
  function bandWord(b) {
    return b >= 82 ? 'A sunny week' : b >= 66 ? 'Mostly sunny' : b >= 52 ? 'Mixed skies' : b >= 40 ? 'Clouds with some showers' : 'A stormy stretch';
  }
  function analyze(week) {
    var start = parseYmd(week.start), rows = [];
    for (var i = 0; i < 7; i++) {
      var d = week.days[i] || {}, date = addDays(start, i);
      rows.push({ i: i, date: date, wd: WD[date.getDay()], wds: WDS[date.getDay()], k: d.k || null, b: d.k ? SKY[d.k].b : null, e: d.e, s: d.s, z: d.z, c: d.c, t: d.t || [], n: d.n || '' });
    }
    var have = rows.filter(function (r) { return r.k; });
    var R = { rows: rows, have: have, avg: null, headline: '', lead: '', counts: '', bullets: [], caution: '', text: '' };
    if (!have.length) return R;
    R.avg = mean(have.map(function (r) { return r.b; }));
    R.headline = bandWord(R.avg);
    var cnt = {}; have.forEach(function (r) { cnt[r.k] = (cnt[r.k] || 0) + 1; });
    R.counts = SKIES.filter(function (s) { return cnt[s.k]; }).map(function (s) { return plural(cnt[s.k], lc(s.name) + ' day', lc(s.name) + ' days'); });
    var adj = { stormy: 'stormy', rainy: 'rainy', foggy: 'foggy', windy: 'windy', cloudy: 'gray', partly: 'mixed', sunny: 'sunny' };
    var low = function (r) { return r.k && r.b <= 50; };
    var lead = '';
    if (have.length >= 4) {
      var run = [], j = 0;
      while (j < 7 && rows[j].k && low(rows[j])) { run.push(rows[j]); j++; }
      var worst = run.slice().sort(function (a, b) { return a.b - b.b; })[0];
      if (run.length && j < 7 && rows[j].k && rows[j].b >= 60 && run.length <= 4) {
        lead = 'A ' + adj[worst.k] + ' start that cleared by ' + rows[j].wd + '.';
      } else if (run.length >= 4) {
        lead = 'A ' + adj[worst.k] + ' stretch at the start that lasted into ' + rows[Math.min(j, 6)].wd + '.';
      } else {
        var tail = [], q = 6;
        while (q >= 0 && rows[q].k && low(rows[q])) { tail.unshift(rows[q]); q--; }
        if (tail.length >= 2 && q >= 0 && rows[q].k && rows[q].b >= 60) {
          var tw = tail.slice().sort(function (a, b) { return a.b - b.b; })[0];
          lead = 'A brighter start that clouded over from ' + tail[0].wd + ', turning ' + adj[tw.k] + '.';
        } else {
          var dip = null;
          for (var m = 1; m < 6; m++) if (rows[m].k && rows[m].b <= 50 && rows[m - 1].k && rows[m - 1].b >= 60 && rows[m + 1].k && rows[m + 1].b >= 60) { dip = rows[m]; break; }
          if (dip) lead = 'A ' + adj[dip.k] + ' ' + dip.wd + ' in an otherwise brighter week.';
          else {
            var h1 = mean(have.filter(function (r) { return r.i < 3; }).map(function (r) { return r.b; })), h2 = mean(have.filter(function (r) { return r.i >= 4; }).map(function (r) { return r.b; }));
            if (h1 != null && h2 != null && h2 - h1 >= 12) lead = 'Skies brightened as the week went on.';
            else if (h1 != null && h2 != null && h1 - h2 >= 12) lead = 'Skies clouded over toward the end of the week.';
            else {
              var sd = Math.sqrt(mean(have.map(function (r) { return (r.b - R.avg) * (r.b - R.avg); })));
              var top = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; })[0];
              lead = sd < 14 ? 'A steady week, mostly ' + lc(SKY[top].name) + '.' : 'A changeable week, with plenty of different skies.';
            }
          }
        }
      }
    } else {
      lead = 'A few days are in so far. Fill in more and the recap gets richer.';
    }
    R.lead = lead;

    // patterns, as possibilities
    var b = [];
    var maxB = Math.max.apply(null, have.map(function (r) { return r.b; })), minB = Math.min.apply(null, have.map(function (r) { return r.b; }));
    var bests = have.filter(function (r) { return r.b === maxB; }), worsts = have.filter(function (r) { return r.b === minB; });
    var withZ = have.filter(function (r) { return typeof r.z === 'number'; });
    var withS = have.filter(function (r) { return typeof r.s === 'number'; });
    var withC = have.filter(function (r) { return typeof r.c === 'number'; });
    if (have.length >= 3 && maxB > minB) {
      if (bests.length <= 2) {
        var names = bests.map(function (r) { return r.wd; });
        var line = 'Your brightest ' + (bests.length === 1 ? 'day was ' : 'days were ') + list(names) + ' (' + lc(SKY[bests[0].k].name) + ').';
        var zmax = withZ.length >= 3 ? Math.max.apply(null, withZ.map(function (r) { return r.z; })) : null, zmin = withZ.length >= 3 ? Math.min.apply(null, withZ.map(function (r) { return r.z; })) : null;
        if (zmax != null && zmax > zmin && bests.some(function (r) { return r.z === zmax; })) line += ' It also matched your best sleep. Sleep and sky may be linked for you, or it may be a coincidence this week.';
        b.push({ w: 5, t: line });
      }
    }
    if (withS.length >= 3) {
      var smax = Math.max.apply(null, withS.map(function (r) { return r.s; })), smin = Math.min.apply(null, withS.map(function (r) { return r.s; }));
      var rs = pearson(withS.map(function (r) { return r.s; }), withS.map(function (r) { return r.b; }));
      var sr = withS.filter(function (r) { return r.s === smax; });
      if (smax > smin && sr.length === 1 && sr[0].b === minB && minB < maxB) b.push({ w: 4, t: 'Your most strained day, ' + sr[0].wd + ', was also your cloudiest. Stress may have been part of the weather that day.' });
      else if (rs != null && rs <= -0.55) b.push({ w: 4, t: 'The higher-stress days were mostly the cloudier ones. That could be a clue about what pulls your skies down.' });
    }
    if (withC.length >= 4) {
      var rc = pearson(withC.map(function (r) { return r.c; }), withC.map(function (r) { return r.b; }));
      if (rc != null && rc >= 0.55) b.push({ w: 3, t: 'Days with more connection tended to be brighter. It might be worth noticing when you feel most connected.' });
      else if (rc != null && rc <= -0.55) b.push({ w: 2, t: 'Days with more people time tended to be cloudier. Some weeks, company costs energy. It can help to notice which kinds.' });
    }
    var tagLines = [];
    TAGS.forEach(function (tg) {
      var w = have.filter(function (r) { return r.t.indexOf(tg.k) >= 0; }), wo = have.filter(function (r) { return r.t.indexOf(tg.k) < 0; });
      if (w.length < 2 || wo.length < 2) return;
      var df = mean(w.map(function (r) { return r.b; })) - mean(wo.map(function (r) { return r.b; }));
      if (Math.abs(df) >= 12) tagLines.push({ df: df, tg: tg, n: w.length });
    });
    tagLines.sort(function (a, b2) { return Math.abs(b2.df) - Math.abs(a.df); }).slice(0, 2).forEach(function (x) {
      b.push({ w: 3, t: 'The ' + x.n + ' days you marked "' + x.tg.n + '" tended to be ' + (x.df > 0 ? 'brighter' : 'cloudier') + ' than the others.' + (x.df > 0 && (x.tg.k === 'rest' || x.tg.k === 'fun' || x.tg.k === 'news') ? ' That might be worth planning more of.' : '') });
    });
    var lows = have.filter(low);
    if (lows.length >= 2 && lows.every(function (r) { var nx = rows[r.i + 1]; return r.i === 6 || (nx && nx.k && nx.b >= 60); })) b.push({ w: 2, t: 'Your rougher days were short. Each one eased within a day.' });
    b.sort(function (x, y) { return y.w - x.w; });
    R.bullets = b.slice(0, 3).map(function (x) { return x.t; });
    if (!R.bullets.length && have.length >= 4) R.bullets.push('No clear pattern stands out this week. That is normal, since one week is a small sample.');
    R.caution = 'These are possibilities drawn from ' + plural(have.length, 'day', 'days') + ' you entered, not conclusions about you. Weather changes, and so do weeks.';
    return R;
  }
  function weekText(week) {
    var R = analyze(week), L = [];
    L.push('My week in weather: ' + rangeLabel(week.start));
    if (R.avg != null) L.push(R.headline + '. ' + R.lead);
    L.push('');
    R.rows.forEach(function (r) {
      var line = r.wds + ' ' + dshort(r.date) + ': ' + (r.k ? SKY[r.k].name : 'not filled in');
      var bits = [];
      [['e', 'Energy'], ['s', 'Stress'], ['z', 'Sleep'], ['c', 'Connection']].forEach(function (p) { if (typeof r[p[0]] === 'number') bits.push(p[1] + ' ' + r[p[0]] + '/10'); });
      if (bits.length) line += '. ' + bits.join(', ');
      if (r.t.length) line += '. ' + r.t.map(function (x) { return TAG[x].n; }).join(', ');
      if (r.n) line += '. "' + r.n + '"';
      L.push(line);
    });
    if (week.note) { L.push(''); L.push('About the week: ' + week.note); }
    if (R.bullets.length) { L.push(''); L.push('What stood out (possibilities, not conclusions):'); R.bullets.forEach(function (x) { L.push('- ' + x); }); }
    L.push(''); L.push('Made at ' + SITE.replace('https://', '') + '/my-week.html and kept on my own device.');
    return L.join('\n');
  }

  /* ---------------------------------------------------------------- feedback helpers */
  var toastTimer = null;
  function toast(msg) {
    var t = $('wk-toast'); if (!t) return;
    t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 6000);
  }
  function announce(msg) { var a = $('wk-announce'); if (a) { a.textContent = ''; setTimeout(function () { a.textContent = msg; }, 30); } }
  function askConfirm(btn, text, yes, onYes) {
    var old = btn.parentNode.querySelector('.wk-confirm'); if (old) old.remove();
    var box = doc.createElement('div'); box.className = 'wk-confirm'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Please confirm');
    box.innerHTML = '<p>' + esc(text) + '</p><button type="button" class="wk-btn wk-btn-danger" data-y="1">' + esc(yes) + '</button> <button type="button" class="wk-btn" data-n="1">Keep it</button>';
    btn.insertAdjacentElement('afterend', box);
    var keep = box.querySelector('[data-n]'); keep.focus();
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      box.remove();
      if (b.hasAttribute('data-y')) onYes(); else btn.focus();
    });
    box.addEventListener('keydown', function (e) { if (e.key === 'Escape') { box.remove(); btn.focus(); } });
  }
  function copyText(text, okMsg) {
    function fallback() {
      try { var ta = doc.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-1000px'; doc.body.appendChild(ta); ta.select(); var ok = doc.execCommand('copy'); doc.body.removeChild(ta); toast(ok ? okMsg : 'Copying is not available here. Open the text below and copy it yourself.'); return ok; } catch (e) { toast('Copying is not available here.'); return false; }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, fallback); else fallback();
  }

  /* ---------------------------------------------------------------- 1. capture */
  function dayCardHTML(i) {
    var start = parseYmd(cur.start), date = addDays(start, i), d = cur.days[i], id = 'wk-d' + i;
    var picks = SKIES.map(function (s) {
      return '<button type="button" class="wk-pick" data-k="' + s.k + '" aria-pressed="' + (d.k === s.k) + '" aria-label="' + esc(s.name) + '" title="' + esc(s.name + ': ' + s.blurb) + '">' + ico(s.k) + '<span class="wk-pick-n" aria-hidden="true">' + esc(s.name) + '</span></button>';
    }).join('');
    var sl = SLIDERS.map(function (x) {
      var set = typeof d[x.f] === 'number', v = set ? d[x.f] : 5;
      return '<div class="wk-sl" data-f="' + x.f + '"><label for="' + id + '-' + x.f + '">' + esc(x.n) + '</label>' +
        '<div class="wk-sl-row"><input id="' + id + '-' + x.f + '" type="range" min="0" max="10" step="1" value="' + v + '" data-set="' + (set ? 1 : 0) + '" aria-valuetext="' + (set ? v + ' of 10' : 'not set') + '">' +
        '<output for="' + id + '-' + x.f + '">' + (set ? v : 'not set') + '</output>' +
        '<button type="button" class="wk-x" aria-label="Clear ' + esc(lc(x.n)) + ' for ' + esc(WD[date.getDay()]) + '"' + (set ? '' : ' hidden') + '>Clear</button></div>' +
        '<div class="wk-ends" aria-hidden="true"><span>' + esc(x.lo) + '</span><span>' + esc(x.hi) + '</span></div></div>';
    }).join('');
    var chips = TAGS.map(function (t) {
      return '<button type="button" class="wk-chip" data-t="' + t.k + '" aria-pressed="' + (d.t.indexOf(t.k) >= 0) + '">' + esc(t.n) + '</button>';
    }).join('');
    return '<article class="wk-day" data-di="' + i + '" aria-labelledby="' + id + '-h">' +
      '<header class="wk-day-h"><h3 id="' + id + '-h">' + esc(WD[date.getDay()]) + ' <span>' + esc(dshort(date)) + '</span></h3><span class="wk-src"' + (d.src === 'checkin' ? '' : ' hidden') + '>From your Today&rsquo;s Weather check-in</span></header>' +
      '<div class="wk-picks" role="group" aria-label="Weather for ' + esc(dlong(date)) + '">' + picks + '</div>' +
      '<p class="wk-picked" aria-live="polite">' + (d.k ? esc(SKY[d.k].name + ': ' + SKY[d.k].blurb) : 'Tap the weather that fits the day best.') + '</p>' +
      '<details class="wk-more"' + (detailCount(d) ? ' open' : '') + '><summary>More about this day <span class="wk-count">' + detailText(d) + '</span></summary>' +
      '<div class="wk-sliders">' + sl + '</div>' +
      '<fieldset class="wk-tags"><legend>What happened (tap any)</legend><div class="wk-chips">' + chips + '</div></fieldset>' +
      '<label class="wk-note-l" for="' + id + '-n">A short note (optional)</label><textarea id="' + id + '-n" class="wk-note" rows="2" maxlength="240" placeholder="Anything you want to remember about this day">' + esc(d.n || '') + '</textarea>' +
      '</details></article>';
  }
  function detailCount(d) {
    var n = 0; ['e', 's', 'z', 'c'].forEach(function (f) { if (typeof d[f] === 'number') n++; }); n += d.t.length; if (d.n) n++;
    return n;
  }
  function detailText(d) { var n = detailCount(d); return n ? '(' + n + ' added)' : ''; }
  function renderBar() {
    var s = parseYmd(viewStart), e = addDays(s, 6), t = today();
    $('wk-range').textContent = rangeLabel(viewStart);
    var inp = $('wk-end'); inp.value = ymd(e); inp.max = ymd(t);
    $('wk-next').disabled = diffDays(addDays(e, 7), t) > 0;
    var isNow = diffDays(t, e) === 0;
    $('wk-range-sub').textContent = isNow ? 'The last 7 days, ending today' : 'The 7 days ending ' + dlong(e);
  }
  function renderDays() {
    $('wk-days').innerHTML = cur.days.map(function (d, i) { return dayCardHTML(i); }).join('');
    $('wk-note').value = cur.note || '';
  }
  function renderStatus() {
    var sv = S.weeks[viewStart], has = hasContent(cur), same = sv && comparable(sv) === comparable(cur);
    var msg, btn = $('wk-save');
    if (!has) msg = 'Tap a weather for any day to begin. Nothing is saved until you do.';
    else if (!sv) msg = 'A draft is kept on this device as you go. Save it to add it to your list of weeks.';
    else if (same) msg = memOnly ? 'Saved for this visit only.' : 'Saved on this device.';
    else msg = 'You have changes that are not in your saved week yet.';
    if (memOnly) msg += ' This browser is not letting the page keep anything, so this stays only until you leave.';
    $('wk-state').textContent = msg;
    btn.disabled = !has || !!(sv && same);
    btn.textContent = sv ? 'Save changes' : 'Save this week';
    $('wk-start-over').disabled = !has;
  }
  function updateDraft() {
    var sv = S.weeks[viewStart];
    if (!hasContent(cur)) delete S.drafts[viewStart];
    else if (sv && comparable(sv) === comparable(cur)) delete S.drafts[viewStart];
    else S.drafts[viewStart] = clone(cur);
    persist();
  }
  var refreshTimer = null;
  function afterEdit() {
    updateDraft(); renderStatus();
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () { renderRecap(); renderForecast(false); renderVersus(); renderSaved(false); renderHello(); }, 180);
  }
  function touchDay(di) {
    var d = cur.days[di]; if (d.src) { delete d.src; var card = qs('.wk-day[data-di="' + di + '"] .wk-src'); if (card) card.hidden = true; }
  }
  function refreshPicked(di) {
    var card = qs('.wk-day[data-di="' + di + '"]'), d = cur.days[di]; if (!card) return;
    qsa('.wk-pick', card).forEach(function (b) { b.setAttribute('aria-pressed', String(d.k === b.getAttribute('data-k'))); });
    card.querySelector('.wk-picked').textContent = d.k ? SKY[d.k].name + ': ' + SKY[d.k].blurb : 'Tap the weather that fits the day best.';
    card.querySelector('.wk-count').textContent = detailText(d);
  }
  function setSlider(di, f, v, isSet) {
    var card = qs('.wk-day[data-di="' + di + '"]'), row = card && qs('.wk-sl[data-f="' + f + '"]', card); if (!row) return;
    var inp = row.querySelector('input'), out = row.querySelector('output'), x = row.querySelector('.wk-x');
    inp.setAttribute('data-set', isSet ? '1' : '0'); inp.setAttribute('aria-valuetext', isSet ? v + ' of 10' : 'not set');
    if (isSet) inp.value = v; else inp.value = 5;
    out.textContent = isSet ? v : 'not set'; x.hidden = !isSet;
    card.querySelector('.wk-count').textContent = detailText(cur.days[di]);
  }
  function wireCapture() {
    var box = $('wk-days');
    box.addEventListener('click', function (e) {
      var card = e.target.closest('.wk-day'); if (!card) return;
      var di = +card.getAttribute('data-di'), d = cur.days[di], b;
      if ((b = e.target.closest('.wk-pick'))) {
        var k = b.getAttribute('data-k'); touchDay(di);
        if (d.k === k) delete d.k; else d.k = k;
        refreshPicked(di); afterEdit();
      } else if ((b = e.target.closest('.wk-chip'))) {
        var t = b.getAttribute('data-t'), ix = d.t.indexOf(t); touchDay(di);
        if (ix >= 0) d.t.splice(ix, 1); else d.t.push(t);
        b.setAttribute('aria-pressed', String(ix < 0));
        card.querySelector('.wk-count').textContent = detailText(d); afterEdit();
      } else if ((b = e.target.closest('.wk-x'))) {
        var f = b.closest('.wk-sl').getAttribute('data-f'); touchDay(di); delete d[f]; setSlider(di, f, 5, false); afterEdit();
        b.closest('.wk-sl').querySelector('input').focus();
      }
    });
    function sliderSet(e) {
      var inp = e.target; if (!inp.matches || !inp.matches('.wk-sl input')) return;
      var card = inp.closest('.wk-day'), di = +card.getAttribute('data-di'), f = inp.closest('.wk-sl').getAttribute('data-f');
      touchDay(di); var v = +inp.value; cur.days[di][f] = v; setSlider(di, f, v, true); afterEdit();
    }
    box.addEventListener('input', function (e) {
      if (e.target.matches && e.target.matches('.wk-note')) {
        var di = +e.target.closest('.wk-day').getAttribute('data-di'); touchDay(di);
        var v = e.target.value.slice(0, 240); if (v) cur.days[di].n = v; else delete cur.days[di].n;
        qs('.wk-count', e.target.closest('.wk-day')).textContent = detailText(cur.days[di]); afterEdit();
      } else sliderSet(e);
    });
    // a tap or key on an unset slider counts even if the value stays at the middle
    ['pointerup', 'keyup'].forEach(function (ev) {
      box.addEventListener(ev, function (e) {
        var inp = e.target; if (!inp.matches || !inp.matches('.wk-sl input') || inp.getAttribute('data-set') === '1') return;
        if (ev === 'keyup' && ['Tab', 'Shift'].indexOf(e.key) >= 0) return;
        sliderSet(e);
      });
    });
    $('wk-note').addEventListener('input', function () { cur.note = this.value.slice(0, 300); afterEdit(); });
    $('wk-prev').addEventListener('click', function () { gotoEnd(addDays(parseYmd(viewStart), 6 - 7)); });
    $('wk-next').addEventListener('click', function () { gotoEnd(addDays(parseYmd(viewStart), 6 + 7)); });
    $('wk-end').addEventListener('change', function () { if (validYmd(this.value)) gotoEnd(parseYmd(this.value)); });
    $('wk-save').addEventListener('click', function () {
      if (!hasContent(cur)) return;
      var w = clone(cur); w.savedAt = Date.now(); S.weeks[viewStart] = w; delete S.drafts[viewStart]; cur.savedAt = w.savedAt;
      var ok = persistNow(); renderStatus(); renderSaved(false); renderForecast(false); renderVersus(); renderHello();
      toast(ok ? 'Saved on this device. Find it under Your saved weeks.' : 'This browser would not keep it, so it is here for this visit only.');
    });
    $('wk-start-over').addEventListener('click', function () {
      var btn = this;
      askConfirm(btn, 'Clear everything on screen for this week? A version you already saved stays in your list.', 'Yes, clear the screen', function () {
        cur = cleanWeek(null, viewStart); delete S.drafts[viewStart]; persist(); renderDays(); renderStatus(); renderRecap(); renderForecast(false); renderVersus(); renderSaved(false);
        $('wk-prev').focus();
      });
    });
  }
  function gotoEnd(end) {
    var t = today(); if (diffDays(end, t) > 0) end = t;
    updateDraft(); persistNow();
    loadWeek(startForEnd(end)); renderAll(false);
    announce('Showing ' + rangeLabel(viewStart));
  }

  /* ---------------------------------------------------------------- 2. the weather report (recap) */
  function recapStripHTML(R) {
    return R.rows.map(function (r, i) {
      if (!r.k) return '<li class="wk-col is-empty" style="--i:' + i + '"><span class="wk-wd">' + r.wds + '</span><span class="wk-date">' + r.date.getDate() + '</span><span class="wk-ico wk-ico-gap" aria-hidden="true">?</span><span class="wk-sk">Not filled in</span></li>';
      return '<li class="wk-col" style="--i:' + i + '"><span class="wk-wd">' + r.wds + '</span><span class="wk-date">' + r.date.getDate() + '</span>' + ico(r.k) + '<span class="wk-sk">' + esc(SKY[r.k].name) + '</span></li>';
    }).join('');
  }
  function trendHTML(R) {
    var pts = [], dots = '';
    R.rows.forEach(function (r, i) {
      if (r.b == null) return;
      var x = (i + 0.5) / 7 * 700, y = 100 - r.b;
      pts.push(Math.round(x * 10) / 10 + ',' + Math.round(y * 10) / 10);
      dots += '<i class="wk-dot" style="left:' + ((i + 0.5) / 7 * 100) + '%;bottom:' + r.b + '%;--i:' + i + '"></i>';
    });
    return '<div class="wk-trend" aria-hidden="true"><div class="wk-trend-in"><svg viewBox="0 0 700 100" preserveAspectRatio="none"><polyline class="wk-line" pathLength="1" points="' + pts.join(' ') + '" fill="none" vector-effect="non-scaling-stroke"/></svg>' + dots + '</div><span class="wk-trend-t">brighter</span><span class="wk-trend-b">cloudier</span></div>';
  }
  function recapAlt(R) {
    return 'Chart of the week, brighter at the top. ' + R.rows.map(function (r) { return r.wd + ': ' + (r.k ? lc(SKY[r.k].name) : 'not filled in'); }).join('. ') + '.';
  }
  function recapTableHTML(R) {
    var rows = R.rows.map(function (r) {
      return '<tr><th scope="row">' + esc(r.wd + ' ' + dshort(r.date)) + '</th><td>' + (r.k ? esc(SKY[r.k].name) : 'Not filled in') + '</td><td>' + (r.b != null ? r.b + ' of 100' : '') + '</td><td>' + (typeof r.e === 'number' ? r.e : '') + '</td><td>' + (typeof r.s === 'number' ? r.s : '') + '</td><td>' + (typeof r.z === 'number' ? r.z : '') + '</td><td>' + (typeof r.c === 'number' ? r.c : '') + '</td></tr>';
    }).join('');
    return '<table class="wk-sr"><caption>Your week in numbers, for screen readers</caption><thead><tr><th scope="col">Day</th><th scope="col">Weather</th><th scope="col">Brightness</th><th scope="col">Energy</th><th scope="col">Stress</th><th scope="col">Sleep</th><th scope="col">Connection</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }
  function moodOf(avg) { return avg >= 66 ? 'bright' : avg >= 50 ? 'mixed' : avg >= 38 ? 'gray' : 'storm'; }
  function reportHTML(week, R, live) {
    return '<div class="wk-report' + (live ? ' wk-live' : '') + '" data-mood="' + moodOf(R.avg) + '">' +
      '<div class="wk-sky" aria-hidden="true"><span class="wk-cl c1"></span><span class="wk-cl c2"></span><span class="wk-cl c3"></span><span class="wk-sun"></span></div>' +
      '<div class="wk-report-in"><p class="wk-kicker">Your week in weather &middot; ' + esc(rangeLabel(week.start)) + '</p>' +
      '<h3 class="wk-headline">' + esc(R.headline) + '</h3><p class="wk-lead">' + esc(R.lead) + '</p>' +
      '<ol class="wk-strip" aria-label="The week, day by day">' + recapStripHTML(R) + '</ol>' +
      '<div role="img" aria-label="' + esc(recapAlt(R)) + '">' + trendHTML(R) + '</div>' +
      '<p class="wk-counts">' + (R.counts.length ? 'Skies this week: ' + esc(list(R.counts)) + '.' : '') + (R.have.length < 7 ? ' You filled in ' + R.have.length + ' of 7 days.' : '') + '</p></div></div>';
  }
  function exportBarHTML(id) {
    return '<div class="wk-export" role="group" aria-label="Share or keep this week" data-for="' + esc(id) + '">' +
      '<button type="button" class="wk-btn" data-x="copy">Copy as text</button>' +
      '<button type="button" class="wk-btn" data-x="print">Print or save as PDF</button>' +
      '<button type="button" class="wk-btn" data-x="image">Save as an image card</button></div>';
  }
  var lastCard = null;
  function renderRecap() {
    var R = analyze(cur), wrap = $('rc-body');
    if (R.have.length < 2) {
      wrap.innerHTML = '<p class="wk-empty">Pick the weather for at least two days above and your weather report appears here, with a short recap in plain words.</p>';
      return;
    }
    var bullets = R.bullets.length ? '<h4>What stood out</h4><ul class="wk-bul">' + R.bullets.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '';
    var keep = wrap.querySelector('.wk-report') ? true : false;
    wrap.innerHTML = reportHTML(cur, R, true) +
      '<div class="wk-recap-text">' + bullets + '<p class="wk-fine">' + esc(R.caution) + '</p></div>' +
      exportBarHTML('current') + '<div id="wk-card-out" class="wk-card-out" aria-live="polite"></div>' + recapTableHTML(R);
    if (keep) wrap.querySelector('.wk-report').classList.add('wk-quiet-in');
  }
  function wireExport(root) {
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-x]'); if (!b) return;
      var host = b.closest('.wk-export'), id = host && host.getAttribute('data-for');
      var week = id === 'current' ? cur : weekFor(id); if (!week) return;
      var x = b.getAttribute('data-x');
      if (x === 'copy') copyText(weekText(week), 'Copied your week as text.');
      else if (x === 'print') printWeek(week);
      else if (x === 'image') imageCard(week, b);
    });
  }

  /* ---- print / PDF */
  function printWeek(week) {
    var R = analyze(week), box = $('wk-print');
    var rows = R.rows.map(function (r) {
      var bits = []; [['e', 'Energy'], ['s', 'Stress'], ['z', 'Sleep'], ['c', 'Connection']].forEach(function (p) { if (typeof r[p[0]] === 'number') bits.push(p[1] + ' ' + r[p[0]] + '/10'); });
      return '<tr><th scope="row">' + esc(r.wds + ' ' + dshort(r.date)) + '</th><td class="pi">' + (r.k ? ico(r.k) : '') + '</td><td>' + (r.k ? esc(SKY[r.k].name) : 'Not filled in') + '</td><td>' + esc(bits.join(', ')) + (r.t.length ? '<br>' + esc(r.t.map(function (x) { return TAG[x].n; }).join(', ')) : '') + (r.n ? '<br><em>' + esc(r.n) + '</em>' : '') + '</td></tr>';
    }).join('');
    box.innerHTML = '<h1>Your week in weather</h1><p>' + esc(rangeLabel(week.start)) + '</p>' + (R.avg != null ? '<h2>' + esc(R.headline) + '</h2><p>' + esc(R.lead) + '</p>' : '') +
      '<table><thead><tr><th>Day</th><th></th><th>Weather</th><th>Details</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      (week.note ? '<p><strong>About the week:</strong> ' + esc(week.note) + '</p>' : '') +
      (R.bullets.length ? '<h3>What stood out</h3><ul>' + R.bullets.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul><p><small>' + esc(R.caution) + '</small></p>' : '') +
      '<p><small>Made at ' + esc(SITE.replace('https://', '')) + '/my-week.html and kept on this device.</small></p>';
    doc.body.classList.add('wk-printing');
    var done = function () { doc.body.classList.remove('wk-printing'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(function () { try { window.print(); } catch (e) {} setTimeout(done, 1500); }, 60);
  }

  /* ---- image card (drawn as one SVG, then rasterized) */
  function xml(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function wrap(text, max) {
    var words = String(text).split(/\s+/), lines = [], line = '';
    words.forEach(function (w) { if ((line + ' ' + w).trim().length > max) { if (line) lines.push(line); line = w; } else line = (line + ' ' + w).trim(); });
    if (line) lines.push(line); return lines;
  }
  function cardSVG(week) {
    var R = analyze(week), W = 1080, H = 1350, mood = R.avg == null ? 'mixed' : moodOf(R.avg);
    var grad = { bright: ['#BFE3F7', '#FBEFC6'], mixed: ['#C9D9E8', '#F3EAD3'], gray: ['#B9C4D0', '#E6E0D2'], storm: ['#8E9BB0', '#CFC9C0'] }[mood];
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" font-family="Georgia, \'Times New Roman\', serif">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + grad[0] + '"/><stop offset="1" stop-color="' + grad[1] + '"/></linearGradient></defs>' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#g)"/>' +
      '<text x="70" y="120" font-size="30" fill="#33404F" letter-spacing="3">YOUR WEEK IN WEATHER</text>' +
      '<text x="70" y="176" font-size="34" fill="#33404F">' + xml(rangeLabel(week.start)) + '</text>' +
      '<text x="70" y="290" font-size="78" font-weight="bold" fill="#1F2A37">' + xml(R.headline || 'Your week') + '</text>';
    var y = 350;
    wrap(R.lead || '', 44).forEach(function (l) { s += '<text x="70" y="' + y + '" font-size="38" fill="#33404F">' + xml(l) + '</text>'; y += 52; });
    var top = Math.max(y + 10, 440), cw = (W - 140) / 7;
    s += '<rect x="50" y="' + top + '" width="' + (W - 100) + '" height="420" rx="36" fill="#FFFFFF" fill-opacity="0.78"/>';
    R.rows.forEach(function (r, i) {
      var cx = 70 + cw * i + cw / 2;
      s += '<text x="' + cx + '" y="' + (top + 62) + '" font-size="30" font-weight="bold" text-anchor="middle" fill="#1F2A37">' + r.wds + '</text>';
      s += '<text x="' + cx + '" y="' + (top + 98) + '" font-size="24" text-anchor="middle" fill="#4B5766">' + r.date.getDate() + '</text>';
      if (r.k) {
        s += '<svg x="' + (cx - 48) + '" y="' + (top + 118) + '" width="96" height="96" viewBox="0 0 64 64">' + iconInner(r.k) + '</svg>';
        var nm = SKY[r.k].name.split(' '); nm.forEach(function (w2, wi) { s += '<text x="' + cx + '" y="' + (top + 246 + wi * 26) + '" font-size="21" text-anchor="middle" fill="#33404F">' + xml(w2) + '</text>'; });
        var by = top + 395 - r.b * 1.1; s += '<circle cx="' + cx + '" cy="' + by + '" r="9" fill="#2B5B8C"/>';
      } else {
        s += '<text x="' + cx + '" y="' + (top + 190) + '" font-size="40" text-anchor="middle" fill="#8A93A0">?</text>';
      }
    });
    var pts = R.rows.filter(function (r) { return r.k; }).map(function (r) { return (70 + cw * r.i + cw / 2) + ',' + (top + 395 - r.b * 1.1); });
    if (pts.length > 1) s += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#2B5B8C" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" opacity="0.55"/>';
    var yy = top + 485;
    R.bullets.slice(0, 3).forEach(function (bl) {
      if (yy > H - 230) return;
      wrap(bl, 62).slice(0, 3).forEach(function (l, li) { s += '<text x="' + (li ? 98 : 70) + '" y="' + yy + '" font-size="30" fill="#2A3544">' + (li ? '' : '• ') + xml(l) + '</text>'; yy += 42; });
      yy += 14;
    });
    s += '<text x="70" y="' + (H - 96) + '" font-size="24" fill="#4B5766">A playful look back, from what I entered. Not a diagnosis.</text>';
    s += '<text x="70" y="' + (H - 56) + '" font-size="24" fill="#4B5766">spreadloveandacceptance.com/my-week.html</text></svg>';
    return s;
  }
  function imageCard(week, btn) {
    var host = btn.closest('.wk-export') && btn.closest('.wk-export').nextElementSibling, svg = cardSVG(week), img = new Image(), R = analyze(week);
    var alt = 'Your week in weather card for ' + rangeLabel(week.start) + '. ' + (R.headline || '') + '. ' + (R.lead || '');
    img.onload = function () {
      var c = doc.createElement('canvas'); c.width = 1080; c.height = 1350;
      var g = c.getContext('2d'); g.drawImage(img, 0, 0, 1080, 1350);
      c.toBlob(function (blob) {
        if (!blob) { toast('Could not make the image on this browser.'); return; }
        var url = URL.createObjectURL(blob), name = 'my-week-' + week.start + '.png';
        if (host && host.classList.contains('wk-card-out')) {
          host.innerHTML = '<figure><img src="' + url + '" alt="' + esc(alt) + '" width="270" height="338"><figcaption><a class="wk-btn" href="' + url + '" download="' + name + '">Download the image</a> <span>On a phone, press and hold the card to save it.</span></figcaption></figure>';
        }
        var a = doc.createElement('a'); a.href = url; a.download = name; doc.body.appendChild(a); a.click(); a.remove();
        toast('Image card ready. It was made on this device.');
        if (host && host.classList.contains('wk-card-out')) host.scrollIntoView({ block: 'nearest', behavior: still() ? 'auto' : 'smooth' });
      }, 'image/png');
    };
    img.onerror = function () { toast('Could not make the image on this browser. Try Copy as text instead.'); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ---------------------------------------------------------------- 3. the forecast model (simple, fixed, and shown on the page)
     brightness b is a 0 to 100 picture of how bright a day was (sunny 92, partly cloudy 75, cloudy 55, windy 50, foggy 42, rainy 35, stormy 15).
     forecast b = recent-weeks baseline + a small weekday pattern + the sum of the factors below. Energy and stress move the same way,
     and together with b they pick the icon. The band is the baseline spread plus what each plan item adds or removes. */
  var WORDS_MORE = ['Much less', 'Less', 'A little less', 'About usual', 'A little more', 'More', 'Much more'];
  var WORDS_LOAD = ['Much lighter', 'Lighter', 'A little lighter', 'About usual', 'A little heavier', 'Heavier', 'Much heavier'];
  var FX_SLIDE = [
    { id: 'sleep', label: 'Sleep', per: { db: 2.8, dE: 0.45, dS: -0.25 }, words: WORDS_MORE, mult: true, ask: 'Sleep next week' },
    { id: 'work', label: 'Workload', per: { db: -2.8, dE: -0.2, dS: 0.5 }, words: WORDS_LOAD, du: function (x) { return x > 0 ? 0.7 * x : 0; }, ask: 'Workload next week' },
    { id: 'people', label: 'Time with people', per: { db: 2.2, dE: 0.1, dS: -0.1 }, words: WORDS_MORE, mult: true, ask: 'Time with people' }
  ];
  var FX_CHIP = [
    { id: 'event', label: 'Stressful event', max: 2, ask: 'A stressful event', hint: 'Tap a day once for small, twice for big, a third time to clear it.', off: { '-1': { db: -2.5, dS: 0.6, du: 1.5 }, '0': { db: -6, dE: -0.4, dS: 1.2, du: 2.5 }, '1': { db: -3, dS: 0.5, du: 1.5 } } },
    { id: 'talk', label: 'Hard conversation', max: 1, ask: 'A hard conversation', hint: 'Tap the day it might happen.', off: { '-1': { db: -3, dS: 0.8, du: 1.5 }, '0': { db: -8, dE: -0.5, dS: 1.5, du: 3.5 }, '1': { db: -3.5, dE: -0.4, dS: 0.7, du: 2 } } },
    { id: 'trip', label: 'Trip or travel', max: 1, ask: 'A trip or travel', hint: 'Tap each day you will be away.', off: { '0': { db: -3.5, dE: -0.8, dS: 0.4, du: 3 } } },
    { id: 'rest', label: 'Rest planned', max: 1, ask: 'Rest you plan to take', hint: 'A slow morning, a nap, a quiet evening.', off: { '0': { db: 6, dE: 0.9, dS: -0.8, du: -1.5 }, '1': { db: 2.5, dE: 0.4 } } },
    { id: 'fun', label: 'Something fun planned', max: 1, ask: 'Something fun to look forward to', hint: 'Anything you enjoy, small counts.', off: { '-1': { db: 2 }, '0': { db: 7, dE: 0.3, dS: -0.5, du: -0.5 } } },
    { id: 'move', label: 'Exercise or movement', max: 1, ask: 'Exercise or movement', hint: 'A walk counts.', off: { '0': { db: 4, dE: 0.7, dS: -0.6, du: -1 }, '1': { db: 1.5 } } }
  ];
  var FXL = {}; FX_SLIDE.concat(FX_CHIP).forEach(function (f) { FXL[f.id] = f.label; });
  FXL.overlap = 'Overlap (several good things stack less than they add)'; FXL.limit = 'Staying inside the 0 to 100 scale';

  function iconFor(b, E, St) {
    if (b < 35 && St >= 6.5) return 'stormy';
    if (b < 45 && E <= 3.5) return 'foggy';
    if (b < 45) return 'rainy';
    if (St >= 6.5 && E >= 5) return 'windy';
    if (E <= 3 && b < 60) return 'foggy';
    if (b >= 78) return 'sunny';
    if (b >= 62) return 'partly';
    return 'cloudy';
  }
  function iconWhy(d) {
    var b = d.b, E = d.e, St = d.s, f = function (x) { return round1(x); };
    if (b < 35 && St >= 6.5) return 'Brightness ' + f(b) + ' is under 35 and stress ' + f(St) + ' is 6.5 or more, so stormy.';
    if (b < 45 && E <= 3.5) return 'Brightness ' + f(b) + ' is under 45 and energy ' + f(E) + ' is 3.5 or less, so foggy.';
    if (b < 45) return 'Brightness ' + f(b) + ' is under 45, so rainy.';
    if (St >= 6.5 && E >= 5) return 'Stress ' + f(St) + ' is 6.5 or more with energy ' + f(E) + ' at 5 or more, so windy.';
    if (E <= 3 && b < 60) return 'Energy ' + f(E) + ' is 3 or less with brightness under 60, so foggy.';
    if (b >= 78) return 'Brightness ' + f(b) + ' is 78 or more, so sunny.';
    if (b >= 62) return 'Brightness ' + f(b) + ' is from 62 to 77, so partly cloudy.';
    return 'Brightness ' + f(b) + ' is from 45 to 61, so cloudy.';
  }

  /* baseline from the last four weeks of days we know about (newer weeks count more) */
  function baseline() {
    var g = gather(), t = today(), items = [];
    Object.keys(g).forEach(function (k) {
      var dt = parseYmd(k), age = diffDays(t, dt); if (age < 0 || age > 27) return;
      var d = g[k]; items.push({ dow: dt.getDay(), b: SKY[d.k].b, e: d.e, s: d.s, z: d.z, c: d.c, w: age < 7 ? 1 : age < 14 ? 0.7 : age < 21 ? 0.5 : 0.35, from: d.from, age: age });
    });
    var n = items.length;
    if (n < 3) return { ok: false, n: n };
    var sw = 0, sb = 0; items.forEach(function (x) { sw += x.w; sb += x.w * x.b; });
    var B0 = sb / sw, dow = [], dn = [];
    for (var d = 0; d < 7; d++) {
      var it = items.filter(function (x) { return x.dow === d; }), w = it.reduce(function (s, x) { return s + x.w; }, 0);
      dn[d] = it.length;
      dow[d] = it.length ? clamp((it.reduce(function (s, x) { return s + x.w * (x.b - B0); }, 0) / w) * (it.length / (it.length + 2)), -12, 12) : 0;
    }
    var sr = 0; items.forEach(function (x) { var r = x.b - B0 - dow[x.dow]; sr += x.w * r * r; });
    var sd = Math.sqrt(sr / sw);
    function wm(f) { var a = items.filter(function (x) { return typeof x[f] === 'number'; }); if (a.length < 2) return null; var w2 = a.reduce(function (s, x) { return s + x.w; }, 0); return a.reduce(function (s, x) { return s + x.w * x[f]; }, 0) / w2; }
    var E0 = wm('e'), S0 = wm('s'), estE = E0 == null, estS = S0 == null;
    if (estE) E0 = clamp(2.5 + B0 / 20, 0, 10);
    if (estS) S0 = clamp(8 - B0 / 14, 0.5, 8);
    var maxAge = Math.max.apply(null, items.map(function (x) { return x.age; }));
    var few = n < 7 ? 6 : n < 14 ? 3 : 0, fromCi = items.filter(function (x) { return x.from === 'checkin'; }).length;
    var u0 = clamp(6 + 0.55 * sd + few + (fromCi === n ? 2 : 0), 7, 24);
    // your own weeks can nudge how much sleep and people time count
    var mult = { sleep: 1, people: 1 }, multWhy = {};
    [['sleep', 'z'], ['people', 'c']].forEach(function (p) {
      var a = items.filter(function (x) { return typeof x[p[1]] === 'number'; });
      if (a.length < 8) return;
      var r = pearson(a.map(function (x) { return x[p[1]]; }), a.map(function (x) { return x.b; }));
      if (r == null) return;
      if (r >= 0.4) { mult[p[0]] = 1.4; multWhy[p[0]] = 'more'; } else if (r <= 0.05) { mult[p[0]] = 0.7; multWhy[p[0]] = 'less'; }
    });
    return { ok: true, n: n, B0: B0, dow: dow, dn: dn, sd: sd, E0: E0, S0: S0, estE: estE, estS: estS, u0: u0, few: few, mult: mult, multWhy: multWhy, weeks: Math.ceil((maxAge + 1) / 7), fromCi: fromCi };
  }

  function compute(A, base) {
    var t = today(), days = [];
    for (var i = 0; i < 7; i++) {
      var date = addDays(t, i + 1), dw = date.getDay(), parts = [], uparts = [];
      FX_SLIDE.forEach(function (f) {
        var x = A[f.id]; if (!x) return;
        var m = f.mult ? base.mult[f.id] : 1;
        parts.push({ id: f.id, label: f.label, detail: f.words[x + 3] + (m !== 1 ? '. Your own weeks suggest this counts ' + (m > 1 ? 'a bit more' : 'a bit less') + ' for you' : ''), db: f.per.db * x * m, dE: f.per.dE * x, dS: f.per.dS * x });
        var du = f.du ? f.du(x) : (Math.abs(x) >= 3 ? 1.5 : 0);
        if (du) uparts.push({ id: f.id, label: f.label + ' (' + lc(f.words[x + 3]) + ')', du: du });
      });
      FX_CHIP.forEach(function (f) {
        var tot = { db: 0, dE: 0, dS: 0, du: 0 }, notes = [];
        Object.keys(f.off).forEach(function (o) {
          var s = i - (+o); if (s < 0 || s > 6) return;
          var size = A[f.id][s]; if (!size) return;
          var v = f.off[o];
          tot.db += (v.db || 0) * size; tot.dE += (v.dE || 0) * size; tot.dS += (v.dS || 0) * size; tot.du += (v.du || 0) * size;
          var nm = WD[addDays(t, s + 1).getDay()];
          notes.push(+o === 0 ? 'on ' + nm : +o === -1 ? 'the day before ' + nm : 'the day after ' + nm);
        });
        if (notes.length) {
          parts.push({ id: f.id, label: f.label, detail: notes.join('; '), db: tot.db, dE: tot.dE, dS: tot.dS });
          if (tot.du) uparts.push({ id: f.id, label: f.label, du: tot.du });
        }
      });
      var P = 0; parts.forEach(function (p) { if ((p.id === 'rest' || p.id === 'fun' || p.id === 'move') && p.db > 0) P += p.db; });
      if (P > 12) parts.push({ id: 'overlap', label: FXL.overlap, detail: 'Rest, fun and movement on or near the same day add up a little less than the sum', db: -(P - 12) * 0.5, dE: 0, dS: 0 });
      var raw = base.B0 + base.dow[dw], E = base.E0, St = base.S0, du = 0;
      parts.forEach(function (p) { raw += p.db; E += p.dE; St += p.dS; });
      uparts.forEach(function (p) { du += p.du; });
      var b = clamp(raw, 3, 97);
      if (Math.abs(b - raw) > 0.05) parts.push({ id: 'limit', label: FXL.limit, detail: 'Kept between 3 and 97', db: b - raw, dE: 0, dS: 0 });
      E = clamp(E, 0, 10); St = clamp(St, 0, 10);
      var u = clamp(base.u0 + du, 5, 30);
      days.push({ i: i, date: date, dow: dw, b: b, e: E, s: St, u: u, lo: clamp(b - u, 0, 100), hi: clamp(b + u, 0, 100), k: iconFor(b, E, St), parts: parts, uparts: uparts, wk: base.dow[dw], raw: raw });
    }
    return { days: days, avg: mean(days.map(function (d) { return d.b; })), avgU: mean(days.map(function (d) { return d.u; })) };
  }
  function score(r) { return r.avg + 0.35 * Math.min.apply(null, r.days.map(function (d) { return d.b; })); }
  function adjIsUsual(A) {
    return !A.sleep && !A.work && !A.people && FX_CHIP.every(function (f) { return A[f.id].every(function (x) { return !x; }); });
  }
  function planSummary(A) {
    var out = [];
    FX_SLIDE.forEach(function (f) { if (A[f.id]) out.push(f.ask + ': ' + lc(f.words[A[f.id] + 3])); });
    var t = today();
    FX_CHIP.forEach(function (f) {
      var ds = []; A[f.id].forEach(function (v, i) { if (v) ds.push(WDS[addDays(t, i + 1).getDay()] + (f.max === 2 ? (v === 2 ? ' (big)' : ' (small)') : '')); });
      if (ds.length) out.push(f.ask + ': ' + ds.join(', '));
    });
    return out;
  }
  function helpIdeas(A, base) {
    var cur = compute(A, base), J0 = score(cur), t = today(), best = {};
    function consider(cat, label, mod) {
      var a2 = clone(A); mod(a2); var r = compute(a2, base), g = score(r) - J0;
      if (g < 0.4) return;
      if (!best[cat] || g > best[cat].g) {
        var bigI = 0, bigD = 0; r.days.forEach(function (d, i) { var dd = Math.abs(d.b - cur.days[i].b); if (dd > bigD) { bigD = dd; bigI = i; } });
        best[cat] = { cat: cat, label: label, g: g, avgGain: r.avg - cur.avg, mod: mod, day: bigI, from: cur.days[bigI].k, to: r.days[bigI].k };
      }
    }
    if (A.sleep < 3) consider('sleep', 'Get a little more sleep than usual', function (a) { a.sleep = Math.min(3, a.sleep + 1); });
    if (A.work > -3) consider('work', 'Take a little off your plate', function (a) { a.work = Math.max(-3, a.work - 1); });
    if (A.people < 3) consider('people', 'Spend a bit more time with people you feel good around', function (a) { a.people = Math.min(3, a.people + 1); });
    [['rest', 'Plan a rest block on '], ['fun', 'Plan something fun on '], ['move', 'Plan some movement on ']].forEach(function (p) {
      for (var s = 0; s < 7; s++) (function (s) {
        if (A[p[0]][s]) return;
        consider(p[0], p[1] + WD[addDays(t, s + 1).getDay()], function (a) { a[p[0]][s] = 1; });
      })(s);
    });
    return Object.keys(best).map(function (k) { return best[k]; }).sort(function (a, b) { return b.g - a.g; }).slice(0, 3);
  }

  /* ---------------------------------------------------------------- forecast screen */
  var fc = { built: false, A: null, start: '', sel: 0, base: null, res: null, usual: null, prev: null, undo: null, prevWhy: {} };
  function fcStartKey() { return ymd(addDays(today(), 1)); }
  function initAdj() {
    fc.start = fcStartKey();
    if (S.plans[fc.start]) fc.A = clone(S.plans[fc.start].adj);
    else if (S.adjStart === fc.start) fc.A = clone(S.adj);
    else fc.A = defaultAdj();
  }
  function saveAdj() { S.adj = clone(fc.A); S.adjStart = fc.start; persist(); }

  function adjHTML() {
    var t = today();
    var presets = '<div class="wk-presets" role="group" aria-label="Quick starting points"><button type="button" class="wk-btn" data-preset="usual">My usual week</button><button type="button" class="wk-btn" data-preset="calm">A calm, restful week</button><button type="button" class="wk-btn" data-preset="busy">A packed, busy week</button><button type="button" class="wk-btn" id="fc-undo" disabled>Undo last change</button></div>';
    var sl = FX_SLIDE.map(function (f) {
      return '<div class="wk-asl" data-id="' + f.id + '"><label for="adj-' + f.id + '">' + esc(f.ask) + '</label><div class="wk-asl-row"><input id="adj-' + f.id + '" type="range" min="-3" max="3" step="1" value="0" aria-valuetext="About usual"><output for="adj-' + f.id + '">About usual</output></div><div class="wk-ends" aria-hidden="true"><span>' + esc(f.words[0]) + '</span><span>' + esc(f.words[6]) + '</span></div></div>';
    }).join('');
    var rows = FX_CHIP.map(function (f) {
      var chips = '';
      for (var i = 0; i < 7; i++) { var d = addDays(t, i + 1); chips += '<button type="button" class="wk-dchip" data-id="' + f.id + '" data-di="' + i + '" data-s="0" aria-pressed="false"><span>' + WDS[d.getDay()] + '</span><small>' + d.getDate() + '</small></button>'; }
      return '<fieldset class="wk-afs" data-id="' + f.id + '"><legend>' + esc(f.ask) + '</legend><p class="wk-hint">' + esc(f.hint) + '</p><div class="wk-dchips">' + chips + '</div></fieldset>';
    }).join('');
    return presets + '<div class="wk-asls">' + sl + '</div>' + rows;
  }
  function stripHTML() {
    return [0, 1, 2, 3, 4, 5, 6].map(function (i) {
      var d = addDays(today(), i + 1);
      return '<li><button type="button" class="wk-fcd" data-di="' + i + '" aria-pressed="false"><span class="wk-wd">' + WDS[d.getDay()] + '</span><span class="wk-date">' + d.getDate() + '</span>' + ico('cloudy') + '<span class="wk-sk"></span>' +
        '<span class="wk-track" aria-hidden="true"><i class="wk-band"></i><i class="wk-tick"></i><i class="wk-pt"></i></span><span class="wk-delta" aria-hidden="true"></span></button></li>';
    }).join('');
  }
  function mathHTML() {
    var rows = '';
    FX_SLIDE.forEach(function (f) { rows += '<tr><th scope="row">' + esc(f.label) + '</th><td>' + (f.per.db > 0 ? '+' : '') + f.per.db + ' points per step, every day (energy ' + sign(f.per.dE, 1) + ', stress ' + sign(f.per.dS, 1) + ')</td></tr>'; });
    FX_CHIP.forEach(function (f) {
      var bits = Object.keys(f.off).sort().map(function (o) { var v = f.off[o]; return (+o === 0 ? 'that day ' : +o < 0 ? 'day before ' : 'day after ') + sign(v.db, 1) + (f.max === 2 ? ' (doubled for big)' : ''); });
      rows += '<tr><th scope="row">' + esc(f.label) + '</th><td>' + esc(bits.join(', ')) + '</td></tr>';
    });
    return '<table class="wk-math"><caption>The fixed numbers behind the forecast (brightness points)</caption><thead><tr><th scope="col">Factor</th><th scope="col">Effect</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<ul class="wk-bul"><li>Your baseline is the weighted average of your last four weeks of days (the latest week counts fully, older weeks less), plus a small weekday pattern that is shrunk toward zero when there are few examples.</li>' +
      '<li>If rest, fun and movement stack up on the same day, anything above 12 points counts half.</li>' +
      '<li>If you have 8 or more days with sleep (or connection) and a sky, and your own days moved together, that factor counts 40 percent more. If they did not, it counts 30 percent less.</li>' +
      '<li>The band is the spread of your recent days plus a few points for each uncertain plan item, and fewer points for steady routines.</li>' +
      '<li>Icons: stormy if brightness is under 35 and stress is 6.5 or more; foggy if under 45 with energy 3.5 or less; rainy if under 45; windy if stress is 6.5 or more with energy 5 or more; foggy if energy is 3 or less under 60; sunny at 78 or more; partly cloudy at 62 or more; otherwise cloudy.</li></ul>';
  }
  function buildForecast() {
    $('fc-adj').innerHTML = adjHTML();
    $('fc-strip').innerHTML = stripHTML();
    $('fc-math').innerHTML = mathHTML();
    fc.built = true;
  }
  function syncAdj() {
    var A = fc.A, t = today();
    FX_SLIDE.forEach(function (f) {
      var inp = $('adj-' + f.id), out = qs('.wk-asl[data-id="' + f.id + '"] output');
      inp.value = A[f.id]; out.textContent = f.words[A[f.id] + 3]; inp.setAttribute('aria-valuetext', f.words[A[f.id] + 3]);
    });
    qsa('.wk-dchip').forEach(function (b) {
      var id = b.getAttribute('data-id'), i = +b.getAttribute('data-di'), v = A[id][i], f = FX_CHIP.filter(function (x) { return x.id === id; })[0];
      b.setAttribute('data-s', v); b.setAttribute('aria-pressed', String(v > 0));
      var d = addDays(t, i + 1), state = f.max === 2 ? (v === 2 ? 'big' : v === 1 ? 'small' : 'none') : (v ? 'planned' : 'none');
      b.setAttribute('aria-label', dlong(d) + ': ' + lc(f.ask) + ', ' + state);
      var sm = b.querySelector('small'); sm.textContent = f.max === 2 && v ? (v === 2 ? 'big' : 'small') : d.getDate();
    });
    $('fc-undo').disabled = !fc.undo;
  }
  function whyHTML(i) {
    var d = fc.res.days[i], u = fc.usual.days[i], base = fc.base, nm = WD[d.date.getDay()];
    var rows = [], max = 12;
    function row(id, label, detail, v, cls) { rows.push({ id: id, label: label, detail: detail, v: v, cls: cls || '' }); }
    row('base', 'Your recent weeks, on average', base.weeks + (base.weeks === 1 ? ' week' : ' weeks') + ' of days, newer ones counting more', base.B0, 'base');
    var dn = base.dn[d.dow];
    row('weekday', 'The usual pull of a ' + nm, dn ? 'From ' + plural(dn, 'example', 'examples') + ', shrunk toward zero because that is not many' : 'No ' + nm + 's recorded yet, so no pull', d.wk, 'wkd');
    d.parts.forEach(function (p) { row(p.id, p.label, p.detail, p.db); });
    var html = '<h4 id="fc-why-h" tabindex="-1">Why ' + esc(nm) + ' looks ' + esc(lc(SKY[d.k].name)) + '</h4>' +
      '<p class="wk-why-sum">Brightness <strong>' + round1(d.b) + '</strong> of 100' + (adjIsUsual(fc.A) ? '' : ', against ' + round1(u.b) + ' with no changes (' + esc(lc(SKY[u.k].name)) + ')') + '. Band: about ' + round1(d.lo) + ' to ' + round1(d.hi) + '.</p>' +
      '<table class="wk-why-t"><caption class="wk-sr">How each part moved ' + esc(nm) + '</caption><thead class="wk-sr"><tr><th scope="col">Part</th><th scope="col">Size</th><th scope="col">Points</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      var key = i + ':' + r.id, was = fc.prevWhy[key], chg = was != null && Math.abs(was - r.v) > 0.05, isNew = was == null && fc.prevWhy.__has;
      html += '<tr class="' + r.cls + (chg ? ' chg' : '') + (isNew ? ' new' : '') + '"><th scope="row"><span>' + esc(r.label) + '</span><small>' + esc(r.detail) + '</small></th><td class="bar" aria-hidden="true"><i class="' + (r.v < 0 ? 'neg' : 'pos') + '" style="width:' + (r.cls === 'base' ? 0 : clamp(Math.abs(r.v) / max * 100, 4, 100)) + '%"></i></td><td class="v">' + (r.cls === 'base' ? round1(r.v) : sign(r.v, 1)) + '</td></tr>';
    });
    html += '<tr class="total"><th scope="row"><span>Total brightness</span><small>' + esc(iconWhy(d)) + '</small></th><td class="bar" aria-hidden="true"></td><td class="v">' + round1(d.b) + '</td></tr></tbody></table>';
    html += '<h5>Why the band is about plus or minus ' + round1(d.u) + '</h5><ul class="wk-bul"><li>' + round1(base.u0) + ' to start with, from how much your recent days varied' + (base.few ? ' (plus a little because there are not many days yet)' : '') + (base.fromCi === base.n ? ' (and a little more because all of it came from check-ins)' : '') + '.</li>';
    d.uparts.forEach(function (p) { html += '<li>' + sign(p.du, 1) + ' for ' + esc(lc(p.label)) + (p.du > 0 ? ', since big changes are harder to predict' : ', since steady routines are easier to predict') + '.</li>'; });
    html += '</ul>';
    return html;
  }
  function matrixHTML() {
    var days = fc.res.days, head = '<tr><th scope="col">Part</th>' + days.map(function (d) { return '<th scope="col">' + WDS[d.date.getDay()] + '</th>'; }).join('') + '</tr>';
    var ids = ['base', 'weekday'];
    days.forEach(function (d) { d.parts.forEach(function (p) { if (ids.indexOf(p.id) < 0) ids.push(p.id); }); });
    var body = ids.map(function (id) {
      var label = id === 'base' ? 'Recent weeks' : id === 'weekday' ? 'Weekday pull' : FXL[id];
      return '<tr><th scope="row">' + esc(label) + '</th>' + days.map(function (d) {
        var v = id === 'base' ? fc.base.B0 : id === 'weekday' ? d.wk : d.parts.filter(function (p) { return p.id === id; }).reduce(function (s, p) { return s + p.db; }, 0);
        return '<td>' + (id === 'base' ? round1(v) : (Math.abs(v) < 0.05 ? '0' : sign(v, 1))) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    body += '<tr class="total"><th scope="row">Total</th>' + days.map(function (d) { return '<td>' + round1(d.b) + '</td>'; }).join('') + '</tr>';
    return '<table class="wk-matrix"><caption class="wk-sr">Every part for every day, in brightness points</caption><thead>' + head + '</thead><tbody>' + body + '</tbody></table>';
  }
  function confWord(u) { return u <= 11 ? 'fairly firm' : u <= 16 ? 'moderate' : u <= 21 ? 'loose' : 'very loose'; }
  function updateForecast() {
    var base = fc.base, A = fc.A, prev = fc.res;
    var res = compute(A, base), usual = compute(defaultAdj(), base);
    fc.res = res; fc.usual = usual;
    syncAdj();
    var btns = qsa('.wk-fcd'), changed = [];
    res.days.forEach(function (d, i) {
      var b = btns[i], u = usual.days[i];
      var prevK = b.querySelector('.wk-ico').getAttribute('data-k');
      if (prev && prevK !== d.k) changed.push(WD[d.date.getDay()] + ' moved from ' + lc(SKY[prevK].name) + ' to ' + lc(SKY[d.k].name));
      setIco(b.querySelector('.wk-ico'), d.k);
      b.querySelector('.wk-sk').textContent = SKY[d.k].name;
      var band = b.querySelector('.wk-band'), pt = b.querySelector('.wk-pt'), tick = b.querySelector('.wk-tick');
      band.style.bottom = d.lo + '%'; band.style.height = Math.max(2, d.hi - d.lo) + '%';
      pt.style.bottom = d.b + '%'; tick.style.bottom = u.b + '%';
      var dl = d.b - u.b, de = b.querySelector('.wk-delta');
      de.textContent = Math.abs(dl) < 0.5 ? 'same' : (dl > 0 ? 'up ' : 'down ') + Math.round(Math.abs(dl));
      de.setAttribute('data-dir', Math.abs(dl) < 0.5 ? '0' : dl > 0 ? '1' : '-1');
      b.setAttribute('aria-pressed', String(i === fc.sel));
      b.setAttribute('aria-label', dlong(d.date) + ': ' + lc(SKY[d.k].name) + ', brightness ' + Math.round(d.b) + ' of 100, range ' + Math.round(d.lo) + ' to ' + Math.round(d.hi) + (Math.abs(dl) >= 0.5 ? ', ' + Math.round(Math.abs(dl)) + (dl > 0 ? ' higher' : ' lower') + ' than with no changes' : '') + '. Press to see why.');
    });
    // confidence
    var firm = clamp(100 - (res.avgU - 5) / 25 * 100, 4, 100);
    $('fc-conf-fill').style.width = firm + '%';
    var uTxt = Math.abs(res.avgU - usual.avgU) < 0.4 ? 'about the same as your usual forecast' : res.avgU > usual.avgU ? 'wider than your usual forecast, because ' + (res.days.some(function (d) { return d.uparts.some(function (p) { return p.du > 0; }); }) ? 'some plans are harder to predict' : 'of the changes') : 'narrower than your usual forecast, because steady routines are easier to predict';
    $('fc-conf-t').textContent = 'How sure: ' + confWord(res.avgU) + '. The band averages about plus or minus ' + Math.round(res.avgU) + ' points, ' + uTxt + '. Based on ' + plural(base.n, 'day', 'days') + ' from ' + plural(base.weeks, 'week', 'weeks') + (base.fromCi ? ' (' + base.fromCi + ' from your Today’s Weather check-ins)' : '') + '.';
    // summary
    var dAvg = res.avg - usual.avg;
    $('fc-sum').textContent = adjIsUsual(A) ? 'This is your usual week, with no changes yet. Change something below and watch it move.' : 'Compared with your usual week, this plan moves the average brightness ' + (Math.abs(dAvg) < 0.5 ? 'hardly at all' : (dAvg > 0 ? 'up' : 'down') + ' about ' + Math.round(Math.abs(dAvg)) + ' points') + '.';
    // why
    var why = $('fc-why'); why.innerHTML = whyHTML(fc.sel);
    $('fc-matrix').innerHTML = matrixHTML();
    fc.prevWhy = { __has: 1 };
    res.days.forEach(function (d, i) { fc.prevWhy[i + ':base'] = base.B0; fc.prevWhy[i + ':weekday'] = d.wk; d.parts.forEach(function (p) { fc.prevWhy[i + ':' + p.id] = p.db; }); });
    // help
    var ideas = helpIdeas(A, base), hb = $('fc-help-list');
    fc.ideas = ideas;
    hb.innerHTML = ideas.length ? ideas.map(function (x, n) {
      var mv = x.from !== x.to ? ' ' + WD[addDays(today(), x.day + 1).getDay()] + ' could go from ' + lc(SKY[x.from].name) + ' to ' + lc(SKY[x.to].name) + '.' : '';
      return '<li' + (n === 0 ? ' class="top"' : '') + '><div><strong>' + esc(x.label) + '</strong><span>Adds about ' + round1(x.avgGain) + ' points to the week’s average.' + esc(mv) + '</span></div><button type="button" class="wk-btn" data-idea="' + n + '" aria-label="Try it: ' + esc(x.label) + '">Try it</button></li>';
    }).join('') : '<li class="none">Nothing stands out. This plan is already doing about as well as these simple levers can.</li>';
    renderPin();
    if (prev) {
      var s = 'Forecast updated. Average brightness ' + Math.round(res.avg) + (Math.abs(dAvg) >= 0.5 ? ', ' + (dAvg > 0 ? 'up ' : 'down ') + Math.round(Math.abs(dAvg)) + ' from your usual' : ', the same as your usual') + '. ' + (changed.length ? list(changed) + '.' : 'No day changed its icon.');
      announce(s);
    }
  }
  function renderPin() {
    var box = $('fc-pin'), plan = S.plans[fc.start], sum = planSummary(fc.A);
    var same = plan && JSON.stringify(plan.adj) === JSON.stringify(fc.A);
    var html = '<p class="wk-plan-s"><strong>Your plan for ' + esc(dshort(addDays(today(), 1))) + ' to ' + esc(dshort(addDays(today(), 7))) + ':</strong> ' + (sum.length ? esc(sum.join('. ')) + '.' : 'no changes from your usual week.') + '</p>';
    html += '<div class="wk-pin-row"><button type="button" class="wk-btn wk-btn-main" id="fc-pin-btn">' + (plan ? (same ? 'Pinned. Pin again' : 'Update my pinned plan') : 'Pin this plan') + '</button>' + (plan ? '<button type="button" class="wk-btn" id="fc-unpin">Unpin</button>' : '') + '</div>';
    html += '<p class="wk-fine">' + (plan ? 'Pinned ' + esc(dshort(new Date(plan.pinnedAt))) + '. When these days arrive, fill them in and this page shows your forecast next to what happened.' : 'Pinning keeps this forecast on this device. When the week arrives, fill in the days and you will see the forecast next to what actually happened.') + '</p>';
    var other = Object.keys(S.plans).filter(function (k) { return k !== fc.start && diffDays(addDays(parseYmd(k), 6), today()) >= 0; });
    if (other.length) html += '<p class="wk-fine">Also pinned: ' + other.map(function (k) { return esc(rangeLabel(k)); }).join(', ') + '. <a href="#versus">See it below</a>.</p>';
    box.innerHTML = html;
  }
  function renderForecast(userAction) {
    var base = baseline(), em = $('fc-empty'), main = $('fc-main');
    fc.base = base;
    if (!base.ok) {
      em.hidden = false; main.hidden = true;
      em.innerHTML = '<p>Your forecast switches on once there are at least 3 days with a weather on them from the last four weeks' + (base.n ? ' (you have ' + base.n + ')' : '') + '. Fill in the days above, or use <a href="/quick-checks.html#today">Today&rsquo;s Weather</a>, and this page reads them.</p>';
      return;
    }
    em.hidden = true; main.hidden = false;
    if (!fc.built) { initAdj(); buildForecast(); }
    updateForecast();
  }
  function applyAdj(mod, why) {
    fc.undo = clone(fc.A); mod(fc.A); saveAdj(); updateForecast();
    if (why) toast(why);
  }
  function wireForecast() {
    var main = $('fc-main');
    main.addEventListener('input', function (e) {
      var inp = e.target; if (!inp.matches || !inp.matches('.wk-asl input')) return;
      var id = inp.closest('.wk-asl').getAttribute('data-id'), v = +inp.value;
      if (fc.A[id] === v) return;
      fc.undo = fc.undo || clone(fc.A); var snap = clone(fc.A); fc.A[id] = v; fc.undo = snap; saveAdj(); updateForecast();
    });
    main.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('.wk-dchip'))) {
        var id = b.getAttribute('data-id'), i = +b.getAttribute('data-di'), f = FX_CHIP.filter(function (x) { return x.id === id; })[0];
        var snap = clone(fc.A); fc.A[id][i] = (fc.A[id][i] + 1) > f.max ? 0 : fc.A[id][i] + 1; fc.undo = snap;
        fc.sel = i; saveAdj(); updateForecast();
      } else if ((b = e.target.closest('.wk-fcd'))) {
        fc.sel = +b.getAttribute('data-di'); updateForecast();
        var h = $('fc-why-h'); if (h) h.focus({ preventScroll: true });
        var w = $('fc-why'); if (w && w.getBoundingClientRect().top > window.innerHeight - 80) w.scrollIntoView({ block: 'nearest', behavior: still() ? 'auto' : 'smooth' });
      } else if ((b = e.target.closest('[data-preset]'))) {
        var p = b.getAttribute('data-preset'), A2 = defaultAdj();
        if (p === 'calm') { A2.sleep = 1; A2.work = -1; A2.people = 1; A2.rest[1] = 1; A2.rest[5] = 1; A2.fun[4] = 1; A2.move[0] = 1; A2.move[2] = 1; A2.move[4] = 1; }
        if (p === 'busy') { A2.sleep = -1; A2.work = 2; A2.event[3] = 1; A2.talk[5] = 1; }
        var snap2 = clone(fc.A); fc.A = A2; fc.undo = snap2; saveAdj(); updateForecast();
        announce('Plan set to ' + (p === 'usual' ? 'your usual week' : p === 'calm' ? 'a calm, restful week' : 'a packed, busy week') + '.');
      } else if ((b = e.target.closest('[data-idea]'))) {
        var x = fc.ideas[+b.getAttribute('data-idea')]; if (!x) return;
        var snap3 = clone(fc.A); x.mod(fc.A); fc.undo = snap3; saveAdj(); updateForecast();
        var nb = qs('.wk-fcd[data-di="' + x.day + '"]'); if (nb) nb.focus({ preventScroll: true });
      } else if (e.target.closest('#fc-undo')) {
        if (fc.undo) { fc.A = fc.undo; fc.undo = null; saveAdj(); updateForecast(); }
      } else if (e.target.closest('#fc-pin-btn')) {
        var r = fc.res;
        S.plans[fc.start] = { start: fc.start, pinnedAt: Date.now(), adj: clone(fc.A), days: r.days.map(function (d) { return { k: d.k, b: round1(d.b), lo: round1(d.lo), hi: round1(d.hi) }; }) };
        var keys = Object.keys(S.plans).sort(); while (keys.length > 10) delete S.plans[keys.shift()];
        persistNow(); renderPin(); renderVersus(); renderHello();
        toast('Plan pinned on this device. Come back when the week arrives to compare.');
        var ub = $('fc-unpin'); if (ub) ub.focus();
      } else if (e.target.closest('#fc-unpin')) {
        delete S.plans[fc.start]; persistNow(); renderPin(); renderVersus(); renderHello(); toast('Unpinned.');
        $('fc-pin-btn').focus();
      }
    });
  }

  /* ---------------------------------------------------------------- 4. forecast vs what actually happened */
  function renderVersus() {
    var box = $('vs-body'), t = today(), g = gather();
    var plans = Object.keys(S.plans).sort().reverse().map(function (k) { return S.plans[k]; }).filter(function (p) { return diffDays(t, parseYmd(p.start)) >= 0; }).slice(0, 3);
    if (!plans.length) {
      box.innerHTML = '<p class="wk-empty">Pin a forecast above. When its days arrive, fill them in on this page and you will see the forecast and what really happened side by side, with a note on where the forecast was close and where life had more to say.</p>';
      return;
    }
    box.innerHTML = plans.map(function (p) {
      var inBand = 0, seen = 0, pending = 0, future = 0, cells = '';
      p.days.forEach(function (fd, i) {
        var date = addDays(parseYmd(p.start), i), key = ymd(date), a = g[key], arrived = diffDays(t, date) >= 0, v = '', ab = a ? SKY[a.k].b : null;
        if (!arrived) { future++; v = 'Still to come'; }
        else if (!a) { pending++; v = 'Not filled in yet'; }
        else {
          seen++; var inside = ab >= fd.lo - 0.5 && ab <= fd.hi + 0.5; if (inside) inBand++;
          v = inside ? 'Inside the band' : ab > fd.b ? 'Brighter than forecast' : 'Cloudier than forecast';
        }
        cells += '<li class="wk-vs-day"><span class="wk-wd">' + WDS[date.getDay()] + ' ' + date.getDate() + '</span>' +
          '<span class="wk-vs-f"><small>Forecast</small>' + ico(fd.k) + '<span>' + esc(SKY[fd.k].name) + '</span></span>' +
          '<span class="wk-vs-a"><small>What happened</small>' + (a ? ico(a.k) + '<span>' + esc(SKY[a.k].name) + '</span>' : '<span class="wk-vs-none">' + (arrived ? '?' : '&hellip;') + '</span><span>' + (arrived ? 'Not yet' : 'Later') + '</span>') + '</span>' +
          '<span class="wk-vs-v' + (a && arrived ? (v[0] === 'I' ? ' ok' : ' off') : '') + '">' + esc(v) + '</span></li>';
      });
      var head = seen ? inBand + ' of ' + seen + ' ' + (seen === 1 ? 'day landed' : 'days landed') + ' inside the forecast band.' : 'No days filled in yet.';
      var tone = !seen ? '' : inBand >= seen * 0.6 ? ' The forecast was close for most of these days.' : ' Life had more to say than the model expected, which is useful to know: something mattered that the adjusters did not capture.';
      var fill = pending ? '<button type="button" class="wk-btn wk-btn-main" data-fill="' + esc(p.start) + '">Fill in the days that have passed</button>' : '';
      return '<article class="wk-vs"><h3>Your plan for ' + esc(rangeLabel(p.start)) + '</h3><p class="wk-lead2">' + esc(head + tone) + (future ? ' ' + plural(future, 'day is', 'days are') + ' still to come.' : '') + '</p><ol class="wk-vs-list">' + cells + '</ol>' + fill +
        '<p class="wk-fine">A forecast is a guess built from simple rules. Being off does not mean you did anything wrong.</p></article>';
    }).join('');
  }
  function wireVersus() {
    $('vs-body').addEventListener('click', function (e) {
      var b = e.target.closest('[data-fill]'); if (!b) return;
      var s = parseYmd(b.getAttribute('data-fill')), end = addDays(s, 6); if (diffDays(end, today()) > 0) end = today();
      gotoEnd(end); $('capture').scrollIntoView({ behavior: still() ? 'auto' : 'smooth' });
      var h = $('capture-h'); if (h) h.focus({ preventScroll: true });
    });
  }
  function renderHello() {
    var box = $('wk-hello'), t = today(), g = gather(), msg = '', href = '';
    var plans = Object.keys(S.plans).sort().reverse().map(function (k) { return S.plans[k]; });
    for (var n = 0; n < plans.length && !msg; n++) {
      var p = plans[n], arrived = 0, filled = 0;
      for (var i = 0; i < 7; i++) { var d = addDays(parseYmd(p.start), i); if (diffDays(t, d) >= 0) { arrived++; if (g[ymd(d)]) filled++; } }
      if (arrived && filled < arrived) { msg = 'Your pinned forecast for ' + rangeLabel(p.start) + ' has days waiting. Fill them in to see how it went.'; href = '#versus'; }
      else if (arrived && filled === arrived) { msg = 'Your pinned forecast for ' + rangeLabel(p.start) + ' is ready to compare.'; href = '#versus'; }
    }
    if (!msg && hasContent(S.drafts[viewStart] || null)) { msg = 'Your week is a draft on this device. Save it when you are ready.'; href = '#capture'; }
    box.hidden = !msg;
    box.innerHTML = msg ? '<p>' + esc(msg) + ' <a href="' + href + '">Take me there</a></p>' : '';
  }

  /* ---------------------------------------------------------------- 5. saved weeks, compare, delete */
  var cmpSel = [];
  function weekFor(k) { return S.drafts[k] || S.weeks[k] || null; }
  function allWeekKeys() {
    var m = {}; Object.keys(S.weeks).forEach(function (k) { m[k] = 1; }); Object.keys(S.drafts).forEach(function (k) { if (hasContent(S.drafts[k])) m[k] = 1; });
    return Object.keys(m).sort().reverse();
  }
  function miniAlt(R) { return R.rows.map(function (r) { return r.wd + ' ' + (r.k ? lc(SKY[r.k].name) : 'not filled in'); }).join(', '); }
  function savedItemHTML(k) {
    var w = weekFor(k), R = analyze(w), sv = S.weeks[k], dr = S.drafts[k];
    var state = !sv ? 'Draft, not saved yet' : dr && comparable(dr) !== comparable(sv) ? 'Saved, with changes not saved yet' : 'Saved';
    var mini = R.rows.map(function (r) { return r.k ? ico(r.k, 'sm') : '<span class="wk-ico sm wk-ico-gap">&middot;</span>'; }).join('');
    return '<li class="wk-saved-item" data-start="' + k + '"><div class="wk-saved-top"><div><h3>' + esc(rangeLabel(k)) + '</h3><p class="wk-saved-s">' + esc((R.avg != null ? R.headline + '. ' : '') + state + '. ' + R.have.length + ' of 7 days filled in.') + '</p></div>' +
      '<div class="wk-mini" role="img" aria-label="' + esc(miniAlt(R)) + '">' + mini + '</div></div>' +
      '<div class="wk-saved-actions"><button type="button" class="wk-btn" data-a="open">' + (k === viewStart ? 'Shown above' : 'Open and edit') + '</button>' +
      '<label class="wk-cmp"><input type="checkbox" data-cmp="' + k + '"' + (cmpSel.indexOf(k) >= 0 ? ' checked' : '') + '> <span>Compare</span></label>' +
      '<button type="button" class="wk-btn wk-btn-danger" data-a="delete">Delete</button></div>' +
      '<details class="wk-keep"><summary>Copy, print or save as an image</summary>' + exportBarHTML(k) + '<div class="wk-card-out" aria-live="polite"></div></details></li>';
  }
  function renderSaved(rebuildCompare) {
    var keys = allWeekKeys(), box = $('saved-body');
    cmpSel = cmpSel.filter(function (k) { return keys.indexOf(k) >= 0; });
    if (!keys.length) {
      box.innerHTML = '<p class="wk-empty">No weeks yet. Save one above and it shows up here, ready to open, compare or export.</p>';
      $('saved-tools').hidden = true; $('cmp-body').innerHTML = ''; return;
    }
    // keep open details and any image previews while the list refreshes
    var open = qsa('.wk-saved-item details[open]', box).map(function (d) { return d.closest('.wk-saved-item').getAttribute('data-start'); });
    box.innerHTML = '<ul class="wk-saved">' + keys.map(savedItemHTML).join('') + '</ul>';
    open.forEach(function (k) { var d = qs('.wk-saved-item[data-start="' + k + '"] details', box); if (d) d.open = true; });
    $('saved-tools').hidden = false;
    renderCompare();
  }
  function avgOf(R, f) { var a = R.rows.filter(function (r) { return typeof r[f] === 'number'; }).map(function (r) { return r[f]; }); return a.length >= 2 ? mean(a) : null; }
  function renderCompare() {
    var box = $('cmp-body');
    if (cmpSel.length < 2) {
      box.innerHTML = cmpSel.length === 1 ? '<p class="wk-empty">One week picked. Tick &ldquo;Compare&rdquo; on a second week to see them side by side.</p>' : '<p class="wk-empty">Tick &ldquo;Compare&rdquo; on two weeks to see them side by side.</p>';
      return;
    }
    var ks = cmpSel.slice().sort(), A = weekFor(ks[0]), B = weekFor(ks[1]), RA = analyze(A), RB = analyze(B);
    var la = 'the week of ' + dshort(parseYmd(ks[0])), lb = 'the week of ' + dshort(parseYmd(ks[1]));
    function cell(r) { return r.k ? ico(r.k, 'sm') + '<span>' + esc(r.wds + ': ' + SKY[r.k].name) + '</span>' : '<span class="wk-vs-none">?</span><span>' + esc(r.wds + ': not filled in') + '</span>'; }
    var rows = '';
    for (var i = 0; i < 7; i++) rows += '<tr><th scope="row">Day ' + (i + 1) + '</th><td><span class="wk-cc">' + cell(RA.rows[i]) + '</span></td><td><span class="wk-cc">' + cell(RB.rows[i]) + '</span></td></tr>';
    var metrics = [['e', 'Energy'], ['s', 'Stress'], ['z', 'Sleep'], ['c', 'Connection']], mrows = '', notes = [];
    var ba = RA.avg, bb = RB.avg;
    mrows += '<tr><th scope="row">Sky (brightness out of 100)</th><td>' + (ba != null ? esc(round1(ba) + ', ' + lc(bandWord(ba))) : '-') + '</td><td>' + (bb != null ? esc(round1(bb) + ', ' + lc(bandWord(bb))) : '-') + '</td></tr>';
    if (ba != null && bb != null) {
      var dd = bb - ba;
      notes.push(Math.abs(dd) < 5 ? 'The skies were about equally bright in both weeks.' : 'Skies were ' + (dd > 0 ? 'brighter' : 'cloudier') + ' in ' + lb + ', by about ' + Math.round(Math.abs(dd)) + ' points on average.');
    }
    metrics.forEach(function (m) {
      var a = avgOf(RA, m[0]), b = avgOf(RB, m[0]);
      mrows += '<tr><th scope="row">' + m[1] + ' (average, 0 to 10)</th><td>' + (a != null ? round1(a) : '-') + '</td><td>' + (b != null ? round1(b) : '-') + '</td></tr>';
      if (a != null && b != null && Math.abs(b - a) >= 1) notes.push(m[1] + ' was ' + (b > a ? 'higher' : 'lower') + ' in ' + lb + ' (about ' + round1(Math.abs(b - a)) + ' points).');
    });
    var trows = '';
    TAGS.forEach(function (tg) {
      var a = RA.rows.filter(function (r) { return r.t.indexOf(tg.k) >= 0; }).length, b = RB.rows.filter(function (r) { return r.t.indexOf(tg.k) >= 0; }).length;
      if (!a && !b) return;
      trows += '<tr><th scope="row">' + esc(tg.n) + '</th><td>' + plural(a, 'day', 'days') + '</td><td>' + plural(b, 'day', 'days') + '</td></tr>';
      if (Math.abs(b - a) >= 2) notes.push(tg.n + ' showed up on ' + plural(b, 'day', 'days') + ' in ' + lb + ', against ' + a + ' in ' + la + '.');
    });
    box.innerHTML = '<h3 id="cmp-h" tabindex="-1">Comparing ' + esc(rangeLabel(ks[0])) + ' with ' + esc(rangeLabel(ks[1])) + '</h3>' +
      '<div class="wk-scroll"><table class="wk-cmp-t"><caption class="wk-sr">The two weeks, day by day</caption><thead><tr><th scope="col">Day</th><th scope="col">' + esc(dshort(parseYmd(ks[0]))) + ' week</th><th scope="col">' + esc(dshort(parseYmd(ks[1]))) + ' week</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="wk-scroll"><table class="wk-cmp-t"><caption class="wk-sr">Averages and what happened</caption><thead><tr><th scope="col">Measure</th><th scope="col">' + esc(dshort(parseYmd(ks[0]))) + ' week</th><th scope="col">' + esc(dshort(parseYmd(ks[1]))) + ' week</th></tr></thead><tbody>' + mrows + (trows ? '<tr class="sub"><th scope="rowgroup" colspan="3">What happened (days with each tag)</th></tr>' + trows : '') + '</tbody></table></div>' +
      (notes.length ? '<h4>What differs</h4><ul class="wk-bul">' + notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '<p>Nothing stands out as very different between these two weeks.</p>') +
      '<p class="wk-fine">These are differences in what you entered. They do not say what caused them.</p>';
  }
  function wireSaved() {
    var box = $('saved-body');
    box.addEventListener('click', function (e) {
      var item = e.target.closest('.wk-saved-item'); if (!item) return;
      var k = item.getAttribute('data-start'), a = e.target.closest('[data-a]');
      if (a && a.getAttribute('data-a') === 'open') {
        updateDraft(); persistNow(); loadWeek(k); renderAll(false);
        $('capture').scrollIntoView({ behavior: still() ? 'auto' : 'smooth' }); var h = $('capture-h'); if (h) h.focus({ preventScroll: true });
        announce('Opened ' + rangeLabel(k) + ' for editing.');
      } else if (a && a.getAttribute('data-a') === 'delete') {
        askConfirm(a, 'Delete ' + rangeLabel(k) + '? This removes it from this device and cannot be undone.', 'Yes, delete this week', function () {
          delete S.weeks[k]; delete S.drafts[k]; persistNow();
          if (viewStart === k) loadWeek(k);
          cmpSel = cmpSel.filter(function (x) { return x !== k; });
          renderAll(false); toast('Deleted.'); var h = $('saved-h'); if (h) h.focus({ preventScroll: true });
        });
      }
    });
    box.addEventListener('change', function (e) {
      var c = e.target.closest('[data-cmp]'); if (!c) return;
      var k = c.getAttribute('data-cmp');
      if (c.checked) { if (cmpSel.length >= 2) { c.checked = false; toast('Compare takes two weeks. Untick one first.'); return; } cmpSel.push(k); }
      else cmpSel = cmpSel.filter(function (x) { return x !== k; });
      renderCompare();
      if (cmpSel.length === 2) { var h = $('cmp-h'); if (h) { h.scrollIntoView({ block: 'nearest', behavior: still() ? 'auto' : 'smooth' }); } announce('Comparison ready below the list.'); }
    });
    wireExport(box);
    $('del-all').addEventListener('click', function () {
      var btn = this;
      askConfirm(btn, 'Delete every saved week, draft and pinned plan from this device? This cannot be undone.', 'Yes, delete everything', function () {
        try { localStorage.removeItem(KEY); } catch (e) {}
        S = load(); S.weeks = {}; S.drafts = {}; S.plans = {}; cmpSel = []; fc.built = false; fc.res = null; fc.undo = null;
        loadWeek(startForEnd(today())); renderAll(false); toast('Everything from this page was deleted from this device.');
        $('wk-prev').focus();
      });
    });
    $('dl-all').addEventListener('click', function () {
      var data = { note: 'Your week in weather, saved on this device. Brightness uses sunny 92, partly cloudy 75, cloudy 55, windy 50, foggy 42, rainy 35, stormy 15.', weeks: allWeekKeys().map(function (k) { return weekFor(k); }) };
      download(JSON.stringify(data, null, 2), 'my-weeks.json', 'application/json');
    });
  }
  function download(text, file, type) {
    try {
      var blob = new Blob([text], { type: type + ';charset=utf-8' }), u = URL.createObjectURL(blob), a = doc.createElement('a');
      a.href = u; a.download = file; doc.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
      toast('Downloaded ' + file + '.');
    } catch (e) { toast('Downloading is not available here.'); }
  }

  /* ---------------------------------------------------------------- 6. a weekly reminder (.ics, no account, nothing sent) */
  var BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  function icsText(t) { return String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function stamp(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; }
  function utcStamp(d) { return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z'; }
  function nextAt(dow, hm) {
    var now = new Date(), p = hm.split(':'), d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), +p[0], +p[1], 0);
    d.setDate(d.getDate() + ((dow - d.getDay() + 7) % 7)); if (d <= now) d.setDate(d.getDate() + 7); return d;
  }
  var R_TITLE = 'Your week in weather (5 minutes)', R_NOTE = 'A gentle five-minute look back at your week. Tap a weather for each day, then peek at next week\'s forecast.';
  function icsFile() {
    var st = nextAt(S.remind.dow, S.remind.hm), url = SITE + '/my-week.html';
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Spread Love and Acceptance//Your week in weather//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      'UID:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + '-week@spreadloveandacceptance.com', 'DTSTAMP:' + utcStamp(new Date()), 'DTSTART:' + stamp(st), 'DURATION:PT5M',
      'RRULE:FREQ=WEEKLY;BYDAY=' + BYDAY[S.remind.dow], 'SUMMARY:' + icsText(R_TITLE), 'DESCRIPTION:' + icsText(R_NOTE + ' ' + url), 'URL:' + url,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', 'DESCRIPTION:' + icsText(R_TITLE), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n') + '\r\n';
  }
  function googleHref() {
    var st = nextAt(S.remind.dow, S.remind.hm), en = new Date(st.getTime() + 5 * 60000);
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(R_TITLE) + '&dates=' + stamp(st) + '/' + stamp(en) +
      '&recur=' + encodeURIComponent('RRULE:FREQ=WEEKLY;BYDAY=' + BYDAY[S.remind.dow]) + '&details=' + encodeURIComponent(R_NOTE + '\n' + SITE + '/my-week.html');
  }
  function renderReminder() {
    var dsel = $('rm-dow'), tsel = $('rm-time');
    if (!dsel.options.length) {
      dsel.innerHTML = WD.map(function (n, i) { return '<option value="' + i + '">' + n + '</option>'; }).join('');
      var t = ''; for (var h = 6; h <= 22; h++) for (var m = 0; m < 60; m += 30) { var hm = pad(h) + ':' + pad(m), h12 = h % 12 || 12; t += '<option value="' + hm + '">' + h12 + ':' + pad(m) + ' ' + (h < 12 ? 'AM' : 'PM') + '</option>'; }
      tsel.innerHTML = t;
    }
    dsel.value = String(S.remind.dow); tsel.value = S.remind.hm;
    $('rm-google').href = googleHref();
  }
  function wireReminder() {
    $('rm-dow').addEventListener('change', function () { S.remind.dow = +this.value; persist(); renderReminder(); });
    $('rm-time').addEventListener('change', function () { S.remind.hm = this.value; persist(); renderReminder(); });
    $('rm-ics').addEventListener('click', function () { download(icsFile(), 'your-week-in-weather.ics', 'text/calendar'); });
  }

  /* ---------------------------------------------------------------- start up */
  function renderAll(first) {
    renderBar(); renderDays(); renderStatus(); renderRecap(); renderForecast(false); renderVersus(); renderSaved(); renderHello(); renderReminder();
  }
  function init() {
    if (!$('wk-days')) return;
    S = load();
    var main = qs('main.wk'); if (main && still()) main.classList.add('wk-still');
    loadWeek(startForEnd(today()));
    wireCapture(); wireForecast(); wireVersus(); wireSaved(); wireReminder(); wireExport($('rc-body'));
    renderAll(true);
    window.addEventListener('pagehide', function () { updateDraft(); persistNow(); });
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) { updateDraft(); persistNow(); } });
    window.addEventListener('storage', function (e) { if (e.key === KEY) { /* another tab changed it: the next action here will write ours */ } });
    doc.documentElement.setAttribute('data-wk-ready', '1');
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
