import { StationaryArtwork } from '../vfx/StationaryArtwork';
import {rewardArtwork,rewardInk,rewardTextWidth,type RewardPlateKind} from './RewardArtwork';
import { ThemeMotion } from '../vfx/ThemeMotion';
import {tr,language} from './Language';
import { PressGesture } from './PressGesture';
import { Color, director, Director, EventTouch, game, Game, gfx, Graphics, Label, LabelOutline, Layers, Mask, Node, Rect, resources, Size, Sprite, SpriteFrame, Texture2D, tween, Tween, UIOpacity, UITransform, Vec3 } from 'cc';
export const COLORS = { cream: '#FFF8E7', gold: '#FFD988', jade: '#214D57', ink: '#35200F', coral: '#ED967C' };
export class SalonArt {
  public reducedMotion=false;
  private textures = new Map<string, Texture2D>();
  private frames = new Map<string, SpriteFrame>();
  public async load(names: readonly string[], progress?: (done: number, total: number) => void): Promise<void> {
    await ThemeMotion.prepare();
    let done = 0;
    // Two concurrent decodes prevent a 16-texture upload spike on mobile.
    const queue = [...names];
    const worker = async (): Promise<void> => {
      while (queue.length) {
        const name = queue.shift()!;
        if (!this.textures.has(name)) {
          const tex = await new Promise<Texture2D>((resolve, reject) => resources.load(`art/${name}/texture`, Texture2D, (error, asset) => error ? reject(error) : resolve(asset)));
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
    s.sizeMode = Sprite.SizeMode.CUSTOM; s.spriteFrame = this.frame(name, index);
    if (name.startsWith('canopy-frame-') || name === 'surfaces' || name === 'ledgers' || (name.startsWith('canopy-plate-')||name.startsWith('canopy-soft-plate-'))) s.type = Sprite.Type.SLICED;
    else if(name!=='premium-ledgers-v2') {
      // Symbols and lettering keep their authored proportions, even in a
      // rectangular aperture. Layout boxes must never squash bitmap artwork.
      const frame = s.spriteFrame!;
      const scale = Math.min(w / frame.rect.width, h / frame.rect.height);
      w = frame.rect.width * scale; h = frame.rect.height * scale;
    }
    n.getComponent(UITransform)!.setContentSize(w, h);
    ThemeMotion.attach(s,name,index);
    if(name==='canopy-destinations'&&index===0){
      // Theme ornaments share the card transform in the hall and loading view.
      this.image(n,'symbols',0,h*.403,w*.205,h*.205,13).name='Solar crown crest';
      this.image(n,'symbols',0,-h*.445,w*.104,h*.104,12).name='Solar lower seal';
      for(const side of [-1,1]){
        this.image(n,'symbols',side*w*.357,-h*.215,w*.076,h*.076,12).name='Solar side rosette';
      }
    }
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
  public button(parent: Node, name: string, x: number, y: number, w: number, h: number, label: string, icon: number | undefined, action: () => void, style = 3): Node {
    const hit = box(parent, name, x, y, w, h);
    // The image icon already includes a sculpted gold rim. A second square
    // panel underneath produced stacked, distorted button frames.
    const inner = icon!==undefined&&!label?box(hit,'Icon face',0,0,w,h):this.panel(hit, 0, 0, w, h, style);
    if (icon !== undefined) this.image(inner, 'interfaces', label ? -w / 2 + Math.min(105,w*.16) : 0, 0, label ? Math.min(75,w*.14) : w * .9, label ? Math.min(75,h*.65) : h * .9, icon);
    if (label) { const caption=text(inner, label, 0, 0, Math.min(w*.65,w - (icon === undefined ? 24 : Math.min(200,w*.32))), h*.48, 36, style === 2 ? COLORS.cream : COLORS.ink);caption.enableWrapText=false;caption.overflow=Label.Overflow.SHRINK;outlined(caption,style===2?'#54200C':'#FFF2CB',1.5); }
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
  const n = box(parent, `Text:${value.slice(0, 28)}`, x, y, w, h); const l = n.addComponent(Label);
  l.string = raw ? value : tr(value); l.fontSize = size; l.lineHeight = size * 1.25; l.fontFamily = language()==='en' ? (display ? 'Georgia' : 'Arial') : 'Arial'; l.isBold = true;
  // Light parchment dialogs need ink even when callers use the default light copy.
  const ink=parent.name==='Parchment dialog'&&(color===COLORS.cream||color===COLORS.gold)?COLORS.ink:color;
  l.color = new Color(ink); l.horizontalAlign = Label.HorizontalAlign.CENTER; l.verticalAlign = Label.VerticalAlign.CENTER;
  // CHAR shares a dynamic glyph atlas across pages. Destroying a label-heavy
  // profile page while creating the login form can evict glyphs that the new
  // labels still reference, leaving blank buttons until a full reload.
  // Per-label textures cost a few draw calls but keep auth copy deterministic.
  l.overflow = Label.Overflow.SHRINK; l.enableWrapText = true; l.cacheMode = Label.CacheMode.NONE; return l;
}
const pressBindings = new WeakMap<Node, () => void>();
export function bindPress(hit: Node, inner: Node, action: () => void, feel:{depth?:number;compression?:number;release?:number;tilt?:number;jelly?:number}={}): void {
  pressBindings.get(hit)?.();
  const gesture=new PressGesture();
  // A separate transform keeps breathing/sheen tweens alive after a tap.
  // The inner node retains its local coordinates for existing idle animations.
  const parent=inner.parent!;const order=inner.getSiblingIndex();
  // Some existing callers use their bitmap as the target. Give those a fixed,
  // invisible sibling target; never animate the node used for hit testing.
  const sourceTransform=hit.getComponent(UITransform)!;
  const targetHit=inner===hit?box(parent,'Press target · '+hit.name,hit.position.x,hit.position.y,sourceTransform.width,sourceTransform.height):hit;
  if(targetHit!==hit){targetHit.setScale(hit.scale);targetHit.angle=hit.angle;targetHit.getComponent(UITransform)!.setAnchorPoint(sourceTransform.anchorPoint);targetHit.setSiblingIndex(order+1);}
  const motion=box(parent,'Press motion · '+hit.name,0,0,0,0);
  motion.setSiblingIndex(order);inner.setParent(motion);
  let response:Tween<Node>|undefined;
  let disposed=false;
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
  const compression=Math.max(.955,Math.min(.995,feel.compression??.975));
  const depth=Math.max(0,Math.min(4,feel.depth??2.5));
  const jelly=Math.max(0,Math.min(1,feel.jelly??0));
  const target=(scale:number,down=0)=>{const p=inner.position;return {angle:down>0?Math.max(-.4,Math.min(.4,feel.tilt??0)):0,scale:new Vec3(scale,scale,1),position:new Vec3(p.x*(1-scale),p.y*(1-scale)-down,0)};};
  // Squash around the lower edge, keeping the control seated. The invisible
  // target remains unchanged throughout this deliberately soft response.
  const softTarget=(x:number,y:number,down=0)=>{
    const p=inner.position,h=inner.getComponent(UITransform)?.height??0;
    return {angle:0,scale:new Vec3(x,y,1),position:new Vec3(p.x*(1-x),p.y*(1-y)+h*(y-1)*.5-down,0)};
  };
  const resetMotion=():void=>{response?.stop();if(motion.isValid){motion.setScale(1,1,1);motion.setPosition(0,0,0);motion.angle=0;}};
  const restore=(celebrate=false):void=>{
    response?.stop();if(disposed||!motion.isValid)return;
    if(reduced){resetMotion();return;}
    if(jelly>0&&celebrate){
      response=tween(motion)
        .to(.105,softTarget(1-.026*jelly,1+.068*jelly),{easing:'sineOut'})
        .to(.12,softTarget(1+.015*jelly,1-.032*jelly),{easing:'sineInOut'})
        .to(.14,softTarget(1-.005*jelly,1+.012*jelly),{easing:'sineInOut'})
        .to(.16,target(1),{easing:'sineOut'}).start();
      return;
    }
    response=tween(motion).to(Math.max(.10,Math.min(.18,feel.release??.14)),target(1),{easing:'sineOut'}).start();
  };
  const inside=(event:EventTouch):boolean=>hit.isValid&&hit.activeInHierarchy&&inner.activeInHierarchy&&targetHit.getComponent(UITransform)!.hitTest(event.getLocation());
  const start=(event:EventTouch):void=>{
    const id=event.getID();const p=event.getLocation();
    if(id===null||!gesture.start(id,p.x,p.y,inside(event)))return;
    response?.stop();if(reduced)return;
    response=tween(motion).to(jelly>0?.095:.075,jelly>0?softTarget(1+.032*jelly,1-.09*jelly,depth):target(compression,depth),{easing:'sineOut'}).start();
  };
  const move=(event:EventTouch):void=>{const id=event.getID();if(id===null)return;const p=event.getLocation();if(gesture.move(id,p.x,p.y,inside(event)))restore();};
  const cancel=(event:EventTouch):void=>{const id=event.getID();if(id===null||!gesture.owns(id))return;gesture.reset();restore();};
  const end=(event:EventTouch):void=>{const id=event.getID();if(id===null||!gesture.owns(id))return;const p=event.getLocation(),within=inside(event);gesture.move(id,p.x,p.y,within);const run=gesture.end(id,within);restore(run);if(run){event.propagationStopped=true;
    // Replacing a sheet inside pointer dispatch can invalidate its processor list.
    // Finish dispatch before changing the scene graph, retaining single-release ownership.
    director.once(Director.EVENT_AFTER_UPDATE,()=>{if(!disposed&&hit.isValid&&hit.activeInHierarchy)action();});
  }};
  const suspend=():void=>{gesture.reset();resetMotion();};
  const activeChanged=():void=>{if(targetHit!==hit)targetHit.active=hit.activeInHierarchy;if(!hit.activeInHierarchy||!inner.activeInHierarchy)suspend();};
  const destroy=():void=>dispose(false);
  const dispose=(unwrap:boolean):void=>{
    if(disposed)return;disposed=true;suspend();
    targetHit.off(Node.EventType.TOUCH_START,start);targetHit.off(Node.EventType.TOUCH_MOVE,move);targetHit.off(Node.EventType.TOUCH_END,end);targetHit.off(Node.EventType.TOUCH_CANCEL,cancel);
    hit.off(Node.EventType.ACTIVE_IN_HIERARCHY_CHANGED,activeChanged);hit.off(Node.EventType.NODE_DESTROYED,destroy);
    if(inner!==hit){inner.off(Node.EventType.ACTIVE_IN_HIERARCHY_CHANGED,activeChanged);inner.off(Node.EventType.NODE_DESTROYED,destroy);}
    game.off(Game.EVENT_HIDE,suspend);pressBindings.delete(hit);
    if(unwrap&&inner.isValid&&parent.isValid){inner.setParent(parent);inner.setSiblingIndex(order);}
    if(targetHit!==hit&&targetHit.isValid)targetHit.destroy();
    if(motion.isValid)motion.destroy();
  };
  targetHit.on(Node.EventType.TOUCH_START,start);targetHit.on(Node.EventType.TOUCH_MOVE,move);targetHit.on(Node.EventType.TOUCH_END,end);targetHit.on(Node.EventType.TOUCH_CANCEL,cancel);
  hit.on(Node.EventType.ACTIVE_IN_HIERARCHY_CHANGED,activeChanged);hit.on(Node.EventType.NODE_DESTROYED,destroy);
  if(inner!==hit){inner.on(Node.EventType.ACTIVE_IN_HIERARCHY_CHANGED,activeChanged);inner.on(Node.EventType.NODE_DESTROYED,destroy);}
  game.on(Game.EVENT_HIDE,suspend);pressBindings.set(hit,()=>dispose(true));activeChanged();
}
export function opacity(n: Node, value: number): UIOpacity { const o = n.getComponent(UIOpacity) ?? n.addComponent(UIOpacity); o.opacity = value; return o; }
export function outlined(label:Label,color='#15352F',width=2):Label {
  const outline=label.node.getComponent(LabelOutline)??label.node.addComponent(LabelOutline);outline.color=new Color(color);outline.width=width;return label;
}
