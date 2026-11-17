// The only bridge between the page and the app. The page can ask which providers are connected,
// save a key into the encrypted vault, and run keyed text — but it never sees a stored key.
'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('studio', {
  providers: () => ipcRenderer.invoke('providers'),
  setKey: (provider, key) => ipcRenderer.invoke('keys:set', { provider, key }),
  text: (opts) => ipcRenderer.invoke('text', opts),
  ptext: (opts) => ipcRenderer.invoke('ptext', opts),
  hordeModels: () => ipcRenderer.invoke('horde:models'),
  hordeImage: (opts) => ipcRenderer.invoke('horde:image', opts),
  deepaiImage: (opts) => ipcRenderer.invoke('deepai:image', opts),
  customList: () => ipcRenderer.invoke('custom:list'),
  customAdd: (opts) => ipcRenderer.invoke('custom:add', opts),
  customRemove: (id) => ipcRenderer.invoke('custom:remove', { id }),
});
