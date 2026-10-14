/* tools-registry.js — one plain list of every tool, worksheet, quiz, calculator, generator and game on the site.
   The menu, /tools.html, /explore.html and the home page can all read it, so a tool is described the same way
   everywhere. Loading it does nothing on its own: it only sets window.TOLTools and window.TOLToolTypes.

   Each tool:
     id      short, stable name
     name    the plain name: says what it does ("Chat analyzer")
     brand   the tool's own name, kept as a small "also called" line ('' when it has none)
     href    where it opens (a #part when the tool sits inside a longer page)
     type    its main type (one of TOLToolTypes ids); also: other types it fits
     does    one line: what it does
     gets    what you get: the concrete thing you leave with
     mins    about how long, in minutes (for sorting and filters); time: the same in words
     who     'solo' (on your own), 'two' (with one other person), 'group' (three or more, a home or a team)
     benefit the main reason to use it, in a few words
     top     1–6 for the "Start here" strip on /tools.html: tools a person can use on their own (our picks, after what testers liked most), else 0
     kw      extra words people might search for
     modes   optional [[label, href], ...]: the ways in when one tool has more than one (tabs or parts of its page)
     outcomes, people, bestFor, liked, example, sample, es: added below from MORE (what it helps with, who it is for)
     kind    'tool' or 'workpaper' (added below; wp: a workpaper's short code). /tools.html shows tools only.
   Old ids of merged tools: window.TOLToolAliases (old id -> new id); window.TOLToolById(id) follows them.
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
    { id: 'learn', slug: 'learn', name: 'Learn', blurb: 'Ask a question, practise on an example, or see an idea move.' },
    { id: 'play', slug: 'play', name: 'Play', blurb: 'Calm games with no timers and no way to lose.' }
  ];

  var T = [
    // ---------- Communication
    // the Text message checker and the Chat analyzer (the Conversation Reader) are one tool now: old id 'reader' -> 'signal'
    { id: 'signal', name: 'Chat analyzer', brand: 'the Signal Translator', href: '/signal-translator.html', type: 'talk', also: ['work', 'family'],
      does: 'Reads one message you’re about to send, one you got, a whole conversation, or a screenshot of one.',
      gets: 'How it may land or what it might mean, where a conversation turned, and calm, clear words that keep your point.',
      mins: 2, time: 'About 2 minutes for a message, 5 for a conversation', who: ['solo'], benefit: 'Send what you mean, and read a fight over text clearly', top: 1,
      modes: [['A message I’m about to send', '/signal-translator.html'], ['A message I got', '/signal-translator.html?mode=got'], ['A whole conversation or screenshot', '/signal-translator.html#conversation']],
      kw: 'chat analyzer chat analyser text message checker tone checker message analyzer rewrite reply sms whatsapp email before i send conversation reader conversation analyzer thread fight over text group chat screenshot argument signal translator' },
    { id: 'write', name: 'Talk it through in writing', brand: '', href: '/write-it-through.html', type: 'talk', also: [],
      does: 'Walks you through writing about one topic: facts, not verdicts, and one clear ask.',
      gets: 'A message ready to send with a reply-by time, after a short wait to check it.',
      mins: 10, time: 'About 10 minutes', who: ['solo', 'two'], benefit: 'Sort something out without a shouting match',
      kw: 'letter write it down written disagreement email message slow talk' },
    { id: 'sayit', name: 'Before you reply: say it so it lands', brand: '', href: '/workpapers/wp-09-say-it-so-it-lands.html', type: 'talk', also: ['self'],
      does: 'A quick self-check before you answer something that stung.',
      gets: 'Your reply as a fact, a feeling and one kind ask.',
      mins: 5, time: 'About 5 minutes', who: ['solo'], benefit: 'Answer the point, not the sting',
      kw: 'tone filter reply calmly what to say feelings i statement' },
    { id: 'refusals', name: 'Say no kindly: script maker', brand: '', href: '/refusals.html#make', type: 'talk', also: ['work', 'family'],
      does: 'Pick the situation and how you want to sound: warmer, plainer or firmer.',
      gets: 'Three kind, copy-ready ways to say no, with something to offer instead.',
      mins: 2, time: 'About 2 minutes', who: ['solo'], benefit: 'A clear no that keeps the friendship',
      kw: 'say no refuse decline boundary boundaries turn down' },
    { id: 'decoder', name: 'After a talk went wrong: a step-by-step reset', brand: 'the Carrier Wave Decoder, with See it from their side', href: '/carrier-wave-decoder.html', type: 'talk', also: ['calm', 'family'],
      modes: [['Start a session', '/carrier-wave-decoder.html'], ['Their side', '/carrier-wave-decoder.html?tab=their-side'], ['Do it together', '/carrier-wave-decoder.html#together']],
      does: 'A guided session for after a conversation went sideways: settle, work out what went out of sync, see their side, try again, then check your sentence.',
      gets: 'Their side of the moment, questions to ask instead of guessing, a sentence to bridge the gap (checked in the Chat analyzer), and notes to look back on.',
      mins: 15, time: 'About 15 minutes; Their side alone about 5', who: ['solo', 'two'], benefit: 'Learn from a bad moment instead of repeating it',
      kw: 'conversation went wrong out of sync misunderstanding argument repair reset their point of view perspective perspective shifter empathy other side why did they see it from their side' },
    { id: 'pause', name: 'Make a pause plan for arguments', brand: '', href: '/pursue-withdraw.html#plan-h', type: 'talk', also: ['calm', 'plan'],
      does: 'Agree on a calm day how either of you can take a break, and when you come back.',
      gets: 'Your pause word, how long a break lasts, a return time and the first sentence back, to copy or send.',
      mins: 10, time: 'About 10 minutes', who: ['two'], benefit: 'Breaks that calm things down instead of feeling like walking out',
      kw: 'time out break pause word one wants to talk one needs space pursue withdraw stonewall argument' },
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
    { id: 'checkincard', name: 'Weekly check-in card', brand: '', href: '/check-ins.html#card', type: 'talk', also: ['plan', 'family'],
      does: 'A short, kind weekly talk: what went well, what felt heavy, and one small change.',
      gets: 'A check-in card to print, put on the fridge or send to each other.',
      mins: 15, time: 'About 15 minutes a week', who: ['two', 'group'], benefit: 'A calm, regular time to raise things',
      kw: 'weekly check in house meeting family meeting talk once a week' },
    { id: 'flip', name: 'Turn a complaint into a request', brand: 'Flip it', href: '/small-wins.html#flip-it', type: 'talk', also: ['self'],
      does: 'Type a complaint, a worry or a harsh thought about yourself.',
      gets: 'A suggested flip into a request or a plan, and a private list of small wins.',
      mins: 2, time: 'About 2 minutes', who: ['solo'], benefit: 'Turn a grumble into something you can ask for',
      kw: 'complaint request reframe negative thought small wins done list' },
    { id: 'bonding', name: 'Get one small bonding idea', brand: 'the idea picker', href: '/bonding.html#ideas', type: 'talk', also: ['family', 'play'],
      does: 'Pick who it is with, how much time and how much energy you have.',
      gets: 'One small, doable idea at a time, to copy or send.',
      mins: 1, time: 'About a minute', who: ['solo', 'two'], benefit: 'Closeness without a big plan',
      kw: 'bonding ideas closeness quality time things to do together date idea' },
    { id: 'carecard', name: 'What feels like care to me: a care card', brand: 'love languages', href: '/love-languages.html#ll-card-h', type: 'talk', also: ['self'],
      does: 'Tick what would feel like care to you right now: words, help, time, small gifts or touch.',
      gets: 'A short care card to copy and share.',
      mins: 3, time: 'About 3 minutes', who: ['solo', 'two'], benefit: 'They stop having to guess',
      kw: 'love languages care card appreciation what i need' },
    { id: 'touchstones', name: 'Your shared words and rituals list', brand: 'touchstones', href: '/touchstones.html#ts-card-h', type: 'talk', also: ['plan'],
      does: 'Note the shared words, jokes, rituals and stories that say “this is us”.',
      gets: 'A list to copy and keep, and one new touchstone to try.',
      mins: 5, time: 'About 5 minutes', who: ['two', 'group'], benefit: 'Keep what makes you “us” fresh',
      kw: 'rituals inside jokes traditions shared language' },

    // ---------- Know yourself
    { id: 'wavelength', name: 'Communication style quiz', brand: 'Wavelength', href: '/wavelength.html', type: 'self', also: ['talk'],
      does: 'Twelve quick either/or questions about how you think, talk and listen.',
      gets: 'Your four-letter Wave Code and type, a card to share, and a side-by-side compare with someone else.',
      mins: 2, time: '2 to 10 minutes', who: ['solo', 'two'], benefit: 'People stop having to guess how to talk to you', top: 4,
      kw: 'communication quiz personality quiz wave code style test archetype compare' },
    { id: 'wiring', name: 'How I like to be spoken to: a one-page card', brand: 'the Wiring Card', href: '/wiring-card.html', type: 'self', also: ['talk', 'work'],
      does: 'Pick what helps words reach you, what your silence means and what to avoid.',
      gets: 'A one-page card to copy, print or share, and a side-by-side view with someone else’s card.',
      mins: 5, time: 'About 5 minutes', who: ['solo', 'two'], benefit: 'Hard talks start from how you each take things in', top: 6,
      kw: 'wiring card neurodivergent adhd autistic how i communicate card' },
    { id: 'roots', name: 'Where a reaction comes from', brand: 'Roots & Wings', href: '/growing-up.html#roots-h', type: 'self', also: [],
      does: 'A gentle tap-through look at where a trait or reaction may have started.',
      gets: 'A fairer, grown-up reading of an old rule, and small ways to work with it now.',
      mins: 5, time: 'About 5 minutes', who: ['solo'], benefit: 'Choose which old rules to keep',
      kw: 'childhood growing up why do i react old rules' },
    { id: 'take-in', name: 'Make the site fit your mind', brand: '', href: '/how-you-take-things-in.html', type: 'self', also: ['health'],
      does: 'Pick how your mind takes things in: ADHD, autistic, dyslexic, or just what helps.',
      gets: 'Every page adapts: shorter steps, a calmer look, read-aloud and more. You can change it any time.',
      mins: 2, time: 'About 2 minutes', who: ['solo'], benefit: 'Pages that suit the way you read',
      kw: 'adhd autism dyslexia neurodivergent accessibility settings reading' },
    { id: 'rhythms', name: 'Compare your daily rhythms', brand: 'Frequency Calibration', href: '/tools/frequency-calibration.html', type: 'self', also: ['plan'],
      does: 'Map your natural rhythms for money, rest, decisions, check-ins and recovery, next to one other person’s.',
      gets: 'Where you are out of step, and one small agreement for each.',
      mins: 15, time: 'About 15 minutes', who: ['two'], benefit: 'Different rhythms stop feeling like a fight',
      kw: 'rhythm pace morning person night owl money style decisions' },

    // ---------- Share the load
    { id: 'lemon-quick', name: 'Who does what: chore split check', brand: 'the Lemonade Stand, quick look', href: '/lemonade-stand.html#quick', type: 'load', also: ['family'],
      does: 'Tap who mostly does each job at home, the thinking work too. Send it so others can answer on their own.',
      gets: 'A plain picture of the split, where you agree and differ, and a fridge list to print or send.',
      mins: 2, time: 'About 2 minutes', who: ['solo', 'two', 'group'], benefit: 'Settle “who does more” with facts, not blame', top: 3,
      kw: 'chore split chores who does more housework fair split roommates housemates mental load quick look' },
    { id: 'lemon-full', name: 'Chores and bills: count the hours and money', brand: 'the Lemonade Stand', href: '/lemonade-stand.html', type: 'load', also: ['plan'],
      does: 'List the jobs, the hours and the bills for one person or a whole home.',
      gets: 'The split in hours and money, or your own load, with a simple money plan.',
      mins: 15, time: 'About 15 minutes', who: ['solo', 'two', 'group'], benefit: 'See the whole load, including bills',
      kw: 'bills money budget hours chores calculator who pays what rent' },
    { id: 'owner', name: 'One owner per job: a who-owns-what list', brand: '', href: '/workpapers/wp-03-one-owner-per-job.html', type: 'load', also: ['family', 'work', 'plan'],
      does: 'Give every regular job one owner, a backup and what “done” means.',
      gets: 'A fridge list to print, save or send. Others add their version and you combine them.',
      mins: 10, time: 'About 10 minutes', who: ['two', 'group'], benefit: 'Nobody has to keep asking',
      kw: 'chore chart rota roster who owns what fridge list house rules jobs list two homes' },
    { id: 'whodid', name: 'Who did what this week: a one-week log', brand: '', href: '/workpapers/wp-01.html', type: 'load', also: [],
      does: 'Log who did what at home for one week, the invisible jobs too.',
      gets: 'A week’s record to compare, plus three kind ways to say “not right now”.',
      mins: 5, time: 'A few minutes a day for a week', who: ['two', 'group'], benefit: 'Real numbers instead of memory',
      kw: 'chore log diary tracker week record' },
    { id: 'keepscoming', name: 'What keeps coming back? A monthly look-back', brand: '', href: '/workpapers/wp-04-what-keeps-coming-back.html', type: 'load', also: ['plan'],
      does: 'Once a month, look back at four weeks together.',
      gets: 'The jobs and arguments that keep returning, and one setup fix for each.',
      mins: 20, time: 'About 20 minutes a month', who: ['two', 'group'], benefit: 'Fix the setup, not the person',
      kw: 'monthly review same argument again recurring look back' },
    { id: 'fair-quick', name: 'Fair split check: is the setup working?', brand: '', href: '/workpapers/calculators/is-the-setup-working-quick.html', type: 'load', also: [],
      does: 'Type in the totals from your worksheets, for 2 to 8 people.',
      gets: 'A plain-words read of whether the split can keep going. It scores the setup, never a person.',
      mins: 5, time: 'About 5 minutes', who: ['two', 'group'], benefit: 'Know if the split can last',
      kw: 'fair split calculator is it fair sustainable score' },
    { id: 'fair-full', name: 'Fair split calculator: the long form', brand: '', href: '/is-the-setup-working.html', type: 'load', also: [],
      does: 'Enter hours and jobs for 2 to 8 people.',
      gets: 'The math step by step, an overall score and a trend log.',
      mins: 20, time: 'About 20 minutes', who: ['two', 'group'], benefit: 'Every number shown, nothing hidden',
      kw: 'calculator full detailed math hours' },
    { id: 'lookback-quick', name: 'Look back over 30 days', brand: 'the 30-Day Look-Back', href: '/workpapers/calculators/look-back-30-days-quick.html', type: 'load', also: [],
      does: 'Type in how things were about a month ago and how they are this week.',
      gets: 'What shifted, what didn’t, and one next step. It reads the setup, never a person.',
      mins: 5, time: 'About 5 minutes', who: ['two', 'group'], benefit: 'See if what you changed is working',
      kw: '30 day month review look back progress rescues imbalance calc-02' },
    { id: 'lookback-full', name: 'Look back over 30 days: the long form', brand: 'the 30-Day Look-Back', href: '/look-back-30-days.html', type: 'load', also: [],
      does: 'Enter four weeks of hours, rescues, load and jobs, or fill it in from this device.',
      gets: 'The running imbalance, what shifted, and one next step.',
      mins: 15, time: 'About 15 minutes', who: ['two', 'group'], benefit: 'The whole month, side by side',
      kw: 'calculator month four weeks running imbalance trend calc-02' },
    { id: 'snapshot', name: '2-minute load snapshot', brand: '', href: '/snapshot/index.html', type: 'load', also: ['self'],
      does: 'Seven quick questions about how a shared load is set up, and how it bends when things get heavy.',
      gets: 'Which of four areas to look at first, with the scoring shown openly.',
      mins: 2, time: 'About 2 minutes', who: ['solo'], benefit: 'Know where to start',
      kw: 'snapshot quiz shared load quick check' },
    { id: 'chart', name: 'Printable chore chart', brand: '', href: '/chore-chart-for-couples.html', type: 'load', also: ['family'],
      does: 'A chart for every job, including the invisible ones, with one owner each.',
      gets: 'A chart to print and put on the fridge.',
      mins: 10, time: 'About 10 minutes', who: ['two', 'group'], benefit: 'Everyone can see who owns what',
      kw: 'chore chart printable pdf fridge rota' },

    // ---------- Calm and stress
    { id: 'upset', name: 'Upset right now? A 5-minute calm-down', brand: '', href: '/upset-right-now.html', type: 'calm', also: ['talk', 'family'],
      does: 'A pause line with a return time, a one-minute breathing pacer, and how to come back.',
      gets: 'A calmer body, and words to come back to the talk with.',
      mins: 5, time: 'About 5 minutes', who: ['solo', 'two'], benefit: 'Stop a fight getting worse',
      kw: 'angry upset fight right now calm down breathe yelling' },
    { id: 'calmkit', name: 'Calm-down plan', brand: 'the Calm-Down Kit', href: '/wp-11.html', type: 'calm', also: ['self', 'plan'],
      does: 'On a calm day, decide your early signs, a pause signal and what settles you.',
      gets: 'Your own plan for heated moments, to keep on your phone or print.',
      mins: 10, time: 'About 10 minutes', who: ['solo', 'two'], benefit: 'A plan ready before you need it',
      kw: 'calm down kit plan heated anger management settle' },
    { id: 'soften', name: 'Soften a tense moment', brand: '', href: '/tools/soften-a-tense-moment.html', type: 'calm', also: ['talk'],
      does: 'Settle yourself, read the state someone else is in, and pick one small move.',
      gets: 'One small move that fits their state. The second level builds a plan you can print.',
      mins: 5, time: 'About 5 minutes', who: ['solo'], benefit: 'Lower the heat without forced cheer',
      kw: 'tense mood bad mood soften defuse' },
    { id: 'music', name: 'Calm sounds and music', brand: 'Brain Breakers and the Sound Toolkit', href: '/soundscapes.html', type: 'calm', also: ['health', 'play'],
      modes: [['Music', '/soundscapes.html#brain-breakers'], ['Background sounds', '/soundscapes.html#background']],
      does: 'Two ways to press play while you settle: four instrumental pieces with a visualizer, or a plain background sound (a low hum, a soft flutter or brown noise).',
      gets: 'A short break for your mind, or something steady in the background. A matter of taste, not a treatment.',
      mins: 5, time: 'A few minutes, or as long as you like', who: ['solo'], benefit: 'A real break, away from words',
      kw: 'music instrumental relax brain breakers brown noise white noise hum sound toolkit calm-down sounds background sound' },
    { id: 'drift', name: 'Slow colours and tones to wind down', brand: 'Drift', href: '/calm-visualizer.html', type: 'calm', also: ['play'],
      does: 'Pick how you feel. Slow colours, kind words and gentle tones keep you company (headphones help).',
      gets: 'A few quiet minutes with nothing to do.',
      mins: 5, time: 'About 5 minutes', who: ['solo'], benefit: 'A screen that slows you down',
      kw: 'visualizer binaural relax calm wind down' },
    { id: 'garden', name: 'Breathing game', brand: 'the Night Garden', href: '/night-garden.html', type: 'calm', also: ['play'],
      does: 'Breathe slowly to make flowers bloom and fireflies gather.',
      gets: 'A few slower breaths, with no timer and nothing to lose.',
      mins: 3, time: 'A few minutes', who: ['solo'], benefit: 'Slower breathing that feels like play',
      kw: 'breathing exercise breathe game relax' },

    // ---------- Family and parenting
    { id: 'handoff', name: 'Handoff-bag checklist for two homes', brand: '', href: '/co-parenting.html#handoff-bag', type: 'family', also: ['plan'],
      does: 'A short list, the same in both homes, of what goes in the bag.',
      gets: 'A list to copy, or a shared list both homes can change.',
      mins: 3, time: 'About 3 minutes', who: ['two'], benefit: 'No more “you forgot the inhaler”',
      kw: 'co-parent co parenting handover exchange bag checklist two homes' },
    { id: 'festival', name: 'Our festival year planner', brand: '', href: '/two-faiths.html#festival-year', type: 'family', also: ['plan'],
      does: 'List the festivals and big days from both traditions, and who goes where.',
      gets: 'A year table to print or copy, and a message to tell both families what you decided.',
      mins: 10, time: 'About 10 minutes', who: ['two'], benefit: 'Both traditions get their place',
      kw: 'holidays interfaith christmas eid diwali hanukkah festivals in-laws' },
    { id: 'familyplan', name: 'Family plan card', brand: '', href: '/check-ins.html?for=family#card', type: 'family', also: ['plan'],
      does: 'A short plan with a parent or grown child: visits, advice, a little one’s routines, a review date.',
      gets: 'A card to fill in together, copy and send to each other’s phones.',
      mins: 10, time: 'About 10 minutes', who: ['two', 'group'], benefit: 'Boundaries said once, kindly',
      kw: 'grandparents grown up children visits advice boundaries family plan' },
    { id: 'terms', name: 'Set your terms for a family event', brand: '', href: '/family-rifts.html#terms', type: 'family', also: [],
      does: 'Fill in what you are happy to do, what you are not ready to talk about, and one ask.',
      gets: 'A calm message to copy into your own text.',
      mins: 5, time: 'About 5 minutes', who: ['solo'], benefit: 'Go, and still keep some things off the table',
      kw: 'family rift estranged wedding funeral christening event siblings' },

    // ---------- Work and teams
    { id: 'team-owner', name: 'Team job list: one owner and a backup', brand: '', href: '/work.html#owner-list', type: 'work', also: ['load'],
      does: 'List the jobs that come round again and again, with an owner, a backup and how often.',
      gets: 'A team list to print or share, and a tally of who owns what.',
      mins: 15, time: 'About 15 minutes', who: ['group'], benefit: 'No job lands on whoever notices first',
      kw: 'team workload business partner co-founder raci responsibilities' },
    { id: 'team-checkin', name: '10-minute team check-in', brand: '', href: '/work.html#check-in', type: 'work', also: ['talk'],
      does: 'Once a week, go round once: how full your week is, one thank-you, one thing that slipped.',
      gets: 'A short weekly round to print or keep, and any job that needs a new owner.',
      mins: 10, time: 'About 10 minutes a week', who: ['group'], benefit: 'Workload talked about early, without blame',
      kw: 'team meeting standup weekly workload' },

    // ---------- Health and body
    { id: 'weather', name: 'How am I right now? A mood and energy check', brand: 'Today’s Weather and the Nervous System Ladder', href: '/quick-checks.html#today', type: 'health', also: ['self', 'calm'],
      modes: [['Quick: 4 taps', '/ladder.html'], ['Full forecast', '/quick-checks.html#today']],
      does: 'Four quick taps on how you are right now, or one minute on your mood, sleep, body, pressure and what is coming up today.',
      gets: 'Calm, revved up or running on empty, with what helps now and a pause line; or today’s full forecast, a good time to talk, and a private log if you want one.',
      mins: 1, time: '20 seconds to a minute', who: ['solo'], benefit: 'Know if now is a good time to talk', top: 5,
      kw: 'mood tracker mood check in energy sleep daily check today weather almanac nervous system ladder where am i right now state stressed shut down overwhelmed stress check battery burnout load how full load check' },

    // ---------- Plan together
    { id: 'deal', name: 'Time-together deal (games and phones)', brand: '', href: '/gaming-and-time-together.html#deal-h', type: 'plan', also: [],
      does: 'Agree game nights, a heads-up rule, a protected evening and phone-free times.',
      gets: 'A deal to copy, share as a link or show as a QR code. Either of you can change it.',
      mins: 10, time: 'About 10 minutes', who: ['two'], benefit: 'Gaming and “us” time both fit',
      kw: 'gaming phone screen time video games deal agreement' },
    { id: 'room', name: 'Room agreement for roommates', brand: '', href: '/sharing-a-room.html#agreement-h', type: 'plan', also: ['load'],
      does: 'Quiet hours, guests, cleaning and borrowing, from a common starting point.',
      gets: 'An agreement to copy or send to your roommate to change.',
      mins: 10, time: 'About 10 minutes', who: ['two'], benefit: 'Small things settled before they get big',
      kw: 'roommate dorm flatmate room agreement quiet hours guests' },
    { id: 'ourweek', name: 'Our week on one page (different hours)', brand: '', href: '/different-hours.html#our-week', type: 'plan', also: ['load'],
      does: 'Write both schedules for the week, with sleep, overlaps and one together time.',
      gets: 'One shared week to copy or send as a text.',
      mins: 10, time: 'About 10 minutes', who: ['two'], benefit: 'Fewer crossed wires on opposite shifts',
      kw: 'shift work night shift schedule rota different hours' },
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
    { id: 'ask', name: 'Ask a question in your own words', brand: 'Professor Puddles', href: '/ask.html', type: 'learn', also: ['talk'],
      does: 'Type what is going on, the way you would say it to a friend.',
      gets: 'Kind next steps, words you could use and the right pages, made only from this site.',
      mins: 2, time: 'About 2 minutes', who: ['solo'], benefit: 'Help for your exact situation, privately', top: 2,
      kw: 'chat chatbot ask question help puddles assistant' },
    { id: 'start10', name: 'Start in 10 minutes', brand: '', href: '/start-in-10-minutes.html', type: 'learn', also: ['self'],
      does: 'Four small steps, just for you or with someone: your weather, one short read, one pattern, one thing to try.',
      gets: 'A short “here’s what I got” summary to keep or screenshot.',
      mins: 10, time: 'About 10 minutes', who: ['solo', 'two'], benefit: 'The quickest way in',
      kw: 'start beginner first time new here quick start' },
    { id: 'playground', name: 'Practise the worksheets on an example', brand: 'the Workpaper Playground', href: '/do/index.html', type: 'learn', also: ['load'],
      does: 'Try the core worksheets on a made-up household of three roommates, with real math you can change.',
      gets: 'A feel for how the worksheets work before you use your own week. Nothing is saved.',
      mins: 5, time: 'About 5 minutes', who: ['solo'], benefit: 'Try it before you commit',
      kw: 'example practice demo playground' },
    { id: 'sync', name: 'Watch two rhythms fall into step', brand: 'the Frequency Sync Visualizer', href: '/tools/frequency-sync-visualizer.html', type: 'learn', also: [],
      does: 'Two moving waves drift apart. Tap “Check in” and watch them settle into step.',
      gets: 'A feel for why a tiny daily check-in works.',
      mins: 2, time: 'About 2 minutes', who: ['solo'], benefit: 'The big idea, in one picture',
      kw: 'visualizer waves rhythm sync animation' },
    { id: 'connect', name: 'Connect two fields of study', brand: '', href: '/polymath.html#connect', type: 'learn', also: [],
      does: 'Pick any two fields, like music and economics, and see the root they share.',
      gets: 'Where that idea shows up in the program.',
      mins: 3, time: 'A few minutes', who: ['solo'], benefit: 'See how ideas link up',
      kw: 'polymath fields connections' },
    { id: 'quest', name: 'Your learning map', brand: 'the quest map', href: '/quest.html', type: 'learn', also: ['play'],
      does: 'Small “check yourself” moments on reading pages, and a map of the whole program.',
      gets: 'A map that lights up as you learn. It never counts streaks.',
      mins: 2, time: 'A minute to look', who: ['solo'], benefit: 'See how far you have come',
      kw: 'quest map progress learning' },

    // ---------- Play
    { id: 'pauseplay', name: 'Games: every calm game in one place', brand: 'Pause & Play', href: '/pause-and-play.html', type: 'play', also: ['calm'],
      does: 'Breathing, word games, crosswords, the arcade, the Bears Dojo, the Re-check Drive and the music video maker, with your level and your garden. Or press “Pick one for me”.',
      gets: 'A gentle break whenever you want one.',
      mins: 5, time: 'As long as you like', who: ['solo'], benefit: 'Settle your mind before you talk',
      kw: 'games calm games play surprise me random pick one for me' },
    { id: 'arcade', name: 'Five gentle arcade games', brand: 'Tidbit and Sugarfoot’s Arcade', href: '/frequency-journey.html', type: 'play', also: [],
      does: 'A maze chase, a crossing, a wagon-trail journey, a brick breaker and a catch game.',
      gets: 'Classic games with the two pups, no way to lose.',
      mins: 5, time: 'A few minutes a game', who: ['solo'], benefit: 'Fun with no pressure',
      kw: 'arcade games pac maze frogger breakout kids' },
    { id: 'wordbloom', name: 'Swipe-to-spell word game', brand: 'Word Bloom', href: '/word-bloom.html', type: 'play', also: [],
      does: 'Swipe across a wheel of letters to find hidden words.',
      gets: 'Hundreds of gentle levels and a bonus jar.',
      mins: 5, time: 'A few minutes a level', who: ['solo'], benefit: 'A calm word puzzle',
      kw: 'word game anagram spelling' },
    { id: 'quietwords', name: 'Calm word search', brand: 'Quiet Words', href: '/quiet-words.html', type: 'play', also: [],
      does: 'A word search with a new theme in every puzzle.',
      gets: 'A kind thought for every word you find.',
      mins: 5, time: 'A few minutes', who: ['solo'], benefit: 'Quiet focus',
      kw: 'word search puzzle' },
    { id: 'crosswords', name: 'Crosswords', brand: 'Quiet Crossword and the Daily Ledger Crossword', href: '/quiet-crossword.html', type: 'play', also: [],
      modes: [['Gentle levels', '/quiet-crossword.html'], ['Newspaper daily', '/daily-ledger-crossword.html']],
      does: 'Two ways to play: small, friendly crosswords in five gentle levels, or a newspaper-style daily, from a quick 5x5 mini to a big Sunday grid.',
      gets: 'A short puzzle with fair, friendly clues, and a new one every day.',
      mins: 5, time: '5 to 30 minutes', who: ['solo', 'two'], benefit: 'A small puzzle you can finish',
      kw: 'crossword mini puzzle daily newspaper easy crossword daily ledger quiet crossword' },
    { id: 'drive', name: 'Calm football game for small kind acts', brand: 'the Re-check Drive', href: '/recheck-drive.html', type: 'play', also: ['talk'],
      does: 'Do small, kind re-checks from the complacency playbook for real. Each one moves the ball.',
      gets: 'A field goal, and a few real kind things done. No clock.',
      mins: 5, time: 'A few minutes', who: ['solo', 'two'], benefit: 'Keeps “it’s fine” from going stale',
      kw: 'football game complacency kindness' },
    { id: 'dojo', name: 'A quiet temple garden to wander', brand: 'the Bears Dojo', href: '/bears-dojo.html', type: 'play', also: ['calm'],
      does: 'Wander a garden while two bears tend it, build your own bear, then step inside.',
      gets: 'Something gentle and always different.',
      mins: 5, time: 'As long as you like', who: ['solo'], benefit: 'A soft place to land',
      kw: 'bears garden calm game build a bear' },
    { id: 'mvmaker', name: 'Make a cartoon music video', brand: 'the Frequency Buddies video maker', href: '/frequency-buddies-music-video-maker.html', type: 'play', also: [],
      does: 'Pick the stage, lights, costumes, moves and who is on stage.',
      gets: 'Your own music video to play and share.',
      mins: 5, time: 'About 5 minutes', who: ['solo', 'two'], benefit: 'Something silly to make together with kids',
      kw: 'music video maker kids cartoon create' }
  ];

  // ---------- What each tool helps with, and who it is for (used by /tools.html's filters and cards; tools11)
  //   o      outcomes: calm (Calm down) · talk (Talk better) · self (Self-discovery) · other (Understand someone)
  //          · load (Share the load fairly) · plan (Plan together) · learn (Learn) · fun (Have fun)
  //   p      who it is for besides yourself, the main one first: partner · family (family and kids) · housemates · work · friends
  //          ('me', on your own, comes from who: ['solo'])
  //   best   "Best for: …" in a few words
  //   liked  how many practice testers (made-up households run through the site, $SP/reports13) named it among what
  //          they liked most. A guide for ordering, never a rating from real users.
  //   ex     a filled-in example from the book (tools/book/examples/<ex>.html); sample: a two-line made-up result instead
  //   es     the tool also works in Spanish
  // A tool with no line here still works: the page falls back to its type.
  var MORE = {
    signal: { o: 'talk other', p: 'partner family friends work housemates', best: 'a text you’re unsure how to send, one that stung, or a text argument you keep rereading', liked: 17, ex: 'ex-signal-zoe' },
    write: { o: 'talk', p: 'partner family friends', best: 'a big topic that goes wrong when you say it out loud', ex: 'ex-write-carys-owen' },
    sayit: { o: 'talk calm', p: 'partner family friends work', best: 'the moment before you answer something that stung', ex: 'ex-wp09-carla' },
    refusals: { o: 'talk', p: 'family friends work', best: 'saying no without the guilt spiral',
      sample: 'Asked to cover a Saturday shift, plainer: “I can’t do this Saturday. I could swap for one next month if that helps.”' },
    decoder: { o: 'talk other calm', p: 'partner family friends', best: 'the day after a talk went sideways', ex: 'ex-perspective-hana' },
    pause: { o: 'calm talk plan', p: 'partner', best: 'when one of you wants to talk now and the other needs space', liked: 1, ex: 'ex-pauseplan-imani-kwame' },
    checkin90: { o: 'talk plan', p: 'partner family housemates', best: 'busy weeks when you barely cross paths', liked: 2, ex: 'ex-wp13-priya-dev' },
    pace12: { o: 'other plan', p: 'partner housemates family', best: 'when one of you decides fast and the other needs time',
      sample: 'Biggest gap: weekend plans (one wants to settle it tonight, one wants a day to think). Agreement: “We decide by Thursday lunch.”' },
    static14: { o: 'other load', p: 'partner family housemates', best: 'a hard stretch when you keep snapping at each other',
      sample: 'The week’s pattern: four of five tense evenings came after a late work call. The plan: work phone off at 8.' },
    rituals15: { o: 'plan fun', p: 'partner family friends work', best: 'feeling like you’ve drifted into flatmates', ex: 'ex-b3-rituals-team' },
    checkincard: { o: 'talk plan', p: 'partner family housemates', best: 'a calm, regular time to raise small things', ex: 'ex-checkin-linda-jordan' },
    flip: { o: 'self talk calm', p: '', best: 'a grumble or a harsh thought going round your head', ex: 'ex-b3-flip-hamish' },
    bonding: { o: 'fun', p: 'partner family friends', best: 'wanting closeness with no energy for a big plan',
      sample: 'With a partner, 10 minutes, low energy: “Lie down and swap one high and one low from today.”' },
    carecard: { o: 'self other', p: 'partner family friends', best: 'knowing what you need before you ask for it',
      sample: 'Right now, care looks like: one job taken off my list without being asked. Kind words come second.' },
    touchstones: { o: 'fun plan', p: 'partner family friends', best: 'keeping the “this is us” things alive',
      sample: '“Tea on the step”, the Tuesday call, the word “sproinged”. New one to try: Sunday pancakes.' },
    wavelength: { o: 'self other', p: 'partner friends family work housemates', best: 'working out why you and someone keep missing each other', liked: 3, ex: 'ex-wavelength-mo' },
    wiring: { o: 'self talk', p: 'partner work friends family', best: 'telling people how to reach you, without a long talk', ex: 'ex-wiring-ife' },
    roots: { o: 'self', p: '', best: 'a reaction that feels bigger than the moment',
      sample: 'Trait: “I go quiet when someone raises their voice.” A grown-up reading: it kept me safe once; now I can say “give me ten minutes”.' },
    'take-in': { o: 'self learn', p: '', best: 'pages that feel like too much to read',
      sample: 'Picked: ADHD. Pages now show shorter steps, one thing at a time, with read-aloud on.' },
    rhythms: { o: 'other plan', p: 'partner housemates', best: 'a morning person and a night owl under one roof',
      sample: 'Money: one plans ahead, one spends as it comes. Agreement: a 10-minute money check every other Sunday.' },
    'lemon-quick': { o: 'load other', p: 'partner housemates family', best: 'the “who does more?” argument', liked: 19, ex: 'ex-lemonade-housemates', es: 1 },
    'lemon-full': { o: 'load plan', p: 'partner housemates family', best: 'seeing hours and bills together, not just chores', liked: 2, ex: 'ex-lemonade-money-grace-ruth', es: 1 },
    owner: { o: 'load plan', p: 'housemates partner family', best: 'jobs that only get done when someone nags', liked: 16, ex: 'ex-wp03-coparents' },
    whodid: { o: 'load', p: 'partner housemates family', best: 'swapping “I do everything” for a real week', ex: 'ex-wp01-marcus-theo' },
    keepscoming: { o: 'load plan', p: 'housemates partner family', best: 'the same argument coming back every month', liked: 1, ex: 'ex-wp04-triad' },
    'fair-quick': { o: 'load', p: 'partner housemates family', best: 'checking whether your split can last', ex: 'ex-setup-rosemary-ken' },
    'fair-full': { o: 'load learn', p: 'partner housemates family', best: 'people who want to see every number',
      sample: 'Hours: 31 and 19 a week. Every job has a name. The read: workable for now, but one person carries most of the planning.' },
    'lookback-quick': { o: 'load plan', p: 'partner housemates family', best: 'checking whether last month’s changes stuck',
      sample: 'A month ago: dishes argued about most nights. This week: twice. Next step: keep the rota and add a backup for Sundays.' },
    'lookback-full': { o: 'load plan', p: 'partner housemates family', best: 'a whole month, side by side',
      sample: 'Running imbalance: down from 9 hours a week to 4. What shifted: the shopping. What didn’t: the planning.' },
    snapshot: { o: 'load self', p: '', best: 'not knowing where to start with a shared load',
      sample: 'Look first at: “When things get heavy”, who picks up the slack when one of you is ill.' },
    chart: { o: 'load plan', p: 'partner housemates family', best: 'a chart everyone can see on the fridge',
      sample: 'Bins: Sam, backup Jo. Done means: out by 7 on Tuesday night.' },
    upset: { o: 'calm', p: 'partner family', best: 'right now, in the middle of an argument', es: 1,
      sample: 'Pause line: “I’m getting too heated. I’m taking 20 minutes and I’ll come back at 8:15.”' },
    calmkit: { o: 'calm self plan', p: 'partner', best: 'knowing your early signs before the next heated moment', ex: 'ex-wp11-nell' },
    soften: { o: 'calm other', p: 'partner family housemates work', best: 'someone near you is in a bad mood',
      sample: 'They seem: running on empty. One small move: a glass of water, and no questions for now.' },
    music: { o: 'calm fun', p: '', best: 'a few minutes away from words' },
    drift: { o: 'calm', p: '', best: 'winding down before sleep' },
    garden: { o: 'calm fun', p: '', best: 'slowing your breathing without counting', es: 1 },
    handoff: { o: 'plan', p: 'family', best: 'co-parents handing over between two homes',
      sample: 'In the bag: the inhaler with a note of the last dose, the reading book, the charger, one comfort toy.' },
    festival: { o: 'plan', p: 'partner family', best: 'two traditions and two sets of in-laws', liked: 2,
      sample: 'Diwali: at Asha’s parents. Christmas Day: at ours, both families invited, done by 6.' },
    familyplan: { o: 'plan talk', p: 'family', best: 'kind boundaries with parents or grown children', liked: 1, ex: 'ex-familyplan-amaka' },
    terms: { o: 'talk calm', p: 'family', best: 'a family event while some things are still raw', liked: 1,
      sample: '“I’ll come for the meal and leave by 4. I’m not ready to talk about the house yet. One ask: can I sit near Gran?”' },
    'team-owner': { o: 'load plan', p: 'work', best: 'a team where jobs land on whoever notices first', liked: 2,
      sample: 'Payroll: Ade, backup Ben, monthly. Supplier orders: Ben, backup Ade, weekly.' },
    'team-checkin': { o: 'talk load', p: 'work', best: 'raising workload early, without blame',
      sample: 'Ben: week 80% full. Thanks to Ade for the VAT return. Slipped: the website update, new owner Ade.' },
    weather: { o: 'self calm', p: '', best: 'deciding whether now is a good time to talk', liked: 1, ex: 'ex-weather-joel' },
    deal: { o: 'plan fun', p: 'partner', best: 'gaming or phones versus time together', liked: 2, ex: 'ex-deal-jamal-tess' },
    room: { o: 'plan load', p: 'housemates', best: 'roommates, before small things get big', ex: 'ex-room-kayla-bea' },
    ourweek: { o: 'plan', p: 'partner family', best: 'opposite shifts and crossed wires',
      sample: 'Overlap: Tuesday and Saturday mornings. Together time: Saturday breakfast, phones away.' },
    suite: { o: 'plan load learn', p: 'partner family housemates work', best: 'doing the whole program properly, in order' },
    sixweeks: { o: 'plan learn', p: 'partner family housemates', best: 'a guided start, one small step a week' },
    progress: { o: 'plan', p: 'partner family housemates', best: 'seeing whether things are actually getting better' },
    ask: { o: 'learn talk self other', p: 'partner family friends work housemates', best: 'a situation that doesn’t fit a box', liked: 28, es: 1,
      sample: 'You type: “my partner never helps with bedtime”. You get: kind next steps, words you could use, and two pages to read.' },
    start10: { o: 'learn self', p: 'partner', best: 'your first visit, with ten minutes to spare',
      sample: '“Here’s what I got: my weather is gusty. My pattern: I go quiet when tired. One thing to try: say ‘I need ten minutes’.”' },
    playground: { o: 'learn load', p: '', best: 'trying the worksheets before using your own week' },
    sync: { o: 'learn', p: '', best: 'seeing why a tiny daily check-in works' },
    connect: { o: 'learn fun', p: '', best: 'curious minds who like linking ideas' },
    quest: { o: 'learn', p: '', best: 'seeing how far you’ve come' },
    pauseplay: { o: 'fun calm', p: 'family', best: 'a gentle break before you talk' },
    arcade: { o: 'fun', p: 'family', best: 'playing with kids, with no way to lose' },
    wordbloom: { o: 'fun', p: '', best: 'a calm word puzzle' },
    quietwords: { o: 'fun calm', p: '', best: 'quiet focus for a few minutes' },
    crosswords: { o: 'fun', p: 'partner', best: 'a small puzzle to finish, alone or side by side' },
    drive: { o: 'fun other', p: 'partner', best: 'keeping small kindnesses from going stale' },
    dojo: { o: 'fun calm', p: '', best: 'a soft place to land' },
    mvmaker: { o: 'fun', p: 'family', best: 'making something silly with kids' }
  };
  // ---------- Tools and workpapers are kept apart (owner: "Keep work papers and tools separate").
  // Every entry gets kind: 'tool' or 'workpaper'. A workpaper is one of the numbered fill-in worksheets (WP-01 to WP-15),
  // the printable chore chart, the suite that runs them in order, the six-week program and the progress report. The same
  // split as the menu's Workpapers group (menu11): the calculators (CALC-01, CALC-02) and the Workpaper Playground stay tools.
  // /tools.html lists tools only and links the workpapers in their own section. wp: the short code shown next to a workpaper.
  var WORKPAPERS = { whodid: 'WP-01', owner: 'WP-03', keepscoming: 'WP-04', sayit: 'WP-09', calmkit: 'WP-11', pace12: 'WP-12',
    checkin90: 'WP-13', static14: 'WP-14', rituals15: 'WP-15', chart: 'Chart', suite: 'Suite', sixweeks: 'PROG-01', progress: 'REPORT-01' };
  T.forEach(function (t) {
    if (!t.kind) t.kind = WORKPAPERS[t.id] || (/^\/(workpapers\/|wp-\d)/.test(t.href) && !/^\/workpapers\/calculators\//.test(t.href)) ? 'workpaper' : 'tool';
    if (t.kind === 'workpaper' && !t.wp) t.wp = WORKPAPERS[t.id] || '';
  });
  var TYPE_OUT = { talk: 'talk', self: 'self', load: 'load', calm: 'calm', family: 'plan', work: 'load', health: 'self calm', plan: 'plan', learn: 'learn', play: 'fun' };
  T.forEach(function (t) {
    var x = MORE[t.id] || {}, p = (x.p != null ? x.p : (t.who.indexOf('two') !== -1 ? 'partner' : '') + (t.who.indexOf('group') !== -1 ? ' family housemates work' : '')).split(/\s+/).filter(Boolean);
    t.outcomes = (x.o || TYPE_OUT[t.type] || '').split(/\s+/).filter(Boolean);
    t.people = (t.who.indexOf('solo') !== -1 ? ['me'] : []).concat(p);
    if (t.bestFor == null) t.bestFor = x.best || '';
    t.liked = x.liked || 0;
    if (x.ex) t.example = x.ex;
    if (x.sample) t.sample = x.sample;
    if (x.es) t.es = true;
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
    reader: 'signal'            // the Conversation Reader -> the Chat analyzer, "A whole conversation or screenshot" (#conversation)
  };
  var A = window.TOLToolAliases || {};
  Object.keys(ALIASES).forEach(function (k) { A[k] = ALIASES[k]; });

  window.TOLToolTypes = TYPES;
  window.TOLTools = T;
  window.TOLToolAliases = A;
  // the tool for an id, following old (merged) ids to the tool that replaced them
  window.TOLToolById = function (id) {
    for (var n = 0; n < 5 && A[id]; n++) id = A[id];
    for (var i = 0; i < T.length; i++) if (T[i].id === id) return T[i];
    return null;
  };
})();
