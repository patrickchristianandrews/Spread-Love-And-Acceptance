// Back-end test: runs the real main-process modules against stand-in engines (test/fakes).
// Run: node test/backend.test.js
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const assert = require('node:assert');

const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-test-'));
process.env.QUICKSILVER_HOME = HOME;
process.env.QS_LLAMA_SERVER = path.join(__dirname, 'fakes', 'llama-server');
process.env.QS_SD_BIN = path.join(__dirname, 'fakes', 'sd');
const TINY = path.join(__dirname, 'fixtures', 'tiny.gguf');

const store = require('../src/main/store');
const hardware = require('../src/main/hardware');
const models = require('../src/main/models');
const llama = require('../src/main/llama');
const complete = require('../src/main/complete');
const providers = require('../src/main/providers');
const docs = require('../src/main/docs');
const knowledge = require('../src/main/knowledge');
const media = require('../src/main/media');
const apiserver = require('../src/main/apiserver');
const catalog = require('../src/shared/catalog');
const oai = require('../src/main/oai');

async function collect(gen) {
  const out = { text: '', reasoning: '', steps: [], status: [], stats: null };
  for await (const ev of gen) {
    if (ev.type === 'text') out.text += ev.text;
    if (ev.type === 'reasoning') out.reasoning += ev.text;
    if (ev.type === 'step') out.steps.push(ev.step);
    if (ev.type === 'status') out.status.push(ev.text);
    if (ev.type === 'stats') out.stats = ev;
  }
  return out;
}

