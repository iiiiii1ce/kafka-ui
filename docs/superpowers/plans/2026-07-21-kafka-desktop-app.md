# Kafka UI Desktop App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the existing kafbat-ui Spring Boot + React app into a self-contained Electron desktop app for macOS and Windows that bundles its own Java 25 runtime, runs entirely offline, and upgrades in place when a newer installer is run.

**Architecture:** A new `desktop/` Electron project (does not touch Java/React source). On launch it spawns the bundled Spring Boot fat JAR with a bundled JRE on a private `127.0.0.1` port, shows a designed splash while the JVM boots (polling `/actuator/health`), then loads the local UI in a native window. `electron-builder` produces a macOS `.dmg` and a Windows NSIS `.exe`; both replace any prior install, close the running instance, and relaunch.

**Tech Stack:** Electron, electron-builder, Node 22, `tree-kill` (process cleanup), `sharp` (icon rasterization, devDependency), Node built-in `node:test` (unit tests), Eclipse Temurin 25 JRE (bundled), Gradle (builds the fat JAR).

**Reference spec:** `docs/superpowers/specs/2026-07-21-kafka-desktop-app-design.md`

**Build prerequisite:** Building the fat JAR requires **JDK 25** on the build machine (the project sets `sourceCompatibility = VERSION_25`; local default is Java 21). Install Temurin 25 JDK and point `JAVA_HOME` at it before running the JAR build task. The bundled *runtime* is fetched separately by `fetch-jre`.

---

## File Structure

```
desktop/
├── package.json                  electron + electron-builder + scripts + deps
├── electron-builder.yml          mac dmg + win nsis targets, upgrade/replace behavior
├── .gitignore                    ignore node_modules, resources/, dist/
├── README.md                     build + run + distribution instructions
├── src/
│   ├── main.js                   main process: single-instance, window, splash, menu, lifecycle
│   ├── preload.js                contextBridge: boot-status + open-logs channels
│   ├── resolve.js                PURE: locate app.jar and java binary (unit-tested)
│   ├── jvm.js                    free port, spawn backend, health poll, kill (unit/integration-tested)
│   └── splash.html               designed boot screen (self-contained, theme-aware)
├── build/
│   └── icon.svg                  single icon source (rasterized to icon.png at build)
├── scripts/
│   ├── fetch-jre.mjs             download+extract Temurin 25 JRE → resources/jre
│   ├── build-jar.mjs             gradle build (frontend included) → resources/app.jar
│   └── make-icons.mjs            icon.svg → build/icon.png (1024²) via sharp
├── test/
│   ├── resolve.test.js           unit tests for resolve.js
│   └── jvm.test.js               unit + integration tests for jvm.js
└── resources/                    (git-ignored, populated by build scripts)
    ├── app.jar
    └── jre/
```

---

## Task 1: Scaffold the desktop project

**Files:**
- Create: `desktop/package.json`
- Create: `desktop/.gitignore`

- [ ] **Step 1: Create `desktop/package.json`**

```json
{
  "name": "kafbat-ui-desktop",
  "version": "0.0.1",
  "description": "Kafbat UI desktop app (macOS + Windows)",
  "main": "src/main.js",
  "author": "kafbat",
  "license": "Apache-2.0",
  "scripts": {
    "start": "electron .",
    "test": "node --test test/",
    "make-icons": "node scripts/make-icons.mjs",
    "build:jar": "node scripts/build-jar.mjs",
    "fetch-jre": "node scripts/fetch-jre.mjs",
    "prep": "npm run make-icons && npm run build:jar",
    "build:mac": "electron-builder --mac --arm64",
    "build:win": "electron-builder --win --x64"
  },
  "devDependencies": {
    "electron": "^33.0.0",
    "electron-builder": "^25.1.8",
    "sharp": "^0.33.5"
  },
  "dependencies": {
    "tree-kill": "^1.2.2"
  }
}
```

- [ ] **Step 2: Create `desktop/.gitignore`**

```gitignore
node_modules/
resources/
dist/
build/icon.png
```

- [ ] **Step 3: Install dependencies**

Run: `cd desktop && npm install`
Expected: completes without error; `node_modules/` created.

- [ ] **Step 4: Commit**

