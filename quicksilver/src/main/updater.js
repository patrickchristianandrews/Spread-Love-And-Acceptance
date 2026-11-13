// Automatic updates: new versions are published as GitHub releases (tag quicksilver-vX.Y.Z,
// with the Windows installer attached). Quicksilver checks once a day, downloads a new version
// quietly in the background, checks its fingerprint, and installs it when you restart.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const store = require('./store');

const REPO = 'patrickchristianandrews/Spread-Love-And-Acceptance';
const API = () => process.env.QS_UPDATE_URL || `https://api.github.com/repos/${REPO}/releases?per_page=30`;
let electron = null;
if (process.versions.electron) { try { electron = require('electron'); } catch {} }
const current = () => process.env.QS_VERSION || electron?.app?.getVersion() || require('../../package.json').version;

const cmp = (a, b) => {
  const pa = String(a).split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  const pb = String(b).split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
};

let state = { checking: false, available: null, downloaded: null, progress: null, error: '', checkedAt: 0 };
let emit = () => {};
const changed = () => emit('app:event', { kind: 'update', state: publicState() });
const publicState = () => ({ current: current(), ...state, downloaded: state.downloaded ? { version: state.downloaded.version } : null });

// The newest published version for this system, if it's newer than this one.
async function check() {
  if (require('./offline').isOffline()) return publicState();
  state.checking = true; state.error = ''; changed();
  try {
    const res = await fetch(API(), { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Quicksilver' } });
    if (!res.ok) throw new Error(`Couldn't check for updates (HTTP ${res.status}).`);
    const list = await res.json();
    // Updates download the app only: the web installer (about 200 MB, no models inside) rather
    // than the full installer (about 1.9 GB, which carries the small model). Your models are kept
    // outside the app's folder, so they stay; if the new version's Liquid Edition has a model you
    // don't have yet, its setup screen downloads just that one. The full installer is only used
    // when a release has no web installer.
    const win = process.platform === 'win32' || process.env.QS_UPDATE_URL;
    const wants = win ? [/^Quicksilver-Web-Setup-[\d.]+\.exe$/i, /^Quicksilver-Setup-[\d.]+\.exe$/i] : [];
    let best = null;
    for (const r of list) {
      if (r.draft || r.prerelease || !/^quicksilver-v\d/.test(r.tag_name || '')) continue;
      const version = r.tag_name.replace(/^quicksilver-v/, '');
      const asset = wants.map((re) => (r.assets || []).find((a) => re.test(a.name))).find(Boolean);
      if (!asset || cmp(version, current()) <= 0) continue;
      if (!best || cmp(version, best.version) > 0) {
        const sum = (r.assets || []).find((a) => a.name === `${asset.name}.sha256`);
        // GitHub's own SHA-256 of the file when the release has no .sha256 next to it.
        const digest = /^sha256:([0-9a-f]{64})$/i.exec(asset.digest || '')?.[1] || '';
        best = { version, notes: String(r.body || '').slice(0, 60000), url: asset.browser_download_url, size: asset.size, name: asset.name, sumUrl: sum?.browser_download_url || '', digest, web: /Web-Setup/i.test(asset.name), published: r.published_at };
      }
    }
    state.available = best;
    state.checkedAt = Date.now();
    // Already downloaded earlier (before a restart)? Then it's ready to install.
    if (best) { const f = path.join(store.dir('updates'), best.name); try { if (fs.statSync(f).size === best.size) state.downloaded = { version: best.version, file: f, web: best.web }; } catch {} }
    if (state.downloaded && (!best || state.downloaded.version !== best.version)) state.downloaded = null;
  } catch (err) { state.error = err.message; } finally { state.checking = false; changed(); }
  return publicState();
}

// Downloads the installer next to the app's data and checks it matches its published fingerprint.
let downloading = null;
function download() {
  if (downloading) return downloading;
  const u = state.available;
  if (!u) return Promise.resolve(publicState());
  downloading = (async () => {
    const dir = store.dir('updates');
    for (const f of fs.readdirSync(dir)) if (f !== u.name) fs.rmSync(path.join(dir, f), { force: true }); // old installers
    const file = path.join(dir, u.name);
    const tmp = `${file}.part`;
    state.progress = { downloaded: 0, total: u.size }; changed();
    let last = 0;
    await require('./engines').downloadTo(u.url, tmp, (d, t) => { state.progress = { downloaded: d, total: t || u.size }; if (Date.now() - last > 400) { last = Date.now(); changed(); } });
    if (u.size && fs.statSync(tmp).size !== u.size) { fs.rmSync(tmp, { force: true }); throw new Error('The update download was incomplete. It will try again later.'); }
    if (u.sumUrl || u.digest) {
      let want = u.digest.toLowerCase();
      if (u.sumUrl) {
        const sumRes = await fetch(u.sumUrl, { headers: { 'User-Agent': 'Quicksilver' } });
        if (!sumRes.ok) { fs.rmSync(tmp, { force: true }); throw new Error('The update\'s fingerprint couldn\'t be downloaded. It will try again later.'); }
        want = (await sumRes.text()).trim().split(/\s+/)[0].toLowerCase();
      }
      if (!/^[0-9a-f]{64}$/.test(want)) { fs.rmSync(tmp, { force: true }); throw new Error('The update\'s fingerprint couldn\'t be read. It will try again later.'); }
      // Hashed as a stream: an installer can be about 2 GB, too big to read into memory in one go.
      const got = await new Promise((resolve, reject) => { const h = crypto.createHash('sha256'); fs.createReadStream(tmp).on('data', (d) => h.update(d)).on('end', () => resolve(h.digest('hex'))).on('error', reject); });
      if (want !== got) { fs.rmSync(tmp, { force: true }); throw new Error('The update didn\'t match its published fingerprint, so it was deleted.'); }
    }
    fs.renameSync(tmp, file);
    state.downloaded = { version: u.version, file, web: u.web };
    state.progress = null;
    changed();
    return publicState();
  })().catch((err) => { state.progress = null; state.error = err.message; changed(); throw err; }).finally(() => { downloading = null; });
  return downloading;
}

// Runs the new installer quietly and closes Quicksilver; it opens again when it's done.
async function install({ starterDir } = {}) {
  const d = state.downloaded;
  if (!d || !fs.existsSync(d.file)) throw new Error('Download the update first.');
  if (process.platform !== 'win32') throw new Error('Updates install automatically on Windows only.');
  // Models must be closed before their files can be moved out of the app's folder.
  require('./llama').stopAll();
  await new Promise((r) => setTimeout(r, 1200));
  const models = require('./models');
  // The app-only update has no small model inside, so that one is kept outside the app's folder too.
  try { await models.keepPackModels(starterDir, { builtIn: Boolean(d.web) }); } catch {}
  // Installing replaces the app's folder. Models that could not be moved out of it first (the
  // app is on another drive and the drive with your data has no room, or no permission) would go
  // with it and have to be downloaded again, so the update waits and says what to do.
  let left = { bytes: 0 };
  try { left = models.packLeft(starterDir); } catch {}
  if (left.bytes > 500e6) {
    const gbs = Math.ceil(left.bytes / 1024 ** 3);
    throw new Error(`This update is ready, but about ${gbs} GB of Quicksilver's models are still inside the app's folder and could not be moved out of it (the drive with your data is short of room, or the folder can't be written to). Installing now would delete them. Free about ${gbs + 2} GB on the drive that holds your user folder and press Install again.`);
  }
  spawn(d.file, ['--updated', '/S', '--force-run'], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  setTimeout(() => electron?.app?.quit(), 300);
  return true;
}

// An installer that has done its job is not kept: after an update (or if the same version is
// already running) the downloaded setup file, about 2 GB, is removed.
function tidyDownloads() {
  try {
    const dir = store.dir('updates');
    for (const f of fs.readdirSync(dir)) {
      const v = (f.match(/(\d+\.\d+\.\d+)/) || [])[1];
      if (/\.part$/i.test(f) ? false : !v || cmp(v, current()) <= 0) fs.rmSync(path.join(dir, f), { force: true });
    }
  } catch { /* nothing to tidy */ }
}
function init(emitter) { emit = emitter; tidyDownloads(); }

module.exports = { init, check, download, install, tidyDownloads, state: publicState, cmp };
