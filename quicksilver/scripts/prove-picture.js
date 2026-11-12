// Proves the Liquid Edition's picture maker really works with the real engine before it ships:
// Lustify paints one small picture on this machine, through the same code the app uses
// (src/main/media.js builds the engine's command line). Build machines have no graphics card, so
// it is a small picture in a few steps on the processor: enough to show the model file loads,
// the engine accepts every option Quicksilver passes, and a real image comes out.
// Usage: node scripts/prove-picture.js [folder with lustify.safetensors, default pack/]
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const zlib = require('node:zlib');

process.env.QUICKSILVER_HOME ||= fs.mkdtempSync(path.join(os.tmpdir(), 'qs-picture-'));
const ROOT = path.join(__dirname, '..');
const dir = path.resolve(process.argv[2] || path.join(ROOT, 'pack'));
const models = require('../src/main/models');
const media = require('../src/main/media');

// How many different byte values the picture's pixels have: a blank or single-color image (what
// a broken run produces) has almost none.
function pngVariety(file) {
  const b = fs.readFileSync(file);
  let pos = 8; const idat = [];
  while (pos < b.length) {
    const len = b.readUInt32BE(pos); const type = b.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') idat.push(b.subarray(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const seen = new Set();
  for (let i = 0; i < raw.length; i += 97) seen.add(raw[i]);
  return seen.size;
}

(async () => {
  const model = path.join(dir, 'lustify.safetensors');
  const vae = path.join(dir, 'lustify-vae.safetensors');
  for (const f of [model, vae]) if (!fs.existsSync(f)) throw new Error(`${f} is not here (run scripts/fetch-starter.js first).`);
  models.add({ id: 'starter-lustify', name: 'Lustify (uncensored)', kind: 'image', catalogId: 'lustify', files: { model, vae }, size: fs.statSync(model).size + fs.statSync(vae).size, source: 'bundled' });
  const t0 = Date.now();
  let last = '';
  const item = await media.generate('prove-picture', { modelId: 'starter-lustify', prompt: 'a red apple on a wooden table, soft daylight, photo', negative: 'blurry', width: 512, height: 512, steps: 4, cfg: 5, seed: 7 },
    { onStatus: (s) => { if (s !== last) { last = s; console.log(`  ${s} (${Math.round((Date.now() - t0) / 1000)} s)`); } } });
  const size = fs.statSync(item.file).size;
  const variety = pngVariety(item.file);
  console.log(`picture: ${item.file} · ${(size / 1024).toFixed(0)} KB · ${variety} different pixel values · ${Math.round((Date.now() - t0) / 1000)} s`);
  if (size < 20 * 1024 || variety < 40) throw new Error('The picture is blank or nearly blank.');
  if (process.argv[3]) fs.copyFileSync(item.file, process.argv[3]);
  console.log('✓ Lustify painted a real picture with the real engine');
  // ⚡ Fast mode, through the app's own code: the same picture in 8 steps with the helper file
  // that ships in the models folder. Recorded, not required: the build goes on without it.
  try {
    if (!media.helpers().lightning) throw new Error('the 8-step helper file is not in the models folder');
    const t1 = Date.now();
    const fast = await media.generate('prove-fast', { modelId: 'starter-lustify', prompt: 'a red apple on a wooden table, soft daylight, photo', width: 512, height: 512, seed: 7, fast: true },
      { onStatus: (s) => { if (s !== last) { last = s; console.log(`  ${s} (${Math.round((Date.now() - t1) / 1000)} s)`); } } });
    const v = pngVariety(fast.file);
    if (fs.statSync(fast.file).size < 20 * 1024 || v < 40) throw new Error('the fast picture is blank or nearly blank');
    if (process.argv[3]) fs.copyFileSync(fast.file, process.argv[3].replace(/\.png$/, '-fast.png'));
    console.log(`✓ fast mode painted a real picture too: ${(fs.statSync(fast.file).size / 1024).toFixed(0)} KB · ${v} different pixel values · ${Math.round((Date.now() - t1) / 1000)} s (the plain one took ${Math.round((t1 - t0) / 1000)} s for 4 steps)`);
  } catch (err) { console.log(`::warning::Fast mode did not make a picture on the build machine: ${err.message}`); }
  process.exit(0);
})().catch((err) => { console.error(`✗ ${err.message}`); process.exit(1); });
