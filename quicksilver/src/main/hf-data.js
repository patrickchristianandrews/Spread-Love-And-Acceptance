// Hugging Face datasets as knowledge, and the Spaces people are using right now.
// A dataset is searched by name, shown with its licence and size, and only then (when you say so)
// its text and tables are downloaded into a knowledge base. After that it is on this PC and
// nothing more is sent. Pictures, sound and video inside a dataset are skipped: a knowledge base
// is searched as text. Nothing here ever downloads by itself.
'use strict';
const store = require('./store');

const HF = 'https://huggingface.co';
const MAX_BYTES = 12 * 1024 * 1024;   // of text kept from one dataset
const MAX_ROWS = 20000;
const MAX_FILE = 200 * 1024 * 1024;   // a single file bigger than this is not fetched
const READABLE = /\.(csv|tsv|jsonl|ndjson|json|txt|md|parquet)$/i;

function headers() {
  const t = store.getSecret('huggingface');
  return { 'User-Agent': 'Quicksilver', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}
async function hf(url, { json = true, timeout = 30000 } = {}) {
  if (store.config().offline) throw new Error('Quicksilver is in offline mode. Switch it off in Settings to reach Hugging Face.');
  const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(timeout) });
  if (res.status === 401 || res.status === 403) throw new Error('This one is gated: accept its terms on huggingface.co first, then add a Hugging Face token in Settings → Accounts.');
  if (res.status === 404) throw new Error('That was not found on Hugging Face.');
  if (!res.ok) throw new Error(`Hugging Face returned HTTP ${res.status}.`);
  return json ? res.json() : res;
}
const cleanId = (id) => {
  const s = String(id || '').trim().replace(/^https?:\/\/huggingface\.co\/datasets\//i, '').replace(/\/+$/, '');
  if (!/^[\w.-]+(\/[\w.-]+)?$/.test(s)) throw new Error('Enter the dataset as owner/name.');
  return s;
};
const tagOf = (tags, key) => (tags || []).filter((t) => t.startsWith(`${key}:`)).map((t) => t.slice(key.length + 1));
// "10K<n<100K" → "10K to 100K rows"
const rowsLabel = (s) => (s ? String(s).replace(/^n<(.+)$/, 'under $1 rows').replace(/^(.+)<n<(.+)$/, '$1 to $2 rows').replace(/^n>(.+)$/, 'over $1 rows') : '');
const short = (s, n = 220) => { const t = String(s || '').replace(/\s+/g, ' ').replace(/See the full description on the dataset page:.*$/, '').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };

function summary(m) {
  const tags = m.tags || [];
  const kinds = tagOf(tags, 'modality');
  return {
    id: m.id, likes: m.likes || 0, downloads: m.downloads || 0, updated: m.lastModified || '', gated: Boolean(m.gated),
    licence: tagOf(tags, 'license')[0] || '', rows: rowsLabel(tagOf(tags, 'size_categories')[0]), kinds,
    // Readable as knowledge when it holds text or tables (or does not say what it holds).
    readable: !kinds.length || kinds.some((k) => k === 'text' || k === 'tabular'),
    about: short(m.description),
  };
}

async function searchDatasets(query) {
  const q = String(query || '').trim();
  const url = q ? `${HF}/api/datasets?search=${encodeURIComponent(q)}&sort=downloads&direction=-1&limit=30` : `${HF}/api/datasets?sort=trendingScore&direction=-1&limit=30`;
  const list = await hf(url);
  return list.filter((m) => m.id && !m.disabled && !m.private).map(summary).filter((m) => m.readable).slice(0, 20);
}

// What would be downloaded: the dataset's text and table files, biggest split first.
async function datasetInfo(id) {
  id = cleanId(id);
  const [meta, tree] = await Promise.all([hf(`${HF}/api/datasets/${id}`), hf(`${HF}/api/datasets/${id}/tree/main?recursive=true`).catch(() => [])]);
  let files = tree.filter((f) => f.type === 'file' && READABLE.test(f.path) && !/(^|\/)(README|LICENSE|CHANGELOG)[^/]*$/i.test(f.path) && !/(^|\/)\./.test(f.path))
    .map((f) => ({ path: f.path, size: f.lfs?.size || f.size || 0, url: `${HF}/datasets/${id}/resolve/main/${f.path.split('/').map(encodeURIComponent).join('/')}` }));
  // No plain files (a loading script, or pictures with captions): use Hugging Face's own table copy.
  if (!files.length) {
    const pq = await hf(`${HF}/api/datasets/${id}/parquet`).catch(() => null);
    for (const [config, splits] of Object.entries(pq || {})) for (const [split, urls] of Object.entries(splits || {})) for (const [i, url] of (urls || []).entries()) files.push({ path: `${config}/${split}/${i}.parquet`, size: 0, url });
  }
  // The training split is the main body of a dataset; tests and validation are small copies of it.
  const rank = (p) => (/train/i.test(p) ? 0 : /valid|dev/i.test(p) ? 2 : /test/i.test(p) ? 3 : 1);
  files.sort((a, b) => rank(a.path) - rank(b.path) || a.path.localeCompare(b.path));
  const s = summary({ ...meta, id });
  const card = meta.cardData || {};
  return { ...s, licence: s.licence || String(card.license || ''), name: card.pretty_name || id.split('/').pop(), files, totalBytes: files.reduce((n, f) => n + f.size, 0), limitMB: MAX_BYTES / 1024 / 1024, limitRows: MAX_ROWS };
}

// One row of a table as readable lines ("question: …"). Pictures, sound and long number lists are left out.
function rowText(row) {
  if (row == null) return '';
  if (typeof row !== 'object') return String(row).trim();
  const out = [];
  const put = (k, v, depth) => {
    if (v == null || v === '') return;
    if (typeof v === 'bigint') v = v.toString();
    if (typeof v === 'string') { const t = v.trim(); if (t) out.push(k ? `${k}: ${t}` : t); return; }
    if (typeof v === 'number' || typeof v === 'boolean') { out.push(`${k}: ${v}`); return; }
    if (v instanceof Date) { out.push(`${k}: ${v.toISOString().slice(0, 10)}`); return; }
    if (ArrayBuffer.isView(v) || v instanceof ArrayBuffer) return;        // a picture or a sound
    if (Array.isArray(v)) {
      if (!v.length || depth > 2) return;
      if (v.every((x) => typeof x === 'number' || typeof x === 'bigint')) { if (v.length <= 12) out.push(`${k}: ${v.join(', ')}`); return; }   // an embedding is not text
      if (v.every((x) => typeof x === 'string')) { out.push(`${k}: ${v.map((x) => x.trim()).filter(Boolean).join(v.some((x) => x.length > 60) ? '\n' : ', ')}`); return; }
      v.slice(0, 50).forEach((x, i) => put(`${k} ${i + 1}`, x, depth + 1));
      return;
    }
    if (typeof v === 'object') { if (depth > 2 || 'bytes' in v) return; for (const [kk, vv] of Object.entries(v)) put(k ? `${k} ${kk}` : kk, vv, depth + 1); }
  };
  for (const [k, v] of Object.entries(row)) put(k, v, 0);
  return out.join('\n');
}

// A small CSV reader: quoted fields, doubled quotes, line breaks inside quotes.
function parseCSV(text, sep = ',') {
  const rows = []; let row = []; let cur = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; continue; }
    if (ch === '"' && cur === '') q = true;
    else if (ch === sep) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = []; }
    else cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  if (rows.length < 2) return rows.map((r) => ({ text: r.join(' ') }));
  const head = rows[0].map((h, i) => h.trim() || `column ${i + 1}`);
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

