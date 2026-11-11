// Quicksilver Liquid Edition Pro: built from the Pro line-up as soon as its Brain and Closer are in.
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const assert = require('node:assert/strict');
process.env.QUICKSILVER_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-pro-'));
const catalog = require('../src/shared/catalog');
const models = require('../src/main/models');
const complete = require('../src/main/complete');
const P = catalog.LIQUID_PRO;
const TINY = path.join(__dirname, 'fixtures', 'tiny.gguf');
const add = (id, catalogId, extra = {}) => models.add({ id, name: id, kind: 'text', catalogId, files: { model: TINY, ...extra }, size: 1 });

for (const id of catalog.LIQUID_PRO_MODELS) assert.ok([...catalog.TEXT_MODELS, ...catalog.MEDIA_MODELS].some((m) => m.id === id), `${id} is in the catalog`);
const store = require('../src/main/store');
add('pro-brain', P.brain);
add('pro-closer', P.closer, { mmproj: TINY });
// Having its models is not enough: Pro is only set up when the user asks for it.
assert.equal(complete.ensureQuicksilverProStack(), null, 'never set up by itself');
assert.ok(!complete.stacks().some((s) => s.id === 'quicksilver-pro'));
store.saveConfig({ liquidProWanted: true }); // the "Get Liquid Edition Pro" button
assert.equal(complete.ensureQuicksilverProStack(), 'stack:quicksilver-pro');
let st = complete.stacks().find((s) => s.id === 'quicksilver-pro');
assert.deepEqual(st.members, { drafters: ['local:pro-brain'], judge: 'local:pro-closer', vision: 'local:pro-closer', mode: 'auto' });
add('pro-thinker', P.thinker); add('pro-muse', P.muse);
complete.ensureQuicksilverProStack();
st = complete.stacks().find((s) => s.id === 'quicksilver-pro');
assert.equal(st.members.thinker, 'local:pro-thinker'); assert.equal(st.members.muse, 'local:pro-muse');
assert.ok(st.builtIn && st.autoManaged && st.builtFor === 'quicksilver-pro');
assert.ok(complete.isUncensored('stack:quicksilver-pro'), 'Pro is uncensored, like the Liquid Edition');
assert.equal(complete.targets().find((t) => t.target === 'stack:quicksilver-pro')?.group, '💧 Built in');
console.log('✓ Liquid Edition Pro: only when the user asks for it; built from its Brain and Closer, joined by its Thinker and Muse, uncensored, built in');
process.exit(0);
