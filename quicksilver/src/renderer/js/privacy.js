// Privacy modes, shown as pictures: fully private (offline), private online through Proton VPN,
// or plain online, plus what changes when you add a cloud AI (API). The AI models always run on
// this PC; the modes only decide what may reach the internet, and how.
'use strict';

S.vpn = null; // { installed, connected, proton, adapter, required }

const privacyMode = () => (S.config?.offline ? 'offline' : S.config?.vpnOnly ? 'vpn' : 'online');
const hasCloudAI = () => (S.providers || []).some((p) => p.hasKey || p.noKey);

async function refreshVpn() {
  try { S.vpn = await qs.call('vpn:status'); } catch { S.vpn = null; }
  paintNet();
  return S.vpn;
}

async function setPrivacyMode(mode) {
  S.config = await call('config:set', { offline: mode === 'offline', vpnOnly: mode === 'vpn' });
  await refreshVpn();
  const msg = { offline: '🔒 Fully private: nothing leaves this PC.', vpn: S.vpn?.connected ? '🛡 Private online: web search and downloads go through your VPN.' : '🛡 Private online is on. Connect Proton VPN to use the internet; until then nothing leaves this PC.', online: '🌐 Online: web search, downloads and cloud AIs are available.' }[mode];
  toast(msg, 6000);
}

// One picture: this PC on the left, the internet on the right, and what sits between.
function privacyFlowHTML(mode, cloud = hasCloudAI()) {
  const vpnOn = S.vpn?.connected;
  const pc = '<div class="pv-node pv-pc"><b>💻 Your PC</b><span>AI models, chats, files, memory</span><span class="pv-tag">always private</span></div>';
  const net = (dim) => `<div class="pv-node pv-net ${dim ? 'dim' : ''}"><b>🌐 Internet</b><span>web search, downloads, model updates</span></div>`;
  const cloudNode = (dim) => `<div class="pv-node pv-cloud ${dim ? 'dim' : ''}"><b>☁️ Cloud AI (API)</b><span>${cloud ? 'only when a chat uses it' : 'none added'}</span></div>`;
  if (mode === 'offline') {
    return `<div class="pv-flow">${pc}<div class="pv-link cut"><i></i><span>✕ nothing leaves</span></div><div class="pv-right">${net(true)}${cloudNode(true)}</div></div>`;
  }
  if (mode === 'vpn') {
    return `<div class="pv-flow">${pc}<div class="pv-link ${vpnOn ? 'tunnel' : 'cut'}"><i></i><span>${vpnOn ? '🛡 Proton VPN tunnel' : '✕ waiting for VPN'}</span></div>
      <div class="pv-right">${net(!vpnOn)}${cloudNode(!vpnOn || !cloud)}</div></div>`;
  }
  return `<div class="pv-flow">${pc}<div class="pv-link open"><i></i><span>direct connection</span></div><div class="pv-right">${net(false)}${cloudNode(!cloud)}</div></div>`;
}

const PRIVACY_MODES = [
  ['offline', '🔒', 'Fully private (offline)', 'Nothing leaves this PC. Chats, files and voice stay here; the AI runs on this PC. No web search, cloud AI or downloads.', ['Your chats and files: private', 'Websites: can\'t see you', 'Web search & cloud AI: off']],
  ['vpn', '🛡', 'Private online (Proton VPN)', 'Use the web while staying private: web search, downloads and updates go only through your VPN, so websites and your internet provider can\'t see what you look up or where you are. If the VPN drops, Quicksilver stops connecting instead of going online without it.', ['Your chats and files: private', 'Websites: see the VPN, not you', 'Cloud AI: sees the message you send it, not who you are']],
  ['online', '🌐', 'Online', 'Web search, downloads and cloud AIs work over your normal connection. Your chats still stay on this PC unless a chat uses a cloud AI.', ['Your chats and files: private', 'Websites: see your connection', 'Cloud AI: sees the message you send it']],
];

