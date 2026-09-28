/** Cross-mode newcomer milestone. Only settled spins count; replayed request IDs
 * return the original result. A shortfall is separately itemised, not fabricated on reels. */
export function newcomerMinimum(played:number):10|undefined {
  if(!Number.isSafeInteger(played)||played<0)return undefined;
  return played===4?10:undefined;
}
export function newcomerNextRound(played:number):number|undefined {
  return Number.isSafeInteger(played)&&played>=0&&played<5?played+1:undefined;
}
