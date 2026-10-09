import { reelTravel, reelVelocity, brakeTravel, brakeVelocity, fallDuration, fallDelay, smoothStep5 } from './ReelMotion';
import {CoreReelGuide} from './CoreReelGuide';
import { _decorator, Component, Color, Graphics, Label, Mask, Node, Sprite, SpriteFrame, tween, Tween, UIOpacity, Vec3 } from 'cc';
import type { GameConfig, SpinResult } from '../math/types';
import { symbolArt, symbolAtlas } from '../math/GameConfigs';
import { SalonArt, box, opacity, outlined, text } from '../ui/SalonArt';
import { imagePoint, type Box } from '../ui/CabinetGeometry';
const { ccclass } = _decorator;
// Time, width, height, lift (cell-height units). Quintic joins retain zero velocity/acceleration.
const AWARD_POSES = [[0,1,1,0],[.065,1.018,.967,-.006],[.205,1.034,1.045,.013],[.345,.994,.984,-.003],[.49,1.009,1.012,.003],[.70,1,1,0]] as const;
interface Cell { node: Node; sprite: Sprite; alpha:UIOpacity; logical:number; blurred:boolean; emphasis:number; awardAge:number; awardSpark:boolean; awardAccent:boolean; winning:boolean; entryX:number; entryY:number; entryAngle:number; entryScaleX:number; entryScaleY:number; }
interface Column { cells:Cell[]; elapsed:number; travel:number; final:number; brake:number; stopped:boolean; landAge:number; }
interface ReelLight { glow:Node; glowAlpha:UIOpacity; glint:Node; glintAlpha:UIOpacity; trail:Node; trailAlpha:UIOpacity; }
interface Locked { node:Node; amount:Label; }
@ccclass('SalonReels')
export class SalonReels extends Component {
  private cellTapes:{mask:Node;tape:Node;faces:Sprite[]}[]=[];
  private primaryLayer?:Node;
  private primaryLayout?:SpinResult['layout'];
  private revealPrimary=false;
  private shutters:Node[]=[];
  private shutterHeights:number[]=[];
  public setPrimaryLayout(layout:SpinResult['layout'],animate=false):void{this.primaryLayout=layout;this.revealPrimary=animate;this.paintPrimaryBoard();this.revealPrimary=false;}
  private paintPrimaryBoard(grid:readonly string[]=this.target):void{
    if(!this.maskRoot)return;
    const c=this.config,kind=c.primaryKind;
    if(kind==='variable-ways'){
      if(!this.primaryLayer){
        this.primaryLayer=box(this.maskRoot,'Primary rule geometry',0,0,this.width,this.height);
        // Each inactive position belongs to its own reel socket. A column-height
        // shutter joined neighbouring columns into a false second screen.
        for(let x=0;x<c.columns;x++)for(let row=0;row<c.rows;row++){
          const shutter=box(this.primaryLayer,'Closed pearl socket '+x+'-'+row,this.x(x),this.y(row),this.cellW,this.cellH);
          const w=this.cellW,h=this.cellH;
          // Inactive ways remain behind the cabinet glass. A translucent
          // smoked-glass socket preserves the original symbols and depth;
          // the small nacre seal signals that this position is closed.
          const inlay=shutter.addComponent(Graphics);
          inlay.fillColor=new Color(22,24,25,157);inlay.rect(-w/2,-h/2,w,h);inlay.fill();
          inlay.strokeColor=new Color(174,139,86,133);inlay.lineWidth=1;
          inlay.rect(-w/2+1,-h/2+1,w-2,h-2);inlay.stroke();
          inlay.strokeColor=new Color(240,216,177,105);inlay.lineWidth=1;
          inlay.moveTo(-w/2+3,h/2-3);inlay.lineTo(w/2-3,h/2-3);inlay.stroke();
          const seal=box(shutter,'Pearl socket seal',0,0,w*.40,h*.40);
          const pearl=this.art.frame(symbolAtlas(c.id),symbolArt(c.id,'pearl'));
          const face=seal.addComponent(Sprite);face.sizeMode=Sprite.SizeMode.CUSTOM;
          face.spriteFrame=pearl;face.color=new Color(208,199,184,255);
          opacity(seal,158);
          opacity(shutter,255);shutter.active=false;
          this.shutters.push(shutter);
        }
      }
      const heights=this.primaryLayout?.activeRows??Array(c.columns).fill(c.rows);
      for(let x=0;x<c.columns;x++){
        const height=heights[x];
        if(this.shutterHeights[x]===height)continue;
        this.shutterHeights[x]=height;
        for(let row=0;row<c.rows;row++){
          const node=this.shutters[x*c.rows+row],alpha=node.getComponent(UIOpacity)!;
          Tween.stopAllByTarget(alpha);
          const closed=row>=height;
          if(!this.revealPrimary||this.reducedMotion){node.active=closed;alpha.opacity=255;continue;}
          if(closed){node.active=true;alpha.opacity=0;tween(alpha).delay(x*.035+row*.018).to(.28,{opacity:255},{easing:'sineOut'}).start();}
          else if(node.active)tween(alpha).to(.20,{opacity:0},{easing:'sineIn'}).call(()=>{node.active=false;alpha.opacity=255;}).start();
        }
      }
      this.primaryLayer.setSiblingIndex(this.maskRoot.children.length-1);
      return;
    }
    if(this.primaryLayer){this.primaryLayer.active=false;this.primaryLayer.destroy();}
    const layer=box(this.maskRoot,'Primary rule geometry',0,0,this.width,this.height);this.primaryLayer=layer;
    const g=layer.addComponent(Graphics);g.strokeColor=new Color('#F9DD9D');g.lineWidth=2;
    if(kind==='twin-boards'){
      g.lineWidth=12;g.strokeColor=new Color('#765033');g.moveTo(-this.width/2,0);g.lineTo(this.width/2,0);g.stroke();g.lineWidth=3;g.strokeColor=new Color('#FFE0A5');g.stroke();

    }
    if(kind==='poker-reels'){
      g.strokeColor=new Color(230,194,119,72);g.lineWidth=1;
      for(let y=1;y<c.rows;y++){const edge=this.height/2-y*this.cellH;g.moveTo(-this.width/2+12,edge);g.lineTo(this.width/2-12,edge);g.stroke();}
    }
    if(kind==='vertical-lines'){
      const reverse=c.id==='jade-treasury';g.strokeColor=new Color('#F8D18A');
      for(let x=0;x<c.columns;x++){const y=reverse?-this.height/2+12:this.height/2-12,d=reverse?1:-1;g.moveTo(this.x(x)-8,y-d*6);g.lineTo(this.x(x),y+d*6);g.lineTo(this.x(x)+8,y-d*6);g.stroke();}
    }
    if(kind==='collector-grid'&&grid.length){
      const coin=c.symbols.find(s=>!['wild','scatter','bonus'].includes(s.tier))!.id;
      for(let p=0;p<grid.length;p++)if(grid[p]===coin||grid[p]===c.wildId){const x=this.x(Math.floor(p/c.rows)),y=this.y(p%c.rows),r=Math.min(this.cellW,this.cellH)*.42;g.lineWidth=grid[p]===c.wildId?2:1;g.strokeColor=new Color(245,209,137,grid[p]===c.wildId?125:55);g.arc(x,y,r,Math.PI*.15,Math.PI*.85,false);g.stroke();}
    }

  }

