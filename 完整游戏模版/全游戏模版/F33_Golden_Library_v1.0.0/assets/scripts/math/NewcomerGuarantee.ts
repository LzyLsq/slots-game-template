/** Cross-mode newcomer milestones. Only settled spins count; replayed request IDs
 * return the original result. The award is itemised, never disguised as reel pay. */
export function newcomerMinimum(played:number):5|10|undefined {
  if(!Number.isSafeInteger(played)||played<0)return undefined;
  return played===4?5:played===9?10:undefined;
}
export function newcomerNextRound(played:number):number|undefined {
  return Number.isSafeInteger(played)&&played>=0&&played<10?played+1:undefined;
}
