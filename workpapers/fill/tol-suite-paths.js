/*
  tol-suite-paths.js — The Objective Ledger (TOL-OS)
  The roads through the workpapers, one for each way in: yourself, each kind
  of relationship, and the 6-week program. Taken from the relationship map
  (relationships-in-depth.html) and PROG-01. The Workpaper Suite builds its
  checklist, its PDF and its report from these, group by group.

  Each stop: { wp, why, again } — "again" marks a sheet worth filling in more
  than once (a new week, a new day), so the suite offers another copy.
*/
(function (global) {
  'use strict';

  var NAMES = {
    'WP-01': 'Who did what',
    'WP-02': 'How full is your battery?',
    'WP-03': 'One owner per job',
    'WP-04': 'The monthly look-back',
    'WP-09': 'Say it so it lands',
    'WP-11': 'The Calm-Down Kit',
    'WP-13': 'The 90-second check-in'
  };

  // where to read about each workpaper
  var READ = {
    'WP-01': '/workpapers/wp-01.html', 'WP-02': '/workpapers/wp-02-battery-stress-meter.html', 'WP-03': '/workpapers/wp-03-raci-treaty.html',
    'WP-04': '/workpapers/wp-04-deficit-audit.html', 'WP-09': '/workpapers/wp-09-tone-filter.html', 'WP-11': '/wp-11.html', 'WP-13': '/workpapers/wp-13-pll-protocol.html'
  };
  // the chapters, tools and guides to read and try alongside each step: [label, link]
  var L = {
    weather: ['Today\u2019s Weather', '/quick-checks.html#today'], preface: ['Preface: Unbilled Debt', '/book/preface.html'],
    ch1: ['Ch. I: Radio Frequency', '/book/chapter-1.html'], ch2: ['Ch. II: P(Solvency)', '/book/chapter-2.html'], ch3: ['Ch. III: Autonomic Saturation', '/book/chapter-3.html'],
    ch4: ['Ch. IV: Parity & Gating', '/book/chapter-4.html'], ch5: ['Ch. V: The Deficit Audit', '/book/chapter-5.html'],
    lemonade: ['The Lemonade Stand', '/lemonade-stand.html'], calc: ['CALC-01: Can the load last?', '/workpapers/calculators/calc01-solvency.html'],
    decoder: ['Carrier Wave Decoder', '/carrier-wave-decoder.html'], freq: ['Frequency Calibration', '/tools/frequency-calibration.html'],
    mood: ['Mood Arbitrage', '/tools/mood-arbitrage-free.html'], wired: ['Wired Differently', '/wired-differently.html'], wiring: ['Wiring Card', '/wiring-card.html'],
    signal: ['The Signal Translator', '/signal-translator.html'], checkins: ['Check-ins', '/check-ins.html'], ground: ['Check-in ground rules', '/check-ins.html#ground'],
    prog: ['PROG-01: 6-week program', '/prog-01.html'], report: ['REPORT-01: The Full Read', '/workpapers/report-01.html'], garden: ['The Night Garden', '/night-garden.html'],
    toward: ['Turning Toward', '/turning-toward.html']
  };
  function A() { return Array.prototype.map.call(arguments, function (k) { return L[k]; }); }

  var PATHS = [
    {
      id: 'self', label: 'Just me', icon: '☀', color: '#F8E7AE',
      blurb: 'Know your own load, rhythms and reactions, kindly.',
      people: ['You', 'Someone close'],
      groups: [
        { along: A('weather','ch3','garden'), title: 'Start here', note: 'Every relationship runs through your own nervous system first.', stops: [
          { wp: 'WP-02', why: "Separate what you're already carrying from what just happened.", again: 'Another day' },
          { wp: 'WP-11', why: 'Decide in advance what settles you, so it is ready when you need it.' }
        ] },
        { along: A('wired','wiring','signal'), title: 'When words get hard', note: 'For the moment something stings.', stops: [
          { wp: 'WP-09', why: 'Turn a raw reaction into fact, feeling and a clear ask.', again: 'Another message' }
        ] },
        { along: A('freq','decoder'), title: 'Also helpful', note: 'Kind, ready-made ways to say no.', stops: [
          { wp: 'WP-01', why: 'Part B has neutral refusals: acknowledge, state your capacity, offer an alternative.' }
        ] }
      ],
      next: 'Take one minute each morning with WP-02. Patterns show up within a week, and naming them is half the work.',
      care: "Self-discovery isn't self-criticism. Understand yourself as kindly as you'd want to be understood."
    },
    {
      id: 'partners', label: 'Partners', icon: '♥', color: '#F7CAD4',
      blurb: 'Two people sharing a life, where the unseen work is often heaviest.',
      people: ['Partner A', 'Partner B'],
      groups: [
        { along: A('preface','ch1','lemonade'), title: 'Start here', note: 'See the work that is already happening.', stops: [
          { wp: 'WP-01', why: 'A week of who actually did what, written down by each of you.', again: 'Another week' },
          { wp: 'WP-03', why: 'One owner for every recurring task, so it stops being renegotiated.' },
          { wp: 'WP-13', why: '90 seconds a day that keeps small things small.', again: 'Another week' }
        ] },
        { along: A('ch2','calc','checkins','signal'), title: 'Then', note: 'For your own state, and for the hard conversations.', stops: [
          { wp: 'WP-02', why: 'How much each of you is already carrying, filled in about yourself.', again: 'Another day' },
          { wp: 'WP-09', why: 'Fact, feeling and ask, before you send it.', again: 'Another message' },
          { wp: 'WP-11', why: 'If either of you starts using the numbers to win, stop and come back here.' }
        ] },
        { along: A('ch5','report','toward'), title: 'Once a month', note: 'Catch what keeps coming back.', stops: [
          { wp: 'WP-04', why: 'Sort repeat problems into real gaps and one-offs.', again: 'Another month' }
        ] }
      ],
      next: 'Pick one evening this week for the 90-second check-in, and each start a Who did what log.',
      care: 'The tools describe the arrangement, never the person.'
    },
    {
      id: 'family', label: 'Family', icon: '⌂', color: '#CFE6D2',
      blurb: 'Parents, adult children, siblings and in-laws: a roof, a group chat or a holiday table.',
      people: ['You', 'Family member'],
      groups: [
        { along: A('ch1','wired','signal'), title: 'Start here', note: 'Families often clash on tone and urgency more than on the task.', stops: [
          { wp: 'WP-03', why: 'Write down who owns what, so nobody has to guess.' },
          { wp: 'WP-09', why: 'Old family patterns make tone land hard; this slows it down.', again: 'Another message' }
        ] },
        { along: A('ch3','ch4','decoder'), title: 'Then', note: 'Helpful with small adjustments.', stops: [
          { wp: 'WP-02', why: 'Leftover stress can carry years of history. Check your own first.', again: 'Another day' },
          { wp: 'WP-11', why: 'Your pause line, agreed before the holiday table.' },
          { wp: 'WP-01', why: 'A week of who did what, when "helping out" means different things.', again: 'Another week' }
        ] },
        { along: A('ch5','checkins'), title: 'Now and then', note: 'When the same thing keeps coming back.', stops: [
          { wp: 'WP-04', why: 'A monthly look at what keeps slipping.', again: 'Another month' }
        ] }
      ],
      next: 'Agree on one shared task and write down its one owner together.',
      care: 'The worksheets are written for adults. Never ask a child to keep track of what a parent does.'
    },
    {
      id: 'coparents', label: 'Co-parents', icon: '✿', color: '#D8E4F4',
      blurb: 'Raising a child together, in one home or two.',
      people: ['Parent A', 'Parent B'],
      groups: [
        { along: A('lemonade','calc','signal'), title: 'Start here', note: 'Every recurring kid task gets exactly one owner.', stops: [
          { wp: 'WP-03', why: 'School forms, dentist visits, permission slips: one owner each.' },
          { wp: 'WP-09', why: 'Turn a charged message into fact, feeling and ask before you hit send.', again: 'Another message' },
          { wp: 'WP-04', why: 'Once a month, sort what keeps slipping into a real gap or a one-off.', again: 'Another month' }
        ] },
        { along: A('report','checkins','ground'), title: 'Then', note: 'For the load, and for handoffs.', stops: [
          { wp: 'WP-01', why: 'Shows whether the load is lopsided across two homes.', again: 'Another week' },
          { wp: 'WP-13', why: 'Works well weekly instead of daily for parents in two homes.', again: 'Another week' },
          { wp: 'WP-02', why: 'Your own battery, before a handoff conversation.', again: 'Another day' },
          { wp: 'WP-11', why: 'A pause line that is never mistaken for walking out.' }
        ] }
      ],
      next: 'List every recurring kid task this week and give each one owner.',
      care: 'A court order or parenting plan always comes first. These tools are never for building a case.'
    },
    {
      id: 'friends', label: 'Friends', icon: '☆', color: '#EBDDF6',
      blurb: 'A light touch for the give and take nobody says out loud.',
      people: ['You', 'Your friend'],
      groups: [
        { along: A('preface','ch1','decoder'), title: 'Start here', note: "The point isn't a ledger of favors.", stops: [
          { wp: 'WP-09', why: 'Say the unseen thing as fact, feeling and a clear ask.', again: 'Another message' },
          { wp: 'WP-01', why: "Part B's neutral refusals: kind ways to say no without a rift." }
        ] },
        { along: A('checkins','signal','toward'), title: 'Just for you', note: 'On a hard day.', stops: [
          { wp: 'WP-02', why: 'Check your own battery before you bring it up.', again: 'Another day' },
          { wp: 'WP-11', why: 'What settles you, decided in advance.' }
        ] }
      ],
      next: "Name what's gone unseen, once, kindly. One sentence is enough.",
      care: "Use a light touch. It's about naming what went unseen, not keeping score."
    },
    {
      id: 'roommates', label: 'Roommates', icon: '☕', color: '#F9D9B8',
      blurb: 'Sharing a home without sharing a life.',
      people: ['You', 'Roommate'],
      groups: [
        { along: A('lemonade','ch4'), title: 'Start here', note: 'Everyone sees the same picture of the chores.', stops: [
          { wp: 'WP-03', why: 'A named owner for trash, bills, supplies and cleaning.' },
          { wp: 'WP-13', why: 'A quick weekly version at a house meeting works well.', again: 'Another week' }
        ] },
        { along: A('calc','ch5','checkins','signal'), title: 'Then', note: 'When goodwill starts running low.', stops: [
          { wp: 'WP-01', why: "A week of who did what, so it's facts, not impressions.", again: 'Another week' },
          { wp: 'WP-04', why: 'Catches the problem that comes back every month.', again: 'Another month' },
          { wp: 'WP-09', why: "So a house-meeting point doesn't land as a call-out.", again: 'Another message' }
        ] },
        { along: A('weather','garden'), title: 'Just for you', note: 'On a hard day.', stops: [
          { wp: 'WP-02', why: 'Your own battery, privately.', again: 'Another day' },
          { wp: 'WP-11', why: 'What settles you, ready when you need it.' }
        ] }
      ],
      next: 'At the next house meeting, fill in One owner per job together.',
      care: 'With more than two people, fill in the two-person sheets in pairs.'
    },
    {
      id: 'coworkers', label: 'Coworkers', icon: '⚙', color: '#D6EEF0',
      blurb: 'The follow-ups, notes and reminders that keep a team moving.',
      people: ['You', 'Teammate'],
      groups: [
        { along: A('ch1','signal'), title: 'Start here', note: 'RACI started in project management, so it fits a team naturally.', stops: [
          { wp: 'WP-03', why: 'One named owner for each recurring task.' },
          { wp: 'WP-09', why: 'Check a message before it goes out on chat or email.', again: 'Another message' }
        ] },
        { along: A('ch5','decoder','checkins'), title: 'Team rhythm', note: 'A stand-up and a retrospective.', stops: [
          { wp: 'WP-13', why: 'Works like a short stand-up.', again: 'Another week' },
          { wp: 'WP-04', why: 'A monthly retrospective on what keeps slipping.', again: 'Another month' },
          { wp: 'WP-01', why: 'Makes the invisible follow-ups visible.', again: 'Another week' }
        ] },
        { along: A('weather','garden'), title: 'Just for you', note: 'Privately, on a hard day.', stops: [
          { wp: 'WP-02', why: 'Your own battery, before a tough meeting.', again: 'Another day' },
          { wp: 'WP-11', why: 'What settles you at work.' }
        ] }
      ],
      next: 'Suggest one owner for each recurring team task at your next check-in.',
      care: 'Use these among peers who agree to them, never to rate anyone or as HR documentation.'
    },
    {
      id: 'caregivers', label: 'Caregivers', icon: '☘', color: '#E3EEC9',
      blurb: 'Sharing the care of a parent or loved one, often with siblings.',
      people: ['You', 'Sibling or co-carer'],
      groups: [
        { along: A('preface','weather','garden'), title: 'Start here', note: 'Caregiver strain builds quietly.', stops: [
          { wp: 'WP-02', why: 'Makes caregiver strain visible before it runs you empty.', again: 'Another day' },
          { wp: 'WP-03', why: 'One owner for each part of the care, so "whenever" becomes a plan.' },
          { wp: 'WP-11', why: "For the moments you're too depleted to talk well." }
        ] },
        { along: A('calc','report','checkins','signal'), title: 'Then', note: 'For handoffs and the load itself.', stops: [
          { wp: 'WP-13', why: 'Helps with handoffs between the people sharing care.', again: 'Another week' },
          { wp: 'WP-01', why: 'A calm, factual week of who did what.', again: 'Another week' },
          { wp: 'WP-09', why: 'Test the ask before the sibling conversation.', again: 'Another message' },
          { wp: 'WP-04', why: 'Once a month: what keeps slipping.', again: 'Another month' }
        ] }
      ],
      next: 'List the parts of the care and put one name next to each.',
      care: 'Running near empty is a sign to get more support, not a personal failing.'
    },
    {
      id: 'program', label: 'The 6-week program', icon: '✦', color: '#FFF1C9',
      blurb: 'PROG-01: one workpaper at a time, in order, over six gentle weeks.',
      people: ['Partner A', 'Partner B'],
      groups: [
        { along: A('preface','ch1','weather'), title: 'Week 1 · See the work', note: 'Just observe. No fixing anything yet.', stops: [
          { wp: 'WP-01', why: "Log a week of who does what, before memory hardens into a story." }
        ] },
        { along: A('ch2','calc'), title: 'Week 2 · One owner per job', note: 'Informed by what actually happened.', stops: [
          { wp: 'WP-03', why: 'Name one owner for each regular job.' }
        ] },
        { along: A('ch4','ch3'), title: 'Week 3 · Your batteries', note: 'Each day for a week, each about yourself.', stops: [
          { wp: 'WP-02', why: 'Look for patterns: who is carrying more, and when.', again: 'Another day' }
        ] },
        { along: A('signal','decoder','wired'), title: 'Week 4 · Talk about it kindly', note: 'Retune before responding.', stops: [
          { wp: 'WP-09', why: 'Turn a raw reaction into fact, feeling and a clear ask.', again: 'Another message' },
          { wp: 'WP-11', why: 'Your pause line, agreed on a calm day.' }
        ] },
        { along: A('freq','checkins'), title: 'Week 5 · Get back in step', note: 'Small corrections, daily.', stops: [
          { wp: 'WP-13', why: 'Try the 90-second check-in together.' }
        ] },
        { along: A('report','toward'), title: 'Week 6 · Make it last', note: 'The same log, run twice.', stops: [
          { wp: 'WP-01', why: 'Run Who did what again and compare it with Week 1.' },
          { wp: 'WP-04', why: 'Optional: a first monthly look-back.' }
        ] }
      ],
      next: 'Move at the pace that is actually true for you. Some weeks need more than a week.',
      care: "Six weeks isn't a guarantee. It's a sensible order for real tools."
    }
  ];

  global.TOL_SUITE_PATHS = { paths: PATHS, names: NAMES, read: READ };
})(typeof window !== 'undefined' ? window : globalThis);
