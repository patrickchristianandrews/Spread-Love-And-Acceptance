// Integrations: built-in connectors (grouped by kind) and MCP servers.
'use strict';

let intData = null;   // { connectors, mcp, presets, tools, allowed }

async function refreshIntegrations() {
  const [connectors, mcpList, presets, allowed, auto, apis] = await Promise.all([qs.call('int:list'), qs.call('mcp:list'), qs.call('mcp:presets'), qs.call('tools:allowed'), qs.call('tools:auto'), qs.call('capi:list')]);
  intData = { connectors, mcp: mcpList, presets, allowed, auto, apis, tools: intData?.tools || null, found: intData?.found || null, query: intData?.query || '' };
  S.hasIntegrations = connectors.some((c) => c.enabled) || mcpList.length > 0 || apis.length > 0;
}

views.integrations = {
  html() {
    if (!intData) return '<div class="page"><h1>Connectors</h1><div class="empty">Loading…</div></div>';
    const { connectors, mcp: servers, presets, allowed } = intData;
    return `<div class="page">
      <div class="page-head"><h1>Connectors</h1></div>
      <p class="lede"><b>Connect the tools you work in.</b> Models can then look things up and take actions for you during a chat: "list my open GitHub issues", "summarize #design in Slack", "create a Jira ticket for this bug". Turn on <b>🔌 Tools</b> in a chat to use them. <b>Anything that changes something asks you first</b>; reading never does. Tokens are encrypted on this PC and only sent to that service.</p>

      <div class="section"><h2>Connectors</h2><span class="small muted">${connectors.length} built in. Free ones need no account.</span></div>
      ${INT_GROUPS.map((g) => { const list = connectors.filter((c) => c.group === g); return list.length ? `<h3 class="int-group">${esc(g)}</h3><div class="cards">${list.map((c) => `
        <div class="card ${c.enabled ? 'hl' : ''}">
          <div class="row"><span class="emoji-badge">${c.icon}</span><h3 class="grow">${esc(c.name)}</h3>${c.enabled ? `<span class="badge b-mint">● ${esc(c.account || 'connected')}</span>` : ''}</div>
          <p class="desc" style="margin:10px 0">${esc(c.blurb)}</p>
          <div class="row">${c.enabled ? `<button class="btn small" data-int-edit="${c.id}">Settings</button><button class="btn small danger" data-int-off="${c.id}">Disconnect</button>` : `<button class="btn small primary" data-int-edit="${c.id}">Connect</button>`}${c.noToken ? '<span class="badge b-mint">free · no account</span>' : ''}</div>
        </div>`).join('')}</div>` : ''; }).join('')}

      <div class="section"><h2>MCP servers</h2><span class="small muted">The open standard for AI integrations: hundreds of servers for files, databases, browsers, cloud services and more.</span></div>
      ${servers.length ? `<div class="cards" style="margin-bottom:16px">${servers.map((s) => `
        <div class="card">
          <div class="row"><span class="emoji-badge">🧩</span><h3 class="grow">${esc(s.name)}</h3>${s.error ? '<span class="badge b-pink">error</span>' : s.connected ? `<span class="badge b-mint">● ${s.toolCount} tools</span>` : s.enabled ? '<span class="badge b-lemon">not started</span>' : '<span class="badge b-lav">off</span>'}</div>
          <div class="meta" style="margin:6px 0;word-break:break-all">${esc(s.transport === 'stdio' ? `${s.command} ${s.args.join(' ')}` : s.url)}</div>
          ${s.error ? `<div class="small" style="color:var(--danger);font-weight:700;margin-bottom:8px">${esc(s.error)}</div>` : ''}
          ${s.toolNames?.length ? `<div class="row small" style="margin-bottom:8px">${s.toolNames.slice(0, 10).map((t) => `<span class="badge b-lav">${esc(t)}</span>`).join('')}${s.toolNames.length > 10 ? `<span class="muted">+${s.toolNames.length - 10}</span>` : ''}</div>` : ''}
          <div class="row"><button class="btn small" data-mcp-test="${s.id}">Test connection</button><button class="btn small" data-mcp-edit="${s.id}">Edit</button><button class="btn small danger" data-mcp-del="${s.id}">Remove</button></div>
        </div>`).join('')}</div>` : ''}
      ${[...new Set(Object.values(presets).map((p) => p.group || 'Other'))].map((g) => `<h3 class="int-group">${esc(g)}</h3><div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))">${Object.entries(presets).filter(([, p]) => (p.group || 'Other') === g).map(([k, p]) => `
        <button class="card" data-mcp-preset="${k}" style="text-align:left"><h3>${esc(p.name)}</h3><div class="small muted" style="font-weight:600;margin-top:4px">${esc(p.note)}</div></button>`).join('')}
      </div>`).join('')}

      <div class="section"><h2>Find more in the MCP directory</h2><span class="small muted">Thousands of public servers from the official MCP Registry.</span></div>
      <div class="row" style="margin-bottom:12px"><input id="mcp-q" type="search" placeholder="Search: email, calendar, maps, spotify, database…" value="${esc(intData.query)}" style="max-width:420px"><button class="btn" id="mcp-search">Search</button></div>
      ${intData.found ? (intData.found.error ? `<div class="notice">${esc(intData.found.error)}</div>` : intData.found.length ? `<div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">${intData.found.map((p, i) => `
        <div class="card"><div class="row"><h3 class="grow">${esc(p.name)}</h3><span class="badge ${p.transport === 'http' ? 'b-sky' : 'b-lav'}">${p.transport === 'http' ? 'remote' : p.command}</span></div>
          <div class="small muted" style="font-weight:600;margin:6px 0 10px">${esc(p.note)}</div>
          <div class="row"><button class="btn small primary" data-found="${i}">Add</button><span class="small muted" style="word-break:break-all">${esc(p.source || '')}</span></div></div>`).join('')}</div>` : '<p class="muted">Nothing found. Try another word.</p>') : ''}

      <div class="section"><h2>Your own APIs</h2><button class="btn small primary" id="capi-new">＋ Add any web API</button></div>
      <p class="small muted" style="margin-top:-6px">Connect a service that isn't listed: give its address, key and the endpoints the AI may use. Reading needs no approval; anything that changes data asks first.</p>
      ${intData.apis.length ? `<div class="cards">${intData.apis.map((a) => `<div class="card"><div class="row"><span class="emoji-badge">${esc(a.icon)}</span><h3 class="grow">${esc(a.name)}</h3><span class="badge b-lav">${a.endpoints.length} endpoint${a.endpoints.length === 1 ? '' : 's'}</span></div>
        <div class="meta" style="margin:6px 0;word-break:break-all">${esc(a.baseUrl)}</div>${a.note ? `<p class="desc" style="margin:4px 0 8px">${esc(a.note)}</p>` : ''}
        <div class="row"><button class="btn small" data-capi-test="${a.id}">Test</button><button class="btn small" data-capi-edit="${a.id}">Edit</button><button class="btn small danger" data-capi-del="${a.id}">Remove</button></div></div>`).join('')}</div>` : ''}

      <div class="section"><h2>Actions</h2></div>
      <label class="pick-row ${intData.auto ? 'on' : ''}" style="margin-bottom:10px"><input type="checkbox" id="tools-auto" ${intData.auto ? 'checked' : ''}>
        <span class="grow"><b>Let the AI take actions without asking</b><div class="small muted">Off: you approve each change (a new issue, a message, a file) before it happens. On: it just does it.</div></span></label>
      <div class="label" style="margin:6px 0">Always-allowed actions</div>
      ${allowed.length ? `<div class="row">${allowed.map((n) => `<span class="badge b-peach" style="font-size:.85rem">${esc(n)} <button class="tool" data-forget="${esc(n)}" title="Ask again next time">✕</button></span>`).join('')}</div>` : '<p class="muted">None. Every action asks for approval.</p>'}
      <div class="section"><h2>Available tools</h2><button class="btn small" id="int-tools">Show all tools</button></div>
      ${intData.tools ? `<table class="list"><thead><tr><th>Tool</th><th>From</th><th>Kind</th><th>What it does</th></tr></thead><tbody>${intData.tools.map((t) => `<tr><td><code>${esc(t.name)}</code></td><td>${esc(t.source)}</td><td>${t.write ? '<span class="badge b-peach">asks first</span>' : '<span class="badge b-mint">read</span>'}</td><td class="small">${esc(t.description)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">No tools yet. Connect something above.</td></tr>'}</tbody></table>` : ''}
    </div>`;
  },
  bind() {
    if (!intData) { refreshIntegrations().then(() => S.route.view === 'integrations' && render()); return; }
    $$('[data-int-edit]').forEach((b) => b.addEventListener('click', () => editConnector(intData.connectors.find((c) => c.id === b.dataset.intEdit))));
    $$('[data-int-off]').forEach((b) => b.addEventListener('click', async () => { if (!(await confirmBox(intData.connectors.find((c) => c.id === b.dataset.intOff)?.noToken ? 'Turn this off?' : 'Disconnect and forget the token?', { yes: 'Disconnect' }))) return; await call('int:disable', b.dataset.intOff); await refreshIntegrations(); render(); }));
    $$('[data-mcp-preset]').forEach((b) => b.addEventListener('click', () => editMcp({ preset: b.dataset.mcpPreset, ...intData.presets[b.dataset.mcpPreset] })));
    $$('[data-mcp-edit]').forEach((b) => b.addEventListener('click', () => editMcp(intData.mcp.find((s) => s.id === b.dataset.mcpEdit))));
    $$('[data-mcp-del]').forEach((b) => b.addEventListener('click', async () => { if (!(await confirmBox('Remove this MCP server?', { yes: 'Remove' }))) return; await call('mcp:remove', b.dataset.mcpDel); await refreshIntegrations(); render(); }));
    $$('[data-mcp-test]').forEach((b) => b.addEventListener('click', async () => {
      b.disabled = true; b.textContent = 'Connecting…';
      try { const names = await qs.call('mcp:test', b.dataset.mcpTest); toast(`Connected: ${names.length} tools.`); } catch (err) { toast(`Could not connect: ${err.message}`, 8000); }
      await refreshIntegrations(); render();
    }));
    $$('[data-forget]').forEach((b) => b.addEventListener('click', async () => { await call('tools:forget', b.dataset.forget); await refreshIntegrations(); render(); }));
    $('#tools-auto')?.addEventListener('change', async (e) => { intData.auto = await call('tools:auto', e.target.checked); toast(intData.auto ? 'The AI will act without asking.' : 'The AI will ask before each change.'); render(); });
    const doSearch = async () => {
      intData.query = $('#mcp-q').value.trim();
      $('#mcp-search').textContent = 'Searching…';
      try { intData.found = await qs.call('mcp:registry', intData.query); } catch (err) { intData.found = { error: `Couldn't reach the MCP directory: ${err.message}` }; }
      render();
    };
    $('#mcp-search').addEventListener('click', doSearch);
    $('#mcp-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
    $$('[data-found]').forEach((b) => b.addEventListener('click', () => editMcp({ ...intData.found[Number(b.dataset.found)], askFolder: true })));
    $('#capi-new').addEventListener('click', () => editApi(null));
    $$('[data-capi-edit]').forEach((b) => b.addEventListener('click', () => editApi(intData.apis.find((a) => a.id === b.dataset.capiEdit))));
    $$('[data-capi-del]').forEach((b) => b.addEventListener('click', async () => { if (!(await confirmBox('Remove this API and its saved key?', { yes: 'Remove' }))) return; await call('capi:remove', b.dataset.capiDel); await refreshIntegrations(); render(); }));
    $$('[data-capi-test]').forEach((b) => b.addEventListener('click', async () => { b.disabled = true; try { toast(`It works: ${await qs.call('capi:test', b.dataset.capiTest)}.`); } catch (err) { toast(`It didn't work: ${err.message}`, 8000); } b.disabled = false; }));
    $('#int-tools').addEventListener('click', async (e) => { e.target.textContent = 'Loading…'; intData.tools = await call('int:tools'); render(); });
  },
};

