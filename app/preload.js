const { contextBridge, ipcRenderer } = require('electron');

// Безопасный мост между renderer (браузер) и main process (Node.js)
// Только явно разрешённые методы попадают в window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', {

  // Сохранить файл через нативный диалог ОС
  saveFile: (defaultName, content) =>
    ipcRenderer.invoke('save-file', { defaultName, content }),

  // Открыть файл через нативный диалог ОС
  openFile: () =>
    ipcRenderer.invoke('open-file'),

  // Платформа (для условного UI если понадобится)
  platform: process.platform,   // 'win32' | 'linux' | 'darwin'
});
