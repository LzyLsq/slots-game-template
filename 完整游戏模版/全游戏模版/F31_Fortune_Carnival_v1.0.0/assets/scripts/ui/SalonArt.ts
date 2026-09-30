import {TextFit} from './TextFit';
import {tr,language} from './Language';
import { Color, EventTouch, gfx, Graphics, Label, LabelOutline, Layers, Mask, Node, Rect, resources, Size, Sprite, SpriteFrame, Texture2D, tween, Tween, UIOpacity, UITransform, Vec3 } from 'cc';
export const COLORS = { cream: '#FFF9EC', gold: '#FFD46A', jade: '#155F61', ink: '#34213A', coral: '#E75F78' };
export class SalonArt {
  public reducedMotion=false;
  private textures = new Map<string, Texture2D>();
  private frames = new Map<string, SpriteFrame>();
  public async load(names: readonly string[], progress?: (done: number, total: number) => void): Promise<void> {
    let done = 0;
    // Two concurrent decodes prevent a 16-texture upload spike on mobile.
    const queue = [...names];
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
        progress?.(++done, names.length);
      }
    };
    await Promise.all([worker(), worker()]);
  }
  public frame(name: string, index = -1): SpriteFrame {
    const key = `${name}:${index}`; const cached = this.frames.get(key); if (cached) return cached;
    const texture = this.textures.get(name); if (!texture) throw new Error(`Art not loaded: ${name}`);
    let cols = 1, rows = 1;
    if (index >= 0) {
      if(name==='carnival-destinations'){cols=2;rows=2;}
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

    if (name === 'surfaces') { sf.insetTop = sf.insetBottom = sf.insetLeft = sf.insetRight = 56; }
    if (name === 'ledgers') { sf.insetTop=sf.insetBottom=20;sf.insetLeft=sf.insetRight=38; }
    this.frames.set(key, sf); return sf;
  }
  public image(parent: Node, name: string, x: number, y: number, w: number, h: number, index = -1): Node {
    const n = box(parent, name, x, y, w, h); const s = n.addComponent(Sprite);
    // Set CUSTOM before the frame: RAW would overwrite the authored hit/layout box.
    s.sizeMode = Sprite.SizeMode.CUSTOM; s.spriteFrame = this.frame(name, index);
    if (name === 'surfaces' || name === 'ledgers') s.type = Sprite.Type.SLICED;
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
    const n=box(parent,'Fortune enamel panel',x,y,w,h),radius=Math.min(42,h*.24,w*.12);
    const palettes=[
      {shadow:new Color(37,18,43,150),outer:new Color(255,211,111,255),rim:new Color(154,78,62,255),fill:new Color(255,247,225,246),inner:new Color(244,174,164,255)},
      {shadow:new Color(12,38,46,155),outer:new Color(255,224,139,255),rim:new Color(25,101,98,255),fill:new Color(237,251,240,246),inner:new Color(111,202,177,255)},
      {shadow:new Color(58,18,35,160),outer:new Color(255,217,105,255),rim:new Color(167,41,72,255),fill:new Color(234,87,112,250),inner:new Color(255,169,151,255)},
      {shadow:new Color(12,20,55,170),outer:new Color(255,222,123,255),rim:new Color(51,49,117,255),fill:new Color(54,38,91,250),inner:new Color(110,91,170,255)}
    ];
    const p=palettes[Math.max(0,Math.min(3,style))];
    const g=n.addComponent(Graphics);
    g.fillColor=p.shadow;g.roundRect(-w/2+5,-h/2-9,w-10,h,radius);g.fill();
    g.fillColor=p.outer;g.roundRect(-w/2,-h/2,w,h,radius);g.fill();
    g.fillColor=p.rim;g.roundRect(-w/2+6,-h/2+6,w-12,h-12,Math.max(8,radius-5));g.fill();
    g.fillColor=p.fill;g.roundRect(-w/2+12,-h/2+12,w-24,h-24,Math.max(7,radius-10));g.fill();
    g.strokeColor=p.inner;g.lineWidth=Math.max(2,Math.min(5,h*.035));g.roundRect(-w/2+18,-h/2+18,w-36,h-36,Math.max(6,radius-15));g.stroke();
    if(w>110&&h>60){
      g.fillColor=p.outer;
      const cx=w/2-20,cy=h/2-20,r=Math.min(8,h*.08);
      for(const sx of [-1,1])for(const sy of [-1,1]){g.circle(sx*cx,sy*cy,r);g.fill();}
      g.strokeColor=new Color(255,249,222,190);g.lineWidth=2;g.moveTo(-w*.32,h/2-12);g.lineTo(w*.32,h/2-12);g.stroke();
    }
    return n;
  }
  public button(parent: Node, name: string, x: number, y: number, w: number, h: number, label: string, icon: number | undefined, action: () => void, style = 3): Node {
    const hit = box(parent, name, x, y, w, h), radius=Math.min(42,h*.24,w*.12);
    // A fixed socket plus a raised moving cap reads as a real cabinet control,
    // while the hit area remains stationary and full-size.
    const socket=box(hit,'Recessed button socket',0,-5,w,h);const base=socket.addComponent(Graphics);
    base.fillColor=new Color(31,18,24,205);base.roundRect(-w/2+3,-h/2-8,w-6,h,radius);base.fill();
    base.fillColor=new Color(255,209,104,255);base.roundRect(-w/2+2,-h/2-2,w-4,h-5,radius);base.fill();
    base.fillColor=new Color(72,37,47,255);base.roundRect(-w/2+9,-h/2+5,w-18,h-17,Math.max(7,radius-7));base.fill();
    base.strokeColor=new Color(255,244,205,150);base.lineWidth=2;base.roundRect(-w/2+5,-h/2+1,w-10,h-9,Math.max(8,radius-4));base.stroke();
    if(w>120&&h>64){base.fillColor=new Color(255,224,139,255);for(const side of [-1,1]){base.circle(side*(w/2-18),-h/2+13,Math.min(5,h*.055));base.fill();}}
    const inner = icon!==undefined&&!label?box(hit,'Icon face',0,4,w*.94,h*.94):this.panel(hit, 0, 4, w*.94, h*.9, style);
    if(label){
      const gloss=box(inner,'Button glass highlight',0,0,w*.86,h*.7),gg=gloss.addComponent(Graphics);
      gg.fillColor=new Color(255,255,255,40);gg.roundRect(-w*.39,h*.06,w*.78,h*.20,Math.max(8,radius*.55));gg.fill();
      gg.strokeColor=new Color(70,27,42,120);gg.lineWidth=Math.max(2,h*.025);gg.moveTo(-w*.31,-h*.24);gg.lineTo(w*.31,-h*.24);gg.stroke();gloss.setSiblingIndex(0);
    }
    if (icon !== undefined) this.image(inner, 'interfaces', label ? -w / 2 + Math.min(105,w*.16) : 0, 0, label ? Math.min(75,w*.14) : w * .86, label ? Math.min(75,h*.65) : h * .86, icon);
    if (label) { const caption=text(inner, label, 0, 0, Math.min(w*.65,w - (icon === undefined ? 24 : Math.min(200,w*.32))), h*.65, 31, style >= 2 ? COLORS.cream : COLORS.ink);caption.enableWrapText=false;caption.overflow=Label.Overflow.SHRINK; }
    if(label){
      const glints=[-1,1].map(side=>{
        const n=this.light(inner,3,side*w*.34,side*h*.3,Math.min(80,w*.18),Math.min(24,h*.24),0);n.name='Button touch glint';return n.getComponent(UIOpacity)!;
      });
      hit.on(Node.EventType.TOUCH_START,()=>{
        if(this.reducedMotion)return;
        glints.forEach((alpha,i)=>{Tween.stopAllByTarget(alpha);alpha.opacity=0;tween(alpha).delay(i*.045).to(.09,{opacity:220}).to(.38,{opacity:0},{easing:'sineOut'}).start();});
      });
    }
    bindPress(hit, inner, action,{depth:8,compression:.955,release:.22}); return hit;
  }
}
export function box(parent: Node, name: string, x: number, y: number, w: number, h: number): Node {
  const n = new Node(name); n.layer = Layers.Enum.UI_2D; n.addComponent(UITransform).setContentSize(w, h); n.setPosition(x, y); parent.addChild(n); return n;
}
export function text(parent: Node, value: string, x: number, y: number, w: number, h: number, size = 32, color = COLORS.cream, display = false, raw = false): Label {
  if(parent.name==='Parchment dialog'){const frame=parent.getComponent(UITransform);if(frame){w=Math.max(16,Math.min(w,frame.width*.84-2*Math.abs(x)));h=Math.max(16,Math.min(h,frame.height-90-2*Math.abs(y)));}}
  const n = box(parent, `Text:${value.slice(0, 28)}`, x, y, w, h); const l = n.addComponent(Label);
  l.string = raw ? value : tr(value); l.fontSize = size; l.lineHeight = size * 1.25; l.fontFamily = language()==='en' ? (display ? 'Georgia' : 'Arial') : 'Arial'; l.isBold = true;
  l.color = new Color(color); l.horizontalAlign = Label.HorizontalAlign.CENTER; l.verticalAlign = Label.VerticalAlign.CENTER;
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
