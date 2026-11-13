// User-submitted stacks, read from the Quicksilver repository once a day (see shared/community.js).
// Offline, or if the list can't be fetched, the last good copy is used.
const store = require('./store');
const catalog = require('../shared/catalog');
const providers = require('./providers');
const { cleanList } = require('../shared/community');

const REPO = 'patrickchristianandrews/Spread-Love-And-Acceptance';
const URL = `https://raw.githubusercontent.com/${REPO}/main/quicksilver/data/community.json`;
const DAY = 24 * 60 * 60 * 1000;
const FILE = () => store.file('community.json');
const known = () => ({ models: new Set(catalog.TEXT_MODELS.map((m) => m.id)), presets: new Set(Object.keys(providers.PRESETS)) });

function list() {
  const c = store.readJSON(FILE(), null);
  return { stacks: c?.stacks || [], fetchedAt: c?.fetchedAt || 0 };
}
let inflight = null;
async function refresh(force = false) {
  const c = store.readJSON(FILE(), null);
  if (store.config().offline) return list();
  if (!force && c?.fetchedAt && Date.now() - c.fetchedAt < DAY) return list();
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(process.env.QS_COMMUNITY_URL || URL, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(10000) });
      if (!res.ok) return list();
      const data = cleanList(await res.json(), known());
      if (data) store.writeJSON(FILE(), { ...data, fetchedAt: Date.now() });
      return list();
    } catch { return list(); } finally { inflight = null; }
  })();
  return inflight;
}
module.exports = { list, refresh, known, URL };
