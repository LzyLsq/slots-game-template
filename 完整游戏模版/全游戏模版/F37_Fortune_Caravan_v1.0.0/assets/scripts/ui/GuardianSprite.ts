import {_decorator,EventTouch,game,Game,Node,RenderData,Sprite,SpriteFrame,Tween,tween,UIOpacity,UITransform,Vec3,type IAssembler} from 'cc';
import type {GameId} from '../math/types';
import {AudioManager} from '../audio/AudioManager';
import {SalonArt,opacity} from './SalonArt';
import {GuardianRig,GUARDIAN_GRID_X as NX,GUARDIAN_GRID_Y as NY,type GuardianCue} from './GuardianMotion';
import {guardianGridIndices,appendGuardianIndices} from './GuardianIndices';
const {ccclass}=_decorator;
const JEWELS:readonly (readonly (readonly [number,number,number])[])[]=[
 [[0,.85,.47],[3,.58,.13],[0,.665,.555]],
 [[0,.22,.68],[3,.40,.18],[0,.35,.48]],
 [[0,.46,.14],[3,.65,.57],[0,.46,.91]],
 [[0,.66,.27],[3,.40,.39],[0,.32,.92]],
];
const INDICES=guardianGridIndices(NX,NY);
const mappedIndices=new WeakMap<RenderData,Uint16Array>();
// Cocos 3.8 Sprite assembler, preserving Sprite's stock alpha, world transform,
// batching and native RenderData path. The only difference is its skinned grid.
const ASSEMBLER:IAssembler={
 createData(comp){
  const rd=comp.requestRenderData();rd.dataLength=(NX+1)*(NY+1);rd.resize(rd.dataLength,INDICES.length);rd.chunk.setIndexBuffer(INDICES);mappedIndices.set(rd,new Uint16Array(INDICES.length));return rd;
 },
 updateUVs(comp){
  const sprite=comp as GuardianSprite,rd=sprite.renderData,frame=sprite.spriteFrame;if(!rd||!frame)return;
  const uv=frame.uv,vb=rd.chunk.vb,stride=rd.floatStride;let i=0;
  for(let row=0;row<=NY;row++)for(let col=0;col<=NX;col++){
   const u=col/NX,v=row/NY,o=i++*stride;
   vb[o+3]=(uv[4]*(1-u)+uv[6]*u)*(1-v)+(uv[0]*(1-u)+uv[2]*u)*v;
   vb[o+4]=(uv[5]*(1-u)+uv[7]*u)*(1-v)+(uv[1]*(1-u)+uv[3]*u)*v;
  }
 },
 updateColor(comp){
  const sprite=comp as Sprite,rd=sprite.renderData;if(!rd)return;
  const color=sprite.color,vb=rd.chunk.vb;
  for(let i=0;i<rd.dataLength;i++){const o=i*rd.floatStride+5;vb[o]=color.r/255;vb[o+1]=color.g/255;vb[o+2]=color.b/255;vb[o+3]=color.a/255;}
 },
 updateRenderData(comp){
  const sprite=comp as GuardianSprite,rd=sprite.renderData,frame=sprite.spriteFrame;if(!rd||!frame)return;
  if(rd.vertDirty){
   const points=sprite.points,ui=sprite.node.getComponent(UITransform)!;
   for(let i=0;i<rd.dataLength;i++){
    const u=points?points[i*2]:(i%(NX+1))/NX,v=points?points[i*2+1]:Math.floor(i/(NX+1))/NY;
    rd.data[i].x=(u-ui.anchorX)*ui.width;rd.data[i].y=(1-v-ui.anchorY)*ui.height;
   }
  }
  ASSEMBLER.updateUVs!(sprite);rd.updateRenderData(sprite,frame);
 },
 fillBuffers(comp){
  const sprite=comp as GuardianSprite,rd=sprite.renderData;if(!rd)return;
  const chunk=rd.chunk;
  {
   const m=sprite.node.worldMatrix,vb=chunk.vb;
   for(let i=0;i<rd.dataLength;i++){
    const p=rd.data[i],x=p.x,y=p.y,h=m.m03*x+m.m07*y+m.m15,r=h?1/h:1,o=i*rd.floatStride;
    vb[o]=(m.m00*x+m.m04*y+m.m12)*r;vb[o+1]=(m.m01*x+m.m05*y+m.m13)*r;vb[o+2]=(m.m02*x+m.m06*y+m.m14)*r;
   }
   rd.vertDirty=false;
  }
  appendGuardianIndices(rd.accessor,chunk,INDICES,mappedIndices.get(rd)!);
  chunk.meshBuffer.setDirty();
 },
};
@ccclass('GuardianSprite')
export class GuardianSprite extends Sprite {
 public onReact?:(cue:GuardianCue)=>void;
 private rig?:GuardianRig;private art?:SalonArt;private audio?:AudioManager;private glints:Node[]=[];private shown=true;
 private touchStart?:{x:number;y:number};private touchMoved=false;
 public get points():Float32Array|undefined{return this.rig?.vertices;}
 protected _flushAssembler():void{
  if(this._assembler!==ASSEMBLER){this.destroyRenderData();this._assembler=ASSEMBLER;}
  if(!this._renderData){
   const rd=this._renderData=ASSEMBLER.createData!(this) as RenderData;rd.material=this.getRenderMaterial(0);
   this.markForUpdateRenderData();if(this.spriteFrame)ASSEMBLER.updateUVs!(this);this._updateColor();
  }
 }
 public setup(art:SalonArt,id:GameId,frame:SpriteFrame,width:number,height:number,reduced:boolean,audio:AudioManager):void{
  this.art=art;this.audio=audio;this.rig=new GuardianRig(id,width,height,reduced);
  this.sizeMode=Sprite.SizeMode.CUSTOM;this.spriteFrame=frame;
  this.node.getComponent(UITransform)!.setContentSize(width,height);
  if(!reduced){
   for(const [i,x,y] of JEWELS[this.rig.theme]){
    const n=art.light(this.node,i,(x-.5)*width,(.5-y)*height,20,20,0);n.name='Guardian jewel reflection';this.glints.push(n);
   }
  }
  this.node.on(Node.EventType.TOUCH_START,this.onTouchStart,this);
  this.node.on(Node.EventType.TOUCH_MOVE,this.onTouchMove,this);
  this.node.on(Node.EventType.TOUCH_CANCEL,this.cancelTouch,this);
  this.node.on(Node.EventType.TOUCH_END,this.onTouchEnd,this);
  game.on(Game.EVENT_HIDE,this.hideMotion,this);game.on(Game.EVENT_SHOW,this.showMotion,this);
  this.markForUpdateRenderData();
 }
 public react(cue:GuardianCue):boolean{
  if(!this.rig?.trigger(cue))return false;
  this.onReact?.(cue);
  if(cue==='touch'){this.audio?.playGuardian(this.rig.theme);this.audio?.vibrate(12);}
  if(!this.rig.reduced&&cue!=='spin')this.jewelResponse(cue);
  return true;
 }
 protected update(dt:number):void{
  if(!this.rig||!this.shown||this.rig.reduced)return;
  this.rig.advance(dt);
  const alpha=this.node.getComponent(UIOpacity);if(alpha&&alpha.opacity===0)return;
  if(this.renderData)this.renderData.vertDirty=true;this.markForUpdateRenderData();
  // Slow tiny reflected jewels, not a flashing light over the character.
  for(let i=0;i<this.glints.length;i++){
   const n=this.glints[i],a=n.getComponent(UIOpacity)!,[,u,v]=JEWELS[this.rig.theme][i];
   // Follow the SAME skin vertices as the pearl/gold underneath the reflection.
   const col=u*NX,row=v*NY,x=Math.floor(col),y=Math.floor(row),fx=col-x,fy=row-y,p=this.rig.vertices;
   const ia=(y*(NX+1)+x)*2,ib=ia+2,ic=ia+(NX+1)*2,id=ic+2;
   const sx=(p[ia]*(1-fx)+p[ib]*fx)*(1-fy)+(p[ic]*(1-fx)+p[id]*fx)*fy;
   const sy=(p[ia+1]*(1-fx)+p[ib+1]*fx)*(1-fy)+(p[ic+1]*(1-fx)+p[id+1]*fx)*fy;
   n.setPosition((sx-.5)*this.rig.width,(.5-sy)*this.rig.height);

   if(Tween.getRunningCount(a)===0)a.opacity=Math.round(Math.pow(Math.max(0,Math.sin(this.rig.time*.9+i*1.9)),8)*65);
  }
 }
 private onTouchStart(e:EventTouch):void{const p=e.getUILocation();this.touchStart={x:p.x,y:p.y};this.touchMoved=false;}
 private onTouchMove(e:EventTouch):void{const p=e.getUILocation();if(this.touchStart&&Math.hypot(p.x-this.touchStart.x,p.y-this.touchStart.y)>20)this.touchMoved=true;}
 private cancelTouch():void{this.touchStart=undefined;this.touchMoved=true;}
 private onTouchEnd(e:EventTouch):void{if(this.touchStart&&!this.touchMoved){this.react('touch');e.propagationStopped=true;}this.touchStart=undefined;}
 private hideMotion():void{this.shown=false;this.cancelTouch();}
 private showMotion():void{this.shown=true;}
 private jewelResponse(cue:GuardianCue):void{
  const strength=cue==='super'?155:cue==='big'?135:cue==='touch'?100:85;
  this.glints.forEach((n,i)=>{
   const a=opacity(n,0);Tween.stopAllByTarget(a);
   tween(a).delay(i*.10).to(.22,{opacity:strength},{easing:'sineOut'}).to(.62,{opacity:0},{easing:'sineInOut'}).start();
  });
  // All highlights stay on the sculpture. No fake coin award on tapping it,
  // no particle spray into the reels or into readable cabinet registers.
  const ui=this.node.getComponent(UITransform)!,w=ui.width,h=ui.height;
  const sheen=this.art!.light(this.node,1,w*.13,h*.05,w*.24,h*.24,0);sheen.name='Guardian blessing reflection';
  const a=sheen.getComponent(UIOpacity)!;
  tween(a).to(.20,{opacity:cue==='touch'?40:55}).to(.7,{opacity:0}).call(()=>{if(sheen.isValid)sheen.destroy();}).start();
  tween(sheen).to(.9,{position:new Vec3(w*.10,h*.13,0)},{easing:'sineOut'}).start();
 }
 public onDestroy():void{
  game.off(Game.EVENT_HIDE,this.hideMotion,this);game.off(Game.EVENT_SHOW,this.showMotion,this);
  this.node.off(Node.EventType.TOUCH_START,this.onTouchStart,this);this.node.off(Node.EventType.TOUCH_MOVE,this.onTouchMove,this);
  this.node.off(Node.EventType.TOUCH_CANCEL,this.cancelTouch,this);this.node.off(Node.EventType.TOUCH_END,this.onTouchEnd,this);
  super.onDestroy();
 }
}
