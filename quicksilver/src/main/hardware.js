// Works out what this PC has: memory, processor, graphics card(s) and video memory.
// Sources, best first: nvidia-smi (NVIDIA), llama-server --list-devices (any GPU the engine can use),
// then the operating system's own list of graphics adapters (names only).
const os = require('node:os');
const { execFile } = require('node:child_process');
const engines = require('./engines');

function run(cmd, args, timeout = 8000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve(err && !stdout ? null : `${stdout || ''}\n${stderr || ''}`);
    });
  });
}

async function nvidia() {
  const out = await run('nvidia-smi', ['--query-gpu=name,memory.total,memory.free', '--format=csv,noheader,nounits']);
  if (!out) return [];
  return out.split('\n').map((l) => l.split(',').map((s) => s.trim())).filter((p) => p.length === 3 && Number(p[1]))
    .map(([name, total, free]) => ({ name, vramGB: Number(total) / 1024, freeGB: Number(free) / 1024, vendor: 'nvidia' }));
}

// Lines like "  Vulkan0: NVIDIA GeForce RTX 4070 (12282 MiB, 11000 MiB free)"
async function llamaDevices(bin) {
  if (!bin) return [];
  const out = await run(bin, ['--list-devices'], 20000);
  if (!out) return [];
  const list = [];
  for (const line of out.split('\n')) {
    const m = line.match(/^\s*([A-Za-z]+\d+):\s*(.+?)\s*\((\d+)\s*MiB,\s*(\d+)\s*MiB free\)/);
    if (m) list.push({ name: m[2], backend: m[1].replace(/\d+$/, ''), vramGB: Number(m[3]) / 1024, freeGB: Number(m[4]) / 1024, vendor: /nvidia|geforce|rtx|quadro/i.test(m[2]) ? 'nvidia' : /amd|radeon/i.test(m[2]) ? 'amd' : /intel|arc/i.test(m[2]) ? 'intel' : 'other' });
  }
  return list;
}

async function osAdapters() {
  if (process.platform === 'win32') {
    const out = await run('powershell', ['-NoProfile', '-Command', 'Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name']);
    return out ? out.split('\n').map((s) => s.trim()).filter(Boolean) : [];
  }
  if (process.platform === 'darwin') {
    const out = await run('system_profiler', ['SPDisplaysDataType']);
    const m = out?.match(/Chipset Model:\s*(.+)/g) || [];
    return m.map((s) => s.replace(/Chipset Model:\s*/, '').trim());
  }
  const out = await run('sh', ['-c', 'lspci 2>/dev/null | grep -iE "vga|3d|display"']);
  return out ? out.split('\n').map((s) => s.replace(/^.*?:\s*/, '').trim()).filter(Boolean) : [];
}

let cache = null;
let cacheAt = 0;

async function detect({ fresh = false } = {}) {
  if (cache && !fresh && Date.now() - cacheAt < 60000) return cache;
  const cpus = os.cpus();
  const hw = {
    platform: process.platform,
    arch: process.arch,
    ramGB: os.totalmem() / 1024 ** 3,
    freeRamGB: os.freemem() / 1024 ** 3,
    cpu: cpus[0]?.model?.trim() || 'Unknown processor',
    cores: cpus.length,
    gpus: [],
    vramGB: 0,
    vramFreeGB: 0,
    nvidia: false,
    unifiedMemory: process.platform === 'darwin' && process.arch === 'arm64',
    adapters: [],
  };
  const llama = engines.resolve('llama', null);
  let gpus = await nvidia();
  const viaEngine = await llamaDevices(llama?.bin);
  if (!gpus.length) gpus = viaEngine;
  hw.adapters = await osAdapters();
  if (hw.unifiedMemory && !gpus.length) gpus = [{ name: 'Apple GPU (shared memory)', vramGB: hw.ramGB * 0.7, freeGB: hw.freeRamGB * 0.7, vendor: 'apple' }];
  // Built-in graphics (Intel UHD/Iris/Arc iGPU, AMD "Radeon Graphics" APUs) share system memory,
  // are rarely faster than the processor and cause most driver crashes, so they are skipped.
  const integrated = (g) => /intel\(r\) (uhd|hd|iris)|intel.*(uhd|iris xe|hd graphics)|^amd radeon\(tm\) graphics|radeon graphics$|radeon\(tm\) (vega|graphics)|llvmpipe|swiftshader|microsoft basic/i.test(g.name);
  hw.integrated = gpus.filter(integrated).map((g) => g.name);
  if (!hw.unifiedMemory) gpus = gpus.filter((g) => !integrated(g));
  hw.gpus = gpus;
  const main = [...gpus].sort((a, b) => b.vramGB - a.vramGB)[0];
  if (main) {
    hw.vramGB = main.vramGB;
    hw.vramFreeGB = main.freeGB ?? main.vramGB;
    hw.gpuName = main.name;
  } else {
    hw.gpuName = hw.integrated[0] ? `${hw.integrated[0]} (built-in, using the processor instead)` : hw.adapters[0] ? `${hw.adapters[0]} (not used for AI)` : 'None found';
  }
  hw.nvidia = gpus.some((g) => g.vendor === 'nvidia') || hw.adapters.some((a) => /nvidia/i.test(a));
  hw.engineReady = Boolean(llama);
  cache = hw;
  cacheAt = Date.now();
  return hw;
}

module.exports = { detect };
