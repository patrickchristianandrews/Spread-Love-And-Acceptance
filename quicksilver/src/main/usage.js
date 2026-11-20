// Usage: what did the work (the models on this PC, cloud AIs, the web), how long it took, and how
// that compares with what this PC was expected to manage. Shown under Settings → Usage.
// Kept only on this PC, in usage.json. It holds counts and timings per day and per model: never
// the words of a question or an answer, and nothing is sent anywhere.
const store = require('./store');

const FILE = () => store.file('usage.json');
const KEEP_DAYS = 400;
const WORDS_PER_TOKEN = 0.75; // the same rule of thumb the speed estimates use
const MIN_TOKENS = 12; // very short answers time poorly (as in speeds.js)

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const blank = () => ({ n: 0, ms: 0, tok: 0, gen: 0, wait: 0, waitN: 0, exp: 0, expGen: 0 });
const num = (v) => (Number.isFinite(v) && v > 0 ? v : 0);

function load() {
  const d = store.readJSON(FILE(), null);
  return d && d.v === 1 && d.days && d.names ? d : { v: 1, since: Date.now(), names: {}, days: {} };
}
const enabled = () => store.config().usageStats !== false;
function setEnabled(on) { store.saveConfig({ usageStats: Boolean(on) }); return enabled(); }
function clear() { store.writeJSON(FILE(), { v: 1, since: Date.now(), names: {}, days: {} }); return true; }

// One piece of work that finished.
//   source: 'local' (a model on this PC), 'cloud' (a cloud AI) or 'web' (a web search)
//   kind:   'text', 'image', 'video', 'audio' or 'search'
//   ms:     how long it took from start to finish
//   tokens, tps: what was written and how fast (text only)
//   waitMs: how long before the first word appeared (loading the model, reading the question)
//   expTps: the speed this PC was expected to manage for this model (its estimate), when known
function record(ev, at = Date.now()) {
  try {
    if (!enabled() || !ev || !['local', 'cloud', 'web'].includes(ev.source) || !ev.key) return false;
    const d = load();
    const day = dayKey(at);
    const b = ((d.days[day] ||= {})[ev.key] ||= blank());
    d.names[ev.key] = { name: String(ev.name || ev.key).slice(0, 120), source: ev.source, kind: ev.kind || 'text' };
    const tokens = num(ev.tokens);
    const gen = tokens && num(ev.tps) ? (tokens / ev.tps) * 1000 : 0;
    b.n += 1;
    b.ms += num(ev.ms);
    b.tok += tokens;
    b.gen += gen;
    if (num(ev.waitMs)) { b.wait += ev.waitMs; b.waitN += 1; }
    if (gen && num(ev.expTps) && tokens >= MIN_TOKENS) { b.exp += (tokens / ev.expTps) * 1000; b.expGen += gen; }
    const days = Object.keys(d.days).sort();
    for (const old of days.slice(0, Math.max(0, days.length - KEEP_DAYS))) delete d.days[old];
    store.writeJSON(FILE(), d);
    return true;
  } catch { return false; } // statistics must never get in the way of an answer
}

// One question answered in a chat, start to finish: everything the answer needed (searching the
// web, every model that took part, checking) is inside this one time.
function recordChat(ms, at = Date.now()) {
  try {
    if (!enabled() || !num(ms)) return false;
    const d = load();
    const b = ((d.days[dayKey(at)] ||= {})['#chat'] ||= blank());
    d.names['#chat'] = { name: 'Questions answered', source: 'chat', kind: 'chat' };
    b.n += 1; b.ms += ms;
    store.writeJSON(FILE(), d);
    return true;
  } catch { return false; }
}

// Times a stream of chat events (text, reasoning, stats…) and records it when it finishes with
// its stats. A stream that was stopped or failed before its stats is not counted.
async function* metered(info, gen) {
  const t0 = Date.now();
  let first = 0;
  for await (const ev of gen) {
    if (!first && (ev.type === 'text' || ev.type === 'reasoning') && ev.text) first = Date.now();
    if (ev.type === 'stats') {
      let extra = {};
      try { extra = (await info.onStats?.(ev)) || {}; } catch {}
      record({ ...info, ...extra, ms: Date.now() - t0, tokens: ev.tokens, tps: ev.tps, waitMs: first ? first - t0 : 0 });
    }
    yield ev;
  }
}

const add = (a, b) => { for (const k of Object.keys(a)) a[k] += b[k] || 0; return a; };
const wps = (b) => (b.gen > 0 ? (b.tok * WORDS_PER_TOKEN) / (b.gen / 1000) : 0);
const pct = (parts) => {
  const total = Object.values(parts).reduce((s, v) => s + v, 0);
  return Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, total ? (v / total) * 100 : 0]));
};

