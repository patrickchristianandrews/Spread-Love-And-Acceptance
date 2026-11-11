// Models stay loaded longer and start with room to grow, so chats you already used stay quick.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
process.env.QUICKSILVER_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-load-'));
const store = require('../src/main/store');
const llama = require('../src/main/llama');

assert.equal(llama.roomyContext(4096, 32768, 10), 32768, 'plenty of memory: starts at 32K');
assert.equal(llama.roomyContext(4096, 32768, 5), 16384, 'some memory: starts at 16K');
assert.equal(llama.roomyContext(4096, 32768, 1), 4096, 'tight memory: smallest size that fits');
assert.equal(llama.roomyContext(4096, 8192, 10), 8192, 'never above the Conversation memory setting');
assert.equal(llama.roomyContext(65536, 32768, 10), 65536, 'a long chat still gets what it needs');
store.saveConfig({ keepLoaded: 0 });
assert.equal(llama.idleMs(), Infinity, 'until Quicksilver closes');
store.saveConfig({ keepLoaded: 240 });
assert.equal(llama.idleMs(), 240 * 60 * 1000, '4 hours');
store.saveConfig({ keepLoaded: null });
assert.ok(llama.idleMs() >= 20 * 60 * 1000, 'automatic: at least 20 minutes');
console.log('✓ loading: models kept loaded (setting), roomy start context, no reload as chats grow');
process.exit(0);
