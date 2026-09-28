import path from 'node:path';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require('/Users/xzkj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');

const sourceDir = '/Users/xzkj/Documents/Codex/2026-09-22/gei/work/ccswitch-f32/images';
const outDir = path.resolve('assets/resources/art');
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

const exists = async (file) => fs.access(file).then(() => true, () => false);
const input = (name) => path.join(sourceDir, name);
const output = (name) => path.join(outDir, name);

function chromaAlpha(r, g, b) {
  // Distance from the authored #FF00FF key. Preserve warm coral and ruby tones
  // by requiring both red/blue proximity and a strongly suppressed green channel.
  const d = Math.sqrt((255 - r) ** 2 + g ** 2 + (255 - b) ** 2);
  const keyLike = r > 142 && b > 142 && g < Math.min(r, b) * 0.62;
  if (!keyLike) return 255;
  if (d <= 24) return 0;
  if (d >= 108) return 255;
  const t = (d - 24) / 84;
  return Math.round(255 * t * t * (3 - 2 * t));
}

async function keyBuffer(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const a = chromaAlpha(r, g, b);
    data[i + 3] = Math.min(data[i + 3], a);
    if (a > 0 && a < 255) {
      // Remove magenta spill from semi-transparent antialiased pixels.
      const af = a / 255, inv = 1 - af;
      data[i] = Math.max(0, Math.min(255, Math.round((r - inv * 255) / af)));
      data[i + 1] = Math.max(0, Math.min(255, Math.round(g / af)));
      data[i + 2] = Math.max(0, Math.min(255, Math.round((b - inv * 255) / af)));
    } else if (a === 0) {
      data[i] = data[i + 1] = data[i + 2] = 0;
    }
  }
  return sharp(data, { raw: info }).png({ compressionLevel: 9 }).toBuffer();
}

// The runtime component sheets contain soft light and smoke near the magenta
// key. Their low-alpha edge pixels need a firmer matte than the older cutouts:
// dividing tiny alpha values amplified green into a neon fringe. This cleaner
// deliberately drops unstable pixels and caps decontamination, while every
// surviving visible pixel still comes from the CC Switch generation.
async function keyBufferClean(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const d = Math.sqrt((255 - r) ** 2 + g ** 2 + (255 - b) ** 2);
    const keyLike = r > 130 && b > 130 && g < Math.min(r, b) * 0.72 && Math.abs(r - b) < 105;
    if (!keyLike) continue;
    let a = d <= 8 ? 0 : d >= 70 ? 255 : Math.round(255 * ((d - 8) / 62) ** 2 * (3 - 2 * ((d - 8) / 62)));
    if (a < 52) a = 0;
    data[i + 3] = Math.min(data[i + 3], a);
    if (a > 0 && a < 255) {
      const af = a / 255, inv = 1 - af, divisor = Math.max(0.58, af);
      data[i] = Math.max(0, Math.min(255, Math.round((r - inv * 255) / divisor)));
      data[i + 1] = Math.max(0, Math.min(255, Math.round(g / divisor)));
      data[i + 2] = Math.max(0, Math.min(255, Math.round((b - inv * 255) / divisor)));
    } else if (a === 0) {
      data[i] = data[i + 1] = data[i + 2] = 0;
    }
  }
  return sharp(data, { raw: info }).png({ compressionLevel: 9 }).toBuffer();
}

async function alphaBounds(buffer, threshold = 10) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > threshold) {
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX) throw new Error('No foreground after chroma key.');
  const pad = Math.max(2, Math.round(Math.max(info.width, info.height) * 0.004));
  const left = Math.max(0, minX - pad), top = Math.max(0, minY - pad);
  return {
    left, top,
    width: Math.min(info.width - left, maxX - minX + 1 + pad * 2),
    height: Math.min(info.height - top, maxY - minY + 1 + pad * 2),
  };
}

async function trimBuffer(buffer) {
  const bounds = await alphaBounds(buffer);
  return sharp(buffer).extract(bounds).png({ compressionLevel: 9 }).toBuffer();
}

async function contain(buffer, width, height, margin = 0) {
  const fitted = await sharp(buffer).resize(width - margin * 2, height - margin * 2, {
    fit: 'contain', withoutEnlargement: false, background: transparent, kernel: sharp.kernel.lanczos3,
  }).png({ compressionLevel: 9 }).toBuffer();
  return sharp({ create: { width, height, channels: 4, background: transparent } })
    .composite([{ input: fitted, gravity: 'center' }]).png({ compressionLevel: 9 }).toBuffer();
}

