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
let backendDead = false;
let backendLogStream = null;
let booting = false;
let shuttingDown = false;

const userData = () => app.getPath('userData');
const logDir = () => path.join(userData(), 'logs');
const logFile = () => path.join(logDir(), 'backend.log');
const configPath = () => path.join(userData(), 'dynamic_config.yaml');
const backendOrigin = () => `http://127.0.0.1:${backendPort}`;

function resourcesDir() {
  return app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', 'resources');
}

function isLocalUrl(u) {
  try { return new URL(u).origin === backendOrigin(); } catch { return false; }
}

function backendAlive() {
  return backend && !backendDead && backend.exitCode === null && backend.signalCode === null;
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
  splashWin.on('closed', () => { splashWin = null; });
}

function createMainWindow(url) {
  mainWin = new BrowserWindow({
    width: 1280, height: 820, minWidth: 900, minHeight: 600, show: false,
    title: 'Kafbat UI',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  // Only the local backend origin loads in-app; everything else opens in the system browser.
  mainWin.webContents.setWindowOpenHandler(({ url: u }) => {
    if (isLocalUrl(u)) return { action: 'allow' };
    if (/^https?:\/\//.test(u)) shell.openExternal(u);
    return { action: 'deny' };
  });
  mainWin.webContents.on('will-navigate', (e, u) => {
    if (!isLocalUrl(u)) {
      e.preventDefault();
      if (/^https?:\/\//.test(u)) shell.openExternal(u);
    }
  });
  mainWin.once('ready-to-show', () => {
    mainWin.show();
    if (splashWin && !splashWin.isDestroyed()) splashWin.close();
  });
  mainWin.on('closed', () => { mainWin = null; });
  mainWin.loadURL(url);
}

async function boot() {
  if (booting || backendAlive()) return;
  booting = true;
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

    if (backendLogStream) { backendLogStream.end(); backendLogStream = null; }
    backendLogStream = fs.createWriteStream(logFile(), { flags: 'a' });
    backendDead = false;
    backend = spawnBackend({ javaBin, jarPath, port: backendPort, configPath: configPath(), logStream: backendLogStream });

    backend.on('exit', () => { backendDead = true; });
    // spawn() reports an unlaunchable binary asynchronously via 'error' (e.g. java missing).
    backend.on('error', (err) => {
      backendDead = true;
      sendStatus({ error: true, message: 'Could not start Java runtime',
        detail: `${err && err.message ? err.message : err}. Expected a bundled JRE or JAVA_HOME.` });
    });

    sendStatus({ message: 'Waiting for services…' });
    const healthy = await waitForHealth(backendPort, {
      timeoutMs: HEALTH_TIMEOUT_MS,
      shouldAbort: () => backendDead,
      onTick: (elapsed) => {
        if (elapsed > 8000) sendStatus({ message: 'Still starting (first launch is slower)…' });
      },
    });

    if (!healthy) {
      // If the child is still alive but slow past the timeout, stop it so nothing orphans.
      await killBackend(backend);
      backend = null;
      if (!backendDead) return; // 'error' handler already surfaced a message
      return sendStatus({ error: true, message: 'Backend failed to start',
        detail: `See ${logFile()}` });
    }

    sendStatus({ message: 'Loading interface…' });
    createMainWindow(backendOrigin());
  } catch (err) {
    sendStatus({ error: true, message: 'Startup error', detail: String(err && err.message || err) });
  } finally {
    booting = false;
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
            const { response } = await dialog.showMessageBox(mainWin ?? undefined, {
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
    const win = mainWin ?? splashWin;
    if (win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); win.focus(); }
  });

  app.whenReady().then(() => {
    buildMenu();
    createSplash();
    boot();

    ipcMain.on('open-logs', () => shell.openPath(logDir()));
    ipcMain.on('boot-retry', async () => {
      if (mainWin) return;
      await killBackend(backend);
      backend = null;
      backendDead = false;
      if (!splashWin) createSplash();
      boot();
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length > 0) return;
      // Reuse the still-running backend rather than spawning a second JVM.
      if (backendAlive()) { createMainWindow(backendOrigin()); return; }
      createSplash();
      boot();
    });
  });

  async function shutdown() {
    shuttingDown = true;
    await killBackend(backend);
    backend = null;
    if (backendLogStream) { backendLogStream.end(); backendLogStream = null; }
  }

  app.on('before-quit', (e) => {
    if (backend && !shuttingDown) {
      e.preventDefault();
      shutdown().then(() => app.quit());
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
