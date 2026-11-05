// Knowledge bases: separate, isolated collections of your own data that assistants can search
// and cite. Each one can hold files, whole folders and websites (stored on this PC and searched
// with BM25), plus live databases searched fresh for every question (PubMed, arXiv).
const fs = require('node:fs');
const path = require('node:path');
const store = require('./store');
const { extract, SUPPORTED, stripHtml } = require('./docs');

const STOP = new Set('a an and are as at be by for from has have in is it its of on or that the to was were will with this these those you your we our they their i me my not but if then than so do does did can could would should what which who whom how when where why'.split(' '));
const tokenize = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w));

function chunk(text, size = 1100, overlap = 150) {
  const out = [];
  let cur = '';
  for (const p of text.split(/\n\s*\n/)) {
    if ((`${cur}\n\n${p}`).length > size && cur) { out.push(cur.trim()); cur = `${cur.slice(-overlap)}\n\n${p}`; } else cur = cur ? `${cur}\n\n${p}` : p;
    while (cur.length > size * 1.6) { out.push(cur.slice(0, size)); cur = cur.slice(size - overlap); }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// ---------- storage ----------
// { collections: [{ id, name, emoji, live: ['pubmed','arxiv'], created }], docs: [{ id, c, name, path, kind, size, added }], chunks: [{ d, n, t }] }

const FILE = () => store.file('knowledge.json');
let db = null;
function load() {
  if (db) return db;
  db = store.readJSON(FILE(), null);
  if (!db) {
    // Carry over the earlier single library, if any.
    const old = store.readJSON(store.file('library.json'), { docs: [], chunks: [] });
    db = { collections: [{ id: 'main', name: 'My files', emoji: '📁', live: [], created: Date.now() }], docs: old.docs.map((d) => ({ ...d, c: 'main' })), chunks: old.chunks };
  }
  return db;
}
const persist = () => store.writeJSON(FILE(), db);

function collections() {
  load();
  return db.collections.map((c) => ({ ...c, docs: db.docs.filter((d) => d.c === c.id).length, passages: db.chunks.filter((k) => db.docs.find((d) => d.id === k.d)?.c === c.id).length }));
}
function createCollection({ name, emoji = '📁', live = [] }) {
  load();
  const c = { id: `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: name || 'New knowledge base', emoji, live, created: Date.now() };
  db.collections.push(c);
  persist();
  return c;
}
function updateCollection(id, patch) {
  load();
  const c = db.collections.find((x) => x.id === id);
  if (!c) throw new Error('Knowledge base not found.');
  Object.assign(c, { name: patch.name ?? c.name, emoji: patch.emoji ?? c.emoji, live: patch.live ?? c.live, custom: patch.custom ?? c.custom ?? [] });
  persist();
  return c;
}
function deleteCollection(id) {
  load();
  const ids = new Set(db.docs.filter((d) => d.c === id).map((d) => d.id));
  db.docs = db.docs.filter((d) => d.c !== id);
  db.chunks = db.chunks.filter((k) => !ids.has(k.d));
  db.collections = db.collections.filter((c) => c.id !== id);
  if (!db.collections.length) db.collections.push({ id: 'main', name: 'My files', emoji: '📁', live: [], created: Date.now() });
  persist();
}
function docs(collectionId) { load(); return db.docs.filter((d) => !collectionId || d.c === collectionId).map((d) => ({ ...d, chunks: db.chunks.filter((k) => k.d === d.id).length })); }

function addText(collectionId, { name, path: p, kind, text, size }) {
  const existing = db.docs.find((d) => d.c === collectionId && d.path === p);
  if (existing) { db.chunks = db.chunks.filter((k) => k.d !== existing.id); db.docs = db.docs.filter((d) => d !== existing); }
  const id = `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  db.docs.push({ id, c: collectionId, name, path: p, kind, size: size || text.length, added: Date.now() });
  chunk(text).forEach((t, n) => db.chunks.push({ d: id, n, t }));
}
function removeDoc(id) {
  load();
  db.docs = db.docs.filter((d) => d.id !== id);
  db.chunks = db.chunks.filter((k) => k.d !== id);
  persist();
}

// ---------- adding files, folders and websites ----------

function walk(root, out = [], depth = 0) {
  if (depth > 8 || out.length > 5000) return out;
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = path.join(root, e.name);
    if (e.isDirectory()) walk(p, out, depth + 1);
    else if (SUPPORTED.test(e.name)) out.push(p);
  }
  return out;
}

async function addPaths(collectionId, paths, onProgress) {
  load();
  const files = paths.flatMap((p) => (fs.statSync(p).isDirectory() ? walk(p) : [p]));
  const errors = [];
  let added = 0;
  for (let i = 0; i < files.length; i++) {
    onProgress?.({ done: i, total: files.length, file: path.basename(files[i]) });
    try {
      const stat = fs.statSync(files[i]);
      if (stat.size > 200 * 1024 * 1024) throw new Error('over 200 MB');
      const { text, kind } = await extract(files[i]);
      addText(collectionId, { name: path.basename(files[i]), path: files[i], kind, text, size: stat.size });
      added++;
    } catch (err) { errors.push(`${path.basename(files[i])}: ${err.message}`); }
  }
  persist();
  onProgress?.({ done: files.length, total: files.length });
  return { added, errors };
}

// Saves a website: starts at the address and follows links on the same site (and under the
// same path), up to maxPages pages.
async function addWebsite(collectionId, startUrl, { maxPages = 40, onProgress, signal } = {}) {
  load();
  const start = new URL(startUrl);
  const prefix = start.pathname.replace(/[^/]*$/, '');
  const seen = new Set();
  const queue = [start.href.split('#')[0]];
  let added = 0;
  const errors = [];
  while (queue.length && added < maxPages && !signal?.aborted) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    onProgress?.({ done: added, total: maxPages, file: url });
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Quicksilver knowledge base' }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
      const type = res.headers.get('content-type') || '';
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let text;
      let title = url;
      if (/pdf/.test(type)) {
        text = (await extract('page.pdf', Buffer.from(await res.arrayBuffer()))).text;
      } else if (/html|text\/plain/.test(type)) {
        const html = await res.text();
        title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || url).trim().replace(/\s+/g, ' ');
        const main = html.match(/<(main|article)[\s\S]*?<\/\1>/i)?.[0] || html;
        text = stripHtml(main.replace(/<(nav|header|footer|aside)[\s\S]*?<\/\1>/gi, ' '));
        for (const m of html.matchAll(/href\s*=\s*["']([^"'#]+)/gi)) {
          try {
            const u = new URL(m[1], url);
            if (u.host === start.host && u.pathname.startsWith(prefix) && !/\.(png|jpe?g|gif|svg|css|js|zip|mp4|mp3|ico|woff2?)$/i.test(u.pathname) && !seen.has(u.href.split('#')[0])) queue.push(u.href.split('#')[0]);
          } catch {}
        }
      } else continue;
      if (text && text.trim().length > 200) { addText(collectionId, { name: title.slice(0, 120), path: url, kind: 'web page', text }); added++; }
    } catch (err) { errors.push(`${url}: ${err.message}`); }
  }
  persist();
  onProgress?.({ done: added, total: added });
  return { added, errors: errors.slice(0, 10) };
}

// ---------- live databases ----------

const LIVE = {
  pubmed: { name: 'PubMed (medical journals)', icon: '🩺', group: 'Medicine & health' },
  europepmc: { name: 'Europe PMC (biomedical, incl. open full text)', icon: '🧬', group: 'Medicine & health' },
  clinicaltrials: { name: 'ClinicalTrials.gov (clinical trials)', icon: '💊', group: 'Medicine & health' },
  semanticscholar: { name: 'Semantic Scholar (all research fields)', icon: '🎓', group: 'Research' },
  openalex: { name: 'OpenAlex (250M+ scholarly works)', icon: '📖', group: 'Research' },
  crossref: { name: 'Crossref (journal articles & DOIs)', icon: '📑', group: 'Research' },
  arxiv: { name: 'arXiv (science, maths, computing preprints)', icon: '🔬', group: 'Research' },
  wikipedia: { name: 'Wikipedia (general reference)', icon: '📚', group: 'General' },
};

const get = async (url, as = 'json') => {
  const res = await fetch(url, { headers: { 'User-Agent': 'Quicksilver/2 (knowledge search)', Accept: as === 'json' ? 'application/json' : '*/*' }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return as === 'json' ? res.json() : res.text();
};
const q = encodeURIComponent;

async function pubmed(query, n) {
  const base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
  const s = await get(`${base}/esearch.fcgi?db=pubmed&retmode=json&sort=relevance&retmax=${n}&term=${q(query)}`);
  const ids = s.esearchresult?.idlist || [];
  if (!ids.length) return [];
  const xml = await get(`${base}/efetch.fcgi?db=pubmed&retmode=xml&rettype=abstract&id=${ids.join(',')}`, 'text');
  return xml.split(/<PubmedArticle>/).slice(1).map((a) => {
    const pmid = a.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1];
    const title = stripHtml(a.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/)?.[1] || '');
    const journal = stripHtml(a.match(/<Title>([\s\S]*?)<\/Title>/)?.[1] || '');
    const year = a.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/)?.[1] || '';
    const abstract = [...a.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g)].map((m) => { const label = m[1].match(/Label="([^"]+)"/)?.[1]; return `${label ? `${label}: ` : ''}${stripHtml(m[2])}`; }).join('\n');
    return { title: `${title} (${journal}${year ? `, ${year}` : ''})`, url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`, text: abstract || '(No abstract available.)', db: 'PubMed' };
  });
}

async function europepmc(query, n) {
  const j = await get(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?format=json&resultType=core&pageSize=${n}&query=${q(query)}`);
  return (j.resultList?.result || []).map((r) => ({ title: `${r.title} (${r.journalInfo?.journal?.title || r.bookOrReportDetails?.publisher || 'Europe PMC'}, ${r.pubYear || ''})`, url: r.doi ? `https://doi.org/${r.doi}` : `https://europepmc.org/article/${r.source}/${r.id}`, text: stripHtml(r.abstractText || '(No abstract available.)'), db: 'Europe PMC' }));
}

async function clinicaltrials(query, n) {
  const j = await get(`https://clinicaltrials.gov/api/v2/studies?pageSize=${n}&query.term=${q(query)}`);
  return (j.studies || []).map((s) => {
    const p = s.protocolSection || {};
    const id = p.identificationModule?.nctId;
    const cond = (p.conditionsModule?.conditions || []).join(', ');
    const arms = (p.armsInterventionsModule?.interventions || []).map((x) => `${x.type}: ${x.name}`).join('; ');
    return { title: `${p.identificationModule?.briefTitle} (${id}, ${p.statusModule?.overallStatus || 'status unknown'})`, url: `https://clinicaltrials.gov/study/${id}`, text: `Conditions: ${cond}\nInterventions: ${arms}\nPhase: ${(p.designModule?.phases || []).join(', ')}\nEnrollment: ${p.designModule?.enrollmentInfo?.count ?? 'n/a'}\nSummary: ${p.descriptionModule?.briefSummary || ''}`, db: 'ClinicalTrials.gov' };
  });
}

async function semanticscholar(query, n) {
  const j = await get(`https://api.semanticscholar.org/graph/v1/paper/search?limit=${n}&fields=title,abstract,year,venue,url,citationCount,tldr&query=${q(query)}`);
  return (j.data || []).map((p) => ({ title: `${p.title} (${p.venue || 'Semantic Scholar'}, ${p.year || ''}; cited ${p.citationCount ?? 0}×)`, url: p.url, text: p.abstract || p.tldr?.text || '(No abstract available.)', db: 'Semantic Scholar' }));
}

async function openalex(query, n) {
  const j = await get(`https://api.openalex.org/works?per-page=${n}&search=${q(query)}`);
  return (j.results || []).map((w) => {
    let abstract = '';
    if (w.abstract_inverted_index) {
      const words = [];
      for (const [word, pos] of Object.entries(w.abstract_inverted_index)) for (const p of pos) words[p] = word;
      abstract = words.join(' ');
    }
    return { title: `${w.display_name} (${w.primary_location?.source?.display_name || 'OpenAlex'}, ${w.publication_year || ''}; cited ${w.cited_by_count ?? 0}×)`, url: w.doi || w.id, text: abstract || '(No abstract available.)', db: 'OpenAlex' };
  });
}

async function crossref(query, n) {
  const j = await get(`https://api.crossref.org/works?rows=${n}&select=DOI,title,abstract,container-title,issued&query=${q(query)}`);
  return (j.message?.items || []).map((w) => ({ title: `${(w.title || ['Untitled'])[0]} (${(w['container-title'] || [''])[0]}, ${w.issued?.['date-parts']?.[0]?.[0] || ''})`, url: `https://doi.org/${w.DOI}`, text: stripHtml(w.abstract || '(No abstract in Crossref; open the link for the full article.)'), db: 'Crossref' }));
}

async function arxiv(query, n) {
  const xml = await get(`https://export.arxiv.org/api/query?max_results=${n}&search_query=${q(`all:${query}`)}`, 'text');
  return xml.split('<entry>').slice(1).map((e) => ({
    title: `${stripHtml(e.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').replace(/\s+/g, ' ')} (arXiv, ${e.match(/<published>(\d{4})/)?.[1] || ''})`,
    url: e.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim(),
    text: stripHtml(e.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] || '').replace(/\s+/g, ' '),
    db: 'arXiv',
  }));
}

async function wikipedia(query, n) {
  const s = await get(`https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=${Math.min(n, 5)}&srsearch=${q(query)}`);
  const ids = (s.query?.search || []).map((x) => x.pageid);
  if (!ids.length) return [];
  const e = await get(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts|info&inprop=url&explaintext=1&exintro=0&exchars=6000&format=json&pageids=${ids.join('|')}`);
  return ids.map((id) => e.query.pages[id]).filter(Boolean).map((p) => ({ title: `${p.title} (Wikipedia)`, url: p.fullurl, text: p.extract || '', db: 'Wikipedia' }));
}

// Your own search sources: any site's search page, with {query} in the address.
async function customSearch(src, query) {
  const url = src.url.replace('{query}', q(query));
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Quicksilver' }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get('content-type') || '';
  if (/json/.test(type)) {
    const j = await res.json();
    const list = Array.isArray(j) ? j : j.results || j.items || j.data || j.hits || [];
    return list.slice(0, 5).map((r) => ({ title: `${r.title || r.name || 'Result'} (${src.name})`, url: r.url || r.link || url, text: stripHtml(String(r.abstract || r.summary || r.snippet || r.description || r.content || r.text || JSON.stringify(r)).slice(0, 4000)), db: src.name }));
  }
  const text = stripHtml(await res.text());
  return [{ title: `${src.name}: results for "${query}"`, url, text: text.slice(0, 8000), db: src.name }];
}

const FETCHERS = { pubmed, europepmc, clinicaltrials, semanticscholar, openalex, crossref, arxiv, wikipedia };

// ---------- search ----------

function bm25(query, chunkFilter, k) {
  const q = [...new Set(tokenize(query))];
  const pool = db.chunks.filter(chunkFilter);
  if (!q.length || !pool.length) return [];
  const toks = pool.map((c) => tokenize(c.t));
  const N = pool.length;
  const avg = toks.reduce((a, t) => a + t.length, 0) / N;
  const df = new Map(q.map((w) => [w, 0]));
  toks.forEach((t) => { const s = new Set(t); for (const w of q) if (s.has(w)) df.set(w, df.get(w) + 1); });
  const scored = toks.map((t, i) => {
    const tf = new Map();
    for (const w of t) if (df.has(w)) tf.set(w, (tf.get(w) || 0) + 1);
    let score = 0;
    for (const w of q) {
      const f = tf.get(w) || 0;
      if (!f) continue;
      const idf = Math.log(1 + (N - df.get(w) + 0.5) / (df.get(w) + 0.5));
      score += idf * ((f * 2.3) / (f + 1.3 * (0.25 + (0.75 * t.length) / avg)));
    }
    return { c: pool[i], score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  const per = new Map();
  const out = [];
  for (const { c, score } of scored) {
    if ((per.get(c.d) || 0) >= 2) continue;
    per.set(c.d, (per.get(c.d) || 0) + 1);
    const doc = db.docs.find((d) => d.id === c.d);
    out.push({ title: doc?.name || 'Document', path: doc?.path, url: /^https?:/.test(doc?.path || '') ? doc.path : undefined, text: c.t, score, collection: doc?.c });
    if (out.length >= k) break;
  }
  return out;
}

// Searches the given knowledge bases (all when none given): stored data plus every live source.
async function search(query, { k = 8, collectionIds, perSource = 3 } = {}) {
  load();
  const ids = collectionIds?.length ? new Set(collectionIds) : new Set(db.collections.map((c) => c.id));
  const cols = db.collections.filter((c) => ids.has(c.id));
  const docIds = new Set(db.docs.filter((d) => ids.has(d.c)).map((d) => d.id));
  const local = bm25(query, (c) => docIds.has(c.d), k);
  const live = new Set(cols.flatMap((c) => c.live || []));
  const custom = cols.flatMap((c) => c.custom || []);
  const remote = [];
  const failures = [];
  await Promise.all([
    ...[...live].filter((n) => FETCHERS[n]).map(async (n) => { try { remote.push(...(await FETCHERS[n](query, perSource))); } catch (err) { failures.push(`${LIVE[n].name}: ${err.message}`); } }),
    ...custom.map(async (src) => { try { remote.push(...(await customSearch(src, query))); } catch (err) { failures.push(`${src.name}: ${err.message}`); } }),
  ]);
  // Rank live results by how well they match the question, then interleave with your files.
  const qt = new Set(tokenize(query));
  const rel = (r) => tokenize(`${r.title} ${r.text}`).filter((w) => qt.has(w)).length / Math.sqrt(1 + tokenize(r.text).length / 50);
  remote.sort((a, b) => rel(b) - rel(a));
  const out = [];
  for (let i = 0; out.length < k && (i < local.length || i < remote.length); i++) {
    if (local[i]) out.push(local[i]);
    if (remote[i] && out.length < k) out.push(remote[i]);
  }
  if (failures.length) out.failures = failures;
  return out;
}

function addTexts(collectionId, items) {
  load();
  for (const it of items) addText(collectionId, it);
  persist();
  return { added: items.length, errors: [] };
}

module.exports = { addTexts, collections, createCollection, updateCollection, deleteCollection, docs, addPaths, addWebsite, removeDoc, search, LIVE, FETCHERS };
