/** Measured against the commissioned 1024×1536 rooms, not generic UI bars.
 * Cover crops the side architecture uniformly; the live amount stays inside
 * the actual painted plinth at every supported phone ratio. */
export const AWARD_ROOMS = [
  {name:'award-coin-room', amountY:1022, amountWidth:580, amountHeight:126, jewels:[[512,613],[273,829],[768,855]]},
  {name:'award-sapphire-room', amountY:1100, amountWidth:600, amountHeight:106, jewels:[[508,535],[290,810],[739,788]]},
  {name:'award-pearl-room', amountY:1106, amountWidth:586, amountHeight:120, jewels:[[548,615],[505,688],[744,904]]},
  {name:'award-ruby-room', amountY:1028, amountWidth:594, amountHeight:122, jewels:[[500,457],[710,668],[277,829]]},
] as const;
export function awardStageLayout(theme:number,height:number,width=1080) {
  const room=AWARD_ROOMS[Math.max(0,Math.min(3,theme))];
  const scale=Math.max(width/1024,height/1536);
  const point=(x:number,y:number)=>({x:(x-512)*scale,y:(768-y)*scale});
  return {room,scale,point,amount:point(512,room.amountY),
    amountWidth:Math.min(width-180,room.amountWidth*scale),
    amountHeight:room.amountHeight*scale,
    titleY:point(512,200).y,titleWidth:800,titleHeight:330,captionY:point(512,395).y,
    hintY:point(512,1285).y,collectY:Math.max(-height/2+120,point(512,1413).y),
  };
}
