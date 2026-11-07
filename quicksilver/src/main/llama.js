// Runs local text and vision models with llama.cpp's llama-server, one process per loaded model.
// Several models can stay loaded at once while they fit in memory; the least recently used is
// stopped to make room. Each server speaks the OpenAI chat format on 127.0.0.1.
const { spawn, execFile } = require('node:child_process');
const net = require('node:net');
const fs = require('node:fs');
const engines = require('./engines');
const hardware = require('./hardware');
const oai = require('./oai');
const speeds = require('./speeds');

// ---------- GGUF header reader (layer count, context length, name) ----------

// Bytes per weight for the common GGML types (block size / weights per block).
const TYPE_BYTES = { 0: 4, 1: 2, 2: 18 / 32, 3: 20 / 32, 6: 22 / 32, 7: 24 / 32, 8: 34 / 32, 10: 84 / 256, 11: 110 / 256, 12: 144 / 256, 13: 176 / 256, 14: 210 / 256, 15: 292 / 256, 30: 2, 39: 17 / 32 };

async function readGguf(file) {
  const fh = await fs.promises.open(file, 'r');
  const CHUNK = 1 << 20;
  let buf = Buffer.alloc(0);
  let fileOff = 0;
  let pos = 0;
  async function need(n) {
    while (buf.length - pos < n) {
      const b = Buffer.alloc(CHUNK);
      const { bytesRead } = await fh.read(b, 0, CHUNK, fileOff);
      if (!bytesRead) throw new Error('Unexpected end of model file');
      fileOff += bytesRead;
      buf = Buffer.concat([buf.subarray(pos), b.subarray(0, bytesRead)]);
      pos = 0;
    }
  }
  const u32 = async () => { await need(4); const v = buf.readUInt32LE(pos); pos += 4; return v; };
  const u64 = async () => { await need(8); const v = Number(buf.readBigUInt64LE(pos)); pos += 8; return v; };
  const str = async () => { const n = await u64(); await need(n); const s = buf.toString('utf8', pos, pos + n); pos += n; return s; };
  const SIZES = { 0: 1, 1: 1, 2: 2, 3: 2, 4: 4, 5: 4, 6: 4, 7: 1, 10: 8, 11: 8, 12: 8 };
  async function value(type) {
    if (type === 8) return str();
    if (type === 9) {
      const t = await u32();
      const n = await u64();
      if (t === 8) { for (let i = 0; i < n; i++) await str(); return `[${n} strings]`; }
      const size = SIZES[t];
      if (!size) throw new Error('Unsupported GGUF array');
      let left = n * size;
      while (left > 0) { const step = Math.min(left, CHUNK); await need(step); pos += step; left -= step; }
      return `[${n} values]`;
    }
    const size = SIZES[type];
    await need(size);
    let v;
    switch (type) {
      case 0: v = buf.readUInt8(pos); break; case 1: v = buf.readInt8(pos); break;
      case 2: v = buf.readUInt16LE(pos); break; case 3: v = buf.readInt16LE(pos); break;
      case 4: v = buf.readUInt32LE(pos); break; case 5: v = buf.readInt32LE(pos); break;
      case 6: v = buf.readFloatLE(pos); break; case 7: v = buf.readUInt8(pos) !== 0; break;
      case 10: v = Number(buf.readBigUInt64LE(pos)); break; case 11: v = Number(buf.readBigInt64LE(pos)); break;
      case 12: v = buf.readDoubleLE(pos); break;
    }
    pos += size;
    return v;
  }
  try {
    await need(4);
    if (buf.toString('ascii', 0, 4) !== 'GGUF') throw new Error('Not a GGUF model file');
    pos = 4;
    await u32(); // version
    const tensorCount = await u64();
    const kvCount = await u64();
    const meta = {};
    for (let i = 0; i < kvCount; i++) {
      const key = await str();
      const type = await u32();
      meta[key] = await value(type);
    }
    const arch = meta['general.architecture'];
    // Tensor list: the data of the last tensor must end inside the file, or the download was cut off.
    let lastOff = -1; let lastN = 0; let lastType = 0;
    for (let i = 0; i < tensorCount; i++) {
      await str();
      const dims = await u32();
      let n = 1;
      for (let d = 0; d < dims; d++) n *= await u64();
      const type = await u32();
      const off = await u64();
      if (off >= lastOff) { lastOff = off; lastN = n; lastType = type; }
    }
    const align = Number(meta['general.alignment']) || 32;
    const here = fileOff - (buf.length - pos);
    const dataStart = Math.ceil(here / align) * align;
    const size = (await fh.stat()).size;
    const needBytes = tensorCount ? dataStart + lastOff + Math.floor(lastN * (TYPE_BYTES[lastType] || 0)) : 0;
    return {
      name: meta['general.name'],
      architecture: arch,
      layers: meta[`${arch}.block_count`],
      experts: Number(meta[`${arch}.expert_count`]) || 0,
      contextLength: meta[`${arch}.context_length`],
      isProjector: arch === 'clip' || Boolean(meta['clip.has_vision_encoder']),
      size,
      complete: size >= needBytes,
      needBytes,
    };
  } finally {
    await fh.close();
  }
}

