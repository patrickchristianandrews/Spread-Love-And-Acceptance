// Quicksilver — local engine.
// Runs open models on this PC with llama.cpp (through node-llama-cpp): no account, no key.
// It picks the best backend by itself: CUDA on NVIDIA cards, Vulkan on AMD/Intel, or the CPU.

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

let lib = null;        // the node-llama-cpp module (ESM, loaded on first use)
let llama = null;      // the llama.cpp runtime
let loaded = null;     // { file, model, context, sequence, session }
let loading = null;    // promise while a model loads

async function getLib() {
  lib ||= await import('node-llama-cpp');
  return lib;
}

async function getRuntime() {
  if (llama) return llama;
  const { getLlama, LlamaLogLevel } = await getLib();
  // build: 'never' = use the bundled prebuilt engines; never try to compile llama.cpp on the user's PC.
  llama = await getLlama({ gpu: 'auto', build: 'never', logLevel: LlamaLogLevel.warn });
  return llama;
}

// What this PC can run. Used by the Stack Advisor and shown in Settings.
async function hardware() {
  const ramBytes = os.totalmem();
  const info = {
    ramGB: ramBytes / 1024 ** 3,
    freeRamGB: os.freemem() / 1024 ** 3,
    cpu: os.cpus()[0]?.model?.trim() || 'Unknown CPU',
    cores: os.cpus().length,
    gpu: 'none',
    gpuNames: [],
    vramGB: 0,
  };
  try {
    const rt = await getRuntime();
    info.gpu = rt.gpu || 'none';
    if (rt.gpu) {
      const vram = await rt.getVramState();
      info.vramGB = vram.total / 1024 ** 3;
      info.gpuNames = await rt.getGpuDeviceNames().catch(() => []);
    }
  } catch (err) {
    info.error = String(err?.message || err);
  }
  return info;
}

async function unload() {
  const old = loaded;
  loaded = null;
  if (!old) return;
  try { old.session?.dispose(); } catch {}
  try { await old.context?.dispose(); } catch {}
  try { await old.model?.dispose(); } catch {}
}

async function load(file, { contextSize = 8192, gpuLayers = 'auto' } = {}) {
  if (loaded && loaded.file === file && loaded.contextSize === contextSize && loaded.gpuLayers === gpuLayers) return loaded;
  if (loading) await loading.catch(() => {});
  loading = (async () => {
    await unload();
    const rt = await getRuntime();
    const { LlamaChatSession } = await getLib();
    const model = await rt.loadModel({ modelPath: file, gpuLayers });
    const context = await model.createContext({ contextSize: { max: contextSize } });
    const sequence = context.getSequence();
    const session = new LlamaChatSession({ contextSequence: sequence });
    loaded = { file, contextSize, gpuLayers, model, context, sequence, session };
    return loaded;
  })();
  try { return await loading; } finally { loading = null; }
}

// Writes a reply. history = [{role:'user'|'assistant', content}], ending with the user turn.
// The chat state is replaced each time; llama.cpp reuses whatever prefix is already in memory,
// so continuing a chat only processes the new message.
async function generate({ file, contextSize, gpuLayers, system, history, maxTokens, temperature, signal, onText }) {
  const l = await load(file, { contextSize, gpuLayers });
  const last = history[history.length - 1];
  const prior = history.slice(0, -1).map((m) => (m.role === 'user'
    ? { type: 'user', text: m.content }
    : { type: 'model', response: [m.content] }));
  l.session.setChatHistory([{ type: 'system', text: system || '' }, ...prior]);
  const text = await l.session.prompt(last.content, {
    maxTokens,
    temperature,
    signal,
    stopOnAbortSignal: true,
    onTextChunk: onText,
  });
  return { text, aborted: Boolean(signal?.aborted) };
}

// ---------- downloads ----------

const downloads = new Map(); // id -> downloader

async function download({ id, uri, dir, onProgress }) {
  const { createModelDownloader } = await getLib();
  fs.mkdirSync(dir, { recursive: true });
  const downloader = await createModelDownloader({
    modelUri: uri,
    dirPath: dir,
    skipExisting: true,
    deleteTempFileOnCancel: true,
    onProgress: ({ totalSize, downloadedSize }) => onProgress?.({ totalSize, downloadedSize }),
  });
  downloads.set(id, downloader);
  try {
    const file = await downloader.download();
    return { file, size: fs.statSync(file).size };
  } finally {
    downloads.delete(id);
  }
}

async function cancelDownload(id) {
  await downloads.get(id)?.cancel({ deleteTempFile: true });
}

// Reads a .gguf file's header to confirm it's a model and get a friendly name.
async function inspect(file) {
  const { readGgufFileInfo } = await getLib();
  const info = await readGgufFileInfo(file, { readTensorInfo: false });
  const g = info.metadata?.general || {};
  return {
    name: g.name || path.basename(file, '.gguf'),
    architecture: g.architecture || 'unknown',
    size: fs.statSync(file).size,
  };
}

function loadedFile() { return loaded?.file || null; }

module.exports = { hardware, load, unload, generate, download, cancelDownload, inspect, loadedFile };
