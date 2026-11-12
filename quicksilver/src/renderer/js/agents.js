// Coding agents on your own models: OpenCode (recommended: one click writes its settings) and
// OpenHands (runs in Docker; settings to type in). Opened from Code chat and Settings → Advanced.
'use strict';

async function agentsModal() {
  const b = openModal('<h2>🤖 Coding agents on your models</h2><div id="ag-body"><div class="empty">Checking this PC…</div></div><div class="modal-actions"><button class="btn" data-close>Close</button></div>', { wide: true });
  const paint = async () => {
    let st;
    try { st = await qs.call('agents:status'); } catch (err) { b.querySelector('#ag-body').innerHTML = `<div class="notice">${esc(err.message)}</div>`; return; }
    const local = st.models.filter((m) => m.id.startsWith('local:'));
    const opts = st.models.map((m) => `<option value="${esc(m.id)}">${esc(m.name)}${m.id.startsWith('api:') ? ' (cloud)' : ''}</option>`).join('');
    const small = local.length && !st.models.some((m) => /30b|32b|24b|27b|70b|coder|devstral|api:/i.test(m.id));
    b.querySelector('#ag-body').innerHTML = `
      <p class="help">A coding agent works on a whole project: it reads your files, makes the changes, runs the commands and fixes what breaks until the job is done. These two are free and open source; Quicksilver gives them the AI, so they run on your own models (private and free) or on a cloud API you have connected.</p>
      ${!st.models.length ? '<div class="notice">No model to offer yet: download one (a coding model works best) or connect a cloud API first.</div>' : ''}
      ${small ? '<div class="notice info">Agents need a strong model to follow their steps. Small models often get lost; a coding model of 24B or more (such as Qwen3 Coder 30B or Devstral) or a connected cloud API works much better.</div>' : ''}
      <div class="card" style="margin-bottom:12px"><h3 style="margin:0 0 4px">OpenCode <span class="badge b-mint">recommended</span></h3>
        <p class="small" style="margin:0 0 8px">Works in a terminal window, like Claude Code. Nothing else to install. Quicksilver adds itself to OpenCode's settings, so you only pick a model there.</p>
        <p class="small" style="margin:0 0 8px">${st.opencode ? '✓ OpenCode is installed on this PC.' : 'OpenCode is not installed yet: <a href="https://opencode.ai" title="Opens opencode.ai">get it from opencode.ai ↗</a> (one command), then come back.'}${st.configured ? ' ✓ Quicksilver is already in its settings.' : ''}</p>
        <div class="row" style="flex-wrap:wrap"><label class="small" for="ag-model">Model</label><select id="ag-model" ${st.models.length ? '' : 'disabled'}>${opts}</select>
          <button class="btn primary" id="ag-oc" ${st.models.length ? '' : 'disabled'}>${st.configured ? 'Update OpenCode\'s settings' : 'Set up OpenCode'}</button></div>
        <p class="small muted" style="margin:8px 0 0">Then open a terminal in your project folder and type <code>opencode</code>. Your models are under the "Quicksilver (this PC)" provider (<code>/models</code> in OpenCode). Quicksilver must be open while you use it. Settings file: <code>${esc(st.file)}</code></p></div>
      <div class="card"><h3 style="margin:0 0 4px">OpenHands</h3>
        <p class="small" style="margin:0 0 8px">Works more on its own, in a browser window: give it a task and it plans, codes, tests and reports back. It runs inside <b>Docker Desktop</b>, which is a separate install.</p>
        <p class="small" style="margin:0 0 8px">${st.docker ? '✓ Docker is installed.' : 'Docker is not installed: <a href="https://www.docker.com/products/docker-desktop/" title="Opens docker.com">get Docker Desktop ↗</a>.'} Then follow <a href="https://docs.all-hands.dev" title="Opens the OpenHands docs">OpenHands' install steps ↗</a>.</p>
        <label class="row small"><input type="checkbox" id="ag-docker" ${st.api.docker ? 'checked' : ''}> <span><b>Let Docker apps use Quicksilver</b> <span class="help">OpenHands runs in a container, which can't reach Quicksilver otherwise. Quicksilver then also listens on your network, always with an access key; Windows may ask to allow it through the firewall.</span></span></label>
        ${st.api.docker ? `<p class="small" style="margin:8px 0 4px">In OpenHands → Settings → LLM, turn on <b>Advanced</b> and enter:</p>
        <table class="list small"><tbody>
          <tr><td>Custom model</td><td><code>openai/${esc(st.models[0]?.id || 'local:your-model')}</code> <span class="muted">(any id from the list above, after "openai/")</span></td></tr>
          <tr><td>Base URL</td><td><code>${esc(st.dockerBase)}</code></td></tr>
          <tr><td>API key</td><td><button class="btn small" id="ag-key">Copy the access key</button></td></tr></tbody></table>` : ''}</div>
      <p class="small muted" style="margin:10px 0 0">Neither app has been run by Quicksilver's own tests; Quicksilver's side (the models and tool calls they use) is tested. They change often: if a step differs, their own pages are right.</p>`;
    b.querySelector('#ag-oc')?.addEventListener('click', async () => {
      try { const r = await call('agents:opencode', b.querySelector('#ag-model').value); toast(`OpenCode is set up with ${r.models} model${r.models === 1 ? '' : 's'}. Type "opencode" in your project folder.`, 7000); paint(); } catch (err) { toast(err.message, 7000); }
    });
    b.querySelector('#ag-docker')?.addEventListener('change', async (e) => { await call('agents:docker', e.target.checked); S.config = await call('config:get'); paint(); });
    b.querySelector('#ag-key')?.addEventListener('click', async () => { navigator.clipboard?.writeText(await call('apiserver:revealKey')); toast('Access key copied.'); });
  };
  paint();
}
document.addEventListener('click', (e) => { const x = e.target.closest('[data-agents]'); if (!x) return; e.preventDefault(); agentsModal(); });
