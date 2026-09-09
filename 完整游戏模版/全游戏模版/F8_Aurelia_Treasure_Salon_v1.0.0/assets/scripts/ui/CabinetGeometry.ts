import type { GameId } from '../math/types';
export type Box=readonly[number,number,number,number];
export interface CabinetGeometry {
  screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;auto:Box;bet:Box;topWin:Box;
  ink:string;titleIndex:number;
}
// Measured on the FINAL CC Switch 836×1881 outpaint, not the old render.
// Convert to a single 1024×2304 image plane. Background, mask, symbols and
// controls remain siblings under that transform at every device size.
const px=(x:number,y:number,w:number,h:number):Box=>[x*1024/836,y*1024/836,w*1024/836,h*1024/836];
export const CABINETS:Record<GameId,CabinetGeometry>={
 'golden-hour':{
  screen:px(167,665,500,350),title:px(188,416,457,103),balance:px(233,575,366,41),win:px(229,1069,375,43),
  spin:px(329,1162,174,124),minus:px(141,1183,87,73),plus:px(607,1183,87,73),
  auto:px(654,1358,100,89),bet:px(118,1362,218,54),topWin:px(244,1550,349,73),ink:'#FFF8DA',titleIndex:1,
 },
 'jade-treasury':{
  screen:px(135,731,565,311),title:px(173,489,490,103),balance:px(240,631,354,42),win:px(163,1090,510,43),
  spin:px(551,1250,125,84),minus:px(126,1264,64,60),plus:px(214,1264,64,60),
  auto:px(569,1410,104,88),bet:px(311,1283,215,37),topWin:px(202,1405,316,65),ink:'#173E34',titleIndex:2,
 },
 'pearl-palace':{
  screen:px(145,675,544,334),title:px(187,435,463,88),balance:px(233,561,369,42),win:px(226,1089,381,42),
  spin:px(343,1221,152,105),minus:px(184,1246,73,64),plus:px(589,1246,73,64),
  auto:px(526,1175,154,57),bet:px(182,1184,146,39),topWin:px(242,1452,355,66),ink:'#FFF9E9',titleIndex:3,
 },
 'ruby-revel':{
  screen:px(172,711,491,373),title:px(188,480,462,88),balance:px(244,609,346,43),win:px(252,1133,330,44),
  spin:px(536,1225,145,91),minus:px(150,1241,65,54),plus:px(244,1241,65,54),auto:px(340,1241,65,54),
  bet:px(145,1382,220,55),topWin:px(392,1390,258,79),ink:'#47251A',titleIndex:4,
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
 const scale=Math.min(cabinetScale(width,height),(safeTop-safeBottom)/(top-bottom),(width-72)/(right-left));
 const y=Math.max(safeBottom-bottom*scale,Math.min(0,safeTop-top*scale));
 return {scale,y};
}
