/*
  calc01-core.js — The Objective Ledger, CALC-01 "Is the setup working for everyone?"
  (also called the solvency read)
  The one place the CALC-01 arithmetic lives. Loaded by:
    /calc01-solvency.html                       (the full calculator)
    /workpapers/calculators/calc01-solvency.html (the quick read)
    /do/workpaper-playground.html                (the practice examples)
  so every page gives the same number for the same entries.

  The formulas (from Chapter II of the book):
    solvency = balance × 0.40 + ownership × 0.35 + (1 − stress) × 0.25
    apex     = balance × 0.35 + ownership × 0.30 + (1 − stress) × 0.20 + retuning × 0.15
               (no friction logged → retuning has no value, and apex uses the
                first three weights divided by 0.85 so they still add up to 1)
    bands    : 0.70 or more = working well · 0.40 up to 0.70 = needs a look · below 0.40 = needs a rethink, together
               Bands are read from the score rounded to two decimals, so the number
               you see and the band you see always agree.

  Balance, for 2 to 8 people:
    Each person's share = their hours ÷ everyone's hours.
    The target share is an even split (1 ÷ number of people), or a split
    the group agreed on (percentages that add up to 100).
    moved   = ½ × Σ |share − target|       the part of all hours that would have
                                           to change hands to hit the target
    most    = 1 − the smallest target share  what "moved" would be if one person
                                           (the one meant to do least) did it all
    balance = 1 − moved ÷ most
    With two people and an even target this is exactly the book's
    1 − |pctA − pctB| ÷ 100.

  Ownership = jobs with an owner ÷ all jobs (one owner per job; a helper is optional).
  Concentration (a check, not a fourth input): the busiest person's share of the owned jobs
              or the logged minutes. Clarity can read 1.00 with one person holding every job,
              so this sits next to it: flagged at half or more, and 20 points over an even share.
  Stress    = the average of everyone's WP-02 battery (each = five 0–4 scores ÷ 20).
              Never worked out while anyone's battery is missing.
*/
(function (global) {
  'use strict';

  var W = {
    sol: { wb: 0.40, oc: 0.35, as: 0.25 },
    apex: { wb: 0.35, oc: 0.30, as: 0.20, rf: 0.15 }
  };
  var BANDS = { high: 0.70, low: 0.40 };
  var WP02 = { low: 0.30, high: 0.60 };
  var MIN_PEOPLE = 2, MAX_PEOPLE = 8;

  function r2(v) { return Math.round(v * 100 + 1e-7) / 100; }
  function f2(v) { return v === null || v === undefined || isNaN(v) ? '—' : r2(v).toFixed(2); }
  function f1(v) { return (Math.round(v * 10 + 1e-7) / 10).toString(); }
  // a gain or a part of the score: up to three decimals, without trailing zeros (0.025, 0.16)
  function fg(v) { var t = (Math.round(v * 1000 + 1e-7) / 1000).toFixed(3); return t.replace(/0$/, ''); }
  function pct(v) { return Math.round(v * 100 + 1e-7) + '%'; }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function sum(a) { return a.reduce(function (s, x) { return s + x; }, 0); }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }

  /* ---------- balance ---------- */
  // hours: array of numbers (blank = 0). targetPct: null for an even split, or
  // an array of percentages that must add up to 100.
  function balance(hours, targetPct) {
    var n = hours.length;
    var h = hours.map(function (x) { var v = num(x); return v !== null && v > 0 ? v : 0; });
    var total = sum(h);
    var res = { n: n, hours: h, total: total, value: null, error: null };
    if (n < MIN_PEOPLE) { res.error = 'Add at least two people.'; return res; }
    if (hours.some(function (x) { var v = num(x); return v !== null && v < 0; })) { res.error = 'Hours can’t be negative.'; return res; }
    var t;
    if (targetPct) {
      t = targetPct.map(function (x) { var v = num(x); return v === null ? 0 : v; });
      if (t.some(function (x) { return x < 0; })) { res.error = 'An agreed share can’t be negative.'; return res; }
      var ts = sum(t);
      if (Math.abs(ts - 100) > 0.5) { res.error = 'The agreed shares add up to ' + f1(ts) + '%. Make them add up to 100%.'; res.targetSum = ts; return res; }
      t = t.map(function (x) { return x / ts; });
      res.mode = 'agreed';
    } else {
      t = h.map(function () { return 1 / n; });
      res.mode = 'even';
    }
    res.target = t;
    if (total <= 0) { res.error = 'No hours logged yet, so there’s no balance to read (an empty week is not an even week).'; return res; }
    var s = h.map(function (x) { return x / total; });
    var gaps = s.map(function (x, i) { return x - t[i]; });
    var moved = sum(gaps.map(Math.abs)) / 2;
    var most = 1 - Math.min.apply(null, t);
    res.shares = s;
    res.gaps = gaps;
    res.moved = moved;
    res.movedHours = moved * total;
    res.most = most;
    res.value = most > 0 ? clamp01(1 - moved / most) : 1;
    return res;
  }

  // The single most useful hand-off: from the person furthest over their share
  // to the person furthest under it, just enough to close the smaller gap.
  function balanceHandoff(b) {
    if (!b || b.value === null || b.value >= 0.995) return null;
    var over = 0, under = 0;
    b.gaps.forEach(function (g, i) {
      if (g > b.gaps[over]) over = i;
      if (g < b.gaps[under]) under = i;
    });
    var hrs = Math.min(b.gaps[over], -b.gaps[under]) * b.total;
    if (hrs <= 0.05) return null;
    hrs = Math.max(0.5, Math.round(hrs * 2) / 2); // to the nearest half hour
    var h2 = b.hours.slice();
    h2[over] -= hrs; h2[under] += hrs;
    if (h2[over] < 0) { h2[under] += h2[over]; h2[over] = 0; }
    var tp = b.mode === 'agreed' ? b.target.map(function (x) { return x * 100; }) : null;
    var after = balance(h2, tp);
    return { from: over, to: under, hours: hrs, after: after.value };
  }

  /* ---------- ownership ---------- */
  function ownership(owned, total) {
    var o = num(owned), t = num(total);
    var res = { owned: o, total: t, value: null, error: null };
    if (t === null || t <= 0) { res.error = 'No jobs listed yet, so there’s nothing to read (not 0.00).'; return res; }
    if (o === null) o = 0;
    if (o < 0 || t < 0) { res.error = 'Job counts can’t be negative.'; return res; }
    if (Math.floor(o) !== o || Math.floor(t) !== t) { res.error = 'Use whole numbers of jobs.'; return res; }
    if (o > t) { res.error = 'More jobs with an owner (' + o + ') than jobs on the list (' + t + ').'; return res; }
    res.owned = o; res.total = t;
    res.value = o / t;
    return res;
  }

  /* ---------- concentration: how much sits with the busiest person ---------- */
  // Ownership clarity only asks "does every job have a name?". It reads 1.00 even when every name
  // is the same person. This is the check that sits beside it (and beside balance): the busiest
  // person's share of the owned jobs, the logged minutes or the unasked-for minutes.
  // values: one number per person. min: the smallest total worth reading (e.g. 3 jobs, 60 minutes).
  // It is flagged when that share is at least half, and at least 20 points over an even share.
  function concentration(values, min) {
    var v = (values || []).map(function (x) { var y = num(x); return y !== null && y > 0 ? y : 0; });
    var n = v.length, total = sum(v);
    var res = { n: n, total: total, top: null, count: null, share: null, even: n ? 1 / n : null, line: n ? Math.max(0.5, 1 / n + 0.2) : null, flag: false };
    if (n < 2 || !(total > 0)) return res;
    var top = 0;
    v.forEach(function (x, i) { if (x > v[top]) top = i; });
    res.top = top; res.count = v[top]; res.share = v[top] / total;
    res.flag = total >= (min || 0) && r2(res.share) >= r2(res.line);
    return res;
  }

  /* ---------- stress (WP-02 batteries) ---------- */
  // One person's battery from their five 0–4 answers. Returns null until all five are in.
  function battery(points) {
    if (!points || points.length !== 5) return null;
    var p = points.map(num);
    if (p.some(function (x) { return x === null || x < 0 || x > 4; })) return null;
    return { points: sum(p), value: sum(p) / 20 };
  }
  function wp02Band(v) {
    var x = r2(v);
    if (x < WP02.low) return { key: 'low', label: 'low load' };
    if (x < WP02.high) return { key: 'mid', label: 'medium load' };
    return { key: 'high', label: 'high load' };
  }
  // scores: array of each person's load score (0–1) or null
  function stress(scores) {
    var res = { value: null, error: null, scores: scores, missing: [] };
    scores.forEach(function (s, i) {
      var v = num(s);
      if (v === null) res.missing.push(i);
      else if (v < 0 || v > 1) res.error = 'A load score runs from 0 to 1 (the five answers added up, then divided by 20).';
    });
    if (res.error) return res;
    if (res.missing.length) { res.error = 'Waiting on ' + res.missing.length + ' load score' + (res.missing.length === 1 ? '' : 's') + '. Each person fills in their own; it is never worked out for someone else.'; return res; }
    var v = scores.map(num);
    res.value = sum(v) / v.length;
    return res;
  }

  /* ---------- retuning (WP-09) ---------- */
  function retuning(retunes, friction) {
    var f = num(friction), r = num(retunes);
    if (f === null || f <= 0) return { value: null, note: 'No friction logged, so retuning has no value. Nothing to repair is not a failure to repair.' };
    if (r === null || r < 0) r = 0;
    return { value: clamp01(r / f), capped: r > f, retunes: r, friction: f };
  }

  /* ---------- scores ---------- */
  function solvency(wb, oc, as, w) {
    w = w || W.sol;
    if (wb === null || oc === null || as === null) return null;
    var parts = { wb: wb * w.wb, oc: oc * w.oc, as: (1 - as) * w.as };
    return { value: parts.wb + parts.oc + parts.as, parts: parts, weights: w };
  }
  function apex(wb, oc, as, rf, w) {
    w = w || W.apex;
    if (wb === null || oc === null || as === null) return null;
    var parts = { wb: wb * w.wb, oc: oc * w.oc, as: (1 - as) * w.as, rf: rf === null ? null : rf * w.rf };
    if (rf === null) {
      var part = w.wb + w.oc + w.as;
      return { value: part > 0 ? (parts.wb + parts.oc + parts.as) / part : 0, parts: parts, rebalanced: true, divisor: part, weights: w };
    }
    return { value: parts.wb + parts.oc + parts.as + parts.rf, parts: parts, rebalanced: false, weights: w };
  }
  function band(v) {
    var x = r2(v);
    if (x >= BANDS.high) return { key: 'high', cls: '', word: 'Working well', label: 'Working well: the setup is carrying its own weight.', short: 'working well' };
    if (x >= BANDS.low) return { key: 'mid', cls: 'mid', word: 'Needs a look', label: 'Needs a look: something in the setup is slipping.', short: 'needs a look' };
    return { key: 'low', cls: 'low', word: 'Needs a rethink, together', label: 'Needs a rethink, together: the setup is asking too much as it is. That is about the setup, not anyone in it.', short: 'needs a rethink, together' };
  }
  // The same cut-offs, said once in words, for every page that shows the bands.
  var BAND_NOTE = '0.70 or more: working well. 0.40 up to 0.70: needs a look. Below 0.40: needs a rethink, together. Here higher means the setup is working better (on the WP-02 battery, higher means heavier).';
  // How evenly the time is shared, in words (the same 0.70 / 0.40 cut-offs as the bands).
  function shareWords(v) { var x = r2(v); return x >= BANDS.high ? 'fairly even' : x >= BANDS.low ? 'leaning to one side' : 'mostly on one person'; }

  /* ---------- "what would move the score" ---------- */
  // Returns a list of concrete changes, biggest gain first. names: array of display names.
  function suggestions(o) {
    var w = o.weights || W.sol, out = [], names = o.names || [];
    var nm = function (i) { return names[i] || ('Person ' + (i + 1)); };
    if (o.wb !== null && o.wb < 0.995) {
      var h = o.balance ? balanceHandoff(o.balance) : null;
      if (h && h.after !== null) {
        out.push({ key: 'wb', gain: (h.after - o.wb) * w.wb,
          text: 'Hand about ' + f1(h.hours) + ' hour' + (h.hours === 1 ? '' : 's') + ' a week from ' + nm(h.from) + ' to ' + nm(h.to) +
            '. Balance would go from ' + f2(o.wb) + ' to ' + f2(h.after) + '.',
          link: ['WP-01, Who did what, and kind ways to say no', '/workpapers/fill/wp-01.html'] });
      }
      out.push({ key: 'wb-all', gain: (1 - o.wb) * w.wb, full: true,
        text: 'A split that fully matches your ' + (o.balance && o.balance.mode === 'agreed' ? 'agreed shares' : 'even shares') + ' would add up to ' + fg((1 - o.wb) * w.wb) + '.' +
          (o.balance && o.balance.movedHours ? ' That means about ' + f1(o.balance.movedHours) + ' hours a week changing hands.' : '') });
    }
    if (o.oc !== null && o.ownership && o.ownership.total && o.ownership.owned < o.ownership.total) {
      var t = o.ownership.total, own = o.ownership.owned;
      out.push({ key: 'oc', gain: w.oc / t,
        text: 'Give one more job an owner (the person who does it and sees it through). Ownership would go from ' + f2(o.oc) + ' to ' + f2((own + 1) / t) + '.',
        link: ['WP-03, One owner per job', '/workpapers/fill/wp-03.html'] });
      if (t - own > 1) out.push({ key: 'oc-all', gain: (1 - o.oc) * w.oc, full: true,
        text: 'Naming owners for all ' + (t - own) + ' unowned jobs would add ' + fg((1 - o.oc) * w.oc) + '. Keep them on the list until they have names; deleting them only hides them.' });
    }
    if (o.as !== null && o.as > 0) {
      var drop = Math.min(0.10, o.as);
      out.push({ key: 'as', gain: drop * w.as,
        text: 'If the average load came down by ' + f2(drop) + ' (about ' + f1(drop * 20) + ' points on each person’s 20-point check), the score would rise by ' + fg(drop * w.as) + '. That usually comes from outside the chore list: a lighter week elsewhere, more sleep, less rushing.',
        link: ['WP-02, How much are you carrying?', '/workpapers/fill/wp-02.html'] });
    }
    out.sort(function (a, b) { return (a.full ? 1 : 0) - (b.full ? 1 : 0) || b.gain - a.gain; });
    return out;
  }

  // Biggest shortfall: the part that lost the most points (the book's "start with the shortfall").
  function shortfalls(wb, oc, as, w) {
    w = w || W.sol;
    return [
      { key: 'wb', name: 'Balance', could: w.wb, earned: wb * w.wb, short: (1 - wb) * w.wb },
      { key: 'oc', name: 'Ownership', could: w.oc, earned: oc * w.oc, short: (1 - oc) * w.oc },
      { key: 'as', name: 'Stress (counted as 1 − stress)', could: w.as, earned: (1 - as) * w.as, short: as * w.as }
    ];
  }

  // A week has 168 hours: an hours box above that (or below zero) is almost always a typo,
  // for example minutes typed as hours. Returns a message, or '' when the value is fine or blank.
  function hoursProblem(v) {
    if (v === '' || v === null || v === undefined) return '';
    var x = num(v);
    if (x === null) return '“' + v + '” isn’t a number, so it is left out.';
    if (x < 0) return 'Hours can’t be negative, so ' + v + ' is left out.';
    if (x > 168) return v + ' hours is more than a week has (168), so it is left out. Were they minutes?';
    return '';
  }

  /* ---------- "Load from my suite" ---------- */
  // Reads the Workpaper Suite draft that the person chose to keep on this device ("Keep a draft on this
  // device" on the Suite page), and turns it into CALC-01 entries: hours from WP-01, the job list from
  // WP-03, and each person's own battery from WP-02. Nothing is read unless that draft exists, and
  // nothing is sent anywhere. Returns null when there is nothing to load.
  var SUITE_KEY = 'tol-wpf-keep:suite', FACTOR_IDS = ['sleep', 'work', 'conflict', 'physical', 'time'], CODES = 'ABCDEFGH';
  // The starter jobs WP-03 shows as examples on each road (see tol-workpaper-schemas.js).
  var WP03_STARTERS = ['Groceries', 'Cooking', 'Dishes', 'Laundry', 'Bills & scheduling', 'Cleaning (bathroom/kitchen)', 'Pet care', 'Car maintenance', 'Social/family calendar', 'Emotional check-ins',
    'Meeting notes', 'Follow-ups after meetings', 'Deadlines and status reporting', 'On-call or cover when someone is out', 'Team chat and shared inbox triage', 'Onboarding a new teammate',
    'Rent: collecting and paying', 'Bills (power, water, internet)', 'Cleaning: kitchen', 'Cleaning: bathroom', 'Cleaning: shared living space', 'Shared supplies (soap, paper, basics)', 'Trash and recycling', 'Guests and quiet hours',
    'Appointments: booking, getting there, notes', 'Medications: keeping the list and schedule up to date', 'Pharmacy pickups', 'Bills and insurance paperwork', 'Visits', 'Overnight calls', 'Groceries and meals'];
  function fold(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase(); }
  function suiteDraft() {
    var d = null;
    try { var raw = global.localStorage && global.localStorage.getItem(SUITE_KEY); d = raw ? JSON.parse(raw) : null; } catch (e) { return null; }
    if (!d || d.format !== 'tol-workpaper-suite' || !Array.isArray(d.entries) || d.path === 'self') return null;
    var names = (d.names || []).map(function (x) { return String(x || '').trim(); }).slice(0, MAX_PEOPLE);
    while (names.length < MIN_PEOPLE) names.push('');
    var n = names.length;
    function dateOf(e) { var v = e.state && e.state.values || {}; return v.date || v.weekOf || v.reviewDate || ''; }
    function latest(code, pick) {
      var list = d.entries.filter(function (e) { return e && e.workpaper === code && e.state && (!pick || pick(e)); });
      if (list.every(function (e) { return /^\d{4}-\d{2}-\d{2}$/.test(dateOf(e)); })) list.sort(function (a, b) { return dateOf(a) < dateOf(b) ? -1 : dateOf(a) > dateOf(b) ? 1 : 0; });
      return list[list.length - 1] || null;
    }
    var out = { names: names, ledger: [], raci: [], bat: names.map(function () { return ['', '', '', '', '']; }), found: [], road: d.path };
    var w1 = latest('WP-01');
    if (w1) {
      var byTask = {};
      (w1.state.tables.audit || []).forEach(function (r) {
        var m = num(r.minutes), task = String(r.task || '').trim();
        if (!task || m === null || m <= 0 || m > 1440) return;
        var row = byTask[task.toLowerCase()];
        if (!row) { row = byTask[task.toLowerCase()] = { name: task, hours: names.map(function () { return 0; }) }; out.ledger.push(row); }
        var i = CODES.indexOf(r.who);
        if (r.who === 'Both') names.forEach(function (_, k) { row.hours[k] += m / 60 / n; });
        else if (i >= 0 && i < n) row.hours[i] += m / 60;
      });
      out.ledger.forEach(function (row) { row.hours = row.hours.map(function (h) { return Math.round(h * 100) / 100; }); });
      if (out.ledger.length) out.found.push('WP-01 (' + out.ledger.length + ' job' + (out.ledger.length === 1 ? '' : 's') + ')');
    }
    var w3 = latest('WP-03');
    if (w3) {
      (w3.state.tables.treaty || []).forEach(function (r) {
        if (!String(r.task || '').trim()) return;
        // a WP-03 starter job nobody touched is an example: it never counts for or against ownership
        if (!r.r && !r.a && !r.c && !r.i && WP03_STARTERS.indexOf(String(r.task).trim()) >= 0) return;
        var ri = CODES.indexOf(r.r), ai = CODES.indexOf(r.a);
        out.raci.push({ name: String(r.task).trim(), r: ri >= 0 && ri < n ? String(ri) : '', a: ai >= 0 && ai < n ? String(ai) : '' });
      });
      if (out.raci.length) out.found.push('WP-03 (' + out.raci.length + ' job' + (out.raci.length === 1 ? '' : 's') + ')');
    }
    var got = 0;
    names.forEach(function (nm, i) {
      var e = latest('WP-02', function (x) { return x.person === i || (nm && fold(x.state.values.name) === fold(nm)); });
      if (!e) return;
      var pts = FACTOR_IDS.map(function (id) { var v = e.state.values['factors.' + id]; return v === undefined || v === null ? '' : String(v); });
      if (pts.some(function (x) { return x !== ''; })) { out.bat[i] = pts; got++; }
    });
    if (got) out.found.push(got + ' of ' + n + ' batteries');
    return out.found.length ? out : null;
  }

  global.TOLCalc01 = {
    W: W, BANDS: BANDS, WP02: WP02, MIN_PEOPLE: MIN_PEOPLE, MAX_PEOPLE: MAX_PEOPLE,
    r2: r2, f2: f2, f1: f1, fg: fg, pct: pct, num: num, sum: sum,
    balance: balance, balanceHandoff: balanceHandoff, ownership: ownership, concentration: concentration,
    battery: battery, wp02Band: wp02Band, stress: stress, retuning: retuning,
    solvency: solvency, apex: apex, band: band, BAND_NOTE: BAND_NOTE, shareWords: shareWords, suggestions: suggestions, shortfalls: shortfalls, suiteDraft: suiteDraft, hoursProblem: hoursProblem
  };
})(window);
