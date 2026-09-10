import { _decorator, Color, Component, Mask, Node, Sprite, UIOpacity } from 'cc';
import { SalonArt, box } from '../ui/SalonArt';
import { imagePoint, type CabinetGeometry } from '../ui/CabinetGeometry';
const { ccclass } = _decorator;
interface Mote { n: Node; alpha: UIOpacity; x: number; y: number; phase: number; speed: number; }
@ccclass('SalonAtmosphere')
export class SalonAtmosphere extends Component {
  private motes: Mote[]=[]; private time=0; private width=1080;private height=1920;
  private glints:Mote[]=[];
  private runners:Mote[]=[];private showcase=false;
  private sweeps:{n:Node;alpha:UIOpacity;cx:number;cy:number;w:number;h:number;phase:number}[]=[];
  private railLights:Mote[]=[];private chamberGlints:Mote[]=[];private impact=0;private cabinetTheme=-1;
  private baseLights:Mote[]=[];private glassDust:Mote[]=[];
  private props:Mote[]=[]; public energy=0;
  public reducedMotion=false; public mode: 'ambient'|'celebration'='ambient';
  public setup(art: SalonArt, width:number,height:number,celebration=false,density=18): void {
    this.width=width;this.height=height;this.mode=celebration?'celebration':'ambient';
    for(let i=0;i<(celebration?(density===18?36:Math.min(64,density)):density);i++){
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
  /** Restrict reflection to the metal perimeter; never wash over text or art. */
  public metalFrame(art:SalonArt,width:number,height:number,phase=0,x=0,y=0):void{
    const host=box(this.node,'Metal edge reflections',x,y,width,height),rim=Math.min(20,height*.13);
    const strips=[[0,height/2-rim/2,width,rim],[0,-height/2+rim/2,width,rim],[-width/2+rim/2,0,rim,height],[width/2-rim/2,0,rim,height]];
    for(const [cx,cy,w,h] of strips){
      const clip=box(host,'Clipped gold edge',cx,cy,w,h);clip.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
      const n=art.light(clip,2,-width,0,Math.max(150,width*.35),Math.max(150,height*1.6),0);
      this.sweeps.push({n,alpha:n.getComponent(UIOpacity)!,cx,cy,w:width,h:height,phase});
    }
  }
  public land(column:number):void {if(!this.reducedMotion)this.impact=Math.min(1,this.impact+.48);}
  public cabinet(art:SalonArt,g:CabinetGeometry):void {
    this.cabinetTheme=g.titleIndex-1;
    const [x,y]=imagePoint(g.screen),w=g.screen[2]/2,h=g.screen[3]/2;
    this.metalFrame(art,g.screen[2]+58,g.screen[3]+55,1.7,x,y);
    const [sx,sy]=imagePoint(g.spin);
    this.metalFrame(art,820,210,3.6,sx,sy);
    for(let i=0;i<3;i++){
      const gx=(i-1)*270,gy=-730,n=art.light(this.node,1,gx,gy,300,420,0);
      this.baseLights.push({n,alpha:n.getComponent(UIOpacity)!,x:gx,y:gy,phase:i*1.8,speed:0});
    }
    for(let i=0;i<16;i++){
      const gx=((i*.618)%1-.5)*580,gy=-930+(i%4)*85,n=art.light(this.node,3,gx,gy,20+(i%3)*8,20+(i%3)*8,0);
      this.glassDust.push({n,alpha:n.getComponent(UIOpacity)!,x:gx,y:gy,phase:i*.37,speed:0});
    }
    // Segmented perimeter lamps and moving reflections live on the physical frame.
    const tint=new Color(['#FFE0A0','#BCEADF','#DCEEB3','#FFD0B8'][this.cabinetTheme]);
    for(let side=0;side<2;side++)for(let i=0;i<9;i++){
      const gx=x+(side?1:-1)*(w+35),gy=y-h+(i/8)*h*2;
      const n=art.light(this.node,1,gx,gy,78,78,0);n.getComponent(Sprite)!.color=tint;
      this.railLights.push({n,alpha:n.getComponent(UIOpacity)!,x:gx,y:gy,phase:i/9+side*.16,speed:side});
    }
    const glass=box(this.node,'Contained chamber reflections',0,-720,660,440);glass.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
    for(let i=0;i<8;i++){
      const n=art.light(glass,i%2?3:1,0,0,i%2?55:115,i%2?55:115,0);n.getComponent(Sprite)!.color=tint;
      this.chamberGlints.push({n,alpha:n.getComponent(UIOpacity)!,x:0,y:0,phase:i/8,speed:i});
    }
    for(let i=0;i<10;i++){
      const n=art.image(glass,'symbols',0,0,this.cabinetTheme===3?70:48,this.cabinetTheme===3?88:48,[0,0,6,11][this.cabinetTheme]);
      const alpha=n.addComponent(UIOpacity);this.props.push({n,alpha,x:0,y:0,phase:i/10,speed:i});
    }
    const points=[[x-w-23,y+h],[x+w+23,y+h-35],[x-w-25,y-h+50],[x+w+23,y-h],[x-w*.6,y+h+28],[x+w*.5,y-h-28]];
    for(let i=0;i<points.length;i++){
      const [gx,gy]=points[i],n=art.light(this.node,3,gx,gy,160,160,0);
      this.glints.push({n,alpha:n.getComponent(UIOpacity)!,x:gx,y:gy,phase:i*.91,speed:0});
    }
  }
  protected update(dt:number):void{
    for(const prop of this.props){
      const t=this.time*(.35+this.energy*.45)+prop.phase*6.283,p=(t/6.283)%1;
      if(this.cabinetTheme===0){prop.n.setPosition(Math.cos(t)*220,Math.sin(t)*100);prop.n.angle=t*45;}
      else if(this.cabinetTheme===1){prop.n.setPosition(Math.sin(prop.phase*43)*245+Math.sin(t)*20,-180+p*360);prop.n.angle=t*30;}
      else if(this.cabinetTheme===2){prop.n.setPosition(Math.sin(prop.phase*39)*240+Math.sin(t)*35,180-p*360);prop.n.angle=Math.sin(t)*30;}
      else{prop.n.setPosition(Math.cos(t)*245,Math.sin(t)*90);prop.n.angle=Math.sin(t*2)*16;}
      const depth=.65+.35*(Math.sin(t)*.5+.5);prop.n.setScale(this.cabinetTheme<2?depth*(.3+.7*Math.abs(Math.cos(t*2))):depth,depth,1);
      prop.alpha.opacity=this.reducedMotion?0:Math.sin(p*Math.PI)*215;
    }
    this.impact=Math.max(0,this.impact-Math.min(dt,.1)*1.65);
    for(const lamp of this.railLights){
      const phase=(this.time/(3.2+this.cabinetTheme*.3)-lamp.phase+20)%1;
      const chase=Math.pow(Math.max(0,Math.cos(phase*Math.PI*2)),5);
      lamp.alpha.opacity=this.reducedMotion?0:35+chase*155+this.impact*60;
      const scale=.72+chase*.4+this.impact*.16;lamp.n.setScale(scale,scale,1);
    }
    for(const glint of this.chamberGlints){
      const t=this.time*(.48+this.cabinetTheme*.07)+glint.phase*Math.PI*2;
      if(this.cabinetTheme===0)glint.n.setPosition((glint.speed%2?145:-145)+Math.cos(t)*93,Math.sin(t)*92);
      else if(this.cabinetTheme===1)glint.n.setPosition(Math.sin(t)*240,-140+((t/(Math.PI*2))%1)*280);
      else if(this.cabinetTheme===2)glint.n.setPosition(Math.sin(t*.7+glint.phase)*230,Math.cos(t)*135);
      else glint.n.setPosition(Math.cos(t)*245,Math.sin(t)*75-20);
      glint.n.angle=t*28;
      glint.alpha.opacity=this.reducedMotion?0:(.35+.65*Math.pow(Math.sin(t*.8),2))*(glint.speed%2?185:88)+this.impact*55;
    }
    for(const sweep of this.sweeps){
      const cycle=(this.time+sweep.phase)%(this.cabinetTheme>=0?5.2:7.8),p=Math.min(1,cycle/2.6);
      sweep.n.setPosition(-sweep.w*.85+p*sweep.w*1.7-sweep.cx,-sweep.cy);
      sweep.alpha.opacity=this.reducedMotion||cycle>2.6?0:Math.sin(p*Math.PI)*(this.cabinetTheme>=0?205:165);
    }
    for(const mote of this.glassDust){
      const p=(this.time*.17+mote.phase)%1;
      mote.n.setPosition(mote.x+Math.sin(this.time+mote.phase)*16,mote.y+p*100);
      mote.n.angle=this.time*25+mote.phase*70;
      mote.alpha.opacity=this.reducedMotion?0:Math.sin(p*Math.PI)*195;
    }
    for(const light of this.baseLights){
      light.alpha.opacity=this.reducedMotion?0:35+(Math.sin(this.time*1.2+light.phase)*.5+.5)*64+this.impact*55;
      light.n.setScale(1+Math.sin(this.time*.8+light.phase)*.06,1,1);
    }
    if(this.reducedMotion){for(const m of this.motes)m.alpha.opacity=0;for(const g of [...this.glints,...this.runners])g.alpha.opacity=0;return;}
    this.time+=Math.min(dt,.1)*(1+this.energy*.6);
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
