// The only bridge between the interface and the main process. The page gets these functions
// and nothing else: no Node, no direct file system access, no keys.
const { contextBridge, ipcRenderer, webUtils } = require('electron');

// Every call resolves to its value or throws a plain Error with a readable message.
const call = async (ch, ...args) => {
  const r = await ipcRenderer.invoke(ch, ...args);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};
const on = (ch) => (fn) => ipcRenderer.on(ch, (_e, d) => fn(d));

contextBridge.exposeInMainWorld('qs', {
  call,
  sendChat: (payload) => ipcRenderer.send('chat:send', payload),
  abortChat: (id) => ipcRenderer.send('chat:abort', id),
  approve: (answer) => ipcRenderer.send('chat:approval', answer),
  onChat: on('chat:event'),
  onModelProgress: on('models:progress'),
  onModelDone: on('models:done'),
  onModelError: on('models:error'),
  onMedia: on('media:event'),
  onLibrary: on('library:progress'),
  onEngine: on('engines:progress'),
  onBench: on('bench:status'),
  pathForFile: (file) => { try { return webUtils.getPathForFile(file); } catch { return ''; } },
});
