// Skills: browse, use, create, edit, import and export (SKILL.md, the open Agent Skills format).
'use strict';

let skillQuery = '';
let skillCat = 'all';
const OUTPUT_LABEL = { text: 'Answer', pptx: 'PowerPoint file', docx: 'Word document', xlsx: 'Excel table', chart: 'Chart', image: 'Picture', video: 'Video', edit: 'Edited photo', animate: 'Video from a photo', app: 'App you can open', beat: 'Music (MP3)', podcast: 'Podcast (MP3)', narrate: 'Recording (MP3)', speech: 'Recording (MP3)', tool: 'New file' };
const OUTPUT_BADGE = { text: 'b-lav', pptx: 'b-peach', docx: 'b-sky', xlsx: 'b-mint', chart: 'b-lemon', image: 'b-pink', video: 'b-pink', edit: 'b-pink', animate: 'b-pink', app: 'b-sky', beat: 'b-lemon', podcast: 'b-lemon', narrate: 'b-lemon', speech: 'b-lemon', tool: 'b-mint' };

// Built-ins (with any edits you made) plus your own skills.
function allSkills() {
  const custom = S.data.skills || [];
  const overridden = new Set(custom.filter((s) => s.overrides).map((s) => s.overrides));
  const cat = (s) => (SKILL_CATEGORIES[s.category] ? s : { ...s, category: SKILL_RECAT[s.category] || 'office' });
  return [...BUILTIN_SKILLS.filter((s) => !overridden.has(s.id)), ...custom.map((s) => cat({ ...s, custom: true }))];
}
const skillById = (id) => (id ? allSkills().find((s) => s.id === id || s.overrides === id) : undefined);

function suggestSkill(text) {
  if (!text || text.length < 6) return null;
  const t = text.toLowerCase();
  return allSkills().find((s) => (s.triggers || []).some((p) => { try { return new RegExp(p, 'i').test(t); } catch { return false; } })) || null;
}

