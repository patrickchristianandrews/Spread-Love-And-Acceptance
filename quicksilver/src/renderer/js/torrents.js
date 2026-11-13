// Your Crew → Downloads: the torrent downloader. Paste a magnet link or a .torrent address, or
// search the Internet Archive's free collections; files go to the folder you choose.
'use strict';

let tData = null; // { folder, seed, list }
let tResults = null; let tQuery = ''; let tKind = '';
let tTimer = null;
const fmtBytes = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(2)} GB` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : n >= 1e3 ? `${Math.round(n / 1e3)} KB` : `${n || 0} B`);

function crewTabsHTML(on) {
  return `<div class="tabs" role="tablist"><button class="tab ${on === 'crew' ? 'active' : ''}" data-crew-tab="crew">🧑‍🤝‍🧑 Crew members</button><button class="tab ${on === 'minds' ? 'active' : ''}" data-crew-tab="minds">🧠 Minds</button><button class="tab ${on === 'downloads' ? 'active' : ''}" data-crew-tab="downloads">📥 Downloads</button></div>`;
}
function bindCrewTabs() {
  $$('[data-crew-tab]').forEach((b) => b.addEventListener('click', () => go({ view: ({ downloads: 'torrents', minds: 'minds' })[b.dataset.crewTab] || 'assistants' })));
}

function torrentRowHTML(t) {
  const pct = Math.round((t.progress || 0) * 100);
  const state = t.waiting ? 'Saved: starts when you open Downloads' : t.done ? '✓ Done' : t.paused ? 'Paused' : `${fmtBytes(t.speed)}/s · ${t.peers} peer${t.peers === 1 ? '' : 's'}${t.eta ? ` · about ${fmtSec(t.eta / 1000)} left` : ''}`;
  return `<div class="card torrent-row"><div class="row"><b class="grow">${esc(t.name)}</b>
      ${t.id && !t.done ? `<button class="btn small" data-t-act="${t.paused ? 'resume' : 'pause'}" data-t-id="${t.id}">${t.paused ? '▶ Resume' : '⏸ Pause'}</button>` : ''}
      ${t.id ? `<button class="btn small" data-t-open="${esc(t.folder)}">📂 Open folder</button><button class="btn small ghost" data-t-act="remove" data-t-id="${t.id}" title="Remove from the list (files stay)">Remove</button>` : ''}</div>
    <div class="bar" style="margin:6px 0"><i style="width:${pct}%"></i></div>
    <div class="small muted">${pct}% of ${fmtBytes(t.size)} · ${esc(state)} · ${esc(t.folder || '')}</div></div>`;
}

views.torrents = {
  html() {
    if (!tData) { qs.call('torrents:list').then((d) => { tData = d; if (S.route.view === 'torrents') render(); }).catch((err) => { tData = { error: err.message, list: [] }; render(); }); }
    const d = tData || { list: [] };
    return `<div class="page">
      <div class="page-head"><h1>Your Crew</h1></div>
      ${crewTabsHTML('downloads')}
      <p class="lede">Download torrents into a folder you choose: paste a magnet link or a .torrent address, or search free, legal collections (the Internet Archive's public-domain and openly licensed films, music, books and software). Only download what you have the right to.</p>
      ${d.error ? `<div class="notice">${esc(d.error)}</div>` : ''}
      <div class="card"><div class="row" style="flex-wrap:wrap;gap:8px"><input id="t-add" class="grow" placeholder="magnet:?xt=urn:btih:…  or  https://…/file.torrent"><button class="btn" id="t-file">Pick a .torrent file</button><button class="btn primary" id="t-go">📥 Download</button></div>
        <div class="row small" style="margin-top:8px;gap:8px;flex-wrap:wrap"><span>Save to: <b>${esc(d.folder || '…')}</b></span><button class="btn small" id="t-folder">Change folder</button>
        <label class="row small"><input type="checkbox" id="t-seed" ${d.seed ? 'checked' : ''}> Keep sharing after a download finishes</label></div></div>
      <div class="section"><h2>🔎 Search free collections</h2></div>
      <div class="row" style="gap:8px;flex-wrap:wrap"><input id="t-q" class="grow" placeholder="e.g. Night of the Living Dead, Beethoven symphonies, Ubuntu" value="${esc(tQuery)}">
        <select id="t-kind">${[['', 'Everything'], ['movies', 'Films & video'], ['audio', 'Music & audio'], ['texts', 'Books'], ['software', 'Software']].map(([v, l]) => `<option value="${v}" ${tKind === v ? 'selected' : ''}>${l}</option>`).join('')}</select><button class="btn" id="t-search">Search</button></div>
      <div id="t-results">${tResults ? (tResults.error ? `<div class="notice">${esc(tResults.error)}</div>` : tResults.length ? `<table class="list"><thead><tr><th>Title</th><th>Kind</th><th>Size</th><th>License</th><th></th></tr></thead><tbody>${tResults.map((r, i) => `<tr><td><b>${esc(r.title)}</b>${r.year ? ` <span class="muted small">${esc(String(r.year))}</span>` : ''}<div class="small"><a href="${esc(r.page)}">${esc(r.source)} page</a></div></td><td>${esc(r.kind)}</td><td>${r.size ? fmtBytes(r.size) : '—'}</td><td class="small">${esc(r.license)}</td><td><button class="btn small primary" data-t-get="${i}">📥 Download</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty small">Nothing found.</div>') : ''}</div>
      <div class="section"><h2>Downloads · ${d.list.length}</h2></div>
      <div id="t-list">${d.list.length ? d.list.map(torrentRowHTML).join('') : '<div class="empty small">No downloads yet.</div>'}</div>
    </div>`;
  },
  bind() {
    bindCrewTabs();
    const refresh = async () => { try { tData = await qs.call('torrents:list'); } catch {} const el = document.getElementById('t-list'); if (el && tData) el.innerHTML = tData.list.length ? tData.list.map(torrentRowHTML).join('') : '<div class="empty small">No downloads yet.</div>'; bindRows(); };
    const bindRows = () => {
      $$('[data-t-act]').forEach((b) => { b.onclick = async () => { await call('torrents:act', b.dataset.tId, b.dataset.tAct).catch(() => {}); refresh(); }; });
      $$('[data-t-open]').forEach((b) => { b.onclick = () => qs.call('shell:openPath', b.dataset.tOpen).catch(() => {}); });
    };
    bindRows();
    clearInterval(tTimer); tTimer = setInterval(() => { if (S.route.view !== 'torrents') { clearInterval(tTimer); return; } refresh(); }, 2000);
    const add = async (src) => { try { await call('torrents:add', src); toast('📥 Download started.'); $('#t-add').value = ''; refresh(); } catch {} };
    $('#t-go').addEventListener('click', () => { const v = $('#t-add').value.trim(); if (v) add(v); });
    $('#t-file').addEventListener('click', async () => { const f = await qs.call('torrents:pickFile').catch(() => null); if (f) add(f); });
    $('#t-folder').addEventListener('click', async () => { const f = await qs.call('torrents:pickFolder').catch(() => null); if (f) { tData = await qs.call('torrents:list'); render(); toast(`Downloads go to ${f}.`); } });
    $('#t-seed').addEventListener('change', (e) => qs.call('torrents:seed', e.target.checked));
    const search = async () => { tQuery = $('#t-q').value.trim(); tKind = $('#t-kind').value; if (!tQuery) return; tResults = null; $('#t-results').innerHTML = '<span class="status-line">Searching…</span>'; try { tResults = await qs.call('torrents:search', tQuery, tKind); } catch (err) { tResults = { error: err.message }; } render(); };
    $('#t-search').addEventListener('click', search);
    $('#t-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') search(); });
    $$('[data-t-get]').forEach((b) => b.addEventListener('click', () => { const r = tResults[Number(b.dataset.tGet)]; if (r) add(r.torrent); }));
  },
};
