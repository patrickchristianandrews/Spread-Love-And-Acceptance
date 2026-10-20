#!/usr/bin/env node
/* test-search.js: checks that the site search finds the right page for the way real people describe things.

   Run from the repository root (needs Playwright and its Chromium):
     NODE_PATH=$(npm root -g) node tools/search/test-search.js
   Options: BASE=http://127.0.0.1:8547 to use a server that is already running (otherwise it starts
   python3 -m http.server on PORT, default 8547), CHROMIUM=/path/to/chromium, UI=0 to skip the screen checks.

   1. Ranking: each query must have one of its expected pages in the top 3 of the combined list (the
      "Best match for what you described" pages first, then the page search). Typos, vague words.
   2. Safety: questions about being hurt or controlled at home get no "best match", and no search ever offers the
      removed pages (/safety.html, /outside-help.html, /en-espanol.html: redirect stubs since purge19).
   3. Nothing found: the query gets the fallback (closest needs, the 3-question finder, Professor Puddles, Explore).
   4. Screens: the menu search at 390 (touch) and 1366, light and dark: the empty-box chips, a best match, the
      fallback; /explore.html and /tools.html find boxes; no console errors, no sideways scroll.
   Nothing here changes the site. */
'use strict';
const { spawn } = require('child_process');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright is needed: NODE_PATH=$(npm root -g) node tools/search/test-search.js'); process.exit(2); }

const ROOT = path.resolve(__dirname, '..', '..');
const PORT = +(process.env.PORT || 8547);
const BASE = process.env.BASE || ('http://127.0.0.1:' + PORT);
const EXE = process.env.CHROMIUM || '/opt/pw-browsers/chromium';

