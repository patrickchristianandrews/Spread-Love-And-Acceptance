// Assistants: ready-made helpers, grouped by kind of work, plus a builder for your own.
// Each assistant is instructions + a model or team + knowledge and tools + optionally a skill it
// applies to every message (assistants-more.js has the built-in list and the builder's templates).
'use strict';

const EMOJIS = ['💡', '🤖', '🧠', '✨', '📊', '🔎', '💻', '📷', '🎨', '🎵', '🎙️', '✍️', '📈', '⚖️', '🧾', '🩺', '🎓', '🗂️', '📧', '🧮', '🌍', '🛠️', '🍳', '🏋️', '🎲', '🚀', '❤️', '🐾'];
let asQuery = '';
let asGroup = 'all';

const groupOf = (a) => (a.builtIn ? a.group || ASSISTANT_GROUP_OF[a.id] || 'Main' : 'Yours');

function assistantCard(a) {
  const t = resolveTarget(null, a);
  const sk = a.skill && skillById(a.skill);
  return `<div class="card as-card">
    <div class="row"><span class="emoji-badge">${esc(a.emoji)}</span><h3 class="grow">${esc(a.name)}</h3>${a.builtIn ? '' : '<span class="badge b-pink">yours</span>'}</div>
    <p class="desc" style="margin:10px 0">${esc(a.description || '')}</p>
    <div class="row small" style="margin-bottom:10px;flex-wrap:wrap">
      <span class="badge b-lav">🧠 ${esc(a.target ? targetLabel(a.target) : 'Default model')}</span>
      ${sk ? `<span class="badge b-peach" title="Applied to every message">⚡ ${esc(sk.name)}</span>` : etaBadge(etaFor(t, wordsForJob(a.job)), a.job === 'coding' ? 'per code answer' : 'per answer', starsOf(t, a.job || 'general'))}
      ${a.library ? `<span class="badge b-sky">📚 ${a.knowledge?.length ? `${a.knowledge.length} knowledge base${a.knowledge.length > 1 ? 's' : ''}` : 'Knowledge'}${a.strict ? ' · 🔒 only' : ''}</span>` : ''}${a.web ? '<span class="badge b-mint">🌐 Web</span>' : ''}${a.tools ? '<span class="badge b-mint">🔌 Tools</span>' : ''}${a.factCheck ? '<span class="badge b-peach">✅ Double-check</span>' : ''}
    </div>
    <div class="row">
      <button class="btn primary small" data-chat-with="${a.id}">Chat</button>
      <button class="btn small" data-edit="${a.id}">Edit</button>
      <button class="btn small ghost" data-dup="${a.id}" title="Make your own copy to change">Duplicate</button>
      ${a.builtIn ? '' : `<button class="btn small danger" data-del="${a.id}">Delete</button>`}
    </div>
  </div>`;
}

