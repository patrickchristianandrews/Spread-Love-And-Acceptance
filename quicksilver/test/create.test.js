// Create (pictures and video): the things that used to make it "get to 100% and produce nothing".
// One job at a time, graphics memory freed first, a low-memory second try, a blank picture is a
// failure, the bar stops short of 100% until the file exists, and every failure says why.
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const assert = require('node:assert/strict');
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-create-'));
process.env.QUICKSILVER_HOME = HOME;
process.env.QS_LLAMA_SERVER = path.join(__dirname, 'fakes', 'llama-server');
process.env.QS_SD_BIN = path.join(__dirname, 'fakes', 'sd');
const SDLOG = path.join(HOME, 'sd.log');
process.env.QS_SD_LOG = SDLOG;
const models = require('../src/main/models');
const media = require('../src/main/media');
const llama = require('../src/main/llama');
const complete = require('../src/main/complete');
const catalog = require('../src/shared/catalog');
const TINY = path.join(__dirname, 'fixtures', 'tiny.gguf');
const put = (n) => { const p = path.join(HOME, n); fs.copyFileSync(TINY, p); return p; };
const runs = () => (fs.existsSync(SDLOG) ? fs.readFileSync(SDLOG, 'utf8').trim().split('\n').filter(Boolean) : []);
const collect = async (gen) => { let text = ''; for await (const ev of gen) if (ev.type === 'text') text += ev.text; return text; };

