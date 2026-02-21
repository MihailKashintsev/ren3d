const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

// ── Один экземпляр ─────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); process.exit(0); }

let win = null;

// ── userData для обновлений (вне .asar, всегда writable) ───
const USER_DATA = app.getPath('userData');
const UPDATED_HTML = path.join(USER_DATA, 'index.html');

function getIndexPath() {
    try { if (fs.existsSync(UPDATED_HTML)) return UPDATED_HTML; } catch { }
    return path.join(__dirname, 'src', 'index.html');
}

function createWindow() {
    win = new BrowserWindow({
        width: 1440, height: 900, minWidth: 900, minHeight: 600,
        title: 'Ren3D', backgroundColor: '#050508', show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false,
            allowRunningInsecureContent: true,
        },
        ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' } : { frame: true }),
    });

    win.loadFile(getIndexPath());

    // ── FIX LINUX CTRL+KEY ─────────────────────────────────────
    // На Linux Electron перехватывает Ctrl+клавиши через нативное меню
    // раньше чем они попадают в renderer. before-input-event срабатывает
    // до любой обработки Electron — здесь мы их перехватываем,
    // пересылаем в renderer через IPC и блокируем стандартную обработку.
    win.webContents.on('before-input-event', (event, input) => {
        if (input.type !== 'keyDown') return;
        if (!input.control && !input.meta) return;
        win.webContents.send('main-ctrl-key', {
            key: input.key.toLowerCase(),
            shift: input.shift,
        });
        event.preventDefault();
    });

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

// ── Меню (accelerator убраны с Ctrl+X — конфликтуют с before-input-event) ──
function buildMenu() {
    const isMac = process.platform === 'darwin';
    const template = [
        ...(isMac ? [{ role: 'appMenu' }] : []),
        {
            label: 'Файл',
            submenu: [
                { label: 'Новая сцена        Ctrl+N', click: () => win.webContents.executeJavaScript('newScene()') },
                { type: 'separator' },
                { label: 'Импорт .stl/.obj   Ctrl+I', click: () => win.webContents.executeJavaScript('doImport()') },
                { type: 'separator' },
                { label: 'Экспорт .stl       Ctrl+E', click: () => win.webContents.executeJavaScript('exportSTL()') },
                { label: 'Экспорт .obj', click: () => win.webContents.executeJavaScript('exportOBJ()') },
                { type: 'separator' },
                isMac ? { role: 'close' } : { role: 'quit', label: 'Выход' },
            ],
        },
        {
            label: 'Правка',
            submenu: [
                { label: 'Отмена              Ctrl+Z', click: () => win.webContents.executeJavaScript('undo()') },
                { label: 'Повтор              Ctrl+Y', click: () => win.webContents.executeJavaScript('redo()') },
                { type: 'separator' },
                { label: 'Дублировать         Ctrl+D', click: () => win.webContents.executeJavaScript('duplicateSel()') },
                { label: 'Удалить             Del', click: () => win.webContents.executeJavaScript('deleteSel()') },
                { type: 'separator' },
                { label: 'Выделить всё        Ctrl+A', click: () => win.webContents.executeJavaScript('selectAll()') },
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
                { label: 'Показать всё      Home', click: () => win.webContents.executeJavaScript('frameAll()') },
                { label: 'Показать выбранное  F', click: () => win.webContents.executeJavaScript('frameSel()') },
                { type: 'separator' },
                { label: 'Сетка              T', click: () => win.webContents.executeJavaScript('toggleGrid()') },
                { label: 'Каркас             Z', click: () => win.webContents.executeJavaScript('toggleWire()') },
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
                { label: '⬛  Куб          Shift+C', click: () => win.webContents.executeJavaScript("addObj('box')") },
                { label: '🔵  Сфера       Shift+S', click: () => win.webContents.executeJavaScript("addObj('sphere')") },
                { label: '🔷  Цилиндр     Shift+Y', click: () => win.webContents.executeJavaScript("addObj('cyl')") },
                { label: '🔺  Конус       Shift+O', click: () => win.webContents.executeJavaScript("addObj('cone')") },
                { label: '⭕  Тор         Shift+T', click: () => win.webContents.executeJavaScript("addObj('torus')") },
                { label: '⬜  Плоскость   Shift+P', click: () => win.webContents.executeJavaScript("addObj('plane')") },
            ],
        },
        {
            label: 'Справка',
            submenu: [{
                label: 'О программе',
                click: () => dialog.showMessageBox(win, {
                    type: 'info', title: 'Ren3D', message: 'Ren3D v2.0',
                    detail: 'Локальный 3D-редактор\nРаботает полностью офлайн\n\nПостроен на Electron + Three.js',
                    buttons: ['OK'],
                }),
            }],
        },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── IPC: сохранение файла ──────────────────────────────────
// filters — опциональный массив { name, extensions[] }
// saveAs  — если false и filePath передан, сохраняем без диалога
ipcMain.handle('save-file', async (_e, { defaultName, content, filters, filePath: existingPath, saveAs }) => {
    let filePath = existingPath;

    // Открываем диалог если saveAs=true или нет существующего пути
    if (saveAs || !filePath) {
        const ext = (defaultName || '').split('.').pop().toLowerCase();
        const defaultFilters = ext === 'r3d'
            ? [{ name: 'Ren3D Project', extensions: ['r3d'] }, { name: 'All Files', extensions: ['*'] }]
            : ext === 'stl'
                ? [{ name: 'STL Files', extensions: ['stl'] }, { name: 'All Files', extensions: ['*'] }]
                : ext === 'obj'
                    ? [{ name: 'OBJ Files', extensions: ['obj'] }, { name: 'All Files', extensions: ['*'] }]
                    : [{ name: 'All Files', extensions: ['*'] }];

        const result = await dialog.showSaveDialog(win, {
            defaultPath: defaultName,
            filters: filters || defaultFilters,
        });
        if (result.canceled || !result.filePath) return { ok: false };
        filePath = result.filePath;
    }

    try {
        fs.writeFileSync(filePath, content, 'utf8');
        return { ok: true, filePath };
    } catch (err) {
        return { ok: false, error: err.message };
    }
});

// ── IPC: открытие файла ────────────────────────────────────
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
    } catch { return null; }
});