```bash
git add desktop/package.json desktop/.gitignore
git commit -m "feat(desktop): scaffold electron project"
```

---

## Task 2: Resource resolution (`resolve.js`) — TDD

Pure functions that locate `app.jar` and the `java` binary in both dev and packaged layouts. No Electron imports, so fully unit-testable with injected fs stubs.

**Files:**
- Create: `desktop/src/resolve.js`
- Test: `desktop/test/resolve.test.js`

- [ ] **Step 1: Write the failing test**

Create `desktop/test/resolve.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { findAppJar, findJavaBin } = require('../src/resolve');

test('findAppJar returns packaged app.jar when it exists', () => {
  const resourcesDir = '/app/resources';
  const jar = findAppJar({
    resourcesDir,
    devLibsDir: '/repo/api/build/libs',
    existsSync: (p) => p === path.join(resourcesDir, 'app.jar'),
    readdirSync: () => [],
  });
  assert.strictEqual(jar, path.join(resourcesDir, 'app.jar'));
});

test('findAppJar falls back to dev boot jar, ignoring -plain', () => {
  const devLibsDir = '/repo/api/build/libs';
  const jar = findAppJar({
    resourcesDir: '/app/resources',
    devLibsDir,
    existsSync: (p) => p === devLibsDir,
    readdirSync: () => ['api-0.0.1-SNAPSHOT-plain.jar', 'api-0.0.1-SNAPSHOT.jar'],
  });
  assert.strictEqual(jar, path.join(devLibsDir, 'api-0.0.1-SNAPSHOT.jar'));
});

test('findAppJar returns null when nothing found', () => {
  const jar = findAppJar({
    resourcesDir: '/app/resources',
    devLibsDir: '/repo/api/build/libs',
    existsSync: () => false,
    readdirSync: () => [],
  });
  assert.strictEqual(jar, null);
});

test('findJavaBin prefers bundled jre (win layout)', () => {
  const resourcesDir = 'C:/app/resources';
  const expected = path.join(resourcesDir, 'jre', 'bin', 'java.exe');
  const bin = findJavaBin({
    resourcesDir, platform: 'win32', env: {},
    existsSync: (p) => p === expected,
  });
  assert.strictEqual(bin, expected);
});

test('findJavaBin prefers bundled jre (mac Contents/Home layout)', () => {
  const resourcesDir = '/app/resources';
  const expected = path.join(resourcesDir, 'jre', 'Contents', 'Home', 'bin', 'java');
  const bin = findJavaBin({
    resourcesDir, platform: 'darwin', env: {},
    existsSync: (p) => p === expected,
  });
  assert.strictEqual(bin, expected);
});

test('findJavaBin falls back to JAVA_HOME then PATH', () => {
  const resourcesDir = '/app/resources';
  const javaHome = '/opt/jdk25';
  const expected = path.join(javaHome, 'bin', 'java');
  const bin = findJavaBin({
    resourcesDir, platform: 'linux', env: { JAVA_HOME: javaHome },
    existsSync: (p) => p === expected,
  });
  assert.strictEqual(bin, expected);

  const onPath = findJavaBin({
    resourcesDir, platform: 'linux', env: {}, existsSync: () => false,
  });
  assert.strictEqual(onPath, 'java');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd desktop && node --test test/resolve.test.js`
Expected: FAIL — `Cannot find module '../src/resolve'`.

- [ ] **Step 3: Write minimal implementation**

Create `desktop/src/resolve.js`:

