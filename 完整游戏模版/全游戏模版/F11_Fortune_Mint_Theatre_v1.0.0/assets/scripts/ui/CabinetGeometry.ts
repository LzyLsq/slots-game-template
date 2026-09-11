import type { GameId } from '../math/types';

export const CABINET_ART_WIDTH = 1024;
export const CABINET_ART_HEIGHT = 1536;
// The original socket coordinates remain untouched inside the centered,
// outpainted room. Only the decorative scene extends beyond those coordinates.
export const CABINET_ROOM_WIDTH = 1536;
export const CABINET_ROOM_HEIGHT = 2560;

export type CabinetBox = readonly [x: number, y: number, width: number, height: number];

export interface CabinetGeometry {
  readonly artPath: string;
  readonly artHeight: number;
  readonly screen: CabinetBox;
  readonly title: CabinetBox;
  readonly topWin: CabinetBox;
  readonly balance: CabinetBox;
  readonly win: CabinetBox;
  readonly bet: CabinetBox;
  readonly spin: CabinetBox;
  readonly minus: CabinetBox;
  readonly plus: CabinetBox;
  readonly auto: CabinetBox;
  readonly turbo: CabinetBox;
  readonly screenRadius: number;
  readonly ink: 'light' | 'dark';
  readonly topWinInk: 'light' | 'dark';
  readonly titleInk: 'light' | 'dark';
}

export interface CabinetSafeInsets {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
}

export interface CabinetStageLayout {
  readonly artHeight: number;
  readonly scale: number;
  readonly x: number;
  readonly y: number;
  readonly availableWidth: number;
  readonly availableHeight: number;
}

/**
 * Measured sockets in each final 1024-wide cabinet render. Every live game
 * element is authored in this same coordinate space and inherits one stage
 * transform, so the photographed cabinet and the interactive UI cannot drift
 * apart on phones with a different aspect ratio.
 */
export const CABINET_GEOMETRIES: Readonly<Record<GameId, CabinetGeometry>> = {
  'mint-mosaic': {
    artPath: 'generated/game01/cabinet_f11',
    artHeight: 1536,
    titleInk: 'light',
    title: [280, 255, 464, 68],
    topWin: [304, 326, 416, 42],
    balance: [336, 392, 352, 47],
    screen: [279, 474, 466, 383],
    win: [317, 883, 390, 51],
    bet: [234, 1054, 159, 24],
    minus: [203, 962, 88, 72],
    plus: [307, 962, 88, 72],
    spin: [442, 948, 140, 140],
    auto: [630, 962, 88, 72],
    turbo: [730, 962, 88, 72],
    screenRadius: 24,
    ink: 'light',
    topWinInk: 'light',
  },
  'ribbon-routes': {
    artPath: 'generated/game02/cabinet_f11',
    artHeight: 1792,
    titleInk: 'dark',
    title: [205, 323, 614, 112],
    topWin: [300, 440, 424, 40],
    balance: [278, 484, 468, 56],
    screen: [182, 575, 660, 450],
    win: [245, 1061, 534, 56],
    bet: [325, 1280, 374, 48],
    minus: [118, 1143, 104, 92],
    plus: [244, 1140, 104, 92],
    spin: [443, 1118, 138, 138],
    auto: [674, 1140, 104, 92],
    turbo: [802, 1143, 104, 92],
    screenRadius: 30,
    ink: 'light',
    topWinInk: 'light',
  },
  'vault-elevator': {
    artPath: 'generated/game03/cabinet_f11',
    artHeight: 1536,
    titleInk: 'light',
    title: [286, 164, 452, 92],
    topWin: [320, 260, 384, 40],
    balance: [268, 314, 486, 67],
    screen: [232, 412, 558, 440],
    win: [280, 877, 463, 71],
    bet: [196, 1067, 168, 39],
    minus: [183, 986, 105, 76],
    plus: [288, 986, 103, 76],
    spin: [443, 975, 137, 137],
    auto: [622, 986, 86, 74],
    turbo: [712, 986, 104, 74],
    screenRadius: 18,
    ink: 'dark',
    topWinInk: 'light',
  },
  'fortune-orbit': {
    artPath: 'generated/game04/cabinet_f11',
    artHeight: 1920,
    titleInk: 'dark',
    title: [218, 372, 588, 78],
    topWin: [300, 454, 424, 42],
    balance: [310, 513, 404, 60],
    screen: [266, 672, 492, 432],
    win: [298, 1196, 428, 67],
    bet: [337, 1409, 276, 61],
    minus: [112, 1344, 90, 76],
    plus: [207, 1377, 92, 78],
    spin: [803, 1317, 140, 140],
    auto: [635, 1354, 96, 60],
    turbo: [646, 1418, 106, 76],
    screenRadius: 32,
    ink: 'light',
    topWinInk: 'dark',
  },
};

