/** Four distinct animal portraits. Legacy 4×4 atlas IDs remain readable. */
export const PORTRAITS = [
  { index: 0, label: 'Golden Lion' },
  { index: 1, label: 'Lucky Elephant' },
  { index: 2, label: 'Fortune Fox' },
  { index: 3, label: 'Treasury Bull' },
] as const;

export function canonicalPortraitIndex(index: number): number {
  return Number.isSafeInteger(index) && index >= 0 && index <= 15 ? index % PORTRAITS.length : 0;
}

export const PORTRAIT_PICKER = {
  height: 1360, columns: 2, columnOffset: 210, firstRow: 180, rowSpacing: 450,
  hitWidth: 380, hitHeight: 432, medallionY: 45, medallionSize: 280,
  portraitSize: 226, nameY: -130, nameWidth: 368, nameHeight: 56,
  selectedY: -186, selectedWidth: 340, selectedHeight: 48, hintY: -520, hintHeight: 52,
} as const;

export function portraitSeat(index: number): {x: number; y: number} {
  return {x: (index % PORTRAIT_PICKER.columns ? 1 : -1) * PORTRAIT_PICKER.columnOffset,
    y: PORTRAIT_PICKER.firstRow - Math.floor(index / PORTRAIT_PICKER.columns) * PORTRAIT_PICKER.rowSpacing};
}

export const PORTRAIT_TRANSLATIONS: Record<string, readonly string[]> = {
  'Golden Lion': ['金狮', '金獅', '黄金のライオン', '황금 사자'],
  'Lucky Elephant': ['福象', '福象', '幸運のゾウ', '행운의 코끼리'],
  'Fortune Fox': ['招财狐', '招財狐', '招福のキツネ', '복을 부르는 여우'],
  'Treasury Bull': ['金库牛', '金庫牛', '金庫の雄牛', '금고의 황소'],
  'Current portrait': ['当前头像', '目前頭像', '現在のアバター', '현재 아바타'],
  'Tap a portrait to save it.': ['点击头像即可保存。', '點選頭像即可儲存。', 'アバターをタップして保存。', '아바타를 눌러 저장하세요.'],
};
