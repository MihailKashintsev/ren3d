const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // saveAs=true  → всегда показывает диалог
    // saveAs=false + filePath → сохраняет без диалога (Ctrl+S)
    saveFile: (defaultName, content, { filters, filePath, saveAs } = {}) =>
        ipcRenderer.invoke('save-file', { defaultName, content, filters, filePath, saveAs }),

    openFile: () => ipcRenderer.invoke('open-file'),
    updateApp: (html) => ipcRenderer.invoke('update-app', html),
    reloadApp: () => ipcRenderer.invoke('reload-app'),
    downloadUrl: (url) => ipcRenderer.invoke('download-url', url),
    platform: process.platform,

    // FIX LINUX CTRL+KEY
    onCtrlKey: (cb) => ipcRenderer.on('main-ctrl-key', (_e, data) => cb(data)),
});