views.skills = {
  html() {
    const list = allSkills().filter((s) => (skillCat === 'all' || s.category === skillCat) && (!skillQuery || `${s.name} ${s.description}`.toLowerCase().includes(skillQuery.toLowerCase())));
    return `<div class="page">
      <div class="page-head"><h1>Skills</h1><label class="btn">⬆ Import SKILL.md<input type="file" id="sk-import" accept=".md,.markdown,text/markdown" multiple hidden></label><button class="btn primary" id="sk-new">＋ Create a skill</button></div>
      <p class="lede"><b>${allSkills().length} ready-made skills</b> for the things people use AI for most: make pictures, videos and beats, edit photos and video, build apps, write anything, research with sources, read aloud and make podcasts, and sort out money and contracts. Skills that make files give you a real file (PowerPoint, Word, Excel, MP3, PNG, MP4). Type <b>/</b> in any chat to use one, or press <b>⚡ Skills</b>. Quicksilver also suggests the right skill as you type.</p>
      <div class="row" style="margin-bottom:16px"><input id="sk-q" type="search" placeholder="Search skills" value="${esc(skillQuery)}" style="max-width:320px">
        ${[['all', { label: 'All' }], ...Object.entries(SKILL_CATEGORIES)].map(([k, c]) => `<button class="btn small ${skillCat === k ? 'on' : ''}" data-skcat="${k}">${esc(c.label)}</button>`).join('')}</div>
      ${Object.entries(SKILL_CATEGORIES).map(([k, c]) => {
        const items = list.filter((s) => s.category === k);
        if (!items.length) return '';
        return `<div class="section"><h2>${esc(c.label)} <span class="small muted" style="font-weight:600">· ${items.length}</span></h2>${c.pitch ? `<p class="small muted" style="margin:2px 0 0;font-weight:600">${esc(c.pitch)}</p>` : ''}</div><div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">${items.map((s) => `
          <div class="card">
            <div class="row"><span class="emoji-badge">${esc(s.icon)}</span><h3 class="grow">${esc(s.name)}</h3>${s.custom ? '<span class="badge b-pink">yours</span>' : ''}</div>
            <p class="desc" style="margin:10px 0">${esc(s.description)}</p>
            <div class="row small" style="margin-bottom:10px"><span class="badge ${OUTPUT_BADGE[s.output] || 'b-lav'}">→ ${esc(OUTPUT_LABEL[s.output] || 'Answer')}</span>${skillEtaBadge(s)}${s.tools?.web ? '<span class="badge b-mint">🌐 web</span>' : ''}${s.tools?.knowledge ? '<span class="badge b-sky">📚 knowledge</span>' : ''}${s.tools?.factCheck ? '<span class="badge b-peach">✅ fact check</span>' : ''}</div>
            <div class="row"><button class="btn small primary" data-sk-use="${esc(s.id)}">Use</button><button class="btn small" data-sk-edit="${esc(s.id)}">${s.custom ? 'Edit' : 'Customize'}</button><button class="btn small ghost" data-sk-export="${esc(s.id)}">Export</button>${s.custom ? `<button class="btn small danger" data-sk-del="${esc(s.id)}">${s.overrides ? 'Reset' : 'Delete'}</button>` : ''}</div>
          </div>`).join('')}</div>`;
      }).join('') || '<div class="empty">No skills match.</div>'}
    </div>`;
  },
  bind() {
    const q = $('#sk-q');
    q.addEventListener('input', () => { skillQuery = q.value; const pos = q.selectionStart; render(); const n = $('#sk-q'); n.focus(); n.setSelectionRange(pos, pos); });
    $$('[data-skcat]').forEach((b) => b.addEventListener('click', () => { skillCat = b.dataset.skcat; render(); }));
    $('#sk-new').addEventListener('click', () => editSkill(null));
    $$('[data-sk-use]').forEach((b) => b.addEventListener('click', () => useSkill(b.dataset.skUse)));
    $$('[data-sk-edit]').forEach((b) => b.addEventListener('click', () => editSkill(skillById(b.dataset.skEdit))));
    $$('[data-sk-export]').forEach((b) => b.addEventListener('click', async () => { const s = skillById(b.dataset.skExport); if (await call('file:saveText', `${s.id}.SKILL.md`, toSkillMd(s))) toast('Skill exported.'); }));
    $$('[data-sk-del]').forEach((b) => b.addEventListener('click', async () => {
      const s = skillById(b.dataset.skDel);
      if (!(await confirmBox(s.overrides ? `Reset "${s.name}" to the built-in version?` : `Delete "${s.name}"?`, { yes: s.overrides ? 'Reset' : 'Delete' }))) return;
      S.data.skills = (S.data.skills || []).filter((x) => x.id !== s.id); save(); render();
    }));
    $('#sk-import').addEventListener('change', async (e) => {
      let n = 0;
      for (const f of e.target.files) { try { const s = fromSkillMd(await f.text(), f.name); (S.data.skills ||= []).push(s); n++; } catch (err) { toast(`${f.name}: ${err.message}`, 6000); } }
      e.target.value = '';
      if (n) { save(); render(); toast(`Imported ${n} skill${n > 1 ? 's' : ''}.`); }
    });
  },
};

// Time and expected quality on this PC. Picture and video skills show the image model's time.
function skillEtaBadge(s) {
  if (DIRECT_OUTPUTS.has(s.output)) return '<span class="badge b-mint" title="Runs on this PC with built-in tools: no model needed">⚡ instant tool · free</span>';
  if (MEDIA_OUTPUTS.has(s.output)) {
    const pick = pickMediaModel(s.output);
    if (!pick) return '<span class="badge b-lemon" title="Get an image or video model under Models → Images & video">needs a Studio model</span>';
    if (pick.api) return '<span class="badge b-lav">☁ via your image API</span>';
    const m = S.speed?.media?.[pick.inst.id];
    return etaBadge(m ? m.sec * Math.max(1, s.media?.count || 1) : null, '', m?.stars ?? null);
  }
  const t = resolveTarget(null, assistantById(S.data.prefs.lastAssistant));
  return etaBadge(etaFor(t, wordsForSkill(s)), '', starsOf(t, SKILL_JOB[s.category] || 'general'));
}

// Start a chat with a skill ready to go.
function useSkill(id) {
  const s = skillById(id);
  const job = { office: 'office', finance: 'office', research: 'research', code: 'coding', writing: 'writing', career: 'writing', voice: 'writing', music: 'writing' }[s.category];
  const a = S.data.assistants.find((x) => x.job === job) || assistantById(S.data.prefs.lastAssistant);
  newChat(a.id);
  const chat = chatById(S.route.id);
  chat.pendingSkill = s.id;
  save(); render();
}

function editSkill(s) {
  const v = s || { name: '', icon: '⚡', category: 'office', description: '', instructions: '', output: 'text', triggers: [], tools: {} };
  const b = openModal(`<h2>${s ? (s.custom ? `Edit ${esc(s.name)}` : `Customize ${esc(s.name)}`) : 'Create a skill'}</h2>
    <div class="stack-v">
      <div class="row"><div class="field" style="width:110px"><label for="sk-icon">Icon</label><input id="sk-icon" value="${esc(v.icon)}" maxlength="4"></div>
        <div class="field grow"><label for="sk-name">Name</label><input id="sk-name" value="${esc(v.name)}" placeholder="e.g. Weekly status update"></div>
        <div class="field" style="width:200px"><label for="sk-cat">Category</label><select id="sk-cat">${Object.entries(SKILL_CATEGORIES).map(([k, c]) => `<option value="${k}" ${v.category === k ? 'selected' : ''}>${c.label}</option>`).join('')}</select></div></div>
      <div class="field"><label for="sk-desc">What it does</label><input id="sk-desc" value="${esc(v.description)}" placeholder="One line, shown on its card"></div>
      <div class="field"><label for="sk-ins">Instructions</label><span class="help">Step-by-step: what to do, what to include, the format and length. This is added to your message whenever the skill is used.</span><textarea id="sk-ins" rows="9">${esc(v.instructions)}</textarea></div>
      <div class="grid2">
        <div class="field"><label for="sk-out">Result</label><select id="sk-out">${Object.entries(OUTPUT_LABEL).map(([k, l]) => `<option value="${k}" ${v.output === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label for="sk-trig">Suggest when I type… (optional)</label><input id="sk-trig" value="${esc((v.triggers || []).join(', '))}" placeholder="status update, weekly report"></div>
      </div>
      <div class="row"><label class="row"><input type="checkbox" id="sk-web" ${v.tools?.web ? 'checked' : ''}> 🌐 Search the web</label><label class="row"><input type="checkbox" id="sk-kb" ${v.tools?.knowledge ? 'checked' : ''}> 📚 Use knowledge</label><label class="row"><input type="checkbox" id="sk-fc" ${v.tools?.factCheck ? 'checked' : ''}> ✅ Fact check</label></div>
    </div>
    <div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="sk-save">Save skill</button></div>`, { wide: true });
  b.querySelector('#sk-save').addEventListener('click', () => {
    const name = b.querySelector('#sk-name').value.trim();
    const instructions = b.querySelector('#sk-ins').value.trim();
    if (!name || !instructions) { toast('Give it a name and instructions.'); return; }
    const entry = {
      id: s?.custom ? s.id : `sk-${uid()}`, overrides: s && !s.custom ? s.id : s?.overrides,
      name, icon: b.querySelector('#sk-icon').value.trim() || '⚡', category: b.querySelector('#sk-cat').value,
      description: b.querySelector('#sk-desc').value.trim(), instructions, output: b.querySelector('#sk-out').value,
      triggers: b.querySelector('#sk-trig').value.split(',').map((x) => x.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).filter(Boolean),
      tools: { web: b.querySelector('#sk-web').checked, knowledge: b.querySelector('#sk-kb').checked, factCheck: b.querySelector('#sk-fc').checked },
    };
    S.data.skills = (S.data.skills || []).filter((x) => x.id !== entry.id);
    S.data.skills.push(entry);
    save(); closeModal(); render(); toast('Skill saved.');
  });
}

