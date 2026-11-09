// Phone access (Settings → Phone), chats from the phone showing up here, and automatic updates.
'use strict';

// ---------- phone ----------
let phoneInfo = null;
function phoneSetHTML() {
  const i = phoneInfo;
  if (!i) return '<div class="small muted">Checking…</div>';
  return `<div class="stack-v">
    <p class="lede" style="margin:0">Chat with your PC's models from your phone, anywhere in the house. Your PC does the thinking, so answers are just as good, and nothing goes through the internet or anyone's servers.</p>
    <label class="row"><input type="checkbox" id="ph-on" ${i.enabled ? 'checked' : ''}> <span><b>Let my phone use Quicksilver</b> <span class="help">while Quicksilver is open on this PC, on the same Wi-Fi</span></span></label>
    ${i.error ? `<div class="notice" style="color:var(--danger)">${esc(i.error)}</div>` : ''}
    ${i.running && i.url ? `<div class="phone-card card">
        <div class="phone-qr" aria-label="QR code">${i.qr}</div>
        <div class="stack-v" style="gap:8px">
          <h3>Scan this with your phone's camera</h3>
          <ol class="small" style="margin:0;padding-left:18px;line-height:1.7"><li>Open the camera and point it at the code.</li><li>Tap the link that appears. Quicksilver opens in the browser.</li><li>Optional: "Add to Home Screen" to get an app icon.</li></ol>
          <div class="small muted">Or type this on the phone: <code class="sel">${esc(i.url.split('#')[0])}</code> (the code also carries a private key, so scanning is easier)</div>
          ${i.addresses.length > 1 ? `<div class="small muted">Other addresses for this PC: ${i.addresses.slice(1).map(esc).join(', ')}</div>` : ''}
          <div class="row"><button class="btn small" id="ph-new">New link (signs phones out)</button></div>
        </div></div>
      <div class="notice info small"><b>If the phone can't connect:</b> when Windows asks whether Quicksilver may use the network, choose <b>Private networks</b>. Both devices must be on the same Wi-Fi (not a guest network). Chats you have on the phone also appear in your chat list here, with a small phone mark.</div>` : ''}
  </div>`;
}
function bindPhoneSet() {
  if (!phoneInfo) qs.call('phone:info').then((i) => { phoneInfo = i; if (S.route.view === 'settings' && setTab === 'phone') render(); });
  $('#ph-on')?.addEventListener('change', async (e) => { phoneInfo = await call('phone:set', { enabled: e.target.checked }); render(); });
  $('#ph-new')?.addEventListener('click', async () => { if (await confirmBox('Make a new link? Phones using the old one will need to scan again.', { yes: 'New link', danger: false })) { phoneInfo = await call('phone:newLink'); render(); } });
}

// Chats from the phone are saved here too, so you can carry on at the PC.
qs.onApp?.((d) => {
  if (d.kind !== 'phone:chat' || !S.data) return;
  const c = d.chat;
  const id = `ph-${c.id}`;
  let chat = chatById(id);
  if (!chat) {
    chat = { id, assistantId: S.data.assistants.some((a) => a.id === c.assistantId) ? c.assistantId : 'as-general', title: c.title || 'From your phone', created: now(), updated: now(), target: '', library: null, web: null, messages: [], fromPhone: true };
    S.data.chats.push(chat);
  }
  chat.messages = c.messages.map((m) => (m.role === 'assistant'
    ? { id: uid(), role: 'assistant', alts: [{ text: m.text, target: c.target }], altIndex: 0 }
    : { id: uid(), role: 'user', text: m.text + (m.image ? '\n(photo sent from the phone)' : ''), attachments: [] }));
  chat.updated = now();
  save();
  if (S.route.view === 'chat' && S.route.id === id && !pending) render(); else renderChatList();
});

// ---------- updates ----------
let upd = null;
qs.onApp?.((d) => { if (d.kind === 'update') { upd = d.state; paintUpdatePill(); if (S.route.view === 'settings' && setTab === 'general') { const el = $('#upd-box'); if (el) { el.innerHTML = updateBoxInner(); bindUpdateBox(); } } } });

function paintUpdatePill() {
  let pill = $('#upd-pill');
  const ready = upd?.downloaded;
  if (!ready) { pill?.remove(); return; }
  if (!pill) {
    pill = document.createElement('button');
    pill.id = 'upd-pill';
    pill.className = 'upd-pill';
    $('.side-foot')?.before(pill);
    pill.addEventListener('click', installUpdate);
  }
  pill.innerHTML = `<span class="upd-dot"></span><span class="lbl">Update ready: ${esc(ready.version)}</span>`;
  pill.title = `Quicksilver ${ready.version} is downloaded. Click to restart and update.`;
}

async function installUpdate() {
  if (pending) { toast('Wait for the answer to finish, then update.'); return; }
  if (!(await confirmBox(`Restart now to update to Quicksilver ${upd.downloaded.version}? Your chats and settings are kept. It takes about a minute, then Quicksilver opens again.`, { yes: 'Restart and update', danger: false }))) return;
  save();
  toast('Updating… Quicksilver will open again by itself.', 20000);
  try { await qs.call('data:save', S.data); await qs.call('update:install'); } catch (err) { toast(err.message, 8000); }
}

function updateBoxInner() {
  const u = upd || {};
  const p = S.data.prefs;
  const status = u.checking ? '<span class="status-line">Checking…</span>'
    : u.downloaded ? `<span class="badge b-mint">Ready</span> Version ${esc(u.downloaded.version)} is downloaded. <button class="btn small primary" id="upd-install">Restart and update</button>`
    : u.progress ? `Downloading ${esc(u.available?.version || '')}: ${u.progress.total ? Math.round((u.progress.downloaded / u.progress.total) * 100) : 0}%`
    : u.available ? `<span class="badge b-lemon">New</span> Version ${esc(u.available.version)} is available. <button class="btn small primary" id="upd-get">Download</button>`
    : u.error ? `<span class="small" style="color:var(--danger)">${esc(u.error)}</span>`
    : u.checkedAt ? `You have the latest version. <span class="small muted">Checked ${ago(u.checkedAt)}.</span>` : '';
  return `<div class="row"><b>Quicksilver ${esc(u.current || '')}</b><span class="grow"></span><button class="btn small primary" id="upd-check" ${u.checking ? 'disabled' : ''}>Check for updates</button></div>
    <div class="small" style="margin-top:6px">${status}</div>
    ${u.available?.notes && !u.downloaded ? `<details class="small" style="margin-top:6px"><summary>What's new</summary><div class="md">${markdown(u.available.notes)}</div></details>` : ''}
    <label class="row" style="margin-top:10px"><input type="checkbox" id="upd-auto" ${p.autoUpdate !== false ? 'checked' : ''}> <span><b>Keep Quicksilver up to date</b> <span class="help">checks once a day and downloads new versions in the background; you choose when to restart</span></span></label>`;
}
function updateBoxHTML() { return `<div class="field"><label>⬆️ Quicksilver updates</label><div class="card upd-card" id="upd-box">${updateBoxInner()}</div></div>`; }
function bindUpdateBox() {
  if (!upd) qs.call('update:state').then((s) => { upd = s; const el = $('#upd-box'); if (el) { el.innerHTML = updateBoxInner(); bindUpdateBox(); } });
  $('#upd-check')?.addEventListener('click', async () => { if (S.config?.offline) { toast('Go online (in the sidebar) to check for updates.'); return; } upd = await call('update:check'); if (upd.available && !upd.downloaded && S.data.prefs.autoUpdate !== false) qs.call('update:download').catch(() => {}); });
  $('#upd-get')?.addEventListener('click', () => call('update:download').catch(() => {}));
  $('#upd-install')?.addEventListener('click', installUpdate);
  $('#upd-auto')?.addEventListener('change', (e) => { S.data.prefs.autoUpdate = e.target.checked; save(); });
}

// Once a day, a little after start-up: look for a new version and fetch it quietly.
async function autoUpdate() {
  try {
    upd = await qs.call('update:state');
    if (S.data.prefs.autoUpdate === false || S.config?.offline) return;
    if (Date.now() - (S.data.prefs.updateCheckedAt || 0) < 20 * 3600 * 1000 && !upd.available) return;
    S.data.prefs.updateCheckedAt = Date.now(); save();
    upd = await qs.call('update:check');
    if (upd.available && !upd.downloaded) await qs.call('update:download');
  } catch {}
}
setTimeout(() => { if (S.data) autoUpdate(); }, 45000);
