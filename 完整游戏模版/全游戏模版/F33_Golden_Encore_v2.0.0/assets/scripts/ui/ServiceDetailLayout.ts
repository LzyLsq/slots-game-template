/** Clear lettering regions in the existing generated hardware. The seal and
 * carved ends are decoration, not usable space for labels or coin totals. */
export interface LetteringBox { x: number; y: number; width: number; height: number }
export function buttonLettering(art: string, width: number, height: number): LetteringBox {
  if (art === 'ui-spin-button') return { x: 0, y: -4, width: width * .82, height: height * .34 };
  if (art === 'ui-wide-ticket') return { x: -width * .02, y: 0, width: width * .76, height: height * .58 };
  if (art === 'ui-ticket-button') return { x: -width * .04, y: height * .015, width: width * .67, height: height * .55 };
  return { x: 0, y: 0, width: width * .78, height: height * .58 };
}
export const ACCOUNT_DETAIL = {
  statXs: [-250, -4, 242], statCopyWidth: 190,
  settingXs: [-310, 0, 310], settingWidth: 300, settingHeight: 82, settingY: -682,
} as const;
/** The generated scroll's ivory paper spans +/- .37 of its width.
 * Portrait captions remain on paper rather than bridging its jade border. */
export const AVATAR_DETAIL = { upperXs: [-225, 0, 225], slotWidth: 224,
  tagWidth: 216, copyWidth: 166, portraitWidth: 190, paperHalfWidth: 333 } as const;
export const CALENDAR_DETAIL = { dayX: -160, dayWidth: 135, amountX: 28, amountWidth: 220,
  stateX: 226, stateWidth: 112, jadeCoreHalfWidth: 282.36 } as const;
export const NAME_NOTICE = { width: 570, height: 96, y: -86 } as const;
export const RENAME_DETAIL = { copyWidth: 570, copyHeight: 62, copyY: 127 } as const;
export const RANK_DETAIL = { rankX: -321, rankWidth: 90, nameX: -70, nameWidth: 376, amountX: 246, amountWidth: 174 } as const;
export const HISTORY_DETAIL = { copyX: -83, copyWidth: 456, amountX: 255, amountWidth: 164 } as const;
export function lanternDay(day: number, currentDay: number, ready: boolean): { current: boolean; state: 'TAKEN' | 'READY' | 'NEXT'; art: string } {
  const current = day === currentDay;
  return { current, state: day < currentDay || current && !ready ? 'TAKEN' : current ? 'READY' : 'NEXT',
    art: current ? 'button-coral' : 'ui-wide-ticket' };
}
/** Modal shields cover wide previews too, instead of assuming 1024 px. */
export function sheetViewport(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(width / 1024, height / 1800);
  return { width: Math.max(1024, width / scale), height: Math.max(2048, height / scale) };
}
/** Temporary readable acknowledgements sit above decoration, not the bottom
 * navigation. Coordinates are logical; the view applies the same root scale. */
export function noticeLayout(page: string, width: number, height: number): { scale: number; y: number; width: number; height: number } {
  const scale = Math.min(width / 1024, height / 1800), half = height / scale / 2;
  const y = page === 'home' ? -506 : page === 'login' ? 568 : page === 'account' ? (height / width < 1.9 ? 600 : 675)
    : page === 'game' ? -half + 72 : -620;
  return { scale, y, width: 840, height: 112 };
}

/** The rulebook is registered to its generated paper, not its gilded margins.
 * Adjacent tap targets must stay disjoint; compact previews show one title per
 * row rather than compressing title + body into overlapping hit boxes. */
export const RULES_DETAIL = {
  full: { rowY: 210, rowStep: 84, titleY: 18, titleHeight: 36,
    detailY: -22, detailHeight: 30, hitHeight: 78, emblemSize: 66 },
  compact: { rowY: 150, rowStep: 58, titleY: 0, titleHeight: 36,
    detailY: -22, detailHeight: 30, hitHeight: 52, emblemSize: 44 },
} as const;
