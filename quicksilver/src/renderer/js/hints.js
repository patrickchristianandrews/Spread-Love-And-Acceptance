// Suggestions while you type: Quicksilver reads the message before you send it and offers the
// one or two things that would get the best answer: turning on web search, connecting an app
// or a cloud AI it mentions, attaching the file it talks about, a stronger model or team for a
// hard or coding question, or an uncensored model for mature and dark creative work. Nothing
// changes unless you click; × hides that suggestion for this chat. Rules only, so it's instant.
'use strict';

const MATURE_Q = /\b(nsfw|explicit|erotic|erotica|smut|sexy|sexual|nude|nudity|gore|gory|graphic(ally)? violen\w*|torture|brutal|uncensored|unfiltered|no filters?|swear\w*|profan\w*|cuss\w*|roast me|dark (humou?r|fiction|story|stories|themes?|comedy)|horror|serial killer|villain|insults?|edgy|mature themes?|18\+)\b/i;
const REFUSAL_RE = /^\s*(I'?m sorry,? but|I am sorry,? but|I can(?:no|')t (help|assist|create|write|provide|do that|comply)|I won'?t (be able to )?(help|write|create)|I'?m (not able|unable) to (help|assist|create|write|provide)|As an AI\b|I must (decline|refuse))/i;
const FILE_Q = /\b(this|my|the|attached|below) (file|pdf|document|doc|word doc|spreadsheet|excel|csv|photo|picture|image|screenshot|contract|report|essay|invoice|receipt|cv|resume)\b/i;
const LIB_Q = /\b(my (notes|files|documents|docs|knowledge base|library)|our (docs|wiki|handbook|policies))\b/i;
const API_Q = [
  [/\b(gpt-?\d\w*|chatgpt|openai|o[134](-mini)?)\b/i, 'openai', 'OpenAI (ChatGPT)'],
  [/\b(claude|anthropic)\b/i, 'anthropic', 'Anthropic (Claude)'],
  [/\bgemini\b/i, 'google', 'Google (Gemini)'],
  [/\bgrok\b/i, 'xai', 'xAI (Grok)'],
  [/\bdeepseek\b/i, 'deepseek', 'DeepSeek'],
];
const APP_Q = [
  [/\bgithub\b|\bpull requests?\b|\bmy repos?\b/i, 'github'], [/\bgitlab\b/i, 'gitlab'], [/\bslack\b/i, 'slack'], [/\bnotion\b/i, 'notion'],
  [/\bjira\b/i, 'jira'], [/\blinear\b(?! (algebra|regression|equation|function|scale|time))/i, 'linear'], [/\bconfluence\b/i, 'confluence'],
  [/\b(my calendar|my schedule|my meetings)\b/i, 'calendar'], [/\btodoist\b|\bmy (to-?do|task) list\b/i, 'todoist'], [/\btrello\b/i, 'trello'],
  [/\basana\b/i, 'asana'], [/\bairtable\b/i, 'airtable'], [/\bdiscord\b/i, 'discord'], [/\btelegram\b/i, 'telegram'],
  [/\bobsidian\b|\bmy notes folder\b/i, 'notes'], [/\bhome assistant\b|\b(turn|switch) (on|off) the (lights?|heating|fan)\b|\bthermostat\b/i, 'homeassistant'],
  [/\bzapier\b|\bn8n\b|\bifttt\b|\bmake\.com\b/i, 'webhook'],
  [/\bgmail\b|\bmy (e-?mails?|inbox)\b/i, ['gmail', 'microsoft']], [/\bgoogle calendar\b/i, 'gcalendar'], [/\b(google )?drive\b|\bgoogle (docs?|sheets?)\b/i, 'gdrive'],
  [/\bgoogle tasks\b/i, 'gtasks'], [/\bmy contacts\b|\bgoogle contacts\b/i, 'gcontacts'], [/\byoutube\b/i, 'youtube'], [/\bgoogle forms?\b|\bform responses\b/i, 'gforms'],
  [/\b(google )?analytics\b|\bga4\b|\bmy (site|website) (traffic|visitors)\b/i, 'ganalytics'], [/\btag manager\b|\bgtm\b/i, 'gtagmanager'], [/\bsearch console\b|\bmy (google )?rankings?\b/i, 'gsearchconsole'],
  [/\badsense\b/i, 'gadsense'], [/\bpage ?speed\b|\bcore web vitals\b|\bhow fast (is|does) (my|the) (site|page)\b/i, 'pagespeed'],
  [/\boutlook\b|\bonedrive\b|\bmicrosoft to ?do\b|\bmicrosoft 365\b/i, 'microsoft'], [/\bdropbox\b/i, 'dropbox'],
  [/\bspotify\b|\b(new )?(music|songs?|artists?|bands?) (like|similar|recommend|suggest)|\brecommend (me )?(some )?(music|songs|artists)\b|\bmy playlists?\b/i, 'spotify'],
  [/\bhubspot\b/i, 'hubspot'], [/\bpipedrive\b/i, 'pipedrive'], [/\bzendesk\b|\bsupport tickets?\b/i, 'zendesk'], [/\bstripe\b/i, 'stripe'], [/\bshopify\b|\bmy (store|shop) orders\b/i, 'shopify'],
  [/\bmailchimp\b/i, 'mailchimp'], [/\bclickup\b/i, 'clickup'], [/\bmonday(\.com)? board\b|\bmonday\.com\b/i, 'monday'], [/\bcalendly\b/i, 'calendly'], [/\bfigma\b/i, 'figma'], [/\bwordpress\b|\bmy blog\b/i, 'wordpress'],
];
// The connector a mention points to: the first that's connected, else the first.
const appFor = (ids) => { const list = [].concat(ids); return hintConnectors?.find((x) => list.includes(x.id) && x.enabled) || hintConnectors?.find((x) => x.id === list[0]); };

