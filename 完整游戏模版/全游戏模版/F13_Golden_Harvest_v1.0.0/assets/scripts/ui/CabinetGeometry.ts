import type { GameId } from '../math/types';
export type Box=readonly[number,number,number,number];
export interface CabinetGeometry {
  screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;auto:Box;bet:Box;topWin:Box;
  ink:string;titleIndex:number;
}
// Measured on the F13 production artwork. All interactive elements share
// the same normalized image plane as the cabinet, including on resize.
const px=(x:number,y:number,w:number,h:number,sw:number,sh:number):Box=>[x*1024/sw,y*2304/sh,w*1024/sw,h*2304/sh];
export const CABINETS:Record<GameId,CabinetGeometry>={
 'golden-hour':{
  screen:px(135,535,590,330,860,1828),
  title:px(150,100,550,245,860,1828),
  balance:px(189,441,482,58,860,1828),
  win:px(206,907,447,53,860,1828),
  spin:px(335,974,190,140,860,1828),
  minus:px(120,988,130,110,860,1828),
  plus:px(610,988,130,110,860,1828),
  auto:px(640,1110,100,100,860,1828),
  bet:px(86,1120,163,40,860,1828),
  topWin:px(206,369,447,58,860,1828),
  ink:'#FFF8DA',titleIndex:1,
 },
 'jade-treasury':{
  screen:px(144,496,574,363,861,1827),
  title:px(180,70,500,225,861,1827),
  balance:px(201,392,458,44,861,1827),
  win:px(210,908,441,43,861,1827),
  spin:px(335,986,190,140,861,1827),
  minus:px(120,996,130,110,861,1827),
  plus:px(610,996,130,110,861,1827),
  auto:px(640,1108,100,100,861,1827),
  bet:px(112,1112,146,28,861,1827),
  topWin:px(218,317,421,43,861,1827),
  ink:'#FFF8DA',titleIndex:2,
 },
 'pearl-palace':{
  screen:px(158,470,543,398,860,1828),
  title:px(180,90,500,185,860,1828),
  balance:px(198,388,464,50,860,1828),
  win:px(219,899,421,55,860,1828),
  spin:px(335,980,190,135,860,1828),
  minus:px(130,994,130,82,860,1828),
  plus:px(600,994,130,82,860,1828),
  auto:px(640,1088,100,100,860,1828),
  bet:px(125,1084,146,33,860,1828),
  topWin:px(206,313,447,56,860,1828),
  ink:'#FFF8DA',titleIndex:3,
 },
 'ruby-revel':{
  screen:px(149,522,561,363,861,1827),
  title:px(180,75,500,225,861,1827),
  balance:px(198,444,465,55,861,1827),
  win:px(215,924,430,55,861,1827),
  spin:px(335,1007,190,140,861,1827),
  minus:px(120,1020,130,110,861,1827),
  plus:px(610,1020,130,110,861,1827),
  auto:px(640,1122,100,100,861,1827),
  bet:px(103,1156,155,38,861,1827),
  topWin:px(189,356,482,69,861,1827),
  ink:'#FFF8DA',titleIndex:4,
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
