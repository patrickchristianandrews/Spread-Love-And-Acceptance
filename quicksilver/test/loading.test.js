// Models stay loaded longer and start with room to grow, so chats you already used stay quick.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
process.env.QUICKSILVER_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-load-'));
const store = require('../src/main/store');
const llama = require('../src/main/llama');

// Graphics-card layers: a second model gets the room that is really left. The free-memory reading
// may already include the first model, so it is never taken off twice.
{
  const GB = 1024 ** 3;
  const second = { size: 5 * GB, layers: 32 };
  // A 12 GB card with a 4 GB model loaded. Read before that model loaded (12 free) or after (8 free):
  // either way about 6.4 GB is usable, so a 5 GB model fits whole.
  assert.equal(llama.gpuLayers({}, second, { vramGB: 12, vramFreeGB: 12 }, 'auto', 4), 999);
  assert.equal(llama.gpuLayers({}, second, { vramGB: 12, vramFreeGB: 8 }, 'auto', 4), 999, 'not counted twice');
  // A 7 GB model does not fit beside it: part of it goes on the card, the rest on the processor.
  const part = llama.gpuLayers({}, { size: 7 * GB, layers: 32 }, { vramGB: 12, vramFreeGB: 8 }, 'auto', 4);
  assert.ok(part > 20 && part < 32, `a share of the layers: ${part}`);
  assert.equal(llama.gpuLayers({}, second, { vramGB: 12, vramFreeGB: 12 }, 'cpu', 0), 0);
  assert.equal(llama.gpuLayers({}, second, { vramGB: 0 }, 'auto', 0), 0, 'no graphics card');
}
assert.equal(llama.roomyContext(4096, 32768, 10), 32768, 'plenty of memory: starts at 32K');
assert.equal(llama.roomyContext(4096, 32768, 5), 16384, 'some memory: starts at 16K');
assert.equal(llama.roomyContext(4096, 32768, 1), 4096, 'tight memory: smallest size that fits');
assert.equal(llama.roomyContext(4096, 8192, 10), 8192, 'never above the Conversation memory setting');
assert.equal(llama.roomyContext(65536, 32768, 10), 65536, 'a long chat still gets what it needs');
store.saveConfig({ keepLoaded: 0 });
assert.equal(llama.idleMs(), Infinity, 'until Quicksilver closes');
store.saveConfig({ keepLoaded: 240 });
assert.equal(llama.idleMs(), 240 * 60 * 1000, '4 hours');
store.saveConfig({ keepLoaded: null });
assert.ok(llama.idleMs() >= 20 * 60 * 1000, 'automatic: at least 20 minutes');

