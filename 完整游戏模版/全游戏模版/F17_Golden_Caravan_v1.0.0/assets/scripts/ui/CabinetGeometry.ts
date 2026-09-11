import type { GameId } from '../math/types';
export const CABINET_ROOM_WIDTH=1920;export const CABINET_ROOM_HEIGHT=3456;
export type Box=readonly[number,number,number,number];
export interface CabinetGeometry {
  screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;auto:Box;bet:Box;topWin:Box;
  status:Box;ink:string;titleIndex:number;
}
// Measured from the four original 1024×1536 cabinet paintings.
// Outpainted environment is one 1920×3456 bitmap; reel interiors measured on final render art.
const px=(x:number,y:number,w:number,h:number):Box=>[x*1.5-256,y*1.5,w*1.5,h*1.5];
export const CABINETS:Record<GameId,CabinetGeometry>={
 'golden-hour':{
  screen:[94.12, 705.37, 835.76, 492.83],
  title:px(263,247,501,81),
  topWin:px(235,378,148,32),
  balance:px(649,378,144,32),
  win:px(243,874,536,48),
  spin:px(450,969,130,130),
  minus:px(240,992,91,91),
  plus:px(674,992,91,91),
  auto:px(798,992,91,91),
  bet:px(212,1142,218,44),
  status:px(596,1142,218,44),
  ink:'#563D34',titleIndex:1,
 },
 'jade-treasury':{
  screen:[46.89, 752.6, 930.22, 490.78],
  title:px(309,295,406,66),
  topWin:px(262,414,142,35),
  balance:px(617,414,141,35),
  win:px(231,898,562,53),
  spin:px(449,981,130,130),
  minus:px(235,1004,91,91),
  plus:px(674,1004,91,91),
  auto:px(799,1004,91,91),
  bet:px(228,1140,144,41),
  status:px(653,1140,142,41),
  ink:'#563D34',titleIndex:2,
 },
 'pearl-palace':{
  screen:[85.9, 754.65, 854.25, 406.59],
  title:px(314,291,396,57),
  topWin:px(285,413,130,32),
  balance:px(620,413,132,32),
  win:px(266,837,494,59),
  spin:px(450,928,130,130),
  minus:px(238,951,91,91),
  plus:px(674,951,91,91),
  auto:px(799,951,91,91),
  bet:px(208,1124,171,37),
  status:px(648,1124,171,37),
  ink:'#563D34',titleIndex:3,
 },
 'ruby-revel':{
  screen:[94.12, 779.29, 835.76, 406.59],
  title:px(301,320,422,49),
  topWin:px(268,440,136,30),
  balance:px(624,440,134,30),
  win:px(260,835,520,58),
  spin:px(450,928,130,130),
  minus:px(238,951,91,91),
  plus:px(674,951,91,91),
  auto:px(799,951,91,91),
  bet:px(234,1102,159,42),
  status:px(638,1102,159,42),
  ink:'#563D34',titleIndex:4,
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
