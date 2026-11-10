// Chat tabs: keep several chats open and switch between them. Chats opened from the sidebar or
// started new open as tabs. Ctrl+T new tab, Ctrl+W close tab, Ctrl+Tab / Ctrl+Shift+Tab switch.
'use strict';

const MAX_TABS = 12;

function openTabs() {
  const ids = (S.data.prefs.tabs || []).filter((id) => chatById(id));
  if (ids.length !== (S.data.prefs.tabs || []).length) S.data.prefs.tabs = ids;
  return ids;
}

function ensureTab(id) {
  const tabs = openTabs();
  if (tabs.includes(id)) return;
  tabs.push(id);
  while (tabs.length > MAX_TABS) tabs.splice(tabs.findIndex((x) => x !== id), 1);
  S.data.prefs.tabs = tabs;
  save();
}

function closeTab(id) {
  const tabs = openTabs();
  const i = tabs.indexOf(id);
  if (i < 0) return;
  tabs.splice(i, 1);
  S.data.prefs.tabs = tabs;
  save();
  if (S.route.view === 'chat' && S.route.id === id) {
    const next = tabs[Math.min(i, tabs.length - 1)];
    if (next) go({ view: 'chat', id: next }); else newChat();
  } else render();
}

function tabsHTML(current) {
  const tabs = openTabs();
  if (tabs.length < 2) return ''; // one chat: no tab bar until a second one is opened
  return `<div class="chat-tabs" role="tablist">${tabs.map((id) => {
    const c = chatById(id);
    const a = assistantById(c.assistantId);
    const busy = pending?.chatId === id;
    return `<div class="ctab ${id === current.id ? 'on' : ''}" role="tab" aria-selected="${id === current.id}" data-tab-id="${esc(id)}" title="${esc(c.title)}">
      <span class="ctab-ic">${busy ? '<span class="pulse"></span>' : esc(a.emoji)}</span><span class="ctab-t">${esc(c.title === 'New chat' && !c.messages.length ? 'New chat' : c.title)}</span>
      <button class="ctab-x" data-tab-close="${esc(id)}" title="Close tab (Ctrl+W)" aria-label="Close tab">×</button></div>`;
  }).join('')}<button class="tab-new" id="tab-new" title="New chat in a new tab (Ctrl+T)" aria-label="New tab">${icon('plus', 15)}</button></div>`;
}

function bindTabs() {
  $$('[data-tab-id]').forEach((el) => {
    el.addEventListener('click', (e) => { if (!e.target.closest('[data-tab-close]')) go({ view: 'chat', id: el.dataset.tabId }); });
    el.addEventListener('auxclick', (e) => { if (e.button === 1) { e.preventDefault(); closeTab(el.dataset.tabId); } });
  });
  $$('[data-tab-close]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); closeTab(b.dataset.tabClose); }));
  $('#tab-new')?.addEventListener('click', () => newChat());
}

document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || !S.data) return;
  const k = e.key.toLowerCase();
  if (k === 't' && !e.shiftKey) { e.preventDefault(); newChat(); return; }
  if (S.route.view !== 'chat') return;
  if (k === 'w') { e.preventDefault(); closeTab(S.route.id); return; }
  if (e.key === 'Tab') {
    e.preventDefault();
    const tabs = openTabs();
    if (tabs.length < 2) return;
    const i = tabs.indexOf(S.route.id);
    go({ view: 'chat', id: tabs[(i + (e.shiftKey ? -1 : 1) + tabs.length) % tabs.length] });
  }
});
