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

async function search(query, { pages = 3 } = {}) {
  const cfg = store.config().web;
  let results = [];
  if (cfg.provider === 'free') {
    const errors = [];
    for (const engine of [duckduckgo, mojeek]) {
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
  // Read the top pages for real content, not just snippets.
  await Promise.all(results.slice(0, pages).map(async (r) => {
    try {
      const res = await fetch(r.url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000), redirect: 'follow' });
      if (!res.ok || !/text\/html|text\/plain/.test(res.headers.get('content-type') || '')) return;
      r.text = stripHtml(await res.text()).slice(0, 6000);
    } catch {}
  }));
  return results;
}

module.exports = { search, duckduckgo, mojeek };
