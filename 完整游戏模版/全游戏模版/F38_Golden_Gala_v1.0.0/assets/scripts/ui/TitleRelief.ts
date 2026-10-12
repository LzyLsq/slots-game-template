import type {GameId} from '../math/types';
import type {Box} from './CabinetGeometry';
const PERIODS:Record<GameId,number>={'crown-club':6.6,'emerald-fortune':7.4,'ruby-royale':6.9,'vault-reserve':7.8};
const PHASES:Record<GameId,number>={'crown-club':.4,'emerald-fortune':1.6,'ruby-royale':2.7,'vault-reserve':3.9};
export const TITLE_STRIPS=5,TITLE_LIFT=2.0,TITLE_SCALE_MAX=1.018;
export const TITLE_STRIP_WEIGHT=[.28,.70,1,.70,.28] as const;
export interface TitlePose{scale:number;y:number;sweep:number;alpha:number;jewel:number;}
export const emptyTitlePose=():TitlePose=>({scale:1,y:0,sweep:0,alpha:0,jewel:0});
/** Clear margin is reserved for all motion; lettering is never stretched. */
export function titleImageFit(area:Box,sourceWidth:number,sourceHeight:number):readonly[number,number]{
 const s=Math.min(area[2]*.94/sourceWidth,area[3]*.94/sourceHeight);
 return [sourceWidth*s,sourceHeight*s];
}
/** One slow, seamless breathing cycle and a quiet alpha-silhouette light sweep.
 * The opaque title never fades; ornaments stay fixed within the enamel seat. */
export function titleReliefPose(id:GameId,time:number,width:number,reduced:boolean,quiet:boolean,out:TitlePose):TitlePose{
 if(reduced){out.scale=1;out.y=0;out.sweep=0;out.alpha=0;out.jewel=0;return out;}
 const period=PERIODS[id],t=Math.max(0,time),phase=(t+PHASES[id])/period;
 const wave=.5-.5*Math.cos(phase*Math.PI*2),p=((phase%1)+1)%1;
 const pass=(p-.32)/.32,visible=pass>0&&pass<1,strength=quiet?.24:1;
 out.scale=1+.018*wave;out.y=TITLE_LIFT*wave;
 out.sweep=(Math.max(0,Math.min(1,pass))*1.5-.75)*width;
 out.alpha=visible?36*Math.sin(Math.PI*pass)**2*strength:0;
 out.jewel=52*Math.max(0,Math.sin(phase*Math.PI*2+.8))**8*strength;
 return out;
}
