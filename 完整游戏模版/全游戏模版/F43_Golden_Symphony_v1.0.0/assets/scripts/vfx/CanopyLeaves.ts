import { _decorator,Component,UIOpacity } from 'cc';
import { SalonArt,box } from '../ui/SalonArt';
const {ccclass}=_decorator;
/** Reflections registered to the room's actual lamps. The architecture stays fixed. */
@ccclass('CanopyLeaves')
export class CanopyLeaves extends Component{
 private elapsed=0;private lamps:{alpha:UIOpacity;phase:number}[]=[];private reduced=false;
 public setup(art:SalonArt,width:number,height:number,reduced:boolean,auth=false):void{
  this.reduced=reduced;
  const plane=box(this.node,'Registered salon lamp coordinates',0,0,1024,1536),scale=Math.max(width/1024,height/1536);plane.setScale(scale,scale,1);
  const points=auth?[[94,400],[934,400],[150,900],[866,900]]:[[65,220],[965,220],[205,357],[822,357]];
  points.forEach(([x,y],i)=>{const light=art.light(plane,0,x-512,768-y,112,148,28);light.name='Sconce reflection';this.lamps.push({alpha:light.getComponent(UIOpacity)!,phase:i*.9});});
 }
 protected update(dt:number):void{this.elapsed+=Math.min(dt,.1);for(const {alpha,phase} of this.lamps)alpha.opacity=Math.round(this.reduced?24:25+13*Math.sin(this.elapsed*.85+phase));}
}
