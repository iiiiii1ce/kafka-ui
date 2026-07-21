const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { findAppJar, findJavaBin } = require('./resolve');
const { getFreePort, waitForHealth, spawnBackend, killBackend } = require('./jvm');

const HEALTH_TIMEOUT_MS = 90000;

let splashWin = null;
let mainWin = null;
let backend = null;
let backendPort = null;
let shuttingDown = false;

const userData = () => app.getPath('userData');
const logDir = () => path.join(userData(), 'logs');
const logFile = () => path.join(logDir(), 'backend.log');
const configPath = () => path.join(userData(), 'dynamic_config.yaml');

function resourcesDir() {
  return app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', 'resources');
}

function sendStatus(payload) {
  if (splashWin && !splashWin.isDestroyed()) splashWin.webContents.send('boot-status', payload);
}

function createSplash() {
  splashWin = new BrowserWindow({
    width: 460, height: 340, resizable: false, frame: false,
    show: false, backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  splashWin.loadFile(path.join(__dirname, 'splash.html'));
  splashWin.once('ready-to-show', () => splashWin.show());
}

function createMainWindow(url) {
  mainWin = new BrowserWindow({
    width: 1280, height: 820, minWidth: 900, minHeight: 600, show: false,
    title: 'Kafbat UI',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  // External links open in the system browser, not in-app.
  mainWin.webContents.setWindowOpenHandler(({ url: u }) => {
    if (/^https?:\/\//.test(u) && !u.startsWith(`http://127.0.0.1:${backendPort}`)) {
      shell.openExternal(u);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
  mainWin.webContents.on('will-navigate', (e, u) => {
    if (!u.startsWith(`http://127.0.0.1:${backendPort}`)) {
      e.preventDefault();
      shell.openExternal(u);
    }
  });
  mainWin.once('ready-to-show', () => {
    mainWin.show();
    if (splashWin && !splashWin.isDestroyed()) splashWin.close();
    splashWin = null;
  });
  mainWin.loadURL(url);
}

async function boot() {
  try {
    fs.mkdirSync(logDir(), { recursive: true });
    const resDir = resourcesDir();
    const jarPath = findAppJar({
      resourcesDir: resDir,
      devLibsDir: path.join(__dirname, '..', '..', 'api', 'build', 'libs'),
    });
    const javaBin = findJavaBin({ resourcesDir: resDir, platform: process.platform, env: process.env });

    if (!jarPath) {
      return sendStatus({ error: true, message: 'Application package not found',
        detail: 'app.jar is missing. Run "npm run build:jar" before packaging.' });
    }

    sendStatus({ message: 'Starting engine…' });
    backendPort = await getFreePort();
    const logStream = fs.createWriteStream(logFile(), { flags: 'a' });
    backend = spawnBackend({ javaBin, jarPath, port: backendPort, configPath: configPath(), logStream });

    let earlyExit = null;
    backend.on('exit', (code) => {
      if (!shuttingDown && !mainWin) earlyExit = code;
    });

    sendStatus({ message: 'Waiting for services…' });
    const healthy = await waitForHealth(backendPort, {
      timeoutMs: HEALTH_TIMEOUT_MS,
      onTick: (elapsed) => {
        if (elapsed > 8000) sendStatus({ message: 'Still starting (first launch is slower)…' });
      },
    });

    if (!healthy || earlyExit !== null) {
      return sendStatus({ error: true, message: 'Backend failed to start',
        detail: `See ${logFile()}` });
    }

    sendStatus({ message: 'Loading interface…' });
    createMainWindow(`http://127.0.0.1:${backendPort}`);
  } catch (err) {
    sendStatus({ error: true, message: 'Startup error', detail: String(err && err.message || err) });
  }
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' }, { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' }, { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Tools',
      submenu: [
        { label: 'Open Data Folder', click: () => shell.openPath(userData()) },
        { label: 'View Logs', click: () => shell.openPath(logFile()) },
        { type: 'separator' },
        {
          label: 'Reset Local Config…',
          click: async () => {
            const { response } = await dialog.showMessageBox(mainWin, {
              type: 'warning', buttons: ['Cancel', 'Delete & Restart'], defaultId: 0, cancelId: 0,
              message: 'Delete local cluster configuration?',
              detail: 'This removes dynamic_config.yaml and restarts the app.',
            });
            if (response === 1) {
              try { fs.rmSync(configPath(), { force: true }); } catch {}
              app.relaunch(); app.exit(0);
            }
          },
        },
      ],
    },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Single-instance: second launch focuses the existing window, never re-spawns the server.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWin) { if (mainWin.isMinimized()) mainWin.restore(); mainWin.focus(); }
  });

  app.whenReady().then(() => {
    buildMenu();
    createSplash();
    boot();

    ipcMain.on('open-logs', () => shell.openPath(logDir()));
    ipcMain.on('boot-retry', () => {
      if (!mainWin) { if (!splashWin) createSplash(); boot(); }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) { createSplash(); boot(); }
    });
  });

  async function shutdown() {
    shuttingDown = true;
    await killBackend(backend);
    backend = null;
  }

  app.on('before-quit', async (e) => {
    if (backend && !shuttingDown) {
      e.preventDefault();
      await shutdown();
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') { shutdown().finally(() => app.quit()); }
  });

  // Terminate the JVM child on OS signals too (e.g. the installer closing the app
  // during an in-place upgrade), so no orphaned java process survives.
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
    process.on(sig, () => { shutdown().finally(() => app.exit(0)); });
  }
}
