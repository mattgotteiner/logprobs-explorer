/**
 * Generates all PWA/favicon icon files for the app.
 * Run with: node scripts/generate-icons.mjs
 *
 * Outputs:
 *   public/apple-touch-icon.png  (180x180, RGB)
 *   public/icon-192.png          (192x192, RGB)
 *   public/icon-512.png          (512x512, RGB)
 *   public/favicon.ico           (16x16 + 32x32 + 48x48, RGB PNGs in ICO)
 */

import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const BG_COLOR = '#4f46e5';
const ACCENT_COLOR = '#c7d2fe';

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, size, size);

  const cardX = size * 0.0625;
  const cardY = size * 0.0625;
  const cardW = size * 0.875;
  const cardH = size * 0.875;
  const cardRadius = size * 0.14;

  roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  const barHeight = size * 0.16;
  const innerPadding = size * 0.085;
  const gap = size * 0.06;
  const columnTop = cardY + barHeight + innerPadding;
  const columnHeight = cardH - barHeight - innerPadding * 1.3;
  const leftColumnWidth = cardW * 0.4;
  const rightColumnWidth = cardW * 0.3;
  const dividerX = cardX + cardW * 0.5;

  ctx.fillStyle = BG_COLOR;
  roundRect(ctx, cardX, cardY, cardW, barHeight, cardRadius);
  ctx.fill();

  ctx.clearRect(cardX, cardY + barHeight * 0.62, cardW, barHeight * 0.5);

  const dotY = cardY + barHeight * 0.48;
  const dotRadius = Math.max(2, size * 0.035);
  [0.16, 0.24, 0.32].forEach((position) => {
    ctx.beginPath();
    ctx.fillStyle = ACCENT_COLOR;
    ctx.arc(cardX + cardW * position, dotY, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = BG_COLOR;
  roundRect(
    ctx,
    cardX + innerPadding,
    columnTop,
    leftColumnWidth,
    columnHeight,
    size * 0.05,
  );
  ctx.fill();

  ctx.fillStyle = ACCENT_COLOR;
  roundRect(
    ctx,
    dividerX + gap * 0.25,
    columnTop,
    rightColumnWidth,
    columnHeight * 0.34,
    size * 0.05,
  );
  ctx.fill();

  roundRect(
    ctx,
    dividerX + gap * 0.25,
    columnTop + columnHeight * 0.42,
    rightColumnWidth,
    columnHeight * 0.18,
    size * 0.05,
  );
  ctx.fill();

  roundRect(
    ctx,
    dividerX + gap * 0.25,
    columnTop + columnHeight * 0.68,
    rightColumnWidth,
    columnHeight * 0.18,
    size * 0.05,
  );
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  const lineInset = innerPadding * 0.7;
  const lineHeight = Math.max(3, size * 0.06);
  const lineRadius = lineHeight / 2;
  const lineWidths = [0.72, 0.52, 0.63, 0.44];
  lineWidths.forEach((ratio, index) => {
    roundRect(
      ctx,
      cardX + innerPadding + lineInset,
      columnTop + lineInset + index * (lineHeight + gap * 0.45),
      leftColumnWidth * ratio,
      lineHeight,
      lineRadius,
    );
    ctx.fill();
  });

  return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

function toRgbPng(sourceCanvas) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const bgra = sourceCanvas.toBuffer('raw');

  const rowSize = 1 + w * 3;
  const rowData = Buffer.alloc(h * rowSize);
  for (let y = 0; y < h; y++) {
    rowData[y * rowSize] = 0;
    for (let x = 0; x < w; x++) {
      const srcOff = (y * w + x) * 4;
      const dstOff = y * rowSize + 1 + x * 3;
      rowData[dstOff + 0] = bgra[srcOff + 2];
      rowData[dstOff + 1] = bgra[srcOff + 1];
      rowData[dstOff + 2] = bgra[srcOff + 0];
    }
  }

  const idatData = deflateSync(rowData, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    PNG_SIG,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idatData),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const sizes = [
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
];

for (const { file, size } of sizes) {
  const canvas = drawIcon(size);
  const buf = toRgbPng(canvas);
  const outPath = join(publicDir, file);
  writeFileSync(outPath, buf);
  console.log(`✓ ${file} (${buf.length} bytes)`);
}

const icoSizes = [16, 32, 48];
const pngBuffers = icoSizes.map((size) => toRgbPng(drawIcon(size)));

const HEADER_SIZE = 6;
const DIR_ENTRY_SIZE = 16;
const dirOffset = HEADER_SIZE + icoSizes.length * DIR_ENTRY_SIZE;

let dataOffset = dirOffset;
const dirEntries = pngBuffers.map((buf, i) => {
  const size = icoSizes[i];
  const entry = { size, buf, offset: dataOffset };
  dataOffset += buf.length;
  return entry;
});

const totalSize = dataOffset;
const ico = Buffer.alloc(totalSize);

ico.writeUInt16LE(0, 0);
ico.writeUInt16LE(1, 2);
ico.writeUInt16LE(icoSizes.length, 4);

dirEntries.forEach(({ size, buf, offset }, i) => {
  const base = HEADER_SIZE + i * DIR_ENTRY_SIZE;
  ico[base] = size === 256 ? 0 : size;
  ico[base + 1] = size === 256 ? 0 : size;
  ico[base + 2] = 0;
  ico[base + 3] = 0;
  ico.writeUInt16LE(1, base + 4);
  ico.writeUInt16LE(32, base + 6);
  ico.writeUInt32LE(buf.length, base + 8);
  ico.writeUInt32LE(offset, base + 12);
});

dirEntries.forEach(({ buf, offset }) => {
  buf.copy(ico, offset);
});

const icoPath = join(publicDir, 'favicon.ico');
writeFileSync(icoPath, ico);
console.log(`✓ favicon.ico (${ico.length} bytes, ${icoSizes.join('+')}px)`);
