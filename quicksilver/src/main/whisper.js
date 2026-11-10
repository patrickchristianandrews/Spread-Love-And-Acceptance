// Voice typing: speech to text on this PC with whisper.cpp. Nothing you say leaves the computer.
// The engine comes with the app (Windows); the speech model (about 60 MB) downloads once.
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawn } = require('node:child_process');
const store = require('./store');
const engines = require('./engines');

const MODEL = { file: 'ggml-base-q5_1.bin', url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin', sizeMB: 57 };

const bin = () => engines.resolve('whisper')?.bin || null;
const modelPath = () => process.env.QS_WHISPER_MODEL || path.join(store.dir('voice'), MODEL.file);
const hasModel = () => { try { return fs.statSync(modelPath()).size > 1e6 || Boolean(process.env.QS_WHISPER_MODEL); } catch { return false; } };

let setting = null;
function status() {
  const engine = Boolean(bin());
  return { engine, model: hasModel(), ready: engine && hasModel(), settingUp: Boolean(setting), downloadMB: MODEL.sizeMB + (engine ? 0 : 5), canInstall: engine || Boolean(engines.available('whisper').length) };
}

// Gets whatever is missing: the engine (only if it didn't come with the app) and the model.
function setup(onProgress) {
  if (setting) return setting;
  setting = (async () => {
    if (!bin()) {
      if (!engines.available('whisper').length) throw new Error('Voice typing isn\'t available on this system yet.');
      await engines.install('whisper', 'cpu', (p) => onProgress?.({ part: 'engine', downloaded: p.downloaded, total: p.total }));
    }
    if (!hasModel()) {
      const tmp = `${modelPath()}.part`;
      await engines.downloadTo(MODEL.url, tmp, (d, t) => onProgress?.({ part: 'model', downloaded: d, total: t || MODEL.sizeMB * 1048576 }));
      if (fs.statSync(tmp).size < 1e6) { fs.rmSync(tmp, { force: true }); throw new Error('The speech model download was incomplete. Try again.'); }
      fs.renameSync(tmp, modelPath());
    }
    return status();
  })();
  return setting.finally(() => { setting = null; });
}

// Turns a recording (any format the browser records) into text.
async function transcribe(bytes, { language = 'auto', ext = 'webm' } = {}) {
  const exe = bin();
  if (!exe || !hasModel()) throw new Error('Voice typing isn\'t set up yet.');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-voice-'));
  const input = path.join(dir, `in.${String(ext).replace(/[^a-z0-9]/gi, '') || 'webm'}`);
  const wav = path.join(dir, 'speech.wav');
  try {
    fs.writeFileSync(input, Buffer.from(bytes));
    // whisper.cpp wants 16 kHz mono 16-bit WAV.
    await require('./media').runFfmpeg(['-i', input, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
    const threads = String(Math.max(2, Math.min(8, os.cpus().length - 1)));
    const out = await new Promise((resolve, reject) => {
      const p = spawn(exe, ['-m', modelPath(), '-f', wav, '-nt', '-np', '-l', language || 'auto', '-t', threads], { windowsHide: true });
      let so = '';
      let se = '';
      const timer = setTimeout(() => p.kill(), 180000);
      p.stdout.on('data', (d) => { so += d; });
      p.stderr.on('data', (d) => { se = (se + d).slice(-3000); });
      p.on('error', reject);
      p.on('exit', (code) => { clearTimeout(timer); code === 0 ? resolve(so) : reject(new Error(`Voice typing failed: ${se.split('\n').filter(Boolean).slice(-2).join(' ') || `exit ${code}`}`)); });
    });
    return out.replace(/\[[^\]]*\]|\((?:music|silence|inaudible|blank_audio)[^)]*\)/gi, ' ').replace(/^\s*\[?\d{2}:\d{2}[^\]]*\]\s*/gm, '').replace(/\s+/g, ' ').trim();
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

module.exports = { status, setup, transcribe, MODEL };
