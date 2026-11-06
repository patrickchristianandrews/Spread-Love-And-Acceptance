// Small things that happen on their own, so Quicksilver feels quick and tidy without any buttons:
//  - Warm-up: when you start typing, the model you're about to use loads in the background.
//  - Titles: after the first answer, the chat gets a short title written by the model in use.
'use strict';

// ---------- warm-up while you type ----------
const warmedAt = new Map(); // target -> time
document.addEventListener('input', (e) => {
  if (e.target.id !== 'input' || !S.data || S.route.view !== 'chat') return;
  const chat = chatById(S.route.id);
  if (!chat || pending) return;
  const a = assistantById(chat.assistantId);
  const target = resolveTarget(chat, a);
  if (!target || target.startsWith('api:')) return;
  if (Date.now() - (warmedAt.get(target) || 0) < 3 * 60 * 1000) return;
  warmedAt.set(target, Date.now());
  qs.call('models:warm', target, { contextSize: 8192, gpu: S.data.prefs.gpu }).catch(() => {});
}, true);

// ---------- automatic chat titles ----------
const titleWatch = new Map(); // requestId -> chatId
qs.onChat(({ requestId, ev }) => {
  if (pending?.requestId === requestId && !titleWatch.has(requestId)) titleWatch.set(requestId, pending.chatId);
  if (ev.type !== 'done' || ev.aborted) return;
  const chatId = titleWatch.get(requestId);
  titleWatch.delete(requestId);
  if (chatId) setTimeout(() => autoTitle(chatId), 400);
});

async function autoTitle(chatId) {
  const chat = chatById(chatId);
  if (!chat || chat.autoTitled || chat.renamed || chat.messages.length !== 2 || pending) return;
  const user = chat.messages[0];
  const answer = msgText(chat.messages[1]) || '';
  if (!user?.text || !answer || user.text.length < 25) { chat.autoTitled = true; return; } // short questions already make good titles
  const a = assistantById(chat.assistantId);
  const target = resolveTarget(chat, a);
  if (!target) return;
  chat.autoTitled = true;
  try {
    const out = await askAI(target, 'Write a short title (3 to 6 words) for this conversation. Reply with the title only: no quotes, no full stop, no emoji.', `Question: ${user.text.slice(0, 600)}\n\nAnswer starts: ${answer.slice(0, 400)}`, { temperature: 0.3, maxTokens: 24, level: 'quick' });
    const title = String(out || '').split('\n')[0].replace(/^["'“”#*\s]+|["'“”.*\s]+$/g, '').replace(/^title:\s*/i, '').slice(0, 60);
    if (title.length >= 3 && !chat.renamed) {
      chat.title = title;
      save();
      if (S.route.view === 'chat' && S.route.id === chat.id) render(); else renderChatList();
    }
  } catch {}
}