const INT_GROUPS = ['Build & ship', 'Everyday', 'Google', 'Microsoft', 'Files & storage', 'Sales & support', 'Commerce & payments', 'Marketing', 'Design', 'Websites', 'Music & media', 'Notes & knowledge', 'Tasks & projects', 'Messaging & automation', 'Developer', 'Home', 'Other'];

function editConnector(c) {
  const b = openModal(`<h2>${c.icon} ${c.enabled ? 'Settings' : 'Connect'}: ${esc(c.name)}</h2>
    ${c.note ? `<p class="help">${esc(c.note)}</p>` : ''}
    <div class="stack-v">${c.fields.map((f) => `<div class="field"><label for="f-${f.key}">${esc(f.label)}</label>${f.help ? `<span class="help">${esc(f.help)}${f.url ? ` <a href="${esc(f.url)}">Open</a>` : ''}</span>` : ''}
      <input id="f-${f.key}" ${f.secret ? 'type="password" autocomplete="off"' : ''} placeholder="${esc(f.secret && c.hasToken ? 'Saved. Paste a new one to replace it' : f.placeholder || '')}" value="${f.secret ? '' : esc(c.values[f.key] || '')}"></div>`).join('')}</div>
    <div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="int-save">${c.google && !c.enabled ? 'Sign in with Google' : c.oauth && !c.enabled ? 'Sign in' : c.enabled ? 'Save' : 'Connect'}</button></div>`);
  b.querySelector('#int-save').addEventListener('click', async () => {
    const values = {};
    let token = '';
    for (const f of c.fields) { const v = b.querySelector(`#f-${f.key}`).value.trim(); if (f.secret) token = v; else values[f.key] = v; }
    if (c.oauth && !values.client) { toast('Paste the client ID first.'); return; }
    if (!c.oauth && !token && !c.hasToken && !c.noToken) { toast(c.google ? 'Paste the client ID and secret first.' : 'Paste the token first.'); return; }
    const btn = b.querySelector('#int-save'); btn.disabled = true; btn.textContent = c.google || c.oauth ? 'Finish signing in in your browser…' : 'Checking…';
    try {
      const account = await qs.call('int:save', c.id, values, token);
      closeModal(); toast(`Connected to ${c.name} as ${account}.`);
    } catch (err) { btn.disabled = false; btn.textContent = 'Try again'; toast(`${c.name} said: ${err.message}`, 8000); return; }
    await refreshIntegrations(); render();
  });
}

