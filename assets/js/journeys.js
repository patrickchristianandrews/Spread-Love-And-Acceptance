/* journeys.js — guided journeys: short paths of 3 to 6 small steps for what's going on, a first-visit
   "What's going on?" picker that recommends ONE journey plus one 2-minute thing to do now, and a dated
   follow-up question ("Did the agreement hold?") the next time someone visits after "Come back in a week".

   Where it runs
     /journeys.html              <div data-journeys> (the list), <div data-journey-pick> (the picker),
                                 <div data-journey-back> (the follow-up, when one is due)
     the home page               <div data-journey-pick="home"> and <div data-journey-back> inside the first card
   Without JavaScript the picker's choices are plain links to /journeys.html?for=<choice>#pick, and the
   journeys page shows each journey's steps as plain links.

   Tools are named by their registry id (assets/js/tools-registry.js: window.TOLToolById, which follows the
   aliases of merged tools), so a step always shows the tool's current name and address. A step's f is
   the address it used when written: if the tool has since become a mode of a bigger tool, the mode with
   that address is used, with its label.

   Kept on this device (listed on /on-this-device.html)
     localStorage 'tol-journeys-v1'  { v:1, j: { <journey id>: { s: start date 'YYYY-MM-DD', d: [ticked step
                                     numbers], b: follow-up date 'YYYY-MM-DD' (only after "Come back in a
                                     week") } } }. Nothing you write in a tool is kept here, only ticks and dates.
   Calendar reminders are files for your own calendar (remind.js); nothing is sent anywhere. */
