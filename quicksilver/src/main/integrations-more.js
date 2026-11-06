// More connectors: everyday info (weather, Wikipedia, calendar, news feeds, your notes), task and
// project tools (Todoist, Trello, Asana, Airtable, GitLab, Confluence), smart home (Home Assistant)
// and messaging/automation (Discord, Telegram, Zapier/Make/n8n webhooks).
// Built as a function of the shared helpers in integrations.js.
const fs = require('node:fs');
const path = require('node:path');

module.exports = ({ http, clip, secret, cfg }) => {
  const C = (id) => cfg()[id] || {};
  const site = (s) => String(s || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const stripHtml = (h) => String(h || '').replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, '').replace(/<br\s*\/?>|<\/p>|<\/h\d>|<\/li>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n{3,}/g, '\n\n').trim();

  const CONNECTORS = {
    weather: { name: 'Weather', icon: '⛅', group: 'Everyday', blurb: 'Current weather and a 7-day forecast anywhere. Free, no account (Open-Meteo).', noToken: true,
      fields: [{ key: 'units', label: 'Units', placeholder: 'celsius or fahrenheit', help: 'Type "fahrenheit" for °F and mph; anything else uses °C and km/h.' }, { key: 'home', label: 'Your town (optional)', placeholder: 'e.g. Leeds', help: 'Used when you ask about the weather without saying where.' }] },
    wikipedia: { name: 'Wikipedia', icon: '📖', group: 'Everyday', blurb: 'Search and read Wikipedia articles. Free, no account.', noToken: true,
      fields: [{ key: 'lang', label: 'Language code', placeholder: 'en', help: 'en, es, fr, de… The Wikipedia edition to search.' }] },
    calendar: { name: 'Calendar (iCal link)', icon: '📅', group: 'Everyday', blurb: 'Your upcoming events from Google, Outlook or Apple Calendar. Read-only.',
      fields: [{ key: 'token', label: 'Secret iCal address', secret: true, help: 'Google Calendar: Settings → your calendar → "Secret address in iCal format". Outlook: Settings → Calendar → Shared calendars → Publish → ICS link. Recurring events show their first date only.', url: 'https://support.google.com/calendar/answer/37648' }] },
    rss: { name: 'News feeds (RSS)', icon: '📰', group: 'Everyday', blurb: 'The latest from blogs and news sites you follow. Free.', noToken: true,
      fields: [{ key: 'feeds', label: 'Feed addresses (comma-separated)', placeholder: 'https://feeds.bbci.co.uk/news/rss.xml, https://hnrss.org/frontpage', help: 'Most news sites and blogs have an RSS feed; look for the RSS icon or add /feed to the address.' }] },
    notes: { name: 'Notes folder (Obsidian, Markdown)', icon: '🗒️', group: 'Notes & knowledge', blurb: 'Search, read and add to a folder of notes on this PC, such as an Obsidian vault.', noToken: true,
      fields: [{ key: 'folder', label: 'Folder', placeholder: 'C:\\Users\\you\\Documents\\Obsidian Vault', help: 'The full path of the folder. Only files inside it can be read or written.' }] },
    confluence: { name: 'Confluence', icon: '📚', group: 'Notes & knowledge', blurb: 'Search and read your team\'s wiki pages.',
      fields: [{ key: 'site', label: 'Site', placeholder: 'yourcompany.atlassian.net' }, { key: 'email', label: 'Account email' }, { key: 'token', label: 'API token', secret: true, help: 'The same kind of token as Jira: id.atlassian.com → Security → API tokens.', url: 'https://id.atlassian.com/manage-profile/security/api-tokens' }] },
    todoist: { name: 'Todoist', icon: '✅', group: 'Tasks & projects', blurb: 'See, add and complete your to-dos.',
      fields: [{ key: 'token', label: 'API token', secret: true, help: 'Todoist → Settings → Integrations → Developer → API token.', url: 'https://app.todoist.com/app/settings/integrations/developer' }] },
    trello: { name: 'Trello', icon: '🗂️', group: 'Tasks & projects', blurb: 'Boards, lists and cards; add new cards.',
      fields: [{ key: 'key', label: 'API key', placeholder: 'From your Trello Power-Up admin page', help: 'Create a Power-Up at trello.com/power-ups/admin, open "API key", then generate a token from the link next to it.', url: 'https://trello.com/power-ups/admin' }, { key: 'token', label: 'Token', secret: true }] },
    asana: { name: 'Asana', icon: '🎯', group: 'Tasks & projects', blurb: 'Your tasks and projects; create tasks.',
      fields: [{ key: 'token', label: 'Personal access token', secret: true, help: 'Asana → My settings → Apps → Developer apps → Create new token.', url: 'https://app.asana.com/0/my-apps' }] },
    airtable: { name: 'Airtable', icon: '🧮', group: 'Tasks & projects', blurb: 'Read and add records in your bases.',
      fields: [{ key: 'token', label: 'Personal access token', secret: true, help: 'airtable.com/create/tokens, with data.records:read, data.records:write and schema.bases:read, and access to your bases.', url: 'https://airtable.com/create/tokens' }] },
    gitlab: { name: 'GitLab', icon: '🦊', group: 'Developer', blurb: 'Projects, issues and merge requests.',
      fields: [{ key: 'site', label: 'Site', placeholder: 'gitlab.com', help: 'Leave as gitlab.com unless your company runs its own.' }, { key: 'token', label: 'Personal access token', secret: true, help: 'GitLab → Preferences → Access tokens, with the api scope (read_api for read-only).', url: 'https://gitlab.com/-/user_settings/personal_access_tokens' }] },
    homeassistant: { name: 'Home Assistant', icon: '🏠', group: 'Home', blurb: 'Check and control lights, switches, thermostats and sensors.',
      fields: [{ key: 'url', label: 'Address', placeholder: 'http://homeassistant.local:8123' }, { key: 'token', label: 'Long-lived access token', secret: true, help: 'Home Assistant → your profile → Security → Long-lived access tokens → Create token.' }] },
    discord: { name: 'Discord', icon: '🎮', group: 'Messaging & automation', blurb: 'Post messages to a channel through a webhook.',
      fields: [{ key: 'token', label: 'Webhook URL', secret: true, help: 'Discord → channel settings → Integrations → Webhooks → New webhook → Copy webhook URL.' }] },
    telegram: { name: 'Telegram', icon: '✈️', group: 'Messaging & automation', blurb: 'Send messages to yourself or a group with your own bot.',
      fields: [{ key: 'chat', label: 'Chat ID', placeholder: 'e.g. 123456789', help: 'Message your bot, then open api.telegram.org/bot<token>/getUpdates and copy "chat":{"id":…}.' }, { key: 'token', label: 'Bot token', secret: true, help: 'Create a bot with @BotFather in Telegram and copy its token.', url: 'https://t.me/BotFather' }] },
    webhook: { name: 'Zapier, Make, n8n or IFTTT', icon: '⚡', group: 'Messaging & automation', blurb: 'Start any automation (thousands of apps) by calling its webhook.',
      fields: [{ key: 'token', label: 'Webhook URL', secret: true, help: 'Zapier: "Webhooks by Zapier" → Catch Hook. Make: Webhooks → Custom webhook. n8n: Webhook node. The AI sends a JSON message to it.' }] },
  };

  // ---------- Weather (Open-Meteo) ----------
  const WMO = { 0: 'clear', 1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast', 45: 'fog', 48: 'freezing fog', 51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle', 61: 'light rain', 63: 'rain', 65: 'heavy rain', 66: 'freezing rain', 67: 'freezing rain', 71: 'light snow', 73: 'snow', 75: 'heavy snow', 77: 'snow grains', 80: 'showers', 81: 'showers', 82: 'violent showers', 85: 'snow showers', 86: 'snow showers', 95: 'thunderstorm', 96: 'thunderstorm with hail', 99: 'thunderstorm with hail' };
  const WEATHER_TOOLS = [
    { name: 'weather_forecast', description: 'Current weather and the forecast for the next days at a place.', parameters: { type: 'object', properties: { place: { type: 'string', description: 'Town or city, e.g. "Paris" or "Austin, Texas"' }, days: { type: 'integer', description: '1-7, default 3' } } },
      run: async ({ place, days = 3 }) => {
        const where = place || C('weather').home;
        if (!where) throw new Error('Say which place.');
        const g = (await http(`https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(where.split(',')[0])}`)).results?.[0];
        if (!g) return `No place called ${where} was found.`;
        const f = /^f/i.test(C('weather').units || '');
        const w = await http(`https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=${Math.min(7, Math.max(1, days))}${f ? '&temperature_unit=fahrenheit&wind_speed_unit=mph' : ''}`);
        const u = f ? '°F' : '°C';
        const c = w.current;
        return [`${g.name}, ${g.admin1 ? `${g.admin1}, ` : ''}${g.country} (local time ${c.time.replace('T', ' ')})`,
          `Now: ${WMO[c.weather_code] || 'unknown'}, ${c.temperature_2m}${u} (feels like ${c.apparent_temperature}${u}), wind ${c.wind_speed_10m} ${f ? 'mph' : 'km/h'}, humidity ${c.relative_humidity_2m}%`,
          ...w.daily.time.map((d, i) => `${d}: ${WMO[w.daily.weather_code[i]] || ''}, ${w.daily.temperature_2m_min[i]}–${w.daily.temperature_2m_max[i]}${u}, rain chance ${w.daily.precipitation_probability_max[i] ?? '?'}%`)].join('\n');
      } },
  ];

  // ---------- Wikipedia ----------
  const wiki = (q) => http(`https://${(C('wikipedia').lang || 'en').replace(/[^a-z-]/gi, '') || 'en'}.wikipedia.org/w/api.php?format=json&${q}`, { headers: { 'User-Agent': 'Quicksilver/2.7 (desktop AI app)' } });
  const WIKI_TOOLS = [
    { name: 'wikipedia_search', description: 'Search Wikipedia for articles.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      run: async ({ query }) => (await wiki(`action=query&list=search&srlimit=8&srsearch=${encodeURIComponent(query)}`)).query.search.map((r) => `${r.title}: ${stripHtml(r.snippet)}`).join('\n') || 'No articles found.' },
    { name: 'wikipedia_read', description: 'Read a Wikipedia article (plain text).', parameters: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
      run: async ({ title }) => { const p = Object.values((await wiki(`action=query&prop=extracts&explaintext=1&redirects=1&titles=${encodeURIComponent(title)}`)).query.pages)[0]; return p?.extract ? clip(`${p.title}\n\n${p.extract}`, 16000) : `No article called ${title}.`; } },
  ];

  // ---------- Calendar (iCal) ----------
  function parseIcs(text) {
    const lines = String(text).replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
    const out = [];
    let ev = null;
    const date = (v) => { const m = String(v).match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/); if (!m) return null; return m[4] ? new Date(m[7] ? Date.UTC(m[1], m[2] - 1, m[3], m[4], m[5], m[6]) : new Date(m[1], m[2] - 1, m[3], m[4], m[5], m[6]).getTime()) : new Date(m[1], m[2] - 1, m[3]); };
    for (const l of lines) {
      if (l === 'BEGIN:VEVENT') ev = {};
      else if (l === 'END:VEVENT') { if (ev?.start) out.push(ev); ev = null; } else if (ev) {
        const i = l.indexOf(':'); const key = l.slice(0, i); const val = l.slice(i + 1).replace(/\\n/g, ' ').replace(/\\,/g, ',');
        if (key.startsWith('DTSTART')) { ev.start = date(val); ev.allDay = /VALUE=DATE(?!-)/.test(key) || !/T/.test(val); } else if (key.startsWith('DTEND')) ev.end = date(val);
        else if (key === 'SUMMARY') ev.title = val; else if (key === 'LOCATION') ev.where = val; else if (key.startsWith('RRULE')) ev.repeats = true;
      }
    }
    return out;
  }
  const CAL_TOOLS = [
    { name: 'calendar_upcoming', description: 'Upcoming events from the user\'s calendar.', parameters: { type: 'object', properties: { days: { type: 'integer', description: 'How many days ahead, default 7' } } },
      run: async ({ days = 7 }) => {
        const res = await http(secret('calendar').replace(/^webcal:/, 'https:'), { raw: true });
        if (!res.ok) throw new Error(`The calendar link returned ${res.status}.`);
        const now = Date.now(); const until = now + Math.min(90, days) * 86400000;
        const evs = parseIcs(await res.text()).filter((e) => e.start.getTime() >= now - 3600000 && e.start.getTime() <= until).sort((a, b) => a.start - b.start).slice(0, 60);
        return evs.map((e) => `${e.allDay ? e.start.toDateString() : e.start.toLocaleString()}: ${e.title || '(no title)'}${e.where ? ` @ ${e.where}` : ''}${e.repeats ? ' (repeats)' : ''}`).join('\n') || `Nothing in the next ${days} days.`;
      } },
  ];

  // ---------- RSS ----------
  const RSS_TOOLS = [
    { name: 'news_latest', description: 'Latest headlines from the user\'s news feeds, optionally only those mentioning a topic.', parameters: { type: 'object', properties: { topic: { type: 'string', description: 'Optional word to filter by' } } },
      run: async ({ topic }) => {
        const feeds = String(C('rss').feeds || '').split(/[,\s]+/).filter((u) => /^https?:\/\//.test(u)).slice(0, 12);
        if (!feeds.length) throw new Error('Add feed addresses in Integrations → News feeds.');
        const items = [];
        for (const u of feeds) {
          try {
            const res = await http(u, { raw: true }); const x = await res.text();
            const src = stripHtml(x.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || u).replace(/<!\[CDATA\[|\]\]>/g, '');
            for (const m of x.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)) {
              const t = (k) => stripHtml((m[0].match(new RegExp(`<${k}[^>]*>([\\s\\S]*?)</${k}>`, 'i'))?.[1] || '').replace(/<!\[CDATA\[|\]\]>/g, ''));
              const link = m[0].match(/<link[^>]*href="([^"]+)"/i)?.[1] || t('link');
              items.push({ src, title: t('title'), link, date: new Date(t('pubDate') || t('updated') || t('published') || 0), summary: t('description') || t('summary') });
            }
          } catch (e) { items.push({ src: u, title: `(could not read: ${e.message})`, date: new Date(0) }); }
        }
        const re = topic ? new RegExp(topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
        return items.filter((i) => !re || re.test(`${i.title} ${i.summary}`)).sort((a, b) => b.date - a.date).slice(0, 30)
          .map((i) => `[${i.src}] ${i.title}${i.date.getTime() ? ` (${i.date.toISOString().slice(0, 10)})` : ''}${i.link ? ` ${i.link}` : ''}${i.summary ? `\n   ${i.summary.slice(0, 200)}` : ''}`).join('\n') || 'Nothing matched.';
      } },
  ];

  // ---------- Notes folder ----------
  const notesRoot = () => { const f = C('notes').folder; if (!f || !fs.existsSync(f)) throw new Error('Set the notes folder in Integrations first.'); return path.resolve(f); };
  const inside = (p) => { const root = notesRoot(); const full = path.resolve(root, p); if (full !== root && !full.startsWith(root + path.sep)) throw new Error('That file is outside the notes folder.'); return full; };
  function walk(dir, out = [], depth = 0) {
    if (out.length > 5000 || depth > 8) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, out, depth + 1); else if (/\.(md|markdown|txt)$/i.test(e.name)) out.push(p);
    }
    return out;
  }
  const NOTES_TOOLS = [
    { name: 'notes_search', description: 'Search the user\'s notes folder by words in the file name or text.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      run: async ({ query }) => {
        const root = notesRoot(); const words = query.toLowerCase().split(/\s+/).filter(Boolean); const hits = [];
        for (const f of walk(root)) {
          const rel = path.relative(root, f); let text = '';
          try { if (fs.statSync(f).size < 2e6) text = fs.readFileSync(f, 'utf8'); } catch {}
          const hay = `${rel}\n${text}`.toLowerCase(); const score = words.filter((w) => hay.includes(w)).length;
          if (score) { const i = text.toLowerCase().indexOf(words[0]); hits.push({ rel, score, snip: i >= 0 ? text.slice(Math.max(0, i - 80), i + 160).replace(/\s+/g, ' ') : text.slice(0, 160).replace(/\s+/g, ' ') }); }
        }
        return hits.sort((a, b) => b.score - a.score).slice(0, 15).map((h) => `${h.rel}: …${h.snip}…`).join('\n') || 'No notes matched.';
      } },
    { name: 'notes_read', description: 'Read a note from the notes folder.', parameters: { type: 'object', properties: { file: { type: 'string', description: 'Path relative to the notes folder, as listed by notes_search' } }, required: ['file'] },
      run: async ({ file }) => clip(fs.readFileSync(inside(file), 'utf8'), 20000) },
    { name: 'notes_create', write: true, description: 'Create a new note (Markdown) in the notes folder.', parameters: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' }, folder: { type: 'string', description: 'Optional sub-folder' } }, required: ['title', 'content'] },
      summary: (a) => `Create note "${a.title}"`,
      run: async ({ title, content, folder = '' }) => { const f = inside(path.join(folder, `${title.replace(/[\\/:*?"<>|]/g, '-').slice(0, 100)}.md`)); if (fs.existsSync(f)) throw new Error('A note with that name already exists.'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, content); return `Created ${path.relative(notesRoot(), f)}`; } },
    { name: 'notes_append', write: true, description: 'Add text to the end of an existing note.', parameters: { type: 'object', properties: { file: { type: 'string' }, text: { type: 'string' } }, required: ['file', 'text'] },
      summary: (a) => `Add to note ${a.file}`,
      run: async ({ file, text }) => { const f = inside(file); if (!fs.existsSync(f)) throw new Error('No such note.'); fs.appendFileSync(f, `\n\n${text}`); return `Added to ${file}`; } },
  ];

  // ---------- Confluence ----------
  const cf = (p) => { const c = C('confluence'); return http(`https://${site(c.site)}${p}`, { headers: { Authorization: `Basic ${Buffer.from(`${c.email}:${secret('confluence')}`).toString('base64')}`, Accept: 'application/json' } }); };
  const CONFLUENCE_TOOLS = [
    { name: 'confluence_search', description: 'Search Confluence pages.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      run: async ({ query }) => (await cf(`/wiki/rest/api/search?limit=10&cql=${encodeURIComponent(`type=page AND text ~ "${query.replace(/"/g, '')}"`)}`)).results.map((r) => `${r.content?.id}: ${r.title} (${r.resultGlobalContainer?.title || ''}) ${stripHtml(r.excerpt || '').slice(0, 160)}`).join('\n') || 'No pages found.' },
    { name: 'confluence_read', description: 'Read a Confluence page by its id.', parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      run: async ({ id }) => { const p = await cf(`/wiki/api/v2/pages/${encodeURIComponent(id)}?body-format=storage`); return clip(`${p.title}\n\n${stripHtml(p.body?.storage?.value)}`, 20000); } },
  ];

  // ---------- Todoist ----------
  const td = (p, opts = {}) => http(`https://api.todoist.com/api/v1${p}`, { ...opts, headers: { Authorization: `Bearer ${secret('todoist')}` } });
  const list = (r) => (Array.isArray(r) ? r : r.results || []);
  const TODOIST_TOOLS = [
    { name: 'todoist_tasks', description: 'List open to-dos, optionally with a Todoist filter like "today", "overdue" or "#Work".', parameters: { type: 'object', properties: { filter: { type: 'string' } } },
      run: async ({ filter }) => list(await td(filter ? `/tasks/filter?query=${encodeURIComponent(filter)}&limit=100` : '/tasks?limit=100')).map((t) => `${t.id}: ${t.content}${t.due ? ` (due ${t.due.string || t.due.date})` : ''}${t.priority > 1 ? ` [p${5 - t.priority}]` : ''}`).join('\n') || 'No tasks.' },
    { name: 'todoist_add', write: true, description: 'Add a to-do.', parameters: { type: 'object', properties: { content: { type: 'string' }, due: { type: 'string', description: 'Natural language, e.g. "tomorrow 5pm"' }, priority: { type: 'integer', description: '1 (urgent) to 4 (normal)' } }, required: ['content'] },
      summary: (a) => `Add to-do "${a.content}"${a.due ? ` due ${a.due}` : ''}`,
      run: async ({ content, due, priority }) => { const t = await td('/tasks', { method: 'POST', body: { content, ...(due ? { due_string: due } : {}), ...(priority ? { priority: 5 - Math.min(4, Math.max(1, priority)) } : {}) } }); return `Added: ${t.content}`; } },
    { name: 'todoist_complete', write: true, description: 'Mark a to-do as done.', parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      summary: (a) => `Complete to-do ${a.id}`,
      run: async ({ id }) => { await td(`/tasks/${encodeURIComponent(id)}/close`, { method: 'POST' }); return 'Done.'; } },
  ];

  // ---------- Trello ----------
  const tr = (p, opts = {}) => http(`https://api.trello.com/1${p}${p.includes('?') ? '&' : '?'}key=${encodeURIComponent(C('trello').key || '')}&token=${encodeURIComponent(secret('trello'))}`, opts);
  const TRELLO_TOOLS = [
    { name: 'trello_boards', description: 'List the user\'s Trello boards.', parameters: { type: 'object', properties: {} },
      run: async () => (await tr('/members/me/boards?filter=open&fields=name')).map((b) => `${b.id}: ${b.name}`).join('\n') },
    { name: 'trello_cards', description: 'List the lists and cards on a board.', parameters: { type: 'object', properties: { board: { type: 'string', description: 'Board id' } }, required: ['board'] },
      run: async ({ board }) => { const lists = await tr(`/boards/${board}/lists?cards=open&card_fields=name,due`); return lists.map((l) => `## ${l.name} (list ${l.id})\n${l.cards.map((c) => `- ${c.name}${c.due ? ` (due ${c.due.slice(0, 10)})` : ''}`).join('\n')}`).join('\n\n'); } },
    { name: 'trello_add_card', write: true, description: 'Add a card to a Trello list.', parameters: { type: 'object', properties: { list: { type: 'string', description: 'List id' }, name: { type: 'string' }, description: { type: 'string' } }, required: ['list', 'name'] },
      summary: (a) => `Add Trello card "${a.name}"`,
      run: async ({ list: idList, name, description = '' }) => { const c = await tr(`/cards?idList=${idList}&name=${encodeURIComponent(name)}&desc=${encodeURIComponent(description)}`, { method: 'POST' }); return `Added: ${c.shortUrl}`; } },
  ];

  // ---------- Asana ----------
  const as = (p, opts = {}) => http(`https://app.asana.com/api/1.0${p}`, { ...opts, headers: { Authorization: `Bearer ${secret('asana')}` } });
  const ASANA_TOOLS = [
    { name: 'asana_my_tasks', description: 'The user\'s open Asana tasks.', parameters: { type: 'object', properties: {} },
      run: async () => { const me = (await as('/users/me')).data; const ws = me.workspaces[0]?.gid; const t = (await as(`/tasks?assignee=me&workspace=${ws}&completed_since=now&opt_fields=name,due_on,projects.name&limit=100`)).data; return t.map((x) => `${x.gid}: ${x.name}${x.due_on ? ` (due ${x.due_on})` : ''}${x.projects?.length ? ` [${x.projects.map((p) => p.name).join(', ')}]` : ''}`).join('\n') || 'No open tasks.'; } },
    { name: 'asana_add_task', write: true, description: 'Create an Asana task assigned to the user.', parameters: { type: 'object', properties: { name: { type: 'string' }, notes: { type: 'string' }, due_on: { type: 'string', description: 'YYYY-MM-DD' } }, required: ['name'] },
      summary: (a) => `Create Asana task "${a.name}"`,
      run: async ({ name, notes = '', due_on }) => { const me = (await as('/users/me')).data; const t = (await as('/tasks', { method: 'POST', body: { data: { name, notes, assignee: 'me', workspace: me.workspaces[0]?.gid, ...(due_on ? { due_on } : {}) } } })).data; return `Created: ${t.permalink_url || t.gid}`; } },
  ];

  // ---------- Airtable ----------
  const at = (p, opts = {}) => http(`https://api.airtable.com/v0${p}`, { ...opts, headers: { Authorization: `Bearer ${secret('airtable')}` } });
  const AIRTABLE_TOOLS = [
    { name: 'airtable_bases', description: 'List Airtable bases and their tables.', parameters: { type: 'object', properties: {} },
      run: async () => { const bases = (await at('/meta/bases')).bases; const out = []; for (const b of bases.slice(0, 10)) { const t = (await at(`/meta/bases/${b.id}/tables`)).tables; out.push(`${b.id}: ${b.name}\n${t.map((x) => `  - ${x.name}: ${x.fields.map((f) => f.name).join(', ')}`).join('\n')}`); } return out.join('\n'); } },
    { name: 'airtable_records', description: 'Read records from a table.', parameters: { type: 'object', properties: { base: { type: 'string' }, table: { type: 'string' }, formula: { type: 'string', description: 'Optional filterByFormula' } }, required: ['base', 'table'] },
      run: async ({ base, table, formula }) => clip((await at(`/${base}/${encodeURIComponent(table)}?maxRecords=100${formula ? `&filterByFormula=${encodeURIComponent(formula)}` : ''}`)).records.map((r) => ({ id: r.id, ...r.fields }))) },
    { name: 'airtable_add', write: true, description: 'Add a record to a table.', parameters: { type: 'object', properties: { base: { type: 'string' }, table: { type: 'string' }, fields: { type: 'object' } }, required: ['base', 'table', 'fields'] },
      summary: (a) => `Add a record to ${a.table}`,
      run: async ({ base, table, fields }) => { const r = await at(`/${base}/${encodeURIComponent(table)}`, { method: 'POST', body: { fields, typecast: true } }); return `Added record ${r.id}`; } },
  ];

  // ---------- GitLab ----------
  const gl = (p, opts = {}) => http(`https://${site(C('gitlab').site) || 'gitlab.com'}/api/v4${p}`, { ...opts, headers: { 'PRIVATE-TOKEN': secret('gitlab') } });
  const proj = { type: 'string', description: 'Project path, e.g. group/project' };
  const GITLAB_TOOLS = [
    { name: 'gitlab_projects', description: 'List the user\'s GitLab projects.', parameters: { type: 'object', properties: {} },
      run: async () => (await gl('/projects?membership=true&order_by=last_activity_at&per_page=40')).map((p) => `${p.path_with_namespace}: ${p.description || ''}`).join('\n') },
    { name: 'gitlab_issues', description: 'List issues in a project.', parameters: { type: 'object', properties: { project: proj, state: { type: 'string', enum: ['opened', 'closed', 'all'] } }, required: ['project'] },
      run: async ({ project, state = 'opened' }) => (await gl(`/projects/${encodeURIComponent(project)}/issues?state=${state}&per_page=40`)).map((i) => `#${i.iid} [${i.state}] ${i.title} (${i.author?.username})`).join('\n') || 'No issues.' },
    { name: 'gitlab_merge_requests', description: 'List merge requests in a project.', parameters: { type: 'object', properties: { project: proj }, required: ['project'] },
      run: async ({ project }) => (await gl(`/projects/${encodeURIComponent(project)}/merge_requests?state=opened&per_page=40`)).map((m) => `!${m.iid} ${m.title} (${m.source_branch} → ${m.target_branch})`).join('\n') || 'No open merge requests.' },
    { name: 'gitlab_create_issue', write: true, description: 'Create an issue in a project.', parameters: { type: 'object', properties: { project: proj, title: { type: 'string' }, description: { type: 'string' } }, required: ['project', 'title'] },
      summary: (a) => `Create GitLab issue in ${a.project}: "${a.title}"`,
      run: async ({ project, title, description = '' }) => { const i = await gl(`/projects/${encodeURIComponent(project)}/issues`, { method: 'POST', body: { title, description } }); return `Created #${i.iid}: ${i.web_url}`; } },
  ];

  // ---------- Home Assistant ----------
  const ha = (p, opts = {}) => http(`${String(C('homeassistant').url || '').replace(/\/+$/, '')}/api${p}`, { ...opts, headers: { Authorization: `Bearer ${secret('homeassistant')}` } });
  const HA_TOOLS = [
    { name: 'home_states', description: 'Current state of smart-home devices, optionally only one kind (light, switch, climate, sensor, lock…) or matching a name.', parameters: { type: 'object', properties: { domain: { type: 'string' }, name: { type: 'string' } } },
      run: async ({ domain, name }) => (await ha('/states')).filter((s) => (!domain || s.entity_id.startsWith(`${domain}.`)) && (!name || `${s.entity_id} ${s.attributes.friendly_name || ''}`.toLowerCase().includes(name.toLowerCase())))
        .slice(0, 150).map((s) => `${s.entity_id} (${s.attributes.friendly_name || ''}): ${s.state}${s.attributes.unit_of_measurement || ''}${s.attributes.temperature ? `, set to ${s.attributes.temperature}` : ''}`).join('\n') || 'Nothing matched.' },
    { name: 'home_control', write: true, description: 'Control a device, e.g. light.turn_on, switch.turn_off, climate.set_temperature, lock.lock.', parameters: { type: 'object', properties: { service: { type: 'string', description: 'domain.service, e.g. light.turn_on' }, entity_id: { type: 'string' }, data: { type: 'object', description: 'Extra settings, e.g. {"brightness_pct": 50} or {"temperature": 21}' } }, required: ['service', 'entity_id'] },
      summary: (a) => `${a.service} → ${a.entity_id}${a.data ? ` ${JSON.stringify(a.data)}` : ''}`,
      run: async ({ service, entity_id, data = {} }) => { const [d, s] = service.split('.'); await ha(`/services/${d}/${s}`, { method: 'POST', body: { entity_id, ...data } }); return `Done: ${service} on ${entity_id}`; } },
  ];

  // ---------- Discord, Telegram, webhooks ----------
  const DISCORD_TOOLS = [
    { name: 'discord_post', write: true, description: 'Post a message to the connected Discord channel.', parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
      summary: (a) => `Post to Discord: "${String(a.text).slice(0, 80)}"`,
      run: async ({ text }) => { await http(secret('discord'), { method: 'POST', body: { content: String(text).slice(0, 1990) } }); return 'Posted.'; } },
  ];
  const tg = (method, body) => http(`https://api.telegram.org/bot${secret('telegram')}/${method}`, { method: body ? 'POST' : 'GET', body });
  const TELEGRAM_TOOLS = [
    { name: 'telegram_send', write: true, description: 'Send a Telegram message to the connected chat.', parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
      summary: (a) => `Send on Telegram: "${String(a.text).slice(0, 80)}"`,
      run: async ({ text }) => { await tg('sendMessage', { chat_id: C('telegram').chat, text: String(text).slice(0, 4000) }); return 'Sent.'; } },
  ];
  const WEBHOOK_TOOLS = [
    { name: 'automation_trigger', write: true, description: 'Start the user\'s automation (Zapier, Make, n8n, IFTTT) by sending it a message with data.', parameters: { type: 'object', properties: { message: { type: 'string' }, data: { type: 'object', description: 'Optional fields for the automation' } }, required: ['message'] },
      summary: (a) => `Start automation: "${String(a.message).slice(0, 80)}"`,
      run: async ({ message, data = {} }) => { const r = await http(secret('webhook'), { method: 'POST', body: { message, ...data, sentBy: 'Quicksilver', at: new Date().toISOString() }, raw: true }); if (!r.ok) throw new Error(`The webhook returned ${r.status}.`); return 'Sent to the automation.'; } },
  ];

  const TOOLS = { weather: WEATHER_TOOLS, wikipedia: WIKI_TOOLS, calendar: CAL_TOOLS, rss: RSS_TOOLS, notes: NOTES_TOOLS, confluence: CONFLUENCE_TOOLS, todoist: TODOIST_TOOLS, trello: TRELLO_TOOLS, asana: ASANA_TOOLS, airtable: AIRTABLE_TOOLS, gitlab: GITLAB_TOOLS, homeassistant: HA_TOOLS, discord: DISCORD_TOOLS, telegram: TELEGRAM_TOOLS, webhook: WEBHOOK_TOOLS };

  // Checks the connection and returns a short "connected as" label.
  async function test(id) {
    if (id === 'weather') return C('weather').home || 'ready';
    if (id === 'wikipedia') return `${C('wikipedia').lang || 'en'}.wikipedia.org`;
    if (id === 'calendar') { const r = await CAL_TOOLS[0].run({ days: 30 }); return /Nothing/.test(r) ? 'connected (no events in 30 days)' : `${r.split('\n').length} upcoming events`; }
    if (id === 'rss') { const n = String(C('rss').feeds || '').split(/[,\s]+/).filter((u) => /^https?:\/\//.test(u)).length; if (!n) throw new Error('Add at least one feed address.'); return `${n} feed${n > 1 ? 's' : ''}`; }
    if (id === 'notes') return `${walk(notesRoot()).length} notes`;
    if (id === 'confluence') return (await cf('/wiki/rest/api/user/current')).displayName;
    if (id === 'todoist') { const n = list(await td('/tasks?limit=200')).length; return `${n} open task${n === 1 ? '' : 's'}`; }
    if (id === 'trello') return (await tr('/members/me?fields=fullName')).fullName;
    if (id === 'asana') return (await as('/users/me')).data.name;
    if (id === 'airtable') return (await at('/meta/whoami')).email || 'connected';
    if (id === 'gitlab') return (await gl('/user')).username;
    if (id === 'homeassistant') { const c = await ha('/config'); return c.location_name || 'Home'; }
    if (id === 'discord') return (await http(secret('discord'))).name || 'webhook';
    if (id === 'telegram') return `@${(await tg('getMe')).result.username}`;
    if (id === 'webhook') { if (!/^https:\/\//.test(secret('webhook'))) throw new Error('The webhook address should start with https://'); return 'ready'; }
    return 'connected';
  }

  return { CONNECTORS, TOOLS, test, parseIcs };
};
