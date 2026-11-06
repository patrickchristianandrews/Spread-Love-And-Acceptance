// Bring your chats from ChatGPT or Claude. Both let you export your data (ChatGPT: Settings →
// Data controls → Export; Claude: Settings → Privacy → Export data) as a .zip containing
// conversations.json. Either the .zip or the .json works.
const AdmZip = require('adm-zip');

function readExport(name, bytes) {
  const buf = Buffer.from(bytes);
  if (/\.zip$/i.test(name) || (buf[0] === 0x50 && buf[1] === 0x4b)) {
    const zip = new AdmZip(buf);
    const entry = zip.getEntries().find((e) => /(^|\/)conversations\.json$/i.test(e.entryName));
    if (!entry) throw new Error('No conversations.json in this file. Use the export from ChatGPT or Claude.');
    return JSON.parse(entry.getData().toString('utf8'));
  }
  return JSON.parse(buf.toString('utf8'));
}

const textOf = (parts) => (parts || []).map((p) => (typeof p === 'string' ? p : p?.text || (p?.content_type === 'image_asset_pointer' ? '(image)' : ''))).filter(Boolean).join('\n').trim();

// ChatGPT: each conversation is a tree of messages (edits make branches); follow the branch you
// last saw, from current_node back to the start.
function fromChatGPT(c) {
  const map = c.mapping || {};
  let id = c.current_node || Object.keys(map).find((k) => !map[k].children?.length);
  const path = [];
  const seen = new Set();
  while (id && map[id] && !seen.has(id)) { seen.add(id); path.push(map[id]); id = map[id].parent; }
  const messages = [];
  for (const node of path.reverse()) {
    const m = node.message;
    const role = m?.author?.role;
    if (!m || !['user', 'assistant'].includes(role) || m.metadata?.is_visually_hidden_from_conversation) continue;
    if (m.content?.content_type && !['text', 'multimodal_text'].includes(m.content.content_type)) continue;
    const text = textOf(m.content?.parts);
    if (!text) continue;
    const last = messages.at(-1);
    if (last && last.role === role && role === 'assistant') last.text += `\n\n${text}`; // tool-using answers come in pieces
    else messages.push({ role, text, t: m.create_time ? m.create_time * 1000 : null });
  }
  return { source: 'chatgpt', id: c.conversation_id || c.id || '', title: c.title || '', created: (c.create_time || 0) * 1000, updated: (c.update_time || c.create_time || 0) * 1000, model: c.default_model_slug || '', messages };
}

function fromClaude(c) {
  const messages = (c.chat_messages || []).map((m) => ({
    role: m.sender === 'human' ? 'user' : 'assistant',
    text: (m.text || textOf((m.content || []).filter((p) => p.type === 'text').map((p) => p.text))).trim(),
    t: Date.parse(m.created_at) || null,
  })).filter((m) => m.text);
  return { source: 'claude', id: c.uuid || '', title: c.name || '', created: Date.parse(c.created_at) || 0, updated: Date.parse(c.updated_at) || Date.parse(c.created_at) || 0, model: '', messages };
}

function parse(name, bytes) {
  const data = readExport(name, bytes);
  const list = Array.isArray(data) ? data : data.conversations || [];
  if (!list.length) throw new Error('No conversations found in this file.');
  const out = [];
  for (const c of list) {
    const conv = c.mapping ? fromChatGPT(c) : c.chat_messages ? fromClaude(c) : null;
    if (!conv || !conv.messages.length) continue;
    if (!conv.title) conv.title = conv.messages[0].text.replace(/\s+/g, ' ').slice(0, 60);
    out.push(conv);
  }
  if (!out.length) throw new Error('This file has no chats Quicksilver can read. Use the conversations export from ChatGPT or Claude.');
  return out;
}

module.exports = { parse };
