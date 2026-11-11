// A picture asked for in a Liquid Edition chat: no skill click needed, painted by Lustify.
'use strict';
const { _electron: electron } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const assert = require('node:assert/strict');
const ROOT = path.join(__dirname, '..');
const TINY = path.join(__dirname, 'fixtures', 'tiny.gguf');

(async () => {
  const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-liq-'));
  const mdir = path.join(HOME, 'models'); fs.mkdirSync(mdir);
  const copy = (n) => { const p = path.join(mdir, n); fs.copyFileSync(TINY, p); return p; };
  fs.writeFileSync(path.join(HOME, 'models.json'), JSON.stringify([
    { id: 'starter', name: 'Qwen3.5 2B (uncensored)', kind: 'text', catalogId: 'qwen3.5-2b', files: { model: copy('model.gguf'), mmproj: copy('mmproj.gguf') }, size: 1.5e9, vision: true, source: 'bundled' },
    { id: 'starter-brain', name: 'Qwen3.5 4B (uncensored)', kind: 'text', catalogId: 'qwen3.5-4b', files: { model: copy('brain.gguf'), mmproj: copy('brain-mmproj.gguf') }, size: 2.9e9, vision: true, source: 'bundled' },
    { id: 'starter-closer', name: 'Qwen3.5 9B (uncensored)', kind: 'text', catalogId: 'qwen3.5-9b-uncensored', files: { model: copy('closer.gguf'), mmproj: copy('closer-mmproj.gguf') }, size: 6e9, vision: true, source: 'bundled' },
    { id: 'starter-lustify', name: 'Lustify (uncensored)', kind: 'image', catalogId: 'lustify', files: { model: copy('lustify.safetensors'), vae: copy('lustify-vae.safetensors') }, size: 7e9, source: 'bundled' },
  ]));
  const app = await electron.launch({ executablePath: require('electron'), args: ['--no-sandbox', ROOT],
    env: { ...process.env, QUICKSILVER_HOME: HOME, QS_LLAMA_SERVER: path.join(__dirname, 'fakes', 'llama-server'), QS_SD_BIN: path.join(__dirname, 'fakes', 'sd'), QS_SCAN_DIRS: HOME } });
  const win = await app.firstWindow();
  const errors = [];
  win.on('pageerror', (e) => errors.push(e.message));
  await win.waitForSelector('text=Forms to fit your work.');
  await win.waitForFunction(() => S.data?.prefs?.defaultTarget === 'stack:quicksilver', null, { timeout: 60000 });
  await win.evaluate(() => { document.querySelector('#wc-close')?.click(); S.data.prefs.preanswer = false; S.data.prefs.readAhead = false; newChat(); });
  await win.waitForSelector('#input');
  assert.equal(await win.evaluate(() => resolveTarget(chatById(S.route.id), assistantById(chatById(S.route.id).assistantId))), 'stack:quicksilver');
  // Just ask: no skill picked.
  await win.fill('#input', 'make me a picture of a lantern in the rain');
  await win.keyboard.press('Enter');
  await win.waitForFunction(() => { const it = [...document.querySelectorAll('.msg.assistant')].pop()?.querySelector('.skill-media-item img'); return it && /qsmedia:/.test(it.src); }, null, { timeout: 120000 })
    .catch(async () => { throw new Error(`no picture appeared. Last answer: ${(await win.evaluate(() => [...document.querySelectorAll('.msg.assistant')].pop()?.innerText || '(none)')).slice(0, 500)} | errors: ${errors.join('; ')}`); });
  assert.match(await win.evaluate(() => [...document.querySelectorAll('.msg.assistant')].pop().innerText), /Made with Lustify/);
  // A follow-up in the same chat keeps making pictures (no skill click, no trigger words).
  const before = await win.locator('.skill-media-item img').count();
  await win.fill('#input', 'another one, this time at night');
  await win.keyboard.press('Enter');
  await win.waitForFunction((n) => document.querySelectorAll('.skill-media-item img').length > n, before, { timeout: 120000 })
    .catch(() => { throw new Error('the follow-up request made no picture'); });
  // A reply that is picture instructions (text and a code block) counts as a picture request,
  // and the code is not shown.
  const r = await win.evaluate(() => {
    const reply = 'I\'ll create a portrait of a lighthouse.\n```json\n{"prompt": "a lighthouse at dusk, warm light", "shape": "portrait", "count": 1}\n```';
    return { skill: mediaReplySkill(reply), labelled: mediaReplySkill('Sure.\n```image\n{"prompt": "a cat"}\n```'), video: mediaReplySkill('```video\n{"prompt": "waves"}\n```'), code: mediaReplySkill('```json\n{"name": "x"}\n```'), shown: stripMediaBlock(reply) };
  });
  assert.deepEqual([r.skill, r.labelled, r.video, r.code], ['make-image', 'make-image', 'make-video', null]);
  assert.equal(r.shown, "I'll create a portrait of a lighthouse.");
  assert.deepEqual(errors, []);
  await app.close();
  console.log('✓ Liquid Edition chat: asking for a picture makes one with Lustify (no skill click needed); follow-ups and instruction replies make pictures too');
  process.exit(0);
})().catch((e) => { console.error(`FAIL ${e.message}`); process.exit(1); });