```js
const path = require('node:path');
const fs = require('node:fs');

function findAppJar({ resourcesDir, devLibsDir, existsSync = fs.existsSync, readdirSync = fs.readdirSync }) {
  const packaged = path.join(resourcesDir, 'app.jar');
  if (existsSync(packaged)) return packaged;
  if (devLibsDir && existsSync(devLibsDir)) {
    const jar = readdirSync(devLibsDir)
      .filter((f) => f.endsWith('.jar') && !f.endsWith('-plain.jar'))
      .sort()
      .pop();
    if (jar) return path.join(devLibsDir, jar);
  }
  return null;
}

function findJavaBin({ resourcesDir, platform, env = {}, existsSync = fs.existsSync }) {
  const binName = platform === 'win32' ? 'java.exe' : 'java';
  const candidates = [
    path.join(resourcesDir, 'jre', 'bin', binName),
    path.join(resourcesDir, 'jre', 'Contents', 'Home', 'bin', binName),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  if (env.JAVA_HOME) {
    const c = path.join(env.JAVA_HOME, 'bin', binName);
    if (existsSync(c)) return c;
  }
  return binName;
}

module.exports = { findAppJar, findJavaBin };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd desktop && node --test test/resolve.test.js`
Expected: PASS — all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add desktop/src/resolve.js desktop/test/resolve.test.js
git commit -m "feat(desktop): add jar/java resolution with tests"
```

---

## Task 3: JVM lifecycle (`jvm.js`) — TDD

Free-port allocation, backend spawn, health polling against `/actuator/health`, and process kill.

**Files:**
- Create: `desktop/src/jvm.js`
- Test: `desktop/test/jvm.test.js`

- [ ] **Step 1: Write the failing test**

Create `desktop/test/jvm.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { getFreePort, checkHealth, waitForHealth } = require('../src/jvm');

test('getFreePort returns a usable loopback port', async () => {
  const port = await getFreePort();
  assert.ok(Number.isInteger(port) && port > 0 && port < 65536);
});

test('checkHealth is true only for HTTP 200 with status UP', async () => {
  const server = http.createServer((req, res) => {
    if (req.url === '/actuator/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'UP' }));
    } else {
      res.writeHead(404); res.end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  assert.strictEqual(await checkHealth(port), true);
  await new Promise((r) => server.close(r));
});

test('checkHealth is false when server returns DOWN', async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(503, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'DOWN' }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  assert.strictEqual(await checkHealth(port), false);
  await new Promise((r) => server.close(r));
});

test('checkHealth is false when nothing is listening', async () => {
  const dead = await getFreePort();
  assert.strictEqual(await checkHealth(dead), false);
});

test('waitForHealth resolves true once the server comes up', async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'UP' }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const ok = await waitForHealth(port, { timeoutMs: 3000, intervalMs: 100 });
  assert.strictEqual(ok, true);
  await new Promise((r) => server.close(r));
});

test('waitForHealth resolves false on timeout', async () => {
  const dead = await getFreePort();
  const ok = await waitForHealth(dead, { timeoutMs: 400, intervalMs: 100 });
  assert.strictEqual(ok, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd desktop && node --test test/jvm.test.js`
Expected: FAIL — `Cannot find module '../src/jvm'`.

- [ ] **Step 3: Write minimal implementation**

Create `desktop/src/jvm.js`:

```js
const net = require('node:net');
const http = require('node:http');
const { spawn } = require('node:child_process');
const treeKill = require('tree-kill');

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function checkHealth(port) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: '127.0.0.1', port, path: '/actuator/health', timeout: 2000 },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(res.statusCode === 200 && JSON.parse(body).status === 'UP');
          } catch {
            resolve(false);
          }
        });
      },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function waitForHealth(port, { timeoutMs = 90000, intervalMs = 500, onTick } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkHealth(port)) return true;
    if (onTick) onTick(Date.now() - start);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

function spawnBackend({ javaBin, jarPath, port, configPath, logStream }) {
  const args = [
    '-Dserver.address=127.0.0.1',
    `-Dserver.port=${port}`,
    '-Ddynamic.config.enabled=true',
    `-Ddynamic.config.path=${configPath}`,
    '-jar', jarPath,
  ];
  const child = spawn(javaBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  if (logStream) {
    child.stdout.pipe(logStream, { end: false });
    child.stderr.pipe(logStream, { end: false });
  }
  return child;
}

function killBackend(child) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null || child.signalCode !== null) return resolve();
    treeKill(child.pid, 'SIGTERM', () => resolve());
  });
}

