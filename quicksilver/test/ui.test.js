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
  await win.waitForSelector('.goal.on[data-job="general"]', { timeout: 30000 });
  await win.waitForSelector('.adv-mine', { timeout: 30000 });
  assert.ok(await win.locator('.goal').count() >= 8, 'thinking, creating and unfiltered stack types');
  await win.click('[data-job="office"]');
  await win.waitForSelector('.goal.on[data-job="office"]');
  await win.waitForSelector('.adv-mine [data-use]', { timeout: 30000 });
  assert.equal(await win.locator('.adv-mine [data-use]').count(), 3, 'every installed model can be picked');
  assert.ok(await win.locator('.adv-mine [data-use]:checked').count() >= 2, 'best mix pre-picked');
  await shot(win, '02-stacks');
  // Use only two of your models, with Phi leading.
  for (const t of ['local:qwen3-8b', 'local:phi-4', 'local:gemma-3-4b']) if (await win.locator(`[data-use="${t}"]`).isChecked()) await win.uncheck(`[data-use="${t}"]`);
  await win.check('[data-use="local:qwen3-8b"]');
  assert.equal(await win.locator('#adv-create').isDisabled(), true, 'one model is not a stack');
  await win.check('[data-use="local:phi-4"]');
  await win.selectOption('#adv-lead', 'local:phi-4');
  await win.waitForSelector('.pick-row:has([data-use="local:phi-4"]) .badge:has-text("Leads")');
  await win.click('#adv-create');
  await win.waitForSelector('#pick-model option[value="stack:office-mine"]:checked', { state: 'attached', timeout: 30000 });
  // Photo & video stacks are Studio setups.
  await win.click('[data-nav="stacks"]');
  await win.click('[data-job="create"]');
  await win.waitForSelector('[data-kit="image"]', { timeout: 30000 });
  await win.click('#kit-create');
  await win.waitForSelector('#ci-model', { timeout: 30000 });
  await win.fill('#ci-prompt', 'a cat');
  await win.click('[data-improve="ci-prompt"]');
  await win.waitForFunction(() => document.querySelector('#ci-prompt').value !== 'a cat' && !document.querySelector('[data-improve="ci-prompt"]').disabled, null, { timeout: 30000 });
  console.log('✓ stacks: types, built from installed models, Studio kit with ✨ Improve');

  // Chat with the powerhouse stack, a spreadsheet attached and fact check on.
  await win.click('[data-nav="newchat"]');
  await win.selectOption('#pick-assistant', 'as-office');
  await win.selectOption('#pick-model', 'stack:office-powerhouse');
  await win.setInputFiles('#file-in', { name: 'sales.csv', mimeType: 'text/csv', buffer: Buffer.from('Region,Revenue\nNorth,1200\nSouth,800\n') });
  await win.waitForSelector('.attach:has-text("sales.csv")');
  if ((await win.getAttribute('#tog-fact', 'aria-pressed')) !== 'true') await win.click('#tog-fact');
  await win.fill('#input', 'Which region sold more?');
  await win.keyboard.press('Enter');
  await idle();
  await win.waitForFunction(() => document.querySelector('.msg.assistant .bubble')?.textContent.includes('FINAL from'), null, { timeout: 60000 });
  assert.match(await win.locator('.steps > summary').innerText(), /3 steps/);
  await win.waitForSelector('.fact-chip', { timeout: 60000 });
  await win.waitForFunction(() => !document.querySelector('.fact-chip.k-run'), null, { timeout: 60000 });
  assert.equal(await win.locator('.msg.assistant .fp-claims').count(), 0, 'full check stays out of the chat');
  await win.click('.fact-chip');
  await win.waitForSelector('#fact-panel .fp-verdict');
  assert.match(await win.locator('#fact-panel').innerText(), /Checked by/);
  await shot(win, '03b-fact-panel');
  await win.keyboard.press('Escape');
  await win.waitForSelector('#fact-panel', { state: 'detached' });
  console.log('✓ stack chat with spreadsheet + fact check (chip + side panel)');
  await win.locator('.steps').first().evaluate((d) => { d.open = true; });
  await shot(win, '03-chat-stack');

  // Infuse: fuse two models into one with Debate, from the model picker.
  await win.selectOption('#pick-model', '__infuse');
  await win.waitForSelector('text=Infuse AIs');
  await win.check('.infuse-opt input[value="local:qwen3-8b"]');
  await win.check('.infuse-opt input[value="local:phi-4"]');
  await win.click('.infuse-mode:has-text("Debate")');
  await win.fill('#inf-name', 'Analyst Supreme');
  await shot(win, '13-infuse');
  await win.click('#inf-go');
  await win.waitForFunction(() => document.querySelector('#pick-model option:checked')?.textContent.includes('Analyst Supreme'));
  await win.fill('#input', 'Settle this with a debate');
  await win.keyboard.press('Enter');
  await idle();
  await win.waitForFunction(() => [...document.querySelectorAll('.msg.assistant .bubble')].pop()?.textContent.includes('FINAL from phi.gguf combining 4 drafts'), null, { timeout: 60000 });
  await win.waitForFunction(() => !document.querySelector('.fact-chip.k-run'), null, { timeout: 60000 });
  console.log('✓ infuse: created from the chat, debate answer');
  await win.selectOption('#pick-model', 'stack:office-powerhouse');

  // Effort: quick uses one model, no steps.
  await win.selectOption('#pick-effort', 'quick');
  await win.fill('#input', 'Short answer please');
  await win.keyboard.press('Enter');
  await idle();
  await win.waitForFunction(() => [...document.querySelectorAll('.msg.assistant .bubble')].pop()?.textContent.includes('Answer from qwen.gguf'), null, { timeout: 60000 });
  console.log('✓ quick effort');

  // Skills: "/" picker, the chip, the skill applied to the request, the file button.
  await win.waitForFunction(() => !document.querySelector('.fact-chip.k-run'), null, { timeout: 60000 });
  await win.fill('#input', '/presen');
  await win.waitForSelector('#skill-pop .skill-opt.hot:has-text("Create a presentation")');
  await win.keyboard.press('Enter');
  await win.waitForSelector('#skill-row:has-text("Create a presentation")');
  await win.fill('#input', 'Our Q3 results for the board');
  await win.keyboard.press('Enter');
  await idle();
  await win.waitForSelector('[data-act="dl"][data-fmt="pptx"]', { timeout: 60000 });
  await win.waitForSelector('.who-line .badge:has-text("Create a presentation")');
  // Suggestions: typing a matching phrase offers the skill.
  await win.fill('#input', 'can you summarize this article');
  await win.waitForSelector('#skill-row button:has-text("Summarize")', { timeout: 5000 });
  await win.fill('#input', '');
  // Charts render from ```chart blocks.
  const svg = await win.evaluate(() => markdown('```chart\n{"type":"bar","title":"Sales","labels":["N","S"],"series":[{"name":"Rev","data":[3,5]}]}\n```').includes('<svg'));
  assert.ok(svg);
  console.log('✓ skills: picker, applied, download, suggestion, charts');
  await win.click('[data-nav="skills"]');
  await win.waitForSelector('text=Analyze a spreadsheet');
  await shot(win, '10-skills');

  // Integrations: add a real MCP server, then a chat uses its tools with an approval prompt.
  await win.click('[data-nav="integrations"]');
  await win.waitForSelector('text=Connectors');
  await win.click('[data-mcp-preset="custom"]');
  await win.fill('#m-name', 'Test MCP');
  await win.selectOption('#m-transport', 'stdio');
  await win.fill('#m-cmd', process.execPath);
  await win.fill('#m-args', path.join(__dirname, 'fakes', 'mcp-server.js'));
  await win.click('#m-save');
  await win.waitForSelector('.badge:has-text("2 tools")', { timeout: 30000 });
  await shot(win, '11-integrations');
  await win.click('[data-nav="newchat"]');
  await win.selectOption('#pick-model', 'local:qwen3-8b');
  await win.click('#tog-tools');
  await win.fill('#input', 'Please use save_note');
  await win.keyboard.press('Enter');
  await win.waitForSelector('text=Allow this action?', { timeout: 30000 });
  await shot(win, '12-approval');
  await win.click('[data-ap="once"]');
  await win.waitForFunction(() => [...document.querySelectorAll('.msg.assistant .bubble')].pop()?.textContent.includes('saved: hello from the model'), null, { timeout: 30000 });
  assert.match(await win.locator('.steps > summary:has-text("Used 1 tool")').innerText(), /Test MCP/);
  console.log('✓ integrations: MCP server added, tool used in chat with approval');

  // Sidebar chat menu.
  await win.click('.chat-row .chat-link');
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
  await win.click('#kb-save-model');
  await win.fill('#km-name', 'Clinical Reference');
  await win.check('#km-strict');
  await win.click('#km-save');
  await win.waitForSelector('.card:has-text("Clinical Reference")');
  await win.click('[data-kbm-chat]');
  await win.waitForFunction(() => document.querySelector('#pick-model option:checked')?.textContent.includes('Clinical Reference'));
  console.log('✓ knowledge model saved and picked in a chat');
  await win.click('#net-toggle');
  await win.waitForSelector('#net-toggle.off');
  await win.waitForSelector('text=Web (offline)');
  await shot(win, '14-offline');
  await win.click('#net-toggle');
  await win.waitForSelector('#net-toggle:not(.off)');
  console.log('✓ online / offline switch');
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

  if (errors.length) console.log('PAGE ERRORS:', errors);
  assert.deepEqual(errors, []);
  await app.close();
  fs.rmSync(HOME, { recursive: true, force: true });
  console.log('\nUI TESTS PASSED');
})().catch(async (e) => {
  console.error('FAIL', e.message.split('\n')[0]);
  if (WIN) { try { if (shots) await WIN.screenshot({ path: path.join(shots, 'FAIL.png') }); console.error('PAGE:', (await WIN.evaluate(() => document.body.innerText)).slice(0, 1500)); } catch {} }
  process.exit(1);
});
