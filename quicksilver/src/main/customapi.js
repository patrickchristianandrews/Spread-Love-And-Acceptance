// Your own connectors: connect any web (REST) API by describing its address, key and a few
// endpoints. Each endpoint becomes a tool the AI can use; anything that isn't a GET asks first.
// Endpoints are written one per line, e.g.
//   GET /users/{id} - Get a user by id
//   POST /orders - Create an order
const store = require('./store');

const all = () => store.config().customApis || [];
const keyName = (id) => `capi:${id}`;
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'api';

function parseEndpoints(text) {
  return String(text || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(\S+)\s*(?:[-–:]\s*(.*))?$/i);
    if (!m) throw new Error(`This line isn't an endpoint: "${l}". Write it like: GET /path - what it does`);
    return { method: m[1].toUpperCase(), path: m[2].startsWith('/') ? m[2] : `/${m[2]}`, description: (m[3] || '').trim() };
  });
}

function list() {
  return all().map((a) => ({ ...a, hasKey: store.hasSecret(keyName(a.id)), endpointsText: a.endpoints.map((e) => `${e.method} ${e.path}${e.description ? ` - ${e.description}` : ''}`).join('\n') }));
}

function save(api, key) {
  const id = api.id || `capi-${Date.now().toString(36)}`;
  if (!/^https?:\/\//.test(api.baseUrl || '')) throw new Error('The address should start with https://');
  const entry = { id, name: String(api.name || 'My API').slice(0, 60), icon: api.icon || '🔗', baseUrl: api.baseUrl.replace(/\/+$/, ''), authType: ['bearer', 'header', 'query', 'none'].includes(api.authType) ? api.authType : 'none', authName: api.authName || '', note: String(api.note || '').slice(0, 300), endpoints: parseEndpoints(api.endpointsText) };
  if (!entry.endpoints.length) throw new Error('Add at least one endpoint.');
  const rest = all().filter((x) => x.id !== id);
  store.saveConfig({ customApis: [...rest, entry] });
  if (key) store.setSecret(keyName(id), key.trim());
  return entry;
}

function remove(id) {
  store.saveConfig({ customApis: all().filter((x) => x.id !== id) });
  store.setSecret(keyName(id), '');
}

async function call(api, ep, args = {}) {
  let path = ep.path;
  for (const p of path.match(/\{(\w+)\}/g) || []) {
    const k = p.slice(1, -1);
    if (args[k] === undefined) throw new Error(`Missing ${k}.`);
    path = path.replace(p, encodeURIComponent(args[k]));
  }
  const url = new URL(api.baseUrl + path);
  for (const [k, v] of Object.entries(args.query || {})) url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  const headers = { Accept: 'application/json', 'User-Agent': 'Quicksilver' };
  const key = store.getSecret(keyName(api.id));
  if (api.authType === 'bearer' && key) headers.Authorization = `Bearer ${key}`;
  if (api.authType === 'header' && key) headers[api.authName || 'X-API-Key'] = key;
  if (api.authType === 'query' && key) url.searchParams.set(api.authName || 'api_key', key);
  const hasBody = !['GET', 'DELETE'].includes(ep.method) && args.body !== undefined;
  if (hasBody) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, { method: ep.method, headers, body: hasBody ? JSON.stringify(args.body) : undefined, signal: AbortSignal.timeout(30000) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 300)}`);
  return text.length > 16000 ? `${text.slice(0, 16000)}\n…(truncated)` : text || `${res.status} OK`;
}

function tools() {
  return all().flatMap((api) => api.endpoints.map((ep) => {
    const params = (ep.path.match(/\{(\w+)\}/g) || []).map((p) => p.slice(1, -1));
    const properties = Object.fromEntries(params.map((p) => [p, { type: 'string' }]));
    properties.query = { type: 'object', description: 'Optional query-string parameters' };
    if (!['GET', 'DELETE'].includes(ep.method)) properties.body = { type: 'object', description: 'JSON body to send' };
    return {
      name: `${slug(api.name)}_${ep.method.toLowerCase()}_${slug(ep.path.replace(/\{\w+\}/g, 'by'))}`.slice(0, 60),
      description: `${api.name}: ${ep.description || `${ep.method} ${ep.path}`}`,
      parameters: { type: 'object', properties, required: params },
      write: ep.method !== 'GET',
      summary: (a) => `${api.name}: ${ep.method} ${ep.path}${params.length ? ` (${params.map((p) => `${p}=${a[p]}`).join(', ')})` : ''}`,
      run: (a) => call(api, ep, a),
      source: api.name, sourceId: api.id,
    };
  }));
}

// Tries the first GET endpoint without parameters, if there is one.
async function test(id) {
  const api = all().find((x) => x.id === id);
  if (!api) throw new Error('Unknown API.');
  const ep = api.endpoints.find((e) => e.method === 'GET' && !/\{/.test(e.path));
  if (!ep) return 'saved';
  await call(api, ep, {});
  return 'connected';
}

module.exports = { list, save, remove, tools, test, parseEndpoints };
