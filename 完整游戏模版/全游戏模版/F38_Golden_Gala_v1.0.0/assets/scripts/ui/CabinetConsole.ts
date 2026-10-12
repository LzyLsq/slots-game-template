import {_decorator,Component,Game,game,Node,UIOpacity,UITransform} from 'cc';
import type {GameId} from '../math/types';
import {SalonArt,opacity} from './SalonArt';
import {autoLatchX,controlReflection,controlReflectionSize,emptyControlReflection,smoothLatch,type CabinetControl,type ControlReflection} from './CabinetControlMotion';
const {ccclass}=_decorator;
interface Rim {node:Node;alpha:UIOpacity;index:CabinetControl;width:number;height:number;side:number;pose:ControlReflection;}
/** Pool fixed rim optics and a mechanical AUTO latch. No full-console bloom. */
@ccclass('CabinetConsole')
export class CabinetConsole extends Component {
 public busy=false;public quiet=false;public auto=false;
 private id:GameId='crown-club';private reduced=false;private shown=true;private time=0;
 private contacts=[0,0,0,0];private rims:Rim[]=[];private latch?:Node;private latchWidth=0;private latchState=0;private halo?:UIOpacity;
 public setup(art:SalonArt,id:GameId,reduced:boolean):void{this.id=id;this.reduced=reduced;game.on(Game.EVENT_HIDE,this.hide,this);game.on(Game.EVENT_SHOW,this.show,this);}
 public attach(art:SalonArt,index:CabinetControl,hit:Node,face:Node):void{
  const size=face.getComponent(UITransform)!;
  if(!this.reduced)for(let i=0;i<2;i++){
   const [w,h]=controlReflectionSize(index,size.width,size.height),n=art.light(face,3,0,0,w,h,0);n.name='Inlaid contact reflection '+index+' '+i;
   this.rims.push({node:n,alpha:opacity(n,0),index,width:size.width,height:size.height,side:i,pose:emptyControlReflection()});
  }
  if(index===0){const n=art.light(hit,1,0,0,size.width*1.10,size.height*1.10,0);n.name='Restrained spin bezel light';n.setSiblingIndex(0);this.halo=opacity(n,0);}
  if(index===3){const diameter=Math.min(size.width*.28,size.height*.50);this.latch=art.image(face,'award-coin-detail',0,0,diameter,diameter);this.latch.name='Gold AUTO medallion latch';this.latchWidth=size.width;opacity(this.latch,145);}
 }
 public contact(index:CabinetControl):void{this.contacts[index]=1;}
 private hide():void{this.shown=false;this.contacts.fill(0);}
 private show():void{this.shown=true;}
 protected update(dt:number):void{
  if(!this.shown)return;const step=Math.min(.05,Math.max(0,dt));this.time+=this.reduced?0:step;
  for(let i=0;i<4;i++)this.contacts[i]=Math.max(0,this.contacts[i]-step*3.4);
  const quiet=this.quiet?.15:1;
  for(const rim of this.rims){const p=controlReflection(this.id,rim.index,rim.width,rim.height,rim.side,this.time,this.contacts[rim.index],this.busy,rim.pose);rim.node.setPosition(p.x,p.y);rim.node.angle=p.angle;rim.alpha.opacity=p.alpha*quiet;}
  if(this.halo)this.halo.opacity=this.reduced?0:quiet*(this.busy?25:9+11*(.5+.5*Math.sin(this.time*.7))+this.contacts[0]*40);
  if(this.latch){this.latchState=this.reduced?(this.auto?1:0):smoothLatch(this.latchState,this.auto?1:0,step);this.latch.setPosition(autoLatchX(this.id,this.latchWidth,this.latchState),0);this.latch.angle=(this.latchState-.5)*18;this.latch.getComponent(UIOpacity)!.opacity=145+this.latchState*110;}
 }
 protected onDestroy():void{game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.show,this);this.rims.length=0;}
}
