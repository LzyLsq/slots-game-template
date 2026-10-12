import type { GameId } from '../math/types';
export const CABINET_ROOM_WIDTH=2048;export const CABINET_ROOM_HEIGHT=4096;
export type Box=readonly[number,number,number,number];
export interface CabinetGeometry {
  screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;auto:Box;bet:Box;topWin:Box;
  status:Box;ink:string;titleIndex:number;
}
// Measured against the central 1024×2304 crop of each integrated 2048×4096 cabinet painting.
export const CABINETS:Record<GameId,CabinetGeometry>={
  'coin-carousel':{
    screen:[256,753,520,507],title:[281,520,462,154],
    spin:[420,1318,184,174],auto:[66,1668,126,100],minus:[260,1342,110,110],plus:[654,1342,110,110],bet:[696,1668,164,86],status:[50,1793,180,52],
    balance:[250,1520,170,86],win:[427,1520,170,86],topWin:[604,1520,170,86],ink:'#5A281E',titleIndex:0,
  },
  'lantern-vault':{
    screen:[224,889,576,324],title:[245,520,534,170],
    spin:[408,1338,216,175],auto:[211,1364,94,80],minus:[316,1367,68,68],plus:[756,1367,68,68],bet:[648,1364,90,70],status:[42,1515,190,50],
    balance:[247,1249,174,76],win:[425,1249,174,76],topWin:[603,1249,174,76],ink:'#073E35',titleIndex:1,
  },
  'lucky-parade':{
    screen:[197,859,630,408],title:[286,520,456,160],
    spin:[397,1382,240,164],auto:[67,1550,128,100],minus:[259,1420,104,92],plus:[674,1420,104,92],bet:[694,1550,164,86],status:[52,1680,190,50],
    balance:[244,1298,176,84],win:[426,1298,176,84],topWin:[608,1298,176,84],ink:'#6B251E',titleIndex:2,
  },
  'celestial-mint':{
    screen:[226,740,568,556],title:[285,596,455,105],
    spin:[421,1356,190,128],auto:[64,1605,128,100],minus:[226,1372,114,102],plus:[699,1372,114,102],bet:[695,1605,164,86],status:[50,1735,190,50],
    balance:[252,1508,170,78],win:[427,1508,170,78],topWin:[602,1508,170,78],ink:'#172A56',titleIndex:3,
  },
};
export function imagePoint(b:Box):readonly[number,number]{return[b[0]+b[2]/2-512,1152-b[1]-b[3]/2];}
export function cabinetScale(width:number,height:number):number{return Math.max(width/1024,height/2304);}
/** Fit the usable cabinet—not the blurred source-image overscan—inside the live safe area. */
export function cabinetLayout(width:number,height:number,g:CabinetGeometry,topInset=0,bottomInset=0):{scale:number;y:number}{
 const boxes=[g.title,g.balance,g.screen,g.win,g.spin,g.minus,g.plus,g.auto,g.bet,g.topWin,g.status];
 // The paintings contain roughly 350 px of soft-focus overscan above the real cabinet.
 // Measure from the first functional ornament so short phones and tablets do not shrink
 // the reels merely to keep that disposable background visible.
 const top=1152-Math.min(...boxes.map(b=>b[1]))+32;
 const bottom=1152-Math.max(...boxes.map(b=>b[1]+b[3]))-32;
 const left=Math.min(...boxes.map(b=>b[0])),right=Math.max(...boxes.map(b=>b[0]+b[2]));
 const safeTop=height/2-topInset-170,safeBottom=-height/2+bottomInset+158;
 const scale=Math.min(cabinetScale(width,height),(safeTop-safeBottom)/(top-bottom),(width-60)/(2*Math.max(512-left,right-512)));
 // Top-align the functional cabinet below the toolbar. Any remaining height is used by
 // the cabinet's integrated floor/base instead of becoming a large blurred header.
 const y=safeTop-top*scale;
 return {scale,y};
}
