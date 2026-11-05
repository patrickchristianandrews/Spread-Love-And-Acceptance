// Every tool a model can use in a chat: built-in connectors plus MCP servers.
// Tools that change something (write) ask for approval unless you chose "always allow" for that
// tool, or turned off asking altogether (toolAutoApprove).
const store = require('./store');
const integrations = require('./integrations');
const mcp = require('./mcp');

async function available() {
  const list = [...integrations.tools(), ...(await mcp.tools())];
  const seen = new Set();
  return list.filter((t) => (seen.has(t.name) ? false : seen.add(t.name)));
}

// OpenAI-style tool definitions (also converted for Anthropic).
const schema = (list) => list.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters || { type: 'object', properties: {} } } }));

const allowed = () => new Set(store.config().toolAllow || []);
function allowAlways(name) { const s = allowed(); s.add(name); store.saveConfig({ toolAllow: [...s] }); }

const clip = (s, n) => (s.length > n ? `${s.slice(0, n)}\n…(truncated)` : s);

// Runs one tool call. Returns { status: 'done'|'error'|'denied', result }.
async function execute(tool, args, { approve } = {}) {
  if (!tool) return { status: 'error', result: 'Unknown tool.' };
  if (tool.write && !store.config().toolAutoApprove && !allowed().has(tool.name)) {
    const answer = approve ? await approve({ tool: tool.name, source: tool.source, summary: tool.summary ? tool.summary(args) : `${tool.source}: ${tool.name}`, args }) : { ok: false };
    if (!answer?.ok) return { status: 'denied', result: 'The user declined this action. Do not retry it; continue without it and tell the user what you would have done.' };
    if (answer.always) allowAlways(tool.name);
  }
  try {
    const out = await tool.run(args || {});
    return { status: 'done', result: clip(String(out ?? 'Done.'), 14000) };
  } catch (err) {
    return { status: 'error', result: `Error: ${String(err.message || err).slice(0, 800)}` };
  }
}

module.exports = { available, schema, execute, allowAlways };
