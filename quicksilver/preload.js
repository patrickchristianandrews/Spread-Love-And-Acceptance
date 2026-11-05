// The only bridge between the page and the main process. The page gets these
// functions and nothing else (no Node, no file system, no API key).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('quicksilver', {
  load: () => ipcRenderer.invoke('store:load'),
  save: (data) => ipcRenderer.invoke('store:save', data),

  keyStatus: () => ipcRenderer.invoke('key:status'),
  setKey: (key) => ipcRenderer.invoke('key:set', key),

  send: (payload) => ipcRenderer.send('chat:send', payload),
  abort: (requestId) => ipcRenderer.send('chat:abort', requestId),
  onDelta: (fn) => ipcRenderer.on('chat:delta', (_e, d) => fn(d)),
  onDone: (fn) => ipcRenderer.on('chat:done', (_e, d) => fn(d)),
  onError: (fn) => ipcRenderer.on('chat:error', (_e, d) => fn(d)),

  exportFile: (suggestedName, json) => ipcRenderer.invoke('file:export', { suggestedName, json }),
  importFiles: () => ipcRenderer.invoke('file:import'),
});
