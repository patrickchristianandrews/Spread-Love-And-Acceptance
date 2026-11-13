// MCP (Model Context Protocol) client: connects Quicksilver to any MCP server, the open standard
// for AI integrations, so models can use its tools. Local servers run as a command on this PC
// (stdio); remote servers are reached over HTTPS (Streamable HTTP), optionally with a token.
const store = require('./store');

const { PRESETS } = require('./mcp-catalog');

// A server's environment variables often hold a key or token for the service it talks to, so
// their values are kept with Quicksilver's other secrets (encrypted by Windows), never in the
// plain settings file. The settings file keeps only the variable names.
const envOf = (s) => {
  let saved = {};
  try { saved = JSON.parse(store.getSecret(`mcp-env:${s.id}`) || '{}'); } catch {}
  return { ...Object.fromEntries((s.envKeys || []).map((k) => [k, ''])), ...saved };
};
function servers() {
  const list = store.config().mcp || [];
  // Settings written by an older version had the values in the open: move them once.
  const old = list.filter((s) => s.env && Object.keys(s.env).length);
  if (old.length) {
    for (const s of old) { store.setSecret(`mcp-env:${s.id}`, JSON.stringify(s.env)); s.envKeys = Object.keys(s.env); delete s.env; }
    store.saveConfig({ mcp: list });
  }
  return list.map((s) => ({ ...s, env: envOf(s) }));
}
const live = new Map(); // id -> { client, tools, error }

function saveServers(list) {
  store.saveConfig({ mcp: list.map((s) => { const { env, ...rest } = s; return { ...rest, envKeys: Object.keys(env || {}) }; }) });
  for (const s of list) store.setSecret(`mcp-env:${s.id}`, s.env && Object.keys(s.env).length ? JSON.stringify(s.env) : '');
}

function upsert(s, token) {
  const list = servers();
  const id = s.id || `m${Date.now().toString(36)}`;
  const entry = { id, name: s.name || 'MCP server', transport: s.transport === 'stdio' ? 'stdio' : 'http', command: s.command || '', args: s.args || [], env: s.env || {}, url: s.url || '', auth: Boolean(s.auth || token), enabled: s.enabled !== false, ...(s.preset ? { preset: s.preset } : {}) };
  const i = list.findIndex((x) => x.id === id);
  if (i >= 0) list[i] = entry; else list.push(entry);
  saveServers(list);
  if (token) store.setSecret(`mcp:${id}`, token.trim());
  disconnect(id);
  return entry;
}

function remove(id) {
  disconnect(id);
  saveServers(servers().filter((s) => s.id !== id));
  store.setSecret(`mcp:${id}`, '');
  store.setSecret(`mcp-env:${id}`, '');
}

function disconnect(id) {
  const l = live.get(id);
  live.delete(id);
  try { l?.client?.close(); } catch {}
}
function disconnectAll() { for (const id of [...live.keys()]) disconnect(id); }

async function connect(s) {
  if (live.get(s.id)?.client) return live.get(s.id);
  const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
  const client = new Client({ name: 'Quicksilver', version: require('../../package.json').version });
  let transport;
  if (s.transport === 'stdio') {
    const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
    // npx / uvx come from this PC, or are fetched by Quicksilver the first time (see runtimes.js).
    const r = await require('./runtimes').resolveCommand(s.command, { ...process.env, ...s.env });
    let { command } = r;
    // Windows needs the .cmd shims for npm-installed launchers.
    if (process.platform === 'win32' && /^(npx|npm|pnpm|yarn)$/i.test(command)) command = `${command}.cmd`;
    transport = new StdioClientTransport({ command, args: s.args, env: r.env, stderr: 'pipe' });
  } else {
    const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const token = s.auth ? store.getSecret(`mcp:${s.id}`) : '';
    transport = new StreamableHTTPClientTransport(new URL(s.url), { requestInit: { headers: token ? { Authorization: `Bearer ${token}` } : {} } });
  }
  // What the server prints is read as it comes (a pipe nobody reads fills up, and the server then
  // stops mid-answer); the last of it is kept to say why a start failed.
  let said = '';
  let draining = false;
  const drain = () => { if (draining || !transport.stderr) return; draining = true; transport.stderr.on('data', (b) => { said = (said + b).slice(-4000); }); };
  drain();
  // A server that stops or crashes is forgotten, so the next use starts it again.
  client.onclose = () => { if (live.get(s.id)?.client === client) live.delete(s.id); };
  let timer;
  const timeout = new Promise((_, j) => { timer = setTimeout(() => j(new Error('The server did not respond within 60 seconds.')), 60000); });
  let tools;
  try {
    await Promise.race([client.connect(transport), timeout]);
    drain();
    ({ tools } = await Promise.race([client.listTools(), timeout]));
  } catch (err) {
    try { await client.close(); } catch { /* it never started */ } // nothing is left running after a failed start
    const last = said.trim().split('\n').filter(Boolean).pop();
    throw new Error(`${err.message}${last ? ` The server said: ${last.slice(0, 300)}` : ''}`);
  } finally { clearTimeout(timer); }
  const entry = { client, tools, error: '' };
  live.set(s.id, entry);
  return entry;
}

