// Civitai: live browsing (against a stand-in server), safe filtering, direct downloads, and LoRAs
// switched on for a picture with the real engine flags.
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');

const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-civ-'));
process.env.QUICKSILVER_HOME = HOME;
process.env.QS_SD_BIN = path.join(__dirname, 'fakes', 'sd');
process.env.QS_SD_ARGS_LOG = path.join(HOME, 'sd-args.log');

const ver = (id, baseModel, extra = {}) => ({ id, name: 'v1', baseModel, trainedWords: ['glowstyle'], images: [{ url: 'https://image.civitai.com/x/original=true/1.jpeg', nsfwLevel: 1 }], files: [{ name: 'a.safetensors', sizeKB: 1, type: 'Model', primary: true, metadata: { format: 'SafeTensor' }, downloadUrl: '' }], ...extra });
const MODELS = [
  { id: 1, name: 'Glow Style', type: 'LORA', nsfw: false, poi: false, minor: false, stats: { downloadCount: 10, thumbsUpCount: 2 }, creator: { username: 'a' }, tags: [], modelVersions: [ver(11, 'SDXL 1.0')] },
  { id: 2, name: 'A Real Celebrity', type: 'LORA', nsfw: false, poi: true, minor: false, stats: {}, modelVersions: [ver(21, 'SDXL 1.0')] },
  { id: 3, name: 'Flagged', type: 'LORA', nsfw: true, poi: false, minor: true, stats: {}, modelVersions: [ver(31, 'Pony')] },
  { id: 4, name: 'Wan thing', type: 'LORA', nsfw: false, poi: false, minor: false, stats: {}, modelVersions: [ver(41, 'Wan Video 2.2 I2V-A14B')] },
  { id: 5, name: 'Pony Checkpoint', type: 'Checkpoint', nsfw: true, poi: false, minor: false, stats: {}, modelVersions: [ver(51, 'Pony')] },
];
let lastQuery = '';
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/v1/models')) {
    lastQuery = req.url;
    const type = new URL(req.url, 'http://x').searchParams.get('types');
    const port = server.address().port;
    const items = MODELS.filter((m) => m.type === type).map((m) => ({ ...m, modelVersions: m.modelVersions.map((v) => ({ ...v, files: v.files.map((f) => ({ ...f, downloadUrl: `http://127.0.0.1:${port}/file/${v.id}` })) })) }));
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ items, metadata: { nextCursor: 'c2' } }));
  } else if (req.url.startsWith('/file/')) { const body = Buffer.alloc(4096, 7); res.writeHead(200, { 'Content-Length': body.length }); res.end(body); } else { res.writeHead(404); res.end(); }
});

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  process.env.QS_CIVITAI_API = `http://127.0.0.1:${server.address().port}/api/v1`;
  const civitai = require('../src/main/civitai');
  const models = require('../src/main/models');
  const media = require('../src/main/media');

  // Browsing: only what the engine runs; never real people; never anything flagged for minors.
  const loras = await civitai.search({ type: 'LORA', base: 'sdxl' });
  assert.deepEqual(loras.items.map((i) => i.name), ['Glow Style'], 'real-person, minor-flagged and unsupported (Wan) LoRAs are left out');
  assert.equal(loras.next, 'c2');
  assert.match(lastQuery, /baseModels=SDXL\+1\.0/); assert.match(lastQuery, /nsfw=false/);
  assert.equal(loras.items[0].family, 'sdxl'); assert.match(loras.items[0].image, /width=450/);
  const cps = await civitai.search({ type: 'Checkpoint', nsfw: true });
  assert.equal(cps.items[0].family, 'sdxl'); assert.match(lastQuery, /nsfw=true/);

  // Downloads straight from Civitai, into the shared LoRA folder.
  const done = new Promise((resolve, reject) => {
    const emit = (ev, d) => { if (ev === 'models:done') resolve(d.model); if (ev === 'models:error') reject(new Error(d.message)); };
    models.start(civitai.plan(loras.items[0]), emit);
  });
  const lora = await done;
  assert.equal(lora.kind, 'lora'); assert.equal(lora.source, 'civitai'); assert.equal(lora.family, 'sdxl');
  assert.ok(lora.files.model.includes(`${path.sep}loras${path.sep}civitai-11-glow-style.safetensors`) && fs.statSync(lora.files.model).size === 4096);
  // A Pony checkpoint: an SDXL-family picture model, adult (uncensored), with Pony's tags added.
  const cpDone = new Promise((resolve, reject) => { models.start(civitai.plan(cps.items[0]), (ev, d) => { if (ev === 'models:done') resolve(d.model); if (ev === 'models:error') reject(new Error(d.message)); }); });
  const cp = await cpDone;
  assert.equal(cp.kind, 'image'); assert.equal(cp.catalogId, 'civitai-sdxl'); assert.ok(cp.uncensored); assert.equal(cp.style, 'anime');

  // A picture with the LoRA switched on: the engine gets the LoRA folder and the tag.
  const g = await media.generate('civ1', { modelId: cp.id, mode: 'generate', prompt: 'a lantern', width: 64, height: 64, loras: [{ id: lora.id, weight: 0.7 }] });
  assert.ok(fs.existsSync(g.file));
  const args = JSON.parse(fs.readFileSync(process.env.QS_SD_ARGS_LOG, 'utf8').trim().split('\n').pop());
  assert.equal(args[args.indexOf('--lora-model-dir') + 1], path.dirname(lora.files.model));
  const prompt = args[args.indexOf('-p') + 1];
  assert.match(prompt, /^score_9, score_8_up, score_7_up, a lantern <lora:civitai-11-glow-style:0\.7>$/, prompt);

  server.close();
  console.log('✓ Civitai: live browsing (real people and minor-flagged models never shown), direct downloads, LoRAs switched on for a picture');
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
