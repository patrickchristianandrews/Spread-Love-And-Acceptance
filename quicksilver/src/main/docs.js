// Reads documents (PDF, Word, Excel, CSV, PowerPoint, text, web pages, code) into text for the
// models, profiles spreadsheets for analysis, and keeps a searchable reference library of files.
const fs = require('node:fs');
const path = require('node:path');
const store = require('./store');

const TEXT_EXT = /\.(txt|md|markdown|json|jsonl|xml|yaml|yml|ini|log|rtf|tex|js|ts|jsx|tsx|py|java|c|cpp|h|hpp|cs|go|rs|rb|php|swift|kt|sql|sh|ps1|bat|css|scss|toml|r|m|lua|pl|vb)$/i;
const SUPPORTED = /\.(pdf|docx|xlsx|xlsm|csv|tsv|pptx|html?|txt|md|markdown|json|jsonl|xml|yaml|yml|ini|log|rtf|tex|js|ts|jsx|tsx|py|java|c|cpp|h|hpp|cs|go|rs|rb|php|swift|kt|sql|sh|ps1|bat|css|scss|toml|r|m|lua|pl|vb)$/i;

// ---------- spreadsheets ----------

function parseCSV(text, delim) {
  const d = delim || (text.split('\n')[0].split('\t').length > text.split('\n')[0].split(',').length ? '\t' : ',');
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"') q = true;
    else if (c === d) { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  return rows.filter((r) => r.some((x) => String(x).trim() !== ''));
}

const fmt = (n) => (Math.abs(n) >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : String(Math.round(n * 1000) / 1000));

// A compact profile of a table, so a model can analyze it without reading every row.
function profileTable(name, rows, maxRows = 300) {
  if (!rows.length) return `Sheet "${name}": empty.`;
  const header = rows[0].map((h, i) => String(h || `Column ${i + 1}`).trim());
  const body = rows.slice(1);
  const lines = [`Sheet "${name}": ${body.length.toLocaleString()} rows × ${header.length} columns.`, 'Column summary:'];
  header.forEach((h, c) => {
    const vals = body.map((r) => r[c]).filter((v) => v !== undefined && v !== null && String(v).trim() !== '');
    const blanks = body.length - vals.length;
    const nums = vals.map((v) => (typeof v === 'number' ? v : Number(String(v).replace(/[$,%\s£€]/g, '')))).filter((n) => Number.isFinite(n));
    const dates = vals.filter((v) => v instanceof Date || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)));
    if (vals.length && nums.length >= vals.length * 0.9) {
      // One pass (Math.min(...nums) fails on a column with more than about 125,000 numbers).
      let sum = 0; let lo = Infinity; let hi = -Infinity;
      for (const n of nums) { sum += n; if (n < lo) lo = n; if (n > hi) hi = n; }
      lines.push(`- ${h} (number): count ${nums.length}, sum ${fmt(sum)}, mean ${fmt(sum / nums.length)}, min ${fmt(lo)}, max ${fmt(hi)}${blanks ? `, blanks ${blanks}` : ''}`);
    } else if (vals.length && dates.length >= vals.length * 0.9) {
      const ds = dates.map((v) => (v instanceof Date ? v : new Date(v))).filter((x) => !Number.isNaN(+x)).sort((a, b) => a - b);
      lines.push(`- ${h} (date): ${ds.length} values from ${ds[0]?.toISOString().slice(0, 10)} to ${ds[ds.length - 1]?.toISOString().slice(0, 10)}${blanks ? `, blanks ${blanks}` : ''}`);
    } else {
      const counts = new Map();
      for (const v of vals) counts.set(String(v), (counts.get(String(v)) || 0) + 1);
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => `${k.slice(0, 40)} (${n})`).join(', ');
      lines.push(`- ${h} (text): ${counts.size} distinct values${blanks ? `, blanks ${blanks}` : ''}; most common: ${top}`);
    }
  });
  const show = body.slice(0, maxRows);
  const esc = (v) => { const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  lines.push(`Rows (CSV${body.length > maxRows ? `, first ${maxRows} of ${body.length.toLocaleString()}` : ''}):`);
  lines.push(header.map(esc).join(','));
  for (const r of show) lines.push(header.map((_, c) => esc(r[c])).join(','));
  return lines.join('\n');
}

async function readXlsx(buf) {
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const out = [];
  wb.eachSheet((ws) => {
    const rows = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const vals = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        let v = cell.value;
        if (v && typeof v === 'object') v = v.result ?? v.text ?? (v.richText ? v.richText.map((t) => t.text).join('') : v instanceof Date ? v : v.hyperlink || '');
        vals[col - 1] = v;
      });
      rows.push(vals);
    });
    out.push(profileTable(ws.name, rows));
  });
  return out.join('\n\n');
}

// ---------- other formats ----------

function stripHtml(html) {
  return html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*/g, '\n\n').trim();
}

function readPptx(buf) {
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(buf);
  const slides = zip.getEntries().filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
    .sort((a, b) => Number(a.entryName.match(/\d+/)[0]) - Number(b.entryName.match(/\d+/)[0]));
  return slides.map((e, i) => {
    const xml = e.getData().toString('utf8');
    const text = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(' ');
    return `Slide ${i + 1}: ${text}`;
  }).join('\n');
}

async function extract(file, bufIn) {
  const buf = bufIn || fs.readFileSync(file);
  const ext = path.extname(file).toLowerCase();
  let text;
  let kind = 'document';
  if (ext === '.pdf') {
    const { getDocumentProxy, extractText } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const r = await extractText(pdf, { mergePages: false });
    text = (Array.isArray(r.text) ? r.text : [r.text]).map((t, i) => `[Page ${i + 1}]\n${t}`).join('\n\n');
    if (!text.replace(/\[Page \d+\]/g, '').trim()) text = '(This PDF has no text layer; it is probably scanned. Attach it as images, or as page screenshots, so a vision model can read it.)';
  } else if (ext === '.docx') {
    const mammoth = require('mammoth');
    text = (await mammoth.extractRawText({ buffer: buf })).value;
  } else if (ext === '.xlsx' || ext === '.xlsm') {
    text = await readXlsx(buf); kind = 'spreadsheet';
  } else if (ext === '.csv' || ext === '.tsv') {
    text = profileTable(path.basename(file), parseCSV(buf.toString('utf8'), ext === '.tsv' ? '\t' : null)); kind = 'spreadsheet';
  } else if (ext === '.pptx') {
    text = readPptx(buf);
  } else if (ext === '.html' || ext === '.htm') {
    text = stripHtml(buf.toString('utf8'));
  } else if (TEXT_EXT.test(ext) || !buf.subarray(0, 4096).includes(0)) {
    text = buf.toString('utf8'); kind = TEXT_EXT.test(ext) && !/\.(txt|md|markdown|rtf|log)$/i.test(ext) ? 'code' : 'document';
  } else {
    throw new Error(`Can't read ${path.basename(file)}: unsupported file type. Supported: PDF, Word (.docx), Excel (.xlsx), CSV, PowerPoint (.pptx), web pages and text/code files.`);
  }
  return { name: path.basename(file), kind, text: text.replace(/\u0000/g, ''), chars: text.length };
}

module.exports = { extract, profileTable, parseCSV, SUPPORTED, stripHtml };
