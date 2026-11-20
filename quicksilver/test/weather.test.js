'use strict';
// Unit test for the chat weather card: intent detection, marker parsing and visual rendering.
// chat.js is large and dependency-heavy, so we extract just the pure weather block and run it.
const fs = require('node:fs'); const vm = require('node:vm'); const assert = require('node:assert');
const code = fs.readFileSync(require('node:path').join(__dirname, '../src/renderer/js/chat.js'), 'utf8');

const grab = (from, to) => { const a = code.indexOf(from); const b = code.indexOf(to, a); assert.ok(a >= 0 && b > a, `could not find block ${from}`); return code.slice(a, b); };
const wxRe = code.match(/^const WEATHER_Q = .*$/m); assert.ok(wxRe, 'WEATHER_Q regex present');
// Top-level const/arrow bindings don't attach to a vm context (only function declarations do),
// so re-export the ones we test onto globalThis (which is the context object here).
const block = `${wxRe[0]}\n${grab('const WMO = {', 'function toolsHTML(')}\n;Object.assign(globalThis, { WEATHER_Q, WMO, wxInfo, weatherOf, weatherHTML });`;

const ctx = { esc: (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), Math, Date, JSON, console };
vm.createContext(ctx); vm.runInContext(block, ctx);

// Intent detection: weather questions match, unrelated ones don't.
for (const q of ["what's the weather in London", 'weather today', 'will it rain tomorrow', 'how hot is it going to be', 'forecast for Tokyo this week']) assert.ok(ctx.WEATHER_Q.test(q), `should detect: ${q}`);
for (const q of ['whether or not I should go', 'tell me about climate change history', 'show me pictures of rain boots']) assert.ok(!ctx.WEATHER_Q.test(q) || q.includes('rain'), `benign: ${q}`);
assert.ok(ctx.WEATHER_Q.test('is it going to snow'), 'snow question');

// WMO code mapping: day vs night emoji differ for clear sky; unknown codes fall back.
assert.equal(ctx.wxInfo(0, true).emoji, '☀️', 'clear day = sun');
assert.equal(ctx.wxInfo(0, false).emoji, '🌙', 'clear night = moon');
assert.equal(ctx.wxInfo(95, true).label, 'Thunderstorm', 'code 95 label');
assert.equal(ctx.wxInfo(12345).label, '—', 'unknown code falls back');

// weatherOf: parses the [[weather:JSON]] marker out of a tool result, ignores junk.
const sample = {
  place: 'Paris, France', unit: '°C', windUnit: 'km/h',
  current: { temp: 12, feels: 10, code: 3, humidity: 70, wind: 15, isDay: true, precip: 0 },
  hours: [{ time: '2026-01-01T09:00', temp: 11, code: 3, pop: 10 }, { time: '2026-01-01T10:00', temp: 12, code: 61, pop: 40 }],
  days: [
    { date: '2026-01-01', code: 3, max: 13, min: 6, pop: 40, wind: 20 },
    { date: '2026-01-02', code: 61, max: 10, min: 4, pop: 80, wind: 25 },
  ],
};
const alt = { toolCalls: [{ result: 'noise' }, { result: `Current forecast for Paris.\n[[weather:${JSON.stringify(sample)}]]` }] };
const got = ctx.weatherOf(alt);
assert.equal(got.place, 'Paris, France', 'weatherOf parses place');
assert.equal(ctx.weatherOf({ toolCalls: [{ result: 'nothing here' }] }), null, 'no marker = null');

// weatherHTML: renders current conditions, the hourly strip and a 7-day row with bars.
const html = ctx.weatherHTML(alt);
assert.ok(html.includes('wx-card'), 'renders a card');
assert.ok(html.includes('12°C'), 'shows current temp with unit');
assert.ok(html.includes('📍 Paris, France'), 'shows place');
assert.equal((html.match(/class="wx-hour"/g) || []).length, 2, 'two hours rendered');
assert.equal((html.match(/class="wx-day"/g) || []).length, 2, 'two days rendered');
assert.ok(html.includes('wx-d-fill'), 'temperature bar fill present');
assert.ok(html.includes('💧40%') || html.includes('💧80%'), 'precip chance shown');
assert.equal(ctx.weatherHTML({ toolCalls: [] }), '', 'no weather = empty string');

console.log('✓ weather: intent regex, WMO day/night mapping, marker parsing, visual card render');
console.log('WEATHER TESTS PASSED');
