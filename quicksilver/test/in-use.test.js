// Models in use: a stack or fusion answers with its own models and nothing else on this PC,
// unless you tick a model under Models → "Models in use". Files that are not chat models (a video
// model, a text encoder) that an older version added by itself are taken off the list at start-up.
'use strict';
const { _electron: electron } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const assert = require('node:assert/strict');
const ROOT = path.join(__dirname, '..');
const TINY = path.join(__dirname, 'fixtures', 'tiny.gguf');

// A GGUF file with a header of its own.
function gguf(p, arch, name, size = 2e6) {
  const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
  const u64 = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
  const str = (t) => { const b = Buffer.from(t); return Buffer.concat([u64(b.length), b]); };
  const kv = (k, v) => Buffer.concat([str(k), u32(8), str(v)]);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, Buffer.concat([Buffer.from('GGUF'), u32(3), u64(0), u64(2), kv('general.architecture', arch), kv('general.name', name)]));
  fs.truncateSync(p, size);
  return p;
}

(async () => {
  const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-use-'));
  const mdir = path.join(HOME, 'models'); fs.mkdirSync(mdir);
  const other = path.join(HOME, 'other-app');
  const copy = (n) => { const p = path.join(mdir, n); fs.copyFileSync(TINY, p); return p; };
  // Another app's models: real chat models, each a different file (an exact copy of a model
  // Quicksilver already has would be recognized as the same model and left out).
  const theirs = (n) => gguf(path.join(other, n), 'llama', n);
  fs.writeFileSync(path.join(HOME, 'models.json'), JSON.stringify([
    { id: 'starter', name: 'Qwen3.5 2B (uncensored)', kind: 'text', catalogId: 'qwen3.5-2b', files: { model: copy('model.gguf'), mmproj: copy('mmproj.gguf') }, size: 1.5e9, vision: true, source: 'bundled' },
    { id: 'starter-brain', name: 'Qwen3.5 4B (uncensored)', kind: 'text', catalogId: 'qwen3.5-4b', files: { model: copy('brain.gguf'), mmproj: copy('brain-mmproj.gguf') }, size: 2.9e9, vision: true, source: 'bundled' },
    // What an older version added by itself from other apps and Downloads:
    { id: 'imp-dolphin', name: 'Qwen3 8B Abliterated', kind: 'text', catalogId: 'qwen3-8b-uncensored', files: { model: theirs('Huihui-Qwen3-8B-abliterated-v2.Q4_K_M.gguf') }, size: 4.9e9, source: 'imported', from: 'LM Studio' },
    { id: 'imp-llama', name: 'Llama 3.2 3B Instruct', kind: 'text', catalogId: 'llama-3.2-3b', files: { model: theirs('Llama-3.2-3B-Instruct-Q4_K_M.gguf') }, size: 2e9, source: 'imported', from: 'LM Studio' },
    { id: 'imp-wan', name: 'wan2.2 5b', kind: 'text', files: { model: gguf(path.join(HOME, 'Downloads', 'Quicksilver models', 'wan2.2-5b.gguf'), 'wan', 'Wan 2.2') }, size: 2e6, source: 'imported', from: 'Downloads' },
    { id: 'imp-umt5', name: 'Umt5 Xxl', kind: 'text', files: { model: gguf(path.join(other, 'encoder-q4.gguf'), 't5encoder', 'umt5') }, size: 2e6, source: 'imported', from: 'Downloads' },
  ]));
  const app = await electron.launch({ executablePath: require('electron'), args: ['--no-sandbox', ROOT],
    env: { ...process.env, QUICKSILVER_HOME: HOME, QS_LLAMA_SERVER: path.join(__dirname, 'fakes', 'llama-server'), QS_SD_BIN: path.join(__dirname, 'fakes', 'sd'), QS_SCAN_DIRS: path.join(HOME, 'nothing-here') } });
  const win = await app.firstWindow();
  const errors = [];
  win.on('pageerror', (e) => errors.push(e.message));
  await win.waitForSelector('text=Forms to fit your work.');
  await win.waitForFunction(() => S.data?.prefs?.defaultTarget === 'stack:quicksilver', null, { timeout: 60000 });
  await win.evaluate(() => { document.querySelector('#wc-close')?.click(); });

  // Files that are not chat models are off the list (and still on disk).
  const ids = await win.evaluate(() => S.installed.map((m) => m.id).sort());
  assert.deepEqual(ids, ['imp-dolphin', 'imp-llama', 'starter', 'starter-brain'], 'the video model and its text encoder are no longer listed as chat models');
  assert.ok(fs.existsSync(path.join(HOME, 'Downloads', 'Quicksilver models', 'wan2.2-5b.gguf')) && fs.existsSync(path.join(other, 'encoder-q4.gguf')), 'no file is deleted');

  // The Liquid Edition is pure: models from other apps are not on its team, never picked by
  // Automatic, never the checker, even the uncensored one.
  const pure = await win.evaluate(() => {
    const st = S.stacks.find((x) => x.id === 'quicksilver');
    const c = { id: 'x', messages: [], assistantId: S.data.assistants[0].id };
    return { team: JSON.stringify([st.members, st.bench || '']), dolphin: mayUse('local:imp-dolphin', 'stack:quicksilver'), llama: mayUse('local:imp-llama', 'stack:quicksilver'), own: mayUse('local:starter', 'stack:quicksilver'),
      auto: autoPick(c, S.data.assistants[0], 'Explain how tides work in detail, step by step.', false).target, checker: pickChecker('stack:quicksilver'), inUse: S.installed.filter((m) => m.inUse).map((m) => m.id) };
  });
  assert.ok(!/imp-/.test(pure.team), `the Liquid Edition has only its own models: ${pure.team}`);
  assert.deepEqual([pure.dolphin, pure.llama, pure.own], [false, false, true]);
  assert.equal(pure.auto, 'stack:quicksilver', 'Automatic stays with the stack');
  assert.ok(!/imp-/.test(String(pure.checker)), `the double-check stays inside the stack: ${pure.checker}`);
  assert.deepEqual(pure.inUse, [], 'nothing is ticked by itself');

  // Models → On this PC → "Models in use": the stack's own models are locked on; the rest unticked.
  await win.evaluate(() => { go({ view: 'models' }); });
  await win.waitForSelector('#models-in-use');
  const rows = await win.evaluate(() => [...document.querySelectorAll('#models-in-use [data-use-model]')].map((b) => `${b.dataset.useModel}:${b.checked ? 'on' : 'off'}${b.disabled ? ':locked' : ''}`).sort());
  assert.deepEqual(rows, ['imp-dolphin:off', 'imp-llama:off', 'starter-brain:on:locked', 'starter:on:locked']);
  assert.match(await win.locator('#models-in-use').innerText(), /Quicksilver Liquid Edition, nothing else/);

  // Tick the uncensored one: it is in use, and joins the Liquid Edition's helpers (or its bench).
  await win.click('#models-in-use [data-use-model="imp-dolphin"]');
  await win.waitForFunction(() => S.installed.find((m) => m.id === 'imp-dolphin')?.inUse === true && document.querySelector('#models-in-use [data-use-model="imp-dolphin"]')?.checked, null, { timeout: 30000 });
  const ticked = await win.evaluate(() => {
    const st = S.stacks.find((x) => x.id === 'quicksilver');
    return { team: JSON.stringify([st.members, st.bench || '']), dolphin: mayUse('local:imp-dolphin', 'stack:quicksilver'), llama: mayUse('local:imp-llama', 'stack:quicksilver'), note: document.querySelector('#models-in-use').innerText };
  });
  assert.ok(/imp-dolphin/.test(ticked.team), `a ticked abliterated model joins the Liquid Edition: ${ticked.team}`);
  assert.ok(!/imp-llama/.test(ticked.team), 'a filtered model never does');
  assert.deepEqual([ticked.dolphin, ticked.llama], [true, false]);
  // A filtered model can be ticked too (Automatic may pick it for other chats); the Liquid
  // Edition still never uses it.
  await win.click('#models-in-use [data-use-model="imp-llama"]');
  await win.waitForFunction(() => S.installed.find((m) => m.id === 'imp-llama')?.inUse === true, null, { timeout: 30000 });
  const mixed = await win.evaluate(() => ({ team: JSON.stringify(S.stacks.find((x) => x.id === 'quicksilver').members), checker: String(pickChecker('stack:quicksilver')) }));
  assert.ok(!/imp-llama/.test(mixed.team) && !/imp-llama/.test(mixed.checker), 'the Liquid Edition stays uncensored-only');

  // Untick: back to the stack's own models, and the choice is remembered.
  await win.click('#models-in-use [data-use-model="imp-dolphin"]');
  await win.waitForFunction(() => S.installed.find((m) => m.id === 'imp-dolphin')?.inUse === false && !/imp-dolphin/.test(JSON.stringify(S.stacks.find((x) => x.id === 'quicksilver'))), null, { timeout: 30000 });
  const saved = JSON.parse(fs.readFileSync(path.join(HOME, 'models.json'), 'utf8'));
  assert.equal(saved.find((m) => m.id === 'imp-dolphin').use, false); assert.equal(saved.find((m) => m.id === 'imp-llama').use, true);
  assert.deepEqual(errors, []);
  await app.close();
  fs.rmSync(HOME, { recursive: true, force: true });
  console.log('✓ Models in use: a stack uses only its own models; ticking a model lets Quicksilver use it; files that are not chat models are off the list');
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