// The rows of one file. Text files come back as one "row" of plain text.
async function rowsOf(file, buf, left) {
  const ext = file.path.split('.').pop().toLowerCase();
  if (ext === 'parquet') {
    const { parquetReadObjects } = await import('hyparquet');
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    return parquetReadObjects({ file: ab, rowStart: 0, rowEnd: left });
  }
  const text = buf.toString('utf8');
  if (ext === 'txt' || ext === 'md') return [text];
  if (ext === 'csv' || ext === 'tsv') return parseCSV(text, ext === 'tsv' ? '\t' : ',');
  if (ext === 'jsonl' || ext === 'ndjson') return text.split('\n').filter((l) => l.trim()).slice(0, left).map((l) => { try { return JSON.parse(l); } catch { return l; } });
  const j = JSON.parse(text);
  if (Array.isArray(j)) return j;
  // { data: [...] } and the like: the first list inside is the table.
  const list = Object.values(j).find((v) => Array.isArray(v) && v.length && typeof v[0] === 'object');
  return list || [j];
}

// Download a dataset's text into a knowledge base. Stops at the row and size limits and says so.
async function addDataset(knowledge, collectionId, id, { onProgress } = {}) {
  const info = await datasetInfo(id);
  if (!info.files.length) throw new Error('This dataset has no text or table files Quicksilver can read (it may be pictures, sound or video only).');
  const items = []; const errors = [];
  let rows = 0; let bytes = 0; let cut = false; let n = 0;
  for (const f of info.files) {
    if (rows >= MAX_ROWS || bytes >= MAX_BYTES) { cut = true; break; }
    onProgress?.({ done: n++, total: info.files.length, name: f.path });
    if (f.size > MAX_FILE) { errors.push(`${f.path} (over 200 MB)`); continue; }
    try {
      const res = await hf(f.url, { json: false, timeout: 10 * 60 * 1000 });
      if (Number(res.headers.get('content-length') || 0) > MAX_FILE) { errors.push(`${f.path} (over 200 MB)`); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      const list = await rowsOf(f, buf, MAX_ROWS - rows);
      const parts = [];
      let size = 0;
      for (const r of list) {
        if (rows >= MAX_ROWS || bytes + size >= MAX_BYTES) { cut = true; break; }
        const t = rowText(r);
        if (!t) continue;
        parts.push(t); size += t.length + 2; rows++;
      }
      if (!parts.length) continue;
      bytes += size;
      // A few hundred rows to a document, so a source shown under an answer points near the row.
      const per = 250;
      for (let i = 0; i < parts.length; i += per) {
        const piece = parts.slice(i, i + per).join('\n\n');
        const tag = parts.length > per ? ` (rows ${i + 1} to ${Math.min(parts.length, i + per)})` : '';
        items.push({ name: `${info.id}: ${f.path}${tag}`, path: `${HF}/datasets/${info.id}#${f.path}${tag}`, kind: 'dataset', text: piece, size: piece.length });
      }
    } catch (err) { errors.push(`${f.path} (${String(err.message || err).slice(0, 80)})`); }
  }
  if (!items.length) throw new Error(errors.length ? `Nothing could be read: ${errors.slice(0, 2).join('; ')}` : 'This dataset has no readable text in it.');
  knowledge.addTexts(collectionId, items);
  return { added: items.length, rows, bytes, cut, errors, licence: info.licence, id: info.id };
}

// The Spaces (small apps hosted on Hugging Face) people are using most right now. They run on
// Hugging Face's computers, in the browser, so they work whatever this PC is.
const SPACES_TTL = 4 * 3600 * 1000;
async function trendingSpaces({ force = false } = {}) {
  const c = store.config().trendingSpaces;
  if (!force && c?.list && Date.now() - (c.at || 0) < SPACES_TTL) return c.list;
  try {
    const raw = await hf(`${HF}/api/spaces?sort=trendingScore&direction=-1&limit=24`);
    const list = raw.filter((s) => s.id && !s.private).map((s) => ({ id: s.id, likes: s.likes || 0, created: s.createdAt || '', sdk: s.sdk || '' })).slice(0, 16);
    store.saveConfig({ trendingSpaces: { at: Date.now(), list } });
    return list;
  } catch { return c?.list || []; }
}

module.exports = { searchDatasets, datasetInfo, addDataset, trendingSpaces, rowText, parseCSV, rowsOf, cleanId, MAX_ROWS, MAX_BYTES };
