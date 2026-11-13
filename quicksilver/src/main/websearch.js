// Web search for up-to-date answers. Uses the service you choose in Settings:
// Free (no key: DuckDuckGo, with Mojeek as a fallback), Brave Search or Tavily (free tiers with a
// key), or your own SearXNG server.
// The top pages are opened and their text is passed to the model as numbered sources.
const store = require('./store');
const { stripHtml } = require('./docs');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const decode = (s) => stripHtml(String(s || '')).replace(/\s+/g, ' ').trim();

// ---------- Safe search (Settings → Web search) ----------
// A pass-through of each search service's own documented parameter: nothing here filters results
// by itself. The value comes with every request from the app (validated against SAFE_VALUES) and
// getSafeSearchParam is the one place it's turned into a provider's parameter.
const SAFE_VALUES = ['on', 'off'];
function checkSafe(v) {
  if (!SAFE_VALUES.includes(v)) throw new Error(`Safe search must be "on" or "off" (got ${JSON.stringify(v)}).`);
  return v;
}
// The parameter each service documents, or null where it has none.
//   Brave Search API: safesearch=off|moderate|strict   DuckDuckGo HTML: kp=-2 (off) | kp=1 (strict)
//   SearXNG: safesearch=0|1|2                          Tavily: safe_search=false|true (JSON body)
//   Mojeek: safe=0|1                                   Wikipedia search API: none
function getSafeSearchParam(provider, safe) {
  const on = checkSafe(safe) === 'on';
  switch (provider) {
    case 'brave': return { param: 'safesearch', value: on ? 'strict' : 'off', where: 'query' };
    case 'duckduckgo': return { param: 'kp', value: on ? '1' : '-2', where: 'form' };
    case 'searxng': return { param: 'safesearch', value: on ? '2' : '0', where: 'query' };
    case 'tavily': return { param: 'safe_search', value: on, where: 'json' };
    case 'mojeek': return { param: 'safe', value: on ? '1' : '0', where: 'query' };
    case 'wikipedia': return null;
    default: throw new Error(`Unknown search service: ${provider}`);
  }
}
// Every outbound search request, with keys left out, for the log and the debug line.
const redact = (u) => String(u).replace(/([?&](?:key|api_key|apikey|token)=)[^&]+/gi, '$1***');
function logRequest(meta, engine, method, url, body) {
  const line = `${method} ${redact(url)}${body ? ` ${typeof body === 'string' ? body : JSON.stringify({ ...body, api_key: body.api_key ? '***' : undefined })}` : ''}`;
  meta?.requests.push({ engine, request: line });
  console.log(`[web search] ${engine}: ${line}`);
}

// DuckDuckGo's plain HTML page: no key, no account.
async function duckduckgo(query, safe = 'on', meta = null) {
  const sp = getSafeSearchParam('duckduckgo', safe);
  const body = `q=${encodeURIComponent(query)}&kl=wt-wt&${sp.param}=${sp.value}`;
  logRequest(meta, 'DuckDuckGo', 'POST', 'https://html.duckduckgo.com/html/', body);
  const res = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'text/html' },
    body, signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`DuckDuckGo returned HTTP ${res.status}`);
  const html = await res.text();
  const out = [];
  // Attribute order varies, so find each result link, then its href and the snippet that follows it.
  const links = [...html.matchAll(/<a\b([^>]*\bclass="[^"]*\bresult__a\b[^"]*"[^>]*)>([\s\S]*?)<\/a>/g)];
  links.forEach((m, i) => {
    if (out.length >= 8) return;
    let url = (m[1].match(/\bhref="([^"]+)"/) || [])[1]?.replace(/&amp;/g, '&') || '';
    const u = url.match(/[?&]uddg=([^&]+)/);
    if (u) url = decodeURIComponent(u[1]);
    if (url.startsWith('//')) url = `https:${url}`;
    if (!/^https?:\/\//.test(url) || /duckduckgo\.com\/y\.js|ad_domain|ad_provider/.test(url)) return; // skip ads
    const rest = html.slice(m.index + m[0].length, links[i + 1]?.index ?? html.length);
    const snip = rest.match(/<(?:a|div)\b[^>]*\bclass="[^"]*\bresult__snippet\b[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div)>/);
    out.push({ title: decode(m[2]), url, snippet: decode(snip?.[1]) });
  });
  if (!out.length && /anomaly|captcha|unusual traffic/i.test(html)) throw new Error('DuckDuckGo asked for a check');
  return out;
}

