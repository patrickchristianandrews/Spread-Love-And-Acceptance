// Resizable sidebar: drag its right edge to make it wider or narrower, and drag the divider above
// "Chats" to give the menu or the chat list more room. Double-click a handle to reset it.
// Sizes are remembered.
'use strict';

const SIDE = { min: 200, max: 460, def: 264, navMin: 120 };

function applySideSize() {
  const app = document.getElementById('app');
  const nav = document.querySelector('.sidebar .nav');
  if (!app || !S.data) return;
  const w = Number(S.data.prefs.sideWidth) || SIDE.def;
  app.style.setProperty('--side-w', `${Math.max(SIDE.min, Math.min(SIDE.max, w))}px`);
  if (nav && !nav.closest('.side-scroll')) {
    const h = Number(S.data.prefs.navHeight);
    nav.style.maxHeight = h ? `${Math.max(SIDE.navMin, h)}px` : '';
    nav.classList.toggle('sized', Boolean(h));
  }
}

function dragHandle(handle, { onMove, onEnd, onReset, cursor }) {
  handle.addEventListener('dblclick', () => { onReset(); save(); applySideSize(); });
  handle.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    document.body.classList.add('resizing');
    document.body.style.cursor = cursor;
    const move = (ev) => { onMove(ev); applySideSize(); };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      document.body.classList.remove('resizing');
      document.body.style.cursor = '';
      onEnd?.(); save();
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
  });
}

function setUpSidebarResize() {
  const side = document.querySelector('.sidebar');
  const nav = side?.querySelector('.nav');
  if (!side || side.querySelector('.side-resize')) return;
  const edge = document.createElement('div');
  edge.className = 'side-resize';
  edge.title = 'Drag to resize the sidebar (double-click to reset)';
  side.appendChild(edge);
  dragHandle(edge, {
    cursor: 'col-resize',
    onMove: (ev) => { S.data.prefs.sideWidth = Math.round(Math.max(SIDE.min, Math.min(SIDE.max, ev.clientX - side.getBoundingClientRect().left))); },
    onReset: () => { delete S.data.prefs.sideWidth; },
  });
  if (side.querySelector('.side-scroll')) { applySideSize(); return; } // one scrolling menu: no divider needed
  const split = document.createElement('div');
  split.className = 'side-split lbl';
  split.title = 'Drag to give the menu or the chat list more room (double-click to reset)';
  split.innerHTML = '<span></span>';
  nav.after(split);
  dragHandle(split, {
    cursor: 'row-resize',
    onMove: (ev) => {
      const top = nav.getBoundingClientRect().top;
      const room = side.getBoundingClientRect().bottom - top - 220; // keep space for the chat list and footer
      S.data.prefs.navHeight = Math.round(Math.max(SIDE.navMin, Math.min(Math.max(SIDE.navMin, room), ev.clientY - top)));
    },
    onReset: () => { delete S.data.prefs.navHeight; },
  });
  applySideSize();
}
