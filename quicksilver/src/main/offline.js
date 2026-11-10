// Offline mode: one switch that stops every connection leaving this PC (web search, cloud AIs,
// live research sources, downloads, connected apps). Models on this PC, and apps running on it
// (like LM Studio or Ollama), keep working. Every network call in the app goes through fetch,
// so guarding fetch here covers all of them. Required before anything else that uses the network.
const store = require('./store');

const LOCAL = /^(localhost|127(\.\d{1,3}){3}|\[?::1\]?|0\.0\.0\.0)$/i;
const isOffline = () => Boolean(store.config().offline);

function hostOf(input) {
  try { return new URL(typeof input === 'string' ? input : input?.url || String(input)).hostname; } catch { return ''; }
}

const realFetch = globalThis.fetch;
globalThis.fetch = function guardedFetch(input, init) {
  if (isOffline() && !LOCAL.test(hostOf(input))) {
    return Promise.reject(new Error('Quicksilver is offline. Switch to Online (bottom of the sidebar) to use the internet.'));
  }
  // Private network: "only go online through a VPN" is on and no VPN is connected.
  if (!LOCAL.test(hostOf(input)) && require('./vpn').blocked()) {
    return Promise.reject(new Error('Private network is on, but no VPN is connected. Connect Proton VPN (Settings → Private network), or turn the setting off.'));
  }
  return realFetch(input, init);
};

module.exports = { isOffline, isLocal: (url) => LOCAL.test(hostOf(url)) };
