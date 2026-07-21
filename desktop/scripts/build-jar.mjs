import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(dir, '..', '..');
const isWin = process.platform === 'win32';
const gradlew = path.join(repo, isWin ? 'gradlew.bat' : 'gradlew');

console.log('Building fat JAR (frontend included). Requires JDK 25 on JAVA_HOME.');
const res = spawnSync(gradlew, [':api:clean', ':api:bootJar', '-Pinclude-frontend', '-x', 'test'], {
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
