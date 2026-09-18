import { _decorator, Color, Component, Graphics, Mask, Node, Sprite, UIOpacity } from 'cc';
import { SalonArt, box } from '../ui/SalonArt';
import { imagePoint, type CabinetGeometry } from '../ui/CabinetGeometry';
const { ccclass } = _decorator;
interface Mote { n: Node; alpha: UIOpacity; x: number; y: number; phase: number; speed: number; }
@ccclass('SalonAtmosphere')
export class SalonAtmosphere extends Component {
  private motes: Mote[]=[]; private time=0; private width=1080;private height=1920;
  private glints:Mote[]=[];private titleMotes:Mote[]=[];
  private runners:Mote[]=[];private showcase=false;
  private sweeps:{n:Node;alpha:UIOpacity;cx:number;cy:number;w:number;h:number;phase:number}[]=[];
  private railLights:Mote[]=[];private chamberGlints:Mote[]=[];private impact=0;private cabinetTheme=-1;
  private frameFlow?:Graphics;private frameX=0;private frameY=0;private frameW=0;private frameH=0;
  private flowHeads:{node:Node;alpha:UIOpacity;phase:number;side:number}[]=[];
  private arrivals:{age:number;strength:number}[]=[];
  private stopGlints:{n:Node;alpha:UIOpacity;column:number;age:number}[]=[];
  private baseLights:Mote[]=[];private glassDust:Mote[]=[];
  private compass?:Node;private props:Mote[]=[]; public energy=0; public motionEnergy=0; public presentationEnergy=0;
  private flowClock=0;private moteClock=0;private propClock=0;
  private idleClock=0;private idlePresence=1;
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
  public land(column:number,win=false):void {
    if(this.reducedMotion)return;
    this.impact=Math.min(1,this.impact+(win?.48:.26));
    const pulse=this.arrivals[column];if(pulse){pulse.age=0;pulse.strength=win?1:.65;}
    for(const glint of this.stopGlints)if(glint.column===column)glint.age=0;
  }
  private arrivalLight(delay:number,duration=.48,column=-1):number{
    let light=0;
    for(let i=0;i<this.arrivals.length;i++){
      if(column>=0&&i!==column)continue;
      const pulse=this.arrivals[i],p=(pulse.age-delay)/duration;
      if(p>0&&p<1)light+=Math.sin(p*Math.PI)**2*pulse.strength;
    }
    return Math.min(1,light);
  }
  private idlePulse(delay:number,duration:number):number{
    if(this.reducedMotion||this.cabinetTheme<0)return 0;
    const period=[7.8,8.6,9.4,7.2][this.cabinetTheme];
    const age=(this.idleClock+period-delay)%period;
    return age<duration?Math.sin(age/duration*Math.PI)**2*this.idlePresence:0;
  }
  /** Theme-specific idle phrases share the existing reflection pools. */
  private cabinetIdle(delay=0):number{
    if(this.cabinetTheme===0)return Math.min(1,this.idlePulse(delay,.48)+this.idlePulse(delay+.72,.85)*.72);
    if(this.cabinetTheme===1)return Math.min(1,this.idlePulse(delay,.72)+this.idlePulse(delay+1.05,1.3)*.6);
    if(this.cabinetTheme===2)return Math.min(1,this.idlePulse(delay,.36)+this.idlePulse(delay+.50,.36)+this.idlePulse(delay+1.1,1.05)*.7);
    return this.idlePulse(delay,2.8);
  }
  public cabinet(art:SalonArt,g:CabinetGeometry):void {
    this.cabinetTheme=g.titleIndex;
    const [tx,ty]=imagePoint(g.title);this.metalFrame(art,g.title[2],g.title[3],this.cabinetTheme*.7,tx,ty);
    for(let i=0;i<5;i++){const gx=tx+(i-2)*g.title[2]*.21,gy=ty+g.title[3]*(i%2?.48:-.48);const n=art.light(this.node,3,gx,gy,75,75,0);n.getComponent(Sprite)!.color=new Color(['#FFD47A','#86EDBB','#B8EDFF','#FFCF99'][this.cabinetTheme]);this.titleMotes.push({n,alpha:n.getComponent(UIOpacity)!,x:gx,y:gy,phase:i*.53+this.cabinetTheme,speed:225});}
    const [x,y]=imagePoint(g.screen),w=g.screen[2]/2,h=g.screen[3]/2;
    this.metalFrame(art,g.screen[2]+58,g.screen[3]+55,1.7,x,y);
    this.frameX=x;this.frameY=y;this.frameW=w;this.frameH=h;
    this.frameFlow=box(this.node,'Inlaid moving light along cabinet pillars',0,0,1024,2304).addComponent(Graphics);
    const themeColors=['#FFDE94','#8AE8BC','#CFC0FF','#FFB66E'];
    for(let side=-1;side<=1;side+=2)for(let i=0;i<5;i++){
      const node=art.light(this.node,this.cabinetTheme===2?1:3,0,0,this.cabinetTheme===2?24:20,this.cabinetTheme===2?24:36,0);
      node.name=['Treasury gold dust','Emerald sparks','Moon pearl lights','Forge embers'][this.cabinetTheme];node.getComponent(Sprite)!.color=new Color(themeColors[this.cabinetTheme]);
      this.flowHeads.push({node,alpha:node.getComponent(UIOpacity)!,phase:i/5+side*.07,side});
    }
    const columns=this.cabinetTheme===0?3:5;
    this.arrivals=Array.from({length:columns},()=>({age:9,strength:0}));
    for(let column=0;column<columns;column++)for(const side of [-1,1]){
      const n=art.light(this.node,3,x-w+(column+.5)*2*w/columns,y+side*(h+18),76,42,0);n.name='Column stop reflection';n.getComponent(Sprite)!.color=new Color(['#FFE0A0','#9AFFD9','#C7EBFF','#FFDAB0'][this.cabinetTheme]);
      this.stopGlints.push({n,alpha:n.getComponent(UIOpacity)!,column,age:1});
    }
    const [sx,sy]=imagePoint(g.spin);
    this.metalFrame(art,g.spin[2]+16,g.spin[3]+12,3.6,sx,sy);
    // Side controls and lower plaques reflect in their actual metal rims.
    for(const [i,rect] of [g.minus,g.plus,g.auto,g.bet,g.status].entries()){const [cx,cy]=imagePoint(rect);this.metalFrame(art,rect[2]+12,rect[3]+10,1.3+i*.9,cx,cy);}

    const controlBottom=Math.max(...[g.spin,g.minus,g.plus,g.auto,g.bet,g.status].map(r=>r[1]+r[3]));
    const plaqueTop=Math.min(g.balance[1],g.win[1],g.topWin[1]);
    const chamberHeight=Math.max(1,plaqueTop-controlBottom-24);
    const glass=box(this.node,'Contained chamber reflections',x,1152-(controlBottom+plaqueTop)/2,660,chamberHeight);
    glass.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
    for(let i=0;i<3;i++){
      const gx=(i-1)*w*.65,gy=0,n=art.light(glass,1,gx,gy,300,420,0);
      this.baseLights.push({n,alpha:n.getComponent(UIOpacity)!,x:gx,y:gy,phase:i*1.8,speed:0});
    }
    for(let i=0;i<16;i++){
      const gx=((i*.618)%1-.5)*580,gy=-chamberHeight/2+(i%4)*chamberHeight/4,n=art.light(glass,3,gx,gy,20+(i%3)*8,20+(i%3)*8,0);
      this.glassDust.push({n,alpha:n.getComponent(UIOpacity)!,x:gx,y:gy,phase:i*.37,speed:0});
    }
    // Reflections sweep the crown and console in the cabinet's own plane.
    for(let i=0;i<8;i++){
      const gx=tx+(i-3.5)*g.title[2]*.115,gy=ty+g.title[3]*.38;
      const n=art.light(this.node,3,gx,gy,48,48,0);n.name='Cabinet crown moving glint';
      this.glints.push({n,alpha:n.getComponent(UIOpacity)!,x:gx,y:gy,phase:i*.48,speed:235});
    }
    // Segmented perimeter lamps and moving reflections live on the physical frame.
    const tint=new Color(['#FFE0A0','#A4EFD0','#C7EBFF','#FFD0B8'][this.cabinetTheme]);
    for(let side=0;side<2;side++)for(let i=0;i<12;i++){
      const gx=x+(side?1:-1)*(w+35),gy=y-h+(i/11)*h*2;
      const n=art.light(this.node,1,gx,gy,78,78,0);n.getComponent(Sprite)!.color=tint;
      this.railLights.push({n,alpha:n.getComponent(UIOpacity)!,x:gx,y:gy,phase:i/12+side*.16,speed:side});
    }
    for(let i=0;i<8;i++){
      const size=i%2?38:68,n=art.light(glass,this.cabinetTheme===1?3:i%2?3:1,0,0,size,size,0);n.getComponent(Sprite)!.color=tint;
      n.name=['Mint double-strike reflection','Prism facet refraction','Paired link glint','Vault orbit reflection'][this.cabinetTheme];
      this.chamberGlints.push({n,alpha:n.getComponent(UIOpacity)!,x:0,y:0,phase:i/8,speed:i});
    }
    const points=[[x-w*.68,y+h+115],[x+w*.72,y+h+100],[x-w-23,y+h],[x+w+23,y+h-35],[x-w-25,y-h+50],[x+w+23,y-h],[x-w*.6,y+h+28],[x+w*.5,y-h-28]];
    for(let i=0;i<points.length;i++){
      const [gx,gy]=points[i],n=art.light(this.node,3,gx,gy,160,160,0);
      this.glints.push({n,alpha:n.getComponent(UIOpacity)!,x:gx,y:gy,phase:i*.91,speed:225});
    }
  }
  private pillarPoint(p:number,side:number):[number,number]{
    const bend=Math.sin(p*Math.PI),theme=this.cabinetTheme;
    // Follow the outside of the measured aperture, avoiding symbols and captions.
    return [this.frameX+side*(this.frameW+30+bend*(theme===2?12:theme===1?20:5)),this.frameY-this.frameH+p*this.frameH*2];
  }
  protected update(dt:number):void{
    const step=Math.max(0,Math.min(dt,.1));
    // Integrate velocity: changing reel energy must not move particles to a new phase.
    const target=this.reducedMotion?0:Math.max(0,Math.min(1,Math.max(this.motionEnergy,this.presentationEnergy)));
    this.energy+=(target-this.energy)*(1-Math.exp(-step*8));
    const idleTarget=this.reducedMotion?0:1-Math.min(1,Math.max(this.energy,this.impact)*1.8);
    this.idlePresence+=(idleTarget-this.idlePresence)*(1-Math.exp(-step*5));
    if(!this.reducedMotion)this.idleClock+=step;
    if(!this.reducedMotion){
      this.flowClock+=step*(.14+this.energy*.16);
      this.moteClock+=step*([.075,.11,.060,.15][Math.max(0,this.cabinetTheme)]+this.energy*.065);
      this.propClock+=step*(.35+this.energy*.45);
    }
    for(const pulse of this.arrivals)pulse.age=Math.min(9,pulse.age+step);
    const flow=this.frameFlow;if(flow){flow.clear();if(!this.reducedMotion){
      const themeColors=['#FEE2A7','#A8FFD3','#E5D6FF','#FFCC89'];
      for(const side of [-1,1]){
        const cycle=(this.flowClock+side*.21+2)%1;
        for(let i=0;i<14;i++){
          const a=cycle-i*.007,b=a-.007;if(b<0||a>1)continue;
          const [x0,y0]=this.pillarPoint(a,side),[x1,y1]=this.pillarPoint(b,side);
          const tint=new Color(themeColors[this.cabinetTheme]);tint.a=Math.round((1-i/14)*(85+this.energy*90+this.cabinetIdle(side>0?1.1:.65)*65));
          flow.strokeColor=tint;flow.lineWidth=2.5+(1-i/14)*2;flow.moveTo(x0,y0);flow.lineTo(x1,y1);flow.stroke();
        }
      }
    }}
    for(const mote of this.flowHeads){
      const p=(this.moteClock+mote.phase+2)%1;
      const [x,y]=this.pillarPoint(p,mote.side),flutter=Math.sin(p*Math.PI*4+mote.phase*13);
      mote.node.setPosition(x+mote.side*(8+flutter*(this.cabinetTheme===1?18:7)),y);
      const size=this.cabinetTheme===3?(.45+p*.4):(.75+Math.sin(p*Math.PI)*.35);
      mote.node.setScale(size,this.cabinetTheme===3?size*1.6:size,1);mote.node.angle=this.cabinetTheme===1?this.time*28:0;
      mote.alpha.opacity=this.reducedMotion?0:Math.sin(p*Math.PI)*(125+this.energy*100+this.idlePulse(1.1,3)*55);
    }

    for(const glint of this.stopGlints){glint.age=Math.min(1,glint.age+Math.min(dt,.1));const p=Math.min(1,glint.age/.62),pulse=Math.sin(Math.PI*Math.pow(p,.55));glint.alpha.opacity=this.reducedMotion||p>=1?0:pulse*235;glint.n.setScale(.7+p*.85,.7+p*.25,1);}

    for(let i=0;i<this.titleMotes.length;i++){
      const m=this.titleMotes[i],t=this.time*1.2+m.phase;
      const column=Math.round(i*(this.arrivals.length-1)/Math.max(1,this.titleMotes.length-1));
      const response=this.arrivalLight(.23,.60,column);
      m.alpha.opacity=this.reducedMotion?0:Math.min(240,Math.pow(Math.max(0,Math.sin(t*.65)),3)*90+response*175+this.idlePulse(2.1+i*.22,1.8)*150);
      const size=1+response*.22+this.idlePulse(2.1+i*.22,1.8)*.30;m.n.setScale(size,size,1);m.n.setPosition(m.x,m.y);m.n.angle=0;
    }

    if(this.compass&&!this.reducedMotion)this.compass.angle=this.time*5;
    for(const prop of this.props){
      const t=this.propClock+prop.phase*6.283,p=(t/6.283)%1;
      if(this.cabinetTheme===0){prop.n.setPosition(Math.cos(t)*220,Math.sin(t)*100);prop.n.angle=t*45;}
      else if(this.cabinetTheme===1){prop.n.setPosition(Math.sin(prop.phase*43)*245+Math.sin(t)*20,-180+p*360);prop.n.angle=t*30;}
      else if(this.cabinetTheme===2){prop.n.setPosition(Math.sin(prop.phase*39)*240+Math.sin(t)*35,180-p*360);prop.n.angle=Math.sin(t)*30;}
      else{prop.n.setPosition(Math.cos(t)*245,Math.sin(t)*90);prop.n.angle=Math.sin(t*2)*16;}
      const depth=.65+.35*(Math.sin(t)*.5+.5);prop.n.setScale(this.cabinetTheme<2?depth*(.3+.7*Math.abs(Math.cos(t*2))):depth,depth,1);
      prop.alpha.opacity=this.reducedMotion?0:Math.sin(p*Math.PI)*215;
    }
    this.impact=Math.max(0,this.impact-Math.min(dt,.1)*1.65);
    for(const lamp of this.railLights){
      const phase=(this.time/(3.8+this.cabinetTheme*.3)-lamp.phase+20)%1;
      const chase=Math.pow(Math.max(0,Math.cos(phase*Math.PI*2)),5);
      const height=(lamp.y-(this.frameY-this.frameH))/Math.max(1,this.frameH*2);
      const response=this.arrivalLight(height*.28,.32);
      lamp.alpha.opacity=this.reducedMotion?0:Math.min(245,24+chase*75+response*120+this.energy*65+this.cabinetIdle(.65+height*1.8+lamp.speed*(this.cabinetTheme===2?.65:.18))*145);
      const scale=.72+chase*.24+response*.18+this.cabinetIdle(.65+height*1.8+lamp.speed*(this.cabinetTheme===2?.65:.18))*.30;lamp.n.setScale(scale,scale,1);
    }
    for(const glint of this.chamberGlints){
      const index=glint.speed,side=index%2?1:-1;
      const t=this.time*(.48+this.cabinetTheme*.07)+glint.phase*Math.PI*2;
      const phrase=this.cabinetIdle(.45+(this.cabinetTheme===2?Math.floor(index/2)*.28:index*.13));
      let sx=1,sy=1;
      // All four motifs stay inside the masked, unlettered lower chamber.
      if(this.cabinetTheme===0){
        glint.n.setPosition(side*(94+Math.floor(index/2)*43),-12+phrase*18);
        sx=.58+phrase*.85;sy=.28+phrase*.46;glint.n.angle=0;
      }else if(this.cabinetTheme===1){
        glint.n.setPosition(-245+index*70+Math.sin(t)*9,Math.sin(index*1.7)*34);
        sx=.30+phrase*.85;sy=.55+phrase*.65;glint.n.angle=45+Math.sin(t)*14;
      }else if(this.cabinetTheme===2){
        const pair=Math.floor(index/2);
        glint.n.setPosition(-210+pair*140+side*19,side*17+Math.sin(t)*5);
        sx=.55+phrase*.6;sy=.40+phrase*.4;glint.n.angle=side*35;
      }else{
        glint.n.setPosition(Math.cos(t)*244,Math.sin(t)*43);
        sx=.6+phrase*.5;sy=.55+phrase*.35;glint.n.angle=t*180/Math.PI+90;
      }
      glint.n.setScale(sx,sy,1);
      const shimmer=this.cabinetTheme===3?Math.pow(Math.max(0,Math.sin(t)),2)*90:Math.pow(Math.max(0,Math.sin(t*.7)),4)*35;
      glint.alpha.opacity=this.reducedMotion?0:Math.min(235,shimmer+phrase*185+this.impact*55);
    }
    for(const sweep of this.sweeps){
      const cycle=(this.time+sweep.phase)%(this.cabinetTheme>=0?3.9:7.8),p=Math.min(1,cycle/2.6);
      sweep.n.setPosition(-sweep.w*.85+p*sweep.w*1.7-sweep.cx,-sweep.cy);
      sweep.alpha.opacity=this.reducedMotion||cycle>2.6?0:Math.sin(p*Math.PI)*(this.cabinetTheme>=0?195:165);
    }
    for(const mote of this.glassDust){
      const p=(this.time*.17+mote.phase)%1;
      mote.n.setPosition(mote.x+Math.sin(this.time+mote.phase)*16,mote.y+p*100);
      mote.n.angle=this.time*25+mote.phase*70;
      mote.alpha.opacity=this.reducedMotion?0:Math.sin(p*Math.PI)*195;
    }
    for(const light of this.baseLights){
      light.alpha.opacity=this.reducedMotion?0:Math.min(225,30+(Math.sin(this.time*1.2+light.phase)*.5+.5)*70+this.arrivalLight(.10,.65)*95+this.energy*40+this.idlePulse(light.phase*.12,2.1)*90);
      light.n.setScale(1+Math.sin(this.time*.8+light.phase)*.06,1,1);
    }
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
