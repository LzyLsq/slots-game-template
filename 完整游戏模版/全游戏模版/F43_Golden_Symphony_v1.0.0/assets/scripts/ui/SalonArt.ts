import {TextFit} from './TextFit';
import {SYMBOL_CROPS,ART_CROPS,SINGLE_ART_CROPS} from './SymbolCrop';
import {tr,language} from './Language';
import { Color, EventTouch, gfx, Graphics, Label, LabelOutline, Layers, Mask, Node, Rect, resources, Size, Sprite, SpriteFrame, Texture2D, tween, Tween, UIOpacity, UITransform, Vec3 } from 'cc';
export const COLORS = { cream: '#FFF8E7', gold: '#FFD988', jade: '#214D57', ink: '#4B362A', coral: '#ED967C' };
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
    if (name === 'interfaces' && index >= 0) return this.frame('interface-'+index);
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
    const crop=(SYMBOL_CROPS[name.replace(/-blur$/, '')]??ART_CROPS[name])?.[index];
    if(crop){sf.rect=new Rect(index%cols*w+crop[0],Math.floor(index/cols)*h+crop[1],crop[2],crop[3]);sf.originalSize=new Size(crop[2],crop[3]);}
    const single=index<0?SINGLE_ART_CROPS[name]:undefined;
    if(single){sf.rect=new Rect(single[0],single[1],single[2],single[3]);sf.originalSize=new Size(single[2],single[3]);}
    if(name==='titles'&&index>=0){
      // Tight, measured alpha bounds: keep lettering proportional without
      // shrinking it to accommodate unused atlas padding.
      const bounds=[[57,70,710,271],[99,41,669,300],[110,41,657,300],[117,36,651,305],[133,32,634,309],[57,80,710,262]][index];
      sf.rect=new Rect(index%cols*w+bounds[0],Math.floor(index/cols)*h+bounds[1],bounds[2]-bounds[0],bounds[3]-bounds[1]);
      sf.originalSize=new Size(sf.rect.width,sf.rect.height);
    }
    if(name.startsWith('canopy-soft-plate-')){sf.insetTop=sf.insetBottom=Math.round(h*.32);sf.insetLeft=sf.insetRight=Math.round(w*.27);}
    if(name.startsWith('canopy-plate-')){sf.insetTop=sf.insetBottom=16;sf.insetLeft=sf.insetRight=46;}
    if(name==='ledger-frame-room'){sf.insetTop=sf.insetBottom=Math.round(h*.12);sf.insetLeft=sf.insetRight=Math.round(w*.14);}
    if(name.startsWith('canopy-frame-')){sf.insetTop=sf.insetBottom=sf.insetLeft=sf.insetRight=64;}
    if (name === 'surfaces') { sf.insetTop = sf.insetBottom = sf.insetLeft = sf.insetRight = 56; }
    if (name.startsWith('win-frame-')) { sf.insetTop=sf.insetBottom=44;sf.insetLeft=sf.insetRight=44; }
    if (name === 'ledgers') { sf.insetTop=sf.insetBottom=20;sf.insetLeft=sf.insetRight=38; }
    this.frames.set(key, sf); return sf;
  }
  public image(parent: Node, name: string, x: number, y: number, w: number, h: number, index = -1): Node {


    if (name.startsWith('canopy-soft-plate-')) {
      const frame=this.frame(name,index),scale=Math.min(h/frame.rect.height,w/frame.rect.width);
      const n=box(parent,name,x,y,w,h),paint=box(n,'Painted material',0,0,w/scale,h/scale);
      const sprite=paint.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;
      sprite.spriteFrame=frame;sprite.type=Sprite.Type.SLICED;
      // Source borders are pixels, not layout units. Scale the entire sliced
      // material first so shoulder ornaments keep their painted proportions.
      paint.getComponent(UITransform)!.setContentSize(w/scale,h/scale);paint.setScale(scale,scale,1);
      return n;
    }
    const n = box(parent, name, x, y, w, h); const s = n.addComponent(Sprite);
    // Set CUSTOM before the frame: RAW would overwrite the authored hit/layout box.
    s.sizeMode = Sprite.SizeMode.CUSTOM; s.spriteFrame = this.frame(name, index);
    if (name==='ledger-frame-room' || name.startsWith('canopy-frame-') || name.startsWith('win-frame-') || name === 'surfaces' || name === 'ledgers' || (name.startsWith('canopy-plate-')||name.startsWith('canopy-soft-plate-'))) s.type = Sprite.Type.SLICED;
    else {
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
  /** A proportional carved rail from the existing hall frame, not an empty label plate. */
  public selectionRail(parent:Node,x:number,y:number,width:number):Node {
    const key='hall-selection-carved-rail';let frame=this.frames.get(key);
    if(!frame){
      const source=this.frame('canopy-frame-0'),rect=source.rect;
      const top=Math.round(rect.height*.77),height=rect.height-top;
      frame=new SpriteFrame();frame.texture=source.texture;
      frame.rect=new Rect(rect.x,rect.y+top,rect.width,height);
      frame.originalSize=new Size(rect.width,height);frame.packable=false;
      this.frames.set(key,frame);
    }
    const height=width*frame.rect.height/frame.rect.width;
    const node=box(parent,'Selected carved gold rail',x,y,width,height),sprite=node.addComponent(Sprite);
    sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.spriteFrame=frame;
    node.getComponent(UITransform)!.setContentSize(width,height);return node;
  }
  public panel(parent: Node, x: number, y: number, w: number, h: number, style = 0): Node {
    if(h<=w*.5)return this.image(parent,'canopy-soft-plate-'+[2,1,2,3][style],x,y,w,h);
    const ledger=box(parent,'Expedition parchment ledger',x,y,w,h);
    // A real commissioned material fills the border's transparent interior.
    // The page remains legible without washing out the whole environment.
    this.image(ledger,'ledger-frame-room',0,0,w,h);
    return ledger;
  }
  /** Keep the ornamental shoulders and the small center jewels at their
   * painted proportions. Only straight enamel runs expand across wide plates. */
  private sculptedPlate(parent: Node, name: string, x: number, y: number, w: number, h: number): Node {
    const source=this.frame(name);
    // Cuts are relative to each artwork's painted bounds, not its transparent
    // 512px shipping canvas. The first shoulder differs by theme.
    return this.image(parent,name,x,y,w,h);
  }
  public awardPlate(parent: Node, x: number, y: number, w: number, h: number): Node {
    return this.sculptedPlate(parent,'canopy-soft-plate-2',x,y,w,h);
  }
  public button(parent: Node, name: string, x: number, y: number, w: number, h: number, label: string, icon: number | undefined, action: () => void, style = 3): Node {
    const hit = box(parent, name, x, y, w, h);
    // The image icon already includes a sculpted gold rim. A second square
    // panel underneath produced stacked, distorted button frames.
    const inner = icon!==undefined&&!label?box(hit,'Icon face',0,0,w,h):label&&w>h*2?this.sculptedPlate(hit,'canopy-soft-plate-'+[2,1,2,3][style],0,0,w,h):this.panel(hit,0,0,w,h,style);
    // Each material plate has a commissioned emblem on its left shoulder.
    // A second icon over it concealed that detail and pushed copy into the rim.
    if (icon !== undefined && !label) this.image(inner, 'interfaces', 0, 0, w * .9, h * .9, icon);
    if (label) {
      // Keep copy in the quiet center of the engraved plate. The old fixed
      // left inset put long labels on top of the bezel and made small screens
      // look clipped; TextFit now owns the final size inside a safe inset.
      const compact=w<=420;
      // The plate's enamel center is symmetric. The old rightward copy offset
      // made every caption look displaced, especially on narrow phones.
      const copyX=0,copyWidth=Math.max(20,w*(compact?.70:.72)),copyHeight=Math.max(24,h*.84);
      const darkCopy=style===0||style===2||style===3;
      const caption=outlined(text(inner, label, copyX, 0, copyWidth, copyHeight, Math.min(52,Math.max(36,h*.44)), darkCopy?(style===3?'#153B32':COLORS.ink):COLORS.cream), darkCopy?'#FFF1D3':'#2B1C20', 1);
      caption.enableWrapText=false;caption.overflow=Label.Overflow.SHRINK;
      caption.node.getComponent(UITransform)?.setContentSize(copyWidth,copyHeight);
    }
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
  l.string = raw ? value : tr(value); l.fontSize = size; l.lineHeight = size * 1.25; l.fontFamily = display ? 'Arial Black' : 'Arial'; l.isBold = true;
  l.color = new Color(color); l.horizontalAlign = Label.HorizontalAlign.CENTER; l.verticalAlign = Label.VerticalAlign.CENTER;
  // CHAR shares a dynamic glyph atlas across pages. Destroying a label-heavy
  // profile page while creating the login form can evict glyphs that the new
  // labels still reference, leaving blank buttons until a full reload.
  // Per-label textures cost a few draw calls but keep auth copy deterministic.
  l.overflow = Label.Overflow.SHRINK; l.enableWrapText = true; l.cacheMode = Label.CacheMode.NONE; n.addComponent(TextFit); return l;
}
let pressFeedback: ((hit: Node) => void) | undefined;
export function setPressFeedback(feedback: (hit: Node) => void): void { pressFeedback=feedback; }
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
    if(motion.isValid)response=tween(motion).to(.10,target(1.008,-.5),{easing:'quadOut'}).to(Math.max(.16,feel.release??.2),target(1),{easing:'sineInOut'}).start();
  };
  surface.on(Node.EventType.TOUCH_START,(event:EventTouch)=>{
    if(event.target!==surface||pressed||!hit.activeInHierarchy)return;
    const point=event.getUILocation();startX=point.x;startY=point.y;touchId=event.getID();
    pressed=true;response?.stop();
    response=tween(motion).to(.065,target(Math.max(.85,Math.min(1,feel.compression??.92)),feel.depth??6),{easing:'quadOut'}).start();
  });
  surface.on(Node.EventType.TOUCH_MOVE,(event:EventTouch)=>{
    if(!pressed||event.getID()!==touchId)return;const point=event.getUILocation();
    if(Math.hypot(point.x-startX,point.y-startY)>36)restore();
  });
  surface.on(Node.EventType.TOUCH_CANCEL,(event:EventTouch)=>{if(event.target===surface&&event.getID()===touchId)restore();});
  surface.on(Node.EventType.TOUCH_END,(event:EventTouch)=>{
    if(event.target!==surface||event.getID()!==touchId)return;
    const run=pressed&&hit.activeInHierarchy;restore();if(run){pressFeedback?.(hit);action();}
  });
}
/** One translucent layer, feathered on both axes; no stacked dark plates. */
export function featheredReadingShade(graphics:Graphics,width:number,height:number,tone:readonly [number,number,number],peak:number):void {
  graphics.clear();
  const columns=40,rows=24,dx=width/columns,dy=height/rows;
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
    const x=(column+.5)/columns,y=(row+.5)/rows;
    const alpha=Math.round(peak*Math.pow(Math.sin(Math.PI*x),.65)*Math.pow(Math.sin(Math.PI*y),1.2));
    if(!alpha)continue;
    graphics.fillColor=new Color(tone[0],tone[1],tone[2],alpha);
    graphics.rect(-width/2+column*dx,-height/2+row*dy,dx,dy);graphics.fill();
  }
}
export function opacity(n: Node, value: number): UIOpacity { const o = n.getComponent(UIOpacity) ?? n.addComponent(UIOpacity); o.opacity = value; return o; }
export function outlined(label:Label,color='#15352F',width=2):Label {
  const outline=label.node.getComponent(LabelOutline)??label.node.addComponent(LabelOutline);outline.color=new Color(color);outline.width=width;return label;
}
