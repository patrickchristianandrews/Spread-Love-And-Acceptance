// Torrent downloads (Your Crew → Downloads): magnet links and .torrent files, into a folder you
// choose. Search covers legal sources only: the Internet Archive's public-domain and openly
// licensed collections (films, music, books, software), each of which comes with its own torrent.
// The torrent engine (WebTorrent) is loaded the first time it's used, so the rest of Quicksilver
// never depends on it. Your list is kept, and unfinished downloads carry on when Quicksilver opens.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const store = require('./store');

let client = null;
let starting = null;
const meta = new Map(); // infoHash -> { source, folder, name, added, done }
const cfg = () => store.config().torrents || {};
const saveList = () => store.saveConfig({ torrents: { ...cfg(), list: [...meta.values()].map(({ source, folder, name, added, done, paused }) => ({ source, folder, name, added, done, paused })) } });

function defaultFolder() {
  const f = cfg().folder || path.join(os.homedir(), 'Downloads', 'Quicksilver');
  return f;
}
function setFolder(folder) {
  const f = path.resolve(String(folder || ''));
  fs.mkdirSync(f, { recursive: true });
  store.saveConfig({ torrents: { ...cfg(), folder: f } });
  return f;
}

async function engine() {
  if (client) return client;
  if (starting) return starting;
  starting = (async () => {
    let WebTorrent;
    try { WebTorrent = (await import('webtorrent')).default; } catch (err) { starting = null; throw new Error(`The torrent engine couldn't start on this PC (${String(err.message || err).slice(0, 160)}).`); }
    client = new WebTorrent({ maxConns: 55, utp: false });
    client.on('error', () => {});
    return client;
  })();
  return starting;
}

const isMagnet = (s) => /^magnet:\?xt=urn:bt(ih|mh):/i.test(String(s || ''));
const isTorrentUrl = (s) => /^https:\/\/\S+\.torrent(\?\S*)?$/i.test(String(s || '')) || /^https:\/\/archive\.org\/download\/[\w.-]+\/[\w.-]+_archive\.torrent$/.test(String(s || ''));

// What to add: a magnet link, a .torrent address, or a .torrent file on this PC.
async function sourceOf(input) {
  const s = String(input || '').trim();
  if (isMagnet(s)) return s;
  if (isTorrentUrl(s)) {
    if (require('./offline').isOffline()) throw new Error('Quicksilver is offline.');
    const res = await fetch(s, { headers: { 'User-Agent': 'Quicksilver' }, signal: AbortSignal.timeout(30000), redirect: 'follow' });
    if (!res.ok) throw new Error(`The .torrent file returned HTTP ${res.status}.`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 20 * 1024 * 1024 || buf[0] !== 0x64) throw new Error('That address did not give a .torrent file.');
    return buf;
  }
  if (/\.torrent$/i.test(s) && fs.existsSync(s)) return fs.readFileSync(s);
  throw new Error('Paste a magnet link, a .torrent address (https://…/x.torrent), or pick a .torrent file.');
}

async function add(input, { folder, paused = false } = {}) {
  const c = await engine();
  const src = await sourceOf(input);
  const dir = folder ? setFolder(folder) && path.resolve(folder) : defaultFolder();
  fs.mkdirSync(dir, { recursive: true });
  const existing = typeof src === 'string' ? await c.get(src) : null;
  if (existing) return existing.infoHash;
  return new Promise((resolve, reject) => {
    const t = c.add(src, { path: dir, paused }, (tor) => {
      const m = meta.get(tor.infoHash) || {};
      meta.set(tor.infoHash, { ...m, source: typeof input === 'string' && (isMagnet(input) || isTorrentUrl(input)) ? input : tor.magnetURI, folder: dir, name: tor.name, added: m.added || Date.now(), done: false, paused });
      saveList();
      resolve(tor.infoHash);
    });
    t.on('error', (err) => reject(new Error(`The torrent couldn't be added: ${err.message || err}`)));
    t.on('done', () => {
      const m = meta.get(t.infoHash); if (m) { m.done = true; saveList(); }
      if (!cfg().seed) t.pause(); // stop sharing when it's finished, unless you chose to keep sharing
    });
  });
}