module.exports = { getFreePort, checkHealth, waitForHealth, spawnBackend, killBackend };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd desktop && node --test test/jvm.test.js`
Expected: PASS — all 6 tests pass.

- [ ] **Step 5: Run the full suite**

Run: `cd desktop && npm test`
Expected: PASS — resolve + jvm suites all green.

- [ ] **Step 6: Commit**

```bash
git add desktop/src/jvm.js desktop/test/jvm.test.js
git commit -m "feat(desktop): add JVM lifecycle (port/spawn/health/kill) with tests"
```

---

## Task 4: Preload bridge (`preload.js`)

**Files:**
- Create: `desktop/src/preload.js`

- [ ] **Step 1: Write the preload bridge**

Create `desktop/src/preload.js`:

```js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  onStatus: (cb) => ipcRenderer.on('boot-status', (_e, payload) => cb(payload)),
  openLogs: () => ipcRenderer.send('open-logs'),
  retry: () => ipcRenderer.send('boot-retry'),
});
```

- [ ] **Step 2: Commit**

```bash
git add desktop/src/preload.js
git commit -m "feat(desktop): add preload contextBridge for boot status"
```

---

## Task 5: Splash / boot screen (`splash.html`) — the designed surface

Self-contained, theme-aware, respects `prefers-reduced-motion`. Shows the product mark, the current boot phase, an intentional progress treatment, and surfaces errors inline with actions. No external assets, no gradient text, no glassmorphism.

**Files:**
- Create: `desktop/src/splash.html`

- [ ] **Step 1: Write the splash screen**

Create `desktop/src/splash.html`:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
<title>Kafbat UI</title>
<style>
  :root {
    --bg: oklch(0.19 0.012 264);
    --surface: oklch(0.23 0.014 264);
    --ink: oklch(0.97 0.005 264);
    --muted: oklch(0.72 0.012 264);
    --line: oklch(0.30 0.014 264);
    --brand: oklch(0.72 0.15 250);
    --danger: oklch(0.70 0.17 25);
    --track: oklch(0.30 0.014 264);
  }
  @media (prefers-color-scheme: light) {
    :root {
      --bg: oklch(0.98 0.004 264);
      --surface: oklch(1 0 0);
      --ink: oklch(0.22 0.02 264);
      --muted: oklch(0.48 0.02 264);
      --line: oklch(0.90 0.01 264);
      --brand: oklch(0.55 0.16 250);
      --track: oklch(0.92 0.008 264);
    }
  }
  * { margin: 0; box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    display: grid; place-items: center;
    font: 14px/1.5 -apple-system, "Segoe UI", system-ui, sans-serif;
    color: var(--ink); background: var(--bg);
    -webkit-user-select: none; user-select: none;
    overflow: hidden;
  }
  .card {
    width: 420px; padding: 40px 40px 34px;
    display: flex; flex-direction: column; align-items: center; text-align: center;
  }
  .mark {
    width: 56px; height: 56px; margin-bottom: 22px;
    display: grid; place-items: center;
    border: 1px solid var(--line); border-radius: 15px;
    background: var(--surface);
  }
  .mark svg { width: 30px; height: 30px; display: block; }
  .dot { fill: var(--brand); }
  .title { font-size: 19px; font-weight: 650; letter-spacing: -0.01em; }
  .phase { margin-top: 6px; color: var(--muted); min-height: 1.4em; }
  .bar {
    margin-top: 26px; width: 100%; height: 4px; border-radius: 999px;
    background: var(--track); overflow: hidden; position: relative;
  }
  .bar > i {
    position: absolute; inset: 0; width: 40%; border-radius: 999px;
    background: var(--brand);
    animation: slide 1.15s cubic-bezier(0.22, 1, 0.36, 1) infinite;
  }
  @keyframes slide {
    0% { left: -42%; } 100% { left: 102%; }
  }
  .error { display: none; margin-top: 24px; width: 100%; }
  .error .msg {
    color: var(--danger); font-weight: 600; margin-bottom: 4px;
  }
  .error .detail {
    color: var(--muted); font-size: 12.5px; word-break: break-word;
  }
  .actions { display: none; gap: 8px; margin-top: 18px; }
  button {
    font: inherit; font-weight: 550; color: var(--ink);
    background: var(--surface); border: 1px solid var(--line);
    padding: 7px 14px; border-radius: 9px; cursor: pointer;
  }
  button.primary { background: var(--brand); color: oklch(0.16 0.02 264); border-color: transparent; }
  button:hover { filter: brightness(1.06); }
  body.has-error .bar { display: none; }
  body.has-error .error,
  body.has-error .actions { display: flex; flex-direction: column; align-items: center; }
  body.has-error .actions { flex-direction: row; }
  @media (prefers-reduced-motion: reduce) {
    .bar > i { animation: none; width: 100%; left: 0; opacity: 0.85; }
  }
</style>
</head>
<body>
  <main class="card">
    <div class="mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <circle class="dot" cx="6" cy="6" r="2.4"/>
        <circle class="dot" cx="6" cy="18" r="2.4"/>
        <circle class="dot" cx="18" cy="12" r="2.4"/>
        <path d="M6 6v12M6 12h9M15 12l3 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </div>
    <h1 class="title">Kafbat UI</h1>
    <p class="phase" id="phase">Starting…</p>
    <div class="bar" aria-hidden="true"><i></i></div>
    <div class="error">
      <p class="msg" id="err-msg"></p>
      <p class="detail" id="err-detail"></p>
    </div>
    <div class="actions">
      <button class="primary" id="retry">Retry</button>
      <button id="logs">Open logs</button>
    </div>
  </main>
  <script>
    const phaseEl = document.getElementById('phase');
    const errMsg = document.getElementById('err-msg');
    const errDetail = document.getElementById('err-detail');
    document.getElementById('logs').addEventListener('click', () => window.desktopAPI?.openLogs());
    document.getElementById('retry').addEventListener('click', () => {
      document.body.classList.remove('has-error');
      window.desktopAPI?.retry();
    });
    window.desktopAPI?.onStatus((s) => {
      if (s.error) {
        document.body.classList.add('has-error');
        errMsg.textContent = s.message || 'Failed to start';
        errDetail.textContent = s.detail || '';
      } else {
        document.body.classList.remove('has-error');
        phaseEl.textContent = s.message || '';
      }
    });
  </script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add desktop/src/splash.html
git commit -m "feat(desktop): add designed boot/splash screen"
```