async function write(name, buffer) {
  await fs.writeFile(output(name), buffer);
  const m = await sharp(buffer).metadata();
  console.log(`${name} <- ${m.width}x${m.height}`);
}

async function copyResize(sourceName, targetName, width, height, mode = 'fill') {
  const buffer = await sharp(input(sourceName)).ensureAlpha().resize(width, height, {
    fit: mode, position: 'centre', kernel: sharp.kernel.lanczos3, background: transparent,
  }).png({ compressionLevel: 9 }).toBuffer();
  await write(targetName, buffer);
}

async function keyResize(sourceName, targetName, width, height, trim = false, margin = 0) {
  let buffer = await keyBuffer(input(sourceName));
  if (trim) buffer = await trimBuffer(buffer);
  buffer = trim ? await contain(buffer, width, height, margin) : await sharp(buffer).resize(width, height, {
    fit: 'fill', kernel: sharp.kernel.lanczos3,
  }).png({ compressionLevel: 9 }).toBuffer();
  await write(targetName, buffer);
}

async function gridCell(sourceName, cols, rows, index, targetName, width, height, margin = 0, trim = true) {
  const keyed = await keyBuffer(input(sourceName));
  const meta = await sharp(keyed).metadata();
  const x0 = Math.round((index % cols) * meta.width / cols);
  const y0 = Math.round(Math.floor(index / cols) * meta.height / rows);
  const x1 = Math.round(((index % cols) + 1) * meta.width / cols);
  const y1 = Math.round((Math.floor(index / cols) + 1) * meta.height / rows);
  let cell = await sharp(keyed).extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 }).png().toBuffer();
  if (trim) cell = await trimBuffer(cell);
  cell = await contain(cell, width, height, margin);
  await write(targetName, cell);
}

await fs.mkdir(outDir, { recursive: true });

// Full-screen CC Switch paintings.
await copyResize('foundry-arrival.png', 'foundry-arrival.png', 1024, 1536);
await copyResize('foundry-hall.png', 'foundry-hall.png', 1024, 1536);
await copyResize('foundry-services.png', 'foundry-services.png', 1024, 1536);

// Integrated cabinet + environment paintings. The source is already exactly 1:2.
for (const id of ['coin-press', 'lantern-ledger', 'cloud-conveyor', 'jubilee-vault']) {
  await copyResize(`${id}-tall.png`, `${id}-tall.png`, 2048, 4096);
}

// Brand and all previously generated page sculptures.
// Current generated sign: pure-magenta matte, preserving all CC Switch pixels.
if (await exists(input('foundry-auth-nameplate.png'))) {
  const nameplate = await keyBufferClean(input('foundry-auth-nameplate.png'));
  const trimmed = await trimBuffer(nameplate);
  await write('foundry-brand.png', await sharp(trimmed).resize({ width: 1536 }).png({ compressionLevel: 9 }).toBuffer());
} else await keyResize('foundry-brand-opaque.png', 'foundry-brand.png', 1422, 723, true, 12);
for (const [name, w, h] of [
  ['foundry-auth-gate', 1024, 1320], ['foundry-shop-rack', 1024, 1320],
  ['foundry-reward-dial', 1024, 1320], ['foundry-rank-wall', 1024, 1320],
  ['foundry-passport', 1024, 1320], ['foundry-modal-drawer', 1024, 1400],
  ['foundry-nav-rail', 1024, 220],
]) {
  if (name === 'foundry-nav-rail') {
    // Ignore nearly invisible bloom outside the five metal sockets. Otherwise
    // the usable rail shrinks to half width and touch targets miss the frames.
    const rail = await trimBuffer(await keyBufferClean(input(`${name}-opaque.png`)));
    await write(`${name}.png`, await contain(rail, w, h, 4));
  } else await keyResize(`${name}-opaque.png`, `${name}.png`, w, h, true, 14);
}

// Four cabinet-specific symbol atlases. Keep equal grid coordinates intact.
for (const id of ['coin-press', 'lantern-ledger', 'cloud-conveyor', 'jubilee-vault']) {
  const target = `symbols-${id}.png`;
  await keyResize(`symbols-${id}-opaque.png`, target, 1024, 1024, false);
  const clear = await fs.readFile(output(target));
  const blur = await sharp(clear).blur(4.2).png({ compressionLevel: 9 }).toBuffer();
  await write(`symbols-${id}-blur.png`, blur);
}
await fs.copyFile(output('symbols-coin-press.png'), output('symbols.png'));
await fs.copyFile(output('symbols-coin-press-blur.png'), output('symbols-blur.png'));
console.log('symbols aliases <- coin-press CC Switch atlas');