function vpnStatusHTML() {
  const v = S.vpn;
  if (!v) return '<span class="small muted">Checking for a VPN…</span>';
  const state = v.connected ? `<span class="badge b-mint">● ${v.proton ? 'Proton VPN' : 'A VPN'} is connected</span>` : '<span class="badge b-pink">○ No VPN connected</span>';
  const btn = v.installed ? `<button class="btn small primary" id="vpn-open">${v.connected ? 'Open Proton VPN' : 'Connect Proton VPN'}</button>` : '';
  return `${state} ${btn} <button class="btn small ghost" id="vpn-recheck">Check again</button>`;
}

// Proton VPN's free plan, or your own Proton account for more.
function protonPlansHTML() {
  const inst = S.vpn?.installed;
  return `<div class="pv-plans">
    <div class="pv-plan"><div class="row"><b class="grow">🆓 Proton VPN Free</b><span class="badge b-mint">Free</span></div>
      <span class="small">Free with no time limit: no ads, no data cap, and Proton keeps no logs of what you do. Proton picks a fast server for you. Enough to use Quicksilver's web search privately.</span>
      <button class="btn small ${inst ? '' : 'primary'}" data-vpn-go="free">${inst ? 'Proton VPN is installed: connect for free' : 'Get Proton VPN Free'}</button></div>
    <div class="pv-plan"><div class="row"><b class="grow">🔑 Your Proton account</b><span class="badge b-lav">More options</span></div>
      <span class="small">Have Proton VPN Plus or Proton Unlimited? Sign in to the Proton VPN app with your account for more: pick any country, faster servers, Secure Core and more devices.</span>
      <button class="btn small" data-vpn-go="signin">${inst ? 'Sign in to Proton VPN' : 'Sign in to my Proton account'}</button></div>
  </div>
  <p class="help" style="margin:6px 0 0">You sign in inside Proton's own app or website. Quicksilver never sees your Proton password; it only checks whether the VPN is connected.</p>`;
}

function vpnCardHTML() {
  const mode = privacyMode();
  return `<div class="card set-card pv-card" style="margin-top:16px"><h3>🛡 Privacy &amp; private network</h3>
    <p class="help" style="margin-top:0">The AI always runs on this PC. Choose what may reach the internet, and how:</p>
    <div class="pv-modes">${PRIVACY_MODES.map(([k, ic, name, what, facts]) => `<button class="pv-mode ${mode === k ? 'on' : ''}" data-pv-mode="${k}" aria-pressed="${mode === k}">
      <span class="pv-mode-h"><span class="pv-ic">${ic}</span><b>${esc(name)}</b>${mode === k ? '<span class="badge b-mint">On</span>' : ''}</span>
      <span class="small">${esc(what)}</span>
      <span class="pv-facts">${facts.map((f) => `<span>✓ ${esc(f)}</span>`).join('')}</span></button>`).join('')}</div>
    <div class="pv-pic"><div class="small muted" style="margin-bottom:6px">How it works now (${esc(PRIVACY_MODES.find((m) => m[0] === mode)[2])}):</div>${privacyFlowHTML(mode)}</div>
    <div class="row pv-status" id="vpn-status">${vpnStatusHTML()}</div>
    ${S.vpn?.connected ? '' : protonPlansHTML()}
    <p class="help" style="margin-bottom:0"><b>Cloud AI (API) options:</b> adding a cloud AI (Settings → Accounts, or ＋ Cloud AI in a chat) sends the messages of chats that use it to that company; nothing else is shared. With Private online, it goes through the VPN, so the company sees the message but not your location or connection. For the most private work, use Fully private: every answer comes from the models on this PC.</p>
  </div>`;
}

