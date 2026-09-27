/*
  calc01-core.js — The Objective Ledger, CALC-01 "Can the load last?"
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
    bands    : 0.70 or more = holding · 0.40 up to 0.70 = drifting · below 0.40 = rethink
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

  Ownership = jobs with both a Responsible and an Accountable name ÷ all jobs.
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
    if (o < 0 || Math.floor(o) !== o || Math.floor(t) !== t) { res.error = 'Use whole numbers of jobs.'; return res; }
    if (o > t) { res.error = 'More jobs with both names (' + o + ') than jobs on the list (' + t + ').'; return res; }
    res.owned = o; res.total = t;
    res.value = o / t;
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
  // scores: array of each person's battery score (0–1) or null
  function stress(scores) {
    var res = { value: null, error: null, scores: scores, missing: [] };
    scores.forEach(function (s, i) {
      var v = num(s);
      if (v === null) res.missing.push(i);
      else if (v < 0 || v > 1) res.error = 'A battery score runs from 0 to 1 (the five answers added up, then divided by 20).';
    });
    if (res.error) return res;
    if (res.missing.length) { res.error = 'Waiting on ' + res.missing.length + ' battery score' + (res.missing.length === 1 ? '' : 's') + '. Each person fills in their own; it is never worked out for someone else.'; return res; }
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
    if (x >= BANDS.high) return { key: 'high', cls: '', label: 'Holding: the setup is carrying its own weight.', short: 'holding' };
    if (x >= BANDS.low) return { key: 'mid', cls: 'mid', label: 'Drifting: something in the setup is slipping.', short: 'drifting' };
    return { key: 'low', cls: 'low', label: 'Rethink: this setup can’t last as it is. That is about the setup, not anyone in it.', short: 'time for a kind rethink' };
  }

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
          link: ['WP-01, Who did what', '/workpapers/fill/wp-01.html'] });
      }
      out.push({ key: 'wb-all', gain: (1 - o.wb) * w.wb, full: true,
        text: 'A split that fully matches your ' + (o.balance && o.balance.mode === 'agreed' ? 'agreed shares' : 'even shares') + ' would add up to ' + fg((1 - o.wb) * w.wb) + '.' +
          (o.balance && o.balance.movedHours ? ' That means about ' + f1(o.balance.movedHours) + ' hours a week changing hands.' : '') });
    }
    if (o.oc !== null && o.ownership && o.ownership.total && o.ownership.owned < o.ownership.total) {
      var t = o.ownership.total, own = o.ownership.owned;
      out.push({ key: 'oc', gain: w.oc / t,
        text: 'Give one more job both names (who does it, who notices if it didn’t happen). Ownership would go from ' + f2(o.oc) + ' to ' + f2((own + 1) / t) + '.',
        link: ['WP-03, One owner per job', '/workpapers/fill/wp-03.html'] });
      if (t - own > 1) out.push({ key: 'oc-all', gain: (1 - o.oc) * w.oc, full: true,
        text: 'Naming owners for all ' + (t - own) + ' unowned jobs would add ' + fg((1 - o.oc) * w.oc) + '. Keep them on the list until they have names; deleting them only hides them.' });
    }
    if (o.as !== null && o.as > 0) {
      var drop = Math.min(0.10, o.as);
      out.push({ key: 'as', gain: drop * w.as,
        text: 'If the average battery came down by ' + f2(drop) + ' (about ' + f1(drop * 20) + ' points on each person’s 20-point check), the score would rise by ' + fg(drop * w.as) + '. That usually comes from outside the chore list: a lighter week elsewhere, more sleep, less rushing.',
        link: ['WP-02, the battery check', '/workpapers/fill/wp-02.html'] });
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

  global.TOLCalc01 = {
    W: W, BANDS: BANDS, WP02: WP02, MIN_PEOPLE: MIN_PEOPLE, MAX_PEOPLE: MAX_PEOPLE,
    r2: r2, f2: f2, f1: f1, fg: fg, pct: pct, num: num, sum: sum,
    balance: balance, balanceHandoff: balanceHandoff, ownership: ownership,
    battery: battery, wp02Band: wp02Band, stress: stress, retuning: retuning,
    solvency: solvency, apex: apex, band: band, suggestions: suggestions, shortfalls: shortfalls
  };
})(window);
