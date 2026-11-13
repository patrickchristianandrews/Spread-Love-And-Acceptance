// Build & ship: plug-ins for people making apps and sites (the "vibe coding" set), built into
// Quicksilver so there is nothing to install and no account to make. They come with every
// Liquid Edition and are on by default (switch any of them off under Connectors).
//  - App tester: opens your app or site in a hidden browser window, visits its pages and reports
//    what is broken (like Playwright MCP's "click every flow", without the install).
//  - Design extractor: reads a website's design system (colors, fonts, sizes, spacing, corners,
//    shadows, CSS variables) as a DESIGN.md the AI builds to (like SkillUI: static analysis).
//  - Security audit: checks a project folder the way an attacker would before you ship (leaked
//    keys, Supabase tables without row-level security, API routes with no login check, injection,
//    XSS…), on this PC, nothing uploaded (like VibeSec).
//  - Up-to-date code docs: current library documentation from Context7, so code is written against
//    today's APIs rather than the ones a model learned (online only).
const fs = require('node:fs');
const path = require('node:path');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0 Safari/537.36 Quicksilver';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const isOffline = () => { try { return require('./offline').isOffline(); } catch { return false; } };

// ---------- security audit (pure static analysis, testable without the app) ----------
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', '.nuxt', '.svelte-kit', '.output', 'vendor', 'coverage', '.venv', 'venv', '__pycache__', '.turbo', '.vercel', '.cache', 'target', 'bin', 'obj']);
const TEXT_EXT = /\.(m?[jt]sx?|cjs|vue|svelte|astro|py|rb|php|go|java|kt|cs|rs|sql|json|ya?ml|toml|env|ini|cfg|conf|html?|rules|tf|sh|ps1|dockerfile)$|(^|[\\/])(\.env[\w.-]*|Dockerfile|firestore\.rules|storage\.rules|\.gitignore)$/i;
function walkProject(root, max = 4000) {
  const out = [];
  const go = (dir, depth) => {
    if (out.length >= max || depth > 12) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (out.length >= max) return;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) go(p, depth + 1); continue; }
      if (!e.isFile() || !TEXT_EXT.test(e.name)) continue;
      try { if (fs.statSync(p).size <= 1024 * 1024) out.push(p); } catch {}
    }
  };
  go(root, 0);
  return out;
}

