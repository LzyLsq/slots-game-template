import {Graphics,Layers,Mask,Node,Rect,Size,Sprite,SpriteFrame,UITransform} from 'cc';

/** Reward-only bitmap plaques, taken from THIS game's existing artwork.
 * End carvings keep uniform scale. Only the quiet middle strip is extended.
 * Frames are cached per provider; no allocations occur in animation updates.
 */
export type RewardPlateKind='title'|'detail'|'amount'|'button'|'compact';
interface ArtProvider {frame(name:string,index?:number):SpriteFrame;}
interface ArtworkSpec {source:string;bounds:readonly number[];ink:string;atlas?:string;ornaments?:readonly number[];outline?:readonly (readonly number[])[];centreStrip?:readonly number[];}
const ARTWORK:readonly ArtworkSpec[]=__ARTWORK_SPECS__;
const cache=new WeakMap<ArtProvider,Map<string,SpriteFrame>>();
const themeIndex=(theme:number):number=>Number.isFinite(theme)?Math.max(0,Math.min(3,Math.trunc(theme))):0;
export const rewardInk=(theme:number):string=>ARTWORK[themeIndex(theme)].ink;
export const rewardOutline=(theme:number):string=>rewardInk(theme)==='#FFF1CE'?'#322317':'#FFF3DC';
export const rewardTextWidth=(width:number):number=>width*.66;
function node(parent:Node,name:string,x:number,y:number,w:number,h:number):Node{
  const n=new Node(name);n.layer=Layers.Enum.UI_2D;parent.addChild(n);n.addComponent(UITransform).setContentSize(w,h);n.setPosition(x,y);return n;
}
function frame(art:ArtProvider,spec:ArtworkSpec,part:number):SpriteFrame{
  let frames=cache.get(art);if(!frames){frames=new Map();cache.set(art,frames);}
  const key=spec.source+':'+spec.bounds.join(',')+':'+part;const old=frames.get(key);if(old)return old;
  const original=art.frame(spec.source),[x,y,w,h]=spec.bounds,cap=Math.floor(w*.30);
  const left=part===0?0:part===1?cap:w-cap,width=part===1?w-2*cap:cap;
  const f=new SpriteFrame();f.texture=original.texture;
  const strip=part===1?spec.centreStrip:undefined;
  f.rect=strip?new Rect(original.rect.x+strip[0],original.rect.y+strip[1],strip[2],strip[3]):new Rect(original.rect.x+x+left,original.rect.y+y,width,h);f.originalSize=new Size(f.rect.width,f.rect.height);f.packable=false;
  frames.set(key,f);return f;
}
function image(parent:Node,f:SpriteFrame,x:number,w:number,h:number,name:string):void{
  const n=node(parent,name,x,0,w,h),s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;s.spriteFrame=f;
}
export function rewardArtwork(art:ArtProvider,parent:Node,x:number,y:number,w:number,h:number,theme=0,kind:RewardPlateKind='detail'):Node{
  const spec=ARTWORK[themeIndex(theme)],root=node(parent,'Theme artwork · '+kind,x,y,w,h);
  const sourceWidth=spec.bounds[2],sourceHeight=spec.bounds[3];
  const scale=Math.min(h/sourceHeight,w/sourceWidth),height=sourceHeight*scale,cap=Math.floor(sourceWidth*.30)*scale;
  // Stencil is used only for artwork with an opaque surrounding background.
  // The source bitmap is unchanged. Text and touch bounds stay outside this mask.
  const face=spec.outline?node(root,'Original artwork silhouette',0,0,w,height):root;
  if(spec.outline){
    face.addComponent(Mask).type=Mask.Type.GRAPHICS_STENCIL;
    const g=face.getComponent(Graphics)!;g.clear();
    const sx=(u:number):number=>u<=.3?-w/2+u/.3*cap:u>=.7?w/2-(1-u)/.3*cap:-w/2+cap+(u-.3)/.4*(w-cap*2);
    spec.outline.forEach(([u,v],i)=>i===0?g.moveTo(sx(u),(0.5-v)*height):g.lineTo(sx(u),(0.5-v)*height));g.close();g.fill();
  }
  image(face,frame(art,spec,0),-w/2+cap/2,cap,height,'Original left carving');
  image(face,frame(art,spec,1),0,w-cap*2,height,'Original centre material');
  image(face,frame(art,spec,2),w/2-cap/2,cap,height,'Original right carving');
  // Only themes with undecorated paper frames receive their own original symbols.
  if(spec.atlas&&spec.ornaments){
    const size=Math.min(h*.65,w*.085),position=w/2-size*.72-9;
    spec.ornaments.forEach((index,side)=>{
      const f=art.frame(spec.atlas!,index),ratio=Math.min(size/f.rect.width,size/f.rect.height);
      image(root,f,(side?1:-1)*position,f.rect.width*ratio,f.rect.height*ratio,'Original theme treasure');
    });
  }
  return root;
}
