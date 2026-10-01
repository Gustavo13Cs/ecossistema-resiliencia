import sharp from 'sharp';

// Generate production assets from the high-resolution logo:
// 1. Process 1024x1024 image:
// - Keep all content inside the circle (plate, fork, avocado, lime, greens) crisp and original
// - Make background outside the circle 100% transparent with clean anti-aliasing
// - Crop tightly and center as an exact square
// 2. Export:
// - web/public/logo.png (512x512)
// - web/public/logo-icon.png (192x192)
// - web/public/icon.png (32x32 and 192x192)
// - web/public/apple-icon.png (180x180)
// - web/public/icon-light-32x32.png (32x32)
// - web/public/icon-dark-32x32.png (32x32)
// - web/public/favicon.ico (multi-size ico: 16, 32, 48)
// - web/public/icon.svg (SVG representation)
// - web/app/favicon.ico
// - web/app/icon.png
// - web/app/apple-icon.png

const inputPath = 'C:/Users/gusta/.gemini/antigravity-ide/brain/cbabcbec-d66c-4943-8056-fae34748397a/.user_uploaded/media_1790813980479.png';
const img = sharp(inputPath);
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;

// Corner background color
const bgR = 251, bgG = 251, bgB = 250;

// Build transparency mask starting from borders
const visited = new Uint8Array(width * height);
const alphaChannel = new Uint8Array(width * height);
alphaChannel.fill(255); // Default opaque

const queue = [];
function pushPixel(x, y) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const idx = y * width + x;
  if (visited[idx]) return;
  visited[idx] = 1;
  queue.push(x, y);
}

// Push 4 borders
for (let x = 0; x < width; x++) {
  pushPixel(x, 0);
  pushPixel(x, height - 1);
}
for (let y = 0; y < height; y++) {
  pushPixel(0, y);
  pushPixel(width - 1, y);
}

let head = 0;
while (head < queue.length) {
  const x = queue[head++];
  const y = queue[head++];
  const pIdx = y * width + x;
  const byteIdx = pIdx * 4;

  const r = data[byteIdx];
  const g = data[byteIdx + 1];
  const b = data[byteIdx + 2];

  // Euclidean distance to background color
  const dr = r - bgR;
  const dg = g - bgG;
  const db = b - bgB;
  const dist = Math.sqrt(dr * dr + dg * dg + db * db);

  // Dark ring has green dominance and low brightness
  const isRing = (r < 130 && g < 130 && b < 130 && g > r + 10);

  if (dist < 35 && !isRing) {
    alphaChannel[pIdx] = 0; // completely transparent
    pushPixel(x + 1, y);
    pushPixel(x - 1, y);
    pushPixel(x, y + 1);
    pushPixel(x, y - 1);
  } else if (dist < 75 && !isRing) {
    // Smooth anti-aliased transition between 35 and 75
    const t = (dist - 35) / 40; // 0 at 35, 1 at 75
    // Ease-in-out curve
    const smoothT = t * t * (3 - 2 * t);
    alphaChannel[pIdx] = Math.round(smoothT * 255);
  }
}

// Write alpha channel back
const outBuffer = Buffer.from(data);
for (let i = 0; i < width * height; i++) {
  outBuffer[i * 4 + 3] = alphaChannel[i];
}

// Center of the logo is (511, 510) and radius ~ 325
// Crop to an exact centered square of size 670x670 (so diameter ~650 has ~10px padding on each side)
const cropSize = 672;
const cx = 511;
const cy = 510;
const left = Math.round(cx - cropSize / 2);
const top = Math.round(cy - cropSize / 2);

console.log(`Cropping square: left=${left}, top=${top}, size=${cropSize}x${cropSize}`);

const master = await sharp(outBuffer, { raw: { width, height, channels: 4 } })
  .extract({ left, top, width: cropSize, height: cropSize });

// Generate high-resolution 512x512 logo
const png512 = await master.clone().resize(512, 512, { kernel: 'lanczos3' }).png().toBuffer();
const png192 = await master.clone().resize(192, 192, { kernel: 'lanczos3' }).png().toBuffer();
const png180 = await master.clone().resize(180, 180, { kernel: 'lanczos3' }).png().toBuffer();
const png48  = await master.clone().resize(48, 48, { kernel: 'lanczos3' }).png().toBuffer();
const png32  = await master.clone().resize(32, 32, { kernel: 'lanczos3' }).png().toBuffer();
const png16  = await master.clone().resize(16, 16, { kernel: 'lanczos3' }).png().toBuffer();

import fs from 'node:fs';
import path from 'node:path';

const webPublic = path.resolve('public');
const webApp = path.resolve('app');

// Save PNGs
fs.writeFileSync(path.join(webPublic, 'logo.png'), png512);
fs.writeFileSync(path.join(webPublic, 'logo-icon.png'), png192);
fs.writeFileSync(path.join(webPublic, 'icon.png'), png192);
fs.writeFileSync(path.join(webPublic, 'icon-light-32x32.png'), png32);
fs.writeFileSync(path.join(webPublic, 'icon-dark-32x32.png'), png32);
fs.writeFileSync(path.join(webPublic, 'apple-icon.png'), png180);

fs.writeFileSync(path.join(webApp, 'icon.png'), png192);
fs.writeFileSync(path.join(webApp, 'apple-icon.png'), png180);

// Function to build ICO file from PNGs
function buildIco(images) {
  // images: array of { width, height, buffer }
  const count = images.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + count * dirEntrySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4);

  const entries = [];
  for (const img of images) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // color palette count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // image data size
    entry.writeUInt32LE(offset, 12); // image data offset
    entries.push(entry);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...images.map(img => img.buffer)]);
}

const icoBuffer = buildIco([
  { width: 16, height: 16, buffer: png16 },
  { width: 32, height: 32, buffer: png32 },
  { width: 48, height: 48, buffer: png48 }
]);

fs.writeFileSync(path.join(webPublic, 'favicon.ico'), icoBuffer);
fs.writeFileSync(path.join(webApp, 'favicon.ico'), icoBuffer);

// Also generate web/public/icon.svg with embedded high-res base64 image
const b64 = png512.toString('base64');
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <image href="data:image/png;base64,${b64}" width="512" height="512" />
</svg>`;
fs.writeFileSync(path.join(webPublic, 'icon.svg'), svgContent, 'utf-8');

console.log('All logo and favicon assets created successfully!');
