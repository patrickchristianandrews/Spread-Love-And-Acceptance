// The built-in Build & ship plug-ins (App tester, Design extractor, Security audit, Code docs):
// on by default, switched off stays off, and the two that work without the app window
// (security audit and design extraction) find what they should.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');

process.env.QUICKSILVER_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-plugins-'));
// A home folder of its own, for "Files on this PC".
const HOMEDIR = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-home-'));
for (const d of ['Documents', 'Desktop', 'Downloads']) fs.mkdirSync(path.join(HOMEDIR, d));
process.env.HOME = HOMEDIR; process.env.USERPROFILE = HOMEDIR;
const integrations = require('../src/main/integrations');
const dev = require('../src/main/integrations-dev');
const mcpCatalog = require('../src/main/mcp-catalog');

(async () => {
  // ---- on by default, and every Liquid Edition can use them ----
  const ids = ['apptest', 'designsystem', 'securityaudit', 'codedocs'];
  const list = integrations.list();
  for (const id of ids) {
    const c = list.find((x) => x.id === id);
    assert.ok(c && c.enabled && c.noToken && c.group === 'Build & ship', `${id} is built in and on`);
  }
  const names = integrations.tools().map((t) => t.name);
  for (const n of ['app_test', 'design_extract', 'security_audit', 'code_docs_find', 'code_docs_read']) assert.ok(names.includes(n), `${n} is offered to models`);
  integrations.disable('apptest');
  assert.equal(integrations.list().find((x) => x.id === 'apptest').enabled, false, 'switched off');
  assert.ok(!integrations.tools().some((t) => t.name === 'app_test'), 'and its tool is gone');
  await integrations.save('apptest', {});
  assert.equal(integrations.list().find((x) => x.id === 'apptest').enabled, true, 'and on again');
  console.log('✓ Build & ship plug-ins: built in, on by default, off stays off until switched on');

  // ---- security audit: a small vibe-coded app with the classic holes ----
  const proj = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-vuln-'));
  const put = (f, t) => { fs.mkdirSync(path.dirname(path.join(proj, f)), { recursive: true }); fs.writeFileSync(path.join(proj, f), t); };
  const jwt = (payload) => `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.c2lnbmF0dXJlc2lnbmF0dXJl`;
  put('package.json', JSON.stringify({ dependencies: { next: '15.0.0', '@supabase/supabase-js': '2.0.0', react: '19.0.0' } }));
  put('.gitignore', 'node_modules\n');
  put('.env.local', 'SUPABASE_URL=https://x.supabase.co\n');
  put('lib/supabase.ts', `export const admin = createClient(url, "${jwt({ role: 'service_role', iss: 'supabase' })}");\nexport const anon = createClient(url, "${jwt({ role: 'anon', iss: 'supabase' })}");\n`);
  put('app/api/admin/users/route.ts', 'export async function DELETE(req) { const { id } = await req.json(); await db.query(`delete from users where id = ${id}`); return Response.json({ ok: true }); }\n');
  put('app/api/profile/route.ts', 'import { auth } from "@/auth";\nexport async function POST(req) { const s = await auth(); if (!s) return new Response(null, { status: 401 }); return Response.json({}); }\n');
  put('app/page.tsx', 'export default function P({ html }) { return <div dangerouslySetInnerHTML={{ __html: html }} />; }\nconst k = process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY;\n');
  put('supabase/migrations/001.sql', 'create table public.orders (id uuid, user_id uuid);\ncreate table public.notes (id uuid);\nalter table public.notes enable row level security;\ncreate policy "all" on notes using (true);\n');
  put('node_modules/evil/index.js', 'const k = "AKIAABCDEFGHIJKLMNOP";'); // never read
  const report = dev.securityAudit(proj);
  const has = (re, what) => assert.match(report, re, `${what}\n${report}`);
  has(/CRITICAL[^\n]*service_role[\s\S]*?lib\/supabase\.ts:1/, 'the service_role key in client code');
  assert.equal((report.match(/service_role/g) || []).length >= 1 && !/supabase\.ts:2/.test(report), true, 'the anon key is not flagged');
  has(/CRITICAL[^\n]*no login check \(an admin route!\)[\s\S]*?app\/api\/admin\/users\/route\.ts/, 'an admin route with no auth');
  assert.ok(!/app\/api\/profile\/route\.ts\n/.test(report.split('no login check')[1] || ''), 'a route that checks the session is fine');
  has(/HIGH[^\n]*SQL injection[\s\S]*?route\.ts:1/, 'SQL built from a template string');
  has(/CRITICAL[^\n]*Table "orders" has no row-level security/, 'a table without RLS');
  assert.ok(!/Table "notes" has no row-level/.test(report), 'a table with RLS is fine');
  has(/HIGH[^\n]*using \(true\)/, 'a policy that lets everyone through');
  has(/CRITICAL[^\n]*exposed to the browser/, 'a secret behind NEXT_PUBLIC_');
  has(/dangerouslySetInnerHTML/, 'XSS');
  has(/\.env file is not in \.gitignore/, '.env not ignored');
  assert.ok(!/node_modules|AKIA/.test(report), 'node_modules is skipped');
  assert.ok(report.indexOf('CRITICAL') < report.indexOf('MEDIUM'), 'worst first');
  assert.throws(() => dev.securityAudit(path.join(proj, 'nope')), /Folder not found/);
  console.log('✓ Security audit: service_role key, admin route with no auth, SQL injection, missing RLS, open policy, public secret, XSS, .env; worst first');

  // ---- design extractor: a site with a stylesheet, variables and Google Fonts ----
  const css = ':root{--brand:#635bff;--ink:#0a2540;--radius:8px}body{font-family:"Inter",sans-serif;color:#0a2540;font-size:16px;padding:24px}'
    + 'h1{font-size:48px;font-weight:700;color:#0A2540}.btn{background:#635bff;border-radius:8px;padding:12px 24px;box-shadow:0 2px 5px rgba(0,0,0,.12);transition:all .2s}'
    + '.card{border-radius:12px;padding:24px;gap:16px;color:#fff}@media (min-width: 768px){.card{padding:32px}}';
  const site = http.createServer((req, res) => {
    if (req.url === '/style.css') { res.writeHead(200, { 'Content-Type': 'text/css' }); return res.end(css); }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><head><title>Acme Pay</title><meta name="theme-color" content="#635bff"><link rel="stylesheet" href="/style.css"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700" rel="stylesheet"></head><body><h1>Pay</h1></body></html>');
  });
  await new Promise((r) => site.listen(0, '127.0.0.1', r));
  const md = await dev.extractDesign(`http://127.0.0.1:${site.address().port}/`);
  site.close();
  for (const [re, what] of [[/# DESIGN\.md: Acme Pay/, 'title'], [/#0a2540/, 'colors, normalized'], [/--brand: #635bff/, 'CSS variables'], [/Inter \(Google Fonts\)/, 'fonts'], [/`48px`/, 'type scale'], [/`24px`/, 'spacing'], [/`8px`/, 'radius'], [/0 2px 5px/, 'shadow'], [/`768px`/, 'breakpoint'], [/:root \{[\s\S]*--color-1:/, 'starter tokens'], [/theme color #635bff/, 'theme color']]) assert.match(md, re, `${what}\n${md}`);
  assert.ok(md.indexOf('#0a2540') < md.indexOf('#fff'), 'the most used color comes first');
  console.log('✓ Design extractor: colors, CSS variables, fonts, type and spacing scales, radius, shadows, breakpoints and starter tokens');

  // ---- more plug-ins in the Connectors catalog ----
  const P = mcpCatalog.PRESETS;
  for (const id of ['semgrep', 'sentry', 'firebase', 'prisma', 'neon', 'docker', 'windows', 'mobile', 'duckduckgo', 'arxiv', 'ytranscript', 'word', 'powerpoint', 'coingecko', 'alphavantage', 'ableton', 'godot', 'playwright', 'supabase', 'context7']) {
    assert.ok(P[id] && P[id].name && P[id].note && (P[id].url !== undefined || P[id].command), `${id} is in the catalog`);
  }
  console.log(`✓ ${Object.keys(P).length} ready-made plug-ins under Connectors (Playwright, Supabase and Context7 among them)`);

  // ---- everyday & research plug-ins: built in, on, and only offered when a message needs them ----
  const everyday = require('../src/main/integrations-everyday');
  const tools = require('../src/main/tools');
  const builtIn = integrations.list().filter((c) => c.builtIn);
  assert.ok(builtIn.length >= 18 && builtIn.every((c) => c.enabled && c.noToken && c.when), `${builtIn.length} built-in plug-ins, all on, each saying when it is needed`);
  const want = { 'what is 15% of 2,340?': 'calc', 'convert 5 miles to km': 'calc', 'what time is it in Tokyo': 'worldtime', 'bitcoin price today': 'money', 'find papers on retrieval augmented generation': 'research',
    'how far is Leeds from London': 'maps', 'define serendipity': 'words', 'public holidays in Germany 2027': 'holidays', 'find my invoice pdf in my downloads': 'pcfiles', 'take a screenshot of stripe.com on a phone': 'webshot',
    'summarize https://example.com/post': 'webtools', 'will it rain in Paris tomorrow': 'weather', 'translate hello into Spanish': 'translate', 'test my app at localhost:3000': 'apptest', 'is my supabase app secure?': 'securityaudit' };
  for (const [t, id] of Object.entries(want)) assert.ok(integrations.relevant(t).has(id), `"${t}" → ${id} (got ${[...integrations.relevant(t)]})`);
  assert.equal(integrations.relevant('write me a poem about cats').size, 0, 'an ordinary message needs no plug-in');
  const offered = async (t) => (await tools.available(t)).map((x) => x.name);
  assert.deepEqual(await offered('write me a poem about cats'), [], 'so no tools are handed to the model');
  assert.deepEqual((await offered('convert 5 miles to km')).sort(), ['calculate', 'convert_units'], 'only the calculator for a conversion');
  assert.ok((await tools.available()).length >= 30, 'without a message: everything that is on (Connectors page)');
  console.log(`✓ ${builtIn.length} built-in plug-ins, on by default; each is offered to the model only when the message needs it`);

  // Calculator: exact, and never runs code.
  assert.equal(everyday.calculate('(12.5 * 4) / 3'), '(12.5 * 4) / 3 = 16.6666666666667');
  assert.equal(everyday.calculate('2^10 + sqrt(16) - 5!'), '2^10 + sqrt(16) - 5! = 908');
  assert.equal(everyday.calculate('15% * 2,340'), '15% * 2340 = 351');
  assert.equal(everyday.calculate('2(3+4)'), '2(3+4) = 14');
  assert.throws(() => everyday.calculate('process.exit(1)'), /only work out numbers|Unknown word/);
  assert.throws(() => everyday.calculate('1/0'), /not a finite number/);
  assert.equal(everyday.convertUnits(5, 'miles', 'km'), '5 miles = 8.04672 km (length)');
  assert.equal(everyday.convertUnits(100, 'F', 'C'), '100 F = 37.7778 C');
  assert.equal(everyday.convertUnits(1, 'gib', 'mb'), '1 gib = 1073.7418 mb (data)');
  assert.throws(() => everyday.convertUnits(1, 'kg', 'km'), /Can't convert kg to km/);
  console.log('✓ Calculator & units: exact sums (powers, roots, factorials, percentages, implied multiplication), no code ever run; conversions incl. temperature');

  // Online plug-ins, against stand-in services.
  const realFetch = global.fetch;
  const routes = [
    [/api\.frankfurter\.app\/latest\?amount=100&from=USD&to=EUR/, { amount: 100, base: 'USD', date: '2026-11-13', rates: { EUR: 86.12 } }],
    [/api\.coingecko\.com.*ids=bitcoin/, { bitcoin: { usd: 98000, usd_24h_change: 1.234, usd_market_cap: 1.9e12 } }],
    [/export\.arxiv\.org/, '<feed><entry><id>http://arxiv.org/abs/2401.00001</id><published>2024-01-01T00:00:00Z</published><title>Retrieval  Augmented\n Generation</title><summary>We study RAG.</summary><author><name>Ada Lovelace</name></author></entry></feed>'],
    [/api\.dictionaryapi\.dev\/api\/v2\/entries\/en\/serendipity/, [{ word: 'serendipity', phonetic: '/ˌsɛɹənˈdɪpɪti/', meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'A happy accident.' }], synonyms: ['chance', 'luck'] }] }]],
    [/date\.nager\.at\/api\/v3\/PublicHolidays\/2027\/DE/, [{ date: '2027-10-03', localName: 'Tag der Deutschen Einheit', name: 'German Unity Day', global: true }]],
    [/stooq\.com.*s=aapl\.us/, 'Symbol,Date,Time,Open,High,Low,Close,Volume\nAAPL.US,2026-11-12,22:00:00,230,235,229,234.5,51000000\n'],
  ];
  global.fetch = async (url) => {
    const hit = routes.find(([re]) => re.test(String(url)));
    if (!hit) return new Response('nope', { status: 404 });
    return typeof hit[1] === 'string' ? new Response(hit[1], { status: 200 }) : new Response(JSON.stringify(hit[1]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const T = Object.fromEntries(integrations.tools().map((t) => [t.name, t]));
    assert.match(await T.currency_convert.run({ amount: 100, from: 'usd', to: 'eur' }), /100 USD on 2026-11-13: 86\.12 EUR/);
    assert.match(await T.crypto_price.run({ coins: 'btc' }), /bitcoin: 98000 USD \(1\.23% in 24 h, market cap 1,900,000,000,000\)/);
    assert.match(await T.stock_quote.run({ ticker: 'AAPL' }), /AAPL 2026-11-12 .*close 234\.5/);
    assert.match(await T.arxiv_search.run({ query: 'rag' }), /\[1\] Retrieval Augmented Generation \(2024-01-01\)\nAda Lovelace\nhttp:\/\/arxiv\.org\/abs\/2401\.00001/);
    assert.match(await T.define_word.run({ word: 'serendipity' }), /\(noun\) A happy accident\.[\s\S]*synonyms: chance, luck/);
    assert.match(await T.public_holidays.run({ country: 'de', year: 2027 }), /2027-10-03 Tag der Deutschen Einheit \(German Unity Day\)/);
  } finally { global.fetch = realFetch; }
  console.log('✓ Money, research, dictionary and holidays plug-ins read their services correctly');

  // Files on this PC: only Documents, Desktop, Downloads (and folders you add); saving asks first.
  fs.writeFileSync(path.join(HOMEDIR, 'Downloads', 'Invoice-March.txt'), 'Total due: $420');
  const F = Object.fromEntries(integrations.tools().map((t) => [t.name, t]));
  assert.match(await F.files_find.run({ name: 'invoice' }), /Downloads[\\/]Invoice-March\.txt/);
  assert.equal(await F.files_read.run({ path: path.join(HOMEDIR, 'Downloads', 'Invoice-March.txt') }), 'Total due: $420');
  await assert.rejects(F.files_read.run({ path: '/etc/passwd' }), /Only files in/);
  await assert.rejects(F.files_read.run({ path: path.join(HOMEDIR, 'Documents', '..', '..', 'etc') }), /Only files in/);
  assert.equal(F.files_save.write, true, 'saving a file asks first');
  assert.match(await F.files_save.run({ path: path.join(HOMEDIR, 'Documents', 'notes', 'a.md'), text: 'hi' }), /Saved/);
  await assert.rejects(F.files_save.run({ path: path.join(HOMEDIR, 'Documents', 'notes', 'a.md'), text: 'again' }), /already exists/);
  console.log('✓ Files on this PC: finds and reads in your folders only; saving asks first and never overwrites unasked');

  // ---- helpers fetched by Quicksilver: Node.js and uv, checked against their fingerprints ----
  const crypto = require('node:crypto');
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-dist-'));
  const mk = (dir, files, archive) => { const d = path.join(dist, 'src', dir); for (const [f, body] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), body, { mode: 0o755 }); } require('node:child_process').execFileSync('tar', ['-czf', path.join(dist, archive), '-C', path.join(dist, 'src'), dir]); return crypto.createHash('sha256').update(fs.readFileSync(path.join(dist, archive))).digest('hex'); };
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  const nodeFile = `node-v22.99.0-linux-${arch}.tar.gz`;
  const nodeSha = mk(`node-v22.99.0-linux-${arch}`, { 'bin/npx': '#!/bin/sh\necho npx-from-quicksilver "$@"\n', 'bin/node': '#!/bin/sh\n' }, nodeFile);
  fs.writeFileSync(path.join(dist, 'SHASUMS256.txt'), `${'0'.repeat(64)}  node-v22.99.0-win-x64.zip\n${nodeSha}  ${nodeFile}\n`);
  const uvFile = `uv-${arch === 'arm64' ? 'aarch64' : 'x86_64'}-unknown-linux-gnu.tar.gz`;
  mk('uv-dir', { uvx: '#!/bin/sh\necho uvx\n', uv: '#!/bin/sh\n' }, uvFile);
  fs.writeFileSync(path.join(dist, `${uvFile}.sha256`), `${'f'.repeat(64)}  ${uvFile}\n`); // a wrong fingerprint
  const srv = http.createServer((req, res) => { const f = path.join(dist, decodeURIComponent(req.url.split('?')[0]).replace(/^\/(node|uv)\//, '')); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200); fs.createReadStream(f).pipe(res); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  process.env.QS_RUNTIME_FORCE = '1';
  process.env.QS_NODE_DIST = `http://127.0.0.1:${srv.address().port}/node`;
  process.env.QS_UV_DIST = `http://127.0.0.1:${srv.address().port}/uv`;
  const runtimes = require('../src/main/runtimes');
  try {
    const said = [];
    const r = await runtimes.resolveCommand('npx', { PATH: '/usr/bin' }, (t) => said.push(t));
    assert.match(r.command, /runtimes[\\/]node[\\/].*bin[\\/]npx$/);
    assert.ok(r.env.PATH.startsWith(path.dirname(r.command)) && r.env.PATH.endsWith('/usr/bin'), 'npx finds node beside it');
    assert.match(require('node:child_process').execFileSync(r.command, ['-y', 'x'], { env: r.env }).toString(), /npx-from-quicksilver -y x/);
    assert.ok(said.some((t) => /Getting Node\.js/.test(t)));
    const again = []; await runtimes.resolveCommand('npx', {}, (t) => again.push(t));
    assert.equal(again.length, 0, 'fetched once, then kept');
    await assert.rejects(runtimes.resolveCommand('uvx'), /did not match its published fingerprint/);
    assert.ok(!fs.existsSync(path.join(process.env.QUICKSILVER_HOME, 'engines', 'runtimes', 'uv')), 'a download that fails its check is thrown away');
    assert.deepEqual(await runtimes.resolveCommand('python', { A: 1 }), { command: 'python', env: { A: 1 } }, 'other commands are left alone');
  } finally { srv.close(); delete process.env.QS_RUNTIME_FORCE; }
  console.log('✓ Plug-in helpers: Node.js fetched the first time a plug-in needs it, checked against its fingerprint and kept; a mismatch is refused');

  // ---- the Liquid Edition's free extras ----
  const mcp = require('../src/main/mcp');
  assert.equal(mcp.addLiquidPack(), mcpCatalog.LIQUID_PACK.length, 'added once');
  assert.equal(mcp.addLiquidPack(), 0, 'never twice');
  const extras = (await mcp.status()).filter((x) => x.preset);
  assert.ok(extras.length >= 9 && extras.every((x) => x.enabled), `${extras.length} free extras on`);
  mcp.remove(extras.find((x) => x.preset === 'semgrep').id);
  assert.equal(mcp.addLiquidPack(), 0, 'one you removed stays removed');
  const started = Date.now();
  assert.deepEqual(await mcp.tools('write me a poem'), [], 'an ordinary message starts none of them');
  assert.ok(Date.now() - started < 1000 && (await mcp.status()).every((x) => !x.error && !x.connected), 'nothing was even started');
  console.log(`✓ Liquid Edition free extras: ${extras.length} added once (Playwright, Excel, Word, PowerPoint, YouTube transcripts…), removed stays removed, started only when a message needs one`);
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