let hintConnectors = null; // connector list, read once per session (and after visiting Connectors)
async function loadHintConnectors() { try { hintConnectors = await qs.call('int:list'); } catch { hintConnectors = []; } }

// Models and teams that follow instructions with few refusals (published community fine-tunes).
function openTargets() {
  const openModel = (t) => {
    const inst = S.installed.find((m) => `local:${m.id}` === t);
    if (!inst) return false;
    const c = S.catalog?.text?.find((x) => x.id === inst.catalogId);
    return c?.category === 'open' || /dolphin|hermes|abliterat|uncensor|unfiltered|lexi|rocinante/i.test(modelNameText(inst));
  };
  const teams = S.stacks.filter((s) => s.builtFor === 'open' || /unfiltered|uncensored/i.test(s.name || '')).map((s) => `stack:${s.id}`);
  return [...teams, ...S.targets.map((t) => t.target).filter(openModel)].filter((t, i, arr) => targetValid(t) && arr.indexOf(t) === i);
}

function composerHints(chat, a, text, attachments = []) {
  const t = String(text || '').trim();
  if (t.length < 8 || t.startsWith('/')) return [];
  const out = [];
  const add = (h) => { if (!(chat.hintsOff || []).includes(h.id) && !out.some((x) => x.id === h.id)) out.push(h); };
  const target = resolveTarget(chat, a);
  const auto = autoOn(chat, a);

  // Mature or dark creative work: an uncensored model won't water it down.
  if (MATURE_Q.test(t)) {
    const open = openTargets();
    if (!open.includes(target)) {
      if (open.length) add({ id: 'open', icon: '🔓', label: `Use ${targetLabel(open[0])} (uncensored)`, why: 'Mainstream models often soften or refuse mature and dark themes. This one follows your instructions.', act: { use: open[0] } });
      else add({ id: 'open', icon: '🔓', label: 'Get an uncensored model', why: 'Mainstream models often soften or refuse mature and dark themes. Community models like Dolphin or Hermes follow your instructions.', act: { getOpen: true } });
    }
  }
  // Something current: the web makes it right.
  if (FRESH_Q.test(t) && !NOT_FRESH.test(t) && !webWanted(chat, a, t)) {
    if (S.config?.offline) add({ id: 'web', icon: '🌐', label: 'Go online to check the web', why: 'This is about something current, and you are offline.', act: { online: true } });
    else if (S.config?.web?.provider !== 'none' && S.data.prefs.autoWeb === false) add({ id: 'web', icon: '🌐', label: 'Turn on automatic web search', why: 'You are online, but automatic web search is off. Turning it on lets current questions be searched and cited.', act: { autoWeb: true } });
  }
  // An app it mentions.
  for (const [re, ids] of APP_Q) {
    if (!re.test(t)) continue;
    const c = appFor(ids);
    if (!c) continue;
    const id = c.id;
    const ready = c.enabled && (c.noToken || c.hasToken);
    if (!ready) add({ id: `app-${id}`, icon: c.icon || '🔌', label: `Connect ${c.name}`, why: `So it can read and act on your ${c.name} directly.`, act: { connect: id } });
    else if (!(chat.tools ?? a.tools) && (S.data.prefs.autoTools === false || chat.tools === false)) add({ id: `app-${id}`, icon: c.icon || '🔌', label: `Let it use ${c.name}`, why: `${c.name} is connected; turn on connected apps for this chat.`, act: { tools: true } });
    break;
  }
  // A cloud AI it mentions.
  for (const [re, pid, name] of API_Q) {
    if (!re.test(t) || !/\b(use|ask|with|via|switch|compare|try)\b/i.test(t)) continue;
    const have = S.targets.find((x) => x.target.startsWith(`api:${pid}`) || (x.target.startsWith('api:') && x.label && re.test(x.label)));
    if (have && have.target !== target) add({ id: `api-${pid}`, icon: '☁️', label: `Use ${have.label}`, why: `You have ${name} connected.`, act: { use: have.target } });
    else if (!have) add({ id: `api-${pid}`, icon: '☁️', label: `Add your ${name} key`, why: `Connect ${name} with your own API key to use it here, alongside your local models.`, act: { api: true } });
    break;
  }
  // The file it talks about isn't attached.
  if (FILE_Q.test(t) && !attachments.length && !/\b(write|draft|create|make) (me )?(a|an)\b/i.test(t)) add({ id: 'attach', icon: '📎', label: 'Attach the file', why: 'It sounds like this is about a file. Attach it (or drop it here) so the answer uses it.', act: { attach: true } });
  // Your own documents.
  if (LIB_Q.test(t) && !(chat.library ?? a.library)) add({ id: 'lib', icon: '📚', label: 'Search your Library', why: 'Answer from your own documents, with citations.', act: { library: true } });
  // Code on a model that isn't good at code (Automatic already handles this).
  const T = S.speed?.targets;
  if (!auto && T && CODE_RE.test(t)) {
    const score = (x) => T[x]?.scores?.coding ?? 0;
    const best = S.targets.map((x) => x.target).filter((x) => T[x] && !x.startsWith('kb')).sort((x, y) => score(y) - score(x))[0];
    if (best && best !== target && score(best) >= score(target) + 2) add({ id: 'code', icon: '💻', label: `Use ${targetLabel(best)} for code`, why: 'It is clearly stronger at code than the current choice.', act: { use: best } });
  }
  // A hard question on a single model, or on Instant.
  if (looksHard(t)) {
    if (effortOf(chat, a) === 'quick') add({ id: 'effort', icon: '🧠', label: 'Think it through (Auto)', why: 'Instant uses one model with no checking; this question benefits from more care.', act: { effort: 'thorough' } });
    const cloud = S.targets.find((x) => x.target.startsWith('api:') && targetValid(x.target));
    if (cloud && !S.data.prefs.cloudHard && !S.config?.offline && !target.startsWith('api:')) add({ id: 'cloud', icon: '☁️', label: `Use ${cloud.label} for this one`, why: 'You have a cloud AI connected; it is stronger than local models on hard questions (uses your credits).', act: { use: cloud.target } });
    else if (!auto && !target.startsWith('stack:')) {
      const team = S.stacks.find((s) => s.id === 'quicksilver') || S.stacks[0];
      if (team && targetValid(`stack:${team.id}`)) add({ id: 'team', icon: '🧩', label: `Ask the ${team.name} team`, why: 'Two or more models compare notes on hard questions, which catches more mistakes.', act: { use: `stack:${team.id}` } });
    }
  }
  return out.slice(0, 2);
}

