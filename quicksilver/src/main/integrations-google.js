// Google connectors: Gmail, Google Calendar, Google Drive (with Docs and Sheets) and Google Tasks.
// Google's APIs need you to sign in through your browser (OAuth). Quicksilver has no Google client
// of its own, so you make one once in Google Cloud (free, about 5 minutes) and paste its ID and
// secret; every Google connector reuses them. Signing in uses the desktop "loopback" flow with
// PKCE: your browser opens Google's sign-in, Google sends you back to a one-time address on this PC,
// and the refresh token is stored encrypted here. Nothing goes through anyone else's server.
const crypto = require('node:crypto');
const nodeHttp = require('node:http');
const store = require('./store');

module.exports = ({ http, clip, cfg }) => {
  const SHARED = 'int:google-client';
  const C = (id) => cfg()[id] || {};
  const refreshKey = (id) => `int:${id}:refresh`;
  const setupHelp = 'One-time setup, about 5 minutes: in Google Cloud Console create a project, enable the API for this service, set up the OAuth consent screen (External, add your own Google account as a test user), then Credentials → Create credentials → OAuth client ID → Desktop app. Paste its client ID and secret here. Every Google connector reuses them.';
  const note = 'When you press Sign in, your browser opens Google\'s sign-in. Because the Google Cloud app is your own, Google says it "hasn\'t verified this app": choose Continue. Your emails, files and events go straight from Google to this PC; only the parts a chat needs are given to the model you chose.';
  const fields = (api) => [
    { key: 'client', label: 'OAuth client ID', placeholder: '1234-abc.apps.googleusercontent.com', help: `${setupHelp} Enable: ${api}.`, url: 'https://console.cloud.google.com/apis/credentials' },
    { key: 'token', label: 'OAuth client secret', secret: true, help: 'Shown next to the client ID when you create it (Download JSON also has it).' },
  ];
  const SCOPES = {
    gmail: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.compose'],
    gcalendar: ['https://www.googleapis.com/auth/calendar.events'],
    gdrive: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/spreadsheets'],
    gtasks: ['https://www.googleapis.com/auth/tasks'],
    gcontacts: ['https://www.googleapis.com/auth/contacts.readonly'],
    youtube: ['https://www.googleapis.com/auth/youtube.readonly'],
    gforms: ['https://www.googleapis.com/auth/forms.body.readonly', 'https://www.googleapis.com/auth/forms.responses.readonly'],
    ganalytics: ['https://www.googleapis.com/auth/analytics.readonly'],
    gtagmanager: ['https://www.googleapis.com/auth/tagmanager.readonly'],
    gsearchconsole: ['https://www.googleapis.com/auth/webmasters.readonly'],
    gadsense: ['https://www.googleapis.com/auth/adsense.readonly'],
  };
  // One sign-in for everything: every scope above.
  SCOPES.google = [...new Set(Object.values(SCOPES).flat())];
  const ALL_APIS = 'Gmail API, Google Calendar API, Google Drive API, Google Sheets API, Google Tasks API, People API, YouTube Data API v3, Google Forms API, Google Analytics Data API, Google Analytics Admin API, Tag Manager API, Google Search Console API and AdSense Management API (only the ones you\'ll use)';
  const CONNECTORS = {
    google: { name: 'Google: every service, one sign-in', icon: '🌐', group: 'Google', google: true, all: true, note: `${note} Signing in here turns on every Google connector below at once.`, blurb: 'Sign in once for Gmail, Calendar, Drive, Docs, Sheets, Tasks, Contacts, YouTube, Forms, Analytics, Tag Manager, Search Console and AdSense. Anything that sends, creates or changes something always asks you first.', fields: fields(ALL_APIS) },
    gmail: { name: 'Gmail', icon: '✉️', group: 'Google', google: true, note, blurb: 'Search and read your email, write drafts and send replies (sending always asks you first).', fields: fields('Gmail API') },
    gcalendar: { name: 'Google Calendar', icon: '📆', group: 'Google', google: true, note, blurb: 'Your upcoming events; add new ones (asks you first).', fields: fields('Google Calendar API') },
    gdrive: { name: 'Google Drive, Docs & Sheets', icon: '📁', group: 'Google', google: true, note, blurb: 'Find and read Drive files, Docs and Sheets; create Docs and add rows to Sheets (asks you first).', fields: fields('Google Drive API and Google Sheets API') },
    gtasks: { name: 'Google Tasks', icon: '☑️', group: 'Google', google: true, note, blurb: 'See your to-dos and add new ones (asks you first).', fields: fields('Google Tasks API') },
    gcontacts: { name: 'Google Contacts', icon: '👥', group: 'Google', google: true, note, blurb: 'Look up people\'s emails, phone numbers and companies. Read-only.', fields: fields('People API') },
    youtube: { name: 'YouTube', icon: '▶️', group: 'Google', google: true, note, blurb: 'Search videos, see a video\'s details and your playlists. Read-only.', fields: fields('YouTube Data API v3') },
    gforms: { name: 'Google Forms', icon: '📝', group: 'Google', google: true, note, blurb: 'Read a form\'s questions and summarise its responses. Read-only.', fields: fields('Google Forms API') },
    ganalytics: { name: 'Google Analytics (GA4)', icon: '📈', group: 'Google', google: true, note, blurb: 'Visitors, sessions, top pages, traffic sources and conversions for your sites, plus who\'s on right now. Read-only.', fields: fields('Google Analytics Data API and Google Analytics Admin API') },
    gtagmanager: { name: 'Google Tag Manager', icon: '🏷️', group: 'Google', google: true, note, blurb: 'Your containers, tags, triggers and variables, so you can audit what fires where. Read-only.', fields: fields('Tag Manager API') },
    gsearchconsole: { name: 'Google Search Console', icon: '🔎', group: 'Google', google: true, note, blurb: 'Search clicks, impressions, positions and top queries for your sites, and whether a page is indexed. Read-only.', fields: fields('Google Search Console API') },
    gadsense: { name: 'Google AdSense', icon: '💵', group: 'Google', google: true, note, blurb: 'Your AdSense earnings, page views and clicks by day, site or country. Read-only.', fields: fields('AdSense Management API') },
  };
  const isGoogle = (id) => Boolean(CONNECTORS[id]);

  // The client ID and secret are shared: entered once, reused by every Google connector.
  const clientOf = (id) => {
    const own = C(id).client;
    const shared = cfg()['google-client'] || {};
    return { id: own || shared.client, secret: store.getSecret(`int:${id}`) || store.getSecret(SHARED) };
  };
  function remember(id) {
    const { id: client, secret } = clientOf(id);
    if (!client || !secret) return;
    const all = cfg();
    all['google-client'] = { client };
    store.saveConfig({ integrations: all });
    store.setSecret(SHARED, secret);
  }

  const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const PAGE = (msg) => `<!doctype html><meta charset="utf-8"><title>Quicksilver</title><body style="font-family:system-ui;background:#0f1724;color:#e8eef8;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><div style="font-size:42px">💧</div><h2>${msg}</h2><p>You can close this tab and go back to Quicksilver.</p></div>`;

  // Opens Google's sign-in in the browser and waits (up to 5 minutes) for it to come back.
  async function signIn(id) {
    const { id: client, secret } = clientOf(id);
    if (!client || !secret) throw new Error('Paste your Google OAuth client ID and secret first.');
    const verifier = b64url(crypto.randomBytes(32));
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    const state = b64url(crypto.randomBytes(16));
    const server = nodeHttp.createServer();
    await new Promise((res) => server.listen(0, '127.0.0.1', res));
    const redirect = `http://127.0.0.1:${server.address().port}`;
    try {
      const code = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Google sign-in timed out. Press Sign in to try again.')), 5 * 60 * 1000);
        server.on('request', (req, res) => {
          const u = new URL(req.url, redirect);
          if (u.pathname !== '/') { res.writeHead(404); res.end(); return; }
          const err = u.searchParams.get('error');
          const ok = !err && u.searchParams.get('state') === state && u.searchParams.get('code');
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(PAGE(ok ? 'Signed in to Google' : 'Sign-in didn\'t finish'));
          clearTimeout(timer);
          if (ok) resolve(u.searchParams.get('code'));
          else reject(new Error(err === 'access_denied' ? 'Google sign-in was cancelled.' : `Google sign-in failed${err ? `: ${err}` : ''}.`));
        });
        const url = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
          client_id: client, redirect_uri: redirect, response_type: 'code', scope: ['openid', 'email', ...SCOPES[id]].join(' '),
          code_challenge: challenge, code_challenge_method: 'S256', state, access_type: 'offline', prompt: 'consent',
        })}`;
        module.exports.openBrowser(url);
      });
      const tok = await tokenRequest({ code, client_id: client, client_secret: secret, redirect_uri: redirect, grant_type: 'authorization_code', code_verifier: verifier });
      if (!tok.refresh_token) throw new Error('Google didn\'t return a lasting sign-in. Remove Quicksilver under myaccount.google.com → Security → Third-party access, then sign in again.');
      store.setSecret(refreshKey(id), tok.refresh_token);
      access.set(id, { token: tok.access_token, until: Date.now() + (tok.expires_in - 60) * 1000 });
    } finally { server.close(); }
  }
  async function tokenRequest(params) {
    const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params), signal: AbortSignal.timeout(30000) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error_description || j.error || `Google said ${res.status}`);
    return j;
  }
  const access = new Map();
  async function token(id) {
    const a = access.get(id);
    if (a && a.until > Date.now()) return a.token;
    const own = store.getSecret(refreshKey(id));
    const refresh = own || store.getSecret(refreshKey('google'));
    if (!refresh) throw new Error(`Sign in to ${CONNECTORS[id].name} first (Connectors).`);
    const { id: client, secret } = clientOf(own ? id : 'google');
    const tok = await tokenRequest({ refresh_token: refresh, client_id: client, client_secret: secret, grant_type: 'refresh_token' });
    access.set(id, { token: tok.access_token, until: Date.now() + (tok.expires_in - 60) * 1000 });
    return tok.access_token;
  }
  const g = async (id, url, opts = {}) => http(url, { ...opts, headers: { Authorization: `Bearer ${await token(id)}`, ...(opts.headers || {}) } });

  // Called when you press Sign in (and when settings are saved): signs in if needed, returns the account.
  async function test(id) {
    remember(id);
    if (!store.getSecret(refreshKey(id)) && !(id !== 'google' && store.getSecret(refreshKey('google')))) await signIn(id);
    const me = await g(id, 'https://openidconnect.googleapis.com/v1/userinfo');
    const account = me.email || 'connected';
    if (id === 'google') {
      // Every Google connector is on, using this one sign-in.
      const all = cfg();
      for (const k of Object.keys(CONNECTORS)) if (k !== 'google') all[k] = { ...(all[k] || {}), enabled: true, account, viaGoogle: true };
      store.saveConfig({ integrations: all });
    }
    return account;
  }
  function forget(id) {
    store.setSecret(refreshKey(id), ''); access.delete(id);
    if (id === 'google') {
      // Turning off "every service" turns off the connectors that were using it.
      const all = cfg();
      for (const k of Object.keys(CONNECTORS)) if (all[k]?.viaGoogle && !store.getSecret(refreshKey(k))) { delete all[k]; access.delete(k); }
      store.saveConfig({ integrations: all });
    }
  }

  // ---------- Gmail ----------
  const GM = 'https://gmail.googleapis.com/gmail/v1/users/me';
  const header = (m, n) => (m.payload?.headers || []).find((h) => h.name.toLowerCase() === n.toLowerCase())?.value || '';
  const unb64 = (s) => Buffer.from(String(s || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  const stripHtml = (h) => String(h || '').replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, '').replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\n{3,}/g, '\n\n');
  function bodyOf(part) {
    if (!part) return '';
    if (part.mimeType === 'text/plain' && part.body?.data) return unb64(part.body.data);
    for (const p of part.parts || []) { const t = bodyOf(p); if (t) return t; }
    if (part.mimeType === 'text/html' && part.body?.data) return stripHtml(unb64(part.body.data));
    return '';
  }
  const mime = ({ to, cc, subject, body, inReplyTo }) => b64url(Buffer.from([`To: ${to}`, cc ? `Cc: ${cc}` : '', `Subject: =?UTF-8?B?${Buffer.from(subject || '').toString('base64')}?=`, inReplyTo ? `In-Reply-To: ${inReplyTo}\r\nReferences: ${inReplyTo}` : '', 'Content-Type: text/plain; charset=UTF-8', '', body || ''].filter((l, i) => l !== '' || i === 5).join('\r\n')));
  const mailArgs = { type: 'object', properties: { to: { type: 'string', description: 'Email address(es), comma-separated' }, cc: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string', description: 'Plain text' }, reply_to_id: { type: 'string', description: 'Optional: id of the email this replies to (keeps it in the same thread)' } }, required: ['to', 'subject', 'body'] };
  async function replyBits(id) {
    if (!id) return {};
    const m = await g('gmail', `${GM}/messages/${id}?format=metadata&metadataHeaders=Message-ID`);
    return { threadId: m.threadId, inReplyTo: header(m, 'Message-ID') };
  }
  const GMAIL_TOOLS = [
    { name: 'gmail_search', description: 'Search your Gmail, using Gmail search words (from:, to:, subject:, is:unread, newer_than:7d, has:attachment…). Lists matching emails.', parameters: { type: 'object', properties: { query: { type: 'string', description: 'e.g. "from:anna newer_than:30d" or "invoice is:unread"' }, max: { type: 'integer', description: 'How many (default 10, at most 25)' } }, required: ['query'] },
      run: async ({ query, max = 10 }) => {
        const r = await g('gmail', `${GM}/messages?${new URLSearchParams({ q: query, maxResults: String(Math.min(25, max || 10)) })}`);
        if (!r.messages?.length) return 'No emails match.';
        const list = await Promise.all(r.messages.map((x) => g('gmail', `${GM}/messages/${x.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`)));
        return clip(list.map((m) => `[${m.id}] ${header(m, 'Date')} · ${header(m, 'From')} · ${header(m, 'Subject') || '(no subject)'}\n  ${m.snippet || ''}`).join('\n'));
      } },
    { name: 'gmail_read', description: 'Read one email in full (use the id from gmail_search).', parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      run: async ({ id }) => {
        const m = await g('gmail', `${GM}/messages/${id}?format=full`);
        return clip(`From: ${header(m, 'From')}\nTo: ${header(m, 'To')}\nDate: ${header(m, 'Date')}\nSubject: ${header(m, 'Subject')}\n\n${bodyOf(m.payload).trim() || m.snippet || ''}`);
      } },
    { name: 'gmail_draft', write: true, description: 'Save an email as a draft in Gmail (not sent).', parameters: mailArgs,
      run: async (a) => { const r = await replyBits(a.reply_to_id); const d = await g('gmail', `${GM}/drafts`, { method: 'POST', body: { message: { raw: mime({ ...a, inReplyTo: r.inReplyTo }), ...(r.threadId ? { threadId: r.threadId } : {}) } } }); return `Draft saved in Gmail (id ${d.id}).`; } },
    { name: 'gmail_send', write: true, description: 'Send an email from your Gmail.', parameters: mailArgs,
      run: async (a) => { const r = await replyBits(a.reply_to_id); const s = await g('gmail', `${GM}/messages/send`, { method: 'POST', body: { raw: mime({ ...a, inReplyTo: r.inReplyTo }), ...(r.threadId ? { threadId: r.threadId } : {}) } }); return `Sent (id ${s.id}).`; } },
  ];

  // ---------- Google Calendar ----------
  const CAL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const when = (e) => (e.start?.dateTime ? new Date(e.start.dateTime).toLocaleString() : `${e.start?.date} (all day)`);
  const CAL_TOOLS = [
    { name: 'gcal_events', description: 'Your Google Calendar events from now on (or matching words).', parameters: { type: 'object', properties: { days: { type: 'integer', description: 'How many days ahead (default 7)' }, query: { type: 'string', description: 'Optional words to match' } } },
      run: async ({ days = 7, query }) => {
        const now = new Date();
        const r = await g('gcalendar', `${CAL}?${new URLSearchParams({ timeMin: now.toISOString(), timeMax: new Date(now.getTime() + Math.min(366, days || 7) * 86400000).toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '50', ...(query ? { q: query } : {}) })}`);
        if (!r.items?.length) return 'Nothing on the calendar then.';
        return clip(r.items.map((e) => `${when(e)} · ${e.summary || '(no title)'}${e.location ? ` · ${e.location}` : ''}${e.attendees?.length ? ` · with ${e.attendees.map((x) => x.email).slice(0, 6).join(', ')}` : ''}`).join('\n'));
      } },
    { name: 'gcal_create_event', write: true, description: 'Add an event to your Google Calendar.', parameters: { type: 'object', properties: { title: { type: 'string' }, start: { type: 'string', description: 'ISO date-time like 2026-11-12T15:00, or a date like 2026-11-12 for all day' }, end: { type: 'string', description: 'Optional; defaults to one hour after the start' }, location: { type: 'string' }, description: { type: 'string' }, attendees: { type: 'string', description: 'Optional emails, comma-separated (they get an invite)' } }, required: ['title', 'start'] },
      run: async ({ title, start, end, location, description, attendees }) => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const allDay = /^\d{4}-\d{2}-\d{2}$/.test(start);
        const endAt = end || (allDay ? start : new Date(new Date(start).getTime() + 3600000).toISOString().slice(0, 19));
        const at = (v) => (allDay ? { date: v } : { dateTime: v.length === 16 ? `${v}:00` : v, timeZone: tz });
        const e = await g('gcalendar', `${CAL}${attendees ? '?sendUpdates=all' : ''}`, { method: 'POST', body: { summary: title, location, description, start: at(start), end: at(endAt), ...(attendees ? { attendees: attendees.split(',').map((x) => ({ email: x.trim() })).filter((x) => x.email) } : {}) } });
        return `Added: ${e.summary} on ${when(e)}. ${e.htmlLink || ''}`;
      } },
  ];

  // ---------- Google Drive, Docs and Sheets ----------
  const DR = 'https://www.googleapis.com/drive/v3/files';
  const EXPORT = { 'application/vnd.google-apps.document': 'text/plain', 'application/vnd.google-apps.spreadsheet': 'text/csv', 'application/vnd.google-apps.presentation': 'text/plain' };
  const DRIVE_TOOLS = [
    { name: 'gdrive_search', description: 'Find files in your Google Drive by name or the words inside them.', parameters: { type: 'object', properties: { query: { type: 'string' }, max: { type: 'integer', description: 'Default 10' } }, required: ['query'] },
      run: async ({ query, max = 10 }) => {
        const q = `(name contains '${query.replace(/'/g, "\\'")}' or fullText contains '${query.replace(/'/g, "\\'")}') and trashed = false`;
        const r = await g('gdrive', `${DR}?${new URLSearchParams({ q, pageSize: String(Math.min(25, max || 10)), fields: 'files(id,name,mimeType,modifiedTime,webViewLink)', orderBy: 'modifiedTime desc' })}`);
        if (!r.files?.length) return 'No files match.';
        return r.files.map((f) => `[${f.id}] ${f.name} · ${f.mimeType.replace('application/vnd.google-apps.', 'Google ')} · ${f.modifiedTime?.slice(0, 10)} · ${f.webViewLink}`).join('\n');
      } },
    { name: 'gdrive_read', description: 'Read a Drive file: Google Docs and Slides as text, Sheets as CSV (first sheet), and plain text files.', parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      run: async ({ id }) => {
        const f = await g('gdrive', `${DR}/${id}?fields=id,name,mimeType,webViewLink`);
        const res = EXPORT[f.mimeType]
          ? await g('gdrive', `${DR}/${id}/export?mimeType=${encodeURIComponent(EXPORT[f.mimeType])}`, { raw: true })
          : /^text\/|json|csv|xml|markdown/.test(f.mimeType) ? await g('gdrive', `${DR}/${id}?alt=media`, { raw: true }) : null;
        if (!res) return `${f.name} is a ${f.mimeType} file, which can't be read as text here. Open it: ${f.webViewLink}`;
        if (!res.ok) throw new Error(`Google said ${res.status}`);
        return clip(`${f.name}\n\n${await res.text()}`);
      } },
    { name: 'gdocs_create', write: true, description: 'Create a new Google Doc with the given text.', parameters: { type: 'object', properties: { title: { type: 'string' }, text: { type: 'string' } }, required: ['title', 'text'] },
      run: async ({ title, text }) => {
        const boundary = `qs${crypto.randomBytes(8).toString('hex')}`;
        const body = Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: title, mimeType: 'application/vnd.google-apps.document' })}\r\n--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${text}\r\n--${boundary}--`);
        const f = await g('gdrive', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body });
        return `Created "${f.name}": ${f.webViewLink}`;
      } },
    { name: 'gsheets_read', description: 'Read cells from a Google Sheet.', parameters: { type: 'object', properties: { id: { type: 'string', description: 'Spreadsheet id (from gdrive_search or its link)' }, range: { type: 'string', description: 'e.g. "Sheet1!A1:F50" (default: the first 200 rows of the first sheet)' } }, required: ['id'] },
      run: async ({ id, range }) => {
        const r = await g('gdrive', `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range || 'A1:Z200')}`);
        return clip((r.values || []).map((row) => row.join('\t')).join('\n') || 'Those cells are empty.');
      } },
    { name: 'gsheets_append', write: true, description: 'Add rows to the end of a Google Sheet.', parameters: { type: 'object', properties: { id: { type: 'string' }, sheet: { type: 'string', description: 'Sheet name (default the first sheet)' }, rows: { type: 'array', items: { type: 'array', items: { type: 'string' } }, description: 'Rows of cell values' } }, required: ['id', 'rows'] },
      run: async ({ id, sheet, rows }) => {
        const r = await g('gdrive', `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(sheet ? `${sheet}!A1` : 'A1')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, { method: 'POST', body: { values: rows } });
        return `Added ${r.updates?.updatedRows ?? rows.length} row(s) at ${r.updates?.updatedRange || 'the end'}.`;
      } },
  ];

  // ---------- Google Tasks ----------
  const TK = 'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks';
  const TASK_TOOLS = [
    { name: 'gtasks_list', description: 'Your open Google Tasks to-dos.', parameters: { type: 'object', properties: {} },
      run: async () => {
        const r = await g('gtasks', `${TK}?showCompleted=false&maxResults=100`);
        return r.items?.length ? r.items.map((t) => `[${t.id}] ${t.title}${t.due ? ` · due ${t.due.slice(0, 10)}` : ''}${t.notes ? ` · ${t.notes.slice(0, 120)}` : ''}`).join('\n') : 'No open tasks.';
      } },
    { name: 'gtasks_add', write: true, description: 'Add a to-do to Google Tasks.', parameters: { type: 'object', properties: { title: { type: 'string' }, notes: { type: 'string' }, due: { type: 'string', description: 'Optional date, e.g. 2026-11-20' } }, required: ['title'] },
      run: async ({ title, notes, due }) => {
        const t = await g('gtasks', TK, { method: 'POST', body: { title, notes, ...(due ? { due: `${due.slice(0, 10)}T00:00:00.000Z` } : {}) } });
        return `Added "${t.title}".`;
      } },
    { name: 'gtasks_complete', write: true, description: 'Mark a Google Tasks to-do as done.', parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      run: async ({ id }) => { await g('gtasks', `${TK}/${id}`, { method: 'PATCH', body: { status: 'completed' } }); return 'Marked done.'; } },
  ];

  // ---------- Google Contacts ----------
  let contactsWarm = false;
  const CONTACT_TOOLS = [
    { name: 'gcontacts_search', description: 'Find people in your Google Contacts by name, email or company.', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
      run: async ({ query }) => {
        const P = 'https://people.googleapis.com/v1/people:searchContacts?readMask=names,emailAddresses,phoneNumbers,organizations&pageSize=20';
        if (!contactsWarm) { await g('gcontacts', `${P}&query=`).catch(() => {}); contactsWarm = true; } // Google asks for a warm-up search first
        const r = await g('gcontacts', `${P}&query=${encodeURIComponent(query)}`);
        if (!r.results?.length) return 'No contacts match.';
        return r.results.map(({ person: p }) => [p.names?.[0]?.displayName || '(no name)', ...(p.emailAddresses || []).map((e) => e.value), ...(p.phoneNumbers || []).map((n) => n.value), p.organizations?.[0]?.name].filter(Boolean).join(' · ')).join('\n');
      } },
  ];

  // ---------- YouTube ----------
  const YT = 'https://www.googleapis.com/youtube/v3';
  const YT_TOOLS = [
    { name: 'youtube_search', description: 'Search YouTube videos.', parameters: { type: 'object', properties: { query: { type: 'string' }, max: { type: 'integer', description: 'Default 8' } }, required: ['query'] },
      run: async ({ query, max = 8 }) => {
        const r = await g('youtube', `${YT}/search?${new URLSearchParams({ part: 'snippet', type: 'video', q: query, maxResults: String(Math.min(20, max || 8)) })}`);
        return r.items?.length ? r.items.map((v) => `${v.snippet.title} · ${v.snippet.channelTitle} · ${v.snippet.publishedAt?.slice(0, 10)} · https://youtu.be/${v.id.videoId}`).join('\n') : 'No videos found.';
      } },
    { name: 'youtube_video', description: 'Details of a YouTube video: description, length, views, likes.', parameters: { type: 'object', properties: { id: { type: 'string', description: 'Video id or link' } }, required: ['id'] },
      run: async ({ id }) => {
        const vid = (String(id).match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/) || [])[1] || id;
        const v = (await g('youtube', `${YT}/videos?part=snippet,statistics,contentDetails&id=${encodeURIComponent(vid)}`)).items?.[0];
        if (!v) return 'That video wasn\'t found.';
        return clip(`${v.snippet.title} · ${v.snippet.channelTitle} · ${v.snippet.publishedAt?.slice(0, 10)}\nLength ${v.contentDetails.duration.replace(/^PT/, '').toLowerCase()} · ${Number(v.statistics.viewCount || 0).toLocaleString()} views · ${Number(v.statistics.likeCount || 0).toLocaleString()} likes\n\n${v.snippet.description}`);
      } },
    { name: 'youtube_my_playlists', description: 'Your YouTube playlists.', parameters: { type: 'object', properties: {} },
      run: async () => {
        const r = await g('youtube', `${YT}/playlists?part=snippet,contentDetails&mine=true&maxResults=50`);
        return r.items?.length ? r.items.map((p) => `${p.snippet.title} · ${p.contentDetails.itemCount} videos · https://www.youtube.com/playlist?list=${p.id}`).join('\n') : 'No playlists.';
      } },
  ];

  // ---------- Google Forms ----------
  const FM = 'https://forms.googleapis.com/v1/forms';
  const questionsOf = (f) => (f.items || []).filter((i) => i.questionItem).map((i) => ({ id: i.questionItem.question.questionId, title: i.title || '(untitled question)' }));
  const FORM_TOOLS = [
    { name: 'gforms_read', description: 'A Google Form\'s title and questions.', parameters: { type: 'object', properties: { id: { type: 'string', description: 'Form id (from gdrive_search or its edit link)' } }, required: ['id'] },
      run: async ({ id }) => { const f = await g('gforms', `${FM}/${id}`); return `${f.info?.title || 'Form'}\n${questionsOf(f).map((q, i) => `${i + 1}. ${q.title}`).join('\n')}`; } },
    { name: 'gforms_responses', description: 'The responses to a Google Form, grouped by question.', parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      run: async ({ id }) => {
        const [f, r] = await Promise.all([g('gforms', `${FM}/${id}`), g('gforms', `${FM}/${id}/responses`)]);
        const qs = questionsOf(f);
        const rs = r.responses || [];
        if (!rs.length) return `${f.info?.title || 'The form'} has no responses yet.`;
        return clip(`${f.info?.title || 'Form'}: ${rs.length} responses\n\n${qs.map((q) => `${q.title}\n${rs.map((x) => (x.answers?.[q.id]?.textAnswers?.answers || []).map((a) => a.value).join(', ')).filter(Boolean).map((a) => `  - ${a}`).join('\n')}`).join('\n\n')}`);
      } },
  ];

  // ---------- Google Analytics (GA4) ----------
  const table = (headers, rows) => [headers.join(' | '), ...rows.map((r) => r.join(' | '))].join('\n');
  const propId = (p) => String(p || '').replace(/^properties\//, '').trim();
  const GA_TOOLS = [
    { name: 'ga_properties', description: 'Your Google Analytics accounts and GA4 properties (with their ids).', parameters: { type: 'object', properties: {} },
      run: async () => {
        const r = await g('ganalytics', 'https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200');
        const lines = (r.accountSummaries || []).flatMap((a) => (a.propertySummaries || []).map((p) => `${a.displayName} · ${p.displayName} · property ${propId(p.property)}`));
        return lines.length ? lines.join('\n') : 'No GA4 properties on this account.';
      } },
    { name: 'ga_report', description: 'A Google Analytics (GA4) report. Common metrics: activeUsers, newUsers, sessions, screenPageViews, engagementRate, averageSessionDuration, conversions, totalRevenue. Common dimensions: date, pagePath, pageTitle, sessionSource, sessionMedium, sessionDefaultChannelGroup, country, city, deviceCategory, eventName.', parameters: { type: 'object', properties: { property: { type: 'string', description: 'GA4 property id (from ga_properties)' }, metrics: { type: 'string', description: 'Comma-separated (default activeUsers,sessions,screenPageViews)' }, dimensions: { type: 'string', description: 'Comma-separated, optional' }, days: { type: 'integer', description: 'Last N days (default 28)' }, limit: { type: 'integer', description: 'Rows (default 20)' } }, required: ['property'] },
      run: async ({ property, metrics, dimensions, days = 28, limit = 20 }) => {
        const ms = String(metrics || 'activeUsers,sessions,screenPageViews').split(',').map((x) => x.trim()).filter(Boolean);
        const ds = String(dimensions || '').split(',').map((x) => x.trim()).filter(Boolean);
        const r = await g('ganalytics', `https://analyticsdata.googleapis.com/v1beta/properties/${propId(property)}:runReport`, { method: 'POST', body: { dateRanges: [{ startDate: `${Math.max(1, days || 28)}daysAgo`, endDate: 'today' }], metrics: ms.map((name) => ({ name })), dimensions: ds.map((name) => ({ name })), limit: Math.min(200, limit || 20), orderBys: [{ metric: { metricName: ms[0] }, desc: true }] } });
        if (!r.rows?.length) return 'No data for that period.';
        return clip(`Last ${days} days\n${table([...ds, ...ms], r.rows.map((x) => [...(x.dimensionValues || []).map((v) => v.value), ...(x.metricValues || []).map((v) => v.value)]))}`);
      } },
    { name: 'ga_realtime', description: 'Who is on your site right now (GA4, last 30 minutes), by page and country.', parameters: { type: 'object', properties: { property: { type: 'string' } }, required: ['property'] },
      run: async ({ property }) => {
        const r = await g('ganalytics', `https://analyticsdata.googleapis.com/v1beta/properties/${propId(property)}:runRealtimeReport`, { method: 'POST', body: { metrics: [{ name: 'activeUsers' }], dimensions: [{ name: 'unifiedScreenName' }, { name: 'country' }], limit: 20 } });
        const total = (r.rows || []).reduce((t, x) => t + Number(x.metricValues?.[0]?.value || 0), 0);
        return `${total} active users in the last 30 minutes\n${table(['page', 'country', 'users'], (r.rows || []).map((x) => [...x.dimensionValues.map((v) => v.value), x.metricValues[0].value]))}`;
      } },
  ];

  // ---------- Google Tag Manager ----------
  const TM = 'https://tagmanager.googleapis.com/tagmanager/v2';
  const GTM_TOOLS = [
    { name: 'gtm_containers', description: 'Your Google Tag Manager accounts and containers (with their paths).', parameters: { type: 'object', properties: {} },
      run: async () => {
        const accts = (await g('gtagmanager', `${TM}/accounts`)).account || [];
        const lines = [];
        for (const a of accts) for (const c of (await g('gtagmanager', `${TM}/${a.path}/containers`)).container || []) lines.push(`${a.name} · ${c.name} (${c.publicId}) · ${(c.usageContext || []).join(', ')} · ${c.path}`);
        return lines.length ? lines.join('\n') : 'No Tag Manager containers.';
      } },
    { name: 'gtm_tags', description: 'The tags in a Tag Manager container (default workspace), with what triggers them, plus its triggers and variables.', parameters: { type: 'object', properties: { container: { type: 'string', description: 'Container path like accounts/123/containers/456 (from gtm_containers)' } }, required: ['container'] },
      run: async ({ container }) => {
        const ws = ((await g('gtagmanager', `${TM}/${container}/workspaces`)).workspace || [])[0];
        if (!ws) return 'That container has no workspace.';
        const [tags, trigs, vars] = await Promise.all(['tags', 'triggers', 'variables'].map((k) => g('gtagmanager', `${TM}/${ws.path}/${k}`)));
        const tname = Object.fromEntries((trigs.trigger || []).map((t) => [t.triggerId, t.name]));
        return clip([`Workspace: ${ws.name}`, `\nTags (${(tags.tag || []).length}):`, ...(tags.tag || []).map((t) => `- ${t.name} · ${t.type}${t.paused ? ' · PAUSED' : ''} · fires on: ${(t.firingTriggerId || []).map((id) => tname[id] || id).join(', ') || 'nothing'}${t.blockingTriggerId?.length ? ` · blocked by: ${t.blockingTriggerId.map((id) => tname[id] || id).join(', ')}` : ''}`),
          `\nTriggers (${(trigs.trigger || []).length}):`, ...(trigs.trigger || []).map((t) => `- ${t.name} · ${t.type}`), `\nVariables (${(vars.variable || []).length}):`, ...(vars.variable || []).map((v) => `- ${v.name} · ${v.type}`)].join('\n'));
      } },
  ];

  // ---------- Google Search Console ----------
  const SC = 'https://www.googleapis.com/webmasters/v3';
  const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const GSC_TOOLS = [
    { name: 'gsc_sites', description: 'Your sites in Google Search Console.', parameters: { type: 'object', properties: {} },
      run: async () => { const r = await g('gsearchconsole', `${SC}/sites`); return (r.siteEntry || []).map((s) => `${s.siteUrl} · ${s.permissionLevel}`).join('\n') || 'No sites.'; } },
    { name: 'gsc_performance', description: 'Google Search performance for a site: clicks, impressions, click rate and average position, by query, page, country, device or date.', parameters: { type: 'object', properties: { site: { type: 'string', description: 'As listed by gsc_sites, e.g. https://example.com/ or sc-domain:example.com' }, by: { type: 'string', description: 'query, page, country, device or date (default query)' }, days: { type: 'integer', description: 'Default 28' }, limit: { type: 'integer', description: 'Default 20' } }, required: ['site'] },
      run: async ({ site, by = 'query', days = 28, limit = 20 }) => {
        const dim = ['query', 'page', 'country', 'device', 'date'].includes(by) ? by : 'query';
        const r = await g('gsearchconsole', `${SC}/sites/${encodeURIComponent(site)}/searchAnalytics/query`, { method: 'POST', body: { startDate: day(Math.max(1, days || 28) + 2), endDate: day(2), dimensions: [dim], rowLimit: Math.min(500, limit || 20) } });
        if (!r.rows?.length) return 'No search data for that period.';
        return clip(table([dim, 'clicks', 'impressions', 'click rate', 'position'], r.rows.map((x) => [x.keys[0], x.clicks, x.impressions, `${(x.ctr * 100).toFixed(1)}%`, x.position.toFixed(1)])));
      } },
    { name: 'gsc_inspect', description: 'Whether Google has indexed a page, when it last crawled it, and any problems.', parameters: { type: 'object', properties: { site: { type: 'string' }, url: { type: 'string', description: 'The full page address' } }, required: ['site', 'url'] },
      run: async ({ site, url }) => {
        const r = (await g('gsearchconsole', 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', { method: 'POST', body: { inspectionUrl: url, siteUrl: site } })).inspectionResult?.indexStatusResult || {};
        return [`Verdict: ${r.verdict || 'unknown'}`, `Coverage: ${r.coverageState || 'unknown'}`, `Last crawled: ${r.lastCrawlTime || 'never'}`, `Indexing allowed: ${r.indexingState || 'unknown'}`, `Google's chosen canonical: ${r.googleCanonical || '-'}`, `Page fetch: ${r.pageFetchState || '-'}`].join('\n');
      } },
  ];

  // ---------- Google AdSense ----------
  const AS = 'https://adsense.googleapis.com/v2';
  const ADSENSE_TOOLS = [
    { name: 'adsense_report', description: 'AdSense earnings and traffic: estimated earnings, page views, clicks and RPM, by date, site or country.', parameters: { type: 'object', properties: { range: { type: 'string', description: 'TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS (default), MONTH_TO_DATE, YEAR_TO_DATE' }, by: { type: 'string', description: 'DATE, DOMAIN_NAME or COUNTRY_NAME (default DATE)' } } },
      run: async ({ range = 'LAST_30_DAYS', by = 'DATE' }) => {
        const acct = ((await g('gadsense', `${AS}/accounts`)).accounts || [])[0];
        if (!acct) return 'No AdSense account.';
        const q = new URLSearchParams({ dateRange: range });
        for (const m of ['ESTIMATED_EARNINGS', 'PAGE_VIEWS', 'CLICKS', 'PAGE_VIEWS_RPM']) q.append('metrics', m);
        q.append('dimensions', ['DATE', 'DOMAIN_NAME', 'COUNTRY_NAME'].includes(by) ? by : 'DATE');
        const r = await g('gadsense', `${AS}/${acct.name}/reports:generate?${q}`);
        const cur = r.headers?.find((h) => h.currencyCode)?.currencyCode || '';
        return clip(`${acct.displayName || acct.name} (${cur})\n${table((r.headers || []).map((h) => h.name.toLowerCase().replace(/_/g, ' ')), (r.rows || []).map((x) => x.cells.map((c) => c.value)))}${r.totals ? `\nTotal: ${r.totals.cells.map((c) => c.value).filter(Boolean).join(' | ')}` : ''}`);
      } },
  ];

  // Saves a file Quicksilver made to Google Drive, in a "Quicksilver" folder. Returns its link.
  async function upload(name, buf, mime = 'application/octet-stream') {
    const auth = { Authorization: `Bearer ${await token('gdrive')}` };
    const q = "name = 'Quicksilver' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    let folder = (await g('gdrive', `${DR}?${new URLSearchParams({ q, fields: 'files(id)', pageSize: '1' })}`)).files?.[0]?.id;
    if (!folder) folder = (await g('gdrive', `${DR}?fields=id`, { method: 'POST', body: { name: 'Quicksilver', mimeType: 'application/vnd.google-apps.folder' } })).id;
    const start = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink', { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': mime }, body: JSON.stringify({ name, parents: [folder] }) });
    if (!start.ok) throw new Error(`Google Drive said ${start.status}`);
    const res = await fetch(start.headers.get('location'), { method: 'PUT', headers: { ...auth, 'Content-Type': mime }, body: buf });
    const f = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(f.error?.message || `Google Drive said ${res.status}`);
    return { name: f.name, link: f.webViewLink, where: 'Google Drive › Quicksilver' };
  }

  const TOOLS = { ganalytics: GA_TOOLS, gtagmanager: GTM_TOOLS, gsearchconsole: GSC_TOOLS, gadsense: ADSENSE_TOOLS, gmail: GMAIL_TOOLS, gcalendar: CAL_TOOLS, gdrive: DRIVE_TOOLS, gtasks: TASK_TOOLS, gcontacts: CONTACT_TOOLS, youtube: YT_TOOLS, gforms: FORM_TOOLS };
  // A connector counts as ready when it has signed in (on its own or through "every service").
  const ready = (id) => Boolean(store.getSecret(refreshKey(id)) || store.getSecret(refreshKey('google')));
  const hasClient = (id) => Boolean(clientOf(id).id && clientOf(id).secret);
  return { CONNECTORS, TOOLS, SCOPES, isGoogle, test, forget, ready, hasClient, clientOf, upload };
};
module.exports.openBrowser = (url) => require('electron').shell.openExternal(url);