// ---------- server pool ----------

const servers = new Map(); // key -> { proc, port, file, sizeGB, lastUsed, ready, log }

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
    s.on('error', reject);
  });
}

function stop(key) {
  const s = servers.get(key);
  if (!s) return;
  servers.delete(key);
  try { s.proc.kill(); } catch {}
}
function stopAll() { for (const k of [...servers.keys()]) stop(k); }

async function waitReady(s, timeoutMs) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (s.exited) throw new Error(lastError(s.log) || 'The engine stopped while loading the model.');
    try {
      const r = await fetch(`http://127.0.0.1:${s.port}/health`, { signal: AbortSignal.timeout(2000) });
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('The model took too long to load.');
}

// The engine's last line is usually just "exiting due to model loading error"; the cause is
// a few lines earlier. Pick the most specific line and drop the timestamp and source prefixes.
function lastError(log) {
  const lines = log.join('').split('\n').map((l) => l.trim()).filter(Boolean);
  const clean = (l) => l.replace(/^[\d.:]+\s+[A-Z]\s+/, '').replace(/^(srv|main|common_init_from_params|llama_model_load(_from_file_impl)?|llama_init_from_model|load_model|gguf_init_from_file(_impl)?|ggml_\w+|clip_\w+|mtmd_\w+)\s*:?\s*/i, '').trim();
  const generic = /exiting due to|server_run|failed to load model, '|main: exiting|^error: failed to/i;
  const specific = [...lines].reverse().filter((l) => !generic.test(l));
  const hit = specific.find((l) => /error loading model|not within the file bounds|unexpected end|failed to (read|open|allocate|create)|out of memory|ErrorOutOfDeviceMemory|unknown model architecture|unsupported|invalid|corrupt|cannot|unable/i.test(l))
    || [...lines].reverse().find((l) => /error|failed/i.test(l));
  return hit ? clean(hit) : lines.slice(-2).join(' ');
}

// How many layers go on the graphics card: all if it fits, else a share, else none.
function gpuLayers(model, info, hw, setting, otherVramGB = 0) {
  if (setting === 0 || setting === 'cpu') return 0;
  if (!hw.vramGB) return 0;
  const sizeGB = (info.size + (model.mmprojSize || 0)) / 1024 ** 3;
  const free = (hw.vramFreeGB || hw.vramGB) * 0.9 - 0.8 - otherVramGB;
  if (free <= 0.5) return 0;
  if (sizeGB <= free) return 999;
  const layers = info.layers || 32;
  return Math.max(0, Math.floor((layers * free) / sizeGB));
}

