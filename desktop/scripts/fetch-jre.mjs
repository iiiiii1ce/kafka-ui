import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    if (key.includes('=')) { const [k, v] = key.split('='); out[k] = v; }
    else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) { out[key] = argv[++i]; }
    else { out[key] = true; }
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));
const platform = args.platform || (process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux');
const arch = args.arch || (process.arch === 'arm64' ? 'aarch64' : 'x64');
const osMap = { mac: 'mac', win: 'windows', linux: 'linux' };
const url = `https://api.adoptium.net/v3/binary/latest/25/ga/${osMap[platform]}/${arch}/jre/hotspot/normal/eclipse`;

const dir = path.dirname(fileURLToPath(import.meta.url));
const resources = path.join(dir, '..', 'resources');
const jreDir = path.join(resources, 'jre');
// Keep the temp dir on the SAME filesystem as jreDir. On Windows CI the repo
// (D:) and the OS temp dir (C:) are different volumes, and renameSync across
// volumes fails with EXDEV — so extract under resources/ and rename within it.
fs.mkdirSync(resources, { recursive: true });
const tmp = path.join(resources, `.jre-download-${platform}-${arch}`);
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
fs.renameSync(path.join(tmp, top), jreDir);
fs.rmSync(tmp, { recursive: true, force: true });
console.log('Installed JRE → resources/jre');
