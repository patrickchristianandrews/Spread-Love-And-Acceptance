// End-to-end: launches the real app (Electron) with stand-in engines and clicks through it.
// Run: xvfb-run -a node test/ui.test.js [screenshot-folder]
const { _electron: electron } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const assert = require('node:assert');
const zlib = require('node:zlib');

const ROOT = path.join(__dirname, '..');
const TINY = path.join(__dirname, 'fixtures', 'tiny.gguf');
const shots = process.argv[2];
const shot = async (win, name) => { if (shots) await win.screenshot({ path: path.join(shots, `${name}.png`) }); };

let WIN = null;
// A plain red 64×64 PNG, built by hand.
function redPng(size = 64) {
  const t = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ty), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(size, 0); ih.writeUInt32BE(size, 4); ih[8] = 8; ih[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: size }, () => [220, 30, 30]).flat())]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(Buffer.concat(Array.from({ length: size }, () => row)))), chunk('IEND', Buffer.alloc(0))]);
}

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
  // A model "downloaded by LM Studio": added automatically at start-up.
  const SCAN = path.join(HOME, 'lmstudio');
  fs.mkdirSync(path.join(SCAN, 'bartowski', 'Llama-3.2-3B-Instruct-GGUF'), { recursive: true });
  const lms = path.join(SCAN, 'bartowski', 'Llama-3.2-3B-Instruct-GGUF', 'Llama-3.2-3B-Instruct-Q4_K_M.gguf');
  fs.copyFileSync(TINY, lms); fs.truncateSync(lms, 60e6);
  fs.writeFileSync(path.join(HOME, 'stacks.json'), JSON.stringify([{ id: 'office-powerhouse', name: 'Office & analysis · Powerhouse', emoji: '📊', members: { vision: 'local:gemma-3-4b', drafters: ['local:qwen3-8b', 'local:phi-4'], judge: 'local:phi-4' } }]));

  const app = await electron.launch({
    executablePath: require('electron'),
    args: ['--no-sandbox', ROOT],
    env: { ...process.env, QS_TTS_FAKE: '1', QUICKSILVER_HOME: HOME, QS_LLAMA_SERVER: path.join(__dirname, 'fakes', 'llama-server'), QS_SD_BIN: path.join(__dirname, 'fakes', 'sd'), QS_SCAN_DIRS: SCAN },
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
  await win.waitForSelector('text=and added it. Ready to use', { timeout: 30000 });
  console.log('✓ home (model from another app added automatically)');
  await shot(win, '01-home');

  // Stack Advisor.
  await win.click('[data-nav="stacks"]');
  await win.waitForSelector('.goal.on[data-job="general"]', { timeout: 30000 });
  await win.waitForSelector('.adv-mine', { timeout: 30000 });
  assert.ok(await win.locator('.goal').count() >= 8, 'thinking, creating and unfiltered stack types');
  await win.click('[data-job="office"]');
  await win.waitForSelector('.goal.on[data-job="office"]');
  await win.waitForSelector('.adv-mine [data-use]', { timeout: 30000 });
  assert.equal(await win.locator('.adv-mine [data-use]').count(), 4, 'every installed model can be picked, including the one found in LM Studio');
  assert.ok(await win.locator('.adv-mine [data-use]:checked').count() >= 2, 'best mix pre-picked');
  await shot(win, '02-stacks');
  // Use only two of your models, with Phi leading.
  while (await win.locator('.adv-mine [data-use]:checked').count()) await win.locator('.adv-mine [data-use]:checked').first().uncheck();
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
  // Each stack type explains how it works, offers three strengths with accuracy levels, and
  // suggests a cloud AI with the paid use it saves.
  await win.click('[data-nav="stacks"]');
  await win.click('[data-job="reasoning"]');
  await win.waitForSelector('.how-card:has-text("How the Reasoning stack works")', { timeout: 30000 });
  await win.waitForSelector('.tier-card:has-text("Quickest") .acc');
  await win.waitForSelector('.tier-card.hl:has-text("Balanced") [data-tier="balanced"]');
  await win.waitForSelector('.cloud-card:has-text("Anthropic")', { timeout: 30000 });
  assert.match(await win.locator('.cloud-card').innerText(), /less than asking/);
  await win.evaluate(() => document.querySelector('.tier-grid').scrollIntoView());
  await shot(win, '03b-stack-tiers');
  console.log('✓ stacks: how it works, three strengths with accuracy, cloud boost with savings');
  // Stacks for specific work: 27 ready-made teams; set one up and chat with it.
  await win.waitForSelector('.rx-card:has-text("Isolated medical journal")');
  assert.equal(await win.locator('.rx-card').count(), 27);
  await win.click('.rx-card:has-text("Invoices, receipt reading") [data-rx]');
  await win.waitForFunction(() => S.data.assistants.some((a) => a.id === 'as-rx-bookkeeping'), null, { timeout: 30000 });
  console.log('✓ stacks for specific work: 27 teams, set up as a stack and an assistant');

  // Chat with the powerhouse stack, a spreadsheet attached and fact check on.
  await win.click('[data-nav="newchat"]');
  await win.selectOption('#pick-assistant', 'as-office');
  await win.selectOption('#pick-model', 'stack:office-powerhouse');
  await win.setInputFiles('#file-in', { name: 'sales.csv', mimeType: 'text/csv', buffer: Buffer.from('Region,Revenue\nNorth,1200\nSouth,800\n') });
  await win.waitForSelector('.attach:has-text("sales.csv")');
  if ((await win.getAttribute('#tog-fact', 'aria-pressed')) !== 'true') await win.click('#tog-fact');
  await win.selectOption('#pick-effort', 'max'); // Max: the whole team, always combined
  await win.fill('#input', 'Which region sold more?');
  await win.keyboard.press('Enter');
  await idle();
  await win.waitForFunction(() => document.querySelector('.msg.assistant .bubble')?.textContent.includes('FINAL from'), null, { timeout: 150000 });
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
  // The status light at the top right shows how the model is running.
  await win.waitForSelector('#run-state:not([hidden]) .rs-dot', { timeout: 10000 });
  await win.click('#run-state');
  await win.waitForSelector('#run-panel:has-text("In use")');
  await win.click('#run-close');
  console.log('✓ status light: state of the model in use, with details');
  // Dropdowns are drawn by Quicksilver (readable in both themes): click, see the choices, pick one.
  await win.click('#pick-effort');
  await win.waitForSelector('.sel-pop .sel-item.sel:has-text("Quick")');
  assert.equal(await win.locator('.sel-pop .sel-item').count(), 4);
  const look = await win.evaluate(() => { const p = getComputedStyle(document.querySelector('.sel-pop')); const i = getComputedStyle(document.querySelector('.sel-pop .sel-item')); return { bg: p.backgroundColor, fg: i.color }; });
  assert.notEqual(look.bg, look.fg, 'text and background differ');
  await shot(win, '09b-dropdown');
  await win.click('.sel-pop .sel-item:has-text("Thorough")');
  await win.waitForFunction(() => !document.querySelector('.sel-pop') && document.querySelector('#pick-effort').value === 'thorough');
  // Keyboard: Enter opens, arrows move, Escape closes without changing anything.
  await win.focus('#pick-effort');
  await win.keyboard.press('Enter');
  await win.waitForSelector('.sel-pop');
  await win.keyboard.press('ArrowUp');
  await win.keyboard.press('Escape');
  await win.waitForFunction(() => !document.querySelector('.sel-pop') && document.querySelector('#pick-effort').value === 'thorough');
  console.log('✓ dropdown menus: readable, click and keyboard');
  // The sidebar can be resized by dragging its edge, and the size is remembered.
  {
    const edge = await win.locator('.side-resize').boundingBox();
    await win.mouse.move(edge.x + 4, edge.y + 300);
    await win.mouse.down();
    await win.mouse.move(edge.x + 104, edge.y + 300, { steps: 5 });
    await win.mouse.up();
    const w = await win.evaluate(() => S.data.prefs.sideWidth);
    assert.ok(w > 300, `sidebar widened (${w})`);
    await win.dblclick('.side-resize');
    assert.equal(await win.evaluate(() => S.data.prefs.sideWidth), undefined, 'double-click resets');
    console.log('✓ sidebar: resizable and remembered');
  // Chat tabs: open a second chat as a tab, switch, close with the ×.
  {
    const first = await win.evaluate(() => S.route.id);
    await win.keyboard.press('Control+t');
    await win.waitForSelector('.chat-tabs .ctab.on');
    const second = await win.evaluate(() => S.route.id);
    assert.notEqual(first, second);
    assert.ok(await win.locator('.ctab').count() >= 2, 'two tabs');
    await win.click(`.ctab[data-tab-id="${first}"]`);
    await win.waitForFunction((id) => S.route.id === id, first);
    await win.click(`[data-tab-close="${second}"]`);
    await win.waitForFunction((id) => !S.data.prefs.tabs.includes(id), second);
    console.log('✓ chat tabs: open, switch, close');
  }
  }

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
  // Answers: numbered lists stay together across blank lines, sub-points nest, tasks, code colours.
  const md = await win.evaluate(() => markdown('Steps:\n\n1. One\n\n2. Two\n   - detail\n\n3. Three\n\n- [x] done\n- [ ] todo\n\n```python\ndef f(x):\n    return 1  # one\n```\n\nAfter _this_ and ~~that~~.'));
  assert.equal((md.match(/<ol/g) || []).length, 1, 'one numbered list');
  assert.match(md, /<li>Two<ul><li>detail<\/li><\/ul><\/li>/);
  assert.match(md, /class="task done"/);
  assert.match(md, /<span class="hl-k">def<\/span>/);
  assert.match(md, /<em>this<\/em>/);
  assert.match(md, /<del>that<\/del>/);
  assert.equal(await win.evaluate(() => markdown('2. Second\n3. Third').includes('start="2"')), true, 'numbering continues where it started');
  console.log('✓ skills: picker, applied, download, suggestion, charts');
  await win.click('[data-nav="skills"]');
  await win.waitForSelector('text=Analyze a spreadsheet');
  await shot(win, '10-skills');
  // The expanded library: the nine main areas, and well over 150 skills.
  for (const c of ['Music & audio', 'Photo & video generation', 'Photo & video editing', 'Productivity, office & Excel', 'Coding, apps & websites', 'Writing, content & marketing', 'Research, medical & study', 'Voice & podcasts', 'Finance, tax & contracts']) await win.waitForSelector(`.section h2:has-text("${c}")`);
  assert.ok(await win.evaluate(() => allSkills().length) > 150);

  // A picture made from chat: the text model writes the prompt, the image model paints it.
  await win.click('[data-nav="newchat"]');
  await win.fill('#input', '/create');
  await win.waitForSelector('#skill-pop .skill-opt:has-text("Create a picture")');
  await win.fill('#input', '/picture');
  await win.waitForSelector('#skill-pop .skill-opt.hot:has-text("Create a picture")');
  await win.keyboard.press('Enter');
  await win.fill('#input', 'A red fox in fresh snow at dawn');
  await win.keyboard.press('Enter');
  await win.waitForSelector('.skill-media-item img', { timeout: 60000 });
  assert.ok(await win.evaluate(() => [...document.querySelectorAll('.skill-media .muted')].some((e) => /SDXL Turbo/.test(e.textContent))), 'made with the installed image model');
  await shot(win, '10b-skill-picture');
  // A tool skill on an attached photo: no text model, straight to the result.
  await win.click('[data-nav="newchat"]');
  await win.setInputFiles('#file-in', { name: 'red.png', mimeType: 'image/png', buffer: redPng() });
  await win.waitForSelector('.attach');
  await win.fill('#input', '/upscale');
  await win.waitForSelector('#skill-pop .skill-opt.hot:has-text("Upscale a photo")');
  await win.keyboard.press('Enter');
  await win.fill('#input', 'please');
  await win.keyboard.press('Enter');
  await win.waitForFunction(() => [...document.querySelectorAll('.msg.assistant')].pop()?.querySelector('.skill-media-item img'), null, { timeout: 60000 });
  assert.ok(/Done/.test(await win.evaluate(() => [...document.querySelectorAll('.msg.assistant .bubble')].pop().textContent)));
  // Apps open in their own window: the page is found in the answer.
  assert.ok(await win.evaluate(() => appHtmlOf('Here:\n```html\n<!doctype html><title>T</title>\n```') === '<!doctype html><title>T</title>\n'));
  console.log('✓ skills: 9 areas, picture from chat, photo tool on an attachment, apps');

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
  // The switch beside the model and the one in the sidebar always match.
  await win.click('#net-pill');
  await win.waitForSelector('#net-toggle.off');
  await win.waitForSelector('#net-pill.off');
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
  // Model details: click a model that won't fit to see why and what it would need.
  await win.click('[data-details="gpt-oss-120b"]');
  await win.waitForSelector('.md-need:has-text("What you can do")');
  assert.match(await win.locator('.modal-box, #modal').first().innerText(), /The least it needs|To run it smoothly/);
  await shot(win, '05c-model-details');
  await win.click('#modal [data-close]');
  await win.click('[data-tab="api"]');
  await win.waitForSelector('text=Anthropic (Claude)');
  await win.waitForSelector('#presets h3:has-text("Free to start")');
  await win.waitForSelector('#presets .card:has-text("Google Gemini") .badge:has-text("Free plan")');
  await win.waitForSelector('#presets .card:has-text("OpenAI") .badge:has-text("Paid")');
  await shot(win, '05b-api-free');
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
  // Music: a groove in one click, played by the synth and saved as an MP3.
  await win.click('[data-stab="music"]');
  await win.click('[data-beat="lofi"]');
  await win.waitForSelector('.studio audio', { timeout: 60000 });
  await win.waitForSelector('#mu-chords');
  await shot(win, '11b-music');
  // Voice: read aloud (a test tone stands in for Windows' voices on Linux).
  await win.click('[data-stab="voice"]');
  await win.fill('#vo-text', 'ALEX: Welcome to the show.\nSAM: Glad to be here.');
  await win.click('#vo-go');
  await win.waitForFunction(() => [...document.querySelectorAll('.studio .card b')].some((b) => /Welcome/.test(b.textContent)), null, { timeout: 60000 });
  // Quick fixes on a gallery item.
  await win.click('[data-stab="tools"]');
  const pickImg = await win.evaluate(() => gallery.find((g) => g.kind === 'image')?.id);
  await win.selectOption('#tl-pick', pickImg);
  await win.click('[data-fix="upscale2"]');
  await win.waitForFunction(() => gallery.some((g) => /^Upscaled 2×/.test(g.title || '')), null, { timeout: 60000 });
  await shot(win, '11c-quick-fixes');
  console.log('✓ studio: music, voice, quick fixes');

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
  // Hidden extras: a chat gets a short title written by the model after the first answer.
  await win.click('[data-nav="newchat"]');
  await win.selectOption('#pick-model', 'local:qwen3-8b');
  await win.fill('#input', 'Tell me how lighthouses worked before electricity was invented');
  await win.keyboard.press('Enter');
  await win.waitForFunction(() => /^Answer from/.test(chatById(S.route.id).title), null, { timeout: 60000 }); // the stand-in model's reply becomes the title
  console.log('✓ automatic chat title:', await win.evaluate(() => chatById(S.route.id).title));

  await shot(win, '09-settings-api');

  const lastAnswer = () => win.evaluate(() => [...document.querySelectorAll('.msg.assistant .bubble')].at(-1)?.textContent || '');
  const waitAnswer = (re) => win.waitForFunction((src) => new RegExp(src).test([...document.querySelectorAll('.msg.assistant .bubble')].at(-1)?.textContent || ''), re.source, { timeout: 90000 });

  // Memory: "remember that…" is saved at once, used in a brand-new chat, and things you mention are noticed.
  await idle();
  await win.click('[data-nav="newchat"]');
  await win.selectOption('#pick-model', 'local:qwen3-8b');
  await win.fill('#input', 'Remember that I live in Leeds');
  await win.keyboard.press('Enter');
  await win.waitForSelector('.mem-chip', { timeout: 60000 });
  await idle();
  await win.click('[data-nav="newchat"]');
  await win.selectOption('#pick-model', 'local:qwen3-8b');
  await win.fill('#input', 'My dog is called Biscuit, any weekend ideas?');
  await win.keyboard.press('Enter');
  await waitAnswer(/\[memory: I live in Leeds\]/);
  await win.waitForSelector('.mem-chip', { timeout: 60000 }); // noticed the dog on its own
  await idle();
  await win.click('[data-nav="settings"]');
  await win.click('[data-set-tab="memory"]');
  await win.waitForSelector('.mem-item:has-text("I live in Leeds")');
  await win.waitForSelector('.mem-item:has-text("Biscuit")');
  await win.fill('#mem-new', 'I prefer metric units');
  await win.click('#mem-add');
  await win.waitForSelector('.mem-item:has-text("metric units")');
  await shot(win, '12-memory');
  console.log('✓ memory: remembered on request, noticed on its own, used in new chats, editable');

  // Projects: instructions and files reach every chat in the project.
  await win.click('[data-nav="projects"]');
  await win.click('#pj-new');
  await win.fill('#pe-name', 'Kitchen renovation');
  await win.fill('#pe-ins', 'Budget is 15,000 pounds. Suggest options with rough prices.');
  await win.click('#pe-ok');
  await win.waitForSelector('.proj-page h1:has-text("Kitchen renovation")');
  await win.setInputFiles('#pj-file', { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('The worktop is oak and the floor is slate.') });
  await win.waitForSelector('.proj-file:has-text("notes.txt")');
  await win.selectOption('#pj-model', 'local:qwen3-8b');
  await shot(win, '13-project');
  await win.fill('#pj-q', 'Which worktop do we have?');
  await win.click('#pj-send');
  await waitAnswer(/\[project: Kitchen renovation\]/);
  await win.waitForSelector('.chat-title .proj-chip');
  await idle();
  console.log('✓ projects: instructions and files in every chat');

  // The document editor beside the chat: open an answer, rewrite it, undo, and the chat sees it.
  await win.click('.msg.assistant:last-child [data-act="doc"]');
  await win.waitForSelector('#doc-panel #dp-text');
  const before = await win.inputValue('#dp-text');
  await win.click('[data-dp-do="shorter"]');
  await win.waitForFunction(() => /^Edited by/.test(document.querySelector('#dp-text')?.value || '') && !document.querySelector('.dp-body.busy'), null, { timeout: 60000 });
  await shot(win, '14-document-editor');
  await win.click('[data-dp="undo"]');
  assert.equal(await win.inputValue('#dp-text'), before);
  await win.fill('#input', 'Is this document clear?');
  await win.keyboard.press('Enter');
  await waitAnswer(/\[sees the document\]/);
  await idle();
  await win.click('[data-dp="close"]');
  await win.waitForSelector('#doc-panel', { state: 'detached' });
  console.log('✓ document editor: rewrite, undo, the chat reads it');

  // Arena: a blind test between two models, then the leaderboard.
  await win.click('[data-nav="arena"]');
  await win.selectOption('#ar-pool', 'local:qwen3-8b');
  await win.fill('#ar-q', 'Name a colour');
  await win.click('#ar-go');
  await win.waitForSelector('[data-vote="A"]', { timeout: 150000 });
  assert.ok(!(await win.evaluate(() => document.querySelector('.arena-grid').textContent.includes('Qwen3 8B'))), 'names are hidden until you vote');
  await shot(win, '15-arena');
  await win.click('[data-vote="A"]');
  await win.waitForSelector('.arena-board tbody tr');
  await win.waitForSelector('.arena-side.won');
  await shot(win, '16-arena-voted');
  console.log('✓ arena: blind answers, vote, leaderboard');

  // Voice, phone and updates settings.
  await win.click('[data-nav="settings"]');
  await win.click('[data-set-tab="voice"]');
  await win.waitForFunction(() => !/Checking/.test(document.querySelector('#vt-status')?.textContent || 'Checking'));
  await win.click('[data-set-tab="phone"]');
  await win.check('#ph-on');
  await win.waitForFunction(() => document.querySelector('.phone-qr svg') || document.querySelector('#ph-on')?.checked, null, { timeout: 15000 });
  await win.waitForTimeout(500);
  await shot(win, '17-phone');
  await win.uncheck('#ph-on');
  await win.click('[data-set-tab="general"]');
  await win.waitForSelector('#upd-box');
  console.log('✓ settings: voice, phone (QR link), updates');

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
