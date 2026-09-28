import type { GameId } from '../math/types';

/**
 * The CC Switch cabinet paintings are 1024 × 2048 pixels and render on
 * the same 1024 × 2048 logical plane. Reel apertures sit inside the metal
 * trim rather than covering it; the painting, mask, and controls scale together.
 */
export const CABINET_ROOM_WIDTH=1024;
export const CABINET_ROOM_HEIGHT=2048;
export type Box=readonly[number,number,number,number];
export interface CabinetGeometry {
  /** All rectangles are measured on the new CC Switch 1024 × 2048 painting. */
  screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;auto:Box;bet:Box;
  status:Box;ink:string;titleIndex:number;
}

export const CABINETS:Record<GameId,CabinetGeometry>={
  'coin-press':{
    title:[198,418,628,144], screen:[193,634,638,506],
    spin:[442,1244,140,140], auto:[165,1252,112,112],
    minus:[667,1261,88,88], plus:[847,1261,88,88],
    balance:[107,1424,198,76], bet:[375,1418,274,84], win:[733,1424,194,76],
    status:[136,1375,154,38], ink:'#FFF0C8',titleIndex:1,
  },
  'lantern-ledger':{
    title:[211,347,602,144], screen:[195,611,634,450],
    spin:[448,1146,128,128], auto:[159,1178,112,112],
    minus:[723,1181,88,88], plus:[832,1181,88,88],
    balance:[203,1411,190,98], bet:[417,1411,190,98], win:[635,1411,190,98],
    status:[137,1302,156,42], ink:'#63351E',titleIndex:2,
  },
  'cloud-conveyor':{
    title:[183,368,658,138], screen:[187,624,650,550],
    spin:[442,1346,140,140], auto:[166,1363,112,112],
    minus:[706,1366,86,86], plus:[832,1366,86,86],
    balance:[188,1562,192,92], bet:[415,1562,194,92], win:[645,1562,192,92],
    status:[129,1493,176,42], ink:'#4B3926',titleIndex:3,
  },
  'jubilee-vault':{
    title:[213,497,598,112], screen:[201,646,622,616],
    spin:[442,1417,140,140], auto:[158,1423,112,112],
    minus:[727,1428,86,86], plus:[838,1428,86,86],
    balance:[199,1662,203,91], bet:[409,1536,206,62], win:[623,1662,203,91],
    status:[142,1569,160,42], ink:'#623329',titleIndex:4,
  },
};

export function imagePoint(b:Box):readonly[number,number]{
  return [b[0]+b[2]/2-512,1024-b[1]-b[3]/2];
}
export function cabinetScale(width:number,height:number):number{
  return Math.max(width/CABINET_ROOM_WIDTH,height/CABINET_ROOM_HEIGHT);
}
/** Fit every interactive aperture between the safe top tools and bottom rule strip. */
export function cabinetLayout(width:number,height:number,g:CabinetGeometry,topInset=0,bottomInset=0):{scale:number;y:number}{
  const boxes=[g.title,g.balance,g.screen,g.win,g.spin,g.minus,g.plus,g.auto,g.bet,g.status];
  const top=1024-Math.min(...boxes.map(b=>b[1]));
  const bottom=1024-Math.max(...boxes.map(b=>b[1]+b[3]));
  const left=Math.min(...boxes.map(b=>b[0])),right=Math.max(...boxes.map(b=>b[0]+b[2]));
  const safeTop=height/2-topInset-170,safeBottom=-height/2+bottomInset+158;
  // On wide portrait tablets, do not zoom the cabinet until its crown and coin plinth
  // disappear. The same generated painting, reels, and controls share this scale.
  const scale=Math.min(cabinetScale(width,height),height/CABINET_ROOM_HEIGHT*1.04,(safeTop-safeBottom)/(top-bottom),(width-56)/(2*Math.max(512-left,right-512)));
  const y=Math.max(safeBottom-bottom*scale,Math.min(0,safeTop-top*scale));
  return {scale,y};
}
