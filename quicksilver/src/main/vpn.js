// Private network (VPN): Proton VPN, or any VPN. Proton VPN doesn't let other apps switch it on, so
// Quicksilver works alongside its app: it sees whether Proton VPN is installed and connected, opens
// it for you, and (when you ask) lets nothing leave this PC unless a VPN is on. Models on this PC
// keep working either way. The check reads this PC's network adapters; nothing is sent anywhere.
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const store = require('./store');

const PROTON = /proton/i;
// WireGuard, OpenVPN (TAP/TUN) and other common VPN adapters.
const VPN_IF = /proton|wireguard|\bwg\d*\b|^wg|tap|tun\d*|utun|ppp|vpn|nordlynx|mullvad|openvpn|ipsec/i;

function appPath() {
  if (process.platform !== 'win32') return null;
  const pf = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs')].filter(Boolean);
  const names = [['Proton', 'VPN', 'ProtonVPN.Launcher.exe'], ['Proton', 'VPN', 'ProtonVPN.exe'], ['Proton Technologies', 'ProtonVPN', 'ProtonVPN.exe'], ['ProtonVPN', 'ProtonVPN.exe']];
  for (const base of pf) for (const n of names) { const p = path.join(base, ...n); if (fs.existsSync(p)) return p; }
  return null;
}

let cache = { at: 0, v: null };
function adapters() {
  if (Date.now() - cache.at < 3000 && cache.v) return cache.v;
  const list = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    const up = (addrs || []).some((a) => !a.internal && a.family === 'IPv4' && a.address && !a.address.startsWith('169.254.'));
    if (up && VPN_IF.test(name) && !/loopback|vethernet|virtualbox|vmware|docker|hyper-v/i.test(name)) list.push(name);
  }
  cache = { at: Date.now(), v: list };
  return list;
}

function status() {
  const on = adapters();
  const proton = on.find((n) => PROTON.test(n));
  return {
    installed: Boolean(appPath()),
    connected: on.length > 0,
    proton: Boolean(proton),
    adapter: proton || on[0] || '',
    required: Boolean(store.config().vpnOnly),
  };
}

// While "only go online through a VPN" is on and no VPN is connected, connections are blocked.
const blocked = () => Boolean(store.config().vpnOnly) && adapters().length === 0;

function open() {
  const p = appPath();
  const { shell } = require('electron');
  if (p) return shell.openPath(p).then(() => 'opened');
  return shell.openExternal('https://protonvpn.com/download').then(() => 'download');
}

// The free plan or your own account: the Proton VPN app when it's installed (you sign in there),
// otherwise Proton's own pages in your browser.
function go(kind) {
  const { shell } = require('electron');
  const p = appPath();
  if (p) return shell.openPath(p).then(() => 'app');
  const url = kind === 'signin' ? 'https://account.protonvpn.com/login' : 'https://protonvpn.com/free-vpn';
  return shell.openExternal(url).then(() => 'web');
}

module.exports = { status, blocked, open, go, VPN_IF };
