// Downloads the models that come with Quicksilver, so it works the moment it's installed:
//   starter/ (inside the installer)  Qwen3.5 2B: quick on any PC, sees photos; the Muse  (Apache 2.0)
//   pack/    (next to the installer) Qwen3.5 4B: the Brain; sees photos, thinks hard ones through (Apache 2.0)
//            Qwen3.5 9B: the Closer; BGE Reranker; Lustify (pictures); Wan 2.2 5B and Turbo (video)
// Together they make the built-in "Quicksilver" model (a stack with smart routing).
// The 4B model is too big for a Windows installer (about 2 GB at most), so it ships in a folder
// beside it; the installer copies it in. Writes starter/STARTER.json and the licences.
// Both are the uncensored ("abliterated") versions when they can be found: the same models with
// the refusals taken out, so they answer plainly. The app's parental lock adds a family-safe
// instruction instead. If no uncensored copy is available, the original models are used.
// Also next to the installer: the Liquid Edition's uncensored picture and video makers, Lustify
// (pictures) and Wan 2.2 5B and Turbo (video), so it makes both offline from the first run. Set
// QS_NO_MEDIA_PACK=1 to leave them out (the app then downloads them on first run, before it opens).
// A failed download fails the build: the Liquid Edition ships complete.
// QS_WEB_INSTALLER=1 makes the web installer instead: no model files at all (not even the small
// ones that normally go inside it). Only STARTER.json and the licences are written, every model
// marked to download — Quicksilver's setup screen fetches the whole Liquid Edition on first launch.
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
const WEB = Boolean(process.env.QS_WEB_INSTALLER);

const MODELS = [
  // Inside the installer: small, quick on any PC, sees photos. The Muse, and the instant fallback.
  { id: 'starter', catalogId: 'qwen3.5-2b', name: 'Qwen3.5 2B', vision: true, where: 'starter', limit: 1.75e9, file: 'model.gguf', proj: 'mmproj.gguf',
    licenseRepo: 'Qwen/Qwen3.5-2B', repos: ['mradermacher/Huihui-Qwen3.5-2B-abliterated-GGUF', 'mradermacher/Qwen3.5-2B_Abliterated-GGUF'] },
  // Next to the installer: the Brain. Sees photos itself and switches its own thinking on for hard questions.
  { id: 'starter-brain', catalogId: 'qwen3.5-4b', name: 'Qwen3.5 4B', vision: true, where: 'pack', limit: 3.6e9, file: 'qwen3.5-4b.gguf', proj: 'qwen3.5-4b-mmproj.gguf', pack: true,
    licenseRepo: 'Qwen/Qwen3.5-4B', repos: ['mradermacher/Huihui-Qwen3.5-4B-abliterated-GGUF', 'mradermacher/Qwen3.5-4B-abliterated-GGUF'] },
  // Next to the installer: the Closer. The strongest uncensored model in the pack: leads on hard
  // questions and sees photos, on PCs with a graphics card (on smaller PCs it waits on the bench).
  { id: 'starter-closer', catalogId: 'qwen3.5-9b-uncensored', name: 'Qwen3.5 9B', vision: true, where: 'pack', limit: 6.6e9, file: 'qwen3.5-9b.gguf', proj: 'qwen3.5-9b-mmproj.gguf', pack: true,
    licenseRepo: 'Qwen/Qwen3.5-9B', repos: ['mradermacher/Huihui-Qwen3.5-9B-abliterated-GGUF', 'mradermacher/Qwen3.5-9B-abliterated-GGUF'] },
  // Next to the installer: Sharper search. The reranker puts the passage that answers the question
  // first (it scores text, writes none, so no filter applies).
  { id: 'starter-rerank', catalogId: 'bge-reranker-v2-m3', name: 'BGE Reranker v2 M3', kind: 'rerank', where: 'pack', limit: 0.6e9, file: 'rerank.gguf', pack: true,
    by: 'BAAI', licenseRepo: 'BAAI/bge-reranker-v2-m3', licenceText: 'Licensed under the Apache License, Version 2.0: https://www.apache.org/licenses/LICENSE-2.0\n',
    repos: ['gpustack/bge-reranker-v2-m3-GGUF', 'sabafallah/bge-reranker-v2-m3-Q4_K_M-GGUF'] },
  // Inside the installer: Smarter search. A tiny embedding model so Your knowledge and Memory are
  // found by meaning out of the box (not uncensored because it writes no text — it only measures
  // how close two pieces of text are in meaning).
  { id: 'starter-embed', catalogId: 'nomic-embed-v1.5', name: 'Nomic Embed v1.5', kind: 'embed', where: 'starter', limit: 0.2e9, file: 'embed.gguf',
    by: 'Nomic AI', licenseRepo: 'nomic-ai/nomic-embed-text-v1.5-GGUF', licenceText: 'Licensed under the Apache License, Version 2.0: https://www.apache.org/licenses/LICENSE-2.0\n',
    repos: ['nomic-ai/nomic-embed-text-v1.5-GGUF', 'second-state/Nomic-embed-text-v1.5-Embedding-GGUF'] },
];

