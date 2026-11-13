// Bugs found in a review of the parts that handle your files, knowledge and connected services,
// each kept fixed by a check here.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-fixes-'));
process.env.QUICKSILVER_HOME = HOME;
const knowledge = require('../src/main/knowledge');
const docs = require('../src/main/docs');
const exporters = require('../src/main/exporters');

(async () => {
  // ---- a website that redirects: links are followed from where the site sent us ----
  {
    const filler = ' This page is part of the staff handbook and explains the rule in full, with examples for new starters and managers.'.repeat(3); // pages under 200 characters are not kept
    const page = (title, body) => `<html><head><title>${title}</title></head><body><main><h1>${title}</h1><p>${body}${filler}</p></main></body></html>`;
    const site = http.createServer((req, res) => {
      const send = (html) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); };
      if (req.url === '/handbook') { res.writeHead(301, { Location: '/handbook/' }); res.end(); return; }
      if (req.url === '/handbook/') return send(page('Handbook', 'Start here. <a href="leave.html">Leave</a> <a href="pay.html">Pay</a> <a href="/elsewhere/x.html">Other</a>'));
      if (req.url === '/handbook/leave.html') return send(page('Leave', 'Everyone gets twenty five days of annual leave.'));
      if (req.url === '/handbook/pay.html') return send(page('Pay', 'Salaries are paid on the last working day of the month.'));
      res.writeHead(404); res.end('no');
    });
    await new Promise((r) => site.listen(0, '127.0.0.1', r));
    const c = knowledge.createCollection({ name: 'Handbook', emoji: '📘' });
    const r = await knowledge.addWebsite(c.id, `http://127.0.0.1:${site.address().port}/handbook`, { maxPages: 10 }); // typed without the last slash
    site.close();
    assert.equal(r.added, 3, `the start page and both pages under it are saved (got ${JSON.stringify(r)})`);
    console.log('✓ a website typed without its last slash (or that redirects) is still crawled in full');
  }

  // ---- a folder with a part that cannot be read: the rest is still added ----
  {
    const dir = path.join(HOME, 'lib'); fs.mkdirSync(path.join(dir, 'locked'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'notes.txt'), 'The office closes at six in the evening on Fridays.');
    fs.writeFileSync(path.join(dir, 'locked', 'secret.txt'), 'hidden');
    fs.chmodSync(path.join(dir, 'locked'), 0o000);
    const c = knowledge.createCollection({ name: 'Mixed', emoji: '📁' });
    let r;
    try { r = await knowledge.addPaths(c.id, [dir, path.join(HOME, 'not-there.txt')]); } finally { fs.chmodSync(path.join(dir, 'locked'), 0o755); }
    assert.ok(r.added >= 1, `the readable file is added (got ${JSON.stringify(r)})`);
    assert.ok((r.errors || []).some((e) => /not-there/.test(e)), 'a path that is gone is reported, not fatal');
    console.log('✓ one unreadable folder or missing file no longer stops "Add a folder"');
  }

  // ---- words in other alphabets are searchable ----
  {
    const c = knowledge.createCollection({ name: 'Языки', emoji: '🌍' });
    const f = path.join(HOME, 'ru.txt');
    fs.writeFileSync(f, 'Отпуск составляет двадцать восемь календарных дней в году. Η άδεια είναι είκοσι ημέρες.');
    await knowledge.addPaths(c.id, [f]);
    const hits = await knowledge.search('отпуск календарных дней', { collectionIds: [c.id] });
    assert.ok(hits.length >= 1, 'a Cyrillic question finds the Cyrillic passage');
    console.log('✓ knowledge search works in Cyrillic and Greek, not only a to z');
  }

  // ---- a very long numeric column ----
  {
    const rows = ['amount,label']; for (let i = 0; i < 200000; i++) rows.push(`${i % 977},x`);
    const out = await docs.extract('big.csv', Buffer.from(rows.join('\n')));
    assert.match(out.text, /amount \(number\): count 200000[^\n]*min 0, max 976/);
    console.log('✓ a spreadsheet with 200,000 rows is read (it used to fail with "Maximum call stack size exceeded")');
  }

  // ---- Word export: every numbered list starts at 1 ----
  {
    const file = path.join(HOME, 'lists.docx');
    await exporters.toDocx('1. one\n2. two\n   - a point\n3. three\n\nSome text.\n\n1. first\n2. second\n', file, { title: 'Lists' });
    const zip = await require('jszip').loadAsync(fs.readFileSync(file));
    const xml = await zip.file('word/document.xml').async('string');
    const ids = [...xml.matchAll(/<w:numId w:val="(\d+)"\/>/g)].map((m) => m[1]);
    const numbered = [...xml.matchAll(/<w:p>(?:(?!<\/w:p>).)*?<w:numId w:val="(\d+)"\/>(?:(?!<\/w:p>).)*?<w:t[^>]*>(one|two|three|first|second)<\/w:t>/gs)].map((m) => [m[2], m[1]]);
    const by = Object.fromEntries(numbered);
    assert.ok(ids.length >= 5, 'the lists are numbered');
    assert.ok(by.one === by.two && by.two === by.three, `a bullet inside a numbered list does not restart it (${JSON.stringify(by)})`);
    assert.notEqual(by.first, by.one, `the second list is its own sequence (${JSON.stringify(by)})`);
    console.log('✓ Word export: a second numbered list starts at 1 again');
  }

  // ---- memory: a short new memory never overwrites a longer one; forgetting needs a real match ----
  {
    const ctx = { S: { data: { memory: [], prefs: {} }, route: {} }, console, save() {}, now: () => Date.now(), uid: () => Math.random().toString(36).slice(2), views: {} };
    vm.createContext(ctx);
    try { vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'js', 'memory.js'), 'utf8').replace(/^(const|let) /gm, 'var '), ctx, { filename: 'memory.js' }); } catch (e) { if (!/is not defined/.test(e.message)) throw e; }
    const long = 'The user has two kids, Mia and Leo, lives in Leeds and works as a nurse';
    ctx.addMemory(long);
    ctx.addMemory('I am a nurse');
    assert.deepEqual(ctx.S.data.memory.map((m) => m.text), [long], 'a short memory already said in full changes nothing');
    ctx.addMemory('The user prefers to work in the mornings');
    ctx.addMemory('The user works at Acme');
    assert.equal(ctx.forgetMatching('I work at Acme').map((m) => m.text).join(), 'The user works at Acme', 'only the memory that says it is forgotten');
    assert.ok(ctx.S.data.memory.some((m) => /mornings/.test(m.text)) && ctx.S.data.memory.some((m) => /Mia and Leo/.test(m.text)), 'the others are kept');
    ctx.addMemory('The user works as a nurse at Leeds General Infirmary and has two kids, Mia and Leo, and lives in Leeds');
    assert.equal(ctx.S.data.memory.filter((m) => /Mia and Leo/.test(m.text)).length, 1, 'a fuller version of a memory replaces it');
    console.log('✓ memory: a short memory no longer overwrites a longer one; "forget" only removes what matches');
  }
  // ---- an engine on this PC is asked without the five-minute limit, and Stop still stops it ----
  {
    const oai = require('../src/main/oai');
    assert.ok(oai.isLocal('http://127.0.0.1:8080/v1/chat/completions') && oai.isLocal('http://localhost:11434/v1/x') && !oai.isLocal('https://api.openai.com/v1/x') && !oai.isLocal('http://127.0.0.1.evil.com/x'));
    let hung = null;
    const engine = http.createServer((req, res) => {
      if (req.url === '/v1/chat/completions') {
        let body = ''; req.on('data', (c) => { body += c; }); req.on('end', () => {
          const want = JSON.parse(body);
          if (want.messages[0].content === 'hang') { hung = res; return; } // reads the prompt for ever
          res.writeHead(200, { 'Content-Type': 'text/event-stream' });
          setTimeout(() => { // the first word comes late
            res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: 'Hello' } }] })}\n\n`);
            res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: ' there' }, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`);
            res.end();
          }, 1200);
        });
      } else { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: { message: 'CUDA error: out of memory' } })); }
    });
    await new Promise((r) => engine.listen(0, '127.0.0.1', r));
    const base = `http://127.0.0.1:${engine.address().port}/v1`;
    let text = ''; let stats = null;
    for await (const ev of oai.streamChat({ baseUrl: base, body: { messages: [{ role: 'user', content: 'hi' }] } })) { if (ev.type === 'text') text += ev.text; if (ev.type === 'stats') stats = ev; }
    assert.equal(text, 'Hello there'); assert.equal(stats.finish, 'stop');
    // Stop while the engine is still reading: the request ends at once, as an abort.
    const ctl = new AbortController();
    const t0 = Date.now();
    setTimeout(() => ctl.abort(), 300);
    await assert.rejects((async () => { for await (const ev of oai.streamChat({ baseUrl: base, signal: ctl.signal, body: { messages: [{ role: 'user', content: 'hang' }] } })) void ev; })(), (e) => e.name === 'AbortError');
    assert.ok(Date.now() - t0 < 3000 && hung, 'Stop ends a request the engine has not started answering');
    // An error from the engine keeps its message (it is how a graphics-card fault is recognized).
    const bad = await oai.localFetch(`http://127.0.0.1:${engine.address().port}/nope`, { method: 'POST', body: '{}' });
    assert.equal(bad.ok, false); assert.match(await oai.errorText(bad), /CUDA error/);
    hung.destroy(); engine.close();
    console.log('✓ a local model is asked without the five-minute cut-off (a slow first word arrives), Stop still stops it, and engine errors keep their message');
  }
  // --- Hugging Face datasets as knowledge ---
  {
    const hf = require('../src/main/hf-data');
    const store = require('../src/main/store');
    assert.equal(hf.cleanId('https://huggingface.co/datasets/owner/name/'), 'owner/name');
    assert.throws(() => hf.cleanId('../../etc'), /owner\/name/);
    assert.deepEqual(hf.parseCSV('q,a\n"Why, though?","Because ""yes""\nand more"\nx,y\n'), [{ q: 'Why, though?', a: 'Because "yes"\nand more' }, { q: 'x', a: 'y' }]);
    const t = hf.rowText({ question: ' What? ', n: 3, picture: { bytes: Buffer.from('x') }, vec: Array(300).fill(0.1), answers: { text: ['a', 'b'] }, raw: new Uint8Array(4), empty: '' });
    assert.equal(t, 'question: What?\nn: 3\nanswers text: a, b', 'pictures, sound and embeddings are left out of the text');
    const realFetch = global.fetch; const asked = [];
    const big = `title,body\n${Array.from({ length: 30 }, (_, i) => `Recipe ${i},"Mix flour, water and salt number ${i}."`).join('\n')}\n`;
    global.fetch = async (url) => {
      url = String(url); asked.push(url);
      const json = (j) => new Response(JSON.stringify(j), { status: 200 });
      if (url.includes('/api/datasets?')) return json([{ id: 'cook/recipes', downloads: 10, likes: 2, tags: ['license:cc0-1.0', 'size_categories:n<1K', 'modality:text'], description: 'Recipes.' }, { id: 'cam/photos', tags: ['modality:image'] }, { id: 'x/private', private: true, tags: [] }]);
      if (url.endsWith('/api/datasets/cook/recipes')) return json({ id: 'cook/recipes', tags: ['license:cc0-1.0', 'modality:text'], cardData: { pretty_name: 'Recipes' } });
      if (url.includes('/tree/main')) return json([{ type: 'file', path: 'README.md', size: 10 }, { type: 'file', path: 'test.jsonl', size: 40 }, { type: 'file', path: 'train.csv', size: big.length }, { type: 'file', path: 'img/a.png', size: 9 }]);
      if (url.endsWith('/resolve/main/train.csv')) return new Response(big);
      if (url.endsWith('/resolve/main/test.jsonl')) return new Response('{"title":"Soup","body":"Boil it."}\n');
      return new Response('', { status: 404 });
    };
    try {
      const found = await hf.searchDatasets('recipes');
      assert.deepEqual(found.map((d) => d.id), ['cook/recipes'], 'picture-only and private datasets are not offered as knowledge');
      assert.equal(found[0].license, 'cc0-1.0'); assert.equal(found[0].rows, 'under 1K rows');
      const info = await hf.datasetInfo('cook/recipes');
      assert.deepEqual(info.files.map((f) => f.path), ['train.csv', 'test.jsonl'], 'text and table files only, the main split first');
      const before = asked.length;
      const c = knowledge.createCollection({ name: 'Cooking' });
      assert.equal(asked.length, before, 'nothing is downloaded until it is added');
      const r = await hf.addDataset(knowledge, c.id, 'cook/recipes');
      assert.equal(r.rows, 31); assert.equal(r.cut, false); assert.equal(r.license, 'cc0-1.0');
      const hits = await knowledge.search('flour water salt number 17', { k: 2, collectionIds: [c.id] });
      assert.match([...hits][0].text, /Recipe \d+/); assert.match([...hits][0].url, /huggingface\.co\/datasets\/cook\/recipes/);
      store.saveConfig({ offline: true });
      await assert.rejects(hf.searchDatasets('x'), /offline/);
      store.saveConfig({ offline: false });
    } finally { global.fetch = realFetch; }
    console.log('✓ Hugging Face datasets: text and tables only, license and size shown first, nothing downloaded until added, then searchable');
  }
  // --- Big downloads: plain http streams (fetch() can crash the process under back-pressure) ---
  {
    const io = require('../src/main/engines');
    const big = Buffer.alloc(3 * 1024 * 1024, 7);
    let sawAuth = null;
    const cdn = http.createServer((req, res) => { sawAuth = req.headers.authorization || ''; res.writeHead(200, { 'content-length': big.length }); res.end(big); });
    await new Promise((r) => cdn.listen(0, '127.0.0.1', r));
    const origin = http.createServer((req, res) => { res.writeHead(302, { location: `http://localhost:${cdn.address().port}/file.bin` }); res.end(); });
    await new Promise((r) => origin.listen(0, '127.0.0.1', r));
    const dest = path.join(os.tmpdir(), `qs-dl-${Date.now()}.bin`);
    const r = await io.httpGet(`http://127.0.0.1:${origin.address().port}/f`, { headers: { Authorization: 'Bearer secret' } });
    assert.equal(r.status, 200); assert.equal(r.headers.get('content-length'), String(big.length));
    r.cancel();
    assert.equal(sawAuth, '', 'the token is not sent on to another host after a redirect');
    // A slow disk: the stream waits and every byte arrives.
    await io.downloadTo(`http://127.0.0.1:${origin.address().port}/f`, dest);
    assert.equal(fs.statSync(dest).size, big.length, 'the whole file arrives through the redirect');
    const ctl = new AbortController(); setTimeout(() => ctl.abort(), 5);
    await assert.rejects(io.downloadTo(`http://127.0.0.1:${origin.address().port}/f`, `${dest}.2`, null, ctl.signal));
    fs.rmSync(dest, { force: true }); fs.rmSync(`${dest}.2`, { force: true });
    cdn.close(); origin.close();
    console.log('✓ big downloads use plain streams: redirects followed, the token stays with Hugging Face, Stop still stops');
  }
  // --- Newer picture models: Qwen-Image 2.1 Turbo and FLUX.3 Klein get the engine settings their docs give ---
  {
    const media = require('../src/main/media');
    const catalog = require('../src/shared/catalog');
    const all = () => true;
    const files = { diffusion: 'd.gguf', vae: 'v.safetensors', llm: 'l.gguf' };
    const hw = { vramGB: 12, ramGB: 32 };
    const q = catalog.MEDIA_MODELS.find((m) => m.id === 'qwen-image-2.1-turbo');
    const k = catalog.MEDIA_MODELS.find((m) => m.id === 'flux-3-klein');
    assert.ok(q && k, 'both are in the catalog');
    const qa = media.sdArgs({ prompt: 'a poster', negative: 'blurry' }, { spec: q, files, hw, has: all, help: {} }).args.join(' ');
    assert.match(qa, /--diffusion-model d\.gguf --vae v\.safetensors --llm l\.gguf --sampling-method euler/);
    assert.match(qa, /--sigmas 1\.0,0\.978453,0\.95418,0\.926626,0\.89508,0\.845148,0\.704534,0\.414568,0\.0/);
    assert.match(qa, /--steps 8 --cfg-scale 1/); assert.doesNotMatch(qa, / -n blurry/, 'no negative prompt at guidance 1');
    const ka = media.sdArgs({ prompt: 'a cat', negative: 'blurry' }, { spec: k, files, hw, has: all, help: {} }).args.join(' ');
    assert.match(ka, /--llm l\.gguf/); assert.match(ka, /--steps 16 --cfg-scale 1/); assert.doesNotMatch(ka, /--sigmas|-n blurry/);
    const ke = media.sdArgs({ prompt: 'make it night', image: 'in.png' }, { spec: k, files, hw, has: all, help: {} }).args.join(' ');
    assert.match(ke, /-r in\.png/, 'FLUX.3 Klein edits a photo from a description');
    console.log('✓ Qwen-Image 2.1 Turbo (8-step schedule) and FLUX.3 Klein (16 steps, photo edits) get the settings their docs give');
  }
  process.exit(0);
})().catch((e) => { console.error(`FAIL ${e.stack || e.message}`); process.exit(1); });
