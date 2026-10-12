import {canonicalPortraitIndex} from './PortraitCatalog';
import {uniqueArtNames} from './ArtLoadQueue';
import {pressFeedback,type PressCue} from './PressFeedback';
import {TextFit} from './TextFit';
import {containTextBox,plateSections,plateTextBox,type TextBox} from './TextLayout';
const artworkTextBounds=new WeakMap<Node,TextBox>();
import {CABINET_ROOM_WIDTH,CABINET_ROOM_HEIGHT,cabinetRoomStrips,type CabinetGeometry} from './CabinetGeometry';
import {SYMBOL_CROPS} from './SymbolCrop';
import {cabinetSceneTiles,type SceneTransform} from './CabinetScene';
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
    const unique = uniqueArtNames(names);
    const queue = [...unique];
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
        progress?.(++done, unique.length);
      }
    };
    await Promise.all([worker(), worker()]);
  }
  public frame(name: string, index = -1): SpriteFrame {
    // Canonicalize before caching so header, account and rankings share one image.
    if (name === 'portraits' && index >= 0) index = canonicalPortraitIndex(index);
    const key = `${name}:${index}`; const cached = this.frames.get(key); if (cached) return cached;
    const texture = this.textures.get(name); if (!texture) throw new Error(`Art not loaded: ${name}`);
    let cols = 1, rows = 1;
    if (index >= 0) {
      if (name === 'titles') { cols = 2; rows = 3; }
      else if (name === 'exhibits' || name === 'surfaces' || name === 'ledgers' || name === 'optics' || name === 'award-optics') { cols = 2; rows = 2; }
      else { cols = 4; rows = 4; }
    }
    const w = texture.width / cols, h = texture.height / rows;
    const sf = new SpriteFrame(); sf.texture = texture;
    sf.rect = new Rect(index < 0 ? 0 : index % cols * w, index < 0 ? 0 : Math.floor(index / cols) * h, w, h);
    sf.originalSize = new Size(w, h); sf.packable = false;
    const crop=SYMBOL_CROPS[name.replace(/-blur$/, '')]?.[index];
    if(crop){sf.rect=new Rect(index%cols*w+crop[0],Math.floor(index/cols)*h+crop[1],crop[2],crop[3]);sf.originalSize=new Size(crop[2],crop[3]);}
    if(name==='titles'&&index>=0){
      // Tight, measured alpha bounds: keep lettering proportional without
      // shrinking it to accommodate unused atlas padding.
      const bounds=[[57,70,710,271],[99,41,669,300],[110,41,657,300],[117,36,651,305],[133,32,634,309],[57,80,710,262]][index];
      sf.rect=new Rect(index%cols*w+bounds[0],Math.floor(index/cols)*h+bounds[1],bounds[2]-bounds[0],bounds[3]-bounds[1]);
      sf.originalSize=new Size(sf.rect.width,sf.rect.height);
    }
    if(/^gala-title-[0-3]$/.test(name)){
      // Measured transparent 10px border only; preserve every ornament/letter.
      sf.rect=new Rect(10,10,w-20,h-20);sf.originalSize=new Size(w-20,h-20);
    }
    if(name.startsWith('gala-soft-plate-')){sf.insetTop=sf.insetBottom=30;sf.insetLeft=sf.insetRight=65;}
    if(name.startsWith('gala-plate-')){sf.insetTop=sf.insetBottom=16;sf.insetLeft=sf.insetRight=46;}
    if(name.startsWith('gala-frame-')){sf.insetTop=sf.insetBottom=80;sf.insetLeft=sf.insetRight=60;}
    if (name === 'surfaces') { sf.insetTop = sf.insetBottom = sf.insetLeft = sf.insetRight = 56; }
    if (name.startsWith('win-frame-')) { sf.insetTop=93;sf.insetBottom=92;sf.insetLeft=75;sf.insetRight=76; }
    if (name === 'ledgers') { sf.insetTop=sf.insetBottom=20;sf.insetLeft=sf.insetRight=38; }
    this.frames.set(key, sf); return sf;
  }
  public image(parent: Node, name: string, x: number, y: number, w: number, h: number, index = -1): Node {
    if (name.startsWith('gala-soft-plate-') && index === -1) return this.sculptedPlate(parent, name, x, y, w, h);
    const n = box(parent, name, x, y, w, h); const s = n.addComponent(Sprite);
    // Set CUSTOM before the frame: RAW would overwrite the authored hit/layout box.
    s.sizeMode = Sprite.SizeMode.CUSTOM; s.spriteFrame = this.frame(name, index);
    if (name.startsWith('gala-frame-') || name.startsWith('win-frame-') || name === 'surfaces' || name === 'ledgers' || (name.startsWith('gala-plate-')||name.startsWith('gala-soft-plate-'))) s.type = Sprite.Type.SLICED;
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
  /** The same integrated room texture is sampled continuously. Source crops
   * and interactive geometry share one extension; no floating replacement bezel. */
  public cabinetRoom(parent:Node,name:string,base:CabinetGeometry,extension:number):Node {
    const room=box(parent,'Continuous cabinet room',0,0,CABINET_ROOM_WIDTH,CABINET_ROOM_HEIGHT);
    const texture=this.frame(name).texture;
    // No section seams at all for the authored, unextended cabinet.
    if(extension===0){this.image(room,name,0,0,CABINET_ROOM_WIDTH,CABINET_ROOM_HEIGHT);return room;}
    for(const [i,part] of cabinetRoomStrips(base,extension).entries()){
      const key=`${name}:glass-section-${i}`;let frame=this.frames.get(key);
      if(!frame){frame=new SpriteFrame();frame.texture=texture;
        frame.rect=new Rect(0,part.sourceY,CABINET_ROOM_WIDTH,part.sourceHeight);
        frame.originalSize=new Size(CABINET_ROOM_WIDTH,part.sourceHeight);frame.packable=false;this.frames.set(key,frame);}
      const n=box(room,`Integrated glass section ${i}`,0,CABINET_ROOM_HEIGHT/2-part.destY-part.destHeight/2,CABINET_ROOM_WIDTH,part.destHeight);
      const sprite=n.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.spriteFrame=frame;
    }
    return room;
  }
  /** Fill only the uncovered perimeter using outpainted architecture. These
   * sprites inherit the cabinet transform: no second full-screen machine,
   * blur, detached background camera or scale change on the interactive art. */
  public fitCabinetRoom(room:Node,name:string,w:number,h:number,transform:SceneTransform):void {
    let perimeter=room.getChildByName('Continuous scene perimeter');
    if(!perimeter){perimeter=box(room,'Continuous scene perimeter',0,0,CABINET_ROOM_WIDTH,CABINET_ROOM_HEIGHT);perimeter.setSiblingIndex(0);}
    const tiles=cabinetSceneTiles(w,h,transform);
    for(const existing of perimeter.children)existing.active=false;
    for(const tile of tiles){
      let n=perimeter.getChildByName(tile.name);
      if(!n){n=box(perimeter,tile.name,0,0,1,1);const sprite=n.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;
        const frame=new SpriteFrame();frame.texture=this.frame(tile.texture==='scenery'?name.replace(/-tall$/, '-scenery'):name).texture;frame.packable=false;sprite.spriteFrame=frame;
        n.once(Node.EventType.NODE_DESTROYED,()=>frame.destroy());}
      n.active=true;
      const [sx,sy,sw,sh]=tile.source,[dx,dy,dw,dh]=tile.destination;
      const frame=n.getComponent(Sprite)!.spriteFrame!;
      frame.rect=new Rect(sx,sy,sw,sh);frame.originalSize=new Size(sw,sh);
      n.getComponent(UITransform)!.setContentSize(dw,dh);
      n.setPosition(dx+dw/2-CABINET_ROOM_WIDTH/2,CABINET_ROOM_HEIGHT/2-dy-dh/2);
      n.setScale(tile.flipX?-1:1,tile.flipY?-1:1,1);
    }
  }
  public light(parent: Node, index:number, x:number,y:number,w:number,h:number,alpha=120,atlas='optics'):Node {
    const n=this.image(parent,atlas,x,y,w,h,index);const s=n.getComponent(Sprite)!;
    // Public material API; Sprite's old blend-factor fields are private in 3.8.
    s.getMaterialInstance(0)?.overridePipelineStates({blendState:{targets:[{blend:true,blendSrc:gfx.BlendFactor.SRC_ALPHA,blendDst:gfx.BlendFactor.ONE,blendSrcAlpha:gfx.BlendFactor.ZERO,blendDstAlpha:gfx.BlendFactor.ONE}]}});
    opacity(n,alpha);return n;
  }
  public panel(parent: Node, x: number, y: number, w: number, h: number, style = 0): Node { return this.image(parent, (h>w*.5?'gala-frame-':'gala-soft-plate-')+[0,1,2,3][style], x,y,w,h); }
  /** Three-part bitmap construction keeps the engraved ends in physical scale.
   * The long uninterrupted enamel centre expands, not the relief or jewel. */
  private sculptedPlate(parent: Node, name: string, x: number, y: number, w: number, h: number): Node {
    const source=this.frame(name),base=source.rect;
    const plate=box(parent,name,x,y,w,h);
    artworkTextBounds.set(plate,plateTextBox(w,h));
    plateSections(w,h,base.width,base.height).forEach(({sourceX:srcX,sourceWidth:srcW,width:destW,x:dx},i)=>{
      const key=`${name}:relief-${i}`;let part=this.frames.get(key);
      if(!part){part=new SpriteFrame();part.texture=source.texture;part.rect=new Rect(base.x+srcX,base.y,srcW,base.height);
        part.originalSize=new Size(srcW,base.height);part.packable=false;this.frames.set(key,part);}
      const node=box(plate,`Engraved plate section ${i}`,dx,0,destW,h);
      const sprite=node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.spriteFrame=part;
    });
    return plate;
  }
  public awardPlate(parent: Node, x: number, y: number, w: number, h: number): Node {
    return this.sculptedPlate(parent,'gala-soft-plate-0',x,y,w,h);
  }
  public button(parent: Node, name: string, x: number, y: number, w: number, h: number, label: string, icon: number | undefined, action: () => void, style = 3): Node {
    const hit = box(parent, name, x, y, w, h);
    // The image icon already includes a sculpted gold rim. A second square
    // panel underneath produced stacked, distorted button frames.
    const inner = icon!==undefined&&!label?box(hit,'Icon face',0,0,w,h):label&&w>h*2?this.sculptedPlate(hit,'gala-button-'+[4,5,6,7][style],0,0,w,h):this.panel(hit,0,0,w,h,style);
    // Each material plate has a generated engraved emblem on its left shoulder.
    // A second icon over it concealed that detail and pushed copy into the rim.
    if (icon !== undefined && !label) this.image(inner, 'gala-button-'+icon, 0, 0, w * .9, h * .9);
    if (label) {
      // Keep copy in the quiet center of the engraved plate. The old fixed
      // left inset put long labels on top of the bezel and made small screens
      // look clipped; TextFit now owns the final size inside a safe inset.
      const area=plateTextBox(w,h);
      const caption=outlined(text(inner,label,area.x,area.y,area.width,area.height,Math.min(48,h*.38),style===2?COLORS.ink:COLORS.cream),style===2?'#FFF7E8':'#2B1C20',style===2?.5:1.5);
      caption.enableWrapText=false;caption.node.getComponent(TextFit)!.compactLine=true;
      caption.node.getComponent(TextFit)!.fit();
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
  if(parent.name==='Enamel dialog'){const frame=parent.getComponent(UITransform);if(frame){w=Math.max(16,Math.min(w,frame.width*.84-2*Math.abs(x)));h=Math.max(16,Math.min(h,frame.height-90-2*Math.abs(y)));}}
  const bounds=artworkTextBounds.get(parent);
  if(bounds){const seat=containTextBox({x,y,width:w,height:h},bounds);x=seat.x;y=seat.y;w=seat.width;h=seat.height;}
  const n = box(parent, `Text:${value.slice(0, 28)}`, x, y, w, h); const l = n.addComponent(Label);
  l.string = raw ? value : tr(value); l.fontSize = size; l.lineHeight = size * 1.25; l.fontFamily = display ? 'Arial Black' : 'Arial'; l.isBold = true;
  // The dialog artwork is green enamel, not white parchment.
  if(parent.name==='Enamel dialog'&&(color===COLORS.ink||color===COLORS.jade)){color=color===COLORS.jade?COLORS.gold:COLORS.cream;outlined(l,'#223B30',2);}
  l.color = new Color(color); l.horizontalAlign = Label.HorizontalAlign.CENTER; l.verticalAlign = Label.VerticalAlign.CENTER;
  // CHAR shares a dynamic glyph atlas across pages. Destroying a label-heavy
  // profile page while creating the login form can evict glyphs that the new
  // labels still reference, leaving blank buttons until a full reload.
  // Per-label textures cost a few draw calls but keep auth copy deterministic.
  l.overflow = Label.Overflow.SHRINK; l.enableWrapText = true; l.cacheMode = Label.CacheMode.NONE; const fit=n.addComponent(TextFit);fit.contentBounds=bounds;return l;
}
export function bindPress(hit: Node, inner: Node, action: () => void, feel:{depth?:number;compression?:number;release?:number;tilt?:number;instant?:boolean;cue?:PressCue;onContact?:()=>void}={}): void {
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
    if(!motion.isValid)return;
    response=feel.instant?tween(motion).to(feel.release??.12,target(1),{easing:'quadOut'}).start()
      :tween(motion).to(.10,target(1.008,-.5),{easing:'quadOut'}).to(Math.max(.16,feel.release??.2),target(1),{easing:'sineInOut'}).start();
  };
  surface.on(Node.EventType.TOUCH_START,(event:EventTouch)=>{
    if(event.target!==surface||pressed||!hit.activeInHierarchy)return;
    const point=event.getUILocation();startX=point.x;startY=point.y;touchId=event.getID();
    pressed=true;response?.stop();
    // A physical key responds on contact, not after a slow finger release.
    feel.onContact?.();
    globalThis.dispatchEvent?.(new CustomEvent('aurelia-ui-press',{detail:pressFeedback(hit.name,feel.cue)}));
    const down=target(Math.max(.88,Math.min(1,feel.compression??.92)),feel.depth??6);
    if(feel.instant){motion.setPosition(down.position);motion.setScale(down.scale);motion.angle=down.angle;}
    else response=tween(motion).to(.065,down,{easing:'quadOut'}).start();
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