function bindVpnCard() {
  const repaint = () => { const box = $('#vpn-box'); if (box) { box.innerHTML = vpnCardHTML(); bindVpnCard(); } };
  $$('[data-pv-mode]').forEach((b) => b.addEventListener('click', async () => { await setPrivacyMode(b.dataset.pvMode); await refreshModels().catch(() => {}); repaint(); render(); }));
  $('#vpn-open')?.addEventListener('click', async () => { const r = await call('vpn:open').catch(() => ''); toast(r === 'download' ? 'Opening the Proton VPN download page in your browser.' : 'Opening Proton VPN. Press Connect there; Quicksilver notices within a few seconds.', 6000); });
  $$('[data-vpn-go]').forEach((b) => b.addEventListener('click', async () => {
    const r = await call('vpn:go', b.dataset.vpnGo).catch(() => '');
    toast(r === 'app' ? 'Opening Proton VPN. Sign in (or use it free) and press Connect; Quicksilver notices within a few seconds.' : 'Opening Proton VPN in your browser.', 7000);
  }));
  $('#vpn-recheck')?.addEventListener('click', async () => { await refreshVpn(); repaint(); });
  if (!S.vpn) refreshVpn().then(repaint);
}

// How private this chat's session is right now, in plain words, for the chat header.
function usesCloud(target) {
  if (!target) return '';
  const list = target.startsWith('stack:') ? membersOf(target) : [target];
  const st = target.startsWith('stack:') && S.stacks.find((x) => `stack:${x.id}` === target);
  const all = [...list, st?.members?.cloudHard, st?.members?.cloudCheck].filter(Boolean);
  const api = all.find((t) => t.startsWith('api:'));
  return api ? targetLabel(api) : '';
}
function sessionPrivacy(target) {
  const mode = privacyMode();
  const cloud = usesCloud(target);
  if (mode === 'offline') return { kind: 'safe', icon: '🔒', label: 'Private session', tip: 'Offline: nothing leaves this PC. Every answer comes from the AI on this PC.' };
  if (mode === 'vpn') {
    if (!S.vpn?.connected) return { kind: 'safe', icon: '🔒', label: 'Private session · VPN paused', tip: 'Private online is on but no VPN is connected, so nothing leaves this PC until it reconnects.' };
    return cloud
      ? { kind: 'safe', icon: '🛡', label: 'Protected session · cloud AI via VPN', tip: `Messages in this chat go to ${cloud} through your VPN: it sees what you send, but not who you are or where you are. Your other chats and files stay on this PC.` }
      : { kind: 'safe', icon: '🛡', label: 'Protected session', tip: 'Answers come from this PC; web searches and downloads go through your VPN, so websites can\'t trace them to you.' };
  }
  return cloud
    ? { kind: 'warn', icon: '☁️', label: `Cloud AI: ${cloud}`, tip: `Messages in this chat are sent to ${cloud} over your normal connection. For a protected session, use Private online (Proton VPN) or Fully private in Settings.` }
    : { kind: 'ok', icon: '🏠', label: 'Runs on this PC', tip: 'Answers come from the AI on this PC. Web searches use your normal connection; turn on Private online (Proton VPN) to protect them, or go offline for a fully private session.' };
}
function sessionBadgeHTML(target) {
  const p = sessionPrivacy(target);
  return `<button class="sess-badge sess-${p.kind}" id="sess-badge" title="${esc(p.tip)} Click for privacy modes.">${p.icon} ${esc(p.label)}</button>`;
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('#sess-badge')) return;
  setTab = 'general'; go({ view: 'settings' });
  setTimeout(() => document.getElementById('vpn-box')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
});

// Watch the VPN while Private online is on, so the sidebar and pages stay right.
let vpnSeen = null;
setInterval(async () => {
  if (!S.config?.vpnOnly && !(S.route?.view === 'settings')) return;
  const v = await refreshVpn();
  const now = Boolean(v?.connected);
  if (vpnSeen !== null && now !== vpnSeen && S.config?.vpnOnly) toast(now ? '🛡 VPN connected: Quicksilver can use the web privately.' : '🛡 VPN disconnected: Quicksilver stopped connecting until it\'s back.', 6000);
  if (vpnSeen !== null && now !== vpnSeen && S.route?.view === 'chat') { const b = $('#sess-badge'); const c = chatById(S.route.id); if (b && c) b.outerHTML = sessionBadgeHTML(resolveTarget(c, assistantById(c.assistantId))); }
  vpnSeen = now;
  const box = $('#vpn-box');
  if (box && !box.contains(document.activeElement)) { box.innerHTML = vpnCardHTML(); bindVpnCard(); }
}, 5000);
