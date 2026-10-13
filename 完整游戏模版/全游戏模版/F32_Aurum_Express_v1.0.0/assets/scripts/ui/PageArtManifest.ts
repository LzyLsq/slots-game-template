import { GAME_CONFIGS, prizeArt, symbolAtlas } from '../math/GameConfigs';
import type { GameConfig } from '../math/types';
import { STANDALONE_GAME_ID } from '../core/GameDistribution';

// First-frame dependencies only. Cabinet atlases are loaded when the player
// enters a game, rather than competing with login and lounge artwork.
export const ENTRY_ART = [
  'f32-station', 'f32-station-hall', ...(STANDALONE_GAME_ID ? [] : ['f32-concourse-steam']), 'f32-lounge', 'f32-cabinet', 'f32-treasure-shelf', 'f32-ledger-rail', 'f32-jackpot',
  'f32-casino-symbols', 'f32-button-emerald', 'f32-button-crimson',
  'f32-button-ivory', 'f32-button-spin', 'interfaces', 'portraits', 'optics',
  'apple-mark', 'treasury-panel-ivory', 'treasury-panel-burgundy',
  'treasury-loose-coin', 'f32-brand-title', 'f32-heading-store',
  'f32-heading-rewards', 'f32-heading-rank', 'f32-heading-profile',
  'f32-win-big', 'f32-win-mega', 'f32-win-epic',
  ...(STANDALONE_GAME_ID ? [STANDALONE_GAME_ID+'-tall'] : []),
  ...GAME_CONFIGS.map(c => 'f32-title-' + c.id),
  symbolAtlas('coin-carousel'),
] as const;

export function pageArt(page: string, config: GameConfig): string[] {
  if (page === 'game') return [
    'f32-cabinet', 'f32-cabinet-control-spin', 'f32-cabinet-control-minus',
    'f32-cabinet-control-plus', 'f32-casino-symbols-blur',
    config.id + '-tall', symbolAtlas(config.id), symbolAtlas(config.id) + '-blur',
  ];
  if (page === 'store') return GAME_CONFIGS.filter(c => !STANDALONE_GAME_ID || c.id === STANDALONE_GAME_ID).flatMap(c => [symbolAtlas(c.id), prizeArt(c.id)]);
  return [];
}
