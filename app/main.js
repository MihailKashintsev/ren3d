const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// ── Один экземпляр приложения ──────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); process.exit(0); }

let win = null;

// ── Путь к обновлённому index.html вне .asar ──────────────
// app.getPath('userData') → C:\Users\...\AppData\Roaming\Ren3D  (Windows)
//                         → ~/.config/Ren3D                      (Linux)
// .asar нельзя изменять — он read-only; userData всегда доступен для записи
const USER_DATA = app.getPath('userData');
const UPDATED_HTML = path.join(USER_DATA, 'index.html');

// Определяем какой index.html загружать:
//   если в userData лежит обновление — берём его,
//   иначе — оригинал из .asar
function getIndexPath() {
    try {
        if (fs.existsSync(UPDATED_HTML)) return UPDATED_HTML;
    } catch { }
    return path.join(__dirname, 'src', 'index.html');
}

function createWindow() {
    win = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        title: 'Ren3D',
        backgroundColor: '#050508',
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false,
            allowRunningInsecureContent: true,
        },
        ...(process.platform === 'darwin'
            ? { titleBarStyle: 'hiddenInset' }
            : { frame: true }
        ),
    });

    win.loadFile(getIndexPath());

    win.once('ready-to-show', () => {
        win.show();
        if (process.env.NODE_ENV === 'development') {
            win.webContents.openDevTools({ mode: 'detach' });
        }
    });

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
                { label: 'Новая сцена', accelerator: 'CmdOrCtrl+N', click: () => win.webContents.executeJavaScript('newScene()') },
                { type: 'separator' },
                { label: 'Импорт .stl / .obj', accelerator: 'CmdOrCtrl+I', click: () => win.webContents.executeJavaScript('doImport()') },
                { type: 'separator' },
                { label: 'Экспорт .stl', accelerator: 'CmdOrCtrl+E', click: () => win.webContents.executeJavaScript('exportSTL()') },
                { label: 'Экспорт .obj', click: () => win.webContents.executeJavaScript('exportOBJ()') },
                { type: 'separator' },
                isMac ? { role: 'close' } : { role: 'quit', label: 'Выход' },
            ],
        },
        {
            label: 'Правка',
            submenu: [
                { label: 'Отмена', accelerator: 'CmdOrCtrl+Z', click: () => win.webContents.executeJavaScript('undo()') },
                { label: 'Повтор', accelerator: 'CmdOrCtrl+Y', click: () => win.webContents.executeJavaScript('redo()') },
                { type: 'separator' },
                { label: 'Дублировать', accelerator: 'CmdOrCtrl+D', click: () => win.webContents.executeJavaScript('duplicateSel()') },
                { label: 'Удалить', accelerator: 'Delete', click: () => win.webContents.executeJavaScript('deleteSel()') },
                { type: 'separator' },
                { label: 'Выделить всё', accelerator: 'CmdOrCtrl+A', click: () => win.webContents.executeJavaScript('selectAll()') },
            ],
        },
        {
            label: 'Вид',
            submenu: [
                { label: 'Перспектива', click: () => win.webContents.executeJavaScript("camView('persp')") },
                { label: 'Спереди', click: () => win.webContents.executeJavaScript("camView('front')") },
                { label: 'Сверху', click: () => win.webContents.executeJavaScript("camView('top')") },
                { label: 'Справа', click: () => win.webContents.executeJavaScript("camView('right')") },
                { type: 'separator' },
                { label: 'Показать всё', accelerator: 'Home', click: () => win.webContents.executeJavaScript('frameAll()') },
                { label: 'Показать выбранное', accelerator: 'F', click: () => win.webContents.executeJavaScript('frameSel()') },
                { type: 'separator' },
                { label: 'Сетка', click: () => win.webContents.executeJavaScript('toggleGrid()') },
                { label: 'Каркас', click: () => win.webContents.executeJavaScript('toggleWire()') },
                { type: 'separator' },
                { role: 'toggleDevTools', label: 'Инструменты разработчика' },
                { role: 'resetZoom', label: 'Сбросить масштаб UI' },
                { role: 'zoomIn', label: 'Увеличить UI' },
                { role: 'zoomOut', label: 'Уменьшить UI' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: 'Полный экран' },
            ],
        },
        {
            label: 'Добавить',
            submenu: [
                { label: '⬛  Куб', accelerator: 'Shift+C', click: () => win.webContents.executeJavaScript("addObj('box')") },
                { label: '🔵  Сфера', accelerator: 'Shift+S', click: () => win.webContents.executeJavaScript("addObj('sphere')") },
                { label: '🔷  Цилиндр', accelerator: 'Shift+Y', click: () => win.webContents.executeJavaScript("addObj('cyl')") },
                { label: '🔺  Конус', accelerator: 'Shift+O', click: () => win.webContents.executeJavaScript("addObj('cone')") },
                { label: '⭕  Тор', accelerator: 'Shift+T', click: () => win.webContents.executeJavaScript("addObj('torus')") },
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
                            type: 'info',
                            title: 'Ren3D',
                            message: 'Ren3D v2.0',
                            detail: 'Локальный 3D-редактор\nРаботает полностью офлайн\n\nПостроен на Electron + Three.js',
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

// ── IPC: авто-обновление ───────────────────────────────────
// ИСПРАВЛЕНО: пишем в userData (вне .asar), а не внутрь архива.
// .asar — read-only файловая система, писать в неё нельзя.
// userData всегда доступен для записи без прав администратора.
ipcMain.handle('update-app', async (_e, html) => {
    try {
        // Убеждаемся что папка userData существует
        fs.mkdirSync(USER_DATA, { recursive: true });

        // Сохраняем резервную копию текущего обновления (если есть)
        if (fs.existsSync(UPDATED_HTML)) {
            fs.copyFileSync(UPDATED_HTML, UPDATED_HTML + '.bak');
        }

        // Пишем новый index.html в userData — это всегда работает
        fs.writeFileSync(UPDATED_HTML, html, 'utf8');
        return { ok: true };
    } catch (err) {
        // Откатываемся к резервной копии при ошибке
        try {
            if (fs.existsSync(UPDATED_HTML + '.bak')) {
                fs.copyFileSync(UPDATED_HTML + '.bak', UPDATED_HTML);
            }
        } catch { }
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('reload-app', () => {
    if (win) {
        // Перезагружаем с правильным путём (может смениться после обновления)
        win.loadFile(getIndexPath());
    }
});

// ── Жизненный цикл ────────────────────────────────────────
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