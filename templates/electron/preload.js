// Preload — exposes a tiny, safe IPC bridge to the renderer (contextIsolation: true).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pet', {
  getWorkArea: () => ipcRenderer.invoke('pet:getWorkArea'),
  setPosition: (x, y) => ipcRenderer.invoke('pet:setPosition', x, y),
  quit: () => ipcRenderer.send('pet:quit'),
});
