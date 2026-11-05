// End-to-end: launches the real app (Electron) with stand-in engines and clicks through it.
// Run: xvfb-run -a node test/ui.test.js [screenshot-folder]
const { _electron: electron } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const assert = require('node:assert');

const ROOT = path.join(__dirname, '..');
const TINY = path.join(__dirname, 'fixtures', 'tiny.gguf');
const shots = process.argv[2];
const shot = async (win, name) => { if (shots) await win.screenshot({ path: path.join(shots, `${name}.png`) }); };

let WIN = null;
(async () => {
  const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-ui-'));
  const mdir = path.join(HOME, 'models');
  fs.mkdirSync(mdir);
  const copy = (n) => { const p = path.join(mdir, n); fs.copyFileSync(TINY, p); return p; };
  fs.writeFileSync(path.join(HOME, 'models.json'), JSON.stringify([
    { id: 'qwen3-8b', name: 'Qwen3 8B', kind: 'text', catalogId: 'qwen3-8b', files: { model: copy('qwen.gguf') }, size: 5e9 },
    { id: 'phi-4', name: 'Phi-4 14B', kind: 'text', catalogId: 'phi-4', files: { model: copy('phi.gguf') }, size: 9e9 },
    { id: 'gemma-3-4b', name: 'Gemma 3 4B', kind: 'text', catalogId: 'gemma-3-4b', files: { model: copy('gemma.gguf'), mmproj: copy('mmproj.gguf') }, size: 3e9, vision: true },
    { id: 'sdxl-turbo', name: 'SDXL Turbo', kind: 'image', catalogId: 'sdxl-turbo', files: { model: copy('sdxl.safetensors') }, size: 7e9 },
    { id: 'wan2.1-1.3b', name: 'Wan 2.1 1.3B', kind: 'video', catalogId: 'wan2.1-1.3b', files: { diffusion: copy('wan.st'), vae: copy('vae.st'), t5xxl: copy('t5.gguf') }, size: 7e9 },
  ]));
  fs.writeFileSync(path.join(HOME, 'stacks.json'), JSON.stringify([{ id: 'office-powerhouse', name: 'Office & analysis · Powerhouse', emoji: '📊', members: { vision: 'local:gemma-3-4b', drafters: ['local:qwen3-8b', 'local:phi-4'], judge: 'local:phi-4' } }]));

  const app = await electron.launch({
    executablePath: require('electron'),
    args: ['--no-sandbox', ROOT],
    env: { ...process.env, QUICKSILVER_HOME: HOME, QS_LLAMA_SERVER: path.join(__dirname, 'fakes', 'llama-server'), QS_SD_BIN: path.join(__dirname, 'fakes', 'sd') },
  });
  const win = await app.firstWindow();
  WIN = win;
  await win.setViewportSize({ width: 1440, height: 920 });
  const errors = [];
  win.on('pageerror', (e) => errors.push(e.message));
  win.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  const idle = () => win.waitForFunction(() => !document.querySelector('.bubble.streaming') && !document.querySelector('.status-line'), null, { timeout: 60000 });

  // Home dashboard.
  await win.waitForSelector('text=Forms to fit your work.');
  await win.waitForSelector('text=Fake GPU 8GB', { timeout: 30000 });
  console.log('✓ home');
  await shot(win, '01-home');

  // Stack Advisor.
  await win.click('[data-nav="stacks"]');
  await win.click('[data-job="office"]');
  await win.waitForSelector('text=Recommended for office & analysis', { timeout: 30000 });
  assert.ok(await win.locator('[data-build]').count() >= 2);
  console.log('✓ stack advisor');
  await shot(win, '02-stacks');

  // Chat with the powerhouse stack, a spreadsheet attached and fact check on.
  await win.click('[data-nav="newchat"]');
  await win.selectOption('#pick-assistant', 'as-office');
  await win.selectOption('#pick-model', 'stack:office-powerhouse');
  await win.setInputFiles('#file-in', { name: 'sales.csv', mimeType: 'text/csv', buffer: Buffer.from('Region,Revenue\nNorth,1200\nSouth,800\n') });
  await win.waitForSelector('.attach:has-text("sales.csv")');
  if (/off/.test(await win.locator('#tog-fact').innerText())) await win.click('#tog-fact');
  await win.fill('#input', 'Which region sold more?');
  await win.keyboard.press('Enter');
  await idle();
  await win.waitForFunction(() => document.querySelector('.msg.assistant .bubble')?.textContent.includes('FINAL from'), null, { timeout: 60000 });
  assert.match(await win.locator('.steps > summary').innerText(), /3 steps/);
  await win.waitForSelector('text=checked by', { timeout: 60000 });
  await win.waitForFunction(() => !document.body.textContent.includes('checking…'), null, { timeout: 60000 });
  console.log('✓ stack chat with spreadsheet + fact check');
  await win.locator('.steps').first().evaluate((d) => { d.open = true; });
  await shot(win, '03-chat-stack');

  // Effort: quick uses one model, no steps.
  await win.selectOption('#pick-effort', 'quick');
  await win.fill('#input', 'Short answer please');
  await win.keyboard.press('Enter');
  await idle();
  await win.waitForFunction(() => [...document.querySelectorAll('.msg.assistant .bubble')].pop()?.textContent.includes('Answer from qwen.gguf'), null, { timeout: 60000 });
  console.log('✓ quick effort');

  // Sidebar chat menu.
  await win.hover('.chat-row');
  await win.click('.chat-row .chat-more');
  await win.click('.menu [data-m="pin"]');
  await win.waitForSelector('.chat-group:has-text("Pinned")');
  console.log('✓ chat menu');

  // Knowledge.
  await win.click('[data-nav="library"]');
  await win.click('#kb-new');
  await win.fill('#kb-name', 'Clinical research');
  await win.click('#kb-ok');
  await win.waitForSelector('.tab.active:has-text("Clinical research")');
  await win.click('text=PubMed (medical journals)');
  await win.waitForSelector('label.btn.on:has-text("PubMed")');
  console.log('✓ knowledge bases');
  await shot(win, '04-knowledge');

  // Models, Your PC.
  await win.click('[data-nav="models"]');
  await win.click('[data-tab="text"]');
  await win.waitForSelector('text=Qwen3 30B-A3B');
  await shot(win, '05-models');
  await win.click('[data-tab="api"]');
  await win.waitForSelector('text=Anthropic (Claude)');
  await win.click('[data-nav="pc"]');
  await win.waitForSelector('text=Speed test');
  await shot(win, '06-your-pc');
  console.log('✓ models + your PC');

  // Studio: create an image, edit it, make a video.
  await win.click('[data-nav="studio"]');
  await win.fill('#ci-prompt', 'a pastel droplet on a desk');
  await win.click('#ci-go');
  await win.waitForSelector('.gitem img', { timeout: 60000 });
  await shot(win, '07-studio');
  await win.click('.gitem');
  await win.click('[data-g="edit"]');
  await win.waitForSelector('#ed-canvas');
  await win.click('[data-filter="vivid"]');
  await win.click('#ai-go').catch(() => {});
  await win.fill('#ai-prompt', 'make it blue');
  await win.click('#ai-go');
  await win.waitForFunction(() => !document.querySelector('[data-stop-job]'), null, { timeout: 60000 });
  await shot(win, '08-photo-edit');
  await win.click('[data-stab="video"]');
  await win.fill('#cv-prompt', 'waves on a beach');
  await win.selectOption('#cv-len', '17');
  await win.click('#cv-go');
  await win.waitForSelector('.gitem video', { timeout: 90000 });
  console.log('✓ studio: image, AI edit, video');

  // Settings: API server on.
  await win.click('[data-nav="settings"]');
  await win.click('[data-set-tab="api"]');
  await win.waitForTimeout(800);
  await win.check('#a-on', { timeout: 8000 }).catch(async (e) => { console.log('CHECKLOG', e.message.split('\n').slice(0, 25).join('\n')); throw e; });
  await win.fill('#a-port', '18440');
  await win.click('#a-save');
  await win.waitForSelector('text=Running at http://127.0.0.1:18440/v1');
  const models = await (await fetch('http://127.0.0.1:18440/v1/models')).json();
  assert.ok(models.data.some((m) => m.id === 'stack:office-powerhouse'));
  console.log('✓ API server from settings');
  await shot(win, '09-settings-api');

  assert.deepEqual(errors, []);
  await app.close();
  fs.rmSync(HOME, { recursive: true, force: true });
  console.log('\nUI TESTS PASSED');
})().catch(async (e) => {
  console.error('FAIL', e.message.split('\n')[0]);
  if (WIN) { try { if (shots) await WIN.screenshot({ path: path.join(shots, 'FAIL.png') }); console.error('PAGE:', (await WIN.evaluate(() => document.body.innerText)).slice(0, 1500)); } catch {} }
  process.exit(1);
});