(async () => {
  models.add({ id: 'lustify', name: 'Lustify', kind: 'image', catalogId: 'lustify', files: { model: put('lustify.safetensors'), vae: put('vae.safetensors') }, size: 7e9 });
  models.add({ id: 'wan', name: 'Wan 2.2 5B', kind: 'video', catalogId: 'wan2.2-5b', files: { diffusion: put('wan.gguf'), vae: put('wan-vae.safetensors'), t5xxl: put('umt5.gguf') }, size: 9e9 });
  models.add({ id: 'chat', name: 'Qwen3 8B', kind: 'text', catalogId: 'qwen3-8b', files: { model: put('chat.gguf') }, size: 5e9 });
  const lustify = catalog.MEDIA_MODELS.find((m) => m.id === 'lustify');
  const wan = catalog.MEDIA_MODELS.find((m) => m.id === 'wan2.2-5b');
  const has = (f) => ['--offload-to-cpu', '--vae-tiling', '--temporal-tiling', '--max-vram', '--fps', '--flow-shift', '--video-frames'].includes(f);

  // ---- the engine's settings: sizes and memory savings that fit the card ----
  {
    const files = { diffusion: 'd', vae: 'v', t5xxl: 't' };
    const on8 = media.sdArgs({ prompt: 'waves', width: 1280, height: 704, frames: 81 }, { spec: wan, files, hw: { vramGB: 8, ramGB: 32 }, has, out: 'o.webm' });
    assert.deepEqual([on8.width, on8.height, on8.frames], [832, 480, 49], 'on an 8 GB card a clip is made at 480p and at most about 3 seconds');
    for (const f of ['--offload-to-cpu', '--vae-tiling', '--temporal-tiling', '--max-vram']) assert.ok(on8.args.includes(f), `video on 8 GB uses ${f}`);
    assert.ok(on8.notes.length >= 1, 'and says so');
    const tall = media.sdArgs({ prompt: 'x', width: 704, height: 1280 }, { spec: wan, files, hw: { vramGB: 12, ramGB: 32 }, has, out: 'o.webm' });
    assert.deepEqual([tall.width, tall.height], [480, 832], 'a vertical clip stays vertical');
    const on24 = media.sdArgs({ prompt: 'x', width: 1280, height: 704, frames: 81 }, { spec: wan, files, hw: { vramGB: 24, ramGB: 64 }, has, out: 'o.webm' });
    assert.deepEqual([on24.width, on24.height, on24.frames], [1280, 704, 81], 'a 24 GB card gets the full size');
    const safe = media.sdArgs({ prompt: 'x', width: 1280, height: 704, frames: 81 }, { spec: wan, files, hw: { vramGB: 24, ramGB: 64 }, has, safe: true, out: 'o.webm' });
    assert.deepEqual([safe.width, safe.height, safe.frames], [832, 480, 33], 'the second try is always small');
    const pf = { model: 'm', vae: 'v' };
    const pic8 = media.sdArgs({ prompt: 'a fox', width: 1024, height: 1024 }, { spec: lustify, files: pf, hw: { vramGB: 8, ramGB: 16 }, has, out: 'o.png' });
    assert.ok(pic8.args.includes('--vae-tiling'), 'a picture on an 8 GB card is decoded in tiles');
    const pic24 = media.sdArgs({ prompt: 'a fox', width: 1024, height: 1024 }, { spec: lustify, files: pf, hw: { vramGB: 24, ramGB: 64 }, has, out: 'o.png' });
    assert.ok(!pic24.args.includes('--offload-to-cpu') && !pic24.args.includes('--vae-tiling'), 'a big card runs it straight');
    // ⚡ Speed helpers (both proved on the real engine by the build's proofs run). With the 8-step
    // file here, Lustify paints in fast mode where a picture would otherwise take long: with no
    // graphics card, or whenever asked. Not on a quick card by itself, never for an edit, never
    // when you set the steps yourself, and never on the second try after a failure.
    const help = { lightning: '/h/sdxl_lightning_8step_lora.safetensors', taeWan: '/h/taew2_2.safetensors' };
    const has2 = (f) => has(f) || ['--tae', '--lora-model-dir', '--scheduler'].includes(f);
    const val = (a, flag) => a.args[a.args.indexOf(flag) + 1];
    const slow = media.sdArgs({ prompt: 'a fox', negative: 'blurry' }, { spec: lustify, files: pf, hw: { vramGB: 0, ramGB: 16 }, has: has2, out: 'o.png', help });
    assert.ok(slow.fast, 'no graphics card: fast mode by itself');
    assert.deepEqual([val(slow, '--steps'), val(slow, '--cfg-scale'), val(slow, '--sampling-method'), val(slow, '--scheduler'), val(slow, '--lora-model-dir'), val(slow, '-p')], ['8', '1', 'euler', 'sgm_uniform', '/h', 'a fox<lora:sdxl_lightning_8step_lora:1>']);
    assert.ok(!slow.args.includes('-n') && /fast mode/.test(slow.notes.join()), 'fast mode has no "avoid" list, and says it is on');
    const quick = media.sdArgs({ prompt: 'a fox' }, { spec: lustify, files: pf, hw: { vramGB: 24, ramGB: 64 }, has: has2, out: 'o.png', help });
    assert.ok(!quick.fast && val(quick, '--steps') === String(lustify.defaults.steps), 'a quick card paints at full quality by itself');
    assert.ok(media.sdArgs({ prompt: 'a fox', fast: true }, { spec: lustify, files: pf, hw: { vramGB: 24, ramGB: 64 }, has: has2, out: 'o.png', help }).fast, '…and in fast mode when asked');
    for (const [why, req, opts] of [['an edit', { prompt: 'x', image: 'p.png' }, {}], ['your own steps', { prompt: 'x', steps: 20 }, {}], ['the second try', { prompt: 'x', plain: true }, {}], ['no helper file', { prompt: 'x' }, { help: {} }], ['an engine without the option', { prompt: 'x' }, { has }]]) {
      assert.ok(!media.sdArgs(req, { spec: lustify, files: pf, hw: { vramGB: 0, ramGB: 16 }, has: has2, out: 'o.png', help, ...opts }).fast, `no fast mode for ${why}`);
    }
    // The quick decoder for Wan 2.2: for a clip made from a description on a card under 16 GB.
    const tae8 = media.sdArgs({ prompt: 'waves' }, { spec: wan, files, hw: { vramGB: 8, ramGB: 32 }, has: has2, out: 'o.webm', help });
    assert.ok(tae8.tae && val(tae8, '--tae') === '/h/taew2_2.safetensors' && !tae8.args.includes('--vae') && !tae8.args.includes('--vae-tiling') && !tae8.args.includes('--temporal-tiling'), 'the quick decoder takes the place of the full one and its tiling');
    assert.ok(!media.sdArgs({ prompt: 'waves' }, { spec: wan, files, hw: { vramGB: 24, ramGB: 64 }, has: has2, out: 'o.webm', help }).tae, 'a 24 GB card keeps the full decoder');
    const fromPhoto = media.sdArgs({ prompt: 'waves', image: 'p.png' }, { spec: wan, files, hw: { vramGB: 8, ramGB: 32 }, has: has2, out: 'o.webm', help });
    assert.ok(!fromPhoto.tae && fromPhoto.args.includes('--vae'), 'a clip that starts from a photo keeps the full decoder (it reads the photo)');
    assert.ok(!media.sdArgs({ prompt: 'waves', plain: true }, { spec: wan, files, hw: { vramGB: 8, ramGB: 32 }, has: has2, safe: true, out: 'o.webm', help }).tae, 'the second try after a failure uses the full decoder');
    assert.ok(!media.sdArgs({ prompt: 'waves' }, { spec: wan, files, hw: { vramGB: 8, ramGB: 32 }, has, out: 'o.webm', help }).tae, 'an engine without the option keeps the full decoder');
    // Without the files nothing changes; with them in the data folder they are found.
    assert.deepEqual(media.helpers(), { lightning: null, taeWan: null });
    const hdir = path.join(HOME, 'models', 'helpers'); fs.mkdirSync(hdir, { recursive: true });
    fs.writeFileSync(path.join(hdir, 'taew2_2.safetensors'), Buffer.alloc(6e6));
    fs.writeFileSync(path.join(hdir, 'sdxl_lightning_8step_lora.safetensors'), Buffer.alloc(1000)); // a cut-off download is not used
    assert.deepEqual([Boolean(media.helpers().taeWan), media.helpers().lightning], [true, null]);
    fs.rmSync(hdir, { recursive: true, force: true });
    const picSafe = media.sdArgs({ prompt: 'a fox', width: 1536, height: 1024 }, { spec: lustify, files: pf, hw: { vramGB: 24, ramGB: 64 }, has, safe: true, out: 'o.png' });
    assert.ok(picSafe.width * picSafe.height <= 1024 * 1024 * 1.06 && picSafe.width > picSafe.height && picSafe.args.includes('--max-vram'), 'the second try of a picture is no bigger than 1024×1024 and keeps its shape');
    const old = media.sdArgs({ prompt: 'a fox' }, { spec: lustify, files: pf, hw: { vramGB: 8, ramGB: 16 }, has: () => false, out: 'o.png' });
    assert.ok(!old.args.some((a) => ['--offload-to-cpu', '--vae-tiling', '--max-vram'].includes(a)), 'an older engine is never given options it does not have');
    console.log('✓ engine settings: clip sizes that fit the card, tiled decoding, low-memory second try, nothing an old engine lacks');
  }

  // ---- progress stops short of 100% until the file exists; the finishing phase is named ----
  {
    const seen = []; const said = [];
    const item = await media.generate('p1', { modelId: 'lustify', prompt: 'a lighthouse', width: 256, height: 256, steps: 4 }, { onProgress: (v) => seen.push(v), onStatus: (t) => said.push(t) });
    assert.ok(fs.existsSync(item.file) && item.kind === 'image');
    assert.ok(seen.length >= 3 && Math.max(...seen) < 1, `the bar never reaches 100% by itself (max ${Math.max(...seen)})`);
    assert.ok(seen.every((v, k) => k === 0 || v >= seen[k - 1]), 'and never goes backwards within a run');
    assert.ok(said.some((t) => /Finishing: turning it into a picture/.test(t)), `the last phase is named: ${said.join(' | ')}`);
    console.log('✓ progress: stops short of 100% until the picture exists, with the finishing phase named');
  }

  // ---- one at a time: two jobs started together never run together ----
  {
    fs.rmSync(SDLOG, { force: true });
    process.env.QS_SD_SLOW = '150';
    const said = [];
    const [a, b] = await Promise.all([
      media.generate('q1', { modelId: 'lustify', prompt: 'one', width: 256, height: 256, steps: 3 }),
      media.generate('q2', { modelId: 'lustify', prompt: 'two', width: 256, height: 256, steps: 3 }, { onStatus: (t) => said.push(t) }),
    ]);
    delete process.env.QS_SD_SLOW;
    assert.ok(a.file && b.file);
    const order = runs().map((l) => l.split(' ')[0]);
    assert.deepEqual(order, ['start', 'end', 'start', 'end'], `the second waits for the first: ${order.join(' ')}`);
    assert.match(said[0], /Waiting for the one before it/);
    // A job stopped while it waits never runs.
    fs.rmSync(SDLOG, { force: true });
    process.env.QS_SD_SLOW = '150';
    const first = media.generate('q3', { modelId: 'lustify', prompt: 'one', width: 256, height: 256, steps: 3 });
    const second = media.generate('q4', { modelId: 'lustify', prompt: 'two', width: 256, height: 256, steps: 3 });
    media.stop('q4');
    await assert.rejects(second, /Stopped/);
    await first;
    delete process.env.QS_SD_SLOW;
    assert.equal(runs().filter((l) => l.startsWith('start')).length, 1, 'the stopped one was never started');
    console.log('✓ one job at a time; a job stopped while waiting never runs');
  }

  // ---- out of memory at the end: tried again in low-memory mode, and the picture arrives ----
  {
    fs.rmSync(SDLOG, { force: true });
    process.env.QS_SD_FAIL_ONCE = path.join(HOME, 'failed-once');
    const said = [];
    const item = await media.generate('r1', { modelId: 'lustify', prompt: 'a fox', width: 1024, height: 1024, steps: 3 }, { onStatus: (t) => said.push(t) });
    delete process.env.QS_SD_FAIL_ONCE;
    assert.ok(fs.existsSync(item.file), 'the second try made the picture');
    const starts = runs().filter((l) => l.startsWith('start'));
    assert.equal(starts.length, 2);
    assert.ok(/--max-vram -1/.test(starts[1]) && /--offload-to-cpu/.test(starts[1]) && /--vae-tiling/.test(starts[1]), 'with every memory saving on');
    assert.ok(said.some((t) => /not enough graphics memory\. Trying once more/i.test(t)) && said.some((t) => /^Second try, low-memory settings/.test(t)), `and it says so: ${said.join(' | ')}`);
    console.log('✓ a job that runs out of graphics memory at the end is tried again in low-memory mode');
  }

  // ---- failures that stay failures say why, in plain words ----
  {
    process.env.QS_SD_FAIL = 'memory';
    await assert.rejects(media.generate('f1', { modelId: 'lustify', prompt: 'x', width: 256, height: 256, steps: 2 }), /Not enough graphics memory for .*even with the chat model closed/);
    process.env.QS_SD_FAIL = 'crash';
    await assert.rejects(media.generate('f2', { modelId: 'lustify', prompt: 'x', width: 256, height: 256, steps: 2 }), /stopped before the picture was finished: .*something went badly wrong/);
    process.env.QS_SD_FAIL = 'nofile';
    await assert.rejects(media.generate('f3', { modelId: 'lustify', prompt: 'x', width: 256, height: 256, steps: 2 }), /stopped before the picture was finished: .*made no file|stopped before the picture was finished/);
    process.env.QS_SD_FAIL = 'blank';
    await assert.rejects(media.generate('f4', { modelId: 'lustify', prompt: 'x', width: 256, height: 256, steps: 2 }), /made a blank picture twice/);
    delete process.env.QS_SD_FAIL;
    assert.match(fs.readFileSync(path.join(HOME, 'logs', 'create-last-failure.log'), 'utf8'), /Lustify/, 'what the engine said is kept for diagnostics');
    // Stopped by you: not an error to explain, and never retried.
    fs.rmSync(SDLOG, { force: true });
    process.env.QS_SD_SLOW = '300';
    const p = media.generate('s1', { modelId: 'lustify', prompt: 'x', width: 256, height: 256, steps: 6 });
    await new Promise((r) => setTimeout(r, 500));
    media.stop('s1');
    await assert.rejects(p, /^Error: Stopped\.$/);
    delete process.env.QS_SD_SLOW;
    assert.equal(runs().filter((l) => l.startsWith('start')).length, 1, 'a stopped job is not tried again');
    console.log('✓ failures say why (memory, a crash, no file, a blank picture); a stopped job is just stopped');
  }

  // ---- a loaded chat model gives the graphics card back when the picture needs it ----
  {
    await collect(complete.run('local:chat', { messages: [{ role: 'user', content: 'hello' }], maxTokens: 20, contextSize: 2048 }));
    assert.ok(llama.gpuHeld() > 0, 'the chat model is on the graphics card');
    const said = [];
    const item = await media.generate('g1', { modelId: 'lustify', prompt: 'a fox', width: 256, height: 256, steps: 2 }, { onStatus: (t) => said.push(t) });
    assert.ok(fs.existsSync(item.file));
    assert.equal(llama.gpuHeld(), 0, 'it was unloaded to make room (it loads again on the next message)');
    assert.ok(said.some((t) => /Making room on the graphics card/.test(t)));
    const again = await collect(complete.run('local:chat', { messages: [{ role: 'user', content: 'hello again' }], maxTokens: 20, contextSize: 2048 }));
    assert.match(again, /Answer from/, 'and chat works again afterwards');
    llama.stopAll();
    console.log('✓ a loaded chat model hands the graphics card to the picture, then loads again when you chat');
  }

  // ---- video: made, converted to MP4, at a size that fits ----
  {
    const said = [];
    const item = await media.generate('v1', { modelId: 'wan', prompt: 'waves', width: 1280, height: 704, frames: 33, steps: 2 }, { onStatus: (t) => said.push(t) });
    assert.ok(item.kind === 'video' && /\.mp4$/.test(item.file) && fs.statSync(item.file).size > 500);
    assert.deepEqual([item.width, item.height], [832, 480]);
    assert.ok(said.some((t) => /832×480, which fits this graphics card/.test(t)) && said.some((t) => /Saving the video/.test(t)));
    console.log('✓ video: made at a size that fits the card and saved as an MP4');
  }
  assert.equal(media.looksBlank(path.join(__dirname, 'fixtures', 'tiny.gguf')), false, 'only pictures are judged');
  llama.stopAll(); media.stopAll();
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