// ---------- SKILL.md (Agent Skills format: YAML front matter + instructions) ----------

function toSkillMd(s) {
  const fm = { name: s.id, description: `${s.name}: ${s.description}`, 'x-quicksilver': JSON.stringify({ title: s.name, icon: s.icon, category: s.category, output: s.output, triggers: s.triggers || [], tools: s.tools || {} }) };
  return `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${/[:#'"\n]/.test(v) ? JSON.stringify(v) : v}`).join('\n')}\n---\n\n# ${s.name}\n\n${s.instructions}\n`;
}

function fromSkillMd(text, fileName) {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  const meta = {};
  if (m) for (const line of m[1].split('\n')) { const k = line.match(/^([\w-]+):\s*(.*)$/); if (k) { let val = k[2].trim(); if (/^["']/.test(val)) { try { val = JSON.parse(val.replace(/^'|'$/g, '"')); } catch {} } meta[k[1]] = val; } }
  const body = (m ? m[2] : text).trim().replace(/^#\s+.+\n+/, '');
  if (!body) throw new Error('No instructions found.');
  let extra = {};
  try { extra = meta['x-quicksilver'] ? JSON.parse(meta['x-quicksilver']) : {}; } catch {}
  const name = extra.title || String(meta.name || fileName.replace(/(\.SKILL)?\.md$/i, '')).replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    id: `sk-${uid()}`, name, icon: extra.icon || '⚡', category: SKILL_CATEGORIES[extra.category] ? extra.category : 'office',
    description: String(meta.description || '').replace(new RegExp(`^${name}:\\s*`), '').slice(0, 200), instructions: body,
    output: OUTPUT_LABEL[extra.output] ? extra.output : 'text', triggers: extra.triggers || [], tools: extra.tools || {},
  };
}

// Extra instructions added for skills that produce files or charts.
const OUTPUT_RULES = {
  pptx: 'Your answer will be converted into a PowerPoint file, so follow the slide structure exactly ("# Title", subtitle line, then "## Slide title" sections with bullets and a "Notes:" line).',
  docx: 'Your answer will be saved as a Word document, so use clean Markdown headings, paragraphs, bullet lists and tables only.',
  xlsx: 'Your answer will be exported to Excel, so put the main data in one well-formed Markdown table with a header row.',
  chart: 'When a chart helps, include it as a ```chart code block containing valid JSON: {"type":"bar|line|pie|doughnut|area","title":"…","labels":[…],"series":[{"name":"…","data":[numbers]}]}.',
};

function skillPrompt(s) {
  return `<skill name="${s.name}">\n${s.instructions}\n${OUTPUT_RULES[s.output] || MEDIA_RULES[s.output] || ''}\n</skill>\nApply the skill above to the user's latest message and attachments.`;
}

// ---------- the skill picker (⚡ button and "/" in the composer) ----------

function skillPickerHTML(filter = '') {
  const f = filter.toLowerCase();
  // Best matches first: the name starts with it, then a word in the name does, then the description.
  const score = (s) => { const n = s.name.toLowerCase(); return !f ? 0 : n.startsWith(f) ? 4 : n.split(/\W+/).some((w) => w.startsWith(f)) ? 3 : n.includes(f) || s.id.includes(f) ? 2 : s.description.toLowerCase().includes(f) ? 1 : -1; };
  const list = allSkills().map((s, i) => ({ s, k: score(s), i })).filter((x) => x.k >= 0).sort((a, b) => b.k - a.k || a.i - b.i).map((x) => x.s);
  return list.length ? list.slice(0, 40).map((s, i) => `<button class="skill-opt ${i === 0 ? 'hot' : ''}" data-pick-skill="${esc(s.id)}"><span>${esc(s.icon)}</span><span class="grow"><b>${esc(s.name)}</b><span class="small muted"> · ${esc(s.description)}</span></span><span class="badge ${OUTPUT_BADGE[s.output]}">${esc(OUTPUT_LABEL[s.output])}</span></button>`).join('') : '<div class="small muted" style="padding:10px">No skills match.</div>';
}
