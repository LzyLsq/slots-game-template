import {symbolBounds} from './SymbolBounds';
import {Node, UITransform, Sprite, SpriteFrame, Rect, Size, Vec4, Texture2D, EffectAsset, Material, resources, Color, Graphics, Label, LabelOutline, UIOpacity, Vec3, tween, Tween, Mask, EventTouch, Layers, EditBox, ScrollView} from 'cc';
export const C={ink:'#512731',gold:'#E9BC71',cream:'#FFF1D3',wine:'#461A2D',ivory:'#F5E2BC',line:'#BB874C'};
export function color(s:string){return new Color().fromHEX(s)}
export function group(parent:Node,name:string,x=0,y=0,w=0,h=0){const n=new Node(name);n.layer=Layers.Enum.UI_2D;parent.addChild(n);const u=n.addComponent(UITransform);u.setAnchorPoint(0,1);u.setContentSize(w,h);n.setPosition(x,-y);return n}
export function alpha(n:Node,value=255){const c=n.getComponent(UIOpacity)||n.addComponent(UIOpacity);c.opacity=value;return c}
let panelEffect:EffectAsset|null=null;
let panelTexture:SpriteFrame|null=null;
export function panel(p:Node,x:number,y:number,w:number,h:number,fill=C.wine,stroke=C.gold,r=18){
 const n=group(p,'Panel',x,y,w,h),decoration=group(n,'Material edge',0,0,w,h),g=decoration.addComponent(Graphics);r=Math.min(r,10);
 if(r>0){const shadow=group(n,'Material contact shadow',0,0,w,h),sg=shadow.addComponent(Graphics);shadow.setSiblingIndex(0);sg.fillColor=new Color(20,9,15,40);sg.roundRect(0,-h-4,w,h,r);sg.fill()}
 if(panelEffect&&panelTexture&&w>=90&&h>=24){
 const surface=group(n,'Woven material backing',0,0,w,h);surface.setSiblingIndex(r>0?1:0);
 const sprite=surface.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.spriteFrame=panelTexture;
 const mat=new Material();mat.initialize({effectAsset:panelEffect,defines:{USE_TEXTURE:true}});
 const c=color(fill);mat.setProperty('fabric',new Vec4(c.r/255,c.g/255,c.b/255,1));mat.setProperty('dimensions',new Vec4(w,h,r,0));sprite.customMaterial=mat;
 surface.once(Node.EventType.NODE_DESTROYED,()=>mat.destroy());
 }else{g.fillColor=color(fill);g.roundRect(0,-h,w,h,r);g.fill()}
 if(stroke){g.strokeColor=color(stroke);g.lineWidth=1;g.roundRect(.5,-h+.5,w-1,h-1,r);g.stroke();if(r>0){g.strokeColor=new Color(255,239,208,70);g.moveTo(r,-2);g.lineTo(w-r,-2);g.stroke()}}
 return n;
}
export function label(p:Node,value:string,x:number,y:number,w:number,h:number,size=22,fill=C.cream,bold=false,align=1){const n=group(p,'Text '+value.slice(0,20),x,y,w,h),l=n.addComponent(Label);l.string=value;l.fontSize=size;l.lineHeight=Math.ceil(size*1.3);l.color=color(fill);l.isBold=bold;l.horizontalAlign=align;l.verticalAlign=1;l.overflow=Label.Overflow.SHRINK;l.enableWrapText=true;l.fontFamily=bold?'Georgia':'Arial';return l}
export class TheatreArt{
 frames=new Map<string,SpriteFrame>();
 sheenEffect:EffectAsset|null=null; controlEffect:EffectAsset|null=null; cabinetEffect:EffectAsset|null=null; architectureEffect:EffectAsset|null=null; sheenEnabled=true;
 async loadEffect(){[this.sheenEffect,this.controlEffect,this.cabinetEffect,panelEffect,this.architectureEffect]=await Promise.all(['velvet-sheen','velvet-control','velvet-cabinet','velvet-fabric','velvet-architecture'].map(name=>new Promise<EffectAsset|null>(r=>resources.load('effects/'+name,EffectAsset,(e,a)=>r(e?null:a)))));if(!panelTexture){const texture=new Texture2D();texture.reset({width:2,height:2});texture.uploadData(new Uint8Array(16).fill(255));panelTexture=new SpriteFrame();panelTexture.texture=texture;panelTexture.packable=false}}
 shine(n:Node,phase=0,strength=.32){if(!this.sheenEffect||!this.sheenEnabled)return;const sprite=n.getComponent(Sprite);if(!sprite)return;let mat=n['velvetSheenMaterial'] as Material;if(!mat){mat=new Material();mat.initialize({effectAsset:this.sheenEffect,defines:{USE_TEXTURE:true}});n['velvetSheenMaterial']=mat;sprite.customMaterial=mat;n.once(Node.EventType.NODE_DESTROYED,()=>mat.destroy())}mat.setProperty('sheen',new Vec4(0,strength,phase,0))}

