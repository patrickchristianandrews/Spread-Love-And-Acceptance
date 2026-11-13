// Giant models (colibri, optional): the PC check, the download checked against GitHub's published
// fingerprint (a mismatch is refused), and colibri's server started and connected so its models
// appear like any other source. A stand-in colibri and release are used.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
process.env.QUICKSILVER_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-giant-'));
const giant = require('../src/main/giant');
const providers = require('../src/main/providers');

(async () => {
  // The PC check.
  assert.equal(giant.fit({ vramGB: 24, ramGB: 64 }).level, 'good');
  assert.equal(giant.fit({ vramGB: 8, ramGB: 32 }).level, 'ok');
  const weak = giant.fit({ vramGB: 0, ramGB: 16 });
  assert.equal(weak.level, 'no'); assert.match(weak.text, /too small for giant models/);
  assert.ok(giant.fit({ vramGB: 24, ramGB: 64 }).models.every((m, i) => m.wpsHere >= weak.models[i].wpsHere), 'a bigger PC is estimated faster');
  console.log('✓ giant models: the PC check (graphics card, memory, disk) with speed estimates per model');

  // A stand-in colibri: a "coli" that serves an OpenAI-compatible model list.
  if (process.platform === 'win32') { console.log('(skipping the stand-in server on Windows)'); process.exit(0); }
  const pkg = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-coli-'));
  const top = path.join(pkg, 'colibri-v9.9.9-linux-x86_64'); fs.mkdirSync(top);
  fs.writeFileSync(path.join(top, 'coli'), `#!/usr/bin/env node
const port = Number(process.argv[process.argv.indexOf('--port') + 1]);
require('http').createServer((q, s) => { s.writeHead(200, { 'Content-Type': 'application/json' }); s.end(JSON.stringify({ object: 'list', data: [{ id: 'deepseek-v4-flash', object: 'model' }] })); }).listen(port, '127.0.0.1');
`, { mode: 0o755 });
  const archive = path.join(pkg, 'colibri-v9.9.9-linux-x86_64.tar.gz');
  execFileSync('tar', ['-czf', archive, '-C', pkg, 'colibri-v9.9.9-linux-x86_64']);
  const sha = crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
  const srv = http.createServer((q, s) => { if (q.url.endsWith('.tar.gz')) { s.writeHead(200, { 'Content-Length': fs.statSync(archive).size }); fs.createReadStream(archive).pipe(s); } else { s.writeHead(404); s.end(); } });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const realFetch = global.fetch; let digest = `sha256:${'0'.repeat(64)}`;
  global.fetch = async (url, o) => {
    if (/api\.github\.com\/repos\/JustVugg\/colibri\/releases\/latest/.test(String(url))) return new Response(JSON.stringify({ tag_name: 'v9.9.9', assets: [{ name: 'colibri-v9.9.9-linux-x86_64.tar.gz', size: fs.statSync(archive).size, digest, browser_download_url: `http://127.0.0.1:${srv.address().port}/colibri-v9.9.9-linux-x86_64.tar.gz` }] }), { status: 200 });
    return realFetch(url, o);
  };
  try {
    await assert.rejects(giant.install({ vramGB: 24, ramGB: 64 }), /didn't match its published fingerprint/);
    assert.equal(giant.status().installed, false, 'nothing kept from a download that failed its check');
    digest = `sha256:${sha}`;
    const said = [];
    assert.deepEqual(await giant.install({ vramGB: 24, ramGB: 64 }, (t) => said.push(t)), { version: 'v9.9.9' });
    assert.ok(said.some((t) => /Downloading colibri-v9\.9\.9/.test(t)));
    assert.equal(giant.status().installed, true);
  } finally { global.fetch = realFetch; srv.close(); }
  // Started and connected: its models are a model source like LM Studio or Ollama.
  const st = await giant.start();
  assert.equal(st.running, true);
  const p = providers.publicList().find((x) => x.preset === 'colibri');
  assert.ok(p, 'connected as a model source');
  assert.deepEqual(p.models, ['deepseek-v4-flash'], 'its models are listed');
  assert.equal(giant.stop().running, false);
  console.log('✓ giant models: colibri downloaded only with a matching fingerprint, started, and its models listed like any other source');
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