(function (root) {
  'use strict';
  var W = typeof window !== 'undefined' ? window : null, D = W && W.document;
  var KEY = 'tol-journeys-v1';
  var HEAVY = { text: 'If this keeps feeling too heavy, or you feel unsafe, outside help can make a real difference', href: '/outside-help.html' };

  // ---------------------------------------------------------------- the journeys
  // step kinds: 'tool' (id: registry id), 'wp' (a workpaper, always optional), 'read' (a page to read; t: its title)
  // f: the address when written (a fallback, and how a merged tool's mode is found); mins: minutes; leave: what you leave with
  var J = [
    { id: 'steady', who: 'solo', title: 'After a breakup: steady again', len: 'About two weeks, a few minutes a day', heavy: true,
      intro: 'For the weeks after a relationship ends, whoever ended it. Gentle, on your own, at your own pace.',
      leave: 'three basics for the hard days, a kinder sentence for yourself, a done list and a short “who I am now” list',
      back: { q: 'A week on: how are the waves? Take today’s reading, then pick your next small step.', id: 'weather', f: '/quick-checks.html#today', go: 'Take today’s reading' },
      steps: [
        { k: 'read', t: 'After a breakup: the first days', f: '/after-a-breakup.html#first-days', mins: 5, do: 'Read what to expect in the first days, and the basics that help.', leave: 'Three basics to keep going this week' },
        { k: 'tool', id: 'weather', f: '/quick-checks.html#today', mins: 1, do: 'Take a one-minute reading of how you are, once a day.', leave: 'A reading a day on this device, so you can see the waves get smaller' },
        { k: 'read', t: 'A kinder inner voice', f: '/after-a-breakup.html#kind-voice', mins: 5, do: 'Find a kinder sentence for the hard moments.', leave: 'One sentence to say to yourself' },
        { k: 'read', t: 'Small wins: your done list', f: '/small-wins.html#done-list', mins: 2, do: 'Write down one small thing you did today. Do it again tomorrow.', leave: 'A done list that adds up' },
        { k: 'read', t: 'Your self-discovery path', f: '/self-path.html', mins: 15, do: 'Work out what is yours: what you enjoy, and what you want next.', leave: 'A short “who I am now” list' },
        { k: 'read', t: 'Living on your own: weekends and evenings', f: '/living-alone.html#weekends', mins: 10, do: 'Plan one or two anchors for the evenings and weekends.', leave: 'One regular thing that’s just yours' }
      ] },
    { id: 'know', who: 'solo', title: 'Know yourself in a week', len: 'One week, about 10 minutes a day',
      intro: 'Six short looks at how you work. Nothing here needs anyone else.',
      leave: 'your communication style, a care card, a one-page “how to talk to me” card, one pattern you understand better and the logic behind one of your reactions',
      back: { q: 'A week on: which result surprised you most? Share one with someone you trust, if you like.', href: '/together.html#share', go: 'Share a result' },
      steps: [
        { k: 'tool', id: 'weather', f: '/quick-checks.html#today', mins: 1, do: 'Check your mood and energy today, in four taps.', leave: 'Today’s reading, and what tends to help on days like it' },
        { k: 'tool', id: 'wavelength', f: '/wavelength.html', mins: 10, do: 'Answer short questions about how you talk and listen.', leave: 'Your communication style, in plain words' },
        { k: 'tool', id: 'carecard', f: '/love-languages.html#ll-card-h', mins: 5, do: 'Pick what feels like care to you.', leave: 'A care card to keep or share' },
        { k: 'tool', id: 'roots', f: '/growing-up.html#roots-h', mins: 10, do: 'Look at one reaction of yours and where it may come from.', leave: 'One pattern you understand a little better' },
        { k: 'tool', id: 'wiring', f: '/wiring-card.html', mins: 10, do: 'Make a one-page card on how you like to be spoken to.', leave: 'A card that tells people what helps you' },
        { k: 'tool', id: 'logic', f: '/the-logic-behind-it.html', mins: 10, do: 'Pick one reaction of yours that people misread, and lay out the logic behind it in six short parts.', leave: 'A card that shows why your reaction makes sense, with one kind step' }
      ] },
    { id: 'busy', who: 'solo', title: 'Busy? Five minutes that help', len: 'Pick any one: each takes five minutes or less',
      intro: 'No time? Each step stands on its own. Do one today, another tomorrow.',
      leave: 'one small, useful thing a day: a reading, a better message, a clear request or a small idea',
      back: { q: 'A week on: which five minutes helped most? Do that one again this week.', href: '/journeys.html#busy', go: 'See the five minutes' },
      steps: [
        { k: 'tool', id: 'weather', f: '/quick-checks.html#today', mins: 1, do: 'Know where you are today, in four taps.', leave: 'Today’s reading' },
        { k: 'tool', id: 'signal', f: '/signal-translator.html', mins: 2, do: 'Check one message before you send it.', leave: 'Words that keep your point and land kindly' },
        { k: 'tool', id: 'flip', f: '/small-wins.html#flip-it', mins: 2, do: 'Turn one complaint into a clear, kind request.', leave: 'A request to send instead of a complaint' },
        { k: 'tool', id: 'bonding', f: '/bonding.html#ideas', mins: 1, do: 'Get one small idea to do with someone today.', leave: 'One small thing to do today' },
        { k: 'wp', id: 'checkin90', f: '/workpapers/wp-13-daily-check-in.html', mins: 2, do: 'If you live with someone: one sentence each, once a day.', leave: 'A tiny daily habit' }
      ] },
    // home16b: "I need to calm down" for someone on their own (or who hasn't said) starts here, not with a two-person journey
    { id: 'settle', who: 'solo', title: 'Calm down, on your own', len: 'A few minutes now, and ten on a calm day',
      intro: 'For when your body is wound up and nobody else needs to be part of it. Settle first; think it through later.',
      leave: 'a calmer body now, a pause you can use anywhere, and your own plan for next time',
      back: { q: 'A week on: when it got hard, what helped you settle? Add it to your plan.', id: 'calmkit', f: '/wp-11.html', go: 'Open your calm-down plan' },
      steps: [
        { k: 'read', t: 'Breathe: a one-minute breathing break', f: '/night-garden.html', breathe: true, mins: 1, do: 'Breathe out a little longer than you breathe in, for one minute. It opens right here, on top of the page.', leave: 'A calmer body, in one minute' },
        { k: 'tool', id: 'calm', f: '/upset-right-now.html', mins: 5, do: 'Still wound up? A five-minute pause with a slow breathing pacer.', leave: 'A pause you can use anywhere' },
        { k: 'tool', id: 'weather', f: '/quick-checks.html#today', mins: 1, do: 'Once you’ve settled a little, check how you are, in four taps.', leave: 'Today’s reading, and what tends to help on days like it' },
        { k: 'wp', id: 'calmkit', f: '/wp-11.html', mins: 10, do: 'On a calm day, write down your early signs and what settles you.', leave: 'Your own calm-down plan for next time' }
      ] },
    { id: 'family', who: 'solo', title: 'Family conflict: your terms, kindly', len: 'About a week, before a family event or a hard visit', heavy: true,
      intro: 'For grown-up families: siblings, parents, in-laws. Start on your own; bring others in only if they’re willing.',
      leave: 'your terms for the next event, kind ways to say no, and a family plan if others want one',
      back: { q: 'Did your terms hold at the event? Adjust them here.', id: 'terms', f: '/family-rifts.html#terms', go: 'Adjust your terms' },
      steps: [
        { k: 'read', t: 'Family rifts: how they tend to start', f: '/family-rifts.html#how', mins: 5, do: 'Read how family rifts tend to start, without anyone being the villain.', leave: 'Words for what is happening that blame no one' },
        { k: 'tool', id: 'terms', f: '/family-rifts.html#terms', mins: 10, do: 'Set your terms for the next family event: what you will do, and what you won’t.', leave: 'Your terms, ready to keep or share' },
        { k: 'tool', id: 'refusals', f: '/refusals.html#make', mins: 2, do: 'Find a kind, clear way to say no.', leave: 'Three copy-ready ways to say no' },
        { k: 'tool', id: 'familyplan', f: '/check-ins.html?for=family#card', mins: 15, do: 'If others are willing: fill in a family plan together.', leave: 'A family plan card with a date to look at it again' },
        { k: 'read', t: 'Grown-up children and parents', f: '/grown-up-children.html', mins: 5, do: 'Read about boundaries with a parent you love.', leave: 'Words for visits and advice' }
      ] },
    { id: 'agree', who: 'two', title: 'Same argument again → one agreement we both keep', len: 'About a week, with a look back after', heavy: true,
      intro: 'From “here we go again” to one specific agreement, one calm step at a time. Either of you can start alone.',
      leave: 'where your argument turns, a pause plan, and one written agreement with a date to check it',
      back: { q: 'Did the agreement hold? Adjust it here.', id: 'checkincard', f: '/check-ins.html#card', go: 'Adjust the agreement' },
      steps: [
        { k: 'tool', id: 'signal', f: '/signal-translator.html#conversation', mins: 5, do: 'Paste the last argument over text, or a screenshot, to see where it turned.', leave: 'Where the talk turned, and calm words that keep your point' },
        { k: 'tool', id: 'decoder', f: '/carrier-wave-decoder.html', mins: 15, do: 'Do the step-by-step reset: settle, see their side, try again.', leave: 'Their side of the moment, and one sentence to bridge the gap' },
        { k: 'tool', id: 'pause', f: '/pursue-withdraw.html#plan-h', mins: 10, do: 'On a calm day, agree how either of you can pause, and when you come back.', leave: 'A pause word, a return time and the first sentence back' },
        { k: 'tool', id: 'checkincard', f: '/check-ins.html#card', mins: 10, do: 'Write down one agreement you both keep, and when you will check it.', leave: 'One agreement, written down, with a check-in date' },
        { k: 'wp', id: 'keepscoming', f: '/workpapers/wp-04-what-keeps-coming-back.html', mins: 15, do: 'Once a month: spot what keeps coming back, and fix one thing.', leave: 'A monthly look-back sheet' },
        { k: 'tool', id: 'logic', f: '/the-logic-behind-it.html#find', mins: 5, do: 'When their reaction (or yours) still puzzles you, type what happened and see the logic behind it, with their side too.', leave: 'One sentence to explain it, and one small step for both of you' }
      ] },
    { id: 'space', who: 'two', title: 'One wants to talk now, one needs space', len: 'A few days; the plan takes ten minutes',
      intro: 'When one of you chases and the other pulls away. A way to pause that doesn’t feel like walking out, and a way back.',
      leave: 'words for the pattern, a calm-down for the moment, and a pause plan you both agreed',
      back: { q: 'Did you use the pause plan? Adjust it here.', id: 'pause', f: '/pursue-withdraw.html#plan-h', go: 'Adjust the pause plan' },
      steps: [
        { k: 'read', t: 'One wants to talk, one needs space', f: '/pursue-withdraw.html', mins: 5, do: 'Read why one of you chases and the other pulls away.', leave: 'Words for the pattern that blame no one' },
        { k: 'tool', id: 'upset', f: '/upset-right-now.html', mins: 5, do: 'For the moment it heats up: a five-minute pause, slow breathing and a time to come back.', leave: 'A calmer body, and a time to return' },
        { k: 'tool', id: 'pause', f: '/pursue-withdraw.html#plan-h', mins: 10, do: 'On a calm day, agree your pause plan together.', leave: 'A pause word, how long a break lasts, and the first sentence back' },
        { k: 'wp', id: 'pace12', f: '/workpapers/wp-12-same-moment-different-speeds.html', mins: 10, do: 'See where your speeds differ in five everyday moments.', leave: 'Your speeds side by side, and one thing to agree' },
        { k: 'tool', id: 'write', f: '/write-it-through.html', mins: 10, do: 'For the one who needs space: say it in writing, with a time to reply by.', leave: 'A message ready to send, after a short wait' }
      ] },
    { id: 'fair', who: 'two', title: 'Who does what → a fair plan', len: 'About a week',
      intro: 'From “I do everything” to a plan you both think is fair. The list gets talked about, not each other.',
      leave: 'a who-does-what picture, words for the invisible work, and a new split to try for a week',
      back: { q: 'Did the new split hold? Adjust it here.', id: 'checkincard', f: '/check-ins.html#card', go: 'Adjust the split' },
      steps: [
        { k: 'tool', id: 'lemon-quick', f: '/lemonade-stand.html#quick', mins: 2, do: 'Tap who mostly does each job, the thinking work too.', leave: 'A who-does-what picture you can both look at' },
        { k: 'read', t: 'The mental load, in plain words', f: '/invisible-labor-mental-load.html', mins: 5, do: 'Read about the work nobody sees.', leave: 'Words for the invisible work, without blame' },
        { k: 'tool', id: 'fair-quick', f: '/workpapers/calculators/is-the-setup-working-quick.html', mins: 5, do: 'Check whether the setup works for everyone.', leave: 'A plain answer: fair, or what to change' },
        { k: 'wp', id: 'owner', f: '/workpapers/wp-03-one-owner-per-job.html', mins: 15, do: 'Give each job one owner and a backup.', leave: 'A who-owns-what list' },
        { k: 'tool', id: 'checkincard', f: '/check-ins.html#card', mins: 10, do: 'Agree to try the new split for one week, and when you’ll look at it.', leave: 'A one-week agreement with a check-in date' }
      ] },
    // home16b: "I only have five minutes" with someone gets five minutes for two, not a "Just you" journey
    { id: 'busy2', who: 'two', title: 'Busy? Five minutes together', len: 'Pick any one: each takes five minutes or less',
      intro: 'No time for a big talk? Each step stands on its own, and either of you can start it. Do one today, another tomorrow.',
      leave: 'one small shared thing a day: an idea to do together, a fair look at the jobs, a clear request or a kinder message',
      back: { q: 'A week on: which five minutes helped you both most? Do that one again this week.', href: '/journeys.html#busy2', go: 'See the five minutes' },
      steps: [
        { k: 'tool', id: 'bonding', f: '/bonding.html#ideas', mins: 1, do: 'Get one small idea to do together today.', leave: 'One small thing to do together today' },
        { k: 'tool', id: 'lemon-quick', f: '/lemonade-stand.html#quick', mins: 3, do: 'Each tap who mostly does each job at home, then compare.', leave: 'Where you agree about the jobs, and where you don’t' },
        { k: 'tool', id: 'flip', f: '/small-wins.html#flip-it', mins: 2, do: 'Turn one complaint into a clear, kind request.', leave: 'A request to say instead of a complaint' },
        { k: 'tool', id: 'signal', f: '/signal-translator.html', mins: 2, do: 'Check one message before you send it.', leave: 'Words that keep your point and land kindly' },
        { k: 'wp', id: 'checkin90', f: '/workpapers/wp-13-daily-check-in.html', mins: 2, do: 'If you live together: one sentence each, once a day.', leave: 'A tiny daily habit' }
      ] },
    { id: 'close', who: 'two', title: 'Feel close again', len: 'Two weeks, a little each day',
      intro: 'For long-term couples who have drifted into “fine”. Small things, often, rather than one big gesture.',
      leave: 'one small idea a week, your shared words and rituals, a time-together deal and one daily habit',
      back: { q: 'Did you do the small thing? Pick the next one.', id: 'bonding', f: '/bonding.html#ideas', go: 'Pick the next small thing' },
      steps: [
        { k: 'read', t: 'When “fine” goes unchecked', f: '/complacency.html#try-today', mins: 5, do: 'Notice what has slipped into “fine”.', leave: 'One thing you’d like back' },
        { k: 'tool', id: 'bonding', f: '/bonding.html#ideas', mins: 2, do: 'Get one small idea that fits your time and energy.', leave: 'One small thing to do together this week' },
        { k: 'tool', id: 'touchstones', f: '/touchstones.html#ts-card-h', mins: 10, do: 'Write down your shared words, jokes and rituals.', leave: 'Your touchstones list' },
        { k: 'tool', id: 'deal', f: '/gaming-and-time-together.html#deal-h', mins: 10, do: 'Agree a small time-together deal, phones and games included.', leave: 'A time-together deal you both chose' },
        { k: 'read', t: 'Turning toward each other', f: '/turning-toward.html', mins: 5, do: 'Pick one small daily habit for turning toward each other.', leave: 'One daily habit' },
        { k: 'wp', id: 'rituals15', f: '/workpapers/wp-15-keep-your-little-rituals-alive.html', mins: 10, do: 'Keep your little rituals alive.', leave: 'A sheet of your rituals, and one to bring back' }
      ] },
    { id: 'keep', who: 'two', title: 'Keep a good thing good', len: 'A light monthly rhythm, about 30 minutes a month',
      intro: 'For couples who are doing fine and want to stay that way. A small routine that keeps small things small.',
      leave: 'a weekly check-in habit, a fresh touchstones list, one new thing a month and a monthly look-back',
      back: { q: 'A month on: time for your monthly look-back. Anything to adjust?', id: 'keepscoming', f: '/workpapers/wp-04-what-keeps-coming-back.html', go: 'Do the monthly look-back' }, days: 28,
      steps: [
        { k: 'tool', id: 'checkincard', f: '/check-ins.html#card', mins: 10, do: 'Once a week, a short check-in card, even when all is well.', leave: 'A weekly rhythm that catches small things early' },
        { k: 'tool', id: 'touchstones', f: '/touchstones.html#ts-card-h', mins: 10, do: 'Once a month, refresh your list of shared words, jokes and rituals.', leave: 'An up-to-date touchstones list' },
        { k: 'tool', id: 'bonding', f: '/bonding.html#ideas', mins: 2, do: 'Once a month, pick one new small thing to try together.', leave: 'Something new on the calendar' },
        { k: 'wp', id: 'keepscoming', f: '/workpapers/wp-04-what-keeps-coming-back.html', mins: 15, do: 'Once a month, look back at what keeps coming back, and fix one thing.', leave: 'A monthly look-back' }
      ] },
    { id: 'apart', who: 'two', title: 'Long-distance: close while apart', len: 'About two weeks, on your own time',
      intro: 'Each of you does your part on your own time, in your own time zone, then you swap by link. Nothing is stored on our side.',
      leave: 'a call rhythm that fits you both, two care cards side by side, a weekly check-in that works across time zones, and your shared rituals',
      back: { q: 'How did the swaps go? Adjust your rhythm here.', id: 'checkincard', f: '/check-ins.html#card', go: 'Adjust the weekly card' },
      steps: [
        { k: 'read', t: 'Long-distance: a rhythm you both agree', f: '/long-distance.html#rhythm', mins: 5, do: 'Read about a call rhythm that fits both your days.', leave: 'Ideas for a rhythm across time zones' },
        { k: 'read', t: 'Work on it together: what travels', f: '/together.html#what-travels', mins: 2, do: 'See how swapping a tool by link works: your answers travel in the link, not through us.', leave: 'Peace of mind about what you share' },
        { k: 'tool', id: 'carecard', f: '/love-languages.html#ll-card-h', mins: 5, do: 'Each fill in your care card when it suits you, then swap by link.', leave: 'Two care cards side by side' },
        { k: 'tool', id: 'checkincard', f: '/check-ins.html#card', mins: 10, do: 'Each fill in the weekly card in your own time zone, then send it back and forth.', leave: 'A weekly check-in that works across the miles' },
        { k: 'tool', id: 'touchstones', f: '/touchstones.html#ts-card-h', mins: 10, do: 'Start a shared list of your words and rituals, passed by link.', leave: 'Your shared rituals, across the distance' },
        { k: 'tool', id: 'weather', f: '/quick-checks.html#today', mins: 1, do: 'On hard days: each take a reading, and share it only if you both choose to.', leave: 'Each other’s day, side by side' }
      ] },
    { id: 'blended', who: 'two', title: 'Blended family: roles and kind boundaries', len: 'Two or three weeks, at a slow pace',
      intro: 'For stepfamilies and two homes. Going slowly helps: a warm adult first, a parent’s role later, if ever.',
      leave: 'a stepparent role you both agree, calm handover words, a family plan card and a handoff-bag checklist',
      back: { q: 'Did the family plan hold? Adjust it here.', id: 'familyplan', f: '/check-ins.html?for=family#card', go: 'Adjust the family plan' },
      steps: [
        { k: 'read', t: 'Stepfamilies: going slowly together', f: '/stepfamily.html#slow', mins: 5, do: 'Read why going slowly helps a new family.', leave: 'Realistic hopes for the first years' },
        { k: 'read', t: 'The stepparent role', f: '/stepfamily.html#stepparent', mins: 10, do: 'Talk through the stepparent role: a warm adult first.', leave: 'A short description of the role you both agree' },
        { k: 'read', t: 'Co-parenting: handover day', f: '/co-parenting.html#handoff', mins: 5, do: 'For two homes: words that keep handovers calm.', leave: 'Words for handover day' },
        { k: 'tool', id: 'familyplan', f: '/check-ins.html?for=family#card', mins: 15, do: 'Fill in a family plan card: routines, roles and a review date.', leave: 'A family plan card' },
        { k: 'tool', id: 'handoff', f: '/co-parenting.html#handoff-bag', mins: 10, do: 'Make a handoff-bag checklist for the two homes.', leave: 'A checklist that travels with the kids' }
      ] }
  ];

  // the first-visit picker: one journey, and one thing to do in about 2 minutes
  var PICKS = [
    { id: 'argument', label: 'We keep having the same argument', j: 'agree', now: { id: 'flip', f: '/small-wins.html#flip-it', do: 'Turn your side of it into one clear, kind request.' } },
    { id: 'breakup', label: 'I’m going through a breakup', j: 'steady', now: { t: 'The first days', f: '/after-a-breakup.html#first-days', do: 'Read the three basics for this week.' } },
    { id: 'myself', label: 'I want to understand myself', j: 'know', now: { id: 'weather', f: '/quick-checks.html#today', do: 'Check how you are right now, in four taps.' } },
    { id: 'chores', label: 'Chores feel unfair', j: 'fair', now: { id: 'lemon-quick', f: '/lemonade-stand.html#quick', do: 'Tap who mostly does each job at home.' } },
    // home16b: a pick can depend on "With someone" / "Just me" (tol-mode-v1): modes.with / modes.me replace its fields.
    // Nothing picked, or "Just me": a calm step for one person, right now (the Breathe break opens on top of the page).
    { id: 'calm', label: 'I need to calm down', j: 'settle', now: { breathe: true, t: 'Breathe for one minute', f: '/night-garden.html', do: 'One minute of slow breathing, right here.' }, also: ['space', 'Two of you, and one needs space?'],
      modes: { with: { j: 'space', now: { id: 'calm', f: '/upset-right-now.html', do: 'A five-minute pause: slow breathing, then a time to come back.' }, why: 'When you’re calm again, this journey makes the next heated moment easier.', also: ['settle', 'Just you right now?'] } } },
    { id: 'drift', label: 'We’ve drifted apart', j: 'close', now: { id: 'bonding', f: '/bonding.html#ideas', do: 'Get one small idea to do together today.' }, also: ['keep', 'Doing fine and want to keep it that way?'] },
    { id: 'family', label: 'Family stuff', j: 'family', now: { id: 'refusals', f: '/refusals.html#make', do: 'Find a kind, clear way to say no.' }, also: ['blended', 'A stepfamily or two homes?'] },
    { id: 'busy', label: 'I only have five minutes', j: 'busy', now: { id: 'weather', f: '/quick-checks.html#today', do: 'Know where you are today, in four taps.' },
      modes: { with: { j: 'busy2', now: { id: 'bonding', f: '/bonding.html#ideas', do: 'Get one small idea to do together today.' }, also: ['busy', 'Just you today?'] } } },
    // not a journey: a short "which is closest?" list of pages
    { id: 'life', label: 'Our life has changed', choose: [
      ['Retired, and both home now', '/retired-together.html', 'Routines, handing over whole jobs, and time apart'],
      ['The kids have left home', '/empty-nest.html', 'Finding each other again in a quieter house'],
      ['One of us is ill', '/when-one-is-ill.html', 'Sharing the load when one of you has less energy'],
      ['Caring for someone we love', '/caregivers.html', 'When they can’t share the load back']] }
  ];

  var API = { journeys: J, picks: PICKS, key: KEY, heavy: HEAVY };
  if (typeof module === 'object' && module.exports) module.exports = API;
  if (!W || !D) return;
  if (W.TOLJourneys) return;
  W.TOLJourneys = API;

  // ---------------------------------------------------------------- helpers
  function byId(id) { for (var i = 0; i < J.length; i++) if (J[i].id === id) return J[i]; return null; }
  function pick(id) { for (var i = 0; i < PICKS.length; i++) if (PICKS[i].id === id) return PICKS[i]; return null; }
  // "With someone" / "Just me", as picked on the home page (tol-mode-v1); '' when nothing is picked
  function modeNow() { try { var m = W.localStorage.getItem('tol-mode-v1'); return m === 'me' || m === 'with' ? m : ''; } catch (e) { return ''; } }
  // a pick as it reads for this mode: its modes.<mode> fields replace the plain ones
  function pickFor(id, mode) {
    var p = pick(id); if (!p) return null;
    var o = p.modes && p.modes[mode == null ? modeNow() : mode]; if (!o) return p;
    var r = {}; Object.keys(p).forEach(function (k) { r[k] = p[k]; }); Object.keys(o).forEach(function (k) { r[k] = o[k]; });
    return r;
  }
  // the Breathe break opens on top of the page (site.js's button); the link's own address is the fallback
  function openBreathe(e) {
    var b = D.querySelector('.tol-breathe-btn'); if (!b) return;
    if (e) e.preventDefault();
    b.click();
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return ymd(new Date()); }
  function addDays(s, n) { var p = s.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]); d.setDate(d.getDate() + n); return ymd(d); }
  function niceDate(s) { var p = s.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]); try { return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }); } catch (e) { return s; } }
  function okDate(s) { return typeof s === 'string' && /^\d{4}-\d\d-\d\d$/.test(s); }
  function load() {
    var o = null; try { o = JSON.parse(W.localStorage.getItem(KEY) || 'null'); } catch (e) { o = null; }
    if (!o || typeof o !== 'object' || typeof o.j !== 'object' || !o.j) o = { v: 1, j: {} };
    Object.keys(o.j).forEach(function (k) {
      var r = o.j[k], jj = byId(k);
      if (!jj || !r || typeof r !== 'object') { delete o.j[k]; return; }
      r.d = Array.isArray(r.d) ? r.d.filter(function (n) { return n === (n | 0) && n >= 0 && n < jj.steps.length; }) : [];
      if (!okDate(r.s)) delete r.s;
      if (!okDate(r.b)) delete r.b;
    });
    return o;
  }
  function save(o) {
    Object.keys(o.j).forEach(function (k) { var r = o.j[k]; if (!r.s && !r.b && !(r.d && r.d.length)) delete o.j[k]; });
    try { if (Object.keys(o.j).length) W.localStorage.setItem(KEY, JSON.stringify({ v: 1, j: o.j })); else W.localStorage.removeItem(KEY); } catch (e) {}
    try { D.dispatchEvent(new CustomEvent('tol-journeys')); } catch (e) {}
  }
  function rec(o, id) { return o.j[id] || (o.j[id] = { d: [] }); }
  function mk(tag, attrs, kids) {
    var n = D.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k]; if (v == null || v === false) return;
      if (k === 'text') n.textContent = v; else if (k === 'cls') n.className = v; else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? D.createTextNode(c) : c); });
    return n;
  }
  function path(u) { return String(u || '').split(/[?#]/)[0]; }
  // a tool by id, through the registry: { name, href } (name '' when the registry isn't here)
  function tool(id, f) {
    var t = null; try { t = W.TOLToolById ? W.TOLToolById(id) : null; } catch (e) { t = null; }
    if (!t) return { name: '', href: f || '/tools.html' };
    var modes = Array.isArray(t.modes) ? t.modes : [], m = null, i;
    if (f) for (i = 0; i < modes.length && !m; i++) if (modes[i] && modes[i][1] === f) m = modes[i];
    if (!m && f && t.id !== id) for (i = 0; i < modes.length && !m; i++) if (modes[i] && path(modes[i][1]) === path(f)) m = modes[i];
    if (m) {
      var ml = m[3] || m[0];   // a mode's short label when it has one
      var named = modes.length < 2 || t.name.indexOf(m[0]) >= 0 || t.name.indexOf(ml) >= 0;
      return { name: named ? t.name : t.name + ' · ' + ml, href: m[1] };
    }
    return { name: t.name, href: t.id === id ? (f && path(f) === path(t.href) ? f : t.href) : (f || t.href) };
  }
  function stepLink(s) {
    if (s.k === 'read') return { name: s.t, href: s.f, breathe: !!s.breathe };
    return tool(s.id, s.f);
  }
  function kindLabel(s) { return s.breathe ? 'Breathe' : s.k === 'tool' ? 'Tool' : s.k === 'wp' ? 'Workpaper' : 'Read'; }
  function mins(n) { return n <= 1 ? 'About 1 minute' : 'About ' + n + ' minutes'; }
  function whoLabel(j) { return j.who === 'solo' ? 'Just you' : 'Two of you (either can start alone)'; }
  // where you are: the first unticked step that isn't optional
  function nextStep(j, r) {
    var d = (r && r.d) || [];
    for (var i = 0; i < j.steps.length; i++) if (d.indexOf(i) < 0 && j.steps[i].k !== 'wp') return i;
    return -1;
  }
  function required(j) { return j.steps.filter(function (s) { return s.k !== 'wp'; }).length; }
  function doneCount(j, r) { var d = (r && r.d) || []; return j.steps.filter(function (s, i) { return s.k !== 'wp' && d.indexOf(i) >= 0; }).length; }
  function stepWord(j, r) {
    var n = nextStep(j, r), req = required(j);
    if (n < 0) return 'All steps done';
    var pos = j.steps.slice(0, n + 1).filter(function (s) { return s.k !== 'wp'; }).length;
    return 'Step ' + pos + ' of ' + req;
  }

  // the tools list loads once, for the names
  var regWait = [];
  function withRegistry(cb) {
    if (W.TOLToolById) { cb(); return; }
    regWait.push(cb);
    if (regWait.length > 1) return;
    var s = D.querySelector('script[src="/assets/js/tools-registry.js"]');
    function done() { var w = regWait; regWait = []; w.forEach(function (f) { try { f(); } catch (e) {} }); }
    if (s) { if (W.TOLToolById) done(); else { s.addEventListener('load', done); s.addEventListener('error', done); setTimeout(function () { if (regWait.length) done(); }, 4000); } return; }
    s = D.createElement('script'); s.src = '/assets/js/tools-registry.js';
    s.onload = done; s.onerror = done;
    D.head.appendChild(s);
  }

  // ---------------------------------------------------------------- the picker
  function mountPick(host) {
    var home = host.getAttribute('data-journey-pick') === 'home';
    var opts = host.querySelector('.wgo-opts');
    var out = host.querySelector('.wgo-out') || host.appendChild(mk('div', { cls: 'wgo-out' }));
    out.setAttribute('aria-live', 'polite');
    // the plain links become buttons that answer right here
    Array.prototype.forEach.call(host.querySelectorAll('a[data-wgo]'), function (a) {
      var b = mk('button', { type: 'button', cls: a.className || 'wgo-opt', 'data-wgo': a.getAttribute('data-wgo'), 'aria-pressed': 'false', 'aria-controls': out.id || null });
      while (a.firstChild) b.appendChild(a.firstChild);   // keeps a small "(retired, kids left…)" line as it is
      a.parentNode.replaceChild(b, a);
    });
    // "Which is closest?": a short list of pages instead of a journey (Our life has changed)
    function showChoose(p, focus) {
      out.textContent = '';
      var box = mk('div', { cls: 'wgo-res wgo-choose', tabindex: '-1' });
      box.appendChild(mk('p', { cls: 'wgo-res-k', text: 'Which is closest?' }));
      var ul = mk('ul', { cls: 'wgo-choose-l' });
      p.choose.forEach(function (c) { ul.appendChild(mk('li', null, [mk('a', { href: c[1] }, [mk('strong', { text: c[0] + ' →' })]), mk('span', { text: c[2] })])); });
      box.appendChild(ul);
      out.appendChild(box);
      out.hidden = false;
      if (focus) { try { box.focus({ preventScroll: true }); box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} }
    }
    function show(id, focus) {
      var p = pickFor(id);
      if (p && p.choose) {
        Array.prototype.forEach.call(host.querySelectorAll('[data-wgo]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-wgo') === id)); });
        showChoose(p, focus); return;
      }
      var j = p && byId(p.j); if (!j) return;
      Array.prototype.forEach.call(host.querySelectorAll('[data-wgo]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-wgo') === id)); });
      withRegistry(function () {
        out.textContent = '';
        var now = p.now.t ? { name: p.now.t, href: p.now.f } : tool(p.now.id, p.now.f);
        var jHref = '/journeys.html#' + j.id;
        var box = mk('div', { cls: 'wgo-res', tabindex: '-1' });
        box.appendChild(mk('p', { cls: 'wgo-res-k', text: 'Our suggestion for you' }));
        box.appendChild(mk('p', { cls: 'wgo-res-t' }, [mk('a', { href: jHref, 'data-open-journey': j.id, text: j.title })]));
        box.appendChild(mk('p', { cls: 'wgo-res-m', text: whoLabel(j) + ' · ' + required(j) + ' steps · ' + j.len }));
        if (p.why) box.appendChild(mk('p', { cls: 'wgo-res-n', text: p.why }));
        var nowP = mk('p', { cls: 'wgo-now' }, [mk('strong', { text: 'Right now, in 2 minutes: ' }), p.now.do + ' ']);
        nowP.appendChild(mk('a', { href: now.href, 'data-breathe': p.now.breathe ? 'calm breathing' : null, text: now.name ? now.name + ' →' : 'Open it →' }));
        box.appendChild(nowP);
        box.appendChild(mk('p', { cls: 'wgo-leave' }, [mk('strong', { text: 'You’ll leave with: ' }), j.leave + '.']));
        var go = mk('p', { cls: 'wgo-go' }, [mk('a', { cls: 'wgo-btn', href: jHref, 'data-open-journey': j.id, text: 'Start this journey' })]);
        box.appendChild(go);
        if (p.also) { var aj = byId(p.also[0]); if (aj) box.appendChild(mk('p', { cls: 'wgo-also' }, [p.also[1] + ' ', mk('a', { href: '/journeys.html#' + aj.id, 'data-open-journey': aj.id, text: aj.title + ' →' })])); }
        out.appendChild(box);
        out.hidden = false;
        if (focus) { try { box.focus({ preventScroll: true }); box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} }
      });
    }
    host.addEventListener('click', function (e) {
      var br = e.target.closest && e.target.closest('a[data-breathe]');
      if (br) { openBreathe(e); return; }
      var b = e.target.closest && e.target.closest('button[data-wgo]'); if (!b) return;
      show(b.getAttribute('data-wgo'), true);
    });
    // "With someone" / "Just me" changed: an open suggestion is redrawn for the new choice (or closes with its button)
    D.addEventListener('tol-mode', function () {
      var on = host.querySelector('button[data-wgo][aria-pressed="true"]'); if (!on || out.hidden) return;
      var li = on.closest('li');
      if (li && li.hidden) { out.hidden = true; on.setAttribute('aria-pressed', 'false'); return; }
      show(on.getAttribute('data-wgo'), false);
    });
    // arriving with ?for=<choice> (the no-JavaScript links, or a shared link): answer straight away
    if (!home) { var m = /[?&]for=([a-z-]+)/.exec(W.location.search || ''); if (m && pick(m[1])) show(m[1], false); }
  }

  // ---------------------------------------------------------------- the follow-up, when one is due
  function mountBack(host) {
    function draw() {
      var o = load(), t = today(), due = J.filter(function (j) { var r = o.j[j.id]; return r && r.b && r.b <= t; });
      host.textContent = '';
      host.hidden = !due.length;
      if (!due.length) return;
      withRegistry(function () {
        host.textContent = '';
        due.slice(0, 2).forEach(function (j) {
          var r = o.j[j.id], go = j.back.id ? tool(j.back.id, j.back.f) : { href: j.back.href };
          var card = mk('div', { cls: 'jb-card', role: 'group', 'aria-label': 'A look back: ' + j.title });
          card.appendChild(mk('p', { cls: 'jb-k', text: 'Since ' + niceDate(r.s || r.b) + ' · ' + j.title }));
          card.appendChild(mk('p', { cls: 'jb-q', text: j.back.q }));
          var row = mk('p', { cls: 'jb-row' });
          var a = mk('a', { cls: 'jb-go', href: go.href, 'data-jb': 'go', 'data-j': j.id, text: j.back.go + ' →' });
          var later = mk('button', { type: 'button', cls: 'jb-btn', 'data-jb': 'later', 'data-j': j.id, text: 'Ask me next week' });
          var x = mk('button', { type: 'button', cls: 'jb-btn jb-x', 'data-jb': 'dismiss', 'data-j': j.id, text: 'Dismiss' });
          row.appendChild(a); row.appendChild(later); row.appendChild(x);
          card.appendChild(row);
          host.appendChild(card);
        });
      });
    }
    host.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-jb]'); if (!b) return;
      var o = load(), id = b.getAttribute('data-j'), r = o.j[id]; if (!r) return;
      var k = b.getAttribute('data-jb');
      if (k === 'later') r.b = addDays(today(), 7); else delete r.b;
      save(o);
      if (k !== 'go') draw();
    });
    D.addEventListener('tol-journeys', draw);
    draw();
  }

  // ---------------------------------------------------------------- the journeys list
  function mountList(host) {
    function stepItem(j, s, i, r) {
      var L = stepLink(s), done = r.d.indexOf(i) >= 0, cid = 'js-' + j.id + '-' + i;
      var li = mk('li', { cls: 'js-step' + (done ? ' is-done' : '') + (s.k === 'wp' ? ' is-opt' : ''), 'data-i': i });
      var head = mk('p', { cls: 'js-head' }, [mk('span', { cls: 'js-kind js-kind-' + s.k, text: kindLabel(s) + (s.k === 'wp' ? ' · optional' : '') }), mk('span', { cls: 'js-mins', text: mins(s.mins) })]);
      li.appendChild(head);
      li.appendChild(mk('p', { cls: 'js-do', text: s.do }));
      li.appendChild(mk('p', { cls: 'js-leave' }, [mk('strong', { text: 'You’ll leave with: ' }), s.leave + '.']));
      var row = mk('p', { cls: 'js-row' });
      row.appendChild(mk('a', { cls: 'js-open', href: L.href, 'data-breathe': L.breathe ? 'calm breathing' : null, text: (L.name || 'Open it') + ' →' }));
      var lab = mk('label', { cls: 'js-tick', 'for': cid });
      var cb = mk('input', { type: 'checkbox', id: cid, 'data-j': j.id, 'data-i': i });
      cb.checked = done;
      lab.appendChild(cb); lab.appendChild(D.createTextNode(' Done'));
      row.appendChild(lab);
      li.appendChild(row);
      return li;
    }
    function journeyBody(j, o) {
      var r = o.j[j.id] || { d: [] };
      var body = D.createDocumentFragment();
      var prog = mk('div', { cls: 'jr-prog' });
      var n = doneCount(j, r), req = required(j);
      prog.appendChild(mk('p', { cls: 'jr-step', 'data-jr-step': j.id, text: stepWord(j, r) + (r.s ? ' · started ' + niceDate(r.s) : '') }));
      var bar = mk('span', { cls: 'jr-bar', role: 'progressbar', 'aria-label': 'Steps done', 'aria-valuemin': '0', 'aria-valuemax': String(req), 'aria-valuenow': String(n) });
      bar.appendChild(mk('span', { cls: 'jr-fill', style: 'width:' + Math.round(100 * n / req) + '%' }));
      prog.appendChild(bar);
      body.appendChild(prog);
      var ol = mk('ol', { cls: 'js-steps' });
      j.steps.forEach(function (s, i) { ol.appendChild(stepItem(j, s, i, r)); });
      body.appendChild(ol);
      if (j.heavy) body.appendChild(mk('p', { cls: 'jr-heavy' }, [mk('a', { href: HEAVY.href, text: HEAVY.text + ' →' })]));
      // come back
      var days = j.days || 7, cb = mk('div', { cls: 'jr-back' });
      if (r.b) {
        cb.appendChild(mk('p', { cls: 'jr-back-t' }, [mk('strong', { text: 'We’ll ask you on ' + niceDate(r.b) + ': ' }), j.back.q]));
        cb.appendChild(mk('p', { cls: 'jr-back-n', text: 'The question shows on the home page and here, on this device, the next time you visit after that date.' }));
        var row = mk('p', { cls: 'jr-back-row' });
        row.appendChild(mk('button', { type: 'button', cls: 'jr-btn', 'data-jr': 'remind', 'data-j': j.id, 'aria-expanded': 'false', text: 'Add a reminder to my calendar' }));
        row.appendChild(mk('button', { type: 'button', cls: 'jr-btn jr-quiet', 'data-jr': 'unback', 'data-j': j.id, text: 'Don’t ask me' }));
        cb.appendChild(row);
        cb.appendChild(mk('div', { cls: 'jr-remind', 'data-jr-remind': j.id, hidden: true }));
      } else {
        cb.appendChild(mk('p', { cls: 'jr-back-row' }, [mk('button', { type: 'button', cls: 'jr-btn', 'data-jr': 'back', 'data-j': j.id, text: days > 7 ? 'Come back in a month' : 'Come back in a week' })]));
        cb.appendChild(mk('p', { cls: 'jr-back-n', text: 'Next time you visit after that, we’ll ask: “' + j.back.q + '” Only the date is kept, on this device.' }));
      }
      body.appendChild(cb);
      if (r.s || r.d.length) body.appendChild(mk('p', { cls: 'jr-reset-row' }, [mk('button', { type: 'button', cls: 'jr-btn jr-quiet', 'data-jr': 'reset', 'data-j': j.id, text: 'Start this journey over' })]));
      return body;
    }
    function fill(det, o) {
      var j = byId(det.id.replace(/^j-/, '')) || byId(det.getAttribute('data-j'));
      var slot = det.querySelector('.jr-body'); if (!j || !slot) return;
      slot.textContent = '';
      slot.appendChild(journeyBody(j, o));
      var st = det.querySelector('.jr-sum-step'), r = o.j[j.id];
      if (st) st.textContent = r && (r.s || r.d.length) ? stepWord(j, r) : required(j) + ' steps';
    }
    function all() { var o = load(); Array.prototype.forEach.call(host.querySelectorAll('details.jr'), function (d) { fill(d, o); }); }
    function one(id) { var d = host.querySelector('details.jr[data-j="' + id + '"]'); if (d) fill(d, load()); }
    host.addEventListener('change', function (e) {
      var cb = e.target; if (!cb || cb.type !== 'checkbox' || !cb.hasAttribute('data-j')) return;
      var id = cb.getAttribute('data-j'), i = +cb.getAttribute('data-i'), o = load(), r = rec(o, id);
      if (cb.checked) { if (r.d.indexOf(i) < 0) r.d.push(i); if (!r.s) r.s = today(); }
      else r.d = r.d.filter(function (x) { return x !== i; });
      r.d.sort(function (a, b) { return a - b; });
      save(o);
      var li = cb.closest('li'); if (li) li.classList.toggle('is-done', cb.checked);
      // the line at the top and the summary update; the list itself stays (focus stays on the box)
      var j = byId(id), det = host.querySelector('details.jr[data-j="' + id + '"]'), rr = load().j[id] || { d: [] };
      var line = det && det.querySelector('[data-jr-step]'); if (line) line.textContent = stepWord(j, rr) + (rr.s ? ' · started ' + niceDate(rr.s) : '');
      var bar = det && det.querySelector('.jr-bar'), n = doneCount(j, rr);
      if (bar) { bar.setAttribute('aria-valuenow', String(n)); bar.firstChild.style.width = Math.round(100 * n / required(j)) + '%'; }
      var st = det && det.querySelector('.jr-sum-step'); if (st) st.textContent = rr.s || rr.d.length ? stepWord(j, rr) : required(j) + ' steps';
    });
    host.addEventListener('click', function (e) {
      var br = e.target.closest && e.target.closest('a[data-breathe]');
      if (br) { openBreathe(e); return; }
      var b = e.target.closest && e.target.closest('[data-jr]'); if (!b) return;
      var id = b.getAttribute('data-j'), k = b.getAttribute('data-jr'), j = byId(id); if (!j) return;
      if (k === 'remind') {
        var slot = host.querySelector('[data-jr-remind="' + id + '"]'), r0 = load().j[id];
        if (!slot || !r0 || !r0.b) return;
        var open = slot.hidden;
        slot.hidden = !open; b.setAttribute('aria-expanded', String(open));
        if (open && !slot.firstChild) {
          if (W.TOLRemind && W.TOLRemind.once) W.TOLRemind.once(slot, { date: r0.b, to: '/journeys.html#' + id, what: j.back.q });
          else slot.appendChild(mk('p', { text: 'Calendar reminders aren’t available here. The question will still show on this device.' }));
        }
        return;
      }
      var o = load(), r = rec(o, id);
      if (k === 'back') { r.b = addDays(today(), j.days || 7); if (!r.s) r.s = today(); }
      else if (k === 'unback') delete r.b;
      else if (k === 'reset') { if (!W.confirm || W.confirm('Start “' + j.title + '” over? Your ticks and dates for it are cleared. Nothing you made in the tools is touched.')) delete o.j[id]; else return; }
      save(o); one(id);
      var again = host.querySelector('details.jr[data-j="' + id + '"] [data-jr="' + (k === 'back' ? 'remind' : 'back') + '"]');
      if (again) try { again.focus(); } catch (er) {}
    });
    D.addEventListener('tol-journeys', function () { /* another part of the page changed the dates */ all(); });
    // open the journey named in the address, or by a "Start this journey" link
    function openFromHash() {
      var id = (W.location.hash || '').slice(1), d = id && host.querySelector('details.jr[data-j="' + id + '"]');
      if (d) { d.open = true; setTimeout(function () { try { d.scrollIntoView({ block: 'start' }); d.querySelector('summary').focus({ preventScroll: true }); } catch (e) {} }, 30); }
    }
    D.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[data-open-journey]'); if (!a) return;
      var d = host.querySelector('details.jr[data-j="' + a.getAttribute('data-open-journey') + '"]'); if (!d) return;
      d.open = true;
    });
    W.addEventListener('hashchange', openFromHash);
    withRegistry(function () { all(); openFromHash(); });
    all();
    // journeys already under way open by themselves
    var o = load();
    Object.keys(o.j).forEach(function (id) { var d = host.querySelector('details.jr[data-j="' + id + '"]'); if (d && (o.j[id].d.length || o.j[id].s)) d.open = true; });
  }

  function init() {
    Array.prototype.forEach.call(D.querySelectorAll('[data-journey-back]'), mountBack);
    Array.prototype.forEach.call(D.querySelectorAll('[data-journey-pick]'), mountPick);
    Array.prototype.forEach.call(D.querySelectorAll('[data-journeys]'), mountList);
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else init();
})(this);