views.assistants = {
  html() {
    const q = asQuery.toLowerCase();
    const crew = S.data.assistants.filter((a) => !a.mind); // Minds have their own tab
    const list = crew.filter((a) => (asGroup === 'all' || groupOf(a) === asGroup) && (!q || `${a.name} ${a.description || ''}`.toLowerCase().includes(q)));
    const groups = ASSISTANT_GROUPS.filter((g) => crew.some((a) => groupOf(a) === g));
    return `<div class="page">
      <div class="page-head"><h1>Your Crew</h1><button class="btn primary" id="new-assistant">＋ Add a crew member</button></div>
      ${typeof crewTabsHTML === 'function' ? crewTabsHTML('crew') : ''}
      <p class="lede"><b>${crew.length} ready-made crew members</b>, each set up for one kind of work: its own instructions, the best model or team for it, and the knowledge, web search, tools and skills it needs. Some make things on every message, like the Image Artist or the Beat Maker. Pick one when you start a chat, or switch at the top of any chat. <a href="#" id="as-new-link">Build your own</a> in a minute, from scratch, from a template, or by describing it.</p>
      <div class="row" style="margin-bottom:16px;flex-wrap:wrap"><input id="as-q" type="search" placeholder="Search your crew" value="${esc(asQuery)}" style="max-width:280px">
        <button class="btn small ${asGroup === 'all' ? 'on' : ''}" data-asgroup="all">All</button>${groups.map((g) => `<button class="btn small ${asGroup === g ? 'on' : ''}" data-asgroup="${esc(g)}">${esc(g)}</button>`).join('')}</div>
      ${groups.map((g) => { const items = list.filter((a) => groupOf(a) === g); return items.length ? `<h3 class="int-group">${esc(g)} · ${items.length}</h3><div class="cards">${items.map(assistantCard).join('')}</div>` : ''; }).join('') || '<div class="empty">No one in your crew matches.</div>'}
    </div>`;
  },
  bind() {
    if (typeof bindCrewTabs === 'function') bindCrewTabs();
    const q = $('#as-q');
    q.addEventListener('input', () => { asQuery = q.value; const pos = q.selectionStart; render(); const n = $('#as-q'); n.focus(); n.setSelectionRange(pos, pos); });
    $$('[data-asgroup]').forEach((b) => b.addEventListener('click', () => { asGroup = b.dataset.asgroup; render(); }));
    $('#new-assistant').addEventListener('click', () => assistantBuilder());
    $('#as-new-link').addEventListener('click', (e) => { e.preventDefault(); assistantBuilder(); });
    $$('[data-chat-with]').forEach((b) => b.addEventListener('click', () => newChat(b.dataset.chatWith)));
    $$('[data-edit]').forEach((b) => b.addEventListener('click', () => editAssistant(assistantById(b.dataset.edit))));
    $$('[data-dup]').forEach((b) => b.addEventListener('click', () => {
      const src = assistantById(b.dataset.dup);
      const copy = { ...JSON.parse(JSON.stringify(src)), id: uid(), builtIn: false, name: `${src.name} (my copy)` };
      delete copy.group;
      S.data.assistants.push(copy); save(); editAssistant(copy);
    }));
    $$('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      if (!(await confirmBox('Remove this crew member? Their chats stay, with your default crew member.'))) return;
      S.data.assistants = S.data.assistants.filter((x) => x.id !== b.dataset.del); save(); render();
    }));
  },
};

// Step one of building: start blank, from a template, or describe it and let AI write it.
function assistantBuilder() {
  const b = openModal(`<h2>Add your own crew member</h2>
    <div class="stack-v">
      <div class="card" style="padding:14px">
        <div class="field"><label for="ab-desc">✨ Describe what you want, and AI sets it up</label><textarea id="ab-desc" rows="3" placeholder="An assistant that helps me run my bakery: answers customer emails, plans weekly specials and keeps costs low"></textarea></div>
        <div class="row"><button class="btn primary" id="ab-ai">✨ Set it up for me</button><span class="small muted">You can change everything afterwards.</span></div>
      </div>
      <div class="label">Or start from a template</div>
      <div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">${ASSISTANT_TEMPLATES.map((t, i) => `<button class="card" data-tpl="${i}" style="text-align:left;padding:12px"><div class="row"><span class="emoji-badge">${t.emoji}</span><b>${esc(t.name)}</b></div><div class="small muted" style="margin-top:6px;font-weight:600">${esc(t.description)}</div></button>`).join('')}</div>
    </div>
    <div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn" id="ab-blank">Start from scratch</button></div>`, { wide: true });
  b.querySelector('#ab-blank').addEventListener('click', () => editAssistant(null));
  $$('[data-tpl]', b).forEach((x) => x.addEventListener('click', () => editAssistant(null, { ...ASSISTANT_TEMPLATES[Number(x.dataset.tpl)] })));
  b.querySelector('#ab-ai').addEventListener('click', async (e) => {
    const idea = b.querySelector('#ab-desc').value.trim();
    if (!idea) { toast('Describe your crew member first.'); return; }
    const helper = promptHelper();
    if (!helper) { toast('Install a text model first, or start from a template.'); return; }
    e.target.disabled = true; e.target.textContent = '✨ Setting it up…';
    try {
      const skills = allSkills().map((s) => s.id).join(', ');
      const out = await askAI(helper, `You design AI assistants. Reply with ONLY a JSON object: {"name": "2-3 words", "emoji": "one emoji", "description": "one line, under 90 characters", "instructions": "6-10 sentences in second person (You are…): role, what to focus on, how to format answers, what to ask when details are missing, and limits", "web": true|false (needs current information), "factCheck": true|false (accuracy-critical), "creativity": 0.1-1.0, "skill": "" or one skill id from this list if EVERY message should use it: ${skills}}`, idea, { temperature: 0.6, maxTokens: 700 });
      const j = JSON.parse(out.match(/\{[\s\S]*\}/)[0]);
      editAssistant(null, { name: j.name, emoji: j.emoji, description: j.description, instructions: j.instructions, web: Boolean(j.web), factCheck: Boolean(j.factCheck), temperature: Math.min(1.2, Math.max(0, Number(j.creativity) || 0.5)), skill: skillById(j.skill) ? j.skill : '' });
      toast('Here is a first version. Change anything, then press Create.');
    } catch { e.target.disabled = false; e.target.textContent = '✨ Set it up for me'; toast('That did not work. Try again, or start from a template.', 6000); }
  });
}

