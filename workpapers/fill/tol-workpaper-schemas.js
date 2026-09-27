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
            { label: 'Workload balance score', value: fmt(balance, 2), note: 'Enter this as the workload balance number in CALC-01. It describes how the logged work was split this week, not either person.' }
          ];
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
        compute: function (ctx) {
          var s = wp02Score(ctx);
          if (s === null) return [{ label: 'Score', value: 'Answer all five rows to see your score.' }];
          var band = s < 0.3 ? 'Low load. Whatever is coming up is probably about the thing itself.'
            : s < 0.6 ? 'Medium. Before a hard conversation, it\'s worth saying out loud: "Heads up, I\'m carrying more than usual today."'
              : 'High. Put off anything that doesn\'t need deciding in the next hour. If you need to settle first, the Calm-Down Kit (WP-11) is made for this.';
          var out = [{ label: 'Battery score', value: fmt(s, 2) + ' (the five scores added up, then divided by 20)' }, { label: 'Reading', value: band }];
          var p = parseFloat(ctx.value('partnerScore'));
          if (p >= 0 && p <= 1) {
            out.push({ label: 'Average for CALC-01', value: fmt((s + p) / 2, 2), note: 'The average of both scores is the "autonomic saturation" number in CALC-01 (how stretched you both are). It is never worked out from one person alone.' });
          }
          return out;
        }
      },
      {
        id: 'extra', type: 'fields', title: 'Optional',
        fields: [
          { id: 'partnerScore', label: "The other person's score, if they've shared it (0–1)", type: 'number', step: '0.01', min: 0, max: 1 },
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
          { id: 'initA', label: 'Initials (A)', type: 'text', w: 0.9 },
          { id: 'initB', label: 'Initials (B)', type: 'text', w: 0.9 }
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
            out.push({ label: 'Suggestion', value: 'Pause before you go on. Use a neutral refusal or a "not right now" script (WP-01). Come back when your battery score is lower, or once you\'ve ruled out the neutral reading.' });
          } else if (spec === 'No') {
            out.push({ label: 'Suggestion', value: 'Name the specific task or event first. A message about a pattern is much harder to hear than one about a single thing.' });
          } else {
            out.push({ label: 'Suggestion', value: 'You\'re clear to respond. Build your reply from the fact, the feeling and the ask.' });
          }
          return out;
        }
      }
    ]
  };

  /* ------------------------------------------------------------------ WP-11 */
  var WP11_TACTICS = ['Asymmetric breathing (4 in, 6 out)', 'Naming the room (5-4-3)', 'Weight and pressure', 'Gating (lower the lights, step out)', 'Walking it out', 'Low, steady sound'];
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
        compute: function (ctx) {
          var rows = ctx.rows('reentry').filter(function (r) { return parseFloat(r.after) >= 0; });
          if (!rows.length) return [{ label: 'Coming back', value: 'Add a before-and-after reading to see where you are.' }];
          var a = parseFloat(rows[rows.length - 1].after);
          var band = a < 0.5 ? 'Under 0.50: go back in, at the time you named.'
            : a < 0.6 ? '0.50 to 0.60: do a second round, with the same calming step or the other one.'
              : (rows.length >= 2 ? '0.60 or above after two rounds: put it off to a specific time. "Tomorrow after dinner" is a real plan; "later" is not.' : '0.60 or above: do a second round first.');
          return [{ label: 'Latest reading', value: fmt(a, 2) }, { label: 'Next', value: band, note: 'When you come back, start with one small, simple task, like putting the dishes away.' }];
        }
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

  global.TOL_WORKPAPERS = W;
})(typeof window !== 'undefined' ? window : globalThis);
