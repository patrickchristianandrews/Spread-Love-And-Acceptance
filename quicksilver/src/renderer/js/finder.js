// Web Finder: the page that drives the dork database (dorks.js) and the OSINT knowledge base
// (osint.js). It asks what you are looking for, builds ready-to-run advanced searches, and teaches
// how to run an open-source-intelligence investigation with free tools. Everything is lawful-use:
// research, auditing your own footprint, and authorised testing.
'use strict';

const finderState = { tab: 'find', goal: '', site: '', term: '', built: false, engine: 'google', open: {} };

function wfBanner() {
  return `<div class="notice" style="margin:0 0 12px;border-color:#caa33a;background:rgba(202,163,58,.1)">
    <b>⚖️ For lawful use.</b> <span class="small">Dorks are ordinary search operators and OSINT is public-data research. Use this to find things on the open web, audit your <b>own</b> sites and footprint, do research, or test targets you are <b>authorised</b> to. Reading other people’s private data, breaking into accounts, stalking or harassment is illegal — don’t.</span></div>`;
}

// ---- Find tab: the dork builder ----
function wfDorkRow(x) {
  const q = dorkFill(x.q, finderState);
  const need = [];
  if (dorkNeeds(x.q, 'site') && !finderState.site.trim()) need.push('a domain');
  if (dorkNeeds(x.q, 'term') && !finderState.term.trim()) need.push('a word/name');
  const url = dorkUrl(q, finderState.engine);
  return `<div class="wf-row card" style="padding:10px;margin:0 0 8px">
    <div class="small muted" style="margin-bottom:4px">${esc(x.w)}${need.length ? ` <span class="badge b-peach">add ${esc(need.join(' & '))} above</span>` : ''}</div>
    <code class="wf-q" style="display:block;word-break:break-all;margin-bottom:8px">${esc(q)}</code>
    <div class="row" style="gap:6px;flex-wrap:wrap">
      <a class="btn small primary" href="${esc(url)}" title="Opens ${esc((DORK_ENGINES[finderState.engine] || DORK_ENGINES.google)[0])} in your browser">Search ↗</a>
      <button class="btn small" data-wf-copy="${esc(q)}">Copy</button>
      <button class="btn small ghost" data-wf-ask="${esc(q)}">Ask Quicksilver</button>
    </div></div>`;
}
function wfCatSection(cat) {
  const open = finderState.open[cat.id] !== false; // open by default
  return `<section class="card og-sec wf-cat" data-wf-cat-sec="${cat.id}" style="margin:0 0 12px">
    <div class="row wf-cat-head" data-wf-toggle="${cat.id}" style="cursor:pointer;align-items:flex-start">
      <h3 class="grow" style="margin:0">${cat.icon} ${esc(cat.name)} <span class="small muted">${cat.items.length}</span></h3>
      <span class="small muted">${open ? '▾' : '▸'}</span></div>
    <p class="small muted" style="margin:4px 0 ${open ? '10' : '0'}px">${esc(cat.blurb)}</p>
    ${open ? cat.items.map(wfDorkRow).join('') : ''}
  </section>`;
}
function wfFindTab() {
  const suggested = finderState.built ? dorkSuggest(finderState.goal) : null;
  const cats = suggested ? [...DORK_CATS].sort((a, b) => (suggested.includes(b.id) ? 1 : 0) - (suggested.includes(a.id) ? 1 : 0)) : DORK_CATS;
  const engineOpts = Object.entries(DORK_ENGINES).map(([k, [label]]) => `<option value="${k}" ${finderState.engine === k ? 'selected' : ''}>${esc(label)}</option>`).join('');
  return `${wfBanner()}
    <section class="card" style="margin:0 0 14px">
      <h2 style="margin:0 0 4px">🔎 What are you searching for?</h2>
      <p class="small muted" style="margin:0 0 10px">Tell me in plain words. I’ll suggest the right kind of search and build the exact queries — then you run them in your browser or hand them to Quicksilver.</p>
      <textarea id="wf-goal" rows="2" class="grow" style="width:100%;margin-bottom:8px" placeholder="e.g. the cheapest place to buy a Sony A7IV, or exposed backup files on my site">${esc(finderState.goal)}</textarea>
      <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:8px">
        <input id="wf-site" class="grow" style="min-width:160px" placeholder="A domain (optional) — example.com" value="${esc(finderState.site)}">
        <input id="wf-term" class="grow" style="min-width:160px" placeholder="A word, name or product (optional)" value="${esc(finderState.term)}">
      </div>
      <div class="row" style="gap:8px;flex-wrap:wrap;align-items:center">
        <button class="btn primary" id="wf-build">Build searches</button>
        <label class="small muted">Open in <select id="wf-engine" style="margin-left:4px">${engineOpts}</select></label>
      </div>
      <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:10px">${DORK_EXAMPLES.map((e) => `<button class="chip-tog" data-wf-example="${esc(e)}">${esc(e)}</button>`).join('')}</div>
    </section>
    ${suggested ? `<div class="notice info" style="margin:0 0 12px"><b>Best fit for "${esc(finderState.goal.slice(0, 60))}":</b> ${suggested.map((id) => { const c = DORK_CATS.find((x) => x.id === id); return c ? `<button class="chip-tog on" data-wf-jump="${id}">${c.icon} ${esc(c.name)}</button>` : ''; }).join(' ')}</div>` : ''}
    ${cats.map(wfCatSection).join('')}`;
}