---

## Task 6: Main process (`main.js`)

Ties it together: single-instance lock, splash window, JVM boot with phase reporting, main window load, error handling, native menu, clean shutdown.

**Files:**
- Create: `desktop/src/main.js`

- [ ] **Step 1: Write the main process**

Create `desktop/src/main.js`:

```js
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
}
```

- [ ] **Step 2: Sanity-check the app boots in dev (requires app.jar present — see Task 8)**

For now, verify the file loads without syntax errors:
Run: `cd desktop && node --check src/main.js`
Expected: no output (exit 0).

- [ ] **Step 3: Commit**

```bash
git add desktop/src/main.js
git commit -m "feat(desktop): add main process with lifecycle, menu, error handling"
```

---

## Task 7: App icon (`icon.svg` + `make-icons.mjs`)

**Files:**
- Create: `desktop/build/icon.svg`
- Create: `desktop/scripts/make-icons.mjs`

- [ ] **Step 1: Create the icon source**

Create `desktop/build/icon.svg` (1024², solid committed mark — a stylized broker/stream graph):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="224" fill="#1b2233"/>
  <g stroke="#5aa2f7" stroke-width="34" stroke-linecap="round" fill="none">
    <path d="M330 300 V724"/>
    <path d="M330 512 H620"/>
    <path d="M330 380 L620 300"/>
    <path d="M330 644 L620 724"/>
  </g>
  <g fill="#5aa2f7">
    <circle cx="330" cy="300" r="52"/>
    <circle cx="330" cy="724" r="52"/>
    <circle cx="620" cy="300" r="52"/>
    <circle cx="620" cy="512" r="52"/>
    <circle cx="620" cy="724" r="52"/>
    <circle cx="720" cy="512" r="34"/>
  </g>
</svg>
```

- [ ] **Step 2: Create the rasterizer script**

Create `desktop/scripts/make-icons.mjs`:

```js
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const svg = path.join(dir, '..', 'build', 'icon.svg');
const png = path.join(dir, '..', 'build', 'icon.png');

