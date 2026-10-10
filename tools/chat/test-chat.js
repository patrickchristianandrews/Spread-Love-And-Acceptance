#!/usr/bin/env node
/* test-chat.js — questions for Professor Puddles, with the page, card, playbook or note each should land on.
   Runs site-chat.js in Node (see chat-sandbox.js), exactly as the page runs it, with nothing sent anywhere.

     node tools/chat/test-chat.js            # all tests, a summary and the failures
     node tools/chat/test-chat.js -v         # also print every reply
     node tools/chat/test-chat.js calc       # only groups whose name contains "calc"

   Each test: { g: group, q: question | convo: [q, q, …] (the last reply is checked), and any of:
     kind   'card' | 'sit' | 'bg' | 'calc' | 'safety' | 'offtopic' | 'clarify' | 'road'
     id     exact id (card id, 'who+issue' for a playbook, background slug), or a RegExp
     link   a path (or list of paths): some link in the reply must start with one of them
     text   RegExp the reply text must match;  not: RegExp it must not match
     script true: the reply includes a ready-to-use sentence;  steps: true: a list of steps
     bgLoaded false: the background notes must still be unloaded after this test (fresh chat)
     chip / nochip: RegExp some chip label must (not) match;  info: true or a layout name: the reply holds a drawable infographic } */
'use strict';
const { makeChat, replyText, replyLinks } = require('./chat-sandbox');

const T = [];
function t(g, q, e) { T.push(Object.assign({ g, q }, e || {})); }
function c(g, convo, e) { T.push(Object.assign({ g, convo }, e || {})); }

// ---------------------------------------------------------------- every tool
t('tools', 'What is the Lemonade Stand?', { kind: 'card', id: 'lemonade', link: '/lemonade-stand.html' });
t('tools', 'How do I use the lemonade stand?', { kind: 'card', id: 'lemonade', steps: true });
t('tools', 'What do the Lemonade Stand results mean?', { kind: 'card', id: 'lemonade', text: /not a verdict|judgment/ });
t('tools', 'Can I use the Lemonade Stand just for me?', { kind: 'card', id: 'lemonade', text: /Just me/, link: '/lemonade-stand.html' });
t('tools', 'Does the lemonade stand have a task library?', { kind: 'card', id: 'lemonade', text: /task library/ });
t('tools', 'How do I make a wiring card?', { kind: 'card', id: 'wiringcard', link: '/wiring-card.html' });
t('tools', 'what is the signal translator for', { kind: 'card', id: 'signal', link: '/signal-translator.html' });
t('tools', 'How does the Carrier Wave Decoder work?', { kind: 'card', id: 'decoder', link: '/carrier-wave-decoder.html' });
t('tools', 'Can I paste a text thread into the conversation reader?', { kind: 'card', id: 'reader', link: '/conversation-reader.html' });
t('tools', "How do I use Today's Weather?", { kind: 'card', id: 'weather', link: '/quick-checks.html' });
t('tools', 'What does my Today’s Weather forecast mean?', { kind: 'card', id: 'weather', text: /not a measurement|conditions pass/ });
t('tools', 'What is the 2 minute snapshot?', { kind: 'card', id: 'snapshot', link: '/snapshot/' });
t('tools', 'What do the Snapshot results mean?', { kind: 'card', id: 'snapshot', text: /Steady.*Stretched thin|Stretched thin/ });
t('tools', 'How does Frequency Calibration work?', { kind: 'card', id: 'freqcal', link: '/tools/frequency-calibration.html' });
t('tools', 'what is the frequency sync visualizer', { kind: 'card', id: 'syncviz' });
t('tools', 'What is Mood Arbitrage?', { kind: 'card', id: 'mood', link: '/tools/soften-a-tense-moment.html' });
t('tools', 'What is Drift?', { kind: 'card', id: 'drift', link: '/calm-visualizer.html' });
t('tools', 'Do I need headphones for the calm visualizer?', { kind: 'card', id: 'drift', text: /headphones/i });
t('tools', 'How do I play the Night Garden?', { kind: 'card', id: 'garden', link: '/night-garden.html' });
t('tools', 'What games are there?', { kind: 'card', id: 'pauseplay', link: '/pause-and-play.html' });
t('tools', 'How do I play Word Bloom?', { kind: 'card', id: 'wordbloom', steps: true });
t('tools', 'What is the Quiet Crossword?', { kind: 'card', id: 'quietcross' });
t('tools', 'Tell me about the Daily Ledger crossword', { kind: 'card', id: 'dailycross' });
t('tools', 'What is Quiet Words?', { kind: 'card', id: 'quietwords' });
t('tools', 'What is the Frequency Journey?', { kind: 'card', id: 'journey', link: '/frequency-journey.html' });
t('tools', 'Who are Tidbit and Sugarfoot?', { kind: 'card', id: 'journey', text: /Tidbit and Sugarfoot/ });
t('tools', 'Is there a maze game with Tidbit and Sugarfoot?', { kind: 'card', id: 'journey', link: '/frequency-journey.html' });
t('tools', 'What is the pal cam?', { kind: 'card', id: 'palcam', text: /Journey/ });
t('tools', 'How do I check in on Tidbit and Sugarfoot?', { kind: 'card', id: 'palcam', steps: true });
t('tools', 'What are the soundscapes?', { kind: 'card', id: 'soundscapes' });
t('tools', 'What is Echoes of Gold?', { kind: 'card', id: 'album' });
t('tools', 'Is there a podcast?', { kind: 'card', id: 'podcast' });
t('tools', 'What is Turning Toward?', { kind: 'card', id: 'turning', link: '/turning-toward.html' });
t('tools', 'What is complacency?', { kind: 'term', link: '/complacency.html' });
t('tools', 'What is the Re-check Drive?', { kind: 'card', id: 'recheckdrive', link: '/recheck-drive.html' });
t('tools', 'is there a football game about this', { kind: 'card', id: 'recheckdrive', link: '/recheck-drive.html' });
t('tools', 'we are in a fight right now and both upset, what do we say', { link: '/upset-right-now.html', steps: true, text: /pause line|come back to this at eight|pick this up at eight/ });
t('tools', 'tell me about the new baby page', { kind: 'card', id: 'new-parent', link: '/new-parent.html' });
t('tools', 'how do I put the app on my android phone', { kind: 'card', id: 'app', link: '/install.html' });
t('tools', 'can the app have widgets', { kind: 'card', id: 'app', text: /native app/ });
t('tools', 'what are the five love languages', { kind: 'card', id: 'love-languages', link: '/love-languages.html' });
t('tools', 'where are all the formulas and cut-offs written out', { kind: 'card', id: 'method-and-limits', link: '/method-and-limits.html' });
t('tools', 'can I feel the sound with vibration on my phone', { kind: 'card', id: 'senses', link: '/soundscapes.html' });
t('tools', 'what are the brain breakers', { kind: 'card', id: 'brainbreak', link: '/soundscapes.html' });
t('tools', 'which soundscape should I pick', { kind: 'card', id: 'findsound', link: '/soundscapes.html' });
t('tools', 'how do I say sorry so it lands', { kind: 'card', id: 'apologylang', link: '/apology-languages.html' });
t('tools', 'how do I show appreciation to my team at work', { kind: 'card', id: 'appreciationwork', link: '/appreciation-at-work.html' });
t('tools', 'how do love languages and apology languages fit together', { kind: 'card', id: 'languageshub', link: '/languages-of-connection.html' });
t('tools', 'what is a touchstone', { kind: 'card', id: 'touchstones', link: '/touchstones.html' });
t('tools', 'where does the book start', { kind: 'card', id: 'bookparts', link: '/book/self-1-then.html' });
t('tools', 'is there a part of the book about myself', { kind: 'card', id: 'bookparts', link: '/book/self-1-then.html' });
t('tools', 'What are touchstones?', { link: ['/complacency.html#touchstones', '/library/connection.html#shared-language'] });
t('tools', 'how do I bring back an inside joke or pet name', { link: ['/complacency.html#touchstones', '/library/connection.html#shared-language'] });
t('tools', 'how do I stop taking my partner for granted', { link: ['/complacency.html', '/library/connection.html#complacency', '/turning-toward.html'] });
t('tools', 'What is the check-ins guide?', { kind: 'card', id: 'checkins', link: '/check-ins.html' });
t('tools', 'What is know your own wiring about?', { kind: 'card', id: 'knowyourself', link: '/know-yourself.html' });
t('tools', 'What is Wired Differently?', { kind: 'card', id: 'wired' });
t('tools', 'How do I build my workpaper suite?', { kind: 'card', id: 'suite', link: '/workpapers/fill/suite.html' });
t('tools', 'What is the full path package?', { kind: 'card', id: 'fullpath', link: '/workpapers/fill/suite.html' });
t('tools', 'How do I fill in workpapers on screen?', { kind: 'card', id: /fillin|suite/ });
t('tools', 'What is the workpaper playground?', { kind: 'card', id: 'playground', link: '/do/' });
t('tools', 'What is PROG-01?', { kind: 'card', id: 'prog01', link: '/prog-01.html' });
t('tools', 'How does REPORT-01 work?', { kind: 'card', id: 'report01', link: '/workpapers/report-01.html' });
t('tools', 'What is the Professor’s Library?', { kind: 'card', id: 'library', link: '/library.html' });
t('tools', 'Where can I find articles to read?', { kind: 'card', id: 'reading', link: '/reading.html' });
t('tools', 'what does matching energy mean', { kind: 'card', id: 'control', link: '/book/self-2-now-in-depth.html#control' });
t('tools', 'what is in my control', { kind: 'card', id: 'control' });
t('tools', 'find me an article about stress', { kind: 'card', id: 'reading', text: /good articles on “stress”/, link: '/reading.html' });
t('tools', 'any good articles on apologies?', { kind: 'card', id: 'reading', text: /apolog/i });
t('tools', 'recommend something to read about ADHD', { kind: 'card', id: 'reading', text: /ADHD|attention/i });
c('tools', ['find me an article about stress', 'more articles'], { kind: 'card', id: 'reading', text: /stress/ });
t('tools', 'What is the Frequency Framework?', { kind: 'card', id: 'freqframe' });
t('tools', 'What does the one page infographic cover?', { kind: 'card', id: 'infographic' });

// ---------------------------------------------------------------- every workpaper
t('workpapers', 'What is WP-01?', { kind: 'card', id: 'wp01', link: '/workpapers/wp-01.html' });
t('workpapers', 'How do I fill in the field audit?', { kind: 'card', id: 'wp01', steps: true });
t('workpapers', 'What is WP-02?', { kind: 'card', id: 'wp02', link: '/workpapers/wp-02-how-much-are-you-carrying.html' });
t('workpapers', 'What does my battery score mean?', { kind: 'card', id: 'wp02', text: /0\.3.*0\.6/ });
t('workpapers', 'Show me the math for WP-02', { kind: 'card', id: 'wp02', text: /divide by 20|÷ 20/ });
t('workpapers', 'What is the RACI treaty?', { kind: 'card', id: 'wp03', link: '/workpapers/wp-03-one-owner-per-job.html' });
t('workpapers', 'How is ownership clarity worked out?', { kind: 'card', id: 'wp03', text: /divide|÷/ });
t('workpapers', 'What is WP-04?', { kind: 'card', id: 'wp04', link: '/workpapers/wp-04-what-keeps-coming-back.html' });
t('workpapers', 'How do I do the monthly look-back?', { kind: 'card', id: 'wp04', steps: true });
t('workpapers', 'What is the tone filter?', { kind: 'card', id: 'wp09', link: '/workpapers/wp-09-say-it-so-it-lands.html' });
t('workpapers', 'Give me an example of fact feeling and ask', { kind: 'card', id: 'wp09' });
t('workpapers', 'What is WP-11?', { kind: 'card', id: 'wp11', link: '/wp-11.html' });
t('workpapers', 'When do I go back after using the calm-down kit?', { kind: 'card', id: 'wp11' });
t('workpapers', 'What is WP-13?', { kind: 'card', id: 'wp13', link: '/workpapers/wp-13-daily-check-in.html' });
t('workpapers', 'How does the 90 second check-in work?', { kind: 'card', id: 'wp13', steps: true });
t('workpapers', 'In what order should I use the workpapers?', { kind: 'card', id: 'order' });

// ---------------------------------------------------------------- calculators: explained, and worked out in chat (numbers checked by hand)
t('calc', 'How does CALC-01 work?', { kind: 'card', id: 'calc01', link: '/workpapers/calculators/is-the-setup-working-quick.html' });
t('calc', 'Show me the math for CALC-01', { kind: 'card', id: 'calc01', text: /0\.40 × workload balance.*0\.35.*0\.25/ });
t('calc', 'What does my CALC-01 score mean?', { kind: 'card', id: 'calc01', text: /0\.70 or more.*0\.40 to 0\.69.*Under 0\.40/ });
t('calc', 'Does CALC-01 work for more than two people?', { text: /two to eight|2 to 8|2–8/ });
// 3+2+4+1+2 = 12, 12 ÷ 20 = 0.60 → the middle band (0.3 to 0.6)
t('calc', 'my battery answers are 3,2,4,1,2', { kind: 'calc', text: /= 12\..*0\.60.*Between 0\.3 and 0\.6/s, link: '/workpapers/wp-02' });
// 0+0+1+0+1 = 2 → 0.10 → under 0.3
t('calc', 'WP-02: 0 0 1 0 1', { kind: 'calc', text: /= 2\..*0\.10.*Under 0\.3/s });
// 4+4+3+4+2 = 17 → 0.85 → over 0.6
t('calc', 'battery meter answers 4, 4, 3, 4, 2', { kind: 'calc', text: /= 17\..*0\.85.*Over 0\.6/s });
// 1+1+1+2+1 = 6 → 0.30 → the middle band starts at 0.3
t('calc', 'my battery: 1,1,1,2,1', { kind: 'calc', text: /0\.30.*Between 0\.3 and 0\.6/s });
t('calc', 'my battery answers are 5, 2, 1, 0, 0', { kind: 'calc', text: /0 \(not at all\) to 4/ });
t('calc', 'my battery score is 0.45, what does it mean', { kind: 'calc', text: /0\.45.*Between 0\.3 and 0\.6/s });
// 0.40×0.6 + 0.35×0.5 + 0.25×(1−0.4) = 0.24 + 0.175 + 0.15 = 0.565 → 0.57, drifting; biggest gap ownership (0.175 missing)
t('calc', 'CALC-01: balance 0.6, ownership 0.5, battery 0.4', { kind: 'calc', text: /= 0\.57\..*0\.40 to 0\.69.*ownership clarity/s, link: '/workpapers/calculators/is-the-setup-working-quick.html' });
// 0.32 + 0.28 + 0.2 = 0.80 → carrying its own weight
t('calc', 'solvency with workload balance 80%, ownership clarity 80%, stress 20%', { kind: 'calc', text: /= 0\.80\..*0\.70 or more/s });
// 0.12 + 0.07 + 0.05 = 0.24 → under 0.40
t('calc', 'calc01 0.3 0.2 0.8', { kind: 'calc', text: /= 0\.24\..*Under 0\.40/s });
// apex: 0.35×0.6 + 0.30×0.5 + 0.20×0.6 + 0.15×0.25 = 0.21 + 0.15 + 0.12 + 0.0375 = 0.5175 → 0.52
t('calc', 'CALC-01 balance 0.6 ownership 0.5 battery 0.4 retuning 0.25', { kind: 'calc', text: /overall score .*= 0\.52/ });
t('calc', 'my solvency read is 0.72', { kind: 'calc', text: /0\.72.*carrying its own weight/s });
// 30 and 10 hours: 75% and 25% → 1 − |75 − 25| ÷ 100 = 0.50
t('calc', 'I do 30 hours and my partner does 10 hours, what is our balance?', { kind: 'calc', text: /75%.*25%.*0\.50/s });
t('calc', 'Every calculator reply says it is not a verdict', { convo: ['my battery answers are 2,2,2,2,2'], kind: 'calc', text: /not a verdict/ });

