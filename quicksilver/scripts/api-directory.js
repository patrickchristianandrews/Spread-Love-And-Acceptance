// Writes API-DIRECTORY.md: every cloud service Quicksilver can use, by task, free or paid, what
// the free plan gives you, with links. Made from the app's own tables (the same ones the API
// directory in the app is drawn from), so the page and the app always say the same.
//   node scripts/api-directory.js           writes the file
//   node scripts/api-directory.js --check   fails if the file is out of date
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');

process.env.QUICKSILVER_HOME ||= fs.mkdtempSync(path.join(os.tmpdir(), 'qs-dir-'));
const ROOT = path.join(__dirname, '..');
const { PRESETS } = require('../src/main/providers');
const ctx = { S: { providers: [] }, document: { addEventListener() {} }, console };
vm.createContext(ctx);
for (const f of ['apirank.js', 'apidir.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', 'renderer', 'js', f), 'utf8').replace(/^(const|let) /gm, 'var '), ctx, { filename: f });

const list = ctx.apiDirectory(PRESETS);
const cell = (t) => String(t || '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
const lines = [
  '# Quicksilver API directory',
  '',
  `Every cloud service Quicksilver can use (${list.length} of them), by task. In each task: free ones first, then free to start, then paid, with what the free plan gives you, what it costs after, and a link to get its key. A service appears under every task it is good at.`,
  '',
  'Free allowances and prices are as of November 2026 and change often: the "prices" link shows today\'s. Quicksilver works without any of these; they are optional additions. The same list is in the app under Guide → Best cloud AIs, and under Models → Connect an API → API directory.',
  '',
  `Tasks: ${Object.entries(ctx.DIR_TASKS).map(([, [ic, l]]) => `${ic} ${l}`).join(' · ')}`,
  '',
];
for (const [task, [ic, label]] of Object.entries(ctx.DIR_TASKS)) {
  const mine = ctx.apiDirectoryFor(list, task);
  if (!mine.length) continue;
  lines.push(`## ${ic} ${label}`, '');
  for (const [kind, [kindLabel]] of Object.entries(ctx.DIR_KINDS)) {
    const rows = mine.filter((x) => x.kind === kind);
    if (!rows.length) continue;
    lines.push(`### ${kindLabel}`, '', '| Service | Best for | What free gets you | After that | Links |', '|---|---|---|---|---|');
    for (const x of rows) {
      const links = [x.link ? `[${x.where === 'site' || !x.preset || PRESETS[x.preset]?.noKey ? 'Site' : 'Get a key'}](${x.link})` : '', x.priceUrl && x.priceUrl !== x.link ? `[Prices](${x.priceUrl})` : ''].filter(Boolean).join(' · ');
      lines.push(`| **${cell(x.name)}**${x.quality != null ? ` (${x.quality}/10)` : ''}${x.where === 'site' ? ' · on their site' : ''} | ${cell(x.bestFor)} | ${cell(x.freeGets) || 'Nothing'} | ${cell(x.after)} | ${links} |`);
    }
    lines.push('');
  }
}
const local = ctx.apiDirectoryLocal(PRESETS);
lines.push('## 💻 On your own PC or server', '', 'Free, and nothing leaves your PC. Quicksilver connects to these if you already run them.', '', ...local.map((x) => `- **${cell(x.name)}**: ${cell(x.freeGets)}`), '');
const text = lines.join('\n');
const file = path.join(ROOT, 'API-DIRECTORY.md');
if (process.argv.includes('--check')) {
  const have = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (have !== text) { console.error('API-DIRECTORY.md is out of date: run "node scripts/api-directory.js".'); process.exit(1); }
  // Every service has somewhere to go, and every task has at least one service.
  const noLink = list.filter((x) => !/^https:\/\//.test(x.link)).map((x) => x.name);
  const empty = Object.keys(ctx.DIR_TASKS).filter((t) => !ctx.apiDirectoryFor(list, t).length);
  if (noLink.length || empty.length) { console.error(`API directory: no link for ${noLink.join(', ') || 'none'}; no service for ${empty.join(', ') || 'none'}`); process.exit(1); }
  console.log(`✓ API directory: ${list.length} services, each with a link, across ${Object.keys(ctx.DIR_TASKS).length} tasks; API-DIRECTORY.md is up to date`);
} else { fs.writeFileSync(file, text); console.log(`wrote ${path.relative(process.cwd(), file)} (${list.length} services)`); }
process.exit(0);
