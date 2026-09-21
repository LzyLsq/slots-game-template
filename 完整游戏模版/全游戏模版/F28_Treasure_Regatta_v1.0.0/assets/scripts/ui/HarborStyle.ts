import type { ControlFace } from './Surface';

export type HarborControlRole = 'ticket' | 'chest' | 'podium' | 'market' | 'passport' |
  'back' | 'log' | 'switch' | 'seal' | 'cancel' | 'wager' | 'next';

type HarborProfile = {
  x: number;
  left: number;
  right: number;
  y: number;
  size: number;
  feel: NonNullable<ControlFace['feel']>;
  light?: boolean;
};

/**
 * Each harbor fitting has a different sculpted ornament. These safe areas keep
 * copy on the enamel face instead of centering it across rope, locks or seals.
 */
const HARBOR_PROFILES: Record<HarborControlRole, HarborProfile> = {
  ticket:   { x:.280, left:.820, right:.260, y:-.005, size:.285, feel:'press' },
  chest:    { x:.330, left:.900, right:.240, y:-.010, size:.270, feel:'press' },
  podium:   { x:.260, left:.750, right:.230, y:-.018, size:.265, feel:'press' },
  market:   { x:.285, left:.820, right:.250, y:-.012, size:.270, feel:'press' },
  passport: { x:.300, left:.820, right:.220, y:-.004, size:.265, feel:'press' },
  back:     { x:.360, left:.950, right:.230, y:-.006, size:.275, feel:'press' },
  log:      { x:.335, left:.900, right:.230, y:-.005, size:.265, feel:'press' },
  switch:   { x:.315, left:.850, right:.220, y:-.012, size:.255, feel:'rocker' },
  seal:     { x:.310, left:.820, right:.200, y:-.004, size:.275, feel:'press' },
  cancel:   { x:.335, left:.900, right:.230, y:-.008, size:.270, feel:'press' },
  wager:    { x:.265, left:.780, right:.250, y:-.006, size:.270, feel:'step' },
  next:     { x:.310, left:.820, right:.200, y:-.006, size:.270, feel:'press' },
};

export function harborFace(role: HarborControlRole, width: number, height: number): ControlFace {
  const p = HARBOR_PROFILES[role];
  const safeWidth = width - height * (p.left + p.right);
  return {
    feel: p.feel,
    sliced: true,
    labelX: height * p.x,
    labelY: height * p.y,
    labelWidth: Math.max(58, safeWidth),
    fontSize: Math.max(25, Math.min(42, height * p.size)),
    lightLabel: p.light,
    finishLift: .13,
    shadowLift: .82,
    lustreStrength: 1.28,
  };
}
