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
    { id: 'starter-wan', name: 'Wan 2.2 5B', kind: 'video', catalogId: 'wan2.2-5b', files: { diffusion: copy('wan2.2-5b.gguf'), vae: copy('wan2.2-vae.safetensors'), t5xxl: copy('wan-umt5-xxl.gguf') }, size: 9e9, source: 'bundled' },
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
  // Code chat: its own button under New chat. An ordinary chat set up for programming, on the
  // same model (the Liquid Edition here); New chat stays the everyday AI.
  const before = await win.evaluate(() => S.data.prefs.lastAssistant);
  await win.click('[data-nav="newcode"]');
  await win.waitForSelector('.code-starters [data-code-start]');
  const code = await win.evaluate(() => { const c = chatById(S.route.id); const a = assistantById(c.assistantId); return { a: a.id, job: a.job, target: resolveTarget(c, a), hint: document.querySelector('#input').placeholder, starters: document.querySelectorAll('[data-code-start]').length }; });
  assert.deepEqual([code.a, code.job, code.target, code.starters], ['as-code', 'coding', 'stack:quicksilver', 6]);
  assert.match(code.hint, /paste code or an error/);
  await win.click('[data-code-start="1"]');
  assert.equal(await win.inputValue('#input'), 'Write a Python script that ');
  await win.type('#input', 'prints the first ten square numbers');
  await win.keyboard.press('Enter');
  await win.waitForFunction(() => document.querySelectorAll('.msg.assistant').length === 1 && !document.querySelector('.bubble.streaming') && !document.querySelector('.status-line'), null, { timeout: 60000 });
  const codeChat = await win.evaluate(() => { const c = chatById(S.route.id); return { title: c.title, answer: [...document.querySelectorAll('.msg.assistant .bubble')].pop()?.innerText || '', media: document.querySelectorAll('.msg.assistant .skill-media-item').length }; });
  assert.ok(codeChat.answer.length > 0 && codeChat.media === 0, 'a code question gets a written answer');
  assert.match(codeChat.title, /Python script/, 'the chat is named after the first message');
  assert.equal(await win.evaluate(() => S.data.prefs.lastAssistant), before, 'a code chat does not change what New chat opens');
  await win.click('[data-nav="newchat"]');
  await win.waitForFunction(() => chatById(S.route.id)?.messages.length === 0);
  assert.equal(await win.evaluate(() => chatById(S.route.id).assistantId), before, 'New chat is still the everyday AI');
  // Everything a skill can make has its maker inside the Liquid Edition: pictures and photo edits
  // by Lustify, videos and animated photos by Wan 2.2, and every other kind of output (documents,
  // slides, sheets, charts, apps, beats, speech, the instant photo/video/audio tools) is built in.
  const cover = await win.evaluate(() => {
    const pick = (k) => pickMediaModel(k, { liquid: true, prompt: 'a lighthouse at dusk' })?.inst?.catalogId || null;
    return { kinds: [...new Set(allSkills().map((x) => x.output || 'text'))].sort(), image: pick('image'), edit: pick('edit'), video: pick('video'), animate: pick('animate') };
  });
  const BUILT_IN = ['text', 'app', 'docx', 'pptx', 'xlsx', 'chart', 'beat', 'tool', 'speech', 'narrate', 'podcast'];
  assert.deepEqual(cover.kinds.filter((k) => !BUILT_IN.includes(k)).sort(), ['animate', 'edit', 'image', 'video'], `a new kind of skill output needs a maker in the Liquid Edition: ${cover.kinds.join(', ')}`);
  assert.deepEqual([cover.image, cover.edit, cover.video, cover.animate], ['lustify', 'lustify', 'wan2.2-5b', 'wan2.2-5b'], 'the Liquid Edition makes all four with its own models');
  assert.deepEqual(errors, []);
  await app.close();
  console.log('✓ Liquid Edition chat: just asking makes a picture with Lustify; follow-ups continue; ordinary messages get ordinary answers; every kind of skill has its maker in the Liquid Edition; Code chat opens a chat set up for programming');
  process.exit(0);
})().catch((e) => { console.error(`FAIL ${e.message}`); process.exit(1); });