// Mojeek: an independent search engine with its own index, also no key.
async function mojeek(query, safe = 'on', meta = null) {
  const sp = getSafeSearchParam('mojeek', safe);
  const url = `https://www.mojeek.com/search?q=${encodeURIComponent(query)}&${sp.param}=${sp.value}`;
  logRequest(meta, 'Mojeek', 'GET', url);
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Mojeek returned HTTP ${res.status}`);
  const html = await res.text();
  const out = [];
  const links = [...html.matchAll(/<a\b([^>]*\bclass="title"[^>]*)>([\s\S]*?)<\/a>/g)];
  links.forEach((m, i) => {
    if (out.length >= 8) return;
    const url = ((m[1].match(/\bhref="([^"]+)"/) || [])[1] || '').replace(/&amp;/g, '&');
    if (!/^https?:\/\//.test(url)) return;
    const rest = html.slice(m.index + m[0].length, links[i + 1]?.index ?? html.length);
    out.push({ title: decode(m[2]), url, snippet: decode((rest.match(/<p\b[^>]*class="s"[^>]*>([\s\S]*?)<\/p>/) || [])[1]) });
  });
  return out;
}

// Wikipedia's own search API: works even where search engines block automated requests.
async function wikipedia(query, safe = 'on', meta = null) {
  getSafeSearchParam('wikipedia', safe); // (validated; Wikipedia's search has no safe-search parameter)
  logRequest(meta, 'Wikipedia', 'GET', `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=5&srsearch=${encodeURIComponent(query)}`);
  const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=5&srsearch=${encodeURIComponent(query)}`, { headers: { 'User-Agent': 'Quicksilver/2 (local AI app)', Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Wikipedia returned HTTP ${res.status}`);
  const j = await res.json();
  return (j.query?.search || []).map((r) => ({ title: r.title, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, '_'))}`, snippet: decode(r.snippet) }));
}

// Merges several engines' result lists: the same page (http/https, www, trailing slash and tracking
// bits ignored) is counted once, scored by how high each engine ranked it, with a bonus for each
// extra engine that found it.
const urlKey = (u) => { try { const x = new URL(u); [...x.searchParams.keys()].filter((k) => /^(utm_|ref$|fbclid|gclid)/.test(k)).forEach((k) => x.searchParams.delete(k)); return `${x.hostname.replace(/^www\./, '')}${x.pathname.replace(/\/+$/, '')}${x.search}`.toLowerCase(); } catch { return String(u); } };
function mergeResults(lists) {
  const byKey = new Map();
  for (const { engine, list } of lists) {
    (list || []).forEach((r, rank) => {
      const k = urlKey(r.url);
      const had = byKey.get(k);
      const add = 1 / (rank + 1.5);
      if (had) { had.score += add + 0.6; had.engines.push(engine); if ((r.snippet || '').length > (had.snippet || '').length) had.snippet = r.snippet; } else byKey.set(k, { ...r, score: add, engines: [engine] });
    });
  }
  return [...byKey.values()].sort((a, b) => b.score - a.score).slice(0, 10);
}

