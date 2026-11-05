// Drives the real page in Chromium with the mock bridge. Run: node test/ui.test.js
const { chromium } = require('playwright');
const path = require('node:path');
const assert = require('node:assert');
const fs = require('node:fs');

(async () => {
  const shots = process.argv[2];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript({ path: path.join(__dirname, 'mock-bridge.js') });
  await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));

  // First run asks for a key.
  await page.waitForSelector('#s-key');
  await page.fill('#s-key', 'sk-ant-test');
  await page.fill('#s-name', 'Liquid');
  await page.click('#s-save');
  await page.waitForSelector('#modal', { state: 'hidden' });

  // Two starter characters on the home grid.
  assert.equal(await page.locator('.card[data-id]').count(), 2);
  if (shots) await page.screenshot({ path: `${shots}/1-home.png` });

  // Create a character.
  await page.click('#new-card');
  await page.fill('#f-name', 'Captain Reyes');
  await page.fill('#f-tagline', 'A smuggler pilot with a heart of gold and a ship held together by tape.');
  await page.fill('#f-tags', 'Sci-fi, Adventure');
  await page.fill('#f-personality', 'Cocky, quick-witted, loyal to her crew.');
  await page.fill('#f-first', '*Reyes kicks the console.* "Hold on, {{user}}!"');
  await page.click('#save');
  await page.waitForSelector('.profile');
  assert.equal(await page.locator('.profile h1').innerText(), 'Captain Reyes');

  // Open Marlow and chat.
  await page.click('[data-nav="home"]');
  await page.click('.card[data-id]:has-text("Marlow")');
  await page.click('#start');
  await page.waitForSelector('.msg.assistant');
  await page.fill('#input', 'I need you to find my sister. *I set a photo on the desk.*');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelectorAll('.msg').length === 3 && !document.querySelector('.bubble.typing'));
  const req = await page.evaluate(() => window.__lastRequest);
  assert.equal(req.model, 'claude-opus-5-5');
  assert.equal(req.messages[0].role, 'user');           // stage cue first
  assert.equal(req.messages[1].role, 'assistant');      // greeting
  assert.match(req.messages[2].content, /find my sister/);
  assert.match(req.system, /You are Marlow Vance/);
  assert.match(req.system, /Liquid/);                    // {{user}} filled with the user's name
  assert.ok(!/\{\{user\}\}/.test(req.system));

  // Reroll makes a second version with arrows.
  await page.click('[data-act="reroll"]');
  await page.waitForFunction(() => !document.querySelector('.bubble.typing') && document.querySelector('.swipe-count'));
  assert.equal(await page.locator('.swipe-count').innerText(), '2/2');
  await page.click('[data-act="prev"]');
  assert.equal(await page.locator('.swipe-count').innerText(), '1/2');
  if (shots) await page.screenshot({ path: `${shots}/2-chat.png` });

  // Edit a message.
  await page.locator('.msg.user [data-act="edit"]').click({ force: true });
  await page.fill('.bubble textarea', 'I need you to find my brother.');
  await page.click('[data-x="save"]');
  assert.match(await page.locator('.msg.user .bubble').innerText(), /brother/);

  // Stop mid-stream keeps partial text.
  await page.fill('#input', 'Hurry.');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(60);
  await page.click('#send'); // Stop
  await page.waitForFunction(() => !document.querySelector('.bubble.typing'));
  assert.equal(await page.locator('.msg').count(), 5);

  // Persisted and shows in recent chats.
  assert.equal(await page.locator('.recent-item').count(), 1);
  await page.reload();
  await page.waitForSelector('.card');
  assert.equal(await page.locator('.recent-item').count(), 1);
  assert.equal(await page.locator('.card[data-id]').count(), 3);

  // HTML in a message is shown as text, not run.
  await page.click('.recent-item');
  await page.fill('#input', '<img src=x onerror="window.__xss=1">');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !document.querySelector('.bubble.typing'));
  assert.equal(await page.evaluate(() => window.__xss), undefined);

  await page.setViewportSize({ width: 800, height: 700 });
  if (shots) await page.screenshot({ path: `${shots}/3-narrow.png` });
  await page.click('[data-nav="settings"]');
  await page.waitForSelector('#s-model');
  if (shots) await page.screenshot({ path: `${shots}/4-settings.png` });

  assert.deepEqual(errors, []);
  await browser.close();
  console.log('UI test passed');
})().catch((e) => { console.error(e); process.exit(1); });
