import type { GameId } from '../math/types';
export const CABINET_ROOM_WIDTH=1920;export const CABINET_ROOM_HEIGHT=3456;
export type Box=readonly[number,number,number,number];
export interface CabinetGeometry {
  screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;auto:Box;bet:Box;topWin:Box;
  status:Box;ink:string;titleIndex:number;
}
// F18: four individually measured mechanical dashboards, with independent console arrangements.
// Source paintings are 1024×1536; extended environments share one 1920×3456 plane.
const px=(x:number,y:number,w:number,h:number):Box=>[x*1.5-256,y*1.5,w*1.5,h*1.5];
export const CABINETS:Record<GameId,CabinetGeometry>={
 'golden-hour':{
  screen:[-12.66, 732.06, 827.55, 737.2],
  title:px(258,350,505,63),
  spin:px(774,666,133,133),
  minus:px(797,529,95,95),
  plus:px(797,839,95,95),
  auto:px(737,1130,99,99),
  balance:px(164,1070,230,46),
  topWin:px(446,1070,220,46),
  win:px(164,1152,230,48),
  bet:px(446,1152,220,46),
  status:px(718,1069,145,43),
  ink:'#4B362A',titleIndex:1,
 },
 'jade-treasury':{
  screen:[16.09, 688.94, 977.45, 509.26],
  title:px(282,337,488,53),
  spin:px(757,869,146,146),
  minus:px(196,907,93,93),
  plus:px(561,907,93,93),
  auto:px(773,1073,105,105),
  balance:px(190,1167,245,52),
  topWin:px(475,1167,240,52),
  win:px(190,1055,520,52),
  bet:px(337,925,190,56),
  status:px(757,1211,154,48),
  ink:'#4B362A',titleIndex:2,
 },
 'pearl-palace':{
  screen:[48.94, 582.16, 924.06, 798.8],
  title:px(299,964,426,44),
  spin:px(452,1027,125,125),
  minus:px(238,1049,92,92),
  plus:px(669,1049,92,92),
  auto:px(809,1049,92,92),
  balance:px(183,1188,230,49),
  topWin:px(592,1188,219,49),
  win:px(386,1280,262,49),
  bet:px(174,1280,178,44),
  status:px(696,1280,143,44),
  ink:'#4B362A',titleIndex:3,
 },
 'ruby-revel':{
  screen:[65.37, 592.43, 893.26, 790.59],
  title:px(332,296,402,45),
  spin:px(235,944,182,162),
  minus:px(586,1061,94,94),
  plus:px(746,1061,94,94),
  auto:px(764,1251,98,98),
  balance:px(463,1177,239,49),
  topWin:px(463,1258,239,49),
  win:px(170,1168,246,52),
  bet:px(180,1257,231,46),
  status:px(735,1205,147,43),
  ink:'#4B362A',titleIndex:4,
 },
};
export function imagePoint(b:Box):readonly[number,number]{return[b[0]+b[2]/2-512,1152-b[1]-b[3]/2];}
export function cabinetScale(width:number,height:number):number{return Math.max(width/1024,height/2304);}
/** Fit the entire interactive cabinet, not just its background crop. */
export function cabinetLayout(width:number,height:number,g:CabinetGeometry,topInset=0,bottomInset=0):{scale:number;y:number}{
 const boxes=[g.title,g.balance,g.screen,g.win,g.spin,g.minus,g.plus,g.auto,g.bet,g.topWin];
 const top=1152-Math.min(180,...boxes.map(b=>b[1])); // Keep the conductor/mascot crown visible on tablets, including the below-screen Coral title.
 const bottom=1152-Math.max(...boxes.map(b=>b[1]+b[3]));
 const left=Math.min(...boxes.map(b=>b[0])),right=Math.max(...boxes.map(b=>b[0]+b[2]));
 const safeTop=height/2-topInset-170,safeBottom=-height/2+bottomInset+158;
 const scale=Math.min(cabinetScale(width,height),(safeTop-safeBottom)/(top-bottom),(width-72)/(2*Math.max(512-left,right-512)));
 const y=Math.max(safeBottom-bottom*scale,Math.min(0,safeTop-top*scale));
 return {scale,y};
}
