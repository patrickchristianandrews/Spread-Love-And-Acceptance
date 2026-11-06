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
  const r2 = await collect(complete.run('stack:office-power', { messages: [{ role: 'system', content: 'Be an analyst.' }, { role: 'user', content: [{ type: 'text', text: 'Summarise this chart' }, img] }], temperature: 0.4, maxTokens: 500, contextSize: 4096, level: 'max', onStep: (s) => live.push(s.role) }));
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

  // Efficient stacks: an easy question goes to the strongest member alone; when drafts agree the
  // combining step is skipped; one server per model, sized to the conversation.
  {
    complete.saveStack({ id: 'team2', name: 'Team', members: { drafters: ['local:qwen3-8b', 'local:phi-4'], judge: 'local:phi-4', mode: 'blend' } });
    const easy = await collect(complete.run('stack:team2', { messages: [{ role: 'user', content: 'Hi there!' }], maxTokens: 200, contextSize: 4096, level: 'thorough' }));
    assert.equal(uniq(easy.steps).length, 0, 'no team steps for an easy question');
    assert.match(easy.text, /Answer from phi\.gguf/, 'the lead answered alone');
    const hard = await collect(complete.run('stack:team2', { messages: [{ role: 'user', content: 'Explain why the sky is blue, step by step' }], maxTokens: 200, contextSize: 4096, level: 'thorough' }));
    const hRoles = uniq(hard.steps);
    assert.deepEqual(hRoles.map((x) => x.role), ['draft', 'draft', 'lead']);
    assert.match(hRoles[1].model, /Phi-4/, 'the lead drafts last, so it stays loaded');
    assert.match(hRoles[2].label, /agreed/, 'near-identical drafts skip the combining step');
    const files = llama.status().map((x) => x.file);
    assert.equal(files.length, new Set(files).size, 'one server per model');
    assert.ok(llama.contextFor([{ role: 'user', content: 'Hi' }], 512, 32768) === 4096, 'a short chat reserves a small context');
    assert.ok(llama.contextFor([{ role: 'user', content: 'x'.repeat(60000) }], 2048, 32768) >= 16384, 'a long one gets more');
    console.log('✓ efficient stacks: easy questions use one model, agreement skips combining, lead drafts last, right-sized memory');
    // Speed: a small same-family model drafts for a big one (speculative decoding) when installed.
    assert.equal(catalog.draftFor('qwen3-8b', []), null, 'nothing to draft with yet');
    const tinyDraft = { id: 'q17', catalogId: 'qwen3-1.7b', files: { model: path.join(dir, 'qwen.gguf') } };
    assert.equal(catalog.draftFor('qwen3-8b', [tinyDraft])?.id, 'q17');
    assert.equal(catalog.draftFor('qwen3-30b-a3b', [tinyDraft]), null, 'mixture-of-experts models are fast already');
    assert.equal(catalog.draftFor('llama-3.1-8b', [tinyDraft]), null, 'only the same family (tokenizer)');
    models.add({ ...tinyDraft, name: 'Qwen3 1.7B', kind: 'text', size: 1.1e9 });
    llama.stopAll();
    await collect(complete.run('local:qwen3-8b', { messages: [{ role: 'user', content: 'Hello again' }], maxTokens: 50, contextSize: 4096 }));
    assert.ok(llama.status().some((x) => x.draft), 'the engine was started with the draft model');
    models.remove('q17');
    llama.stopAll();
    console.log('✓ speculative decoding: a small same-family model speeds up a big one');
  }

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
  assert.match(streamed.join(''), /phi\.gguf/, 'an easy question to a stack is answered by its lead');
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

  // Models downloaded with Quicksilver 1.0 (older format) show up and work in this version.
  {
    const old = path.join(HOME, 'v1-qwen2.5-7b.gguf');
    fs.copyFileSync(TINY, old);
    const reg = store.readJSON(store.file('models.json'), []);
    store.writeJSON(store.file('models.json'), [...reg, { id: 'qwen2.5-7b', name: 'Qwen 2.5 7B Instruct', file: old, size: 4.68e9, source: 'downloaded' }]);
    const m = models.list().find((x) => x.id === 'qwen2.5-7b');
    assert.ok(m && m.kind === 'text' && m.files.model === old && m.catalogId === 'qwen2.5-7b', 'a 1.0 model is listed as a text model');
    assert.ok(store.readJSON(store.file('models.json'), []).find((x) => x.id === 'qwen2.5-7b').files, 'converted once and saved');
    assert.ok(complete.targets().some((t) => t.target === 'local:qwen2.5-7b'), 'and can be picked in chats and stacks');
    store.writeJSON(store.file('models.json'), reg);
    console.log('✓ models from Quicksilver 1.0 are kept and usable');
  }

  // More connectors: weather, Wikipedia, calendar (iCal), news feeds, a notes folder, Todoist, webhooks.
  {
    const calls = [];
    const ics = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART:' + new Date(Date.now() + 86400000).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z\r\nSUMMARY:Dentist\r\nLOCATION:High St\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20000101\r\nSUMMARY:Old\r\nEND:VEVENT\r\nEND:VCALENDAR';
    const rss = '<rss><channel><title>Daily News</title><item><title>Rain expected</title><link>https://n.example/1</link><pubDate>Mon, 02 Nov 2026 10:00:00 GMT</pubDate><description>Wet week</description></item><item><title>Markets up</title><link>https://n.example/2</link></item></channel></rss>';
    global.fetch = async (url, opts = {}) => {
      const u = String(url);
      calls.push(`${opts.method || 'GET'} ${u}`);
      const json = (o) => new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (u.includes('geocoding-api')) return json({ results: [{ name: 'Leeds', admin1: 'England', country: 'United Kingdom', latitude: 53.8, longitude: -1.55 }] });
      if (u.includes('api.open-meteo.com')) return json({ current: { time: '2026-11-06T10:00', temperature_2m: 9, apparent_temperature: 7, weather_code: 61, wind_speed_10m: 14, relative_humidity_2m: 88 }, daily: { time: ['2026-11-06'], weather_code: [63], temperature_2m_min: [5], temperature_2m_max: [10], precipitation_probability_max: [80] } });
      if (u.includes('wikipedia.org') && u.includes('list=search')) return json({ query: { search: [{ title: 'Ada Lovelace', snippet: 'English <span>mathematician</span>' }] } });
      if (u.includes('wikipedia.org')) return json({ query: { pages: { 1: { title: 'Ada Lovelace', extract: 'Ada Lovelace was a mathematician.' } } } });
      if (u.startsWith('https://cal.example')) return new Response(ics, { status: 200 });
      if (u.startsWith('https://n.example/feed')) return new Response(rss, { status: 200 });
      if (u.includes('api.todoist.com/api/v1/tasks') && opts.method === 'POST') return json({ content: JSON.parse(opts.body).content });
      if (u.includes('api.todoist.com/api/v1/tasks')) return json({ results: [{ id: '1', content: 'Buy milk', due: { string: 'today' }, priority: 4 }] });
      if (u.startsWith('https://hooks.example')) return json({ ok: true });
      return json({});
    };
    await integrations.save('weather', { units: 'celsius', home: 'Leeds' }, '');
    await integrations.save('wikipedia', { lang: 'en' }, '');
    assert.match(await integrations.save('calendar', {}, 'https://cal.example/basic.ics'), /1 upcoming/);
    await integrations.save('rss', { feeds: 'https://n.example/feed' }, '');
    const notesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-notes-'));
    fs.writeFileSync(path.join(notesDir, 'Garden plan.md'), 'Plant tulips in October.');
    assert.equal(await integrations.save('notes', { folder: notesDir }, ''), '1 notes');
    assert.match(await integrations.save('todoist', {}, 'td_test'), /1 open task/);
    await integrations.save('webhook', {}, 'https://hooks.example/abc');
    const T = Object.fromEntries(integrations.tools().map((t) => [t.name, t]));
    assert.match(await T.weather_forecast.run({}), /Leeds, England[\s\S]*light rain, 9°C[\s\S]*rain chance 80%/);
    assert.match(await T.wikipedia_search.run({ query: 'Ada' }), /Ada Lovelace: English mathematician/);
    assert.match(await T.wikipedia_read.run({ title: 'Ada Lovelace' }), /was a mathematician/);
    const cal = await T.calendar_upcoming.run({ days: 7 });
    assert.ok(/Dentist @ High St/.test(cal) && !/Old/.test(cal), 'upcoming events only');
    assert.match(await T.news_latest.run({ topic: 'rain' }), /\[Daily News\] Rain expected \(2026-11-02\) https:\/\/n.example\/1/);
    assert.match(await T.notes_search.run({ query: 'tulips' }), /Garden plan\.md/);
    assert.equal(await T.notes_read.run({ file: 'Garden plan.md' }), 'Plant tulips in October.');
    await assert.rejects(T.notes_read.run({ file: '../outside.md' }), /outside the notes folder/);
    assert.ok(T.notes_create.write && T.todoist_add.write && T.automation_trigger.write && !T.notes_search.write, 'changes ask first');
    await T.notes_create.run({ title: 'Ideas', content: 'Paint the shed' });
    assert.ok(fs.existsSync(path.join(notesDir, 'Ideas.md')));
    assert.match(await T.todoist_tasks.run({}), /1: Buy milk \(due today\) \[p1\]/);
    assert.match(await T.todoist_add.run({ content: 'Call mum', due: 'tomorrow' }), /Added: Call mum/);
    assert.equal(await T.automation_trigger.run({ message: 'Hi' }), 'Sent to the automation.');
    assert.ok(calls.some((c) => c.startsWith('POST https://hooks.example/abc')));
    for (const id of ['weather', 'wikipedia', 'calendar', 'rss', 'notes', 'todoist', 'webhook']) integrations.disable(id);
    assert.equal(integrations.tools().length, 0);
    assert.ok(integrations.list().length >= 20, 'twenty connectors');
    global.fetch = realFetch;
    console.log('✓ connectors: weather, Wikipedia, calendar, news feeds, notes folder, Todoist, automation webhook');
  }

  // Your own API (any REST service) and the MCP directory.
  {
    const customapi = require('../src/main/customapi');
    const catalogMcp = require('../src/main/mcp-catalog');
    const seen = [];
    global.fetch = async (url, opts = {}) => {
      seen.push({ url: String(url), method: opts.method || 'GET', headers: opts.headers, body: opts.body });
      return new Response(JSON.stringify({ ok: true, url: String(url) }), { status: 200 });
    };
    assert.throws(() => customapi.parseEndpoints('fetch the orders'), /isn't an endpoint/);
    const api = customapi.save({ name: 'My Shop', baseUrl: 'https://shop.example/v1/', authType: 'header', authName: 'X-Key', endpointsText: 'GET /orders - List orders\nGET /orders/{id} - One order\nPOST /orders/{id}/refund - Refund' }, 'k123');
    assert.equal(api.endpoints.length, 3);
    const T = customapi.tools();
    const one = T.find((t) => /get_orders_by/.test(t.name));
    assert.deepEqual(one.parameters.required, ['id']);
    await one.run({ id: 'A 7', query: { expand: 'items' } });
    assert.equal(seen.at(-1).url, 'https://shop.example/v1/orders/A%207?expand=items');
    assert.equal(seen.at(-1).headers['X-Key'], 'k123');
    const refund = T.find((t) => /post/.test(t.name));
    assert.ok(refund.write && !one.write, 'changes ask first');
    await refund.run({ id: '9', body: { amount: 5 } });
    assert.ok(seen.at(-1).method === 'POST' && seen.at(-1).body === '{"amount":5}');
    assert.equal(await customapi.test(api.id), 'connected');
    assert.ok((await toolbox.available()).some((t) => t.name === one.name), 'its tools reach chats');
    customapi.remove(api.id);
    assert.equal(customapi.tools().length, 0);
    // Registry entries become ready-to-add servers.
    const npm = catalogMcp.fromRegistry({ server: { name: 'io.example/maps', description: 'Maps and places', packages: [{ registryType: 'npm', identifier: '@ex/maps-mcp', transport: { type: 'stdio' }, environmentVariables: [{ name: 'MAPS_KEY', description: 'Your key', isRequired: true }] }] } });
    assert.deepEqual([npm.command, npm.args, npm.env], ['npx', ['-y', '@ex/maps-mcp'], { MAPS_KEY: '<Your key>' }]);
    const remote = catalogMcp.fromRegistry({ server: { name: 'io.example/notes', description: 'Notes', remotes: [{ type: 'streamable-http', url: 'https://notes.example/mcp' }] } });
    assert.deepEqual([remote.transport, remote.url], ['http', 'https://notes.example/mcp']);
    assert.ok(Object.keys(catalogMcp.PRESETS).length >= 35, 'many ready-made MCP servers');
    global.fetch = realFetch;
    console.log('✓ your own API: endpoints become tools (writes ask first); MCP directory entries ready to add');
  }

  // Trending models: fetched from Hugging Face, grouped by type, rated for this PC, cached for hours.
  {
    let calls = 0;
    global.fetch = async (url) => {
      if (!String(url).includes('sort=trendingScore')) return realFetch(url);
      calls++;
      return new Response(JSON.stringify([
        { id: 'unsloth/Qwen3-Coder-30B-A3B-Instruct-GGUF', downloads: 90000, likes: 800, trendingScore: 120, tags: ['gguf', 'code'], createdAt: '2026-10-30T00:00:00Z' },
        { id: 'someone/Cool-VL-7B-GGUF', downloads: 5000, likes: 90, trendingScore: 80, tags: ['gguf'], pipeline_tag: 'image-text-to-text' },
        { id: 'someone/Story-12B-Uncensored-GGUF', downloads: 3000, likes: 60, trendingScore: 60, tags: ['gguf'] },
        { id: 'someone/Tiny-Embed-GGUF', downloads: 100, likes: 1, trendingScore: 50, tags: ['gguf'] },
      ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    store.saveConfig({ trendingCache: null });
    const hw = await hardware.detect();
    const t = await models.trending({ hw });
    assert.equal(t.list.length, 3, 'embedding models left out');
    const [coder, vl, story] = t.list;
    assert.ok(coder.catalogId === 'qwen3-coder-30b' && coder.type === 'coding' && coder.est?.rating, 'known model matched and rated');
    assert.ok(vl.type === 'vision' && vl.sizeGB === 4.2 && vl.est, 'size guessed from the name');
    assert.equal(story.type, 'open');
    await models.trending({ hw });
    assert.equal(calls, 1, 'cached between refreshes');
    await models.trending({ hw, force: true });
    assert.equal(calls, 2, 'refresh on demand');
    assert.deepEqual(models.paramsOf('x/Qwen3-30B-A3B-GGUF'), { params: 30, active: 3 });
    global.fetch = realFetch;
    console.log('✓ trending models: grouped by type, rated for this PC, refreshed every few hours');
  }

  // Measured speeds: real answers are timed per model and re-tune every estimate.
  {
    const speeds = require('../src/main/speeds');
    store.saveConfig({ measured: {}, calib: { text: 1, media: 1 } });
    // The stand-in engine reports 42.5 tokens/s.
    await collect(complete.run('local:qwen3-8b', { messages: [{ role: 'user', content: 'Tell me a longer story about the sea and a lighthouse keeper named Ada who loves her work deeply' }], contextSize: 2048, maxTokens: 64 }));
    const m = speeds.measured()['qwen3-8b'];
    assert.ok(m && Math.abs(m.tps - 42.5) < 0.01 && m.n === 1, 'the answer was timed');
    assert.ok(store.config().calib.text !== 1, 'estimates re-tuned from the measurement');
    assert.equal(speeds.record('qwen3-8b', 100, 5, 40), null, 'very short answers are not used');
    speeds.record('qwen3-8b', 52.5, 64, 40);
    assert.ok(Math.abs(speeds.measured()['qwen3-8b'].tps - (42.5 * 0.6 + 52.5 * 0.4)) < 0.01, 'smoothed across answers');
    store.saveConfig({ measured: {}, calib: { text: 1, media: 1 } });
    console.log('✓ measured speeds: answers timed, estimates re-tuned');
  }

  // Audio, video and photo tools (ffmpeg) and reading aloud (a test tone stands in for Windows' voices).
  {
    const avtools = require('../src/main/avtools');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-av-'));
    const clip = path.join(tmp, 'clip.mp4'), song = path.join(tmp, 'song.mp3'), pic = path.join(tmp, 'pic.png');
    await media.runFfmpeg(['-f', 'lavfi', '-i', 'testsrc=size=160x120:rate=15:duration=1', '-f', 'lavfi', '-i', 'sine=frequency=330:duration=1', '-shortest', '-pix_fmt', 'yuv420p', clip]);
    await media.runFfmpeg(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-ac', '2', song]);
    await media.runFfmpeg(['-f', 'lavfi', '-i', 'testsrc=size=64x48', '-frames:v', '1', pic]);
    const v = await avtools.run('video', 'fps60', { path: clip });
    const vi = await media.probe(v.file);
    assert.ok(v.kind === 'video' && vi.width === 160 && vi.duration > 0.5, '60 fps video made');
    const up = await avtools.run('image', 'upscale4', { path: pic });
    assert.equal((await media.probe(up.file)).width, 256, 'photo upscaled 4×');
    const m = await avtools.run('audio', 'master', { path: song });
    assert.ok(m.kind === 'audio' && (await media.probe(m.file)).audio, 'audio mastered');
    const k = await avtools.run('audio', 'karaoke', { path: song });
    assert.ok(fs.statSync(k.file).size > 1000, 'vocal remover ran');
    const x = await avtools.run('extract', 'mp3', { path: clip });
    assert.ok(x.kind === 'audio', 'sound taken from a video');
    await assert.rejects(avtools.run('video', 'nope', { path: clip }), /Unknown/);
    process.env.QS_TTS_FAKE = '1';
    const one = await avtools.speak('Hello there, this is a test of reading aloud.', { title: 'Test' });
    const pod = await avtools.speak('ALEX: Welcome to the show.\nSAM: Thanks, glad to be here.\nALEX: Let us begin.', { title: 'Pod' });
    assert.ok(one.kind === 'audio' && one.speakers === 'one' && pod.speakers === 'several', 'read aloud, and a two-voice script');
    assert.ok((await media.probe(pod.file)).duration > (await media.probe(one.file)).duration * 0.5);
    delete process.env.QS_TTS_FAKE;
    console.log('✓ tools: 60 fps, upscale 4×, mastering, vocal remover, extract sound, read aloud, two-voice podcast');
  }

  // Free web search (no key): DuckDuckGo's HTML page, Mojeek as backup, then the top pages are read.
  {
    const websearch = require('../src/main/websearch');
    const real = global.fetch;
    const ddg = `<div class="result results_links web-result"><h2 class="result__title"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FParis&amp;rut=abc">Paris - <b>Wikipedia</b></a></h2>
      <a class="result__snippet" href="//duckduckgo.com/l/?uddg=x">Paris is the <b>capital</b> of France.</a><div class="clear"></div></div>
      <div class="result"><a href="https://duckduckgo.com/y.js?ad_domain=x" class="result__a">Ad</a></div>
      <div class="result"><a href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.org%2Ffrance" class="result__a" rel="nofollow">France facts</a><div class="result__snippet">France, officially the French Republic.</div></div>`;
    const moj = '<ul class="results-standard"><li><a class="title" href="https://example.com/paris">Paris guide</a><p class="s">The <strong>capital</strong> city.</p></li></ul>';
    let ddgDown = false;
    global.fetch = async (url, opts) => {
      const u = String(url);
      if (u.includes('html.duckduckgo.com')) return ddgDown ? new Response('<p>unusual traffic</p>', { status: 200 }) : new Response(ddg, { status: 200, headers: { 'content-type': 'text/html' } });
      if (u.includes('mojeek.com')) return new Response(moj, { status: 200, headers: { 'content-type': 'text/html' } });
      if (u.startsWith('https://en.wikipedia.org/')) return new Response('<html><body><p>Paris is the capital and largest city of France.</p></body></html>', { status: 200, headers: { 'content-type': 'text/html' } });
      return new Response('<p>page</p>', { status: 200, headers: { 'content-type': 'text/html' } });
    };
    store.saveConfig({ web: { provider: 'free' } });
    let r = await websearch.search('capital of France');
    assert.deepEqual(r.map((x) => x.url), ['https://en.wikipedia.org/wiki/Paris', 'https://example.org/france'], 'results decoded, ads skipped, attribute order ignored');
    assert.equal(r[0].title, 'Paris - Wikipedia'); assert.match(r[0].snippet, /capital of France/); assert.match(r[0].text, /largest city/);
    assert.match(r[1].snippet, /French Republic/);
    ddgDown = true;
    r = await websearch.search('capital of France');
    assert.equal(r[0].url, 'https://example.com/paris', 'falls back to Mojeek');
    global.fetch = real;
    store.saveConfig({ web: { provider: 'none' } });
    console.log('✓ free web search: DuckDuckGo, Mojeek fallback, pages read');
  }

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

  // The models that come with Quicksilver, and the built-in Quicksilver model (a stack of them).
  {
    const sd = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-starter-'));
    fs.copyFileSync(TINY, path.join(sd, 'model.gguf')); fs.copyFileSync(TINY, path.join(sd, 'mmproj.gguf'));
    fs.writeFileSync(path.join(sd, 'STARTER.json'), JSON.stringify({ models: [
      { id: 'starter', catalogId: 'qwen3-vl-2b', name: 'Qwen3-VL 2B', files: { model: 'model.gguf', mmproj: 'mmproj.gguf' } },
      { id: 'starter-brain', catalogId: 'qwen3-4b', name: 'Qwen3 4B Instruct 2507', files: { model: 'brain.gguf' }, pack: true },
    ] }));
    // Installed without the "Quicksilver models" folder: the small model works, the brain is fetched.
    let r = models.registerStarter(sd);
    assert.deepEqual(r.added.map((m) => m.id), ['starter']); assert.ok(r.added[0].vision);
    assert.deepEqual(r.missing.map((m) => m.catalogId), ['qwen3-4b']);
    // Quicksilver's team is picked from every model on the PC (here: three test models + the starter).
    assert.equal(await complete.ensureQuicksilverStack(), 'stack:quicksilver');
    // The installer copied the brain in (or it finished downloading).
    fs.copyFileSync(TINY, path.join(sd, 'brain.gguf'));
    r = models.registerStarter(sd);
    assert.deepEqual(r.added.map((m) => m.id), ['starter-brain']); assert.equal(r.missing.length, 0);
    assert.equal(await complete.ensureQuicksilverStack(), 'stack:quicksilver');
    const qsStack = complete.stacks().find((x) => x.id === 'quicksilver');
    const ids = [...qsStack.members.drafters, qsStack.members.judge, qsStack.members.vision].filter(Boolean);
    assert.equal(qsStack.members.mode, 'auto'); assert.ok(qsStack.autoManaged);
    assert.notEqual(qsStack.members.judge, 'local:phi-4', 'the lead must be quick here (Phi-4 does not fit this 8 GB card)');
    const how = await complete.explainStack('quicksilver');
    assert.ok(how.members.find((m) => m.roles.includes('lead')) && how.members.filter((m) => m.roles.includes('lead')).length === 1, 'exactly one lead');
    assert.ok(how.times.simple < how.times.hard, 'simple questions are quicker than hard ones');
    assert.ok(how.stars >= 3 && how.caps.find((c) => c.key === 'check').on);
    assert.ok(new Set(ids).size >= 3, 'a real team: lead, drafter and eyes');
    assert.ok(ids.some((t) => ['local:starter', 'local:gemma-3-4b'].includes(t)), 'a model that can see is on the team');
    // Your own edits are kept: no automatic rebuild.
    complete.saveStack({ ...qsStack, autoManaged: false, members: { ...qsStack.members, drafters: ['local:qwen3-8b', 'local:starter-brain'] } });
    await complete.ensureQuicksilverStack();
    assert.deepEqual(complete.stacks().find((x) => x.id === 'quicksilver').members.drafters, ['local:qwen3-8b', 'local:starter-brain']);
    complete.saveStack({ ...qsStack });
    assert.deepEqual(models.registerStarter(sd).added, [], 'announced only once');
    // Smart routing: simple → one answer from the brain; hard → both draft, the brain combines.
    assert.equal(complete.autoLevel({ messages: [{ role: 'user', content: 'Hi! Recommend a good sci-fi film.' }] }), 'quick');
    assert.equal(complete.autoLevel({ messages: [{ role: 'user', content: 'Why do leaves change colour in autumn?' }] }), 'thorough');
    assert.equal(complete.autoLevel({ messages: [{ role: 'user', content: 'What is 128 * 46?' }] }), 'thorough');
    const easy = await collect(complete.run('stack:quicksilver', { messages: [{ role: 'user', content: 'Hello!' }], contextSize: 2048, maxTokens: 30, level: 'thorough' }));
    assert.equal(easy.steps.length, 0, 'a simple message gets one direct answer');
    const hard = await collect(complete.run('stack:quicksilver', { messages: [{ role: 'user', content: 'Compare solar and wind power.' }], contextSize: 2048, maxTokens: 30, level: 'thorough' }));
    const roles = [...new Map(hard.steps.map((x) => [x.index, x.role])).values()];
    assert.ok(roles.includes('draft') && roles.includes('lead'), 'a hard one: drafted, then the lead checks and combines');
    const quick = await collect(complete.run('stack:quicksilver', { messages: [{ role: 'user', content: 'Compare solar and wind power.' }], contextSize: 2048, maxTokens: 30, level: 'quick' }));
    assert.equal(quick.steps.length, 0, 'Quick effort is always one model');
    // A photo with only the shipped pair (the 2B that sees is a drafter, not a separate vision
    // member): the quick route must still find it to read the picture. Caught by the install test.
    complete.saveStack({ id: 'pair', name: 'Pair', members: { drafters: ['local:starter-brain', 'local:starter'], judge: 'local:starter-brain', mode: 'auto' } });
    const pic = await collect(complete.run('stack:pair', { messages: [{ role: 'user', content: [{ type: 'text', text: 'What colour is this?' }, img] }], contextSize: 2048, maxTokens: 30, level: 'thorough' }));
    assert.ok(pic.steps.some((x) => x.role === 'vision') && pic.text.length > 0, 'the photo is read by the member that can see');
    complete.deleteStack('pair');
    // Kept safe: never deleted, never repaired from the internet, stays removed.
    await assert.rejects(models.repair('starter', () => {}), /came with Quicksilver/);
    models.remove('starter');
    assert.ok(fs.existsSync(path.join(sd, 'model.gguf')), 'the bundled file is never deleted');
    assert.deepEqual(models.registerStarter(sd).added, [], 'stays removed');
    complete.deleteStack('quicksilver');
    models.remove('starter-brain');
    store.saveConfig({ starterRemoved: [], quicksilverRemoved: false });
    fs.rmSync(sd, { recursive: true, force: true });
    console.log('✓ Quicksilver model: bundled models, background brain, smart routing, kept safe');
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
  assert.deepEqual(Object.keys(catalog.JOBS), ['general', 'fast', 'reasoning', 'office', 'research', 'writing', 'vision', 'open', 'coding', 'create', 'edit']);
  assert.equal(catalog.matchCatalog('Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf')?.id, 'llama-3.1-8b');
  assert.equal(catalog.matchCatalog('phi4:latest')?.id, 'phi-4');
  assert.equal(catalog.matchCatalog('Phi-4-mini-instruct-Q4_K_M')?.id, 'phi-4-mini');
  assert.equal(catalog.matchCatalog('Qwen2.5-7B-Instruct')?.id, 'qwen2.5-7b', 'the 1.0 models are recognised again');
  assert.equal(catalog.matchCatalog('Yi-1.5-9B-Chat'), null, 'no false match');
  {
    // Three ways to run a stack, accuracy levels, and the cloud AI that would improve it.
    const mid = { ramGB: 16, vramGB: 8, vramFreeGB: 7.5, gpuName: 'RTX 4060', cpuThreads: 12, unifiedMemory: false };
    const g = catalog.advise('general', mid, {});
    assert.ok(g.tiers.quick.members.drafters.length === 1 && !g.tiers.quick.members.judge, 'quickest is one model');
    assert.ok(g.tiers.quick.secondsPerAnswer < g.tiers.balanced.secondsPerAnswer, 'and quicker');
    assert.ok(!g.tiers.accurate || g.tiers.accurate.accuracy.score >= g.tiers.balanced.accuracy.score, 'most accurate is never less accurate');
    assert.ok(['Good', 'High', 'Very high', 'Excellent'].includes(g.tiers.balanced.accuracy.label));
    assert.ok(g.cloud.provider === 'google' && g.cloud.saved > 70 && g.cloud.after.score >= g.cloud.before.score, 'hard questions only: most paid use saved');
    const w = catalog.cloudPlan('writing', 8);
    assert.ok(w.mode === 'lead' && w.saved < 0, 'a cloud lead is for quality, not savings');
    assert.ok(catalog.cloudPlan('office', 8).saved > 30, 'a fact check uses far less than full answers');
    assert.ok(Object.keys(catalog.JOBS).every((j) => catalog.CLOUD_BOOST[j]), 'every stack type has a cloud suggestion');
    console.log('✓ stack tiers: quickest / balanced / most accurate with accuracy levels; cloud boosts with savings');
  }
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

  // Voice typing: a recording is converted to 16 kHz WAV and turned into text.
  {
    process.env.QS_WHISPER_BIN = path.join(__dirname, 'fakes', 'whisper-cli');
    const fakeModel = path.join(HOME, 'whisper-model.bin');
    fs.writeFileSync(fakeModel, Buffer.alloc(2e6));
    process.env.QS_WHISPER_MODEL = fakeModel;
    const whisper = require('../src/main/whisper');
    assert.equal(whisper.status().ready, true);
    const clip = path.join(HOME, 'clip.ogg');
    require('node:child_process').execFileSync(require('ffmpeg-static'), ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-ar', '48000', '-c:a', 'libopus', clip]);
    const said = await whisper.transcribe(fs.readFileSync(clip), { ext: 'ogg' });
    assert.equal(said, 'Hello from the fake whisper at 16000 Hz.', said);
    console.log('✓ voice typing: recording → 16 kHz WAV → text:', said);
  }

  // Phone access: the page, a secret link, the model list and a streamed answer that syncs back.
  {
    process.env.QS_PHONE_HOST = '127.0.0.1';
    const phone = require('../src/main/phone');
    const events = [];
    phone.start((ch, d) => events.push(d));
    const port = 18000 + Math.floor(Math.random() * 1000);
    const inf = await phone.configure({ enabled: true, port });
    assert.ok(inf.running, inf.error);
    const key = inf.local.split('#k=')[1];
    assert.ok(key && key.length >= 20);
    assert.ok(/<svg/.test(inf.qr) || !inf.url, 'QR code for the link');
    const base = `http://127.0.0.1:${port}`;
    assert.ok((await (await fetch(`${base}/`)).text()).includes('Quicksilver on your phone'));
    assert.equal((await fetch(`${base}/api/info`)).status, 401, 'no key, no access');
    assert.equal((await fetch(`${base}/api/info`, { headers: { Authorization: 'Bearer wrong-key-xxxxxxxxxxxx' } })).status, 401);
    const auth = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
    const pinfo = await (await fetch(`${base}/api/info`, { headers: auth })).json();
    assert.ok(pinfo.targets.some((t) => t.target === 'local:qwen3-8b'));
    store.writeJSON(store.file('app-data.json'), { prefs: { userName: 'Liquid' }, assistants: [{ id: 'as-general', name: 'Assistant', emoji: '💬', instructions: 'Be kind.' }], memory: [{ id: 'm1', text: 'The user lives in Leeds.' }] });
    const r = await fetch(`${base}/api/chat`, { method: 'POST', headers: auth, body: JSON.stringify({ chatId: 'p1', title: 'Hi', assistantId: 'as-general', target: 'local:qwen3-8b', messages: [{ role: 'user', text: 'Hello from my phone' }] }) });
    const body = await r.text();
    const said = body.split('\n').filter((l) => l.startsWith('data: ')).map((l) => JSON.parse(l.slice(6))).map((e) => e.t || '').join('');
    assert.ok(/Answer from .*Hello from my phone.*\[memory: The user lives in Leeds/.test(said), said);
    assert.equal(events.at(-1).kind, 'phone:chat');
    assert.equal(events.at(-1).chat.messages.length, 2);
    const old = key;
    const fresh = await phone.newToken();
    assert.notEqual(fresh.local.split('#k=')[1], old);
    assert.equal((await fetch(`${base}/api/info`, { headers: auth })).status, 401, 'a new link signs old phones out');
    phone.stop();
    console.log('✓ phone: page, secret link, answers with memory, synced to the PC, new link signs out');
  }

  // Automatic updates: finds a newer release, downloads it and checks its fingerprint.
  {
    const crypto = require('node:crypto');
    const http = require('node:http');
    const setup = Buffer.from('fake installer bytes '.repeat(500));
    let goodSum = true;
    const srv = http.createServer((req, res) => {
      const base = `http://127.0.0.1:${srv.address().port}`;
      if (req.url === '/releases') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify([
          { tag_name: 'quicksilver-v9.1.0', draft: false, prerelease: true, assets: [{ name: 'Quicksilver-Setup-9.1.0.exe', size: 1, browser_download_url: `${base}/x` }] },
          { tag_name: 'quicksilver-v9.0.0', draft: false, prerelease: false, body: '## New\nThings.', assets: [{ name: 'Quicksilver-Setup-9.0.0.exe', size: setup.length, browser_download_url: `${base}/setup.exe` }, { name: 'Quicksilver-Setup-9.0.0.exe.sha256', size: 64, browser_download_url: `${base}/setup.sha256` }] },
          { tag_name: 'quicksilver-v2.0.0', draft: false, prerelease: false, assets: [{ name: 'Quicksilver-Setup-2.0.0.exe', size: 5, browser_download_url: `${base}/old` }] },
          { tag_name: 'other-v99', draft: false, prerelease: false, assets: [] },
        ]));
      }
      if (req.url === '/setup.exe') { res.writeHead(200, { 'Content-Length': setup.length }); return res.end(setup); }
      if (req.url === '/setup.sha256') return res.end(goodSum ? `${crypto.createHash('sha256').update(setup).digest('hex')}  Quicksilver-Setup-9.0.0.exe\n` : 'ab'.repeat(32));
      res.writeHead(404); res.end();
    });
    await new Promise((r) => srv.listen(0, '127.0.0.1', r));
    process.env.QS_UPDATE_URL = `http://127.0.0.1:${srv.address().port}/releases`;
    process.env.QS_VERSION = '2.9.0';
    const updater = require('../src/main/updater');
    assert.ok(updater.cmp('2.10.0', '2.9.0') > 0 && updater.cmp('2.9.0', '2.9.0') === 0);
    const st = await updater.check();
    assert.equal(st.available.version, '9.0.0', 'newest non-prerelease Quicksilver release');
    goodSum = false;
    await assert.rejects(updater.download(), /fingerprint/);
    goodSum = true;
    const d = await updater.download();
    assert.equal(d.downloaded.version, '9.0.0');
    assert.equal(fs.readFileSync(path.join(store.dir('updates'), 'Quicksilver-Setup-9.0.0.exe')).length, setup.length);
    process.env.QS_VERSION = '9.0.0';
    assert.equal((await updater.check()).available, null, 'up to date');
    srv.close();
    // Big starter models next to the app are moved to the data folder before an update.
    const sdir = path.join(HOME, 'starter-app');
    fs.mkdirSync(sdir, { recursive: true });
    fs.writeFileSync(path.join(sdir, 'big.gguf'), 'x'.repeat(1000));
    fs.writeFileSync(path.join(sdir, 'STARTER.json'), JSON.stringify({ models: [{ id: 'brain', catalogId: 'qwen3-4b', name: 'Brain', files: { model: 'big.gguf' }, pack: true }] }));
    models.add({ id: 'brain', name: 'Brain', kind: 'text', catalogId: 'qwen3-4b', files: { model: path.join(sdir, 'big.gguf') }, size: 1000, source: 'bundled' });
    assert.equal(models.keepPackModels(sdir), 1);
    const kept = models.get('brain').files.model;
    assert.ok(!kept.startsWith(sdir) && fs.existsSync(kept) && !fs.existsSync(path.join(sdir, 'big.gguf')));
    assert.equal(models.registerStarter(sdir).missing.length, 0, 'not downloaded again after the update');
    models.remove('brain');
    console.log('✓ updates: newer release found, fingerprint checked, big models kept across updates');
  }

  // Importing chats from ChatGPT (a tree with an edited branch, as a .zip) and Claude (.json).
  {
    const importer = require('../src/main/importer');
    const AdmZip = require('adm-zip');
    const gpt = [{ title: 'Pasta', create_time: 1700000000, update_time: 1700000100, conversation_id: 'c1', current_node: 'd', mapping: {
      root: { id: 'root', message: null, parent: null, children: ['s'] },
      s: { id: 's', parent: 'root', children: ['a'], message: { author: { role: 'system' }, content: { content_type: 'text', parts: [''] } } },
      a: { id: 'a', parent: 's', children: ['b', 'b2'], message: { author: { role: 'user' }, content: { content_type: 'text', parts: ['How long do I boil pasta?'] }, create_time: 1700000000 } },
      b2: { id: 'b2', parent: 'a', children: [], message: { author: { role: 'assistant' }, content: { content_type: 'text', parts: ['(an older answer)'] } } },
      b: { id: 'b', parent: 'a', children: ['c'], message: { author: { role: 'assistant' }, content: { content_type: 'text', parts: ['About 10 minutes.'] } } },
      c: { id: 'c', parent: 'b', children: ['d'], message: { author: { role: 'tool' }, content: { content_type: 'text', parts: ['tool output'] } } },
      d: { id: 'd', parent: 'c', children: [], message: { author: { role: 'assistant' }, content: { content_type: 'text', parts: ['Taste it at 8.'] } } },
    } }];
    const zip = new AdmZip();
    zip.addFile('conversations.json', Buffer.from(JSON.stringify(gpt)));
    const g = importer.parse('chatgpt-export.zip', zip.toBuffer());
    assert.equal(g.length, 1);
    assert.deepEqual(g[0].messages.map((m) => [m.role, m.text]), [['user', 'How long do I boil pasta?'], ['assistant', 'About 10 minutes.\n\nTaste it at 8.']]);
    assert.equal(g[0].source, 'chatgpt'); assert.equal(g[0].created, 1700000000000);
    const cl = importer.parse('conversations.json', Buffer.from(JSON.stringify([{ uuid: 'u1', name: '', created_at: '2025-01-02T03:04:05Z', updated_at: '2025-01-02T03:05:05Z', chat_messages: [{ sender: 'human', text: 'Hi Claude', created_at: '2025-01-02T03:04:05Z' }, { sender: 'assistant', text: '', content: [{ type: 'text', text: 'Hello!' }] }] }])));
    assert.equal(cl[0].title, 'Hi Claude'); assert.equal(cl[0].messages[1].text, 'Hello!'); assert.equal(cl[0].source, 'claude');
    assert.throws(() => importer.parse('x.json', Buffer.from('[]')), /No conversations/);
    console.log('✓ import: ChatGPT (zip, edited branches, tool steps) and Claude exports');
  }

  llama.stopAll();
  fs.rmSync(HOME, { recursive: true, force: true });
  console.log('\nBACKEND TESTS PASSED');
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); llama.stopAll(); process.exit(1); });