(async () => {
  // Hardware: GPU found through the engine's device list.
  const hw = await hardware.detect({ fresh: true });
  assert.equal(hw.gpuName, 'Fake GPU 8GB');
  assert.ok(Math.abs(hw.vramGB - 8) < 0.01);
  console.log('✓ hardware', hw.ramGB.toFixed(0), 'GB RAM,', hw.gpuName);

  // GGUF reader.
  const info = await llama.readGguf(TINY);
  assert.equal(info.name, 'Tiny Test Model'); assert.equal(info.layers, 2); assert.equal(info.architecture, 'llama');
  console.log('✓ gguf reader');

  // Register models: two text models from different "families" and one vision model.
  const dir = store.dir('models');
  const copy = (n) => { const p = path.join(dir, n); fs.copyFileSync(TINY, p); return p; };
  models.add({ id: 'qwen3-8b', name: 'Qwen3 8B', kind: 'text', catalogId: 'qwen3-8b', files: { model: copy('qwen.gguf') }, size: 5e9 });
  models.add({ id: 'phi-4', name: 'Phi-4 14B', kind: 'text', catalogId: 'phi-4', files: { model: copy('phi.gguf') }, size: 9e9 });
  models.add({ id: 'gemma-3-4b', name: 'Gemma 3 4B', kind: 'text', catalogId: 'gemma-3-4b', files: { model: copy('gemma.gguf'), mmproj: copy('mmproj-gemma.gguf') }, size: 3e9, vision: true });
  assert.equal(models.list().length, 3);

  // Single local model with reasoning split and stats.
  const r1 = await collect(complete.run('local:qwen3-8b', { messages: [{ role: 'user', content: 'Hello there' }], temperature: 0.5, maxTokens: 100, contextSize: 4096 }));
  assert.match(r1.text, /Answer from qwen\.gguf: you said "Hello there"/);
  assert.match(r1.reasoning, /thinking/);
  assert.equal(r1.stats.tps, 42.5);
  console.log('✓ local chat:', r1.text);

  // A text-only model refuses images clearly.
  const img = { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0KGgo=' } };
  await assert.rejects(collect(complete.run('local:qwen3-8b', { messages: [{ role: 'user', content: [{ type: 'text', text: 'What is this?' }, img] }] })), /can't see images/);
  console.log('✓ text-only model rejects images with a clear message');

  // Powerhouse stack: vision describes, two drafters, lead combines.
  complete.saveStack({ id: 'office-power', name: 'Office Powerhouse', emoji: '📊', members: { vision: 'local:gemma-3-4b', drafters: ['local:qwen3-8b', 'local:phi-4'], judge: 'local:phi-4' } });
  const live = [];
  const r2 = await collect(complete.run('stack:office-power', { messages: [{ role: 'system', content: 'Be an analyst.' }, { role: 'user', content: [{ type: 'text', text: 'Summarise this chart' }, img] }], temperature: 0.4, maxTokens: 500, contextSize: 4096, onStep: (s) => live.push(s.role) }));
  const uniq = (steps) => [...new Map(steps.map((s) => [s.index, s])).values()];
  const roles = uniq(r2.steps).map((s) => s.role);
  assert.deepEqual(roles, ['vision', 'draft', 'draft', 'lead']);
  assert.match(r2.steps.find((s) => s.role === 'vision' && s.done).text, /chart showing sales/);
  assert.match(r2.steps.filter((s) => s.role === 'draft' && s.done)[0].text, /saw image description/);
  assert.match(r2.text, /^FINAL from phi\.gguf combining 2 drafts\.$/);
  assert.ok(live.includes('draft'));
  console.log('✓ powerhouse stack:', roles.join(' → '), '→', r2.text);

  // Infuse: debate mode adds a critique-and-revise round; consensus uses the consensus lead.
  complete.saveStack({ id: 'infused', name: 'My Infusion', emoji: '✨', members: { drafters: ['local:qwen3-8b', 'local:phi-4'], judge: 'local:phi-4', mode: 'debate' } });
  const rd = await collect(complete.run('stack:infused', { messages: [{ role: 'user', content: 'Debate this' }], maxTokens: 200, contextSize: 4096 }));
  const dRoles = uniq(rd.steps).map((s) => s.role);
  assert.deepEqual(dRoles, ['draft', 'draft', 'critique', 'critique', 'lead']);
  assert.match(rd.text, /combining 4 drafts/);
  console.log('✓ infuse (debate):', dRoles.join(' → '));

  // Balanced stack (one drafter + reviewer) and memory pool.
  complete.saveStack({ id: 'bal', name: 'Balanced', members: { drafters: ['local:qwen3-8b'], judge: 'local:phi-4' } });
  const r3 = await collect(complete.run('stack:bal', { messages: [{ role: 'user', content: 'Plan my week' }], maxTokens: 200, contextSize: 4096 }));
  assert.equal(uniq(r3.steps).map((s) => s.role).join(','), 'draft,lead');
  console.log('✓ balanced stack; running servers:', llama.status().length);

  // Providers: an OpenAI-compatible API (the fake server stands in for one).
  const s = await llama.ensure({ file: path.join(dir, 'qwen.gguf'), name: 'x' }, { contextSize: 4096 });
  const p = providers.upsert({ preset: 'custom', name: 'Test API', baseUrl: `http://127.0.0.1:${s.port}/v1`, models: ['test-model'] }, 'sk-test');
  const r4 = await collect(complete.run(`api:${p.id}:test-model`, { messages: [{ role: 'user', content: 'Hi API' }], maxTokens: 50 }));
  assert.match(r4.text, /you said "Hi API"/);
  assert.ok(complete.targets().some((t) => t.target === `api:${p.id}:test-model`));
  console.log('✓ OpenAI-compatible API provider');

  // Think-tag splitting for models that write <think> inline.
  const split = oai.thinkSplitter();
  const parts = [...split('<thi'), ...split('nk>plan</th'), ...split('ink>Answer')];
  assert.equal(parts.filter((x) => x.type === 'reasoning').map((x) => x.text).join(''), 'plan');
  assert.equal(parts.filter((x) => x.type === 'text').map((x) => x.text).join(''), 'Answer');
  console.log('✓ <think> splitting');

  // Documents: CSV profile, XLSX, PPTX-ish text, HTML.
  const csv = 'Region,Revenue,Date\nNorth,"1,200",2025-01-03\nSouth,800,2025-02-10\nNorth,1000,2025-03-15\n';
  const d1 = await docs.extract('sales.csv', Buffer.from(csv));
  assert.equal(d1.kind, 'spreadsheet');
  assert.match(d1.text, /Revenue \(number\): count 3, sum 3,000, mean 1,000, min 800, max 1,200/);
  assert.match(d1.text, /Date \(date\): 3 values from 2025-01-03 to 2025-03-15/);
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Q1');
  ws.addRow(['Item', 'Units']); ws.addRow(['Pens', 10]); ws.addRow(['Paper', 32]);
  const d2 = await docs.extract('q1.xlsx', Buffer.from(await wb.xlsx.writeBuffer()));
  assert.match(d2.text, /Units \(number\): count 2, sum 42/);
  const d3 = await docs.extract('page.html', Buffer.from('<html><script>x()</script><h1>Title</h1><p>Body &amp; more</p></html>'));
  assert.equal(d3.text.includes('x()'), false); assert.match(d3.text, /Body & more/);
  console.log('✓ documents (CSV, Excel, HTML)');

  // Knowledge bases: isolated collections, files and a website.
  const libDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-lib-'));
  fs.writeFileSync(path.join(libDir, 'policy.md'), '# Travel policy\n\nEmployees may claim mileage at 45 pence per mile for business trips.\n\nHotels must be booked through the travel portal.');
  fs.writeFileSync(path.join(libDir, 'menu.txt'), 'The cafeteria serves soup on Mondays and pasta on Fridays.');
  const hr = knowledge.createCollection({ name: 'HR', emoji: '🗂️' });
  const med = knowledge.createCollection({ name: 'Clinical', emoji: '🩺' });
  const added = await knowledge.addPaths(hr.id, [libDir]);
  assert.equal(added.added, 2);
  const http = require('node:http');
  const site = http.createServer((q, r) => {
    r.writeHead(200, { 'Content-Type': 'text/html' });
    if (q.url === '/docs/') r.end('<html><title>Guide home</title><nav>menu</nav><main><p>' + 'Welcome to the dosage guide. '.repeat(20) + '</p><a href="/docs/aspirin">Aspirin</a><a href="/other">Other</a></main></html>');
    else if (q.url === '/docs/aspirin') r.end('<html><title>Aspirin dosing</title><main><p>' + 'Adult aspirin dosing for pain is 300 to 1000 milligrams every four to six hours. '.repeat(5) + '</p></main></html>');
    else r.end('<html><title>Off-site</title><main>' + 'unrelated '.repeat(100) + '</main></html>');
  }).listen(0);
  await new Promise((r) => site.once('listening', r));
  const web = await knowledge.addWebsite(med.id, `http://127.0.0.1:${site.address().port}/docs/`, { maxPages: 10 });
  site.close();
  assert.equal(web.added, 2, 'crawls the site section only');
  const hits = await knowledge.search('mileage rate business trip', { collectionIds: [hr.id] });
  assert.equal(hits[0].title, 'policy.md');
  const isolated = await knowledge.search('mileage rate business trip', { collectionIds: [med.id] });
  assert.ok(!isolated.some((h) => h.title === 'policy.md'), 'collections are isolated');
  const medHits = await knowledge.search('aspirin dose milligrams', { collectionIds: [med.id] });
  assert.equal(medHits[0].title, 'Aspirin dosing');
  assert.equal(knowledge.collections().find((c) => c.id === med.id).docs, 2);
  console.log('✓ knowledge bases: files, website crawl, isolation');

  // Studio: image generation, AI edit, video generation and video editing.
  const sdModel = models.add({ id: 'sdxl-turbo', name: 'SDXL Turbo', kind: 'image', catalogId: 'sdxl-turbo', files: { model: copy('sdxl.safetensors') }, size: 7e9 });
  let progress = 0;
  const g1 = await media.generate('job1', { modelId: sdModel.id, mode: 'generate', prompt: 'a pastel droplet', width: 64, height: 64 }, { onProgress: (v) => { progress = v; } });
  assert.ok(fs.existsSync(g1.file)); assert.equal(progress, 1);
  const g2 = await media.generate('job2', { modelId: sdModel.id, mode: 'edit', prompt: 'make it blue', image: g1.file, strength: 0.5, width: 64, height: 64 });
  assert.ok(fs.statSync(g2.file).size > 0);
  models.add({ id: 'wan2.1-1.3b', name: 'Wan', kind: 'video', catalogId: 'wan2.1-1.3b', files: { diffusion: copy('wan.safetensors'), vae: copy('wanvae.safetensors'), t5xxl: copy('umt5.gguf') }, size: 7e9 });
  const v1 = await media.generate('job3', { modelId: 'wan2.1-1.3b', mode: 'generate', prompt: 'waves', width: 160, height: 96, frames: 8 });
  assert.match(v1.file, /\.mp4$/);
  const info2 = await media.probe(v1.file);
  assert.ok(info2.duration > 0.5);
  const e1 = await media.editVideo(v1.file, { start: 0.2, end: 0.9, speed: 2, crop: 'square', format: 'mp4' });
  const info3 = await media.probe(e1.file);
  assert.ok(info3.width === info3.height, 'square crop');
  const gif = await media.editVideo(v1.file, { format: 'gif' });
  assert.match(gif.file, /\.gif$/);
  const frame = await media.extractFrame(v1.file, 0.5);
  assert.ok(fs.existsSync(frame.file));
  assert.ok(media.gallery().length >= 6);
  console.log('✓ studio: image, AI edit, video, trim/speed/crop, GIF, frame');

  // API server, streaming and not.
  store.saveConfig({ apiServer: { enabled: true, port: 18337, requireKey: true } });
  store.setSecret('apiServerKey', 'qs-secret');
  const st = await apiserver.start();
  assert.ok(st.running);
  const base = 'http://127.0.0.1:18337/v1';
  const unauth = await fetch(`${base}/models`);
  assert.equal(unauth.status, 401);
  const auth = { Authorization: 'Bearer qs-secret', 'Content-Type': 'application/json' };
  const ml = await (await fetch(`${base}/models`, { headers: auth })).json();
  assert.ok(ml.data.some((m) => m.id === 'stack:office-power'));
  assert.ok(ml.data.some((m) => m.id === 'image:sdxl-turbo'));
  const nonStream = await (await fetch(`${base}/chat/completions`, { method: 'POST', headers: auth, body: JSON.stringify({ model: 'local:qwen3-8b', messages: [{ role: 'user', content: 'via api' }] }) })).json();
  assert.match(nonStream.choices[0].message.content, /you said "via api"/);
  const streamed = [];
  for await (const ev of oai.streamChat({ baseUrl: base, apiKey: 'qs-secret', body: { model: 'Office Powerhouse', messages: [{ role: 'user', content: 'stack via api' }] } })) if (ev.type === 'text') streamed.push(ev.text);
  assert.match(streamed.join(''), /FINAL from phi\.gguf combining 2 drafts/);
  const imgRes = await (await fetch(`${base}/images/generations`, { method: 'POST', headers: auth, body: JSON.stringify({ model: 'image:sdxl-turbo', prompt: 'a cat', size: '64x64' }) })).json();
  assert.ok(imgRes.data[0].b64_json.length > 50);
  apiserver.stop();
  console.log('✓ API server: auth, models, chat (stream + not), stacks by name, images');

  // Tools: an MCP server (official SDK, stdio) used by a local model, with approvals.
  const mcp = require('../src/main/mcp');
  const toolbox = require('../src/main/tools');
  const srv = mcp.upsert({ name: 'Test MCP', transport: 'stdio', command: process.execPath, args: [path.join(__dirname, 'fakes', 'mcp-server.js')] });
  const avail = await toolbox.available();
  const echo = avail.find((t) => t.name.endsWith('_echo'));
  const note = avail.find((t) => t.name.endsWith('_save_note'));
  assert.ok(echo && note, 'MCP tools listed');
  assert.equal(echo.write, false); assert.equal(note.write, true);
  const toolEvents = [];
  const r6 = await collect((async function* () { for await (const ev of complete.run('local:qwen3-8b', { messages: [{ role: 'user', content: 'Please use echo' }], useTools: true, maxTokens: 100, contextSize: 4096 })) { if (ev.type === 'tool') toolEvents.push(ev.call); yield ev; } })());
  assert.match(r6.text, /Tool said: echo: hello from the model/);
  assert.equal(toolEvents.at(-1).status, 'done');
  let asked = null;
  const r7 = await collect(complete.run('local:qwen3-8b', { messages: [{ role: 'user', content: 'Please use save_note' }], useTools: true, maxTokens: 100, contextSize: 4096, approve: async (q) => { asked = q; return { ok: true }; } }));
  assert.ok(asked && /Test MCP/.test(asked.summary), 'write tool asked for approval');
  assert.match(r7.text, /saved: hello from the model/);
  const r8 = await collect(complete.run('local:qwen3-8b', { messages: [{ role: 'user', content: 'Please use save_note' }], useTools: true, maxTokens: 100, contextSize: 4096, approve: async () => ({ ok: false }) }));
  assert.match(r8.text, /declined/);
  // Tools inside a stack: the lead gathers, then the stack answers.
  const r9 = await collect(complete.run('stack:bal', { messages: [{ role: 'user', content: 'Please use echo' }], useTools: true, maxTokens: 100, contextSize: 4096 }));
  assert.ok(r9.steps.some((s) => s.role === 'tools'));
  mcp.remove(srv.id);
  console.log('✓ tools: MCP read tool, write tool with approval, denial, tools in a stack');

  // GitHub connector against a simulated GitHub API.
  const integrations = require('../src/main/integrations');
  const realFetch = global.fetch;
  const ghCalls = [];
  global.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (!u.startsWith('https://api.github.com')) return realFetch(url, opts);
    ghCalls.push(`${opts.method || 'GET'} ${u.replace('https://api.github.com', '')}`);
    const json = (o) => new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (u.endsWith('/user')) return json({ login: 'octo' });
    if (u.includes('/issues?')) return json([{ number: 7, state: 'open', title: 'Crash on start', user: { login: 'amy' }, comments: 2, labels: [{ name: 'bug' }] }]);
    if (opts.method === 'POST' && u.endsWith('/issues')) return json({ number: 8, html_url: 'https://github.com/o/r/issues/8' });
    return json({});
  };
  const account = await integrations.save('github', {}, 'ghp_test');
  assert.equal(account, 'octo');
  const ghTools = integrations.tools();
  const listIssues = await ghTools.find((t) => t.name === 'github_list_issues').run({ repo: 'o/r' });
  assert.match(listIssues, /#7 \[open\] Crash on start \(amy, 2 comments, labels: bug\)/);
  const created = await toolbox.execute(ghTools.find((t) => t.name === 'github_create_issue'), { repo: 'o/r', title: 'New bug' }, { approve: async () => ({ ok: true }) });
  assert.match(created.result, /Created issue #8/);
  assert.ok(ghCalls.includes('POST /repos/o/r/issues'));
  integrations.disable('github');
  global.fetch = realFetch;
  console.log('✓ GitHub connector: connect, list issues, create issue (approved)');

  // A cut-off download is caught before loading, with a clear "Repair" message (not an engine log line).
  {
    const cut = path.join(store.dir('models'), 'cut.gguf');
    fs.copyFileSync(TINY, cut);
    fs.truncateSync(cut, Math.floor(fs.statSync(TINY).size * 0.7));
    models.add({ id: 'broken', name: 'Broken 8B', kind: 'text', files: { model: cut }, size: 5e9, source: 'huggingface' });
    await assert.rejects(collect(complete.run('local:broken', { messages: [{ role: 'user', content: 'Hi' }], contextSize: 2048 })), /incomplete or damaged[\s\S]*Repair/);
    models.remove('broken');
    console.log('✓ damaged model file detected before loading, with a Repair hint');
  }

  // Offline mode: nothing leaves the PC, but local servers keep working.
  {
    const offline = require('../src/main/offline');
    const http = require('node:http');
    const srv = http.createServer((q, r) => r.end('local ok')).listen(0);
    await new Promise((r) => srv.once('listening', r));
    store.saveConfig({ offline: true });
    assert.ok(offline.isOffline());
    await assert.rejects(fetch('https://example.com/'), /offline/);
    assert.equal(await (await fetch(`http://127.0.0.1:${srv.address().port}/`)).text(), 'local ok');
    store.saveConfig({ offline: false });
    srv.close();
    console.log('✓ offline mode blocks the internet, keeps local servers');
  }

  // Knowledge models: a saved model that searches its knowledge first, usable like any model.
  {
    const kbc = knowledge.createCollection({ name: 'Handbook', emoji: '📘' });
    knowledge.addTexts(kbc.id, [{ name: 'leave.md', text: 'Employees get 28 days of annual leave, including public holidays. Unused leave can carry over up to 5 days.' }]);
    const km = complete.saveKbModel({ id: 'hb', name: 'Handbook Helper', emoji: '📘', base: 'local:qwen3-8b', knowledge: [kbc.id], strict: true });
    assert.ok(complete.targets().some((t) => t.target === 'kbm:hb' && t.group === 'Knowledge models'));
    assert.equal(complete.label('kbm:hb'), 'Handbook Helper');
    const evs = [];
    for await (const ev of complete.run('kbm:hb', { messages: [{ role: 'user', content: 'How many days of annual leave do employees get?' }], contextSize: 4096, maxTokens: 50 })) evs.push(ev);
    const src = evs.find((e) => e.type === 'sources');
    assert.ok(src && src.sources[0].title === 'leave.md', 'cites its own knowledge');
    assert.ok(evs.some((e) => e.type === 'text'), 'answers with the base model');
    // Works as a stack member too.
    complete.saveStack({ id: 'kb-stack', name: 'KB stack', members: { drafters: ['kbm:hb', 'local:phi-4'], judge: 'local:phi-4' } });
    const st = await collect(complete.run('stack:kb-stack', { messages: [{ role: 'user', content: 'Annual leave?' }], contextSize: 4096, maxTokens: 50 }));
    assert.ok(st.text.length > 0);
    complete.deleteStack('kb-stack');
    assert.throws(() => complete.saveKbModel({ id: 'x', name: 'Loop', base: 'kbm:hb' }), /normal model/);
    complete.deleteKbModel(km.id);
    assert.ok(!complete.targets().some((t) => t.target === 'kbm:hb'));
    console.log('✓ knowledge models: saved, cited, usable in stacks');
  }

  // Models other apps already downloaded are found and added where they are (no copy, no download).
  {
    const scan = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-scan-'));
    const big = (p) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.copyFileSync(TINY, p); fs.truncateSync(p, 60e6); return p; };
    const lms = path.join(scan, 'lmstudio');
    const llamaFile = big(path.join(lms, 'bartowski', 'Llama-3.2-3B-Instruct-GGUF', 'Llama-3.2-3B-Instruct-Q4_K_M.gguf'));
    big(path.join(lms, 'bartowski', 'Llama-3.2-3B-Instruct-GGUF', 'mmproj-f16.gguf'));
    big(path.join(lms, 'big', 'Model-00002-of-00002.gguf')); // second part of a split model: skipped
    fs.copyFileSync(TINY, path.join(lms, 'tiny.gguf')); // too small to be a real model: skipped
    const oll = path.join(scan, 'ollama');
    big(path.join(oll, 'blobs', 'sha256-feed'));
    fs.mkdirSync(path.join(oll, 'manifests/registry.ollama.ai/library/qwen3'), { recursive: true });
    fs.writeFileSync(path.join(oll, 'manifests/registry.ollama.ai/library/qwen3/8b'), JSON.stringify({ layers: [{ mediaType: 'application/vnd.ollama.image.model', digest: 'sha256:feed', size: 5.2e9 }] }));
    process.env.QS_SCAN_DIRS = [lms, oll].join(path.delimiter);
    const found = models.findOnPC();
    assert.deepEqual(found.map((f) => f.name).sort(), ['Llama 3.2 3B Instruct', 'qwen3:8b']);
    assert.ok(found.find((f) => f.app === 'Ollama').path.endsWith('sha256-feed'));
    assert.ok(found.find((f) => f.name.startsWith('Llama')).vision, 'vision add-on paired');
    const added = await models.addFound(found, llama.readGguf);
    assert.equal(added.length, 2);
    const q = added.find((m) => m.from === 'Ollama');
    assert.equal(q.catalogId, 'qwen3-8b'); assert.equal(q.name, 'Qwen3 8B');
    assert.equal(added.find((m) => m.from !== 'Ollama').catalogId, 'llama-3.2-3b');
    assert.equal(models.findOnPC().length, 0, 'added models are not offered again');
    models.remove(q.id);
    assert.ok(fs.existsSync(path.join(oll, 'blobs', 'sha256-feed')), 'removing never deletes another app\'s file');
    for (const m of added) models.remove(m.id);
    delete process.env.QS_SCAN_DIRS;
    fs.rmSync(scan, { recursive: true, force: true });
    console.log('✓ finds models from LM Studio and Ollama and adds them in place');
  }

  // Catalog: goals, recognising your models, and the advisor (yours vs best for this PC).
  assert.deepEqual(Object.keys(catalog.JOBS), ['general', 'reasoning', 'office', 'research', 'writing', 'open', 'coding', 'create', 'edit']);
  assert.equal(catalog.matchCatalog('Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf')?.id, 'llama-3.1-8b');
  assert.equal(catalog.matchCatalog('phi4:latest')?.id, 'phi-4');
  assert.equal(catalog.matchCatalog('Phi-4-mini-instruct-Q4_K_M')?.id, 'phi-4-mini');
  assert.equal(catalog.matchCatalog('Qwen2.5-7B-Instruct'), null, 'no false match');
  const unknown = catalog.profileInstalled({ id: 'x', name: 'mystery-chat-12b', size: 7.5e9 });
  assert.equal(unknown.known, false); assert.ok(unknown.jobs.general >= 6 && unknown.jobs.general <= 8);
  const mid = { ramGB: 32, vramGB: 12, vramFreeGB: 11.5 };
  const mine3 = [{ id: 'qwen3-8b', name: 'Qwen3 8B', kind: 'text', catalogId: 'qwen3-8b', size: 5e9 }, { id: 'imp-l', name: 'Meta-Llama-3.1-8B-Instruct', kind: 'text', size: 4.9e9 }, { id: 'g4', name: 'Gemma 3 4B', kind: 'text', catalogId: 'gemma-3-4b', size: 3.3e9, files: { mmproj: 'x' } }];
  const adv = catalog.advise('office', mid, { installed: mine3 });
  assert.equal(adv.yours.length, 3);
  assert.ok(adv.mine.members.drafters.length >= 1 && adv.mine.ids.length >= 2, 'a stack from your own models');
  assert.ok(adv.mine.ids.every((id) => mine3.some((m) => m.id === id)), 'only uses installed models');
  assert.ok([adv.mine.members.vision, ...adv.mine.members.drafters, adv.mine.members.judge].includes('g4'), 'your vision model reads photos');
  assert.notEqual(new Set(adv.mine.members.drafters.map((id) => catalog.familyOf(catalog.profileInstalled(mine3.find((m) => m.id === id))))).size, 1, 'drafters from different makers');
  const power = adv.best;
  assert.equal(power.members.drafters.length, 2);
  assert.ok(power.ids.some((id) => catalog.TEXT_MODELS.find((m) => m.id === id).vision), 'best office stack can see images');
  assert.ok(power.better && power.missingGB > 0);
  const owned = catalog.advise('office', mid, { installed: power.ids.map((id) => ({ id: `have-${id}`, name: id, kind: 'text', catalogId: id, size: 1e9 })) });
  assert.equal(owned.best.missingGB, 0, 'already-installed best models are not downloaded again');
  const open = catalog.advise('open', mid, { installed: mine3 });
  assert.equal(open.mine, null, 'none of these installed models are unfiltered');
  assert.ok(open.best.ids.every((id) => catalog.TEXT_MODELS.find((m) => m.id === id).open));
  const kit = catalog.advise('create', mid, { installed: [...mine3, { id: 'sdx', name: 'SDXL Turbo', kind: 'image', catalogId: 'sdxl-turbo' }] });
  assert.equal(kit.kind, 'media');
  assert.equal(kit.mine.members.image, 'sdx', 'your image model creates the pictures');
  assert.ok(mine3.some((m) => m.id === kit.best.members.helper), 'prompt writer reuses a model you have');
  assert.ok(kit.best.members.video && kit.best.better);
  const editKit = catalog.advise('edit', { ramGB: 16, vramGB: 0 }, { installed: mine3 });
  assert.equal(editKit.best.members.edit, undefined, 'no editing model fits a 16 GB PC without a graphics card');
  const low = catalog.advise('general', { ramGB: 8, vramGB: 0 });
  assert.equal(low.mine, null);
  assert.ok(low.best.ids.every((id) => catalog.TEXT_MODELS.find((m) => m.id === id).sizeGB < 4));
  const slow = catalog.advise('coding', { ramGB: 16, vramGB: 0 }, { installed: [mine3[0], { id: 'n', name: 'mystery-chat-12b', kind: 'text', size: 7.5e9 }] });
  assert.equal(new Set(slow.mine.ids).size, 2, 'slow PC keeps a two-model stack');
  const est = catalog.estimateText(catalog.TEXT_MODELS.find((m) => m.id === 'qwen3-8b'), mid);
  assert.equal(est.fit, 'gpu'); assert.ok(est.tps > 20);
  const moe = catalog.estimateText(catalog.TEXT_MODELS.find((m) => m.id === 'qwen3-30b-a3b'), mid);
  assert.equal(moe.fit, 'split'); assert.ok(moe.tps > 5, 'MoE runs usefully even when split');
  console.log('✓ advisor: yours', JSON.stringify(adv.mine.members), '| best', JSON.stringify(power.members));

  llama.stopAll();
  fs.rmSync(HOME, { recursive: true, force: true });
  console.log('\nBACKEND TESTS PASSED');
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); llama.stopAll(); process.exit(1); });
