// The Liquid Edition setup screen: until every Liquid Edition model is installed it covers the
// app, and nothing behind it can be reached (mouse, Tab key or keyboard shortcut). The big models
// the installer copied in are moved to the data folder at start-up, so a reinstall keeps them.
'use strict';
const { _electron: electron } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const assert = require('node:assert/strict');
const ROOT = path.join(__dirname, '..');
const TINY = path.join(__dirname, 'fixtures', 'tiny.gguf');

(async () => {
  const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-gate-'));
  const starter = path.join(HOME, 'app-folder', 'starter'); fs.mkdirSync(starter, { recursive: true });
  const put = (n) => fs.copyFileSync(TINY, path.join(starter, n));
  // What the installer left: the small model and the Brain are here; the Closer and Lustify are not.
  put('model.gguf'); put('mmproj.gguf'); put('qwen3.5-4b.gguf'); put('qwen3.5-4b-mmproj.gguf');
  fs.writeFileSync(path.join(starter, 'STARTER.json'), JSON.stringify({ models: [
    { id: 'starter', catalogId: 'qwen3.5-2b', name: 'Qwen3.5 2B (uncensored)', uncensored: true, files: { model: 'model.gguf', mmproj: 'mmproj.gguf' } },
    { id: 'starter-brain', catalogId: 'qwen3.5-4b', name: 'Qwen3.5 4B (uncensored)', uncensored: true, files: { model: 'qwen3.5-4b.gguf', mmproj: 'qwen3.5-4b-mmproj.gguf' }, pack: true },
    { id: 'starter-closer', catalogId: 'qwen3.5-9b-uncensored', name: 'Qwen3.5 9B (uncensored)', uncensored: true, repo: 'mradermacher/Huihui-Qwen3.5-9B-abliterated-GGUF', quant: 'Q4_K_M', files: { model: 'qwen3.5-9b.gguf', mmproj: 'qwen3.5-9b-mmproj.gguf' }, pack: true },
    { id: 'starter-lustify', catalogId: 'lustify', name: 'Lustify (uncensored)', kind: 'image', uncensored: true, files: { model: 'lustify.safetensors', vae: 'lustify-vae.safetensors' }, pack: true, optional: true, media: true },
  ] }));
  fs.writeFileSync(path.join(HOME, 'config.json'), JSON.stringify({ offline: true })); // offline: the setup screen waits, nothing is fetched
  const app = await electron.launch({ executablePath: require('electron'), args: ['--no-sandbox', ROOT],
    env: { ...process.env, QUICKSILVER_HOME: HOME, QS_STARTER_DIR: starter, QS_KEEP_PACK: '1', QS_LLAMA_SERVER: path.join(__dirname, 'fakes', 'llama-server'), QS_SD_BIN: path.join(__dirname, 'fakes', 'sd'), QS_SCAN_DIRS: path.join(HOME, 'none') } });
  const win = await app.firstWindow();
  const errors = [];
  win.on('pageerror', (e) => errors.push(e.message));
  await win.waitForSelector('#liquid-gate', { timeout: 60000 });
  const gate = await win.evaluate(() => ({ text: document.getElementById('liquid-gate').innerText, app: document.getElementById('app').inert, modal: document.getElementById('modal').inert, route: JSON.stringify(S.route), chats: S.data.chats.length }));
  assert.match(gate.text, /Qwen3\.5 9B/); assert.match(gate.text, /Lustify/);
  assert.ok(!/Qwen3\.5 4B/.test(gate.text), 'models that are already here are not listed');
  assert.deepEqual([gate.app, gate.modal], [true, true], 'the app behind the setup screen is inert');
  // Shortcuts that would open something behind the screen do nothing.
  await win.keyboard.press('Control+n'); await win.keyboard.press('Control+Shift+n'); await win.keyboard.press('Control+k'); await win.keyboard.press('Control+p');
  await win.waitForTimeout(400);
  const after = await win.evaluate(() => ({ route: JSON.stringify(S.route), chats: S.data.chats.length, modal: document.getElementById('modal').hidden, focusInApp: document.getElementById('app').contains(document.activeElement) }));
  assert.deepEqual([after.route, after.chats, after.modal, after.focusInApp], [gate.route, gate.chats, true, false], 'nothing behind the setup screen responds to the keyboard');
  // The Brain the installer copied in has left the app's folder for the data folder (a move, not
  // a copy), and is still registered and usable. The small model stays inside the app.
  const reg = JSON.parse(fs.readFileSync(path.join(HOME, 'models.json'), 'utf8'));
  const brain = reg.find((m) => m.id === 'starter-brain');
  assert.ok(brain.files.model.startsWith(path.join(HOME, 'models', 'kept')) && fs.existsSync(brain.files.model) && fs.existsSync(brain.files.mmproj), 'the pack model is in the data folder');
  assert.ok(!fs.existsSync(path.join(starter, 'qwen3.5-4b.gguf')), 'moved, not copied');
  assert.ok(fs.existsSync(path.join(starter, 'model.gguf')) && reg.find((m) => m.id === 'starter').files.model === path.join(starter, 'model.gguf'), 'the small model stays inside the app');
  // The missing models arrive: the setup screen goes away and the app is usable again.
  await win.evaluate(() => { liquidGate({ missing: [] }); });
  await win.waitForSelector('#liquid-gate', { state: 'detached' });
  assert.deepEqual(await win.evaluate(() => [document.getElementById('app').inert, document.getElementById('modal').inert]), [false, false]);
  assert.deepEqual(errors, []);
  await app.close();

  // Start again, as after reinstalling without the models folder: the app's folder is new (only
  // the small model), and the Brain is still there from the data folder, not asked for again.
  fs.rmSync(path.join(starter, 'qwen3.5-4b-mmproj.gguf'), { force: true });
  const app2 = await electron.launch({ executablePath: require('electron'), args: ['--no-sandbox', ROOT],
    env: { ...process.env, QUICKSILVER_HOME: HOME, QS_STARTER_DIR: starter, QS_KEEP_PACK: '1', QS_LLAMA_SERVER: path.join(__dirname, 'fakes', 'llama-server'), QS_SD_BIN: path.join(__dirname, 'fakes', 'sd'), QS_SCAN_DIRS: path.join(HOME, 'none') } });
  const win2 = await app2.firstWindow();
  await win2.waitForSelector('#liquid-gate', { timeout: 60000 });
  const again = await win2.evaluate(() => ({ text: document.getElementById('liquid-gate').innerText, brain: S.installed.some((m) => m.id === 'starter-brain') }));
  assert.ok(again.brain && !/Qwen3\.5 4B/.test(again.text), 'after a reinstall the Brain is kept: only what is really missing is asked for');
  await app2.close();

  // "Private online" is on and no VPN is connected: every download is blocked. The setup screen
  // says so and offers the ways out itself (the bar that normally does is behind it), and its
  // buttons are not rebuilt while downloads report progress.
  fs.writeFileSync(path.join(HOME, 'config.json'), JSON.stringify({ ...JSON.parse(fs.readFileSync(path.join(HOME, 'config.json'), 'utf8')), offline: false, vpnOnly: true }));
  const app3 = await electron.launch({ executablePath: require('electron'), args: ['--no-sandbox', ROOT],
    env: { ...process.env, QUICKSILVER_HOME: HOME, QS_STARTER_DIR: starter, QS_KEEP_PACK: '1', QS_LLAMA_SERVER: path.join(__dirname, 'fakes', 'llama-server'), QS_SD_BIN: path.join(__dirname, 'fakes', 'sd'), QS_SCAN_DIRS: path.join(HOME, 'none') } });
  const win3 = await app3.firstWindow();
  await win3.waitForSelector('#liquid-gate [data-gate-plain]', { timeout: 60000 });
  const vpn = await win3.evaluate(() => {
    const gate = document.getElementById('liquid-gate');
    const before = gate.querySelector('[data-gate-plain]');
    S.downloads['qwen3.5-9b-uncensored'] = { id: 'qwen3.5-9b-uncensored', downloaded: 5, total: 10 };
    paintLiquidGate(); paintLiquidGate();
    const row = [...gate.querySelectorAll('[data-gate-row]')].find((r) => r.dataset.gateRow === 'qwen3.5-9b-uncensored');
    const out = { text: gate.innerText, same: before.isConnected && gate.querySelector('[data-gate-plain]') === before, vpnBtn: Boolean(gate.querySelector('[data-gate-vpn]')), bar: row?.querySelector('.bar i').style.width };
    delete S.downloads['qwen3.5-9b-uncensored'];
    return out;
  });
  assert.match(vpn.text, /Private online is on, but no VPN is connected/);
  assert.ok(vpn.vpnBtn, 'offers to open the VPN');
  assert.ok(vpn.same, 'a button stays the same button while progress is painted');
  assert.equal(vpn.bar, '50%', 'progress still updates');
  await app3.close();
  fs.rmSync(HOME, { recursive: true, force: true });
  console.log('✓ setup screen: nothing behind it can be reached; the installer\'s big models move to the data folder and survive a reinstall; with Private online and no VPN it says so and offers the way out');
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