function hintsHTML(list) {
  if (!list.length) return '';
  return `<div class="hints" role="group" aria-label="Suggestions">${list.map((h, i) => `<span class="hint"><button class="hint-go" data-hint="${i}" title="${esc(h.why)}">${h.icon} ${esc(h.label)}</button><button class="hint-x" data-hint-x="${esc(h.id)}" title="Don't suggest this in this chat" aria-label="Dismiss">×</button></span>`).join('')}</div>`;
}

function applyHint(chat, h) {
  const x = h.act || {};
  if (x.use) {
    if (uncensoredBlocked(x.use)) { askUnlock().then((ok) => { if (ok) { chat.target = x.use; save(); render(); toast(`This chat now uses ${targetLabel(x.use)}.`); } }); return; }
    chat.target = x.use; save(); render(); toast(`This chat now uses ${targetLabel(x.use)}.`); return;
  }
  if (x.autoWeb) { S.data.prefs.autoWeb = true; save(); render(); toast('Automatic web search is on while you are online.'); return; }
  if (x.online) { $('#net-pill')?.click(); return; }
  if (x.tools) { chat.tools = true; save(); render(); toast('Connected apps are on for this chat.'); return; }
  if (x.library) { chat.library = true; save(); render(); toast('Your Library is searched for this chat.'); return; }
  if (x.effort) { chat.effort = x.effort; save(); render(); return; }
  if (x.attach) { $('#file-in')?.click(); return; }
  if (x.connect) { hintConnectors = null; go({ view: 'integrations' }); return; }
  if (x.api) { modelsTab = 'api'; go({ view: 'models' }); return; }
  if (x.getOpen) { go({ view: 'stacks' }); runAdvisor('open'); }
}

