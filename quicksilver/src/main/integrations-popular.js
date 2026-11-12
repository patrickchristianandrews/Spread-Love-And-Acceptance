// Popular connectors beyond Google: Microsoft 365 (Outlook, Calendar, OneDrive, To Do), Dropbox,
// HubSpot, Pipedrive, Zendesk, Stripe, Shopify, Mailchimp, ClickUp, monday.com, Calendly, Figma,
// WordPress and Spotify.
// Most use a personal token you create in the service. Microsoft, Dropbox and Spotify use a browser
// sign-in (OAuth with PKCE, through a one-time address on this PC) with an app you register there;
// no secret is needed for those. Anything that sends, creates or changes something asks first.
const crypto = require('node:crypto');
const nodeHttp = require('node:http');
const path = require('node:path');
const store = require('./store');

module.exports = ({ http, clip, secret, cfg }) => {
  const C = (id) => cfg()[id] || {};
  const table = (headers, rows) => [headers.join(' | '), ...rows.map((r) => r.join(' | '))].join('\n');
  const money = (n, cur) => `${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${String(cur || '').toUpperCase()}`.trim();
  const site = (s) => String(s || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const basic = (u, p) => `Basic ${Buffer.from(`${u}:${p}`).toString('base64')}`;
  // Reads Word, Excel, PowerPoint, PDF and text files the same way Your knowledge does.
  async function fileText(name, buf) {
    try { const r = await require('./docs').extract(name, buf); return r.text || ''; } catch { return /\.(txt|md|csv|json|html?|xml|log)$/i.test(name) ? buf.toString('utf8') : ''; }
  }

  // ---------- browser sign-in (OAuth 2 with PKCE, loopback) ----------
  const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const PAGE = (msg) => `<!doctype html><meta charset="utf-8"><title>Quicksilver</title><body style="font-family:system-ui;background:#0f1724;color:#e8eef8;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><div style="font-size:42px">💧</div><h2>${msg}</h2><p>You can close this tab and go back to Quicksilver.</p></div>`;
  const OAUTH = {
    microsoft: { auth: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize', token: 'https://login.microsoftonline.com/common/oauth2/v2.0/token', host: 'localhost',
      scope: 'offline_access User.Read Mail.ReadWrite Mail.Send Calendars.ReadWrite Files.ReadWrite.All Tasks.ReadWrite' },
    dropbox: { auth: 'https://www.dropbox.com/oauth2/authorize', token: 'https://api.dropboxapi.com/oauth2/token', host: 'localhost', port: 53682, extra: { token_access_type: 'offline' } },
    spotify: { auth: 'https://accounts.spotify.com/authorize', token: 'https://accounts.spotify.com/api/token', host: '127.0.0.1', port: 53683,
      scope: 'user-read-currently-playing user-read-playback-state user-modify-playback-state playlist-read-private playlist-modify-private user-library-read user-top-read user-read-recently-played' },
  };
  const refreshKey = (id) => `int:${id}:refresh`;
  const access = new Map();
  // Dropbox reads its arguments from a header, which can only carry plain ASCII: accents, dashes
  // and other scripts in a file name are written as \uXXXX escapes (as Dropbox asks).
  const dbxArg = (arg) => JSON.stringify(arg).replace(/[\u007f-\uffff]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
  async function tokenRequest(o, params) {
    const res = await fetch(o.token, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params), signal: AbortSignal.timeout(30000) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { const err = new Error(j.error_description || j.error?.message || j.error || `sign-in failed (${res.status})`); err.code = typeof j.error === 'string' ? j.error : ''; throw err; }
    return j;
  }
  // A sign-in page left open keeps its address in use (Dropbox and Spotify use a fixed one): a
  // new try closes the one before it instead of failing with "address in use".
  const waiting = new Map();
  async function signIn(id) {
    const o = OAUTH[id];
    const client = C(id).client;
    if (!client) throw new Error('Paste the app\'s client ID first.');
    const verifier = b64url(crypto.randomBytes(32));
    const state = b64url(crypto.randomBytes(16));
    try { waiting.get(id)?.close(); } catch { /* already closed */ }
    const server = nodeHttp.createServer();
    waiting.set(id, server);
    await new Promise((res, rej) => { server.once('error', rej); server.listen(o.port || 0, o.host, res); });
    const redirect = `http://${o.host}:${server.address().port}/`;
    try {
      const code = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Sign-in timed out. Try again.')), 5 * 60 * 1000);
        server.on('request', (req, res) => {
          const u = new URL(req.url, redirect);
          if (u.pathname !== '/') { res.writeHead(404); res.end(); return; }
          const ok = u.searchParams.get('state') === state && u.searchParams.get('code');
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(PAGE(ok ? 'Signed in' : 'Sign-in didn\'t finish'));
          clearTimeout(timer);
          if (ok) resolve(u.searchParams.get('code'));
          else reject(new Error(u.searchParams.get('error_description') || u.searchParams.get('error') || 'Sign-in was cancelled.'));
        });
        module.exports.openBrowser(`${o.auth}?${new URLSearchParams({ client_id: client, response_type: 'code', redirect_uri: redirect, code_challenge: b64url(crypto.createHash('sha256').update(verifier).digest()), code_challenge_method: 'S256', state, ...(o.scope ? { scope: o.scope } : {}), ...(o.extra || {}) })}`);
      });
      const t = await tokenRequest(o, { client_id: client, grant_type: 'authorization_code', code, redirect_uri: redirect, code_verifier: verifier });
      if (!t.refresh_token) throw new Error('The service didn\'t return a lasting sign-in; try again.');
      store.setSecret(refreshKey(id), t.refresh_token);
      access.set(id, { token: t.access_token, until: Date.now() + ((t.expires_in || 3600) - 60) * 1000 });
    } finally { server.close(); }
  }
  async function bearer(id) {
    const a = access.get(id);
    if (a && a.until > Date.now()) return a.token;
    const refresh = store.getSecret(refreshKey(id));
    if (!refresh) throw new Error('Sign in first (Connectors).');
    let t;
    try { t = await tokenRequest(OAUTH[id], { client_id: C(id).client, grant_type: 'refresh_token', refresh_token: refresh, ...(OAUTH[id].scope && id === 'microsoft' ? { scope: OAUTH[id].scope } : {}) }); } catch (err) {
      // The service ended this sign-in: it is forgotten, so the next Sign in opens the browser again.
      if (err.code === 'invalid_grant') { forget(id); throw new Error('That sign-in has ended. Open Connectors and sign in again.'); }
      throw err;
    }
    if (t.refresh_token) store.setSecret(refreshKey(id), t.refresh_token); // Microsoft and Spotify may rotate it
    access.set(id, { token: t.access_token, until: Date.now() + ((t.expires_in || 3600) - 60) * 1000 });
    return t.access_token;
  }
  const signedIn = (id) => Boolean(store.getSecret(refreshKey(id)));
  function forget(id) { if (OAUTH[id]) { store.setSecret(refreshKey(id), ''); access.delete(id); } }

  const CONNECTORS = {
    microsoft: { name: 'Microsoft 365: Outlook, Calendar, OneDrive, To Do', icon: '🟦', group: 'Microsoft', oauth: true, blurb: 'Search and read your Outlook email and send replies, see and add calendar events, find and read OneDrive files (Word, Excel, PowerPoint, PDF), and manage To Do. Works with personal and work accounts.',
      note: 'When you press Sign in, your browser opens Microsoft\'s sign-in, then comes back here. Sending, creating and changing always ask you first.',
      fields: [{ key: 'client', label: 'Application (client) ID', placeholder: '00000000-0000-0000-0000-000000000000', help: 'One-time setup, about 3 minutes: Azure portal → App registrations → New registration (any name; "Accounts in any organizational directory and personal Microsoft accounts"). Under Authentication add platform "Mobile and desktop applications" with redirect URI http://localhost. Copy the Application (client) ID here. No secret needed.', url: 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade' }] },
    dropbox: { name: 'Dropbox', icon: '📦', group: 'Files & storage', oauth: true, blurb: 'Find and read your Dropbox files (Word, Excel, PDF, text), and save new text files (asks first).',
      note: 'When you press Sign in, your browser opens Dropbox, then comes back here.',
      fields: [{ key: 'client', label: 'App key', placeholder: 'abc123xyz', help: 'One-time setup: dropbox.com/developers/apps → Create app (Scoped access, Full Dropbox). On Permissions tick files.metadata.read, files.content.read and files.content.write, then Submit. On Settings add the redirect URI http://localhost:53682/ and copy the App key here.', url: 'https://www.dropbox.com/developers/apps' }] },
    spotify: { name: 'Spotify', icon: '🎧', group: 'Music & media', oauth: true, blurb: 'A music finder that studies everything you listen to and suggests new songs and artists, each checked on Spotify. Also what\'s playing, search, your playlists, saving suggestions as a playlist, and play, pause or skip (needs Premium).',
      note: 'When you press Sign in, your browser opens Spotify, then comes back here.',
      fields: [{ key: 'client', label: 'Client ID', placeholder: 'From your Spotify app', help: 'One-time setup: developer.spotify.com/dashboard → Create app, Redirect URI http://127.0.0.1:53683/, tick Web API. Copy the Client ID here.', url: 'https://developer.spotify.com/dashboard' }] },
    hubspot: { name: 'HubSpot', icon: '🧲', group: 'Sales & support', blurb: 'Search contacts, companies and deals; add contacts and notes (asks first).',
      fields: [{ key: 'token', label: 'Private app access token', secret: true, help: 'HubSpot → Settings → Integrations → Private apps → Create, with CRM scopes for contacts, companies, deals (read and write). Copy the access token.', url: 'https://app.hubspot.com/private-apps/' }] },
    pipedrive: { name: 'Pipedrive', icon: '🟢', group: 'Sales & support', blurb: 'Your open deals, search people and organizations, add notes to deals (asks first).',
      fields: [{ key: 'token', label: 'Personal API token', secret: true, help: 'Pipedrive → your name → Personal preferences → API.', url: 'https://app.pipedrive.com/settings/api' }] },
    zendesk: { name: 'Zendesk', icon: '🎧', group: 'Sales & support', blurb: 'Search and read support tickets; reply to customers (asks first).',
      fields: [{ key: 'site', label: 'Zendesk address', placeholder: 'yourcompany.zendesk.com' }, { key: 'email', label: 'Your agent email' }, { key: 'token', label: 'API token', secret: true, help: 'Admin Center → Apps and integrations → Zendesk API → Add API token.' }] },
    stripe: { name: 'Stripe', icon: '💳', group: 'Commerce & payments', blurb: 'Your balance, recent payments, revenue totals and customers. Read-only.',
      fields: [{ key: 'token', label: 'Restricted key (read-only)', secret: true, help: 'Stripe Dashboard → Developers → API keys → Create restricted key with Read access to Balance, Charges, Customers and Payment Intents. A read-only key means the AI can never move money.', url: 'https://dashboard.stripe.com/apikeys' }] },
    shopify: { name: 'Shopify', icon: '🛍️', group: 'Commerce & payments', blurb: 'Recent orders, sales totals, products and stock levels. Read-only.',
      fields: [{ key: 'site', label: 'Store address', placeholder: 'yourstore.myshopify.com' }, { key: 'token', label: 'Admin API access token', secret: true, help: 'Shopify admin → Settings → Apps and sales channels → Develop apps → Create an app, give it read_orders, read_products and read_inventory, install it, and copy the Admin API access token.' }] },
    mailchimp: { name: 'Mailchimp', icon: '🐵', group: 'Marketing', blurb: 'Your audiences, recent campaign results (opens, clicks), and add subscribers (asks first; they confirm by email).',
      fields: [{ key: 'token', label: 'API key', secret: true, help: 'Mailchimp → Profile → Extras → API keys → Create a key. It ends in something like -us21.', url: 'https://us1.admin.mailchimp.com/account/api/' }] },
    clickup: { name: 'ClickUp', icon: '🎯', group: 'Tasks & projects', blurb: 'Your tasks and lists; create tasks (asks first).',
      fields: [{ key: 'token', label: 'Personal API token', secret: true, help: 'ClickUp → Settings → Apps → API token (starts with pk_).', url: 'https://app.clickup.com/settings/apps' }] },
    monday: { name: 'monday.com', icon: '📊', group: 'Tasks & projects', blurb: 'Your boards and items; add items (asks first).',
      fields: [{ key: 'token', label: 'API token', secret: true, help: 'monday.com → your avatar → Developers → My access tokens → Show.', url: 'https://auth.monday.com/' }] },
    calendly: { name: 'Calendly', icon: '🗓️', group: 'Everyday', blurb: 'Your upcoming Calendly meetings and who booked them. Read-only.',
      fields: [{ key: 'token', label: 'Personal access token', secret: true, help: 'Calendly → Integrations → API and webhooks → Generate new token.', url: 'https://calendly.com/integrations/api_webhooks' }] },
    figma: { name: 'Figma', icon: '🎨', group: 'Design', blurb: 'A design file\'s pages and frames, and its comments. Read-only.',
      fields: [{ key: 'token', label: 'Personal access token', secret: true, help: 'Figma → Settings → Security → Personal access tokens → Generate (file content and comments: read).', url: 'https://www.figma.com/settings' }] },
    wordpress: { name: 'WordPress', icon: '📰', group: 'Websites', blurb: 'Your site\'s posts; write new posts as drafts for you to review (asks first).',
      fields: [{ key: 'site', label: 'Site address', placeholder: 'myblog.com' }, { key: 'email', label: 'Username' }, { key: 'token', label: 'Application password', secret: true, help: 'WordPress admin → Users → Profile → Application passwords → Add new. (Not your normal password.)' }] },
  };

  // ---------- Microsoft 365 (Graph) ----------
  const MG = 'https://graph.microsoft.com/v1.0';
  const ms = async (p, opts = {}) => http(p.startsWith('http') ? p : `${MG}${p}`, { ...opts, headers: { Authorization: `Bearer ${await bearer('microsoft')}`, ...(opts.headers || {}) } });
  const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
  const recips = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean).map((address) => ({ emailAddress: { address } }));
  const MS_TOOLS = [
    { name: 'outlook_search', description: 'Search your Outlook email (words, names or addresses).', parameters: { type: 'object', properties: { query: { type: 'string' }, max: { type: 'integer', description: 'Default 10' } }, required: ['query'] },
      run: async ({ query, max = 10 }) => {
        const r = await ms(`/me/messages?$search=${encodeURIComponent(`"${String(query).replace(/"/g, '')}"`)}&$top=${Math.min(25, max || 10)}&$select=id,subject,from,receivedDateTime,bodyPreview`);
        return r.value?.length ? clip(r.value.map((m) => `[${m.id}] ${m.receivedDateTime?.slice(0, 16).replace('T', ' ')} · ${m.from?.emailAddress?.name || m.from?.emailAddress?.address} · ${m.subject || '(no subject)'}\n  ${m.bodyPreview?.slice(0, 160) || ''}`).join('\n')) : 'No emails match.';
      } },
    { name: 'outlook_read', description: 'Read one Outlook email in full (id from outlook_search).', parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      run: async ({ id }) => {
        const m = await ms(`/me/messages/${encodeURIComponent(id)}?$select=subject,from,toRecipients,receivedDateTime,body`, { headers: { Prefer: 'outlook.body-content-type="text"' } });
        return clip(`From: ${m.from?.emailAddress?.address}\nTo: ${(m.toRecipients || []).map((x) => x.emailAddress.address).join(', ')}\nDate: ${m.receivedDateTime}\nSubject: ${m.subject}\n\n${m.body?.content || ''}`);
      } },
    { name: 'outlook_send', write: true, description: 'Send an email from your Outlook (or reply, with reply_to_id).', parameters: { type: 'object', properties: { to: { type: 'string' }, cc: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' }, reply_to_id: { type: 'string' } }, required: ['body'] },
      run: async ({ to, cc, subject, body, reply_to_id: rid }) => {
        if (rid) { await ms(`/me/messages/${encodeURIComponent(rid)}/reply`, { method: 'POST', body: { comment: body } }); return 'Reply sent.'; }
        if (!to) throw new Error('Who should it go to?');
        await ms('/me/sendMail', { method: 'POST', body: { message: { subject: subject || '', body: { contentType: 'Text', content: body }, toRecipients: recips(to), ccRecipients: recips(cc) } } });
        return 'Sent.';
      } },
    { name: 'outlook_events', description: 'Your Outlook calendar for the next days.', parameters: { type: 'object', properties: { days: { type: 'integer', description: 'Default 7' } } },
      run: async ({ days = 7 }) => {
        const now = new Date();
        const r = await ms(`/me/calendarView?startDateTime=${now.toISOString()}&endDateTime=${new Date(now.getTime() + Math.min(90, days || 7) * 86400000).toISOString()}&$orderby=start/dateTime&$top=50&$select=subject,start,end,location,isAllDay`, { headers: { Prefer: `outlook.timezone="${tz()}"` } });
        return r.value?.length ? r.value.map((e) => `${e.isAllDay ? `${e.start.dateTime.slice(0, 10)} (all day)` : e.start.dateTime.slice(0, 16).replace('T', ' ')} · ${e.subject}${e.location?.displayName ? ` · ${e.location.displayName}` : ''}`).join('\n') : 'Nothing on the calendar then.';
      } },
    { name: 'outlook_create_event', write: true, description: 'Add an event to your Outlook calendar.', parameters: { type: 'object', properties: { title: { type: 'string' }, start: { type: 'string', description: 'Local date-time, e.g. 2026-11-12T15:00' }, end: { type: 'string', description: 'Default one hour later' }, location: { type: 'string' }, attendees: { type: 'string', description: 'Emails, comma-separated (they get an invite)' } }, required: ['title', 'start'] },
      run: async ({ title, start, end, location, attendees }) => {
        const s = start.length === 16 ? `${start}:00` : start;
        const later = new Date(s).getTime() + 3600000; // one hour on, as a local clock time (with that day's own offset)
        const e = end ? (end.length === 16 ? `${end}:00` : end) : new Date(later - new Date(later).getTimezoneOffset() * 60000).toISOString().slice(0, 19);
        const ev = await ms('/me/events', { method: 'POST', body: { subject: title, start: { dateTime: s, timeZone: tz() }, end: { dateTime: e, timeZone: tz() }, ...(location ? { location: { displayName: location } } : {}), ...(attendees ? { attendees: recips(attendees).map((a) => ({ ...a, type: 'required' })) } : {}) } });
        return `Added "${ev.subject}". ${ev.webLink || ''}`;
      } },
    { name: 'onedrive_search', description: 'Find files in your OneDrive.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      run: async ({ query }) => {
        const r = await ms(`/me/drive/root/search(q='${encodeURIComponent(String(query).replace(/'/g, "''"))}')?$top=20&$select=id,name,webUrl,lastModifiedDateTime,size,file,folder`);
        return r.value?.length ? r.value.map((f) => `[${f.id}] ${f.name}${f.folder ? ' (folder)' : ''} · ${f.lastModifiedDateTime?.slice(0, 10)} · ${f.webUrl}`).join('\n') : 'No files match.';
      } },
    { name: 'onedrive_read', description: 'Read a OneDrive file: Word, Excel, PowerPoint, PDF or text (id from onedrive_search).', parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      run: async ({ id }) => {
        const f = await ms(`/me/drive/items/${encodeURIComponent(id)}?$select=name,size,webUrl,file`);
        if (!f.file) return `${f.name} is a folder.`;
        if (f.size > 25e6) return `${f.name} is too big to read here (${Math.round(f.size / 1e6)} MB). Open it: ${f.webUrl}`;
        const res = await ms(`/me/drive/items/${encodeURIComponent(id)}/content`, { raw: true });
        if (!res.ok) throw new Error(`OneDrive said ${res.status}`);
        const text = await fileText(f.name, Buffer.from(await res.arrayBuffer()));
        return text ? clip(`${f.name}\n\n${text}`) : `${f.name} can't be read as text here. Open it: ${f.webUrl}`;
      } },
    { name: 'todo_list', description: 'Your open Microsoft To Do tasks.', parameters: { type: 'object', properties: {} },
      run: async () => {
        const lists = (await ms('/me/todo/lists')).value || [];
        const out = [];
        for (const l of lists.slice(0, 8)) {
          const t = (await ms(`/me/todo/lists/${l.id}/tasks?$filter=status ne 'completed'&$top=50`)).value || [];
          if (t.length) out.push(`${l.displayName}:\n${t.map((x) => `- ${x.title}${x.dueDateTime ? ` · due ${x.dueDateTime.dateTime.slice(0, 10)}` : ''}`).join('\n')}`);
        }
        return out.join('\n\n') || 'No open tasks.';
      } },
    { name: 'todo_add', write: true, description: 'Add a task to Microsoft To Do (your default list).', parameters: { type: 'object', properties: { title: { type: 'string' }, due: { type: 'string', description: 'Optional date, e.g. 2026-11-20' } }, required: ['title'] },
      run: async ({ title, due }) => {
        const lists = (await ms('/me/todo/lists')).value || [];
        const l = lists.find((x) => x.wellknownListName === 'defaultList') || lists[0];
        if (!l) throw new Error('No To Do list found.');
        await ms(`/me/todo/lists/${l.id}/tasks`, { method: 'POST', body: { title, ...(due ? { dueDateTime: { dateTime: `${due.slice(0, 10)}T00:00:00`, timeZone: tz() } } : {}) } });
        return `Added "${title}" to ${l.displayName}.`;
      } },
  ];

  // ---------- Dropbox ----------
  const dbx = async (url, opts = {}) => http(url, { ...opts, headers: { Authorization: `Bearer ${await bearer('dropbox')}`, ...(opts.headers || {}) } });
  const DROPBOX_TOOLS = [
    { name: 'dropbox_search', description: 'Find files and folders in your Dropbox.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      run: async ({ query }) => {
        const r = await dbx('https://api.dropboxapi.com/2/files/search_v2', { method: 'POST', body: { query, options: { max_results: 20 } } });
        const m = (r.matches || []).map((x) => x.metadata?.metadata).filter(Boolean);
        return m.length ? m.map((f) => `${f.path_display}${f['.tag'] === 'folder' ? ' (folder)' : ` · ${f.server_modified?.slice(0, 10) || ''}`}`).join('\n') : 'Nothing matches.';
      } },
    { name: 'dropbox_read', description: 'Read a Dropbox file: Word, Excel, PowerPoint, PDF or text (path from dropbox_search).', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
      run: async ({ path: p }) => {
        const res = await dbx('https://content.dropboxapi.com/2/files/download', { method: 'POST', raw: true, headers: { 'Dropbox-API-Arg': dbxArg({ path: p }) } });
        if (!res.ok) throw new Error(`Dropbox said ${res.status}`);
        const text = await fileText(path.basename(p), Buffer.from(await res.arrayBuffer()));
        return text ? clip(`${p}\n\n${text}`) : `${p} can't be read as text here.`;
      } },
    { name: 'dropbox_save', write: true, description: 'Save text as a new file in your Dropbox.', parameters: { type: 'object', properties: { path: { type: 'string', description: 'e.g. /Notes/meeting.md' }, text: { type: 'string' } }, required: ['path', 'text'] },
      run: async ({ path: p, text }) => {
        const f = await dbx('https://content.dropboxapi.com/2/files/upload', { method: 'POST', headers: { 'Dropbox-API-Arg': dbxArg({ path: p.startsWith('/') ? p : `/${p}`, mode: 'add', autorename: true }), 'Content-Type': 'application/octet-stream' }, body: Buffer.from(String(text), 'utf8') });
        return `Saved ${f.path_display}.`;
      } },
  ];

  // ---------- Spotify ----------
  const finder = { known: { artists: new Set(), tracks: new Set() } };
  const sp = async (p, opts = {}) => http(`https://api.spotify.com/v1${p}`, { ...opts, headers: { Authorization: `Bearer ${await bearer('spotify')}`, ...(opts.headers || {}) } });
  const artists = (t) => (t.artists || []).map((a) => a.name).join(', ');
  const SPOTIFY_TOOLS = [
    { name: 'spotify_now_playing', description: 'What\'s playing on Spotify right now.', parameters: { type: 'object', properties: {} },
      run: async () => {
        const res = await sp('/me/player/currently-playing', { raw: true });
        if (res.status === 204) return 'Nothing is playing.';
        const r = await res.json();
        return r.item ? `${r.is_playing ? 'Playing' : 'Paused'}: ${r.item.name} by ${artists(r.item)} (${r.item.album?.name})` : 'Nothing is playing.';
      } },
    { name: 'spotify_search', description: 'Search Spotify for songs, artists, albums or playlists.', parameters: { type: 'object', properties: { query: { type: 'string' }, type: { type: 'string', description: 'track (default), artist, album or playlist' } }, required: ['query'] },
      run: async ({ query, type = 'track' }) => {
        const t = ['track', 'artist', 'album', 'playlist'].includes(type) ? type : 'track';
        const r = await sp(`/search?${new URLSearchParams({ q: query, type: t, limit: '10' })}`);
        const items = (r[`${t}s`]?.items || []).filter(Boolean);
        return items.length ? items.map((x) => `${x.name}${x.artists ? ` · ${artists(x)}` : ''}${x.owner ? ` · by ${x.owner.display_name}` : ''} · ${x.uri}`).join('\n') : 'Nothing found.';
      } },
    { name: 'spotify_my_playlists', description: 'Your Spotify playlists.', parameters: { type: 'object', properties: {} },
      run: async () => { const r = await sp('/me/playlists?limit=50'); return (r.items || []).filter(Boolean).map((p) => `${p.name} · ${p.tracks?.total ?? '?'} songs · ${p.uri}`).join('\n') || 'No playlists.'; } },
    // The music finder: a taste profile from everything you listen to, then every suggestion is
    // checked on Spotify (it exists, the link works) and anything you already know is dropped.
    { name: 'spotify_taste_profile', description: 'Study the user\'s Spotify listening for the music finder: top artists and songs over all time, the last 6 months and the last 4 weeks, artists they\'re getting into lately, the artists they save most, recent plays and playlist names. Call this first when asked for music, song or artist suggestions.', parameters: { type: 'object', properties: {} },
      run: async () => {
        const top = (kind, range, n = 50) => sp(`/me/top/${kind}?time_range=${range}&limit=${n}`).then((r) => r.items || []).catch(() => []);
        const [aLong, aMid, aShort, tLong, tShort, recent, lists] = await Promise.all([top('artists', 'long_term'), top('artists', 'medium_term'), top('artists', 'short_term', 30), top('tracks', 'long_term'), top('tracks', 'short_term', 30),
          sp('/me/player/recently-played?limit=50').then((r) => r.items || []).catch(() => []), sp('/me/playlists?limit=50').then((r) => (r.items || []).filter(Boolean)).catch(() => [])]);
        const saved = [];
        for (let off = 0; off < 500; off += 50) { const r = await sp(`/me/tracks?limit=50&offset=${off}`).catch(() => null); if (!r?.items?.length) break; saved.push(...r.items.map((x) => x.track).filter(Boolean)); if (!r.next) break; }
        const count = {};
        for (const t of saved) for (const a of t.artists || []) count[a.name] = (count[a.name] || 0) + 1;
        const known = finder.known;
        for (const a of [...aLong, ...aMid, ...aShort]) known.artists.add(a.name.toLowerCase());
        for (const t of [...saved, ...tLong, ...tShort, ...recent.map((x) => x.track).filter(Boolean)]) { known.tracks.add(`${t.name}|${t.artists?.[0]?.name}`.toLowerCase()); for (const a of t.artists || []) known.artists.add(a.name.toLowerCase()); }
        const longSet = new Set(aLong.map((a) => a.name));
        const genres = {};
        for (const a of [...aLong, ...aMid]) for (const g of a.genres || []) genres[g] = (genres[g] || 0) + 1;
        const art = (list) => list.map((a) => `${a.name}${a.genres?.length ? ` (${a.genres.slice(0, 3).join(', ')})` : ''}`).join('; ');
        return clip([
          `All-time top artists: ${art(aLong.slice(0, 30)) || 'not enough listening yet'}`,
          `Last 6 months: ${art(aMid.slice(0, 25))}`,
          `Getting into lately (top this month, not all-time): ${aShort.filter((a) => !longSet.has(a.name)).map((a) => a.name).join('; ') || 'nothing new'}`,
          Object.keys(genres).length ? `Genres they lean to: ${Object.entries(genres).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([g, n]) => `${g} (${n})`).join(', ')}` : '',
          `Most-saved artists: ${Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([n, c]) => `${n} (${c} songs)`).join(', ') || 'none'}`,
          `All-time top songs: ${tLong.slice(0, 25).map((t) => `${t.name} by ${artists(t)}`).join('; ')}`,
          `This month's top songs: ${tShort.slice(0, 15).map((t) => `${t.name} by ${artists(t)}`).join('; ')}`,
          `Recently played: ${[...new Set(recent.map((x) => `${x.track?.name} by ${artists(x.track || {})}`))].slice(0, 20).join('; ')}`,
          `Playlists: ${lists.map((p) => p.name).slice(0, 30).join('; ')}`,
          `${saved.length} saved songs looked at; ${known.artists.size} artists they already know.`,
          'Now suggest artists and songs they do NOT already have, matched to this taste (similar sound, scene, era, influences, collaborators), with a one-line reason each tied to artists above. Then check them all with spotify_check_suggestions before answering.',
        ].filter(Boolean).join('\n'));
      } },
    { name: 'spotify_check_suggestions', description: 'Check music suggestions on Spotify before giving them: each must exist; anything the user already listens to is dropped. Returns verified songs and artists with links.', parameters: { type: 'object', properties: { suggestions: { type: 'array', description: 'Up to 25 suggestions', items: { type: 'object', properties: { artist: { type: 'string' }, track: { type: 'string', description: 'Optional song title' }, why: { type: 'string' } }, required: ['artist'] } } }, required: ['suggestions'] },
      run: async ({ suggestions }) => {
        const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        const out = []; const dropped = [];
        for (const s of (suggestions || []).slice(0, 25)) {
          if (finder.known.artists.has(String(s.artist).toLowerCase()) && !s.track) { dropped.push(`${s.artist} (already one of yours)`); continue; }
          if (s.track) {
            const r = await sp(`/search?${new URLSearchParams({ q: `track:${s.track} artist:${s.artist}`, type: 'track', limit: '5' })}`).catch(() => null);
            const hit = (r?.tracks?.items || []).find((t) => t.artists.some((a) => norm(a.name) === norm(s.artist) || norm(a.name).includes(norm(s.artist))));
            if (!hit) { dropped.push(`${s.track} by ${s.artist} (not found on Spotify)`); continue; }
            if (finder.known.tracks.has(`${hit.name}|${hit.artists[0].name}`.toLowerCase())) { dropped.push(`${hit.name} by ${hit.artists[0].name} (already in your library)`); continue; }
            out.push(`🎵 ${hit.name} by ${artists(hit)}${s.why ? ` · ${s.why}` : ''} · ${hit.external_urls?.spotify} · ${hit.uri}`);
          } else {
            const r = await sp(`/search?${new URLSearchParams({ q: s.artist, type: 'artist', limit: '5' })}`).catch(() => null);
            const hit = (r?.artists?.items || []).find((a) => norm(a.name) === norm(s.artist));
            if (!hit) { dropped.push(`${s.artist} (not found on Spotify)`); continue; }
            const tt = await sp(`/artists/${hit.id}/top-tracks?market=from_token`).then((x) => x.tracks || []).catch(() => []);
            out.push(`🎤 ${hit.name}${s.why ? ` · ${s.why}` : ''} · start with "${tt[0]?.name || 'their top song'}" · ${hit.external_urls?.spotify}${tt[0] ? ` · ${tt[0].uri}` : ''}`);
          }
        }
        return `${out.length ? `Checked on Spotify:\n${out.join('\n')}` : 'None of those could be confirmed.'}${dropped.length ? `\n\nLeft out: ${dropped.join('; ')}` : ''}${finder.known.artists.size ? '' : '\n\n(Call spotify_taste_profile first so songs and artists they already know can be left out.)'}`;
      } },
    { name: 'spotify_make_playlist', write: true, description: 'Save songs (spotify:track:… links) as a new private playlist in the user\'s Spotify.', parameters: { type: 'object', properties: { name: { type: 'string' }, uris: { type: 'array', items: { type: 'string' } }, description: { type: 'string' } }, required: ['name', 'uris'] },
      run: async ({ name, uris, description }) => {
        const tracks = (uris || []).filter((u) => /^spotify:track:/.test(u)).slice(0, 100);
        if (!tracks.length) throw new Error('No song links to add.');
        const me = await sp('/me');
        const p = await sp(`/users/${encodeURIComponent(me.id)}/playlists`, { method: 'POST', body: { name, public: false, description: description || 'Made with Quicksilver\'s music finder' } });
        await sp(`/playlists/${p.id}/tracks`, { method: 'POST', body: { uris: tracks } });
        return `Made "${p.name}" with ${tracks.length} songs: ${p.external_urls?.spotify}`;
      } },
    { name: 'spotify_control', write: true, description: 'Play, pause or skip on Spotify, or play a song/album/playlist by its spotify: link (needs Premium and an open Spotify app).', parameters: { type: 'object', properties: { action: { type: 'string', description: 'play, pause, next or previous' }, uri: { type: 'string', description: 'Optional spotify:track:… / album / playlist to play' } }, required: ['action'] },
      run: async ({ action, uri }) => {
        if (action === 'pause') await sp('/me/player/pause', { method: 'PUT' });
        else if (action === 'next' || action === 'previous') await sp(`/me/player/${action}`, { method: 'POST' });
        else await sp('/me/player/play', { method: 'PUT', ...(uri ? { body: /:track:/.test(uri) ? { uris: [uri] } : { context_uri: uri } } : {}) });
        return 'Done.';
      } },
  ];

  // ---------- HubSpot ----------
  const hs = (p, opts = {}) => http(`https://api.hubapi.com${p}`, { ...opts, headers: { Authorization: `Bearer ${secret('hubspot')}` } });
  const HS_PROPS = { contacts: ['firstname', 'lastname', 'email', 'phone', 'company', 'lifecyclestage'], companies: ['name', 'domain', 'industry', 'city', 'numberofemployees'], deals: ['dealname', 'amount', 'dealstage', 'closedate', 'pipeline'] };
  const HUBSPOT_TOOLS = [
    { name: 'hubspot_search', description: 'Search HubSpot contacts, companies or deals.', parameters: { type: 'object', properties: { object: { type: 'string', description: 'contacts (default), companies or deals' }, query: { type: 'string' } }, required: ['query'] },
      run: async ({ object = 'contacts', query }) => {
        const o = HS_PROPS[object] ? object : 'contacts';
        const r = await hs(`/crm/v3/objects/${o}/search`, { method: 'POST', body: { query, limit: 10, properties: HS_PROPS[o] } });
        return r.results?.length ? r.results.map((x) => `[${x.id}] ${HS_PROPS[o].map((k) => x.properties?.[k]).filter(Boolean).join(' · ')}`).join('\n') : 'Nothing matches.';
      } },
    { name: 'hubspot_create_contact', write: true, description: 'Add a contact to HubSpot.', parameters: { type: 'object', properties: { email: { type: 'string' }, firstname: { type: 'string' }, lastname: { type: 'string' }, company: { type: 'string' }, phone: { type: 'string' } }, required: ['email'] },
      run: async (p) => { const r = await hs('/crm/v3/objects/contacts', { method: 'POST', body: { properties: Object.fromEntries(Object.entries(p).filter(([, v]) => v)) } }); return `Added contact ${r.id}.`; } },
    { name: 'hubspot_add_note', write: true, description: 'Add a note to a HubSpot contact.', parameters: { type: 'object', properties: { contact_id: { type: 'string' }, text: { type: 'string' } }, required: ['contact_id', 'text'] },
      run: async ({ contact_id: id, text }) => { await hs('/crm/v3/objects/notes', { method: 'POST', body: { properties: { hs_note_body: text, hs_timestamp: new Date().toISOString() }, associations: [{ to: { id }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }] }] } }); return 'Note added.'; } },
  ];

  // ---------- Pipedrive ----------
  const pd = (p, opts = {}) => http(`https://api.pipedrive.com/v1${p}${p.includes('?') ? '&' : '?'}api_token=${encodeURIComponent(secret('pipedrive'))}`, opts);
  const PIPEDRIVE_TOOLS = [
    { name: 'pipedrive_deals', description: 'Your Pipedrive deals (open by default).', parameters: { type: 'object', properties: { status: { type: 'string', description: 'open (default), won, lost or all_not_deleted' } } },
      run: async ({ status = 'open' }) => { const r = await pd(`/deals?status=${encodeURIComponent(status)}&limit=30&sort=update_time%20DESC`); return (r.data || []).map((d) => `[${d.id}] ${d.title} · ${money(d.value, d.currency)} · ${d.org_name || d.person_name || ''} · ${d.status}`).join('\n') || 'No deals.'; } },
    { name: 'pipedrive_search', description: 'Search Pipedrive people, organizations and deals.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      run: async ({ query }) => { const r = await pd(`/itemSearch?term=${encodeURIComponent(query)}&limit=10`); return (r.data?.items || []).map(({ item: i }) => `${i.type} [${i.id}] ${i.title || i.name}${i.organization?.name ? ` · ${i.organization.name}` : ''}`).join('\n') || 'Nothing matches.'; } },
    { name: 'pipedrive_add_note', write: true, description: 'Add a note to a Pipedrive deal.', parameters: { type: 'object', properties: { deal_id: { type: 'integer' }, text: { type: 'string' } }, required: ['deal_id', 'text'] },
      run: async ({ deal_id: id, text }) => { await pd('/notes', { method: 'POST', body: { content: text, deal_id: id } }); return 'Note added.'; } },
  ];

  // ---------- Zendesk ----------
  const zd = (p, opts = {}) => http(`https://${site(C('zendesk').site)}${p}`, { ...opts, headers: { Authorization: basic(`${C('zendesk').email}/token`, secret('zendesk')) } });
  const ZENDESK_TOOLS = [
    { name: 'zendesk_search', description: 'Search Zendesk tickets (words, or status:open, requester:email…).', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      run: async ({ query }) => { const r = await zd(`/api/v2/search.json?query=${encodeURIComponent(`type:ticket ${query}`)}&per_page=15`); return (r.results || []).map((t) => `#${t.id} [${t.status}] ${t.subject} · ${t.updated_at?.slice(0, 10)}`).join('\n') || 'No tickets match.'; } },
    { name: 'zendesk_ticket', description: 'Read a Zendesk ticket and its conversation.', parameters: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
      run: async ({ id }) => {
        const [t, c] = await Promise.all([zd(`/api/v2/tickets/${id}.json`), zd(`/api/v2/tickets/${id}/comments.json`)]);
        return clip(`#${id} [${t.ticket.status}] ${t.ticket.subject}\n\n${(c.comments || []).map((x) => `${x.created_at.slice(0, 16).replace('T', ' ')}${x.public ? '' : ' (internal)'}:\n${x.plain_body || x.body}`).join('\n\n')}`);
      } },
    { name: 'zendesk_reply', write: true, description: 'Reply on a Zendesk ticket (public reply to the customer, or an internal note).', parameters: { type: 'object', properties: { id: { type: 'integer' }, text: { type: 'string' }, internal: { type: 'boolean', description: 'true for an internal note' } }, required: ['id', 'text'] },
      run: async ({ id, text, internal }) => { await zd(`/api/v2/tickets/${id}.json`, { method: 'PUT', body: { ticket: { comment: { body: text, public: !internal } } } }); return internal ? 'Internal note added.' : 'Reply sent.'; } },
  ];

  // ---------- Stripe (read-only) ----------
  const st = (p) => http(`https://api.stripe.com/v1${p}`, { headers: { Authorization: `Bearer ${secret('stripe')}` } });
  const STRIPE_TOOLS = [
    { name: 'stripe_balance', description: 'Your Stripe balance: available and pending.', parameters: { type: 'object', properties: {} },
      run: async () => { const b = await st('/balance'); return `Available: ${b.available.map((x) => money(x.amount / 100, x.currency)).join(', ')}\nPending: ${b.pending.map((x) => money(x.amount / 100, x.currency)).join(', ')}`; } },
    { name: 'stripe_payments', description: 'Recent Stripe payments and the total, for the last N days.', parameters: { type: 'object', properties: { days: { type: 'integer', description: 'Default 7' } } },
      run: async ({ days = 7 }) => {
        const since = Math.floor(Date.now() / 1000) - Math.min(90, days || 7) * 86400;
        const r = await st(`/charges?limit=100&created[gte]=${since}`);
        const ok = (r.data || []).filter((c) => c.status === 'succeeded' && !c.refunded);
        const totals = {};
        for (const c of ok) totals[c.currency] = (totals[c.currency] || 0) + c.amount / 100;
        return clip(`Last ${days} days: ${ok.length} payments${Object.keys(totals).length ? `, ${Object.entries(totals).map(([cur, n]) => money(n, cur)).join(' + ')}` : ''}${r.has_more ? ' (first 100 shown)' : ''}\n${(r.data || []).slice(0, 25).map((c) => `${new Date(c.created * 1000).toISOString().slice(0, 16).replace('T', ' ')} · ${money(c.amount / 100, c.currency)} · ${c.status}${c.refunded ? ' (refunded)' : ''} · ${c.billing_details?.email || c.description || ''}`).join('\n')}`);
      } },
    { name: 'stripe_customer', description: 'Find a Stripe customer by email.', parameters: { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] },
      run: async ({ email }) => { const r = await st(`/customers/search?query=${encodeURIComponent(`email:'${String(email).replace(/'/g, '')}'`)}`); return (r.data || []).map((c) => `${c.id} · ${c.name || ''} · ${c.email} · since ${new Date(c.created * 1000).toISOString().slice(0, 10)}`).join('\n') || 'No customer with that email.'; } },
  ];

  // ---------- Shopify (read-only) ----------
  const shop = async (query, variables = {}) => {
    const r = await http(`https://${site(C('shopify').site)}/admin/api/2025-10/graphql.json`, { method: 'POST', headers: { 'X-Shopify-Access-Token': secret('shopify') }, body: { query, variables } });
    if (r.errors?.length) throw new Error(r.errors[0].message);
    return r.data;
  };
  const SHOPIFY_TOOLS = [
    { name: 'shopify_orders', description: 'Recent Shopify orders and the sales total.', parameters: { type: 'object', properties: { days: { type: 'integer', description: 'Default 7' } } },
      run: async ({ days = 7 }) => {
        const since = new Date(Date.now() - Math.min(365, days || 7) * 86400000).toISOString().slice(0, 10);
        const d = await shop('query($q:String!){orders(first:50,sortKey:CREATED_AT,reverse:true,query:$q){edges{node{name createdAt displayFinancialStatus displayFulfillmentStatus totalPriceSet{shopMoney{amount currencyCode}} customer{displayName}}}}}', { q: `created_at:>=${since}` });
        const o = d.orders.edges.map((e) => e.node);
        const total = o.reduce((t, x) => t + Number(x.totalPriceSet.shopMoney.amount), 0);
        return clip(`Last ${days} days: ${o.length} orders${o.length === 50 ? '+' : ''}, ${money(total, o[0]?.totalPriceSet.shopMoney.currencyCode)}\n${o.map((x) => `${x.name} · ${x.createdAt.slice(0, 10)} · ${money(x.totalPriceSet.shopMoney.amount, x.totalPriceSet.shopMoney.currencyCode)} · ${x.displayFinancialStatus} / ${x.displayFulfillmentStatus} · ${x.customer?.displayName || ''}`).join('\n')}`);
      } },
    { name: 'shopify_products', description: 'Find Shopify products, with price and stock.', parameters: { type: 'object', properties: { query: { type: 'string', description: 'Words in the title, or leave empty for the latest' } } },
      run: async ({ query }) => {
        const d = await shop('query($q:String){products(first:25,query:$q,sortKey:UPDATED_AT,reverse:true){edges{node{title status totalInventory priceRangeV2{minVariantPrice{amount currencyCode}}}}}}', { q: query || null });
        return d.products.edges.map(({ node: p }) => `${p.title} · ${p.status} · ${money(p.priceRangeV2.minVariantPrice.amount, p.priceRangeV2.minVariantPrice.currencyCode)} · ${p.totalInventory ?? '?'} in stock`).join('\n') || 'No products match.';
      } },
  ];

  // ---------- Mailchimp ----------
  const mcKey = () => secret('mailchimp');
  const mc = (p, opts = {}) => http(`https://${(mcKey().split('-')[1] || 'us1')}.api.mailchimp.com/3.0${p}`, { ...opts, headers: { Authorization: basic('quicksilver', mcKey()) } });
  const pct = (n) => `${Math.round((n || 0) * 1000) / 10}%`;
  const MAILCHIMP_TOOLS = [
    { name: 'mailchimp_audiences', description: 'Your Mailchimp audiences with size and average open and click rates.', parameters: { type: 'object', properties: {} },
      run: async () => { const r = await mc('/lists?count=20'); return (r.lists || []).map((l) => `[${l.id}] ${l.name} · ${l.stats.member_count} subscribers · opens ${pct(l.stats.open_rate / 100)} · clicks ${pct(l.stats.click_rate / 100)}`).join('\n') || 'No audiences.'; } },
    { name: 'mailchimp_campaigns', description: 'Your most recent sent Mailchimp campaigns and how they did.', parameters: { type: 'object', properties: {} },
      run: async () => { const r = await mc('/campaigns?count=10&status=sent&sort_field=send_time&sort_dir=DESC'); return (r.campaigns || []).map((c) => `${c.send_time?.slice(0, 10)} · ${c.settings.subject_line || c.settings.title} · sent to ${c.emails_sent} · opens ${pct(c.report_summary?.open_rate)} · clicks ${pct(c.report_summary?.click_rate)}`).join('\n') || 'No sent campaigns.'; } },
    { name: 'mailchimp_add_subscriber', write: true, description: 'Add someone to a Mailchimp audience. They get an email to confirm first.', parameters: { type: 'object', properties: { list_id: { type: 'string' }, email: { type: 'string' }, first_name: { type: 'string' } }, required: ['list_id', 'email'] },
      run: async ({ list_id: id, email, first_name: fn }) => { await mc(`/lists/${id}/members`, { method: 'POST', body: { email_address: email, status: 'pending', ...(fn ? { merge_fields: { FNAME: fn } } : {}) } }); return `${email} was sent a confirmation email.`; } },
  ];

  // ---------- ClickUp ----------
  const cu = (p, opts = {}) => http(`https://api.clickup.com/api/v2${p}`, { ...opts, headers: { Authorization: secret('clickup') } });
  const CLICKUP_TOOLS = [
    { name: 'clickup_my_tasks', description: 'Your open ClickUp tasks.', parameters: { type: 'object', properties: {} },
      run: async () => {
        const [{ user }, { teams }] = await Promise.all([cu('/user'), cu('/team')]);
        const out = [];
        for (const t of (teams || []).slice(0, 3)) for (const k of (await cu(`/team/${t.id}/task?assignees[]=${user.id}&subtasks=true&order_by=due_date`)).tasks || []) out.push(`${k.name} · ${k.status?.status} · ${k.list?.name || ''}${k.due_date ? ` · due ${new Date(Number(k.due_date)).toISOString().slice(0, 10)}` : ''} · ${k.url}`);
        return clip(out.join('\n') || 'No open tasks assigned to you.');
      } },
    { name: 'clickup_lists', description: 'Your ClickUp lists (with ids, for adding tasks).', parameters: { type: 'object', properties: {} },
      run: async () => {
        const { teams } = await cu('/team');
        const out = [];
        for (const t of (teams || []).slice(0, 3)) for (const s of (await cu(`/team/${t.id}/space?archived=false`)).spaces || []) {
          for (const l of (await cu(`/space/${s.id}/list?archived=false`)).lists || []) out.push(`[${l.id}] ${s.name} › ${l.name}`);
          for (const f of (await cu(`/space/${s.id}/folder?archived=false`)).folders || []) for (const l of f.lists || []) out.push(`[${l.id}] ${s.name} › ${f.name} › ${l.name}`);
        }
        return clip(out.join('\n') || 'No lists.');
      } },
    { name: 'clickup_create_task', write: true, description: 'Create a ClickUp task in a list.', parameters: { type: 'object', properties: { list_id: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, due: { type: 'string', description: 'Optional date, e.g. 2026-11-20' } }, required: ['list_id', 'name'] },
      run: async ({ list_id: id, name, description, due }) => { const t = await cu(`/list/${id}/task`, { method: 'POST', body: { name, description, ...(due ? { due_date: Date.parse(due) } : {}) } }); return `Created "${t.name}": ${t.url}`; } },
  ];

  // ---------- monday.com ----------
  const mon = async (query, variables = {}) => { const r = await http('https://api.monday.com/v2', { method: 'POST', headers: { Authorization: secret('monday') }, body: { query, variables } }); if (r.errors?.length) throw new Error(r.errors[0].message); return r.data; };
  const MONDAY_TOOLS = [
    { name: 'monday_boards', description: 'Your monday.com boards.', parameters: { type: 'object', properties: {} },
      run: async () => (await mon('{boards(limit:50){id name items_count}}')).boards.map((b) => `[${b.id}] ${b.name} · ${b.items_count ?? '?'} items`).join('\n') || 'No boards.' },
    { name: 'monday_items', description: 'The items on a monday.com board, with their columns.', parameters: { type: 'object', properties: { board_id: { type: 'string' } }, required: ['board_id'] },
      run: async ({ board_id: id }) => {
        const d = await mon('query($id:[ID!]){boards(ids:$id){name items_page(limit:100){items{name group{title} column_values{column{title} text}}}}}', { id: [String(id)] });
        const b = d.boards?.[0];
        if (!b) return 'That board wasn\'t found.';
        return clip(`${b.name}\n${b.items_page.items.map((i) => `- ${i.name} (${i.group?.title}) · ${i.column_values.filter((c) => c.text).map((c) => `${c.column.title}: ${c.text}`).join(' · ')}`).join('\n')}`);
      } },
    { name: 'monday_create_item', write: true, description: 'Add an item to a monday.com board.', parameters: { type: 'object', properties: { board_id: { type: 'string' }, name: { type: 'string' } }, required: ['board_id', 'name'] },
      run: async ({ board_id: id, name }) => { const d = await mon('mutation($b:ID!,$n:String!){create_item(board_id:$b,item_name:$n){id}}', { b: String(id), n: name }); return `Added item ${d.create_item.id}.`; } },
  ];

  // ---------- Calendly (read-only) ----------
  const cal = (p) => http(p.startsWith('http') ? p : `https://api.calendly.com${p}`, { headers: { Authorization: `Bearer ${secret('calendly')}` } });
  const CALENDLY_TOOLS = [
    { name: 'calendly_upcoming', description: 'Your upcoming Calendly meetings and who booked them.', parameters: { type: 'object', properties: {} },
      run: async () => {
        const me = (await cal('/users/me')).resource;
        const r = await cal(`/scheduled_events?${new URLSearchParams({ user: me.uri, min_start_time: new Date().toISOString(), status: 'active', sort: 'start_time:asc', count: '20' })}`);
        const lines = await Promise.all((r.collection || []).map(async (e) => {
          const inv = (await cal(`${e.uri}/invitees?count=5`).catch(() => ({}))).collection || [];
          return `${new Date(e.start_time).toLocaleString()} · ${e.name}${inv.length ? ` · with ${inv.map((i) => `${i.name} <${i.email}>`).join(', ')}` : ''}`;
        }));
        return lines.join('\n') || 'No upcoming meetings.';
      } },
  ];

  // ---------- Figma (read-only) ----------
  const fg = (p) => http(`https://api.figma.com/v1${p}`, { headers: { 'X-Figma-Token': secret('figma') } });
  const fileKey = (f) => (String(f).match(/figma\.com\/(?:file|design|proto)\/([A-Za-z0-9]+)/) || [])[1] || String(f).trim();
  const FIGMA_TOOLS = [
    { name: 'figma_file', description: 'A Figma file\'s pages and frames (give its link or key).', parameters: { type: 'object', properties: { file: { type: 'string' } }, required: ['file'] },
      run: async ({ file }) => { const f = await fg(`/files/${fileKey(file)}?depth=2`); return clip(`${f.name} · last edited ${f.lastModified?.slice(0, 10)}\n${(f.document?.children || []).map((p) => `${p.name}: ${(p.children || []).map((c) => c.name).slice(0, 40).join(', ')}`).join('\n')}`); } },
    { name: 'figma_comments', description: 'The comments on a Figma file.', parameters: { type: 'object', properties: { file: { type: 'string' } }, required: ['file'] },
      run: async ({ file }) => { const r = await fg(`/files/${fileKey(file)}/comments`); return clip((r.comments || []).map((c) => `${c.created_at?.slice(0, 10)} · ${c.user?.handle}${c.resolved_at ? ' (resolved)' : ''}: ${c.message}`).join('\n') || 'No comments.'); } },
  ];

  // ---------- WordPress ----------
  const wp = (p, opts = {}) => http(`https://${site(C('wordpress').site)}/wp-json/wp/v2${p}`, { ...opts, headers: { Authorization: basic(C('wordpress').email, String(secret('wordpress')).replace(/\s+/g, '')) } });
  const plain = (h) => String(h || '').replace(/<[^>]+>/g, '').replace(/&#8217;/g, "'").replace(/&amp;/g, '&').trim();
  const WORDPRESS_TOOLS = [
    { name: 'wordpress_posts', description: 'Your WordPress posts (newest first), optionally matching words.', parameters: { type: 'object', properties: { query: { type: 'string' }, status: { type: 'string', description: 'publish (default), draft or any' } } },
      run: async ({ query, status = 'publish' }) => {
        const r = await wp(`/posts?${new URLSearchParams({ per_page: '15', status: status === 'any' ? 'publish,draft,pending,future,private' : status, ...(query ? { search: query } : {}) })}`);
        return (r || []).map((p) => `[${p.id}] ${plain(p.title?.rendered)} · ${p.status} · ${p.date?.slice(0, 10)} · ${p.link}`).join('\n') || 'No posts match.';
      } },
    { name: 'wordpress_draft', write: true, description: 'Write a new WordPress post as a draft (not published) for you to review.', parameters: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string', description: 'The post, in HTML or plain paragraphs' } }, required: ['title', 'content'] },
      run: async ({ title, content }) => {
        const html = /<\w+/.test(content) ? content : content.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('\n');
        const p = await wp('/posts', { method: 'POST', body: { title, content: html, status: 'draft' } });
        return `Draft saved. Review it: https://${site(C('wordpress').site)}/wp-admin/post.php?post=${p.id}&action=edit`;
      } },
  ];

  // Saves a file Quicksilver made to OneDrive or Dropbox, in a "Quicksilver" folder.
  async function upload(dest, name, buf) {
    if (dest === 'onedrive') {
      if (buf.length > 250e6) throw new Error('That file is too big to send to OneDrive from here (over 250 MB).');
      const f = await ms(`/me/drive/root:/Quicksilver/${encodeURIComponent(name)}:/content?@microsoft.graph.conflictBehavior=rename`, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: buf });
      return { name: f.name, link: f.webUrl, where: 'OneDrive › Quicksilver' };
    }
    if (dest === 'dropbox') {
      if (buf.length > 150e6) throw new Error('That file is too big to send to Dropbox from here (over 150 MB).');
      const f = await dbx('https://content.dropboxapi.com/2/files/upload', { method: 'POST', headers: { 'Dropbox-API-Arg': JSON.stringify({ path: `/Quicksilver/${name}`, mode: 'add', autorename: true }), 'Content-Type': 'application/octet-stream' }, body: buf });
      const link = await dbx('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', { method: 'POST', body: { path: f.path_display, settings: { requested_visibility: 'public' } } }).then((x) => x.url).catch(() => '');
      return { name: f.name, link: link || `https://www.dropbox.com/home/Quicksilver`, where: 'Dropbox › Quicksilver' };
    }
    throw new Error('Unknown cloud.');
  }

  const TOOLS = { microsoft: MS_TOOLS, dropbox: DROPBOX_TOOLS, spotify: SPOTIFY_TOOLS, hubspot: HUBSPOT_TOOLS, pipedrive: PIPEDRIVE_TOOLS, zendesk: ZENDESK_TOOLS, stripe: STRIPE_TOOLS, shopify: SHOPIFY_TOOLS, mailchimp: MAILCHIMP_TOOLS, clickup: CLICKUP_TOOLS, monday: MONDAY_TOOLS, calendly: CALENDLY_TOOLS, figma: FIGMA_TOOLS, wordpress: WORDPRESS_TOOLS };

  // Checks the connection (signing in through the browser first where needed) and says who you are.
  async function test(id) {
    if (OAUTH[id] && !signedIn(id)) await signIn(id);
    if (id === 'microsoft') { const me = await ms('/me?$select=displayName,mail,userPrincipalName'); return me.mail || me.userPrincipalName || me.displayName; }
    if (id === 'dropbox') return (await dbx('https://api.dropboxapi.com/2/users/get_current_account', { method: 'POST', body: null })).email;
    if (id === 'spotify') return (await sp('/me')).display_name || 'connected';
    if (id === 'hubspot') return `portal ${(await hs('/account-info/v3/details')).portalId}`;
    if (id === 'pipedrive') return (await pd('/users/me')).data.name;
    if (id === 'zendesk') return (await zd('/api/v2/users/me.json')).user.name;
    if (id === 'stripe') { const b = await st('/balance'); return `connected (${(b.available?.[0]?.currency || '').toUpperCase()})`; }
    if (id === 'shopify') return (await shop('{shop{name}}')).shop.name;
    if (id === 'mailchimp') return (await mc('/')).account_name;
    if (id === 'clickup') return (await cu('/user')).user.username;
    if (id === 'monday') return (await mon('{me{name}}')).me.name;
    if (id === 'calendly') return (await cal('/users/me')).resource.name;
    if (id === 'figma') return (await fg('/me')).handle;
    if (id === 'wordpress') return (await wp('/users/me')).name;
    return 'connected';
  }
  return { CONNECTORS, TOOLS, test, forget, upload, ready: (id) => (OAUTH[id] ? signedIn(id) : null), isOAuth: (id) => Boolean(OAUTH[id]) };
};
module.exports.openBrowser = (url) => require('electron').shell.openExternal(url);
