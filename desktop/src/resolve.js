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