// Which options this engine build understands (llama.cpp renames some now and then), read once
// from its --help.
const helpCache = new Map();
function engineHelp(bin) {
  if (!helpCache.has(bin)) helpCache.set(bin, new Promise((resolve) => execFile(bin, ['--help'], { windowsHide: true, timeout: 15000, maxBuffer: 4 << 20 }, (_e, out, err) => resolve(`${out || ''}${err || ''}`))));
  return helpCache.get(bin);
}
// The speculative-decoding options for this engine build, or null if it has none.
async function draftArgs(bin, draftFile, onGpu) {
  const help = await engineHelp(bin);
  const has = (flag) => help.includes(flag);
  if (!has('--model-draft') && !has('-md,')) return null;
  const args = ['--model-draft', draftFile];
  if (has('--gpu-layers-draft')) args.push('--gpu-layers-draft', onGpu ? '999' : '0');
  if (has('--spec-draft-n-max')) args.push('--spec-draft-n-max', '16');
  else if (/--draft-max\b(?![^\n]*removed)/.test(help)) args.push('--draft-max', '16');
  if (has('--spec-draft-n-min')) args.push('--spec-draft-n-min', '2');
  else if (/--draft-min\b(?![^\n]*removed)/.test(help)) args.push('--draft-min', '2');
  return args;
}

// Whether this engine build can keep a mixture-of-experts model's experts in normal memory.
const moeCache = new Map();
function cpuMoe(bin) { return moeCache.get(bin); }
async function checkCpuMoe(bin) { if (!moeCache.has(bin)) moeCache.set(bin, (await engineHelp(bin)).includes('--n-cpu-moe')); return moeCache.get(bin); }

// Models that failed to start with an 8-bit KV cache (they get a normal cache from then on),
// and models that failed to start with a draft model.
const kvPlain = new Set();
const noDraft = new Set();
const noLogprobs = new Set(); // engines that refused to report word probabilities

// Loads the rest of a stack's team in the background while the first model is writing, but only
// when everything fits in memory at once (never pushing out a model that's in use).
async function prefetch(list, { contextSize = 8192, gpu = 'auto' } = {}) {
  const hw = await hardware.detect();
  const budget = Math.max(hw.vramGB, 0) + hw.ramGB * 0.7 - 2;
  const loadedGB = [...servers.values()].reduce((t, s) => t + s.sizeGB, 0);
  const todo = list.filter((m) => !isLoaded(m.file));
  const needGB = todo.reduce((t, m) => t + (m.size || 0) / 1024 ** 3, 0);
  if (!todo.length || loadedGB + needGB > budget) return false;
  for (const m of todo) await ensure(m, { contextSize: Math.min(contextSize || 8192, 8192), gpu }).catch(() => {});
  return true;
}

// Context: the memory a model sets aside for the conversation. Reserving the maximum (often
// 32K tokens) wastes gigabytes on short chats, so each request asks for the smallest size that
// fits it, from these steps; the server is restarted bigger only when a chat grows past it.
const CTX_STEPS = [4096, 8192, 16384, 32768, 65536, 131072];
function contextFor(messages, maxTokens = 2048, limit = 32768) {
  const chars = messages.reduce((n, msg) => n + (typeof msg.content === 'string' ? msg.content.length : (msg.content || []).reduce((k, p) => k + (p.text?.length || 0) + (p.type === 'image_url' ? 3000 : 0), 0)), 0);
  const need = Math.ceil(chars / 3.2) + Math.min(maxTokens || 2048, 8192) + 512;
  return Math.min(limit, CTX_STEPS.find((c) => c >= need) || CTX_STEPS[CTX_STEPS.length - 1]);
}

// Models nobody has used for a while are unloaded, giving the memory back to the PC.
const IDLE_MS = 20 * 60 * 1000;
setInterval(() => { for (const [k, s] of [...servers.entries()]) if (Date.now() - s.lastUsed > IDLE_MS) stop(k); }, 60 * 1000).unref?.();

