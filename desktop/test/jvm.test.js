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
