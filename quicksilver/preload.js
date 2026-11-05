// The only bridge between the page and the main process. The page gets these
// functions and nothing else (no Node, no file system, no keys).
const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (fn) => ipcRenderer.on(channel, (_e, d) => fn(d));

contextBridge.exposeInMainWorld('quicksilver', {
  load: () => ipcRenderer.invoke('store:load'),
  save: (data) => ipcRenderer.invoke('store:save', data),

  keyStatus: () => ipcRenderer.invoke('key:status'),
  setKey: (key) => ipcRenderer.invoke('key:set', key),

  send: (payload) => ipcRenderer.send('chat:send', payload),
  abort: (requestId) => ipcRenderer.send('chat:abort', requestId),
  onDelta: on('chat:delta'),
  onDone: on('chat:done'),
  onError: on('chat:error'),
  onStatus: on('chat:status'),

  hardware: () => ipcRenderer.invoke('system:hardware'),
  advise: (job) => ipcRenderer.invoke('advisor:advise', job),

  models: () => ipcRenderer.invoke('models:list'),
  downloadModel: (req) => ipcRenderer.invoke('models:download', req),
  cancelDownload: (id) => ipcRenderer.invoke('models:cancel', id),
  importModel: () => ipcRenderer.invoke('models:import'),
  deleteModel: (id) => ipcRenderer.invoke('models:delete', id),
  openModelsFolder: () => ipcRenderer.invoke('models:folder'),
  onModelProgress: on('models:progress'),
  onModelDone: on('models:done'),
  onModelError: on('models:error'),

  exportFile: (suggestedName, json) => ipcRenderer.invoke('file:export', { suggestedName, json }),
  importFiles: () => ipcRenderer.invoke('file:import'),
});
