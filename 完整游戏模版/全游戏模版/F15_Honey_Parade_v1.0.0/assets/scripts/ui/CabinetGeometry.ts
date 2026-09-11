import type { GameId } from '../math/types';
export const CABINET_ROOM_WIDTH=1920;export const CABINET_ROOM_HEIGHT=3456;
export type Box=readonly[number,number,number,number];
export interface CabinetGeometry {
  screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;auto:Box;bet:Box;topWin:Box;
  status:Box;ink:string;titleIndex:number;
}
// Measured against original 887×1774 F15 artwork. The full 1536×3072 scene
// and every interactive element share the same physical image plane.
const px=(x:number,y:number,w:number,h:number):Box=>[x*1536/887-256,y*3072/1774-384,w*1536/887,h*3072/1774];
export const CABINETS:Record<GameId,CabinetGeometry>={
 'golden-hour':{
  screen:px(135,650,615,354),
  title:px(145,350,590,125),
  topWin:px(165,535,230,50),
  balance:px(490,535,230,50),
  win:px(219,1069,446,60),
  spin:px(361,1185,160,130),
  minus:px(151,1206,99,85),
  plus:px(589,1206,99,85),
  auto:px(726,1206,95,85),
  bet:px(150,1370,240,58),
  status:px(493,1370,240,58),
  ink:'#633C32',titleIndex:1,
 },
 'jade-treasury':{
  screen:px(117,598,652,374),
  title:px(130,313,625,117),
  topWin:px(188,480,188,45),
  balance:px(504,480,188,45),
  win:px(177,1041,530,59),
  spin:px(368,1178,150,116),
  minus:px(157,1197,95,82),
  plus:px(609,1197,95,82),
  auto:px(728,1197,94,82),
  bet:px(118,1387,240,51),
  status:px(528,1387,240,51),
  ink:'#633C32',titleIndex:2,
 },
 'pearl-palace':{
  screen:px(129,635,627,363),
  title:px(130,347,625,135),
  topWin:px(180,531,210,45),
  balance:px(505,531,210,45),
  win:px(185,1061,517,48),
  spin:px(365,1200,160,120),
  minus:px(153,1218,94,81),
  plus:px(588,1218,96,81),
  auto:px(714,1218,91,81),
  bet:px(159,1422,226,50),
  status:px(505,1422,225,50),
  ink:'#633C32',titleIndex:3,
 },
 'ruby-revel':{
  screen:px(99,621,687,356),
  title:px(144,321,600,133),
  topWin:px(152,511,213,51),
  balance:px(516,511,213,51),
  win:px(177,1036,530,61),
  spin:px(370,1209,157,127),
  minus:px(147,1228,102,88),
  plus:px(592,1228,103,88),
  auto:px(726,1228,98,88),
  bet:px(151,1416,223,47),
  status:px(522,1416,224,47),
  ink:'#633C32',titleIndex:4,
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
