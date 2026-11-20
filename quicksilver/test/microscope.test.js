'use strict';
// Unit test for the Microscope's divergence logic (pure).
const fs = require('node:fs'); const vm = require('node:vm'); const assert = require('node:assert');
const code = fs.readFileSync(require('node:path').join(__dirname, '../src/renderer/js/microscope.js'), 'utf8');
const ctx = { views: {}, window: {}, console }; vm.createContext(ctx); vm.runInContext(code, ctx);
const T = (arr) => arr.map((token) => ({ token }));

let d = ctx.microDiff(T(['The', ' Moon', ' is']), T(['The', ' Moon', ' is']));
assert.deepEqual([d.same, d.divergeAt, d.identical], [3, -1, true], 'identical streams');

d = ctx.microDiff(T(['The', ' Moon', ' is', ' big']), T(['The', ' Moon', ' was', ' small']));
assert.deepEqual([d.same, d.divergeAt, d.identical], [2, 2, false], 'diverge at index 2');

d = ctx.microDiff(T(['a', 'b']), T(['a', 'b', 'c']));
assert.deepEqual([d.same, d.divergeAt, d.aLen, d.bLen, d.identical], [2, 2, 2, 3, false], 'one is a prefix of the other');

d = ctx.microDiff(T(['x']), T(['y']));
assert.deepEqual([d.same, d.divergeAt], [0, 0], 'diverge at the very first token');

d = ctx.microDiff(T([]), T([]));
assert.deepEqual([d.same, d.divergeAt, d.identical], [0, -1, true], 'two empty streams are identical');

console.log('✓ microDiff: finds the first divergence token, handles identical and prefix cases');
console.log('MICROSCOPE TESTS PASSED');
