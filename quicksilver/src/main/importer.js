// Bring your chats from other AIs. Supported:
//   ChatGPT and DeepSeek (export .zip or conversations.json), Claude (export .zip or
//   conversations.json), Gemini (Google Takeout: My Activity → Gemini Apps, JSON), Grok (xAI data
//   export), Open WebUI (chat export), LM Studio (conversation .json), Jan (thread messages.jsonl),
//   SillyTavern (.jsonl), and any chat saved as Markdown or text ("User:" / "Assistant:" turns).
const AdmZip = require('adm-zip');

const textOf = (parts) => (parts || []).map((p) => (typeof p === 'string' ? p : p?.text?.value || p?.text || p?.content || (p?.content_type === 'image_asset_pointer' || p?.type === 'image_url' ? '(image)' : ''))).filter((x) => typeof x === 'string' && x).join('\n').trim();
const anyText = (c) => (typeof c === 'string' ? c.trim() : Array.isArray(c) ? textOf(c) : c && typeof c === 'object' ? textOf([c]) : '');
const USER = /^(user|human|you|me|prompter|customer)$/i;
const roleOf = (r) => (USER.test(String(r || '').trim()) ? 'user' : 'assistant');
const stripHtml = (h) => String(h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n{3,}/g, '\n\n').trim();
const ms = (v) => (typeof v === 'number' ? (v < 1e12 ? v * 1000 : v) : Date.parse(v) || 0);

// ---------- reading the file ----------
function readFiles(name, bytes) {
  const buf = Buffer.from(bytes);
  if (/\.zip$/i.test(name) || (buf[0] === 0x50 && buf[1] === 0x4b)) {
    const zip = new AdmZip(buf);
    const entries = zip.getEntries().filter((e) => !e.isDirectory && /\.(json|jsonl|md|txt)$/i.test(e.entryName));
    // The conversations file first (ChatGPT, Claude, DeepSeek), else any chat-looking file.
    entries.sort((a, b) => /conversations\.json$/i.test(b.entryName) - /conversations\.json$/i.test(a.entryName));
    if (!entries.length) throw new Error('No chats found in this .zip.');
    return entries.slice(0, 400).map((e) => ({ name: e.entryName, text: e.getData().toString('utf8') }));
  }
  return [{ name, text: buf.toString('utf8') }];
}

// ---------- formats ----------
// ChatGPT (and DeepSeek, which uses the same tree): follow the branch you last saw.
function fromTree(c, source) {
  const map = c.mapping || {};
  let id = c.current_node || Object.keys(map).find((k) => !map[k].children?.length);
  const path = [];
  const seen = new Set();
  while (id && map[id] && !seen.has(id)) { seen.add(id); path.push(map[id]); id = map[id].parent; }
  const messages = [];
  for (const node of path.reverse()) {
    const m = node.message;
    if (!m) continue;
    // DeepSeek: fragments of REQUEST / RESPONSE (THINK fragments are left out).
    if (Array.isArray(m.fragments)) {
      for (const f of m.fragments) {
        if (!f?.content || /THINK/i.test(f.type || '')) continue;
        messages.push({ role: /REQUEST/i.test(f.type || '') ? 'user' : 'assistant', text: String(f.content).trim(), t: ms(m.inserted_at) || null });
      }
      continue;
    }
    const role = m.author?.role;
    if (role !== 'user' && role !== 'assistant') continue;
    if (m.metadata?.is_visually_hidden_from_conversation) continue;
    const text = textOf(m.content?.parts) || (typeof m.content?.text === 'string' ? m.content.text.trim() : '');
    if (!text) continue;
    const last = messages[messages.length - 1];
    if (last && last.role === role && role === 'assistant') last.text += `\n\n${text}`; // tool-using answers come in pieces
    else messages.push({ role, text, t: m.create_time ? m.create_time * 1000 : null });
  }
  return { source, id: c.conversation_id || c.id || '', title: c.title || '', created: ms(c.create_time || c.inserted_at), updated: ms(c.update_time || c.updated_at || c.create_time), model: c.default_model_slug || '', messages };
}

