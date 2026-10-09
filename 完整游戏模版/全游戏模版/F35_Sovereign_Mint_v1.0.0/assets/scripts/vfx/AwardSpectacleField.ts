import {Node,UIOpacity} from 'cc';
import {SalonArt,box,opacity} from '../ui/SalonArt';
import type {AwardTiming} from './AwardTimeline';
import {emptySpectaclePose,spectaclePose,spectacleSeed,type SpectacleKind,type SpectaclePose,type SpectacleSeed,type SpectacleProfile} from './AwardSpectacle';
interface Particle{node:Node;alpha:UIOpacity;seed:SpectacleSeed;pose:SpectaclePose}
/** A preallocated atlas-based field; rear fountains and front depth have explicit draw order. */
export class AwardSpectacleField{
 private layer:Node;private pool:Particle[]=[];
 constructor(parent:Node,art:SalonArt,profile:Readonly<SpectacleProfile>,front=false){
  this.layer=box(parent,front?'Foreground gold orbit and rainfall':'Treasury rear coin fountains',0,0,1080,1720);
  const add=(kind:SpectacleKind,count:number)=>{
   for(let index=0;index<count;index++){
    const seed=spectacleSeed(kind,index),node=kind==='spark'
     ?art.light(this.layer,3,0,0,seed.size,seed.size,0,'award-optics')
     :art.image(this.layer,'award-coin-detail',0,0,seed.size,seed.size);
    node.name='Treasury '+kind+' '+index;
    this.pool.push({node,alpha:opacity(node,0),seed,pose:emptySpectaclePose()});
   }
  };
  if(front){add('orbit',profile.orbit);add('rain',profile.rain);add('spark',profile.sparks);}
  else add('fountain',profile.fountain);
 }
 public update(time:number,plan:AwardTiming):void{
  for(const item of this.pool){
   const p=spectaclePose(item.seed,time,plan,item.pose);item.alpha.opacity=p.alpha;
   if(p.alpha<=0)continue;
   item.node.setPosition(p.x,p.y);item.node.setScale(p.scaleX,p.scaleY,1);item.node.angle=p.angle;
  }
 }
 public destroy():void{if(this.layer.isValid)this.layer.destroy();this.pool.length=0;}
}
