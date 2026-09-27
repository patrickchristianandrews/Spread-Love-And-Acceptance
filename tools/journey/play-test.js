#!/usr/bin/env node
/* play-test.js — plays The Frequency Journey from start to sky in a real browser (Playwright), the way a
   person would: tapping answers, tiles, flowers, crystals and call arrows, and walking the pals.
   It runs the whole journey twice in fresh browser contexts at a phone size (390x844) and a desktop size
   (1280x800), then checks:
     - every one of the 18 levels is won, with TOLRewards.earn called once per win
     - the content differs between the two runs (fresh sets each play)
     - replaying finished levels in the same browser draws items this player hasn't seen yet
     - every "Read more" and Five Pillars link on the win cards resolves
     - no page errors, and no sideways scrolling, on any level
   Screenshots go to the folder given by --shots (default: a temp folder).

   python3 -m http.server 8765   (from the repo root, if nothing is serving it)
   node tools/journey/play-test.js [--base http://localhost:8765] [--shots DIR] [--only 390]      */
'use strict';
var path = require('path'), fs = require('fs'), os = require('os');
var PW = process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright';
var chromium = require(PW).chromium;
function arg(n, d) { var i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; }
var BASE = arg('--base', 'http://localhost:8765'), SHOTS = arg('--shots', fs.mkdtempSync(path.join(os.tmpdir(), 'fj-shots-'))), ONLY = arg('--only', '');
var SIZES = [{ name: 'phone', width: 390, height: 844 }, { name: 'desktop', width: 1280, height: 800 }].filter(function (s) { return !ONLY || String(s.width) === ONLY; });
var bad = 0;
function fail(msg) { bad++; console.log('  !! ' + msg); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function waitFor(page, fn, arg2, ms) { return page.waitForFunction(fn, arg2, { timeout: ms || 20000, polling: 50 }); }
async function state(page) { return page.evaluate(function () { return window.TOLJourneyGame.state(); }); }
async function level(page) { return page.evaluate(function () { return window.TOLJourneyGame.level(); }); }
async function clickText(page, sel, text) {
  var ok = await page.evaluate(function (a) {
    var b = Array.prototype.find.call(document.querySelectorAll(a[0]), function (x) { return x.textContent.trim() === a[1] && !x.disabled; });
    if (!b) return false; b.click(); return true;
  }, [sel, text]);
  if (!ok) throw new Error('no button "' + text + '" in ' + sel);
}
async function clickSel(page, sel) { await page.locator(sel).first().click(); }
async function cardUp(page) { return page.evaluate(function () { var c = document.querySelector('.fj-card'); return c && !c.hidden; }); }
async function closeIntroCards(page) {
  for (var k = 0; k < 3; k++) {
    if (!(await cardUp(page))) return;
    var h = await page.evaluate(function () { return document.querySelector('.fj-card h2').textContent; });
    var btns = await page.evaluate(function () { return Array.prototype.map.call(document.querySelectorAll('.fj-card-btns button'), function (b) { return b.textContent; }); });
    if (btns.indexOf('Begin') >= 0) await clickText(page, '.fj-card-btns button', 'Begin');
    else if (btns.indexOf('Float up') >= 0) await clickText(page, '.fj-card-btns button', 'Float up');
    else return h;
    await sleep(150);
  }
}
async function overflow(page) {
  return page.evaluate(function () { return document.documentElement.scrollWidth - window.innerWidth; });
}

/* ------------------------------------------------------------------ one solver per kind of challenge */
var SOLVE = {
  riddle: async function (page, lv) { for (var i = 0; i < lv.riddles.length; i++) await answer(page, lv.riddles[i].options); },
  reframe: async function (page, lv) { for (var i = 0; i < lv.items.length; i++) await answer(page, lv.items[i].options); },
  choose: async function (page, lv) { for (var i = 0; i < lv.items.length; i++) await answer(page, lv.items[i].options); },
  walk: async function (page, lv) {
    await page.evaluate(function (w) {
      var J = window.TOLJourney, g = window.TOLJourneyGame, lv = g.level(), L = J.parse(lv, w), sol = J.solve(L, null, 3e6);
      sol.forEach(function (m) { g.act(m[0], m[1]); g.finish(); });
    }, lv.w);
  },
  breath: async function (page, lv) {
    await clickSel(page, '.fj-breathbtn');
    for (var k = 0; k < lv.need; k++) {
      var ms = await page.evaluate(function () { return window.TOLJourneyGame.breathNext(); });
      await sleep(Math.max(0, ms - 60));
      await clickSel(page, '.fj-breathbtn');
      await sleep(300);
    }
  },
  unscramble: async function (page, lv) {
    for (var i = 0; i < lv.words.length; i++) {
      var w = lv.words[i], used = [];
      // the first word by keyboard, the rest by tapping tiles
      for (var k = 0; k < w.w.length; k++) {
        if (i === 0) { await page.keyboard.press(w.w[k].toLowerCase()); continue; }
        for (var j = 0; j < w.mix.length; j++) if (w.mix[j] === w.w[k] && used.indexOf(j) < 0) { used.push(j); await clickSel(page, '.fj-tiles .fj-tile[data-i="' + j + '"]'); break; }
      }
      await clickSel(page, '.fj-next');
    }
  },
  sequence: async function (page, lv) {
    for (var k = 0; k < lv.steps.length; k++) await clickText(page, '.fj-pool .fj-opt', lv.steps[k].t);
    await clickSel(page, '.fj-check');
  },
  match: async function (page, lv) {
    for (var p = 0; p < lv.pairs.length; p++) {
      var cards = page.locator('.fj-card-m[data-pair="' + p + '"]');
      await cards.nth(0).click(); await cards.nth(1).click(); await sleep(120);
    }
  },
  bloom: async function (page) {
    var sol = await page.evaluate(function () { var J = window.TOLJourney, lv = window.TOLJourneyGame.level(); return J.bloomSolve(J.bloomBits(lv.start), lv.n); });
    for (var k = 0; k < sol.length; k++) { await page.locator('.fj-flower').nth(sol[k]).click(); await sleep(60); }
  },
  bids: async function (page, lv) {
    for (var i = 0; i < lv.scene.length; i++) if (lv.scene[i].bid) await page.locator('.fj-bid').nth(i).click();
    await clickSel(page, '.fj-check');
    await clickSel(page, '.fj-next');
    await answer(page, lv.reply.options, true);
  },
  balance: async function (page, lv) {
    var n = lv.jobs.length, best = -1;
    for (var m = 0; m < 1 << n && best < 0; m++) { var a = 0; for (var i = 0; i < n; i++) if (!(m >> i & 1)) a += lv.jobs[i].w; if (a === lv.cap[0]) best = m; }
    for (i = 0; i < n; i++) await page.locator('.fj-job').nth(i).locator('.fj-ownb[data-who="' + (best >> i & 1) + '"]').click();
  },
  echo: async function (page, lv) {
    for (var round = 0; round < 12; round++) {
      await waitFor(page, function () { var s = window.TOLJourneyGame.state(); return s.chal && (s.chal.done || (!s.chal.playing && /Your turn/.test(document.querySelector('.fj-fb').textContent))); }, null, 30000);
      var st = await state(page); if (st.chal.done) return;
      for (var k = 0; k < st.chal.len; k++) {
        if (round === 0) await page.keyboard.press(String(lv.song[k])); // keys 1-5 on the first round
        else await page.locator('.fj-crys[data-n="' + lv.song[k] + '"]').click();
      }
      await sleep(200);
    }
  },
  sort: async function (page, lv) {
    for (var i = 0; i < lv.items.length; i++) {
      await waitFor(page, function (i2) { var s = window.TOLJourneyGame.state(); return s.chal.i === i2 && !document.querySelector('.fj-sortcard').classList.contains('is-away'); }, i);
      await clickSel(page, '.fj-bucket[data-k="' + lv.items[i].k + '"]');
    }
  },
  fill: async function (page, lv) {
    for (var i = 0; i < lv.lines.length; i++) {
      var a = lv.lines[i].a[0];
      // forgiving: capitals, and a small typo in a long word, are both fine
      var typed = i === 0 ? a.toUpperCase() : i === 1 && a.length >= 6 ? a.slice(0, 2) + a.slice(3) : a; // one letter missing
      await page.locator('.fj-in').fill(typed);
      await page.locator('.fj-in').press('Enter');
      await clickSel(page, '.fj-next');
    }
  },
  spot: async function (page, lv) {
    for (var s = 0; s < lv.scenes.length; s++) {
      var bits = lv.scenes[s].bits;
      for (var i = 0; i < bits.length; i++) if (bits[i].story) await page.locator('.fj-bit').nth(i).click();
      await clickSel(page, '.fj-check');
      await clickSel(page, '.fj-next');
    }
  },
  maze: async function (page, lv) {
    var sol = await page.evaluate(function () { var J = window.TOLJourney, lv = window.TOLJourneyGame.level(); return J.mazeSolve(J.mazeParse(lv), lv.maxRun); });
    var WORD = ['up', 'right', 'down', 'left'];
    for (var c = 0; c < sol.length; c++) for (var k = 0; k < sol[c][1]; k++) await page.locator('.fj-cd[aria-label="Add a call: ' + WORD[sol[c][0]] + '"]').click();
    await clickSel(page, '.fj-callgo');
  }
};
async function answer(page, options, last) {
  var right = options.filter(function (o) { return o.ok; })[0];
  await clickText(page, '.fj-opts .fj-opt', right.t);
  await clickSel(page, '.fj-next');
}

/* ------------------------------------------------------------------ one whole journey */
async function journey(browser, size, run, results) {
  var ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1, hasTouch: size.width < 600 });
  var page = await ctx.newPage(), errors = [];
  page.on('pageerror', function (e) { errors.push(e.message); });
  page.on('console', function (m) { if (m.type() === 'error' && !/favicon|gtag|googletagmanager|ERR_|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(BASE + '/frequency-journey-play.html', { waitUntil: 'load' });
  await waitFor(page, function () { return window.TOLJourneyGame && window.TOLRewards; });
  await page.evaluate(function () { var e = window.TOLRewards.earn; window.__earn = []; window.TOLRewards.earn = function (a, b, c) { window.__earn.push(c); return e.apply(this, arguments); }; });
  // the site's rewards sometimes open a small "you unlocked…" card; a player taps "Keep playing", so does the test
  await page.evaluate(function () { window.__unlocks = 0; setInterval(function () { document.querySelectorAll('.tr-card [data-close]').forEach(function (b) { window.__unlocks++; b.click(); }); }, 60); });
  // the note on the map
  var fresh = await page.evaluate(function () { var f = document.querySelector('.fj-fresh'); return f && f.textContent; });
  if (!fresh || !/New set each time you play/.test(fresh)) fail(size.name + ' run ' + run + ': no "New set each time you play" note on the map');
  // look at the map first (with its note), then set off from the map's own button
  await clickText(page, '.fj-card-btns button', 'Look at the map first'); await sleep(400);
  if (run === 1) await page.screenshot({ path: path.join(SHOTS, size.name + '-map.png'), fullPage: true });
  await clickSel(page, '.fj-continue');
  await sleep(200); await closeIntroCards(page);
  var sets = {}, links = {}, t0 = Date.now();
  for (var w = 1; w <= 6; w++) for (var l = 1; l <= 3; l++) {
    var id = w + '-' + l, st = await state(page);
    if (st.w !== w || st.l !== l) { fail(size.name + ' run ' + run + ': expected level ' + id + ', at ' + st.w + '-' + st.l); await page.evaluate(function (a) { window.TOLJourneyGame.start(a[0], a[1]); }, [w, l]); await sleep(200); }
    await closeIntroCards(page);
    var lv = await level(page); lv.w = w;
    sets[id] = lv.set.join(',');
    var ov = await overflow(page); if (ov > 0) fail(size.name + ' ' + id + ': the page scrolls sideways by ' + ov + 'px');
    if (run === 1 || id === '3-3' || id === '6-3') await page.screenshot({ path: path.join(SHOTS, size.name + '-run' + run + '-' + id + '.png') });
    try { await SOLVE[lv.type](page, lv); } catch (e) { fail(size.name + ' ' + id + ' (' + lv.type + '): ' + e.message.split('\n')[0]); }
    try { await waitFor(page, function () { var c = document.querySelector('.fj-card'); return c && !c.hidden && /Next level|World complete/.test(c.textContent); }, null, 20000); }
    catch (e) { fail(size.name + ' ' + id + ': no win card'); await page.screenshot({ path: path.join(SHOTS, 'FAIL-' + size.name + '-' + id + '.png') }); continue; }
    var card = await page.evaluate(function () {
      var c = document.querySelector('.fj-card'), m = c.querySelector('.fj-card-more a'), p = c.querySelector('.fj-card-pillars');
      return { h: c.querySelector('h2').textContent, more: m && !m.closest('[hidden]') ? m.getAttribute('href') : null, pillars: p && !p.hidden ? p.textContent : '', plink: p && p.querySelector('a') ? p.querySelector('a').getAttribute('href') : null };
    });
    if (card.h !== lv.done) fail(size.name + ' ' + id + ': card says "' + card.h + '"');
    if (!card.more) fail(size.name + ' ' + id + ': no Read more link'); else links[card.more] = 1;
    if (card.plink) links[card.plink] = 1; else fail(size.name + ' ' + id + ': no Five Pillars line');
    if (run === 1 && (id === '1-1' || id === '5-3')) await sleep(700);
    if (run === 1 && (id === '1-1' || id === '5-3')) await page.screenshot({ path: path.join(SHOTS, size.name + '-card-' + id + '.png') });
    var ov2 = await overflow(page); if (ov2 > 0) fail(size.name + ' ' + id + ' card: sideways scroll ' + ov2 + 'px');
    // on to the next level (through the world card when a world is done)
    if (l < 3) await clickText(page, '.fj-card-btns button', 'Next level →');
    else {
      await clickText(page, '.fj-card-btns button', 'World complete →'); await sleep(120);
      if (w < 6) await clickText(page, '.fj-card-btns button', 'Onward to World ' + (w + 1) + ' →');
      else await clickText(page, '.fj-card-btns button', 'Up into the sky →');
    }
    await sleep(250); await closeIntroCards(page);
  }
  // the Harmony moment and the sky
  var h = await state(page);
  if (!(h.chal && h.chal.type === 'harmony')) fail(size.name + ': expected the Harmony moment');
  else {
    var hb = page.locator('.fj-harm-b'); await hb.nth(0).click(); await hb.nth(7).click(); await hb.nth(15).click();
    await clickText(page, 'button', 'Place them in the sky');
    await waitFor(page, function () { return window.TOLJourneyGame.state().mode === 'sky'; });
    await sleep(400); await closeIntroCards(page);
    await page.mouse.click(size.width / 2, 300);
    if (run === 1) await page.screenshot({ path: path.join(SHOTS, size.name + '-sky.png') });
  }
  var earned = await page.evaluate(function () { return window.__earn.length; });
  if (earned !== 18) fail(size.name + ' run ' + run + ': TOLRewards.earn called ' + earned + ' times, expected 18');
  // replays in the same browser: each should skip what this player has already seen
  var repeats = 0, replays = 0;
  var POOLED = ['1-1', '2-1', '3-1', '3-2', '5-2', '5-3', '6-1', '6-2'];
  for (var r = 0; r < POOLED.length; r++) {
    var pr = POOLED[r].split('-').map(Number);
    await page.evaluate(function (a) { window.TOLJourneyGame.start(a[0], a[1]); }, pr);
    await sleep(80); await closeIntroCards(page);
    var lv2 = await level(page), before = sets[POOLED[r]].split(',');
    lv2.set.forEach(function (x) { if (before.indexOf(x) >= 0) repeats++; });
    replays++;
  }
  if (repeats) fail(size.name + ' run ' + run + ': ' + repeats + ' items repeated on replay');
  // every link from the cards resolves
  for (var href in links) {
    var status = await page.evaluate(async function (u) { try { var r = await fetch(u.split('#')[0]); if (!r.ok) return r.status; if (u.indexOf('#') < 0) return 200; var t = await r.text(); return t.indexOf('id="' + u.split('#')[1] + '"') >= 0 ? 200 : 'no #' + u.split('#')[1]; } catch (e) { return 'err'; } }, href);
    if (status !== 200) fail(size.name + ': link ' + href + ' → ' + status);
  }
  if (errors.length) errors.forEach(function (e) { fail(size.name + ' run ' + run + ' page error: ' + e); });
  console.log('  ' + size.name + ' run ' + run + ': 18 levels won in ' + Math.round((Date.now() - t0) / 1000) + 's · earn x' + earned + ' · ' + Object.keys(links).length + ' links ok · ' + replays + ' replays, ' + repeats + ' repeats · ' + errors.length + ' page errors');
  results.push(sets);
  await ctx.close();
}

(async function () {
  var browser = await chromium.launch();
  console.log('screenshots: ' + SHOTS);
  for (var s = 0; s < SIZES.length; s++) {
    var results = [];
    for (var run = 1; run <= 2; run++) await journey(browser, SIZES[s], run, results);
    if (results.length === 2) {
      var same = Object.keys(results[0]).filter(function (k) { return results[0][k] === results[1][k]; });
      var differ = Object.keys(results[0]).length - same.length;
      console.log('  ' + SIZES[s].name + ': ' + differ + ' of 18 levels had different content between the two runs' + (same.length ? ' (same: ' + same.join(', ') + ')' : ''));
      // levels that draw ONE thing (a board from 6, a breath pattern, a sequence, a scene, a week of jobs) can match
      // by chance between two different, fresh browsers; the same player never gets a repeat (checked above).
      // Every level that draws a set of several items must differ.
      var SINGLE = ['1-2', '1-3', '2-2', '2-3', '4-1', '4-2', '4-3'];
      same.forEach(function (k) { if (SINGLE.indexOf(k) < 0) fail(SIZES[s].name + ': level ' + k + ' drew the same set twice'); });
    }
  }
  await browser.close();
  console.log(bad ? bad + ' problem(s)' : 'All play-through checks passed.');
  process.exit(bad ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
