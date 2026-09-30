/* site.js — shared navigation and membership for every page.
   To add a page: add one line to SECTIONS below and put these two lines in the page's <head>:
     <link rel="stylesheet" href="/assets/css/site.css">
     <script src="/assets/js/site.js" defer></script>
   To make a page members-only: set  paid: true  on its line. That's the only switch.
   SIMPLE FIRST: every page's address is its simple version. If a page also has a full
   version saved beside it as <name>-in-depth.html, set  deep: true  on its line. The menu
   then shows a "Dig deeper" link to it, and the in-depth page shares the simple page's
   menu entry, members lock and previous/next links.

   FREE PREVIEW: while the program is being built, freePreview (below) is true.
   Every "paid: true" page then opens for anyone who signs up with an email
   address. The address goes to Buttondown (the newsletter list) and the page
   unlocks in that browser right away. To start charging later, set
   freePreview to false: the Gumroad members-list check comes back unchanged. */

(function () {
  'use strict';

  // ===== Settings you edit =====
  var CONFIG = {
    // true = everything is free with an email sign-up; paid membership is "coming soon"
    freePreview: true,
    signupUrl: 'https://buttondown.email/api/emails/embed-subscribe/spreadloveandacceptance',
    price: '$27/month',
    joinUrl: 'https://gumroad.com/spreadloveandacceptance', // ← replace with your Gumroad product link
    supportEmail: 'patrick.christian.andrews@gmail.com',
    // Web3Forms access key: sends the 404 page's broken-link reports to your inbox without
    // putting your email address on the site. Get one free at https://web3forms.com
    // (it's safe to be public). Until it's filled in, the report form stays hidden.
    formKey: 'PASTE-WEB3FORMS-ACCESS-KEY-HERE',
    membersFile: '/data/members.json'
  };

  // ===== Every page on the site, in reading order =====
  var SECTIONS = [
    { id: 'new', title: 'What’s new', blurb: 'Newly added and newly expanded, newest first.', items: [
      { href: '/whats-new.html', code: 'All', title: 'What’s new', note: 'Everything newly added and everything that’s grown, in one place, with dates' },
      { href: '/growing-up.html', code: 'New', title: 'Where your lens came from', note: 'How growing up shapes the way you see yourself and others, and how to choose which old rules to keep' },
      { href: '/frequency-buddies.html', code: 'New', title: 'Frequency Buddies', note: 'Animated episodes with Tidbit and Sugarfoot, with captions on' },
      { href: '/start-in-10-minutes.html', code: 'New', title: 'Start in 10 minutes', note: 'One short path: today’s weather, the Preface, one practice card and one thing logged' },
      { href: '/sent-this.html', code: 'New', title: 'Sent this by someone?', note: 'What the other person sees, what stays yours, and how to say yes, not yet or no kindly' },
      { href: '/quest.html', code: 'New', title: 'Your quest map', note: 'Little “Check yourself” moments on reading pages, and a map that lights up as you learn' },
      { href: '/calm-visualizer.html', code: 'New', title: 'Drift: calm visualizer', note: 'Deep, slow 3D colors and binaural tones matched to how you feel' },
      { href: '/five-pillars.html', code: 'New', title: 'The Five Pillars', note: 'How every part of the program fits together, inside you and between you and others' },
      { href: '/library.html', code: 'New', title: 'The Professor’s Library', note: 'Deep, plain-language reading on psychology and conflict, and Professor Puddles can chat about all of it' },
      { href: '/reading.html', code: 'New', title: 'Something to read', note: 'Hand-picked articles from trusted sources, matched to what you’re reading' },
      { href: '/frequency-journey.html', code: 'New', title: 'The Frequency Journey', note: 'Tidbit and Sugarfoot’s calm puzzle journey: riddles, life lessons and puzzles in seven worlds' },
      { href: '/soundscapes.html', code: 'New', title: 'Four soundscapes', note: 'The Breath Beneath, One Breath to Anchor You, Nothing Needs to Change and The Road We Made' },
      { href: '/ask.html', code: 'New', title: 'Chat with Professor Puddles', note: 'Small drop, big brain: answers made only from this site’s pages. What you type stays on your device' },
      { href: '/pause-and-play.html', code: 'New', title: 'Levels that grow the background', note: 'Every few levels, something new appears behind every page and joins in' },
      { href: '/book/preface.html', code: 'Deeper', title: 'Mini dives, shore to deep', note: 'Tap any word with the water drop and wade in one step at a time' },
      { href: '/workpapers/fill/suite.html', code: 'New', title: 'The Workpaper Suite', note: 'Fillable, printable PDFs for your situation, with a plan for each week' }
    ]},
    { id: 'start', title: 'Start here', blurb: 'New to the site? These pages explain the idea and let you try it in a few minutes.', items: [
      { href: '/start-here.html', code: 'Start', title: 'Start here', note: 'What this is in one minute, and the one best first step for you' },
      { href: '/start-in-10-minutes.html', code: '10 min', title: 'Start in 10 minutes', note: 'A short, straight path: check your weather, read the Preface, try one card and log one thing' },
      { href: '/sent-this.html', code: '', title: 'Sent this by someone?', note: 'What they see, what stays yours, doing your side privately, and saying no kindly' },
      { href: '/program.html', code: '', title: 'Which part of the program to use', note: 'Six weeks, the Workpaper Suite, the package and report, and the indexes: which to use when' },
      { href: '/index.html', code: '', title: 'Home', note: 'What’s new, the ways in, and the full contents' },
      { href: '/five-pillars.html', deep: true, code: '', title: 'The Five Pillars', note: 'The five ideas under everything here, how each works inside you and between you and others, and where each one shows up' },
      { href: '/how-it-works.html', deep: true, code: '', title: 'How it works', note: 'A friendly tour of what the program looks at, and why you can skip the technical bits' },
      { href: '/contents.html', deep: true, code: '', title: 'Contents', note: 'Everything in the program, in three parts, plus the full site directory' },
      { href: '/ways-in.html', deep: true, code: '', title: 'Ways in', note: 'Free while it’s being built: what each level opens, and what it shares' },
      { href: '/is-this-for-you.html', deep: true, code: '', title: 'Is this right for you?', note: 'What the program is and isn’t, who it helps, and a guide to every section' },
      { href: '/relationships.html', deep: true, code: '', title: 'How it fits your relationships', note: 'How every part of the program connects to yourself, partners, family, friends, roommates, co-parents, coworkers and caregivers' },
      { href: '/quick-checks.html', code: '', title: 'Today’s Weather', note: 'A one-minute read on your own conditions today, and what today is good for' },
      { href: '/frequency-framework.html', deep: true, code: '', title: 'The Frequency Framework', note: 'Why two kind people can fall out of step, and how to find the same rhythm again' },
      { href: '/infographic.html', code: '', title: 'The whole idea on one page', note: 'A printable one-page summary, easy to share' },
      { href: '/glossary.html', code: '', title: 'Glossary: the words, in plain English', note: 'Every word the site uses in one plain sentence with an example, and each tool’s plain and technical names' }
    ]},
    { id: 'self', title: 'Self-discovery', blurb: 'Tools for understanding yourself: your load, your wiring, your patterns. Start here, with or without anyone else.', items: [
      { href: '/self-path.html', code: 'Start', title: 'Your self-discovery path', note: 'The self path, step by step: your battery, your wiring, what settles you and kind words, on your own' },
      { href: '/workpapers/fill/suite.html?road=self', code: 'Workpapers', title: 'Workpapers for you', note: 'The “Just me” road: the worksheets for the self path, in order, fillable and printable' },
      { href: '/quick-checks.html#today', code: 'Daily', title: 'Today’s Weather', note: 'One minute on your own conditions: a forecast, a talk window, what today is good for, and an optional 7-day log of your patterns' },
      { href: '/know-yourself.html', deep: true, code: 'New', title: 'Know your own wiring', note: 'What’s you, what life taught you, and what’s just today, and how to explain each one to others' },
      { href: '/growing-up.html', deep: true, code: 'New', title: 'Where your lens came from', note: 'How each stage of growing up shapes what you expect of yourself and others, and how to choose which rules to keep' },
      { href: '/wired-differently.html', deep: true, code: 'New', title: 'Wired Differently', note: 'How differently wired people hear the same words, and how to talk across the difference' },
      { href: '/wiring-card.html', code: 'Tool', title: 'Wiring Card', note: 'A one-page card on how you receive words, what silence means, and what to avoid' },
      { href: '/workpapers/wp-02-battery-stress-meter.html', deep: true, code: 'WP-02', title: 'How much are you carrying?', note: 'What you’re already carrying, separate from what just happened', paid: true },
      { href: '/tools/frequency-calibration.html', code: 'Tool', title: 'Find your natural rhythms', note: 'Your natural rhythms for money, decisions, check-ins and recovery', paid: true },
      { href: '/wp-11.html', deep: true, code: 'WP-11', title: 'The Calm-Down Kit', note: 'Decide in advance what settles your body', paid: true },
      { href: '/book/chapter-3.html', deep: true, code: 'III', title: 'Full tanks and different angles', note: 'Why some reactions are bigger than their cause', paid: true },
      { href: '/learn/index.html#part-self', deep: true, code: 'Stories', title: 'Stories from Philosophy: Knowing yourself', note: 'The Second Arrow, the Ship of Theseus, What Is Up to Us' },
    ]},
    { id: 'play', title: 'Play', blurb: 'Calm games for a busy mind: a gentle way to read your state and settle it (Pillar III) before you talk. No timers and no way to lose, and something new in the background every few levels.', items: [
      { href: '/pause-and-play.html', code: 'All', title: 'Pause & Play', note: 'All the calm games in one place, with your level and your garden' },
      { href: '/frequency-journey.html', code: 'New', title: 'The Frequency Journey', note: 'Guide Tidbit and Sugarfoot through seven tone-themed worlds: practice tuning in (Pillar IV) while you settle (Pillar III)' },
      { href: '/calm-visualizer.html', code: 'New', title: 'Drift: calm visualizer', note: 'Pick how you feel. Slow, deep 3D colors and binaural tones (headphones on) ease you toward calm. Pillar III: settle first' },
      { href: '/night-garden.html', code: 'New', title: 'The Night Garden', note: 'A calm place to breathe, play and let your mind settle. Flowers bloom as you breathe; no timers, nothing to lose' },
      { href: '/word-bloom.html', code: 'New', title: 'Word Bloom', note: 'Swipe across the petals to spell words. Hundreds of gentle levels and a bonus jar, and every few levels something new appears in the background' },
      { href: '/quiet-crossword.html', code: 'New', title: 'Quiet Crossword', note: 'Small, friendly crosswords in five gentle levels, made for playing on a phone' },
      { href: '/daily-ledger-crossword.html', code: 'New', title: 'The Daily Ledger Crossword', note: 'A newspaper-style crossword, from a quick 5x5 Mini to a Big Sunday 13x13' },
      { href: '/quiet-words.html', code: 'Game', title: 'Quiet Words', note: 'A gentle word search with a new theme in every puzzle. Every word you find leaves a kind thought behind' },
    ]},
    { id: 'relationships', title: 'Relationships', blurb: 'Where to start in each kind of relationship, and every tool that fits. The shared tools themselves live under The book, Workpapers and Tools.', items: [
      { href: '/turning-toward.html', deep: true, code: 'New', title: 'Turning toward', note: 'Seven small, everyday ways to build connection with anyone who matters to you' },
      { href: '/check-ins.html', deep: true, code: 'Guide', title: 'Check-ins', note: 'How to have a tender conversation kindly: a good time and place, listening first, and an ending that feels good to both' },
      { href: '/relationships.html#partners', deep: true, code: '', title: 'Partners', note: 'Start with who did what, one owner per job, and the daily check-in' },
      { href: '/relationships.html#family', deep: true, code: '', title: 'Family', note: 'Start with getting back in tune, one owner per job, and saying it so it lands' },
      { href: '/relationships.html#co-parents', deep: true, code: '', title: 'Co-parents', note: 'Start with one owner per job, saying it so it lands, and the monthly look-back' },
      { href: '/relationships.html#friends', deep: true, code: '', title: 'Friends', note: 'Start with Turning Toward, the Conversation Reader, and saying it so it lands' },
      { href: '/relationships.html#roommates', deep: true, code: '', title: 'Roommates', note: 'Start with the Lemonade Stand, one owner per job, and the daily check-in' },
      { href: '/relationships.html#coworkers', deep: true, code: '', title: 'Coworkers & teams', note: 'Start with one owner per job, getting back in tune, and saying it so it lands' },
      { href: '/relationships.html#caregivers', deep: true, code: '', title: 'Caregivers', note: 'Start with your battery, one owner per job, and the Calm-Down Kit' },
      { href: '/full-path.html', code: 'Package', title: 'The workpaper package and report', note: 'One fillable PDF for your relationship, and a detailed report from your answers: findings, recommendations and a plan' },
      { href: '/relationships.html#map', deep: true, code: 'Map', title: 'The full map', note: 'Every chapter, worksheet and tool, for every kind of relationship' }
    ]},
    { id: 'book', title: 'The book', blurb: 'The manuscript, one idea per chapter. Each chapter pairs with a workpaper that puts it to use.', items: [
      { href: '/book/preface.html', deep: true, code: 'Preface', title: 'The work nobody sees', note: 'The quiet, unseen work of running a shared life, and why it deserves to be noticed' },
      { href: '/book/chapter-1.html', deep: true, code: 'I', title: 'Why we get out of tune', note: 'How pace, tone and urgency nudge two people out of sync, and how to get back in tune' },
      { href: '/book/chapter-2.html', deep: true, code: 'II', title: 'Is the split working?', note: 'A simple way to see whether the way you share the work can last. It looks at the arrangement, never at a person' },
      { href: '/book/chapter-3.html', deep: true, code: 'III', title: 'Full tanks and different angles', note: 'How much of a reaction is leftover stress, and the seven angles people see things from', paid: true },
      { href: '/book/chapter-4.html', deep: true, code: 'IV', title: 'Two kinds of fair', note: 'Agreeing on what fair means to you both, and letting words land before you react', paid: true },
      { href: '/book/chapter-5.html', deep: true, code: 'V', title: 'The monthly look-back', note: 'A gentle monthly look back that catches what weekly check-ins miss', paid: true },
      { href: '/library.html', code: 'Library', title: 'The Professor’s Library', note: 'Psychology, behavioral science and conflict resolution in plain words: 233 short entries, each tied to the Five Pillars and the program' },
    ]},
    { id: 'workpapers', title: 'Workpapers', blurb: 'Short worksheets. Each of you fills in your own, then you read them together. They work best in the order listed, with the monthly look-back once a month.', items: [
      { href: '/full-path.html', code: 'Package', title: 'The workpaper package and report', note: 'One fillable PDF for your relationship, and a detailed report from your answers: findings, recommendations and a plan' },
      { href: '/workpapers/wp-01.html', deep: true, code: 'WP-01', title: 'Who did what, and kind ways to say no', note: 'Start here: a week’s log of who did what, plus kind ways to say no', paid: true },
      { href: '/workpapers/wp-02-battery-stress-meter.html', deep: true, code: 'WP-02', title: 'How much are you carrying?', note: 'Five quick questions: how much are you already carrying today?', paid: true },
      { href: '/workpapers/wp-03-raci-treaty.html', deep: true, code: 'WP-03', title: 'One owner per job', note: 'Give every regular job one owner, so nobody has to keep asking', paid: true },
      { href: '/workpapers/wp-04-deficit-audit.html', deep: true, code: 'WP-04', title: 'What keeps coming back?', note: 'The monthly look-back: what keeps coming up, and what’s really behind it', paid: true },
      { href: '/workpapers/wp-09-tone-filter.html', deep: true, code: 'WP-09', title: 'Say it so it lands', note: 'Turn a big feeling into a fact, a feeling and a kind ask before you send it', paid: true },
      { href: '/wp-11.html', deep: true, code: 'WP-11', title: 'The Calm-Down Kit', note: 'Ways to settle your body first, when either of you is too wound up to talk', paid: true },
      { href: '/workpapers/wp-13-pll-protocol.html', deep: true, code: 'WP-13', title: 'The 90-second daily check-in', note: 'Ninety seconds a day, no debating, to keep small things small', paid: true },
      { href: '/do/index.html', code: '', title: 'Try the Workpapers', note: 'A playground to try the worksheets before you commit' },
      { href: '/workpapers/fill/suite.html', code: 'Suite', title: 'The Workpaper Suite', note: 'New: the worksheets for your situation, in order, as one fillable PDF and a report' },
      { href: '/workpapers/fill/index.html', code: 'Fill-in', title: 'Fill-in workpapers', note: 'Type straight into the worksheets and save them as PDFs on your device' }
    ]},
    { id: 'program', title: 'Guided program', blurb: 'For anyone who’d like to be walked through it, one gentle step at a time.', items: [
      { href: '/program.html', code: 'Guide', title: 'Which part to use when', note: 'The six weeks, the Workpaper Suite, the package and report, and the indexes, side by side' },
      { href: '/prog-01.html', deep: true, code: 'PROG-01', title: 'Six gentle weeks', note: 'One worksheet a week, in order, ending with a before-and-after look', paid: true },
      { href: '/workpapers/report-01.html', deep: true, code: 'REPORT-01', title: 'Your progress, week by week', note: 'Your week-by-week record, so progress builds instead of starting over', paid: true }
    ]},
    { id: 'tools', title: 'Tools', blurb: 'Interactive pages. Everything you type stays in your own browser.', items: [
      { href: '/ask.html', code: 'New', title: 'Chat with Professor Puddles', note: 'Ask a question in your own words and get an answer made only from this site’s pages. Nothing you type leaves your device' },
      { href: '/conversation-reader.html', code: 'New', title: 'The Conversation Reader', note: 'Paste a text thread, chat or email exchange: see where it turned, what each of you may be hearing, and a calmer way to answer' },
      { href: '/lemonade-stand.html', code: 'Tool', title: 'The Lemonade Stand', note: 'List who did what to keep the household running this week, and see the split as a plain fact' },
      { href: '/wiring-card.html', code: 'New', title: 'Wiring Card', note: 'Make a one-page card for how you receive words, what silence means, and what to avoid' },
      { href: '/signal-translator.html', code: 'New', title: 'The Signal Translator', note: 'Test a sentence before a check-in. Pick the wiring, the room, and how it might land' },
      { href: '/carrier-wave-decoder.html', code: 'Tool', title: 'The Carrier Wave Decoder', note: 'A guided session for the moment a conversation starts going sideways' },
      { href: '/workpapers/calculators/calc01-solvency.html', code: 'CALC-01', title: 'Is the setup working for everyone?', note: 'Also called the solvency read: add your worksheet numbers and see whether the way you share the load is working' },
      { href: '/calc01-solvency.html', code: 'CALC-01', title: 'Is the setup working for everyone? The long form', note: 'Enter hours and jobs for 2–8 people and see the math step by step', menu: false },
      { href: '/tools/mood-arbitrage-free.html', code: 'Tool', title: 'Mood Arbitrage', note: 'Small, kind ways to shift a heavy mood: a printable plan builder, five scenarios and a four-week practice plan' },
      { href: '/tools/mood-arbitrage-full.html', code: 'Tool', title: 'Mood Arbitrage: the full toolkit', note: 'Five everyday scenarios and a four-week practice plan', paid: true, menu: false },
      { href: '/tools/frequency-calibration.html', code: '', title: 'Find your natural rhythms', note: 'Compare your rhythms across five areas of daily life', paid: true },
      { href: '/tools/frequency-sync-visualizer.html', code: '', title: 'Watch two rhythms sync', note: 'A moving picture of how the daily check-in keeps two people in step', paid: true },
      { href: '/snapshot/index.html', code: '', title: 'A quick snapshot', note: 'A two-minute look at how things are right now' }
    ]},
    { id: 'media', title: 'Media', blurb: 'Tidbit and Sugarfoot’s movies and live pal cam, music and audio for settling first (Pillar III), and conversations about all five pillars.', items: [
      { href: '/frequency-buddies.html', code: 'Movies', title: 'Tidbit & Sugarfoot: Frequency Buddies', note: 'Five animated adventures with the two pals, with voices, music and captions, about 16 minutes each' },
      { href: '/frequency-buddies-shuffle.html', code: 'Shuffle', title: 'Frequency Buddies on shuffle', note: 'Episode after episode in a random order, with a way to record one for YouTube' },
      { href: '/pal-cam-tv.html', code: 'Live', title: 'Tidbit & Sugarfoot: Pal Cam TV', note: 'The pals live, all day, full screen or cast to your TV, with music and the sounds of each place' },
      { href: '/reading.html', code: 'Articles', title: 'Articles to read', note: 'Hand-picked articles from Psychology Today, Greater Good, the Gottman Institute and more, grouped by topic and fresh every visit' },
      { href: '/soundscapes.html', code: 'Audio', title: 'Soundscape Catalog', note: 'Background audio made for settling down and focusing' },
      { href: '/echoes-of-gold.html', code: 'Album', title: 'Echoes of Gold', note: 'The companion album: the music that came before the framework, for settling first (Pillar III)' },
      { href: '/podcast-index.html', code: 'Podcast', title: 'The Podcast', note: 'Friendly conversations with Kane and Christian about the ideas behind it all' }
    ]},
    { id: 'about', title: 'About & status', blurb: 'Who made this and why, what’s finished so far, and the site’s policies.', items: [
      { href: '/about.html', deep: true, code: '', title: 'About the creator', note: 'The person behind it, their story, and why this exists' },
      { href: '/program-overview.html', deep: true, code: '', title: 'Program Overview', note: 'How the chapters, workpapers and calculators fit together' },
      { href: '/suite-index.html', deep: true, code: '', title: 'Suite Index', note: 'The official list of what’s built today. If it isn’t here, it isn’t live yet' },
      { href: '/roadmap.html', code: '', title: 'Content Roadmap', note: 'What’s live, what’s being written, and what’s planned' },
      { href: '/telemetry.html', code: '', title: 'Rollout Status', note: 'How much of the planned program is finished, counted plainly' },
      { href: '/membership.html', code: '', title: 'Membership', note: 'Free while in development: sign up, or sign out of this browser' },
      { href: '/on-this-device.html', code: '', title: 'What’s stored on this device', note: 'Everything this site keeps in your browser, in plain words, with a button to erase each one' },
      { href: '/legal/privacy-policy.html', code: '', title: 'Privacy policy', note: 'What’s collected, who holds it, and your rights' },
      { href: '/legal/terms-of-service.html', code: '', title: 'Terms of service', note: 'The rules for using the site' },
      { href: '/legal/refund-policy.html', code: '', title: 'Refund policy', note: 'How cancellations and refunds will work once paid membership launches' }
    ]}
  ];

  // ===== Nothing below needs editing =====
  var STORE_KEY = 'tol-member-email';
  // Full path from the site root, e.g. /book/chapter-2.html ("/" means /index.html)
  var current = decodeURIComponent(location.pathname);
  if (/\/$/.test(current)) current += 'index.html';
  else if (!/\.[a-z0-9]+$/i.test(current)) current += '.html';
  // An in-depth page shares its simple page's menu entry: /book/chapter-2-in-depth.html → /book/chapter-2.html
  var inDepth = /-in-depth\.html$/.test(current);
  if (inDepth) current = current.replace(/-in-depth\.html$/, '.html');
  function deepHref(it) { return it.href.replace(/\.html(?=#|$)/, '-in-depth.html'); }
  // Tender reading pages (growing up, knowing yourself, and any page marked data-sensitive): no pop-ups,
  // no cheering buddies or pup visits, no Professor Puddles cards and no learning-trail score on them.
  var SENSITIVE = /^\/(growing-up|know-yourself)\.html$/;
  function sensitivePage() { return SENSITIVE.test(current) || !!(document.body && document.body.hasAttribute('data-sensitive')); }
  if (SENSITIVE.test(current)) document.documentElement.classList.add('tol-sensitive');
  // when this visit began (this tab only), so no invitation shows in someone's first minute here
  try { if (!sessionStorage.getItem('tol-visit-t0')) sessionStorage.setItem('tol-visit-t0', String(Date.now())); } catch (e) {}

  var here = null, hereSection = null;
  SECTIONS.forEach(function (s) {
    s.items.forEach(function (it) { if (it.href === current) { here = it; hereSection = s; } });
  });

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k]; else n.setAttribute(k, attrs[k]);
    });
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function label(it) {
    if (!it.code) return it.title;
    var code = /^[IVX]+$/.test(it.code) ? 'Chapter ' + it.code : it.code;
    return code + ': ' + it.title;
  }

  var isMember = false;

  // ---------- Index (panel + home page) ----------
  function buildIndex(opts) {
    var wrap = el('div', { class: 'tol-index' + (opts.page ? ' is-page' : '') + (isMember ? ' is-member' : '') });
    SECTIONS.forEach(function (s) {
      if (opts.page && s.id === 'about' && !opts.all) return;
      if (opts.page && s.id === 'new' && opts.all) return; // the contents list names each page once, in its home section
      var sec;
      if (opts.accordion) {
        // The panel shows section names only; open one to see its pages
        var count = s.items.filter(function (i) { return i.href !== '/index.html' && i.menu !== false; }).length;
        sec = el('details', { class: 'tol-index-section tol-acc', id: 'tol-sec-' + s.id });
        if (s.id === opts.open) sec.open = true;
        var hereMark = hereSection && hereSection.id === s.id ? ' <span class="tol-acc-here">you are here</span>' : '';
        sec.appendChild(el('summary', null, '<span class="tol-acc-title">' + esc(s.title) + hereMark + '</span><span class="tol-acc-count">' + count + (count === 1 ? ' page' : ' pages') + '</span>'));
        // One section open at a time keeps the list short
        sec.addEventListener('toggle', function () {
          if (!sec.open) return;
          wrap.querySelectorAll('details.tol-acc[open]').forEach(function (d) { if (d !== sec) d.open = false; });
        });
      } else {
        sec = el('div', { class: 'tol-index-section', id: (opts.page ? 'contents-' : 'tol-sec-') + s.id });
        sec.appendChild(el(opts.h || 'h3', null, esc(s.title)));
      }
      if (s.blurb) sec.appendChild(el('p', null, esc(s.blurb)));
      var ol = el('ol');
      s.items.forEach(function (it) {
        if (it.href === '/index.html' || it.menu === false) return; // menu:false pages are reached from their parent page
        var a = el('a', { class: 'tol-row', href: it.href });
        if (it.href === current) a.setAttribute('aria-current', 'page');
        a.innerHTML =
          '<span class="tol-code">' + esc(it.code || '') + '</span>' +
          '<span class="tol-title">' + esc(it.title) + (it.note ? '<small>' + esc(it.note) + '</small>' : '') + '</span>' +
          '<span class="tol-access">' + (it.paid ? (isMember ? 'unlocked' : (CONFIG.freePreview ? 'Free with sign-up' : 'members')) : '') + '</span>';
        var li = el('li'); li.appendChild(a);
        if (it.deep) li.appendChild(el('a', { class: 'dig tol-dig', href: deepHref(it) }, 'Dig deeper'));
        ol.appendChild(li);
      });
      sec.appendChild(ol);
      wrap.appendChild(sec);
    });
    return wrap;
  }

  // ---------- Join / Signed-up link (header bar) ----------
  var memberLinks = [];
  function joinLink(cls) {
    var a = el('a', { class: cls, href: '/membership.html' }, CONFIG.freePreview ? 'Join free' : 'Join');
    memberLinks.push(a);
    return a;
  }

  // ---------- Header bar + panel ----------
  var panel, scrim, lastFocus, memberLink;

  // The sections shown in the top bar. Each opens a short list of its pages.
  var RIBBON = [['new', 'New'], ['start', 'Start here'], ['self', 'Self-discovery'], ['relationships', 'Relationships'],
                ['book', 'Book'], ['workpapers', 'Workpapers'], ['tools', 'Tools'], ['play', 'Play'], ['media', 'Media'], ['about', 'About']];
  var openDrop = null;

  function closeDrop(refocus) {
    if (!openDrop) return;
    openDrop.btn.setAttribute('aria-expanded', 'false');
    openDrop.menu.hidden = true;
    if (refocus) openDrop.btn.focus();
    openDrop = null;
  }

  function buildDrop(id, name, alignRight) {
    var s = SECTIONS.filter(function (x) { return x.id === id; })[0];
    var item = el('div', { class: 'tol-nav-item' });
    var btn = el('button', { type: 'button', 'data-sec': id, 'aria-expanded': 'false', 'aria-controls': 'tol-drop-' + id }, esc(name));
    if (hereSection && hereSection.id === id) btn.setAttribute('aria-current', 'true');
    var menu = el('div', { class: 'tol-drop' + (alignRight ? ' is-right' : ''), id: 'tol-drop-' + id, hidden: '' });
    if (s.blurb) menu.appendChild(el('p', { class: 'tol-drop-blurb' }, esc(s.blurb)));
    var ul = el('ul');
    s.items.forEach(function (it) {
      if (it.href === '/index.html' || it.menu === false) return;
      var a = el('a', { href: it.href }, (it.code ? '<span class="tol-drop-code">' + esc(it.code) + '</span>' : '') + '<span>' + esc(it.title) + '</span>');
      if (it.href === current) a.setAttribute('aria-current', 'page');
      var li = el('li'); li.appendChild(a); ul.appendChild(li);
    });
    menu.appendChild(ul);
    var all = el('button', { type: 'button', class: 'tol-drop-all', 'aria-controls': 'tol-panel' }, 'Everything on the site &rarr;');
    all.addEventListener('click', function () { openPanel(id); });
    menu.appendChild(all);
    btn.addEventListener('click', function () {
      var wasOpen = openDrop && openDrop.btn === btn;
      closeDrop();
      if (wasOpen) return;
      btn.setAttribute('aria-expanded', 'true'); menu.hidden = false;
      openDrop = { btn: btn, menu: menu };
    });
    item.addEventListener('focusout', function (e) {
      if (openDrop && openDrop.btn === btn && !item.contains(e.relatedTarget)) closeDrop();
    });
    item.appendChild(btn); item.appendChild(menu);
    return item;
  }
  document.addEventListener('click', function (e) {
    if (openDrop && !(e.target.closest && e.target.closest('.tol-nav-item'))) closeDrop();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openDrop) closeDrop(true);
  });

  // "Pick up where you left off" and the time launcher (pick-up.js), loaded when first needed
  var pickUpWait = null;
  function loadPickUp(cb) {
    if (window.TOLPickUp) return cb();
    if (pickUpWait) { pickUpWait.push(cb); return; }
    pickUpWait = [cb];
    var sc = document.createElement('script'); sc.src = '/assets/js/pick-up.js';
    sc.onload = function () { var w = pickUpWait; pickUpWait = null; if (window.TOLPickUp) w.forEach(function (f) { f(); }); };
    document.head.appendChild(sc);
  }
  // the last few pages opened here, for "Pick up where you left off" (this browser only; it can be switched off or erased)
  function rememberPage(body) {
    if (lsGet('tol-recent-off') || /^\/(index|404|offline|garden-backdrop|pal-cam-tv|on-this-device|membership)\.html$|^\/legal\//.test(current) || location.search.indexOf('palcam-pop') !== -1) return;
    var h1 = document.querySelector('main h1');
    var t = (here && here.title) || (h1 && h1.textContent.replace(/\s+/g, ' ').trim()) || document.title.replace(/\s*[·|–—-]\s*(Spread Love|The Objective Ledger).*$/, '');
    if (!t) return;
    if (inDepth) t += ' (full version)';
    var u = location.pathname, list = [];
    try { list = JSON.parse(lsGet('tol-recent') || '[]') || []; } catch (e) { list = []; }
    list = list.filter(function (r) { return r && r.u !== u; });
    list.unshift({ u: u, t: t.slice(0, 90), at: Date.now() });
    lsSet('tol-recent', JSON.stringify(list.slice(0, 6)));
  }

  function openPanel(sectionId, toSearch) {
    lastFocus = document.activeElement;
    var pu = panel.querySelector('[data-pickup="menu"]');
    if (pu && !toSearch) loadPickUp(function () { window.TOLPickUp.mount(pu, 'menu'); });
    closeDrop();
    panel.querySelector('.tol-index').replaceWith(buildIndex({ accordion: true, open: sectionId }));
    if (!toSearch) { var q0 = panel.querySelector('.tol-find input'); if (q0 && q0.value) { q0.value = ''; runSearch(''); } }
    else { var q1 = panel.querySelector('.tol-find input'); if (q1 && q1.value) runSearch(q1.value); }
    scrim.hidden = false; panel.hidden = false;
    setInert(true);
    document.querySelectorAll('[aria-controls="tol-panel"]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    panel.scrollTop = 0;  // start at the top so every section name is in view
    if (toSearch) panel.querySelector('.tol-find input').focus({ preventScroll: true });
    else panel.querySelector('.tol-close').focus({ preventScroll: true });
  }
  // While the menu panel is open, everything behind it is out of reach (keyboard, screen readers, taps)
  var inerted = [];
  function setInert(on) {
    if (on) {
      inerted = Array.prototype.filter.call(document.body.children, function (n) {
        return n !== panel && n !== scrim && !n.hasAttribute('inert') && !/^(SCRIPT|STYLE|LINK)$/.test(n.tagName);
      });
      inerted.forEach(function (n) { n.setAttribute('inert', ''); });
    } else { inerted.forEach(function (n) { n.removeAttribute('inert'); }); inerted = []; }
  }
  function closePanel() {
    setInert(false);
    scrim.hidden = true; panel.hidden = true;
    document.querySelectorAll('[aria-controls="tol-panel"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (lastFocus) lastFocus.focus();
  }

  function buildChrome() {
    var body = document.body;
    var cs = getComputedStyle(body);
    var pt = parseFloat(cs.paddingTop) || 0, pr = parseFloat(cs.paddingRight) || 0,
        pb = parseFloat(cs.paddingBottom) || 0, pl = parseFloat(cs.paddingLeft) || 0;

    var skip = el('a', { class: 'tol-skip', href: '#tol-main' }, 'Skip to content');

    var bar = el('div', { class: 'tol-bar', role: 'banner' });
    bar.style.margin = (-pt) + 'px ' + (-pr) + 'px ' + pt + 'px ' + (-pl) + 'px';
    bar.appendChild(el('a', { class: 'tol-brand', href: '/index.html' },
      '<img class="tol-logo" src="/assets/img/logo-mark.svg" alt="" width="36" height="36"><span>The Objective Ledger</span>'));

    var nav = el('div', { class: 'tol-sections', role: 'navigation', 'aria-label': 'Site sections' });
    RIBBON.forEach(function (p, n) { nav.appendChild(buildDrop(p[0], p[1], n >= RIBBON.length - 3)); });
    bar.appendChild(nav);

    bar.appendChild(quietButton('bar'));
    bar.appendChild(settingsButton('tol-bar-set'));
    var find = el('button', { type: 'button', class: 'tol-search-btn', 'aria-controls': 'tol-panel', 'aria-expanded': 'false' },
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg><span>Search</span>');
    find.addEventListener('click', function () { openPanel(null, true); });
    bar.appendChild(find);
    var mob = el('button', { type: 'button', class: 'tol-contents-btn', 'aria-controls': 'tol-panel', 'aria-expanded': 'false' }, 'Menu');
    mob.addEventListener('click', function () { openPanel(null); });
    bar.appendChild(mob);
    memberLink = joinLink('tol-member');
    bar.appendChild(memberLink);

    scrim = el('div', { class: 'tol-scrim', hidden: '' });
    scrim.addEventListener('click', closePanel);
    panel = el('div', { class: 'tol-panel', id: 'tol-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Everything on the site', hidden: '' });
    var head = el('div', { class: 'tol-panel-head' });
    head.appendChild(el('h2', null, 'Everything on the site'));
    var close = el('button', { type: 'button', class: 'tol-close' }, 'Close');
    close.addEventListener('click', closePanel);
    head.appendChild(close);
    panel.appendChild(head);
    panel.appendChild(buildSearch());
    panel.appendChild(el('p', { class: 'tol-panel-intro' }, 'Open a section to see its pages.' +
      (CONFIG.freePreview ? ' Pages marked <em>Free with sign-up</em> open once you sign up with your email. It’s free.' : '')));
    var tools = el('div', { class: 'tol-panel-tools' });
    tools.appendChild(quietButton('switch'));
    tools.appendChild(stillButton());
    tools.appendChild(darkButton());
    tools.appendChild(settingsButton('tol-panel-set', 'All settings'));
    tools.appendChild(joinLink('tol-member tol-panel-join'));
    panel.appendChild(tools);
    panel.appendChild(el('div', { class: 'tol-panel-pickup', 'data-pickup': 'menu' }));
    panel.appendChild(buildIndex({ accordion: true }));

    document.addEventListener('keydown', function (e) {
      if (panel.hidden) return;
      if (e.key === 'Escape') closePanel();
      if (e.key === 'Tab') {
        var f = Array.prototype.filter.call(panel.querySelectorAll('a[href], button:not([disabled]), summary, input:not([disabled]), select, textarea'), function (n) { return n.getClientRects().length > 0 && !n.closest('details:not([open]) > :not(summary)'); });
        if (!f.length) return;
        if (!panel.contains(document.activeElement)) { e.preventDefault(); (e.shiftKey ? f[f.length - 1] : f[0]).focus(); return; }
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // Simple pages get their cute dressing and a gentle reminder (see site.css)
    if (hereSection) body.setAttribute('data-sec', hereSection.id);
    if (current === '/index.html') document.documentElement.classList.add('tol-home');
    // pages with their own dark look (the games, the Night Garden, Drift) keep it as it is
    if (body.classList.contains('is-game') || body.hasAttribute('data-no-dark') || /^\/(night-garden|calm-visualizer|pal-cam-tv|garden-backdrop)\.html$/.test(current)) document.documentElement.classList.add('tol-nodark');
    var ideas = document.querySelector('main .ideas');
    if (inDepth) body.classList.add('tol-deep');
    if (ideas) body.classList.add('tol-simple');
    buildDepthPicker(!!inDepth);
    // Simple pages use plain names only: the technical name under the title is kept for the Full version
    if (!inDepth && document.querySelector('main .tol-depth')) {
      Array.prototype.forEach.call(document.querySelectorAll('main .read-code .formal'), function (f) {
        var prev = f.previousSibling;
        if (prev && prev.nodeType === 3) prev.textContent = prev.textContent.replace(/\s*(·|&middot;|\u00b7)\s*$/, '');
        f.remove();
      });
    }

    // wide tables scroll inside their own box on small screens, instead of pushing the page sideways
    Array.prototype.forEach.call(document.querySelectorAll('main table'), function (tb) {
      if (tb.parentNode.classList && tb.parentNode.classList.contains('tol-table-scroll')) return;
      var wrap = el('div', { class: 'tol-table-scroll' }); tb.parentNode.insertBefore(wrap, tb); wrap.appendChild(tb);
    });
    addPrivateNote(body);
    addTip(body);
    revealOnScroll();

    // The Night Garden, softly alive behind every page, under a see-through veil.
    // Not on the garden itself, not on the locked-down workpaper pages, and not when
    // someone has asked their device to save data.
    var saveData = navigator.connection && navigator.connection.saveData;
    var gardenParts = null;
    function makeGarden() {
      if (gardenParts || stillOn) return;
      // each part of the site has its own scene, lit by the visitor's clock; the games stay in the Night Garden
      var SCENES = { start: 'garden', about: 'garden', self: 'beach', media: 'beach', relationships: 'lake', book: 'meadow', workpapers: 'river', program: 'forest', tools: 'forest' };
      var secId = (current === '/relationships.html' && 'relationships') || (hereSection && hereSection.id) || (/^\/book\//.test(current) ? 'book' : /^\/workpapers\//.test(current) ? 'workpapers' : /^\/(learn|legal)\//.test(current) ? 'about' : ''), sceneQ = secId === 'play' || body.classList.contains('is-game') ? '?scene=garden&tod=night' : '?scene=' + (SCENES[secId] || 'garden');
      if (body.hasAttribute('data-garden-nopals')) sceneQ += (sceneQ ? '&' : '?') + 'pals=off'; // the page has its own pals running about
      var gf = el('iframe', { class: 'tol-garden-bg', src: '/garden-backdrop.html' + sceneQ, title: 'The Night Garden, softly in the background', 'aria-hidden': 'true', tabindex: '-1' });
      var veil = el('div', { class: 'tol-garden-veil', 'aria-hidden': 'true' });
      body.insertBefore(veil, body.firstChild);
      body.insertBefore(gf, body.firstChild);
      document.documentElement.classList.add('has-garden');
      gardenParts = [gf, veil];
    }
    if (!body.hasAttribute('data-no-garden') && current !== '/night-garden.html' && current !== '/garden-backdrop.html' && !saveData &&
        !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      makeGarden();
      // "Keep the page still" takes the garden away entirely (nothing keeps moving out of sight), and brings it back
      stillHooks.push(function (on) {
        if (on && gardenParts) { gardenParts.forEach(function (n) { n.remove(); }); gardenParts = null; document.documentElement.classList.remove('has-garden'); }
        else if (!on) makeGarden();
      });
    }

    // levels for calm moments anywhere on the site (rewards.js), except the locked-down workpaper pages
    if (!window.TOLRewards && !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      var rw = document.createElement('script'); rw.src = '/assets/js/rewards.js'; document.head.appendChild(rw);
    }

    // mini dives: tap a term with the little water drop for a short explanation (dives.js)
    if (!body.hasAttribute('data-no-dives') && document.querySelector('main')) {
      var dg = document.createElement('script'); dg.src = '/assets/js/dives-glossary.js';
      dg.onload = function () { var dv = document.createElement('script'); dv.src = '/assets/js/dives.js'; document.head.appendChild(dv); };
      document.head.appendChild(dg);
    }

    // little buddies who cheer you on between the sections of a reading page (cheer.js)
    if (!body.hasAttribute('data-no-cheer') && !helpersHidden() && !busyPage() && !sensitivePage() && current !== '/index.html' && current !== '/' &&
        (document.querySelector('main.read') || body.classList.contains('tol-deep')) && !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      var cw = document.createElement('script'); cw.src = '/assets/js/cheer-words.js';
      cw.onload = cw.onerror = function () { var ch = document.createElement('script'); ch.src = '/assets/js/cheer.js'; document.head.appendChild(ch); };
      document.head.appendChild(cw);
    }

    // "In short" bullets on the long pages, and "Show me only the steps" (in-short.js)
    if (lmain && !busyPage() && current !== '/index.html' && !document.querySelector('meta[http-equiv="Content-Security-Policy"]') &&
        (inDepth || /^\/library/.test(current) || (lmain.textContent || '').split(/\s+/).length > 1200) && !/^\/workpapers\//.test(current)) {
      var isc = document.createElement('script'); isc.src = '/assets/js/in-short.js'; document.head.appendChild(isc);
    }

    // playful learning layer: "Check yourself" moments, a learning trail and the quest map (learn-play.js)
    if (!body.hasAttribute('data-no-learnplay') && !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      var lp = document.createElement('script'); lp.src = '/assets/js/learn-play.js'; document.head.appendChild(lp);
    }

    // "Watch it with the pups": the one Frequency Buddies episode that fits this reading page (buddies-suggest.js).
    // It reads the page's pillar, so it loads after pillars.js. Not on the games, the episodes page itself,
    // the tools, the legal, account and sign-in pages, or the tender pages.
    var buddiesOk = document.querySelector('main') && (document.querySelector('main.read') || inDepth) && !body.hasAttribute('data-no-buddies') &&
      !helpersHidden() && !busyPage() && !sensitivePage() && !(hereSection && hereSection.id === 'play') &&
      !document.querySelector('meta[http-equiv="Content-Security-Policy"]') &&
      !/^\/(index|frequency-buddies|404|offline|ask|brand|contents|reading|library|whats-new|roadmap|telemetry|membership|on-this-device|privacy-policy|refund-policy|terms-of-service|sent-this|about|suite-index)\.html$|^\/(legal|workpapers\/fill|store|supabase)\//.test(current);
    function loadBuddies() {
      if (!buddiesOk || window.TOLBuddiesSuggest) return;
      var bs = document.createElement('script'); bs.src = '/assets/js/buddies-suggest.js'; document.head.appendChild(bs);
    }
    // which of the Five Pillars this page puts to work, as a small strip under the title (pillars.js)
    if (!body.hasAttribute('data-no-pillars') && current !== '/index.html' && !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      var pj = document.createElement('script'); pj.src = '/assets/js/pillars.js';
      pj.onload = pj.onerror = loadBuddies;
      document.head.appendChild(pj);
    } else loadBuddies();

    // Tidbit & Sugarfoot pop by now and then with a tip or a little love (pup-visits.js; the pups and their words load only when a visit is about to happen)
    // (not on the tender pages, and not on Frequency Buddies, where they'd sit over the episode)
    if (document.querySelector('main.read') && !helpersHidden() && !busyPage() && !sensitivePage() && !body.hasAttribute('data-no-pupvisits') && !body.classList.contains('is-game') && !document.querySelector('meta[http-equiv="Content-Security-Policy"]') &&
        !/^\/(frequency-journey(-play)?|frequency-buddies|calm-visualizer|ask|404|offline|privacy-policy|refund-policy|terms-of-service)\.html$|^\/(legal|workpapers\/fill)\//.test(current)) {
      var pv = document.createElement('script'); pv.src = '/assets/js/pup-visits.js'; document.head.appendChild(pv);
    }

    // "Put it all together": a short pointer to the full path package and report on the self, relationship,
    // workpaper and program pages, just above the end of the reading
    var fpMain = document.querySelector('main.read');
    if (fpMain && hereSection && /^(self|relationships|workpapers|program|book)$/.test(hereSection.id) && !/^\/(full-path|self-path)\.html$|^\/workpapers\/fill\//.test(current) && !document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      var solo = hereSection.id === 'self';
      var fpBox = el('aside', { class: 'tol-fp-note', 'aria-label': 'The full path package' },
        '<p class="tol-fp-k">Put it all together</p>' +
        '<p>' + (solo
          ? 'The <strong>Individual</strong> full path package puts every workpaper for the self path into one fillable PDF, then turns your answers into a report just for you: what’s filling your battery, patterns worth noticing, and kind next steps.'
          : 'The <strong>full path package</strong> puts every workpaper for your relationship into one fillable PDF, for you alone or 2 to 8 people, then turns your answers into a detailed report: findings, things worth a second look, recommendations and a plan.') + '</p>' +
        '<p><a href="' + (solo ? '/self-path.html#package' : '/full-path.html') + '">See how it works</a> · <a href="/workpapers/fill/suite.html' + (solo ? '?road=self' : '') + '#full-path">Open the package</a></p>');
      fpMain.appendChild(fpBox);
    }

    // "Something to read": one hand-picked article that fits this reading page, near the end (reading-suggest.js)
    var readMain = document.querySelector('main.read');
    if (readMain && !body.hasAttribute('data-no-reading') && !document.querySelector('meta[http-equiv="Content-Security-Policy"]') && !/^\/(index|reading|library|whats-new|contents|contents-in-depth|roadmap|telemetry|404|offline)\.html$|^\/legal\//.test(current)) {
      var rl = document.createElement('script'); rl.src = '/assets/js/reading-list.js';
      rl.onload = function () {
        var rs = document.createElement('script'); rs.src = '/assets/js/reading-suggest.js';
        rs.onload = function () {
          if (!window.TOLReading) return;
          var host = el('div', { class: 'tol-read-host' });
          readMain.appendChild(host);
          try { if (!window.TOLReading.mount(host, { heading: 'none' })) host.remove(); } catch (e) { host.remove(); }
        };
        document.head.appendChild(rs);
      };
      document.head.appendChild(rl);
    }

    popBubbles();

    // "Breathe": a one-minute calm break on every page (the Night Garden has its own)
    if (!body.hasAttribute('data-no-breathe')) buildBreathe(body);
    buildPuddles(body);
    buildPuddlesCards(body);
    buildWeatherNudge(body);
    comfortOffer(body);
    rememberPage(body);
    if (current === '/index.html') {
      var hi = document.querySelector('main [data-home-intro]');
      // below the approved opening (intro, join, pal cam, hello, new notices): after the first notices stack
      if (hi) loadPickUp(function () { var h = el('div', { class: 'tol-pickup-host', 'data-pickup': 'home' }); homeSlot(hi).after(h); window.TOLPickUp.mount(h, 'home'); });
    }
    palCamHooks(body); // pal cam: "Check in on Tidbit & Sugarfoot" from anywhere (see below)

    // Pastel watercolour splashes behind the page (decorative; see site.css)
    if (!body.hasAttribute('data-no-wash')) {
      // plus a few pastel bubbles and hearts drifting slowly upward
      var floaters = '';
      for (var f = 0; f < 34; f++) floaters += '<b class="' + (f % 3 === 1 ? 'tol-heart' : 'tol-bub') + '"></b>';
      var wash = el('div', { class: 'tol-wash', 'aria-hidden': 'true' }, '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>' + floaters);
      document.documentElement.appendChild(wash);
    }

    var anchor = el('span', { id: 'tol-main', tabindex: '-1' });
    body.insertBefore(anchor, body.firstChild);
    body.insertBefore(bar, body.firstChild);
    body.insertBefore(skip, body.firstChild);
    if (document.querySelector('aside.sidebar')) document.documentElement.classList.add('tol-own-side');
    // Big text or zoom: nothing in the bar is ever pushed off the side. Step by step, the section
    // buttons fold into Menu, then Join moves into the menu panel, then the name wraps onto two lines.
    function fitBar() {
      var html = document.documentElement;
      // the size words really show at: the root size, times the page zoom the Text size setting adds
      var zoomed = parseFloat(getComputedStyle(document.body).zoom) || 1;
      html.classList.toggle('tol-bigtext', parseFloat(getComputedStyle(html).fontSize) * zoomed >= 20);
      bar.classList.remove('is-narrow', 'is-tight', 'is-snug', 'is-tighter', 'is-tightest');
      var name = bar.querySelector('.tol-brand span'), brand = bar.querySelector('.tol-brand'), logo = bar.querySelector('.tol-logo');
      function crowded() {
        var named = name && !bar.classList.contains('is-tighter'); // once the name is tucked away it can't be squeezed
        if (bar.scrollWidth > bar.clientWidth + 1 || (named && name.scrollWidth > name.clientWidth + 1)) return true;
        // the logo squeezed under the next button (big text on a phone) counts too
        if (logo) {
          var lr = logo.getBoundingClientRect().right, nx = brand && brand.nextElementSibling;
          while (nx && !nx.getClientRects().length) nx = nx.nextElementSibling;
          if (nx && lr > nx.getBoundingClientRect().left + 1) return true;
        }
        // the name squeezed into more than two lines (big text on a phone) also counts as crowded
        return !!(named && name.offsetHeight > (parseFloat(getComputedStyle(name).fontSize) || 16) * 2.8);
      }
      // is-snug: Search folds into Menu (the menu panel opens with its own search box), so Settings keeps its word
      // is-tightest (only on the very smallest screens at the biggest text): Settings shows just its picture
      ['is-narrow', 'is-tight', 'is-snug', 'is-tighter', 'is-tightest'].forEach(function (c) { if (crowded()) bar.classList.add(c); });
      if (bar.classList.contains('is-snug')) mob.setAttribute('aria-label', 'Menu and search'); else mob.removeAttribute('aria-label');
    }
    function barHeight() { fitBar(); document.documentElement.style.setProperty('--tol-bar-h', bar.offsetHeight + 'px'); }
    barHeightHook = barHeight;
    barHeight(); window.addEventListener('resize', barHeight);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(barHeight);
    // When the bar takes a big share of a short screen (a phone on its side, zoom, large text), it tucks
    // away as you scroll down and comes straight back when you scroll up or move focus into it.
    var lastY = window.scrollY;
    window.addEventListener('scroll', function () {
      var y = window.scrollY, h = bar.offsetHeight, big = h > window.innerHeight * 0.1;
      if (big && y > lastY + 6 && y > h * 2 && !bar.contains(document.activeElement) && !openDrop && panel.hidden) bar.classList.add('is-tucked');
      else if (!big || y < lastY - 6 || y < h) bar.classList.remove('is-tucked');
      lastY = y;
    }, { passive: true });
    bar.addEventListener('focusin', function () { bar.classList.remove('is-tucked'); });
    body.appendChild(scrim);
    body.appendChild(panel);

    // Pager: previous / next within the same section
    if (here && hereSection && ['book', 'workpapers', 'program'].indexOf(hereSection.id) !== -1) {
      var list = hereSection.items.filter(function (i) { return i.href !== '/index.html' && i.menu !== false && (hereSection.id !== 'book' || isChapter(i)); });
      var idx = list.indexOf(here);
      var prev = list[idx - 1], next = list[idx + 1];
      if (prev || next) {
        var pager = el('div', { class: 'tol-pager', role: 'navigation', 'aria-label': 'Previous and next' });
        if (pl || pr) { pager.style.marginLeft = (-pl) + 'px'; pager.style.marginRight = (-pr) + 'px'; pager.style.maxWidth = 'none'; }
        // Reading in depth? Stay in depth where the next page has a full version too.
        var pagerHref = function (it) { return inDepth && it.deep ? deepHref(it) : it.href; };
        if (prev) pager.appendChild(el('a', { href: pagerHref(prev), class: 'is-prev' },
          '<span class="tol-pager-dir">Previous</span><span class="tol-pager-title">' + esc(label(prev)) + '</span>'));
        if (next) pager.appendChild(el('a', { href: pagerHref(next), class: 'is-next' },
          '<span class="tol-pager-dir">Next</span><span class="tol-pager-title">' + esc(label(next)) + '</span>'));
        body.insertBefore(pager, scrim);
      }
    }

    buildChapterBar();

    var foot = el('div', { class: 'tol-foot', role: 'contentinfo' });
    foot.style.margin = '2rem ' + (-pr) + 'px ' + (-pb) + 'px ' + (-pl) + 'px';
    // The privacy promise, on every page except the dashboard (which saves entries by design)
    var promise = current === '/dashboard.html' ? '' :
      '<p class="tol-promise">What you type into the tools and worksheets stays on your device. It is never collected or sent to us. <a href="/legal/privacy-policy.html#your-entries">How we handle your information</a></p>';
    foot.innerHTML = promise +
      '<span class="tol-foot-brand"><img src="/assets/img/logo-mark.svg" alt="" width="40" height="40">The Objective Ledger &middot; spreadloveandacceptance.com</span>' +
      '<span class="tol-foot-links">' +
        '<a href="/contents.html">All pages</a>' +
        '<a href="/membership.html">Membership</a>' +
        '<a href="/roadmap.html">Roadmap</a>' +
        '<a href="/legal/privacy-policy.html">Privacy</a>' +
        '<a href="/on-this-device.html">Stored on this device</a>' +
        '<a href="/legal/terms-of-service.html">Terms</a>' +
        '<a href="/legal/refund-policy.html">Refunds</a>' +
        '<a href="mailto:' + CONFIG.supportEmail + '">Contact</a>' +
        (isApp() ? '' : '<button type="button" class="tol-install-link">Add to your home screen</button>') +
      '</span>';
    foot.querySelector('.tol-foot-links').appendChild(quietButton('switch'));
    foot.querySelector('.tol-foot-links').appendChild(stillButton());
    foot.querySelector('.tol-foot-links').appendChild(darkButton());
    foot.querySelector('.tol-foot-links').appendChild(settingsButton('tol-foot-set'));
    body.insertBefore(foot, scrim);
    var il = foot.querySelector('.tol-install-link');
    if (il) il.addEventListener('click', showInstall);
    maybeInviteInstall();
  }

  // ---------- Search the site ----------
  // Page titles, headings and text, searched right here in the browser from a small index
  // (assets/js/search-index.js, built by tools/search/build_index.py). Nothing typed leaves the device.
  // It forgives spelling (a letter or two off, swapped letters, words that sound alike, and common
  // slips like "chors" or "wether"), says "Did you mean…", puts the tools first for doing and feeling
  // words ("fight", "chores", "breathe"), and offers the Breathe break and Settings as results too.
  var searchData = null, searchWait = null, vocab = null;
  function loadSearch(cb) {
    if (searchData) return cb(searchData);
    if (searchWait) { searchWait.push(cb); return; }
    searchWait = [cb];
    var sc = document.createElement('script'); sc.src = '/assets/js/search-index.js';
    sc.onload = function () { searchData = (window.TOL_SEARCH && window.TOL_SEARCH.pages) || []; prepSearch(searchData); var w = searchWait; searchWait = null; w.forEach(function (f) { f(searchData); }); };
    sc.onerror = function () { var w = searchWait; searchWait = null; searchData = null; w.forEach(function (f) { f(null); }); };
    document.head.appendChild(sc);
  }
  function fold(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'"); }
  function reEsc(t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  var STOP = { the: 1, and: 1, for: 1, with: 1, how: 1, what: 1, can: 1, you: 1, your: 1, are: 1, was: 1, when: 1, why: 1, who: 1, does: 1, just: 1, had: 1, have: 1, into: 1, from: 1, this: 1, that: 1, about: 1, get: 1, its: 1, too: 1, very: 1, some: 1, any: 1, all: 1, our: 1, out: 1, but: 1, not: 1, him: 1, her: 1, she: 1, they: 1, them: 1, his: 1, one: 1, did: 1, i: 1, me: 1, my: 1, to: 1, of: 1, in: 1, on: 1, at: 1, is: 1, it: 1, an: 1, a: 1, do: 1, be: 1, or: 1, so: 1, we: 1, us: 1, am: 1, im: 1 };
  function searchTerms(q) {
    var f = fold(q).replace(/\s+·\s+spread love.*$/, '');
    Object.keys(JOIN).forEach(function (k) { f = f.replace(new RegExp('\\b' + k.replace(/ /g, '\\s+') + '\\b', 'g'), JOIN[k]); });
    var all = f.split(/[^a-z0-9'-]+/).filter(function (t) { return t.length > 1 || /\d/.test(t); });
    var kept = all.filter(function (t) { return !STOP[t.replace(/'/g, '')]; });
    return kept.length ? kept : all;
  }
  // common slips, fixed straight away
  var SLIPS = { chors: 'chores', chorse: 'chores', choirs: 'chores', unbiled: 'unbilled', unbilld: 'unbilled', wether: 'weather', wheather: 'weather',
    crosword: 'crossword', crossward: 'crossword', tierd: 'tired', tird: 'tired', slep: 'sleep', sleap: 'sleep', fihgt: 'fight', figth: 'fight', fite: 'fight',
    gardn: 'garden', gardin: 'garden', profesor: 'professor', proffesor: 'professor', clam: 'calm', calme: 'calm', anxity: 'anxiety', anxeity: 'anxiety', anxios: 'anxious',
    burnot: 'burnout', burnout: 'burnout', brethe: 'breathe', breath: 'breathe', breth: 'breathe', relashionship: 'relationship', relationshp: 'relationship',
    arguement: 'argument', argueing: 'arguing', freqency: 'frequency', frequncy: 'frequency', glosary: 'glossary', dyslexic: 'dyslexia', dislexia: 'dyslexia', dyslexsia: 'dyslexia',
    austism: 'autism', autisim: 'autism', adhd: 'adhd', lemonaid: 'lemonade', parnter: 'partner', patner: 'partner', stresed: 'stressed', overwelmed: 'overwhelmed', overwhelmd: 'overwhelmed',
    batery: 'battery', batterie: 'battery', puddels: 'puddles', translater: 'translator', decodor: 'decoder', wieght: 'weight', seperate: 'separate', definately: 'definitely',
    // slips people told us about: the nearest word on the site isn't the one they meant
    devorce: 'divorce', divorse: 'divorce', devorse: 'divorce', divoce: 'divorce', diverce: 'divorce', divorced: 'divorce', seperated: 'separated', seperation: 'separation',
    sory: 'sorry', sorrie: 'sorry', sorry: 'sorry', appology: 'apology', apolgy: 'apology', apologise: 'apologize', appologize: 'apologize', apologyze: 'apologize',
    pupppy: 'puppy', puppey: 'puppy', puppie: 'puppy', puppies: 'puppy', pupy: 'puppy', doggy: 'dog', doggie: 'dog', dogs: 'dog', tidbitt: 'tidbit', sugerfoot: 'sugarfoot', sugarfut: 'sugarfoot',
    screenshots: 'screenshot', screensot: 'screenshot', screnshot: 'screenshot', sreenshot: 'screenshot', childhod: 'childhood', chilhood: 'childhood', childood: 'childhood',
    forgetfull: 'forgetful', forgot: 'forgot', rember: 'remember', remeber: 'remember', focuss: 'focus', foccus: 'focus', concentrait: 'concentrate', meltdowns: 'meltdown', meltown: 'meltdown' };
  // two words people often split that the site writes as one ("screen shot" → screenshot)
  var JOIN = { 'screen shot': 'screenshot', 'screen shots': 'screenshot', 'melt down': 'meltdown', 'shut down': 'shutdown', 'grown up': 'grown-up', 'grew up': 'growing up', 'brought up': 'growing up' };
  // words that mean the same here: each term also matches these
  var SAME = { autism: ['autistic', 'neurodivergent', 'wired differently', 'wiring', 'neurotype'], autistic: ['autism', 'neurodivergent', 'wired differently', 'wiring'],
    adhd: ['neurodivergent', 'wired differently', 'wiring', 'attention'], dyslexia: ['easy reading', 'text size'], neurodivergent: ['wired differently', 'wiring'],
    chores: ['chore', 'housework', 'jobs', 'owner'], housework: ['chores', 'jobs'], fight: ['argument', 'conflict', 'sideways', 'row'], argument: ['fight', 'conflict'], arguing: ['fight', 'argument', 'conflict'],
    calm: ['settle', 'calm-down', 'breathe', 'soothe'], anxiety: ['worry', 'anxious', 'calm', 'stress'], anxious: ['worry', 'anxiety', 'calm'], tired: ['battery', 'rest', 'sleep', 'drained'],
    sleep: ['rest', 'tired', 'night'], burnout: ['battery', 'drained', 'overload', 'load'], stress: ['battery', 'pressure', 'load'], stressed: ['stress', 'battery', 'pressure'],
    overwhelmed: ['battery', 'calm', 'overload'], weather: ['forecast', 'today'], breathe: ['breathing', 'breath', 'calm'],
    bigger: ['text size', 'larger'], font: ['text size', 'easy reading'], erase: ['delete', 'stored', 'device'], delete: ['erase', 'stored'], privacy: ['private', 'device', 'stored'],
    unbilled: ['invisible work', 'unseen work', 'work nobody sees'], invisible: ['unseen', 'unbilled'], partner: ['partners', 'couple'], text: ['message'], message: ['text', 'words'],
    divorce: ['separation', 'separated', 'co-parent', 'co-parents', 'ex'], separated: ['divorce', 'co-parent'], separation: ['divorce', 'co-parent'],
    sorry: ['apology', 'apologize', 'repair', 'make up'], apology: ['sorry', 'apologize', 'repair'], apologize: ['apology', 'sorry', 'repair'], repair: ['apology', 'sorry'],
    puppy: ['pups', 'pup', 'tidbit', 'sugarfoot', 'pal cam'], pup: ['pups', 'tidbit', 'sugarfoot', 'pal cam'], dog: ['pups', 'pup', 'tidbit', 'sugarfoot'], pups: ['pup', 'tidbit', 'sugarfoot', 'pal cam'],
    screenshot: ['screenshots', 'screen shot', 'picture of the chat'], childhood: ['growing up', 'grew up', 'lens', 'rulebook', 'parents'], raised: ['growing up', 'childhood', 'rulebook from home', 'lens'],
    upbringing: ['growing up', 'childhood', 'rulebook'], parents: ['growing up', 'family'],
    forgot: ['forget', 'remember', 'reminder', 'owner', 'slipped'], forget: ['forgot', 'remember', 'reminder'], remember: ['reminder', 'forgot'], bill: ['bills', 'money', 'owner'], bills: ['bill', 'money', 'owner'],
    focus: ['attention', 'concentrate', 'distracted', 'easy reading', 'reading ruler', 'steps'], attention: ['focus', 'adhd'], distracted: ['focus', 'attention'], concentrate: ['focus', 'attention'],
    meltdown: ['shutdown', 'overload', 'calm-down', 'sensory'], shutdown: ['meltdown', 'overload', 'shut down'], blunt: ['direct', 'literal', 'wired differently'] };
  // doing and feeling words: the tools that help come first
  var ACT = {
    fight: ['/conversation-reader.html', '/carrier-wave-decoder.html', '/signal-translator.html', '/workpapers/wp-09-tone-filter.html'],
    argument: 'fight', arguing: 'fight', argue: 'fight', conflict: 'fight', snapped: 'fight', yelled: 'fight', upset: 'fight', sideways: 'fight', row: 'fight',
    chores: ['/lemonade-stand.html', '/workpapers/wp-03-raci-treaty.html', '/workpapers/wp-01.html'], chore: 'chores', housework: 'chores', dishes: 'chores', laundry: 'chores', cleaning: 'chores', split: 'chores', fair: 'chores',
    breathe: ['#breathe', '/wp-11.html', '/night-garden.html', '/soundscapes.html'], breathing: 'breathe', breath: 'breathe',
    calm: ['#breathe', '/wp-11.html', '/night-garden.html', '/calm-visualizer.html', '/soundscapes.html'], relax: 'calm', settle: 'calm', soothe: 'calm', anxiety: 'calm', anxious: 'calm', worry: 'calm', overwhelmed: 'calm', stress: 'calm', stressed: 'calm', panic: 'calm',
    tired: ['/quick-checks.html', '/workpapers/wp-02-battery-stress-meter.html', '/wp-11.html'], exhausted: 'tired', drained: 'tired', burnout: 'tired', battery: 'tired', sleep: ['/soundscapes.html', '/night-garden.html', '#breathe'],
    weather: ['/quick-checks.html'], mood: 'weather', feeling: 'weather', today: 'weather', forecast: 'weather',
    message: ['/signal-translator.html', '/workpapers/wp-09-tone-filter.html', '/conversation-reader.html'], text: 'message', say: 'message', words: 'message', email: 'message',
    game: ['/pause-and-play.html'], games: 'game', play: 'game', puzzle: 'game',
    autism: ['/wired-differently.html', '/wiring-card.html', '/know-yourself.html'], autistic: 'autism', adhd: 'autism', neurodivergent: 'autism', wiring: 'autism', sensory: 'autism',
    dyslexia: ['#settings', '/wired-differently.html'], listen: ['#settings'], aloud: ['#settings'], read: null, larger: ['#settings'], size: ['#settings'], bigger: ['#settings'], font: ['#settings'], quiet: ['#settings'], dark: ['#settings'], settings: ['#settings'],
    erase: ['/on-this-device.html'], delete: ['/on-this-device.html'], stored: ['/on-this-device.html'], privacy: ['/on-this-device.html', '/legal/privacy-policy.html'],
    minutes: ['/start-in-10-minutes.html', '/quick-checks.html'], start: ['/start-here.html', '/start-in-10-minutes.html'],
    chat: ['/ask.html'], ask: ['/ask.html'], question: ['/ask.html'], professor: ['/ask.html'],
    divorce: ['/relationships.html', '/library/life.html', '/check-ins.html', '/signal-translator.html'], separated: 'divorce', separation: 'divorce', ex: 'divorce', coparent: 'divorce',
    sorry: ['/library/conflict.html', '/signal-translator.html', '/conversation-reader.html', '/workpapers/wp-09-tone-filter.html'], apology: 'sorry', apologize: 'sorry', repair: 'sorry', forgive: 'sorry',
    puppy: ['#palcam', '/frequency-buddies.html', '/frequency-journey.html', '/pal-cam-tv.html'], pup: 'puppy', pups: 'puppy', dog: 'puppy', tidbit: 'puppy', sugarfoot: 'puppy',
    screenshot: ['/conversation-reader.html'],
    childhood: ['/growing-up.html', '/growing-up-in-depth.html', '/know-yourself.html'], raised: 'childhood', upbringing: 'childhood', parents: 'childhood', grew: 'childhood', growing: 'childhood', family: ['/growing-up.html', '/relationships.html'],
    forgot: ['/workpapers/wp-03-raci-treaty.html', '/signal-translator.html', '/lemonade-stand.html', '/ask.html'], forget: 'forgot', remember: 'forgot', reminder: 'forgot', bill: ['/workpapers/wp-03-raci-treaty.html', '/lemonade-stand.html', '/signal-translator.html'], bills: 'bill',
    focus: ['#settings', '/start-in-10-minutes.html', '#breathe', '/quick-checks.html'], attention: 'focus', distracted: 'focus', concentrate: 'focus',
    meltdown: ['/wp-11.html', '#breathe', '/wiring-card.html', '/wired-differently.html'], shutdown: 'meltdown', overload: 'meltdown',
    blunt: ['/wired-differently.html', '/signal-translator.html', '/wiring-card.html'],
    mad: 'fight', angry: 'fight', annoyed: 'fight', frustrated: 'fight'
  };
  function actFor(t) { var v = ACT[t]; if (typeof v === 'string') v = ACT[v]; return v || null; }
  // results that aren't pages
  var EXTRA = {
    '#breathe': { u: '#breathe', t: 'Breathe: a breathing break', d: 'Opens right here, on top of this page: box breathing, calm breathing or 4-7-8, for one, three or five minutes, with or without sound.', k: 'Tool' },
    '#settings': { u: '#settings', t: 'Settings: text size, Easy reading, Quiet mode', d: 'Bigger text, an easy-to-read font, roomy spacing, a page tint, a reading ruler, dark mode, Quiet mode and site sounds. Long pages also have “In short” and “Show me only the steps”.', k: 'Settings' },
    '#palcam': { u: '#palcam', t: 'Check in on Tidbit & Sugarfoot (the pal cam)', d: 'Opens right here: a peek at the two pups, Tidbit and Sugarfoot, with little captions. You can turn the sound off.', k: 'Pups' }
  };
  var TOOL_URL = /^\/(conversation-reader|carrier-wave-decoder|signal-translator|lemonade-stand|wiring-card|quick-checks|ask|night-garden|calm-visualizer|soundscapes|pause-and-play|word-bloom|quiet-words|quiet-crossword|daily-ledger-crossword|frequency-journey|start-in-10-minutes|on-this-device)\.html$|^\/workpapers\/(wp-|calculators|fill)|^\/wp-11\.html$|^\/tools\//;

  // the words the site uses, with how often, for "Did you mean"
  function prepSearch(list) {
    vocab = {};
    list.forEach(function (p) {
      p.t = String(p.t || '').replace(/\s*[·|–—-]\s*Spread Love (&|&amp;|and) Acceptance\s*$/i, '');
      var strong = fold(p.t + ' ' + (p.h || '') + ' ' + (p.s || []).join(' ') + ' ' + (p.d || '')), weak = fold(p.x || '');
      strong.split(/[^a-z0-9'-]+/).forEach(function (w) { if (w.length > 2) vocab[w] = (vocab[w] || 0) + 5; });
      weak.split(/[^a-z0-9'-]+/).forEach(function (w) { if (w.length > 2) vocab[w] = (vocab[w] || 0) + 1; });
      p._title = fold(p.t + ' ' + (p.h || '')); p._heads = fold((p.s || []).join(' · ')); p._desc = fold(p.d); p._text = weak;
    });
    Object.keys(SLIPS).forEach(function (k) { if (vocab[k] && k !== SLIPS[k]) delete vocab[k]; });
  }
  // Damerau-Levenshtein, stopping early once it's past the limit
  function editDist(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (j = 0; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) {
      var best = 1e9;
      for (j = 1; j <= b.length; j++) {
        var c = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        if (d[i][j] < best) best = d[i][j];
      }
      if (best > max) return max + 1;
    }
    return d[a.length][b.length];
  }
  // a rough sound-alike key (Soundex)
  function sound(w) {
    var codes = { b: 1, f: 1, p: 1, v: 1, c: 2, g: 2, j: 2, k: 2, q: 2, s: 2, x: 2, z: 2, d: 3, t: 3, l: 4, m: 5, n: 5, r: 6 };
    w = w.replace(/[^a-z]/g, ''); if (!w) return '';
    var out = w[0], last = codes[w[0]] || 0;
    for (var i = 1; i < w.length && out.length < 4; i++) { var c = codes[w[i]] || 0; if (c && c !== last) out += c; if (w[i] !== 'h' && w[i] !== 'w') last = c; }
    return (out + '000').slice(0, 4);
  }
  function known(t) {
    if (!vocab) return true;
    if (vocab[t] || ACT[t] || SAME[t]) return true;
    if (t.length >= 3) for (var w in vocab) if (w.indexOf(t) === 0) return true;
    return false;
  }
  function correct(t) {
    if (SLIPS[t] && SLIPS[t] !== t) return SLIPS[t];
    if (/\d/.test(t) || t.length < 3 || known(t)) return null;
    var max = t.length <= 4 ? 1 : 2, st = sound(t), best = null, bestScore = -1e9;
    for (var w in vocab) {
      if (Math.abs(w.length - t.length) > max) continue;
      var dist = editDist(t, w, max); if (dist > max) continue;
      var score = -dist * 10 + (sound(w) === st ? 6 : 0) + (w[0] === t[0] ? 3 : 0) + Math.min(6, Math.log(vocab[w] + 1) * 1.5);
      if (score > bestScore) { bestScore = score; best = w; }
    }
    return best;
  }
  // how well one word matches a piece of text: the whole word (or its start) counts fully, the middle of
  // another word ("static" inside "allostatic") only a little
  function hitIn(text, t) {
    var at = text.indexOf(t); if (at === -1) return 0;
    return new RegExp('(^|[^a-z0-9])' + reEsc(t)).test(text) ? 1 : 0.25;
  }
  function termScore(p, t) {
    var s = 0, h;
    if ((h = hitIn(p._title, t))) s += (12 + (new RegExp('(^|[^a-z0-9])' + reEsc(t) + '($|[^a-z0-9])').test(p._title) ? 8 : 0)) * h;
    if ((h = hitIn(p._heads, t))) s += 5 * h;
    if ((h = hitIn(p._desc, t))) s += 3 * h;
    if ((h = hitIn(p._text, t))) s += (1 + Math.min(3, p._text.split(t).length - 2)) * h;
    return s;
  }
  function searchPages(list, q, termsIn) {
    var terms = termsIn || searchTerms(q);
    if (!terms.length) return [];
    var out = [], boost = {};
    terms.forEach(function (t) {
      var a = actFor(t) || (t.length > 4 && /s$/.test(t) && actFor(t.slice(0, -1)));
      if (a) a.forEach(function (u, i) { boost[u] = Math.max(boost[u] || 0, 60 - i * 6); });
    });
    list.forEach(function (p) {
      var score = 0, hits = 0;
      terms.forEach(function (t) {
        var alts = [t].concat(SAME[t] || []);
        if (t.length > 4 && /s$/.test(t)) alts.push(t.slice(0, -1));
        var s = 0; alts.forEach(function (a, i) { s = Math.max(s, termScore(p, a) * (i ? 0.7 : 1)); });
        if (s) hits++;
        score += s;
      });
      var b = boost[p.u] || 0;
      if (!b && hits < terms.length) return;                  // every word has to be there, unless it's a helpful tool
      if (b && TOOL_URL.test(p.u)) b += 10;
      score += b;
      if (score) out.push({ p: p, score: score - (p.f ? 2 : 0) + (TOOL_URL.test(p.u) && score > 8 ? 3 : 0) });
    });
    Object.keys(EXTRA).forEach(function (u) { if (boost[u]) out.push({ p: EXTRA[u], score: boost[u] + 20 }); });
    return out.sort(function (a, b) { return b.score - a.score; }).slice(0, 25);
  }
  function snippet(p, terms) {
    var src = p.x || p.d || '', low = fold(src), at = -1;
    terms.some(function (t) { var m = new RegExp('(^|[^a-z0-9])' + reEsc(t)).exec(low); at = m ? m.index + m[1].length : low.indexOf(t); return at !== -1; });
    if (at === -1) return p.d || cut(src, 0, 150);
    return cut(src, Math.max(0, at - 60), at + 110);
  }
  // cut at whole words, with a "…" where it was cut
  function cut(src, from, to) {
    if (from > 0) { var sp = src.indexOf(' ', from); from = sp === -1 || sp > from + 25 ? from : sp + 1; }
    if (to < src.length) { var sp2 = src.lastIndexOf(' ', to); if (sp2 > from + 40) to = sp2; }
    return (from > 0 ? '…' : '') + src.slice(from, to).trim() + (to < src.length ? '…' : '');
  }
  function markTerms(text, terms) {
    var h = esc(text);
    terms.forEach(function (t) { if (t.length > 1) h = h.replace(new RegExp('(^|[^a-z0-9&;])(' + reEsc(t) + ')', 'ig'), '$1<mark>$2</mark>'); });
    return h;
  }
  function smartSearch(data, q) {
    var terms = searchTerms(q), fixed = terms.map(function (t) { return correct(t) || t; }), changed = fixed.join(' ') !== terms.join(' ');
    var hits = searchPages(data, q, terms), used = terms, auto = false;
    if (changed) {
      var better = searchPages(data, q, fixed);
      // nothing (or very little) for the words as typed: show the corrected search straight away
      if (!hits.length || (better.length && better[0].score > (hits[0] ? hits[0].score * 1.5 : 0))) { hits = better; used = fixed; auto = true; }
    }
    return { hits: hits, used: used, fixed: fixed, changed: changed, auto: auto };
  }
  var runSearch = function () {};
  function buildSearch() {
    var box = el('div', { class: 'tol-find', role: 'search' },
      '<label for="tol-find-q">Search the site</label>' +
      '<input id="tol-find-q" type="search" autocomplete="off" spellcheck="true" enterkeyhint="search" placeholder="A word or two, like “chores” or “calm down”" aria-describedby="tol-find-note">' +
      '<p class="tol-find-note" id="tol-find-note" aria-live="polite">Searches every page’s title and words, right here on your device. Spelling doesn’t need to be perfect.</p>' +
      '<ol class="tol-find-results" hidden></ol>');
    var input = box.querySelector('input'), note = box.querySelector('.tol-find-note'), list = box.querySelector('.tol-find-results'), timer = null;
    runSearch = function (q) {
      q = String(q || '').trim();
      var idx = panel && panel.querySelector('.tol-index');
      if (!q) { list.hidden = true; list.innerHTML = ''; note.textContent = 'Searches every page’s title and words, right here on your device. Spelling doesn’t need to be perfect.'; if (idx) idx.hidden = false; return; }
      loadSearch(function (data) {
        if (input.value.trim() !== q) return;
        if (!data) { note.textContent = 'Search isn’t available just now. The full list of pages is below.'; if (idx) idx.hidden = false; return; }
        var R = smartSearch(data, q), hits = R.hits, used = R.used, fixed = R.fixed, changed = R.changed, auto = R.auto;
        if (idx) idx.hidden = !!hits.length;
        list.hidden = !hits.length;
        list.innerHTML = hits.map(function (h) {
          var p = h.p, act = p.u.charAt(0) === '#';
          var kind = act ? p.k : TOOL_URL.test(p.u) ? 'Tool' : '';
          return '<li><a href="' + esc(act ? '#' : p.u) + '"' + (act ? ' data-find-act="' + esc(p.u.slice(1)) + '"' : '') + '><span class="tol-find-t">' + markTerms(p.t, used) +
            (kind ? ' <small class="tol-find-kind">' + esc(kind) + '</small>' : '') + (p.f ? ' <small>Full version</small>' : '') + '</span>' +
            '<span class="tol-find-s">' + markTerms(act ? p.d : snippet(p, used), used) + '</span></a></li>';
        }).join('');
        var said = '“' + (auto ? fixed.join(' ') : q) + '”';
        var head = hits.length ? (hits.length === 25 ? 'The 25 best matches for ' + said + '.' : hits.length + (hits.length === 1 ? ' result for ' : ' results for ') + said + '.')
          : 'Nothing matches “' + q + '” yet. Try a shorter or different word, browse the sections below, or ask Professor Puddles in your own words.';
        note.innerHTML = '';
        if (auto) note.appendChild(document.createTextNode('Showing results for “' + fixed.join(' ') + '” (you typed “' + q + '”). '));
        note.appendChild(document.createTextNode(auto ? (hits.length === 25 ? 'The 25 best matches.' : hits.length + (hits.length === 1 ? ' result.' : ' results.')) : head));
        if (!hits.length || hits.length < 3) { note.appendChild(document.createTextNode(' ')); note.appendChild(el('a', { href: '/ask.html', class: 'tol-find-ask' }, 'Ask Professor Puddles')); }
        if (changed && !auto) {
          var dym = el('button', { type: 'button', class: 'tol-find-dym' }, 'Did you mean “' + esc(fixed.join(' ')) + '”?');
          dym.addEventListener('click', function () { input.value = fixed.join(' '); runSearch(input.value); input.focus(); });
          note.appendChild(document.createTextNode(' ')); note.appendChild(dym);
        }
      });
    };
    list.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-find-act]'); if (!a) return;
      e.preventDefault();
      var what = a.getAttribute('data-find-act');
      closePanel();
      if (what === 'breathe') { var b = document.querySelector('.tol-breathe-btn'); if (b) b.click(); }
      if (what === 'settings') openSettings();
      if (what === 'palcam' && window.TOLPalCam) window.TOLPalCam.open({});
    });
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { runSearch(input.value); }, 140); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); var first = list.querySelector('a'); if (first) first.focus(); }
      if (e.key === 'Escape' && input.value) { e.stopPropagation(); input.value = ''; runSearch(''); }
    });
    return box;
  }
  // for other pages (the 404 page, the glossary): TOLSearch.find('words', function (pages, fixedWords) {...})
  window.TOLSearch = { load: loadSearch, correct: function (w) { return correct(fold(w)) || null; },
    find: function (q, cb) { loadSearch(function (d) { if (!d) return cb([], q); var R = smartSearch(d, q); cb(R.hits.map(function (x) { return x.p; }), R.used.join(' ')); }); } };

  // ---------- "Chapter N of 6": where you are in the book, with every chapter one tap away ----------
  function isChapter(it) { return /^\/book\/(preface|chapter-\d)\.html$/.test(it.href); }
  function buildChapterBar() {
    if (!here || !isChapter(here)) return;
    var main = document.querySelector('main'); if (!main) return;
    var book = SECTIONS.filter(function (x) { return x.id === 'book'; })[0].items.filter(isChapter);
    var at = book.indexOf(here); if (at < 0) return;
    var nav = el('nav', { class: 'tol-chbar no-bubble', 'aria-label': 'Chapters of the book' });
    var items = book.map(function (it, i) {
      var name = it.code === 'Preface' ? 'Preface' : 'Chapter ' + it.code;
      var href = inDepth && it.deep ? deepHref(it) : it.href;
      return '<li><a href="' + href + '"' + (i === at ? ' aria-current="page"' : '') + ' title="' + esc(name + ': ' + it.title) + '">' +
        '<span aria-hidden="true">' + (it.code === 'Preface' ? 'P' : esc(it.code)) + '</span><span class="sr-only">' + esc(name + ': ' + it.title) + '</span></a></li>';
    }).join('');
    // one way of counting, the book's own: the Preface, then Chapters I to V
    var last = book[book.length - 1].code;
    nav.innerHTML = '<p class="tol-chbar-k">' + (here.code === 'Preface' ? 'The Preface<span> · before Chapter I</span>' : 'Chapter ' + esc(here.code) + ' <span>of ' + esc(last) + '</span>') + '</p><ol>' + items + '</ol>' +
      '<p class="tol-chbar-nav">' + (at > 0 ? '<a href="' + (inDepth && book[at - 1].deep ? deepHref(book[at - 1]) : book[at - 1].href) + '" rel="prev">&larr; Previous</a>' : '') +
      (at < book.length - 1 ? '<a href="' + (inDepth && book[at + 1].deep ? deepHref(book[at + 1]) : book[at + 1].href) + '" rel="next">Next &rarr;</a>' : '<a href="/prog-01.html">Next: six gentle weeks &rarr;</a>') + '</p>';
    var head = main.querySelector('.read-head');
    if (head) head.appendChild(nav); else main.insertBefore(nav, main.firstChild);
  }

  // ---------- Breathe with me ----------
  // Six slow breaths, in for 4 seconds and out for 6 (about six a minute). Nothing is saved.
  // ---------- One garden for the whole site ----------
  // Finishing a breathing session, a word puzzle, a Turning Toward day or a weather check-in
  // plants a flower in the Night Garden, which blooms on the next visit. Kept in this browser.
  window.TOLGarden = {
    gift: function (source) {
      var g = { count: 0, from: {} };
      try { g = JSON.parse(lsGet('tol-garden-gifts') || '') || g; } catch (e) {}
      g.count = Math.min(24, (g.count || 0) + 1); g.from = g.from || {}; g.from[source] = (g.from[source] || 0) + 1;
      lsSet('tol-garden-gifts', JSON.stringify(g));
      if (current !== '/night-garden.html') plantedNote();
    }
  };
  function plantedNote() {
    var n = el('a', { class: 'tol-planted', href: '/night-garden.html', role: 'status' }, '<span aria-hidden="true">&#127800;</span> A flower was planted in your Night Garden');
    document.body.appendChild(n);
    requestAnimationFrame(function () { n.classList.add('is-in'); });
    setTimeout(function () { n.classList.remove('is-in'); setTimeout(function () { n.remove(); }, 600); }, 4200);
  }

  // ---------- Things drift softly into place as you scroll to them ----------
  function revealOnScroll() {
    if (!('IntersectionObserver' in window) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    var items = document.querySelectorAll('main .ideas > li, main .scene, main .try-this, main .tol-tip, main .tt-card, main .tt-week-wrap, main .track-card, main .live-card, main .off-list li, main .tol-welcome');
    if (!items.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, delay = +(el.getAttribute('data-reveal-i') || 0) % 4 * 90;
        setTimeout(function () { el.classList.add('is-in'); }, delay);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    Array.prototype.forEach.call(items, function (el, i) {
      // anything already on screen when the page opens just appears, so nothing flickers
      var r = el.getBoundingClientRect(); if (r.top < window.innerHeight * 0.9) return;
      el.setAttribute('data-reveal-i', i); el.classList.add('tol-reveal'); io.observe(el);
    });
  }

  // ---------- Little tips for the day ----------
  // One small, practical tip near the end of each content page. It changes each day, differs
  // from page to page, and "Another tip" shows a new one.
  var TIPS = [
    ['Name the feeling.', 'Saying “I’m frustrated” out loud, or just in your head, takes some of the heat out of it.'],
    ['Three breaths before you reply.', 'When a message stings, wait three slow breaths before answering. Your reply will likely be kinder, and so will the one you get back.'],
    ['Check the basics first.', 'Snapping at everyone? Ask yourself: am I hungry, thirsty, lonely or tired? Fix that first, then decide if the problem is still a problem.'],
    ['Five minutes of daylight.', 'Step outside for a few minutes, especially in the morning. Daylight helps you wake up and can lift your mood.'],
    ['Write tomorrow’s top three tonight.', 'Putting tomorrow’s to-dos on paper before bed helps your mind let go of them.'],
    ['Start with what’s going well.', 'Before a hard conversation, say one thing you appreciate. It helps the other person hear the rest.'],
    ['Try “Can you help me with…?”', 'It lands much more softly than “You never…,” and it asks for something they can actually do.'],
    ['The two-minute rule.', 'If a job takes less than two minutes, do it now. Small things stop piling up.'],
    ['Phone in another room.', 'For the first ten minutes after you get home, leave your phone somewhere else and say hello properly.'],
    ['Ask about good news.', 'When someone shares something good, ask one question about it. It’s one of the simplest ways to feel closer.'],
    ['Drop your shoulders.', 'Right now: let your shoulders fall away from your ears and unclench your jaw. Check again in an hour.'],
    ['A ten-minute walk.', 'A short walk, even around the block, can lift your mood and clear your head.'],
    ['Rest your eyes.', 'Every twenty minutes of screen time, look at something far away for twenty seconds.'],
    ['Park a looping worry.', 'If a worry keeps circling, write it down with one small next step. Then let the paper hold it.'],
    ['Say one small thank-you.', 'Thank someone today for something tiny and specific. It costs nothing and it’s remembered.'],
    ['Three things that went okay.', 'Before sleep, name three things that went okay today. Small things count. It trains your attention toward the good.'],
    ['Breathe out longer.', 'When you feel wound up, make each breath out a little longer than the breath in. It tells your body it’s safe.'],
    ['Send a “thinking of you” text.', 'Text someone you care about. No reason needed, no reply expected. It takes ten seconds.'],
    ['Decide one thing you won’t do today.', 'Protecting your energy is easier when you choose in advance what can wait.'],
    ['Give yourself a doorway minute.', 'Between work mode and home mode, take a minute or two to switch: a song, a short walk, a cup of tea.'],
    ['Shrink the task.', 'Overwhelmed? Ask: what’s the very next physical step? Do only that.'],
    ['Help or an ear?', 'Before giving advice, ask: “Do you want help, or do you just want me to listen?”'],
    ['Cool water, calm body.', 'When feelings run high, splash some cool water on your face. It can help you feel steadier.'],
    ['Book the worry.', 'Set aside ten minutes for a worry later today, instead of letting it follow you around all day.'],
    ['Name a time to come back.', 'If a talk gets too hot, say “I need a minute. Can we come back at 8?” A pause with a time is not walking away.'],
    ['Five things you can see.', 'Feeling scattered? Name five things you can see right now. It pulls you back into the present.'],
    ['Laugh together.', 'Sharing a laugh, even at something silly, is a small repair after a tense day.'],
    ['Short sleep, gentle day.', 'After a poor night, go easy on big decisions and hard talks. Your battery really is lower.'],
    ['Lower your voice.', 'When things heat up, speak a little softer and slower. People tend to match the tone they hear.'],
    ['Make it easy to do.', 'Put what you need where you’ll see it: the book on your pillow, the water bottle on your desk.'],
    ['Take one thing off the list.', 'On purpose. A lighter day is still a good day.'],
    ['Drink some water.', 'Even mild thirst can make you feel tired and irritable. Have a glass before your next coffee.'],
    ['Assume a good reason.', 'When someone is short with you, try assuming they’re having a hard day before assuming they mean it.'],
    ['Celebrate small wins.', 'Finished something? Pause for a second and notice it before rushing on.'],
    ['One kind word to yourself.', 'Talk to yourself the way you’d talk to a friend who’s having a rough day.'],
    ['Stretch for a minute.', 'Stand up, reach for the ceiling, roll your neck. Your body often holds on to stress your mind has moved past.'],
    ['Say what you need, not what they did wrong.', '“I need ten quiet minutes” gets a better answer than “You’re so loud.”'],
    ['Put a pause before “yes.”', 'Try “Let me check and get back to you.” It keeps you from saying yes to too much.'],
    ['Hug a little longer.', 'A slow six-second hug helps both of you settle.'],
    ['Leave it better than you found it.', 'Tidy one small spot before you leave a room. Tomorrow’s you will be grateful.']
  ];
  var NO_TIPS = ['/index.html', '/night-garden.html', '/dashboard.html', '/404.html', '/offline.html'];
  // The full library (about 300 tips in topics) lives in tips.js and loads when a tip is shown;
  // the short list above is the fallback. Pages lean toward topics that fit them.
  var TIP_TOPICS = {
    self: ['calm', 'body', 'mind', 'selftalk', 'rest', 'sleep'], relationships: ['connection', 'talking', 'family', 'friends', 'kindness'],
    book: ['connection', 'talking', 'home', 'kindness'], workpapers: ['home', 'talking', 'work', 'connection'], program: ['home', 'talking', 'work'],
    tools: ['focus', 'calm', 'talking', 'mind'], media: ['rest', 'calm', 'outdoors', 'sleep'], start: null, about: null
  };
  var tipLib = null, tipWaiting = [];
  window.TOLTips = {
    // cb([title, body, topicLabel]) with a tip from the library, preferring the given topics
    get: function (topics, cb, seed) {
      function pick() {
        var L = tipLib, list = L.tips, pool = topics ? list.filter(function (t) { return topics.indexOf(t[0]) !== -1; }) : list;
        if (!pool.length || (topics && Math.random() < 0.25 && seed == null)) pool = list;
        var t = pool[seed != null ? seed % pool.length : Math.floor(Math.random() * pool.length)];
        cb([t[1], t[2], L.cats[t[0]] || '']);
      }
      if (tipLib) return pick();
      tipWaiting.push(pick);
      if (tipWaiting.length > 1) return;
      var sc = document.createElement('script'); sc.src = '/assets/js/tips.js';
      sc.onload = function () { tipLib = window.TOL_TIPS && window.TOL_TIPS.tips && window.TOL_TIPS.tips.length ? window.TOL_TIPS : { cats: {}, tips: TIPS.map(function (x) { return ['', x[0], x[1]]; }) }; var w = tipWaiting; tipWaiting = []; w.forEach(function (f) { f(); }); };
      sc.onerror = function () { tipLib = { cats: {}, tips: TIPS.map(function (x) { return ['', x[0], x[1]]; }) }; var w = tipWaiting; tipWaiting = []; w.forEach(function (f) { f(); }); };
      document.head.appendChild(sc);
    }
  };
  function addTip(body) {
    if (body.hasAttribute('data-no-tip') || NO_TIPS.indexOf(current) !== -1 || /^\/legal\//.test(current)) return;
    var main = document.querySelector('main'); if (!main) return;
    var d = new Date(), seed = d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate();
    for (var i = 0; i < current.length; i++) seed = (seed * 31 + current.charCodeAt(i)) % 100003;
    var sec = body.getAttribute('data-sec'), topics = TIP_TOPICS[sec] || null;
    var card = el('aside', { class: 'tol-tip', 'aria-label': 'A little tip for today' },
      '<img src="/assets/img/mascots/bubble-buddy.svg" alt="" width="52" height="52">' +
      '<div><p class="tol-tip-k">Little tip for today<span class="tol-tip-topic"></span></p><p class="tol-tip-h"></p><p class="tol-tip-b"></p>' +
      '<button type="button" class="tol-tip-next">Another tip</button></div>');
    function show(t) {
      card.querySelector('.tol-tip-h').textContent = t[0]; card.querySelector('.tol-tip-b').textContent = t[1];
      card.querySelector('.tol-tip-topic').textContent = t[2] ? ' · ' + t[2] : '';
    }
    var first = TIPS[seed % TIPS.length]; show([first[0], first[1], '']);   // shows at once, then the library takes over
    window.TOLTips.get(topics, show, seed);
    card.querySelector('.tol-tip-next').addEventListener('click', function () {
      var tip = card.querySelector('.tol-tip-h');
      tip.parentNode.classList.add('is-swap');
      setTimeout(function () { window.TOLTips.get(topics, function (t) { show(t); tip.parentNode.classList.remove('is-swap'); }); }, 220);
    });
    main.appendChild(card);
  }

  // ---------- "What you type stays on your device" ----------
  // Shown at the top of any page where people type or tick things that stay in the browser.
  // Never on pages that do send what's typed: sign-ups, the report form, the dashboard.
  var SENDS = ['/index.html', '/404.html', '/membership.html', '/dashboard.html'];
  function addPrivateNote(body) {
    if (body.hasAttribute('data-no-private-note') || SENDS.indexOf(current) !== -1) return;
    var main = document.querySelector('main') || body;
    var fields = Array.prototype.filter.call(main.querySelectorAll('textarea, select, input'), function (f) {
      var t = (f.getAttribute('type') || 'text').toLowerCase();
      return ['email', 'hidden', 'submit', 'button', 'password'].indexOf(t) === -1 && !f.closest('.tol-gate, form[action]');
    });
    if (!fields.length && !body.hasAttribute('data-private-note')) return;
    if (/Private by design|What you type stays on this device/i.test(main.textContent || '')) return; // the page already says so
    var note = el('p', { class: 'tol-private' },
      '<span aria-hidden="true">&#128274;</span><span><strong>Private by design.</strong> What you type or choose on this page stays on your device. It is never sent to us. ' +
      '<a href="/legal/privacy-policy.html#your-entries">More</a></span>');
    var head = main.querySelector('.read-head');
    if (head && head.parentNode) head.parentNode.insertBefore(note, head.nextSibling);
    else main.insertBefore(note, main.firstChild);
  }

  // ---------- The site as an app ----------
  // Icons, the manifest and the offline helper, added here so every page gets them.
  function addAppMeta() {
    var h = document.head; if (!h) return;
    function add(tag, attrs) { var n = document.createElement(tag); for (var k in attrs) n.setAttribute(k, attrs[k]); h.appendChild(n); }
    if (!h.querySelector('link[rel="manifest"]')) add('link', { rel: 'manifest', href: '/manifest.webmanifest' });
    if (!h.querySelector('link[rel~="icon"]')) {
      add('link', { rel: 'icon', href: '/assets/icons/icon.svg', type: 'image/svg+xml' });
      add('link', { rel: 'alternate icon', href: '/assets/icons/favicon-32.png', type: 'image/png', sizes: '32x32' });
      add('link', { rel: 'alternate icon', href: '/assets/icons/favicon-16.png', type: 'image/png', sizes: '16x16' });
    }
    if (!h.querySelector('link[rel="apple-touch-icon"]')) add('link', { rel: 'apple-touch-icon', href: '/assets/icons/apple-touch-icon-180.png', sizes: '180x180' });
    if (!h.querySelector('meta[name="theme-color"]')) add('meta', { name: 'theme-color', content: '#F5EFDE' });
    add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
    add('meta', { name: 'mobile-web-app-capable', content: 'yes' });
    add('meta', { name: 'apple-mobile-web-app-title', content: 'The Ledger' });
    if (isApp()) document.documentElement.classList.add('tol-app');
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
    }
  }
  function isApp() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }
  var installPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installPrompt = e; });
  // ---------- Professor Puddles: the site's chat host, floating by, with a hello bubble up top ----------
  var PUDDLES_SVG = '<svg viewBox="-4 -14 88 92" aria-hidden="true" focusable="false">' +
    '<path d="M40 8C33 22 14 36 14 50c0 14 12 22 26 22s26-8 26-22C66 36 47 22 40 8z" fill="#CFE6FA" stroke="#7FB2E0" stroke-width="2.6"/>' +
    '<ellipse cx="30" cy="30" rx="5" ry="3" fill="#fff" opacity=".6" transform="rotate(-25 30 30)"/>' +
    '<circle cx="31" cy="46" r="6.2" fill="rgba(255,255,255,.35)" stroke="#3A3350" stroke-width="1.8"/><circle cx="49" cy="46" r="6.2" fill="rgba(255,255,255,.35)" stroke="#3A3350" stroke-width="1.8"/><path d="M37.2 46h5.6" stroke="#3A3350" stroke-width="1.8"/>' +
    '<circle cx="31" cy="46.5" r="2.4" fill="#2B2620"/><circle cx="49" cy="46.5" r="2.4" fill="#2B2620"/><circle cx="31.9" cy="45.6" r=".8" fill="#fff"/><circle cx="49.9" cy="45.6" r=".8" fill="#fff"/>' +
    '<path d="M35 56 Q40 60.5 45 56" fill="none" stroke="#2B2620" stroke-width="2.2" stroke-linecap="round"/>' +
    '<ellipse cx="23" cy="55" rx="3.6" ry="2.2" fill="#F2A3B6" opacity=".85"/><ellipse cx="57" cy="55" rx="3.6" ry="2.2" fill="#F2A3B6" opacity=".85"/>' +
    '<path d="M18 10 L40 1 L62 10 L40 19 Z" fill="#3A3350"/><path d="M29 14.5v6c3 3 19 3 22 0v-6l-11 4.5z" fill="#4A4266"/>' +
    '<path d="M60 10 v11" stroke="#F4D26B" stroke-width="1.6"/><circle cx="60" cy="22.5" r="2.3" fill="#F4D26B"/></svg>';
  var PUDDLES = { name: 'Professor Puddles', svg: PUDDLES_SVG, color: '#CFE6FA',
    greeting: 'Hello! I’m Professor Puddles. Ask me anything about this site, like the book, the workpapers, check-ins or ways to calm down, and I’ll answer from its pages, with a link to read more. What you type stays on this device.' };
  // the hello bubble, at the top of the home page on every visit (phone and laptop alike);
  // "Not now" shrinks it to a small chip for the rest of the visit, so it's never lost
  function buildPuddles(body) {
    if (current !== '/index.html' && current !== '/') return;
    var small = false;
    try { small = sessionStorage.getItem('tol-puddles-small') === '1'; } catch (e) {}
    // on a phone the hello starts as its small chip, so the page's opening line and "Start here" fit on the first screen
    if (window.innerWidth <= 560) small = true;
    var hi = el('div', { class: 'tol-puddles-hi' + (small ? ' is-small' : ''), role: 'complementary', 'aria-label': 'Meet Professor Puddles' },
      '<span class="tol-puddles-hi-art">' + PUDDLES_SVG + '</span>' +
      '<p><strong>Meet Professor Puddles!</strong> <span class="tol-puddles-hi-more">Small drop, big brain. Ask anything about the program in your own words, and he’ll answer straight from these pages.</span></p>' +
      '<a class="tol-puddles-hi-go" href="/ask.html">Chat about something</a>' +
      '<button type="button" class="tol-puddles-hi-x" aria-label="Make smaller">&times;</button>');
    hi.querySelector('.tol-puddles-hi-x').addEventListener('click', function () {
      try { sessionStorage.setItem('tol-puddles-small', '1'); } catch (e) {}
      hi.classList.add('is-small');
      hi.querySelector('.tol-puddles-hi-go').focus();
    });
    var main = document.querySelector('main');
    var after = main && (main.querySelector('[data-palcam-top]') || main.querySelector('[data-home-intro]')); // below the "what this is" line and the pal cam link
    if (main) main.insertBefore(hi, after ? after.nextSibling : main.firstChild); else body.appendChild(hi);
    setTimeout(function () { hi.classList.add('is-in'); }, small ? 0 : 600);
  }

  // A little card from Professor Puddles partway through the course pages: "chat about this?"
  var PUD_LINES = [
    ['Got a question bubbling up?', 'I’m a drop of pure curiosity. Let’s chat about “{t}”.'],
    ['Want to dive in together?', 'No question is too small, and no puddle too deep. Ask me about “{t}”.'],
    ['Pssst. Stuck on a word?', 'I read every page of this site (twice, with my glasses on). Let’s chat about “{t}”.'],
    ['Want a little splash of help?', 'Ask me anything about “{t}”, in your own words.'],
    ['Thinking about this one?', 'Me too! I’m positively drip-ping with answers about “{t}”.'],
    ['Would a chat help it sink in?', 'I’ll answer from the pages themselves, with a link to read more. Shall we talk about “{t}”?'],
    ['Office hours are open!', 'The Professor is in, and it’s always a good time to chat about “{t}”.']
  ];
  function buildPuddlesCards(body) {
    var main = document.querySelector('main.read');
    if (!main || body.classList.contains('is-game') || sensitivePage() || /^\/(index|ask|whats-new|pause-and-play)\.html$/.test(current) ||
        document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;
    var sec = body.getAttribute('data-sec') || '', course = /^\/(book|workpapers|learn)\//.test(current) || /^(book|workpapers|program|self|relationships|start|tools)$/.test(sec);
    if (!course) return;
    var h1 = main.querySelector('h1'); if (!h1) return;
    var topic = h1.textContent.replace(/\s+/g, ' ').trim().replace(/[?.!]$/, '');
    var kids = Array.prototype.filter.call(main.children, function (k) { return /^(P|DIV|OL|UL|SECTION|H2)$/.test(k.tagName) && !k.matches('.read-head, .depth-bar, .tol-gentle, .tol-private, .tol-cheer, .growing-note'); });
    if (!kids.length) return;
    var gate = main.querySelector(':scope > .tol-gate'), open = kids.filter(function (k) { return !k.matches('.tol-gate, .locked-section') && (!gate || (k.compareDocumentPosition(gate) & 4)); });
    if (!open.length) return;
    var after = open[Math.min(open.length - 1, Math.max(0, Math.floor(open.length * 0.6)))];
    if (after.tagName === 'H2' && after.nextElementSibling && after.nextElementSibling !== gate) after = after.nextElementSibling;
    var n = 0; for (var i = 0; i < current.length; i++) n = (n * 31 + current.charCodeAt(i)) % 997; // the same line on the same page
    var line = PUD_LINES[n % PUD_LINES.length];
    var card = el('aside', { class: 'tol-pud-card', 'aria-label': 'Chat with Professor Puddles' },
      '<span class="tol-pud-card-art" aria-hidden="true">' + PUDDLES_SVG + '</span>' +
      '<p><strong>' + esc(line[0]) + '</strong> ' + esc(line[1].replace('{t}', topic)) + '</p>' +
      '<a class="tol-pud-card-go" href="/ask.html?about=' + encodeURIComponent(topic) + '"><span aria-hidden="true">&#128172;</span> Chat with Professor Puddles</a>');
    after.parentNode.insertBefore(card, after.nextSibling);
  }

  // ---------- Pop the bubbles ----------
  // Tap or click anywhere a bubble is floating (not on a link or button) and it pops with a
  // spray of droplets, silently, then drifts back a little later. Hearts give a small
  // heartbeat and a few tiny hearts. Purely for fun; nothing is kept.
  function poplets(x, y, heart, host) {
    for (var i = 0; i < (heart ? 6 : 0); i++) {
      var s = el('span', { class: 'tol-poplet', 'aria-hidden': 'true' }, '\u2665'), a = -Math.PI / 2 + (i - 2.5) * 0.45, d = 34 + (i % 3) * 12;
      s.style.left = x + 'px'; s.style.top = y + 'px'; s.style.setProperty('--dx', Math.round(Math.cos(a) * d) + 'px'); s.style.setProperty('--dy', Math.round(Math.sin(a) * d) + 'px');
      (host || document.body).appendChild(s); setTimeout(function (n) { return function () { n.remove(); }; }(s), 1100);
    }
  }
  function popBubbles() {
    var INTERACTIVE = 'a, button, input, select, textarea, label, summary, [role="button"], [contenteditable], canvas, .tol-dive, .gm-board, .qw, .ws-sheet, .wpf-form, .tol-tip, video, audio, iframe';
    document.addEventListener('pointerdown', function (e) {
      if (e.button > 0 || (e.target.closest && e.target.closest(INTERACTIVE))) return;
      var x = e.clientX, y = e.clientY, hit = null, best = 1e9;
      Array.prototype.forEach.call(document.querySelectorAll('b.tol-bub:not(.is-gone), b.tol-heart'), function (b) {
        var r = b.getBoundingClientRect(); if (!r.width) return;
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2, d = Math.hypot(cx - x, cy - y);
        if (d < Math.max(24, r.width * 0.75) && d < best) { best = d; hit = b; } // a generous target for fingers
      });
      if (!hit) return;
      var r2 = hit.getBoundingClientRect(), host = hit.closest('.tol-breathe') || null;
      if (hit.classList.contains('tol-heart')) {
        hit.classList.add('is-tapped'); poplets(r2.left + r2.width / 2, r2.top, true, host);
        setTimeout(function () { hit.classList.remove('is-tapped'); }, 480);
        return;
      }
      hit.classList.add('is-popped');
      setTimeout(function () { hit.classList.add('is-gone'); hit.classList.remove('is-popped'); }, 600);
      setTimeout(function () { hit.classList.remove('is-gone'); }, 5000 + Math.random() * 6000); // it floats back
    }, { passive: true });
  }

  // The simple / full choice at the top of pages that come in two versions: what each one is,
  // how long it takes, who it suits, and how the mini dives and "Dig deeper" links fit in.
  // It only remembers which one you picked last (on this device), to point it out next time.
  function buildDepthPicker(isFull) {
    var bar = document.querySelector('main .depth-bar');
    if (!bar || bar.classList.contains('tol-depth')) return;
    var label = bar.querySelector(':scope > span'), link = bar.querySelector(':scope > a[href]');
    if (!link || !label || !/^(Simple|Full) version/.test(label.textContent.trim())) return;  // e.g. the Library's theme bars stay as they are
    var chip = label.querySelector('.growing-chip');
    var here = location.pathname, other = link.getAttribute('href');
    var simpleHref = isFull ? other : here, fullHref = isFull ? here : other;
    var main = document.querySelector('main');
    var words = ((main && main.textContent) || '').split(/\s+/).length;
    var mins = Math.max(1, Math.round(words / 220));
    var pref = lsGet('tol-depth-pref');
    function opt(kind, href, icon, name, what, who, time) {
      var cur = (kind === 'full') === isFull;
      // the link holds only the short name; the description sits beside it (the whole card still opens it)
      return '<div class="tol-depth-opt is-' + kind + (cur ? ' is-here' : '') + '">' +
        '<a class="tol-depth-name" href="' + href + '" data-depth="' + kind + '"' + (cur ? ' aria-current="page"' : '') + '><span aria-hidden="true">' + icon + '</span> ' + name + (cur ? ' <small>you’re here</small>' : '') + '</a>' +
        '<span class="tol-depth-time">' + time + '</span>' +
        '<span class="tol-depth-what">' + what + '</span>' +
        '<span class="tol-depth-who">' + who + '</span></div>';
    }
    var box = el('div', { class: 'depth-bar tol-depth', role: 'group', 'aria-label': 'Choose how deep to read' },
      '<p class="tol-depth-q">This page comes in two versions. Pick the one that suits you right now:' + (chip ? ' ' + chip.outerHTML : '') + '</p>' +
      '<div class="tol-depth-opts">' +
        opt('simple', simpleHref, '🌱', 'Simple version', 'The main idea in a few short cards and one small thing to try. Tap a word with a water drop <span aria-hidden="true">💧</span> to dive deeper right here.', 'Good if you’re new, short on time, or tired.', isFull ? 'a few minutes' : 'about ' + mins + ' min read') +
        opt('full', fullHref, '🌊', 'Full version', bar.getAttribute('data-full-what') ? esc(bar.getAttribute('data-full-what')) : 'The whole idea: real-life examples, the reasoning behind it, worked numbers and answers to questions. Technical names appear here, in small print.', 'Good if you want the why, or you’re using it for a real situation.', isFull ? 'about ' + mins + ' min read' : 'a longer read') +
      '</div>' +
      (pref && (pref === 'full') !== isFull ? '<p class="tol-depth-pref">Last time you chose the ' + (pref === 'full' ? 'full' : 'simple') + ' version. It’s one tap away above.</p>' : '') +
      '<details class="tol-depth-more"><summary>How the two versions, “Dig deeper” links and mini dives fit together</summary>' +
        '<p><strong>Both versions teach the same idea.</strong> The simple one gives you the gist; the full one adds the detail. You can switch at any time, and nothing is lost or graded.</p>' +
        '<p><strong>“Dig deeper” links</strong> on the simple cards jump straight to the matching part of the full version, so you only go deep where you want to.</p>' +
        '<p><strong>Mini dives <span aria-hidden="true">💧</span></strong>: words with a little water drop open a short explanation right on the page. Tap one to wade in a step at a time, from the shore to the deep end, then close it and carry on where you were. The deepest step links to the page with everything on it.</p>' +
        '<p>Stuck on anything, in either version? <a href="/ask.html">Ask Professor Puddles</a>.</p>' +
      '</details>' +
      '<p class="tol-gentle' + (isFull ? ' is-deep' : '') + '"><span aria-hidden="true">' + (isFull ? '🌿' : '🌱') + '</span> Take what helps and leave the rest. Nothing here grades you.</p>');
    bar.parentNode.replaceChild(box, bar);
    Array.prototype.forEach.call(box.querySelectorAll('a[data-depth]'), function (a) {
      a.addEventListener('click', function () { lsSet('tol-depth-pref', a.getAttribute('data-depth')); });
    });
    if (!isFull) lsSet('tol-depth-seen', '1');
  }

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

  // ---------- Keep the page still ----------
  // One switch (in the menu panel and in the footer) that takes away the moving garden behind the
  // page and the floating bubbles and hearts, and stops the little buddies moving. It starts on by
  // itself when the device asks for less motion, and this browser remembers the choice.
  // Other scripts can read window.TOLStill.on() or listen for the 'tol-still' event.
  var STILL_KEY = 'tol-still', stillHooks = [];
  var stillOn = (function () {
    var v = lsGet(STILL_KEY);
    if (v === '1' || v === '0') return v === '1';
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  })();
  document.documentElement.classList.toggle('tol-still', stillOn);
  // the device's own "reduce motion" choice, unless one was made here
  function refreshStill() {
    var v = lsGet(STILL_KEY);
    setStill(v === '1' || v === '0' ? v === '1' : !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches), true);
  }
  function setStill(on, keep) {
    stillOn = !!on; if (!keep) lsSet(STILL_KEY, stillOn ? '1' : '0');
    document.documentElement.classList.toggle('tol-still', stillOn);
    document.querySelectorAll('.tol-still-btn').forEach(function (b) {
      b.setAttribute('aria-pressed', String(stillOn));
      b.querySelector('.tol-still-state').textContent = stillOn ? 'On' : 'Off';
    });
    stillHooks.forEach(function (f) { try { f(stillOn); } catch (e) {} });
    try { document.dispatchEvent(new CustomEvent('tol-still', { detail: { on: stillOn } })); } catch (e) {}
  }
  function stillButton() {
    var b = el('button', { type: 'button', class: 'tol-still-btn', 'aria-pressed': String(stillOn) },
      '<span class="tol-still-track" aria-hidden="true"><span></span></span>Keep the page still' +
      '<span class="tol-still-state" aria-hidden="true">' + (stillOn ? 'On' : 'Off') + '</span>');
    b.addEventListener('click', function () { setStill(!stillOn); });
    return b;
  }
  window.TOLStill = { on: function () { return stillOn; }, set: setStill };

  // ---------- Settings: calm and reading choices, in one panel for the whole site ----------
  // Dark follows the device by itself (site.css); a choice made here wins on this device. Text size
  // scales every word on the page. "Hide the helpers" puts away the extra friends: Professor Puddles'
  // cards, the cheering buddies, the pups, tips, the learning trail and petals, and the floating
  // invitations. Quiet mode and Easy reading are one-tap bundles of these choices, and turning one off
  // puts back what was there before. Each choice is one small setting kept in this browser, nothing
  // more; "Back to the usual" clears them all. Other scripts can read window.TOLQuiet:
  //   TOLQuiet.on()    true while Quiet mode is on
  //   TOLQuiet.sound() false when Quiet mode is on or site sounds are switched off in Settings
  //   and listen for the 'tol-quiet' event on document.
  var THEME_KEY = 'tol-theme', SIZE_KEY = 'tol-text-size', HELP_KEY = 'tol-hide-helpers',
      QUIET_KEY = 'tol-quiet', EASY_KEY = 'tol-easy', FONT_KEY = 'tol-font', SPACE_KEY = 'tol-spacing',
      TINT_KEY = 'tol-tint', RULER_KEY = 'tol-ruler', SOUND_KEY = 'tol-sound-off', PREV_KEY = 'tol-comfort-prev';
  // the sound switches the pal cam and the games keep for themselves
  var SOUND_KEYS = ['tol-pc-sound', 'tol-pc-music', 'tol-qw-sound', 'tol-xw-sound', 'tol-bloom-sound'];
  // four steps, each bigger than the one before (every word on the page is scaled by 1, 1.12, 1.25 or 1.4)
  var SIZE_NAMES = { md: 'Standard', lg: 'Large', xl: 'Larger', xxl: 'Largest' }, SIZE_SCALE = { md: 1, lg: 1.12, xl: 1.25, xxl: 1.4 };
  var TINTS = { cream: 'Cream', blue: 'Soft blue', mint: 'Mint' };
  function quietOn() { return lsGet(QUIET_KEY) === '1'; }
  function easyOn() { return lsGet(EASY_KEY) === '1'; }
  function soundAllowed() { return !quietOn() && lsGet(SOUND_KEY) !== '1'; }
  function setSounds(off) {
    if (off) { lsSet(SOUND_KEY, '1'); SOUND_KEYS.forEach(function (k) { lsSet(k, 'off'); }); }
    else { lsDel(SOUND_KEY); SOUND_KEYS.forEach(lsDel); } // each sound goes back to its own usual setting
  }
  var fontLinked = false;
  function linkEasyFont() {
    if (fontLinked || document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;
    fontLinked = true;
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&display=swap';
    document.head.appendChild(l);
  }
  function applyReading() {
    var h = document.documentElement, t = lsGet(THEME_KEY), z = lsGet(SIZE_KEY);
    if (t === 'dark' || t === 'light') h.setAttribute('data-theme', t); else h.removeAttribute('data-theme');
    ['lg', 'xl', 'xxl'].forEach(function (s) { h.classList.toggle('tol-text-' + s, z === s); });
    // pages that draw on a canvas (the games) grow their words with the root size instead of a zoom
    h.classList.toggle('tol-nozoom', !!(document.body && (document.body.classList.contains('is-game') || document.body.hasAttribute('data-no-zoom'))));
    h.classList.toggle('tol-quiet', quietOn());
    h.classList.toggle('tol-no-helpers', lsGet(HELP_KEY) === '1' || quietOn());
    h.classList.toggle('tol-easy', easyOn());
    h.classList.toggle('tol-font-easy', lsGet(FONT_KEY) === 'easy');
    h.classList.toggle('tol-space-wide', lsGet(SPACE_KEY) === 'wide');
    var tint = lsGet(TINT_KEY);
    Object.keys(TINTS).forEach(function (k) { h.classList.toggle('tol-tint-' + k, tint === k); });
    if (lsGet(FONT_KEY) === 'easy') linkEasyFont();
    ruler(lsGet(RULER_KEY) === '1');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', darkNow() ? '#1E1B24' : '#F5EFDE');
    document.querySelectorAll('.tol-dark-btn').forEach(function (b) {
      b.setAttribute('aria-pressed', String(darkNow()));
      b.querySelector('.tol-still-state').textContent = darkNow() ? 'On' : 'Off';
    });
    document.querySelectorAll('.tol-quiet-btn').forEach(function (b) {
      b.setAttribute('aria-pressed', String(quietOn()));
      var st = b.querySelector('.tol-still-state'); if (st) st.textContent = quietOn() ? 'On' : 'Off';
    });
    document.querySelectorAll('.tol-set').forEach(syncSettings);
  }
  function darkNow() {
    var t = lsGet(THEME_KEY);
    if (t === 'dark' || t === 'light') return t === 'dark';
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function helpersHidden() { return document.documentElement.classList.contains('tol-no-helpers'); }
  applyReading();
  if (window.matchMedia) { try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyReading); } catch (e) {} }
  function darkButton() {
    var b = el('button', { type: 'button', class: 'tol-still-btn tol-dark-btn', 'aria-pressed': String(darkNow()) },
      '<span class="tol-still-track" aria-hidden="true"><span></span></span>Dark mode' +
      '<span class="tol-still-state" aria-hidden="true">' + (darkNow() ? 'On' : 'Off') + '</span>');
    b.addEventListener('click', function () { lsSet(THEME_KEY, darkNow() ? 'light' : 'dark'); applyReading(); });
    return b;
  }
  function after() { applyReading(); if (typeof barHeightHook === 'function') barHeightHook(); }

  // Quiet mode and Easy reading: one tap turns on a bundle; turning it off puts back what was there
  var PRESETS = {
    quiet: { key: QUIET_KEY, keys: [STILL_KEY, HELP_KEY, SOUND_KEY].concat(SOUND_KEYS),
      on: function () { lsSet(HELP_KEY, '1'); setSounds(true); lsSet(STILL_KEY, '1'); } },
    easy: { key: EASY_KEY, keys: [FONT_KEY, SPACE_KEY, TINT_KEY, STILL_KEY, HELP_KEY],
      on: function () { lsSet(FONT_KEY, 'easy'); lsSet(SPACE_KEY, 'wide'); if (!lsGet(TINT_KEY)) lsSet(TINT_KEY, 'cream'); lsSet(STILL_KEY, '1'); lsSet(HELP_KEY, '1'); } }
  };
  function prevOf(name) { try { return JSON.parse(lsGet(PREV_KEY + '-' + name) || 'null'); } catch (e) { return null; } }
  function setPreset(name, on) {
    var P = PRESETS[name], other = name === 'quiet' ? 'easy' : 'quiet';
    if (on === (lsGet(P.key) === '1')) return;
    if (on) {
      lsSet('tol-comfort-offer', 'done'); document.querySelectorAll('.tol-offer').forEach(function (o) { o.remove(); });
      var prev = {}; P.keys.forEach(function (k) { prev[k] = lsGet(k); });
      lsSet(PREV_KEY + '-' + name, JSON.stringify(prev));
      lsSet(P.key, '1'); P.on();
    } else {
      var was = prevOf(name) || {};
      lsDel(P.key); lsDel(PREV_KEY + '-' + name);
      var otherOn = lsGet(PRESETS[other].key) === '1';
      P.keys.forEach(function (k) {
        if (otherOn && (k === STILL_KEY || k === HELP_KEY)) return; // the other bundle still wants these
        if (was[k] == null) lsDel(k); else lsSet(k, was[k]);
      });
    }
    refreshStill();
    after();
    if (name === 'quiet') quietEvent();
  }
  // tell the games, the pal cam and the sound pages at once (they listen on window, and some on document)
  function quietEvent() {
    var d = { on: quietOn(), sound: soundAllowed() };
    try { window.dispatchEvent(new CustomEvent('tol-quiet', { detail: d })); } catch (e) {}
    try { document.dispatchEvent(new CustomEvent('tol-quiet', { detail: d })); } catch (e) {}
  }
  window.TOLQuiet = { on: quietOn, sound: soundAllowed, set: function (on) { setPreset('quiet', !!on); } };
  window.TOLEasyReading = { on: easyOn, set: function (on) { setPreset('easy', !!on); } };

  function quietButton(kind) {
    var sw = kind === 'switch', b;
    if (sw) b = el('button', { type: 'button', class: 'tol-still-btn tol-quiet-btn', 'aria-pressed': String(quietOn()) },
      '<span class="tol-still-track" aria-hidden="true"><span></span></span>Quiet mode<span class="tol-still-state" aria-hidden="true">' + (quietOn() ? 'On' : 'Off') + '</span>');
    else {
      b = el('button', { type: 'button', class: 'tol-quiet-btn tol-bar-quiet', 'aria-pressed': String(quietOn()), title: 'Quiet mode: a still page with no helpers, pop-ups, sounds, levels or petals' },
        '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M19.5 14.2A7.8 7.8 0 1 1 9.8 4.5a6.2 6.2 0 0 0 9.7 9.7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>' +
        '<span class="tol-quiet-name">Quiet</span>');
      b.setAttribute('aria-label', 'Quiet mode');
    }
    b.addEventListener('click', function () { setPreset('quiet', !quietOn()); announce(quietOn() ? 'Quiet mode is on: the page is still, and helpers, pop-ups, sounds, levels and petals are off.' : 'Quiet mode is off. Everything is back the way it was.'); });
    return b;
  }
  function settingsButton(cls, text) {
    var b = el('button', { type: 'button', class: 'tol-set-btn ' + (cls || ''), 'aria-haspopup': 'dialog' },
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="6" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="12" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="18" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/></svg>' +
      '<span class="tol-set-name">' + (text || 'Settings') + '</span>');
    b.setAttribute('aria-label', 'Settings: calm and reading choices');
    b.addEventListener('click', function () { openSettings(b); });
    return b;
  }
  // a polite line for screen readers when something changes without moving focus
  var liveBox = null;
  function announce(t) {
    if (!liveBox) { liveBox = el('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(liveBox); }
    liveBox.textContent = ''; setTimeout(function () { liveBox.textContent = t; }, 60);
  }

  // ---- the Settings panel ----
  var setBox = null, setLast = null, setInerted = [];
  function syncSettings(box) {
    var t = lsGet(THEME_KEY) || 'auto', z = lsGet(SIZE_KEY) || 'md';
    box.querySelectorAll('input[data-theme-opt]').forEach(function (i) { i.checked = i.value === t; });
    box.querySelectorAll('input[data-size-opt]').forEach(function (i) { i.checked = i.value === z; });
    box.querySelectorAll('input[data-font-opt]').forEach(function (i) { i.checked = i.value === (lsGet(FONT_KEY) || 'usual'); });
    box.querySelectorAll('input[data-space-opt]').forEach(function (i) { i.checked = i.value === (lsGet(SPACE_KEY) || 'usual'); });
    box.querySelectorAll('input[data-tint-opt]').forEach(function (i) { i.checked = i.value === (lsGet(TINT_KEY) || 'none'); });
    var map = { still: stillOn, helpers: helpersHidden(), sound: !soundAllowed(), ruler: lsGet(RULER_KEY) === '1' };
    box.querySelectorAll('input[data-switch]').forEach(function (i) { i.checked = !!map[i.getAttribute('data-switch')]; i.disabled = quietOn() && i.getAttribute('data-switch') !== 'ruler'; });
    box.querySelectorAll('[data-preset]').forEach(function (b) { b.setAttribute('aria-pressed', String(lsGet(PRESETS[b.getAttribute('data-preset')].key) === '1')); });
    var qn = box.querySelector('.tol-set-qnote'); if (qn) qn.hidden = !quietOn();

  }
  function buildSettings() {
    var id = 'tol-set-' + Math.random().toString(36).slice(2, 7);
    function radio(group, attr, val, text) {
      return '<label><input type="radio" name="' + id + '-' + group + '" value="' + val + '" ' + attr + '> ' + text + '</label>';
    }
    function sw(key, text, note) {
      return '<label class="tol-set-sw"><input type="checkbox" data-switch="' + key + '"><span class="tol-set-track" aria-hidden="true"><span></span></span><span>' + text + (note ? '<small>' + note + '</small>' : '') + '</span></label>';
    }
    var box = el('div', { class: 'tol-set', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': id + '-h', hidden: '' },
      '<div class="tol-set-card">' +
      '<div class="tol-set-head"><h2 id="' + id + '-h">Settings</h2><button type="button" class="tol-set-close">Close</button></div>' +
      '<p class="tol-set-intro">Make the site calmer, or easier to read. Your choices stay on this device only.</p>' +
      '<div class="tol-set-presets">' +
        '<button type="button" class="tol-preset" data-preset="quiet" aria-pressed="false"><span class="tol-preset-ico" aria-hidden="true">&#127769;</span><strong>Quiet mode</strong><small>A still page. No helpers, pop-ups or sounds, and no levels or petals.</small><span class="tol-preset-state" aria-hidden="true"></span></button>' +
        '<button type="button" class="tol-preset" data-preset="easy" aria-pressed="false"><span class="tol-preset-ico" aria-hidden="true">&#128214;</span><strong>Easy reading</strong><small>A clear, roomy font, more space between letters and lines, shorter lines, a soft tint and a still page.</small><span class="tol-preset-state" aria-hidden="true"></span></button>' +
      '</div>' +
      '<h3 class="tol-set-k">Calm</h3>' +
      '<p class="tol-set-qnote" hidden>Quiet mode is looking after these. Turn it off above to change them one by one.</p>' +
      sw('still', 'Keep the page still', 'No moving garden, bubbles, hearts or sliding in, here and in the Breathe break') +
      sw('helpers', 'Hide the helpers', 'Professor Puddles’ cards, the cheering buddies, the pups popping in while you read, tips, the learning trail, petals and pop-up invitations. The “Check in on Tidbit & Sugarfoot” button stays, for when you want them.') +
      sw('sound', 'Keep site sounds off', 'When this is on, the pal cam, the games and the Breathe break start silent') +
      '<h3 class="tol-set-k">Reading</h3>' +
      '<fieldset class="tol-set-sizes"><legend>Text size <small>(smallest to biggest)</small></legend>' + ['md', 'lg', 'xl', 'xxl'].map(function (k) { return radio('size', 'data-size-opt', k, '<span class="tol-set-size" style="font-size:' + SIZE_SCALE[k] + 'em">' + SIZE_NAMES[k] + '</span>'); }).join('') + '</fieldset>' +
      '<fieldset><legend>Font</legend>' + radio('font', 'data-font-opt', 'usual', 'The usual') + radio('font', 'data-font-opt', 'easy', '<span class="tol-set-easyfont">Easy to read</span>') + '</fieldset>' +
      '<fieldset><legend>Spacing</legend>' + radio('space', 'data-space-opt', 'usual', 'The usual') + radio('space', 'data-space-opt', 'wide', 'Roomy') + '</fieldset>' +
      '<fieldset><legend>Page tint</legend>' + radio('tint', 'data-tint-opt', 'none', 'None') + Object.keys(TINTS).map(function (k) { return radio('tint', 'data-tint-opt', k, '<span class="tol-set-swatch is-' + k + '" aria-hidden="true"></span>' + TINTS[k]); }).join('') + '</fieldset>' +
      '<fieldset><legend>Colors (dark mode)</legend>' + radio('theme', 'data-theme-opt', 'auto', 'Follow my device') + radio('theme', 'data-theme-opt', 'light', 'Light') + radio('theme', 'data-theme-opt', 'dark', 'Dark') + '</fieldset>' +
      sw('ruler', 'Reading ruler', 'A soft band that follows your pointer or finger, so you keep your place on the line') +
      '<p class="tol-set-foot">These choices stay in this browser only. <button type="button" class="tol-set-reset">Back to the usual</button> <a href="/on-this-device.html">What’s stored on this device</a></p>' +
      '</div>');
    box.addEventListener('change', function (e) {
      var i = e.target;
      if (i.hasAttribute('data-size-opt')) { if (i.value === 'md') lsDel(SIZE_KEY); else lsSet(SIZE_KEY, i.value); }
      if (i.hasAttribute('data-theme-opt')) { if (i.value === 'auto') lsDel(THEME_KEY); else lsSet(THEME_KEY, i.value); }
      if (i.hasAttribute('data-font-opt')) { if (i.value === 'usual') lsDel(FONT_KEY); else lsSet(FONT_KEY, i.value); }
      if (i.hasAttribute('data-space-opt')) { if (i.value === 'usual') lsDel(SPACE_KEY); else lsSet(SPACE_KEY, i.value); }
      if (i.hasAttribute('data-tint-opt')) { if (i.value === 'none') lsDel(TINT_KEY); else lsSet(TINT_KEY, i.value); }
      var s = i.getAttribute('data-switch');
      if (s === 'still') { setStill(i.checked); }
      if (s === 'helpers') { if (i.checked) lsSet(HELP_KEY, '1'); else lsDel(HELP_KEY); }
      if (s === 'sound') { setSounds(i.checked); quietEvent(); }
      if (s === 'ruler') { if (i.checked) lsSet(RULER_KEY, '1'); else lsDel(RULER_KEY); }
      after();
    });
    box.addEventListener('click', function (e) {
      var p = e.target.closest('[data-preset]');
      if (p) { var n = p.getAttribute('data-preset'); setPreset(n, lsGet(PRESETS[n].key) !== '1'); }
      if (e.target.closest('.tol-set-close') || e.target === box) closeSettings();
      if (e.target.closest('.tol-set-reset')) {
        [QUIET_KEY, EASY_KEY, PREV_KEY + '-quiet', PREV_KEY + '-easy', SIZE_KEY, THEME_KEY, HELP_KEY, FONT_KEY, SPACE_KEY, TINT_KEY, RULER_KEY, STILL_KEY].forEach(lsDel);
        setSounds(false); refreshStill(); after(); quietEvent(); announce('Everything is back to the usual.');
      }
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); closeSettings(); }
      if (e.key === 'Tab') {
        var f = Array.prototype.filter.call(box.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])'), function (n) { return n.getClientRects().length > 0 && (n.type !== 'radio' || n.checked); });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    document.body.appendChild(box);
    return box;
  }
  function openSettings(from) {
    if (panel && !panel.hidden) closePanel();
    closeDrop();
    if (!setBox) setBox = buildSettings();
    setLast = from || document.activeElement;
    syncSettings(setBox);
    setBox.hidden = false;
    setInerted = Array.prototype.filter.call(document.body.children, function (n) { return n !== setBox && !n.hasAttribute('inert') && !/^(SCRIPT|STYLE|LINK)$/.test(n.tagName); });
    setInerted.forEach(function (n) { n.setAttribute('inert', ''); });
    setBox.querySelector('.tol-set-close').focus({ preventScroll: true });
  }
  function closeSettings() {
    if (!setBox || setBox.hidden) return;
    setInerted.forEach(function (n) { n.removeAttribute('inert'); }); setInerted = [];
    setBox.hidden = true;
    if (setLast && setLast.focus) setLast.focus();
  }
  window.TOLSettings = { open: openSettings, close: closeSettings };

  // ---- the reading ruler: a soft band across the page that follows the pointer, a finger, or focus ----
  var rulerEl = null;
  function rulerAt(y) { if (rulerEl) rulerEl.style.transform = 'translateY(' + Math.round(y - rulerEl.offsetHeight / 2) + 'px)'; }
  function rulerMove(e) { var t = e.touches ? e.touches[0] : e; if (t) rulerAt(t.clientY); }
  function rulerFocus(e) { var r = e.target && e.target.getBoundingClientRect && e.target.getBoundingClientRect(); if (r && r.height < window.innerHeight / 2) rulerAt(r.top + r.height / 2); }
  function ruler(on) {
    if (on && !rulerEl && document.body) {
      rulerEl = el('div', { class: 'tol-ruler', 'aria-hidden': 'true' });
      document.body.appendChild(rulerEl); rulerAt(window.innerHeight * 0.4);
      document.addEventListener('pointermove', rulerMove, { passive: true });
      document.addEventListener('touchstart', rulerMove, { passive: true });
      document.addEventListener('focusin', rulerFocus);
    } else if (!on && rulerEl) {
      rulerEl.remove(); rulerEl = null;
      document.removeEventListener('pointermove', rulerMove); document.removeEventListener('touchstart', rulerMove); document.removeEventListener('focusin', rulerFocus);
    }
  }

  // ---- a gentle offer on the first visit: Quiet mode or Easy reading, one tap each ----
  function comfortOffer(body) {
    if (lsGet('tol-comfort-offer') || quietOn() || easyOn() || body.classList.contains('is-game') || body.hasAttribute('data-no-offer') ||
        document.querySelector('meta[http-equiv="Content-Security-Policy"]') || /^\/(404|offline|garden-backdrop|pal-cam-tv|on-this-device)\.html$/.test(current)) return;
    var main = document.querySelector('main'); if (!main) return;
    lsSet('tol-comfort-offer', 'shown'); // offered once; Settings at the top is always there
    var box = el('aside', { class: 'tol-offer no-bubble no-cheer', 'aria-label': 'Make the site calmer or easier to read' },
      '<p><strong>Would a calmer page help?</strong> Quiet mode keeps everything still and silent, with no pop-ups. Easy reading uses a clear font and roomy lines. You can change either one any time in <em>Settings</em> at the top.</p>' +
      '<p class="tol-offer-row"><button type="button" data-offer="quiet">Quiet mode</button><button type="button" data-offer="easy">Easy reading</button><button type="button" data-offer="no" class="is-quiet">No thanks</button></p>');
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-offer]'); if (!b) return;
      var what = b.getAttribute('data-offer');
      lsSet('tol-comfort-offer', 'done');
      if (what !== 'no') { setPreset(what, true); announce(what === 'quiet' ? 'Quiet mode is on.' : 'Easy reading is on.'); }
      var m = document.getElementById('tol-main'); box.remove(); if (m) m.focus({ preventScroll: true });
    });
    var intro = main.querySelector('[data-home-intro]'), head = main.querySelector('.read-head');
    if (intro) homeSlot(intro).after(box);                   // home: after the approved opening, so its order stays as it is
    else if (head && head.parentNode === main) head.after(box);
    else main.insertBefore(box, main.firstChild);
  }

  // the home page's slot for extras: just after the "New" notices, which end the approved opening
  function homeSlot(intro) {
    var m = intro.closest('main') || document, st = m.querySelector('.announce-stack');
    if (!st) return intro;
    var last = st; while (last.nextElementSibling && /tol-pickup-host|tol-offer/.test(last.nextElementSibling.className)) last = last.nextElementSibling;
    return last;
  }
  var barHeightHook = null;
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  window.TOLReadingOptions = { dark: darkNow, helpersHidden: helpersHidden };

  // "Add to your home screen": the browser's own prompt where there is one, otherwise how-to steps
  function showInstall() {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then(function () { installPrompt = null; }).catch(function () {});
      return;
    }
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var steps = ios
      ? '<li>Tap the <strong>Share</strong> button <span aria-hidden="true">(the square with an arrow)</span>.</li><li>Scroll down and tap <strong>Add to Home Screen</strong>.</li><li>Tap <strong>Add</strong>.</li>'
      : '<li>Open your browser’s menu <span aria-hidden="true">(&#8942; or &#8943;)</span>.</li><li>Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li><li>Confirm, and look for the two little bubbles on your home screen.</li>';
    var d = el('div', { class: 'tol-install', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tol-install-h' },
      '<div class="tol-install-card"><img src="/assets/icons/icon-192.png" alt="" width="72" height="72">' +
      '<h2 id="tol-install-h">Keep us on your home screen</h2>' +
      '<p>It opens like an app, works without a connection, and nothing you type ever leaves your phone.</p>' +
      '<ol>' + steps + '</ol><button type="button" class="tol-install-close">Got it</button></div>');
    function close() { d.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    d.addEventListener('click', function (e) { if (e.target === d || e.target.classList.contains('tol-install-close')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(d);
    d.querySelector('.tol-install-close').focus();
  }

  // One gentle invitation, on a phone, on a later day's visit. "Not now" means never again.
  function maybeInviteInstall() {
    var today = new Date().toDateString(), days = [];
    try { days = JSON.parse(lsGet('tol-visit-days') || '[]') || []; } catch (e) { days = []; }
    if (days.indexOf(today) === -1) { days.push(today); lsSet('tol-visit-days', JSON.stringify(days.slice(-30))); }
    if (isApp() || lsGet('tol-install-asked') || days.length < 2 || window.innerWidth > 760) return;
    if (document.body.hasAttribute('data-no-breathe') || location.pathname === '/offline.html') return; // not over the garden
    if (ssGet('tol-invite-seen')) return; // at most once a visit
    setTimeout(function () {
      if (lsGet('tol-install-asked') || ssGet('tol-invite-seen') || document.querySelector('.tol-breathe:not([hidden]), .tol-install, .tol-wx')) return;
      lsSet('tol-install-asked', '1'); ssSet('tol-invite-seen', '1');
      var t = el('div', { class: 'tol-invite', role: 'status' },
        '<img src="/assets/img/logo-mark.svg" alt="" width="44" height="44"><p>Want us on your home screen? It opens like an app, and nothing you type leaves your phone.</p>' +
        '<span><button type="button" class="tol-invite-yes">Show me how</button><button type="button" class="tol-invite-no">Not now</button></span>');
      t.querySelector('.tol-invite-yes').addEventListener('click', function () { t.remove(); showInstall(); });
      t.querySelector('.tol-invite-no').addEventListener('click', function () { t.remove(); });
      document.body.appendChild(t);
    }, 120000);
  }

  // ---------- Is something being worked on here? ----------
  // Tools, the chat and the games are for doing things: no invitations or "did you know" bubbles there,
  // only on reading pages. Also quiet after a heavy weather check today (fogged in, or gusty and high).
  var TOOL_PAGES = /^\/(ask|conversation-reader|signal-translator|carrier-wave-decoder|lemonade-stand|wiring-card|quick-checks|start-in-10-minutes|night-garden|calm-visualizer|frequency-journey(-play)?|pause-and-play|word-bloom|quiet-words|quiet-crossword|daily-ledger-crossword|calc01-solvency|dashboard|keepsakes|quest|on-this-device|pal-cam-tv|echoes-of-gold|soundscapes)\.html$|^\/(workpapers\/(fill|calculators)|tools|do|snapshot)\//;
  function heavyToday() {
    try {
      var a = JSON.parse(lsGet('tol-weather-v1') || '[]'), e = a[a.length - 1], d = new Date();
      var today = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
      return !!(e && e.d === today && (e.sky === 'fog' || (e.sky === 'gusty' && (e.i || 0) >= 60)));
    } catch (e) { return false; }
  }
  function busyPage() {
    var b = document.body;
    if (b.classList.contains('is-game') || TOOL_PAGES.test(current)) return true;
    var a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== 'search') return true;     // typing right now
    if (document.querySelector('.tol-breathe:not([hidden]), .pc-ov:not([hidden]), [role="dialog"][aria-modal="true"]:not([hidden]):not(.tol-set):not(#tol-panel)')) return true;
    if (mediaPlaying()) return true;                                                              // a video or episode is playing
    return heavyToday();
  }
  // someone whose device asks for less motion rarely wants things sliding in either: no pop-up invitations then
  function calmDevice() { try { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
  // a Frequency Buddies episode, or any video on the page, playing right now
  function mediaPlaying() {
    if (document.querySelector('.fb-player.is-playing')) return true;
    return Array.prototype.some.call(document.querySelectorAll('video'), function (v) { return !v.paused && !v.ended && v.readyState > 2; });
  }
  // ---------- keep the screen awake while something is playing ----------
  // An episode, a video, the pal cam or any music or sounds: the phone or computer won't dim and lock
  // while they play, and goes back to normal once they stop. Nothing is stored or sent.
  (function () {
    if (!('wakeLock' in navigator)) return;
    var ctxs = [], lock = null, asking = false;
    ['AudioContext', 'webkitAudioContext'].forEach(function (n) {
      var A = window[n]; if (!A || A.__tolAwake) return;
      var Wrap = function (o) { var c = o === undefined ? new A() : new A(o); ctxs.push(c); return c; };
      Wrap.prototype = A.prototype; Wrap.__tolAwake = true;
      try { window[n] = Wrap; } catch (e) {}
    });
    function soundOn() {
      if (document.querySelector('.fb-player')) return false; // the movie player says for itself when it's playing
      for (var i = 0; i < ctxs.length; i++) {
        var c = ctxs[i]; if (c.state !== 'running') continue;
        if (c === window.__pcAudio && !document.querySelector('.pc-ov:not([hidden])')) continue; // the pal cam, once closed
        return true;
      }
      return false;
    }
    function playing() {
      if (document.querySelector('.fb-player.is-playing, .pc-ov:not([hidden]), .tol-breathe:not([hidden])')) return true;
      if (Array.prototype.some.call(document.querySelectorAll('video, audio'), function (v) { return !v.paused && !v.ended; })) return true;
      return soundOn();
    }
    function check() {
      var want = !document.hidden && playing();
      if (want && !lock && !asking) {
        asking = true;
        try { navigator.wakeLock.request('screen').then(function (l) { asking = false; lock = l; l.addEventListener('release', function () { lock = null; }); }).catch(function () { asking = false; }); } catch (e) { asking = false; }
      } else if (!want && lock) { try { lock.release(); } catch (e) {} lock = null; }
    }
    setInterval(check, 3000);
    document.addEventListener('visibilitychange', function () { setTimeout(check, 300); }); // the lock ends when the page is hidden; ask again on return
    document.addEventListener('click', function () { setTimeout(check, 600); }, true);
    window.TOLAwake = { check: check, held: function () { return !!lock; } };
  })();

  window.TOLSite = { busy: busyPage, heavyToday: heavyToday, sensitive: sensitivePage, playing: mediaPlaying, calmDevice: calmDevice, readingPage: function () { return !busyPage() && !!document.querySelector('main.read'); } };

  // ---------- Today's Weather, as a small floating invitation ----------
  // Bottom-left, and never while someone has only just started reading: at most once a visit, after
  // a minute on the page or once they've scrolled a real way down. Tap to check in; × hides it for
  // today, and "Don't show again" (right beside it) hides it for good. It stays away once today's
  // weather is logged.
  var SKIP_WEATHER = ['/quick-checks.html', '/night-garden.html', '/dashboard.html', '/offline.html', '/404.html'];
  function buildWeatherNudge(body) {
    if (SKIP_WEATHER.indexOf(current) !== -1 || helpersHidden() || busyPage() || sensitivePage() || calmDevice() || body.hasAttribute('data-no-weather') || document.querySelector('.wpf-bar')) return;
    var today = new Date().toISOString().slice(0, 10);
    if (lsGet('tol-weather-nudge') === 'never') return;
    // at most once a week: after it's been shown (or hidden with ×), it stays away for seven days
    var lastSeen = lsGet('tol-weather-nudge-seen') || (/^\d{4}-\d{2}-\d{2}$/.test(lsGet('tol-weather-nudge') || '') ? lsGet('tol-weather-nudge') : '');
    if (lastSeen && (Date.parse(today) - Date.parse(lastSeen)) / 864e5 < 7) return;
    try { var log = JSON.parse(lsGet('tol-weather-v1') || '[]'); if (log.length && log[log.length - 1].d === today) return; } catch (e) {}
    if (ssGet('tol-wx-seen')) return; // once a visit is plenty
    var art = '<svg viewBox="0 0 64 52" aria-hidden="true">' +
      '<g class="tol-wx-sun"><circle cx="42" cy="17" r="11" fill="#F8DC6E"/><g stroke="#F3C94A" stroke-width="2.4" stroke-linecap="round"><path d="M42 1v3M56 17h3M52 6l2-2M52 28l2 2M32 6l-2-2"/></g></g>' +
      '<path d="M14 44c-6 0-10-4-10-9s4-9 9-9c1-7 7-12 14-12 8 0 13 5 14 12 5 0 9 4 9 9s-4 9-9 9z" fill="#FFFFFF" stroke="#C9B8EC" stroke-width="2"/>' +
      '<circle cx="22" cy="33" r="2" fill="#2B2620"/><circle cx="33" cy="33" r="2" fill="#2B2620"/><path d="M25 38c1.5 1.5 4.5 1.5 6 0" fill="none" stroke="#2B2620" stroke-width="1.8" stroke-linecap="round"/>' +
      '<ellipse cx="18" cy="37" rx="2.6" ry="1.6" fill="#F7B8C6"/><ellipse cx="37" cy="37" rx="2.6" ry="1.6" fill="#F7B8C6"/></svg>';
    // the link keeps its full name even when a small or zoomed screen shows only the little cloud
    var w = el('div', { class: 'tol-wx', role: 'complementary', 'aria-label': 'Today’s Weather' },
      '<a class="tol-wx-go" href="/quick-checks.html#today" aria-label="How’s your weather today? A one-minute check-in">' + art + '<span><strong>How’s your weather today?</strong><small>A one-minute check-in</small></span></a>' +
      '<button type="button" class="tol-wx-never">Don’t show again</button>' +
      '<button type="button" class="tol-wx-x" aria-label="Hide for this week">&times;</button>');
    function bye(mode) {
      lsSet('tol-weather-nudge', mode);
      var back = w.contains(document.activeElement);
      w.classList.add('is-bye');
      setTimeout(function () { w.remove(); }, 300);
      if (back) { var m = document.getElementById('tol-main'); if (m) m.focus({ preventScroll: true }); }
    }
    w.querySelector('.tol-wx-x').addEventListener('click', function () { bye(today); });
    w.querySelector('.tol-wx-never').addEventListener('click', function () { bye('never'); });
    var t0 = Date.now(), timer = null, done = false;
    function show() {
      if (done) return;
      if (document.hidden) { timer = setTimeout(show, 5000); return; }            // wait until the page is being looked at
      if (document.querySelector('.tol-invite, .tol-install, .tol-breathe:not([hidden])')) { timer = setTimeout(show, 15000); return; } // never alongside another invitation
      done = true; clearTimeout(timer); window.removeEventListener('scroll', onScroll);
      if (busyPage()) return; // something is being worked on now: not today
      ssSet('tol-wx-seen', '1'); lsSet('tol-weather-nudge-seen', today);
      body.appendChild(w); requestAnimationFrame(function () { w.classList.add('is-in'); });
    }
    // a real scroll: more than a screen's worth down the page, at least 15 seconds in
    function onScroll() { if (window.scrollY > window.innerHeight && Date.now() - t0 > 15000) show(); }
    window.addEventListener('scroll', onScroll, { passive: true });
    timer = setTimeout(show, 60000);
  }

  // ---------- Pal cam (the Frequency Journey's Tidbit & Sugarfoot), openable from any page ----------
  // Nothing loads until it's asked for: a [data-palcam-open] link, or the occasional "Peek?"
  // invitation (pals-cam-invite.js, fetched only on the page views that roll it). The Journey pages
  // load the cam themselves. Nothing is sent anywhere; the invitation's memory is sessionStorage.
  var PALCAM_FILES = ['/assets/js/pups.js', '/assets/js/pals-cam-acts.js', '/assets/js/pals-cam-more.js', '/assets/js/pals-cam-tricks.js', '/assets/js/pals-cam.js'];
  var palCamP = null;
  function loadScript(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
  function loadPalCam() {
    if (window.TOLPalsCam) return Promise.resolve(window.TOLPalsCam);
    if (!palCamP) {
      palCamP = PALCAM_FILES.reduce(function (p, src) { return p.then(function () { return src === PALCAM_FILES[0] && window.TOLPups ? null : loadScript(src); }); }, Promise.resolve())
        .then(function () { return window.TOLPalsCam; });
      palCamP.catch(function () { palCamP = null; });
    }
    return palCamP;
  }
  window.TOLPalCam = {
    load: loadPalCam,
    open: function (opts) { return loadPalCam().then(function (c) { if (c) c.open(opts || {}); }); },
    invite: function () { return loadScript('/assets/js/pals-cam-invite.js').then(function () { if (window.TOLPalCamInvite) window.TOLPalCamInvite.show(true); }); }
  };
  function palCamHooks(body) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-palcam-row][hidden]'), function (r) { r.hidden = false; });
    var top = document.querySelector('main [data-palcam-top]'); // the home page's link stays first, above anything added to the top of main
    var intro = document.querySelector('main [data-home-intro]'); // the one-line "what this is" stays at the very top, then the pal cam link
    var anchorEl = intro ? intro.nextElementSibling : (top && top.parentNode.firstElementChild);
    if (top && anchorEl !== top) top.parentNode.insertBefore(top, anchorEl);
    // tell the garden behind the page where the "Check in" button is, so the dogs step out of view there instead of running through it
    var avoidQ = 0;
    function avoidNow() {
      avoidQ = 0;
      var gf = document.querySelector('iframe.tol-garden-bg'), btn = document.querySelector('[data-palcam-row]:not([hidden]) .pc-launch');
      if (!gf || !gf.contentWindow) return;
      if (!gf.__tolAvoid) { gf.__tolAvoid = 1; gf.addEventListener('load', avoidNow); }
      var r = btn ? btn.getBoundingClientRect() : null, on = !!(r && r.width && r.bottom > 0 && r.top < window.innerHeight);
      try { gf.contentWindow.postMessage({ tolAvoid: on ? { l: r.left - 24, t: r.top - 20, r: r.right + 24, b: r.bottom + 20 } : null }, location.origin); } catch (e) {}
    }
    function avoidSoon() { if (!avoidQ) avoidQ = requestAnimationFrame(avoidNow); }
    if (document.querySelector('[data-palcam-row] .pc-launch')) {
      window.addEventListener('scroll', avoidSoon, { passive: true }); window.addEventListener('resize', avoidSoon);
      [0, 600, 1500, 4000].forEach(function (ms) { setTimeout(avoidNow, ms); });
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-palcam-open]');
      if (!b || window.TOLPalsCam) return; // on the Journey pages the cam handles its own buttons
      e.preventDefault(); window.TOLPalCam.open({ opener: b });
    });
    // the invitation: about 1 in 4 page views, 15-40 s in, once a visit, never two page views running
    var p = location.pathname, force = /[?&]palcam-pop=1\b/.test(location.search);
    var skip = /^\/(frequency-journey(-play)?\.html|calm-visualizer\.html|ask\.html|privacy-policy\.html|refund-policy\.html|terms-of-service\.html|offline\.html|404\.html)$/.test(p) ||
      /^\/(workpapers\/fill|legal)\//.test(p) || body.classList.contains('is-game') || !!document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!force && (sensitivePage() || calmDevice())) return; // not on the tender reading pages, nor for a device that asks for less motion
    if (skip || helpersHidden() || (busyPage() && !/[?&]palcam-pop=1\b/.test(location.search))) return;
    var prev = lsGet('tol-palcam-pop-prev'); lsSet('tol-palcam-pop-prev', '0');
    if (!force && (ssGet('tol-palcam-pop') || prev === '1' || Math.random() >= 0.25)) return;
    function still() { return !!(window.TOLStill && window.TOLStill.on()); }
    if (force) { setTimeout(function () { if (!still()) window.TOLPalCam.invite(); }, 1200); return; }
    // like the weather pill: not in the first minute of reading, unless they've scrolled a real way
    // down and been here 15 s; never in "Keep the page still" mode (pals-cam-invite.js also waits for
    // the weather pill and the home-screen invite to be gone)
    var t0 = Date.now(), done = false, timer = null;
    function go() { if (done || still() || busyPage()) return; done = true; clearTimeout(timer); window.removeEventListener('scroll', onScroll); window.TOLPalCam.invite(); }
    function onScroll() { if (window.scrollY > window.innerHeight && Date.now() - t0 > 15000) go(); }
    window.addEventListener('scroll', onScroll, { passive: true });
    timer = setTimeout(go, 60000 + Math.random() * 30000);
  }

  // ---------- Breathe ----------
  // The button is on every page; the break itself (methods, guidance and soundscapes) lives in
  // breathe.js and loads the first time someone taps it.
  function buildBreathe(body) {
    var moon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="#F9D9B8" stroke="#8A7BB8" stroke-width="1.4"/></svg>';
    var btn = el('button', { type: 'button', class: 'tol-breathe-btn', 'aria-haspopup': 'dialog' }, moon + '<span>Breathe</span>');
    btn.setAttribute('aria-label', 'Breathe: take a breathing break');
    body.appendChild(btn);
    keepBreatheClear(btn);
    var loading = false;
    btn.addEventListener('click', function () {
      if (window.TOLBreathe) { window.TOLBreathe.open(); return; }
      if (loading) return; loading = true;
      var sc = document.createElement('script'); sc.src = '/assets/js/breathe.js';
      sc.onload = function () { loading = false; if (window.TOLBreathe) window.TOLBreathe.open(); };
      sc.onerror = function () { loading = false; };
      document.head.appendChild(sc);
    });
  }

  // The floating Breathe button never sits on a form field or a button: on pages with forms it's a small
  // round picture, it rises above a sticky bottom bar (a workpaper's Save / PDF bar), it steps aside while
  // someone is typing, and if something you can tap is under it, it moves to a free corner.
  function keepBreatheClear(btn) {
    var FIELDS = 'input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, select';
    var TAPPABLE = 'input, textarea, select, button, label, summary, [role="button"], [contenteditable="true"], .tol-btn';
    var main = document.querySelector('main') || document.body;
    function formPage() { // a page that's mostly a form (a sign-up box doesn't count)
      var n = Array.prototype.filter.call(main.querySelectorAll(FIELDS), function (f) { return !f.closest('.tol-join, .tol-gate, .tol-find, [role="search"]'); }).length;
      return n >= 3 || !!document.querySelector('.wpf-bar');
    }
    function bottomBar() { // the tallest sticky bar along the bottom edge, if any
      var lift = 0;
      Array.prototype.forEach.call(document.querySelectorAll('.wpf-bar, [data-bottom-bar]'), function (b) {
        var r = b.getBoundingClientRect(), pos = getComputedStyle(b).position; if (!r.height || (pos !== 'fixed' && pos !== 'sticky')) return;
        if (r.bottom >= window.innerHeight - 2) lift = Math.max(lift, window.innerHeight - r.top);
      });
      return lift;
    }
    function under() { // is something you can tap (or type in) under the button?
      var r = btn.getBoundingClientRect(); if (!r.width) return false;
      var pts = [], g = [.06, .5, .94];
      g.forEach(function (x) { g.forEach(function (y) { pts.push([x, y]); }); });
      for (var i = 0; i < pts.length; i++) {
        var list = document.elementsFromPoint(r.left + r.width * pts[i][0], r.top + r.height * pts[i][1]) || [];
        for (var j = 0; j < list.length; j++) {
          var n = list[j];
          if (n === btn || btn.contains(n) || n.closest('.tol-breathe, .tol-wx, .pci, .tpv, .tol-join-pop, .tol-invite')) continue;
          if (n.closest(TAPPABLE) && !n.closest('.tol-bar, .tol-panel, .tol-set')) return true;
        }
      }
      return false;
    }
    var spots = ['', 'is-left', 'is-high', 'is-high is-left'], ALL = ['is-left', 'is-high', 'is-hiding'], queued = false;
    function place() {
      queued = false;
      if (btn.classList.contains('is-away')) return;
      btn.classList.remove('is-hiding');
      btn.classList.toggle('is-compact', formPage());
      var lift = bottomBar();
      btn.style.setProperty('--tol-br-lift', lift ? Math.round(lift + 10) + 'px' : '');
      if (!lift) btn.style.removeProperty('--tol-br-lift');
      // try the usual corner first, then the left corner, then up under the top bar
      for (var i = 0; i < spots.length; i++) {
        ALL.forEach(function (c) { btn.classList.remove(c); });
        if (spots[i]) spots[i].split(' ').forEach(function (c) { btn.classList.add(c); });
        if (!under()) return;
      }
      // every corner is busy (a packed form on a small screen): it waits out of the way, and comes back
      // as soon as a scroll frees a corner (unless it has focus, so a keyboard user never loses it)
      ALL.forEach(function (c) { btn.classList.remove(c); });
      if (document.activeElement !== btn) btn.classList.add('is-hiding');
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(place); } }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    // typing: step aside until the field is left
    document.addEventListener('focusin', function (e) {
      var t = e.target;
      if (t && t.matches && t.matches(FIELDS) && !t.closest('.tol-breathe, .tol-bar, .tol-panel, .tol-set')) btn.classList.add('is-away');
    });
    document.addEventListener('focusout', function () {
      setTimeout(function () {
        var a = document.activeElement;
        if (!(a && a.matches && a.matches(FIELDS))) { btn.classList.remove('is-away'); queue(); }
      }, 250);
    });
    setTimeout(queue, 400); setTimeout(queue, 2500);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
  }

  // ---------- Membership ----------
  function norm(e) { return String(e || '').trim().toLowerCase(); }
  function hashEmail(email) {
    if (!(window.crypto && crypto.subtle)) return Promise.reject(new Error('insecure'));
    var data = new TextEncoder().encode('tol:' + norm(email));
    return crypto.subtle.digest('SHA-256', data).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }
  var membersP = null;
  function loadMembers() {
    if (!membersP) {
      membersP = fetch(CONFIG.membersFile, { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('missing'); return r.json(); })
        .then(function (d) { return d.members || []; });
    }
    return membersP;
  }
  // Resolves to true / false; rejects if the list can't be read
  function checkEmail(email) {
    return Promise.all([loadMembers(), hashEmail(email)]).then(function (r) {
      return r[0].indexOf(r[1]) !== -1;
    });
  }

  function applyState(member) {
    isMember = member;
    document.body.classList.toggle('unlocked', member);
    // once signed up, the header says nothing about it (anyone glancing at the screen would see it);
    // the menu panel keeps a plain "Membership" link
    memberLinks.forEach(function (a) {
      a.textContent = member ? 'Membership' : (CONFIG.freePreview ? 'Join free' : 'Join');
      a.classList.toggle('is-member', member);
      if (a === memberLink) a.hidden = member;
    });
    if (typeof barHeightHook === 'function') barHeightHook();
    document.querySelectorAll('.tol-gate').forEach(function (g) { g.hidden = member; });
    renderPlaceholders();
    try { document.dispatchEvent(new CustomEvent('tol-member', { detail: { member: member } })); } catch (e) {}
  }

  function signUpFree(email, msgEl) {
    function say(t, kind) { if (msgEl) { msgEl.textContent = t; msgEl.className = 'tol-msg' + (kind ? ' is-' + kind : ''); } }
    if (!/^\S+@\S+\.\S+$/.test(norm(email))) { say('Enter an email address, like name@example.com.', 'error'); return; }
    say('Signing you up…');
    var body = new URLSearchParams({ email: norm(email), embed: '1' });
    function unlock() { try { localStorage.setItem(STORE_KEY, norm(email)); } catch (e) {} }
    function done() {
      unlock();
      try { localStorage.removeItem('tol-join-pending'); } catch (e) {}
      say('You’re signed up. Every page on the site is now open in this browser. The newsletter may send a confirmation email; confirming keeps you on the update list.', 'ok');
      applyState(true);
    }
    // The newsletter couldn't be reached (offline, blocked, or the service is down). Everything still
    // opens on this device, as promised, but we say so plainly and offer another try.
    function failed() {
      unlock();
      try { localStorage.setItem('tol-join-pending', '1'); } catch (e) {}
      function warn(box) {
        box.className = 'tol-msg is-warn';
        box.innerHTML = 'We couldn’t reach the newsletter just now, so you’re not on the update list yet. Everything is open on this device anyway. Try joining again later. ';
        var again = el('button', { type: 'button', class: 'tol-msg-retry' }, 'Try joining again');
        again.addEventListener('click', function () { signUpFree(email, box); });
        box.appendChild(again);
      }
      if (msgEl) warn(msgEl);
      applyState(true);
      // the form it came from may be tucked away now that everything is open: keep the note in view
      if (!msgEl || !msgEl.getClientRects().length) {
        var note = document.querySelector('.tol-join-note') || el('p', { class: 'tol-join-note', role: 'status' });
        warn(note); note.classList.add('tol-join-note');
        var from = msgEl && msgEl.closest('.tol-gate, form'), main = document.querySelector('main');
        if (!note.parentNode) { if (from) from.after(note); else if (main) main.appendChild(note); else document.body.appendChild(note); }
      }
    }
    if (navigator.onLine === false) { failed(); return; }
    // The newsletter service doesn't let other sites read its reply, so a request that arrives counts as
    // signed up; a request that can't be sent at all (a network error) is told truthfully
    var timer = null, settled = false;
    function once(f) { return function () { if (settled) return; settled = true; clearTimeout(timer); f(); }; }
    var ok = once(done), bad = once(failed);
    timer = setTimeout(bad, 12000);
    fetch(CONFIG.signupUrl, { method: 'POST', mode: 'no-cors', body: body }).then(ok, bad);
  }

  function signIn(email, msgEl) {
    if (CONFIG.freePreview) { signUpFree(email, msgEl); return; }
    function say(t, kind) { if (msgEl) { msgEl.textContent = t; msgEl.className = 'tol-msg' + (kind ? ' is-' + kind : ''); } }
    if (!/^\S+@\S+\.\S+$/.test(norm(email))) { say('Enter the email address you used on Gumroad.', 'error'); return; }
    say('Checking…');
    checkEmail(email).then(function (ok) {
      if (ok) {
        try { localStorage.setItem(STORE_KEY, norm(email)); } catch (e) {}
        say('Unlocked. Every members page on the site is now open in this browser.', 'ok');
        applyState(true);
      } else {
        say('That email isn’t on the members list yet. If you just subscribed, your access is usually added within a day. Questions? Email ' + CONFIG.supportEmail, 'error');
      }
    }).catch(function (err) {
      say(err && err.message === 'insecure'
        ? 'Sign-in needs the secure (https) version of the site.'
        : 'The members list couldn’t be loaded. Check your connection and try again.', 'error');
    });
  }

  function signOut() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    applyState(false);
  }

  function gateMarkup(compact) {
    var g = el('div', { class: 'tol-gate', role: 'region', 'aria-label': 'Members-only content' });
    if (CONFIG.freePreview) {
      g.innerHTML =
        '<h2>Free while it’s being built</h2>' +
        '<p>Everything on this site is free during development. Enter your email to open every chapter, workpaper and tool. You’ll also get a short note when something new ships. Paid membership is coming later; nothing is charged now.</p>' +
        (compact ? '' : '<div class="tol-actions"><a class="tol-btn is-quiet" href="/is-this-for-you.html">Is this right for you?</a></div>') +
        '<form class="tol-signin" novalidate>' +
          '<label for="tol-email-' + Math.random().toString(36).slice(2, 7) + '">Email address</label>' +
          '<div class="tol-field"><input type="email" autocomplete="email" placeholder="name@example.com" required>' +
          '<button class="tol-btn" type="submit">Open everything free</button></div>' +
          '<p class="tol-msg" aria-live="polite"></p>' +
        '</form>' +
        '<p class="tol-fine">Held by Buttondown and used only for program updates. Unsubscribe from any email. <a href="/legal/privacy-policy.html">Privacy policy</a></p>';
      var lab0 = g.querySelector('label'), inp0 = g.querySelector('input');
      inp0.id = lab0.getAttribute('for');
      g.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault(); signIn(inp0.value, g.querySelector('.tol-msg'));
      });
      return g;
    }
    g.innerHTML =
      '<h2>This part is for members</h2>' +
      '<p>Membership is ' + CONFIG.price + ' and opens every chapter, workpaper, and tool on this site. Cancel any time from your Gumroad library.</p>' +
      '<div class="tol-actions"><a class="tol-btn" data-tol-join href="' + CONFIG.joinUrl + '">Join for ' + CONFIG.price + '</a>' +
      (compact ? '' : '<a class="tol-btn is-quiet" href="/membership.html">What’s included</a>') + '</div>' +
      '<form class="tol-signin" novalidate>' +
        '<label for="tol-email-' + Math.random().toString(36).slice(2, 7) + '">Already a member? Enter the email you subscribed with.</label>' +
        '<div class="tol-field"><input type="email" autocomplete="email" placeholder="you@example.com" required>' +
        '<button class="tol-btn" type="submit">Unlock</button></div>' +
        '<p class="tol-msg" aria-live="polite"></p>' +
      '</form>';
    var lab = g.querySelector('label'), inp = g.querySelector('input');
    inp.id = lab.getAttribute('for');
    g.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault(); signIn(inp.value, g.querySelector('.tol-msg'));
    });
    return g;
  }

  function installGates() {
    if (!(here && here.paid)) return;
    var locked = document.querySelectorAll('.locked-section');
    if (!locked.length) {
      // Page marked paid but has no locked markup: lock everything after its first block
      var host = document.querySelector('main, .container, .sheet') || document.body;
      var kids = Array.prototype.filter.call(host.children, function (c) {
        // The simple/full version bar must never be locked away
        return !/^tol-/.test(c.className || '') && !/\bdepth-bar\b/.test(c.className || '') &&
               c.id !== 'tol-main' && c.tagName !== 'SCRIPT';
      });
      if (kids.length > 1) {
        var wrap = el('div', { class: 'locked-section' });
        var anchorEl = host.querySelector(':scope > .depth-bar') || kids[0];
        anchorEl.after(wrap);
        kids.slice(1).forEach(function (k) { wrap.appendChild(k); });
        locked = [wrap];
      }
    }
    if (locked.length) {
      var g = gateMarkup(false);
      g.hidden = isMember;
      locked[0].parentNode.insertBefore(g, locked[0]);
    }
  }

  // ---------- Placeholders pages can use ----------
  function renderPlaceholders() {
    document.querySelectorAll('[data-tol="contents"]').forEach(function (n) {
      n.innerHTML = ''; n.appendChild(buildIndex({ page: true, all: n.hasAttribute('data-all'), h: n.hasAttribute('data-all') ? 'h2' : 'h3' }));
    });
    document.querySelectorAll('[data-tol="members-list"]').forEach(function (n) {
      var html = '';
      SECTIONS.forEach(function (s) {
        var paid = s.items.filter(function (i) { return i.paid; });
        if (!paid.length) return;
        html += '<h3>' + esc(s.title) + '</h3><ul>' + paid.map(function (i) {
          return '<li><a href="' + i.href + '">' + esc(label(i)) + '</a>' + (i.note ? ' <span class="tol-note">' + esc(i.note) + '</span>' : '') + '</li>';
        }).join('') + '</ul>';
      });
      n.innerHTML = html;
    });
    document.querySelectorAll('[data-tol="account"]').forEach(function (n) {
      n.innerHTML = '';
      if (isMember) {
        var email = ''; try { email = localStorage.getItem(STORE_KEY) || ''; } catch (e) {}
        var box = el('div', { class: 'tol-gate' });
        box.innerHTML = (CONFIG.freePreview
          ? '<h2>You’re signed up</h2><p>Every page is open in this browser for <strong>' + esc(email) +
            '</strong>. On another device, enter the same email there.</p>'
          : '<h2>You’re signed in</h2><p>Members pages are open in this browser for <strong>' + esc(email) +
            '</strong>. To use another device, sign in there with the same email.</p>') +
          '<div class="tol-actions"><a class="tol-btn" href="/contents.html">Go to all pages</a>' +
          '<button class="tol-btn is-quiet" type="button">Sign out of this browser</button></div>';
        box.querySelector('button').addEventListener('click', signOut);
        n.appendChild(box);
      } else {
        var g = gateMarkup(true);
        g.querySelector('h2').textContent = CONFIG.freePreview ? 'Open everything free' : 'Join or sign in';
        n.appendChild(g);
      }
    });
    document.querySelectorAll('[data-tol-join]').forEach(function (a) { a.href = CONFIG.joinUrl; });
    // Plain sign-up forms on a page (<form data-tol-signup>): sign up and open everything in one step
    document.querySelectorAll('form[data-tol-signup]').forEach(function (f) {
      if (f.dataset.tolBound) return; f.dataset.tolBound = '1';
      var msg = f.querySelector('.tol-msg');
      if (!msg) { msg = el('p', { class: 'tol-msg', 'aria-live': 'polite' }); f.appendChild(msg); }
      f.addEventListener('submit', function (e) {
        e.preventDefault(); signIn(f.querySelector('input[type="email"]').value, msg);
      });
    });
    document.querySelectorAll('[data-tol-if-member]').forEach(function (n) { n.hidden = !isMember; });
    document.querySelectorAll('[data-tol-if-guest]').forEach(function (n) { n.hidden = isMember; });
    document.querySelectorAll('[data-tol-price]').forEach(function (s) { s.textContent = CONFIG.price; });
    document.querySelectorAll('[data-tol-support]').forEach(function (a) {
      a.href = 'mailto:' + CONFIG.supportEmail; a.textContent = CONFIG.supportEmail;
    });
  }

  // Read-only access for pages that need the page list (e.g. 404.html)
  window.TOL = { sections: SECTIONS, config: CONFIG, signUp: signUpFree, isMember: function () { return isMember; } };

  // ---------- Start ----------
  function start() {
    var stored = null;
    try { stored = localStorage.getItem(STORE_KEY); } catch (e) {}
    // Returning members see content immediately; the check below confirms or revokes it
    isMember = !!stored;
    buildChrome();
    installGates();
    applyState(isMember);
    // not signed up yet: the "join free to unlock everything" banner on the home page and the occasional invitation elsewhere
    if (!isMember && CONFIG.freePreview) { var ji = document.createElement('script'); ji.src = '/assets/js/join-invite.js'; ji.defer = true; document.head.appendChild(ji); }
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }

    if (stored && !CONFIG.freePreview) {
      checkEmail(stored).then(function (ok) {
        if (!ok) { try { localStorage.removeItem(STORE_KEY); } catch (e) {} applyState(false); }
      }).catch(function () { /* list unreachable: leave the returning member's access alone */ });
    }
  }

  addAppMeta();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
