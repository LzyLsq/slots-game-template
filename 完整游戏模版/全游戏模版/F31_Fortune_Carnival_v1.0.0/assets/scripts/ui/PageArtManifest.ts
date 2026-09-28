import { GAME_CONFIGS, prizeArt, symbolAtlas } from '../math/GameConfigs';
import type { GameConfig } from '../math/types';

// These assets appear on the sign-in and plaza floors (including the shared
// confetti). Large cabinet-only textures must not block the first frame.
export const ENTRY_ART = [
  'salon','interfaces','portraits','optics','apple-mark',
  'carnival-services','carnival-hall-soft','carnival-destinations',
  'treasury-button-red','treasury-button-green','treasury-button-brass',
  'treasury-panel-ivory','treasury-panel-burgundy','treasury-day-medallion',
  'treasury-brand-title','treasury-heading-store','treasury-heading-rewards',
  'treasury-heading-rank','treasury-heading-profile',
  'treasury-win-big','treasury-win-mega','treasury-win-epic','treasury-loose-coin',
  ...GAME_CONFIGS.map(c=>'treasury-title-'+c.id),
  symbolAtlas('coin-carousel'),
] as const;

export function pageArt(page: string, config: GameConfig): string[] {
  if (page === 'game') return [
    config.id+'-tall',symbolAtlas(config.id),symbolAtlas(config.id)+'-blur',
    'treasury-jackpot-environment-'+config.id,
  ];
  // The store displays four photographed prize bundles and their minted seals.
  if (page === 'store') return GAME_CONFIGS.flatMap(c=>[symbolAtlas(c.id),prizeArt(c.id)]);
  return [];
}