// ---------------------------------------------------------------- the Five Pillars, the book, access, privacy
t('program', 'What are the five pillars?', { kind: 'card', id: 'pillars', link: '/five-pillars.html' });
t('program', 'What is Pillar III?', { kind: 'card', id: 'pillar3' });
t('program', 'Explain notice the quiet incentives', { kind: 'card', id: 'pillar5' });
t('program', 'What is Chapter II about?', { kind: 'card', id: 'ch2', link: '/book/chapter-2.html' });
t('program', 'What is chapter 3?', { kind: 'card', id: 'ch3' });
t('program', 'What is Chapter IV, two kinds of fair?', { kind: 'card', id: 'ch4' });
t('program', 'What is the preface about?', { kind: 'card', id: 'preface', link: '/book/preface.html' });
t('program', 'What is Unbilled Debt?', { link: ['/book/preface', '/library/', '/infographic'] });
t('program', 'Where do I start?', { kind: 'card', id: 'start', link: '/start-here.html' });
t('program', 'Which tool fits my situation?', { kind: 'card', id: 'whichtool' });
t('program', 'Can I do this on my own if my partner won’t join?', { kind: 'card', id: 'alone' });
t('program', 'Does this work for 3 people?', { kind: 'card', id: 'group3', text: /two to eight/ });
t('program', 'Is this therapy?', { kind: 'card', id: 'therapy', text: /isn’t therapy/ });
t('program', 'Is it free?', { kind: 'card', id: 'free', link: '/ways-in.html' });
t('program', 'How do I sign up for membership?', { kind: 'card', id: 'free' });
t('program', 'Is my data private?', { kind: 'card', id: 'privacy', link: '/legal/privacy-policy.html' });
t('program', 'How long does it take?', { kind: 'card', id: 'howlong' });
t('program', 'What is the difference between the simple version and the in depth version?', { kind: 'card', id: 'simpledeep' });
t('program', 'How do I save my work?', { kind: 'card', id: 'save' });
t('program', 'Who made this?', { link: '/about' });
t('program', 'What is this site?', { kind: 'card', id: 'tol' });
t('program', 'What is Pause & Play?', { kind: 'card', id: 'pauseplay' });

// ---------------------------------------------------------------- situations: advice with a reflection, steps, a script and a link
const SIT = { kind: 'sit', script: true, steps: true, text: /you know your situation best/i };
function s(q, id, extra) { t('situations', q, Object.assign({}, SIT, { id }, extra || {})); }
s('I snapped at my roommate this morning and feel awful.', 'roommate+repair', { text: /Feeling awful afterward/ });
s('My coworker keeps interrupting me in meetings.', 'coworker+interrupt');
s('I shut down when my partner raises their voice.', 'partner+shutdown');
s('My sister always makes plans without asking me.', 'family+decisions', { text: /your sister/ });
s("I can't get myself to start the dishes.", 'self+motivation');
s("My teen won't talk to me.", 'kid+distance');
s('I feel like I do everything at home.', 'other+load');
s('I procrastinate on everything lately', 'self+motivation');
s('I overreact to small things and then feel bad', 'self+overreact');
s('I feel stretched thin', 'self+overwhelm');
s('I keep replaying a conversation from work and cannot stop thinking about it', /self\+worry|coworker\+worry/);
s("I'm so hard on myself, I feel like a failure", 'self+selfcrit');
s("I can't say no to anyone", 'self+peoplepleasing');
s('My husband never helps with the housework and I end up doing all the dishes', 'partner+fairness');
s('My boyfriend and I have the same fight every week', 'partner+pattern');
s('My wife brings up big stuff right before bed when I am exhausted', 'partner+timing');
s('My partner always texts me in a tone that sounds angry', 'partner+tone');
s('My mom drops by unannounced all the time', 'family+boundaries');
s('My dad criticizes everything I do', 'family+criticism');
s('My kid leaves dirty dishes everywhere and never cleans up', /kid\+(mess|fairness)/);
s('My son is always on his phone at dinner', 'kid+phone');
s('Handoffs with my ex are really tense', 'coparent+handoffs');
s('My ex changes the schedule last minute every week', /coparent\+(handoffs|reliability)/);
s('My co-parent sends rude texts and they always turn into fights', 'coparent+tone');
s("My roommates don't do their share of chores", 'roommate+fairness');
t('situations', 'My roommate always pays their share of the rent late', { id: 'rentlate' });
s('There are three of us roommates and nobody agrees on chores', 'roommate+group');
s('My boss takes credit for my work', 'coworker+credit');
s('On my team of seven nobody owns anything and tasks fall through the cracks', /coworker\+(ownership|group)/);
s('My manager criticizes my work in front of everyone', 'coworker+criticism');
s('My friend keeps cancelling plans last minute', 'friend+reliability');
// a drifting friendship has its own page now (friends.html)
t('situations', 'My best friend and I are drifting apart', { id: 'friends', link: '/friends.html' });
s('My friend took my text the wrong way', 'friend+tone');
s("I'm caring for my mom and running on empty", /caregiving\+(overwhelm|care)/);
s("I'm caring for my husband after his surgery and doing everything", /caregiving\+(care|load|overwhelm)/);
s("I do all the caregiving for my dad and my siblings don't help", /caregiving\+care|family\+care/);
s("I'm autistic and my partner doesn't get that I take things literally", 'partner+wiring');
s('My partner never says thank you and I feel taken for granted', 'partner+appreciation');
s("I don't know how to bring up money with my girlfriend", /partner\+(raise|money)/);
s('My partner and I feel distant lately', 'partner+distance');
s('My brother keeps borrowing my stuff without asking', 'family+boundaries');
s('I yelled at my kids and feel guilty', 'kid+repair');
s('My partner procrastinates on everything', 'partner+motivation', { text: /hard to watch|struggle to get started/ });
// "roommates" said about a partner means drifting apart, not sharing a flat
s("My partner and I have gotten complacent and are on autopilot", 'partner+complacency', { link: '/complacency.html', text: /real question|thank-you|re-check/i });
s("My husband and I have gone stale and are stuck in a rut", 'partner+complacency', { link: '/complacency.html' });
s("I feel like I'm coasting and on autopilot", 'self+complacency', { link: '/complacency.html' });
s("I feel like we're roommates", 'partner+distance', { link: '/turning-toward.html', not: /your roommate/i });
s("My husband and I are just roommates now", 'partner+distance', { link: '/turning-toward.html', text: /turn toward|ritual/i, not: /your roommate/i });

// ---------------------------------------------------------------- situation routing: a short path for a kind of relationship
t('routing', 'Which tools should roommates start with?', { kind: 'road', id: 'roommate', link: '/lemonade-stand.html' });
t('routing', 'What path should co-parents follow?', { kind: 'road', id: 'coparent', link: '/workpapers/wp-03-one-owner-per-job.html' });
t('routing', 'Which tools should caregivers start with?', { kind: 'road', id: 'caregiving', link: '/workpapers/wp-02-how-much-are-you-carrying.html' });
t('routing', 'Which tools should coworkers and teams start with?', { kind: 'road', id: 'coworker' });

// ---------------------------------------------------------------- earlier review failures
t('review', 'How do I make handoffs with my ex calmer?', { link: ['/relationships-in-depth.html#co-parents', '/workpapers/wp-03', '/workpapers/wp-09'] });
t('review', 'How do I talk to my teenager?', { link: ['/library/life.html#teenagers', '/turning-toward.html', '/relationships-in-depth.html#family'] });
t('review', 'My wife had surgery and I am doing everything for her', { kind: 'sit', id: /caregiving\+/, link: ['/relationships-in-depth.html#caregivers', '/workpapers/wp-02', '/workpapers/wp-03'] });
t('review', 'Does the lemonade stand work for 3 roommates?', { link: '/lemonade-stand.html', text: /two to eight/ });
t('review', 'How do I use this with my team of seven?', { link: ['/relationships-in-depth.html#coworkers', '/lemonade-stand.html', '/workpapers/wp-03'], text: /two to eight|seven/ });
t('review', 'We are 3 roommates, how do we split bills fairly?', { link: ['/lemonade-stand.html', '/relationships-in-depth.html#roommates'] });

// ---------------------------------------------------------------- background notes (not pages on the site)
const BG = { kind: 'bg', text: /background notes \(not a page on this site\)/ };
function b(q, id, extra) { t('background', q, Object.assign({}, BG, { id }, extra || {})); }
b('What is a BIFF response?', 'biff-responses');
b('What is the zone of possible agreement?', 'the-zone-of-possible-agreement');
b('Explain the Eisenhower matrix', 'eisenhower-matrix');
b('What is kinkeeping?', 'kinkeeping');
b('What is parallel parenting?', 'parallel-parenting');
b('What is body doubling?', 'body-doubling');
b('What is the ladder of inference?', 'ladder-of-inference');
b('What is emotional cutoff?', 'emotional-cutoff');
b('What is satisficing?', 'satisficing');
b('What is a pre-mortem?', 'pre-mortem');
b('What is saving face?', 'saving-face');
b('What is time blindness?', 'time-blindness');
b('What is the two-minute start?', 'the-two-minute-start');
b('What is sunk cost thinking?', 'sunk-cost-thinking');
b('Tell me about roommate agreements', 'roommate-agreement');
b('How should I plan a money date?', 'money-dates');
b('What is a care notebook?', 'care-notebook');
b('What is the emotion wheel?', 'the-emotion-wheel');
b('Tell me about read receipts', 'read-receipts');
b('What are tone indicators?', 'tone-indicators');
t('background', 'Every background answer points to a site page', { q: 'What is a walk-away point?', kind: 'bg', id: 'walk-away-point', link: '/' });

// ---------------------------------------------------------------- follow-ups use the conversation so far
c('followups', ['What is a BIFF response?', 'Give me an example'], { text: /Thanks for letting me know/ });
c('followups', ['What is a BIFF response?', 'tell me more'], { kind: 'bg', id: 'biff-responses' });
c('followups', ['I snapped at my roommate this morning and feel awful.', 'give me an example'], { text: /Robin/ });
c('followups', ['I snapped at my roommate this morning and feel awful.', 'what about for coworkers?'], { kind: 'sit', id: 'coworker+repair', script: true });
c('followups', ['I snapped at my roommate this morning and feel awful.', 'another way to say it'], { kind: 'sit-more', text: /another way/ });
c('followups', ['My coworker keeps interrupting me in meetings.', 'how do I start?'], { text: /Start small/, link: '/signal-translator.html' });
c('followups', ['What is the Lemonade Stand?', 'how do I start?'], { steps: true, link: '/lemonade-stand.html' });
c('followups', ['What is the Lemonade Stand?', 'give me an example'], { text: /roommates listed 14 jobs/ });
c('followups', ['What is WP-13?', 'what about for roommates?'], { kind: 'road', id: 'roommate' });
c('followups', ['My sister always makes plans without asking me.', 'tell me more'], { link: '/library/' });
c('followups', ['What is the Journey?', 'tell me more'], { text: /pal cam|quicker|steadier/ });
c('followups', ['What is active listening?', 'tell me more'], { not: /couldn’t find/ });
// conversation turns: keep the topic, plain thanks, red flags, "that didn't help", topic switches
c('followups', ['My partner never does the dishes', 'ok and then what?'], { kind: 'sit-more', text: /calm conversation/ });
c('followups', ['My partner never does the dishes', 'ok and then what?', 'and then what'], { kind: 'sit-more', text: /one ordinary week/ });
c('followups', ['My partner never does the dishes', 'that didn’t help'], { kind: 'nohelp', text: /another side/ });
c('followups', ['My partner never does the dishes', 'I already tried that'], { kind: 'nohelp', text: /already tried/ });
c('followups', ['We keep fighting about money', 'is that a red flag?'], { kind: 'redflag', text: /fixable/, link: '/safety.html' });
c('followups', ['We keep fighting about money', 'is that a red flag?', 'what should I do first?'], { kind: 'sit-more' });
c('followups', ['I feel lonely since my mom died', 'what about my sister?'], { kind: 'care', text: /your sister/ });
c('followups', ['My partner never does the dishes', 'different question, how do I calm down fast'], { kind: 'care', link: '/night-garden.html' });
c('followups', ['My partner never does the dishes', 'start over'], { kind: 'restart' });
// Puddles answers thanks in his own voice (personality.json thanks_replies), so only the kind is fixed
c('followups', ['My partner never does the dishes', 'thanks'], { kind: 'thanks', not: /dishes|Lemonade/ });
c('followups', ['thank you so much puddles'], { kind: 'thanks' });
c('followups', ['is this controlling?'], { kind: 'redflag', link: '/safety.html' });

// ---------------------------------------------------------------- friendly clarifying questions
t('clarify', 'help', { kind: 'clarify' });
t('clarify', 'check in', { kind: 'clarify', text: /two kinds of check-in/ });
t('clarify', 'my partner', { kind: 'clarify', text: /your partner/ });
t('clarify', 'score', { kind: 'clarify' });
t('clarify', 'my roommates', { kind: 'clarify' });

// ---------------------------------------------------------------- off topic and safety: polite, short, and no background notes
function o(q) { t('offtopic', q, { kind: 'offtopic', bgLoaded: false }); }
o('How do I fix my car?');
o('Write my resume');
o('Give me a recipe for banana bread');
o('What stocks should I buy?');
o('What is the weather forecast for tomorrow?');
o('Help me with my python homework');
o('Who won the football game?');
o('How do I change my tires?');
// danger from another person: the reply names the DV hotline and the safety page, never tips
function d(q) { t('safety', q, { kind: 'safety', text: /Domestic Violence Hotline[\s\S]*not your fault|not your fault[\s\S]*Domestic Violence Hotline/, link: '/safety.html' }); }
d('My partner hits me');
t('safety', 'I want to kill myself', { kind: 'safety', text: /qualified professional[\s\S]*988/ });
t('safety', 'I don\'t want to be here anymore', { kind: 'safety', text: /988/ });
t('safety', 'mid-chat: better off without me', { q: 'everyone would be better off without me', kind: 'safety', text: /988/ });
d('I am scared of my husband');
d('He threatened to hurt me');
t('safety', 'I was so mad I wanted to scream (not danger)', { q: 'I was so frustrated with my roommate I wanted to scream', not: /emergency/ });

// ---------------------------------------------------------------- the site's own pages still answer
t('pages', 'What are bids for connection?', { link: ['/library/relationships.html', '/turning-toward'] });
t('pages', 'What is the double empathy problem?', { link: ['/wired-differently', '/library/wiring.html', '/know-yourself'] });
t('pages', 'What is flooding?', { link: ['/library/', '/wp-11', '/book/', '/check-ins'] });
// covered by the Library, so the site page answers rather than the background notes
t('pages', 'What is habit stacking?', { link: '/library/', not: /background notes/ });
t('pages', 'What is triangulation in families?', { link: '/library/life.html', not: /background notes/ });
t('pages', 'What is the mental load?', { link: ['/library/fairness.html', '/book/preface', '/lemonade'] });
t('pages', 'Why do I react this way?', { link: ['/know-yourself'] });
t('pages', 'Surprise me', { not: /couldn’t find/ });

