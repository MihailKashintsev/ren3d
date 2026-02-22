const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // saveAs=true  → всегда показывает диалог
    // saveAs=false + filePath → сохраняет без диалога (Shift+S)
    saveFile: (defaultName, content, { filters, filePath, saveAs } = {}) =>
        ipcRenderer.invoke('save-file', { defaultName, content, filters, filePath, saveAs }),

    openFile:    ()     => ipcRenderer.invoke('open-file'),
    updateApp:   (html) => ipcRenderer.invoke('update-app', html),
    reloadApp:   ()     => ipcRenderer.invoke('reload-app'),
    downloadUrl: (url)  => ipcRenderer.invoke('download-url', url),
    platform: process.platform,

    // Linux: main.js перехватывает Shift+key через before-input-event
    // и пересылает сюда. index.html слушает через onShiftKey(callback).
    onShiftKey: (cb) => ipcRenderer.on('main-shift-key', (_e, data) => cb(data)),

    // Оставляем для обратной совместимости (старые версии)
    onCtrlKey:  (cb) => ipcRenderer.on('main-ctrl-key',  (_e, data) => cb(data)),
});
