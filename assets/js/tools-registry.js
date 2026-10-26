/* tools-registry.js — one plain list of every tool, worksheet, quiz, calculator, generator and game on the site.
   The menu, /tools.html, /explore.html and the home page can all read it, so a tool is described the same way
   everywhere. Loading it does nothing on its own: it only sets window.TOLTools and window.TOLToolTypes.

   Each tool:
     id      short, stable name
     name    a short, warm name that still says what it is ("Chat analyzer", names12); benefit is the plain line under it
     brand   the tool's own name, kept as a small "also called" line ('' when it has none)
     href    where it opens (a #part when the tool sits inside a longer page)
     type    its main type (one of TOLToolTypes ids); also: other types it fits
     does    one line: what it does
     gets    what you get: the concrete thing you leave with
     mins    about how long, in minutes (for sorting and filters); time: the same in words
     who     'solo' (on your own), 'two' (with one other person), 'group' (three or more, a home or a team)
     benefit the line under the name: what you get from it, benefit first, under about 110 characters
     basis   what it is based on (BASIS below); window.TOLToolBasisHTML(t) says it as one line
     top     1–6 for the "Start here" strip on /tools.html: tools a person can use on their own (our picks), else 0
     kw      extra words people might search for
     modes   optional [[label, href], ...]: the ways in when one tool has more than one (tabs or parts of its page)
     outcomes, people, bestFor, useful, example, sample: added below from MORE (what it helps with, who it is for)
     kind    'tool' or 'workpaper' (added below; wp: a workpaper's short code). /tools.html shows tools only.
   Old ids of merged tools: window.TOLToolAliases (old id -> new id); window.TOLToolById(id) follows them, and for an old id
   that is now one mode of a place it returns the place pointed at that mode. window.TOLToolForPage(href): the place a page is in.
   consol12: 51 tools became 19 places; a place's modes are drawn as a switch on each of its pages (tools/places/build-places.js).
   Nothing here is stored or sent. */
