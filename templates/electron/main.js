// Electron main process — a transparent, frameless, always-on-top window for the pet.
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('node:path');

// Let Electron use the native windowing backend — transparency + always-on-top
// behave better on GNOME/Wayland than the X11 fallback.
app.commandLine.appendSwitch('ozone-platform-hint', 'auto');

/** @type {BrowserWindow | null} */
let win = null;

const WIN_W = 240;
const WIN_H = 260;

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay();

  win = new BrowserWindow({
    width: WIN_W,
    height: WIN_H,
    x: Math.round(workArea.x + workArea.width / 2 - WIN_W / 2),
    y: Math.round(workArea.y + workArea.height - WIN_H), // stand on the floor
    frame: false,
    transparent: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // 'floating' level + no activation keeps the pet from stealing focus.
  win.setAlwaysOnTop(true, 'floating');
  win.loadFile('index.html');
  win.once('ready-to-show', () => win.show());
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

// ---- IPC surface used by the renderer (pet.js) ----
ipcMain.handle('pet:getWorkArea', () => {
  const { workArea } = screen.getPrimaryDisplay();
  return { x: workArea.x, y: workArea.y, width: workArea.width, height: workArea.height };
});
ipcMain.handle('pet:setPosition', (_e, x, y) => {
  if (win) {
    try {
      win.setPosition(Math.round(x), Math.round(y));
    } catch {
      /* window may be mid-transition */
    }
  }
});
ipcMain.on('pet:quit', () => app.quit());
