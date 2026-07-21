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