(async () => {
  const TINY = path.join(__dirname, 'fixtures', 'tiny.gguf');
  const m = { id: 't', name: 'Tiny', file: TINY };
  // The stand-in engine notes its process id each time one is started.
  process.env.QS_SPAWN_LOG = path.join(process.env.QUICKSILVER_HOME, 'spawns.log');
  const started = () => (fs.existsSync(process.env.QS_SPAWN_LOG) ? fs.readFileSync(process.env.QS_SPAWN_LOG, 'utf8').split('\n').filter(Boolean).map(Number) : []);
  const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };

  // 1. Three callers at once (the warm-up, read-ahead and the message, when a chat opens): one
  //    engine is started, all three share it, and nothing is left running after stopAll.
  process.env.QS_LLAMA_SERVER = path.join(__dirname, 'fakes', 'llama-server');
  const small = { contextSize: 2048, limit: 2048 };
  const [a, b, c] = await Promise.all([llama.ensure(m, small), llama.ensure(m, small), llama.ensure(m, { contextSize: 1024, limit: 2048 })]);
  assert.equal(started().length, 1, 'one engine for three callers'); assert.ok(a === b && b === c);
  // A caller that needs more room while the model is answering waits for the answer to finish.
  a.busy = 1;
  let restarted = false;
  const bigger = llama.ensure(m, { contextSize: 4096, limit: 4096 }).then((s) => { restarted = true; return s; });
  await new Promise((r) => setTimeout(r, 600));
  assert.equal(restarted, false, 'a busy model is not reloaded underneath its answer'); assert.equal(a.exited, false);
  a.busy = 0;
  const grown = await bigger;
  assert.ok(grown !== a && grown.ctx === 4096 && started().length === 2, 'once the answer is done it reloads with more room');
  llama.stopAll();
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(started().filter(alive).length, 0, 'no engine left running');

  // 2. "Stop model" while it is still reading the prompt is not a graphics-card failure: the chat
  //    says the model was stopped, and the model stays on the graphics card afterwards.
  process.env.QS_LLAMA_SERVER = path.join(__dirname, 'fakes', 'llama-slow');
  const m2 = { id: 't2', name: 'Tiny Two', file: path.join(os.tmpdir(), `qs-tiny2-${Date.now()}.gguf`) };
  fs.copyFileSync(TINY, m2.file);
  setTimeout(() => llama.stopFile(m2.file), 1200);
  let err = null;
  try { for await (const ev of llama.chat(m2, { messages: [{ role: 'user', content: 'hi' }] })) void ev; } catch (e) { err = e; }
  assert.match(String(err?.message), /was stopped before it answered/);
  const again = await llama.ensure(m2, { contextSize: 2048 });
  assert.ok(again.layers > 0, 'still on the graphics card after a deliberate stop');
  llama.stopAll();

  // 3. A full disk fails the download with a clear message instead of hanging it for ever.
  if (fs.existsSync('/dev/full')) {
    const io = require('../src/main/engines');
    const out = io.openForWrite('/dev/full');
    let werr = null;
    try { for (let i = 0; i < 60; i++) await io.writeChunk(out, Buffer.alloc(1 << 20)); if (out.writeError) throw out.writeError; } catch (e) { werr = e; }
    await io.closeWrite(out);
    assert.equal(werr?.code, 'ENOSPC'); assert.match(io.diskError(werr).message, /disk is full/);
  }

  // 4. Two downloads that share a file (Wan 2.2 and its Turbo share a decoder) fetch it once and
  //    both finish; a finished-but-unrenamed part is completed without downloading again.
  const models = require('../src/main/models');
  const realFetch = globalThis.fetch; let calls = 0;
  const body = Buffer.alloc(300000, 5);
  globalThis.fetch = async (url) => { calls++; await new Promise((r) => setTimeout(r, 150)); return new Response(new ReadableStream({ async start(ctl) { for (let i = 0; i < 3; i++) { ctl.enqueue(body.subarray(i * 100000, (i + 1) * 100000)); await new Promise((r) => setTimeout(r, 60)); } ctl.close(); } }), { status: 200, headers: { 'content-length': String(body.length) } }); };
  const item = { role: 'vae', repo: 'someone/shared', path: 'vae.safetensors', size: body.length };
  const run = (id) => new Promise((resolve, reject) => models.start({ id, name: id, kind: 'video', items: [item] }, (ev, d) => { if (d.id !== id) return; if (ev === 'models:done') resolve(d.model); if (ev === 'models:error') reject(new Error(d.message)); }));
  const [x, y] = await Promise.all([run('wan-a'), run('wan-b')]);
  assert.equal(calls, 1, 'the shared file is downloaded once'); assert.equal(x.files.vae, y.files.vae);
  assert.equal(fs.statSync(x.files.vae).size, body.length, 'and is intact');
  const dest2 = path.join(path.dirname(x.files.vae), 'other.safetensors');
  fs.writeFileSync(`${dest2}.part`, body); calls = 0;
  await new Promise((resolve, reject) => models.start({ id: 'wan-c', name: 'c', kind: 'video', items: [{ role: 'vae', repo: 'someone/shared', path: 'other.safetensors', size: body.length }] }, (ev, d) => { if (ev === 'models:done') resolve(); if (ev === 'models:error') reject(new Error(d.message)); }));
  assert.equal(calls, 0, 'a finished part is completed without downloading again'); assert.ok(fs.existsSync(dest2));
  globalThis.fetch = realFetch;

  console.log('✓ loading: models kept loaded (setting), roomy start context, one engine per model, a busy model is never reloaded, a deliberate stop is not a graphics-card failure, a full disk fails cleanly, shared files download once');
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