await sharp(svg, { density: 384 }).resize(1024, 1024).png().toFile(png);
console.log('wrote', png);
```

- [ ] **Step 3: Generate the PNG**

Run: `cd desktop && npm run make-icons`
Expected: prints `wrote .../build/icon.png`; a 1024×1024 PNG exists. electron-builder auto-derives `.icns`/`.ico` from it at package time.

- [ ] **Step 4: Commit**

```bash
git add desktop/build/icon.svg desktop/scripts/make-icons.mjs
git commit -m "feat(desktop): add app icon source and rasterizer"
```

---

## Task 8: Build scripts (`build-jar.mjs`, `fetch-jre.mjs`)

**Files:**
- Create: `desktop/scripts/build-jar.mjs`
- Create: `desktop/scripts/fetch-jre.mjs`

- [ ] **Step 1: Create the JAR build script**

Create `desktop/scripts/build-jar.mjs`:

```js
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(dir, '..', '..');
const isWin = process.platform === 'win32';
const gradlew = path.join(repo, isWin ? 'gradlew.bat' : 'gradlew');

console.log('Building fat JAR (frontend included). Requires JDK 25 on JAVA_HOME.');
const res = spawnSync(gradlew, [':api:clean', ':api:bootJar', '-Pinclude-frontend=true', '-x', 'test'], {
  cwd: repo, stdio: 'inherit', shell: isWin,
});
if (res.status !== 0) { console.error('Gradle build failed.'); process.exit(res.status ?? 1); }

const libs = path.join(repo, 'api', 'build', 'libs');
const jar = fs.readdirSync(libs)
  .filter((f) => f.endsWith('.jar') && !f.endsWith('-plain.jar'))
  .sort().pop();
if (!jar) { console.error('No boot jar found in ' + libs); process.exit(1); }

const outDir = path.join(dir, '..', 'resources');
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(path.join(libs, jar), path.join(outDir, 'app.jar'));
console.log('Copied', jar, '→ resources/app.jar');
```

- [ ] **Step 2: Create the JRE fetch script**

Create `desktop/scripts/fetch-jre.mjs`:

```js
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')),
);
const platform = args.platform || (process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux');
const arch = args.arch || (process.arch === 'arm64' ? 'aarch64' : 'x64');
const osMap = { mac: 'mac', win: 'windows', linux: 'linux' };
const url = `https://api.adoptium.net/v3/binary/latest/25/ga/${osMap[platform]}/${arch}/jre/hotspot/normal/eclipse`;

const dir = path.dirname(fileURLToPath(import.meta.url));
const resources = path.join(dir, '..', 'resources');
const jreDir = path.join(resources, 'jre');
const tmp = path.join(os.tmpdir(), `temurin25-${platform}-${arch}`);
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });

const isZip = platform === 'win';
const archive = path.join(tmp, isZip ? 'jre.zip' : 'jre.tar.gz');

console.log('Downloading Temurin 25 JRE:', url);
const dl = await fetch(url, { redirect: 'follow' });
if (!dl.ok) { console.error('Download failed:', dl.status); process.exit(1); }
fs.writeFileSync(archive, Buffer.from(await dl.arrayBuffer()));

console.log('Extracting…');
// bsdtar (default `tar` on macOS and Windows 10+) auto-detects .zip and .tar.gz,
// so `tar -xf` avoids depending on `unzip` being on PATH (it usually isn't on Windows).
const ex = isZip
  ? spawnSync('tar', ['-xf', archive, '-C', tmp], { stdio: 'inherit' })
  : spawnSync('tar', ['-xzf', archive, '-C', tmp], { stdio: 'inherit' });
if (ex.status !== 0) { console.error('Extraction failed.'); process.exit(1); }

const top = fs.readdirSync(tmp).find((f) => fs.statSync(path.join(tmp, f)).isDirectory() && f.toLowerCase().includes('jdk'));
if (!top) { console.error('Could not locate extracted JRE dir.'); process.exit(1); }

fs.rmSync(jreDir, { recursive: true, force: true });
fs.mkdirSync(resources, { recursive: true });
fs.renameSync(path.join(tmp, top), jreDir);
console.log('Installed JRE → resources/jre');
```

- [ ] **Step 3: Fetch the host-platform JRE and verify**

Run (macOS Apple Silicon): `cd desktop && node scripts/fetch-jre.mjs --platform=mac --arch=aarch64`
Expected: prints "Installed JRE → resources/jre"; `resources/jre/Contents/Home/bin/java` exists.

Verify: `desktop/resources/jre/Contents/Home/bin/java -version`
Expected: `openjdk version "25...`.

