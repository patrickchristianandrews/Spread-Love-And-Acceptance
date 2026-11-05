// Downloads the official engine builds that ship inside the installer:
//   engine/llama  ← llama.cpp (llama-server)          github.com/ggml-org/llama.cpp
//   engine/sd     ← stable-diffusion.cpp (sd / sd-cli) github.com/leejet/stable-diffusion.cpp
// Usage: node scripts/fetch-engines.js [--platform win32|linux|darwin]
// Uses GITHUB_TOKEN when set (CI) to avoid API rate limits.
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { ENGINES, pickAssets } = require('../src/shared/engine-spec');
const { downloadTo, extract } = require('../src/main/engines');

const platform = (process.argv.find((a) => a.startsWith('--platform=')) || '').split('=')[1] || process.argv[process.argv.indexOf('--platform') + 1] || process.platform;
const root = path.join(__dirname, '..', 'engine');

async function latest(repo) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'quicksilver-build' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers });
  if (!res.ok) throw new Error(`${repo}: HTTP ${res.status}`);
  return res.json();
}

(async () => {
  for (const [kind, spec] of Object.entries(ENGINES)) {
    const variant = spec.bundled[platform];
    const v = spec.variants[platform]?.[variant];
    if (!v) { console.log(`skip ${kind}: nothing for ${platform}`); continue; }
    const release = await latest(spec.repo);
    console.log(`${kind}: ${spec.repo} ${release.tag_name} (${variant})`);
    const assets = pickAssets(release.assets, v);
    const dest = path.join(root, kind);
    fs.rmSync(dest, { recursive: true, force: true });
    for (const a of assets) {
      const tmp = path.join(os.tmpdir(), a.name);
      process.stdout.write(`  ${a.name} (${(a.size / 1e6).toFixed(0)} MB)… `);
      await downloadTo(a.browser_download_url, tmp);
      extract(tmp, dest);
      fs.rmSync(tmp, { force: true });
      console.log('ok');
    }
    fs.writeFileSync(path.join(dest, 'VERSION.txt'), release.tag_name);
  }
})().catch((e) => { console.error(e); process.exit(1); });
