// What a chat makes. Auto decides from your words; the choice on the message box (Answer, Picture,
// Video) settles it when you want to be sure. Right after a picture, a short message about it
// changes that very picture ("make it snowy") or brings it to life ("animate it"), with nothing
// attached and nothing picked. Create is now the gallery and its tools.
'use strict';
const { _electron: electron } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const assert = require('node:assert/strict');
const ROOT = path.join(__dirname, '..');
const TINY = path.join(__dirname, 'fixtures', 'tiny.gguf');
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFklEQVR4nGP8z8Dwn4EIwESMolGF2AEAcGMCDl0cjZ4AAAAASUVORK5CYII=';

(async () => {
  const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-make-'));
  const SDLOG = path.join(HOME, 'sd.log');
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
    env: { ...process.env, QUICKSILVER_HOME: HOME, QS_LLAMA_SERVER: path.join(__dirname, 'fakes', 'llama-server'), QS_SD_BIN: path.join(__dirname, 'fakes', 'sd'), QS_SD_LOG: SDLOG, QS_SCAN_DIRS: HOME } });
  const win = await app.firstWindow();
  const errors = [];
  win.on('pageerror', (e) => errors.push(e.message));
  await win.waitForSelector('text=Forms to fit your work.');
  await win.waitForFunction(() => S.data?.prefs?.defaultTarget === 'stack:quicksilver', null, { timeout: 60000 });
  await win.evaluate(() => { document.querySelector('#wc-close')?.click(); S.data.prefs.preanswer = false; S.data.prefs.readAhead = false; newChat(); });
  await win.waitForSelector('#input');
  const say = async (text) => { await win.fill('#input', text); await win.keyboard.press('Enter'); };
  // An answer is finished when its words are, and, where it makes something, when that exists (or failed).
  const answers = (n) => win.waitForFunction((k) => {
    const c = chatById(S.route.id);
    const list = c.messages.filter((m) => m.role === 'assistant');
    if (list.length !== k || pending || c.messages.at(-1).role !== 'assistant') return false;
    const alt = list.at(-1).alts[list.at(-1).altIndex];
    const sk = alt.skillId && skillById(alt.skillId);
    if (!sk || !MEDIA_OUTPUTS.has(sk.output)) return Boolean(alt.text || alt.error);
    const md = alt.media;
    return Boolean(md && !md.jobs.length && !md.status && (md.items.length || md.error || md.need));
  }, n, { timeout: 120000 });
  const last = () => win.evaluate(() => { const c = chatById(S.route.id); const u = [...c.messages].reverse().find((m) => m.role === 'user'); const am = c.messages.at(-1); const alt = am.alts[am.altIndex]; return { skill: u.skillId || null, auto: Boolean(u.skillAuto), from: u.fromMedia?.id || null, kind: alt.media?.kind || null, items: (alt.media?.items || []).map((x) => ({ id: x.id, kind: x.kind })), error: alt.media?.error || alt.error || null, text: alt.text }; });
  const runs = () => (fs.existsSync(SDLOG) ? fs.readFileSync(SDLOG, 'utf8').split('\n').filter((l) => l.startsWith('start ')) : []);

  // The message box starts on Auto.
  assert.equal(await win.inputValue('#pick-make'), 'auto');
  // Auto: asking for a picture makes one.
  await say('make me a picture of a lantern in the rain');
  await answers(1);
  const first = await last();
  assert.deepEqual([first.skill, first.kind, first.items.length, first.error], ['make-image', 'image', 1, null], JSON.stringify(first));

  // "make it snowy": that very picture is changed. Nothing was attached or picked.
  await say('make it snowy');
  await answers(2);
  const changed = await last();
  assert.deepEqual([changed.skill, changed.auto, changed.from, changed.kind, changed.items.length, changed.error], ['edit-photo', true, first.items[0].id, 'edit', 1, null], JSON.stringify(changed));
  assert.notEqual(changed.items[0].id, first.items[0].id, 'the changed picture is a new one; the first is kept');
  assert.ok(/ -i \S/.test(runs().at(-1)) && / --strength /.test(runs().at(-1)), `the engine was given the picture to change: ${runs().at(-1)}`);
  assert.match(await win.locator('.msg.user .from-media').last().innerText(), /Changing this picture/);

  // "animate it": the changed picture becomes a video.
  await say('animate it');
  await answers(3);
  const moved = await last();
  assert.deepEqual([moved.skill, moved.from, moved.kind, moved.items.map((x) => x.kind).join(), moved.error], ['animate-photo', changed.items[0].id, 'animate', 'video', null], JSON.stringify(moved));
  assert.ok(/vid_gen/.test(runs().at(-1)) && / -i \S/.test(runs().at(-1)), `the video was made from the picture: ${runs().at(-1)}`);

  // An ordinary question afterwards gets an ordinary answer.
  await say('What is the capital of France?');
  await answers(4);
  const plain = await last();
  assert.deepEqual([plain.skill, plain.kind], [null, null], JSON.stringify(plain));

  // A photo you attach, and an instruction to change it: it is edited.
  await win.evaluate((png) => { drafts[S.route.id] = [{ type: 'image', name: 'beach.png', dataUrl: png }]; }, PNG);
  await say('make the sky pink');
  await answers(5);
  const photo = await last();
  assert.deepEqual([photo.skill, photo.from, photo.kind, photo.items.length, photo.error], ['edit-photo', null, 'edit', 1, null], JSON.stringify(photo));
  // A question about an attached photo is answered, not painted.
  await win.evaluate((png) => { drafts[S.route.id] = [{ type: 'image', name: 'beach.png', dataUrl: png }]; }, PNG);
  await say('what is in this photo?');
  await answers(6);
  assert.deepEqual([(await last()).skill, (await last()).kind], [null, null]);

  // Picture: every message makes a picture, whatever its words.
  await win.evaluate(() => newChat());
  await win.waitForSelector('#input');
  await win.selectOption('#pick-make', 'image');
  await win.waitForFunction(() => document.querySelector('#input')?.placeholder === 'Describe the picture…');
  const before = runs().length;
  await say('a red bicycle by a canal');
  await answers(1);
  const pic = await last();
  assert.deepEqual([pic.skill, pic.auto, pic.kind, pic.items.length], ['make-image', false, 'image', 1], JSON.stringify(pic));
  assert.equal(runs().length, before + 1);
  // …and a change to it still changes that picture.
  await say('make the bicycle blue');
  await answers(2);
  const blue = await last();
  assert.deepEqual([blue.skill, blue.from, blue.kind], ['edit-photo', pic.items[0].id, 'edit'], JSON.stringify(blue));

  // Answer: a written answer every time, even to "make me a picture".
  await win.selectOption('#pick-make', 'text');
  await win.waitForFunction(() => chatById(S.route.id).make === 'text');
  const made = runs().length;
  await say('make me a picture of a cat');
  await answers(3);
  const words = await last();
  assert.deepEqual([words.skill, words.kind], [null, null], JSON.stringify(words));
  assert.equal(runs().length, made, 'nothing was painted in an Answer chat');

  // Video: every message makes a video.
  await win.selectOption('#pick-make', 'video');
  await win.waitForFunction(() => document.querySelector('#input')?.placeholder === 'Describe the video…');
  await say('waves rolling onto a beach at dawn');
  await answers(4);
  const vid = await last();
  assert.deepEqual([vid.skill, vid.kind, vid.items.map((x) => x.kind).join()], ['make-video', 'video', 'video'], JSON.stringify(vid));
  // Back to Auto: the choice is remembered per chat, and Auto is not stored at all.
  await win.selectOption('#pick-make', 'auto');
  await win.waitForFunction(() => chatById(S.route.id).make === undefined);

  // Create is the gallery and its tools: what you made comes first, and making starts in a chat.
  await win.click('[data-nav="studio"]');
  await win.waitForSelector('.gallery .gitem');
  const page = await win.evaluate(() => ({ title: document.querySelector('.page-head h1').innerText, tab: document.querySelector('.tabs .tab.active')?.dataset.stab, nav: document.querySelector('[data-nav="studio"] .lbl').innerText, items: document.querySelectorAll('.gallery .gitem').length, tabs: [...document.querySelectorAll('.tabs [data-stab]')].map((b) => b.dataset.stab) }));
  assert.deepEqual([page.title, page.tab, page.nav], ['Gallery & tools', 'gallery', 'Gallery & tools']);
  assert.ok(page.items >= 6, `everything made in the chats is in the gallery (${page.items})`);
  assert.deepEqual(page.tabs.slice(0, 4), ['gallery', 'edit', 'vedit', 'tools']); assert.ok(page.tabs.includes('create') && page.tabs.includes('video'), 'the forms with every setting are still there');
  await win.click('#studio-chat');
  await win.waitForSelector('#pick-make');
  assert.equal(await win.inputValue('#pick-make'), 'image', '"Make a picture in chat" opens a chat set to Picture');

  assert.deepEqual(errors, []);
  await app.close();
  console.log('✓ what a chat makes: Auto decides from your words; "make it snowy" changes the last picture and "animate it" turns it into a video; an attached photo is edited when told to change it; Picture, Video and Answer on the message box settle it; Create is the gallery and its tools');
  process.exit(0);
})().catch((e) => { console.error(`FAIL ${e.message}`); process.exit(1); });
