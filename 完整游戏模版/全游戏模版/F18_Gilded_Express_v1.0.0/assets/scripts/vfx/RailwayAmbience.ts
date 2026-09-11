import { _decorator, Component, Node, UIOpacity } from 'cc';
import { SalonArt, box, opacity } from '../ui/SalonArt';
const { ccclass } = _decorator;
@ccclass('RailwayAmbience')
export class RailwayAmbience extends Component {
  public reducedMotion=false;
  private time=0;private steam:Node[]=[];private lamp?:UIOpacity;
  public setup(art:SalonArt):void{
    const origin=box(this.node,'Stationary engine steam',394*2-1024,1536-1049*2,160,230);
    for(let i=0;i<6;i++){const puff=art.image(origin,'express-steam',0,0,87,105);puff.name='Soft steam '+i;opacity(puff,0);this.steam.push(puff);}
    this.lamp=opacity(art.light(this.node,0,349*2-1024,1536-1082*2,83,83,0),0);
  }

  protected update(dt:number):void{
    this.time+=Math.min(dt,.1);
    this.steam.forEach((n,i)=>{const p=(this.time/9+i/6)%1;n.setPosition(-p*27+Math.sin(p*Math.PI*2+i)*7,16+p*175);n.setScale(.25+p*.85,.35+p*.9,1);n.angle=Math.sin(p*4+i)*9;opacity(n,this.reducedMotion?0:Math.sin(p*Math.PI)**1.4*48);});
    if(this.lamp)this.lamp.opacity=this.reducedMotion?24:65+(Math.sin(this.time*.75)*.5+.5)*78;
  }
}
