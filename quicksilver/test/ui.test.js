// Drives the real page in Chromium with the mock bridge. Run: npm test  (optional arg: screenshot folder)
const { chromium } = require('playwright');
const path = require('node:path');
const assert = require('node:assert');

(async () => {
  const shots = process.argv[2];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1320, height: 860 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript({ path: path.join(__dirname, 'mock-bridge.js') });
  await page.goto('file://' + path.join(__dirname, '..', 'renderer', 'index.html'));
  const idle = () => page.waitForFunction(() => !document.querySelector('.bubble.typing'));

  // No models and no key: opens on the Stack Advisor, no key prompt.
  await page.waitForSelector('.jobs');
  assert.equal(await page.locator('#s-key').count(), 0);
  await page.waitForSelector('.hw .pill b:has-text("RTX 4070")');

  // Coding stack: recommends the coder model, downloads it, creates the Code Partner assistant.
  await page.click('[data-job="coding"]');
  await page.waitForSelector('.pick.best');
  assert.match(await page.locator('.pick.best h3').innerText(), /Coder/);
  if (shots) await page.screenshot({ path: `${shots}/1-advisor.png` });
  await page.click('.pick.best [data-build]');
  await page.waitForFunction(() => document.querySelector('.pick.best h3')?.textContent.includes('installed'), null, { timeout: 5000 });
  await page.click('[data-nav="home"]');
  await page.click('.card[data-id]:has-text("Code Partner")');
  await page.click('#start');
  assert.match(await page.locator('#model-pick option:checked').innerText(), /Coder/);
  await page.fill('#input', 'Write an add function');
  await page.keyboard.press('Enter');
  await idle();
  const req = await page.evaluate(() => window.__lastRequest);
  assert.deepEqual(req.target, { kind: 'local', modelId: 'qwen2.5-coder-7b' });
  assert.equal(req.temperature, 0.2);
  assert.equal(req.contextSize, 16384);
  assert.match(req.system, /software engineer/);
  assert.equal(await page.locator('.bubble.md pre code').count(), 1); // code block rendered
  assert.equal(await page.locator('.bubble.md li').count(), 2);
  assert.match(await page.locator('.who small').innerText(), /Write an add function/); // chat titled from first message
  if (shots) await page.screenshot({ path: `${shots}/2-coding-chat.png` });

  // Model Hub shows it installed and lets you download another.
  await page.click('[data-nav="hub"]');
  await page.waitForSelector('[data-download="llama-3.2-3b"]');
  assert.equal(await page.locator('.model-card:has-text("Qwen 2.5 Coder") .badge.good').count() >= 1, true);
  await page.click('[data-download="llama-3.2-3b"]');
  await page.waitForSelector('[data-dl="llama-3.2-3b"]');
  if (shots) await page.screenshot({ path: `${shots}/3-hub.png` });
  await page.waitForFunction(() => !document.querySelector('[data-dl]'), null, { timeout: 5000 });

  // Role-play: character chat uses role-play prompt; switch model from the picker.
  await page.click('[data-nav="home"]');
  await page.click('.card[data-id]:has-text("Marlow")');
  await page.click('#start');
  await page.selectOption('#model-pick', 'local:llama-3.2-3b');
  await page.fill('#input', 'I need you to find my sister.');
  await page.keyboard.press('Enter');
  await idle();
  const rp = await page.evaluate(() => window.__lastRequest);
  assert.equal(rp.target.modelId, 'llama-3.2-3b');
  assert.match(rp.system, /You are Marlow Vance/);
  assert.equal(rp.messages[0].role, 'user');
  assert.equal(await page.locator('.bubble em.action').count() > 0, true);

  // Reroll / swipe / stop.
  await page.click('[data-act="reroll"]');
  await idle();
  assert.equal(await page.locator('.swipe-count').innerText(), '2/2');
  await page.fill('#input', 'Hurry.');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(40);
  await page.click('#send');
  await idle();

  // New chat button opens the general assistant.
  await page.click('[data-nav="newchat"]');
  assert.match(await page.locator('.who b').innerText(), /Quicksilver Assistant/);

  // Persisted.
  await page.reload();
  await page.waitForSelector('.card');
  assert.ok(await page.locator('.recent-item').count() >= 2);

  // Escaping.
  await page.click('.recent-item');
  await page.fill('#input', '<img src=x onerror="window.__xss=1">');
  await page.keyboard.press('Enter');
  await idle();
  assert.equal(await page.evaluate(() => window.__xss), undefined);

  await page.click('[data-nav="settings"]');
  await page.waitForSelector('#s-default');
  if (shots) await page.screenshot({ path: `${shots}/4-settings.png` });

  assert.deepEqual(errors, []);
  await browser.close();
  console.log('UI test passed');
})().catch((e) => { console.error(e); process.exit(1); });
