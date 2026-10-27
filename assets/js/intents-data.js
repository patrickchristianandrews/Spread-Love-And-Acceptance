/* intents-data.js: "What do you want to do today?" (home28). One plain list: the home page's chooser and /do.html?want=<slug> both read it.
   Each intent: slug, title (what a person would say), line (one specific sentence for the home tile), lead (the first lines on its page),
   group ('mind': something is on my mind now; 'time': I have some time), and picks: 4 to 8 real pages. The FIRST pick is the big one.
   Each pick: href (a real page, a #part is checked), title, time (how long, in words a person would say), why (when to use it), cta (the button).
   The home tiles and the no-JavaScript list in do.html are written from this file by tools/intents/build.js, which also checks that every
   link opens a real page (and a real #part). Nothing here is stored or sent anywhere. */
(function (G) {
  'use strict';
  var GROUPS = [
    { id: 'mind', label: 'Something is on my mind' },
    { id: 'time', label: 'I have some time' }
  ];
  var INTENTS = [
    { slug: 'feeling', group: 'mind', title: 'Understand a feeling',
      line: 'Name it, paint it, and see what may be under it.',
      lead: 'You know something is off and can’t say what. These get you from a knot to a few plain words, on your own, in a few minutes.',
      picks: [
        { href: '/what-am-i-feeling.html', title: 'Paint Your Feelings', time: '5 min', cta: 'Paint a feeling',
          why: 'Try this when something feels big or muddy and you can’t say what. You answer a few questions and get a bright painting of your answers, a map of what may be behind the feeling, and one or two first steps. It all stays on your device.' },
        { href: '/quick-checks.html#today', title: 'My weather today', time: '1 min', cta: 'Check my weather',
          why: 'Try this when you only need to know whether now is a good time to talk. Four taps, or one minute on mood, sleep and energy.' },
        { href: '/workpapers/wp-02-how-much-are-you-carrying.html', title: 'How much are you carrying?', time: '2 min', cta: 'Take the stress check',
          why: 'Good when you’re worn out and can’t tell if it’s one thing or everything at once. Five quick questions about today’s load.' },
        { href: '/support-languages.html', title: 'Support languages', time: '3 min', cta: 'Find my top two',
          why: 'Try this when a hard stretch has you wanting something and you can’t name it: room, closeness, a plan or a hand. Ten questions.' },
        { href: '/old-hurts-new-reactions.html', title: 'Old hurts and new reactions', time: '13 min read', cta: 'Read it',
          why: 'For when you reacted much harder than the moment deserved and want to know where that came from.' },
        { href: '/nervous-system.html', title: 'Your nervous system, in plain words', time: '14 min read', cta: 'Read it',
          why: 'For when your body is doing things your head didn’t vote for: a racing heart, a shut-down, a flash of anger.' }
      ] },
    { slug: 'say-it', group: 'mind', title: 'Say something hard, well',
      line: 'Check a text before it goes, or rewind a talk that went sideways.',
      lead: 'A hard talk usually goes wrong in the first sentence. These help you pick yours before you send it or say it.',
      picks: [
        { href: '/signal-translator.html', title: 'Chat analyzer', time: '2 min', cta: 'Check a text',
          why: 'Try this when you’ve typed something and you’re not sure about it. Paste it in, see how it may land, and get a clearer way to say it. It also reads a text or a whole chat that someone sent you.' },
        { href: '/write-it-through.html', title: 'Write it through', time: '10 min', cta: 'Write it through',
          why: 'Try this when the topic is too big for a text and you can already hear the shouting. Write your side, wait, then send. Nobody has to answer on the spot.' },
        { href: '/workpapers/wp-09-say-it-so-it-lands.html', title: 'Say it so it lands', time: '5 min', cta: 'Fill it in',
          why: 'Good when you’re about to reply to something that stung. It walks you through one fact, one feeling and one kind ask.' },
        { href: '/carrier-wave-decoder.html', title: 'Rewind the talk', time: '15 min', cta: 'Rewind it',
          why: 'Try this after a talk went sideways. You replay it, see their side, and plan a better second try.' },
        { href: '/refusals.html', title: 'Say no kindly', time: '3 min read', cta: 'See the scripts',
          why: 'For when you have to turn something down and still want the other person to feel respected.' },
        { href: '/apology-languages.html', title: 'Apology languages', time: '4 min read', cta: 'Read it',
          why: 'Try this when you owe a sorry, or you’re waiting for one and it hasn’t felt like one yet.' },
        { href: '/check-ins.html#card', title: 'Kitchen-table check-in', time: '15 min', cta: 'Plan a check-in',
          why: 'Good when small things keep piling up. One short, kind talk a week deals with them before they grow.' }
      ] },
    { slug: 'calm', group: 'mind', title: 'Calm down right now',
      line: 'Five minutes to breathe, pause, and come back to it.',
      lead: 'Nothing here asks you to talk. Pick one, give it five minutes, and decide what to do after.',
      picks: [
        { href: '/upset-right-now.html', title: 'Upset right now?', time: '5 min', cta: 'Start the five minutes',
          why: 'Try this when your heart is racing and a fight is one sentence away. It gives you a pause line with a return time, and a one-minute breathing pacer.' },
        { href: '/night-garden.html', title: 'The Night Garden', time: '5 min', cta: 'Breathe in the garden',
          why: 'Try this when you want something to watch while you slow down. You breathe, and flowers bloom.' },
        { href: '/tools/soften-a-tense-moment.html', title: 'Soften a tense moment', time: '6 min', cta: 'Try level one',
          why: 'For when the room has gone heavy and nobody has said why. Small, kind moves that lighten it without a speech.' },
        { href: '/soundscapes.html#brain-breakers', title: 'Brain Breakers', time: 'A few minutes', cta: 'Put it on',
          why: 'Try this when you want sound instead of advice. Four instrumental pieces, with a visualizer that moves with the music.' },
        { href: '/sleeping-pals-cam.html', title: 'Sleeping Pals Cam', time: 'As long as you like', cta: 'Fall asleep to it',
          why: 'Good when it’s late and your head is still running. Tidbit and Sugarfoot nap, and you can mix rain, ocean or brown noise.' },
        { href: '/help-it-settle.html', title: 'Helping it settle', time: '10 min read', cta: 'Read it',
          why: 'Read this once you’re calmer. It covers what you can change in your own tone, pace and timing so the next one goes better.' },
        { href: '/wp-11.html', title: 'The calm-down plan', time: '10 min', cta: 'Make my plan',
          why: 'Try this when you’re calm, not in the middle of it. Write down what settles you, so you don’t have to think of it mid-fight.' }
      ] },
    { slug: 'load', group: 'mind', title: 'Share the load at home',
      line: 'Find out who does what, then split it fairly.',
      lead: 'Most of the work at home is the kind nobody sees. Count it first. Then split it, and check that the split is working.',
      picks: [
        { href: '/lemonade-stand.html#quick', title: 'Who does what?', time: '2 min', cta: 'Start tapping',
          why: 'Try this when “who does more?” has turned into a fight. Each of you taps who does each job on your own phone, then you compare the facts.' },
        { href: '/workpapers/calculators/is-the-setup-working-quick.html', title: 'Fair split check', time: '5 min', cta: 'Check our split',
          why: 'Try this after you’ve changed who does what and want to know if it’s working, this week or over a month.' },
        { href: '/workpapers/wp-03-one-owner-per-job.html', title: 'One owner per job', time: '10 min', cta: 'Write it down',
          why: 'Good when you’re tired of asking. Every job gets one name next to it, so nobody has to keep reminding anybody.' },
        { href: '/workpapers/wp-01.html', title: 'Who did what this week', time: '5 min', cta: 'Start the log',
          why: 'Try this when memory and facts disagree. Log one week, including the noticing and the remembering.' },
        { href: '/chore-chart-for-couples.html', title: 'A printable chore chart', time: '10 min', cta: 'Print the chart',
          why: 'Try this when you want it on the fridge. Free, printable, one owner per job.' },
        { href: '/invisible-labor-mental-load.html', title: 'Invisible labor and the mental load', time: '7 min read', cta: 'Read it',
          why: 'For the person who remembers the dentist appointment while nobody notices they remembered.' },
        { href: '/share-the-load.html', title: 'Share the load, step by step', time: '3 min read', cta: 'See the steps',
          why: 'Good if you don’t know which tool to use first. It puts them in order.' }
      ] },
    { slug: 'learn', group: 'time', title: 'Learn something new',
      line: 'Ten-minute lessons, a practice home, and a six-week plan.',
      lead: 'Pick how much time you have. Each of these ends with something you can use the same day.',
      picks: [
        { href: '/start-in-10-minutes.html', title: 'Ten-minute start', time: '10 min', cta: 'Start the ten minutes',
          why: 'Try this when you want the quickest way in: four small steps, and a summary you can keep.' },
        { href: '/#small-days', title: 'Seven small days', time: 'About a minute a day', cta: 'See today’s part',
          why: 'Try this when you want something small and regular. One small thing a day for seven days, with a part for just you and a part for two.' },
        { href: '/do/index.html', title: 'Learn by doing', time: '5 min', cta: 'Practice on a made-up home',
          why: 'Good when you’d rather practice than read. A made-up household to try the worksheets on first, with nothing at stake.' },
        { href: '/prog-01.html', title: 'The six-week program', time: '30 min a week', cta: 'See week one',
          why: 'Try this when you want a plan with an end date. One worksheet a week, in order.' },
        { href: '/ask.html', title: 'Ask Professor Puddles', time: '2 min', cta: 'Ask a question',
          why: 'For when your question is too specific for any page. Type it the way you’d tell a friend. Answers come only from this site.' },
        { href: '/learn/index.html', title: 'Philosophy for everyday life', time: '5 min read', cta: 'Read a story',
          why: 'Try this when you like old stories with a useful idea inside, like the Second Arrow.' },
        { href: '/frequency-framework.html', title: 'The Frequency Framework', time: '3 min read', cta: 'Read it',
          why: 'Good when two kind people keep missing each other and you want a way to see why.' }
      ] },
    { slug: 'read', group: 'time', title: 'Read something',
      line: 'The free book, plain-language guides, and the research behind them.',
      lead: 'All of it is free, with no sign-up. Start with the book, or go straight to the guide for the person you’re dealing with.',
      picks: [
        { href: '/book/index.html', title: 'The book', time: 'About 10 min a chapter', cta: 'Start reading',
          why: 'Try this when you want one long, connected read. It’s free online: from the first chapter, or by topic.' },
        { href: '/by-relationship.html', title: 'Guides by relationship', time: 'Find yours', cta: 'Find my guide',
          why: 'Try this when you know who the trouble is with: a partner, a parent, a teen, a roommate or a coworker.' },
        { href: '/library.html', title: 'Psychology in plain words', time: '13 topics', cta: 'Browse the topics',
          why: 'Good when you want what the research says without the jargon.' },
        { href: '/the-logic-behind-it.html', title: 'The Logic Behind It', time: '2 min each', cta: 'Pick a reaction',
          why: 'Try this when someone’s reaction looks odd or rude and you want to know why it makes sense. Thirty-eight everyday reactions, one to a page.' },
        { href: '/reading.html', title: 'Articles worth reading', time: 'Varies', cta: 'See the list',
          why: 'For when you’d like to hear it from someone else too. Hand-picked articles from sources the site trusts.' },
        { href: '/book/download.html', title: 'Books and downloads', time: 'PDFs', cta: 'Get the PDFs',
          why: 'Try this when you’d rather read on paper or offline. Every book as a PDF, plus a printable workbook and a pocket guide.' },
        { href: '/research.html', title: 'The research behind the site', time: 'Long', cta: 'Check the sources',
          why: 'Try this when you want to check our work. Every study, book and review, in plain words.' },
        { href: '/explore.html', title: 'Everything on this site', time: 'Browse', cta: 'Browse it all',
          why: 'Good when none of that is quite it. Every guide, tool and worksheet, with filters.' }
      ] },
    { slug: 'create', group: 'time', title: 'Get creative',
      line: 'Paint a feeling, get a poster from Professor Puddles, color, or build a music video.',
      lead: 'Not everything has to be talked out. These turn it into a picture, a song, or a page to color.',
      picks: [
        { href: '/what-am-i-feeling.html', title: 'Paint Your Feelings', time: '5 min', cta: 'Paint a feeling',
          why: 'Try this when you’d rather see a feeling than explain it. Your answers become a bright abstract painting you can save, with a map of what may be behind it.' },
        { href: '/ask.html#try-asking', title: 'Get a picture made with Professor Puddles', time: '2 min', cta: 'Ask for a poster',
          why: 'Try this when you want to hand someone the idea instead of explaining it. Ask for a poster on the mental load, fair versus equal, or a good pause, then save it as an image or print it.' },
        { href: '/frequency-buddies-music-video-maker.html', title: 'Make your own music video', time: '10 min', cta: 'Pick the stage',
          why: 'Try this when you want to be silly on purpose. Choose the stage, lights, costumes and dance moves for the Frequency Buddies theme song, then share it.' },
        { href: '/calm-visualizer.html', title: 'Drift', time: 'A few quiet minutes', cta: 'Open Drift',
          why: 'Try this when you want to see sound. Tell it how you feel, put on headphones, and slow colors move with soft tones.' },
        { href: '/soundscapes.html#brain-breakers', title: 'Brain Breakers', time: 'A few minutes', cta: 'See and feel it',
          why: 'Try this when you want to feel music as well as hear it. Four instrumental pieces with a visualizer and, on a phone, a little vibration.' },
        { href: '/book/download.html#kids', title: 'Coloring books to print', time: 'An afternoon', cta: 'Get the coloring books',
          why: 'Try this when your hands need something to do. Two books with Tidbit and Sugarfoot: 32 big, simple pictures for ages 3 to 7, and 32 detailed scenes for ages 8 to 12.' },
        { href: '/sleeping-pals-cam.html', title: 'Sleeping Pals Cam', time: 'As long as you like', cta: 'Add your pets',
          why: 'Try this when you want your own pets in the picture. Add your fur babies to the sleeping room, then layer soft sounds.' },
        { href: '/wiring-card.html', title: 'A card on how to talk to you', time: '5 min', cta: 'Make my card',
          why: 'Try this to write the one-page manual for you: how you take in words, what your silence means, how a request lands best. Hand it to the people you live with.' }
      ] },
    { slug: 'play', group: 'time', title: 'Play or watch something',
      line: 'Home Run Derby, word games, and the Frequency Buddies cartoon.',
      lead: 'No timers and no way to lose. Tidbit and Sugarfoot run most of it.',
      picks: [
        { href: '/frequency-journey.html', title: 'Tidbit and Sugarfoot’s Arcade', time: 'A couple of minutes a game', cta: 'Open the arcade',
          why: 'Try this when you need a break and want to pick from six classics: a maze chase, a road-and-river crossing, a brick breaker and three more.' },
        { href: '/frequency-journey.html#derby', title: 'Home Run Derby', time: '2 min', cta: 'Swing with Tidbit',
          why: 'Try this when you want one thing to do with your thumbs. Every level is new, and there is no game over.' },
        { href: '/coin-pusher.html', title: 'Kindness Coin Pusher', time: '3 min', cta: 'Drop a coin',
          why: 'Good when you want to watch coins fall. Every few coins brings a short, useful tip.' },
        { href: '/word-bloom.html', title: 'Word Bloom', time: '2 min a level', cta: 'Swipe the petals',
          why: 'Try this when your brain wants words instead of people. Swipe across a wheel of letters to find the hidden ones.' },
        { href: '/quiet-crossword.html', title: 'Quiet Crossword', time: '5 min', cta: 'Start a crossword',
          why: 'Try this for a small crossword with no clock. Five levels, from easy up.' },
        { href: '/frequency-buddies.html?ep=s1e4#episode-player', title: 'Cartoon: Who Broke the Kite?', time: '19 min', cta: 'Watch episode 4',
          why: 'Try this when you want a story instead of a task. A seaside kite race, a kite in the waves, and two pals who blame each other until they look at what really broke.' },
        { href: '/bears-dojo.html', title: 'The Bears Dojo', time: '5 min', cta: 'Wander in',
          why: 'Good when you want to wander. A quiet temple garden, a bear to build, and a music corner.' },
        { href: '/pal-cam-tv.html', title: 'Pal Cam TV', time: 'All day', cta: 'Put it on the TV',
          why: 'Try this when you want the pups on in the background: calm music, and light that follows the time of day.' }
      ] }
  ];

  var BY = {};
  INTENTS.forEach(function (n) { BY[n.slug] = n; });
  G.TOLIntents = { groups: GROUPS, list: INTENTS, by: BY, get: function (s) { return BY[String(s || '').toLowerCase()] || null; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = G.TOLIntents;
})(typeof window !== 'undefined' ? window : globalThis);
