// Downloads the models that come with Quicksilver, so it works the moment it's installed:
//   starter/ (inside the installer)  Qwen3-VL 2B: quick on any PC, sees photos   (Apache 2.0)
//   pack/    (next to the installer) Qwen3 4B Instruct 2507: the brain           (Apache 2.0)
// Together they make the built-in "Quicksilver" model (a stack with smart routing).
// The 4B model is too big for a Windows installer (about 2 GB at most), so it ships in a folder
// beside it; the installer copies it in. Writes starter/STARTER.json and the licences.
// Both are the uncensored ("abliterated") versions when they can be found: the same models with
// the refusals taken out, so they answer plainly. The app's parental lock adds a family-safe
// instruction instead. If no uncensored copy is available, the original models are used.
// Usage: node scripts/fetch-starter.js
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

process.env.QUICKSILVER_HOME ||= fs.mkdtempSync(path.join(os.tmpdir(), 'qs-starter-'));
const models = require('../src/main/models');
const { downloadTo } = require('../src/main/engines');

const HF = 'https://huggingface.co';
const ROOT = path.join(__dirname, '..');
const QUANTS = ['Q4_K_M', 'Q4_K_S', 'IQ4_XS'];
const PROJ_ORDER = [/q8_0/i, /(^|[-_.])f16/i, /bf16/i];

const MODELS = [
  { id: 'starter', catalogId: 'qwen3-vl-2b', name: 'Qwen3-VL 2B', vision: true, where: 'starter', limit: 1.7e9, file: 'model.gguf',
    licenseRepo: 'Qwen/Qwen3-VL-2B-Instruct', repos: ['mradermacher/Huihui-Qwen3-VL-2B-Instruct-abliterated-GGUF', 'huihui-ai/Huihui-Qwen3-VL-2B-Instruct-abliterated-GGUF', 'noctrex/Huihui-Qwen3-VL-2B-Instruct-abliterated-GGUF', 'Qwen/Qwen3-VL-2B-Instruct-GGUF', 'ggml-org/Qwen3-VL-2B-Instruct-GGUF', 'unsloth/Qwen3-VL-2B-Instruct-GGUF'] },
  { id: 'starter-brain', catalogId: 'qwen3-4b', name: 'Qwen3 4B Instruct 2507', vision: false, where: 'pack', limit: 3e9, file: 'qwen3-4b-instruct-2507.gguf', pack: true,
    licenseRepo: 'Qwen/Qwen3-4B-Instruct-2507', repos: ['mradermacher/Huihui-Qwen3-4B-Instruct-2507-abliterated-GGUF', 'bartowski/huihui-ai_Huihui-Qwen3-4B-Instruct-2507-abliterated-GGUF', 'huihui-ai/Huihui-Qwen3-4B-Instruct-2507-abliterated-GGUF', 'unsloth/Qwen3-4B-Instruct-2507-GGUF', 'Qwen/Qwen3-4B-Instruct-2507-GGUF', 'bartowski/Qwen_Qwen3-4B-Instruct-2507-GGUF'] },
];

async function choose(m) {
  for (const repo of m.repos) {
    try {
      const { options } = await models.ggufOptions(repo);
      const files = await models.tree(repo);
      const projs = files.filter((f) => /mmproj.*\.gguf$/i.test(f.path))
        .sort((a, b) => PROJ_ORDER.findIndex((r) => r.test(a.path)) - PROJ_ORDER.findIndex((r) => r.test(b.path)));
      console.log(`${repo}: ${options.map((o) => `${o.quant} ${(o.size / 1e9).toFixed(2)}GB`).join(', ')}${projs.length ? ` | mmproj: ${projs.map((p) => `${path.basename(p.path)} ${(p.size / 1e9).toFixed(2)}GB`).join(', ')}` : ''}`);
      for (const q of QUANTS) {
        const opt = options.find((o) => o.quant.replace(/^UD-/, '') === q && o.files.length === 1);
        if (!opt) continue;
        if (!m.vision) { if (opt.size <= m.limit) return { repo, quant: q, model: opt.files[0] }; continue; }
        const proj = projs.find((p) => PROJ_ORDER.some((r) => r.test(p.path)) && opt.size + p.size <= m.limit);
        if (proj) return { repo, quant: q, model: opt.files[0], mmproj: proj };
      }
      console.log(`  nothing in ${repo} fits under ${(m.limit / 1e9).toFixed(1)} GB`);
    } catch (err) {
      console.log(`${repo}: ${err.message}`);
    }
  }
  throw new Error(`${m.name} could not be found on Hugging Face.`);
}

