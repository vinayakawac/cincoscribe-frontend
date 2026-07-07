const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  validate: (key) => ipcRenderer.invoke('validate', key),
  getFingerprint: () => ipcRenderer.invoke('get-fingerprint'),
  storeActivation: (key, fingerprint) => ipcRenderer.send('store-activation', key, fingerprint),
  getStoredActivation: () => ipcRenderer.invoke('get-stored-activation'),
  activationComplete: () => ipcRenderer.send('activation-complete'),
  deactivate: (key) => ipcRenderer.invoke('deactivate', key),
  clearActivation: () => ipcRenderer.send('clear-activation'),
  deactivationComplete: () => ipcRenderer.send('deactivation-complete')
});
