// Pictures in a Liquid Edition chat: just ask (no skill to pick), painted by Lustify.
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
  // Just ask: no skill picked, nothing typed after "/".
  await win.fill('#input', 'make me a picture of a lantern in the rain');
  await win.keyboard.press('Enter');
  const lastPicture = () => win.waitForFunction(() => { const it = [...document.querySelectorAll('.msg.assistant')].pop()?.querySelector('.skill-media-item img'); return it && /qsmedia:/.test(it.src); }, null, { timeout: 120000 });
  await lastPicture().catch(async () => { throw new Error(`no picture appeared. Last answer: ${(await win.evaluate(() => [...document.querySelectorAll('.msg.assistant')].pop()?.innerText || '(none)')).slice(0, 500)} | errors: ${errors.join('; ')}`); });
  assert.match(await win.evaluate(() => [...document.querySelectorAll('.msg.assistant')].pop().innerText), /Made with Lustify/);
  // A follow-up about the picture keeps making pictures.
  await win.fill('#input', 'another one, this time at night');
  await win.keyboard.press('Enter');
  await win.waitForFunction(() => document.querySelectorAll('.msg.assistant').length === 2, null, { timeout: 60000 });
  await lastPicture().catch(() => { throw new Error('the follow-up request made no picture'); });
  // An ordinary message afterwards gets an ordinary answer: the chat is still a normal AI.
  await win.fill('#input', 'Thanks! Now write a short poem about lanterns.');
  await win.keyboard.press('Enter');
  await win.waitForFunction(() => document.querySelectorAll('.msg.assistant').length === 3 && !document.querySelector('.bubble.streaming') && !document.querySelector('.status-line'), null, { timeout: 60000 });
  await win.waitForTimeout(800);
  assert.equal(await win.evaluate(() => [...document.querySelectorAll('.msg.assistant')].pop().querySelectorAll('.skill-media-item, .progress-box').length), 0, 'no picture for an ordinary message');
  assert.equal(await win.locator('.skill-media-item img').count(), 2);
  // Replies that read like picture instructions: recognised (labelled or plain JSON), ordinary
  // JSON is not; where it isn't clear-cut the answer keeps its code and offers a button.
  const r = await win.evaluate(() => {
    const reply = 'I\'ll create a portrait of a lighthouse.\n```json\n{"prompt": "a lighthouse at dusk, warm light", "shape": "portrait", "count": 1}\n```';
    const html = skillMediaHTML({ id: 'x' }, { text: reply, mediaOffer: mediaReplySkill(reply) }, false);
    return { plain: mediaReplySkill(reply), labelled: mediaReplySkill('Sure.\n```image\n{"prompt": "a cat"}\n```'), video: mediaReplySkill('```video\n{"prompt": "waves"}\n```'), code: mediaReplySkill('```json\n{"name": "x"}\n```'), button: /data-act="m-make"/.test(html), shown: stripMediaBlock(reply),
      follow: ['another one, this time at night', 'make her smile', 'same but in winter'].map(isMediaFollowUp), notFollow: ['Thanks! Now write a short poem about lanterns.', 'Lovely, but how do diffusion models work, explain briefly', 'Summarise the history of lanterns with dates'].map(isMediaFollowUp) };
  });
  assert.deepEqual([r.plain, r.labelled, r.video, r.code, r.button], ['make-image', 'make-image', 'make-video', null, true]);
  assert.equal(r.shown, "I'll create a portrait of a lighthouse.");
  assert.deepEqual(r.follow, [true, true, true]); assert.deepEqual(r.notFollow, [false, false, false]);
  assert.deepEqual(errors, []);
  await app.close();
  console.log('✓ Liquid Edition chat: just asking makes a picture with Lustify; follow-ups continue; ordinary messages get ordinary answers');
  process.exit(0);
})().catch((e) => { console.error(`FAIL ${e.message}`); process.exit(1); });
