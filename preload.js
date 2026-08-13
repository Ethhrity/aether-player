const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getLibrary: () => ipcRenderer.invoke('get-library'),
  scanFolder: () => ipcRenderer.invoke('scan-folder'),
  clearLibrary: () => ipcRenderer.invoke('clear-library'),
  onMediaControl: (callback) => ipcRenderer.on('media-control', (event, command) => callback(command))
});