// Picture and video models: several files each (the model, its decoder, its text encoder), named
// here so they can sit together in one folder.
const MEDIA = [
  { id: 'starter-lustify', catalogId: 'lustify', name: 'Lustify (uncensored)', kind: 'image', names: { model: 'lustify.safetensors', vae: 'lustify-vae.safetensors' },
    licence: '==== Lustify (community SDXL checkpoint) ====\n\nBuilt on Stable Diffusion XL 1.0. CreativeML Open RAIL++-M License: https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/blob/main/LICENSE.md\nThe SDXL decoder (madebyollin/sdxl-vae-fp16-fix) is MIT licensed.\n' },
  { id: 'starter-wan', catalogId: 'wan2.2-5b', name: 'Wan 2.2 5B', kind: 'video', names: { diffusion: 'wan2.2-5b.gguf', vae: 'wan2.2-vae.safetensors', t5xxl: 'wan-umt5-xxl.gguf' },
    licence: '==== Wan 2.2 TI2V 5B (Alibaba) ====\n\nLicensed under the Apache License, Version 2.0: https://www.apache.org/licenses/LICENSE-2.0\nText encoder: UMT5-XXL (Google), Apache License 2.0.\n' },
  { id: 'starter-wan-turbo', catalogId: 'wan2.2-5b-turbo', name: 'Wan 2.2 5B Turbo', kind: 'video', names: { diffusion: 'wan2.2-5b-turbo.gguf', vae: 'wan2.2-vae.safetensors', t5xxl: 'wan-umt5-xxl.gguf' },
    licence: '==== Wan 2.2 TI2V 5B Turbo (Alibaba; Turbo by quanhaol) ====\n\nLicensed under the Apache License, Version 2.0: https://www.apache.org/licenses/LICENSE-2.0\n' },
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
  // Files shared by two models (Wan 2.2's decoder and text encoder) are fetched once.
  if (f.size && fs.existsSync(dest) && fs.statSync(dest).size === f.size) { console.log(`  ${path.basename(dest)} already here`); return; }
  // A stalled or dropped connection is tried again (up to 5 times) rather than failing the build.
  for (let attempt = 1; ; attempt++) {
    process.stdout.write(`  ${repo}/${f.path} (${(f.size / 1e9).toFixed(2)} GB)${attempt > 1 ? ` — attempt ${attempt}` : ''}… `);
    try {
      await downloadTo(`${HF}/${repo}/resolve/main/${f.path.split('/').map(encodeURIComponent).join('/')}`, dest);
      const size = fs.statSync(dest).size;
      if (f.size && size !== f.size) throw new Error(`${path.basename(dest)} is ${size} bytes, expected ${f.size}`);
      console.log('ok');
      return;
    } catch (err) {
      console.log(`failed: ${err.message}`);
      if (attempt >= 5) throw err;
      await new Promise((r) => setTimeout(r, attempt * 5000));
    }
  }
}

