const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  onStatus: (cb) => ipcRenderer.on('boot-status', (_e, payload) => cb(payload)),
  openLogs: () => ipcRenderer.send('open-logs'),
  retry: () => ipcRenderer.send('boot-retry'),
});
