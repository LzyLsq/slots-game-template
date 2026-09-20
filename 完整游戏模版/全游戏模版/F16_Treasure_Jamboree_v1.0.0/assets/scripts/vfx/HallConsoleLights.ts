import { _decorator, Component, game, Game, Node, UIOpacity } from 'cc';
import { SalonArt } from '../ui/SalonArt';
const { ccclass } = _decorator;

/** A fixed light rig mounted to the console, never over its copy. */
@ccclass('HallConsoleLights')
export class HallConsoleLights extends Component {
  private time=0;
  private awake=true;
  private readonly lights:{node:Node;alpha:UIOpacity;x:number;y:number}[]=[];
  public setup(art:SalonArt):void{
    const points=[[-416,114],[416,114],[-430,-213],[430,-213],[-265,-277],[265,-277]];
    for(let i=0;i<points.length;i++){
      const [x,y]=points[i];
      const node=art.light(this.node,3,x,y,i<2?62:36,i<2?34:36,0);
      node.name='Console mounted gold reflection';
      this.lights.push({node,alpha:node.getComponent(UIOpacity)!,x,y});
    }
    for(let i=0;i<4;i++){
      const x=i%2?-458:458,y=-240+(i>>1)*165;
      const node=art.light(this.node,3,x,y,20,20,0);
      node.name='Console drifting gold mote';
      this.lights.push({node,alpha:node.getComponent(UIOpacity)!,x,y});
    }
  }
  protected onEnable():void{game.on(Game.EVENT_HIDE,this.hide,this);game.on(Game.EVENT_SHOW,this.show,this);}
  protected onDisable():void{game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.show,this);}
  private hide():void{this.awake=false;}
  private show():void{this.awake=true;}
  protected update(dt:number):void{
    if(!this.awake)return;
    this.time+=Math.min(dt,.05);
    for(let i=0;i<this.lights.length;i++){
      const light=this.lights[i];
      const cycle=i<6?5.8:6.9;
      const phase=(this.time+i*.83)%cycle;
      const life=i<6?2.15:3.8;
      const t=Math.min(1,phase/life);
      const envelope=Math.sin(t*Math.PI);
      light.alpha.opacity=phase<life?envelope*envelope*(i<6?175:130):0;
      if(i>=6)light.node.setPosition(light.x+Math.sin(t*Math.PI*2)*8,light.y+t*105,0);
      else light.node.setPosition(light.x+Math.sin(t*Math.PI)*14,light.y,0);
    }
  }
}
