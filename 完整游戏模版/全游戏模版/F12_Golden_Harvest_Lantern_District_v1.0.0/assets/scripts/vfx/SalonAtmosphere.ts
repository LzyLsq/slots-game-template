import { _decorator, Component, Node, UIOpacity } from 'cc';
import { SalonArt } from '../ui/SalonArt';
const { ccclass } = _decorator;
interface Mote { n: Node; alpha: UIOpacity; x: number; y: number; phase: number; speed: number; }
@ccclass('SalonAtmosphere')
export class SalonAtmosphere extends Component {
  private motes: Mote[]=[]; private time=0; private width=1080;private height=1920;
  public reducedMotion=false; public mode: 'ambient'|'celebration'='ambient';
  public setup(art: SalonArt, width:number,height:number,celebration=false): void {
    this.width=width;this.height=height;this.mode=celebration?'celebration':'ambient';
    for(let i=0;i<(celebration?36:18);i++){
      const x=((i*.618)%1-.5)*width,y=((i*.381)%1-.5)*height;
      const n=art.image(this.node,'symbols',x,y,celebration?64:40,celebration?64:40,celebration?0:15);
      const alpha=n.addComponent(UIOpacity);alpha.opacity=0;this.motes.push({n,alpha,x,y,phase:i*.71,speed:70+i%5*18});
    }
  }
  protected update(dt:number):void{
    this.time+=dt;if(this.reducedMotion)return;
    for(const m of this.motes){
      const t=this.time+m.phase;
      if(this.mode==='celebration'){
        const p=(t*.32)%1;m.n.setPosition(m.x*Math.sin(p*Math.PI),this.height*.32-p*this.height*.8);
        m.n.angle=t*100; m.n.setScale(.4+.6*Math.abs(Math.cos(t*3)),1,1);m.alpha.opacity=Math.sin(p*Math.PI)*255;
      }else{
        m.n.setPosition(m.x+Math.sin(t*.6)*18,((m.y+this.time*m.speed*.12+this.height/2)%this.height)-this.height/2);
        m.alpha.opacity=(Math.sin(t*1.6)*.5+.5)*125;const s=.65+Math.sin(t)*.25;m.n.setScale(s,s,1);
      }
    }
  }
}
