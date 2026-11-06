// Use Quicksilver from your phone: a small web app served to your home network while
// Quicksilver is open on the PC. Scan the QR code on the PC once; the phone remembers the link.
// Answers are worked out on the PC (your models, stacks and memory) and the chats show up on
// the PC too. Only devices with the secret link can use it; changing the link signs them out.
const http = require('node:http');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const store = require('./store');
const complete = require('./complete');

const PAGE = path.join(__dirname, '..', 'phone', 'index.html');
const STYLE = 'Write like a thoughtful expert talking to a smart friend: the direct answer first, clear paragraphs, lists only for real steps or list-like items, short answers kept short. The user is reading on a phone, so keep formatting light and avoid wide tables.';

let server = null;
let state = { running: false, port: null, error: '' };
let emit = () => {};
const fails = new Map(); // ip -> { n, until }

const cfg = () => ({ enabled: false, port: 1338, ...(store.config().phone || {}) });
function token() {
  let t = store.getSecret('phoneToken');
  if (!t) { t = crypto.randomBytes(18).toString('base64url'); store.setSecret('phoneToken', t); }
  return t;
}
function newToken() { store.setSecret('phoneToken', crypto.randomBytes(18).toString('base64url')); return token(); }

// This PC's addresses on the local network (Wi-Fi and Ethernet first, virtual adapters last).
function addresses() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family !== 'IPv4' || a.internal || a.address.startsWith('169.254.')) continue;
      const virtual = /vEthernet|VirtualBox|VMware|WSL|Hyper-V|docker|br-|veth|tailscale|zerotier/i.test(name);
      const privateNet = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address);
      out.push({ name, address: a.address, score: (virtual ? 0 : 2) + (privateNet ? 1 : 0) + (/wi-?fi|wlan|wireless/i.test(name) ? 1 : 0) });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

function appData() { return store.readJSON(store.file('app-data.json'), {}) || {}; }

function systemFor(assistantId, question) {
  const d = appData();
  const a = (d.assistants || []).find((x) => x.id === assistantId) || (d.assistants || [])[0] || {};
  const p = d.prefs || {};
  const parts = [a.instructions || 'You are a helpful assistant.', STYLE, `Today is ${new Date().toDateString()}.`];
  if (p.userName) parts.push(`The user's name is ${p.userName}.`);
  if (p.about) parts.push(`About the user: ${p.about}`);
  const mem = p.memory === false ? [] : (d.memory || []);
  if (mem.length) {
    const q = new Set(String(question || '').toLowerCase().match(/[a-z0-9]{4,}/g) || []);
    const pick = mem.length <= 15 ? mem : mem.map((m, i) => ({ m, s: (String(m.text).toLowerCase().match(/[a-z0-9]{4,}/g) || []).filter((w) => q.has(w)).length * 3 + i / mem.length })).sort((x, y) => y.s - x.s).slice(0, 15).map((x) => x.m);
    parts.push(`What you remember about the user (use it naturally when it helps):\n${pick.map((m) => `- ${m.text}`).join('\n')}`);
  }
  return { system: parts.join('\n\n'), assistant: a, prefs: p };
}

