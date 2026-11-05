// Stands in for preload.js when the page is opened in a plain browser (UI tests).
// Saves to localStorage and "streams" a canned reply instead of calling Claude.
(() => {
  const L = { delta: [], done: [], error: [] };
  const timers = {};
  window.__lastRequest = null;
  window.quicksilver = {
    load: async () => JSON.parse(localStorage.getItem('qs') || 'null'),
    save: async (d) => { localStorage.setItem('qs', JSON.stringify(d)); return true; },
    keyStatus: async () => ({ hasKey: localStorage.getItem('qs-key') !== null, fromEnv: false, encrypted: true }),
    setKey: async (k) => { k ? localStorage.setItem('qs-key', k) : localStorage.removeItem('qs-key'); return true; },
    send: (p) => {
      window.__lastRequest = p;
      const words = '*Marlow leans back, the chair creaking.* "Funny. You don\'t look like trouble." *He slides a notepad across the desk.* "Start from the beginning."'.split(' ');
      let i = 0;
      timers[p.requestId] = setInterval(() => {
        if (i < words.length) { L.delta.forEach((f) => f({ requestId: p.requestId, text: (i ? ' ' : '') + words[i++] })); return; }
        clearInterval(timers[p.requestId]);
        L.done.forEach((f) => f({ requestId: p.requestId, stopReason: 'end_turn' }));
      }, 15);
    },
    abort: (id) => { clearInterval(timers[id]); L.error.forEach((f) => f({ requestId: id, message: 'Stopped.', aborted: true })); },
    onDelta: (f) => L.delta.push(f), onDone: (f) => L.done.push(f), onError: (f) => L.error.push(f),
    exportFile: async () => true, importFiles: async () => [],
  };
})();
