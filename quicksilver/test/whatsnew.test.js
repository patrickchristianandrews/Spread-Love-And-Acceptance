// "What's new" under Check for updates: clicking it opens the notes and they stay open (they
// used to close again straight away), on the real Settings page, while the app goes on working.
'use strict';
const { _electron: electron } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const assert = require('node:assert/strict');
const ROOT = path.join(__dirname, '..');

(async () => {
  const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-whatsnew-'));
  const app = await electron.launch({ executablePath: require('electron'), args: ['--no-sandbox', ROOT],
    env: { ...process.env, QUICKSILVER_HOME: HOME, QS_LLAMA_SERVER: path.join(__dirname, 'fakes', 'llama-server'), QS_SD_BIN: path.join(__dirname, 'fakes', 'sd'), QS_SCAN_DIRS: path.join(HOME, 'nothing-here') } });
  try {
    const win = await app.firstWindow();
    await win.waitForSelector('#nav', { timeout: 60000 }).catch(() => {});
    await win.evaluate(() => { document.querySelector('#wc-close')?.click(); setTab = 'general'; go({ view: 'settings' }); });
    await win.waitForSelector('#upd-box');
    // An update is available, with notes (as the updater reports it).
    await win.evaluate(() => { upd = { current: '2.20.6', available: { version: '2.20.7', notes: '### New in 2.20.7\n\n' + Array.from({ length: 60 }, (_, i) => `- change ${i}`).join('\n') }, checkedAt: Date.now() }; repaintUpdateBox(); });
    await win.waitForSelector('#upd-notes summary');
    await win.click('#upd-notes summary');
    const states = [];
    for (let i = 0; i < 10; i++) { await win.waitForTimeout(300); states.push(await win.evaluate(() => Boolean(document.querySelector('#upd-notes')?.open))); }
    assert.ok(states.every(Boolean), `stays open after a click: ${states}`);
    // The whole page redrawn (anything that changes it): still open.
    await win.evaluate(() => render());
    await win.waitForTimeout(300);
    assert.equal(await win.evaluate(() => Boolean(document.querySelector('#upd-notes')?.open)), true, 'still open after the page is redrawn');
    // An update event from the updater: still open.
    await win.evaluate(() => { upd = { ...upd, checking: false, checkedAt: Date.now() }; repaintUpdateBox(); });
    assert.equal(await win.evaluate(() => Boolean(document.querySelector('#upd-notes')?.open)), true, 'still open after an update event');
    // Clicking again closes it.
    await win.click('#upd-notes summary');
    await win.waitForTimeout(300);
    assert.equal(await win.evaluate(() => Boolean(document.querySelector('#upd-notes')?.open)), false, 'a second click closes it');
    console.log('✓ What\'s new under Check for updates opens on a click and stays open (redraws and update events included) until clicked again');
  } finally { await app.close().catch(() => {}); }
  process.exit(0);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
