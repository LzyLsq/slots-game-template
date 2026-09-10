import type { GameId } from '../math/types';
export type Box=readonly[number,number,number,number];
export interface CabinetGeometry {
  screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;auto:Box;bet:Box;topWin:Box;
  status:Box;ink:string;titleIndex:number;
}
// Measured against original 887×1774 F14 artwork. The full 1536×3072 scene
// and every interactive element share the same physical image plane.
const px=(x:number,y:number,w:number,h:number):Box=>[x*1536/887-256,y*3072/1774-384,w*1536/887,h*3072/1774];
export const CABINETS:Record<GameId,CabinetGeometry>={
 'golden-hour':{
  screen:px(194,613,498,241),
  title:px(150,278,590,160),
  balance:px(287,524,312,39),
  win:px(239,899,410,49),
  topWin:px(288,462,309,38),
  bet:px(232,1158,180,43),
  status:px(478,1158,174,43),
  spin:px(344,991,160,119),
  minus:px(191,1015,104,84),
  plus:px(544,1015,104,84),
  auto:px(658,1012,91,88),
  ink:'#243E52',titleIndex:1,
 },
 'jade-treasury':{
  screen:px(162,637,562,267),
  title:px(109,295,669,150),
  balance:px(263,556,365,36),
  win:px(211,956,465,49),
  topWin:px(264,489,363,33),
  bet:px(210,1228,150,42),
  status:px(526,1228,151,42),
  spin:px(347,1048,160,108),
  minus:px(178,1067,105,82),
  plus:px(556,1067,104,82),
  auto:px(680,1058,87,85),
  ink:'#243E52',titleIndex:2,
 },
 'pearl-palace':{
  screen:px(195,642,493,239),
  title:px(204,332,459,188),
  balance:px(463,555,204,34),
  win:px(210,931,463,43),
  topWin:px(218,555,202,34),
  bet:px(222,1187,192,37),
  status:px(468,1187,192,37),
  spin:px(347,1035,170,90),
  minus:px(193,1039,99,81),
  plus:px(550,1039,100,81),
  auto:px(670,1037,82,80),
  ink:'#243E52',titleIndex:3,
 },
 'ruby-revel':{
  screen:px(185,639,518,262),
  title:px(166,316,548,135),
  balance:px(277,569,334,30),
  win:px(244,939,399,36),
  topWin:px(277,515,334,28),
  bet:px(187,1158,215,36),
  status:px(487,1158,205,36),
  spin:px(347,1009,160,112),
  minus:px(187,1030,100,85),
  plus:px(548,1023,103,88),
  auto:px(672,1020,81,87),
  ink:'#243E52',titleIndex:4,
 },
};
export function imagePoint(b:Box):readonly[number,number]{return[b[0]+b[2]/2-512,1152-b[1]-b[3]/2];}
export function cabinetScale(width:number,height:number):number{return Math.max(width/1024,height/2304);}
/** Fit the entire interactive cabinet, not just its background crop. */
export function cabinetLayout(width:number,height:number,g:CabinetGeometry,topInset=0,bottomInset=0):{scale:number;y:number}{
 const boxes=[g.title,g.balance,g.screen,g.win,g.spin,g.minus,g.plus,g.auto,g.bet,g.topWin];
 const top=1152-Math.min(...boxes.map(b=>b[1]));
 const bottom=1152-Math.max(...boxes.map(b=>b[1]+b[3]));
 const left=Math.min(...boxes.map(b=>b[0])),right=Math.max(...boxes.map(b=>b[0]+b[2]));
 const safeTop=height/2-topInset-170,safeBottom=-height/2+bottomInset+158;
 const scale=Math.min(cabinetScale(width,height),(safeTop-safeBottom)/(top-bottom),(width-72)/(2*Math.max(512-left,right-512)));
 const y=Math.max(safeBottom-bottom*scale,Math.min(0,safeTop-top*scale));
 return {scale,y};
}
