// Quicksilver — main process: window, safe file access for the interface, and every action the
// interface can ask for (chat, models, stacks, studio, library, APIs, engines, settings).
const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const store = require('./store');
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

// ---------- hardware, catalog, estimates, advisor ----------
handle('hw:detect', (fresh) => hardware.detect({ fresh }));
handle('catalog:get', () => ({ text: catalog.TEXT_MODELS, textCategories: catalog.TEXT_CATEGORIES, media: catalog.MEDIA_MODELS, mediaCategories: catalog.MEDIA_CATEGORIES, jobs: catalog.JOBS }));
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
handle('advisor:advise', async (job) => {
  const hw = await hardware.detect();
  return { hardware: hw, ...catalog.advise(job, hw, { calib: store.config().calib.text }) };
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
handle('models:import', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Import a GGUF model', properties: ['openFile'], filters: [{ name: 'GGUF model', extensions: ['gguf'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  return models.importFile(r.filePaths[0], llama.readGguf);
});
handle('models:folder', () => shell.openPath(store.dir('models')));

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

const chats = new Map();
ipcMain.on('chat:send', async (_e, p) => {
  const controller = new AbortController();
  chats.set(p.requestId, controller);
  const send = (ev) => emit('chat:event', { requestId: p.requestId, ev });
  try {
    const cfg = store.config();
    for await (const ev of complete.run(p.target, {
      messages: p.messages, temperature: p.temperature, maxTokens: p.maxTokens, contextSize: p.contextSize, gpu: p.gpu,
      effort: p.effort, level: p.level, signal: controller.signal,
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
  const kind = /^(mp4|mov|webm|mkv|avi|m4v)$/.test(ext) ? 'video' : 'image';
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
    backgroundColor: '#f6f3ff',
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
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('before-quit', () => { llama.stopAll(); apiserver.stop(); });
app.on('window-all-closed', () => { llama.stopAll(); if (process.platform !== 'darwin') app.quit(); });
