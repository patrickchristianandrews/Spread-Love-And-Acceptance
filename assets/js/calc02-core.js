/*
  calc02-core.js — CALC-02, "Look back over 30 days" (the 30-Day Look-Back).
  The one place the CALC-02 arithmetic lives. Loaded by:
    /look-back-30-days.html                                  (the full look-back, four weeks)
    /workpapers/calculators/look-back-30-days-quick.html     (the quick look-back, then and now)
  Needs /assets/js/calc01-core.js first: balance, ownership, the load bands and the setup score are
  CALC-01's own functions, so the two calculators always agree.

  What it measures (the four things week four of the 6-week program asks about):
    hours      who did what: each person's hours that week (WP-01, Who did what)
    rescues    last-minute rescues that week: a job caught at the last minute, or one that slipped
    loads      each person's own load score, 0 to 1, higher = heavier (WP-02, How much are you carrying?)
    jobs       jobs with an owner, out of the jobs on the list (WP-03, One owner per job)
  A week can also hold scores instead of raw entries (wbScore, ocScore, asScore), the way the
  fair-split calculator's trend log keeps them.

  The rule (a rule of thumb, not a tested model):
    start = the average of the weeks filled in near the start (weeks 1 and 2)
    end   = the average of the weeks filled in near the end (weeks 3 and 4)
    a measure "shifted" when end − start is at least: 0.10 for balance, ownership and load,
    or 1 a week for rescues. Smaller changes are read as "didn't shift".
    Running imbalance: for each person, hours done minus their share of everyone's hours,
    added up week by week. "Hours to change hands" = half the sum of those gaps (CALC-01's "moved").
    One next step: something that moved the wrong way comes first (the biggest move); otherwise the
    first of these still worth a look at the end: ownership under 0.70, balance under 0.70,
    2 or more rescues a week, anyone's load at 0.60 or more.

  Reading this device (read-only; nothing here ever writes, and nothing is sent anywhere):
    tol-calc01-full-v2   the long fair-split calculator's kept entries and trend log (names, weekly scores)
    tol-wpf-keep:suite   the Workpaper Suite draft (Who did what, How much are you carrying?, the daily check-in)
    tol-wpf-keep:WP-01*, tol-wpf-keep:WP-02*, tol-wpf-keep:WP-13*   single worksheet drafts
    tol-jobs-log-v1      the jobs the weekly check-in card was told slipped (job names and the week only)
    tol-weather-v1       Today's Weather check-ins this person chose to save (their own days)
  Each is read only when it exists, and only after someone presses the button that says so.
*/
(function (global) {
  'use strict';
  var C = global.TOLCalc01;
  if (!C) return;

  var SHIFT = { wb: 0.10, oc: 0.10, as: 0.10, rescues: 1 };
  var WATCH = { wb: 0.70, oc: 0.70, rescues: 2, load: 0.60 };
  var CODES = 'ABCDEFGH';
  var DAY = 86400000;
  var num = C.num, f2 = C.f2, f1 = C.f1;

  function avg(a) { var v = a.filter(function (x) { return x !== null && x !== undefined && !isNaN(x); }); return v.length ? v.reduce(function (s, x) { return s + x; }, 0) / v.length : null; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromKey(k) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(k || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function daysBetween(a, b) { return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / DAY); }
  function nice(d) { try { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch (e) { return dayKey(d); } }
  function fold(s) { return String(s || '').trim().toLowerCase(); }

  /* ---------- the four weeks ---------- */
  // The look-back ends on `end` (a Date, default today) and covers 30 days: week 1 is the first
  // 10 days, then three weeks of 7. Returns [{ i, from, to, label }].
  function slots(end) {
    var e = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate()) : new Date();
    e = new Date(e.getFullYear(), e.getMonth(), e.getDate());
    var spans = [[30, 21], [20, 14], [13, 7], [6, 0]];
    return spans.map(function (s, i) {
      var from = addDays(e, -s[0]), to = addDays(e, -s[1]);
      return { i: i, from: from, to: to, label: 'Week ' + (i + 1), dates: nice(from) + ' – ' + nice(to) };
    });
  }
  // Which of the four weeks a date falls in (0 to 3), or -1. A "week beginning" date is read at
  // its middle (3 days on), so a week that started 30 days ago still lands in week 1.
  function slotOf(dateStr, end, isWeekStart) {
    var d = fromKey(dateStr); if (!d) return -1;
    var e = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate()) : new Date();
    if (isWeekStart) { d = addDays(d, 3); if (daysBetween(d, e) < 0) d = e; }
    var back = daysBetween(d, e);
    if (back < 0 || back > 30) return -1;
    return back <= 6 ? 3 : back <= 13 ? 2 : back <= 20 ? 1 : 0;
  }

  /* ---------- one week ---------- */
  function blankWeek(n) {
    var e = []; for (var i = 0; i < n; i++) e.push('');
    return { hours: e.slice(), rescues: '', loads: e.slice(), jobsTotal: '', jobsOwned: '', wbScore: '', ocScore: '', asScore: '' };
  }
  function fitWeek(w, n) {
    w = w || blankWeek(n);
    ['hours', 'loads'].forEach(function (k) { var a = (w[k] || []).slice(0, n); while (a.length < n) a.push(''); w[k] = a; });
    ['rescues', 'jobsTotal', 'jobsOwned', 'wbScore', 'ocScore', 'asScore'].forEach(function (k) { if (w[k] === undefined || w[k] === null) w[k] = ''; });
    return w;
  }
  function blankish(v) { return v === '' || v === null || v === undefined; }
  function inRange01(v) { var x = num(v); return x !== null && x >= 0 && x <= 1 ? x : null; }

  // Reads one week. targets: null for an even split, or percentages adding up to 100.
  // Returns { wb, bal, oc, own, as, loads[], rescues, hasHours, problems[] } (null = no value).
  function readWeek(w, n, targets) {
    w = fitWeek(w, n);
    var r = { wb: null, bal: null, oc: null, own: null, as: null, loads: [], rescues: null, hasHours: false, problems: [], filled: false };
    // hours
    var hp = [];
    w.hours.forEach(function (x, i) { var m = C.hoursProblem(x); if (m) hp.push({ i: i, msg: m }); });
    var any = w.hours.some(function (x) { var v = num(x); return v !== null && v > 0; });
    if (hp.length) r.problems.push({ key: 'hours', list: hp });
    else if (any) {
      var b = C.balance(w.hours, targets || null);
      if (b.value !== null) { r.wb = b.value; r.bal = b; r.hasHours = true; }
      else if (b.error) r.problems.push({ key: 'hours', msg: b.error });
    }
    if (r.wb === null && !blankish(w.wbScore)) { var ws = inRange01(w.wbScore); if (ws === null) r.problems.push({ key: 'wbScore', msg: 'A balance score runs from 0 to 1.' }); else r.wb = ws; }
    // rescues
    if (!blankish(w.rescues)) {
      var rc = num(w.rescues);
      if (rc === null || rc < 0 || Math.floor(rc) !== rc) r.problems.push({ key: 'rescues', msg: 'Use a whole number of rescues (0 is fine).' });
      else r.rescues = rc;
    }
    // jobs
    if (!blankish(w.jobsTotal) || !blankish(w.jobsOwned)) {
      if (blankish(w.jobsTotal)) r.problems.push({ key: 'jobs', msg: 'Type how many jobs are on the list.' });
      else {
        var o = C.ownership(blankish(w.jobsOwned) ? 0 : w.jobsOwned, w.jobsTotal);
        if (o.value === null) r.problems.push({ key: 'jobs', msg: o.error });
        else if (blankish(w.jobsOwned)) r.problems.push({ key: 'jobs', msg: 'Type how many of them have an owner (0 is fine).' });
        else { r.oc = o.value; r.own = o; }
      }
    }
    if (r.oc === null && !blankish(w.ocScore)) { var os = inRange01(w.ocScore); if (os === null) r.problems.push({ key: 'ocScore', msg: 'An ownership score runs from 0 to 1.' }); else r.oc = os; }
    // loads: an average only when everyone's own score is there (never worked out for someone else)
    var bad = false;
    r.loads = w.loads.map(function (x) { if (blankish(x)) return null; var v = inRange01(x); if (v === null) bad = true; return v; });
    if (bad) r.problems.push({ key: 'loads', msg: 'A stress tank score runs from 0 to 1 (the five answers added up, then divided by 20).' });
    if (r.loads.length && r.loads.every(function (x) { return x !== null; })) r.as = avg(r.loads);
    if (r.as === null && !blankish(w.asScore)) { var as = inRange01(w.asScore); if (as === null) r.problems.push({ key: 'asScore', msg: 'An average stress tank score runs from 0 to 1.' }); else r.as = as; }
    r.filled = r.wb !== null || r.oc !== null || r.as !== null || r.rescues !== null || r.loads.some(function (x) { return x !== null; });
    return r;
  }

  // The average of several weeks' reads, measure by measure, over the weeks that have a value.
  function avgReads(reads, n) {
    var out = { wb: null, oc: null, as: null, rescues: null, loads: [], weeks: { wb: 0, oc: 0, as: 0, rescues: 0 }, owned: null, total: null, any: false };
    ['wb', 'oc', 'as', 'rescues'].forEach(function (k) {
      var v = reads.map(function (r) { return r[k]; }).filter(function (x) { return x !== null; });
      out[k] = avg(v); out.weeks[k] = v.length;
      if (v.length) out.any = true;
    });
    for (var i = 0; i < n; i++) { var li = avg(reads.map(function (r) { return r.loads[i]; })); out.loads.push(li); if (li !== null) out.any = true; }
    // job counts, when there is exactly one week with counts (so "6 of 10" can be said)
    var withJobs = reads.filter(function (r) { return r.own; });
    if (withJobs.length === 1) { out.owned = withJobs[0].own.owned; out.total = withJobs[0].own.total; }
    // the latest week's hours, for a concrete hand-off suggestion
    var withHours = reads.filter(function (r) { return r.bal; });
    out.lastBal = withHours.length ? withHours[withHours.length - 1].bal : null;
    return out;
  }

  /* ---------- words ---------- */
  function ownWords(v) { var x = C.r2(v); return x >= 0.9 ? 'nearly every job had an owner' : x >= 0.7 ? 'most jobs had an owner' : x >= 0.4 ? 'about half the jobs had an owner' : 'most jobs had no owner'; }
  function loadWords(v) { return C.wp02Band(v).label; }
  function perWeek(v) { var t = f1(v); return t + ' a week'; }
  function jobsText(r) { return r.total ? r.owned + ' of ' + r.total + ' jobs had an owner' : ownWords(r.oc); }

  /* ---------- then and now ---------- */
  // start, end: results of avgReads (or of readWeek, for the quick look-back).
  // names: display names. nums: show the numbers in the sentences.
  function compare(start, end, names, nums) {
    var items = [];
    function status(change, thr, upIsGood) {
      if (change === null) return 'na';
      if (Math.abs(change) + 1e-9 < thr) return 'steady';
      return (change > 0) === upIsGood ? 'better' : 'worse';
    }
    function nb(v, fmt) { return nums ? ' (' + (fmt ? fmt(v) : f2(v)) + ')' : ''; }

    // balance
    if (start.wb !== null && end.wb !== null) {
      var dw = C.r2(end.wb) - C.r2(start.wb), sw = status(dw, SHIFT.wb, true);
      items.push({ key: 'wb', label: 'How the hours split', status: sw, start: start.wb, end: end.wb, change: dw, watch: C.r2(end.wb) < WATCH.wb,
        text: sw === 'better' ? 'The hours evened out: from ' + C.shareWords(start.wb) + nb(start.wb) + ' to ' + C.shareWords(end.wb) + nb(end.wb) + '.'
          : sw === 'worse' ? 'The hours leaned further to one side: from ' + C.shareWords(start.wb) + nb(start.wb) + ' to ' + C.shareWords(end.wb) + nb(end.wb) + '.'
          : 'The way the hours split stayed about the same: ' + C.shareWords(end.wb) + nb(end.wb) + '.' });
    } else items.push({ key: 'wb', label: 'How the hours split', status: 'na' });

    // rescues
    if (start.rescues !== null && end.rescues !== null) {
      var dr = Math.round((end.rescues - start.rescues) * 10) / 10, sr = status(dr, SHIFT.rescues, false);
      items.push({ key: 'rescues', label: 'Last-minute rescues', status: sr, start: start.rescues, end: end.rescues, change: dr, watch: end.rescues >= WATCH.rescues,
        text: sr === 'better' ? 'Fewer last-minute rescues: from about ' + perWeek(start.rescues) + ' to about ' + perWeek(end.rescues) + '.'
          : sr === 'worse' ? 'More last-minute rescues: from about ' + perWeek(start.rescues) + ' to about ' + perWeek(end.rescues) + '.'
          : 'Last-minute rescues stayed about the same: about ' + perWeek(end.rescues) + '.' });
    } else items.push({ key: 'rescues', label: 'Last-minute rescues', status: 'na' });

    // ownership
    if (start.oc !== null && end.oc !== null) {
      var dc = C.r2(end.oc) - C.r2(start.oc), sc = status(dc, SHIFT.oc, true);
      var st = start.total ? start.owned + ' of ' + start.total : C.pct(start.oc), en = end.total ? end.owned + ' of ' + end.total : C.pct(end.oc);
      items.push({ key: 'oc', label: 'Jobs with an owner', status: sc, start: start.oc, end: end.oc, change: dc, watch: C.r2(end.oc) < WATCH.oc,
        text: sc === 'better' ? 'More jobs have an owner: from ' + st + ' to ' + en + '.'
          : sc === 'worse' ? 'Fewer jobs have an owner: from ' + st + ' to ' + en + '.'
          : 'Ownership stayed about the same: ' + (end.total ? jobsText(end) : ownWords(end.oc)) + nb(end.oc) + '.' });
    } else items.push({ key: 'oc', label: 'Jobs with an owner', status: 'na' });

    // load (the average, with each person's own line)
    var people = [];
    (names || []).forEach(function (nm, i) {
      var a = start.loads[i], b = end.loads[i];
      if (a === null || a === undefined || b === null || b === undefined) return;
      var d = C.r2(b) - C.r2(a);
      people.push({ i: i, name: nm, start: a, end: b, change: d, status: status(d, SHIFT.as, false), high: C.r2(b) >= WATCH.load });
    });
    if (start.as !== null && end.as !== null) {
      var da = C.r2(end.as) - C.r2(start.as), sa = status(da, SHIFT.as, false);
      var heavy = people.filter(function (p) { return p.high; });
      items.push({ key: 'as', label: 'How much each person is carrying', status: sa, start: start.as, end: end.as, change: da, people: people,
        watch: heavy.length > 0, heavy: heavy,
        text: (sa === 'better' ? 'The stress tank came down on average: from a ' + loadWords(start.as) + nb(start.as) + ' to a ' + loadWords(end.as) + nb(end.as) + '.'
          : sa === 'worse' ? 'The stress tank went up on average: from a ' + loadWords(start.as) + nb(start.as) + ' to a ' + loadWords(end.as) + nb(end.as) + '.'
          : 'The stress tank stayed about the same on average, at a ' + loadWords(end.as) + nb(end.as) + '.') +
          (people.length ? ' ' + people.map(function (p) { return p.name + ': ' + (p.status === 'better' ? 'lighter' : p.status === 'worse' ? 'heavier' : 'about the same') + ', now at a ' + loadWords(p.end) + nb(p.end); }).join('; ') + '.' : '') });
    } else items.push({ key: 'as', label: 'How much each person is carrying', status: 'na', people: people });

    // the setup read (CALC-01's score), when both ends have all three parts
    var setup = null;
    if (start.wb !== null && start.oc !== null && start.as !== null && end.wb !== null && end.oc !== null && end.as !== null) {
      var s0 = C.solvency(start.wb, start.oc, start.as).value, s1 = C.solvency(end.wb, end.oc, end.as).value;
      setup = { start: s0, end: s1, startBand: C.band(s0), endBand: C.band(s1), change: C.r2(s1) - C.r2(s0) };
    }

    var shifted = items.filter(function (x) { return x.status === 'better' || x.status === 'worse'; });
    var steady = items.filter(function (x) { return x.status === 'steady'; });
    var missing = items.filter(function (x) { return x.status === 'na'; });
    return { items: items, shifted: shifted, steady: steady, missing: missing, setup: setup, next: nextStep(items, end, names, setup), enough: shifted.length + steady.length > 0 };
  }

  // One plain line for the top of the read: how many parts shifted, and which way.
  function summaryLine(cmp) {
    var total = cmp.shifted.length + cmp.steady.length, nb = cmp.shifted.filter(function (x) { return x.status === 'better'; }).length, nw = cmp.shifted.length - nb;
    if (!cmp.shifted.length) return total === 1 ? 'The one part filled in at both ends didn’t shift much this month.' : 'Nothing shifted much this month.';
    var way = nb && nw ? ' (' + nb + ' for the better, ' + nw + ' the other way)' : nw ? ', the other way' : ', for the better';
    return (total === 1 ? 'The one part filled in at both ends shifted' : cmp.shifted.length + ' of ' + total + ' parts shifted') + way + '.';
  }

  /* ---------- one next step ---------- */
  var STEPS = {
    oc: { text: 'Give the jobs that still have no owner a name this week, one at a time. Start with the one that needed rescuing most.', link: ['One owner per job (WP-03)', '/workpapers/fill/wp-03.html'] },
    wb: { text: 'Move one regular job from the person doing more to the person doing less, for the next two weeks, and write the change on the job list.', link: ['One owner per job (WP-03)', '/workpapers/fill/wp-03.html'] },
    rescues: { text: 'Look at what got rescued. A job that needed rescuing twice needs one owner and a set time, not a third rescue.', link: ['What keeps coming back? (WP-04)', '/workpapers/wp-04-what-keeps-coming-back.html'] },
    as: { text: 'A job list can’t lower a full stress tank on its own. Pick the heaviest day in the week ahead and take one thing off it, and use the daily check-in to catch heavy days early.', link: ['The 90-second daily check-in (WP-13)', '/workpapers/wp-13-daily-check-in.html'] }
  };
  var ORDER = ['oc', 'wb', 'rescues', 'as'];
  function nextStep(items, end, names, setup) {
    var by = {}; items.forEach(function (x) { by[x.key] = x; });
    var worse = items.filter(function (x) { return x.status === 'worse'; });
    var pick = null, why = '';
    if (worse.length) {
      pick = worse.slice().sort(function (a, b) { return Math.abs(b.change) / SHIFT[b.key] - Math.abs(a.change) / SHIFT[a.key]; })[0];
      why = by[pick.key].label + ': this moved the wrong way this month, so start there.';
    } else {
      ORDER.some(function (k) { if (by[k] && by[k].status !== 'na' && by[k].watch) { pick = by[k]; return true; } return false; });
      if (pick) why = by[pick.key].label + (pick.status === 'better' ? ': better than at the start, and still the part most worth a look.' : ': no real change, and still worth a look.');
    }
    if (!items.some(function (x) { return x.status !== 'na'; })) return { key: 'none', why: '', text: 'Fill in at least one week near the start of the month and one near the end, for the same thing, to see what shifted.', link: null };
    if (!pick) return { key: 'keep', why: 'Nothing that was filled in needs a change right now.', text: 'Keep the same rhythm of check-ins, and look back again in 30 days.', link: ['Check-ins', '/check-ins.html'] };
    var s = STEPS[pick.key], text = s.text;
    if (pick.key === 'wb' && end.lastBal) {
      var h = C.balanceHandoff(end.lastBal);
      if (h && names && names[h.from] && names[h.to]) text = 'Move about ' + f1(h.hours) + ' hour' + (h.hours === 1 ? '' : 's') + ' a week of regular jobs from ' + names[h.from] + ' to ' + names[h.to] + ', for the next two weeks, and write the change on the job list.';
    }
    if (pick.key === 'as' && pick.heavy && pick.heavy.length && pick.status !== 'worse') why = pick.heavy.map(function (p) { return p.name; }).join(' and ') + (pick.heavy.length === 1 ? ' is' : ' are') + ' still at a high load (0.60 or more on How much are you carrying?). That is about the load, not the person.';
    var out = { key: pick.key, why: why, text: text, link: s.link };
    if (setup && setup.endBand.key === 'low' && setup.change < SHIFT.wb) out.extra = 'If it still feels stuck after a month of trying, outside support, like a counselor or a trusted mediator, is worth considering.';
    return out;
  }

  /* ---------- running imbalance ---------- */
  // For each person: hours done minus their share of everyone's hours, added up week by week.
  // weeks: the four week objects. Returns { rows: [{ i, gaps[], moved }], total[], sumHours, moved, bal } or null.
  function running(weeks, n, targets) {
    var t = null;
    if (targets) { var tt = targets.map(function (x) { var v = num(x); return v === null ? 0 : v; }), s = tt.reduce(function (a, b) { return a + b; }, 0); if (Math.abs(s - 100) <= 0.5) t = tt.map(function (x) { return x / s; }); }
    if (!t) { t = []; for (var k = 0; k < n; k++) t.push(1 / n); }
    var run = []; for (var j = 0; j < n; j++) run.push(0);
    var tot = []; for (var q = 0; q < n; q++) tot.push(0);
    var rows = [], any = false;
    weeks.forEach(function (w, wi) {
      w = fitWeek(w, n);
      if (w.hours.some(function (x) { return C.hoursProblem(x); })) { rows.push({ i: wi, skip: true }); return; }
      var h = w.hours.map(function (x) { var v = num(x); return v !== null && v > 0 ? v : 0; });
      var sum = h.reduce(function (a, b) { return a + b; }, 0);
      if (!(sum > 0)) { rows.push({ i: wi, skip: true }); return; }
      any = true;
      h.forEach(function (x, i) { run[i] += x - t[i] * sum; tot[i] += x; });
      rows.push({ i: wi, hours: h, sum: sum, gaps: run.slice(), moved: run.reduce(function (a, b) { return a + Math.abs(b); }, 0) / 2 });
    });
    if (!any) return null;
    var all = tot.reduce(function (a, b) { return a + b; }, 0);
    var last = rows.filter(function (r) { return !r.skip; }).pop();
    var weeksWithHours = rows.filter(function (r) { return !r.skip; }).length;
    // who was over their share in every week with hours
    var overEvery = [];
    for (var p = 0; p < n; p++) {
      var every = rows.filter(function (r) { return !r.skip; }).every(function (r) { return r.hours[p] - t[p] * r.sum > 0.05; });
      if (every && weeksWithHours >= 2) overEvery.push(p);
    }
    return { rows: rows, total: tot, sumHours: all, gaps: last.gaps, moved: last.moved, bal: C.balance(tot, targets && t ? t.map(function (x) { return x * 100; }) : null), weeks: weeksWithHours, overEvery: overEvery, target: t };
  }

  /* ---------- this device (read-only) ---------- */
  function lsKeys() { var out = []; try { for (var i = 0; i < global.localStorage.length; i++) out.push(global.localStorage.key(i)); } catch (e) {} return out; }
  function lsJSON(k) { try { var raw = global.localStorage.getItem(k); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
  function hoursFromAudit(rows, n) {
    var h = []; for (var i = 0; i < n; i++) h.push(0);
    var any = false;
    (rows || []).forEach(function (r) {
      var m = num(r && r.minutes); if (m === null || m <= 0 || m > 1440) return;
      if (r.who === 'Both') { for (var k = 0; k < n; k++) h[k] += m / 60 / n; any = true; return; }
      var i = CODES.indexOf(r.who); if (i >= 0 && i < n) { h[i] += m / 60; any = true; }
    });
    return any ? h.map(function (x) { return Math.round(x * 100) / 100; }) : null;
  }
  function draftNames(values) { var out = []; for (var i = 0; i < 8; i++) { var v = String(values && values['partner' + CODES[i]] || '').trim(); if (v) out[i] = v; } return out; }
  function bat(values) {
    var p = ['sleep', 'work', 'conflict', 'physical', 'time'].map(function (id) { var v = values && values['factors.' + id]; return v === undefined || v === null ? '' : String(v); });
    var b = C.battery(p); return b ? b.value : null;
  }

  // Everything this device holds that fits the look-back ending on `end`.
  // Returns { names: [], facts: [{ slot, kind, ... , src }], sources: [labels], days: weather summary or null }
  function device(end) {
    var e = end || new Date(), facts = [], sources = {}, names = [];
    function src(label) { sources[label] = (sources[label] || 0) + 1; }
    function setNames(list) { if (!names.length && list && list.filter(Boolean).length >= 2) names = list.map(function (x) { return String(x || '').trim(); }); }

    // 1. the long fair-split calculator (kept entries + trend log)
    var c1 = lsJSON('tol-calc01-full-v2');
    if (c1 && c1.v === 2) {
      if (c1.entries && Array.isArray(c1.entries.people)) setNames(c1.entries.people);
      (c1.trend || []).forEach(function (t) {
        var s = slotOf(t && t.date, e, true); if (s < 0) return;
        facts.push({ slot: s, date: t.date, kind: 'scores', wb: num(t.wb), oc: num(t.oc), as: num(t.as), src: 'Fair split calculator trend log' });
        src('Fair split calculator trend log');
      });
    }
    // 2. the Workpaper Suite draft
    var su = lsJSON('tol-wpf-keep:suite');
    if (su && su.format === 'tol-workpaper-suite' && Array.isArray(su.entries) && su.path !== 'self') {
      setNames(su.names || []);
      var sn = Math.max(2, Math.min(8, (su.names || []).length || 2));
      su.entries.forEach(function (en) {
        if (!en || !en.state || !en.state.values) return;
        var v = en.state.values;
        if (en.workpaper === 'WP-01') {
          var s1 = slotOf(v.weekOf, e, true), h = s1 >= 0 ? hoursFromAudit(en.state.tables && en.state.tables.audit, sn) : null;
          if (h) { facts.push({ slot: s1, date: v.weekOf, kind: 'hours', hours: h, src: 'Who did what (Workpaper Suite)' }); src('Who did what (Workpaper Suite)'); }
        } else if (en.workpaper === 'WP-02') {
          var s2 = slotOf(v.date, e, false), b2 = s2 >= 0 ? bat(v) : null;
          var pi = typeof en.person === 'number' ? en.person : -1;
          if (pi < 0 && v.name) (su.names || []).forEach(function (nm, i) { if (fold(nm) && fold(nm) === fold(v.name)) pi = i; });
          if (b2 !== null && pi >= 0) { facts.push({ slot: s2, date: v.date, kind: 'load', person: pi, value: b2, src: 'How much are you carrying? (Workpaper Suite)' }); src('How much are you carrying? (Workpaper Suite)'); }
        } else if (en.workpaper === 'WP-13') {
          var s3 = slotOf(v.weekOf, e, true); if (s3 < 0) return;
          var hi = high(en.state.tables && en.state.tables.daily, sn);
          if (hi) { facts.push({ slot: s3, date: v.weekOf, kind: 'high', high: hi, src: 'The daily check-in (Workpaper Suite)' }); src('The daily check-in (Workpaper Suite)'); }
        }
      });
    }
    // 3. single worksheet drafts
    lsKeys().forEach(function (k) {
      var m = /^tol-wpf-keep:(WP-01|WP-02|WP-13)(:|$)/.exec(k || ''); if (!m) return;
      var d = lsJSON(k); if (!d || d.format !== 'tol-workpaper-draft' || !d.state || !d.state.values) return;
      var v = d.state.values, dn = draftNames(v), n2 = Math.max(2, Math.min(8, parseInt(v.peopleCount, 10) || dn.length || 2));
      if (m[1] === 'WP-01') {
        setNames(dn);
        var s1 = slotOf(v.weekOf, e, true), h = s1 >= 0 ? hoursFromAudit(d.state.tables && d.state.tables.audit, n2) : null;
        if (h) { facts.push({ slot: s1, date: v.weekOf, kind: 'hours', hours: h, src: 'Who did what (worksheet draft)' }); src('Who did what (worksheet draft)'); }
      } else if (m[1] === 'WP-02') {
        var s2 = slotOf(v.date, e, false), b2 = s2 >= 0 ? bat(v) : null;
        if (b2 !== null && v.name) { facts.push({ slot: s2, date: v.date, kind: 'load', name: String(v.name).trim(), value: b2, src: 'How much are you carrying? (worksheet draft)' }); src('How much are you carrying? (worksheet draft)'); }
      } else {
        setNames(dn);
        var s3 = slotOf(v.weekOf, e, true), hi = s3 >= 0 ? high(d.state.tables && d.state.tables.daily, n2) : null;
        if (hi) { facts.push({ slot: s3, date: v.weekOf, kind: 'high', high: hi, src: 'The daily check-in (worksheet draft)' }); src('The daily check-in (worksheet draft)'); }
      }
    });
    // 4. jobs the weekly check-in card was told slipped
    var jl = lsJSON('tol-jobs-log-v1');
    if (jl && jl.w && typeof jl.w === 'object' && !jl.stop) {
      Object.keys(jl.w).forEach(function (wk) {
        var s = slotOf(wk, e, true); if (s < 0) return;
        var seen = {}, jobs = [];
        Object.keys(jl.w[wk] || {}).forEach(function (sk) { (jl.w[wk][sk] || []).forEach(function (j) { var l = fold(j); if (l && !seen[l]) { seen[l] = 1; jobs.push(String(j)); } }); });
        if (jobs.length) { facts.push({ slot: s, date: wk, kind: 'slipped', count: jobs.length, jobs: jobs, src: 'Jobs your weekly check-in said slipped' }); src('Jobs your weekly check-in said slipped'); }
      });
    }
    // 5. names from the household kept on this device, if nothing else had them
    if (!names.length && global.TOLHousehold && global.TOLHousehold.get) { var hh = global.TOLHousehold.get(); if (hh && hh.people && hh.people.length >= 2) names = hh.people.slice(0, 8); }

    var list = Object.keys(sources).map(function (k) { return k + (sources[k] > 1 ? ' (' + sources[k] + ')' : ''); });
    return { names: names, facts: facts, sources: list, days: days(e) };
  }
  function high(rows, n) {
    var c = []; for (var i = 0; i < n; i++) c.push(0);
    var any = false;
    (rows || []).forEach(function (r) { var i = CODES.indexOf(r && r.who); if (i >= 0 && i < n && r.load) { any = true; if (r.load === 'High') c[i]++; } });
    return any ? c : null;
  }

  // Apply device facts to the four weeks, filling only boxes that are still empty.
  // Returns lines saying what was used. nameList: the names on the page, to match WP-02 drafts by name.
  function apply(weeks, facts, n, nameList) {
    var used = [], by = [[], [], [], []];
    facts.slice().sort(function (a, b) { return String(a.date) < String(b.date) ? -1 : 1; }).forEach(function (f) { by[f.slot].push(f); });
    by.forEach(function (list, s) {
      var w = weeks[s] = fitWeek(weeks[s], n), bits = [];
      var hoursEmpty = w.hours.every(blankish);
      var hf = list.filter(function (f) { return f.kind === 'hours'; }).pop();
      if (hf && hoursEmpty) { w.hours = hf.hours.slice(0, n).map(function (x) { return String(x); }); while (w.hours.length < n) w.hours.push(''); bits.push('hours'); }
      list.filter(function (f) { return f.kind === 'load'; }).forEach(function (f) {
        var i = typeof f.person === 'number' ? f.person : -1;
        if (i < 0 && f.name) (nameList || []).forEach(function (nm, k) { if (fold(nm) && fold(nm) === fold(f.name)) i = k; });
        if (i >= 0 && i < n && blankish(w.loads[i])) { w.loads[i] = String(C.r2(f.value)); if (bits.indexOf('stress tank scores') < 0) bits.push('stress tank scores'); }
      });
      var sf = list.filter(function (f) { return f.kind === 'scores'; }).pop();
      if (sf) {
        if (hoursEmpty && !hf && blankish(w.wbScore) && sf.wb !== null) { w.wbScore = String(C.r2(sf.wb)); bits.push('balance score'); }
        if (blankish(w.jobsTotal) && blankish(w.ocScore) && sf.oc !== null) { w.ocScore = String(C.r2(sf.oc)); bits.push('ownership score'); }
        if (w.loads.every(blankish) && blankish(w.asScore) && sf.as !== null) { w.asScore = String(C.r2(sf.as)); bits.push('average stress tank score'); }
      }
      var jf = list.filter(function (f) { return f.kind === 'slipped'; }).pop();
      if (jf && blankish(w.rescues)) { w.rescues = String(jf.count); bits.push('rescues (' + jf.jobs.join(', ') + ')'); }
      if (bits.length) used.push('Week ' + (s + 1) + ': ' + bits.join(', '));
    });
    return used;
  }

  /* ---------- your own days (Today's Weather, just this person) ---------- */
  function days(end) {
    var a = lsJSON('tol-weather-v1'); if (!Array.isArray(a)) return null;
    var e = end || new Date(), first = [], second = [], seen = {};
    a.forEach(function (x) {
      if (!x || !x.d || seen[x.d] || !/^(clear|gusty|fog)$/.test(x.sky)) return;
      var d = fromKey(x.d); if (!d) return;
      var back = daysBetween(d, e); if (back < 0 || back > 30) return;
      seen[x.d] = 1;
      (back >= 15 ? first : second).push(x);
    });
    if (!first.length && !second.length) return null;
    function sum(list) {
      var c = { n: list.length, clear: 0, gusty: 0, fog: 0, heavy: 0 };
      list.forEach(function (x) { c[x.sky]++; if (x.load === 'heavy') c.heavy++; });
      c.clearShare = c.n ? c.clear / c.n : null; c.heavyShare = c.n ? c.heavy / c.n : null;
      return c;
    }
    var s = sum(first), t = sum(second), out = { first: s, second: t, total: s.n + t.n, text: '' };
    var line = 'You saved ' + out.total + ' Today’s Weather check-in' + (out.total === 1 ? '' : 's') + ' in these 30 days (' + s.n + ' in the first half, ' + t.n + ' in the second).';
    if (s.n >= 3 && t.n >= 3) {
      var dc = t.clearShare - s.clearShare, dh = t.heavyShare - s.heavyShare;
      line += ' Calm, clear days: ' + C.pct(s.clearShare) + ' of them in the first half, ' + C.pct(t.clearShare) + ' in the second' + (Math.abs(dc) >= 0.2 ? (dc > 0 ? ', more than before.' : ', fewer than before.') : ', about the same.');
      line += ' Days that felt heavy: ' + s.heavy + ' then ' + t.heavy + '.';
      out.shift = Math.abs(dc) >= 0.2 ? (dc > 0 ? 'better' : 'worse') : 'steady';
    } else line += ' With fewer than 3 in each half, it’s too few to compare.';
    out.text = line;
    return out;
  }

  global.TOLCalc02 = {
    SHIFT: SHIFT, WATCH: WATCH,
    slots: slots, slotOf: slotOf, blankWeek: blankWeek, fitWeek: fitWeek,
    readWeek: readWeek, avgReads: avgReads, compare: compare, summaryLine: summaryLine, running: running,
    device: device, apply: apply, days: days, dayKey: dayKey, fromKey: fromKey, nice: nice
  };
})(window);