async function search(query, { pages = 3, safe } = {}) {
  checkSafe(safe);
  const cfg = store.config().web;
  const meta = { provider: cfg.provider, safe, params: [], requests: [], warnings: [] };
  let results = [];
  if (cfg.provider === 'free') {
    // Meta-search, like SearXNG: every free engine is asked at once and the answers are merged. A page
    // several engines rank high comes first; one engine being slow or blocked doesn't matter.
    const errors = [];
    for (const e of ['duckduckgo', 'mojeek']) { const sp = getSafeSearchParam(e, safe); meta.params.push(`${e}: ${sp.param}=${sp.value}`); }
    meta.params.push('wikipedia: (no safe-search parameter)');
    const runs = await Promise.allSettled([duckduckgo, mojeek, wikipedia].map((engine) => engine(query, safe, meta)));
    results = mergeResults(runs.map((r, i) => (r.status === 'fulfilled' ? { engine: ['DuckDuckGo', 'Mojeek', 'Wikipedia'][i], list: r.value } : (errors.push(String(r.reason?.message || r.reason)), null))).filter(Boolean));
    if (!results.length) throw new Error(errors.length ? `The free web search didn't respond (${errors.join('; ')}). Try again in a minute, or add a Brave or Tavily key in Settings → Web search.` : 'No web results for that.');
  } else if (cfg.provider === 'brave') {
    const key = store.getSecret('web:brave');
    if (!key) throw new Error('Add your Brave Search key in Settings → Web search.');
    const sp = getSafeSearchParam('brave', safe); meta.params.push(`brave: ${sp.param}=${sp.value}`);
    const url = `https://api.search.brave.com/res/v1/web/search?count=8&q=${encodeURIComponent(query)}&${sp.param}=${sp.value}`;
    logRequest(meta, 'Brave', 'GET', `${url} (X-Subscription-Token: ***)`);
    const res = await fetch(url, { headers: { Accept: 'application/json', 'X-Subscription-Token': key }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`Brave Search returned HTTP ${res.status}.`);
    const j = await res.json();
    results = (j.web?.results || []).map((r) => ({ title: r.title, url: r.url, snippet: stripHtml(r.description || '') }));
  } else if (cfg.provider === 'tavily') {
    const key = store.getSecret('web:tavily');
    if (!key) throw new Error('Add your Tavily key in Settings → Web search.');
    const sp = getSafeSearchParam('tavily', safe); meta.params.push(`tavily: ${sp.param}=${sp.value}`);
    const tav = async (withSafe) => {
      const body = { query, max_results: 8, ...(withSafe ? { [sp.param]: sp.value } : {}) };
      logRequest(meta, 'Tavily', 'POST', 'https://api.tavily.com/search (Authorization: Bearer ***)', body);
      return fetch('https://api.tavily.com/search', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
    };
    let res = await tav(true);
    if (res.status === 400) {
      // Tavily refuses safe_search on some plans: searched without it, and said so (not hidden).
      const why = (await res.text().catch(() => '')).slice(0, 200);
      meta.warnings.push(`Tavily rejected ${sp.param}=${sp.value} (HTTP 400${why ? `: ${why}` : ''}), so this search ran without it. Tavily is the blocker: its plan doesn't accept the safe-search parameter.`);
      console.warn(`[web search] Tavily: ${meta.warnings.at(-1)}`);
      res = await tav(false);
    }
    if (!res.ok) throw new Error(`Tavily returned HTTP ${res.status}.`);
    const j = await res.json();
    results = (j.results || []).map((r) => ({ title: r.title, url: r.url, snippet: r.content || '' }));
  } else if (cfg.provider === 'searxng') {
    if (!cfg.searxngUrl) throw new Error('Add your SearXNG address in Settings → Web search.');
    const sp = getSafeSearchParam('searxng', safe); meta.params.push(`searxng: ${sp.param}=${sp.value}`);
    const url = `${cfg.searxngUrl.replace(/\/+$/, '')}/search?format=json&q=${encodeURIComponent(query)}&${sp.param}=${sp.value}`;
    logRequest(meta, 'SearXNG', 'GET', url);
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`SearXNG returned HTTP ${res.status}.`);
    const j = await res.json();
    results = (j.results || []).slice(0, 8).map((r) => ({ title: r.title, url: r.url, snippet: r.content || '' }));
  } else {
    throw new Error('Web search is off. Turn it on in Settings → Web search.');
  }
  // Read the top pages for real content, not just snippets. Pages that are slow to open are
  // skipped after a few seconds (their snippet is used instead), and only the passages that match
  // the question are kept: the model reads about a third as much, so the answer starts sooner.
  results = results.slice(0, 6);
  await Promise.all(results.slice(0, pages).map(async (r) => {
    try {
      const res = await fetch(r.url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000), redirect: 'follow' });
      if (!res.ok || !/text\/html|text\/plain/.test(res.headers.get('content-type') || '')) return;
      r.text = bestPassages(stripHtml(await res.text()), query, 1800);
    } catch {}
  }));
  Object.defineProperty(results, 'meta', { value: meta, enumerable: false });
  return results;
}