// ---------------------------------------------------------------- a first-time tester's questions
// in-scope, short or feeling-led messages never get "outside my little pond"
const NOT_POND = /outside my little pond|only be guessing|not something I know about/;
t('tester', 'we fought again', { kind: 'sit', id: /afterfight/, not: NOT_POND, script: true });
t('tester', "why does he always say i'm overreacting", { kind: 'sit', id: /dismissed/, not: NOT_POND });
t('tester', 'idk', { kind: 'clarify', not: NOT_POND });
t('tester', 'is it normal to feel resentful', { kind: 'sit', id: /resentment/, text: /normal/ });
t('tester', 'holidays are stressful for us', { kind: 'sit', id: 'family+holidays' });
t('tester', 'can i use this if im single', { kind: 'card', id: 'single', text: /Yes/ });
t('tester', 'my friend always talks about herself', { kind: 'sit', id: 'friend+onesided' });
t('tester', 'my brother and i fight about who hosts thanksgiving', { kind: 'sit', id: 'family+holidays', text: /brother|host/ });
t('tester', 'how do i get my friends to help plan the trip', { kind: 'sit', id: 'friend+trip', script: true });
t('tester', 'ugh my sister', { not: NOT_POND });
t('tester', 'the group chat is so dead nobody replies', { kind: 'sit', id: /groupchat/ });
// typos in tool names and workpaper codes
t('tester', 'conversaton reader', { kind: 'card', id: 'reader' });
t('tester', 'signal translater', { kind: 'card', id: 'signal' });
t('tester', 'lemonaid stand', { kind: 'card', id: 'lemonade' });
t('tester', 'work paper three', { kind: 'card', id: 'wp03' });
t('tester', 'what is wp-o1', { kind: 'card', id: 'wp01' });
t('tester', 'where do i stand with my partner', { not: /^Here’s how to use/ });
// perspective: who is doing it
t('tester', 'my partner goes quiet whenever we argue', { kind: 'sit', id: 'partner+shutdown', text: /your partner goes quiet|when .*go quiet/, not: /Shutting down when your partner raises/ });
t('tester', 'i shut down when my partner yells', { kind: 'sit', id: 'partner+shutdown', text: /Shutting down when/ });
t('tester', 'when my partner raises his voice i freeze', { kind: 'sit', id: 'partner+shutdown', text: /Shutting down when/ });
t('tester', 'how do i say no to my mom', { kind: 'sit', id: 'family+peoplepleasing', not: /Make it easy for your mom to say no/ });
t('tester', 'my mom needs more care and my brother does nothing', { kind: 'sit', id: 'family+siblingcare', text: /your brother/, not: /between you and your mom/ });
t('tester', 'my mom needs more care and my brother does nothing (both sides)', { q: 'my mom needs more care and my brother does nothing', text: /I love helping you|sorting out a plan/ });
t('tester', "my roommate's boyfriend is always over", { kind: 'sit', id: 'roommate+guests' });
// follow-ups keep the topic and the person
c('tester', ['my partner texts me one word answers', "he just writes 'ok.' or 'fine'"], { kind: 'sit', id: 'partner+shorttexts' });
c('tester', ['my partner texts me one word answers', "he just writes 'ok.' or 'fine'", 'give me an example'], { kind: 'sit-more', text: /ok/ });
c('tester', ['my partner texts me one word answers', 'another way to say it'], { kind: 'sit-more', script: true });
c('tester', ['my roommates never do their chores', 'ok but what do I actually DO tonight'], { kind: 'sit-more', text: /tiny step for tonight/, not: /[A-Z]{6,} [A-Z]{4,}/ });
t('tester', 'ok but what do I actually DO tonight', { kind: 'card', id: 'tonight', not: /[A-Z]{6,} [A-Z]{4,}/ });
c('tester', ['what are the five pillars', 'how do i use them'], { kind: 'card', id: 'pillars', text: /\(V\)/ });
t('tester', 'what are the five pillars', { kind: 'card', id: 'pillars', text: /\(V\)/ });
// other misses
t('tester', 'my roommates never do their chores', { kind: 'sit', id: 'roommate+fairness', not: /^Yes\./ });
t('tester', "what if my partner won't do the program", { kind: 'sit', id: 'partner+wontjoin', not: /worry/ });
t('tester', 'my wife and i never have time for each other', { kind: 'sit', id: 'partner+notime', not: /caregiv|surgery/i });
t('tester', 'is there an app', { kind: 'card', id: 'app', text: /home screen/i });
t('tester', 'can we use this together on two phones', { id: 'twophones', link: '/lemonade-stand.html', text: /Together tab/ });
t('tester', 'my battery score of 3', { kind: 'calc', text: /3 ÷ 20 = 0\.15/ });
t('tester', 'My partner sent me this link. Is this going to be used against me?', { kind: 'card', id: 'usedagainst', text: /setup, never a person/ });
t('tester', 'my boss keeps dumping work on me', { kind: 'sit', id: 'coworker+manager' });
t('tester', 'my manager micromanages everything', { kind: 'sit', id: 'coworker+manager' });
t('tester', "i'm always the one who organizes everything for our friend group", { kind: 'sit', id: 'friend+friendgroup' });
t('tester', 'my friends never help plan anything', { kind: 'sit', id: 'friend+friendgroup' });
t('tester', 'we just had a baby and I am exhausted', { kind: 'sit', id: /newbaby/ });
t('tester', 'my partner and i are moving in together', { kind: 'sit', id: 'partner+movingin' });
t('tester', 'my stepkids ignore me', { kind: 'sit', id: /blended/ });
t('tester', 'we are long distance', { kind: 'sit', id: /longdistance/ });
t('tester', 'my partner and i have different standards of clean', { kind: 'sit', id: 'partner+tidiness' });
t('tester', 'i need time to decompress after work', { kind: 'sit', id: /decompress/ });
t('tester', 'my sister in law keeps giving parenting advice', { kind: 'sit', id: 'family+inlaws' });
t('tester', 'my mom keeps comparing me to my sister', { kind: 'sit', id: 'family+comparison' });
t('tester', 'he rolls his eyes whenever i talk', { kind: 'sit', id: /contempt/ });
t('tester', 'i feel taken for granted at work', { kind: 'sit', id: 'coworker+appreciation' });
// every playbook offers one tiny step for tonight
t('tester', 'my coworker keeps interrupting me (tonight chip)', { q: 'my coworker keeps interrupting me', kind: 'sit' });
// no link twice, no bullet twice, no statement chips
t('tester', 'my partner does nothing around the house (no repeats)', { q: 'my partner does nothing around the house', kind: 'sit' });

