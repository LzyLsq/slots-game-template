import type { GameId } from '../math/types';
export type Box=readonly[number,number,number,number];
export interface CabinetGeometry {
  screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;auto:Box;bet:Box;topWin:Box;
  ink:string;titleIndex:number;
}
// The finished F7 cabinets are 1024×1536 images fitted by height into the
// fixed 1080×1920 design plane. Convert measured source pixels once here so
// every live layer remains registered to the photographed aperture.
const S=1920/1536;
const px=(x:number,y:number,w:number,h:number):Box=>[x*S,y*S,w*S,h*S];
export const CABINETS:Record<GameId,CabinetGeometry>={
 'bellhop-bonanza':{
  screen:px(249,330,528,520),title:px(260,151,505,136),balance:px(285,296,454,42),win:px(374,870,276,46),
  spin:px(454,884,116,92),minus:px(190,884,82,82),plus:px(750,884,82,82),
  auto:px(615,884,88,82),bet:px(315,884,118,82),topWin:px(328,286,368,48),ink:'#FFF8DA',titleIndex:1,
 },
 'tea-vault-tumble':{
  screen:px(239,319,555,531),title:px(207,142,610,145),balance:px(286,287,452,38),win:px(374,856,276,44),
  spin:px(454,887,116,84),minus:px(187,887,82,78),plus:px(750,887,82,78),
  auto:px(615,887,88,78),bet:px(317,887,112,78),topWin:px(328,284,368,46),ink:'#173E34',titleIndex:2,
 },
 'ballroom-keyways':{
  screen:px(270,361,487,440),title:px(246,198,532,145),balance:px(298,343,428,38),win:px(374,817,276,46),
  spin:px(454,864,116,92),minus:px(184,864,82,82),plus:px(758,864,82,82),
  auto:px(620,864,88,82),bet:px(316,864,116,82),topWin:px(328,338,368,46),ink:'#FFF9E9',titleIndex:3,
 },
 'penthouse-fortune-lift':{
  screen:px(250,433,524,447),title:px(213,317,602,113),balance:px(294,430,436,42),win:px(374,886,276,44),
  spin:px(454,909,116,78),minus:px(205,909,76,70),plus:px(743,909,76,70),auto:px(612,909,84,70),
  bet:px(323,909,106,70),topWin:px(328,425,368,46),ink:'#47251A',titleIndex:4,
 },
};
export function imagePoint(b:Box):readonly[number,number]{return[b[0]+b[2]/2-640,960-b[1]-b[3]/2];}
export function cabinetScale(width:number,height:number):number{return Math.min(width/1080,height/1920);}
