const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('node:path');

const APP_TITLE = 'PHYSICS — Лабораторная работа № 3';

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 980,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0B1020',
    title: APP_TITLE,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.once('ready-to-show', () => win.show());

  // Лабораторная открывается сразу, без необходимости искать её в меню сайта.
  win.loadFile(path.join(__dirname, 'app', 'index.html'), { hash: 'lw-3' });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  return win;
}

const menu = Menu.buildFromTemplate([
  {
    label: 'Файл',
    submenu: [
      { label: 'Перезагрузить лабораторную', accelerator: 'Ctrl+R', click: (_item, win) => win?.webContents.reload() },
      { type: 'separator' },
      { role: 'quit', label: 'Выход' }
    ]
  },
  {
    label: 'Вид',
    submenu: [
      { role: 'resetZoom', label: 'Обычный масштаб' },
      { role: 'zoomIn', label: 'Увеличить' },
      { role: 'zoomOut', label: 'Уменьшить' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'Полный экран' },
      { role: 'toggleDevTools', label: 'Инструменты разработчика' }
    ]
  }
]);

app.setAppUserModelId('ru.physics.lab3');
app.whenReady().then(() => {
  Menu.setApplicationMenu(menu);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
