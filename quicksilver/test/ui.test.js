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
  // The fake 8 GB graphics card turns on background work (reading ahead, answering the next
  // question in advance); on a slow test machine that competes with the steps being tested, so
  // it's off here and switched on only in the tests that check it.
  await win.evaluate(() => { S.data.prefs.preanswer = false; S.data.prefs.readAhead = false; S.data.prefs.exploreOpen = true; save(); paintExplore(); });
  // Most checks below use the full view (every option on screen); the simple view, which is the
  // default, is checked near the end.
  assert.equal(await win.evaluate(() => S.data.prefs.simple), true, 'simple view is the default');
  await win.waitForSelector('.welcome-card:has-text("Bring your chats from other AIs")');
  await shot(win, '00-welcome');
  await win.click('#wc-close');
  await win.waitForSelector('.welcome-card', { state: 'detached' });
  await win.evaluate(() => { S.data.prefs.simple = false; S.data.prefs.autoRoute = false; applyPrefs(); save(); render(); });
  await win.waitForSelector('text=and added it. Ready to use', { timeout: 30000 });
  // Start something: expert assistants for one task each (the everyday Quicksilver isn't listed).
  assert.match(await win.locator('.start-note').innerText(), /assistant programmed to be an expert at one task/);
  assert.equal(await win.locator('[data-start="as-general"]').count(), 0);
  assert.ok(await win.locator('[data-start]').count() >= 10);
  console.log('✓ home (model from another app added automatically; expert assistants explained)');
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
  await win.waitForSelector('.how-card:has-text("How the Reasoning team works")', { timeout: 30000 });
  await win.waitForSelector('.tier-card:has-text("Quickest") .acc');
  await win.waitForSelector('.tier-card.hl:has-text("Balanced") [data-tier="balanced"]');
  await win.waitForSelector('.cloud-card:has-text("Anthropic")', { timeout: 30000 });
  assert.match(await win.locator('.cloud-card').innerText(), /less than asking/);
  await win.evaluate(() => document.querySelector('.tier-grid').scrollIntoView());
  await shot(win, '03b-stack-tiers');
  console.log('✓ stacks: how it works, three strengths with accuracy, cloud boost with savings');
  // Stacks for specific work: 27 ready-made teams; set one up and chat with it.
  await win.waitForSelector('.rx-card:has-text("Isolated medical journal")');
  assert.ok(await win.locator('.rx-card').count() >= 70, 'a large library of ready-made stacks');
  assert.equal(await win.locator('.rx-card .rx-why').count(), await win.locator('.rx-card').count(), 'each says why it is good');
  await win.click('.rx-card:has-text("Invoices, receipt reading") [data-rx]');
  await win.waitForFunction(() => S.data.assistants.some((a) => a.id === 'as-rx-bookkeeping'), null, { timeout: 30000 });
  // Song creation: 13 teams, each tuned to this PC (no model that won't run here; a speed helper
  // for leads that can use one). The song doctor debates before it answers.
  await win.waitForSelector('.rx-card:has-text("Songwriter: any genre")');
  const tuned = await win.evaluate(() => STACK_RECIPES.filter((r) => r.id.startsWith('song-')).map((r) => ({ id: r.id, parts: rxResolve(r).parts.filter((p) => p.kind === 'model').map((p) => ({ id: p.id, from: p.from, helper: p.helper, rating: S.est?.text?.[p.id]?.rating || S.est?.media?.[p.id]?.rating })) })));
  assert.equal(tuned.length, 3);
  for (const r of tuned) for (const p of r.parts) assert.notEqual(p.rating, 'wont', `${r.id}: ${p.id} won't run here`);
  console.log('  tuned for this PC:', tuned.flatMap((r) => r.parts.filter((p) => p.from || p.helper).map((p) => `${r.id}: ${p.helper ? `+${p.id} (speed helper)` : `${p.from}→${p.id}`}`)).join('; ') || 'as listed');
  await win.click('.rx-card:has-text("Song doctor") [data-rx]');
  await win.waitForFunction(() => S.data.assistants.some((a) => a.id === 'as-rx-song-doctor'), null, { timeout: 30000 });
  assert.equal(await win.evaluate(async () => (await qs.call('stacks:list')).find((x) => x.id === 'rx-song-doctor')?.members.mode), 'debate');
  assert.equal(await win.evaluate(() => S.data.assistants.find((a) => a.id === 'as-rx-song-doctor').skill), 'song-critique');
  // Power moves are Fusion styles now: Majority vote, Red team, Plan then solve, Expert panel.
  // Stacks & Fusion: two separate tabs. Stacks are ready-made; a fusion is your own mix.
  await win.click('[data-nav="stacks"]');
  await win.waitForSelector('.sf-tabs [data-sf-tab="stacks"].active');
  assert.equal(await win.locator('[data-pm], #fusion-new-main').count(), 0, 'nothing about fusions on the Stacks tab');
  await win.click('.sf-tabs [data-sf-tab="fusion"]');
  await win.waitForSelector('.fusion-hero #fusion-new-main');
  assert.equal(await win.locator('[data-pm]').count(), 4, 'one-click fusions');
  assert.equal(await win.locator('.rx-card').count(), 0, 'no ready-made stacks on the Fusion tab');
  await shot(win, '02b-fusion-tab');
  await win.click('#fusion-new-main');
  await win.waitForSelector('#modal h2:has-text("Build a custom AI")');
  for (const m of ['vote', 'redteam', 'plan', 'panel']) await win.waitForSelector(`#modal input[name="im"][value="${m}"]`, { state: 'attached' });
  await win.click('#modal [data-close]');
  await win.click('.sf-tabs [data-sf-tab="stacks"]');
  console.log('✓ Stacks & Fusion: separate tabs; Fusion has its builder, your fusions, one-click fusions and the ways to combine');
  assert.ok(await win.evaluate(() => STACK_RECIPES.some((r) => r.id === 'gif-maker' && r.skill === 'make-gif') && skillById('make-gif')?.media?.gif));
  console.log(`✓ stacks for specific work: ${await win.evaluate(() => STACK_RECIPES.length)} teams incl. 3 song stacks and a GIF maker, tuned to this PC, set up as a stack and an assistant`);

  // Chat with the powerhouse stack, a spreadsheet attached and fact check on.
  await win.click('[data-nav="newchat"]');
  await win.selectOption('#pick-assistant', 'as-office');
  await win.selectOption('#pick-model', 'stack:office-powerhouse');
  // Picking a stack says what the web and a cloud AI would add; "How?" explains it in full.
  await win.waitForSelector('#toast:has-text("web search makes facts")');
  await win.click('#toast .toast-act');
  await win.waitForSelector('#modal h2:has-text("what the web and a cloud AI add")');
  assert.match(await win.locator('#modal .bz').innerText(), /Web search[\s\S]*Connected apps/);
  // Every major job rated out of 10: on its own, with the web, with a cloud AI.
  const jobs = await win.locator('#modal .bz-jobs').innerText();
  for (const j of ['Reasoning & maths', 'Complex tasks', 'Research & current facts', 'Coding', 'Photo creation', 'Photo editing', 'Video creation', 'Music']) assert.ok(jobs.includes(j), j);
  assert.match(jobs, /On its own[\s\S]*\+ Web[\s\S]*\+ Cloud AI[\s\S]*\/10/);
  // A recommended cloud service for each job, chosen for this PC and the output wanted.
  assert.ok(await win.locator('#modal .bz-rec').count() >= 8);
  // The web column is filled in for every job: a score where web search helps, "Same" where it can't.
  assert.match(jobs, /With web: reads current library docs[\s\S]*Same/);
  assert.equal(await win.locator('#modal .bz-web').count(), 10);
  assert.match(jobs, /Recommended for this PC:[\s\S]*Video creation[\s\S]*Veo 3\.1[\s\S]*Music \(full songs\)[\s\S]*MiniMax Music/);
  await win.evaluate(() => { document.querySelector('#modal-body').scrollTop = 0; });
  await shot(win, '06b-web-cloud-boost');
  await win.click('#modal [data-close]');
  await win.setInputFiles('#file-in', { name: 'sales.csv', mimeType: 'text/csv', buffer: Buffer.from('Region,Revenue\nNorth,1200\nSouth,800\n') });
  await win.waitForSelector('.attach:has-text("sales.csv")');
  if ((await win.getAttribute('#tog-fact', 'aria-pressed')) !== 'true') await win.click('#tog-fact');
  await win.evaluate(() => { chatById(S.route.id).effort = 'max'; save(); }); // the whole team, always combined (older setting, still honoured)
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
  await win.waitForSelector('#modal h2:has-text("Build a custom AI")');
  await win.check('.infuse-opt input[value="local:qwen3-8b"]');
  await win.check('.infuse-opt input[value="local:phi-4"]');
  await win.click('.infuse-mode:has-text("Debate")');
  await win.fill('#inf-name', 'Analyst Supreme');
  // The builder rates the custom AI: power, efficiency, accuracy, and whether it runs on this PC.
  await win.waitForSelector('#inf-preview .fz-ratings .fz-run');
  const fz = await win.locator('#inf-preview .fz-ratings').innerText();
  assert.match(fz, /Power[\s\S]*\/10[\s\S]*Efficiency[\s\S]*\/10[\s\S]*Accuracy[\s\S]*\/10/);
  assert.match(fz, /Runs well on this PC|Runs, but|Won't run/);
  assert.match(await win.locator('#inf-preview').innerText(), /Overall on this PC[\s\S]*\/10[\s\S]*Recommended changes/);
  // How the web and a cloud AI would improve it, in numbers.
  assert.match(await win.locator('#inf-preview .bz').innerText(), /Web search[\s\S]*9 in 10[\s\S]*cloud AI/i);
  await shot(win, '13-infuse');
  // The builder suggests what to add for a task you pick.
  await win.waitForSelector('#inf-suggest .sug-now');
  await win.click('#inf-suggest [data-sug-task="coding"]');
  await win.waitForFunction(() => /Now for Coding/.test(document.querySelector('#inf-suggest .sug-now')?.textContent || ''));
  assert.match(await win.locator('#inf-suggest').innerText(), /Suggested additions[\s\S]*Best model to join[\s\S]*Best API to add/);
  await win.locator('#inf-suggest').scrollIntoViewIfNeeded();
  await shot(win, '13a-infuse-suggestions');
  await win.click('#inf-go');
  await win.waitForFunction(() => document.querySelector('#pick-model option:checked')?.textContent.includes('Analyst Supreme'));
  // Publish the custom AI: shows exactly what's shared (never keys), then opens a GitHub issue.
  await win.evaluate(() => { stacksTab = 'fusion'; go({ view: 'stacks' }); });
  // Its rating on this PC, with recommended changes that can be applied in one click.
  await win.click('.card:has-text("Analyst Supreme") [data-fz-rate]');
  await win.waitForSelector('#modal h2:has-text("rating on this PC")');
  assert.match(await win.locator('#modal').innerText(), /Power[\s\S]*Overall on this PC[\s\S]*Recommended changes/);
  await shot(win, '13b-fusion-rating');
  await win.click('#modal [data-close]');
  // Every stack, fusion and model has "⚡ Web & cloud": each job rated out of 10, and the service to add.
  await win.click('.card:has-text("Analyst Supreme") [data-boost]');
  await win.waitForSelector('#modal .bz-jobs');
  assert.match(await win.locator('#modal').innerText(), /Analyst Supreme: what the web[\s\S]*custom AI \(fusion\)[\s\S]*Reasoning & maths[\s\S]*Recommended for this PC/);
  await win.click('#modal [data-close]');
  await win.evaluate(() => { modelsTab = 'text'; go({ view: 'models' }); });
  await win.locator('.model-card [data-boost]').first().click();
  await win.waitForSelector('#modal .bz-jobs');
  assert.match(await win.locator('#modal').innerText(), /For this model, on this PC[\s\S]*Photo creation[\s\S]*Music \(full songs\)/);
  await shot(win, '13c-model-web-cloud');
  await win.click('#modal [data-close]');
  // Model suggester: pick a task, see the best model to join (that runs here) and the best API to add.
  await win.evaluate(() => { stacksTab = 'fusion'; go({ view: 'stacks' }); });
  await win.waitForSelector('.sug-sec .sug-now');
  await win.click('.card:has-text("Analyst Supreme") [data-sug-open]');
  await win.waitForSelector('#modal .sug');
  await win.click('#modal [data-sug-task="coding"]');
  await win.waitForFunction(() => /Now for Coding/.test(document.querySelector('#modal .sug-now')?.textContent || ''));
  assert.match(await win.locator('#modal .sug').innerText(), /Best model to join[\s\S]*Best API to add[\s\S]*(Groq|Anthropic|Gemini)/);
  await win.click('#modal [data-sug-task="video"]');
  await win.waitForFunction(() => /Now for Video/.test(document.querySelector('#modal .sug-now')?.textContent || ''));
  assert.match(await win.locator('#modal .sug').innerText(), /fal\.ai|Kling|Replicate/);
  await shot(win, '13d-model-suggester');
  await win.click('#modal [data-close]');
  await win.evaluate(() => { stacksTab = 'fusion'; go({ view: 'stacks' }); });
  await win.click('.card:has-text("Analyst Supreme") [data-publish]');
  await win.waitForSelector('#modal h2:has-text("Publish your custom AI")');
  assert.match(await win.locator('#modal').innerText(), /Exactly what's shared[\s\S]*Never shared: your API keys/);
  const code = await win.evaluate(() => shareCode({ name: 'Code Duo', emoji: '🧪', description: 'Shared directly.', mode: 'debate', parts: [{ kind: 'local', model: 'qwen3-8b' }, { kind: 'local', model: 'phi-4' }], lead: 0 }));
  assert.match(code, /^QS1-/);
  await win.click('#modal [data-close]');
  await win.click('[data-import-ai]');
  await win.fill('#imp-code', code);
  await win.click('#imp-read');
  await win.waitForSelector('#imp-preview .us-card:has-text("Code Duo")');
  await win.click('#modal [data-close]');
  // User-submitted stacks: add one; its models are already here, so it's ready to chat with.
  await win.evaluate(() => { communityData = { fetchedAt: Date.now(), stacks: [{ id: 'test-duo', name: 'Test Duo', emoji: '🧪', description: 'Two local models debating hard questions.', author: 'octo', mode: 'debate', parts: [{ kind: 'local', model: 'qwen3-8b' }, { kind: 'local', model: 'phi-4' }], lead: 1, added: '2026-11-09' }, { id: 'needs-cloud', name: 'Needs Cloud', emoji: '☁️', description: 'Fuses a local model with a cloud AI you have not connected.', mode: 'blend', parts: [{ kind: 'local', model: 'qwen3-8b' }, { kind: 'cloud', preset: 'xai', model: 'grok-4' }], lead: 0 }] }; stacksTab = 'community'; render(); });
  await win.waitForSelector('.us-card:has-text("Test Duo") [data-us-add]');
  assert.ok(await win.locator('.us-card:has-text("Needs Cloud") [data-us-connect="xai"]').count() === 1, 'a missing cloud AI asks to connect it first');
  await shot(win, '02c-user-submitted');
  await win.click('.us-card:has-text("Test Duo") [data-us-add]');
  await win.waitForSelector('.us-card:has-text("Test Duo") [data-us-chat]');
  const added = await win.evaluate(async () => (await qs.call('stacks:list')).find((x) => x.id === 'us-test-duo'));
  assert.equal(added.members.mode, 'debate'); assert.ok(added.infused && added.community === 'test-duo');
  await win.evaluate(() => { stacksTab = 'stacks'; });
  console.log('✓ custom AIs: save with a name, publish (what\'s shared shown, never keys), user-submitted stacks added in a click');
  await win.click('[data-nav="newchat"]');
  await win.selectOption('#pick-model', { label: '⚗️ Analyst Supreme' }).catch(async () => { const t = await win.evaluate(() => S.targets.find((x) => /Analyst Supreme/.test(x.label))?.target); await win.selectOption('#pick-model', t); });
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

  // 👍 / 👎 teach Automatic; a definite mistake found by the double-check is fixed once, by itself.
  await win.locator('[data-act="up"]').last().click();
  await win.waitForFunction(() => [...document.querySelectorAll('[data-act="up"]')].pop()?.getAttribute('aria-pressed') === 'true');
  assert.match(await win.evaluate(() => JSON.stringify(S.data.learn)), /"up":1/);
  await win.locator('[data-act="down"]').last().click();
  assert.match(await win.evaluate(() => JSON.stringify(S.data.learn)), /"up":0,"down":1/, 'switching the vote moves it, not doubles it');
  assert.ok(await win.evaluate(() => webWanted({}, {}, 'What is the latest NHS guidance on blood pressure?') !== '' || S.config?.web?.provider === 'none' || S.config?.offline), 'current questions search the web automatically');
  assert.equal(await win.evaluate(() => webWanted({ web: false }, {}, 'latest news today')), '', 'not when web search is off for the chat');
  if ((await win.getAttribute('#tog-fact', 'aria-pressed')) !== 'true') await win.click('#tog-fact');
  await win.fill('#input', 'WRONGFACT what colour is the sky?');
  await win.keyboard.press('Enter');
  await win.waitForSelector('.msg.assistant .badge:has-text("Corrected")', { timeout: 60000 });
  await idle();
  await win.waitForFunction(() => [...document.querySelectorAll('.msg.assistant .bubble')].pop()?.textContent.includes('[fixed]'), null, { timeout: 60000 });
  assert.match(await win.locator('.msg.assistant').last().locator('.alt-switch').innerText(), /2 \/ 2/, 'the corrected answer is added beside the first one');
  await win.waitForFunction(() => !document.querySelector('.fact-chip.k-run'), null, { timeout: 60000 });
  await win.locator('.fact-chip').last().click();
  await shot(win, '03c-self-correction');
  await win.click('#fact-panel [data-fp="fix"]');
  await idle();
  await win.waitForFunction(() => /3 \/ 3/.test([...document.querySelectorAll('.msg.assistant')].pop()?.querySelector('.alt-switch')?.textContent || ''), null, { timeout: 60000 });
  await win.waitForFunction(() => !document.querySelector('.fact-chip.k-run'), null, { timeout: 60000 });
  if (await win.locator('#fact-panel').count()) await win.keyboard.press('Escape');
  console.log('✓ self-correction: 👍/👎 learning, auto web for current questions, double-check fixes mistakes');

  // Suggestions while typing: what would make this message go better.
  const backTo = await win.evaluate(() => S.route.id);
  await win.click('[data-nav="newchat"]');
  await win.evaluate(() => { S.data.prefs.autoWeb = false; });
  await win.fill('#input', "What's the latest news about the election?");
  await win.waitForSelector('#hint-row .hint-go:has-text("Turn on web search")');
  await win.click('#hint-row .hint-go:has-text("Turn on web search")');
  await win.waitForFunction(() => chatById(S.route.id).web === true);
  assert.equal(await win.inputValue('#input'), "What's the latest news about the election?", 'the message is kept');
  await win.evaluate(() => { S.data.prefs.autoWeb = true; });
  await win.fill('#input', 'Write a dark horror story with graphic violence');
  await win.waitForSelector('#hint-row .hint-go:has-text("uncensored")');
  await win.fill('#input', 'Summarise the attached report for me please');
  await win.waitForSelector('#hint-row .hint-go:has-text("Attach the file")');
  await win.click('#hint-row .hint-x');
  await win.waitForFunction(() => !document.querySelector('#hint-row .hint') && (chatById(S.route.id).hintsOff || []).includes('attach'));
  await win.fill('#input', 'Summarise the attached report for me, thanks');
  await win.waitForTimeout(500);
  assert.equal(await win.locator('#hint-row .hint').count(), 0, 'a dismissed suggestion stays away in this chat');
  await win.fill('#input', 'List the open pull requests on my GitHub repo');
  await win.waitForSelector('#hint-row .hint-go:text-matches("(Connect|Let it use) GitHub")');
  await win.fill('#input', '');
  // An answer that refused gets a one-click way to ask an uncensored model.
  await win.evaluate(() => { const c = chatById(S.route.id); c.messages.push({ id: 'ru', role: 'user', text: 'Write a gritty crime scene', attachments: [] }, { id: 'ra', role: 'assistant', altIndex: 0, alts: [{ text: "I'm sorry, but I can't help with that.", target: 'local:qwen3-8b' }] }); render(); });
  await win.waitForSelector('.refusal-hint [data-act="uncensored"]');
  await win.evaluate((id) => go({ view: 'chat', id }), backTo);
  console.log('✓ suggestions while typing: web, uncensored, attach, connect an app; dismiss; refused answers offer an uncensored model');

  // Free accuracy checks and speed tricks.
  const backTo2 = await win.evaluate(() => S.route.id);
  const facts = await win.evaluate(() => [exactFacts('What is 17 × 23?'), exactFacts('What is 18% of 90?'), exactFacts('Run 5 km at 20°C'), exactFacts('How many days until Christmas?'), exactFacts('Book 3-4 nights on 7/11/2025')]);
  assert.ok(facts[0].includes('17 × 23 = 391'), JSON.stringify(facts[0]));
  assert.ok(facts[1].some((f) => /= 16\.2$/.test(f)), JSON.stringify(facts[1]));
  assert.ok(facts[2].some((f) => /5 km = 3\.11 miles/.test(f)) && facts[2].some((f) => /20 °C = 68 °F/.test(f)), JSON.stringify(facts[2]));
  assert.ok(facts[3].some((f) => /is \d+ days$/.test(f)), JSON.stringify(facts[3]));
  assert.equal(facts[4].length, 0, 'ranges and dates are not sums');
  const audits = await win.evaluate(() => [mathAudit('So 17 × 23 = 381, and 2 + 2 = 4.'), mathAudit('£2.40 × 120 = £288 and 10 / 3 = 3.33'), mathAudit('```\n1 + 1 = 3\n```')]);
  assert.equal(audits[0].length, 1, JSON.stringify(audits[0])); assert.match(audits[0][0], /391/);
  assert.equal(audits[1].length, 0, JSON.stringify(audits[1]));
  assert.equal(audits[2].length, 0, 'code is left alone');
  assert.equal((await win.evaluate(() => qs.call('code:check', [{ lang: 'js', code: 'function add(a, b {' }, { lang: 'js', code: 'const x = 1;' }, { lang: 'json', code: '{"a": 1,}' }]))).length, 2);
  assert.ok((await win.evaluate(() => qs.call('page:check', '<!doctype html><html><body><button onclick="nope()">Go</button><script>missingFn();</script></body></html>'))).length >= 1, 'page errors are caught');
  assert.equal((await win.evaluate(() => qs.call('page:check', '<!doctype html><html><body><p>Fine</p><script>document.title = "ok";</script></body></html>'))).length, 0);
  const askNew = async (q) => { await win.click('[data-nav="newchat"]'); await win.fill('#input', q); await win.keyboard.press('Enter'); await win.waitForSelector('.msg.assistant'); await idle(); };
  // A wrong sum and broken code are corrected by themselves.
  await askNew('MATHBAD multiply seventeen by twenty-three');
  await win.waitForFunction(() => /391/.test([...document.querySelectorAll('.msg.assistant .bubble')].pop()?.textContent || ''), null, { timeout: 60000 });
  assert.ok(await win.locator('.msg.assistant .badge:has-text("Corrected")').count());
  await askNew('JSBAD write an add function');
  await win.waitForFunction(() => /function add\(a, b\)/.test([...document.querySelectorAll('.msg.assistant .bubble')].pop()?.textContent || ''), null, { timeout: 60000 });
  // The app works out the numbers in the question and hands them to the model.
  await askNew('What is 17 × 23 exactly?');
  assert.match(await win.locator('.msg.assistant .bubble').last().innerText(), /\[facts: 17 × 23 = 391\]/);
  // Double-check only runs when turned on: with it off, an unsure number is NOT auto double-checked.
  await win.click('[data-nav="newchat"]');
  await win.evaluate(() => { const c = chatById(S.route.id); c.factCheck = false; S.data.prefs.checkUnsure = false; save(); render(); });
  await win.fill('#input', 'UNSURE what is six times seven, 6 or 7 digits');
  await win.keyboard.press('Enter');
  await win.waitForSelector('.msg.assistant');
  await idle();
  assert.equal(await win.evaluate(() => { const a = chatById(S.route.id).messages.at(-1).alts.at(-1); return Boolean(a.unsure || a.check); }), false, 'no automatic double-check when the feature is off');
  // Opt in (Settings → Features) and it does double-check an unsure number.
  await win.click('[data-nav="newchat"]');
  await win.evaluate(() => { const c = chatById(S.route.id); c.factCheck = false; S.data.prefs.checkUnsure = true; save(); render(); });
  await win.fill('#input', 'UNSURE what is six times seven, 6 or 7 digits');
  await win.keyboard.press('Enter');
  await win.waitForSelector('.msg.assistant');
  await idle();
  await win.waitForFunction(() => { const c = chatById(S.route.id); const a = c.messages.at(-1).alts.at(-1); return a.unsure === true && a.check; }, null, { timeout: 60000 });
  await win.waitForFunction(() => !document.querySelector('.fact-chip.k-run'), null, { timeout: 60000 });
  await win.evaluate(() => { S.data.prefs.checkUnsure = false; save(); });
  // 👍 makes the same question instant next time.
  await askNew('Explain what a haiku is in one line');
  await win.locator('[data-act="up"]').last().click();
  await askNew('Explain what a haiku is in one line');
  assert.ok(await win.locator('.msg.assistant .badge:has-text("Instant")').count(), 'answered instantly from the rated answer');
  // Reading ahead: typing in a chat with history makes the model read it in advance. This only
  // happens on a PC with a graphics card (the CI runner has none), so give the estimate a GPU.
  await win.evaluate(() => { S.data.prefs.readAhead = true; S.testGpu = true; });
  await win.waitForFunction(() => !pending, null, { timeout: 60000 }); // the last answer is fully done
  const sentBefore = await win.evaluate(() => prefillsSent);
  await win.fill('#input', 'And a limerick?');
  // A slow test machine can still be finishing background work: type again once if needed.
  try { await win.waitForFunction((n) => prefillsSent > n, sentBefore, { timeout: 15000 }); } catch {
    console.log('  read-ahead retry:', JSON.stringify(await win.evaluate(() => ({ pending: Boolean(pending), gpu: hasGpu(), readAhead: S.data.prefs.readAhead, input: $('#input')?.value, focused: document.activeElement?.id, sent: prefillsSent }))));
    await win.fill('#input', 'And a limerick, please?');
    await win.waitForFunction((n) => prefillsSent > n, sentBefore, { timeout: 30000 });
  }
  await win.fill('#input', '');
  await win.evaluate(() => { S.data.prefs.readAhead = false; S.testGpu = false; });
  // Everything available is used: learning from every signal, connected apps, the cloud option.
  assert.ok(await win.evaluate(() => {
    learnSignal('coding', 'local:phi-4', 'up', 3);
    const up = learnBonus('coding', 'local:phi-4') > 0;
    hintConnectors = [{ id: 'github', name: 'GitHub', enabled: true, hasToken: true }];
    const tools = autoTools({}, {}, 'List my open pull requests on GitHub') && !autoTools({ tools: false }, {}, 'List my GitHub pull requests') && !autoTools({}, {}, 'Write a poem');
    S.targets.push({ target: 'api:test:cloud-model', label: 'Test Cloud' });
    S.data.prefs.cloudHard = true;
    const cloud = autoPick({}, assistantById('as-general'), 'Prove that the square root of 2 is irrational, step by step', false).target === 'api:test:cloud-model';
    S.data.prefs.cloudHard = false;
    S.targets = S.targets.filter((t) => t.target !== 'api:test:cloud-model');
    hintConnectors = null;
    return up && tools && cloud;
  }), 'signals, connected apps and the cloud option are used');
  // The most likely next question is answered while you read; clicking it shows it at once.
  await win.click('[data-nav="newchat"]');
  await win.evaluate(() => { const c = chatById(S.route.id); c.library = false; c.web = false; c.tools = false; S.data.prefs.preanswer = true; S.testGpu = true; save(); render(); }); // pre-answering needs a graphics card; CI has none
  await win.fill('#input', 'Tell me about sourdough starters');
  await win.keyboard.press('Enter');
  await win.waitForSelector('.msg.assistant');
  await idle();
  await win.waitForFunction(() => chatById(S.route.id).messages.at(-1).alts.at(-1).pre?.done, null, { timeout: 60000 });
  await win.click('.followups .fu >> nth=0');
  await win.waitForSelector('.msg.assistant .badge:has-text("Ready before you asked")', { timeout: 10000 });
  await win.evaluate(() => { S.data.prefs.preanswer = false; S.testGpu = false; save(); });
  await idle();
  // Exam coaches: a CPA course in the chat with interactive practice questions and progress.
  await win.click('[data-nav="newchat"]');
  await win.selectOption('#pick-assistant', 'as-cpa');
  await win.waitForSelector('.study-sec:has-text("FAR")');
  await win.evaluate(() => { const c = chatById(S.route.id); c.factCheck = false; save(); });
  await win.click('.study-sec:has-text("FAR")');
  await win.waitForSelector('.quiz .qz-c', { timeout: 60000 });
  await idle();
  assert.equal(await win.locator('.quiz .qz').count(), 1, 'one question at a time');
  await win.click('.quiz .qz[data-i="0"] .qz-c[data-k="0"]');
  await win.waitForSelector('.quiz .qz[data-i="0"] .qz-why.bad');
  await win.click('.quiz .qz[data-i="1"] .qz-c[data-k="2"]');
  await win.waitForSelector('.quiz-end:has-text("1 of 2 correct")');
  const study = await win.evaluate(() => S.data.study);
  assert.equal(study['CPA|FAR|Lease classification']?.wrong, 1); assert.equal(study['CPA|FAR|Lease measurement']?.right, 1);
  assert.match(await win.evaluate(() => studyContext(assistantById('as-cpa'))), /FAR 1\/2/);
  await shot(win, '21-cpa-coach');
  console.log('✓ exam coaches: CPA/CIA outlines, interactive practice questions, results tracked and used');
  // Connect a cloud AI from the message box: inline chip (full view) and the ＋ options (simple).
  await win.evaluate((id) => { S.data.prefs.simple = false; applySimple?.(); go({ view: 'chat', id }); }, backTo2);
  await win.click('#opts-btn');
  // The ＋ menu now holds attach-a-file and skills (the separate skill icon is gone); the bar keeps a hidden file input.
  await win.waitForSelector('.opts-menu [data-o="file-in"]');
  await win.waitForSelector('.opts-menu [data-o="skill-pop"]');
  assert.equal(await win.locator('#skill-btn').count(), 0, 'no standalone skill icon');
  assert.equal(await win.locator('#file-in').count(), 1, 'the file input is still there for attachments');
  await win.click('.opts-menu [data-o="add-api"]');
  await win.waitForFunction(() => S.route.view === 'models' && modelsTab === 'api', null, { timeout: 10000 });
  await win.evaluate((id) => { go({ view: 'chat', id }); }, backTo2);
  assert.equal(await win.locator('#add-api-chip').count(), 0, 'the message bar stays tidy: Cloud AI is in the ＋ menu');
  await win.evaluate(() => { S.data.prefs.simple = false; applySimple?.(); });
  console.log('✓ connect a cloud AI from the message box (＋ menu)');
  // With no model installed, chatting offers to add one or a team (keeps the typed message).
  await win.evaluate((id) => go({ view: 'chat', id }), backTo2);
  await win.evaluate(() => needModel(chatById(S.route.id)));
  await win.waitForSelector('.need-model [data-nm="setup"]');
  for (const nm of ['setup', 'teams', 'browse', 'api']) assert.ok(await win.locator(`.need-model [data-nm="${nm}"]`).count(), `chooser has ${nm}`);
  await win.click('.need-model [data-nm="browse"]');
  await win.waitForFunction(() => S.route.view === 'models' && modelsTab === 'text', null, { timeout: 10000 });
  console.log('✓ no model: chatting opens a chooser to add a model, team, found models or a cloud AI');
  await win.evaluate((id) => go({ view: 'chat', id }), backTo2);

  // Parental lock: a PIN gates uncensored AI, nothing else.
  await win.evaluate(() => { S.stacks.push({ id: 'unf-test', name: 'Unfiltered', members: { drafters: ['local:qwen3-8b'] } }); S.targets.push({ target: 'stack:unf-test', label: 'Unfiltered' }); });
  assert.ok(await win.evaluate(() => isUncensoredTarget('stack:unf-test')), 'the Unfiltered team is detected');
  assert.ok(!(await win.evaluate(() => isUncensoredTarget('local:qwen3-8b'))), 'a normal model is not');
  await win.evaluate(() => setLockPin('2468'));
  await win.evaluate(() => relock());
  assert.ok(await win.evaluate(() => uncensoredBlocked('stack:unf-test')), 'uncensored is blocked while locked');
  assert.ok(!(await win.evaluate(() => uncensoredBlocked('local:qwen3-8b'))), 'normal models are never blocked');
  // Wrong PIN keeps it locked; the right PIN unlocks for the session.
  const unlockP = win.evaluate(() => askUnlock());
  await win.waitForSelector('#unlock-pin');
  await win.fill('#unlock-pin', '0000'); await win.click('#unlock-go');
  await win.waitForSelector('#unlock-err:has-text("Wrong PIN")');
  await win.fill('#unlock-pin', '2468'); await win.click('#unlock-go');
  assert.equal(await unlockP, true, 'the right PIN unlocks');
  assert.ok(!(await win.evaluate(() => uncensoredBlocked('stack:unf-test'))), 'unlocked for the session');
  // Settings shows the lock as on, with a way to turn it off.
  await win.evaluate(() => go({ view: 'settings' }));
  await win.waitForSelector('#pl-box:has-text("On.")');
  await win.evaluate(() => { clearLockPin(); S.stacks = S.stacks.filter((x) => x.id !== 'unf-test'); S.targets = S.targets.filter((t) => t.target !== 'stack:unf-test'); });
  console.log('✓ parental lock: PIN gates uncensored models/teams only, wrong PIN blocks, right PIN unlocks for the session');
  await win.evaluate((id) => go({ view: 'chat', id }), backTo2);
  console.log('✓ leverage: signals teach Automatic, connected apps used, cloud for hard questions (opt-in), next question answered in advance');
  console.log('✓ free checks: exact facts first, maths audit + code/page checks fix answers, unsure numbers double-checked, instant repeats, reading ahead');
  // The status light at the top right shows how the model is running.
  await win.waitForSelector('#run-state:not([hidden]) .rs-dot', { timeout: 10000 });
  await win.click('#run-state');
  await win.waitForSelector('#run-panel:has-text("In use")');
  await win.click('#run-close');
  console.log('✓ status light: state of the model in use, with details');
  // Dropdowns are drawn by Quicksilver (readable in both themes): click, see the choices, pick one.
  await win.click('#pick-effort');
  await win.waitForSelector('.sel-pop .sel-item.sel:has-text("Fast")');
  assert.equal(await win.locator('.sel-pop .sel-item').count(), 4, 'Fast, Balanced, Smart, Deep');
  const look = await win.evaluate(() => { const p = getComputedStyle(document.querySelector('.sel-pop')); const i = getComputedStyle(document.querySelector('.sel-pop .sel-item')); return { bg: p.backgroundColor, fg: i.color }; });
  assert.notEqual(look.bg, look.fg, 'text and background differ');
  await shot(win, '09b-dropdown');
  await win.click('.sel-pop .sel-item:has-text("Smart")');
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
  // GIF maker: the video model animates it, then it's saved as a looping GIF.
  await win.click('[data-nav="newchat"]');
  await win.fill('#input', '/gif');
  await win.waitForSelector('#skill-pop .skill-opt.hot:has-text("Make a GIF")');
  await win.keyboard.press('Enter');
  await win.fill('#input', 'A cat giving a thumbs up');
  await win.keyboard.press('Enter');
  await win.waitForFunction(() => { const it = [...document.querySelectorAll('.msg.assistant')].pop()?.querySelector('.skill-media-item img'); return it && /qsmedia:/.test(it.src); }, null, { timeout: 120000 });
  assert.ok(await win.evaluate(() => { const c = chatById(S.route.id); const alt = c.messages.at(-1).alts.at(-1); return alt.media.items.every((x) => x.gif && x.kind === 'image') && S.gallery?.some?.((g) => /\.gif$/i.test(g.file || '')) !== false; }), 'the clip became a GIF');
  await shot(win, '10c-gif-maker');
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
  console.log('✓ skills: 9 areas, picture from chat, GIF maker, photo tool on an attachment, apps');

  // Integrations: add a real MCP server, then a chat uses its tools with an approval prompt.
  await win.click('[data-nav="integrations"]');
  await win.waitForSelector('text=Connectors');
  // Google (one sign-in for every service), Microsoft and the other popular apps, grouped.
  for (const g of ['Google', 'Microsoft', 'Files & storage', 'Sales & support', 'Commerce & payments', 'Music & media']) assert.ok(await win.locator(`.int-group:has-text("${g}")`).count() === 1, `${g} group`);
  await win.click('[data-int-edit="google"]');
  await win.waitForSelector('#int-save:has-text("Sign in with Google")');
  await shot(win, '11b-google-signin');
  await win.click('.modal [data-close]');
  assert.ok(await win.evaluate(() => skillById('music-finder')?.tools?.apps), 'the Spotify music finder skill');
  // The product finder (vision + web) and vibe-hack skills.
  assert.ok(await win.evaluate(() => { const s = skillById('find-product'); return s && s.category === 'vision' && s.tools?.web; }), 'find a product by photo, across the web');
  assert.ok(await win.evaluate(() => { const s = skillById('vibe-hack'); return s && s.output === 'app'; }), 'vibe hack builds an app');
  // Send to cloud: with nothing connected it points to Connectors.
  await win.evaluate(() => cloudSendModal({ mediaId: 'x' }));
  await win.waitForSelector('#cloud-connect');
  await win.click('.modal [data-close]');
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
  await win.click('#opts-btn');
  await win.click('.opts-menu [data-o="tog-tools"]');
  await win.waitForFunction(() => chatById(S.route.id)?.tools === true);
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

  // Low on memory: the error offers the next best model, which answers again.
  await win.evaluate(() => {
    newChat();
    const c = chatById(S.route.id);
    c.messages.push({ id: 'u-lm', t: Date.now(), role: 'user', text: 'Summarise the water cycle' });
    c.messages.push({ id: 'a-lm', t: Date.now(), role: 'assistant', altIndex: 0, alts: [{ text: '', target: 'local:phi-4', error: 'Not enough memory to load this model. Try a smaller model, close other apps, or lower the context size.' }] });
    save(); render();
  });
  const lmBtn = win.locator('[data-lowmem="a-lm"]:not([data-keep])');
  await lmBtn.waitFor();
  assert.match(await lmBtn.innerText(), /next best model: (Qwen3 8B|Gemma 3 4B)/);
  await lmBtn.click();
  await win.waitForFunction(() => { const m = chatById(S.route.id).messages.find((x) => x.id === 'a-lm'); return m.alts.length === 2 && /Answer from/.test(m.alts[1].text) && !pending; }, null, { timeout: 60000 });
  assert.notEqual(await win.evaluate(() => chatById(S.route.id).messages.find((x) => x.id === 'a-lm').alts[1].target), 'local:phi-4');
  console.log('✓ low memory: next best model offered and used');

  // Stop a running model: from the Models page (and the status panel), freeing its memory.
  await win.click('[data-nav="models"]');
  await win.click('[data-tab="installed"]');
  await win.evaluate(async () => { await refreshModels(); render(); });
  const runBadge = win.locator('.badge:has-text("● Running")').first();
  await runBadge.waitFor({ timeout: 15000 });
  const runningBefore = await win.evaluate(() => S.running.filter((x) => x.ready).length);
  await win.locator('[data-stop-model]').first().click();
  await win.waitForFunction((n) => S.running.filter((x) => x.ready).length < n, runningBefore, { timeout: 15000 });
  await win.waitForSelector('#toast:has-text("stopped and the memory freed")');
  console.log('✓ stop a running model: memory freed, loads again when needed');

  // Privacy modes, shown as a picture: fully private, private online through Proton VPN, online.
  await win.click('[data-nav="settings"]');
  await win.click('[data-set-tab="general"]');
  await win.waitForSelector('#vpn-box .pv-mode[data-pv-mode="online"].on');
  assert.equal(await win.locator('#vpn-box .pv-mode').count(), 3);
  await win.click('#vpn-box [data-pv-mode="vpn"]');
  await win.waitForSelector('#vpn-box [data-pv-mode="vpn"].on');
  await win.waitForSelector('#vpn-box .pv-link.cut:has-text("waiting for VPN")');
  await win.waitForSelector('#vpn-box .pv-plan:has-text("Proton VPN Free")');
  await win.waitForSelector('#vpn-box .pv-plan:has-text("Your Proton account")');
  assert.match(await win.locator('#net-toggle').innerText(), /VPN off/);
  await win.locator('#vpn-box').scrollIntoViewIfNeeded();
  await shot(win, '15-privacy-vpn');
  const vpnLabel = await win.evaluate(() => sessionPrivacy('local:qwen3-8b').label);
  assert.match(vpnLabel, /Private session · VPN paused/);
  await win.click('#vpn-box [data-pv-mode="offline"]');
  await win.waitForSelector('#vpn-box .pv-link.cut:has-text("nothing leaves")');
  assert.equal(await win.evaluate(() => sessionPrivacy('local:qwen3-8b').label), 'Private session');
  await win.evaluate(() => { S.vpn = { connected: true, proton: true }; S.config.offline = false; S.config.vpnOnly = true; });
  assert.equal(await win.evaluate(() => sessionPrivacy('local:qwen3-8b').label), 'Protected session');
  await win.evaluate(() => { S.config.offline = true; S.config.vpnOnly = false; S.vpn = null; });
  assert.match(await win.locator('#net-toggle').innerText(), /Offline/);
  await win.click('#vpn-box [data-pv-mode="online"]');
  await win.waitForSelector('#vpn-box [data-pv-mode="online"].on');
  assert.match(await win.locator('#net-toggle').innerText(), /Online/);
  // Online without a VPN: the top of the page says it's not private.
  await win.click('.nav-new');
  await win.waitForSelector('#privacy-bar:has-text("not private")');
  assert.match(await win.locator('#net-toggle').innerText(), /not private/);
  await shot(win, '18b-not-private-bar');
  await win.click('#privacy-bar [data-pb="x"]');
  await win.waitForSelector('#privacy-bar', { state: 'detached' });
  await win.waitForSelector('#sess-badge:has-text("Runs on this PC")');
  assert.equal(await win.getAttribute('#input', 'spellcheck'), 'true', 'spell check in the message box');
  await win.waitForSelector('#improve-btn:has-text("Fix my prompt")');
  // Short or long answers.
  await win.selectOption('#pick-length', 'short');
  assert.equal(await win.evaluate(() => lengthOf(chatById(S.route.id))), 'short');
  assert.match(await win.evaluate(() => turnContext(chatById(S.route.id), [], false, 'hi', null, '', '')), /Answer length: SHORT/);
  await win.selectOption('#pick-length', 'long');
  assert.match(await win.evaluate(() => turnContext(chatById(S.route.id), [], false, 'hi', null, '', '')), /Answer length: LONG/);
  await win.selectOption('#pick-length', 'auto');
  // Writes like a person: chatbot openers, sign-offs and em dashes are tidied; code is left alone.
  const hum = await win.evaluate(() => [humanize('Certainly! Paris is the capital — and the largest city.\n\n```js\nconst a = 1; // x — y\n```\n\nI hope this helps! Let me know if you have any other questions.'), systemPrompt(assistantById('as-general'), false, chatById(S.route.id))]);
  assert.equal(hum[0], 'Paris is the capital, and the largest city.\n\n```js\nconst a = 1; // x — y\n```');
  assert.match(hum[1], /knowledgeable friend talking/); assert.match(hum[1], /No em dashes/);
  console.log('✓ human writing: conversational style asked for, chatbot leftovers tidied, code untouched');
  // No bounce: redrawing the chat you're on plays no entrance animation and keeps your place.
  const still = await win.evaluate(() => { const box = document.getElementById('messages'); render(); return { enter: Boolean(document.querySelector('#main > .enter')), same: render.key === `chat:${S.route.id}` }; });
  assert.equal(still.enter, false, 'no entrance animation when the same chat redraws'); assert.ok(still.same);
  // Streaming morphs in place: the paragraph on screen is the same element after more text arrives.
  const kept = await win.evaluate(() => {
    const host = document.createElement('div'); host.innerHTML = '<div class="bubble"><p>Hello there</p></div>';
    const fresh = document.createElement('div'); fresh.innerHTML = '<div class="bubble"><p>Hello there, friend</p><p>More</p></div>';
    const p0 = host.querySelector('p'); morphNode(host.firstElementChild, fresh.firstElementChild);
    return host.querySelector('p') === p0 && host.textContent === 'Hello there, friendMore';
  });
  assert.ok(kept, 'text already on screen stays put while more streams in');

  // Share an answer or the whole chat.
  await win.evaluate(() => {
    const c = chatById(S.route.id);
    c.title = 'Share test';
    c.messages.push({ id: 'u-sh', t: Date.now(), role: 'user', text: 'What is the boiling point of water?' });
    c.messages.push({ id: 'a-sh', t: Date.now(), role: 'assistant', altIndex: 0, alts: [{ text: '**100 °C** at sea level.', target: 'local:qwen3-8b' }] });
    save(); render();
  });
  await win.click('[data-act="share"][data-id="a-sh"]');
  await win.waitForSelector('#modal .share-opt[data-sh="email"]');
  assert.equal(await win.locator('#modal .share-opt').count(), 6);
  await win.click('#modal [data-sh="text"]');
  await win.waitForSelector('#toast:has-text("Copied")');
  await win.click('#chat-more');
  await win.click('.menu [data-m="share"]');
  await win.waitForSelector('#modal h2:has-text("Share this chat")');
  assert.match(await win.evaluate(() => chatMarkdown(chatById(S.route.id))), /# Share test[\s\S]*boiling point[\s\S]*100 °C/);
  assert.equal(await win.evaluate(() => plainText('**100 °C** at sea level.')), '100 °C at sea level.');
  await win.click('#modal [data-close]');
  console.log('✓ share: an answer or the whole chat (copy, email, PDF, Word, Markdown)');

  // The 3-AI Council is an Effort option; the answer says whether the three agreed.
  await win.selectOption('#pick-effort', 'council');
  await win.fill('#input', 'Should I rent or buy a house?');
  await win.keyboard.press('Enter');
  await win.waitForSelector('.council-badge:has-text("Council: agreed")', { timeout: 90000 });
  await idle();
  assert.match(await win.evaluate(() => { const m = chatById(S.route.id).messages.at(-1); return m.alts[m.altIndex].text; }), /^Council answer from/);
  await shot(win, '17-council');
  await win.selectOption('#pick-effort', 'thorough');
  console.log('✓ 3-AI Council: an Effort option, three views, one verdict that says whether they agreed');
  // Every option explained in one place: Settings → Options guide, linked from the message box.
  await win.click('[data-open-guide]');
  await win.waitForSelector('.og-sec h3:has-text("Effort")');
  assert.ok(await win.locator('.og-row dt:has-text("Council")').count() === 1 && await win.locator('.og-sec').count() >= 6);
  await shot(win, '17b-options-guide');
  // Guide & tips: more tabs on the same page (no new menu items).
  assert.strictEqual(await win.locator('[data-guide-tab]').count(), 4);
  await win.click('[data-guide-tab="stacks"]');
  await win.waitForSelector('.og-row dt:has-text("What a stack is")');
  await shot(win, '17c-guide-stacks');
  await win.click('[data-guide-tab="apis"]');
  await win.waitForSelector('.api-row b:has-text("Cerebras")');
  assert.ok(await win.locator('.api-row').count() >= 12);
  assert.ok(await win.locator('#guide-connect').count() === 1);
  assert.ok(await win.locator('.og-sec h3:has-text("When a cloud AI is worth it")').count() === 1 && await win.locator('.xp-where').count() >= 8);
  // The calculator: a cloud AI alone vs through Quicksilver, and what a dev plan means.
  await win.waitForSelector('#cloud-calc #cc-out .cc-sum');
  const calcBefore = await win.locator('#cc-out').innerText();
  await win.locator('#cc-hard').fill('20');
  await win.waitForFunction(() => /80% fewer/.test(document.querySelector('#cc-out').innerText));
  assert.notEqual(calcBefore, await win.locator('#cc-out').innerText(), 'the calculator updates as you move the sliders');
  await win.selectOption('#cc-mode', 'fusion');
  await win.waitForFunction(() => /As a lead/.test(document.querySelector('#cc-out').innerText));
  await win.selectOption('#cc-mode', 'hard');
  await win.selectOption('#cc-svc', 'gemini-argon');
  await win.waitForFunction(() => document.querySelector('#cc-pin').value === '4');
  await win.click('[data-cc-kind="image"]');
  await win.selectOption('#cc-isvc', 'ideogram');
  await win.waitForFunction(() => /Ideogram 4\.5 alone/.test(document.querySelector('#cc-out').innerText) && /\/10/.test(document.querySelector('#cc-out').innerText));
  await win.click('[data-cc-kind="video"]');
  await win.selectOption('#cc-vsvc', 'kling');
  await win.waitForFunction(() => /Kling 3\.0 alone/.test(document.querySelector('#cc-out').innerText));
  // The price list: every service for this kind, rated on a 10-star scale, best first; Compare picks one.
  await win.click('#cc-list summary');
  await win.waitForSelector('#cc-list .cc-p .ten-stars');
  assert.ok(await win.locator('#cc-list .cc-p').count() >= 5);
  assert.match(await win.locator('#cc-list').innerText(), /10\/10/);
  await win.locator('#cc-list [data-cc-pick]').first().click();
  await win.waitForSelector('#cc-out .ten-stars');
  await win.locator('#cloud-calc').scrollIntoViewIfNeeded();
  await shot(win, '17d3-price-list');
  // API rankings: best use, free credits and cost, sortable and filtered by use.
  await win.waitForSelector('#api-rank .ar-r');
  assert.match(await win.locator('#api-rank .ar-r').first().innerText(), /Google Gemini/);
  await win.click('[data-rank-sort="free"]');
  assert.match(await win.locator('#api-rank .ar-r').first().innerText(), /Pollinations/);
  await win.click('[data-rank-use="music"]');
  assert.match(await win.locator('#api-rank').innerText(), /fal\.ai[\s\S]*Suno|Suno[\s\S]*fal\.ai/);
  assert.equal(await win.locator('#api-rank .ar-r:has-text("Groq")').count(), 0);
  await win.click('[data-rank-use="all"]');
  await win.click('[data-rank-sort="value"]');
  await win.locator('#api-rank').scrollIntoViewIfNeeded();
  await shot(win, '17d0-api-rankings');
  // Free vs paid: every job, what's possible at no cost and what paying adds, rated out of 10.
  await win.waitForSelector('#free-paid .fp-r');
  assert.ok(await win.locator('#free-paid .fp-r').count() >= 10);
  assert.match(await win.locator('#free-paid').innerText(), /Free[\s\S]*Paid[\s\S]*Music \(full songs\)[\s\S]*Paying adds/);
  await win.locator("#free-paid").scrollIntoViewIfNeeded();
  await shot(win, "17d1-free-vs-paid");
  // Music in the calculator and its rated price list.
  await win.click('[data-cc-kind="music"]');
  await win.waitForFunction(() => /MiniMax Music 2\.6 alone/.test(document.querySelector('#cc-out').innerText));
  assert.match(await win.locator('#cc-list').innerText(), /ElevenLabs Music[\s\S]*Built-in synth/);
  await win.click('[data-cc-kind="chat"]');
  assert.ok(await win.locator('.og-sec h3:has-text("Developer (dev) plans")').count() === 1);
  await win.locator('#cloud-calc').scrollIntoViewIfNeeded();
  await shot(win, '17d2-cloud-calculator');
  await shot(win, '17d-guide-apis');
  await win.click('[data-guide-tab="tips"]');
  assert.ok(await win.locator('.tip-item').count() >= 12);
  await shot(win, '17e-guide-tips');
  // The Stacks page links straight to its tab.
  await win.evaluate(() => go({ view: 'stacks' }));
  await win.click('#main [data-guide="stacks"]');
  await win.waitForSelector('[data-guide-tab="stacks"].active');
  await win.click('.nav-new');
  console.log('✓ options guide: every option explained in Settings, linked from the message box');

  // Your knowledge stands out on Home; the top uncensored stack leads the ready-made stacks.
  await win.click('[data-nav="home"]');
  await win.waitForSelector('#kn-hero [data-kn="files"]');
  assert.match(await win.locator('#kn-hero h2').innerText(), /knowledge/i);
  assert.match(await win.locator('.sidebar [data-nav="library"]').innerText(), /Your knowledge/);
  assert.ok(await win.evaluate(() => { const r = STACK_RECIPES[0]; return r.id === 'uncensored-top' && r.top && RX_GROUPS[0][0] === 'new' && RX_GROUPS[1][0] === 'uncensored'; }), 'the top uncensored stack comes first');
  await win.click('.nav-new');
  console.log('✓ your knowledge: front and centre on Home and in the menu; top uncensored stack first in the ready-made stacks');
  // New stacks published online appear marked new, say why they're good, and are suggested.
  const fresh = await win.evaluate(async () => {
    S.catalog.picks.recipes = [{ id: 'web-test-new', name: 'Fact-checked explainer', icon: '🧪', group: 'new', mode: 'redteam', parts: [{ model: 'qwen3-8b', role: 'Explainer' }, { model: 'gemma-3-4b', role: 'Checker' }], why: 'Explains clearly, then a second model hunts for mistakes.', added: new Date().toISOString().slice(0, 10) }];
    mergeRemoteRecipes();
    go({ view: 'stacks' });
    await new Promise((r) => setTimeout(r, 300));
    const card = [...document.querySelectorAll('.rx-card')].find((c) => /Fact-checked explainer/.test(c.textContent));
    const whys = document.querySelectorAll('.rx-card .rx-why').length;
    const cards = document.querySelectorAll('.rx-card').length;
    const sugg = stackUpdates().find((u) => u.fresh && u.recipe === 'web-test-new');
    return { badge: /🆕 New/.test(card?.textContent || ''), why: /hunts for mistakes/.test(card?.querySelector('.rx-why')?.textContent || ''), whys, cards, sugg: Boolean(sugg) };
  });
  assert.ok(fresh.badge && fresh.why, 'a new online stack shows as new, with why it is good');
  assert.equal(fresh.whys, fresh.cards, 'every stack says why it is good');
  assert.ok(fresh.sugg, 'and it is suggested when it runs well on this PC');
  await win.evaluate(() => { STACK_RECIPES.splice(STACK_RECIPES.findIndex((r) => r.id === 'web-test-new'), 1); S.catalog.picks.recipes = []; });
  await win.click('.nav-new');
  console.log('✓ new stacks from online picks: marked new, why each stack is good, suggested when they suit this PC');
  assert.doesNotMatch(await win.evaluate(() => turnContext(chatById(S.route.id), [], false, 'hi', null, '', '')), /Answer length/);
  await shot(win, '16-session-badge');
  console.log('✓ privacy modes: fully private, private online (Proton VPN free or your account), online; chats say Private / Protected session');

  // Deleting a chat: the bin icon in the sidebar deletes it at once, with Undo.
  await win.evaluate(() => { const t = Date.now(); S.data.chats.push({ id: 'del-me', assistantId: 'as-general', title: 'Delete me please', created: t, updated: t + 1e6, target: '', messages: [{ id: 'dm1', role: 'user', text: 'hi', attachments: [] }] }); save(); renderChatList(); });
  await win.hover('.chat-row:has-text("Delete me please")');
  await win.click('.chat-row:has-text("Delete me please") .chat-del');
  await win.waitForFunction(() => !chatById('del-me'));
  assert.equal(await win.locator('.chat-row:has-text("Delete me please")').count(), 0, 'gone from the list');
  await win.click('#toast .toast-act');
  await win.waitForFunction(() => Boolean(chatById('del-me')));
  await win.waitForSelector('.chat-row:has-text("Delete me please")');
  // ...and from the ⋯ menu.
  await win.hover('.chat-row:has-text("Delete me please")');
  await win.click('.chat-row:has-text("Delete me please") .chat-more');
  await win.click('.menu [data-m="delete"]');
  await win.waitForFunction(() => !chatById('del-me'));
  console.log('✓ delete a chat: bin icon or ⋯ menu, with Undo');

  // At start-up: "What should I call you?" (once), then a greeting by name; changeable in Settings.
  await win.evaluate(() => { S.data.prefs.userName = ''; S.data.prefs.askedName = false; save(); newChat('as-general'); });
  await win.waitForSelector('#name-ask-in');
  await win.fill('#name-ask-in', 'Sam');
  await win.click('#name-ask-ok');
  // The short first-run tour follows: three screens, the last one picks privacy.
  await win.waitForSelector('#modal .tour h2:has-text("Liquid Edition")');
  await win.click('#tour-next');
  await win.waitForSelector('#modal .tour h2:has-text("Connect your knowledge")');
  await win.click('#tour-next');
  await win.waitForSelector('#modal [data-tour-priv="offline"]');
  await shot(win, '20b-tour');
  await win.click('#tour-next');
  await win.waitForSelector('#modal', { state: 'hidden' });
  assert.ok(await win.evaluate(() => S.data.prefs.tourDone), 'the tour shows once');
  // Diagnostics for problem reports: specs, models, engines and recent errors, never chats.
  const diag = await win.evaluate(() => qs.call('diag:text'));
  assert.match(diag, /## This PC[\s\S]*## Models[\s\S]*## Recent errors/);
  assert.doesNotMatch(diag, /Sam/, 'no personal details');
  await win.waitForSelector('.welcome .hello:has-text("Hi Sam")');
  assert.equal(await win.evaluate(() => S.data.prefs.userName), 'Sam');
  assert.equal(await win.locator('#name-ask').count(), 0, 'asked only once');
  await win.evaluate(() => { S.data.prefs.userName = ''; save(); });
  console.log('✓ name: asked at start-up, greeted by name, changeable in Settings');

  // Tips from the built-in model: a fitting tip under a starter answer, and a way to turn them off.
  await win.evaluate(() => {
    S.data.prefs.tips = true; S.data.prefs.tipCount = 1; S.data.prefs.lastTip = '';
    const t = Date.now();
    const c = { id: 'tip-chat', assistantId: 'as-general', title: 'Tip test', created: t, updated: t, target: '', messages: [
      { id: 'tq', t, role: 'user', text: 'Fix this javascript function bug', attachments: [] },
      { id: 'ta', t, role: 'assistant', altIndex: 0, alts: [{ text: 'Here is the fix.', target: 'stack:quicksilver', ms: 5000 }] }] };
    S.data.chats.push(c); maybeTip(c, c.messages[1], c.messages[1].alts[0]); save(); go({ view: 'chat', id: 'tip-chat' });
  });
  await win.waitForSelector('.tip-card:has-text("coding stack")');
  await win.click('.tip-card [data-tip-off]');
  await win.waitForFunction(() => S.data.prefs.tips === false && !document.querySelector('.tip-card'));
  await win.evaluate(() => { S.data.prefs.tips = true; save(); });
  console.log('✓ tips: built-in model suggests a fitting way to get more out of Quicksilver; can be turned off');

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
  // The built-in model and what it can do; featured picks; better models swap in when installed.
  await win.waitForSelector('#builtin-model:has-text("Built in: Quicksilver Liquid Edition")');
  assert.match(await win.evaluate(() => dolphinOfferHTML({ members: { drafters: ['local:starter-brain'], vision: 'local:starter' } })), /Add Dolphin/, 'a crew of one is offered Dolphin as a second opinion');
  assert.equal(await win.evaluate(() => dolphinOfferHTML({ members: { drafters: ['local:a', 'local:b'] } })), '', 'not offered once the crew has a second model');
  assert.match(await win.evaluate(() => qsRolesHTML({ members: { drafters: ['local:starter-brain'], vision: 'local:starter' }, bench: 'local:starter-dolphin' })), /On the Council/, 'a slow PC shows Dolphin on the Council');
  // Tested scores and create ratings on models, stacks and cloud AIs.
  const sc = await win.evaluate(() => {
    const m = S.catalog.text.find((x) => x.id === 'qwen3-4b');
    const img = S.catalog.media.find((x) => x.kind === 'image' && x.category !== 'edit');
    const vid = S.catalog.media.find((x) => x.kind === 'video');
    return { model: modelProfileHTML(m, 'text'), img: createRowHTML(modelCreate(img), { all: true }), vid: createRowHTML(modelCreate(vid), { all: true }),
      stack: stackScoresHTML(['local:qwen3-4b', 'local:qwen3-vl-2b', 'local:flux-schnell']), unc: scoresFor('qwen3-8b-uncensored'), none: modelProfileHTML(S.catalog.text.find((x) => x.id === 'rocinante-12b'), 'text'),
      cloud: scoreChipsHTML(cloudScoresFor('groq')) };
  });
  assert.match(sc.model, /Maths <b>52%<\/b>/); assert.match(sc.model, /Music <b>4\/10<\/b>/);
  assert.match(sc.img, /Photos <b>\d+(\.\d)?\/10/); assert.match(sc.img, /Video <b>–/); assert.match(sc.vid, /Video <b>\d+(\.\d)?\/10/);
  assert.match(sc.stack, /Best member/); assert.match(sc.stack, /Science <b>\d+%/);
  assert.equal(sc.unc.basedOn, 'qwen3-8b', 'uncensored versions are scored by the model they come from');
  assert.match(sc.none, /No published test scores/); assert.match(sc.cloud, /Maths <b>93%/);
  // The Liquid Edition is completely uncensored: its cloud partner is Venice, and filtered models never stand in.
  const unc = await win.evaluate(() => ({ partner: cloudPartnerHTML(), filtered: S.installed.filter((m) => m.kind === 'text' && !liquidOk(`local:${m.id}`)).length, bundledOk: S.installed.filter((m) => m.source === 'bundled').every((m) => liquidOk(`local:${m.id}`)), liquid: liquidOk('stack:quicksilver') }));
  assert.match(unc.partner, /Venice/); assert.doesNotMatch(unc.partner, /data-pair="cerebras"/);
  assert.ok(unc.bundledOk && unc.liquid);
  // Fully uncensored: the Liquid Edition is told never to refuse, hedge or add disclaimers; other models aren't.
  const sys = await win.evaluate(() => { const a = assistantById('as-general'); const had = targetValid('stack:quicksilver'); if (!had) S.targets.push({ target: 'stack:quicksilver', label: 'Quicksilver Liquid Edition', stack: true }); try { return { liquid: systemPrompt(a, false, { target: 'stack:quicksilver' }), other: systemPrompt(a, false, { target: S.targets.find((t) => t.target.startsWith('local:'))?.target }) }; } finally { if (!had) S.targets = S.targets.filter((t) => t.target !== 'stack:quicksilver'); } });
  assert.match(sys.liquid, /fully uncensored/); assert.doesNotMatch(sys.liquid, /no disclaimers unless something is risky/);
  assert.doesNotMatch(sys.other, /fully uncensored/);
  // Upgrades say what you gain, in plain words.
  const gains = await win.evaluate(() => ({ think: gainsOf('qwen3-4b', 'qwen3-4b-thinking').map((g) => g.text), img: gainsOf('sdxl', 'flux-schnell').map((g) => g.text), html: modelUpdatesHTML() }));
  assert.ok(gains.think.includes('Sharper maths: 52% → 83%') && gains.think.some((t) => /Expanded reasoning/.test(t)), gains.think.join(' | '));
  assert.match(gains.img[0], /Improved picture generation/);
  assert.match(gains.html, /class="gain"/, 'the upgrade card lists the gains');
  console.log('✓ tested scores (maths, science, coding) and create ratings (photos, edits, video, music) on models, stacks and cloud AIs');
  assert.match(await win.locator('#builtin-model').innerText(), /Reasons step by step[\s\S]*Double-checks[\s\S]*Gets maths right[\s\S]*Sees photos/);
  assert.ok(await win.locator('.model-card .badge:has-text("Featured")').count() >= 3, 'featured picks are marked');
  const up = await win.evaluate(async () => {
    const before = S.data.prefs.defaultTarget;
    const keep = { as: S.data.assistants.map((x) => [x, x.target]), ch: S.data.chats.map((x) => [x, x.target]), pj: (S.data.projects || []).map((x) => [x, x.target]) };
    const stacksBefore = await qs.call('stacks:list');
    await qs.call('stacks:save', { id: 't-up', name: 'Upgrade test', members: { drafters: ['local:phi-4', 'local:gemma-3-4b'], judge: 'local:phi-4' } });
    S.data.chats.push({ id: 'c-up', title: 'Upgrade test', target: 'local:phi-4', messages: [], assistantId: 'as-general', created: Date.now(), updated: Date.now() });
    S.modelUpgrades = [{ oldId: 'phi-4', oldName: 'Phi-4 14B', oldCatalogId: 'phi-4', newCatalogId: 'qwen3-8b', newName: 'Qwen3 8B', why: 'stronger for everyday use (6 → 8 out of 10)', rating: 'great', speed: 'Fast', sizeGB: 5 }];
    paintUpdateBadge(); render();
    const card = document.querySelector('#model-updates')?.textContent || '';
    const dot = document.querySelector('[data-nav="models"] .nav-dot:not([hidden])')?.textContent;
    const dotWant = String(1 + shownStackUpdates().length);
    document.querySelector('[data-up-later="phi-4>qwen3-8b"]').click();
    const laterCard = (document.querySelector('[data-up-later="phi-4>qwen3-8b"]') ? 'STILL ' : '') + (document.querySelector('#model-updates')?.textContent || '');
    S.data.prefs.upgradeLater['phi-4>qwen3-8b'] = Date.now() - 1; render();
    const backCard = (document.querySelector('[data-up-later="phi-4>qwen3-8b"]') ? 'BACK ' : '') + (document.querySelector('#model-updates')?.textContent || '');
    S.data.prefs.pendingUpgrades = { 'qwen3-8b': 'phi-4' };
    const swapped = await applyPendingUpgrades(S.installed.find((m) => m.id === 'qwen3-8b'));
    const st = (await qs.call('stacks:list')).find((x) => x.id === 't-up');
    const chat = S.data.chats.find((c) => c.id === 'c-up');
    const out = { card, dot, dotWant, laterCard, backCard, swapped, members: st.members, chat: chat.target, toast: document.querySelector('#toast')?.textContent || document.body.innerText.match(/Upgraded to[^\n]*/)?.[0] || '' };
    await qs.call('stacks:delete', 't-up');
    S.data.chats = S.data.chats.filter((c) => c.id !== 'c-up');
    for (const l of Object.values(keep)) for (const [x, t] of l) x.target = t;
    for (const st0 of stacksBefore) await qs.call('stacks:save', st0);
    S.data.prefs.defaultTarget = before; S.modelUpgrades = []; paintUpdateBadge(); save(); await refreshModels(); render();
    return out;
  });
  assert.match(up.card, /Better models available[\s\S]*Phi-4 14B[\s\S]*Qwen3 8B/);
  assert.equal(up.dot, up.dotWant, 'the Models menu item shows the updates');
  assert.ok(!/^STILL /.test(up.laterCard) && /put off for later/.test(up.laterCard), 'Maybe later hides it for now');
  assert.match(up.backCard, /^BACK /, 'and it is suggested again later');
  assert.equal(up.swapped, true);
  assert.deepEqual(up.members.drafters, ['local:qwen3-8b', 'local:gemma-3-4b']);
  assert.equal(up.members.judge, 'local:qwen3-8b');
  assert.equal(up.chat, 'local:qwen3-8b', 'chats switch to the new model');
  assert.match(up.toast, /Upgraded to Qwen3 8B/);
  await win.click('[data-tab="installed"]');
  await win.waitForSelector('#model-updates');
  console.log('✓ built-in model card, featured picks, better-model upgrade swaps into stacks and chats');
  await win.click('[data-tab="api"]');
  await win.waitForSelector('text=Anthropic (Claude)');
  await win.waitForSelector('#presets h3:has-text("Free to start, then paid")');
  assert.equal(await win.locator('#presets h3:has-text("on this PC")').count(), 0, 'no "Free, on this PC" group');
  await win.waitForSelector('#presets .card:has-text("Google Gemini") .badge:has-text("✓ Free")');
  await win.waitForSelector('#presets .card:has-text("OpenAI") .badge:has-text("Paid")');
  // Every cloud AI, free or paid, with the best model to link; Fusion to combine them.
  assert.ok(await win.locator('#presets [data-preset]').count() >= 30, 'every OpenAI-compatible cloud AI is listed');
  await win.waitForSelector('#presets .card:has-text("Venice AI") :text("Best to link")');
  await win.waitForSelector('#presets .card:has-text("Groq") .badge:has-text("Dev plan")');
  await win.waitForSelector('.fusion-card #fusion-open');
  await shot(win, '05b-api-free');
  await win.evaluate(() => { modelsTab = 'text'; render(); });
  await win.waitForSelector('.addon:has-text("Memory"):has-text("like Mem0")');
  assert.ok(await win.locator('.addon:has-text("local RAG")').count() === 1 && await win.locator('.addon .addon-effect').count() >= 8);
  await win.locator('.addon-grid').scrollIntoViewIfNeeded();
  await shot(win, '05d-addons');
  await win.click('[data-nav="pc"]');
  await win.waitForSelector('text=Speed test');
  await shot(win, '06-your-pc');
  await win.waitForSelector('#new-pc');
  assert.equal(await win.locator('.tier-grid .tier').count(), 4, 'four buying tiers');
  assert.equal(await win.locator('.tier.mine').count(), 1, 'this PC is marked');
  await win.waitForFunction(() => document.querySelectorAll('.tier-speed').length === 4, null, { timeout: 15000 });
  assert.match(await win.locator('.tier-speed').last().innerText(), /words a second[\s\S]*faster than this PC/);
  // Picking a computer tier changes what the models below could do.
  await win.waitForSelector('.tier-ability .ta-caps, .tier-ability .ta-col');
  await win.click('.tier[data-tier-pick="4"]');
  await win.waitForSelector('.tier.picked[data-tier-pick="4"]');
  assert.match(await win.locator('.tier-ability').innerText(), /Tier 4[\s\S]*(Best setup|words a second)[\s\S]*Pictures/);
  const t4 = await win.locator('.tier-ability').innerText();
  await win.click('.tier[data-tier-pick="1"]');
  await win.waitForFunction(() => /Tier 1/.test(document.querySelector('.tier-ability')?.innerText || ''));
  assert.notEqual(t4, await win.locator('.tier-ability').innerText(), 'the abilities change with the chosen computer');
  // Upgrades: faster (same models) vs smarter (a bigger model), with cost and cheaper alternatives.
  await win.waitForSelector('.upg-grid .upg', { timeout: 20000 });
  await win.locator('#upgrades').scrollIntoViewIfNeeded();
  const upg = await win.locator('.upg-grid').innerText();
  assert.match(upg, /Faster|Smarter|More room for models/);
  assert.ok(await win.locator('.upg-cheaper').count() >= 1, 'cheaper alternatives offered');
  assert.ok(await win.locator('.upg').count() >= 5, 'several upgrade options');
  await shot(win, '06c-upgrades');
  await win.locator('#new-pc').scrollIntoViewIfNeeded();
  await shot(win, '06b-new-pc-speeds');
  console.log('✓ models + your PC (buying guide changes model abilities; clearer upgrades with costs)');

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
  await win.waitForSelector('.studio audio', { timeout: 150000 });
  await win.waitForSelector('#mu-chords');
  await shot(win, '11b-music');
  // Cloud: the best hosted photo, video and music models, rated out of 10 next to this PC's own.
  // Each Create tab explains itself.
  assert.match(await win.locator('.studio-intro').first().innerText(), /\w+.{20,}/, 'the tab explains what it does');
  await win.click('[data-stab="cloud"]');
  await win.waitForSelector('.studio-intro:has-text("cloud")');
  await win.waitForSelector('.cs-model .ten-stars');
  assert.ok(await win.locator('[data-cs-connect="fal"]').count(), 'asks to connect fal.ai for its models');
  assert.match(await win.locator('.cs-models').innerText(), /FLUX via Pollinations[\s\S]*Free/);
  assert.equal(await win.locator('#cs-go').isDisabled(), false, 'free pictures work with no key');
  for (const k of ['video', 'music', 'edit', 'animate', 'image']) {
    await win.click(`[data-cs-kind="${k}"]`);
    await win.waitForSelector('.cs-model input[name="cs-model"]');
  }
  await win.click('[data-cs-kind="video"]');
  assert.match(await win.locator('.cs-models').innerText(), /Veo 3\.1[\s\S]*10\/10[\s\S]*Kling 3 Pro[\s\S]*On this PC/);
  const falId = await win.evaluate(async () => { const p = await qs.call('providers:save', { preset: 'fal' }, 'fal-test'); await refreshProviders(); render(); return p.id; });
  await win.click('[data-cs-kind="music"]');
  await win.waitForSelector('#cs-go:not([disabled])');
  await win.waitForSelector('#cs-lyrics');
  const songs = await win.locator('#main').innerText();
  assert.match(songs, /ElevenLabs Music[\s\S]*MiniMax Music 2\.6[\s\S]*Mureka v9/);
  assert.match(songs, /full composition/);
  await shot(win, '11c-cloud-studio');
  await win.evaluate(async (id) => { await qs.call('providers:remove', id); await refreshProviders(); }, falId);
  // Voice: read aloud (a test tone stands in for Windows' voices on Linux).
  await win.click('[data-stab="voice"]');
  await win.fill('#vo-text', 'ALEX: Welcome to the show.\nSAM: Glad to be here.');
  await win.click('#vo-go');
  await win.waitForFunction(() => [...document.querySelectorAll('.studio .card b')].some((b) => /Welcome/.test(b.textContent)), null, { timeout: 150000 });
  // Quick fixes on a gallery item.
  await win.click('[data-stab="tools"]');
  const pickImg = await win.evaluate(() => gallery.find((g) => g.kind === 'image')?.id);
  await win.selectOption('#tl-pick', pickImg);
  await win.click('[data-fix="upscale2"]');
  await win.waitForFunction(() => gallery.some((g) => /^Upscaled 2×/.test(g.title || '')), null, { timeout: 150000 });
  await shot(win, '11c-quick-fixes');
  console.log('✓ studio: music, voice, quick fixes');

  // Settings → Features: every feature on or off, with what you gain or lose.
  await win.click('[data-nav="settings"]');
  await win.click('[data-set-tab="features"]');
  await win.waitForSelector('.feat [data-feature="thinking"]');
  assert.ok(await win.locator('.feat').count() >= 12, 'every feature has a switch');
  assert.match(await win.locator('.feat:has([data-feature="autoWeb"])').innerText(), /With it on:[\s\S]*✅[\s\S]*⚠️[\s\S]*With it off:/);
  // Turning one off asks first, listing what you gain and what you give up; "Keep it on" changes nothing.
  await win.click('[data-feature="thinking"]');
  await win.waitForSelector('#modal-body:has-text("What you give up")');
  assert.match(await win.locator('#modal-body').innerText(), /What you gain[\s\S]*much sooner[\s\S]*What you give up[\s\S]*More mistakes/);
  await shot(win, '09b-features-confirm');
  await win.click('[data-feat-no]');
  assert.equal(await win.evaluate(() => S.data.prefs.thinking !== false), true, 'cancel keeps it on');
  assert.equal(await win.locator('[data-feature="thinking"]').isChecked(), true);
  await win.click('[data-feature="thinking"]');
  await win.click('[data-feat-yes]');
  await win.waitForSelector('.toast:has-text("Thinking for hard questions off")');
  assert.equal(await win.evaluate(() => S.data.prefs.thinking), false);
  await shot(win, '09b-features');
  await win.click('[data-feature="thinking"]');
  await win.click('[data-feat-yes]');
  await win.waitForFunction(() => S.data.prefs.thinking === true);
  // Settings → What's inside: the bundled uncensored models, engines, the full feature list and this
  // release's notes, all in one place.
  await win.click('[data-set-tab="about"]');
  await win.waitForSelector('.about-page');
  const about = await win.locator('.about-page').innerText();
  assert.match(about, /Qwen3\.5 4B[\s\S]*Uncensored/i, 'the Brain is listed as uncensored');
  assert.match(about, /Qwen3\.5 2B/, 'the fast helper is listed');
  assert.match(about, /llama\.cpp[\s\S]*stable-diffusion\.cpp[\s\S]*whisper\.cpp/, 'the engines are listed');
  assert.match(about, /Memory \(Mem0-style\)/, 'memory is listed');
  assert.match(about, /Pollinations/, 'free no-key pictures are listed');
  assert.match(about, /What's new in this version/, 'this release\'s feature notes are included');
  await win.waitForFunction(() => /version \d+\.\d+/.test($('.about-page h2')?.innerText || ''), null, { timeout: 8000 });
  console.log('✓ Settings → What\'s inside: models, engines, features and release notes');
  await shot(win, '09c-about');
  // Settings: API server on.
  await win.click('[data-nav="settings"]');
  await win.click('[data-set-tab="advanced"]');
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
  const waitAnswer = (re) => win.waitForFunction((src) => new RegExp(src).test([...document.querySelectorAll('.msg.assistant .bubble')].at(-1)?.textContent || ''), re.source, { timeout: 180000 });

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
  await win.waitForFunction(() => document.querySelector('#mem-new')?.value === 'I prefer metric units');
  await win.press('#mem-new', 'Enter');
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
  await win.click('.msg.assistant:last-child [data-act="more"]'); await win.click('.menu [data-mm="doc"]');
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
  // By task (the default): pick tasks, see every model good at them with skill, accuracy and speed.
  await win.waitForSelector('.cmp-task[data-cmp-job="general"].on');
  await win.click('.cmp-task[data-cmp-job="coding"]');
  await win.waitForFunction(() => document.querySelectorAll('.cmp-table tbody tr').length > 0 && /Coding/.test(document.querySelector('.cmp-table thead')?.textContent || ''), null, { timeout: 15000 });
  const head = await win.locator('.cmp-table thead').innerText();
  assert.match(head, /Skill for Everyday chat \+ Coding[\s\S]*Accuracy[\s\S]*Speed on this PC/i);
  await shot(win, '15b-compare-by-task');
  await win.click('[data-cmp-tab="blind"]');
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
  await win.click('[data-set-tab="advanced"]');
  await win.check('#ph-on');
  await win.waitForFunction(() => document.querySelector('.phone-qr svg') || document.querySelector('#ph-on')?.checked, null, { timeout: 15000 });
  await win.waitForTimeout(500);
  await shot(win, '17-phone');
  await win.uncheck('#ph-on');
  await win.click('[data-set-tab="general"]');
  await win.waitForSelector('#upd-box');
  console.log('✓ settings: voice, phone (QR link), updates');

  // Power tools: another model on the same question, branching, chat settings, maths, palette, import.
  await win.click('[data-nav="newchat"]');
  await win.selectOption('#pick-model', 'local:qwen3-8b');
  await win.fill('#input', 'What is $x^2 + y^2$ when x = 3?');
  await win.keyboard.press('Enter');
  await idle();
  await win.waitForSelector('.msg.assistant .bubble .katex');
  await win.waitForSelector('.composer-hint .ctx-meter');
  await win.click('.msg.assistant:last-child [data-act="more"]'); await win.click('.menu [data-mm="other"]');
  await win.click('.menu [data-t="local:phi-4"]');
  await idle();
  await waitAnswer(/Answer from phi\.gguf/);
  assert.ok(await win.isVisible('.msg.assistant:last-child [data-act="prev"]'), 'both answers kept');
  await win.click('.msg.assistant:last-child [data-act="prev"]');
  await waitAnswer(/Answer from qwen\.gguf/);
  await shot(win, '18-try-another-model');
  const before2 = await win.evaluate(() => S.data.chats.length);
  await win.click('.msg.user [data-act="branch"]');
  await win.waitForFunction((n) => S.data.chats.length === n + 1 && chatById(S.route.id).branchOf, before2);
  assert.equal(await win.evaluate(() => chatById(S.route.id).messages.length), 1, 'branch keeps messages up to that point');
  await win.click('#chat-more');
  await win.click('.menu [data-m="settings"]');
  await win.fill('#cs-sys', 'Answer like a pirate');
  await win.click('#cs-ok');
  await win.click('#send'); // the branch ends on a question: answer it
  await waitAnswer(/\[chat: Answer like a pirate\]/);
  await idle();
  await win.waitForSelector('[data-chat-settings]');
  // Improve my prompt.
  await win.fill('#input', 'pasta tips');
  await win.click('#improve-btn');
  await win.waitForFunction(() => /^Answer from/.test(document.querySelector('#input').value), null, { timeout: 60000 });
  await win.fill('#input', '');
  // Command palette (the shortcut can land while a background repaint takes focus: press it again, then open it directly).
  const openPal = async () => {
    for (let i = 0; i < 3; i++) {
      await win.keyboard.press('Control+Shift+P');
      if (await win.waitForSelector('#pal-q', { timeout: 5000 }).catch(() => null)) return;
    }
    await win.evaluate(() => openPalette());
    await win.waitForSelector('#pal-q');
  };
  await openPal();
  await win.fill('#pal-q', 'blind test');
  // The palette groups results, shows an icon for each, and highlights what you typed.
  await win.waitForSelector('.pal .pal-group:has-text("Best match")');
  assert.match(await win.locator('.pal-item.hot').innerText(), /Compare models \(blind test\)/);
  assert.ok(await win.locator('.pal-item.hot mark').count() >= 1 && await win.locator('.pal-item.hot .pal-ic').count() === 1);
  await shot(win, '19-command-palette');
  await win.keyboard.press('Enter');
  // A background job (a title, suggestions) can repaint the chat just as the palette jumps; try once more.
  if (!(await win.waitForSelector('.arena', { timeout: 8000 }).catch(() => null))) {
    await openPal();
    await win.fill('#pal-q', 'blind test');
    await win.keyboard.press('Enter');
    await win.waitForSelector('.arena');
  }
  // Import from ChatGPT.
  await win.click('[data-nav="settings"]');
  await win.click('[data-set-tab="general"]');
  await win.setInputFiles('#imp-file', { name: 'conversations.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify([{ title: 'Trip to Rome', create_time: 1700000000, update_time: 1700000500, conversation_id: 'r1', current_node: 'b', mapping: { a: { id: 'a', parent: null, children: ['b'], message: { author: { role: 'user' }, content: { content_type: 'text', parts: ['Plan 3 days in Rome'] } } }, b: { id: 'b', parent: 'a', children: [], message: { author: { role: 'assistant' }, content: { content_type: 'text', parts: ['Day 1: the Colosseum.'] } } } } }])) });
  await win.waitForSelector('.proj-page h1:has-text("Imported from ChatGPT")');
  await win.click('.proj-chat:has-text("Trip to Rome")');
  await win.waitForSelector('.msg.assistant:has-text("Day 1: the Colosseum.")');
  await win.waitForSelector('.badge:has-text("From ChatGPT")');
  console.log('✓ power tools: another model, branch, chat settings, maths, context meter, better prompt, palette, ChatGPT import');

  // The answer area: follow-up suggestions send a message; ⋯ holds the less-used actions.
  await win.click('[data-nav="newchat"]');
  await win.selectOption('#pick-model', 'local:qwen3-8b');
  await win.fill('#input', 'Name three rivers');
  await win.keyboard.press('Enter');
  await idle();
  await win.waitForSelector('.followups .fu:has-text("Show an example of Name three rivers")', { timeout: 60000 }); // written from the answer
  await win.click('.followups .fu >> nth=1');
  await waitAnswer(/Which option suits a beginner/);
  await idle();
  await win.click('.msg.assistant:last-child [data-act="more"]');
  await win.waitForSelector('.menu [data-mm="continue"]');
  await win.click('.menu [data-mm="saveas"]');
  await win.waitForSelector('.menu [data-f="docx"]');
  await win.keyboard.press('Escape');
  console.log('✓ answer area: follow-ups, more menu, save as');
  // Feedback: a short form; PC details are shown before they're included.
  await win.click('#feedback-btn');
  await win.click('[data-fb="confusing"]');
  await win.fill('#fb-text', 'The model menu was hard to find');
  assert.match(await win.locator('.fb-pre').textContent(), /Version: .*\nView: /);
  await win.click('#fb-copy');
  await win.keyboard.press('Escape');
  console.log('✓ feedback form');

  // Simple view: a short sidebar, a clean message box, and the best model picked per question.
  await win.evaluate(() => { S.data.prefs.simple = true; S.data.prefs.autoRoute = true; S.data.prefs.navMore = false; applyPrefs(); save(); });
  await win.click('[data-nav="newchat"]');
  // Everything is findable: the menu shows Stacks, Models, Upgrades… and the chat options are in the bar.
  for (const v of ['stacks', 'models', 'upgrades', 'assistants', 'skills', 'integrations']) assert.ok(await win.isVisible(`.nav [data-nav="${v}"]`), `${v} is in the menu`);
  assert.ok(await win.isVisible('#tog-web') && await win.isVisible('#tog-fact') && await win.isVisible('#pick-effort'), 'chat options are in the message bar');
  // A tidy menu: no list of stacks; the Explore pages fold into one section.
  assert.equal(await win.locator('#side-stacks').count(), 0, 'stacks are not listed in the menu');
  await win.click('#nav-explore');
  await win.waitForSelector('#nav-explore-list', { state: 'hidden' });
  await win.click('#nav-explore');
  await win.waitForSelector('#nav-explore-list .nav-item[data-nav="stacks"]', { state: 'visible' });
  assert.ok(await win.evaluate(() => getComputedStyle(document.querySelector('#side-scroll')).overflowY === 'auto'), 'the menu scrolls');
  await win.selectOption('#pick-assistant', 'as-general');
  assert.equal(await win.inputValue('#pick-model'), '__auto');
  await win.click('#tog-fact');
  await win.waitForSelector('#tog-fact.on', { state: 'visible' });
  await win.click('#tog-fact');
  await shot(win, '20-simple-view');
  // A photo goes to a model that can see it.
  await win.setInputFiles('#file-in', { name: 'dot.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
  await win.waitForSelector('.attach:has-text("dot.png")');
  await win.fill('#input', 'What colour is this?');
  await win.keyboard.press('Enter');
  await idle();
  const picked = await win.evaluate(() => { const m = chatById(S.route.id).messages.at(-1); return m.alts[m.altIndex].target; });
  assert.ok(await win.evaluate((t) => Boolean(S.speed.targets[t]?.vision || membersOf(t).some((x) => S.speed.targets[x]?.vision || S.installed.find((m) => `local:${m.id}` === x)?.vision)), picked), `a model that can see answered (${picked})`);
  console.log('✓ simple view: a tidy menu (Explore folds Stacks, Models, Upgrades…; no stacks list), menu scrolls, options in the bar, automatic model choice (photo →', picked + ')');

  if (errors.length) console.log('PAGE ERRORS:', errors);
  assert.deepEqual(errors, []);
  // Closing can occasionally stall on a slow machine; don't let that hang the run.
  await Promise.race([app.close().catch(() => {}), new Promise((r) => setTimeout(r, 15000))]);
  try { app.process()?.kill('SIGKILL'); } catch {}
  fs.rmSync(HOME, { recursive: true, force: true });
  console.log('\nUI TESTS PASSED');
  process.exit(0);
})().catch(async (e) => {
  console.error('FAIL', e.message.split('\n').slice(0, 3).join(' | '));
  if (WIN) { try { if (shots) await WIN.screenshot({ path: path.join(shots, 'FAIL.png') }); console.error('PAGE:', (await WIN.evaluate(() => document.body.innerText)).slice(0, 1500)); } catch {} }
  process.exit(1);
});
