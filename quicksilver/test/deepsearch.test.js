'use strict';
// Deep research builds several complementary web queries from one question, de-duplicated.
const fs = require('node:fs'); const vm = require('node:vm'); const assert = require('node:assert');
const code = fs.readFileSync(require('node:path').join(__dirname, '../src/renderer/js/chat.js'), 'utf8');
const a = code.indexOf('function deepQueries'); const b = code.indexOf('async function gatherSources', a);
assert.ok(a >= 0 && b > a, 'found deepQueries');
const ctx = { Date, console }; vm.createContext(ctx);
vm.runInContext(`${code.slice(a, b)}\n;globalThis.deepQueries = deepQueries;`, ctx);
const dq = ctx.deepQueries;

const qs = dq('best electric cars for families');
assert.ok(qs.length >= 4 && qs.length <= 6, `several queries (${qs.length})`);
assert.equal(qs[0], 'best electric cars for families', 'the first query is the question itself');
assert.ok(qs.some((q) => /\b20\d\d\b/.test(q)), 'one query adds the current year for recency');
assert.ok(qs.some((q) => /comparison|review|analysis/.test(q)), 'one query seeks comparisons/reviews');
assert.ok(qs.some((q) => /criticism|problems|limitations/.test(q)), 'one query seeks the downsides');
assert.equal(new Set(qs).size, qs.length, 'queries are de-duplicated');
assert.deepEqual(dq('  '), [], 'an empty question yields no queries');
assert.equal(dq('What is RAG?')[0], 'What is RAG', 'a trailing question mark is trimmed from the base');

console.log('✓ deepQueries: several complementary, de-duplicated searches from one question');
console.log('DEEPSEARCH TESTS PASSED');
