// Downloads the starter model that ships inside the installer, so Quicksilver works the moment
// it's installed (no download, no setup, works offline).
//
// First choice: Qwen3-VL 2B Instruct (Alibaba, Apache 2.0): quick on any PC and it can see photos.
// Fallback:     Qwen3 1.7B (Apache 2.0), text only, if no vision build fits.
// A Windows installer can't be larger than about 2 GB, so the model files must stay under LIMIT.
//
// Writes starter/STARTER.json, the model files and the model's licence.
// Usage: node scripts/fetch-starter.js
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

process.env.QUICKSILVER_HOME ||= fs.mkdtempSync(path.join(os.tmpdir(), 'qs-starter-'));
const models = require('../src/main/models');
const { downloadTo } = require('../src/main/engines');

const LIMIT = 1.7e9;
const QUANTS = ['Q4_K_M', 'Q4_K_S', 'IQ4_XS', 'Q4_0'];
const PROJ_ORDER = [/q8_0/i, /(^|[-_.])f16/i, /bf16/i];
const CANDIDATES = [
  { catalogId: 'qwen3-vl-2b', name: 'Qwen3-VL 2B', vision: true, licenseRepo: 'Qwen/Qwen3-VL-2B-Instruct',
    repos: ['Qwen/Qwen3-VL-2B-Instruct-GGUF', 'ggml-org/Qwen3-VL-2B-Instruct-GGUF', 'unsloth/Qwen3-VL-2B-Instruct-GGUF'] },
  { catalogId: 'qwen3-1.7b', name: 'Qwen3 1.7B', vision: false, licenseRepo: 'Qwen/Qwen3-1.7B',
    repos: ['unsloth/Qwen3-1.7B-GGUF', 'Qwen/Qwen3-1.7B-GGUF'] },
];
const out = path.join(__dirname, '..', 'starter');
const HF = 'https://huggingface.co';

async function choose() {
  for (const c of CANDIDATES) {
    for (const repo of c.repos) {
      try {
        const { options } = await models.ggufOptions(repo);
        const files = await models.tree(repo);
        const projs = files.filter((f) => /mmproj.*\.gguf$/i.test(f.path))
          .sort((a, b) => PROJ_ORDER.findIndex((r) => r.test(a.path)) - PROJ_ORDER.findIndex((r) => r.test(b.path)));
        console.log(`${repo}: ${options.map((o) => `${o.quant} ${(o.size / 1e9).toFixed(2)}GB`).join(', ')}${projs.length ? ` | mmproj: ${projs.map((p) => `${path.basename(p.path)} ${(p.size / 1e9).toFixed(2)}GB`).join(', ')}` : ''}`);
        for (const q of QUANTS) {
          const opt = options.find((o) => o.quant.replace(/^UD-/, '') === q && o.files.length === 1);
          if (!opt) continue;
          if (!c.vision) { if (opt.size <= LIMIT) return { c, repo, quant: q, model: opt.files[0] }; continue; }
          const proj = projs.find((p) => PROJ_ORDER.some((r) => r.test(p.path)) && opt.size + p.size <= LIMIT);
          if (proj) return { c, repo, quant: q, model: opt.files[0], mmproj: proj };
        }
        console.log(`  nothing in ${repo} fits under ${(LIMIT / 1e9).toFixed(1)} GB`);
      } catch (err) {
        console.log(`${repo}: ${err.message}`);
      }
    }
  }
  throw new Error('No starter model could be found on Hugging Face.');
}

(async () => {
  const pick = await choose();
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const get = async (f, name) => {
    process.stdout.write(`  ${pick.repo}/${f.path} (${(f.size / 1e9).toFixed(2)} GB)… `);
    await downloadTo(`${HF}/${pick.repo}/resolve/main/${f.path.split('/').map(encodeURIComponent).join('/')}`, path.join(out, name));
    const size = fs.statSync(path.join(out, name)).size;
    if (f.size && size !== f.size) throw new Error(`${name} is ${size} bytes, expected ${f.size}`);
    console.log('ok');
  };
  console.log(`starter: ${pick.c.name} ${pick.quant} from ${pick.repo}`);
  await get(pick.model, 'model.gguf');
  if (pick.mmproj) await get(pick.mmproj, 'mmproj.gguf');
  try {
    await downloadTo(`${HF}/${pick.c.licenseRepo}/resolve/main/LICENSE`, path.join(out, 'LICENSE.txt'));
  } catch {
    fs.writeFileSync(path.join(out, 'LICENSE.txt'), `${pick.c.name} by Alibaba Cloud (Qwen), licensed under the Apache License, Version 2.0.\nhttps://www.apache.org/licenses/LICENSE-2.0\n`);
  }
  const meta = { catalogId: pick.c.catalogId, name: pick.c.name, vision: Boolean(pick.mmproj), repo: pick.repo, quant: pick.quant, license: 'Apache-2.0', files: { model: 'model.gguf', ...(pick.mmproj ? { mmproj: 'mmproj.gguf' } : {}) } };
  fs.writeFileSync(path.join(out, 'STARTER.json'), JSON.stringify(meta, null, 2));
  const total = fs.readdirSync(out).reduce((t, n) => t + fs.statSync(path.join(out, n)).size, 0);
  console.log(`starter ready: ${meta.name} (${(total / 1e9).toFixed(2)} GB)`);
})().catch((e) => { console.error(e); process.exit(1); });
