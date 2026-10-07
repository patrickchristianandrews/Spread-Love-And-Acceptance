/*
  tol-suite-paths.js — The Objective Ledger (TOL-OS)
  The roads through the workpapers, one for each way in: yourself, each kind
  of relationship, and the 6-week program. Taken from the relationship map
  (relationships-in-depth.html) and PROG-01. The Workpaper Suite builds its
  checklist, its PDF and its report from these, group by group.

  Each stop: { wp, why, again } — "again" marks a sheet worth filling in more
  than once (a new week, a new day), so the suite offers another copy.
  A road can also rename a workpaper (names), and say which workpapers can be
  added to it (addable; every one when it's left out). "Just me" (self) is for
  one person only: its sheets are worded that way (TOL_WORKPAPER_SOLO).

  A road can have variants: the same road (same id, same sheets) in a different
  order, for a different reason to be here. Partners has one, "flat", for a
  couple who are fine but feel flat. A variant's groups can start with reads
  ([label, link, why]): pages to read or try before any sheet. A stop marked
  optional is shown as "Optional". variant(path, key) gives the road with the
  variant laid over it; the id stays the same, and .variant names the key.
*/
(function (global) {
  'use strict';

  var NAMES = {
    'WP-01': 'Who did what',
    'WP-02': 'How much are you carrying?',
    'WP-03': 'One owner per job',
    'WP-04': 'What keeps coming back?',
    'WP-09': 'Say it so it lands',
    'WP-11': 'The Calm-Down Kit',
    'WP-13': 'The 90-second daily check-in'
  };

  // where to read about each workpaper
  var READ = {
    'WP-01': '/workpapers/wp-01.html', 'WP-02': '/workpapers/wp-02-how-much-are-you-carrying.html', 'WP-03': '/workpapers/wp-03-one-owner-per-job.html',
    'WP-04': '/workpapers/wp-04-what-keeps-coming-back.html', 'WP-09': '/workpapers/wp-09-say-it-so-it-lands.html', 'WP-11': '/wp-11.html', 'WP-13': '/workpapers/wp-13-daily-check-in.html'
  };
  // the chapters, tools and guides to read and try alongside each step: [label, link]
  var L = {
    weather: ['Today\u2019s Weather', '/quick-checks.html#today'], preface: ['Preface: The work nobody sees', '/book/preface.html'],
    ch1: ['Ch. I: Why we get out of tune', '/book/chapter-1.html'], ch2: ['Ch. II: Is the split working?', '/book/chapter-2.html'], ch3: ['Ch. III: Full tanks and different angles', '/book/chapter-3.html'],
    ch4: ['Ch. IV: Two kinds of fair', '/book/chapter-4.html'], ch5: ['Ch. V: The monthly look-back', '/book/chapter-5.html'],
    lemonade: ['The Lemonade Stand', '/lemonade-stand.html'], calc: ['CALC-01: Is the setup working for everyone?', '/workpapers/calculators/is-the-setup-working-quick.html'],
    decoder: ['Carrier Wave Decoder', '/carrier-wave-decoder.html'], freq: ['Frequency Calibration', '/tools/frequency-calibration.html'],
    mood: ['Soften a tense moment', '/tools/soften-a-tense-moment.html'], wired: ['Wired Differently', '/wired-differently.html'], wiring: ['Wiring Card', '/wiring-card.html'],
    signal: ['The Signal Translator', '/signal-translator.html'], checkins: ['Check-ins', '/check-ins.html'], ground: ['Check-in ground rules', '/check-ins.html#ground'],
    prog: ['PROG-01: 6-week program', '/prog-01.html'], report: ['REPORT-01: The Full Read', '/workpapers/report-01.html'], garden: ['The Night Garden', '/night-garden.html'],
    toward: ['Turning Toward', '/turning-toward.html'], complacency: ['Complacency', '/complacency.html'],
    recheck: ['The Re-check Drive', '/recheck-drive.html']
  };
  function A() { return Array.prototype.map.call(arguments, function (k) { return L[k]; }); }


  // Week-by-week programs, one for each road: [title, what to do (workpapers), read and try (links), a small practice]
  var WEEKS = {
    self: [
      ['Notice your load', ['WP-02'], A('weather', 'ch3'), 'Each morning, one minute with the load check. Just notice; change nothing yet.'],
      ['Know what settles you', ['WP-11'], A('garden', 'freq'), 'On a calm day, choose your two settling defaults and write your pause line.'],
      ['How words reach you', ['WP-09'], A('wired', 'wiring'), 'Fill in a Wiring Card, and try fact, feeling and ask on one thing that stung.'],
      ['Saying no, kindly', ['WP-01'], A('decoder', 'signal'), 'Try one kind “no” this week: say why the request is fair, say what you have left, and offer something instead.'],
      ['Look back', ['WP-02'], A('report', 'garden'), 'Compare this week’s load with week one. What pattern do you see? Be kind about it.']
    ],
    partners: [
      ['See the work', ['WP-01'], A('preface', 'ch1'), 'Each of you logs one week of who did what. No discussing it yet.'],
      ['One owner per job', ['WP-03'], A('ch2', 'lemonade'), 'Sit down once, with the log, and give every regular job one owner.'],
      ['Small daily corrections', ['WP-13'], A('toward', 'decoder'), 'Do the 90-second daily check-in every evening this week.'],
      ['Your loads', ['WP-02'], A('ch3', 'calc'), 'Each of you does the one-minute load check daily, about yourself. Say your number before any hard talk.'],
      ['Talk so it lands', ['WP-09', 'WP-11'], A('signal', 'checkins'), 'Agree on your pause lines, then try one check-in using the ground rules.'],
      ['Make it last', ['WP-01', 'WP-04'], A('report', 'ch5'), 'Run the week log again, compare it with week one, and do your first monthly look-back.']
    ],
    family: [
      ['Same page, same words', ['WP-03'], A('ch1', 'wired'), 'Write down who owns what at home, so nobody has to guess.'],
      ['Tone before content', ['WP-09'], A('signal', 'decoder'), 'Put one charged message through fact, feeling and ask before sending.'],
      ['Check your own weather', ['WP-02'], A('weather', 'ch3'), 'A quick check of your own load before family time, especially holidays.'],
      ['A plan for heated moments', ['WP-11'], A('ch4', 'checkins'), 'Agree on a pause line the whole family recognizes.'],
      ['What keeps slipping', ['WP-01', 'WP-04'], A('ch5', 'toward'), 'Log a week, then look back at what keeps coming up, kindly.']
    ],
    coparents: [
      ['One owner per kid task', ['WP-03'], A('lemonade', 'calc'), 'School, health, activities: every recurring task gets exactly one owner.'],
      ['Messages that land', ['WP-09'], A('signal', 'ground'), 'Every charged message goes through fact, feeling and ask first.'],
      ['The weekly handoff', ['WP-13'], A('checkins'), 'A short weekly check-in between homes: load, one thanks, one ask.'],
      ['See the load', ['WP-01', 'WP-02'], A('calc', 'weather'), 'Each of you logs a week, and checks your own load before handoffs.'],
      ['Calm under pressure', ['WP-11'], A('decoder'), 'Decide in advance what settles you before a hard conversation.'],
      ['What keeps coming back?', ['WP-04'], A('report', 'ch5'), 'The monthly look-back: sort what slipped into real gaps or one-offs, and adjust the owners.']
    ],
    friends: [
      ['Name what went unseen', ['WP-09'], A('preface', 'signal'), 'Write the unseen thing as one fact, one feeling, one ask. You don’t have to send it yet.'],
      ['Kind ways to say no', ['WP-01'], A('ch1', 'decoder'), 'Practice one neutral refusal so a “no” doesn’t become a rift.'],
      ['Your own load first', ['WP-02', 'WP-11'], A('weather', 'garden'), 'Check your load before you bring it up, and know your pause line.'],
      ['Say it, once, kindly', [], A('checkins', 'toward'), 'Have the one conversation, lightly. Then send a “thinking of you” later in the week.']
    ],
    roommates: [
      ['A named owner for each chore', ['WP-03'], A('lemonade', 'ch4'), 'Start with the Lemonade Stand to see the split and the bills. Then give trash, bills, supplies and cleaning one owner each, and put the list on the fridge.'],
      ['The weekly house meeting', ['WP-13'], A('checkins', 'ground'), 'Ten minutes, once a week: the weekly version of the 90-second check-in. Load, one thanks, one friction, one ask.'],
      ['Only if you still disagree', ['WP-01'], A('lemonade'), 'If you still disagree about who does what, list one week’s chores and hours together, so it’s facts, not impressions.'],
      ['No call-outs', ['WP-09'], A('signal'), 'Put any point for the meeting through fact, feeling and ask first.'],
      ['What keeps coming back', ['WP-04'], A('calc', 'ch5'), 'At the end of the month, sort the repeats and adjust the owners.']
    ],
    coworkers: [
      ['Who owns what', ['WP-03'], A('ch1'), 'A named owner for each recurring team task: follow-ups, notes, reminders.'],
      ['Messages before sending', ['WP-09'], A('signal'), 'Check one charged chat or email with fact, feeling and ask.'],
      ['A short stand-up', ['WP-13'], A('checkins'), 'Try the 90-second daily check-in as a team stand-up, once a day.'],
      ['Make the invisible visible', ['WP-01'], A('decoder'), 'For one week, log the follow-ups and reminders that usually go unseen.'],
      ['A kind retrospective', ['WP-04', 'WP-02'], A('ch5', 'weather'), 'Look back at what slipped. And privately, check your own load.']
    ],
    caregivers: [
      ['Notice the strain', ['WP-02'], A('preface', 'weather'), 'A daily one-minute load check, each of you about yourself. A high load for days running is a signal to get more support.'],
      ['One owner for each part of the care', ['WP-03'], A('calc'), 'Appointments, medicines, calls: one name next to each, so “whenever” becomes a plan.'],
      ['When you’re depleted', ['WP-11'], A('garden'), 'Decide what settles you, and a pause line for the hard moments.'],
      ['Handoffs', ['WP-13'], A('checkins'), 'A short check-in between the people sharing care, each week.'],
      ['The sibling conversation', ['WP-09'], A('signal', 'ground'), 'Test the ask before the conversation, and keep it to one topic.'],
      ['See the whole load', ['WP-01', 'WP-04'], A('report'), 'Log a week of care, then look back at what keeps slipping.']
    ]
  };

  // The report, told for each road: what it is, how to read it, what to look for, what to talk
  // about, one question per workpaper, and a closing line.
  var REPORT = {
    self: {
      what: 'A kind record of your own load, what settles you, and how words reach you. It is for you first; share any page only if you want to.',
      lens: 'Each read describes your conditions and your setup, never your worth. Notice patterns the way you’d notice the weather.',
      together: ['How to read it', 'Read it on a calm day, with something warm to drink. Look for patterns across days, not verdicts about any one day. If a page stings, put it down and come back.'],
      look: ['Days when your load was already high before anything happened.', 'The settling defaults you actually reached for, and whether they helped.', 'Moments that stung more than you expected, and what that tells you about your wiring.', 'Where a kind “no” would have protected your energy.'],
      talk: ['What drains me that I tend to overlook?', 'Which of my two settling defaults works best, and when?', 'What have I learned about how I’m wired?', 'What is one thing I can say no to this week, kindly?'],
      ask: { 'WP-02': 'What was already in the tank before today began?', 'WP-11': 'Did your defaults help? Would you change one?', 'WP-09': 'Which part was hardest to write: the fact, the feeling or the ask?', 'WP-01': 'Which refusal felt kindest to say out loud?' },
      keep: 'Kind words to keep close',
      close: 'You are allowed to be gentle with yourself, today and every day.'
    },
    partners: {
      what: 'A shared picture of how the two of you run your life together: who does what, who owns what, how much each of you is carrying, and how you talk about it.',
      lens: 'Each read describes the arrangement between you, never either of you. It is where a conversation starts, not where one ends.',
      together: ['How to read it together', 'Pick a calm evening when neither of you is carrying a heavy load. Each read the at-a-glance page on your own first, then share one thing that surprised you and one thing you appreciated. One topic per sitting.'],
      look: ['Jobs that appear in one log but not the other: the unseen work.', 'Recurring jobs with no clear owner, or an owner who isn’t the one doing it.', 'Weeks when one load stayed high while the other eased.', 'Things that came up again in the monthly look-back.'],
      talk: ['What did you do this month that I didn’t see?', 'Which job would you most like to hand over, and to whom?', 'When you’re carrying a lot, what helps most from me?', 'What is one small thing we could change this week?'],
      ask: { 'WP-01': 'What surprised each of you in the other’s log?', 'WP-03': 'Which owner would you like to swap, and what would make that fair?', 'WP-13': 'Which appreciation meant the most this week?', 'WP-02': 'Whose load needs protecting this week, and how?', 'WP-09': 'Did the ask land the way it was meant?', 'WP-11': 'Do you both recognize each other’s pause line?', 'WP-04': 'Which repeat problem is a real gap, and which was a one-off?' },
      keep: 'Kind words between the two of you',
      close: 'The numbers describe the arrangement. The two of you decide what to do with it, together.'
    },
    family: {
      what: 'A calm picture of how your family shares the load and the conversations: who owns what at home, how tone lands, and what keeps slipping.',
      lens: 'Each read describes how the family has set things up, never any one person, and never a child.',
      together: ['How to read it as a family', 'Share only with the adults it concerns. Choose a quiet time, not a holiday table. Start with what’s working, then pick one thing to change.'],
      look: ['Tasks where “helping out” means different things to different people.', 'Messages where tone carried more than the words.', 'Leftover stress from long before this week.', 'The same thing slipping every month.'],
      talk: ['Which job do we each assume someone else is doing?', 'How would we like to be told when something bothers us?', 'What is our pause line when a family talk heats up?', 'What would make the next gathering easier for everyone?'],
      ask: { 'WP-03': 'Does everyone agree on the owner, or only the person who wrote it down?', 'WP-09': 'Which old family pattern made this message hard to send?', 'WP-02': 'What history came into the room with you?', 'WP-11': 'Will everyone recognize the pause line when it’s used?', 'WP-01': 'Where does “helping out” mean different things?', 'WP-04': 'What keeps coming back, and whose job is it really?' },
      keep: 'Kind words in the family',
      close: 'Families change slowly. One owner, one kinder message, one pause at a time is real progress.'
    },
    coparents: {
      what: 'A steady, factual picture of how two parents share the care of a child: owners for every kid task, messages that land, and handoffs that go smoothly.',
      lens: 'Each read describes the arrangement between two homes, never either parent. It is never evidence and never for building a case.',
      together: ['How to read it as co-parents', 'Read it separately first. Meet (or message) about one topic only: usually the next handoff or one slipping task. Keep the child out of it, and keep it short.'],
      look: ['Kid tasks with no owner, or two owners.', 'Handoffs where the same thing gets missed.', 'Messages that went better after fact, feeling and ask.', 'Weeks when one home carried most of the load.'],
      talk: ['Which kid task keeps falling between our homes?', 'What would make handoff day calmer for our child?', 'How would you like me to raise something that worries me?', 'Which owner should we swap for the next month?'],
      ask: { 'WP-03': 'Is every school, health and activity task owned by exactly one parent?', 'WP-09': 'Would this message read calmly if our child saw it one day?', 'WP-04': 'Which slip is a real gap, and which was a busy week?', 'WP-01': 'Is the load lopsided across the two homes?', 'WP-13': 'What is one thanks for the other home this week?', 'WP-02': 'What was your load before the handoff?', 'WP-11': 'Does the other parent know your pause line?' },
      keep: 'Kind words between two homes',
      close: 'Your child benefits from every calm handoff. A parenting plan or court order always comes first.'
    },
    friends: {
      what: 'A light-touch record of the give and take in a friendship: what went unseen, how to say it kindly, and how to say no without a rift.',
      lens: 'This isn’t a ledger of favors. Each read helps you name one thing, once, kindly.',
      together: ['How to read it', 'Read it on your own. If something needs saying, choose one sentence and a relaxed moment. You don’t have to share the report itself.'],
      look: ['The one thing that went unseen and still matters to you.', 'Where a kind “no” would have protected the friendship.', 'Days when your own load was the real story.'],
      talk: ['I noticed I’ve been doing more of the planning. Could we share it?', 'I can’t make it this time, and I’d love to see you next week.', 'Is there anything I’ve missed that mattered to you?'],
      ask: { 'WP-09': 'Is this one sentence you could say over coffee?', 'WP-01': 'Which kind no would you like to have ready?', 'WP-02': 'Was it the friendship, or were you carrying a lot that day?', 'WP-11': 'What settles you before a tricky talk?' },
      keep: 'Kind words for your friendship',
      close: 'Good friendships can hold one honest sentence. Say it lightly, and let it be enough.'
    },
    roommates: {
      what: 'A shared, factual picture of a shared home: who does which chore, who owns what, and the things that keep coming back.',
      lens: 'Each read describes the house setup, never a housemate. Facts, not impressions.',
      together: ['How to read it at a house meeting', 'Bring the at-a-glance page to the next house meeting. Start with one thanks each, then one chore to rebalance. No call-outs: every point goes through fact, feeling and ask.'],
      look: ['Chores with no named owner.', 'Chores that one person always ends up doing.', 'The problem that comes back every month.', 'Points that would land better as fact, feeling and ask.'],
      talk: ['Which chore should rotate, and how often?', 'What is one thing a housemate did this week that helped?', 'What house rule would make evenings easier?', 'What keeps coming back, and who will own it?'],
      ask: { 'WP-03': 'Did everyone agree to their chore at the meeting?', 'WP-13': 'What was each person’s one thanks this week?', 'WP-01': 'What does the log show that nobody mentioned?', 'WP-04': 'Which repeat problem needs a new owner?', 'WP-09': 'Would this point land as a request, not a call-out?', 'WP-02': 'Was it the house, or your own load?', 'WP-11': 'What settles you when the house is noisy?' },
      keep: 'Kind words around the house',
      close: 'A home runs well when everyone can see the same picture. You’ve drawn it together.'
    },
    coworkers: {
      what: 'A team-level picture of the work around the work: who owns each recurring task, which messages land, and what slips between people.',
      lens: 'Each read describes how the team is set up, never an individual. Never use it to rate anyone or as HR documentation.',
      together: ['How to read it as a team', 'Share only with teammates who agreed to try this. Use it in a short retrospective: what went well, what slipped, and one owner to change. Keep your own load checks private.'],
      look: ['Follow-ups and reminders that nobody owned.', 'Messages that read harsher than intended.', 'The same task slipping in every sprint or month.', 'Your own load before hard meetings (private).'],
      talk: ['Which recurring task should have a named owner?', 'Which messages would read better with fact, feeling and ask?', 'What unseen work kept the team moving this month?', 'What is one change for the next cycle?'],
      ask: { 'WP-03': 'Does each recurring team task have exactly one owner?', 'WP-09': 'Would this message read calmly to someone having a hard day?', 'WP-13': 'Did the stand-up surface anything early?', 'WP-04': 'What slipped more than once, and why?', 'WP-01': 'Which follow-ups were invisible until now?', 'WP-02': 'What was your load before the meeting? (Private)', 'WP-11': 'What settles you at work?' },
      keep: 'Kind words on the team',
      close: 'Good teams make the invisible work visible, then share it. That’s what this report is for.'
    },
    caregivers: {
      what: 'A caring, factual picture of the care you share: each part of the care and its owner, the strain on the people giving it, and the handoffs between you.',
      lens: 'Each read describes how the care is shared, never how much anyone loves the person they care for.',
      together: ['How to read it with a sibling or co-carer', 'Read the strain pages first, gently. Then look at the care owners together and choose one part of the care to rebalance. Running near empty is a signal to get more support, not a failing.'],
      look: ['Parts of the care with no clear owner.', 'Loads at 0.60 or above for more than a few days.', 'Handoffs where something got missed.', 'What keeps slipping every month.'],
      talk: ['Which part of the care is heaviest right now, and who could share it?', 'What support could we ask for from outside the family?', 'How should we hand over between visits?', 'What does each of us need to keep going?'],
      ask: { 'WP-02': 'How many days this week was anyone’s load at 0.60 or above?', 'WP-03': 'Does every appointment, medicine and call have one name next to it?', 'WP-11': 'What settles you when you’re too tired to talk well?', 'WP-13': 'What should the next person know at handoff?', 'WP-01': 'What does a full week of care actually involve?', 'WP-09': 'Is this ask one topic, kindly put?', 'WP-04': 'What keeps slipping, and what help would fix it?' },
      keep: 'Kind words among the carers',
      close: 'Caring for someone is love made practical. Caring for each other while you do it counts too.'
    },
    program: {
      what: 'Your six weeks, week by week: what you saw, what you changed, and how the same log compares from Week 1 to Week 6.',
      lens: 'Each read describes the arrangement, never either person. Six weeks is a sensible order, not a test.',
      together: ['How to read it at the end of the program', 'Read Week 1 and Week 6 side by side. Name one thing that changed, one that didn’t, and one to keep practicing. Some weeks take longer than a week, and that’s fine.'],
      look: ['How the Week 1 and Week 6 logs compare.', 'Jobs that found an owner in Week 2 and stayed owned.', 'Load patterns from Week 3.', 'Which check-in habits stuck after Week 5.'],
      talk: ['What changed most between Week 1 and Week 6?', 'Which habit do we want to keep?', 'What still needs an owner?', 'What would we like to try in the next six weeks?'],
      ask: { 'WP-01': 'How does this log compare with the other week’s?', 'WP-03': 'Are the owners from Week 2 still true?', 'WP-02': 'What pattern showed up across the week?', 'WP-09': 'Did the ask land?', 'WP-11': 'Did you use your pause line?', 'WP-13': 'Did the check-in become a habit?', 'WP-04': 'What keeps coming back?' },
      keep: 'Kind words from your six weeks',
      close: 'Six weeks of small, honest steps. Keep the ones that helped, and come back whenever you need to.'
    }
  };

  var PATHS = [
    {
      id: 'self', label: 'Just me', icon: '☀', color: '#F8E7AE',
      blurb: 'Know your own load, rhythms and reactions, kindly.',
      people: ['You'],
      names: { 'WP-01': 'Kind ways to say no', 'WP-09': 'Sort out what stung' },
      addable: [],
      groups: [
        { along: A('weather','ch3','garden'), title: 'Start here', note: 'Everything starts with how you’re doing inside.', stops: [
          { wp: 'WP-02', why: "Separate what you're already carrying from what just happened.", again: 'Another day' },
          { wp: 'WP-11', why: 'Decide in advance what settles you, so it is ready when you need it.' }
        ] },
        { along: A('wired','wiring','signal'), title: 'When words get hard', note: 'For the moment something stings.', stops: [
          { wp: 'WP-09', why: 'Turn a raw reaction into fact, feeling and a clear ask.', again: 'Another message' }
        ] },
        { along: A('freq','decoder'), title: 'Also helpful', note: 'Kind, ready-made ways to say no.', stops: [
          { wp: 'WP-01', why: 'Draft a kind “not right now”: say why the request is fair, say what you have left, and offer something instead.' }
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
          { wp: 'WP-03', why: 'One owner for every regular task, so you stop re-deciding it every week.' },
          { wp: 'WP-13', why: '90 seconds a day that keeps small things small.', again: 'Another week' }
        ] },
        { along: A('ch2','calc','checkins','signal'), title: 'Then', note: 'For your own state, and for the hard conversations.', stops: [
          { wp: 'WP-02', why: 'How much each of you is already carrying, filled in about yourself.', again: 'Another day' },
          { wp: 'WP-09', why: 'Fact, feeling and ask, before you send it.', again: 'Another message' },
          { wp: 'WP-11', why: 'A plan for settling when a talk heats up. If either of you starts using the numbers to win, pause and come back here.' }
        ] },
        { along: A('ch5','report','toward'), title: 'Once a month', note: 'Catch what keeps coming back.', stops: [
          { wp: 'WP-04', why: 'Sort repeat problems into real gaps and one-offs.', again: 'Another month' }
        ] }
      ],
      next: 'Start the 90-second daily check-in one evening this week, and each begin a Who did what log.',
      care: 'The tools describe the arrangement, never the person.',
      // "What brings you here?" The road above is for "things feel unfair". This one is for "things feel flat".
      ask: 'What brings you here?',
      main: { label: 'Things feel unfair or lopsided', note: 'Your road starts with the work itself: who does what, and who owns each job.' },
      variants: {
        // a couple who live apart: calls, visits and time zones instead of one shared home
        apart: {
          label: 'We live apart (long distance)', note: 'Your road starts with the daily check-in on a call, and a list of who starts which calls and who plans the visits. The sheets are worded for two homes.',
          blurb: 'Two people sharing a life from two places. Calls, visits and time zones are the work here.',
          sheetRoad: 'apart',
          groups: [
            { along: A('ch1', 'checkins'), title: 'Start here', note: 'Stay in step from two places.', stops: [
              { wp: 'WP-13', why: '90 seconds a day, face to face or on a call: how full you were, one thanks, one small ask.', again: 'Another week' },
              { wp: 'WP-03', why: 'Who starts which calls? One owner for each regular part of staying close: calls, the good-night text, planning visits, shared bills.' }
            ] },
            { along: A('ch2', 'signal', 'lemonade'), title: 'Then', note: 'For your own state, and for the talks that matter on a call.', stops: [
              { wp: 'WP-02', why: 'How much each of you is already carrying, filled in about yourself. Say your number at the start of a hard call.', again: 'Another day' },
              { wp: 'WP-09', why: 'Fact, feeling and ask, before you send it. Text loses tone, so this matters even more at a distance.', again: 'Another message' },
              { wp: 'WP-11', why: 'A plan for settling when a call heats up, including how to pause and call back.' },
              { wp: 'WP-01', why: 'A week of who did what: arranging calls, planning visits, the time-zone juggling. Each of you logs your own side.', again: 'Another week' }
            ] },
            { along: A('ch5', 'toward'), title: 'Once a month', note: 'Catch what keeps slipping between two places.', stops: [
              { wp: 'WP-04', why: 'Sort repeat problems (missed calls, a visit nobody booked) into real gaps and one-offs.', again: 'Another month' }
            ] }
          ],
          next: 'Agree who starts tomorrow’s call, and try the 90-second check-in on it.'
        },
        flat: {
          label: 'Things are fine, just flat', note: 'Your road starts with two short reads, a game to play together and the 90-second daily check-in. The chore and load sheets are still here, marked optional.',
          blurb: 'Two people sharing a life. Nothing is wrong; it just feels flat. Start with small moments of closeness.',
          groups: [
            { along: [], title: 'Start here', note: 'Two short reads and one thing to try together. No forms yet.', reads: [
              ['Complacency', '/complacency.html', 'Why \u201cfine\u201d can slowly turn flat, and the small things that bring it back.'],
              ['Turning toward', '/turning-toward.html', 'Seven small habits. Notice when your partner reaches for you, and answer.'],
              ['The Re-check Drive', '/recheck-drive.html', 'A calm game to play together. Each small, kind thing you really do moves the ball.']
            ], stops: [
              { wp: 'WP-13', why: '90 seconds a day: how you are, one thanks, one small ask. This is the daily habit that brings closeness back.', again: 'Another week' }
            ] },
            { along: A('checkins', 'signal', 'ch3'), title: 'Then', note: 'For the talks that matter, and for your own state.', stops: [
              { wp: 'WP-09', why: 'Say one thing you miss as fact, feeling and ask, so it lands as an invitation.', again: 'Another message' },
              { wp: 'WP-02', why: 'How much each of you is already carrying, filled in about yourself. Flat can also mean tired.', again: 'Another day' },
              { wp: 'WP-11', why: 'A plan for settling when a talk heats up.' }
            ] },
            { along: A('lemonade', 'ch2'), title: 'Optional: if the load feels uneven', note: 'Only if chores or planning have started to feel lopsided. Skip these if they haven\u2019t.', stops: [
              { wp: 'WP-01', why: 'Optional. A week of who did what, written down by each of you.', again: 'Another week', optional: true },
              { wp: 'WP-03', why: 'Optional. One owner for every regular job, so you stop re-deciding it every week.', optional: true }
            ] },
            { along: A('ch5', 'toward'), title: 'Once a month', note: 'Notice what brought you closer, and what keeps coming back.', stops: [
              { wp: 'WP-04', why: 'Sort repeat problems into real gaps and one-offs.', again: 'Another month' }
            ] }
          ],
          weeks: [
            ['Notice the small moments', [], A('complacency', 'toward'), 'Read Complacency and Turning toward. Each day, notice one time your partner reached for you, and answer it.'],
            ['Small daily check-ins', ['WP-13'], A('recheck', 'checkins'), 'Do the 90-second daily check-in every evening. Play one round of the Re-check Drive together.'],
            ['Your loads', ['WP-02'], A('ch3'), 'Each of you does the one-minute load check daily, about yourself. Say your number before any hard talk.'],
            ['Say what you miss', ['WP-09', 'WP-11'], A('signal', 'checkins'), 'Say one thing you miss as fact, feeling and ask. Agree on your pause lines.'],
            ['Look back', ['WP-04'], A('report', 'ch5'), 'Do your first monthly look-back. What brought you closer this month? Keep doing that.']
          ],
          next: 'Read Complacency this week, and start the 90-second daily check-in one evening.'
        }
      }
    },
    {
      id: 'family', label: 'Family', icon: '⌂', color: '#CFE6D2',
      blurb: 'Parents, adult children, siblings, in-laws and stepfamilies, including children who live in two homes: one roof or two, a group chat or a holiday table.',
      people: ['You', 'Family member'],
      groups: [
        { along: A('ch1','wired','signal'), title: 'Start here', note: 'Families often clash on tone and urgency more than on the task.', stops: [
          { wp: 'WP-03', why: 'Write down who owns what, so nobody has to guess.' },
          { wp: 'WP-09', why: 'Old family patterns make tone land hard; this slows it down.', again: 'Another message' }
        ] },
        { along: A('ch3','ch4','decoder'), title: 'Then', note: 'These help too, with small changes for family life.', stops: [
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
          { wp: 'WP-09', why: 'Turn a charged message into fact, feeling and ask before you hit send.', again: 'Another message' }
        ] },
        { along: A('report','checkins','ground'), title: 'Then', note: 'For the load, and for handoffs.', stops: [
          { wp: 'WP-13', why: 'Works well weekly instead of daily for parents in two homes.', again: 'Another week' },
          { wp: 'WP-01', why: 'Shows whether the load is lopsided across two homes.', again: 'Another week' },
          { wp: 'WP-02', why: 'Your own load, before a handoff conversation.', again: 'Another day' },
          { wp: 'WP-11', why: 'A pause line that is never mistaken for walking out.' }
        ] },
        { along: A('ch5','report'), title: 'Once a month', note: 'Catch what keeps slipping between homes.', stops: [
          { wp: 'WP-04', why: 'Once a month, sort what keeps slipping into a real gap or a one-off.', again: 'Another month' }
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
          { wp: 'WP-02', why: 'Check your own load before you bring it up.', again: 'Another day' },
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
      names: { 'WP-13': 'The weekly house meeting' },
      groups: [
        { along: A('lemonade','ch4'), title: 'Start here', note: 'First, the Lemonade Stand: everyone sees the same split and the same bills. Then:', stops: [
          { wp: 'WP-03', why: 'The fridge list: a named owner for trash, bills, supplies and cleaning.' },
          { wp: 'WP-13', why: 'Ten minutes, once a week: the weekly version of the 90-second daily check-in. Load, one thanks, one friction, one ask.', again: 'Another week' }
        ] },
        { along: A('calc','ch5','checkins','signal'), title: 'Then', note: 'Only if you still disagree about who does what, or goodwill starts running low.', stops: [
          { wp: 'WP-01', why: "Only if you still disagree: a week of who did what, so it's facts, not impressions.", again: 'Another week' },
          { wp: 'WP-09', why: "So a house-meeting point doesn't land as a call-out.", again: 'Another message' },
          { wp: 'WP-04', why: 'Catches the problem that comes back every month.', again: 'Another month' }
        ] },
        { along: A('weather','garden'), title: 'Just for you', note: 'On a hard day.', stops: [
          { wp: 'WP-02', why: 'Your own load, privately.', again: 'Another day' },
          { wp: 'WP-11', why: 'What settles you, ready when you need it.' }
        ] }
      ],
      next: 'At the next house meeting, fill in One owner per job together.',
      care: 'The shared sheets hold everyone in the house. The load check and the calm-down kit are each person\u2019s own, filled in about themselves.'
    },
    {
      id: 'coworkers', label: 'Coworkers', icon: '⚙', color: '#D6EEF0',
      blurb: 'The follow-ups, notes and reminders that keep a team moving.',
      people: ['You', 'Teammate'],
      groups: [
        { along: A('ch1','signal'), title: 'Start here', note: 'One owner per job comes from project management, so it fits a team naturally.', stops: [
          { wp: 'WP-03', why: 'One named owner for each recurring task.' },
          { wp: 'WP-09', why: 'Check a message before it goes out on chat or email.', again: 'Another message' }
        ] },
        { along: A('ch5','decoder','checkins'), title: 'Team rhythm', note: 'A stand-up and a retrospective.', stops: [
          { wp: 'WP-13', why: 'Works like a short stand-up.', again: 'Another week' },
          { wp: 'WP-01', why: 'Makes the invisible follow-ups visible.', again: 'Another week' },
          { wp: 'WP-04', why: 'A monthly retrospective on what keeps slipping.', again: 'Another month' }
        ] },
        { along: A('weather','garden'), title: 'Just for you', note: 'Privately, on a hard day.', stops: [
          { wp: 'WP-02', why: 'Your own load, before a tough meeting.', again: 'Another day' },
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
          { wp: 'WP-09', why: 'Test the ask before the sibling conversation.', again: 'Another message' },
          { wp: 'WP-01', why: 'A calm, factual week of who did what.', again: 'Another week' },
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
          { wp: 'WP-01', why: "Log a week of who does what, before memory turns it into a story." }
        ] },
        { along: A('ch2','calc'), title: 'Week 2 · One owner per job', note: 'Based on what your Week 1 log showed.', stops: [
          { wp: 'WP-03', why: 'Name one owner for each regular job.' }
        ] },
        { along: A('ch3','ch4'), title: 'Week 3 · Your loads', note: 'Each day for a week, each about yourself.', stops: [
          { wp: 'WP-02', why: 'Look for patterns: who is carrying more, and when.', again: 'Another day' }
        ] },
        { along: A('signal','decoder','wired'), title: 'Week 4 · Talk about it kindly', note: 'Retune before you respond.', stops: [
          { wp: 'WP-09', why: 'Turn a raw reaction into fact, feeling and a clear ask.', again: 'Another message' },
          { wp: 'WP-11', why: 'Your pause line, agreed on a calm day.' }
        ] },
        { along: A('freq','checkins'), title: 'Week 5 · Get back in step', note: 'Small corrections, daily.', stops: [
          { wp: 'WP-13', why: 'Try the 90-second daily check-in together.' }
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

  // the 6-week program's weeks are its groups; every other road gets its own plan above
  // Living apart: the same report, worded for two homes, calls and visits
  REPORT.apart = {};
  Object.keys(REPORT.partners).forEach(function (k) { REPORT.apart[k] = REPORT.partners[k]; });
  REPORT.apart.what = 'A shared picture of how the two of you stay close from two places: who starts which calls, who plans the visits, how much each of you is carrying, and how you talk about it.';
  REPORT.apart.together = ['How to read it together', 'Pick a call when you\u2019re both free and neither of you is carrying a heavy load. Each read the at-a-glance page on your own first, then share one thing that surprised you and one thing you appreciated. One topic per call.'];
  REPORT.apart.look = ['Calls or messages that always start from the same side.', 'Regular parts of staying close (calls, the good-night text, planning visits) with no clear owner.', 'Weeks when one load stayed high while the other eased.', 'Things that came up again in the monthly look-back, like a missed call or a visit nobody booked.'];
  REPORT.apart.talk = ['What did you do this month to stay close that I didn\u2019t see?', 'Which call or plan would you like the other one to start?', 'When you\u2019re carrying a lot, what helps most from me, from where I am?', 'What is one small thing we could change before our next call?'];
  PATHS.forEach(function (p) {
    p.report = REPORT[p.id] || null;
    if (p.variants && p.variants.apart) p.variants.apart.report = REPORT.apart;
    p.weeks = WEEKS[p.id] || p.groups.map(function (g) { return [g.title.replace(/^Week \d+ \u00B7 /, ''), g.stops.map(function (x) { return x.wp; }), g.along || [], g.note]; });
  });

  // The road with one of its variants laid over it (same id, so every sheet, file and report still fits).
  // No variant, or one the road doesn't have: the road itself.
  function variant(p, key) {
    var v = p && key && p.variants && p.variants[key];
    if (!v) return p;
    var out = {};
    Object.keys(p).forEach(function (k) { out[k] = p[k]; });
    Object.keys(v).forEach(function (k) { if (k !== 'label' && k !== 'note') out[k] = v[k]; });
    out.variant = key;
    out.base = p;
    return out;
  }
  global.TOL_SUITE_PATHS = { paths: PATHS, names: NAMES, read: READ, variant: variant };
})(typeof window !== 'undefined' ? window : globalThis);
