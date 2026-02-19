const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs   = require('fs');

// ── Один экземпляр приложения ──────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); process.exit(0); }

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width:  1440,
    height: 900,
    minWidth:  900,
    minHeight: 600,
    title: 'Ren3D',
    backgroundColor: '#050508',
    show: false,                     // показать после загрузки
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,          // allow loading CDN scripts (Three.js)
      allowRunningInsecureContent: true,
    },
    // ── Оформление окна по платформе ──────────────────────
    ...(process.platform === 'darwin'
      ? { titleBarStyle: 'hiddenInset' }
      : { frame: true }
    ),
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Показать окно только когда контент готов (нет белого flash)
  win.once('ready-to-show', () => {
    win.show();
    if (process.env.NODE_ENV === 'development') {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Внешние ссылки — в браузере, не в Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  buildMenu();
}

// ── Нативное меню ──────────────────────────────────────────
function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'Файл',
      submenu: [
        { label: 'Новая сцена',       accelerator: 'CmdOrCtrl+N', click: () => win.webContents.executeJavaScript('newScene()') },
        { type: 'separator' },
        { label: 'Импорт .stl / .obj', accelerator: 'CmdOrCtrl+I', click: () => win.webContents.executeJavaScript('doImport()') },
        { type: 'separator' },
        { label: 'Экспорт .stl',       accelerator: 'CmdOrCtrl+E', click: () => win.webContents.executeJavaScript('exportSTL()') },
        { label: 'Экспорт .obj',                                    click: () => win.webContents.executeJavaScript('exportOBJ()') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit', label: 'Выход' },
      ],
    },
    {
      label: 'Правка',
      submenu: [
        { label: 'Отмена',         accelerator: 'CmdOrCtrl+Z', click: () => win.webContents.executeJavaScript('undo()') },
        { label: 'Повтор',         accelerator: 'CmdOrCtrl+Y', click: () => win.webContents.executeJavaScript('redo()') },
        { type: 'separator' },
        { label: 'Дублировать',    accelerator: 'CmdOrCtrl+D', click: () => win.webContents.executeJavaScript('duplicateSel()') },
        { label: 'Удалить',        accelerator: 'Delete',       click: () => win.webContents.executeJavaScript('deleteSel()') },
        { type: 'separator' },
        { label: 'Выделить всё',   accelerator: 'CmdOrCtrl+A', click: () => win.webContents.executeJavaScript('selectAll()') },
      ],
    },
    {
      label: 'Вид',
      submenu: [
        { label: 'Перспектива',      click: () => win.webContents.executeJavaScript("camView('persp')") },
        { label: 'Спереди',          click: () => win.webContents.executeJavaScript("camView('front')") },
        { label: 'Сверху',           click: () => win.webContents.executeJavaScript("camView('top')") },
        { label: 'Справа',           click: () => win.webContents.executeJavaScript("camView('right')") },
        { type: 'separator' },
        { label: 'Показать всё',     accelerator: 'Home',        click: () => win.webContents.executeJavaScript('frameAll()') },
        { label: 'Показать выбранное', accelerator: 'F',         click: () => win.webContents.executeJavaScript('frameSel()') },
        { type: 'separator' },
        { label: 'Сетка',            click: () => win.webContents.executeJavaScript('toggleGrid()') },
        { label: 'Каркас',           click: () => win.webContents.executeJavaScript('toggleWire()') },
        { type: 'separator' },
        { role: 'toggleDevTools', label: 'Инструменты разработчика' },
        { role: 'resetZoom',      label: 'Сбросить масштаб UI' },
        { role: 'zoomIn',         label: 'Увеличить UI' },
        { role: 'zoomOut',        label: 'Уменьшить UI' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Полный экран' },
      ],
    },
    {
      label: 'Добавить',
      submenu: [
        { label: '⬛  Куб',       accelerator: 'Shift+C', click: () => win.webContents.executeJavaScript("addObj('box')") },
        { label: '🔵  Сфера',    accelerator: 'Shift+S', click: () => win.webContents.executeJavaScript("addObj('sphere')") },
        { label: '🔷  Цилиндр',  accelerator: 'Shift+Y', click: () => win.webContents.executeJavaScript("addObj('cyl')") },
        { label: '🔺  Конус',    accelerator: 'Shift+O', click: () => win.webContents.executeJavaScript("addObj('cone')") },
        { label: '⭕  Тор',      accelerator: 'Shift+T', click: () => win.webContents.executeJavaScript("addObj('torus')") },
        { label: '⬜  Плоскость', accelerator: 'Shift+P', click: () => win.webContents.executeJavaScript("addObj('plane')") },
      ],
    },
    {
      label: 'Справка',
      submenu: [
        {
          label: 'О программе',
          click: () => {
            dialog.showMessageBox(win, {
              type:    'info',
              title:   'Ren3D',
              message: 'Ren3D v2.0',
              detail:  'Локальный 3D-редактор\nРаботает полностью офлайн\n\nПостроен на Electron + Three.js',
              buttons: ['OK'],
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── IPC: нативный диалог сохранения файла ─────────────────
// Вызывается из renderer через contextBridge (preload.js)
ipcMain.handle('save-file', async (_e, { defaultName, content }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: defaultName,
    filters: [
      { name: 'STL Files', extensions: ['stl'] },
      { name: 'OBJ Files', extensions: ['obj'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (canceled || !filePath) return { ok: false };
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return { ok: true, filePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── IPC: нативный диалог открытия файла ───────────────────
ipcMain.handle('open-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [
      { name: '3D Models', extensions: ['stl', 'obj'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (canceled || !filePaths.length) return null;
  try {
    const content = fs.readFileSync(filePaths[0]);
    return { name: path.basename(filePaths[0]), buffer: content.buffer, path: filePaths[0] };
  } catch (err) {
    return null;
  }
});

// ── Жизненный цикл ────────────────────────────────────────
// ── Auto-updater IPC ─────────────────────────────────────────
ipcMain.handle('update-app', async (_e, html) => {
  const indexPath = path.join(__dirname, 'src', 'index.html');
  try {
    // Backup current version
    fs.writeFileSync(indexPath + '.bak', fs.readFileSync(indexPath));
    // Write new version
    fs.writeFileSync(indexPath, html, 'utf8');
    return { ok: true };
  } catch (err) {
    // Restore backup on failure
    try { fs.writeFileSync(indexPath, fs.readFileSync(indexPath + '.bak')); } catch {}
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('reload-app', () => {
  if (win) win.webContents.reloadIgnoringCache();
});

app.whenReady().then(createWindow);

app.on('second-instance', () => {
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
