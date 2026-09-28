import {TextFit} from './TextFit';
import {titleFrame,TitleTone} from './TitleImage';
import {tr,language} from './Language';
import { Color, EventTouch, gfx, Graphics, Label, LabelOutline, Layers, Mask, Node, Rect, resources, Size, Sprite, SpriteFrame, Texture2D, tween, Tween, UIOpacity, UITransform, Vec3 } from 'cc';
export const COLORS = { cream: '#FFF8E8', gold: '#F9D990', jade: '#165E57', ink: '#10243A', coral: '#AC353C' };
export class SalonArt {
  public reducedMotion=false;
  private textures = new Map<string, Texture2D>();
  private frames = new Map<string, SpriteFrame>();
  private titleBounds = new WeakMap<Node,{width:number;height:number}>();
  private authoredTitle(value:string,tone:TitleTone):SpriteFrame|undefined {
    // Use the actual preloaded title artwork for English; darker engravings
    // belong only on pale enamel, never on the burgundy rule panel.
    if(language()!=='en')return undefined;
    const name:Record<string,string>={
      ...(tone==='ink'?{
        'ROULETTE RAIL':'f32-title-coin-carousel',
        'GOLDEN SLEEPER':'f32-title-lantern-vault',
        'HIGH ROLLER':'f32-title-lucky-parade',
        'JACKPOT ENGINE':'f32-title-celestial-mint',
        'THE GOLD EXCHANGE':'f32-heading-store',
        'DAILY FORTUNE':'f32-heading-rewards',
        'HIGH ROLLERS':'f32-heading-rank',
        'PLAYER PASSPORT':'f32-heading-profile'
      }:{}),
      'AURUM EXPRESS':'f32-brand-title',
      'BIG WIN':'f32-win-big',
      'MEGA WIN':'f32-win-mega',
      'EPIC WIN':'f32-win-epic',
    };
    return name[value]&&this.textures.has(name[value])?this.frame(name[value]):undefined;
  }
  private setTitleFrame(n:Node,value:string,width:number,height:number,size:number,tone:TitleTone):void {
    const authored=this.authoredTitle(value,tone);
    const frame=authored??titleFrame(value,width,height,size,tone);
    const sprite=n.getComponent(Sprite)!;sprite.spriteFrame=frame;
    const bounds=n.getComponent(UITransform)!;
    if(authored){
      const ratio=Math.min(width/frame.rect.width,height/frame.rect.height);
      bounds.setContentSize(frame.rect.width*ratio,frame.rect.height*ratio);
    }else bounds.setContentSize(width,height);
  }
  public hasAll(names: readonly string[]): boolean { return names.every(name => this.textures.has(name)); }
  public async load(names: readonly string[], progress?: (done: number, total: number) => void): Promise<void> {
    let done = 0;
    // Two concurrent decodes prevent a 16-texture upload spike on mobile.
    const queue = Array.from(new Set(names));
    const total = queue.length;
    const worker = async (): Promise<void> => {
      while (queue.length) {
        const name = queue.shift()!;
        if (!this.textures.has(name)) {
          const tex = await new Promise<Texture2D>((resolve, reject) => {
            const timeout=setTimeout(()=>reject(new Error('Artwork load timed out: '+name)),20000);
            resources.load(`art/${name}/texture`,Texture2D,(error,asset)=>{clearTimeout(timeout);if(error)reject(error);else resolve(asset);});
          });
          tex.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR); this.textures.set(name, tex);
        }
        progress?.(++done, total);
      }
    };
    await Promise.all([worker(), worker()]);
  }
  public frame(name: string, index = -1): SpriteFrame {
    const key = `${name}:${index}`; const cached = this.frames.get(key); if (cached) return cached;
    const texture = this.textures.get(name); if (!texture) throw new Error(`Art not loaded: ${name}`);
    let cols = 1, rows = 1;
    if (index >= 0) {
      if (name === 'titles') { cols = 2; rows = 3; }
      else if (name === 'exhibits' || name === 'surfaces' || name === 'ledgers' || name === 'optics') { cols = 2; rows = 2; }
      else { cols = 4; rows = 4; }
    }
    const w = texture.width / cols, h = texture.height / rows;
    const sf = new SpriteFrame(); sf.texture = texture;
    sf.rect = new Rect(index < 0 ? 0 : index % cols * w, index < 0 ? 0 : Math.floor(index / cols) * h, w, h);
    sf.originalSize = new Size(w, h); sf.packable = false;
    if(name==='portraits'&&index>=0){
      // Unlike the 4×4 UI atlases, this artwork has hand-authored 299px
      // horizontal bands (and 60px of unused space below the last one).
      // Equal 313.5px rows cut off each crest and expose the next row's dark
      // square background. Use measured, individual tile bounds instead.
      const columns=[0,313,627,940,1254],rows=[0,299,597,895];
      const col=index%4,row=Math.floor(index/4),left=columns[col]+8;
      sf.rect=new Rect(left,rows[row]+1,columns[col+1]-columns[col]-16,297);
      sf.originalSize=new Size(sf.rect.width,sf.rect.height);
    }
    if(name==='titles'&&index>=0){
      // Tight, measured alpha bounds: keep lettering proportional without
      // shrinking it to accommodate unused atlas padding.
      const bounds=[[57,70,710,271],[99,41,669,300],[110,41,657,300],[117,36,651,305],[133,32,634,309],[57,80,710,262]][index];
      sf.rect=new Rect(index%cols*w+bounds[0],Math.floor(index/cols)*h+bounds[1],bounds[2]-bounds[0],bounds[3]-bounds[1]);
      sf.originalSize=new Size(sf.rect.width,sf.rect.height);
    }

    if (name === 'surfaces') { sf.insetTop = sf.insetBottom = sf.insetLeft = sf.insetRight = 56; }
    if(name.startsWith('treasury-panel-')){sf.insetTop=sf.insetBottom=29;sf.insetLeft=sf.insetRight=45;}
    if (name === 'ledgers') { sf.insetTop=sf.insetBottom=20;sf.insetLeft=sf.insetRight=38; }
    if (name.startsWith('treasury-button-')) { sf.insetTop=sf.insetBottom=26;sf.insetLeft=sf.insetRight=58; }
    if (name.startsWith('f32-button-') && name!=='f32-button-spin') { sf.insetTop=sf.insetBottom=28;sf.insetLeft=sf.insetRight=62; }
    this.frames.set(key, sf); return sf;
  }
  public image(parent: Node, name: string, x: number, y: number, w: number, h: number, index = -1): Node {
    const n = box(parent, name, x, y, w, h); const s = n.addComponent(Sprite);
    // Set CUSTOM before the frame: RAW would overwrite the authored hit/layout box.
    s.sizeMode = Sprite.SizeMode.CUSTOM; s.spriteFrame = this.frame(name, index);
    if (name === 'surfaces' || name === 'ledgers' || name.startsWith('treasury-panel-') || name.startsWith('treasury-button-') || (name.startsWith('f32-button-') && name!=='f32-button-spin')) s.type = Sprite.Type.SLICED;
    else if(name!=='premium-ledgers-v2') {
      // Symbols and lettering keep their authored proportions, even in a
      // rectangular aperture. Layout boxes must never squash bitmap artwork.
      const frame = s.spriteFrame!;
      const scale = Math.min(w / frame.rect.width, h / frame.rect.height);
      w = frame.rect.width * scale; h = frame.rect.height * scale;
    }
    n.getComponent(UITransform)!.setContentSize(w, h);
    return n;
  }
  /** Image lettering with a restrained living-metal float; main marques use authored PNGs. */
  public titleImage(parent:Node,value:string,x:number,y:number,w:number,h:number,size:number,tone:TitleTone='gold',motion=true):Node {
    const n=box(parent,'Image title · '+value,x,y,w,h),sprite=n.addComponent(Sprite);
    sprite.sizeMode=Sprite.SizeMode.CUSTOM;this.titleBounds.set(n,{width:w,height:h});
    this.setTitleFrame(n,value,w,h,size,tone);
    if(!this.reducedMotion){
      if(motion){
        const start=n.position.clone();
        tween(n).to(2.7,{position:new Vec3(start.x,start.y+2.5,start.z)},{easing:'sineInOut'})
          .to(3.1,{position:start},{easing:'sineInOut'}).union().repeatForever().start();
      }
      // Animate the bitmap itself. A free-floating flare reads like a sticker
      // and sprite-stencil masks differ between WebGL and native renderers.
      // Colour modulation never paints outside the title image's own alpha.
      sprite.color=new Color(239,224,192,255);
      tween(sprite).to(1.65,{color:new Color(255,255,255,255)},{easing:'sineInOut'})
        .to(2.35,{color:new Color(239,224,192,255)},{easing:'sineInOut'})
        .delay(1.1).union().repeatForever().start();
    }
    return n;
  }
  public updateTitleImage(n:Node,value:string,size:number,tone:TitleTone='gold'):void {
    if(!n.isValid)return;
    const bounds=this.titleBounds.get(n)??{width:n.getComponent(UITransform)!.width,height:n.getComponent(UITransform)!.height};
    this.setTitleFrame(n,value,bounds.width,bounds.height,size,tone);
    n.name='Image title · '+value;
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
  public panel(parent: Node, x: number, y: number, w: number, h: number, style = 0): Node {
    const name=style>=2?'treasury-panel-burgundy':'treasury-panel-ivory';
    const n=this.image(parent,name,x,y,w,h);n.name='Carved treasury surface';return n;
  }
  /** Cast-gold counter from the same cabinet artwork, not a flat floating card. */
  public counter(parent: Node,x:number,y:number,w:number,h:number):Node {
    const n=this.image(parent,'treasury-panel-ivory',x,y,w,h);n.name='Carved treasury counter';return n;
  }
  /** Photo-rendered emerald push-button, with matching physical relief and a stable hit box. */
  public coinMount(parent:Node,x:number,y:number,size:number):Node {
    return this.image(parent,'f32-button-spin',x,y,size,size);
  }
  public button(parent: Node, name: string, x: number, y: number, w: number, h: number, label: string, icon: number | undefined, action: () => void, style = 3): Node {
    const hit=box(parent,name,x,y,w,h),isRound=w/h<1.8;
    const cap=box(hit,'Machined moving button',0,2,w,h);
    if(isRound){
      // The supplied high-resolution atlas icon already includes its own gilded bezel.
      // A second hand-drawn ring made it look like a sticker on a button.
      this.image(cap,'f32-button-spin',0,0,Math.min(w,h)*.97,Math.min(w,h)*.97);
      if(icon!==undefined)this.image(cap,'f32-casino-symbols',0,0,Math.min(w,h)*.44,Math.min(w,h)*.44,icon%16);
      else if(label){const legend=text(cap,label,0,0,w*.52,h*.52,Math.min(38,h*.42),COLORS.cream);legend.enableWrapText=false;outlined(legend,'#091D19',2);}
    }else{
      const art=style===1?'f32-button-emerald':style===0?'f32-button-ivory':'f32-button-crimson';
      const base=this.image(hit,art,0,-5,w,h);
      const face=this.image(cap,art,0,0,w,h);
      base.setSiblingIndex(0);face.setSiblingIndex(0);
      // Small controls keep the whole legend readable; large controls can carry a minted emblem.
      const hasIcon=icon!==undefined&&w>=300;
      if(hasIcon)this.image(cap,'f32-casino-symbols',-w/2+Math.min(67,w*.115),0,Math.min(58,h*.59),Math.min(58,h*.59),icon!%16);
      const caption=text(cap,label,hasIcon?Math.min(38,w*.07):0,0,hasIcon?w*.73:w*.83,h*.60,Math.min(35,h*.46),style===0?COLORS.ink:COLORS.cream);
      caption.enableWrapText=false;
      const outline=caption.node.addComponent(LabelOutline);outline.color=new Color(style===0?'#51452E':'#160F0C');outline.width=3;
    }
    cap.setSiblingIndex(hit.children.length-1);
    bindPress(hit,cap,action,{depth:7,compression:.945,release:.20,captureFace:true});return hit;
  }

}
export function box(parent: Node, name: string, x: number, y: number, w: number, h: number): Node {
  const n = new Node(name); n.layer = Layers.Enum.UI_2D; n.addComponent(UITransform).setContentSize(w, h); n.setPosition(x, y); parent.addChild(n); return n;
}
export function text(parent: Node, value: string, x: number, y: number, w: number, h: number, size = 32, color = COLORS.cream, display = false, raw = false, rasterScale = 2): Label {
  if(parent.name==='Parchment dialog'){const frame=parent.getComponent(UITransform);if(frame){w=Math.max(16,Math.min(w,frame.width*.84-2*Math.abs(x)));h=Math.max(16,Math.min(h,frame.height-90-2*Math.abs(y)));}}
  // Cocos system fonts are rasterized at the Label font size, not the device pixel
  // ratio. Draw glyphs at twice the resolution, then scale their isolated node
  // back down without changing the authored position or visible bounds.
  const n = box(parent, `Text:${value.slice(0, 28)}`, x, y, w * rasterScale, h * rasterScale);
  n.setScale(1 / rasterScale, 1 / rasterScale, 1);
  const l = n.addComponent(Label);
  l.string = raw ? value : tr(value); l.fontSize = size * rasterScale; l.lineHeight = size * 1.25 * rasterScale; l.fontFamily = language()==='en' ? (display ? 'Georgia' : 'Arial') : 'Arial'; l.isBold = true;
  l.color = new Color(color); l.horizontalAlign = Label.HorizontalAlign.CENTER; l.verticalAlign = Label.VerticalAlign.CENTER;
  // CHAR shares a dynamic glyph atlas across pages. Destroying a label-heavy
  // profile page while creating the login form can evict glyphs that the new
  // labels still reference, leaving blank buttons until a full reload.
  // Per-label textures cost a few draw calls but keep auth copy deterministic.
  l.overflow = Label.Overflow.SHRINK; l.enableWrapText = true; l.cacheMode = Label.CacheMode.NONE; n.addComponent(TextFit); return l;
}
export function bindPress(hit: Node, inner: Node, action: () => void, feel:{depth?:number;compression?:number;release?:number;tilt?:number;captureFace?:boolean;onPressStart?:()=>void;onPressEnd?:(activated:boolean)=>void}={}): void {
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
  if(feel.captureFace&&hit!==inner){
    // A decorative sprite/label otherwise wins hit-testing over its parent.
    // The invisible topmost glass catches the entire visible button face.
    const size=hit.getComponent(UITransform)!;
    surface=box(hit,'Button touch glass',0,0,size.width,size.height);
    surface.setSiblingIndex(hit.children.length-1);
  }
  let response:Tween<Node>|undefined;
  const target=(scale:number,depth=0)=>{const p=inner.position;return {angle:depth>0?(feel.tilt??0):0,scale:new Vec3(scale,scale,1),position:new Vec3(p.x*(1-scale),p.y*(1-scale)-depth,0)};};
  const restore=(activated=false):void=>{
    const wasPressed=pressed;pressed=false;touchId=undefined;response?.stop();
    if(wasPressed)feel.onPressEnd?.(activated);
    if(motion.isValid)response=activated
      ?tween(motion).to(.11,target(1.025,-1),{easing:'quadOut'}).to(Math.max(.16,feel.release??.2),target(1),{easing:'sineInOut'}).start()
      :tween(motion).to(.12,target(1),{easing:'quadOut'}).start();
  };
  surface.on(Node.EventType.TOUCH_START,(event:EventTouch)=>{
    if(event.target!==surface||pressed||!hit.activeInHierarchy)return;
    const point=event.getUILocation();startX=point.x;startY=point.y;touchId=event.getID();
    pressed=true;response?.stop();feel.onPressStart?.();
    response=tween(motion).to(.065,target(Math.min(.94,feel.compression??.92),feel.depth??6),{easing:'quadOut'}).start();
  });
  surface.on(Node.EventType.TOUCH_MOVE,(event:EventTouch)=>{
    if(!pressed||event.getID()!==touchId)return;const point=event.getUILocation();
    if(Math.hypot(point.x-startX,point.y-startY)>36)restore();
  });
  surface.on(Node.EventType.TOUCH_CANCEL,(event:EventTouch)=>{if(event.target===surface&&event.getID()===touchId)restore();});
  surface.on(Node.EventType.TOUCH_END,(event:EventTouch)=>{
    if(event.target!==surface||event.getID()!==touchId)return;
    const run=pressed&&hit.activeInHierarchy;restore(run);if(run)action();
  });
}
export function opacity(n: Node, value: number): UIOpacity { const o = n.getComponent(UIOpacity) ?? n.addComponent(UIOpacity); o.opacity = value; return o; }
export function outlined(label:Label,color='#15352F',width=2):Label {
  const outline=label.node.getComponent(LabelOutline)??label.node.addComponent(LabelOutline);outline.color=new Color(color);outline.width=width*(label.node.scale.x<.75?2:1);return label;
}
