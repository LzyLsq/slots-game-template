import { _decorator, Color, Component, Node, Sprite, UIOpacity } from 'cc';
import { SalonArt } from '../ui/SalonArt';
import { imagePoint, type CabinetGeometry } from '../ui/CabinetGeometry';
const { ccclass } = _decorator;
interface Mote { n: Node; alpha: UIOpacity; x: number; y: number; phase: number; speed: number; }
@ccclass('SalonAtmosphere')
export class SalonAtmosphere extends Component {
  private motes: Mote[]=[]; private time=0; private width=1080;private height=1920;
  private glints:Mote[]=[];
  private runners:Mote[]=[];private showcase=false;
  public reducedMotion=false; public mode: 'ambient'|'celebration'='ambient';
  public setup(art: SalonArt, width:number,height:number,celebration=false,density=18): void {
    this.width=width;this.height=height;this.mode=celebration?'celebration':'ambient';
    for(let i=0;i<(celebration?36:density);i++){
      const x=((i*.618)%1-.5)*width,y=((i*.381)%1-.5)*height;
      const n=celebration?art.image(this.node,'symbols',x,y,64,64,0):art.light(this.node,3,x,y,110,110,0);
      const alpha=n.getComponent(UIOpacity)??n.addComponent(UIOpacity);alpha.opacity=0;this.motes.push({n,alpha,x,y,phase:i*.71,speed:70+i%5*18});
    }
  }
  public exhibit(art:SalonArt,width:number,height:number,tint:string,index:number):void{
    this.setup(art,width,height);this.showcase=true;this.time=index*1.17;
    for(const m of this.motes){m.n.getComponent(Sprite)!.color=new Color(tint);m.speed*=2.5;}
    for(let i=0;i<2;i++){
      const n=art.light(this.node,3,0,0,110,110,0);
      this.runners.push({n,alpha:n.getComponent(UIOpacity)!,x:0,y:0,phase:i*.5,speed:0});
    }
  }
  public authFrame(art:SalonArt,width:number,height:number):void{
    this.setup(art,width,height,false,12);this.showcase=true;this.time=.64;
    for(const m of this.motes){m.n.getComponent(Sprite)!.color=new Color('#F7D695');m.speed*=1.35;m.n.setScale(.6,.6,1);}
    for(let i=0;i<2;i++){
      const n=art.light(this.node,3,0,0,92,92,0);
      this.runners.push({n,alpha:n.getComponent(UIOpacity)!,x:0,y:0,phase:i*.5,speed:112});
    }
    const corners=[[-width/2+34,height/2-34],[width/2-34,height/2-34],[-width/2+34,-height/2+34],[width/2-34,-height/2+34]];
    for(let i=0;i<corners.length;i++){
      const [x,y]=corners[i],n=art.light(this.node,3,x,y,110,110,0);
      this.glints.push({n,alpha:n.getComponent(UIOpacity)!,x,y,phase:i*1.37,speed:105});
    }
  }
  public cabinet(art:SalonArt,g:CabinetGeometry):void {
    const [x,y]=imagePoint(g.screen),w=g.screen[2]/2,h=g.screen[3]/2;
    const points=[[x-w-23,y+h],[x+w+23,y+h-35],[x-w-25,y-h+50],[x+w+23,y-h],[x-w*.6,y+h+28],[x+w*.5,y-h-28]];
    for(let i=0;i<points.length;i++){
      const [gx,gy]=points[i],n=art.light(this.node,3,gx,gy,160,160,0);
      this.glints.push({n,alpha:n.getComponent(UIOpacity)!,x:gx,y:gy,phase:i*.91,speed:0});
    }
  }
  protected update(dt:number):void{
    if(this.reducedMotion){for(const m of this.motes)m.alpha.opacity=0;for(const g of [...this.glints,...this.runners])g.alpha.opacity=0;return;}
    this.time+=Math.min(dt,.1);
    for(const r of this.runners){
      const w=this.width-20,h=this.height-20,d=((this.time/5.5+r.phase)%1)*2*(w+h);
      const x=d<w?-w/2+d:d<w+h?w/2:d<2*w+h?w/2-(d-w-h):-w/2;
      const y=d<w?h/2:d<w+h?h/2-(d-w):d<2*w+h?-h/2:-h/2+(d-2*w-h);
      r.n.setPosition(x,y);r.alpha.opacity=r.speed||210;r.n.angle=this.time*35;
    }
    for(const g of this.glints){
      const p=(this.time+g.phase)%6.8/6.8,flash=Math.pow(Math.max(0,Math.sin(p*Math.PI*2)),4);
      g.alpha.opacity=flash*(g.speed||165);const scale=.82+flash*.25;g.n.setScale(scale,scale,1);
      g.n.setPosition(g.x,g.y+Math.sin(p*Math.PI*2)*3);
    }
    for(const m of this.motes){
      const t=this.time+m.phase;
      if(this.mode==='celebration'){
        const p=(t*(.24+m.speed*.0004))%1,depth=.55+(m.speed-70)/160;
        // Pooled coins follow staggered gravity arcs from the treasure, with
        // different depths and velocities instead of a synchronized curtain.
        m.n.setPosition(m.x*.14+m.x*1.6*p,-80+780*p-(1100+m.speed*2)*p*p);
        m.n.angle=t*(42+m.speed*.3);m.n.setScale(depth*(.45+.55*Math.abs(Math.cos(t*2.2))),depth,1);
        m.alpha.opacity=Math.min(1,p/.12)*Math.min(1,(1-p)/.24)*230;
      }else{
        m.n.setPosition(m.x+Math.sin(t*.6)*18,((m.y+this.time*m.speed*.12+this.height/2)%this.height)-this.height/2);
        m.alpha.opacity=Math.pow(Math.sin(t*.95)*.5+.5,2)*(this.showcase?210:120);const s=.76+Math.sin(t*.65)*.12;m.n.setScale(s,s,1);
      }
    }
  }
}
