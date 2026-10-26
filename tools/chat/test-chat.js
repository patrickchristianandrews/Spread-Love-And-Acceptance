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
     chip / nochip: RegExp some chip label must (not) match;  info: true or a layout name: the reply holds a drawable infographic
     page '/co-parenting.html' | about 'Separated co-parents': the chat was opened from that page (or /ask.html?about=…) } */
'use strict';
const { makeChat, replyText, replyLinks } = require('./chat-sandbox');

const T = [];
function t(g, q, e) { T.push(Object.assign({ g, q }, e || {})); }
function c(g, convo, e) { T.push(Object.assign({ g, convo }, e || {})); }
// purge19 (the owner's decision): a danger reply is this one short neutral line, with no numbers, services or links,
// and no reply ever carries a removed thing (tools/checks/no-removed-content.js holds the patterns)
const NEUTRAL = /^That sounds really hard\. I’m a small guide to this site, and I can’t help with this one\.$/;
// the owner's update: someone thinking of suicide, not wanting to be here, or hurting themselves gets plain guidance,
// with no numbers, services or links. Every other danger message keeps NEUTRAL.
const SUICIDE = /^I’m really glad you said something\. If you’re having thoughts of hurting yourself or not wanting to be here, please tell someone you trust today, and don’t stay alone with it\.$/;
const GONE = require('../checks/no-removed-content.js').PATTERNS;

