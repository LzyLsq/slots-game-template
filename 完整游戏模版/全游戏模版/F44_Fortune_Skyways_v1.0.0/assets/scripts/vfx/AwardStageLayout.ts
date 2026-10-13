import {CABINETS,cabinetLayout,imagePoint,reelAperture} from '../ui/CabinetGeometry';
import type {AwardProtectedZone} from './AwardChoreography';
const MODES=['golden-otter','moon-rabbit','star-fox','cloud-elephant'] as const;
export interface AwardStagePlacement {scale:number;y:number;hintY:number;}
/** The award unfolds from the cabinet's own title mount into the glass. The
 * original architecture, guardian and settled result keep their coordinates. */
export function awardStageLayout(theme:number,height:number,width=1080,placement?:AwardStagePlacement) {
  const index=Math.max(0,Math.min(3,theme)),g=CABINETS[MODES[index]],aperture=reelAperture(g);
  const [sx,sy]=imagePoint(aperture),screen={x:sx,y:sy,width:aperture[2],height:aperture[3]};
  const top=sy+screen.height/2,titleHeight=300,titleWidth=Math.min(g.title[2]-12,screen.width+104);
  const titleY=imagePoint(g.title)[1]+12,captionY=titleY-titleHeight/2-27;
  const amountHeight=162,amountY=captionY-26-18-amountHeight/2;
  const fitted=cabinetLayout(width,height,g);
  const scale=placement?.scale??fitted.scale,y=placement?.y??fitted.y;
  const [collectX,collectY]=imagePoint(g.spin),[walletX,walletY]=imagePoint(g.balance);
  const amountWidth=Math.min(548,screen.width-40);
  const sourceY=730-1340;
  // Protect complete reading and control surfaces, including rotated sprite
  // footprints. Between those bands the coins can fan across the real treasure.
  const protectedZones:AwardProtectedZone[]=[
    {bottom:titleY-titleHeight/2-14,top:titleY+titleHeight/2+14,halfWidth:titleWidth/2+Math.abs(sx)+12},
    {bottom:amountY-amountHeight/2-14,top:captionY+25,halfWidth:amountWidth/2+Math.abs(sx)+14},
    ...[g.balance,g.bet,g.win].map(b=>{const [x,y]=imagePoint(b);return {bottom:y-b[3]/2-14,top:y+b[3]/2+14,halfWidth:Math.abs(x)+b[2]/2+10};}),
    ...[g.minus,g.spin,g.plus].map(b=>{const [x,y]=imagePoint(b);return {bottom:y-b[3]/2-12,top:y+b[3]/2+12,halfWidth:Math.abs(x)+b[2]/2+8};}),
  ];
  return {theme:index,geometry:g,scale,y,screen,titleY,titleWidth,titleHeight,captionY,
    amount:{x:sx,y:amountY},amountWidth,amountHeight,
    collectX,collectY,collectWidth:Math.max(156,g.spin[2]),collectHeight:Math.max(148,g.spin[3]),
    wallet:{x:walletX,y:walletY},hintY:placement?.hintY??-height/2+(height<2050?48:116),
    coins:{scale:1,baseY:sourceY,floor:sourceY-82,ceiling:top+280,
      sideInner:122,sideOuter:494,protectedHalfWidth:amountWidth/2+14,protectedZones},
    jewels:[[screen.x-screen.width/2-15,top-16],[screen.x+screen.width/2+15,top-16],[-306,sourceY],[306,sourceY]],
  };
}
