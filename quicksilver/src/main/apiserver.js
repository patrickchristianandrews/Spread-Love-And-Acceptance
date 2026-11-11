// Quicksilver's own API, in the OpenAI format, at http://127.0.0.1:<port>/v1.
// Any app that works with OpenAI can use your local models, stacks and connected APIs:
//   GET  /v1/models
//   POST /v1/chat/completions   (stream or not; model = an id from /v1/models)
//   POST /v1/images/generations (local image models)
// Only listens on this computer (127.0.0.1). An access key can be required in Settings.
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const store = require('./store');
const complete = require('./complete');
const models = require('./models');
const media = require('./media');

let server = null;
let state = { running: false, port: null, error: '' };

// Which web pages may call this API. Other apps on this PC send no Origin and are never affected.
// A page in a browser always sends one: pages served from this PC (localhost) are allowed; any
// other website is only let in when "Require an access key" is on (and it has the key). Without
// this, any site open in the browser could use your models, your paid cloud keys and your
// knowledge bases just because the API server is running.
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;
function corsOrigin(req, cfg) {
  const o = req.headers.origin;
  if (!o) return ''; // not a browser page
  if (LOCAL_ORIGIN.test(o) || cfg?.requireKey) return o;
  return null; // a website, and no key is required: refused
}
const cors = (res) => (res.qsOrigin ? { 'Access-Control-Allow-Origin': res.qsOrigin, Vary: 'Origin' } : {});
function send(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...cors(res) });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > 64 * 1024 * 1024) { reject(new Error('Request too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

// Model ids for the API: the target strings, which are already unique and readable.
function modelList() {
  const text = complete.targets().map((t) => ({ id: t.target, object: 'model', owned_by: t.group, name: t.label }));
  const imgs = models.list().filter((m) => m.kind === 'image').map((m) => ({ id: `image:${m.id}`, object: 'model', owned_by: 'On this PC', name: m.name }));
  return [...text, ...imgs];
}

function resolveModel(id) {
  if (!id) return complete.targets()[0]?.target;
  if (complete.exists(id)) return id;
  // Friendly names also work: "qwen3-8b" or a stack's name.
  const want = String(id).toLowerCase();
  const hit = complete.targets().find((t) => t.target.endsWith(`:${id}`) || t.name?.toLowerCase() === want || t.label.toLowerCase() === want);
  return hit?.target || null;
}

async function chat(req, res, body) {
  const target = resolveModel(body.model);
  if (!target) return send(res, 404, { error: { message: `Unknown model "${body.model}". GET /v1/models lists what's available.`, type: 'invalid_request_error' } });
  const controller = new AbortController();
  res.on('close', () => { if (!res.writableEnded) controller.abort(); });
  const id = `chatcmpl-${crypto.randomBytes(8).toString('hex')}`;
  const created = Math.floor(Date.now() / 1000);
  const params = { messages: body.messages || [], temperature: body.temperature ?? 0.7, maxTokens: body.max_tokens || body.max_completion_tokens || 4096, contextSize: 16384, signal: controller.signal };
  try {
    if (body.stream) {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', ...cors(res) });
      const chunk = (delta, finish = null) => res.write(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model: body.model, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`);
      chunk({ role: 'assistant' });
      for await (const ev of complete.run(target, params)) {
        if (ev.type === 'text') chunk({ content: ev.text });
        else if (ev.type === 'reasoning') chunk({ reasoning_content: ev.text });
      }
      chunk({}, 'stop');
      res.end('data: [DONE]\n\n');
    } else {
      let text = '';
      let reasoning = '';
      for await (const ev of complete.run(target, params)) {
        if (ev.type === 'text') text += ev.text;
        else if (ev.type === 'reasoning') reasoning += ev.text;
      }
      send(res, 200, { id, object: 'chat.completion', created, model: body.model, choices: [{ index: 0, message: { role: 'assistant', content: text, ...(reasoning ? { reasoning_content: reasoning } : {}) }, finish_reason: 'stop' }] });
    }
  } catch (err) {
    if (res.headersSent) { res.write(`data: ${JSON.stringify({ error: { message: err.message } })}\n\n`); res.end(); }
    else send(res, 500, { error: { message: err.message, type: 'server_error' } });
  }
}

async function images(res, body) {
  const id = String(body.model || '').replace(/^image:/, '');
  const m = models.list().find((x) => x.kind === 'image' && (x.id === id || !id));
  if (!m) return send(res, 404, { error: { message: 'No image model installed with that id.' } });
  const [w, h] = String(body.size || '').split('x').map(Number);
  const item = await media.generate(`api${Date.now().toString(36)}`, { modelId: m.id, mode: 'generate', prompt: body.prompt, width: w || undefined, height: h || undefined });
  const b64 = fs.readFileSync(item.file).toString('base64');
  send(res, 200, { created: Math.floor(Date.now() / 1000), data: [{ b64_json: b64 }] });
}

function handler(req, res) {
  const cfg = store.config().apiServer;
  const origin = corsOrigin(req, cfg);
  if (origin === null) return send(res, 403, { error: { message: 'This website is not allowed to use the Quicksilver API. To let web pages in, turn on "Require an access key" in Settings → API server and use the key.', type: 'forbidden' } });
  res.qsOrigin = origin;
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { ...cors(res), 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' });
    return res.end();
  }
  if (cfg.requireKey) {
    const key = store.getSecret('apiServerKey');
    const got = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    // Compared as bytes of equal length (a key with accented letters must not crash the check).
    const a = Buffer.from(got); const b = Buffer.from(key || '');
    if (!key || a.length !== b.length || !crypto.timingSafeEqual(a, b)) return send(res, 401, { error: { message: 'Missing or wrong API key.', type: 'authentication_error' } });
  }
  const url = (req.url || '').split('?')[0].replace(/\/+$/, '');
  (async () => {
    if (req.method === 'GET' && (url === '/v1/models' || url === '/models')) return send(res, 200, { object: 'list', data: modelList() });
    if (req.method === 'GET' && (url === '' || url === '/v1' || url === '/health')) return send(res, 200, { status: 'ok', name: 'Quicksilver', endpoints: ['/v1/models', '/v1/chat/completions', '/v1/images/generations'] });
    if (req.method === 'POST' && /\/(v1\/)?chat\/completions$/.test(url)) return chat(req, res, await readBody(req));
    if (req.method === 'POST' && /\/(v1\/)?images\/generations$/.test(url)) return images(res, await readBody(req));
    send(res, 404, { error: { message: 'Not found.' } });
  })().catch((err) => { if (!res.headersSent) send(res, 400, { error: { message: err.message } }); });
}

function start() {
  stop();
  const cfg = store.config().apiServer;
  if (!cfg.enabled) { state = { running: false, port: null, error: '' }; return Promise.resolve(state); }
  return new Promise((resolve) => {
    server = http.createServer(handler);
    server.on('error', (err) => { state = { running: false, port: cfg.port, error: err.code === 'EADDRINUSE' ? `Port ${cfg.port} is already in use. Pick another port.` : err.message }; resolve(state); });
    server.listen(cfg.port, '127.0.0.1', () => { state = { running: true, port: cfg.port, error: '' }; resolve(state); });
  });
}
function stop() { if (server) { try { server.close(); } catch {} server = null; } state = { ...state, running: false }; }
function status() { return state; }

module.exports = { start, stop, status, handler };