// Everything the Usage page shows, for the last `days` days (0 = all of it).
function summary(days = 30, now = Date.now()) {
  const d = load();
  days = Math.max(0, Math.round(Number(days) || 0));
  const all = Object.keys(d.days).sort();
  // Calendar days, not 24-hour steps: a day is 23 or 25 hours long when the clocks change.
  const back = (n) => { const t = new Date(now); return dayKey(new Date(t.getFullYear(), t.getMonth(), t.getDate() - n, 12).getTime()); };
  const firstDay = days ? back(days - 1) : all[0] || dayKey(now);
  const inRange = all.filter((k) => k >= firstDay && k <= dayKey(now));

  const totals = { local: blank(), cloud: blank(), web: blank() };
  const chats = blank();
  const made = { image: 0, video: 0, audio: 0 };
  const perModel = {};
  const byDay = {};
  for (const day of inRange) {
    const row = (byDay[day] = { day, local: 0, cloud: 0, web: 0, n: 0, q: 0 });
    for (const [key, b] of Object.entries(d.days[day])) {
      const meta = d.names[key] || { name: key, source: 'local', kind: 'text' };
      if (meta.source === 'chat') { add(chats, b); row.q += b.n; continue; }
      add(totals[meta.source], b);
      add((perModel[key] ||= blank()), b);
      row[meta.source] += b.ms;
      row.n += b.n;
      if (made[meta.kind] != null) made[meta.kind] += b.n;
    }
  }
  // Every day in the range, including the ones with nothing, so the chart keeps its spacing.
  const daily = [];
  const [fy, fm, fd] = firstDay.split('-').map(Number);
  for (let i = 0; ; i++) {
    const day = dayKey(new Date(fy, fm - 1, fd + i, 12).getTime());
    if (day > dayKey(now)) break;
    daily.push(byDay[day] || { day, local: 0, cloud: 0, web: 0, n: 0, q: 0 });
  }

  const models = Object.entries(perModel).map(([key, b]) => {
    const meta = d.names[key] || { name: key, source: 'local', kind: 'text' };
    return {
      key, name: meta.name, source: meta.source, kind: meta.kind, n: b.n, ms: b.ms, words: Math.round(b.tok * WORDS_PER_TOKEN),
      wps: wps(b), expectedWps: b.exp > 0 ? wps(b) * (b.expGen / b.exp) : 0, vsExpected: b.exp > 0 ? b.expGen / b.exp : 0,
      waitMs: b.waitN ? b.wait / b.waitN : 0,
    };
  }).sort((a, b) => b.ms - a.ms);

  const L = totals.local; const C = totals.cloud; const W = totals.web;
  const words = { local: Math.round(L.tok * WORDS_PER_TOKEN), cloud: Math.round(C.tok * WORDS_PER_TOKEN) };
  const speed = { local: wps(L), cloud: wps(C) };
  // The same words at the other one's measured speed: what the choice between them costs in time.
  const swap = speed.local && speed.cloud ? {
    localWritingMs: L.gen, localAtCloudSpeedMs: (words.local / speed.cloud) * 1000,
    cloudWritingMs: C.gen, cloudAtLocalSpeedMs: (words.cloud / speed.local) * 1000,
  } : null;

  return {
    enabled: enabled(), since: d.since, days, from: firstDay, activeDays: inRange.length,
    totals: { local: L, cloud: C, web: W },
    // questions: whole questions answered in chats; runs: every time a model wrote something (one
    // question can take several runs when a team of models answers it).
    questions: chats.n, questionMs: chats.ms, avgQuestionMs: chats.n ? chats.ms / chats.n : 0,
    runs: models.filter((m) => m.kind === 'text').reduce((s, m) => s + m.n, 0),
    searches: W.n, made,
    ms: L.ms + C.ms + W.ms,
    words,
    share: { requests: pct({ local: L.n, cloud: C.n, web: W.n }), time: pct({ local: L.ms, cloud: C.ms, web: W.ms }), words: pct(words) },
    speed,
    wait: { local: L.waitN ? L.wait / L.waitN : 0, cloud: C.waitN ? C.wait / C.waitN : 0 },
    // Models on this PC: the time their writing took, against the time this PC's estimate said it
    // should take for the same words. ratio above 1 = slower than expected.
    expected: L.exp > 0 ? { actualMs: L.expGen, expectedMs: L.exp, ratio: L.expGen / L.exp } : null,
    swap, models, daily,
  };
}

module.exports = { record, recordChat, metered, summary, clear, enabled, setEnabled, dayKey };
