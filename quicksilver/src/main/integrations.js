// Built-in connectors (GitHub, Notion, Slack, Jira, Linear, plus the ones in integrations-more.js:
// weather, Wikipedia, calendar, news, notes, Todoist, Trello, Asana, Airtable, GitLab, Confluence,
// Home Assistant, Discord, Telegram and webhooks). Each gives models tools they can use
// during a chat. Tools marked `write` change something, so they always ask you first.
// Tokens are stored encrypted on this PC and only sent to that service.
const store = require('./store');

const CONNECTORS = {
  github: {
    name: 'GitHub', icon: '🐙', group: 'Developer', blurb: 'Code, issues and pull requests.',
    fields: [{ key: 'token', label: 'Personal access token', secret: true, help: 'Create one at github.com/settings/tokens (fine-grained, with read access to the repositories you want, plus Issues: write to create issues).', url: 'https://github.com/settings/personal-access-tokens' }],
  },
  notion: {
    name: 'Notion', icon: '📓', group: 'Notes & knowledge', blurb: 'Search, read and create pages.',
    fields: [{ key: 'token', label: 'Internal integration secret', secret: true, help: 'Create an integration at notion.so/my-integrations, then share the pages you want with it (••• → Connections).', url: 'https://www.notion.so/my-integrations' }],
  },
  slack: {
    name: 'Slack', icon: '💬', group: 'Messaging & automation', blurb: 'Read channels and post messages.',
    fields: [{ key: 'token', label: 'Bot token (xoxb-…)', secret: true, help: 'Create a Slack app at api.slack.com/apps with scopes channels:read, channels:history and chat:write, install it, then invite it to channels.', url: 'https://api.slack.com/apps' }],
  },
  jira: {
    name: 'Jira', icon: '🧭', group: 'Tasks & projects', blurb: 'Search, read, create and comment on issues.',
    fields: [
      { key: 'site', label: 'Site', placeholder: 'yourcompany.atlassian.net' },
      { key: 'email', label: 'Account email' },
      { key: 'token', label: 'API token', secret: true, help: 'Create one at id.atlassian.com/manage-profile/security/api-tokens.', url: 'https://id.atlassian.com/manage-profile/security/api-tokens' },
    ],
  },
  linear: {
    name: 'Linear', icon: '📐', group: 'Tasks & projects', blurb: 'Search and create issues.',
    fields: [{ key: 'token', label: 'Personal API key', secret: true, help: 'Linear → Settings → Security & access → Personal API keys.', url: 'https://linear.app/settings/account/security' }],
  },
};

// ---------- config ----------

function cfg() { return store.config().integrations || {}; }
// On or off: what you chose, else the connector's default (the built-in Build & ship plug-ins are on).
const isOn = (id, c = cfg()) => (typeof c[id]?.enabled === 'boolean' ? c[id].enabled : Boolean(CONNECTORS[id]?.defaultOn));
const secret = (id) => store.getSecret(`int:${id}`);

function list() {
  const c = cfg();
  return Object.entries(CONNECTORS).map(([id, def]) => ({
    id, ...def, when: def.when ? def.when.source : undefined, whenFlags: def.when ? def.when.flags : undefined, enabled: isOn(id, c), values: Object.fromEntries(def.fields.filter((f) => !f.secret).map((f) => [f.key, c[id]?.[f.key] || (def.google && f.key === 'client' ? google.clientOf(id).id || '' : '')])),
    hasToken: def.google ? google.hasClient(id) : def.oauth ? Boolean(c[id]?.client) : store.hasSecret(`int:${id}`), signInNeeded: Boolean(def.oauth), account: c[id]?.account || '', noToken: Boolean(def.noToken), group: def.group || 'Other',
  }));
}

