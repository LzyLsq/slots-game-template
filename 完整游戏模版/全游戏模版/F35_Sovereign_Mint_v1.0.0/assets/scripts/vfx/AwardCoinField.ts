import {Node,UIOpacity} from 'cc';
import {SalonArt,box,opacity} from '../ui/SalonArt';
import {awardCoinPose,type AwardTiming} from './AwardTimeline';
/** Reuses high-resolution minted coin art. The old fountain accidentally used book symbol 0. */
export class AwardCoinField{
 private coins:{node:Node;alpha:UIOpacity;size:number}[]=[];
 private layer:Node;
 constructor(parent:Node,art:SalonArt,count:number,private small=false){
  this.layer=box(parent,'Minted coin choreography',0,0,1080,1720);
  for(let i=0;i<Math.max(0,Math.min(64,count));i++){
   const size=small?38+i%3*5:48+i%4*13;
   const node=art.image(this.layer,'symbols',0,0,size,size,1);
   this.coins.push({node,alpha:opacity(node,0),size});
  }
 }
 public update(time:number,plan:AwardTiming,width=1080):void{
  this.coins.forEach(({node,alpha},i)=>{
   const p=awardCoinPose(i,time,plan,this.small);alpha.opacity=p.alpha;
   if(p.alpha<=0)return;
   // On a small reward, coins leave from the engraved shoulders, not over the amount.
   const x=this.small?(i%2?1:-1)*(width*.36+Math.abs(p.x)-200):p.x;
   node.setPosition(x,p.y);node.setScale(p.scaleX,p.scaleY,1);node.angle=p.angle;
  });
 }
 public destroy():void{if(this.layer.isValid)this.layer.destroy();this.coins=[];}
}