if (await exists(input('interfaces-opaque.png'))) await keyResize('interfaces-opaque.png', 'interfaces.png', 1024, 1024, false);
if (await exists(input('portraits-opaque.png'))) await keyResize('portraits-opaque.png', 'portraits.png', 1024, 1024, false);
await copyResize('optics.png', 'optics.png', 1024, 1024);

if (await exists(input('destinations-opaque.png'))) await keyResize('destinations-opaque.png', 'foundry-destinations.png', 2048, 2048, false);
if (await exists(input('buttons-opaque.png'))) {
  for (let i = 0; i < 16; i++) await gridCell('buttons-opaque.png', 4, 4, i, `foundry-button-${i}.png`, 300, 300, 10);
}
if (await exists(input('frames-opaque.png'))) {
  for (let i = 0; i < 4; i++) await gridCell('frames-opaque.png', 4, 1, i, `foundry-frame-${i}.png`, 256, 256, 0);
}
if (await exists(input('plates-opaque.png'))) {
  for (let i = 0; i < 4; i++) await gridCell('plates-opaque.png', 1, 4, i, `foundry-plate-${i}.png`, 512, 160, 0);
}
if (await exists(input('prizes-opaque.png'))) {
  const names = ['coin-press', 'lantern-ledger', 'cloud-conveyor', 'jubilee-vault'];
  for (let i = 0; i < 4; i++) await gridCell('prizes-opaque.png', 2, 2, i, `prize-${names[i]}.png`, 512, 600, 14);
}
const titleSources = ['title-coin-press-opaque.png', 'title-lantern-ledger-opaque.png', 'title-cloud-conveyor-opaque.png', 'title-jubilee-vault-opaque.png'];
for (let i = 0; i < titleSources.length; i++) if (await exists(input(titleSources[i]))) {
  await keyResize(titleSources[i], `foundry-title-${i}.png`, 560, 168, true, 4);
}

// Generated runtime surfaces/effects requested for F32. These are not drawn in
// code: the CC Switch pixels are only chroma-keyed, normalized into predictable
// atlas cells and resized for Cocos texture import.
if (await exists(input('foundry-selector-ring-opaque.png'))) {
  let ring = await keyBufferClean(input('foundry-selector-ring-opaque.png'));
  ring = await trimBuffer(ring);
  ring = await contain(ring, 1024, 1024, 8);
  await write('foundry-selector-ring.png', ring);
}
if (await exists(input('foundry-win-machines-opaque.png'))) {
  const machines = await sharp(await keyBufferClean(input('foundry-win-machines-opaque.png'))).resize(2048, 2048, { fit: 'fill', kernel: sharp.kernel.lanczos3 }).png({ compressionLevel: 9 }).toBuffer();
  await write('foundry-win-machines.png', machines);
}
if (await exists(input('foundry-veil.png'))) {
  await copyResize('foundry-veil.png', 'foundry-veil.png', 1024, 1536);
}
if (await exists(input('foundry-ui-components-opaque.png'))) {
  const keyed=await keyBufferClean(input('foundry-ui-components-opaque.png'));
  const meta=await sharp(keyed).metadata();
  const cellSize=512, stretchCells=new Set([0,1,2,3,4,5,6,7,14,15]);
  const layers=[];
  for(let index=0;index<16;index++){
    const sourceCellW=Math.round(meta.width/4),sourceCellH=Math.round(meta.height/4);
    const left=Math.round((index%4)*meta.width/4),top=Math.round(Math.floor(index/4)*meta.height/4);
    let cell=await sharp(keyed).extract({left,top,width:index%4===3?meta.width-left:sourceCellW,height:Math.floor(index/4)===3?meta.height-top:sourceCellH}).png().toBuffer();
    cell=await trimBuffer(cell);
    const normalized=await sharp(cell).resize(cellSize,cellSize,{fit:stretchCells.has(index)?'fill':'contain',position:'centre',background:transparent,kernel:sharp.kernel.lanczos3}).png({compressionLevel:9}).toBuffer();
    layers.push({input:normalized,left:(index%4)*cellSize,top:Math.floor(index/4)*cellSize});
  }
  const atlas=await sharp({create:{width:2048,height:2048,channels:4,background:transparent}}).composite(layers).png({compressionLevel:9}).toBuffer();
  await write('foundry-ui-components.png',atlas);
}
