// The Liquid Edition's own models: what counts as "having" one, what may stand in for one, and
// what happens to the big models the installer copies in. (Found by the second audit.)
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const assert = require('node:assert/strict');
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-own-'));
process.env.QUICKSILVER_HOME = HOME;
const models = require('../src/main/models');
const complete = require('../src/main/complete');
const llama = require('../src/main/llama');
const store = require('../src/main/store');
const TINY = path.join(__dirname, 'fixtures', 'tiny.gguf');

// A GGUF file with a header of its own. extra: more [key, value] pairs (strings, or numbers as u32).
function gguf(p, arch, name, extra = []) {
  const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
  const u64 = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
  const str = (t) => { const b = Buffer.from(t); return Buffer.concat([u64(b.length), b]); };
  const kv = ([k, v]) => (typeof v === 'number' ? Buffer.concat([str(k), u32(4), u32(v)]) : Buffer.concat([str(k), u32(8), str(v)]));
  const pairs = [...(arch ? [['general.architecture', arch]] : []), ['general.name', name], ...extra];
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, Buffer.concat([Buffer.from('GGUF'), u32(3), u64(0), u64(pairs.length), ...pairs.map(kv)]));
  fs.truncateSync(p, 2e6);
  return p;
}
const own = (n) => { const p = path.join(HOME, 'own', n); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.copyFileSync(TINY, p); return p; };