function fromClaude(c) {
  const messages = (c.chat_messages || []).map((m) => ({
    role: m.sender === 'human' ? 'user' : 'assistant',
    text: (m.text || textOf((m.content || []).filter((p) => p.type === 'text').map((p) => p.text))).trim(),
    t: Date.parse(m.created_at) || null,
  })).filter((m) => m.text);
  return { source: 'claude', id: c.uuid || '', title: c.name || '', created: Date.parse(c.created_at) || 0, updated: Date.parse(c.updated_at) || Date.parse(c.created_at) || 0, model: '', messages };
}

// Grok: { conversation: {...}, responses: [{ response: { message, sender, create_time } }] }
function fromGrok(c) {
  const conv = c.conversation || {};
  const messages = (c.responses || []).map((x) => x.response || x).map((r) => ({ role: roleOf(r.sender), text: anyText(r.message), t: ms(r.create_time?.$date?.$numberLong ? Number(r.create_time.$date.$numberLong) : r.create_time) || null })).filter((m) => m.text);
  return { source: 'grok', id: conv.id || '', title: conv.title || '', created: ms(conv.create_time), updated: ms(conv.modify_time || conv.create_time), model: '', messages };
}

// LM Studio: messages with versions; the selected version of each.
function fromLmStudio(c) {
  const messages = [];
  for (const m of c.messages || []) {
    const v = (m.versions || [])[m.currentlySelected ?? 0] || (m.versions || [])[0];
    if (!v) continue;
    const text = v.type === 'multiStep' ? textOf((v.steps || []).flatMap((s) => s.content || [])) : anyText(v.content);
    if (text) messages.push({ role: roleOf(v.role), text, t: null });
  }
  return { source: 'lmstudio', id: '', title: c.name || '', created: ms(c.createdAt), updated: ms(c.createdAt), model: '', messages };
}

// Anything with a list of { role / author / sender / is_user, content / text / mes }.
function fromGeneric(c, source = 'other') {
  const list = c.chat?.messages || c.messages || c.chat_messages || c.history || (Array.isArray(c.chat) ? c.chat : null);
  if (!Array.isArray(list)) return null;
  const messages = list.map((m) => ({
    role: m.is_user === true ? 'user' : m.is_user === false ? 'assistant' : roleOf(m.role || m.author?.role || m.author || m.sender || m.from || m.speaker),
    text: anyText(m.content ?? m.text ?? m.mes ?? m.message ?? m.body),
    t: ms(m.timestamp || m.created_at || m.createdAt || m.send_date) || null,
  })).filter((m) => m.text && m.role);
  return { source, id: c.id || '', title: c.title || c.name || c.chat?.title || '', created: ms(c.created_at || c.createdAt || c.timestamp), updated: ms(c.updated_at || c.updatedAt || c.timestamp), model: c.model || '', messages };
}

// Gemini (Google Takeout, My Activity → Gemini Apps): one item per prompt and reply; grouped by day.
function fromGemini(items) {
  const byDay = new Map();
  for (const it of items) {
    if (!/gemini|bard/i.test(`${it.header || ''} ${(it.products || []).join(' ')}`)) continue;
    const prompt = String(it.title || '').replace(/^(Prompted|You asked)\s*/i, '').trim();
    const reply = stripHtml((it.safeHtmlItem || []).map((h) => h.html).join('\n'));
    if (!prompt && !reply) continue;
    const t = ms(it.time);
    const day = new Date(t || Date.now()).toISOString().slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push({ t, prompt, reply });
  }
  return [...byDay.entries()].map(([day, list]) => {
    list.sort((a, b) => a.t - b.t);
    const messages = list.flatMap((x) => [x.prompt && { role: 'user', text: x.prompt, t: x.t }, x.reply && { role: 'assistant', text: x.reply, t: x.t }].filter(Boolean));
    return { source: 'gemini', id: `gemini-${day}`, title: `Gemini, ${day}`, created: list[0].t, updated: list[list.length - 1].t, model: 'Gemini', messages };
  });
}

