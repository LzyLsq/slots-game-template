import { _decorator, Component, Node, UITransform, UIOpacity, Sprite, SpriteFrame, ImageAsset, Texture2D, Rect, Color, game, Game } from 'cc';
const { ccclass } = _decorator;
// Replaced with the project's own profile by install.mjs. No game-state dependency.
const THEME = {"name":"Caravan lantern","colors":["#FFD081","#EDE4B5","#DDAC7E"],"shape":2,"period":7.8,"sway":12};
type Particle = { n: Node; alpha: UIOpacity; x: number; y: number; phase: number; kind: number; side: number; age: number; column: number };
type Bounds = { x: number; y: number; w: number; h: number };
let frames: SpriteFrame[] | undefined;

/** One 256×64 RGBA atlas, shared by every room; also works in native Cocos. */
function atlas(): SpriteFrame[] {
  if (frames) return frames;
  const data=new Uint8Array(256*64*4);
  for(let i=0;i<4;i++)for(let y=0;y<64;y++)for(let x=0;x<64;x++) {
    const dx=x-31.5,dy=y-31.5,r=Math.hypot(dx,dy);
    const glow=Math.max(0,1-r/29)**3*.38;
    const rotatedX=dx*.955-dy*.296,rotatedY=dx*.296+dy*.955;
    const edge=i===0?Math.abs(dx*dy)/18+Math.max(Math.abs(dx),Math.abs(dy))/22
      :i===1?Math.hypot(rotatedX/13,rotatedY/20)
      :i===2?Math.abs(dx)/15+Math.abs(dy)/21:Math.abs(r-19)/1.2;
    let alpha=Math.max(glow,Math.max(0,Math.min(1,(1.03-edge)*12)));
    if(i===3)alpha=Math.max(alpha,Math.max(0,Math.min(1,4-Math.hypot(dx+6,dy+7))));
    const index=(y*256+i*64+x)*4;data[index]=data[index+1]=data[index+2]=255;data[index+3]=Math.round(alpha*255);
  }
  const texture=new Texture2D();texture.image=new ImageAsset({_data:data,_compressed:false,width:256,height:64,format:Texture2D.PixelFormat.RGBA8888});
  // Raw RGBA is already a shared atlas. DynamicAtlas uses the DOM-image upload
  // path in WebGL, which cannot accept this typed-array ImageAsset.
  frames=Array.from({length:4},(_,i)=>{const frame=new SpriteFrame();frame.texture=texture;frame.rect=new Rect(i*64,0,64,64);frame.packable=false;return frame;});
  return frames;
}