function view(t) {
  const m = meta.get(t.infoHash) || {};
  return {
    id: t.infoHash, name: t.name || m.name || 'Getting details…', folder: m.folder || t.path, progress: t.progress || 0,
    size: t.length || 0, downloaded: t.downloaded || 0, speed: t.downloadSpeed || 0, upload: t.uploadSpeed || 0, peers: t.numPeers || 0,
    eta: Number.isFinite(t.timeRemaining) ? t.timeRemaining : null, done: Boolean(t.done || m.done), paused: Boolean(t.paused),
    files: (t.files || []).slice(0, 50).map((f) => ({ name: f.name, size: f.length, path: path.join(m.folder || t.path, f.path) })),
  };
}
async function list() {
  const out = client ? client.torrents.map(view) : [];
  // Saved ones not running yet (before the engine starts): listed from what was kept.
  for (const s of cfg().list || []) if (!out.some((x) => x.name === s.name && x.folder === s.folder)) out.push({ id: '', name: s.name, folder: s.folder, progress: s.done ? 1 : 0, done: s.done, paused: true, waiting: true, files: [] });
  return { folder: defaultFolder(), seed: Boolean(cfg().seed), list: out };
}
async function act(id, what) {
  const c = await engine();
  const t = await c.get(id);
  if (!t) throw new Error('That download is no longer in the list.');
  if (what === 'pause') { t.pause(); const m = meta.get(id); if (m) { m.paused = true; saveList(); } }
  else if (what === 'resume') { t.resume(); const m = meta.get(id); if (m) { m.paused = false; saveList(); } }
  else if (what === 'remove' || what === 'delete') {
    await new Promise((r) => c.remove(id, { destroyStore: what === 'delete' }, () => r()));
    meta.delete(id); saveList();
  }
  return true;
}
// Downloads that weren't finished carry on when Quicksilver opens (only if there are any).
async function resumeSaved() {
  const saved = (cfg().list || []).filter((s) => s.source && !s.done && !s.paused);
  for (const s of saved) { try { await add(s.source, { folder: s.folder }); } catch {} }
}
function stopAll() { try { client?.destroy(); } catch {} client = null; starting = null; }

// ---------- search: legal sources ----------
// The Internet Archive: public-domain and openly licensed films, music, books and software. Every
// item has a torrent of its own.
async function search(query, { kind = '' } = {}) {
  const q = String(query || '').trim();
  if (!q) throw new Error('Say what to look for.');
  if (require('./offline').isOffline()) throw new Error('Quicksilver is offline.');
  const types = { movies: 'movies', audio: 'audio', texts: 'texts', software: 'software' };
  const filter = types[kind] ? ` AND mediatype:(${types[kind]})` : ' AND mediatype:(movies OR audio OR texts OR software OR image)';
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(`(${q})${filter}`)}&fl[]=identifier&fl[]=title&fl[]=mediatype&fl[]=downloads&fl[]=item_size&fl[]=licenseurl&fl[]=year&rows=25&sort[]=downloads+desc&output=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Quicksilver' }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`The Internet Archive returned HTTP ${res.status}.`);
  const j = await res.json();
  return (j.response?.docs || []).map((d) => ({
    id: d.identifier, title: Array.isArray(d.title) ? d.title[0] : d.title || d.identifier, kind: d.mediatype, year: d.year || '', downloads: d.downloads || 0, size: d.item_size || 0,
    license: d.licenseurl ? (/publicdomain|\/zero\//i.test(d.licenseurl) ? 'Public domain' : /creativecommons/i.test(d.licenseurl) ? 'Creative Commons' : 'Licensed') : 'See the item page',
    torrent: `https://archive.org/download/${d.identifier}/${d.identifier}_archive.torrent`, page: `https://archive.org/details/${d.identifier}`, source: 'Internet Archive',
  }));
}

module.exports = { add, list, act, search, setFolder, defaultFolder, resumeSaved, stopAll, sourceOf, isMagnet, engine };
