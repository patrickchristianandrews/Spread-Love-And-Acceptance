#!/usr/bin/env node
/* tools/progress/pw-progress.js — browser checks for "Your progress" (progress.js) and "Are you sure?" (confirm-clear.js).
   Run from the repo root with a local server:
     python3 -m http.server 8543 --bind 127.0.0.1 &
     NODE_PATH=$(npm root -g) node tools/progress/pw-progress.js [outdir]
   Everything off 127.0.0.1 is blocked. Screenshots go to outdir (default: ./progress-shots).
   Checks: backup → storage cleared → restore → the Lemonade Stand quick look, Today's Weather almanac and a strict-CSP
   worksheet show their data again; a move link between two browsers; persist(); the confirm-clear steps; shared-computer
   mode; the app lock; saved entries and earlier versions; phone, iPhone and app levels; 390 touch + 1366, light + dark;
   no console or page errors, no sideways scroll, every #link on the page resolves. */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8543';
const OUT = path.resolve(process.argv[2] || 'progress-shots');
fs.mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0; const errors = [];
function ok(c, n) { if (c) pass++; else { fail++; console.log('FAIL:', n); } }
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const PIXEL = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

async function ctx(browser, o = {}) {
  const c = await browser.newContext(Object.assign({ viewport: { width: 1366, height: 768 }, acceptDownloads: true }, o));
  await c.route('**/*', (r) => { const u = new URL(r.request().url()); return u.hostname === '127.0.0.1' ? r.continue() : r.abort(); });
  c.on('page', watch);
  return c;
}
function watch(p) {
  p.on('pageerror', (e) => errors.push(p.url() + ' pageerror: ' + e.message));
  p.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource|ERR_FAILED|googletagmanager|fonts\.g/.test(t)) return;   // the blocked outside requests
    errors.push(p.url() + ' console: ' + t);
  });
}
async function noSideways(p, name) {
  const w = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  ok(w[0] <= w[1] + 1, name + ': no sideways scroll (' + w.join(' vs ') + ')');
}
async function anchorsResolve(p, name) {
  const bad = await p.evaluate(() => Array.from(document.querySelectorAll('section.tp a[href^="#"], .tp-card-pop a[href^="#"]')).map((a) => a.getAttribute('href')).filter((h) => h.length > 1 && !document.getElementById(h.slice(1))));
  ok(!bad.length, name + ': every #link resolves (' + bad.join(', ') + ')');
}
const WEATHER = JSON.stringify([{ d: '2026-10-08', sky: 'gusty', load: 'heavy', sleep: 'short' }, { d: '2026-10-10', sky: 'fog', load: 'building', sleep: 'bad' }]);
const QUICK = JSON.stringify({ v: 1, people: ['Rowan', 'Jules'], list: [], ans: { 0: {} }, me: 0 });

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  // ============================================================ 1. backup → clear → restore, three tools (1366, light)
  {
    const c = await ctx(browser);
    const p = await c.newPage();
    await p.goto(BASE + '/on-this-device.html');
    await p.evaluate(([w, q]) => { localStorage.setItem('tol-save-mode-v1', 'own'); localStorage.setItem('tol-weather-v1', w); localStorage.setItem('tol-lemonade-quick', q); }, [WEATHER, QUICK]);
    // a real worksheet draft, on the strict-CSP fill page
    await p.goto(BASE + '/workpapers/fill/wp-01.html');
    const field = p.locator('.wpf-form input[type="text"], .wpf-form textarea').first();
    await field.fill('Rowan’s first answer');
    await p.evaluate(() => { const k = document.getElementById('wpf-keep'); if (!k.checked) k.click(); });
    await p.waitForTimeout(800);
    const wpKey = await p.evaluate(() => Object.keys(localStorage).find((k) => k.startsWith('tol-wpf-keep:')));
    ok(!!wpKey, 'worksheet draft kept (' + wpKey + ')');
    await p.waitForTimeout(2500);   // progress.js loads after load on other pages: it notes change times there too
    ok(await p.evaluate(() => !!window.TOLProgress), 'progress.js loads on the strict-CSP worksheet page');

    await p.goto(BASE + '/on-this-device.html');
    await p.waitForSelector('#tp-what .tp-list');
    const what = await p.textContent('#tp-what');
    ok(/Lemonade Stand/.test(what) && /Weather/.test(what) && /Worksheets/.test(what), 'Your progress lists the three tools');
    ok(/Your own computer/.test(await p.textContent('#tp-level')), 'level: own computer');
    await anchorsResolve(p, 'on-this-device');
    await noSideways(p, '1366 light');
    await p.screenshot({ path: path.join(OUT, 'progress-1366-light.png'), fullPage: true });

    await p.fill('#tp-pw1', 'river-stone-42'); await p.fill('#tp-pw2', 'river-stone-42');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-tp="backup"]')]);
    const file = path.join(OUT, dl.suggestedFilename());
    await dl.saveAs(file);
    ok(/^spread-love-progress-\d{4}-\d\d-\d\d\.json$/.test(dl.suggestedFilename()), 'backup file name (' + dl.suggestedFilename() + ')');
    const text = fs.readFileSync(file, 'utf8');
    ok(JSON.parse(text).encrypted === true && !text.includes('Rowan'), 'backup is encrypted, no names in the clear');
    await p.waitForTimeout(300);
    ok(/Saved to your downloads/.test(await p.textContent('#tp-backup-msg')), 'backup: says where it went');

    // the browser clears the site's storage
    await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await p.reload(); await p.waitForSelector('#tp-what .tp-last');
    ok(!/Lemonade|Weather|Worksheets/.test(await p.textContent('#tp-what')), 'storage cleared: the three tools are gone');
    await p.evaluate(() => localStorage.setItem('tol-save-mode-v1', 'own'));
    await p.reload(); await p.waitForSelector('#tp-what');

    await p.setInputFiles('#tp-file', file);
    await p.waitForSelector('#tp-in-pw');
    await p.fill('#tp-in-pw', 'wrong-password');
    await p.click('[data-tp="unlock"]');
    await p.waitForFunction(() => /doesn’t open/.test(document.getElementById('tp-in-msg').textContent));
    ok(true, 'restore: wrong password says so');
    await p.fill('#tp-in-pw', 'river-stone-42');
    await p.click('[data-tp="unlock"]');
    await p.waitForSelector('[data-tp="apply"]');
    const pv = await p.textContent('#tp-in');
    ok(/Lemonade Stand/.test(pv) && /Weather/.test(pv) && !/Rowan/.test(pv), 'restore preview: tool names and dates, no contents');
    await p.screenshot({ path: path.join(OUT, 'restore-preview-1366.png'), fullPage: false, clip: await p.locator('#restore').boundingBox() });
    await p.click('[data-tp="apply"]');
    await p.waitForSelector('#tp-in .tp-ok');
    const rt = await p.textContent('#tp-in'); ok(/Restored\. \d+ added/.test(rt), 'restore: ' + rt.slice(0, 80));

    await p.goto(BASE + '/lemonade-stand.html'); await p.waitForTimeout(1200);
    const names = await p.evaluate(() => Array.from(document.querySelectorAll('input[type="text"]')).map((i) => i.value).join('|'));
    ok(/Rowan/.test(names) && /Jules/.test(names), 'Lemonade Stand quick look shows the names again');
    await p.goto(BASE + '/quick-checks.html#almanac'); await p.waitForTimeout(1200);
    const alm = await p.evaluate(() => { const a = document.getElementById('almanac'); return a && !a.hidden ? a.textContent : ''; });
    ok(/Oct/.test(alm) && /Fogged|Gusty/i.test(alm), 'Today’s Weather almanac shows the readings again');
    await p.goto(BASE + '/workpapers/fill/wp-01.html'); await p.waitForTimeout(1000);
    ok((await p.locator('.wpf-form input[type="text"], .wpf-form textarea').first().inputValue()) === 'Rowan’s first answer', 'worksheet (strict CSP) shows the draft again');

    // persistent storage
    await p.goto(BASE + '/on-this-device.html'); await p.waitForSelector('#tp-persist');
    await p.waitForTimeout(500);
    const pers = await p.evaluate(async () => ({ api: !!(navigator.storage && navigator.storage.persist), persisted: await navigator.storage.persisted(), asked: JSON.parse(localStorage.getItem('tol-backup-v1') || '{}').asked }));
    ok(pers.api && !!pers.asked, 'persist() was asked automatically (own computer) — persisted: ' + pers.persisted);
    console.log('  persist status text:', (await p.textContent('#tp-persist')).trim());

    // ============================================================ 2. move link between two browsers
    await p.fill('#tp-lpw1', 'moving-day-7'); await p.fill('#tp-lpw2', 'moving-day-7');
    await p.click('[data-tp="link"]');
    await p.waitForSelector('#tp-link:not([hidden])');
    const link = await p.inputValue('#tp-link-text');
    ok(/\/on-this-device\.html#restore=1\.pz\./.test(link), 'move link made (' + link.length + ' chars)');
    ok(!(await p.isHidden('[data-tp="qr"]')) === (link.length <= 2000), 'QR offered only when it fits');
    if (link.length <= 2000) {
      await p.click('[data-tp="qr"]'); await p.waitForTimeout(600);
      ok(await p.evaluate(() => !!document.querySelector('.tsk-qrd canvas')), 'QR code drawn (TOLShareKit.showQR)');
      await p.screenshot({ path: path.join(OUT, 'move-qr-1366.png') });
      await p.keyboard.press('Escape');
    }
    const c2 = await ctx(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: PIXEL });
    const q = await c2.newPage();
    await q.goto(link);
    await q.waitForSelector('#tp-in-pw');
    ok(await q.evaluate(() => location.hash === '#restore'), 'the link’s data is taken out of the address bar');
    ok(await q.evaluate(() => !localStorage.getItem('tol-lemonade-quick')), 'opening the link restores nothing by itself');
    await q.fill('#tp-in-pw', 'moving-day-7'); await q.click('[data-tp="unlock"]');
    await q.waitForSelector('[data-tp="apply"]');
    await q.screenshot({ path: path.join(OUT, 'move-incoming-390.png'), fullPage: false });
    await q.click('[data-tp="apply"]'); await q.waitForSelector('#tp-in .tp-ok');
    ok(await q.evaluate(() => /Rowan/.test(localStorage.getItem('tol-lemonade-quick') || '')), 'move link: the other browser has the progress');
    await noSideways(q, '390 incoming link');
    await c2.close();

    // ============================================================ 3. saved entries and earlier versions (own computer)
    await p.goto(BASE + '/on-this-device.html'); await p.waitForSelector('#tp-e-tool');
    await p.selectOption('#tp-e-tool', 'lemon'); await p.fill('#tp-e-name', 'Before the talk');
    await p.click('#tp-entries .tp-btn.is-strong');
    await p.evaluate((qq) => { const o = JSON.parse(qq); o.people = ['Rowan', 'Jules', 'Kit']; localStorage.setItem('tol-lemonade-quick', JSON.stringify(o)); }, QUICK);
    await p.reload(); await p.waitForSelector('#tp-e-tool');
    await p.selectOption('#tp-e-tool', 'lemon'); await p.fill('#tp-e-name', 'After the talk');
    await p.click('#tp-entries .tp-btn.is-strong');
    await p.waitForTimeout(200);
    ok((await p.locator('.tp-entries > li').count()) === 2, 'two saved entries');
    await p.locator('.tp-entries > li').first().locator('button', { hasText: 'Open' }).click();
    await p.locator('.tp-e-detail button', { hasText: 'Compare' }).click();
    await p.waitForTimeout(200);
    ok(/Kit/.test(await p.textContent('.tp-diff')), 'compare shows the added person');
    ok((await p.locator('#tp-history select').count()) >= 1, 'earlier versions listed');
    await p.screenshot({ path: path.join(OUT, 'entries-history-1366.png'), clip: Object.assign({}, await p.locator('#entries').boundingBox()) });

    // ============================================================ 4. "Are you sure?" with the sum
    await p.evaluate(() => document.getElementById('kept').scrollIntoView());
    const er = p.locator('#od-found [data-erase="tol-weather-v1"]');
    await er.click();
    await p.waitForSelector('dialog.tcc');
    ok(await p.evaluate(() => document.activeElement.textContent === 'Cancel'), 'step 1: Cancel has the focus');
    await p.keyboard.press('Escape');
    await p.waitForTimeout(150);
    ok(await p.evaluate(() => !document.querySelector('dialog.tcc') && !!localStorage.getItem('tol-weather-v1')), 'Escape at step 1: nothing cleared');
    await er.click(); await p.click('dialog.tcc button:has-text("Yes, clear it")');
    ok(/Today’s Weather/.test(await p.textContent('dialog.tcc')), 'step 2 names what goes');
    await p.screenshot({ path: path.join(OUT, 'confirm-step2-1366.png') });
    await p.click('dialog.tcc button:has-text("Cancel")');
    ok(await p.evaluate(() => !!localStorage.getItem('tol-weather-v1')), 'Cancel at step 2: nothing cleared');
    await er.click(); await p.click('dialog.tcc button:has-text("Yes, clear it")'); await p.click('dialog.tcc button:has-text("Yes, I’m sure")');
    const sum = async () => { const t = await p.textContent('#tcc-ans + *, label[for="tcc-ans"]'); const m = /(\d) \+ (\d)/.exec(t); return +m[1] + +m[2]; };
    let s1 = await sum();
    ok(await p.isDisabled('dialog.tcc button:has-text("Clear now")'), 'Clear now is off before the answer');
    await p.fill('#tcc-ans', String(s1 + 1)); await p.keyboard.press('Enter');
    ok(/Not quite/.test(await p.textContent('.tcc-live')) && await p.isDisabled('dialog.tcc button:has-text("Clear now")'), 'a wrong answer: kind words, a new sum, still off');
    ok(await p.evaluate(() => !!localStorage.getItem('tol-weather-v1')), 'a wrong answer clears nothing');
    await p.screenshot({ path: path.join(OUT, 'confirm-sum-1366.png') });
    const s2 = await sum();
    await p.fill('#tcc-ans', String(s2)); await p.keyboard.press('Enter');
    ok(!(await p.isDisabled('dialog.tcc button:has-text("Clear now")')), 'the right answer turns on Clear now');
    await p.click('dialog.tcc button:has-text("Clear now")');
    await p.waitForSelector('dialog.tcc h2:has-text("Cleared")');
    ok(/Nothing from Your weather almanac is left on this device/.test(await p.textContent('dialog.tcc')), 'after: "Cleared. Nothing from … is left"');
    ok(await p.evaluate(() => !localStorage.getItem('tol-weather-v1') && !!localStorage.getItem('tol-lemonade-quick')), 'only that item is cleared');
    await p.click('dialog.tcc button:has-text("Close")');

    // ============================================================ 5. the app lock
    await p.evaluate(() => document.getElementById('lock').scrollIntoView());
    await p.fill('#tp-pin1', '2468'); await p.fill('#tp-pin2', '2468'); await p.selectOption('#tp-mins', '0');
    await p.click('#tp-lock >> text=Turn on the lock');
    await p.waitForSelector('#tp-lock .tp-ok');
    ok(await p.evaluate(() => { const r = localStorage.getItem('tol-lock-v1'); return r && !r.includes('2468'); }), 'lock on; the PIN itself is not stored');
    await p.goto(BASE + '/lemonade-stand.html');
    await p.waitForSelector('.tp-lock');
    ok(await p.evaluate(() => getComputedStyle(document.documentElement).visibility === 'hidden'), 'locked: the page is hidden behind the lock');
    await p.screenshot({ path: path.join(OUT, 'lock-1366.png') });
    await p.fill('#tp-lock-pin', '1111'); await p.click('.tp-lock >> text=Unlock');
    await p.waitForFunction(() => /not it/.test(document.querySelector('.tp-lock .tp-status').textContent));
    ok(true, 'wrong PIN refused');
    await p.fill('#tp-lock-pin', '2468'); await p.click('.tp-lock >> text=Unlock');
    await p.waitForSelector('.tp-lock', { state: 'detached' });
    ok(await p.evaluate(() => getComputedStyle(document.documentElement).visibility === 'visible'), 'right PIN: the page shows');
    await p.goto(BASE + '/safety.html'); await p.waitForTimeout(800);
    ok(await p.evaluate(() => !document.querySelector('.tp-lock') && getComputedStyle(document.documentElement).visibility === 'visible'), 'the safety page is never behind the lock');
    await p.evaluate(() => localStorage.removeItem('tol-lock-v1'));
    await c.close();
  }

  // ============================================================ 6. shared computer mode (desktop, asked once)
  {
    const c = await ctx(browser);
    const p = await c.newPage();
    // home16b: asked only after something is first saved, on the next page opened (never over the page where it was saved)
    // (the first-visit "Would a calmer page help?" is the one prompt of a visit: answered here, so this visit has room)
    await p.goto(BASE + '/index.html');
    await p.evaluate(() => { localStorage.setItem('tol-comfort-offer', 'done'); sessionStorage.removeItem('tol-prompt'); });
    await p.goto(BASE + '/quick-checks.html');
    await p.waitForFunction(() => window.TOLProgress && window.TOLProgress.collect, null, { timeout: 15000 });
    await p.waitForTimeout(500);
    await p.evaluate((w) => localStorage.setItem('tol-weather-v1', w), WEATHER);
    await p.waitForTimeout(6000);
    ok(!(await p.$('.tp-card-pop')), 'computer: not asked over the page where the first save happened');
    await p.goto(BASE + '/index.html');
    await p.waitForSelector('.tp-card-pop', { timeout: 25000 });
    ok(/own computer or a shared one/.test(await p.textContent('.tp-card-pop')), 'computer: asked once, own or shared');
    await p.screenshot({ path: path.join(OUT, 'ask-computer-1366.png') });
    await p.click('.tp-card-pop >> text=Not sure');
    await p.waitForSelector('#tp-chip');
    ok(await p.evaluate(() => localStorage.getItem('tol-save-mode-v1') === 'shared'), 'Not sure → shared');
    // following a link to another page of the site, as a person would
    await Promise.all([p.waitForNavigation(), p.evaluate(() => { const a = document.createElement('a'); a.href = '/quick-checks.html'; a.textContent = 'go'; document.body.appendChild(a); a.click(); })]);
    await p.waitForLoadState('load'); await p.waitForTimeout(1200);
    ok(await p.evaluate(() => !!localStorage.getItem('tol-weather-v1')), 'shared: notes follow you to the next page of the site');
    ok(await p.isVisible('#tp-chip'), 'shared: the chip shows on every page');
    await p.screenshot({ path: path.join(OUT, 'shared-chip-1366.png') });
    await p.reload(); await p.waitForTimeout(1500);
    ok(await p.evaluate(() => !!localStorage.getItem('tol-weather-v1')), 'shared: a reload keeps this tab’s notes');
    await p.close();
    const p2 = await c.newPage();
    await p2.goto(BASE + '/quick-checks.html'); await p2.waitForTimeout(1200);
    ok(await p2.evaluate(() => !localStorage.getItem('tol-weather-v1') && localStorage.getItem('tol-save-mode-v1') === 'shared'), 'shared: after the tab closes, nothing is kept');
    await p2.evaluate((w) => localStorage.setItem('tol-weather-v1', w), WEATHER);
    await p2.click('#tp-chip >> text=Clear everything now');
    await p2.waitForSelector('dialog.tcc');
    await p2.click('dialog.tcc button:has-text("Yes, clear it")');
    ok(await p2.isVisible('#tcc-ans'), 'shared: Clear everything now is short (the sum comes next)');
    const t = await p2.textContent('label[for="tcc-ans"]'); const m = /(\d) \+ (\d)/.exec(t);
    await p2.fill('#tcc-ans', String(+m[1] + +m[2])); await p2.keyboard.press('Enter');
    await p2.click('dialog.tcc button:has-text("Clear now")');
    await p2.waitForSelector('dialog.tcc h2:has-text("Cleared")');
    await Promise.all([p2.waitForNavigation(), p2.click('dialog.tcc button:has-text("Close")')]);
    await p2.waitForTimeout(800);
    ok(await p2.evaluate(() => !localStorage.getItem('tol-weather-v1') && localStorage.getItem('tol-save-mode-v1') === 'shared'), 'shared: Clear everything now clears, and stays in shared mode');
    await p2.goto(BASE + '/on-this-device.html'); await p2.waitForSelector('#tp-level .tp-take');
    await p2.screenshot({ path: path.join(OUT, 'shared-progress-1366.png'), fullPage: false });
    await c.close();
  }

  // ============================================================ 7. phones, iPhone, the app; 390 + 1366, light + dark
  for (const scheme of ['light', 'dark']) {
    for (const v of [{ n: '390', o: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: IPHONE } }, { n: '1366', o: { viewport: { width: 1366, height: 768 } } }]) {
      const c = await ctx(browser, Object.assign({ colorScheme: scheme }, v.o));
      const p = await c.newPage();
      await p.goto(BASE + '/on-this-device.html');
      // (home16b: one prompt a visit; the calmer-page offer is answered and the free-app line closed, so the phone tip is this visit's one)
      await p.evaluate((q) => { localStorage.setItem('tol-lemonade-quick', q); localStorage.setItem('tol-comfort-offer', 'done'); localStorage.setItem('tol-appbar-off', new Date().toISOString().slice(0, 10)); if (innerWidth > 1000) localStorage.setItem('tol-save-mode-v1', 'own'); }, QUICK);
      await p.reload(); await p.waitForSelector('#tp-what .tp-list');
      const lvl = await p.textContent('#tp-level');
      ok(v.n === '390' ? /Phone or tablet/.test(lvl) && /Install the free app to keep a history/.test(lvl) : /own computer/.test(lvl), v.n + ' ' + scheme + ': the right level and perk line');
      await noSideways(p, v.n + ' ' + scheme);
      await anchorsResolve(p, v.n + ' ' + scheme);
      await p.screenshot({ path: path.join(OUT, 'progress-' + v.n + '-' + scheme + '.png'), fullPage: true });
      if (v.n === '390') {
        // (home16b: not on a tool page, where the cards never show; a guide instead)
        await p.goto(BASE + '/empty-nest.html');
        await p.waitForSelector('.tp-card-pop', { timeout: 25000 });
        ok(/7 days/.test(await p.textContent('.tp-card-pop')), '390 ' + scheme + ': the one-time iPhone tip');
        await noSideways(p, '390 ' + scheme + ' tip');
        await p.screenshot({ path: path.join(OUT, 'iphone-tip-390-' + scheme + '.png') });
        await p.reload(); await p.waitForTimeout(4000);
        ok(!(await p.$('.tp-card-pop')), '390 ' + scheme + ': the tip shows once');
      }
      await c.close();
    }
  }
  { // the installed app (iPhone Home Screen)
    const c = await ctx(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: IPHONE });
    await c.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true }));
    const p = await c.newPage();
    await p.goto(BASE + '/on-this-device.html'); await p.waitForSelector('#tp-level');
    ok(/In the app/.test(await p.textContent('#tp-level')) && await p.isVisible('#tp-app-hint'), 'app: level shown, and the paste-a-link hint');
    ok(!/comes with the free app/.test(await p.textContent('#tp-entries')) && !/comes with the free app/.test(await p.textContent('#tp-history')), 'app: saved entries and earlier versions are on');
    await p.screenshot({ path: path.join(OUT, 'app-390.png'), fullPage: false });
    await noSideways(p, 'app 390');
    await c.close();
  }

  await browser.close();
  errors.forEach((e) => console.log('ERROR:', e));
  ok(!errors.length, 'no console or page errors (' + errors.length + ')');
  console.log((fail ? 'FAILED ' : 'ok ') + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