// [query, expected pages (any one of them in the top 3)]
const CASES = [
  // chores and the load at home
  ['we keep fighting about dishes', ['/lemonade-stand.html', '/share-the-load.html']],
  ['we argue about chores', ['/lemonade-stand.html', '/share-the-load.html']],
  ['i do everything around the house', ['/lemonade-stand.html', '/invisible-labor-mental-load.html']],
  ['my husband never helps with the kids', ['/lemonade-stand.html', '/invisible-labor-mental-load.html']],
  ['she never lifts a finger', ['/lemonade-stand.html', '/invisible-labor-mental-load.html']],
  ['i have to remember everything', ['/invisible-labor-mental-load.html']],
  ['mental load', ['/invisible-labor-mental-load.html']],
  ['is our split fair', ['/lemonade-stand.html', '/workpapers/calculators/is-the-setup-working-quick.html']],
  ['chore chart', ['/chore-chart-for-couples.html']],
  ['cleaning rota', ['/chore-chart-for-couples.html']],
  ['the bins never go out', ['/workpapers/wp-04-what-keeps-coming-back.html']],
  ['my roommate never cleans', ['/share-the-load.html#roommates', '/sharing-a-room.html']],
  ['flatmate leaves dishes in the sink', ['/share-the-load.html#roommates', '/lemonade-stand.html']],
  ['roommate has guests over all the time', ['/sharing-a-room.html']],
  ['who pays for what', ['/money-together.html', '/lemonade-stand.html']],
  ['newborn and exhausted', ['/new-parent.html']],
  ['he works nights we never see each other', ['/different-hours.html']],
  ['husband retired and under my feet', ['/retired-together.html']],
  ['partner has a chronic illness', ['/when-one-is-ill.html']],
  ['caring for my mum with dementia', ['/caregivers.html']],
  // flow17 (panel17): real words from the panel
  ['caring for elderly parent', ['/caregivers.html', '/family-obligations.html#visits']],
  ['mother in law lives with us', ['/family-obligations.html#visits']],
  ["wife doesn't recognise me", ['/caregivers.html#still-here', '/caregivers.html#care-home']],
  ['care home', ['/caregivers.html#care-home']],
  ['my partner is in a care home', ['/caregivers.html#care-home']],
  ['partner is social and I need alone time', ['/wiring-card.html', '/the-logic-behind-it.html#l-alone-after-people']],
  ['we just moved in together and I need quiet and routine', ['/wiring-card.html', '/the-logic-behind-it.html#l-alone-after-people']],
  ['texts misread', ['/signal-translator.html', '/different-hours.html#talking']],
  ['teen phone', ['/teens.html#curfew-phone', '/parents.html#teens']],
  ['5 minutes together', ['/journeys.html#busy2']],
  ['quick thing tonight', ['/journeys.html#busy2']],
  ['worksheets', ['/workpapers/fill/suite.html']],
  ['step by step plan', ['/prog-01.html']],
  // talking, fights and texts
  ['we keep fighting', ['/how-to-stop-fighting-with-your-partner.html']],
  ['fighting', ['/how-to-stop-fighting-with-your-partner.html', '/upset-right-now.html']],
  ['we just had a huge fight', ['/upset-right-now.html']],
  ['so angry right now', ['/upset-right-now.html']],
  ['the talk went wrong', ['/carrier-wave-decoder.html']],
  ['how do we make up after a fight', ['/carrier-wave-decoder.html', '/apology-languages.html']],
  ['why did she react like that', ['/carrier-wave-decoder.html?tab=their-side']],
  ['see it from their point of view', ['/carrier-wave-decoder.html?tab=their-side']],
  ['does this message sound rude', ['/signal-translator.html']],
  ['check my text before i send it', ['/signal-translator.html']],
  ['is my text passive aggressive', ['/signal-translator.html']],
  ['what does this text mean', ['/signal-translator.html']],
  ['left on read', ['/signal-translator.html']],
  ['screenshot of our argument', ['/signal-translator.html#conversation', '/signal-translator.html']],
  ['how do i reply to a mean text', ['/workpapers/wp-09-say-it-so-it-lands.html', '/signal-translator.html']],
  ['too upset to talk face to face', ['/write-it-through.html']],
  ['how to start a difficult conversation', ['/write-it-through.html', '/communication.html#hard-talks']],
  ['he shuts down when we argue', ['/pursue-withdraw.html']],
  ['silent treatment', ['/pursue-withdraw.html']],
  ['my partner never listens', ['/write-it-through.html', '/communication.html#listening', '/check-ins.html#card']],
  ['how to apologize', ['/apology-languages.html']],
  ['how to say sorry properly', ['/apology-languages.html']],
  ['stop nagging', ['/small-wins.html#flip-it']],
  ['how to say no', ['/refusals.html#make', '/refusals.html']],
  ['people pleaser', ['/refusals.html#make', '/refusals.html']],
  ['weekly check in', ['/check-ins.html', '/check-ins.html#card']],
  ['we never talk anymore', ['/turning-toward.html', '/workpapers/wp-13-daily-check-in.html']],
  ['stress from work is making us fight', ['/workpapers/wp-14-is-it-us-or-everything-else.html']],
  ['we feel like roommates', ['/complacency.html', '/turning-toward.html', '/empty-nest.html']],
  ['the spark is gone', ['/complacency.html', '/turning-toward.html']],
  ['date night ideas', ['/bonding.html#ideas', '/turning-toward.html']],
  ['i dont feel loved', ['/love-languages.html#ll-card-h', '/love-languages.html']],
  ['taken for granted', ['/love-languages.html#ll-card-h', '/complacency.html', '/turning-toward.html#thanks']],
  ['communication style quiz', ['/wavelength.html', '/communication-style-quiz.html']],
  ['how i like to be spoken to', ['/wiring-card.html']],
  ['he cheated on me', ['/book/understanding-11-healing.html']],
  ['inside jokes', ['/touchstones.html']],
  // self-discovery
  ['why do i react like this', ['/growing-up.html#roots-h', '/growing-up.html']],
  ['is this from my childhood', ['/growing-up.html#roots-h', '/growing-up.html']],
  ['self discovery', ['/know-yourself.html', '/self-path.html']],
  ['self-discovery', ['/know-yourself.html', '/self-path.html']],
  ['know myself', ['/know-yourself.html', '/self-path.html']],
  ['who am i', ['/know-yourself.html', '/self-path.html']],
  ['understand myself', ['/know-yourself.html', '/self-path.html']],
  // calm, sleep and stress
  ["i can't switch off at night", ['/night-garden.html', '/soundscapes.html#background']],
  ['cant sleep', ['/night-garden.html', '/soundscapes.html#background']],
  ['insomnia', ['/night-garden.html', '/soundscapes.html#background', '/calm-visualizer.html']],
  ['i feel anxious', ['/upset-right-now.html', '/nervous-system.html']],
  ['panic attack', ['/upset-right-now.html', '/nervous-system.html']],
  ['overwhelmed', ['/workpapers/wp-02-how-much-are-you-carrying.html', '/quick-checks.html#today']],
  ['burnout', ['/workpapers/wp-02-how-much-are-you-carrying.html', '/quick-checks.html#today', '/quick-checks.html']],
  ['how am i feeling', ['/quick-checks.html#today', '/ladder.html']],
  ['mood check', ['/quick-checks.html#today', '/quick-checks.html']],
  ['fight or flight', ['/nervous-system.html']],
  ['i lose my temper', ['/parents.html#anger-help', '/wp-11.html']],
  ['brown noise', ['/soundscapes.html#background', '/soundscapes.html']],
  ['calming music', ['/soundscapes.html']],
  ['breathing exercise', ['/night-garden.html', '/upset-right-now.html']],
  ['supplements for anxiety', ['/calming-supplements.html']],
  ['sad', ['/quick-checks.html#today', '/small-wins.html']],
  ['i feel depressed', ['/quick-checks.html#today', '/small-wins.html']],
  ['exhausted', ['/quick-checks.html#today', '/workpapers/wp-02-how-much-are-you-carrying.html', '/quick-checks.html']],
  ['calm down', ['/upset-right-now.html']],
  ["i'm bored", ['/pause-and-play.html']],
  ['crossword', ['/quiet-crossword.html', '/daily-ledger-crossword.html']],
  ['word search', ['/quiet-words.html']],
  ['my partner is upset how do i help', ['/tools/soften-a-tense-moment.html']],
  // family and parenting
  ["my teen won't talk to me", ['/parents.html#teens']],
  ['teenager ignores me', ['/parents.html#teens']],
  ['my parents are always fighting', ['/teens.html', '/teens.html#middle']],
  ['kids keep fighting', ['/parents.html#siblings']],
  ['i yell at my kids', ['/parents.html#yelling']],
  ['toddler tantrums', ['/parents.html#feelings', '/parents.html']],
  ['my son has adhd', ['/adhd-kids.html']],
  ['kids', ['/parents.html']],
  ['co parenting with a difficult ex', ['/co-parenting.html']],
  ['my ex wont cooperate', ['/co-parenting.html']],
  ['my stepkids dont like me', ['/stepfamily.html']],
  ['grandparent boundaries', ['/grandparents.html']],
  ['my mum keeps giving advice', ['/grown-up-children.html']],
  ['mother in law problems', ['/family-obligations.html#visits', '/grown-up-children.html#in-laws']],
  ['estranged from my brother', ['/family-rifts.html']],
  ['christmas and eid', ['/two-faiths.html']],
  ['raising my grandchildren', ['/foster-and-kinship.html']],
  ['empty nest', ['/empty-nest.html']],
  // life changes, friends, work
  ['after a breakup', ['/on-my-own.html']],
  ['going through a divorce', ['/on-my-own.html', '/co-parenting.html']],
  ['my dad died', ['/grief.html']],
  ['i feel lonely', ['/living-alone.html#solitude', '/friends.html', '/living-alone.html']],
  ['i have no friends', ['/living-alone.html#solitude', '/friends.html', '/living-alone.html#friends']],
  ['my friend never texts back', ['/friends.html']],
  ['just started dating', ['/new-relationship.html']],
  ['is this a red flag', ['/new-relationship-in-depth.html#flags', '/new-relationship.html']],
  ['moving in together', ['/new-relationship.html#moving-in', '/money-together.html#moving-in']],
  ['we fight about money', ['/money-together.html']],
  ['long distance relationship', ['/long-distance.html']],
  ['how to come out to my parents', ['/coming-out.html']],
  ['he games all night', ['/gaming-and-time-together.html']],
  ['my bf ignores me for fortnite', ['/gaming-and-time-together.html']],
  ['always on his phone', ['/gaming-and-time-together.html']],
  ['my partner has adhd', ['/neurodivergent-relationships.html']],
  ["i'm autistic", ['/how-you-take-things-in.html', '/wired-differently.html']],
  ['difficult coworker', ['/work.html']],
  ['unfair workload at work', ['/work.html#workload', '/work.html#owner-list']],
  ['run a support group', ['/groups.html']],
  // vague
  ['help', ['/start-here.html#three-questions', '/ask.html']],
  ['where do i start', ['/start-here.html#three-questions', '/start-in-10-minutes.html']],
  ['idk', ['/start-here.html#three-questions']],
  ['relationship advice', ['/relationships.html']],
  ['someone sent me this link', ['/someone-sent-you-this.html']],
  ['delete my data', ['/on-this-device.html']],
  // typos and slang
  ['chors', ['/lemonade-stand.html', '/share-the-load.html']],
  ['anxios', ['/upset-right-now.html', '/nervous-system.html']],
  ['im stresed', ['/workpapers/wp-02-how-much-are-you-carrying.html', '/quick-checks.html#today']],
  ['teenger wont talk', ['/parents.html#teens']],
  ['cant sleeep', ['/night-garden.html', '/soundscapes.html#background']],
  ['loney', ['/living-alone.html#solitude', '/friends.html']],
  ['apologise', ['/apology-languages.html']],
  ['my gf is mad at me', ['/signal-translator.html', '/upset-right-now.html', '/carrier-wave-decoder.html']],
  ['hubby never does the laundry', ['/lemonade-stand.html', '/invisible-labor-mental-load.html']],
  // home16b (panel16): an ex without kids is a breakup; clinical words; adult ADHD; exams and halls; retirement;
  // kinship; the print books; Spanish family words; the mental load in his words
  ['how do i stop texting my ex', ['/after-a-breakup.html']],
  ['no contact', ['/after-a-breakup.html']],
  ['miss him', ['/after-a-breakup.html']],
  ['contempt', ['/library/relationships.html#four-horsemen']],
  ['four horsemen', ['/library/relationships.html#four-horsemen']],
  ['stonewalling', ['/pursue-withdraw.html', '/library/relationships.html#four-horsemen']],
  ['adhd forgetting', ['/neurodivergent-relationships.html', '/wiring-card.html']],
  ['i forget plans and she feels like i dont care', ['/neurodivergent-relationships.html', '/wiring-card.html']],
  ['anxious before exam', ['/upset-right-now.html', '/night-garden.html', '/nervous-system.html']],
  ['flatmate loud at night', ['/sharing-a-room.html']],
  ['uni halls', ['/sharing-a-room.html']],
  ['university', ['/sharing-a-room.html']],
  ['wife says I am in the way', ['/retired-together.html']],
  ['under my feet', ['/retired-together.html']],
  ['my daughter is in and out of his life', ['/foster-and-kinship.html#kinship', '/foster-and-kinship.html']],
  ["mom doesn't show up", ['/foster-and-kinship.html#kinship', '/foster-and-kinship.html#contact']],
  ['paperback', ['/book/index.html#print-series']],
  ['buy the book', ['/book/index.html#print-series']],
  ["she says I don't notice things", ['/invisible-labor-mental-load.html', '/lemonade-stand.html#quick']],
  // page names still find the page
  ['night garden', ['/night-garden.html']],
  ['wavelength', ['/wavelength.html']],
  ['glossary', ['/glossary.html']]
];
// safety: no "best match", and never a removed page
const SAFETY = ['my partner hits me', 'he controls the money', 'scared of him', 'he checks my phone'];
// the removed pages never come up, whatever is typed (purge19)
const GONE_PAGES = /^\/(safety|outside-help|en-espanol)\.html/;
const GONE_Q = ['find a therapist', 'helpline', 'hotline', 'not safe at home', 'help beyond this site', 'support groups', 'en español', 'spanish', 'peleamos mucho', 'necesito ayuda', 'leave this site quickly'];
// nothing matches: the fallback shows
const NONE = ['xyzzy blorf', 'qqqq zzzz'];