async function get(repo, f, dest) {
  process.stdout.write(`  ${repo}/${f.path} (${(f.size / 1e9).toFixed(2)} GB)… `);
  await downloadTo(`${HF}/${repo}/resolve/main/${f.path.split('/').map(encodeURIComponent).join('/')}`, dest);
  const size = fs.statSync(dest).size;
  if (f.size && size !== f.size) throw new Error(`${path.basename(dest)} is ${size} bytes, expected ${f.size}`);
  console.log('ok');
}

(async () => {
  for (const d of ['starter', 'pack']) { fs.rmSync(path.join(ROOT, d), { recursive: true, force: true }); fs.mkdirSync(path.join(ROOT, d), { recursive: true }); }
  const entries = [];
  const licences = [];
  for (const m of MODELS) {
    const pick = await choose(m);
    console.log(`${m.name}: ${pick.quant} from ${pick.repo}`);
    const dir = path.join(ROOT, m.where);
    await get(pick.repo, pick.model, path.join(dir, m.file));
    if (pick.mmproj) await get(pick.repo, pick.mmproj, path.join(dir, 'mmproj.gguf'));
    const open = m.uncensored || /abliterat|uncensor/i.test(pick.repo);
    console.log(open ? `  ✓ uncensored copy: ${pick.repo}` : `  ⚠ no uncensored copy found for ${m.name}; using the original`);
    entries.push({ id: m.id, catalogId: m.catalogId, name: open ? `${m.name} (uncensored)` : m.name, ...(open ? { uncensored: true } : {}), repo: pick.repo, quant: pick.quant, files: { model: m.file, ...(pick.mmproj ? { mmproj: 'mmproj.gguf' } : {}) }, ...(m.pack ? { pack: true } : {}), ...(m.optional ? { optional: true } : {}) });
    let text = m.licenceText;
    if (!text) try {
      const tmp = path.join(os.tmpdir(), `licence-${m.id}.txt`);
      await downloadTo(`${HF}/${m.licenseRepo}/resolve/main/LICENSE`, tmp);
      text = fs.readFileSync(tmp, 'utf8');
    } catch { text = 'Licensed under the Apache License, Version 2.0: https://www.apache.org/licenses/LICENSE-2.0\n'; }
    licences.push(`==== ${m.name} (${m.licenseRepo}) by ${m.by || 'Alibaba Cloud (Qwen)'}${open && !m.by ? `; uncensored version from ${pick.repo}` : ''} ====\n\n${text}`);
  }
  fs.writeFileSync(path.join(ROOT, 'starter', 'STARTER.json'), JSON.stringify({ models: entries }, null, 2));
  fs.writeFileSync(path.join(ROOT, 'starter', 'MODEL-LICENCES.txt'), licences.join('\n\n'));
  fs.copyFileSync(path.join(ROOT, 'starter', 'MODEL-LICENCES.txt'), path.join(ROOT, 'pack', 'MODEL-LICENCES.txt'));
  const size = (d) => fs.readdirSync(path.join(ROOT, d)).reduce((t, n) => t + fs.statSync(path.join(ROOT, d, n)).size, 0);
  console.log(`inside the installer: ${(size('starter') / 1e9).toFixed(2)} GB · next to it: ${(size('pack') / 1e9).toFixed(2)} GB`);
})().catch((e) => { console.error(e); process.exit(1); });
