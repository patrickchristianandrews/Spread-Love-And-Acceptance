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
t('tools', 'What is the pal cam?', { kind: 'card', id: 'palcam', text: /Journey/ });
t('tools', 'How do I check in on Tidbit and Sugarfoot?', { kind: 'card', id: 'palcam', steps: true });
t('tools', 'What are the soundscapes?', { kind: 'card', id: 'soundscapes' });
t('tools', 'What is Echoes of Gold?', { kind: 'card', id: 'album' });
t('tools', 'Is there a podcast?', { kind: 'card', id: 'podcast' });
t('tools', 'What is Turning Toward?', { kind: 'card', id: 'turning', link: '/turning-toward.html' });
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
c('followups', ['What is the Journey?', 'tell me more'], { text: /pal cam|life lesson/ });
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
d('I want to kill myself');
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
  fails.forEach(f => console.log('FAIL [' + f.x.g + '] ' + (f.x.convo || [f.x.q]).join(' → ') + '\n   ' + f.why.join('; ') + '\n   ' + f.text.slice(0, 300).replace(/\n/g, ' | ')));
  console.log('\n' + Object.keys(groups).map(g => g + ' ' + groups[g][0] + '/' + groups[g][1]).join('  ·  '));
  console.log('PASSED ' + pass + ' of ' + tests.length + ' (' + (100 * pass / tests.length).toFixed(1) + '%)');
  process.exitCode = pass === tests.length ? 0 : 1;
})();