(async () => {
  for (const d of ['starter', 'pack']) { fs.rmSync(path.join(ROOT, d), { recursive: true, force: true }); fs.mkdirSync(path.join(ROOT, d), { recursive: true }); }
  const entries = [];
  const licences = [];
  for (const m of MODELS) {
    const pick = await choose(m);
    console.log(`${m.name}: ${pick.quant} from ${pick.repo}`);
    const dir = path.join(ROOT, m.where);
    if (!WEB) {
      await get(pick.repo, pick.model, path.join(dir, m.file));
      if (pick.mmproj) await get(pick.repo, pick.mmproj, path.join(dir, m.proj || 'mmproj.gguf'));
    }
    const open = m.uncensored || /abliterat|uncensor/i.test(pick.repo);
    // The Liquid Edition's chat models are completely uncensored: no filtered stand-in, ever. The
    // search model (embeddings) writes no text, so it's exempt.
    if (!m.kind && !open) throw new Error(`No uncensored copy of ${m.name} could be downloaded (tried ${m.repos.filter((r) => /abliterat|uncensor/i.test(r)).join(', ')}).`);
    if (m.kind) console.log(`  ✓ ${m.kind === 'rerank' ? 'sharper' : 'smarter'}-search model`); else console.log(`  ✓ uncensored copy: ${pick.repo}`);
    entries.push({ id: m.id, catalogId: m.catalogId, name: m.kind ? m.name : open ? `${m.name} (uncensored)` : m.name, ...(m.kind ? { kind: m.kind } : {}), ...(open && !m.kind ? { uncensored: true } : {}), repo: pick.repo, quant: pick.quant, files: { model: m.file, ...(pick.mmproj ? { mmproj: m.proj || 'mmproj.gguf' } : {}) }, ...(m.pack || WEB ? { pack: true } : {}), ...(m.optional ? { optional: true } : {}), ...(m.ifFits ? { ifFits: true } : {}) });
    let text = m.licenceText;
    if (!text) try {
      const tmp = path.join(os.tmpdir(), `licence-${m.id}.txt`);
      await downloadTo(`${HF}/${m.licenseRepo}/resolve/main/LICENSE`, tmp);
      text = fs.readFileSync(tmp, 'utf8');
    } catch { text = 'Licensed under the Apache License, Version 2.0: https://www.apache.org/licenses/LICENSE-2.0\n'; }
    licences.push(`==== ${m.name} (${m.licenseRepo}) by ${m.by || 'Alibaba Cloud (Qwen)'}${open && !m.by && !m.kind ? `; uncensored version from ${pick.repo}` : ''} ====\n\n${text}`);
  }
  if (process.env.QS_NO_MEDIA_PACK) console.log('Lustify and Wan 2.2 left out (QS_NO_MEDIA_PACK)');
  else for (const m of MEDIA) {
    try {
      const plan = await models.planCatalog(m.catalogId);
      console.log(`${m.name}: ${plan.items.map((i) => `${i.repo}/${i.path}`).join(', ')}`);
      if (!WEB) for (const it of plan.items) await get(it.repo, it, path.join(ROOT, 'pack', m.names[it.role]));
      // pack: copied in by the installer; without the folder the app downloads it before it opens.
      entries.push({ id: m.id, catalogId: m.catalogId, name: m.name, kind: m.kind, uncensored: true, files: Object.fromEntries(plan.items.map((i) => [i.role, m.names[i.role]])), pack: true, optional: true, media: true });
      licences.push(m.licence);
      console.log(`  ✓ ${m.kind === 'image' ? 'picture' : 'video'} model for the Liquid Edition`);
    } catch (err) {
      // The Liquid Edition ships complete or not at all: Quicksilver won't open without these.
      throw new Error(`${m.name} could not be downloaded for the models folder: ${err.message}`);
    }
  }
  fs.writeFileSync(path.join(ROOT, 'starter', 'STARTER.json'), JSON.stringify({ models: entries }, null, 2));
  fs.writeFileSync(path.join(ROOT, 'starter', 'MODEL-LICENCES.txt'), licences.join('\n\n'));
  fs.copyFileSync(path.join(ROOT, 'starter', 'MODEL-LICENCES.txt'), path.join(ROOT, 'pack', 'MODEL-LICENCES.txt'));
  const size = (d) => fs.readdirSync(path.join(ROOT, d)).reduce((t, n) => t + fs.statSync(path.join(ROOT, d, n)).size, 0);
  console.log(`inside the installer: ${(size('starter') / 1e9).toFixed(2)} GB · next to it: ${(size('pack') / 1e9).toFixed(2)} GB${WEB ? ' · web installer: every model downloads on first launch' : ''}`);
})().catch((e) => { console.error(e); process.exit(1); });
