'use strict';
const assert = require('node:assert');
const { parseDeepLink } = require('../src/main/deeplink');

assert.deepEqual(parseDeepLink('quicksilver://model/TheBloke/Mistral-7B-Instruct-GGUF'), { kind: 'model', id: 'TheBloke/Mistral-7B-Instruct-GGUF' });
assert.deepEqual(parseDeepLink('quicksilver://space/black-forest-labs/FLUX.1-schnell'), { kind: 'space', id: 'black-forest-labs/FLUX.1-schnell' });
assert.deepEqual(parseDeepLink('quicksilver://model/owner/name/'), { kind: 'model', id: 'owner/name' }, 'trailing slash trimmed');
assert.deepEqual(parseDeepLink('quicksilver://open'), { kind: 'open', id: '' });
// Rejections: wrong scheme, wrong host, bad shape, injection attempts.
assert.equal(parseDeepLink('https://model/owner/name'), null, 'only the quicksilver: scheme');
assert.equal(parseDeepLink('quicksilver://model/justone'), null, 'needs owner/name');
assert.equal(parseDeepLink('quicksilver://run/owner/name'), null, 'unknown kind');
assert.equal(parseDeepLink('quicksilver://model/owner/name/extra/path'), null, 'no deeper paths');
assert.equal(parseDeepLink('quicksilver://model/own er/na me'), null, 'no spaces');
assert.equal(parseDeepLink('not a url'), null);
assert.equal(parseDeepLink(''), null);
console.log('✓ parseDeepLink: accepts model/space owner-name links, rejects everything else');
console.log('DEEPLINK TESTS PASSED');
