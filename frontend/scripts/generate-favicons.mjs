/**
 * generate-favicons.mjs
 * Generates all favicon sizes from the 512px master PNG using sharp (Lanczos).
 * Run: node scripts/generate-favicons.mjs
 */

import sharp from 'sharp';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, '../public');
const MASTER = path.join(PUBLIC, 'mascot_favicon_exact.png');

await mkdir(PUBLIC, { recursive: true });

const SIZES = [
  { size: 16,  name: 'favicon-16x16.png' },
  { size: 32,  name: 'favicon-32x32.png' },
  { size: 48,  name: 'favicon-48x48.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
];

console.log('Generating favicons from:', MASTER);

for (const { size, name } of SIZES) {
  const outPath = path.join(PUBLIC, name);
  await sharp(MASTER)
    .resize(size, size, { kernel: sharp.kernel.lanczos3, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`  ✓ ${name} (${size}x${size})`);
}

// Generate favicon.ico (multi-size: 16, 32, 48)
// sharp doesn't write .ico natively; we output the 32x32 PNG as favicon.png
// and also write a favicon.ico using the 32px version (widely supported).
// For a true multi-size .ico we use the npm package 'png-to-ico' if available,
// otherwise fall back to the 32x32 PNG renamed as .ico (works in all modern browsers).
try {
  const { default: pngToIco } = await import('png-to-ico');
  const icoBuffer = await pngToIco([
    path.join(PUBLIC, 'favicon-16x16.png'),
    path.join(PUBLIC, 'favicon-32x32.png'),
    path.join(PUBLIC, 'favicon-48x48.png'),
  ]);
  const ws = createWriteStream(path.join(PUBLIC, 'favicon.ico'));
  ws.write(icoBuffer);
  ws.end();
  console.log('  ✓ favicon.ico (16+32+48 multi-size)');
} catch {
  // png-to-ico not available — copy 32x32 PNG as favicon.ico fallback
  await sharp(MASTER)
    .resize(32, 32, { kernel: sharp.kernel.lanczos3, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(PUBLIC, 'favicon.ico'));
  console.log('  ✓ favicon.ico (32x32 fallback — install png-to-ico for multi-size)');
}

console.log('\nAll favicons generated successfully!');