- [ ] **Step 4: Commit**

```bash
git add desktop/scripts/build-jar.mjs desktop/scripts/fetch-jre.mjs
git commit -m "feat(desktop): add jar build and JRE fetch scripts"
```

---

## Task 9: Dev end-to-end smoke test

Verify the app actually boots against a real backend before packaging. **Requires JDK 25** installed with `JAVA_HOME` pointing at it.

**Files:** none (verification only)

- [ ] **Step 1: Build the JAR**

Run: `cd desktop && JAVA_HOME=/path/to/jdk-25 npm run build:jar`
Expected: `resources/app.jar` created (a large fat jar, tens of MB).

- [ ] **Step 2: Launch the app in dev**

Run: `cd desktop && npm start`
Expected: splash appears → "Starting engine…" → "Waiting for services…" → main window loads the Kafbat UI. No blank window.

- [ ] **Step 3: Add a cluster and verify persistence**

In the UI, add a cluster pointing at a local broker (e.g. `localhost:9092`). Quit the app (Cmd+Q). Confirm `~/Library/Application Support/kafbat-ui-desktop/dynamic_config.yaml` contains the cluster. Relaunch → cluster still present.

- [ ] **Step 4: Verify clean shutdown (no orphan JVM)**

After quitting, run: `pgrep -fl 'app.jar'`
Expected: no matching process (the JVM was killed).

- [ ] **Step 5: Verify single-instance**

Launch twice (`npm start` in two terminals). Expected: the second focuses the first window; only one `java` process running.

- [ ] **Step 6: Commit (no code change — record verification in the plan checkboxes)**

No commit needed; this task is verification only.

---

## Task 10: electron-builder config + installers

**Files:**
- Create: `desktop/electron-builder.yml`
- Modify: `desktop/README.md` (created in Task 11)

- [ ] **Step 1: Create `desktop/electron-builder.yml`**

```yaml
appId: io.kafbat.ui.desktop
productName: Kafbat UI
copyright: Copyright © kafbat
directories:
  output: dist
  buildResources: build
files:
  - "src/**/*"
  - "package.json"
  - "!test/**/*"
extraResources:
  - from: "resources/app.jar"
    to: "app.jar"
  - from: "resources/jre"
    to: "jre"
mac:
  target:
    - target: dmg
      arch: [arm64]
  category: public.app-category.developer-tools
  icon: build/icon.png
  artifactName: "${productName}-${version}-${arch}.${ext}"
dmg:
  title: "Install ${productName}"
win:
  target:
    - target: nsis
      arch: [x64]
  icon: build/icon.png
  artifactName: "${productName}-Setup-${version}.${ext}"
nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  runAfterFinish: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  deleteAppDataOnUninstall: false
```

Notes wired to the spec's installer requirements:
- Fixed `appId` + `productName` → new installs replace the old (no side-by-side).
- `runAfterFinish: true` → relaunch after install; electron-builder's NSIS closes the running instance before copying files.
- `perMachine: false`, `oneClick: false`, shortcuts → VS Code / Slack-style assisted per-user install.
- `deleteAppDataOnUninstall: false` → user's `dynamic_config.yaml` survives upgrades (it lives in userData, outside the bundle).

- [ ] **Step 2: Build the macOS installer**

Run: `cd desktop && npm run make-icons && node scripts/fetch-jre.mjs --platform=mac --arch=aarch64 && JAVA_HOME=/path/to/jdk-25 npm run build:jar && npm run build:mac`
Expected: `dist/Kafbat UI-0.0.1-arm64.dmg` produced.

- [ ] **Step 3: Verify the DMG installs and runs**

Open the `.dmg`, drag to Applications, launch from Applications (allow past Gatekeeper: right-click → Open the first time). Expected: splash → UI loads, same as dev.

- [ ] **Step 4: Build the Windows installer**

On a Windows x64 machine (or CI) with JDK 25:
Run: `cd desktop && npm ci && npm run make-icons && node scripts/fetch-jre.mjs --platform=win --arch=x64 && npm run build:jar && npm run build:win`
Expected: `dist/Kafbat UI-Setup-0.0.1.exe` produced.

