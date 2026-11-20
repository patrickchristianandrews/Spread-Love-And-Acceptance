'use strict';
// Unit test for the Usage dashboard's aggregation (pure given chats + an eta function).
const fs = require('node:fs'); const vm = require('node:vm'); const assert = require('node:assert');
const code = fs.readFileSync(require('node:path').join(__dirname, '../src/renderer/js/usage.js'), 'utf8');
const ctx = { views: {}, console, Date }; vm.createContext(ctx); vm.runInContext(code, ctx);

const now = Date.now();
const chats = [{ messages: [
  { role: 'assistant', t: now, alts: [{ target: 'local:m1', text: 'a local answer here', ms: 2000, rating: 'up' }] },
  { role: 'assistant', t: now, alts: [{ target: 'api:openai', text: 'a cloud answer', ms: 1000, toolCalls: [{ name: 'web_search' }] }] },
  { role: 'assistant', t: now, alts: [{ target: 'stack:x', text: 'a team answer with more words in it', ms: 3000 }] },
  { role: 'assistant', t: now, alts: [{ target: 'local:m1', text: 'cached', ms: 0, cached: true }] },
  { role: 'user', alts: [] },
] }];
const eta = (t) => (t === 'local:m1' ? 1.5 : null);
const s = ctx.usageStats(chats, eta);

assert.equal(s.answers, 4, 'four assistant answers (cached counts, user turn ignored)');
assert.equal(s.byKind.local.n, 2);
assert.equal(s.byKind.cloud.n, 1);
assert.equal(s.byKind.stack.n, 1);
assert.equal(s.internetAnswers, 1, 'one answer used the web');
assert.equal(s.internetCalls, 1);
assert.equal(s.privateAnswers, 3, 'both local + the team answer had no internet; cloud excluded');
assert.equal(s.up, 1);
assert.equal(s.totalMs, 6000);
assert.equal(s.eta.n, 1, 'only the timed local:m1 answer (ms>0) had an eta; the cached ms:0 one is skipped');
console.log('USAGE TESTS PASSED');