// Connected apps are used for a message that mentions them, without switching anything on.
function autoTools(chat, a, text) {
  if (chat.tools === false || S.data.prefs.autoTools === false || !text || !hintConnectors) return false;
  return APP_Q.some(([re, ids]) => re.test(text) && hintConnectors.some((c) => [].concat(ids).includes(c.id) && c.enabled && (c.noToken || c.hasToken)));
}

function bindHints(chat, a) {
  loadHintConnectors();
  const row = $('#hint-row');
  const input = $('#input');
  if (!row || !input) return;
  let list = [];
  let timer = null;
  const paint = () => { list = composerHints(chat, a, input.value, drafts[chat.id] || []); row.innerHTML = hintsHTML(list); };
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(paint, 300); });
  row.addEventListener('click', (e) => {
    const x = e.target.closest('[data-hint-x]');
    if (x) { chat.hintsOff = [...(chat.hintsOff || []), x.dataset.hintX]; save(); paint(); return; }
    const b = e.target.closest('[data-hint]');
    if (b && list[Number(b.dataset.hint)]) applyHint(chat, list[Number(b.dataset.hint)]);
  });
  if (input.value) paint();
}

// Under an answer that refused: one click asks an uncensored model instead.
function refusalHTML(chat, m, alt, streaming) {
  if (streaming || !alt.text || alt.error || !REFUSAL_RE.test(alt.text.slice(0, 300)) || openTargets().includes(alt.target)) return '';
  const open = openTargets()[0];
  return `<div class="refusal-hint"><span class="small muted">This model held back.</span><button class="btn small" data-act="uncensored" data-id="${m.id}">🔓 ${open ? `Ask ${esc(targetLabel(open))} instead` : 'Get an uncensored model'}</button></div>`;
}
function askUncensored(chat, m) {
  const open = openTargets()[0];
  if (!open) { go({ view: 'stacks' }); runAdvisor('open'); return; }
  if (pending) { toast('Wait for the answer to finish first.'); return; }
  generate(chat, m, open);
}
