const { contextBridge, ipcRenderer } = require('electron');

// Безопасный мост между renderer (браузер) и main process (Node.js)
// Только явно разрешённые методы попадают в window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
    saveFile: (defaultName, content) => ipcRenderer.invoke('save-file', { defaultName, content }),
    openFile: () => ipcRenderer.invoke('open-file'),
    updateApp: (html) => ipcRenderer.invoke('update-app', html),
    reloadApp: () => ipcRenderer.invoke('reload-app'),
    platform: process.platform,

    // FIX LINUX CTRL SHORTCUTS:
    // main.js перехватывает Ctrl+клавиши через before-input-event и присылает сюда.
    // onCtrlKey — коллбэк который index.html регистрирует через electronAPI.onCtrlKey(fn)
    onCtrlKey: (callback) => ipcRenderer.on('ctrl-key', (_e, data) => callback(data)),
});