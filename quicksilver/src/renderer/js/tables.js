// Every list table in the app (models, trending, leaderboards, compare, your PC, knowledge…)
// can be sorted and filtered from its column headers: click a header to sort by it (again to
// reverse), and use the row under the headers to filter. A column with a handful of different
// values gets a menu to pick one; any other column gets a search box. Filters and sorting are
// kept when the page redraws. Tables with fewer than 4 rows, or marked .no-tools, are left alone.
'use strict';

const tableState = new Map(); // table key (its headers) -> { sort: col, dir: 1|-1, filters: { col: value } }
const tableKey = (t) => [...t.tHead.rows[0].cells].map((c) => c.dataset.label || c.textContent.trim()).join('|');
const cellText = (row, i) => (row.cells[i]?.dataset.sort ?? row.cells[i]?.textContent ?? '').replace(/\s+/g, ' ').trim();
// "1,234", "~4.2 GB", "7/10", "★ 8", "-3" sort as numbers; everything else as text.
const asNumber = (s) => { const m = String(s).replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : null; };

function enhanceTable(t) {
  if (t.dataset.tools || t.classList.contains('no-tools') || !t.tHead?.rows.length || !t.tBodies[0]) return;
  const rows = [...t.tBodies[0].rows];
  if (rows.length < 4) return;
  t.dataset.tools = '1';
  const head = t.tHead.rows[0];
  const cols = [...head.cells];
  const key = tableKey(t);
  const st = tableState.get(key) || { sort: null, dir: 1, filters: {} };
  tableState.set(key, st);
  // Which columns can be filtered: those with a heading and some text in their cells.
  const usable = cols.map((c, i) => Boolean(c.textContent.trim()) && rows.some((r) => cellText(r, i)));
  const filterRow = document.createElement('tr');
  filterRow.className = 'tbl-filters';
  cols.forEach((c, i) => {
    const th = document.createElement('th');
    if (usable[i]) {
      const values = [...new Set(rows.map((r) => cellText(r, i)).filter(Boolean))];
      const label = c.textContent.trim();
      if (values.length <= 12 && values.length > 1) {
        const sel = document.createElement('select');
        sel.className = 'tbl-filter'; sel.dataset.col = i; sel.setAttribute('aria-label', `Show only this ${label}`);
        sel.innerHTML = `<option value="">All</option>${values.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((v) => `<option>${esc(v)}</option>`).join('')}`;
        sel.value = st.filters[i] || '';
        th.appendChild(sel);
      } else if (values.length > 12) {
        const inp = document.createElement('input');
        inp.type = 'search'; inp.className = 'tbl-filter'; inp.dataset.col = i; inp.placeholder = 'Filter…'; inp.setAttribute('aria-label', `Filter by ${label}`);
        inp.value = st.filters[i] || '';
        th.appendChild(inp);
      }
    }
    filterRow.appendChild(th);
  });
  t.tHead.appendChild(filterRow);
  cols.forEach((c, i) => {
    if (!usable[i]) return;
    c.classList.add('tbl-sortable'); c.tabIndex = 0; c.title = 'Click to sort';
    const go = () => { st.dir = st.sort === i ? -st.dir : 1; st.sort = i; applyTable(t, st); };
    c.addEventListener('click', go);
    c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
  filterRow.querySelectorAll('.tbl-filter').forEach((f) => f.addEventListener(f.tagName === 'SELECT' ? 'change' : 'input', () => {
    if (f.value) st.filters[f.dataset.col] = f.value; else delete st.filters[f.dataset.col];
    applyTable(t, st);
  }));
  t._rows = rows;
  applyTable(t, st);
}

function applyTable(t, st) {
  const body = t.tBodies[0];
  const rows = t._rows || [...body.rows];
  const fs = Object.entries(st.filters).filter(([, v]) => v);
  let shown = 0;
  for (const r of rows) {
    const ok = fs.every(([i, v]) => { const txt = cellText(r, Number(i)); const sel = t.tHead.querySelector(`.tbl-filter[data-col="${i}"]`); return sel?.tagName === 'SELECT' ? txt === v : txt.toLowerCase().includes(v.toLowerCase()); });
    r.hidden = !ok; if (ok) shown++;
  }
  if (st.sort != null) {
    const i = st.sort;
    const sorted = [...rows].sort((a, b) => {
      const x = cellText(a, i); const y = cellText(b, i);
      const nx = asNumber(x); const ny = asNumber(y);
      const c = nx != null && ny != null ? nx - ny : x.localeCompare(y, undefined, { numeric: true, sensitivity: 'base' });
      return c * st.dir;
    });
    for (const r of sorted) body.appendChild(r);
  }
  [...t.tHead.rows[0].cells].forEach((c, i) => { c.dataset.sortDir = st.sort === i ? (st.dir > 0 ? 'asc' : 'desc') : ''; c.setAttribute('aria-sort', st.sort === i ? (st.dir > 0 ? 'ascending' : 'descending') : 'none'); });
  let note = t.nextElementSibling?.classList.contains('tbl-count') ? t.nextElementSibling : null;
  if (fs.length) {
    if (!note) { note = document.createElement('div'); note.className = 'tbl-count small muted'; t.after(note); }
    note.innerHTML = `Showing ${shown} of ${rows.length}. <a href="#">Clear filters</a>`;
    note.querySelector('a').onclick = (e) => { e.preventDefault(); st.filters = {}; t.tHead.querySelectorAll('.tbl-filter').forEach((f) => { f.value = ''; }); applyTable(t, st); };
  } else note?.remove();
}

function enhanceTables(root = document) { root.querySelectorAll('table.list').forEach(enhanceTable); }
// Tables appear whenever a page or a box is drawn: enhance them as they arrive.
new MutationObserver((muts) => { if (muts.some((m) => m.addedNodes.length)) enhanceTables(); }).observe(document.documentElement, { childList: true, subtree: true });
