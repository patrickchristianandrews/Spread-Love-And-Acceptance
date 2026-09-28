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

  var W = {};

  /* ------------------------------------------------------------------ WP-01 */
  W['wp-01'] = {
    code: 'WP-01',
    title: 'Field Audit & Neutral Refusals',
    slug: 'Field-Audit',
    purpose: "Write down what actually happened this week, before either of you starts remembering it as a story. Fill it in together, or each on your own and then compare. Each of you writes only your own side, never the other person's.",
    people: true,
    meta: [
      { id: 'weekOf', label: 'Week beginning', type: 'date' }
    ],
    sections: [
      {
        id: 'audit', type: 'table', title: 'Part A: Field Audit',
        intro: 'A plain log kept for 5–7 days, written down before anyone decides what it means. Add one row for each task noticed or done. Log what happened, not what should have happened.',
        addLabel: 'Add a row',
        columns: [
          { id: 'day', label: 'Day', type: 'select', options: DAYS, w: 0.7, prefill: true },
          { id: 'task', label: 'Task noticed or done', type: 'text', w: 3 },
          { id: 'who', label: 'Who did it', type: 'person', both: true, w: 1.3 },
          { id: 'minutes', label: 'Minutes (rough)', type: 'number', w: 0.9 },
          { id: 'how', label: 'Asked for, or noticed and handled?', type: 'select', options: ['Asked for', 'Noticed and handled'], w: 1.7 }
        ],
        defaultRows: DAYS.map(function (d) { return { day: d }; })
      },
      {
        id: 'totals', type: 'computed', title: "This week's totals",
        compute: function (ctx) {
          var people = ctx.people(), t = {}, noticed = {};
          people.forEach(function (p) { t[p] = 0; noticed[p] = 0; });
          ctx.rows('audit').forEach(function (r) {
            var m = parseFloat(r.minutes);
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
          if (!total) return [{ label: 'Totals', value: 'Add rows with a person and minutes to see the totals.' }];
          var pct = {};
          people.forEach(function (p) { pct[p] = t[p] / total * 100; });
          // 1 = an even split; 0 = one person logged everything. With two people this is 1 - |A% - B%|;
          // with more, 1 - (the share of time that would have to change hands) / (the most it could be).
          var balance = balanceOf(people.map(function (p) { return t[p]; }));
          var out = people.map(function (p) {
            return { label: ctx.name(p), value: fmt(t[p], 0) + ' minutes (' + fmt(pct[p], 0) + '%), of which ' + fmt(noticed[p], 0) + ' noticed and handled without being asked' };
          });
          out.push({ label: 'Workload balance score', value: fmt(balance, 2), note: 'Enter this as the workload balance number in CALC-01. It describes how the logged work was split this week, not anyone in it.' + (people.length > 2 ? ' With more than two people, it is 1 minus the share of the week\'s time that would have to change hands for an even split, divided by the most that could ever be.' : '') });
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
        fixedRows: ['Prepared by', 'Reviewed by'],
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
      var v = ctx.value('factors.' + f.id);
      if (v !== '' && v != null) { sum += Number(v); answered++; }
    });
    return answered === WP02_FACTORS.length ? sum / 20 : null;
  }
  // solo: worded for one person on their own, with no shared average
  function wp02Reading(solo) {
    return function (ctx) {
      var s = wp02Score(ctx);
      if (s === null) return [{ label: 'Score', value: 'Answer all five rows to see your score.' }];
      var sb = r2(s);
      var band = sb < 0.3 ? 'Low load. Whatever is coming up is probably about the thing itself.'
        : sb < 0.6 ? (solo ? 'Medium. You\'re carrying more than usual today. Go gently, and leave big decisions for when you have more room.' : 'Medium. Before a hard conversation, it\'s worth saying out loud: "Heads up, I\'m carrying more than usual today."')
          : 'High. Put off anything that doesn\'t need deciding in the next hour. If you need to settle first, the Calm-Down Kit (WP-11) is made for this.';
      var out = [{ label: 'Battery score', value: fmt(s, 2) + ' (the five scores added up, then divided by 20)' }, { label: 'Reading', value: band }];
      if (solo) return out;
      // everyone else's shared scores ("0.4, 0.55, 0.3"); the average covers everyone
      var others = String(ctx.value('partnerScore') || '').split(/[,;\s]+/).filter(Boolean).map(parseFloat);
      if (others.length && others.every(function (p) { return p >= 0 && p <= 1; })) {
        var all = [s].concat(others), avg = all.reduce(function (a, b) { return a + b; }, 0) / all.length;
        out.push({ label: 'Average for CALC-01', value: fmt(avg, 2) + ' (' + all.length + ' people)', note: 'The average of everyone\'s scores is the stress number in CALC-01 (how stretched you all are). Make sure every person on the road is included: it is never worked out while anyone\'s is missing, or from one person alone.' });
      }
      return out;
    };
  }
  W['wp-02'] = {
    code: 'WP-02',
    title: 'The Battery & Stress Meter',
    slug: 'Battery-Stress-Meter',
    purpose: 'A short checklist that each of you fills in about yourself. It separates "How much stress am I already carrying?" from "How upset am I about this one thing?" It is not a clinical test, just a structured gut-check.',
    people: false,
    meta: [
      { id: 'name', label: 'Your name', type: 'text' },
      { id: 'date', label: 'Date', type: 'date' }
    ],
    sections: [
      {
        type: 'note', pdf: false,
        text: "Fill this in on your own, about yourself only. Don't fill it in about the other person."
      },
      {
        id: 'factors', type: 'scale', title: 'The checklist',
        intro: 'Score each row based on how the last 24–48 hours have actually gone.',
        min: 0, max: 4, anchors: ['Not at all', 'Very true'],
        items: WP02_FACTORS
      },
      {
        id: 'reading', type: 'computed', title: 'Your battery score',
        compute: wp02Reading(false)
      },
      {
        id: 'extra', type: 'fields', title: 'Optional',
        fields: [
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
    slug: 'RACI-Treaty',
    purpose: 'A living agreement that gives every regular household job exactly one Responsible name and one Accountable name, so you stop re-deciding who owns what every week. Responsible does the task. Accountable notices if it didn\'t get done and follows up. They can be the same person.',
    people: true,
    meta: [
      { id: 'reviewDate', label: 'Treaty date', type: 'date' }
    ],
    sections: [
      {
        type: 'note', pdf: false,
        text: "Use this after your first full week of the Field Audit (WP-01), and fill it in from what that week's log actually showed. Remove any rows that don't apply to your household, and add the ones that do."
      },
      {
        id: 'treaty', type: 'table', title: 'The treaty',
        addLabel: 'Add a task',
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
          var out = [{ label: 'Ownership clarity score', value: fmt(clear.length / rows.length, 2) + ' (' + clear.length + ' of ' + rows.length + ' tasks have both names)', note: 'Enter this as the ownership clarity number in CALC-01.' }];
          if (missing.length) out.push({ label: 'Still needs an owner', value: missing.join(', ') });
          return out;
        }
      },
      {
        id: 'amendments', type: 'table', title: 'Changes to the treaty', optional: true,
        intro: 'When life changes, rework the treaty in writing, instead of letting jobs drift to whoever started doing more. Either of you can ask for a review at the weekly closing, or at the monthly Deficit Audit (WP-04).',
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
        text: 'Initialing confirms that you have both read the current version and agree to who owns what, as written. It doesn\'t mean every task feels perfectly fair. It only means ownership is clear.'
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
    slug: 'Deficit-Audit',
    purpose: 'A monthly look-back, done together, across four weeks of Field Audits (WP-01) and your RACI Treaty (WP-03). It looks for the tasks that keep slipping. The goal is not to tally what anyone owes, but to find where the household\'s setup needs a fix.',
    people: true,
    meta: [
      { id: 'month', label: 'Month', type: 'text', placeholder: 'e.g. September 2026' }
    ],
    sections: [
      {
        id: 'raw', type: 'table', title: "Part A: Gather the month's notes",
        intro: 'From your four Field Audits, list every task that was logged as noticed but not done, or done only after being raised more than once. Check off each week it came up. A task flagged 3–4 times is a real pattern, not a fluke.',
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
        intro: 'Sort every task flagged twice or more. A structural gap has no clear owner, or the named owner isn\'t the one who actually handles it (fix the RACI Treaty in this session). A capacity issue has an owner who can\'t keep up (set a time for an honest conversation). A one-off has a temporary cause (note it and move on).',
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
          { id: 'owner', label: 'Named RACI owner?', type: 'select', options: ['Yes', 'No'], w: 1 },
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
            { label: 'Structural gaps found', value: String(c['Structural gap']), note: c['Structural gap'] ? 'Update the RACI Treaty (WP-03) for each of these in this session.' : '' },
            { label: 'Capacity issues found', value: String(c['Capacity issue']), note: c['Capacity issue'] ? 'Set a time for the conversation. This audit brings it to light, but it doesn\'t replace it.' : '' },
            { label: 'One-offs', value: String(c['One-off, no action']) },
            { label: 'Reading the count', value: 'A number of structural gaps that falls month after month is the clearest sign the program is working. A rising number means something bigger changed.' }
          ];
        }
      },
      {
        type: 'note', pdf: true,
        text: 'Not a bill for the past, and not a performance review. A task with no owner is a gap in the treaty, not a verdict on the person who kept covering it.'
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
    slug: 'Tone-Filter',
    purpose: 'A self-check each of you uses on your own side of a conversation. It helps you turn a raw reaction into something the other person can actually take in, and weigh a message you received before you react to it. Nothing here records or analyzes anyone\'s voice.',
    people: false,
    meta: [
      { id: 'name', label: 'Your name', type: 'text' },
      { id: 'date', label: 'Date', type: 'date' }
    ],
    sections: [
      {
        id: 'transducer', type: 'fields', title: 'The transducer: before you speak or send',
        intro: 'Use it on one thing that actually stung.',
        fields: [
          { id: 'raw', label: 'Raw reaction', type: 'textarea', help: 'Optional, and just for you. It is left out of the PDF unless you check the box.', privateOptIn: 'Include the raw reaction in the PDF' },
          { id: 'fact', label: "What's the fact underneath this? (One sentence, no adjectives.)", type: 'textarea' },
          { id: 'feeling', label: "What's the feeling underneath this? (Frustrated, tired, unseen, rushed…)", type: 'textarea' },
          { id: 'ask', label: "What's the actual ask? (What do you want to happen next, specifically?)", type: 'textarea' }
        ]
      },
      {
        id: 'filter', type: 'checks', title: 'The filter: before you react to what they said',
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
  function wp09Result(solo) {
    return function (ctx) {
      var out = [];
      var fact = ctx.value('fact'), feeling = ctx.value('feeling'), ask = ctx.value('ask');
      if (fact || feeling || ask) {
        out.push({ label: solo ? 'Fact, feeling and ask' : 'Your message, in order', value: [fact && ('Fact: ' + fact), feeling && ('Feeling: ' + feeling), ask && ('Ask: ' + ask)].filter(Boolean).join('\n') });
      }
      var sat = ctx.value('filter.saturation'), neu = ctx.value('filter.neutral'), pat = ctx.value('filter.pattern'), spec = ctx.value('filter.specific');
      var pause = sat === 'No' || sat === 'Not sure' || neu === 'Yes' || pat === 'A past pattern';
      if (!(sat || neu || pat || spec)) {
        out.push({ label: 'Filter', value: 'Answer the four checks to see a suggestion.' });
      } else if (pause) {
        out.push({ label: 'Suggestion', value: solo ? 'Pause before you go on. Come back to it when your battery score is lower, or once you\'ve ruled out the neutral reading. If a request is behind it, a kind "not right now" (WP-01) can buy you time.' : 'Pause before you go on. Use a neutral refusal or a "not right now" script (WP-01). Come back when your battery score is lower, or once you\'ve ruled out the neutral reading.' });
      } else if (spec === 'No') {
        out.push({ label: 'Suggestion', value: solo ? 'Name the specific task or event first. One thing is much easier to work with than a whole pattern.' : 'Name the specific task or event first. A message about a pattern is much harder to hear than one about a single thing.' });
      } else {
        out.push({ label: 'Suggestion', value: solo ? 'You\'re clear to go ahead. Let the fact, the feeling and the ask guide what you do next.' : 'You\'re clear to respond. Build your reply from the fact, the feeling and the ask.' });
      }
      return out;
    };
  }

  /* ------------------------------------------------------------------ WP-11 */
  var WP11_TACTICS = ['Asymmetric breathing (4 in, 6 out)', 'Naming the room (5-4-3)', 'Weight and pressure', 'Gating (lower the lights, step out)', 'Walking it out', 'Low, steady sound'];
  // solo: "pick things back up" rather than "go back in" to a conversation
  function wp11Next(solo) {
    return function (ctx) {
      var rows = ctx.rows('reentry').filter(function (r) { return parseFloat(r.after) >= 0; });
      if (!rows.length) return [{ label: 'Coming back', value: 'Add a before-and-after reading to see where you are.' }];
      var a = parseFloat(rows[rows.length - 1].after);
      var band = a < 0.5 ? (solo ? 'Under 0.50: pick things back up, at the time you named.' : 'Under 0.50: go back in, at the time you named.')
        : a < 0.6 ? '0.50 to 0.60: do a second round, with the same calming step or the other one.'
          : (rows.length >= 2 ? '0.60 or above after two rounds: put it off to a specific time. "Tomorrow after dinner" is a real plan; "later" is not.' : '0.60 or above: do a second round first.');
      return [{ label: 'Latest reading', value: fmt(a, 2) }, { label: 'Next', value: band, note: 'When you come back, start with one small, simple task, like putting the dishes away.' }];
    };
  }
  W['wp-11'] = {
    code: 'WP-11',
    title: 'The Calm-Down Kit',
    slug: 'Calm-Down-Kit',
    purpose: 'A short plan, made ahead of time, for calming your body down enough to have the conversation, or to put it off honestly. One person uses it, about themselves. Fill in Part A on an ordinary day, not a hard one.',
    people: true,
    meta: [
      { id: 'date', label: 'Date', type: 'date' }
    ],
    sections: [
      {
        type: 'note', pdf: false,
        text: 'Each person fills in their own kit, about themselves. It is never something to hand to the other person.'
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
        id: 'lines', type: 'table', title: 'Part A: My signal line',
        intro: 'One sentence, agreed now, so a pause isn\'t mistaken for walking out. Say how you are, how long you need, and when you\'ll be back: "I\'m at capacity. I need ten minutes. I\'ll be back at quarter past."',
        fixedRows: ['@A', '@B'],
        columns: [
          { id: 'line', label: 'Signal line', type: 'textarea', w: 4 }
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
        columns: [
          { id: 'time', label: 'Time', type: 'text', w: 1, placeholder: 'e.g. 7:40pm' },
          { id: 'tactic', label: 'What I did', type: 'select', options: WP11_TACTICS, w: 2.2 },
          { id: 'before', label: 'WP-02 before (0–1)', type: 'number', w: 1, step: '0.01', min: 0, max: 1 },
          { id: 'after', label: 'WP-02 after (0–1)', type: 'number', w: 1, step: '0.01', min: 0, max: 1 },
          { id: 'change', label: 'Change', type: 'computed', w: 0.9, compute: function (r) {
            var b = parseFloat(r.before), a = parseFloat(r.after);
            return (b >= 0 && a >= 0) ? (a - b > 0 ? '+' : '') + fmt(a - b, 2) : '';
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
        fixedRows: ['@A', '@B'],
        columns: [
          { id: 'chosen', label: 'Defaults chosen', type: 'check', w: 1.3 },
          { id: 'agreed', label: 'Signal line agreed', type: 'check', w: 1.3 },
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
    slug: 'Phase-Locked-Loop',
    purpose: 'A 90-second daily check-in that keeps two people in step with small, steady corrections instead of occasional big ones. Each of you answers each prompt in one sentence. No debating, no solving, no arguing back.',
    people: true,
    meta: [
      { id: 'weekOf', label: 'Week beginning', type: 'date' }
    ],
    sections: [
      {
        id: 'daily', type: 'table', title: 'The daily loop',
        intro: 'Load: "Today I was at about low / medium / high capacity." Appreciation: one specific thing you appreciated about the other person today. The other two columns are optional. Anything that needs a real discussion waits for the weekly catch-up.',
        addLabel: 'Add a row',
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
          { id: 'to', label: 'Move to', type: 'select', options: ['RACI Treaty (WP-03)', 'Tone Filter (WP-09)', 'Keep watching'], w: 1.8 }
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
      purpose: 'A short checklist about how you\'re doing right now. It separates "How much stress am I already carrying?" from "How upset am I about this one thing?" It is not a clinical test, just a structured gut-check.',
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
        transducer: { title: 'The transducer: untangle the reaction' },
        filter: {
          title: 'The filter: before you react',
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
