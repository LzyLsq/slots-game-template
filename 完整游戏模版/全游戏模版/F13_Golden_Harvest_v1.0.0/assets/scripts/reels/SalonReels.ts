import { _decorator, Component, Color, Label, Mask, Node, Sprite, SpriteFrame, tween, Tween, UIOpacity, Vec3 } from 'cc';
import type { GameConfig, SpinResult } from '../math/types';
import { SYMBOL_ART } from '../math/GameConfigs';
import { SalonArt, box, opacity, outlined, text } from '../ui/SalonArt';
import { imagePoint, type Box } from '../ui/CabinetGeometry';
const { ccclass } = _decorator;
interface Cell { node: Node; sprite: Sprite; alpha:UIOpacity; logical:number; blurred:boolean; emphasis:number; }
interface Column { cells:Cell[]; elapsed:number; travel:number; final:number; brake:number; stopped:boolean; landAge:number; }
interface ReelLight { glow:Node; glowAlpha:UIOpacity; glint:Node; glintAlpha:UIOpacity; trail:Node; trailAlpha:UIOpacity; }
interface Locked { node:Node; amount:Label; }
@ccclass('SalonReels')
export class SalonReels extends Component {
  private art!:SalonArt; private config!:GameConfig; private cols:Column[]=[];
  private sharp:Record<string,SpriteFrame>={};private blur:Record<string,SpriteFrame>={};
  private width=0;private height=0;private cellH=0;private cellW=0;
  private target:readonly string[]=[];private running=false;private transitioning=false;private clock=0;
  private resolve?:()=>void;public onStop?:(index:number)=>void;public reducedMotion=false;
  private maskRoot!:Node;private reflection!:Node;private reflectionAlpha!:UIOpacity;
  private locks:Locked[]=[];private locked:Readonly<Record<number,number>>={};
  private lights:ReelLight[]=[];
  private sparks:{node:Node;alpha:UIOpacity;x:number;y:number;vx:number;vy:number;age:number;life:number}[]=[];
  private sparkCursor=0;private idleSparkAge=0;
  private motes:{node:Node;alpha:UIOpacity;phase:number;speed:number;lane:number}[]=[];
  public setup(art:SalonArt,config:GameConfig,rect:Box):void {
    this.art=art;this.config=config;this.width=rect[2];this.height=rect[3];
    this.cellW=this.width/config.columns;this.cellH=this.height/config.rows;
    for(const symbol of config.symbols){const index=SYMBOL_ART[symbol.id]??0;this.sharp[symbol.id]=art.frame('symbols',index);this.blur[symbol.id]=art.frame('symbols-blur',index);}
    const [x,y]=imagePoint(rect);this.node.setPosition(x,y);
    this.maskRoot=box(this.node,'Exact-reel-aperture',0,0,this.width,this.height);this.maskRoot.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
    // Reserve room for the elastic landing and idle float inside each cell.
    const size=Math.min(this.cellW,this.cellH)*.91;
    for(let col=0;col<config.columns;col++){
      const cells:Cell[]=[];
      for(let j=-2;j<config.rows+2;j++){
        const n=art.image(this.maskRoot,'symbols',0,0,size,size,0);
        if(j>=0&&j<config.rows)n.on(Node.EventType.TOUCH_END,()=>{
          if(this.running||this.transitioning||this.reducedMotion)return;
          this.sparkle(col,j,6);cells[j+2].emphasis=.38;
        });
        cells.push({node:n,sprite:n.getComponent(Sprite)!,alpha:opacity(n,255),logical:NaN,blurred:false,emphasis:0});
      }
      this.cols.push({cells,elapsed:0,travel:0,final:0,brake:Infinity,stopped:true,landAge:99});
    }
    for(let i=0;i<config.columns*config.rows;i++){
      const n=box(this.maskRoot,'Locked treasure',this.x(Math.floor(i/config.rows)),this.y(i%config.rows),this.cellW,this.cellH);
      art.image(n,'symbols',0,7,size,size,0);
      const label=outlined(text(n,'',0,-this.cellH*.29,this.cellW,40,28,'#FFF8DB'),'#173A30',3);
      n.active=false;this.locks.push({node:n,amount:label});
    }
    for(let c=0;c<config.columns;c++){
      const glow=art.light(this.maskRoot,1,this.x(c),0,this.cellW*1.35,this.cellW*1.35,0);glow.setSiblingIndex(0);
      const glint=art.light(this.maskRoot,3,this.x(c),0,this.cellW*.68,this.cellW*.68,0);
      const trail=art.light(this.maskRoot,2,this.x(c),0,this.cellW*.65,this.cellW*.65,0);trail.setScale(.48,3.6,1);
      this.lights.push({glow,glowAlpha:glow.getComponent(UIOpacity)!,glint,glintAlpha:glint.getComponent(UIOpacity)!,trail,trailAlpha:trail.getComponent(UIOpacity)!});
    }
    // A fixed particle pool keeps repeated wins from allocating nodes per frame.
    for(let i=0;i<48;i++){
      const node=art.light(this.maskRoot,3,0,0,30,30,0);
      this.sparks.push({node,alpha:node.getComponent(UIOpacity)!,x:0,y:0,vx:0,vy:0,age:1,life:.7});
    }
    const tint=new Color(config.id==='pearl-palace'?'#DBEDAC':config.id==='ruby-revel'?'#FFD0A8':'#FFE3A2');
    for(let i=0;i<12;i++){
      const node=art.light(this.maskRoot,3,0,0,9+(i%3)*4,9+(i%3)*4,0);
      node.getComponent(Sprite)!.color=tint;
      this.motes.push({node,alpha:node.getComponent(UIOpacity)!,phase:i*.0833,speed:.045+(i%4)*.009,lane:(i*.618)%1});
    }
    this.reflection=art.light(this.maskRoot,2,-this.width,0,this.height*1.8,this.height*1.8,0);
    this.reflectionAlpha=this.reflection.getComponent(UIOpacity)!;
    this.show(config.reelStrips.flatMap((strip,col)=>Array.from({length:config.rows},(_,r)=>strip[(r*3+col*7)%strip.length])));
  }
  private x(col:number):number{return -this.width/2+(col+.5)*this.cellW;}
  private y(row:number):number{return this.height/2-(row+.5)*this.cellH;}
  public show(grid:readonly string[]):void {
    this.target=grid;this.running=false;this.transitioning=false;
    for(let c=0;c<this.cols.length;c++){
      const col=this.cols[c];col.travel=col.final=100;col.stopped=true;
      for(const cell of col.cells){cell.logical=NaN;cell.emphasis=0;Tween.stopAllByTarget(cell.node);Tween.stopAllByTarget(cell.alpha);cell.alpha.opacity=255;}
      this.draw(c,false);
    }
  }
  public begin():void {
    this.running=true;this.transitioning=false;this.target=[];
    for(const col of this.cols){col.elapsed=0;col.travel=0;col.brake=Infinity;col.stopped=false;col.final=100000;col.landAge=99;
      for(const cell of col.cells){cell.logical=NaN;cell.emphasis=0;cell.alpha.opacity=255;Tween.stopAllByTarget(cell.node);Tween.stopAllByTarget(cell.alpha);}
    }
  }
  public finish(result:SpinResult):Promise<void>{return this.finishGrid(result.grid);}
  public finishGrid(grid:readonly string[],quick=false):Promise<void>{
    if(!this.running)this.begin();this.target=grid;
    // Quick mode changes HOLD duration, never velocity halfway through a spin.
    for(let c=0;c<this.cols.length;c++){
      const col=this.cols[c];col.brake=Math.max(col.elapsed+.18,(quick?.38:.82)+c*.105);
      col.final=Math.ceil(2.75+(col.brake-.3)*25+4);
    }
    return new Promise(resolve=>{this.resolve=resolve;});
  }
  private sparkle(column:number,row:number,count:number):void{
    for(let i=0;i<count;i++){
      const spark=this.sparks[this.sparkCursor++%this.sparks.length],angle=i*Math.PI*2/count+this.clock;
      spark.x=this.x(column);spark.y=this.y(row);
      spark.vx=Math.cos(angle)*this.cellW*.42;spark.vy=Math.sin(angle)*this.cellH*.42+30;
      spark.age=0;spark.node.setPosition(spark.x,spark.y);
    }
  }
  public highlight(positions:readonly number[]):void{
    if(!this.reducedMotion)for(const position of positions.slice(0,12)){
      for(let i=0;i<4;i++){
        const spark=this.sparks[this.sparkCursor++%this.sparks.length],angle=i*Math.PI/2+position*.7;
        spark.x=this.x(Math.floor(position/this.config.rows));spark.y=this.y(position%this.config.rows);
        spark.vx=Math.cos(angle)*this.cellW*.65;spark.vy=Math.sin(angle)*this.cellH*.65+40;
        spark.age=0;spark.alpha.opacity=220;spark.node.setPosition(spark.x,spark.y);
      }
    }
    for(let c=0;c<this.cols.length;c++)for(let j=0;j<this.config.rows;j++)this.cols[c].cells[j+2].emphasis=positions.includes(c*this.config.rows+j)?1:0;
  }
  public lockCoins(values:Readonly<Record<number,number>>):void{
    const previous=this.locked;this.locked=values;
    for(let i=0;i<this.locks.length;i++){
      const lock=this.locks[i];lock.node.active=i in values;
      if(lock.node.active){lock.amount.string=String(values[i]);if(!(i in previous)&&!this.reducedMotion){lock.node.setScale(.72,.72,1);tween(lock.node).to(.34,{scale:new Vec3(1,1,1)},{easing:'backOut'}).start();}}
    }
    if(!this.running)for(let c=0;c<this.cols.length;c++)this.draw(c,false);
  }
  /** Drop survivors into their real destination rows; refill only empty cells. */
  public async collapseTo(grid:readonly string[],removed:readonly number[]):Promise<void>{
    const total=this.config.columns*this.config.rows;
    if(grid.length!==total||removed.some(p=>!Number.isInteger(p)||p<0||p>=total))throw new Error('Invalid cascade cell indices');
    const old=this.target,cleared=new Set(removed);
    // Validate before changing any visible cells, including in reduced motion.
    const sources=this.cols.map((_,c)=>Array.from({length:this.config.rows},(_,r)=>r).filter(r=>!cleared.has(c*this.config.rows+r)));
    for(let c=0;c<this.cols.length;c++){
      const refill=this.config.rows-sources[c].length;
      for(let r=refill;r<this.config.rows;r++)if(old[c*this.config.rows+sources[c][r-refill]]!==grid[c*this.config.rows+r])throw new Error('Invalid cascade survivor');
    }
    if(this.reducedMotion){this.show(grid);return;}
    this.transitioning=true;
    this.highlight(removed);
    for(const position of removed){const cell=this.cols[Math.floor(position/this.config.rows)].cells[position%this.config.rows+2];tween(cell.node).to(.2,{scale:new Vec3(.2,.2,1)},{easing:'backIn'}).start();tween(cell.alpha).to(.18,{opacity:0}).start();}
    await this.wait(this.reducedMotion?.01:.22);if(!this.isValid)return;
    this.show(grid);this.transitioning=true;
    for(let c=0;c<this.cols.length;c++){
      const survivors=sources[c];
      const refill=this.config.rows-survivors.length;
      for(let r=0;r<this.config.rows;r++){
        const cell=this.cols[c].cells[r+2];const source=r<refill?r-refill:survivors[r-refill];
        cell.node.setPosition(this.x(c),this.y(source));
        tween(cell.node).delay(c*.035).to(this.reducedMotion?.01:.35,{position:new Vec3(this.x(c),this.y(r),0)},{easing:'bounceOut'}).start();
      }
    }
    await this.wait(this.reducedMotion?.02:.55);this.transitioning=false;
  }
  public async expandColumn(column:number):Promise<void>{
    if(this.reducedMotion)return;
    const light=this.art.light(this.maskRoot,1,this.x(column),0,this.cellW*1.5,this.height,180);
    light.setScale(.6,.1,1);tween(light).to(.35,{scale:new Vec3(1,1,1)},{easing:'backOut'}).start();
    this.highlight(Array.from({length:this.config.rows},(_,r)=>column*this.config.rows+r));
    await this.wait(this.reducedMotion?.04:.65);if(light.isValid)light.destroy();
  }
  private wait(seconds:number):Promise<void>{return new Promise(resolve=>this.scheduleOnce(resolve,seconds));}
  protected update(dt:number):void{
    this.clock+=Math.min(dt,.1);
    const idle=!this.running&&!this.transitioning&&!this.reducedMotion;
    for(const mote of this.motes){
      const phase=(this.clock*mote.speed+mote.phase)%1;
      mote.node.setPosition((mote.lane-.5)*this.width+Math.sin(phase*Math.PI*3+mote.phase*9)*this.cellW*.13,(phase-.5)*this.height);
      mote.node.angle=this.clock*24+mote.phase*360;
      mote.alpha.opacity=idle?Math.sin(phase*Math.PI)*95:0;
    }
    if(idle){
      this.idleSparkAge+=Math.min(dt,.1);
      if(this.idleSparkAge>2.4){this.idleSparkAge=0;const index=Math.floor(this.clock/2.4)%(this.config.columns*this.config.rows);this.sparkle(Math.floor(index/this.config.rows),index%this.config.rows,3);}
    }else this.idleSparkAge=0;
    for(const spark of this.sparks){
      if(this.reducedMotion||spark.age>=spark.life){spark.alpha.opacity=0;continue;}
      spark.age+=Math.min(dt,.1);const t=spark.age,p=Math.min(1,t/spark.life);
      spark.node.setPosition(spark.x+spark.vx*t,spark.y+spark.vy*t-120*t*t);
      spark.node.setScale(1-p*.7,1-p*.7,1);spark.node.angle=t*140;
      spark.alpha.opacity=220*(1-p)*(1-p);
    }
    if(!this.reducedMotion){const sweep=(this.clock%4.6)/4.6,eased=sweep*sweep*(3-2*sweep);this.reflection.setPosition(-this.width*1.25+eased*this.width*2.5,Math.sin(sweep*Math.PI)*this.height*.09);this.reflectionAlpha.opacity=Math.pow(Math.sin(sweep*Math.PI),2)*(this.running?56:76);}
    else this.reflectionAlpha.opacity=0;
    for(let c=0;c<this.lights.length;c++){
      const fx=this.lights[c],col=this.cols[c];col.landAge+=Math.min(dt,.1);
      if(this.reducedMotion){fx.glowAlpha.opacity=fx.glintAlpha.opacity=fx.trailAlpha.opacity=0;continue;}
      const cycle=(this.clock+c*.53)%3.8,row=Math.floor((this.clock+c*.53)/3.8)%this.config.rows;
      const pulse=Math.sin(Math.min(1,cycle/1.3)*Math.PI),land=Math.max(0,1-col.landAge/.65);
      const y=this.y(row),emphasis=this.cols[c].cells[row+2].emphasis;
      fx.glow.setPosition(this.x(c),y);fx.glow.setScale(1+pulse*.15,1+pulse*.15,1);
      fx.glowAlpha.opacity=this.running?(col.stopped?land*190:0):pulse*120+emphasis*70;
      fx.glint.setPosition(this.x(c)+Math.cos(cycle*3)*this.cellW*.24,y+Math.sin(cycle*3)*this.cellH*.24);
      fx.glintAlpha.opacity=this.running?land*180:pulse*210;
      const flow=(this.clock*1.65+c*.19)%1;
      fx.trail.setPosition(this.x(c)+this.cellW*.21,this.height*.75-flow*this.height*1.5);
      fx.trailAlpha.opacity=this.running&&!col.stopped?Math.sin(flow*Math.PI)*165:0;
    }
    if(this.transitioning)return;
    if(!this.running){
      for(let c=0;c<this.cols.length;c++)for(let j=0;j<this.config.rows;j++){
        const cell=this.cols[c].cells[j+2],wave=this.reducedMotion?0:Math.sin(this.clock*1.8+c*.9+j*1.3);
        const phase=(this.clock+c*.53)%3.8,activeRow=Math.floor((this.clock+c*.53)/3.8)%this.config.rows;
        const hop=this.reducedMotion||j!==activeRow?0:Math.sin(Math.min(1,phase/1.3)*Math.PI);
        cell.emphasis=Math.max(0,cell.emphasis-dt*.6);const punch=this.reducedMotion?0:cell.emphasis*.09;
        cell.node.setPosition(this.x(c),this.y(j)+wave*Math.min(5,this.cellH*.028)+hop*Math.min(7,this.cellH*.035));
        // Preserve the jewel's silhouette: breathe uniformly, never stretch it.
        const landing=this.reducedMotion?0:Math.max(0,1-this.cols[c].landAge/.55)*Math.sin(this.cols[c].landAge*19)*.055;
        const breath=Math.min(1.085,1+wave*.025+punch+hop*.05+landing);
        const id=this.target[c*this.config.rows+j],coin=id==='coin'||id==='chip',fruit=id==='ring'||id==='pearl';
        const turn=(this.clock+c*.8+j*.6)%7.5;
        const tilt=this.reducedMotion?1:coin&&turn<1.6?1-Math.sin(turn/1.6*Math.PI)*.17:1;
        cell.node.setScale(breath*tilt,breath,1);
        cell.node.angle=this.reducedMotion?0:wave*(fruit?3.4:id==='bell'||id==='ruby'?4.2:1.6)+hop*Math.sin(phase*7)*1.8;
      }
      return;
    }
    let stopped=0;
    for(let c=0;c<this.cols.length;c++){
      const col=this.cols[c];if(col.stopped){stopped++;continue;}
      col.elapsed+=Math.min(dt,.1);const t=col.elapsed;
      if(t<.08)col.travel=-.13*Math.sin(t/.08*Math.PI);
      else if(t<.30)col.travel=2.75*Math.pow((t-.08)/.22,2);
      else if(t<col.brake)col.travel=2.75+(t-.3)*25;
      else{
        const u=Math.min(1,(t-col.brake)/.48),start=2.75+(col.brake-.3)*25;
        // Hermite brake keeps velocity continuous (25 symbols/sec) at entry.
        const u2=u*u,u3=u2*u;col.travel=(2*u3-3*u2+1)*start+(u3-2*u2+u)*12+(-2*u3+3*u2)*(col.final+.10);
        if(u>=1){const bounce=Math.min(1,(t-col.brake-.48)/.14);col.travel=col.final+.10*Math.cos(bounce*Math.PI/2);if(bounce>=1){col.travel=col.final;col.stopped=true;col.landAge=0;this.onStop?.(c);stopped++;}}
      }
      this.draw(c,t>.3&&t<col.brake+.2);
    }
    if(stopped===this.cols.length){this.running=false;const done=this.resolve;this.resolve=undefined;done?.();}
  }
  private draw(c:number,blurred:boolean):void{
    const col=this.cols[c],base=Math.floor(col.travel),fraction=col.travel-base,strip=this.config.reelStrips[c];
    for(let k=0;k<col.cells.length;k++){
      const j=k-2,cell=col.cells[k],index=base-j;
      cell.node.active=!(j>=0&&j<this.config.rows&&c*this.config.rows+j in this.locked);
      if(cell.logical!==index||cell.blurred!==blurred){
        const row=col.final-index,id=this.target.length&&row>=0&&row<this.config.rows?this.target[c*this.config.rows+row]:strip[((index+c*7)%strip.length+strip.length)%strip.length];
        cell.sprite.spriteFrame=blurred?this.blur[id]:this.sharp[id];cell.logical=index;cell.blurred=blurred;
      }
      cell.node.setPosition(this.x(c),this.y(j+fraction));cell.node.setScale(blurred?.97:1,blurred?1.035:1,1);cell.node.angle=0;
    }
  }
  protected onDestroy():void{this.resolve?.();this.resolve=undefined;}
}
