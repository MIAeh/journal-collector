import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const svgIcon = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="110" fill="#111827"/>
  <text x="256" y="345" font-family="system-ui, -apple-system, sans-serif"
        font-size="300" font-weight="bold" text-anchor="middle" fill="white">C</text>
</svg>`;

const svgBuffer = Buffer.from(svgIcon);
const publicDir = path.join(__dirname, '..', 'public');

await sharp(svgBuffer).resize(192).png().toFile(path.join(publicDir, 'icon-192.png'));
console.log('✓ icon-192.png');

await sharp(svgBuffer).resize(512).png().toFile(path.join(publicDir, 'icon-512.png'));
console.log('✓ icon-512.png');