  private coreGuide?:CoreReelGuide;
  private art!:SalonArt; private config!:GameConfig; private cols:Column[]=[];
  private sharp:Record<string,SpriteFrame>={};private blur:Record<string,SpriteFrame>={};
  private width=0;private height=0;private cellH=0;private cellW=0;
  private target:readonly string[]=[];private starting:readonly string[]=[];private running=false;private transitioning=false;private clock=0;
  private resolve?:()=>void;public onStop?:(index:number)=>void;public reducedMotion=false;
  private maskRoot!:Node;private reflection!:Node;private reflectionAlpha!:UIOpacity;
  private locks:Locked[]=[];private locked:Readonly<Record<number,number>>={};
  private lights:ReelLight[]=[];private winningEdges?:Graphics;
  private sparks:{node:Node;alpha:UIOpacity;x:number;y:number;vx:number;vy:number;age:number;life:number;curl:number;twist:number}[]=[];
  private themeFX:{node:Node;alpha:UIOpacity;age:number;x:number;y:number}[]=[];private themeCursor=0;
  private readonly speed=16;private readonly brakeDuration=.78;
  private sparkCursor=0;
  private motes:{node:Node;alpha:UIOpacity;phase:number;speed:number;lane:number}[]=[];
  public setup(art:SalonArt,config:GameConfig,rect:Box):void {
    this.art=art;this.config=config;this.width=rect[2];this.height=rect[3];
    this.cellW=this.width/config.columns;this.cellH=this.height/config.rows;
    for(const symbol of config.symbols){const index=symbolArt(config.id,symbol.id)??0;this.sharp[symbol.id]=art.frame(symbolAtlas(config.id),index);this.blur[symbol.id]=art.frame(symbolAtlas(config.id)+'-blur',index);}
    const [x,y]=imagePoint(rect);this.node.setPosition(x,y);
    this.maskRoot=box(this.node,'Exact-reel-aperture',0,0,this.width,this.height);this.maskRoot.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
    // A softly curved lacquer well gives every reel its own depth. The
    // painted cabinet glass remains visible below the translucent finish.
    const well=box(this.maskRoot,'Reel lacquer wells',0,0,this.width,this.height).addComponent(Graphics);
    const lacquer=config.id==='pearl-palace'?[100,119,120]:config.id==='jade-treasury'?[51,79,91]:config.id==='ruby-revel'?[94,52,51]:[125,91,54];
    for(let c=0;c<config.columns;c++)for(let band=0;band<16;band++){
      const t=(band+.5)/16,arc=Math.sin(Math.PI*t),alpha=Math.round(6+arc*43);
      well.fillColor=new Color(lacquer[0],lacquer[1],lacquer[2],alpha);
      well.rect(-this.width/2+c*this.cellW+band*this.cellW/16,-this.height/2,this.cellW/16+.5,this.height);well.fill();
    }
    const guide=box(this.maskRoot,'Core rule guide',0,0,this.width,this.height);this.coreGuide=guide.addComponent(CoreReelGuide);this.coreGuide.setup(config,this.width,this.height,art);
    const rails=box(this.maskRoot,'Glass reel dividers',0,0,this.width,this.height).addComponent(Graphics);
    for(let pass=0;pass<2;pass++){
      const seam=config.id==='pearl-palace'?[92,113,119]:config.id==='jade-treasury'?[125,100,77]:config.id==='ruby-revel'?[123,76,53]:[134,94,51];
      rails.strokeColor=pass?new Color(246,222,174,112):new Color(seam[0],seam[1],seam[2],112);
      rails.lineWidth=pass?1.2:4;
      for(let c=1;c<config.columns;c++){const x=-this.width/2+c*this.cellW;rails.moveTo(x,-this.height/2);rails.lineTo(x,this.height/2);}
      for(let r=1;r<config.rows;r++){const y=this.height/2-r*this.cellH;rails.moveTo(-this.width/2,y);rails.lineTo(this.width/2,y);}rails.stroke();
    }
    // Reserve room for the elastic landing and idle float inside each cell.
    const size=this.symbolSize();
    for(let col=0;col<config.columns;col++){
      const cells:Cell[]=[];
      for(let j=-2;j<config.rows+2;j++){
        const n=art.image(this.maskRoot,'symbols',0,0,size,size,0);
        if(j>=0&&j<config.rows)n.on(Node.EventType.TOUCH_END,()=>{
          if(this.running||this.transitioning||this.reducedMotion)return;
          this.sparkle(col,j,6);this.themeAccent(col,j);cells[j+2].emphasis=.5;
        });
        cells.push({node:n,sprite:n.getComponent(Sprite)!,alpha:opacity(n,255),logical:NaN,blurred:false,emphasis:0,awardAge:Infinity,awardSpark:false,awardAccent:false,winning:false,entryX:0,entryY:0,entryAngle:0,entryScaleX:1,entryScaleY:1});
      }
      this.cols.push({cells,elapsed:0,travel:0,final:0,brake:Infinity,stopped:true,landAge:99});
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
    for(let i=0;i<96;i++){
      const node=art.light(this.maskRoot,3,0,0,30,30,0);
      this.sparks.push({node,alpha:node.getComponent(UIOpacity)!,x:0,y:0,vx:0,vy:0,age:1,life:.7,curl:0,twist:0});
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
  /** Dense five-row reels need a larger readable mark, with headroom for landing bounce. */
  private symbolSize():number{return Math.min(this.cellW,this.cellH)*(this.config.rows>=5?.98:this.config.rows===4?.94:.91);}
  private x(col:number):number{return -this.width/2+(col+.5)*this.cellW;}
  private y(row:number):number{return this.height/2-(row+.5)*this.cellH;}
  public show(grid:readonly string[]):void {
    this.coreGuide?.highlight([]);
    for(const reel of this.cellTapes)if(reel){reel.mask.active=false;Tween.stopAllByTarget(reel.tape);}
    this.paintPrimaryBoard(grid);
    this.target=grid;this.running=false;this.transitioning=false;
    for(let c=0;c<this.cols.length;c++){
      const col=this.cols[c];col.travel=col.final=100;col.stopped=true;
      for(const cell of col.cells){cell.logical=NaN;cell.emphasis=0;cell.awardAge=Infinity;cell.winning=false;Tween.stopAllByTarget(cell.node);Tween.stopAllByTarget(cell.alpha);cell.alpha.opacity=255;}
      this.draw(c,false);
    }
  }
  public begin():void {
    this.coreGuide?.highlight([]);
    this.winningEdges?.clear();this.primaryLayout=undefined;this.paintPrimaryBoard();this.starting=this.target;this.running=true;this.transitioning=false;this.target=[];
    for(const [c,col] of this.cols.entries()){col.elapsed=0;col.travel=0;col.brake=Infinity;col.stopped=false;col.final=100000;col.landAge=99;
      for(const [k,cell] of col.cells.entries()){cell.entryX=cell.node.position.x-this.x(c);cell.entryY=cell.node.position.y-this.y(k-2);cell.entryAngle=cell.node.angle;cell.entryScaleX=cell.node.scale.x;cell.entryScaleY=cell.node.scale.y;cell.logical=NaN;cell.emphasis=0;cell.awardAge=Infinity;cell.winning=false;cell.alpha.opacity=255;Tween.stopAllByTarget(cell.node);Tween.stopAllByTarget(cell.alpha);}
    }
  }
  public finish(result:SpinResult):Promise<void>{return this.finishGrid(result.grid).then(()=>{this.setPrimaryLayout(result.layout,true);this.paintPrimaryBoard(result.grid);});}
  public finishGrid(grid:readonly string[],quick=false):Promise<void>{
    if(!this.running)this.begin();this.target=grid;
    // Quick mode changes HOLD duration, never velocity halfway through a spin.
    for(let c=0;c<this.cols.length;c++){
      const col=this.cols[c];col.brake=Math.max(col.elapsed+.20,(quick?.44:.94)+c*.14);
      col.final=Math.ceil(this.travelAt(col.brake)+this.speed*this.brakeDuration*.5);
    }
    return new Promise(resolve=>{this.resolve=resolve;});
  }
  private travelAt(t:number):number{return reelTravel(t,this.speed,.32);}
  private themeAccent(column:number,row:number):void{
    if(this.reducedMotion)return;const fx=this.themeFX[this.themeCursor++%this.themeFX.length];fx.age=0;fx.x=this.x(column);fx.y=this.y(row);fx.node.setPosition(fx.x,fx.y);fx.alpha.opacity=170;
  }
  private sparkle(column:number,row:number,count:number):void{
    for(let i=0;i<count;i++){
      const spark=this.sparks[this.sparkCursor++%this.sparks.length],angle=i*Math.PI*2/count+this.clock;
      spark.x=this.x(column);spark.y=this.y(row);
      spark.vx=Math.cos(angle)*this.cellW*.42;spark.vy=Math.sin(angle)*this.cellH*.42+30;
      spark.age=0;spark.life=.7;spark.curl=0;spark.twist=0;spark.alpha.opacity=0;spark.node.setScale(1,1,1);spark.node.angle=0;spark.node.setPosition(spark.x,spark.y);
    }
  }
  /** Reuses the fixed sparkle pool; no nodes or vectors are created per frame. */
  private dissolve(column:number,row:number,delay:number):void{
    if(this.reducedMotion)return;
    this.themeAccent(column,row);
    const theme=['golden-hour','jade-treasury','pearl-palace','ruby-revel'].indexOf(this.config.id);
    for(let i=0;i<3;i++){
      const spark=this.sparks[this.sparkCursor++%this.sparks.length],angle=i*Math.PI*2/3+column*.39+row*.27;
      spark.x=this.x(column);spark.y=this.y(row);
      spark.vx=Math.cos(angle)*this.cellW*.46;spark.vy=Math.sin(angle)*this.cellH*.3+this.cellH*.65;
      spark.age=-delay;spark.life=.58+(i%2)*.16;spark.curl=this.cellW*(theme%2?-.22:.22);spark.twist=angle;
      spark.alpha.opacity=0;spark.node.setScale(1,1,1);spark.node.angle=0;spark.node.setPosition(spark.x,spark.y);
    }
  }
  /** Winning cells answer independently of reel landing; text and untouched cells never move. */
  private awardCell(c:number,row:number,dt:number):void{
    const cell=this.cols[c].cells[row+2];
    if(this.reducedMotion){cell.awardAge=Infinity;cell.emphasis=0;return;}
    if(!Number.isFinite(cell.awardAge))return;
    const before=cell.awardAge;cell.awardAge+=Math.max(0,Math.min(dt,.1));
    const age=cell.awardAge;if(age<0)return;
    if(before<.065&&age>=.065&&cell.awardSpark){
      this.sparkle(c,row,3);
      if(cell.awardAccent)this.themeAccent(c,row);
    }
    if(age>=.70){cell.awardAge=Infinity;cell.emphasis=0;return;}
    let k=0;while(k<AWARD_POSES.length-2&&age>AWARD_POSES[k+1][0])k++;
    const a=AWARD_POSES[k],b=AWARD_POSES[k+1],t=smoothStep5((age-a[0])/(b[0]-a[0]));
    const sx=a[1]+(b[1]-a[1])*t,sy=a[2]+(b[2]-a[2])*t,lift=a[3]+(b[3]-a[3])*t;
    const blend=age<.065?smoothStep5(age/.065):age>.49?1-smoothStep5((age-.49)/.21):1;
    const n=cell.node,baseX=this.x(c),baseY=this.y(row);
    // Suppress competing idle/landing motion smoothly instead of stacking scale overshoots.
    n.setPosition(baseX+(n.position.x-baseX)*(1-blend),baseY+(n.position.y-baseY)*(1-blend)+lift*this.cellH);
    n.setScale(1+(n.scale.x-1)*(1-blend)+sx-1,1+(n.scale.y-1)*(1-blend)+sy-1,1);
    n.angle*=1-blend;cell.emphasis=blend*.65;
  }
  private prepareAward(positions:readonly number[]):void{
    const chosen=new Set(positions),columns=new Set<number>();let sparkCount=0;
    for(let c=0;c<this.cols.length;c++)for(let r=0;r<this.config.rows;r++){
      const cell=this.cols[c].cells[r+2],selected=chosen.has(c*this.config.rows+r);
      cell.winning=selected;cell.emphasis=0;
      cell.awardAge=selected&&!this.transitioning&&!this.reducedMotion?-(c*.032+(r%3)*.013):Infinity;
      cell.awardSpark=selected&&sparkCount++<12;cell.awardAccent=selected&&!columns.has(c);
      if(selected)columns.add(c);
    }
  }
  public highlight(positions:readonly number[]):void{
    positions=Array.from(new Set(positions.filter(p=>Number.isInteger(p)&&p>=0&&p<this.config.columns*this.config.rows)));
    this.prepareAward(positions);
    this.coreGuide?.highlight(positions);
    // Keep the ornate frame beneath the symbol: its jewel corners must never read as extra reel art.
    if(this.primaryLayer?.isValid)this.primaryLayer.setSiblingIndex(this.maskRoot.children.length-1);
    this.winningEdges?.clear(); // The rule guide owns the single material highlight.

  }
  public lockCoins(values:Readonly<Record<number,number>>,symbolId=this.config.bonusId??this.config.wildId):void{
    const previous=this.locked;this.locked=values;
    for(let i=0;i<this.locks.length;i++){
      const lock=this.locks[i];lock.node.active=i in values;
      if(lock.node.active){lock.amount.string=String(values[i]);const face=lock.node.children[0]?.getComponent(Sprite);if(face)face.spriteFrame=this.sharp[symbolId];if(!(i in previous)&&!this.reducedMotion){lock.node.setScale(.72,.72,1);tween(lock.node).to(.34,{scale:new Vec3(1,1,1)},{easing:'backOut'}).start();}}
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
    if(this.reducedMotion||!cleared.size){this.show(grid);return;}
    this.transitioning=true;
    this.highlight(removed);
    let clearAt=0;
    for(const position of removed){
      const col=Math.floor(position/this.config.rows),row=position%this.config.rows,cell=this.cols[col].cells[row+2],delay=(col%3)*.014+(row%3)*.010;
      this.dissolve(col,row,delay+.075);
      Tween.stopAllByTarget(cell.node);Tween.stopAllByTarget(cell.alpha);
      tween(cell.node).delay(delay).to(.075,{scale:new Vec3(1.045,1.045,1)},{easing:'sineOut'}).to(.165,{scale:new Vec3(.34,.34,1),position:new Vec3(this.x(col),this.y(row)+this.cellH*.045,0)},{easing:'sineIn'}).start();
      tween(cell.alpha).delay(delay+.06).to(.18,{opacity:0},{easing:'sineInOut'}).start();
      clearAt=Math.max(clearAt,delay+.24);
    }
    await this.wait(clearAt+.010);if(!this.isValid)return;
    this.show(grid);this.transitioning=true;
    let finishAt=0;
    for(let c=0;c<this.cols.length;c++){
      const survivors=sources[c],refill=this.config.rows-survivors.length;
      for(let r=0;r<this.config.rows;r++){
        const cell=this.cols[c].cells[r+2],source=r<refill?r-refill:survivors[r-refill];
        const distance=Math.max(0,r-source),delay=fallDelay(c,r),duration=fallDuration(distance);
        const panelY=0;
        cell.node.setPosition(this.x(c),this.y(source)-panelY);cell.node.setScale(1,1,1);cell.node.angle=0;
        if(!distance){cell.node.setPosition(this.x(c),this.y(r)-panelY);continue;}
        cell.alpha.opacity=r<refill?0:255;
        tween(cell.alpha).delay(delay).to(.10,{opacity:255},{easing:'sineOut'}).start();
        const targetY=this.y(r)-panelY;
        // Position accelerates continuously; squash/stretch runs alongside it, never
        // splitting the fall into velocity-resetting position tweens.
        const stretch=1+Math.min(.065,.035+Math.sqrt(distance)*.012);
        const rebound=this.cellH*Math.min(.017,.009+Math.sqrt(distance)*.003);
        const impact=.065,lift=.09,settle=.12;
        tween(cell.node).delay(delay).parallel(
          tween(cell.node).to(duration,{position:new Vec3(this.x(c),targetY,0)},{easing:'quadIn'}),
          tween(cell.node).to(duration*.62,{scale:new Vec3(1-(stretch-1)*.55,stretch,1)},{easing:'sineIn'})
            .to(duration*.38,{scale:new Vec3(1,1,1)},{easing:'sineInOut'})
        )
          .to(impact,{position:new Vec3(this.x(c),targetY-this.cellH*.009,0),scale:new Vec3(1.055,.94,1)},{easing:'sineOut'})
          .call(()=>{if(this.isValid&&r===this.config.rows-1)this.sparkle(c,r,2);})
          .to(lift,{position:new Vec3(this.x(c),targetY+rebound,0),scale:new Vec3(.987,1.025,1)},{easing:'quadOut'})
          .to(settle,{position:new Vec3(this.x(c),targetY,0),scale:new Vec3(1,1,1)},{easing:'sineInOut'}).start();
        finishAt=Math.max(finishAt,delay+duration+impact+lift+settle);
      }
    }
    await this.wait(finishAt+.016);if(!this.isValid)return;
    // Exact resting transforms also cover low frame rates and interrupted last tween ticks.
    for(let c=0;c<this.cols.length;c++)for(let r=0;r<this.config.rows;r++){
      const cell=this.cols[c].cells[r+2];Tween.stopAllByTarget(cell.node);Tween.stopAllByTarget(cell.alpha);
      cell.node.setPosition(this.x(c),this.y(r));cell.node.setScale(1,1,1);cell.node.angle=0;cell.alpha.opacity=255;
    }
    for(const col of this.cols)col.landAge=.58;
    this.transitioning=false;
  }
  public async transformTo(grid:readonly string[],focus:readonly number[]=[]):Promise<void>{
    if(grid.length!==this.config.columns*this.config.rows)throw new Error('Invalid transformation grid');
    const changed=grid.flatMap((id,i)=>id!==this.target[i]?[i]:[]);
    if(this.reducedMotion){this.show(grid);return;}
    this.transitioning=true;
    for(const p of changed){const cell=this.cols[Math.floor(p/this.config.rows)].cells[p%this.config.rows+2];Tween.stopAllByTarget(cell.node);tween(cell.node).to(.15,{scale:new Vec3(.80,.80,1)},{easing:'sineIn'}).start();tween(cell.alpha).to(.15,{opacity:90}).start();}
    await this.wait(.16);if(!this.isValid)return;
    this.show(grid);this.transitioning=true;
    for(const p of changed){const col=Math.floor(p/this.config.rows),row=p%this.config.rows,cell=this.cols[col].cells[row+2];cell.node.setScale(.80,.80,1);cell.alpha.opacity=90;tween(cell.node).to(.20,{scale:new Vec3(1.025,1.025,1)},{easing:'sineOut'}).to(.12,{scale:new Vec3(1,1,1)},{easing:'sineInOut'}).start();tween(cell.alpha).to(.2,{opacity:255}).start();this.sparkle(col,row,2);}
    this.highlight(focus.length?focus:changed);await this.wait(.36);
    // Transformation focus is an action cue, not proof of a winning combination.
    if(this.isValid){for(const p of changed){const cell=this.cols[Math.floor(p/this.config.rows)].cells[p%this.config.rows+2];Tween.stopAllByTarget(cell.node);Tween.stopAllByTarget(cell.alpha);cell.node.setScale(1,1,1);cell.node.angle=0;cell.alpha.opacity=255;}this.highlight([]);this.transitioning=false;}
  }
  /** Cache each aperture and tape; repeated collector respins allocate no new scene nodes. */
  public async respinCells(grid:readonly string[],held:readonly number[]=[]):Promise<void>{
    if(this.reducedMotion){this.show(grid);return;}
    this.show(this.target);this.transitioning=true;const fixed=new Set(held),steps=7;
    for(let p=0;p<grid.length;p++)if(!fixed.has(p)){
      const x=Math.floor(p/this.config.rows),y=p%this.config.rows,cell=this.cols[x].cells[y+2];cell.alpha.opacity=0;
      let reel=this.cellTapes[p];
      if(!reel){
        const mask=box(this.maskRoot,'Cached cell aperture '+p,this.x(x),this.y(y),this.cellW,this.cellH);mask.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
        const tape=box(mask,'Reusable symbol tape',0,0,this.cellW,this.cellH),faces:Sprite[]=[];
        for(let k=0;k<=steps;k++)faces.push(this.art.image(tape,symbolAtlas(this.config.id),0,k*this.cellH,this.symbolSize(),this.symbolSize(),0).getComponent(Sprite)!);
        reel=this.cellTapes[p]={mask,tape,faces};
      }
      reel.mask.active=true;reel.tape.setPosition(0,0);const strip=this.config.reelStrips[x];
      for(let k=0;k<=steps;k++){const id=k===0?this.target[p]:k===steps?grid[p]:strip[(p*7+k*3)%strip.length];reel.faces[k].spriteFrame=this.sharp[id];}
      tween(reel.tape).delay(x*.04+(y%3)*.012).to(.94,{position:new Vec3(0,-steps*this.cellH,0)},{easing:smoothStep5}).start();
    }
    if(this.primaryLayer?.isValid)this.primaryLayer.setSiblingIndex(this.maskRoot.children.length-1);
    await this.wait(.99+(this.config.columns-1)*.04);if(!this.isValid)return;
    this.show(grid);
  }
  /** Ease actual source-to-destination travel; deformation stays inside the symbol margin. */
  private glideSymbol(node:Node,x:number,y:number,duration=.42):void{
    const dx=Math.abs(x-node.position.x),dy=Math.abs(y-node.position.y),length=dx+dy;
    const ax=length?dx/length:0,ay=length?dy/length:0;
    const stretch=new Vec3(1+.048*ax-.024*ay,1+.048*ay-.024*ax,1);
    const contact=new Vec3(1-.018*ax+.018*ay,1-.018*ay+.018*ax,1);
    tween(node).parallel(
      tween(node).to(duration,{position:new Vec3(x,y,0)},{easing:smoothStep5}),
      tween(node).to(duration*.46,{scale:stretch},{easing:'sineInOut'})
        .to(duration*.54,{scale:contact},{easing:'sineInOut'})
    ).to(.11,{scale:new Vec3(1,1,1)},{easing:'sineInOut'}).start();
  }
  public async moveSymbols(grid:readonly string[],moves:readonly {from:number;to:number}[],held:readonly number[]=[]):Promise<void>{
    if(this.reducedMotion){this.show(grid);return;}
    const old=Array.from(this.target),fixed=new Set(held.filter(p=>old[p]===grid[p]&&!moves.some(m=>m.to===p||m.from===p))),dest=new Set(moves.map(m=>m.to)),nodes:Node[]=[];
    this.show(old);this.transitioning=true;
    for(let p=0;p<old.length;p++)if(!fixed.has(p))this.cols[Math.floor(p/this.config.rows)].cells[p%this.config.rows+2].alpha.opacity=0;
    for(const m of moves){const ghost=this.art.image(this.maskRoot,symbolAtlas(this.config.id),this.x(Math.floor(m.from/this.config.rows)),this.y(m.from%this.config.rows),this.symbolSize(),this.symbolSize(),symbolArt(this.config.id,old[m.from]));nodes.push(ghost);this.glideSymbol(ghost,this.x(Math.floor(m.to/this.config.rows)),this.y(m.to%this.config.rows));}
    const horizontal=moves.some(m=>Math.floor(m.from/this.config.rows)!==Math.floor(m.to/this.config.rows));
    // New symbols enter opposite to the actual movement, including upward refills.
    const direction=moves.find(m=>m.from!==m.to);
    const incomingX=horizontal&&direction?-Math.sign(Math.floor(direction.to/this.config.rows)-Math.floor(direction.from/this.config.rows))*this.cellW:0;
    const incomingY=!horizontal&&direction?Math.sign(direction.to%this.config.rows-direction.from%this.config.rows)*this.cellH:0;
    for(let p=0;p<grid.length;p++)if(!dest.has(p)&&!fixed.has(p)){
      const x=this.x(Math.floor(p/this.config.rows)),y=this.y(p%this.config.rows),ghost=this.art.image(this.maskRoot,symbolAtlas(this.config.id),x+incomingX,y+incomingY,this.symbolSize(),this.symbolSize(),symbolArt(this.config.id,grid[p]));nodes.push(ghost);const alpha=opacity(ghost,0);tween(alpha).delay(.025).to(.20,{opacity:255},{easing:'sineOut'}).start();this.glideSymbol(ghost,x,y);
    }
    await this.wait(.546);if(!this.isValid)return;nodes.forEach(n=>n.destroy());this.show(grid);
  }
  public async riseTo(grid:readonly string[],removed:readonly number[]):Promise<void>{
    const cleared=new Set(removed),moves:{from:number;to:number}[]=[];
    for(let x=0;x<this.config.columns;x++){let y=0;for(let r=0;r<this.config.rows;r++)if(!cleared.has(x*this.config.rows+r)){const from=x*this.config.rows+r,to=x*this.config.rows+y++;if(this.target[from]!==grid[to])throw new Error('Invalid rising survivor');moves.push({from,to});}}
    if(this.reducedMotion){this.show(grid);return;}this.show(this.target);this.transitioning=true;
    const nodes:Node[]=[];for(const col of this.cols)for(const cell of col.cells)cell.alpha.opacity=0;
    const destinations=new Set(moves.map(m=>m.to));
    for(let p=0;p<grid.length;p++){const m=moves.find(m=>m.to===p),x=Math.floor(p/this.config.rows),y=p%this.config.rows,source=m?m.from%this.config.rows:y+this.config.rows;
      const n=this.art.image(this.maskRoot,symbolAtlas(this.config.id),this.x(x),this.y(source),this.symbolSize(),this.symbolSize(),symbolArt(this.config.id,grid[p]));nodes.push(n);tween(n).delay(x*.035).to(.48,{position:new Vec3(this.x(x),this.y(y),0)},{easing:'sineInOut'}).start();}
    await this.wait(.5+(this.config.columns-1)*.035);if(!this.isValid)return;nodes.forEach(n=>n.destroy());this.show(grid);
  }
  public async expandColumn(column:number):Promise<void>{
    if(this.reducedMotion)return;
    const light=this.art.light(this.maskRoot,1,this.x(column),0,this.cellW*1.5,this.height,180);
    light.setScale(.6,.1,1);tween(light).to(.35,{scale:new Vec3(1,1,1)},{easing:'backOut'}).start();
    this.highlight(Array.from({length:this.config.rows},(_,r)=>column*this.config.rows+r));
    await this.wait(this.reducedMotion?.04:.65);if(light.isValid)light.destroy();
    if(this.isValid)this.highlight([]); // Expansion is an action cue; the caller highlights real wins.
  }
  private wait(seconds:number):Promise<void>{return new Promise(resolve=>this.scheduleOnce(resolve,seconds));}
  protected update(dt:number):void{
    if(this.coreGuide){this.coreGuide.busy=this.running||this.transitioning;this.coreGuide.reduced=this.reducedMotion;}
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
    for(const spark of this.sparks){
      if(this.reducedMotion||spark.age>=spark.life){spark.alpha.opacity=0;continue;}
      spark.age+=Math.min(dt,.1);if(spark.age<0){spark.alpha.opacity=0;continue;}const t=spark.age,p=Math.min(1,t/spark.life);
      spark.node.setPosition(spark.x+spark.vx*t+Math.sin(p*Math.PI*2+spark.twist)*spark.curl*p,spark.y+spark.vy*t-120*t*t);
      spark.node.setScale(1-p*.7,1-p*.7,1);spark.node.angle=t*140;
      spark.alpha.opacity=220*(1-p)*(1-p);
    }
    if(!this.reducedMotion){const sweep=(this.clock%4.6)/4.6,eased=sweep*sweep*(3-2*sweep);this.reflection.setPosition(-this.width*1.25+eased*this.width*2.5,Math.sin(sweep*Math.PI)*this.height*.09);this.reflectionAlpha.opacity=Math.pow(Math.sin(sweep*Math.PI),2)*(this.running?56:76);}
    else this.reflectionAlpha.opacity=0;
    for(let c=0;c<this.lights.length;c++){
      const fx=this.lights[c],col=this.cols[c];col.landAge+=Math.min(dt,.1);
      if(this.reducedMotion){fx.glowAlpha.opacity=fx.glintAlpha.opacity=fx.trailAlpha.opacity=0;continue;}
      // One localized glass reflection visits the reels in sequence. The
      // remaining symbols hold still like objects on a physical reel drum.
      const lap=this.clock/1.75,visit=(lap+c*.035)%this.cols.length;
      const distance=Math.min(Math.abs(visit-c),this.cols.length-Math.abs(visit-c));
      const pulse=Math.pow(Math.max(0,1-distance/.72),2);
      const row=Math.floor(lap/this.cols.length+c*.37)%this.config.rows;
      const land=Math.max(0,1-col.landAge/.65);
      const y=this.y(row),emphasis=col.cells[row+2].emphasis;
      fx.glow.setPosition(this.x(c),y);fx.glow.setScale(1+pulse*.10,1+pulse*.10,1);
      fx.glowAlpha.opacity=this.running?(col.stopped?land*190:0):pulse*64+emphasis*70;
      fx.glint.setPosition(this.x(c)+this.cellW*.18,y+this.cellH*.12);
      fx.glintAlpha.opacity=this.running?land*180:pulse*135;
      const flow=(this.clock*1.65+c*.19)%1;
      fx.trail.setPosition(this.x(c)+this.cellW*.21,this.height*.75-flow*this.height*1.5);
      fx.trailAlpha.opacity=this.running&&!col.stopped?Math.sin(flow*Math.PI)*165:0;
    }
    if(this.transitioning)return;
    if(!this.running){
      for(let c=0;c<this.cols.length;c++)for(let j=0;j<this.config.rows;j++){
        if(!this.reducedMotion&&this.cols[c].landAge<.58){this.landingCell(c,j);this.awardCell(c,j,dt);continue;}
        // Blend out of the exact spring rest before resuming independent idle motion.
        const u=Math.min(1,Math.max(0,(this.cols[c].landAge-.58)/.45)),mix=this.reducedMotion?0:u*u*(3-2*u);
        const cell=this.cols[c].cells[j+2];
        cell.emphasis=Math.max(0,cell.emphasis-dt*.6);
        // Do not animate every picture at once. The staggered optical glint
        // above supplies idle life without making the reel look detached.
        cell.node.setPosition(this.x(c),this.y(j));
        cell.node.setScale(1,1,1);
        cell.node.angle=0;
        this.awardCell(c,j,dt);
      }
      return;
    }
    let stopped=0;
    for(let c=0;c<this.cols.length;c++){
      const col=this.cols[c];if(col.stopped){if(!this.reducedMotion)for(let r=0;r<this.config.rows;r++)this.landingCell(c,r);stopped++;continue;}
      col.elapsed+=Math.min(dt,.1);const t=col.elapsed;
      const ramp=.32,overrun=.035,settle=.22;
      let velocity=reelVelocity(t,this.speed,ramp);
      if(t<col.brake)col.travel=this.travelAt(t);
      else{
        const u=Math.min(1,(t-col.brake)/this.brakeDuration),start=this.travelAt(col.brake),end=col.final+overrun;
        col.travel=brakeTravel(u,start,end,this.speed,this.brakeDuration);
        velocity=brakeVelocity(u,start,end,this.speed,this.brakeDuration);
        if(u>=1){const b=Math.min(1,(t-col.brake-this.brakeDuration)/settle);col.travel=col.final+overrun*(1-b*b*(3-2*b));velocity=0;if(b>=1){col.travel=col.final;col.stopped=true;col.landAge=0;this.themeAccent(c,c%this.config.rows);this.onStop?.(c);stopped++;}}
      }
      const motion=col.stopped?0:Math.min(1,Math.max(0,velocity/this.speed));
      this.draw(c,false,motion);
    }
    if(stopped===this.cols.length){this.running=false;const done=this.resolve;this.resolve=undefined;done?.();}
  }
  private landingCell(c:number,row:number):void{
    const cell=this.cols[c].cells[row+2],p=Math.min(1,this.cols[c].landAge/.58);
    // Uniform spring: a short inward dip, rebound, then exact rest.
    const spring=Math.sin(p*Math.PI*3)*Math.pow(1-p,2),scale=1-spring*(this.config.id==='golden-hour'?.045:this.config.id==='pearl-palace'?.065:.055);
    cell.node.setPosition(this.x(c),this.y(row)-spring*this.cellH*.035);
    cell.node.setScale(scale,scale,1);cell.node.angle=0;
  }
  private draw(c:number,blurred:boolean,motion=0):void{
    const col=this.cols[c],base=Math.floor(col.travel),fraction=col.travel-base,strip=this.config.reelStrips[c];
    for(let k=0;k<col.cells.length;k++){
      const j=k-2,cell=col.cells[k],index=base-j;
      cell.node.active=!(j>=0&&j<this.config.rows&&c*this.config.rows+j in this.locked);
      if(cell.logical!==index||cell.blurred!==blurred){
        const row=col.final-index,id=this.target.length&&row>=0&&row<this.config.rows?this.target[c*this.config.rows+row]:this.starting.length&&index<=0&&index> -this.config.rows?this.starting[c*this.config.rows-index]:strip[((index+c*7)%strip.length+strip.length)%strip.length];
        cell.sprite.spriteFrame=this.sharp[id];cell.logical=index;cell.blurred=blurred;
      }
      const entry=this.running?Math.pow(Math.max(0,1-col.elapsed/.26),3):0;
      const positionY=this.y(j+fraction);
      cell.node.setPosition(this.x(c)+cell.entryX*entry,positionY+cell.entryY*entry);
      // The passing faces foreshorten near the lips of the glass. The same
      // sprite stays on its continuous reel trajectory; nothing swaps or
      // flips at the stop, and the aperture clips its full travel.
      const edge=Math.min(1,Math.abs(positionY)/(this.height*.5));
      const curve=1-edge*edge;
      const faceX=1-motion*(1-curve)*.075;
      const faceY=1-motion*(1-curve)*.23;
      cell.node.setScale(faceX+(cell.entryScaleX-1)*entry,faceY+(cell.entryScaleY-1)*entry,1);
      cell.alpha.opacity=255-Math.round(motion*(1-curve)*45);
      cell.node.angle=cell.entryAngle*entry;
    }
  }
  protected onDestroy():void{this.resolve?.();this.resolve=undefined;}
}
