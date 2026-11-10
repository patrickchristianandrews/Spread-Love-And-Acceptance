// The "Buying a new computer?" guide and upgrade prices change as new hardware comes out, so
// they're kept in a small data file in the Quicksilver repository and refreshed once a day when
// you're online. A copy is cached on this PC; offline, or if the file can't be fetched or doesn't
// look right, the built-in copy in the app is used. Only plain text is accepted from the file.
const store = require('./store');

const REPO = 'patrickchristianandrews/Spread-Love-And-Acceptance';
const URL = `https://raw.githubusercontent.com/${REPO}/main/quicksilver/data/pc-guide.json`;
const DAY = 24 * 60 * 60 * 1000;
const FILE = () => store.file('pc-guide.json');

const str = (v, max = 400) => (typeof v === 'string' ? v.slice(0, max) : '');
// Checks the file's shape and keeps only plain text fields (it is shown as text, never as HTML).
function clean(j) {
  if (!j || typeof j !== 'object' || j.version !== 1 || !Array.isArray(j.tiers) || !j.tiers.length || j.tiers.length > 8) return null;
  const tiers = j.tiers.map((t, i) => ({
    n: Number.isFinite(t?.n) ? t.n : i + 1, minVram: Number.isFinite(t?.minVram) ? t.minVram : null,
    name: str(t?.name, 60), good: str(t?.good), gpu: str(t?.gpu), ram: str(t?.ram, 60), disk: str(t?.disk, 80), cpu: str(t?.cpu, 160),
    ex: (Array.isArray(t?.ex) ? t.ex : []).map((x) => str(x, 200)).filter(Boolean).slice(0, 8),
  }));
  if (tiers.some((t) => !t.name || !t.gpu)) return null;
  const tips = (Array.isArray(j.tips) ? j.tips : []).map((t) => ({ b: str(t?.b, 120), t: str(t?.t) })).filter((t) => t.b || t.t).slice(0, 14);
  const upgrades = {};
  for (const [id, u] of Object.entries(j.upgrades && typeof j.upgrades === 'object' ? j.upgrades : {})) {
    if (/^[a-z0-9]{2,16}$/.test(id) && u && typeof u === 'object') upgrades[id] = { ...(u.name ? { name: str(u.name, 120) } : {}), ...(u.cost ? { cost: str(u.cost, 60) } : {}), ...(u.note ? { note: str(u.note) } : {}) };
  }
  return { version: 1, updated: str(j.updated, 20), tiers, tips, upgrades };
}

function cached() { return store.readJSON(FILE(), null); }

let inflight = null;
// Fetches a fresh copy when online and the cached one is older than a day (or when forced).
async function refresh(force = false) {
  const c = cached();
  if (store.config().offline) return c;
  if (!force && c?.fetchedAt && Date.now() - c.fetchedAt < DAY) return c;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(URL, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(10000) });
      if (!res.ok) return c;
      const g = clean(await res.json());
      if (!g) return c;
      const out = { ...g, fetchedAt: Date.now() };
      store.writeJSON(FILE(), out);
      return out;
    } catch { return c; } finally { inflight = null; }
  })();
  return inflight;
}

// The cached guide (or null), refreshing in the background when it's stale.
function get() { refresh().catch(() => {}); return cached(); }

// Applies updated names / prices / notes to the low-cost upgrades worked out on this PC.
function applyUpgrades(list) {
  const u = cached()?.upgrades || {};
  return list.map((x) => (u[x.id] ? { ...x, ...u[x.id] } : x));
}

function start() {
  setTimeout(() => refresh().catch(() => {}), 30 * 1000);
  setInterval(() => refresh().catch(() => {}), 6 * 60 * 60 * 1000).unref?.();
}

module.exports = { URL, clean, cached, refresh, get, applyUpgrades, start };
