// Assistants: ready-made helpers. Each one is instructions + a model or stack + default tools.
'use strict';

const EMOJIS = ['💧', '📊', '🔎', '💻', '📷', '⚡', '✍️', '📈', '⚖️', '🧾', '🩺', '🎓', '🗂️', '📧', '🧮', '🌍', '🛠️', '💡'];

views.assistants = {
  html() {
    return `<div class="page">
      <div class="page-head"><h1>Assistants</h1><button class="btn primary" id="new-assistant">＋ Create an assistant</button></div>
      <div class="notice info" style="max-width:900px;margin:6px 0 22px">
        <b>What is an assistant?</b> A ready-made helper for one kind of work. Each assistant has:
        <ol style="margin:6px 0 0;padding-left:1.3em">
          <li><b>Instructions</b>: how it should work (for example, the Office Analyst always works from your real numbers and answers with tables).</li>
          <li><b>A brain</b>: the model or stack it uses. Leave it on "Default" and it uses your default.</li>
          <li><b>Knowledge & tools</b>: which of your knowledge bases it uses (optionally <i>only</i> those, for grounded answers), and whether it searches the web and fact checks itself.</li>
        </ol>
        Pick one when you start a chat, or switch at the top of any chat.
      </div>
      <div class="cards">${S.data.assistants.map((a) => `
        <div class="card">
          <div class="row"><span class="emoji-badge">${esc(a.emoji)}</span><h3 class="grow">${esc(a.name)}</h3></div>
          <p class="desc" style="margin:10px 0">${esc(a.description || '')}</p>
          <div class="row small" style="margin-bottom:10px">
            <span class="badge b-lav">🧠 ${esc(a.target ? targetLabel(a.target) : 'Default model')}</span>
            ${a.library ? `<span class="badge b-sky">📚 ${a.knowledge?.length ? `${a.knowledge.length} knowledge base${a.knowledge.length > 1 ? 's' : ''}` : 'Knowledge'}${a.strict ? ' · 🔒 only' : ''}</span>` : ''}${a.web ? '<span class="badge b-mint">🌐 Web</span>' : ''}${a.factCheck ? '<span class="badge b-peach">✅ Fact check</span>' : ''}
          </div>
          <div class="row">
            <button class="btn primary small" data-chat-with="${a.id}">Chat</button>
            <button class="btn small" data-edit="${a.id}">Edit</button>
            ${a.builtIn ? '' : `<button class="btn small danger" data-del="${a.id}">Delete</button>`}
          </div>
        </div>`).join('')}
      </div>
    </div>`;
  },
  bind() {
    $('#new-assistant').addEventListener('click', () => editAssistant(null));
    $$('[data-chat-with]').forEach((b) => b.addEventListener('click', () => newChat(b.dataset.chatWith)));
    $$('[data-edit]').forEach((b) => b.addEventListener('click', () => editAssistant(assistantById(b.dataset.edit))));
    $$('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      if (!(await confirmBox('Delete this assistant? Its chats stay, using the default assistant.'))) return;
      S.data.assistants = S.data.assistants.filter((x) => x.id !== b.dataset.del); save(); render();
    }));
  },
};

