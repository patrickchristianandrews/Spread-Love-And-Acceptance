// Quicksilver — main process: window, safe file access for the interface, and every action the
// interface can ask for (chat, models, stacks, studio, library, APIs, engines, settings).
const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const store = require('./store');
const offline = require('./offline'); // must load before anything that uses the network
const catalog = require('../shared/catalog');
const hardware = require('./hardware');
const engines = require('./engines');
const models = require('./models');
const llama = require('./llama');
const providers = require('./providers');
const complete = require('./complete');
const docs = require('./docs');
const knowledge = require('./knowledge');
const websearch = require('./websearch');
const media = require('./media');
const apiserver = require('./apiserver');
const integrations = require('./integrations');
const mcp = require('./mcp');
const whisper = require('./whisper');
const phone = require('./phone');
const updater = require('./updater');

protocol.registerSchemesAsPrivileged([{ scheme: 'qsmedia', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);

let win = null;
const emit = (channel, data) => { if (win && !win.isDestroyed()) win.webContents.send(channel, data); };
const handle = (ch, fn) => ipcMain.handle(ch, async (_e, ...args) => {
  try { return { ok: true, value: await fn(...args) }; } catch (err) { return { ok: false, error: String(err?.message || err) }; }
});

// ---------- app data (chats, assistants, preferences) ----------
handle('data:load', () => store.readJSON(store.file('app-data.json'), null));
handle('data:save', (d) => { store.writeJSON(store.file('app-data.json'), d); return true; });

// ---------- config and secrets ----------
const publicConfig = () => {
  const c = store.config();
  return { ...c, secrets: Object.fromEntries(['huggingface', 'web:brave', 'web:tavily', 'apiServerKey'].map((k) => [k, store.hasSecret(k)])) };
};
handle('config:get', publicConfig);
handle('config:set', async (patch) => {
  store.saveConfig(patch);
  if (patch.apiServer) await apiserver.start();
  return publicConfig();
});
handle('secret:set', (name, value) => {
  if (!['huggingface', 'web:brave', 'web:tavily', 'apiServerKey'].includes(name)) throw new Error('Unknown setting.');
  store.setSecret(name, value);
  return true;
});
handle('apiserver:newKey', () => {
  const key = `qs-${require('node:crypto').randomBytes(24).toString('base64url')}`;
  store.setSecret('apiServerKey', key);
  return key;
});
handle('apiserver:revealKey', () => store.getSecret('apiServerKey'));
handle('apiserver:status', () => apiserver.status());

// ---------- voice typing, phone access, updates ----------
handle('voice:status', () => whisper.status());
handle('voice:setup', () => whisper.setup((p) => emit('app:event', { kind: 'voice:progress', ...p })));
handle('voice:transcribe', (bytes, opts) => whisper.transcribe(bytes, opts));
handle('phone:info', () => phone.info());
handle('phone:set', (patch) => phone.configure({ enabled: Boolean(patch.enabled), ...(patch.port ? { port: Math.max(1024, Math.min(65535, Number(patch.port))) } : {}) }));
handle('phone:newLink', () => phone.newToken());
handle('update:state', () => updater.state());
handle('update:check', () => updater.check());
handle('update:download', () => updater.download());
handle('update:install', () => updater.install({ starterDir: app.isPackaged ? path.join(process.resourcesPath, 'starter') : null }));

// ---------- hardware, catalog, estimates, advisor ----------
handle('hw:detect', (fresh) => hardware.detect({ fresh }));
handle('catalog:get', () => ({ text: catalog.TEXT_MODELS, textCategories: catalog.TEXT_CATEGORIES, media: catalog.MEDIA_MODELS, mediaCategories: catalog.MEDIA_CATEGORIES, jobs: catalog.JOBS }));
// Everything the model details view shows: how it runs here, why, and what it would need.
handle('catalog:details', async (id) => {
  const hw = await hardware.detect();
  const c = store.config().calib;
  const text = catalog.TEXT_MODELS.find((m) => m.id === id);
  const m = text || catalog.MEDIA_MODELS.find((x) => x.id === id);
  if (!m) throw new Error('Unknown model.');
  const kind = text ? 'text' : 'media';
  const est = text ? catalog.estimateText(m, hw, c.text) : catalog.estimateMedia(m, hw, c.media);
  const alt = text && est.fit === 'no' ? catalog.smallerAlternative(m, hw) : null;
  // Speed boost: a small same-family model that would let this one write faster.
  const fam = text && !m.activeGB && !m.vision ? catalog.DRAFT_FAMILIES.find((f) => f.targets.test(m.id)) : null;
  const helper = fam && catalog.TEXT_MODELS.find((x) => x.id === fam.drafts[0] && x.sizeGB <= m.sizeGB * 0.3);
  const boost = helper && { id: helper.id, name: helper.name, sizeGB: helper.sizeGB, installed: models.list().some((x) => x.catalogId === helper.id) };
  return { model: m, kind, est, hardware: hw, boost, req: catalog.requirements(m, hw, kind), alt: alt && { id: alt.id, name: alt.name, sizeGB: alt.sizeGB, est: catalog.estimateText(alt, hw, c.text) } };
});
handle('catalog:estimates', async () => {
  const hw = await hardware.detect();
  const c = store.config().calib;
  return {
    hardware: hw,
    text: Object.fromEntries(catalog.TEXT_MODELS.map((m) => [m.id, catalog.estimateText(m, hw, c.text)])),
    media: Object.fromEntries(catalog.MEDIA_MODELS.map((m) => [m.id, catalog.estimateMedia(m, hw, c.media)])),
    calibrated: c.text !== 1,
  };
});
// Low-cost upgrades and the difference each would make on this PC.
handle('upgrades:advise', async () => {
  const hw = await hardware.detect();
  return { hardware: hw, upgrades: catalog.upgradeAdvice(hw, { calib: store.config().calib.text, installed: models.list() }) };
});

// Speeds on this PC, so every screen can say how long something will take:
// models in words per second (stacks list each member), image/video models in seconds per item.
handle('speed:map', async () => {
  const hw = await hardware.detect();
  const calib = store.config().calib;
  const measuredSpeeds = require('./speeds').measured();
  const wpsOf = (t) => {
    const p = complete.parse(t);
    if (p.kind === 'api') return 40;
    if (p.kind !== 'local') return null;
    const m = models.get(p.id);
    if (!m) return null;
    const real = measuredSpeeds[m.id];
    return Math.max(0.1, real ? real.tps * 0.75 : catalog.estimateText(catalog.profileInstalled(m), hw, calib.text).wordsPerSec || 0.1);
  };
  const isMeasured = (t) => { const p = complete.parse(t); return p.kind === 'local' && Boolean(measuredSpeeds[p.id]); };
  // Expected quality (0-10) of each kind of output: a model's own score; for a stack, its best
  // member's, and "team" when a second model cross-checks it.
  const JOBS = ['general', 'reasoning', 'office', 'research', 'writing', 'coding', 'open'];
  const scoresOf = (t) => {
    const p = complete.parse(t);
    if (p.kind === 'api') return Object.fromEntries(JOBS.map((j) => [j, 8]));
    const m = p.kind === 'local' && models.get(p.id);
    if (!m) return null;
    const prof = catalog.profileInstalled(m);
    return Object.fromEntries(JOBS.map((j) => [j, j === 'open' ? (prof.open ? catalog.scoreFor(prof, 'general') : catalog.scoreFor(prof, 'general') - 2) : catalog.scoreFor(prof, j)]));
  };
  const best = (list) => Object.fromEntries(JOBS.map((j) => [j, Math.max(0, ...list.filter(Boolean).map((s) => s[j]))]));
  const out = { targets: {}, media: {} };
  for (const t of complete.targets()) {
    const p = complete.parse(t.target);
    if (p.kind === 'local' || p.kind === 'api') {
      const m = p.kind === 'local' && models.get(p.id);
      out.targets[t.target] = { kind: 'model', wps: wpsOf(t.target), measured: isMeasured(t.target), scores: scoresOf(t.target), vision: Boolean(t.vision), local: p.kind === 'local', ctx: m ? catalog.profileInstalled(m).ctx || 8192 : 131072, name: t.label };
    }
    else if (p.kind === 'stack') {
      const m = complete.stacks().find((x) => x.id === p.id)?.members || {};
      const all = [...new Set([...(m.drafters || []), m.judge, m.vision].filter(Boolean))];
      out.targets[t.target] = { kind: 'stack', measured: all.some(isMeasured), auto: m.mode === 'auto', drafters: (m.drafters || []).map(wpsOf).filter(Boolean), judge: m.judge ? wpsOf(m.judge) : null, vision: m.vision ? wpsOf(m.vision) : null, scores: best(all.map(scoresOf)), team: all.length >= 2 };
    } else if (p.kind === 'kbm') out.targets[t.target] = { kind: 'kbm', base: complete.kbModels().find((k) => k.id === p.id)?.base };
  }
  for (const m of models.list().filter((x) => x.kind !== 'text')) {
    const c = catalog.MEDIA_MODELS.find((x) => x.id === m.catalogId);
    if (c) out.media[m.id] = { sec: catalog.estimateMedia(c, hw, calib.media).sec, kind: c.kind, category: c.category, stars: Math.round(c.quality || 5) / 2, frames: c.defaults?.frames || null };
  }
  return out;
});

// Home and the Compare page: the best setup for this PC, and every stack type side by side.
handle('advisor:overview', async () => {
  const hw = await hardware.detect();
  const calib = store.config().calib.text;
  const installed = models.list();
  const nameOf = (id) => models.get(id)?.name || [...catalog.TEXT_MODELS, ...catalog.MEDIA_MODELS].find((m) => m.id === id)?.name || id;
  const textCaps = (ids, pool) => catalog.capabilities(ids.map((id) => pool.find((m) => m.id === id)).filter(Boolean));
  const mineProfiles = installed.filter((m) => m.kind === 'text').map(catalog.profileInstalled);
  const jobs = Object.keys(catalog.JOBS).map((job) => {
    const j = catalog.JOBS[job];
    const a = catalog.advise(job, hw, { calib, installed });
    const base = { job, kind: j.kind, label: j.label, icon: j.icon, pitch: j.pitch };
    if (j.kind === 'media') {
      const side = (s) => s && { roles: Object.entries(s.members).map(([role, id]) => ({ role, label: a.roleLabels[role], name: nameOf(id), sec: s.estimates[id]?.sec || null })), missingGB: s.missingGB || 0, better: s.better };
      return { ...base, mine: side(a.mine), best: a.best?.members[a.roles[0]] ? side(a.best) : null };
    }
    const side = (s, pool) => s && { names: s.ids.map(nameOf), stars: catalog.starsFor(s.quality, s.ids.length >= 2), seconds: s.secondsPerAnswer, missingGB: s.missingGB || 0, better: s.better, caps: textCaps(s.ids, pool) };
    return { ...base, mine: side(a.mine, mineProfiles), best: side(a.best, catalog.TEXT_MODELS) };
  });
  const quicksilver = (await complete.ensureQuicksilverStack()) ? await complete.explainStack('quicksilver') : null;
  const yours = [];
  for (const s of complete.stacks()) if (s.id !== 'quicksilver') { const e = await complete.explainStack(s.id); if (e) yours.push(e); }
  const measured = require('./speeds').measured();
  return { hardware: hw, quicksilver, jobs, yours, measuredCount: Object.keys(measured).length };
});
handle('advisor:advise', async (job) => {
  const hw = await hardware.detect();
  return { hardware: hw, ...catalog.advise(job, hw, { calib: store.config().calib.text, installed: models.list() }) };
});

// Speed test: runs the smallest installed text model and compares the real speed to the estimate.
handle('bench:run', async () => {
  const installed = models.list().filter((m) => m.kind === 'text').sort((a, b) => a.size - b.size);
  if (!installed.length) throw new Error('Download a text model first, then run the speed test.');
  const m = installed[0];
  const hw = await hardware.detect();
  emit('bench:status', `Loading ${m.name}…`);
  let tokens = 0;
  let tps = 0;
  for await (const ev of llama.chat({ id: m.id, name: m.name, file: m.files.model }, { messages: [{ role: 'user', content: 'Write a 200-word paragraph about the history of mapmaking.' }], temperature: 0.7, maxTokens: 200, contextSize: 4096, onStatus: (s) => emit('bench:status', s) })) {
    if (ev.type === 'text' || ev.type === 'reasoning') { tokens++; if (tokens % 10 === 0) emit('bench:status', `Writing… ${tokens} words`); }
    if (ev.type === 'stats') tps = ev.tps;
  }
  const spec = catalog.TEXT_MODELS.find((x) => x.id === m.catalogId) || { sizeGB: m.size / 1024 ** 3, mmprojGB: 0 };
  const expected = catalog.estimateText(spec, hw, 1).tps || 1;
  const factor = Math.max(0.2, Math.min(3, tps / expected));
  store.saveConfig({ calib: { ...store.config().calib, text: factor, media: Math.max(0.3, Math.min(3, 1 / factor)) } });
  require('./speeds').record(m.id, tps, Math.max(tokens, 24), expected);
  return { model: m.name, tps, expected, factor };
});

// ---------- models ----------
handle('models:list', () => ({ installed: models.list(), downloading: models.active(), running: llama.status() }));
handle('models:download', async (req) => {
  const plan = req.catalogId ? await models.planCatalog(req.catalogId) : await models.planGguf(req.repo, { quant: req.quant });
  return models.start(plan, emit);
});
handle('models:options', (repo) => models.ggufOptions(repo));
handle('models:cancel', (id) => models.cancel(id));
handle('models:remove', (id) => { llama.stopAll(); return models.remove(id); });
handle('models:search', (q) => models.search(q));
// This PC's load right now, for the status light in chats.
let cpuPrev = null;
handle('system:load', () => {
  const os = require('node:os');
  const t = os.cpus().reduce((acc, c) => { const tot = Object.values(c.times).reduce((x, y) => x + y, 0); return { idle: acc.idle + c.times.idle, total: acc.total + tot }; }, { idle: 0, total: 0 });
  const cpu = cpuPrev && t.total > cpuPrev.total ? Math.max(0, Math.min(100, 100 * (1 - (t.idle - cpuPrev.idle) / (t.total - cpuPrev.total)))) : null;
  cpuPrev = t;
  return { cpu, memFreeGB: os.freemem() / 1024 ** 3, memTotalGB: os.totalmem() / 1024 ** 3, engines: llama.status() };
});
handle('models:trending', async (force) => models.trending({ force, hw: await hardware.detect() }));
handle('models:import', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Import a GGUF model', properties: ['openFile'], filters: [{ name: 'GGUF model', extensions: ['gguf'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  return models.importFile(r.filePaths[0], llama.readGguf);
});
handle('models:folder', () => shell.openPath(store.dir('models')));
handle('models:found', () => models.findOnPC());
handle('models:repair', (id) => { llama.stopAll(); return models.repair(id, emit); });
handle('models:addFound', (items) => models.addFound(items, llama.readGguf));
// At start-up: add every model found on this PC (other apps, Downloads) without asking.
// The starter model inside the installer (resources/starter), or QS_STARTER_DIR for tests.
handle('models:starter', () => {
  const r = models.registerStarter(process.env.QS_STARTER_DIR || (app.isPackaged ? path.join(process.resourcesPath, 'starter') : path.join(__dirname, '..', '..', 'starter')));
  return complete.ensureQuicksilverStack().then((stack) => ({ ...r, stack }));
});
handle('quicksilver:rebuild', () => complete.ensureQuicksilverStack());
handle('models:autoAdd', async () => { const found = models.findOnPC(); return found.length ? models.addFound(found, llama.readGguf) : []; });

// ---------- providers (APIs) ----------
handle('providers:presets', () => providers.PRESETS);
handle('providers:list', () => providers.publicList());
handle('providers:save', (p, key) => providers.upsert(p, key));
handle('providers:remove', (id) => providers.remove(id));
handle('providers:refresh', (id) => providers.refreshModels(id));

// ---------- stacks and chat ----------
handle('targets:list', () => complete.targets());
handle('models:warm', (target, opts) => complete.warm(target, opts).catch(() => false));
handle('stacks:list', () => complete.stacks());
handle('stacks:save', (s) => complete.saveStack(s));
handle('stacks:delete', (id) => complete.deleteStack(id));
handle('kbm:list', () => complete.kbModels());
handle('kbm:save', (m) => complete.saveKbModel(m));
handle('kbm:delete', (id) => complete.deleteKbModel(id));

const chats = new Map();
ipcMain.on('chat:send', async (_e, p) => {
  const controller = new AbortController();
  chats.set(p.requestId, controller);
  const send = (ev) => emit('chat:event', { requestId: p.requestId, ev });
  try {
    const cfg = store.config();
    for await (const ev of complete.run(p.target, {
      messages: p.messages, temperature: p.temperature, maxTokens: p.maxTokens, contextSize: p.contextSize, gpu: p.gpu,
      effort: p.effort, level: p.level, signal: controller.signal, useTools: Boolean(p.tools),
      approve: (q) => askApproval(p.requestId, q, controller.signal),
      onStatus: (text) => send({ type: 'status', text }),
      onStep: (step) => send({ type: 'step', step: { ...step } }),
      calib: cfg.calib,
    })) send(ev);
    send({ type: 'done', aborted: controller.signal.aborted });
  } catch (err) {
    send({ type: controller.signal.aborted ? 'done' : 'error', aborted: controller.signal.aborted, message: String(err?.message || err) });
  } finally {
    chats.delete(p.requestId);
  }
});
ipcMain.on('chat:abort', (_e, id) => chats.get(id)?.abort());

// Approvals: a tool that changes something waits here until you allow or deny it.
const approvals = new Map();
function askApproval(requestId, q, signal) {
  return new Promise((resolve) => {
    const approvalId = `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    approvals.set(approvalId, resolve);
    signal?.addEventListener('abort', () => { approvals.delete(approvalId); resolve({ ok: false }); });
    emit('chat:event', { requestId, ev: { type: 'approve', approvalId, ...q } });
  });
}
ipcMain.on('chat:approval', (_e, { approvalId, ok, always }) => { approvals.get(approvalId)?.({ ok, always }); approvals.delete(approvalId); });

// ---------- integrations and MCP ----------
handle('int:list', () => integrations.list());
handle('int:save', (id, values, token) => integrations.save(id, values, token));
handle('int:disable', (id) => integrations.disable(id));
handle('int:tools', async () => (await require('./tools').available()).map((t) => ({ name: t.name, description: t.description, write: Boolean(t.write), source: t.source })));
handle('mcp:presets', () => mcp.PRESETS);
handle('mcp:registry', (query) => require('./mcp-catalog').searchRegistry(query));
const customapi = require('./customapi');
handle('capi:list', () => customapi.list());
handle('capi:save', (api, key) => customapi.save(api, key));
handle('capi:remove', (id) => customapi.remove(id));
handle('capi:test', (id) => customapi.test(id));
handle('mcp:list', () => mcp.status());
handle('mcp:save', (s, token) => mcp.upsert(s, token));
handle('mcp:remove', (id) => mcp.remove(id));
handle('mcp:test', (id) => mcp.testServer(id));
handle('tools:allowed', () => store.config().toolAllow || []);
handle('tools:auto', (on) => { if (on !== undefined) store.saveConfig({ toolAutoApprove: Boolean(on) }); return Boolean(store.config().toolAutoApprove); });
handle('tools:forget', (name) => { store.saveConfig({ toolAllow: (store.config().toolAllow || []).filter((n) => n !== name) }); return true; });
handle('kb:github', async (collectionId, repo, maxFiles) => {
  const files = await integrations.githubRepoFiles(repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/+$/, ''), { maxFiles });
  return knowledge.addTexts(collectionId, files.map((f) => ({ name: `${repo}/${f.path}`, path: f.url, kind: /\.(md|mdx|txt|rst|adoc)$/i.test(f.path) ? 'document' : 'code', text: f.text })));
});

// ---------- documents, library, web ----------
handle('docs:extract', (name, bytes) => docs.extract(name, Buffer.from(bytes)));
handle('kb:list', () => ({ collections: knowledge.collections(), live: knowledge.LIVE }));
handle('kb:create', (c) => knowledge.createCollection(c));
handle('kb:update', (id, patch) => knowledge.updateCollection(id, patch));
handle('kb:delete', (id) => knowledge.deleteCollection(id));
handle('kb:docs', (id) => knowledge.docs(id));
handle('kb:removeDoc', (id) => knowledge.removeDoc(id));
handle('kb:add', async (collectionId, kind) => {
  const r = await dialog.showOpenDialog(win, kind === 'folder'
    ? { title: 'Add a folder', properties: ['openDirectory', 'multiSelections'] }
    : { title: 'Add files', properties: ['openFile', 'multiSelections'], filters: [{ name: 'Documents', extensions: ['pdf', 'docx', 'xlsx', 'csv', 'pptx', 'txt', 'md', 'html', 'json'] }, { name: 'All files', extensions: ['*'] }] });
  if (r.canceled) return { added: 0, errors: [] };
  return knowledge.addPaths(collectionId, r.filePaths, (p) => emit('library:progress', p));
});
handle('kb:website', (collectionId, url, maxPages) => knowledge.addWebsite(collectionId, url, { maxPages, onProgress: (p) => emit('library:progress', p) }));
handle('kb:search', async (q, k, ids) => { const r = await knowledge.search(q, { k, collectionIds: ids }); return { results: [...r], failures: r.failures || [] }; });
handle('web:search', (q) => websearch.search(q));

// ---------- studio (photo & video) ----------
handle('media:gallery', () => media.gallery().map((g) => ({ ...g, url: `qsmedia://g/${g.id}` })));
handle('media:remove', (id) => media.removeFromGallery(id));
handle('media:saveDataUrl', (dataUrl, meta) => { const g = media.saveDataUrl(dataUrl, meta); return { ...g, url: `qsmedia://g/${g.id}` }; });
handle('media:importPath', async (p) => {
  const ext = path.extname(p).slice(1).toLowerCase();
  const kind = /^(mp4|mov|webm|mkv|avi|m4v)$/.test(ext) ? 'video' : /^(mp3|wav|m4a|aac|flac|ogg|opus|wma)$/.test(ext) ? 'audio' : 'image';
  const dest = path.join(media.mediaDir(), `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${ext}`);
  fs.copyFileSync(p, dest);
  const g = media.addToGallery({ kind, file: dest, title: path.basename(p) });
  return { ...g, url: `qsmedia://g/${g.id}` };
});
const mediaJobs = new Map();
handle('media:generate', (jobId, req) => {
  const g = media.gallery();
  const resolveInput = (id) => (id ? g.find((x) => x.id === id)?.file : undefined);
  let maskFile;
  if (req.maskDataUrl) {
    maskFile = path.join(store.dir('tmp'), `${jobId}-mask.png`);
    fs.writeFileSync(maskFile, Buffer.from(req.maskDataUrl.split(',')[1], 'base64'));
  }
  const p = media.generate(jobId, { ...req, image: resolveInput(req.imageId), mask: maskFile }, {
    onProgress: (f) => emit('media:event', { jobId, type: 'progress', value: f }),
    onStatus: (text) => emit('media:event', { jobId, type: 'status', text }),
  }).then((item) => emit('media:event', { jobId, type: 'done', item: { ...item, url: `qsmedia://g/${item.id}` } }))
    .catch((err) => emit('media:event', { jobId, type: 'error', message: err.message }));
  mediaJobs.set(jobId, p);
  return true;
});
handle('media:stop', (jobId) => media.stop(jobId));
handle('media:apiImage', async (providerId, model, req) => {
  const g = media.gallery();
  const input = req.imageId ? `data:image/png;base64,${fs.readFileSync(g.find((x) => x.id === req.imageId).file).toString('base64')}` : undefined;
  const buf = await providers.image(providerId, model, { ...req, image: input, mask: req.maskDataUrl });
  const item = media.saveBuffer(buf, 'png', { prompt: req.prompt, model, mode: input ? 'edit' : 'generate' });
  return { ...item, url: `qsmedia://g/${item.id}` };
});
handle('media:editVideo', async (id, ops, jobId) => {
  const g = media.gallery().find((x) => x.id === id);
  if (!g) throw new Error('That video is no longer in the gallery.');
  const item = await media.editVideo(g.file, ops, { onProgress: (v) => emit('media:event', { jobId, type: 'progress', value: v }) });
  return { ...item, url: `qsmedia://g/${item.id}` };
});
handle('media:videoFrames', (id, n) => media.videoFrames(media.gallery().find((x) => x.id === id).file, n));
handle('media:probe', (id) => media.probe(media.gallery().find((x) => x.id === id)?.file));
handle('media:frame', async (id, at) => {
  const item = await media.extractFrame(media.gallery().find((x) => x.id === id).file, at);
  return { ...item, url: `qsmedia://g/${item.id}` };
});
handle('media:dataUrl', (id) => {
  const g = media.gallery().find((x) => x.id === id);
  const ext = path.extname(g.file).slice(1).toLowerCase();
  return `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${fs.readFileSync(g.file).toString('base64')}`;
});
handle('media:export', async (id) => {
  const g = media.gallery().find((x) => x.id === id);
  const r = await dialog.showSaveDialog(win, { defaultPath: path.basename(g.file) });
  if (r.canceled || !r.filePath) return false;
  fs.copyFileSync(g.file, r.filePath);
  return true;
});
// Audio, video and photo tools (see avtools.js). Jobs report through the same events as Studio.
const avtools = require('./avtools');
const toolJob = (jobId, work) => {
  work({ onProgress: (v) => emit('media:event', { jobId, type: 'progress', value: v }) })
    .then((item) => emit('media:event', { jobId, type: 'done', item: { ...item, url: `qsmedia://g/${item.id}` } }))
    .catch((err) => emit('media:event', { jobId, type: 'error', message: err.message }));
  return true;
};
handle('tools:run', (jobId, kind, op, src) => toolJob(jobId, (o) => avtools.run(kind, op, src, o)));
handle('tools:speak', (jobId, text, opts) => toolJob(jobId, (o) => avtools.speak(text, { ...opts, ...o })));
handle('tools:voices', () => avtools.voices());
handle('tools:saveWav', async (dataUrl, meta) => { const g = await avtools.saveWav(dataUrl, meta); return { ...g, url: `qsmedia://g/${g.id}` }; });

// Apps made by the "Build an app" skills open in their own window: sandboxed, no access to
// Quicksilver or your files, and no network (the page must be self-contained).
handle('app:preview', async (html, title) => {
  const file = path.join(store.dir('tmp'), `app-${Date.now().toString(36)}.html`);
  fs.writeFileSync(file, String(html));
  const w = new BrowserWindow({ width: 1100, height: 800, title: `${String(title || 'App').slice(0, 60)} · Quicksilver`, autoHideMenuBar: true,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, partition: `app-preview-${Date.now()}` } });
  w.webContents.session.webRequest.onBeforeRequest((d, cb) => cb({ cancel: !/^(file|data|blob|about|devtools):/.test(d.url) }));
  w.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  w.webContents.on('will-navigate', (ev, url) => { if (!url.startsWith('file:')) ev.preventDefault(); });
  w.on('closed', () => fs.rmSync(file, { force: true }));
  await w.loadFile(file);
  return true;
});
handle('media:reveal', (id) => shell.showItemInFolder(media.gallery().find((x) => x.id === id).file));

// ---------- engines ----------
handle('engines:list', async () => {
  const hw = await hardware.detect();
  const out = {};
  for (const kind of ['llama', 'sd']) {
    const active = engines.resolve(kind, hw);
    out[kind] = { installed: engines.installed(kind).map((e) => ({ ...e, version: engines.version(e.bin) })), available: engines.available(kind), active: active?.variant || null, choice: store.config().engine[kind] };
  }
  return out;
});
handle('engines:install', async (kind, variant) => {
  const r = await engines.install(kind, variant, (p) => emit('engines:progress', { kind, variant, ...p }));
  llama.stopAll();
  return r;
});
handle('engines:cancel', (kind, variant) => engines.cancelInstall(kind, variant));
handle('engines:remove', (kind, variant) => { llama.stopAll(); engines.remove(kind, variant); return true; });

// ---------- files ----------
handle('file:saveText', async (name, text) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: name });
  if (r.canceled || !r.filePath) return false;
  fs.writeFileSync(r.filePath, text);
  return true;
});
handle('file:saveXlsx', async (name, rows) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: name, filters: [{ name: 'Excel workbook', extensions: ['xlsx'] }] });
  if (r.canceled || !r.filePath) return false;
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Table');
  rows.forEach((row, i) => {
    const added = ws.addRow(row.map((v) => (i > 0 && /^-?[\d,]*\.?\d+%?$/.test(String(v).trim()) && !/^0\d/.test(String(v).trim()) ? Number(String(v).replace(/[,%]/g, '')) : v)));
    if (i === 0) added.font = { bold: true };
  });
  ws.columns.forEach((c) => { c.width = Math.min(50, Math.max(10, ...rows.map((r) => String(r[c.number - 1] ?? '').length + 2))); });
  await wb.xlsx.writeFile(r.filePath);
  return true;
});
handle('export:file', async (format, { markdown, html, title }) => {
  const ext = { docx: 'docx', pptx: 'pptx', pdf: 'pdf', md: 'md' }[format];
  const names = { docx: 'Word document', pptx: 'PowerPoint presentation', pdf: 'PDF', md: 'Markdown' };
  const safe = String(title || 'Quicksilver').replace(/[^\w .-]/g, '').trim().slice(0, 80) || 'Quicksilver';
  const r = await dialog.showSaveDialog(win, { defaultPath: `${safe}.${ext}`, filters: [{ name: names[format], extensions: [ext] }] });
  if (r.canceled || !r.filePath) return false;
  const exporters = require('./exporters');
  if (format === 'docx') await exporters.toDocx(markdown, r.filePath, { title });
  else if (format === 'pptx') await exporters.toPptx(markdown, r.filePath, { title });
  else if (format === 'pdf') await exporters.toPdf(html, r.filePath, { title });
  else fs.writeFileSync(r.filePath, markdown);
  shell.showItemInFolder(r.filePath);
  return true;
});
handle('shell:open', (url) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); });

// ---------- window ----------
function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 920, minWidth: 900, minHeight: 600,
    title: 'Quicksilver',
    icon: path.join(__dirname, '..', '..', 'build', 'icon.png'),
    backgroundColor: '#0b1020',
    webPreferences: { preload: path.join(__dirname, '..', 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (ev) => ev.preventDefault());
}

app.whenReady().then(() => {
  // Gallery files are served to the interface by id only, never by arbitrary path.
  protocol.handle('qsmedia', (req) => {
    const id = decodeURIComponent(new URL(req.url).pathname.replace(/^\//, ''));
    const g = media.gallery().find((x) => x.id === id);
    if (!g) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(g.file).toString(), { headers: req.headers });
  });
  createWindow();
  apiserver.start();
  phone.start(emit);
  updater.init(emit);
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('before-quit', () => { llama.stopAll(); apiserver.stop(); phone.stop(); mcp.disconnectAll(); });
app.on('window-all-closed', () => { llama.stopAll(); if (process.platform !== 'darwin') app.quit(); });
