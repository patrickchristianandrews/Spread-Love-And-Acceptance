// MCP (Model Context Protocol) client: connects Quicksilver to any MCP server, the open standard
// for AI integrations, so models can use its tools. Local servers run as a command on this PC
// (stdio); remote servers are reached over HTTPS (Streamable HTTP), optionally with a token.
const store = require('./store');

const { PRESETS } = require('./mcp-catalog');

const servers = () => store.config().mcp || [];
const live = new Map(); // id -> { client, tools, error }

function saveServers(list) { store.saveConfig({ mcp: list }); }

function upsert(s, token) {
  const list = servers();
  const id = s.id || `m${Date.now().toString(36)}`;
  const entry = { id, name: s.name || 'MCP server', transport: s.transport === 'stdio' ? 'stdio' : 'http', command: s.command || '', args: s.args || [], env: s.env || {}, url: s.url || '', auth: Boolean(s.auth || token), enabled: s.enabled !== false };
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
    let command = s.command;
    // Windows needs the .cmd shims for npm-installed launchers.
    if (process.platform === 'win32' && /^(npx|npm|pnpm|yarn)$/i.test(command)) command = `${command}.cmd`;
    transport = new StdioClientTransport({ command, args: s.args, env: { ...process.env, ...s.env }, stderr: 'pipe' });
  } else {
    const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
    const token = s.auth ? store.getSecret(`mcp:${s.id}`) : '';
    transport = new StreamableHTTPClientTransport(new URL(s.url), { requestInit: { headers: token ? { Authorization: `Bearer ${token}` } : {} } });
  }
  const timeout = new Promise((_, j) => setTimeout(() => j(new Error('The server did not respond within 60 seconds.')), 60000));
  await Promise.race([client.connect(transport), timeout]);
  const { tools } = await client.listTools();
  const entry = { client, tools, error: '' };
  live.set(s.id, entry);
  return entry;
}

const safeName = (s) => s.replace(/[^a-zA-Z0-9_-]/g, '_');

// Tools from every enabled server (connecting on first use). Failures are reported, not thrown.
async function tools() {
  const out = [];
  await Promise.all(servers().filter((s) => s.enabled).map(async (s) => {
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

module.exports = { PRESETS, servers, upsert, remove, tools, status, testServer, disconnectAll };
