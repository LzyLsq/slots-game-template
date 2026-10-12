import { StationaryArtwork } from '../vfx/StationaryArtwork';
import {rewardArtwork,rewardInk,rewardTextWidth,type RewardPlateKind} from './RewardArtwork';
import { LivingMascotRig } from '../vfx/LivingMascotRig';
import { CabinetReliefGlow } from '../vfx/CabinetReliefGlow';
import { ThemeMotion } from '../vfx/ThemeMotion';
import {TextFit} from './TextFit';
import {tr,language} from './Language';
import { Color, EventTouch, gfx, Graphics, Label, LabelOutline, Layers, Mask, Node, Rect, resources, Size, Sprite, SpriteFrame, Texture2D, tween, Tween, UIOpacity, UITransform, Vec2, Vec3 } from 'cc';
export const COLORS = { cream: '#FFF8E7', gold: '#FFD988', jade: '#214D57', ink: '#35200F', coral: '#ED967C' };
export class SalonArt {
  public reducedMotion=false;
  private textures = new Map<string, Texture2D>();
  private frames = new Map<string, SpriteFrame>();
  public isLoaded(name: string): boolean { return this.textures.has(name); }
  public async load(names: readonly string[], progress?: (done: number, total: number) => void): Promise<void> {
    await ThemeMotion.prepare();
    await LivingMascotRig.prepare(names);
    let done = 0;
    // Two concurrent decodes prevent a 16-texture upload spike on mobile.
    const queue = [...names];
    const worker = async (): Promise<void> => {
      while (queue.length) {
        const name = queue.shift()!;
        if (!this.textures.has(name)) {
          const tex = await new Promise<Texture2D>((resolve, reject) => {
            const timeout=setTimeout(()=>reject(new Error('Artwork load timed out: '+name)),20000);
            resources.load(`art/${LivingMascotRig.file(name)}/texture`,Texture2D,(error,asset)=>{clearTimeout(timeout);if(error)reject(error);else resolve(asset);});
          });
          tex.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR); this.textures.set(name, tex);
        }
        progress?.(++done, names.length);
      }
    };
    await Promise.all([worker(), worker()]);
  }
  public replaceImage(node: Node, name: string, index = -1): void {
    const sprite = node.getComponent(Sprite)!; sprite.spriteFrame = this.frame(name,index);
    if (!LivingMascotRig.attach(sprite,name,index)) ThemeMotion.attach(sprite,name,index);
  }
  public frame(name: string, index = -1): SpriteFrame {
    const key = `${name}:${index}`; const cached = this.frames.get(key); if (cached) return cached;
    const texture = this.textures.get(name); if (!texture) throw new Error(`Art not loaded: ${name}`);
    let cols = 1, rows = 1;
    if (index >= 0) {
      if(name==='canopy-destinations'){cols=2;rows=2;}
      else if (name === 'titles') { cols = 2; rows = 3; }
      else if (name === 'exhibits' || name === 'surfaces' || name === 'ledgers' || name === 'optics') { cols = 2; rows = 2; }
      else { cols = 4; rows = 4; }
    }
    const w = texture.width / cols, h = texture.height / rows;
    const sf = new SpriteFrame(); sf.texture = texture;
    sf.rect = new Rect(index < 0 ? 0 : index % cols * w, index < 0 ? 0 : Math.floor(index / cols) * h, w, h);
    sf.originalSize = new Size(w, h); sf.packable = false;
    if(name==='titles'&&index>=0){
      // Tight, measured alpha bounds: keep lettering proportional without
      // shrinking it to accommodate unused atlas padding.
      const bounds=[[57,70,710,271],[99,41,669,300],[110,41,657,300],[117,36,651,305],[133,32,634,309],[57,80,710,262]][index];
      sf.rect=new Rect(index%cols*w+bounds[0],Math.floor(index/cols)*h+bounds[1],bounds[2]-bounds[0],bounds[3]-bounds[1]);
      sf.originalSize=new Size(sf.rect.width,sf.rect.height);
    }
    if((name.startsWith('canopy-plate-')||name.startsWith('canopy-soft-plate-'))){sf.insetTop=sf.insetBottom=16;sf.insetLeft=sf.insetRight=46;}
    if(name.startsWith('canopy-frame-')){sf.insetTop=sf.insetBottom=sf.insetLeft=sf.insetRight=64;}
    if (name === 'surfaces') { sf.insetTop = sf.insetBottom = sf.insetLeft = sf.insetRight = 56; }
    if (name === 'ledgers') { sf.insetTop=sf.insetBottom=20;sf.insetLeft=sf.insetRight=38; }
    this.frames.set(key, sf); return sf;
  }
  public image(parent: Node, name: string, x: number, y: number, w: number, h: number, index = -1): Node {
    const n = box(parent, name, x, y, w, h); StationaryArtwork.mark(n,name); const s = n.addComponent(Sprite);
    // Set CUSTOM before the frame: RAW would overwrite the authored hit/layout box.
    s.sizeMode = Sprite.SizeMode.CUSTOM; if(name.startsWith('symbols'))s.trim=false; s.spriteFrame = this.frame(name, index);
    if (name.startsWith('canopy-frame-') || name === 'surfaces' || name === 'ledgers' || (name.startsWith('canopy-plate-')||name.startsWith('canopy-soft-plate-'))) s.type = Sprite.Type.SLICED;
    else if(name!=='premium-ledgers-v2') {
      // Symbols and lettering keep their authored proportions, even in a
      // rectangular aperture. Layout boxes must never squash bitmap artwork.
      const frame = s.spriteFrame!;
      const fw=name.startsWith('symbols')?frame.originalSize.width:frame.rect.width,fh=name.startsWith('symbols')?frame.originalSize.height:frame.rect.height;
      const scale = Math.min(w / fw, h / fh);
      w = fw * scale; h = fh * scale;
    }
    n.getComponent(UITransform)!.setContentSize(w, h);
    if (!LivingMascotRig.attach(s,name,index)) ThemeMotion.attach(s,name,index);
    return n;
  }
  public cover(parent: Node, name: string, x: number, y: number, w: number, h: number, index=-1, radius=0): Node {
    const viewport=box(parent,`${name}-crop`,x,y,w,h);const mask=viewport.addComponent(Mask);mask.type=radius>0?Mask.Type.GRAPHICS_STENCIL:Mask.Type.GRAPHICS_RECT;
    if(radius>0){const shape=viewport.getComponent(Graphics)!;shape.clear();shape.fillColor=Color.WHITE;shape.roundRect(-w/2,-h/2,w,h,radius);shape.fill();}
    const frame=this.frame(name,index),scale=Math.max(w/frame.rect.width,h/frame.rect.height);
    this.image(viewport,name,0,0,frame.rect.width*scale,frame.rect.height*scale,index);return viewport;
  }
  public light(parent: Node, index:number, x:number,y:number,w:number,h:number,alpha=120):Node {
    const n=this.image(parent,'optics',x,y,w,h,index);const s=n.getComponent(Sprite)!;
    // Public material API; Sprite's old blend-factor fields are private in 3.8.
    s.getMaterialInstance(0)?.overridePipelineStates({blendState:{targets:[{blend:true,blendSrc:gfx.BlendFactor.SRC_ALPHA,blendDst:gfx.BlendFactor.ONE,blendSrcAlpha:gfx.BlendFactor.ZERO,blendDstAlpha:gfx.BlendFactor.ONE}]}});
    opacity(n,alpha);return n;
  }
  public rewardPanel(parent:Node,x:number,y:number,w:number,h:number,theme=0,kind:RewardPlateKind='detail'):Node {return rewardArtwork(this,parent,x,y,w,h,theme,kind);}
  public rewardButton(parent:Node,x:number,y:number,w:number,h:number,label:string,theme:number,action:()=>void):Node {
    const hit=box(parent,'Collect your treasure',x,y,w,h),face=this.rewardPanel(hit,0,0,w,h,theme,'button');
    const caption=text(face,label,0,0,rewardTextWidth(w),h*.58,34,rewardInk(theme));caption.enableWrapText=false;caption.overflow=Label.Overflow.SHRINK;
    bindPress(hit,face,action);return hit;
  }
  public panel(parent: Node, x: number, y: number, w: number, h: number, style = 0): Node { return this.image(parent, (h>w*.5?'canopy-frame-':'canopy-soft-plate-')+[0,1,2,3][style], x,y,w,h); }
  public enamel(parent:Node,x:number,y:number,w:number,h:number,tone:'ivory'|'ruby'='ivory'):Node {
    const n=box(parent,'Inlaid enamel',x,y,w,h),g=n.addComponent(Graphics),r=Math.min(30,h*.24);
    g.fillColor=new Color(66,32,14,48);g.roundRect(-w/2-3,-h/2-9,w+6,h+6,r+3);g.fill();
    g.fillColor=new Color('#AD7532');g.roundRect(-w/2,-h/2,w,h,r);g.fill();
    g.fillColor=new Color('#F8DCA1');g.roundRect(-w/2+2,-h/2+4,w-4,h-6,r-2);g.fill();
    const top=tone==='ruby'?[34,114,118]:[255,249,232],bottom=tone==='ruby'?[10,58,69]:[233,216,178];
    for(let i=0;i<24;i++){const t=i/23;g.fillColor=new Color(...top.map((v,k)=>Math.round(v+(bottom[k]-v)*t)) as [number,number,number]);const inset=7+i*.2;g.roundRect(-w/2+inset,-h/2+7,w-inset*2,h-14-i*(h-22)/24,Math.max(5,r-7));g.fill();}
    g.strokeColor=new Color(tone==='ruby'?'#E5B974':'#FFFCEE');g.lineWidth=1.5;g.roundRect(-w/2+11,-h/2+11,w-22,h-22,Math.max(6,r-9));g.stroke();
    return n;
  }
  /** Dark engraved metal; highlights stay at the bevel, leaving a quiet reading surface. */
  public lacquer(parent:Node,x:number,y:number,w:number,h:number):Node {
    const n=box(parent,'Engraved midnight bronze',x,y,w,h),g=n.addComponent(Graphics),r=Math.min(45,h*.28);
    g.fillColor=new Color('#382B1D');g.roundRect(-w/2,-h/2-6,w,h,r);g.fill();
    g.fillColor=new Color('#C29B5C');g.roundRect(-w/2,-h/2,w,h,r);g.fill();
    g.fillColor=new Color('#0B3039');g.roundRect(-w/2+4,-h/2+5,w-8,h-10,r-3);g.fill();
    for(let i=0;i<12;i++){g.fillColor=new Color(20+i,51+i,56+i,100);g.roundRect(-w/2+8,-h/2+9,w-16,(h-18)*(1-i/16),Math.max(8,r-7));g.fill();}
    g.strokeColor=new Color(227,184,106,120);g.lineWidth=1.5;g.roundRect(-w/2+13,-h/2+14,w-26,h-28,Math.max(8,r-12));g.stroke();
    for(let side of [-1,1]){g.strokeColor=new Color('#B9985E');g.lineWidth=2;g.moveTo(side*(w/2-40),h/2-17);g.lineTo(side*(w/2-18),h/2-39);g.moveTo(side*(w/2-40),-h/2+17);g.lineTo(side*(w/2-18),-h/2+39);g.stroke();}
    return n;
  }
  public cabinetRoom(parent:Node,name:string):Node {
    const source=this.frame(name),room=box(parent,name,0,0,1536,2304);
    const regions=[['top',0,120,180,1062],['middle',120,1256,1884,30],['bottom',1376,160,240,-1032]] as const;
    for(const [key,y,sh,h,py] of regions){
      const frame=new SpriteFrame();frame.texture=source.texture;frame.rect=new Rect(0,y,source.rect.width,sh);frame.originalSize=new Size(source.rect.width,sh);frame.packable=false;
      const n=box(room,'Continuous '+key+' architecture',0,py,1536,h),sprite=n.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.spriteFrame=frame;n.getComponent(UITransform)!.setContentSize(1536,h);
    }
    const seed = ['golden-hour','jade-treasury','pearl-palace','ruby-revel'].indexOf(name.slice(0,-5));
    CabinetReliefGlow.attach(room,[[.43,.10],[.56,.11],[.33,.23],[.68,.25],[.27,.77],[.72,.77]],seed);
    return room;
  }
  public primary(parent:Node,name:string,x:number,y:number,w:number,h:number,label:string,action:()=>void):Node {
    const hit=box(parent,name,x,y,w,h),face=this.lacquer(hit,0,0,w,h);
    if(w>400)this.image(face,'interfaces',-w*.39,0,h*.7,h*.7,6);
    if(w>400)this.image(face,'symbols',w*.4,0,h*.48,h*.48,0);
    const caption=text(face,label,0,0,w*.64,h*.62,42,'#FFF3CB');caption.enableWrapText=false;
    outlined(caption,'#702B20',1);bindPress(hit,face,action);return hit;
  }
  public button(parent: Node, name: string, x: number, y: number, w: number, h: number, label: string, icon: number | undefined, action: () => void, style = 3): Node {
    const hit = box(parent, name, x, y, w, h);
    // The image icon already includes a sculpted gold rim. A second square
    // panel underneath produced stacked, distorted button frames.
    const inner = icon!==undefined&&!label?box(hit,'Icon face',0,0,w,h):this.panel(hit, 0, 0, w, h, style);
    if (icon !== undefined) this.image(inner, 'interfaces', label ? -w / 2 + Math.min(105,w*.16) : 0, 0, label ? Math.min(75,w*.14) : w * .9, label ? Math.min(75,h*.65) : h * .9, icon);
    if (label) { const caption=text(inner, label, 0, 0, Math.min(w*.65,w - (icon === undefined ? 24 : Math.min(200,w*.32))), h*.48, 36, COLORS.ink);caption.enableWrapText=false;caption.overflow=Label.Overflow.SHRINK;outlined(caption,'#FFF2CB',1.5); }
    if(label){
      // Two fixed rim glints respond to touch without crossing the caption.
      const glints=[-1,1].map(side=>{
        const n=this.light(inner,3,side*w*.34,side*h*.3,Math.min(80,w*.18),Math.min(24,h*.24),0);n.name='Button touch glint';return n.getComponent(UIOpacity)!;
      });
      hit.on(Node.EventType.TOUCH_START,()=>{
        if(this.reducedMotion)return;
        glints.forEach((alpha,i)=>{Tween.stopAllByTarget(alpha);alpha.opacity=0;tween(alpha).delay(i*.045).to(.09,{opacity:220}).to(.38,{opacity:0},{easing:'sineOut'}).start();});
      });
    }
    bindPress(hit, inner, action); return hit;
  }
}
export function box(parent: Node, name: string, x: number, y: number, w: number, h: number): Node {
  const n = new Node(name); n.layer = Layers.Enum.UI_2D; n.addComponent(UITransform).setContentSize(w, h); n.setPosition(x, y); parent.addChild(n); return n;
}
export function text(parent: Node, value: string, x: number, y: number, w: number, h: number, size = 32, color = COLORS.cream, display = false, raw = false): Label {
  if(parent.name==='Parchment dialog'){const frame=parent.getComponent(UITransform);if(frame){w=Math.max(16,Math.min(w,frame.width*.84-2*Math.abs(x)));h=Math.max(16,Math.min(h,frame.height-90-2*Math.abs(y)));}}
  const n = box(parent, `Text:${value.slice(0, 28)}`, x, y, w, h); const l = n.addComponent(Label);
  l.string = raw ? value : tr(value); l.fontSize = size; l.lineHeight = size * 1.25; l.fontFamily = language()==='en' ? (display ? 'Georgia' : 'Arial') : 'Arial'; l.isBold = true;
  // Light parchment dialogs need ink even when callers use the default light copy.
  const ink=parent.name==='Parchment dialog'&&(color===COLORS.cream||color===COLORS.gold)?COLORS.ink:color;
  l.color = new Color(ink); l.horizontalAlign = Label.HorizontalAlign.CENTER; l.verticalAlign = Label.VerticalAlign.CENTER;
  // CHAR shares a dynamic glyph atlas across pages. Destroying a label-heavy
  // profile page while creating the login form can evict glyphs that the new
  // labels still reference, leaving blank buttons until a full reload.
  // Per-label textures cost a few draw calls but keep auth copy deterministic.
  l.overflow = Label.Overflow.SHRINK; l.enableWrapText = true; l.cacheMode = Label.CacheMode.NONE; n.addComponent(TextFit); return l;
}
export function bindPress(hit: Node, inner: Node, action: () => void, feel:{depth?:number;compression?:number;release?:number;tilt?:number}={}): void {
  let pressed=false,startX=0,startY=0,touchId:number|null|undefined;
  // A stable sibling receives input when the artwork itself was the old target.
  // Its bounds never shrink with the press animation or the idle artwork drift.
  let surface=hit;
  if(hit===inner){
    const size=hit.getComponent(UITransform)!;
    surface=box(hit.parent!,'Input area · '+hit.name,hit.position.x,hit.position.y,size.width,size.height);
    surface.setScale(hit.scale);surface.setRotation(hit.rotation);
    surface.getComponent(UITransform)!.setAnchorPoint(size.anchorPoint);
    surface.setSiblingIndex(hit.getSiblingIndex()+1);
    hit.on(Node.EventType.NODE_DESTROYED,()=>{if(surface.isValid)surface.destroy();});
  }
  const parent=inner.parent!,order=inner.getSiblingIndex();
  const motion=box(parent,'Press motion · '+hit.name,0,0,0,0);
  motion.setSiblingIndex(order);inner.setParent(motion);
  let response:Tween<Node>|undefined;
  const target=(scale:number,depth=0)=>{const p=inner.position;return {angle:depth>0?(feel.tilt??0):0,scale:new Vec3(scale,scale,1),position:new Vec3(p.x*(1-scale),p.y*(1-scale)-depth,0)};};
  const restore=():void=>{
    pressed=false;touchId=undefined;response?.stop();
    if(motion.isValid)response=tween(motion).to(.11,target(1.025,-1),{easing:'quadOut'}).to(Math.max(.16,feel.release??.2),target(1),{easing:'sineInOut'}).start();
  };
  surface.on(Node.EventType.TOUCH_START,(event:EventTouch)=>{
    if(event.target!==surface||pressed||!hit.activeInHierarchy)return;
    const point=event.getUILocation();startX=point.x;startY=point.y;touchId=event.getID();
    pressed=true;response?.stop();
    response=tween(motion).to(.065,target(Math.min(.94,feel.compression??.92),feel.depth??6),{easing:'quadOut'}).start();
  });
  surface.on(Node.EventType.TOUCH_MOVE,(event:EventTouch)=>{
    if(!pressed||event.getID()!==touchId)return;const point=event.getUILocation();
    if(Math.hypot(point.x-startX,point.y-startY)>36)restore();
  });
  surface.on(Node.EventType.TOUCH_CANCEL,(event:EventTouch)=>{if(event.target===surface&&event.getID()===touchId)restore();});
  surface.on(Node.EventType.TOUCH_END,(event:EventTouch)=>{
    if(event.target!==surface||event.getID()!==touchId)return;
    const run=pressed&&hit.activeInHierarchy;restore();if(run)action();
  });
}
export function opacity(n: Node, value: number): UIOpacity { const o = n.getComponent(UIOpacity) ?? n.addComponent(UIOpacity); o.opacity = value; return o; }
export function outlined(label:Label,color='#15352F',width=2):Label {
  const outline=label.node.getComponent(LabelOutline)??label.node.addComponent(LabelOutline);outline.color=new Color(color);outline.width=width;return label;
}
