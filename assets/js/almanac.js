/* almanac.js — "Your weather almanac" on /quick-checks.html#almanac.
   A calm, on-device history: the weather readings you chose to save (tol-weather-v1, written by the
   check-in on that page) drawn as a small chart with a text list, a few tentative patterns once there
   are six or more readings, and the things you finished on other pages (read from the notes those
   pages already keep: tol-come-back-v1, tol-small-wins, tol-ten-log-v1, tol-wpf-keep:*, tol-selfpath-v1,
   tol-prog01-v1, tol-lemonade-stand-v2). It adds no storage key of its own.
   Download as .csv or .json, Print, and "Erase my almanac" (the saved readings only) with a confirm step.
   No streaks, no scores for the person, nothing about gaps. Nothing is sent anywhere.
   Used by the page's own script: window.TOLAlmanac.draw() after a save, and on load. */
(function () {
  'use strict';
  var KEY = 'tol-weather-v1';
  var doc = document;
  function $(id) { return doc.getElementById(id); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function json(k) { try { return JSON.parse(lsGet(k) || 'null'); } catch (e) { return null; } }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromKey(k) { var p = String(k || '').split('-'); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : null; }
  function nice(k, withYear) {
    var d = fromKey(k); if (!d) return k;
    var o = { month: 'short', day: 'numeric' }; if (withYear) o.year = 'numeric';
    try { return d.toLocaleDateString('en-US', o); } catch (e) { return k; }
  }
  function niceWeekday(k) { var d = fromKey(k); try { return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); } catch (e) { return k; } }
  function showNums() { var c = $('show-nums'); return !!(c && c.checked); }

  var SKY = {
    clear: { name: 'Clear', sub: 'calm and connected', ico: '☀', row: 0 },
    gusty: { name: 'Gusty', sub: 'revved up', ico: '🌬', row: 1 },
    fog: { name: 'Fogged in', sub: 'running on empty', ico: '🌫', row: 2 }
  };
  var SLEEP = { bad: 'barely slept', short: 'a short night', ok: 'about enough', good: 'properly rested' };
  var LOAD = { light: 'light', building: 'building', heavy: 'heavy' };
  var PEOPLE = { none: 'barely any', some: 'a normal amount', lots: 'a lot', nonstop: 'nonstop' };
  var REL = { partner: 'a partner', family: 'family', coparent: 'a co-parent', roommates: 'roommates', coworkers: 'coworkers', care: 'someone I care for', friends: 'friends', solo: 'mostly on my own' };
  var BODY = { hungry: 'hungry', thirsty: 'thirsty', pain: 'in pain or unwell', still: 'still all day', noise: 'too much noise or light', caffeine: 'running on caffeine', screens: 'screens since waking' };
  var FRONT = { work: 'Work', money: 'Money', kids: 'Kids or caring', health: 'Health', family: 'Family', home: 'The house', convo: 'One conversation', unnamed: 'Something you couldn’t name' };
  var NEED = { space: 'space', food: 'food or water', sleep: 'rest', move: 'to move', heard: 'to be heard', plan: 'a plan', company: 'company', quiet: 'quiet', help: 'someone to take something off you' };
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function room(i) { i = i || 0; return i < 45 ? 'lots of room' : i < 65 ? 'some room' : 'very little room'; }

  /* ------------------------------------------------------------ the readings */
  function readings() {
    var a = json(KEY); if (!Array.isArray(a)) return [];
    var by = {}; a.forEach(function (e) { if (e && e.d && SKY[e.sky]) by[e.d] = e; });
    return Object.keys(by).sort().map(function (k) { return by[k]; });
  }

  /* ------------------------------------------------------------ things finished, from other pages' own notes */
  var BOOK = {
    '/book/self-1-then.html': 'Where you came from', '/book/self-2-now.html': 'Who you are today', '/book/self-3-next.html': 'Who you are becoming',
    '/book/preface.html': 'The work nobody sees', '/book/chapter-1.html': 'Why we get out of tune', '/book/chapter-2.html': 'Is the split working?',
    '/book/chapter-3.html': 'Full tanks and different angles', '/book/chapter-4.html': 'Two kinds of fair', '/book/chapter-5.html': 'The monthly look-back'
  };
  var TOOLS = {
    '/signal-translator.html': 'the Signal Translator', '/conversation-reader.html': 'the Conversation Reader', '/carrier-wave-decoder.html': 'the Carrier Wave Decoder',
    '/lemonade-stand.html': 'the Lemonade Stand', '/quick-checks.html': 'Today’s Weather', '/wavelength.html': 'Wavelength', '/wiring-card.html': 'your Wiring Card'
  };
  var SHEETS = {
    'WP-01': 'Who did what', 'WP-02': 'How much are you carrying?', 'WP-03': 'One owner per job', 'WP-04': 'What keeps coming back?',
    'WP-09': 'Say it so it lands', 'WP-11': 'The Calm-Down Kit', 'WP-13': 'The 90-second daily check-in', suite: 'The worksheet set', fullpath: 'The full path'
  };
  function tsKey(ts) { var d = new Date(+ts); return isNaN(d) ? '' : dayKey(d); }
  function prettyPath(u) { var s = String(u).replace(/^.*\//, '').replace(/\.html$/, '').replace(/-/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); }
  function finished() {
    var out = [], undated = [];
    var cb = json('tol-come-back-v1');
    if (cb && typeof cb === 'object') {
      Object.keys(cb.read || {}).forEach(function (u) { var d = tsKey(cb.read[u]); if (d) out.push({ d: d, what: 'Read to the end: ' + (BOOK[u] || prettyPath(u)) }); });
      Object.keys(cb.did || {}).forEach(function (u) { var d = tsKey(cb.did[u]); if (d) out.push({ d: d, what: 'Got a result from ' + (TOOLS[u] || prettyPath(u)) }); });
    }
    var sw = json('tol-small-wins');
    if (Array.isArray(sw)) sw.forEach(function (w) { if (w && typeof w.t === 'string' && w.ts) { var d = tsKey(w.ts); if (d) out.push({ d: d, what: 'A small win: ' + w.t.slice(0, 200) }); } });
    var ten = json('tol-ten-log-v1');
    if (Array.isArray(ten)) ten.forEach(function (it) {
      if (!it || typeof it.t !== 'string') return;
      var now = new Date(), p = new Date(String(it.d || '') + ', ' + now.getFullYear());
      if (isNaN(p)) { undated.push({ what: 'Start in 10 minutes: ' + it.t.slice(0, 200) }); return; }
      if (p > now) p.setFullYear(p.getFullYear() - 1);
      out.push({ d: dayKey(p), what: 'Start in 10 minutes: ' + it.t.slice(0, 200) });
    });
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i); if (!k || k.indexOf('tol-wpf-keep:') !== 0) continue;
        var v = json(k), code = k.slice('tol-wpf-keep:'.length).split(':')[0], name = SHEETS[code] || (v && v.workpaper && SHEETS[v.workpaper]) || 'A worksheet';
        var when = v && (v.saved || v.at || v.t), d = when ? (typeof when === 'number' ? tsKey(when) : String(when).slice(0, 10)) : '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) out.push({ d: d, what: 'Worked on, and kept a copy: ' + name });
        else undated.push({ what: 'Worked on, and kept a copy: ' + name });
      }
    } catch (e) {}
    var sp = json('tol-selfpath-v1');
    if (sp && Array.isArray(sp.done) && sp.done.length) {
      var t = 'Self path: ' + sp.done.length + ' of 6 steps marked done';
      if (/^\d{4}-\d{2}-\d{2}$/.test(sp.at || '')) out.push({ d: sp.at, what: t }); else undated.push({ what: t });
    }
    var pg = json('tol-prog01-v1');
    if (pg && pg.on && Array.isArray(pg.done) && pg.done.length) {
      var wk = pg.done.slice().sort(function (a, b) { return a - b; });
      undated.push({ what: 'Six gentle weeks: week' + (wk.length > 1 ? 's ' : ' ') + wk.join(', ') + ' ticked' });
    }
    var ls = json('tol-lemonade-stand-v2');
    if (ls && !ls.example && Array.isArray(ls.weeks)) ls.weeks.forEach(function (w) { if (w && /^\d{4}-\d{2}-\d{2}$/.test(w.d || '')) out.push({ d: w.d, what: 'Lemonade Stand: saved a week' }); });
    out.sort(function (a, b) { return a.d < b.d ? 1 : a.d > b.d ? -1 : 0; });
    return { dated: out, undated: undated };
  }

  /* ------------------------------------------------------------ patterns: tentative, counted, only from what was recorded */
  function patterns(a) {
    var c = [], N = a.length;
    function share(list, fn) { var k = list.filter(fn).length; return { k: k, n: list.length, r: list.length ? k / list.length : 0 }; }
    function rough(e) { return e.sky !== 'clear'; }
    function shortNight(e) { return e.sleep === 'bad' || e.sleep === 'short'; }
    var withSleep = a.filter(function (e) { return SLEEP[e.sleep]; });
    var baseShort = share(withSleep, shortNight);
    ['gusty', 'fog'].forEach(function (s) {
      var x = share(withSleep.filter(function (e) { return e.sky === s; }), shortNight);
      var clearOnes = share(withSleep.filter(function (e) { return e.sky === 'clear'; }), shortNight);
      if (x.n >= 3 && x.k >= 3 && x.r >= 0.6 && (clearOnes.n < 2 || x.r - clearOnes.r >= 0.25))
        c.push({ s: (x.r - baseShort.r) * Math.sqrt(x.n) + 0.3, t: 'Your ' + (s === 'fog' ? 'fogged-in' : 'gusty') + ' days often came after a short night (' + x.k + ' of ' + x.n + ' times).' });
    });
    var rested = withSleep.filter(function (e) { return e.sleep === 'ok' || e.sleep === 'good'; });
    var baseClear = share(a, function (e) { return e.sky === 'clear'; });
    var rc = share(rested, function (e) { return e.sky === 'clear'; });
    if (rc.n >= 3 && rc.k >= 3 && rc.r >= 0.6 && rc.r - baseClear.r >= 0.15)
      c.push({ s: (rc.r - baseClear.r) * Math.sqrt(rc.n), t: 'After a night of enough sleep, the sky was more often clear (' + rc.k + ' of ' + rc.n + ' times).' });
    var baseRough = share(a, rough);
    var ppl = share(a.filter(function (e) { return e.people === 'lots' || e.people === 'nonstop'; }), rough);
    if (ppl.n >= 3 && ppl.k >= 3 && ppl.r >= 0.6 && ppl.r - baseRough.r >= 0.15)
      c.push({ s: (ppl.r - baseRough.r) * Math.sqrt(ppl.n), t: 'Days with a lot of time around people were often gusty or fogged in (' + ppl.k + ' of ' + ppl.n + ' times). That may be about how much a day asks, not about you.' });
    var hv = share(a.filter(function (e) { return e.load === 'heavy'; }), rough);
    if (hv.n >= 3 && hv.k >= 3 && hv.r >= 0.6 && hv.r - baseRough.r >= 0.15)
      c.push({ s: (hv.r - baseRough.r) * Math.sqrt(hv.n), t: 'When you were already carrying a heavy load, the sky was often gusty or fogged in (' + hv.k + ' of ' + hv.n + ' times).' });
    var byDay = {};
    a.forEach(function (e) { var d = fromKey(e.d); if (d) (byDay[d.getDay()] = byDay[d.getDay()] || []).push(e); });
    Object.keys(byDay).forEach(function (w) {
      var x = share(byDay[w], rough);
      if (x.n >= 3 && x.k >= 3 && x.r >= 0.75 && x.r - baseRough.r >= 0.2)
        c.push({ s: (x.r - baseRough.r) * Math.sqrt(x.n) - 0.1, t: 'Your ' + DAYS[w] + ' readings were often gusty or fogged in (' + x.k + ' of ' + x.n + '). Maybe something about that day is worth a look.' });
    });
    var fc = {}; a.forEach(function (e) { (e.front || []).forEach(function (f) { if (FRONT[f]) fc[f] = (fc[f] || 0) + 1; }); });
    var ft = Object.keys(fc).sort(function (x, y) { return fc[y] - fc[x]; })[0];
    if (ft && fc[ft] >= 3 && fc[ft] / N >= 0.3)
      c.push({ s: fc[ft] / N - 0.1, t: FRONT[ft] + ' came up as something blowing in on ' + fc[ft] + ' of your ' + N + ' readings. A worry that keeps returning is often about the setup, not a person: <a href="/workpapers/wp-04-what-keeps-coming-back.html">What keeps coming back?</a> is made for that.', html: true });
    var nc = {}; a.forEach(function (e) { (e.need || []).forEach(function (f) { if (NEED[f]) nc[f] = (nc[f] || 0) + 1; }); });
    var nt = Object.keys(nc).sort(function (x, y) { return nc[y] - nc[x]; })[0];
    if (nt && nc[nt] >= 3 && nc[nt] / N >= 0.3)
      c.push({ s: nc[nt] / N - 0.2, t: 'What you said would help most often was ' + NEED[nt] + ' (' + nc[nt] + ' of ' + N + ' readings). If the people around you don’t know that yet, a <a href="/wiring-card.html">Wiring Card</a> can say it once for you.', html: true });
    return c.sort(function (x, y) { return y.s - x.s; }).slice(0, 3);
  }

  /* ------------------------------------------------------------ the last seven days, in words */
  function lastWeek(a) {
    var now = new Date(), from = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
    var wk = a.filter(function (e) { return e.d >= from; });
    if (!wk.length) return 'No readings in the last seven days. That’s fine: pick up any day you like.';
    var c = { clear: 0, gusty: 0, fog: 0 }; wk.forEach(function (e) { c[e.sky]++; });
    var bits = []; if (c.clear) bits.push(c.clear + ' clear'); if (c.gusty) bits.push(c.gusty + ' gusty'); if (c.fog) bits.push(c.fog + ' fogged in');
    var t = 'Last seven days: ' + wk.length + ' reading' + (wk.length === 1 ? '' : 's') + ' (' + bits.join(', ') + ').';
    if (wk.length >= 3) {
      var h = Math.floor(wk.length / 2), avg = function (x) { return Math.round(x.reduce(function (s, e) { return s + (e.i || 0); }, 0) / x.length); };
      var f = avg(wk.slice(0, h)), s = avg(wk.slice(wk.length - h));
      var nums = showNums() ? ' (tally about ' + f + ' to ' + s + ' of 100, higher means heavier)' : '';
      if (s - f >= 8) t += ' The days have felt heavier lately' + nums + '. Lightening one thing might help.';
      else if (f - s >= 8) t += ' The days have felt lighter lately' + nums + '. Whatever changed may be worth keeping.';
      else t += ' Fairly steady, mostly ' + room(avg(wk)) + (showNums() ? ' (tally around ' + avg(wk) + ' of 100)' : '') + '.';
    }
    return t;
  }

  /* ------------------------------------------------------------ the chart: plain SVG, one column per saved reading */
  var NS = 'http://www.w3.org/2000/svg';
  function sv(tag, attrs, text) { var n = doc.createElementNS(NS, tag); for (var k in attrs) n.setAttribute(k, attrs[k]); if (text != null) n.textContent = text; return n; }
  function chart(a) {
    var host = $('al-chart'); if (!host) return;
    host.innerHTML = '';
    var W = Math.max(260, Math.min(720, Math.floor(host.clientWidth || 320))), LAB = 86, R = 10;
    var plotW = W - LAB - R, maxN = Math.max(8, Math.min(60, Math.floor(plotW / 10)));
    var show = a.slice(-maxN), n = show.length, step = plotW / Math.max(n, 1), rowH = 30, top = 6, H = top + rowH * 3 + 4;
    var rad = Math.max(3.5, Math.min(8, step * 0.36));
    var counts = { clear: 0, gusty: 0, fog: 0 }; show.forEach(function (e) { counts[e.sky]++; });
    var svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', 'aria-labelledby': 'al-svg-t al-svg-d', focusable: 'false' });
    svg.appendChild(sv('title', { id: 'al-svg-t' }, 'Your weather, one mark per saved reading'));
    svg.appendChild(sv('desc', { id: 'al-svg-d' }, n + ' reading' + (n === 1 ? '' : 's') + ' from ' + nice(show[0].d, true) + ' to ' + nice(show[n - 1].d, true) + ': ' +
      counts.clear + ' clear, ' + counts.gusty + ' gusty, ' + counts.fog + ' fogged in. Every reading is also in the list below.'));
    ['clear', 'gusty', 'fog'].forEach(function (s) {
      var y = top + SKY[s].row * rowH + rowH / 2;
      svg.appendChild(sv('line', { x1: LAB - 4, x2: W - R + 4, y1: y, y2: y, class: 'al-grid' }));
      svg.appendChild(sv('text', { x: 0, y: y + 4, class: 'al-lab' }, SKY[s].name));
    });
    var pts = [];
    show.forEach(function (e, i) {
      var x = LAB + step * i + step / 2, y = top + SKY[e.sky].row * rowH + rowH / 2;
      pts.push(x.toFixed(1) + ',' + y.toFixed(1));
    });
    if (n > 1) svg.appendChild(sv('polyline', { points: pts.join(' '), class: 'al-path' }));
    show.forEach(function (e, i) {
      var p = pts[i].split(','), g = sv('g', {});
      g.appendChild(sv('title', {}, niceWeekday(e.d) + ': ' + SKY[e.sky].name + ' (' + SKY[e.sky].sub + '), ' + room(e.i)));
      if (e.sky === 'gusty') {
        var x = +p[0], y = +p[1], q = rad * 1.15;
        g.appendChild(sv('path', { d: 'M' + x + ' ' + (y - q) + 'L' + (x + q) + ' ' + y + 'L' + x + ' ' + (y + q) + 'L' + (x - q) + ' ' + y + 'Z', class: 'al-dot al-gusty' }));
      } else if (e.sky === 'fog') {
        g.appendChild(sv('rect', { x: +p[0] - rad * 0.9, y: +p[1] - rad * 0.9, width: rad * 1.8, height: rad * 1.8, rx: 1.5, class: 'al-dot al-fog' }));
      } else {
        g.appendChild(sv('circle', { cx: p[0], cy: p[1], r: rad, class: 'al-dot al-clear' }));
      }
      svg.appendChild(g);
    });
    host.appendChild(svg);
    var ax = $('al-axis');
    if (ax) {
      ax.style.paddingLeft = LAB + 'px'; ax.style.width = W + 'px';
      ax.innerHTML = '<span></span><span></span>';
      ax.firstChild.textContent = nice(show[0].d, show[0].d.slice(0, 4) !== dayKey(new Date()).slice(0, 4));
      ax.lastChild.textContent = show[n - 1].d === dayKey(new Date()) ? 'Today' : nice(show[n - 1].d);
      ax.hidden = n < 2;
    }
    $('al-cap').textContent = (a.length > n ? 'Your last ' + n + ' readings' : n === 1 ? 'Your one reading so far' : 'Your ' + n + ' readings') +
      (n > 1 ? ', oldest on the left. One mark per reading; days without one are simply left out.' : '. More marks appear as you save more.');
  }

  /* ------------------------------------------------------------ the list of readings (the chart's text version) */
  var allRows = false;
  function table(a) {
    var tb = $('al-rows'); if (!tb) return;
    var rows = a.slice().reverse(), LIMIT = 14, shown = allRows ? rows : rows.slice(0, LIMIT);
    tb.innerHTML = shown.map(function (e) {
      var extra = [];
      if (LOAD[e.load]) extra.push('pressure ' + LOAD[e.load]);
      if (PEOPLE[e.people]) extra.push('people: ' + PEOPLE[e.people]);
      (e.front || []).forEach(function (f) { if (FRONT[f]) extra.push(FRONT[f].toLowerCase()); });
      return '<tr><th scope="row">' + esc(niceWeekday(e.d)) + '</th><td>' + SKY[e.sky].ico + ' ' + esc(SKY[e.sky].name) + '</td><td>' + esc(room(e.i)) +
        (showNums() ? ' <span class="al-num">(' + (e.i || 0) + ')</span>' : '') + '</td><td>' + esc(SLEEP[e.sleep] || '—') + '</td><td class="al-more">' + esc(extra.join(', ') || '—') + '</td></tr>';
    }).join('');
    var more = $('al-more');
    more.hidden = rows.length <= LIMIT;
    more.textContent = allRows ? 'Show the newest ' + LIMIT + ' only' : 'Show all ' + rows.length + ' readings';
    more.setAttribute('aria-expanded', String(allRows));
  }

  /* ------------------------------------------------------------ draw everything */
  function draw() {
    var box = $('almanac'); if (!box) return;
    var a = readings(), f = finished(), anyDone = f.dated.length + f.undated.length > 0;
    box.hidden = !a.length && !anyDone;
    if (box.hidden) return;
    $('al-weather').hidden = !a.length;
    $('al-empty').hidden = !!a.length;
    if (a.length) {
      $('al-intro').textContent = a.length + ' reading' + (a.length === 1 ? '' : 's') + ' saved' + (a.length > 1 ? ', from ' + nice(a[0].d, true) + ' to ' + nice(a[a.length - 1].d, true) : '') +
        '. Kept in this browser only; nothing is uploaded. Save on any day you like: gaps don’t count against anything.';
      chart(a); table(a);
      $('trend').textContent = lastWeek(a);
      var p = $('pattern'); p.innerHTML = '';
      if (a.length < 6) {
        p.innerHTML = '<p class="al-soft"></p>';
        p.firstChild.textContent = 'After about six readings, a few gentle patterns may show up here, if there are any. ' + (6 - a.length) + ' more to go, on whatever days suit you.';
      } else {
        var ps = patterns(a);
        if (!ps.length) { p.innerHTML = '<p class="al-soft">No clear patterns in your readings so far. That’s common, and it’s fine: weather is allowed to just be weather.</p>'; }
        else {
          var ul = doc.createElement('ul'); ul.className = 'al-pats tol-plain';
          ps.forEach(function (x) { var li = doc.createElement('li'); if (x.html) li.innerHTML = x.t; else li.textContent = x.t; ul.appendChild(li); });
          p.appendChild(ul);
          var note = doc.createElement('p'); note.className = 'al-soft';
          note.textContent = 'Maybe, maybe not: these are only counts from what you saved, and a few readings can line up by chance. Not a diagnosis, and not a verdict on anyone. Keep what fits.';
          p.appendChild(note);
        }
      }
    }
    var dl = $('al-done'), du = $('al-undated');
    dl.innerHTML = f.dated.slice(0, allDone ? 500 : 10).map(function (x) { return '<li><span class="al-when">' + esc(nice(x.d)) + '</span> ' + esc(x.what) + '</li>'; }).join('');
    dl.hidden = !f.dated.length;
    du.innerHTML = f.undated.map(function (x) { return '<li>' + esc(x.what) + '</li>'; }).join('');
    du.hidden = !f.undated.length;
    $('al-undated-h').hidden = !f.undated.length;
    var dm = $('al-done-more'); dm.hidden = f.dated.length <= 10; dm.textContent = allDone ? 'Show the newest 10 only' : 'Show all ' + f.dated.length; dm.setAttribute('aria-expanded', String(allDone));
    $('al-done-none').hidden = anyDone;
    $('al-export').hidden = false;
  }
  var allDone = false;

  /* ------------------------------------------------------------ export */
  function stamp() { return dayKey(new Date()); }
  function cell(v) { v = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(v)) v = '\'' + v; return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function csv() {
    var head = ['date', 'kind', 'sky', 'room_in_the_day', 'day_tally_0_100_higher_is_heavier', 'sleep', 'pressure', 'people_time', 'mostly_around', 'ground', 'blowing_in', 'would_help', 'what'];
    var lines = [head.join(',')];
    readings().forEach(function (e) {
      lines.push([e.d, 'weather', SKY[e.sky].name, room(e.i), e.i == null ? '' : e.i, SLEEP[e.sleep] || '', LOAD[e.load] || '', PEOPLE[e.people] || '', REL[e.rel] || '',
        (e.body || []).map(function (k) { return BODY[k] || k; }).join('; '), (e.front || []).map(function (k) { return (FRONT[k] || k).toLowerCase(); }).join('; '),
        (e.need || []).map(function (k) { return NEED[k] || k; }).join('; '), ''].map(cell).join(','));
    });
    var f = finished();
    f.dated.slice().reverse().forEach(function (x) { lines.push([x.d, 'finished', '', '', '', '', '', '', '', '', '', '', x.what].map(cell).join(',')); });
    f.undated.forEach(function (x) { lines.push(['', 'finished', '', '', '', '', '', '', '', '', '', '', x.what].map(cell).join(',')); });
    return '﻿' + lines.join('\r\n') + '\r\n';
  }
  function jsonOut() {
    var f = finished();
    return JSON.stringify({
      format: 'tol-weather-almanac', version: 1, exported: new Date().toISOString(),
      note: 'Your weather almanac from Spread Love & Acceptance, made on your device. "i" is the day tally from 0 to 100 (higher means a heavier day); it is not a score of you.',
      readings: readings(), finished: f.dated.concat(f.undated)
    }, null, 2);
  }
  function download(name, type, text) {
    try {
      var b = new Blob([text], { type: type }), u = URL.createObjectURL(b), a = doc.createElement('a');
      a.href = u; a.download = name; a.rel = 'noopener'; doc.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
      return true;
    } catch (e) { return false; }
  }
  function say(t) { var m = $('al-msg'); if (!m) return; m.textContent = ''; setTimeout(function () { m.textContent = t; }, 30); }

  /* ------------------------------------------------------------ print just the almanac */
  var printOpened = [];
  function beforePrint() {
    if (!doc.documentElement.classList.contains('al-print')) return;
    allRows = true; allDone = true; draw();
    printOpened = Array.prototype.filter.call(doc.querySelectorAll('#almanac details'), function (d) { return !d.open; });
    printOpened.forEach(function (d) { d.open = true; });
  }
  function afterPrint() {
    if (!doc.documentElement.classList.contains('al-print')) return;
    doc.documentElement.classList.remove('al-print');
    printOpened.forEach(function (d) { d.open = false; }); printOpened = [];
    allRows = false; allDone = false; draw();
  }
  window.addEventListener('beforeprint', beforePrint);
  window.addEventListener('afterprint', afterPrint);

  /* ------------------------------------------------------------ erase (the saved readings only), with a confirm step */
  function erase() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    // the flowers weather saves planted in the Night Garden go too, so nothing from the readings is left behind
    try {
      var g = json('tol-garden-gifts');
      if (g && g.from && g.from.weather) {
        g.count = Math.max(0, (g.count || 0) - g.from.weather); delete g.from.weather;
        if (!g.count && !Object.keys(g.from).length) localStorage.removeItem('tol-garden-gifts'); else localStorage.setItem('tol-garden-gifts', JSON.stringify(g));
      }
    } catch (e) {}
  }

  function wire() {
    var box = $('almanac'); if (!box || box.getAttribute('data-wired')) return;
    box.setAttribute('data-wired', '1');
    $('al-more').addEventListener('click', function () { allRows = !allRows; table(readings()); });
    $('al-done-more').addEventListener('click', function () { allDone = !allDone; draw(); });
    $('al-csv').addEventListener('click', function () { say(download('weather-almanac-' + stamp() + '.csv', 'text/csv;charset=utf-8', csv()) ? 'Downloaded a .csv file. It went only to this device, wherever your downloads go.' : 'Downloading isn’t available in this browser.'); });
    $('al-json').addEventListener('click', function () { say(download('weather-almanac-' + stamp() + '.json', 'application/json', jsonOut()) ? 'Downloaded a .json file. It went only to this device, wherever your downloads go.' : 'Downloading isn’t available in this browser.'); });
    $('al-print').addEventListener('click', function () { doc.documentElement.classList.add('al-print'); beforePrint(); window.print(); setTimeout(afterPrint, 500); });
    var ask = $('al-confirm');
    $('erase').addEventListener('click', function () { ask.hidden = false; $('al-yes').focus(); });
    $('al-no').addEventListener('click', function () { ask.hidden = true; $('erase').focus(); say('Kept. Nothing was erased.'); });
    $('al-yes').addEventListener('click', function () {
      erase(); ask.hidden = true; draw();
      var st = $('fc-status'); if (st) st.textContent = 'Your saved weather readings, and the flowers they planted, were erased from this browser.';
      if (box.hidden) { var first = doc.querySelector('[data-sky]'); if (first) first.focus(); }
      else { say('Your saved weather readings were erased from this browser. The things-finished list comes from other pages’ own notes; you can erase those on What’s stored on this device.'); $('erase').focus(); }
      doc.dispatchEvent(new CustomEvent('tol-almanac-erased'));
    });
    var rt = null, lastW = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rt); rt = setTimeout(function () { var h = $('al-chart'); if (!h || box.hidden) return; var w = h.clientWidth; if (Math.abs(w - lastW) > 8) { lastW = w; var a = readings(); if (a.length) chart(a); } }, 200);
    });
  }

  window.TOLAlmanac = { draw: function () { wire(); draw(); }, readings: readings, finished: finished, patterns: patterns };
})();