async function save(id, values, token) {
  if (!CONNECTORS[id]) throw new Error('Unknown integration.');
  const was = isOn(id);
  const oldToken = token && store.hasSecret(`int:${id}`) ? store.getSecret(`int:${id}`) : '';
  if (token) store.setSecret(`int:${id}`, token.trim());
  const c = cfg();
  // What you typed is saved (the test needs it), but it only counts as connected once the test
  // passes: a mistyped key or a cancelled sign-in must not leave a green "connected".
  c[id] = { ...(c[id] || {}), ...values, enabled: was };
  store.saveConfig({ integrations: c });
  let account;
  try { account = await test(id); } catch (err) {
    if (token && !was) store.setSecret(`int:${id}`, oldToken); // a key that did not work is not kept
    throw err;
  }
  const after = cfg(); // test() may have changed other connectors (Google: every service)
  after[id] = { ...(after[id] || c[id]), account, enabled: true };
  store.saveConfig({ integrations: after });
  return account;
}

function disable(id) {
  if (google.isGoogle(id)) google.forget(id);
  popular.forget(id);
  const c = cfg();
  delete c[id];
  if (CONNECTORS[id]?.defaultOn) c[id] = { enabled: false }; // a plug-in that is on by default stays off once you switch it off
  store.saveConfig({ integrations: c });
  store.setSecret(`int:${id}`, '');
}

// ---------- HTTP helpers ----------

async function http(url, { method = 'GET', headers = {}, body, raw = false } = {}) {
  const res = await fetch(url, { method, headers: { 'User-Agent': 'Quicksilver', ...headers, ...(body && !(body instanceof Buffer) ? { 'Content-Type': 'application/json' } : {}) }, body: body ? (typeof body === 'string' || body instanceof Buffer ? body : JSON.stringify(body)) : undefined, signal: AbortSignal.timeout(30000) });
  if (raw) return res;
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = text; }
  if (!res.ok) {
    const msg = data?.message || data?.error?.message || data?.errorMessages?.join(' ') || data?.error || (typeof data === 'string' ? data.slice(0, 200) : '') || res.statusText;
    throw new Error(`${res.status} ${msg}`);
  }
  return data;
}
const clip = (s, n = 12000) => { s = typeof s === 'string' ? s : JSON.stringify(s, null, 1); return s.length > n ? `${s.slice(0, n)}\n…(truncated)` : s; };

// ---------- GitHub ----------

