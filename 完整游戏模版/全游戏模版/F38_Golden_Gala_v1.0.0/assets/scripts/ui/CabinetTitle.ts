import {_decorator,Component,Game,game,gfx,Mask,Node,Sprite,UIOpacity,UITransform} from 'cc';
import type {GameId} from '../math/types';
import {SalonArt,box,opacity} from './SalonArt';
import {emptyTitlePose,titleReliefPose,TITLE_STRIPS,TITLE_STRIP_WEIGHT} from './TitleRelief';
const {ccclass}=_decorator;
interface Strip{clip:Node;image:Node;alpha:UIOpacity;offset:number;weight:number;}
/** Existing title bitmap is also the sheen's alpha mask: no rectangular light
 * pasted over the cabinet. Fixed pool, continuous motion, background pause. */
@ccclass('CabinetTitle')
export class CabinetTitle extends Component{
 public quiet=false;
 private id:GameId='crown-club';private time=0;private shown=true;private reduced=false;
 private width=0;private homeY=0;private homeX=0;private strips:Strip[]=[];private jewel?:UIOpacity;
 private pose=emptyTitlePose();private reportTime=0;private debug=false;
 public setup(art:SalonArt,id:GameId,reduced:boolean):void{
  this.id=id;this.reduced=reduced;this.homeX=this.node.position.x;this.homeY=this.node.position.y;
  const size=this.node.getComponent(UITransform)!;this.width=size.width;
  game.on(Game.EVENT_HIDE,this.hide,this);game.on(Game.EVENT_SHOW,this.show,this);
  this.debug=typeof location!=='undefined'&&new URLSearchParams(location.search).get('debug')==='1';
  if(!reduced){
   const name=this.node.getComponent(Sprite)!.spriteFrame!;
   const width=this.width*.055;
   for(let i=0;i<TITLE_STRIPS;i++){
    const clip=box(this.node,'Alpha-matched title sheen '+i,0,0,width,size.height+2);
    clip.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
    const image=box(clip,'Original engraved title pixels',0,0,this.width,size.height);
    const sprite=image.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.spriteFrame=name;
    sprite.getMaterialInstance(0)?.overridePipelineStates({blendState:{targets:[{blend:true,blendSrc:gfx.BlendFactor.SRC_ALPHA,blendDst:gfx.BlendFactor.ONE,blendSrcAlpha:gfx.BlendFactor.ZERO,blendDstAlpha:gfx.BlendFactor.ONE}]}});
    this.strips.push({clip,image,alpha:opacity(image,0),offset:(i-2)*width,weight:TITLE_STRIP_WEIGHT[i]});
   }
   const jewel=art.light(this.node,3,0,size.height*.29,size.height*.18,size.height*.18,0);jewel.name='Anchored title crown reflection';this.jewel=opacity(jewel,0);
  }
 }
 private hide():void{this.shown=false;}
 private show():void{this.shown=true;}
 protected update(dt:number):void{
  if(!this.shown)return;
  const step=Number.isFinite(dt)?Math.min(.05,Math.max(0,dt)):0;this.time+=this.reduced?0:step;
  const p=titleReliefPose(this.id,this.time,this.width,this.reduced,this.quiet,this.pose);
  this.node.setScale(p.scale,p.scale,1);this.node.setPosition(this.homeX,this.homeY+p.y);
  for(const strip of this.strips){const x=p.sweep+strip.offset;strip.clip.setPosition(x,0);strip.image.setPosition(-x,0);strip.alpha.opacity=p.alpha*strip.weight;}
  if(this.jewel)this.jewel.opacity=p.jewel;
  this.reportTime+=step;
  if(this.debug&&this.reportTime>=.25){this.reportTime=0;this.publish();}
 }
 private publish():void{
  const canvas=document.querySelector('#GameCanvas');if(!canvas)return;
  const size=this.node.getComponent(UITransform)!;
  canvas.setAttribute('data-cabinet-title',JSON.stringify({id:this.id,owner:this.node.uuid,time:+this.time.toFixed(3),size:[+size.width.toFixed(3),+size.height.toFixed(3)],scale:+this.pose.scale.toFixed(4),lift:+this.pose.y.toFixed(3),sheenAlpha:+this.pose.alpha.toFixed(2),pool:this.strips.length,sourceAlpha:true,opaqueTitle:true,reduced:this.reduced,quiet:this.quiet}));
 }
 protected onDestroy():void{
  game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.show,this);this.strips.length=0;
  if(this.debug){const canvas=document.querySelector('#GameCanvas');if(canvas){try{if(JSON.parse(canvas.getAttribute('data-cabinet-title')??'{}').owner===this.node.uuid)canvas.removeAttribute('data-cabinet-title');}catch{}}}
 }
}
