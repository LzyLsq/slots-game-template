/** Reward-only decoration. The ordinary UI panels and shared textures stay intact. */
export const REWARD_THEMES = [
  { name:'Honey treasury', atlas:'symbols-golden-hour', ornaments:[8,5], accent:'#E9AC36', deep:'#855218', pale:'#FFF0BB', ink:'#674019', motif:'honeycomb' },
  { name:'Peach blessings', atlas:'symbols-jade-treasury', ornaments:[10,14], accent:'#E995AF', deep:'#99516C', pale:'#FFE6E9', ink:'#77423F', motif:'blossom' },
  { name:'Koi fortune', atlas:'symbols-pearl-palace', ornaments:[7,10], accent:'#79C4C9', deep:'#286C70', pale:'#E0F5EF', ink:'#254D58', motif:'wave' },
  { name:'Fox festival', atlas:'symbols-ruby-revel', ornaments:[10,1], accent:'#D97951', deep:'#9B3628', pale:'#FFE9CD', ink:'#793C25', motif:'festival' },
] as const;
export type RewardPlateKind = 'title'|'detail'|'amount'|'button'|'compact';
export function rewardInk(index:number,kind:RewardPlateKind):string {
  return rewardTheme(index).ink;
}
export function rewardTheme(index:number):typeof REWARD_THEMES[number] {
  return REWARD_THEMES[Number.isFinite(index)?Math.max(0,Math.min(3,Math.trunc(index))):0];
}
export function rewardPlateLayout(width:number,height:number):{ornamentSize:number;ornamentX:number;textWidth:number} {
  const ornamentSize=Math.min(height*.72,width*.09);
  const ornamentX=width/2-ornamentSize*.68-9;
  return {ornamentSize,ornamentX,textWidth:Math.min(width*.72,2*(ornamentX-ornamentSize*.52-12))};
}
