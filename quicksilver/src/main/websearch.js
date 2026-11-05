// Web search for up-to-date answers. Uses the service you choose in Settings:
// Brave Search or Tavily (free tiers with a key), or your own SearXNG server.
// The top pages are opened and their text is passed to the model as numbered sources.
const store = require('./store');
const { stripHtml } = require('./docs');

async function search(query, { pages = 3 } = {}) {
  const cfg = store.config().web;
  let results = [];
  if (cfg.provider === 'brave') {
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
      const res = await fetch(r.url, { headers: { 'User-Agent': 'Mozilla/5.0 Quicksilver' }, signal: AbortSignal.timeout(10000), redirect: 'follow' });
      if (!res.ok || !/text\/html|text\/plain/.test(res.headers.get('content-type') || '')) return;
      r.text = stripHtml(await res.text()).slice(0, 6000);
    } catch {}
  }));
  return results;
}

module.exports = { search };
