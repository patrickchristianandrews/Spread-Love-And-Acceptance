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
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
