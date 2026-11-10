// Web search for up-to-date answers. Uses the service you choose in Settings:
// Free (no key: DuckDuckGo, with Mojeek as a fallback), Brave Search or Tavily (free tiers with a
// key), or your own SearXNG server.
// The top pages are opened and their text is passed to the model as numbered sources.
const store = require('./store');
const { stripHtml } = require('./docs');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const decode = (s) => stripHtml(String(s || '')).replace(/\s+/g, ' ').trim();

// DuckDuckGo's plain HTML page: no key, no account.
async function duckduckgo(query) {
  const res = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'text/html' },
    body: `q=${encodeURIComponent(query)}&kl=wt-wt`, signal: AbortSignal.timeout(15000),
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
async function mojeek(query) {
  const res = await fetch(`https://www.mojeek.com/search?q=${encodeURIComponent(query)}`, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: AbortSignal.timeout(15000) });
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
async function wikipedia(query) {
  const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=5&srsearch=${encodeURIComponent(query)}`, { headers: { 'User-Agent': 'Quicksilver/2 (local AI app)', Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Wikipedia returned HTTP ${res.status}`);
  const j = await res.json();
  return (j.query?.search || []).map((r) => ({ title: r.title, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, '_'))}`, snippet: decode(r.snippet) }));
}

async function search(query, { pages = 3 } = {}) {
  const cfg = store.config().web;
  let results = [];
  if (cfg.provider === 'free') {
    const errors = [];
    for (const engine of [duckduckgo, mojeek, wikipedia]) {
      try { results = await engine(query); if (results.length) break; } catch (err) { errors.push(err.message); }
    }
    if (!results.length) throw new Error(errors.length ? `The free web search didn't respond (${errors.join('; ')}). Try again in a minute, or add a Brave or Tavily key in Settings → Web search.` : 'No web results for that.');
  } else if (cfg.provider === 'brave') {
    const key = store.getSecret('web:brave');
    if (!key) throw new Error('Add your Brave Search key in Settings → Web search.');
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?count=8&q=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json', 'X-Subscription-Token': key }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`Brave Search returned HTTP ${res.status}.`);
    const j = await res.json();
    results = (j.web?.results || []).map((r) => ({ title: r.title, url: r.url, snippet: stripHtml(r.description || '') }));
  } else if (cfg.provider === 'tavily') {
    const key = store.getSecret('web:tavily');
    if (!key) throw new Error('Add your Tavily key in Settings → Web search.');
    const res = await fetch('https://api.tavily.com/search', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ query, max_results: 8, include_raw_content: false }), signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`Tavily returned HTTP ${res.status}.`);
    const j = await res.json();
    results = (j.results || []).map((r) => ({ title: r.title, url: r.url, snippet: r.content || '' }));
  } else if (cfg.provider === 'searxng') {
    if (!cfg.searxngUrl) throw new Error('Add your SearXNG address in Settings → Web search.');
    const res = await fetch(`${cfg.searxngUrl.replace(/\/+$/, '')}/search?format=json&q=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(15000) });
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

module.exports = { search, duckduckgo, mojeek, wikipedia, bestPassages };
