// Run by .github/workflows/quicksilver-community.yml when a maintainer labels a submission issue
// "approved": checks the stack in the issue and adds it to data/community.json.
// Reads the issue from environment variables (never from the command line), so nothing in an
// issue can run as a command.
const fs = require('node:fs');
const path = require('node:path');
const catalog = require('../src/shared/catalog');
const { cleanStack, cleanList, fromIssue } = require('../src/shared/community');

const FILE = path.join(__dirname, '..', 'data', 'community.json');
// Cloud services Quicksilver lists (read from providers.js without loading the app).
const presets = new Set([...fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'providers.js'), 'utf8').matchAll(/^ {2}([a-z0-9]+): \{/gm)].map((m) => m[1]));
const known = { models: new Set(catalog.TEXT_MODELS.map((m) => m.id)), presets };

const raw = fromIssue(process.env.ISSUE_BODY);
const stack = cleanStack({ ...raw, added: new Date().toISOString().slice(0, 10), author: raw.author || process.env.ISSUE_AUTHOR || '' }, known);
const list = (fs.existsSync(FILE) && cleanList(JSON.parse(fs.readFileSync(FILE, 'utf8')), known)) || { version: 1, stacks: [] };
let id = stack.id;
for (let n = 2; list.stacks.some((s) => s.id === id); n++) id = `${stack.id}-${n}`;
list.stacks.push({ ...stack, id, issue: Number(process.env.ISSUE_NUMBER) || undefined });
fs.writeFileSync(FILE, `${JSON.stringify(list, null, 1)}\n`);
console.log(`Added "${stack.name}" as ${id}. ${list.stacks.length} user-submitted stacks.`);