(Cross-building an unsigned `.exe` from macOS also works via `npm run build:win` after `fetch-jre --platform=win`, but signing/notarization needs the native OS.)

- [ ] **Step 5: Verify Windows install + upgrade-in-place**

Install the `.exe` (SmartScreen → More info → Run anyway). Launch. Then bump `version` in `package.json` to `0.0.2`, rebuild, and run the new installer **while the app is running**. Expected: installer closes the running app, replaces it in place (no second Start Menu entry / no side-by-side copy), relaunches v0.0.2; the previously added cluster is still present.

- [ ] **Step 6: Commit**

```bash
git add desktop/electron-builder.yml
git commit -m "feat(desktop): add electron-builder config for dmg + nsis with in-place upgrade"
```

---

## Task 11: README + documentation

**Files:**
- Create: `desktop/README.md`

- [ ] **Step 1: Write `desktop/README.md`**

````markdown
# Kafbat UI Desktop

Self-contained desktop build of Kafbat UI for macOS and Windows. Bundles its own Java 25
runtime and the app's fat JAR — end users install nothing else, run fully offline, and add
Kafka clusters from the UI (persisted locally, no server).

## Prerequisites (build machine only)

- Node 22+
- **JDK 25** (Temurin) with `JAVA_HOME` set — required to build the fat JAR.

## One-time / per-release build

```bash
cd desktop
npm install

# 1. Icon (once, or when icon.svg changes)
npm run make-icons

# 2. Bundle a JRE for the target platform
node scripts/fetch-jre.mjs --platform=mac --arch=aarch64   # or --platform=win --arch=x64

# 3. Build the fat JAR (needs JDK 25)
JAVA_HOME=/path/to/jdk-25 npm run build:jar

# 4. Package installer
npm run build:mac      # → dist/*.dmg   (Apple Silicon)
npm run build:win      # → dist/*.exe   (Windows x64; best run on Windows/CI)
```

Artifacts land in `desktop/dist/`.

## Run in development

```bash
JAVA_HOME=/path/to/jdk-25 npm run build:jar   # produce resources/app.jar
npm start
```

## Tests

```bash
npm test
```

## Notes

- **Unsigned (v1):** first launch requires bypassing Gatekeeper (macOS: right-click → Open)
  or SmartScreen (Windows: More info → Run anyway).
- **Upgrades:** running a newer installer replaces the current install, closes the running
  app, and relaunches. User config (`dynamic_config.yaml`) lives in the OS user-data folder
  and survives upgrades.
- **Other architectures:** for Intel macOS, fetch `--arch=x64` and add `x64` to the mac
  `arch` list in `electron-builder.yml`.
- Data/log locations: **macOS** `~/Library/Application Support/kafbat-ui-desktop/`,
  **Windows** `%APPDATA%/kafbat-ui-desktop/`.
````

- [ ] **Step 2: Commit**

```bash
git add desktop/README.md
git commit -m "docs(desktop): add build and distribution README"
```

---

## Self-Review Notes

- **Spec coverage:** cross-platform (Tasks 10) ✓; offline/no-server (bundled JRE Task 8, dynamic config wired in `spawnBackend` Task 3) ✓; bundled Java runtime (Task 8) ✓; auth disabled (default, no work needed) ✓; add clusters in-UI + persistence (Task 9 Step 3) ✓; splash design (Task 5) ✓; app icon (Task 7) ✓; error handling / no orphan JVM / single-instance (Tasks 6, 9) ✓; installer replace-in-place + close-running + relaunch + best-practice UX (Task 10) ✓; dmg + nsis (Task 10) ✓; README (Task 11) ✓.
- **Type consistency:** `findAppJar`/`findJavaBin` signatures match between `resolve.js` (Task 2) and `main.js` (Task 6); `getFreePort`/`waitForHealth`/`spawnBackend`/`killBackend` signatures match between `jvm.js` (Task 3) and `main.js` (Task 6); IPC channel names `boot-status`/`open-logs`/`boot-retry` match across `preload.js` (Task 4), `splash.html` (Task 5), `main.js` (Task 6).
- **Known environmental dependency:** the JAR build (Tasks 8–10) requires JDK 25; the local machine has JDK 21, so the developer/CI must install Temurin 25 JDK first. Flagged in the header and README.
```
