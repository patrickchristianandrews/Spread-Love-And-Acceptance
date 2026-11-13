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
  // Replies that read like picture instructions: recognized (labeled or plain JSON), ordinary
  // JSON is not; where it isn't clear-cut the answer keeps its code and offers a button.
  const r = await win.evaluate(() => {
    const reply = 'I\'ll create a portrait of a lighthouse.\n```json\n{"prompt": "a lighthouse at dusk, warm light", "shape": "portrait", "count": 1}\n```';
    const html = skillMediaHTML({ id: 'x' }, { text: reply, mediaOffer: mediaReplySkill(reply) }, false);
    return { plain: mediaReplySkill(reply), labeled: mediaReplySkill('Sure.\n```image\n{"prompt": "a cat"}\n```'), video: mediaReplySkill('```video\n{"prompt": "waves"}\n```'), code: mediaReplySkill('```json\n{"name": "x"}\n```'), button: /data-act="m-make"/.test(html), shown: stripMediaBlock(reply),
      follow: ['another one, this time at night', 'make her smile', 'same but in winter'].map(isMediaFollowUp), notFollow: ['Thanks! Now write a short poem about lanterns.', 'Lovely, but how do diffusion models work, explain briefly', 'Summarize the history of lanterns with dates', 'thanks, again you nailed it', 'another question: what is the capital of France', 'now in spanish'].map(isMediaFollowUp) };
  });
  assert.deepEqual([r.plain, r.labeled, r.video, r.code, r.button], ['make-image', 'make-image', 'make-video', null, true]);
  assert.equal(r.shown, "I'll create a portrait of a lighthouse.");
  assert.deepEqual(r.follow, [true, true, true]); assert.deepEqual(r.notFollow, [false, false, false, false, false, false]);
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
  // Create: a picture that fails does not vanish at the end. Its box stays, says why in plain
  // words, and offers another try; one that works shows 100% only once the picture is there.
  await win.evaluate(() => { studioTab = 'create'; go({ view: 'studio' }); });
  await win.waitForSelector('#ci-prompt');
  await win.fill('#ci-prompt', 'a fox [fail:crash]');
  await win.click('#ci-go');
  await win.waitForSelector('.progress-box.failed', { timeout: 60000 });
  const failed = await win.evaluate(() => ({ text: document.querySelector('.progress-box.failed').innerText, retry: Boolean(document.querySelector('.progress-box.failed [data-retry-job]')), pictures: document.querySelectorAll('.gallery .gitem').length }));
  assert.match(failed.text, /stopped before the picture was finished/); assert.ok(failed.retry, 'a failed job offers "Try again"');
  await win.click('.progress-box.failed [data-dismiss-job]');
  await win.waitForSelector('.progress-box.failed', { state: 'detached' });
  await win.fill('#ci-prompt', 'a fox in the snow');
  await win.click('#ci-go');
  await win.waitForFunction((n) => document.querySelectorAll('.gallery .gitem').length > n && !document.querySelector('.progress-box'), failed.pictures, { timeout: 60000 });
  // In a chat, a failed picture says why too.
  await win.click('[data-nav="newchat"]');
  await win.waitForSelector('#input');
  await win.fill('#input', 'make me a picture of a fox [fail:memory]');
  await win.keyboard.press('Enter');
  await win.waitForFunction(() => /Not enough graphics memory/.test([...document.querySelectorAll('.msg.assistant')].pop()?.innerText || ''), null, { timeout: 90000 })
    .catch(async () => { throw new Error(`the chat did not say why the picture failed: ${(await win.evaluate(() => [...document.querySelectorAll('.msg.assistant')].pop()?.innerText || '(none)')).slice(0, 400)}`); });
  // Quicksilver is the app and its stacks, not a crew member: an everyday answer is headed by the
  // stack that answered, and Your Crew has no "Quicksilver" (an old one is renamed).
  const crew = await win.evaluate(() => {
    const line = [...document.querySelectorAll('.msg.assistant .who-line b')].map((b) => b.textContent);
    const ev = assistantById('as-general');
    return { line, name: ev.name, crewNames: S.data.assistants.map((x) => x.name) };
  });
  assert.ok(crew.line.length && crew.line.every((t) => t === 'Quicksilver Liquid Edition'), `answers are headed by the stack: ${crew.line}`);
  assert.equal(crew.name, 'Everyday Helper');
  assert.ok(!crew.crewNames.includes('Quicksilver'), 'no crew member is called Quicksilver');
  // Connect a cloud AI on a slow PC: it's used (for every message), with this PC as the backup,
  // and one click keeps answers on this PC; once you've chosen, it never changes by itself.
  const cl = await win.evaluate(async () => {
    const realEta = etaFor; const realToast = toastAction; let said = null; const p = S.data.prefs; const was = { h: p.cloudHard, a: p.cloudAll, c: p.cloudChosen };
    const t = { target: 'api:vtest2:venice-uncensored', label: 'venice-uncensored', name: 'venice-uncensored', group: 'Venice' };
    S.providers.push({ id: 'vtest2', preset: 'venice', name: 'Venice' }); S.targets.push(t);
    etaFor = (target, words) => (String(target).startsWith('api:') ? 5 : 60); // this PC: a minute an answer
    toastAction = (msg, label, fn) => { said = { msg, label, fn }; };
    try {
      delete p.cloudChosen; p.cloudHard = false; p.cloudAll = false;
      cloudAutoOn();
      const on = { hard: p.cloudHard, all: p.cloudAll, toast: said ? `${said.msg} ${said.label}` : '' };
      const chat = { id: 'c-cloud', messages: [], assistantId: 'as-general' };
      const pick = autoPick(chat, assistantById('as-general'), 'hello there', false);
      said?.fn();
      const off = { hard: p.cloudHard, all: p.cloudAll, chosen: p.cloudChosen };
      cloudAutoOn();
      const after = { hard: p.cloudHard, all: p.cloudAll };
      return { on, pick, off, after };
    } finally { etaFor = realEta; toastAction = realToast; S.providers = S.providers.filter((x) => x.id !== 'vtest2'); S.targets = S.targets.filter((x) => x !== t); Object.assign(p, { cloudHard: was.h, cloudAll: was.a }); if (was.c === undefined) delete p.cloudChosen; else p.cloudChosen = was.c; }
  });
  assert.deepEqual([cl.on.hard, cl.on.all], [true, true], `connecting a cloud AI on a slow PC turns it on for everything: ${JSON.stringify(cl)}`);
  assert.match(cl.on.toast, /Venice[^,]* is connected, so it now answers your messages[\s\S]*Keep answers on this PC/, JSON.stringify(cl));
  assert.equal(cl.pick.target, 'api:vtest2:venice-uncensored', 'an everyday message goes to Venice');
  assert.equal(cl.pick.fallback, 'stack:quicksilver', 'with the Liquid Edition as the backup');
  assert.deepEqual([cl.off.hard, cl.off.all, cl.off.chosen], [false, false, true], 'one click keeps answers on this PC');
  assert.deepEqual([cl.after.hard, cl.after.all], [false, false], 'and that choice sticks');
  // With Venice connected, a picture this PC can't make (out of memory) is made by Venice instead,
  // says so, and Venice goes first for the rest of the session.
  const fb = await win.evaluate(async () => {
    const realOpts = mediaModelOptions; const realCall = call;
    S.providers.push({ id: 'vtest', preset: 'venice', name: 'Venice' });
    mediaModelOptions = (k, f) => [...realOpts(k, f), ...(k.includes('image') ? [{ value: 'api:vtest:lustify-sdxl', label: 'Venice · lustify-sdxl' }] : [])];
    const asked = [];
    call = async (ch, ...a) => { if (ch === 'media:apiImage') { asked.push(a); return { id: 'cloud-pic', url: 'qsmedia://x/cloud.png' }; } return realCall(ch, ...a); };
    try {
      const first = pickMediaModel('image', { liquid: true, prompt: 'a fox' });
      const alt = { media: { kind: 'image', prompt: 'a fox [fail:memory]', items: [], jobs: [], shape: 'square' } };
      await makeMedia({ id: 'x', messages: [] }, {}, alt, first, { count: 1 }, () => {});
      const after = pickMediaModel('image', { liquid: true, prompt: 'a fox' });
      return { first: first.value, fallback: first.fallback?.value, items: alt.media.items.map((x) => x.id), note: alt.media.note, error: alt.media.error || '', model: alt.media.model, asked: asked.length, after: after.value };
    } finally { mediaModelOptions = realOpts; call = realCall; S.providers = S.providers.filter((p) => p.id !== 'vtest'); localMediaFailed.clear(); }
  });
  assert.match(fb.first, /^local:/, 'Lustify on this PC is tried first');
  assert.equal(fb.fallback, 'api:vtest:lustify-sdxl', 'with Venice ready behind it');
  assert.deepEqual(fb.items, ['cloud-pic'], `Venice made the picture: ${JSON.stringify(fb)}`);
  assert.equal(fb.error, '', 'no error shown');
  assert.match(fb.note, /couldn't run on this PC \(not enough memory\), so Venice · lustify-sdxl made it instead/);
  assert.equal(fb.model, 'Venice · lustify-sdxl');
  assert.equal(fb.after, 'api:vtest:lustify-sdxl', 'and Venice goes first for the rest of the session');
  // Where Venice is suggested for the Liquid Edition, it says what the pairing gives you: how
  // much less of Venice you use, how much faster hard answers are on this PC, and the quality.
  await win.evaluate(() => { go({ view: 'models' }); });
  await win.waitForSelector('.pair-card .venice-facts');
  const venice = await win.evaluate(() => {
    const card = document.querySelector('.pair-card .venice-facts').innerText;
    const first = veniceLiquidFacts();
    // With enough of your own chats, the share of hard questions is yours: 10 hard in 40 here.
    const mk = (text) => ({ id: uid(), role: 'user', text, t: now() });
    S.data.chats.push({ id: 'v-test', assistantId: 'as-general', title: 't', created: now(), updated: now(), messages: [...Array.from({ length: 30 }, () => mk('hi there')), ...Array.from({ length: 10 }, () => mk('Prove that the square root of 2 is irrational, step by step.'))] });
    veniceFactsMemo = null;
    const own = veniceLiquidFacts();
    S.data.chats = S.data.chats.filter((c) => c.id !== 'v-test'); veniceFactsMemo = null;
    return { card, first, own, line: veniceLiquidText(), rec: recommendFor('Reasoning & maths', 7.5, { liquid: true }).note, pics: recommendFor('Photo creation', 9, { liquid: true }).pick };
  });
  assert.match(venice.card, /About \d+% less Venice use/); assert.match(venice.card, /last about [\d.]+× longer/);
  assert.match(venice.card, /Hard answers (about [\d.]+× faster|in about)|No faster on this PC/); assert.match(venice.card, /Quality/);
  assert.match(venice.card, /Pictures and video use none of it/);
  assert.equal(venice.first.less, 53, 'before there are enough chats: the usual share (about 1 in 3 hard, and those are the longer answers)');
  assert.ok(venice.own.measured && venice.own.less >= 60 && venice.own.less <= 70, `from your own chats (1 in 4 hard): ${venice.own.less}% less`);
  assert.match(venice.rec, /less Venice use than Venice alone/); assert.match(venice.pics, /Lustify on your PC/);
  assert.deepEqual(errors, []);
  await app.close();
  console.log('✓ Liquid Edition chat: just asking makes a picture with Lustify; follow-ups continue; ordinary messages get ordinary answers; every kind of skill has its maker in the Liquid Edition; Code chat opens a chat set up for programming; Venice suggestions say what the pairing saves, speeds up and how good it is; a failed picture stays on screen and says why; with Venice connected, a picture this PC can\'t make is made by Venice instead; a connected cloud AI is used (for everything on a slow PC) with this PC as the backup');
  process.exit(0);
})().catch((e) => { console.error(`FAIL ${e.message}`); process.exit(1); });
