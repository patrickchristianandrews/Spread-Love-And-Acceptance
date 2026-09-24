/*
  tol-workpaper-schemas.js — The Objective Ledger (TOL-OS)
  Field-by-field definitions of the fill-in workpapers, taken from the
  manuscript source files. The engine in tol-workpaper.js renders the form
  and the PDF from these definitions.

  Column / field types: text, textarea, number, date, select, person, check, computed.
  "person" columns offer Partner A, Partner B (and optionally Both), and show
  whatever names the household typed at the top of the page.
*/
(function (global) {
  'use strict';

  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function fmt(n, d) { return (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); }

  var W = {};

  /* ------------------------------------------------------------------ WP-01 */
  W['wp-01'] = {
    code: 'WP-01',
    title: 'Field Audit & Neutral Refusals',
    slug: 'Field-Audit',
    purpose: "Capture what actually happened this week before either person's memory of it hardens into a story. Fill this in together, or independently and compare. Don't fill it in about the other person.",
    people: true,
    meta: [
      { id: 'weekOf', label: 'Week beginning', type: 'date' }
    ],
    sections: [
      {
        id: 'audit', type: 'table', title: 'Part A: Field Audit',
        intro: 'A raw log kept for 5–7 days, before any interpretation gets added. One row per task noticed or done. Log what happened, not what should have happened.',
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
          var t = { A: 0, B: 0 }, noticed = { A: 0, B: 0 }, count = 0;
          ctx.rows('audit').forEach(function (r) {
            var m = parseFloat(r.minutes);
            if (!r.who || !(m > 0)) return;
            count++;
            var share = r.who === 'Both' ? { A: m / 2, B: m / 2 } : (r.who === 'A' ? { A: m, B: 0 } : { A: 0, B: m });
            t.A += share.A; t.B += share.B;
            if (r.how === 'Noticed and handled') { noticed.A += share.A; noticed.B += share.B; }
          });
          var total = t.A + t.B;
          if (!total) return [{ label: 'Totals', value: 'Add rows with a person and minutes to see the totals.' }];
          var pA = t.A / total * 100, pB = t.B / total * 100;
          var balance = 1 - Math.abs(pA - pB) / 100;
          return [
            { label: ctx.name('A'), value: fmt(t.A, 0) + ' minutes (' + fmt(pA, 0) + '%), of which ' + fmt(noticed.A, 0) + ' noticed and handled without being asked' },
            { label: ctx.name('B'), value: fmt(t.B, 0) + ' minutes (' + fmt(pB, 0) + '%), of which ' + fmt(noticed.B, 0) + ' noticed and handled without being asked' },
            { label: 'Workload balance score', value: fmt(balance, 2), note: 'Enter this as the workload balance input in CALC-01. It describes how the logged work was split this week — not either person.' }
          ];
        }
      },
      {
        id: 'refusals', type: 'table', title: 'Part B: Neutral refusals we want to try', optional: true,
        intro: 'Optional. Draft a refusal for a real situation using the three-part shape: acknowledge the request, state your capacity honestly, offer an alternative.',
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
  W['wp-02'] = {
    code: 'WP-02',
    title: 'The Battery & Stress Meter',
    slug: 'Battery-Stress-Meter',
    purpose: 'A self-report checklist, filled in by each person about themselves, that separates "how much stress am I already carrying" from "how upset am I about this specific thing." Not a clinical instrument — a structured gut-check.',
    people: false,
    meta: [
      { id: 'name', label: 'Your name', type: 'text' },
      { id: 'date', label: 'Date', type: 'date' }
    ],
    sections: [
      {
        type: 'note', pdf: false,
        text: "Fill this in on your own, about yourself only. Don't fill it in about your partner."
      },
      {
        id: 'factors', type: 'scale', title: 'The checklist',
        intro: 'Score each row for how the last 24–48 hours have actually gone.',
        min: 0, max: 4, anchors: ['Not at all', 'Maximally true'],
        items: WP02_FACTORS
      },
      {
        id: 'reading', type: 'computed', title: 'Your battery score',
        compute: function (ctx) {
          var s = wp02Score(ctx);
          if (s === null) return [{ label: 'Score', value: 'Answer all five rows to see your score.' }];
          var band = s < 0.3 ? 'Low load. Whatever is coming up is probably actually about the thing itself.'
            : s < 0.6 ? 'Moderate. Worth naming out loud before a hard conversation: "heads up, I\'m carrying more than usual today."'
              : 'High. A signal to postpone anything that doesn\'t need deciding in the next hour. If you need to settle first, the Calm-Down Kit (WP-11) is built for this.';
          var out = [{ label: 'Battery score', value: fmt(s, 2) + ' (sum of the five scores ÷ 20)' }, { label: 'Reading', value: band }];
          var p = parseFloat(ctx.value('partnerScore'));
          if (p >= 0 && p <= 1) {
            out.push({ label: 'Average for CALC-01', value: fmt((s + p) / 2, 2), note: 'The mean of both scores is the autonomic saturation input in CALC-01. It is never computed from one person alone.' });
          }
          return out;
        }
      },
      {
        id: 'extra', type: 'fields', title: 'Optional',
        fields: [
          { id: 'partnerScore', label: "Your partner's score, if they've shared it (0–1)", type: 'number', step: '0.01', min: 0, max: 1 },
          { id: 'note', label: 'Anything you want to name before talking', type: 'textarea' }
        ]
      },
      {
        type: 'note', pdf: true,
        text: 'A high score is a postponement tool, not an exit. It means "let\'s revisit this tomorrow," not "this doesn\'t need to happen."'
      }
    ]
  };

  /* ------------------------------------------------------------------ WP-03 */
  W['wp-03'] = {
    code: 'WP-03',
    title: 'Domestic RACI Treaty',
    slug: 'RACI-Treaty',
    purpose: 'A living agreement assigning exactly one Responsible and one Accountable name to every recurring household task, so ownership stops getting renegotiated by default every week. Responsible does the task. Accountable notices if it didn\'t happen and follows up, and can be the same person.',
    people: true,
    meta: [
      { id: 'reviewDate', label: 'Treaty date', type: 'date' }
    ],
    sections: [
      {
        type: 'note', pdf: false,
        text: "Use this after your first full week of the Field Audit (WP-01), and fill it in from what that week's log actually showed. Remove any rows that don't apply to your household."
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
          var out = [{ label: 'Ownership clarity score', value: fmt(clear.length / rows.length, 2) + ' (' + clear.length + ' of ' + rows.length + ' tasks have both names)', note: 'Enter this as the ownership clarity input in CALC-01.' }];
          if (missing.length) out.push({ label: 'Still needs an owner', value: missing.join(', ') });
          return out;
        }
      },
      {
        id: 'amendments', type: 'table', title: 'Amendments', optional: true,
        intro: 'Renegotiate when life changes, in writing, rather than letting ownership drift to whoever started doing more. Either person can call for a review at the weekly closing, or at the monthly Deficit Audit (WP-04).',
        addLabel: 'Add an amendment',
        columns: [
          { id: 'date', label: 'Date', type: 'date', w: 1.1 },
          { id: 'change', label: 'What changed', type: 'textarea', w: 3.5 },
          { id: 'initA', label: 'Initials (A)', type: 'text', w: 0.9 },
          { id: 'initB', label: 'Initials (B)', type: 'text', w: 0.9 }
        ],
        defaultRows: [{}]
      },
      {
        type: 'note', pdf: true,
        text: 'Initialing confirms both people have read the current version and agree to the ownership as written — not that every task feels perfectly fair, only that ownership is clear.'
      },
      {
        id: 'ratify', type: 'table', title: 'Ratification',
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
    title: 'Unbilled Deficit Audit',
    slug: 'Deficit-Audit',
    purpose: 'A monthly reconciliation, done together, across four weeks of Field Audits (WP-01) and the RACI Treaty (WP-03). It looks for tasks that keep becoming deficits — not to tally what anyone owes, but to find where the household\'s structure needs a fix.',
    people: true,
    meta: [
      { id: 'month', label: 'Month', type: 'text', placeholder: 'e.g. September 2026' }
    ],
    sections: [
      {
        id: 'raw', type: 'table', title: "Part A: Pull the month's raw data",
        intro: 'From your four Field Audits, list every task logged as noticed-but-undone, or done only after being raised more than once. Tick each week it came up. A task flagged 3–4 times is a genuine deficit, not a fluke.',
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
        id: 'classify', type: 'table', title: 'Part B: Classify each deficit',
        intro: 'For every task flagged twice or more: a structural gap has no clear owner, or the named owner isn\'t the one actually handling it (fix the RACI Treaty this session). A capacity issue has an owner who can\'t keep up (schedule a direct conversation). A one-off has a temporary cause (note it and move on).',
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
        id: 'close', type: 'computed', title: 'Part C: Close the audit',
        compute: function (ctx) {
          var c = { 'Structural gap': 0, 'Capacity issue': 0, 'One-off, no action': 0 };
          ctx.rows('classify').forEach(function (r) { if (r.task && c.hasOwnProperty(r.kind)) c[r.kind]++; });
          return [
            { label: 'Structural gaps found', value: String(c['Structural gap']), note: c['Structural gap'] ? 'Update the RACI Treaty (WP-03) for each of these this session.' : '' },
            { label: 'Capacity issues found', value: String(c['Capacity issue']), note: c['Capacity issue'] ? 'Schedule the conversation. This audit surfaces it; it doesn\'t replace it.' : '' },
            { label: 'One-offs', value: String(c['One-off, no action']) },
            { label: 'Reading the count', value: 'A falling number of structural gaps month over month is the clearest sign the framework is working. A rising one means something bigger changed.' }
          ];
        }
      },
      {
        type: 'note', pdf: true,
        text: 'Not a retroactive bill, and not a performance review. A task with no owner is a gap in the treaty, not a verdict on the person who kept covering it.'
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
    title: 'Tone Transducer & Filter',
    slug: 'Tone-Filter',
    purpose: 'A self-check applied by each person to their own next message: converting a raw reaction into something the other person can actually receive, and weighing an incoming message before reacting to it. Nothing here records or analyzes anyone\'s voice.',
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
          { id: 'raw', label: 'Raw reaction', type: 'textarea', help: 'Optional, and just for you. It is left out of the PDF unless you tick the box.', privateOptIn: 'Include the raw reaction in the PDF' },
          { id: 'fact', label: "What's the fact underneath this? (One sentence, no adjectives.)", type: 'textarea' },
          { id: 'feeling', label: "What's the feeling underneath this? (Frustrated, tired, unseen, rushed…)", type: 'textarea' },
          { id: 'ask', label: "What's the actual ask? (What do you want to happen next, specifically?)", type: 'textarea' }
        ]
      },
      {
        id: 'filter', type: 'checks', title: 'The filter: before you react to what they said',
        items: [
          { id: 'specific', label: 'Is this about a specific, nameable task or event?', options: ['Yes', 'No'] },
          { id: 'saturation', label: "Would I read this the same way if I weren't already at high saturation (WP-02)?", options: ['Yes', 'No', 'Not sure'] },
          { id: 'neutral', label: 'Is there a neutral interpretation that also fits what was said?', options: ['Yes', 'No'] },
          { id: 'pattern', label: 'Am I responding to their words, or to a pattern from a past conversation?', options: ['Their words', 'A past pattern'] }
        ]
      },
      {
        id: 'result', type: 'computed', title: 'What to do next',
        compute: function (ctx) {
          var out = [];
          var fact = ctx.value('fact'), feeling = ctx.value('feeling'), ask = ctx.value('ask');
          if (fact || feeling || ask) {
            out.push({ label: 'Your message, in order', value: [fact && ('Fact: ' + fact), feeling && ('Feeling: ' + feeling), ask && ('Ask: ' + ask)].filter(Boolean).join('\n') });
          }
          var sat = ctx.value('filter.saturation'), neu = ctx.value('filter.neutral'), pat = ctx.value('filter.pattern'), spec = ctx.value('filter.specific');
          var pause = sat === 'No' || sat === 'Not sure' || neu === 'Yes' || pat === 'A past pattern';
          if (!(sat || neu || pat || spec)) {
            out.push({ label: 'Filter', value: 'Answer the four checks to see a suggestion.' });
          } else if (pause) {
            out.push({ label: 'Suggestion', value: 'Pause before continuing. Use a neutral refusal or a pause script (WP-01), and come back when saturation is lower or the neutral reading has been ruled out.' });
          } else if (spec === 'No') {
            out.push({ label: 'Suggestion', value: 'Name the specific task or event first. A message about a pattern is much harder to receive than one about a thing.' });
          } else {
            out.push({ label: 'Suggestion', value: 'Clear to respond, built from fact, feeling and ask.' });
          }
          return out;
        }
      }
    ]
  };

  /* ------------------------------------------------------------------ WP-13 */
  var WP13_ROWS = [];
  DAYS.forEach(function (d) { WP13_ROWS.push({ day: d, who: 'A' }); WP13_ROWS.push({ day: d, who: 'B' }); });
  W['wp-13'] = {
    code: 'WP-13',
    title: 'Phase-Locked Loop Protocol',
    slug: 'Phase-Locked-Loop',
    purpose: 'A 90-second daily check-in that keeps two people in step through small, constant corrections instead of occasional large ones. Each person answers in one sentence each. No debate, no solving, no rebuttal.',
    people: true,
    meta: [
      { id: 'weekOf', label: 'Week beginning', type: 'date' }
    ],
    sections: [
      {
        id: 'daily', type: 'table', title: 'The daily loop',
        intro: 'Load: "Today I was at about low / medium / high capacity." Friction and ask are optional. Anything that needs real discussion waits for the weekly resync.',
        addLabel: 'Add a row',
        columns: [
          { id: 'day', label: 'Day', type: 'select', options: DAYS, w: 0.7, prefill: true },
          { id: 'who', label: 'Person', type: 'person', w: 1.1, prefill: true },
          { id: 'load', label: 'Load', type: 'select', options: ['Low', 'Medium', 'High'], w: 0.9 },
          { id: 'friction', label: 'One small thing that didn\'t feel great', type: 'text', w: 2.4 },
          { id: 'ask', label: 'One thing that would help tomorrow', type: 'text', w: 2.4 }
        ],
        defaultRows: WP13_ROWS
      },
      {
        id: 'loads', type: 'computed', title: 'Load this week',
        compute: function (ctx) {
          var c = { A: { Low: 0, Medium: 0, High: 0 }, B: { Low: 0, Medium: 0, High: 0 } };
          var any = false;
          ctx.rows('daily').forEach(function (r) { if (c[r.who] && c[r.who].hasOwnProperty(r.load)) { c[r.who][r.load]++; any = true; } });
          if (!any) return [{ label: 'Load', value: 'Record a load level to see the week at a glance.' }];
          return ['A', 'B'].map(function (p) {
            return { label: ctx.name(p), value: c[p].High + ' high, ' + c[p].Medium + ' medium, ' + c[p].Low + ' low' };
          });
        }
      },
      {
        id: 'resync', type: 'table', title: 'The weekly resync', optional: true,
        intro: 'Once a week, alongside closing the books: skim the daily notes for anything that repeated more than twice, and promote it rather than letting it stay an ambient irritation.',
        addLabel: 'Add an item',
        columns: [
          { id: 'item', label: 'Repeated friction point', type: 'text', w: 3 },
          { id: 'times', label: 'Times this week', type: 'number', w: 0.9 },
          { id: 'to', label: 'Promote to', type: 'select', options: ['RACI Treaty (WP-03)', 'Tone Filter (WP-09)', 'Keep watching'], w: 1.8 }
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

  global.TOL_WORKPAPERS = W;
})(typeof window !== 'undefined' ? window : globalThis);