function send(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function readBody(req, limit = 24 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('Too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

function authorised(req) {
  const ip = req.socket.remoteAddress || '';
  const f = fails.get(ip);
  if (f && f.until > Date.now()) return false;
  const got = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const key = token();
  const ok = got.length === key.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(key));
  if (!ok) {
    const n = (f?.n || 0) + 1;
    fails.set(ip, { n, until: n >= 15 ? Date.now() + 10 * 60 * 1000 : 0 }); // slow down guessing
  } else fails.delete(ip);
  return ok;
}

async function chat(req, res) {
  const body = await readBody(req);
  const msgs = (Array.isArray(body.messages) ? body.messages : []).slice(-30).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.image ? [{ type: 'text', text: String(m.text || '') }, { type: 'image_url', image_url: { url: String(m.image) } }] : String(m.text || ''),
  })).filter((m) => m.content);
  if (!msgs.length) return send(res, 400, { error: 'Nothing to answer.' });
  const lastText = [...(body.messages || [])].reverse().find((m) => m.role !== 'assistant')?.text || '';
  const { system, prefs } = systemFor(body.assistantId, lastText);
  const target = complete.exists(body.target) ? body.target : complete.exists(prefs.defaultTarget) ? prefs.defaultTarget : complete.targets()[0]?.target;
  if (!target) return send(res, 400, { error: 'No models on the PC yet.' });
  const controller = new AbortController();
  res.on('close', () => { if (!res.writableEnded) controller.abort(); });
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
  const out = (o) => res.write(`data: ${JSON.stringify(o)}\n\n`);
  let text = '';
  try {
    for await (const ev of complete.run(target, { messages: [{ role: 'system', content: system }, ...msgs], temperature: Number(prefs.temperature ?? 0.6), maxTokens: Number(prefs.maxTokens) || 2048, contextSize: 16384, gpu: prefs.gpu ?? 'auto', level: body.level || prefs.effortLevel || 'thorough', signal: controller.signal })) {
      if (ev.type === 'text') { text += ev.text; out({ t: ev.text }); }
      else if (ev.type === 'status') out({ s: ev.text });
    }
    out({ done: true, target });
  } catch (err) { out({ error: String(err.message || err) }); }
  res.end();
  // The conversation shows up on the PC as well.
  if (body.chatId && text) {
    const clean = (s) => String(s || '').slice(0, 20000);
    emit('app:event', { kind: 'phone:chat', chat: { id: String(body.chatId).slice(0, 40), title: clean(body.title).slice(0, 60), assistantId: body.assistantId, target, messages: [...(body.messages || []).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', text: clean(m.text), image: Boolean(m.image) })), { role: 'assistant', text }] } });
  }
}

function handler(req, res) {
  const url = (req.url || '/').split('?')[0];
  (async () => {
    if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' });
      return res.end(fs.readFileSync(PAGE));
    }
    if (url === '/manifest.json') return send(res, 200, { name: 'Quicksilver', short_name: 'Quicksilver', display: 'standalone', background_color: '#0b1020', theme_color: '#0b1020', start_url: '/' });
    if (!url.startsWith('/api/')) return send(res, 404, { error: 'Not found' });
    if (!authorised(req)) return send(res, 401, { error: 'This link has expired. Scan the QR code on your PC again (Settings → Phone).' });
    if (req.method === 'GET' && url === '/api/info') {
      const d = appData();
      return send(res, 200, {
        name: d.prefs?.userName || '',
        defaultTarget: d.prefs?.defaultTarget || '',
        targets: complete.targets().filter((t) => !t.target.startsWith('kb:')).map((t) => ({ target: t.target, label: t.label, group: t.group })),
        assistants: (d.assistants || []).slice(0, 80).map((a) => ({ id: a.id, name: a.name, emoji: a.emoji, description: a.description })),
      });
    }
    if (req.method === 'POST' && url === '/api/chat') return chat(req, res);
    send(res, 404, { error: 'Not found' });
  })().catch((err) => { if (!res.headersSent) send(res, 400, { error: err.message }); else res.end(); });
}

function start(emitter) {
  if (emitter) emit = emitter;
  stop();
  const c = cfg();
  if (!c.enabled) { state = { running: false, port: null, error: '' }; return Promise.resolve(info()); }
  return new Promise((resolve) => {
    server = http.createServer(handler);
    server.on('error', (err) => { state = { running: false, port: c.port, error: err.code === 'EADDRINUSE' ? `Port ${c.port} is in use by another program.` : err.message }; resolve(info()); });
    server.listen(c.port, process.env.QS_PHONE_HOST || '0.0.0.0', () => { state = { running: true, port: c.port, error: '' }; resolve(info()); });
  });
}
function stop() { if (server) { try { server.close(); server.closeAllConnections?.(); } catch {} server = null; } state = { ...state, running: false }; }

async function info() {
  const addr = addresses()[0]?.address;
  const url = state.running && addr ? `http://${addr}:${state.port}/#k=${token()}` : '';
  let qr = '';
  if (url) { try { qr = await require('qrcode').toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0b1020', light: '#ffffff' } }); } catch {} }
  return { ...state, enabled: cfg().enabled, url, qr, addresses: addresses().map((a) => a.address), local: state.running ? `http://127.0.0.1:${state.port}/#k=${token()}` : '' };
}

async function configure(patch) {
  store.saveConfig({ phone: { ...cfg(), ...patch } });
  return start();
}

module.exports = { start, stop, info, configure, newToken: async () => { newToken(); return info(); }, handler, addresses };
