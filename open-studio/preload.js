// The only bridge between the page and the app. The page can ask which providers are connected,
// save a key into the encrypted vault, and run keyed text — but it never sees a stored key.
'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('studio', {
  providers: () => ipcRenderer.invoke('providers'),
  setKey: (provider, key) => ipcRenderer.invoke('keys:set', { provider, key }),
  text: (opts) => ipcRenderer.invoke('text', opts),
});
