import {_decorator,Component,Node,UIOpacity} from 'cc';
import {SalonArt,box} from '../ui/SalonArt';
const {ccclass}=_decorator;
interface Lamp {node:Node;alpha:UIOpacity;phase:number;peak:number;}
@ccclass('FestivalArrival')
export class FestivalArrival extends Component {
  private clock=0;private lamps:Lamp[]=[];private floor?:UIOpacity;
  public reduced=false;
  public setup(art:SalonArt,width:number,height:number,theme=-1):void {
    const scale=Math.max(width/1024,height/1536);
    const plane=box(this.node,'Authored lantern coordinates',0,0,1024,1536);plane.setScale(scale,scale,1);
    const points=theme<0?[[374,478],[609,476],[311,555],[671,552],[212,931],[652,950]]:
      [[[298,414],[800,470],[95,891],[892,895]],[[183,84],[853,84],[185,838],[956,839]],[[263,451],[809,475],[229,758],[836,761]],[[58,106],[959,106],[160,724],[956,710]]][theme];
    for(const [i,[x,y]] of points.entries()){
      const n=art.light(plane,0,x-512,768-y,110,124,0);n.name='Painted festival lantern glow';
      this.lamps.push({node:n,alpha:n.getComponent(UIOpacity)!,phase:i*.73,peak:theme<0?68:52});
    }
    const reflection=art.light(plane,0,0,-305,720,270,0);reflection.name='Gate light on original carpet';this.floor=reflection.getComponent(UIOpacity)!;
  }
  protected update(dt:number):void {
    this.clock+=Math.min(dt,.1);
    for(const l of this.lamps){const opening=Math.min(1,this.clock/.55);l.alpha.opacity=Math.round((this.reduced?.45:.36+.64*(.5+.5*Math.sin(this.clock*1.6-l.phase)))*l.peak*opening);}
    if(this.floor)this.floor.opacity=Math.round(this.reduced?24:18+Math.min(1,this.clock/1.1)*28+Math.sin(this.clock*.8)*8);
  }
}