// A JWT whose payload says it's Supabase's service_role key (it bypasses every security rule).
function isServiceRoleJwt(tok) {
  try { return /"role"\s*:\s*"service_role"/.test(Buffer.from(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); } catch { return false; }
}
const SEV = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
// HTML built with an escaping helper is fine.
const ESCAPED = /\b(esc|escape|escapeHtml|escapeHTML|sanitize|sanitizeHtml|DOMPurify|purify)\s*[.(]/;
const PLACEHOLDER = /your[_-]?|example|placeholder|xxxx|changeme|<|\*\*\*|dummy|test[_-]?key|\.\.\./i;

// Line-by-line checks: [id, severity, title, regex, fix, (optional) file filter, (optional) extra test on the line].
const LINE_CHECKS = [
  ['aws-key', 'CRITICAL', 'AWS access key in the code', /\bAKIA[0-9A-Z]{16}\b/, 'Revoke it in AWS IAM now, then load it from an environment variable on the server.'],
  ['stripe-live', 'CRITICAL', 'Stripe live secret key in the code', /\b(sk|rk)_live_[0-9a-zA-Z]{16,}/, 'Roll the key in the Stripe dashboard, then keep it only in server-side environment variables.'],
  ['ai-key', 'CRITICAL', 'AI service secret key in the code', /\bsk-(ant-|proj-)?[A-Za-z0-9_-]{32,}/, 'Revoke the key with the provider and call the AI from your server with the key in an environment variable.'],
  ['private-key', 'CRITICAL', 'Private key in the code', /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/, 'Remove it, rotate the key pair, and store it outside the repository.'],
  ['github-token', 'CRITICAL', 'GitHub token in the code', /\b(ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{30,}/, 'Revoke it in GitHub settings and use an environment variable.'],
  ['slack-token', 'HIGH', 'Slack token in the code', /\bxox[abpr]-[A-Za-z0-9-]{10,}/, 'Revoke it in Slack and use an environment variable.'],
  ['google-key', 'MEDIUM', 'Google API key in the code', /\bAIza[0-9A-Za-z_-]{35}\b/, 'Restrict the key to your domains and APIs in Google Cloud, or move it server-side.'],
  ['public-secret', 'CRITICAL', 'A secret exposed to the browser through a public env variable', /\b(NEXT_PUBLIC|VITE|REACT_APP|EXPO_PUBLIC|PUBLIC|NUXT_PUBLIC)_[A-Z0-9_]*(SECRET|SERVICE_ROLE|PRIVATE|SK_|_SK\b|PASSWORD|ADMIN)/, 'Anything with a public prefix is shipped to every visitor. Rename it without the prefix and only read it on the server.'],
  ['hardcoded-password', 'MEDIUM', 'Password written into the code', /\b(password|passwd|pwd|db_pass)\s*[:=]\s*["'][^"'\s]{4,}["']/i, 'Load it from an environment variable or a secrets manager.', null, (l) => !PLACEHOLDER.test(l)],
  ['sql-injection', 'HIGH', 'SQL built from a template string (SQL injection)', /\b(query|execute|exec|raw|\$queryRawUnsafe|\$executeRawUnsafe|sql\.unsafe)\s*\(\s*`[^`]*\$\{/, 'Use parameters ($1, ?) or the query builder instead of putting values into the SQL text.'],
  ['sql-concat', 'HIGH', 'SQL built by adding strings together (SQL injection)', /\b(query|execute|exec|raw)\s*\(\s*["'][^"']*(select|insert|update|delete)[^"']*["']\s*\+/i, 'Use parameters ($1, ?) instead of adding values to the SQL text.'],
  ['eval', 'HIGH', 'eval / new Function on data (code injection)', /\b(eval|new Function)\s*\(\s*[^)"'`\s]/, 'Never run text as code. Parse it (JSON.parse) or map it to known actions.'],
  ['cmd-injection', 'HIGH', 'Shell command built from data (command injection)', /\b(exec|execSync|spawnSync|os\.system|subprocess\.(call|run|Popen))\s*\(\s*(`[^`]*\$\{|[^)]*\+\s*\w|f["'])/, 'Pass arguments as a list (execFile/spawn with an array) and never through a shell.'],
  ['path-traversal', 'HIGH', 'File path taken from the request (path traversal)', /\b(readFile|readFileSync|createReadStream|sendFile|unlink|writeFile)\s*\([^)]*\breq\.(query|params|body)/, 'Resolve the path and check it stays inside the folder you allow; better, look files up by ID.'],
  ['jwt-none', 'CRITICAL', 'JWT accepts the "none" algorithm', /algorithms?\s*:\s*\[?\s*["']none["']/i, 'Allow only the algorithm you sign with (e.g. HS256 or RS256).'],
  ['xss-react', 'MEDIUM', 'dangerouslySetInnerHTML (cross-site scripting)', /dangerouslySetInnerHTML/, 'Sanitize with DOMPurify first, or render the text normally.', null, null, (text) => !/DOMPurify|sanitize/i.test(text)],
  ['xss-dom', 'MEDIUM', 'innerHTML set from data (cross-site scripting)', /\.(innerHTML|outerHTML|insertAdjacentHTML)\b[^;]*(\$\{|["'`]\s*\+\s*[\w(]|=\s*[a-z_$][\w$.]*\s*;?\s*$)/i, 'Use textContent, or sanitize with DOMPurify.', null, (l) => !ESCAPED.test(l)],
  ['xss-vue', 'MEDIUM', 'v-html (cross-site scripting)', /\bv-html\s*=/, 'Sanitize the HTML first or render it as text.'],
  ['cors-any', 'MEDIUM', 'CORS allows every website', /(Access-Control-Allow-Origin["']?\s*[,:]\s*["']\*["']|origin\s*:\s*["']\*["']|origin\s*:\s*true\b)/, 'List the sites that may call your API instead of "*", especially when cookies or tokens are used.'],
  ['open-redirect', 'MEDIUM', 'Redirect to an address from the request (open redirect)', /\bredirect\s*\(\s*(req\.(query|body|params)|searchParams\.get|request\.(args|GET))/, 'Only redirect to paths on your own site, or check against a list.'],
  ['ssrf', 'MEDIUM', 'Server fetches an address from the request (SSRF)', /\b(fetch|axios\.(get|post)|got|requests\.(get|post)|http\.get)\s*\(\s*(req\.(query|body|params)|searchParams\.get|request\.(args|json))/, 'Allow only known hosts, and block private addresses (localhost, 169.254.169.254, 10.x).'],
  ['mass-assign', 'MEDIUM', 'Whole request body saved to the database (mass assignment)', /\b(create|update|insert|upsert|findOneAndUpdate|updateOne)\s*\(\s*(\{\s*data\s*:\s*)?(req\.body|body|await req\.json\(\))\s*[,)}]/, 'Pick the fields a user may set (e.g. with a zod schema); never let them set role, is_admin or owner_id.'],
  ['weak-random', 'MEDIUM', 'Math.random() used for a token or code', /(token|secret|otp|password|session|code)\w*\s*[:=][^;\n]*Math\.random\(\)/i, 'Use crypto.randomBytes / crypto.randomUUID.'],
  ['weak-hash', 'HIGH', 'Passwords hashed with MD5 or SHA-1', /(createHash\(\s*["'](md5|sha1)["']|hashlib\.(md5|sha1)\(|\b(md5|sha1)\()[^\n]*pass|pass[^\n]*(createHash\(\s*["'](md5|sha1)["']|hashlib\.(md5|sha1)\(|\b(md5|sha1)\()/i, 'Hash passwords with bcrypt, scrypt or Argon2.'],
  ['cookie-flags', 'LOW', 'Cookie set without httpOnly', /\b(res\.cookie|cookies\(\)\.set|cookies\.set|setCookie)\s*\(/, 'Set httpOnly, secure and sameSite on session cookies.', null, (l) => !/httpOnly/i.test(l)],
  ['firebase-open', 'CRITICAL', 'Firebase rules let anyone read or write', /allow\s+(read|write|read,\s*write|write,\s*read)\s*:\s*if\s+true/, 'Require request.auth != null and check the user owns the document.', (f) => /\.rules$/.test(f)],
  ['rls-true', 'HIGH', 'Supabase policy that lets everyone through (using (true))', /\b(using|with check)\s*\(\s*true\s*\)/i, 'Check the user: using (auth.uid() = user_id).', (f) => /\.sql$/i.test(f)],
  ['debug-on', 'LOW', 'Debug mode switched on', /\b(DEBUG\s*=\s*True|app\.run\([^)]*debug\s*=\s*True)/, 'Turn debug off in production; it shows code and secrets on errors.'],
];

function securityAudit(root) {
  if (!root || !fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error(`Folder not found: ${root || '(none given)'}. Give the full path of the project folder.`);
  const files = walkProject(root);
  const findings = [];
  const rel = (f) => path.relative(root, f).replace(/\\/g, '/');
  // Up to 10 places for a serious kind of problem, 4 for the rest; then a count of the others.
  const more = new Map();
  const add = (sev, title, where, fix, id) => {
    const cap = SEV.indexOf(sev) <= 1 ? 10 : 4;
    const same = findings.filter((x) => x.id === id);
    if (same.length < cap) findings.push({ sev, title, where, fix, id }); else more.set(id, (more.get(id) || 0) + 1);
  };
  const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };
  const texts = new Map(files.map((f) => [f, read(f)]));
  const isEnvFile = (f) => /(^|[\\/])\.env(\.(local|production|development|prod|dev))?$/i.test(f);
  for (const [f, text] of texts) {
    const r = rel(f);
    if (/\.(example|sample|template)$|\.md$/i.test(f)) continue;
    const lines = text.split('\n');
    for (const [id, sev, title, re, fix, only, lineOk, fileOk] of LINE_CHECKS) {
      if (only && !only(f)) continue;
      if (fileOk && !fileOk(text)) continue;
      if (isEnvFile(f) && /key|token|private|password|stripe|aws|github|slack|google/.test(id)) continue; // secrets belong in .env (checked below)
      lines.forEach((l, i) => { if (l.length < 2000 && re.test(l) && (!lineOk || lineOk(l))) add(sev, title, `${r}:${i + 1}`, fix, id); });
    }
    // Supabase's service_role key outside a server-only .env.
    for (const m of text.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g)) {
      if (isServiceRoleJwt(m[0]) && !(isEnvFile(f) && !/NEXT_PUBLIC|VITE_|REACT_APP|EXPO_PUBLIC/.test(text.slice(Math.max(0, m.index - 80), m.index)))) {
        add('CRITICAL', 'Supabase service_role key where the browser or the repository can see it (it bypasses every security rule)', `${r}:${text.slice(0, m.index).split('\n').length}`, 'Reset the service_role key in Supabase (Settings → API) and use it only in server code; the browser gets the anon key.', 'service-role');
      }
    }
    // API routes that change data without checking who is asking.
    const route = /(^|\/)(app|src\/app)\/(.*\/)?api\/.*route\.[cm]?[jt]sx?$|(^|\/)pages\/api\/.*\.[cm]?[jt]sx?$|(^|\/)(routes|api|controllers|server)\/.*\.[cm]?[jt]s$|(^|\/)supabase\/functions\/.*\.ts$/i.test(r);
    const writes = /export\s+(async\s+)?function\s+(POST|PUT|PATCH|DELETE)\b|export\s+const\s+(POST|PUT|PATCH|DELETE)\b|\b(app|router)\.(post|put|patch|delete)\s*\(|req\.method\s*===?\s*["'](POST|PUT|PATCH|DELETE)/.test(text);
    const authed = /\b(auth\(|getServerSession|getSession|currentUser|getUser|requireAuth|requireUser|verifyToken|jwt\.verify|jwtVerify|clerk|withAuth|isAuthenticated|ensureAuth|passport\.authenticate|supabase\.auth|authorization|Authorization|getToken|verifyIdToken|session\.user|req\.user|locals\.user)/.test(text);
    if (route && writes && !authed) add(/admin/i.test(r) ? 'CRITICAL' : 'HIGH', `API route that changes data with no login check${/admin/i.test(r) ? ' (an admin route!)' : ''}`, r, 'Check the session at the top of the handler and return 401 when there is none; for admin routes also check the role.', 'no-auth');
    // jwt.decode trusted without jwt.verify.
    if (/\bjwt\.decode\s*\(/.test(text) && !/\bjwt\.verify\s*\(|jwtVerify/.test(text)) add('HIGH', 'JWT decoded but never verified (anyone can forge it)', r, 'Use jwt.verify with your secret; decode alone does not check the signature.', 'jwt-decode');
  }
  // Supabase tables without row-level security.
  const sql = [...texts].filter(([f]) => /\.sql$/i.test(f));
  const allSql = sql.map(([, t]) => t).join('\n');
  for (const [f, text] of sql) {
    for (const m of text.matchAll(/create\s+table\s+(if\s+not\s+exists\s+)?(public\.)?"?([a-z_][\w]*)"?/gi)) {
      const t = m[3];
      if (!new RegExp(`alter\\s+table\\s+(if\\s+exists\\s+)?(only\\s+)?(public\\.)?"?${t}"?\\s+enable\\s+row\\s+level\\s+security`, 'i').test(allSql)) {
        add('CRITICAL', `Table "${t}" has no row-level security (anyone with the public anon key can read and change it)`, `${rel(f)}:${text.slice(0, m.index).split('\n').length}`, `alter table ${t} enable row level security; then add policies such as: create policy "own rows" on ${t} for all using (auth.uid() = user_id);`, 'no-rls');
      }
    }
  }
  // .env files the repository would publish.
  const gi = texts.get(path.join(root, '.gitignore')) ?? read(path.join(root, '.gitignore'));
  for (const f of files.filter(isEnvFile)) {
    if (!/(^|\n)\s*\/?\.env(\*|\.\*|\.local)?\s*($|\n)|(^|\n)\s*\*\.env|(^|\n)\s*\.env\*/.test(gi || '')) { add('HIGH', '.env file is not in .gitignore (its secrets would be committed)', rel(f), 'Add .env* to .gitignore; if it was ever committed, rotate every key in it.', 'env-tracked'); break; }
  }
  // Missing protections, project-wide.
  const pkg = (() => { try { return JSON.parse(texts.get(path.join(root, 'package.json')) || read(path.join(root, 'package.json')) || '{}'); } catch { return {}; } })();
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const all = [...texts.values()].join('\n');
  if (deps.express && !deps.helmet) add('LOW', 'Express without security headers (helmet)', 'package.json', 'npm install helmet, then app.use(helmet()).', 'headers');
  if (deps.next && !/headers\s*\(\s*\)|Content-Security-Policy|X-Frame-Options/.test(all)) add('LOW', 'No security headers (CSP, X-Frame-Options) configured', 'next.config', 'Add headers() in next.config with Content-Security-Policy, X-Frame-Options and Referrer-Policy.', 'headers');
  if (/\/(login|signin|sign-in|signup|register|reset-password|forgot)/i.test([...texts.keys()].map(rel).join('\n')) && !/rate.?limit|ratelimit|upstash|express-rate-limit|limiter|throttle/i.test(all)) add('LOW', 'Login and sign-up have no rate limit (password guessing, spam sign-ups)', 'auth routes', 'Add a rate limit (e.g. @upstash/ratelimit or express-rate-limit) to login, sign-up and password reset.', 'rate-limit');

  findings.sort((a, b) => SEV.indexOf(a.sev) - SEV.indexOf(b.sev));
  const count = (s) => findings.filter((x) => x.sev === s).length;
  const stack = [deps.next && 'Next.js', deps['@supabase/supabase-js'] && 'Supabase', deps.firebase && 'Firebase', deps.express && 'Express', deps.prisma || deps['@prisma/client'] ? 'Prisma' : '', deps.react && !deps.next && 'React', deps.vue && 'Vue', deps.svelte && 'Svelte', /\.py$/.test([...texts.keys()].join(' ')) && 'Python'].filter(Boolean);
  const icon = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🔵' };
  return [
    `# Security audit: ${path.basename(root)}`,
    `${files.length} files checked${stack.length ? ` · ${stack.join(', ')}` : ''} · ${findings.length ? SEV.map((s) => `${count(s)} ${s.toLowerCase()}`).join(', ') : 'nothing found by the automatic checks'}`,
    '',
    ...findings.map((x, i) => {
      const last = findings.findLastIndex((y) => y.id === x.id) === i && more.get(x.id);
      return `${icon[x.sev]} **${x.sev}** · ${x.title}\n   ${x.where}\n   Fix: ${x.fix}${last ? `\n   (+${more.get(x.id)} more place${more.get(x.id) === 1 ? '' : 's'} like this)` : ''}`;
    }),
    '',
    'What an attacker would try next by hand (the checks above can\'t see these):',
    '- Change an ID in a URL or request (/orders/123 → /orders/124): can one user see or change another user\'s data?',
    '- Call the API directly (not through the app) with no login, then as an ordinary user on admin actions.',
    '- Send extra fields (role: "admin", price: 0, user_id: someone else) in sign-up and update requests.',
    '- Upload a file that is really HTML or a script; check uploads are limited by type and size and served from another domain.',
    '- Paste <script>alert(1)</script> into every text box that is shown to other people.',
    '- Run npm audit (or pip-audit) for known holes in your dependencies.',
  ].join('\n');
}

// ---------- design extractor (static analysis of a site's HTML and CSS) ----------
async function getText(url, ms = 15000) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,text/css,*/*' }, redirect: 'follow', signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}.`);
  return { text: (await res.text()).slice(0, 3_000_000), url: res.url || url };
}
const top = (map, n) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
const bump = (map, k) => { if (k) map.set(k, (map.get(k) || 0) + 1); };
function normColor(c) {
  c = c.trim().toLowerCase();
  const h = c.match(/^#([0-9a-f]{3,8})$/);
  if (h && h[1].length === 3) return `#${h[1].split('').map((x) => x + x).join('')}`;
  return c.replace(/\s+/g, ' ');
}
function designFromCss(css, html = '') {
  const colors = new Map(); const fonts = new Map(); const sizes = new Map(); const weights = new Map(); const spacing = new Map();
  const radii = new Map(); const shadows = new Map(); const media = new Map(); const motion = new Map(); const vars = new Map();
  for (const m of css.matchAll(/--([\w-]+)\s*:\s*([^;}{]{1,120})/g)) if (!vars.has(m[1])) vars.set(m[1], m[2].trim());
  for (const m of css.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)/g)) if (!/^#[0-9a-f]{5}$|^#[0-9a-f]{7}$/i.test(m[0])) bump(colors, normColor(m[0]));
  for (const m of css.matchAll(/font-family\s*:\s*([^;}{]+)/gi)) bump(fonts, m[1].trim().replace(/\s*!important/, ''));
  for (const m of css.matchAll(/@font-face\s*{[^}]*font-family\s*:\s*["']?([^;"'}]+)/gi)) bump(fonts, `${m[1].trim()} (web font)`);
  for (const m of html.matchAll(/fonts\.googleapis\.com\/css2?\?family=([^"'&]+)/g)) for (const f of decodeURIComponent(m[1]).split('|')) bump(fonts, `${f.split(':')[0].replace(/\+/g, ' ')} (Google Fonts)`);
  for (const m of css.matchAll(/font-size\s*:\s*([^;}{]+)/gi)) bump(sizes, m[1].trim());
  for (const m of css.matchAll(/font-weight\s*:\s*([^;}{]+)/gi)) bump(weights, m[1].trim());
  for (const m of css.matchAll(/(?:margin|padding|gap|row-gap|column-gap)(?:-(?:top|right|bottom|left|inline|block))?\s*:\s*([^;}{]+)/gi)) for (const v of m[1].trim().split(/\s+/)) if (/^-?[\d.]+(px|rem|em)$/.test(v) && !/^-?0(px|rem|em)?$/.test(v)) bump(spacing, v);
  for (const m of css.matchAll(/border-radius\s*:\s*([^;}{]+)/gi)) bump(radii, m[1].trim());
  for (const m of css.matchAll(/box-shadow\s*:\s*([^;}{]+)/gi)) if (!/^none$/i.test(m[1].trim())) bump(shadows, m[1].trim());
  for (const m of css.matchAll(/@media[^{]*\((?:min|max)-width\s*:\s*([\d.]+(?:px|em|rem))\)/gi)) bump(media, m[1]);
  for (const m of css.matchAll(/(?:transition|animation)(?:-duration)?\s*:\s*[^;}{]*?([\d.]+m?s)\b/gi)) bump(motion, m[1]);
  return { colors, fonts, sizes, weights, spacing, radii, shadows, media, motion, vars };
}
async function extractDesign(url) {
  if (isOffline()) throw new Error('Quicksilver is offline. Go online to read a website.');
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  const page = await getText(url);
  const html = page.text;
  const base = page.url;
  const hrefs = [...html.matchAll(/<link\b[^>]*rel=["']?[^"'>]*stylesheet[^>]*>/gi)].map((m) => (m[0].match(/href=["']?([^"'\s>]+)/i) || [])[1]).filter(Boolean).slice(0, 10);
  const sheets = await Promise.all(hrefs.map((h) => getText(new URL(h.replace(/&amp;/g, '&'), base).href, 12000).then((r) => r.text).catch(() => '')));
  const inline = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
  const attrs = [...html.matchAll(/\sstyle=["']([^"']+)["']/gi)].map((m) => `x{${m[1]}}`).join('\n');
  const css = [inline, ...sheets, attrs].join('\n');
  if (css.length < 200) throw new Error(`Couldn't find the styles of ${base}: the page may build its styles with JavaScript after loading. Try another page of the site.`);
  const d = designFromCss(css, html);
  const meta = (n) => (html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${n}["'][^>]*content=["']([^"']*)`, 'i')) || [])[1] || '';
  const title = (html.match(/<title[^>]*>([^<]*)/i) || [])[1]?.trim() || base;
  const list = (map, n, fmt = (k, v) => `- \`${k}\` (${v}×)`) => (map.size ? top(map, n).map(([k, v]) => fmt(k, v)).join('\n') : '- (none found)');
  const colorVars = [...d.vars].filter(([, v]) => /#[0-9a-f]{3,8}\b|rgb|hsl|oklch/i.test(v)).slice(0, 40);
  const otherVars = [...d.vars].filter(([, v]) => !/#[0-9a-f]{3,8}\b|rgb|hsl|oklch/i.test(v)).slice(0, 40);
  const pal = top(d.colors, 12).map(([c]) => c);
  const fam = top(d.fonts, 3).map(([f]) => f);
  return [
    `# DESIGN.md: ${title}`,
    `Source: ${base}${meta('theme-color') ? ` · theme color ${meta('theme-color')}` : ''}${meta('description') ? `\n> ${meta('description').slice(0, 200)}` : ''}`,
    `Read from ${sheets.filter(Boolean).length} stylesheet${sheets.filter(Boolean).length === 1 ? '' : 's'} and the page itself (${Math.round(css.length / 1024)} KB of CSS). Counts show how often each value is used: the most used are the core of the design.`,
    '', '## Colors', list(d.colors, 16),
    ...(colorVars.length ? ['', '### Color tokens (CSS variables)', colorVars.map(([k, v]) => `- \`--${k}: ${v}\``).join('\n')] : []),
    '', '## Typography', '### Font families', list(d.fonts, 6), '### Font sizes', list(d.sizes, 12), '### Weights', list(d.weights, 6),
    '', '## Spacing scale', list(d.spacing, 12), '', '## Corner radius', list(d.radii, 8), '', '## Shadows', list(d.shadows, 6),
    '', '## Breakpoints', list(d.media, 8), '', '## Motion (transition and animation durations)', list(d.motion, 6),
    ...(otherVars.length ? ['', '## Other design tokens (CSS variables)', otherVars.map(([k, v]) => `- \`--${k}: ${v}\``).join('\n')] : []),
    '', '## Starter tokens to build with', '```css', ':root {',
    ...pal.slice(0, 8).map((c, i) => `  --color-${i + 1}: ${c};`),
    ...(fam[0] ? [`  --font-body: ${fam[0].replace(/ \((web font|Google Fonts)\)$/, '')};`] : []),
    ...top(d.radii, 2).map(([r], i) => `  --radius-${i + 1}: ${r};`),
    ...top(d.shadows, 1).map(([s]) => `  --shadow: ${s};`),
    '}', '```',
    '', 'Build with these values (the most used colors, the font families, the size and spacing scales) so the result matches this site. Use the design, not its logo, wording or images.',
  ].join('\n');
}

// ---------- app tester (a hidden browser window; needs the app, not plain Node) ----------
const COLLECT = `(() => {
  const abs = (h) => { try { return new URL(h, location.href).href.split('#')[0]; } catch { return ''; } };
  const imgs = [...document.images];
  const labelled = (el) => el.labels?.length || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('placeholder') || el.title;
  return {
    title: document.title,
    links: [...document.querySelectorAll('a[href]')].map((a) => abs(a.getAttribute('href'))).filter((h) => h.startsWith(location.origin)),
    brokenImages: imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.src).map((i) => i.src).slice(0, 10),
    noAlt: imgs.filter((i) => !i.hasAttribute('alt')).length,
    unlabeled: [...document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea')].filter((el) => !labelled(el)).length,
    emptyButtons: [...document.querySelectorAll('button, [role=button]')].filter((b) => !b.textContent.trim() && !b.getAttribute('aria-label') && !b.title).length,
    h1: document.querySelectorAll('h1').length,
    words: (document.body?.innerText || '').split(/\\s+/).filter(Boolean).length,
    viewport: Boolean(document.querySelector('meta[name=viewport]')),
    overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
  };
})()`;
async function testApp(url, maxPages = 8) {
  const electron = require('electron');
  if (typeof electron !== 'object' || !electron.BrowserWindow) throw new Error('The app tester runs inside Quicksilver.');
  const { BrowserWindow, session } = electron;
  if (!/^https?:\/\//i.test(url)) url = /^(localhost|127\.|\d+\.\d+\.\d+\.\d+)/.test(url) ? `http://${url}` : `https://${url}`;
  const start = new URL(url);
  if (isOffline() && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(start.hostname)) throw new Error('Quicksilver is offline: only an app running on this PC (localhost) can be tested.');
  maxPages = Math.max(1, Math.min(20, Number(maxPages) || 8));
  const part = `apptest-${Date.now()}`;
  const ses = session.fromPartition(part);
  const failed = []; const consoleErrors = []; const warnings = []; let crashed = '';
  ses.webRequest.onCompleted((d) => { if (d.statusCode >= 400) failed.push(`${d.statusCode} ${d.method} ${d.url.slice(0, 160)}`); });
  ses.webRequest.onErrorOccurred((d) => { if (!/ERR_ABORTED|ERR_BLOCKED_BY_CLIENT/.test(d.error)) failed.push(`${d.error} ${d.url.slice(0, 160)}`); });
  const w = new BrowserWindow({ show: false, width: 1280, height: 800, webPreferences: { partition: part, sandbox: true, contextIsolation: true, nodeIntegration: false } });
  w.webContents.setAudioMuted(true);
  w.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  let current = url;
  w.webContents.on('console-message', (e, level, message) => {
    const lvl = typeof level === 'number' ? level : e.level; const msg = typeof message === 'string' ? message : e.message;
    const where = new URL(current).pathname;
    if (lvl === 3 || lvl === 'error') consoleErrors.push(`${where}: ${String(msg).slice(0, 220)}`);
    else if (lvl === 2 || lvl === 'warning') warnings.push(`${where}: ${String(msg).slice(0, 160)}`);
  });
  w.webContents.on('render-process-gone', (_e, d) => { crashed = d.reason; });
  const pages = [];
  const queue = [start.href.split('#')[0]]; const seen = new Set(queue);
  try {
    while (queue.length && pages.length < maxPages) {
      const u = queue.shift(); current = u;
      const t0 = Date.now();
      let loadError = '';
      await Promise.race([w.loadURL(u), wait(30000).then(() => { throw new Error('took longer than 30 seconds to load'); })]).catch((err) => { loadError = String(err.message || err).replace(/^Error: /, '').slice(0, 160); });
      const ms = Date.now() - t0;
      await wait(1200);
      const info = loadError && !/ERR_ABORTED/.test(loadError) ? null : await w.webContents.executeJavaScript(COLLECT, true).catch(() => null);
      pages.push({ url: u, ms, loadError: info ? '' : loadError || 'could not be read', info });
      for (const l of info?.links || []) if (!seen.has(l) && !/\.(pdf|zip|png|jpe?g|gif|svg|webp|mp4|mp3)$|\/(logout|signout|sign-out|delete)/i.test(l)) { seen.add(l); queue.push(l); }
      if (crashed) break;
    }
    // A phone-sized screen: does the first page spill sideways?
    w.setSize(390, 844);
    await w.loadURL(start.href).catch(() => {});
    await wait(1000);
    const phone = await w.webContents.executeJavaScript(COLLECT, true).catch(() => null);
    const n = (k) => pages.reduce((t, p) => t + (p.info?.[k] || 0), 0);
    const problems = [
      ...pages.filter((p) => p.loadError).map((p) => `🔴 ${new URL(p.url).pathname} did not load: ${p.loadError}`),
      ...(crashed ? [`🔴 The page crashed (${crashed}).`] : []),
      ...[...new Set(consoleErrors)].slice(0, 15).map((x) => `🟠 JavaScript error · ${x}`),
      ...[...new Set(failed)].slice(0, 15).map((x) => `🟠 Failed request · ${x}`),
      ...pages.flatMap((p) => (p.info?.brokenImages || []).map((s) => `🟡 Broken image on ${new URL(p.url).pathname}: ${s.slice(0, 120)}`)).slice(0, 10),
      ...pages.filter((p) => p.ms > 5000).map((p) => `🟡 ${new URL(p.url).pathname} took ${(p.ms / 1000).toFixed(1)} s to load`),
      ...(phone?.overflow ? ['🟡 On a phone-sized screen the first page scrolls sideways (something is wider than the screen).'] : []),
      ...(phone && !phone.viewport ? ['🟡 No viewport tag: phones will show the desktop layout zoomed out.'] : []),
      ...(n('noAlt') ? [`🔵 ${n('noAlt')} image${n('noAlt') === 1 ? '' : 's'} without alt text (screen readers, SEO).`] : []),
      ...(n('unlabeled') ? [`🔵 ${n('unlabeled')} form field${n('unlabeled') === 1 ? '' : 's'} without a label.`] : []),
      ...(n('emptyButtons') ? [`🔵 ${n('emptyButtons')} button${n('emptyButtons') === 1 ? '' : 's'} with no text or label.`] : []),
      ...pages.filter((p) => p.info && p.info.h1 !== 1).map((p) => `🔵 ${new URL(p.url).pathname} has ${p.info.h1} main headings (h1); one is best.`).slice(0, 5),
    ];
    return [
      `# App test: ${start.origin}`,
      `${pages.length} page${pages.length === 1 ? '' : 's'} visited (links followed on the same site; nothing was clicked that could change data) · ${problems.length ? `${problems.length} thing${problems.length === 1 ? '' : 's'} to fix` : 'no problems found'}`,
      '',
      ...(problems.length ? problems : ['✓ Every page loaded with no JavaScript errors, failed requests or broken images, and the first page fits a phone screen.']),
      '', 'Pages:',
      ...pages.map((p) => `- ${new URL(p.url).pathname}${p.info?.title ? ` · "${p.info.title.slice(0, 60)}"` : ''} · ${(p.ms / 1000).toFixed(1)} s${p.loadError ? ' · ✗' : ''}`),
      ...(warnings.length ? ['', `${[...new Set(warnings)].length} console warning(s), e.g. ${[...new Set(warnings)][0]}`] : []),
    ].join('\n');
  } finally {
    try { w.destroy(); } catch {}
    ses.clearStorageData().catch(() => {});
  }
}

// ---------- up-to-date code docs (Context7, over MCP) ----------
const C7_URL = 'https://mcp.context7.com/mcp';
let c7 = null;
async function c7Client() {
  if (c7 && Date.now() - c7.at < 10 * 60 * 1000) return c7;
  try { await c7?.client.close(); } catch {}
  const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
  const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
  const client = new Client({ name: 'Quicksilver', version: require('../../package.json').version });
  await Promise.race([client.connect(new StreamableHTTPClientTransport(new URL(C7_URL))), wait(20000).then(() => { throw new Error('Context7 did not answer within 20 seconds.'); })]);
  const { tools } = await client.listTools();
  c7 = { client, tools, at: Date.now() };
  return c7;
}
// Context7's tool names and argument names have changed between versions: pick them by meaning.
async function c7Call(kind, values) {
  if (isOffline()) throw new Error('Quicksilver is offline. Code docs come from the internet (Context7).');
  const { client, tools } = await c7Client();
  const tool = kind === 'find' ? tools.find((t) => /resolve|search|find/i.test(t.name)) : tools.find((t) => /docs|query|get-library/i.test(t.name) && !/resolve/i.test(t.name));
  if (!tool) throw new Error('Context7 changed its tools; update Quicksilver.');
  const props = Object.keys(tool.inputSchema?.properties || {});
  const pick = (re) => props.find((p) => re.test(p));
  const args = {};
  if (kind === 'find') { args[pick(/library|name|query/i) || 'libraryName'] = values.library; if (pick(/^query$/i) && !args.query) args.query = values.library; } else {
    args[pick(/id/i) || 'context7CompatibleLibraryID'] = values.id;
    if (values.topic) { const k = pick(/topic|query|question/i); if (k) args[k] = values.topic; }
    const t = pick(/tokens/i); if (t) args[t] = 6000;
  }
  const r = await client.callTool({ name: tool.name, arguments: args });
  const text = (r.content || []).map((c) => c.text || '').join('\n');
  if (r.isError) throw new Error(text.slice(0, 400) || 'Context7 reported an error.');
  return text;
}

module.exports = ({ cfg }) => {
  const C = (id) => cfg()[id] || {};
  const CONNECTORS = {
    apptest: { name: 'App tester', icon: '🧪', group: 'Build & ship', defaultOn: true, noToken: true, builtIn: true,
      blurb: 'Opens your app or site (one running on this PC too, like localhost:3000), visits its pages and reports what is broken: JavaScript errors, failed requests, broken links and images, slow pages, layouts that spill off a phone screen, missing labels. Like Playwright MCP, with nothing to install.', fields: [] },
    designsystem: { name: 'Design extractor', icon: '🎨', group: 'Build & ship', defaultOn: true, noToken: true, builtIn: true,
      blurb: 'Reads any website\'s design system (colors, fonts, type and spacing scales, corners, shadows, breakpoints, CSS variables) as a DESIGN.md, so the AI builds pages that match it. Like SkillUI. Free, nothing to install.', fields: [] },
    securityaudit: { name: 'Security audit', icon: '🛡️', group: 'Build & ship', defaultOn: true, noToken: true, builtIn: true,
      blurb: 'Checks a project folder the way an attacker would before you ship: leaked keys, Supabase tables without row-level security, API routes with no login check, SQL and command injection, XSS, open CORS and more, with how to fix each. Like VibeSec. Runs on this PC; nothing is uploaded.',
      fields: [{ key: 'folder', label: 'Your project folder (optional)', placeholder: 'C:\\Users\\you\\code\\my-app', help: 'Used when you ask for a security check without saying which folder.' }] },
    codedocs: { name: 'Up-to-date code docs (Context7)', icon: '📘', group: 'Build & ship', defaultOn: true, noToken: true, builtIn: true,
      blurb: 'Current documentation and examples for thousands of libraries and frameworks, so code is written against today\'s versions, not the ones a model learned. Free, no account; needs the internet (only the library name and topic are sent).', fields: [] },
  };
  const TOOLS = {
    apptest: [{ name: 'app_test', description: 'Test a web app or site like a QA tester: opens it in a hidden browser, follows its links, and reports JavaScript errors, failed network requests, broken images, slow pages, phone layout problems and accessibility gaps. Works with apps running on this PC (http://localhost:3000).', parameters: { type: 'object', properties: { url: { type: 'string', description: 'The address, e.g. http://localhost:3000 or https://example.com' }, maxPages: { type: 'number', description: 'How many pages to visit (1-20, default 8)' } }, required: ['url'] },
      run: ({ url, maxPages }) => testApp(String(url || ''), maxPages) }],
    designsystem: [{ name: 'design_extract', description: 'Extract a website\'s design system (colors, fonts, font sizes, spacing, border radius, shadows, breakpoints, CSS variables) as DESIGN.md, to build a page that matches its look.', parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
      run: ({ url }) => extractDesign(String(url || '')) }],
    securityaudit: [{ name: 'security_audit', description: 'Security-audit a code project folder before shipping (thinks like an attacker): leaked API keys and secrets, Supabase service_role keys, tables without row-level security, unauthenticated API routes, SQL/command injection, XSS, open CORS, weak hashing, Firebase rules. Returns findings by severity with fixes.', parameters: { type: 'object', properties: { folder: { type: 'string', description: 'Full path of the project folder' } }, required: [] },
      run: ({ folder }) => securityAudit(String(folder || C('securityaudit').folder || '').trim()) }],
    codedocs: [
      { name: 'code_docs_find', description: 'Find a library or framework in Context7 (current docs). Returns library IDs such as /vercel/next.js to use with code_docs_read.', parameters: { type: 'object', properties: { library: { type: 'string', description: 'e.g. next.js, supabase, tailwindcss' } }, required: ['library'] },
        run: ({ library }) => c7Call('find', { library: String(library || '') }) },
      { name: 'code_docs_read', description: 'Read current documentation and code examples for a library (by the Context7 ID from code_docs_find), optionally about one topic.', parameters: { type: 'object', properties: { id: { type: 'string', description: 'e.g. /vercel/next.js' }, topic: { type: 'string', description: 'e.g. middleware, auth, server actions' } }, required: ['id'] },
        run: ({ id, topic }) => c7Call('read', { id: String(id || ''), topic: topic ? String(topic) : '' }) },
    ],
  };
  async function test(id) {
    if (id === 'securityaudit') { const f = C('securityaudit').folder; if (f && !fs.existsSync(f)) throw new Error(`Folder not found: ${f}`); return f ? path.basename(f) : 'ready'; }
    return 'ready';
  }
  return { CONNECTORS, TOOLS, test };
};
module.exports.securityAudit = securityAudit;
module.exports.designFromCss = designFromCss;
module.exports.extractDesign = extractDesign;
module.exports.testApp = testApp;
