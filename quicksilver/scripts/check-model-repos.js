// Checks that catalog models marked `verify` really exist on Hugging Face with a usable download
// (the uncensored Qwen3 models): for each, the first copy that works is reported, and the build
// fails if none does, so a model that can't be downloaded never ships.
// Usage: node scripts/check-model-repos.js
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.QUICKSILVER_HOME ||= fs.mkdtempSync(path.join(os.tmpdir(), 'qs-check-'));
const models = require('../src/main/models');
const catalog = require('../src/shared/catalog');

(async () => {
  let bad = 0;
  for (const m of catalog.TEXT_MODELS.filter((x) => x.verify)) {
    let found = null;
    for (const repo of [m.repo, ...(m.alt || [])]) {
      try {
        const { options } = await models.ggufOptions(repo);
        const opt = options.find((o) => o.quant.replace(/^UD-/, '') === m.quant) || options[0];
        if (opt) { found = { repo, quant: opt.quant, gb: (opt.size / 1e9).toFixed(2) }; break; }
        console.log(`  ${repo}: no usable download`);
      } catch (err) { console.log(`  ${repo}: ${String(err.message || err).slice(0, 120)}`); }
    }
    if (found) console.log(`✓ ${m.name}: ${found.quant} ${found.gb} GB from ${found.repo}${found.repo !== m.repo ? ' (a backup copy; the app tries it automatically)' : ''}`);
    else { console.log(`✗ ${m.name}: no copy found`); bad++; }
  }
  if (bad) { console.error(`${bad} model(s) can't be downloaded`); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(1); });