// ── IPC: авто-обновление (пишем в userData, не в .asar) ───
ipcMain.handle('update-app', async (_e, html) => {
    try {
        fs.mkdirSync(USER_DATA, { recursive: true });
        if (fs.existsSync(UPDATED_HTML)) {
            fs.copyFileSync(UPDATED_HTML, UPDATED_HTML + '.bak');
        }
        fs.writeFileSync(UPDATED_HTML, html, 'utf8');
        return { ok: true };
    } catch (err) {
        try {
            if (fs.existsSync(UPDATED_HTML + '.bak')) {
                fs.copyFileSync(UPDATED_HTML + '.bak', UPDATED_HTML);
            }
        } catch { }
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('reload-app', () => {
    if (win) win.loadFile(getIndexPath());
});

// ── IPC: скачивание URL через main process ────────────────
// На Linux renderer не может напрямую скачать index.html с GitHub
// из-за CORS/webSecurity ограничений в Electron. Делаем в main process.
ipcMain.handle('download-url', (_e, url) => new Promise((resolve) => {
    const get = (url, hops = 0) => {
        if (hops > 5) return resolve({ ok: false, error: 'Too many redirects' });
        const mod = url.startsWith('https') ? https : http;
        mod.get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return get(res.headers.location, hops + 1);
            }
            if (res.statusCode !== 200) return resolve({ ok: false, error: `HTTP ${res.statusCode}` });
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve({ ok: true, data: Buffer.concat(chunks).toString('utf8') }));
            res.on('error', e => resolve({ ok: false, error: e.message }));
        }).on('error', e => resolve({ ok: false, error: e.message }));
    };
    get(url);
}));

// ── Жизненный цикл ────────────────────────────────────────
app.whenReady().then(createWindow);
app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });