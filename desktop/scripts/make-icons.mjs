import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const svg = path.join(dir, '..', 'build', 'icon.svg');
const png = path.join(dir, '..', 'build', 'icon.png');

await sharp(svg, { density: 384 }).resize(1024, 1024).png().toFile(png);
console.log('wrote', png);