// Starts (or reuses) a server for a model. model = { id, file, mmproj?, ctx? }
async function ensure(model, { contextSize = 8192, gpu = 'auto', onStatus } = {}) {
  const key = `${model.file}|${gpu}`;
  if (model.draft && noDraft.has(model.file)) model = { ...model, draft: null };
  const existing = servers.get(key);
  if (existing && !existing.exited && existing.ctx >= Math.min(contextSize, existing.maxCtx || contextSize)) {
    existing.lastUsed = Date.now();
    await existing.ready;
    return existing;
  }
  if (existing) stop(key); // its context was too small for this conversation: restart it bigger
  const hw = await hardware.detect();
  const engine = engines.resolve('llama', hw);
  if (!engine) throw new Error('The text engine is missing. Reinstall Quicksilver, or download an engine in Settings → Engines.');
  let info;
  try { info = await readGguf(model.file); } catch (err) { throw damaged(model, err.message); }
  if (!info.complete) throw damaged(model, `the file is ${(info.size / 1024 ** 3).toFixed(2)} GB but should be at least ${(info.needBytes / 1024 ** 3).toFixed(2)} GB`);
  const sizeGB = info.size / 1024 ** 3;

  // Make room: stop least recently used servers until this one fits alongside the rest.
  const budget = Math.max(hw.vramGB, 0) + hw.ramGB * 0.7 - 2;
  const used = () => [...servers.values()].reduce((t, s) => t + s.sizeGB, 0);
  while (servers.size && used() + sizeGB > budget) {
    const oldest = [...servers.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed)[0];
    stop(oldest[0]);
  }

  const ctx = Math.min(contextSize, info.contextLength || contextSize);
  const otherVram = [...servers.values()].reduce((t, s) => t + (s.vramGB || 0), 0);
  const ngl = gpuLayers(model, info, hw, gpu, otherVram);
  // The model's working memory (KV cache) is stored at 8-bit: about half the memory, with no
  // noticeable change in answers. Engines that can't do it get a normal cache instead.
  let kvq = !kvPlain.has(model.file);
  let useDraft = Boolean(model.draft && fs.existsSync(model.draft));
  if (info.experts > 1 && ngl > 0 && ngl < 999) await checkCpuMoe(engine.bin);
  const start = async (layers) => {
    const port = await freePort();
    // --cache-reuse lets follow-up messages and stack steps reuse text the model already read.
    const args = ['-m', model.file, '--host', '127.0.0.1', '--port', String(port), '-c', String(ctx), '-ngl', String(layers), '--jinja', '--cache-reuse', '256'];
    // On the processor, keep the graphics card out of it completely (a broken or built-in GPU
    // driver can otherwise still fail the load even with no layers on it).
    if (!layers) args.push('--device', 'none');
    if (kvq) args.push('--cache-type-k', 'q8_0', '--cache-type-v', 'q8_0');
    // Mixture-of-experts models (like Qwen3 30B-A3B) that don't fit on the graphics card: keep
    // every layer's shared part on the card and only the experts that don't fit in memory, instead
    // of moving whole layers. Each word only uses a few experts, so this is often 2-3x faster.
    if (layers > 0 && layers < 999 && info.experts > 1 && cpuMoe(engine.bin)) {
      const blocks = info.layers || 32;
      const onCard = Math.max(0, Math.floor((layers - 0.12 * blocks) / 0.88));
      args[args.indexOf('-ngl') + 1] = '999';
      args.push('--n-cpu-moe', String(Math.max(1, blocks - onCard)));
    }
    // Speculative decoding with a small same-family model (see catalog.draftFor).
    if (useDraft) { const da = await draftArgs(engine.bin, model.draft, layers > 0); if (da) args.push(...da); else useDraft = false; }
    if (model.mmproj) args.push('--mmproj', model.mmproj);
    const proc = spawn(engine.bin, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const blocks = info.layers || 32;
    const vramGB = layers >= 999 ? sizeGB : layers ? (sizeGB * Math.min(layers, blocks)) / blocks : 0;
    const s = { proc, port, file: model.file, draft: useDraft ? model.draft : null, sizeGB, vramGB, lastUsed: Date.now(), log: [], ctx, maxCtx: info.contextLength || ctx, layers, exited: false };
    const keep = (d) => { s.log.push(d.toString()); if (s.log.length > 200) s.log.shift(); };
    proc.stdout.on('data', keep);
    proc.stderr.on('data', keep);
    proc.on('exit', () => { s.exited = true; if (servers.get(key) === s) servers.delete(key); });
    proc.on('error', (e) => { s.exited = true; s.log.push(String(e)); });
    servers.set(key, s);
    s.ready = waitReady(s, 600000);
    await s.ready;
    return s;
  };
  const t0 = Date.now();
  const tick = setInterval(() => onStatus?.(`Loading ${model.name || 'model'} into memory… ${Math.round((Date.now() - t0) / 1000)} s (only the first time)`), 1000);
  onStatus?.(`Loading ${model.name || 'model'} into memory${ngl ? '' : ' (on the processor)'}…`);
  try {
    try {
      try {
        return await start(ngl);
      } catch (err) {
        if (!useDraft || err?.code === 'damaged') throw err;
        // The draft model didn't work with this one: run without it from now on.
        stop(key); useDraft = false; noDraft.add(model.file);
        return await start(ngl);
      }
    } catch (err) {
      if (!kvq || err?.code === 'damaged') throw err;
      // This engine or device couldn't use the 8-bit cache: remember that, and use a normal one.
      stop(key); kvq = false; kvPlain.add(model.file);
      return await start(ngl);
    }
  } catch (err) {
    stop(key);
    if (ngl > 0 && err?.code !== 'damaged') {
      // Didn't fit on the graphics card: try again on the processor.
      onStatus?.(`Retrying ${model.name || 'model'} on the processor…`);
      try { return await start(0); } catch (e2) { stop(key); throw friendly(e2); }
    }
    throw friendly(err);
  } finally {
    clearInterval(tick);
  }
}

function damaged(model, why) {
  const e = new Error(`${model.name || 'This model'}'s file is incomplete or damaged (${why}), usually because the download was cut off. Open Models → On this PC and press Repair to fix it.`);
  e.code = 'damaged';
  return e;
}

function friendly(err) {
  const msg = String(err?.message || err);
  if (err?.code === 'damaged') return err;
  if (/not within the file bounds|unexpected end|tensor data|failed to read|corrupt|invalid magic|truncat/i.test(msg)) return new Error(`The model file is incomplete or damaged (${msg}). Open Models → On this PC and press Repair to download it again.`);
  if (/unknown model architecture|unsupported model/i.test(msg)) return new Error(`This model needs a newer engine (${msg}). Update it in Settings → Engines.`);
  if (/failed to open|no such file|cannot open/i.test(msg)) return new Error(`Quicksilver couldn't open the model file (${msg}). If it was moved or deleted, remove it under Models and add it again.`);
  if (/out of memory|failed to allocate|ErrorOutOfDeviceMemory|cudaMalloc/i.test(msg)) return new Error('Not enough memory to load this model. Try a smaller model, close other apps, or lower the context size.');
  if (/mmproj|clip/i.test(msg)) return new Error(`The vision part of this model failed to load: ${msg}`);
  return new Error(msg);
}

// Models that failed on the graphics card this session run on the processor from then on.
const cpuOnly = new Set();
const GPU_FAILURE = /decode|eval|vk::|vulkan|device lost|ErrorDeviceLost|CUDA error|ggml_backend|out of memory|failed to allocate|HTTP 5\d\d|Internal Server Error|socket hang up|fetch failed|ECONNRESET|terminated/i;

// Streams a chat from a local model. messages are OpenAI-format (images as image_url parts).
// If the graphics card fails before any text arrives, the model restarts on the processor
// and the request is retried once.
async function* chat(model, opts) {
  const { messages, temperature, maxTokens, contextSize, gpu, signal, onStatus, level, tools } = opts;
  const hasImages = messages.some((m) => Array.isArray(m.content) && m.content.some((p) => p.type === 'image_url'));
  if (hasImages && !model.mmproj) throw new Error(`${model.name} can't see images. Use a vision model or a stack with a vision member.`);
  const useGpu = cpuOnly.has(model.file) ? 0 : gpu;
  let produced = false;
  try {
    const s = await ensure(model, { contextSize: contextFor(messages, maxTokens, contextSize || 16384), gpu: useGpu, onStatus });
    s.lastUsed = Date.now();
    onStatus?.('');
    for await (const ev of oai.streamChat({
      baseUrl: `http://127.0.0.1:${s.port}/v1`,
      // Quick effort turns off "thinking" on models that support the switch (e.g. Qwen3).
      // Repetition guards: small models can loop ("wait, let me recheck…") until the length limit;
      // a light repeat penalty and the DRY sampler stop that without changing normal answers.
      body: { messages, temperature, max_tokens: maxTokens, cache_prompt: true, ...(noLogprobs.has(model.file) || tools?.length ? {} : { logprobs: true }), repeat_penalty: 1.07, dry_multiplier: 0.8, dry_base: 1.75, dry_allowed_length: 3, ...(tools?.length ? { tools } : {}), ...(level === 'quick' ? { chat_template_kwargs: { enable_thinking: false }, reasoning_budget: 0 } : {}) },
      signal,
    })) {
      produced = true;
      if (ev.type === 'stats' && model.id) {
        // A real measurement of this model on this PC (see speeds.js).
        try { const hw = await hardware.detect(); const reg = require('./models').get(model.id); if (reg) speeds.record(model.id, ev.tps, ev.tokens, speeds.estimateFor(reg, hw)); } catch {}
      }
      yield ev;
    }
    s.lastUsed = Date.now();
  } catch (err) {
    if (!produced && !signal?.aborted && !noLogprobs.has(model.file) && /logprob|n_probs/i.test(String(err?.message || err))) { noLogprobs.add(model.file); yield* chat(model, opts); return; }
    if (signal?.aborted || produced || useGpu === 0 || !GPU_FAILURE.test(String(err?.message || err))) throw err;
    cpuOnly.add(model.file);
    for (const [k, srv] of [...servers.entries()]) if (srv.file === model.file) stop(k);
    onStatus?.(`The graphics card failed with ${model.name}; switching to the processor (slower but reliable)…`);
    yield* chat(model, { ...opts, gpu: 0 });
  }
}

// Reads the conversation into the model's memory without answering (one token), so the real
// question only has to read the new message. Only for a model that's already loaded or loading.
async function prefill(model, messages, { contextSize = 16384, gpu = 'auto' } = {}) {
  const useGpu = cpuOnly.has(model.file) ? 0 : gpu;
  const s = await ensure(model, { contextSize: contextFor(messages, 4096, contextSize), gpu: useGpu });
  s.lastUsed = Date.now();
  await fetch(`http://127.0.0.1:${s.port}/v1/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages, max_tokens: 1, temperature: 0, cache_prompt: true }), signal: AbortSignal.timeout(180000) }).then((r) => r.text()).catch(() => {});
  return true;
}

function status() {
  return [...servers.values()].map((s) => ({ file: s.file, draft: s.draft || null, port: s.port, sizeGB: s.sizeGB, vramGB: s.vramGB, layers: s.layers, ctx: s.ctx, ready: !s.exited, idleSec: Math.round((Date.now() - s.lastUsed) / 1000) }));
}
const isLoaded = (file) => [...servers.values()].some((s) => s.file === file && !s.exited);

module.exports = { readGguf, ensure, prefill, chat, stop, stopAll, status, isLoaded, contextFor, prefetch };
