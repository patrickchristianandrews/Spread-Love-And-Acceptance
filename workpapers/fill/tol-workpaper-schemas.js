/*
  tol-workpaper-schemas.js — The Objective Ledger (TOL-OS)
  Field-by-field definitions of the fill-in workpapers, taken from the
  manuscript source files. The engine in tol-workpaper.js renders the form
  and the PDF from these definitions.

  Column / field types: text, textarea, number, date, select, person, check, computed.
  "person" columns offer every person named at the top of the page (2 to 8,
  coded A to H), in alphabetical order, and optionally "Both" (shown as
  "Everyone" when there are more than two). Tables with fixedRows ['@A', '@B']
  get one row per person.

  TOL_WORKPAPER_VARIANT(key, road) returns a copy of a worksheet worded for a
  road (e.g. WP-03 for coworkers, roommates or caregivers), or null.
*/
(function (global) {
  'use strict';

  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  // Everyday feeling words for WP-09 (tap one to add it). About you, never a verdict about them.
  var FEELINGS = ['tired', 'rushed', 'frustrated', 'unseen', 'taken for granted', 'overwhelmed', 'stretched thin', 'worried', 'hurt', 'disappointed', 'left out', 'alone with it', 'confused', 'embarrassed', 'annoyed', 'sad', 'on edge', 'relieved', 'hopeful', 'grateful'];

  // Rounded the CALC-01 way (see /assets/js/calc01-core.js), so a number and its band always agree.
  function fmt(n, d) { return (Math.round(n * Math.pow(10, d) + 1e-7) / Math.pow(10, d)).toFixed(d); }
  function r2(n) { return Math.round(n * 100 + 1e-7) / 100; }
  // CALC-01 balance for 2 to 8 people against an even split. Uses the shared calc01-core.js when the
  // page loads it; the fallback below is the same formula: 1 − (½Σ|share − 1/n|) ÷ (1 − 1/n).
  function balanceOf(amounts) {
    if (global.TOLCalc01) return global.TOLCalc01.balance(amounts).value;
    var n = amounts.length, total = amounts.reduce(function (a, b) { return a + b; }, 0);
    if (n < 2 || !(total > 0)) return null;
    var moved = amounts.reduce(function (a, x) { return a + Math.abs(x / total - 1 / n); }, 0) / 2;
    return Math.max(0, Math.min(1, 1 - moved / (1 - 1 / n)));
  }
  // The busiest person's share of something (owned jobs, logged minutes). The same check as
  // TOLCalc01.concentration: flagged at half or more, and 20 points over an even share.
  function concentrationOf(values, min) {
    if (global.TOLCalc01 && global.TOLCalc01.concentration) return global.TOLCalc01.concentration(values, min);
    var v = values.map(function (x) { return x > 0 ? x : 0; }), n = v.length, total = v.reduce(function (a, b) { return a + b; }, 0);
    var res = { n: n, total: total, top: null, count: null, share: null, flag: false, line: n ? Math.max(0.5, 1 / n + 0.2) : null };
    if (n < 2 || !(total > 0)) return res;
    var top = 0; v.forEach(function (x, i) { if (x > v[top]) top = i; });
    res.top = top; res.count = v[top]; res.share = v[top] / total;
    res.flag = total >= (min || 0) && r2(res.share) >= r2(res.line);
    return res;
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  // A number from a box, or null when it is blank or outside lo..hi (so it is left out, never guessed).
  function inRange(v, lo, hi) { if (v === '' || v == null) return null; var n = parseFloat(v); return isFinite(n) && n >= lo && n <= hi ? n : null; }
  function outOfRange(v, lo, hi) { return v !== '' && v != null && inRange(v, lo, hi) === null; }
  // End a piece of someone's writing with a full stop, so fact, feeling and ask read as sentences.
  function sentence(t, ask) {
    t = String(t || '').trim();
    if (!t) return '';
    t = t.charAt(0).toUpperCase() + t.slice(1);
    if (/[.!?…”"')]$/.test(t)) return t;
    return t + (ask && /^(could|can|would|will|shall|may|do|does|is|are)\b/i.test(t) ? '?' : '.');
  }
  // "tired" or "Rushed" reads as "I feel tired." A whole sentence stays as it was written.
  function feelingSentence(t) {
    t = String(t || '').trim();
    if (!t) return '';
    if (!/^(i|i'm|i’m|im|i've|i’ve|my|we|we're|we’re|it|this|that|feeling|felt)\b/i.test(t) && t.split(/\s+/).length <= 5) t = 'I feel ' + t.charAt(0).toLowerCase() + t.slice(1);
    return sentence(t);
  }

  var W = {};

  /* ------------------------------------------------------------------ WP-01 */
  W['wp-01'] = {
    code: 'WP-01',
    title: 'Field Audit & Neutral Refusals',
    plain: 'Who did what',
    slug: 'Field-Audit',
    purpose: "Write down what actually happened this week, before anyone starts remembering it as a story. Fill it in together, or each keep your own copy and compare at the end of the week. Either way, write down only what you did or saw yourself; never fill in someone else's side for them.",
    people: true,
    meta: [
      { id: 'weekOf', label: 'Week beginning', type: 'date' }
    ],
    sections: [
      {
        id: 'audit', type: 'table', title: 'Part A: Who did what, this week',
        intro: 'A plain log kept for 5–7 days, written down before anyone decides what it means. Add one row for each task noticed or done, including the invisible ones: remembering, planning, booking, forms. Log what happened, not what should have happened.',
        library: 'task',
        addLabel: 'Add a row',
        columns: [
          { id: 'day', label: 'Day', type: 'select', options: DAYS, w: 0.7, prefill: true },
          { id: 'task', label: 'Task noticed or done', type: 'text', w: 3 },
          { id: 'who', label: 'Who did it', type: 'person', both: true, w: 1.3 },
          { id: 'minutes', label: 'Minutes (rough)', type: 'number', w: 0.9, min: 0, max: 1440, step: '5', rangeNote: 'Minutes run from 0 to 1,440 (a whole day) in one row. Split a longer job into one row per day.' },
          { id: 'how', label: 'Asked for, or noticed and handled?', type: 'select', options: ['Asked for', 'Noticed and handled'], w: 1.7 }
        ],
        defaultRows: DAYS.map(function (d) { return { day: d }; })
      },
      {
        id: 'totals', type: 'computed', title: "This week's totals",
        compute: function (ctx) {
          var people = ctx.people(), t = {}, noticed = {}, bad = [];
          people.forEach(function (p) { t[p] = 0; noticed[p] = 0; });
          ctx.rows('audit').forEach(function (r) {
            var m = parseFloat(r.minutes);
            if (outOfRange(r.minutes, 0, 1440)) { bad.push(r.task || 'a row'); return; }
            if (!r.who || !(m > 0)) return;
            var share = {};
            if (r.who === 'Both') people.forEach(function (p) { share[p] = m / people.length; });
            else if (t.hasOwnProperty(r.who)) share[r.who] = m;
            Object.keys(share).forEach(function (p) {
              t[p] += share[p];
              if (r.how === 'Noticed and handled') noticed[p] += share[p];
            });
          });
          var total = people.reduce(function (a, p) { return a + t[p]; }, 0);
          var left = bad.length ? { label: 'Left out', value: plural(bad.length, 'row') + ' (' + bad.slice(0, 3).join(', ') + (bad.length > 3 ? ' and ' + (bad.length - 3) + ' more' : '') + '): minutes need to be between 0 and 1,440 (a whole day) in one row.', note: 'Nothing is guessed. Fix the number and the totals update.' } : null;
          if (!total) return [{ label: 'Totals', value: 'Add rows with a person and minutes to see the totals.' }].concat(left ? [left] : []);
          var pct = {};
          people.forEach(function (p) { pct[p] = t[p] / total * 100; });
          // 1 = an even split; 0 = one person logged everything. With two people this is 1 - |A% - B%|;
          // with more, 1 - (the share of time that would have to change hands) / (the most it could be).
          var balance = balanceOf(people.map(function (p) { return t[p]; }));
          var out = people.map(function (p) {
            return { label: ctx.name(p), value: fmt(t[p], 0) + ' minutes (' + fmt(pct[p], 0) + '%), of which ' + fmt(noticed[p], 0) + ' noticed and handled without being asked' };
          });
          out.push({ label: 'Workload balance score', value: fmt(balance, 2), note: 'Enter this as the workload balance number in CALC-01. It describes how the logged work was split this week, not anyone in it.' + (people.length > 2 ? ' With more than two people, it is 1 minus the share of the week\'s time that would have to change hands for an even split, divided by the most that could ever be.' : '') });
          // Who is carrying the most, next to the balance: the logged minutes, and the unasked-for ones
          var cm = concentrationOf(people.map(function (p) { return t[p]; }), 60);
          var cn = concentrationOf(people.map(function (p) { return noticed[p]; }), 60);
          if (cm.flag) out.push({ label: 'Busiest person', value: ctx.name(people[cm.top]) + ' logged ' + fmt(cm.share * 100, 0) + '% of the minutes. An even share would be ' + fmt(100 / people.length, 0) + '% each.', note: 'A fact about how this week fell, not about effort or care. One question is enough: which job would they most like to hand over?' });
          if (cn.flag) out.push({ label: 'Unasked-for work', value: ctx.name(people[cn.top]) + ' did ' + fmt(cn.share * 100, 0) + '% of the work that was noticed and handled without anyone asking.', note: 'This is the work that is easiest to miss. Say it out loud, and give the jobs that repeat a named owner on WP-03.' });
          if (left) out.push(left);
          return out;
        }
      },
      {
        id: 'refusals', type: 'table', title: 'Part B: Neutral refusals we want to try', optional: true,
        intro: 'Optional. Draft a "not right now" for a real situation in three steps: say why the request is fair, say honestly what you have left, and offer something instead.',
        addLabel: 'Add a refusal',
        columns: [
          { id: 'kind', label: 'Type', type: 'select', options: ['Capacity check', 'Delegation pivot', 'Time commitment'], w: 1.2 },
          { id: 'ack', label: 'Acknowledge', type: 'textarea', w: 2 },
          { id: 'cap', label: 'State capacity', type: 'textarea', w: 2 },
          { id: 'alt', label: 'Offer an alternative', type: 'textarea', w: 2 }
        ],
        defaultRows: [{}]
      },
      {
        id: 'signoff', type: 'table', title: 'Sign-off',
        fixedRows: ['Filled in by', 'Looked over by'],
        columns: [
          { id: 'name', label: 'Name', type: 'text', w: 2 },
          { id: 'date', label: 'Date', type: 'date', w: 1.3 }
        ]
      }
    ]
  };

  /* ------------------------------------------------------------------ WP-02 */
  var WP02_FACTORS = [
    { id: 'sleep', label: 'Sleep debt (less rested than usual)' },
    { id: 'work', label: 'Workload elsewhere (job, school, caregiving)' },
    { id: 'conflict', label: 'Recent unresolved conflict (any source)' },
    { id: 'physical', label: 'Physical state (hungry, sick, in pain)' },
    { id: 'time', label: 'Time pressure today specifically' }
  ];
  function wp02Score(ctx) {
    var sum = 0, answered = 0;
    WP02_FACTORS.forEach(function (f) {
      var v = inRange(ctx.value('factors.' + f.id), 0, 4);
      if (v !== null) { sum += v; answered++; }
    });
    return answered === WP02_FACTORS.length ? sum / 20 : null;
  }
  // Six readings inside the three bands (light under 0.30, medium 0.30 to 0.59, high 0.60 and up),
  // so the words move with the number. Higher always means more load.
  function wp02Words(sb, solo) {
    if (sb < 0.15) return 'Very light load. Not much is left over from before today, so whatever comes up is probably about the thing itself.';
    if (sb < 0.30) return 'Light load. Whatever is coming up is probably about the thing itself.';
    if (sb < 0.45) return 'Medium load, on the lighter side. You\'re carrying a bit more than usual. Fine for most things; go gently with anything big.';
    if (sb < 0.60) return solo ? 'Medium load, on the heavier side. Go gently, and leave big decisions for when you have more room.' : 'Medium load, on the heavier side. Before a hard conversation, it\'s worth saying out loud: "Heads up, I\'m carrying more than usual today."';
    if (sb < 0.80) return 'High load. Put off anything that doesn\'t need deciding in the next hour. If you need to settle first, the Calm-Down Kit (WP-11) is made for this.';
    return solo ? 'Very high load. Today is for looking after yourself and the basics. Let anything that can wait, wait, and pick a time to come back to it.' : 'Very high load. Today is for looking after yourself and the basics. Say "not today" to anything that can wait, and name a time instead.';
  }
  // solo: worded for one person on their own, with no shared average
  function wp02Reading(solo) {
    return function (ctx) {
      var s = wp02Score(ctx);
      if (s === null) return [{ label: 'Score', value: 'Answer all five rows to see your score.' }];
      var sb = r2(s);
      var out = [{ label: 'Load score', value: fmt(s, 2) + ' (the five scores added up, then divided by 20; higher means more load)' }, { label: 'Reading', value: wp02Words(sb, solo), note: 'Under 0.30 is a light load, 0.30 to 0.59 medium, 0.60 and up high.' }];
      var top = WP02_FACTORS.filter(function (f) { return Number(ctx.value('factors.' + f.id)) >= 3; }).map(function (f) { return f.label.replace(/\s*\(.*\)$/, '').replace(/ specifically$/, '').toLowerCase(); });
      if (top.length) out.push({ label: 'Filled most by', value: top.join(', ') + '.', note: 'Conditions, not character. Some of them are in your control this week; some are just weather.' });
      if (solo) return out;
      // everyone else's shared scores ("0.4, 0.55, 0.3"); the average covers everyone on the road, or waits
      var raw = String(ctx.value('partnerScore') || '').split(/[,;\s]+/).filter(Boolean), others = raw.map(parseFloat);
      var bad = raw.filter(function (x, i) { return !(others[i] >= 0 && others[i] <= 1); });
      var road = parseInt(ctx.value('roadPeople'), 10);
      if (bad.length) out.push({ label: 'Left out', value: bad.join(', ') + (bad.length === 1 ? ' is' : ' are') + ' not between 0 and 1, so the average waits.', note: 'Each score is five answers added up and divided by 20, so it runs from 0 to 1 (for example 0.45).' });
      else if (others.length) {
        var all = [s].concat(others), avg = all.reduce(function (a, b) { return a + b; }, 0) / all.length;
        if (road > 1 && all.length < road) out.push({ label: 'Average for CALC-01', value: 'Waiting: ' + all.length + ' of ' + road + ' scores are in.', note: 'The shared average is never worked out while anyone\'s score is missing, or for someone else. It appears here once all ' + road + ' are in.' });
        else if (road > 1 && all.length > road) out.push({ label: 'Average for CALC-01', value: 'There are ' + all.length + ' scores here, and ' + road + ' people on your road.', note: 'Check the list of scores: one may be in twice.' });
        else out.push({ label: 'Average for CALC-01', value: fmt(avg, 2) + ' (' + all.length + ' people)', note: 'The average of everyone\'s scores is the stress number in CALC-01 (how stretched you all are).' + (road > 1 ? '' : ' Make sure every person on your road is included: it is never worked out while anyone\'s is missing, or from one person alone.') });
      }
      return out;
    };
  }
  W['wp-02'] = {
    code: 'WP-02',
    title: 'The Battery & Stress Meter',
    plain: 'How much are you carrying?',
    slug: 'Battery-Stress-Meter',
    purpose: 'A one-minute check that each person fills in about themselves. It separates "How much am I already carrying?" from "How upset am I about this one thing?" Higher numbers mean more load. It is not a clinical test, just a structured gut-check.',
    people: false,
    perPerson: true,
    meta: [
      { id: 'name', label: 'Your name', type: 'text' },
      { id: 'date', label: 'Date', type: 'date' }
    ],
    sections: [
      {
        type: 'note', pdf: false,
        text: "Fill this in on your own, about yourself only. Never fill it in for someone else."
      },
      {
        id: 'factors', type: 'scale', title: 'The checklist',
        intro: 'Score each row based on how the last 24–48 hours have actually gone.',
        min: 0, max: 4, anchors: ['Not at all', 'Very true'],
        items: WP02_FACTORS
      },
      {
        id: 'reading', type: 'computed', title: 'Your load score',
        compute: wp02Reading(false)
      },
      {
        id: 'extra', type: 'fields', title: 'Optional',
        fields: [
          { id: 'roadPeople', label: 'How many people are on your road, counting you?', type: 'number', min: 1, max: 8, step: '1', prefill: true, help: 'So the shared average waits until everyone\'s score is in.' },
          { id: 'partnerScore', label: "Everyone else's scores, if they've shared them (0–1 each, separated by commas)", type: 'text', placeholder: 'e.g. 0.45, 0.30' },
          { id: 'note', label: 'Anything you want to name before talking', type: 'textarea' }
        ]
      },
      {
        type: 'note', pdf: true,
        text: 'A high score is a way to press pause, not a way out. It means "let\'s come back to this tomorrow," not "this doesn\'t need to happen."'
      }
    ]
  };

  /* ------------------------------------------------------------------ WP-03 */
  W['wp-03'] = {
    code: 'WP-03',
    title: 'RACI Treaty',
    plain: 'One owner per job',
    slug: 'RACI-Treaty',
    purpose: 'A living agreement that gives every regular household job exactly one Responsible name and one Accountable name, so nobody has to re-decide who owns what every week. Responsible does the task. Accountable notices if it didn\'t get done and follows up. They can be the same person.',
    people: true,
    meta: [
      { id: 'reviewDate', label: 'Treaty date', type: 'date' }
    ],
    sections: [
      {
        type: 'note', pdf: false,
        text: "Use this after your first full week of Who did what (WP-01), and fill it in from what that week's log actually showed. Remove any rows that don't apply to your household, and add the ones that do, including the invisible ones: forms, gifts, renewals, planning."
      },
      {
        id: 'treaty', type: 'table', title: 'Who owns each job',
        addLabel: 'Add a task',
        library: 'owner',
        columns: [
          { id: 'task', label: 'Task', type: 'text', w: 2.3 },
          { id: 'freq', label: 'Frequency', type: 'select', options: ['Daily', 'Weekly', 'Monthly', 'As needed', 'Ongoing'], w: 1.1 },
          { id: 'r', label: 'Responsible', type: 'person', w: 1.1 },
          { id: 'a', label: 'Accountable', type: 'person', w: 1.1 },
          { id: 'notes', label: 'Notes', type: 'text', w: 2 }
        ],
        defaultRows: [
          { task: 'Groceries', freq: 'Weekly' }, { task: 'Cooking', freq: 'Daily' }, { task: 'Dishes', freq: 'Daily' },
          { task: 'Laundry', freq: 'Weekly' }, { task: 'Bills & scheduling', freq: 'Monthly' },
          { task: 'Cleaning (bathroom/kitchen)', freq: 'Weekly' }, { task: 'Pet care', freq: 'Daily' },
          { task: 'Car maintenance', freq: 'As needed' }, { task: 'Social/family calendar', freq: 'Ongoing' },
          { task: 'Emotional check-ins', freq: 'Weekly' }
        ]
      },
      {
        id: 'clarity', type: 'computed', title: 'Ownership clarity',
        compute: function (ctx) {
          var rows = ctx.rows('treaty').filter(function (r) { return r.task; });
          if (!rows.length) return [{ label: 'Ownership clarity score', value: 'Add tasks to see the score.' }];
          var clear = rows.filter(function (r) { return r.r && r.a; });
          var missing = rows.filter(function (r) { return !(r.r && r.a); }).map(function (r) { return r.task; });
          // how the Responsible names are spread: clarity can read 1.00 with one person holding everything
          var people = ctx.people(), byR = people.map(function (p) { return rows.filter(function (r) { return r.r === p; }).length; });
          var c = concentrationOf(byR, 3), named = byR.reduce(function (a, b) { return a + b; }, 0);
          var out = [{ label: 'Ownership clarity score', value: fmt(clear.length / rows.length, 2) + ' (' + clear.length + ' of ' + rows.length + ' tasks have both names)', note: 'Enter this as the ownership clarity number in CALC-01.' + (c.flag ? ' Clarity only asks whether every job has a name, so read it next to "Busiest person" below.' : '') }];
          if (missing.length) out.push({ label: 'Still needs an owner', value: missing.join(', ') });
          if (c.flag) out.push({ label: 'Busiest person', value: ctx.name(people[c.top]) + ' is Responsible for ' + c.count + ' of the ' + named + ' jobs with a Responsible name (' + fmt(c.share * 100, 0) + '%). An even share would be ' + fmt(100 / people.length, 0) + '%.', note: 'Clear, but leaning on one person. Jobs drift to whoever is reliable and settle there. Ask which one they would hand over first.' });
          else if (people.length >= 2 && named >= 3) out.push({ label: 'How the jobs are spread', value: people.map(function (p, i) { return ctx.name(p) + ' ' + byR[i]; }).join(', ') + ' (Responsible).' });
          return out;
        }
      },
      {
        id: 'amendments', type: 'table', title: 'Changes to the treaty', optional: true,
        intro: 'When life changes, rework the agreement in writing, instead of letting jobs drift to whoever started doing more. Anyone on it can ask for a review at a weekly check-in, or at the monthly look-back (WP-04).',
        addLabel: 'Add a change',
        columns: [
          { id: 'date', label: 'Date', type: 'date', w: 1.1 },
          { id: 'change', label: 'What changed', type: 'textarea', w: 3.5 },
          { id: 'initA', label: 'Initials', type: 'text', w: 0.9 },
          { id: 'initB', label: 'More initials', type: 'text', w: 0.9 }
        ],
        defaultRows: [{}]
      },
      {
        type: 'note', pdf: true,
        text: 'Initialing confirms that everyone on it has read the current version and agrees to who owns what, as written. It doesn\'t mean every task feels perfectly fair. It only means ownership is clear.'
      },
      {
        id: 'ratify', type: 'table', title: 'Signing off',
        fixedRows: ['@A', '@B'],
        columns: [
          { id: 'initials', label: 'Initials', type: 'text', w: 1.5 },
          { id: 'date', label: 'Date', type: 'date', w: 1.5 }
        ]
      }
    ]
  };

  /* ------------------------------------------------------------------ WP-04 */
  function flagged(r) { return ['w1', 'w2', 'w3', 'w4'].filter(function (k) { return r[k]; }).length; }
  W['wp-04'] = {
    code: 'WP-04',
    title: 'Deficit Audit',
    plain: 'The monthly look-back',
    slug: 'Deficit-Audit',
    purpose: 'A monthly look-back, done together, across four weeks of Who did what (WP-01) and One owner per job (WP-03). It looks for the tasks that keep slipping. The goal is not to tally what anyone owes, but to find where the setup needs a fix.',
    people: true,
    meta: [
      { id: 'month', label: 'Month', type: 'text', placeholder: 'e.g. September 2026' }
    ],
    sections: [
      {
        id: 'raw', type: 'table', title: "Part A: Gather the month's notes",
        intro: 'From your four weeks of Who did what, list every task that was logged as noticed but not done, or done only after being raised more than once. Check off each week it came up. A task flagged 3–4 times is a real pattern, not a fluke.',
        addLabel: 'Add a task',
        columns: [
          { id: 'task', label: 'Task', type: 'text', w: 3 },
          { id: 'w1', label: 'Week 1', type: 'check', w: 0.7, pdfTrue: 'X' },
          { id: 'w2', label: 'Week 2', type: 'check', w: 0.7, pdfTrue: 'X' },
          { id: 'w3', label: 'Week 3', type: 'check', w: 0.7, pdfTrue: 'X' },
          { id: 'w4', label: 'Week 4', type: 'check', w: 0.7, pdfTrue: 'X' },
          { id: 'times', label: 'Times flagged', type: 'computed', w: 0.9, compute: function (r) { return r.task ? String(flagged(r)) : ''; } }
        ],
        defaultRows: [{}, {}, {}]
      },
      {
        id: 'classify', type: 'table', title: 'Part B: Sort each gap',
        intro: 'Sort every task flagged twice or more. A structural gap has no clear owner, or the named owner isn\'t the one who actually handles it (fix One owner per job, WP-03, in this session). A capacity issue has an owner who can\'t keep up (set a time for an honest conversation). A one-off has a temporary cause (note it and move on).',
        addLabel: 'Add a task',
        pull: {
          label: 'Bring in tasks flagged twice or more from Part A',
          from: function (ctx) {
            return ctx.rows('raw').filter(function (r) { return r.task && flagged(r) >= 2; }).map(function (r) { return { task: r.task }; });
          },
          key: 'task'
        },
        columns: [
          { id: 'task', label: 'Task', type: 'text', w: 2.2 },
          { id: 'owner', label: 'Named owner on WP-03?', type: 'select', options: ['Yes', 'No'], w: 1 },
          { id: 'kind', label: 'Classification', type: 'select', options: ['Structural gap', 'Capacity issue', 'One-off, no action'], w: 1.5 },
          { id: 'action', label: 'Action', type: 'text', w: 2.3 }
        ],
        defaultRows: [{}]
      },
      {
        id: 'close', type: 'computed', title: 'Part C: Wrap up the audit',
        compute: function (ctx) {
          var c = { 'Structural gap': 0, 'Capacity issue': 0, 'One-off, no action': 0 };
          ctx.rows('classify').forEach(function (r) { if (r.task && c.hasOwnProperty(r.kind)) c[r.kind]++; });
          return [
            { label: 'Structural gaps found', value: String(c['Structural gap']), note: c['Structural gap'] ? 'Update One owner per job (WP-03) for each of these in this session.' : '' },
            { label: 'Capacity issues found', value: String(c['Capacity issue']), note: c['Capacity issue'] ? 'Set a time for the conversation. This audit brings it to light, but it doesn\'t replace it.' : '' },
            { label: 'One-offs', value: String(c['One-off, no action']) },
            { label: 'Reading the count', value: 'A number of structural gaps that falls month after month is the clearest sign the program is working. A rising number means something bigger changed.' }
          ];
        }
      },
      {
        id: 'thanks', type: 'table', title: 'Part D (optional): Thanked, or only noticed when it\'s missed?', optional: true,
        intro: 'Pillar V, Notice the quiet incentives. Some jobs only get noticed on the day they don\'t happen. Name a few, say how often they get thanked, and pick one small way to notice them while they\'re still being done.',
        addLabel: 'Add a job',
        columns: [
          { id: 'job', label: 'Job', type: 'text', w: 2.2 },
          { id: 'thanked', label: 'Gets thanked', type: 'select', options: ['Often', 'Sometimes', 'Rarely', 'Never'], w: 1.1 },
          { id: 'missed', label: 'Only noticed when missed?', type: 'select', options: ['Yes', 'No'], w: 1.1 },
          { id: 'notice', label: 'One way to notice it', type: 'text', w: 2.2 }
        ],
        defaultRows: [{}]
      },
      {
        type: 'note', pdf: true,
        text: 'Not a bill for the past, and not a performance review. A task with no owner is a gap in the setup, not a verdict on the person who kept covering it.'
      },
      {
        id: 'signoff', type: 'table', title: 'Sign-off',
        fixedRows: ['@A', '@B'],
        columns: [
          { id: 'initials', label: 'Initials', type: 'text', w: 1.5 },
          { id: 'date', label: 'Date', type: 'date', w: 1.5 }
        ]
      }
    ]
  };

  /* ------------------------------------------------------------------ WP-09 */
  W['wp-09'] = {
    code: 'WP-09',
    title: 'Tone Filter',
    plain: 'Say it so it lands',
    slug: 'Tone-Filter',
    purpose: 'A self-check each of you uses on your own side of a conversation. It helps you turn a raw reaction into something the other person can actually take in, and weigh a message you received before you react to it. Nothing here records or analyzes anyone\'s voice.',
    people: false,
    meta: [
      { id: 'name', label: 'Your name', type: 'text' },
      { id: 'date', label: 'Date', type: 'date' }
    ],
    sections: [
      {
        id: 'transducer', type: 'fields', title: 'Before you speak or send: fact, feeling, ask',
        intro: 'Use it on one thing that actually stung.',
        fields: [
          { id: 'raw', label: 'Raw reaction', type: 'textarea', help: 'Optional, and just for you. It is left out of the PDF unless you check the box.', privateOptIn: 'Include the raw reaction in the PDF' },
          { id: 'fact', label: "What's the fact underneath this? (One sentence, no adjectives.)", type: 'textarea', help: 'For example: "The bins went out late on Tuesday." One event, no "always" or "you never".' },
          { id: 'feeling', label: "What's the feeling underneath this? (Frustrated, tired, unseen, rushed…)", type: 'textarea', chips: FEELINGS, chipsLabel: 'Tap a word to add it', help: 'For example: "I felt rushed and a bit alone with it." A feeling about you, not a verdict about them.' },
          { id: 'ask', label: "What's the actual ask? (What do you want to happen next, specifically?)", type: 'textarea', help: 'For example: "Could we set a reminder for Monday nights?" Something the other person can say yes to.' }
        ]
      },
      {
        id: 'filter', type: 'checks', title: 'Before you react: four quick checks',
        items: [
          { id: 'specific', label: 'Is this about a specific, nameable task or event?', options: ['Yes', 'No'] },
          { id: 'saturation', label: "Would I read this the same way if my battery weren't already running high (WP-02)?", options: ['Yes', 'No', 'Not sure'] },
          { id: 'neutral', label: 'Is there a neutral interpretation that also fits what was said?', options: ['Yes', 'No'] },
          { id: 'pattern', label: 'Am I responding to their words, or to a pattern from a past conversation?', options: ['Their words', 'A past pattern'] }
        ]
      },
      {
        id: 'result', type: 'computed', title: 'What to do next',
        compute: wp09Result(false)
      }
    ]
  };
  // solo: worded for one person sorting out their own reaction
  var ABSOLUTE = /\b(always|never|every single time|every time|constantly|you people)\b/i;
  function lower1(t) { return t ? t.charAt(0).toLowerCase() + t.slice(1) : t; }
  function wp09Result(solo) {
    return function (ctx) {
      var out = [];
      var fact = String(ctx.value('fact') || '').trim(), feeling = String(ctx.value('feeling') || '').trim(), ask = String(ctx.value('ask') || '').trim();
      var F = sentence(fact), E = feelingSentence(feeling), A = sentence(ask, true);
      if (fact || feeling || ask) {
        out.push({ label: solo ? 'Fact, feeling and ask' : 'Your message, in order', value: [F && ('Fact: ' + F), E && ('Feeling: ' + E), A && ('Ask: ' + A)].filter(Boolean).join('\n') });
        var missing = [!fact && 'the fact', !feeling && 'the feeling', !ask && 'the ask'].filter(Boolean);
        if (missing.length && missing.length < 3) out.push({ label: 'Still to write', value: missing.join(' and ') + '. The part that is hardest to write is usually the one that matters most.' });
      }
      // two or three ways to say it, built only from what you wrote
      if (fact && ask && !solo) {
        var ways = [F + (E ? ' ' + E : '') + ' ' + A, A + ' ' + F, 'Quick one, no rush: ' + lower1(A.replace(/[.?!]$/, '')) + '?'];
        out.push({ label: 'Ways to say it', value: ways.map(function (w, i) { return (i + 1) + '. ' + w; }).join('\n'), note: 'The first is the gentle order. The second puts the ask first, for someone who likes the headline. The third is the short text version. Use whichever fits the person you are talking to.' });
      } else if (fact && feeling && solo) {
        out.push({ label: 'Said kindly to yourself', value: F + ' ' + E + (A ? ' ' + A : ' What would help right now?'), note: 'Written down, a sting usually shrinks to its real size.' });
      }
      if (ABSOLUTE.test(fact + ' ' + feeling + ' ' + ask)) out.push({ label: 'One small change', value: 'Swap "always" or "never" for the one time it happened. One event is much easier to hear than a pattern.' });
      // one suggestion for each check that points to a pause, instead of one general one
      var sat = ctx.value('filter.saturation'), neu = ctx.value('filter.neutral'), pat = ctx.value('filter.pattern'), spec = ctx.value('filter.specific');
      var answered = [spec, sat, neu, pat].filter(Boolean).length, tips = [];
      if (spec === 'No') tips.push(solo ? 'Name one specific task or event first. One thing is much easier to work with than a whole pattern.' : 'Name one specific task or event first. A message about a pattern is much harder to hear than one about a single thing.');
      if (sat === 'No' || sat === 'Not sure') tips.push('Your own load is part of how this reads. Check it with WP-02, and come back when the number is lower. A few hours, or a night\'s sleep, often changes how it reads.');
      if (neu === 'Yes') tips.push(solo ? 'There\'s a kinder reading that also fits. Hold both for a moment before you decide which one is true.' : 'There\'s a kinder reading that also fits. Try asking about it first: "Did you mean ___, or ___?"');
      if (pat === 'A past pattern') tips.push(solo ? 'This may be touching an old pattern, not just what happened now. Name the one event, and leave the history for another day.' : 'This may be touching an older pattern, not just these words. Name the one event, and leave the history for another day.');
      if (!answered) out.push({ label: 'Before you send', value: 'Answer the four checks to see a suggestion.' });
      else if (tips.length) out.push({ label: tips.length === 1 ? 'Suggestion' : 'Suggestions', value: tips.join('\n'), note: (answered < 4 ? plural(4 - answered, 'check') + ' still unanswered. ' : '') + (solo ? 'If a request is behind it, a kind "not right now" (WP-01) can buy you time.' : 'Pausing is not avoiding: a kind "not right now" (WP-01) and a time to come back keeps it honest.') });
      else if (answered < 4) out.push({ label: 'Before you send', value: 'So far so good. Answer the ' + plural(4 - answered, 'check') + ' still open before you decide.' });
      else out.push({ label: 'Suggestion', value: (solo ? 'You\'re clear to go ahead. Let the fact, the feeling and the ask guide what you do next.' : 'You\'re clear to respond. Build your reply from the fact, the feeling and the ask.') + (fact && ask ? '' : ' Finish the message first: ' + [!fact && 'the fact', !ask && 'the ask'].filter(Boolean).join(' and ') + ' still to write.') });
      return out;
    };
  }

  /* ------------------------------------------------------------------ WP-11 */
  var WP11_TACTICS = ['Asymmetric breathing (4 in, 6 out)', 'Naming the room (5-4-3)', 'Weight and pressure', 'Gating (lower the lights, step out)', 'Walking it out', 'Low, steady sound'];
  // solo: "pick things back up" rather than "go back in" to a conversation
  function wp11Next(solo) {
    return function (ctx) {
      var all = ctx.rows('reentry'), bad = all.filter(function (r) { return outOfRange(r.before, 0, 1) || outOfRange(r.after, 0, 1); });
      var rows = all.filter(function (r) { return inRange(r.after, 0, 1) !== null && !outOfRange(r.before, 0, 1); });
      var left = bad.length ? [{ label: 'Left out', value: plural(bad.length, 'reading') + ' with a number outside 0 to 1.', note: 'These are WP-02 load scores: the five answers added up and divided by 20, so they run from 0 to 1 (for example 0.45).' }] : [];
      if (!rows.length) return [{ label: 'Coming back', value: 'Add a before-and-after reading to see where you are.' }].concat(left);
      var a = inRange(rows[rows.length - 1].after, 0, 1);
      var band = a < 0.5 ? (solo ? 'Under 0.50: pick things back up, at the time you named.' : 'Under 0.50: go back in, at the time you named.')
        : a < 0.6 ? '0.50 to 0.60: do a second round, with the same calming step or the other one.'
          : (rows.length >= 2 ? '0.60 or above after two rounds: put it off to a specific time. "Tomorrow after dinner" is a real plan; "later" is not.' : '0.60 or above: do a second round first.');
      return [{ label: 'Latest reading', value: fmt(a, 2) }, { label: 'Next', value: band, note: 'When you come back, start with one small, simple task, like putting the dishes away. (0.50 is the come-back line for settling. It sits inside WP-02\'s medium range on purpose: you don\'t need a light load to come back, just less than half.)' }].concat(left);
    };
  }
  W['wp-11'] = {
    code: 'WP-11',
    title: 'The Calm-Down Kit',
    plain: 'The Calm-Down Kit',
    slug: 'Calm-Down-Kit',
    purpose: 'A short plan, made ahead of time, for calming your body down enough to have the conversation, or to put it off honestly. Everyone fills in their own kit, about themselves. Fill in Part A on an ordinary day, not a hard one.',
    people: false,
    perPerson: true,
    meta: [
      { id: 'name', label: 'Whose kit is this? (your name)', type: 'text' },
      { id: 'date', label: 'Date', type: 'date' }
    ],
    sections: [
      {
        type: 'note', pdf: false,
        text: 'This kit is about you. When several people share a road, each person fills in their own; it is never something to fill in for someone else.'
      },
      {
        id: 'triggers', type: 'table', title: 'Part A: What tends to start it',
        intro: 'Name the two or three that actually keep coming up for you. Be specific rather than broad. Then note where your body feels it first: jaw, shoulders, shallow breathing, cold hands.',
        addLabel: 'Add a trigger',
        columns: [
          { id: 'trigger', label: 'What tends to start it', type: 'text', w: 2.5 },
          { id: 'body', label: 'How it shows up in my body first', type: 'text', w: 2.5 }
        ],
        defaultRows: [{}, {}, {}]
      },
      {
        id: 'defaults', type: 'fields', title: 'Part A: My two defaults',
        intro: 'Pick two calming steps from the list now, so you don\'t have to choose in the moment.',
        fields: [
          { id: 'first', label: 'First default', type: 'select', options: WP11_TACTICS },
          { id: 'second', label: "Second, if the first isn't available", type: 'select', options: WP11_TACTICS }
        ]
      },
      {
        id: 'lines', type: 'table', title: 'Part A: My pause line',
        intro: 'One sentence, agreed now, so a pause isn\'t mistaken for walking out. Say how you are, how long you need, and when you\'ll be back: "I\'m at capacity. I need ten minutes. I\'ll be back at quarter past."',
        fixedRows: ['In my words'],
        columns: [
          { id: 'line', label: 'Pause line', type: 'textarea', w: 4 }
        ]
      },
      {
        type: 'note', pdf: true,
        text: 'Part B, in the moment: check where you are with WP-02, say your line, then do your first calming step. Nothing in this kit works by cold, pain or shock, and none of it is treatment.'
      },
      {
        id: 'reentry', type: 'table', title: 'Part C: Coming back',
        intro: 'Take WP-02 before and after. "Feeling better" is not the test; the number is. Under 0.50, go back in. Between 0.50 and 0.60, do a second round. Still 0.60 or above after two rounds? Put it off to a named time.',
        addLabel: 'Add a reading',
        rangeCols: true,
        columns: [
          { id: 'time', label: 'Time', type: 'text', w: 1, placeholder: 'e.g. 7:40pm' },
          { id: 'tactic', label: 'What I did', type: 'select', options: WP11_TACTICS, w: 2.2 },
          { id: 'before', label: 'Load before (WP-02, 0–1)', type: 'number', w: 1, step: '0.01', min: 0, max: 1, rangeNote: 'A WP-02 load score runs from 0 to 1 (for example 0.45).' },
          { id: 'after', label: 'Load after (WP-02, 0–1)', type: 'number', w: 1, step: '0.01', min: 0, max: 1, rangeNote: 'A WP-02 load score runs from 0 to 1 (for example 0.45).' },
          { id: 'change', label: 'Change', type: 'computed', w: 0.9, compute: function (r) {
            var b = inRange(r.before, 0, 1), a = inRange(r.after, 0, 1);
            if (outOfRange(r.before, 0, 1) || outOfRange(r.after, 0, 1)) return 'Check 0–1';
            return (b !== null && a !== null) ? (a - b > 0 ? '+' : '') + fmt(a - b, 2) : '';
          } }
        ],
        defaultRows: [{}]
      },
      {
        id: 'next', type: 'computed', title: 'Where that leaves you',
        compute: wp11Next(false)
      },
      {
        id: 'after', type: 'fields', title: 'Coming back',
        fields: [
          { id: 'nextAction', label: 'Next small action', type: 'text' },
          { id: 'resume', label: 'If you put the conversation off: when you\'ll pick it back up', type: 'text' }
        ]
      },
      {
        id: 'signoff', type: 'table', title: 'Defaults set',
        fixedRows: ['This kit'],
        columns: [
          { id: 'chosen', label: 'Defaults chosen', type: 'check', w: 1.3 },
          { id: 'agreed', label: 'Pause line shared', type: 'check', w: 1.3 },
          { id: 'date', label: 'Date', type: 'date', w: 1.4 }
        ]
      }
    ]
  };

  /* ------------------------------------------------------------------ WP-13 */
  var WP13_ROWS = [];
  DAYS.forEach(function (d) { WP13_ROWS.push({ day: d, who: 'A' }); WP13_ROWS.push({ day: d, who: 'B' }); });
  W['wp-13'] = {
    code: 'WP-13',
    title: 'Phase-Locked Loop',
    plain: 'The 90-second check-in',
    slug: 'Phase-Locked-Loop',
    purpose: 'A 90-second daily check-in that keeps everyone in step with small, steady corrections instead of occasional big ones. Each person answers each prompt in one sentence, about their own day. No debating, no solving, no arguing back.',
    people: true,
    meta: [
      { id: 'weekOf', label: 'Week beginning', type: 'date' }
    ],
    sections: [
      {
        id: 'daily', type: 'table', title: 'Each day',
        intro: 'Load: "Today I was at about low / medium / high capacity." Appreciation: one specific thing you appreciated about someone else on your road today. The other two columns are optional. Anything that needs a real discussion waits for the weekly catch-up.',
        addLabel: 'Add a row',
        personDays: DAYS,
        columns: [
          { id: 'day', label: 'Day', type: 'select', options: DAYS, w: 0.7, prefill: true },
          { id: 'who', label: 'Person', type: 'person', w: 1.1, prefill: true },
          { id: 'load', label: 'Load', type: 'select', options: ['Low', 'Medium', 'High'], w: 0.9 },
          { id: 'thanks', label: 'One thing I appreciated today', type: 'text', w: 2 },
          { id: 'friction', label: 'One small thing that didn\'t feel great', type: 'text', w: 2 },
          { id: 'ask', label: 'One thing that would help tomorrow', type: 'text', w: 2 }
        ],
        defaultRows: WP13_ROWS
      },
      {
        id: 'loads', type: 'computed', title: 'Load this week',
        compute: function (ctx) {
          var c = {};
          ctx.people().forEach(function (p) { c[p] = { Low: 0, Medium: 0, High: 0 }; });
          var any = false;
          ctx.rows('daily').forEach(function (r) { if (c[r.who] && c[r.who].hasOwnProperty(r.load)) { c[r.who][r.load]++; any = true; } });
          if (!any) return [{ label: 'Load', value: 'Record a load level to see the week at a glance.' }];
          return ctx.people().map(function (p) {
            return { label: ctx.name(p), value: c[p].High + ' high, ' + c[p].Medium + ' medium, ' + c[p].Low + ' low' };
          });
        }
      },
      {
        id: 'resync', type: 'table', title: 'The weekly catch-up', optional: true,
        intro: 'Once a week, when you do your weekly closing, skim the daily notes for anything that came up more than twice. Move it to the right worksheet, instead of letting it stay a low-level irritation.',
        addLabel: 'Add an item',
        columns: [
          { id: 'item', label: 'Sore spot that keeps coming up', type: 'text', w: 3 },
          { id: 'times', label: 'Times this week', type: 'number', w: 0.9 },
          { id: 'to', label: 'Move to', type: 'select', options: ['RACI Treaty (WP-03)', 'Tone Filter (WP-09)', 'Keep watching'], labels: { 'RACI Treaty (WP-03)': 'One owner per job (WP-03)', 'Tone Filter (WP-09)': 'Say it so it lands (WP-09)' }, w: 1.8 }
        ],
        defaultRows: [{}]
      },
      {
        id: 'signoff', type: 'table', title: 'Sign-off',
        fixedRows: ['@A', '@B'],
        columns: [
          { id: 'committed', label: 'Committed to the daily loop', type: 'check', w: 1.6 },
          { id: 'date', label: 'Date', type: 'date', w: 1.4 }
        ]
      }
    ]
  };

  /* ------------------------------------------------------------------ road variants */
  // WP-03 worded and prefilled for the road someone is on. Everything else about the sheet stays the same.
  var RACI_ROADS = {
    coworkers: {
      purpose: 'A living agreement that gives every recurring team task exactly one Responsible name and one Accountable name, so nobody has to guess who is following up. Responsible does the task. Accountable makes sure it happened and follows up. They can be the same person. Consulted (who gives input before it is done) and Informed (who hears when it is) are optional.',
      note: "Fill it in together, from what a normal week actually looks like (WP-01 helps). Remove any rows that don't fit your team, and add the ones that do. It describes how the work is set up, never how well anyone is doing it.",
      rows: [
        { task: 'Meeting notes', freq: 'Each meeting' }, { task: 'Follow-ups after meetings', freq: 'Each meeting' },
        { task: 'Deadlines and status reporting', freq: 'Weekly' }, { task: 'On-call or cover when someone is out', freq: 'As needed' },
        { task: 'Team chat and shared inbox triage', freq: 'Daily' }, { task: 'Onboarding a new teammate', freq: 'As needed' }
      ],
      freq: ['Daily', 'Each meeting', 'Weekly', 'Monthly', 'As needed', 'Ongoing'],
      ci: true,
      amend: 'When the work changes, rework the agreement in writing, instead of letting tasks drift to whoever started picking them up. Anyone on the team can ask for a review at a regular check-in, or at the monthly look-back (WP-04).',
      sign: "Initialing confirms that everyone has read the current version and agrees to who owns what, as written. It isn't a performance record, and it isn't for HR. It only means ownership is clear."
    },
    roommates: {
      purpose: 'A living agreement that gives every regular shared-home job exactly one Responsible name and one Accountable name, so nobody has to re-decide who owns what every week. Responsible does the task. Accountable notices if it didn\'t get done and follows up. They can be the same person.',
      note: "Fill it in together at a house meeting. Remove any rows that don't apply to your place, and add the ones that do. Splitting a cleaning area by week or by room is fine; just write it down.",
      rows: [
        { task: 'Rent: collecting and paying', freq: 'Monthly' }, { task: 'Bills (power, water, internet)', freq: 'Monthly' },
        { task: 'Cleaning: kitchen', freq: 'Weekly' }, { task: 'Cleaning: bathroom', freq: 'Weekly' }, { task: 'Cleaning: shared living space', freq: 'Weekly' },
        { task: 'Shared supplies (soap, paper, basics)', freq: 'As needed' }, { task: 'Trash and recycling', freq: 'Weekly' },
        { task: 'Guests and quiet hours', freq: 'Ongoing' }
      ],
      amend: 'When things change (someone moves in or out, a schedule shifts), rework the agreement in writing, instead of letting jobs drift to whoever started doing more. Anyone can ask for a review at a house meeting, or at the monthly look-back (WP-04).',
      sign: "Initialing confirms that everyone has read the current version and agrees to who owns what, as written. It doesn't mean every job feels perfectly even. It only means ownership is clear."
    },
    caregivers: {
      purpose: 'A living agreement that gives every regular part of the care exactly one Responsible name and one Accountable name, so "whenever someone can" becomes a plan. Responsible does the task. Accountable notices if it didn\'t get done and follows up. They can be the same person.',
      note: "Fill it in together with whoever shares the care. This is about who owns each task, not medical advice: for anything about health or medicines, follow the care team's instructions. Remove rows that don't apply and add the ones that do.",
      rows: [
        { task: 'Appointments: booking, getting there, notes', freq: 'As needed' },
        { task: 'Medications: keeping the list and schedule up to date', freq: 'Ongoing', notes: 'As the care team directs' },
        { task: 'Pharmacy pickups', freq: 'Weekly' }, { task: 'Bills and insurance paperwork', freq: 'Monthly' },
        { task: 'Visits', freq: 'Weekly' }, { task: 'Overnight calls', freq: 'As needed' },
        { task: 'Groceries and meals', freq: 'Weekly' }
      ],
      amend: 'When the care changes, rework the agreement in writing, instead of letting tasks drift to whoever lives closest or started doing more. Anyone sharing the care can ask for a review at a regular check-in, or at the monthly look-back (WP-04).',
      sign: "Initialing confirms that everyone sharing the care has read the current version and agrees to who owns what, as written. It doesn't mean the load feels even. It only means ownership is clear."
    }
  };
  var variants = {};
  function variant(key, road) {
    key = String(key || '').toLowerCase();
    if (key !== 'wp-03' || !RACI_ROADS[road]) return null;
    if (variants[key + ':' + road]) return variants[key + ':' + road];
    var base = W[key], v = RACI_ROADS[road];
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    out.road = road;
    out.purpose = v.purpose;
    out.sections = base.sections.map(function (s) {
      var c = {};
      Object.keys(s).forEach(function (k) { c[k] = s[k]; });
      if (s.type === 'note' && s.pdf === false) c.text = v.note;
      if (s.type === 'note' && s.pdf === true) c.text = v.sign;
      if (s.id === 'amendments') c.intro = v.amend;
      if (s.id === 'treaty') {
        c.defaultRows = v.rows;
        c.columns = s.columns.map(function (col) {
          if (col.id === 'freq' && v.freq) { var f = {}; Object.keys(col).forEach(function (k) { f[k] = col[k]; }); f.options = v.freq; return f; }
          return col;
        });
        if (v.ci) {
          c.title = 'The agreement';
          c.intro = 'R and A are one name each. Consulted and Informed are optional, and can be more than one name or a group, like "the whole team".';
          c.columns = [
            c.columns[0], c.columns[1], c.columns[2], c.columns[3],
            { id: 'c', label: 'Consulted (optional)', type: 'text', w: 1.2, placeholder: 'Who gives input' },
            { id: 'i', label: 'Informed (optional)', type: 'text', w: 1.2, placeholder: 'Who hears about it' },
            { id: 'notes', label: 'Notes', type: 'text', w: 1.5 }
          ];
        }
      }
      return c;
    });
    variants[key + ':' + road] = out;
    return out;
  }

  /* ------------------------------------------------------------------ just me */
  // The Workpaper Suite's "Just me" road: each sheet worded for one person on their own, with no one
  // else on it. Field ids and stored answers stay the same, so a draft or PDF opens on any road; only
  // the words you see change (a choice can show a different label from the value it stores).
  function copyOf(o) { var c = {}; Object.keys(o).forEach(function (k) { c[k] = o[k]; }); return c; }
  var SOLO = {
    'wp-01': {
      title: 'Neutral Refusals',
      plain: 'Kind ways to say no',
      purpose: 'Kind ways to say no, drafted ahead of time. For a real request you can\'t take on right now, write a "not right now" in three steps: say why the request is fair, say honestly what you have left, and offer something instead. Having a few ready means you don\'t have to find the words on the spot.',
      people: false,
      meta: [
        { id: 'name', label: 'Your name', type: 'text' },
        { id: 'date', label: 'Date', type: 'date' }
      ],
      keep: ['refusals'],
      sections: {
        refusals: {
          title: 'Kind ways to say no',
          intro: 'Pick a real situation. Say why the request is fair, say honestly what you have left, and offer something instead. Add as many as you like.'
        }
      }
    },
    'wp-02': {
      purpose: 'A one-minute check on how much you\'re carrying right now. It separates "How much am I already carrying?" from "How upset am I about this one thing?" Higher numbers mean more load. It is not a clinical test, just a structured gut-check.',
      sections: {
        note: { text: 'Answer about yourself, based on the last 24 to 48 hours.' },
        reading: { compute: wp02Reading(true) },
        extra: { fields: [{ id: 'note', label: 'Anything else on your mind right now', type: 'textarea' }] },
        notePdf: { text: 'A high score is a way to press pause, not a way out. It means "I\'ll come back to this tomorrow," not "this doesn\'t need to happen."' }
      }
    },
    'wp-09': {
      purpose: 'A self-check for the moments when something stings. It helps you turn a raw reaction into a clear fact, feeling and ask, and slow down before you react. Nothing here records or analyzes anyone\'s voice.',
      sections: {
        transducer: { title: 'Untangle the reaction: fact, feeling, ask' },
        filter: {
          title: 'Before you react: four quick checks',
          items: [
            { id: 'specific', label: 'Is this about a specific, nameable task or event?', options: ['Yes', 'No'] },
            { id: 'saturation', label: "Would I read this the same way if my battery weren't already running high (WP-02)?", options: ['Yes', 'No', 'Not sure'] },
            { id: 'neutral', label: 'Is there a neutral reading that also fits what happened?', options: ['Yes', 'No'] },
            { id: 'pattern', label: 'Am I reacting to what happened just now, or to an old pattern?', options: ['Their words', 'A past pattern'], labels: { 'Their words': 'What happened just now', 'A past pattern': 'An old pattern' } }
          ]
        },
        result: { compute: wp09Result(true) }
      }
    },
    'wp-11': {
      purpose: 'A short plan, made ahead of time, for settling yourself when a moment gets hard, so you can pick things back up when you\'re ready. Fill in Part A on an ordinary day, not a hard one.',
      meta: [
        { id: 'name', label: 'Your name', type: 'text' },
        { id: 'date', label: 'Date', type: 'date' }
      ],
      sections: {
        note: { text: 'This kit is all about you.' },
        lines: {
          title: 'Part A: My pause line',
          intro: 'One sentence, ready ahead of time, for when you need a break from a hard moment, so stepping away feels planned instead of like giving up. Say how you are, how long you need, and when you\'ll pick it back up: "I\'m at capacity. I need ten minutes. I\'ll come back to this at quarter past."',
          columns: [{ id: 'line', label: 'Pause line', type: 'textarea', w: 4 }]
        },
        reentry: { intro: 'Take WP-02 before and after. "Feeling better" is not the test; the number is. Under 0.50, pick things back up. Between 0.50 and 0.60, do a second round. Still 0.60 or above after two rounds? Put it off to a named time.' },
        next: { compute: wp11Next(true) },
        after: {
          fields: [
            { id: 'nextAction', label: 'Next small action', type: 'text' },
            { id: 'resume', label: 'If you put it off: when you\'ll pick it back up', type: 'text' }
          ]
        },
        signoff: {
          columns: [
            { id: 'chosen', label: 'Defaults chosen', type: 'check', w: 1.3 },
            { id: 'agreed', label: 'Pause line written', type: 'check', w: 1.3 },
            { id: 'date', label: 'Date', type: 'date', w: 1.4 }
          ]
        }
      }
    }
  };
  var solos = {};
  function solo(key) {
    key = String(key || '').toLowerCase();
    var o = SOLO[key], base = W[key];
    if (!o || !base) return null;
    if (solos[key]) return solos[key];
    var out = copyOf(base);
    Object.keys(o).forEach(function (k) { if (k !== 'sections' && k !== 'keep') out[k] = o[k]; });
    out.solo = true;
    // notes have no id: "note" is the one shown on the page, "notePdf" the one printed too
    out.sections = base.sections.filter(function (s) { return !o.keep || (s.id && o.keep.indexOf(s.id) >= 0); }).map(function (s) {
      var ch = o.sections && o.sections[s.id || (s.type === 'note' ? (s.pdf ? 'notePdf' : 'note') : '')];
      if (!ch) return s;
      var c = copyOf(s);
      Object.keys(ch).forEach(function (k) { c[k] = ch[k]; });
      return c;
    });
    solos[key] = out;
    return out;
  }

  global.TOL_WORKPAPERS = W;
  global.TOL_WORKPAPER_VARIANT = variant;
  global.TOL_WORKPAPER_SOLO = solo;
})(typeof window !== 'undefined' ? window : globalThis);