function editMcp(p) {
  const isNew = !p.id;
  const b = openModal(`<h2>${isNew ? 'Add' : 'Edit'} MCP server${p.name && isNew ? `: ${esc(p.name)}` : ''}</h2>
    ${p.note ? `<p class="help">${esc(p.note)}</p>` : ''}
    <div class="stack-v">
      <div class="field"><label for="m-name">Name</label><input id="m-name" value="${esc(p.name || '')}"></div>
      <div class="field"><label for="m-transport">Type</label><select id="m-transport"><option value="http" ${p.transport !== 'stdio' ? 'selected' : ''}>Remote (https:// address)</option><option value="stdio" ${p.transport === 'stdio' ? 'selected' : ''}>Local (a command on this PC)</option></select></div>
      <div class="field" data-m="http"><label for="m-url">Address</label><input id="m-url" value="${esc(p.url || '')}" placeholder="https://example.com/mcp"></div>
      <div class="field" data-m="http"><label for="m-token">Access token (optional)</label><span class="help">${esc(p.authHelp || 'Sent as "Authorization: Bearer …".')}${p.hasToken ? ' A token is saved.' : ''}</span><input id="m-token" type="password" autocomplete="off"></div>
      <div class="field" data-m="stdio"><label for="m-cmd">Command</label><input id="m-cmd" value="${esc(p.command || '')}" placeholder="npx"></div>
      <div class="field" data-m="stdio"><label for="m-args">Arguments (one per line)</label><textarea id="m-args" rows="4">${esc((p.args || []).join('\n'))}</textarea>${p.askFolder ? '<span class="help">Replace &lt;folder&gt; with the full path of the folder it may use, e.g. C:\\Users\\you\\Documents\\Work</span>' : ''}</div>
      <div class="field" data-m="stdio"><label for="m-env">Environment variables (optional, KEY=value per line)</label><textarea id="m-env" rows="2">${esc(Object.entries(p.env || {}).map(([k, v]) => `${k}=${v}`).join('\n'))}</textarea></div>
    </div>
    <div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="m-save">Save and connect</button></div>`);
  const sync = () => $$('[data-m]', b).forEach((el) => { el.hidden = el.dataset.m !== b.querySelector('#m-transport').value; });
  sync();
  b.querySelector('#m-transport').addEventListener('change', sync);
  b.querySelector('#m-save').addEventListener('click', async () => {
    const transport = b.querySelector('#m-transport').value;
    const args = b.querySelector('#m-args').value.split('\n').map((x) => x.trim()).filter(Boolean);
    if (args.some((x) => /^<.*>$/.test(x))) { toast('Replace the <placeholder> arguments with real values first.'); return; }
    if (/=\s*<[^>]*>\s*$/m.test(b.querySelector('#m-env').value)) { toast('Fill in the <placeholder> values under Environment variables first (your key or token).'); return; }
    const env = Object.fromEntries(b.querySelector('#m-env').value.split('\n').map((l) => l.split('=')).filter((x) => x[0]?.trim() && x.length > 1).map(([k, ...v]) => [k.trim(), v.join('=').trim()]));
    const entry = { id: p.id, name: b.querySelector('#m-name').value.trim() || 'MCP server', transport, url: b.querySelector('#m-url').value.trim(), command: b.querySelector('#m-cmd').value.trim(), args, env, auth: p.auth };
    if (transport === 'http' && !/^https?:\/\//.test(entry.url)) { toast('Enter the server address (https://…).'); return; }
    if (transport === 'stdio' && !entry.command) { toast('Enter the command to run.'); return; }
    const saved = await call('mcp:save', entry, b.querySelector('#m-token').value.trim());
    closeModal();
    toast('Connecting…');
    try { const names = await qs.call('mcp:test', saved.id); toast(`Connected to ${saved.name}: ${names.length} tools.`); } catch (err) { toast(`Saved, but it could not connect: ${err.message}`, 9000); }
    await refreshIntegrations(); render();
  });
}

// Your own API: address, key and endpoints (one per line: GET /path - what it does).
function editApi(a) {
  const v = a || { name: '', icon: '🔗', baseUrl: '', authType: 'bearer', authName: '', note: '', endpointsText: '' };
  const b = openModal(`<h2>${a ? `Edit ${esc(a.name)}` : 'Add any web API'}</h2>
    <div class="stack-v">
      <div class="row"><div class="field" style="width:90px"><label for="ca-icon">Icon</label><input id="ca-icon" value="${esc(v.icon)}" maxlength="4" style="text-align:center"></div>
        <div class="field grow"><label for="ca-name">Name</label><input id="ca-name" value="${esc(v.name)}" placeholder="e.g. My shop"></div></div>
      <div class="field"><label for="ca-url">Base address</label><input id="ca-url" value="${esc(v.baseUrl)}" placeholder="https://api.example.com/v1"></div>
      <div class="grid2">
        <div class="field"><label for="ca-auth">How the key is sent</label><select id="ca-auth">${[['bearer', 'Authorization: Bearer key'], ['header', 'In a header'], ['query', 'In the address (?key=…)'], ['none', 'No key']].map(([k, l]) => `<option value="${k}" ${v.authType === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label for="ca-authname">Header or parameter name</label><input id="ca-authname" value="${esc(v.authName)}" placeholder="X-API-Key or api_key"></div>
      </div>
      <div class="field"><label for="ca-key">Key or token</label><span class="help">${a?.hasKey ? 'A key is saved. Paste a new one to replace it.' : 'Encrypted on this PC and only sent to this address.'}</span><input id="ca-key" type="password" autocomplete="off"></div>
      <div class="field"><label for="ca-eps">Endpoints the AI may use</label><span class="help">One per line: method, path and what it does. {name} in the path becomes something the AI fills in. GET reads freely; POST, PUT, PATCH and DELETE ask you first.</span>
        <textarea id="ca-eps" rows="6" placeholder="GET /orders - List recent orders&#10;GET /orders/{id} - Get one order&#10;POST /orders/{id}/refund - Refund an order">${esc(v.endpointsText)}</textarea></div>
      <div class="field"><label for="ca-note">Notes for the AI (optional)</label><input id="ca-note" value="${esc(v.note)}" placeholder="e.g. Prices are in cents. Dates are YYYY-MM-DD."></div>
    </div>
    <div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="ca-save">Save</button></div>`, { wide: true });
  b.querySelector('#ca-save').addEventListener('click', async () => {
    const api = { id: a?.id, icon: b.querySelector('#ca-icon').value.trim() || '🔗', name: b.querySelector('#ca-name').value.trim(), baseUrl: b.querySelector('#ca-url').value.trim(), authType: b.querySelector('#ca-auth').value, authName: b.querySelector('#ca-authname').value.trim(), note: b.querySelector('#ca-note').value.trim(), endpointsText: b.querySelector('#ca-eps').value };
    if (!api.name) { toast('Give it a name.'); return; }
    try { await call('capi:save', api, b.querySelector('#ca-key').value.trim()); } catch { return; }
    closeModal(); toast(`${api.name} added. Turn on 🔌 Tools in a chat to use it.`);
    await refreshIntegrations(); render();
  });
}
