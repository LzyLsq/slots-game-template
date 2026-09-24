import type { GameId } from '../math/types';
export const CABINET_ROOM_WIDTH=1024;export const CABINET_ROOM_HEIGHT=2304;
export type Box=readonly[number,number,number,number];
export interface CabinetGeometry {
  screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;auto:Box;bet:Box;
  status:Box;max?:Box;ink:string;titleIndex:number;
}
// Coordinates measured on the 1024×2304 complete, uncomposited cabinet illustrations.
// Reel apertures are INSIDE the painted bezels, not on the metal trim.
export const CABINETS:Record<GameId,CabinetGeometry>={
  'coin-carousel':{
    screen:[219,740,582,526],title:[240,482,544,135],
    spin:[414,1340,205,155],minus:[182,1400,91,81],auto:[305,1400,88,81],plus:[727,1400,108,81],
    status:[634,1498,187,63],
    balance:[165,1572,204,92],win:[397,1572,225,92],bet:[646,1572,212,92],ink:'#5A281E',titleIndex:0,
  },
  'lantern-vault':{
    screen:[216,970,592,314],title:[286,635,484,122],
    spin:[413,1410,205,155],auto:[201,1453,89,77],minus:[302,1452,70,77],plus:[762,1453,71,77],
    status:[263,1558,185,43],max:[658,1453,89,77],
    balance:[217,1341,183,67],win:[414,1341,185,67],bet:[619,1341,186,67],ink:'#073E35',titleIndex:1,
  },
  'lucky-parade':{
    screen:[192,790,638,445],title:[249,436,526,150],
    spin:[404,1375,222,164],auto:[280,1419,94,75],minus:[181,1419,91,75],plus:[746,1419,92,75],
    status:[204,1583,190,43],max:[654,1419,89,75],
    balance:[187,1279,190,76],win:[406,1279,199,76],bet:[629,1279,206,76],ink:'#6B251E',titleIndex:2,
  },
  'celestial-mint':{
    screen:[205,633,614,616],title:[286,446,451,100],
    spin:[418,1388,206,153],auto:[270,1441,93,78],minus:[163,1441,93,78],plus:[772,1441,94,78],
    status:[540,1573,195,43],max:[655,1441,93,78],
    balance:[161,1290,205,78],win:[408,1290,211,78],bet:[653,1290,210,78],ink:'#172A56',titleIndex:3,
  },
};
export function imagePoint(b:Box):readonly[number,number]{return[b[0]+b[2]/2-512,1152-b[1]-b[3]/2];}
export function cabinetScale(width:number,height:number):number{return Math.max(width/1024,height/2304);}
/** Keep the physical machine prominent while retaining its single-image room on every phone. */
export function cabinetLayout(width:number,height:number,g:CabinetGeometry,topInset=0,bottomInset=0):{scale:number;y:number}{
 const boxes=[g.title,g.balance,g.screen,g.win,g.spin,g.minus,g.plus,g.auto,g.bet,g.status,...(g.max?[g.max]:[])];
 const top=1152-Math.min(...boxes.map(b=>b[1]))+32;
 const bottom=1152-Math.max(...boxes.map(b=>b[1]+b[3]))-32;
 const left=Math.min(...boxes.map(b=>b[0])),right=Math.max(...boxes.map(b=>b[0]+b[2]));
 const safeTop=height/2-topInset-170,safeBottom=-height/2+bottomInset+158;
 // Enough scale to let the illustration reach the footer when its marquee
 // is tucked below the toolbar; otherwise the painted floor would run out.
 const cover=(safeTop+height/2)/(top+1152);
 const scale=Math.min(Math.max(cabinetScale(width,height),cover),(safeTop-safeBottom)/(top-bottom),(width-60)/(2*Math.max(512-left,right-512)));
 const desired=safeTop-top*scale;
 const floorBound=1152*scale-height/2,ceilingBound=height/2-1152*scale;
 const y=Math.max(ceilingBound,Math.min(floorBound,desired));
 return {scale,y};
}
