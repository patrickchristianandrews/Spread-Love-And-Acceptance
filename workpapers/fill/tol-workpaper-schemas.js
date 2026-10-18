/*
  tol-workpaper-schemas.js — Spread Love & Acceptance
  Field-by-field definitions of the fill-in workpapers, taken from the
  manuscript source files. The engine in tol-workpaper.js renders the form
  and the PDF from these definitions.

  Column / field types: text, textarea, number, date, select, person, check, computed.
  "person" columns offer every person named at the top of the page (2 to 8,
  coded A to H), in the order they were typed, and optionally "Both" (shown as
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
  function balanceOf(amounts, target) {
    if (target && global.TOLCalc01) return global.TOLCalc01.balance(amounts, target.map(function (x) { return x * 100; })).value;
    if (target) {
      var tt = amounts.reduce(function (a, b) { return a + b; }, 0);
      if (amounts.length < 2 || !(tt > 0)) return null;
      var mv = amounts.reduce(function (a, x, i) { return a + Math.abs(x / tt - target[i]); }, 0) / 2, most = 1 - Math.min.apply(null, target);
      return most > 0 ? Math.max(0, Math.min(1, 1 - mv / most)) : 1;
    }
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

  // The last few lines of a sheet people settle on together: one box to tick, who agreed (optional,
  // shared sheets only), and an optional date to come back to it. Nothing to sign. Ticking it shows a
  // calm "Agreed on <date>" line; the date is kept in agreedOn. notYet(ctx), when given, lists what
  // still needs doing first (WP-03: jobs with no owner), and the box waits, with a gentle note.
  function closing(intro, solo, notYet) {
    var fields = [{ id: 'agreed', label: solo ? 'I\'m going with this' : 'We\'re agreed on this', type: 'check', closing: true }];
    if (!solo) fields.push({ id: 'agreedBy', label: 'Who agreed (optional)', type: 'text', placeholder: 'e.g. Sam and Jordan', help: 'Everyone who agreed can add their name, or leave it blank.' });
    fields.push({ id: 'lookAgain', label: 'Look at this again on (optional)', type: 'date' });
    var out = { id: 'closing', type: 'fields', title: solo ? 'Where I\'ve landed' : 'Where we\'ve landed', solo: !!solo, fields: fields };
    if (intro) out.intro = intro;
    if (notYet) out.notYet = notYet;
    return out;
  }

  /* ------------------------------------------------------------------ WP-01 */
  W['wp-01'] = {
    code: 'WP-01',
    title: 'Who did what',
    plain: 'Who did what',
    slug: 'Who-did-what',
    // "Share this week" / "Open a shared week" (tol-workpaper.js, with collab.js links): each person logs
    // their own rows; a row that is the same on both devices is kept once
    share: { what: 'week', after: 'totals', empty: 'Log a row or two first, then share the week.', noAutoKeep: true },
    purpose: "Write down what actually happened this week, before anyone starts remembering it as a story. Fill it in together, or each keep your own copy and compare at the end of the week. Either way, write down only what you did or saw yourself; never fill in someone else's side for them.",
    people: true,
    meta: [
      { id: 'weekOf', label: 'Week beginning', type: 'date' }
    ],
    sections: [
      {
        id: 'audit', type: 'table', title: 'Part A: Who did what, this week',
        intro: 'A plain log kept for 5–7 days, written down before anyone decides what it means. Add one row for each task noticed or done, including the invisible ones: remembering, planning, booking, forms. Time spent only thinking, noticing or planning counts too: log it with "Thinking and planning". Log what happened, not what should have happened. "Asked for" only means someone mentioned it first; it doesn\'t make the person who did it a helper, and the job counts just the same.',
        library: 'task',
        addLabel: 'Add a row',
        columns: [
          { id: 'day', label: 'Day', type: 'select', options: DAYS, w: 0.7, prefill: true },
          { id: 'task', label: 'Task noticed or done', type: 'text', w: 3 },
          { id: 'who', label: 'Who did it', type: 'person', both: true, w: 1.3 },
          { id: 'minutes', label: 'Minutes (rough)', type: 'number', w: 0.9, min: 0, max: 1440, step: '5', rangeNote: 'Minutes run from 0 to 1,440 (a whole day) in one row. Split a longer job into one row per day.' },
          // "Thinking and planning": the noticing, remembering and planning time, with no doing (the Lemonade Stand's thinking work)
          { id: 'how', label: 'How it came up: asked for, noticed, or thinking time?', type: 'select', options: ['Asked for', 'Noticed and handled', 'Thinking and planning'], w: 1.7 }
        ],
        defaultRows: DAYS.map(function (d) { return { day: d }; })
      },
      {
        id: 'totals', type: 'computed', title: "This week's totals",
        compute: function (ctx) {
          var people = ctx.people(), t = {}, noticed = {}, thinking = {}, bad = [];
          people.forEach(function (p) { t[p] = 0; noticed[p] = 0; thinking[p] = 0; });
          ctx.rows('audit').forEach(function (r) {
            var m = parseFloat(r.minutes);
            if (outOfRange(r.minutes, 0, 1440)) { bad.push(r.task || 'a row'); return; }
            if (!r.who || !(m > 0)) return;
            var share = {};
            if (r.who === 'Both') people.forEach(function (p) { share[p] = m / people.length; });
            else if (t.hasOwnProperty(r.who)) share[r.who] = m;
            Object.keys(share).forEach(function (p) {
              t[p] += share[p];
              if (r.how === 'Noticed and handled' || r.how === 'Thinking and planning') noticed[p] += share[p];
              if (r.how === 'Thinking and planning') thinking[p] += share[p];
            });
          });
          var total = people.reduce(function (a, p) { return a + t[p]; }, 0);
          // Someone (not a child) with no rows at all hasn't added their side yet: their week is missing,
          // not zero. No split and no balance until it is in, never "Jordan 0%, balance 0.00".
          var hasRow = {};
          ctx.rows('audit').forEach(function (r) { if (r.who && r.who !== 'Both' && (r.task || parseFloat(r.minutes) > 0)) hasRow[r.who] = true; });
          var waiting = people.length >= 2 && Object.keys(hasRow).length ? people.filter(function (p) { return !hasRow[p] && !(ctx.isChild && ctx.isChild(p)); }) : [];
          var left = bad.length ? { label: 'Left out', value: plural(bad.length, 'row') + ' (' + bad.slice(0, 3).join(', ') + (bad.length > 3 ? ' and ' + (bad.length - 3) + ' more' : '') + '): minutes need to be between 0 and 1,440 (a whole day) in one row.', note: 'Nothing is guessed. Fix the number and the totals update.' } : null;
          if (!total) return [{ label: 'Totals', value: 'Add rows with a person and minutes to see the totals.' }].concat(left ? [left] : []);
          if (waiting.length) {
            var wn = waiting.map(function (p) { return ctx.name(p) + '\u2019s'; }), wl = wn.length < 2 ? wn.join('') : wn.slice(0, -1).join(', ') + ' and ' + wn[wn.length - 1];
            var so = people.filter(function (p) { return hasRow[p]; }).map(function (p) { return { label: ctx.name(p), value: fmt(t[p], 0) + ' minutes logged so far' }; });
            return so.concat([{ label: 'The split', value: 'Waiting for ' + wl + (waiting.length === 1 ? ' side.' : ' sides.'), note: 'The split and the workload balance score appear once everyone has logged their own week. Nobody fills in someone else\u2019s side for them.' }]).concat(left ? [left] : []);
          }
          var tgt = ctx.target ? ctx.target() : null;
          var pct = {};
          people.forEach(function (p) { pct[p] = t[p] / total * 100; });
          // 1 = an even split; 0 = one person logged everything. With two people this is 1 - |A% - B%|;
          // with more, 1 - (the share of time that would have to change hands) / (the most it could be).
          var balance = balanceOf(people.map(function (p) { return t[p]; }), tgt ? tgt.t : null);
          var out = people.map(function (p) {
            return { label: ctx.name(p), value: fmt(t[p], 0) + ' minutes (' + fmt(pct[p], 0) + '%), of which ' + fmt(noticed[p], 0) + ' noticed and handled without being asked' + (thinking[p] ? ' (' + fmt(thinking[p], 0) + ' of them thinking and planning)' : '') };
          });
          out.push({ label: 'Workload balance score', value: fmt(balance, 2), note: 'Enter this as the workload balance number in CALC-01. It describes how the logged work was split this week, not anyone in it.' + (tgt ? ' It is read against ' + tgt.label + ', the same way the Lemonade Stand reads it.' : people.length > 2 ? ' With more than two people, it is 1 minus the share of the week\'s time that would have to change hands for an even split, divided by the most that could ever be.' : '') });
          if (tgt) {
            // against the split you agreed (or the nights each person is here), as the Lemonade Stand says it
            var gaps = people.map(function (p, i) { return pct[p] - tgt.t[i] * 100; }), big = 0;
            gaps.forEach(function (g, i) { if (Math.abs(g) > Math.abs(gaps[big])) big = i; });
            var gp = Math.round(Math.abs(gaps[big]));
            // the same words as the Lemonade Stand: within 5 points (or 10 while the balance holds) reads as close
            var held = balance != null && balance >= 0.70, off = ctx.name(people[big]) + ' is about ' + gp + ' points ' + (gaps[big] > 0 ? 'over' : 'under');
            out.push({ label: tgt.mode === 'agreed' ? 'Against the split you agreed' : 'Against each person\u2019s share', value: gp < 5 || (gp < 10 && held) ? 'Close to ' + tgt.label + ' this week.' : held ? 'Near ' + tgt.label + ' this week. ' + off + ', and the balance score still reads as holding.' : 'Further from ' + tgt.label + ' this week. ' + off + '.', note: 'A fact about how this week fell, not about effort or care.' });
            if (left) out.push(left);
            return out;
          }
          // Who is carrying the most, next to the balance: the logged minutes, and the unasked-for ones
          var cm = concentrationOf(people.map(function (p) { return t[p]; }), 60);
          var cn = concentrationOf(people.map(function (p) { return noticed[p]; }), 60);
          if (cm.flag) out.push({ label: 'Who’s carrying more right now', value: ctx.name(people[cm.top]) + ' logged ' + fmt(cm.share * 100, 0) + '% of the minutes. An even share would be ' + fmt(100 / people.length, 0) + '% each.', note: 'A fact about how this week fell, not about effort or care. One question is enough: which job would they most like to hand over?' });
          if (cn.flag) out.push({ label: 'Unasked-for work', value: ctx.name(people[cn.top]) + ' did ' + fmt(cn.share * 100, 0) + '% of the work that was noticed and handled without anyone asking.', note: 'This is the work that is easiest to miss. Say it out loud, and give the jobs that repeat a named owner on WP-03.' });
          if (left) out.push(left);
          return out;
        }
      },
      {
        id: 'refusals', type: 'table', title: 'Part B (optional): Kind ways to say no', optional: true,
        intro: 'Optional. Kind ways to say no, drafted ahead of time. Draft a "not right now" for a real situation in three steps: say why the request is fair, say honestly what you have left, and offer something instead.',
        addLabel: 'Add a refusal',
        // ready-made no's, shown as tap-to-copy chips above the boxes (on screen only, never in the PDF)
        ready: {
          title: 'Ready-made no\u2019s to copy',
          help: 'Tap one to copy it. Each one says the ask is fair, says what you have left, and offers something smaller instead.',
          groups: [
            { name: 'At work', items: [
              ['Can you cover a shift?', 'I can see you\u2019re stuck, and I want it covered too. I\u2019m running on empty this week, so I can\u2019t take another shift. I can help you ask around, or take a short one next week.'],
              ['Can you stay late tonight?', 'I know today got away from us. I can\u2019t stay past the end of my shift tonight. I can come in fifteen minutes early tomorrow to help catch up.'],
              ['Can you take on one more thing?', 'Thanks for thinking of me. My plate is full until the end of the month. If something comes off it, I can take this on. Which would you like me to drop?']
            ] },
            { name: 'Friends and family', items: [
              ['Can you help me move on Saturday?', 'I\u2019d love to help you settle in. I can\u2019t do a whole moving day this weekend; I need the rest. I can bring dinner on Sunday, or help unpack for an hour.'],
              ['Can you host this year?', 'I know someone has to, and it matters. I can\u2019t host this year. I\u2019ll bring a dish and help clear up.'],
              ['Are you coming out tonight?', 'I really want to see you. I\u2019m worn out tonight. Could we have a slow coffee this weekend instead?']
            ] },
            { name: 'At home', items: [
              ['Can you sort this out now?', 'That\u2019s fair, and it does need doing. I don\u2019t have it in me tonight. I\u2019ll do it first thing tomorrow.'],
              ['Can you do it this week?', 'I can see why it matters. I can\u2019t do the whole thing this week. I can do the first half on Thursday. Would that help?']
            ] },
            { name: 'Any time', items: [
              ['When you need a moment', 'I want to say yes, and I\u2019d do it badly right now. Can I give you a proper answer tomorrow?'],
              ['When the answer is just no', 'Not today. That isn\u2019t a no to you; it\u2019s a yes to the rest I need.']
            ] }
          ]
        },
        columns: [
          { id: 'kind', label: 'Type', type: 'select', options: ['Capacity check', 'Delegation pivot', 'Time commitment'], w: 1.2 },
          { id: 'ack', label: 'Acknowledge', type: 'textarea', w: 2 },
          { id: 'cap', label: 'State capacity', type: 'textarea', w: 2 },
          { id: 'alt', label: 'Offer an alternative', type: 'textarea', w: 2 }
        ],
        defaultRows: [{}]
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
  // words in the note that say caring for someone is part of the load
  var CARE_WORDS = /\b(car(e|es|ing|er|ers)\s+(for|of)|caregiv|carer|looking after|look after|nursing|hospital|dementia|hospice|respite)\b/i;
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
  // [the band in plain words, one line of what to do]
  function wp02Words(sb, solo) {
    if (sb < 0.15) return ['Very light load', 'Not much is left over from before today, so whatever comes up is probably about the thing itself.'];
    if (sb < 0.30) return ['Light load', 'Whatever is coming up is probably about the thing itself.'];
    if (sb < 0.45) return ['Medium load, on the lighter side', 'You\'re carrying a bit more than usual. Fine for most things; go gently with anything big.'];
    if (sb < 0.60) return ['Medium load, on the heavier side', solo ? 'Go gently, and leave big decisions for when you have more room.' : 'Before a hard conversation, it\'s worth saying out loud: "Heads up, I\'m carrying more than usual today."'];
    if (sb < 0.80) return ['High load', 'Put off anything that doesn\'t need deciding in the next hour. If you need to settle first, the Calm-Down Kit (WP-11) is made for this.'];
    return ['Very high load', solo ? 'Today is for looking after yourself and the basics. Let anything that can wait, wait, and pick a time to come back to it.' : 'Today is for looking after yourself and the basics. Say "not today" to anything that can wait, and name a time instead.'];
  }
  // solo: worded for one person on their own, with no shared average
  function wp02Reading(solo) {
    return function (ctx) {
      var s = wp02Score(ctx);
      if (s === null) return [{ label: 'Your load today', value: 'Answer all five rows to see it.' }];
      var sb = r2(s), w = wp02Words(sb, solo), points = Math.round(s * 20);
      // plain words first; the number and how it is worked out come after, folded away on screen
      var out = [{ label: 'Your load today', value: w[0] + ' (' + points + ' out of 20 points)', num: s }, { label: 'What to do', value: w[1] }];
      var top = WP02_FACTORS.filter(function (f) { return Number(ctx.value('factors.' + f.id)) >= 3; }).map(function (f) { return f.label.replace(/\s*\(.*\)$/, '').replace(/ specifically$/, '').toLowerCase(); });
      // In the high band, putting things off isn't always possible: caring for someone who is ill can't wait.
      // Only when caring is part of it (the tick, or the note says so), not for a work deadline.
      var caring = ctx.value('caring') === true || CARE_WORDS.test(String(ctx.value('note') || ''));
      if (sb >= 0.60 && caring) out.push({ label: 'If it can\u2019t wait', value: 'If what you\u2019re carrying can\u2019t wait, like caring for someone who is ill, that\u2019s a sign to get more help, not to try harder: ask one person for one specific thing this week, and look into respite care.', note: 'For people caring for someone: spreadloveandacceptance.com/caregivers.html', link: ['Help for caregivers', '/caregivers.html'] });
      // a long-term illness keeps the physical row high: that is load, not a mood
      if (Number(ctx.value('factors.physical')) >= 3) out.push({ label: 'If it\u2019s a long-term illness', value: 'Your physical row may always be high. That is load, not a mood.', note: 'When one of you is ill: spreadloveandacceptance.com/when-one-is-ill.html', link: ['When one of you is ill', '/when-one-is-ill.html'] });
      if (top.length) out.push({ label: 'Filled most by', value: top.join(', ') + '.', note: 'Conditions, not character. Some of them are in your control this week; some are just weather.' });
      out.push({ label: 'Load score', value: fmt(s, 2) + ' out of 1.00', more: 'How is this scored?', num: s, note: 'The five answers added up, then divided by 20. Higher means a heavier load (and a lower battery). The words follow these cut-offs: under 0.15 very light; 0.15 to 0.29 light; 0.30 to 0.44 medium, lighter side; 0.45 to 0.59 medium, heavier side; 0.60 to 0.79 high; 0.80 and up very high. (CALC-01 and the reports group them as under 0.30 low, 0.30 to 0.59 medium, 0.60 and up high.) These bands are this site\u2019s rule of thumb, not a validated clinical scale.' });
      if (solo) return out;
      // everyone else's shared scores ("0.4, 0.55, 0.3"); the average covers everyone on the road, or waits
      var raw = String(ctx.value('partnerScore') || '').split(/[,;\s]+/).filter(Boolean), others = raw.map(parseFloat);
      var bad = raw.filter(function (x, i) { return !(others[i] >= 0 && others[i] <= 1); });
      var road = parseInt(ctx.value('roadPeople'), 10);
      if (bad.length) out.push({ label: 'Left out', value: bad.join(', ') + (bad.length === 1 ? ' is' : ' are') + ' not between 0 and 1, so the average waits.', note: 'Each score is five answers added up and divided by 20, so it runs from 0 to 1 (for example 0.45).' });
      else if (others.length) {
        // side by side, with names where they came with a shared link: "You: 0.55 · Owen: 0.70 (14 of 20)"
        var whoL = String(ctx.value('partnerWho') || '').split('|');
        out.push({ label: 'Side by side', value: 'You: ' + fmt(s, 2) + ' (' + Math.round(s * 20) + ' of 20) \u00b7 ' + others.map(function (x, i) { return (String(whoL[i] || '').trim() || 'Someone') + ': ' + fmt(x, 2) + ' (' + Math.round(x * 20) + ' of 20)'; }).join(' \u00b7 ') + '.', note: 'Each score is only about the person who filled it in. Neither is a verdict on anyone.' });
        // the gap, in kind words: no "winner", and no one's fault
        var hiS = Math.max.apply(null, [s].concat(others)), loS = Math.min.apply(null, [s].concat(others)), gap = r2(hiS - loS);
        out.push({ label: 'The gap', value: gap < 0.10 ? 'Your loads are close (a gap of ' + fmt(gap, 2) + '). Nobody is carrying much more than the others right now.' : 'A gap of ' + fmt(gap, 2) + ': ' + (hiS === s ? 'yours reads higher' : 'one of the others reads higher') + ' right now. That isn\u2019t a contest or anyone\u2019s fault. It\u2019s a reason to look together at one thing that could come off the fuller plate this week.', note: 'The gap is the highest score take away the lowest.' });
        var all = [s].concat(others), avg = all.reduce(function (a, b) { return a + b; }, 0) / all.length;
        if (road > 1 && all.length < road) out.push({ label: 'Everyone\u2019s average', value: 'Waiting: ' + all.length + ' of ' + road + ' scores are in.', note: 'The shared average is never worked out while anyone\'s score is missing, or for someone else. It appears here once all ' + road + ' are in.' });
        else if (road > 1 && all.length > road) out.push({ label: 'Everyone\u2019s average', value: 'There are ' + all.length + ' scores here, and you said ' + road + ' people are doing this.', note: 'Check the list of scores: one may be in twice.' });
        else {
          // plain words: "Your average: 0.55, medium. Go gently with each other today."
          var ra = r2(avg), band = ra < 0.30 ? 'low' : ra < 0.60 ? 'medium' : 'high';
          var doNow = ra < 0.30 ? 'A fair day to talk things through.' : ra < 0.60 ? 'Go gently with each other today.' : 'Keep today light, and pick a time for anything big.';
          out.push({ label: 'Your average', value: 'Your average: ' + fmt(avg, 2) + ', ' + band + ' (' + all.length + ' people). ' + doNow, note: (road > 1 ? '' : 'Make sure everyone\'s score is in: an average from only some of you can mislead. ') + 'These bands are this site\u2019s rule of thumb, not a validated clinical scale.' });
        }
      }
      return out;
    };
  }
  W['wp-02'] = {
    code: 'WP-02',
    title: 'How much are you carrying?',
    plain: 'How much are you carrying?',
    slug: 'How-much-are-you-carrying',
    purpose: 'A one-minute check that each person fills in about themselves. It separates "How much am I already carrying?" from "How upset am I about this one thing?" Higher numbers mean more load. It is not a clinical test, just a structured gut-check.',
    people: false,
    // your own answers stay on this device (with "Erase" and "Forget it"), so opening someone's shared score
    // in a new tab never loses them
    keepByDefault: true,
    perPerson: true,
    // "Share as a link" / "Open a shared score" (tol-workpaper.js): someone else's score goes into "Everyone else's scores"
    share: { what: 'score', after: 'reading', values: WP02_FACTORS.map(function (f) { return 'factors.' + f.id; }).concat(['caring', 'note']), score: wp02Score },
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
        intro: 'Score each row based on how the last 24–48 hours have actually gone. Living with a long-term illness? Your physical row may always be high. That is load, not a mood.',
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
          { id: 'roadPeople', label: 'Doing this with others? How many people, counting you?', type: 'number', min: 1, max: 8, step: '1', prefill: true, help: 'Just you? Leave it blank. With others, the shared average waits until everyone\'s score is in.' },
          // the id stays partnerScore, so drafts and PDFs saved before still open; it shows once there is someone else
          { id: 'partnerScore', label: 'Someone else\'s score (optional)', type: 'text', placeholder: 'e.g. 0.45', help: 'The number from their own sheet, if they sent it. More than one? Put them all here, with commas between.',
            showIf: function (v) { return parseInt(v.roadPeople, 10) > 1 || String(v.partnerScore == null ? '' : v.partnerScore).trim() !== ''; } },
          { id: 'caring', label: 'Some of what I\'m carrying is caring for someone', type: 'check' },
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
  // One owner per job: every job gets one owner, the person who does it and sees it through. A helper
  // (someone who pitches in, covers, or notices if it slips) is optional. The field ids stay r (owner)
  // and a (helper), so drafts and PDFs saved before the rename still open.
  function wp03Clarity(ctx) {
    var all = ctx.rows('treaty').filter(function (r) { return r.task; });
    // starter jobs nobody has touched are examples: they never count for or against the score
    var rows = all.filter(function (r) { return !ctx.isExample('treaty', r); }), examples = all.length - rows.length;
    var exNote = examples ? ' ' + (examples === 1 ? '1 example job from the starter list isn’t counted until you give it an owner or change it.' : examples + ' example jobs from the starter list aren’t counted until you give them an owner or change them.') : '';
    if (!rows.length) return [{ label: 'Jobs with an owner', value: examples ? 'Add an owner to a job, or add your own jobs, to see the score. Nothing is counted yet.' : 'Add jobs to see the score.', note: exNote ? exNote.trim() : '' }];
    var clear = rows.filter(function (r) { return r.r; });
    var missing = rows.filter(function (r) { return !r.r; }).map(function (r) { return r.task; });
    // how the owners are spread: clarity can read 1.00 with one person holding everything. "Both (decide
    // together)" counts as owned, and for nobody's share. No verdict against an even split: two homes, a
    // weekday/weekend schedule or very different hours can make another split the fair one.
    // house rules ("Phone time", "Homework before games") need someone who keeps to them, but they aren't
    // load: they stay out of who owns more
    var rules = rows.filter(function (r) { return isHouseRule(r.task); }), load = rows.filter(function (r) { return !isHouseRule(r.task); });
    var people = ctx.people(), byR = people.map(function (p) { return load.filter(function (r) { return r.r === p; }).length; });
    var together = load.filter(function (r) { return r.r === 'Both'; }).length;
    var c = concentrationOf(byR, 3), named = byR.reduce(function (a, b) { return a + b; }, 0);
    var share = clear.length / rows.length;
    var words = share === 1 ? (examples ? 'Every job you’ve set has an owner. ' + examples + ' example ' + (examples === 1 ? 'job is' : 'jobs are') + ' still on the list: give ' + (examples === 1 ? 'it' : 'them') + ' an owner, or remove ' + (examples === 1 ? 'it' : 'them') + ' if you don’t need ' + (examples === 1 ? 'it' : 'them') + '.' : 'Every job has an owner.') : !clear.length ? 'No job has an owner yet.' : share >= 0.7 ? 'Most jobs have an owner.' : 'Some jobs have an owner.';
    // plain words first; the number, and where it goes, folded under "What's this number?"
    var sc = ctx.schema || {};
    var out = [{ label: sc.rulesOnly ? 'Rules with someone who keeps them' : 'Jobs with an owner', num: share, value: clear.length + ' of ' + rows.length + '. ' + words, more: 'What’s this number?',
      note: 'As a share, ' + clear.length + ' of ' + rows.length + ' is ' + fmt(share, 2) + ' out of 1.00. It only asks whether each job has a name next to it, not whether the split feels fair. “' + ctx.name('Both') + ' (decide together)” counts as an owner: use it for decisions, and give jobs one name. If you use the calculator Is the setup working for everyone? (CALC-01), this is the number for its jobs-with-an-owner box.' + (c.flag ? ' Read it next to “Who’s carrying more right now” below.' : '') + exNote }];
    if (sc.rulesOnly) out[0].value = out[0].value.replace(/an owner/g, 'someone who keeps it').replace(/jobs/g, 'rules').replace(/job/g, 'rule');
    if (missing.length) out.push({ label: sc.rulesOnly ? 'Still needs someone who keeps it' : 'Still needs an owner', value: missing.join(', ') });
    // a list of house rules: rules need someone who keeps them, but they aren't load, so no "who does more"
    if (sc.rulesOnly) return out;
    // Weighed by how often each job comes round (a daily job about five times a weekly one, a monthly one a
    // quarter, "as needed" a little), and by its size (Small, Medium, Big) or the hours it takes each time,
    // where given. The same figure for everyone on the sheet, never one person's number on its own.
    var FREQW = { Daily: 5, 'Each meeting': 1, Weekly: 1, Monthly: 0.25, 'As needed': 0.1, Ongoing: 1 }, SIZEW = { Small: 0.5, Medium: 1, Big: 2 };
    function wOf(r) { var f = FREQW[r.freq] != null ? FREQW[r.freq] : 1, hr = parseFloat(r.hrs); return hr > 0 && hr <= 200 ? f * hr / 0.5 : f * (SIZEW[r.size] || 1); }
    var anyFreq = load.some(function (r) { return FREQW[r.freq] != null; }), anyLen = load.some(function (r) { return parseFloat(r.hrs) > 0; }), sized = load.some(function (r) { return SIZEW[r.size]; });
    var wper = people.map(function (p) { return load.filter(function (r) { return r.r === p; }).reduce(function (a, r) { return a + wOf(r); }, 0); });
    var wtog = load.filter(function (r) { return r.r === 'Both'; }).reduce(function (a, r) { return a + wOf(r); }, 0);
    var wsum = wper.reduce(function (a, b) { return a + b; }, 0) + wtog;
    var homes = !!sc.homes;
    function who(p) { return homes ? ctx.name(p) + '’s home' : ctx.name(p); }
    var wpct = wsum > 0 ? wholePct(people.map(function (_, i) { return wper[i] + (homes ? 0 : wtog / people.length); }).concat(homes ? [wtog] : [])) : null;
    var weighLine = wpct && (anyFreq || sized || anyLen) ? 'Counted by how often each job comes round (a daily job about five times a weekly one, a monthly one a quarter)' + (sized || anyLen ? ', and by size or time where you gave it' : '') + ': ' +
      people.map(function (p, i) { return who(p) + ' ' + wpct[i] + '%'; }).join(' · ') + (homes ? (wtog ? ' · Together ' + wpct[people.length] + '%' : '') : wtog ? ' (a job you decide together counts the same for each of you)' : '') + '.' : '';
    // how often each person's jobs come round, next to the count: a daily job isn't a monthly one
    function often(p) { return freqBits(load.filter(function (r) { return r.r === p; })); }
    var spread = homes
      ? people.map(function (p, i) { var f = often(p); return who(p) + ' ' + byR[i] + (f ? ' (' + f + ')' : ''); }).join(' · ') + (together ? ' · Together ' + together : '') + ' (jobs owned).'
      : people.map(function (p, i) { var f = often(p); return ctx.name(p) + ' ' + byR[i] + (f ? ' (' + f + ')' : ''); }).join(', ') + (together ? ', ' + (people.length > 2 ? 'everyone' : 'both') + ' together ' + together : '') + ' (jobs owned).';
    var rulesNote = rules.length ? ' ' + plural(rules.length, 'house rule') + ' on the list ' + (rules.length === 1 ? 'isn’t' : 'aren’t') + ' counted here: a rule needs someone who keeps to it, but it isn’t load.' : '';
    var notScore = ' Counting jobs isn’t counting the work: a daily job comes round far more often than a monthly one. It’s a starting point for a talk, not a scorecard.';
    var weighNote = weighLine ? (homes ? '' : 'Counting how often each job comes round changes the picture: a few daily jobs can outweigh many monthly ones. ') + 'Give a job a size, or the hours it takes each time, and this counts a big one for more than a quick one.' : 'Some jobs come round more often, or are bigger, than others. Give each job how often it comes round (and a size, if you like), and this counts a daily job for more than a monthly one.';
    var agreed = String(ctx.value('split') || '').trim(), tgt = ctx.target ? ctx.target() : null;
    var ask = agreed ? 'You wrote down the split you agreed: “' + agreed + '”. Does this match it?' : 'Does this match what you agreed? An even split isn’t always the goal: two homes, weekdays and weekends, or very different hours can make another split fair.';
    // who carries more: by the weighed jobs once how often is given, otherwise by the count
    var cw = anyFreq || sized || anyLen ? concentrationOf(wper, 0) : c;
    if (cw.flag && named < 3) cw = { flag: false };
    if (tgt && cw.top != null) ask += ' The split you agreed elsewhere on this site gives ' + ctx.name(people[cw.top]) + ' about ' + fmt(tgt.t[cw.top] * 100, 0) + '%.';
    // two homes: the jobs as they sit across the homes, never a score for one parent
    if (homes && people.length >= 2 && named + together >= 1) { out.push({ label: 'How the jobs sit across the homes', value: (weighLine || spread) + rulesNote, note: (weighLine ? spread + ' ' : '') + (agreed ? ask + ' ' : '') + 'Two homes rarely split evenly, and that can be fair: weekdays and weekends, distance and work all play a part.' }); return out; }
    if (cw.flag) { var tf = often(people[cw.top]); out.push({ label: 'Who’s carrying more right now', value: (weighLine ? weighLine + ' ' + ctx.name(people[cw.top]) + ' owns ' + byR[cw.top] + ' of the ' + named + ' jobs with one owner' : ctx.name(people[cw.top]) + ' owns ' + cw.count + ' of the ' + named + ' jobs with one owner') + (tf ? ' (' + tf + ')' : '') + '.' + (together ? ' ' + together + ' decided together.' : '') + rulesNote, note: ask + ' If it doesn’t match, ask which job could move first. ' + weighNote + notScore }); }
    else if (people.length >= 2 && named + together >= 3) out.push({ label: 'How the jobs are spread', value: (weighLine ? weighLine + ' ' : '') + spread + rulesNote, note: (agreed ? ask + ' ' : '') + weighNote + notScore });
    return out;
  }
  // whole percentages that add up to 100
  function wholePct(w) {
    var s = w.reduce(function (a, b) { return a + b; }, 0) || 1, raw = w.map(function (x) { return x / s * 100; }), r = raw.map(Math.floor), left = 100 - r.reduce(function (a, b) { return a + b; }, 0);
    raw.map(function (x, i) { return { i: i, f: x - Math.floor(x) }; }).sort(function (a, b) { return b.f - a.f; }).forEach(function (o) { if (left > 0) { r[o.i]++; left--; } });
    return r;
  }
  // "3 daily, 1 weekly": how often a set of jobs comes round (jobs with no how-often left out)
  function freqBits(list) {
    var order = [], n = {};
    list.forEach(function (r) { var f = r.freq; if (!f) return; if (!n[f]) { n[f] = 0; order.push(f); } n[f]++; });
    var rank = ['Daily', 'Each meeting', 'Weekly', 'Monthly', 'Ongoing', 'As needed'];
    order.sort(function (a, b) { return rank.indexOf(a) - rank.indexOf(b); });
    return order.map(function (f) { return n[f] + ' ' + f.toLowerCase(); }).join(', ');
  }
  // A job from the task library's "House rules for us" group (or one written like it)
  var RULES = null;
  function isHouseRule(task) {
    if (RULES === null) {
      RULES = {};
      var lib = global.TOL_TASK_LIBRARY ? global.TOL_TASK_LIBRARY('family', 'owner') : null;
      (lib && lib.groups ? lib.groups : []).forEach(function (g) { if (/house rules/i.test(g.name)) g.items.forEach(function (it) { RULES[String(it[0]).toLowerCase()] = 1; }); });
    }
    var t = String(task || '').trim().toLowerCase();
    return !!t && (!!RULES[t] || /^(house )?rule:/.test(t));
  }
  // The jobs that still have no owner (untouched examples left out), for the closing's gentle note.
  function wp03Unowned(ctx) {
    return ctx.rows('treaty').filter(function (r) { return r.task && !r.r && !ctx.isExample('treaty', r); }).map(function (r) { return r.task; });
  }
  W['wp-03'] = {
    code: 'WP-03',
    title: 'One owner per job',
    plain: 'One owner per job',
    slug: 'One-owner-per-job',
    // "Share this list" / "Open a shared list" (tol-workpaper.js): jobs are matched by their name
    share: { what: 'list', after: 'treaty', keys: { treaty: 'task' } },
    purpose: 'A living agreement about who owns which job, for a household, a team, or a family sharing someone\'s care. Every regular job gets one owner: the person who does it and sees it through. That way nobody has to re-decide who owns what every week. If you like, add a helper or backup: someone who pitches in, notices if it slips, or covers it on a bad day or a busy week. That is optional.',
    people: true,
    meta: [
      { id: 'reviewDate', label: 'Date of this list', type: 'date' },
      { id: 'split', label: 'The split you agreed (optional)', type: 'text', placeholder: 'e.g. weekdays here, weekends there' }
    ],
    sections: [
      {
        type: 'note', pdf: false,
        text: "This works on its own: list the jobs that keep things running (a home or two, a team, or a parent's care) and give each one a single owner. If you still disagree about who does what, a week of Who did what (WP-01) helps settle it. The starter jobs below are examples. They don't count until you give one an owner or change it. Remove any that don't apply to you, and add the ones that do, including the invisible ones: forms, gifts, renewals, planning, appointments. Sharing a parent's care? The task library below has a Caring for a parent group."
      },
      {
        id: 'treaty', type: 'table', title: 'Who owns each job',
        addLabel: 'Add a job',
        library: 'owner',
        examples: true,
        columns: [
          { id: 'task', label: 'Job', type: 'text', w: 2.3 },
          { id: 'freq', label: 'How often', type: 'select', options: ['Daily', 'Weekly', 'Monthly', 'As needed', 'Ongoing'], w: 1.1 },
          { id: 'r', label: 'Owner', type: 'person', both: true, bothNote: '(decide together)', w: 1.1 },
          { id: 'a', label: 'Helper or backup (optional)', type: 'person', notSameAs: 'r', w: 1.1 },
          { id: 'size', label: 'Size (optional)', type: 'select', options: ['Small', 'Medium', 'Big'], w: 1 },
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
        id: 'clarity', type: 'computed', title: 'Does every job have an owner?',
        compute: wp03Clarity
      },
      {
        id: 'amendments', type: 'table', title: 'Changes to the list', optional: true,
        intro: 'When life changes, rework the agreement in writing, instead of letting jobs drift to whoever started doing more. Anyone on it can ask for a review at a weekly check-in, or at What keeps coming back? (WP-04), the monthly look-back.',
        addLabel: 'Add a change',
        columns: [
          { id: 'date', label: 'Date', type: 'date', w: 1.1 },
          { id: 'change', label: 'What changed', type: 'textarea', w: 3.5 },
          { id: 'initA', label: 'Who', type: 'text', w: 1.4 }
        ],
        defaultRows: [{}]
      },
      closing('Agreeing means everyone has read this version and knows who owns what. It doesn\'t mean every job feels perfectly fair, only that ownership is clear.', false, wp03Unowned)
    ]
  };

  /* ------------------------------------------------------------------ WP-04 */
  function flagged(r) { return ['w1', 'w2', 'w3', 'w4'].filter(function (k) { return r[k]; }).length; }
  W['wp-04'] = {
    code: 'WP-04',
    title: 'What keeps coming back?',
    plain: 'What keeps coming back?',
    slug: 'What-keeps-coming-back',
    // "Share this list" / "Open a shared list": tasks are matched by name, so each person's notes combine
    share: { what: 'list', after: 'close', keys: { raw: 'task', classify: 'task', thanks: 'job' }, unit: ['task', 'tasks'], empty: 'Add a task first, then share the list.', noAutoKeep: true },
    purpose: 'What keeps coming back? A monthly look-back, done together, across four weeks of Who did what (WP-01) and One owner per job (WP-03). It looks for the tasks that keep slipping. The goal is not to tally what anyone owes, but to find where the setup needs a fix.',
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
          { id: 'owner', label: 'Named owner on the job list?', type: 'select', options: ['Yes', 'No'], w: 1 },
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
      closing()
    ]
  };

  /* ------------------------------------------------------------------ WP-09 */
  W['wp-09'] = {
    code: 'WP-09',
    title: 'Say it so it lands',
    plain: 'Say it so it lands',
    slug: 'Say-it-so-it-lands',
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
          { id: 'raw', label: 'Raw reaction', type: 'textarea', help: 'Optional, and just for you. It is left out of the PDF and of any file you save to share (a draft, Save my progress) unless you tick the box.', privateOptIn: 'Include my raw reaction in the PDF and in saved files' },
          { id: 'fact', label: "What's the fact underneath this? (One sentence, no adjectives.)", type: 'textarea', help: 'For example: "The bins went out late on Tuesday." One event, no "always" or "you never".' },
          { id: 'feeling', label: "What's the feeling underneath this? (Frustrated, tired, unseen, rushed…)", type: 'textarea', chips: FEELINGS, chipsLabel: 'Tap a word to add it', help: 'For example: "I felt rushed and a bit alone with it." A feeling about you, not a verdict about them.' },
          { id: 'ask', label: "What's the actual ask? (What do you want to happen next, specifically?)", type: 'textarea', help: 'For example: "Could we set a reminder for Monday nights?" Something the other person can say yes to.' }
        ]
      },
      {
        id: 'filter', type: 'checks', title: 'Before you react: four quick checks',
        items: [
          { id: 'specific', label: 'Is this about a specific, nameable task or event?', options: ['Yes', 'No'] },
          { id: 'saturation', label: "Would I read this the same way if I weren't already carrying a lot (WP-02)?", options: ['Yes', 'No', 'Not sure'] },
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
  // plain words on screen; the stored value stays the same, so saved answers still open
  var WP11_TACTIC_LABELS = { 'Gating (lower the lights, step out)': 'Less coming in (lower the lights, step out)' };
  // solo: "pick things back up" rather than "go back in" to a conversation
  function wp11Next(solo) {
    var RT = ' These bands are this site\u2019s rule of thumb, not a validated clinical scale.';
    var BACK = solo ? 'pick things back up' : 'go back to the conversation';
    return function (ctx) {
      var all = ctx.rows('reentry'), bad = all.filter(function (r) { return outOfRange(r.before, 0, 1) || outOfRange(r.after, 0, 1); });
      var left = bad.length ? [{ label: 'Left out', value: plural(bad.length, 'reading') + ' with a number outside 0 to 1.', note: 'These are WP-02 load scores: the five answers added up and divided by 20, so they run from 0 to 1 (for example 0.45).' }] : [];
      var come = 'When you come back, start with one small, simple task, like putting the dishes away.';
      // the plain rule first: how you feel now. "Still hot? Another round. Twice? Name a new time."
      var felt = all.filter(function (r) { return r.feel; });
      if (felt.length) {
        var lastF = felt[felt.length - 1], hot = felt.filter(function (r) { return r.feel === 'Still hot'; }).length;
        var say = lastF.feel === 'Settled enough' ? 'Settled enough: ' + BACK + ', at the time you named.'
          : hot >= 2 ? 'Still hot, twice now: name a new time. "Tomorrow after dinner" is a real plan; "later" is not.'
            : 'Still hot: take another round, with the same calming step or the other one.';
        return [{ label: 'Next', value: say, note: come }].concat(left);
      }
      var rows = all.filter(function (r) { return inRange(r.after, 0, 1) !== null && !outOfRange(r.before, 0, 1); });
      if (!rows.length) return [{ label: 'Coming back', value: 'After a round, pick how you feel now (still hot, or settled enough) to see what comes next.' }].concat(left);
      // for number fans: the load score as a second opinion
      var last = rows[rows.length - 1], a = inRange(last.after, 0, 1), b = inRange(last.before, 0, 1);
      var band = a < 0.5 ? 'Settled enough: ' + BACK + ', at the time you named. (Under 0.50.)'
        : a < 0.6 ? 'If you still feel hot, take another round, with the same calming step or the other one. (0.50 to 0.59.)'
          : (rows.length >= 2 ? 'Still hot after two rounds: put it off to a specific time. "Tomorrow after dinner" is a real plan; "later" is not. (0.60 or above.)' : 'Still hot: take another round first. (0.60 or above.)');
      var out = [{ label: 'Latest reading', value: fmt(a, 2) }];
      // a reading that went up is worth saying out loud, kindly
      if (b !== null && r2(a) > r2(b)) out.push({ label: 'It went up', value: 'Your load went from ' + fmt(b, 2) + ' to ' + fmt(a, 2) + '. That happens, and it is useful to know. Try your other calming step, or put it off to a named time.' });
      out.push({ label: 'Next', value: band, note: come + ' (0.50 is the come-back line for settling: you don\'t need a light load to come back, just less than half.)' + RT });
      return out.concat(left);
    };
  }
  // The pause plan as a few plain lines, and as a link to the site's simpler pause plan
  // (/pursue-withdraw.html#plan), which opens it on the other phone, ready to change and send back.
  function wp11PlanText(v) {
    function g(k) { return String(v[k] == null ? '' : v[k]).trim(); }
    var out = ['Our pause plan'];
    if (g('planWord')) out.push('Pause word or signal: ' + g('planWord'));
    if (g('planMin')) out.push('Shortest break: ' + g('planMin'));
    if (g('planBack')) out.push('Coming back: ' + g('planBack'));
    if (g('planFirst')) out.push('When we come back, we start with: \u201c' + g('planFirst').replace(/^[\u201c"]+|[\u201d"]+$/g, '') + '\u201d');
    return out.length > 1 ? out.join('\n') : '';
  }
  function wp11PlanLink(v, origin) {
    function g(k) { return String(v[k] == null ? '' : v[k]).trim().slice(0, 200); }
    var o = {};
    if (g('planWord')) o['pp-word'] = g('planWord');
    var m = /^(20 minutes|30 minutes|45 minutes|1 hour)$/i.exec(g('planMin'));
    if (m) o['pp-min'] = m[1].toLowerCase();
    if (g('planBack')) o['pp-late'] = g('planBack');
    if (g('planFirst')) o['pp-first'] = g('planFirst');
    if (!Object.keys(o).length) return '';
    var enc = ''; try { enc = btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/=+$/, ''); } catch (e) { return ''; }
    return (origin || '') + '/pursue-withdraw.html#plan=' + enc;
  }
  W['wp-11'] = {
    code: 'WP-11',
    title: 'The Calm-Down Kit',
    plain: 'The Calm-Down Kit',
    slug: 'The-Calm-Down-Kit',
    purpose: 'A short plan, made ahead of time, for calming your body down enough to have the conversation, or to put it off honestly. Everyone fills in their own kit, about themselves, and keeps it. The pause plan is the one part you agree on together and share. Fill in Part A on an ordinary day, not a hard one.',
    people: false,
    perPerson: true,
    privateNote: 'Your kit is private; the pause plan is made to share.',
    // kept on this device as soon as something is typed (with "Forget it" in the save bar), like the shared lists
    keepByDefault: true,
    meta: [
      { id: 'name', label: 'Whose kit is this? (your name)', type: 'text' },
      { id: 'date', label: 'Date', type: 'date' }
    ],
    sections: [
      {
        type: 'note', pdf: false,
        text: 'Most of this kit is about you, and it stays yours: each person fills in their own, never someone else\'s, and nobody hands it to the other person. The one part made to agree on and share is "Our pause plan" below: the pause word, the break, and how you come back.'
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
          { id: 'first', label: 'First default', type: 'select', options: WP11_TACTICS, labels: WP11_TACTIC_LABELS },
          { id: 'second', label: "Second, if the first isn't available", type: 'select', options: WP11_TACTICS, labels: WP11_TACTIC_LABELS }
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
        id: 'plan', type: 'fields', title: 'Our pause plan (agree it together, and share it)',
        intro: 'Unlike the rest of the kit, this part is meant to be agreed together, on a calm day, and shared, so a pause is never mistaken for walking out. A few words in each box is plenty.',
        fields: [
          { id: 'planWord', label: 'Our pause word or signal', type: 'text', placeholder: 'e.g. Timeout, or a hand on the table' },
          { id: 'planMin', label: 'The shortest break we take', type: 'text', placeholder: 'e.g. 20 minutes' },
          { id: 'planBack', label: 'How we set the time to come back', type: 'text', placeholder: 'e.g. Whoever pauses names a time, within the day' },
          { id: 'planFirst', label: 'The first sentence when we come back', type: 'text', placeholder: 'e.g. Thanks for waiting. I\'m ready to listen now.' }
        ],
        // "Send our pause plan": only these four boxes, never the rest of the kit (tol-workpaper.js, sendEl)
        send: { title: 'Our pause plan', text: wp11PlanText, link: wp11PlanLink }
      },
      {
        type: 'note', pdf: true,
        text: 'Part B, in the moment: say your pause word or line, then do your first calming step. Nothing in this kit works by cold, pain or shock, and none of it is treatment.'
      },
      {
        id: 'reentry', type: 'table', title: 'Part C: Coming back',
        intro: 'Still hot? Another round. Twice? Name a new time. Settled enough to listen? Go back at the time you named. After each round, write what you did and how you feel now. Putting it off to a named time is a plan, not giving up.',
        fans: { label: 'For number fans: add load scores', note: 'If you like numbers, the load score (WP-02, 0 to 1) is a second opinion: under 0.50 go back, 0.50 to 0.59 another round, 0.60 or above after two rounds put it off. ' + 'These bands are this site\u2019s rule of thumb, not a validated clinical scale.' },
        addLabel: 'Add a reading',
        rangeCols: true,
        columns: [
          { id: 'time', label: 'Time', type: 'text', w: 1, placeholder: 'e.g. 7:40pm' },
          { id: 'tactic', label: 'What I did', type: 'select', options: WP11_TACTICS, labels: WP11_TACTIC_LABELS, w: 2.2 },
          { id: 'feel', label: 'How I feel now', type: 'select', options: ['Still hot', 'Settled enough'], w: 1.3 },
          { id: 'before', label: 'Load before (WP-02, 0–1)', type: 'number', fans: true, w: 1, step: '0.01', min: 0, max: 1, rangeNote: 'A WP-02 load score runs from 0 to 1 (for example 0.45).' },
          { id: 'after', label: 'Load after (WP-02, 0–1)', type: 'number', fans: true, w: 1, step: '0.01', min: 0, max: 1, rangeNote: 'A WP-02 load score runs from 0 to 1 (for example 0.45).' },
          { id: 'change', label: 'Change', type: 'computed', fans: true, w: 0.9, compute: function (r) {
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
      // the kit is personal on every road, so its closing is in the first person
      closing(null, true)
    ]
  };

  /* ------------------------------------------------------------------ WP-13 */
  var WP13_ROWS = [];
  DAYS.forEach(function (d) { WP13_ROWS.push({ day: d, who: 'A' }); WP13_ROWS.push({ day: d, who: 'B' }); });
  W['wp-13'] = {
    code: 'WP-13',
    title: 'The 90-second daily check-in',
    plain: 'The 90-second daily check-in',
    slug: 'The-90-second-daily-check-in',
    // "Share this week" / "Open a shared week": each person's rows are matched by day and name
    share: { what: 'week', after: 'daily', keys: { resync: 'item' } },
    // the week's table and the rest fold away under "Just tonight", which works on its own
    foldWeek: true,
    purpose: 'A 90-second daily check-in that keeps everyone in step with small, steady corrections instead of occasional big ones. Each person answers each prompt in one sentence, about their own day. No debating, no solving, no arguing back.',
    people: true,
    meta: [
      { id: 'weekOf', label: 'Week beginning', type: 'date' }
    ],
    sections: [
      {
        id: 'daily', type: 'table', title: 'Each day',
        intro: 'Each person fills in only their own rows: yours are the ones with your name under Person. Load: "Today I was at about low / medium / high capacity." Appreciation: one specific thing you appreciated today about someone you share your days with (a partner, a housemate, a teammate). The other two columns are optional. Anything that needs a real discussion waits for the weekly catch-up. When you can, do it face to face or on a call (in the evening, or at the shift change), and kindly.',
        addLabel: 'Add a row',
        personDays: DAYS,
        // shown under "Just tonight's check-in": the same questions, for a team or for housemates
        others: [
          ['A team', 'Make it a 5-minute stand-up, at the start or end of the day. Go round once, one sentence each, with the same questions: how full is your load (low, medium or high), one thank-you to someone on the team, one thing that got in the way (a process, not a person), and one thing that would help tomorrow. Anything bigger goes to a follow-up, not the stand-up. A \u201chigh\u201d is useful information, never a complaint.'],
          ['Housemates', 'Once or twice a week is plenty, at a time you\u2019re all home, like Sunday evening. Same questions, one sentence each. Keep the thing that didn\u2019t feel great about a shared thing (the bins, the noise, the bills), never someone\u2019s character. Jobs that keep slipping go on One owner per job (WP-03).']
        ],
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
          { id: 'to', label: 'Move to', type: 'select', options: ['RACI Treaty (WP-03)', 'Tone Filter (WP-09)', 'Keep watching'], labels: { 'RACI Treaty (WP-03)': 'One owner per job', 'Tone Filter (WP-09)': 'Say it so it lands' }, w: 1.8 }
        ],
        defaultRows: [{}]
      },
      closing()
    ]
  };

  /* ------------------------------------------------------------------ WP-12 */
  // Same moment, different speeds (the Carrier Frequency Audit). For a few moments that come round
  // often, each person marks their own speed, how much they want to talk, and how urgent it feels.
  // A gap is how many steps apart two answers are on that list: a difference in pace, not in caring.
  var WP12_SPEED = ['Right away', 'Within the hour', 'Later the same day', 'After a night’s sleep'];
  var WP12_TALK = ['Quiet time first', 'A few words, then act', 'Talk it all through'];
  var WP12_URGENT = ['Low', 'Medium', 'High'];
  var WP12_MOMENTS = ['A plan changes at the last minute', 'A bill, letter or form needs dealing with', 'Something breaks or goes wrong at home', 'One of us is upset about something', 'Deciding what to do with free time'];
  var WP12_ROWS = [];
  WP12_MOMENTS.forEach(function (m) { WP12_ROWS.push({ moment: m, who: 'A' }); WP12_ROWS.push({ moment: m, who: 'B' }); });
  function wp12Gaps(ctx) {
    var by = {}, order = [];
    ctx.rows('pace').forEach(function (r) {
      var m = String(r.moment || '').trim();
      if (!m || !r.who || !(r.speed || r.talk || r.urgent)) return;
      var k = m.toLowerCase();
      if (!by[k]) { by[k] = { name: m, rows: [] }; order.push(k); }
      by[k].rows.push(r);
    });
    var out = [], ranked = [];
    order.forEach(function (k) {
      var g = by[k], who = {};
      g.rows.forEach(function (r) { who[r.who] = 1; });
      if (Object.keys(who).length < 2) { out.push({ label: g.name, value: 'Waiting for a second person’s answers.' }); return; }
      var total = 0, bits = [];
      [['Speed', 'speed', WP12_SPEED], ['Talk', 'talk', WP12_TALK], ['Urgency', 'urgent', WP12_URGENT]].forEach(function (d) {
        var got = g.rows.filter(function (r) { return d[2].indexOf(r[d[1]]) >= 0; });
        if (got.length < 2) return;
        var idx = got.map(function (r) { return d[2].indexOf(r[d[1]]); }), steps = Math.max.apply(null, idx) - Math.min.apply(null, idx);
        total += steps;
        bits.push(d[0] + ': ' + (steps === 0 ? 'in step' : plural(steps, 'step') + ' apart (' + got.map(function (r) { return ctx.name(r.who) + ': ' + String(r[d[1]]).toLowerCase(); }).join(' · ') + ')'));
      });
      if (!bits.length) { out.push({ label: g.name, value: 'Waiting for a second person’s answers.' }); return; }
      ranked.push({ name: g.name, total: total });
      out.push({ label: g.name, value: bits.join('. ') + '.' });
    });
    if (!out.length) return [{ label: 'Where your speeds differ', value: 'Each person marks their own rows. A moment shows up here once two people have answered it.' }];
    var big = ranked.filter(function (x) { return x.total >= 2; }).sort(function (a, b) { return b.total - a.total; });
    if (ranked.length) out.push({
      label: 'Start with',
      value: big.length ? big[0].name + (big[1] ? '. Then: ' + big[1].name.charAt(0).toLowerCase() + big[1].name.slice(1) : '') + '.' : 'No big gaps in what you’ve marked so far. Keep the sheet, and look again in a few months.',
      note: 'A gap is a difference in pace, not in how much anyone cares. Write one small agreement for the biggest one below, and try it for two weeks.'
    });
    return out;
  }
  W['wp-12'] = {
    code: 'WP-12',
    title: 'Same moment, different speeds',
    plain: 'Same moment, different speeds',
    slug: 'Same-moment-different-speeds',
    // "Share this sheet" / "Open a shared sheet": each person's own rows travel; agreements are matched by moment
    share: { what: 'sheet', after: 'agree', keys: { agree: 'moment' }, unit: ['row', 'rows'], empty: 'Fill in a row first, then share the sheet.', noAutoKeep: true },
    purpose: 'For a few moments that come round often, each person marks how fast they want to move, how much they want to talk, and how urgent it feels. Then you look at the gaps together. Most of them turn out to be a difference in pace, not in willingness, and a small agreement closes most of the gap.',
    people: true,
    meta: [
      { id: 'date', label: 'Date', type: 'date' }
    ],
    sections: [
      {
        type: 'note', pdf: false,
        text: 'Each person fills in only their own rows, ideally before looking at the other person’s. Answer for how you really are on an ordinary day, not how you think you should be. The five moments are a start: change them to ones that come round in your life, and add more with “Add a moment”. Leave a box blank if it doesn’t apply.'
      },
      {
        id: 'pace', type: 'table', title: 'Part A: Each person’s speed',
        intro: 'Speed: how soon you want to act or decide. Talk: how you like to handle it. Urgency: how pressing it feels to you. There are no right answers. Every speed here is a normal way to be.',
        addLabel: 'Add a moment',
        columns: [
          { id: 'moment', label: 'Moment', type: 'text', w: 2.2, prefill: true },
          { id: 'who', label: 'Person', type: 'person', w: 1.1, prefill: true },
          { id: 'speed', label: 'Speed', type: 'select', options: WP12_SPEED, w: 1.3 },
          { id: 'talk', label: 'Talk', type: 'select', options: WP12_TALK, w: 1.3 },
          { id: 'urgent', label: 'Urgency', type: 'select', options: WP12_URGENT, w: 0.9 },
          { id: 'need', label: 'What helps me (optional)', type: 'text', w: 1.8, placeholder: 'e.g. a heads-up first' }
        ],
        defaultRows: WP12_ROWS
      },
      {
        id: 'gaps', type: 'computed', title: 'Part B: Where your speeds differ',
        compute: wp12Gaps
      },
      {
        id: 'agree', type: 'table', title: 'Part C: One small agreement',
        intro: 'Start with the biggest gap. A good agreement gives the faster person a way to start and the slower person a time to land: “When a bill comes, I’ll flag it the same day, and we’ll sort it on Sunday.” One or two is plenty. Try each for two weeks before you judge it.',
        addLabel: 'Add an agreement',
        columns: [
          { id: 'moment', label: 'Moment', type: 'text', w: 1.8 },
          { id: 'try', label: 'What we’ll try', type: 'textarea', w: 3.4 },
          { id: 'until', label: 'Try it until', type: 'date', w: 1.1 }
        ],
        defaultRows: [{}]
      },
      {
        type: 'note', pdf: true,
        text: 'Not a compatibility test and not a diagnosis. Speed often flips from one moment to the next: the person who is fast about plans may be the slow one about bills. Run it again every few months, or after a big change.'
      },
      closing('Agreeing means you have both seen the gaps and will try the agreement. It doesn’t mean either of you has to change speed for good.')
    ]
  };

  /* ------------------------------------------------------------------ WP-14 */
  // Is it us, or is it everything else? (the Static Dampening Log). A week of evenings, each person on
  // their own rows: outside pressure in one column, tense moments between you in another. The week's
  // read counts how many tense moments came on a heavy day. A pattern to talk about, never proof.
  var WP14_ROWS = [];
  DAYS.forEach(function (d) { WP14_ROWS.push({ day: d, who: 'A' }); WP14_ROWS.push({ day: d, who: 'B' }); });
  var WP14_COL = ['Outside pressure', 'Between us', 'Some of both', 'Not sure yet'];
  function wp14Week(ctx) {
    var rows = ctx.rows('log');
    if (!rows.some(function (r) { return r.press || String(r.tense || '').trim(); })) return [{ label: 'This week', value: 'Fill in a few evenings to see the week here.' }];
    var out = [], heavy = {};
    rows.forEach(function (r) { if (r.press === 'A lot' && r.day) heavy[r.day] = true; });
    ctx.people().forEach(function (p) {
      var mine = rows.filter(function (r) { return r.who === p; });
      if (!mine.some(function (r) { return r.press || String(r.tense || '').trim(); })) return;
      var lot = mine.filter(function (r) { return r.press === 'A lot'; }).length, little = mine.filter(function (r) { return r.press === 'A little'; }).length;
      var t = mine.filter(function (r) { return String(r.tense || '').trim(); }).length, from = {};
      mine.forEach(function (r) { String(r.from || '').split(/[,;\/]+|\band\b/).forEach(function (x) { x = x.trim().toLowerCase(); if (x) from[x] = (from[x] || 0) + 1; }); });
      var top = Object.keys(from).sort(function (a, b) { return from[b] - from[a]; }).slice(0, 3);
      out.push({ label: ctx.name(p), value: plural(lot, 'day') + ' with a lot of outside pressure, ' + little + ' with a little. ' + plural(t, 'tense moment') + ' written down.' + (top.length ? ' The pressure came mostly from: ' + top.join(', ') + '.' : '') });
    });
    var tense = rows.filter(function (r) { return String(r.tense || '').trim(); });
    if (tense.length) {
      var onHeavy = tense.filter(function (r) { return heavy[r.day]; }).length;
      out.push({ label: 'Tense moments on heavy days', value: onHeavy + ' of ' + tense.length + ' came on a day when someone had a lot of outside pressure.', note: 'A pattern to talk about, not proof. If you both wrote down the same moment, it counts twice.' });
      var c = {}, any = false;
      tense.forEach(function (r) { if (WP14_COL.indexOf(r.col) >= 0) { c[r.col] = (c[r.col] || 0) + 1; any = true; } });
      if (any) out.push({ label: 'How you sorted them', value: WP14_COL.filter(function (k) { return c[k]; }).map(function (k) { return k + ': ' + c[k]; }).join(' · ') + '.', note: 'The “between us” ones are real and worth a calm talk. The “outside pressure” ones need a plan for the pressure, not a verdict on anyone.' });
    }
    return out;
  }
  W['wp-14'] = {
    code: 'WP-14',
    title: 'Is it us, or is it everything else?',
    plain: 'Is it us, or is it everything else?',
    slug: 'Is-it-us-or-everything-else',
    // "Share this week" / "Open a shared week": each person's evenings are matched by day and name
    share: { what: 'week', after: 'wrong', keys: { wrong: 'moment' }, empty: 'Write an evening or two first, then share the week.', noAutoKeep: true },
    purpose: 'A one-week log that keeps two things apart: pressure from outside (money, work, health, sleep, family) and friction that really starts between you. A line or two each evening, each person about their own day. At the end of the week, you look at what got blamed on the wrong thing, and make one plan for the pressure.',
    people: true,
    meta: [
      { id: 'weekOf', label: 'Week beginning', type: 'date' }
    ],
    sections: [
      {
        type: 'note', pdf: false,
        text: 'Each person fills in only their own rows, about their own day. Outside pressure is anything that weighs on you from beyond the two of you: a deadline, a bill, a bad night, an ill parent, a long commute. A tense moment is any small snap, sulk or silence between you. Write what happened in a few plain words, not who was wrong. Skip a day if you miss one; a few evenings are enough to see a pattern.'
      },
      {
        id: 'log', type: 'table', title: 'Part A: Each evening',
        intro: 'About a minute. “Looking back, it was mostly” is your best guess, and it can change. “Not sure yet” is a fine answer.',
        addLabel: 'Add a row',
        personDays: DAYS,
        columns: [
          { id: 'day', label: 'Day', type: 'select', options: DAYS, w: 0.7, prefill: true },
          { id: 'who', label: 'Person', type: 'person', w: 1.1, prefill: true },
          { id: 'press', label: 'Outside pressure today', type: 'select', options: ['None', 'A little', 'A lot'], w: 1 },
          { id: 'from', label: 'Where it came from', type: 'text', w: 1.6, placeholder: 'e.g. work, money, sleep' },
          { id: 'tense', label: 'A tense moment between us (if any)', type: 'text', w: 2.2 },
          { id: 'col', label: 'Looking back, it was mostly', type: 'select', options: WP14_COL, w: 1.3 }
        ],
        defaultRows: WP14_ROWS
      },
      {
        id: 'week', type: 'computed', title: 'Part B: The week at a glance',
        compute: wp14Week
      },
      {
        id: 'wrong', type: 'table', title: 'Part C: What got blamed on the wrong thing?',
        intro: 'At the end of the week, together. Look at the tense moments that came on heavy days. Did one of you read outside pressure as something about the other person, or about the relationship? Write it down without blame: it happens to everyone.',
        addLabel: 'Add a moment',
        columns: [
          { id: 'moment', label: 'The moment', type: 'text', w: 2 },
          { id: 'seemed', label: 'What it seemed to be about', type: 'text', w: 2 },
          { id: 'really', label: 'What was really going on', type: 'text', w: 2 },
          { id: 'next', label: 'What would help next time', type: 'text', w: 2 }
        ],
        defaultRows: [{}]
      },
      {
        id: 'plan', type: 'fields', title: 'Part D: One plan for the pressure',
        intro: 'Outside pressure rarely goes away because you talked about it. What helps is facing it on the same side: a way to flag a heavy day, and a few things you’ll go easy on until it passes.',
        fields: [
          { id: 'pName', label: 'The pressure we’re facing right now', type: 'text', placeholder: 'e.g. the deadline at work, Mum’s hospital visits' },
          { id: 'pFlag', label: 'How we’ll flag a heavy day', type: 'text', placeholder: 'e.g. “Rough day, not you” when I walk in' },
          { id: 'pEase', label: 'What we’ll go easy on until it passes', type: 'text', placeholder: 'e.g. simple dinners, no big decisions on weeknights' },
          { id: 'pHelp', label: 'One bit of outside help we could ask for (optional)', type: 'text', placeholder: 'e.g. a friend covers one school run' }
        ]
      },
      {
        type: 'note', pdf: true,
        text: 'Outside pressure explains a hard day. It doesn’t excuse unkindness, and it doesn’t make what anyone felt less real. Friction that really is between you deserves its own calm talk, on a lighter day.'
      },
      closing()
    ]
  };

  /* ------------------------------------------------------------------ WP-15 */
  // Keep your little rituals alive (Harmonic Resonance & Entrainment). Every three months or so: the
  // small shared habits that keep people close, which are alive, fading or stopped, and one to restart.
  var WP15_STATE = ['Alive', 'Fading', 'Stopped', 'New idea'];
  function wp15Count(ctx) {
    var rows = ctx.rows('rituals').filter(function (r) { return String(r.ritual || '').trim(); });
    if (!rows.length) return [{ label: 'Your rituals', value: 'List a few, and mark how each one is doing, to see where they stand.' }];
    var c = {};
    rows.forEach(function (r) { if (WP15_STATE.indexOf(r.state) >= 0) c[r.state] = (c[r.state] || 0) + 1; });
    var out = [{ label: 'Your rituals', value: plural(rows.length, 'ritual') + ' listed. ' + (WP15_STATE.filter(function (k) { return c[k]; }).map(function (k) { return k + ': ' + c[k]; }).join(' · ').replace(/.$/, '$&.') || 'Mark how each one is doing.') }];
    var stopped = rows.filter(function (r) { return r.state === 'Stopped' || r.state === 'Fading'; }).map(function (r) { return String(r.ritual).trim(); });
    if (stopped.length) out.push({ label: 'Fading or stopped', value: stopped.join(', ') + '.', note: 'Rituals lapse for ordinary reasons: a new job, a baby, a move, an illness, a hard year. A stopped one isn’t a failure. Pick one to restart below, or let it go on purpose.' });
    var fresh = rows.filter(function (r) { return r.state === 'New idea'; }).map(function (r) { return String(r.ritual).trim(); });
    if (fresh.length) out.push({ label: 'New ideas', value: fresh.join(', ') + '.' });
    if (!stopped.length && c.Alive) out.push({ label: 'Reading it', value: 'Everything you listed is alive. Say thank you for one of them this week, out loud.' });
    return out;
  }
  W['wp-15'] = {
    code: 'WP-15',
    title: 'Keep your little rituals alive',
    plain: 'Keep your little rituals alive',
    slug: 'Keep-your-little-rituals-alive',
    // "Share this list" / "Open a shared list": rituals are matched by name
    share: { what: 'list', after: 'count', keys: { rituals: 'ritual' }, unit: ['ritual', 'rituals'], empty: 'Add a ritual first, then share the list.', noAutoKeep: true },
    purpose: 'Every three months or so, a short look at the small shared habits that keep you close: the morning coffee, the Sunday walk, the birthday breakfast. Which are alive, which are fading, which have quietly stopped. Then one to restart, small enough to keep on a hard week.',
    people: true,
    meta: [
      { id: 'date', label: 'Date', type: 'date' }
    ],
    sections: [
      {
        type: 'note', pdf: false,
        text: 'Do it together, somewhere comfortable, in about fifteen minutes. List the small things you share, and include the ones that stopped. Daily: a coffee, a goodbye at the door, a goodnight text. Weekly: a walk, a takeaway night, a Sunday call. Yearly: birthdays, a trip, a tradition. Nobody is to blame for one that lapsed.'
      },
      {
        id: 'rituals', type: 'table', title: 'Part A: Our rituals, big and small',
        intro: 'Alive: still happening, and still means something. Fading: still happening, but on autopilot or less often. Stopped: it used to happen and doesn’t now. New idea: something you’d like to try.',
        addLabel: 'Add a ritual',
        columns: [
          { id: 'ritual', label: 'Ritual or habit', type: 'text', w: 2.3 },
          { id: 'often', label: 'How often', type: 'select', options: ['Daily', 'Weekly', 'Monthly', 'Yearly', 'Now and then'], w: 1 },
          { id: 'state', label: 'How it’s doing', type: 'select', options: WP15_STATE, w: 1 },
          { id: 'note', label: 'What it gives us, or what got in the way', type: 'text', w: 2.6 }
        ],
        defaultRows: [{}, {}, {}, {}]
      },
      {
        id: 'count', type: 'computed', title: 'Part B: Where your rituals stand',
        compute: wp15Count
      },
      {
        id: 'restart', type: 'fields', title: 'Part C: One to restart, or start',
        intro: 'Just one. Pick the one you’d both miss most, or a new one you’re both curious about. Make it small enough to keep on a hard week.',
        fields: [
          { id: 'which', label: 'The ritual', type: 'text' },
          { id: 'small', label: 'The smallest version that still counts', type: 'text', placeholder: 'e.g. twenty minutes round the park, not the whole hike' },
          { id: 'first', label: 'The first time: when, and who will suggest it', type: 'text', placeholder: 'e.g. this Sunday after lunch; Jordan suggests it' },
          { id: 'protect', label: 'What would make it easy to skip, and how we’ll protect it (optional)', type: 'text' }
        ]
      },
      {
        id: 'letgo', type: 'fields', title: 'Part D (optional): One to let go, with thanks',
        intro: 'Not every ritual needs saving. Some belonged to an earlier season. Letting one go on purpose is kinder than letting it fade with guilt attached.',
        fields: [
          { id: 'goWhich', label: 'The ritual', type: 'text' },
          { id: 'goThanks', label: 'What it gave us', type: 'text' }
        ]
      },
      {
        type: 'note', pdf: true,
        text: 'A ritual is something you would both miss, not a test of love. A missed one is just a missed one. Look at this sheet again in about three months.'
      },
      closing()
    ]
  };

  /* ------------------------------------------------------------------ examples for WP-12, 14, 15 */
  // Made-up, filled-in examples for the three sheets above, shown folded away on each sheet ("See a
  // filled-in example"). The rest of the examples live in tol-workpaper-library.js, which loads after
  // this file; its TOL_WORKPAPER_EXAMPLE is wrapped so these three are answered here.
  function exNames(road) {
    return { apart: ['Diego', 'Lena'], family: ['Dana', 'Chris'], coparents: ['Mom', 'Dad'], roommates: ['Ana', 'Ben'], coworkers: ['Sam', 'Priya'], caregivers: ['Maya', 'Leo'], friends: ['You', 'Kim'], self: ['You', 'Sam'] }[road] || ['Alex', 'Jordan'];
  }
  var EXTRA_EX = {
    'WP-12': function (road) {
      var P = exNames(road);
      return {
        intro: 'A made-up example. ' + P[0] + ' and ' + P[1] + ' kept snapping at each other over plans and bills.',
        parts: [
          { title: 'Part A: each person’s speed', head: ['Moment', 'Who', 'Speed', 'Talk', 'Urgency'], rows: [
            ['A plan changes at the last minute', P[0], 'Right away', 'A few words, then act', 'High'],
            ['', P[1], 'Later the same day', 'Quiet time first', 'Low'],
            ['A bill, letter or form needs dealing with', P[0], 'After a night’s sleep', 'Quiet time first', 'Low'],
            ['', P[1], 'Right away', 'A few words, then act', 'High']] },
          { title: 'Parts B and C: the gaps, and the agreements', lines: [
            'Biggest gaps: the bills (speed 3 steps apart) and the plan changes (speed 2 steps apart).',
            '“When a bill comes, ' + P[1] + ' flags it the same day. We sort it together on Sunday morning, not the minute it lands.”',
            '“When plans change, ' + P[0] + ' says the new plan in one line, then gives ' + P[1] + ' an hour before anything is decided.”'] }
        ],
        note: 'Notice it cuts both ways: ' + P[0] + ' is the fast one about plans, ' + P[1] + ' about bills. Neither is “the slow one”.'
      };
    },
    'WP-14': function (road) {
      var P = exNames(road);
      return {
        intro: 'A made-up example: a few evenings from a heavy week for ' + P[0] + ' and ' + P[1] + '.',
        parts: [
          { title: 'Part A: each evening', head: ['Day', 'Who', 'Outside pressure', 'Where from', 'Tense moment', 'Mostly'], rows: [
            ['Mon', P[0], 'A lot', 'Work deadline, bad sleep', 'Snapped about the dishes', 'Outside pressure'],
            ['Mon', P[1], 'A little', 'Money', '', ''],
            ['Wed', P[0], 'A lot', 'Work deadline', 'Felt ignored at dinner', 'Some of both'],
            ['Thu', P[1], 'A lot', 'Mum in hospital', 'Short with each other about the weekend', 'Outside pressure'],
            ['Sat', P[0], 'None', '', 'The same old argument about the car', 'Between us']] },
          { title: 'Parts B to D: the week, and the plan', lines: [
            '3 of 4 tense moments came on a day when someone had a lot of outside pressure.',
            'Wrong thing: “I thought ' + P[1] + ' didn’t care about the weekend. Really, ' + P[1] + ' had been at the hospital all day.”',
            'Plan: “Rough day, not you” at the door; simple dinners until the deadline passes; ask a sister to cover one hospital visit.',
            'The car argument stays in the “between us” column, for a calm talk on a lighter day.'] }
        ],
        note: 'Outside pressure explains a hard day. It doesn’t excuse unkindness, and it doesn’t cancel the car argument.'
      };
    },
    'WP-15': function (road) {
      var P = exNames(road);
      return {
        intro: 'A made-up example: ' + P[0] + ' and ' + P[1] + ', on a quiet Sunday in spring.',
        parts: [
          { title: 'Part A: our rituals', head: ['Ritual', 'How often', 'How it’s doing', 'What it gives us, or what got in the way'], rows: [
            ['Coffee together before work', 'Daily', 'Alive', 'Ten quiet minutes before the day starts'],
            ['Friday takeaway and a film', 'Weekly', 'Fading', 'Phones come out; one of us falls asleep'],
            ['Sunday walk', 'Weekly', 'Stopped', 'Stopped when Saturday shifts started'],
            ['Birthday breakfast in bed', 'Yearly', 'Alive', 'We both still look forward to it'],
            ['Try one new place a month', 'Monthly', 'New idea', P[1] + '’s idea']] },
          { title: 'Parts C and D: restart one, let one go', lines: [
            'Restart: the Sunday walk. Smallest version: twenty minutes round the park after lunch. ' + P[0] + ' suggests it this Sunday.',
            'Let go, with thanks: Thursday quiz night. It was great when we lived near the pub.'] }
        ],
        note: 'One restart at a time. In three months, look again.'
      };
    }
  };
  function withExtraExamples(base) {
    if (typeof base !== 'function' || base.tolExtra) return base;
    var f = function (code, road) { return EXTRA_EX[code] ? EXTRA_EX[code](road) : base(code, road); };
    f.tolExtra = true;
    return f;
  }
  try {
    if (typeof global.TOL_WORKPAPER_EXAMPLE === 'function') global.TOL_WORKPAPER_EXAMPLE = withExtraExamples(global.TOL_WORKPAPER_EXAMPLE);
    else {
      var heldEx = null;
      Object.defineProperty(global, 'TOL_WORKPAPER_EXAMPLE', {
        configurable: true, enumerable: true,
        get: function () { return heldEx || function (code, road) { return EXTRA_EX[code] ? EXTRA_EX[code](road) : null; }; },
        set: function (fn) { heldEx = withExtraExamples(fn); }
      });
    }
  } catch (e) {}

  /* ------------------------------------------------------------------ road variants */
  // WP-03 worded and prefilled for the road someone is on. Everything else about the sheet stays the same.
  var RACI_ROADS = {
    coworkers: {
      purpose: 'A living agreement that gives every recurring team task one owner (Responsible, in RACI terms): the person who does it and sees it through, so nobody has to guess who is following up. A helper who follows up (Accountable) is optional, and so are Consulted (who gives input before it is done) and Informed (who hears when it is).',
      note: "Fill it in together, from what a normal week actually looks like (WP-01 helps). Remove any rows that don't fit your team, and add the ones that do. It describes how the work is set up, never how well anyone is doing it.",
      rows: [
        { task: 'Meeting notes', freq: 'Each meeting' }, { task: 'Follow-ups after meetings', freq: 'Each meeting' },
        { task: 'Deadlines and status reporting', freq: 'Weekly' }, { task: 'On-call or cover when someone is out', freq: 'As needed' },
        { task: 'Team chat and shared inbox triage', freq: 'Daily' }, { task: 'Onboarding a new teammate', freq: 'As needed' }
      ],
      freq: ['Daily', 'Each meeting', 'Weekly', 'Monthly', 'As needed', 'Ongoing'],
      ci: true,
      amend: 'When the work changes, rework the agreement in writing, instead of letting tasks drift to whoever started picking them up. Anyone on the team can ask for a review at a regular check-in, or at What keeps coming back? (WP-04), the monthly look-back.',
      sign: "Agreeing means everyone has read this version and knows who owns what. It isn't a performance record, and it isn't for HR. It only means ownership is clear."
    },
    roommates: {
      purpose: 'A living agreement that gives every regular shared-home job one owner: the person who does it and sees it through, so nobody has to re-decide who owns what every week. If you like, add a helper who pitches in or notices if it slips. The helper is optional.',
      note: "Fill it in together at a house meeting. Remove any rows that don't apply to your place, and add the ones that do. Splitting a cleaning area by week or by room is fine; just write it down.",
      rows: [
        { task: 'Rent: collecting and paying', freq: 'Monthly' }, { task: 'Bills (power, water, internet)', freq: 'Monthly' },
        { task: 'Cleaning: kitchen', freq: 'Weekly' }, { task: 'Cleaning: bathroom', freq: 'Weekly' }, { task: 'Cleaning: shared living space', freq: 'Weekly' },
        { task: 'Shared supplies (soap, paper, basics)', freq: 'As needed' }, { task: 'Trash and recycling', freq: 'Weekly' },
        { task: 'Guests and quiet hours', freq: 'Ongoing' }
      ],
      amend: 'When things change (someone moves in or out, a schedule shifts), rework the agreement in writing, instead of letting jobs drift to whoever started doing more. Anyone can ask for a review at a house meeting, or at What keeps coming back? (WP-04), the monthly look-back.',
      sign: "Agreeing means everyone has read this version and knows who owns what. It doesn't mean every job feels perfectly even, only that ownership is clear."
    },
    caregivers: {
      purpose: 'A living agreement that gives every regular part of the care one owner: the person who does it and sees it through, so "whenever someone can" becomes a plan. If you like, add a helper who covers or notices if it slips. The helper is optional.',
      note: "Fill it in together with whoever shares the care. This is about who owns each task, not medical advice: for anything about health or medicines, follow the care team's instructions. Remove rows that don't apply and add the ones that do.",
      rows: [
        { task: 'Appointments: booking, getting there, notes', freq: 'As needed' },
        { task: 'Medications: keeping the list and schedule up to date', freq: 'Ongoing', notes: 'As the care team directs' },
        { task: 'Pharmacy pickups', freq: 'Weekly' }, { task: 'Bills and insurance paperwork', freq: 'Monthly' },
        { task: 'Visits', freq: 'Weekly' }, { task: 'Overnight calls', freq: 'As needed' },
        { task: 'Groceries and meals', freq: 'Weekly' }
      ],
      amend: 'When the care changes, rework the agreement in writing, instead of letting tasks drift to whoever lives closest or started doing more. Anyone sharing the care can ask for a review at a regular check-in, or at What keeps coming back? (WP-04), the monthly look-back.',
      sign: "Agreeing means everyone sharing the care has read this version and knows who owns what. It doesn't mean the load feels even, only that ownership is clear."
    }
  };
  // Partners who live apart (the Workpaper Suite's "We live apart" on the Partners road): the calls,
  // visits and time zones are the jobs that need an owner.
  RACI_ROADS.apart = {
    title: 'Who starts which calls, and who owns the rest',
    purpose: 'A living agreement for a couple who live apart: every regular part of staying close gets one owner, the person who starts it and sees it through. Who starts which calls? Who plans the next visit? That way nobody has to wonder whose turn it is. A helper is optional.',
    note: 'Fill it in together, face to face or on a call. Start with who starts which calls, then visits, then anything you still share (bills, plans, family dates). Remove any rows that don\'t fit, and add the ones that do.',
    rows: [
      { task: 'Who starts which calls', freq: 'Weekly' }, { task: 'Reschedule a call when plans change', freq: 'As needed' },
      { task: 'Good-morning / good-night text', freq: 'Daily' }, { task: 'Time-zone juggling: pick call times', freq: 'Weekly' },
      { task: 'Plan or book a visit', freq: 'Monthly' }, { task: 'Travel costs: track who paid', freq: 'Monthly' },
      { task: 'Remember each other\'s big days', freq: 'Ongoing' }
    ],
    amend: 'When life changes (a new job, a move, a new time zone), rework the agreement in writing, instead of letting the calling and planning drift to whoever started doing more. Either of you can ask for a review on a call, or at What keeps coming back? (WP-04), the monthly look-back.',
    sign: 'Agreeing means you have both read this version and know who owns what. It doesn\'t mean the distance feels even, only that ownership is clear.'
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
      if (s.type === 'note' && s.pdf === false) c.text = v.note + ' The starter rows are examples. They don\'t count until you give one an owner or change it.';
      if (s.id === 'closing') c.intro = v.sign;
      if (s.id === 'amendments') c.intro = v.amend;
      if (s.id === 'treaty') {
        c.defaultRows = v.rows;
        if (v.title) c.title = v.title;
        c.columns = s.columns.map(function (col) {
          if (col.id === 'freq' && v.freq) { var f = {}; Object.keys(col).forEach(function (k) { f[k] = col[k]; }); f.options = v.freq; return f; }
          return col;
        });
        if (v.ci) {
          c.title = 'The agreement';
          c.intro = 'The owner is one name. The helper, Consulted and Informed are optional, and can be more than one name or a group, like "the whole team".';
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
      title: 'Kind ways to say no',
      plain: 'Kind ways to say no',
      slug: 'Kind-ways-to-say-no',
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
        extra: { fields: [{ id: 'caring', label: 'Some of what I\'m carrying is caring for someone', type: 'check' }, { id: 'note', label: 'Anything else on your mind right now', type: 'textarea' }] },
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
            { id: 'saturation', label: "Would I read this the same way if I weren't already carrying a lot (WP-02)?", options: ['Yes', 'No', 'Not sure'] },
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
        note: { text: 'This kit is all about you. The pause plan is the one part you might share with someone close.' },
        lines: {
          title: 'Part A: My pause line',
          intro: 'One sentence, ready ahead of time, for when you need a break from a hard moment, so stepping away feels planned instead of like giving up. Say how you are, how long you need, and when you\'ll pick it back up: "I\'m at capacity. I need ten minutes. I\'ll come back to this at quarter past."',
          columns: [{ id: 'line', label: 'Pause line', type: 'textarea', w: 4 }]
        },
        plan: { title: 'My pause plan (yours to share, if you like)', fields: [
          { id: 'planWord', label: 'My pause word or signal', type: 'text', placeholder: 'e.g. Timeout' },
          { id: 'planMin', label: 'The shortest break I take', type: 'text', placeholder: 'e.g. 20 minutes' },
          { id: 'planBack', label: 'How I set the time to come back', type: 'text', placeholder: 'e.g. I name a time, within the day' },
          { id: 'planFirst', label: 'The first sentence when I come back', type: 'text', placeholder: 'e.g. Thanks for waiting. I\'m ready now.' }
        ], intro: 'The one part of the kit you might share with someone close: the word you\'ll use, how long a break you take, and how you come back. A few words in each box is plenty.' },
        reentry: { intro: 'Still hot? Another round. Twice? Name a new time. Settled? Pick things back up. After each round, write what you did and how you feel now.', fans: { label: 'For number fans: add load scores', note: 'If you like numbers, the load score (WP-02, 0 to 1) is a second opinion: under 0.50 pick things back up, 0.50 to 0.59 another round, 0.60 or above after two rounds put it off. These bands are this site\u2019s rule of thumb, not a validated clinical scale.' } },
        next: { compute: wp11Next(true) },
        after: {
          fields: [
            { id: 'nextAction', label: 'Next small action', type: 'text' },
            { id: 'resume', label: 'If you put it off: when you\'ll pick it back up', type: 'text' }
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
  global.TOL_IS_HOUSE_RULE = isHouseRule;
  global.TOL_WORKPAPER_VARIANT = variant;
  global.TOL_WORKPAPER_SOLO = solo;
})(typeof window !== 'undefined' ? window : globalThis);
