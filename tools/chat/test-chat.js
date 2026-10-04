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
     bgLoaded false: the background notes must still be unloaded after this test (fresh chat) } */
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
t('tools', 'What is Mood Arbitrage?', { kind: 'card', id: 'mood', link: '/tools/mood-arbitrage-free.html' });
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
t('tools', 'What is the Frequency Framework?', { kind: 'card', id: 'freqframe' });
t('tools', 'What does the one page infographic cover?', { kind: 'card', id: 'infographic' });

// ---------------------------------------------------------------- every workpaper
t('workpapers', 'What is WP-01?', { kind: 'card', id: 'wp01', link: '/workpapers/wp-01.html' });
t('workpapers', 'How do I fill in the field audit?', { kind: 'card', id: 'wp01', steps: true });
t('workpapers', 'What is WP-02?', { kind: 'card', id: 'wp02', link: '/workpapers/wp-02-battery-stress-meter.html' });
t('workpapers', 'What does my battery score mean?', { kind: 'card', id: 'wp02', text: /0\.3.*0\.6/ });
t('workpapers', 'Show me the math for WP-02', { kind: 'card', id: 'wp02', text: /divide by 20|÷ 20/ });
t('workpapers', 'What is the RACI treaty?', { kind: 'card', id: 'wp03', link: '/workpapers/wp-03-raci-treaty.html' });
t('workpapers', 'How is ownership clarity worked out?', { kind: 'card', id: 'wp03', text: /divide|÷/ });
t('workpapers', 'What is WP-04?', { kind: 'card', id: 'wp04', link: '/workpapers/wp-04-deficit-audit.html' });
t('workpapers', 'How do I do the monthly look-back?', { kind: 'card', id: 'wp04', steps: true });
t('workpapers', 'What is the tone filter?', { kind: 'card', id: 'wp09', link: '/workpapers/wp-09-tone-filter.html' });
t('workpapers', 'Give me an example of fact feeling and ask', { kind: 'card', id: 'wp09' });
t('workpapers', 'What is WP-11?', { kind: 'card', id: 'wp11', link: '/wp-11.html' });
t('workpapers', 'When do I go back after using the calm-down kit?', { kind: 'card', id: 'wp11' });
t('workpapers', 'What is WP-13?', { kind: 'card', id: 'wp13', link: '/workpapers/wp-13-pll-protocol.html' });
t('workpapers', 'How does the 90 second check-in work?', { kind: 'card', id: 'wp13', steps: true });
t('workpapers', 'In what order should I use the workpapers?', { kind: 'card', id: 'order' });

// ---------------------------------------------------------------- calculators: explained, and worked out in chat (numbers checked by hand)
t('calc', 'How does CALC-01 work?', { kind: 'card', id: 'calc01', link: '/workpapers/calculators/calc01-solvency.html' });
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
t('calc', 'CALC-01: balance 0.6, ownership 0.5, battery 0.4', { kind: 'calc', text: /= 0\.57\..*0\.40 to 0\.69.*ownership clarity/s, link: '/workpapers/calculators/calc01-solvency.html' });
// 0.32 + 0.28 + 0.2 = 0.80 → carrying its own weight
t('calc', 'solvency with workload balance 80%, ownership clarity 80%, stress 20%', { kind: 'calc', text: /= 0\.80\..*0\.70 or more/s });
// 0.12 + 0.07 + 0.05 = 0.24 → under 0.40
t('calc', 'calc01 0.3 0.2 0.8', { kind: 'calc', text: /= 0\.24\..*Under 0\.40/s });
// apex: 0.35×0.6 + 0.30×0.5 + 0.20×0.6 + 0.15×0.25 = 0.21 + 0.15 + 0.12 + 0.0375 = 0.5175 → 0.52
t('calc', 'CALC-01 balance 0.6 ownership 0.5 battery 0.4 retuning 0.25', { kind: 'calc', text: /apex score .*= 0\.52/ });
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
s('My roommate always pays their share of the rent late', 'roommate+money');
s('There are three of us roommates and nobody agrees on chores', 'roommate+group');
s('My boss takes credit for my work', 'coworker+credit');
s('On my team of seven nobody owns anything and tasks fall through the cracks', /coworker\+(ownership|group)/);
s('My manager criticizes my work in front of everyone', 'coworker+criticism');
s('My friend keeps cancelling plans last minute', 'friend+reliability');
s('My best friend and I are drifting apart', 'friend+distance');
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
t('routing', 'What path should co-parents follow?', { kind: 'road', id: 'coparent', link: '/workpapers/wp-03-raci-treaty.html' });
t('routing', 'Which tools should caregivers start with?', { kind: 'road', id: 'caregiving', link: '/workpapers/wp-02-battery-stress-meter.html' });
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
function d(q) { t('safety', q, { kind: 'safety', text: /qualified professional/, not: /hotline|\d{3}/ }); }
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
t('tester', 'can we use this together on two phones', { kind: 'card', id: 'twophones', link: '/carrier-wave-decoder.html#together' });
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
t('parents', 'is there a page for grandparents', { kind: 'card', id: 'grandparents', link: '/grandparents.html' });
t('parents', 'tips for grandparents', { kind: 'card', id: 'grandparents', text: /their house, their rules/ });
t('parents', 'how do I say no to babysitting my grandkids', { kind: 'sit', id: /\+grandkids$/, script: true });
t('parents', 'do I have to give my email', { id: 'emailwhy', text: /without giving anything/ });
t('parents', 'what do you do with my email', { id: 'emailwhy', text: /Buttondown/ });
t('parents', 'what is frequency buddies', { kind: 'card', id: 'buddies', link: '/frequency-buddies.html' });
t('parents', 'is there a frequency buddies music video', { kind: 'card', id: 'buddiesmusicvideo', link: '/frequency-buddies-music-video.html' });
t('parents', 'where can I hear the frequency buddies theme song', { kind: 'card', id: 'buddiesmusicvideo', link: '/frequency-buddies-music-video.html' });
t('parents', 'can I make my own music video', { kind: 'card', id: 'buddiesmvmaker', link: '/frequency-buddies-music-video-maker.html' });
t('parents', 'is there a music video maker for frequency buddies', { kind: 'card', id: 'buddiesmvmaker', link: '/frequency-buddies-music-video-maker.html' });
t('parents', 'when is the next season of frequency buddies', { kind: 'card', id: 'buddiess2', link: '/frequency-buddies-season-2.html', text: /no release date yet/ });
t('parents', 'is there a season 2 teaser', { kind: 'card', id: 'buddiess2', link: '/frequency-buddies-season-2.html' });

// ---------------------------------------------------------------- the nine fields and how they connect
t('connections', 'how do the nine fields connect', { id: 'connections', text: /36 possible pairs.*12 obvious, 14 hidden and 10 abstract/s });
t('connections', 'how are all the different areas Christian studied connected?', { id: 'connections', text: /seven kinds of root/ });
t('connections', 'Show me the hidden connections', { id: 'connections-hidden', text: /Neurobiology \+ Finance/ });
t('connections', 'what are the deepest connections?', { id: 'connections-deepest', text: /One hard conversation/ });
t('connections', 'where do all nine fields meet at once', { id: 'connections-deepest' });
t('connections', 'Show me the abstract connections', { id: 'connections-abstract', text: /Aristotle/ });
t('connections', 'Show me how one field leads into the next', { id: 'connections-chain', text: /Aromatherapy → Neurobiology/ });
t('connections', 'what is a polymath', { kind: 'card', id: 'polymath', link: '/polymath.html' });

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
