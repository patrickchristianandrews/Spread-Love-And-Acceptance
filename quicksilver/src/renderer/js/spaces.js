// Hugging Face Spaces, inside Quicksilver. Browse Spaces (by likes, trending or recent), then run a
// Gradio one right here — give a prompt (and an image if it wants one), and the picture or video it
// makes lands in your gallery. Nothing leaves the app except the call to the Space itself. Spaces
// that aren't Gradio (Streamlit, Docker, static) can't be driven automatically yet; we say so.
'use strict';

const spacesState = { q: '', sort: 'likes', list: null, loading: false, error: '', activeRun: null };
// One status listener for the whole session (the preload bridge has no unsubscribe).
qs.onSpace?.((d) => { if (spacesState.activeRun && d.id === spacesState.activeRun) { const el = document.getElementById('sp-status'); if (el) el.textContent = d.text; } });

async function loadSpaces() {
  spacesState.loading = true; spacesState.error = '';
  try { spacesState.list = await qs.call('hf:spaces', { query: spacesState.q, sort: spacesState.sort, limit: 48 }); }
  catch (e) { spacesState.error = e.message || String(e); spacesState.list = []; }
  spacesState.loading = false;
  if (S.route.view === 'spaces') render();
}

function spaceCard(s) {
  return `<div class="card space-card" style="padding:12px">
    <div class="row" style="align-items:flex-start;gap:8px">
      <span style="font-size:22px">${esc(s.emoji || '🤗')}</span>
      <div class="grow"><b>${esc(s.title || s.id)}</b><div class="small muted">${esc(s.id)}</div></div>
      <span class="badge b-lav" title="❤ likes on Hugging Face">❤ ${s.likes}</span></div>
    <div class="row" style="gap:6px;margin-top:10px;align-items:center">
      ${s.runnable ? `<button class="btn small primary" data-space-run="${esc(s.id)}">▶ Run here</button>` : `<span class="badge b-peach" title="Only Gradio Spaces can be driven automatically for now">${esc(s.sdk || 'other')} — can’t run here yet</span>`}
      <a class="btn small ghost" href="https://huggingface.co/spaces/${esc(s.id)}">Open on HF ↗</a></div>
  </div>`;
}

views.spaces = {
  html() {
    const list = spacesState.list;
    return `<div class="page">
      <div class="page-head"><h1>Spaces <span class="small muted">run Hugging Face apps here</span></h1></div>
      <p class="muted" style="margin:0 0 12px">Thousands of free AI apps (image makers, video, audio, tools) that people host on Hugging Face. Find one and run it right inside Quicksilver — what it makes goes to your gallery. Works with Gradio Spaces; a few need a free Hugging Face token or wait in a GPU queue.</p>
      <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <input id="sp-q" class="grow" style="min-width:200px" placeholder="Search Spaces — e.g. flux, qwen image, wan video, tts" value="${esc(spacesState.q)}">
        <select id="sp-sort">${[['likes', 'Most liked'], ['trending', 'Trending'], ['modified', 'Recently updated']].map(([k, l]) => `<option value="${k}" ${spacesState.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <button class="btn primary" id="sp-search">Search</button></div>
      ${spacesState.error ? `<div class="notice" style="border-color:#e0416a;background:rgba(224,65,106,.1)"><b>⚠</b> ${esc(spacesState.error)}</div>` : ''}
      ${spacesState.loading ? '<p class="small muted">Loading Spaces…</p>' : ''}
      ${list && !spacesState.loading ? (list.length ? `<div class="cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">${list.map(spaceCard).join('')}</div>` : '<p class="small muted">No Spaces matched. Try another word.</p>') : ''}
    </div>`;
  },
  bind() {
    if (!spacesState.list && !spacesState.loading) loadSpaces();
    const q = document.querySelector('#sp-q'); if (q) q.addEventListener('input', () => { spacesState.q = q.value; });
    const sort = document.querySelector('#sp-sort'); if (sort) sort.addEventListener('change', () => { spacesState.sort = sort.value; loadSpaces(); });
    const go = () => loadSpaces();
    document.querySelector('#sp-search')?.addEventListener('click', go);
    q?.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    document.querySelectorAll('[data-space-run]').forEach((b) => b.addEventListener('click', () => runSpaceModal(b.dataset.spaceRun)));
  },
};

// The run panel: prompt, optional image, optional token; shows progress and the result.
function runSpaceModal(id) {
  let imageDataUrl = '';
  spacesState.activeRun = id;
  const b = openModal(`<h2>▶ Run ${esc(id)}</h2>
    <p class="small muted" style="margin:0 0 10px">Runs on Hugging Face's computers. The result is saved to your gallery. Some Spaces need a free <a href="https://huggingface.co/settings/tokens">Hugging Face token</a> or sit in a GPU queue for a minute.</p>
    <div class="stack-v">
      <div class="field"><label for="sp-prompt">Prompt</label><textarea id="sp-prompt" rows="3" placeholder="What to make, e.g. a neon city at night"></textarea></div>
      <div class="field"><label>Image (only if the Space edits or animates one)</label><div class="row" style="gap:8px"><button type="button" class="btn small" id="sp-img-pick">Choose image…</button><span class="small muted" id="sp-img-name">none</span></div></div>
      <div class="field"><label for="sp-want">Expecting</label><select id="sp-want"><option value="image">A picture</option><option value="video">A video</option></select></div>
      <details><summary class="small">Advanced: Hugging Face token (optional)</summary><input id="sp-token" type="password" autocomplete="off" placeholder="hf_… (saved on this PC)" style="margin-top:6px;width:100%"></details>
    </div>
    <div id="sp-status" class="small muted" style="margin:10px 0;min-height:18px"></div>
    <div id="sp-result"></div>
    <div class="modal-actions"><button class="btn" data-close>Close</button><button class="btn primary" id="sp-run">Run</button></div>`, { wide: true });
  b.querySelector('#sp-img-pick').addEventListener('click', () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => { const file = inp.files?.[0]; if (!file) return; try { imageDataUrl = await readDataUrl(file); b.querySelector('#sp-img-name').textContent = file.name; } catch { toast('Could not read that image.'); } };
    inp.click();
  });
  b.querySelector('#sp-run').addEventListener('click', async () => {
    const runBtn = b.querySelector('#sp-run'); runBtn.disabled = true;
    const status = b.querySelector('#sp-status'); status.textContent = 'Starting…';
    b.querySelector('#sp-result').innerHTML = '';
    const token = b.querySelector('#sp-token')?.value?.trim() || '';
    if (token) { try { await call('secret:set', 'hf:token', token); } catch {} }
    try {
      const r = await qs.call('hfspace:run', id, { prompt: b.querySelector('#sp-prompt').value, imageDataUrl, want: b.querySelector('#sp-want').value, token });
      status.textContent = `Done — ${r.saved.length} result${r.saved.length === 1 ? '' : 's'} saved to your gallery.`;
      b.querySelector('#sp-result').innerHTML = r.saved.map((m) => m.kind === 'video'
        ? `<video src="${esc(m.url)}" controls style="max-width:100%;border-radius:10px;margin:6px 0"></video>`
        : `<img src="${esc(m.url)}" style="max-width:100%;border-radius:10px;margin:6px 0">`).join('') || '<p class="small muted">Ran, but nothing could be shown.</p>';
      refreshGallery?.();
    } catch (e) {
      status.innerHTML = `<span style="color:#e0416a">⚠ ${esc(e.message || String(e))}</span>`;
    } finally { runBtn.disabled = false; }
  });
}