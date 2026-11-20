// Parse an "Open in Quicksilver" deep link. Only two shapes are accepted, both owner/name:
//   quicksilver://model/<owner>/<repo>  → add that Hugging Face model
//   quicksilver://space/<owner>/<repo>  → open that Space's run panel
//   quicksilver://open                  → just focus the app
// Anything else returns null, so a crafted link can't drive the app anywhere unexpected.
'use strict';
function parseDeepLink(url) {
  try {
    const u = new URL(String(url || ''));
    if (u.protocol !== 'quicksilver:') return null;
    const kind = u.host || '';
    const id = decodeURIComponent((u.pathname || '').replace(/^\/+/, '')).replace(/\/+$/, '');
    if ((kind === 'model' || kind === 'space') && /^[\w.-]+\/[\w.-]+$/.test(id)) return { kind, id };
    if (kind === 'open') return { kind: 'open', id: '' };
    return null;
  } catch { return null; }
}
module.exports = { parseDeepLink };