const gh = (path, opts = {}) => http(`https://api.github.com${path}`, { ...opts, headers: { Authorization: `Bearer ${secret('github')}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opts.headers || {}) } });
const repoArg = { type: 'string', description: 'Repository as owner/name, e.g. octocat/hello-world' };

const GITHUB_TOOLS = [
  { name: 'github_my_repos', description: 'List repositories the user can access, most recently updated first.', parameters: { type: 'object', properties: {} },
    run: async () => (await gh('/user/repos?per_page=50&sort=updated').catch(async (err) => { if (!/^40[13]/.test(err.message)) throw err; return (await gh('/installation/repositories?per_page=50')).repositories; })).map((r) => `${r.full_name}${r.private ? ' (private)' : ''}: ${r.description || ''}`).join('\n') },
  { name: 'github_search_repos', description: 'Search public GitHub repositories.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    run: async ({ query }) => (await gh(`/search/repositories?per_page=10&q=${encodeURIComponent(query)}`)).items.map((r) => `${r.full_name} ★${r.stargazers_count}: ${r.description || ''}`).join('\n') },
  { name: 'github_list_files', description: 'List files and folders at a path in a repository.', parameters: { type: 'object', properties: { repo: repoArg, path: { type: 'string', description: 'Folder path; empty for the root' } }, required: ['repo'] },
    run: async ({ repo, path = '' }) => { const d = await gh(`/repos/${repo}/contents/${path.replace(/^\/+/, '')}`); return Array.isArray(d) ? d.map((f) => `${f.type === 'dir' ? '📁' : '📄'} ${f.path}`).join('\n') : `${d.path} is a file.`; } },
  { name: 'github_read_file', description: 'Read a file from a repository.', parameters: { type: 'object', properties: { repo: repoArg, path: { type: 'string' }, ref: { type: 'string', description: 'Branch, tag or commit (optional)' } }, required: ['repo', 'path'] },
    run: async ({ repo, path, ref }) => { const d = await gh(`/repos/${repo}/contents/${path.replace(/^\/+/, '')}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`); return clip(Buffer.from(d.content || '', 'base64').toString('utf8'), 20000); } },
  { name: 'github_search_code', description: 'Search code on GitHub, optionally within one repository.', parameters: { type: 'object', properties: { query: { type: 'string' }, repo: repoArg }, required: ['query'] },
    run: async ({ query, repo }) => (await gh(`/search/code?per_page=15&q=${encodeURIComponent(`${query}${repo ? ` repo:${repo}` : ''}`)}`)).items.map((i) => `${i.repository.full_name}/${i.path}`).join('\n') || 'No results.' },
  { name: 'github_list_issues', description: 'List issues in a repository.', parameters: { type: 'object', properties: { repo: repoArg, state: { type: 'string', enum: ['open', 'closed', 'all'] }, labels: { type: 'string', description: 'Comma-separated labels (optional)' } }, required: ['repo'] },
    run: async ({ repo, state = 'open', labels }) => (await gh(`/repos/${repo}/issues?per_page=30&state=${state}${labels ? `&labels=${encodeURIComponent(labels)}` : ''}`)).filter((i) => !i.pull_request).map((i) => `#${i.number} [${i.state}] ${i.title} (${i.user.login}, ${i.comments} comments${i.labels.length ? `, labels: ${i.labels.map((l) => l.name).join(', ')}` : ''})`).join('\n') || 'No issues.' },
  { name: 'github_get_issue', description: 'Read an issue or pull request and its comments.', parameters: { type: 'object', properties: { repo: repoArg, number: { type: 'integer' } }, required: ['repo', 'number'] },
    run: async ({ repo, number }) => { const i = await gh(`/repos/${repo}/issues/${number}`); const c = await gh(`/repos/${repo}/issues/${number}/comments?per_page=30`); return clip(`#${i.number} ${i.title} [${i.state}] by ${i.user.login}\n\n${i.body || ''}\n\n${c.map((x) => `--- ${x.user.login}:\n${x.body}`).join('\n\n')}`); } },
  { name: 'github_list_pulls', description: 'List pull requests in a repository.', parameters: { type: 'object', properties: { repo: repoArg, state: { type: 'string', enum: ['open', 'closed', 'all'] } }, required: ['repo'] },
    run: async ({ repo, state = 'open' }) => (await gh(`/repos/${repo}/pulls?per_page=30&state=${state}`)).map((p) => `#${p.number} ${p.title} (${p.user.login}, ${p.head.ref} → ${p.base.ref})`).join('\n') || 'No pull requests.' },
  { name: 'github_get_pull_diff', description: 'Get the changes (diff) of a pull request.', parameters: { type: 'object', properties: { repo: repoArg, number: { type: 'integer' } }, required: ['repo', 'number'] },
    run: async ({ repo, number }) => { const p = await gh(`/repos/${repo}/pulls/${number}`); const res = await gh(`/repos/${repo}/pulls/${number}`, { headers: { Accept: 'application/vnd.github.diff' }, raw: true }); return clip(`#${p.number} ${p.title}\n${p.body || ''}\n\n${await res.text()}`, 24000); } },
  { name: 'github_create_issue', write: true, description: 'Create a new issue in a repository.', parameters: { type: 'object', properties: { repo: repoArg, title: { type: 'string' }, body: { type: 'string' }, labels: { type: 'array', items: { type: 'string' } } }, required: ['repo', 'title'] },
    summary: (a) => `Create issue in ${a.repo}: "${a.title}"`,
    run: async ({ repo, title, body = '', labels }) => { const i = await gh(`/repos/${repo}/issues`, { method: 'POST', body: { title, body, ...(labels?.length ? { labels } : {}) } }); return `Created issue #${i.number}: ${i.html_url}`; } },
  { name: 'github_comment', write: true, description: 'Add a comment to an issue or pull request.', parameters: { type: 'object', properties: { repo: repoArg, number: { type: 'integer' }, body: { type: 'string' } }, required: ['repo', 'number', 'body'] },
    summary: (a) => `Comment on ${a.repo}#${a.number}`,
    run: async ({ repo, number, body }) => { const c = await gh(`/repos/${repo}/issues/${number}/comments`, { method: 'POST', body: { body } }); return `Comment added: ${c.html_url}`; } },
];

// Downloads a repository's text files (for importing into a knowledge base).
async function githubRepoFiles(repo, { maxFiles = 400 } = {}) {
  const info = await gh(`/repos/${repo}`);
  const tree = await gh(`/repos/${repo}/git/trees/${encodeURIComponent(info.default_branch)}?recursive=1`);
  const wanted = tree.tree.filter((t) => t.type === 'blob' && t.size < 400000 && /\.(md|mdx|txt|rst|adoc|js|jsx|ts|tsx|py|java|kt|go|rs|rb|php|cs|c|cc|cpp|h|hpp|swift|scala|sql|sh|ps1|yaml|yml|toml|json|html|css|scss|vue|svelte)$/i.test(t.path) && !/(^|\/)(node_modules|vendor|dist|build|\.git)\//.test(t.path) && !/package-lock\.json$|yarn\.lock$/.test(t.path))
    .sort((a, b) => (/readme|docs?\//i.test(b.path) ? 1 : 0) - (/readme|docs?\//i.test(a.path) ? 1 : 0))
    .slice(0, maxFiles);
  const out = [];
  for (const f of wanted) {
    const blob = await gh(`/repos/${repo}/git/blobs/${f.sha}`);
    out.push({ path: f.path, url: `${info.html_url}/blob/${info.default_branch}/${f.path}`, text: Buffer.from(blob.content || '', 'base64').toString('utf8') });
  }
  return out;
}

// ---------- Notion ----------

const nt = (path, opts = {}) => http(`https://api.notion.com/v1${path}`, { ...opts, headers: { Authorization: `Bearer ${secret('notion')}`, 'Notion-Version': '2022-06-28' } });
const richText = (rt) => (rt || []).map((t) => t.plain_text).join('');
const pageTitle = (p) => { const t = Object.values(p.properties || {}).find((x) => x.type === 'title'); return richText(t?.title) || 'Untitled'; };

async function notionBlocks(id, depth = 0) {
  const lines = [];
  let cursor;
  do {
    const r = await nt(`/blocks/${id}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`);
    for (const b of r.results) {
      const v = b[b.type] || {};
      const txt = richText(v.rich_text);
      const pre = { heading_1: '# ', heading_2: '## ', heading_3: '### ', bulleted_list_item: '- ', numbered_list_item: '1. ', to_do: v.checked ? '- [x] ' : '- [ ] ', quote: '> ' }[b.type] || '';
      if (b.type === 'code') lines.push(`\`\`\`\n${txt}\n\`\`\``);
      else if (b.type === 'child_page') lines.push(`[Sub-page: ${v.title}]`);
      else if (txt) lines.push(`${'  '.repeat(depth)}${pre}${txt}`);
      if (b.has_children && depth < 2 && b.type !== 'child_page') lines.push(...await notionBlocks(b.id, depth + 1));
    }
    cursor = r.has_more ? r.next_cursor : null;
  } while (cursor && lines.length < 2000);
  return lines;
}

function mdToNotionBlocks(md) {
  return String(md || '').split('\n').filter((l) => l.trim()).slice(0, 100).map((line) => {
    let type = 'paragraph';
    let text = line;
    const m = line.match(/^(#{1,3})\s+(.*)/);
    if (m) { type = `heading_${m[1].length}`; text = m[2]; } else if (/^\s*[-*]\s+/.test(line)) { type = 'bulleted_list_item'; text = line.replace(/^\s*[-*]\s+/, ''); } else if (/^\s*\d+[.)]\s+/.test(line)) { type = 'numbered_list_item'; text = line.replace(/^\s*\d+[.)]\s+/, ''); }
    return { object: 'block', type, [type]: { rich_text: [{ type: 'text', text: { content: text.replace(/\*\*/g, '').slice(0, 1900) } }] } };
  });
}

const NOTION_TOOLS = [
  { name: 'notion_search', description: 'Search Notion pages and databases shared with the integration.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    run: async ({ query }) => (await nt('/search', { method: 'POST', body: { query, page_size: 15 } })).results.map((p) => `${p.object === 'database' ? '🗃️' : '📄'} ${p.object === 'database' ? richText(p.title) : pageTitle(p)} (id: ${p.id}) ${p.url}`).join('\n') || 'Nothing found. Make sure the pages are shared with the integration.' },
  { name: 'notion_read_page', description: 'Read the content of a Notion page.', parameters: { type: 'object', properties: { page_id: { type: 'string' } }, required: ['page_id'] },
    run: async ({ page_id }) => { const p = await nt(`/pages/${page_id}`); return clip(`# ${pageTitle(p)}\n${p.url}\n\n${(await notionBlocks(page_id)).join('\n')}`, 20000); } },
  { name: 'notion_create_page', write: true, description: 'Create a new Notion page under a parent page, with Markdown content.', parameters: { type: 'object', properties: { parent_page_id: { type: 'string' }, title: { type: 'string' }, content: { type: 'string', description: 'Markdown' } }, required: ['parent_page_id', 'title'] },
    summary: (a) => `Create Notion page "${a.title}"`,
    run: async ({ parent_page_id, title, content }) => { const p = await nt('/pages', { method: 'POST', body: { parent: { page_id: parent_page_id }, properties: { title: { title: [{ text: { content: title } }] } }, children: mdToNotionBlocks(content) } }); return `Created: ${p.url}`; } },
];

// ---------- Slack ----------

const sl = async (method, params = {}, post = false) => {
  const url = `https://slack.com/api/${method}${post ? '' : `?${new URLSearchParams(params)}`}`;
  const r = await http(url, { method: post ? 'POST' : 'GET', headers: { Authorization: `Bearer ${secret('slack')}`, ...(post ? { 'Content-Type': 'application/json; charset=utf-8' } : {}) }, body: post ? params : undefined });
  if (!r.ok) throw new Error(`Slack: ${r.error}`);
  return r;
};
const SLACK_TOOLS = [
  { name: 'slack_list_channels', description: 'List Slack channels the bot can see.', parameters: { type: 'object', properties: {} },
    run: async () => (await sl('conversations.list', { limit: 200, exclude_archived: true, types: 'public_channel,private_channel' })).channels.map((c) => `#${c.name} (id ${c.id})${c.is_member ? '' : ' (bot not a member)'}`).join('\n') },
  { name: 'slack_read_channel', description: 'Read recent messages from a Slack channel (by id or #name).', parameters: { type: 'object', properties: { channel: { type: 'string' }, limit: { type: 'integer' } }, required: ['channel'] },
    run: async ({ channel, limit = 30 }) => {
      let id = channel;
      if (!/^[CG][A-Z0-9]+$/.test(channel)) { const all = (await sl('conversations.list', { limit: 500, types: 'public_channel,private_channel' })).channels; id = all.find((c) => c.name === channel.replace(/^#/, ''))?.id; if (!id) throw new Error(`Channel ${channel} not found.`); }
      const r = await sl('conversations.history', { channel: id, limit: Math.min(100, limit) });
      return r.messages.reverse().map((m) => `[${new Date(Number(m.ts) * 1000).toISOString().slice(0, 16).replace('T', ' ')}] ${m.user || m.username || 'bot'}: ${m.text}`).join('\n');
    } },
  { name: 'slack_post_message', write: true, description: 'Post a message to a Slack channel.', parameters: { type: 'object', properties: { channel: { type: 'string', description: 'Channel id or #name' }, text: { type: 'string' } }, required: ['channel', 'text'] },
    summary: (a) => `Post to ${a.channel}: "${String(a.text).slice(0, 80)}"`,
    run: async ({ channel, text }) => { const r = await sl('chat.postMessage', { channel: channel.replace(/^#/, ''), text }, true); return `Posted (ts ${r.ts}).`; } },
];

// ---------- Jira ----------

const jr = (path, opts = {}) => { const c = cfg().jira || {}; return http(`https://${String(c.site).replace(/^https?:\/\//, '').replace(/\/+$/, '')}${path}`, { ...opts, headers: { Authorization: `Basic ${Buffer.from(`${c.email}:${secret('jira')}`).toString('base64')}`, Accept: 'application/json' } }); };
const adfText = (n) => (!n ? '' : n.text || (n.content || []).map(adfText).join(n.type === 'paragraph' ? '\n' : ''));
const adf = (text) => ({ type: 'doc', version: 1, content: String(text || '').split(/\n{2,}/).map((p) => ({ type: 'paragraph', content: [{ type: 'text', text: p }] })) });
const JIRA_TOOLS = [
  { name: 'jira_search', description: 'Search Jira issues with JQL, e.g. "project = ABC AND status != Done ORDER BY priority DESC".', parameters: { type: 'object', properties: { jql: { type: 'string' }, max: { type: 'integer' } }, required: ['jql'] },
    run: async ({ jql, max = 25 }) => (await jr('/rest/api/3/search/jql', { method: 'POST', body: { jql, maxResults: Math.min(50, max), fields: ['summary', 'status', 'assignee', 'priority', 'updated'] } })).issues.map((i) => `${i.key} [${i.fields.status?.name}] ${i.fields.summary} (${i.fields.assignee?.displayName || 'unassigned'}, ${i.fields.priority?.name || ''})`).join('\n') || 'No issues.' },
  { name: 'jira_get_issue', description: 'Read a Jira issue with its description and comments.', parameters: { type: 'object', properties: { key: { type: 'string' } }, required: ['key'] },
    run: async ({ key }) => { const i = await jr(`/rest/api/3/issue/${key}?fields=summary,status,assignee,description,comment,priority`); return clip(`${i.key}: ${i.fields.summary} [${i.fields.status?.name}] assignee: ${i.fields.assignee?.displayName || 'none'}\n\n${adfText(i.fields.description)}\n\n${(i.fields.comment?.comments || []).map((c) => `--- ${c.author.displayName}: ${adfText(c.body)}`).join('\n')}`); } },
  { name: 'jira_create_issue', write: true, description: 'Create a Jira issue.', parameters: { type: 'object', properties: { project: { type: 'string', description: 'Project key, e.g. ABC' }, summary: { type: 'string' }, description: { type: 'string' }, issuetype: { type: 'string', description: 'Task, Bug or Story' } }, required: ['project', 'summary'] },
    summary: (a) => `Create ${a.issuetype || 'Task'} in ${a.project}: "${a.summary}"`,
    run: async ({ project, summary, description, issuetype = 'Task' }) => { const r = await jr('/rest/api/3/issue', { method: 'POST', body: { fields: { project: { key: project }, summary, issuetype: { name: issuetype }, ...(description ? { description: adf(description) } : {}) } } }); return `Created ${r.key}: https://${String(cfg().jira.site).replace(/^https?:\/\//, '')}/browse/${r.key}`; } },
  { name: 'jira_add_comment', write: true, description: 'Add a comment to a Jira issue.', parameters: { type: 'object', properties: { key: { type: 'string' }, body: { type: 'string' } }, required: ['key', 'body'] },
    summary: (a) => `Comment on ${a.key}`,
    run: async ({ key, body }) => { await jr(`/rest/api/3/issue/${key}/comment`, { method: 'POST', body: { body: adf(body) } }); return `Comment added to ${key}.`; } },
];

// ---------- Linear ----------

const ln = async (query, variables = {}) => { const r = await http('https://api.linear.app/graphql', { method: 'POST', headers: { Authorization: secret('linear') }, body: { query, variables } }); if (r.errors) throw new Error(r.errors[0].message); return r.data; };
const LINEAR_TOOLS = [
  { name: 'linear_search_issues', description: 'Search Linear issues by text.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    run: async ({ query }) => (await ln('query($q:String!){searchIssues(term:$q,first:20){nodes{identifier title state{name} assignee{name} url}}}', { q: query })).searchIssues.nodes.map((i) => `${i.identifier} [${i.state?.name}] ${i.title} (${i.assignee?.name || 'unassigned'}) ${i.url}`).join('\n') || 'No issues.' },
  { name: 'linear_create_issue', write: true, description: 'Create a Linear issue in a team.', parameters: { type: 'object', properties: { team: { type: 'string', description: 'Team key, e.g. ENG' }, title: { type: 'string' }, description: { type: 'string' } }, required: ['team', 'title'] },
    summary: (a) => `Create Linear issue in ${a.team}: "${a.title}"`,
    run: async ({ team, title, description }) => {
      const teams = (await ln('{teams(first:50){nodes{id key name}}}')).teams.nodes;
      const t = teams.find((x) => x.key.toLowerCase() === team.toLowerCase() || x.name.toLowerCase() === team.toLowerCase());
      if (!t) throw new Error(`Team ${team} not found. Teams: ${teams.map((x) => x.key).join(', ')}`);
      const r = await ln('mutation($i:IssueCreateInput!){issueCreate(input:$i){issue{identifier url}}}', { i: { teamId: t.id, title, description } });
      return `Created ${r.issueCreate.issue.identifier}: ${r.issueCreate.issue.url}`;
    } },
];

const TOOLS = { github: GITHUB_TOOLS, notion: NOTION_TOOLS, slack: SLACK_TOOLS, jira: JIRA_TOOLS, linear: LINEAR_TOOLS };
const more = require('./integrations-more')({ http, clip, secret, cfg });
Object.assign(CONNECTORS, more.CONNECTORS);
Object.assign(TOOLS, more.TOOLS);
const google = require('./integrations-google')({ http, clip, cfg });
Object.assign(CONNECTORS, google.CONNECTORS);
Object.assign(TOOLS, google.TOOLS);
const popular = require('./integrations-popular')({ http, clip, secret, cfg });
Object.assign(CONNECTORS, popular.CONNECTORS);
Object.assign(TOOLS, popular.TOOLS);
const dev = require('./integrations-dev')({ cfg });
Object.assign(CONNECTORS, dev.CONNECTORS);
Object.assign(TOOLS, dev.TOOLS);
const everyday = require('./integrations-everyday')({ cfg });
Object.assign(CONNECTORS, everyday.CONNECTORS);
Object.assign(TOOLS, everyday.TOOLS);
// Free connectors that need nothing set up are built in too: on by default, in every Liquid Edition.
const BUILT_IN_WHEN = {
  weather: /\b(weather|forecast|temperature (in|outside|today|tomorrow)|will it (rain|snow)|rain(ing)?|snow(ing)?|sunny|humidity|wind speed)\b/i,
  translate: /\b(translat\w*|in (spanish|french|german|italian|portuguese|japanese|chinese|mandarin|korean|arabic|russian|hindi|dutch|polish|turkish|swedish|greek|hebrew|vietnamese|thai|indonesian)|how do (you|i) say)\b/i,
  wikipedia: /\b(wikipedia|who (was|is) [A-Z]|history of|biography|when (was|did) .{1,40} (born|die|founded|invented|built))\b/,
  pagespeed: /\b(page ?speed|core web vitals|lighthouse|how fast (is|does) (my|the|this) (site|page|website))\b/i,
};
for (const [id, when] of Object.entries(BUILT_IN_WHEN)) if (CONNECTORS[id]) Object.assign(CONNECTORS[id], { when, defaultOn: true, builtIn: true });
const DEV_WHEN = {
  apptest: /\blocalhost:\d+|\b(test|check|qa|try out|click through)\b[^.?!\n]{0,40}\b(my|the|this|our)\s+(web ?app|app|site|website|page|signup|sign-up|checkout|flows?)\b|\bbroken links?\b/i,
  designsystem: /\bdesign system\b|\b(match\w*|cop(y|ies|ying)|clon\w*|extract\w*|borrow\w*|use|get|steal)\b[^.?!\n]{0,30}\b(design|look|style|colou?rs?|fonts?|branding|theme)\b[^.?!\n]{0,20}\b(of|from|like)\b/i,
  securityaudit: /\bvibesec\b|\b(security|secure|vulnerab\w*|pen ?test\w*|hackable|exploitable|security holes?)\b[^.?!\n]{0,40}\b(app|code|project|repo|site|website|folder|api|before (i|we) ship)\b|\b(audit|check)\b[^.?!\n]{0,20}\bsecurity\b|\b(is|are)\s+(my|our|the|this)\s+[^.?!\n]{0,30}\b(secure|hackable|safe from (hackers|attacks?))\b/i,
  codedocs: /\bcontext7\b|\b(latest|current|up[- ]to[- ]date|newest)\s+(\w+\s+){0,2}(docs?|documentation|api|syntax|version of)\b|\b(docs?|documentation)\s+(for|of)\s+\S+|\b(next\.?js|react|supabase|tailwind|prisma|vue|svelte|astro|express|fastapi|django|stripe|langchain)\b[^.?!\n]{0,40}\b(how (do|to)|api|example|code)\b/i,
};
for (const [id, when] of Object.entries(DEV_WHEN)) if (CONNECTORS[id]) CONNECTORS[id].when = when;

// The built-in plug-ins a message needs. A built-in plug-in's tools are only handed to the model
// when its message matches (a long list of tools slows small models and confuses them); anything
// you connected yourself is always offered.
function relevant(text) {
  const t = String(text || '');
  return new Set(Object.entries(CONNECTORS).filter(([, d]) => d.builtIn && d.when && d.when.test(t)).map(([id]) => id));
}
const isBuiltIn = (id) => Boolean(CONNECTORS[id]?.builtIn);

async function test(id) {
  if (google.isGoogle(id)) return google.test(id);
  if (popular.CONNECTORS[id]) return popular.test(id);
  if (dev.CONNECTORS[id]) return dev.test(id);
  if (everyday.CONNECTORS[id]) return everyday.test(id);
  // A personal token knows its user; a GitHub App or Actions token doesn't, but can list its repos.
  if (id === 'github') {
    try { return (await gh('/user')).login; } catch (err) {
      if (!/^40[13]/.test(err.message)) throw err;
      const r = await gh('/installation/repositories?per_page=1').catch(() => { throw err; });
      return r.repositories?.[0]?.owner?.login ? `${r.repositories[0].owner.login} (app token)` : 'app token';
    }
  }
  if (id === 'notion') { const u = await nt('/users/me'); return u.bot?.workspace_name || u.name || 'connected'; }
  if (id === 'slack') { const r = await sl('auth.test'); return `${r.team} (${r.user})`; }
  if (id === 'jira') return (await jr('/rest/api/3/myself')).displayName;
  if (id === 'linear') return (await ln('{viewer{name}}')).viewer.name;
  return more.test(id);
}

// Tools from every enabled connector.
function tools() {
  const c = cfg();
  return Object.entries(TOOLS).filter(([id]) => isOn(id, c) && (CONNECTORS[id].noToken || (google.isGoogle(id) ? google.ready(id) : popular.isOAuth(id) ? popular.ready(id) : store.hasSecret(`int:${id}`)))).flatMap(([id, list]) => list.map((t) => ({ ...t, source: CONNECTORS[id].name, sourceId: id })));
}

// ---------- send files Quicksilver made to your cloud storage ----------
const MIME = { '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.pdf': 'application/pdf', '.md': 'text/markdown', '.txt': 'text/plain', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
function cloudTargets() {
  const c = cfg();
  return [
    ['gdrive', 'Google Drive', '📁', c.gdrive?.enabled && google.ready('gdrive')],
    ['onedrive', 'OneDrive', '🟦', c.microsoft?.enabled && popular.ready('microsoft')],
    ['dropbox', 'Dropbox', '📦', c.dropbox?.enabled && popular.ready('dropbox')],
  ].filter((x) => x[3]).map(([id, name, icon]) => ({ id, name, icon }));
}
async function cloudUpload(dest, file) {
  const fs = require('node:fs');
  const path = require('node:path');
  const buf = fs.readFileSync(file);
  const name = path.basename(file);
  const mime = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  return dest === 'gdrive' ? google.upload(name, buf, mime) : popular.upload(dest, name, buf);
}

module.exports = { CONNECTORS, list, save, disable, test, tools, githubRepoFiles, clip, cloudTargets, cloudUpload , relevant, isBuiltIn };