 architectureLight(n:Node){
 if(!this.architectureEffect||!this.sheenEnabled)return;const sprite=n.getComponent(Sprite);if(!sprite)return;
 const mat=new Material();mat.initialize({effectAsset:this.architectureEffect,defines:{USE_TEXTURE:true}});sprite.customMaterial=mat;n.once(Node.EventType.NODE_DESTROYED,()=>mat.destroy());
 }
 cabinetLight(n:Node,geo:{ry:number,rh:number,cy:number},mode:number){
 if(!this.cabinetEffect||!this.sheenEnabled)return;const sprite=n.getComponent(Sprite);if(!sprite)return;
 const mat=new Material();mat.initialize({effectAsset:this.cabinetEffect,defines:{USE_TEXTURE:true}});mat.setProperty('cabinet',new Vec4(geo.ry,geo.rh,geo.cy,mode));sprite.customMaterial=mat;n.once(Node.EventType.NODE_DESTROYED,()=>mat.destroy());return mat;
 }

 surface(p:Node,x:number,y:number,w:number,h:number,tone='#812338'){
 const n=group(p,'Enamel face',x,y,w,h);
 if(!this.controlEffect){panel(n,0,0,w,h,tone,C.gold,12);return n}
 const sprite=n.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;let white=this.frames.get('material-white');if(!white){const texture=new Texture2D();texture.reset({width:2,height:2});texture.uploadData(new Uint8Array(16).fill(255));white=new SpriteFrame();white.texture=texture;white.packable=false;this.frames.set('material-white',white)}sprite.spriteFrame=white;
 const mat=new Material();mat.initialize({effectAsset:this.controlEffect,defines:{USE_TEXTURE:true}});mat.setProperty('surface',new Vec4(w/h,0,(x+y)*.017,this.sheenEnabled?1:0));const c=color(tone);mat.setProperty('enamel',new Vec4(c.r/255,c.g/255,c.b/255,1));sprite.customMaterial=mat;n.once(Node.EventType.NODE_DESTROYED,()=>mat.destroy());return n;
 }
 async load(names:string[],onProgress?:(done:number,total:number)=>void){let done=0;const queue=Array.from(new Set(names));const count=queue.length;const worker=async()=>{while(queue.length){const name=queue.shift()!;if(!this.frames.has(name)){const tex=await new Promise<Texture2D>((resolve,reject)=>resources.load(`art/${name}/texture`,Texture2D,(err,t)=>err?reject(err):resolve(t)));tex.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);const sf=new SpriteFrame();sf.texture=tex;const bounds=symbolBounds[name];if(bounds){sf.rect=new Rect(...bounds);sf.originalSize=new Size(bounds[2],bounds[3])}sf.packable=!name.startsWith("cabinet")&&!name.startsWith("key-")&&!name.startsWith("title")&&name!=="brand"&&name!=="hall-final";this.frames.set(name,sf)}onProgress?.(++done,count)}};await Promise.all([worker(),worker(),worker()])}
 plate(p:Node,x:number,y:number,w:number,h:number){
  let sf=this.frames.get('theatre-plaque');if(!sf){const source=this.frames.get('cabinet0');if(!source)return panel(p,x,y,w,h,C.ivory,C.gold,16);sf=new SpriteFrame();sf.texture=source.texture;sf.rect=new Rect(134,514,670,104);sf.originalSize=new Size(670,104);sf.insetLeft=88;sf.insetRight=88;sf.insetTop=24;sf.insetBottom=24;sf.packable=false;this.frames.set('theatre-plaque',sf)}
  const frame=group(p,'Plaque edge',x,y,w,h),mask=frame.addComponent(Mask);mask.type=Mask.Type.GRAPHICS_STENCIL;const stencil=frame.getComponent(Graphics);stencil.clear();stencil.roundRect(0,-h,w,h,Math.min(16,h*.18));stencil.fill();const n=group(frame,'Carved gold plaque',0,0,w,h),sprite=n.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.type=Sprite.Type.SLICED;sprite.spriteFrame=sf;return frame;
 }
 image(p:Node,name:string,x:number,y:number,w:number,h:number,fit:'contain'|'cover'|'stretch'='contain'){const sf=this.frames.get(name);let frame:Node|null=null;if(fit==='cover'){frame=clip(p,name+' frame',x,y,w,h);p=frame;x=0;y=0}const n=group(p,name,x,y,w,h);if(!sf)return n;// Frame rect stays intrinsic when the texture is moved into a dynamic atlas.
const sw=sf.rect.width,sh=sf.rect.height;let iw=w,ih=h;if(fit!=='stretch'){const k=fit==='cover'?Math.max(w/sw,h/sh):Math.min(w/sw,h/sh);iw=sw*k;ih=sh*k}n.setPosition(x+(w-iw)/2,-y-(h-ih)/2);n.getComponent(UITransform)!.setContentSize(iw,ih);const s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;s.spriteFrame=sf;if(name==='brand'||name.startsWith('title')||name.startsWith('key-'))this.shine(n,name.length*.18,name.startsWith('key-')?.12:.20);return frame||n}
}
export function clip(p:Node,name:string,x:number,y:number,w:number,h:number,r=0){const n=group(p,name,x,y,w,h),mask=n.addComponent(Mask);mask.type=Mask.Type.GRAPHICS_RECT;return n}
export function bind(n:Node,fn:()=>void,enabled:()=>boolean=()=>true,face?:Node){
 const target=face||n,start=target.position.clone(),physical=target.name==='Physical key face';let dragged=false,pressed=false,down={x:0,y:0};
 const reset=()=>{if(!pressed)return;pressed=false;Tween.stopAllByTarget(target);tween(target).to(.26,{scale:Vec3.ONE,position:start},{easing:'sineOut'}).start()};
 n.on(Node.EventType.TOUCH_START,(e:EventTouch)=>{if(!enabled())return;pressed=true;dragged=false;down=e.getUILocation();Tween.stopAllByTarget(target);const u=target.getComponent(UITransform)!;
 // A physical face descends into a stationary socket. Artwork/card taps only compress gently.
 tween(target).to(.10,{scale:new Vec3(face?.992:.988,face?.985:.988,1),position:new Vec3(start.x+u.width*(face?.004:.006),start.y-(physical?5:face?3:u.height*.006))},{easing:'quadOut'}).start()});
 n.on(Node.EventType.TOUCH_MOVE,(e:EventTouch)=>{const p=e.getUILocation();if(Math.hypot(p.x-down.x,p.y-down.y)>16){dragged=true;reset()}});n.on(Node.EventType.TOUCH_CANCEL,reset);
 n.on(Node.EventType.TOUCH_END,()=>{const active=pressed;reset();if(active&&!dragged&&enabled())fn()});
}
export function button(art:TheatreArt,p:Node,title:string,x:number,y:number,w:number,h:number,fn:()=>void,icon='ui15',dark=false){
 const n=group(p,title,x,y,w,h),socket=group(n,'Fixed button socket',0,5,w,h-5),g=socket.addComponent(Graphics);
 g.fillColor=new Color(69,34,28,65);g.roundRect(2,-h+2,w-4,h-10,Math.min(18,h*.27));g.fill();g.fillColor=new Color(132,91,49,255);g.roundRect(3,-h+5,w-6,h-9,Math.min(18,h*.27));g.fill();
 const face=art.surface(n,0,0,w,h-6,dark?'#694252':'#F2DBAC');const d=Math.min(36,h-24);art.image(face,icon,19,(h-6-d)/2,d,d);
 label(face,title,d+31,1,w-d-52,h-8,Math.min(23,h*.3),dark?C.cream:C.ink,true);bind(n,fn,()=>true,face);return n;
}
/** Original themed key art above a stationary milled bezel. */
export function cabinetKey(art:TheatreArt,p:Node,name:string,m:number,index:number,x:number,y:number,w:number,h:number,fn:()=>void,enabled:()=>boolean){
 const n=group(p,name,x,y,w,h),diam=Math.min(w-12,h-(index===0?17:25))*(index===1?.80:1),cx=w/2,cy=diam/2+3;
 const base=group(n,'Fixed brass socket',0,0,w,h),g=base.addComponent(Graphics);
 for(let i=5;i>0;i--){g.fillColor=new Color(80,44,28,10+i*3);g.ellipse(cx,-cy-6,diam/2+i,diam*.44+i);g.fill()}
 g.fillColor=color('#A8773F');g.ellipse(cx,-cy-5,diam/2,diam*.45);g.fill();g.strokeColor=color('#EDD29A');g.lineWidth=2;g.ellipse(cx,-cy-4,diam/2-1,diam*.44);g.stroke();
 // Theme-specific engraving stays fixed while the enamel face is pressed.
 if(index===0){const ornament=group(base,'Theme socket engraving',cx,cy,diam,diam),og=ornament.addComponent(Graphics);og.lineWidth=1.5;og.strokeColor=new Color(157,109,57,160);
 const petals=[8,4,12,6][m];for(let k=0;k<petals;k++){const a=k*Math.PI*2/petals,r=diam*.52;og.moveTo(Math.cos(a)*r,Math.sin(a)*r);og.lineTo(Math.cos(a)*(r+4),Math.sin(a)*(r+4));og.stroke()}}
 // The engraved outer frame is bolted to the console; only the enamel centre travels.
 art.image(base,`key-${m}-${index}`,(w-diam)/2,0,diam,diam);
 const aperture=group(n,'Inset key aperture',0,0,w,h),mask=aperture.addComponent(Mask);mask.type=Mask.Type.GRAPHICS_STENCIL;
 const stencil=aperture.getComponent(Graphics)!;stencil.clear();stencil.circle(cx,-diam/2,diam*.358);stencil.fill();
 const face=group(aperture,'Physical key face',0,0,w,h);const image=art.image(face,`key-${m}-${index}`,(w-diam)/2,0,diam,diam);
 // Reflection is clipped to the original enamel; the bolted rim stays still.
 art.shine(image,m*.8+index*1.35,index===0?.34:.22);
 if(art.sheenEnabled){const rim=group(base,'Warm rim reflection',cx,cy,diam,diam),gl= rim.addComponent(Graphics);gl.lineWidth=2;gl.strokeColor=new Color(255,227,168,150);gl.arc(0,0,diam*.485,.12,1.05,false);gl.stroke();if(index===0)tween(rim).by(9+m*.6,{angle:360}).union().repeatForever().start();const op=alpha(rim,55);tween(op).delay(index*.8).to(1.8,{opacity:180},{easing:'sineInOut'}).to(2.8,{opacity:45},{easing:'sineInOut'}).delay(1.5).union().repeatForever().start()}
 bind(n,fn,enabled,face);return {node:n,face,image};
}
export function float(n:Node,seconds=5,amount=5){const p=n.position.clone();tween(n).to(seconds/2,{position:new Vec3(p.x,p.y+amount)},{easing:'sineInOut'}).to(seconds/2,{position:p},{easing:'sineInOut'}).union().repeatForever().start()}
export function fadeIn(n:Node,seconds=.35){const a=alpha(n,0);tween(a).to(seconds,{opacity:255},{easing:'sineOut'}).start()}
export function input(p:Node,value:string,x:number,y:number,w:number,h:number){const n=panel(p,x,y,w,h,'#FFF5DC',C.line,12);const holder=label(n,'Royal Guest',15,0,w-30,h,24,'#A08472'),text=label(n,value,15,0,w-30,h,24,C.ink);n.active=false;const e=n.addComponent(EditBox);e.textLabel=text;e.placeholderLabel=holder;e.string=value;e.maxLength=18;e.inputMode=EditBox.InputMode.SINGLE_LINE;e.returnType=EditBox.KeyboardReturnType.DONE;n.active=true;text.verticalAlign=Label.VerticalAlign.CENTER;holder.verticalAlign=Label.VerticalAlign.CENTER;return e}
export function scroll(p:Node,x:number,y:number,w:number,h:number,contentH:number){const n=group(p,'Scroll',x,y,w,h),v=clip(n,'Viewport',0,0,w,h),content=group(v,'Content',0,0,w,contentH),s=n.addComponent(ScrollView);s.content=content;s.horizontal=false;s.vertical=true;s.elastic=true;s.inertia=true;s.brake=.72;return {node:n,content,view:s}}
