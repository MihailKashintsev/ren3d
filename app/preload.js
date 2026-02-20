const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveFile: (defaultName, content) => ipcRenderer.invoke('save-file', { defaultName, content }),
    openFile: () => ipcRenderer.invoke('open-file'),
    updateApp: (html) => ipcRenderer.invoke('update-app', html),
    reloadApp: () => ipcRenderer.invoke('reload-app'),
    downloadUrl: (url) => ipcRenderer.invoke('download-url', url),
    platform: process.platform,

    // FIX LINUX CTRL+KEY:
    // main.js перехватывает Ctrl+клавиши через before-input-event
    // и присылает их сюда. index.html вызывает onCtrlKey(callback)
    // чтобы получать эти события и обрабатывать как обычные горячие клавиши.
    onCtrlKey: (cb) => ipcRenderer.on('main-ctrl-key', (_e, data) => cb(data)),
});