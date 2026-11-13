import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const sourceIcon = resolve('public/icon-512.png');
const sourceMascot = resolve('public/mascot_favicon_exact.png');
const densities = [
  ['mdpi', 1],
  ['hdpi', 1.5],
  ['xhdpi', 2],
  ['xxhdpi', 3],
  ['xxxhdpi', 4],
];

for (const [density, scale] of densities) {
  const directory = resolve(`android/app/src/main/res/mipmap-${density}`);
  mkdirSync(directory, { recursive: true });
  const legacySize = Math.round(48 * scale);
  const adaptiveSize = Math.round(108 * scale);
  const adaptiveMascotSize = Math.round(adaptiveSize * 0.7);

  await sharp(sourceIcon)
    .resize(legacySize, legacySize, { fit: 'cover' })
    .png()
    .toFile(resolve(directory, 'ic_launcher.png'));
  await sharp(sourceIcon)
    .resize(legacySize, legacySize, { fit: 'cover' })
    .png()
    .toFile(resolve(directory, 'ic_launcher_round.png'));

  const mascot = await sharp(sourceMascot)
    .resize(adaptiveMascotSize, adaptiveMascotSize, { fit: 'contain' })
    .png()
    .toBuffer();
  await sharp({ create: { width: adaptiveSize, height: adaptiveSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: mascot, gravity: 'center' }])
    .png()
    .toFile(resolve(directory, 'ic_launcher_foreground.png'));
}

const splashScreens = [
  ['drawable/splash.png', 480, 320],
  ['drawable-port-mdpi/splash.png', 320, 480],
  ['drawable-port-hdpi/splash.png', 480, 800],
  ['drawable-port-xhdpi/splash.png', 720, 1280],
  ['drawable-port-xxhdpi/splash.png', 960, 1600],
  ['drawable-port-xxxhdpi/splash.png', 1280, 1920],
  ['drawable-land-mdpi/splash.png', 480, 320],
  ['drawable-land-hdpi/splash.png', 800, 480],
  ['drawable-land-xhdpi/splash.png', 1280, 720],
  ['drawable-land-xxhdpi/splash.png', 1600, 960],
  ['drawable-land-xxxhdpi/splash.png', 1920, 1280],
];

for (const [resourcePath, width, height] of splashScreens) {
  const mascotSize = Math.round(Math.min(width, height) * 0.52);
  const mascot = await sharp(sourceMascot)
    .resize(mascotSize, mascotSize, { fit: 'contain' })
    .png()
    .toBuffer();
  const destination = resolve(`android/app/src/main/res/${resourcePath}`);
  mkdirSync(resolve(destination, '..'), { recursive: true });
  await sharp({ create: { width, height, channels: 4, background: { r: 244, g: 237, b: 255, alpha: 1 } } })
    .composite([{ input: mascot, gravity: 'center' }])
    .png()
    .toFile(destination);
}

console.log('Generated Android Octa launcher icons and splash screens from existing artwork.');