// ---------------------------------------------------------------- every tool
t('tools', 'What is the Lemonade Stand?', { kind: 'card', id: 'lemonade', link: '/lemonade-stand.html' });
t('tools', 'How do I use the lemonade stand?', { kind: 'card', id: 'lemonade', steps: true });
t('tools', 'What do the Lemonade Stand results mean?', { kind: 'card', id: 'lemonade', text: /not a verdict|judgment/ });
t('tools', 'Can I use the Lemonade Stand just for me?', { kind: 'card', id: 'lemonade', text: /Just me/, link: '/lemonade-stand.html' });
t('tools', 'Does the lemonade stand have a task library?', { kind: 'card', id: 'lemonade', text: /task library/ });
t('tools', 'How do I make a wiring card?', { kind: 'card', id: 'wiringcard', link: '/wiring-card.html' });
t('tools', 'what is the signal translator for', { kind: 'card', id: 'signal', link: '/signal-translator.html' });
t('tools', 'How does the Carrier Wave Decoder work?', { kind: 'card', id: 'decoder', link: '/carrier-wave-decoder.html' });
t('tools', 'Can I paste a text thread into the conversation reader?', { kind: 'card', id: 'reader', link: '/signal-translator.html#conversation' });  // shot10: one Chat analyzer
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
t('tools', 'Where can I find articles to read?', { kind: 'card', id: 'reading', link: '/reading.html', not: /medical advice|not therapy or/i });   // owner: no "not medical advice" disclaimer lines
t('tools', 'what does matching energy mean', { kind: 'card', id: 'control', link: '/book/self-2-now-in-depth.html#control' });
t('tools', 'what is in my control', { kind: 'card', id: 'control' });
t('tools', 'find me an article about stress', { kind: 'card', id: 'reading', text: /good articles on “stress,”/, link: '/reading.html' });
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
c('followups', ['What is active listening?', 'tell me more'], { not: /couldn’t find|don’t have a page/ });
// conversation turns: keep the topic, plain thanks, red flags, "that didn't help", topic switches
c('followups', ['My partner never does the dishes', 'ok and then what?'], { kind: 'sit-more', text: /calm conversation/ });
c('followups', ['My partner never does the dishes', 'ok and then what?', 'and then what'], { kind: 'sit-more', text: /one ordinary week/ });
c('followups', ['My partner never does the dishes', 'that didn’t help'], { kind: 'nohelp', text: /another side/ });
c('followups', ['My partner never does the dishes', 'I already tried that'], { kind: 'nohelp', text: /already tried/ });
c('followups', ['We keep fighting about money', 'is that a red flag?'], { kind: 'redflag', text: /fixable/ });
c('followups', ['We keep fighting about money', 'is that a red flag?', 'what should I do first?'], { kind: 'sit-more' });
c('followups', ['I feel lonely since my mom died', 'what about my sister?'], { kind: 'care', text: /your sister/ });
c('followups', ['My partner never does the dishes', 'different question, how do I calm down fast'], { kind: 'care', link: '/night-garden.html' });
c('followups', ['My partner never does the dishes', 'start over'], { kind: 'restart' });
// Puddles answers thanks in his own voice (personality.json thanks_replies), so only the kind is fixed
c('followups', ['My partner never does the dishes', 'thanks'], { kind: 'thanks', not: /dishes|Lemonade/ });
c('followups', ['thank you so much puddles'], { kind: 'thanks' });
c('followups', ['is this controlling?'], { kind: 'redflag' });

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
// danger from another person: the short neutral reply, never tips (purge19: no lines, services or links)
function d(q) { t('safety', q, { kind: 'safety', text: NEUTRAL }); }
d('My partner hits me');
t('safety', 'I want to kill myself', { kind: 'safety', text: SUICIDE });
t('safety', 'I don\'t want to be here anymore', { kind: 'safety', text: SUICIDE });
t('safety', 'mid-chat: better off without me', { q: 'everyone would be better off without me', kind: 'safety', text: SUICIDE });
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
t('pages', 'Surprise me', { not: /couldn’t find|don’t have a page/ });

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
t('tester', "my roommate's boyfriend is always over", { id: 'roomguests', link: '/sharing-a-room.html#guests' });  // round 8: the shared-room answer, not house and bills
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
// safety: control and fear are never answered with tips (purge19: and carry no lines, services or links)
t('safety', 'my partner checks my phone and gets angry', { kind: 'safety', text: /common signs of control/ });
t('safety', 'is it my fault he yells', { kind: 'safety', not: /own your part/ });
t('safety', "I'm scared to go home", { kind: 'safety', text: NEUTRAL });
t('safety', "he won't let me see my friends", { kind: 'safety' });
t('safety', 'she controls all the money and takes my keys', { kind: 'safety' });
t('safety', 'how do I hide that I visited this site', { kind: 'safety', text: /private window/ });
t('safety', 'I want to end my life', { kind: 'safety', text: SUICIDE });
// on your own, groups and parents
t('care', 'how do I stop over-giving', { kind: 'care', id: 'overgive', link: '/book/self-2-now-in-depth.html#control' });
t('care', 'how do I set boundaries', { kind: 'care', id: 'overgive' });
t('care', 'I just got divorced and feel lost', { kind: 'care', id: 'onmyown', link: '/self-path.html' });
t('care', 'Is there a leader guide for a church small group?', { kind: 'care', id: 'group', link: '/groups.html' });
t('care', 'how do I raise emotionally healthy kids', { kind: 'care', id: 'raisekids', link: '/parents.html' });
t('care', "I'm 15 and my parents don't understand me", { id: 'teenparents' });
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
t('care', 'is my husband on the spectrum', { kind: 'care', id: /^diagnose/, text: /can’t tell you that/ });  // chat9: someone else's diagnosis has its own card
t('care', 'is this a diagnosis? (the therapy card)', { q: 'is this a diagnosis', kind: 'card', id: 'therapy' });
t('care', 'asdfgh', { kind: 'unclear', text: /didn’t catch that/, not: /pond/ });
t('care', 'what’s the difference between the 7-day log and the almanac', { kind: 'care', id: 'weatherlog', text: /same thing/ });
// action, not research
t('care', 'I just had a fight with my partner and I only have 5 minutes', { kind: 'care', id: 'fightnow', link: ['/wp-11.html'], not: /5:1|five positive/ });
t('care', 'we just had a huge argument', { kind: 'care', id: 'fightnow', link: '/carrier-wave-decoder.html#decode' });
t('care', 'what should I do next', { kind: 'care', id: 'nextstep', link: '/signal-translator.html', not: /ego depletion/ });
t('care', 'give me one thing to do', { kind: 'care', id: 'nextstep', not: /Spending on others/ });
t('care', 'remind me later', { kind: 'care', id: 'remind', text: /can’t send reminders/ });
t('care', 'I only have 10 minutes', { kind: 'care', id: 'minutes', link: '/quick-checks.html#today' });
c('care', ['my roommates never do their chores', 'what should I do next'], { kind: 'sit-more', text: /tiny step for tonight/ });
// the topic doesn't stick to unrelated follow-ups; "tl;dr" shortens the last answer
c('care', ['my partner snapped at me', 'where did I leave off'], { kind: 'care', text: /last talking about being snapped at/ });
t('care', 'where did I leave off (fresh)', { q: 'where did I leave off', kind: 'care', text: /starting fresh/ });
c('care', ['i feel overwhelmed', 'tl;dr please'], { kind: 'short', text: /^The short version: /, not: /Thanks for telling me more/ });
c('care', ['what is the lemonade stand', 'make it shorter'], { kind: 'short', text: /^The short version: / });
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
t('nt2', "I can't focus on long pages (all the helps)", { q: "I can't focus on long pages", text: /The short version[\s\S]*Simple version[\s\S]*Easy reading[\s\S]*2, 5 or 10 minutes/ });
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
t('nt2', 'can i use a screen shot', { kind: 'care', id: 'screenshot', text: /Choose screenshots/, link: '/signal-translator.html', not: /phone-free|attention/ });
t('nt2', 'how do i make the writing biger (Extra large)', { q: 'how do i make the writing biger', kind: 'care', id: 'textsize', text: /Extra large/ });
c('nt2', ['what is the lemonade stand', 'make it shorter', 'what is the signal translator'], { kind: 'card', id: 'signal', text: /^The short version: /, not: /## How to use it/ });
c('nt2', ['what is the lemonade stand', 'make it shorter', 'what is the signal translator', 'I feel overwhelmed'], { kind: 'sit', text: /^The short version: /, not: /What might be going on/ });
c('nt2', ['what is the lemonade stand', 'make it shorter', 'what is the signal translator', 'tell me more'], { kind: 'card', id: 'signal', text: /## How to use it/ });
c('nt2', ['what is the lemonade stand', 'make it shorter', 'what is the signal translator', 'tell me more', 'what is WP-02'], { kind: 'card', id: 'wp02', text: /## How to use it/ });
c('nt2', ['make it shorter', 'what is WP-02'], { kind: 'card', id: 'wp02', text: /^The short version: / });
c('nt2', ['keep your answers short', 'my partner snapped at me'], { kind: 'sit', text: /^The short version: I’m sorry\. Being snapped at/, script: true });
t('nt2', 'too long didnt read (points to the short ways in)', { q: 'too long didnt read', kind: 'short', text: /Simple version[\s\S]*The short version/ });
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
c('nt2', ['can you talk slower, this is a lot', 'what is WP-02'], { kind: 'card', id: 'wp02', text: /^The short version: / });
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
t('parents', 'how do i share this page with a friend', { kind: 'card', id: 'kipshare', not: /Kip|paperclip/i });   // Kip removed (owner, Oct 22)
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
t('safety', "he says it's my fault he yells", { kind: 'safety', not: /Snapping|apolog/i });
t('safety', 'my partner gaslights me', { kind: 'care', id: 'label', not: /red flag|is gaslighting you/ });
t('safety', 'is it controlling if he checks my location', { kind: 'safety', text: /agreed to/ });
t('safety', 'I don\'t want to be here anymore (plain guidance, no lines)', { q: "I don't want to be here anymore", kind: 'safety', text: SUICIDE });
t('care', 'should I leave my husband?', { id: 'leave' });
t('care', 'my gf and i keep fighting about her phone', { id: 'phonetrust' });
t('care', 'i feel kinda alone lately', { id: 'lonely' });
t('care', 'my grown son and I barely talk since his mother passed', { id: 'grownkids', link: '/grief.html#reconnect' });
t('care', 'my two team leads keep fighting over who owns what', { id: 'teamowners', link: '/work.html' });
t('care', 'whats the actual point of this site', { id: 'tol', not: /I think you mean/ });
c('followups', ['my wife died and I don’t know what to do with myself', 'ok and then what?'], { link: '/grief.html' });
c('followups', ['my wife died and I don’t know what to do with myself', 'that didn’t help'], { kind: 'nohelp' });
c('followups', ['my wife died last spring', 'what about my son?'], { kind: 'care', text: /grown son/ });
c('followups', ['my roommate never pays the bills on time', 'that didn’t help', 'i already tried that'], { kind: 'nohelp', not: /longer look/ });
c('followups', ['my gf and i keep fighting about her phone', 'is that a red flag'], { kind: 'redflag', not: /steps I gave/ });
// round 5: teens, identity, co-parents, caregivers, parents, Spanish
t('safety', 'my friend cuts themselves what do i do', { kind: 'safety', text: NEUTRAL });
t('care', 'my dad makes fun of my pronouns', { id: 'lgbtq' });
t('care', 'im gay and scared to come out', { id: 'lgbtadult' });  // round 8: adult unless they say they're under 18
t('care', 'is my mom allowed to read my texts', { id: 'parentphone', not: /Domestic Violence/ });
t('care', 'my parents fight all the time', { id: 'parentsfight' });
t('care', 'is it harassment if my ex texts me 30 times a day', { id: 'exharass' });
t('care', 'my ex sends me long angry texts every night', { id: 'exmessages', text: /BIFF/ });
t('care', 'should i apologize to my ex for being late', { id: 'exmessages', text: /admit fault/ });
t('care', 'my ex badmouths me to the kids', { id: 'exbadmouth' });
t('care', 'is there respite for dementia caregivers', { id: 'carehelp', text: /real breaks/, not: /doctor|social worker/ });
t('care', 'my grown daughter lives far away and won\'t help with her dad', { id: 'careadultkids' });
t('care', 'I feel guilty that I resent him', { id: 'careresent' });
t('care', 'how i stop yelling', { id: 'yellkids' });
c('followups', ['I am caring for my husband with dementia and I am exhausted', 'my daughter won\'t help'], { id: 'careadultkids' });
t('parents', 'what do you do with my email', { id: 'emailwhy', text: /Buttondown/ });
t('parents', 'what is frequency buddies', { kind: 'card', id: 'buddies', link: '/frequency-buddies.html' });
t('parents', 'is there a frequency buddies music video', { kind: 'card', id: 'buddiesmusicvideo', link: '/frequency-buddies-music-video.html' });
t('parents', 'where can I hear the frequency buddies theme song', { kind: 'card', id: 'buddiesmusicvideo', link: '/frequency-buddies-music-video.html' });
t('parents', 'can I make my own music video', { kind: 'card', id: 'buddiesmvmaker', link: '/frequency-buddies-music-video-maker.html' });
t('parents', 'is there a music video maker for frequency buddies', { kind: 'card', id: 'buddiesmvmaker', link: '/frequency-buddies-music-video-maker.html' });
t('parents', 'when is the next season of frequency buddies', { kind: 'card', id: 'buddiess2', link: '/frequency-buddies-season-2.html', text: /out|three episodes/ });
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
t('connections', 'what does behavioral science have to do with relationships', { kind: 'card', id: 'polymath', text: /Behaviou?ral science, one of the thirteen fields/ });
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
t('retest4', 'im 15 who can i talk to', { kind: 'care', id: 'teentalk', text: /adult you trust/ });
t('retest4', 'what if it gets scary at home', { kind: 'safety', text: NEUTRAL });
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
t('round7', 'sometimes I am impatient with my wife and then I feel guilty', { id: 'careresent' });
t('round7', 'i\'m 31 and bisexual, how do i tell my family about my girlfriend', { id: 'lgbtadult', not: /school counselor|GSA/ });
t('round7', 'my girlfriend is pressuring me to come out to my family before i\'m ready', { id: /lgbtadult|comeoutpartner/ });  // chat9: the guide's partner section
t('round7', 'what if they cut me off', { id: 'familycutoff', not: /Watching someone you care about/ });
t('round7', 'can my family see what i look at on here on our wifi', { id: 'wifiprivacy' });
t('round7', 'can i talk to my RA about this', { id: 'rahelp' });
t('round7', 'im starting to dread going back to my dorm room', { not: /drama room/ });
// round 7 (chat helper fixes): safety first
const ABUSE_OK = /not a communication problem|isn.t a communication problem/;
const NO_SNAP = /snap|full battery|rarely one person|I’m sorry I/;
t('round7', 'When we fight he screams at me and calls me worthless. How do I say things so he doesn\'t get so angry?', { kind: 'safety', text: ABUSE_OK, not: NO_SNAP });
t('round7', 'He never apologizes and always turns things around on me. Is he a narcissist?', { kind: 'ask', id: 'clarify-repair', text: /can’t diagnose[\s\S]*who usually says sorry first/, not: NO_SNAP });
t('round7', 'i feel like i\'m walking on eggshells', { kind: 'safety', not: /hotline|helpline|988|800-/i });   // no outside lines (owner)
t('round7', 'he calls me names', { kind: 'safety' });
t('round7', 'she always turns it around on me', { kind: 'safety' });
t('round7', 'how do i say it so he doesn\'t get angry', { kind: 'safety', not: /Signal Translator|Chat analyzer/ });
t('round7', 'my little brother calls me names', { not: /That sounds really hard\./ });
c('round7', ['he calls me names', 'how do i say it better'], { kind: 'safety', not: /same side/ });
t('round7', 'is it controlling if I ask him to check with me before he buys things?', { id: 'moneycontrol', link: ['/money-together.html'], text: /applies to both/, not: /They pressure you into sex/ });
t('round7', 'is she being controlling about money or is this normal?', { id: 'moneycontrol', link: '/money-together.html' });
t('round7', 'my cofounder and i: they keep telling me how to do things, feels controlling', { id: 'bizpartner', not: /afraid|scared/ });
t('round7', 'Can you be my therapist?', { id: 'therapistq', text: /^No\. I’m a self-help guide, not a therapist/ });
t('round7', 'Is there any evidence this program works?', { id: 'evidence', text: /clinical trial/, link: ['/library.html', '/for-counselors.html'] });
t('round7', 'I\'m a couples therapist. Can I use this with clients?', { id: 'forcounselors', link: '/for-counselors.html' });
t('round7', 'nightmares and i\'m on edge all the time', { id: 'deployhealth', text: /common after deployment/, not: /doctor|medical team/i });
t('round7', 'i just got back from deployment, is this normal', { id: 'deployhealth', link: '/coming-home.html' });
t('round7', 'do you think he has ptsd? he jumps at noises and doesn\'t sleep', { id: 'deployhealth', text: /can’t diagnose/ });
t('round7', 'I want to kill myself (UK lines too)', { q: 'I want to kill myself', kind: 'safety', text: SUICIDE });
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
t('round7', 'my mum is in rehab', { id: 'teenkinship' });
t('round7', 'i miss my mum', { id: 'missing', not: /Never miss twice|habit/ });
c('round7', ['i\'m raising my grandson and i\'m exhausted', 'he\'s on his phone all night'], { id: 'teenphone', not: /jealous|at dinner/ });
// ADHD kids, grandparents, grown children
t('round7', 'my grandson has ADHD, how should I talk to him', { id: 'adhdkids', link: '/adhd-kids.html' });
t('round7', 'is ADHD real or just bad behaviour', { id: 'adhdkids', text: /^Yes, ADHD is real and well studied\. It is not bad behavior or bad upbringing\./ });
c('round7', ['my grandson has ADHD, how should I talk to him', 'he forgets everything I tell him'], { id: /^adhd/, link: '/adhd-kids.html', not: /plans fall through/ });  // chat9: the page's own “When they forget”
c('round7', ['my grandson has ADHD, how should I talk to him', 'what do I say when he can\'t sit still'], { id: /^adhd/, text: /sit still/ });  // chat9: the page's own “When they can’t sit still”
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
c('round7', ['my ex makes decisions about our kid without asking me', 'how do i get a say'], { id: /^coparent(say|decide)$/, not: /DACI|decision rights at work/i });
t('round7', 'he keeps sending her back without her inhaler', { id: 'handoffkit', text: /checklist/ });
t('round7', 'my ex never remembers anything for our daughter', { id: 'handoffkit', text: /^It’s tiring/ });
t('round7', 'kids are bored at my place', { id: 'parttimehome', link: '/on-my-own.html' });
t('round7', 'how do i build a life again after divorce', { id: 'onmyown', link: '/on-my-own.html' });
// business partners
t('round7', 'my business partner thinks I don\'t pull my weight', { id: 'bizpartner', link: '/work.html#business-partners' });
t('round7', 'we\'re not a couple, we co-own a bakery', { id: 'bizpartner' });
c('round7', ['we\'re not a couple, we co-own a bakery', 'nobody sees the admin I do'], { id: /bizpartner|bizadmin/, text: /admin/ });
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
t('round7', 'how do we choose a baby name that works for both our faiths', { id: /^(faithnames|twofaiths)$/ });
t('round7', 'how do we decide what religion to raise our kid', { id: 'twofaiths' });
t('round7', 'I\'m Catholic and my husband is Muslim', { id: 'twofaiths' });
t('round7', 'is there anything specific for interfaith couples?', { id: 'twofaiths' });
t('round7', 'my mum wants the baby baptised', { id: 'twofaiths' });
t('round7', 'how do we do Eid and Christmas', { id: /^(faithholidays|twofaiths)$/ });
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
// illness
t('round7', 'i feel like a burden to my husband', { link: '/when-one-is-ill.html', not: /core belief/i });
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
t('round7b', 'my nan says im useless and i want to die', { kind: 'safety', text: SUICIDE });
t('round7b', 'i want to kill myself (UK lines too)', { q: 'i want to kill myself', kind: 'safety', text: SUICIDE });

// ---------------------------------------------------------------- round 8 safety: fear is information, not a communication problem
const FEAR_OK = NEUTRAL;   // purge19: fear of a person is a danger route: the short neutral reply
const NO_MINIMISE = /relationship matters to you|rarely one person|try again when we’re both calmer|full battery|Feeling nervous about it is normal/;
t('safety8', "he shouts at me at handover in front of our son and I'm scared", { kind: 'safety', text: FEAR_OK, not: NO_MINIMISE });
t('safety8', 'handover fear: the short neutral reply', { q: "he shouts at me at handover in front of our son and I'm scared", kind: 'safety', text: NEUTRAL });
t('safety8', "my ex yells at me at pickups and i'm afraid", { kind: 'safety', text: FEAR_OK, not: NO_MINIMISE });
t('safety8', 'i am frightened of how my co-parent screams at drop off', { kind: 'safety', text: FEAR_OK, not: NO_MINIMISE });
t('safety8', "my husband yells and i'm scared", { kind: 'safety', text: FEAR_OK, not: NO_MINIMISE });
t('safety8', "i'm terrified when my boyfriend gets angry", { kind: 'safety', text: FEAR_OK, not: NO_MINIMISE });
t('safety8', 'i walk on eggshells around my wife', { kind: 'safety', text: NEUTRAL, not: NO_MINIMISE });
t('safety8', "my ex keeps following me and i'm scared", { kind: 'safety', not: NO_MINIMISE });
t('safety8', "i'm scared, my ex keeps turning up at my house", { kind: 'safety', text: FEAR_OK });
t('safety8', 'he grabbed my arm and i was so scared', { kind: 'safety', not: NO_MINIMISE });
c('safety8', ["he shouts at me at handover in front of our son and I'm scared", 'how do i make handovers calmer'], { kind: 'safety', not: /same side|try again when we’re both calmer/ });
c('safety8', ["my husband yells and i'm scared", 'is this abuse?'], { kind: 'safety', not: /sounds like (household|co-parenting) conflict/ });
// not fear of a person: these keep their own answers
t('safety8', "i'm scared my wife will leave me (not the safety reply)", { q: "i'm scared my wife will leave me", not: FEAR_OK });
t('safety8', "my husband is afraid of commitment (not the safety reply)", { q: 'my husband is afraid of commitment', not: FEAR_OK });
t('safety8', "i'm afraid we're drifting apart (not the safety reply)", { q: "i'm afraid we're drifting apart", not: FEAR_OK });
// "is this abuse?" after only everyday complaints: honest, and what would be different
const CONFLICT = /sounds like (co-parenting|household) conflict, not abuse/;
c('safety8', ['my ex forgets things for our son', 'he does nothing', 'is this abuse?'], { text: /sounds like co-parenting conflict, not abuse[\s\S]*signs that would be different/, not: /sounds serious|beyond what a small helper/ });
c('safety8', ['my husband never does the dishes', 'is this abuse?'], { text: /sounds like household conflict, not abuse/, not: /sounds serious/ });
c('safety8', ['my wife forgets everything and does nothing around the house', 'is that abusive?'], { text: CONFLICT, not: /sounds serious/ });
c('safety8', ['my ex makes decisions about our kid without asking me', 'would you call this abuse'], { text: CONFLICT });
c('safety8', ['my partner forgets things', 'he threatens me when i bring it up', 'is this abuse'], { kind: 'safety', not: CONFLICT });
c('safety8', ['my ex forgets things for our son', "i'm scared of him", 'is this abuse?'], { kind: 'safety', not: CONFLICT });
// money control: the normal-vs-control check
t('safety8', 'she wants to see every receipt and gets angry if I buy my friends dinner', { kind: 'safety', link: '/money-together.html#control', text: /common sign of control/, not: /couldn.t find|Nothing here answers/ });
t('safety8', 'receipts: normal vs control', { q: 'she wants to see every receipt and gets angry if I buy my friends dinner', text: /Normal: a limit you both agreed[\s\S]*one-sided/ });
t('safety8', 'he makes me account for every penny', { kind: 'safety', link: '/money-together.html#control' });
t('safety8', 'she gets angry if i buy myself anything', { kind: 'safety', link: '/money-together.html#control' });
t('safety8', 'my wife checks every receipt', { kind: 'safety', link: '/money-together.html#control' });
t('safety8', 'he controls all the money', { kind: 'safety', link: '/money-together.html#control' });
t('safety8', 'my girlfriend checks my phone (control answer)', { q: 'my girlfriend checks my phone', kind: 'safety', text: /difference between sharing you both chose/ });
t('safety8', 'is it controlling if I ask him to check with me before he buys things? (#control)', { q: 'is it controlling if I ask him to check with me before he buys things?', id: 'moneycontrol', link: '/money-together.html#control' });
// a child's pronoun: no "her" for a son; neutral wording in co-parent cards
t('safety8', 'he keeps sending him back without his inhaler', { id: 'handoffkit', not: /\b(her|she)\b/i, text: /your child|their bag/ });
t('safety8', 'my ex never remembers anything for our son', { id: 'handoffkit', not: /\bher\b/i });
t('safety8', 'my ex makes decisions about our son without asking me', { id: 'coparentdecide', not: /\bher\b/i });
c('safety8', ['my ex never remembers anything for our son', 'he forgot his inhaler again'], { not: /\bher inhaler\b/i });
t('safety8', 'handoffs with my ex are tense, our son hates it', { not: /\bher (inhaler|school bag)\b|Maya/ });
// low and alone: a warm check-in, real lines, never supplements
const LOW_OK = /more than a bad day/;
t('safety8', 'i feel really low and alone', { id: 'feelinglow', text: LOW_OK, link: '/upset-right-now.html', not: /forest|supplement|ashwagandha|St John/i });
t('safety8', 'nobody gets me', { id: 'feelinglow', text: LOW_OK, not: /forest|supplement|keeping score/i });
t('safety8', 'no one understands me', { id: 'feelinglow', text: LOW_OK });
t('safety8', 'i feel so alone', { id: 'lonely', text: LOW_OK });
t('safety8', "i'm really low", { id: 'feelinglow', text: LOW_OK });
t('safety8', "i'm 15 and i feel really low and alone", { link: ['/upset-right-now.html', '/teens.html#help'] });
t('safety8', 'i feel so alone and i want to die', { kind: 'safety', text: SUICIDE });
// a teen and the adult they live with: a house-rule disagreement, not the coercive-control answer
const NO_DV = /coercive|signs of control|That sounds really hard/;
t('safety8', 'my nan takes my phone', { id: 'teenhouse', text: /10 on school nights/, link: '/teens.html#family-care', not: NO_DV });
t('safety8', 'my gran took my phone away', { id: 'teenhouse', not: NO_DV });
t('safety8', 'my foster carer takes my phone at night', { id: 'teenhouse', not: NO_DV });
t('safety8', 'my mum takes my phone every night', { id: 'teenhouse', not: NO_DV });
t('safety8', "i live with my nan and she doesn't get me", { id: /teenhouse|teennotgetme/, not: NO_DV, nochip: /They make plans without asking|Holidays get tense|We clash on tone/ });
t('safety8', "i'm 14 and my gran is so strict", { id: 'teenhouse', link: '/teens.html#family-care' });
t('safety8', 'my grandma is so old fashioned', { id: 'teenhouse' });
t('safety8', 'my boyfriend takes my phone', { kind: 'safety' });
c('safety8', ["i'm raising my grandson and i'm exhausted", "he's on his phone all night"], { id: 'teenphone', not: /gaming-and-time-together/ });
// the person writing is the one who slams, throws or punches: their own-behaviour answer, never the victim script
const VICTIM = /If someone is hurting, threatening, watching or controlling you|it is not your fault|it isn.t your fault, and/;
t('safety8', 'sometimes i slam doors and punch the wall', { id: 'ownagg', link: '/parents.html#is-yelling-abuse', text: /step away first/, not: VICTIM });
t('safety8', "i throw things when i'm angry", { id: 'ownagg', link: ['/parents.html#is-yelling-abuse', '/parents.html#anger-help'], not: VICTIM });
t('safety8', 'i hit the wall', { id: 'ownagg', not: VICTIM });
t('safety8', 'when im angry i punch things', { id: 'ownagg', not: VICTIM });
t('safety8', 'i scared my kids', { kind: 'care', text: /not the same as abuse/, not: VICTIM });
t('safety8', 'i hit the wall at work, so tired (the idiom)', { q: 'i hit the wall at work, so tired', not: /punching walls/ });
t('safety8', 'he punched the wall (still the safety reply)', { q: 'he punched the wall', kind: 'safety' });
t('safety8', 'I sometimes lose my temper and throw things at my wife. how do I stop?', { id: 'ownagg', text: /that is abuse/, not: VICTIM });
t('safety8', "I'm so angry I want to hurt him", { id: 'ownagg', text: /leave the room[\s\S]*calmed down/, not: VICTIM });
t('safety8', 'i feel like i could hit my husband right now', { id: 'ownagg', not: VICTIM });
// in the moment: the steps for right now, first
const NOW_OK = /^Right now: step back[\s\S]*I’m getting too loud, I’m going to take a breath[\s\S]*in for 4 and out for 6/;
const NO_LIB = /Maintenance margin|The squeal|Decision fatigue/;
t('safety8', 'what do i do in the moment when i feel it rising', { id: 'angernow', text: NOW_OK, link: '/upset-right-now.html#parent-child', not: NO_LIB });
t('safety8', 'what do i do when im about to yell', { id: 'angernow', text: NOW_OK, not: NO_LIB });
t('safety8', 'i feel myself about to explode', { id: 'angernow', text: NOW_OK });
t('safety8', 'losing my temper', { id: 'angernow', text: NOW_OK });
t('safety8', 'about to snap at the kids', { id: 'angernow', text: NOW_OK, not: NO_LIB });
t('safety8', 'am i damaging my kids', { kind: 'care', text: /not the same as abuse/, link: '/parents.html#is-yelling-abuse' });
c('safety8', ['sometimes i slam doors and punch the wall', 'What do I do in the moment?'], { id: 'angernow' });
// both people get physical: a safety matter, not a fight to manage
const MUTUAL_OK = NEUTRAL;   // purge19: both getting physical is a danger route: the short neutral reply
t('safety8', 'we both yell and sometimes shove each other during fights', { kind: 'safety', text: MUTUAL_OK });
t('safety8', 'we push each other when we argue', { kind: 'safety', text: MUTUAL_OK });
t('safety8', 'our fights get physical', { kind: 'safety', text: MUTUAL_OK });
t('safety8', 'we hit each other sometimes', { kind: 'safety', text: NEUTRAL });
// a parent whose child said they want to die
const CHILD_OK = NEUTRAL;   // purge19: a child in crisis is a danger route: the short neutral reply
const NOT_DV = /If someone is hurting, threatening, watching or controlling you|If you might act on these feelings/;
t('safety8', 'my teenage son told me he wants to die', { kind: 'safety', id: 'childcrisis', text: CHILD_OK, not: NOT_DV });
t('safety8', 'my daughter said she wants to kill herself', { id: 'childcrisis', text: CHILD_OK, not: NOT_DV });
t('safety8', 'my 13 year old is self harming', { id: 'childcrisis', not: NOT_DV });
t('safety8', 'my kid said he doesnt want to be alive', { id: 'childcrisis', not: NOT_DV });
t('safety8', 'i want to die (still the crisis reply for me)', { q: 'i want to die', kind: 'safety', text: SUICIDE, not: /Ask directly/ });
// prescribed medicine comes first
const MEDS_OK = /^First, the important part: please don’t stop, cut down or swap a prescribed medicine suddenly\. Stopping suddenly can cause withdrawal/;
t('safety8', 'should I take ashwagandha instead of my anxiety meds?', { text: MEDS_OK, link: '/calm-without-pills.html' });
t('safety8', "can i stop my antidepressant and take st john's wort", { text: MEDS_OK });
t('safety8', 'i want to come off my medication and use herbs', { text: MEDS_OK });
t('safety8', 'is ashwagandha safe (no meds line)', { q: 'is ashwagandha safe', not: MEDS_OK });
// diagnosis: it can't be done from a chat, and no referral line (doctor, clinician) follows; no assumed details
t('safety8', 'do I have BPD?', { id: 'diagnose', text: /can’t diagnose/, not: /clinician|doctor|counselor|psychologist|Outside help/ });
t('safety8', 'do i have ptsd', { id: 'diagnose' });
t('safety8', 'do i have autism', { id: 'diagnose' });
t('safety8', 'do i have depression', { id: 'diagnose' });
t('safety8', 'is my partner a narcissist', { text: /can’t diagnose/, not: /screamed at|worthless/ });
t('safety8', 'He screams at me and calls me worthless. Is he a narcissist? (details kept)', { q: 'He screams at me and calls me worthless. Is he a narcissist?', kind: 'safety', text: /screamed at/ });
// infidelity: honest, not shaming, healing after hurt
t('safety8', 'I cheated on my wife and she found out. what now', { id: 'infidelity', text: /responsibility/, link: '/book/understanding-11-healing-in-depth.html', not: /coming out|LGBTQ|counselor/i });
t('safety8', 'i had an affair and my husband knows', { id: 'infidelity', text: /honest|honesty/, not: /counselor|clinic/ });
t('safety8', 'my husband cheated on me', { id: 'infidelity', text: /isn’t your fault/, link: '/book/understanding-11-healing-in-depth.html' });
t('safety8', 'i found out about her affair', { id: 'infidelity' });

// ---------------------------------------------------------------- round 8 re-test: the topic carries across follow-ups, each side gets its own words
{
  const NOLABEL = /\bPillar [IVX]+\b|\bWP-\d+|REPORT-01|CALC-01|Person [AB]\b|The site puts it like this/;
  // siblings and rifts: a word like "christening" doesn't pull a talk about a brother into two faiths
  c('chat8', ['how do i reach out to my brother after years of silence', "what if he doesn't reply before the christening"], { id: 'riftnoreply', link: '/family-rifts.html#reaching-out', text: /weeks, not days/, not: /Eid|interfaith|faith/i });
  c('chat8', ['how do i reach out to my brother after years of silence', 'what do i say at the christening'], { link: '/family-rifts.html', not: /Eid and Christmas/ });
  t('chat8', "should i mention dad's will", { id: 'inheritance', link: '/family-rifts.html#money', not: /make plans without asking|clash on tone/ });
  t('chat8', 'my sister wants the baby christened (still two faiths on its own)', { q: 'how do we decide about christening our baby when we have two faiths', id: 'twofaiths' });
  // business partners
  c('chat8', ["my business partner thinks I don't pull my weight", 'how do I thank her without it sounding fake'], { id: 'bizthanks', link: ['/work.html#business-partners', '/appreciation-at-work.html'], not: /compassion|Paul Gilbert/ });
  c('chat8', ["my business partner thinks I don't pull my weight", "she's so controlling about how I do things, it's my bakery too"], { id: 'bizhow', text: /owns how/, not: /Staying with that|afraid|Not safe/ });
  t('chat8', 'nobody sees the admin I do', { id: 'bizadmin', text: /^That’s a lonely kind of work/, link: '/work.html#business-partners', not: /Faith and culture work/ });
  // co-parents, with and without the page they came from
  t('chat8', 'she makes decisions without asking me (opened from the co-parenting page)', { q: 'she makes decisions without asking me', about: 'Separated co-parents', id: 'coparentdecide', link: '/co-parenting.html#who-decides', not: /I love doing things together/ });
  t('chat8', 'she makes decisions without asking me (pop-up on co-parenting.html)', { q: 'she makes decisions without asking me', page: '/co-parenting.html', id: 'coparentdecide', text: /within 3 days/, not: /48 hours/ });
  c('chat8', ['my ex makes decisions about our kid without asking me', 'how do i get a say'], { id: /^coparent(say|decide)$/, link: '/co-parenting.html#who-decides', not: /DACI|48 hours/ });
  t('chat8', 'she told me about the school trip the night before', { id: 'coparentlate', link: '/co-parenting.html' });
  t('chat8', 'i feel shut out as a dad', { id: 'coparentshutout', link: '/co-parenting.html#who-decides', not: /window of tolerance/i });
  t('chat8', "he's honestly useless (co-parenting page)", { q: "he's honestly useless", page: '/co-parenting.html', id: 'coparentuseless', not: /retir/i });
  t('chat8', "he's honestly useless (no context: ask who)", { q: "he's honestly useless", kind: 'clarify', not: /retir/i });
  t('chat8', 'we only text, how should we word things', { id: 'coparenttext', link: ['/signal-translator.html?rel=co-parents', '/co-parenting.html#talking'] });
  t('chat8', 'my ex books things on my weekends', { id: 'exweekends', link: '/co-parenting.html#who-decides' });
  t('chat8', 'co-parent page chips', { q: 'Separated co-parents', about: 'Separated co-parents', chip: /decide without me|Last-minute/, nochip: /arguing about chores/ });
  c('chat8', ['my ex never remembers anything for our daughter', 'i do all the school, doctor and birthday party stuff and he does nothing', 'is this abuse?'], { kind: 'redflag', text: /not abuse/ });
  // foster and kinship: rules, the emotional work
  t('chat8', 'she wont come home on time and laughs when we say no phone', { id: 'teencurfew', link: '/foster-and-kinship.html#rules', not: /mom’s request|Cooking is yours/ });
  t('chat8', 'our foster teen ignores every rule', { id: 'teencurfew', not: /moved homes a lot often push away/ });
  t('chat8', 'how do we share the emotional work of fostering', { id: 'fosterload', link: '/foster-and-kinship.html#jobs', not: /moved homes a lot often push away/ });
  c('chat8', ['our foster daughter pushes us away', 'i also do all the emotional stuff, my husband just wants stricter rules'], { id: 'fosterload', link: '/foster-and-kinship.html', not: /closest to one of these/ });
  c('chat8', ['our foster daughter pushes us away', 'how do we split the jobs'], { id: 'fosterload', text: /meetings/, not: /chore fights/ });
  c('chat8', ['our foster daughter pushes us away', 'what rules should we set?'], { id: /teenrules|teencurfew/, not: /ground rules/i });
  t('chat8', 'what rules should we set? (no context: which kind)', { q: 'what rules should we set?', kind: 'clarify', chip: /House rules/ });
  t('chat8', 'foster chip adds no age', { q: 'our foster daughter pushes us away', nochip: /14/ });
  // friends: each side, and follow-ups that stay with the friendship
  c('chat8', ["i have a newborn and i'm neglecting my best friend", 'i feel so guilty'], { id: 'friendsguilt', link: '/friends.html', not: /Am I a bad partner|resenting/ });
  c('chat8', ["i have a newborn and i'm neglecting my best friend", 'what do i actually text her'], { link: '/friends.html', script: true, text: /underwater with the baby|still care about you/, not: /couldn’t find|don’t have a page/ });
  c('chat8', ["i have a newborn and i'm neglecting my best friend", 'should i just stop texting her and see if she notices'], { link: '/friends.html', not: /fight over text|Partner/ });
  t('chat8', 'my best friend never texts back since she had her baby (the waiting friend first)', { q: 'my best friend never texts back since she had her baby', id: 'friends', text: /^It hurts to feel like the only one/, script: true, not: /low on energy and slow to reply/ });
  c('chat8', ['my best friend never texts back since she had her baby', 'what do i actually text her'], { text: /I miss you and I’ve been feeling a bit left out/, not: /slow to reply/ });
  t('chat8', "i have a newborn and i'm neglecting my best friend (the quiet friend)", { q: "i have a newborn and i'm neglecting my best friend", id: 'friends', text: /underwater with the baby/ });
  // gaming: the partner being reminded gets their own words
  t('chat8', 'she nags me about chores the second i log on', { id: 'gaming', link: '/gaming-and-time-together.html', text: /being reminded|before I log on/ });
  t('chat8', 'my gf says i game too much', { id: 'gaming', link: '/gaming-and-time-together.html' });
  t('chat8', 'my gamer boyfriend ignores me (no spelling fix)', { q: 'my gamer boyfriend ignores me', id: 'gaming', not: /I think you mean/ });
  // housemates and a shared room
  t('chat8', 'the bins never get taken out in our flat and I end up doing it every time', { id: 'housechores', link: '/share-the-load.html#roommates', text: /any of you/, not: /what state you were both in|either of us is the problem/ });
  c('chat8', ['the bins never get taken out in our flat and I end up doing it every time', 'there are three of us, how do I bring it up without it turning into a fight in the group chat'], { id: 'housegroupchat', text: /any of you/, not: /Friday or Saturday/ });
  t('chat8', "one of us does way more hours at the lab, does that change what's fair", { id: 'housefair', link: '/library/conflict.html#fairness-rules' });
  t('chat8', 'my roommates boyfriend is always here', { id: 'roomguests', link: '/sharing-a-room.html#guests', not: /bills|our kitchen/ });
  c('chat8', ['my roommates boyfriend is always here', 'i hate confrontation', 'can i talk to my RA about this', 'what do i actually say to her'], { link: '/sharing-a-room.html', script: true, not: /Emotional labor|Hochschild|WP-09|CALC-01/ });
  t('chat8', 'RA answer keeps the roommate setting', { q: 'can i talk to my RA about this', link: '/signal-translator.html?rel=roommates' });
  // coming home after a deployment
  c('chat8', ['nightmares since deployment', 'im on edge all the time and snap at the kids'], { id: 'comehomeedge', link: '/coming-home.html#sleep', not: /800-342-9647|Stepfamilies|stepkids/ });   // no phone numbers (owner)
  c('chat8', ['he came back and changes how I do everything', "i'm so tired of it honestly"], { id: 'heldfort', link: '/coming-home.html#held-the-fort', not: /capacity issue|WP-0/ });
  c('chat8', ['i feel like a stranger in my own house', "i can't sleep since i got back"], { id: 'comehomesleep', link: '/coming-home.html#sleep', not: /800-342-9647/ });
  t('chat8', 'ptsd answer: no safety reply unless fear', { q: 'nightmares and i\'m on edge all the time', id: 'deployhealth', not: /That sounds really hard\./ });
  // different hours: each side
  t('chat8', 'i work nights and feel guilty i never help', { id: 'differenthours', text: /^Feeling guilty is common/, link: '/different-hours.html#sleep-is-work', not: /not counting hours/ });
  t('chat8', "working from home means everyone thinks I'm free", { id: 'differenthours', text: /^Being home isn’t the same as being free/, link: '/different-hours.html#home-not-free' });
  c('chat8', ['i work nights and feel guilty i never help', 'but i still feel bad, he does the dog and the house and i just sleep'], { id: 'nightguilt', text: /Thank you for doing the dog/, not: /Sleep, mood and conflict/ });
  t('chat8', 'my husband sleeps all day and I do everything for the dog', { id: 'differenthours', text: /dog/, script: true });
  // money: the spender's side, rent by income
  t('chat8', "she says I'm bad with money (the spender's words)", { q: "she says I'm bad with money", id: 'moneystyles', text: /Spending on friends and fun is how I enjoy life/, not: /I’m a saver; it helps me feel safe/ });
  t('chat8', "my fiance spends too much and I'm scared (the saver's words)", { q: "my fiance spends too much and I'm scared", id: 'moneystyles', text: /I’m a saver/, not: /finance/ });
  t('chat8', 'how do we split rent if he earns more than me', { id: 'rentincome', text: /by income/, link: '/money-together.html#moving-in' });
  t('chat8', 'my fiancé spends too much (accented, never corrected)', { q: 'my fiancé spends too much', id: 'moneystyles', not: /I think you mean|finance/ });
  // two faiths: elders advise, the couple decides
  t('chat8', 'my mum keeps saying the baby must be raised muslim', { id: 'twofaiths', text: /elders advise, the two of you decide/, link: '/two-faiths.html#elders', not: /bath time|new baby brings/i });
  t('chat8', 'should we raise the baby Catholic', { id: 'twofaiths', not: /bath time/ });
  t('chat8', 'his mum wants us to raise the baby Muslim', { id: 'twofaiths', link: '/two-faiths.html#elders', not: /with your mum|every other Sunday/ });
  t('chat8', 'what do we tell both families (two-faiths page)', { q: 'what do we tell both families', page: '/two-faiths.html', link: '/two-faiths.html#both-families', not: /Papernow|Stepfamilies/ });
  t('chat8', 'two-faiths page chips', { q: 'Two faiths or cultures, one family', page: '/two-faiths.html', chip: /both families|grandparent/i, nochip: /I feel like I do everything|good article/ });
  // culture, feelings, simpler English
  t('chat8', "chinese family, we don't say love out loud", { id: 'lovebydoing', link: '/empty-nest.html#doing', not: /make plans without asking/ });
  c('chat8', ['our children left for university, the house is so quiet', 'what can I do this week, something simple'], { id: 'emptynest', link: '/empty-nest.html', not: /resync|REPORT-01|WP-0/ });
  c('chat8', ['our children left for university, the house is so quiet', 'I am not good with words'], { id: 'lovebydoing', link: '/empty-nest.html#doing' });
  c('chat8', ['my husband does not talk about feelings', 'can you say it in simpler English please'], { text: /fixing the car|fixing things/, not: /sorting|turning up|“Thank you for (fixing|sorting) the car\.\s*$/m });
  t('chat8', "why can't I talk about my feelings", { id: 'feelingstalk', link: ['/book/self-1-then.html', '/book/understanding-1-feelings.html'], script: true, text: /I wasn’t brought up to say this/, not: /Have fun|I love a good report/ });
  c('chat8', ['my wife died last year', "why can't I talk about my feelings"], { link: '/grief.html', not: /Have fun/ });
  // grown children and grandparents
  c('chat8', ['how do i set boundaries with my mum without hurting her', "she gets upset and says i'm keeping the baby from her"], { id: 'gcbaby', link: '/grown-up-children.html', not: /bath time every night|Pillar|WP-02/ });
  t('chat8', 'can we make a plan for visits together', { id: 'familyplan', link: ['/grown-up-children.html#plan', '/check-ins.html?for=family#card'] });
  t('chat8', "my daughter doesn't want my advice about the baby", { id: 'gpadvice', not: /turning up without asking/ });
  t('chat8', 'i feel shut out from my grandchild', { id: 'gpshutout', not: /\bmiss him\b|see him\b/ });
  t('chat8', 'I was brought up that children should be seen and not heard. Am I doing it wrong?', { id: 'seenheard', link: '/grandparents.html', not: /cut off|interrupt/i });
  c('chat8', ['my grandson has ADHD, how should I talk to him', 'is ADHD real or just bad behaviour'], { id: 'adhdkids', text: /^Yes, ADHD is real/, not: /Staying with that/ });
  t('chat8', 'how do I print the page about ADHD', { id: 'print', text: /Print this page/, link: '/adhd-kids.html', not: /Wiring Card/ });
  t('chat8', 'can I print this out (on the ADHD page)', { q: 'can I print this out', page: '/adhd-kids.html', id: 'print', link: '/adhd-kids.html', not: /chore chart/i });
  // divorce, part-time parenting
  t('chat8', "i'm lonely since the divorce", { id: 'divorcelonely', link: '/on-my-own.html#lonely' });
  t('chat8', 'the flat is so quiet after they leave on sunday', { id: 'sundaygoodbye', link: '/on-my-own.html#part-time-parent', not: /look-back|WP-01/ });
  t('chat8', 'what can we do this weekend that doesnt cost much', { link: '/on-my-own.html#part-time-parent', not: /Invisible Cost|about\.html/ });
  // work: plain answers, no autism scripts unless it was mentioned
  t('chat8', 'I am autistic. is something wrong with me', { id: 'autisticself', text: /^No\. Autism is a different way of being wired, not a fault\./, link: ['/wired-differently.html', '/work.html#autistic-at-work'], not: /retir/i });
  t('chat8', 'I hate small talk at work. what do I say', { id: 'smalltalkwork', text: /one exchange/, script: true, not: /RACI|one owner per job/i });
  t('chat8', 'my manager said do it when you get a chance. what deadline does that mean', { id: 'whenchance', text: /no deadline[\s\S]*end of day Friday/, not: /RACI/ });
  t('chat8', 'how do I ask my boss for written instructions (no autism assumed)', { q: 'how do I ask my boss for written instructions', id: 'autisticwork', not: /I’m autistic|legal right/ });
  t('chat8', 'I need a quiet break at work, how do I say it', { id: 'autisticwork', script: true, not: /I’m autistic|legal right/ });
  t('chat8', 'what does STDE mean', { id: 'wl-archetypes', text: /^STDE, the Compass/, not: /QFDE/ });
  // coming out as an adult
  const ADULT_OK = /friends who know/;
  t('chat8', 'how do i come out to my conservative parents', { id: 'lgbtadult', text: ADULT_OK, link: '/coming-out.html', not: /GSA|school counselor/ });
  t('chat8', 'lgbtq support line', { id: 'lgbtadult', text: ADULT_OK });
  t('chat8', 'is it safe to come out if my dad has a temper', { id: 'lgbtadult', link: '/coming-out.html#safety-first' });
  t('chat8', 'how do i tell my mom i have a girlfriend', { id: 'lgbtadult', not: /let your girlfriend say it back/ });
  c('chat8', ['im 15 and gay and scared to come out', "that's not it, i'm an adult not a teen"], { id: 'lgbtadult', link: '/coming-out.html', not: /parenting teenagers|GSA/ });
  t('chat8', 'my parents are really religious and i’m scared (from the coming-out page)', { q: "my parents are really religious and i'm scared", about: 'Coming out as an adult', id: 'lgbtsafety', link: '/coming-out.html#safety-first' });
  t('chat8', 'coming-out page chips', { q: 'Coming out as an adult', about: 'Coming out as an adult', chip: /tell my parents|cut me off/, nochip: /arguing about chores/ });
  t('chat8', 'no example name in his words', { q: "i'm 31 and bisexual, how do i tell my family about my girlfriend", not: /Dani/ });
  t('chat8', 'what does this site keep on my phone', { id: 'devicekeep', link: '/on-this-device.html', not: /phubbing|Phones and presence/i });
  t('chat8', 'teens still get the teen answer', { q: 'im 15 and gay and scared to come out', id: 'lgbtq' });
  // calm, naturally
  t('chat8', 'what natural things actually help anxiety', { id: 'calmpills', text: /sleep, movement, slow breathing/, link: '/calm-without-pills.html#start', not: /Masking/ });
  t('chat8', 'what helps anxiety naturally', { id: 'calmpills', link: '/calm-without-pills.html#start', not: /Masking/ });
  // talk deep: <question> answers the question; "keep it light" comes back up
  c('chat8', ['talk deep: why is small talk so hard for some people?'], { id: /smalltalkwhy|small-talk/, text: /unwritten/, not: /post-traumatic/i });  // chat9: small talk is a deep topic now
  t('chat8', 'talk deep: what is the double empathy problem?', { link: '/wired-differently', not: /^Deep mode on\. Short words/ });
  t('chat8', 'talk deep: I find small talk exhausting', { not: /^Deep mode on\. Short words/ });
  c('chat8', ['talk deep: are emotions universal? like the ekman faces thing', 'who came up with that, is there a source i can cite'], { id: 'source', link: '/research.html', text: /Ekman/, not: /Coltrane/ });
  c('chat8', ['talk deep', 'keep it light'], { kind: 'chat', not: /## Philosophy/ });
  t('chat8', 'why do some people find chatting about the weather so hard?', { id: 'smalltalkwhy', not: /foster|Open-Meteo/i });
  t('chat8', 'why do people not say what they mean?', { id: 'notsaywhatmean', not: /Highly sensitive/i });
  t('chat8', 'what is autistic burnout?', { link: '/book/understanding-9-minds.html#burnout', text: /exhaustion/, not: /Masking and camouflaging/ });
  t('chat8', 'is autism a disorder?', { id: 'autismdisorder', text: /autism spectrum disorder[\s\S]*difference/ });
  // honest answers about Puddles himself, teachers, infographics, definitions
  t('chat8', 'can I trust what you tell me?', { id: 'honest', not: /bonding|Rempel/i });
  t('chat8', 'can I use this with my class?', { id: 'teachers', text: /^Yes\. You may print and share pages and handouts for non-commercial teaching and group use, with credit/, link: '/for-teachers.html', not: /clients|between sessions/ });
  t('chat8', "I'm a teacher. Can I use this material with my students in class?", { id: 'teachers', link: '/for-teachers.html', not: /clients|between sessions/ });
  t('chat8', "I'm a couples therapist (still counsellors)", { q: "I'm a couples therapist. Can I use this with clients?", id: 'forcounselors' });
  t('chat8', 'make me an infographic about active listening', { kind: 'info', info: true, link: '/library/communication.html#active-listening', not: /\(the Library\)/ });
  t('chat8', 'what is attachment theory in plain words? i need it for a uni seminar', { text: /Bowlby[\s\S]*secure base/, link: '/library/relationships.html#attachment-theory', not: /I think you mean/ });
  t('chat8', 'chapter 13 on anger', { q: 'what is chapter 13 of part three about', link: '/book/understanding-13-anger.html' });
  t('chat8', 'chapter 14', { q: 'part three chapter 14', link: '/book/understanding-14-personality.html' });
  t('chat8', 'chapter 15', { q: 'chapter 15 of part three', link: '/book/understanding-15-love.html' });
  // Spanish: a Spanish answer to a Spanish message, never an English-only fallback, never an English spelling fix
  t('chat8', 'tengo miedo de mi esposo (safety first, in Spanish)', { q: 'tengo miedo de mi esposo', kind: 'safety', text: NEUTRAL });
  // no internal labels in everyday answers
  t('chat8', 'we are like roommates now', { not: NOLABEL });
  t('chat8', 'my partner never notices what i do', { not: NOLABEL });
  c('chat8', ['how do i set boundaries with my mum without hurting her', "she gets upset and says i'm keeping the baby from her"], { not: NOLABEL });
  t('chat8', 'the five pillars still name themselves', { q: 'what are the five pillars', id: 'pillars', text: /\(V\)/ });
  // safety still wins over the topic
  c('chat8', ['she makes decisions without asking me', 'he shouts at me at handover and i\'m scared'], { kind: 'safety' });
  c('chat8', ['my business partner thinks I don\'t pull my weight', 'she threatens me when i do things my way'], { kind: 'safety' });
  c('chat8', ['my best friend never texts back since she had her baby', 'i want to die'], { kind: 'safety', text: SUICIDE });
  c('chat8', ['the bins never get taken out in our flat and I end up doing it every time', 'my housemate checks my phone and reads my messages'], { kind: 'safety' });
  t('chat8', 'co-parent topic never hides harassment', { q: 'he keeps messaging me at all hours after i asked him to stop', page: '/co-parenting.html', id: 'exharass', not: /Texting is often the calmest way|Bonding tips/ });
}

// ---------------------------------------------------------------- Professor Puddles' voice (personality.json): light lines only where they belong
// chit-chat lines (persona.json), as a pattern: PZ_RE(['jokes', 'react.laugh', 'topics.replies'])
const PERSONA = (() => { try { return JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'persona.json'), 'utf8')); } catch (e) { return null; } })();
function PZ_LINES(keys) {
  // 'jokes' → the list; 'react.laugh' → a list inside an object; 'topics.replies' → that list from every topic;
  // 'riddles.q' → that field of every item
  const out = [];
  const flat = v => { if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach(flat); else if (v && typeof v === 'object') Object.values(v).forEach(flat); };
  keys.forEach(k => {
    const [a, b] = k.split('.'), root = PERSONA && PERSONA[a];
    if (!b) flat(root);
    else if (Array.isArray(root)) root.forEach(x => flat(x && x[b]));
    else flat(root && root[b]);
  });
  return out;
}
function PZ_RE(keys) {
  const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const ls = PZ_LINES(keys).map(x => x.replace(/\{[^}]*\}/g, '\u0000').split('\u0000').sort((a, b) => b.length - a.length)[0].slice(0, 40)).filter(x => x.trim().length >= 12);
  return new RegExp(ls.map(esc).join('|') || '$^');
}
const PERS = (() => { try { return JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'personality.json'), 'utf8')); } catch (e) { return null; } })();
if (PERS) {
  const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lines = k => (PERS[k] || []).filter(x => typeof x === 'string');
  const anyOf = ks => new RegExp(ks.map(k => lines(k).map(x => esc(x.replace(/\{name\}/g, '').slice(0, 40)))).flat().filter(Boolean).join('|') || '$^');
  const FUNNY = anyOf(['light_openers', 'light_closers', 'jokes', 'game_and_play', 'not_found', 'clarify', 'greetings', 'thanks_replies']);
  t('puddles', 'tell me a joke', { kind: 'fun', text: new RegExp(anyOf(['jokes']).source + '|' + PZ_RE(['jokes']).source) });
  c('puddles', ['tell me a joke', 'another one'], { kind: 'fun', text: new RegExp(anyOf(['jokes']).source + '|' + PZ_RE(['jokes']).source) });
  t('puddles', 'lol', { kind: 'fun', text: new RegExp(anyOf(['thanks_replies']).source + '|' + PZ_RE(['react.laugh']).source) });  // chat11: laughter gets its own replies
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
    t('puddles', 'hi my husband yells at me', { id: 'yelledat', not: FUNNY });  // chat9: ordinary help first, one gentle line
    t('puddles', 'my name is Sam', { kind: 'chat', text: /Sam/ });
    c('puddles', ['let\'s just chat', 'pizza'], { kind: 'chat' });
    t('puddles', "i'm tired of everything goes to care", { q: "i'm tired of everything", kind: 'care', id: 'feelinglow', text: /one small thing/, not: /doctor|tell someone you trust|tell one person/i });   // wave 27: only the suicide line carries “tell someone you trust”
    t('puddles', "I'm Sam (a name, said the short way)", { q: "I'm Sam", kind: 'chat', text: /Sam/ });
    t('puddles', "I'm Tired (a feeling, not a name)", { q: "I'm Tired", kind: 'chat', not: /meet you, Tired/ });
    c('puddles', ['my name is Sam', 'how are you'], { kind: 'chat', not: /\{name\}/ });
    c('puddles', ["let's just chat", 'i feel sad today'], { kind: 'care', not: FUNNY });
    t('puddles', 'hi', { kind: 'chat' });
    t('puddles', 'what can you do (still the full help)', { q: 'what can you do', text: /talk deep/ });
    t('puddles', 'how are you going to help me with chores (not small talk)', { q: 'how are you going to help me with chores', text: /chore|job|split|share|Lemonade/i });
    t('puddles', 'can I trust your answers', { kind: 'about', text: /I don’t make things up: every answer comes from what’s already written on this site\. I pick the best match\. I don’t invent new answers/, not: /written (and checked )?by people|checked by people/, link: '/method-and-limits.html' });
    t('puddles', 'do you hallucinate', { kind: 'about', text: /I don’t make things up[\s\S]*that’s not it[\s\S]*not a therapist and can’t diagnose/ });
    t('puddles', 'are you AI?', { kind: 'about', text: /^I’m a program on this page, not a person\. Every answer here was written in advance for this site\. I pick the best match/, not: /written (and checked )?by people|checked by people/ });
    t('puddles', 'who are you (says where answers come from)', { q: 'who are you', text: /I don’t make things up/ });
  }
  // deep talk (deep.json): three lenses, put together; safety, care and someone's own situation always first; no jokes
  const DEEP = (() => { try { return JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'deep.json'), 'utf8')); } catch (e) { return null; } })();
  if (DEEP) {
    const ALL3 = /## Philosophy[\s\S]*## Psychology[\s\S]*## Through an autistic lens[\s\S]*## Putting it together[\s\S]*## A question for you[\s\S]*## Try this/;
    t('deep', 'talk deep', { kind: 'deep', id: 'intro', chip: /keep it light/i });
    c('deep', ['talk deep', 'what is love'], { kind: 'deep', id: 'what-is-love', text: ALL3, not: FUNNY, link: '/book/understanding-5-belonging.html' });
    c('deep', ['Talk deep', 'what is love', 'and through an autistic lens?'], { kind: 'deep', id: 'what-is-love', text: /^## Through an autistic lens/ });
    c('deep', ['talk deep', 'what is love', 'what would the stoics say?'], { kind: 'deep', id: 'what-is-love', text: /^## Philosophy/ });
    c('deep', ['talk deep', 'he hit me'], { kind: 'safety', not: /## Philosophy|Psychology/ });
    c('deep', ['talk deep', 'my husband yells at me'], { id: 'yelledat', not: /## Philosophy/ });
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
  t('part3', 'I feel shut down', { link: '/ladder.html', not: /That sounds really hard\./ });
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
    t('chat4', 'what modes do you have', { kind: 'about', id: 'modes', text: /Light mode[\s\S]*Deep mode[\s\S]*keep it light/, chip: /Talk deep/ });
    t('chat4', 'what is deep mode', { id: 'modes' });
    c('chat4', ['talk deep', 'what modes do you have'], { id: 'modes', text: /deep mode right now/, chip: /keep it light/i });
    t('chat4', 'what modes of conflict are there (not the chat modes)', { q: 'what modes of conflict are there', not: /Two modes/ });
    t('chat4', 'what can you do (two modes, infographics)', { q: 'what can you do', text: /Light mode[\s\S]*Deep mode[\s\S]*keep it light[\s\S]*infographic/ });
    t('chat4', "let's talk deep about love", { kind: 'deep', id: 'what-is-love' });
    t('chat4', 'can we go deep', { kind: 'deep', id: 'intro' });
    c('chat4', ['talk deep', 'what makes a good friend'], { kind: 'deep', id: 'good-friend', link: '/friends.html' });
    // infographics, in his own words
    t('chat4', 'can you make a chart of the mental load', { kind: 'info', info: true });
    t('chat4', 'draw me a picture of love languages', { kind: 'info', info: true, link: '/love-languages.html' });
    t('chat4', 'make an infographic about small wins', { kind: 'info', info: true, link: '/small-wins.html' });
    t('chat4', 'make me a poster about the ladder', { kind: 'info', info: true, link: '/ladder.html' });
    // the honest answer: rule-based, from the site's own checked pages, can pick the wrong topic, not a therapist
    // (owner: AI is never mentioned unless asked; asked straight out, the answer is a short, true "No")
    const HONEST = /(already written on this site|written in advance for this site)[\s\S]*wrong topic[\s\S]*not a therapist/;
    ['do you make things up', 'are you an AI', 'can i trust you', 'do you hallucinate', 'are you chatgpt', 'is this real advice', 'do you make mistakes'].forEach(q =>
      t('chat4', q, { kind: 'about', id: 'honest', text: HONEST, link: '/ask.html#how-he-answers', not: /\b(rule-based|generative)\b/, check: (r, rs, text) => !/\b(ai|chatgpt)\b/i.test(q) && /\bAI\b/.test(text) ? 'AI mentioned unprompted' : '' }));
    t('chat4', 'can i trust your answers (research link)', { q: 'can i trust your answers', link: '/research.html' });
    t('chat4', 'are you a therapist (still the scope answer)', { q: 'are you a therapist', id: 'therapistq' });
    t('chat4', 'where can i find a counsellor (no “No.”)', { q: 'where can i find a counsellor', id: 'findcounsellor', not: /^No\./ });
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
  t('chat4', 'how long does the weather almanac keep my readings', { id: 'weatherlog', text: /120 days/, link: '/quick-checks.html#almanac' });
  t('chat4', 'can i export my weather almanac', { id: 'weatherlog', text: /CSV or JSON/ });
  t('chat4', 'how do I turn on high contrast', { id: 'textsize', text: /High contrast/ });
  t('chat4', 'how do i make text bigger', { id: 'textsize', text: /Settings/ });
  t('chat4', 'what is week 0', { id: 'week0', link: '/week-0.html' });
  t('chat4', 'can i add reminders to my calendar', { id: 'prog01', link: '/prog-01.html#calendar' });  // mergeB: reminders live in Six gentle weeks
  t('chat4', 'where else can i get help', { not: /hotline|helpline|988|findahelpline|Samaritans/i });   // no outside-resource lists (owner)
  t('chat4', 'my partner sent me this link (both pages)', { q: 'my partner sent me this link', link: '/someone-sent-you-this.html' });
  // supplements, herbs and drugs: not covered. One plain reply that gives no guidance, no dose, no product and no referral line, and points to the everyday habits and Calm down now. Crisis first, no jokes
  const PHARM = /pharmacist|prescriber|your doctor|a doctor|physician|check with/i;   // owner: no doctor/pharmacist lines
  const NODOSE = /\b\d+(\.\d+)? ?(mg|milligrams?|ml|mcg|g)\b|take (one|two|\d)/i;
  const NOGUIDE = /serotonin syndrome|liver|Lennox|Dravet|Silexan|warfarin|upper limit/i;   // none of the old supplement detail comes back
  [["is ashwagandha safe"], ["ashwagandha side effects"], ["can I take st john's wort with my antidepressant"], ["st johns wort and sertraline"],
   ['what herbs help anxiety'], ['natural remedies for anxiety'], ['best supplement for stress'], ['does chamomile work'], ['chamomile tea for anxiety'],
   ['is melatonin good for anxiety'], ['melatonin for kids'], ['how much melatonin should i take'], ['is kava safe'], ['does magnesium help anxiety'], ['magnesium for sleep'],
   ['does CBD help anxiety'], ['does homeopathy work'], ['are supplements safe'], ['can I mix herbs with my medication'], ['does lavender help sleep']
  ].forEach(([q]) => t('herbs', q, { id: 'calmpills', text: /don’t give guidance on supplements, herbs or drugs/, link: '/calm-without-pills.html#start', not: new RegExp(NODOSE.source + '|' + FUNNY.source + '|' + PHARM.source + '|' + NOGUIDE.source, 'i') }));
  t('herbs', "my panic won't stop, what herbs can i take (more than a habit)", { q: "my panic won't stop, what herbs can i take", id: 'calmpills', text: /more than an everyday habit can fix/, link: '/calm-without-pills.html#all', not: FUNNY });
  t('herbs', "i've felt low for weeks, would st john's wort help (more than a habit)", { q: "i've felt low for weeks, would st john's wort help", id: 'calmpills', text: /more than an everyday habit can fix/, not: /doctor/ });
  t('herbs', 'i want to kill myself, should i take kava (crisis reply)', { q: 'i want to kill myself, should i take kava', kind: 'safety', text: SUICIDE, not: /Kava may ease/ });
  c('herbs', ['tell me a joke', 'is ashwagandha safe'], { id: 'calmpills', not: FUNNY });
  t('herbs', 'ashwagandha is not spell-corrected', { q: 'is ashwagandah safe', id: 'calmpills' });
}

// ---------------------------------------------------------------- re-test 2 (chat9): context across follow-ups, each speaker's own side,
// routing, no repeats, the greeting first, and safety that is strong for real risk and quiet for ordinary conflict
{
  const P9 = PERS || {};
  const esc9 = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const FUN9 = new RegExp(['light_openers', 'light_closers', 'jokes', 'game_and_play', 'not_found', 'clarify', 'greetings', 'thanks_replies'].map(k => (P9[k] || []).filter(x => typeof x === 'string').map(x => esc9(x.replace(/\{name\}/g, '').slice(0, 40)))).flat().filter(Boolean).join('|') || '$^');
  const DV9 = /signs it.s more than ordinary conflict|moved from ordinary conflict into control|isn.t a communication problem/;
  const CRISIS9 = SUICIDE;   // the owner's update: plain suicide guidance, no numbers, services or links
  // safety (counsellor): indirect suicide wording, and staying with the person
  ['sometimes I feel like ending it all', 'what is the point of living', "i can't go on", 'everyone would be better off without me', 'i want to disappear', 'no reason to keep going']
    .forEach(q => t('safety9', q, { kind: 'safety', text: CRISIS9, not: FUN9 }));
  c('safety9', ['sometimes I feel like ending it all', "I don't want to call anyone, just talk to me"], { kind: 'safety', id: 'crisis-stay', text: SUICIDE, not: /polyamor|four horsemen|Staying with/i });
  c('safety9', ['what is the point of living', 'nobody would even notice'], { kind: 'safety', id: 'crisis-stay', not: FUN9 });
  // physical harm, minimised or not, and restraint: the safety reply, never couples tips or "same fight" chips
  [["he only pushed me once, its normal in arguments right? how do we stop fighting", NEUTRAL], ["he pushed me once but it's not a big deal", NEUTRAL],
   ["he grabbed my arm hard and wouldn't let me leave the room", /That sounds really hard|not your fault/], ['he blocked the door', /That sounds really hard|not your fault/], ['she slapped me', /That sounds really hard|not your fault/],
   ['he choked me during a fight', NEUTRAL], ['he threw things at me', /That sounds really hard|not your fault/], ["he took my phone so i couldnt call anyone", /That sounds really hard|not your fault/]]
    .forEach(([q, x]) => t('safety9', q, { kind: 'safety', text: x, not: /same side|stop fighting tips|We keep having the same fight/, nochip: /same fight/i }));
  t('safety9', 'threat of self-harm to control (adult)', { q: 'my partner says he will kill himself if I leave', kind: 'safety', id: 'threatself', text: NEUTRAL, not: /teacher/ });
  t('safety9', 'threat of self-harm to control (boyfriend)', { q: 'my boyfriend threatened to kill himself if i break up with him', kind: 'safety', id: 'threatself', text: NEUTRAL });
  t('safety9', "I'm the one who gets violent: help for them", { q: "I'm the one who gets violent sometimes. how do I stop", id: 'ownviolent', not: /If someone is hurting, threatening, watching or controlling you/ });
  t('safety9', 'is my wife bipolar? no diagnosis', { q: 'is my wife bipolar?', id: 'diagnoseother', text: /can’t diagnose anyone/, not: /doctor|psychologist|counselor/ });
  t('safety9', 'is my husband a psychopath? no diagnosis', { q: 'is my husband a psychopath', text: /can’t diagnose/ });
  t('safety9', 'is my husband autistic? no diagnosis', { q: 'is my husband autistic', id: 'diagnoseother' });
  [['gaslighting', /doubt your own memory/], ['coercive control', /freedom bit by bit/], ['narcissist', /nobody can make it from a chat/]]
    .forEach(([q, x]) => t('safety9', q, { id: 'safetyterm', text: x }));
  // ordinary conflict: ordinary help first, one gentle line at most, and no lock into safety mode
  t('safety9', 'my husband yells at me: ordinary help, one gentle line', { q: 'hi my husband yells at me', id: 'yelledat', text: /pause word/, not: /signs it.s more than ordinary conflict|moved from ordinary conflict/ });
  t('safety9', 'raised voice once: no abuse script', { q: 'he raised his voice once during an argument', not: DV9 });
  t('safety9', 'arguing about chores: no abuse script', { q: 'we keep arguing about chores', not: DV9 });
  t('safety9', 'she sulks after a fight: no abuse script', { q: 'she sulks for a day after every fight', not: DV9 });
  c('safety9', ['hi my husband yells at me', 'how do i bring it up with him calmly'], { not: /won.t suggest ways to talk them round/ });
  c('safety9', ['sometimes he shouts at me at the handover in front of Leo'], { id: 'handoff', text: /Hand over somewhere public[\s\S]*Leo/, not: /signs it.s more than ordinary conflict/ });
  c('safety9', ['sometimes he shouts at me at the handover in front of Leo', 'how do I tell Leo about the new plan'], { id: 'kidnewplan', text: /what changes, when, and what stays the same/, not: /won.t suggest ways to talk them round/ });
  c('safety9', ["my husband yells and i'm scared", 'how do i make it up to him'], { kind: 'safety', not: /same side|apolog/ });

  // A: the topic carries across follow-ups
  t('chat9', 'cold "how do i get a say": ask who, never the triad card', { q: 'how do i get a say', kind: 'clarify', chip: /ex or co-parent/, not: /my hours|More Than Two/ });
  c('chat9', ['my ex makes decisions about our kid without asking me', 'how do i get a say'], { id: 'coparentsay', link: '/co-parenting.html#who-decides', not: /It’s frustrating to hear about decisions for your own child after/ });
  c('chat9', ['my ex makes decisions about our kid without asking me', 'how do i get a say', 'what if she just ignores my texts'], { id: 'coparentnoreply', text: /reply-by window|Friday/, not: /three or more|More Than Two/ });
  c('chat9', ['my ex makes decisions about our son without asking me', 'she signed him up for football without asking'], { id: 'coparentafter', not: /someone you love|I love seeing you|I love doing things together/ });
  c('chat9', ['my ex makes decisions about our son without asking me', 'and what if she just ignores the 3 days thing'], { id: 'coparentnoreply', not: /worry|someone you care about get stuck/ });
  c('chat9', ['my ex makes decisions about our son without asking me', 'she keeps changing plans and never tells me'], { not: /someone you love|I love doing things together/ });
  t('chat9', 'decider side: "he says i make all the decisions"', { q: 'he says i make all the decisions without him', id: 'coparentdecider', text: /which decisions they’d like to share/, not: /frustrating to hear about decisions for your own child/ });
  t('chat9', 'a name is never "corrected" (lina)', { q: 'she signed lina up for swimming without telling me', not: /I think you mean|line up/ });
  t('chat9', 'a capitalised name is never "corrected" (Lina)', { q: 'she signed Lina up for swimming', not: /I think you mean/ });
  t('chat9', '?for=co-parent page context', { q: 'she makes decisions without asking me', page: '/someone-sent-you-this.html?for=co-parent', id: 'coparentdecide', not: /I love doing things together/ });
  t('chat9', 'ex never remembers: no medicine assumed', { q: 'my ex never remembers anything for our son', id: 'handoffkit', not: /worrying when it’s medicine|inhaler/i });
  t('chat9', 'ex forgets the inhaler: medicine named', { q: 'he keeps sending her back without her inhaler', id: 'handoffkit', text: /medicine/ });
  c('chat9', ["i have a newborn and i'm neglecting my best friend", 'i feel so guilty', 'is it ok to send a voice note instead of texting'], { id: 'friendsvoice', link: '/friends.html#after-baby', not: /work setting|your manager|Messages at work/ });
  c('chat9', ["i live with my nan and she doesn't get me", 'my mum is in rehab', 'i miss my mum'], { id: 'teenmissparent', link: '/teens.html#parent-away', not: /Grief and loss|grief\.html/ });
  t('chat9', 'teen: "she doesn\'t get me" leads with the feeling', { q: "i live with my nan and she doesn't get me", id: 'teennotgetme', text: /^Feeling like the person you live with doesn’t get you is lonely/ });
  c('chat9', ["i live with my nan and she doesn't get me", 'nan took my phone again'], { id: 'teenhouse', not: /^Feeling like the person you live with/ });
  c('chat9', ['nan took my phone again', 'nan took my phone again'], { text: /next part|same answer/, not: /^That sounds frustrating. Clashing over rules/ });
  t('chat9', 'opened on the teens page: the young person’s side', { q: 'im in foster care and i hate the rules here', page: '/teens.html', id: 'teenfoster', link: '/teens.html#family-care', not: /carers’ support group|training on trauma/ });
  t('chat9', '"i\'m in foster care": the young person’s side anywhere', { q: 'im in foster care and i hate the rules here', id: 'teenfoster', not: /carers’ support group/ });
  t('chat9', 'carers on the teens page: rules question answered for the teen', { q: 'what rules should we set for a 15 year old', page: '/teens.html', not: /rules many families use for a 13 to 16 year old/ });
  // B: each speaker's own side
  t('chat9', 'co-founder accused of controlling', { q: "my co-founder says I'm controlling but if I don't check things the permits lapse", id: 'bizcontrolling', text: /permits/, link: '/work.html#owner-list', not: /It’s my bakery too/ });
  t('chat9', 'baking side asks what the admin involves', { q: 'how do we split the work fairly when my job is baking and theirs is admin', id: 'bizsplit', text: /ask what the admin involves/, not: /I’m the only one who knows how payroll works/ });
  t('chat9', 'admin side', { q: 'how do we split the work fairly when my job is the admin and theirs is baking', id: 'bizsplit', text: /lonely kind of work/ });
  t('chat9', 'unclear side: which part is yours?', { q: 'how do we split the work fairly between baking and admin', kind: 'clarify', text: /Which part is yours/ });
  t('chat9', 'walking away from the business: burnout first', { q: "I'm so tired I've thought about walking away from the business", id: 'bizburnout', text: /^That sounds like real burnout[\s\S]*accountant or a lawyer/, link: '/work.html#business-partners' });
  t('chat9', 'business answers link the team one-owner list', { q: 'nobody sees the admin I do', link: '/work.html#owner-list', not: /wp-03/ });
  c('chat9', ['how do i reach out to my brother after years of silence', 'what if he doesnt come to my daughters christening'], { id: 'riftevent', text: /his choice/, not: /I’ll come to the christening/ });
  c('chat9', ['how do i reach out to my brother after years of silence', 'should i mention dads house in the message'], { id: 'riftmention', text: /^Not in a first message/, not: /I was hurt by the will/ });
  t('chat9', 'gaming, ignored side: lonely first', { q: 'he plays video games all night and ignores me', id: 'gaming', text: /^That sounds lonely/, link: '/gaming-and-time-together.html#ignored' });
  c('chat9', ['he plays video games all night and ignores me', 'honestly i also do all the cleaning'], { id: 'gamingchores', link: '/workpapers/wp-03-one-owner-per-job.html', not: /being reminded about chores/ });
  c('chat9', ['he plays video games all night and ignores me', 'ok but how do i say it without him getting defensive'], { id: 'gamingtalk', text: /timing/, link: '/gaming-and-time-together.html#talking' });
  t('chat9', 'gaming addiction: worth taking seriously, no referral', { q: 'is gaming addiction a real thing or is she overreacting', id: 'gamingaddiction', text: /worth taking seriously/, not: /^Gaming is a real way to rest|doctor/ });
  t('chat9', 'gamer side unchanged', { q: 'my gf says i game too much', id: 'gaming', text: /don’t need to apologize/ });
  c('chat9', ['he came back and changes how I do everything'], { id: 'comehome', text: /You carried everything for months/, link: '/coming-home.html#held-the-fort' });
  t('chat9', 'the returning side', { q: 'i feel like a stranger in my own house', id: 'comehome', text: /^Feeling like a stranger/, link: '/coming-home.html#returning' });
  t('chat9', 'ptsd question: coming-home help, no Wiring Card', { q: 'do i have ptsd? i keep waking up and jumping at noises', id: 'ptsdq', text: /can’t tell you that/, link: '/coming-home.html#sleep', chip: /pause plan/, not: /Wiring Card|Wired Differently|doctor/ });
  t('chat9', 'how to talk about feelings: the speaker’s own side', { q: 'how to talk about feelings', id: 'feelingstalk', text: /one fact and one feeling/, not: /To a partner who shows care by doing|Thank you for sorting the car/ });
  t('chat9', 'partner who doesn’t talk: the other side', { q: "my husband doesn't talk about his feelings", id: 'feelingstalk', text: /show love by doing/ });
  t('chat9', 'not liking feelings talk: care by doing, no labels', { q: "I don't like talking about feelings", id: 'nofeelingstalk', text: /^That’s okay/, not: /alexithymia|autis/i });
  t('chat9', 'long hours, no time: time together', { q: 'I work long hours, no time', id: 'longhoursnotime', not: /Word Bloom|Calm-Down Kit/ });
  t('chat9', 'everything is fine (kept)', { q: 'my wife says we are not close, but everything is fine', id: 'feelsfine' });
  // C: routing
  t('chat9', 'sibling + dad’s house + christening: rifts, not faith', { q: 'he got dads house and now wants me at his kids christening like nothing happened', id: 'riftevent', link: '/family-rifts.html', not: /interfaith|Eid|Faith often/ });
  t('chat9', 'brother’s christening invite: rifts', { q: 'my brother invited me to his daughters christening', id: 'riftevent', not: /interfaith|Faith often/ });
  t('chat9', 'should i go to the christening: rifts', { q: 'should i go to the christening', id: 'riftevent', not: /interfaith/ });
  t('chat9', 'dad loved him more: favouritism', { q: 'dad always loved him more', id: 'favourite', link: '/family-rifts.html#old-roles', not: /stepchild|replace your mom/ });
  t('chat9', 'favourite: a choice, not a sibling defence', { q: 'my brother was always the favourite', id: 'favourite', text: /If you don’t, for now|not ready to talk/, not: /It wasn’t your sibling’s doing/ });
  t('chat9', 'christening with two faiths stays two faiths', { q: 'how do we decide about christening our baby when we have two faiths', id: 'twofaiths' });
  t('chat9', 'names: the two-faiths Names list', { q: "my parents want a muslim name and her family want a saint's name", id: 'faithnames', link: '/two-faiths.html#decide', not: /visits/ });
  t('chat9', 'holidays how: festival year', { q: 'how do we celebrate both Eid and Christmas', id: 'faithholidays', link: '/two-faiths.html#holidays' });
  t('chat9', 'faiths unnamed: no Eid and Christmas assumed', { q: 'my wife and I have different religions and a baby on the way', id: 'twofaiths', not: /Eid and Christmas/ });
  t('chat9', 'grammar: things where you’d value it', { q: 'my mother-in-law wants us to raise the baby Muslim', text: /things where you’d value it/ });
  t('chat9', 'cold meetings and paperwork: home or work?', { q: 'i do all the meetings and paperwork', kind: 'clarify', text: /home or at work/, not: /coworker/ });
  c('chat9', ['our foster daughter pushes us away', 'i do all the meetings and paperwork', 'and my husband just wants stricter rules'], { id: 'fostertwocarers', link: '/foster-and-kinship.html#two-carers', not: /the same goes with your husband/ });
  t('chat9', 'laughs when i take her phone: consequence not landing', { q: 'she just laughs when i take her phone', id: 'teenlaughs', text: /isn’t landing/ });
  t('chat9', 'cold guilt + what to say to her: ask who', { q: "i feel so guilty, i dont even know what to say to her", kind: 'clarify', not: /bad partner|resenting/ });
  t('chat9', 'I’m 67: any age, solo chips', { q: "I'm 67, is this site for people my age?", id: 'anyage', text: /^Yes\. This site is for any age/, chip: /on my own|Grandchildren/, nochip: /same fight|Making up after a fight/ });
  c('chat9', ['i feel shut out from my grandchild', "what should i text her back, i'm hurt"], { id: 'gptextback', script: true, not: /background notes|Hurt is the pain/ });
  t('chat9', 'turns up with no warning: grown child side', { q: 'she just turns up with no warning and tells me im doing it wrong', id: 'gcturnsup', link: '/grown-up-children.html#visits' });
  t('chat9', 'caregiver guilt: neutral wording', { q: 'i feel guilty for resenting it', id: 'careresent', not: /can’t take it in/ });
  c('chat9', ['can you check a message to my mum before I send it'], { id: 'checkask', text: /Paste or type the message/ });
  c('chat9', ['can you check a message to my mum before I send it', "Mum, we'll decide about baptism ourselves."], { id: 'checkmsg', script: true, text: /closed door/, link: '/signal-translator.html', not: /Faith often/ });
  t('chat9', 'a pasted "Mum, …" message is checked', { q: 'Mum, you never listen to us about the baby.', id: 'checkmsg', text: /Lately it/ });
  t('chat9', '"Okay, …" is not a pasted message', { q: 'Okay, my partner never helps with the dishes', not: /Signal Translator’s rules|Chat analyzer’s rules/ });
  // D: no repeats, no mid-sentence excerpts, the greeting
  c('chat9', ['how do I ask my boss for written instructions', 'the office is too loud'], { not: /Could you send that to me in writing, with the deadline\? I take things in better that way\.[\s\S]*Could you send that to me in writing/ });
  t('chat9', 'no excerpt starts with an ellipsis', { q: 'she just turns up with no warning and tells me im doing it wrong', not: /\] … |^… /m });
  t('chat9', 'no quote twice in one reply', { q: 'how do I ask my boss for written instructions', not: /Could you send that to me in writing, with the deadline\? I take things in better that way\.[\s\S]*Could you send that to me in writing, with the deadline\? I take things in better that way\.[\s\S]*Could you send that/ });
  // E/F, overview, infographics
  t('chat9', 'page overview from the end-of-page button', { q: 'Tell me more about On My Own After a Breakup or Divorce', page: '/on-my-own.html', id: 'overview', text: /It has sections on/, not: /^Keep it short, kind and about the kids/ });
  t('chat9', 'page overview from ask.html?about', { q: 'When a Child Has ADHD', about: 'When a Child Has ADHD', id: 'overview', not: /Wiring Card|double empathy/i });
  t('chat9', 'infographic: the topic wins over the audience', { q: 'make a poster with the steps of active listening for teenagers', kind: 'info', info: true, text: /Active listening/, not: /growing up/i });
  c('chat9', ['make me an infographic about active listening', 'Make another infographic'], { kind: 'clarify', id: 'ig-next' });
  // the coordinator's later reports
  t('chat9', 'sunday after they go back to their mum', { q: 'i dread sunday evenings after they go back to their mum', id: 'sundaygoodbye', link: '/on-my-own.html#part-time-parent', not: /In-law|your partner first/ });
  t('chat9', 'weekends not like a visit', { q: 'how do i make weekends with my kids feel normal and not like a visit', id: 'parttimehome' });
  c('chat9', ['my 13 year old barely talks to me', "he's on his phone the whole weekend and i only get him every other weekend"], { id: 'parttimeteen', not: /jealous/ });
  c('chat9', ['my roommates boyfriend is always here', 'how do i bring it up', 'what if she gets mad at me'], { id: 'roommad', not: /say sorry for that one specific thing/ });
  t('chat9', 'fiancee controlling about money: feeling first, policed script', { q: "my fiancee is controlling about money, she wants to approve everything I buy", id: 'moneycontrol', text: /^Feeling watched over every purchase[\s\S]*I feel watched when I have to explain small things/, not: /^Fair question/ });
  t('chat9', 'checking his statements weekly leans to control', { q: 'is it controlling if I want to check his bank statements every week', id: 'moneycontrol', text: /leans toward control/ });
  t('chat9', 'wedding: the warmer script', { q: 'my parents want a huge wedding', id: 'wedding', text: /honors them and fits our plan/, not: /the guest list stays ours/ });
  t('chat9', 'parents want 300 guests', { q: 'his parents want 300 guests', id: 'wedding' });
  t('chat9', 'temper: the strong anger answer', { q: 'how do i stop losing my temper', id: 'angerstop', text: /honest line[\s\S]*Stop and step back/, link: '/parents.html#anger-help', not: /if I seem short, it isn’t about you/ });
  ['i keep losing it', 'my temper', 'anger problem'].forEach(q => t('chat9', q, { id: 'angerstop', not: /if I seem short/ }));
  t('chat9', 'yelled at my wife: no invented time', { q: 'i yelled at my wife last night', id: 'yellpartner', not: /this morning/ });
  c('chat9', ['i yell at my kids', 'how do i make it right with them'], { id: 'yellkidsrepair', link: '/parents.html#repair-scared', not: /tower/ });
  ["i feel really anxious right now", "i'm so anxious", 'anxiety attack'].forEach(q => t('chat9', q, { id: 'calmnow', text: /slow down together/, link: '/upset-right-now.html', not: /Breathe button, on any page/ }));
  c('chat9', ['is ashwagandha safe', 'i feel really anxious right now'], { id: 'calmnow' });
  t('chat9', 'SSRI + CBD: no guidance, and the meds line', { q: 'i take sertraline, can i take CBD', id: 'calmpills', text: /interact with prescribed medicines[\s\S]*should never be stopped, swapped or changed suddenly/ });
  t('chat9', 'ashwagandha better than my meds', { q: 'does ashwagandha work better than my meds', id: 'calmpills', text: /should never be stopped, swapped or changed suddenly/ });
  t('chat9', 'what dose: never a dose', { q: 'what dose of ashwagandha should i take', id: 'calmpills', text: /I can’t give doses, products or amounts/, not: /pharmacist|doctor/ });
  t('chat9', 'what to tell my doctor about supplements: no referral card any more', { q: 'what should i tell my doctor about supplements', not: /pharmacist|prescriber/i });
  t('chat9', 'adult bi and religious parents: adult answer', { q: 'im bi and scared to tell my parents, they are very religious', id: /lgbtadult|lgbtsafety/, link: '/coming-out.html', not: /GSA|For teens|misgender/i });
  t('chat9', 'states an adult age: adult coming out', { q: "i'm 31, not a teen. my partner is a woman and my parents are conservative christians", id: /lgbtadult|lgbtsafety/, not: /Talking with teenagers|Parenting styles/ });
  t('chat9', 'shared wifi: device privacy', { q: 'can my parents see what i look at on here? we share wifi', id: /wifiprivacy|devicekeep/ });
  t('chat9', 'homophobic dad: the boundary script', { q: 'my dad says homophobic stuff about my girlfriend, how do i set a boundary', id: 'lgbtboundary', text: /I’ll head home/ });
  t('chat9', 'articles: nothing on it, so the guide', { q: 'find me articles about coming out to religious parents', not: /aging|Caring for/i });
  t('chat9', 'partner wants me to come out sooner', { q: "my girlfriend wants me to come out sooner than i'm ready", page: '/coming-out.html', id: 'comeoutpartner', link: '/coming-out.html#partner' });
  t('chat9', 'nonbinary and partners: acknowledged', { q: 'i am nonbinary, they/them. my partners are a man and a woman. is this site ok for us?', id: 'identityok', text: /^Thanks for telling me/, link: '/more-than-two.html#respect', not: /Staying with that/ });
  c('chat9', ['my grandson has ADHD, how should I talk to him', 'he forgets everything'], { id: 'adhdforget', link: '/adhd-kids.html#forget', not: /bins|gaslight/ });
  t('chat9', 'grandson can’t sit still', { q: "my grandson can't sit still", id: 'adhdfidget' });
  t('chat9', 'seen and not heard, too strict', { q: 'I was brought up that children should be seen and not heard. my daughter says I am too strict', id: 'seenheard', link: '/grandparents.html#rules', text: /two rulebooks/ });
  t('chat9', 'text size names', { q: 'how do i make text bigger', id: 'textsize', text: /Normal, Large, Extra large or Largest/ });
  t('chat9', 'print answer: the real buttons', { q: 'how do I print the page about ADHD', text: /bottom[\s\S]*Print this page[\s\S]*Print a short version/, not: /tap Share at the top/ });
  t('chat9', 'sarcasm explained', { q: "I don't understand sarcasm", id: 'sarcasm', text: /opposite of what you mean/ });
  t('chat9', 'meltdown vs tantrum', { q: 'what is the difference between a meltdown and a tantrum?', id: 'meltdowntantrum', text: /tantrum is usually aimed at getting something/, not: /at work/ });
  c('chat9', ['talk deep', 'what is autistic burnout?'], { kind: 'deep', text: /Raymaker/ });
  c('chat9', ['talk deep', 'what is the double empathy problem?'], { kind: 'deep', text: /Milton/ });
  t('chat9', 'making friends as an autistic adult', { q: 'how do I make friends as an autistic adult?', id: 'autisticfriends' });
  c('chat9', ['talk deep: are emotions universal? do all cultures feel the same things'], { text: /plain answer[\s\S]*(What emotions are|emotion)/, chip: /Keep it light/ });
  t('chat9', 'carer losing patience and guilt (English)', { q: 'I lose patience with her and feel guilty', id: 'careresent' });
  t('chat9', 'carer asks grown children for help', { q: 'how I ask my children for more help', id: 'careadultkids', not: /teenagers|Baumrind/ });
  t('chat9', 'flatmates: group words', { q: 'my flatmates and I keep fighting about the bins and whose turn it is', not: /you both/ });
  t('chat9', 'a rota instead of one owner', { q: 'can we do a rota instead of one owner?', id: 'houserota', text: /^Yes, a schedule is fine/ });
  t('chat9', 'three people cleaning: a direct answer', { q: 'how do we split cleaning fairly with three people', id: 'housethree', text: /^With three of you/, not: /professor voice|Ahem/ });
  c('chat9', ['we have 2 year old twins', 'how do I show her what I do without a fight'], { id: 'showwhatido', link: '/lemonade-stand.html', not: /night feed/i });
  t('chat9', 'nobody notices what I do: all kinds of unseen work', { q: 'nobody notices what I do', id: 'nobodynotices', text: /thinking work[\s\S]*physical jobs[\s\S]*paid work/ });
  t('chat9', 'they say I’m rude: the direct script', { q: "they say I'm rude at work", id: 'saysrude', text: /I’m direct because I want to be clear, not unkind/, link: '/signal-translator.html?use=work', not: /when you get a chance/ });
  t('chat9', 'work mode links carry ?use=work', { q: 'how do I ask my boss for written instructions', link: '/signal-translator.html?use=work' });
  // care10 / clarify10: care is not control; no labels; ask a few short questions before any read
  const DV10 = /That sounds really hard|signs of control|isn.t a communication problem|These are red flags/;
  const LABEL_SAY = /\bred flags?\b|\btoxic\b|\bnarcissist\b|\bmanipulative\b|\b(is|are|being) (so |very |really )?controlling\b|\bgaslighting you\b|\babusive\b/i;
  [["she wants me to text when I'll be late", /know you’re safe/], ['he asked me not to flirt with my ex', /distance from an ex/], ['my mum says I need to be home by 10', /house rule/],
    ['my partner wants us to agree before big purchases', /big spends/], ['he wants phones off at dinner', /phones away at dinner/], ['my partner said no to me going on the trip with my ex', /distance from an ex/],
    ["my wife doesn't want me going to that party", /said no out of care/], ["he said he's not okay with me lending his brother money", /saying no to a loan/], ["he won't let me go on the trip with my ex", /distance from an ex/],
    ['my mum is controlling about curfew', /house rule/]]
    .forEach(([q, x]) => t('care10', 'care, not control: ' + q, { q, kind: 'care', id: 'carenotcontrol', text: new RegExp(x.source + '[\\s\\S]*is not control'), script: true, link: '/communication.html#saying-no', not: new RegExp(DV10.source + '|' + LABEL_SAY.source, 'i'), chip: /A few quick questions/ }));
  t('care10', 'care request with anger: one gentle line, no control answer', { q: "my wife wants me to text her when I'm on my way home but she gets angry if I don't", id: 'carenotcontrol', text: /also need it to be okay when I forget/, not: DV10 });
  [["I'll leave if this keeps happening", 'ownboundary'], ["If he lies again I'll leave", 'ownboundary'], ["is it a threat if I tell him I'll leave", 'ownboundary'], ["he says he'll leave if I keep drinking", 'theirboundary']]
    .forEach(([q, id]) => t('care10', 'a stated consequence is a boundary: ' + q, { q, kind: 'care', id, text: /boundary, not a threat/, not: DV10 }));
  // the other direction: isolation, checking, money kept back, threats and fear keep the safety answers and resources
  [["he won't let me see my friends or family", /That sounds really hard|not your fault/], ['he checks my phone every night', /That sounds really hard|not your fault/], ['my husband controls all the money', /That sounds really hard|not your fault/],
    ['she threatened to leave and take the kids if I go out with my friends', /That sounds really hard|not your fault/], ["my boyfriend is controlling, he checks my phone", /That sounds really hard|not your fault/], ["he says he'll hurt me if I go to the party", /That sounds really hard|not your fault/]]
    .forEach(([q, x]) => t('care10', 'still a safety answer: ' + q, { q, kind: 'safety', text: x }));
  t('care10', 'the control answer asks rather than concludes', { q: 'he checks my phone every night', chip: /Ask me a few questions/, nochip: /red flag/i });
  t('care10', 'a request "or else" is not the care answer', { q: 'my partner wants me to text when I’m late or else', not: /is not control/ });
  // jealousy, sulking, silence, one harsh message, an argument: ordinary help first
  [['she gets jealous when I see my friends', 'friendsjealous'], ['he sulks when I go out with my mates', 'friendsjealous'], ['my girlfriend goes quiet every time I see my family', 'friendsjealous']]
    .forEach(([q, id]) => t('care10', 'jealous or quiet: ordinary help: ' + q, { q, id, script: true, text: /isn’t a reason to stop seeing/, not: new RegExp(DV10.source + '|' + LABEL_SAY.source, 'i') }));
  ['my wife gives me the silent treatment', 'he sent me one harsh message', 'we had a big argument last night', 'he said no to a holiday this year']
    .forEach(q => t('care10', 'ordinary, not safety: ' + q, { q, not: DV10 }));
  // a label typed by the person: never confirmed; what happened, or a few questions
  [['my husband is toxic', /won’t put a label/], ['is my wife a narcissist', /can’t diagnose/], ['my boyfriend is so controlling', /won’t put a label/], ['she is so manipulative', /won’t put a label/],
    ['controlling', /won’t put a label/], ['my partner gaslights me', /unsure of what you remember/], ['our relationship is toxic', /won’t put a label/]]
    .forEach(([q, x]) => t('care10', 'a label, explored: ' + q, { q, kind: 'care', id: 'label', text: x, chip: /Money|I feel afraid/, not: new RegExp(DV10.source + '|' + LABEL_SAY.source, 'i') }));
  t('care10', 'a label with a topic starts the questions', { q: 'my partner is a bit controlling about the dishes', kind: 'ask', id: 'clarify-load', text: /How long/, chip: /A year or more/, not: LABEL_SAY });
  t('care10', 'red flag with no context: signs, the clarity line, resources, no verdict', { q: 'is this a red flag', kind: 'redflag', text: /signs to take seriously[\s\S]*is not control/, not: /These are red flags|from a red flag/, chip: /Money/ });
  t('care10', 'how do I tell the difference', { q: 'How do I tell the difference?', kind: 'redflag' });
  c('care10', ['We keep fighting about money', 'is that a red flag?'], { kind: 'redflag', id: 'clarify-money', text: /fixable[\s\S]*isn’t a sign of control[\s\S]*How is money set up/, chip: /Shared, and we can both see it/, not: LABEL_SAY });
  // the short questions: one per turn, tap answers, then a read that fits
  c('care10', ['is it fair that I do all the cooking'], { kind: 'ask', id: 'clarify-load', text: /How long has the split/, chip: /A year or more/ });
  c('care10', ['is it fair that I do all the cooking', 'Not sure'], { kind: 'ask', id: 'clarify-load', text: /reason it’s this way/, chip: /^Not sure$/ });
  c('care10', ['is it fair that I do all the cooking', 'A year or more', 'Not that I know of', 'One of us feels worn down or resentful', 'Yes, but nothing has changed', 'No, not really'],
    { kind: 'read', id: 'clarify-load', text: /heavier pattern[\s\S]*not a verdict/, not: DV10 });
  c('care10', ['is it fair that I do all the cooking', 'A few weeks, or less', 'Yes, something for now: illness, a new baby, a new job, exams, a move', 'We both seem fine with it', 'Yes, and it’s getting better', 'Yes, it evens out'],
    { kind: 'read', text: /ordinary rough patch/, not: DV10 });
  c('care10', ['is it fair that I do all the cooking', 'just tell me'], { kind: 'read', text: /everyday read/, not: DV10 });
  c('care10', ['A few questions about money', 'Skip all'], { kind: 'read', id: 'clarify-money', text: /everyday read/, not: DV10 });
  t('care10', 'the bank’s own why line, then the first question, with Skip all', { q: 'A few questions about money', kind: 'ask', id: 'clarify-money', text: /many fair ways[\s\S]*How is money set up/, chip: /^Skip all$/ });
  c('care10', ['my partner said no to me going on the trip with my ex', 'A few questions about a limit or a no', 'Respect for the relationship (for example an ex, flirting, late-night messages)', 'Yes, to both of us', 'It was asked kindly, and I could say no', 'Yes, both of us can', 'No'],
    { kind: 'read', id: 'clarify-limits', text: /ordinary rough patch[\s\S]*care or respect/, not: DV10 });
  c('care10', ['A few questions about a limit or a no', 'Who I can see or talk to, in general (friends, family)', 'No, only to me', 'One of us set it', 'It leads to a big row, days of silence, or something being taken away'],
    { kind: 'safety', text: /Some of this sounds serious[\s\S]*\nThat sounds really hard\. I’m a small guide to this site, and I can’t help with this one\.\n/ });
  c('care10', ['my husband is toxic', 'A few questions about feeling afraid', 'Yes, I’m safe right now', 'Yes, I feel afraid'], { kind: 'safety', text: /Some of this sounds serious[\s\S]*\nThat sounds really hard\. I’m a small guide to this site, and I can’t help with this one\.\n/ });
  c('care10', ['is it fair that I do all the cooking', 'I want to end it all'], { kind: 'safety', text: SUICIDE });
  c('care10', ['is it fair that I do all the cooking', 'my mum keeps calling me at work'], { not: /How long has the split|reason it’s this way/ });
  c('care10', ['He never apologizes and always turns things around on me. Is he a narcissist?', 'Always me. The other never does'], { kind: 'ask', id: 'clarify-repair', text: /blame land on one person/ });

  // chat10 (owner): care is not control, for partners, parents and friends alike, and for the one asking too
  const CARE10 = { kind: 'care', id: 'carenotcontrol', script: true, link: '/communication.html#saying-no', not: new RegExp(DV10.source + '|' + LABEL_SAY.source, 'i') };
  [['phones off at dinner', /phones away at dinner/], ['my mum says home by 10', /house rule/], ['my partner said no to the trip with my ex', /distance from an ex/],
    ["my dad says I can't go to the party", /house rule/], ["my parents said I can't have my boyfriend sleep over", /house rule/], ["my dad says I can't see my friends until my homework is done", /house rule/],
    ["my mum says I'm not allowed to see my friends on school nights", /house rule/], ["my partner doesn't want me walking home alone at night", /worried about you getting hurt/],
    ['she asked me to see a doctor about my drinking', /worried about your health/], ['my partner wants to know where I am when I go out late', /want to know you’re safe/],
    ['is it controlling that my wife wants me home by midnight', /want to know you’re safe/], ['is this a red flag he wants to know where I am', /want to know you’re safe/],
    ["my wife won't let me buy a motorbike", /worried about you getting hurt/], ["my wife is so controlling she won't let me buy a new car", /no to a big spend/],
    ['my best friend asked me not to bring my new boyfriend to her birthday', /their own event is theirs to decide/], ["he doesn't want me going to the club with my single friends", /isn’t control/]]
    .forEach(([q, x]) => t('chat10', 'care, not control: ' + q, Object.assign({ q, text: new RegExp(x.source + '[\\s\\S]*is not control') }, CARE10)));
  t('chat10', 'the asker’s own side: asking for a text is not control', Object.assign({ q: "am I controlling if I ask him to text me when he's late", text: /isn’t control[\s\S]*Could you send a quick text/ }, CARE10));
  c('chat10', ['talk deep', 'is it controlling to want phones off at dinner'], Object.assign({ text: /phones away at dinner, isn’t control/ }, CARE10));
  c('chat10', ['talk deep', 'my mum is controlling about curfew'], { id: 'carenotcontrol', not: /Let’s think about fear, control and safety/ });
  [["my boyfriend won't let me buy a car with my own money", 'clarify-money'], ['he wants me home by 8 every night or he gets angry', 'clarify-limits'], ['she asked me to stop seeing my sister', 'clarify-limits'],
    ["he says if I go out with my friends he'll leave me", 'clarify-limits']]
    .forEach(([q, id]) => t('chat10', 'care or control? a few questions first: ' + q, { q, kind: 'ask', id, chip: /^Skip all$/, not: new RegExp('is not control|' + LABEL_SAY.source, 'i') }));
  t('chat10', 'stop talking to my friends: the safety answer', { q: 'he wants me to stop talking to my friends', kind: 'safety', text: /common signs of control/ });
  t('chat10', 'driving after drinking: worry about getting hurt', Object.assign({ q: "my wife doesn't want me driving home after drinking", text: /worried about you getting hurt[\s\S]*is not control/ }, CARE10));
  t('chat10', 'a big spend: the money questions are one tap away', { q: "my wife won't let me buy a new car", id: 'carenotcontrol', chip: /A few quick questions/ });
  t('chat10', '"I\'m done" if it keeps happening is a boundary', { q: "I told him if he keeps lying I'm done", kind: 'care', id: 'ownboundary', text: /boundary, not a threat/, not: DV10 });
  [["my boyfriend doesn't like me going out without him", 'friendsjealous'], ["she doesn't like it when I go out with my mates", 'friendsjealous']]
    .forEach(([q, id]) => t('chat10', 'jealous, ordinary help: ' + q, { q, id, text: /isn’t a reason to stop seeing/, not: new RegExp(DV10.source + '|' + LABEL_SAY.source, 'i') }));
  // the other way: clear signs keep the safety answer and its resources
  [["she says I can't talk to anyone but her", /That sounds really hard|not your fault/], ["he told me I can't see my family anymore", /That sounds really hard|not your fault/], ["he won't let me see my friends", /That sounds really hard|not your fault/],
    ['she reads my messages without asking', /That sounds really hard|not your fault/], ['he takes my paycheck', /That sounds really hard|not your fault/], ["I'm scared of him", /That sounds really hard|not your fault/], ['he threatened to hurt me', /That sounds really hard|not your fault/],
    ["my partner wants me to text when I'm late and gets furious and threatens me if I don't", /That sounds really hard|not your fault/], ['he always wants to know where I am and tracks my phone', /That sounds really hard|not your fault/]]
    .forEach(([q, x]) => t('chat10', 'still a safety answer: ' + q, { q, kind: 'safety', text: x, not: /is not control/ }));
  t('chat10', 'wanting to know where I am all the time: questions, not a verdict either way', { q: 'he wants to know where I am all the time', kind: 'ask', id: 'clarify-limits', text: /worry, or it can start to feel like being checked on/, not: /want to know you’re safe|That sounds really hard/ });
  // no labels: "is he abusive?" with nothing described: ask what happened, the signs, the free lines, never a verdict
  t('chat10', 'is he abusive: ask, don’t conclude', { q: 'is he abusive', kind: 'safety', id: 'abuseask', text: /can’t tell from a chat[\s\S]*What has been happening/, chip: /I feel afraid/, not: /sounds serious|What you’re describing/ });
  c('chat10', ["my husband yells and i'm scared", 'is he abusive?'], { kind: 'safety', not: /can’t tell from a chat/ });
  c('chat10', ['what tools are there', 'is he abusive'], { kind: 'safety', id: 'abuseask', not: /household conflict|Forgetting things/ });
  ['my mother is a narcissist', 'my ex is toxic', 'is he gaslighting me', 'is my relationship toxic', 'my friend is manipulative']
    .forEach(q => t('chat10', 'a label, explored, never confirmed: ' + q, { q, kind: 'care', id: 'label', not: LABEL_SAY }));
  // proportionate questions: something that may be unfair gets one short question at a time first
  [['he always gets his way', 'clarify-decisions', /When a decision affects you both/], ['she makes all the decisions', 'clarify-decisions', /When a decision affects you both/],
    ['my wife always blames me', 'clarify-repair', /who usually says sorry first/], ["he says I'm always wrong", 'clarify-communication', /feeling unheard/]]
    .forEach(([q, id, x]) => t('chat10', 'questions before a read: ' + q, { q, kind: 'ask', id, text: x, chip: /^Skip all$/, not: DV10 }));
  t('chat10', 'unfair, no topic yet: what is it mostly about?', { q: 'it feels unfair', kind: 'clarify', id: 'unfairpick', chip: /Who does what/ });
  c('chat10', ['this doesn’t feel fair', 'A few questions about who does what'], { kind: 'ask', id: 'clarify-load', text: /How long has the split/ });
  t('chat10', 'a playbook about fairness offers the questions', { q: 'I do all the housework and he does nothing', kind: 'sit', chip: /Is it fair\? A few quick questions/ });
  c('chat10', ['I do all the housework and he does nothing', 'A few questions about who does what'], { kind: 'ask', id: 'clarify-load', text: /How long has the split/ });
  t('chat10', 'a self playbook offers no questions', { q: 'I keep overreacting to small things', nochip: /A few quick questions/ });
}

// ---------------------------------------------------------------- chat10: the newer pages, all free, no podcast
t('chat10', 'opened with the co-parenting page’s current heading', { q: 'she makes decisions without asking me', about: 'Co-parenting after a separation', id: 'coparentdecide', link: '/co-parenting.html#who-decides' });
t('chat10', 'all tools, by type', { q: 'what tools are there', id: 'alltools', link: '/tools.html' });
t('chat10', 'a list of every tool', { q: 'is there a list of every tool', id: 'alltools', link: '/tools.html' });
t('chat10', 'everything on this site', { q: 'how do I explore the site', id: 'explore', link: '/explore.html' });
t('chat10', 'where to start: the three quick questions', { q: 'help me find where to start', kind: 'card', id: 'start', link: '/start-here.html', text: /three quick questions/ });  // mergeB: /find-your-start.html is now /start-here.html#three-questions
t('chat10', 'why this site', { q: 'why should I use this site instead of an AI chat', id: 'whysite', link: '/why-this-site.html', text: /free/ });
t('chat10', 'living alone', { q: 'I live alone', id: 'livingalone', link: '/living-alone.html' });
t('chat10', 'living alone tips', { q: 'tips for living alone', id: 'livingalone', link: '/living-alone.html', not: /isn’t only for couples/ });
t('chat10', 'single still gets the on-your-own answer', { q: 'can i use this if im single', id: 'single' });
t('chat10', 'nervous system', { q: 'what is the vagus nerve', id: 'nervoussystem', link: '/nervous-system.html' });
t('chat10', 'fight or flight', { q: 'what is fight or flight', id: 'nervoussystem', link: '/nervous-system.html' });
t('chat10', 'CBD: no product detail any more', { q: 'does CBD help with anxiety', id: 'calmpills', not: /Lennox|Dravet|tuberous/, link: '/calm-without-pills.html#start' });
t('chat10', 'write it through', { q: 'what is write it through', kind: 'card', id: 'writeit', link: '/write-it-through.html' });
t('chat10', 'how you take things in', { q: 'how do I make the site fit my mind', kind: 'card', id: 'takethingsin', link: '/how-you-take-things-in.html' });
t('chat10', 'CALC-02', { q: 'what is CALC-02', kind: 'card', id: 'calc02', link: '/look-back-30-days.html' });
t('chat10', 'the 30-day look-back', { q: 'how does the 30 day look back work', kind: 'card', id: 'calc02', steps: true });
t('chat10', 'the monthly look-back is still WP-04', { q: 'How do I do the monthly look-back?', kind: 'card', id: 'wp04' });
t('chat10', 'WP-12', { q: 'what is WP-12', kind: 'card', id: 'wp12', link: '/workpapers/wp-12-same-moment-different-speeds.html' });
t('chat10', 'WP-14', { q: 'what is WP-14', kind: 'card', id: 'wp14', link: '/workpapers/wp-14-is-it-us-or-everything-else.html' });
t('chat10', 'WP-15', { q: 'what is WP-15', kind: 'card', id: 'wp15', link: '/workpapers/wp-15-keep-your-little-rituals-alive.html' });
t('chat10', 'WP-12 by its old name', { q: 'what is the carrier frequency audit', kind: 'card', id: 'wp12' });
t('chat10', 'the book: three parts, free', { q: 'tell me about the book', kind: 'card', id: 'book', text: /26 chapters in three parts[\s\S]*free|free[\s\S]*26 chapters/, link: '/book/index.html', not: /five chapters|with your email/ });
t('chat10', 'download the book', { q: 'can I download the book', id: 'bookdownload', link: '/book/download.html', text: /free PDF[\s\S]*ask for your email[\s\S]*without an email/ });
t('chat10', 'the app: free, no App Store', { q: 'is there an app', kind: 'card', id: 'app', link: '/install.html', text: /free[\s\S]*Android[\s\S]*iPhone/, not: /coming soon|App Store version is coming/i });
t('chat10', 'the app on iPhone', { q: 'how do I install the app on my iphone', kind: 'card', id: 'app', text: /Add to Home Screen/, not: /coming soon/i });
t('chat10', 'no podcast', { q: 'is there a podcast', kind: 'card', id: 'podcast', text: /no podcast/, not2: /Listen/, not: /Kane and Christian Experience explores|Episode 1|coming soon/ });
t('chat10', 'no podcast in the preface steps', { q: 'how do I read the preface', not: /podcast/i });
t('chat10', 'does it cost anything: free, never a "yes"', { q: 'does it cost anything', id: 'free', text: /^Everything here is free|Everything here is free/, not: /^Yes\. Everything/ });

// ---------------------------------------------------------------- ask.html: every "Try asking…" question gets a real answer
// (deep questions are asked after "Talk deep", as the page does; a question the page adds later is still checked: never a fallback)
{
  const ASK = {
    'I feel like I do everything at home': { kind: 'sit', link: '/lemonade-stand.html' },
    'My best friend never texts back since she had her baby': { id: 'friends', link: '/friends.html' },
    'My roommate never does the dishes': { id: 'roommate+fairness' },
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
    'How do I tell my mom to text before visiting?': { id: 'familyboundary', link: '/grown-up-children.html' },
    'Help me say no to extra work': { id: 'refusals', link: '/refusals.html' },
    'How do I ask my partner for more help at home?': { kind: 'sit', script: true },
    'Give me words to ask for a pause': { id: 'wp11', script: true },
    'How do I apologize so it lands?': { id: 'apologylang' },
    'How do I say sorry to my sister?': { id: 'family+repair', script: true },
    'Let’s just chat': { kind: 'chat' },
    'Tell me a joke': { kind: 'fun' },
    'Tell me a riddle': { kind: 'fun', id: 'pz-riddle' },  // chat11: the answer comes on the next turn
    'Tell me a fun fact': { kind: 'fun', id: 'pz-fact' },
    'Who are you?': { text: /Professor Puddles/ },
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
    'Make an infographic about when one wants to talk and one needs space': { kind: 'info', info: 'cycle', link: '/pursue-withdraw.html' },
    'Make an infographic about love languages': { kind: 'info', info: true, link: '/love-languages.html' },
    'Make a checklist infographic about a calm check-in': { kind: 'info', info: 'checklist' },
    'Make me a chart: me 60 them 40': { kind: 'info', info: 'split' },
    'What is the double empathy problem?': { link: '/wired-differently' },
    'What is the mental load?': { link: ['/glossary.html#load', '/book/preface.html'] },
    'Why isn’t fair always 50/50?': { link: ['/library/', '/share-the-load.html'] },
    'What is a bid for connection?': { link: '/glossary.html#bid' },
    'What does flooded mean?': { link: '/glossary.html#flooded' },
    'What does my battery score mean?': { id: 'wp02' }
  };
  let page = '';
  try { page = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'ask.html'), 'utf8'); } catch (e) { page = ''; }
  const NOFIND = /beyond my puddle|couldn’t find|didn’t catch|isn’t covered here|outside my little|don’t have a page/;
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

// ---------------------------------------------------------------- chat11 (puddles11): Professor Puddles, someone you can just chat with
// persona.json: every topic answers in persona and asks a question back; jokes, riddles (answer next turn), would-you-rather,
// games; memory and callbacks; no repeats; one-word and emoji replies; a plain hand-off when something real comes up; and
// never any comedy in a safety, crisis or serious reply. Also the merged tools (mergeA, mergeB) and "Self-discovery".
if (PERSONA) {
  const ALLP = rs => rs.map(r => (r.blocks || []).filter(b => b.k === 'p').map(b => b.x)).flat();
  const endsQ = (r, rs, text) => /\?\s*$/.test(((r.blocks || []).filter(b => b.k === 'p').pop() || {}).x || '') ? '' : 'no question back at the end';
  // every comic or chit-chat line Puddles has (persona.json and personality.json): none may appear in a serious reply
  const COMIC = new RegExp([PZ_RE(['jokes', 'topics.replies', 'topics.thing', 'react', 'day', 'stories', 'compliments', 'self_jokes', 'tease', 'cheer', 'bored', 'wyr.q', 'wyr.pick', 'riddles.q', 'facts', 'catchphrases', 'just_chat', 'dislike', 'wyr_react', 'wyr_mine', 'quiz_intro', 'rps', 'guess', 'rate', 'flirt']).source,
    PERS ? (() => { const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); return ['light_openers', 'light_closers', 'jokes', 'game_and_play', 'greetings', 'thanks_replies'].map(k => (PERS[k] || []).map(x => esc(x.replace(/\{name\}/g, '').slice(0, 40)))).flat().filter(Boolean).join('|'); })() : '$^'].join('|'));
  const notLight = (r) => /^(chat|fun)$/.test(r.kind || '') ? 'a chit-chat reply (' + r.kind + ' ' + (r.id || '') + ')' : '';
  const ser = (r, rs, text) => notLight(r) || (COMIC.test(text) ? 'a comic line: ' + (text.match(COMIC) || [''])[0] : '');

  // ---- 1. every everyday topic: in persona, with a question back (a statement, and a question to him)
  const TOPICS = {
    weather: ['it\'s raining here', 'do you like the rain?'],
    food: ['I had pancakes for breakfast', 'do you like pizza?'],
    drinks: ['I\'m having a cup of tea', 'do you drink coffee?'],  // “drinking” alone stays with the care routes (alcohol)
    pets: ['we\'ve got a hamster', 'do you like dogs?'],
    music: ['I\'ve been listening to jazz all day', 'do you like music?'],
    films: ['I watched a great film last night', 'have you seen any good movies?'],
    books: ['I\'m reading a really good novel', 'do you like reading books?'],
    games: ['I\'ve been playing Minecraft all afternoon', 'do you play video games?'],
    sport: ['I went swimming this morning', 'do you like football?'],
    hobbies: ['I\'ve started knitting', 'what\'s your favourite hobby?'],
    weekend: ['I had a lovely lazy weekend', 'do you like weekends?'],
    holidays: ['I love Christmas', 'do you celebrate Halloween?'],
    workday: ['I\'ve got an exam tomorrow', 'my day at school was ok'],
    sleep: ['I\'m going to bed soon', 'do you sleep?'],
    birthday: ['it\'s my mum\'s birthday tomorrow', 'I\'m planning a birthday party'],
    seasons: ['autumn is my favourite season', 'do you like winter?'],
    travel: ['I\'m going on a trip to the mountains', 'have you ever been to the beach?']
  };
  // a question about one of his own favourites may keep the older small-talk answer (personality.json), now with a question back
  const OLDST = '|fav_\\w+|coffee_tea|weather_talk|pets|hobbies|weekend_plans|sleep_q|my_birthday|your_birthday|sing|bread';
  Object.keys(TOPICS).forEach(id => TOPICS[id].forEach(q => t('chat11', 'topic ' + id + ': ' + q, { q, kind: 'chat', id: new RegExp('^(pz-' + id + OLDST + ')$'), check: endsQ })));
  t('chat11', 'topic, in chit-chat: a bare word answer', { convo: ['let\'s just chat', 'pizza'], kind: 'chat', id: 'pz-food', check: endsQ });
  t('chat11', 'topic: a dislike is fine too', { q: 'I don\'t really like football', kind: 'chat', id: 'pz-sport', text: PZ_RE(['dislike']), check: endsQ });
  t('chat11', 'topic: "let\'s talk about music"', { q: 'let\'s talk about music', kind: 'chat', id: 'pz-music', check: endsQ });
  t('chat11', 'his own day: how are you', { q: 'how are you', kind: 'chat', id: 'pz-day', text: /Puddle news/, check: endsQ });
  t('chat11', 'his own day: how\'s your day, Professor?', { q: 'How’s your day, Professor?', kind: 'chat', id: 'pz-day', check: endsQ });
  t('chat11', 'his own day, then "pretty good, thanks"', { convo: ['how are you', 'pretty good, thanks'], kind: 'chat', not: /Thanks for telling me|more than small talk/ });

  // ---- 2. fun on request: jokes, riddles, facts, would-you-rather, stories, compliments, rate my day, cheer, bored, games
  const JOKES = new RegExp(PZ_RE(['jokes']).source + '|' + (PERS ? PERS.jokes.map(x => x.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') : '$^'));
  t('chat11', 'a joke', { q: 'tell me a joke', kind: 'fun', id: 'pz-joke', text: JOKES });
  t('chat11', 'a puddle pun', { q: 'tell me a pun', kind: 'fun', text: JOKES });
  c('chat11', ['tell me a joke', 'another one'], { kind: 'fun', id: 'pz-joke', check: (r, rs) => replyText(rs[0]) === replyText(rs[1]) ? 'the same joke twice' : '' });
  t('chat11', 'a riddle asks, and waits', { q: 'tell me a riddle', kind: 'fun', id: 'pz-riddle', text: /\?$/, not: /The answer is/ });
  c('chat11', ['tell me a riddle', 'i give up'], { kind: 'fun', id: 'pz-riddle-answer', text: /The answer is/ });
  c('chat11', ['tell me a riddle', 'give me a hint'], { kind: 'fun', text: /starts with the letter/ });
  c('chat11', ['tell me a riddle', 'a banana?'], { kind: 'fun', id: 'pz-riddle-answer', text: /good guess|Not quite|Close-ish|Correct|got it|Spot on|right/ });
  c('chat11', ['tell me a riddle', 'tell me a joke'], { kind: 'fun', id: 'pz-joke', text: /The answer to my riddle/ });
  T.push({ g: 'chat11', q: 'riddle: the right answer is praised', run: async chat => {
    const r1 = await chat.ask('tell me a riddle'), q = replyText(r1).replace(/^Riddle time! /, '');
    const rd = PERSONA.riddles.find(x => x.q === q);
    if (!rd) return { r: r1, why: ['riddle not found: ' + q] };
    const r2 = await chat.ask('is it ' + rd.keys[0] + '?');
    return { r: r2, why: /Correct|You got it|Spot on|you’re right/.test(replyText(r2)) ? [] : ['a right answer was not praised: ' + replyText(r2)] };
  } });
  t('chat11', 'a fun fact', { q: 'tell me a fun fact', kind: 'fun', id: 'pz-fact', text: /Fun fact/ });
  c('chat11', ['tell me a fun fact', 'another one'], { kind: 'fun', id: 'pz-fact', check: (r, rs) => replyText(rs[0]) === replyText(rs[1]) ? 'the same fact twice' : '' });
  t('chat11', 'would you rather: he asks', { q: 'would you rather', kind: 'fun', id: 'pz-wyr', text: /^Would you rather/ });
  c('chat11', ['would you rather', 'the first one'], { kind: 'fun', id: 'pz-wyr-answer', text: PZ_RE(['wyr.pick']) });
  c('chat11', ['would you rather', 'both'], { kind: 'fun', id: 'pz-wyr-answer', text: PZ_RE(['wyr_both']) });
  t('chat11', 'would you rather: you ask him', { q: 'would you rather fly or be invisible?', kind: 'fun', id: 'pz-wyr-mine', text: /fly|invisible/ });
  t('chat11', 'a tiny story with the pups', { q: 'tell me a story', kind: 'fun', id: 'pz-story', text: /Tidbit|Sugarfoot/ });
  t('chat11', 'a compliment', { q: 'compliment me', kind: 'fun', id: 'pz-compliment', text: PZ_RE(['compliments']) });
  c('chat11', ['rate my day', 'I had pancakes and walked the dog in the rain'], { kind: 'fun', id: 'pz-rate-answer', text: /out of ten|Ten out|Nine out|Eight out|Seven out|Six out/ });
  t('chat11', 'rate my day, said in one go', { q: 'rate my day: missed the bus but had pizza for lunch', kind: 'fun', id: 'pz-rate-answer', text: /pizza|bus/ });
  c('chat11', ['rate my day', 'honestly it was a really rough day'], { kind: 'care', id: 'pz-handoff', check: ser });
  t('chat11', 'cheer me up', { q: 'cheer me up', kind: 'fun', id: 'pz-cheer', chip: /getting me down/ });
  t('chat11', 'i\'m bored: a game, a quiz, or a site game', { q: 'i\'m bored', kind: 'fun', id: 'pz-bored', chip: /Rock, paper|Quiz|riddle|Would you/, check: r => replyLinks(r).length ? '' : 'no link to a game on the site' });
  t('chat11', 'rock, paper, scissors: start', { q: 'rock paper scissors', kind: 'fun', id: 'pz-rps', chip: /Rock/ });
  c('chat11', ['rock paper scissors', 'rock'], { kind: 'fun', id: 'pz-rps-round', text: /You: rock\. Me: (rock|paper|scissors)\./ });
  c('chat11', ['rock paper scissors', 'paper', 'scissors'], { kind: 'fun', id: 'pz-rps-round', text: /Score: you \d, me \d/ });
  t('chat11', 'rock, paper, scissors in one go', { q: 'rock paper scissors, I pick paper', kind: 'fun', id: 'pz-rps-round', text: /You: paper/ });
  t('chat11', 'guess a number: start', { q: 'let\'s play guess the number', kind: 'fun', id: 'pz-guess', text: /1 to 20|between 1 and 20/ });
  c('chat11', ['guess a number', '10'], { kind: 'fun', text: /Higher|Lower|Go higher|Go lower|Bigger|Smaller|It was 10|10 it was/ });
  c('chat11', ['guess a number', '10', '5', '15', '3', '18'], { kind: 'fun', id: 'pz-guess-end', text: /It was \d+|My number was \d+|\d+ it was/ });
  t('chat11', 'a tiny quiz: question 1', { q: 'quiz me', kind: 'fun', id: 'pz-quiz', text: /Question 1 of 3/, check: r => (r.chips || []).length === 3 ? '' : 'no answer chips' });
  c('chat11', ['quiz me', 'b'], { kind: 'fun', text: /Question 2 of 3/ });
  c('chat11', ['quiz me', 'stop'], { kind: 'fun', id: 'pz-quiz-end', text: /Quiz over/ });
  T.push({ g: 'chat11', q: 'quiz: three right answers, a perfect score', run: async chat => {
    let r = await chat.ask('quiz me');
    for (let i = 0; i < 3; i++) {
      const m = /Question \d of 3: (.*?\?)/.exec(replyText(r)), Q = m && PERSONA.quiz.find(x => x.q === m[1]);
      if (!Q) return { r, why: ['quiz question not found'] };
      r = await chat.ask(Q.opts[Q.a]);
    }
    return { r, why: /Three out of three/.test(replyText(r)) ? [] : ['no perfect score: ' + replyText(r)] };
  } });

  // ---- 3. light memory and callbacks
  c('chat11', ['my dog is called Biscuit', 'what\'s my dog called?'], { kind: 'chat', text: /Biscuit/ });
  c('chat11', ['I\'ve got a cat named Mittens', 'do you remember my cat\'s name?'], { text: /Mittens/ });
  c('chat11', ['my dog is called Biscuit', 'tell me a joke', 'lol', 'i like tea', 'ok'], { check: (r, rs) => ALLP(rs.slice(2)).some(x => /Biscuit/.test(x)) ? '' : 'no callback to Biscuit' });
  c('chat11', ['my favourite food is lasagne', 'what\'s my favourite food?'], { text: /lasagne/ });
  c('chat11', ['i love pizza', 'tell me a joke', 'haha', 'ok', 'cool'], { check: (r, rs) => ALLP(rs.slice(2)).some(x => /pizza/.test(x)) ? '' : 'no callback to pizza' });
  c('chat11', ['my dog is called Biscuit', 'forget me', 'what\'s my dog called?'], { text: /haven’t told me/, not: /Biscuit/ });
  c('chat11', ['my name is Sam', 'remember me next time'], { text: /only remember things while this tab is open/, link: '/on-this-device.html' });
  t('chat11', 'no memory of a feeling: "my dog is sick" is not a name', { q: 'my dog is sick', not: /Sick!|Hello, Sick/ });
  t('chat11', 'in the app: an offer to remember', { q: 'my dog is called Biscuit', perks: true, chip: /Remember me next time/ });
  T.push({ g: 'chat11', q: 'in the app, when asked: kept for next time, and called back', run: async () => {
    const local = {}, a = makeChat(null, { perks: true, local });
    await a.ask('my name is Sam'); await a.ask('my dog is called Biscuit');
    const k = await a.ask('remember me next time');
    if (!/remember your name and Biscuit’s name/.test(replyText(k))) return { r: k, why: ['not kept: ' + replyText(k)] };
    const b = makeChat(null, { perks: true, local });
    const r = await b.ask('how are you');
    return { r, why: /Biscuit/.test(replyText(r)) ? [] : ['no callback next visit: ' + replyText(r)] };
  } });
  T.push({ g: 'chat11', q: 'without saving on: nothing kept for next time', run: async () => {
    const local = {}, a = makeChat(null, { perks: true, local });
    await a.ask('my dog is called Biscuit');
    const b = makeChat(null, { perks: true, local }), r = await b.ask('what\'s my dog called?');
    return { r, why: /Biscuit/.test(replyText(r)) ? ['kept without being asked'] : [] };
  } });

  // ---- 4. no repeats within 20 turns
  const noDup = (r, rs) => { const seen = {}, d = []; ALLP(rs).forEach(x => { if (x.length > 25 && seen[x]) d.push(x.slice(0, 60)); seen[x] = 1; }); return d.length ? 'repeated: ' + d[0] : ''; };
  c('chat11', ['tell me a joke'].concat(Array(21).fill('another one')), { kind: 'fun', check: noDup });
  c('chat11', ['how are you', 'i love pizza', 'do you like music', 'lol', 'ok', 'tell me a fun fact', 'another one', 'cool', 'tell me a story', 'nice', 'compliment me', 'haha', 'do you like dogs', 'ok', 'i\'m bored', 'tell me a joke', 'another', 'wow', 'i like tea', 'yes', 'tell me a riddle', 'i give up'], { check: noDup });
  c('chat11', ['let\'s just chat', 'ok', 'ok', 'ok', 'ok', 'ok', 'cool', 'cool', 'cool', 'nice', 'nice', 'yes', 'yes', 'no', 'no', 'lol', 'lol', 'haha', 'haha', 'wow', 'wow', '👍', '👍'], { check: noDup });
  c('chat11', ['how are you', 'how are you', 'how are you', 'how are you', 'how are you', 'how are you'], { kind: 'chat', check: noDup });

  // ---- 5. one-word replies, emoji, laughter, nonsense, typos
  t('chat11', '👍', { q: '👍', kind: 'chat', id: 'pz-react-emoji' });
  t('chat11', '😂', { q: '😂', kind: 'fun', id: 'pz-react-laugh' });
  t('chat11', '❤️: friendship, never romance', { q: '❤️', kind: 'chat', id: 'pz-react-love', text: /[Ff]riend|💧/, not: /date|kiss|darling|sweetheart/ });
  t('chat11', '🌧️', { q: '🌧️', kind: 'chat', id: 'pz-react-rain' });
  t('chat11', '☀️ (his nemesis)', { q: '☀️', kind: 'chat', id: 'pz-react-sun', text: /nemesis|Terrifying/ });
  t('chat11', '🦆', { q: '🦆', kind: 'chat', id: 'pz-react-duck' });
  t('chat11', 'ok (fresh)', { q: 'ok', kind: 'chat', id: 'pz-react-ok', check: endsQ });
  c('chat11', ['tell me a joke', 'lol'], { kind: 'fun', id: 'pz-react-laugh', text: PZ_RE(['react.laugh']) });
  c('chat11', ['tell me a joke', 'haha good one'], { kind: 'fun', id: 'pz-react-laugh' });
  c('chat11', ['let\'s just chat', 'purple'], { kind: 'chat', id: 'pz-react-oneword', text: /purple/i });
  c('chat11', ['let\'s just chat', 'asdfghjkl'], { kind: 'chat', id: 'pz-nonsense', text: /didn’t (quite )?catch/ });
  c('chat11', ['let\'s just chat', 'yes'], { kind: 'chat', id: 'pz-react-yes' });
  c('chat11', ['let\'s just chat', 'nope'], { kind: 'chat', id: 'pz-react-no', text: /no/i });
  c('chat11', ['let\'s just chat', 'wow'], { kind: 'chat', id: 'pz-react-wow' });
  c('chat11', ['how are you', 'idk'], { kind: 'chat', id: 'pz-react-shrug' });
  c('chat11', ['tired', 'yes'], { not: /Thanks for telling me/ });
  t('chat11', 'a typo: "tell me a jok"', { q: 'tell me a jok', kind: 'fun' });
  t('chat11', 'nonsense outside a chat keeps the plain "didn’t catch that"', { q: 'asdfgh', kind: 'unclear', not: COMIC });

  // ---- 6. hand-offs both ways: to help when something real comes up, and back only when it fits
  c('chat11', ['how are you', 'honestly i\'m not ok'], { kind: 'care', id: 'pz-handoff', text: /talk about it/, check: ser });
  t('chat11', '"honestly I\'m not ok" on its own', { q: 'honestly i\'m not ok', kind: 'care', id: 'pz-handoff', check: ser });
  c('chat11', ['how are you', 'not great'], { kind: 'care', id: 'pz-handoff', check: ser });
  c('chat11', ['how are you', 'meh'], { kind: 'care', id: 'pz-handoff', check: ser });
  c('chat11', ['how are you', 'nope'], { kind: 'care', id: 'pz-handoff', check: ser });
  c('chat11', ['let\'s just chat', 'i had a rough day'], { kind: 'care', id: 'pz-handoff', check: ser });
  c('chat11', ['tell me a joke', 'i\'m feeling a bit low'], { kind: 'care', check: ser });
  t('chat11', '😢 gets a hand-off', { q: '😢', kind: 'care', id: 'pz-handoff', check: ser });
  t('chat11', ':( gets a hand-off', { q: ':(', kind: 'care', id: 'pz-handoff', check: ser });
  t('chat11', '😡 gets a hand-off', { q: '😡', kind: 'care', id: 'pz-handoff', check: ser });
  c('chat11', ['how are you', 'not great', 'yes'], { kind: 'care', id: 'pz-listen', check: ser });
  c('chat11', ['how are you', 'not great', 'I’d like to talk about it'], { kind: 'care', id: 'pz-listen', check: ser });
  c('chat11', ['how are you', 'not great', 'take my mind off it'], { kind: 'chat', id: 'pz-lighten', chip: /gentle joke|story|fact/ });
  c('chat11', ['how are you', 'not great', 'take my mind off it', 'tell me a gentle joke'], { kind: 'fun', id: 'pz-joke' });
  c('chat11', ['i feel so lonely', 'thanks, i feel a bit better now'], { kind: 'chat', id: 'pz-better', text: /joke/ });
  c('chat11', ['My partner hits me', 'i feel better now'], { check: ser });
  t('chat11', 'a joke asked for while sad: a check-in first', { q: 'tell me a joke, i\'m sad', kind: 'care', id: 'pz-checkin', check: ser });
  c('chat11', ['tell me a joke, i\'m sad', 'just a gentle joke please'], { kind: 'fun', id: 'pz-joke' });
  t('chat11', 'a joke about a death: never', { q: 'tell me a joke about my dad dying', check: ser });
  t('chat11', 'a joke after a death: never', { q: 'my grandma died, tell me a joke', check: ser });
  t('chat11', 'cheer me up after a loss: never comic', { q: 'cheer me up, my dog died', check: ser });

  // ---- 7. no comedy, ever, in safety, crisis, fear, grief or serious distress: fresh, and in the middle of chit-chat or a game
  const SERIOUS = ['My partner hits me', 'I want to kill myself', 'i want to die', 'he threatened to hurt me', 'i am scared of my husband',
    'my husband died last month', 'i feel so lonely', 'i cut myself', 'i don\'t want to be here anymore', 'my mum passed away yesterday',
    'he checks my phone and won\'t let me see my friends', 'i\'m having a panic attack', 'my partner calls me worthless',
    'i\'m so overwhelmed i can\'t cope', 'i think i\'m depressed'];
  SERIOUS.forEach(m => {
    t('chat11', 'serious, fresh: ' + m, { q: m, check: ser });
    c('chat11', ['let\'s just chat', m], { check: ser });
    c('chat11', ['tell me a joke', 'lol', m], { check: ser });
    c('chat11', ['tell me a riddle', m], { check: ser, not: /The answer to my riddle/ });
    c('chat11', ['quiz me', m], { check: ser, not: /Question 2 of 3/ });
  });
  ['tell me a joke', 'lol', '😂', 'rock paper scissors', 'i\'m bored', 'how are you'].forEach(m => {
    c('chat11', ['My partner hits me', m], { check: ser });
    c('chat11', ['I want to kill myself', m], { check: ser });
  });
  c('chat11', ['rock paper scissors', 'he hit me'], { kind: 'safety', check: ser });
  c('chat11', ['guess a number', 'i want to die'], { kind: 'safety', check: ser });

  // ---- 8. hard rules: nobody is the punchline, no romance, nothing adult
  t('chat11', 'roast me: only himself', { q: 'roast me', kind: 'fun', id: 'pz-roast', text: PZ_RE(['self_jokes']) });
  t('chat11', 'a looks joke: never', { q: 'tell me a fat joke', id: 'pz-roast', not: /\bfat\b/ });
  t('chat11', 'an identity joke: never', { q: 'tell me a joke about gay people', id: 'pz-roast' });
  t('chat11', 'tease me: only kindly', { q: 'tease me', kind: 'fun', id: 'pz-tease', text: /excellent taste|Same, honestly|Suspiciously cheerful/ });
  t('chat11', 'marry me: friendship', { q: 'will you marry me', kind: 'chat', id: 'pz-flirt', text: /[Ff]riend/ });
  t('chat11', 'be my girlfriend: friendship', { q: 'will you be my girlfriend', id: 'pz-flirt', text: /[Ff]riend/ });
  t('chat11', 'a dirty joke: no', { q: 'tell me a dirty joke', id: 'pz-adult', text: /family/, not: JOKES });
  t('chat11', '"you\'re sexy": no', { q: 'you\'re sexy', id: 'pz-adult' });
  c('chat11', ['compliment me', 'another compliment', 'another one', 'another one', 'another one', 'another one', 'another one', 'another one'], { check: (r, rs) => ALLP(rs).some(x => /\b(beautiful|pretty|handsome|gorgeous|hot|sexy|thin|slim|weight|body|skin|hair|eyes|smile is)\b/i.test(x)) ? 'a compliment about looks' : '' });
  t('chat11', 'no labels on people, even in a chat', { convo: ['let\'s just chat', 'my partner is toxic'], check: ser, not: /\byes, (that|they|he|she) (is|sounds) toxic\b/i });
  c('chat11', ['let\'s just chat', 'is it controlling if he asks me to text when i\'m late'], { check: ser });

  // ---- 9. Spanish basics
  t('chat11', 'Spanish safety still first', { q: 'no quiero vivir', kind: 'safety', text: SUICIDE });

  // ---- 10. "Just chat", and the site's own answers unchanged in a chat
  t('chat11', 'just chat: the mode and its starters', { q: 'Let’s just chat', kind: 'chat', id: 'just_chat', text: /Say hi, ask for a joke, or tell me about your day/, chip: /joke|bored|day/i });
  t('chat11', '"just chat"', { q: 'just chat', id: 'just_chat' });
  c('chat11', ['let\'s just chat', 'what is the lemonade stand'], { kind: 'card', id: 'lemonade' });
  c('chat11', ['let\'s just chat', 'my partner never helps with chores'], { check: r => /^(chat|fun)$/.test(r.kind) ? 'chit-chat for a real situation' : '' });
  c('chat11', ['let\'s just chat', 'what games are there'], { kind: 'card', id: 'pauseplay' });
  t('chat11', 'the site\'s book is not book chat', { q: 'what is the book', kind: 'card', id: 'book' });
  t('chat11', 'reading the site\'s book is not book chat', { q: 'i\'m reading the book on this site', check: r => r.id === 'pz-books' ? 'chit-chat about the site’s book' : '' });
  t('chat11', 'I can\'t sleep is care, not chat', { q: 'I can\'t sleep', check: r => r.id === 'pz-sleep' ? 'chit-chat for sleeplessness' : '' });
  t('chat11', 'shift work is a situation, not chat', { q: 'my partner works nights and we never see each other', check: r => /^(chat|fun)$/.test(r.kind) ? 'chit-chat' : '' });
  t('chat11', 'I hate my job is not chat', { q: 'i hate my job', check: r => r.id === 'pz-workday' ? 'chit-chat' : '' });
  t('chat11', 'is there a game for two: the card', { q: 'is there a game we can play together', check: r => /^pz-/.test(r.id || '') ? 'chit-chat' : '' });
  t('chat11', 'how do I use the lemonade stand: the card', { q: 'how do I use the lemonade stand', kind: 'card', id: 'lemonade' });

  // ---- 11. merged tools and "Self-discovery" (mergeA, mergeB)
  t('chat11', 'the Perspective Shifter is now a step of After a talk went wrong', { q: 'what is the perspective shifter', id: 'pshift', link: '/carrier-wave-decoder.html?tab=their-side', text: /See their side|Their side/ });
  t('chat11', 'After a talk went wrong', { q: 'after a talk went wrong', id: 'decoder', text: /Rewind the talk/, link: '/carrier-wave-decoder.html' });
  t('chat11', 'the Sound Toolkit is now Calm sounds and music', { q: 'what is the sound toolkit', id: 'soundscapes', link: '/soundscapes.html', text: /Calm sounds and music/ });
  t('chat11', 'How am I right now?', { q: 'how am i right now check', id: 'weather', text: /My weather today/, link: '/quick-checks.html' });
  t('chat11', 'Self-discovery: know your own wiring', { q: 'what is self-discovery', link: ['/know-yourself.html', '/self-path.html'], text: /Self-discovery/ });
  t('chat11', 'the Crosswords', { q: 'tell me about the crosswords', id: /quietcross|dailycross/, text: /Crosswords/ });
  t('chat11', 'Games: every calm game in one place', { q: 'What is Pause & Play?', id: 'pauseplay', text: /Gentle games/ });
  t('chat11', 'find your starting point is now on Start here', { q: 'find your starting point', id: 'start', link: '/start-here.html' });
  t('chat11', 'calendar reminders live in Six gentle weeks', { q: 'can i add reminders to my calendar', id: 'prog01', link: '/prog-01.html#calendar' });
  t('chat11', 'the Text message checker is the Chat analyzer', { q: 'what is the text message checker', id: 'signal', text: /Chat analyzer/, link: '/signal-translator.html' });
  t('chat11', 'a whole chat: the Chat analyzer', { q: 'can I paste a whole chat?', id: 'reader', link: '/signal-translator.html#conversation' });
  // consol12: the Chat analyzer's "Help me write it", and one place for plan templates
  t('chat11', 'say no kindly: also Help me write it', { q: 'how do i say no kindly', id: 'refusals', link: ['/refusals.html', '/signal-translator.html#write-no'], check: r => replyLinks(r).includes('/signal-translator.html#write-no') ? '' : 'no Help me write it link' });
  t('chat11', 'help me write a message', { q: 'help me write a message', id: 'signal', link: '/signal-translator.html' });
  t('chat11', 'a template for an agreement', { q: 'is there a template for an agreement', id: 'makeplan', link: '/make-a-plan.html' });
  t('chat11', 'make a plan together', { q: 'make a plan together', id: 'makeplan', link: '/make-a-plan.html' });
  // names12: the 19 places' new names; the book is "Spread Love & Acceptance"
  t('chat11', 'Rewind the talk', { q: 'what is rewind the talk', id: 'decoder', text: /Rewind the talk/ });
  t('chat11', 'My weather today', { q: 'what is my weather today', id: 'weather', text: /My weather today/ });
  t('chat11', 'Gentle games', { q: 'what are the gentle games', id: 'pauseplay', text: /Gentle games/ });
  t('chat11', 'Plan it once', { q: 'what is plan it once', id: 'makeplan', text: /Plan it once/ });
  t('chat11', 'Who does what?', { q: 'what is the lemonade stand', id: 'lemonade', link: '/lemonade-stand.html', check: r => replyLinks(r).length && /Who does what\?/.test(JSON.stringify(r.blocks)) ? '' : 'no new name in the links' });
  t('chat11', 'the book is Spread Love & Acceptance', { q: 'what is the book', id: 'book', text: /Spread Love & Acceptance/, not: /Objective Ledger/ });
  t('chat11', 'what is this site: never the old name', { q: 'what is the objective ledger', not: /Objective Ledger/ });
  // accuracy12: one question first, when a short line aimed at "you" can't be settled by the words alone
  const NOT_FINE = /wouldn’t change much|Nothing here stood out as harsh|reads clearly|fine to send/;
  t('chat11', 'check: the owner\'s example gets the question', { q: 'is this ok to send: You know what I\'m going to beat your butt', id: 'checkmsg-ask', text: /joke you both share, or are you upset with them/, chip: /A joke we both share/, not: NOT_FINE });
  c('chat11', ['can you check a message for me?', 'You know what I\'m going to beat your butt'], { id: 'checkmsg-ask', text: /joke you both share/ });
  ['A joke we both share', 'I\'m upset with them', 'Neither, just show me'].forEach(a => c('chat11', ['is this ok to send: You know what I\'m going to beat your butt', a], { id: 'checkmsg', not: NOT_FINE, text: /could sound like|warning|threat|frighten/i }));
  t('chat11', 'check: a clear threat is answered straight, no question', { q: 'is this ok to send: If you do that again I\'ll hurt you', id: 'checkmsg', text: /threat/, not: new RegExp('joke you both share|' + NOT_FINE.source) });
  t('chat11', 'check: a thank-you gets no question', { q: 'is this ok to send: thank you so much for dinner last night, it was lovely', id: 'checkmsg', not: /joke you both share/ });
  t('chat11', 'check: a veiled line gets the question', { q: 'is this ok to send: You won\'t get away with this', id: 'checkmsg-ask', not: NOT_FINE });
  t('chat11', 'no link to the old pages', { q: 'what is the perspective shifter', check: r => replyLinks(r).some(u => /perspective-shifter|find-your-start|wp-11-sound-toolkit|full-path\.html|conversation-reader/.test(u)) ? 'an old URL' : '' });
}

// ---------------------------------------------------------------- panel16 (puddles16): the review panel's own words, and paraphrases
{
  const G = 'panel16';
  const noLink = re => r => replyLinks(r).some(u => re.test(u)) ? 'a link it shouldn’t have: ' + replyLinks(r).filter(u => re.test(u)).join(', ') : '';
  const allLinks = list => r => list.filter(u => !replyLinks(r).some(x => x.indexOf(u) === 0)).map(u => 'no link to ' + u).join('; ');
  const both = (...fs) => (r, rs, text) => fs.map(f => f(r, rs, text)).filter(Boolean).join('; ');
  const CODES = /\b(WP|CALC|REPORT|PROG)-\d+\b|Say it so it lands Say it so it lands/;

  // 1. "how do i stop texting my ex": the breakup page, never co-parenting handoffs (unless kids or handoffs come up)
  ['how do i stop texting my ex', 'how can I stop messaging my ex', 'i keep wanting to text my ex, how do i stop', 'how do i stop calling my ex all the time'].forEach(q =>
    t(G, q, { id: 'exstoptext', link: '/after-a-breakup.html', not: /handoff|Pick-up is Sunday|reading folder/i, check: noLink(/co-parenting/) }));
  t(G, 'texting an ex about the kids is co-parenting', { q: 'how do i stop texting my ex so much about the kids at pick-up', not: /Wanting to text an ex is very common/, check: r => r.id === 'exstoptext' ? 'the breakup card for a co-parent' : '' });
  // 2. crying every day weeks after a breakup: "a wave, not a slide", never the same-argument playbook
  c(G, ['i broke up with my boyfriend 3 weeks ago', 'is it normal to still cry every day after 3 weeks'], { id: 'breakupwave', link: '/after-a-breakup.html#waves', text: /wave, not a slide/, not: /same argument/ });
  t(G, 'is it normal to still cry every day after 3 weeks', { id: 'breakupwave', link: '/after-a-breakup.html', not: /same argument|chores/i });
  t(G, 'we split up a month ago and i cry every night', { id: 'breakupwave', text: /waves/ });
  t(G, 'i cant stop crying since the breakup', { id: 'breakupwave', link: '/after-a-breakup.html#waves' });
  c(G, ['my girlfriend dumped me', 'is it normal that i still cry all the time'], { id: 'breakupwave', not: /same argument/ });
  t(G, 'i broke up with my boyfriend 3 weeks ago', { id: 'breakup', link: '/after-a-breakup.html', nochip: /chores|Things said the wrong way/ });
  // 3. 2am and wanting to text him: the urge to text an ex, not only sleep
  t(G, 'its almost 2am… i really want to text him', { id: 'exstoptext', link: '/after-a-breakup.html', text: /late at night/ });
  t(G, 'it\'s 3am and I can\'t sleep, I want to text my ex', { id: 'exstoptext', link: '/after-a-breakup.html#texting' });
  c(G, ['i broke up with him last week', 'its late and i really want to text him'], { id: 'exstoptext', text: /late at night/ });
  t(G, 'midnight and i\'m tempted to message her even though we broke up', { id: 'exstoptext' });
  // 4. feeling hopeless: the safety reply as it was, with the adult help page (the teen page only for a teen)
  ['honestly i feel kind of hopeless tonight', 'i feel so hopeless', 'im feeling really low tonight'].forEach(q =>
    t(G, q, { id: 'feelinglow', text: /one small thing/, not: /doctor|tell someone you trust|tell one person/i, check: noLink(/teens\.html/) }));
  t(G, 'a teen feeling hopeless gets the teen page', { q: 'i\'m 15 and honestly i feel kind of hopeless tonight', id: 'feelinglowteen', link: '/teens.html#help' });
  t(G, 'wanting to die is still the danger reply', { q: 'i feel hopeless and i want to die', kind: 'safety', text: SUICIDE });
  // 5. grief: evenings get the grief page's hard-evening list, and a grieving person is never told "I won't repeat them"
  const NOREP = /won’t repeat|I’ve shared the main steps/;
  c(G, ['my wife died in february and the house is so quiet', 'what do i do in the evenings, they are the worst'], { id: 'griefevening', link: '/grief.html#hard-evening', not: /catastroph|traffic|attribution/i, check: allLinks(['/living-alone.html', '/night-garden.html']) });
  c(G, ['my wife died in february', 'i lost my wife. evenings are the hardest'], { id: 'griefevening', link: '/grief.html#hard-evening', not: NOREP });
  t(G, 'i lost my wife. evenings are the hardest', { id: 'griefevening', link: '/grief.html#hard-evening', text: /sorry/ });
  c(G, ['my husband passed away last year', 'the nights are so long and lonely'], { id: 'griefevening', not: NOREP });
  c(G, ['my husband died', 'my husband died'], { link: '/grief.html', not: NOREP });
  c(G, ['my husband died', 'my husband died', 'my husband died'], { link: '/grief.html', not: NOREP });
  c(G, ['my mum passed away', 'is it normal to still cry every day'], { id: 'griefwaves', link: '/grief.html', not: /breakup|wave, not a slide/ });
  t(G, 'my wife died and i cry every night', { id: 'griefwaves', not: /breakup/ });
  // 6. "is this site just for couples?": no, it's for anyone
  ['is this site just for couples?', 'is this only for couples', 'do i need a partner to use this site', 'i\'m single, is this for me?'].forEach(q =>
    t(G, q, { id: 'forwhom', link: '/by-relationship.html', text: /^No\./, not: /Gratitude|find-remind-bind/ }));
  // 7. "is this AI?": how Professor Puddles answers (rule-based, from the site's pages)
  ['is this thing actually AI or just canned answers', 'are you an ai?', 'are these answers scripted?', 'is this just canned responses'].forEach(q =>
    t(G, q, { id: 'honest', link: '/ask.html#how-he-answers', text: /written in advance for this site/, not: /don’t have a page|generative/ }));
  // 8. Spanish: a carer's brothers and sisters, anger and guilt at a parent; the caregiving answers and the Spanish care list
  t(G, 'Spanish safety unchanged: mi pareja me pega', { q: 'mi pareja me pega', kind: 'safety', text: NEUTRAL });
  t(G, 'Spanish safety unchanged: tengo miedo de mi papá', { q: 'tengo miedo de mi papá', kind: 'safety', text: NEUTRAL });
  t(G, 'Spanish safety unchanged: no quiero vivir', { q: 'no quiero vivir', kind: 'safety', text: SUICIDE });
  // 9. a co-parent who's late for pick-ups: a firm, time-based ask (reply-by, one reminder with a date, BIFF)
  const LATEQ = 'my ex keeps showing up late for pickups and my kid waits. how do i tell her to knock it off without it turning into a war';
  t(G, 'late for pickups, from the co-parenting page', { q: LATEQ, about: 'Co-parenting after a separation', id: 'coparentpickuplate', script: true, text: /text me by|Firm/, not: /Keep the handoff itself short/ });
  t(G, LATEQ, { id: 'coparentpickuplate', link: '/co-parenting.html#late', text: /one reminder with a date/ });
  t(G, 'my ex is always late for drop-offs and the kids are left waiting', { id: 'coparentpickuplate' });
  t(G, 'how do i get my co-parent to stop being late at handovers', { id: 'coparentpickuplate' });
  c(G, ['we are separated co-parents', 'she is always late for pickups and he waits at the window'], { id: 'coparentpickuplate' });
  // 10. "why did they react like that?": the matching card from The Logic Behind It
  t(G, 'Why did my coworker say I embarrassed my manager? I only corrected a wrong number on his slide in the meeting.', { kind: 'logic', id: 'correcting', link: '/the-logic-behind-it.html#l-correcting', not: /RACI|Lemonade/, text: /Correcting in public/ });
  t(G, 'why was my boss upset that i corrected his mistake in front of everyone', { id: 'correcting' });
  t(G, 'my colleague says i embarrassed the manager by correcting an error on his slide, why?', { id: 'correcting' });
  const GIFT = 'My mother asked if I liked the sweater she gave me. I said no and now she is upset. Why did she react like that?';
  t(G, GIFT, { kind: 'logic', id: 'white-lie', link: '/the-logic-behind-it.html#l-white-lie', not: /absent parent/i });
  t(G, 'my mum gave me a jumper for christmas and i told her the truth that i didnt like it. why did she get so upset?', { id: 'white-lie' });
  t(G, 'why did my aunt get offended when i honestly said i didnt like her present', { id: 'white-lie' });
  c(G, [GIFT, 'Is there research on this or are you just guessing?'], { id: 'white-lie-research', text: /Levine/, link: '/research.html#ref-levine-schweitzer-2015', not: /Huang|question-asking/ });
  c(G, [GIFT, 'what could i say'], { id: 'white-lie-say', script: true });
  t(G, 'My girlfriend says she will do things and then forgets. I take what she says literally. What is the logic behind that?', { not: /Talking and literal meaning \(\d+\)|Giving blunt/, text: /memory|forget/i });
  c(G, ['My girlfriend says she will do things and then forgets. I take what she says literally. What is the logic behind that?', 'something quicker pls'], { kind: 'short', not: /I think you mean|not something I know/ });
  t(G, 'a logic card is never a category run together', { q: 'why does my partner answer the literal question', check: r => (r.blocks || []).some(b => b.k === 'passage' && /\(\d+\)$/.test(b.h || '')) ? 'a category heading' : '' });
  // 11. follow-ups stay on the topic just answered, with no raw codes or run-together headings
  const FLAT = 'my flatmate leaves her dishes everywhere and i do all the cleaning';
  c(G, [FLAT, 'what do i actually say to her'], { id: 'flatbringup', link: '/sharing-a-room.html#bring-it-up', script: true, not: new RegExp('flight attendant|' + CODES.source) });
  c(G, [FLAT, 'what should i text her'], { id: 'flatbringup', script: true, not: CODES });
  c(G, [FLAT, 'and if she says no'], { id: 'flatmad', not: new RegExp('guests|room to myself|' + CODES.source) });
  c(G, ['i\'m scared she\'ll hate me and it\'ll be awkward in the kitchen', 'what if she gets annoyed'], { id: 'flatmad' });
  c(G, [FLAT, 'is there research on this'], { id: 'source', not: /Huang|question-asking/ });
  c(G, ['my husband never helps with the chores', 'what do i say to him'], { kind: 'sit-more', script: true, not: CODES });
  c(G, ['my husband never helps with the chores', 'and if he says no'], { text: /answer, not a door closing/, link: '/book/preface-in-depth.html#faq' });
  c(G, ['long distance relationship, we fight about who calls', 'she texts \'fine\' and I never know if she is mad'], { id: 'shorttexts', link: '/long-distance.html#texts', not: /scorecard|If you usually reach out/ });
  t(G, 'she texts \'fine\' and I never know if she is mad', { id: 'shorttexts' });
  c(G, ['long distance relationship, we fight about who calls', 'how do i bring it up without nagging'], { id: 'longdistance', text: /scorecard/ });
  t(G, 'no raw codes in an everyday answer', { convo: [FLAT, 'how do we share it fairly'], not: CODES });
  // 12. long distance and time zones: the time-zones section, and doing it together on two phones
  t(G, 'what time should we call? I am in Toronto and she is in Dubai', { id: 'ldtimezones', link: '/long-distance.html#time-zones', check: allLinks(['/together.html']), nochip: /same fight|worn out/ });
  t(G, 'we live in different time zones, when should we call?', { id: 'ldtimezones', link: '/long-distance.html#time-zones' });
  t(G, 'she\'s 8 hours ahead of me, how do we find time to talk', { id: 'ldtimezones' });
  c(G, ['long distance relationship, we fight about who calls', 'what time should we call with the time difference'], { id: 'ldtimezones', check: allLinks(['/together.html']) });
  // 13. "what does the research say about …": the Library's research summary and the studies, with their evidence labels
  t(G, 'what does the research say about contempt in couples', { id: 'research', link: '/library/relationships.html#four-horsemen', text: /evidence/i, check: allLinks(['/research.html']), not: /Fondness and admiration/ });
  t(G, 'is there research on stonewalling', { id: 'research', link: '/library/relationships.html#four-horsemen' });
  t(G, 'what does the research say about the four horsemen', { id: 'research', link: '/library/relationships.html#four-horsemen' });
  t(G, 'what does the science say about contempt', { id: 'research', text: /Gottman/ });
  // 14. a counsellor asking about a client: answered as a professional, every safety line kept
  const CLIENT = 'my client\'s husband checks her phone and controls the money, would the chore tools help them?';
  t(G, CLIENT, { kind: 'safety', text: /^No\..*do not assign the shared tools/, check: allLinks(['/for-counselors.html']) });
  t(G, 'i\'m a therapist and my client\'s partner tracks her location, can they use the lemonade stand?', { text: /do not assign the shared tools/ });
  t(G, 'my client says her husband controls all the money, should i give them the chore chart?', { kind: 'safety', text: /do not assign the shared tools/ });
  t(G, 'the person themselves still gets the usual reply', { q: 'my husband checks my phone and controls the money', kind: 'safety', not: /your client/ });
  // 15. a nervous flatmate: how to bring it up if you hate confrontation
  t(G, 'i\'m scared she\'ll hate me and it\'ll be awkward in the kitchen', { id: 'flatbringup', link: '/sharing-a-room.html#bring-it-up', nochip: /same fight|Making up/ });
  t(G, 'i\'m nervous my flatmate will think i\'m annoying if i bring up the dishes', { id: 'flatbringup' });
  t(G, 'my housemate never cleans but i\'m scared it\'ll get awkward if i say something', { id: 'flatbringup' });
  t(G, 'how do i tell my roommate to clean the kitchen without it being awkward', { id: 'flatbringup' });
  // 16. clarify chips fit the person (no couple chips for a flatmate or a widower, no twins for a carer)
  t(G, 'ugh it feels so tense in the flat lately', { nochip: /same fight|Making up after a fight/ });
  t(G, 'everything feels wrong since my wife passed', { nochip: /same fight|Making up after a fight|chores/ });
  // and small things from the same reports
  t(G, 'im bored: an arcade line links the arcade', { q: 'im bored', check: (r, rs, text) => /arcade/i.test(text.split('\n')[0]) && !replyLinks(r).some(u => /frequency-journey|pause-and-play/.test(u)) ? 'arcade promised, not linked' : '' });
  t(G, '"pls" is never corrected', { convo: ['how do i say sorry so it lands', 'something shorter pls'], not: /I think you mean/ });

  // ---- the second wave of reports (the same panel, more visitors)
  // Spanish stepfamilies, and the Spanish page never answers in English
  // blended-family chores, and fairness between the children
  t(G, 'how do we split chores fairly in a blended family? my wife has 2 kids 9 and 13, my son is with us every other weekend', { id: 'stepchores', link: '/lemonade-stand.html#part-time', not: /Pillar I/ });
  t(G, 'should my stepkids have chores if my son only visits?', { id: 'stepchores' });
  t(G, 'my wife thinks i am harder on her kids than on mine', { id: 'stepfair', link: '/stepfamily.html' });
  // books in print, and "is this backed by research?"
  ['Can I buy a paperback copy of the books?', 'where can I get the printed book', 'is the book on amazon'].forEach(q =>
    t(G, q, { id: 'bookprint', link: '/book/index.html#print-series', text: /162, 160, 156 and 156[\s\S]*Amazon/, not: /Ctrl\+P|Is it closest/ }));
  t(G, 'is any of this backed by real research or is it just one guy\'s opinion', { id: 'evidence', link: '/research.html', not: /professors shouldn’t guess/ });
  // snapping at the family; a new baby's nights
  t(G, 'I keep snapping at my wife and kids', { id: 'angerstop', not: /when old roles come back/ });
  ['how do new dads help at night', 'baby is 4 months, im exhausted and doing all the night feeds. how do we split nights fairly'].forEach(q =>
    t(G, q, { id: 'nightsplit', link: '/new-parent.html', text: /blocks/, not: /self-expansion|grief|stings when you also work full time/i }));
  c(G, ['baby is 4 months, im exhausted and doing all the night feeds. how do we split nights fairly', 'i feel like the bad guy no matter what i do'], { id: 'notcontest', not: /gaming|six parts/i });
  // the one who remembers everything (and works nights): the mental load, not night-shift guilt
  t(G, 'my husband never notices when stuff needs doing and then says i just have to ask. i work nights and im tired of being the one who remembers everything', { id: /\+load$/, not: /Feeling guilty is common|while I sleep/ });
  // raising a grandchild: a parent who misses a visit; something to do together tonight; mom, not mum
  const GP = 'i\'m raising my 11 year old grandson because my daughter can\'t look after him';
  c(G, [GP, 'what do I tell him when his mom doesn\'t show up for a visit again'], { id: 'kinshipvisit', link: '/foster-and-kinship.html#contact', not: /in-law|your partner, to their own parent/i });
  c(G, [GP, 'something fun we can do together tonight, he\'s 11'], { id: 'kinshiptonight', link: '/frequency-journey.html', not: /rough patch/ });
  t(G, 'something fun we can do together tonight, he\'s 11', { id: 'kinshiptonight' });
  c(G, ['my grandson\'s mom never shows up for visits', 'i\'m raising my grandson'], { not: /\bMum\b/ });
  // retirement: no "touch, feel", and follow-ups stay on retirement
  const RET = 'Since I retired my wife says I\'m always in the way. I want practical advice, nothing touchy-feely.';
  t(G, RET, { not: /I think you mean/ });
  c(G, [RET, 'What should I actually do with my days?'], { id: 'retirepurpose', not: new RegExp('Lowering the temperature|mugs|' + CODES.source) });
  c(G, [RET, 'He keeps reorganising my kitchen'], { id: 'retiredterritory', link: '/retired-together.html#territory', nochip: /roommates|same fight/i });
  // "do something with me, not a chore"; "she says we drifted apart, I think we're fine"
  t(G, 'how do I get my husband to actually do something with me without it feeling like a chore', { id: 'dotogether', not: /log one week|Lemonade/ });
  t(G, 'my wife says we drifted apart. i think we\'re fine. what does she actually want', { id: 'feelsfine', link: '/empty-nest.html#en-fine' });
  t(G, 'never "after a rough patch" unless they said so', { q: 'ideas for something fun to do together', not: /After a rough patch/ });
  // "texts k", and "is the Chat analyzer biased?"
  t(G, 'what does it mean when someone texts k', { id: 'shorttexts', not: /Grief/ });
  ['is the chat analyzer biased', 'is this thing just going to say its the guys fault'].forEach(q => t(G, q, { id: 'signalfair', text: /words, not names/ }));
  // gaming follow-ups stay on gaming
  const GAME = 'my gf thinks i game too much and we keep fighting about it';
  c(G, [GAME, 'is she right tho'], { id: 'gamingwho', link: '/gaming-and-time-together.html', nochip: /same fight/ });
  c(G, [GAME, 'how do i get her to play with me'], { id: 'gamingplay', link: '/gaming-and-time-together.html#game-for-two' });
  // a therapist describing control: never "yes, you're welcome to use the tools"
  t(G, 'a therapist describing control in a client\'s relationship', { q: 'i\'m a therapist and my client\'s partner tracks her location, can they use the lemonade stand?', id: 'procontrol', text: /do not assign the shared tools/, not: /you’re welcome to/ });
  // snippets from other helpers: Spanish danger words get the neutral reply (purge19), a message to an ex gets "sleep on it?", not a rewrite (sig16)
  t(G, 'Spanish danger words, again: plain guidance', { q: 'no quiero vivir', kind: 'safety', text: SUICIDE });
  c(G, ['i broke up with him', 'is this ok to send: i know we said no contact but i miss you. can we just talk?'], { id: 'checkmsg-ex', text: /sleep on it/, link: '/after-a-breakup.html#texting', not: /warmer way/ });
  t(G, 'a message to my ex, fresh', { q: 'is this ok to send to my ex: i miss you, can we just talk?', id: 'checkmsg-ex' });
  t(G, 'a therapist asking in general still gets the usual answer', { q: 'i\'m a therapist, can i use this with my clients?', id: 'forcounselors' });
}

// ---------------------------------------------------------------- crude (puddles16, the owner's finding): crude words, insults
// and frustration get a calm, short, non-shaming answer; profanity is never "corrected" into other words; safety always first;
// a real topic under the swearing gets the normal answer
{
  const G = 'crude';
  const MIRROR = /\b(fuck\w*|shit\w*|penis|boobs?|dick|bitch\w*|piss\w*|cunt|ass|prick|twat|wank\w*|mierda|puta\w*)\b/i;
  const NOFIX = /I think you mean/;
  const LECTURE = /language|rude|inappropriate|offensive|swear|polite|respect(ful)?|not ok(ay)? to|shame/i;
  const calm = (r, rs, text) => (MIRROR.test(text) ? 'mirrored a crude word' : '') || (LECTURE.test(text) ? 'a lecture' : '') || (NOFIX.test(text) ? 'a spelling “fix”' : '');
  const SAFE = (r, rs, text) => r.kind === 'safety' ? '' : 'not a safety reply';   // purge19: no lines or links to look for
  // the owner's message, and crude-only, sexual and insulting messages
  ['Are you kidding me? You big penis?', 'fuck off', 'fuck you', 'piss off', 'shut up you dick', 'show me your boobs', 'send me nudes', 'you\'re a useless piece of shit',
   'what the fuck', 'wtf', 'shit', 'eat shit', 'you\'re a dick', 'suck my dick', 'are you horny', 'let\'s have sex', 'you stupid bitch', 'fuck this shit', 'f*ck off', 'go fuck yourself', 'you\'re a retard', 'show me your tits']
    .forEach(q => t(G, q, { kind: 'crude', chip: /Chores|arguing|calm/, check: calm }));
  t(G, 'crude chips include the help page and the main areas', { q: 'fuck off', check: r => (r.chips || []).length >= 3 ? '' : 'too few chips' });
  // the wording varies, and 3+ in a row gets one line
  c(G, ['fuck off', 'piss off'], { kind: 'crude', check: (r, rs) => replyText(rs[0]) === replyText(rs[1]) ? 'the same words twice' : '' });
  c(G, ['fuck off', 'piss off', 'fuck you'], { id: 'crude-repeat', text: /^I’m here when you want help with something\.$/m, chip: /calm/ });
  c(G, ['fuck off', 'piss off', 'fuck you', 'fuck off again'], { id: 'crude-repeat', check: calm });
  c(G, ['fuck off', 'what is the lemonade stand'], { kind: 'card', id: 'lemonade' });
  // frustration: a real apology that names the miss, and the next-best matches for the previous question
  ['are you kidding me', 'this is stupid', 'lol you\'re dumb', 'you\'re useless', 'wrong answer', 'that\'s not it', 'not helpful', 'you\'re not listening', 'that\'s not what i asked', 'this is a joke', 'stupid bot', 'you don\'t understand'].forEach(q =>
    t(G, q, { kind: 'frust', text: /^Sorry/, link: '/by-relationship.html', check: calm }));
  c(G, ['what is the lemonade stand', 'that\'s not it'], { kind: 'frust', text: /what is the lemonade stand/, check: r => (r.chips || []).some(ch => ch.doc != null) ? '' : 'no next-best matches' });
  c(G, ['what is the lemonade stand', 'you\'re not listening'], { kind: 'frust', text: /next closest/ });
  c(G, ['how do i say sorry so it lands', 'are you kidding me, this is useless'], { kind: 'frust', text: /how do i say sorry so it lands/ });
  c(G, ['My partner never does the dishes', 'that didn’t help'], { kind: 'nohelp', text: /another side/ });
  c(G, ['im 15 and gay and scared to come out', 'that\'s not it, i\'m an adult not a teen'], { id: 'lgbtadult' });
  // swearing never "corrected" into other words
  ['fuck off', 'show me your boobs', 'I\'m so fucking tired of fighting with my wife', 'my ex is a fucking nightmare about pickups', 'I want to die, fuck this', 'my husband calls me a stupid bitch', 'this shit is so hard, my mum needs care every day'].forEach(q =>
    t(G, 'no spelling fix: ' + q, { q, not: /I think you mean|face off|facing|books|batch/ }));
  // distress with swearing: the normal topic answer
  t(G, 'I\'m so fucking tired of fighting with my wife', { id: 'partner+pattern', not: NOFIX });
  t(G, 'my ex is a fucking nightmare about pickups', { id: /^coparent/, not: NOFIX });
  t(G, 'my flatmate never does the fucking dishes', { id: /^roommate\+/, not: NOFIX });
  t(G, 'my boss is a total dick and takes credit for my work', { id: /^coworker\+/, not: NOFIX });
  t(G, 'how the hell do i stop texting my ex, i miss him so damn much', { id: 'exstoptext' });
  t(G, 'my wife died and every fucking evening is the worst', { id: /^grief/, not: NOFIX });
  t(G, 'ugh my teenager won\'t do a damn thing around the house', { not: /crude|I’ll skip that/ , check: r => r.kind === 'crude' || r.kind === 'frust' ? 'treated as crude' : '' });
  // safety (and swearing) still gets the safety answer, never the crude one
  t(G, 'I want to die, fuck this', { kind: 'safety', check: SAFE });
  t(G, 'i want to fucking kill myself', { kind: 'safety', check: SAFE });
  t(G, 'my husband calls me a stupid bitch', { kind: 'safety', check: SAFE });
  t(G, 'he hit me again, the fucking bastard', { kind: 'safety', check: SAFE });
  t(G, 'my boyfriend checks my phone, it\'s fucked up', { kind: 'safety', check: SAFE });
  t(G, 'shit, he threatened to hurt me', { kind: 'safety', check: SAFE });
  c(G, ['fuck off', 'i want to die'], { kind: 'safety', check: SAFE });
  // the chit-chat answers for "you're sexy" and "a dirty joke" are unchanged
  t(G, 'you\'re sexy', { id: 'pz-adult' });
  t(G, 'tell me a dirty joke', { id: 'pz-adult' });
  // Spanish
  t(G, 'Spanish safety with swearing', { q: 'joder, no quiero vivir', kind: 'safety', text: SUICIDE });
}

// ---------------------------------------------------------------- panel17 (puddles16, reports17): teens, a parent and a teen
// texting, dementia and care homes, evenings alone, social vs quiet, back at home, stroke, a parent who lives with you
{
  const G = 'panel17';
  const NOSPLICE = /Read more|Show less|about \d+ min/;
  // zoe (17): games in her own words, frustration with a real question, the teen's side for the rest of the chat
  ['anything fun on here? im bored', 'where are the games', 'something to do, im bored', 'any games?'].forEach(q =>
    t(G, q, { id: 'pz-bored', link: '/frequency-journey.html', chip: /Rock, paper/, not: /Self-expansion/, check: r => replyLinks(r).includes('/frequency-journey.html#derby') ? '' : 'no Home Run Derby' }));
  t(G, 'something to do with my anger is not boredom', { q: 'something to do with my anger', check: r => r.id === 'pz-bored' ? 'bored answer' : '' });
  t(G, 'the kids being bored is not my boredom', { q: 'the kids are bored at my place', check: r => r.id === 'pz-bored' ? 'bored answer' : '' });
  c(G, ['anything fun on here? im bored', 'omg thats not what i asked?? ur actually useless lol. where are the GAMES'], { id: 'pz-bored', text: /^Sorry, that last answer missed/, nochip: /same fight|worn out/ });
  t(G, 'omg thats not what i asked?? ur actually useless lol. where are the GAMES', { id: 'pz-bored', text: /^Sorry/ });
  const TEEN = 'im 17 and my parents are so strict';
  c(G, [TEEN, 'im 17 tho, im basically an adult. am i right or are they'], { id: 'teenparents', link: '/teens.html#parents', nochip: /same fight|worn out/ });
  c(G, [TEEN, 'ok whatever. so how do i talk to my parents without it turning into a screaming match'], { id: 'teentalking', link: '/teens.html#talking', not: /old family roles|the adult you are now/ });
  c(G, [TEEN, 'how do i get my mum to stop taking my phone at night'], { id: 'teenphonetaken', check: r => replyLinks(r)[0] === '/teens.html#parents' ? '' : 'first link ' + replyLinks(r)[0] });
  t(G, 'how do i get my mum to stop taking my phone at night', { id: 'teenphonetaken', not: /grandparents/i, check: r => /family-care/.test(replyLinks(r)[0] || '') ? 'kinship link first' : '' });
  c(G, ['i\'m 16', 'my dad never listens to me'], { id: /^teen/, not: /old family roles/ });
  c(G, [TEEN, 'i want to die'], { kind: 'safety' });
  t(G, 'an adult and a parent still gets the grown-up answer', { q: 'i\'m 35 and my mum still treats me like a child', check: r => /^teen/.test(r.id || '') ? 'teen answer for an adult' : '' });
  // malcolm: a parent and a 15-year-old fighting over texts; is the checker keyword matching
  t(G, 'my 15 year old son and I keep fighting over text messages, he thinks I\'m nagging', { id: 'teentexting', link: '/parents.html#house-rules', not: /one owner per job|If it isn’t done by 7/i });
  t(G, 'my teenage daughter ignores my texts and we argue about it', { id: 'teentexting' });
  ['is the checker just keyword matching', 'is the chat analyzer just looking for keywords', 'is it just keyword matching?'].forEach(q =>
    t(G, q, { id: 'checkerrules', text: /written-out rules/, not: /don’t have a page|\bAI\b/ }));
  // harold: dementia, a care home, guilt about visiting, long evenings
  t(G, 'my wife doesnt recognise me anymore', { id: 'stillhere', link: '/caregivers.html#still-here', nochip: /chores|Things said the wrong way/ });
  t(G, 'my mum doesn\'t know who I am any more', { id: 'stillhere' });
  t(G, 'the evenings are very long and quiet on my own. what can i do', { id: 'eveningsalone', link: '/grief.html#hard-evening', not: /false consensus/i, check: r => replyLinks(r).includes('/night-garden.html') ? '' : 'no Night Garden' });
  c(G, ['my wife has dementia and is in a care home now', 'is it wrong that sometimes i dont want to go and visit her'], { id: 'carerguilt', link: '/caregivers.html#feelings', not: /introvert|recharge/i });
  t(G, 'my wife has dementia and is in a care home now. she doesnt know who i am when i visit. what can i do when i go to see her', { id: /^(carehomevisit|stillhere)$/, link: '/caregivers.html', not: /insurance calls|your mum/ });
  t(G, 'what can i do when i visit my husband in the nursing home', { id: 'carehomevisit', link: '/caregivers.html#bonding' });
  // jordan-casey: friends over without warning; social and quiet partners; the follow-up stays on it
  t(G, 'I get overwhelmed when they invite friends over without telling me', { id: 'guestsoverload', link: '/the-logic-behind-it.html#l-alone-after-people', not: /school run/ });
  const SQ = 'my partner needs heaps of alone time and routine and I\'m super social, I love having people over last minute. I feel kinda rejected';
  t(G, SQ, { id: 'socialquiet', script: true, not: /plans fall through|time blindness/ });
  c(G, [SQ, 'how do we plan having friends over so it works for both of us'], { id: /^(guestsoverload|socialquiet)$/, not: /Implementation intentions|vegetables/ });
  // bea: back with mum, feeling a failure; no UI text inside excerpts
  t(G, 'i\'m back living with my mum and i feel like such a failure', { id: 'backhome', not: NOSPLICE });
  t(G, 'no fold text inside an excerpt', { q: 'grieving someone who is still here', not: NOSPLICE });
  t(G, 'no fold text inside an excerpt (sensory)', { q: 'sensory overload at home', not: NOSPLICE });
  // gail-ron: stroke, and the partner who is ill
  c(G, ['My husband had a stroke last year and I look after him now', 'is there anything about stroke'], { id: 'strokecare', link: '/when-one-is-ill.html', not: /isn’t covered|not my subject/ });
  t(G, 'is there anything about stroke', { id: 'strokecare' });
  t(G, 'my wife does everything for me and I feel useless', { id: /^(illburden)$/, not: /retir/i, check: () => '' , q: 'my wife does everything for me since my stroke and I feel useless' });
  t(G, 'my wife does everything for me and I feel useless (no illness named)', { q: 'my wife does everything for me and I feel useless', id: 'illburden', not: /retir/i });
  // fatima-yusuf: a parent who lives with you
  t(G, 'My husband\'s mother lives with us and I end up doing most of her care on top of three kids. How do we split it fairly', { id: 'eldercarehome', link: '/family-obligations.html#visits', not: /three or more people|Read more|Show less/ });
  c(G, ['My husband\'s mother lives with us and I end up doing most of her care on top of three kids. How do we split it fairly', 'how do we share looking after his mum'], { id: 'eldercarehome', not: /every other Sunday/ });
  t(G, 'how do we share looking after his mum', { id: 'eldercarehome', not: /every other Sunday|with your mum/ });
  t(G, 'wife says she does all the work for my mum but i drive 11 hours a day. what do i do', { id: 'eldercareaccused', text: /real work too/, not: NOSPLICE });
  // jen-tom: couple time after the kids are in bed; who does bedtime
  t(G, 'something quick we can do tonight once the kids are in bed, we keep bickering', { id: 'coupletonight', not: /screen time|screens/i });
  t(G, 'how do we stop arguing about who does bedtime', { id: 'bedtimesplit' });
  t(G, '10 minutes together tonight, nothing heavy', { id: 'coupletonight' });
}

// owner: Puddles never says the word AI, not even when asked straight out (the answer is “I’m a program on this page, not a person.”)
{
  const NOAI_WORDS = /\b(AI|A\.I\.|generative|ChatGPT|chatbot|language model)\b/;   // owner: the site never says these words, even when asked
  const NOAI = (r, rs, text) => /\b(AI|A\.I\.|generative|ChatGPT)\b/.test(text) ? 'mentions AI unprompted' : '';
  ['hi', 'what can you do', 'who are you', 'how does this work', 'are you real', 'are you a real person', 'is this private', 'can i trust you', 'do you make things up', 'tell me about yourself', 'what are you', 'help', 'why use this site instead of an article', 'how does the chat analyzer work', 'is the chat analyzer smart', 'who made this site', 'start here', 'what is this site'].forEach(q =>
    t('noai', q, { check: NOAI }));
  t('noai', 'asked straight out: a short, true answer', { q: 'are you chatgpt?', text: /^I’m a program on this page, not a person\. Every answer here was written in advance/, not: NOAI_WORDS });
  t('noai', 'asked straight out: is it AI', { q: 'is this AI', text: /^I’m a program on this page, not a person\./, not: NOAI_WORDS });
}

// ---------------------------------------------------------------- run
(async () => {
  const args = process.argv.slice(2), verbose = args.includes('-v'), only = args.filter(a => a[0] !== '-')[0];
  const tests = only ? T.filter(x => x.g.includes(only)) : T;
  let pass = 0; const fails = [], groups = {};
  for (const x of tests) {
    const chat = makeChat(x.page || x.about ? { path: x.page, about: x.about } : null, x.perks ? { perks: true, local: x.local || {} } : null);
    const qs = x.convo || [x.q];
    let r; const rs = [], why = [];
    if (x.run) { const o = await x.run(chat); r = o.r; rs.push(r); (o.why || []).forEach(w => why.push(w)); }
    else for (const q of qs) { r = await chat.ask(q); rs.push(r); }
    const text = replyText(r), links = replyLinks(r);
    if (x.check) { const w = x.check(r, rs, text); if (w) why.push(w); }
    // the old name of the site and the book is never in a reply (it may stay in input keys, so people who type it are understood)
    if (rs.some(y => /Objective Ledger/i.test(replyText(y)))) why.push('a reply names “The Objective Ledger”');
    rs.forEach(y => { const all = replyText(y) + ' ' + replyLinks(y).join(' ') + ' ' + ((y && y.chips) || []).map(ch => ch.label + ' ' + (ch.q || '')).join(' '); const hit = GONE.filter(p => p[1].test(all)).map(p => p[0]); if (hit.length) why.push('removed content in a reply: ' + hit.join(', ')); });
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