async function editAssistant(a, preset = null) {
  if (!kb.collections.length) await refreshKb().catch(() => {});
  const v = a || { name: '', emoji: '💡', description: '', instructions: '', target: '', library: false, web: false, factCheck: false, temperature: 0.5, skill: '', effort: '', ...(preset || {}) };
  const skillOpts = `<option value="">None (a normal chat)</option>${Object.entries(SKILL_CATEGORIES).map(([k, c]) => { const items = allSkills().filter((s) => s.category === k); return items.length ? `<optgroup label="${esc(c.label)}">${items.map((s) => `<option value="${esc(s.id)}" ${v.skill === s.id ? 'selected' : ''}>${esc(s.icon)} ${esc(s.name)}</option>`).join('')}</optgroup>` : ''; }).join('')}`;
  const b = openModal(`<h2>${a ? `Edit ${esc(a.name)}` : 'Add a crew member'}</h2>
    ${a?.builtIn ? '<p class="help" style="margin-top:-6px">This is a built-in assistant. Your changes are kept; use Duplicate on its card to keep the original too.</p>' : ''}
    <div class="stack-v">
      <div class="row">
        <div class="field" style="width:110px"><label for="as-emoji">Icon</label><input id="as-emoji" value="${esc(v.emoji)}" maxlength="4" style="text-align:center;font-size:1.3rem"></div>
        <div class="field grow"><label for="as-name">Name</label><input id="as-name" value="${esc(v.name)}" placeholder="e.g. Contract Reviewer" autofocus></div>
      </div>
      <div class="row" style="flex-wrap:wrap;gap:4px;margin-top:-6px">${EMOJIS.map((e) => `<button type="button" class="tool" data-emoji="${e}" style="font-size:1.15rem;padding:2px 5px">${e}</button>`).join('')}</div>
      <div class="field"><label for="as-desc">What it's for</label><input id="as-desc" value="${esc(v.description)}" placeholder="One line, shown on its card"></div>
      <div class="field"><label for="as-ins" class="row">Instructions<span class="grow"></span><button type="button" class="btn small ghost" id="as-improve" title="Let AI make the instructions clearer and more complete">✨ Improve</button></label><span class="help">Tell it how to work: its role, what to focus on, the format you want, and what to ask when details are missing. Plain sentences are best.</span>
        <textarea id="as-ins" rows="7" placeholder="You are an experienced contract lawyer. Read the attached contract and list risky clauses in a table with the clause, the risk and a suggested fix…">${esc(v.instructions)}</textarea></div>
      <div class="grid2">
        <div class="field"><label for="as-target">Brain (model or team)</label><select id="as-target">${targetOptions(v.target, { includeNone: true, noneLabel: 'Default model' })}</select></div>
        <div class="field"><label for="as-effort">Effort</label><select id="as-effort"><option value="">Your default</option>${Object.entries(EFFORTS).map(([k, e]) => `<option value="${k}" ${v.effort === k ? 'selected' : ''}>${e.replace(/^\S+\s/, '')}</option>`).join('')}</select></div>
      </div>
      <div class="field"><label for="as-skill">Use a skill on every message (optional)</label><span class="help">For example "Create a picture" makes every request an image, "Read aloud" turns every message into an MP3.</span><select id="as-skill">${skillOpts}</select></div>
      <div class="field"><label for="as-temp">Creativity: <span id="as-temp-v">${v.temperature ?? 0.5}</span></label><span class="help">Low = precise and consistent (analysis, facts). High = varied and inventive (brainstorming).</span>
        <input id="as-temp" type="range" min="0" max="1.2" step="0.05" value="${v.temperature ?? 0.5}"></div>
      <label class="row"><input type="checkbox" id="as-lib" ${v.library ? 'checked' : ''}> <span><b>📚 Use knowledge</b> <span class="help">search and cite your knowledge bases</span></span></label>
      <div class="field" style="margin-left:28px"><span class="help">Which knowledge bases (none ticked = all of them):</span><div class="row" id="as-kbs">${(kb.collections || []).map((c) => `<label class="btn small ${(v.knowledge || []).includes(c.id) ? 'on' : ''}"><input type="checkbox" value="${c.id}" ${(v.knowledge || []).includes(c.id) ? 'checked' : ''}> ${esc(c.emoji)} ${esc(c.name)}</label>`).join('') || '<span class="help">No knowledge bases yet. Create them under Knowledge.</span>'}</div>
        <label class="row" style="margin-top:6px"><input type="checkbox" id="as-strict" ${v.strict ? 'checked' : ''}> <span><b>🔒 Only answer from this knowledge</b> <span class="help">never from general memory; says "not found" instead of guessing</span></span></label></div>
      <label class="row"><input type="checkbox" id="as-web" ${v.web ? 'checked' : ''}> <span><b>🌐 Search the web</b> <span class="help">for current information (free, no key needed)</span></span></label>
      <label class="row"><input type="checkbox" id="as-tools" ${v.tools ? 'checked' : ''}> <span><b>🔌 Use integrations</b> <span class="help">weather, calendar, notes, GitHub, Slack, Todoist and the others you connect</span></span></label>
      <label class="row"><input type="checkbox" id="as-fact" ${v.factCheck ? 'checked' : ''}> <span><b>✅ Double-check every answer</b> <span class="help">with a second model</span></span></label>
    </div>
    <div class="modal-actions"><button class="btn" data-close>Cancel</button>${a ? '' : '<button class="btn" id="as-save-chat">Create and start a chat</button>'}<button class="btn primary" id="as-save">${a ? 'Save' : 'Create'}</button></div>`, { wide: true });
  b.querySelector('#as-temp').addEventListener('input', (e) => { b.querySelector('#as-temp-v').textContent = e.target.value; });
  $$('[data-emoji]', b).forEach((x) => x.addEventListener('click', () => { b.querySelector('#as-emoji').value = x.dataset.emoji; }));
  b.querySelector('#as-improve').addEventListener('click', async (e) => {
    const box = b.querySelector('#as-ins');
    const draft = `${b.querySelector('#as-name').value}: ${b.querySelector('#as-desc').value}\n${box.value}`.trim();
    if (draft.length < 8) { toast('Write a name or a few words first.'); return; }
    if (!promptHelper()) { toast('Install a text model to improve instructions.'); return; }
    e.target.disabled = true; e.target.textContent = '✨ Writing…';
    try { const out = await askAI(promptHelper(), 'Rewrite these notes as clear instructions for an AI assistant, in second person ("You are…"), 6-10 sentences: its role, what to focus on, how to format answers, what to ask when details are missing, and its limits. Keep everything the user asked for. Reply with the instructions only.', draft, { temperature: 0.5, maxTokens: 500 }); if (out) box.value = out.trim(); } catch (err) { toast(err.message); }
    e.target.disabled = false; e.target.textContent = '✨ Improve';
  });
  const saveIt = (thenChat) => {
    const name = b.querySelector('#as-name').value.trim();
    if (!name) { toast('Give it a name.'); return; }
    const fields = {
      name, emoji: b.querySelector('#as-emoji').value.trim() || '💡', description: b.querySelector('#as-desc').value.trim(),
      instructions: b.querySelector('#as-ins').value.trim(), target: b.querySelector('#as-target').value,
      temperature: Number(b.querySelector('#as-temp').value), library: b.querySelector('#as-lib').checked,
      web: b.querySelector('#as-web').checked, factCheck: b.querySelector('#as-fact').checked, tools: b.querySelector('#as-tools').checked,
      knowledge: [...b.querySelectorAll('#as-kbs input:checked')].map((x) => x.value), strict: b.querySelector('#as-strict').checked,
      skill: b.querySelector('#as-skill').value, effort: b.querySelector('#as-effort').value,
    };
    let id = a?.id;
    if (a) Object.assign(a, fields); else { id = uid(); S.data.assistants.push({ id, ...fields }); }
    save(); closeModal(); toast(a ? 'Saved.' : `${name} is ready.`);
    if (thenChat) newChat(id); else render();
  };
  b.querySelector('#as-save').addEventListener('click', () => saveIt(false));
  b.querySelector('#as-save-chat')?.addEventListener('click', () => saveIt(true));
}