// A chat saved as text: "User: …" / "Assistant: …" (also You / Me / ChatGPT / Claude / Gemini / AI…).
function fromTranscript(text, name) {
  const re = /^\s*(?:#+\s*|\*\*)?(user|you|me|human|question|assistant|ai|chatgpt|gpt-?\d*|claude|gemini|grok|copilot|perplexity|deepseek|bot|answer|model)\s*(?:\*\*)?\s*[:：]\s*(?:\*\*)?\s*/i;
  const messages = [];
  for (const line of String(text).split(/\r?\n/)) {
    const m = line.match(re);
    if (m) messages.push({ role: roleOf(/^(you|me|human|question)$/i.test(m[1]) ? 'user' : m[1]), text: line.slice(m[0].length) });
    else if (messages.length) messages[messages.length - 1].text += `\n${line}`;
  }
  const clean = messages.map((m) => ({ ...m, text: m.text.trim(), t: null })).filter((m) => m.text);
  if (clean.length < 2) return null;
  return { source: 'text', id: name, title: String(name).replace(/^.*[\\/]/, '').replace(/\.(md|txt)$/i, ''), created: 0, updated: 0, model: '', messages: clean };
}

function conversationsIn(file) {
  const { name, text } = file;
  if (/\.(md|txt)$/i.test(name)) { const c = fromTranscript(text, name); return c ? [c] : []; }
  if (/\.jsonl$/i.test(name)) {
    const rows = text.split(/\r?\n/).filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    const c = fromGeneric({ messages: rows.filter((r) => r.mes != null || r.content != null || r.text != null), title: String(name).replace(/^.*[\\/]/, '').replace(/\.jsonl$/i, '') }, /sillytavern|chats/i.test(name) || rows.some((r) => 'is_user' in r) ? 'sillytavern' : 'jan');
    return c && c.messages.length ? [c] : [];
  }
  let data;
  try { data = JSON.parse(text); } catch { return []; }
  const list = Array.isArray(data) ? data : data.conversations || data.chats || (data.messages || data.mapping || data.chat_messages ? [data] : data.data || []);
  if (Array.isArray(list) && list.length && list.some((x) => x && x.header && (x.title || x.safeHtmlItem))) return fromGemini(list);
  const out = [];
  for (const c of Array.isArray(list) ? list : []) {
    if (!c || typeof c !== 'object') continue;
    const conv = c.mapping ? fromTree(c, Object.values(c.mapping).some((n) => Array.isArray(n?.message?.fragments)) ? 'deepseek' : 'chatgpt')
      : c.chat_messages ? fromClaude(c)
      : c.responses && (c.conversation || Array.isArray(c.responses)) ? fromGrok(c)
      : Array.isArray(c.messages) && c.messages.some((m) => m?.versions) ? fromLmStudio(c)
      : fromGeneric(c, c.chat ? 'openwebui' : 'other');
    if (conv && conv.messages.length) out.push(conv);
  }
  return out;
}

function parse(name, bytes) {
  const out = [];
  for (const f of readFiles(name, bytes)) out.push(...conversationsIn(f));
  for (const conv of out) if (!conv.title) conv.title = conv.messages[0].text.replace(/\s+/g, ' ').slice(0, 60);
  if (!out.length) throw new Error('No chats Quicksilver can read in this file. Use an export from ChatGPT, Claude, Gemini (Google Takeout), Grok, DeepSeek, Open WebUI, LM Studio, Jan or SillyTavern, or a chat saved as text.');
  return out;
}

module.exports = { parse };
