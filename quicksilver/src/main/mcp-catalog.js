// Ready-made MCP servers, grouped by kind. Picking one fills in the details; anything in <angle
// brackets> (a folder, a key) is asked for before it connects. Local servers need Node.js (npx)
// or uv (uvx); remote ones are just an address. Plus a search of the official MCP Registry, so
// any of the thousands of public servers can be added in one click.

const PRESETS = {
  // ---------- Files & your PC ----------
  filesystem: { group: 'Files & your PC', name: 'Files on this PC', transport: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '<folder>'], note: 'Read and write files in a folder you choose. Needs Node.js (nodejs.org).', askFolder: true },
  desktop: { group: 'Files & your PC', name: 'Desktop Commander', transport: 'stdio', command: 'npx', args: ['-y', '@wonderwhy-er/desktop-commander'], note: 'Run commands, search and edit files across your PC. Powerful: keep approvals on. Needs Node.js.' },
  git: { group: 'Files & your PC', name: 'Git repository', transport: 'stdio', command: 'uvx', args: ['mcp-server-git', '--repository', '<folder>'], note: 'History, diffs, branches and commits of a local repository. Needs uv.', askFolder: true },
  excel: { group: 'Files & your PC', name: 'Excel workbooks', transport: 'stdio', command: 'uvx', args: ['excel-mcp-server', 'stdio'], note: 'Create and edit .xlsx files: sheets, formulas, formatting and charts. Needs uv.' },
  time: { group: 'Files & your PC', name: 'Time and time zones', transport: 'stdio', command: 'uvx', args: ['mcp-server-time'], note: 'The current time anywhere, and time-zone conversions. Needs uv.' },
  memory: { group: 'Files & your PC', name: 'Long-term memory', transport: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-memory'], note: 'A knowledge graph the AI can remember facts in across chats. Needs Node.js.' },
  thinking: { group: 'Files & your PC', name: 'Step-by-step thinking', transport: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-sequential-thinking'], note: 'Helps models plan and revise their reasoning on hard problems. Needs Node.js.' },

  // ---------- Web & search ----------
  playwright: { group: 'Web & search', name: 'Web browser (Playwright)', transport: 'stdio', command: 'npx', args: ['-y', '@playwright/mcp@latest'], note: 'Lets models open and read web pages and fill in forms. Needs Node.js.' },
  chromedev: { group: 'Web & search', name: 'Chrome DevTools', transport: 'stdio', command: 'npx', args: ['-y', 'chrome-devtools-mcp@latest'], note: 'Control Chrome, inspect pages, network and performance. Needs Node.js and Chrome.' },
  fetch: { group: 'Web & search', name: 'Fetch web pages', transport: 'stdio', command: 'uvx', args: ['mcp-server-fetch'], note: 'Fetches any URL as clean text. Needs uv.' },
  brave: { group: 'Web & search', name: 'Brave Search', transport: 'stdio', command: 'npx', args: ['-y', '@brave/brave-search-mcp-server'], env: { BRAVE_API_KEY: '<your Brave Search key>' }, note: 'Web, news and image search. Free tier with a key from brave.com/search/api. Needs Node.js.' },
  tavily: { group: 'Web & search', name: 'Tavily search', transport: 'stdio', command: 'npx', args: ['-y', 'tavily-mcp@latest'], env: { TAVILY_API_KEY: '<your Tavily key>' }, note: 'Search built for AI, with extraction. Free monthly credits (tavily.com). Needs Node.js.' },
  exa: { group: 'Web & search', name: 'Exa search', transport: 'http', url: 'https://mcp.exa.ai/mcp', note: 'Neural web search, code search and company research. Free to try.' },
  firecrawl: { group: 'Web & search', name: 'Firecrawl', transport: 'stdio', command: 'npx', args: ['-y', 'firecrawl-mcp'], env: { FIRECRAWL_API_KEY: '<your Firecrawl key>' }, note: 'Scrape and crawl whole websites into clean text. Free credits (firecrawl.dev). Needs Node.js.' },
  apify: { group: 'Web & search', name: 'Apify (web scrapers)', transport: 'stdio', command: 'npx', args: ['-y', '@apify/actors-mcp-server'], env: { APIFY_TOKEN: '<your Apify token>' }, note: 'Thousands of ready-made scrapers: Google Maps, Amazon, Instagram and more. Free monthly credit. Needs Node.js.' },

  // ---------- Docs & knowledge ----------
  context7: { group: 'Docs & knowledge', name: 'Up-to-date code docs (Context7)', transport: 'http', url: 'https://mcp.context7.com/mcp', note: 'Current documentation for thousands of libraries, so code answers use today\'s APIs. Free, no key.' },
  mslearn: { group: 'Docs & knowledge', name: 'Microsoft Learn docs', transport: 'http', url: 'https://learn.microsoft.com/api/mcp', note: 'Official Microsoft and Azure documentation. Free, no key.' },
  cfdocs: { group: 'Docs & knowledge', name: 'Cloudflare docs', transport: 'http', url: 'https://docs.mcp.cloudflare.com/mcp', note: 'Cloudflare documentation. Free, no key.' },
  awsdocs: { group: 'Docs & knowledge', name: 'AWS documentation', transport: 'stdio', command: 'uvx', args: ['awslabs.aws-documentation-mcp-server@latest'], note: 'Search and read AWS docs. Needs uv.' },
  huggingface: { group: 'Docs & knowledge', name: 'Hugging Face', transport: 'http', url: 'https://huggingface.co/mcp', auth: true, authHelp: 'A Hugging Face access token (huggingface.co/settings/tokens).', note: 'Search models, datasets, papers and Spaces.' },
  notionmcp: { group: 'Docs & knowledge', name: 'Notion (official server)', transport: 'stdio', command: 'npx', args: ['-y', '@notionhq/notion-mcp-server'], env: { NOTION_TOKEN: '<your Notion integration secret>' }, note: 'Full Notion access: pages, databases and comments. Needs Node.js.' },

  // ---------- Work & business ----------
  github: { group: 'Work & business', name: 'GitHub (official remote server)', transport: 'http', url: 'https://api.githubcopilot.com/mcp/', auth: true, authHelp: 'A GitHub personal access token.', note: 'Repositories, issues, pull requests, Actions and code search.' },
  zapier: { group: 'Work & business', name: 'Zapier (8,000+ apps)', transport: 'http', url: '', note: 'Paste your personal server address from mcp.zapier.com. Gives the AI the actions you choose there: Gmail, Google Sheets, Calendar, HubSpot and thousands more.' },
  hubspot: { group: 'Work & business', name: 'HubSpot CRM', transport: 'stdio', command: 'npx', args: ['-y', '@hubspot/mcp-server'], env: { PRIVATE_APP_ACCESS_TOKEN: '<your HubSpot private app token>' }, note: 'Contacts, companies, deals and tickets. Needs Node.js.' },
  stripe: { group: 'Work & business', name: 'Stripe', transport: 'http', url: 'https://mcp.stripe.com', auth: true, authHelp: 'A Stripe restricted API key (dashboard.stripe.com/apikeys). Start with read-only permissions.', note: 'Customers, payments, invoices and subscriptions.' },
  shopify: { group: 'Work & business', name: 'Shopify developer', transport: 'stdio', command: 'npx', args: ['-y', '@shopify/dev-mcp@latest'], note: 'Shopify docs and API schemas for building stores and apps. Needs Node.js.' },
  airtablemcp: { group: 'Work & business', name: 'Airtable (full)', transport: 'stdio', command: 'npx', args: ['-y', 'airtable-mcp-server'], env: { AIRTABLE_API_KEY: '<your Airtable token>' }, note: 'Read, create and update bases, tables and records. Needs Node.js.' },
  todoistmcp: { group: 'Work & business', name: 'Todoist (full)', transport: 'http', url: 'https://ai.todoist.net/mcp', auth: true, authHelp: 'Your Todoist API token.', note: 'Projects, sections, labels and tasks.' },

  // ---------- Data & cloud ----------
  sqlite: { group: 'Data & cloud', name: 'SQLite database', transport: 'stdio', command: 'uvx', args: ['mcp-server-sqlite', '--db-path', '<database file>'], note: 'Query and update a SQLite database. Needs uv (docs.astral.sh/uv).' },
  postgres: { group: 'Data & cloud', name: 'PostgreSQL', transport: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-postgres', '<postgresql://user:password@host/db>'], note: 'Read-only SQL queries and schema of a Postgres database. Needs Node.js.' },
  mongodb: { group: 'Data & cloud', name: 'MongoDB', transport: 'stdio', command: 'npx', args: ['-y', 'mongodb-mcp-server', '--connectionString', '<mongodb connection string>', '--readOnly'], note: 'Query collections and inspect schemas (read-only by default). Needs Node.js.' },
  supabase: { group: 'Data & cloud', name: 'Supabase', transport: 'stdio', command: 'npx', args: ['-y', '@supabase/mcp-server-supabase@latest', '--read-only', '--access-token', '<your Supabase access token>'], note: 'Tables, SQL, logs and edge functions of your Supabase projects. Needs Node.js.' },
  netlify: { group: 'Data & cloud', name: 'Netlify', transport: 'stdio', command: 'npx', args: ['-y', '@netlify/mcp'], note: 'Create, deploy and manage Netlify sites. Needs Node.js.' },
  kubernetes: { group: 'Data & cloud', name: 'Kubernetes', transport: 'stdio', command: 'npx', args: ['-y', 'mcp-server-kubernetes'], note: 'Inspect and manage clusters with your kubectl config. Needs Node.js.' },

  // ---------- Creative & media ----------
  blender: { group: 'Creative & media', name: 'Blender (3D)', transport: 'stdio', command: 'uvx', args: ['blender-mcp'], note: 'Build and edit 3D scenes in Blender by describing them. Needs uv and the Blender MCP add-on.' },
  figma: { group: 'Creative & media', name: 'Figma (desktop app)', transport: 'http', url: 'http://127.0.0.1:3845/mcp', note: 'Read designs, components and variables from the Figma desktop app. Turn on the MCP server in Figma\'s preferences first.' },
  elevenlabs: { group: 'Creative & media', name: 'ElevenLabs voices', transport: 'stdio', command: 'uvx', args: ['elevenlabs-mcp'], env: { ELEVENLABS_API_KEY: '<your ElevenLabs key>' }, note: 'Lifelike speech, voice changing and sound effects. Free monthly credits. Needs uv.' },

  // ---------- Home ----------
  homeassistantmcp: { group: 'Home', name: 'Home Assistant (official server)', transport: 'http', url: 'http://homeassistant.local:8123/api/mcp', auth: true, authHelp: 'A Home Assistant long-lived access token. Add the "Model Context Protocol Server" integration in Home Assistant first.', note: 'Control every device you expose to Assist.' },

  custom: { group: 'Your own', name: 'Custom MCP server', transport: 'http', url: '', note: 'Any MCP server: a command to run, or an https:// address.' },
};

// ---------- the official MCP Registry ----------
// Turns a registry entry into the details Quicksilver needs, or null if it can't be run simply.
function fromRegistry(item) {
  const s = item.server || item;
  const name = s.title || String(s.name || '').split('/').pop().replace(/[-_]/g, ' ');
  const remote = (s.remotes || []).find((r) => /streamable|http/i.test(r.type || r.transport_type || '') && /^https:\/\//.test(r.url || ''));
  const desc = String(s.description || '').slice(0, 220);
  if (remote) {
    const needsAuth = (remote.headers || []).some((h) => /authorization/i.test(h.name || ''));
    return { name, note: desc, transport: 'http', url: remote.url, auth: needsAuth, authHelp: needsAuth ? 'This server asks for an access token.' : undefined, source: s.name, version: s.version };
  }
  const pkg = (s.packages || []).find((p) => ['npm', 'pypi'].includes(p.registryType || p.registry_name || p.registry_type) && (!p.transport || /stdio/i.test(p.transport.type || p.transport)));
  if (!pkg) return null;
  const type = pkg.registryType || pkg.registry_name || pkg.registry_type;
  const id = pkg.identifier || pkg.name;
  const env = Object.fromEntries((pkg.environmentVariables || pkg.environment_variables || []).filter((e) => e.isRequired || e.is_required).map((e) => [e.name, `<${e.description || e.name}>`.slice(0, 120)]));
  const extra = (pkg.packageArguments || pkg.package_arguments || []).filter((a) => (a.isRequired || a.is_required) && a.type === 'positional').map((a) => `<${a.valueHint || a.value_hint || a.description || 'value'}>`);
  return type === 'npm'
    ? { name, note: `${desc} Needs Node.js.`, transport: 'stdio', command: 'npx', args: ['-y', id, ...extra], env, source: s.name, version: s.version }
    : { name, note: `${desc} Needs uv.`, transport: 'stdio', command: 'uvx', args: [id, ...extra], env, source: s.name, version: s.version };
}

async function searchRegistry(query) {
  const url = `https://registry.modelcontextprotocol.io/v0/servers?limit=60${query ? `&search=${encodeURIComponent(query)}` : ''}`;
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'Quicksilver' }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`The MCP Registry returned HTTP ${res.status}.`);
  const data = await res.json();
  const seen = new Set();
  return (data.servers || []).map(fromRegistry).filter((x) => x && !seen.has(x.source) && seen.add(x.source));
}

module.exports = { PRESETS, fromRegistry, searchRegistry };
