// Safe search for web search: the setting goes into the actual outbound request of every search
// service, off and on, including the AI's web_search tool; a value outside on/off is refused; a
// Tavily plan that rejects safe_search is retried without it and says so. Prints each request.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
process.env.QUICKSILVER_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-safe-'));
const store = require('../src/main/store');
const websearch = require('../src/main/websearch');

(async () => {
  const sent = [];
  const real = global.fetch;
  let tavilyRejects = false;
  global.fetch = async (url, o = {}) => {
    const u = String(url);
    sent.push({ url: u, body: o.body ? String(o.body) : '' });
    const ok = (body, type = 'text/html') => new Response(body, { status: 200, headers: { 'content-type': type } });
    if (u.includes('html.duckduckgo.com')) return ok('<a class="result__a" href="https://example.org/a">Breast augmentation</a><div class="result__snippet">Surgery to enlarge the breasts.</div>');
    if (u.includes('mojeek.com')) return ok('<a class="title" href="https://example.net/b">Augmentation guide</a><p class="s">What to expect.</p>');
    if (u.includes('wikipedia.org/w/api.php')) return ok(JSON.stringify({ query: { search: [{ title: 'Breast augmentation', snippet: 'A cosmetic surgery' }] } }), 'application/json');
    if (u.includes('api.search.brave.com')) return ok(JSON.stringify({ web: { results: [{ title: 'Brave result', url: 'https://example.com/c', description: 'x' }] } }), 'application/json');
    if (u.includes('api.tavily.com')) { if (tavilyRejects && /safe_search/.test(o.body || '')) return new Response('{"detail":"safe_search is not available on your plan"}', { status: 400 }); return ok(JSON.stringify({ results: [{ title: 'Tavily result', url: 'https://example.com/d', content: 'x' }] }), 'application/json'); }
    if (u.includes('searx.local')) return ok(JSON.stringify({ results: [{ title: 'SearX result', url: 'https://example.com/e', content: 'x' }] }), 'application/json');
    return ok('<p>page</p>');
  };
  store.setSecret('web:brave', 'BRAVE-SECRET'); store.setSecret('web:tavily', 'TAVILY-SECRET');
  const q = 'breast augmentation';
  const run = async (provider, safe) => {
    store.saveConfig({ web: { provider, searxngUrl: 'http://searx.local:8888' } });
    sent.length = 0;
    const r = await websearch.search(q, { safe });
    return { r, sent: sent.filter((x) => !/example\.(org|net|com)\//.test(x.url)), meta: r.meta };
  };
  const want = {
    free: { off: [/html\.duckduckgo\.com.*kp=-2/, /mojeek\.com\/search\?q=breast%20augmentation&safe=0/], on: [/kp=1\b/, /&safe=1\b/] },
    brave: { off: [/api\.search\.brave\.com\/res\/v1\/web\/search\?count=8&q=breast%20augmentation&safesearch=off$/], on: [/&safesearch=strict$/] },
    searxng: { off: [/searx\.local:8888\/search\?format=json&q=breast%20augmentation&safesearch=0$/], on: [/&safesearch=2$/] },
    tavily: { off: [/"safe_search":false/], on: [/"safe_search":true/] },
  };
  for (const [provider, w] of Object.entries(want)) {
    for (const safe of ['off', 'on']) {
      const { sent: out, meta } = await run(provider, safe);
      const lines = out.map((x) => `${x.url}${x.body ? ` ${x.body}` : ''}`);
      for (const re of w[safe]) assert.ok(lines.some((l) => re.test(l)), `${provider} ${safe}: ${re} not in ${JSON.stringify(lines)}`);
      assert.ok(meta.requests.every((x) => !/BRAVE-SECRET|TAVILY-SECRET/.test(x.request)), 'keys are redacted in the logged request');
      console.log(`  ${provider} safe=${safe}:\n${meta.requests.map((x) => `    ${x.engine}: ${x.request}`).join('\n')}`);
    }
  }
  console.log('✓ safe search a/b: off sends each service\'s off value, on flips it (DuckDuckGo kp, Mojeek safe, Brave safesearch, SearXNG safesearch, Tavily safe_search); keys redacted');

  // Retried path: the second attempt carries the same value (and Tavily's refusal is surfaced).
  tavilyRejects = true;
  const t = await run('tavily', 'off');
  assert.deepEqual(t.sent.filter((x) => /tavily/.test(x.url)).map((x) => /"safe_search":false/.test(x.body)), [true, false], 'tried with safe_search, then without');
  assert.match(t.meta.warnings[0], /Tavily rejected safe_search=false \(HTTP 400[^)]*\)[\s\S]*Tavily is the blocker/);
  assert.equal(t.r[0].title, 'Tavily result');
  tavilyRejects = false;
  console.log('✓ safe search: a Tavily plan that rejects safe_search (HTTP 400) is retried without it and the warning names Tavily as the blocker');

  // Validated against the allowlist: never a default on the server side.
  await assert.rejects(websearch.search(q, { safe: 'maybe' }), /must be "on" or "off"/);
  await assert.rejects(websearch.search(q, {}), /must be "on" or "off"/);
  console.log('✓ safe search: a missing or unknown value is refused (on/off only)');

  // The AI's own web_search tool carries the chat's setting.
  store.saveConfig({ web: { provider: 'brave' } });
  const integrations = require('../src/main/integrations');
  const tools = require('../src/main/tools');
  const tool = integrations.tools().find((x) => x.name === 'web_search');
  sent.length = 0; await tools.execute(tool, { query: q }, { ctx: { safeSearch: 'off' } });
  assert.ok(sent.some((x) => /safesearch=off/.test(x.url)), 'the tool used off');
  sent.length = 0; await tools.execute(tool, { query: q }, { ctx: { safeSearch: 'on' } });
  assert.ok(sent.some((x) => /safesearch=strict/.test(x.url)), 'and on');
  sent.length = 0; await tools.execute(tool, { query: q }, { ctx: {} });
  assert.ok(sent.some((x) => /safesearch=off/.test(x.url)), 'the tool defaults to off (safe search default is off)');
  console.log('✓ safe search: the AI\'s web_search tool sends the chat\'s setting (and defaults to off)');
  global.fetch = real;
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
