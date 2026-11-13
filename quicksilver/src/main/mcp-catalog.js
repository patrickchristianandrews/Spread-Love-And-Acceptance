// Ready-made MCP servers, grouped by kind. Picking one fills in the details; anything in <angle
// brackets> (a folder, a key) is asked for before it connects. Local servers need Node.js (npx)
// or uv (uvx); remote ones are just an address. Plus a search of the official MCP Registry, so
// any of the thousands of public servers can be added in one click.

const PRESETS = {
  // ---------- Files & your PC ----------
  filesystem: { group: 'Files & your PC', name: 'Files on this PC', transport: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem', '<folder>'], note: 'Read and write files in a folder you choose. Needs Node.js (nodejs.org).', askFolder: true },
  desktop: { group: 'Files & your PC', name: 'Desktop Commander', transport: 'stdio', command: 'npx', args: ['-y', '@wonderwhy-er/desktop-commander'], note: 'Run commands, search and edit files across your PC. Powerful: keep approvals on. Node.js is fetched by Quicksilver if needed.' },
  git: { group: 'Files & your PC', name: 'Git repository', transport: 'stdio', command: 'uvx', args: ['mcp-server-git', '--repository', '<folder>'], note: 'History, diffs, branches and commits of a local repository. uv is fetched by Quicksilver if needed.', askFolder: true },
  excel: { liquid: true, when: /\b(excel|xlsx|workbook|spreadsheet file|\.xls)\b/i, group: 'Files & your PC', name: 'Excel workbooks', transport: 'stdio', command: 'uvx', args: ['excel-mcp-server', 'stdio'], note: 'Create and edit .xlsx files: sheets, formulas, formatting and charts. uv is fetched by Quicksilver if needed.' },
  time: { group: 'Files & your PC', name: 'Time and time zones', transport: 'stdio', command: 'uvx', args: ['mcp-server-time'], note: 'The current time anywhere, and time-zone conversions. uv is fetched by Quicksilver if needed.' },
  memory: { group: 'Files & your PC', name: 'Long-term memory', transport: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-memory'], note: 'A knowledge graph the AI can remember facts in across chats. Node.js is fetched by Quicksilver if needed.' },
  thinking: { group: 'Files & your PC', name: 'Step-by-step thinking', transport: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-sequential-thinking'], note: 'Helps models plan and revise their reasoning on hard problems. Node.js is fetched by Quicksilver if needed.' },

  // ---------- Web & search ----------
  playwright: { liquid: true, when: /\b(click|fill (in|out)|log ?in to|sign ?up (on|for)|book (a|the)|automate|browse to|in (a|the) browser|on the website|step through|end-to-end|e2e)\b/i, group: 'Web & search', name: 'Web browser (Playwright)', transport: 'stdio', command: 'npx', args: ['-y', '@playwright/mcp@latest'], note: 'Lets models open and read web pages and fill in forms. Node.js is fetched by Quicksilver if needed.' },
  chromedev: { liquid: true, when: /\b(devtools|performance trace|network (tab|requests)|console errors?|why is (my|the) (site|page) slow|lcp|cls|inp)\b/i, group: 'Web & search', name: 'Chrome DevTools', transport: 'stdio', command: 'npx', args: ['-y', 'chrome-devtools-mcp@latest'], note: 'Control Chrome, inspect pages, network and performance. Needs Node.js and Chrome.' },
  fetch: { group: 'Web & search', name: 'Fetch web pages', transport: 'stdio', command: 'uvx', args: ['mcp-server-fetch'], note: 'Fetches any URL as clean text. uv is fetched by Quicksilver if needed.' },
  brave: { group: 'Web & search', name: 'Brave Search', transport: 'stdio', command: 'npx', args: ['-y', '@brave/brave-search-mcp-server'], env: { BRAVE_API_KEY: '<your Brave Search key>' }, note: 'Web, news and image search. Free tier with a key from brave.com/search/api. Node.js is fetched by Quicksilver if needed.' },
  tavily: { group: 'Web & search', name: 'Tavily search', transport: 'stdio', command: 'npx', args: ['-y', 'tavily-mcp@latest'], env: { TAVILY_API_KEY: '<your Tavily key>' }, note: 'Search built for AI, with extraction. Free monthly credits (tavily.com). Node.js is fetched by Quicksilver if needed.' },
  exa: { group: 'Web & search', name: 'Exa search', transport: 'http', url: 'https://mcp.exa.ai/mcp', note: 'Neural web search, code search and company research. Free to try.' },
  firecrawl: { group: 'Web & search', name: 'Firecrawl', transport: 'stdio', command: 'npx', args: ['-y', 'firecrawl-mcp'], env: { FIRECRAWL_API_KEY: '<your Firecrawl key>' }, note: 'Scrape and crawl whole websites into clean text. Free credits (firecrawl.dev). Node.js is fetched by Quicksilver if needed.' },
  apify: { group: 'Web & search', name: 'Apify (web scrapers)', transport: 'stdio', command: 'npx', args: ['-y', '@apify/actors-mcp-server'], env: { APIFY_TOKEN: '<your Apify token>' }, note: 'Thousands of ready-made scrapers: Google Maps, Amazon, Instagram and more. Free monthly credit. Node.js is fetched by Quicksilver if needed.' },

  // ---------- Docs & knowledge ----------
  context7: { group: 'Docs & knowledge', name: 'Up-to-date code docs (Context7)', transport: 'http', url: 'https://mcp.context7.com/mcp', note: 'Current documentation for thousands of libraries, so code answers use today\'s APIs. Free, no key.' },
  mslearn: { liquid: true, when: /\b(microsoft|azure|\.net|c#|powershell|windows server|sharepoint|power (bi|automate|apps)|entra|intune)\b/i, group: 'Docs & knowledge', name: 'Microsoft Learn docs', transport: 'http', url: 'https://learn.microsoft.com/api/mcp', note: 'Official Microsoft and Azure documentation. Free, no key.' },
  cfdocs: { liquid: true, when: /\b(cloudflare|workers?\.dev|wrangler|r2 bucket|durable objects?|cloudflare pages)\b/i, group: 'Docs & knowledge', name: 'Cloudflare docs', transport: 'http', url: 'https://docs.mcp.cloudflare.com/mcp', note: 'Cloudflare documentation. Free, no key.' },
  awsdocs: { group: 'Docs & knowledge', name: 'AWS documentation', transport: 'stdio', command: 'uvx', args: ['awslabs.aws-documentation-mcp-server@latest'], note: 'Search and read AWS docs. uv is fetched by Quicksilver if needed.' },
  huggingface: { group: 'Docs & knowledge', name: 'Hugging Face', transport: 'http', url: 'https://huggingface.co/mcp', auth: true, authHelp: 'A Hugging Face access token (huggingface.co/settings/tokens).', note: 'Search models, datasets, papers and Spaces.' },
  notionmcp: { group: 'Docs & knowledge', name: 'Notion (official server)', transport: 'stdio', command: 'npx', args: ['-y', '@notionhq/notion-mcp-server'], env: { NOTION_TOKEN: '<your Notion integration secret>' }, note: 'Full Notion access: pages, databases and comments. Node.js is fetched by Quicksilver if needed.' },

  // ---------- Work & business ----------
  github: { group: 'Work & business', name: 'GitHub (official remote server)', transport: 'http', url: 'https://api.githubcopilot.com/mcp/', auth: true, authHelp: 'A GitHub personal access token.', note: 'Repositories, issues, pull requests, Actions and code search.' },
  zapier: { group: 'Work & business', name: 'Zapier (8,000+ apps)', transport: 'http', url: '', note: 'Paste your personal server address from mcp.zapier.com. Gives the AI the actions you choose there: Gmail, Google Sheets, Calendar, HubSpot and thousands more.' },
  hubspot: { group: 'Work & business', name: 'HubSpot CRM', transport: 'stdio', command: 'npx', args: ['-y', '@hubspot/mcp-server'], env: { PRIVATE_APP_ACCESS_TOKEN: '<your HubSpot private app token>' }, note: 'Contacts, companies, deals and tickets. Node.js is fetched by Quicksilver if needed.' },
  stripe: { group: 'Work & business', name: 'Stripe', transport: 'http', url: 'https://mcp.stripe.com', auth: true, authHelp: 'A Stripe restricted API key (dashboard.stripe.com/apikeys). Start with read-only permissions.', note: 'Customers, payments, invoices and subscriptions.' },
  shopify: { group: 'Work & business', name: 'Shopify developer', transport: 'stdio', command: 'npx', args: ['-y', '@shopify/dev-mcp@latest'], note: 'Shopify docs and API schemas for building stores and apps. Node.js is fetched by Quicksilver if needed.' },
  airtablemcp: { group: 'Work & business', name: 'Airtable (full)', transport: 'stdio', command: 'npx', args: ['-y', 'airtable-mcp-server'], env: { AIRTABLE_API_KEY: '<your Airtable token>' }, note: 'Read, create and update bases, tables and records. Node.js is fetched by Quicksilver if needed.' },
  todoistmcp: { group: 'Work & business', name: 'Todoist (full)', transport: 'http', url: 'https://ai.todoist.net/mcp', auth: true, authHelp: 'Your Todoist API token.', note: 'Projects, sections, labels and tasks.' },

  // ---------- Data & cloud ----------
  sqlite: { group: 'Data & cloud', name: 'SQLite database', transport: 'stdio', command: 'uvx', args: ['mcp-server-sqlite', '--db-path', '<database file>'], note: 'Query and update a SQLite database. Needs uv (docs.astral.sh/uv).' },
  postgres: { group: 'Data & cloud', name: 'PostgreSQL', transport: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-postgres', '<postgresql://user:password@host/db>'], note: 'Read-only SQL queries and schema of a Postgres database. Node.js is fetched by Quicksilver if needed.' },
  mongodb: { group: 'Data & cloud', name: 'MongoDB', transport: 'stdio', command: 'npx', args: ['-y', 'mongodb-mcp-server', '--connectionString', '<mongodb connection string>', '--readOnly'], note: 'Query collections and inspect schemas (read-only by default). Node.js is fetched by Quicksilver if needed.' },
  supabase: { group: 'Data & cloud', name: 'Supabase', transport: 'stdio', command: 'npx', args: ['-y', '@supabase/mcp-server-supabase@latest', '--read-only', '--access-token', '<your Supabase access token>'], note: 'Tables, SQL, logs and edge functions of your Supabase projects. Node.js is fetched by Quicksilver if needed.' },
  netlify: { group: 'Data & cloud', name: 'Netlify', transport: 'stdio', command: 'npx', args: ['-y', '@netlify/mcp'], note: 'Create, deploy and manage Netlify sites. Node.js is fetched by Quicksilver if needed.' },
  kubernetes: { group: 'Data & cloud', name: 'Kubernetes', transport: 'stdio', command: 'npx', args: ['-y', 'mcp-server-kubernetes'], note: 'Inspect and manage clusters with your kubectl config. Node.js is fetched by Quicksilver if needed.' },

  // ---------- Creative & media ----------
  // Imagination Studio (github.com/drowzeys/Imagination-Studio-by-keys-Wasserman): a local film
  // studio for big machines (DGX Spark, RTX Spark, 96 GB+ Macs). Its MCP server is a small Python
  // script that talks to the running Studio at 127.0.0.1:7870: stills, clips with sound, voices,
  // songs, edits, a whole film from a logline, and export. 46 tools.
  imagination: { group: 'Creative & media', name: 'Imagination Studio (film studio)', transport: 'stdio', command: process.platform === 'win32' ? 'python' : 'python3', args: ['<full path to mcp/studio-mcp.py in your Imagination Studio folder>'], env: { STUDIO_URL: 'http://127.0.0.1:7870' },
    note: 'Lets chat drive Imagination Studio: pictures, video with sound, voices, songs, editing and whole films from a one-line idea. Imagination Studio must be installed and running (it needs a very powerful machine). Needs Python 3.10 or newer.' },
  blender: { group: 'Creative & media', name: 'Blender (3D)', transport: 'stdio', command: 'uvx', args: ['blender-mcp'], note: 'Build and edit 3D scenes in Blender by describing them. Needs uv and the Blender MCP add-on.' },
  figma: { group: 'Creative & media', name: 'Figma (desktop app)', transport: 'http', url: 'http://127.0.0.1:3845/mcp', note: 'Read designs, components and variables from the Figma desktop app. Turn on the MCP server in Figma\'s preferences first.' },
  elevenlabs: { group: 'Creative & media', name: 'ElevenLabs voices', transport: 'stdio', command: 'uvx', args: ['elevenlabs-mcp'], env: { ELEVENLABS_API_KEY: '<your ElevenLabs key>' }, note: 'Lifelike speech, voice changing and sound effects. Free monthly credits. uv is fetched by Quicksilver if needed.' },

  // ---------- Build & ship ----------
  // (Quicksilver's own App tester, Design extractor, Security audit and Code docs are built in:
  // Connectors → Build & ship. These add the services an app is built on.)
  semgrep: { liquid: true, when: /\b(semgrep|static analysis|scan (my|the|this) code|code scanning|owasp)\b/i, group: 'Build & ship', name: 'Semgrep (security scanner)', transport: 'stdio', command: 'uvx', args: ['semgrep-mcp'], note: 'Scans code for security bugs with thousands of open rules (OWASP Top 10, secrets, injection), deeper than a checklist. Free. uv is fetched by Quicksilver if needed.' },
  sentry: { group: 'Build & ship', name: 'Sentry (errors in production)', transport: 'stdio', command: 'npx', args: ['-y', '@sentry/mcp-server@latest'], env: { SENTRY_ACCESS_TOKEN: '<your Sentry user auth token>' }, note: 'Read the crashes and errors your users hit, with stack traces, so the AI can fix the real cause. Token: sentry.io → Settings → Auth Tokens. Node.js is fetched by Quicksilver if needed.' },
  firebase: { group: 'Build & ship', name: 'Firebase', transport: 'stdio', command: 'npx', args: ['-y', 'firebase-tools@latest', 'mcp'], note: 'Manage Firebase projects, Firestore, Auth users, security rules and hosting. Sign in once with "npx firebase-tools login". Node.js is fetched by Quicksilver if needed.' },
  prisma: { group: 'Build & ship', name: 'Prisma (database schema)', transport: 'stdio', command: 'npx', args: ['-y', 'prisma', 'mcp'], note: 'Check migration status, create and run migrations, and open Prisma Studio for the project in this folder. Node.js is fetched by Quicksilver if needed.' },
  neon: { group: 'Build & ship', name: 'Neon Postgres', transport: 'stdio', command: 'npx', args: ['-y', '@neondatabase/mcp-server-neon', 'start', '<your Neon API key>'], note: 'Create and query serverless Postgres databases and branches. Free plan. Key: console.neon.tech → Account → API keys. Node.js is fetched by Quicksilver if needed.' },
  heroku: { group: 'Build & ship', name: 'Heroku', transport: 'stdio', command: 'npx', args: ['-y', '@heroku/mcp-server'], env: { HEROKU_API_KEY: '<your Heroku API key>' }, note: 'Deploy and manage Heroku apps, add-ons, logs and scaling. Node.js is fetched by Quicksilver if needed.' },
  docker: { group: 'Build & ship', name: 'Docker (MCP Toolkit)', transport: 'stdio', command: 'docker', args: ['mcp', 'gateway', 'run'], note: 'Every server you enable in Docker Desktop\'s MCP Toolkit, each in its own container. Needs Docker Desktop with the MCP Toolkit turned on.' },
  puppeteer: { group: 'Build & ship', name: 'Puppeteer (browser automation)', transport: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-puppeteer'], note: 'Drive a real Chrome: click, type, fill forms and take screenshots, to test sign-up and checkout flows step by step. Node.js is fetched by Quicksilver if needed.' },

  // ---------- Your PC & phone ----------
  windows: { group: 'Your PC & phone', name: 'Windows control', transport: 'stdio', command: 'uvx', args: ['windows-mcp'], note: 'Lets the AI use Windows apps for you: open programs, click, type, read the screen, manage windows. Asks before each action. uv is fetched by Quicksilver if needed.' },
  mobile: { group: 'Your PC & phone', name: 'Phone control (Android and iPhone)', transport: 'stdio', command: 'npx', args: ['-y', '@mobilenext/mobile-mcp@latest'], note: 'Test and use apps on an Android phone or emulator, or an iPhone simulator: tap, type, swipe and read the screen. Needs the Android or Xcode tools; Node.js is fetched by Quicksilver if needed.' },

  // ---------- Research & learning ----------
  duckduckgo: { group: 'Research & learning', name: 'DuckDuckGo search', transport: 'stdio', command: 'uvx', args: ['duckduckgo-mcp-server'], note: 'Private web search and page reading. Free, no key, no account. uv is fetched by Quicksilver if needed.' },
  arxiv: { group: 'Research & learning', name: 'arXiv papers', transport: 'stdio', command: 'uvx', args: ['arxiv-mcp-server'], note: 'Search, download and read research papers from arXiv. Free. uv is fetched by Quicksilver if needed.' },
  ytranscript: { liquid: true, when: /\b(youtube|youtu\.be|video transcript|transcript of (the|this|that) video)\b/i, group: 'Research & learning', name: 'YouTube transcripts', transport: 'stdio', command: 'npx', args: ['-y', '@kimtaeyoon83/mcp-server-youtube-transcript'], note: 'Reads the transcript of a YouTube video, so you can ask for a summary, notes or quotes. Free, no key. Node.js is fetched by Quicksilver if needed.' },

  // ---------- Office ----------
  word: { liquid: true, when: /\b(word (document|doc|file)|docx|\.doc\b|track(ed)? changes)\b/i, group: 'Office', name: 'Word documents', transport: 'stdio', command: 'uvx', args: ['--from', 'office-word-mcp-server', 'word_mcp_server'], note: 'Create and edit .docx files: headings, tables, images, styles, comments and find-and-replace. Free. uv is fetched by Quicksilver if needed.' },
  powerpoint: { liquid: true, when: /\b(powerpoint|pptx|slide ?deck file|\.ppt)\b/i, group: 'Office', name: 'PowerPoint decks', transport: 'stdio', command: 'uvx', args: ['--from', 'office-powerpoint-mcp-server', 'ppt_mcp_server'], note: 'Create and edit .pptx presentations: slides, layouts, charts, tables and images. Free. uv is fetched by Quicksilver if needed.' },

  // ---------- Money ----------
  coingecko: { group: 'Money', name: 'CoinGecko (crypto prices)', transport: 'http', url: 'https://mcp.api.coingecko.com/mcp', note: 'Live and historical prices, market caps and trends for 15,000+ coins. Free public server, no key.' },
  alphavantage: { group: 'Money', name: 'Alpha Vantage (stocks and forex)', transport: 'http', url: 'https://mcp.alphavantage.co/mcp?apikey=<your Alpha Vantage key>', note: 'Stock quotes, company fundamentals, forex, economic indicators and technical analysis. Free key at alphavantage.co.' },

  // ---------- More creative tools ----------
  ableton: { group: 'Creative & media', name: 'Ableton Live (music)', transport: 'stdio', command: 'uvx', args: ['ableton-mcp'], note: 'Make music in Ableton Live from chat: tracks, MIDI clips, instruments and effects, playback. Needs Ableton Live with the AbletonMCP remote script, and uv (fetched by Quicksilver if needed).' },
  godot: { group: 'Creative & media', name: 'Godot (game engine)', transport: 'stdio', command: 'npx', args: ['-y', '@coding-solo/godot-mcp'], env: { GODOT_PATH: '<path to your Godot executable>' }, note: 'Run Godot projects, read debug output, create scenes and add nodes, for the game-development stacks. Needs Godot; Node.js is fetched by Quicksilver if needed.' },

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
    ? { name, note: `${desc} Node.js is fetched by Quicksilver if needed.`, transport: 'stdio', command: 'npx', args: ['-y', id, ...extra], env, source: s.name, version: s.version }
    : { name, note: `${desc} uv is fetched by Quicksilver if needed.`, transport: 'stdio', command: 'uvx', args: [id, ...extra], env, source: s.name, version: s.version };
}

async function searchRegistry(query) {
  const url = `https://registry.modelcontextprotocol.io/v0/servers?limit=60${query ? `&search=${encodeURIComponent(query)}` : ''}`;
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'Quicksilver' }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`The MCP Registry returned HTTP ${res.status}.`);
  const data = await res.json();
  const seen = new Set();
  return (data.servers || []).map(fromRegistry).filter((x) => x && !seen.has(x.source) && seen.add(x.source));
}

// The free extras that come with every Liquid Edition: no account, no key; each is only started
// when a message needs it (its `when`).
const LIQUID_PACK = Object.entries(PRESETS).filter(([, p]) => p.liquid).map(([id]) => id);

module.exports = { PRESETS, LIQUID_PACK, fromRegistry, searchRegistry };
