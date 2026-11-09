// Tests the INSTALLED app, the way a new user would use it: the real installer's output, the
// real engine and the models that come with Quicksilver. Run on Windows after a silent install.
//   node test/installed.test.js <path to Quicksilver.exe> <full|fallback> [screenshot folder]
//   full:     installed with the "Quicksilver models" folder next to the setup file
//   fallback: installed from the setup file alone (the main model downloads on first run)
const { _electron: electron } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const zlib = require('node:zlib');
const assert = require('node:assert');

const [exe, mode = 'full', shots] = process.argv.slice(2);
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-installed-'));
const LONG = 6 * 60 * 1000; // real models on a CI processor: allow plenty of time

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
  const t0 = Date.now();
  const ok = (msg) => console.log(`✓ ${msg} (${Math.round((Date.now() - t0) / 1000)} s)`);
  const app = await electron.launch({ executablePath: exe, env: { ...process.env, QUICKSILVER_HOME: HOME } });
  const win = await app.firstWindow();
  await win.setViewportSize({ width: 1440, height: 900 });
  const errors = [];
  win.on('pageerror', (e) => errors.push(e.message));
  win.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  const shot = async (name) => { if (shots) { fs.mkdirSync(shots, { recursive: true }); await win.screenshot({ path: path.join(shots, `${mode}-${name}.png`) }); } };
  const state = () => win.evaluate(() => ({
    installed: S.installed.map((m) => ({ id: m.id, name: m.name, source: m.source, catalogId: m.catalogId })),
    stacks: S.stacks.map((s) => ({ id: s.id, members: s.members })),
    def: S.data.prefs.defaultTarget,
    downloads: Object.values(S.downloads).map((d) => ({ id: d.id, done: d.downloaded, total: d.total })),
  }));
  const idle = () => win.waitForFunction(() => !document.querySelector('.bubble.streaming') && !document.querySelector('.status-line') && !document.querySelector('.fact-chip.k-run'), null, { timeout: LONG });
  const lastAnswer = () => win.evaluate(() => [...document.querySelectorAll('.msg.assistant .bubble')].pop()?.innerText || '');
  const ask = async (text, file, target) => {
    await win.click('[data-nav="newchat"]');
    await win.waitForSelector('#input');
    // Automatic picks the quickest good model per question; a test of the team names it.
    if (target) await win.evaluate((t) => { const c = chatById(S.route.id); c.target = t; save(); render(); }, target);
    if (file) { await win.setInputFiles('#file-in', file); await win.waitForSelector('.attach'); }
    await win.fill('#input', text);
    await win.keyboard.press('Enter');
    await win.waitForSelector('.msg.assistant');
    await idle();
    const a = await lastAnswer();
    const steps = await win.evaluate(() => [...document.querySelectorAll('.steps .step b')].map((b) => b.textContent));
    const reasoning = await win.evaluate(() => { const m = chatById(S.route.id)?.messages.at(-1); return m?.alts?.[m.altIndex]?.reasoning || ''; });
    return { a, steps, reasoning };
  };

  // 1. First launch: the bundled models are registered and Quicksilver is ready.
  await win.waitForSelector('text=Forms to fit your work.', { timeout: 60000 });
  await win.waitForFunction(() => S.installed.some((m) => m.id === 'starter'), null, { timeout: 60000 });
  let s = await state();
  assert.ok(s.installed.find((m) => m.id === 'starter' && m.source === 'bundled'), 'Qwen3-VL 2B registered from the installer');
  if (mode === 'full') {
    assert.ok(s.installed.find((m) => m.id === 'starter-brain' && m.source === 'bundled'), 'Qwen3 4B copied in by the installer and registered');
    await win.waitForFunction(() => S.stacks.some((x) => x.id === 'quicksilver') && S.data.prefs.defaultTarget === 'stack:quicksilver', null, { timeout: 60000 });
    s = await state();
    ok(`first launch: ${s.installed.map((m) => m.name).join(' + ')}; default ${s.def}; team ${JSON.stringify(s.stacks.find((x) => x.id === 'quicksilver').members)}`);
  } else {
    // The default is chosen just after the model list loads: wait for it rather than racing it.
    await win.waitForFunction(() => S.data.prefs.defaultTarget === 'local:starter', null, { timeout: 30000 })
      .catch(async () => { throw new Error(`the small model should answer until the main one arrives (default: ${(await state()).def || 'none'})`); });
    // The download starts once the app has looked the model up online (a second or so later).
    await win.waitForFunction(() => Boolean(S.downloads['qwen3-4b']) || S.installed.some((m) => m.catalogId === 'qwen3-4b'), null, { timeout: 60000 })
      .catch(() => { throw new Error('the main model should start downloading in the background'); });
    s = await state();
    console.log(`  downloading: ${JSON.stringify(s.downloads)}`);
    ok('first launch without the models folder: the small model is ready; the main model is downloading');
  }
  await win.waitForSelector('.best-setup', { timeout: 60000 });
  await shot('01-home');

  // 2. Real answers from the bundled models, through the app.
  let r = await ask('What is the capital of France? Answer in one sentence.');
  console.log(`  answer: ${r.a.replace(/\s+/g, ' ').slice(0, 160)}`);
  assert.match(r.a, /paris/i, 'a simple question is answered correctly');
  ok(`simple question answered${r.steps.length ? ` (steps: ${r.steps.join(', ')})` : ' directly'}`);
  await shot('02-simple');

  if (mode === 'fallback') {
    // The main model finishes downloading in the background, then Quicksilver is complete.
    await win.waitForFunction(() => S.installed.some((m) => m.catalogId === 'qwen3-4b'), null, { timeout: 15 * 60 * 1000, polling: 2000 });
    await win.waitForFunction(() => S.data.prefs.defaultTarget === 'stack:quicksilver', null, { timeout: 120000 });
    s = await state();
    ok(`background download finished: ${s.installed.map((m) => m.name).join(' + ')}; default ${s.def}`);
  }

  r = await ask('What is 17 × 23? Work it out step by step.', null, 'stack:quicksilver');
  const final = ((r.a.match(/\d[\d,]*/g) || []).pop() || '').replace(/,+$/, '');
  console.log(`  steps: ${r.steps.join(' → ') || '(none)'}; final number: ${final}`);
  assert.equal(final, '391', 'the hard question is answered correctly');
  console.log(`  step-by-step reasoning: ${r.reasoning ? r.reasoning.replace(/\s+/g, ' ').slice(0, 300) : '(none)'}`);
  assert.ok(r.reasoning.trim().length > 20, 'the built-in model shows its step-by-step reasoning');
  // The bundled 2B helper is much weaker than the 4B lead, so on Auto the lead answers alone
  // (quicker, same accuracy); a team with a close second model would show its steps here.
  assert.ok(r.steps.length === 0 || r.steps.length >= 2, `unexpected steps: ${r.steps.join(' → ')}`);
  ok(`hard question: ${r.steps.length ? 'two models' : 'the lead alone (helper much weaker)'}, correct answer 391`);
  await shot('03-hard');

  if (mode === 'full') {
    r = await ask('What colour is this picture? Answer with one word.', { name: 'red.png', mimeType: 'image/png', buffer: redPng() });
    console.log(`  photo answer: ${r.a.replace(/\s+/g, ' ').slice(0, 120)}; steps: ${r.steps.join(' → ') || '(none)'}`);
    assert.match(r.a, /red/i, 'the photo is read correctly');
    ok('photo question: read by the vision model, answered correctly');
    await shot('04-photo');

    // Fact check of a fresh answer.
    await win.click('[data-nav="newchat"]');
    if ((await win.getAttribute('#tog-fact', 'aria-pressed')) !== 'true') {
      if (await win.isVisible('#tog-fact')) await win.click('#tog-fact');
      else { await win.click('#opts-btn'); await win.click('.opts-menu [data-o="tog-fact"]'); } // simple view: under ＋
    }
    await win.fill('#input', 'Name the largest planet in our solar system and one fact about it.');
    await win.keyboard.press('Enter');
    await win.waitForSelector('.fact-chip', { timeout: LONG });
    await win.waitForFunction(() => !document.querySelector('.fact-chip.k-run'), null, { timeout: LONG }).catch(() => {});
    await idle();
    const chip = await win.locator('.fact-chip').innerText();
    console.log(`  answer: ${(await lastAnswer()).replace(/\s+/g, ' ').slice(0, 140)}`);
    console.log(`  fact check: ${chip.replace(/\s+/g, ' ')}`);
    assert.ok(!/failed/i.test(chip), 'the fact check completed');
    ok('fact check completed');
    await win.click('.fact-chip');
    await win.waitForSelector('#fact-panel');
    await shot('05-factcheck');

    // Home and Compare render with real estimates.
    await win.click('[data-nav="home"]');
    await win.waitForSelector('.best-setup .bs-grid', { timeout: 60000 });
    await win.click('.bs-actions [data-goto="compare"]');
    await win.waitForSelector('.cmp-table', { timeout: 60000 });
    await shot('06-compare');
    ok('Home best setup and Compare stacks render');
  }

  assert.deepEqual(errors, [], 'no errors in the app');
  await app.close();
  console.log(`\nINSTALLED APP WORKS (${mode})`);
})().catch((e) => { console.error(`FAIL ${e.message}`); process.exit(1); });