async function editAssistant(a) {
  if (!kb.collections.length) await refreshKb().catch(() => {});
  const v = a || { name: '', emoji: '💡', description: '', instructions: '', target: '', library: false, web: false, factCheck: false, temperature: 0.5 };
  const b = openModal(`<h2>${a ? `Edit ${esc(a.name)}` : 'Create an assistant'}</h2>
    <div class="stack-v">
      <div class="row">
        <div class="field" style="width:110px"><label for="as-emoji">Icon</label><select id="as-emoji">${EMOJIS.map((e) => `<option ${e === v.emoji ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
        <div class="field grow"><label for="as-name">Name</label><input id="as-name" value="${esc(v.name)}" placeholder="e.g. Contract Reviewer" autofocus></div>
      </div>
      <div class="field"><label for="as-desc">What it's for</label><input id="as-desc" value="${esc(v.description)}" placeholder="One line, shown on its card"></div>
      <div class="field"><label for="as-ins">Instructions</label><span class="help">Tell it how to work: its role, what to focus on, the format you want. Plain sentences are best.</span>
        <textarea id="as-ins" rows="7" placeholder="You are an experienced contract lawyer. Read the attached contract and list risky clauses in a table with the clause, the risk and a suggested fix…">${esc(v.instructions)}</textarea></div>
      <div class="field"><label for="as-target">Brain (model or stack)</label><select id="as-target">${targetOptions(v.target, { includeNone: true, noneLabel: 'Default model' })}</select></div>
      <div class="field"><label for="as-temp">Creativity: <span id="as-temp-v">${v.temperature ?? 0.5}</span></label><span class="help">Low = precise and consistent (analysis, facts). High = varied and inventive (brainstorming).</span>
        <input id="as-temp" type="range" min="0" max="1.2" step="0.05" value="${v.temperature ?? 0.5}"></div>
      <label class="row"><input type="checkbox" id="as-lib" ${v.library ? 'checked' : ''}> <span><b>📚 Use knowledge</b> <span class="help">search and cite your knowledge bases</span></span></label>
      <div class="field" style="margin-left:28px"><span class="help">Which knowledge bases (none ticked = all of them):</span><div class="row" id="as-kbs">${(kb.collections || []).map((c) => `<label class="btn small ${(v.knowledge || []).includes(c.id) ? 'on' : ''}"><input type="checkbox" value="${c.id}" ${(v.knowledge || []).includes(c.id) ? 'checked' : ''}> ${esc(c.emoji)} ${esc(c.name)}</label>`).join('') || '<span class="help">No knowledge bases yet. Create them under Knowledge.</span>'}</div>
        <label class="row" style="margin-top:6px"><input type="checkbox" id="as-strict" ${v.strict ? 'checked' : ''}> <span><b>🔒 Only answer from this knowledge</b> <span class="help">never from general memory; says "not found" instead of guessing</span></span></label></div>
      <label class="row"><input type="checkbox" id="as-web" ${v.web ? 'checked' : ''}> <span><b>🌐 Search the web</b> <span class="help">for current information (set up in Settings)</span></span></label>
      <label class="row"><input type="checkbox" id="as-tools" ${v.tools ? 'checked' : ''}> <span><b>🔌 Use integrations</b> <span class="help">GitHub, Slack, Notion, Jira, Linear and MCP tools</span></span></label>
      <label class="row"><input type="checkbox" id="as-fact" ${v.factCheck ? 'checked' : ''}> <span><b>✅ Fact check every answer</b> <span class="help">with a second model</span></span></label>
    </div>
    <div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="as-save">${a ? 'Save' : 'Create'}</button></div>`);
  b.querySelector('#as-temp').addEventListener('input', (e) => { b.querySelector('#as-temp-v').textContent = e.target.value; });
  b.querySelector('#as-save').addEventListener('click', () => {
    const name = b.querySelector('#as-name').value.trim();
    if (!name) { toast('Give it a name.'); return; }
    const fields = {
      name, emoji: b.querySelector('#as-emoji').value, description: b.querySelector('#as-desc').value.trim(),
      instructions: b.querySelector('#as-ins').value.trim(), target: b.querySelector('#as-target').value,
      temperature: Number(b.querySelector('#as-temp').value), library: b.querySelector('#as-lib').checked,
      web: b.querySelector('#as-web').checked, factCheck: b.querySelector('#as-fact').checked, tools: b.querySelector('#as-tools').checked,
      knowledge: [...b.querySelectorAll('#as-kbs input:checked')].map((x) => x.value), strict: b.querySelector('#as-strict').checked,
    };
    if (a) Object.assign(a, fields); else S.data.assistants.push({ id: uid(), ...fields });
    save(); closeModal(); render(); toast(a ? 'Saved.' : `${name} is ready.`);
  });
}
