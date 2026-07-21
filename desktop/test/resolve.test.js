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
