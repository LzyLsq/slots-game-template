/** Registration on the CC Switch-generated 1254 × 1254 merchant cabinet.
 * Top-left source pixels, not unrelated screen offsets. Keep live copy inside
 * the ivory niches and the lettering inside the red inset of each signboard.
 */
export type ShopFixture = readonly [x: number, y: number, width: number, height: number];
export const SHOP_SOURCE_SIZE = 1254;
export const SHOP_CABINET = { x: 0, y: -172, width: 980, height: 980 } as const;

export const SHOP_BUNDLES = [
  { name: 'PEARL PURSE', amount: 1000, detail: 'QUICK PLAY', art: 'symbol-pearl' },
  { name: 'JADE FERRY', amount: 3000, detail: 'LONG PLAY', art: 'mode-jade-ferry' },
  { name: 'GOLD RESERVE', amount: 8000, detail: 'MORE SPINS', art: 'symbol-ingot' },
  { name: 'DRAGON CACHE', amount: 20000, detail: 'LARGE CACHE', art: 'symbol-dragon' },
] as const;

// Full-width title above the goods; amount and description in the open
// right-hand column. The image sits on the cabinet's existing velvet cushion.
export const SHOP_NICHES: readonly ShopFixture[] = [
  [384, 351, 394, 256], [882, 351, 394, 256],
  [384, 795, 394, 256], [882, 795, 394, 256],
];
export const SHOP_SIGN_INSETS: readonly ShopFixture[] = [
  [378, 543, 354, 42], [876, 543, 354, 42],
  [378, 986, 354, 42], [876, 986, 354, 42],
];
export const SHOP_SLOTS = SHOP_BUNDLES.map((_, index) => {
  const dx = index % 2 * 498;
  const dy = index >= 2 ? 444 : 0;
  const signY = index >= 2 ? 986 : 543;
  return {
    title: [384 + dx, 271 + dy, 350, 54] as ShopFixture,
    amount: [465 + dx, 350 + dy, 210, 64] as ShopFixture,
    detail: [465 + dx, 417 + dy, 210, 48] as ShopFixture,
    product: [276 + dx, 399 + dy, 144, 144] as ShopFixture,
    claim: [378 + dx, signY, 332, 42] as ShopFixture,
    // The generous invisible hit band is centred on the same physical plaque;
    // it does not move the letters or add another pasted-on button background.
    hit: [378 + dx, signY, 366, 160] as ShopFixture,
  };
});

export function shopPlacement(slot: ShopFixture, width: number, height: number): { x: number; y: number; width: number; height: number } {
  return {
    x: (slot[0] - SHOP_SOURCE_SIZE / 2) * width / SHOP_SOURCE_SIZE,
    y: (SHOP_SOURCE_SIZE / 2 - slot[1]) * height / SHOP_SOURCE_SIZE,
    width: slot[2] * width / SHOP_SOURCE_SIZE,
    height: slot[3] * height / SHOP_SOURCE_SIZE,
  };
}