export function cabinetBoxCenter(box: CabinetBox, artHeight = CABINET_ART_HEIGHT): readonly [x: number, y: number] {
  return [
    box[0] + box[2] / 2 - CABINET_ART_WIDTH / 2,
    artHeight / 2 - box[1] - box[3] / 2,
  ];
}

export function cabinetInteractiveBounds(geometry: CabinetGeometry): CabinetBox {
  const boxes = [
    geometry.title, geometry.topWin, geometry.balance, geometry.screen, geometry.win,
    geometry.bet, geometry.spin, geometry.minus, geometry.plus, geometry.auto, geometry.turbo,
  ];
  const left = Math.min(...boxes.map((box) => box[0]));
  const top = Math.min(...boxes.map((box) => box[1]));
  const right = Math.max(...boxes.map((box) => box[0] + box[2]));
  const bottom = Math.max(...boxes.map((box) => box[1] + box[3]));
  return [left, top, right - left, bottom - top];
}

/**
 * Fits one authored cabinet plane into the safe gameplay band. The art, reels,
 * labels and controls all consume this exact result; callers must not apply a
 * second scale to individual children.
 */
export function fitCabinetStage(
  viewportWidth: number,
  viewportHeight: number,
  safe: CabinetSafeInsets = { top: 0, bottom: 0, left: 0, right: 0 },
  geometry?: CabinetGeometry,
  topToolbarHeight = 112,
  bottomHintHeight = 88,
): CabinetStageLayout {
  // Fit the measured interactive sockets inside the safe gameplay band.
  // Decorative room edges can crop, but reels, readouts and controls cannot.
  // Every child inherits this one transform, including the photographic art.
  const interactiveSidePadding = 10;
  // Toolbar buttons end 96 units below the safe top; retain a 16-unit gap.
  const top = viewportHeight / 2 - safe.top - topToolbarHeight;
  const bottom = -viewportHeight / 2 + safe.bottom + bottomHintHeight + 38;
  const left = -viewportWidth / 2 + safe.left + interactiveSidePadding;
  const right = viewportWidth / 2 - safe.right - interactiveSidePadding;
  const availableWidth = Math.max(1, right - left);
  const availableHeight = Math.max(1, top - bottom);
  const heightScale = availableHeight / CABINET_ART_HEIGHT;

  if (!geometry) {
    const scale = Math.min(availableWidth / CABINET_ART_WIDTH, heightScale);
    return {
      artHeight: CABINET_ART_HEIGHT,
      scale,
      x: (left + right) / 2,
      y: (top + bottom) / 2,
      availableWidth,
      availableHeight,
    };
  }

  const interactive = cabinetInteractiveBounds(geometry);
  const interactiveWidth = Math.max(1, interactive[2]);
  const widthScale = availableWidth / interactiveWidth;
  // Fit functional sockets, not decorative ceilings and floors. The entire
  // room shares this transform and may crop beyond the screen edges.
  const scale = Math.min(availableHeight / interactive[3], widthScale);
  const interactiveLeft = interactive[0] - CABINET_ART_WIDTH / 2;
  const interactiveRight = interactive[0] + interactive[2] - CABINET_ART_WIDTH / 2;
  const minimumX = Math.max(left - interactiveLeft * scale, viewportWidth / 2 - CABINET_ROOM_WIDTH * scale / 2);
  const maximumX = Math.min(right - interactiveRight * scale, -viewportWidth / 2 + CABINET_ROOM_WIDTH * scale / 2);
  const centeredX = (left + right) / 2;
  const x = Math.min(maximumX, Math.max(minimumX, centeredX));
  const interactiveTop = geometry.artHeight / 2 - interactive[1];
  const interactiveBottom = interactiveTop - interactive[3];
  const minimumY = bottom - interactiveBottom * scale;
  const maximumY = top - interactiveTop * scale;
  const artHalfHeight = CABINET_ROOM_HEIGHT * scale / 2;
  const coverMinimumY = viewportHeight / 2 - artHalfHeight;
  const coverMaximumY = -viewportHeight / 2 + artHalfHeight;
  const y = Math.min(Math.min(maximumY, coverMaximumY), Math.max(Math.max(minimumY, coverMinimumY), 0));

  return {
    artHeight: geometry.artHeight,
    scale,
    x,
    y,
    availableWidth,
    availableHeight,
  };
}

export function transformedCabinetBox(
  box: CabinetBox,
  layout: CabinetStageLayout,
): readonly [left: number, bottom: number, right: number, top: number] {
  const [x, y] = cabinetBoxCenter(box, layout.artHeight);
  const halfWidth = box[2] * layout.scale / 2;
  const halfHeight = box[3] * layout.scale / 2;
  const centerX = layout.x + x * layout.scale;
  const centerY = layout.y + y * layout.scale;
  return [centerX - halfWidth, centerY - halfHeight, centerX + halfWidth, centerY + halfHeight];
}