// ---------------------------------------------------------------- first-time testers, round two
// who did what: being snapped at is not the apology script
const APOLOGY = /I’m sorry I snapped|Apologize for the specific thing/;
t('care', 'my partner snapped at me tonight and I feel stupid for crying', { kind: 'sit', id: 'partner+hurtbythem', text: /don’t have to fix anything tonight/, not: APOLOGY });
t('care', 'my partner snapped at me tonight (crying is not stupid)', { q: 'my partner snapped at me tonight and I feel stupid for crying', text: /Crying when something hurts isn’t stupid/ });
t('care', 'my partner yelled at me', { kind: 'sit', id: 'partner+hurtbythem', not: APOLOGY });
t('care', 'my boss was really rude to me in the meeting', { kind: 'sit', id: /hurtbythem/, not: APOLOGY });
t('care', 'i snapped at my partner this morning (still the apology)', { q: 'i snapped at my partner this morning', kind: 'sit', id: 'partner+repair' });
t('care', 'is it my fault?', { kind: 'care', id: 'fault', text: /rarely one person’s fault/, not: /\bYes\b|your fault/ });
// safety: control and fear are never answered with tips, and always carry the hotline and the safety page
t('safety', 'my partner checks my phone and gets angry', { kind: 'safety', link: '/safety.html', text: /1-800-799-7233/ });
t('safety', 'is it my fault he yells', { kind: 'safety', link: '/safety.html', not: /own your part/ });
t('safety', "I'm scared to go home", { kind: 'safety', link: '/safety.html', text: /88788/ });
t('safety', "he won't let me see my friends", { kind: 'safety', link: '/safety.html' });
t('safety', 'she controls all the money and takes my keys', { kind: 'safety', link: '/safety.html' });
t('safety', 'how do I hide that I visited this site', { kind: 'safety', link: '/safety.html', text: /private window/ });
t('safety', 'I want to end my life', { kind: 'safety', text: /988/ });
// on your own, groups and parents
t('care', 'how do I stop over-giving', { kind: 'care', id: 'overgive', link: '/book/self-2-now-in-depth.html#control' });
t('care', 'how do I set boundaries', { kind: 'care', id: 'overgive' });
t('care', 'I just got divorced and feel lost', { kind: 'care', id: 'onmyown', link: '/self-path.html' });
t('care', 'Is there a leader guide for a church small group?', { kind: 'care', id: 'group', link: '/groups.html' });
t('care', 'how do I raise emotionally healthy kids', { kind: 'care', id: 'raisekids', link: '/parents.html' });
t('care', "I'm 15 and my parents don't understand me", { kind: 'care', id: 'teens', link: '/teens.html' });
t('care', 'my wife died last year and my kids say I have withdrawn', { kind: 'care', id: 'grief', link: '/library/emotions.html' });
t('care', 'how do I calm down fast', { kind: 'care', id: 'calmnow' });
t('care', 'i had a panic attack in the library today', { kind: 'care', id: 'calmnow' });
t('care', 'exam stress is killing me', { not: /Domestic Violence|911/ });
t('situations', 'is it normal to go quiet in a fight', { text: /weakness|overload|pause/ });
c('care', ['my partner snapped at me', 'is it my fault?'], { kind: 'care', id: 'fault', text: /theirs to own/, not: /\bYes\b/ });
c('care', ['my partner snapped at me', 'Tell me more'], { kind: 'care', id: 'fault' });
c('care', ['my partner snapped at me', 'is it my fault?', 'What can I do tonight?'], { kind: 'sit-more', text: /calming thing/ });
t('care', 'my partner yelled at me, is it my fault?', { kind: 'care', id: 'fault', text: /theirs to own/ });
// privacy, plainly
t('care', 'I’m scared my partner will see what I typed here', { kind: 'care', id: 'chatprivacy', text: /Start over.*erases[\s\S]*Closing this tab/ });
t('care', 'how do I delete this chat', { kind: 'care', id: 'chatprivacy', text: /Start over/ });
t('care', 'is this chat saved anywhere', { kind: 'care', id: 'chatprivacy' });
t('care', 'is my data private (the site-wide answer)', { q: 'is my data private', kind: 'card', id: 'privacy' });
// calm, judged, diagnosis, literal answers
t('care', 'can you just tell me something calming', { kind: 'care', id: 'calmnow', link: ['/night-garden.html', '/calm-visualizer.html'] });
t('care', 'I feel judged by this site', { kind: 'care', id: 'judged', text: /welcome here exactly as you are/, not: /[Ss]hame and guilt/ });
t('care', 'I think I am autistic, can you tell me?', { kind: 'care', id: 'diagnose', text: /can’t tell you that/ });
t('care', 'is my husband on the spectrum', { kind: 'care', id: 'diagnose', text: /can’t tell you that/ });
t('care', 'is this a diagnosis? (the therapy card)', { q: 'is this a diagnosis', kind: 'card', id: 'therapy' });
t('care', 'asdfgh', { kind: 'unclear', text: /didn’t catch that/, not: /pond/ });
t('care', 'what’s the difference between the 7-day log and the almanac', { kind: 'care', id: 'weatherlog', text: /same thing/ });
// action, not research
t('care', 'I just had a fight with my partner and I only have 5 minutes', { kind: 'care', id: 'fightnow', link: ['/wp-11.html'], not: /5:1|five positive/ });
t('care', 'we just had a huge argument', { kind: 'care', id: 'fightnow', link: '/carrier-wave-decoder.html#decode' });
t('care', 'what should I do next', { kind: 'care', id: 'nextstep', link: '/conversation-reader.html', not: /ego depletion/ });
t('care', 'give me one thing to do', { kind: 'care', id: 'nextstep', not: /Spending on others/ });
t('care', 'remind me later', { kind: 'care', id: 'remind', text: /can’t send reminders/ });
t('care', 'I only have 10 minutes', { kind: 'care', id: 'minutes', link: '/quick-checks.html#today' });
c('care', ['my roommates never do their chores', 'what should I do next'], { kind: 'sit-more', text: /tiny step for tonight/ });
// the topic doesn't stick to unrelated follow-ups; "tl;dr" shortens the last answer
c('care', ['my partner snapped at me', 'where did I leave off'], { kind: 'care', text: /last talking about being snapped at/ });
t('care', 'where did I leave off (fresh)', { q: 'where did I leave off', kind: 'care', text: /starting fresh/ });
c('care', ['i feel overwhelmed', 'tl;dr please'], { kind: 'short', text: /^In short: /, not: /Thanks for telling me more/ });
c('care', ['what is the lemonade stand', 'make it shorter'], { kind: 'short', text: /^In short: / });
c('care', ['my partner snapped at me', 'how do i make the text bigger'], { kind: 'care', id: 'textsize' });
// household frictions, kindly
t('care', 'i forget chores and my partner is upset', { kind: 'sit', id: 'partner+forgetting', text: /doesn’t mean you don’t care/, not: /log one week|Feeling hurt by that/ });
t('care', 'my partner always forgets to take out the bins', { kind: 'sit', id: 'partner+forgetting', text: /memory and attention/ });
t('care', 'i am always late and my friend is annoyed', { kind: 'sit', id: 'friend+lateness', text: /leave-by alarm/, not: /That frustration makes sense/ });
t('care', 'my roommate leaves the laundry in the washer', { kind: 'sit', id: 'roommate+halfdone', text: /what “done” looks like/ });
t('care', 'i never finish the chores i start', { kind: 'sit', id: /halfdone/ });
// no sentence twice
t('care', 'i feel overwhelmed (no doubled line)', { q: 'i feel overwhelmed', kind: 'sit', not: /not a sign that you’re failing\. Feeling overwhelmed is a signal/ });
t('care', 'i feel overwhelmed (steps first)', { q: 'i feel overwhelmed', kind: 'sit', text: /^[^\n]*\n## Small steps for today/ });
// site settings
t('care', 'how do i make the text bigger', { kind: 'care', id: 'textsize', text: /Text size/, not: /Our Logo|Spread Love & Acceptance/ });
t('care', 'the words are too hard', { kind: 'care', id: 'hardwords', text: /Simple version[\s\S]*Easy reading/ });
// forgiving spelling, with "I think you mean"
t('spelling', 'what is unbiled det', { text: /I think you mean “what is unbilled debt”[\s\S]*[Uu]nbilled [Dd]ebt/, link: '/' });
t('spelling', 'what is unbiled dept', { text: /I think you mean[\s\S]*[Uu]nbilled [Dd]ebt/ });
t('spelling', 'whats unbiled debt', { text: /I think you mean[\s\S]*[Uu]nbilled [Dd]ebt/, not: /pond|guessing/ });
t('spelling', 'were do i start', { kind: 'card', id: 'start', text: /I think you mean “where do I start”/ });
t('spelling', 'i dont no were to begin', { kind: 'card', id: 'start' });
t('spelling', 'how do i stop fihgting about chors', { text: /I think you mean/, not: /pond/ });
t('spelling', 'my partner allways snapps at me', { kind: 'sit', id: /hurtbythem/ });
t('spelling', 'we fought again (a real word stays)', { q: 'we fought again', kind: 'sit', not: /I think you mean/ });
t('spelling', 'What stocks should I buy? (a real word stays)', { q: 'What stocks should I buy?', kind: 'offtopic', not: /I think you mean/ });

// ---------------------------------------------------------------- testers, round three (ADHD, autistic, dyslexic, highly sensitive)
// ADHD: focus and long pages get the reading helps, never kids' screen rules; "where do I start" doesn't carry the last topic
t('nt2', "I can't focus on long pages", { kind: 'care', id: 'focus', text: /Show me only the steps/, not: /[Ss]creen agreements|kids/, link: '/' });
t('nt2', "I can't focus on long pages (all the helps)", { q: "I can't focus on long pages", text: /In short[\s\S]*Simple version[\s\S]*Listen[\s\S]*Easy reading[\s\S]*2, 5 or 10 minutes/ });
c('nt2', ['What is a BIFF response?', "I can't focus on long pages"], { kind: 'care', id: 'focus', not: /[Ss]creen agreements|phones-and-presence/ });
c('nt2', ["I can't focus on long pages", 'where do I start'], { kind: 'card', id: 'start', not: /phones-and-presence|Phones and presence/ });
c('nt2', ['What is a BIFF response?', 'where do I start'], { kind: 'card', id: 'start', link: '/start-here.html' });
c('nt2', ['What is the Lemonade Stand?', 'where do I start?'], { steps: true, link: '/lemonade-stand.html' });
t('nt2', 'where do I start: a first step that takes minutes, not a week', { q: 'where do I start', kind: 'card', id: 'start', not: /Log one week/ });
// ADHD: the person asking is the one doing it
t('nt2', 'how do i stop interupting people', { kind: 'sit', id: /selfinterrupt/, text: /I jumped in|jump in/, not: /keep getting cut off|I sometimes get cut off/ });
t('nt2', 'my partner says I never listen', { kind: 'sit', id: 'partner+selfinterrupt', text: /say back one thing you heard/, not: /keep getting cut off/ });
t('nt2', 'my coworker keeps interrupting me (still being interrupted)', { q: 'my coworker keeps interrupting me', kind: 'sit', id: 'coworker+interrupt' });
// ADHD: a plain yes, with ADHD help, never an autism script
t('nt2', 'I have ADHD', { kind: 'care', id: 'adhd', text: /Yes, this site is for people with ADHD/, not: /take things literally/, script: true });
t('nt2', 'is this site for people with adhd?', { kind: 'care', id: 'adhd', text: /Yes/, not: /take things literally/ });
t('nt2', 'do I have ADHD? (still no diagnosis)', { q: 'do I have ADHD?', kind: 'care', id: 'diagnose' });
t('nt2', "I'm neurodivergent (no literal-only script first)", { q: "I'm neurodivergent", not: /Words you could use[^\n]*\n[^\n]*take things literally|^I’m wired to take things literally/m });
t('nt2', 'I keep starting things and never finishing them', { kind: 'sit', id: /halfdone/, not: /RACI/ });
// ADHD: still excellent
t('nt2', 'I forgot to pay the bill again and my partner is mad', { kind: 'sit', id: 'partner+forgetting', text: /memory slip, not a priority slip/ });
// autistic: idioms explained literally, the site's own words defined, no stale topic
t('nt2', "what does 'read the room' mean", { kind: 'idiom', text: /no real room[\s\S]*how the people around you seem to feel/, not: /phones face down|check-ins/ });
c('nt2', ["what does 'fine.' mean when my partner texts it", "Why do people say 'break a leg'?"], { kind: 'idiom', text: /Good luck/, not: /Let’s stay with|short or slow replies/ });
t('nt2', 'what does "we\'ll see" mean', { kind: 'idiom', text: /isn’t ready to decide/ });
t('nt2', "what does 'fine.' mean when my partner texts it (still a playbook)", { q: "what does 'fine.' mean when my partner texts it", kind: 'sit', id: 'partner+shorttexts' });
t('nt2', 'What exactly does "static" mean? Give a definition, not an example.', { kind: 'term', id: 'static', text: /^Static is the crackle/, not: /outside my little pond|For example/, link: '/glossary.html#static' });
t('nt2', 'define static', { kind: 'term', id: 'static', text: /^Static is the crackle[\s\S]*For example/ });
t('nt2', 'what does frequency mean on this site', { kind: 'term', id: 'frequency', not: /pond/ });
t('nt2', 'what is the carrier wave', { kind: 'term', id: 'carrier-wave' });
t('nt2', 'I had a meltdown at work', { kind: 'care', id: 'meltdown', text: /I’m sorry[\s\S]*recovery comes first/, not: /RACI|team of three/, link: '/wp-11.html' });
t('nt2', 'my kid has meltdowns (not the self card)', { q: 'my kid has meltdowns every night', not: /at work it can feel/ });
t('nt2', 'I stim when I am anxious. Is that bad?', { kind: 'care', id: 'stim', text: /^No, stimming isn’t bad/ });
t('nt2', 'Is my mom to blame for how I am?', { kind: 'care', id: 'parentsblame', text: /^No/, link: '/growing-up' });
t('nt2', "my partner says I'm blunt", { kind: 'sit', id: 'partner+blunt', text: /come across as blunt/, not: /landed as a bit sharp for me/ });
c('nt2', ['what is the lemonade stand', 'I had a meltdown at work'], { kind: 'care', id: 'meltdown', not: /Lemonade/ });
c('nt2', ['I had a meltdown at work', 'what is WP-02?'], { kind: 'card', id: 'wp02', not: /meltdown/ });
// the two lenses are never mixed up
t('nt2', 'What is a lens?', { kind: 'term', id: 'lens', text: /two different ways[\s\S]*Your lens[\s\S]*outside lens/, link: ['/glossary.html#lens', '/growing-up.html'] });
t('nt2', 'what is the outside lens', { kind: 'term', id: 'outsidelens', text: /as if from the outside/, not: /growing up and still use/, link: '/how-it-works-in-depth.html#outside-lens' });
t('nt2', 'what does your lens mean', { kind: 'term', id: 'yourlens', text: /picked up growing up/, not: /as if from the outside:/, link: '/growing-up.html#lens' });
t('nt2', 'what is my lens', { link: '/growing-up', not: /late screens|as if from the outside/ });
// dyslexic: repair help, reading help, the screenshot import, short answers that stay short
t('nt2', 'my partnr is mad at me', { kind: 'sit', id: 'partner+madatme', text: /I think you mean[\s\S]*upset with you/, not: /“Are you mad at me\?” is a real question/, script: true });
t('nt2', 'im dislexic is this site ok for me', { kind: 'care', id: 'dyslexia', text: /Easy reading[\s\S]*Extra large[\s\S]*Simple version/, not2: /Listen/, not: /take things literally/ });
t('nt2', 'can i use a screen shot', { kind: 'care', id: 'screenshot', text: /Choose screenshots/, link: '/conversation-reader.html', not: /phone-free|attention/ });
t('nt2', 'how do i make the writing biger (Extra large)', { q: 'how do i make the writing biger', kind: 'care', id: 'textsize', text: /Extra large/ });
c('nt2', ['what is the lemonade stand', 'make it shorter', 'what is the signal translator'], { kind: 'card', id: 'signal', text: /^In short: /, not: /## How to use it/ });
c('nt2', ['what is the lemonade stand', 'make it shorter', 'what is the signal translator', 'I feel overwhelmed'], { kind: 'sit', text: /^In short: /, not: /What might be going on/ });
c('nt2', ['what is the lemonade stand', 'make it shorter', 'what is the signal translator', 'tell me more'], { kind: 'card', id: 'signal', text: /## How to use it/ });
c('nt2', ['what is the lemonade stand', 'make it shorter', 'what is the signal translator', 'tell me more', 'what is WP-02'], { kind: 'card', id: 'wp02', text: /## How to use it/ });
c('nt2', ['make it shorter', 'what is WP-02'], { kind: 'card', id: 'wp02', text: /^In short: / });
c('nt2', ['keep your answers short', 'my partner snapped at me'], { kind: 'sit', text: /^In short: I’m sorry\. Being snapped at/, script: true });
t('nt2', 'too long didnt read (points to the short ways in)', { q: 'too long didnt read', kind: 'short', text: /Simple version[\s\S]*In short/ });
// highly sensitive: warm and on topic, and no words they didn't use
t('nt2', "I feel everyone's moods", { kind: 'care', id: 'sensitive', text: /a lot to carry[\s\S]*is this mine/, not: /Mood Arbitrage|Emotions are usually short/ });
t('nt2', "I'm so overwhelmed by noise and people, I just want to hide", { kind: 'care', id: 'overload', text: /Quiet button[\s\S]*Night Garden/, not: /school run|everything on your plate/ });
c('nt2', ['i feel overwhelmed', 'my mom always made me feel like a burden'], { kind: 'care', id: 'burden', text: /I’m sorry[\s\S]*Where your lens came from/, not: /Let’s stay with|stretched thin/, link: '/growing-up.html#lens' });
t('nt2', 'my mom always made me feel like a burden', { kind: 'care', id: 'burden', not: /outside lens|late screens/ });
// Roots & Wings: where a trait may have started
t('nt2', 'What is Roots & Wings?', { kind: 'card', id: 'roots', link: '/growing-up.html#roots' });
t('nt2', 'where does this trait come from', { kind: 'card', id: 'roots', link: '/growing-up.html#roots' });
t('nt2', 'why do I always apologize so much', { kind: 'card', id: 'roots', link: '/growing-up.html' });
t('nt2', 'how does my past show up now', { kind: 'card', id: 'roots', link: '/growing-up.html#roots' });
t('nt2', 'how does my childhood affect me now', { kind: 'card', id: 'roots', link: '/growing-up.html#roots' });
t('nt2', 'How do I use the root finder?', { kind: 'card', id: 'roots', steps: true });
t('nt2', "my partner snapped at me and I can't stop crying", { kind: 'sit', id: 'partner+hurtbythem', text: /Crying when something hurts is a very human response/, not: /stupid/ });
t('nt2', 'my partner snapped at me and I feel silly for crying', { kind: 'sit', text: /isn’t silly/, not: /stupid/ });
c('nt2', ['can you talk slower, this is a lot', 'what is WP-02'], { kind: 'card', id: 'wp02', text: /^In short: / });
t('nt2', 'can you talk slower, this is a lot', { kind: 'care', id: 'brief', not: /pond/ });
c('nt2', ['can you talk slower, this is a lot', 'I want to kill myself'], { kind: 'safety' });
// a new question after a playbook starts fresh
c('nt2', ['i feel overwhelmed', 'why do people say break a leg'], { kind: 'idiom', not: /Let’s stay with/ });

// ---------------------------------------------------------------- parents (from a parent's review of the chat)
t('parents', "I feel like I do all the mental load with two kids and my partner doesn't notice.", { kind: 'sit', id: 'partner+load', not: /your kids to log/ });
t('parents', 'my 4 year old melts down at bedtime every night', { kind: 'sit', id: 'kid+meltdowns', not: /I think you mean/ });
t('parents', 'my son has a meltdown after school', { kind: 'sit', id: 'kid+meltdowns' });
t('parents', 'my kids fight all the time', { kind: 'sit', id: 'kid+kidsfight' });
t('parents', 'my teen won’t talk to me', { kind: 'sit', id: /^kid\+/ });

t('parents', 'I help with my grandchildren and my daughter thinks I spoil them', { kind: 'sit', id: /\+grandkids$/, not: /I think you mean/ });
t('parents', 'what can I watch with my grandkids', { id: 'kidswatch', link: '/frequency-buddies.html' });
t('parents', 'is this safe for my grandkids to watch', { id: 'kidswatch', link: '/frequency-buddies.html' });
t('parents', 'how do I share this page', { kind: 'card', id: 'kipshare' });
t('parents', 'what tricks can kip the paperclip do', { kind: 'card', id: 'kipshare' });
t('parents', 'what is the learn tab', { kind: 'card', id: 'learntab' });
t('parents', 'what can I use on my own', { id: /^(knowmenu|alone)$/ });
t('parents', 'what is the know yourself menu', { kind: 'card', id: 'knowmenu', link: '/self-path.html' });
t('parents', 'what is the bears dojo', { kind: 'card', id: 'bearsdojo', link: '/bears-dojo.html' });
t('parents', 'can I build a bear that looks like me', { kind: 'card', id: 'bearsdojo', text: /build a little bear/ });
t('parents', 'is there a page for grandparents', { kind: 'card', id: 'grandparents', link: '/grandparents.html' });
t('parents', 'tips for grandparents', { kind: 'card', id: 'grandparents', text: /their house, their rules/ });
t('parents', 'how do I say no to babysitting my grandkids', { kind: 'sit', id: /\+grandkids$/, script: true });
t('parents', 'do I have to give my email', { id: 'emailwhy', text: /without giving anything/ });
t('parents', 'can I use this at work with my team?', { id: 'atwork', link: '/work.html' });
t('parents', 'my husband died last year', { id: 'grief', link: '/grief.html' });
// round 4: safety nuance, new topics, memory
t('safety', "he says it's my fault he yells", { kind: 'safety', link: '/safety.html', not: /Snapping|apolog/i });
t('safety', 'my partner gaslights me', { kind: 'safety', link: '/safety.html' });
t('safety', 'is it controlling if he checks my location', { kind: 'safety', text: /agreed to/, link: '/safety.html' });
t('safety', 'I don\'t want to be here anymore (911 and findahelpline)', { q: "I don't want to be here anymore", kind: 'safety', text: /911[\s\S]*findahelpline/ });
t('care', 'should I leave my husband?', { id: 'leave', link: '/safety.html' });
t('care', 'my gf and i keep fighting about her phone', { id: 'phonetrust' });
t('care', 'i feel kinda alone lately', { id: 'lonely' });
t('care', 'my grown son and I barely talk since his mother passed', { id: 'grownkids', link: '/grief.html#reconnect' });
t('care', 'my two team leads keep fighting over who owns what', { id: 'teamowners', link: '/work.html' });
t('care', 'whats the actual point of this site', { id: 'tol', not: /I think you mean/ });
c('followups', ['my wife died and I don’t know what to do with myself', 'ok and then what?'], { link: '/grief.html' });
c('followups', ['my wife died and I don’t know what to do with myself', 'that didn’t help'], { kind: 'nohelp', not: /Not safe at home/ });
c('followups', ['my wife died last spring', 'what about my son?'], { kind: 'care', text: /grown son/ });
c('followups', ['my roommate never pays the bills on time', 'that didn’t help', 'i already tried that'], { kind: 'nohelp', not: /longer look/ });
c('followups', ['my gf and i keep fighting about her phone', 'is that a red flag'], { kind: 'redflag', not: /steps I gave/ });
// round 5: teens, identity, co-parents, caregivers, parents, Spanish
t('safety', 'my friend cuts themselves what do i do', { kind: 'safety', text: /trusted adult[\s\S]*988/ });
t('care', 'my dad makes fun of my pronouns', { id: 'lgbtq', text: /Trevor Project/ });
t('care', 'im gay and scared to come out', { id: 'lgbtq' });
t('care', 'is my mom allowed to read my texts', { id: 'parentphone', not: /Domestic Violence/ });
t('care', 'my parents fight all the time', { id: 'parentsfight' });
t('care', 'is it harassment if my ex texts me 30 times a day', { id: 'exharass', link: '/safety.html#after-separation' });
t('care', 'my ex sends me long angry texts every night', { id: 'exmessages', text: /BIFF/ });
t('care', 'should i apologize to my ex for being late', { id: 'exmessages', text: /admit fault/ });
t('care', 'my ex badmouths me to the kids', { id: 'exbadmouth' });
t('care', 'is there a helpline or respite for dementia caregivers', { id: 'carehelp', text: /800-272-3900/ });
t('care', 'my grown daughter lives far away and won\'t help with her dad', { id: 'careadultkids' });
t('care', 'I feel guilty that I resent him', { id: 'careresent' });
t('care', 'how i stop yelling', { id: 'yellkids' });
t('care', 'que hago mis hijos pelean', { kind: 'lang', link: '/en-espanol.html' });
c('followups', ['I am caring for my husband with dementia and I am exhausted', 'my daughter won\'t help'], { id: 'careadultkids' });
t('parents', 'what do you do with my email', { id: 'emailwhy', text: /Buttondown/ });
t('parents', 'what is frequency buddies', { kind: 'card', id: 'buddies', link: '/frequency-buddies.html' });
t('parents', 'is there a frequency buddies music video', { kind: 'card', id: 'buddiesmusicvideo', link: '/frequency-buddies-music-video.html' });
t('parents', 'where can I hear the frequency buddies theme song', { kind: 'card', id: 'buddiesmusicvideo', link: '/frequency-buddies-music-video.html' });
t('parents', 'can I make my own music video', { kind: 'card', id: 'buddiesmvmaker', link: '/frequency-buddies-music-video-maker.html' });
t('parents', 'is there a music video maker for frequency buddies', { kind: 'card', id: 'buddiesmvmaker', link: '/frequency-buddies-music-video-maker.html' });
t('parents', 'when is the next season of frequency buddies', { kind: 'card', id: 'buddiess2', link: '/frequency-buddies-season-2.html', text: /no release date yet/ });
t('parents', 'is there a season 2 teaser', { kind: 'card', id: 'buddiess2', link: '/frequency-buddies-season-2.html' });

// ---------------------------------------------------------------- the nine fields and how they connect
t('connections', 'how do the nine fields connect', { id: 'connections', text: /78 possible pairs.*28 obvious, 29 hidden and 21 abstract/s });
t('connections', 'how do the thirteen fields connect', { id: 'connections', text: /thirteen fields.*debating.*politics.*laughter therapy/s });
t('connections', 'how are all the different areas Christian studied connected?', { id: 'connections', text: /seven kinds of root/ });
t('connections', 'Show me the hidden connections', { id: 'connections-hidden', text: /Neurobiology \+ Finance/ });
t('connections', 'what are the deepest connections?', { id: 'connections-deepest', text: /One hard conversation/ });
t('connections', 'where do all nine fields meet at once', { id: 'connections-deepest' });
t('connections', 'where do all thirteen fields meet at once', { id: 'connections-deepest', text: /house rule/ });
t('connections', 'Show me the abstract connections', { id: 'connections-abstract', text: /Aristotle/ });
t('connections', 'Show me how one field leads into the next', { id: 'connections-chain', text: /Aromatherapy → Neurobiology/ });
t('connections', 'what is a polymath', { kind: 'card', id: 'polymath', link: '/polymath.html' });
t('connections', 'how does music connect to economics?', { kind: 'card', id: 'polymath', text: /Music and Economics share the root/, link: '/polymath.html#all-pairs' });
t('connections', 'what does finance have to do with neurobiology', { kind: 'card', id: 'polymath', text: /balance sheet/ });
t('connections', 'how is laughter therapy related to psychology', { kind: 'card', id: 'polymath', text: /we’re safe/ });
t('connections', 'what do debating and politics have in common', { kind: 'card', id: 'polymath', text: /decision attached/ });
t('connections', 'why did christian study aromatherapy', { kind: 'card', id: 'polymath', text: /Aromatherapy, one of the thirteen fields/, link: '/polymath.html#field-ar' });
t('connections', 'how does music connect?', { kind: 'card', id: 'polymath', text: /How it connects to the other twelve/ });
t('connections', 'what does behavioral science have to do with relationships', { kind: 'card', id: 'polymath', text: /Behavioral science, one of the thirteen fields/ });
t('connections', 'tell me about the art of debating field', { kind: 'card', id: 'polymath', text: /The art of debating, one of the thirteen fields/ });
t('connections', 'where do all thirteen fields meet at once', { id: 'connections-deepest', text: /The money conversation.*A new baby in the house/s });
t('connections', 'my partner and I debate about money and it is hurting our relationship', { not: /one of the thirteen fields/ });

// ---------------------------------------------------------------- Wavelength (replaced Your Heartprint)
t('wavelength', 'what is wavelength', { kind: 'card', id: 'wavelength', link: '/wavelength.html', text: /Wave Code.*16 archetypes/s });
t('wavelength', 'how do I use wavelength?', { kind: 'card', id: 'wavelength', steps: true });
t('wavelength', 'where did heartprint go', { id: 'wavelength', link: '/wavelength.html', text: /replaces Your Heartprint/ });
t('wavelength', 'what does the Q mean in my wave code', { id: 'wl-letters', text: /Quick Spark.*Slow Simmer/s });
t('wavelength', 'what do the wave code letters mean?', { id: 'wl-letters', text: /Attuned/ });
t('wavelength', 'what is the firefly', { id: 'wl-archetypes', text: /QFNA, the Firefly/ });
t('wavelength', 'what are the 16 archetypes in wavelength', { id: 'wl-archetypes', text: /STNA, the Quilt/ });
t('wavelength', 'can I pick ADHD and autistic', { id: 'wl-wiring', text: /AuDHD/ });
t('wavelength', 'is wavelength a diagnosis', { id: 'wl-wiring', text: /not a diagnosis/ });
t('wavelength', 'what are the 9 inputs of learning', { id: 'wl-inputs', text: /Hands and movement.*not fixed learning styles|not fixed learning styles.*Hands and movement/s });
t('wavelength', 'how do the 9 inputs connect', { id: 'wl-inputs', link: '/wavelength.html' });
t('wavelength', 'what chapters are in wavelength', { id: 'wl-chapters', text: /sixteen self-discovery chapters/ });
t('wavelength', 'how do I compare wave codes with my partner', { id: 'wl-compare', text: /Compare with someone/ });
t('wavelength', 'does wavelength save what I type', { id: /^wl-|^wavelength$/, text: /on this device|sent anywhere/ });

// ---------------------------------------------------------------- couples (round six: eight couples, sixteen people)
t('couples', "she won't let anything go, I need space", { kind: 'care', id: 'pursuewithdraw', not: /heads-up before visits|work hours/ });
t('couples', 'one of us wants to talk it out now and the other needs space. who is right?', { kind: 'care', id: 'pursuewithdraw' });
t('couples', 'he walks away every time I try to talk', { kind: 'care', id: 'pursuewithdraw', text: /return time/ });
t('couples', 'we have the same fight every week, she pursues and I withdraw', { kind: 'care', id: 'pursuewithdraw' });
t('couples', 'how long should a break be?', { kind: 'care', id: 'breaklength', text: /20 minutes/, not: /respite/ });
t('couples', 'how do I get him to stay and finish the conversation?', { kind: 'care', id: 'getstay', text: /when shall we pick this up/i });
t('couples', 'he never lets me talk about anything', { kind: 'care', id: 'pursuewithdraw', not: /signs of control/ });
t('couples', 'she follows me from room to room when I need space', { kind: 'care', id: 'pursuewithdraw', not: /signs of control/ });
t('couples', "he won't let me talk to my friends", { kind: 'safety' });
t('couples', 'he follows me to work', { kind: 'safety' });
t('couples', 'he punched a hole in the wall', { kind: 'safety' });
t('couples', "he punched the wall last night when I wouldn't drop it", { kind: 'safety' });
t('couples', "he smashes things when he's angry", { kind: 'safety' });
t('couples', "she stands in the doorway so I can't get out", { kind: 'safety' });
t('couples', 'she threw my phone across the room', { kind: 'safety' });
t('couples', "my husband doesn't understand that I have to support my family", { kind: 'care', id: 'familyduty', not: /dementia/ });
t('couples', 'my husband no understand i must help my family back home', { kind: 'care', id: 'familyduty' });
t('couples', "my wife sends a lot of money to her family and I feel we can't save", { kind: 'care', id: 'savingworry', not: /visits/ });
t('couples', 'my mother-in-law visits too often', { kind: 'sit', not: /motherinlaw/ });
t('couples', "my wife says I'm under her feet since I retired", { kind: 'care', id: 'retired' });
t('couples', 'I just retired and feel useless at home', { kind: 'care', id: /^(retired|retirepurpose)$/ });
t('couples', 'retirement', { kind: 'care', id: 'retired', not: /widow|living alone/ });
t('couples', "we're long distance and always fighting about who calls", { kind: 'care', id: 'longdistance' });
t('couples', 'My stepdaughter says I am not her real mom and my husband is stuck in the middle', { not: /signs of control/ });

// ---------------------------------------------------------------- couples re-test (same eight couples, after round six)
t('retest', 'what do I say when I come back after the break?', { kind: 'care', id: 'comeback' });
t('retest', 'my partner sent me a link in the middle of a fight, is she trying to tell me I\'m the problem?', { kind: 'care', id: 'sentlink', link: '/sent-this.html' });
t('retest', "we had a rough week, what's something light and fun we can do to reconnect?", { kind: 'care', id: 'reconnect', link: '/turning-toward.html' });
t('retest', 'my mother want to come stay with us for 3 months', { kind: 'care', id: 'longstay' });
t('retest', 'how much is reasonable to send?', { kind: 'care', id: 'sendamount', text: /twice a year/ });
t('retest', 'im adhd and my gf is autistic, we just moved in together. is there stuff for couples like us?', { kind: 'care', id: 'ndcouple', link: '/neurodivergent-relationships.html' });
t('retest', 'how can me and my girlfriend both see the same chore list? she made it on her phone', { kind: 'care', id: 'sharelist', not: /doesn.t feel fair/ });
t('retest', 'she redoes everything i do', { kind: 'care', id: 'handover' });
t('retest', 'i miss work', { kind: 'care', id: 'retirepurpose', link: '/retired-together.html#purpose' });
t('retest', 'my wife says she does everything but i work full time. how is that counted', { kind: 'care', id: 'paidwork' });
t('retest', 'what if we disagree about the numbers', { kind: 'care', id: 'disagreenumbers' });
t('retest', "my stepdaughter says I'm not her real dad, how do I respond", { kind: 'care', id: 'notrealdad', text: /not trying to be/ });
t('retest', 'my own son is only with us every other weekend and feels like a visitor', { kind: 'care', id: 'parttimechild' });
t('retest', 'what does fine whatever works for you mean', { kind: 'care', id: 'textmeaning', link: '/signal-translator.html' });
c('retest', ["my husband doesn't understand that I have to support my family", 'please say it in simpler English'], { text: /easy words/, not: /only be guessing/ });
c('retest', ['he walks away every time I try to talk', 'he walks away every time I try to talk to him'], { text: /short version/, not: /\.,/ });
c('retest', ['he walks away every time I try to talk', 'how do I get him to stay and finish the conversation?'], { id: 'getstay', not: /short version/ });
t('retest', 'what if my wife doesn\'t back me up', { kind: 'care', id: 'backmeup' });
t('retest', 'what percentage of our income is normal to send to her mum?', { kind: 'care', id: 'sendamount', not: /bedtime/ });
t('retest', 'a game for two of us', { kind: 'care', id: 'gamefortwo', link: '/recheck-drive.html' });
c('retest', ['we\'re long distance and always fighting about who calls', 'work is just busy, how do i make her stop being mad'], { text: /call days together/ });
t('retest3', 'we\'ve had a rough week', { not: /wave had|carrier wave/i });
t('retest3', 'we’ve been fighting a lot', { not: /wave been|carrier wave|I think you mean/i });
t('retest3', 'my wife and I each have our own phone, how do we put our two sides together?', { id: 'twophones' });
t('retest3', 'how do i send my side to my husband', { id: 'twophones' });
t('retest3', 'How do I tell my girlfriend she left the stove on without her feeling criticised? She has ADHD.', { kind: 'care', id: 'raisegently', link: '/signal-translator.html' });
t('retest3', 'she says I am too sensitive when she is just being honest', { kind: 'care', id: 'toosensitive' });
t('retest3', 'my wife thinks i dont do enough at home but i do a lot of stuff she doesnt see', { kind: 'care', id: 'notenough', not: /teen|dating|password/i });
t('retest3', 'should I discipline her when Tasha isn\'t home', { kind: 'care', id: 'stepdiscipline' });
t('retest3', 'the kids are 14 and 16 and want a say', { kind: 'care', id: 'teensay', not: /Children.s Privacy|intended for adults/i });
t('retest3', 'christmas and thanksgiving, he always wants both', { kind: 'care', id: 'holidayboth' });
t('retest3', 'my mother-in-law visits too often', { link: '/family-obligations.html#visits', not: /bedtime our way/ });
t('retest3', 'I\'m always the one who arranges our calls', { kind: 'care', id: 'longdistance', text: /real information, not scorekeeping/ });
c('retest3', ['we live in different countries and fight about who calls', 'what about time zones'], { text: /overlap|whose time/ });
t('retest4', 'my partner gets mad when i go out with friends', { kind: 'safety', not: /Flood/ });
t('retest4', 'he gives me an allowance and checks my receipts', { kind: 'safety' });
t('retest4', 'i have to ask him for money', { kind: 'safety' });
t('retest4', 'how do i get him to stop checking my phone', { kind: 'safety', not: /no phones at meals/i });
c('retest4', ['my boyfriend checks my phone every night', 'he gets angry if i see my friends'], { kind: 'safety', not: /Flood/ });
c('retest4', ['my boyfriend checks my phone every night', 'is this normal'], { kind: 'safety', text: /n.t a normal part of disagreeing/, not: /Disagreeing is a normal/ });
c('retest4', ['my boyfriend checks my phone every night', 'how do i talk to him about it so he stops'], { kind: 'safety', not: /same side/ });
c('retest4', ['my boyfriend checks my phone every night', 'start over', 'how do we split the chores'], { not: /won.t suggest ways to talk/ });
t('retest4', 'short team check-in template', { not: /temple|Bears Dojo/ });
t('retest4', 'is there a version of this site for work teams?', { link: '/work.html' });
t('retest4', 'one person on my team feels they do all the invisible work', { kind: 'care', id: 'teaminvisible', not: /dentist|carrying a lot/ });
t('retest4', 'we\'ve had a rough week', { kind: 'care', id: 'roughweek', not: /RF in the formulas|Counting repairs/ });
t('retest4', 'i feel stuck in the middle of my mum and stepdad', { kind: 'care', id: 'teenmiddle', not: /You love your kids/ });
t('retest4', 'my mum makes me pick sides', { kind: 'care', id: 'teenmiddle' });
t('retest4', 'me and my little brother fight constantly', { kind: 'care', id: 'teensibling', not: /money/i });
t('retest4', 'im 15 who can i talk to', { kind: 'care', id: 'teentalk', text: /741741/ });
t('retest4', 'what if it gets scary at home', { kind: 'safety', text: /Childhelp|Childline/ });
t('retest4', 'i dont feel safe at home', { kind: 'safety' });
t('retest4', 'my stepdad scares me sometimes', { kind: 'safety' });
t('retest4', 'something to calm down after a 12 hour shift', { kind: 'care', id: 'shiftwind', not: /roommates/ });
t('retest4', 'I\'m stuck in the middle between my kids and my husband', { not: /not your job to fix their relationship/ });
t('retest4', 'how do I remember what my friends tell me, like their news or birthdays', { kind: 'care', id: 'adhdfriends', not: /open and free/ });
t('retest4', 'is this backed by research?', { kind: 'care', id: 'evidence' });
t('retest4', 'what evidence is this site based on? where are the sources', { kind: 'care', id: 'evidence' });
t('retest4', 'I have ADHD. how does it affect friendships?', { kind: 'care', id: 'adhdfriends' });
t('retest4', 'tips for ADHD at work, I am a software developer', { kind: 'care', id: 'adhdwork' });
t('retest4', 'is it free', { id: 'free' });
t('retest4', 'my children dont call', { id: 'grownkids', not: /teenagers|Parenting styles/ });
t('retest4', 'how do i ask them to visit without nagging', { not: /One owner per job|Lemonade/ });
t('retest4', 'is this site safe', { kind: 'care', id: 'sitesafe', not: /Psychological safety/ });
t('retest4', 'is this a scam', { kind: 'care', id: 'sitesafe' });
t('retest4', 'i cant sleep', { kind: 'care', id: 'cantsleep' });
t('retest4', 'my husband died and the house is so quiet', { not: /miss her/ });
t('retest4', 'where do i find volunteering', { id: 'retirepurpose', text: /library/ });
t('retest4', 'i want something to do outside the house', { id: 'retirepurpose' });
t('retest4', 'how do i bring up rent being late without it getting awkward', { id: 'rentlate', not: /bigger purchases/ });
t('retest4', 'who should buy loo roll and washing up liquid', { id: 'supplies' });
t('retest4', 'how do i share this with my 3 housemates', { id: 'twophones', not: /Kip/ });
t('retest4', 'my brothers won\'t help with dad', { kind: 'care', id: 'caresiblings', not: /between you and your dad/ });
t('retest4', 'how do i get my brothers to share looking after dad fairly', { kind: 'care', id: 'caresiblings' });
t('retest4', 'my husband says i\'m never home', { kind: 'care', id: 'caremarriage', not: /newlywed/i });
t('retest4', 'We have a 3 month old. How do we fill in the Lemonade Stand on two phones, one each?', { id: 'twophones' });
t('retest4', 'how do I add my wife\'s side on my phone', { id: 'twophones' });
t('retest4', 'my wife sends a lot of money to her family and I feel we can\'t save', { kind: 'care', id: 'savingworry', text: /worry about savings is fair/ });
t('retest4', 'my ex says bad things about Marcus to the kids', { id: 'exbadmouth', not: /marks/ });
c('retest4', ['should I discipline her when Tasha isn\'t home', 'what if she flat out refuses to do what I ask'], { id: 'stepdiscipline', not: /worry/ });
t('retest4', 'should Leo have the same rules as the other kids', { id: 'parttimechild' });
t('retest4', 'can we alternate christmas and thanksgiving each year', { id: 'holidayboth' });
t('retest4', 'my 14 year old won\'t even talk to him and he thinks I always take their side', { id: 'bioparent' });
t('retest4', 'she told me I left the stove on again and that it\'s dangerous and I felt like a kid', { kind: 'care', id: 'feltsmall', not: /little pond/ });
t('round7', 'am i an abuser', { kind: 'care', not: /If someone is hurting, threatening, watching or controlling you/ });
t('round7', 'is yelling at kids abuse', { kind: 'care', text: /not the same as abuse/ });
c('round7', ['am i an abuser', 'how do i apologize to my wife for yelling'], { not: /won.t suggest ways to talk them round/ });
t('round7', 'my son flinched when i raised my voice', { kind: 'care', text: /flinch/ });
t('round7', 'should i see a therapist about my anger', { id: 'angerhelp', not: /^No\./ });
t('round7', 'anger management classes', { id: 'angerhelp' });
t('round7', 'i yell at my wife when im stressed', { id: 'yellpartner' });
t('round7', 'my wife has Parkinson', { id: 'illnesscare', not: /Parkinson.s law/ });
t('round7', 'cuido a mi esposa enferma y estoy agotado', { text: /agotado/, link: '/en-espanol.html#cuidar' });
t('round7', 'sometimes I am impatient with my wife and then I feel guilty', { id: 'careresent' });
t('round7', 'i\'m 31 and bisexual, how do i tell my family about my girlfriend', { id: 'lgbtadult', not: /school counselor|GSA/ });
t('round7', 'my girlfriend is pressuring me to come out to my family before i\'m ready', { id: 'lgbtadult' });
t('round7', 'what if they cut me off', { id: 'familycutoff', not: /Watching someone you care about/ });
t('round7', 'can my family see what i look at on here on our wifi', { id: 'wifiprivacy' });
t('round7', 'can i talk to my RA about this', { id: 'rahelp' });
t('round7', 'im starting to dread going back to my dorm room', { not: /drama room/ });
// round 7 (chat helper fixes): safety first
const ABUSE_OK = /not a communication problem|isn.t a communication problem/;
const NO_SNAP = /snap|full battery|rarely one person|I’m sorry I/;
t('round7', 'When we fight he screams at me and calls me worthless. How do I say things so he doesn\'t get so angry?', { kind: 'safety', text: ABUSE_OK, link: '/safety.html', not: NO_SNAP });
t('round7', 'He never apologizes and always turns things around on me. Is he a narcissist?', { kind: 'safety', text: /can’t diagnose[\s\S]*1-800-799-7233/, not: NO_SNAP });
t('round7', 'i feel like i\'m walking on eggshells', { kind: 'safety', text: /0808 2000 247/ });
t('round7', 'he calls me names', { kind: 'safety', link: '/safety.html' });
t('round7', 'she always turns it around on me', { kind: 'safety' });
t('round7', 'how do i say it so he doesn\'t get angry', { kind: 'safety', not: /Signal Translator/ });
t('round7', 'my little brother calls me names', { not: /0808 2000 247/ });
c('round7', ['he calls me names', 'how do i say it better'], { kind: 'safety', not: /same side/ });
t('round7', 'is it controlling if I ask him to check with me before he buys things?', { id: 'moneycontrol', link: ['/money-together.html'], text: /applies to both/, not: /They pressure you into sex/ });
t('round7', 'is she being controlling about money or is this normal?', { id: 'moneycontrol', link: '/money-together.html' });
t('round7', 'my cofounder and i: they keep telling me how to do things, feels controlling', { id: 'bizpartner', not: /afraid|scared/ });
t('round7', 'Can you be my therapist?', { id: 'therapistq', text: /^No\. I’m a self-help guide, not a therapist/ });
t('round7', 'Is there any evidence this program works?', { id: 'evidence', text: /clinical trial/, link: ['/library.html', '/for-counselors.html'] });
t('round7', 'I\'m a couples therapist. Can I use this with clients?', { id: 'forcounselors', link: '/for-counselors.html' });
t('round7', 'nightmares and i\'m on edge all the time', { id: 'deployhealth', text: /800-342-9647[\s\S]*988[\s\S]*0800 138 1619/ });
t('round7', 'i just got back from deployment, is this normal', { id: 'deployhealth', link: '/coming-home.html' });
t('round7', 'do you think he has ptsd? he jumps at noises and doesn\'t sleep', { id: 'deployhealth', text: /can’t diagnose/ });
t('round7', 'I want to kill myself (UK lines too)', { q: 'I want to kill myself', kind: 'safety', text: /988[\s\S]*116 123[\s\S]*0800 1111/ });
// gaming, friends, more than two
t('round7', 'he plays video games all night and ignores me', { id: 'gaming', link: '/gaming-and-time-together.html', not: /cut off/ });
t('round7', 'my gf says i game too much but it\'s how i relax', { id: 'gaming', not: /grandkids/ });
t('round7', 'gaming is how i see my friends', { id: 'gaming' });
t('round7', 'how do we split time together and alone time', { id: 'gaming' });
t('round7', 'how do we agree on how much he games vs time with me', { id: 'gaming' });
t('round7', 'my husband ignores me', { kind: 'clarify', text: /time and attention together/ });
t('round7', 'my best friend never texts back since she had her baby', { id: 'friends', link: '/friends.html', not: /bath time|just for the two of you|call rhythm/ });
t('round7', 'i have a newborn and i\'m neglecting my best friend', { id: 'friends', not: /bath time|just for the two of you/ });
t('round7', 'how do i tell my friend i still care when i have no energy to reply', { id: 'friends', script: true, text: /I still care about you so much/ });
t('round7', 'we\'re a polyamorous triad living together, is this site for us?', { id: 'poly', text: /^Yes\. Every tool here works for two to eight partners/, link: '/more-than-two.html', not: /third/ });
t('round7', 'does this work for polyamorous relationships', { id: 'poly', link: '/more-than-two.html' });
t('round7', 'i moved in with my partners and still feel like a guest', { id: 'joinhome', not: /stepkid/ });
t('round7', 'i\'m nonbinary, my partners are a man and a woman', { id: 'poly', not: /school counselor|parent mocks/ });
t('round7', 'i do all the planning for the three of us', { not: /both lists/ });
t('round7', 'i work long hours and feel left out of decisions', { id: 'leftout', text: /decisions slot/ });
t('round7', 'how do i get a say without making more work for alex', { id: 'leftout', not: /trash/ });
// foster and kinship
t('round7', 'our foster daughter pushes us away', { id: 'foster', link: '/foster-and-kinship.html' });
t('round7', 'she has moved homes a lot and doesnt trust us', { id: 'foster', not: /Schlossberg/ });
c('round7', ['our foster daughter pushes us away', 'i do all the meetings and paperwork'], { id: 'fosterload', not: /coworker/ });
c('round7', ['our foster daughter pushes us away', 'she has moved homes a lot and doesnt trust us'], { id: 'foster', text: /Staying with that/ });
t('round7', 'we disagree about how strict to be', { id: 'parentapproach' });
t('round7', 'my wife thinks im too strict', { id: 'parentapproach' });
c('round7', ['our foster daughter pushes us away', 'what rules should we set for a 14 year old'], { id: 'teenrules', text: /Phones charge outside the bedroom/ });
t('round7', 'i\'m raising my grandson and i\'m exhausted', { id: 'kinshipgp', link: '/foster-and-kinship.html', not: /Ask the parents for their top three rules/ });
c('round7', ['i\'m raising my grandson and i\'m exhausted', 'no, his mum is in rehab, i\'m raising him full time'], { id: 'kinshipgp', not: /In-law tension/ });
t('round7', 'where can i get support as a grandparent bringing up a grandchild', { id: 'kinshipgp' });
t('round7', 'im 14 and i live with my grandma', { id: 'teenkinship', link: '/teens.html#parent-away' });
t('round7', 'my mum is in rehab', { id: 'teenkinship', text: /0800 1111/ });
t('round7', 'i miss my mum', { id: 'missing', not: /Never miss twice|habit/ });
c('round7', ['i\'m raising my grandson and i\'m exhausted', 'he\'s on his phone all night'], { id: 'teenphone', not: /jealous|at dinner/ });
// ADHD kids, grandparents, grown children
t('round7', 'my grandson has ADHD, how should I talk to him', { id: 'adhdkids', link: '/adhd-kids.html' });
t('round7', 'is ADHD real or just bad behaviour', { id: 'adhdkids', text: /^Yes, ADHD is real and well studied\. It is not bad behaviour or bad upbringing\./ });
c('round7', ['my grandson has ADHD, how should I talk to him', 'he forgets everything I tell him'], { id: 'adhdkids', text: /Expect forgetting/, not: /plans fall through/ });
c('round7', ['my grandson has ADHD, how should I talk to him', 'what do I say when he can\'t sit still'], { id: 'adhdkids', text: /sit still/ });
t('round7', 'what is ADHD in children, in plain words', { id: 'adhdkids', text: /ADHD is real/, link: '/adhd-kids.html', not: /fewer words/ });
t('round7', 'articles about ADHD in children', { id: 'reading', link: '/adhd-kids.html' });
t('round7', 'grandson', { kind: 'clarify', not: NOT_POND });
t('round7', 'my daughter doesn\'t want my advice about the baby', { id: 'gpadvice', text: /asking before advising/ });
t('round7', 'she says i just turn up without calling. i only want to help', { id: 'gpadvice', script: true });
t('round7', 'i feel shut out from my grandchild', { id: 'gpshutout', text: /^I’m sorry\. Feeling shut out/ });
t('round7', 'how do i set boundaries with my mum without hurting her', { id: 'familyboundary', link: '/grown-up-children.html', not: /budget running in the red/ });
t('round7', 'How do I set a boundary kindly? (the Go deeper chip)', { q: 'How do I set a boundary kindly?', id: 'familyboundary' });
// co-parents, on my own
t('round7', 'my ex makes decisions about our kid without asking me', { id: 'coparentdecide', link: '/co-parenting.html#who-decides', not: /I love doing things together/ });
c('round7', ['my ex makes decisions about our kid without asking me', 'how do i get a say'], { id: 'coparentdecide', not: /DACI|decision rights at work/i });
t('round7', 'he keeps sending her back without her inhaler', { id: 'handoffkit', text: /checklist/ });
t('round7', 'my ex never remembers anything for our daughter', { id: 'handoffkit', text: /^It’s tiring/ });
t('round7', 'kids are bored at my place', { id: 'parttimehome', link: '/on-my-own.html' });
t('round7', 'how do i build a life again after divorce', { id: 'onmyown', link: '/on-my-own.html' });
// business partners
t('round7', 'my business partner thinks I don\'t pull my weight', { id: 'bizpartner', link: '/work.html#business-partners' });
t('round7', 'we\'re not a couple, we co-own a bakery', { id: 'bizpartner' });
c('round7', ['we\'re not a couple, we co-own a bakery', 'nobody sees the admin I do'], { id: 'bizpartner', text: /admin/ });
t('round7', 'it\'s our bakery, I do payroll, suppliers and permits', { id: 'bizpartner' });
t('round7', 'is there anything for business owners?', { id: 'bizpartner' });
// coming home, different hours
t('round7', 'he came back and changes how I do everything', { id: 'comehome', link: '/coming-home.html' });
t('round7', 'my husband just got back from a 7 month deployment and keeps stepping on my systems', { id: 'comehome', text: /handover week/ });
t('round7', 'i feel like a stranger in my own house', { id: 'comehome', not: /weak ties/i });
t('round7', 'i want to be useful but i don\'t know where i fit anymore', { id: 'comehome' });
t('round7', 'we never see each other, opposite schedules', { id: 'differenthours', link: '/different-hours.html', not: /cartoon/i });
t('round7', 'working from home means everyone thinks I\'m free', { id: 'differenthours', not: /loss aversion/i });
t('round7', 'i work nights and feel guilty i never help', { id: 'differenthours' });
t('round7', 'he works from home and does the house and dog while i sleep all day after shifts', { id: 'differenthours' });
t('round7', 'we\'re a gay couple', { id: 'gaycouple', text: /works for any couple/, link: '/coming-out.html', not: /school/ });
// two faiths, holidays
t('round7', 'my wife and I have different religions and a baby on the way', { id: 'twofaiths', link: '/two-faiths.html', text: /^Faith/ });
t('round7', 'how do we choose a baby name that works for both our faiths', { id: 'twofaiths' });
t('round7', 'how do we decide what religion to raise our kid', { id: 'twofaiths' });
t('round7', 'I\'m Catholic and my husband is Muslim', { id: 'twofaiths' });
t('round7', 'is there anything specific for interfaith couples?', { id: 'twofaiths' });
t('round7', 'my mum wants the baby baptised', { id: 'twofaiths' });
t('round7', 'how do we do Eid and Christmas', { id: 'twofaiths' });
t('round7', 'how do we split holidays between both families', { id: 'holidaysplit', not: /court order/i });
t('round7', 'articles about raising a child in two religions', { id: 'reading', link: '/two-faiths.html' });
// money
t('round7', 'my fiance spends too much and I\'m scared', { id: 'moneystyles', not: /finance/ });
t('round7', 'I\'m a saver and he\'s a spender', { id: 'moneystyles', text: /Generosity is a value, not a flaw/, link: '/money-together.html' });
t('round7', 'she says I\'m bad with money', { id: 'moneystyles' });
t('round7', 'my parents want a huge wedding', { id: 'wedding', link: '/money-together.html' });
t('round7', 'how do we handle wedding costs', { id: 'wedding' });
t('round7', 'What are money styles? (the Go deeper chip)', { q: 'What are money styles?', id: 'moneystyles' });
t('round7', 'my wife thinks I don\'t help but I work 60 hours', { id: 'longhours', not: /roommates/ });
t('round7', 'we have 2 year old twins and we are both exhausted', { id: 'toddlers', link: '/new-parent.html' });
t('round7', 'we have two toddlers and no time', { id: 'toddlers' });
// Spanish
t('round7', '¿hablas español?', { kind: 'lang', text: /Casi todo el sitio está en inglés/, link: '/en-espanol.html', not: /Violence|Violencia/ });
t('round7', 'mi esposo no ayuda en la casa', { kind: 'lang', link: '/en-espanol.html#casa' });
t('round7', 'is there anything in spanish for my wife?', { id: 'spanish', link: '/en-espanol.html' });
// illness
t('round7', 'i feel like a burden to my husband', { id: 'illburden', text: /^Being ill isn’t being a burden/, link: '/when-one-is-ill.html', not: /core belief/i });
t('round7', 'what can i do from bed on bad days', { id: 'illchores', link: '/when-one-is-ill.html' });
t('round7', 'i have ME/CFS and some days i can\'t get out of bed', { id: 'illchores' });
t('round7', 'i have a chronic illness, how do we split chores fairly', { id: 'illchores', not: /step by step, step by step/ });
t('round7', 'how do I use share the load (no doubled words)', { q: 'how do I use share the load', not: /step by step, step by step/ });
t('round7', 'i\'m exhausted from caring for my wife and working', { not: /Ask for one specific kind of help[\s\S]*Ask for one specific kind of help/ });
// siblings and rifts
t('round7', 'how do i reach out to my brother after years of silence', { id: 'siblingrift', link: '/family-rifts.html#reaching-out', not: /Paste the conversation/ });
t('round7', 'do i have to reconcile with my brother', { id: 'mustreconcile', text: /^No, you don’t have to/, not: /account/i });
t('round7', 'my brother got dad\'s house in the will', { id: 'inheritance', link: '/family-rifts.html#money' });
t('round7', 'sibling estrangement after inheritance dispute', { id: 'inheritance' });
t('round7', 'my brother was always the favourite', { id: 'favourite' });
t('round7', 'is it ok not to forgive', { id: 'forgiveok', text: /^Yes\. Forgiving is yours to give or not/ });
t('round7', 'how do i apologise to my brother', { not: /snapped at you this morning|Snapping at someone/ });
t('round7', 'me and my little brother fight constantly (still teen)', { q: 'me and my little brother fight constantly', id: 'teensibling' });
// empty nest, feelings, easy words
t('round7', 'our children left for university, the house is so quiet', { id: 'emptynest', link: '/empty-nest.html', not: /roommate|housemate/ });
t('round7', 'empty nest', { id: 'emptynest' });
t('round7', 'how to talk about feelings', { id: 'feelingstalk', not: /alexithymia|autis/i });
t('round7', 'my husband does not talk about feelings', { id: 'feelingstalk', text: /by doing/ });
t('round7', 'my wife says we are not close, but everything is fine', { id: 'feelsfine', text: /feel fine to you|feels fine to you|fine to you/ });
c('round7', ['please use more simple English', 'my partner and i feel distant'], { not: /close the gap|agenda|granularity|taken for granted/ });
// work and autism
t('round7', 'noise at work', { id: 'autisticwork', link: '/work.html#autistic-at-work' });
t('round7', 'I need a quiet break at work. What do I say?', { id: 'autisticwork', script: true });
t('round7', 'my manager gives vague instructions', { id: 'autisticwork' });
t('round7', 'I want my manager to write down what she wants', { id: 'autisticwork' });
t('round7', 'the office is too loud', { id: 'autisticwork' });
t('round7', 'I need to step away when it gets loud', { id: 'autisticwork', not: /kneel/ });
t('round7', 'how do I ask my boss for written instructions', { id: 'autisticwork' });
t('round7', 'how do I tell my manager I am autistic', { id: 'autisticwork', text: /your choice/ });
t('round7', 'is this rude: That is incorrect. The report needs fixing.', { id: 'isthisrude', link: '/signal-translator.html' });
// leftovers and general
t('round7', 'my roommate and i share a dorm room and fight', { id: 'sharingroom', link: '/sharing-a-room.html' });
t('round7', 'i\'m 31 and bisexual (adult page)', { q: 'i\'m 31 and bisexual, how do i tell my family about my girlfriend', id: 'lgbtadult', link: '/coming-out.html' });
t('round7', 'how does the site work for couples (no build notes)', { q: 'carrier wave and payload', not: /Carrier Wave vs\. Payload|architecture/i });
c('round7', ['how do i set boundaries with my mum without hurting her', 'how do i set boundaries with my mum without hurting her'], { id: 'familyboundary', text: /short version|Staying with that/ });
t('retest3', 'is something wrong with me', { kind: 'care', id: 'selfworry', not: /attribution/i });
t('retest3', 'i feel so useless since i retired', { kind: 'care', id: 'retirepurpose' });

// round 7, second pass (chat2): what the probe of every brief phrase still found
t('round7b', "what do I say when he can't sit still", { id: 'adhdkids', link: '/adhd-kids.html' });
t('round7b', 'my roommate and i need some rules', { id: 'sharingroom', link: '/sharing-a-room.html' });
t('round7b', "i'm 30 and want to come out to my parents", { id: 'lgbtadult', link: '/coming-out.html', not: /You belong here, exactly as you are/ });
t('round7b', 'articles about raising a child in two religions (no unrelated article)', { q: 'articles about raising a child in two religions', link: '/two-faiths.html', not: /Mental Load|Caregiving/ });
t('round7b', 'i do all the planning for the three of us', { not: /the other person|both lists|both of you/ });
t('round7b', 'my mum keeps dropping by unannounced (grown child, not the grandparent card)', { q: 'my mum keeps dropping by unannounced', not: /new parents to want to find their own way/ });
t('round7b', 'she says i just turn up without calling. i only want to help', { id: 'gpadvice' });
c('round7b', ['please use more simple English', 'how do we close the gap on chores'], { not: /can hurts|close the gap|wear on/ });
t('round7b', 'toddlers', { id: 'toddlers', not: /Two little ones at once/ });
t('round7b', 'my ex never remembers anything for our daughter', { id: 'handoffkit', text: /^It’s tiring/ });
t('round7b', 'my nan says im useless and i want to die', { kind: 'safety', text: /Samaritans.*116 123/ });
t('round7b', 'i want to kill myself (UK lines too)', { q: 'i want to kill myself', kind: 'safety', text: /988[\s\S]*Childline[\s\S]*0800 1111/ });

// ---------------------------------------------------------------- Professor Puddles' voice (personality.json): light lines only where they belong
const PERS = (() => { try { return JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'personality.json'), 'utf8')); } catch (e) { return null; } })();
if (PERS) {
  const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lines = k => (PERS[k] || []).filter(x => typeof x === 'string');
  const anyOf = ks => new RegExp(ks.map(k => lines(k).map(x => esc(x.replace(/\{name\}/g, '').slice(0, 40)))).flat().filter(Boolean).join('|') || '$^');
  const FUNNY = anyOf(['light_openers', 'light_closers', 'jokes', 'game_and_play', 'not_found', 'clarify', 'greetings', 'thanks_replies']);
  t('puddles', 'tell me a joke', { kind: 'fun', text: anyOf(['jokes']) });
  c('puddles', ['tell me a joke', 'another one'], { kind: 'fun', text: anyOf(['jokes']) });
  t('puddles', 'lol', { kind: 'fun', text: anyOf(['thanks_replies']) });
  t('puddles', 'you\'re funny', { kind: 'fun' });
  t('puddles', 'who are you', { text: anyOf(['self_description']) });
  c('puddles', ['What is the Lemonade Stand?', 'thanks'], { kind: 'thanks', text: anyOf(['thanks_replies']) });
  // an ordinary tool answer may get one light line, but its own content is all still there
  t('puddles', 'What is the Lemonade Stand? (content unchanged)', { q: 'What is the Lemonade Stand?', id: 'lemonade', link: '/lemonade-stand.html', text: /Lemonade Stand/ });
  // never near anything serious, sad or personal
  t('puddles', 'My partner hits me (no joke)', { q: 'My partner hits me', kind: 'safety', not: FUNNY });
  t('puddles', 'I want to kill myself (no joke)', { q: 'I want to kill myself', kind: 'safety', not: FUNNY });
  t('puddles', 'my husband died (no joke)', { q: 'my husband died last month', not: FUNNY });
  t('puddles', 'i feel so lonely (no joke)', { q: 'i feel so lonely', not: FUNNY });
  t('puddles', 'we keep fighting about chores (no joke)', { q: 'we keep fighting about chores', not: FUNNY });
  c('puddles', ['He threatened to hurt me', 'What is the Lemonade Stand?'], { not: FUNNY });
  t('puddles', 'am i an abuser (no joke)', { q: 'am i an abuser', not: FUNNY });
  if (PERS.smalltalk) {
    t('puddles', 'how are you', { kind: 'chat' });
    t('puddles', 'how are you supposed to split chores (not small talk)', { q: 'how are you supposed to split chores', text: /chore|job|split|share|Lemonade/i, not: anyOf(['jokes']) });
    t('puddles', 'i\'m tired', { kind: 'chat' });
    t('puddles', 'i\'m tired of everything (not small talk)', { q: 'i\'m tired of everything', not: FUNNY });
    t('puddles', 'i\'m exhausted from caring for my mum (not small talk)', { q: 'i\'m exhausted from caring for my mum', not: FUNNY });
    t('puddles', 'hi my husband yells at me', { kind: 'safety', not: FUNNY });
    t('puddles', 'my name is Sam', { kind: 'chat', text: /Sam/ });
    c('puddles', ['let\'s just chat', 'pizza'], { kind: 'chat' });
    t('puddles', "i'm tired of everything goes to care", { q: "i'm tired of everything", kind: 'care', id: 'feelinglow', text: /988/ });
    t('puddles', "I'm Sam (a name, said the short way)", { q: "I'm Sam", kind: 'chat', text: /Sam/ });
    t('puddles', "I'm Tired (a feeling, not a name)", { q: "I'm Tired", kind: 'chat', not: /meet you, Tired/ });
    c('puddles', ['my name is Sam', 'how are you'], { kind: 'chat', not: /\{name\}/ });
    c('puddles', ["let's just chat", 'i feel sad today'], { kind: 'care', not: FUNNY });
    t('puddles', 'hi', { kind: 'chat' });
    t('puddles', 'what can you do (still the full help)', { q: 'what can you do', text: /talk deep/ });
    t('puddles', 'how are you going to help me with chores (not small talk)', { q: 'how are you going to help me with chores', text: /chore|job|split|share|Lemonade/i });
    t('puddles', 'can I trust your answers', { kind: 'about', text: /I don’t make things up: every answer comes from this site’s own pages, written and checked by people/, link: '/method-and-limits.html' });
    t('puddles', 'do you hallucinate', { kind: 'about', text: /I don’t make things up[\s\S]*that’s not it[\s\S]*not a therapist and can’t diagnose/ });
    t('puddles', 'are you AI?', { kind: 'about', text: /written and checked by people/ });
    t('puddles', 'who are you (says where answers come from)', { q: 'who are you', text: /I don’t make things up/ });
  }
  // deep talk (deep.json): three lenses, put together; safety, care and someone's own situation always first; no jokes
  const DEEP = (() => { try { return JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'deep.json'), 'utf8')); } catch (e) { return null; } })();
  if (DEEP) {
    const ALL3 = /## Philosophy[\s\S]*## Psychology[\s\S]*## Through an autistic lens[\s\S]*## Putting it together[\s\S]*## A question for you[\s\S]*## Try this/;
    t('deep', 'talk deep', { kind: 'deep', id: 'intro', chip: /small talk/i });
    c('deep', ['talk deep', 'what is love'], { kind: 'deep', id: 'what-is-love', text: ALL3, not: FUNNY, link: '/book/understanding-5-belonging.html' });
    c('deep', ['Talk deep', 'what is love', 'and through an autistic lens?'], { kind: 'deep', id: 'what-is-love', text: /^## Through an autistic lens/ });
    c('deep', ['talk deep', 'what is love', 'what would the stoics say?'], { kind: 'deep', id: 'what-is-love', text: /^## Philosophy/ });
    c('deep', ['talk deep', 'he hit me'], { kind: 'safety', not: /## Philosophy|Psychology/ });
    c('deep', ['talk deep', 'my husband yells at me'], { kind: 'safety', not: /## Philosophy/ });
    c('deep', ['talk deep', 'i feel so lonely'], { kind: 'care', not: /## Philosophy/ });
    c('deep', ['talk deep', 'is it controlling if I ask him to check with me before he buys things?'], { id: 'moneycontrol' });
    c('deep', ['talk deep', 'small talk'], { kind: 'chat', not: /## Philosophy/ });
    c('deep', ['talk deep', 'small talk', 'what is love'], { not: /## Philosophy/, chip: /Go deeper on this/ });
    c('deep', ['talk deep', 'what is the lemonade stand'], { id: 'lemonade' });
    c('deep', ['talk deep', 'blorp the zingle'], { kind: 'deep', id: 'nomatch', not: FUNNY });
    c('deep', ['talk deep', 'ask me a big question'], { kind: 'deep', text: ALL3 });
    t('deep', 'talk deep about one owner', { kind: 'deep', id: 'one-owner', text: ALL3 });
    t('deep', 'what is love (outside deep mode: an ordinary answer, and the offer)', { q: 'what is love', not: /## Philosophy/, chip: /Go deeper on this/ });
    t('deep', 'my partner never does the dishes (no deep offer on a personal situation)', { q: 'my partner never does the dishes', nochip: /Go deeper on this/ });
    t('deep', 'My partner hits me (no deep offer)', { q: 'My partner hits me', kind: 'safety', nochip: /Go deeper|infographic/i });
    c('deep', ['my partner never does the dishes', 'go deeper'], { not: /## Philosophy/ });
    t('deep', 'talk deep: what is love?', { kind: 'deep', id: 'what-is-love', text: ALL3 });
    t('deep', 'Talk deep, is honesty always kind?', { kind: 'deep', id: 'is-honesty-kind' });
    t('deep', 'Talk deep about what love is', { kind: 'deep', id: 'what-is-love' });
    t('deep', 'deep: can people change?', { kind: 'deep', id: 'can-people-change' });
    t('deep', 'deep breathing exercises (not deep mode)', { q: 'deep breathing exercises', not: /## Philosophy/ });
    c('deep', ['talk deep', 'is it selfish to have boundaries?'], { kind: 'deep', id: 'are-boundaries-selfish' });
    c('deep', ['talk deep', "my mum says i'm selfish for having boundaries"], { kind: 'care', not: /## Philosophy/ });
    t('deep', 'Is honesty always kind? (outside deep mode: offered)', { q: 'Is honesty always kind?', text: /talk deep about it/, chip: /Go deeper on this/ });
    (DEEP.follow_ups || []).forEach(fu => c('deep', ['talk deep', 'what is love', fu], { not: /beyond my pond|couldn.t find|didn.t catch/i }));
  }
  // infographics (assets/js/puddles-infographic.js): asked for, or offered under an answer; never of a safety reply
  if (require('fs').existsSync(require('path').join(__dirname, '..', '..', 'assets/js/puddles-infographic.js'))) {
    t('info', 'make an infographic about the mental load', { kind: 'info', info: true });
    t('info', 'make me a chart: me 60 them 40', { kind: 'info', info: 'split' });
    t('info', 'can you draw a picture of the pursue withdraw cycle', { kind: 'info', info: true });
    t('info', 'make a poster about a good pause', { kind: 'info', info: true });
    t('info', 'show me the mental load as a picture', { kind: 'info', info: true });
    c('info', ['How do we stop fighting about chores?', 'summarise this as an infographic'], { kind: 'info', info: true });
    c('info', ['talk deep', 'what is love', 'summarise this as an infographic'], { kind: 'info', info: true });
    t('info', 'Show fair vs equal as a picture', { kind: 'info', info: true });
    t('info', 'Draw fair vs equal as a picture', { kind: 'info', info: true });
    t('info', 'make an infographic about the double empathy problem', { kind: 'info', info: true });
    t('info', 'make an infographic about bananas', { kind: 'clarify', chip: /mental load/i });
    t('info', 'infographic', { kind: 'clarify' });
    t('info', 'what is the infographic? (the site page)', { q: 'what is the infographic?', id: 'infographic' });
    c('info', ['My partner hits me', 'make an infographic'], { kind: 'safety', not: /\[infographic/ });
    c('info', ['My partner hits me', 'summarise this as an infographic'], { kind: 'safety', not: /\[infographic/ });
    t('info', 'how do we split chores fairly (offered as a picture)', { q: 'how do we split chores fairly', chip: /Make this an infographic/ });
    t('info', 'what can you do (says so)', { q: 'what can you do', text: /infographic/ });
  }
  // Part Three of the book, the ladder check and Say no kindly
  t('part3', 'how do feelings work', { link: '/book/understanding-1-feelings.html' });
  t('part3', 'how do I say no nicely', { link: '/refusals.html' });
  t('part3', 'where am I on the ladder', { link: '/ladder.html' });
  t('part3', 'I feel shut down', { link: '/ladder.html', not: /988/ });
  t('part3', 'what is self-compassion', { link: '/book/understanding-7-worth.html' });
  t('part3', 'why is change so hard', { link: '/book/understanding-6-change.html' });

  // round 7, chat4: small talk in his voice, never near anything serious; the two modes; the honest answer; the fallback question
  if (PERS.smalltalk) {
    t('chat4', "what's your favourite food", { kind: 'chat', id: 'fav_food' });
    t('chat4', "what's your name", { kind: 'chat', id: 'your_name', text: /Professor Puddles|Puddles/ });
    t('chat4', 'how old are you', { kind: 'chat', id: 'your_age' });
    t('chat4', 'where do you live', { kind: 'chat', id: 'where_live' });
    t('chat4', 'coffee or tea', { kind: 'chat', id: 'coffee_tea' });
    t('chat4', 'sing me a song', { kind: 'chat', id: 'sing' });
    t('chat4', 'good morning', { kind: 'chat', id: 'good_morning' });
    t('chat4', "it's my birthday", { kind: 'chat', id: 'my_birthday' });
    t('chat4', 'hi (says what he can do, in his voice)', { q: 'hi', kind: 'chat', text: /talk deep[\s\S]*infographic/i });
    t('chat4', 'are you a duck (no: a raindrop)', { q: 'are you a duck', kind: 'chat', text: /raindrop/, not: /I’m a duck|I am a duck/ });
    t('chat4', 'are you a raindrop', { kind: 'chat', id: 'are_you_real', not: /\bduck\b/i });
    c('chat4', ['my name is Priya', "what's my name"], { kind: 'chat', id: 'my_name', text: /Priya/ });
    t('chat4', "what's my name (not told yet)", { q: "what's my name", kind: 'chat', id: 'my_name', text: /haven’t told me/ });
    t('chat4', "what's the weather like (small talk, not the tool)", { q: "what's the weather like", kind: 'chat', id: 'weather_talk' });
    t('chat4', "what does my today's weather forecast mean (the tool)", { q: "what does my today's weather forecast mean", id: 'weather' });
    t('chat4', 'my dog died (no joke)', { q: 'my dog died', not: FUNNY });
    t('chat4', 'my mum has cancer (no joke)', { q: 'my mum has cancer', not: FUNNY });
    t('chat4', 'he controls all our money (no joke)', { q: 'he controls all our money', kind: 'safety', not: FUNNY });
    t('chat4', 'my son is self harming (no joke)', { q: 'my son is self harming', not: FUNNY });
    t('chat4', 'i feel worthless (no joke)', { q: 'i feel worthless', not: FUNNY });
    t('chat4', 'i have a chronic illness, how do we split chores fairly (no joke)', { q: 'i have a chronic illness, how do we split chores fairly', not: FUNNY });
    c('chat4', ['tell me a joke', 'my dad died yesterday'], { not: FUNNY });
    c('chat4', ["let's just chat", 'he screams at me and calls me worthless'], { kind: 'safety', not: FUNNY });
    c('chat4', ['talk deep', 'my wife died'], { not: /## Philosophy/, nochip: /joke/i });
    // the two modes
    t('chat4', 'what modes do you have', { kind: 'about', id: 'modes', text: /Light mode[\s\S]*Deep mode[\s\S]*small talk/, chip: /Talk deep/ });
    t('chat4', 'what is deep mode', { id: 'modes' });
    c('chat4', ['talk deep', 'what modes do you have'], { id: 'modes', text: /deep mode right now/, chip: /small talk/i });
    t('chat4', 'what modes of conflict are there (not the chat modes)', { q: 'what modes of conflict are there', not: /Two modes/ });
    t('chat4', 'what can you do (two modes, infographics)', { q: 'what can you do', text: /Light mode[\s\S]*Deep mode[\s\S]*small talk[\s\S]*infographic/ });
    t('chat4', "let's talk deep about love", { kind: 'deep', id: 'what-is-love' });
    t('chat4', 'can we go deep', { kind: 'deep', id: 'intro' });
    c('chat4', ['talk deep', 'what makes a good friend'], { kind: 'deep', id: 'good-friend', link: '/friends.html' });
    // infographics, in his own words
    t('chat4', 'can you make a chart of the mental load', { kind: 'info', info: true });
    t('chat4', 'draw me a picture of love languages', { kind: 'info', info: true, link: '/love-languages.html' });
    t('chat4', 'make an infographic about small wins', { kind: 'info', info: true, link: '/small-wins.html' });
    t('chat4', 'make me a poster about the ladder', { kind: 'info', info: true, link: '/ladder.html' });
    // the honest answer: rule-based, from the site's own checked pages, can pick the wrong topic, not a therapist
    const HONEST = /I don’t make things up[\s\S]*checked by people[\s\S]*wrong topic[\s\S]*not a therapist[\s\S]*rule-based/;
    ['do you make things up', 'are you an AI', 'can i trust you', 'do you hallucinate', 'are you chatgpt', 'is this real advice', 'do you make mistakes'].forEach(q =>
      t('chat4', q, { kind: 'about', id: 'honest', text: HONEST, link: '/ask.html#how-he-answers' }));
    t('chat4', 'can i trust your answers (research link)', { q: 'can i trust your answers', link: '/research.html' });
    t('chat4', 'are you a therapist (still the scope answer)', { q: 'are you a therapist', id: 'therapistq' });
    t('chat4', 'where can i find a counsellor (no “No.”)', { q: 'where can i find a counsellor', id: 'findcounsellor', not: /^No\./, link: '/outside-help.html' });
    t('chat4', 'how do i find a couples therapist', { id: 'findcounsellor' });
    // nothing matches: a clarifying question in his voice, naming likely topics, never a confident wrong answer
    t('chat4', 'the cat sat on the mat', { kind: 'offtopic', text: /(sharing the load|getting along)[\s\S]*\?/, chip: /chores|everything|start/i });
    t('chat4', 'purple elephants dancing', { text: /\?/, not: /^(Here’s|The site)/ });
    t('chat4', 'fix my car engine', { kind: 'offtopic', text: /Is your question about/ });
  }
  // the new pages: the right questions reach them
  t('chat4', 'how do I communicate better', { id: 'commguide', link: '/communication.html' });
  t('chat4', 'how do I talk so people listen', { id: 'commguide', link: '/communication.html' });
  t('chat4', 'how do we feel closer', { id: 'bondingguide', link: '/bonding.html' });
  t('chat4', 'what helps us feel connected', { id: 'bondingguide', link: '/bonding.html' });
  t('chat4', 'how do small wins help', { id: 'smallwins', link: '/small-wins.html' });
  t('chat4', "where's the research", { id: 'researchpage', link: '/research.html' });
  t('chat4', 'where do the studies come from', { id: 'researchpage', link: '/research.html' });
  t('chat4', 'is this evidence based', { id: 'evidence', link: '/research.html' });
  t('chat4', 'which pages are for my relationship', { id: 'byrelationship', link: '/by-relationship.html' });
  t('chat4', "what's on the by relationship page", { id: 'byrelationship', link: '/by-relationship.html' });
  t('chat4', 'what is the ladder', { id: 'ladder', link: '/ladder.html' });
  t('chat4', 'what is chapter 8 of part three about', { id: 'u8loss', link: '/book/understanding-8-loss.html' });
  t('chat4', 'part three chapter 4', { id: 'u4communication', link: '/book/understanding-4-communication.html' });
  t('chat4', 'why do I see things differently from my partner', { id: 'u3seeing', link: '/book/understanding-3-seeing.html' });
  t('chat4', 'how does hurt heal', { id: 'u11healing', link: '/book/understanding-11-healing.html' });
  t('chat4', 'what is self-compassion', { id: 'u7worth' });
  t('chat4', 'how do I help someone who is struggling', { id: 'u12helping' });
  t('chat4', 'what is neurodiversity', { link: ['/book/understanding-9-minds.html', '/wired-differently.html', '/glossary.html'] });
  t('chat4', 'Help me say no to extra work', { id: 'refusals', link: '/refusals.html' });
  t('chat4', 'Give me words to ask for a pause', { id: 'wp11', script: true });
  t('chat4', 'How do I apologise so it lands?', { id: 'apologylang', link: '/apology-languages.html' });
  t('chat4', 'How do I tell my mum to text before visiting?', { id: 'familyboundary', link: '/grown-up-children.html' });
  t('chat4', 'do you have examples', { id: 'examplespage', link: '/examples.html' });
  t('chat4', 'someone sent me this link', { id: 'sentlink', link: '/sent-this.html' });
  t('chat4', 'i have a chronic illness, how do we split chores fairly', { link: '/when-one-is-ill.html' });
  t('chat4', 'my partner works nights and we never see each other', { link: '/different-hours.html' });
  t('chat4', 'our children left for university, the house is so quiet', { link: '/empty-nest.html' });
  t('chat4', 'is there anything for interfaith couples?', { link: '/two-faiths.html' });
  t('chat4', 'does this work for polyamorous relationships', { link: '/more-than-two.html' });
  t('chat4', 'he plays video games all night and ignores me', { link: '/gaming-and-time-together.html' });
  t('chat4', "i'm raising my grandson and i'm exhausted", { link: '/foster-and-kinship.html' });
  t('chat4', 'my grandson has ADHD, how should I talk to him', { link: '/adhd-kids.html' });
  t('chat4', 'my brother got dad\'s house in the will', { link: '/family-rifts.html' });
  t('chat4', 'i just got back from deployment, is this normal', { link: '/coming-home.html' });
  t('chat4', 'build a life again after divorce', { link: '/on-my-own.html' });
  t('chat4', "i'm a saver and he's a spender", { link: '/money-together.html' });
  t('chat4', 'my roommate and i need some rules', { link: '/sharing-a-room.html' });
}

// ---------------------------------------------------------------- ask.html: every "Try asking…" question gets a real answer
// (deep questions are asked after "Talk deep", as the page does; a question the page adds later is still checked: never a fallback)
{
  const ASK = {
    'I feel like I do everything at home': { kind: 'sit', link: '/lemonade-stand.html' },
    'My best friend never texts back since she had her baby': { id: 'friends', link: '/friends.html' },
    'My housemate never does the dishes': { id: 'roommate+fairness' },
    'My co-parent changes the schedule at the last minute': { id: 'coparent+reliability' },
    'My coworker keeps interrupting me': { id: 'coworker+interrupt' },
    'My teenager won’t talk to me': { id: 'kid+distance' },
    'My partner works nights and we never see each other': { id: 'differenthours', link: '/different-hours.html' },
    'What’s the Lemonade Stand?': { id: 'lemonade', link: '/lemonade-stand.html' },
    'Which tool helps us split chores fairly?': { id: 'share-the-load' },
    'How do I use the Battery Meter?': { id: 'wp02', steps: true },
    'Is there a game we can play together?': { id: 'gamefortwo', link: '/recheck-drive.html' },
    'I need to calm down right now': { id: 'calmnow' },
    'Where do I start?': { id: 'start', link: '/start-here.html' },
    'How do I tell my mum to text before visiting?': { id: 'familyboundary', link: '/grown-up-children.html' },
    'Help me say no to extra work': { id: 'refusals', link: '/refusals.html' },
    'How do I ask my partner for more help at home?': { kind: 'sit', script: true },
    'Give me words to ask for a pause': { id: 'wp11', script: true },
    'How do I apologise so it lands?': { id: 'apologylang' },
    'How do I say sorry to my sister?': { id: 'family+repair', script: true },
    'How are you, Professor?': { kind: 'chat', id: 'how_are_you' },
    'Let’s just chat': { kind: 'chat' },
    'Tell me a joke': { kind: 'fun' },
    'Tell me a riddle': { kind: 'chat', id: 'riddle' },
    'Tell me a fun fact': { kind: 'chat', id: 'fun_fact' },
    'Who are you?': { text: /Professor Puddles/ },
    '¿Hablas español?': { kind: 'lang', link: '/en-espanol.html', not: /1-800-799-7233/ },
    'What is love?': { kind: 'deep', id: 'what-is-love' },
    'Is honesty always kind?': { kind: 'deep', id: 'is-honesty-kind' },
    'Can people change?': { kind: 'deep', id: 'can-people-change' },
    'Why do we fight with the people we love?': { kind: 'deep', id: 'why-we-fight' },
    'Is it okay to need routines?': { kind: 'deep', id: 'needing-routines' },
    'Is it wrong to want time alone?': { kind: 'deep', id: 'wanting-time-alone' },
    'What makes a good friend?': { kind: 'deep', id: 'good-friend' },
    'Make an infographic about the mental load': { kind: 'info', info: true },
    'Draw me a picture of fair vs equal': { kind: 'info', info: 'compare' },
    'Make an infographic about taking a good pause': { kind: 'info', info: true },
    'Make an infographic about one wants to talk and one needs space': { kind: 'info', info: 'cycle', link: '/pursue-withdraw.html' },
    'Make an infographic about love languages': { kind: 'info', info: true, link: '/love-languages.html' },
    'Make a checklist infographic about a calm check-in': { kind: 'info', info: 'checklist' },
    'Make me a chart: me 60 them 40': { kind: 'info', info: 'split' },
    'What is the double empathy problem?': { link: '/wired-differently' },
    'What is the mental load?': { link: ['/glossary.html#load', '/book/preface.html'] },
    'Why isn’t fair always 50/50?': { link: ['/library/', '/share-the-load.html'] },
    'What is a bid for connection?': { link: '/glossary.html#bid' },
    'What does flooded mean?': { link: '/glossary.html#flooded' },
    'What does my battery score mean?': { id: 'wp02' },
    'What is the Signal Translator for?': { id: 'signal', link: '/signal-translator.html' }
  };
  let page = '';
  try { page = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'ask.html'), 'utf8'); } catch (e) { page = ''; }
  const NOFIND = /beyond my puddle|couldn’t find|didn’t catch|isn’t covered here|outside my little/;
  const ent = x => x.replace(/&rsquo;|&#8217;/g, '’').replace(/&amp;/g, '&').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const qs = [...page.matchAll(/<button[^>]*class="ap-q"[^>]*data-q([^>]*)>([\s\S]*?)<\/button>/g)].map(m => ({ q: ent(m[2]), deep: /data-deep/.test(m[1]) }));
  qs.forEach(({ q, deep }) => {
    const e = Object.assign({ not: NOFIND }, ASK[q] || {});
    if (e.not !== NOFIND) e.not = new RegExp(e.not.source + '|' + NOFIND.source);
    if (deep) c('askpage', ['Talk deep', q], e); else t('askpage', q, e);
  });
  const gone = Object.keys(ASK).filter(k => !qs.some(x => x.q === k));
  if (page && gone.length) console.log('note: no longer on ask.html (their specific checks are unused): ' + gone.join(' | '));
}

// ---------------------------------------------------------------- run
(async () => {
  const args = process.argv.slice(2), verbose = args.includes('-v'), only = args.filter(a => a[0] !== '-')[0];
  const tests = only ? T.filter(x => x.g.includes(only)) : T;
  let pass = 0; const fails = [], groups = {};
  for (const x of tests) {
    const chat = makeChat();
    const qs = x.convo || [x.q];
    let r;
    for (const q of qs) r = await chat.ask(q);
    const text = replyText(r), links = replyLinks(r), why = [];
    const idOf = r.id || '';
    if (x.kind && r.kind !== x.kind) why.push('kind ' + r.kind + ' ≠ ' + x.kind);
    if (x.id && !(x.id instanceof RegExp ? x.id.test(idOf) : idOf === x.id)) why.push('id ' + idOf + ' ≠ ' + x.id);
    if (x.link) { const want = [].concat(x.link); if (!links.some(u => want.some(w => u.indexOf(w) === 0))) why.push('no link to ' + want.join(' or ') + ' (got ' + links.join(', ') + ')'); }
    if (x.text && !x.text.test(text)) why.push('text !~ ' + x.text);
    if (x.not && x.not.test(text)) why.push('text ~ ' + x.not);
    if (x.script && !(r.blocks || []).some(bl => bl.k === 'script')) why.push('no script');
    if (x.steps && !(r.blocks || []).some(bl => bl.k === 'list')) why.push('no steps');
    if (x.chip && !(r.chips || []).some(ch => x.chip.test(ch.label))) why.push('no chip ~ ' + x.chip + ' (got ' + (r.chips || []).map(ch => ch.label).join(' / ') + ')');
    if (x.nochip && (r.chips || []).some(ch => x.nochip.test(ch.label))) why.push('a chip ~ ' + x.nochip);
    if (x.info) { const ib = (r.blocks || []).filter(bl => bl.k === 'info'); const sp = ib[0] && ib[0].spec; if (!sp) why.push('no infographic block'); else if (!sp.layout || !sp.title || !((sp.items && sp.items.length) || (sp.data && sp.data.length) || sp.left || sp.pairs || sp.banner)) why.push('infographic spec incomplete'); else if (typeof x.info === 'string' && sp.layout !== x.info) why.push('infographic layout ' + sp.layout + ' ≠ ' + x.info); }
    if (x.kind === 'sit' && !links.length) why.push('no site link');
    if (x.kind === 'sit' && !(r.chips || []).some(ch => /tonight/i.test(ch.label))) why.push('no “What can I do tonight?” chip');
    if (links.length !== new Set(links).size) why.push('a link appears twice');
    (r.blocks || []).forEach(bl => { if (bl.k === 'list' && bl.x.length !== new Set(bl.x).size) why.push('a bullet appears twice'); });
    (r.chips || []).forEach(ch => { if (ch.doc != null && /[.!]$/.test(ch.label)) why.push('statement chip: ' + ch.label); });
    if (x.bgLoaded === false && chat.loaded().some(u => /chat-kb-bg/.test(u))) why.push('background notes were loaded');
    const ok = !why.length;
    groups[x.g] = groups[x.g] || [0, 0]; groups[x.g][1]++; if (ok) { pass++; groups[x.g][0]++; }
    if (!ok) fails.push({ x, why, text });
    if (verbose) console.log((ok ? 'PASS ' : 'FAIL ') + '[' + x.g + '] ' + qs.join(' → ') + '  (' + r.kind + ' ' + idOf + ')\n' + text.replace(/^/gm, '     ') + '\n');
  }
  // the knowledge base itself: page titles never carry the site name added for search engines,
  // and no SVG <title> text is glued onto a page title ("Our Logo · Spread Love & AcceptanceSpread Love…")
  if (!only || 'kb'.includes(only)) {
    const kbSrc = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'assets/js/chat-kb.js'), 'utf8');
    const bad = (kbSrc.match(/"t":"[^"]*(· Spread Love|Acceptance[A-Z])[^"]*"/g) || []);
    groups.kb = [bad.length ? 0 : 1, 1];
    if (!bad.length) pass++; else fails.push({ x: { g: 'kb', q: 'page titles' }, why: ['titles with the site name: ' + bad.slice(0, 3).join(', ')], text: '' });
    tests.push({ g: 'kb' });
  }
  fails.forEach(f => console.log('FAIL [' + f.x.g + '] ' + (f.x.convo || [f.x.q]).join(' → ') + '\n   ' + f.why.join('; ') + '\n   ' + f.text.slice(0, 300).replace(/\n/g, ' | ')));
  console.log('\n' + Object.keys(groups).map(g => g + ' ' + groups[g][0] + '/' + groups[g][1]).join('  ·  '));
  console.log('PASSED ' + pass + ' of ' + tests.length + ' (' + (100 * pass / tests.length).toFixed(1) + '%)');
  process.exitCode = pass === tests.length ? 0 : 1;
})();
