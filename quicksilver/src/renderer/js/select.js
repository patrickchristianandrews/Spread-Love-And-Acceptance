// Dropdown menus drawn by Quicksilver instead of Windows, so they match the theme and are always
// readable. Works for every <select> in the app (now and later): clicking it, or pressing Enter,
// Space or ↓ on it, opens this menu instead of the system one. The <select> stays the source of
// truth: choosing an item sets its value and fires the usual "change" event.
'use strict';

const qsSelect = (() => {
  let pop = null;
  let current = null;
  let items = [];
  let hot = -1;
  let typed = '';
  let typedAt = 0;

  const close = (focus = true) => {
    if (!pop) return;
    pop.remove(); pop = null;
    if (focus) current?.focus();
    current?.classList.remove('sel-open');
    current = null;
  };

  const setHot = (i) => {
    if (!items.length) return;
    let n = Math.max(0, Math.min(items.length - 1, i));
    hot = n;
    pop.querySelectorAll('.sel-item').forEach((el, k) => el.classList.toggle('hot', k === n));
    pop.querySelectorAll('.sel-item')[n]?.scrollIntoView({ block: 'nearest' });
  };

  const choose = (i) => {
    const it = items[i];
    if (!it || it.disabled) return;
    const sel = current;
    close();
    if (sel.value !== it.value) {
      sel.value = it.value;
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  function open(sel) {
    if (sel.disabled || sel.multiple || sel.size > 1) return false;
    close(false);
    current = sel;
    sel.classList.add('sel-open');
    items = [];
    const esc2 = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    let html = '';
    for (const node of sel.children) {
      if (node.tagName === 'OPTGROUP') {
        html += `<div class="sel-group">${esc2(node.label)}</div>`;
        for (const o of node.children) html += row(o);
      } else if (node.tagName === 'OPTION') html += row(node);
    }
    function row(o) {
      const i = items.length;
      items.push({ value: o.value, disabled: o.disabled, text: o.textContent });
      return `<div class="sel-item ${o.selected ? 'sel' : ''} ${o.disabled ? 'off' : ''}" role="option" aria-selected="${o.selected}" data-i="${i}"><span class="sel-check">${o.selected ? '✓' : ''}</span><span class="sel-text">${esc2(o.textContent)}</span></div>`;
    }
    pop = document.createElement('div');
    pop.className = 'sel-pop';
    pop.setAttribute('role', 'listbox');
    pop.innerHTML = html || '<div class="sel-group">Nothing to choose</div>';
    document.body.appendChild(pop);
    // Place it under the select (or above, if there's no room), at least as wide as the select.
    const r = sel.getBoundingClientRect();
    const w = Math.max(r.width, 200);
    pop.style.minWidth = `${w}px`;
    pop.style.maxWidth = `${Math.max(w, Math.min(520, window.innerWidth - 24))}px`;
    const ph = Math.min(pop.scrollHeight, 360);
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const down = below >= ph || below >= above;
    const room = Math.max(120, down ? below : above);
    const h = Math.min(ph, room);
    pop.style.maxHeight = `${room}px`;
    pop.style.top = `${down ? r.bottom + 6 : Math.max(8, r.top - h - 6)}px`;
    pop.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - pop.offsetWidth - 8))}px`;
    pop.addEventListener('mousedown', (e) => e.preventDefault());
    pop.addEventListener('click', (e) => { const el = e.target.closest('.sel-item'); if (el) choose(Number(el.dataset.i)); });
    pop.addEventListener('mousemove', (e) => { const el = e.target.closest('.sel-item'); if (el && Number(el.dataset.i) !== hot) setHot(Number(el.dataset.i)); });
    setHot(Math.max(0, sel.selectedIndex >= 0 ? items.findIndex((x) => x.value === sel.value) : 0));
    return true;
  }

  // Open on click instead of the system list.
  document.addEventListener('mousedown', (e) => {
    const sel = e.target.closest?.('select');
    if (pop && !e.target.closest('.sel-pop')) { const was = current; close(false); if (sel && sel === was) { e.preventDefault(); return; } }
    if (!sel || e.button !== 0) return;
    if (open(sel)) { e.preventDefault(); sel.focus(); }
  }, true);

  document.addEventListener('keydown', (e) => {
    const sel = e.target.closest?.('select');
    if (pop && current) {
      const move = { ArrowDown: 1, ArrowUp: -1, PageDown: 8, PageUp: -8 }[e.key];
      if (move) { e.preventDefault(); let i = hot + move; while (items[i]?.disabled && i > 0 && i < items.length - 1) i += Math.sign(move); setHot(i); return; }
      if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); setHot(e.key === 'Home' ? 0 : items.length - 1); return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(hot); return; }
      if (e.key === 'Escape' || e.key === 'Tab') { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); } close(e.key === 'Escape'); return; }
      if (e.key.length === 1) {
        // Type to jump to an item.
        typed = Date.now() - typedAt > 700 ? e.key.toLowerCase() : typed + e.key.toLowerCase();
        typedAt = Date.now();
        const i = items.findIndex((x) => !x.disabled && x.text.trim().toLowerCase().startsWith(typed));
        if (i >= 0) setHot(i);
        e.preventDefault();
      }
      return;
    }
    if (sel && (e.key === 'Enter' || e.key === ' ' || (e.key === 'ArrowDown' && e.altKey) || e.key === 'F4')) { if (open(sel)) e.preventDefault(); }
  }, true);

  window.addEventListener('resize', () => close(false));
  // Close only when the dropdown itself moves (a scroll of something that contains it), not when
  // another part of the page scrolls, such as the chat following a new answer.
  document.addEventListener('scroll', (e) => { if (pop && current && !pop.contains(e.target) && (e.target === document || e.target.contains?.(current))) close(false); }, true);
  window.addEventListener('blur', () => close(false));

  return { open, close, isOpen: () => Boolean(pop) };
})();
