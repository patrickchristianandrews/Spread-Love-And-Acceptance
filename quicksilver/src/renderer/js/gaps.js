// When an answer says the AI can't do something ("I can't browse the internet", "I can't open your
// files", "I can't see images", "I don't have access to your email"…), a line under it suggests
// what would let it: the plug-in, connector, model or setting that fixes it, in one click, or a
// search of the plug-in directory for the task. Nothing is turned on without the click.
'use strict';

const CANT = "(?:can'?t|cannot|can not|am unable to|'m unable to|unable to|am not able to|'m not able to|don'?t have (?:the )?(?:ability|access|tools?|capability) to|do not have (?:the )?(?:ability|access|tools?) to|have no (?:way|ability) to|lack the ability to)";
const GAPS = [
  // Made-up links: example.com and the like are placeholders, so the model invented the "results".
  { id: 'fake', re: /https?:\/\/(?:www\.)?(?:example\.(?:com|org|net)|placeholder\.\w+|yourwebsite\.\w+|website\.com|link\.com|url\.com)(?:[\/\s)\]]|$)/i,
    label: '🔎 Search the web for real results', why: '⚠️ Those links are made up (example.com is a placeholder): this model can\'t see the web by itself.' },
  { id: 'web', re: new RegExp(`${CANT} (?:browse|access|search|check|look (?:up|at)|visit|open)\\b[^.]{0,40}\\b(?:internet|web|online|websites?|links?|urls?|real[- ]time|live|current|latest)|my (?:knowledge|training)(?: data)? (?:cut-?off|only goes|ends)|as of my (?:last|knowledge)|i don'?t have (?:real[- ]time|live|internet|current) (?:access|data|information)`, 'i'),
    label: '🔎 Search the web and answer again', why: 'It needed the web.' },
  { id: 'files', re: new RegExp(`${CANT} (?:access|read|open|see|look at|find|browse)\\b[^.]{0,25}\\b(?:your |the |local )?(?:files?|documents?|computer|pc|folders?|desktop|hard drive|downloads)`, 'i'),
    label: '🗂️ Let it read your files (Files on this PC)', why: 'It needed your files.' },
  { id: 'vision', re: new RegExp(`${CANT} (?:see|view|look at|analy[sz]e|read|process|open)\\b[^.]{0,15}\\b(?:images?|photos?|pictures?|attachments?|screenshots?)`, 'i'),
    label: '👁 Ask a model that sees pictures', why: 'It needed to see the picture.' },
  { id: 'apps', re: new RegExp(`${CANT} (?:send|read|check|access|see|open|manage|post)\\b[^.]{0,25}\\b(?:e-?mails?|inbox|gmail|outlook|calendar|events|meetings|messages|slack|discord|texts?|contacts|drive|notion|github)|(?:don'?t|do not|have no) (?:have )?access to (?:your |the )?(?:e-?mails?|email inbox|inbox|gmail|outlook|calendar|messages|slack|discord|contacts|google drive|notion|github)`, 'i'),
    label: '🔌 Connect the app', why: 'It needed one of your apps.' },
  { id: 'run', re: new RegExp(`${CANT} (?:run|execute|test|install|compile)\\b[^.]{0,20}\\b(?:code|commands?|scripts?|programs?|software|apps?|terminal|powershell)`, 'i'),
    label: '🔐 Let it run commands (Full access)', why: 'It needed to run something on this PC.' },
  { id: 'make', re: new RegExp(`${CANT} (?:create|generate|make|draw|paint|produce|render)\\b[^.]{0,20}\\b(?:images?|pictures?|photos?|drawings?|videos?|gifs?|music|songs?|audio|voices?)`, 'i'),
    label: '🎨 Make it with a picture or video model', why: 'It needed a picture, video or music model.' },
  { id: 'memory', re: new RegExp(`${CANT} (?:remember|recall|store|keep track of)\\b|(?:no|don'?t have) (?:memory of|access to) (?:our |previous |past )(?:conversations?|chats?)`, 'i'),
    label: '🧠 Turn on Memory', why: 'It needed to remember.' },
  { id: 'any', re: new RegExp(`\\bI ${CANT}\\b|beyond my (?:capabilities|abilities)|not something I can do|I'?m (?:just )?a (?:text[- ]based|language) (?:model|ai)`, 'i'),
    label: '🔌 Find a plug-in for this', why: 'It said it couldn\'t do this.' },
];
// What the answer said it couldn't do (the first, most specific match), or null.
function gapOf(text) {
  const t = String(text || '').slice(0, 1200);
  if (!t) return null;
  return GAPS.find((g) => g.re.test(t)) || null;
}

function gapHTML(chat, m, alt, streaming) {
  if (streaming || !alt?.text || alt.error || alt.gapDone) return '';
  const g = gapOf(alt.text);
  if (!g) return '';
  return `<div class="refusal-hint gap-hint"><span class="small muted">${esc(g.why)}</span><button class="btn small" data-gap="${g.id}" data-id="${m.id}">${g.label}</button></div>`;
}

// Keywords of the user's request, for a plug-in directory search.
const gapKeywords = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !/^(please|could|would|should|about|there|their|which|what|when|where|with|from|this|that|have|make|give|need|want|help|tell|show)$/.test(w)).slice(0, 4).join(' ');

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-gap]');
  if (!b) return;
  const chat = chatById(S.route.id);
  const m = chat?.messages.find((x) => x.id === b.dataset.id);
  if (!chat || !m) return;
  const alt = m.alts[m.altIndex];
  const user = [...chat.messages.slice(0, chat.messages.indexOf(m))].reverse().find((x) => x.role === 'user');
  if (pending) { toast('Wait for the answer to finish first.'); return; }
  const again = () => { alt.gapDone = true; save(); generate(chat, m); };
  switch (b.dataset.gap) {
    case 'fake':
    case 'web':
      if (S.config?.offline) { toast('Go online first (the switch at the bottom of the sidebar).'); return; }
      chat.web = true; chat.tools = true; again(); toast('Searching the web for this one.'); break;
    case 'files':
      chat.tools = true; again(); toast('Files on this PC is on for this chat: it can read your Documents, Desktop and Downloads.'); break;
    case 'vision': {
      const seer = (S.targets || []).find((t) => t.vision && (!isLiquid(resolveTarget(chat, assistantById(chat.assistantId))) || liquidOk(t.target)));
      if (!seer) { toast('No model that sees pictures yet: get one under Models.'); go({ view: 'models' }); return; }
      alt.gapDone = true; save(); generate(chat, m, seer.target); break;
    }
    case 'apps': go({ view: 'integrations' }); toast('Connect the app here, then ask again.'); break;
    case 'run': setTab = 'permissions'; go({ view: 'settings' }); break;
    case 'make': {
      chat.make = /video|gif/i.test(user?.text || '') ? 'video' : 'image'; alt.gapDone = true; save();
      generate(chat, m); break;
    }
    case 'memory': S.data.prefs.memory = true; S.data.prefs.memoryLearn = true; save(); again(); toast('Memory is on.'); break;
    default: {
      const q = gapKeywords(user?.text);
      go({ view: 'integrations' });
      if (q) { try { intData = intData || {}; intData.query = q; intData.found = await qs.call('mcp:registry', q); } catch (err) { intData.found = { error: `Couldn't reach the plug-in directory: ${err.message}` }; } render(); }
      toast(q ? `Plug-ins for "${q}": add one, then ask again.` : 'Search the plug-in directory for what you need.', 9000);
    }
  }
});
