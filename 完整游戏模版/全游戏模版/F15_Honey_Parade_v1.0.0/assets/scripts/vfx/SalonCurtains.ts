import { _decorator, Component, Graphics, Color, Node, Sprite, SpriteFrame, Rect, Size, UIOpacity, Mask, tween } from 'cc';
import { SalonArt, box } from '../ui/SalonArt';
const { ccclass } = _decorator;
@ccclass('SalonCurtains')
export class SalonCurtains extends Component {
  private static frames:SpriteFrame[]=[];private static pleats:SpriteFrame[]=[];
  public reduced=false;private elapsed=0;private closure={value:0};
  private fabric:{node:Node;side:number;t:number;y:number}[]=[];
  private shutters:{node:Node;side:number;index:number}[]=[];
  private pendants:{pivot:Node;coin:Node;shine:UIOpacity;phase:number}[]=[];
  private slice(frame:SpriteFrame,x:number,y:number,w:number,h:number):SpriteFrame{const sf=new SpriteFrame();sf.texture=frame.texture;sf.rect=new Rect(x,y,w,h);sf.originalSize=new Size(w,h);sf.packable=false;return sf;}
  public setup(art:SalonArt,reduced:boolean):void{
    this.reduced=reduced;
    const cloth=art.frame('theatre-velvet');
    const aperture=box(this.node,'Curtain travel aperture',0,152,736,1110);const apertureMask=aperture.addComponent(Mask);apertureMask.type=Mask.Type.GRAPHICS_STENCIL;
    const opening=aperture.getComponent(Graphics)!;opening.clear();opening.fillColor=Color.WHITE;opening.moveTo(-358,-555);for(let x=-358;x<=358;x+=8)opening.lineTo(x,Math.min(555,511-245*Math.pow(x/361.5,2)));opening.lineTo(358,-555);opening.close();opening.fill();
    for(const side of [-1,1])for(let i=0;i<32;i++){
      const n=box(aperture,'Gathered velvet pleat '+side+':'+i,0,0,374/32+1.1,1126),sp=n.addComponent(Sprite);
      let sf=SalonCurtains.pleats[i];if(!sf){sf=this.slice(cloth,i*cloth.rect.width/32,0,Math.min(cloth.rect.width/32+1,cloth.rect.width-i*cloth.rect.width/32),cloth.rect.height);SalonCurtains.pleats[i]=sf;}
      sp.sizeMode=Sprite.SizeMode.CUSTOM;sp.spriteFrame=sf;this.shutters.push({node:n,side,index:i});
    }
    // Foreground fabric and doorway are extracted from the SAME painted scene.
    // The attachment, shadows and architecture therefore match pixel for pixel.
    const front=art.frame('theatre-front');
    let corniceFrame=SalonCurtains.frames[64];if(!corniceFrame){corniceFrame=this.slice(front,0,0,887,430);SalonCurtains.frames[64]=corniceFrame;}
    const cornice=box(this.node,'Fixed curtain suspension',0,887-215,887,430),corniceSprite=cornice.addComponent(Sprite);corniceSprite.sizeMode=Sprite.SizeMode.CUSTOM;corniceSprite.spriteFrame=corniceFrame;
    for(const side of [-1,1])for(let i=0;i<32;i++){
      const rowH=875/32,sourceX=side<0?84:557,index=(side<0?0:32)+i,y=887-430-(i+.5)*rowH;
      let sf=SalonCurtains.frames[index];if(!sf){sf=this.slice(front,sourceX,430+i*rowH,246,rowH+.6);SalonCurtains.frames[index]=sf;}
      const n=box(this.node,'Breeze cloth '+side+':'+i,side*236.5,y,246,rowH+.6),sp=n.addComponent(Sprite);sp.sizeMode=Sprite.SizeMode.CUSTOM;sp.spriteFrame=sf;
      this.fabric.push({node:n,side,t:i/31,y});
    }
    for(let i=0;i<6;i++){
      const side=i<3?-1:1,k=i%3,x=side*[180,248,316][k],length=[61,78,49][k];
      const pivot=box(this.node,'Suspended coin '+i,x,535-175*Math.pow(x/360,2),1,1),cord=box(pivot,'Fine gold chain',0,-length/2,2,length).addComponent(Graphics);
      cord.strokeColor=new Color('#C59148');cord.lineWidth=2.3;cord.moveTo(0,length/2);cord.lineTo(0,-length/2);cord.stroke();
      const coin=art.image(pivot,'symbols',0,-length,41,41,0);coin.name='Hanging gold coin';const shine=art.light(coin,3,-13,12,38,38,0).getComponent(UIOpacity)!;this.pendants.push({pivot,coin,shine,phase:i*.87});
    }
    this.positionShutters();
  }
  public setClosed(closed:boolean):void{this.closure.value=closed?1:0;this.positionShutters();}
  private positionShutters():void{
    const p=this.closure.value,span=20+354*p;
    for(const s of this.shutters){s.node.active=p>.001;s.node.setPosition(s.side*(368-(s.index+.5)*span/32),Math.sin(p*Math.PI)*Math.sin(s.index*.24+this.elapsed*.5)*.6,0);s.node.setScale(-s.side*span/374,1,1);}
  }
  public slide(closed:boolean):Promise<void>{if(this.reduced){this.setClosed(closed);return Promise.resolve();}return new Promise(resolve=>tween(this.closure).to(closed?.65:.95,{value:closed?1:0},{easing:'sineInOut',onUpdate:()=>this.positionShutters()}).call(()=>resolve()).start());}
  protected update(dt:number):void{
    if(this.reduced)return;this.elapsed+=Math.min(dt,.05);
    for(const f of this.fabric){const weight=Math.sin(Math.PI*f.t*.85);const wave=Math.sin(this.elapsed*.85-f.t*3.5+f.side*.5);f.node.setPosition(f.side*236.5+wave*8*weight*f.side,f.y,0);}
    for(const p of this.pendants){const t=this.elapsed*.8+p.phase;p.pivot.angle=Math.sin(t)*5.2;p.coin.setScale(.74+.26*Math.cos(t*.8),1,1);p.shine.opacity=Math.pow(Math.max(0,Math.sin(t*1.8)),6)*235;}
  }
}