(async () => {
  // ---- the setup screen: only the Liquid Edition's own copy counts as having a model ----
  const sdir = path.join(HOME, 'app', 'starter'); fs.mkdirSync(sdir, { recursive: true });
  fs.copyFileSync(TINY, path.join(sdir, 'model.gguf'));
  const BRAIN = { id: 'starter-brain', catalogId: 'qwen3.5-4b', name: 'Qwen3.5 4B (uncensored)', uncensored: true, repo: 'mradermacher/Huihui-Qwen3.5-4B-abliterated-GGUF', quant: 'Q4_K_M', alt: ['mradermacher/Qwen3.5-4B-abliterated-GGUF'], files: { model: 'qwen3.5-4b.gguf' }, pack: true };
  fs.writeFileSync(path.join(sdir, 'STARTER.json'), JSON.stringify({ models: [
    { id: 'starter', catalogId: 'qwen3.5-2b', name: 'Qwen3.5 2B (uncensored)', uncensored: true, files: { model: 'model.gguf' } },
    BRAIN,
    { id: 'starter-lustify', catalogId: 'lustify', name: 'Lustify (uncensored)', kind: 'image', uncensored: true, files: { model: 'lustify.safetensors' }, pack: true, optional: true, media: true },
  ] }));
  let r = models.registerStarter(sdir);
  assert.deepEqual(r.missing.map((m) => m.catalogId), ['qwen3.5-4b', 'lustify']);
  assert.deepEqual([r.missing[0].repo, r.missing[0].alt], [BRAIN.repo, BRAIN.alt], 'the Brain is fetched from an uncensored copy, with the other uncensored copies as fallbacks');
  // The plain catalog build of the same model (what a download by catalog id alone would fetch)
  // is not the Liquid Edition's Brain: the setup screen still asks for the real one, and the
  // plain build is not locked.
  models.add({ id: 'qwen3.5-4b', name: 'Qwen3.5 4B', kind: 'text', catalogId: 'qwen3.5-4b', repo: 'unsloth/Qwen3.5-4B-GGUF', files: { model: own('plain-4b.gguf') }, size: 1, source: 'huggingface' });
  assert.ok(models.registerStarter(sdir).missing.some((m) => m.catalogId === 'qwen3.5-4b'), 'a filtered copy does not count');
  assert.equal(models.liquidOwn(models.get('qwen3.5-4b')), false, 'and can be removed');
  // Nor is an unticked copy from another app, however well it matches. Ticked, it is.
  models.add({ id: 'imp-4b', name: 'Huihui Qwen3.5 4B abliterated', kind: 'text', catalogId: 'qwen3.5-4b', files: { model: own('imp-4b.gguf') }, size: 1, source: 'imported', from: 'LM Studio' });
  assert.ok(models.registerStarter(sdir).missing.some((m) => m.catalogId === 'qwen3.5-4b'), 'an unticked file from another app does not count');
  models.setUse('imp-4b', true);
  assert.ok(!models.registerStarter(sdir).missing.some((m) => m.catalogId === 'qwen3.5-4b'), 'once ticked, it does');
  models.setUse('imp-4b', false);
  // The setup screen's own download (named and sourced as the installer lists it) counts.
  models.add({ id: 'qwen3.5-4b', name: BRAIN.name, kind: 'text', catalogId: 'qwen3.5-4b', repo: BRAIN.repo, files: { model: own('dl-4b.gguf') }, size: 1, source: 'huggingface' });
  r = models.registerStarter(sdir);
  assert.deepEqual(r.missing.map((m) => m.catalogId), ['lustify']);
  assert.ok(models.liquidOwn(models.get('qwen3.5-4b')), 'the uncensored download is locked like the bundled one');
  console.log('✓ setup screen: a filtered build or an unticked file from another app is not the Liquid Edition\'s Brain; the uncensored copy is fetched, with fallbacks');

  // ---- the installer brings its own copies later: nothing is registered twice, nothing orphaned ----
  fs.copyFileSync(TINY, path.join(sdir, 'qwen3.5-4b.gguf'));
  r = models.registerStarter(sdir);
  assert.ok(!models.get('starter-brain'), 'the Brain you already downloaded is not registered a second time');
  assert.equal(await models.keepPackModels(sdir, { renameOnly: true }), 0);
  assert.ok(fs.existsSync(path.join(sdir, 'qwen3.5-4b.gguf')), 'a file no model uses stays in the app folder (it is not moved into your data folder)');

  // ---- the Liquid Edition's Brain and Eyes are never taken over by files from another app ----
  const HOME2 = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-own2-'));
  fs.rmSync(store.file('models.json'), { force: true });
  const put = (n) => { const p = path.join(HOME2, n); fs.copyFileSync(TINY, p); return p; };
  models.add({ id: 'starter', name: 'Qwen3.5 2B (uncensored)', kind: 'text', catalogId: 'qwen3.5-2b', files: { model: put('m.gguf'), mmproj: put('mm.gguf') }, size: 1, vision: true, source: 'bundled' });
  models.add({ id: 'starter-brain', name: 'Qwen3.5 4B (uncensored)', kind: 'text', catalogId: 'qwen3.5-4b', files: { model: put('b.gguf'), mmproj: put('bm.gguf') }, size: 1, vision: true, source: 'bundled' });
  models.add({ id: 'imp-brain', name: 'Huihui Qwen3.5 4B abliterated Q8', kind: 'text', catalogId: 'qwen3.5-4b', files: { model: put('ib.gguf') }, size: 1, source: 'imported', from: 'LM Studio' });
  models.add({ id: 'imp-eyes', name: 'Huihui Qwen3.5 2B abliterated', kind: 'text', catalogId: 'qwen3.5-2b', files: { model: put('ie.gguf') }, size: 1, source: 'imported', from: 'Downloads' });
  await complete.ensureQuicksilverStack();
  let q = complete.stacks().find((x) => x.id === 'quicksilver');
  assert.ok(!JSON.stringify([q.members, q.bench || '']).includes('imp-'), `only its own models: ${JSON.stringify(q.members)}`);
  assert.equal(q.members.drafters[0], 'local:starter-brain');
  // Several rebuilds asked for at once run one after another and agree.
  const built = await Promise.all([complete.ensureQuicksilverStack(), complete.ensureQuicksilverStack(), complete.ensureQuicksilverStack()]);
  assert.deepEqual(built, ['stack:quicksilver', 'stack:quicksilver', 'stack:quicksilver']);
  // The Council: a stack seats its own models only; a single model or a cloud chat may still be
  // joined by Quicksilver's own models (so the Council works there), never by an unticked import.
  const seats = (t) => { const c = complete.councilMembers(t, {}); return [c.structurer, c.critic, c.pragmatist, c.lead]; };
  assert.ok(seats('stack:quicksilver').every((t) => t && !t.includes('imp-')));
  const cloud = seats('api:someone:some-model');
  assert.ok(cloud[0] && cloud.every((t) => t && !t.includes('imp-')), `a cloud chat's Council has seats: ${cloud}`);
  console.log('✓ the Liquid Edition keeps its own Brain and Eyes; the Council works in cloud chats; rebuilds do not race');

  // ---- models moved to the data folder are found again even if the list was never saved ----
  const s2 = path.join(HOME2, 'app', 'starter'); fs.mkdirSync(s2, { recursive: true });
  fs.copyFileSync(TINY, path.join(s2, 'qwen3.5-9b.gguf'));
  fs.writeFileSync(path.join(s2, 'STARTER.json'), JSON.stringify({ models: [{ id: 'starter-closer', catalogId: 'qwen3.5-9b-uncensored', name: 'Qwen3.5 9B (uncensored)', uncensored: true, repo: 'x/y-abliterated-GGUF', files: { model: 'qwen3.5-9b.gguf' }, pack: true }] }));
  assert.deepEqual(models.registerStarter(s2).added.map((m) => m.id), ['starter-closer']);
  assert.equal(await models.keepPackModels(s2, { renameOnly: true }), 1);
  const keptFile = models.get('starter-closer').files.model;
  assert.ok(keptFile.includes(path.join('models', 'kept')) && fs.existsSync(keptFile) && !fs.existsSync(path.join(s2, 'qwen3.5-9b.gguf')));
  // The list of models loses the entry (as if the save after the move never landed):
  store.writeJSON(store.file('models.json'), store.readJSON(store.file('models.json'), []).filter((m) => m.id !== 'starter-closer'));
  r = models.registerStarter(s2);
  assert.deepEqual([r.missing.length, r.added.map((m) => m.id), models.get('starter-closer')?.files.model], [0, ['starter-closer'], keptFile], 'found in the data folder, registered again, nothing downloaded');
  console.log('✓ models moved to the data folder are found there again; no 30 GB re-download');

  // ---- installed on another drive: the models are kept beside the app's folder, not copied ----
  {
    // The data folder can't take them (as when it is on another drive): the keep folder there is unusable.
    const dataKept = path.join(HOME, 'models', 'kept');
    fs.renameSync(dataKept, `${dataKept}-real`); fs.writeFileSync(dataKept, 'not a folder');
    const app = path.join(HOME2, 'D-drive', 'Quicksilver');
    const s3 = path.join(app, 'resources', 'starter'); fs.mkdirSync(s3, { recursive: true });
    fs.copyFileSync(TINY, path.join(s3, 'lustify.safetensors'));
    fs.writeFileSync(path.join(s3, 'STARTER.json'), JSON.stringify({ models: [{ id: 'starter-lustify', catalogId: 'lustify', name: 'Lustify (uncensored)', kind: 'image', uncensored: true, files: { model: 'lustify.safetensors' }, pack: true, optional: true, media: true }] }));
    assert.deepEqual(models.registerStarter(s3).added.map((m) => m.id), ['starter-lustify']);
    assert.ok(models.packLeft(s3).bytes > 0, 'before the move: an update now would take the model with it');
    assert.equal(await models.keepPackModels(s3, { renameOnly: true }), 1);
    const beside = path.join(HOME2, 'D-drive', 'Quicksilver kept models', 'lustify.safetensors');
    assert.equal(models.get('starter-lustify').files.model, beside, 'kept beside the app\'s folder, on its own drive');
    assert.ok(fs.existsSync(beside) && !fs.existsSync(path.join(s3, 'lustify.safetensors')));
    assert.equal(models.packLeft(s3).bytes, 0, 'nothing left inside the folder an update replaces');
    // After a reinstall to the same place (a new, empty app folder) it is found there again.
    store.writeJSON(store.file('models.json'), store.readJSON(store.file('models.json'), []).filter((m) => m.id !== 'starter-lustify'));
    const again = models.registerStarter(s3);
    assert.deepEqual([again.missing.length, again.added.map((m) => m.id), models.get('starter-lustify').files.model], [0, ['starter-lustify'], beside]);
    // That folder is Quicksilver's own: never offered as "models from another app".
    assert.ok(!models.findOnPC().some((f) => f.path.includes('Quicksilver kept models')));
    fs.rmSync(dataKept, { force: true }); fs.renameSync(`${dataKept}-real`, dataKept);
  }
  console.log('✓ an install on another drive keeps its models beside the app, outside the folder an update replaces');

  // ---- a finished update's installer is not left on disk ----
  {
    const updater = require('../src/main/updater');
    const dir = store.dir('updates');
    const cur = require('../package.json').version;
    const [maj, min] = cur.split('.').map(Number);
    const older = `Quicksilver-Setup-${maj}.${Math.max(0, min - 1)}.0.exe`; const same = `Quicksilver-Setup-${cur}.exe`; const newer = `Quicksilver-Setup-${maj + 1}.0.0.exe`;
    for (const f of [older, same, newer, `${newer}.part`]) fs.writeFileSync(path.join(dir, f), 'x');
    updater.tidyDownloads();
    assert.deepEqual(fs.readdirSync(dir).sort(), [newer, `${newer}.part`].sort(), 'installers for this version or older are removed; a newer download waits');
  }
  console.log('✓ the setup file of a finished update is removed');

  // ---- graphics memory: counted once, whichever way the hardware reading is stale ----
  {
    const GB = 1024 ** 3;
    const closer = { size: 6.6 * GB, layers: 32 };
    const t0 = 1000;
    // Read at t0 with 9 of 12 GB free (another app holds 3). The Brain (3.4 GB) loads afterwards:
    // it is not in the reading, so it is taken off, and the Closer only partly fits.
    const hw = { vramGB: 12, vramFreeGB: 9, vramFreeLive: true, readAt: t0 };
    const after = [{ vramGB: 3.4, startedAt: t0 + 5 }];
    assert.equal(llama.countedVram(after, hw), 3.4);
    const part = llama.gpuLayers({}, closer, hw, 'auto', llama.countedVram(after, hw));
    assert.ok(part > 0 && part < 32, `not the whole model on an overfull card: ${part}`);
    // Read after the Brain loaded (8.6 free of 12, nothing else running): already in the reading.
    const hw2 = { vramGB: 12, vramFreeGB: 8.6, vramFreeLive: true, readAt: t0 + 10 };
    assert.equal(llama.countedVram(after, hw2), 0, 'not taken off twice');
    assert.equal(llama.gpuLayers({}, closer, hw2, 'auto', llama.countedVram(after, hw2)), 999);
    // A card that reports no live free figure: every loaded model counts.
    assert.equal(llama.countedVram(after, { vramGB: 12, vramFreeGB: 12, vramFreeLive: false, readAt: t0 + 10 }), 3.4);
  }
  console.log('✓ graphics memory held by loaded models is counted exactly once');

  // ---- telling chat models from the rest ----
  {
    const d = path.join(HOME2, 'files');
    const info = async (f) => llama.readGguf(f);
    assert.equal((await info(gguf(path.join(d, 'embeddinggemma-300m.gguf'), 'gemma-embedding', 'EmbeddingGemma'))).chat, false);
    assert.equal((await info(gguf(path.join(d, 'gte-Qwen2-7B.gguf'), 'qwen2', 'gte', [['qwen2.pooling_type', 3]]))).chat, false, 'an embedding model on a chat architecture says so with a pooling type');
    assert.equal((await info(gguf(path.join(d, 'plain.gguf'), 'llama', 'Plain'))).chat, true);
    for (const n of ['bge-m3-Q8_0.gguf', 'bge-small-en-v1.5.gguf', 'embeddinggemma-300m.gguf', 'flux2-dev-Q4.gguf', 'sd_xl_base_1.0.gguf', 'sd-v1-5.gguf', 'ltxv-2b.gguf', 'hidream-i1.gguf', 'lumina2.gguf', 'wan-vace-14b.gguf', 'e5-mistral-7b.gguf']) assert.equal(models.chatFile(`C:/x/${n}`), false, `${n} is not a chat model`);
    for (const n of ['gemma-3-12b-it-Q4_K_M.gguf', 'Mistral-Small-3.2-24B.gguf', 'Taiwan-LLM-7B.gguf', 'Wanderer-12B.gguf', 'Chromatic-8B.gguf', 'Embedded-Systems-Tutor-7B.gguf', 'Qwen3.5-9B-abliterated.Q4_K_M.gguf', 'Large-Bge-Fan-7B.gguf']) assert.equal(models.chatFile(`C:/x/${n}`), true, `${n} is a chat model`);
    // A file you import by hand is judged by its own header: a chat model named after Flux is a
    // chat model; a picture model is refused whatever it is called; with no header, the name decides.
    const chatNamedFlux = gguf(path.join(d, 'solo', 'Captain-Flux-12B.gguf'), 'llama', 'Captain Flux 12B');
    assert.equal((await models.importFile(chatNamedFlux, llama.readGguf)).kind, 'text');
    await assert.rejects(models.importFile(gguf(path.join(d, 'solo2', 'mystery.gguf'), 'wan', 'Mystery'), llama.readGguf), /not a chat model/);
    await assert.rejects(models.importFile(gguf(path.join(d, 'solo3', 'sd_xl_base_1.0.gguf'), '', 'SDXL'), llama.readGguf), /not a chat model/);
    // A vision add-on is paired when it belongs to the model, not just because it is in the folder.
    const shared = path.join(d, 'downloads');
    const mine = gguf(path.join(shared, 'Gemma-3-4B-it-Q4_K_M.gguf'), 'gemma3', 'Gemma 3 4B');
    gguf(path.join(shared, 'Other-Model-7B-Q4_K_M.gguf'), 'llama', 'Other');
    gguf(path.join(shared, 'mmproj-Qwen3-VL-8B-f16.gguf'), 'clip', 'proj');
    assert.equal((await models.importFile(mine, llama.readGguf)).vision, false, 'another model\'s add-on in a shared folder is not attached');
    gguf(path.join(shared, 'mmproj-Gemma-3-4B-it-f16.gguf'), 'clip', 'proj');
    assert.equal((await models.importFile(mine, llama.readGguf)).vision, true, 'its own add-on is');
  }
  console.log('✓ chat models are told from search, picture and video files by header and by name; hand imports go by the header');

  // ---- the one-time tidy leaves alone what you use and what you imported by hand ----
  {
    fs.rmSync(store.file('models.json'), { force: true });
    const d = path.join(HOME2, 'tidy');
    const bundled = gguf(path.join(d, 'own.gguf'), 'llama', 'Own');
    const twinA = path.join(d, 'a', 'twin.gguf'); const twinB = path.join(d, 'b', 'twin.gguf');
    for (const f of [twinA, twinB]) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.copyFileSync(bundled, f); }
    models.add({ id: 'own', name: 'Own', kind: 'text', files: { model: bundled }, size: 2e6, source: 'bundled' });
    const imp = (id, file, name, from) => models.add({ id, name, kind: 'text', files: { model: file }, size: 2e6, source: 'imported', ...(from ? { from } : {}) });
    imp('imp-copy', twinA, 'Own copy', 'Downloads');
    imp('imp-used', twinB, 'Own copy in use', 'Downloads');
    imp('imp-hand', gguf(path.join(d, 'Story-Whisper-12B.gguf'), 'llama', 'Story Whisper 12B'), 'Story Whisper 12B'); // by hand: the name is not held against it
    imp('imp-found-odd', gguf(path.join(d, 'x', 'Captain-Whisper-12B.gguf'), 'llama', 'Captain Whisper'), 'Captain Whisper', 'Downloads'); // found automatically: judged by name too
    imp('imp-hand-wan', gguf(path.join(d, 'y', 'model.gguf'), 'wan', 'Wan'), 'My video model'); // by hand, but its header says video
    const gone = await models.tidyImported(llama.readGguf, (id) => id === 'imp-used');
    assert.deepEqual(gone.map((g) => `${g.id}:${g.why}`).sort(), ['imp-copy:copy', 'imp-found-odd:not-chat', 'imp-hand-wan:not-chat']);
    assert.ok(models.get('imp-used') && models.get('imp-hand'), 'a copy you use, and a chat model you imported by hand, stay');
  }
  console.log('✓ tidy: only real non-chat files and unused second copies go');
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