// The parts of a page that best match the question, in page order, within a length budget.
function bestPassages(text, query, budget = 1800) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= budget) return t;
  const words = [...new Set(String(query).toLowerCase().match(/[a-z0-9]{3,}/g) || [])].filter((w) => !STOP.has(w));
  const chunks = t.match(/[^.!?]+[.!?]+["')\]]?\s*|[^.!?]+$/g) || [t];
  // Group sentences into passages of ~300 characters, then score each by the question's words.
  const passages = [];
  let cur = '';
  for (const c of chunks) { cur += c; if (cur.length >= 300) { passages.push(cur); cur = ''; } }
  if (cur) passages.push(cur);
  const scored = passages.map((p, i) => {
    const low = p.toLowerCase();
    const hits = words.reduce((n, w) => n + (low.includes(w) ? 1 : 0), 0);
    return { i, p, s: hits + (/\d/.test(p) ? 0.3 : 0) - i * 0.002 };
  });
  const keep = [];
  let used = 0;
  for (const x of [...scored].sort((a, b) => b.s - a.s)) { if (used + x.p.length > budget) continue; keep.push(x); used += x.p.length; if (used > budget * 0.9) break; }
  return keep.sort((a, b) => a.i - b.i).map((x) => x.p.trim()).join(' … ');
}
const STOP = new Set('the and for are but not you all any can had her was one our out day get has him his how man new now old see two way who boy did its let put say she too use what when where which with this that from they will would there their about into than then them these some your have more also just like been were what does'.split(' '));

// ---------- pictures from the web ----------
// Safe search is always on: openly licensed pictures from Openverse (Wikimedia Commons, Flickr and
// more; mature-flagged pictures excluded), plus your Brave Search (safesearch=strict) or SearXNG
// (safesearch=2) when set up. Explicit searches are refused, and results whose titles are explicit
// are dropped. Thumbnails are downloaded by Quicksilver and kept briefly on this PC, so the chat
// shows them without the page reaching out to other sites.
const EXPLICIT = /\b(nude|nudes|naked|nsfw|porn\w*|xxx|sex|sexy|hentai|boobs?|tits|pussy|dick|cock|penis|vagina|genitals?|topless|lingerie|erotic\w*|fetish|onlyfans|strip(per|ping)?|explicit|gore|beheading|corpse)\b/i;
async function images(query, { count = 8 } = {}) {
  const q = String(query || '').trim();
  if (!q) throw new Error('Say what pictures to look for.');
  if (EXPLICIT.test(q)) throw new Error('Picture search keeps safe search on, so it can\'t look for that.');
  const cfg = store.config().web || {};
  const found = [];
  const add = (list) => { for (const x of list) if (x?.thumb && !EXPLICIT.test(`${x.title} ${x.page || ''}`) && !found.some((y) => y.thumb === x.thumb)) found.push(x); };
  const jobs = [
    (async () => {
      const r = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=${Math.min(20, count * 2)}&mature=false`, { headers: { 'User-Agent': 'Quicksilver/2 (local AI app)', Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error(`Openverse returned HTTP ${r.status}`);
      const j = await r.json();
      add((j.results || []).filter((x) => !x.mature).map((x) => ({ title: x.title || q, thumb: x.thumbnail || x.url, full: x.url, page: x.foreign_landing_url || x.url, source: x.source || x.provider || 'Openverse', license: [x.license, x.license_version].filter(Boolean).join(' ').toUpperCase(), creator: x.creator || '', width: x.width, height: x.height })));
    })(),
  ];
  const key = store.getSecret('web:brave');
  if (cfg.provider === 'brave' && key) jobs.push((async () => {
    const r = await fetch(`https://api.search.brave.com/res/v1/images/search?safesearch=strict&count=${Math.min(20, count * 2)}&q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json', 'X-Subscription-Token': key }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`Brave returned HTTP ${r.status}`);
    const j = await r.json();
    add((j.results || []).map((x) => ({ title: x.title || q, thumb: x.thumbnail?.src, full: x.properties?.url || x.url, page: x.url, source: x.source || 'Brave', license: '' })));
  })());
  if (cfg.provider === 'searxng' && cfg.searxngUrl) jobs.push((async () => {
    const r = await fetch(`${cfg.searxngUrl.replace(/\/+$/, '')}/search?format=json&categories=images&safesearch=2&q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`SearXNG returned HTTP ${r.status}`);
    const j = await r.json();
    add((j.results || []).map((x) => ({ title: x.title || q, thumb: x.thumbnail_src || x.img_src, full: x.img_src, page: x.url, source: x.engine || 'SearXNG', license: '' })));
  })());
  const settled = await Promise.allSettled(jobs);
  if (!found.length) { const why = settled.find((x) => x.status === 'rejected')?.reason?.message; throw new Error(why ? `No pictures came back (${why}).` : 'No pictures found for that.'); }
  // Download the thumbnails (pictures only, up to 2 MB each).
  const fs = require('node:fs'); const path = require('node:path'); const crypto = require('node:crypto');
  const dir = path.join(store.dir('tmp'), 'web-images'); fs.mkdirSync(dir, { recursive: true });
  const out = [];
  await Promise.all(found.slice(0, count + 4).map(async (x) => {
    try {
      if (!/^https:\/\//.test(x.thumb)) return;
      const r = await fetch(x.thumb, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(12000), redirect: 'follow' });
      const type = r.headers.get('content-type') || '';
      if (!r.ok || !/^image\/(jpeg|png|webp|gif)/.test(type)) return;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 2 * 1024 * 1024 || buf.length < 500) return;
      const name = `${crypto.createHash('sha1').update(x.thumb).digest('hex').slice(0, 20)}.${type.split('/')[1].replace('jpeg', 'jpg')}`;
      fs.writeFileSync(path.join(dir, name), buf);
      out.push({ ...x, file: name, src: `qsmedia://w/${name}` });
    } catch {}
  }));
  // Old thumbnails are cleared after a day.
  for (const f of fs.readdirSync(dir)) { try { if (Date.now() - fs.statSync(path.join(dir, f)).mtimeMs > 864e5) fs.rmSync(path.join(dir, f), { force: true }); } catch {} }
  const order = new Map(found.map((x, i) => [x.thumb, i]));
  return out.sort((a, b) => order.get(a.thumb) - order.get(b.thumb)).slice(0, count);
}

module.exports = { search, duckduckgo, mojeek, wikipedia, bestPassages, images, mergeResults, EXPLICIT, getSafeSearchParam, SAFE_VALUES };
