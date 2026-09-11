import assert from 'node:assert/strict';
import {
  CABINET_ART_WIDTH,
  CABINET_ROOM_WIDTH,
  CABINET_ROOM_HEIGHT,
  CABINET_GEOMETRIES,
  cabinetInteractiveBounds,
  fitCabinetStage,
  transformedCabinetBox,
} from '../assets/scripts/ui/CabinetGeometry';
import { GAME_CONFIGS } from '../assets/scripts/math/GameConfigs';

const devices = [
  { name: 'extra tall browser', width: 390, height: 1000, safe: { top: 0, bottom: 0, left: 0, right: 0 } },
  { name: '3:1 portrait', width: 360, height: 1080, safe: { top: 32, bottom: 24, left: 0, right: 0 } },
  { name: 'tablet portrait', width: 768, height: 1024, safe: { top: 24, bottom: 20, left: 0, right: 0 } },
  { name: 'standard portrait', width: 390, height: 844, safe: { top: 0, bottom: 0, left: 0, right: 0 } },
  { name: 'browser compact viewport', width: 393, height: 659, safe: { top: 0, bottom: 0, left: 0, right: 0 } },
  { name: 'iPhone SE', width: 320, height: 568, safe: { top: 20, bottom: 0, left: 0, right: 0 } },
  { name: 'iPhone 8', width: 375, height: 667, safe: { top: 20, bottom: 0, left: 0, right: 0 } },
  { name: 'iPhone 13 mini', width: 375, height: 812, safe: { top: 50, bottom: 34, left: 0, right: 0 } },
  { name: 'iPhone 15 Pro', width: 393, height: 852, safe: { top: 59, bottom: 34, left: 0, right: 0 } },
  { name: 'iPhone 15 Pro Max', width: 430, height: 932, safe: { top: 59, bottom: 34, left: 0, right: 0 } },
  { name: 'compact Android', width: 360, height: 640, safe: { top: 24, bottom: 18, left: 0, right: 0 } },
  { name: 'tall Android', width: 412, height: 915, safe: { top: 32, bottom: 24, left: 0, right: 0 } },
] as const;

const cabinetBoxKeys = [
  'title', 'topWin', 'balance', 'screen', 'win', 'bet',
  'spin', 'minus', 'plus', 'auto', 'turbo',
] as const;

function hasPositiveOverlap(
  first: readonly [number, number, number, number],
  second: readonly [number, number, number, number],
): boolean {
  const firstRight = first[0] + first[2];
  const firstBottom = first[1] + first[3];
  const secondRight = second[0] + second[2];
  const secondBottom = second[1] + second[3];
  return Math.min(firstRight, secondRight) > Math.max(first[0], second[0])
    && Math.min(firstBottom, secondBottom) > Math.max(first[1], second[1]);
}

let checked = 0;
for (const device of devices) {
  // Mirror SafeAreaAdapter's Cocos design-space mapping.
  const designScale = Math.min(device.width / 1080, device.height / 1920);
  const width = device.width / designScale;
  const height = device.height / designScale;
  const safe = {
    top: device.safe.top / designScale,
    bottom: device.safe.bottom / designScale,
    left: device.safe.left / designScale,
    right: device.safe.right / designScale,
  };
  for (const config of GAME_CONFIGS) {
    const geometry = CABINET_GEOMETRIES[config.id];
    assert(geometry, `${config.id}: missing cabinet geometry`);
    const layout = fitCabinetStage(width, height, safe, geometry);
    assert(layout.scale > 0, `${device.name}: scale must stay positive`);
    assert.equal(layout.artHeight, geometry.artHeight, 'art and sockets must share their coordinate space');
    const [artLeft, artBottom, artRight, artTop] = transformedCabinetBox([
      (CABINET_ART_WIDTH - CABINET_ROOM_WIDTH) / 2,
      (geometry.artHeight - CABINET_ROOM_HEIGHT) / 2,
      CABINET_ROOM_WIDTH, CABINET_ROOM_HEIGHT,
    ], layout);
    assert(artLeft <= -width / 2 + 0.001 && artRight >= width / 2 - 0.001, `${device.name} ${config.id}: uncovered screen sides`);
    assert(artBottom <= -height / 2 + 0.001 && artTop >= height / 2 - 0.001, `${device.name} ${config.id}: uncovered screen ends`);
    assert(
      CABINET_ROOM_HEIGHT * layout.scale >= height,
      `${device.name} ${config.id}: cabinet scene leaves excessive vertical bands`,
    );
    const bounds = cabinetInteractiveBounds(geometry);
    assert(bounds[0] >= 0 && bounds[1] >= 0, `${config.id}: socket begins outside art`);
    assert(bounds[0] + bounds[2] <= CABINET_ART_WIDTH, `${config.id}: socket exceeds art width`);
    assert(bounds[1] + bounds[3] <= geometry.artHeight, `${config.id}: socket exceeds art height`);

    for (const key of cabinetBoxKeys) {
      const box = geometry[key];
      assert(box[0] >= 0 && box[1] >= 0, `${config.id} ${key}: begins outside 1024×1536 art`);
      assert(box[2] > 0 && box[3] > 0, `${config.id} ${key}: must have positive size`);
      assert(box[0] + box[2] <= CABINET_ART_WIDTH, `${config.id} ${key}: exceeds art width`);
      assert(box[1] + box[3] <= geometry.artHeight, `${config.id} ${key}: exceeds art height`);
      const [left, bottom, right, top] = transformedCabinetBox(geometry[key], layout);
      assert(left >= -width / 2 + safe.left + 10 - 0.001, `${device.name} ${config.id} ${key}: left clipping`);
      assert(right <= width / 2 - safe.right - 10 + 0.001, `${device.name} ${config.id} ${key}: right clipping`);
      assert(top <= height / 2 - safe.top - 112 + 0.001, `${device.name} ${config.id} ${key}: toolbar overlap`);
      assert(bottom >= -height / 2 + safe.bottom + 126 - 0.001, `${device.name} ${config.id} ${key}: hint overlap`);
    }

    for (let firstIndex = 0; firstIndex < cabinetBoxKeys.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < cabinetBoxKeys.length; secondIndex += 1) {
        const firstKey = cabinetBoxKeys[firstIndex];
        const secondKey = cabinetBoxKeys[secondIndex];
        assert(
          !hasPositiveOverlap(geometry[firstKey], geometry[secondKey]),
          `${config.id}: ${firstKey} overlaps ${secondKey}`,
        );
      }
    }

    if (config.id === 'fortune-orbit') {
      const spinCenterX = geometry.spin[0] + geometry.spin[2] / 2;
      const switchRight = Math.max(
        geometry.auto[0] + geometry.auto[2],
        geometry.turbo[0] + geometry.turbo[2],
      );
      assert(spinCenterX >= switchRight + 40, 'fortune-orbit: SPIN must remain clearly right of AUTO/TURBO');
    }

    const cellWidth = geometry.screen[2] / config.columns;
    const cellHeight = geometry.screen[3] / config.rows;
    const symbolSize = Math.min(cellWidth, cellHeight) * 0.82;
    assert(symbolSize * 1.13 < cellWidth, `${config.id}: win-pop would cross the reel column`);
    assert(symbolSize * 1.13 < cellHeight, `${config.id}: bounce would cross the reel row`);
    checked += 1;
  }
}

console.log(`PASS ${checked} F11 cabinet/device combinations: one plane, safe bounds and reel breathing room.`);