/** Fixed sprite pools: room glow, travelling rim highlights and actual stop accents. */
@ccclass('ThemeFestivity')
export class ThemeFestivity extends Component {
  public reducedMotion=false;
  private pool:Particle[]=[];
  private time=0;
  private cheer=0;
  private hidden=false;
  private suppressed=false;
  private rim?:Bounds;
  private period=THEME.period;
  static hall(parent:Node,width:number,height:number,reduced=false,x=0,y=0):ThemeFestivity {
    const fx=this.attach(parent,reduced,x,y);fx.hallPool(width,height);return fx;
  }
  static cabinet(parent:Node,x:number,y:number,width:number,height:number,columns:number,reduced=false):ThemeFestivity {
    const fx=this.attach(parent,reduced,0,0);fx.cabinetPool({x,y,w:width/2,h:height/2},columns);return fx;
  }
  private static attach(parent:Node,reduced:boolean,x:number,y:number):ThemeFestivity {
    const node=new Node(`${THEME.name} living trim`);node.layer=parent.layer;parent.addChild(node);node.setPosition(x,y);
    node.addComponent(UITransform).setContentSize(0,0);const fx=node.addComponent(ThemeFestivity);
    fx.reducedMotion=reduced||(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false);return fx;
  }
  protected onLoad():void {game.on(Game.EVENT_HIDE,this.hide,this);game.on(Game.EVENT_SHOW,this.show,this);}
  protected onDestroy():void {game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.show,this);this.pool.length=0;}
  private hide():void {this.hidden=true;this.cheer=0;for(const p of this.pool)p.age=1;this.suppress();}
  private show():void {this.hidden=false;}
  private suppress():void {for(const p of this.pool)p.alpha.opacity=0;this.suppressed=true;}
  private particle(x:number,y:number,size:number,kind:number,phase:number,side=0,column=-1):void {
    const n=new Node('Non-interactive themed light');n.layer=this.node.layer;this.node.addChild(n);n.setPosition(x,y);
    n.addComponent(UITransform).setContentSize(size,size);const s=n.addComponent(Sprite);s.spriteFrame=atlas()[kind===1?THEME.shape:0];s.color=new Color(THEME.colors[((Math.floor(phase*17)%THEME.colors.length)+THEME.colors.length)%THEME.colors.length]);
    const alpha=n.addComponent(UIOpacity);alpha.opacity=0;this.pool.push({n,alpha,x,y,phase,kind,side,age:1,column});
  }
  private hallPool(width:number,height:number):void {
    for(const side of [-1,1]) {
      this.particle(side*(width*.5-70),height*.15,124,4,side>0?.6:.1,side);
      for(let i=0;i<6;i++)this.particle(side*(width*.5-42),-height*.30,24+i%3*8,1,i/6+(side>0?.08:0),side);
      for(let i=0;i<4;i++)this.particle(side*(width*.5-63),height*(.28-i*.18),30,0,i/4+(side>0?.12:0),side);
    }
    this.rim={x:0,y:0,w:width*.5-45,h:height*.31};
    for(let i=0;i<6;i++)this.particle(0,0,i%2?20:34,2,i/3-(i%2)*.014);
  }
  private cabinetPool(b:Bounds,columns:number):void {
    // Small sprites stay entirely outside the screen aperture, including their glow.
    this.rim={x:b.x,y:b.y,w:b.w+28,h:b.h+28};this.period*=.86;
    for(let i=0;i<6;i++)this.particle(0,0,i%2?19:32,2,i/3-(i%2)*.018);
    for(const side of [-1,1]) {
      for(let i=0;i<5;i++)this.particle(b.x+side*(b.w+42),b.y-b.h+b.h*.4*i,28,0,i/5+(side>0?.1:0),side);
      for(let i=0;i<4;i++)this.particle(b.x+side*(b.w+56),b.y-b.h,22+i%2*8,1,i/4+(side>0?.1:0),side);
    }
    for(let c=0;c<Math.max(1,Math.min(8,columns));c++)for(const side of [-1,1])this.particle(b.x-b.w+(c+.5)*2*b.w/columns,b.y+side*(b.h+25),22,3,c*.07,side,c);
  }
  public land(column:number):void {if(this.hidden||this.reducedMotion)return;for(const p of this.pool)if(p.kind===3&&p.column===column)p.age=0;}
  public celebrate(tier=0):void {if(this.hidden||this.reducedMotion)return;this.cheer=1+Math.max(0,Math.min(3,tier))*.15;for(const p of this.pool)if(p.kind===3)p.age=-p.phase;}
  protected update(dt:number):void {
    if(this.hidden||this.reducedMotion){if(!this.suppressed)this.suppress();return;}
    this.suppressed=false;const step=Math.max(0,Math.min(.05,dt));this.time=(this.time+step)%10000;this.cheer=Math.max(0,this.cheer-step*.5);
    const b=this.rim;if(!b)return;
    for(const p of this.pool) {
      let opacity=0,scale=1;const wave=.5+.5*Math.sin(this.time*1.3+p.phase*Math.PI*2);
      if(p.kind===0) {const flash=Math.pow(Math.max(0,Math.cos((this.time/3.9-p.phase)*Math.PI*2)),5);opacity=28+flash*175+this.cheer*25;scale=.72+flash*.5;p.n.angle=this.time*9+p.phase*60;}
      else if(p.kind===1) {const q=(this.time/this.period+p.phase)%1;p.n.setPosition(p.x+Math.sin(this.time*.8+p.phase*6.28)*THEME.sway,p.y+q*b.h*2);p.n.angle=Math.sin(this.time+p.phase*6.28)*18;opacity=Math.sin(q*Math.PI)*185;scale=.8+wave*.2;}
      else if(p.kind===2) {const w=2*b.w,h=2*b.h,d=((this.time/this.period+p.phase+1)%1)*2*(w+h);const x=d<w?-b.w+d:d<w+h?b.w:d<2*w+h?b.w-(d-w-h):-b.w;const y=d<w?b.h:d<w+h?b.h-(d-w):d<2*w+h?-b.h:-b.h+(d-2*w-h);p.n.setPosition(b.x+x,b.y+y);opacity=p.phase*3%1>.9?90:205;scale=.8+this.cheer*.18;}
      else if(p.kind===3) {p.age=Math.min(1,p.age+step);const q=p.age/.72;if(q>0&&q<1){p.n.setPosition(p.x,p.y+p.side*(78*q-20*q*q));opacity=Math.sin(q*Math.PI)*240;scale=.6+q*.55;}}
      else {opacity=14+wave*31;scale=.94+wave*.12;}
      p.alpha.opacity=Math.max(0,Math.min(255,opacity));p.n.setScale(scale,scale,1);
    }
  }
}