// ---- Investigate tab: the OSINT methodology ----
function wfInvestigateTab() {
  return `${wfBanner()}
    <section class="card" style="margin:0 0 14px"><h2 style="margin:0 0 8px">🧭 How an OSINT investigation works</h2>
      <div class="stack-v" style="gap:8px">${OSINT_PHASES.map(([t, d]) => `<div><b>${esc(t)}</b><div class="small muted">${esc(d)}</div></div>`).join('')}</div></section>
    <section class="card" style="margin:0 0 14px"><h2 style="margin:0 0 8px">✅ Ground rules</h2>
      <div class="stack-v" style="gap:6px">${OSINT_RULES.map(([t, d]) => `<div class="small"><b>${esc(t)}.</b> ${esc(d)}</div>`).join('')}</div></section>
    <h2 style="margin:4px 0 10px">🎯 Playbooks — start from one clue</h2>
    ${OSINT_PLAYBOOKS.map((p) => { const open = finderState.open['pb-' + p.id] === true; return `<section class="card wf-cat" style="margin:0 0 10px">
      <div class="row" data-wf-toggle="pb-${p.id}" style="cursor:pointer"><h3 class="grow" style="margin:0">${p.icon} ${esc(p.name)}</h3><span class="small muted">${open ? '▾' : '▸'}</span></div>
      ${open ? `<ol class="small" style="margin:8px 0 6px;padding-left:20px;line-height:1.6">${p.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
        <div class="row small" style="gap:4px;flex-wrap:wrap"><span class="muted">Tools:</span>${p.tools.map((id) => { const t = osintToolById(id); return t ? `<a class="badge b-lav" href="${esc(t.url)}">${esc(t.name)} ↗</a>` : ''; }).join('')}</div>` : ''}
    </section>`; }).join('')}`;
}

// ---- Tools tab ----
function wfToolsTab() {
  return `${wfBanner()}
    <section class="card" style="margin:0 0 12px"><h2 style="margin:0 0 4px">🧰 Open-source OSINT tools</h2>
      <p class="small muted" style="margin:0">The free and open-source tools investigators actually use, grouped by job. Most run on your own PC; a few are websites. Quicksilver’s Web Finder already builds the search queries these tools would run, no install needed.</p></section>
    ${OSINT_TOOLS.map((g) => `<section class="card og-sec" style="margin:0 0 12px"><h3 style="margin:0 0 8px">${esc(g.cat)}</h3>
      <div class="stack-v" style="gap:8px">${g.list.map((t) => { const [lbl, cls] = OSINT_TYPE_LABEL[t.type] || ['', 'b-lav']; return `<div class="wf-tool"><div class="row" style="align-items:baseline"><a class="grow" href="${esc(t.url)}"><b>${esc(t.name)}</b> ↗</a><span class="badge ${cls}">${esc(lbl)}</span></div><div class="small muted">${esc(t.what)}</div></div>`; }).join('')}</div></section>`).join('')}`;
}