(function () {
  'use strict';

  var TYPES = [
    { id: 'talk', slug: 'communication', name: 'Communication', blurb: 'Say it so it lands, read what they meant, and stay close.' },
    { id: 'self', slug: 'self-discovery', oldSlugs: ['know-yourself'], name: 'Self-discovery', blurb: 'Quizzes and checks for how you work. Nothing here needs anyone else.' },
    { id: 'load', slug: 'share-the-load', name: 'Share the load', blurb: 'See who does what at home, and give every job an owner.' },
    { id: 'calm', slug: 'calm-and-stress', name: 'Calm and stress', blurb: 'Settle your body first, in the moment or ahead of time.' },
    { id: 'family', slug: 'family-and-parenting', name: 'Family and parenting', blurb: 'Two homes, two traditions, grown-up children and family events.' },
    { id: 'work', slug: 'work-and-teams', name: 'Work and teams', blurb: 'Fair workloads and a short weekly round for a team or business.' },
    { id: 'health', slug: 'health-and-body', name: 'Health and body', blurb: 'Sleep, energy and how your body is doing today.' },
    { id: 'plan', slug: 'plan-together', name: 'Plan together', blurb: 'Agreements and plans you fill in once and both keep.' },
    { id: 'learn', slug: 'learn', name: 'Learn', blurb: 'Ask a question, practice on an example, or see an idea move.' },
    { id: 'play', slug: 'play', name: 'Play', blurb: 'Calm games with no timers and no way to lose.' }
  ];

  var T = [
    // ---------- Communication
    // the Text message checker and the Chat analyzer (the Conversation Reader) are one tool now: old id 'reader' -> 'signal'
    // consol12: "Help me write it" (Say no kindly, and Flip it's complaint into a request) is its fourth mode: 'refusals', 'flip' -> 'signal'
    // modes: [label, href, group, short label for the page's mode switch, icon] (tools/places/build-places.js draws the switch)
    { id: 'signal', name: 'Chat analyzer', brand: 'the Signal Translator', href: '/signal-translator.html', type: 'talk', also: ['work', 'family'],
      does: 'Paste a message you’re about to send, one you got, or a whole chat or screenshot. Or ask it to help you write one.',
      gets: 'A plain read of how it may land, where a chat turned, and calm words that keep your point.',
      mins: 2, time: 'About 2 minutes for a message, 5 for a conversation', who: ['solo'], benefit: 'See how a text will land, or read a whole chat clearly', top: 1,
      modes: [['A message I’m about to send', '/signal-translator.html'], ['A message I got', '/signal-translator.html?mode=got'], ['A whole chat or screenshot', '/signal-translator.html#conversation'], ['Help me write it', '/signal-translator.html#write']],
      kw: 'chat analyzer chat analyser text message checker tone checker message analyzer rewrite reply sms whatsapp email before i send conversation reader conversation analyzer thread fight over text group chat screenshot argument signal translator help me write it what to say say no kindly refuse decline boundary boundaries turn down script maker complaint request reframe flip it ask for a change chat analyzer the signal translator text message checker conversation reader' },
    { id: 'write', name: 'Write it through', brand: '', href: '/write-it-through.html', type: 'talk', also: [],
      does: 'Write about one topic, step by step: facts, not verdicts, one clear ask, and a short wait before you send.',
      gets: 'A calm message ready to send, with a reply-by time.',
      mins: 10, time: 'About 10 minutes', who: ['solo', 'two'], benefit: 'Sort out a big topic without a shouting match: one topic, in writing, at your own pace',
      kw: 'letter write it down written disagreement email message slow talk talk it through in writing' },
    { id: 'sayit', name: 'Before you reply: say it so it lands', brand: '', href: '/workpapers/wp-09-say-it-so-it-lands.html', type: 'talk', also: ['self'],
      does: 'A quick self-check before you answer something that stung.',
      gets: 'Your reply as a fact, a feeling and one kind ask.',
      mins: 5, time: 'About 5 minutes', who: ['solo'], benefit: 'Answer the point, not the sting',
      kw: 'tone filter reply calmly what to say feelings i statement' },
    { id: 'decoder', name: 'Rewind the talk', brand: 'the Carrier Wave Decoder, with See it from their side', href: '/carrier-wave-decoder.html', type: 'talk', also: ['calm', 'family'],
      modes: [['Step by step', '/carrier-wave-decoder.html'], ['See their side', '/carrier-wave-decoder.html?tab=their-side'], ['Rewind it together', '/carrier-wave-decoder.html#together']],
      does: 'Settle first, find where you went out of sync, look at their side, then shape one sentence to try again.',
      gets: 'Questions to ask instead of guessing, and one bridging sentence, checked before you use it.',
      mins: 15, time: 'About 15 minutes. Their side alone about 5', who: ['solo', 'two'], benefit: 'Turn a talk that went sideways into a better second try, with their side in view',
      kw: 'conversation went wrong out of sync misunderstanding argument repair reset their point of view perspective perspective shifter empathy other side why did they see it from their side after a talk went wrong: a step-by-step reset the carrier wave decoder see it from their side' },
    { id: 'checkin90', name: '90-second daily check-in', brand: '', href: '/workpapers/wp-13-daily-check-in.html', type: 'talk', also: ['plan', 'load'],
      does: 'One sentence each, once a day: how you are doing and what is coming up. No debating.',
      gets: 'A tiny daily habit, and a fill-in sheet to keep track if you like.',
      mins: 2, time: 'About 2 minutes a day', who: ['two', 'group'], benefit: 'Small things stay small',
      kw: 'daily check in check-in routine habit each day shift change' },
    { id: 'pace12', name: 'Same moment, different speeds', brand: 'WP-12', href: '/workpapers/wp-12-same-moment-different-speeds.html', type: 'talk', also: ['plan'],
      does: 'For five everyday moments, each person marks how fast they want to move, how much they want to talk, and how urgent it feels.',
      gets: 'Your gaps in plain words, and one small agreement for the biggest.', mins: 20, time: 'About 20 minutes, once', who: ['two', 'group'],
      benefit: 'A difference in pace stops looking like a difference in caring', kw: 'pace speed slow fast decide urgency processing time to think rush mismatch' },
    { id: 'static14', name: 'Is it us, or is it everything else?', brand: 'WP-14', href: '/workpapers/wp-14-is-it-us-or-everything-else.html', type: 'load', also: ['talk'],
      does: 'For one week, a line each evening: outside pressure in one column, tense moments between you in the other.',
      gets: 'What really started the friction, and one plan for the pressure.', mins: 15, time: 'A minute a day for a week, plus 15 minutes', who: ['two', 'group'],
      benefit: 'Outside strain stops getting blamed on the person next to you', kw: 'stress work money sleep illness pressure snapping arguing more spillover hard week' },
    { id: 'rituals15', name: 'Keep your little rituals alive', brand: 'WP-15', href: '/workpapers/wp-15-keep-your-little-rituals-alive.html', type: 'plan', also: ['talk'],
      does: 'Every few months, list the small habits you share and mark which are alive, fading or stopped.',
      gets: 'One ritual to restart in its smallest form, and maybe one to let go with thanks.', mins: 15, time: 'About 15 minutes, four times a year', who: ['two', 'group'],
      benefit: 'The small things that keep you close don’t quietly disappear', kw: 'rituals traditions habits routine date night walk drifted apart we used to closeness' },
    // consol12: the family plan card was always the same card's "Family" switch: 'familyplan' -> 'checkincard'
    { id: 'checkincard', name: 'Kitchen-table check-in', brand: '', href: '/check-ins.html#card', type: 'talk', also: ['plan', 'family'],
      modes: [['Weekly check-in', '/check-ins.html#card'], ['Family plan', '/check-ins.html?for=family#card']],
      does: 'Once a week, go around: what went well, what felt heavy, one small change. Or agree visits, advice and routines as a family.',
      gets: 'A check-in card to print, put on the fridge or send to each other’s phones.',
      mins: 15, time: 'About 15 minutes a week. The family plan about 10', who: ['two', 'group'], benefit: 'Raise small things before they grow: a short, kind weekly talk, or a family plan',
      kw: 'weekly check in house meeting family meeting talk once a week family plan card grandparents grown up children visits advice boundaries check-in card: weekly, or a family plan weekly check-in card family plan card' },
    // consol12: Stay close = the idea picker + the shared words list: 'touchstones' -> 'bonding'
    { id: 'bonding', name: 'Stay close', brand: 'the idea picker and touchstones', href: '/bonding.html#ideas', type: 'talk', also: ['family', 'play', 'plan'],
      modes: [['One small idea', '/bonding.html#ideas', '', '', '💡'], ['Our shared words and rituals', '/touchstones.html#ts-card-h', '', 'Shared words', '🪢']],
      does: 'Pick who it’s with, your time and your energy, for one small idea. Or list your inside jokes and little rituals.',
      gets: 'One doable idea at a time, or your list of shared words and one new one to try.',
      mins: 1, time: 'About a minute. The list about 5', who: ['solo', 'two'], benefit: 'Feel closer without a big plan: one small idea, or the words that say “this is us”',
      kw: 'bonding ideas closeness quality time things to do together date idea rituals inside jokes traditions shared language touchstones stay close: one small idea, or your shared words get one small bonding idea your shared words and rituals list touchstones' },

    // ---------- Know yourself
    // consol12: three short cards about you, to share: 'wiring', 'carecard' -> 'wavelength'
    { id: 'wavelength', name: 'How you connect', brand: 'Wavelength, the Wiring Card and the care card', href: '/wavelength.html', type: 'self', also: ['talk', 'work'],
      modes: [['The 2-minute style quiz', '/wavelength.html', '', 'Style quiz', '🌊'], ['How to talk to me: a card', '/wiring-card.html', '', 'How to talk to me', '🪪'], ['What feels like care: a card', '/love-languages.html#ll-card-h', '', 'What feels like care', '💛'], ['The logic behind a reaction', '/the-logic-behind-it.html', '', 'The logic behind it', '🧩']],
      does: 'Answer twelve quick either-or questions. Then, if you like, make a card on how to talk to you and one on what feels like care, or see the logic behind a reaction that gets misread.',
      gets: 'Your style in plain words, two cards to copy, print or share, and a side-by-side compare.',
      mins: 2, time: '2 to 10 minutes', who: ['solo', 'two'], benefit: 'Stop people guessing how to reach you: a 2-minute style quiz, plus two cards to share', top: 4,
      kw: 'communication quiz personality quiz wave code style test archetype compare wiring card neurodivergent adhd autistic how i communicate card love languages care card appreciation what i need know how you connect: a quiz and two cards communication style quiz wavelength the wiring card how i like to be spoken to what feels like care to me care card the logic behind it why did they react like that explain my reaction autistic logic they think im rude analogy small talk why people do that' },
    { id: 'roots', name: 'Old rules, new choices', brand: 'Roots & Wings', href: '/growing-up.html#roots-h', type: 'self', also: [],
      does: 'Tap through one trait or reaction, and where it may have started, in a few gentle steps.',
      gets: 'A fairer, grown-up reading of an old rule, and small ways to work with it now.',
      mins: 5, time: 'About 5 minutes', who: ['solo'], benefit: 'Choose which old rules to keep: look gently at where a reaction started',
      kw: 'childhood growing up why do i react old rules where a reaction comes from roots & wings' },
    { id: 'take-in', name: 'Read your way', brand: '', href: '/how-you-take-things-in.html', type: 'self', also: ['health'],
      does: 'Pick what fits: ADHD, autistic, dyslexic, or just what helps. Change it any time.',
      gets: 'A site that adapts on every page, set on this device only.',
      mins: 2, time: 'About 2 minutes', who: ['solo'], benefit: 'Make every page suit how your mind works: shorter steps, a calmer look, plainer words',
      kw: 'adhd autism dyslexia neurodivergent accessibility settings reading make the site fit your mind' },
    { id: 'rhythms', name: 'Rhythms side by side', brand: 'Frequency Calibration', href: '/tools/frequency-calibration.html', type: 'self', also: ['plan'],
      does: 'Each of you marks your natural pace for money, rest, decisions, check-ins and bouncing back.',
      gets: 'Where you’re out of step, and one small agreement for each.',
      mins: 15, time: 'About 15 minutes', who: ['two'], benefit: 'Stop different rhythms feeling like a fight: money, rest and decisions, side by side',
      kw: 'rhythm pace morning person night owl money style decisions compare your daily rhythms frequency calibration' },

    // ---------- Share the load
    // consol12: one place for who does what at home: 'lemon-full', 'snapshot' -> 'lemon-quick'
    { id: 'lemon-quick', name: 'Who does what?', brand: 'the Lemonade Stand', href: '/lemonade-stand.html#quick', type: 'load', also: ['family', 'plan'],
      modes: [['Quick look', '/lemonade-stand.html#quick', '', '', '🍋'], ['Count the hours and bills', '/lemonade-stand.html#stand', '', 'Hours and bills', '🧾'], ['Fridge list: who owns what', '/lemonade-stand.html#owners', '', 'Fridge list', '📌'], ['Not sure where to start? 2 minutes', '/snapshot/index.html', '', 'Where to start', '🧭']],
      does: 'Tap who mostly does each job at home, the thinking work too, then send it so others answer on their own.',
      gets: 'A plain picture of the split, where you agree, the hours and bills if you want them, and a fridge list.',
      mins: 2, time: '2 minutes for the quick look, 15 with hours and bills', who: ['solo', 'two', 'group'], benefit: 'Settle “who does more?” with facts, not blame: tap who does each job, then compare', top: 3,
      kw: 'chore split chores who does more housework fair split roommates housemates mental load quick look bills money budget hours chores calculator who pays what rent snapshot where to start lemonade stand fridge list who does what at home the lemonade stand who does what: chore split check chores and bills: count the hours and money 2-minute load snapshot' },
    { id: 'owner', name: 'One owner per job: a who-owns-what list', brand: '', href: '/workpapers/wp-03-one-owner-per-job.html', type: 'load', also: ['family', 'work', 'plan'],
      does: 'Give every regular job one owner, a backup and what “done” means.',
      gets: 'A fridge list to print, save or send. Others add their version and you combine them.',
      mins: 10, time: 'About 10 minutes', who: ['two', 'group'], benefit: 'Nobody has to keep asking',
      kw: 'chore chart rota roster who owns what fridge list house rules jobs list two homes' },
    { id: 'whodid', name: 'Who did what this week: a one-week log', brand: '', href: '/workpapers/wp-01.html', type: 'load', also: [],
      does: 'Log who did what at home for one week, the invisible jobs too.',
      gets: 'A week’s record to compare, plus three kind ways to say “not right now.”',
      mins: 5, time: 'A few minutes a day for a week', who: ['two', 'group'], benefit: 'Real numbers instead of memory',
      kw: 'chore log diary tracker week record' },
    // the WP-02 worksheet: its tool card went into My weather today ('load-check' -> 'weather'), but the worksheet
    // itself stays, so it is listed with the other workpapers
    { id: 'wp02', name: 'How much are you carrying? A quick stress check', brand: '', href: '/workpapers/wp-02-how-much-are-you-carrying.html', type: 'self', also: ['load'],
      does: 'Five quick questions that separate what you already carry from today’s upset.',
      gets: 'A stress tank score from 0 to 1, with what it means and one next step.',
      mins: 2, time: 'About 2 minutes', who: ['solo'], benefit: 'Know whether it’s this one thing, or everything at once',
      kw: 'stress check stress tank how much are you carrying load battery wp-02 workpaper' },
    { id: 'keepscoming', name: 'What keeps coming back? A monthly look-back', brand: '', href: '/workpapers/wp-04-what-keeps-coming-back.html', type: 'load', also: ['plan'],
      does: 'Once a month, look back at four weeks together.',
      gets: 'The jobs and arguments that keep returning, and one setup fix for each.',
      mins: 20, time: 'About 20 minutes a month', who: ['two', 'group'], benefit: 'Fix the setup, not the person',
      kw: 'monthly review same argument again recurring look back' },
    { id: 'chart', name: 'Printable chore chart', brand: '', href: '/chore-chart-for-couples.html', type: 'load', also: ['family'],
      does: 'A chart for every job, including the invisible ones, with one owner each.',
      gets: 'A chart to print and put on the fridge.',
      mins: 10, time: 'About 10 minutes', who: ['two', 'group'], benefit: 'Everyone can see who owns what',
      kw: 'chore chart printable pdf fridge rota' },
    // consol12: the two fair-split calculators (CALC-01) and the two 30-day look-backs (CALC-02): the same people, the same
    // numbers, this week or over a month. 'fair-quick', 'fair-full', 'lookback-quick', 'lookback-full' -> 'split'
    { id: 'split', name: 'Fair split check', brand: 'the fair-split calculator and the 30-Day Look-Back', href: '/workpapers/calculators/is-the-setup-working-quick.html', type: 'load', also: ['plan'],
      modes: [['A quick read of this week', '/workpapers/calculators/is-the-setup-working-quick.html', 'This week', 'Quick read'], ['Every number for this week', '/is-the-setup-working.html', 'This week', 'Every number'],
        ['A quick read over a month', '/workpapers/calculators/look-back-30-days-quick.html', 'Over a month', 'Quick read'], ['Every number over a month', '/look-back-30-days.html', 'Over a month', 'Every number']],
      does: 'Type in the totals from your worksheets, for 2 to 8 people: this week, or a month ago next to now.',
      gets: 'A plain-words read of the setup, never of a person, and one next step.',
      mins: 5, time: '5 minutes for a quick read, 15 to 20 for every number', who: ['two', 'group'], benefit: 'Know if your split can last, and whether what you changed is working, this week or over a month',
      kw: 'fair split calculator is it fair sustainable score calculator full detailed math hours 30 day month review look back progress rescues imbalance running imbalance trend four weeks calc-01 calc-02 check the split: this week or over a month fair split calculator look back over 30 days the 30-day look-back is the setup working?' },

    // ---------- Calm and stress
    // consol12: one calm place. 'upset', 'garden', 'music', 'drift', 'soften', 'pause' -> 'calm'. Each mode keeps its own page.
    // owner17: the calm tools are also gathered on one page, Relax and reset (/pause-and-play.html#relax), a mode here.
    { id: 'calm', name: 'Cool-down corner', brand: '', href: '/upset-right-now.html', type: 'calm', also: ['talk', 'health', 'play', 'family'],
      modes: [['Upset right now? A 5-minute calm-down', '/upset-right-now.html', 'Just me', 'Upset right now?', '🫧'], ['Breathing game', '/night-garden.html', 'Just me', '', '🌙'],
        ['Calm sounds and music', '/soundscapes.html', 'Just me', 'Sounds and music', '🎧'], ['Slow colours and tones', '/calm-visualizer.html', 'Just me', 'Slow colours', '🌀'],
        ['Relax and reset: every calm tool in one place', '/pause-and-play.html#relax', 'Just me', 'Relax and reset', '🌿'],
        ['Soften a tense moment', '/tools/soften-a-tense-moment.html', 'The two of us', '', '🤝'], ['Make a pause plan', '/pursue-withdraw.html#plan-h', 'The two of us', 'Pause plan', '⏸️']],
      does: 'Right now: a pause line and a one-minute breathing pacer, or a breathing game, sounds or slow colors. Together: a pause plan.',
      gets: 'A calmer body, words to come back to the talk with, and a pause plan for next time.',
      mins: 5, time: 'About 5 minutes. A pause plan about 10', who: ['solo', 'two'], benefit: 'Stop a fight getting worse: settle in five minutes now, or plan a kinder pause for next time', top: 6,
      kw: 'relax and reset relaxing tools relaxation calm tools breathing break wind down angry upset fight right now calm down breathe yelling breathing exercise breathe game night garden relax music instrumental brain breakers brown noise white noise hum sound toolkit calm-down sounds background sound visualizer binaural wind down drift tense mood bad mood soften defuse time out break pause word one wants to talk one needs space pursue withdraw stonewall argument calm down: right now, or before the next time upset right now? a 5-minute calm-down breathing game calm sounds and music soften a tense moment make a pause plan for arguments' },
    { id: 'calmkit', name: 'Calm-down plan', brand: 'the Calm-Down Kit', href: '/wp-11.html', type: 'calm', also: ['self', 'plan'],
      does: 'On a calm day, decide your early signs, a pause signal and what settles you.',
      gets: 'Your own plan for heated moments, to keep on your phone or print.',
      mins: 10, time: 'About 10 minutes', who: ['solo', 'two'], benefit: 'A plan ready before you need it',
      kw: 'calm down kit plan heated anger management settle' },

    // ---------- Family and parenting
    // consol12: one template picker for the plans you fill in once and both keep (each form stays inside its guide, with its
    // own share links). 'festival', 'terms', 'deal', 'room', 'ourweek', 'handoff' -> 'plans'
    { id: 'plans', name: 'Plan it once', brand: '', href: '/make-a-plan.html', type: 'plan', also: ['family', 'load'],
      modes: [['Our festival year', '/two-faiths.html#festival-year', '', 'Festival year', '🪔'], ['Set your terms for a family event', '/family-rifts.html#terms', '', 'Family event terms', '🕊️'],
        ['Time-together deal (games and phones)', '/gaming-and-time-together.html#deal-h', '', 'Time-together deal', '🎮'], ['Room agreement for roommates', '/sharing-a-room.html#agreement-h', '', 'Room agreement', '🛏️'],
        ['Our week on one page (different hours)', '/different-hours.html#our-week', '', 'Our week', '🗓️'], ['Handoff-bag checklist for two homes', '/co-parenting.html#handoff-bag', '', 'Handoff bag', '🎒']],
      does: 'Pick a template, fill it in alone or together, and send it back and forth as a link if you like.',
      gets: 'An agreement or plan to copy, print or send, that either of you can change.',
      mins: 10, time: 'About 10 minutes', who: ['solo', 'two'], benefit: 'Settle it once, kindly, and both keep it: holidays, family days, screen time, rooms, shifts',
      kw: 'plan agreement template holidays interfaith christmas eid diwali hanukkah festivals in-laws family rift estranged wedding funeral event gaming phone screen time deal roommate dorm flatmate quiet hours guests shift work night shift schedule rota different hours co-parent handover bag checklist two homes make a plan together' },

    // ---------- Work and teams
    // consol12: 'team-owner', 'team-checkin' -> 'team' (both on /work.html; the check-in reads the list's names)
    { id: 'team', name: 'Team job list', brand: '', href: '/work.html#team-tools', type: 'work', also: ['load', 'talk'],
      modes: [['Owners and backups', '/work.html#owner-list', '', 'Job list', '📋'], ['The 10-minute weekly round', '/work.html#check-in', '', 'Weekly round', '🔄']],
      does: 'List the jobs that keep coming round, each with an owner and a backup. Then, once a week, go around once.',
      gets: 'A team list and a weekly round to print or share as one link, with a tally of who owns what.',
      mins: 15, time: 'About 15 minutes. The check-in 10 a week', who: ['group'], benefit: 'No job lands on whoever notices first: owners, backups and a 10-minute weekly round',
      kw: 'team workload business partner co-founder raci responsibilities team meeting standup weekly workload owner backup team tools: a job list and a weekly check-in team job list: one owner and a backup 10-minute team check-in' },

    // ---------- Health and body
    { id: 'feelings', name: 'What am I feeling?', brand: '', href: '/what-am-i-feeling.html', type: 'self', also: ['calm'],
      does: 'Gentle questions that help you notice what you might not have considered yet behind a feeling.',
      gets: 'A map you can correct, a picture made from your answers, and one or two first steps.',
      mins: 5, time: 'About 3 to 8 minutes', who: ['solo'], benefit: 'Find what may be behind a feeling, on your own device',
      kw: 'feelings emotions why do i feel this way map picture overwhelmed irritable low mood what am i feeling' },
    { id: 'weather', name: 'My weather today', brand: 'Today’s Weather and the Nervous System Ladder', href: '/quick-checks.html#today', type: 'health', also: ['self', 'calm'],
      modes: [['Quick: 4 taps', '/ladder.html'], ['Full forecast', '/quick-checks.html#today']],
      does: 'Tap four quick questions, or take a minute on your mood, sleep, body and what’s coming up.',
      gets: 'Calm, revved up or running on empty, with what helps right now, and a private log if you want one.',
      mins: 1, time: '20 seconds to a minute', who: ['solo'], benefit: 'Know if now is a good time to talk: four taps, or one minute on mood, sleep and energy', top: 5,
      kw: 'mood tracker mood check in energy sleep daily check today weather almanac nervous system ladder where am i right now state stressed shut down overwhelmed stress check battery burnout load how full load check how am i right now? a mood and energy check todays weather the nervous system ladder where am i right now?' },

    // ---------- Plan together
    { id: 'suite', name: 'Your worksheets, in order, with a report', brand: 'the Workpaper Suite, and the package and report', href: '/workpapers/fill/suite.html', type: 'plan', also: ['load', 'self'],
      modes: [['One at a time', '/workpapers/fill/suite.html'], ['One PDF of everything', '/workpapers/fill/suite.html#full-path']],
      does: 'Choose your road (just me, a couple, a home, a family, a team). Fill its worksheets one at a time, or all of them in one PDF.',
      gets: 'Your filled-in sheets, and a report written from your answers: findings, things worth a second look, and a plan.',
      mins: 45, time: 'About 45 minutes, in parts', who: ['solo', 'two', 'group'], benefit: 'Everything in one place, in the right order',
      kw: 'workpapers worksheets pdf fill in suite full path package report' },
    { id: 'sixweeks', name: 'Six gentle weeks', brand: '', href: '/prog-01.html', type: 'plan', also: ['load'],
      does: 'One small step a week, in order, alone or with anyone you share a home with. Start with a five-minute week 0, and add a reminder for each week to your own calendar.',
      gets: 'A before-and-after look at the end. Missing a week is fine.',
      mins: 30, time: 'About 30 minutes a week', who: ['solo', 'two', 'group'], benefit: 'A guided start, one week at a time',
      kw: 'program course six weeks guided plan week 0 calendar reminder ics start' },
    { id: 'progress', name: 'Your progress, week by week', brand: '', href: '/workpapers/report-01.html', type: 'plan', also: [],
      does: 'Type in what your worksheets produced each week.',
      gets: 'A report that reads them side by side: where they agree, and where they don’t.',
      mins: 10, time: 'About 10 minutes', who: ['solo', 'two', 'group'], benefit: 'See progress build instead of starting over',
      kw: 'report progress tracker weekly' },

    // ---------- Learn
    { id: 'ask', name: 'Ask Professor Puddles', brand: '', href: '/ask.html', type: 'learn', also: ['talk'],
      does: 'Type what’s going on in your own words, the way you’d say it to a friend.',
      gets: 'Kind next steps, words you could use, and the right pages, made only from this site.',
      mins: 2, time: 'About 2 minutes', who: ['solo'], benefit: 'Get kind next steps for your exact situation: type it the way you’d tell a friend', top: 2,
      kw: 'chat ask question help puddles assistant ask a question in your own words' },
    { id: 'start10', name: 'Ten-minute start', brand: '', href: '/start-in-10-minutes.html', type: 'learn', also: ['self'],
      does: 'Four small steps, alone or with someone: your weather, one short read, one pattern, one thing to try.',
      gets: 'A short “here’s what I got” summary to keep or screenshot.',
      mins: 10, time: 'About 10 minutes', who: ['solo', 'two'], benefit: 'The quickest way in: four small steps, and a “here’s what I got” to keep',
      kw: 'start beginner first time new here quick start start in 10 minutes' },
    // consol12: 'playground', 'quest', 'sync', 'connect' -> 'explore'
    { id: 'explore', name: 'Learn by doing', brand: 'the Workpaper Playground, the quest map and more', href: '/do/index.html', type: 'learn', also: ['load', 'play'],
      modes: [['Practise the worksheets on an example', '/do/index.html', '', 'Practise on an example', '🧪'], ['Your learning map', '/quest.html', '', 'Learning map', '🗺️'],
        ['Watch two rhythms fall into step', '/tools/frequency-sync-visualizer.html', '', 'Two rhythms in step', '〰️'], ['Connect two fields of study', '/polymath.html#connect', '', 'Connect two fields', '🔗']],
      does: 'Try the core worksheets on a made-up household, see your learning map fill in, or watch two rhythms fall into step.',
      gets: 'A feel for how it all works before you use your own week. Nothing to sign up for, and no streaks.',
      mins: 5, time: 'A few minutes each', who: ['solo'], benefit: 'Get a feel for it all first: practice on a made-up home, and watch ideas move',
      kw: 'example practice demo playground quest map progress learning visualizer waves rhythm sync animation polymath fields connections learn and explore the workpaper playground the quest map' },

    // ---------- Play
    // consol12: every game is a mode of the games place, not a card of its own:
    // 'arcade', 'wordbloom', 'quietwords', 'crosswords', 'drive', 'dojo', 'mvmaker' -> 'pauseplay'
    { id: 'pauseplay', name: 'Gentle games', brand: 'Pause & Play', href: '/pause-and-play.html', type: 'play', also: ['calm'],
      modes: [['All the games', '/pause-and-play.html', '', 'All games', '✨'], ['Six gentle arcade games, with a Home Run Derby', '/frequency-journey.html', '', 'Arcade', '🎵'], ['Word Bloom', '/word-bloom.html', '', 'Bloom', '🌼'],
        ['Quiet Words', '/quiet-words.html', '', 'Words', '🔍'], ['Crosswords: gentle levels', '/quiet-crossword.html', '', 'Crossword', '✏️'], ['Crosswords: newspaper daily', '/daily-ledger-crossword.html', '', 'Newspaper', '📰'],
        ['The Re-check Drive', '/recheck-drive.html', '', 'Re-check Drive', '🏈'], ['The Bears Dojo', '/bears-dojo.html', '', 'Bears Dojo', '🐻'], ['Kindness Coin Pusher', '/coin-pusher.html', '', 'Coin Pusher', '🪙'], ['Make a cartoon music video', '/frequency-buddies-music-video-maker.html', '', 'Music video', '🎬']],
      does: 'Pick a game, or press “Pick one for me,” and play as long as you like.',
      gets: 'A gentle break whenever you want one, with no timers and no way to lose.',
      mins: 5, time: 'Any length', who: ['solo', 'two'], benefit: 'Take a breather before you talk: arcade, word games and crosswords, with no way to lose',
      kw: 'games calm games play surprise me random pick one for me arcade pac maze frogger breakout baseball home run derby batting kids word game anagram spelling word bloom word search quiet words crossword mini puzzle daily newspaper easy crossword daily ledger football complacency kindness re-check drive bears garden build a bear dojo coin pusher coins arcade machine tips collect characters music video maker cartoon create games: every calm game in one place pause & play' },
  ];

  // ---------- What each tool helps with, and who it is for (used by /tools.html's filters and cards; tools11)
  //   o      outcomes: calm (Calm down) · talk (Talk better) · self (Self-discovery) · other (Understand someone)
  //          · load (Share the load fairly) · plan (Plan together) · learn (Learn) · fun (Have fun)
  //   p      who it is for besides yourself, the main one first: partner · family (family and kids) · housemates · work · friends
  //          ('me', on your own, comes from who: ['solo'])
  //   best   "Best for: …" in a few words
  //   ex     a filled-in example from the book (tools/book/examples/<ex>.html); sample: a two-line made-up result instead
  // A tool with no line here still works: the page falls back to its type.
  // ---------- How useful each tool is likely to be (1–10), for "Most useful first" on /tools.html.
  // Our judgement from everything the program covers: how many people face the need, how fast the tool helps,
  // whether one person can use it alone, and how often people are likely to look for it. Never shown on the page.
  var USEFUL = {
    signal: 10, ask: 10, 'lemon-quick': 9, calm: 9, weather: 8, wavelength: 8,
    write: 7, decoder: 7, checkincard: 7, bonding: 7, split: 7, start10: 7,
    roots: 6, 'take-in': 6, plans: 6,
    rhythms: 5, team: 5, pauseplay: 5,
    explore: 4
  };
  var MORE = {
    signal: { o: 'talk other', p: 'partner family friends work housemates', best: 'a text you’re unsure how to send, one that stung, or a text argument you keep rereading', ex: 'ex-signal-zoe' },
    write: { o: 'talk', p: 'partner family friends', best: 'a big topic that goes wrong every time you say it out loud', ex: 'ex-write-carys-owen' },
    sayit: { o: 'talk calm', p: 'partner family friends work', best: 'the moment before you answer something that stung', ex: 'ex-wp09-carla' },
    decoder: { o: 'talk other calm', p: 'partner family friends', best: 'the day after a talk went sideways', ex: 'ex-perspective-hana' },
    checkin90: { o: 'talk plan', p: 'partner family housemates', best: 'busy weeks when you barely cross paths', ex: 'ex-wp13-priya-dev' },
    pace12: { o: 'other plan', p: 'partner housemates family', best: 'when one of you decides fast and the other needs time',
      sample: 'Biggest gap: weekend plans (one wants to settle it tonight, one wants a day to think). Agreement: “We decide by Thursday lunch.”' },
    static14: { o: 'other load', p: 'partner family housemates', best: 'a hard stretch when you keep snapping at each other',
      sample: 'The week’s pattern: four of five tense evenings came after a late work call. The plan: work phone off at 8.' },
    rituals15: { o: 'plan fun', p: 'partner family friends work', best: 'feeling like you’ve drifted into roommates', ex: 'ex-b3-rituals-team' },
    checkincard: { o: 'talk plan', p: 'partner family housemates', best: 'small things that pile up, or kind limits with parents or grown children', ex: 'ex-checkin-linda-jordan' },
    bonding: { o: 'fun plan', p: 'partner family friends', best: 'wanting closeness with no energy for a big plan',
      sample: 'With a partner, 10 minutes, low energy: “Lie down and swap one high and one low from today.”' },
    wavelength: { o: 'self other talk', p: 'partner friends family work housemates', best: 'missing each other, or wanting people to know how to reach you', ex: 'ex-wavelength-mo' },
    roots: { o: 'self', p: '', best: 'a reaction that feels bigger than the moment',
      sample: 'Trait: “I go quiet when someone raises their voice.” A grown-up reading: it kept me safe once. Now I can say “give me ten minutes.”' },
    'take-in': { o: 'self learn', p: '', best: 'pages that feel like too much to read',
      sample: 'Picked: ADHD. Pages now show shorter steps, one thing at a time, with plainer words on.' },
    rhythms: { o: 'other plan', p: 'partner housemates', best: 'a morning person and a night owl, or a saver and a spender, under one roof',
      sample: 'Money: one plans ahead, one spends as it comes. Agreement: a 10-minute money check every other Sunday.' },
    'lemon-quick': { o: 'load other plan', p: 'partner housemates family', best: 'the “who does more?” argument', ex: 'ex-lemonade-housemates' },
    owner: { o: 'load plan', p: 'housemates partner family', best: 'jobs that only get done when someone nags', ex: 'ex-wp03-coparents' },
    whodid: { o: 'load', p: 'partner housemates family', best: 'swapping “I do everything” for a real week', ex: 'ex-wp01-marcus-theo' },
    keepscoming: { o: 'load plan', p: 'housemates partner family', best: 'the same argument coming back every month', ex: 'ex-wp04-triad' },
    chart: { o: 'load plan', p: 'partner housemates family', best: 'a chart everyone can see on the fridge',
      sample: 'Trash: Sam, backup Jo. Done means: out by 7 on Tuesday night.' },
    calmkit: { o: 'calm self plan', p: 'partner', best: 'knowing your early signs before the next heated moment', ex: 'ex-wp11-nell' },
    weather: { o: 'self calm', p: '', best: 'deciding whether now is a good time to talk', ex: 'ex-weather-joel' },
    suite: { o: 'plan load learn', p: 'partner family housemates work', best: 'doing the whole program properly, in order' },
    sixweeks: { o: 'plan learn', p: 'partner family housemates', best: 'a guided start, one small step a week' },
    progress: { o: 'plan', p: 'partner family housemates', best: 'seeing whether things are actually getting better' },
    ask: { o: 'learn talk self other', p: 'partner family friends work housemates', best: 'a situation that doesn’t fit a box',
      sample: 'You type: “my partner never helps with bedtime.” You get: kind next steps, words you could use, and two pages to read.' },
    start10: { o: 'learn self', p: 'partner', best: 'your first visit, with ten minutes to spare',
      sample: '“Here’s what I got: my weather is gusty. My pattern: I go quiet when tired. One thing to try: say ‘I need ten minutes.’”' },
    pauseplay: { o: 'fun calm', p: 'family partner', best: 'a gentle break before you talk, or playing with kids with no way to lose',
      sample: 'Five minutes of Word Bloom before a hard talk: a few words found, a slower breath, nothing to win or lose.' },
    split: { o: 'load plan', p: 'partner housemates family', best: 'checking whether your split can last, and whether last month’s changes stuck', ex: 'ex-setup-rosemary-ken' },
    calm: { o: 'calm talk', p: 'partner family', best: 'a fight that’s getting worse, now or next time',
      sample: 'Pause line: “I’m getting too heated. I’m taking 20 minutes and I’ll come back at 8:15.”' },
    plans: { o: 'plan', p: 'partner family housemates', best: 'settling one thing once, kindly: holidays, a family event, gaming time, a shared room, shifts or a handover bag',
      sample: 'Room agreement: quiet after 11 on weeknights. Guests: a heads-up by the afternoon. Borrowing: ask first, every time.' },
    team: { o: 'load talk plan', p: 'work', best: 'a team or small business where jobs land on whoever notices first',
      sample: 'Payroll: Ade, backup Ben, monthly. Check-in: Ben’s week 80% full. Slipped: the website update, new owner Ade.' },
    explore: { o: 'learn fun', p: '', best: 'trying the worksheets before using your own week, and seeing how far you’ve come',
      sample: 'A practice run on a made-up home: the worksheet shows most of the planning sits with one person, and suggests one shared list.' }
  };
  // ---------- names12: what each place is based on, said honestly (the card's and the "About this tool" panel's "Based on" line)
  //   ['research', about, ref]  Built on research                        -> /research.html#ref-<ref>
  //   ['own', about, ref]       Our own approach, built on research about <about> (linked to the ref)
  //   ['idea']                  Our own idea, still being tried out
  // Every format, wording and score here is this site's own and hasn't been tested as a tool, so no place says more than
  // "own" today. The refs are on /research.html; each place's guide entry (tool-guide-data.js) lists the rest.
  var BASIS = {
    signal: ['own', 'how tone gets lost in text', 'kruger-epley-2005-email'],
    write: ['own', 'writing things down, and a little distance before you reply', 'frattaroli-2006'],
    decoder: ['own', 'asking, not guessing, what the other person thinks', 'eyal-steffel-epley-2018'],
    checkincard: ['own', 'regular, structured talks between partners', 'markman-stanley-blumberg-1994'],
    bonding: ['own', 'how small shared moments build closeness', 'aron-1997-closeness'],
    wavelength: ['own', 'how even close people misread each other', 'savitsky-2011-closeness-communication'],
    roots: ['own', 'how people can shift a habit with small, concrete plans', 'hudson-fraley-2015'],
    'take-in': ['idea', '', ''],
    rhythms: ['own', 'how different money habits play out between partners', 'rick-small-finkel-2011'],
    weather: ['own', 'how naming a feeling can calm it a little', 'lieberman-2007'],
    'lemon-quick': ['own', 'how each of us remembers more of our own share', 'ross-sicoly-1979'],
    split: ['own', 'how uneven give-and-take turns into strain', 'adams-1965'],
    calm: ['own', 'calming the body, not venting', 'kjaervik-bushman-2024'],
    plans: ['own', 'making specific plans, with everyone having a say', 'gollwitzer-sheeran-2006'],
    team: ['own', 'how clear roles cut stress at work', 'rizzo-house-lirtzman-1970'],
    ask: ['idea', '', ''],
    start10: ['idea', '', ''],
    explore: ['idea', '', ''],
    pauseplay: ['idea', '', '']
  };
  // ---------- Tools and workpapers are kept apart (owner: "Keep work papers and tools separate").
  // Every entry gets kind: 'tool' or 'workpaper'. A workpaper is one of the numbered fill-in worksheets (WP-01 to WP-15),
  // the printable chore chart, the suite that runs them in order, the six-week program and the progress report. The same
  // split as the menu's Workpapers group (menu11): the calculators (CALC-01, CALC-02) and the Workpaper Playground stay tools.
  // /tools.html lists tools only and links the workpapers in their own section. wp: the short code shown next to a workpaper.
  var WORKPAPERS = { whodid: 'WP-01', wp02: 'WP-02', owner: 'WP-03', keepscoming: 'WP-04', sayit: 'WP-09', calmkit: 'WP-11', pace12: 'WP-12',
    checkin90: 'WP-13', static14: 'WP-14', rituals15: 'WP-15', chart: 'Chart', suite: 'Suite', sixweeks: 'PROG-01', progress: 'REPORT-01' };
  T.forEach(function (t) {
    if (!t.kind) t.kind = WORKPAPERS[t.id] || (/^\/(workpapers\/|wp-\d)/.test(t.href) && !/^\/workpapers\/calculators\//.test(t.href)) ? 'workpaper' : 'tool';
    if (t.kind === 'workpaper' && !t.wp) t.wp = WORKPAPERS[t.id] || '';
  });
  var TYPE_OUT = { talk: 'talk', self: 'self', load: 'load', calm: 'calm', family: 'plan', work: 'load', health: 'self calm', plan: 'plan', learn: 'learn', play: 'fun' };
  T.forEach(function (t) {
    var x = MORE[t.id] || {}, p = (x.p != null ? x.p : (t.who.indexOf('two') !== -1 ? 'partner' : '') + (t.who.indexOf('group') !== -1 ? ' family roommates work' : '')).split(/\s+/).filter(Boolean);
    t.outcomes = (x.o || TYPE_OUT[t.type] || '').split(/\s+/).filter(Boolean);
    t.people = (t.who.indexOf('solo') !== -1 ? ['me'] : []).concat(p);
    if (t.bestFor == null) t.bestFor = x.best || '';
    t.useful = USEFUL[t.id] || 3;
    if (x.ex) t.example = x.ex;
    if (x.sample) t.sample = x.sample;
    if (BASIS[t.id]) t.basis = BASIS[t.id];
  });

  // Tools that were merged keep their old ids: each old id points at the tool it now lives in, so a link,
  // a guide panel or a saved reference that names the old id still finds the right card.
  var ALIASES = {
    sounds: 'music',            // Calm-down sounds -> Calm sounds and music (/soundscapes.html#background)
    package: 'suite',           // the package and report -> Your worksheets, in order, with a report (#full-path)
    week0: 'sixweeks',          // Week 0 -> Six gentle weeks (its calendar reminders are on /prog-01.html#calendar)
    minicross: 'crosswords',    // Quiet Crossword -> Crosswords, "Gentle levels"
    dailycross: 'crosswords',   // the Daily Ledger Crossword -> Crosswords, "Newspaper daily"
    surprise: 'pauseplay',      // Surprise me is a site-wide button now; the games hub has "Pick one for me"
    ladder: 'weather',          // Where am I right now? -> How am I right now?, "Quick: 4 taps" (/ladder.html, #rung= links)
    'load-check': 'weather',    // the load check's card -> the pressure step (the WP-02 worksheet page itself stays)
    perspective: 'decoder',     // See it from their side -> After a talk went wrong, "Their side" (?tab=their-side)
    reader: 'signal',           // the Conversation Reader -> the Chat analyzer, "A whole conversation or screenshot" (#conversation)
    // consol12: 51 tools -> 19 places. Each old id below is now one mode of a place.
    refusals: 'signal', flip: 'signal',
    familyplan: 'checkincard',
    touchstones: 'bonding',
    wiring: 'wavelength', carecard: 'wavelength', logic: 'wavelength',
    'lemon-full': 'lemon-quick', snapshot: 'lemon-quick',
    'fair-quick': 'split', 'fair-full': 'split', 'lookback-quick': 'split', 'lookback-full': 'split',
    upset: 'calm', garden: 'calm', music: 'calm', drift: 'calm', soften: 'calm', pause: 'calm',
    festival: 'plans', terms: 'plans', deal: 'plans', room: 'plans', ourweek: 'plans', handoff: 'plans',
    'team-owner': 'team', 'team-checkin': 'team',
    playground: 'explore', quest: 'explore', sync: 'explore', connect: 'explore',
    crosswords: 'pauseplay', arcade: 'pauseplay', wordbloom: 'pauseplay', quietwords: 'pauseplay', drive: 'pauseplay', dojo: 'pauseplay', mvmaker: 'pauseplay'
  };
  // the mode an old id became (its href in the place's modes), so TOLToolById can point straight at it
  var ALIAS_MODE = {
    ladder: '/ladder.html', perspective: '/carrier-wave-decoder.html?tab=their-side',
    refusals: '/signal-translator.html#write', flip: '/signal-translator.html#write', reader: '/signal-translator.html#conversation',
    familyplan: '/check-ins.html?for=family#card', touchstones: '/touchstones.html#ts-card-h',
    wiring: '/wiring-card.html', carecard: '/love-languages.html#ll-card-h', logic: '/the-logic-behind-it.html',
    'lemon-full': '/lemonade-stand.html#stand', snapshot: '/snapshot/index.html',
    'fair-quick': '/workpapers/calculators/is-the-setup-working-quick.html', 'fair-full': '/is-the-setup-working.html',
    'lookback-quick': '/workpapers/calculators/look-back-30-days-quick.html', 'lookback-full': '/look-back-30-days.html',
    upset: '/upset-right-now.html', garden: '/night-garden.html', music: '/soundscapes.html', sounds: '/soundscapes.html', drift: '/calm-visualizer.html',
    soften: '/tools/soften-a-tense-moment.html', pause: '/pursue-withdraw.html#plan-h',
    festival: '/two-faiths.html#festival-year', terms: '/family-rifts.html#terms', deal: '/gaming-and-time-together.html#deal-h',
    room: '/sharing-a-room.html#agreement-h', ourweek: '/different-hours.html#our-week', handoff: '/co-parenting.html#handoff-bag',
    'team-owner': '/work.html#owner-list', 'team-checkin': '/work.html#check-in',
    playground: '/do/index.html', quest: '/quest.html', sync: '/tools/frequency-sync-visualizer.html', connect: '/polymath.html#connect',
    arcade: '/frequency-journey.html', wordbloom: '/word-bloom.html', quietwords: '/quiet-words.html', crosswords: '/quiet-crossword.html',
    minicross: '/quiet-crossword.html', dailycross: '/daily-ledger-crossword.html', drive: '/recheck-drive.html', dojo: '/bears-dojo.html',
    mvmaker: '/frequency-buddies-music-video-maker.html'
  };
  // sounds and the crosswords pointed at tools that are modes themselves now
  ALIASES.sounds = 'calm'; ALIASES.minicross = 'pauseplay'; ALIASES.dailycross = 'pauseplay';
  var A = window.TOLToolAliases || {};
  Object.keys(ALIASES).forEach(function (k) { A[k] = ALIASES[k]; });

  window.TOLToolTypes = TYPES;
  window.TOLTools = T;
  window.TOLToolAliases = A;
  window.TOLToolAliasMode = ALIAS_MODE;
  // the tool for an id, following old (merged) ids to the tool that replaced them. An old id that became one mode of a
  // place gets a copy of the place pointed at that mode: href = the mode, name = "Place · mode", mode = the mode's label,
  // place = the place's id. So a list or a guide panel that names an old id still opens the right part.
  window.TOLToolById = function (id) {
    var old = id, hit = null;
    for (var n = 0; n < 5 && A[id]; n++) id = A[id];
    for (var i = 0; i < T.length; i++) if (T[i].id === id) { hit = T[i]; break; }
    if (!hit || old === id || !ALIAS_MODE[old]) return hit;
    var m = null;
    (hit.modes || []).forEach(function (x) { if (!m && x[1] === ALIAS_MODE[old]) m = x; });
    if (!m) return hit;
    var v = {};
    for (var k in hit) if (Object.prototype.hasOwnProperty.call(hit, k)) v[k] = hit[k];
    v.href = m[1]; v.mode = m[0]; v.place = hit.id; v.name = hit.name.split(':')[0] + ' · ' + m[0];
    return v;
  };
  // names12: the "Based on" line for a tool, as HTML: "Built on research", "Our own approach, built on research about …"
  // (linked to /research.html) or "Our own idea, still being tried out". '' when the tool has none.
  window.TOLToolBasisHTML = function (t) {
    var b = t && t.basis; if (!b) return '';
    var e = function (x) { return String(x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var link = function (txt) { return b[2] ? '<a href="/research.html#ref-' + e(b[2]) + '">' + e(txt) + '</a>' : e(txt); };
    if (b[0] === 'research') return link('Built on research') + (b[1] ? ' about ' + e(b[1]) : '');
    if (b[0] === 'own') return 'Our own approach, built on research about ' + link(b[1]);
    return 'Our own idea, still being tried out';
  };
  // the place a page belongs to, and which of its modes it is (path, or path + #part): { tool, mode } or null
  window.TOLToolForPage = function (href) {
    var u = String(href || ''), p = u.split(/[?#]/)[0], best = null;
    T.forEach(function (t) {
      (t.modes || []).forEach(function (m) {
        if (best && best.exact) return;
        if (m[1] === u) best = { tool: t, mode: m, exact: true };
        else if (!best && m[1].split(/[?#]/)[0] === p) best = { tool: t, mode: m };
      });
      if (!best && t.href.split(/[?#]/)[0] === p) best = { tool: t, mode: null };
    });
    return best;
  };
})();