const safeName = (s) => s.replace(/[^a-zA-Z0-9_-]/g, '_');

// Tools from every enabled server (connecting on first use). Failures are reported, not thrown.
// With the message's text, a server added from the Liquid Edition's free extras (a preset that says
// which messages it is for) is only started when the message needs it.
const needed = (s, text) => text === undefined || !s.preset || !PRESETS[s.preset]?.when || PRESETS[s.preset].when.test(String(text));
async function tools(text) {
  const out = [];
  await Promise.all(servers().filter((s) => s.enabled && needed(s, text)).map(async (s) => {
    try {
      const { tools: list } = await connect(s);
      for (const t of list) {
        out.push({
          name: `mcp_${safeName(s.id)}_${safeName(t.name)}`.slice(0, 64),
          description: `${(t.description || t.title || t.name).slice(0, 400)} (via ${s.name})`,
          parameters: t.inputSchema || { type: 'object', properties: {} },
          // Read-only tools run without asking; anything else asks you first.
          write: !(t.annotations?.readOnlyHint === true),
          source: s.name, sourceId: `mcp:${s.id}`,
          summary: (a) => `${s.name}: ${t.title || t.name}(${JSON.stringify(a).slice(0, 120)})`,
          run: async (args) => {
            const { client } = await connect(s);
            const r = await client.callTool({ name: t.name, arguments: args || {} });
            const text = (r.content || []).map((c) => (c.type === 'text' ? c.text : c.type === 'resource' ? (c.resource?.text || c.resource?.uri) : `[${c.type}]`)).join('\n');
            if (r.isError) throw new Error(text || 'The tool reported an error.');
            return text || (r.structuredContent ? JSON.stringify(r.structuredContent) : 'Done.');
          },
        });
      }
    } catch (err) {
      live.set(s.id, { client: null, tools: [], error: String(err.message || err) });
    }
  }));
  return out;
}

async function status() {
  return servers().map((s) => ({ ...s, hasToken: store.hasSecret(`mcp:${s.id}`), connected: Boolean(live.get(s.id)?.client), toolCount: live.get(s.id)?.tools?.length || 0, toolNames: (live.get(s.id)?.tools || []).map((t) => t.name), error: live.get(s.id)?.error || '' }));
}

async function testServer(id) {
  disconnect(id);
  const s = servers().find((x) => x.id === id);
  if (!s) throw new Error('Unknown server.');
  const { tools: list } = await connect(s);
  return list.map((t) => t.name);
}

// Adds the Liquid Edition's free extras once (each removed one stays removed). Returns how many were added.
function addLiquidPack() {
  const { LIQUID_PACK } = require('./mcp-catalog');
  const done = new Set(store.config().liquidPackDone || []);
  const have = servers();
  let n = 0;
  for (const id of LIQUID_PACK) {
    if (done.has(id)) continue;
    const p = PRESETS[id];
    const same = have.some((s) => s.preset === id || (p.url && s.url === p.url) || (p.command && s.command === p.command && JSON.stringify(s.args) === JSON.stringify(p.args)));
    if (!same) { upsert({ id: `liq-${id}`, preset: id, name: p.name, transport: p.transport, command: p.command, args: p.args, env: p.env || {}, url: p.url, enabled: true }); n++; }
    done.add(id);
  }
  store.saveConfig({ liquidPackDone: [...done] });
  return n;
}

module.exports = { PRESETS, servers, upsert, remove, tools, status, testServer, disconnectAll, addLiquidPack };