// ---- Operators tab ----
function wfOperatorsTab() {
  return `${wfBanner()}
    <section class="card"><h2 style="margin:0 0 8px">🔧 Search-operator cheat sheet</h2>
      <p class="small muted" style="margin:0 0 10px">These work in Google (and mostly in Bing/DuckDuckGo). Combine them: <code>site:example.com filetype:pdf "annual report"</code>.</p>
      <div class="stack-v" style="gap:6px">${DORK_OPERATORS.map(([op, ex, what]) => `<div class="row" style="align-items:baseline;gap:10px"><code style="min-width:120px"><b>${esc(op)}</b></code><div class="grow small"><code class="muted">${esc(ex)}</code> — ${esc(what)}</div></div>`).join('')}</div></section>`;
}

const WF_TABS = { find: '🔎 Find', investigate: '🧭 Investigate', tools: '🧰 Tools', operators: '🔧 Operators' };
views.finder = {
  html() {
    const body = { find: wfFindTab, investigate: wfInvestigateTab, tools: wfToolsTab, operators: wfOperatorsTab }[finderState.tab] || wfFindTab;
    return `<div class="page">
      <div class="page-head"><h1>Web Finder <span class="small muted">dorks &amp; OSINT</span></h1></div>
      <div class="row sf-tabs" style="gap:4px;flex-wrap:wrap;margin-bottom:14px">${Object.entries(WF_TABS).map(([k, l]) => `<button class="chip-tog ${finderState.tab === k ? 'on' : ''}" data-wf-tab="${k}">${l}</button>`).join('')}</div>
      ${body()}
    </div>`;
  },
  bind() {
    const root = document;
    root.querySelectorAll('[data-wf-tab]').forEach((b) => b.addEventListener('click', () => { finderState.tab = b.dataset.wfTab; render(); }));
    // Find tab
    const goal = root.querySelector('#wf-goal'); if (goal) goal.addEventListener('input', () => { finderState.goal = goal.value; });
    const site = root.querySelector('#wf-site'); if (site) site.addEventListener('input', () => { finderState.site = site.value; });
    const term = root.querySelector('#wf-term'); if (term) term.addEventListener('input', () => { finderState.term = term.value; });
    const eng = root.querySelector('#wf-engine'); if (eng) eng.addEventListener('change', () => { finderState.engine = eng.value; if (finderState.built || finderState.tab === 'find') render(); });
    root.querySelector('#wf-build')?.addEventListener('click', () => { finderState.built = true; render(); });
    root.querySelectorAll('[data-wf-example]').forEach((b) => b.addEventListener('click', () => { finderState.goal = b.dataset.wfExample; finderState.built = true; render(); }));
    root.querySelectorAll('[data-wf-jump]').forEach((b) => b.addEventListener('click', () => { const el = root.querySelector(`[data-wf-cat-sec="${b.dataset.wfJump}"]`); el?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    root.querySelectorAll('[data-wf-toggle]').forEach((b) => b.addEventListener('click', () => { const id = b.dataset.wfToggle; finderState.open[id] = finderState.open[id] === false; if (id.startsWith('pb-')) finderState.open[id] = !(finderState.open[id] === true); render(); }));
    root.querySelectorAll('[data-wf-copy]').forEach((b) => b.addEventListener('click', async () => { try { await navigator.clipboard.writeText(b.dataset.wfCopy); toast('Copied the search.'); } catch { toast('Copy failed — select the text.'); } }));
    root.querySelectorAll('[data-wf-ask]').forEach((b) => b.addEventListener('click', () => {
      newChat(); const c = chatById(S.route.id);
      if (c) { c.draft = `Run this advanced web search and summarise what you find, with the links:\n\n${b.dataset.wfAsk}`; save(); render(); }
    }));
  },
};