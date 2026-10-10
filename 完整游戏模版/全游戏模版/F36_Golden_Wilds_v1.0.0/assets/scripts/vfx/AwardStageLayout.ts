import {CABINETS,cabinetLayout,imagePoint,reelAperture} from '../ui/CabinetGeometry';
const MODES=['sun-lion','emerald-elephant','lotus-koi','moon-fox'] as const;
export interface AwardStagePlacement {scale:number;y:number;hintY:number;}
/** All award coordinates belong to the existing cabinet. No replacement room,
 * screen-sized painting, camera change or independent architecture is needed. */
export function awardStageLayout(theme:number,height:number,width=1080,placement?:AwardStagePlacement) {
  const index=Math.max(0,Math.min(3,theme)),g=CABINETS[MODES[index]],aperture=reelAperture(g);
  const [sx,sy]=imagePoint(aperture),screen={x:sx,y:sy,width:aperture[2],height:aperture[3]};
  const top=sy+screen.height/2,titleHeight=176;
  const titleY=top-16-titleHeight/2,captionY=titleY-titleHeight/2-27;
  const amountHeight=148,amountY=captionY-25-12-amountHeight/2;
  const fitted=cabinetLayout(width,height,g);
  const scale=placement?.scale??fitted.scale,y=placement?.y??fitted.y;
  const [collectX,collectY]=imagePoint(g.spin),[walletX,walletY]=imagePoint(g.balance);
  // Fountains follow the outer gold rails, rising from the original treasure
  // shelf. Their full rotated bounds stay outside the reading area.
  const sourceY=730-(g.titleIndex===0?1220:g.titleIndex===2?1226:1264);
  return {theme:index,geometry:g,scale,y,screen,titleY,titleWidth:230,titleHeight,captionY,
    amount:{x:sx,y:amountY},amountWidth:Math.min(406,screen.width-100),amountHeight,
    collectX,collectY,collectWidth:Math.max(156,g.spin[2]),collectHeight:Math.max(148,g.spin[3]),
    wallet:{x:walletX,y:walletY},hintY:placement?.hintY??-height/2+(height<2050?48:116),
    coins:{scale:1,baseY:sourceY,floor:sourceY-80,ceiling:top+100,
      sideInner:screen.width/2+18,sideOuter:404,protectedHalfWidth:230},
    jewels:[[screen.x-screen.width/2-15,top-16],[screen.x+screen.width/2+15,top-16],[-306,sourceY],[306,sourceY]],
  };
}
