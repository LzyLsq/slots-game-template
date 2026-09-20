import { _decorator, Component, Color, game, Game, Graphics, Label, Mask, Node, Sprite, SpriteFrame, tween, Tween, UIOpacity, Vec3 } from 'cc';
import type { GameConfig, SpinResult } from '../math/types';
import { SYMBOL_ART, symbolAtlas } from '../math/GameConfigs';
import { SalonArt, box, opacity, outlined, text } from '../ui/SalonArt';
import { imagePoint, type Box } from '../ui/CabinetGeometry';
import { brakeTravel, launchTravel, reelMotionProfile, settleTravel, type ReelMotionProfile } from './ReelMotion';
const { ccclass } = _decorator;
interface Cell { node: Node; sprite: Sprite; alpha:UIOpacity; logical:number; blurred:boolean; emphasis:number; }
interface Column { cells:Cell[]; elapsed:number; travel:number; final:number; brake:number; brakeDuration:number; settleDuration:number; stopped:boolean; landAge:number; }
interface ReelLight { glow:Node; glowAlpha:UIOpacity; glint:Node; glintAlpha:UIOpacity; trail:Node; trailAlpha:UIOpacity; }
interface Locked { node:Node; amount:Label; }
@ccclass('SalonReels')
export class SalonReels extends Component {
  private art!:SalonArt; private config!:GameConfig; private cols:Column[]=[];
  private sharp:Record<string,SpriteFrame>={};private blur:Record<string,SpriteFrame>={};
  private width=0;private height=0;private cellH=0;private cellW=0;
  private target:readonly string[]=[];private starting:readonly string[]=[];private running=false;private transitioning=false;private clock=0;
  private resolve?:()=>void;public onStop?:(index:number)=>void;public reducedMotion=false;
  private maskRoot!:Node;private reflection!:Node;private reflectionAlpha!:UIOpacity;
  private locks:Locked[]=[];private locked:Readonly<Record<number,number>>={};
  private lights:ReelLight[]=[];private winningEdges?:Graphics;
  private sparks:{node:Node;alpha:UIOpacity;x:number;y:number;vx:number;vy:number;age:number;life:number}[]=[];
  private themeFX:{node:Node;alpha:UIOpacity;age:number;x:number;y:number}[]=[];private themeCursor=0;
  private motion:ReelMotionProfile=reelMotionProfile('golden-hour');
  private pendingWaits=new Set<{remaining:number;done:()=>void}>();private epoch=0;private hidden=false;
  private sparkCursor=0;private idleSparkAge=0;
  private motes:{node:Node;alpha:UIOpacity;phase:number;speed:number;lane:number}[]=[];
  protected onLoad():void{game.on(Game.EVENT_HIDE,this.hide,this);game.on(Game.EVENT_SHOW,this.resume,this);}
  private hide():void{this.hidden=true;this.pauseTree(this.node,true);}
  private resume():void{this.hidden=false;this.pauseTree(this.node,false);}
  private pauseTree(node:Node,paused:boolean):void{
    if(paused)Tween.pauseAllByTarget(node);else Tween.resumeAllByTarget(node);
    const alpha=node.getComponent(UIOpacity);if(alpha){if(paused)Tween.pauseAllByTarget(alpha);else Tween.resumeAllByTarget(alpha);}
    for(const child of node.children)this.pauseTree(child,paused);
  }
  public setup(art:SalonArt,config:GameConfig,rect:Box):void {
    this.art=art;this.config=config;this.motion=reelMotionProfile(config.id);this.width=rect[2];this.height=rect[3];
    this.cellW=this.width/config.columns;this.cellH=this.height/config.rows;
    for(const symbol of config.symbols){const index=SYMBOL_ART[symbol.id]??0;this.sharp[symbol.id]=art.frame(symbolAtlas(config.id),index);this.blur[symbol.id]=art.frame(symbolAtlas(config.id)+'-blur',index);}
    const [x,y]=imagePoint(rect);this.node.setPosition(x,y);
    this.maskRoot=box(this.node,'Exact-reel-aperture',0,0,this.width,this.height);this.maskRoot.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
    const rails=box(this.maskRoot,'Glass reel dividers',0,0,this.width,this.height).addComponent(Graphics);
    for(let pass=0;pass<2;pass++){
      rails.strokeColor=pass?new Color('#F7DDA0'):new Color(config.id==='pearl-palace'?'#486576':config.id==='jade-treasury'?'#97614C':'#96622D');rails.lineWidth=pass?1.6:6;
      for(let c=1;c<config.columns;c++){const x=-this.width/2+c*this.cellW;rails.moveTo(x,-this.height/2);rails.lineTo(x,this.height/2);}
      for(let r=1;r<config.rows;r++){const y=this.height/2-r*this.cellH;rails.moveTo(-this.width/2,y);rails.lineTo(this.width/2,y);}rails.stroke();
    }
    // Reserve room for the elastic landing and idle float inside each cell.
    const size=Math.min(this.cellW,this.cellH)*.91;
    for(let col=0;col<config.columns;col++){
      const cells:Cell[]=[];
      for(let j=-2;j<config.rows+2;j++){
        const n=art.image(this.maskRoot,'symbols',0,0,size,size,0);
        if(j>=0&&j<config.rows)n.on(Node.EventType.TOUCH_END,()=>{
          if(this.running||this.transitioning||this.reducedMotion)return;
          this.sparkle(col,j,6);this.themeAccent(col,j);cells[j+2].emphasis=.5;
        });
        cells.push({node:n,sprite:n.getComponent(Sprite)!,alpha:opacity(n,255),logical:NaN,blurred:false,emphasis:0});
      }
      this.cols.push({cells,elapsed:0,travel:0,final:0,brake:Infinity,brakeDuration:this.motion.brake,settleDuration:this.motion.settle,stopped:true,landAge:99});
    }
    for(let i=0;i<config.columns*config.rows;i++){
      const n=box(this.maskRoot,'Locked treasure',this.x(Math.floor(i/config.rows)),this.y(i%config.rows),this.cellW,this.cellH);
      art.image(n,symbolAtlas(config.id),0,7,size,size,0);
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
    for(let i=0;i<32;i++){
      const node=art.light(this.maskRoot,3,0,0,30,30,0);
      this.sparks.push({node,alpha:node.getComponent(UIOpacity)!,x:0,y:0,vx:0,vy:0,age:1,life:.7});
    }
    const tint=new Color(config.id==='pearl-palace'?'#BDECF5':config.id==='jade-treasury'?'#FFD0CE':'#FFE3A2');
    for(let i=0;i<12;i++){
      const node=art.light(this.maskRoot,3,0,0,18+(i%3)*6,18+(i%3)*6,0);
      node.getComponent(Sprite)!.color=tint;
      this.motes.push({node,alpha:node.getComponent(UIOpacity)!,phase:i*.0833,speed:.10+(i%4)*.016,lane:(i*.618)%1});
    }
    const theme=['golden-hour','jade-treasury','pearl-palace','ruby-revel'].indexOf(config.id);
    for(let i=0;i<10;i++){
      const n=box(this.maskRoot,'Theme landing accent',0,0,this.cellW,this.cellH),g=n.addComponent(Graphics),r=Math.min(this.cellW,this.cellH)*.30;
      g.lineWidth=3;g.strokeColor=new Color(['#F9CF77','#FFC2CE','#BCECF7','#FDDD9C'][theme]);
      if(theme===0){g.circle(0,0,r);g.circle(0,0,r*.78);for(let j=0;j<8;j++){const a=j*Math.PI/4;g.moveTo(Math.cos(a)*r*1.12,Math.sin(a)*r*1.12);g.lineTo(Math.cos(a)*r*1.30,Math.sin(a)*r*1.30);}}
      else if(theme===1){for(const k of [1,.7]){g.moveTo(0,r*k);g.lineTo(r*k,0);g.lineTo(0,-r*k);g.lineTo(-r*k,0);g.close();}}
      else if(theme===2){g.ellipse(0,0,r,r*.46);g.ellipse(0,0,r*.68,r*.30);}
      else{for(let j=0;j<=6;j++){const a=j*Math.PI/3;const x=Math.cos(a)*r,y=Math.sin(a)*r;j?g.lineTo(x,y):g.moveTo(x,y);}g.moveTo(-r*.55,0);g.lineTo(-r*.65,r*.45);g.lineTo(-r*.22,r*.22);g.lineTo(0,r*.62);g.lineTo(r*.22,r*.22);g.lineTo(r*.65,r*.45);g.lineTo(r*.55,0);g.close();}g.stroke();
      n.setSiblingIndex(1);this.themeFX.push({node:n,alpha:opacity(n,0),age:2,x:0,y:0});
    }
    this.winningEdges=box(this.maskRoot,'Winning cell tracery',0,0,this.width,this.height).addComponent(Graphics);
    this.reflection=art.light(this.maskRoot,2,-this.width,0,this.height*1.8,this.height*1.8,0);
    this.reflectionAlpha=this.reflection.getComponent(UIOpacity)!;
    // Dividers sit above symbols and additive reflections so every segment remains visible.
    rails.node.setSiblingIndex(this.maskRoot.children.length-1);
    this.show(config.reelStrips.flatMap((strip,col)=>Array.from({length:config.rows},(_,r)=>strip[(r*3+col*7)%strip.length])));
  }
  private x(col:number):number{return -this.width/2+(col+.5)*this.cellW;}
  private y(row:number):number{return this.height/2-(row+.5)*this.cellH;}
  public show(grid:readonly string[]):void {
    this.validateGrid(grid);
    this.winningEdges?.clear();
    const previous=this.resolve;this.resolve=undefined;previous?.();
    this.target=grid;this.running=false;this.transitioning=false;
    for(let c=0;c<this.cols.length;c++){
      const col=this.cols[c];col.travel=col.final=100;col.stopped=true;
      for(const cell of col.cells){cell.logical=NaN;cell.emphasis=0;Tween.stopAllByTarget(cell.node);Tween.stopAllByTarget(cell.alpha);cell.alpha.opacity=255;}
      this.draw(c,false);
    }
  }
  public begin():void {
    this.epoch++;const previous=this.resolve;this.resolve=undefined;previous?.();
    this.winningEdges?.clear();this.starting=this.target;this.running=true;this.transitioning=false;this.target=[];
    for(const col of this.cols){col.elapsed=0;col.travel=0;col.brake=Infinity;col.stopped=false;col.final=100000;col.landAge=99;
      for(const cell of col.cells){cell.logical=NaN;cell.emphasis=0;cell.alpha.opacity=255;Tween.stopAllByTarget(cell.node);Tween.stopAllByTarget(cell.alpha);}
    }
  }
  public finish(result:SpinResult):Promise<void>{return this.finishGrid(result.grid);}
  public finishGrid(grid:readonly string[],quick=false):Promise<void>{
    this.validateGrid(grid);
    if(this.resolve)throw new Error('Reel stop is already scheduled');
    if(!this.running)this.begin();this.target=grid;
    // Turbo shortens hold/brake, never changes established strip velocity.
    for(let c=0;c<this.cols.length;c++){
      const col=this.cols[c],p=this.motion,fast=quick||this.reducedMotion;
      col.brakeDuration=p.brake*(fast?.72:1);col.settleDuration=p.settle*(fast?.75:1);
      col.brake=Math.max(col.elapsed+.12,p.pullDuration+p.acceleration+.04,(fast?.38:p.hold)+c*p.stagger*(fast?.68:1));
      col.final=Math.ceil(this.travelAt(col.brake)+p.speed*col.brakeDuration*.5);
    }
    return new Promise(resolve=>{this.resolve=resolve;});
  }
  private travelAt(t:number):number{
    return launchTravel(t,this.motion);
  }
  private validateGrid(grid:readonly string[]):void {
    if(grid.length!==this.config.columns*this.config.rows||grid.some(id=>!Object.prototype.hasOwnProperty.call(this.sharp,id)))throw new Error('Invalid reel presentation grid');
  }
  private themeAccent(column:number,row:number):void{
    if(this.reducedMotion)return;const fx=this.themeFX[this.themeCursor++%this.themeFX.length];fx.age=0;fx.x=this.x(column);fx.y=this.y(row);fx.node.setPosition(fx.x,fx.y);fx.alpha.opacity=170;
  }
  private sparkle(column:number,row:number,count:number):void{
    for(let i=0;i<count;i++){
      const spark=this.sparks[this.sparkCursor++%this.sparks.length],angle=i*Math.PI*2/count+this.clock;
      spark.x=this.x(column);spark.y=this.y(row);
      spark.vx=Math.cos(angle)*this.cellW*.42;spark.vy=Math.sin(angle)*this.cellH*.42+30;
      spark.age=0;spark.node.setPosition(spark.x,spark.y);
    }
  }
  public highlight(positions:readonly number[],line=false):void{
    const edges=this.winningEdges;if(edges){edges.clear();edges.strokeColor=new Color(this.config.id==='pearl-palace'?'#C5F0F9':this.config.id==='jade-treasury'?'#FFD4DB':'#FFEBAA');edges.lineWidth=4;for(const p of new Set(positions)){const x=this.x(Math.floor(p/this.config.rows)),y=this.y(p%this.config.rows);edges.roundRect(x-this.cellW*.46,y-this.cellH*.46,this.cellW*.92,this.cellH*.92,12);}edges.stroke();}

    // Connect only actual payline awards; clusters and ways are not paylines.
    if(line&&edges&&positions.length>1){edges.lineWidth=3;positions.forEach((p,i)=>{const x=this.x(Math.floor(p/this.config.rows)),y=this.y(p%this.config.rows);if(i===0)edges.moveTo(x,y);else edges.lineTo(x,y);});edges.stroke();}
    if(!this.reducedMotion)for(const position of Array.from(new Set(positions)).slice(0,12)){
      this.themeAccent(Math.floor(position/this.config.rows),position%this.config.rows);
      for(let i=0;i<4;i++){
        const spark=this.sparks[this.sparkCursor++%this.sparks.length],angle=i*Math.PI/2+position*.7;
        spark.x=this.x(Math.floor(position/this.config.rows));spark.y=this.y(position%this.config.rows);
        spark.vx=Math.cos(angle)*this.cellW*.65;spark.vy=Math.sin(angle)*this.cellH*.65+40;
        spark.age=0;spark.alpha.opacity=220;spark.node.setPosition(spark.x,spark.y);
      }
    }
    for(let c=0;c<this.cols.length;c++)for(let j=0;j<this.config.rows;j++){
      const cell=this.cols[c].cells[j+2],won=positions.includes(c*this.config.rows+j);cell.emphasis=won?1:0;
      Tween.stopAllByTarget(cell.alpha);tween(cell.alpha).to(this.reducedMotion?0:.16,{opacity:positions.length&&!won?110:255}).start();
    }
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
    const epoch=++this.epoch;this.validateGrid(grid);
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
    await this.wait(this.reducedMotion?.01:.22);if(!this.isValid||epoch!==this.epoch)return;
    this.show(grid);this.transitioning=true;
    for(let c=0;c<this.cols.length;c++){
      const survivors=sources[c];
      const refill=this.config.rows-survivors.length;
      for(let r=0;r<this.config.rows;r++){
        const cell=this.cols[c].cells[r+2];const source=r<refill?r-refill:survivors[r-refill];
        cell.node.setPosition(this.x(c),this.y(source));
        tween(cell.node).delay(c*.035).to(this.reducedMotion?.01:.35,{position:new Vec3(this.x(c),this.y(r),0)},{easing:'cubicOut'}).start();
      }
    }
    await this.wait(this.reducedMotion?.02:.55);if(this.isValid&&epoch===this.epoch)this.transitioning=false;
  }
  public async expandColumn(column:number):Promise<void>{
    if(this.reducedMotion)return;
    const light=this.art.light(this.maskRoot,1,this.x(column),0,this.cellW*1.5,this.height,180);
    light.setScale(.6,.1,1);tween(light).to(.35,{scale:new Vec3(1,1,1)},{easing:'backOut'}).start();
    this.highlight(Array.from({length:this.config.rows},(_,r)=>column*this.config.rows+r));
    await this.wait(this.reducedMotion?.04:.65);if(light.isValid)light.destroy();
  }
  private wait(seconds:number):Promise<void>{return new Promise(resolve=>{this.pendingWaits.add({remaining:seconds,done:resolve});});}
  protected update(dt:number):void{
    if(this.hidden)return;
    for(const wait of this.pendingWaits){wait.remaining-=Math.min(dt,.1);if(wait.remaining<=0){this.pendingWaits.delete(wait);wait.done();}}
    this.clock+=Math.min(dt,.1);
    for(const fx of this.themeFX){if(this.reducedMotion||fx.age>=.95){if(fx.alpha.opacity)fx.alpha.opacity=0;continue;}fx.age+=Math.min(dt,.1);const t=Math.min(1,fx.age/.95);fx.alpha.opacity=this.reducedMotion?0:170*Math.sin(t*Math.PI)*Math.pow(1-t,.5);const k=.45+t*.85;fx.node.setScale(k,k,1);fx.node.setPosition(fx.x,fx.y+(this.config.id==='pearl-palace'?t*this.cellH*.10:0));fx.node.angle=this.config.id==='jade-treasury'?t*14:0;}
    const idle=!this.running&&!this.transitioning&&!this.reducedMotion;
    for(const mote of this.motes){
      if(!idle){if(mote.alpha.opacity)mote.alpha.opacity=0;continue;}
      const phase=(this.clock*mote.speed+mote.phase)%1;
      mote.node.setPosition((mote.lane-.5)*this.width+Math.sin(phase*Math.PI*3+mote.phase*9)*this.cellW*.13,(phase-.5)*this.height);
      mote.node.angle=this.clock*24+mote.phase*360;
      mote.alpha.opacity=idle?Math.sin(phase*Math.PI)*90:0;
    }
    if(idle){
      this.idleSparkAge+=Math.min(dt,.1);
      if(this.idleSparkAge>2.2){this.idleSparkAge=0;const index=Math.floor(this.clock/2.2)%(this.config.columns*this.config.rows);this.sparkle(Math.floor(index/this.config.rows),index%this.config.rows,3);this.themeAccent(Math.floor(index/this.config.rows),index%this.config.rows);}
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
        if(!this.reducedMotion&&this.cols[c].landAge<.58){this.landingCell(c,j);continue;}
        // Blend out of the exact spring rest before resuming independent idle motion.
        const u=Math.min(1,Math.max(0,(this.cols[c].landAge-.58)/.45)),mix=this.reducedMotion?0:u*u*(3-2*u);
        const cell=this.cols[c].cells[j+2],wave=Math.sin(this.clock*1.15+c*.9+j*1.3)*mix;
        const phase=(this.clock+c*.53)%3.8,activeRow=Math.floor((this.clock+c*.53)/3.8)%this.config.rows;
        const hop=j!==activeRow?0:Math.sin(Math.min(1,phase/1.3)*Math.PI)*mix;
        cell.emphasis=Math.max(0,cell.emphasis-dt*.6);const punch=cell.emphasis*.09*mix;
        cell.node.setPosition(this.x(c),this.y(j)+wave*Math.min(5,this.cellH*.028)+hop*Math.min(7,this.cellH*.035));
        // Preserve the jewel's silhouette: breathe uniformly, never stretch it.
        const landing=this.reducedMotion?0:Math.max(0,1-this.cols[c].landAge/.55)*Math.sin(this.cols[c].landAge*19)*.055;
        const breath=Math.min(1.085,1+wave*.025+punch+hop*.05+landing);
        const id=this.target[c*this.config.rows+j],coin=id==='coin',pearl=this.config.id==='pearl-palace'&&(id==='pearl'||id==='chip'),pig=this.config.id==='golden-hour'&&id==='bell';
        if(!this.reducedMotion&&(pearl||pig)){const t=this.clock*(pearl?1.0:1.35)+c+j;cell.node.setPosition(this.x(c)+Math.sin(t)*this.cellW*.035*mix,this.y(j)+Math.cos(t*.8)*this.cellH*.038*mix);}
        const turn=(this.clock+c*.8+j*.6)%7.5;
        const tilt=this.reducedMotion?1:coin&&turn<1.6?1-Math.sin(turn/1.6*Math.PI)*.17*mix:1;
        cell.node.setScale(breath*tilt,breath,1);
        cell.node.angle=this.reducedMotion?0:wave*(pearl?3.5:pig?3:this.config.id==='jade-treasury'?2.4:3.2)+hop*Math.sin(phase*7)*1.8;
      }
      return;
    }
    let stopped=0;
    for(let c=0;c<this.cols.length;c++){
      const col=this.cols[c];if(col.stopped){if(!this.reducedMotion)for(let r=0;r<this.config.rows;r++)this.landingCell(c,r);stopped++;continue;}
      col.elapsed+=Math.min(dt,.1);const t=col.elapsed,previousTravel=col.travel;
      if(t<col.brake)col.travel=this.travelAt(t);
      else{
        const braking=t-col.brake,start=this.travelAt(col.brake),overshoot=this.reducedMotion?0:this.motion.overshoot;
        col.travel=brakeTravel(braking,start,col.final+overshoot,this.motion.speed,col.brakeDuration);
        if(braking>=col.brakeDuration){const settle=braking-col.brakeDuration;col.travel=settleTravel(settle,col.final,overshoot,col.settleDuration);if(settle>=col.settleDuration){col.travel=col.final;col.stopped=true;col.landAge=0;this.themeAccent(c,c%this.config.rows);this.sparkle(c,Math.floor(this.config.rows/2),5);this.onStop?.(c);stopped++;}}
      }
      const velocity=Math.abs(col.travel-previousTravel)/Math.max(.001,Math.min(dt,.1));
      this.draw(c,!this.reducedMotion&&!col.stopped&&t>this.motion.pullDuration&&velocity>this.motion.speed*.42);
    }
    if(stopped===this.cols.length){this.running=false;const done=this.resolve;this.resolve=undefined;done?.();}
  }
  private landingCell(c:number,row:number):void{
    const cell=this.cols[c].cells[row+2],p=Math.min(1,Math.max(0,(this.cols[c].landAge-row*.025)/.44));
    // Uniform spring: a short inward dip, rebound, then exact rest.
    const spring=Math.sin(p*Math.PI*3)*Math.pow(1-p,2),scale=1-spring*this.motion.landing;
    cell.node.setPosition(this.x(c),this.y(row)-spring*this.cellH*.035);
    cell.node.setScale(scale,scale,1);cell.node.angle=0;
  }
  private draw(c:number,blurred:boolean):void{
    const col=this.cols[c],base=Math.floor(col.travel),fraction=col.travel-base,strip=this.config.reelStrips[c];
    for(let k=0;k<col.cells.length;k++){
      const j=k-2,cell=col.cells[k],index=base-j;
      cell.node.active=!(j>=0&&j<this.config.rows&&c*this.config.rows+j in this.locked);
      if(cell.logical!==index||cell.blurred!==blurred){
        const row=col.final-index,id=this.target.length&&row>=0&&row<this.config.rows?this.target[c*this.config.rows+row]:this.starting.length&&index<=0&&index> -this.config.rows?this.starting[c*this.config.rows-index]:strip[((index+c*7)%strip.length+strip.length)%strip.length];
        cell.sprite.spriteFrame=blurred?this.blur[id]:this.sharp[id];cell.logical=index;cell.blurred=blurred;
      }
      cell.node.setPosition(this.x(c),this.y(j+fraction));cell.node.setScale(blurred?.97:1,blurred?1.035:1,1);cell.node.angle=0;
    }
  }
  protected onDestroy():void{
    game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.resume,this);
    this.epoch++;this.unscheduleAllCallbacks();
    for(const wait of this.pendingWaits)wait.done();this.pendingWaits.clear();
    for(const col of this.cols)for(const cell of col.cells){Tween.stopAllByTarget(cell.node);Tween.stopAllByTarget(cell.alpha);}
    const done=this.resolve;this.resolve=undefined;done?.();
  }
}
