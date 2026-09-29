/* pillars.js — "Pillars in this page": a small strip under a page's title showing which of the
   Five Pillars (see /five-pillars.html) the page puts to work, for you and with others.
   site.js loads this on content pages. Pages with no line in PAGES below get no strip.
   To add a page: add one line to PAGES. Numbers are pillars 1–5; each line under n is
   [what it does for you, what it does between you and others]. A page without its own n
   line for a pillar uses that pillar's general line. Nothing is stored or sent. */
(function () {
  'use strict';
  if (window.TOLPillars) return;

  var PILLARS = [
    null,
    { id: 'see-the-load', roman: 'I', name: 'See the whole load', short: 'See the load', field: 'Ledger accounting',
      you: 'Notice everything you carry, including the unseen, mental and emotional load.',
      us: 'Put it on one shared page, so nobody has to argue about whose work counts.' },
    { id: 'fix-the-setup', roman: 'II', name: 'Fix the setup, not the person', short: 'Fix the setup', field: 'Systems thinking',
      you: 'See your habits and routines as a setup you can redesign, not a flaw in you.',
      us: 'Agree clear owners and handoffs instead of blaming each other.' },
    { id: 'read-your-state', roman: 'III', name: 'Read your state first', short: 'Read your state', field: 'Nervous-system science',
      you: 'Know how full your battery is before you judge a moment.',
      us: 'Pick the timing, pause and come back: your state shapes how their words land.' },
    { id: 'tune-signals', roman: 'IV', name: 'Tune how you send and receive', short: 'Tune the signal', field: 'Signal theory',
      you: 'Know your own wiring, pace and how you hear things.',
      us: 'Translate across different wiring and tone. A mismatch is tuning, not a failing.' },
    { id: 'quiet-incentives', roman: 'V', name: 'Notice the quiet incentives', short: 'Quiet incentives', field: 'Behavioral economics',
      you: 'Spot the defaults and shortcuts that steer your own choices.',
      us: 'See how unclaimed jobs drift to one person, and how fairness and thanks keep things steady.' }
  ];

  var ALL = [1, 2, 3, 4, 5];
  var OVERVIEW = { p: ALL, n: {
    1: ['See what you carry, written down.', 'Put both loads on the same page.'],
    2: ['Treat the strain as a setup to redesign.', 'Agree owners instead of blame.'],
    3: ['Check your battery before you judge.', 'Talk when you both have room.'],
    4: ['Know how you hear things.', 'Translate across different wiring.'],
    5: ['Spot the defaults steering you.', 'Catch jobs drifting to one person.'] } };

  // Page path (simple version) → pillars. In-depth pages share their simple page's line.
  var PAGES = {
    // Guides
    '/how-it-works.html': OVERVIEW,
    '/is-this-for-you.html': OVERVIEW,
    '/relationships.html': { p: [1, 2], n: {
      1: ['Notice what you carry in each relationship.', 'Share one fair picture of the load.'],
      2: ['See strain as a setup you can change.', 'Agree owners that suit this kind of relationship.'] } },
    '/program-overview.html': OVERVIEW,
    '/start-here.html': OVERVIEW,
    '/start-in-10-minutes.html': { p: [3, 1], n: {
      3: ['Check your own weather first.', 'Know whether today is a good day to talk.'],
      1: ['Log one thing you did today.', 'Start a record you can share when you are ready.'] } },
    '/sent-this.html': { p: [1, 4], n: {
      1: ['Look at your own side first, privately.', 'Share only what you choose, when you choose.'],
      4: ['Answer in your own words and time.', 'Say yes, not yet or no kindly.'] } },
    '/program.html': OVERVIEW,
    '/glossary.html': OVERVIEW,
    '/frequency-framework.html': { p: [4], n: {
      4: ['Learn your own rhythm for money, rest, decisions, talking and values.', 'See a clash as two rhythms out of step, and agree when you will meet.'] } },
    '/quick-checks.html': { p: [3], n: {
      3: ['A one-minute read on your own conditions today.', 'Know your talk window before you start a hard talk.'] } },
    '/wired-differently.html': { p: [4], n: {
      4: ['Learn how your wiring hears words and silence.', 'Talk across different wiring without blame.'] } },
    '/turning-toward.html': { p: [4, 5], n: {
      4: ['Notice when someone reaches for you.', 'Answer small bids so they land.'],
      5: ['Notice what you take for granted.', 'Specific thanks keeps the unseen work steady.'] } },
    '/check-ins.html': { p: [3, 4], n: {
      3: ['Check you are calm enough to listen.', 'Choose a time and place you can both handle.'],
      4: ['Say the one thing you mean.', 'Acknowledge before you rebut, so it lands.'] } },
    '/learn/index.html': OVERVIEW,

    // The book
    '/book/preface.html': { p: [1, 5], n: {
      1: ['Name the quiet work you do that nobody sees.', 'Make the unseen work visible to both of you.'],
      5: ['Notice what you do by default.', 'See how unclaimed work settles on one person.'] } },
    '/book/chapter-1.html': { p: [4, 3], n: {
      4: ['Learn your own pace, tone and urgency.', 'Get back in tune when you drift apart.'],
      3: ['Notice how stress bends what you hear.', 'Wait for a calmer moment to retune.'] } },
    '/book/chapter-2.html': { p: [1, 2, 3], n: {
      1: ['Add up what you really carry.', 'Look at the split as a plain fact.'],
      2: ['Ask if the arrangement can last.', 'Judge the setup, never the person.'],
      3: ['Notice when a full battery makes the split feel worse.', 'Talk about the numbers when you both have room.'] } },
    '/book/chapter-3.html': { p: [3, 4], n: {
      3: ['How much of a reaction is leftover stress.', 'Read a big reaction as a full tank, not a verdict.'],
      4: ['Learn which of the seven angles you see from.', 'See the same moment from their angle.'] } },
    '/book/chapter-4.html': { p: [2, 5, 3], n: {
      2: ['Know what fair means to you.', 'Agree a shared idea of fair and build it into the setup.'],
      5: ['Notice which kind of fair you default to.', 'See how two kinds of fair quietly pull apart.'],
      3: ['Let words land before you react.', 'Give their words a moment before you answer.'] } },
    '/book/chapter-5.html': { p: [1, 2, 5], n: {
      1: ['Look back on the month, calmly.', 'Catch what the weekly check-ins missed.'],
      2: ['Find the repeat, then fix the setup.', 'Change the arrangement, not each other.'],
      5: ['Spot the slow drift back to old habits.', 'Keep fairness from quietly sliding.'] } },

    // Workpapers
    '/workpapers/wp-01.html': { p: [1, 4], n: {
      1: ['Log a week of what you do.', 'Compare two logs as facts, not a fight.'],
      4: ['Practice a kind, neutral no.', 'Say no in a way that lands without a fight.'] } },
    '/workpapers/wp-02-battery-stress-meter.html': { p: [3], n: {
      3: ['Five questions: how full is your battery?', 'Know when to talk and when to wait.'] } },
    '/workpapers/wp-03-raci-treaty.html': { p: [2, 5], n: {
      2: ['See which jobs you hold without saying so.', 'One owner per job, so nobody keeps asking.'],
      5: ['Notice what you pick up because nobody else does.', 'Name owners before a job drifts to one person.'] } },
    '/workpapers/wp-04-deficit-audit.html': { p: [2, 5], n: {
      2: ['Find what in the setup lets things slip.', 'Fix the setup behind the repeat, together.'],
      5: ['Spot the default that let it slide.', 'Keep the agreement from drifting.'] } },
    '/workpapers/wp-09-tone-filter.html': { p: [4], n: {
      4: ['Turn a big feeling into a fact, a feeling and an ask.', 'Say it so it lands.'] } },
    '/wp-11.html': { p: [3], n: {
      3: ['Plan what settles you while you are calm.', 'Pause, settle, and come back to the talk.'] } },
    '/workpapers/wp-13-pll-protocol.html': { p: [4, 5], n: {
      4: ['Say where you are today.', 'Ninety seconds a day keeps you in step.'],
      5: ['Make the small check-in the easy default.', 'Catch slips before they turn into resentment.'] } },
    '/workpapers/report-01.html': { p: [1, 2], n: {
      1: ['See your progress week by week.', 'Share one record instead of two memories.'],
      2: ['See which changes to the setup held.', 'Build on what worked together.'] } },
    '/prog-01.html': OVERVIEW,
    '/do/index.html': OVERVIEW,
    '/do/workpaper-playground.html': OVERVIEW,

    // Tools
    '/workpapers/calculators/calc01-solvency.html': { p: [1, 2], n: {
      1: ['Add up your worksheet numbers.', 'See the split as one shared number.'],
      2: ['Ask if the setup can last.', 'It reads the arrangement, never a person.'] } },
    '/lemonade-stand.html': { p: [1, 5], n: {
      1: ['List what you did this week.', 'See the split as a plain fact.'],
      5: ['Notice what you do without being asked.', 'See where the load quietly piles up.'] } },
    '/conversation-reader.html': { p: [4, 3], n: {
      4: ['See what you may be hearing.', 'See where a thread turned, and a calmer reply.'],
      3: ['Notice when you are too wound up to reply.', 'Answer once you are both calmer.'] } },
    '/wiring-card.html': { p: [4], n: {
      4: ['Write down how you receive words and what silence means.', 'Hand them a card on what lands and what to avoid.'] } },
    '/signal-translator.html': { p: [4, 3], n: {
      4: ['Test a sentence against your own wiring.', 'See how it may land for them before you send it.'],
      3: ['Notice the state you are writing from.', 'Pick the room and the moment it lands best.'] } },
    '/carrier-wave-decoder.html': { p: [3, 4], n: {
      3: ['Check your state when a talk goes sideways.', 'Pause together before it grows.'],
      4: ['Find where the signal crossed.', 'Get back in tune and close the books.'] } },
    '/tools/mood-arbitrage-free.html': { p: [3, 4], n: {
      3: ['Name your mood state and shift it gently.', 'Meet each other where you are.'],
      4: ['Know the frequency you are on.', 'Adjust to theirs without blame.'] } },
    '/tools/frequency-calibration.html': { p: [4, 3], n: {
      4: ['Find your natural rhythms.', 'Compare your rhythms side by side.'],
      3: ['Know how long you need to settle after stress.', 'Give each other the recovery time you need.'] } },
    '/tools/frequency-sync-visualizer.html': { p: [4, 2], n: {
      4: ['See your rhythm drift.', 'Watch two rhythms come back into step.'],
      2: ['A small daily routine does the work.', 'The check-in keeps you synced.'] } },
    '/snapshot/index.html': { p: [1, 3, 2], n: {
      1: ['A quick look at what you carry now.', 'A shared starting point.'],
      3: ['How much room you have right now.', 'Know if now is a good time to talk.'],
      2: ['See which part of the setup is strained.', 'Pick one thing to change together.'] } },
    '/dashboard.html': { p: [1, 2], n: {
      1: ['Keep your part of the load in view.', 'One shared page for the whole household.'],
      2: ['See who owns what at a glance.', 'Fix handoffs, not people.'] } },

    // Calm and media
    '/pause-and-play.html': { p: [3], n: {
      3: ['Settle your mind with a calm game.', 'Come back to people with a fuller battery.'] } },
    '/soundscapes.html': { p: [3], n: {
      3: ['Sound for settling down and focusing.', 'Settle first, then talk.'] } },
    '/podcast-index.html': OVERVIEW
  };
  // other addresses for the same thing
  var SAME = {
    '/workpapers/wp-04.html': '/workpapers/wp-04-deficit-audit.html',
    '/workpapers/wp-11.html': '/wp-11.html', '/wp-11-sound-toolkit.html': '/wp-11.html',
    '/wp-01.html': '/workpapers/wp-01.html', '/wp-02.html': '/workpapers/wp-02-battery-stress-meter.html',
    '/wp-03.html': '/workpapers/wp-03-raci-treaty.html', '/wp-04.html': '/workpapers/wp-04-deficit-audit.html',
    '/wp-09.html': '/workpapers/wp-09-tone-filter.html', '/wp-13.html': '/workpapers/wp-13-pll-protocol.html',
    '/calc01-solvency.html': '/workpapers/calculators/calc01-solvency.html',
    '/tools/mood-arbitrage-full.html': '/tools/mood-arbitrage-free.html',
    '/snapshot/snapshot-diagnostic-snapshot-interactive.html': '/snapshot/index.html'
  };

  function pathKey() {
    var p = decodeURIComponent(location.pathname);
    if (/\/$/.test(p)) p += 'index.html';
    else if (!/\.[a-z0-9]+$/i.test(p)) p += '.html';
    p = p.replace(/-in-depth\.html$/, '.html');
    return SAME[p] || p;
  }

  window.TOLPillars = { pillars: PILLARS, pages: PAGES, same: SAME };

  var entry = PAGES[pathKey()];
  if (!entry || document.body.hasAttribute('data-no-pillars') || document.querySelector('.tol-pillars')) return;

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var css = document.createElement('style');
  css.textContent =
    '.tol-pillars{position:relative;z-index:2;box-sizing:border-box;max-width:100%;margin:0 0 1.6rem;padding:.7rem .8rem .6rem;background:#F5EFDE;border:1px solid #D9CBA3;border-radius:3px;font:500 .9rem/1.4 "IBM Plex Mono",ui-monospace,monospace;color:#2B2620}' +
    '.tol-pillars-label{display:block;margin:0 0 .45rem;font-size:.875rem;letter-spacing:.04em;color:#5A5346}' +
    '.tol-pillars-label a{color:#2B2620;text-decoration:underline;text-decoration-color:#A8792F;text-underline-offset:3px}' +
    '.tol-pillars ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.35rem}' +
    '.tol-pillars li{margin:0;max-width:none}' +
    '.tol-pillars .tp-chip{display:inline-flex;align-items:baseline;gap:.35rem;min-height:1.9rem;box-sizing:border-box;padding:.3rem .55rem;border:1px dashed #B8A77E;border-radius:999px;background:#F5EFDE;color:#4A4439;text-decoration:none}' +
    '.tol-pillars .tp-chip b{font-weight:500;font-size:.875rem;letter-spacing:.04em}' +
    '.tol-pillars .tp-chip.is-on{border:1px solid #2B2620;background:#2B2620;color:#F5EFDE}' +
    '.tol-pillars .tp-chip:hover{border-style:solid;border-color:#A8792F}' +
    '.tol-pillars .tp-chip.is-on:hover{background:#3E6B4C;border-color:#3E6B4C;color:#fff}' +
    '.tol-pillars a:focus-visible,.tol-pillars summary:focus-visible{outline:2px solid #2B5B8C;outline-offset:2px}' +
    '.tol-pillars details{margin:.5rem 0 0}' +
    '.tol-pillars summary{cursor:pointer;font-size:.875rem;color:#4A4439;width:max-content;max-width:100%}' +
    '.tol-pillars dl{margin:.5rem 0 0;font:400 .9rem/1.5 "Lora",Georgia,serif;color:#2B2620}' +
    '.tol-pillars dt{margin:.55rem 0 .1rem;font:600 .9rem/1.3 "Fraunces",Georgia,serif}' +
    '.tol-pillars dd{margin:0 0 .1rem;max-width:62ch}' +
    '.tol-pillars dd span{font:500 .875rem/1.2 "IBM Plex Mono",ui-monospace,monospace;color:#7A5A1E;letter-spacing:.04em;margin-right:.35rem}' +
    '.tol-pillars .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}' +
    '@media print{.tol-pillars{display:none}}';
  document.head.appendChild(css);

  var on = {}; entry.p.forEach(function (n) { on[n] = true; });
  var chips = '', how = '';
  for (var i = 1; i <= 5; i++) {
    var P = PILLARS[i], lines = (entry.n && entry.n[i]) || [P.you, P.us];
    var tip = on[i] ? 'For you: ' + lines[0] + ' With others: ' + lines[1] : P.name + ' (' + P.field + ')';
    chips += '<li><a class="tp-chip' + (on[i] ? ' is-on' : '') + '" href="/five-pillars.html#' + P.id + '" title="' + esc(tip) + '">' +
      '<b>' + P.roman + '</b>' + esc(P.short) + (on[i] ? '<span class="sr"> (used on this page)</span>' : '') + '</a></li>';
  }
  entry.p.forEach(function (n) {
    var P = PILLARS[n], lines = (entry.n && entry.n[n]) || [P.you, P.us];
    how += '<dt>' + P.roman + '. ' + esc(P.name) + '</dt><dd><span>FOR YOU</span>' + esc(lines[0]) + '</dd><dd><span>WITH OTHERS</span>' + esc(lines[1]) + '</dd>';
  });

  var nav = document.createElement('nav');
  nav.className = 'tol-pillars';
  nav.setAttribute('aria-label', 'Pillars in this page');
  nav.innerHTML = '<span class="tol-pillars-label">Pillars in this page · <a href="/five-pillars.html">the Five Pillars</a></span>' +
    '<ul>' + chips + '</ul>' +
    '<details><summary>How this page uses ' + (entry.p.length === 1 ? 'it' : 'them') + '</summary><dl>' + how + '</dl></details>';

  // Place it under the title: after the depth bar (and its gentle note), or the page header, or the first h1
  var main = document.querySelector('main') || document.body;
  var after = main.querySelector('.depth-bar') || main.querySelector('.read-head');
  if (after && after.nextElementSibling && after.nextElementSibling.classList.contains('tol-gentle')) after = after.nextElementSibling;
  if (!after) {
    var h1 = main.querySelector('h1') || document.querySelector('h1');
    if (!h1) return;
    after = h1;
    // step out of a small header wrapper, but never out of main or a big wrapper
    var up = h1.parentNode;
    if (up && up !== main && up !== document.body && /^(HEADER|HGROUP)$/.test(up.tagName)) after = up;
  }
  after.parentNode.insertBefore(nav, after.nextSibling);
})();
