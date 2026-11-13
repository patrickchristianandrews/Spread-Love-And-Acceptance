// One log line per AI request: which service answered, which key was used (a fingerprint, never
// the key), what was sent, and where the time went. Kept in memory for Settings → Connections and
// the timing table, and printed to the console.
'use strict';
const crypto = require('node:crypto');

// "sk-abc…wxyz len=51 sha=1a2b3c4d" — enough to tell keys apart, never enough to use one.
function fingerprint(key) {
  const k = String(key || '');
  if (!k) return 'none';
  return `${k.slice(0, 6)}…${k.slice(-4)} len=${k.length} sha=${crypto.createHash('sha256').update(k).digest('hex').slice(0, 8)}`;
}
// Keys pasted with a stray newline, spaces or quotes around them.
function cleanKey(key) {
  return String(key ?? '').trim().replace(/^(['"`])(.*)\1$/s, '$2').trim();
}

const recent = [];
function log(entry) {
  const e = { at: new Date().toISOString(), ...entry };
  recent.push(e); if (recent.length > 200) recent.shift();
  const t = e.timing || {};
  const parts = [`provider=${e.provider}`, e.model && `model=${e.model}`, `key=${e.key || 'none'}`, e.url && `${e.method || 'POST'} ${e.url}`,
    e.sent && `sent=${JSON.stringify(e.sent)}`, e.status && `status=${e.status}`,
    t.ttfbMs != null && `ttfb=${t.ttfbMs}ms`, t.totalMs != null && `total=${t.totalMs}ms`,
    t.loadMs != null && `load=${t.loadMs}ms`, t.promptMs != null && `prompt_eval=${t.promptMs}ms`, t.evalMs != null && `eval=${t.evalMs}ms`,
    e.warning && `WARNING: ${e.warning}`].filter(Boolean);
  (e.warning ? console.warn : console.log)(`[ai request] ${parts.join(' ')}`);
  return e;
}
module.exports = { fingerprint, cleanKey, log, recent };