function hit(urls, exp) {
  const top = urls.slice(0, 3);
  return exp.some(e => top.some(u => u === e || (e.indexOf('#') === -1 && e.indexOf('?') === -1 && u.split(/[?#]/)[0] === e)));
}

async function waitUp(url, n) { for (let i = 0; i < (n || 50); i++) { try { const r = await fetch(url); if (r.ok) return true; } catch (e) {} await new Promise(r => setTimeout(r, 100)); } return false; }

(async () => {
  let srv = null;
  if (!process.env.BASE) {
    srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
    if (!(await waitUp(BASE + '/index.html'))) { console.error('server did not start on ' + BASE); srv.kill(); process.exit(2); }
  }
  const browser = await chromium.launch({ executablePath: EXE });
  let fails = 0, passes = 0;
  const ok = (cond, msg) => { if (cond) passes++; else { fails++; console.log('FAIL ' + msg); } };
  const guard = async (page, errs) => {
    await page.route('**/*', r => /^http:\/\/127\.0\.0\.1(:\d+)?\//.test(r.request().url()) ? r.continue() : r.abort());
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  };
  try {
    // ---- 1-3: ranking, safety, fallback
    const page = await browser.newPage(); const errs = [];
    await guard(page, errs);
    await page.goto(BASE + '/tools.html');
    await page.waitForFunction(() => window.TOLSearch && window.TOLSearch.rank);
    const rank = q => page.evaluate(q => new Promise(done => window.TOLSearch.rank(q, done)), q);
    const t0 = Date.now();
    for (const [q, exp] of CASES) {
      const R = await rank(q);
      ok(hit(R.urls, exp), JSON.stringify(q) + ' top 3: ' + R.urls.slice(0, 3).join(' ') + '  (wanted ' + exp.join(' or ') + ')');
    }
    const ms = (Date.now() - t0) / CASES.length;
    // home16b: what must NOT come up
    const NOT = [
      ['husband retired and always under my feet', '/grief.html', 3],
      ['how do i stop texting my ex', '/co-parenting.html', 3],
      ['adhd forgetting', '/adhd-kids.html', 2],
      ['anxious before exam', '/invisible-labor-mental-load.html', 5],
      ["she says I don't notice things", '/love-languages.html', 1],
      // flow17: a misread text is not about an ex
      ['texts misread', '/after-a-breakup.html', 2],
      ['care home', '/foster-and-kinship.html', 1]
    ];
    for (const [q, u, n] of NOT) {
      const R = await rank(q);
      ok(!R.urls.slice(0, n).some(x => x.split(/[?#]/)[0] === u), JSON.stringify(q) + ' should not have ' + u + ' in the top ' + n + ': ' + R.urls.slice(0, n).join(' '));
    }
    // one tool, one entry: the best match's page isn't listed again under its old name
    for (const q of ['night feeds', 'exhausted']) {
      const R = await rank(q), paths = R.urls.map(u => u.split(/[?#]/)[0]);
      const dup = R.urls.filter(u => !/[?#]/.test(u) && R.urls.some(v => v !== u && /[?#]/.test(v) && v.split(/[?#]/)[0] === u && R.best && R.best.g.some(g => g[0] === v)));
      ok(!dup.length, JSON.stringify(q) + ' lists a best-match tool twice: ' + dup.join(' ') + ' (' + paths.slice(0, 6).join(' ') + ')');
    }
    for (const q of SAFETY) {
      const R = await rank(q);
      ok(!R.urls.some(u => GONE_PAGES.test(u)) && !R.best, 'safety ' + JSON.stringify(q) + ' -> ' + R.urls.slice(0, 2).join(' ') + (R.best ? ' (best match shown: ' + R.best.id + ')' : ''));
    }
    for (const q of SAFETY.concat(GONE_Q)) {
      const R = await rank(q);
      ok(!R.urls.some(u => GONE_PAGES.test(u)) && !(R.best && R.best.g.some(g => GONE_PAGES.test(g[0]))), 'no removed page for ' + JSON.stringify(q) + ': ' + R.urls.slice(0, 5).join(' '));
    }
    for (const q of NONE) {
      const R = await rank(q);
      ok(R.fallback, 'nothing-found ' + JSON.stringify(q) + ' should fall back, got ' + R.urls.slice(0, 3).join(' '));
    }
    // every needs address resolves to a page that exists (not a redirect stub)
    const bad = await page.evaluate(async () => {
      const out = [], seen = {};
      for (const n of window.TOL_NEEDS.needs) for (const g of n.g) {
        const p = g[0].split(/[?#]/)[0]; if (seen[p]) continue; seen[p] = 1;
        const r = await fetch(p); const t = r.ok ? await r.text() : '';
        if (!r.ok || /http-equiv=["']refresh/i.test(t)) out.push(g[0] + (r.ok ? ' is a redirect' : ' ' + r.status));
      }
      return out;
    });
    ok(!bad.length, 'needs addresses that are missing or redirect: ' + bad.join(', '));
    ok(!errs.length, 'console errors on /tools.html: ' + errs.join(' | '));
    console.log('ranking: ' + CASES.length + ' queries, ' + SAFETY.length + ' safety, ' + NONE.length + ' nothing-found; ' + ms.toFixed(1) + ' ms per query');
    await page.close();

    // ---- 4: the screens
    if (process.env.UI !== '0') {
      const VIEWS = [{ w: 390, h: 844, touch: true }, { w: 1366, h: 768, touch: false }];
      for (const v of VIEWS) for (const scheme of ['light', 'dark']) {
        const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, hasTouch: v.touch, isMobile: v.touch, colorScheme: scheme });
        const p = await ctx.newPage(); const E = []; await guard(p, E);
        const tag = v.w + '-' + scheme;
        await p.goto(BASE + '/index.html');
        // the Search button on a wide screen, the Menu button on a phone (the search box sits at the top of the menu)
        await p.waitForFunction(() => [].some.call(document.querySelectorAll('[aria-controls="tol-panel"]'), b => b.offsetParent), null, { timeout: 8000 });
        await p.evaluate(() => { const b = document.querySelector('.tol-search-btn'); (b && b.offsetParent ? b : document.querySelector('.tol-contents-btn')).click(); });
        const input = p.locator('#tol-find-q');
        await input.waitFor({ state: 'visible' });
        await input.focus();
        await p.waitForSelector('.tol-find-help .tol-find-chip', { timeout: 5000 });
        const chips = await p.$$eval('.tol-find-help .tol-find-chip', b => b.map(x => x.textContent));
        ok(chips.length >= 8 && chips.length <= 10, tag + ' empty box shows 8-10 chips (' + chips.length + ')');
        ok(await p.$eval('#tol-find-q', i => /going on/i.test(i.placeholder)), tag + ' placeholder describes a problem');
        ok(await p.$('.tol-find-help a[href="/start-here.html#three-questions"]') && await p.$('.tol-find-help a[href="/explore.html"]'), tag + ' empty box has the finder and Explore');
        // a chip searches its words and shows the best match
        await p.click('.tol-find-help .tol-find-chip');
        await p.waitForSelector('.tol-find-best:not([hidden]) a', { timeout: 8000 });
        ok(await p.$eval('.tol-find-best h3', h => /best match/i.test(h.textContent)), tag + ' chip gives "Best match for what you described"');
        // a typed problem
        await input.fill('we keep fighting about dishes');
        await p.waitForFunction(() => { const b = document.querySelector('.tol-find-best'); return b && !b.hidden && /lemonade-stand/.test(b.innerHTML); }, null, { timeout: 8000 });
        await p.waitForFunction(() => !document.querySelector('.tol-find-results').hidden, null, { timeout: 8000 });
        ok(true, tag + ' typed problem shows best match then results');
        // workpapers and tools: always labelled as what they are, and each kind kept together
        for (const words of ['we keep fighting about dishes', 'chores', 'check in', 'worksheet']) {
          await input.fill(words);
          await p.waitForFunction(w => document.querySelector('#tol-find-q').value === w && (!document.querySelector('.tol-find-results').hidden || !document.querySelector('.tol-find-best').hidden), words, { timeout: 8000 });
          await p.waitForTimeout(400);
          const K = await p.evaluate(() => {
            const WP = /^\/workpapers\/(?!calculators\/)|^\/wp-\d|^\/(prog-01|week-0|full-path|chore-chart-for-couples)\.html$/;
            const bad = [], runs = {};
            for (const sel of ['.tol-find-best a[data-kind]', '.tol-find-results a[data-kind]']) {
              let last = null; const seen = {};
              document.querySelectorAll(sel).forEach(a => {
                const k = a.getAttribute('data-kind'), path = a.getAttribute('href').split(/[?#]/)[0], tagT = (a.querySelector('.tol-find-kind') || {}).textContent || '';
                if (WP.test(path) && (k !== 'Workpaper' || tagT !== 'Workpaper')) bad.push(path + ' shown as ' + k + '/' + tagT);
                if (!WP.test(path) && (k === 'Workpaper' || tagT === 'Workpaper')) bad.push(path + ' shown as a workpaper');
                if (k !== last) { if (seen[k]) bad.push(sel + ': ' + k + ' split into two groups'); seen[k] = 1; last = k; }
              });
            }
            return bad;
          });
          ok(!K.length, tag + ' "' + words + '" workpapers vs tools: ' + K.join('; '));
        }
        // home16b: "exam" doesn't mark "example", and Enter opens the top result
        await input.fill('anxious before exam');
        await p.waitForFunction(() => { const b = document.querySelector('.tol-find-best'); return b && !b.hidden && /upset-right-now/.test(b.innerHTML); }, null, { timeout: 8000 });
        await p.waitForTimeout(400);
        ok(!(await p.evaluate(() => [].some.call(document.querySelectorAll('.tol-find-results mark'), m => /^exam$/i.test(m.textContent) && /^ple/i.test((m.nextSibling && m.nextSibling.textContent) || '')))), tag + ' "exam" is not marked inside "example"');
        // the panel says Search when it was opened from the search button (Menu from the Menu button)
        ok(await p.evaluate(() => { const h = document.querySelector('#tol-panel .tol-panel-head h2'); return !!h && (/^Search$/.test(h.textContent) || !document.querySelector('.tol-search-btn').offsetParent); }), tag + ' panel opened from Search is titled Search');
        await Promise.all([p.waitForURL(/upset-right-now\.html/, { timeout: 8000 }), input.press('Enter')]);
        ok(true, tag + ' Enter opens the top result');
        await p.goto(BASE + '/index.html');
        await p.waitForFunction(() => [].some.call(document.querySelectorAll('[aria-controls="tol-panel"]'), b => b.offsetParent), null, { timeout: 8000 });
        await p.evaluate(() => { const b = document.querySelector('.tol-search-btn'); (b && b.offsetParent ? b : document.querySelector('.tol-contents-btn')).click(); });
        await input.waitFor({ state: 'visible' });
        // nothing found: the fallback
        await input.fill('xyzzy blorf');
        await p.waitForSelector('.tol-find-none:not([hidden])', { timeout: 8000 });
        const fb = await p.$eval('.tol-find-none', d => ({ ask: !!d.querySelector('[data-find-ask="xyzzy blorf"]'), finder: !!d.querySelector('a[href="/start-here.html#three-questions"]'), all: !!d.querySelector('a[href="/explore.html"]'), chips: d.querySelectorAll('.tol-find-chip').length }));
        ok(fb.ask && fb.finder && fb.all && fb.chips > 0, tag + ' fallback: ' + JSON.stringify(fb));
        const sx = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        ok(sx <= 0, tag + ' no sideways scroll on the home page with search open (' + sx + 'px)');
        await p.screenshot({ path: path.join(process.env.SHOTS || '/tmp', 'search11-menu-' + tag + '.png') }).catch(() => {});
        // explore and tools find boxes
        await p.goto(BASE + '/explore.html?q=' + encodeURIComponent('my teen wont talk to me'));
        await p.waitForSelector('.ex-best:not([hidden]) a', { timeout: 8000 });
        ok(await p.$eval('.ex-best', d => /parents\.html#teens/.test(d.innerHTML)), tag + ' explore best match');
        await p.fill('#ex-q', 'xyzzy blorf');
        await p.waitForSelector('.ex-none:not([hidden]) [data-find-ask]', { timeout: 8000 });
        ok(true, tag + ' explore fallback');
        ok(await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 0, tag + ' explore no sideways scroll');
        await p.goto(BASE + '/tools.html');
        await p.fill('#tl-q', 'i cant switch off at night');
        await p.waitForSelector('.tl-needbest:not([hidden]) a', { timeout: 8000 });
        ok(await p.$eval('.tl-needbest', d => /night-garden/.test(d.innerHTML)), tag + ' tools best match');
        ok(await p.$$eval('.tl-grid > li:not([hidden])', l => l.length) > 0, tag + ' tools: matching tool cards shown');
        await p.fill('#tl-q', 'xyzzy blorf');
        await p.waitForSelector('.tl-none:not([hidden]) [data-find-ask]', { timeout: 8000 });
        ok(true, tag + ' tools fallback');
        ok(await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 0, tag + ' tools no sideways scroll');
        ok(!E.length, tag + ' console errors: ' + E.join(' | '));
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
    if (srv) srv.kill();
  }
  console.log((fails ? 'FAILED ' : 'PASSED ') + passes + ' checks passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})();
